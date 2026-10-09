// Tool 3.3, the register and what it shares: touch targets of the pills and of "Voir les N autres messages", the plan (a symbol on every pin, no overflow, a position
// set without the pointer), the list of checks (every line has a visible button), the search that opens the only result on Enter. Static render; a handler is called
// through the JSX runtime, wrapped to keep the props of the elements that have one (nothing is extracted from the screens).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Equipment, State } from '../../domain/types';
import type { Insight } from '../../domain/base';
import { demoState } from '../../domain/templates';
import { eqLevel, newEquipment } from '../../domain/maintenance';
import { maintTodos } from '../../domain/maintenanceAll';
import { newCheck } from '../../domain/maintenanceChecks';
import { Chips, Summary } from '../common';
import { ChecksView } from './EqChecksView';
import { EqPlan, PlaceBar } from './EqPlan';
import { eqName } from './EqCards';
import { Maintenance } from './Maintenance';

type Seen = { type: unknown; props: Record<string, unknown> };
const seen = vi.hoisted(() => ({ els: [] as { type: unknown; props: Record<string, unknown> }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: Record<string, unknown> | null, ...rest: unknown[]) => { if (props && Object.values(props).some(v => typeof v === 'function')) seen.els.push({ type, props }); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
const held = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: held.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

const now = new Date(2026, 8, 25, 10, 0), noop = () => {};
const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
const re = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // a name written as a pattern
const draw = (el: React.ReactElement) => { seen.els.length = 0; return renderToStaticMarkup(el); };
const find = (f: (x: Seen) => boolean): Seen => { const x = seen.els.find(f); if (!x) throw new Error('no such element'); return x; };
beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });   // the screens count their days from the clock
afterAll(() => { vi.useRealTimers(); });
beforeEach(() => { held.state = undefined; });

describe('3.3 the pills and "Voir les N autres messages" are 44 px under 640 px and on a touch screen', () => {
  it('gives every pill a 44 px height and a wider padding on a phone, as every button of the tool', () => {
    const html = renderToStaticMarkup(<Chips value={'a' as string} onChange={noop} items={[['a', 'Suivis', 8], ['b', 'Routine à faire', 4]]} />);
    expect(html.match(/max-sm:min-h-\[44px\] max-sm:px-3 \[@media\(pointer:coarse\)\]:min-h-\[44px\]/g)).toHaveLength(2);
  });
  it('gives "Voir les N autres messages" the same height, and writes the answer under the title when there is one', () => {
    const insights: Insight[] = ['a', 'b', 'c', 'd', 'e'].map(k => ({ key: k, tone: 'warn', title: `Titre ${k}`, text: 'Un fait.' }));
    const html = renderToStaticMarkup(<Summary title="La question ?" answer="2 routines à faire." insights={insights} max={3} list tiles={null} />);
    expect(html).toMatch(/Voir les 2 autres messages/);
    expect(html).toMatch(/class="[^"]*max-sm:min-h-\[44px\] \[@media\(pointer:coarse\)\]:min-h-\[44px\][^"]*"[^>]*>Voir les 2 autres messages/);
    expect(html).toMatch(/<h2[^>]*>La question \?<\/h2><p class="[^"]*">2 routines à faire\.<\/p>/);
    expect(renderToStaticMarkup(<Summary title="La question ?" insights={[]} tiles={null} />)).not.toContain('<p');   // no answer, no line
  });
});

describe('3.3 the plan', () => {
  const planState = (): State => {
    const s = demoState(now);
    s.params.sop = { ...(s.params.sop ?? {}), plan: 'data:image/png;base64,iVBORw0KGgo=' } as never;
    s.equipments.eq_ok = { ...newEquipment(), id: 'eq_ok', name: 'Poste en ordre', operator: 'Alice', manager: 'Marc', inspections: [{ date: '2026-09-22', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }] };   // the example has no equipment without a task
    Object.values(s.equipments).forEach((e, i) => { e.pin = { x: 0.1 + 0.08 * i, y: 0.3 }; });
    return s;
  };
  const plan = (s: State) => draw(<EqPlan state={s} todos={maintTodos(s, now)} onOpen={noop} />);
  const SYMBOL = { ok: 'lucide-check', warn: 'lucide-clock', alert: 'lucide-triangle-alert' } as const;

  it('puts a symbol on every pin, as well as its colour: a check, a clock, a triangle with "!"', () => {
    const s = planState(), todos = maintTodos(s, now), html = plan(s);
    const levels = new Set<string>();
    Object.values(s.equipments).filter(e => !e.retiredAt).forEach(e => {
      const lv = eqLevel(e, todos), btn = html.match(new RegExp(`<button[^>]*aria-label="${re(esc(`${eqName(e)} : ${lv.label}`))}"[^>]*>(.*?)</button>`));
      expect(btn, e.id).not.toBeNull();
      expect(btn![1], `${e.id} ${lv.level}`).toContain(SYMBOL[lv.level as keyof typeof SYMBOL]);
      levels.add(lv.level);
    });
    expect([...levels].sort()).toEqual(['alert', 'ok', 'warn']);   // the example has the three, so the three symbols are checked
    expect(html).toMatch(/Urgent : danger, arrêt ou contrôle obligatoire échu/);   // the legend says them
    for (const sym of Object.values(SYMBOL)) expect(html.split(sym).length - 1, sym).toBeGreaterThan(1);
  });
  it('leaves 44 px to touch a pin under 640 px and on a touch screen', () => {
    expect(plan(planState())).toMatch(/<button[^>]*class="absolute flex -translate-x-1\/2 -translate-y-1\/2 flex-col items-center p-2 max-sm:p-3 \[@media\(pointer:coarse\)\]:p-3"/);
  });
  it('does not overflow a phone: one column, a line that wraps, the state under the name', () => {
    const html = plan(planState());
    expect(html).toMatch(/<ul class="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3"/);
    expect(html).toMatch(/<li class="flex flex-wrap items-center gap-1">/);
    expect(html).toContain('class="min-w-0 text-slate-600 max-sm:basis-full max-sm:pl-6"');
    expect(html).toMatch(/<button[^>]*class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2/);
  });
  it('says "toucher", never "tap", with or without a plan', () => {
    const s = planState(), none = { ...s, params: { ...s.params, sop: undefined } } as State;
    expect(draw(<EqPlan state={none} todos={[]} onOpen={noop} />)).toContain('s&#x27;y placent d&#x27;un toucher');
    for (const html of [plan(s), draw(<EqPlan state={none} todos={[]} onOpen={noop} />)]) expect(html.replace(/<[^>]+>/g, ' ').match(/(?<!\p{L})tap(?!\p{L})/iu)).toBeNull();
  });
  it('sets the position of a pin without the pointer: two sliders (the arrows move them) and "Placer ici"', () => {
    const onAt = vi.fn(), onPlace = vi.fn();
    const html = draw(<PlaceBar name="Presse" at={{ x: 0.5, y: 0.25 }} onAt={onAt} onPlace={onPlace} />);
    expect(html).toContain('aria-label="Position de l&#x27;épingle : Presse"');
    expect(html.match(/type="range"/g)).toHaveLength(2);
    expect(html).toContain('value="50"');
    expect(html).toContain('value="25"');
    expect(html.match(/autofocus/g)).toHaveLength(1);   // the first slider takes the focus
    const [x, y] = seen.els.filter(e => e.type === 'input');
    (x.props.onChange as (e: unknown) => void)({ target: { value: '60' } });
    (y.props.onChange as (e: unknown) => void)({ target: { value: '90' } });
    expect(onAt.mock.calls).toEqual([[{ x: 0.6, y: 0.25 }], [{ x: 0.5, y: 0.9 }]]);
    expect(html).toContain('>Placer ici</button>');
    (find(e => e.type === 'button' && e.props.children === 'Placer ici').props.onClick as () => void)();
    expect(onPlace).toHaveBeenCalledTimes(1);
  });
});

describe('3.3 the list of checks: every line has a button you can see', () => {
  it('has "Fait aujourd\'hui" on a check done by the company and "Ouvrir" on one done by an outside body, the mandatory one overdue included', () => {
    const s = demoState(now), onOpen = vi.fn();
    held.state = s;
    const html = draw(<ChecksView state={s} onOpen={onOpen} />);
    const lines = html.match(/<li class="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">/g)!.length, done = html.match(/aria-label="Fait aujourd&#x27;hui : /g)?.length ?? 0, open = html.match(/aria-label="Ouvrir les contrôles : /g)?.length ?? 0;
    expect(lines).toBeGreaterThan(3);
    expect(open).toBeGreaterThan(0);
    expect(done + open).toBe(lines);   // not one line without a button
    expect(html).toMatch(/aria-label="Ouvrir les contrôles : [^"]*"[^>]*>Ouvrir<svg/);   // the word and the chevron
    const b = find(e => e.type === 'button' && String(e.props['aria-label']).startsWith('Ouvrir les contrôles : '));
    (b.props.onClick as () => void)();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][1]).toBe('checks');
  });
  it('shows the button on the overdue mandatory check done by an outside body (the most pressing line), under "Échus"', () => {
    const late = { ...newCheck('Vérification périodique', { value: 1, unit: 'an' }, true), id: 'tk1', by: 'provider' as const, lastDone: '2025-01-01' };
    const s: State = { ...demoState(now), equipments: { e1: { ...newEquipment(), id: 'e1', name: 'Presse', tasks: [late] } }, spares: {}, risks: {} };
    held.state = s;
    const html = draw(<ChecksView state={s} onOpen={noop} />);
    expect(html).toContain('Échus : 1');
    expect(html).toContain('aria-label="Ouvrir les contrôles : Vérification périodique, Presse"');
    expect(html).not.toContain('Fait aujourd&#x27;hui');   // an outside body keeps its report: no "done today" in one touch
    expect(html).toContain('Obligatoire');
  });
});

describe('3.3 the search opens the only result on Enter', () => {
  const eq = (id: string, name: string): Equipment => ({ ...newEquipment(), id, name, operator: 'Alice', manager: 'Marc', inspections: [{ date: '2026-09-22', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }] });
  const screen = (...es: Equipment[]) => { held.state = { ...demoState(now), equipments: Object.fromEntries(es.map(e => [e.id, e])), spares: {}, risks: {} }; draw(<Maintenance nav={nav} focus="" clearFocus={noop} />); return find(e => e.type === 'input' && e.props['aria-label'] === 'Chercher un équipement').props.onKeyDown as (e: unknown) => void; };
  it('takes the key (and keeps the form from being sent) when one equipment is listed', () => {
    const key = screen(eq('a', 'Presse'));
    const prevent = vi.fn();
    key({ key: 'Enter', preventDefault: prevent });
    expect(prevent).toHaveBeenCalledTimes(1);
  });
  it('does nothing with two equipment listed, or with another key', () => {
    const prevent = vi.fn();
    screen(eq('a', 'Presse'), eq('b', 'Four'))({ key: 'Enter', preventDefault: prevent });
    screen(eq('a', 'Presse'))({ key: 'a', preventDefault: prevent });
    expect(prevent).not.toHaveBeenCalled();
  });
});
