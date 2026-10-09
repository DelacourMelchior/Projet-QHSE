// Figures of tool 3.3 proposed to the dashboard 1.1 and the tasks that tool gives to everyone.
import { describe, expect, it } from 'vitest';
import type { Equipment, Spare, State } from './types';
import { activeIn, addMaintKpis, isMaintKpi, MAINT_KPIS, maintFeeds } from './maintenanceFeeds';
import { maintFocus, maintSummary, maintTodos } from './maintenanceAll';
import { downtime, newEquipment, recordInspection, reinstateEquipment, restartEquipment, retireEquipment, stopEquipment } from './maintenance';
import { isoDate } from './periods';
import { newSpare } from './maintenanceSpares';
import { allTasks } from './tasks';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [{ id: 'P3', name: 'P3', color: '#000', order: 3, kpiIds: [] }], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const eq = (over: Partial<Equipment> = {}): Equipment => ({ ...newEquipment(), id: 'eq1', name: 'CNC', ...over });
const insp = (e: Equipment, date: string) => recordInspection(e, { date, by: 'J', note: '', results: e.checkpoints.map(() => 'ok' as const) });

describe('indicators proposed to the dashboard', () => {
  it('adds the five indicators once, never twice', () => {
    const d = st();
    expect(addMaintKpis(d)).toBe(MAINT_KPIS.length);
    expect(addMaintKpis(d)).toBe(0);
    expect(Object.values(d.kpis).every(isMaintKpi)).toBe(true);
    expect(d.processes[0].kpiIds).toHaveLength(MAINT_KPIS.length);
  });
  it('computes nothing for a company without equipment and cabinet', () => {
    expect(maintFeeds(st(), '2026-09', now)).toEqual([]);
  });
  it('sums the hours of stop of the month and gives the cabinet and checks as they stand today', () => {
    const e = eq({ breakdowns: [{ id: 'b1', date: '2026-09-03', hours: 6, cost: 100, cause: 'x' }, { id: 'b2', date: '2026-08-03', hours: 9, cost: null, cause: 'y' }] });
    const low: Spare = { ...newSpare(['eq1']), id: 'sp1', name: 'Courroie', min: 2, stock: 1 }, okSp: Spare = { ...newSpare(['eq1']), id: 'sp2', name: 'Joint', min: 1, stock: 3 };
    const s = st({ equipments: { eq1: e }, spares: { sp1: low, sp2: okSp } });
    const by = Object.fromEntries(maintFeeds(s, '2026-09', now).map(f => [f.role, f.value]));
    expect(by.maint_down).toBe(6);
    expect(by.maint_spares).toBe(50);
    expect(maintFeeds(s, '2026-08', now).find(f => f.role === 'maint_down')?.value).toBe(9);
    expect(maintFeeds(s, '2026-08', now).some(f => f.role === 'maint_spares')).toBe(false);   // today's figures only for the current month
  });
  it('gives the routine rate of a month from the weeks that were due: the routines of 14/09 and 21/09 make one week due and made (the week in progress is left out)', () => {
    const e = ['2026-09-21', '2026-09-14'].reduce((x, d) => insp(x, d), eq());
    expect(maintFeeds(st({ equipments: { eq1: e } }), '2026-09', now).find(f => f.role === 'maint_routine')?.value).toBe(100);
  });
});

// ---- 3.4: what the dashboard is offered is the state of the month, not of today
// Mondays of the weeks, back = 0 is the week of 21/09 (in progress on 25/09)
const monday = (back: number) => isoDate(new Date(2026, 8, 21 - 7 * back));
const weeks = (backs: number[]) => backs.map(b => ({ date: monday(b), by: 'J', note: '', results: ['ok' as const, 'ok' as const, 'ok' as const, 'ok' as const, 'ok' as const] }));
const range = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
const val = (s: State, p: string, role: string) => maintFeeds(s, p, now).find(f => f.role === role)?.value;
describe('indicators proposed for a month', () => {
  // A and B follow every week since 06/07 (B missed the week of 10/08), C is new (first routine 14/09), D was stopped from 09/09 to 21/09 (and missed 17/08),
  // E was retired on 10/09 after a stop of 4 h in the month
  const A = eq({ id: 'A', inspections: weeks(range(1, 11)), breakdowns: [{ id: 'bA', date: '2026-08-31', startedAt: '2026-08-31T20:00', endedAt: '2026-09-02T08:00', hours: 36, cost: null, cause: '' }] });
  const B = eq({ id: 'B', inspections: weeks([...range(1, 6), ...range(8, 11)]), breakdowns: [{ id: 'bB', date: '2026-08-12', hours: 3, cost: null, cause: '' }] });
  const C = stopEquipment(eq({ id: 'C', inspections: weeks([1]) }), 'A', '2026-09-25T04:00');
  const D0 = eq({ id: 'D', inspections: weeks([...range(3, 4), ...range(6, 11)]) });
  const D = restartEquipment(stopEquipment(D0, 'A', '2026-09-09T08:00'), '2026-09-21T08:00');
  const E = eq({ id: 'E', inspections: weeks(range(3, 11)), retiredAt: '2026-09-10', breakdowns: [{ id: 'bE', date: '2026-09-02', hours: 4, cost: null, cause: '' }] });
  const five = (over: Partial<Equipment> = {}) => st({ equipments: { A, B, C, D, E: { ...E, ...over } } });
  it('averages the rates of the equipment followed at the end of the month: a new one counts from its first routine, a stop is left out, a retired one is gone', () => {
    // A 100 (11 weeks of 11), B 91 (10 of 11), C 100 (1 of 1), D 89 (8 of 9: the weeks of the stop are left out)
    expect(val(five(), '2026-09', 'maint_routine')).toBe(95);
  });
  it('does not rewrite a past month when an equipment is retired after it: 08/2026 is the same with E in service or retired on 10/09', () => {
    // at the end of August: A 100 (8 of 8), B 88 (7 of 8), D 88 (7 of 8), E 100, and C did not exist yet
    expect(val(five(), '2026-08', 'maint_routine')).toBe(94);
    expect(val(five({ retiredAt: undefined }), '2026-08', 'maint_routine')).toBe(94);
    expect(val(five({ retiredAt: '2026-07-20' }), '2026-08', 'maint_routine')).toBe(92);   // retired before the end of the month: not followed any more
  });
  it('counts the hours of stop of the month, the retired equipment included, and the stop in progress up to now (or up to the end of the month for a past one)', () => {
    expect(val(five(), '2026-09', 'maint_down')).toBe(330);   // D 288 h + E 4 h + C 6 h so far + the 32 h of the stop of A that began on 31/08 and ended on 02/09
    expect(val(five(), '2026-08', 'maint_down')).toBe(7);   // B 3 h + the 4 h of the stop of A that fall in August (its other 32 h are September's)
    expect(val(five({ breakdowns: [] }), '2026-09', 'maint_down')).toBe(326);
  });
  it('proposes nothing for a month to come, nor for one before the first record of the tool', () => {
    expect(maintFeeds(five(), '2026-10', now)).toEqual([]);
    expect(maintFeeds(five(), '2027-06', now)).toEqual([]);
    expect(maintFeeds(five(), '2026-06', now)).toEqual([]);   // the first routine is of 06/07
    expect(maintFeeds(five(), '2026-07', now).map(f => f.role)).toEqual(['maint_routine', 'maint_down']);
  });
  it('proposes the stops of the current month and nothing for the routine when nothing was due', () => {
    const only = st({ equipments: { C: eq({ id: 'C', inspections: weeks([0]), stoppedSince: '2026-09-25T04:00', breakdowns: [{ id: 'b', date: '2026-09-25', startedAt: '2026-09-25T04:00', hours: null, cost: null, cause: '' }] }) } });
    expect(maintFeeds(only, '2026-09', now).filter(f => ['maint_routine', 'maint_down'].includes(f.role)).map(f => [f.role, f.value])).toEqual([['maint_down', 6]]);
  });
  it('tells in its words what it counts', () => {
    expect(maintFeeds(five(), '2026-09', now).find(f => f.role === 'maint_down')!.how).toMatch(/équipements retirés compris/);
    expect(maintFeeds(five(), '2026-09', now).find(f => f.role === 'maint_routine')!.how).toMatch(/sans les périodes d'arrêt/);
  });
  it('knows which equipment was followed in a month: not the ones retired before its end', () => {
    expect([activeIn(E, '2026-08'), activeIn(E, '2026-09'), activeIn(E, '2026-10'), activeIn({ ...E, retiredAt: '2026-09-30' }, '2026-09'), activeIn({ ...E, retiredAt: '2026-10-01' }, '2026-09'), activeIn({ ...E, retiredAt: undefined }, '2026-12')])
      .toEqual([true, false, false, false, true, true]);
  });
});

describe('tasks of tool 3.3', () => {
  it('shows up in "Mes tâches" with what each one opens', () => {
    const s = st({ equipments: { eq1: eq({ operator: 'Julien P.' }) }, spares: { sp1: { ...newSpare(['eq1']), id: 'sp1', name: 'Courroie', min: 2, stock: 0 } } });
    const todos = maintTodos(s, now);
    expect(todos.length).toBeGreaterThan(0);
    expect(allTasks(s, now).filter(t => t.tool === '3.3')).toHaveLength(todos.length);
    expect(maintFocus(todos.find(t => t.kind === 'routine')!)).toBe('station:eq1');
    expect(maintFocus(todos.find(t => t.spareId)!)).toBe('spare:sp1');
    expect(maintSummary(s, now).sparesOut).toBe(1);
  });
});

// ---- lot 0 ter, N-03: the hours of a stop are shared between the months it covers
describe('hours of stop of a month, by overlap (N-03)', () => {
  const oct = new Date(2026, 9, 6, 10, 0);   // Tuesday 06/10/2026
  const weeksOf = (dates: string[]) => dates.map(date => ({ date, by: 'J', note: '', results: ['ok' as const, 'ok' as const, 'ok' as const, 'ok' as const, 'ok' as const] }));
  const down = (s: State, p: string, at = oct) => maintFeeds(s, p, at).find(f => f.role === 'maint_down')?.value;
  const withStops = (...bs: NonNullable<Equipment['breakdowns']>) => st({ equipments: { eq1: eq({ breakdowns: bs }) } });
  const bk = (id: string, startedAt: string, endedAt: string | undefined, hours: number | null = null) => ({ id, date: startedAt.slice(0, 10), hours, cost: null, cause: '', startedAt, ...(endedAt ? { endedAt } : {}) });
  it('counts 50 hours in September and 32 in October for a stop of 82 hours across the end of the month, and still 82 in the last 12 months', () => {
    const s = withStops(bk('b', '2026-09-28T22:00', '2026-10-02T08:00', 82));
    expect([down(s, '2026-09'), down(s, '2026-10')]).toEqual([50, 32]);
    expect(downtime(s.equipments.eq1, oct).hours).toBe(82);   // the fact "Pannes sur 12 mois" keeps counting a stop by its start
    // the hours are computed from the two times when none were written
    const bare = withStops(bk('b', '2026-09-28T22:00', '2026-10-02T08:00'));
    expect([down(bare, '2026-09'), down(bare, '2026-10')]).toEqual([50, 32]);
    // the same stop seen from a later day: the month of September does not change
    expect(down(s, '2026-09', new Date(2026, 10, 20, 10, 0))).toBe(50);
  });
  it('counts a stop still going in each month it covers, up to now in the current one', () => {
    const s = withStops(bk('b', '2026-09-20T08:00', undefined));
    expect([down(s, '2026-09'), down(s, '2026-10')]).toEqual([256, 130]);   // 20/09 08:00 to 01/10: 256 h; 01/10 to 06/10 10:00: 130 h
    const long = withStops(bk('b', '2026-08-25T08:00', undefined));
    expect([down(long, '2026-08'), down(long, '2026-09'), down(long, '2026-10')]).toEqual([160, 720, 130]);
    // the hours written on a stop that is still going are not its hours (they are computed up to now)
    const typed = withStops(bk('b', '2026-09-20T08:00', undefined, 5));
    expect([down(typed, '2026-09'), down(typed, '2026-10')]).toEqual([256, 130]);
    // the stop is the stop of its day, not of the day after: before it began, nothing
    expect(down(withStops(bk('b', '2026-10-02T08:00', undefined)), '2026-09')).toBeUndefined();   // no record yet in September: nothing proposed
    expect(down(withStops(bk('b', '2026-09-01T08:00', '2026-09-01T09:00'), bk('c', '2026-10-02T08:00', undefined)), '2026-09')).toBe(1);
  });
  it('never counts the hours that are after now, even for a stop written as ended later (a clock that was ahead)', () => {
    const s = withStops(bk('b', '2026-10-05T08:00', '2026-10-07T08:00'));
    expect(down(s, '2026-10')).toBe(26);   // 05/10 08:00 to 06/10 10:00, not the 48 hours of the two times
  });
  it('takes the hours written as the total of the stop: each month has what the stop lasted in it, the later ones what is left', () => {
    // 82 hours between the two times, 41 written: all of them fall in September, the stop having begun there
    const s = withStops(bk('b', '2026-09-28T22:00', '2026-10-02T08:00', 41));
    expect([down(s, '2026-09'), down(s, '2026-10')]).toEqual([41, 0]);
    // hours that are not the ones of the two times (106 h between them, 82 written): the months still add up to the 82, September having had 50 of them
    const odd = withStops(bk('b', '2026-09-28T22:00', '2026-10-03T08:00', 82));
    expect([down(odd, '2026-09'), down(odd, '2026-10')]).toEqual([50, 32]);
    // 100 written for the 82 hours of the two times: the hours that are after the two times are nowhere
    const more = withStops(bk('b', '2026-09-28T22:00', '2026-10-02T08:00', 100));
    expect([down(more, '2026-09'), down(more, '2026-10')]).toEqual([50, 32]);
    // a stop of three months with hours written: the first month, then the next ones
    const long = withStops(bk('b', '2026-07-30T12:00', '2026-10-02T00:00', 1000));
    expect([down(long, '2026-07'), down(long, '2026-08'), down(long, '2026-09'), down(long, '2026-10')]).toEqual([36, 744, 220, 0]);
  });
  it('counts a breakdown with no start in the month of its date, with the hours written, and one of no time at all in its month', () => {
    const noStart = withStops({ id: 'b', date: '2026-09-28', hours: 6, cost: null, cause: '' });
    expect([down(noStart, '2026-09'), down(noStart, '2026-10')]).toEqual([6, 0]);
    const point = withStops(bk('b', '2026-09-10T08:00', '2026-09-10T08:00', 2));
    expect([down(point, '2026-09'), down(point, '2026-10')]).toEqual([2, 0]);
  });
  it('gives, over the months, the hours of every stop: 82 + 386 + the one of another equipment', () => {
    const s = st({ equipments: { eq1: eq({ breakdowns: [bk('b', '2026-09-28T22:00', '2026-10-02T08:00', 82), bk('c', '2026-08-25T08:00', '2026-09-03T08:00', null)] }), eq2: eq({ id: 'eq2', retiredAt: '2026-10-01', breakdowns: [bk('d', '2026-09-30T23:00', '2026-10-01T05:00', 6)] }) } });
    // c: 25/08 08:00 to 03/09 08:00 is 216 h: 160 in August, 56 in September; d (retired equipment, counted): 1 h in September, 5 in October
    expect([down(s, '2026-08'), down(s, '2026-09'), down(s, '2026-10')]).toEqual([160, 50 + 56 + 1, 32 + 5]);
  });
  it('does not take for the first day of the tool a date that is a list holding a date', () => {
    const e = eq({ inspections: weeksOf(['2026-09-14']), anomalies: [{ id: 'a', label: 'x', date: ['2025-01-01'] as never, note: '', closedAt: '' }], breakdowns: [{ id: 'b', date: ['2025-02-01'] as never, hours: 3, cost: null, cause: '' }] });
    const s = st({ equipments: { eq1: e } });
    expect(() => maintFeeds(s, '2026-09', oct)).not.toThrow();
    expect(maintFeeds(s, '2026-08', oct)).toEqual([]);   // the first record of the tool is of September 2026
    expect(maintFeeds(s, '2025-01', oct)).toEqual([]);
  });
  it('tells in its words that a stop is shared between the months', () => {
    expect(maintFeeds(withStops(bk('b', '2026-09-28T22:00', '2026-10-02T08:00', 82)), '2026-10', oct).find(f => f.role === 'maint_down')!.how).toMatch(/à cheval sur deux mois compte dans chacun sa part/);
  });
});

// ---- lot 0 ter, N-05: the months a retirement lasted are not followed once the equipment is put back
describe('months of a pause (N-05)', () => {
  const oct = new Date(2026, 9, 6, 10, 0);
  const routines = Array.from({ length: 13 }, (_, i) => ({ id: `r${i}`, date: isoDate(new Date(2026, 2, 2 + 7 * i)), by: 'J', note: '', results: ['ok' as const, 'ok' as const, 'ok' as const, 'ok' as const, 'ok' as const] }));   // every Monday from 02/03 to 25/05
  const retired = eq({ id: 'x', inspections: routines, retiredAt: '2026-06-01', retiredNote: 'n' }), back = reinstateEquipment(retired, '2026-09-28T09:00');
  const roles = (e: Equipment, p: string) => maintFeeds(st({ equipments: { x: e } }), p, oct).map(f => f.role);
  it('knows the months of a pause: half of the month or more, to the hour', () => {
    const paused = (from: string, to: string, p: string) => activeIn({ ...eq(), pauses: [{ from, to }] }, p);
    expect([activeIn(back, '2026-05'), activeIn(back, '2026-06'), activeIn(back, '2026-07'), activeIn(back, '2026-08'), activeIn(back, '2026-09'), activeIn(back, '2026-10')]).toEqual([true, false, false, false, false, true]);
    expect([paused('2026-09-16', '2026-09-30', '2026-09'), paused('2026-09-17', '2026-09-30', '2026-09'), paused('2026-08-16', '2026-08-31', '2026-08'), paused('2026-08-17', '2026-08-31', '2026-08')]).toEqual([false, true, false, true]);   // 15 days of 30: half; 14: not
    expect(paused('2026-09-16T00:00', '2026-10-01T00:00', '2026-09')).toBe(false);   // exactly 360 hours of 720
    expect(paused('2026-09-16T00:01', '2026-10-01T00:00', '2026-09')).toBe(true);
    expect(paused('2026-09-16T00:00', '2026-09-30T23:59', '2026-09')).toBe(true);
    expect(activeIn({ ...retired, pauses: [{ from: '2026-01-01', to: '2026-02-01T00:00' }] }, '2026-05')).toBe(true);
  });
  it('proposes no routine rate for the months of the pause and the one of the months before, as before', () => {
    expect(roles(back, '2026-07')).toEqual(['maint_down']);
    expect(roles(back, '2026-09')).toEqual(['maint_down']);
    expect(roles(back, '2026-05')).toEqual(['maint_routine', 'maint_down']);
    expect(maintFeeds(st({ equipments: { x: back } }), '2026-05', oct)).toEqual(maintFeeds(st({ equipments: { x: retired } }), '2026-05', oct));   // the months before the retirement are not rewritten
    expect(roles(retired, '2026-07')).toEqual(['maint_down']);
  });
  it('gives the current month the routine of the weeks that were due: 11 of 12, the week of the return having been missed', () => {
    expect(maintFeeds(st({ equipments: { x: back } }), '2026-10', oct).find(f => f.role === 'maint_routine')!.value).toBe(92);
    const never = { ...back, pauses: undefined };
    expect(maintFeeds(st({ equipments: { x: never } }), '2026-10', oct).find(f => f.role === 'maint_routine')!.value).toBe(0);
  });
  it('closes a retirement at the day of the retirement, and the return keeps its two dates', () => {
    const r = retireEquipment(eq({ id: 'x', inspections: routines }), '2026-06-01', 'n');
    expect(reinstateEquipment(r, '2026-09-28T09:00').pauses).toEqual([{ from: '2026-06-01', to: '2026-09-28T09:00' }]);
  });
});

// ---- lot 0 ter, N-14: the figures of a big state are computed in well under a second
describe('cost of the figures of a big state (N-14)', () => {
  const at = new Date(2026, 9, 6, 10, 0);
  const big = (n: number, every: 'day' | 'week' | 'month') => {
    const step = every === 'day' ? 1 : every === 'week' ? 7 : 30;
    const make = (i: number): Equipment => ({
      ...newEquipment(), id: `e${i}`, name: `Equipement ${i}`, routine: { every }, operator: 'A', manager: 'M',
      inspections: Array.from({ length: 400 }, (_, k) => ({ id: `i${i}_${k}`, date: isoDate(new Date(2026, 9, 6 - k * step)), by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] as const })).map(x => ({ ...x, results: [...x.results] })),
    });
    return st({ equipments: Object.fromEntries(Array.from({ length: n }, (_, i) => [`e${i}`, make(i)])) });
  };
  it('computes the figures of 100 equipment with 400 routines each, every rhythm, in under 2 seconds each (daily: about 6 seconds before)', () => {
    for (const every of ['day', 'week', 'month'] as const) {
      const s = big(100, every);
      const t0 = performance.now();
      const feeds = maintFeeds(s, '2026-10', at), summary = maintSummary(s, at);
      expect(performance.now() - t0).toBeLessThan(2000);
      expect(feeds.find(f => f.role === 'maint_routine')!.value).toBe(100);
      expect([summary.routineDone, summary.routineTotal]).toEqual([100, 100]);
    }
  });
});
