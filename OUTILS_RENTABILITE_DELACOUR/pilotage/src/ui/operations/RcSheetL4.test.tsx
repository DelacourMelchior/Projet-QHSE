// Lot 4 of tool 3.4, the sheet and the pad of signature (static render; the store is a stub; the scroll to a reservation, the focus, the sizes on screen are measured in the browser).
// E-4 a reservation named by a task is marked and its lift comes first in the card; E-8 / E-15 one header line, no figure drawn in the ring, a foot on one line; E-13 / A-3 the pad is a named
// element, 160 px high at least, with an erase button that exists only when there is something to erase; A-9 the result and the marks are pressed buttons, the gravity a radio group with arrows.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import type { Strokes } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { allReservesOf, newDelivery, shipChecksOf } from '../../domain/receptions';
import { SignaturePad } from '../SignaturePad';
import { RcReserves } from './RcReserves';
import { RcSheet } from './RcSheet';
import { RcTabReception } from './RcTabReception';
import { RcTabRelease } from './RcTabRelease';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false }) }));
// the dialogs are drawn in a portal of the page, which a static render has not: the sheet is rendered with its body in place
vi.mock('../common', async importOriginal => {
  const h = (await import('react')).createElement;
  return { ...(await importOriginal<typeof import('../common')>()), Modal: ({ title, subtitle, children, footer }: { title: unknown; subtitle?: unknown; children: unknown; footer?: unknown }) => h('section', null, h('h2', null, title as string), subtitle as string, children as string, footer as string) };
});

const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const pad: Strokes = [[[10, 20], [60, 70], [110, 30], [160, 80], [210, 40], [260, 70]]];
beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
const state = demoState(new Date(2026, 8, 25, 10, 0));
store.state = state;

describe('lot 4, the signature pad (A-3, E-13)', { timeout: 30000 }, () => {
  it('is a named element, at least 160 px high, with its hint', () => {
    const html = renderToStaticMarkup(<SignaturePad value={undefined} onChange={noop} label="Signature du client" />);
    expect(html).toContain(plain('role="img"'));
    expect(html).toContain(plain('aria-label="Signature du client"'));
    expect(html).toContain(plain('min-h-40'));
    expect(html).toMatch(/aria-describedby="[^"]+"/);
    expect(html).toContain(plain('Zone de signature : tracé à la main ou à la souris.'));
    expect(html).not.toMatch(/Signer avec/);
    expect(html).not.toContain(plain('Effacer'));
    const wide = renderToStaticMarkup(<SignaturePad value={undefined} onChange={noop} label="x" wide />);
    expect(wide).not.toContain(plain('max-w-[300px]'));
    expect(wide).toContain(plain('block text-sm font-semibold'));   // the field screens: label and hint at 14 px; the other tools keep their 11 px
    expect(wide).toMatch(/<span id="[^"]+" class="text-sm/);
    expect(html).toContain(plain('text-[11px]'));
    expect(html).toContain(plain('max-w-[300px]'));
  });
  it('erases with a 44 px button, which exists only when there is something to erase and the pad is not locked', () => {
    const drawn = renderToStaticMarkup(<SignaturePad value={pad} onChange={noop} label="Signature du client" />);
    expect(drawn).toMatch(/<button[^>]*aria-label="Effacer la signature"[^>]*max-sm:min-h-\[44px\][^>]*\[@media\(pointer:coarse\)\]:min-h-\[44px\][^>]*>Effacer<\/button>/);
    expect(drawn).not.toContain(plain('Zone de signature : tracé à la main ou à la souris.'));
    expect(renderToStaticMarkup(<SignaturePad value={[]} onChange={noop} label="x" />)).not.toContain(plain('Effacer'));
    const locked = renderToStaticMarkup(<SignaturePad value={pad} onChange={noop} label="x" locked />);
    expect(locked).not.toContain(plain('Effacer'));
    expect(locked).not.toContain(plain('aria-describedby'));
  });
});

describe('lot 4, the sheet opened on a reservation (E-4)', { timeout: 30000 }, () => {
  const d = state.deliveries.dl_demo_3, rv = allReservesOf(d)[0];
  it('marks the reservation of the task and puts its lift right under its facts', () => {
    const html = renderToStaticMarkup(<RcReserves d={d} act={noop} state={state} nav={nav} who="" focus={rv.id} />);
    expect(html).toContain(plain(`data-reserve="${rv.id}"`));
    expect(html).toContain(plain('ring-offset-2'));
    expect(html).toContain(plain('scroll-mt-14'));
    expect(html.indexOf('Lever la réserve')).toBeGreaterThan(0);
    expect(html.indexOf('Lever la réserve')).toBeLessThan(html.indexOf('Prise en charge par'));
    const other = renderToStaticMarkup(<RcReserves d={d} act={noop} state={state} nav={nav} who="" focus="rv_autre" />);
    expect(other).toContain(plain(`data-reserve="${rv.id}"`));
    expect(other).not.toContain(plain('ring-offset-2'));
  });
  it('is passed down from the tab Réception to the block of reservations', () => {
    const html = renderToStaticMarkup(<RcTabReception d={d} saved={d} set={noop} act={noop} state={state} nav={nav} close={noop} focusReserve={rv.id} />);
    expect(html).toContain(plain(`data-reserve="${rv.id}"`));
    expect(html).toContain(plain('ring-offset-2'));
  });
});

describe('lot 4, the header and the foot of the sheet (E-8, E-15)', { timeout: 30000 }, () => {
  const sheet = (id: string) => { const d = state.deliveries[id]; return renderToStaticMarkup(<RcSheet initial={d} onClose={noop} nav={nav} onPrint={noop} />); };
  it('tells the completeness as a ring and words, never as a figure drawn in the ring', () => {
    const html = sheet('dl_demo_3');
    expect(html).toMatch(/aria-label="Fiche complète à \d+ %"/);
    expect(html).toMatch(/\d+ %<span class="max-sm:hidden"> complète<\/span>/);
    expect(html).not.toContain(plain('<text'));
    expect(html).not.toContain(plain('fontSize="10"'));
  });
  it('lists as missing what the order lacks now and a reservation to lift, never the steps still to come', () => {
    const line = (html: string) => html.match(/Manque : <\/span>([^<]*)</)?.[1] ?? '';
    expect(line(sheet('dl_demo_3'))).toBe('1 réserve non levée.');
    ['Pas encore libérée', 'Aucun résultat de réception', 'PV non signé', 'à contrôler'].forEach(t => { expect(line(sheet('dl_demo_3')), t).not.toContain(plain(t)); expect(line(sheet('dl_demo_5')), t).not.toContain(plain(t)); });
    expect(line(renderToStaticMarkup(<RcSheet initial={newDelivery(state.params)} onClose={noop} nav={nav} />))).toBe('Pas encore de client · Pas encore de livrable · Pas de date de livraison promise.');
  });
  it('keeps the foot on one line: the other moves are behind one button', () => {
    const html = sheet('dl_demo_3');
    const foot = html.slice(html.indexOf('aria-label="Autres actions de la commande"'));
    expect(foot).toContain(plain('aria-label="Autres actions de la commande"'));
    expect(foot).not.toContain(plain('Imprimer la fiche suiveuse'));   // behind the button (the tab Commande keeps its own button)
    expect(foot).not.toContain(plain('Archiver'));
    expect(foot).toContain(plain('Enregistré automatiquement'));
  });
  it('keeps the lock note and the seal on the sheet of a signed PV, the note read aloud only on a phone', () => {
    const html = sheet('dl_demo_3');
    expect(html).toContain(plain('Scellé intact'));
    expect(html).toMatch(/<p class="max-sm:sr-only">PV signé : le contenu est verrouillé/);
  });
});

describe('lot 4, the groups of buttons (A-9)', { timeout: 30000 }, () => {
  it('reads the result and the marks of the checks before departure as pressed buttons, not radios that write when an arrow is used', () => {
    const d = state.deliveries.dl_demo_5, p = { d, saved: d, set: noop, act: noop, state, nav, close: noop };
    const half = { ...d, shipChecks: shipChecksOf(d, state.params).map((c, i) => (i === 0 ? { ...c, ok: true } : c)) };   // one check answered: the marks are drawn
    const rec = renderToStaticMarkup(<RcTabReception {...p} />), rel = renderToStaticMarkup(<RcTabRelease {...p} d={half} />);
    expect(rec).toMatch(/role="group" aria-label="Résultat de la réception"/);
    expect(rec).toMatch(/aria-pressed="false"[^>]*>Sans réserve/);
    expect(rel).toMatch(/role="group" aria-label="Contrôle de départ : /);
    expect(rel).toMatch(/aria-pressed="false"[^>]*>Fait/);
    expect(rec.slice(rec.indexOf('aria-label="Résultat de la réception"')).split('</div>')[0]).not.toContain(plain('role="radio"'));
    expect(rel.slice(rel.indexOf('role="group"')).split('</div>')[0]).not.toContain(plain('role="radio"'));
  });
  it('keeps the gravity of a new reservation a radio group with one tab stop', () => {
    const d = state.deliveries.dl_demo_5, html = renderToStaticMarkup(<RcReserves d={d} act={noop} state={state} nav={nav} who="Paul" />);
    expect(html).toMatch(/role="radiogroup" aria-label="Gravité de la réserve"/);
    expect([...html.matchAll(/role="radio"[^>]*tabindex="(-?\d)"/g)].map(m => m[1])).toEqual(['0', '-1']);
  });
});
