// Tool 3.3, periodic checks of the equipment: frequency in days, weeks, months or years, history of what was done (with the report), planning,
// observations to lift, maintenance contract, calibration of measuring instruments, calendar of the next 12 months, to-dos and facts.
// Pure functions, covered by maintenanceChecks.test.ts. The routine and the equipment are in maintenance.ts, the cabinet in maintenanceSpares.ts;
// maintenanceAll.ts puts the three together. Messages state facts and give no order; only the text of a to-do is an infinitive.
import type { CheckDone, CheckLife, EqCheck, Equipment, Every, MaintTodo, Params, Reserve, State } from './types';
import { addDays, daysBetween, newId, type Insight } from './base';
import { frDate, isoDate, parseDate } from './periods';
import { norm } from './instructions';
import { addGone, recs, txt } from './maintenance';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
// A name that is not there (damaged data) reads as empty
const eqName = (e: Equipment) => txt(e.name).trim() || 'Équipement sans nom';
const nameOf = (c: EqCheck) => txt(c.label).trim() || 'Contrôle sans nom';
// Equipment followed (a retired one has no check, no contract), and the days of notice before a check falls due
const live = (s: State) => Object.values(s.equipments).filter(e => !txt(e.retiredAt));
const soonOf = (s: State) => (typeof s.params.maint?.soonDays === 'number' ? s.params.maint.soonDays : 30);
// A planned check shows in the list of tasks only in the last 60 days before its planned date (before that it is planned, nothing is left to do)
const PLANNED_NOTICE = 60;

// ---- frequency
export const EVERY_UNITS: { key: Every['unit']; label: string }[] = [{ key: 'j', label: 'jours' }, { key: 'sem', label: 'semaines' }, { key: 'mois', label: 'mois' }, { key: 'an', label: 'ans' }];
const ONE: Record<Every['unit'], string> = { j: 'jour', sem: 'semaine', mois: 'mois', an: 'année' };
// A frequency typed as 0 or nothing counts as 1: a check never falls due on the day it was done; a unit that is not one of the four, or no frequency at all, reads as days
const unitOf = (u: unknown): Every['unit'] => (EVERY_UNITS.some(x => x.key === u) ? (u as Every['unit']) : 'j');
const atLeastOne = (e: Every): Every => { const x: Partial<Every> = e && typeof e === 'object' ? e : {}; return { unit: unitOf(x.unit), value: Math.max(1, Math.round(x.value as number) || 1) }; };
// Months and years keep the day of the month, or the last day of the month when it does not exist (31 January + 1 month = 28 or 29 February).
// A date that was itself brought back to the end of a short month goes back to the day of `anchor` (the first date of the series) when the new month
// has it: 31 January, 28 February, then 31 March and not 28 March. A date that is not at the end of its month never moves.
export function addEvery(iso: string, e: Every, anchor = ''): string {
  const d = parseDate(iso);
  if (!d) return '';
  if (e.unit === 'j' || e.unit === 'sem') return addDays(iso, e.value * (e.unit === 'sem' ? 7 : 1));
  const month = new Date(d.getFullYear(), d.getMonth() + e.value * (e.unit === 'an' ? 12 : 1), 1);
  const endOfOwn = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), day = d.getDate() === endOfOwn ? Math.max(d.getDate(), parseDate(anchor)?.getDate() ?? 0) : d.getDate();
  return isoDate(new Date(month.getFullYear(), month.getMonth(), Math.min(day, new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate())));
}
export const everyOf = (c: EqCheck): Every => (c.every && typeof c.every === 'object' && !Array.isArray(c.every) ? { ...c.every, unit: unitOf(c.every.unit) } : { value: c.everyDays, unit: 'j' });
export function formatEvery(every: Every): string {
  const { value: n, unit } = atLeastOne(every);
  return n === 1 ? `chaque ${ONE[unit]}` : `${unit === 'sem' ? 'toutes' : 'tous'} les ${n} ${EVERY_UNITS.find(u => u.key === unit)!.label}`;
}
// Days of a frequency, for the readers that only know `everyDays` (the first versions of the tool)
const daysOf = (e: Every) => Math.round(e.value * { j: 1, sem: 7, mois: 30.4375, an: 365.25 }[e.unit]);

// ---- who does it, what kind of check
export const CHECK_BY: Record<NonNullable<EqCheck['by']>, string> = { internal: 'Interne', agreed: 'Organisme agréé', provider: 'Prestataire', other: 'Autre' };
export const CHECK_KIND: Record<NonNullable<EqCheck['kind']>, string> = { periodic: 'Contrôle périodique', instrument: "Étalonnage d'un instrument", preventive: 'Entretien préventif' };

// ---- catalogue offered when a check is added (modifiable in the settings of the tool)
// The periodicities are indicative and the "legal" box is only a first guess that the company ticks or unticks itself: the tool never states the law.
// TO BE VALIDATED by a person who knows the regulations before the release (periodicities depend on the type of equipment and on the company).
export const DEFAULT_CATALOGUE: { label: string; every: Every; legal?: boolean; kind?: EqCheck['kind'] }[] = [
  { label: 'Extincteurs', every: { value: 1, unit: 'an' }, legal: true },
  { label: 'Installations électriques', every: { value: 1, unit: 'an' }, legal: true },
  { label: 'Appareils de levage', every: { value: 6, unit: 'mois' }, legal: true },
  { label: 'Équipements sous pression', every: { value: 1, unit: 'an' }, legal: true },
  { label: 'Véhicules et engins', every: { value: 1, unit: 'an' } },
  { label: 'Premiers secours et défibrillateur', every: { value: 1, unit: 'an' } },
  { label: 'Ventilation et aspiration', every: { value: 1, unit: 'an' }, legal: true },
  { label: "Étalonnage d'un instrument de mesure", every: { value: 1, unit: 'an' }, kind: 'instrument' },
  { label: 'Entretien préventif', every: { value: 6, unit: 'mois' }, kind: 'preventive' },
  { label: 'Autre', every: { value: 1, unit: 'an' } },
];
// The list of the settings when it holds something, else the default one; "Autre" (to specify) always closes it
export function catalogue(p: Params): typeof DEFAULT_CATALOGUE {
  const own = Array.isArray(p.maint?.catalogue) ? p.maint.catalogue.filter(x => txt(x?.label).trim()) : undefined;
  if (!own?.length) return DEFAULT_CATALOGUE;
  return own.some(x => norm(x.label) === 'autre') ? own : [...own, { label: 'Autre', every: { value: 1, unit: 'an' } }];
}
export const newCheck = (label = '', every: Every = { value: 1, unit: 'an' }, legal = false, kind?: EqCheck['kind']): EqCheck => ({
  id: newId('tk'), label, every, everyDays: daysOf(atLeastOne(every)), legal, lastDone: '', ...(kind ? { kind } : {}),
});

// ---- life of a check: what was done (history), the planning, the observations
const checkOf = (e: Equipment, id: string) => recs(e.tasks).find(t => t.id === id);
// The life of a check, as a record whose lists are lists: a line that is not a record is left out
export const lifeOf = (e: Equipment, c: EqCheck): CheckLife => {
  const l = e.checkLife?.[c.id] && typeof e.checkLife[c.id] === 'object' ? e.checkLife[c.id] : undefined;
  const life: CheckLife = { ...l, history: recs(l?.history), ...(l?.reserves !== undefined ? { reserves: recs(l.reserves) } : {}) };
  (['plannedAt', 'plannedWith'] as const).forEach(k => { if (life[k] !== undefined && typeof life[k] !== 'string') delete life[k]; });   // a date or a name that is not a text is no planning
  return life;
};
// Oldest first, as written; a check from before the history counts its last date as the first line
const recorded = (e: Equipment, c: EqCheck): CheckDone[] => {
  const h = lifeOf(e, c).history;
  return h.length ? h : txt(c.lastDone) ? [{ date: c.lastDone, by: '', result: 'ok', note: '' }] : [];
};
// Most recent first (among lines of the same day, the last written first)
export const historyOf = (e: Equipment, c: EqCheck): CheckDone[] => [...recorded(e, c)].reverse().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
export const lastDoneOf = (e: Equipment, c: EqCheck): string => txt(historyOf(e, c)[0]?.date);
// Next due date: one frequency after the last time, else the first date typed at the creation. The series keeps its day of the month (see addEvery):
// the anchor is the first date typed, else the oldest line of history.
const anchorOf = (e: Equipment, c: EqCheck) => txt(c.first) || recorded(e, c).map(h => txt(h.date)).sort()[0] || '';
export function nextDue(e: Equipment, c: EqCheck): string {
  const last = lastDoneOf(e, c);
  return last ? addEvery(last, atLeastOne(everyOf(c)), anchorOf(e, c)) : txt(c.first);
}
// Days before the due date (negative once past), null without a date
export const dueIn = (e: Equipment, c: EqCheck, today: Date): number | null => daysBetween(isoDate(today), nextDue(e, c));

// ---- states
export type CheckState = 'nodate' | 'ok' | 'soon' | 'planned' | 'late' | 'ko';
export const CHECK_STATE: Record<CheckState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  nodate: { label: 'Sans date', tone: 'pending' }, ok: { label: 'À jour', tone: 'ok' }, soon: { label: 'À planifier', tone: 'warn' },
  planned: { label: 'Planifié', tone: 'pending' }, late: { label: 'Échu', tone: 'alert' }, ko: { label: 'Non conforme', tone: 'alert' },
};
// The last line of history when it leaves the check non conform: the result "non conforme", or "avec observations" with no observation written for it
// (an open observation, or one lifted since that line, was written for it; the open ones have their own task). Null once a more recent line is not.
export function koOf(e: Equipment, c: EqCheck): CheckDone | null {
  const last = historyOf(e, c)[0];
  if (!last || (last.result !== 'ko' && last.result !== 'remarks')) return null;
  return last.result === 'ko' || !(lifeOf(e, c).reserves || []).some(r => !r.liftedAt || r.liftedAt >= last.date) ? last : null;
}
// A result "avec observations" needs at least one observation written (what the screen asks before it writes the line)
export const observationProblem = (result: CheckDone['result'], texts: string[]): string =>
  result === 'remarks' && !texts.some(t => t.trim()) ? "Le résultat « avec observations » n'a aucune observation écrite." : '';
// Non conform first (whatever the date); late once the due date is past (planned or not); planned while the planned date is not past; to plan inside the notice;
// a check never dated has no state to show. A planned date past without a check written is no planning any more: the state follows the due date.
export function checkState(e: Equipment, c: EqCheck, today: Date, soonDays = 30): CheckState {
  if (koOf(e, c)) return 'ko';
  const d = dueIn(e, c, today), plan = lifeOf(e, c).plannedAt;
  if (d !== null && d < 0) return 'late';
  if (plan && plan >= isoDate(today)) return 'planned';
  return d === null ? 'nodate' : d <= soonDays ? 'soon' : 'ok';
}
// What the figures of the screen count as "late" (past its date, or non conform) and as "to plan" (to plan, or planned with its due date inside the notice)
export const countsAsLate = (st: CheckState): boolean => st === 'late' || st === 'ko';
export function inNotice(e: Equipment, c: EqCheck, today: Date, soonDays = 30): boolean {
  const st = checkState(e, c, today, soonDays), d = dueIn(e, c, today);
  return st === 'soon' || (st === 'planned' && d !== null && d <= soonDays);
}

// ---- moves (each returns the equipment, the input is never changed)
const unplanned = (l: CheckLife): CheckLife => { const { plannedAt: _a, plannedWith: _b, ...rest } = l; return rest; };
const withLife = (e: Equipment, checkId: string, f: (l: CheckLife) => CheckLife): Equipment => {
  const c = checkOf(e, checkId);
  return c ? { ...e, checkLife: { ...e.checkLife, [checkId]: f(lifeOf(e, c)) } } : e;
};
// A check done: one more line of history (it gets an id: merging two people's records tells two lines apart by it), the planning is over, the date of the
// check follows the most recent line
export function markDone(e: Equipment, checkId: string, done: CheckDone): Equipment {
  const c = checkOf(e, checkId);
  if (!c) return e;
  const history = [...recorded(e, c), { ...done, id: done.id ?? newId('cd') }], last = history.map(h => h.date).sort().at(-1)!;
  return { ...withLife(e, checkId, l => ({ ...unplanned(l), history })), tasks: recs(e.tasks).map(t => (t.id === checkId ? { ...t, lastDone: last } : t)) };
}
// Key of a line of history: its id, or for the oldest lines (none) its content; removing a line writes it in `gone` (see removeInspection)
export const doneKey = (d: CheckDone): string => d.id ?? `${d.date}|${d.by}|${d.result}|${d.note}`;
export function removeDone(e: Equipment, checkId: string, doneId: string): Equipment {
  const c = checkOf(e, checkId), rest = c ? recorded(e, c).filter(h => doneKey(h) !== doneId) : [];
  if (!c || rest.length === recorded(e, c).length) return e;
  const last = rest.map(h => h.date).sort().at(-1) ?? '';
  return { ...withLife(e, checkId, l => ({ ...l, history: rest })), tasks: recs(e.tasks).map(t => (t.id === checkId ? { ...t, lastDone: last } : t)), gone: addGone(e.gone, doneId) };
}
// An empty date takes the planning off
export const planCheck = (e: Equipment, checkId: string, at: string, withWho = ''): Equipment =>
  withLife(e, checkId, l => (at ? { ...unplanned(l), plannedAt: at, ...(withWho.trim() ? { plannedWith: withWho.trim() } : {}) } : unplanned(l)));
export const unplanCheck = (e: Equipment, checkId: string): Equipment => withLife(e, checkId, unplanned);
export const addReserve = (e: Equipment, checkId: string, text: string, due: string): Equipment =>
  text.trim() ? withLife(e, checkId, l => ({ ...l, reserves: [...(l.reserves || []), { id: newId('rs'), text: text.trim(), due, liftedAt: '' }] })) : e;
export const liftReserve = (e: Equipment, checkId: string, reserveId: string, at: string): Equipment =>
  withLife(e, checkId, l => ({ ...l, reserves: (l.reserves || []).map(r => (r.id === reserveId && !r.liftedAt ? { ...r, liftedAt: at } : r)) }));
// Observations not lifted, the nearest limit first (the ones without limit last)
export const openReserves = (e: Equipment): { check: EqCheck; reserve: Reserve }[] =>
  recs(e.tasks).flatMap(check => (lifeOf(e, check).reserves || []).filter(r => !r.liftedAt).map(reserve => ({ check, reserve })))
    .sort((a, b) => (txt(a.reserve.due) || '9').localeCompare(txt(b.reserve.due) || '9'));
// Late once the limit is past (the day of the limit is not late), as the lifting of a reservation in 3.4
export const reserveLate = (r: Reserve, today: Date): boolean => !r.liftedAt && !!txt(r.due) && (daysBetween(r.due, today) ?? -1) > 0;

// ---- maintenance contract
export type ContractState = 'none' | 'ok' | 'soon' | 'ended';
const contractDays = (e: Equipment, today: Date) => daysBetween(isoDate(today), txt(e.contract?.until));
export function contractState(e: Equipment, today: Date, soonDays = 60): ContractState {
  const d = contractDays(e, today);
  return d === null ? 'none' : d < 0 ? 'ended' : d <= soonDays ? 'soon' : 'ok';
}
// "expire" while the end is to come, "échu" once it is past: a contract is never "échu dans 45 jours"
const when = (d: number) => (d < 0 ? `échu depuis ${plural(-d, 'jour')}` : d === 0 ? "expire aujourd'hui" : `expire dans ${plural(d, 'jour')}`);
const providerOf = (e: Equipment) => txt(e.contract?.provider).trim() || 'maintenance';
// "contrat de X expire dans 45 jours" (empty without a date)
export function contractFact(e: Equipment, today: Date): string {
  const d = contractDays(e, today);
  return d === null ? '' : `contrat de ${providerOf(e)} ${when(d)}`;
}

// ---- measuring instruments: an instrument is an equipment of that type (its checks other than the preventive ones) or a check of that kind on any equipment
const isCalibration = (e: Equipment, c: EqCheck) => (e.kind === 'instrument' ? c.kind !== 'preventive' : c.kind === 'instrument');
// Calibrations past or falling due inside the notice, the nearest first
export function calibrationsDue(s: State, today: Date, soonDays = soonOf(s)): { e: Equipment; c: EqCheck; days: number }[] {
  return live(s).flatMap(e => recs(e.tasks).filter(c => isCalibration(e, c)).map(c => ({ e, c, days: dueIn(e, c, today) })))
    .filter((x): x is { e: Equipment; c: EqCheck; days: number } => x.days !== null && x.days <= soonDays).sort((a, b) => a.days - b.days);
}

// ---- calendar: the due dates of the next months, month by month (the ones past go to the first month; a month without due date is left out)
export interface UpcomingItem { eqId: string; checkId: string; label: string; eqName: string; due: string; state: CheckState; legal: boolean }
export function upcoming(s: State, today: Date, months = 12): { month: string; items: UpcomingItem[] }[] {
  const base = today.getFullYear() * 12 + today.getMonth(), soon = soonOf(s), by = new Map<number, UpcomingItem[]>();
  for (const e of live(s)) {
    for (const c of recs(e.tasks)) {
      const due = nextDue(e, c), d = parseDate(due);
      if (!d) continue;
      const i = Math.max(0, d.getFullYear() * 12 + d.getMonth() - base);
      if (i < months) by.set(i, [...(by.get(i) || []), { eqId: e.id, checkId: c.id, label: txt(c.label), eqName: txt(e.name), due, state: checkState(e, c, today, soon), legal: c.legal }]);
    }
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([i, items]) => ({
    month: `${Math.floor((base + i) / 12)}-${String((base + i) % 12 + 1).padStart(2, '0')}`,
    items: items.sort((a, b) => a.due.localeCompare(b.due) || (a.eqName || '').localeCompare(b.eqName || '') || (a.label || '').localeCompare(b.label || '')),
  }));
}

// ---- what is left to do on the checks (the person concerned is the manager of the equipment, the due date is the one of the check)
// `ref` is the id of the check for a check, the id of the observation for a remark. `text` is the task (infinitive), `fact` the same thing as a statement
// (no equipment in it: a card already belongs to one).
const koText = (l: CheckDone) => (l.result === 'ko' ? `non conforme le ${frDate(l.date)}` : `noté « avec observations » le ${frDate(l.date)}, sans observation écrite`);
// What the planning says: a planned date past with no check written after it says so
const planText = (plan: string, today: string) => `planifié le ${frDate(plan)}${plan < today ? ', pas noté fait' : ''}`;
export function checkTodos(s: State, now = new Date()): MaintTodo[] {
  const out: MaintTodo[] = [], soon = soonOf(s), today = isoDate(now);
  for (const e of live(s)) {
    const add = (kind: MaintTodo['kind'], key: string, text: string, fact: string, tone: MaintTodo['tone'], due: string, ref?: string) =>
      out.push({ id: `${kind}${e.id}${key}`, kind, text, fact, tone, who: txt(e.manager), due, eqId: e.id, ...(ref ? { ref } : {}) });
    for (const c of recs(e.tasks)) {
      const st = checkState(e, c, now, soon), d = dueIn(e, c, now) ?? 0, life = lifeOf(e, c), plan = life.plannedAt ?? '', tone = c.legal ? 'bad' : 'warn';
      const name = `« ${nameOf(c)} »`, here = `${name} (${eqName(e)})`, planned = plan ? `, ${planText(plan, today)}` : '', left = d === 0 ? "échéance aujourd'hui" : `échéance dans ${plural(d, 'jour')}`;
      if (st === 'ko') { const l = koOf(e, c)!; add('check', c.id, `Reprendre le contrôle ${here}, ${koText(l)}${planned}`, `Contrôle ${name} ${koText(l)}${planned}`, tone, txt(l.date), c.id); }
      else if (st === 'late') add('check', c.id, `Faire le contrôle ${here}, échu depuis ${plural(-d, 'jour')}${planned}`, `Contrôle ${name} échu depuis ${plural(-d, 'jour')}${planned}`, tone, nextDue(e, c), c.id);
      else if (st === 'soon') add('check', c.id, `Planifier le contrôle ${here}, ${left}${planned}`, `Contrôle ${name} ${plan ? planText(plan, today) : 'non planifié'}, ${left}`, 'warn', nextDue(e, c), c.id);
      else if (st === 'planned') {
        const who = life.plannedWith ? ` avec ${life.plannedWith}` : '';
        if ((daysBetween(today, plan) ?? 0) <= PLANNED_NOTICE) add('check', c.id, `Contrôle ${here} prévu le ${frDate(plan)}${who}`, `Contrôle ${name} prévu le ${frDate(plan)}${who}`, 'warn', plan, c.id);
      }
      else if (st === 'nodate') add('check', c.id, `Renseigner la date du contrôle ${here}`, `Contrôle ${name} sans date : ni contrôle noté, ni première échéance`, 'warn', '', c.id);
    }
    for (const { check, reserve } of openReserves(e)) {
      const late = reserveLate(reserve, now), limit = txt(reserve.due), days = plural(daysBetween(limit, now) ?? 0, 'jour'), what = txt(reserve.text);
      add('remark', reserve.id, `Lever l'observation « ${what} » du contrôle « ${nameOf(check)} » (${eqName(e)})${late ? `, en retard de ${days}` : limit ? `, avant le ${frDate(limit)}` : ''}`,
        `Observation « ${what} » du contrôle « ${nameOf(check)} » ${late ? `en retard de ${days}` : limit ? `à lever avant le ${frDate(limit)}` : 'sans date limite'}`, late ? 'bad' : 'warn', limit, reserve.id);
    }
    const ct = contractState(e, now);
    if (ct === 'soon' || ct === 'ended') { const w = when(contractDays(e, now) ?? 0); add('contract', '', `Revoir le contrat de ${providerOf(e)} (${eqName(e)}), ${w}`, `Contrat de ${providerOf(e)} : ${w}`, 'warn', txt(e.contract?.until)); }
  }
  return out;
}

// ---- facts of the summary: who, how many, since when; "marqué obligatoire" says what the company ticked, never what the law says
export function checkFacts(s: State, now = new Date()): Insight[] {
  const out: Insight[] = [], soon = soonOf(s), today = isoDate(now);
  const all = live(s).flatMap(e => recs(e.tasks).map(c => ({ e, c, st: checkState(e, c, now, soon), d: dueIn(e, c, now) ?? 0, plan: lifeOf(e, c).plannedAt ?? '' })));
  // the calibrations have their own fact when they fall due; a non conform one, a planning without suite or a check without date shows here whatever it is
  const rows = all.filter(x => !isCalibration(x.e, x.c));
  const ko = all.filter(x => x.st === 'ko'), legalKo = ko.filter(x => x.c.legal).length;
  if (ko.length) out.push({ key: 'check-ko', tone: legalKo ? 'bad' : 'warn', title: 'Contrôles non conformes', text: `${names(ko, x => `${nameOf(x.c)} (${eqName(x.e)}, ${koText(koOf(x.e, x.c)!)})`)}${legalKo ? `, dont ${plural(legalKo, 'marqué obligatoire', 'marqués obligatoires')}` : ''}.` });
  const late = rows.filter(x => x.st === 'late'), legal = late.filter(x => x.c.legal).length;
  if (late.length) out.push({ key: 'check-late', tone: legal ? 'bad' : 'warn', title: 'Contrôles échus', text: `${names(late, x => `${nameOf(x.c)} (${eqName(x.e)}, depuis ${plural(-x.d, 'jour')})`)}${legal ? `, dont ${plural(legal, 'marqué obligatoire', 'marqués obligatoires')}` : ''}.` });
  const near = rows.filter(x => x.st === 'soon');
  if (near.length) out.push({ key: 'check-soon', tone: 'warn', title: 'Contrôles à planifier', text: `${names(near, x => `${nameOf(x.c)} (${eqName(x.e)}, ${x.d === 0 ? "échéance aujourd'hui" : `dans ${plural(x.d, 'jour')}`})`)}.` });
  const missed = all.filter(x => x.plan && x.plan < today && x.st !== 'ko');
  if (missed.length) out.push({ key: 'check-missed', tone: 'warn', title: 'Contrôles planifiés sans suite', text: `${names(missed, x => `${nameOf(x.c)} (${eqName(x.e)}, ${planText(x.plan, today)})`)}.` });
  const rs = live(s).flatMap(e => openReserves(e).map(r => ({ e, ...r }))), lateRs = rs.filter(x => reserveLate(x.reserve, now)).length;
  if (rs.length) out.push({ key: 'check-remark', tone: lateRs ? 'bad' : 'warn', title: 'Observations non levées', text: `${names(rs, x => `${txt(x.reserve.text)} (${nameOf(x.check)}, ${eqName(x.e)})`)}${lateRs ? `, dont ${lateRs} en retard` : ''}.` });
  const cals = calibrationsDue(s, now, soon);
  if (cals.length) out.push({
    key: 'check-calib', tone: cals.some(x => x.days < 0 && x.c.legal) ? 'bad' : 'warn', title: 'Étalonnages à échéance',
    text: `${names(cals, x => `${eqName(x.e)} (${nameOf(x.c)}, ${x.days < 0 ? `échu depuis ${plural(-x.days, 'jour')}` : x.days === 0 ? "échéance aujourd'hui" : `à étalonner dans ${plural(x.days, 'jour')}`})`)}.`,
  });
  const cts = live(s).filter(e => ['soon', 'ended'].includes(contractState(e, now)));
  if (cts.length) out.push({ key: 'check-contract', tone: 'warn', title: 'Contrats de maintenance', text: `${names(cts, e => `${eqName(e)} : ${contractFact(e, now)}`)}.` });
  const undated = all.filter(x => x.st === 'nodate');
  if (undated.length) out.push({ key: 'check-nodate', tone: 'warn', title: 'Contrôles sans date', text: `${names(undated, x => `${nameOf(x.c)} (${eqName(x.e)})`)}.` });
  return out;
}
