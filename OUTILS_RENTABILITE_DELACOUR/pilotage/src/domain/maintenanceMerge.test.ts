// Tool 3.3, two people write the same record: merging two versions and undoing a gesture without erasing what others did (lot 0, audit M3-02 to M3-05, M3-18).
import { describe, expect, it } from 'vitest';
import type { Anomaly, Breakdown, Checkpoint, Equipment, Inspection, PointResult, Spare, SpareMove } from './types';
import { mergeEquipment, mergeSpare, revertEquipment, revertSpare } from './maintenanceMerge';
import { compactInspections, eqStatus, inspectionKey, lastInspection, patchAnomaly, recordInspection, reinstateEquipment, removeAnomaly, removeBreakdown, removeInspection, reportAnomaly, restartEquipment, retireEquipment, saveDraft, stopEquipment, takeLife } from './maintenance';
import { addReserve, doneKey, historyOf, lifeOf, liftReserve, markDone, newCheck, planCheck, removeDone } from './maintenanceChecks';
import { MOVES_KEPT, countCabinet, countSpare, newSpare, orderSpare, receiveSpare, takeOut } from './maintenanceSpares';

const ok3: PointResult[] = ['ok', 'ok', 'ok'];
const pts = (n = 3): Checkpoint[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, label: `Point ${i + 1}`, criterion: '' }));
const eq = (over: Partial<Equipment> = {}): Equipment => ({ id: 'e1', name: 'Presse plieuse', location: 'Cour', operator: 'Alice', manager: 'Marc', riskId: '', kind: 'machine', checkpoints: pts(3), inspections: [], parts: [], ...over });
const ins = (id: string | undefined, date: string, over: Partial<Inspection> = {}): Inspection => ({ ...(id ? { id } : {}), date, at: `${date}T08:00`, by: 'Alice', note: '', results: ok3, ...over });
const an = (id: string, over: Partial<Anomaly> = {}): Anomaly => ({ id, label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const bd = (id: string, over: Partial<Breakdown> = {}): Breakdown => ({ id, date: '2026-09-20', hours: null, cost: null, cause: '', ...over });
const sp = (over: Partial<Spare> = {}): Spare => ({ ...newSpare(['e1']), id: 'sp1', name: 'Courroie', ref: 'C1', stock: 2, min: 1, ...over });
const mv = (id: string, at: string, delta: number, over: Partial<SpareMove> = {}): SpareMove => ({ id, at, by: 'X', delta, why: delta < 0 ? 'use' : 'return', ...over });
const ids = (xs: { id?: string }[] | undefined) => (xs ?? []).map(x => x.id).sort();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const routine = (e: Equipment, date: string, by = 'Alice') => recordInspection(e, { date, at: `${date}T08:00`, by, note: '', results: ok3 });
const T0 = '2026-10-06T08:00', T1 = '2026-10-06T08:05', T2 = '2026-10-06T08:10';

describe('3.3 merge of two versions of an equipment', () => {
  it('keeps the routine of one person and the anomaly of the other (M3-02)', () => {
    const base = eq({ inspections: [], anomalies: [] });
    const alice = routine(base, '2026-10-06'), bob = reportAnomaly(base, { label: 'Fuite', severity: 'degraded', by: 'Bob' }, T1);
    for (const m of [mergeEquipment(alice, bob), mergeEquipment(bob, alice)]) {
      expect(m.inspections).toHaveLength(1);
      expect(m.anomalies).toHaveLength(1);
      expect(m.inspections[0].by).toBe('Alice');
      expect(m.anomalies![0].by).toBe('Bob');
    }
  });
  it('takes what was typed from the newer version only, and the life from both', () => {
    const older = eq({ name: 'Ancien nom', location: 'A', inspections: [ins('i1', '2026-10-01')], checkpoints: pts(3) });
    const newer = eq({ name: 'Nouveau nom', location: 'B', inspections: [ins('i2', '2026-10-02')], checkpoints: pts(2), deputy: 'Zoé' });
    const m = mergeEquipment(older, newer);
    expect(m).toMatchObject({ name: 'Nouveau nom', location: 'B', deputy: 'Zoé' });
    expect(m.checkpoints).toHaveLength(2);
    expect(ids(m.inspections)).toEqual(['i1', 'i2']);
  });
  it('merging a record with itself changes nothing, and neither input is modified', () => {
    const x = eq({
      inspections: [ins('i1', '2026-10-01')], anomalies: [an('a1', { repairedAt: '2026-10-03' })], breakdowns: [bd('b1', { startedAt: '2026-10-02T08:00', endedAt: '2026-10-02T10:00', hours: 2 })],
      checkLife: { tk1: { history: [{ id: 'cd1', date: '2026-09-01', by: 'Marc', result: 'ok', note: '' }], reserves: [{ id: 'rs1', text: 'Joint', due: '2026-10-30', liftedAt: '' }], plannedAt: '2026-12-01' } },
    });
    const a = clone(x), b = clone(x);
    expect(mergeEquipment(x, x)).toEqual(x);
    mergeEquipment(a, b);
    expect(a).toEqual(x);
    expect(b).toEqual(x);
    expect('gone' in mergeEquipment(x, x)).toBe(false);
  });
  it('tells two routines apart by id, and the oldest ones (no id) by their content', () => {
    const r = ins(undefined, '2026-09-01'), other = ins(undefined, '2026-09-01', { results: ['ok', 'watch', 'ok'] });
    expect(mergeEquipment(eq({ inspections: [r] }), eq({ inspections: [clone(r)] })).inspections).toHaveLength(1);
    expect(mergeEquipment(eq({ inspections: [r] }), eq({ inspections: [other] })).inspections).toHaveLength(2);
    expect(mergeEquipment(eq({ inspections: [ins('i1', '2026-09-01')] }), eq({ inspections: [ins('i2', '2026-09-01')] })).inspections).toHaveLength(2);
  });
  it('reads a routine summarised in one copy as summarised in the merge, whichever copy holds the complete one (V-09)', () => {
    const full = ins('i1', '2023-01-10', { results: ['ok', 'ko', 'ok'] }), sum: Inspection = { id: 'i1', date: '2023-01-10', by: 'Alice', results: [], note: '', worst: 'ko' };
    expect(mergeEquipment(eq({ inspections: [full] }), eq({ inspections: [sum] })).inspections).toEqual([sum]);
    expect(mergeEquipment(eq({ inspections: [sum] }), eq({ inspections: [full] })).inspections).toEqual([sum]);
    expect(mergeEquipment(eq({ inspections: [sum] }), eq({ inspections: [sum] })).inspections).toEqual([sum]);
    // the oldest data have no id: the summary and the complete routine of the same day and person are one routine, summarised
    const oldFull = ins(undefined, '2023-01-10', { results: ['ok', 'ko', 'ok'] }), oldSum: Inspection = { date: '2023-01-10', by: 'Alice', results: [], note: '', worst: 'ko' };
    expect(mergeEquipment(eq({ inspections: [oldFull] }), eq({ inspections: [oldSum] })).inspections).toEqual([oldSum]);
    expect(mergeEquipment(eq({ inspections: [oldSum] }), eq({ inspections: [oldFull] })).inspections).toEqual([oldSum]);
    // a routine of another day is another routine: the one after the summary stays complete, the one before it is summarised (it is older than what was summarised)
    const later = ins('i2', '2023-01-11'), earlier = ins('i0', '2022-05-02', { results: ['ok', 'watch', 'ok'] });
    expect(mergeEquipment(eq({ inspections: [oldSum] }), eq({ inspections: [{ ...oldFull, date: '2023-01-11' }] })).inspections).toHaveLength(2);
    expect(mergeEquipment(eq({ inspections: [sum, later] }), eq({ inspections: [full, earlier] })).inspections).toEqual([{ id: 'i0', date: '2022-05-02', by: 'Alice', results: [], note: '', worst: 'watch' }, sum, later]);
    // nothing summarised anywhere: the complete routines stay complete, whatever their age
    expect(mergeEquipment(eq({ inspections: [full] }), eq({ inspections: [earlier] })).inspections).toEqual([earlier, full]);
  });
  it('does not bring the weight of a stale complete copy back at each merge (V-09)', () => {
    const day = (i: number) => new Date(Date.UTC(2018, 0, 1 + 2 * i)).toISOString().slice(0, 10);
    const routines = Array.from({ length: 1400 }, (_, i) => ins(`r${i}`, day(i), { results: i % 7 === 0 ? ['ok', 'watch', 'ko'] : ok3 }));
    const stale = eq({ inspections: routines }), compact = compactInspections(stale, new Date(2026, 9, 6));
    expect(compact.inspections.filter(i => !i.results.length).length).toBeGreaterThan(300);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(stale).length * 0.9);
    for (const m of [mergeEquipment(compact, stale), mergeEquipment(stale, compact)]) {
      expect(m.inspections).toEqual(compact.inspections);
      expect(JSON.stringify(m).length).toBe(JSON.stringify(compact).length);
    }
    // the complete routines of the last 24 months are untouched
    expect(mergeEquipment(compact, stale).inspections.slice(-50)).toEqual(routines.slice(-50));
  });
  it('lists the routines in order of date then of time, so that the latest one is the last (V-07)', () => {
    // Bob's copy was written first (it holds a routine at 14:00), Alice's phone synchronised later with hers at 08:00 the same day
    const bob = ins('ib', '2026-10-06', { at: '2026-10-06T14:00', by: 'Bob' }), alice = ins('ia', '2026-10-06', { at: '2026-10-06T08:00', by: 'Alice' }), before = ins('i0', '2026-10-05', { at: '2026-10-05T17:00', by: 'Cy' });
    const noTime = ins('in', '2026-10-06', { at: undefined, by: 'Dan' });
    for (const [o, n] of [[[bob, before], [alice]], [[alice], [bob, before]], [[before, alice], [noTime, bob]], [[bob], [alice, before]]] as Inspection[][][]) {
      const m = mergeEquipment(eq({ inspections: o }), eq({ inspections: n }));
      expect(m.inspections.map(i => i.date + (i.at ?? '').slice(10))).toEqual([...m.inspections.map(i => i.date + (i.at ?? '').slice(10))].sort());
      expect(lastInspection(m)!.by).toBe('Bob');
    }
    expect(mergeEquipment(eq({ inspections: [bob] }), eq({ inspections: [alice, before] })).inspections.map(i => i.id)).toEqual(['i0', 'ia', 'ib']);
    expect(mergeEquipment(eq({ inspections: [alice, bob] }), eq({ inspections: [noTime] })).inspections.map(i => i.id)).toEqual(['in', 'ia', 'ib']);
  });
  it('keeps the anomaly that went furthest (closed, then repaired, then open), the newer one at the same stage', () => {
    const older = eq({ anomalies: [an('a1', { closedAt: '2026-10-05', repairedAt: '2026-10-04' }), an('a2', { repairedAt: '2026-10-04' }), an('a3', { note: 'ancien' }), an('a4', { repairedAt: '2026-10-04' }), an('a5', { closedAt: '2026-10-01' })] });
    const newer = eq({ anomalies: [an('a1'), an('a2'), an('a3', { note: 'nouveau' }), an('a4', { closedAt: '2026-10-06', repairedAt: '2026-10-04' }), an('a5', { closedAt: '2026-10-02' })] });
    const m = mergeEquipment(older, newer).anomalies!;
    const by = (id: string) => m.find(a => a.id === id)!;
    expect(by('a1').closedAt).toBe('2026-10-05');
    expect(by('a2').repairedAt).toBe('2026-10-04');
    expect(by('a3').note).toBe('nouveau');
    expect(by('a4').closedAt).toBe('2026-10-06');
    expect(by('a5').closedAt).toBe('2026-10-02');
    expect(m).toHaveLength(5);
  });
  it('keeps the breakdown that has ended over the one still open, the newer one at the same stage', () => {
    const open = bd('b1', { startedAt: '2026-10-02T08:00', cause: 'ancienne' }), ended = bd('b1', { startedAt: '2026-10-02T08:00', endedAt: '2026-10-02T11:00', hours: 3 });
    expect(mergeEquipment(eq({ breakdowns: [ended] }), eq({ breakdowns: [open] })).breakdowns).toEqual([ended]);
    expect(mergeEquipment(eq({ breakdowns: [open] }), eq({ breakdowns: [ended] })).breakdowns).toEqual([ended]);
    expect(mergeEquipment(eq({ breakdowns: [open] }), eq({ breakdowns: [{ ...open, cause: 'nouvelle' }] })).breakdowns![0].cause).toBe('nouvelle');
  });
  it('derives the stop from the merged breakdowns: oldest open one, none when all are over, the stop given when no breakdown backs it', () => {
    const e = eq();
    const stopped = stopEquipment(e, 'Alice', '2026-10-06T07:00'), restarted = restartEquipment(stopped, '2026-10-06T09:00');
    // one person stopped it, the other restarted it: over, with its hours
    const m1 = mergeEquipment(stopped, restarted);
    expect(m1.stoppedSince).toBeUndefined();
    expect(m1.breakdowns![0]).toMatchObject({ endedAt: '2026-10-06T09:00', hours: 2 });
    // two stops open in two copies: the stop starts at the oldest
    const later = stopEquipment(e, 'Bob', '2026-10-06T08:30');
    expect(mergeEquipment(later, stopped).stoppedSince).toBe('2026-10-06T07:00');
    expect(mergeEquipment(stopped, later).stoppedSince).toBe('2026-10-06T07:00');
    // a stop with no breakdown that starts it (first versions): the stop of the newer copy stays; a restart of the newer copy ends it
    expect(mergeEquipment(eq({ stoppedSince: '2026-10-05T10:00' }), eq({ stoppedSince: '2026-10-05T10:00', breakdowns: [bd('b0')] })).stoppedSince).toBe('2026-10-05T10:00');
    expect(mergeEquipment(eq({ stoppedSince: '2026-10-05T10:00' }), eq()).stoppedSince).toBeUndefined();
    // a stop that was removed on purpose does not come back
    expect(mergeEquipment(stopped, removeBreakdown(stopped, stopped.breakdowns![0].id)).stoppedSince).toBeUndefined();
  });
  it('merges the history of a check and its observations, and takes the planning of the newer copy', () => {
    const line = (id: string | undefined, date: string, note = '') => ({ ...(id ? { id } : {}), date, by: 'Marc', result: 'ok' as const, note });
    const rs = (liftedAt: string) => ({ id: 'rs1', text: 'Joint', due: '2026-10-30', liftedAt });
    const older = eq({ checkLife: { tk1: { history: [line('cd1', '2025-09-01'), line(undefined, '2024-09-01', 'ancien')], reserves: [rs('')], plannedAt: '2026-11-01', plannedWith: 'Acme' }, tk2: { history: [line('cd9', '2026-01-01')], plannedAt: '2026-12-01' } } });
    const newer = eq({ checkLife: { tk1: { history: [line('cd2', '2026-09-02'), line(undefined, '2024-09-01', 'ancien')], reserves: [rs('2026-10-05')] } } });
    const m = mergeEquipment(older, newer).checkLife!;
    expect(m.tk1.history.map(h => doneKey(h)).sort()).toEqual(['2024-09-01|Marc|ok|ancien', 'cd1', 'cd2']);
    expect(m.tk1.reserves).toEqual([rs('2026-10-05')]);
    expect(m.tk1.plannedAt).toBeUndefined();
    expect(m.tk1.plannedWith).toBeUndefined();
    expect(m.tk2).toEqual(older.checkLife!.tk2);   // a check only the older copy knows is kept with its planning
    expect(mergeEquipment(newer, older).checkLife!.tk1.reserves).toEqual([rs('2026-10-05')]);   // the lifted copy wins whichever side it is on
    expect(mergeEquipment(newer, older).checkLife!.tk1.plannedAt).toBe('2026-11-01');
  });
  it('does not bring back what was removed on purpose, whichever copy still holds it', () => {
    const full = eq({
      inspections: [ins('i1', '2026-10-01'), ins(undefined, '2026-09-01')], anomalies: [an('a1')], breakdowns: [bd('b1')],
      checkLife: { tk1: { history: [{ id: 'cd1', date: '2026-09-01', by: 'M', result: 'ok', note: '' }], reserves: [{ id: 'rs1', text: 'x', due: '', liftedAt: '' }] } },
    });
    const old = full.inspections[1];
    let cut = removeInspection(removeInspection(full, 'i1'), inspectionKey(old));
    cut = removeBreakdown(removeAnomaly(cut, 'a1'), 'b1');
    cut = { ...cut, gone: [...cut.gone!, 'rs1'] };
    cut = removeDone({ ...cut, tasks: [newCheck('Ext')].map(c => ({ ...c, id: 'tk1' })) }, 'tk1', 'cd1');
    for (const m of [mergeEquipment(full, cut), mergeEquipment(cut, full)]) {
      expect(m.inspections).toEqual([]);
      expect(m.anomalies).toEqual([]);
      expect(m.breakdowns).toEqual([]);
      expect(m.checkLife!.tk1.history).toEqual([]);
      expect(m.checkLife!.tk1.reserves).toEqual([]);
      expect(m.gone).toEqual(expect.arrayContaining(['i1', 'a1', 'b1', 'cd1', 'rs1', inspectionKey(old)]));
    }
  });
  it('keeps the union of the lists of removed ids, the last 300', () => {
    const list = (from: number, n: number) => Array.from({ length: n }, (_, i) => `x${from + i}`);
    const m = mergeEquipment(eq({ gone: list(0, 200) }), eq({ gone: list(150, 200) }));
    expect(m.gone).toHaveLength(300);
    expect(m.gone![299]).toBe('x349');
    expect(m.gone).toContain('x199');
    expect(m.gone).not.toContain('x49');
  });
  it('takes the routine under way from the newer copy', () => {
    const draft = { date: T0, by: 'Alice', results: { p1: 'ok' as const }, values: {}, note: '' };
    expect(mergeEquipment(eq({ routineDraft: draft }), eq()).routineDraft).toBeUndefined();
    expect(mergeEquipment(eq(), eq({ routineDraft: draft }))).toMatchObject({ routineDraft: draft });
  });
  it('folds three versions, in the order given', () => {
    const base = eq();
    const v1 = routine(base, '2026-10-05'), v2 = reportAnomaly(base, { label: 'Bruit', severity: 'degraded', by: 'Bob' }, T1), v3 = stopEquipment(base, 'Cy', T2);
    const m = [v1, v2, v3].reduce(mergeEquipment);
    expect(m.inspections).toHaveLength(1);
    expect(m.anomalies).toHaveLength(1);
    expect(m.breakdowns).toHaveLength(1);
    expect(m.stoppedSince).toBe(T2);
    const m2 = [v3, v1, v2].reduce(mergeEquipment);
    expect([m2.inspections.length, m2.anomalies!.length, m2.breakdowns!.length, m2.stoppedSince]).toEqual([1, 1, 1, T2]);
  });
  it('leaves out what is not a record in the lists of both copies, and a text or a number where a list should be (V-06)', () => {
    const junk = (): unknown[] => [null, undefined, 'x', 42, true, [], [1]];
    const a = eq({
      inspections: [...junk(), ins('i1', '2026-10-01')] as Inspection[], anomalies: [...junk(), an('a1')] as Anomaly[], breakdowns: [bd('b1'), ...junk()] as Breakdown[],
      checkLife: { tk1: { history: [...junk(), { id: 'cd1', date: '2026-09-01', by: 'M', result: 'ok', note: '' }], reserves: [...junk(), { id: 'rs1', text: 'x', due: '', liftedAt: '' }] } } as Equipment['checkLife'],
      gone: ['g1', 5, null] as string[],
    });
    const b = eq({ inspections: [ins('i2', '2026-10-02'), ...junk()] as Inspection[], anomalies: 'x' as unknown as Anomaly[], breakdowns: {} as unknown as Breakdown[], gone: 'zz' as unknown as string[] });
    for (const m of [mergeEquipment(a, b), mergeEquipment(b, a)]) {
      expect(ids(m.inspections)).toEqual(['i1', 'i2']);
      expect(ids(m.anomalies)).toEqual(['a1']);
      expect(ids(m.breakdowns)).toEqual(['b1']);
      expect(m.checkLife!.tk1.history.map(h => h.id)).toEqual(['cd1']);
      expect(m.checkLife!.tk1.reserves!.map(r => r.id)).toEqual(['rs1']);
      expect(m.gone).toEqual(['g1']);
    }
    const checkLifeText = eq({ checkLife: 'x' as unknown as Equipment['checkLife'] });
    expect(() => mergeEquipment(checkLifeText, a)).not.toThrow();
    expect(Object.keys(mergeEquipment(checkLifeText, a).checkLife!)).toEqual(['tk1']);
    const moves = [...junk(), mv('m1', T0, -1)] as SpareMove[];
    expect(mergeSpare(sp({ stock: 2, moves }), sp({ stock: 1, moves: [mv('m1', T0, -1), ...junk()] as SpareMove[] }))).toMatchObject({ stock: 1, moves: [mv('m1', T0, -1)] });
  });
  it('reads incomplete records without failing', () => {
    const bare = { id: 'e1', name: 'X' } as unknown as Equipment;
    const odd = { ...eq(), inspections: 'x', anomalies: { a: 1 }, breakdowns: [null, bd('b1')], checkLife: undefined, gone: 'zz' } as unknown as Equipment;
    expect(() => mergeEquipment(bare, odd)).not.toThrow();
    expect(() => mergeEquipment(odd, bare)).not.toThrow();
    expect(mergeEquipment(bare, odd).breakdowns).toEqual([bd('b1')]);
    expect(mergeEquipment(bare, bare).inspections).toEqual([]);
    expect(mergeEquipment(undefined as unknown as Equipment, eq()).name).toBe('Presse plieuse');
    expect(mergeEquipment(eq(), null as unknown as Equipment).name).toBe('Presse plieuse');
  });
});

describe('3.3 merge of two versions of a part', () => {
  it('two takes by two people leave a stock of 0 and two movements (M3-02)', () => {
    const base = sp({ stock: 2, moves: [] });
    const a = takeOut(base, 'Alice', { at: T0 }), b = takeOut(base, 'Bob', { at: T1 });
    for (const m of [mergeSpare(a, b), mergeSpare(b, a)]) {
      expect(m.stock).toBe(0);
      expect(m.moves).toHaveLength(2);
      expect(m.moves!.map(x => x.by).sort()).toEqual(['Alice', 'Bob']);
    }
  });
  it('counts a movement once when the newer copy already holds it', () => {
    const start = mv('m0', '2026-10-01T08:00', 3, { why: 'start' }), base = sp({ stock: 3, moves: [start] });
    const a = takeOut(base, 'Alice', { at: T0 });
    const b = takeOut(a, 'Bob', { at: T1 });   // Bob loaded Alice's take first
    expect(b.stock).toBe(1);
    expect(mergeSpare(a, b)).toMatchObject({ stock: 1 });
    expect(mergeSpare(a, b).moves).toHaveLength(3);
    const c = takeOut(base, 'Cy', { at: T2 });   // Cy did not
    expect(mergeSpare(a, c).stock).toBe(1);
    expect(mergeSpare(mergeSpare(a, b), c).stock).toBe(0);
  });
  it('does not count a movement removed on purpose, wherever it still is', () => {
    const base = sp({ stock: 2, moves: [] }), taken = takeOut(base, 'Alice', { at: T0 });
    const undone = revertSpare(taken, base, taken);
    expect(undone).toMatchObject({ stock: 2, moves: [], gone: [taken.moves![0].id] });
    for (const m of [mergeSpare(taken, undone), mergeSpare(undone, taken)]) {
      expect(m.stock).toBe(2);
      expect(m.moves).toEqual([]);
    }
  });
  it('takes the typed content and the order of the newer copy, the latest count of the two', () => {
    const older = sp({ name: 'Ancien', place: 'Tiroir 1', order: { qty: 2, at: T0, expectedAt: '' }, countedAt: '2026-10-05T09:00', countedBy: 'Alice' });
    const newer = sp({ name: 'Nouveau', place: 'Tiroir 2', countedAt: '2026-10-04T09:00', countedBy: 'Bob' });
    const m = mergeSpare(older, newer);
    expect(m).toMatchObject({ name: 'Nouveau', place: 'Tiroir 2', countedAt: '2026-10-05T09:00', countedBy: 'Alice' });
    expect(m.order).toBeUndefined();
    expect(mergeSpare(newer, older)).toMatchObject({ name: 'Ancien', order: older.order, countedAt: '2026-10-05T09:00', countedBy: 'Alice' });
    expect(mergeSpare(sp(), sp({ countedAt: '2026-10-05T09:00', countedBy: 'Bob' }))).toMatchObject({ countedAt: '2026-10-05T09:00', countedBy: 'Bob' });
    expect('countedAt' in mergeSpare(sp(), sp())).toBe(false);
  });
  it('folds three versions and never goes below 0', () => {
    const base = sp({ stock: 3, moves: [] });
    const v = ['Alice', 'Bob', 'Cy'].map((n, i) => takeOut(base, n, { at: `2026-10-06T08:0${i}` }));
    const m = v.reduce(mergeSpare);
    expect(m.stock).toBe(0);
    expect(m.moves).toHaveLength(3);
    const four = [...v, takeOut(sp({ stock: 3, moves: [] }), 'Di', { at: T2 })].reduce(mergeSpare);
    expect(four.stock).toBe(0);
    expect(four.moves).toHaveLength(4);
  });
  it('keeps the movements in order of time, at most 1000', () => {
    const a = sp({ moves: [mv('a1', '2026-10-03T08:00', -1), mv('a2', '2026-10-05T08:00', -1)] }), b = sp({ moves: [mv('b1', '2026-10-04T08:00', -1)] });
    expect(mergeSpare(a, b).moves!.map(m => m.id)).toEqual(['a1', 'b1', 'a2']);
    const many = (p: string) => Array.from({ length: 600 }, (_, i) => mv(`${p}${i}`, `2026-0${p === 'x' ? 1 : 2}-01T08:${String(i % 60).padStart(2, '0')}`, 1));
    expect(mergeSpare(sp({ moves: many('x') }), sp({ moves: many('y') })).moves).toHaveLength(MOVES_KEPT);
    expect(MOVES_KEPT).toBe(1000);
  });
  it('does not count again the oldest movements the newer copy cut at its limit of 1000', () => {
    const all = Array.from({ length: 1001 }, (_, i) => mv(`m${i}`, new Date(Date.UTC(2026, 0, 1, i)).toISOString().slice(0, 16), i === 0 ? -1 : 1));
    const older = sp({ stock: 10, moves: all.slice(0, 1000) }), newer = sp({ stock: 11, moves: all.slice(1, 1001) });   // m0 was cut from the newer one, whose stock already counts it
    expect(mergeSpare(older, newer).stock).toBe(11);
    expect(mergeSpare(older, { ...newer, moves: newer.moves!.slice(10) }).stock).toBe(20);   // below the limit, m0 to m10 are movements it does not know (11 + 9)
  });
  it('counts a movement the newer copy does not know even when that copy is at its limit, if it is not older than what the copy kept', () => {
    const hour = (i: number) => new Date(Date.UTC(2026, 0, 1, i)).toISOString().slice(0, 16);
    const all = Array.from({ length: 1000 }, (_, i) => mv(`m${i}`, hour(i), 1));
    expect(mergeSpare(sp({ stock: 5, moves: [mv('odd', hour(500), -3)] }), sp({ stock: 20, moves: all })).stock).toBe(17);
    expect(mergeSpare(sp({ stock: 5, moves: [mv('odd', hour(500), -3), mv('cut', '2025-12-31T23:00', 4)] }), sp({ stock: 20, moves: all })).stock).toBe(17);   // older than all it kept: cut, not unknown
  });
  it('does not count again the movements the newer copy cut by age (13 months before its newest one), and counts the ones just inside', () => {
    const a = mv('a1', '2026-09-01T08:00', -1), b = mv('b1', '2026-09-20T08:00', -1);
    const inside = mv('in', '2025-08-20T08:00', 2), outside = mv('out', '2025-08-19T23:59', 4);   // the newest movement is on 2026-09-20: the window starts on 2025-08-20
    const merged = mergeSpare(sp({ stock: 8, moves: [outside, inside, a] }), sp({ stock: 7, moves: [a, b] }));
    expect(merged.stock).toBe(9);
    expect(merged.moves!.map(m => m.id)).toEqual(['in', 'a1', 'b1']);
  });
  it('reads incomplete parts without failing', () => {
    const bare = { id: 'sp1', name: 'X' } as unknown as Spare;
    expect(() => mergeSpare(bare, { ...bare, moves: 'x', stock: 'y' } as unknown as Spare)).not.toThrow();
    expect(mergeSpare(bare, bare).stock).toBe(0);
    expect(mergeSpare(bare, sp({ moves: [mv('m1', T0, -1)] })).moves).toHaveLength(1);
    // a time that is not a text is no time: the movement is kept and counted, not fatal
    const odd = sp({ stock: 3, moves: [{ ...mv('m1', T0, -1), at: 5 as unknown as string }, mv('m2', T1, -2)] });
    for (const m of [mergeSpare(odd, sp({ stock: 3, moves: [mv('m3', T2, -1)] })), mergeSpare(sp({ stock: 3, moves: [mv('m3', T2, -1)] }), odd)]) expect(m.moves!.map(x => x.id).sort()).toEqual(['m1', 'm2', 'm3']);
  });
  it('undoes nothing on a record that is not there', () => {
    for (const none of [null, undefined, 'x', 5]) {
      expect(revertEquipment(none as unknown as Equipment, eq(), routine(eq(), '2026-10-06'))).toBe(none);
      expect(revertSpare(none as unknown as Spare, sp(), takeOut(sp(), 'A', { at: T0 }))).toBe(none);
    }
    expect(revertEquipment(eq(), null as unknown as Equipment, eq())).toEqual(eq());
  });
});

describe('3.3 undoing a gesture on the part without erasing the others', () => {
  it('takes back my take, not the one made by someone else since (M3-04)', () => {
    const base = sp({ stock: 2, moves: [] }), mine = takeOut(base, 'Alice', { at: T0 });
    const now = takeOut(mine, 'Bob', { at: T1 });
    const r = revertSpare(now, base, mine);
    expect(r.stock).toBe(1);   // not the 2 of the snapshot
    expect(r.moves!.map(m => m.by)).toEqual(['Bob']);
    expect(r.gone).toEqual([mine.moves![0].id]);
    expect(revertSpare(r, base, mine)).toEqual(r);   // twice is once
  });
  it('keeps an order noted by someone else since, and puts a reception back', () => {
    const base = sp({ stock: 2, moves: [] }), mine = takeOut(base, 'Alice', { at: T0 });
    const ordered = orderSpare(mine, 2, '2026-10-06', '2026-10-20');
    const r = revertSpare(ordered, base, mine);
    expect(r.order).toEqual(ordered.order);
    expect(r.stock).toBe(2);
    // reception undone: the order comes back, the stock goes down by what was received
    const waiting = sp({ stock: 0, moves: [], order: { qty: 3, at: '2026-10-01', expectedAt: '2026-10-05' } }), got = receiveSpare(waiting, 'Alice', T0);
    expect(got).toMatchObject({ stock: 3 });
    const back = revertSpare(got, waiting, got);
    expect(back).toMatchObject({ stock: 0, order: waiting.order, moves: [] });
    // someone else already put a new order: it stays
    const again = orderSpare(got, 5, '2026-10-06', '2026-10-30');
    expect(revertSpare(again, waiting, got).order).toEqual(again.order);
  });
  it('puts the count back only if nobody counted since', () => {
    const base = sp({ countedAt: '2026-09-01T08:00', countedBy: 'Zoé' }), mine = countSpare(base, 'Alice', T0);
    expect(revertSpare(mine, base, mine)).toMatchObject({ countedAt: '2026-09-01T08:00', countedBy: 'Zoé' });
    const since = countSpare(mine, 'Bob', T2);
    expect(revertSpare(since, base, mine)).toMatchObject({ countedAt: T2, countedBy: 'Bob' });
    // the count of the whole cabinet: each part on its own
    const cab = countCabinet({ spares: { sp1: base } }, 'Alice', T0).sp1;
    expect(revertSpare(cab, base, cab)).toEqual(base);
    // a gap found by the count is a movement: undone like the others
    const gap = countSpare(sp({ stock: 3, moves: [] }), 'Alice', T0, 1);
    expect(gap).toMatchObject({ stock: 1 });
    expect(revertSpare(gap, sp({ stock: 3, moves: [] }), gap)).toMatchObject({ stock: 3, moves: [] });
  });
  it('does not make a part appear when the take was made on an empty shelf', () => {
    const base = sp({ stock: 0, moves: [] }), taken = takeOut(base, 'Alice', { at: T0 });
    expect(taken).toMatchObject({ stock: 0 });
    expect(taken.moves).toHaveLength(1);
    expect(revertSpare(taken, base, taken)).toMatchObject({ stock: 0, moves: [] });
  });
  it('leaves what was typed since, and takes the withdrawal from the cabinet back', () => {
    const base = sp({ place: 'Tiroir 1' }), after = { ...base, retired: true }, now = { ...after, place: 'Tiroir 2' };
    expect(revertSpare(now, base, after)).toMatchObject({ place: 'Tiroir 2' });
    expect(revertSpare(now, base, after).retired).toBeUndefined();
    expect(revertSpare({ ...now, retired: false }, base, after).retired).toBe(false);   // someone put it back differently
    expect(revertSpare(base, base, base)).toEqual(base);
  });
  it('an undone take does not come back when merged with a copy that still holds it', () => {
    const base = sp({ stock: 2, moves: [] }), mine = takeOut(base, 'Alice', { at: T0 }), other = revertSpare(mine, base, mine);
    expect([mine, other].reduce(mergeSpare)).toMatchObject({ stock: 2, moves: [] });
    expect([other, mine].reduce(mergeSpare)).toMatchObject({ stock: 2, moves: [] });
  });
});

describe('3.3 undoing a gesture on the equipment without erasing the others', () => {
  it('takes back my routine, keeps the anomaly reported elsewhere since, and the routine under way comes back (M3-05)', () => {
    const draft = { date: T0, by: 'Alice', results: { p1: 'ok' as const, p2: 'ok' as const, p3: 'ok' as const }, values: {}, note: '' };
    const before = saveDraft(eq(), draft), after = routine(before, '2026-10-06');
    expect(after.routineDraft).toBeUndefined();
    const now = reportAnomaly(after, { label: 'Fuite', severity: 'degraded', by: 'Bob' }, T1);
    const r = revertEquipment(now, before, after);
    expect(r.inspections).toEqual([]);
    expect(r.anomalies).toHaveLength(1);
    expect(r.anomalies![0].by).toBe('Bob');
    expect(r.routineDraft).toEqual(draft);
    expect(r.gone).toEqual([after.inspections[0].id]);
  });
  it('takes back my report, keeps the routine and the stop made since by someone else', () => {
    const before = eq(), after = reportAnomaly(before, { label: 'Bruit', severity: 'degraded', by: 'Alice' }, T0);
    const now = stopEquipment(routine(after, '2026-10-06', 'Bob'), 'Bob', T2);
    const r = revertEquipment(now, before, after);
    expect(r.anomalies).toEqual([]);
    expect(r.inspections).toHaveLength(1);
    expect(r.breakdowns).toHaveLength(1);
    expect(r.stoppedSince).toBe(T2);
    expect(r.gone).toEqual([after.anomalies![0].id]);
  });
  it('takes back a report that stopped the equipment: the anomaly, the breakdown and the stop go together', () => {
    const before = eq(), after = reportAnomaly(before, { label: 'Casse', severity: 'stopped', by: 'Alice' }, T0);
    expect(after.stoppedSince).toBe(T0);
    const r = revertEquipment(after, before, after);
    expect(r.anomalies).toEqual([]);
    expect(r.breakdowns).toEqual([]);
    expect(r.stoppedSince).toBeUndefined();
    expect(r.gone).toHaveLength(2);
    // but a breakdown someone took in charge since stays, and the stop with it
    const taken = { ...after, breakdowns: after.breakdowns!.map(b => ({ ...b, cause: 'Courroie' })) };
    const kept = revertEquipment(taken, before, after);
    expect(kept.breakdowns).toHaveLength(1);
    expect(kept.stoppedSince).toBe(T0);
  });
  it('takes back a restart: the breakdown is open again and the equipment stopped', () => {
    const before = stopEquipment(eq(), 'Alice', '2026-10-06T07:00'), after = restartEquipment(before, T0, { cause: 'Courroie' });
    expect(after.stoppedSince).toBeUndefined();
    const r = revertEquipment(after, before, after);
    expect(r.stoppedSince).toBe('2026-10-06T07:00');
    expect(r.breakdowns![0]).toEqual(before.breakdowns![0]);
    // someone else put it to stop again since: nothing to undo
    const again = stopEquipment(after, 'Bob', T2);
    const r2 = revertEquipment(again, before, after);
    expect(r2.stoppedSince).toBe(T2);
    expect(r2.breakdowns).toHaveLength(2);
    expect(r2.breakdowns!.filter(b => !b.endedAt)).toHaveLength(1);   // one open breakdown, the new one
  });
  it('leaves an element someone else changed since, and takes back the fields only the gesture changed', () => {
    const before = eq({ anomalies: [an('a1', { handler: 'Marc' })] }), after = { ...before, anomalies: [{ ...before.anomalies![0], repairedAt: '2026-10-06' }] };
    expect(revertEquipment(after, before, after).anomalies).toEqual(before.anomalies);
    const edited = patchAnomaly(after, 'a1', { waitingFor: 'pièce' });
    expect(revertEquipment(edited, before, after).anomalies).toEqual([{ ...before.anomalies![0], waitingFor: 'pièce' }]);
    const conflict = patchAnomaly(after, 'a1', { repairedAt: '2026-10-07' });   // someone else gave another repair date: it stays
    expect(revertEquipment(conflict, before, after).anomalies![0].repairedAt).toBe('2026-10-07');
    // an anomaly I reported, since taken in charge by someone: it stays (and is not in `gone`)
    const reported = reportAnomaly(eq(), { label: 'Fuite', severity: 'degraded', by: 'Alice' }, T0), handled = patchAnomaly(reported, reported.anomalies![0].id, { handler: 'Marc' });
    const r = revertEquipment(handled, eq(), reported);
    expect(r.anomalies).toHaveLength(1);
    expect(r.gone).toBeUndefined();
  });
  it('puts back an element removed on purpose, at its place, and takes it out of `gone`', () => {
    const full = eq({ inspections: [ins('i1', '2026-10-01'), ins('i2', '2026-10-02'), ins(undefined, '2026-10-03')], anomalies: [an('a1'), an('a2')], breakdowns: [bd('b1', { startedAt: T0 })], stoppedSince: T0 });
    const cut = removeInspection(removeInspection(full, 'i2'), inspectionKey(full.inspections[2]));
    expect(cut.gone).toHaveLength(2);
    const r = revertEquipment(cut, full, cut);
    expect(r.inspections.map(inspectionKey)).toEqual(['i1', 'i2', inspectionKey(full.inspections[2])]);
    expect(r.gone).toBeUndefined();
    expect(revertEquipment(removeAnomaly(full, 'a1'), full, removeAnomaly(full, 'a1')).anomalies!.map(a => a.id)).toEqual(['a1', 'a2']);
    const noStop = removeBreakdown(full, 'b1');
    expect(noStop.stoppedSince).toBeUndefined();
    const back = revertEquipment(noStop, full, noStop);
    expect(back.breakdowns).toEqual(full.breakdowns);
    expect(back.stoppedSince).toBe(T0);
    // it is not put back twice, and not when someone else has already put it back
    expect(revertEquipment(r, full, cut).inspections).toHaveLength(3);
  });
  it('puts back a removed point at its place and keeps what was typed since (M3-18)', () => {
    const before = eq({ checkpoints: pts(4) }), after = { ...before, checkpoints: before.checkpoints.filter(c => c.id !== 'p3') };
    const now = { ...after, checkpoints: after.checkpoints.map(c => (c.id === 'p1' ? { ...c, label: 'Niveau modifié' } : c)) };
    const r = revertEquipment(now, before, after);
    expect(r.checkpoints.map(c => c.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(r.checkpoints[0].label).toBe('Niveau modifié');
    // the first point, and a contact or a check with no id kept
    const first = { ...before, checkpoints: before.checkpoints.slice(1) };
    expect(revertEquipment(first, before, first).checkpoints.map(c => c.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    const docs = eq({ docs: [{ label: 'Notice' }, { label: 'Plan', url: 'https://x.fr' }] }), noDoc = { ...docs, docs: [docs.docs![1]] };
    expect(revertEquipment(noDoc, docs, noDoc).docs).toEqual(docs.docs);
  });
  it('takes back a check done: the line, the date and the planning come back, nothing is left empty', () => {
    const c = { ...newCheck('Extincteurs'), id: 'tk1' }, planned = planCheck(eq({ tasks: [c] }), 'tk1', '2026-10-20', 'Acme');
    const done = markDone(planned, 'tk1', { date: '2026-10-06', by: 'Marc', result: 'ok', note: '' });
    expect(lifeOf(done, c).plannedAt).toBeUndefined();
    const r = revertEquipment(done, planned, done);
    expect(lifeOf(r, c)).toMatchObject({ plannedAt: '2026-10-20', plannedWith: 'Acme', history: [] });
    expect(historyOf(r, r.tasks![0])).toEqual([]);   // the date of the check went back too: no phantom first line
    // the first thing ever written on the check: its life entry is not left empty (the equipment stays deletable)
    const fresh = eq({ tasks: [c] }), first = markDone(fresh, 'tk1', { date: '2026-10-06', by: 'Marc', result: 'ok', note: '' });
    expect(revertEquipment(first, fresh, first).checkLife).toEqual({});
    // someone planned another date since: it stays
    const since = planCheck(done, 'tk1', '2027-01-10');
    expect(lifeOf(revertEquipment(since, planned, done), c).plannedAt).toBe('2027-01-10');
  });
  it('takes back a line of history, an observation, the lifting of an observation, and a planning', () => {
    const c = { ...newCheck('Extincteurs'), id: 'tk1' }, e0 = markDone(eq({ tasks: [c] }), 'tk1', { id: 'cd0', date: '2026-01-01', by: 'M', result: 'ok', note: '' });
    const withR = addReserve(e0, 'tk1', 'Joint', '2026-10-30'), rid = lifeOf(withR, c).reserves![0].id;
    expect(lifeOf(revertEquipment(withR, e0, withR), c).reserves).toEqual([]);
    const lifted = liftReserve(withR, 'tk1', rid, '2026-10-06');
    expect(lifeOf(revertEquipment(lifted, withR, lifted), c).reserves![0].liftedAt).toBe('');
    const gone = removeDone(e0, 'tk1', 'cd0');
    expect(historyOf(gone, c)).toEqual([]);
    expect(historyOf(revertEquipment(gone, e0, gone), c).map(h => h.id)).toEqual(['cd0']);
    expect(revertEquipment(gone, e0, gone).gone).toBeUndefined();
  });
  it('changes nothing when there is nothing to undo, and leaves what was typed since', () => {
    const x = eq({ inspections: [ins('i1', '2026-10-01')], anomalies: [an('a1')], stoppedSince: T0, breakdowns: [bd('b1', { startedAt: T0 })] });
    expect(revertEquipment(x, x, x)).toEqual(x);
    const before = eq(), after = routine(before, '2026-10-06'), now = { ...after, location: 'Atelier B', name: 'Presse 2' };
    expect(revertEquipment(now, before, after)).toMatchObject({ location: 'Atelier B', name: 'Presse 2', inspections: [] });
    // a routine someone else removed since: nothing to take out, nothing broken
    expect(() => revertEquipment(before, before, after)).not.toThrow();
    expect(revertEquipment(before, before, after).inspections).toEqual([]);
  });
  it('an undone routine does not come back when merged with a copy that still holds it', () => {
    const before = eq(), after = routine(before, '2026-10-06'), undone = revertEquipment(after, before, after);
    expect([after, undone].reduce(mergeEquipment).inspections).toEqual([]);
    expect([undone, after].reduce(mergeEquipment).inspections).toEqual([]);
  });
});

describe('3.3 the fields each device typed: a gesture on a stale sheet does not write the old content back (V-01)', () => {
  const base = () => eq({ operator: 'Julien P.', location: 'Atelier principal', deputy: 'Zoé', manager: 'Marc', maker: 'Constructeur X', safety: ['Consigne 1'] });
  // Alice changes the holder, the place and adds a note; Bob, on the sheet as it was before, notes a routine (he typed nothing)
  const alice = (): Equipment => ({ ...base(), operator: 'Nouvelle personne', location: 'Nouvel atelier', safety: ['Consigne 1', 'Nouvelle consigne'], touched: ['operator', 'location', 'safety'] });
  const bob = (): Equipment => ({ ...routine(base(), '2026-10-06', 'Bob'), touched: [] });
  it('keeps what Alice typed and the routine of Bob, whichever version was written last', () => {
    for (const m of [mergeEquipment(alice(), bob()), mergeEquipment(bob(), alice())]) {
      expect(m).toMatchObject({ operator: 'Nouvelle personne', location: 'Nouvel atelier', safety: ['Consigne 1', 'Nouvelle consigne'], deputy: 'Zoé', manager: 'Marc', maker: 'Constructeur X' });
      expect(m.inspections).toHaveLength(1);
      expect(m.inspections[0].by).toBe('Bob');
      expect([...m.touched!].sort()).toEqual(['location', 'operator', 'safety']);
    }
  });
  it('takes the newer copy whole when a copy does not say what its device typed (written before the list existed)', () => {
    const old = { ...bob() } as Equipment & { touched?: string[] };
    delete old.touched;
    expect(mergeEquipment(alice(), old)).toMatchObject({ operator: 'Julien P.', location: 'Atelier principal' });
    expect(mergeEquipment(old, alice())).toMatchObject({ operator: 'Nouvelle personne', location: 'Nouvel atelier' });
    expect(mergeEquipment(alice(), old).touched).toBeUndefined();
  });
  it('takes a field both devices typed from the newer copy, and one nobody typed from the newer copy too', () => {
    const a: Equipment = { ...base(), location: 'Cour', operator: 'Alice', manager: 'Anne', touched: ['location', 'operator'] };
    const b: Equipment = { ...base(), location: 'Quai', name: 'Presse 2', manager: 'Zed', touched: ['location', 'name'] };
    expect(mergeEquipment(a, b)).toMatchObject({ location: 'Quai', operator: 'Alice', name: 'Presse 2', manager: 'Zed' });
    expect(mergeEquipment(b, a)).toMatchObject({ location: 'Cour', operator: 'Alice', name: 'Presse 2', manager: 'Anne' });
  });
  it('keeps a field Alice removed, though the stale copy still holds it', () => {
    const { deputy: _d, ...without } = base();
    const m = mergeEquipment({ ...without, touched: ['deputy'] }, bob());
    expect('deputy' in m).toBe(false);
    expect(m.operator).toBe('Julien P.');
    expect(mergeEquipment(bob(), { ...base(), deputy: 'Zoé', touched: [] }).deputy).toBe('Zoé');
  });
  it('folds three copies in the order of time, field by field', () => {
    const v1: Equipment = { ...base(), operator: 'Alice', touched: ['operator'] };
    const v2: Equipment = { ...base(), location: 'Quai', touched: ['location'] };
    const v3: Equipment = { ...base(), name: 'Presse 3', manager: 'Cy', touched: ['name', 'manager'] };   // the stalest base, the last write
    const m = [v1, v2, v3].reduce(mergeEquipment);
    expect(m).toMatchObject({ operator: 'Alice', location: 'Quai', name: 'Presse 3', manager: 'Cy', deputy: 'Zoé' });
    expect([...m.touched!].sort()).toEqual(['location', 'manager', 'name', 'operator']);
    expect(mergeEquipment(v1, mergeEquipment(v2, v3))).toEqual(m);
    // a copy that touched a field after the other two wins it
    const v4: Equipment = { ...base(), operator: 'Dan', touched: ['operator'] };
    expect([v1, v2, v3, v4].reduce(mergeEquipment).operator).toBe('Dan');
    expect([v4, v2, v3, v1].reduce(mergeEquipment).operator).toBe('Alice');
  });
  it('never takes the life, the key or the list of removed ids from the list, and ignores what is not a field name', () => {
    const polluted = JSON.parse('{"touched": ["__proto__", "constructor", "toString", "inspections", "anomalies", "id", "gone", 5, null, {}, "retiredAt", "routineDraft", "name"], "__proto__": {"hacked": true}}') as Record<string, unknown>;
    const draft = (by: string) => ({ date: T0, by, results: { p1: 'ok' as const }, values: {}, note: '' });
    const a = { ...eq({ id: 'e0', name: 'Alice', inspections: [ins('i1', '2026-10-01')], anomalies: [an('a1')], gone: ['g1'], routineDraft: draft('Alice') }), ...polluted } as Equipment;
    const b = { ...eq({ id: 'e1', name: 'Bob', inspections: [ins('i2', '2026-10-02')], gone: ['g2'], routineDraft: draft('Bob') }), touched: [] } as Equipment;
    const m = mergeEquipment(a, b);
    expect(m.routineDraft).toEqual(draft('Bob'));   // life: the newer copy's, whatever the list says
    expect(ids(m.inspections)).toEqual(['i1', 'i2']);
    expect(ids(m.anomalies)).toEqual(['a1']);
    expect(m.id).toBe('e1');   // the key of the record stays the newer copy's, whatever the list says
    expect(m.gone).toEqual(['g1', 'g2']);
    expect(m.touched!.every(x => typeof x === 'string')).toBe(true);
    expect(Object.hasOwn(m, 'constructor') || Object.hasOwn(m, 'toString')).toBe(false);
    expect(m.name).toBe('Alice');   // the one field of the list that is a field: typed by Alice only
    expect((m as unknown as Record<string, unknown>).hacked).toBeUndefined();
    expect(Object.getPrototypeOf(m)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });
  it('does the same for a part: the place and the supplier Alice typed stay, the take of Bob stays, the stock is counted once', () => {
    const base0 = sp({ stock: 2, moves: [], place: 'Tiroir 1', supplier: 'Acme', min: 1 });
    const a: Spare = { ...base0, place: 'Tiroir 9', min: 4, touched: ['place', 'min'] };
    const b: Spare = { ...takeOut(base0, 'Bob', { at: T1 }), touched: [] };
    for (const m of [mergeSpare(a, b), mergeSpare(b, a)]) {
      expect(m).toMatchObject({ place: 'Tiroir 9', min: 4, supplier: 'Acme', stock: 1 });
      expect(m.moves).toHaveLength(1);
      expect(m.moves![0].by).toBe('Bob');
      expect([...m.touched!].sort()).toEqual(['min', 'place']);
    }
    // both typed the same field: the newer; a copy without the list: the newer copy whole
    expect(mergeSpare({ ...a, touched: ['place'] }, { ...b, place: 'Tiroir 3', touched: ['place'] }).place).toBe('Tiroir 3');
    const old = { ...b } as Spare;
    delete old.touched;
    expect(mergeSpare(a, old)).toMatchObject({ place: 'Tiroir 1', min: 1 });
    // the stock, the movements, the order and the count are life: the list never takes them
    const m = mergeSpare({ ...a, order: { qty: 2, at: T0, expectedAt: '' }, countedBy: 'Alice', touched: ['stock', 'moves', 'order', 'countedBy', 'place'] }, { ...b, countedBy: 'Bob' });
    expect(m).toMatchObject({ stock: 1, place: 'Tiroir 9', countedBy: 'Bob' });
    expect(m.order).toBeUndefined();
    expect(m.moves).toHaveLength(1);
  });
});

describe('3.3 a retirement and a return to service, merged (V-08)', () => {
  const retired = (at: string, note = 'Vendue') => retireEquipment(eq({ id: 'e1' }), at, note);
  const back = (e: Equipment, at: string) => reinstateEquipment(e, at);
  it('says when the equipment was put back, and a new retirement takes that off', () => {
    const r = retired('2026-10-01'), b = back(r, '2026-10-03T09:30');
    expect(b).toMatchObject({ reinstatedAt: '2026-10-03T09:30' });
    expect('retiredAt' in b).toBe(false);
    expect('retiredNote' in b).toBe(false);
    expect(eqStatus(b)).toBe('service');
    expect(reinstateEquipment(r).reinstatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const again = retireEquipment(b, '2026-10-04', 'Encore');
    expect(again).toMatchObject({ retiredAt: '2026-10-04', retiredNote: 'Encore' });
    expect('reinstatedAt' in again).toBe(false);
    expect('reinstatedAt' in r).toBe(false);
  });
  it('keeps a retirement when the other copy is a stale one that knows nothing of it, whichever was written last', () => {
    const r = retired('2026-10-01'), stale = routine(eq({ id: 'e1' }), '2026-10-05', 'Bob');
    for (const m of [mergeEquipment(r, stale), mergeEquipment(stale, r)]) {
      expect(m).toMatchObject({ retiredAt: '2026-10-01', retiredNote: 'Vendue' });
      expect(eqStatus(m)).toBe('retired');
      expect(m.inspections).toHaveLength(1);
    }
    // of two retirements, the newer copy's
    expect(mergeEquipment(retired('2026-10-01', 'A'), retired('2026-10-02', 'B'))).toMatchObject({ retiredAt: '2026-10-02', retiredNote: 'B' });
    expect(mergeEquipment(retired('2026-10-02', 'B'), retired('2026-10-01', 'A'))).toMatchObject({ retiredAt: '2026-10-01', retiredNote: 'A' });
  });
  it('does not keep a retirement older than the return to service, whichever copy holds which', () => {
    const r = retired('2026-10-01'), b = back(r, '2026-10-03T09:30');
    for (const m of [mergeEquipment(r, b), mergeEquipment(b, r)]) {
      expect(eqStatus(m)).toBe('service');
      expect('retiredAt' in m).toBe(false);
      expect('retiredNote' in m).toBe(false);
      expect(m.reinstatedAt).toBe('2026-10-03T09:30');
    }
    // a stale copy of the return to service does not undo a retirement made after it
    const later = retired('2026-10-05', 'Hors d\'usage');
    for (const m of [mergeEquipment(b, later), mergeEquipment(later, b)]) {
      expect(m).toMatchObject({ retiredAt: '2026-10-05', retiredNote: 'Hors d\'usage', reinstatedAt: '2026-10-03T09:30' });
      expect(eqStatus(m)).toBe('retired');
    }
    // the latest of two returns to service is kept
    expect(mergeEquipment(back(r, '2026-10-02T08:00'), back(r, '2026-10-06T08:00')).reinstatedAt).toBe('2026-10-06T08:00');
    expect(mergeEquipment(back(r, '2026-10-06T08:00'), back(r, '2026-10-02T08:00')).reinstatedAt).toBe('2026-10-06T08:00');
  });
  it('on the same day, goes by the order of the copies: the return held by the newer one cancels the retirement of the older one, and the other way round', () => {
    const r = retired('2026-10-03'), b = back(r, '2026-10-03T11:00'), again = retired('2026-10-03', 'Encore');
    expect(eqStatus(mergeEquipment(r, b))).toBe('service');
    expect(eqStatus(mergeEquipment(b, again))).toBe('retired');
    // retired, put back, retired again within the day: the three copies folded in order of time
    const m = [r, b, again].reduce(mergeEquipment);
    expect(m).toMatchObject({ retiredAt: '2026-10-03', retiredNote: 'Encore' });
    // a record that holds both (the result of a merge) is not undone by merging it with itself, nor by a stale copy
    expect(mergeEquipment(m, m)).toEqual(m);
    expect(eqStatus(mergeEquipment(m, eq({ id: 'e1' })))).toBe('retired');
    // put back once more on the same day by the newer copy
    expect(eqStatus(mergeEquipment(m, back(again, '2026-10-03T16:00')))).toBe('service');
  });
  it('keeps the closed stop of a retired equipment even when the other copy still has it open', () => {
    const open = stopEquipment(eq({ id: 'e1' }), 'Alice', '2026-10-01T08:00'), r = retireEquipment(open, '2026-10-02', 'Rebut', '2026-10-02T10:00');
    for (const m of [mergeEquipment(r, routine(open, '2026-10-02', 'Bob')), mergeEquipment(routine(open, '2026-10-02', 'Bob'), r)]) {
      expect(eqStatus(m)).toBe('retired');
      expect(m.stoppedSince).toBeUndefined();
      expect(m.breakdowns![0]).toMatchObject({ endedAt: '2026-10-02T10:00', hours: 26 });
    }
  });
});

// ---- lot 0 ter, N-01: the field typed last stays, whatever the order of the files and the gestures made since
describe('3.3 the stamps of the typed fields: what is typed again later stays (N-01)', () => {
  const U1 = '2026-10-06T10:00:00.000Z', U2 = '2026-10-06T11:00:00.000Z', U3 = '2026-10-06T12:00:00.000Z';
  const base = () => eq({ operator: 'Julien P.', location: 'Atelier principal', deputy: 'Zoé', manager: 'Marc', safety: ['Consigne 1'] });
  // Alice types the place; Bob, who has read it, types it again later; Alice then notes a routine on her sheet (her file keeps the stamp of her first typing)
  const alice = (): Equipment => ({ ...base(), location: 'ALICE-LOC', touched: ['location'], touchedAt: { location: U1 } });
  const bob = (): Equipment => ({ ...base(), location: 'BOB-LOC', touched: ['location'], touchedAt: { location: U2 } });
  const aliceRoutine = (): Equipment => ({ ...routine(alice(), '2026-10-06', 'Alice'), touched: ['location'], touchedAt: { location: U1 } });
  it('keeps the place Bob typed after Alice, whichever file was written last (T1)', () => {
    for (const m of [mergeEquipment(bob(), aliceRoutine()), mergeEquipment(aliceRoutine(), bob()), [alice(), bob(), aliceRoutine()].reduce(mergeEquipment)]) {
      expect(m.location).toBe('BOB-LOC');
      expect(m.touchedAt).toEqual({ location: U2 });
    }
    expect(mergeEquipment(bob(), aliceRoutine()).inspections).toHaveLength(1);
    // the one typed last wins, not the one that wrote last: with the stamps the other way round, Alice stays
    const later = (): Equipment => ({ ...alice(), touchedAt: { location: U3 } });
    for (const m of [mergeEquipment(bob(), later()), mergeEquipment(later(), bob())]) expect(m.location).toBe('ALICE-LOC');
  });
  it('keeps the holder Bob typed, and Alice\'s other fields, when Bob notes a routine later (T2)', () => {
    const a = (): Equipment => ({ ...base(), operator: 'A-OP', location: 'A-LOC', touched: ['operator', 'location'], touchedAt: { operator: U1, location: U1 } });
    const b = (): Equipment => ({ ...base(), operator: 'B-OP', manager: 'B-MGR', touched: ['operator', 'manager'], touchedAt: { operator: U2, manager: U2 } });
    const m = mergeEquipment(a(), { ...routine(b(), '2026-10-06', 'Bob'), touched: [], touchedAt: b().touchedAt });
    expect(m).toMatchObject({ operator: 'B-OP', location: 'A-LOC', manager: 'B-MGR', deputy: 'Zoé' });
    expect(m.inspections).toHaveLength(1);
    expect(m.touchedAt).toEqual({ operator: U2, location: U1, manager: U2 });
  });
  it('still keeps what Alice typed when Bob typed nothing and wrote a routine and a stop (the first case of V-01)', () => {
    const a: Equipment = { ...base(), operator: 'Nouvelle personne', location: 'Nouvel atelier', safety: ['Consigne 1', 'Nouvelle consigne'], touched: ['operator', 'location', 'safety'], touchedAt: { operator: U1, location: U1, safety: U1 } };
    const b: Equipment = { ...stopEquipment(routine(base(), '2026-10-06', 'Bob'), 'Bob', '2026-10-06T09:00'), touched: [], touchedAt: {} };
    for (const m of [mergeEquipment(a, b), mergeEquipment(b, a)]) {
      expect(m).toMatchObject({ operator: 'Nouvelle personne', location: 'Nouvel atelier', safety: ['Consigne 1', 'Nouvelle consigne'], deputy: 'Zoé', stoppedSince: '2026-10-06T09:00' });
      expect(m.inspections).toHaveLength(1);
      expect(m.touchedAt).toEqual({ operator: U1, location: U1, safety: U1 });
      expect([...m.touched!].sort()).toEqual(['location', 'operator', 'safety']);
    }
  });
  it('folds three copies field by field on the stamps, whatever the grouping', () => {
    // `name` typed by A (U1), C (U2) and B (U3): B's wins though C is the last file; `deputy` by C only; `manager` by A only; `location` by A and C: C's (U2 over U1)
    const A: Equipment = { ...base(), name: 'A-NAME', manager: 'A-MGR', location: 'A-LOC', touched: ['name', 'manager', 'location'], touchedAt: { name: U1, manager: U1, location: U1 } };
    const B: Equipment = { ...base(), name: 'B-NAME', touched: ['name'], touchedAt: { name: U3 } };
    const C: Equipment = { ...base(), name: 'C-NAME', deputy: 'C-DEP', location: 'C-LOC', touched: ['name', 'deputy', 'location'], touchedAt: { name: U2, deputy: U2, location: U2 } };
    const m = [A, B, C].reduce(mergeEquipment);
    expect(m).toMatchObject({ name: 'B-NAME', manager: 'A-MGR', deputy: 'C-DEP', location: 'C-LOC' });
    expect(m.touchedAt).toEqual({ name: U3, manager: U1, location: U2, deputy: U2 });
    expect(mergeEquipment(A, mergeEquipment(B, C))).toEqual(m);
    expect([C, A, B].reduce(mergeEquipment)).toMatchObject({ name: 'B-NAME', manager: 'A-MGR', deputy: 'C-DEP', location: 'C-LOC' });
  });
  it('takes the newer copy when the stamps are equal, or when one of the two copies has none (only the list of fields)', () => {
    const a: Equipment = { ...base(), location: 'A-LOC', touched: ['location'], touchedAt: { location: U1 } };
    const same: Equipment = { ...base(), location: 'S-LOC', touched: ['location'], touchedAt: { location: U1 } };
    expect(mergeEquipment(a, same).location).toBe('S-LOC');
    expect(mergeEquipment(same, a).location).toBe('A-LOC');
    const unstamped: Equipment = { ...base(), location: 'U-LOC', touched: ['location'] };   // written before the stamps existed
    expect(mergeEquipment(a, unstamped).location).toBe('U-LOC');
    expect(mergeEquipment(unstamped, a).location).toBe('A-LOC');
    // a field only the older copy touched stays the older copy's, with or without stamps
    expect(mergeEquipment({ ...a, touched: undefined } as Equipment, { ...base(), touched: [] }).location).toBe('A-LOC');
    expect(mergeEquipment(a, { ...base(), touched: [], touchedAt: {} }).location).toBe('A-LOC');
    // a copy that only has stamps (no list of fields) is a copy that says something, with the older's field kept when only it touched it
    const stampsOnly: Equipment = { ...base(), location: 'S-LOC', touchedAt: { location: U1 } };
    const newerOther: Equipment = { ...base(), name: 'Autre nom', touched: ['name'], touchedAt: { name: U2 } };
    expect(mergeEquipment(stampsOnly, newerOther)).toMatchObject({ location: 'S-LOC', name: 'Autre nom' });
    expect(mergeEquipment(stampsOnly, newerOther).touchedAt).toEqual({ location: U1, name: U2 });
    // two copies with empty stamps leave no stamps
    expect('touchedAt' in mergeEquipment({ ...base(), touched: [], touchedAt: {} }, { ...base(), touched: [], touchedAt: {} })).toBe(false);
    // the union of the lists, and no list invented when nobody wrote one
    expect(mergeEquipment(a, { ...base(), name: 'N', touched: ['name'] }).touched).toEqual(['name', 'location']);
    const onlyStamps = (loc: string, at: string): Equipment => ({ ...base(), location: loc, touchedAt: { location: at } });
    const m = mergeEquipment(onlyStamps('X', U1), onlyStamps('Y', U2));
    expect(m.location).toBe('Y');
    expect('touched' in m).toBe(false);
  });
  it('takes the newer copy whole when a copy says nothing at all', () => {
    const none = (): Equipment => ({ ...base(), location: 'N-LOC' });
    expect(mergeEquipment(alice(), none()).location).toBe('N-LOC');
    expect(mergeEquipment(none(), alice()).location).toBe('ALICE-LOC');
    expect(mergeEquipment(alice(), none()).touchedAt).toBeUndefined();
  });
  it('removes a field the later device removed, and keeps a removed one the earlier device removed when the later one did not type it', () => {
    const { deputy: _d, ...without } = base();
    const removedLater: Equipment = { ...without, touched: ['deputy'], touchedAt: { deputy: U2 } };
    const typedEarlier: Equipment = { ...base(), deputy: 'Zoé 2', touched: ['deputy'], touchedAt: { deputy: U1 } };
    for (const m of [mergeEquipment(typedEarlier, removedLater), mergeEquipment(removedLater, typedEarlier)]) expect('deputy' in m).toBe(false);
    const routineOnly: Equipment = { ...routine(base(), '2026-10-06', 'Carol'), touched: [], touchedAt: {} };
    expect('deputy' in mergeEquipment(removedLater, routineOnly)).toBe(false);
    expect('deputy' in mergeEquipment(routineOnly, removedLater)).toBe(false);
  });
  it('ignores stamps that are not stamps, never takes the life or the key from them, and is not polluted by them', () => {
    const polluted = JSON.parse(`{"touchedAt": {"__proto__": "${U3}", "constructor": "${U3}", "inspections": "${U3}", "id": "${U3}", "gone": "${U3}", "name": "${U3}", "location": 5, "deputy": ["${U3}"], "manager": null, "operator": ""}, "touched": [], "__proto__": {"hacked": true}}`) as Record<string, unknown>;
    const a = { ...eq({ id: 'e0', name: 'Alice', location: 'A-LOC', inspections: [ins('i1', '2026-10-01')], gone: ['g1'] }), ...polluted } as Equipment;
    const b: Equipment = { ...eq({ id: 'e1', name: 'Bob', location: 'B-LOC', deputy: 'B-DEP', manager: 'B-MGR', operator: 'B-OP', inspections: [ins('i2', '2026-10-02')], gone: ['g2'] }), touched: [], touchedAt: { name: U1 } };
    const m = mergeEquipment(a, b);
    expect(m).toMatchObject({ id: 'e1', name: 'Alice', location: 'B-LOC', deputy: 'B-DEP', manager: 'B-MGR', operator: 'B-OP', gone: ['g1', 'g2'] });   // only `name` is a usable stamp, and it is the later
    expect(ids(m.inspections)).toEqual(['i1', 'i2']);
    expect(m.touchedAt).toEqual({ name: U3 });
    expect(Object.getPrototypeOf(m)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(m.touchedAt)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });
  it('does the same for a part: the place Bob typed after Alice stays whichever file is the newest, the stock is counted once', () => {
    const base0 = sp({ stock: 2, moves: [], place: 'Tiroir 1', supplier: 'Acme', min: 1 });
    const a: Spare = { ...base0, place: 'Tiroir A', touched: ['place'], touchedAt: { place: U1 } };
    const b: Spare = { ...base0, place: 'Tiroir B', touched: ['place'], touchedAt: { place: U2 } };
    const aTakes: Spare = { ...takeOut(a, 'Alice', { at: T1 }), touched: ['place'], touchedAt: { place: U1 } };   // Alice takes a part afterwards: her file keeps her stamp
    for (const m of [mergeSpare(b, aTakes), mergeSpare(aTakes, b), [a, b, aTakes].reduce(mergeSpare)]) {
      expect(m).toMatchObject({ place: 'Tiroir B', stock: 1, supplier: 'Acme' });
      expect(m.moves).toHaveLength(1);
      expect(m.touchedAt).toEqual({ place: U2 });
    }
    // the stamps never take the stock, the movements or the count
    const life: Spare = { ...base0, stock: 9, countedBy: 'X', touched: [], touchedAt: { stock: U3, moves: U3, countedBy: U3, place: U1 } };
    const n = mergeSpare(life, { ...base0, stock: 2, touched: [], touchedAt: { place: U1 } });
    expect(n.stock).toBe(2);
    expect(n.countedBy).toBeUndefined();
  });
});

// ---- lot 0 ter, N-05: the retirements that ended are kept as pauses
describe('3.3 the pauses of an equipment put back in service (N-05)', () => {
  const retiredEq = () => retireEquipment(eq({ id: 'e1' }), '2026-06-01', 'Vendue');
  const P1 = { from: '2026-06-01', to: '2026-09-28T09:00' }, P2 = { from: '2025-02-03', to: '2025-02-10T08:00' };
  it('closes the retirement as a pause when the equipment is put back, once', () => {
    const b = reinstateEquipment(retiredEq(), '2026-09-28T09:00');
    expect(b.pauses).toEqual([P1]);
    expect(reinstateEquipment(b, '2026-10-01T09:00').pauses).toEqual([P1]);   // already in service: nothing to close
    expect(reinstateEquipment(eq({ id: 'e1' }), '2026-10-01T09:00').pauses).toBeUndefined();
    const again = reinstateEquipment(retireEquipment(b, '2026-11-02', 'Panne définitive'), '2026-11-09T08:00');
    expect(again.pauses).toEqual([P1, { from: '2026-11-02', to: '2026-11-09T08:00' }]);
  });
  it('tells two pauses that begin the same day apart by their end', () => {
    const a = { ...eq({ id: 'e1' }), pauses: [{ from: '2026-06-01', to: '2026-06-10T08:00' }] }, b = { ...eq({ id: 'e1' }), pauses: [{ from: '2026-06-01', to: '2026-09-28T09:00' }] };
    expect(mergeEquipment(a, b).pauses).toHaveLength(2);
    expect(mergeEquipment(b, a).pauses).toHaveLength(2);
  });
  it('merges the pauses of two copies by their two dates, once each, the oldest first, without the ones removed on purpose', () => {
    const a = { ...eq({ id: 'e1' }), pauses: [P1] }, b = { ...eq({ id: 'e1' }), pauses: [P2, P1] };
    for (const m of [mergeEquipment(a, b), mergeEquipment(b, a)]) expect(m.pauses).toEqual([P2, P1]);
    expect(mergeEquipment(eq({ id: 'e1' }), a).pauses).toEqual([P1]);
    expect('pauses' in mergeEquipment(eq({ id: 'e1' }), eq({ id: 'e1' }))).toBe(false);
    const dropped = { ...a, gone: [`${P1.from}|${P1.to}`] };
    expect(mergeEquipment(dropped, b).pauses).toEqual([P2]);
    // a stale copy of the retirement does not undo the pause kept by the copy that put it back
    const m = mergeEquipment(retiredEq(), reinstateEquipment(retiredEq(), '2026-09-28T09:00'));
    expect(eqStatus(m)).toBe('service');
    expect(m.pauses).toEqual([P1]);
  });
  it('is part of the life: a stale sheet does not erase it, and it is not a typed field', () => {
    const saved = reinstateEquipment(retiredEq(), '2026-09-28T09:00');
    expect(takeLife({ ...eq({ id: 'e1', name: 'Renommée' }) }, saved).pauses).toEqual([P1]);
    expect('pauses' in takeLife({ ...eq({ id: 'e1' }), pauses: [P2] }, eq({ id: 'e1' }))).toBe(false);
    const polluted = { ...eq({ id: 'e1' }), touched: ['pauses'], touchedAt: { pauses: '2026-10-07T00:00:00.000Z' } } as Equipment;
    expect(mergeEquipment(polluted, { ...saved, touched: [], touchedAt: {} }).pauses).toEqual([P1]);
  });
  it('is undone with the return to service and only with it: a pause added elsewhere meanwhile stays', () => {
    const before = retiredEq(), after = reinstateEquipment(before, '2026-09-28T09:00');
    const elsewhere = { ...after, pauses: [...after.pauses!, { from: '2026-12-01', to: '2026-12-03T08:00' }] };
    const undone = revertEquipment(elsewhere, before, after);
    expect(undone.pauses).toEqual([{ from: '2026-12-01', to: '2026-12-03T08:00' }]);
    expect(undone).toMatchObject({ retiredAt: '2026-06-01', retiredNote: 'Vendue' });
    expect('reinstatedAt' in undone).toBe(false);
    const plain = revertEquipment(after, before, after);
    expect(plain.pauses).toEqual([]);
    expect(eqStatus(plain)).toBe('retired');
    // what was merged in from a stale copy that still has the pause does not bring it back
    expect(mergeEquipment({ ...after, gone: plain.gone }, plain).pauses ?? []).toEqual([]);
  });
});
