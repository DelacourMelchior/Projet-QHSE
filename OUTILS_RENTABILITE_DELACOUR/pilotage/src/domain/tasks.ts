// Everything someone has to do, from every tool, with its due date: the "Mes tâches" screen, the calendar export (.ics)
// and the weekly sheet. A task without owner is shown to everyone under "Non attribué".
import type { State } from './types';
import { addDays, addWorkHours, businessOf, daysBetween, workHoursBetween } from './base';
import { isoDate } from './periods';
import { isOpen } from './engine';
import { riskState, testDueDate } from './risk';
import { ncState, pokaState, checkDate, DECISION_HOURS } from './quality';
import { ACK_HOURS, complaintState, contactDeadline, courtesyDue, deliveriesToAsk, receivedOn, detailsOf, directorName, escalationOf, feedbackState, isClosed, needsApproval, ownerToday, quoteState, FOLLOW_DAYS } from './commercial';
import { maintFocus, maintTodos } from './maintenanceAll';
import { receptionFocus, receptionTodos, whoOf } from './receptionsAll';
import { sopTodos } from './instructions';
import { sectorTasks } from './sectors';
import { claimSupplierName, debitState, lastContact, nextReview, ratingDue, supplierCfg } from './suppliers';
import { contactLabel, toCallThisMonth } from './contacts';
import { checklistOf, newcomerState, testDate, chronoSummary } from './team';
import { powerFocus, powerTodos } from './powersAll';
import { personName, plainName, reviewAge, reviewMonths } from './cartography';

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
  Object.values(s.ncs).filter(n => ncState(n, now, businessOf(s.params)) !== 'decided').forEach(n => add(`n${n.id}`, n.decidedBy || '', d(addDays(d(n.at), Math.ceil(DECISION_HOURS / 24))), `Décider (bac rouge) ${n.ref} : ${n.description}`, '5.1', n.id));
  const biz = businessOf(s.params), today = isoDate(now);
  // tool 1.4: a process without a pilot is for the management to settle; a sheet not reviewed in time is for its pilot
  s.processes.forEach(p => {
    const who = personName(s, p.pilotId), age = reviewAge(p, now), started = !!(p.pilotId || p.purpose?.trim() || p.reviewedAt || Object.values(s.flows || {}).some(f => f.processId === p.id));
    if (!started) return;
    if (!who || !s.people[p.pilotId!]?.active) add(`mp${p.id}`, '', today, `Nommer un pilote pour le processus ${plainName(p.name)}`, '1.4', `${p.id}:identity`);
    else if (age === null || age > reviewMonths(s) * 30) add(`mr${p.id}`, who, p.reviewedAt ? addDays(p.reviewedAt, reviewMonths(s) * 30) : today, `Relire la fiche du processus ${plainName(p.name)}`, '1.4', `${p.id}:review`);
  });
  Object.values(s.complaints).forEach(c => {
    const st = complaintState(c, now, biz), me = ownerToday(s, c, today), away = me.absent ? ' (pilote absent)' : '';
    if (st === 'to_contact' || st === 'late') add(`c${c.id}`, me.who, d(contactDeadline(c, biz)), `Recontacter ${c.client} (${c.ref})${away}`, '2.3', c.id);
    if (st === 'late') add(`ce${c.id}`, escalationOf(s, c), today, `Client pas recontacté sous 48 h : faire recontacter ${c.client} (${c.ref}) par ${c.pilot || c.receivedBy || 'le pilote'}`, '2.3', c.id);
    if (st !== 'closed' && !c.ackAt && !c.contactedAt && (workHoursBetween(c.at, now, biz) ?? 0) >= ACK_HOURS) add(`ca${c.id}`, me.who, d(c.at), `Envoyer l'accusé de réception à ${c.client} (${c.ref})${away}`, '2.3', c.id);
    if (c.verdict && !c.resultSentAt && st !== 'closed') add(`cn${c.id}`, me.who, today, `Informer ${c.client} du résultat de l'enquête (${c.ref})${away}`, '2.3', c.id);
    if (st === 'resolved') add(`cc${c.id}`, me.who, courtesyDue(c), `Appel de courtoisie ${c.client} (${c.ref})${away}`, '2.3', c.id);
    if (st === 'unsatisfied') add(`cu${c.id}`, me.who, today, `Reprendre avec ${c.client} (${c.ref}) : client pas satisfait${away}`, '2.3', c.id);
    if (!isClosed(c) && !c.pilot.trim()) add(`cp${c.id}`, '', today, `Désigner un pilote pour ${c.ref} (${c.client})`, '2.3', c.id);
    if (!isClosed(c) && needsApproval(c, s.params) && !c.approval?.by) add(`cv${c.id}`, directorName(s), today, `Valider ${c.ref} (${c.client}) : avoir ou réponse « non justifiée »`, '2.3', c.id);
  });
  Object.values(s.quotes).forEach(q => {
    const st = quoteState(q, s.params, now);
    if (st === 'sent' || st === 'to_follow') add(`q${q.id}`, q.visas.commercial.by, q.nextFollowAt || addDays(q.followedAt || q.sentAt, FOLLOW_DAYS), `Relancer ${q.client} (${q.ref})`, '2.1', q.id);
    if (st === 'draft') add(`qd${q.id}`, q.visas.commercial.by, '', `Valider le devis ${q.ref} (${q.client})`, '2.1', q.id);
  });
  Object.values(s.feedbacks).forEach(f => {
    const st = feedbackState(f, s);
    // a text message goes out the next morning (the method of the tool), the other ways of asking the same day
    if (st === 'to_ask') add(`f${f.id}`, '', f.channel === 'sms' ? addDays(f.date, 1) : f.date, `Bilan de fin : 3 questions à ${f.client}`, '2.4', f.id);
    // a dissatisfied customer with no complaint opened: the point is settled with him (a complaint has its own tasks in 2.3)
    if (st === 'unhappy' && !f.complaintId) add(`f${f.id}`, '', f.date, `Régler avec ${f.client} : ${detailsOf(f, s.params)[0] || 'client insatisfait'}`, '2.4', f.id);
  });
  // a delivery received without any review: the focus is the delivery, the tool creates the review from it
  deliveriesToAsk(s, now).forEach(x => add(`fd${x.id}`, whoOf(s, x, today), receivedOn(x), `Bilan de fin : 3 questions à ${x.client || 'client'} (${x.ref || x.item})`, '2.4', x.id));
  const sc = supplierCfg(s.params);
  Object.values(s.debits).forEach(x => {
    const st = debitState(x, now, s.params), who = claimSupplierName(s, x);
    if (st === 'to_send' || st === 'late') add(`d${x.id}`, '', d(addWorkHours(x.date, sc.sendDays * 24, biz)), `Réclamation ${x.ref} à envoyer à ${who}`, '3.1', x.id);
    if (st === 'waiting' || st === 'chase') add(`dr${x.id}`, '', addDays(lastContact(x), sc.followDays), `Réponse de ${who} attendue (${x.ref})`, '3.1', x.id);
    if (st === 'accepted') add(`dr${x.id}`, '', addDays(x.answeredAt || lastContact(x), 30), `Suite promise par ${who} à recevoir (${x.ref})`, '3.1', x.id);
    if (st === 'contested') add(`dc${x.id}`, '', today, `Réclamation ${x.ref} contestée par ${who} : suite à décider`, '3.1', x.id);
    if (x.supplierAction?.trim() && !x.actionCheckedAt && ['recovered', 'closed', 'accepted'].includes(st)) add(`dv${x.id}`, '', '', `Action de ${who} à vérifier à la prochaine livraison (${x.ref})`, '3.1', x.id);
  });
  Object.values(s.suppliers).filter(x => ratingDue(x, now, s.params)).forEach(x => add(`sr${x.id}`, '', nextReview(x, s.params), `Évaluation du fournisseur ${x.name} à faire`, '3.1', x.id));
  sectorTasks(s, now).forEach(x => add(x.id, '', x.due, x.text, '3.1', x.focus));
  sopTodos(s, now).forEach(t => add(`so${t.id}`, t.who, t.due, t.text, '3.2', t.sopId));
  maintTodos(s, now).forEach(t => add(`m${t.id}`, t.who, t.due, t.text, '3.3', maintFocus(t)));
  // the review of the end is listed above (from deliveriesToAsk, it opens 2.4) and the defects by the red bin (5.1): not repeated here
  receptionTodos(s, now).filter(t => t.kind !== 'feedback' && t.kind !== 'defect').forEach(t => add(`dl${t.id}`, t.who, t.due, t.text, '3.4', receptionFocus(t)));
  powerTodos(s, now).forEach(t => add(`p${t.id}`, t.who, t.due, t.text, '4.1', powerFocus(t)));
  Object.values(s.newcomers).forEach(n => {
    const st = newcomerState(n, now, checklistOf(s));
    if (st === 'test_due' || st === 'failed' || st === 'tutoring') add(`nw${n.id}`, n.tutor, n.retestAt || testDate(n), `Test d'autonomie de ${n.name}`, '4.3', n.id);
    if (st === 'to_authorize') add(`nwa${n.id}`, '', isoDate(now), `Signer l'autorisation de ${n.name}`, '4.3', n.id);
  });
  const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  toCallThisMonth(s, now).forEach(c => add(`ct${c.id}`, c.verifiedBy || '', monthEnd, `Vérifier le numéro de ${contactLabel(c)} (${c.phone})`, '1.3', c.id));
  if (!chronoSummary(s, now).monthDone && (Object.keys(s.chronos).length || s.ged.owner)) add('ged', s.ged.owner, monthEnd, 'Test des 30 secondes du mois', '4.4');
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
