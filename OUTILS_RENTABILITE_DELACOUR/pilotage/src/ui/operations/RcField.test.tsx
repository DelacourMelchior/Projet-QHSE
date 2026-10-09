// The two full screens of tool 3.4 (RcMilestone, RcReception): the failure of the browser to keep the data is said INSIDE them (the alert of the page behind is hidden), the signature
// cannot be validated while the browser refuses to write, what is typed or drawn and not sent is kept in the tab over a reload and said on the first screen.
// Static render: the portal is stood in for, the store is a stub (no jsdom here: the guard before unload and the closing questions are checked in the browser, not by this file).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import type { State } from '../../domain/types';
import { plain } from './testPlain';

const h = vi.hoisted(() => ({ full: false, state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', storageFull: h.full }) }));

const nav = { tool() {}, openAction() {}, newAction() {}, openRisk() {}, settings() {} } as never;
const draft = (v: unknown) => vi.stubGlobal('window', { sessionStorage: { getItem: () => JSON.stringify(v), setItem() {}, removeItem() {} } });

describe('the full screens of the field', { timeout: 30000 }, () => {
  beforeAll(() => {
    vi.stubGlobal('document', { body: {} });
    const s: State = demoState(new Date(2026, 8, 25, 10, 0));
    s.deliveries.dl_demo_9 = { ...s.deliveries.dl_demo_9, reception: { ...s.deliveries.dl_demo_9.reception, result: 'sans', name: 'Mme Perrin' } };   // result chosen, PV not signed: the screen opens on the signatures
    h.state = s;
  });
  afterEach(() => { h.full = false; vi.stubGlobal('window', undefined); });
  const text = (html: string) => plain(html.replace(/&#x27;/g, "'"));
  const rec = async (id = 'dl_demo_9') => { const { RcReception } = await import('./RcReception'); return text(renderToStaticMarkup(<RcReception id={id} onClose={() => {}} nav={nav} />)); };
  const mil = async () => { const { RcMilestone } = await import('./RcMilestone'); return text(renderToStaticMarkup(<RcMilestone id="dl_demo_5" onClose={() => {}} nav={nav} />)); };

  it('S-2: says the failure at the top of the milestone screen and of the reception screen, and only then', async () => {
    for (const html of [await mil(), await rec()]) expect(html).not.toContain(plain('role="alert"'));
    h.full = true;
    for (const html of [await mil(), await rec()]) expect(html).toMatch(/role="alert"[^>]*>(?:<svg.*?<\/svg>)?Non enregistré : l'espace du navigateur est plein ou refusé/);
  });
  it('S-2: the validation of a signature is closed, with the fact, while the browser refuses to write', async () => {
    const ok = await rec(), full = (h.full = true, await rec());
    expect(ok).not.toContain(plain('Validation fermée'));
    expect(full).toContain(plain("Validation fermée : l'espace du navigateur est plein, la signature ne serait pas conservée."));
    expect(full.match(/<button[^>]*disabled=""[^>]*><svg[^>]*><path[^>]*><\/path><\/svg>Valider la signature/g) ?? []).toHaveLength(2);
  });
  it('S-7: a reserve and a signature kept in the tab are said on the first screen of the reception, and a damaged draft is ignored', async () => {
    const s = h.state as State, keep = s.deliveries.dl_demo_9.reception.result;
    s.deliveries.dl_demo_9.reception.result = '';   // opens on step 1
    draft({ rv: { text: 'Éclat sur la porte', where: '', photo: '', severity: 'minor' }, sig: [[[1, 2], [3, 4]]] });
    expect(await rec()).toContain(plain('Pas encore enregistré : réserve écrite (étape 3), signature du client dessinée (étape 4).'));
    draft('not an object');
    expect(await rec()).not.toContain(plain('Pas encore enregistré'));
    vi.stubGlobal('window', { sessionStorage: { getItem() { throw new Error('storage refused'); } } });
    expect(await rec()).not.toContain(plain('Pas encore enregistré'));
    s.deliveries.dl_demo_9.reception.result = keep;
  });
  it('S-7: a milestone value typed and not sent over a reload is said on the first screen of the checks', async () => {
    draft({ draft: { [(h.state as State).deliveries.dl_demo_5.milestones[2].id!]: { note: 'Rayure à gauche' } } });
    expect(await mil()).toContain(plain('Pas encore envoyé : valeur ou remarque du jalon 3.'));
  });
  it('the draft of a signed PV is ignored', async () => {
    draft({ rv: { text: 'Éclat', where: '', photo: '', severity: 'minor' } });
    expect(await rec('dl_demo_1')).not.toContain(plain('Pas encore enregistré'));
  });
});
