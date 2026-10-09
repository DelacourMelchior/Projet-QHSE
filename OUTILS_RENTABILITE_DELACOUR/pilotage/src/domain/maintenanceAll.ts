// Tool 3.3 as a whole: what is left to do, the facts and the figures of the screen, put together from the three parts of the domain
// (the routine and the equipment in maintenance.ts, the cabinet in maintenanceSpares.ts, the periodic checks in maintenanceChecks.ts).
import type { Insight } from './base';
import type { Equipment, MaintTodo, MaintTodoKind, State } from './types';
import { isoDate } from './periods';
import { byUrgency, eqStatus, inspectionState, maintCfg, openAnomalies, recs, routineFacts, routineTodos, taskOwner, txt } from './maintenance';
import { followedSpares, isCritical, lowSpares, spareFacts, spareLevel, spareTodos } from './maintenanceSpares';
import { checkFacts, checkState, checkTodos, countsAsLate, inNotice } from './maintenanceChecks';

export { eqLevel, urgency } from './maintenance';

const TONE = { bad: 0, warn: 1, good: 2 } as const;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

// The person of each task, worked out once for the three parts: the one planned (the holder or the one who handles it, else the manager; for a check done by
// the company, the person typed on it) or, when that person is on leave or no longer active, the deputy of the equipment if he is there; otherwise the task
// stays with the person and its fact says so. A piece of equipment without manager gives an empty name, never a missing one.
function withWho(s: State, now: Date, todos: MaintTodo[]): MaintTodo[] {
  const day = isoDate(now);
  return todos.map(t => {
    const e = t.eqId && Object.hasOwn(s.equipments, t.eqId) ? s.equipments[t.eqId] : undefined, c = t.kind === 'check' && e ? recs(e.tasks).find(x => x.id === t.ref) : undefined;
    const planned = (c?.by === 'internal' ? txt(c.who).trim() : '') || t.who || '';
    const o = e ? taskOwner(s, e, planned, day) : { who: planned.trim(), absent: false, deputy: false };
    return { ...t, who: o.who, ...(o.absent && !o.deputy && o.who ? { fact: `${t.fact ?? t.text} (absent, sans suppléant)` } : {}) };
  });
}

// Red is for what cannot wait: a danger, a stop (and a stop past its Plan B), a critical part out of stock, a check the company marked as mandatory that is
// overdue or not conform. Whatever else is late or short (a routine, an anomaly, a delivery, a date limit, an observation, a part under its minimum) is amber, so that
// the red line is the one that is seen. One rule for the queue, the badge of the tool, the tile and the messages: all of them read `tone` from here.
export function isRed(s: State, t: MaintTodo): boolean {
  if (['danger', 'stopped', 'plan-b', 'out'].includes(t.kind)) return true;
  if (t.kind === 'check') return t.tone === 'bad';   // (maintenanceChecks.ts) red only when the check is marked mandatory and is overdue or not conform
  const sp = t.spareId && Object.hasOwn(s.spares, t.spareId) ? s.spares[t.spareId] : undefined;
  return (t.kind === 'order' || t.kind === 'order-late') && !!sp && isCritical(sp) && spareLevel(sp) === 'out';
}

// Most pressing first (red before amber), then by kind (danger, stop, Plan B, part, anomaly, check, observation, contract, routine, count, key),
// then by due date (the ones without a date last), then by text
export function maintTodos(s: State, now = new Date()): MaintTodo[] {
  return withWho(s, now, [...routineTodos(s, now), ...spareTodos(s, now), ...checkTodos(s, now)])
    .map((t): MaintTodo => { const tone = isRed(s, t) ? 'bad' : 'warn'; return t.tone === tone ? t : { ...t, tone }; })
    .sort((a, b) => byUrgency(a, b) || (a.due || '9').localeCompare(b.due || '9') || a.text.localeCompare(b.text));
}

// The messages say what the queue does not: a message that restates tasks of the queue (the same equipment, the same fact) is left out, so that a fact is
// said once. The others keep the same sense of red as the queue (a part under its minimum, a date limit, an observation are amber).
const TOLD_BY: Record<string, MaintTodoKind[]> = {
  danger: ['danger'], stopped: ['stopped'], 'plan-b-over': ['plan-b'], anomalies: ['anomaly', 'danger'], 'routine-missed': ['routine'], 'routine-first': ['routine'],
  'spare-out': ['out', 'order'], 'spare-low': ['order', 'out'], 'spare-late': ['order-late'], 'spare-expiry': ['expiry'], 'spare-count': ['count'],
  'check-late': ['check'], 'check-ko': ['check'], 'check-soon': ['check'], 'check-remark': ['remark'], 'check-contract': ['contract'], 'check-nodate': ['check'],
};
export function maintInsights(s: State, now = new Date(), todos: MaintTodo[] = maintTodos(s, now)): Insight[] {
  const tone = (i: Insight): Insight['tone'] => (['spare-low', 'spare-expiry', 'check-remark'].includes(i.key) ? 'warn' : i.key === 'spare-late' ? (todos.some(t => t.kind === 'order-late' && t.tone === 'bad') ? 'bad' : 'warn') : i.tone);
  return [...routineFacts(s, now), ...spareFacts(s, now), ...checkFacts(s, now)]
    .filter(i => !TOLD_BY[i.key]?.some(k => todos.some(t => t.kind === k)))
    .map(i => ({ ...i, tone: tone(i) }))
    .sort((a, b) => TONE[a.tone] - TONE[b.tone]);
}

export interface MaintSummary {
  equipments: number;        // followed (not retired)
  routineDone: number;       // routines done for their period, among the equipment in service
  routineTotal: number;
  anomalies: number;         // open anomalies, the dangers included
  dangers: number;           // among them, the dangers
  stopped: number;           // equipment stopped now
  sparesLow: number;         // critical parts under the minimum (without the ones out of stock)
  sparesOut: number;         // critical parts out of stock
  checksLate: number;        // periodic checks past their date, or noted not conform and not yet redone
  checksLateLegal: number;   // among them, the ones the company marked as mandatory
  checksSoon: number;        // to plan, or planned, within the notice
  checksNoDate: number;      // checks that have no date to go by
  todos: MaintTodo[];
}

export function maintSummary(s: State, now = new Date()): MaintSummary {
  const eqs = Object.values(s.equipments).filter(e => eqStatus(e) !== 'retired'), soon = maintCfg(s.params).soonDays;
  const live = eqs.filter(e => eqStatus(e) === 'service');
  const levels = followedSpares(s).filter(isCritical).map(spareLevel);
  const checks = eqs.flatMap(e => recs(e.tasks).map(c => ({ st: checkState(e, c, now, soon), notice: inNotice(e, c, now, soon), legal: !!c.legal })));
  const open = eqs.flatMap(e => openAnomalies(e));
  return {
    equipments: eqs.length,
    routineDone: live.filter(e => inspectionState(e, now, s.params) === 'ok').length,
    routineTotal: live.length,
    anomalies: open.length,
    dangers: open.filter(a => a.severity === 'danger').length,
    stopped: eqs.filter(e => eqStatus(e) === 'stopped').length,
    sparesLow: levels.filter(l => l === 'low').length,
    sparesOut: levels.filter(l => l === 'out').length,
    checksLate: checks.filter(x => countsAsLate(x.st)).length,
    checksLateLegal: checks.filter(x => countsAsLate(x.st) && x.legal).length,
    checksSoon: checks.filter(x => x.notice).length,
    checksNoDate: checks.filter(x => x.st === 'nodate').length,
    todos: maintTodos(s, now),
  };
}

// The answer to the question of the screen, in facts, the most serious first: "2 équipements à l'arrêt, 3 pièces en rupture, 4 routines à faire."
export function maintAnswer(sm: MaintSummary): string {
  const toDo = sm.routineTotal - sm.routineDone, simple = sm.anomalies - sm.dangers;
  const parts = [
    sm.dangers && plural(sm.dangers, 'danger signalé', 'dangers signalés'), sm.stopped && plural(sm.stopped, "équipement à l'arrêt", "équipements à l'arrêt"),
    sm.sparesOut && plural(sm.sparesOut, 'pièce en rupture', 'pièces en rupture'), simple > 0 && (sm.dangers ? plural(simple, 'autre anomalie ouverte', 'autres anomalies ouvertes') : plural(simple, 'anomalie ouverte', 'anomalies ouvertes')),   // the tile counts the dangers too: "6" there, "1 danger, 5 autres" here
    toDo > 0 && plural(toDo, 'routine à faire', 'routines à faire'), sm.checksLate && plural(sm.checksLate, 'contrôle échu', 'contrôles échus'),
    sm.sparesLow && plural(sm.sparesLow, 'pièce sous le mini', 'pièces sous le mini'),
  ].filter(Boolean);
  return parts.length ? `${parts.join(', ')}.` : sm.equipments ? 'Tout est en ordre : routines à jour, aucune anomalie ouverte, aucune pièce en rupture.' : '';
}

// The filters of the list of equipment, one definition for the chips of the screen and for their count: each one keeps the equipment that has what its name says
export type MaintFilter = 'service' | 'todo' | 'stopped' | 'anomalies' | 'spares' | 'checks' | 'retired';
export function maintMatcher(s: State, todos: MaintTodo[]): (f: MaintFilter, e: Equipment) => boolean {
  const partEq = new Set(lowSpares(s).flatMap(x => x.equipmentIds));
  const has = (e: Equipment, kinds: MaintTodoKind[]) => todos.some(t => t.eqId === e.id && kinds.includes(t.kind));
  return (f, e) => {
    const st = eqStatus(e);
    if (f === 'retired') return st === 'retired';
    if (st === 'retired') return false;
    return { service: true, todo: has(e, ['routine']), stopped: st === 'stopped', anomalies: openAnomalies(e).length > 0, spares: partEq.has(e.id), checks: has(e, ['check', 'remark', 'contract']) }[f];
  };
}

// What a task opens in tool 3.3: the routine at the machine, the sheet on the right tab, a part of the cabinet, the cabinet itself, the settings, the Plan B
export function maintFocus(t: MaintTodo): string {
  if (t.spareId) return `spare:${t.spareId}`;
  if (t.kind === 'count') return 'cabinet';
  if (t.kind === 'key') return 'settings';
  if (t.kind === 'plan-b' && t.ref) return `risk:${t.ref}`;
  if (!t.eqId) return '';
  if (t.kind === 'routine') return `station:${t.eqId}`;
  if (['anomaly', 'danger', 'stopped', 'plan-b'].includes(t.kind)) return `${t.eqId}:issues`;
  if (['check', 'remark', 'contract'].includes(t.kind)) return `${t.eqId}:checks`;
  return t.eqId;
}
