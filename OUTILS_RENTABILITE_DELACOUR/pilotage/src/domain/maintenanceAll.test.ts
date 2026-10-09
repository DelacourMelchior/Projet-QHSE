// Tool 3.3 put together: the order of the queue, the person of each task, the figures of the screen against its lists, what a task opens, the badge of the home.
import { describe, expect, it } from 'vitest';
import type { Anomaly, Equipment, MaintTodo, Person, Risk, Spare, State } from './types';
import { maintAnswer, maintFocus, maintInsights, maintMatcher, maintSummary, maintTodos, type MaintFilter } from './maintenanceAll';
import { eqLevel, newEquipment, openAnomalies, stopEquipment } from './maintenance';
import { newSpare } from './maintenanceSpares';
import { markDone, newCheck } from './maintenanceChecks';
import { allTasks } from './tasks';
import { maintenanceExamples } from './maintenanceExamples';
import { maintFeeds } from './maintenanceFeeds';
import { toolBadge } from './status';
import { emptyTools } from './base';
import { DEFAULT_SCALE, newRisk } from './risk';
import { demoState } from './templates';

const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const eq = (id: string, over: Partial<Equipment> = {}): Equipment => ({ ...newEquipment(), id, name: id.toUpperCase(), operator: 'Alice', manager: 'Marc', inspections: [{ date: '2026-09-22', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }], ...over });
const an = (over: Partial<Anomaly>): Anomaly => ({ id: 'a1', label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const risk = (): Risk => ({ ...newRisk('P3', now), id: 'r1', title: 'Casse broche', maxOutage: { value: 4, unit: 'h' } });
const sp = (over: Partial<Spare> = {}): Spare => ({ ...newSpare(['e3']), id: 'sp1', name: 'Courroie', ref: 'C1', min: 2, stock: 0, countedAt: '2026-09-20T09:00', countedBy: 'Marc', ...over });
const late = { ...newCheck('Appareils de levage', { value: 1, unit: 'an' }, true), id: 'tk1', lastDone: '2025-01-01' };

// two machines stopped (one beyond its Plan B), a danger, a part out, a check overdue, a routine to do, an anomaly: the urgent ones come first
const fixture = () => st({
  risks: { r1: risk() },
  equipments: {
    e1: eq('e1', { riskId: 'r1', stoppedSince: '2026-09-24T22:00', anomalies: [an({ id: 'd1', label: 'Câble', severity: 'danger', date: '2026-09-23' }), an({ id: 'a2', label: 'Jeu', date: '2026-09-18' })] }),
    e2: eq('e2', { stoppedSince: '2026-09-25T04:00' }),
    e3: eq('e3', { tasks: [late] }),
    e4: eq('e4', { inspections: [] }),
  },
  spares: { sp1: sp() },
});

describe('3.3 the queue puts the urgent first', () => {
  it('orders by tone, then by kind (danger, stops, Plan B, part, anomaly, check, routine), then by date: not the administrative delays first', () => {
    expect(maintTodos(fixture(), now).map(t => [t.kind, t.eqId ?? t.spareId, t.tone, t.due])).toEqual([
      ['danger', 'e1', 'bad', '2026-09-23'], ['stopped', 'e1', 'bad', '2026-09-24'], ['stopped', 'e2', 'bad', '2026-09-25'], ['plan-b', 'e1', 'bad', '2026-09-24'],
      ['order', 'sp1', 'bad', ''], ['check', 'e3', 'bad', '2026-01-01'],
      ['anomaly', 'e1', 'warn', ''], ['routine', 'e4', 'warn', '2026-09-27'],
    ]);
  });
  it('breaks a tie by the date, the ones without a date last, then by the text', () => {
    const s = st({ equipments: {
      e1: eq('e1', { anomalies: [an({ id: 'x', label: 'Zéro', handler: 'B', dueAt: '2026-10-05' }), an({ id: 'y', label: 'Sans date' }), an({ id: 'z', label: 'Avant', handler: 'B', dueAt: '2026-10-01' }), an({ id: 'w', label: 'Aaa' })] }),
    } });
    expect(maintTodos(s, now).map(t => t.ref)).toEqual(['z', 'x', 'w', 'y']);   // dated first (the nearest), then the undated by text ("Prendre en charge « Aaa »" before "…« Sans date »")
  });
  it('is the same list in "Mes tâches", where the urgent ones carry a date and no longer come last', () => {
    const s = fixture(), mine = allTasks(s, now).filter(t => t.tool === '3.3');
    expect(mine).toHaveLength(maintTodos(s, now).length);
    expect(mine.map(t => t.due)).toEqual(['2026-01-01', '2026-09-23', '2026-09-24', '2026-09-24', '2026-09-25', '2026-09-27', '', '']);
    const undated = mine.filter(t => !t.due).map(t => t.focus);
    expect(undated.sort()).toEqual(['e1:issues', 'spare:sp1']);   // only a plain anomaly and the part to order are without a date
    expect(mine.slice(0, 6).map(t => t.focus).sort()).toEqual(['e1:issues', 'e1:issues', 'e2:issues', 'e3:checks', 'risk:r1', 'station:e4']);
  });
  it('starts, on the example, with the danger, the two stops and the Plan B', () => {
    const s = demoState(now);
    expect(maintTodos(s, now).slice(0, 4).map(t => t.kind)).toEqual(['danger', 'stopped', 'stopped', 'plan-b']);
    const tasks = allTasks(s, now).filter(t => t.tool === '3.3');
    expect(tasks.findIndex(t => t.text.includes('Verrouillage de la porte du four'))).toBeLessThan(tasks.findIndex(t => !t.due));
    expect(tasks.filter(t => /à l'arrêt depuis/.test(t.text)).every(t => !!t.due)).toBe(true);
  });
  it('gives every task a fact', () => {
    maintTodos(demoState(now), now).forEach(t => expect(typeof t.fact, t.id).toBe('string'));
    maintTodos(fixture(), now).forEach(t => expect(t.fact?.length, t.id).toBeGreaterThan(0));
  });
});

describe('3.3 red keeps its meaning, and the messages do not repeat the queue', () => {
  const ok5 = ['ok', 'ok', 'ok', 'ok', 'ok'] as const;
  const both = () => st({
    risks: { r1: risk() },
    equipments: {
      e1: eq('e1', { riskId: 'r1', stoppedSince: '2026-09-24T22:00', anomalies: [an({ id: 'd1', severity: 'danger' })] }),   // a danger, a stop, a stop past its Plan B
      e2: eq('e2', {   // a routine missed, an anomaly with a date passed, a check that is not mandatory and overdue
        inspections: [{ date: '2026-09-01', by: 'A', note: '', results: [...ok5] }], anomalies: [an({ id: 'a2', label: 'Bourrage', severity: 'stopped', handler: 'Bruno', dueAt: '2026-09-20' })],
        tasks: [{ ...newCheck('Facultatif', { value: 1, unit: 'an' }, false), id: 'k2', lastDone: '2025-01-01' }],
      }),
      e3: eq('e3', { tasks: [late] }),   // a mandatory check overdue
    },
    spares: {
      out: sp({ id: 'out', name: 'Rupture', stock: 0 }), low: sp({ id: 'low', name: 'Basse', stock: 1 }),
      outLate: sp({ id: 'outLate', name: 'Rupture attendue', stock: 0, order: { qty: 2, at: '2026-08-01', expectedAt: '2026-09-10' } }),
      lowLate: sp({ id: 'lowLate', name: 'Basse attendue', stock: 1, order: { qty: 1, at: '2026-08-01', expectedAt: '2026-09-10' } }),
      old: sp({ id: 'old', name: 'Périmée', stock: 5, expiresAt: '2026-09-01' }),
    },
  });
  const tones = (s: State) => Object.fromEntries(maintTodos(s, now).map(t => [`${t.kind}:${t.eqId ?? t.spareId}`, t.tone]));

  it('is red for a danger, a stop, a stop past its Plan B, a critical part out and a mandatory check overdue, and for nothing else', () => {
    expect(tones(both())).toEqual({
      'danger:e1': 'bad', 'stopped:e1': 'bad', 'plan-b:e1': 'bad', 'check:e3': 'bad', 'order:out': 'bad', 'order-late:outLate': 'bad',
      'routine:e2': 'warn', 'anomaly:e2': 'warn', 'check:e2': 'warn', 'order:low': 'warn', 'order-late:lowLate': 'warn', 'expiry:old': 'warn',
    });
  });
  it('colours the card by the same rule: a routine missed or an anomaly is amber, a danger or a stop is red', () => {
    const s = both(), todos = maintTodos(s, now);
    expect(eqLevel(s.equipments.e1, todos).level).toBe('alert');
    expect(eqLevel(s.equipments.e2, todos).level).toBe('warn');   // the late routine and the anomaly and the check that is not mandatory: no red
    expect(eqLevel(s.equipments.e3, todos).level).toBe('alert');   // a mandatory check overdue
    expect(toolBadge(s, '3.3', '2026-09', now)).toMatchObject({ n: maintTodos(s, now).filter(t => t.tone === 'bad').length, tone: 'alert' });
  });
  it('counts the same things in the tiles, the queue and the badge of the tool: a tile is red when the queue holds a red line of that thing', () => {
    for (const s of [both(), demoState(now), st({ equipments: { e1: eq('e1', { anomalies: [an({})] }) }, spares: { low: sp({ id: 'low', stock: 1 }) } })]) {
      const sm = maintSummary(s, now), red = (...kinds: string[]) => sm.todos.filter(t => t.tone === 'bad' && kinds.includes(t.kind)).length;
      expect(sm.dangers > 0 || sm.stopped > 0).toBe(red('danger', 'stopped') > 0);   // "Anomalies ouvertes"
      expect(sm.sparesOut > 0).toBe(red('out', 'order', 'order-late') > 0);   // "Pièces sous le mini ou en rupture"
      expect(red('check')).toBe(sm.checksLateLegal);   // "Contrôles échus", red for the mandatory ones only
      expect(toolBadge(s, '3.3', '2026-09', now).n).toBe(sm.todos.filter(t => t.tone === 'bad').length || sm.todos.length);   // the badge counts the red lines, else all of them
    }
  });
  it('keeps the dot of the messages in the same sense: a part under its minimum, a date limit and an observation are amber, a delivery late is red only for a part out', () => {
    const s = both(), tone = (key: string) => maintInsights(s, now, []).find(i => i.key === key)?.tone;
    expect([tone('spare-out'), tone('spare-low'), tone('spare-expiry'), tone('spare-late')]).toEqual(['bad', 'warn', 'warn', 'warn']);   // the red late delivery of a part out is a line of the queue, not said twice: left alone the message is amber
    const lowOnly = st({ spares: { lowLate: sp({ id: 'lowLate', stock: 1, order: { qty: 1, at: '2026-08-01', expectedAt: '2026-09-10' } }) }, equipments: { e3: eq('e3') } });
    expect(maintInsights(lowOnly, now, []).find(i => i.key === 'spare-late')?.tone).toBe('warn');
  });
  it('leaves out of the messages the danger, the stop and the stop past its Plan B that the queue already says, and keeps the others', () => {
    const s = both(), keys = maintInsights(s, now).map(i => i.key);
    expect(maintTodos(s, now).map(t => t.kind)).toEqual(expect.arrayContaining(['danger', 'stopped', 'plan-b']));
    for (const k of ['danger', 'stopped', 'plan-b-over']) expect(keys, k).not.toContain(k);
    for (const k of ['anomalies', 'spare-out', 'routine-missed']) expect(keys, k).not.toContain(k);   // every fact the queue carries is said once: there
    expect(keys).toContain('no-plan-b');   // what it does not carry stays a message
    // without a danger or a stop in the queue, nothing is left out: the message of a stop stays when the queue does not carry it
    expect(maintInsights(s, now, []).map(i => i.key)).toEqual(expect.arrayContaining(['danger', 'stopped', 'plan-b-over']));
  });
  it('says the answer of the screen in facts, the most serious first, and nothing is invented when all is well', () => {
    expect(maintAnswer(maintSummary(both(), now))).toBe("1 danger signalé, 1 équipement à l'arrêt, 2 pièces en rupture, 1 autre anomalie ouverte, 1 routine à faire, 2 contrôles échus, 2 pièces sous le mini.");
    expect(maintAnswer(maintSummary(st({ equipments: { e1: eq('e1') } }), now))).toBe('Tout est en ordre : routines à jour, aucune anomalie ouverte, aucune pièce en rupture.');
    expect(maintAnswer(maintSummary(st(), now))).toBe('');
  });
});

describe('3.3 the figures of the screen agree with its lists and its messages', () => {
  const two = st({ equipments: {
    e1: eq('e1', { anomalies: [an({ id: 'd1', severity: 'danger' }), an({ id: 'a2', label: 'Jeu' }), an({ id: 'a3', label: 'Bruit', closedAt: '2026-09-21' })] }),
    e2: eq('e2', { anomalies: [an({ id: 'a4', label: 'Odeur' })], stoppedSince: '2026-09-25T04:00' }),
    e3: eq('e3', { inspections: [] }),
    e4: eq('e4', { retiredAt: '2026-08-01', anomalies: [an({ id: 'a5', label: 'Ancien' })] }),
  } });
  it('counts every open anomaly under that word, the dangers included, and says how many are dangers', () => {
    const sm = maintSummary(two, now);
    expect([sm.anomalies, sm.dangers, sm.stopped, sm.equipments]).toEqual([3, 1, 1, 3]);   // a closed one and the ones of a retired equipment are not open
    expect(maintInsights(two, now, []).find(i => i.key === 'anomalies')!.text).toBe('3 anomalies ouvertes, dont 1 danger : E1 (Jeu, signalée), E2 (Odeur, signalée).');
  });
  it('counts equipment in the chips, with the same definition as the list', () => {
    const match = maintMatcher(two, maintTodos(two, now)), by = (f: MaintFilter) => Object.values(two.equipments).filter(e => match(f, e)).map(e => e.id);
    expect(Object.fromEntries((['service', 'todo', 'stopped', 'anomalies', 'spares', 'checks', 'retired'] as const).map(f => [f, by(f)]))).toEqual({
      service: ['e1', 'e2', 'e3'], todo: ['e3'], stopped: ['e2'], anomalies: ['e1', 'e2'], spares: [], checks: [], retired: ['e4'],
    });
  });
  it('tile = lines of its filter, on the example: routines, stops, anomalies, parts; the home badge counts the queue', () => {
    const s = demoState(now), sm = maintSummary(s, now), todos = maintTodos(s, now), match = maintMatcher(s, todos);
    const rows = (f: MaintFilter) => Object.values(s.equipments).filter(e => match(f, e));
    expect(sm.routineTotal - sm.routineDone).toBe(rows('todo').length);
    expect(sm.stopped).toBe(rows('stopped').length);
    expect(sm.equipments).toBe(rows('service').length);
    expect(sm.anomalies).toBe(rows('anomalies').reduce((n, e) => n + openAnomalies(e).length, 0));   // anomalies counted on its lines
    expect(maintInsights(s, now, []).find(i => i.key === 'anomalies')!.text.startsWith(`${sm.anomalies} anomalies ouvertes`)).toBe(true);
    expect(sm.todos).toEqual(todos);
    const bad = todos.filter(t => t.tone === 'bad').length, badge = toolBadge(s, '3.3', '2026-09', now);
    expect(badge).toEqual({ n: bad, tone: 'alert', text: `${bad} points urgents sur ${todos.length} (équipements et armoire)` });
  });
  it('words the badge: urgent points out of all, or the points to follow; nothing to do is said', () => {
    expect(toolBadge(fixture(), '3.3', '2026-09', now)).toEqual({ n: 6, tone: 'alert', text: '6 points urgents sur 8 (équipements et armoire)' });
    expect(toolBadge(st({ equipments: { e1: eq('e1', { inspections: [] }), e2: eq('e2', { inspections: [] }) } }), '3.3', '2026-09', now)).toEqual({ n: 2, tone: 'warn', text: '2 points à suivre (équipements et armoire)' });
    expect(toolBadge(st({ equipments: { e1: eq('e1', { inspections: [] }) } }), '3.3', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: '1 point à suivre (équipements et armoire)' });
    expect(toolBadge(st({ equipments: { e1: eq('e1') } }), '3.3', '2026-09', now)).toMatchObject({ n: 0, tone: 'ok', text: 'Équipements et armoire à jour' });
    expect(toolBadge(fixture(), '3.3', '2026-09', now).text).not.toMatch(/traiter/);
  });
  it('counts the checks late, to plan within the notice, and without a date', () => {
    const done = { ...newCheck('A', { value: 1, unit: 'an' }), id: 'k1', lastDone: '2025-10-10' };   // due 10/10/2026: 15 days
    const far = { ...newCheck('B', { value: 1, unit: 'an' }), id: 'k2', lastDone: '2026-03-01' };   // due 2027
    const nodate = { ...newCheck('C'), id: 'k3' };
    const s = st({ equipments: { e1: eq('e1', { tasks: [late, done, far, nodate] }) } });
    const sm = maintSummary(s, now);
    expect([sm.checksLate, sm.checksSoon, sm.checksNoDate]).toEqual([1, 1, 1]);
  });
});

describe('3.3 what a task opens', () => {
  const t = (over: Partial<MaintTodo>): MaintTodo => ({ id: 'x', kind: 'routine', text: '', tone: 'warn', who: '', due: '', ...over });
  it('opens the routine, the right tab, the part, the cabinet, the settings and the Plan B', () => {
    expect([
      t({ kind: 'routine', eqId: 'e1' }), t({ kind: 'anomaly', eqId: 'e1' }), t({ kind: 'danger', eqId: 'e1' }), t({ kind: 'stopped', eqId: 'e1' }), t({ kind: 'check', eqId: 'e1' }), t({ kind: 'remark', eqId: 'e1' }),
      t({ kind: 'contract', eqId: 'e1' }), t({ kind: 'order', spareId: 'sp1' }), t({ kind: 'expiry', spareId: 'sp2' }), t({ kind: 'count' }), t({ kind: 'key' }), t({ kind: 'plan-b', eqId: 'e1', ref: 'r1' }),
      t({ kind: 'plan-b', eqId: 'e1' }), t({ kind: 'order' }),
    ].map(maintFocus)).toEqual(['station:e1', 'e1:issues', 'e1:issues', 'e1:issues', 'e1:checks', 'e1:checks', 'e1:checks', 'spare:sp1', 'spare:sp2', 'cabinet', 'settings', 'risk:r1', 'e1:issues', '']);
  });
  it('gives "Mes tâches" these targets for the count of the cabinet, the key and the Plan B of a real state', () => {
    const s = fixture();
    s.equipments.e1.riskId = 'r1';
    s.spares.sp1 = sp({ countedAt: '2026-01-01T09:00', stock: 5 });
    s.params = { ...s.params, maint: { keyHolder: 'Zoé' } };
    s.people = { z: { id: 'z', name: 'Zoé', role: '', active: true, absences: [{ from: '2026-09-24', to: '2026-09-26' }] } as Person };
    const focus = (kind: string) => allTasks(s, now).find(x => x.tool === '3.3' && maintTodos(s, now).some(m => m.kind === kind && `m${m.id}` === x.id))!.focus;
    expect([focus('count'), focus('key'), focus('plan-b')]).toEqual(['cabinet', 'settings', 'risk:r1']);
  });
});

describe('3.3 a stopped equipment that stays in the queue', () => {
  it('keeps the stop of an equipment without manager and without people: a name that is empty, not missing', () => {
    const e = stopEquipment(eq('e1', { operator: '' }), 'A', '2026-09-25T05:00') as Partial<Equipment>;
    delete e.manager;
    const s = st({ equipments: { e1: e as Equipment } });
    expect(() => allTasks(s, now)).not.toThrow();
    expect(maintTodos(s, now).map(t => [t.kind, t.who])).toEqual([['stopped', '']]);
  });
});

describe('3.3 damaged records never stop the queue, the facts, the figures or "Mes tâches" (V-06)', () => {
  const today = new Date(2026, 9, 6, 10, 0);
  const example = () => { const ex = maintenanceExamples(today); return st({ equipments: structuredClone(ex.equipments), spares: structuredClone(ex.spares) }); };
  const junk = (): unknown[] => [null, 'x', 42, [], undefined];
  const put = (s: State, f: (e: Equipment, i: number) => void, g: (x: Spare) => void = () => {}) => { Object.values(s.equipments).forEach(f); Object.values(s.spares).forEach(g); return s; };
  // everything the five readers say about a state
  const reads = (s: State) => [maintTodos(s, today), maintInsights(s, today), maintSummary(s, today), ['2026-10', '2026-09', '2026-05'].map(p => maintFeeds(s, p, today)), allTasks(s, today).filter(t => t.tool === '3.3')];
  const dirty = () => put(example(), e => {
    for (const k of ['inspections', 'anomalies', 'breakdowns', 'tasks', 'contacts'] as const) { const l = e[k] as unknown[] | undefined; if (l) e[k] = [...junk(), ...l, ...junk()] as never; }
    Object.values(e.checkLife ?? {}).forEach(l => { l.history = [...junk(), ...l.history] as never; if (l.reserves) l.reserves = [...junk(), ...l.reserves] as never; });
  }, x => { if (x.moves) x.moves = [...junk(), ...x.moves] as never; });

  it('says the same with junk among the routines, anomalies, breakdowns, checks, lines of history, observations and movements as without', () => {
    const clean = reads(example()), damaged = reads(dirty());
    expect(damaged).toEqual(clean);
    expect((clean[0] as MaintTodo[]).length).toBeGreaterThan(10);   // the example holds every state: the comparison is not between empty lists
    expect((clean[1] as { key: string }[]).length).toBeGreaterThan(3);
    expect((clean[3] as unknown[][]).every(f => f.length > 0)).toBe(true);
  });
  it('does not stop on a list that is not a list, whichever list and whichever record', () => {
    // every list of every record becomes a text, a number, an object, nothing: the five readers still answer
    for (const bad of ['x', 42, {}, null]) {
      const s = put(example(), e => {
        for (const key of ['inspections', 'anomalies', 'breakdowns', 'tasks', 'checkpoints', 'contacts'] as const) (e as unknown as Record<string, unknown>)[key] = bad;
        Object.values(e.checkLife ?? {}).forEach(l => { (l as unknown as Record<string, unknown>).history = bad; (l as unknown as Record<string, unknown>).reserves = bad; });
      }, x => { (x as unknown as Record<string, unknown>).moves = bad; });
      expect(() => reads(s), `lists = ${JSON.stringify(bad)}`).not.toThrow();
      expect(() => reads(put(example(), e => { (e as unknown as Record<string, unknown>).checkLife = bad; })), `checkLife = ${JSON.stringify(bad)}`).not.toThrow();
    }
  });
  it('names a check without a label and a record that is empty, never "undefined" (the rule "no date" read the label)', () => {
    const s = put(example(), e => { (e.tasks ?? []).forEach((c, i) => { (c as unknown as Record<string, unknown>).label = [undefined, null, ''][i % 3]; }); });
    const out = reads(s);
    expect(() => out).not.toThrow();
    expect(JSON.stringify(out)).toContain('Contrôle sans nom');
    expect(JSON.stringify(out)).not.toContain('undefined');
    // a check that is only an id, and a line of history that is only a date
    const bare = put(example(), e => { if (e.tasks?.length) e.tasks[0] = { id: e.tasks[0].id } as never; Object.values(e.checkLife ?? {}).forEach(l => { l.history = [{ date: '2026-01-01' } as never, ...l.history]; }); });
    expect(() => reads(bare)).not.toThrow();
    // records with nothing in them
    const empty = put(example(), e => { (e.inspections as unknown[]) = [{}]; (e.anomalies as unknown[]) = [{}, { id: 'a' }]; (e.breakdowns as unknown[]) = [{}, { id: 'b' }]; }, x => { x.moves = [{} as never]; });
    expect(() => reads(empty)).not.toThrow();
  });
});

// ---- lot 0 ter, N-07: the tile of the checks is red only for a check marked mandatory
describe('3.3 the checks late that are marked mandatory (N-07)', () => {
  const chk = (id: string, label: string, legal: boolean, lastDone: string) => ({ ...newCheck(label, { value: 1, unit: 'an' }, legal), id, lastDone });
  const koTwin = (e: Equipment, id: string) => markDone(e, id, { date: '2026-09-20', by: 'A', result: 'ko', note: 'Écart' });
  it('counts the checks past their date or not conform that are marked mandatory, among the ones late', () => {
    let e1 = eq('e1', { tasks: [chk('k1', 'Levage', true, '2025-01-01'), chk('k2', 'Peinture', false, '2025-01-01'), chk('k3', 'Pression', true, '2026-03-01'), chk('k4', 'Éclairage', true, '2026-03-01'), chk('k5', 'Sol', false, '2026-03-01'), chk('k6', 'Alarme', true, '2025-10-10')] });
    e1 = koTwin(koTwin(e1, 'k4'), 'k5');   // k4 (mandatory) and k5 (not) done non conform: late for the figures
    const s = st({ equipments: { e1, e2: eq('e2', { retiredAt: '2026-08-01', tasks: [chk('k7', 'Retiré', true, '2025-01-01')] }) } });
    const sm = maintSummary(s, now);
    // k1 late legal, k2 late, k3 up to date, k4 ko legal, k5 ko, k6 due in 15 days (to plan, not late); the retired equipment has no check
    expect([sm.checksLate, sm.checksLateLegal, sm.checksSoon]).toEqual([4, 2, 1]);
  });
  it('is zero when what is late is not mandatory, when nothing is late, and with no check', () => {
    const only = (legal: boolean) => st({ equipments: { e1: eq('e1', { tasks: [chk('k1', 'Levage', legal, '2025-01-01'), chk('k2', 'Sol', legal, '2025-02-01')] }) } });
    expect([maintSummary(only(false), now).checksLate, maintSummary(only(false), now).checksLateLegal]).toEqual([2, 0]);
    expect([maintSummary(only(true), now).checksLate, maintSummary(only(true), now).checksLateLegal]).toEqual([2, 2]);
    expect(maintSummary(st({ equipments: { e1: eq('e1', { tasks: [chk('k1', 'Levage', true, '2026-06-01')] }) } }), now).checksLateLegal).toBe(0);
    expect(maintSummary(st({ equipments: { e1: eq('e1') } }), now).checksLateLegal).toBe(0);
  });
  it('is what the red of a check says in the queue: a mandatory one is a task in red, the others amber', () => {
    const s = st({ equipments: { e1: eq('e1', { tasks: [chk('k1', 'Levage', true, '2025-01-01'), chk('k2', 'Sol', false, '2025-01-01')] }) } });
    const tones = maintTodos(s, now).filter(t => t.kind === 'check').map(t => [t.ref, t.tone]);
    expect(tones).toEqual([['k1', 'bad'], ['k2', 'warn']]);
    expect(maintSummary(s, now).checksLateLegal).toBe(tones.filter(t => t[1] === 'bad').length);
  });
});

// ---- lot 0 ter, N-06: a field of the wrong type reads as an empty one, everywhere the five readers look
describe('3.3 a field of the wrong type says what the record without the field says (N-06)', () => {
  const today = new Date(2026, 9, 6, 10, 0);
  const example = () => { const ex = maintenanceExamples(today); return st({ equipments: structuredClone(ex.equipments), spares: structuredClone(ex.spares) }); };
  const reads = (s: State) => [maintTodos(s, today), maintInsights(s, today), maintSummary(s, today), ['2026-10', '2026-09', '2026-05'].map(p => maintFeeds(s, p, today)), allTasks(s, today).filter(t => t.tool === '3.3'), toolBadge(s, '3.3', '2026-10', today)];
  const at = (s: State, path: (string | number)[]) => { let c: any = s; for (const k of path.slice(0, -1)) c = c[k]; return [c, path[path.length - 1]] as [Record<string, unknown>, string | number]; };
  // the damaged value, and the same record without the field; the paths are the ones of the audit (the 23 forms of the check in the browser) and the neighbouring fields
  const E = (id: string, ...p: (string | number)[]) => ['equipments', id, ...p], S = (id: string, ...p: (string | number)[]) => ['spares', id, ...p];
  const TEXT: [string, (string | number)[]][] = [
    ['contract.until', E('eq_demo_cnc', 'contract', 'until')], ['contract.provider', E('eq_demo_cnc', 'contract', 'provider')], ['anomaly.dueAt', E('eq_demo_serveur', 'anomalies', 0, 'dueAt')],
    ['anomaly.date', E('eq_demo_cnc', 'anomalies', 0, 'date')], ['anomaly.handler', E('eq_demo_serveur', 'anomalies', 0, 'handler')], ['anomaly.closedAt', E('eq_demo_cnc', 'anomalies', 0, 'closedAt')],
    ['anomaly.waitingFor', E('eq_demo_cnc', 'anomalies', 0, 'waitingFor')], ['anomaly.repairedAt', E('eq_demo_cnc', 'anomalies', 1, 'repairedAt')], ['anomaly.label', E('eq_demo_cnc', 'anomalies', 0, 'label')],
    ['stoppedSince', E('eq_demo_serveur', 'stoppedSince')], ['stoppedSince (chariot)', E('eq_demo_chariot', 'stoppedSince')], ['retiredAt', E('eq_demo_cnc', 'retiredAt')],
    ['deputy', E('eq_demo_cnc', 'deputy')], ['operator', E('eq_demo_cnc', 'operator')], ['manager', E('eq_demo_cnc', 'manager')], ['name', E('eq_demo_cnc', 'name')], ['location', E('eq_demo_cnc', 'location')],
    ['breakdown.cause', E('eq_demo_cnc', 'breakdowns', 0, 'cause')], ['breakdown.date', E('eq_demo_cnc', 'breakdowns', 0, 'date')], ['breakdown.startedAt', E('eq_demo_serveur', 'breakdowns', 0, 'startedAt')],
    ['breakdown.endedAt', E('eq_demo_compresseur', 'breakdowns', 0, 'endedAt')], ['inspection.date', E('eq_demo_cnc', 'inspections', 0, 'date')], ['inspection.by', E('eq_demo_cnc', 'inspections', 0, 'by')],
    ['check.first', E('eq_demo_cabine', 'tasks', 1, 'first')], ['check.lastDone', E('eq_demo_cnc', 'tasks', 0, 'lastDone')], ['check.who', E('eq_demo_chariot', 'tasks', 1, 'who')], ['check.label', E('eq_demo_cnc', 'tasks', 0, 'label')],
    ['plannedAt', E('eq_demo_compresseur', 'checkLife', 'tk_demo_4', 'plannedAt')], ['reserve.due', E('eq_demo_cabine', 'checkLife', 'tk_demo_7', 'reserves', 1, 'due')], ['reserve.text', E('eq_demo_cabine', 'checkLife', 'tk_demo_7', 'reserves', 1, 'text')],
    ['spare.expiresAt', S('sp_demo_joints', 'expiresAt')], ['spare.countedAt', S('sp_demo_courroie', 'countedAt')], ['spare.countedBy', S('sp_demo_courroie', 'countedBy')], ['spare.name', S('sp_demo_courroie', 'name')], ['spare.ref', S('sp_demo_courroie', 'ref')],
    ['spare.supplier', S('sp_demo_courroie', 'supplier')], ['spare.moves[].at', S('sp_demo_courroie', 'moves', 0, 'at')], ['spare.order.at', S('sp_demo_electrovanne', 'order', 'at')], ['spare.order.expectedAt', S('sp_demo_electrovanne', 'order', 'expectedAt')],
  ];
  const NUMBER: [string, (string | number)[]][] = [['spare.leadDays', S('sp_demo_courroie', 'leadDays')], ['spare.min', S('sp_demo_courroie', 'min')], ['spare.stock', S('sp_demo_courroie', 'stock')], ['spare.order.qty', S('sp_demo_electrovanne', 'order', 'qty')], ['move.delta', S('sp_demo_courroie', 'moves', 1, 'delta')]];
  const BAD_TEXT: unknown[] = [[], {}, 0, -1, true, null], BAD_NUMBER: unknown[] = ['x', [], {}, null, true];
  const check = (list: [string, (string | number)[]][], bads: unknown[]) => {
    const clean = reads(example());
    for (const [label, path] of list) {
      const without = example(); const [wc, wk] = at(without, path); delete wc[wk];
      const baseline = reads(without);
      for (const bad of bads) {
        const s = example(); const [c, k] = at(s, path); c[k] = bad;
        expect(() => reads(s), `${label} = ${JSON.stringify(bad)}`).not.toThrow();
        expect(reads(s), `${label} = ${JSON.stringify(bad)}`).toEqual(baseline);
      }
    }
    return clean;
  };
  it('reads a text field that holds a list, an object, a number or nothing as empty, in the records of the example (the audit forms and their neighbours)', () => {
    const clean = check(TEXT, BAD_TEXT);
    expect((clean[0] as MaintTodo[]).length).toBeGreaterThan(10);   // the comparison is not between empty answers
    expect((clean[1] as unknown[]).length).toBeGreaterThan(3);
  }, 30000);   // forty forms through the whole calculation: a loaded machine takes well over the default 5 s
  it('reads a number field that holds a text, a list, an object or nothing as empty', () => {
    check(NUMBER, BAD_NUMBER);
  }, 30000);
  it('reads an order that is not a record as no order, the key that is not a unit as days, the routine and the kind that are not known as the default ones', () => {
    const base = reads(example());
    for (const bad of ['x', [], 5, true]) {
      const s = example(); (s.spares.sp_demo_electrovanne as unknown as Record<string, unknown>).order = bad;
      const without = example(); delete (without.spares.sp_demo_electrovanne as unknown as Record<string, unknown>).order;
      expect(reads(s), `order = ${JSON.stringify(bad)}`).toEqual(reads(without));
      expect(reads(s)).not.toEqual(base);   // the example has an order on that part: the fact changed, so the comparison is real
    }
    const unit = example(); unit.equipments.eq_demo_cnc.tasks![0].every = { value: 2, unit: 'x' } as never;
    const days = example(); days.equipments.eq_demo_cnc.tasks![0].every = { value: 2, unit: 'j' };
    expect(reads(unit)).toEqual(reads(days));
    for (const bad of ['x', 5, [], null]) {
      const s = example(); (s.equipments.eq_demo_cnc.tasks![0] as unknown as Record<string, unknown>).every = bad;
      const without = example(); delete (without.equipments.eq_demo_cnc.tasks![0] as unknown as Record<string, unknown>).every;
      expect(reads(s), `every = ${JSON.stringify(bad)}`).toEqual(reads(without));
    }
    const routine = example(); (routine.equipments.eq_demo_cnc as unknown as Record<string, unknown>).routine = { every: 5, day: 'a' };
    const none = example(); delete none.equipments.eq_demo_cnc.routine;
    expect(reads(routine)).toEqual(reads(none));
    const kind = example(); (kind.equipments.eq_demo_cnc as unknown as Record<string, unknown>).kind = 'zzz';
    const noKind = example(); delete noKind.equipments.eq_demo_cnc.kind;
    expect(reads(kind)).toEqual(reads(noKind));
  });
});
