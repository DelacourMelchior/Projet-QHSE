// Tools 2.1 to 2.4: feasibility and margin lock of a quote, change orders agreed before they are done,
// customer complaints called back within 48 h, end-of-job flash review. Pure functions, covered by commercial.test.ts.
import type { Change, Complaint, Feedback, Params, Quote, State } from './types';
import { addDays, daysBetween, hoursBetween, nextRef, nowLocal, PROCESS_IDS, rateFor, sum, workHoursBetween, type Insight } from './base';
import { isoDate } from './periods';
import { formatValue } from './numbers';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---- 2.1 the 5 locks, one per process, checked with the technical manager before the offer leaves
export const LOCKS = [
  { process: 'P1', label: 'Marge et acompte', point: 'Marge brute calculée, acompte prévu', ideas: ['Marge au-dessus du plancher', 'Acompte de 30 % écrit dans l\'offre', 'Solvabilité du client vérifiée', 'Clause de réception 95/5 dans les conditions générales jointes (outil 3.4)'] },
  { process: 'P2', label: 'Besoin client', point: 'Cahier des charges, plans et cotes sans ambiguïté', ideas: ['Tolérances écrites', 'Délai demandé réaliste', 'Interlocuteur technique identifié'] },
  { process: 'P3', label: 'Capacité et délai', point: 'Créneau atelier libre, matière et outillage disponibles', ideas: ['Machine goulet disponible', 'Outillage spécifique approvisionné', 'Sous-traitance réservée'] },
  { process: 'P4', label: 'Compétences', point: 'Personnes qualifiées présentes sur la période', ideas: ['Opérateur autonome sur le poste (outil 4.2)', 'Pas de congés bloquants'] },
  { process: 'P5', label: 'Qualité', point: 'Tolérances réalisables avec nos moyens de contrôle', ideas: ['Instrument de contrôle adapté', 'Certificats ou normes exigés connus'] },
];
export const LOCK_STATE = { ok: 'Conforme', reserve: 'Avec réserve', ko: 'Bloquant' } as const;

export const quoteCost = (q: Quote, p: Params): number | null => {
  const c = q.cost;
  if (!c || [c.material, c.hours, c.subcontract, c.other].every(v => v === null)) return null;
  return sum([c.material, c.subcontract, c.other]) + (c.hours || 0) * rateFor(p, c.rate);
};
// Cost including the overheads of the settings (the margin floor is checked on the direct cost)
export const quoteFullCost = (q: Quote, p: Params): number | null => { const c = quoteCost(q, p); return c === null ? null : c * (1 + (p.overheadPct || 0) / 100); };
export function quoteMargin(q: Quote, p: Params): { value: number; pct: number } | null {
  const cost = quoteCost(q, p);
  if (cost === null || !q.amount) return null;
  return { value: q.amount - cost, pct: (q.amount - cost) / q.amount * 100 };
}
export const needsVisas = (q: Quote, p: Params) => (q.amount ?? 0) >= p.visaThreshold;

// What still stops the offer from leaving (empty = ready to send)
export function quoteIssues(q: Quote, p: Params, money = true): string[] {
  const out: string[] = [];
  q.locks.forEach((l, i) => { if (l.state === 'ko') out.push(`Verrou ${LOCKS[i].process} bloquant : ${l.note || LOCKS[i].label.toLowerCase()}`); });
  const unset = q.locks.filter(l => !l.state).length;
  if (unset) out.push(`${unset} verrou(s) à vérifier`);
  [2, 4].forEach(i => { const l = q.locks[i]; if (l?.state && !l.by?.trim()) out.push(`Verrou ${LOCKS[i].process} : vérifié avec qui ?`); });
  q.locks.forEach((l, i) => { if (l.state === 'reserve' && !l.note.trim()) out.push(`Réserve ${LOCKS[i].process} à écrire`); });
  if (!q.amount) out.push('Prix de vente à saisir');
  const m = quoteMargin(q, p);
  if (money && m && m.pct < p.marginFloorPct && !q.derogation.trim()) out.push(`Marge de ${Math.round(m.pct)} % sous le plancher de ${p.marginFloorPct} % : dérogation de la direction nécessaire`);
  if (money && !m && q.amount) out.push('Coûts à chiffrer pour vérifier la marge');
  if (needsVisas(q, p)) {
    const missing = (['commercial', 'technical', 'direction'] as const).filter(k => !q.visas[k].by.trim());
    if (missing.length) out.push(`Visa(s) manquant(s) au-dessus de ${formatValue(p.visaThreshold, '€')} : ${missing.map(k => ({ commercial: 'commercial', technical: 'technique', direction: 'direction' })[k]).join(', ')}`);
  }
  return out;
}

export const FOLLOW_DAYS = 7;
export type QuoteState = 'draft' | 'ready' | 'sent' | 'to_follow' | 'won' | 'lost' | 'dropped';
export const QUOTE_STATE: Record<QuoteState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  draft: { label: 'À valider', tone: 'warn' }, ready: { label: 'Prêt à envoyer', tone: 'ok' }, sent: { label: 'Envoyé', tone: 'pending' },
  to_follow: { label: 'À relancer', tone: 'alert' }, won: { label: 'Gagné', tone: 'ok' }, lost: { label: 'Perdu', tone: 'pending' }, dropped: { label: 'Abandonné', tone: 'pending' },
};
export function quoteState(q: Quote, p: Params, today = new Date(), money = true): QuoteState {
  if (q.status === 'won' || q.status === 'lost' || q.status === 'dropped') return q.status;
  if (q.status === 'sent') {
    if (q.nextFollowAt) return (daysBetween(q.nextFollowAt, today) ?? -1) >= 0 ? 'to_follow' : 'sent';
    const last = [q.followedAt, ...(q.followUps || []).map(f => f.date)].filter(Boolean).sort().pop() || q.sentAt;
    return (daysBetween(last, today) ?? 0) > FOLLOW_DAYS ? 'to_follow' : 'sent';
  }
  return quoteIssues(q, p, money).length ? 'draft' : 'ready';
}
export const newQuote = (s: State, today = new Date()): Quote => ({
  id: uid('qt'), ref: nextRef('DEV', Object.values(s.quotes), today), client: '', object: '', date: isoDate(today), amount: null, weeks: null,
  locks: LOCKS.map(() => ({ state: '' as const, note: '' })), visas: { commercial: { by: '', date: '' }, technical: { by: '', date: '' }, direction: { by: '', date: '' } },
  derogation: '', depositReceived: false, status: 'draft', sentAt: '', followedAt: '', decidedAt: '', lostReason: '',
});

// Figures of the month (sent, won) and of the last 12 months (conversion)
export function quoteStats(s: State, period: string, today = new Date()) {
  const qs = Object.values(s.quotes);
  const sent = qs.filter(q => q.sentAt.slice(0, 7) === period);
  const won = qs.filter(q => q.status === 'won' && q.decidedAt.slice(0, 7) === period);
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const decided = qs.filter(q => (q.status === 'won' || q.status === 'lost') && q.decidedAt >= since);
  const margins = qs.filter(q => q.status === 'won' && q.decidedAt >= since).map(q => quoteMargin(q, s.params)).filter((m): m is NonNullable<typeof m> => !!m);
  return {
    sentCount: sent.length, sentAmount: sum(sent.map(q => q.amount)),
    wonCount: won.length, wonAmount: sum(won.map(q => q.amount)),
    conversionPct: decided.length ? Math.round(decided.filter(q => q.status === 'won').length / decided.length * 100) : null,
    avgMarginPct: margins.length ? margins.reduce((a, m) => a + m.pct, 0) / margins.length : null,
    toFollow: qs.filter(q => quoteState(q, s.params, today) === 'to_follow').length,
    pendingAmount: sum(qs.filter(q => q.status === 'sent').map(q => q.amount)),
  };
}

export const LOST_CATEGORIES = { prix: 'Prix', delai: 'Délai', technique: 'Technique', relation: 'Relation', concurrent: 'Concurrent en place', autre: 'Autre' } as const;
// Why quotes are lost, over 12 months
export function lostStats(s: State, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const lost = Object.values(s.quotes).filter(q => q.status === 'lost' && q.decidedAt >= since);
  return (Object.keys(LOST_CATEGORIES) as (keyof typeof LOST_CATEGORIES)[]).map(k => ({ key: k, label: LOST_CATEGORIES[k], n: lost.filter(q => (q.lostCategory || 'autre') === k).length, amount: sum(lost.filter(q => (q.lostCategory || 'autre') === k).map(q => q.amount)) })).filter(x => x.n);
}
// Pipeline weighted by the chance to win (50 % when not given), and orders expected over 3 months against the revenue objective
export function forecast(s: State) {
  const pending = Object.values(s.quotes).filter(q => q.status === 'sent' || q.status === 'draft');
  const weighted = sum(pending.map(q => (q.amount || 0) * (q.probability ?? 50) / 100));
  return { pending: sum(pending.map(q => q.amount)), weighted, objective3m: s.settings.annualBudget / 4 };
}

export function quoteInsights(s: State, today = new Date(), money = true): Insight[] {
  const out: Insight[] = [];
  const qs = Object.values(s.quotes);
  const follow = qs.filter(q => quoteState(q, s.params, today) === 'to_follow');
  if (follow.length) out.push({ key: 'follow', tone: 'bad', title: 'Devis à relancer', text: `${names(follow, q => `${q.ref} (${q.client})`)} : sans nouvelle depuis plus de ${FOLLOW_DAYS} jours${money ? `, ${formatValue(sum(follow.map(q => q.amount)), '€')} en jeu` : ''}.` });
  if (money) {
    const low = qs.filter(q => q.status !== 'lost' && q.status !== 'dropped' && !q.derogation.trim() && (quoteMargin(q, s.params)?.pct ?? 100) < s.params.marginFloorPct);
    if (low.length) out.push({ key: 'low', tone: 'warn', title: 'Marge sous le plancher', text: `${names(low, q => `${q.ref} à ${Math.round(quoteMargin(q, s.params)!.pct)} %`)} pour un plancher de ${s.params.marginFloorPct} % : revoir le prix, ou dérogation écrite de la direction.` });
  }
  const noDeposit = qs.filter(q => q.status === 'won' && !q.depositReceived);
  if (noDeposit.length) out.push({ key: 'deposit', tone: 'warn', title: 'Acompte non encaissé', text: `${names(noDeposit, q => `${q.ref} (${q.client})`)} : ne pas commander la matière ni lancer la fabrication avant l'acompte de ${s.params.depositPct} %.` });
  const started = qs.filter(q => q.startedAt && !q.depositReceived);
  if (started.length) out.push({ key: 'started', tone: 'bad', title: 'Fabrication lancée sans acompte', text: `${names(started, q => `${q.ref} (${q.client})`)}.` });
  const lostTop = lostStats(s, today)[0];
  if (lostTop && lostTop.n >= 2) out.push({ key: 'lost', tone: 'warn', title: 'Pourquoi on perd', text: `${lostTop.label} : ${lostTop.n} devis perdus sur 12 mois (${formatValue(lostTop.amount, '€')}).` });
  const drafts = qs.filter(q => quoteState(q, s.params, today, money) === 'draft' && (daysBetween(q.date, today) ?? 0) > 3);
  if (drafts.length) out.push({ key: 'draft', tone: 'warn', title: 'Devis bloqués en validation', text: `${names(drafts, q => q.ref)} : verrous ou visas incomplets depuis plus de 3 jours.` });
  return out;
}

// ---- 2.2 change orders: price it, get the agreement, then do it and invoice it
export type ChangeState = 'to_price' | 'to_send' | 'waiting' | 'accepted' | 'invoiced' | 'refused' | 'offered';
export const CHANGE_STATE: Record<ChangeState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_price: { label: 'À chiffrer', tone: 'warn' }, to_send: { label: 'Accord à demander', tone: 'warn' }, waiting: { label: 'Accord attendu', tone: 'pending' },
  accepted: { label: 'Accepté, à facturer', tone: 'warn' }, invoiced: { label: 'Facturé', tone: 'ok' }, refused: { label: 'Refusé', tone: 'pending' },
  offered: { label: 'Offert', tone: 'pending' },
};
export function changeState(c: Change): ChangeState {
  if (c.offered) return 'offered';
  if (c.answer === 'refused') return 'refused';
  if (c.answer === 'accepted') return c.invoicedAt ? 'invoiced' : 'accepted';
  if (c.price === null) return 'to_price';
  return c.sentAt ? 'waiting' : 'to_send';
}
// Work started before a written agreement: the extra will be hard to invoice
export const startedWithout = (c: Change) => !c.offered && !!c.startedAt && !(c.answer === 'accepted' && c.answeredAt && c.answeredAt <= c.startedAt);
export const newChange = (s: State, today = new Date()): Change => ({
  id: uid('av'), ref: nextRef('AV', Object.values(s.changes), today), affaire: '', client: '', askedBy: '', date: isoDate(today), description: '',
  price: null, delayDays: null, sentAt: '', via: '', answer: '', answeredAt: '', startedAt: '', invoiceRef: '', invoicedAt: '',
});
// Short message to send by text or e-mail, answered by "OK"
export function agreementMessage(c: Change, company: string): string {
  const price = c.price === null ? '[montant]' : formatValue(c.price, '€');
  const delay = c.delayDays ? ` et décale la livraison de ${c.delayDays} jour${c.delayDays > 1 ? 's' : ''}` : ' sans changer le délai';
  return `Bonjour${c.askedBy ? ` ${c.askedBy}` : ''}, suite à votre demande (${c.description || 'modification'}${c.affaire ? `, affaire ${c.affaire}` : ''}), le supplément est de ${price} HT${delay}. Merci de répondre « OK » pour accord avant que nous lancions le travail. ${company || ''}`.trim();
}
export function changeSummary(s: State, today = new Date()) {
  const y = String(today.getFullYear());
  const cs = Object.values(s.changes);
  return {
    invoiced: sum(cs.filter(c => c.invoicedAt.startsWith(y)).map(c => c.price)),
    toInvoice: sum(cs.filter(c => changeState(c) === 'accepted').map(c => c.price)),
    waiting: cs.filter(c => changeState(c) === 'waiting').length,
    waitingAmount: sum(cs.filter(c => changeState(c) === 'waiting').map(c => c.price)),
    risky: cs.filter(c => startedWithout(c) && c.answer !== 'refused').length,
    offered: sum(cs.filter(c => c.offered && c.date.startsWith(y)).map(c => c.price)),
  };
}
// Pricing aid: hours at the hourly cost + material, with the margin floor
export const changePriceHint = (c: Change, p: Params) => {
  const cost = (c.hours || 0) * p.hourlyRate + (c.material || 0);
  return cost ? Math.ceil(Math.round(cost / (1 - p.marginFloorPct / 100)) / 10) * 10 : null;
};
// Accepted extras still to invoice, as a file for the accountant (semicolon separated, opens in Excel)
export function toInvoiceCsv(s: State): string {
  const rows = Object.values(s.changes).filter(c => changeState(c) === 'accepted');
  return ['Avenant;Client;Affaire;Description;Montant HT;Accepté le', ...rows.map(c => [c.ref, c.client, c.affaire, c.description, String(c.price ?? '').replace('.', ','), c.answeredAt].map(x => `"${String(x).replace(/"/g, '""')}"`).join(';'))].join('\r\n');
}

export function changeInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const cs = Object.values(s.changes);
  const risky = cs.filter(c => startedWithout(c));
  if (risky.length) out.push({ key: 'risky', tone: 'bad', title: 'Travaux commencés sans accord', text: `${names(risky, c => `${c.ref} (${c.client})`)} : un client paie un supplément avant qu'il soit fait, rarement après.` });
  const acc = cs.filter(c => changeState(c) === 'accepted');
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() <= 5;
  if (acc.length) out.push({ key: 'invoice', tone: monthEnd ? 'bad' : 'warn', title: monthEnd ? 'Fin de mois : avenants à facturer' : 'Avenants acceptés à facturer', text: `${names(acc, c => c.ref)} : ${formatValue(sum(acc.map(c => c.price)), '€')} à facturer.` });
  const off = cs.filter(c => c.offered && c.date.startsWith(String(today.getFullYear())));
  if (off.length) out.push({ key: 'offered', tone: 'warn', title: 'Suppléments offerts', text: `${off.length} geste(s) commercial(aux) cette année : ${formatValue(sum(off.map(c => c.price)), '€')} non facturés.` });
  const wait = cs.filter(c => changeState(c) === 'waiting' && (daysBetween(c.sentAt, today) ?? 0) > 3);
  if (wait.length) out.push({ key: 'wait', tone: 'warn', title: 'Accord attendu depuis plus de 3 jours', text: `${names(wait, c => `${c.ref} (${c.client})`)} : relancer avant de commencer.` });
  const unpriced = cs.filter(c => changeState(c) === 'to_price');
  if (unpriced.length) out.push({ key: 'price', tone: 'warn', title: 'Demande à chiffrer', text: `${names(unpriced, c => c.ref)}.` });
  return out;
}

// ---- 2.3 complaints: written within the hour, customer called back within 48 h, cause qualified, courtesy call
export const CONTACT_HOURS = 48;
export const COURTESY_DAYS = 15;
export type ComplaintState = 'to_contact' | 'late' | 'in_progress' | 'resolved' | 'closed';
export const COMPLAINT_STATE: Record<ComplaintState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_contact: { label: 'À rappeler sous 48 h', tone: 'warn' }, late: { label: 'Rappel en retard', tone: 'alert' },
  in_progress: { label: 'En traitement', tone: 'warn' }, resolved: { label: 'Appel de courtoisie à faire', tone: 'pending' }, closed: { label: 'Close', tone: 'ok' },
};
export function complaintState(c: Complaint, now = new Date(), business = false): ComplaintState {
  if (c.courtesyAt) return 'closed';
  if (c.resolvedAt) return 'resolved';
  if (c.contactedAt) return 'in_progress';
  return (workHoursBetween(c.at, now, business) ?? 0) >= CONTACT_HOURS ? 'late' : 'to_contact';
}
export const COMPLAINT_CATEGORIES = { delai: 'Délai', qualite: 'Qualité, défaut', facture: 'Facture, prix', comportement: 'Comportement, propreté', emballage: 'Emballage, transport', autre: 'Autre' } as const;
// Deliveries of the month: entered in the settings, else counted from the acceptance reports (3.4)
export const deliveriesOf = (s: State, period: string) => s.params.monthDeliveries?.[period] ?? Object.values(s.deliveries).filter(d => d.reception.date.slice(0, 7) === period).length;
// Letters to the customer: acknowledgement and closing
export function complaintLetter(c: Complaint, kind: 'ack' | 'close', company: string): string {
  return kind === 'ack'
    ? `Bonjour, nous avons bien reçu votre réclamation du ${c.at.slice(8, 10)}/${c.at.slice(5, 7)} concernant ${c.affaire || 'votre commande'} : « ${c.description} ». ${c.pilot || 'Notre responsable'} la prend en charge et vous rappelle sous 48 heures avec une solution. Merci de votre confiance. ${company}`.trim()
    : `Bonjour, suite à votre réclamation concernant ${c.affaire || 'votre commande'}, nous avons ${c.immediate || 'traité le problème'}. Nous avons aussi corrigé la cause chez nous pour que cela ne se reproduise pas. N'hésitez pas à nous dire si tout est en ordre. ${company}`.trim();
}
export const contactDelay = (c: Complaint) => (c.contactedAt ? hoursBetween(c.at, c.contactedAt) : null);
export const courtesyDue = (c: Complaint) => (c.resolvedAt ? addDays(c.resolvedAt, COURTESY_DAYS) : '');
export const newComplaint = (s: State, receivedBy = '', now = new Date()): Complaint => ({
  id: uid('cp'), ref: nextRef('R', Object.values(s.complaints), now), at: nowLocal(now), client: '', affaire: '', channel: '', receivedBy, description: '',
  severity: 'mineure', processId: '', contactedAt: '', immediate: '', pilot: '', cost: null, resolvedAt: '', courtesyAt: '',
});
export function complaintStats(s: State, period: string, now = new Date()) {
  const deliveries = deliveriesOf(s, period);
  const cs = Object.values(s.complaints).filter(c => c.at.slice(0, 7) === period);
  const delays = cs.map(contactDelay).filter((d): d is number => d !== null);
  const byProcess = PROCESS_IDS.map(p => ({ p, n: cs.filter(c => c.processId === p).length })).sort((a, b) => b.n - a.n);
  return {
    count: cs.length, cost: sum(cs.map(c => c.cost)),
    avgDelay: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    // only complaints already called back, or whose 48 h have passed
    within48Pct: (() => { const due = cs.filter(c => c.contactedAt || (hoursBetween(c.at, now) ?? 0) >= CONTACT_HOURS); return due.length ? Math.round(due.filter(c => (contactDelay(c) ?? Infinity) <= CONTACT_HOURS).length / due.length * 100) : null; })(),
    top: byProcess[0]?.n ? byProcess[0] : null,
    deliveries, ratePct: deliveries ? cs.length / deliveries * 100 : null,
    blocked: sum(Object.values(s.complaints).filter(c => !c.courtesyAt).map(c => c.blockedInvoice)),
    byCategory: (Object.keys(COMPLAINT_CATEGORIES) as (keyof typeof COMPLAINT_CATEGORIES)[]).map(k => ({ key: k, label: COMPLAINT_CATEGORIES[k], n: cs.filter(c => c.category === k).length })).filter(x => x.n).sort((a, b) => b.n - a.n),
  };
}
export function complaintInsights(s: State, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const cs = Object.values(s.complaints);
  const biz = !!s.params.businessHours;
  const late = cs.filter(c => complaintState(c, now, biz) === 'late');
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Client pas rappelé sous 48 h', text: `${names(late, c => `${c.ref} (${c.client})`)} : appeler aujourd'hui, écouter sans se justifier, proposer une solution.` });
  const soon = cs.filter(c => complaintState(c, now, biz) === 'to_contact');
  // third complaint of the same customer within 6 months
  const since = isoDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
  const byClient: Record<string, number> = {};
  cs.filter(c => c.at.slice(0, 10) >= since).forEach(c => { const k = c.client.trim().toLowerCase(); if (k) byClient[k] = (byClient[k] || 0) + 1; });
  const repeat = Object.entries(byClient).filter(([, n]) => n >= 3);
  if (repeat.length) out.push({ key: 'repeat', tone: 'bad', title: 'Client qui réclame souvent', text: `${repeat.map(([k, n]) => `${cs.find(c => c.client.trim().toLowerCase() === k)!.client} (${n} en 6 mois)`).join(', ')} : rendez-vous de la direction avec ce client.` });
  const blocked = sum(cs.filter(c => !c.courtesyAt).map(c => c.blockedInvoice));
  if (blocked) out.push({ key: 'blocked', tone: 'bad', title: 'Factures bloquées par des litiges', text: `${formatValue(blocked, '€')} retenus par des clients mécontents.` });
  if (soon.length) out.push({ key: 'soon', tone: 'warn', title: 'À rappeler', text: `${names(soon, c => `${c.ref} (${c.client}, reçue le ${c.at.slice(8, 10)}/${c.at.slice(5, 7)})`)}.` });
  const unq = cs.filter(c => !c.processId && complaintState(c, now) !== 'closed');
  if (unq.length) out.push({ key: 'unq', tone: 'warn', title: 'Processus en cause à qualifier', text: `${names(unq, c => c.ref)} : sans processus d'origine, la cause ne sera pas traitée.` });
  const major = cs.filter(c => c.severity === 'majeure' && !c.analysisId);
  if (major.length) out.push({ key: '5p', tone: 'warn', title: 'Réclamation majeure sans analyse', text: `${names(major, c => c.ref)} : ouvrir un atelier 5 Pourquoi (outil 5.3).` });
  const courtesy = cs.filter(c => complaintState(c, now) === 'resolved' && (daysBetween(courtesyDue(c), now) ?? -1) >= 0);
  if (courtesy.length) out.push({ key: 'courtesy', tone: 'warn', title: 'Appel de courtoisie à J+15', text: `${names(courtesy, c => `${c.ref} (${c.client})`)} : vérifier que le client est satisfait, puis clore.` });
  return out;
}

// ---- 2.4 end-of-job review: 3 questions on delivery day, final invoice within 24 h
export const questionsOf = (p: Params) => [0, 1, 2].map(i => p.questions?.[i]?.trim() || QUESTIONS[i]);
export const NPS_MIN = 10;   // below, the score is not shown (too few answers)
export const QUESTIONS = [
  'Le livrable répond-il exactement à votre cahier des charges ?',
  'La livraison et les délais ont-ils été respectés comme convenu ?',
  'Sur une échelle de 0 à 10, recommanderiez-vous notre entreprise à un confrère ?',
];
export const isNegative = (f: Feedback) => f.q1 === false || f.q2 === false || (f.q3 !== null && f.q3 <= 6);
export type FeedbackState = 'to_ask' | 'unhappy' | 'doubt' | 'to_invoice' | 'done';
export const FEEDBACK_STATE: Record<FeedbackState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_ask: { label: 'Questions à poser', tone: 'pending' }, unhappy: { label: 'Insatisfaction à traiter', tone: 'alert' }, doubt: { label: 'Réserve à régler', tone: 'alert' },
  to_invoice: { label: 'Facture de solde à émettre', tone: 'warn' }, done: { label: 'Facturé', tone: 'ok' },
};
// A dissatisfied customer is handled as a complaint (2.3) before the final invoice
export function feedbackState(f: Feedback, s?: Pick<State, 'complaints'>): FeedbackState {
  if (f.q1 === null || f.q2 === null || f.q3 === null) return 'to_ask';
  if (!f.invoicedAt && isNegative(f) && !(f.complaintId && s?.complaints[f.complaintId]?.courtesyAt)) return 'unhappy';
  if (f.doubt.trim() && !f.doubtSolvedAt) return 'doubt';
  return f.invoicedAt ? 'done' : 'to_invoice';
}
export const invoiceDelay = (f: Feedback) => (f.invoicedAt ? daysBetween(f.date, f.invoicedAt) : null);
// Net promoter score: share of 9-10 minus share of 0-6
export function nps(fs: Feedback[]): number | null {
  const scores = fs.map(f => f.q3).filter((v): v is number => v !== null);
  if (!scores.length) return null;
  return Math.round((scores.filter(v => v >= 9).length - scores.filter(v => v <= 6).length) / scores.length * 100);
}
export const newFeedback = (today = new Date()): Feedback => ({
  id: uid('fb'), date: isoDate(today), client: '', affaire: '', contact: '', channel: 'site', q1: null, q2: null, q3: null,
  verbatim: '', doubt: '', doubtSolvedAt: '', invoicedAt: '', reviewAsked: false,
});
export function reviewAskMessage(f: Feedback, company: string, link = ''): string {
  return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre note. Si vous avez 1 minute, votre avis nous aiderait beaucoup${link ? ` : ${link}` : ''}. ${company}`.trim();
}
export const paymentDelay = (f: Feedback) => (f.paidAt && f.invoicedAt ? daysBetween(f.invoicedAt, f.paidAt) : null);
export function reviewMessage(f: Feedback, company: string, p?: Params): string {
  if (p?.questions?.some(Boolean)) { const q = questionsOf(p); return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre confiance${f.affaire ? ` (affaire ${f.affaire})` : ''}. Trois questions : 1. ${q[0]} 2. ${q[1]} 3. ${q[2]} ${company || ''}`.trim(); }
  return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre confiance${f.affaire ? ` (affaire ${f.affaire})` : ''}. Trois questions, 45 secondes : 1. Le livrable répond-il à votre cahier des charges (oui / non) ? 2. Les délais ont-ils été respectés (oui / non) ? 3. De 0 à 10, nous recommanderiez-vous à un confrère ? ${company || ''}`.trim();
}
export function feedbackSummary(s: State, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const fs = Object.values(s.feedbacks).filter(f => f.date >= since);
  const complete = fs.filter(f => feedbackState(f) !== 'to_ask');
  const delays = fs.map(invoiceDelay).filter((d): d is number => d !== null);
  const pays = fs.map(paymentDelay).filter((d): d is number => d !== null);
  return {
    count: fs.length, nps: complete.filter(f => f.q3 !== null).length >= NPS_MIN ? nps(complete) : null, answers: complete.length,
    avgPayDays: pays.length ? pays.reduce((a, b) => a + b, 0) / pays.length : null,
    satisfiedPct: complete.length ? Math.round(complete.filter(f => f.q1 && f.q2).length / complete.length * 100) : null,
    avgInvoiceDays: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    toInvoice: fs.filter(f => feedbackState(f, s) === 'to_invoice').length,
  };
}
export function feedbackInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const fs = Object.values(s.feedbacks);
  const doubt = fs.filter(f => feedbackState(f, s) === 'doubt');
  if (doubt.length) out.push({ key: 'doubt', tone: 'bad', title: 'Réserve du client à régler', text: `${names(doubt, f => `${f.client} : ${f.doubt}`)}. La régler dans la journée, avant qu'elle ne devienne un motif d'impayé.` });
  const neg = fs.filter(f => feedbackState(f, s) === 'unhappy');
  if (neg.length) out.push({ key: 'neg', tone: 'bad', title: 'Client insatisfait', text: `${names(neg, f => f.client)} : traiter comme une réclamation (outil 2.3) avant la facture de solde.` });
  const inv = fs.filter(f => feedbackState(f, s) === 'to_invoice' && (daysBetween(f.date, today) ?? 0) > 1);
  if (inv.length) out.push({ key: 'inv', tone: 'warn', title: 'Facture de solde en attente', text: `${names(inv, f => f.client)} : bilan validé, facturer sous 24 h sans attendre la fin du mois.` });
  const prom = fs.filter(f => (f.q3 ?? 0) >= 9 && !f.reviewAsked);
  if (prom.length) out.push({ key: 'review', tone: 'good', title: 'Clients prêts à recommander', text: `${names(prom, f => f.client)} : note de 9 ou 10, demander un avis ou une mise en relation.` });
  return out;
}
