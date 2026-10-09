// "Signaler un problème" (3.3): the gravity comes first, a grey button says why in a visible sentence, a danger does not go out without a name, the
// confirmation of a danger or a stop says who is responsible and offers to call, what follows is folded, the bar "Annuler" is drawn in the window, the window
// takes the focus. Static render; a touch is made on the handler the render drew, `useState` keeps its values from one render to the next (see EqRoutine.test.tsx).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Contact, Equipment, State } from '../../domain/types';
import { blankState } from '../../domain/templates';
import { newEquipment } from '../../domain/maintenance';
import { BIG, ReportDialog } from './EqReport';

const seen = vi.hoisted(() => ({ els: [] as { children: unknown; onClick(e?: unknown): void }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onClick?: unknown; children?: unknown } | null, ...rest: unknown[]) => { if (typeof props?.onClick === 'function') seen.els.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
// the first eight `useState` of a render are the ones of the window itself (draft, photo, nature, gravity, word, resumed, who, sent): they live from one render to the next
const hook = vi.hoisted(() => ({ n: 0, cells: [] as unknown[] }));
vi.mock('react', async orig => {
  const m = await orig<typeof import('react')>();
  return { ...m, useState: (init: unknown) => {
    const i = hook.n++;
    if (i >= 8) return (m.useState as (x: unknown) => unknown)(init);
    if (!(i in hook.cells)) hook.cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [hook.cells[i], (v: unknown) => { hook.cells[i] = typeof v === 'function' ? (v as (x: unknown) => unknown)(hook.cells[i]) : v; }];
  } };
});
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
const store = vi.hoisted(() => ({ state: null as unknown, author: 'Test', saved: null as string | null }));
vi.mock('../../store/StoreContext', () => ({
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: store.author, storageFull: false, storageNear: false, storageChars: 0 }),
}));
const focus = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), useDialogFocus: (ref: unknown) => { focus.calls.push(ref); } }));

const now = new Date(2026, 8, 25, 10, 0);
const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const text = (n: unknown): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' && 'props' in n ? text((n as { props: { children?: unknown } }).props.children) : '');
const dec = (h: string) => h.replace(/&#x27;/g, "'");
const boss = (phone: string): Contact => ({ id: 'c1', category: 'interne', name: 'David K.', role: 'Chef', company: '', phone, email: '', always: false, verifiedAt: '' });

// a machine held by David K.; `report` is the report begun in this window (kept in the browser under the id of the machine, and taken back when the window opens)
function setup(report: { severity?: string; note?: string } | null, author = 'Test', phone = '06 12 34 56 78') {
  const s = blankState('industrie', now) as State;
  const e: Equipment = { ...newEquipment('machine'), id: 'eq_t', name: 'Presse', operator: 'David K.' };
  s.equipments = { [e.id]: e };
  s.contacts = phone ? { c1: boss(phone) } : {};
  store.state = s; store.author = author; store.saved = report ? JSON.stringify(report) : null; hook.cells = [];
  return e;
}
const draw = (e: Equipment) => { seen.els.length = 0; hook.n = 0; return dec(renderToStaticMarkup(<ReportDialog eq={e} nav={nav} onClose={noop} />)); };
const tap = (label: string) => { const b = seen.els.find(x => text(x.children).startsWith(label)); if (!b) throw new Error(`no button "${label}" among ${seen.els.map(x => text(x.children)).filter(Boolean).join(' | ')}`); b.onClick({ stopPropagation() {} }); };
const buttonOf = (html: string, label: string) => html.slice(html.lastIndexOf('<button', html.indexOf(`>${label}</button>`)), html.indexOf(`>${label}</button>`));

beforeAll(() => {
  vi.stubGlobal('document', { body: {}, visibilityState: 'visible', activeElement: null });
  vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, setTimeout: () => 1, clearTimeout: () => {}, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('localStorage', { getItem: () => store.saved, setItem: () => {}, removeItem: () => {} });
});
beforeEach(() => { focus.calls.length = 0; });

describe('3.3 the window "Signaler un problème"', () => {
  it('asks the gravity first, then the nature, then the photo', () => {
    const html = draw(setup(null));
    const g = html.indexOf('aria-label="Gravité"'), n = html.indexOf("De quoi s'agit-il ?"), p = html.indexOf('Photo du problème');
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(n);
    expect(n).toBeLessThan(p);
  });

  it('draws a disabled button as a readable grey slab and says why under it, as a fact', () => {
    expect(BIG).toContain('disabled:bg-slate-200');
    expect(BIG).toContain('disabled:text-slate-600');
    expect(BIG).not.toContain('opacity-30');
    const html = draw(setup(null));
    expect(buttonOf(html, 'Signaler')).toMatch(/disabled=""[^>]*aria-describedby="[^"]+"|aria-describedby="[^"]+"[^>]*disabled=""/);
    expect(html).toContain("La gravité n'est pas encore choisie.");
    expect(html).not.toContain('Choisir la gravité');   // no order given to the person
    expect(draw(setup({ severity: 'degraded' }))).toContain('Une photo, une nature ou un mot suffit.');
  });

  it('does not send a danger without a name; a stop or a "tourne mal" does not need one', () => {
    const danger = draw(setup({ severity: 'danger', note: "Fuite d'huile" }, 'anonyme'));
    expect(danger).toContain('Qui signale ? (obligatoire pour un danger)');
    expect(danger).toContain('Un danger ne part pas sans nom : « Qui signale ? » est vide.');
    expect(buttonOf(danger, 'Signaler')).toContain('disabled=""');
    expect(buttonOf(draw(setup({ severity: 'danger', note: "Fuite d'huile" }, 'Test')), 'Signaler')).not.toContain('disabled=""');   // a name: it goes
    expect(buttonOf(draw(setup({ severity: 'stopped', note: 'Arrêtée' }, 'anonyme')), 'Signaler')).not.toContain('disabled=""');
  });

  it('says who is responsible after a danger, with a call button, and folds what follows in "Suite à donner"', () => {
    draw(setup({ severity: 'danger', note: "Fuite d'huile" })); tap('Signaler');
    const html = draw((store.state as State).equipments.eq_t);
    expect(html).toContain('Responsable : David K., 06 12 34 56 78.');
    expect(html).toMatch(/<a href="tel:0612345678"[^>]*>.*Appeler David<\/a>/);
    expect(buttonOf(html, 'Appeler David')).toBe('');   // a link, not a button
    const details = html.slice(html.indexOf('<details'), html.indexOf('</details>'));
    expect(details).toContain('Suite à donner');
    expect(details).toContain('Ouvrir une action');
    expect(details).toContain('Ouvrir un défaut du bac rouge');
    expect(html.slice(0, html.indexOf('<details'))).not.toContain('Ouvrir une action');   // not beside the main buttons any more
    expect(html).toContain('pb-24');   // room kept under "Fermer" for the bar "Annuler"
  });

  it('says the responsible person without a number when the directory has none, and nothing after a simple report', () => {
    draw(setup({ severity: 'stopped', note: 'Arrêtée' }, 'Test', '')); tap('Signaler');
    const html = draw((store.state as State).equipments.eq_t);
    expect(html).toContain('Responsable : David K.<');   // the full stop of the initial is the only one
    expect(html).not.toContain('href="tel:');
    draw(setup({ severity: 'degraded', note: 'Bruit' })); tap('Signaler');
    expect(draw((store.state as State).equipments.eq_t)).not.toContain('Responsable :');
  });

  it('draws the bar "Annuler" inside the window, after "Fermer", never on a layer of its own', () => {
    draw(setup({ severity: 'degraded', note: 'Bruit' })); tap('Signaler');
    const html = draw((store.state as State).equipments.eq_t);
    expect(html.indexOf('Annuler')).toBeGreaterThan(html.indexOf('>Fermer</button>'));
    expect(html.indexOf('Annuler')).toBeLessThan(html.lastIndexOf('</div></div>'));   // the two closing tags are those of the window and of its backdrop: the bar is before them
    expect(html).toMatch(/role="dialog"[^>]*tabindex="-1"[^>]*class="relative /);
  });

  it('takes the focus and makes the page behind inert (useDialogFocus on the window)', () => {
    draw(setup(null));
    expect(focus.calls.length).toBe(1);
    expect(focus.calls[0]).toHaveProperty('current');
  });
});
