// Figures of tool 3.3 for the monthly dashboard (1.1): proposed, never written silently (see feeds.ts and the box of the tool).
// The indicator is added to the dashboard by one click in the tool; its value of a month is computed from the records, and shown next to the one entered.
import type { Breakdown, Equipment, Kpi, Period, State } from './types';
import { daysBetween, defaultProcess, parseStamp, sum } from './base';
import { isoDate, parsePeriod } from './periods';
import { breakdownHours, dateOf, eqStatus, openAnomalies, pausedIn, recs, routineRate, txt } from './maintenance';
import { atOf, followedSpares, isCritical, spareLevel } from './maintenanceSpares';
import { checkState, countsAsLate } from './maintenanceChecks';
import { maintCfg } from './maintenance';

export const MAINT_KPIS: { id: string; role: NonNullable<Kpi['role']>; name: string; unit: string; direction: Kpi['direction']; target: string; targetValue: number; type: Kpi['type'] }[] = [
  { id: 'kpi_maint_routine', role: 'maint_routine', name: 'Routines faites à temps (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Garde-fou' },
  { id: 'kpi_maint_anomalies', role: 'maint_anomalies', name: 'Équipements sans anomalie ouverte depuis plus de 7 jours (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Garde-fou' },
  { id: 'kpi_maint_down', role: 'maint_down', name: "Heures d'arrêt de panne", unit: 'h', direction: 'lower', target: '≤ 16 h', targetValue: 16, type: 'Performance' },
  { id: 'kpi_maint_checks', role: 'maint_checks', name: 'Contrôles périodiques à jour (%)', unit: '%', direction: 'higher', target: '100 %', targetValue: 100, type: 'Vital' },
  { id: 'kpi_maint_spares', role: 'maint_spares', name: 'Pièces critiques au moins au stock mini (%)', unit: '%', direction: 'higher', target: '100 %', targetValue: 100, type: 'Vital' },
];
export const isMaintKpi = (k: Kpi) => MAINT_KPIS.some(m => m.role === k.role || m.id === k.id);

// Adds the indicators the dashboard does not have yet, in the process P3 (or the first one of the map); returns how many were added
export function addMaintKpis(d: Pick<State, 'kpis' | 'processes'>): number {
  let n = 0;
  const pid = defaultProcess('P3', d.processes.map(x => x.id));
  for (const m of MAINT_KPIS) {
    if (Object.values(d.kpis).some(k => k.role === m.role || k.id === m.id)) continue;
    d.kpis[m.id] = { id: m.id, role: m.role, name: m.name, processId: pid, type: m.type, unit: m.unit, direction: m.direction, aggregation: m.unit === 'h' ? 'sum' : 'avg', target: m.target, targetValue: m.targetValue, confidential: false, source: 'Outil 3.3' };
    d.processes.find(p => p.id === pid)?.kpiIds.push(m.id);
    n++;
  }
  return n;
}

const pct = (a: number, b: number) => (b ? Math.round(a / b * 100) : null);

// The equipment was followed at the end of the month: one retired later still counts for the months it was in service; the months of a pause (a retirement
// that ended with a return to service) do not count, as the months of a retirement that goes on do not
export const activeIn = (e: Equipment, p: Period): boolean => {
  const { year, month0 } = parsePeriod(p), retired = txt(e.retiredAt).slice(0, 10);
  return (!retired || retired > isoDate(new Date(year, month0 + 1, 0))) && !pausedIn(e, new Date(year, month0, 1), new Date(year, month0 + 1, 1));
};
// First day of data of the tool (a routine, an anomaly, a breakdown, a check done, a movement of a part); '' when there is none
function firstData(s: State): string {
  const days = [
    ...Object.values(s.equipments).flatMap(e => [...recs(e.inspections).map(i => i.date), ...recs(e.anomalies).map(a => a.date), ...recs(e.breakdowns).map(b => b.date), ...Object.values(e.checkLife ?? {}).flatMap(l => recs(l?.history).map(h => h.date))]),
    ...Object.values(s.spares ?? {}).flatMap(x => recs(x?.moves).map(m => atOf(m).slice(0, 10))),
  ].filter(d => dateOf(d)).sort();
  return days[0] ?? '';
}
// Hours of a breakdown that fall in the month p, [from, to), never past `at`: a stop going over the end of a month counts in each month what it lasted there
// (82 hours from 28 September 22:00 to 2 October 08:00 are 50 hours in September and 32 in October); one still going lasts until `at`. Hours that were typed
// (the field says "calculées, modifiables") are the total of the stop: each month takes what the stop had lasted in it, the later months what is left of the total,
// so that the months add up to what was written, and to the overlap of the two times when the hours are the ones of those times. A breakdown without a start
// (only its date) counts in the month of its date.
const hoursIn = (b: Breakdown, p: Period, from: Date, to: Date, at: Date): number => {
  const a = parseStamp(txt(b.startedAt))?.getTime(), t = at.getTime(), ended = parseStamp(txt(b.endedAt))?.getTime();
  if (a === undefined) return txt(b.date).slice(0, 7) === p ? breakdownHours(b, at) : 0;
  const z = ended ?? t, len = z - a, hours = ended !== undefined && Number.isFinite(b.hours) ? b.hours! : Math.max(0, len) / 3600000;
  if (len <= 0) return isoDate(new Date(a)).slice(0, 7) === p ? hours : 0;
  const h = (ms: number) => Math.max(0, ms) / 3600000, here = h(Math.min(z, to.getTime(), t) - Math.max(a, from.getTime())), before = h(Math.min(z, from.getTime()) - a);
  return Math.max(0, Math.min(here, hours - Math.min(hours, before)));
};

// The value of each indicator for a month, from the records as they stood at the end of that month (today for the current one): the routine and the stops
// of the month, the rest as it stands today (current month only). Nothing for a month to come, nor for one before the first record of the tool.
export function maintFeeds(s: State, p: Period, today = new Date()): { role: NonNullable<Kpi['role']>; value: number; how: string }[] {
  const all = Object.values(s.equipments), eqs = all.filter(e => eqStatus(e) !== 'retired');
  const spares = followedSpares(s).filter(isCritical);
  if (!all.length && !spares.length) return [];
  const cur = isoDate(today).slice(0, 7), first = firstData(s).slice(0, 7) || cur;
  if (p > cur || p < first) return [];
  const { year, month0 } = parsePeriod(p), from = new Date(year, month0, 1), to = new Date(year, month0 + 1, 1), at = p < cur ? to : today;
  const out: { role: NonNullable<Kpi['role']>; value: number; how: string }[] = [];
  const rates = all.filter(e => activeIn(e, p)).map(e => routineRate(e, at, s.params)).filter((n): n is number => n !== null);
  if (rates.length) out.push({ role: 'maint_routine', value: Math.round(sum(rates) / rates.length), how: 'part des périodes de routine faites (au plus les 12 dernières finies, depuis la première routine, sans les périodes d\'arrêt), moyenne des équipements suivis à la fin du mois' });
  out.push({ role: 'maint_down', value: Math.round(sum(all.flatMap(e => recs(e.breakdowns).map(b => hoursIn(b, p, from, to, at)))) * 10) / 10, how: "heures d'arrêt de chaque panne qui tombent dans le mois (une panne à cheval sur deux mois compte dans chacun sa part ; un arrêt en cours compte ses heures écoulées), équipements retirés compris" });
  if (p === cur) {
    const soon = maintCfg(s.params).soonDays;
    const old = (e: State['equipments'][string]) => openAnomalies(e).some(a => dateOf(a.date) && (daysBetween(a.date.slice(0, 10), today) ?? 0) > 7);
    if (eqs.length) out.push({ role: 'maint_anomalies', value: pct(eqs.filter(e => !old(e)).length, eqs.length) ?? 100, how: 'équipements dont aucune anomalie ouverte ne date de plus de 7 jours, aujourd\'hui' });
    const checks = eqs.flatMap(e => recs(e.tasks).map(c => checkState(e, c, today, soon))).filter(x => x !== 'nodate');
    if (checks.length) out.push({ role: 'maint_checks', value: pct(checks.filter(x => !countsAsLate(x)).length, checks.length) ?? 100, how: 'contrôles datés qui ne sont pas échus, aujourd\'hui' });
    if (spares.length) out.push({ role: 'maint_spares', value: pct(spares.filter(sp => ['ok', 'min'].includes(spareLevel(sp))).length, spares.length) ?? 100, how: 'pièces critiques de l\'armoire au moins au stock mini, aujourd\'hui' });
  }
  return out;
}
