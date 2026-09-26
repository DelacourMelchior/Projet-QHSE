// Everything someone has to do, from every tool, with its due date: the "Mes tâches" screen, the calendar export (.ics)
// and the weekly sheet. A task without owner is shown to everyone under "Non attribué".
import type { State } from './types';
import { addDays, daysBetween } from './base';
import { isoDate } from './periods';
import { isOpen } from './engine';
import { riskState, testDueDate } from './risk';
import { ncState, pokaState, checkDate, DECISION_HOURS } from './quality';
import { complaintState, courtesyDue, changeState, feedbackState, quoteState, FOLLOW_DAYS, CONTACT_HOURS } from './commercial';
import { debitState, inspectionState, lowParts, liftDue, deliveryState, ncsSinceVersion, ratingDue, CLAIM_DAYS, taskDue } from './operations';
import { newcomerState, powerDeputies, powerState, testDate, chronoSummary } from './team';

export interface Task { id: string; who: string; due: string; text: string; tool: string; focus: string }

const d = (stamp: string) => stamp.slice(0, 10);

export function allTasks(s: State, now = new Date()): Task[] {
  const out: Task[] = [];
  const add = (id: string, who: string, due: string, text: string, tool: string, focus = '') => out.push({ id, who: who.trim(), due, text, tool, focus });
  Object.values(s.actions).filter(isOpen).forEach(a => add(`a${a.id}`, a.pilot, a.deadline, `Action : ${a.plan.map(p => p.text).join(' ; ') || a.constat}`, '', a.id));
  Object.values(s.risks).forEach(r => {
    const st = riskState(s, r, now);
    if (['ready', 'expired', 'failed', 'tested'].includes(st)) { const due = st === 'tested' ? testDueDate(r) : d(isoDate(now)); if (st !== 'tested' || (daysBetween(isoDate(now), due) ?? 99) <= 30) add(`r${r.id}`, r.owner, due, `Tester le Plan B : ${r.title}`, '1.2', r.id); }
  });
  Object.values(s.ncs).filter(n => ncState(n, now) !== 'decided').forEach(n => add(`n${n.id}`, n.decidedBy || '', d(addDays(d(n.at), Math.ceil(DECISION_HOURS / 24))), `Décider (bac rouge) ${n.ref} : ${n.description}`, '5.1', n.id));
  Object.values(s.complaints).forEach(c => {
    const st = complaintState(c, now);
    if (st === 'to_contact' || st === 'late') add(`c${c.id}`, c.pilot || c.receivedBy, d(addDays(d(c.at), Math.ceil(CONTACT_HOURS / 24))), `Rappeler ${c.client} (${c.ref})`, '2.3', c.id);
    if (st === 'resolved') add(`cc${c.id}`, c.pilot, courtesyDue(c), `Appel de courtoisie ${c.client} (${c.ref})`, '2.3', c.id);
  });
  Object.values(s.quotes).forEach(q => {
    const st = quoteState(q, s.params, now);
    if (st === 'sent' || st === 'to_follow') add(`q${q.id}`, q.visas.commercial.by, q.nextFollowAt || addDays(q.followedAt || q.sentAt, FOLLOW_DAYS), `Relancer ${q.client} (${q.ref})`, '2.1', q.id);
    if (st === 'draft') add(`qd${q.id}`, q.visas.commercial.by, '', `Valider le devis ${q.ref} (${q.client})`, '2.1', q.id);
  });
  Object.values(s.changes).forEach(c => {
    const st = changeState(c);
    if (st === 'to_price' || st === 'to_send') add(`ch${c.id}`, '', c.date, `${st === 'to_price' ? 'Chiffrer' : 'Envoyer pour accord'} l'avenant ${c.ref} (${c.client})`, '2.2', c.id);
    if (st === 'accepted') add(`chf${c.id}`, '', c.answeredAt, `Facturer l'avenant ${c.ref} (${c.client})`, '2.2', c.id);
  });
  Object.values(s.feedbacks).forEach(f => {
    const st = feedbackState(f, s);
    if (st === 'to_ask') add(`f${f.id}`, '', f.date, `Bilan de fin : 3 questions à ${f.client}`, '2.4', f.id);
    if (st === 'doubt') add(`f${f.id}`, '', f.date, `Régler la réserve de ${f.client} : ${f.doubt}`, '2.4', f.id);
    if (st === 'to_invoice') add(`f${f.id}`, '', addDays(f.date, 1), `Facture de solde ${f.client}`, '2.4', f.id);
  });
  Object.values(s.debits).forEach(x => {
    const st = debitState(x, now);
    if (st === 'to_send' || st === 'late') add(`d${x.id}`, '', addDays(x.date, CLAIM_DAYS), `Envoyer la fiche de débit ${x.ref} à ${s.suppliers[x.supplierId]?.name || 'fournisseur'}`, '3.1', x.id);
    if (st === 'accepted' || st === 'waiting') add(`dr${x.id}`, '', x.followAt || addDays(x.sentAt, 30), `Relancer ${s.suppliers[x.supplierId]?.name || 'le fournisseur'} (${x.ref})`, '3.1', x.id);
  });
  Object.values(s.suppliers).filter(x => ratingDue(x, now)).forEach(x => add(`sr${x.id}`, '', '', `Noter le fournisseur ${x.name}`, '3.1', x.id));
  Object.values(s.sops).filter(x => ncsSinceVersion(s, x).length).forEach(x => add(`so${x.id}`, x.author, '', `Mettre à jour l'instruction du poste ${x.poste}`, '3.2', x.id));
  Object.values(s.equipments).forEach(e => {
    if (inspectionState(e, now) !== 'ok') add(`e${e.id}`, e.operator, isoDate(now), `Routine du lundi : ${e.name}`, '3.3', e.id);
    lowParts(e).filter(p => !p.orderedAt).forEach((p, i) => add(`ep${e.id}${i}`, e.manager, isoDate(now), `Commander ${p.name} (${e.name})`, '3.3', e.id));
    (e.tasks || []).forEach(t => { const due = taskDue(t); if ((daysBetween(isoDate(now), due) ?? 99) <= 30) add(`et${t.id}`, e.manager, due, `${t.label} (${e.name})${t.legal ? ' · obligatoire' : ''}`, '3.3', e.id); });
    (e.anomalies || []).filter(a => !a.closedAt).forEach(a => add(`ea${a.id}`, e.manager, a.date, `Traiter l'anomalie : ${a.label} (${e.name})`, '3.3', e.id));
  });
  Object.values(s.deliveries).forEach(x => {
    const st = deliveryState(x, now);
    if (st === 'released') add(`dl${x.id}`, x.releasedBy, x.releasedAt, `Faire signer le PV ${x.ref} (${x.client})`, '3.4', x.id);
    if (st === 'reserve' || st === 'reserve_late') add(`dl${x.id}`, '', liftDue(x), `Lever la réserve ${x.ref} : ${x.reception.reserve}`, '3.4', x.id);
    if (st === 'to_release') add(`dl${x.id}`, '', '', `Libérer ${x.ref} (${x.client})`, '3.4', x.id);
  });
  Object.values(s.powers).forEach(p => {
    if (powerState(p, now) === 'ok') return;
    powerDeputies(p).forEach((dep, i) => add(`p${p.id}${i}`, dep.name, p.nextPracticeAt || isoDate(now), `Faire l'acte en suppléant : ${p.power}`, '4.1', p.id));
  });
  Object.values(s.newcomers).forEach(n => {
    const st = newcomerState(n, now);
    if (st === 'test_due' || st === 'failed' || st === 'tutoring') add(`nw${n.id}`, n.tutor, n.retestAt || testDate(n), `Test d'autonomie de ${n.name}`, '4.3', n.id);
    if (st === 'to_authorize') add(`nwa${n.id}`, '', isoDate(now), `Signer l'autorisation de ${n.name}`, '4.3', n.id);
  });
  if (!chronoSummary(s, now).monthDone && (Object.keys(s.chronos).length || s.ged.owner)) add('ged', s.ged.owner, isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)), 'Test des 30 secondes du mois', '4.4');
  Object.values(s.pokas).forEach(p => {
    const st = pokaState(p, now);
    if (st === 'running' || st === 'due') add(`pk${p.id}`, p.owner, checkDate(p), `Contrôle J+30 : ${p.poste || p.defect}`, '5.4', p.id);
  });
  return out.sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
}

export const peopleWithTasks = (ts: Task[]) => [...new Set(ts.map(t => t.who).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Calendar file: one all-day event per dated task (Outlook, Google Agenda, téléphone)
export function icsOf(ts: Task[], company: string, now = new Date()): string {
  const esc = (t: string) => t.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Outils Delacour//FR', 'CALSCALE:GREGORIAN'];
  ts.filter(t => t.due).forEach(t => {
    const day = t.due.replace(/-/g, '');
    const next = addDays(t.due, 1).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${t.id}@outils-delacour`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(t.text)}`, `DESCRIPTION:${esc(`${company ? `${company} · ` : ''}${t.tool ? `outil ${t.tool}` : 'plan d\'actions'}${t.who ? ` · ${t.who}` : ''}`)}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
