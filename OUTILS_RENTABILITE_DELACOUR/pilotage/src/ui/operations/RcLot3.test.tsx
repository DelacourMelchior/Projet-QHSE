// Lot 3 of tool 3.4, the copy handed to the customer (static render, no jsdom: the store is a stub, the portal is stood in for): at the last step of the reception on the spot, two big
// buttons (64 px) print the PV and make its PDF. The wait of the print (message, limit of 20 seconds, frame "Photo non reçue") lives in effects: it is checked in the browser, not here.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import type { State } from '../../domain/types';

const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

const nav = { tool() {}, openAction() {}, newAction() {}, openRisk() {}, settings() {} } as never;
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

describe('lot 3, the copy handed to the customer (P-5)', { timeout: 30000 }, () => {
  let s: State;
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} });
    vi.stubGlobal('window', { sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } });
    s = demoState(new Date(2026, 8, 25, 10, 0));
    h.state = s;
  });

  it('the last step of a signed PV has "Imprimer le PV" and "PV en PDF", 64 px high, above the PV; the other steps have neither', async () => {
    const { RcReception } = await import('./RcReception');
    const done = renderToStaticMarkup(<RcReception id="dl_demo_1" onClose={() => {}} nav={nav} />);
    expect(text(done)).toContain(plain('PV terminé'));
    const btn = (label: string) => done.split('<button').find(c => text(`<button${c.split('</button>')[0]}`).trim() === label && c.includes('</button>'));   // the markup of one button
    for (const label of ['Imprimer le PV', 'PV en PDF']) {
      const m = btn(label);
      expect(m, label).toBeDefined();
      expect(m!.match(/class="([^"]*)"/)![1], label).toContain(plain('min-h-[64px]'));
      expect(done.indexOf(`>${label}<`), label).toBeLessThan(done.indexOf('Procès-verbal de réception'));   // before the PV itself
    }
    const first = renderToStaticMarkup(<RcReception id="dl_demo_5" onClose={() => {}} nav={nav} />);   // an order that is not received yet: step 1
    expect(first).not.toContain(plain('PV en PDF'));
    expect(first).not.toContain(plain('>Imprimer le PV<'));
  });
  it('P-4: the menu of an order offers "Imprimer le PV à signer" as soon as it is released or delivered, even with no result; "Imprimer le PV" once signed; nothing before', async () => {
    const { pvPrintLabel } = await import('./RcPv');
    const label = (id: string) => pvPrintLabel(s.deliveries[id]);
    const all = Object.values(s.deliveries);
    expect(all).toHaveLength(14);
    all.forEach(d => {
      const signed = !!(d.signClient?.some(x => x.length > 1) || d.pvPhoto || d.reception.noSign);
      if (d.reception.result || d.releasedAt || d.reception.date) expect(label(d.id), d.ref).toBe(signed ? 'Imprimer le PV' : 'Imprimer le PV à signer');
      else expect(label(d.id), d.ref).toBe('');
    });
    expect(label('dl_demo_13')).toBe('Imprimer le PV à signer');          // CMD-2026-045: delivered, "PV à signer", no result yet
    expect(label('dl_demo_1')).toBe('Imprimer le PV');
    const free = Object.values(s.deliveries).filter(d => !d.releasedAt && !d.reception.date && !d.reception.result);
    expect(free.length).toBeGreaterThan(0);                               // orders still being checked: no PV to print
    expect(free.every(d => pvPrintLabel(d) === '')).toBe(true);
  });
});
