// Figures of tool 3.4 for the monthly dashboard (1.1): proposed, never written silently (see feeds.ts and the box of the tool).
// The indicator is added to the dashboard by one click in the tool; its value of a month comes from the records dated in that month. No amount: only shares.
import type { Delivery, Kpi, Milestone, Period, State } from './types';
import { defaultProcess } from './base';
import { counted, derogationLogged, lotView, lotsOf, promisedOn, pvSigned, reserveDue, reserveLateDays, reservesOf } from './receptions';

type Role = NonNullable<Kpi['role']>;

// The roles are listed in KpiRole (types.ts)
export const RECEPTION_KPIS: { id: string; role: Role; name: string; unit: string; direction: Kpi['direction']; target: string; targetValue: number; type: Kpi['type']; how: string }[] = [
  { id: 'kpi_recep_clean', role: 'recep_clean' as Role, name: 'Réceptions prononcées sans réserve (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Performance', how: 'réceptions du mois prononcées sans réserve, sur les réceptions prononcées dont le PV est signé (signature du client, photo du PV papier ou témoin) : une réception dont le PV n\'est pas signé, ou reportée par une réserve bloquante, n\'est pas comptée' },
  { id: 'kpi_recep_lifted', role: 'recep_lifted' as Role, name: 'Réserves levées dans le délai (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Garde-fou', how: 'réserves dont le délai de levée tombe dans le mois, levées dans le délai' },
  { id: 'kpi_recep_first', role: 'recep_first' as Role, name: 'Jalons conformes du premier coup (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Garde-fou', how: 'jalons contrôlés dans le mois, conformes dès le premier contrôle' },
  { id: 'kpi_recep_released', role: 'recep_released' as Role, name: 'Commandes libérées sans dérogation (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Vital', how: 'commandes libérées dans le mois sans dérogation (une libération défaite puis refaite compte avec dérogation quand une dérogation a été écrite au journal)' },
  { id: 'kpi_recep_promised', role: 'recep_promised' as Role, name: 'Livraisons à la date promise (%)', unit: '%', direction: 'higher', target: '≥ 90 %', targetValue: 90, type: 'Performance', how: 'livraisons reçues dans le mois (ni refusées, ni reportées par une réserve bloquante) faites au plus tard à la date promise, celle de la commande ou à défaut celle du devis (commandes avec une date promise)' },
];
export const isReceptionKpi = (k: Kpi) => RECEPTION_KPIS.some(m => m.role === k.role || m.id === k.id);

// Adds the indicators the dashboard does not have yet, in the process P3 (or the first one of the map); returns how many were added
export function addReceptionKpis(d: Pick<State, 'kpis' | 'processes'>): number {
  let n = 0;
  const pid = defaultProcess('P3', d.processes.map(x => x.id));
  for (const m of RECEPTION_KPIS) {
    if (Object.values(d.kpis).some(k => k.role === m.role || k.id === m.id)) continue;
    d.kpis[m.id] = { id: m.id, role: m.role, name: m.name, processId: pid, type: m.type, unit: m.unit, direction: m.direction, aggregation: 'avg', target: m.target, targetValue: m.targetValue, confidential: false, source: 'Outil 3.4' };
    d.processes.find(p => p.id === pid)?.kpiIds.push(m.id);
    n++;
  }
  return n;
}

// Receptions pronounced (without or with reservation) from `from` to `to` (days) whose PV is signed (the customer, the photo of the paper PV, or the mention absent / refused with a witness),
// the deliveries closed in several times included: a reception without a signed PV, or put off by a blocking reservation (`counted`), is not counted
export const receptionsBetween = (s: State, from: string, to: string) =>
  Object.values(s.deliveries).flatMap(d => [...lotsOf(d), d]).filter(p => pvSigned(p) && counted(p.reception) && p.reception.date >= from && p.reception.date <= to).map(p => p.reception);

// One delivery as it was presented: the current one and each closed lot, each with its own milestones, release (and derogation: a lot released cleanly has none, whatever the one under way says),
// reception and reservations, and the part of the journal of the order written while it was under way (what was said of its release, a derogation included, even when the release was undone and made again)
const presentations = (d: Delivery): Delivery[] => {
  const lots = lotsOf(d), span = (from: string, to: string) => (d.journal ?? []).filter(e => e.at > from && (!to || e.at <= to));
  return [...lots.map((l, i) => ({ ...lotView(d, l), journal: span(i ? lots[i - 1].closedAt : '', l.closedAt) })), { ...d, journal: span(lots.at(-1)?.closedAt ?? '', '') }];
};
// First check of a milestone: kept in its history (a reopening or a waiver is not a check); old data without history use the current result
const firstCheck = (m: Milestone): { ok: boolean; day: string } | null => {
  const e = m.history?.find(x => (x.kind === 'check' || x.kind === 'rework') && x.ok !== null);
  return e ? { ok: !!e.ok, day: e.at.slice(0, 10) } : m.ok != null && !m.history?.length ? { ok: m.ok, day: m.date } : null;
};
const pct = (ok: number, total: number) => (total ? Math.round(ok / total * 100) : null);

// The share of one indicator for a month ("2026-09"); null when nothing in the month allows to say (no record dated in it)
// `shared` gives the presentations of every order (built once by `receptionFeeds` for the five indicators; built here, and only by the indicators that read them, when it is not given)
export function receptionKpiValue(s: State, role: Role, period: Period, today = new Date(), shared?: () => Delivery[]): number | null {
  const ps = shared ?? (() => Object.values(s.deliveries).flatMap(presentations)), within = (day: string | undefined) => !!day && day.slice(0, 7) === period;
  switch (role as string) {
    case 'recep_clean': {
      const rs = receptionsBetween(s, `${period}-01`, `${period}-31`);
      return pct(rs.filter(r => r.result === 'sans').length, rs.length);
    }
    case 'recep_lifted': {
      // reservations whose deadline falls in the month and which are decided: lifted, or already late
      const rv = ps().filter(d => d.reception.result !== 'refus').flatMap(d => reservesOf(d).map(r => ({ r, d }))).filter(x => within(reserveDue(x.r, x.d, s.params)))
        .map(x => ({ lifted: !!x.r.liftedAt, late: reserveLateDays(x.r, x.d, s.params, today) > 0 })).filter(x => x.lifted || x.late);
      return pct(rv.filter(x => !x.late).length, rv.length);
    }
    case 'recep_first': {
      const f = ps().flatMap(d => d.milestones.filter(m => !m.na).map(firstCheck)).filter((x): x is { ok: boolean; day: string } => !!x && within(x.day));
      return pct(f.filter(x => x.ok).length, f.length);
    }
    case 'recep_released': {
      const r = ps().filter(d => within(d.releasedAt));
      return pct(r.filter(d => !d.derogation && !derogationLogged(d)).length, r.length);   // a release undone and made again keeps the derogation said in the journal
    }
    case 'recep_promised': {
      const r = ps().filter(d => counted(d.reception) && promisedOn(s, d) && within(d.reception.date));   // received (not refused, not put off), on the day promised by the order, else by its quote
      return pct(r.filter(d => d.reception.date <= promisedOn(s, d)).length, r.length);
    }
    default: return null;
  }
}

// What the dashboard offers for a month: the indicators that have something to say, with how each was computed
export function receptionFeeds(s: State, p: Period, today = new Date()): { role: Role; value: number; how: string }[] {
  if (!Object.keys(s.deliveries).length) return [];
  let all: Delivery[] | undefined;   // the presentations are copies of every order and every closed delivery: made once for the five indicators, and only when one of them reads them
  const shared = () => (all ??= Object.values(s.deliveries).flatMap(presentations));
  return RECEPTION_KPIS.flatMap(k => { const value = receptionKpiValue(s, k.role, p, today, shared); return value === null ? [] : [{ role: k.role, value, how: k.how }]; });
}
