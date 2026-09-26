// Example records of tools 2.1 to 2.4, for the fictitious company of the demo (same clients and people as the other tools).
// Dates are relative to today: a quote to follow up, work started without agreement, a complaint not called back in time…
import type { Change, Complaint, Feedback, Quote, State } from './types';
import { isoDate } from './periods';
import { LOCKS } from './commercial';

export function commercialExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const hoursAgo = (h: number) => { const d = new Date(today.getTime() - h * 3600000); return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const at = (n: number, h: number) => `${ago(n)}T${String(h).padStart(2, '0')}:00`;
  const y = today.getFullYear();
  const ok = () => LOCKS.map(() => ({ state: 'ok' as const, note: '' }));
  const visas = (n: number) => ({ commercial: { by: 'Laurent B.', date: ago(n) }, technical: { by: 'David K.', date: ago(n) }, direction: { by: 'Jean-Marc', date: ago(n) } });
  const none = { commercial: { by: '', date: '' }, technical: { by: '', date: '' }, direction: { by: '', date: '' } };
  const q = (n: number, p: Partial<Quote>): Quote => ({
    id: `qt_demo_${n}`, ref: `DEV-${y}-${String(n).padStart(3, '0')}`, client: '', object: '', date: ago(30), amount: null, weeks: null, locks: ok(), visas: none,
    derogation: '', depositReceived: false, status: 'draft', sentAt: '', followedAt: '', decidedAt: '', lostReason: '', ...p,
  });
  const quotes: Quote[] = [
    q(1, { client: 'Client A', object: 'Châssis mécano-soudés, série de 150', date: ago(55), amount: 35000, weeks: 6, visas: visas(55), status: 'won', sentAt: ago(54), decidedAt: ago(40), depositReceived: true, cost: { material: 12500, hours: 145, subcontract: 2500, other: null } }),
    q(2, { client: 'Client B', object: 'Portillons thermolaqués RAL 7016 (40 pièces)', date: ago(14), amount: 16000, weeks: 4, visas: visas(13), derogation: 'Jean-Marc : première commande, client à conquérir', status: 'sent', sentAt: ago(12), cost: { material: 6200, hours: 80, subcontract: 1800, other: null } }),
    q(3, { client: 'Client C', object: 'Platines inox découpées et pliées (300 pièces)', date: ago(5), amount: 48000, weeks: 5, visas: visas(4), status: 'sent', sentAt: ago(3), cost: { material: 18000, hours: 200, subcontract: 3200, other: 400 } }),
    q(4, {
      client: 'Agencement Morel', object: 'Garde-corps acier pour une mezzanine', date: ago(2), amount: 8400, weeks: 3,
      locks: [{ state: 'ok', note: '' }, { state: 'ok', note: '' }, { state: 'ko', note: 'Plieuse saturée jusqu\'à la semaine S+5' }, { state: 'reserve', note: '' }, { state: '', note: '' }],
      cost: { material: 2100, hours: 60, subcontract: 900, other: null },
    }),
    q(5, { client: 'BâtiPro', object: 'Escalier hélicoïdal extérieur', date: ago(75), amount: 22000, weeks: 8, visas: visas(74), status: 'lost', sentAt: ago(74), decidedAt: ago(60), lostReason: 'Prix : concurrent 12 % moins cher', cost: { material: 7800, hours: 150, subcontract: 1200, other: null } }),
    q(6, { client: 'Client A', object: 'Supports moteur, série de 400', date: ago(18), amount: 12500, weeks: 3, visas: visas(17), status: 'won', sentAt: ago(17), decidedAt: ago(10), depositReceived: false, cost: { material: 3900, hours: 70, subcontract: null, other: 250 } }),
  ];
  const c = (n: number, p: Partial<Change>): Change => ({
    id: `av_demo_${n}`, ref: `AV-${y}-${String(n).padStart(3, '0')}`, affaire: '', client: '', askedBy: '', date: ago(20), description: '', price: null, delayDays: null,
    sentAt: '', via: '', answer: '', answeredAt: '', startedAt: '', invoiceRef: '', invoicedAt: '', ...p,
  });
  const changes: Change[] = [
    c(1, { affaire: 'Châssis série 150', client: 'Client A', askedBy: 'M. Durand', date: ago(35), description: 'Finition thermolaquée RAL 7016 au lieu du galvanisé', price: 1450, delayDays: 3, sentAt: ago(35), via: 'sms', answer: 'accepted', answeredAt: ago(34), startedAt: ago(30), invoiceRef: `FA-${y}-089`, invoicedAt: ago(8) }),
    c(2, { affaire: 'Escalier atelier', client: 'BâtiPro', askedBy: 'Mme Lopez', date: ago(6), description: 'Déplacement de l\'entraxe des fixations (plan V2)', price: 850, delayDays: 2, sentAt: ago(5), via: 'mail', startedAt: ago(2) }),
    c(3, { affaire: 'Platines inox', client: 'Client C', askedBy: 'Acheteur', date: ago(1), description: '3 perçages complémentaires par platine' }),
    c(4, { affaire: 'Supports moteur', client: 'Client A', askedBy: 'M. Durand', date: ago(9), description: 'Emballage renforcé pour l\'export', price: 620, delayDays: 0, sentAt: ago(9), via: 'sms', answer: 'accepted', answeredAt: ago(8) }),
  ];
  const cp = (n: number, p: Partial<Complaint>): Complaint => ({
    id: `cp_demo_${n}`, ref: `R-${y}-${String(n).padStart(3, '0')}`, at: at(30, 9), client: '', affaire: '', channel: 'tel', receivedBy: 'Laurent B.', description: '',
    severity: 'mineure', processId: '', contactedAt: '', immediate: '', pilot: '', cost: null, resolvedAt: '', courtesyAt: '', ...p,
  });
  const complaints: Complaint[] = [
    cp(1, { at: at(48, 10), client: 'Client A', affaire: 'Châssis série 150', description: 'Livraison en retard de 3 jours sans avoir été prévenu', processId: 'P3', contactedAt: at(48, 16), immediate: 'Appel du dirigeant, livraison express du solde', pilot: 'David K.', cost: 260, resolvedAt: ago(45), courtesyAt: ago(30) }),
    cp(2, { at: at(13, 8), client: 'Client B', affaire: 'Portillons', channel: 'mail', description: 'Défaut d\'aspect peinture sur 4 portillons (coulures)', severity: 'majeure', processId: 'P5', contactedAt: at(12, 2), immediate: 'Remplacement des 4 pièces sous 5 jours', pilot: 'Antoine P.', cost: 180, resolvedAt: ago(5), ncId: 'nc_demo_5', analysisId: 'an_demo_3' }),
    cp(3, { at: hoursAgo(60), client: 'Agencement Morel', affaire: 'Rampe atelier', channel: 'mail', description: 'Conteste le montant de la facture par rapport au devis', processId: 'P2', pilot: 'Laurent B.' }),
    cp(4, { at: hoursAgo(5), client: 'Client C', affaire: 'Platines inox', description: 'Cotes de perçage non conformes au plan sur 3 platines', receivedBy: 'Sophie V.' }),
  ];
  const f = (n: number, p: Partial<Feedback>): Feedback => ({
    id: `fb_demo_${n}`, date: ago(20), client: '', affaire: '', contact: '', channel: 'site', q1: null, q2: null, q3: null, verbatim: '', doubt: '', doubtSolvedAt: '', invoicedAt: '', reviewAsked: false, ...p,
  });
  const feedbacks: Feedback[] = [
    f(1, { date: ago(38), client: 'Client A', affaire: 'Châssis série 150', contact: 'M. Durand', q1: true, q2: true, q3: 9, verbatim: 'Pièces conformes, merci pour la réactivité sur la finition', invoicedAt: ago(37) }),
    f(2, { date: ago(3), client: 'Client C', affaire: 'Caissons de rangement', contact: 'Responsable appro', channel: 'sms', q1: true, q2: false, q3: 7, verbatim: 'Livré avec 2 jours de retard', doubt: 'Une poignée mal vissée sur un caisson' }),
    f(3, { date: ago(62), client: 'BâtiPro', affaire: 'Passerelle', contact: 'Mme Lopez', q1: true, q2: true, q3: 10, reviewAsked: true, invoicedAt: ago(61) }),
    f(4, { date: ago(12), client: 'Client B', affaire: 'Portillons', contact: 'Acheteur', channel: 'tel', q1: false, q2: true, q3: 5, verbatim: 'Défaut de peinture sur 4 pièces', complaintId: 'cp_demo_2', invoicedAt: '' }),
    f(5, { date: ago(1), client: 'Agencement Morel', affaire: 'Rampe atelier', contact: 'M. Morel', channel: 'sms' }),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { quotes: byId(quotes), changes: byId(changes), complaints: byId(complaints), feedbacks: byId(feedbacks) };
}

// Replaces the records of tools 2.1 to 2.4 by the examples; the other tools are untouched
export function applyCommercialExample(d: State, today = new Date()) {
  Object.assign(d, commercialExamples(today));
}
