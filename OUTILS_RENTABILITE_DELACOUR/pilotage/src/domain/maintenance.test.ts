// Tool 3.3, routine and equipment: kinds and models, periods of the routine, anomalies, stops and breakdowns, life and retirement, links, to-do list and facts.
import { describe, expect, it } from 'vitest';
import type { Action, Anomaly, Breakdown, Checkpoint, Equipment, Inspection, MaintTodo, Person, PointResult, State } from './types';
import {
  ANOMALY_STATUS, ROUTINE_ON_STOP, TASK_RANK, dateOf, txt, breakdownHours, byUrgency, eqTasks, reportRefusal, taskOwner, DEFAULT_CAUSES, DEFAULT_CHECKPOINTS, DEFAULT_NATURES, EQ_KINDS, EQ_TEMPLATES, INSPECTION_STATE, LIFE_KEYS, RHYTHMS, SEVERITY_LABEL, WATCH_NOTE,
  addGone, anomalyStatus, canDelete, citedBy, clearDraft, compactInspections, completeness, GONE_KEPT, inspectionKey, removeAnomaly, removeBreakdown, removeInspection, staleDraft, downtime, duplicateEquipment, eqLevel, eqStatus, equipmentFromTemplate, helpersOf, inspectionState, isBottleneck,
  kindLabel, kindOf, lastInspection, lostByDeleting, maintCfg, ncsOfEquipment, newEquipment, openAnomalies, openBreakdown, patchAnomaly, periodOf, planBExceeded,
  recs, recordInspection, reinstateEquipment, reopenAnomaly, repairAnomaly, repeatedCauses, repeatedPoints, reportAnomaly, resultOf, retireEquipment, restartEquipment,
  routineFacts, routineOf, routineOwner, routineRate, routineTodos, saveDraft, sopLine, stopEquipment, strip, takeLife, urgency, verifyAnomaly, watchPoints,
} from './maintenance';
import { emptyTools } from './base';
import { maintTodos } from './maintenanceAll';
import { newCheck, nextDue, checkState } from './maintenanceChecks';
import { isoDate } from './periods';
import { DEFAULT_SCALE, newRisk } from './risk';
import { newNc } from './quality';
import { newSop, norm } from './instructions';

const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const P = st().params;
const pts = (n = 3): Checkpoint[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, label: `Point ${i + 1}`, criterion: '' }));
const eq = (over: Partial<Equipment> = {}): Equipment => ({
  id: 'e1', name: 'Presse plieuse', location: '', operator: 'Alice', manager: 'Marc', riskId: '', kind: 'machine', checkpoints: pts(3), inspections: [], parts: [], ...over,
});
const insp = (date: string, results: PointResult[], over: Partial<Inspection> = {}): Inspection => ({ date, by: 'Alice', note: '', results, ...over });
const an = (over: Partial<Anomaly> = {}): Anomaly => ({ id: 'a1', label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const bd = (over: Partial<Breakdown> = {}): Breakdown => ({ id: 'b1', date: '2026-07-10', hours: 2, cost: null, cause: '', ...over });
const todo = (over: Partial<MaintTodo> = {}): MaintTodo => ({ id: 'x', kind: 'routine', text: '', tone: 'warn', who: '', due: '', eqId: 'e1', ...over });
const person = (id: string, name: string, absences?: { from: string; to: string }[]): Person => ({ id, name, role: '', active: true, absences });
const withEq = (...es: Equipment[]) => es.reduce<Record<string, Equipment>>((m, e) => ({ ...m, [e.id]: e }), {});
const risk = (over: Partial<ReturnType<typeof newRisk>> = {}) => ({ ...newRisk('P3', now), id: 'r1', title: 'Casse broche', maxOutage: { value: 4, unit: 'h' as const }, ...over });
const ok3: PointResult[] = ['ok', 'ok', 'ok'];

describe('3.3 kinds, neutral lists and settings', () => {
  it('offers the kinds and the rhythms, "Autre" last, and reads older equipment as a machine', () => {
    expect(EQ_KINDS.map(k => k.key)).toEqual(['machine', 'vehicle', 'installation', 'it', 'instrument', 'other']);
    expect(EQ_KINDS.at(-1)?.label).toBe('Autre');
    expect(RHYTHMS.map(r => r.key)).toEqual(['day', 'week', 'fortnight', 'month']);
    expect(kindOf({})).toBe('machine');
    expect(kindOf({ kind: 'it' })).toBe('it');
    expect(kindLabel('vehicle')).toBe('Véhicule ou engin');
  });
  it('has neutral default points, causes and natures, "Autre" last', () => {
    expect(DEFAULT_CHECKPOINTS).toHaveLength(5);
    const words = JSON.stringify([DEFAULT_CHECKPOINTS, DEFAULT_CAUSES, DEFAULT_NATURES]).toLowerCase();
    expect(words).not.toMatch(/copeaux|glissi/);
    expect(DEFAULT_CAUSES.at(-1)).toBe('Autre');
    expect(DEFAULT_NATURES.at(-1)).toBe('Autre');
  });
  it('reads the settings of the tool: defaults, an empty list is the default list, "Autre" is kept once and last', () => {
    expect(maintCfg(P)).toEqual({ routineDay: 1, soonDays: 30, countDays: 30, causes: DEFAULT_CAUSES, natures: DEFAULT_NATURES });
    expect(maintCfg({ ...P, maint: { causes: [] } }).causes).toEqual(DEFAULT_CAUSES);
    expect(maintCfg({ ...P, maint: { causes: ['Panne électrique', 'autre', ' ', 'Casse'], routineDay: 5, soonDays: 45, countDays: 14 } })).toMatchObject({ causes: ['Panne électrique', 'Casse', 'Autre'], routineDay: 5, soonDays: 45, countDays: 14 });
  });
  it('has 9 models of 4 to 6 points, measured points with their unit, and builds an equipment from one', () => {
    expect(EQ_TEMPLATES).toHaveLength(9);
    EQ_TEMPLATES.forEach(t => { expect(t.points.length).toBeGreaterThanOrEqual(4); expect(t.points.length).toBeLessThanOrEqual(6); expect(EQ_KINDS.map(k => k.key)).toContain(t.kind); });
    EQ_TEMPLATES.flatMap(t => t.points).filter(p => p.min !== undefined || p.max !== undefined).forEach(p => expect(p.unit).toBeTruthy());
    expect(JSON.stringify(EQ_TEMPLATES).toLowerCase()).not.toMatch(/copeaux|glissi/);
    const t = EQ_TEMPLATES.find(x => x.name === "Compresseur d'air")!, e = equipmentFromTemplate(t);
    expect(e).toMatchObject({ name: "Compresseur d'air", kind: 'machine', inspections: [], parts: [] });
    expect(e.checkpoints).toHaveLength(t.points.length);
    expect(new Set(e.checkpoints.map(c => c.id)).size).toBe(t.points.length);
    expect(e.checkpoints.find(c => c.label === 'Pression de service')).toMatchObject({ min: 6, max: 8, unit: 'bar' });
    expect(e.checkpoints[0]).not.toHaveProperty('min');
    expect(e.safety).toEqual(t.safety);
    expect(e.safety).not.toBe(t.safety);
    expect(equipmentFromTemplate(EQ_TEMPLATES.find(x => x.name === 'Véhicule')!)).not.toHaveProperty('safety');
  });
  it('creates an equipment with the five default points, each with an id, and its kind', () => {
    const e = newEquipment('instrument');
    expect(e.kind).toBe('instrument');
    expect(e.checkpoints.map(c => c.label)).toEqual(DEFAULT_CHECKPOINTS.map(c => c.label));
    expect(e.checkpoints.every(c => c.id)).toBe(true);
    expect(newEquipment().kind).toBe('machine');
  });
  it('tells the status: retired first, then stopped, otherwise in service; the bottleneck is the default', () => {
    expect(eqStatus(eq())).toBe('service');
    expect(eqStatus(eq({ stoppedSince: '2026-09-25T08:00' }))).toBe('stopped');
    expect(eqStatus(eq({ stoppedSince: '2026-09-25T08:00', retiredAt: '2026-09-26' }))).toBe('retired');
    expect(isBottleneck(eq())).toBe(true);
    expect(isBottleneck(eq({ bottleneck: false }))).toBe(false);
  });
});

describe('3.3 periods of the routine', () => {
  it('week: 7 days from the last day of the routine, Monday by default', () => {
    expect(periodOf(eq(), now, P)).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    expect(periodOf(eq(), now, P, 1)).toEqual({ from: '2026-09-14', to: '2026-09-20' });
    expect(periodOf(eq(), new Date(2026, 8, 21), P).from).toBe('2026-09-21');   // the Monday itself
    expect(periodOf(eq(), new Date(2026, 8, 27), P).from).toBe('2026-09-21');   // the Sunday
    expect(periodOf(eq(), new Date(2026, 8, 28), P).from).toBe('2026-09-28');
  });
  it('week: the day comes from the equipment, else from the settings of the tool', () => {
    expect(periodOf(eq({ routine: { every: 'week', day: 3 } }), now, P)).toEqual({ from: '2026-09-23', to: '2026-09-29' });
    expect(periodOf(eq({ routine: { every: 'week', day: 3 } }), new Date(2026, 8, 22), P)).toEqual({ from: '2026-09-16', to: '2026-09-22' });
    expect(periodOf(eq({ routine: { every: 'week', day: 7 } }), now, P)).toEqual({ from: '2026-09-20', to: '2026-09-26' });
    expect(periodOf(eq(), now, { ...P, maint: { routineDay: 5 } }).from).toBe('2026-09-25');
    expect(periodOf(eq({ routine: { every: 'week', day: 2 } }), now, { ...P, maint: { routineDay: 5 } }).from).toBe('2026-09-22');
  });
  it('two weeks: periods of 14 days counted from the Monday 2024-01-01, moved to the day of the routine', () => {
    const e = eq({ routine: { every: 'fortnight' } });
    expect(periodOf(e, now, P)).toEqual({ from: '2026-09-21', to: '2026-10-04' });
    expect(periodOf(e, now, P, 1)).toEqual({ from: '2026-09-07', to: '2026-09-20' });
    expect(periodOf(e, new Date(2026, 9, 4), P).from).toBe('2026-09-21');
    expect(periodOf(e, new Date(2026, 9, 5), P).from).toBe('2026-10-05');
    expect(periodOf(eq({ routine: { every: 'fortnight', day: 3 } }), now, P)).toEqual({ from: '2026-09-23', to: '2026-10-06' });
  });
  it('month: the calendar month, across the year and in a leap year', () => {
    const e = eq({ routine: { every: 'month' } });
    expect(periodOf(e, now, P)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodOf(e, now, P, 1)).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(periodOf(e, now, P, 9)).toEqual({ from: '2025-12-01', to: '2025-12-31' });
    expect(periodOf(e, new Date(2028, 2, 10), P, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
  it('day: the day itself, the last working day on a week-end or a closed day, every day when the company works 7 days a week', () => {
    const e = eq({ routine: { every: 'day' } });
    expect(periodOf(e, now, P)).toEqual({ from: '2026-09-25', to: '2026-09-25' });
    expect(periodOf(e, new Date(2026, 8, 26), P).from).toBe('2026-09-25');   // Saturday
    expect(periodOf(e, new Date(2026, 8, 27), P).from).toBe('2026-09-25');   // Sunday
    expect(periodOf(e, new Date(2026, 8, 28), P, 1).from).toBe('2026-09-25');   // the day before a Monday is the Friday
    expect(periodOf(e, new Date(2026, 8, 28), P, 2).from).toBe('2026-09-24');
    expect(periodOf(e, new Date(2026, 8, 28), { ...P, closedDays: ['2026-09-28'] }).from).toBe('2026-09-25');
    expect(periodOf(e, new Date(2026, 8, 26), { ...P, businessHours: false }).from).toBe('2026-09-26');
  });
  it('rhythm: every week unless the equipment says otherwise, on the day of the settings', () => {
    expect(routineOf(eq(), P)).toEqual({ every: 'week', day: 1 });
    expect(routineOf(eq({ routine: { every: 'month' } }), { ...P, maint: { routineDay: 4 } })).toEqual({ every: 'month', day: 4 });
  });
});

describe('3.3 state of the routine', () => {
  it('tells never, done, to do, late and suspended', () => {
    expect(inspectionState(eq(), now, P)).toBe('never');
    expect(inspectionState(eq({ inspections: [insp('2026-09-22', ok3)] }), now, P)).toBe('ok');
    expect(inspectionState(eq({ inspections: [insp('2026-09-16', ok3)] }), now, P)).toBe('due');
    expect(inspectionState(eq({ inspections: [insp('2026-09-08', ok3)] }), now, P)).toBe('late');
    expect(inspectionState(eq({ inspections: [insp('2026-09-22', ok3)], stoppedSince: '2026-09-25T08:00' }), now, P)).toBe('paused');
    expect(inspectionState(eq({ retiredAt: '2026-09-01' }), now, P)).toBe('paused');
    expect(Object.values(INSPECTION_STATE).map(x => x.label)).toEqual(['Première routine à faire', 'Routine faite', 'Routine à faire', 'Routine en retard', 'Routine suspendue']);
  });
  it('a routine made on the Friday is not enough for the Monday after (period, not 7 sliding days)', () => {
    const e = eq({ inspections: [insp('2026-09-18', ok3)] });
    expect(inspectionState(e, new Date(2026, 8, 18), P)).toBe('ok');
    expect(inspectionState(e, new Date(2026, 8, 20), P)).toBe('ok');
    expect(inspectionState(e, new Date(2026, 8, 21), P)).toBe('due');
    expect(inspectionState(e, new Date(2026, 8, 28), P)).toBe('late');
    expect(inspectionState({ ...e, inspections: [...e.inspections, insp('2026-09-21', ok3)] }, new Date(2026, 8, 21), P)).toBe('ok');
  });
  it('gives the share of the last 12 periods with a routine, and the strip with the worst result of each period', () => {
    // counted from the first routine (14/09), the week in progress (21-27/09) left out: weeks 14-20/09 done = 1 of 1
    expect(routineRate(eq({ inspections: [insp('2026-09-22', ok3), insp('2026-09-15', ok3), insp('2026-09-14', ok3)] }), now, P)).toBe(100);
    const e = eq({ inspections: [insp('2026-09-22', ok3), insp('2026-09-15', ['ok', 'watch', 'ok']), insp('2026-09-08', ['ko', 'ok', 'ok']), insp('2026-09-09', ok3)] });
    expect(strip(e, now, P, 4)).toEqual([
      { from: '2026-08-31', to: '2026-09-06', state: 'none' }, { from: '2026-09-07', to: '2026-09-13', state: 'ko' },
      { from: '2026-09-14', to: '2026-09-20', state: 'watch' }, { from: '2026-09-21', to: '2026-09-27', state: 'ok' },
    ]);
    expect(strip(e, now, P)).toHaveLength(12);
    const m = eq({ checkpoints: [{ id: 'p1', label: 'Pression', criterion: '', min: 5.5, max: 7, unit: 'bar' }, ...pts(3).slice(1)], inspections: [insp('2026-09-22', ok3, { ids: ['p1', 'p2', 'p3'], values: [9, null, null] })] });
    expect(strip(m, now, P, 1)[0].state).toBe('ko');   // a value outside its bounds is an anomaly
  });
  it('gives the routine to the deputy when the holder is on leave that day', () => {
    const s = st({ people: { a: person('a', 'Alice', [{ from: '2026-09-24', to: '2026-09-26' }]), b: person('b', 'Bruno') } });
    const e = eq({ operator: 'Alice', deputy: 'Bruno' });
    expect(routineOwner(s, e, '2026-09-25')).toEqual({ who: 'Bruno', absent: true, deputy: true });
    expect(routineOwner(s, e, '2026-09-30')).toEqual({ who: 'Alice', absent: false, deputy: false });
    expect(routineOwner(s, { ...e, deputy: '' }, '2026-09-25')).toEqual({ who: 'Alice', absent: true, deputy: false });
    const both = st({ people: { a: person('a', 'Alice', [{ from: '2026-09-24', to: '2026-09-26' }]), b: person('b', 'Bruno', [{ from: '2026-09-25', to: '2026-09-25' }]) } });
    expect(routineOwner(both, e, '2026-09-25')).toEqual({ who: 'Alice', absent: true, deputy: false });
    expect(routineOwner(s, { ...e, operator: '', deputy: '', manager: '' }, '2026-09-25').who).toBe('');
  });
  it('finds the latest routine, the one written last on a same day', () => {
    expect(lastInspection(eq())).toBeUndefined();
    const a = insp('2026-09-22', ok3, { note: 'a' }), b = insp('2026-09-22', ok3, { note: 'b' }), c = insp('2026-09-15', ok3);
    expect(lastInspection(eq({ inspections: [a, b, c] }))?.note).toBe('b');
  });
});

describe('3.3 recording a routine', () => {
  it('opens an anomaly on a point found out of order, with its point, date, note, author and severity', () => {
    const e = eq(), out = recordInspection(e, insp('2026-09-22', ['ok', 'ko', 'ok'], { note: 'Fuite sous le bac', by: 'Bruno' }));
    expect(out.inspections).toHaveLength(1);
    expect(out.inspections[0].ids).toEqual(['p1', 'p2', 'p3']);
    expect(out.anomalies).toHaveLength(1);
    expect(out.anomalies![0]).toMatchObject({ pointId: 'p2', label: 'Point 2', date: '2026-09-22', note: 'Fuite sous le bac', by: 'Bruno', severity: 'degraded', closedAt: '' });
    expect(e.anomalies).toBeUndefined();   // the equipment given is not touched
  });
  it('does not open a second anomaly on a point that already has one, and closes it when the point is found in order', () => {
    const a = recordInspection(eq(), insp('2026-09-15', ['ok', 'ko', 'ok'])), b = recordInspection(a, insp('2026-09-22', ['ok', 'ko', 'ok']));
    expect(b.anomalies).toHaveLength(1);
    const c = recordInspection(b, insp('2026-09-29', ok3));
    expect(c.anomalies![0].closedAt).toBe('2026-09-29');
    expect(openAnomalies(c)).toEqual([]);
    const d = recordInspection(c, insp('2026-10-06', ['ok', 'ko', 'ok']));
    expect(d.anomalies).toHaveLength(2);   // it came back: a new anomaly, the old one stays in the history
    expect(openAnomalies(d)).toHaveLength(1);
  });
  it('never closes a danger by an answer: the point found in order leaves it open, only the verification closes it', () => {
    const e = eq({ anomalies: [an({ id: 'd1', label: 'Point 2', pointId: 'p2', severity: 'danger', date: '2026-09-15' })] });
    const out = recordInspection(e, insp('2026-09-22', ok3));
    expect(openAnomalies(out).map(a => a.id)).toEqual(['d1']);
    expect(openAnomalies(verifyAnomaly(out, 'd1', '2026-09-23'))).toEqual([]);
  });
  it('a point to watch opens nothing once, an anomaly when it comes back at the next routine, and a routine in order breaks the chain', () => {
    const a = recordInspection(eq(), insp('2026-09-15', ['ok', 'watch', 'ok']));
    expect(a.anomalies).toEqual([]);
    expect(watchPoints(a)).toEqual(['p2']);
    const b = recordInspection(a, insp('2026-09-22', ['ok', 'watch', 'ok']));
    expect(b.anomalies).toHaveLength(1);
    expect(b.anomalies![0]).toMatchObject({ pointId: 'p2', note: WATCH_NOTE, severity: 'degraded' });
    expect(recordInspection(b, insp('2026-09-29', ['ok', 'watch', 'ok'])).anomalies).toHaveLength(1);
    const c = recordInspection(recordInspection(a, insp('2026-09-22', ok3)), insp('2026-09-29', ['ok', 'watch', 'ok']));
    expect(c.anomalies).toEqual([]);
    expect(watchPoints(eq())).toEqual([]);
  });
  it('a measured value outside the bounds of its point is an anomaly even when the point is marked in order', () => {
    const e = eq({ checkpoints: [{ id: 'p1', label: 'Pression', criterion: '', min: 5.5, max: 7, unit: 'bar' }, ...pts(3).slice(1)] });
    const run = (v: number | null) => recordInspection(e, insp('2026-09-22', ok3, { values: [v, null, null] }));
    expect(run(8.2).anomalies).toHaveLength(1);
    expect(run(8.2).anomalies![0]).toMatchObject({ pointId: 'p1', label: 'Pression' });
    expect(run(5).anomalies).toHaveLength(1);   // under the minimum
    expect(run(7).anomalies).toEqual([]);   // the bounds are included
    expect(run(5.5).anomalies).toEqual([]);
    expect(run(null).anomalies).toEqual([]);   // no reading, nothing to compare
    const open = run(8.2);
    expect(recordInspection(open, insp('2026-09-29', ok3, { values: [8.5, null, null] })).anomalies).toHaveLength(1);   // still open, not doubled
    expect(openAnomalies(recordInspection(open, insp('2026-09-29', ok3, { values: [6, null, null] })))).toEqual([]);   // back in the bounds: closed
  });
  it('follows a point by its id: renaming it opens no second anomaly and does not prevent the closing', () => {
    const a = recordInspection(eq(), insp('2026-09-15', ['ok', 'ko', 'ok']));
    const renamed = { ...a, checkpoints: a.checkpoints.map(c => (c.id === 'p2' ? { ...c, label: "Fuite d'huile" } : c)) };
    const b = recordInspection(renamed, insp('2026-09-22', ['ok', 'ko', 'ok']));
    expect(b.anomalies).toHaveLength(1);
    expect(openAnomalies(recordInspection(b, insp('2026-09-29', ok3)))).toEqual([]);
  });
  it('reads the history by id when a point is removed, and by position for the first versions', () => {
    const i: Inspection = insp('2026-09-22', ['ko', 'ok', 'watch'], { ids: ['p1', 'p2', 'p3'] });
    const e = eq({ checkpoints: pts(3).slice(1), inspections: [i] });   // p1 removed
    expect(resultOf(e, i, 0)).toBe('ok');
    expect(resultOf(e, i, 1)).toBe('watch');
    expect(resultOf(e, i, 5)).toBeUndefined();
    expect(resultOf(eq(), insp('2026-09-22', ['ko', 'ok', 'ok']), 0)).toBe('ko');   // no ids: by position
    expect(resultOf(eq({ checkpoints: pts(3).slice(1) }), { ...i, ids: ['p1'], results: ['ko'] }, 0)).toBeUndefined();   // a point added after that routine
  });
  it('matches an anomaly without point by the name of the point, and only closes the anomalies that have a point', () => {
    const e = eq({ anomalies: [an({ label: 'point 2' })] });
    expect(recordInspection(e, insp('2026-09-22', ['ok', 'ko', 'ok'])).anomalies).toHaveLength(1);
    expect(openAnomalies(recordInspection(e, insp('2026-09-22', ok3)))).toHaveLength(1);
  });
  it('gives an id to the points that have none, writes the ids with the routine and empties the draft', () => {
    const e = eq({ checkpoints: [{ label: 'A', criterion: '' }, { label: 'B', criterion: '', id: 'keep' }], routineDraft: { date: '2026-09-25', by: 'A', results: {}, values: {}, note: '' } });
    const out = recordInspection(e, insp('2026-09-25', ['ok', 'ok']));
    expect(out.checkpoints.every(c => c.id)).toBe(true);
    expect(out.checkpoints[1].id).toBe('keep');
    expect(out.inspections[0].ids).toEqual(out.checkpoints.map(c => c.id));
    expect('routineDraft' in out).toBe(false);
  });
  it('reads the anomalies of the first versions from the last routine, and keeps them when the list is created', () => {
    const e = eq({ inspections: [insp('2026-09-14', ['ok', 'ko', 'ok'], { note: 'Bruit' })] });
    expect(openAnomalies(e)).toMatchObject([{ id: 'an_legacy_p2', label: 'Point 2', date: '2026-09-14', note: 'Bruit', pointId: 'p2' }]);
    expect(recordInspection(e, insp('2026-09-22', ['ok', 'ko', 'ok'])).anomalies).toHaveLength(1);
    expect(openAnomalies(recordInspection(e, insp('2026-09-22', ok3)))).toEqual([]);
    expect(openAnomalies(eq())).toEqual([]);
  });
  it('a point still in anomaly takes back "repaired": the repair is not confirmed', () => {
    const a = recordInspection(eq(), insp('2026-09-15', ['ok', 'ko', 'ok'])), id = a.anomalies![0].id;
    const fixed = repairAnomaly(a, id, '2026-09-18');
    expect(anomalyStatus(fixed.anomalies![0])).toBe('repaired');
    expect(anomalyStatus(recordInspection(fixed, insp('2026-09-22', ['ok', 'ko', 'ok'])).anomalies![0])).toBe('reported');
    expect(recordInspection(fixed, insp('2026-09-22', ok3)).anomalies![0]).toMatchObject({ closedAt: '2026-09-22', repairedAt: '2026-09-18' });
  });
  it('keeps and clears the draft of a routine under way', () => {
    const d = { date: '2026-09-25', by: 'Alice', results: { p1: 'ok' as PointResult }, values: {}, note: '' };
    const e = saveDraft(eq(), d);
    expect(e.routineDraft).toBe(d);
    expect('routineDraft' in clearDraft(e)).toBe(false);
    expect('routineDraft' in saveDraft(e, undefined)).toBe(false);
  });
});

describe('3.3 anomalies', () => {
  it('reports a problem outside a routine: photo, nature, severity, author; a stop also stops the equipment and keeps the link', () => {
    const a = reportAnomaly(eq(), { label: 'Bruit au démarrage', nature: 'Bruit', severity: 'degraded', by: 'Bruno', photo: 'photo:x', note: 'Depuis ce matin' }, '2026-09-25T09:30');
    expect(a.anomalies).toHaveLength(1);
    expect(a.anomalies![0]).toMatchObject({ label: 'Bruit au démarrage', nature: 'Bruit', severity: 'degraded', by: 'Bruno', photo: 'photo:x', note: 'Depuis ce matin', date: '2026-09-25', closedAt: '' });
    expect(a.anomalies![0]).not.toHaveProperty('pointId');
    expect(a.stoppedSince).toBeUndefined();
    expect(reportAnomaly(eq(), { label: 'Câble dénudé', severity: 'danger', by: 'Bruno' }, '2026-09-25T09:30').stoppedSince).toBeUndefined();
    const s = reportAnomaly(eq(), { label: 'Bourrage', severity: 'stopped', by: 'Bruno' }, '2026-09-25T09:30');
    expect(s.stoppedSince).toBe('2026-09-25T09:30');
    expect(s.breakdowns).toHaveLength(1);
    expect(s.breakdowns![0]).toMatchObject({ startedAt: '2026-09-25T09:30', anomalyId: s.anomalies![0].id, hours: null });
  });
  it('goes from reported to handled, waiting, repaired and checked, and back', () => {
    let e = eq({ anomalies: [an()] });
    expect(anomalyStatus(e.anomalies![0])).toBe('reported');
    e = patchAnomaly(e, 'a1', { handler: 'Bruno', dueAt: '2026-09-30' });
    expect(anomalyStatus(e.anomalies![0])).toBe('handled');
    e = patchAnomaly(e, 'a1', { waitingFor: 'pièce' });
    expect(anomalyStatus(e.anomalies![0])).toBe('waiting');
    e = repairAnomaly(e, 'a1', '2026-09-24');
    expect(anomalyStatus(e.anomalies![0])).toBe('repaired');
    expect(openAnomalies(e)).toHaveLength(1);   // not closed by itself
    e = verifyAnomaly(e, 'a1', '2026-09-29');
    expect(e.anomalies![0]).toMatchObject({ closedAt: '2026-09-29', repairedAt: '2026-09-24' });
    expect(openAnomalies(e)).toEqual([]);
    e = reopenAnomaly(e, 'a1');
    expect(e.anomalies![0].closedAt).toBe('');
    expect(e.anomalies![0].repairedAt).toBeUndefined();
    expect(anomalyStatus(e.anomalies![0])).toBe('waiting');
    expect(verifyAnomaly(eq({ anomalies: [an()] }), 'a1', '2026-09-29').anomalies![0].repairedAt).toBe('2026-09-29');   // checked without a repair date: the date is used
    expect(Object.values(ANOMALY_STATUS).map(x => x.label)).toEqual(['Signalée', 'Prise en charge', 'En attente', 'Réparée, à vérifier']);
    expect(SEVERITY_LABEL).toEqual({ degraded: 'Tourne mal', stopped: "À l'arrêt", danger: 'Danger' });
  });
  it('tells the points that came back in anomaly 3 times in 12 weeks', () => {
    const three = eq({ anomalies: [an({ id: 'a1', pointId: 'p1', date: '2026-07-04' }), an({ id: 'a2', pointId: 'p1', date: '2026-08-10', closedAt: '2026-08-12' }), an({ id: 'a3', pointId: 'p1', date: '2026-09-20' }), an({ id: 'a4', pointId: 'p2', date: '2026-09-20' })] });
    expect(repeatedPoints(three, now)).toEqual([{ pointId: 'p1', label: 'Point 1', times: 3 }]);
    expect(repeatedPoints(eq({ anomalies: [...three.anomalies!.slice(0, 2), an({ id: 'old', pointId: 'p1', date: '2026-07-03' })] }), now)).toEqual([]);   // 84 days ago is out
    expect(repeatedPoints(eq({ anomalies: [an({ pointId: 'p1' }), an({ id: 'a2', pointId: 'p1' }), an({ id: 'a3' })] }), now)).toEqual([]);   // two with the point, one without
    expect(repeatedPoints(eq(), now)).toEqual([]);
  });
});

describe('3.3 stops and breakdowns', () => {
  it('writes the start of a stop, closes it with the real hours rounded to 0.1, and applies what was typed', () => {
    const s = stopEquipment(eq(), 'Alice', '2026-09-25T08:00');
    expect(s.stoppedSince).toBe('2026-09-25T08:00');
    expect(s.breakdowns).toHaveLength(1);
    expect(s.breakdowns![0]).toMatchObject({ date: '2026-09-25', startedAt: '2026-09-25T08:00', hours: null, cost: null, cause: '' });
    expect(openBreakdown(s)).toBeDefined();
    expect(eqStatus(s)).toBe('stopped');
    const r = restartEquipment(s, '2026-09-25T10:35');
    expect(r.stoppedSince).toBeUndefined();
    expect('stoppedSince' in r).toBe(false);
    expect(r.breakdowns![0]).toMatchObject({ endedAt: '2026-09-25T10:35', hours: 2.6 });
    expect(openBreakdown(r)).toBeUndefined();
    const p = restartEquipment(stopEquipment(eq(), 'A', '2026-09-24T22:00'), '2026-09-25T07:30', { cause: 'Réglage', impact: 'stopped', cost: 120, planB: true });
    expect(p.breakdowns![0]).toMatchObject({ hours: 9.5, cause: 'Réglage', impact: 'stopped', cost: 120, planB: true, date: '2026-09-24' });
  });
  it('does not stack a second stop, and a restart without open breakdown only clears the stop', () => {
    const s = stopEquipment(eq(), 'A', '2026-09-25T08:00');
    expect(stopEquipment(s, 'A', '2026-09-25T09:00')).toBe(s);
    const odd = restartEquipment(eq({ stoppedSince: '2026-09-25T08:00' }), '2026-09-25T10:00', { cause: 'x' });
    expect('stoppedSince' in odd).toBe(false);
    expect(odd.breakdowns).toBeUndefined();
  });
  it('counts the breakdowns of the last 12 months: number, hours, cost typed by the company and days between two', () => {
    const e = eq({ breakdowns: [bd({ id: 'a', date: '2026-03-10', hours: 4, cost: 2400 }), bd({ id: 'b', date: '2026-07-10', hours: 2.5 }), bd({ id: 'c', date: '2025-09-24', hours: 99, cost: 9999 })] });
    expect(downtime(e, now)).toEqual({ count: 2, hours: 6.5, cost: 2400, between: 122 });
    expect(downtime(eq({ breakdowns: [bd({ date: '2025-09-25' })] }), now)).toMatchObject({ count: 1, between: null });   // exactly a year ago: counted
    expect(downtime(eq(), now)).toEqual({ count: 0, hours: 0, cost: 0, between: null });
    expect(downtime(eq({ breakdowns: [bd({ hours: 0.1 }), bd({ id: 'b2', hours: 0.2 })] }), now).hours).toBe(0.3);
  });
  it('tells the causes that come back at least twice in 12 months, accents and case aside, "Autre" excepted', () => {
    const e = eq({ breakdowns: [
      bd({ id: 'a', cause: 'Usure normale' }), bd({ id: 'b', date: '2026-08-01', cause: 'usure normale' }), bd({ id: 'c', cause: 'Réglage' }),
      bd({ id: 'd', cause: 'Autre' }), bd({ id: 'e', cause: 'Autre' }), bd({ id: 'f', date: '2025-01-01', cause: 'Réglage' }), bd({ id: 'g', cause: '' }), bd({ id: 'h', cause: '' }),
    ] });
    expect(repeatedCauses(e, now)).toEqual([{ cause: 'Usure normale', times: 2 }]);
  });
  it('tells that a stop lasts longer than the outage tolerated by the Plan B linked to the equipment', () => {
    const s = st({ risks: { r1: risk(), r2: risk({ id: 'r2', maxOutage: { value: 1, unit: 'j' } }), r3: risk({ id: 'r3', maxOutage: null }) } });
    const stopped = (riskId: string, since = '2026-09-25T04:00') => eq({ riskId, stoppedSince: since });
    expect(planBExceeded(s, stopped('r1'), now)).toMatchObject({ hours: 6, limit: 4, risk: { id: 'r1' } });
    expect(planBExceeded(s, stopped('r1', '2026-09-25T08:00'), now)).toBeNull();   // 2 h for 4 h tolerated
    expect(planBExceeded(s, stopped('r2'), now)).toBeNull();   // 1 day tolerated
    expect(planBExceeded(s, stopped('r3'), now)).toBeNull();   // no tolerated outage written
    expect(planBExceeded(s, stopped('missing'), now)).toBeNull();
    expect(planBExceeded(s, eq({ riskId: 'r1' }), now)).toBeNull();   // running
    expect(planBExceeded(s, { ...stopped('r1'), retiredAt: '2026-09-25' }, now)).toBeNull();
  });
});

describe('3.3 life, retirement and deletion', () => {
  it('writes what was typed and keeps the life of the saved record, so a stale sheet never erases a routine', () => {
    const saved = eq({
      inspections: [insp('2026-09-22', ok3)], anomalies: [an()], breakdowns: [bd()], checkLife: { tk_1: { history: [] } }, stoppedSince: '2026-09-25T08:00',
      retiredAt: '2026-09-26', retiredNote: 'Vendue', reinstatedAt: '2026-09-27T09:00', routineDraft: { date: '2026-09-25', by: 'A', results: {}, values: {}, note: '' },
    });
    const stale = { ...eq({ name: 'Renommée', location: 'Atelier 2' }), stoppedSince: '2026-01-01T00:00' };
    const out = takeLife(stale, saved);
    expect(out).toMatchObject({ name: 'Renommée', location: 'Atelier 2' });
    LIFE_KEYS.forEach(k => expect(out[k]).toEqual(saved[k]));
    expect(takeLife({ ...stale, inspections: [] }, eq({ inspections: [insp('2026-09-22', ok3)] })).stoppedSince).toBeUndefined();   // the saved record is the stop
    expect(takeLife(stale, undefined)).toBe(stale);   // a new equipment is written as it is
    expect([...LIFE_KEYS]).toEqual(['inspections', 'anomalies', 'breakdowns', 'checkLife', 'stoppedSince', 'retiredAt', 'retiredNote', 'reinstatedAt', 'pauses', 'routineDraft']);
    // the return to service of the saved record is not erased by a stale sheet that does not know it (V-08), nor given back when the saved one has none
    expect(out.reinstatedAt).toBe('2026-09-27T09:00');
    expect('reinstatedAt' in takeLife({ ...stale, reinstatedAt: '2026-01-01T00:00' }, eq())).toBe(false);
  });
  it('deletes only when nothing is lost, and tells what would be', () => {
    expect(canDelete(eq())).toBe(true);
    expect(canDelete(eq({ anomalies: [], breakdowns: [], checkLife: {} }))).toBe(true);
    expect(canDelete(eq({ inspections: [insp('2026-09-22', ok3)] }))).toBe(false);
    expect(canDelete(eq({ anomalies: [an()] }))).toBe(false);
    expect(canDelete(eq({ breakdowns: [bd()] }))).toBe(false);
    expect(canDelete(eq({ checkLife: { tk_1: { history: [] } } }))).toBe(false);
    expect(lostByDeleting(eq())).toBe('');
    expect(lostByDeleting(eq({ inspections: [insp('2026-09-22', ok3), insp('2026-09-15', ok3)], anomalies: [an()], breakdowns: [bd()] }))).toBe('2 routines, 1 anomalie, 1 panne');
    expect(lostByDeleting(eq({ checkLife: { a: { history: [] }, b: { history: [] }, c: { history: [] } } }))).toBe('3 contrôles suivis');
  });
  it('retires from service with a date and a note, and puts back', () => {
    const r = retireEquipment(eq(), '2026-09-20', 'Vendue');
    expect(r).toMatchObject({ retiredAt: '2026-09-20', retiredNote: 'Vendue' });
    expect(eqStatus(r)).toBe('retired');
    const back = reinstateEquipment(r);
    expect(eqStatus(back)).toBe('service');
    expect('retiredAt' in back).toBe(false);
    expect('retiredNote' in back).toBe(false);
    expect(back.reinstatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);   // the return to service says when (V-08)
    expect(reinstateEquipment(r, '2026-09-21T08:15').reinstatedAt).toBe('2026-09-21T08:15');
    const again = retireEquipment(reinstateEquipment(r, '2026-09-21T08:15'), '2026-09-22', 'Encore');   // retired again: the old return to service does not stay beside it
    expect(again).toMatchObject({ retiredAt: '2026-09-22', retiredNote: 'Encore' });
    expect('reinstatedAt' in again).toBe(false);
    expect('reinstatedAt' in r).toBe(false);
  });
  it('copies what was typed, never the life, without stacking the copies', () => {
    const src = eq({
      name: 'Presse', serial: 'SN1', plate: 'photo:plate', pin: { x: 0.1, y: 0.2 }, photo: 'photo:eq', routine: { every: 'month' }, sopId: 's1', contacts: [{ id: 'h1', role: 'Constructeur', contactId: 'c1' }],
      checkpoints: [{ id: 'p1', label: 'Niveau', criterion: 'Entre mini et maxi', photo: 'photo:ref' }], inspections: [insp('2026-09-22', ['ok'])], anomalies: [an()], breakdowns: [bd()],
      checkLife: { tk_1: { history: [] } }, stoppedSince: '2026-09-25T08:00', retiredAt: '2026-09-26', routineDraft: { date: '2026-09-25', by: 'A', results: {}, values: {}, note: '' },
      tasks: [{ id: 'tk_1', label: 'Extincteurs', everyDays: 365, lastDone: '2026-01-01', legal: true, first: '2026-06-01', every: { value: 1, unit: 'an' } }],
    });
    const c = duplicateEquipment(src);
    expect(c.id).not.toBe(src.id);
    expect(c.name).toBe('Presse (copie)');
    expect(c).toMatchObject({ photo: 'photo:eq', routine: { every: 'month' }, sopId: 's1', contacts: [{ id: 'h1', role: 'Constructeur', contactId: 'c1' }], inspections: [], parts: [] });
    ['serial', 'plate', 'pin', 'anomalies', 'breakdowns', 'checkLife', 'stoppedSince', 'retiredAt', 'routineDraft'].forEach(k => expect(c).not.toHaveProperty(k));
    expect(c.checkpoints[0]).toMatchObject({ label: 'Niveau', criterion: 'Entre mini et maxi', photo: 'photo:ref' });
    expect(c.checkpoints[0].id).not.toBe('p1');
    expect(c.tasks![0]).toMatchObject({ label: 'Extincteurs', legal: true, lastDone: '', every: { value: 1, unit: 'an' } });
    expect(c.tasks![0].id).not.toBe('tk_1');
    expect(c.tasks![0].first).toBe('2027-01-01');   // not born without a date: the next due date of the source (01/01/2026 + 1 year)
    expect(src.serial).toBe('SN1');   // the source is not touched
    expect(src.tasks![0].lastDone).toBe('2026-01-01');
    expect(duplicateEquipment(c).name).toBe('Presse (copie)');
    expect(duplicateEquipment(eq({ tasks: undefined }))).not.toHaveProperty('tasks');
  });
});

describe('3.3 links with the other tools', () => {
  it('lists the defects of the red bin on the equipment over 90 days, newest first: by the equipment chosen, else by the name of the place', () => {
    const nc = (id: string, over: Partial<ReturnType<typeof newNc>>) => ({ ...newNc(st(), 'x', now), id, ...over });
    const s = st({ ncs: {
      a: nc('a', { equipmentId: 'e1', at: '2026-09-20T08:00' }), b: nc('b', { where: ' presse PLIEUSE', at: '2026-09-24T08:00' }),
      c: nc('c', { equipmentId: 'other', where: 'Presse plieuse', at: '2026-09-24T09:00' }), d: nc('d', { equipmentId: 'e1', at: '2026-05-01T08:00' }),
      e: nc('e', { where: 'Atelier', at: '2026-09-24T09:00' }),
    } });
    expect(ncsOfEquipment(s, eq(), now).map(n => n.id)).toEqual(['b', 'a']);
    expect(ncsOfEquipment(s, eq(), now, 200).map(n => n.id)).toEqual(['b', 'a', 'd']);
    expect(ncsOfEquipment(s, eq({ name: '' }), now)).toEqual([expect.objectContaining({ id: 'a' })]);   // no name: nothing matches by name
  });
  it('lists the people to call, with the single contact of the first versions as after-sales service', () => {
    const h = { id: 'h1', role: 'Constructeur', contactId: 'c1' };
    expect(helpersOf(eq())).toEqual([]);
    expect(helpersOf(eq({ contacts: [h] }))).toEqual([h]);
    expect(helpersOf(eq({ contacts: [h], contactId: 'c2' }))).toEqual([h, { id: 'sav_c2', role: 'Service après-vente', contactId: 'c2' }]);
    expect(helpersOf(eq({ contacts: [h], contactId: 'c1' }))).toEqual([h]);
    expect(helpersOf(eq({ contactId: 'c2' }))).toHaveLength(1);
  });
  it('shows the work instruction of the workstation: version, posted or not, people allowed, holder allowed', () => {
    const sop = { ...newSop('P3', now), id: 's1', poste: 'Presse plieuse', phase: 'active' as const, version: 3, versionDate: '2026-09-01', validatedBy: 'D', displayedAt: '2026-09-02',
      habilitations: [{ person: 'Alice', tutor: '', date: '2026-09-02', stage: 'alone' as const }, { person: 'Bruno', tutor: '', date: '2026-09-02', stage: 'trainer' as const }, { person: 'Eve', tutor: '', date: '2026-09-02', stage: 'seen' as const }] };
    const s = st({ sops: { s1: sop } }), e = eq({ sopId: 's1' });
    expect(sopLine(s, e, now)).toMatchObject({ version: 3, displayed: true, habilitated: 2, ownerHabilitated: true });
    expect(sopLine(s, { ...e, operator: 'Eve' }, now)?.ownerHabilitated).toBe(false);
    expect(sopLine(s, { ...e, operator: '' }, now)?.ownerHabilitated).toBeNull();
    expect(sopLine(st({ sops: { s1: { ...sop, displayedAt: '2026-08-01' } } }), e, now)?.displayed).toBe(false);
    expect(sopLine(s, eq(), now)).toBeNull();
    expect(sopLine(st({ sops: { s1: { ...sop, phase: 'archived' as const } } }), e, now)).toBeNull();
  });
  it('tells what is missing on the sheet, each point leading to its tab', () => {
    const fresh = completeness(newEquipment());
    expect(fresh.pct).toBe(22);   // a kind and 5 points: 2 of 9
    expect(fresh.missing.map(m => m.key)).toEqual(['name', 'pointPhoto', 'holder', 'deputy', 'helper', 'identity', 'checks']);
    expect(fresh.missing.find(m => m.key === 'pointPhoto')?.tab).toBe('routine');
    expect(fresh.missing.find(m => m.key === 'checks')?.tab).toBe('checks');
    expect(fresh.missing.find(m => m.key === 'name')?.tab).toBe('sheet');
    const full = eq({
      deputy: 'Bruno', photo: 'photo:eq', contacts: [{ id: 'h1', role: 'Constructeur', contactId: 'c1' }],
      checkpoints: pts(3).map(c => ({ ...c, photo: 'photo:ref' })), tasks: [{ id: 'tk_1', label: 'Extincteurs', everyDays: 365, lastDone: '', legal: false }],
    });
    expect(completeness(full)).toEqual({ pct: 100, missing: [] });
    expect(completeness({ ...full, kind: undefined }).missing.map(m => m.key)).toEqual(['kind']);   // an older equipment has no chosen kind
    expect(completeness({ ...full, contacts: [], contactId: 'c9', photo: '', serial: 'SN1' }).pct).toBe(100);   // the single contact of the first versions and a serial number count
    expect(completeness({ ...full, tasks: [], contract: { provider: 'Maint SA', until: '2027-01-01' } }).pct).toBe(100);
    expect(completeness({ ...full, checkpoints: pts(2).map(c => ({ ...c, photo: 'photo:ref' })) }).missing.map(m => m.key)).toEqual(['points']);
  });
});

describe('3.3 what is left to do', () => {
  it('asks the routine of the equipment that is to do or late, to the holder, with the due date of the period', () => {
    const s = st({ equipments: withEq(
      eq({ id: 'ok', name: 'Fait', inspections: [insp('2026-09-22', ok3)] }), eq({ id: 'due', name: 'Compresseur', inspections: [insp('2026-09-16', ok3)] }),
      eq({ id: 'late', name: 'Chariot', operator: 'Bruno', inspections: [insp('2026-09-01', ok3)] }), eq({ id: 'new', name: 'Neuf' }),
    ) });
    const ts = routineTodos(s, now);
    expect(ts.map(t => t.eqId).sort()).toEqual(['due', 'late', 'new']);
    expect(ts.find(t => t.eqId === 'due')).toMatchObject({ kind: 'routine', tone: 'warn', who: 'Alice', due: '2026-09-27', text: 'Faire la routine de Compresseur' });
    expect(ts.find(t => t.eqId === 'late')).toMatchObject({ kind: 'routine', tone: 'warn', who: 'Bruno', due: '2026-09-20' });   // a late routine is amber: red is for what cannot wait
    expect(ts.find(t => t.eqId === 'late')?.text).toContain('dernière le 01/09/2026');
    expect(ts.find(t => t.eqId === 'new')).toMatchObject({ tone: 'warn', text: 'Faire la première routine de Neuf' });
    expect(new Set(ts.map(t => t.id)).size).toBe(ts.length);
  });
  it('names the person planned for the routine: the holder, else the manager (the deputy takes over in maintTodos)', () => {
    const s = st({ people: { a: person('a', 'Alice', [{ from: '2026-09-24', to: '2026-09-26' }]) }, equipments: withEq(eq({ deputy: 'Bruno' })) });
    expect(routineTodos(s, now)[0]).toMatchObject({ kind: 'routine', who: 'Alice' });
    expect(maintTodos(s, now)[0]).toMatchObject({ kind: 'routine', who: 'Bruno' });
    expect(routineTodos(st({ equipments: withEq(eq({ operator: '', deputy: 'Bruno' })) }), now)[0].who).toBe('Marc');
  });
  it('asks the anomalies open, to who handles them or else to the manager; red for a danger only (a stop has its own task, a date passed is said in the fact)', () => {
    const s = st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)], anomalies: [
      an({ id: 'a1', label: 'Fuite', handler: 'Bruno', dueAt: '2026-09-30' }), an({ id: 'a2', label: 'Bruit', waitingFor: 'pièce' }), an({ id: 'a3', label: 'Câble dénudé', severity: 'danger' }),
      an({ id: 'a4', label: 'Bourrage', severity: 'stopped' }), an({ id: 'a5', label: 'Jeu', repairedAt: '2026-09-24', handler: 'Bruno', dueAt: '2026-09-20' }), an({ id: 'a6', label: 'Vieux', closedAt: '2026-09-21' }),
    ] })) });
    const ts = routineTodos(s, now), by = (ref: string) => ts.find(t => t.ref === ref)!;
    expect(ts).toHaveLength(5);
    expect(by('a1')).toMatchObject({ kind: 'anomaly', tone: 'warn', who: 'Bruno', due: '2026-09-30', eqId: 'e1', text: 'Réparer « Fuite » (Presse plieuse)' });
    expect(by('a2')).toMatchObject({ kind: 'anomaly', tone: 'warn', who: 'Marc', due: '', text: 'Suivre « Bruit » (Presse plieuse), en attente : pièce' });
    expect(by('a3')).toMatchObject({ kind: 'danger', tone: 'bad', who: 'Marc' });
    expect(by('a3').text).toContain('le danger « Câble dénudé »');
    expect(by('a4').tone).toBe('warn');
    expect(by('a5')).toMatchObject({ tone: 'warn', text: 'Vérifier la réparation de « Jeu » (Presse plieuse)' });
    expect(by('a5').fact).toContain('échéance dépassée depuis le 20/09/2026');
  });
  it('states the stop and the stop beyond the Plan B as facts, and asks no routine of a stopped equipment', () => {
    const s = st({ risks: { r1: risk() }, equipments: withEq(eq({ riskId: 'r1', stoppedSince: '2026-09-25T04:00', manager: 'Marc' }), eq({ id: 'e2', name: 'Four', riskId: 'r1', stoppedSince: '2026-09-25T08:00', manager: '' })) });
    const ts = routineTodos(s, now);
    expect(ts.filter(t => t.kind === 'routine')).toEqual([]);
    expect(ts.find(t => t.id === 'stopped:e1')).toMatchObject({ kind: 'stopped', tone: 'bad', text: "Presse plieuse à l'arrêt depuis 6 h" });
    expect(ts.find(t => t.id === 'plan-b:e1')).toMatchObject({ kind: 'plan-b', tone: 'bad', who: 'Marc', ref: 'r1' });
    expect(ts.find(t => t.id === 'plan-b:e1')?.text).toContain('arrêt toléré de 4 h');
    expect(ts.some(t => t.id === 'plan-b:e2')).toBe(false);   // 2 h stopped for 4 h tolerated
    expect(ts.find(t => t.id === 'stopped:e2')?.who).toBe('');
  });
  it('says nothing of a retired equipment', () => {
    const s = st({ equipments: withEq(eq({ retiredAt: '2026-09-01', stoppedSince: '2026-09-01T08:00', anomalies: [an({ severity: 'danger' })] })) });
    expect(routineTodos(s, now)).toEqual([]);
    expect(routineFacts(s, now)).toEqual([]);
  });
});

describe('3.3 facts of the routine', () => {
  const rich = () => st({
    risks: { r1: risk(), r2: risk({ id: 'r2', title: 'Panne four' }) },
    sops: { s1: { ...newSop('P3', now), id: 's1', poste: 'Presse', phase: 'active' as const, version: 2, versionDate: '2026-09-10', validatedBy: 'D', displayedAt: '2026-08-01' } },
    equipments: withEq(
      eq({ id: 'e1', name: 'Presse plieuse', riskId: 'r1', sopId: 's1', stoppedSince: '2026-09-25T04:00', inspections: [insp('2026-09-22', ['ok', 'watch', 'ok'])],
        anomalies: [an({ id: 'a1', pointId: 'p1', date: '2026-07-10', closedAt: '2026-07-20' }), an({ id: 'a2', pointId: 'p1', date: '2026-08-10', closedAt: '2026-08-20' }), an({ id: 'a3', pointId: 'p1', date: '2026-09-10', label: 'Niveau', handler: 'Bruno' }), an({ id: 'a4', label: 'Bruit', note: WATCH_NOTE, pointId: 'p3' })],
        breakdowns: [bd({ id: 'b1', date: '2026-03-10', hours: 4, cost: 2400, cause: 'Usure normale' }), bd({ id: 'b2', date: '2026-07-10', hours: 2.5, cause: 'usure normale' })] }),
      eq({ id: 'e2', name: 'Chariot', inspections: [insp('2026-09-01', ok3)], anomalies: [an({ id: 'a5', label: 'Câble dénudé', severity: 'danger' })] }),
      eq({ id: 'e3', name: 'Neuf', bottleneck: false }),
      eq({ id: 'e4', name: 'Four', riskId: 'r2', inspections: [insp('2026-09-22', ['ok', 'watch', 'ok'])] }),
    ),
  });
  it('states the routine missed, the anomalies, the points that come back and the points to watch', () => {
    const f = Object.fromEntries(routineFacts(rich(), now).map(i => [i.key, i]));
    expect(f['routine-missed'].text).toBe('Chariot (dernière routine le 01/09/2026).');   // only a routine missed: a new equipment is not a missed one
    expect(f['routine-first']).toMatchObject({ tone: 'warn', title: 'Première routine à faire', text: 'Neuf : aucune routine enregistrée.' });
    expect(f.danger).toMatchObject({ tone: 'bad' });
    expect(f.danger.text).toContain('Chariot : Câble dénudé');
    expect(f.anomalies.text).toMatch(/^3 anomalies ouvertes, dont 1 danger : /);   // every open anomaly, the danger included and said; the two closed ones are not counted
    expect(f.anomalies.text).toContain('à surveiller deux routines de suite');
    expect(f.repeat.text).toContain('le point « Point 1 » est revenu 3 fois en 12 semaines');
    expect(f.watch.text).toBe('Four (Point 2) : à surveiller à la dernière routine.');   // the stopped press has its routine suspended
    const one = routineFacts(st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)], anomalies: [an()] })) }), now);
    expect(one.find(i => i.key === 'anomalies')?.text).toMatch(/^1 anomalie ouverte : Presse plieuse \(Fuite, signalée\)\.$/);
  });
  it('states the stops, the stop beyond the Plan B, the breakdowns with the cost typed, the causes that come back, no Plan B and the sheet not posted', () => {
    const f = Object.fromEntries(routineFacts(rich(), now).map(i => [i.key, i]));
    expect(f.stopped.text).toContain('Presse plieuse depuis 6 h');
    expect(f['plan-b-over'].text).toContain('arrêt toléré de 4 h (Casse broche)');
    expect(f.breakdowns.text).toMatch(/Presse plieuse : 2 pannes, 6,5 h d'arrêt, 2\s400\s€, en moyenne tous les 122 jours/);
    expect(f['repeat-cause'].text).toContain('« Usure normale », 2 fois en 12 mois');
    expect(f['no-plan-b'].text).toContain('Chariot');
    expect(f['no-plan-b'].text).not.toContain('Neuf');   // not a bottleneck
    expect(f['no-plan-b'].text).not.toContain('Four');   // has its Plan B
    expect(f['sop-posted'].text).toContain('Presse plieuse (V02, ancienne version affichée)');
    routineFacts(rich(), now).forEach(i => expect(['good', 'warn', 'bad']).toContain(i.tone));
  });
  it('says no cost when none was typed, nothing about Plan B when the tool 1.2 has no risk, and nothing when all is in order', () => {
    const s = st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)], breakdowns: [bd({ hours: 3, cost: null })] })) });
    const f = routineFacts(s, now);
    expect(f.map(i => i.key)).toEqual(['breakdowns']);
    expect(f[0].text).not.toContain('€');
    expect(routineFacts(st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)] })) }), now)).toEqual([]);
    expect(routineFacts(st(), now)).toEqual([]);
  });
  it('gives no order in a message: none starts with a verb, and a task is an infinitive, never an imperative', () => {
    const verbs = 'commander traiter relancer faire verifier planifier appeler contacter prevoir remplacer reparer signaler controler lever prendre suivre mettre afficher recontacter surveiller';
    const orders = 'commandez traitez relancez faites verifiez planifiez appelez contactez prevoyez remplacez reparez signalez controlez levez prenez suivez mettez affichez recontactez surveillez';
    const s = rich(), first = (t: string) => norm(t).split(/[\s']/)[0];
    const facts = routineFacts(s, now);
    expect(facts.length).toBeGreaterThan(8);
    facts.forEach(i => { [i.title, i.text].forEach(t => { expect(`${verbs} ${orders}`.split(' ')).not.toContain(first(t)); }); expect(i.text).not.toMatch(/obligation|tout de suite|avant la casse/i); });
    const todos = routineTodos(s, now);
    expect(todos.length).toBeGreaterThan(5);
    todos.forEach(t => expect(orders.split(' ')).not.toContain(first(t.text)));
    todos.filter(t => t.kind === 'stopped' || t.kind === 'plan-b').forEach(t => expect(verbs.split(' ')).not.toContain(first(t.text)));   // a fact, not even an infinitive
    expect(todos.filter(t => t.kind === 'routine').every(t => /^Faire /.test(t.text))).toBe(true);
  });
});

describe('3.3 level and urgency of a card', () => {
  it('sets a retired equipment aside, whatever its tasks', () => {
    expect(eqLevel(eq({ retiredAt: '2026-09-01' }), [todo({ tone: 'bad', kind: 'danger' })])).toEqual({ level: 'pending', label: 'Retiré' });
  });
  it('is red for a stop or a danger, and tells the most serious thing', () => {
    expect(eqLevel(eq({ stoppedSince: '2026-09-25T08:00' }), [])).toEqual({ level: 'alert', label: "À l'arrêt" });
    expect(eqLevel(eq({ stoppedSince: '2026-09-25T08:00' }), [todo({ kind: 'danger', tone: 'bad' })])).toEqual({ level: 'alert', label: 'Danger' });
    expect(eqLevel(eq(), [todo({ kind: 'routine', tone: 'bad' }), todo({ kind: 'danger', tone: 'bad' })])).toEqual({ level: 'alert', label: 'Danger' });
    expect(eqLevel(eq(), [todo({ kind: 'plan-b', tone: 'bad' })])).toEqual({ level: 'alert', label: "À l'arrêt" });
    expect(eqLevel(eq(), [todo({ kind: 'routine', tone: 'bad' }), todo({ kind: 'anomaly', tone: 'bad' })])).toEqual({ level: 'alert', label: 'Anomalie' });
  });
  it('is amber for a task in amber, in order without task, and reads only the tasks of its own equipment', () => {
    expect(eqLevel(eq(), [todo({ kind: 'routine' }), todo({ kind: 'anomaly' })])).toEqual({ level: 'warn', label: 'Anomalie' });
    expect(eqLevel(eq(), [todo({ kind: 'routine' })])).toEqual({ level: 'warn', label: 'Routine à faire' });
    expect(eqLevel(eq(), [todo({ kind: 'check' })])).toEqual({ level: 'warn', label: 'Contrôle' });
    expect(eqLevel(eq(), [todo({ kind: 'check', tone: 'bad' })])).toEqual({ level: 'alert', label: 'Contrôle' });
    expect(eqLevel(eq(), [todo({ kind: 'order' })])).toEqual({ level: 'warn', label: 'À suivre' });
    expect(eqLevel(eq(), [])).toEqual({ level: 'ok', label: 'En ordre' });
    expect(eqLevel(eq(), [todo({ eqId: 'other', kind: 'danger', tone: 'bad' })])).toEqual({ level: 'ok', label: 'En ordre' });
  });
  it('adds 10 per task in red and 1 per task in amber', () => {
    const ts = [todo({ tone: 'bad' }), todo({ tone: 'warn' }), todo({ tone: 'warn' }), todo({ eqId: 'e2', tone: 'bad' })];
    expect(urgency(ts, 'e1')).toBe(12);
    expect(urgency(ts, 'e2')).toBe(10);
    expect(urgency(ts, 'e3')).toBe(0);
  });
});

// ---- lot 0, no data lost: ids, removals, retirement, citations, old draft, summary of old routines
describe('3.3 ids and removals of the elements of life', () => {
  it('gives an id to every routine written, and keeps the one it already has', () => {
    const a = recordInspection(eq(), insp('2026-09-22', ok3)), b = recordInspection(a, insp('2026-09-29', ok3)), c = recordInspection(b, { ...insp('2026-10-06', ok3), id: 'in_mine' });
    expect(a.inspections[0].id).toMatch(/^in_/);
    expect(b.inspections[1].id).toMatch(/^in_/);
    expect(b.inspections[1].id).not.toBe(b.inspections[0].id);
    expect(b.inspections[0].id).toBe(a.inspections[0].id);   // the ones already written are not touched
    expect(c.inspections[2].id).toBe('in_mine');
  });
  it('removes a routine by its id and writes the id in `gone`; an unknown id changes nothing', () => {
    const e = eq({ inspections: [{ ...insp('2026-09-22', ok3), id: 'i1' }, { ...insp('2026-09-29', ok3), id: 'i2' }] });
    const out = removeInspection(e, 'i1');
    expect(out.inspections.map(i => i.id)).toEqual(['i2']);
    expect(out.gone).toEqual(['i1']);
    expect(e.inspections).toHaveLength(2);   // input untouched
    expect(removeInspection(e, 'zz')).toBe(e);
    const both = removeInspection(out, 'i2');
    expect(both.gone).toEqual(['i1', 'i2']);
    expect(removeInspection(both, 'i1')).toBe(both);   // already removed: nothing more
  });
  it('removes a routine of the oldest data (no id) by its content', () => {
    const old = insp('2026-09-22', ['ok', 'watch', 'ok'], { at: '2026-09-22T07:30' }), e = eq({ inspections: [old, insp('2026-09-29', ok3)] });
    expect(inspectionKey(old)).toBe('2026-09-22|Alice|2026-09-22T07:30|ok,watch,ok');
    const out = removeInspection(e, inspectionKey(old));
    expect(out.inspections).toHaveLength(1);
    expect(out.gone).toEqual(['2026-09-22|Alice|2026-09-22T07:30|ok,watch,ok']);
  });
  it('keeps the last 300 removed ids, each once', () => {
    expect(GONE_KEPT).toBe(300);
    const many = Array.from({ length: 300 }, (_, i) => `x${i}`);
    expect(addGone(many, 'new')).toHaveLength(300);
    expect(addGone(many, 'new').at(-1)).toBe('new');
    expect(addGone(many, 'new')[0]).toBe('x1');
    expect(addGone(['a', 'b'], 'a')).toEqual(['b', 'a']);
    expect(addGone(undefined, 'a')).toEqual(['a']);
  });
  it('removes an anomaly by its id, also from the list the first versions never wrote', () => {
    const e = eq({ anomalies: [an({ id: 'a1' }), an({ id: 'a2' })] });
    expect(removeAnomaly(e, 'a1')).toMatchObject({ anomalies: [an({ id: 'a2' })], gone: ['a1'] });
    expect(removeAnomaly(e, 'zz')).toBe(e);
    const legacy = eq({ inspections: [insp('2026-09-22', ['ok', 'ko', 'ok'])] });
    expect(openAnomalies(legacy).map(a => a.id)).toEqual(['an_legacy_p2']);
    const out = removeAnomaly(legacy, 'an_legacy_p2');
    expect(openAnomalies(out)).toEqual([]);
    expect(out.gone).toEqual(['an_legacy_p2']);
  });
  it('removes a breakdown; an open one takes the stop with it, a closed one leaves the stop alone', () => {
    const open = stopEquipment(eq(), 'Alice', '2026-09-25T08:00');
    const out = removeBreakdown(open, open.breakdowns![0].id);
    expect(out.breakdowns).toEqual([]);
    expect(out.stoppedSince).toBeUndefined();
    expect(out.gone).toEqual([open.breakdowns![0].id]);
    expect(eqStatus(out)).toBe('service');
    const e = eq({ breakdowns: [bd({ id: 'b1', startedAt: '2026-09-01T08:00', endedAt: '2026-09-01T10:00' })], stoppedSince: '2026-09-25T08:00' });
    expect(removeBreakdown(e, 'b1').stoppedSince).toBe('2026-09-25T08:00');
    expect(removeBreakdown(e, 'zz')).toBe(e);
    expect(removeBreakdown(eq(), 'b1').breakdowns).toBeUndefined();
  });
  it('carries `gone` with the life when the typed copy is saved, and does not copy it into a duplicate', () => {
    const saved = eq({ gone: ['i1'] }), typed = eq({ name: 'Renommée', gone: ['old'] });
    expect(takeLife(typed, saved).gone).toEqual(['i1']);
    expect('gone' in takeLife(typed, eq())).toBe(false);
    expect('gone' in duplicateEquipment(saved)).toBe(false);
  });
});

describe('3.3 retiring an equipment that is stopped', () => {
  it('ends the stop on the day of the retirement, with its hours, and sets the equipment aside', () => {
    const stopped = stopEquipment(eq(), 'Alice', '2026-09-24T08:00'), r = retireEquipment(stopped, '2026-09-25', 'Au rebut');
    expect(eqStatus(r)).toBe('retired');
    expect(r.stoppedSince).toBeUndefined();
    expect(openBreakdown(r)).toBeUndefined();
    expect(r.breakdowns![0]).toMatchObject({ endedAt: '2026-09-25', hours: 16 });
    expect(r).toMatchObject({ retiredAt: '2026-09-25', retiredNote: 'Au rebut' });
    // put back months later: in service, nothing stopped, no old stop in the tasks
    const back = reinstateEquipment(r);
    expect(eqStatus(back)).toBe('service');
    expect(routineTodos(st({ equipments: withEq(back) }), new Date(2027, 1, 1)).some(t => t.kind === 'stopped')).toBe(false);
    expect(downtime(back, new Date(2026, 9, 1))).toMatchObject({ count: 1, hours: 16 });
  });
  it('takes a time given as it is, never ends a stop before it began, and clears a stop that no breakdown backs', () => {
    const stopped = stopEquipment(eq(), 'Alice', '2026-09-25T08:00');
    expect(retireEquipment(stopped, '2026-09-25T10:30', '').breakdowns![0]).toMatchObject({ endedAt: '2026-09-25T10:30', hours: 2.5 });
    expect(retireEquipment(stopped, '2026-09-25', '').breakdowns![0]).toMatchObject({ endedAt: '2026-09-25T08:00', hours: 0 });
    expect(retireEquipment(stopped, '2026-09-25', '', '2026-09-25T10:30')).toMatchObject({ retiredAt: '2026-09-25', breakdowns: [{ endedAt: '2026-09-25T10:30', hours: 2.5 }] });   // the day is kept, the end of the stop has its hour
    expect(retireEquipment(eq({ stoppedSince: '2026-09-20T08:00' }), '2026-09-25', '').stoppedSince).toBeUndefined();
    const fine = eq();
    expect(retireEquipment(fine, '2026-09-25', 'Vendue')).toEqual({ ...fine, retiredAt: '2026-09-25', retiredNote: 'Vendue' });
  });
});

describe('3.3 what cites an equipment elsewhere', () => {
  const nc = (id: string, equipmentId?: string) => ({ ...newNc(st(), 'Alice', now), id, ...(equipmentId ? { equipmentId } : {}) });
  const action = (id: string, ref?: Action['ref']): Action => ({ id, kpiId: '', ...(ref ? { ref } : {}), period: '2026-09', createdAt: '2026-09-01', constat: '', whys: [], plan: [], pilot: '' } as unknown as Action);
  const s = st({ ncs: { n1: nc('n1', 'e1'), n2: nc('n2', 'e1'), n3: nc('n3', 'e2'), n4: nc('n4') }, actions: { a1: action('a1', { kind: 'equipment', id: 'e1' }), a2: action('a2', { kind: 'supplier', id: 'e1' }), a3: action('a3', { kind: 'equipment', id: 'e2' }), a4: action('a4') } });
  it('lists the defects of the red bin and the actions about the equipment', () => {
    const c = citedBy(s, 'e1');
    expect(c.ncs.map(n => n.id)).toEqual(['n1', 'n2']);
    expect(c.actions.map(a => a.id)).toEqual(['a1']);
    expect(citedBy(s, 'e9')).toEqual({ ncs: [], actions: [] });
    expect(citedBy({ ncs: undefined, actions: undefined } as unknown as State, 'e1')).toEqual({ ncs: [], actions: [] });
  });
  it('forbids deleting an equipment that is cited, and says it', () => {
    expect(canDelete(eq(), citedBy(s, 'e9'))).toBe(true);
    expect(canDelete(eq())).toBe(true);   // the second argument is optional
    expect(canDelete(eq(), citedBy(s, 'e1'))).toBe(false);
    expect(canDelete(eq(), { ncs: [], actions: [{}] })).toBe(false);
    expect(lostByDeleting(eq(), citedBy(s, 'e1'))).toBe('2 défauts du bac rouge et 1 action citent cet équipement');
    expect(lostByDeleting(eq(), { ncs: [{}], actions: [] })).toBe('1 défaut du bac rouge cite cet équipement');
    expect(lostByDeleting(eq({ inspections: [insp('2026-09-22', ok3)], anomalies: [an()] }), { ncs: [{}], actions: [{}] })).toBe('1 routine, 1 anomalie ; 1 défaut du bac rouge et 1 action citent cet équipement');
    expect(lostByDeleting(eq(), citedBy(s, 'e9'))).toBe('');
  });
});

describe('3.3 a routine begun long ago', () => {
  const draft = (date: string): Equipment => eq({ routineDraft: { date, by: 'Alice', results: { p1: 'ok' }, values: {}, note: '' } });
  it('is old after 12 hours', () => {
    expect(staleDraft(draft('2026-09-25T07:30'), now, P)).toBe(false);   // 2.5 hours
    expect(staleDraft(draft('2026-09-24T22:30'), new Date(2026, 8, 25, 10, 0), P)).toBe(false);   // 11.5 hours, same week
    expect(staleDraft(draft('2026-09-24T21:30'), new Date(2026, 8, 25, 10, 0), P)).toBe(true);   // 12.5 hours
    expect(staleDraft(draft('2026-09-19T08:00'), now, P)).toBe(true);   // the 19th, 6 days ago
  });
  it('is old as soon as it belongs to an earlier period of the routine, even within 12 hours', () => {
    expect(staleDraft(draft('2026-09-20T23:30'), new Date(2026, 8, 21, 6, 0), P)).toBe(true);   // Sunday evening, Monday morning: a new week
    expect(staleDraft(draft('2026-09-21T05:00'), new Date(2026, 8, 21, 6, 0), P)).toBe(false);
    const month = { ...draft('2026-08-31T22:00'), routine: { every: 'month' as const } };
    expect(staleDraft(month, new Date(2026, 8, 1, 5, 0), P)).toBe(true);
  });
  it('is not old when there is none, and is when its date cannot be read', () => {
    expect(staleDraft(eq(), now, P)).toBe(false);
    expect(staleDraft(draft('hier'), now, P)).toBe(true);
  });
});

describe('3.3 summary of the old routines', () => {
  const full = (date: string, over: Partial<Inspection> = {}): Inspection => ({ id: `in_${date}`, date, at: `${date}T08:00`, by: 'Alice', note: 'RAS', results: ['ok', 'ok', 'watch'], ids: ['p1', 'p2', 'p3'], values: [null, null, null], ...over });
  const oldEq = () => eq({ inspections: [full('2023-01-10'), full('2024-09-24'), full('2024-09-25'), full('2026-09-01')] });
  it('keeps only the date, the author and the worst result of the routines older than 24 months', () => {
    const e = compactInspections(oldEq(), now);
    expect(e.inspections[0]).toEqual({ id: 'in_2023-01-10', date: '2023-01-10', by: 'Alice', results: [], note: '', worst: 'watch' });
    expect(e.inspections[1]).toEqual({ id: 'in_2024-09-24', date: '2024-09-24', by: 'Alice', results: [], note: '', worst: 'watch' });
    expect(e.inspections[2]).toEqual(full('2024-09-25'));   // exactly 24 months: kept whole
    expect(e.inspections[3]).toEqual(full('2026-09-01'));
    expect(oldEq().inspections[0].results).toHaveLength(3);   // input untouched
  });
  it('takes the worst result including a measured value out of its bounds, and has no id when the routine had none', () => {
    const e = eq({ checkpoints: [{ id: 'p1', label: 'Pression', criterion: '', min: 5, max: 7 }, ...pts(3).slice(1)], inspections: [full('2023-01-10', { results: ['ok', 'ok', 'ok'], values: [9, null, null] }), { ...full('2023-02-10'), results: ['ok', 'ko', 'watch'] }, (({ id: _i, ...x }) => x)(full('2023-03-10', { results: ['ok', 'ok', 'ok'] }))] });
    const out = compactInspections(e, now).inspections;
    expect(out.map(i => i.worst)).toEqual(['ko', 'ko', 'ok']);
    expect(out[2]).not.toHaveProperty('id');
    expect(out[2]).not.toHaveProperty('ids');
    expect(out[2]).not.toHaveProperty('values');
    expect(out[2]).not.toHaveProperty('at');
  });
  it('is done once, and returns the same equipment when there is nothing to summarise', () => {
    const e = compactInspections(oldEq(), now);
    expect(compactInspections(e, now)).toBe(e);
    const young = eq({ inspections: [full('2026-09-01')] });
    expect(compactInspections(young, now)).toBe(young);
    expect(compactInspections(eq(), now)).toBeTruthy();
  });
  it('is done by recordInspection, with the date of the routine written', () => {
    const out = recordInspection(oldEq(), insp('2026-09-25', ok3));
    expect(out.inspections.map(i => i.results.length)).toEqual([0, 0, 3, 3, 3]);
    expect(out.inspections.at(-1)).toMatchObject({ date: '2026-09-25', id: expect.stringMatching(/^in_/) });
    expect(recordInspection(oldEq(), insp('garbage', ok3))).toEqual(oldEq());   // an unreadable date is refused: the equipment comes back as it was
  });
  it('is read as a routine of one result, the worst one, wherever the routines are read', () => {
    const e = compactInspections(eq({ inspections: [full('2026-08-10', { results: ['ok', 'ko', 'ok'] })] }), new Date(2029, 0, 1));
    expect(e.inspections[0]).toMatchObject({ results: [], worst: 'ko' });
    // the strip of the periods shows the worst result, the rate counts the period, the last routine is found
    const week = periodOf(e, new Date(2026, 7, 12), P);
    expect(strip(e, new Date(2026, 7, 12), P).at(-1)).toEqual({ ...week, state: 'ko' });
    expect(strip(e, new Date(2026, 7, 12), P).slice(0, -1).every(x => x.state === 'none')).toBe(true);
    expect(routineRate(e, new Date(2026, 7, 12), P)).toBeNull();   // the week of the routine is still going: nothing was due yet
    expect(routineRate(e, new Date(2026, 7, 19), P)).toBe(100);
    expect(lastInspection(e)?.date).toBe('2026-08-10');
    expect(inspectionState(e, new Date(2026, 7, 12), P)).toBe('ok');
    expect(resultOf(e, e.inspections[0], 1)).toBeUndefined();
    expect(watchPoints(e)).toEqual([]);
    expect(strip(eq({ inspections: [{ date: '2026-08-10', by: 'A', results: [], note: '', worst: 'ok' }] }), new Date(2026, 7, 12), P).at(-1)?.state).toBe('ok');
  });
  it('lets a routine be recorded after a summarised one: nothing breaks, the points to watch twice and the closing by a point in order still work', () => {
    const sum: Inspection = { id: 'in_old', date: '2026-09-15', by: 'Alice', results: [], note: '', worst: 'watch' };
    const e = eq({ inspections: [sum], anomalies: [an({ id: 'a1', pointId: 'p2' })] });
    let out: Equipment = e;
    expect(() => { out = recordInspection(e, insp('2026-09-22', ['ok', 'watch', 'ok'])); }).not.toThrow();
    expect(out.anomalies).toHaveLength(1);   // a summary says nothing about the point: not two in a row
    expect(out.anomalies![0].closedAt).toBe('');
    expect(openAnomalies(recordInspection(e, insp('2026-09-22', ok3)))).toEqual([]);   // the point in order closes its anomaly
    expect(repeatedPoints(e, now)).toEqual([]);
    expect(openAnomalies(e).map(a => a.id)).toEqual(['a1']);
    expect(() => recordInspection(eq(), { date: '2026-09-22', by: 'A', note: '' } as unknown as Inspection)).not.toThrow();
  });
  it('weighs less than 60 % of the full routines for 1 000 routines over 5 years, and a summary less than a third of a routine', () => {
    const cps = Array.from({ length: 8 }, (_, i) => ({ id: `pt_mgx8k2zq${i}abc`, label: `Point ${i + 1}`, criterion: 'Critère habituel du point' }));
    const rs: Inspection[] = Array.from({ length: 1000 }, (_, i) => {
      const d = new Date(2026, 8, 25 - Math.floor(i * 1826 / 1000)), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { id: `in_mgx8k${i.toString(36).padStart(7, '0')}`, date: iso, at: `${iso}T07:5${i % 10}`, by: 'Alice Martin', note: '', results: cps.map((_, j) => (i % 17 === j ? 'watch' : 'ok')), ids: cps.map(c => c.id), values: cps.map(() => null) };
    });
    const e = eq({ checkpoints: cps, inspections: rs }), before = JSON.stringify(e).length, small = compactInspections(e, now), after = JSON.stringify(small).length;
    const old = small.inspections.filter(i => !i.results.length), kept = small.inspections.filter(i => i.results.length);
    expect(old.length + kept.length).toBe(1000);
    expect(old.length).toBeGreaterThan(550);   // about 3 years out of 5
    expect(kept.every(i => i.date >= '2024-09-25')).toBe(true);
    expect(JSON.stringify(old[0]).length).toBeLessThan(JSON.stringify(rs[0]).length / 3);
    expect(after / before).toBeLessThan(0.6);
    expect(small.inspections.filter(i => i.worst === 'watch').length).toBeGreaterThan(30);   // the worst result survives
  });
});


// ---- lot 1, fair rules: what makes an alert false, mute, misleading or badly ranked
describe('3.3 lot 1: the urgent tasks carry the day of the fact, and say it as a fact', () => {
  const urgent = () => st({
    risks: { r1: risk() },
    equipments: withEq(
      eq({ id: 'e1', name: 'Presse', riskId: 'r1', stoppedSince: '2026-09-24T22:00', inspections: [insp('2026-09-22', ok3)], anomalies: [
        an({ id: 'd1', label: 'Câble', severity: 'danger', date: '2026-09-23' }), an({ id: 'd2', label: 'Porte', severity: 'danger', date: '2026-09-24', dueAt: '2026-09-30' }),
        an({ id: 'a3', label: 'Bruit', date: '2026-09-20' }), an({ id: 'a4', label: 'Jeu', date: '2026-09-18', handler: 'Bruno', dueAt: '2026-09-22' }),
      ] }),
      eq({ id: 'e2', name: 'Four', stoppedSince: '2026-09-25T04:00', inspections: [insp('2026-09-22', ok3)] }),
    ),
  });
  it('dates a danger the day it was reported (or its own due date), a stop and a stop beyond the Plan B the day the stop began; a plain anomaly keeps none', () => {
    const s = urgent();
    expect(routineTodos(s, now).map(t => [t.id, t.due])).toEqual([
      ['danger:d1', '2026-09-23'], ['danger:d2', '2026-09-30'], ['anomaly:a3', ''], ['anomaly:a4', '2026-09-22'],
      ['stopped:e1', '2026-09-24'], ['plan-b:e1', '2026-09-24'], ['stopped:e2', '2026-09-25'],
    ]);
  });
  it('gives each task a fact: the same thing as the text, said as a statement and never as an order', () => {
    const ts = routineTodos(urgent(), now), fact = (id: string) => ts.find(t => t.id === id)!.fact;
    expect(fact('danger:d1')).toBe('Danger signalé le 23/09/2026 : Câble');
    expect(fact('anomaly:a3')).toBe('Anomalie ouverte : Bruit, depuis le 20/09/2026');
    expect(fact('anomaly:a4')).toBe('Anomalie ouverte : Jeu, depuis le 18/09/2026, prise en charge par Bruno, échéance dépassée depuis le 22/09/2026');
    expect(fact('stopped:e1')).toBe("À l'arrêt depuis 12 h");
    expect(fact('plan-b:e1')).toBe('Arrêt de 12 h, arrêt toléré de 4 h (Plan B « Casse broche »)');
    expect(fact('stopped:e2')).toBe("À l'arrêt depuis 6 h");
    expect(ts.every(t => typeof t.fact === 'string' && t.fact !== t.text)).toBe(true);
    const waiting = routineTodos(st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)], anomalies: [an({ waitingFor: 'Joint', date: '2026-09-21' }), an({ id: 'a2', repairedAt: '2026-09-24', date: '2026-09-19' })] })) }), now);
    expect(waiting.map(t => t.fact)).toEqual(['Anomalie ouverte : Fuite, depuis le 21/09/2026, en attente : Joint', 'Anomalie ouverte : Fuite, depuis le 19/09/2026, réparée le 24/09/2026, à vérifier']);
  });
  it('says the routine as a fact: first, to do, or missed (that word is for the late one only)', () => {
    const s = st({ equipments: withEq(eq({ id: 'new', name: 'Neuf' }), eq({ id: 'due', inspections: [insp('2026-09-16', ok3)] }), eq({ id: 'late', inspections: [insp('2026-09-01', ok3)] })) });
    const by = Object.fromEntries(routineTodos(s, now).map(t => [t.eqId, t]));
    expect([by.new.fact, by.due.fact, by.late.fact]).toEqual(['Première routine à faire', 'Routine à faire (dernière le 16/09/2026)', 'Routine manquée (dernière le 01/09/2026)']);
    expect([by.new.tone, by.due.tone, by.late.tone]).toEqual(['warn', 'warn', 'warn']);   // amber everywhere: a new equipment, a routine to do, a routine missed
  });
  it('counts an open anomaly that is a danger among the open ones, even when it is the only one', () => {
    const s = st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3)], anomalies: [an({ severity: 'danger', label: 'Câble' })] })) });
    expect(routineFacts(s, now).map(i => [i.key, i.text])).toEqual([['danger', 'Presse plieuse : Câble (depuis le 20/09/2026).'], ['anomalies', '1 anomalie ouverte, dont 1 danger.']]);
  });
  it('says no 0 min for a Plan B that tolerates no stop, and no 16,0 h: an exact number of hours has no decimal, a half hour has one', () => {
    const imm = st({ risks: { r1: risk({ maxOutage: { value: 0, unit: 'h' } }), r2: risk({ id: 'r2', title: 'Panne four', maxOutage: { value: 24, unit: 'h' } }) }, equipments: withEq(eq({ riskId: 'r1', stoppedSince: '2026-09-25T05:00' }), eq({ id: 'e2', name: 'Four', riskId: 'r2', stoppedSince: '2026-09-24T08:00' })) });
    expect(routineTodos(imm, now).filter(t => t.kind === 'plan-b').map(t => t.fact)).toEqual(['Arrêt de 5 h, arrêt toléré : immédiat (Plan B « Casse broche »)', 'Arrêt de 26 h, arrêt toléré de 24 h (Plan B « Panne four »)']);
    expect(routineTodos(imm, now).find(t => t.id === 'plan-b:e1')!.text).toBe("Presse plieuse à l'arrêt depuis 5 h, arrêt toléré : immédiat dans le Plan B « Casse broche »");
    expect(routineFacts(imm, now).find(i => i.key === 'plan-b-over')!.text).toBe("Four : à l'arrêt depuis 26 h, arrêt toléré de 24 h (Panne four), Presse plieuse : à l'arrêt depuis 5 h, arrêt toléré : immédiat (Casse broche).");   // the longest stop first
    const half = eq({ breakdowns: [bd({ id: 'a', date: '2026-07-10', hours: 16 }), bd({ id: 'b', date: '2026-08-10', hours: 8.5 })] });
    expect(routineFacts(st({ equipments: withEq(half) }), now).find(i => i.key === 'breakdowns')!.text).toBe("Presse plieuse : 2 pannes, 24,5 h d'arrêt, en moyenne tous les 31 jours.");
    expect(routineFacts(st({ equipments: withEq(eq({ breakdowns: [bd({ hours: 16 })] })) }), now).find(i => i.key === 'breakdowns')!.text).toBe("Presse plieuse : 1 panne, 16 h d'arrêt.");
  });
});

describe('3.3 lot 1: one order of the tasks, for the status of a card and for the sentence under it', () => {
  const KINDS = ['danger', 'stopped', 'plan-b', 'out', 'order-late', 'order', 'expiry', 'anomaly', 'check', 'remark', 'contract', 'routine', 'count', 'key'] as const;
  it('ranks every kind of task, the most serious first', () => {
    expect(Object.entries(TASK_RANK).sort((a, b) => a[1] - b[1]).map(x => x[0])).toEqual([...KINDS]);
    expect(new Set(Object.values(TASK_RANK)).size).toBe(14);
  });
  it('names, for any two tasks of an equipment, the higher one (red before amber, then the rank): the status and the first sentence of the card agree', () => {
    const tones = ['bad', 'warn'] as const, tasks = KINDS.flatMap(kind => tones.map(tone => todo({ kind, tone, id: `${kind}-${tone}` })));
    const higher = (a: MaintTodo, b: MaintTodo) => (a.tone !== b.tone ? (a.tone === 'bad' ? a : b) : TASK_RANK[a.kind] <= TASK_RANK[b.kind] ? a : b);
    let pairs = 0;
    for (const a of tasks) for (const b of tasks) {
      if (a === b) continue;
      const top = higher(a, b), lv = eqLevel(eq(), [a, b]);
      expect(lv, `${a.id} / ${b.id}`).toEqual(eqLevel(eq(), [top]));
      expect(eqTasks([a, b], 'e1')[0].id, `${a.id} / ${b.id}`).toBe(top.id);
      pairs++;
    }
    expect(pairs).toBe(28 * 27);
    expect(tasks.sort(byUrgency)[0].id).toBe('danger-bad');
  });
  it('words the status of each kind of task', () => {
    const label = (kind: MaintTodo['kind']) => eqLevel(eq(), [todo({ kind, tone: 'bad' })]);
    expect(Object.fromEntries(KINDS.map(k => [k, label(k).label]))).toEqual({
      danger: 'Danger', stopped: "À l'arrêt", 'plan-b': "À l'arrêt", out: 'À suivre', 'order-late': 'À suivre', order: 'À suivre', expiry: 'À suivre', anomaly: 'Anomalie', check: 'Contrôle',
      remark: 'Observation à lever', contract: 'Contrat', routine: 'Routine à faire', count: 'À suivre', key: 'À suivre',
    });
    expect(KINDS.every(k => label(k).level === 'alert' && (k === 'danger' || eqLevel(eq(), [todo({ kind: k, tone: 'warn' })]).level === 'warn'))).toBe(true);   // a danger is always red
    expect(eqLevel(eq(), [todo({ kind: 'routine', tone: 'bad' }), todo({ kind: 'contract', tone: 'bad' })]).label).toBe('Contrat');   // the contract ranks above the routine, as in the queue
  });
});

describe('3.3 lot 1: who, and the days of absence', () => {
  const people = { a: person('a', 'Alice', [{ from: '2026-09-24', to: '2026-09-26' }]), b: person('b', 'Bruno'), c: { ...person('c', 'Chloé'), active: false }, d: person('d', 'Dan', [{ from: '2026-09-25', to: '2026-09-25' }]) };
  const late = (over: Partial<ReturnType<typeof newCheck>> = {}) => ({ ...newCheck('Extincteurs'), lastDone: '2024-01-01', ...over });
  const s = st({
    people,
    equipments: withEq(
      eq({ id: 'ea', name: 'A', operator: 'Alice', deputy: 'Bruno', manager: 'Marc', anomalies: [an({ id: 'x1', handler: 'Alice' }), an({ id: 'x2', label: 'Jeu' })] }),
      eq({ id: 'eb', name: 'B', operator: 'Alice', deputy: '' }),
      eq({ id: 'ec', name: 'C', operator: 'Chloé', deputy: 'Bruno' }),
      eq({ id: 'ed', name: 'D', operator: 'Alice', deputy: 'Dan' }),
      eq({ id: 'ee', name: 'E', operator: 'Chloé', deputy: '' }),
      eq({ id: 'ef', name: 'F', operator: 'Eve', deputy: 'Bruno', manager: 'Marc', tasks: [late({ id: 'tk1', by: 'internal', who: 'Alice' }), late({ id: 'tk2', by: 'provider', who: 'Alice' })] }),
    ),
  });
  const todos = maintTodos(s, now), find = (eqId: string, kind: string, ref?: string) => todos.find(t => t.eqId === eqId && t.kind === kind && (!ref || t.ref === ref))!;
  it('hands a task to the deputy of the equipment when the person planned is on leave', () => {
    expect([find('ea', 'routine').who, find('ea', 'anomaly', 'x1').who, find('ea', 'anomaly', 'x2').who]).toEqual(['Bruno', 'Bruno', 'Marc']);   // the one who handles it, else the manager
    expect(find('ea', 'routine').fact).toBe('Première routine à faire');
  });
  it('does the same for a person who is no longer active', () => {
    expect(find('ec', 'routine')).toMatchObject({ who: 'Bruno', fact: 'Première routine à faire' });
  });
  it('keeps the task with the person, and says so, when there is no deputy or the deputy is away too', () => {
    expect([find('eb', 'routine').who, find('eb', 'routine').fact]).toEqual(['Alice', 'Première routine à faire (absent, sans suppléant)']);
    expect([find('ed', 'routine').who, find('ed', 'routine').fact]).toEqual(['Alice', 'Première routine à faire (absent, sans suppléant)']);
    expect([find('ee', 'routine').who, find('ee', 'routine').fact]).toEqual(['Chloé', 'Première routine à faire (absent, sans suppléant)']);
  });
  it('gives a check done by the company to the person typed on it, else to the manager; a person who is there keeps it', () => {
    expect(find('ef', 'check', 'tk1').who).toBe('Bruno');   // typed: Alice, on leave, so the deputy
    expect(find('ef', 'check', 'tk2').who).toBe('Marc');   // done by a provider: the manager
    expect(find('ef', 'routine').who).toBe('Eve');
    expect(todos.every(t => typeof t.who === 'string')).toBe(true);
  });
  it('lets an equipment without manager through: its tasks have an empty name, and the tasks of everyone are worked out', () => {
    const e = eq({ id: 'ex', operator: '', deputy: '', anomalies: [an()] }) as Partial<Equipment>;
    delete e.manager;
    const ts = maintTodos(st({ equipments: { ex: e as Equipment } }), now);
    expect(ts.map(t => [t.kind, t.who])).toEqual([['anomaly', ''], ['routine', '']]);
  });
  it('is one rule: taskOwner and routineOwner give the same answers', () => {
    const o = (planned: string, deputy: string) => taskOwner(st({ people }), { deputy }, planned, '2026-09-25');
    expect(o('Alice', 'Bruno')).toEqual({ who: 'Bruno', absent: true, deputy: true });
    expect(o('Alice', 'Dan')).toEqual({ who: 'Alice', absent: true, deputy: false });
    expect(o('Alice', 'alice')).toEqual({ who: 'Alice', absent: true, deputy: false });   // the same person is no deputy
    expect(o('Chloé', 'Bruno')).toEqual({ who: 'Bruno', absent: true, deputy: true });
    expect(o('Bruno', 'Dan')).toEqual({ who: 'Bruno', absent: false, deputy: false });
    expect(o('', 'Bruno')).toEqual({ who: '', absent: false, deputy: false });
    expect(routineOwner(st({ people }), eq({ operator: 'Chloé', deputy: 'Bruno' }), '2026-09-25')).toEqual({ who: 'Bruno', absent: true, deputy: true });
    expect(routineOwner(st({ people }), eq({ operator: 'Alice', deputy: 'Bruno' }), '2026-09-27')).toEqual({ who: 'Alice', absent: false, deputy: false });
  });
});

describe('3.3 lot 1: a stop in progress counts its hours', () => {
  it('counts the hours since the stop began, up to now, in the figures of 12 months; the hours written win; a closed breakdown without hours is 0', () => {
    const e = stopEquipment(eq({ breakdowns: [bd({ id: 'a', date: '2026-07-10', hours: 2.5 })] }), 'A', '2026-09-25T05:00');
    expect(downtime(e, now)).toEqual({ count: 2, hours: 7.5, cost: 0, between: 77 });
    expect(breakdownHours(e.breakdowns![1], now)).toBe(5);
    expect(breakdownHours(e.breakdowns![1], new Date(2026, 8, 25, 5, 30))).toBe(0.5);
    expect(breakdownHours({ ...e.breakdowns![1], hours: 3 }, now)).toBe(3);
    expect(breakdownHours(bd({ hours: null }), now)).toBe(0);
    expect(breakdownHours({ ...e.breakdowns![1], startedAt: '2026-09-26T05:00' }, now)).toBe(0);   // never negative
  });
  it('says 5 h of stop in the breakdowns fact next to the stop of 5 h: no "0 h" beside "à l\'arrêt depuis 5 h"', () => {
    const s = st({ equipments: withEq(stopEquipment(eq(), 'A', '2026-09-25T05:00')) });
    const f = Object.fromEntries(routineFacts(s, now).map(i => [i.key, i.text]));
    expect(f.stopped).toBe('Presse plieuse depuis 5 h.');
    expect(f.breakdowns).toBe("Presse plieuse : 1 panne, 5 h d'arrêt.");
  });
  it('ignores a number that is not one', () => {
    expect(downtime(eq({ breakdowns: [bd({ hours: NaN, cost: NaN }), bd({ id: 'b', hours: 2, cost: 100 })] }), now)).toMatchObject({ count: 2, hours: 2, cost: 100 });
  });
});

describe('3.3 lot 1: new equipment, bottleneck, dates of a routine, equipment at a stop', () => {
  it('colours a first routine amber in the state, the task and the card', () => {
    expect(INSPECTION_STATE.never).toEqual({ label: 'Première routine à faire', tone: 'warn' });
    const s = st({ equipments: withEq(eq()) }), t = routineTodos(s, now);
    expect(t[0]).toMatchObject({ tone: 'warn', fact: 'Première routine à faire' });
    expect(eqLevel(eq(), t)).toEqual({ level: 'warn', label: 'Routine à faire' });
  });
  it('is a bottleneck by the kind of equipment unless the company ticked it', () => {
    const k = (kind: Equipment['kind'], bottleneck?: boolean) => isBottleneck(eq({ kind, ...(bottleneck === undefined ? {} : { bottleneck }) }));
    expect(['machine', 'vehicle', 'installation', 'it', 'instrument', 'other'].map(x => k(x as Equipment['kind']))).toEqual([true, true, true, false, false, false]);
    expect(isBottleneck({ ...eq(), kind: undefined })).toBe(true);
    expect([k('it', true), k('machine', false)]).toEqual([true, false]);
  });
  it('cites, for "sans Plan B", the equipment whose stop blocks the activity only, and does not say "goulet"', () => {
    const s = st({ risks: { r1: risk() }, equipments: withEq(
      eq({ id: 'a', name: 'Presse', inspections: [insp('2026-09-22', ok3)] }), eq({ id: 'b', name: 'Serveur', kind: 'it', inspections: [insp('2026-09-22', ok3)] }),
      eq({ id: 'c', name: 'Pied à coulisse', kind: 'instrument', inspections: [insp('2026-09-22', ok3)] }), eq({ id: 'd', name: 'Four', riskId: 'r1', inspections: [insp('2026-09-22', ok3)] }),
    ) });
    expect(routineFacts(s, now).find(i => i.key === 'no-plan-b')!.text).toBe("Presse : équipement dont l'arrêt bloque l'activité, non relié à un risque de l'outil 1.2.");
    const two = { ...s, equipments: { ...s.equipments, e: eq({ id: 'e', name: 'Chariot', kind: 'vehicle', inspections: [insp('2026-09-22', ok3)] }) } };
    expect(routineFacts(two, now).find(i => i.key === 'no-plan-b')!.text).toBe("Presse, Chariot : équipements dont l'arrêt bloque l'activité, non reliés à un risque de l'outil 1.2.");
    expect(JSON.stringify(routineFacts(two, now))).not.toMatch(/goulet/i);
  });
  it('takes a routine dated after tomorrow back to today and says so; tomorrow is left alone; an unreadable date is refused', () => {
    const run = (date: string, at?: string) => recordInspection(eq(), insp(date, ok3, { note: 'RAS', ...(at ? { at } : {}) }), now).inspections[0];
    expect(run('2026-09-27', '2026-09-27T08:15')).toMatchObject({ date: '2026-09-25', at: '2026-09-25T08:15', note: 'RAS · Date notée 27/09/2026, ramenée au jour même' });
    expect(run('2026-09-26')).toMatchObject({ date: '2026-09-26', note: 'RAS' });   // tomorrow: a clock a little ahead
    expect(run('2026-09-25')).toMatchObject({ date: '2026-09-25', note: 'RAS' });
    expect(recordInspection(eq(), insp('2027-03-01', ok3), now).inspections[0]).toMatchObject({ date: '2026-09-25', note: 'Date notée 01/03/2027, ramenée au jour même' });
    const e = eq({ inspections: [insp('2026-09-22', ok3)] });
    expect(recordInspection(e, insp('hier', ok3), now)).toBe(e);
    expect(recordInspection(e, insp('', ok3), now)).toBe(e);
    // the future routine no longer hides the real state: made today, the equipment is done for the week and the last routine is today
    const out = recordInspection(eq(), insp('2026-09-29', ok3), now);
    expect(inspectionState(out, now, P)).toBe('ok');
    expect(lastInspection(out)?.date).toBe('2026-09-25');
  });
  it('does not close with an old routine an anomaly opened after it', () => {
    const e = eq({ anomalies: [an({ id: 'a1', pointId: 'p1', date: '2026-09-10' }), an({ id: 'a2', pointId: 'p2', date: '2026-09-20' }), an({ id: 'a3', pointId: 'p3', date: '2026-09-18' })] });
    const out = recordInspection(e, insp('2026-09-18', ok3), now);
    expect(out.anomalies!.map(a => [a.id, a.closedAt])).toEqual([['a1', '2026-09-18'], ['a2', ''], ['a3', '2026-09-18']]);   // the day itself closes, the day before does not
    expect(openAnomalies(recordInspection(out, insp('2026-09-21', ok3), now)).length).toBe(0);
  });
  it('counts a routine of a day off for the last working day, with a daily rhythm', () => {
    const e = eq({ routine: { every: 'day' }, inspections: [insp('2026-09-26', ok3)] });   // a Saturday
    expect(inspectionState(e, new Date(2026, 8, 26, 10), P)).toBe('ok');
    expect(inspectionState(e, new Date(2026, 8, 28, 10), P)).toBe('due');   // Monday: the Friday (and its Saturday) is done
    expect(strip(e, new Date(2026, 8, 26, 10), P, 2).map(x => [x.from, x.state])).toEqual([['2026-09-24', 'none'], ['2026-09-25', 'ok']]);
    expect(inspectionState(eq({ routine: { every: 'day' }, inspections: [insp('2026-09-26', ok3)] }), new Date(2026, 8, 29, 10), P)).toBe('late');   // Tuesday: Monday missed
    const week = eq({ inspections: [insp('2026-09-26', ok3)] });
    expect(inspectionState(week, new Date(2026, 8, 26, 10), P)).toBe('ok');   // the other rhythms are unchanged
  });
  it('refuses the routine of a stopped equipment with a fact, and the report of a problem on a retired one', () => {
    expect(ROUTINE_ON_STOP).toBe("L'équipement est à l'arrêt : la routine reprend à la remise en marche.");
    expect(inspectionState(eq({ stoppedSince: '2026-09-25T08:00' }), now, P)).toBe('paused');
    expect(reportRefusal(eq({ retiredAt: '2026-09-01' }))).toBe('Équipement retiré le 01/09/2026 : un problème se signale sur un équipement en service.');
    expect([reportRefusal(eq()), reportRefusal(eq({ stoppedSince: '2026-09-25T08:00' }))]).toEqual(['', '']);
  });
});

describe('3.3 lot 1: the routine rate counts what was due', () => {
  const week = (back: number) => isoDate(new Date(2026, 8, 21 - 7 * back));   // Monday of the week `back` weeks before the one in progress (21/09)
  const weekly = (backs: number[]) => backs.map(b => insp(week(b), ok3));
  const range = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i);
  it('leaves out the week in progress: 12 perfect weeks and the week not made yet is 100 %', () => {
    expect(routineRate(eq({ inspections: weekly(range(1, 12)) }), now, P)).toBe(100);
    expect(routineRate(eq({ inspections: weekly(range(0, 12)) }), now, P)).toBe(100);
  });
  it('leaves out the week in progress up to its last day: on the Sunday it is not over yet, on the Monday it is', () => {
    const e = eq({ inspections: weekly(range(1, 12)) });
    expect(routineRate(e, new Date(2026, 8, 27, 18, 0), P)).toBe(100);   // Sunday 27/09: the week of 21/09 is still going
    expect(routineRate(e, new Date(2026, 8, 28, 8, 0), P)).toBe(92);   // Monday: it ended without a routine, 11 of the last 12
  });
  it('counts from the first routine: a new equipment is not a failure', () => {
    expect(routineRate(eq({ inspections: weekly([1]) }), now, P)).toBe(100);
    expect(routineRate(eq({ inspections: weekly([2]) }), now, P)).toBe(50);   // 14/09 week missed
    expect(routineRate(eq({ inspections: weekly([3, 1]) }), now, P)).toBe(67);   // 3 weeks, 2 made
    expect(routineRate(eq(), now, P)).toBeNull();
    expect(routineRate(eq({ inspections: weekly([0]) }), now, P)).toBeNull();   // only the week in progress: nothing was due yet
  });
  it('looks at 12 periods back, no further, both sides of the edge', () => {
    expect(routineRate(eq({ inspections: weekly([...range(1, 11), ...range(13, 19)]) }), now, P)).toBe(92);   // the 12th week back is missed: 11 of 12
    expect(routineRate(eq({ inspections: weekly([...range(1, 12), ...range(14, 19)]) }), now, P)).toBe(100);   // the 13th is out of the window
    expect(routineRate(eq({ inspections: weekly([...range(1, 9), ...range(11, 19)]) }), now, P)).toBe(92);   // the 10th week back is missed and inside
  });
  it('leaves out the periods that cover a stop, and the equipment restarted is not late', () => {
    let e = eq({ inspections: weekly([5, 4, 3, 2]) });   // 17/08 … 07/09
    e = stopEquipment(e, 'A', '2026-09-09T08:00');
    e = restartEquipment(e, '2026-09-21T08:00');
    expect(e.breakdowns![0].hours).toBe(288);
    expect(routineRate(e, new Date(2026, 8, 21, 9, 0), P)).toBe(100);   // 14/09 and 07/09 weeks overlap the stop: 3 of 3
    expect(inspectionState(e, new Date(2026, 8, 21, 9, 0), P)).toBe('due');   // not "late": the week before was a stop
    const m = routineTodos(st({ equipments: withEq(e) }), new Date(2026, 8, 21, 9, 0));
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ tone: 'warn', fact: 'Routine à faire (dernière le 07/09/2026)' });
    // a week really missed after the restart is late again
    expect(inspectionState(e, new Date(2026, 9, 6, 9, 0), P)).toBe('late');   // 05/10 week: the one before (28/09 to 04/10) had no stop and no routine
    // a stop still going leaves its weeks out too
    expect(routineRate(stopEquipment(eq({ inspections: weekly([4, 3, 2]) }), 'A', '2026-09-10T08:00'), now, P)).toBe(100);
  });
  it('leaves out the periods that reach the retirement', () => {
    const e = eq({ inspections: weekly(range(3, 8)) });
    expect(routineRate({ ...e, retiredAt: '2026-09-10' }, now, P)).toBe(100);   // 07/09 week (to 13/09) and the ones after are left out
    expect(routineRate(e, now, P)).toBe(75);   // not retired: 14/09 and 07/09 weeks missed, 6 of 8
  });
});

describe('3.3 lot 1: copies keep their checks dated, instruction line, entries that are not numbers', () => {
  it('gives each copied check a first due date: the next one of the source, or its first date; none when the source has none', () => {
    const done = { ...newCheck('Extincteurs', { value: 1, unit: 'an' }, true), id: 'tk_done', lastDone: '2026-01-01', first: '2026-06-01' };
    const never = { ...newCheck('Levage', { value: 6, unit: 'mois' }), id: 'tk_never', first: '2026-12-01' };
    const bare = { ...newCheck('Sans date'), id: 'tk_bare' };
    const withLife = { ...newCheck('Électricité', { value: 3, unit: 'mois' }), id: 'tk_life' };
    const src = eq({ tasks: [done, never, bare, withLife], checkLife: { tk_life: { history: [{ date: '2026-08-15', by: 'X', result: 'ok', note: '' }] } } });
    const copy = duplicateEquipment(src);
    expect(copy.tasks!.map(t => [t.label, t.first, t.lastDone])).toEqual([['Extincteurs', '2027-01-01', ''], ['Levage', '2026-12-01', ''], ['Sans date', undefined, ''], ['Électricité', '2026-11-15', '']]);
    expect(copy.tasks![2]).not.toHaveProperty('first');
    expect(copy.tasks!.map(t => nextDue(copy, t))).toEqual(['2027-01-01', '2026-12-01', '', '2026-11-15']);   // the copy has dates to go by
    expect(copy.tasks!.map(t => checkState(copy, t, now))).toEqual(['ok', 'ok', 'nodate', 'ok']);
    expect(src.tasks![0].first).toBe('2026-06-01');   // the source is not touched
  });
  it('tells what the instruction line says of the sheet: posted or not when in force, to validate or draft when it is not', () => {
    const base = { ...newSop('P3', now), id: 's1', poste: 'Presse plieuse', version: 3, versionDate: '2026-09-01', validatedBy: 'D' };
    const line = (over: Partial<typeof base>) => { const l = sopLine(st({ sops: { s1: { ...base, ...over } } }), eq({ sopId: 's1' }), now); return l && [l.shown, l.displayed]; };
    expect(line({ phase: 'active', displayedAt: '2026-09-02' })).toEqual(['affichée', true]);
    expect(line({ phase: 'active' })).toEqual(['non affichée', false]);
    expect(line({ phase: 'active', displayedAt: '2026-08-01' })).toEqual(['non affichée', false]);   // an old sheet is posted, not this one
    expect(line({ phase: 'review' })).toEqual(['fiche à valider', false]);
    expect(line({ phase: 'draft' })).toEqual(['brouillon', false]);
    expect(line({ phase: 'archived' })).toBeNull();
    expect(sopLine(st(), eq({ sopId: 'constructor' }), now)).toBeNull();   // an id that names nothing, or a trapped one
  });
  it('states a holder who is not among the people allowed on the sheet in force, and says nothing for a sheet not yet in force', () => {
    const sop = (phase: 'active' | 'review') => ({ ...newSop('P3', now), id: 's1', poste: 'Presse', phase, version: 3, versionDate: '2026-09-01', validatedBy: 'D', displayedAt: '2026-09-02',
      habilitations: [{ person: 'Alice', tutor: '', date: '2026-09-02', stage: 'alone' as const }] });
    const facts = (phase: 'active' | 'review', operator: string) => routineFacts(st({ sops: { s1: sop(phase) }, equipments: withEq(eq({ sopId: 's1', operator, inspections: [insp('2026-09-22', ok3)] })) }), now);
    expect(facts('active', 'Eve')).toEqual([{ key: 'holder-not-habilitated', tone: 'warn', title: 'Titulaire non habilité', text: 'Presse plieuse (Eve, instruction V03).' }]);
    expect(facts('active', 'Alice')).toEqual([]);
    expect(facts('active', '')).toEqual([]);
    expect(facts('review', 'Eve')).toEqual([]);
  });
  it('lets a number that is not one, a rhythm or an identifier that names nothing through', () => {
    expect(maintCfg({ ...P, maint: { routineDay: NaN, soonDays: Infinity, countDays: NaN } })).toMatchObject({ routineDay: 1, soonDays: 30, countDays: 30 });
    expect(maintCfg({ ...P, maint: { routineDay: 3, soonDays: 0, countDays: 14 } })).toMatchObject({ routineDay: 3, soonDays: 0, countDays: 14 });
    expect(routineOf(eq({ routine: { every: 'week', day: NaN } }), P)).toEqual({ every: 'week', day: 1 });
    expect(routineOf(eq({ routine: { every: 'yearly' as 'week', day: 4 } }), P)).toEqual({ every: 'week', day: 4 });
    expect(periodOf(eq({ routine: { every: 'week', day: NaN } }), now, P)).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    const trapped = st({ risks: { r1: risk() }, equipments: withEq(eq({ riskId: 'constructor', sopId: '__proto__', stoppedSince: '2026-09-24T08:00' })) });
    expect(planBExceeded(trapped, trapped.equipments.e1, now)).toBeNull();
    expect(() => { routineFacts(trapped, now); routineTodos(trapped, now); }).not.toThrow();
    expect(routineFacts(trapped, now).find(i => i.key === 'no-plan-b')?.text).toContain('Presse plieuse');   // no risk by that name: no Plan B
    expect(routineTodos(st({ equipments: withEq(eq({ inspections: [insp('2026-09-22', ok3, { values: [NaN, null, null] })] })) }), now)).toEqual([]);
  });
});

describe('3.3 damaged records are read, never fatal (V-06)', () => {
  // an empty slot, a text, a number, a list in a list: none of them is a record
  const junk = (): unknown[] => [null, undefined, 'x', 42, true, [], [1]];
  const clean = () => eq({
    inspections: [insp('2026-09-22', ok3, { id: 'i1', at: '2026-09-22T08:00' }), insp('2026-09-15', ['ok', 'watch', 'ok'], { id: 'i0', at: '2026-09-15T08:00' })],
    anomalies: [an({ id: 'a1' }), an({ id: 'a2', label: 'Câble', severity: 'danger', date: '2026-09-23', pointId: 'p2' }), an({ id: 'a3', closedAt: '2026-09-21', pointId: 'p1' })],
    breakdowns: [bd({ id: 'b1', cause: 'Usure normale' }), bd({ id: 'b2', date: '2026-09-24', hours: null, startedAt: '2026-09-24T08:00' }), bd({ id: 'b3', date: '2026-08-01', cause: 'Usure normale' })],
    contacts: [{ id: 'h1', role: 'Service après-vente', name: 'SAV' }], stoppedSince: '2026-09-24T08:00',
  });
  const dirty = () => { const c = clean(); return { ...c, inspections: [...junk(), ...c.inspections], anomalies: [...junk(), ...c.anomalies!], breakdowns: [...c.breakdowns!, ...junk()], contacts: [...junk(), ...c.contacts!] } as unknown as Equipment; };
  const reads = (e: Equipment) => [
    inspectionState(e, now, P), lastInspection(e), routineRate(e, now, P), strip(e, now, P), openAnomalies(e), repeatedPoints(e, now), openBreakdown(e), downtime(e, now), repeatedCauses(e, now),
    canDelete(e), lostByDeleting(e), completeness(e), helpersOf(e), eqStatus(e), watchPoints(e), lastInspection(e) ? resultOf(e, lastInspection(e)!, 1) : null,
    routineTodos(st({ equipments: withEq(e) }), now), routineFacts(st({ equipments: withEq(e) }), now), maintTodos(st({ equipments: withEq(e) }), now),
  ];

  it('reads a list as the list of its records: an empty slot, a text, a number are left out', () => {
    expect(recs([{ a: 1 }, null, undefined, 'x', 5, true, [], [1], { b: 2 }])).toEqual([{ a: 1 }, { b: 2 }]);
    for (const x of [undefined, null, 'x', 5, {}, { 0: { a: 1 } }]) expect(recs(x as unknown as unknown[])).toEqual([]);
    const l = [{ a: 1 }];
    expect(recs(l)).toEqual(l);
  });
  it('gives the same answers with junk among the routines, anomalies, breakdowns and contacts as without', () => {
    expect(reads(dirty())).toEqual(reads(clean()));
    expect(reads(dirty())[4]).toHaveLength(2);   // the two open anomalies of the fixture are still seen, by their facts
    expect(reads(dirty())[7]).toMatchObject({ count: 3 });
  });
  it('reads a list that is not a list as an empty list', () => {
    const empty = eq({ anomalies: [], breakdowns: [], inspections: [] });
    for (const bad of ['x', 42, {}, null, { 0: { id: 'a1' } }]) {
      const e = { ...empty, anomalies: bad, breakdowns: bad, inspections: bad, contacts: bad, checkpoints: bad } as unknown as Equipment;
      expect(() => reads(e)).not.toThrow();
      expect(reads({ ...e, checkpoints: pts(3), contacts: [] })).toEqual(reads({ ...empty, anomalies: undefined, checkpoints: pts(3), contacts: [] }));
    }
    expect(() => reads({ ...eq(), checkpoints: [null, { id: 'p2' }, 'x'] } as unknown as Equipment)).not.toThrow();
    expect(completeness({ ...eq(), contract: { until: '2026-12-01' } } as unknown as Equipment).missing.map(m => m.key)).toContain('checks');   // a contract without provider is no contract
    expect(completeness({ ...eq(), checkpoints: [{ id: 'p1' }, { id: 'p2', label: null }, { id: 'p3', label: 'Niveau' }] } as unknown as Equipment).missing.map(m => m.key)).toContain('points');
  });
  it('writes the equipment back without the junk, and the moves still work on a damaged equipment', () => {
    const d = dirty(), first = recordInspection(d, { date: '2026-09-25', at: '2026-09-25T09:00', by: 'Alice', note: '', results: ok3 }, now);
    expect(first.inspections).toHaveLength(3);
    expect(first.inspections.every(i => i && typeof i === 'object')).toBe(true);
    expect(removeInspection(d, 'i1').inspections.map(i => i.id)).toEqual(['i0']);
    expect(removeBreakdown(d, 'b2').breakdowns!.map(b => b.id)).toEqual(['b1', 'b3']);
    expect(removeBreakdown(d, 'b2').stoppedSince).toBeUndefined();
    expect(removeAnomaly(d, 'a1').anomalies!.map(a => a.id)).toEqual(['a2', 'a3']);
    expect(restartEquipment(d, '2026-09-24T12:00').breakdowns!.find(b => b.id === 'b2')).toMatchObject({ endedAt: '2026-09-24T12:00', hours: 4 });
    expect(reportAnomaly(d, { label: 'Bruit', severity: 'degraded', by: 'Bob' }, '2026-09-25T09:00').anomalies).toHaveLength(4);
    expect(compactInspections({ ...d, inspections: [...junk(), insp('2020-01-01', ok3), insp('2026-09-22', ok3)] as Inspection[] }, now).inspections.map(i => i.date)).toEqual(['2020-01-01', '2026-09-22']);
    expect(stopEquipment({ ...d, stoppedSince: undefined, breakdowns: junk() as Breakdown[] }, 'A', '2026-09-25T10:00').breakdowns).toHaveLength(1);
  });
  it('lets no id that names nothing through: __proto__, constructor and the like', () => {
    const risks = { r1: risk() };
    for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      const e = eq({ riskId: id, sopId: id, stoppedSince: '2026-09-24T08:00', breakdowns: [bd({ id: 'b2', startedAt: '2026-09-24T08:00' })] });
      const s = st({ risks, equipments: withEq(e) });
      expect(planBExceeded(s, e, now)).toBeNull();
      expect(sopLine(s, e, now)).toBeNull();
      expect(routineFacts(s, now).find(i => i.key === 'plan-b-over')).toBeUndefined();
      expect(maintTodos(s, now).find(t => t.kind === 'plan-b')).toBeUndefined();
    }
  });
});

// ---- lot 0 ter (second verification): N-04, N-05, N-06, N-09, N-11
// now is Friday 25/09/2026: the current week is 21/09 to 27/09, the one before is 14/09 to 20/09 (168 hours, half is 84)
describe('3.3 a period is not due only when most of it was spent out of service (N-04)', () => {
  const base = (over: Partial<Equipment> = {}) => eq({ inspections: [insp('2026-09-02', ok3)], ...over });   // last routine in the week of 31/08: the weeks of 07/09 and 14/09 were missed
  const stop = (from: string, to: string, id = 'b1'): Partial<Equipment> => ({ breakdowns: [bd({ id, date: from.slice(0, 10), hours: null, startedAt: from, endedAt: to })] });
  const state = (e: Equipment) => inspectionState(e, now, P);
  it('is late with no stop: two weeks missed, one made in three', () => {
    expect(state(base())).toBe('late');
    expect(routineRate(base(), now, P)).toBe(33);
  });
  it('is still late after a stop of two hours in the week missed, with the same rate (it used to make it "à faire" and the rate 50)', () => {
    const e = base(stop('2026-09-16T09:00', '2026-09-16T11:00'));
    expect(state(e)).toBe('late');
    expect(routineRate(e, now, P)).toBe(33);
  });
  it('excuses the week at exactly half of it (84 hours), not a minute under', () => {
    const half = base(stop('2026-09-14T00:00', '2026-09-17T12:00')), under = base(stop('2026-09-14T00:00', '2026-09-17T11:59'));
    expect(state(half)).toBe('due');
    expect(routineRate(half, now, P)).toBe(50);   // the week of 14/09 is left out: one made of two
    expect(state(under)).toBe('late');
    expect(routineRate(under, now, P)).toBe(33);
    // a week at the end of a stop of several days counts the hours it holds: 14/09 00:00 is 84 hours before 17/09 12:00; 10/09 12:00 to 17/09 12:00 holds the same
    expect(state(base(stop('2026-09-10T12:00', '2026-09-17T12:00')))).toBe('due');
  });
  it('is late for a machine that stops one hour every week and was not inspected for three weeks, and its rate is not null', () => {
    const e = base({ breakdowns: [0, 1, 2, 3, 4].map(i => bd({ id: `w${i}`, date: isoDate(new Date(2026, 8, 2 + 7 * i)), hours: 1, startedAt: `${isoDate(new Date(2026, 8, 2 + 7 * i))}T09:00`, endedAt: `${isoDate(new Date(2026, 8, 2 + 7 * i))}T10:00` })) });
    expect(state(e)).toBe('late');
    expect(routineRate(e, now, P)).toBe(33);
  });
  it('counts overlapping stops once: two stops of 48 hours over the same hours do not make 96', () => {
    const e = base({ breakdowns: [bd({ id: 'a', hours: null, startedAt: '2026-09-14T00:00', endedAt: '2026-09-16T00:00' }), bd({ id: 'b', hours: null, startedAt: '2026-09-14T00:00', endedAt: '2026-09-16T00:00' })] });
    expect(state(e)).toBe('late');
    const wide = base({ breakdowns: [bd({ id: 'a', hours: null, startedAt: '2026-09-14T00:00', endedAt: '2026-09-16T00:00' }), bd({ id: 'b', hours: null, startedAt: '2026-09-15T12:00', endedAt: '2026-09-17T12:00' })] });
    expect(state(wide)).toBe('due');   // 14/09 00:00 to 17/09 12:00 together: 84 hours
    const reversed = base({ breakdowns: [bd({ id: 'b', hours: null, startedAt: '2026-09-15T12:00', endedAt: '2026-09-17T12:00' }), bd({ id: 'a', hours: null, startedAt: '2026-09-14T00:00', endedAt: '2026-09-16T00:00' })] });
    expect(state(reversed)).toBe('due');   // the order they are written in changes nothing
  });
  it('reads a stop that is only written as a stop (first versions, no breakdown) and one still going', () => {
    const e = base({ stoppedSince: '2026-09-14T00:00' });
    expect(routineRate(e, now, P)).toBe(50);   // stopped since the start of the week of 14/09, still: nothing is due since
    expect(state(e)).toBe('paused');
    expect(routineRate(base({ stoppedSince: '2026-09-17T13:00' }), now, P)).toBe(33);   // the stop holds 83 hours of the week of 14/09 and all of the next
  });
});

describe('3.3 an equipment put back in service after a retirement (N-05)', () => {
  const routines = Array.from({ length: 13 }, (_, i) => insp(isoDate(new Date(2026, 2, 2 + 7 * i)), ok3, { id: `r${i}` }));   // every Monday from 02/03 to 25/05
  const retired = () => eq({ operator: 'A', manager: 'M', inspections: routines, retiredAt: '2026-06-01', retiredNote: 'x' });
  const back = (e = retired(), at = '2026-09-28T09:00') => reinstateEquipment(e, at);
  const tuesday = new Date(2026, 8, 29, 10, 0), nextTuesday = new Date(2026, 9, 6, 10, 0);
  it('keeps the retirement as a pause, so that the weeks it lasted are not due', () => {
    expect(back().pauses).toEqual([{ from: '2026-06-01', to: '2026-09-28T09:00' }]);
    expect(inspectionState(back(), tuesday, P)).toBe('due');   // the weeks before the return were not due: the first one is to do, not late
    expect(routineRate(back(), tuesday, P)).toBe(100);         // the 12 weeks of March to May that were due were made
    const forgotten = { ...back(), pauses: undefined };         // without the pause (the data of before): late at once, and 0
    expect(inspectionState(forgotten, tuesday, P)).toBe('late');
    expect(routineRate(forgotten, tuesday, P)).toBe(0);
    expect(maintTodos(st({ equipments: withEq(back()) }), tuesday).map(t => [t.tone, t.fact])).toEqual([['warn', 'Routine à faire (dernière le 25/05/2026)']]);
  });
  it('is late a week after the return when the first routine was not made (the week of the return held most of its days)', () => {
    expect(inspectionState(back(), nextTuesday, P)).toBe('late');
    expect(routineRate(back(), nextTuesday, P)).toBe(92);   // 11 of 12: the week of the return (28/09, 9 hours of pause only) is due and missed
  });
  it('excuses a week on a pause of half of it or more, as for a stop, and counts a pause written as days to the end of its last day', () => {
    const e = (to: string) => eq({ inspections: [insp('2026-09-02', ok3)], pauses: [{ from: '2026-09-14', to }] });
    expect(inspectionState(e('2026-09-17'), now, P)).toBe('due');    // 14 to 17/09 included: 96 hours
    expect(inspectionState(e('2026-09-16'), now, P)).toBe('late');   // 72 hours
    expect(inspectionState(e('2026-09-17T11:59'), now, P)).toBe('late');
    expect(inspectionState(e('2026-09-17T12:00'), now, P)).toBe('due');
    // a pause and a stop over the same hours count once
    const both = eq({ inspections: [insp('2026-09-02', ok3)], pauses: [{ from: '2026-09-14', to: '2026-09-16T00:00' }], breakdowns: [bd({ hours: null, startedAt: '2026-09-14T00:00', endedAt: '2026-09-16T00:00' })] });
    expect(inspectionState(both, now, P)).toBe('late');
  });
  it('leaves a pause that is not a pause out (damaged data), without failing', () => {
    const e = eq({ inspections: [insp('2026-09-02', ok3)], pauses: [null, 'x', { from: 5, to: {} }, { from: '2026-09-14' }, { to: '2026-09-17' }, { from: '2026-09-20', to: '2026-09-14' }] } as unknown as Partial<Equipment>);
    expect(inspectionState(e, now, P)).toBe('late');
    expect(routineRate(e, now, P)).toBe(33);
  });
});

describe('3.3 one reading for what is not the right type (N-06)', () => {
  it('reads a text as itself and anything else as empty, a date as a day or a stamp', () => {
    expect([txt('a'), txt(''), txt(5), txt(null), txt(undefined), txt([]), txt({}), txt(['a']), txt(true)]).toEqual(['a', '', '', '', '', '', '', '', '']);
    expect([dateOf('2026-09-25'), dateOf('2026-09-25T08:00'), dateOf('25/09/2026'), dateOf('demain'), dateOf(20260925), dateOf(['2026-09-25']), dateOf(null)]).toEqual(['2026-09-25', '2026-09-25T08:00', '', '', '', '', '']);
  });
  it('gives the task and the card of a damaged record what the record without the field gives', () => {
    const clean = () => eq({ manager: 'Marc', anomalies: [an({ id: 'a1', date: '2026-09-20' })], stoppedSince: undefined });
    const same = (damaged: Partial<Equipment>, without: Partial<Equipment>) => {
      const [d, c] = [{ ...clean(), ...damaged }, { ...clean(), ...without }].map(e => st({ equipments: withEq(e) }));
      expect(maintTodos(d, now)).toEqual(maintTodos(c, now));
      expect(routineFacts(d, now)).toEqual(routineFacts(c, now));
    };
    const bad = [[], {}, 0, -1, true, null] as unknown[];
    for (const v of bad) {
      same({ deputy: v as string }, { deputy: undefined });
      same({ operator: v as string }, { operator: '' });
      same({ manager: v as string }, { manager: '' });
      same({ name: v as string }, { name: undefined as unknown as string });
      same({ stoppedSince: v as string }, { stoppedSince: undefined });
      same({ retiredAt: v as string }, { retiredAt: undefined });
      same({ anomalies: [an({ id: 'a1', date: '2026-09-20', handler: v as string })] }, { anomalies: [an({ id: 'a1', date: '2026-09-20' })] });
      same({ anomalies: [an({ id: 'a1', date: '2026-09-20', dueAt: v as string })] }, { anomalies: [an({ id: 'a1', date: '2026-09-20' })] });
      same({ anomalies: [an({ id: 'a1', date: '2026-09-20', waitingFor: v as string })] }, { anomalies: [an({ id: 'a1', date: '2026-09-20' })] });
      same({ breakdowns: [bd({ id: 'b1', date: '2026-09-10', cause: v as string }), bd({ id: 'b2', date: '2026-09-11', cause: 'Usure' })] }, { breakdowns: [bd({ id: 'b1', date: '2026-09-10', cause: '' }), bd({ id: 'b2', date: '2026-09-11', cause: 'Usure' })] });
      same({ inspections: [insp('2026-09-22', ok3, { by: v as string })] }, { inspections: [insp('2026-09-22', ok3, { by: undefined as unknown as string })] });
    }
  });
  it('does not let an equipment with a stop that is not a text become stopped, nor an unreadable cause repeat', () => {
    expect(eqStatus(eq({ stoppedSince: [] as unknown as string }))).toBe('service');
    expect(eqStatus(eq({ stoppedSince: {} as unknown as string, retiredAt: 5 as unknown as string }))).toBe('service');
    const e = eq({ breakdowns: [bd({ id: 'b1', cause: [] as unknown as string, date: '2026-09-01' }), bd({ id: 'b2', cause: [] as unknown as string, date: '2026-09-02' }), bd({ id: 'b3', cause: {} as unknown as string, date: {} as unknown as string })] });
    expect(repeatedCauses(e, now)).toEqual([]);
    expect(downtime(e, now)).toEqual({ count: 2, hours: 4, cost: 0, between: 1 });   // the breakdown with no readable date is not in the last 12 months
  });
  it('reads the stop of a breakdown by its two times as texts: a time that is not a text is no time', () => {
    const open = (b: Partial<Breakdown>) => openBreakdown(eq({ breakdowns: [bd({ id: 'x', hours: null, ...b })] }))?.id;
    expect(open({ startedAt: '2026-09-24T08:00', endedAt: [] as never })).toBe('x');   // an end that is not a text: still going
    expect(open({ startedAt: '2026-09-24T08:00', endedAt: '2026-09-24T09:00' })).toBeUndefined();
    expect(open({ startedAt: [] as never })).toBeUndefined();   // no start: not a stop
    expect(open({ startedAt: {} as never, endedAt: [] as never })).toBeUndefined();
    // an equipment whose stop is not a text can be stopped: it is not stopped
    const out = stopEquipment(eq({ stoppedSince: [] as never }), 'Alice', '2026-09-25T08:00');
    expect(out.stoppedSince).toBe('2026-09-25T08:00');
    expect(out.breakdowns).toHaveLength(1);
    expect(stopEquipment(eq({ stoppedSince: '2026-09-24T08:00' }), 'Alice', '2026-09-25T08:00').stoppedSince).toBe('2026-09-24T08:00');   // already stopped: left as it is
    // a date that is a list holding a date is no date either
    expect(downtime(eq({ breakdowns: [bd({ id: 'a', date: ['2026-09-03'] as never }), bd({ id: 'b', date: '2026-09-02' })] }), now)).toMatchObject({ count: 1, hours: 2, between: null });
  });
  it('reads the owner and the completeness of a record without text', () => {
    const e = eq({ operator: 5 as unknown as string, deputy: [] as unknown as string, name: {} as unknown as string, serial: 0 as unknown as string, contract: { provider: 0 as unknown as string, until: [] as unknown as string } });
    expect(taskOwner(st(), e, [] as unknown as string, '2026-09-25')).toEqual({ who: '', absent: false, deputy: false });
    expect(completeness(e).missing.map(m => m.key)).toEqual(expect.arrayContaining(['name', 'holder', 'deputy', 'identity', 'checks']));
    expect(kindOf({ kind: 'zzz' as never })).toBe('machine');
    expect(kindOf({ kind: [] as never })).toBe('machine');
  });
  it('reads a routine whose results or ids are not lists, or that has no readable date, like one without them', () => {
    const e = eq({ checkpoints: pts(3), inspections: [{ ...insp('2026-09-22', ok3), results: 'x' as never, ids: {} as never }, { ...insp('2026-09-23', ok3), date: 5 as never }, insp('2026-09-21', ok3)] });
    expect(() => strip(e, now, P)).not.toThrow();
    expect(strip(e, now, P).at(-1)).toMatchObject({ from: '2026-09-21', state: 'ok' });
    expect(resultOf(e, e.inspections[0], 0)).toBeUndefined();
    expect(lastInspection(e, now)?.date).toBe('2026-09-22');   // the routine with no readable date is no routine
    expect(compactInspections(e, now).inspections).toHaveLength(3);
  });
});

describe('3.3 the card and the task name the same person (N-09)', () => {
  const cards = (e: Equipment, s: State) => ({ card: routineOwner(s, e, isoDate(now)), task: maintTodos(s, now).find(t => t.kind === 'routine')?.who });
  const away = [{ from: '2026-09-24', to: '2026-09-26' }];
  it('is the holder, else the manager, else the deputy, on both', () => {
    const s = st({ people: { a: person('a', 'Alice'), m: person('m', 'Marc'), b: person('b', 'Bruno') } });
    for (const [over, who] of [[{ operator: 'Alice', manager: 'Marc', deputy: 'Bruno' }, 'Alice'], [{ operator: '', manager: 'Marc', deputy: 'Bruno' }, 'Marc'], [{ operator: '', manager: '', deputy: 'Bruno' }, 'Bruno'], [{ operator: '', manager: '', deputy: '' }, '']] as const) {
      const e = eq({ ...over }), c = cards(e, st({ ...s, equipments: withEq(e) }));
      expect(c.card.who).toBe(who);
      expect(c.task).toBe(who);
    }
  });
  it('hands the routine to the deputy on both when the manager of a piece of equipment without holder is on leave, and says so on the card', () => {
    const s = (e: Equipment) => st({ people: { m: person('m', 'Marc', away), b: person('b', 'Bruno') }, equipments: withEq(e) });
    const e = eq({ operator: '', manager: 'Marc', deputy: 'Bruno' });
    const c = cards(e, s(e));
    expect(c.card).toEqual({ who: 'Bruno', absent: true, deputy: true });
    expect(c.task).toBe('Bruno');
    // without a deputy it stays with the manager, absent, on both
    const alone = eq({ operator: '', manager: 'Marc', deputy: '' });
    expect(cards(alone, s(alone)).card).toEqual({ who: 'Marc', absent: true, deputy: false });
    expect(cards(alone, s(alone)).task).toBe('Marc');
  });
});

describe('3.3 a routine dated in the future is not the last routine (N-11)', () => {
  // now: Friday 25/09; tomorrow is 26/09
  it('ignores a routine dated after tomorrow for the last routine, and counts tomorrow\'s', () => {
    const e = eq({ inspections: [insp('2026-09-15', ok3), insp('2027-03-01', ok3), insp('2026-09-27', ok3)] });
    expect(lastInspection(e, now)?.date).toBe('2026-09-15');
    expect(lastInspection({ ...e, inspections: [...e.inspections, insp('2026-09-26', ok3)] }, now)?.date).toBe('2026-09-26');
    // without a date given, today is the day of the clock
    const real = new Date(), pastDay = isoDate(new Date(real.getFullYear(), real.getMonth(), real.getDate() - 3)), futureDay = isoDate(new Date(real.getFullYear(), real.getMonth(), real.getDate() + 5));
    expect(lastInspection(eq({ inspections: [insp(pastDay, ok3), insp(futureDay, ok3)] }))?.date).toBe(pastDay);
  });
  it('records a point to watch twice in a row against the routine before, not against one dated after the day of the record', () => {
    const day = new Date(2025, 5, 10, 10, 0);   // 10/06/2025: a routine of 20/06/2025 does not exist yet that day (the clock of the test is long after)
    const e = eq({ checkpoints: pts(3), inspections: [insp('2025-06-01', ['watch', 'ok', 'ok']), insp('2025-06-20', ok3)] });
    const out = recordInspection(e, { date: '2025-06-10', by: 'Alice', note: '', results: ['watch', 'ok', 'ok'] }, day);
    expect(out.anomalies!.map(a => [a.pointId, a.note])).toEqual([['p1', WATCH_NOTE]]);
  });
  it('does not take the routine of Sunday for the one of the current week, nor a routine of 2027 for the last one in the task', () => {
    const e = eq({ inspections: [insp('2026-09-15', ok3), insp('2026-09-27', ok3)] });
    expect(inspectionState(e, now, P)).toBe('due');   // the routine of the week of 14/09 is there, the one of 27/09 does not exist yet
    expect(inspectionState({ ...e, inspections: [insp('2026-09-15', ok3), insp('2026-09-26', ok3)] }, now, P)).toBe('ok');
    const far = eq({ inspections: [insp('2026-09-02', ok3), insp('2027-03-01', ok3)] });
    expect(inspectionState(far, now, P)).toBe('late');
    expect(maintTodos(st({ equipments: withEq(far) }), now).find(t => t.kind === 'routine')!.fact).toBe('Routine manquée (dernière le 02/09/2026)');
    expect(routineFacts(st({ equipments: withEq(far) }), now).find(i => i.key === 'routine-missed')!.text).toBe('Presse plieuse (dernière routine le 02/09/2026).');
    // a routine on the first day of the week before is that week's, and one with no date (an empty text) is no routine at all
    expect(inspectionState(eq({ inspections: [insp('2026-09-14', ok3)] }), now, P)).toBe('due');
    expect(inspectionState(eq({ inspections: [insp('', ok3)] }), now, P)).toBe('never');
    expect(inspectionState(eq({ inspections: [insp('', ok3), insp('2026-09-02', ok3)] }), now, P)).toBe('late');
    const only = eq({ inspections: [insp('2027-03-01', ok3)] });
    expect(inspectionState(only, now, P)).toBe('never');
    expect(routineRate(only, now, P)).toBeNull();
    expect(strip(only, now, P).every(x => x.state === 'none')).toBe(true);
  });
});
