// Calculation engine: pure functions, no DOM. Covered by engine.test.ts.
import type { Action, Kpi, KpiRole, Level, Period, State, Status } from './types';
import { addMonths, parseDate, parsePeriod, periodLabel, periodOfDate, periodsBetween } from './periods';
import { formatCompact, formatValue } from './numbers';

export const timelinePeriods = (s: State) => periodsBetween(s.timeline.start, s.timeline.end);

export const valueOf = (s: State, kpiId: string, p: Period): number | null => {
  const v = s.values[kpiId]?.[p];
  return v === undefined ? null : v;
};

export const kpisInOrder = (s: State): Kpi[] =>
  [...s.processes].sort((a, b) => a.order - b.order).flatMap(p => p.kpiIds.map(id => s.kpis[id]).filter(Boolean));

export const kpiByRole = (s: State, role: KpiRole): Kpi | undefined => Object.values(s.kpis).find(k => k.role === role);

// Default month shown: the last month where at least half of the KPIs are entered
// (a month being entered does not hide the last complete one), else the last month with any value
export function lastFilledPeriod(s: State): Period {
  const ps = timelinePeriods(s);
  const ids = Object.keys(s.kpis);
  const filled = (p: Period) => ids.filter(id => valueOf(s, id, p) !== null).length;
  for (let i = ps.length - 1; i >= 0; i--) if (ids.length && filled(ps[i]) >= ids.length / 2) return ps[i];
  for (let i = ps.length - 1; i >= 0; i--) if (filled(ps[i]) > 0) return ps[i];
  return ps[0];
}

// ---- status of a KPI for one month
// higher is better: drift down to -10 %, alert beyond; lower is better: drift up to +20 %, alert beyond
export function kpiStatus(k: Kpi, v: number | null): Status {
  if (v === null) return { level: 'pending', text: 'À saisir', gapPct: null };
  const t = k.targetValue;
  if (t === null || t === undefined) return { level: 'ok', text: 'Conforme', gapPct: null };
  if (t === 0) {
    const ok = k.direction === 'higher' ? v >= 0 : v <= 0;
    return ok ? { level: 'ok', text: 'Conforme', gapPct: null }
      : { level: 'alert', text: `Alerte (${formatValue(v, '')} pour 0)`, gapPct: null };
  }
  const gap = ((v - t) / Math.abs(t)) * 100;
  const r = Math.round(gap);
  if (k.direction === 'higher') {
    if (v >= t) return { level: 'ok', text: 'Conforme', gapPct: gap };
    return gap >= -10 ? { level: 'warn', text: `Dérive (${r} %)`, gapPct: gap } : { level: 'alert', text: `Alerte (${r} %)`, gapPct: gap };
  }
  if (v <= t) return { level: 'ok', text: 'Conforme', gapPct: gap };
  return gap <= 20 ? { level: 'warn', text: `Dérive (+${r} %)`, gapPct: gap } : { level: 'alert', text: `Alerte (+${r} %)`, gapPct: gap };
}

export const statusAt = (s: State, k: Kpi, p: Period) => kpiStatus(k, valueOf(s, k.id, p));
export const isAlert = (l: Level) => l === 'warn' || l === 'alert';

// ---- year summary: months of the same calendar year, up to the period
export function yearToDate(s: State, k: Kpi, p: Period) {
  const { year } = parsePeriod(p);
  const ps = timelinePeriods(s).filter(x => x <= p && parsePeriod(x).year === year);
  const vals = ps.map(x => valueOf(s, k.id, x)).filter((v): v is number => v !== null);
  return { sum: vals.reduce((a, b) => a + b, 0), count: vals.length, monthsElapsed: parsePeriod(p).month0 + 1, vals };
}

export function yearSummary(s: State, k: Kpi, p: Period): { value: number | null; label: string } {
  const { sum, vals } = yearToDate(s, k, p);
  if (!vals.length) return { value: null, label: '' };
  if (k.aggregation === 'sum') return { value: sum, label: 'Cumul' };
  if (k.aggregation === 'last') return { value: vals[vals.length - 1], label: 'Dernier' };
  return { value: sum / vals.length, label: 'Moyenne' };
}

// ---- trend: 3-month moving average
export function movingAverage(s: State, k: Kpi, p: Period): number | null {
  const v = [0, 1, 2].map(i => valueOf(s, k.id, addMonths(p, -i)));
  return v.every(x => x !== null) ? (v as number[]).reduce((a, b) => a + b, 0) / 3 : null;
}

export interface Trend { from: number; to: number; pct: number; dir: 'up' | 'down' | 'stable'; isGood: boolean | null; drifting: boolean }

// Average of the last 3 months vs 3 months earlier; needs 6 entered months.
// "drifting" = still compliant, but the average worsened 3 months in a row (early warning).
export function trend(s: State, k: Kpi, p: Period): Trend | null {
  const entered = timelinePeriods(s).filter(x => x <= p && valueOf(s, k.id, x) !== null).length;
  if (entered < 6) return null;
  const ma = [3, 2, 1, 0].map(i => movingAverage(s, k, addMonths(p, -i)));
  const [from, , , to] = ma;
  if (from === null || to === null) return null;
  const pct = from !== 0 ? ((to - from) / Math.abs(from)) * 100 : 0;
  const dir = Math.abs(pct) < 2 ? 'stable' : pct > 0 ? 'up' : 'down';
  const isGood = dir === 'stable' ? null : (dir === 'up') === (k.direction === 'higher');
  const worse = (a: number, b: number) => (k.direction === 'lower' ? b > a : b < a);
  const st = statusAt(s, k, p);
  const drifting = st.level === 'ok' && ma.every(x => x !== null) &&
    worse(ma[0]!, ma[1]!) && worse(ma[1]!, ma[2]!) && worse(ma[2]!, ma[3]!);
  return { from, to, pct, dir, isGood, drifting };
}

// ---- actions
export const actionsOf = (s: State, kpiId: string): Action[] =>
  Object.values(s.actions).filter(a => a.kpiId === kpiId).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

export const isOpen = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';
// Deletes an indicator with its values and its actions, and takes it off its process (the one way, used by tool 1.1 and by tool 1.4)
export function deleteKpi(d: Pick<State, 'kpis' | 'values' | 'actions' | 'processes'>, id: string): void {
  delete d.kpis[id]; delete d.values[id];
  d.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(i => i !== id); });
  Object.values(d.actions).filter(a => a.kpiId === id).forEach(a => { delete d.actions[a.id]; });
}
export const openActionWithPilot = (s: State, kpiId: string) => actionsOf(s, kpiId).find(a => isOpen(a) && a.pilot.trim() !== '');

export function isOverdue(a: Action, today = new Date()): boolean {
  const d = parseDate(a.deadline);
  return !!d && isOpen(a) && d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export type Effectiveness =
  | { state: 'pending' }                       // action not done yet
  | { state: 'waiting'; period: Period }       // done, next month not entered yet
  | { state: 'effective' | 'relapse'; period: Period; value: number };

// Judged on the month that follows the closure
export function effectiveness(s: State, a: Action): Effectiveness {
  if (isOpen(a)) return { state: 'pending' };
  const k = s.kpis[a.kpiId];
  const closed = parseDate(a.closedAt) || parseDate(a.createdAt);
  if (!k || !closed) return { state: 'pending' };
  const p = addMonths(periodOfDate(closed), 1);
  const v = valueOf(s, k.id, p);
  if (v === null) return { state: 'waiting', period: p };
  return { state: kpiStatus(k, v).level === 'ok' ? 'effective' : 'relapse', period: p, value: v };
}

// ---- executive summary and analysis messages
export interface Insight { key: string; title: string; text: string; tone: 'good' | 'warn' | 'bad' }

export function synthesis(s: State, p: Period) {
  const kpis = kpisInOrder(s);
  const statuses = kpis.map(k => ({ k, st: statusAt(s, k, p) }));
  const alerts = statuses.filter(x => isAlert(x.st.level)).map(x => x.k);
  const orphans = alerts.filter(k => !openActionWithPilot(s, k.id));
  const filled = statuses.filter(x => x.st.level !== 'pending').length;
  const ca = kpiByRole(s, 'ca');
  let caYtd: { value: number; budget: number; gapPct: number | null } | null = null;
  if (ca) {
    const y = yearToDate(s, ca, p);
    const budget = s.settings.annualBudget * y.monthsElapsed / 12;
    caYtd = { value: y.sum, budget, gapPct: budget > 0 ? (y.sum / budget - 1) * 100 : null };
  }
  return { kpis, alerts, orphans, filled, total: kpis.length, ca, caYtd };
}

export function insights(s: State, p: Period, hideConfidential: boolean): Insight[] {
  const out: Insight[] = [];
  const syn = synthesis(s, p);
  const name = (k: Kpi) => k.name.replace(/\s*\(.*\)\s*$/, '');
  const visible = (k: Kpi) => !(hideConfidential && k.confidential);

  const shownOrphans = syn.orphans.filter(visible);
  if (shownOrphans.length) {
    const hidden = syn.orphans.length - shownOrphans.length;
    out.push({ key: 'orphans', tone: 'bad', title: 'Pilote à désigner',
      text: `${shownOrphans.length} indicateur(s) en dérive sans action pilotée : ${shownOrphans.map(name).join(', ')}${hidden ? ` (et ${hidden} indicateur(s) de direction)` : ''}. Nommez un pilote et une échéance pour chacun.` });
  }
  const drifts = syn.kpis.filter(visible).map(k => ({ k, t: trend(s, k, p) })).filter(x => x.t?.drifting);
  if (drifts.length) {
    out.push({ key: 'drift', tone: 'warn', title: 'Dérive lente',
      text: `${drifts.slice(0, 3).map(({ k, t }) => `${name(k)} (moyenne 3 mois ${formatCompact(t!.from, k.unit)} → ${formatCompact(t!.to, k.unit)})`).join(', ')}. Encore conforme${drifts.length > 1 ? 's' : ''}, mais en dégradation depuis 3 mois : à surveiller avant l'alerte.` });
  }
  const otif = kpiByRole(s, 'otif'), ret = kpiByRole(s, 'retouches');
  if (otif && ret) {
    const o = valueOf(s, otif.id, p), r = valueOf(s, ret.id, p);
    if (o !== null && r !== null && kpiStatus(otif, o).level !== 'ok' && kpiStatus(ret, r).level !== 'ok') {
      out.push({ key: 'goulet', tone: 'warn', title: 'Goulet atelier',
        text: `${formatValue(r, ret.unit)} de retouche (cible ${ret.target}) pèsent sur le respect des délais (${formatValue(o, otif.unit)}, cible ${otif.target}).` });
    }
  }
  const cnq = kpiByRole(s, 'cnq');
  if (cnq && visible(cnq)) {
    const v = valueOf(s, cnq.id, p);
    if (v !== null && kpiStatus(cnq, v).level !== 'ok') {
      const year = yearToDate(s, cnq, p).sum;
      const ratio = s.settings.netMarginPct > 0 ? 100 / s.settings.netMarginPct : 20;
      out.push({ key: 'cnq', tone: 'bad', title: 'Non-qualité au-dessus de la cible',
        text: `${formatValue(v, '€')} en ${periodLabel(p)} (cible ${cnq.target}). Sur l'année : ${formatValue(year, '€')} de pertes, soit ${formatValue(year * ratio, '€')} de CA à refaire avec une marge nette de ${s.settings.netMarginPct} %.` });
    }
  }
  const dev = kpiByRole(s, 'devis_attente');
  if (dev) {
    const v = valueOf(s, dev.id, p);
    if (v !== null && kpiStatus(dev, v).level !== 'ok') {
      out.push({ key: 'devis', tone: 'warn', title: 'Risque commercial',
        text: `${v} devis non relancés depuis plus de 7 jours.` });
    }
  }
  if (syn.ca && syn.caYtd && visible(syn.ca)) {
    const y = yearToDate(s, syn.ca, p);
    if (y.monthsElapsed >= 2 && y.count >= 2) {
      const projected = (y.sum / y.count) * 12;
      const diff = projected - s.settings.annualBudget;
      if (Math.abs(diff) > s.settings.annualBudget * 0.025) {
        out.push({ key: 'projection', tone: diff >= 0 ? 'good' : 'bad', title: diff >= 0 ? 'Atterrissage annuel favorable' : 'Atterrissage annuel en retard',
          text: `Au rythme actuel, l'exercice finirait à ${formatValue(projected, '€')} (${diff >= 0 ? '+' : ''}${formatValue(diff, '€')} par rapport à l'objectif de ${formatValue(s.settings.annualBudget, '€')}).` });
      }
    }
  }
  if (syn.filled > 0 && syn.filled < syn.total) {
    out.push({ key: 'missing', tone: 'warn', title: 'Saisie incomplète',
      text: `${syn.total - syn.filled} indicateur(s) restent à saisir pour ${periodLabel(p)} : la synthèse ne porte que sur les ${syn.filled} déjà saisis.` });
  }
  if (!out.length && syn.filled > 0) {
    out.push({ key: 'ok', tone: 'good', title: 'Tout est sous contrôle', text: `Les indicateurs de ${periodLabel(p)} sont conformes à leurs cibles.` });
  }
  return out;
}
