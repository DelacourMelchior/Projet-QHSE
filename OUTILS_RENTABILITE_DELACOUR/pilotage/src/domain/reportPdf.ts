// Two printed summaries: the week of one person (every task of every tool), and the monthly report for the management review.
import type { Period, State } from './types';
import { DocWriter, COLORS } from './docPdf';
import type { Task } from './tasks';
import { toolBadge } from './status';
import { frDate, periodLabel } from './periods';
import { formatValue } from './numbers';
import { cnqMonth } from './quality';
import { complaintStats, feedbackSummary, forecast, quoteStats } from './commercial';
import { coveragePct } from './team';
import { riskSummary } from './risk';
import { synthesis, kpiByRole, valueOf } from './engine';
import { supplierSummary } from './suppliers';
import { openReserves, reserveLateDays } from './receptions';
import { receptionsBetween } from './receptionsFeeds';
import { daysBetween } from './base';

const TOOL_NAMES: [string, string][] = [
  ['1.1', 'Indicateurs'], ['1.2', 'Plans B'], ['1.3', 'Annuaire'], ['2.1', 'Devis'], ['2.3', 'Réclamations'], ['2.4', 'Bilan de fin'],
  ['3.1', 'Fournisseurs'], ['3.2', 'Instructions'], ['3.3', 'Maintenance'], ['3.4', 'Réceptions'], ['4.1', 'Suppléances'], ['4.2', 'Polyvalence'],
  ['4.3', 'Accueil'], ['4.4', 'Classement'], ['5.1', 'Bac rouge'], ['5.2', 'Non-qualité'], ['5.3', '5 Pourquoi'], ['5.4', 'Détrompeurs'],
];

export function weekPdf(tasks: Task[], who: string, o: { company: string; date: Date }): string {
  const w = new DocWriter({ company: o.company, title: `Semaine de ${who || 'l\'équipe'}`, date: o.date });
  w.band('À faire cette semaine', who || 'Tâches non attribuées', `Édité le ${o.date.toLocaleDateString('fr-FR')}`);
  const today = o.date;
  const groups: [string, Task[]][] = [
    ['En retard', tasks.filter(t => t.due && (daysBetween(t.due, today) ?? 0) > 0)],
    ['Cette semaine', tasks.filter(t => t.due && (daysBetween(t.due, today) ?? 0) <= 0 && (daysBetween(t.due, today) ?? 0) > -7)],
    ['Plus tard', tasks.filter(t => t.due && (daysBetween(t.due, today) ?? 0) <= -7)],
    ['Sans date', tasks.filter(t => !t.due)],
  ];
  groups.filter(([, xs]) => xs.length).forEach(([title, xs]) => {
    w.heading(`${title} (${xs.length})`);
    w.table(['Fait', 'Échéance', 'À faire', 'Outil'], xs.map(t => ['[  ]', frDate(t.due), t.text, t.tool || 'Actions']), [0.07, 0.14, 0.66, 0.13], { size: 9.5 });
  });
  if (!tasks.length) w.para('Rien à faire : tout est à jour.', 11, { color: COLORS.gray });
  return w.finish();
}

// Monthly report: each process, each tool, the key figures, for the management meeting
export function monthlyReportPdf(s: State, p: Period, o: { company: string; date: Date; money: boolean }): string {
  const w = new DocWriter({ company: o.company, title: `Rapport de ${periodLabel(p)}`, date: o.date });
  w.band('Rapport mensuel de pilotage', periodLabel(p), o.company);
  const syn = synthesis(s, p);
  const ca = kpiByRole(s, 'ca');
  const m = cnqMonth(s, p);
  const q = quoteStats(s, p, o.date);
  const c = complaintStats(s, p, o.date);
  const fb = feedbackSummary(s, o.date);
  const r = riskSummary(s, o.date);
  const sup = supplierSummary(s, o.date);
  const caValue = ca ? valueOf(s, ca.id, p) : null;
  // 3.4: the deliveries received in the month (signed PV, not put off), the share pronounced without reservation, the reservations open and late today; facts, no amount
  const rec = receptionsBetween(s, `${p}-01`, `${p}-31`), clean = rec.filter(x => x.result === 'sans').length;
  const late = Object.values(s.deliveries).flatMap(d => openReserves(d).map(x => reserveLateDays(x, d, s.params, o.date))).filter(n => n > 0).length;
  w.heading('Chiffres clés');
  w.table(['Sujet', 'Chiffre', 'Lecture'], [
    ['Indicateurs', `${syn.filled} / ${syn.total} saisis`, `${syn.alerts.length} en dérive, ${syn.orphans.length} sans action pilotée`],
    ...(o.money && ca ? [['Chiffre d\'affaires', formatValue(caValue, '€'), syn.caYtd ? `cumul ${formatValue(syn.caYtd.value, '€')}` : ''] as string[]] : []),
    ['Non-qualité', formatValue(m.total, '€'), `${m.items.length} événement(s)${caValue ? `, ${(m.total / caValue * 100).toFixed(1).replace('.', ',')} % du CA` : ''}, net après avoirs ${formatValue(m.net, '€')}`],
    ['Devis', `${q.sentCount} envoyé(s)`, `${formatValue(q.sentAmount, '€')}, ${q.wonCount} gagné(s), transformation ${q.conversionPct ?? '—'} %${o.money ? `, portefeuille pondéré ${formatValue(forecast(s).weighted, '€')}` : ''}`],
    ['Réclamations', `${c.count}`, `${c.within48Pct ?? '—'} % recontactées sous 48 h${c.ratePct !== null ? `, ${c.ratePct.toFixed(1).replace('.', ',')} % des livraisons` : ''}`],
    ...(Object.keys(s.deliveries).length ? [['Réceptions', `${rec.length} dans le mois`, `${rec.length ? `${Math.round(clean / rec.length * 100)} % sans réserve` : 'aucune réception dans le mois'}, ${late} réserve${late > 1 ? 's' : ''} en retard`] as string[]] : []),
    ['Satisfaction', fb.satisfiedPct === null ? '—' : `${fb.satisfiedPct} %`, `${fb.answers} bilan(s) sur 12 mois, ${fb.unhappy} client(s) mécontent(s) dont ${fb.settled} réglé(s)${fb.avgScore !== null ? `, note moyenne ${String(fb.avgScore).replace('.', ',')} / 10 (très satisfaits : ${fb.mix.top}, mécontents : ${fb.mix.low})` : ''}`],
    ['Fournisseurs', formatValue(sup.recovered, '€'), `récupérés sur ${formatValue(sup.claimed, '€')} réclamés sur 12 mois`],
    ['Plans B', `${r.coveragePct ?? 0} %`, `couverture, ${r.byState.uncovered} risque(s) sans Plan B`],
    ['Polyvalence', `${coveragePct(s) ?? '—'} %`, 'compétences clés doublées'],
  ], [0.2, 0.2, 0.6], { size: 9.5 });
  w.heading('État de chaque outil');
  w.table(['Outil', 'État', 'À traiter'], TOOL_NAMES.map(([id, name]) => { const b = toolBadge(s, id, p, o.date); return [`${id} ${name}`, b.text, b.n ? String(b.n) : '']; }), [0.25, 0.63, 0.12], {
    size: 9.5, highlight: i => (toolBadge(s, TOOL_NAMES[i][0], p, o.date).tone === 'alert' ? [254, 242, 242] : null),
  });
  w.heading('Décisions de la réunion');
  ['', '', ''].forEach((_, i) => w.para(`${i + 1}. ......................................................................................................................`, 10.5, { gap: 10 }));
  return w.finish();
}
