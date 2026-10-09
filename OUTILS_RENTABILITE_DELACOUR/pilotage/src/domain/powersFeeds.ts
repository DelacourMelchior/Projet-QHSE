// Figures of tool 4.1 for the monthly dashboard (1.1): proposed, never written silently (see feeds.ts and the box of the tool).
// The indicator is added to the dashboard by one click in the tool. The structure of the powers is the one of today, so only the month under way and the month just closed are proposed.
import type { Kpi, Period, State } from './types';
import { defaultProcess } from './base';
import { activePowers, activeVaults, depViews, powerCfg, powerState, signStatus, tracksPractice, vaultState } from './powers';
import { addMonths, periodOfDate } from './periods';

type Role = NonNullable<Kpi['role']>;

export const POWER_KPIS: { id: string; role: Role; name: string; unit: string; direction: Kpi['direction']; target: string; targetValue: number; type: Kpi['type']; how: string }[] = [
  { id: 'kpi_power_ready', role: 'power_ready', name: 'Fonctions clés à suppléance prête (%)', unit: '%', direction: 'higher', target: '100 %', targetValue: 100, type: 'Vital', how: 'fonctions clés avec deux suppléants, et la délégation signée par le titulaire, les suppléants et la direction' },
  { id: 'kpi_power_practised', role: 'power_practised', name: 'Signatures de délégation recueillies (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Garde-fou', how: 'signatures du titulaire, des suppléants et de la direction déjà faites, sur toutes celles attendues' },
  { id: 'kpi_power_vault', role: 'power_vault', name: 'Enveloppes des accès vérifiées dans les 6 mois (%)', unit: '%', direction: 'higher', target: '100 %', targetValue: 100, type: 'Garde-fou', how: 'enveloppes vérifiées dans le délai et qui ne sont pas restées ouvertes' },
];
export const isPowerKpi = (k: Kpi) => POWER_KPIS.some(m => m.role === k.role || m.id === k.id);

// Adds the indicators the dashboard does not have yet, in the process P4 (or the first one of the map); returns how many were added
export function addPowerKpis(d: Pick<State, 'kpis' | 'processes'>): number {
  let n = 0;
  const pid = defaultProcess('P4', d.processes.map(x => x.id));
  for (const m of POWER_KPIS) {
    if (Object.values(d.kpis).some(k => k.role === m.role || k.id === m.id)) continue;
    d.kpis[m.id] = { id: m.id, role: m.role, name: m.name, processId: pid, type: m.type, unit: m.unit, direction: m.direction, aggregation: 'avg', target: m.target, targetValue: m.targetValue, confidential: false, source: 'Outil 4.1' };
    d.processes.find(p => p.id === pid)?.kpiIds.push(m.id);
    n++;
  }
  return n;
}

// The day the figure is read: today for the month under way, the last day of the month just closed; nothing for an older month
const asOf = (period: Period, today: Date): Date | null => {
  const cur = periodOfDate(today);
  return period === cur ? today : period === addMonths(cur, -1) ? new Date(today.getFullYear(), today.getMonth(), 0) : null;
};
const pct = (ok: number, total: number) => (total ? Math.round(ok / total * 100) : null);

export function powerKpiValue(s: State, role: Role, period: Period, today = new Date()): number | null {
  const at = asOf(period, today), cfg = powerCfg(s.params);
  if (!at) return null;
  const ps = activePowers(s);
  switch (role as string) {
    case 'power_ready': return pct(ps.filter(p => powerState(p, at, s, cfg) === 'ok').length, ps.length);
    case 'power_practised': {
      if (!tracksPractice(cfg)) { const all = ps.flatMap(p => signStatus(s, p).needs); return pct(all.filter(x => x.sign).length, all.length); }
      return pct(ps.reduce((n, p) => n + Math.min(2, depViews(p, s, at, cfg).filter(d => d.ready && !d.who.gone).length), 0), ps.length * 2);
    }
    case 'power_vault': { const vs = activeVaults(s); return pct(vs.filter(v => vaultState(s, v, at) === 'ok').length, vs.length); }
    default: return null;
  }
}

// What the dashboard offers for a month: the indicators that have something to say, with how each was computed
export function powerFeeds(s: State, p: Period, today = new Date()): { role: Role; value: number; how: string }[] {
  if (!Object.keys(s.powers).length && !Object.keys(s.vaults).length) return [];
  return POWER_KPIS.flatMap(k => { const value = powerKpiValue(s, k.role, p, today); return value === null ? [] : [{ role: k.role, value, how: k.how }]; });
}
