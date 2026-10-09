// Reading data that are incomplete or damaged (a person edited a file, a sync stopped half-way): never fatal, the screens read what they expect.
import { describe, expect, it } from 'vitest';
import { isState, normalize } from './migrate';
import { demoState } from './templates';
import { safeBadge, toolBadge } from './status';
import { PROCESSES, toolsOf } from '../ui/tools';
import { allTasks } from './tasks';
import { maintInsights, maintSummary, maintTodos } from './maintenanceAll';
import { maintFeeds } from './maintenanceFeeds';
import { feeds } from './feeds';
import { deliveryState } from './receptions';
import { receptionInsights, receptionSummary, receptionTodos } from './receptionsAll';
import { RECEPTION_EXAMPLE_LEVEL } from './receptionsExamples';
import type { State } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
const damaged = () => {
  const s = structuredClone(demoState()) as any;
  s.spares.bad = { id: 'bad' };
  s.spares.worse = { id: 'worse', name: 3, stock: 'x', min: null, equipmentIds: 'eq_demo_cnc', moves: 'x', supplier: null };
  s.equipments.gone = null;
  s.equipments.text = 'texte';
  s.equipments.bare = { id: 'bare' };
  s.equipments.eq_demo_cnc.anomalies = {};
  s.equipments.eq_demo_plieuse.checkpoints = null;
  delete s.equipments.eq_demo_compresseur.inspections;
  s.equipments.eq_demo_chariot.inspections = [{ date: '2026-10-01', by: 'a', note: '' }, null];          // a routine without results, a null routine
  s.equipments.eq_demo_cabine.breakdowns = 'x';
  return s as State;
};

describe('normalize on incomplete or damaged records', () => {
  it('never throws, and fills what the screens read', () => {
    const n = normalize(damaged());
    const bad = n.spares.bad, worse = n.spares.worse;
    expect([bad.name, bad.ref, bad.supplier, bad.equipmentIds, bad.moves, bad.stock, bad.min]).toEqual(['', '', '', [], [], 0, 1]);
    expect([worse.name, worse.supplier, worse.equipmentIds, worse.moves, worse.stock, worse.min]).toEqual(['', '', [], [], 0, 1]);
    for (const k of ['gone', 'text', 'bare']) {
      const e = n.equipments[k];
      expect([e.id, e.name, e.location, e.operator, e.manager, e.riskId, e.checkpoints, e.inspections, e.parts]).toEqual([k, '', '', '', '', '', [], [], []]);
    }
    expect(n.equipments.eq_demo_cnc.anomalies).toEqual([]);
    expect(n.equipments.eq_demo_plieuse.checkpoints).toEqual([]);
    expect(n.equipments.eq_demo_compresseur.inspections).toEqual([]);
    expect(n.equipments.eq_demo_chariot.inspections).toHaveLength(1);
    expect(n.equipments.eq_demo_chariot.inspections[0].results).toEqual([]);
    expect(n.equipments.eq_demo_cabine.breakdowns).toEqual([]);
  });
  it('the home screen and the tasks are computed on it', () => {
    const n = normalize(damaged());
    const now = new Date(2026, 9, 6);
    expect(() => { maintSummary(n, now); maintInsights(n, now); allTasks(n); }).not.toThrow();
    for (const p of PROCESSES) for (const t of toolsOf(p.key)) {
      expect(() => toolBadge(n, t.id, '2026-10', now)).not.toThrow();
      expect(safeBadge(n, t.id, '2026-10', now).text).toBeTruthy();
    }
  });
  it('a tool whose status cannot be computed says so instead of stopping the home screen', () => {
    expect(() => toolBadge(null as unknown as State, '3.3', '2026-10')).toThrow();
    expect(safeBadge(null as unknown as State, '3.3', '2026-10')).toEqual({ n: 0, tone: 'pending', text: 'À vérifier' });
  });
  it('a point without id takes cp<index> only when it is free', () => {
    const s = structuredClone(demoState()) as any;
    s.equipments.eq_x = { id: 'eq_x', name: 'X', checkpoints: [{ label: 'a' }, { label: 'b', id: 'cp0' }, { label: 'c' }] };   // cp0 is already used by the second point
    const ids: string[] = normalize(s).equipments.eq_x.checkpoints.map(c => c.id!);
    expect(ids[0]).toMatch(/^pt_/);
    expect(ids.slice(1)).toEqual(['cp0', 'cp2']);
    expect(new Set(ids).size).toBe(3);
  });
  it('well-formed equipment and parts are read as they are', () => {
    const s = demoState(), n = normalize(structuredClone(s));
    expect(n.equipments).toEqual(s.equipments);
    expect(n.spares).toEqual(s.spares);
  });
});

// A record that is null, a text, a list or empty must never stop the reading, in any collection (audit V-06)
const DEMO = demoState();   // built once: each case works on a copy
describe('normalize on a damaged collection', () => {
  const COLLECTIONS = ['contacts', 'risks', 'quotes', 'complaints', 'feedbacks', 'suppliers', 'debits', 'sectors', 'sops', 'equipments', 'spares', 'deliveries', 'powers',
    'people', 'skills', 'newcomers', 'chronos', 'ncs', 'analyses', 'pokas', 'orgs'] as const;
  const BAD: [string, unknown][] = [['null', null], ['a text', 'x'], ['a list', []], ['a number', 5], ['an empty object', {}], ['an empty object in a list', [{}]]];
  it.each(COLLECTIONS.flatMap(c => BAD.map(([n, v]) => [c, n, v] as const)))('%s with a record that is %s: reads, and the other records stay', (col, _, bad) => {
    const s = structuredClone(DEMO) as any;
    const first = Object.keys(s[col])[0], count = Object.keys(s[col]).length;
    s[col].bad = bad;
    const n = normalize(s) as any;
    expect(Object.keys(n[col]).length).toBeGreaterThanOrEqual(count);
    expect(n[col][first]).toBeDefined();
    Object.values(n[col]).forEach((r: any) => expect(r && typeof r === 'object').toBe(true));   // what remains is records
  });
  it('a collection that is not an object is an empty one', () => {
    const s = structuredClone(DEMO) as any;
    for (const c of COLLECTIONS) s[c] = c === 'equipments' ? [] : 'x';
    const n = normalize(s) as any;
    for (const c of COLLECTIONS) expect(Object.values(n[c]).every(r => r && typeof r === 'object'), c).toBe(true);
  });
  it('a record that has no id takes its key', () => {
    const s = structuredClone(DEMO) as any;
    s.suppliers.sx = { name: 'Sans id' }; s.contacts.cx = { name: 'Sans id' }; s.ncs.nx = {};
    const n = normalize(s) as any;
    expect([n.suppliers.sx.id, n.contacts.cx.id, n.ncs.nx.id]).toEqual(['sx', 'cx', 'nx']);
    expect(n.contacts.cx.category).toBe('autre');
  });
  it('a damaged order is read as an empty one (upgradeDelivery no longer throws, lot 0 of 3.4), the others are done', () => {
    const s = structuredClone(DEMO) as any;
    s.deliveries.dx = { id: 'dx', milestones: 'x' };
    const n = normalize(s) as any;
    expect(n.deliveries.dx.milestones).toEqual([]);
    expect(n.equipments.eq_demo_cnc.checkpoints.length).toBeGreaterThan(0);
    expect(Object.keys(n.spares)).toEqual(Object.keys(DEMO.spares));
  });
  it('data that are sound stay as they are: reading twice gives the same as reading once', () => {
    const once = normalize(structuredClone(DEMO));
    expect(normalize(structuredClone(once))).toEqual(once);
  });
});

describe('normalize on damaged parts of an equipment', () => {
  const eq = (over: Record<string, unknown>) => { const s = structuredClone(DEMO) as any; s.equipments.eq_x = { id: 'eq_x', name: 'X', checkpoints: [], inspections: [], ...over }; return s as State; };
  it('parts with a null or a text in the list (the old format of the parts per machine) do not stop the reading, the real part moves to the cabinet', () => {
    const n = normalize(eq({ parts: [null, 'x', { name: 'Joint torique', ref: 'JT-1', stock: 3, min: 1 }, {}] }));
    expect(n.equipments.eq_x.parts).toEqual([]);                                                   // moved
    expect(Object.values(n.spares).some(p => p.name === 'Joint torique' && p.equipmentIds.includes('eq_x'))).toBe(true);
    expect(() => normalize(eq({ parts: [null] }))).not.toThrow();
  });
  it('a check has a label and an id; a null line of history, a null reservation, a check life that is not a record are read', () => {
    const n = normalize(eq({
      tasks: [{ label: null, everyDays: 30, lastDone: '', legal: false }, { id: 'tk_2', everyDays: 30, lastDone: '', legal: false }, { id: 'tk_3', label: 'Ok', everyDays: 30, lastDone: '', legal: false }, null],
      checkLife: { tk_2: { history: [null, { date: '2026-10-01', by: 'A', result: 'ok', note: '' }, 'x'], reserves: [null, { id: 'rs_1' }] }, tk_3: { history: null, reserves: null }, tk_4: null, tk_5: 'x', tk_6: { plannedAt: '2026-11-01' } },
    }));
    const e = n.equipments.eq_x;
    expect(e.tasks!.map(t => t.label)).toEqual(['', '', 'Ok']);
    expect(e.tasks![0].id).toMatch(/^tk_/);
    expect(e.tasks![1].id).toBe('tk_2');
    expect(e.checkLife!.tk_2.history).toHaveLength(1);
    expect(e.checkLife!.tk_2.reserves).toEqual([{ id: 'rs_1' }]);
    expect([e.checkLife!.tk_3.history, e.checkLife!.tk_3.reserves]).toEqual([[], []]);
    expect(e.checkLife!.tk_6.history).toEqual([]);
    expect(e.checkLife!.tk_6.reserves).toBeUndefined();                                            // absent stays absent
    expect(Object.keys(e.checkLife!).sort()).toEqual(['tk_2', 'tk_3', 'tk_6']);
  });
  it('the id given to a check without one is the same for two checks only by chance of the clock: never', () => {
    const e = normalize(eq({ tasks: [{ label: 'a' }, { label: 'b' }] })).equipments.eq_x;
    expect(new Set(e.tasks!.map(t => t.id)).size).toBe(2);
  });
  it('the screens and the tasks are computed on all of it', () => {
    const n = normalize(eq({ tasks: [{ label: null }, null], checkLife: { x: { history: [null] } }, parts: [null], inspections: [null, { date: '2026-10-01', by: 'a', note: '' }] }));
    const now = new Date(2026, 9, 6);
    expect(() => { maintSummary(n, now); maintInsights(n, now); allTasks(n); toolBadge(n, '3.3', '2026-10', now); }).not.toThrow();
  });
});

// The root of a state: what a screen reads without a guard
describe('the root of a state', () => {
  it('a state that has none of it is completed when it is put back (a copy of unreadable data)', () => {
    for (const raw of [{}, null, 'x', [], { timeline: null, settings: null, processes: 'x', kpis: [], values: null, actions: 3, risks: 'x', contacts: [] }, { timeline: {} }]) {
      const n = normalize(raw as unknown as State);
      expect(isState(n), JSON.stringify(raw)).toBe(true);
      expect([typeof n.timeline.start, Array.isArray(n.processes), n.kpis && typeof n.kpis, typeof n.values, typeof n.actions, typeof n.risks, typeof n.contacts]).toEqual(['string', true, 'object', 'object', 'object', 'object', 'object']);
    }
  });
  it('what is there is kept', () => {
    const s = structuredClone(DEMO);
    const n = normalize({ settings: s.settings, timeline: s.timeline, processes: s.processes, kpis: s.kpis } as State);
    expect(n.settings).toEqual(s.settings);
    expect(n.timeline).toEqual(s.timeline);
    expect(n.processes).toEqual(s.processes);
  });
  it('isState: settings, timeline (two texts), processes (a list) and kpis (an object)', () => {
    const s = demoState();
    expect(isState(s)).toBe(true);
    for (const x of [null, [], 3, {}, { ...s, timeline: null }, { ...s, timeline: { start: 1, end: 2 } }, { ...s, settings: null }, { ...s, processes: {} }, { ...s, kpis: null }, { ...s, kpis: [] }]) expect(isState(x)).toBe(false);
  });
});

// Fields of the wrong type (audit N-06): a value that is not a text where the screens cut, compare or read a text, a date that is not one, a number that is not one
// used to stop the page of 3.3 and the tasks of everyone. They read as the record without the field, from the reading on.
describe('normalize on scalar fields of the wrong type (equipment and parts of 3.3)', () => {
  const CNC = 'eq_demo_cnc', SRV = 'eq_demo_serveur', SP = 'sp_demo_electrovanne', SC = 'sp_demo_courroie';
  const now = new Date(2026, 9, 6, 10, 0), period = '2026-10';
  // [what it is, where, kind of value that the field must have afterwards]
  const TEXTS: [string, string[]][] = [
    ['contract.until', ['equipments', CNC, 'contract', 'until']], ['contract.provider', ['equipments', CNC, 'contract', 'provider']], ['deputy', ['equipments', CNC, 'deputy']],
    ['stoppedSince', ['equipments', SRV, 'stoppedSince']], ['retiredAt', ['equipments', CNC, 'retiredAt']], ['group', ['equipments', CNC, 'group']], ['serial', ['equipments', CNC, 'serial']],
    ['name', ['equipments', CNC, 'name']], ['location', ['equipments', CNC, 'location']], ['operator', ['equipments', CNC, 'operator']], ['manager', ['equipments', CNC, 'manager']],
    ['anomaly.dueAt', ['equipments', SRV, 'anomalies', '0', 'dueAt']], ['anomaly.date', ['equipments', SRV, 'anomalies', '0', 'date']], ['anomaly.handler', ['equipments', SRV, 'anomalies', '0', 'handler']],
    ['anomaly.label', ['equipments', SRV, 'anomalies', '0', 'label']], ['anomaly.note', ['equipments', SRV, 'anomalies', '0', 'note']], ['anomaly.closedAt', ['equipments', SRV, 'anomalies', '0', 'closedAt']],
    ['anomaly.waitingFor', ['equipments', SRV, 'anomalies', '0', 'waitingFor']], ['anomaly.nature', ['equipments', SRV, 'anomalies', '0', 'nature']],
    ['breakdown.cause', ['equipments', CNC, 'breakdowns', '0', 'cause']], ['breakdown.date', ['equipments', CNC, 'breakdowns', '0', 'date']], ['breakdown.startedAt', ['equipments', CNC, 'breakdowns', '0', 'startedAt']],
    ['breakdown.endedAt', ['equipments', CNC, 'breakdowns', '0', 'endedAt']], ['breakdown.note', ['equipments', CNC, 'breakdowns', '0', 'note']],
    ['inspection.date', ['equipments', CNC, 'inspections', '0', 'date']], ['inspection.by', ['equipments', CNC, 'inspections', '0', 'by']], ['inspection.note', ['equipments', CNC, 'inspections', '0', 'note']],
    ['checkpoint.label', ['equipments', CNC, 'checkpoints', '0', 'label']], ['checkpoint.criterion', ['equipments', CNC, 'checkpoints', '0', 'criterion']],
    ['check.label', ['equipments', CNC, 'tasks', '0', 'label']], ['check.lastDone', ['equipments', CNC, 'tasks', '0', 'lastDone']],
    ['spare.name', ['spares', SC, 'name']], ['spare.supplier', ['spares', SC, 'supplier']], ['spare.expiresAt', ['spares', SC, 'expiresAt']], ['spare.countedAt', ['spares', SC, 'countedAt']],
    ['spare.countedBy', ['spares', SC, 'countedBy']], ['spare.place', ['spares', SC, 'place']], ['spare.order.at', ['spares', SP, 'order', 'at']], ['spare.order.expectedAt', ['spares', SP, 'order', 'expectedAt']],
    ['move.at', ['spares', SC, 'moves', '0', 'at']], ['move.by', ['spares', SC, 'moves', '0', 'by']],
  ];
  const NUMBERS: [string, string[]][] = [
    ['spare.min', ['spares', SC, 'min']], ['spare.stock', ['spares', SC, 'stock']], ['spare.leadDays', ['spares', SC, 'leadDays']], ['spare.order.qty', ['spares', SP, 'order', 'qty']],
    ['move.delta', ['spares', SC, 'moves', '0', 'delta']], ['breakdown.hours', ['equipments', CNC, 'breakdowns', '0', 'hours']], ['breakdown.cost', ['equipments', CNC, 'breakdowns', '0', 'cost']],
    ['checkpoint.min', ['equipments', CNC, 'checkpoints', '0', 'min']],
  ];
  const WRONG_TEXT: [string, unknown][] = [['a list', []], ['an object', {}], ['a number', 0], ['null', null]];
  const WRONG_NUMBER: [string, unknown][] = [['a text', 'x'], ['a list', []], ['an object', {}], ['null', null], ['not a number', NaN]];
  const at = (s: any, path: string[]) => path.slice(0, -1).reduce((o, k) => o?.[k], s);
  const build = (path: string[], v: unknown) => {
    const s = structuredClone(DEMO) as any, o = at(s, path), k = path[path.length - 1];
    if (o === undefined) throw new Error(`the example has no ${path.join('.')}`);
    if (v === undefined) delete o[k]; else o[k] = v;
    return s as State;
  };
  // everything the page of 3.3, the tasks of everyone, the home screen and the figures offered to 1.1 compute
  const battery = (n: State) => ({ todos: maintTodos(n, now), insights: maintInsights(n, now), summary: maintSummary(n, now), feeds: maintFeeds(n, period, now), tasks: allTasks(n, now), all: feeds(n, period, now), badge: toolBadge(n, '3.3', period, now), badge11: toolBadge(n, '1.1', period, now) });
  const json = (x: unknown) => JSON.stringify(x);

  it('the example has the records these cases change', () => {
    for (const [, path] of [...TEXTS, ...NUMBERS]) expect(at(DEMO, path), path.join('.')).toBeDefined();
  });
  it.each(TEXTS.flatMap(([n, path]) => WRONG_TEXT.map(([w, v]) => [n, w, path, v] as const)))('%s as %s: reads as no text, nothing falls', (_, __, path, v) => {
    const n = normalize(build(path, v)), got = at(n, path)?.[path[path.length - 1]];
    expect(got === undefined || typeof got === 'string').toBe(true);
    expect(() => battery(n)).not.toThrow();
  });
  it.each(NUMBERS.flatMap(([n, path]) => WRONG_NUMBER.map(([w, v]) => [n, w, path, v] as const)))('%s as %s: reads as a number (or null), nothing falls', (_, __, path, v) => {
    const n = normalize(build(path, v)), got = at(n, path)?.[path[path.length - 1]];
    expect(got === null || (typeof got === 'number' && Number.isFinite(got))).toBe(true);
    expect(() => battery(n)).not.toThrow();
  });
  // the fields the audit lists: the answers are those of the record without the field
  const SAME = ['contract.until', 'contract.provider', 'deputy', 'stoppedSince', 'anomaly.dueAt', 'anomaly.handler', 'breakdown.cause', 'spare.expiresAt', 'spare.countedAt', 'move.at'];
  it.each(TEXTS.filter(([n]) => SAME.includes(n)))('%s that is not a text answers as the record without the field', (name, path) => {
    const without = json(battery(normalize(build(path, undefined))));
    for (const [w, v] of WRONG_TEXT) expect(json(battery(normalize(build(path, v)))), `${name} as ${w}`).toBe(without);
  });
  it.each(['spare.min', 'spare.stock', 'spare.leadDays'])('%s that is not a number answers as the part without it', name => {
    const path = NUMBERS.find(([n]) => n === name)![1], without = json(battery(normalize(build(path, undefined))));
    for (const [w, v] of WRONG_NUMBER) expect(json(battery(normalize(build(path, v)))), `${name} as ${w}`).toBe(without);
  });
  it('a spare order that is not a record is no order; one that has the wrong types is read', () => {
    for (const bad of ['x', [], 5, null]) expect(normalize(build(['spares', SP, 'order'], bad)).spares[SP].order).toBeUndefined();
    const o = normalize(build(['spares', SP, 'order'], { qty: 'deux', at: 5, expectedAt: [] })).spares[SP].order!;
    expect([o.qty, o.at, o.expectedAt]).toEqual([0, '', '']);
  });
  it('a frequency that is not one is no frequency, an unknown unit counts in days, a routine or a kind that is not one is the default', () => {
    const t = (every: unknown) => normalize(build(['equipments', CNC, 'tasks', '0', 'every'], every)).equipments[CNC].tasks![0].every;
    expect([t('x'), t(null), t([]), t({ value: 'a', unit: 'mois' }), t({ value: 0, unit: 'mois' }), t({ value: NaN, unit: 'mois' })]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    expect(t({ value: 2, unit: 'x' })).toEqual({ value: 2, unit: 'j' });
    expect(t({ value: 3, unit: 'mois' })).toEqual({ value: 3, unit: 'mois' });
    const e = (k: string, v: unknown) => normalize(build(['equipments', CNC, k], v)).equipments[CNC] as unknown as Record<string, unknown>;
    expect([e('routine', 5).routine, e('routine', { every: 'x', day: 1 }).routine, e('routine', { every: 'week', day: 'a' }).routine]).toEqual([undefined, undefined, { every: 'week' }]);
    expect([e('kind', 'zzz').kind, e('kind', 5).kind, e('kind', 'vehicle').kind]).toEqual([undefined, undefined, 'vehicle']);
    expect([e('pin', { x: 'a', y: 1 }).pin, e('pin', 'x').pin, e('pin', { x: 0.2, y: 0.4 }).pin]).toEqual([undefined, undefined, { x: 0.2, y: 0.4 }]);
    expect([e('contract', 'x').contract, e('contract', []).contract]).toEqual([undefined, undefined]);
    expect([e('safety', 'x').safety, e('safety', [1, 'ok', null]).safety]).toEqual([[], ['ok']]);
    expect([e('pauses', 'x').pauses, e('pauses', [{ from: '2026-01-01', to: '2026-02-01' }, { from: 1 }, null]).pauses]).toEqual([[], [{ from: '2026-01-01', to: '2026-02-01' }]]);
  });
  it('the forms of the audit script (23) and of its fuzz: reading twice gives the same as reading once', () => {
    for (const [, path] of [...TEXTS, ...NUMBERS]) {
      const once = normalize(build(path, { bad: true }));
      expect(normalize(structuredClone(once))).toEqual(once);
    }
  });
});

// ---- lot 6 of 3.4 (X-15): one damaged order stops neither the tool nor the other orders
describe('normalize on damaged orders of 3.4 (X-15)', () => {
  const now = new Date(2026, 9, 7, 10, 0), DEMO34 = demoState(now);
  // what the screens of the tool read of every order: the summary, the queue, the facts, the state of each
  const read = (s: State) => { receptionSummary(s, now); receptionTodos(s, now); receptionInsights(s, now); Object.values(s.deliveries).forEach(d => deliveryState(d, now, s.params)); };
  it('an order without milestones nor reception, a null, a text: the tool opens, the others are as they were, the damaged one is an empty order', () => {
    const s = structuredClone(DEMO34) as any;
    s.deliveries.dx = { id: 'dx', ref: 'X', client: 'Client' };   // no milestones, no reception, nothing else
    s.deliveries.dn = null; s.deliveries.ds = 'texte';
    const n = normalize(s);
    expect(n.deliveries.dx).toMatchObject({ id: 'dx', ref: 'X', milestones: [], reception: { result: '' } });
    expect(Object.keys(n.deliveries).sort()).toEqual([...Object.keys(DEMO34.deliveries), 'dx'].sort());
    Object.keys(DEMO34.deliveries).forEach(id => expect(n.deliveries[id], id).toEqual(DEMO34.deliveries[id]));   // sound: not touched, the mark of the example included
    expect(n.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    expect(() => read(n)).not.toThrow();
    expect(normalize(structuredClone(n))).toEqual(n);
  });
  it('a text that is not a text (a number, a record, a list, true, null) in a field of an order, of its reception, of a reservation, of a milestone or of its history is read as no text, and nothing stops', () => {
    const paths = ['reception.refusal.next', 'reception.refusal.photo', 'promisedAt', 'releasedMoment', 'pvPhoto', 'reception.pvNo', 'reception.place', 'reception.email', 'reception.signTz', 'reception.reserves.0.handler', 'reception.reserves.1.where',
      'reception.reserves.0.liftedBy', 'milestones.1.sopId', 'milestones.2.second', 'milestones.0.history.0.note', 'journal.3.by', 'journal.2.text', 'shipChecks.0.by', 'lots.0.releasedMoment', 'lots.0.reception.pvNo'];
    const wrong: unknown[] = [null, 7, {}, [], true];
    const at = (o: any, path: string) => { const k = path.split('.'); const last = k.pop()!; return [k.reduce((x, key) => x?.[key], o), last] as const; };
    paths.forEach(path => wrong.forEach(w => {
      const s = structuredClone(DEMO34) as any;
      const id = path.startsWith('lots') ? 'dl_demo_13' : path.includes('refusal') ? 'dl_demo_12' : 'dl_demo_2', [parent, key] = at(s.deliveries[id], path);
      expect(parent, path).toBeTruthy();
      parent[key] = structuredClone(w);
      const n = normalize(s);
      expect(() => read(n), `${path} = ${JSON.stringify(w)}`).not.toThrow();
      const [got, k2] = at(n.deliveries[id], path);
      expect(typeof got?.[k2] === 'string' || got?.[k2] === undefined, `${path} = ${JSON.stringify(w)}`).toBe(true);
      Object.keys(DEMO34.deliveries).filter(x => x !== id).forEach(x => expect(n.deliveries[x], x).toEqual(DEMO34.deliveries[x]));
    }));
  });
  it('a refusal that is not a record is left out; one without its words gets empty ones (the refused delivery is still read)', () => {
    [null, 'x', 7, [], true, {}].forEach(w => {
      const s = structuredClone(DEMO34) as any;
      s.deliveries.dl_demo_12.reception.refusal = structuredClone(w);
      s.deliveries.dl_demo_13.lots[0].reception.refusal = structuredClone(w);
      const n = normalize(s);
      expect(() => read(n), JSON.stringify(w)).not.toThrow();
      [n.deliveries.dl_demo_12.reception.refusal, n.deliveries.dl_demo_13.lots![0].reception.refusal].forEach(r => expect(r === undefined || r === null || (typeof r === 'object' && typeof r.reason === 'string' && typeof r.next === 'string'), JSON.stringify(w)).toBe(true));
    });
  });
});
