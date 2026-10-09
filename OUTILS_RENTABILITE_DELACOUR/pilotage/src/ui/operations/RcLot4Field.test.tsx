// Lot 4, the field screens (RcMilestone, RcReception): the answers of a milestone live in the fixed bar at the bottom (previous / next become a thin row above them),
// what a validation did is said and the focus goes to the title, the person who checks stays at the top, PhotoBox (shared) is enlarged from a wrapper.
// Static render: the portal is stood in for, the store is a stub (no jsdom here): the effects (focus, scroll into view, folding of the bar while a field is typed in,
// the photos folded behind "Ajouter une photo" in a short window) are checked in the browser, not by this file.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import type { Delivery, State } from '../../domain/types';

const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

const nav = { tool() {}, openAction() {}, newAction() {}, openRisk() {}, settings() {} } as never;
const text = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const footer = (html: string) => html.match(/<div[^>]*data-bar[^>]*>[\s\S]*/)?.[0] ?? '';   // the bar at the bottom of the full screen (a div: the dialog holds no second landmark)
const frame = async (p: { answers?: boolean } = {}) => {
  const { Frame } = await import('./RcMilestone');
  const Go = { run() {} };
  return text(renderToStaticMarkup(
    <Frame label="Essai" title="CMD-1" said="Jalon 2 sur 4 : Contrôle" notice="" answers={p.answers ? <div><button type="button">Conforme</button><button type="button">Non conforme</button></div> : undefined}
      back={{ label: 'Précédent', ...Go }} next={{ label: 'Passer', ...Go }} onClose={() => {}}><p>Contenu</p></Frame>,
  ));
};

describe('lot 4, the field screens', { timeout: 30000 }, () => {
  let s: State, d: Delivery;
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} });
    vi.stubGlobal('window', { sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
    s = demoState(new Date(2026, 8, 25, 10, 0));
    d = s.deliveries.dl_demo_1;
    h.state = s;
  });

  it('E-2: with answers, the bar holds the two answers and one thin row (44 px) of previous / next above them; without, previous / next are the big buttons (64 px)', async () => {
    const f = footer(await frame({ answers: true }));
    expect(f.indexOf('Précédent')).toBeGreaterThan(-1);
    expect(f.indexOf('Conforme')).toBeGreaterThan(f.indexOf('Précédent'));   // the answers are in the bar, with the thin row
    expect(f).toContain(plain('Non conforme'));
    expect(f).toContain(plain('Passer'));
    expect(f).not.toContain(plain('min-h-[64px]'));   // the answers bring their own 64 px, previous / next are the thin row
    expect(f.match(/min-h-\[44px\]/g)).toHaveLength(2);
    const big = footer(await frame());
    expect(big.match(/min-h-\[64px\]/g)).toHaveLength(2);
    expect(big).not.toContain(plain('Conforme'));
  });
  it('E-3: the bar folds only under 300 px of height and only while a field is typed in; the header and the bar go to one row only in a wide and short window', async () => {
    const html = await frame({ answers: true });
    expect(html).toContain(plain('[@media(max-height:300px)]:group-has-[[data-body]_input:focus]:hidden'));
    expect(html).toContain(plain('[@media(max-height:300px)]:group-has-[[data-body]_textarea:focus]:hidden'));
    expect(footer(html)).toContain(plain('[@media(max-height:500px)_and_(min-width:600px)]:flex-nowrap'));   // never four buttons squeezed in a narrow window
  });
  it('A-2: the live region says what was done (when something was), and the order is never left to the body', async () => {
    const { Frame } = await import('./RcMilestone');
    const html = (notice: string) => text(renderToStaticMarkup(<Frame label="Essai" title="CMD-1" said="Étape 5 sur 6 : Signatures" notice={notice} onClose={() => {}}><p>x</p></Frame>));
    expect(html('')).toContain(plain('aria-live="polite">Étape 5 sur 6 : Signatures</p>'));
    expect(html('Signature du client enregistrée, PV-2026-014')).toContain(plain('aria-live="polite">Signature du client enregistrée, PV-2026-014</p>'));
  });
  it('A-2: a validation is said in the words of the PV, once the order holds it', async () => {
    const { validationNotice } = await import('./RcReception');
    const re = d.reception;
    expect(validationNotice(d, '')).toBe('');
    expect(re.pvNo).toBeTruthy();
    expect(validationNotice(d, 'client')).toMatch(new RegExp(`^Signature du client enregistrée, ${re.pvNo}, PV signé le `));
    expect(validationNotice(d, 'company')).toContain(plain("Signature de l'entreprise enregistrée"));
    const bare = { ...d, signClient: undefined, reception: { ...re, noSign: undefined } } as Delivery;
    expect(validationNotice(bare, 'client')).toBe('');   // nothing is claimed that the order does not hold
    expect(validationNotice(bare, 'mention')).toBe('');
    expect(validationNotice({ ...d, pvPhoto: 'ph1' }, 'photo')).toBe(`Photo du PV papier enregistrée, ${re.pvNo}`);
  });
  it('E-18: the person who checks is a button of 44 px with the name and "changer", shown above the milestones and not on the first screen', async () => {
    const { WhoBtn } = await import('./RcMilestone');
    const html = text(renderToStaticMarkup(<WhoBtn label="Contrôle" who="Marc M." onClick={() => {}} />));
    expect(html).toContain(plain('aria-label="Contrôle : Marc M., changer"'));
    expect(html).toContain(plain('Marc M.'));
    expect(html).toContain(plain('max-sm:min-h-[44px]'));
    expect(html).toContain(plain('[@media(pointer:coarse)]:min-h-[44px]'));
    const { RcMilestone } = await import('./RcMilestone');
    const first = text(renderToStaticMarkup(<RcMilestone id="dl_demo_5" onClose={() => {}} nav={nav} />));   // step 0: "Qui contrôle ?", nobody picked
    expect(first).not.toContain(plain(', changer"'));
    expect(first).toMatch(/data-bar[\s\S]*Commencer/);
    expect(footer(first)).not.toContain(plain('Conforme'));   // the answers belong to a milestone, not to the first screen
  });
  it('E-14: the two photo buttons are enlarged from a wrapper (16 px, 64 px when the box is tall, 44 px otherwise) and the shared PhotoBox is not touched', async () => {
    const { Snap } = await import('./RcMilestone');
    const wrap = (tall: boolean) => text(renderToStaticMarkup(<Snap tall={tall}><i /></Snap>));
    expect(wrap(true)).toContain(plain('border-dashed>button]:min-h-[64px]'));
    expect(wrap(true)).toContain(plain('border-dashed>button]:text-base'));
    expect(wrap(false)).toContain(plain('border-dashed>button]:min-h-[44px]'));
    expect(wrap(false)).not.toContain(plain('min-h-[64px]'));
    expect(wrap(false)).toContain(plain('aria-label^=Retirer]]:min-w-[44px]'));
  });
});
