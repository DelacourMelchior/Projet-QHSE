// Figures of the monthly dashboard (tool 1.1) that another tool can compute from its records.
// Never written silently: the tool or the monthly entry screen offers to copy the computed value.
import type { Kpi, Period, State } from './types';
import { cnqMonth } from './quality';
import { complaintStats, feedbackMonthPct, isSatisfactionKpi, quoteStats } from './commercial';
import { coveragePct } from './team';
import { maintFeeds } from './maintenanceFeeds';
import { receptionFeeds } from './receptionsFeeds';
import { powerFeeds } from './powersFeeds';
import { sum } from './base';
import { isoDate } from './periods';

export interface Feed { kpi: Kpi; value: number; tool: string; how: string }

// KPI ids of the job templates, and the role when the id was renamed
const find = (s: State, id: string, role?: Kpi['role']) => s.kpis[id] || (role ? Object.values(s.kpis).find(k => k.role === role) : undefined);

// `tools`: only the figures of these tools are computed (a tool that shows its own five figures does not compute those of all the others); every tool when it is not given
export function feeds(s: State, p: Period, today = new Date(), tools?: readonly string[]): Feed[] {
  const out: Feed[] = [], want = (...ids: string[]) => !tools || ids.some(i => tools.includes(i));
  const add = (k: Kpi | undefined, value: number | null, tool: string, how: string) => { if (k && value !== null && want(tool)) out.push({ kpi: k, value: k.unit === '€' ? Math.round(value) : Math.round(value * 10) / 10, tool, how }); };
  if (want('5.1', '5.2') && (Object.keys(s.ncs).length || Object.keys(s.complaints).length || Object.keys(s.debits).length)) {
    const m = cnqMonth(s, p);
    add(find(s, 'kpi_cnq', 'cnq'), m.total, '5.2', 'somme des fiches du bac rouge, des réclamations et des fiches de débit du mois');
    if (Object.keys(s.ncs).length) add(find(s, 'kpi_retouches', 'retouches'), sum(Object.values(s.ncs).filter(n => n.at.slice(0, 7) === p).map(n => n.cost.reworkHours)), '5.1', 'heures de retouche des fiches du bac rouge du mois');
  }
  if (want('2.3') && Object.keys(s.complaints).length) add(find(s, 'kpi_reclamations', 'reclamations'), complaintStats(s, p).count, '2.3', 'réclamations reçues dans le mois');
  if (want('2.1') && Object.keys(s.quotes).length) {
    const q = quoteStats(s, p, today);
    add(find(s, 'kpi_devis_emis'), q.sentAmount, '2.1', 'montant des devis envoyés dans le mois');
    add(find(s, 'kpi_commandes'), q.wonAmount, '2.1', 'montant des devis gagnés dans le mois');
    add(find(s, 'kpi_transfo'), q.conversionPct, '2.1', 'devis gagnés sur devis décidés, 12 derniers mois');
    if (p === isoDate(today).slice(0, 7)) add(find(s, 'kpi_devis_attente', 'devis_attente'), q.toFollow, '2.1', 'devis envoyés sans nouvelle depuis plus de 7 jours, aujourd\'hui');
  }
  if (want('2.4') && Object.keys(s.feedbacks).length) add(Object.values(s.kpis).find(isSatisfactionKpi), feedbackMonthPct(s, p), '2.4', 'bilans de fin d\'affaire du mois sans réponse négative ni note basse');
  if (want('4.2') && Object.keys(s.skills).length) add(find(s, 'kpi_suppleance'), coveragePct(s), '4.2', 'compétences clés avec au moins 2 personnes autonomes');
  if (want('3.3')) maintFeeds(s, p, today).forEach(m => add(Object.values(s.kpis).find(k => k.role === m.role), m.value, '3.3', m.how));
  if (want('3.4')) receptionFeeds(s, p, today).forEach(m => add(Object.values(s.kpis).find(k => k.role === m.role), m.value, '3.4', m.how));
  if (want('4.1')) powerFeeds(s, p, today).forEach(m => add(Object.values(s.kpis).find(k => k.role === m.role), m.value, '4.1', m.how));
  return out;
}

export const feedOf = (s: State, kpiId: string, p: Period, today = new Date()) => feeds(s, p, today).find(f => f.kpi.id === kpiId);
