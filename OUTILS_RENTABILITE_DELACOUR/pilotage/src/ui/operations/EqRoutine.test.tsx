// The full-screen routine on a phone (3.3): the three answers stay in view whatever the text above them, "Équipement à l'arrêt" needs a second touch, the
// foot is lighter (no greyed "Précédent" at the start, nothing but "Fermer" once the routine is noted), the end screen says when the next routine comes, the
// button to start again is a second choice when the routine of the period is made, the window takes the focus. Static render; a touch is made on the handler
// that the render drew (the JSX runtime is wrapped to keep the elements that have an onClick) and `useState` keeps its values from one render to the next, so that
// a second render shows what the touch did (no browser here: nothing is measured, see the report for what is measured on a phone).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Equipment, State } from '../../domain/types';
import { blankState } from '../../domain/templates';
import { newEquipment, recordInspection } from '../../domain/maintenance';
import { EqRoutine, nextRoutineDay } from './EqRoutine';

const seen = vi.hoisted(() => ({ els: [] as { children: unknown; onClick(e?: unknown): void }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onClick?: unknown; children?: unknown } | null, ...rest: unknown[]) => { if (typeof props?.onClick === 'function') seen.els.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
// the first five `useState` of a render are the ones of the routine itself (who, step, done, report, arm): they live from one render to the next
const hook = vi.hoisted(() => ({ n: 0, cells: [] as unknown[] }));
vi.mock('react', async orig => {
  const m = await orig<typeof import('react')>();
  return { ...m, useState: (init: unknown) => {
    const i = hook.n++;
    if (i >= 5) return (m.useState as (x: unknown) => unknown)(init);
    if (!(i in hook.cells)) hook.cells[i] = typeof init === 'function' ? (init as () => unknown)() : init;
    return [hook.cells[i], (v: unknown) => { hook.cells[i] = typeof v === 'function' ? (v as (x: unknown) => unknown)(hook.cells[i]) : v; }];
  } };
});
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
const store = vi.hoisted(() => ({ state: null as unknown, author: 'Test' }));
vi.mock('../../store/StoreContext', () => ({
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: store.author, storageFull: false, storageNear: false, storageChars: 0 }),
}));
const focus = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), useDialogFocus: (ref: unknown) => { focus.calls.push(ref); } }));

const now = new Date(2026, 8, 25, 10, 0);   // a Friday: the week of the routine runs from Monday 21 to Sunday 27 September
const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const POINTS = [{ id: 'pt1', label: 'Fuite', criterion: 'Aucune goutte' }, { id: 'pt2', label: 'Pression', criterion: '', min: 5, max: 8, unit: 'bar' }];
const text = (n: unknown): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : n && typeof n === 'object' && 'props' in n ? text((n as { props: { children?: unknown } }).props.children) : '');

// the state holds one machine; `over` changes it (an open anomaly, a routine already made, no holder)
function setup(over: Partial<Equipment> = {}, author = 'Test') {
  const s = blankState('industrie', now) as State;
  const e: Equipment = { ...newEquipment('machine'), id: 'eq_t', name: 'Presse', operator: 'David K.', checkpoints: POINTS, ...over };
  s.equipments = { [e.id]: e };
  store.state = s; store.author = author; hook.cells = [];
  return { s, e };
}
const draw = (e: Equipment) => { seen.els.length = 0; hook.n = 0; return renderToStaticMarkup(<EqRoutine eq={e} nav={nav} onClose={noop} />); };
const tap = (label: string) => { const b = seen.els.find(x => text(x.children).startsWith(label)); if (!b) throw new Error(`no button "${label}" among ${seen.els.map(x => text(x.children)).filter(Boolean).join(' | ')}`); b.onClick({ stopPropagation() {} }); };
const part = (html: string, tag: string) => html.slice(html.indexOf(`<${tag}`), html.indexOf(`</${tag}>`));
const equipment = (s: State) => s.equipments.eq_t;

beforeAll(() => { vi.stubGlobal('document', { body: {}, visibilityState: 'visible', getElementById: () => null }); vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, setTimeout: () => 1, clearTimeout: () => {}, matchMedia: () => ({ matches: false }) }); });
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); focus.calls.length = 0; });

describe('3.3 the full-screen routine on a phone', () => {
  it('keeps the three answers in a band stuck at the bottom of the scrolling area, for a point with an open anomaly and for one with a range of values', () => {
    const { e } = setup({ anomalies: [{ id: 'an1', label: 'Fuite', date: '2026-09-10', note: '', closedAt: '', pointId: 'pt1' }] });
    const stuck = (html: string) => {
      expect(part(html, 'main')).toMatch(/role="radiogroup"[^>]*aria-label="Résultat : [^"]*"[^>]*class="[^"]*sticky bottom-0/);
      expect(part(html, 'footer')).not.toContain('role="radio"');   // the foot only holds the navigation and the two alerts
    };
    draw(e); tap('Commencer');
    const first = draw(equipment(store.state as State));
    expect(first).toContain('Anomalie ouverte depuis le');
    stuck(first);
    tap('OK');
    const second = draw(equipment(store.state as State));
    expect(second).toContain('Plage attendue');
    stuck(second);
  });

  it('draws no greyed "Précédent" at the start, draws it from the first point', () => {
    const { e } = setup();
    expect(part(draw(e), 'footer')).not.toContain('Précédent');
    tap('Commencer');
    expect(part(draw(equipment(store.state as State)), 'footer')).toContain('Précédent');
  });

  it('asks for a second touch before writing a stop, and says so in a live region', () => {
    const { e } = setup();
    draw(e);
    tap("Équipement à l'arrêt");
    expect(equipment(store.state as State).stoppedSince).toBeFalsy();   // the first touch writes nothing
    const html = draw(equipment(store.state as State));
    expect(html).toMatch(/<button[^>]*aria-live="polite"[^>]*bg-red-700 text-white[^>]*>.*Confirmer l&#x27;arrêt/);
    expect(html).toMatch(/class="mt-3 [^"]*border-t[^"]*pt-3/);   // a clear gap between the navigation and the alerts
    tap("Confirmer l'arrêt");
    expect(equipment(store.state as State).stoppedSince).toBeTruthy();   // the second touch writes it
  });

  it('says when the next routine comes, in full, and keeps only "Fermer" in the foot once the routine is noted', () => {
    const { e } = setup();
    draw(e); tap('Commencer');
    draw(equipment(store.state as State)); tap('OK');                  // point 1, which moves to point 2
    draw(equipment(store.state as State)); tap('OK');                  // point 2 has a range: stays
    draw(equipment(store.state as State)); tap('Terminer');
    draw(equipment(store.state as State)); tap('Rien à signaler');
    const html = draw(equipment(store.state as State)), foot = part(html, 'footer');
    expect(html).toContain('Routine notée');
    expect(html).toContain('La prochaine routine commence le lundi 28 septembre 2026.');
    expect(foot).toContain('Fermer');
    for (const gone of ['Précédent', 'Signaler un problème', "Équipement à l&#x27;arrêt"]) expect(foot).not.toContain(gone);
  });

  it('turns "Commencer" into a second choice, "Refaire une routine", when the routine of the period is made', () => {
    const base = setup().e;
    const { e } = setup({ inspections: recordInspection(base, { date: '2026-09-24', by: 'David K.', note: '', results: ['ok', 'ok'], values: [null, 7] }, now).inspections });
    const html = draw(e);
    expect(html).toContain('Routine faite');                           // the state stays said above
    const button = html.slice(html.lastIndexOf('<button', html.indexOf('Refaire une routine')), html.indexOf('Refaire une routine'));
    expect(button).not.toContain('bg-emerald-700');
    expect(button).toContain('border-slate-400');
    expect(draw(setup().e)).toContain('Commencer');                    // a routine to make: the green main action
    expect(part(draw(setup().e), 'footer')).toMatch(/bg-emerald-700[^>]*>Commencer/);
  });

  it('says why "Commencer" is closed when nobody is chosen', () => {
    const { e } = setup({ operator: '', manager: '' }, 'anonyme');
    expect(draw(e)).toContain('Aucune personne choisie pour faire la routine : « Commencer » reste fermé.');
    expect(draw(setup().e)).not.toContain('Aucune personne choisie');
  });

  it('takes the focus and makes the page behind inert (useDialogFocus on the window)', () => {
    draw(setup().e);
    expect(focus.calls.length).toBe(1);
    expect(focus.calls[0]).toHaveProperty('current');
  });
});

describe('3.3 a danger is never closed by an answer', () => {
  const run = () => {
    draw(equipment(store.state as State)); tap('Commencer');
    draw(equipment(store.state as State)); tap('OK');          // point 1
    draw(equipment(store.state as State)); tap('OK');          // point 2 (range)
    draw(equipment(store.state as State)); tap('Terminer');
  };
  it('keeps a danger open on a point answered OK, and says so in a red line on the final screen; a simple anomaly is closed as before', () => {
    setup({ anomalies: [{ id: 'd1', label: 'Fuite', date: '2026-09-10', note: '', closedAt: '', pointId: 'pt1', severity: 'danger' }] });
    run();
    expect(draw(equipment(store.state as State))).toContain('Rien à signaler');
    tap('Rien à signaler');
    expect(equipment(store.state as State).anomalies![0].closedAt).toBe('');
    const html = draw(equipment(store.state as State));
    expect(html).toMatch(/role="alert"[^>]*text-red-900[^>]*>1 danger reste ouvert jusqu&#x27;à la vérification du responsable : Fuite\./);
    expect(html).not.toContain('anomalie fermée');
    const two = setup({ anomalies: [{ id: 'a1', label: 'Fuite', date: '2026-09-10', note: '', closedAt: '', pointId: 'pt1', severity: 'degraded' }] });
    draw(two.e); run(); draw(equipment(store.state as State)); tap('Rien à signaler');
    expect(equipment(store.state as State).anomalies![0].closedAt).not.toBe('');
    expect(draw(equipment(store.state as State))).not.toContain('reste ouvert');
  });
  it('says on the point that a danger is not closed by OK', () => {
    const { e } = setup({ anomalies: [{ id: 'd1', label: 'Fuite', date: '2026-09-10', note: '', closedAt: '', pointId: 'pt1', severity: 'danger' }] });
    draw(e); tap('Commencer');
    expect(draw(equipment(store.state as State))).toContain('Un point OK ne le ferme pas');
  });
});

describe('3.3 the end of the routine, without doubles', () => {
  it('folds the recap when all is OK ("2 sur 2 OK, rien à signaler" + "Voir le détail"), keeps one counter of steps and puts "Annuler la routine" on the final screen instead of a toast', () => {
    const { e } = setup();
    draw(e); tap('Commencer');
    const one = draw(equipment(store.state as State));
    expect((one.match(/Étape 1 sur 2/g) ?? []).length).toBe(2);   // the header and the live region for screen readers, no row of dots
    expect(part(one, 'footer')).not.toContain('h-2.5 rounded-full');
    tap('OK'); draw(equipment(store.state as State)); tap('OK'); draw(equipment(store.state as State)); tap('Terminer');
    const recap = draw(equipment(store.state as State));
    expect(recap).toContain('2 sur 2 OK, rien à signaler');
    expect(recap).toContain('Voir le détail');
    tap('Rien à signaler');
    const html = draw(equipment(store.state as State));
    expect(html).toContain('Annuler la routine');
    expect(html).not.toContain('<span class="min-w-0 truncate">Routine notée');   // no toast for it
    expect(equipment(store.state as State).inspections.length).toBe(1);
  });
});

describe('3.3 the day of the next routine', () => {
  it('is the day after the period in progress (week, month) or the next working day (daily)', () => {
    const { s, e } = setup();
    expect(nextRoutineDay(e, now, s.params)).toBe('2026-09-28');
    expect(nextRoutineDay({ ...e, routine: { every: 'month', day: 1 } }, now, s.params)).toBe('2026-10-01');
    expect(nextRoutineDay({ ...e, routine: { every: 'day', day: 1 } }, now, s.params)).toBe('2026-09-28');   // Friday: Saturday and Sunday are not working days
  });
});
