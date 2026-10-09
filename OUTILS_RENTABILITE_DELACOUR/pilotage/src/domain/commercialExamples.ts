// Example records of tools 2.1, 2.3 and 2.4, for the fictitious company of the demo (same clients and people as the other tools).
// Dates are relative to today: a quote to follow up, a complaint not called back in time…
import type { Complaint, Feedback, Params, Quote, State } from './types';
import { isoDate } from './periods';
import { nowLocal, parseStamp } from './base';
import { addSatisfactionKpi, DEFAULT_MOTIFS, feedbackMonthPct, LOCKS } from './commercial';
import { frenchHolidays } from './calendar';
import { complaintHistory, safetyComplaints } from './complaintHistory';
import { exampleContacts, exampleOrgs } from './riskTemplates';
import { orgOf } from './contacts';
import { sameClient } from './clients';
import { addMonths, periodOfDate } from './periods';

export function commercialExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const hoursAgo = (h: number) => { const d = new Date(today.getTime() - h * 3600000); return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const at = (n: number, h: number) => `${ago(n)}T${String(h).padStart(2, '0')}:00`;
  const y = today.getFullYear();
  const ok = () => LOCKS.map(() => ({ state: 'ok' as const, note: '', by: 'David K.' }));
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
      locks: [{ state: 'ok', note: '' }, { state: 'ok', note: '' }, { state: 'ko', note: 'Plieuse saturée jusqu\'à la semaine S+5', by: 'David K.' }, { state: 'reserve', note: '' }, { state: '', note: '' }],
      cost: { material: 2100, hours: 60, subcontract: 900, other: null },
    }),
    q(5, { client: 'BâtiPro', object: 'Escalier hélicoïdal extérieur', date: ago(75), amount: 22000, weeks: 8, visas: visas(74), status: 'lost', sentAt: ago(74), decidedAt: ago(60), lostReason: 'Prix : concurrent 12 % moins cher', cost: { material: 7800, hours: 150, subcontract: 1200, other: null } }),
    q(6, { client: 'Client A', object: 'Supports moteur, série de 400', date: ago(18), amount: 12500, weeks: 3, visas: visas(17), status: 'won', sentAt: ago(17), decidedAt: ago(10), depositReceived: false, cost: { material: 3900, hours: 70, subcontract: null, other: 250 } }),
    // won, promised in 3 weeks, delivered 2 days late: the review of this order shows the promised delay against the real one
    q(7, { client: 'Client C', object: 'Caissons de rangement (12 pièces)', date: ago(32), amount: 9600, weeks: 3, visas: visas(31), status: 'won', sentAt: ago(31), decidedAt: ago(26), depositReceived: true, cost: { material: 3400, hours: 40, subcontract: null, other: 150 } }),
  ];
  const cp = (n: number, p: Partial<Complaint>): Complaint => {
    const c: Complaint = {
      id: `cp_demo_${n}`, ref: `R-${y}-${String(n).padStart(3, '0')}`, at: at(30, 9), client: '', affaire: '', channel: 'tel', receivedBy: 'Laurent B.', description: '',
      severity: 'mineure', processId: '', contactedAt: '', immediate: '', pilot: '', cost: null, resolvedAt: '', courtesyAt: '', ...p,
    };
    return { ...c, ...complaintExampleExtra(c) };
  };
  const complaints: Complaint[] = [
    cp(1, { at: at(48, 10), client: 'Client A', affaire: 'Châssis série 150', description: 'Livraison en retard de 3 jours sans avoir été prévenu', processId: 'P3', contactedAt: at(48, 16), immediate: 'Appel du dirigeant, livraison express du solde', pilot: 'David K.', cost: 260, resolvedAt: ago(45), courtesyAt: ago(30) }),
    cp(2, { at: at(13, 8), client: 'Client B', affaire: 'Portillons', channel: 'mail', description: 'Défaut d\'aspect peinture sur 4 portillons (coulures)', severity: 'majeure', processId: 'P5', contactedAt: at(12, 2), immediate: 'Remplacement des 4 pièces sous 5 jours', pilot: 'Antoine P.', cost: 180, resolvedAt: ago(5), ncId: 'nc_demo_5', analysisId: 'an_demo_3' }),
    cp(3, { at: hoursAgo(60), client: 'Agencement Morel', affaire: 'Rampe atelier', channel: 'mail', description: 'Conteste le montant de la facture par rapport au devis', processId: 'P2', pilot: 'Laurent B.' }),
    cp(4, { at: hoursAgo(5), client: 'Client C', affaire: 'Platines inox', description: 'Cotes de perçage non conformes au plan sur 3 platines', receivedBy: 'Sophie V.' }),
    cp(5, { at: at(40, 9), client: 'BâtiPro', affaire: 'Passerelle', description: 'Soudures reprises mais le défaut est revenu sur 2 pièces', processId: 'P3', contactedAt: at(39, 9), immediate: 'Reprise des soudures sur place', pilot: 'David K.', resolvedAt: ago(30), courtesyAt: ago(14) }),
    // a customer who never answered the courtesy call, a complaint closed by the management, an old one to erase, a pilot on leave
    cp(6, { at: at(70, 9), client: 'Client A', affaire: 'Supports moteur', channel: 'mail', email: 'achats@client-a.example', description: 'Cotes de perçage hors tolérance sur 2 supports', processId: 'P3', category: 'qualite', pilot: 'David K.', contactedAt: at(70, 15), contactVia: 'mail', immediate: 'Contrôle dimensionnel du lot entier', verdict: 'fondee', findings: 'Mesure du lot : 2 supports sur 400 hors tolérance, gabarit de perçage usé.', cause: 'Gabarit de perçage usé, non remplacé.', correction: 'Gabarit remplacé et contrôlé chaque lundi.', solution: 'Remplacement des 2 supports', rework: 40, hours: 2, ackAt: at(70, 10), resolvedAt: ago(62), resultSentAt: `${ago(63)}T10:00`, resultVia: 'mail', courtesyAt: ago(47), satisfied: 'injoignable', courtesyNote: '2 appels et 1 e-mail restés sans réponse', checks: { equipment: { state: 'ko', note: 'Gabarit de perçage usé' } } }),
    cp(7, { at: at(25, 10), client: 'BâtiPro', affaire: 'Rampe atelier', channel: 'site', receivedBy: 'David K.', pilot: 'David K.', description: 'Traces de meulage visibles sur la finition de la rampe', processId: 'P3', category: 'qualite', contactedAt: at(24, 9), contactVia: 'site', immediate: 'Reprise de la finition sur place', verdict: 'fondee', findings: 'Constat sur place avec le conducteur de travaux : meulage non repris.', resolvedAt: ago(15), forcedClose: { by: 'Jean-Marc', at: `${ago(10)}T10:00`, reason: "Le conducteur de travaux a quitté l'entreprise cliente : plus d'interlocuteur pour l'appel de courtoisie." } }),
    cp(8, { ref: `R-${y - 6}-001`, at: at(2300, 9), client: 'Ancien client SARL', channel: 'mail', email: 'contact@ancien-client.example', message: 'Bonjour, la livraison ne correspond pas à la commande.', description: 'Livraison non conforme à la commande', processId: 'P2', category: 'facture', pilot: 'Laurent B.', contactedAt: at(2300, 14), contactVia: 'tel', verdict: 'fondee', findings: 'Commande mal saisie.', cause: 'Commande saisie à la main sans relecture.', correction: 'Relecture de la commande par un second.', solution: 'Avoir de 120 €', credit: 120, ackAt: at(2300, 10), resolvedAt: ago(2295), resultSentAt: `${ago(2296)}T10:00`, resultVia: 'tel', courtesyAt: ago(2280), satisfied: 'oui' }),
    cp(9, { at: hoursAgo(3), client: 'Atelier Duval', affaire: 'Kit de montage', channel: 'tel', receivedBy: 'Sophie V.', pilot: 'Lucie B.', description: 'Notice de montage absente du colis', category: 'emballage' }),
  ];
  const f = (n: number, p: Partial<Feedback>): Feedback => ({
    id: `fb_demo_${n}`, date: ago(20), client: '', affaire: '', contact: '', channel: 'site', q1: null, q2: null, q3: null, verbatim: '', doubt: '', doubtSolvedAt: '', reviewAsked: false, ...p,
  });
  // Twelve months of reviews: every state of the tool (questions to ask, unhappy, unhappy and settled, satisfied), the details given
  // under a "no" and the day it was settled with the customer, a month in the red (February), promoters asked for something, enough
  // answers for the score
  const T = true, F = false;
  const feedbacks: Feedback[] = [
    f(1, { date: ago(38), client: 'Client A', affaire: 'Châssis série 150', contact: 'M. Durand', q1: T, q2: T, q3: 9, verbatim: 'Pièces conformes, merci pour la réactivité sur la finition', reviewAsked: true, followUp: 'avis', deliveryId: 'dl_demo_1', quoteId: 'qt_demo_1' }),
    f(2, { date: ago(3), client: 'Client C', affaire: 'Caissons de rangement', contact: 'Responsable appro', channel: 'sms', q1: F, q2: F, q3: 7, q1Detail: 'Une poignée mal vissée sur un caisson', q2Detail: 'Livré avec 2 jours de retard', verbatim: 'Bonne qualité mais le retard nous a gênés', deliveryId: 'dl_demo_2', quoteId: 'qt_demo_7' }),
    f(3, { date: ago(62), client: 'BâtiPro', affaire: 'Passerelle', contact: 'Mme Lopez', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    f(4, { date: ago(12), client: 'Client B', affaire: 'Portillons', contact: 'Acheteur', channel: 'tel', q1: F, q2: T, q3: 5, q1Detail: 'Coulures sur la face avant de 4 pièces', q3Detail: 'Un défaut visible dès la réception', verbatim: 'Défaut de peinture sur 4 pièces', complaintId: 'cp_demo_2' }),
    f(5, { date: ago(1), client: 'Agencement Morel', affaire: 'Rampe atelier', contact: 'M. Morel', channel: 'sms' }),
    f(6, { date: ago(2), client: 'Client A', affaire: 'Supports moteur, lot 1', contact: 'M. Durand', channel: 'tel', q1: T, q2: T, q3: 9, verbatim: 'Très satisfait du premier lot', quoteId: 'qt_demo_6' }),
    f(7, { date: ago(5), client: 'Atelier Duval', affaire: 'Équerres de fixation', contact: 'Mme Rey', channel: 'mail', email: 'mme.rey@atelier-duval.example', q1: F, q2: T, q3: 8, q1Detail: 'Une cale de protection abîmée dans le colis', doubtSolvedAt: ago(5) }),
    f(8, { date: ago(95), client: 'Client A', affaire: 'Supports moteur, essais', contact: 'M. Durand', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'temoignage' }),
    f(9, { date: ago(120), client: 'Client B', affaire: 'Portillons, première série', contact: 'Acheteur', channel: 'tel', q1: T, q2: T, q3: 9, verbatim: 'Rien à redire', reviewAsked: true, followUp: 'avis' }),
    f(10, { date: ago(150), client: 'Agencement Morel', affaire: 'Garde-corps', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 8 }),
    f(11, { date: ago(185), client: 'Client C', affaire: 'Platines inox, série 1', contact: 'Responsable appro', channel: 'sms', q1: T, q2: T, q3: 10, verbatim: 'Précis et rapide', reviewAsked: true, followUp: 'contact' }),
    f(12, { date: ago(215), client: 'BâtiPro', affaire: 'Garde-corps de l\'atelier', contact: 'Mme Lopez', q1: F, q2: T, q3: 4, q1Detail: 'Des soudures à reprendre sur deux montants', q3Detail: 'Il a fallu relancer pour obtenir la reprise', verbatim: 'Des soudures à reprendre', doubtSolvedAt: ago(213) }),
    f(13, { date: ago(250), client: 'Client A', affaire: 'Châssis série 90', contact: 'M. Durand', q1: T, q2: T, q3: 9, reviewAsked: true, followUp: 'autre', followNote: 'Recommandation auprès de sa filiale' }),
    f(14, { date: ago(290), client: 'Client B', affaire: 'Supports de cuve', contact: 'Acheteur', channel: 'tel', q1: T, q2: T, q3: 7, verbatim: 'Un jour de retard, sans gravité' }),
    f(15, { date: ago(330), client: 'Agencement Morel', affaire: 'Habillage de comptoir', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    // the rest of the year, month by month (current month and the 2 last first)
    f(16, { date: ago(8), client: 'Maison Perrin', affaire: 'Cloison vitrée', contact: 'Mme Perrin', channel: 'tel', q1: T, q2: T, q3: 10, verbatim: 'Équipe discrète et efficace', reviewAsked: true, followUp: 'avis' }),
    f(17, { date: ago(15), client: 'Collectivité Valmont', affaire: 'Mobilier de la salle des fêtes', contact: 'M. Garnier', channel: 'mail', email: 'm.garnier@valmont.example', q1: T, q2: T, q3: 9, verbatim: 'Chantier propre, délai tenu', reviewAsked: true, followUp: 'contact' }),
    f(18, { date: ago(21), client: 'Maison Perrin', affaire: 'Rénovation de l\'accueil', contact: 'Mme Perrin', q1: T, q2: F, q3: 6, q2Detail: 'Livré avec 4 jours de retard sans nous prévenir', q3Detail: 'Pas de nouvelles pendant le retard', verbatim: 'Le résultat est bon, mais nous aurions dû être prévenus', doubtSolvedAt: ago(20) }),
    f(19, { date: ago(27), client: 'Cabinet Rey', affaire: 'Aménagement de bureaux', contact: 'Dr Rey', q1: T, q2: T, q3: 9 }),
    f(20, { date: ago(33), client: 'Client B', affaire: 'Portillons, série 3', contact: 'Acheteur', channel: 'tel', q1: F, q2: T, q3: 5, q1Detail: 'Teinte différente de l\'échantillon validé', q3Detail: 'La teinte n\'est pas celle choisie', verbatim: 'À refaire pour la teinte', doubtSolvedAt: ago(31) }),
    f(21, { date: ago(45), client: 'Atelier Duval', affaire: 'Équerres de fixation, lot 1', contact: 'Mme Rey', channel: 'mail', q1: T, q2: T, q3: 8 }),
    f(22, { date: ago(50), client: 'Client A', affaire: 'Supports moteur, lot 3', contact: 'M. Durand', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    f(23, { date: ago(70), client: 'BâtiPro', affaire: 'Escalier de service', contact: 'Mme Lopez', q1: T, q2: T, q3: 9 }),
    f(24, { date: ago(78), client: 'Agencement Morel', affaire: 'Habillage de vitrine', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 8 }),
    f(25, { date: ago(85), client: 'Cabinet Rey', affaire: 'Cloisons mobiles', contact: 'Dr Rey', channel: 'mail', q1: T, q2: T, q3: 10, verbatim: 'Nous recommandons sans hésiter', reviewAsked: true, followUp: 'temoignage' }),
    f(26, { date: ago(100), client: 'Agencement Morel', affaire: 'Mobilier de réception', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 7 }),
    f(27, { date: ago(110), client: 'Collectivité Valmont', affaire: 'Bancs et abris', contact: 'M. Garnier', channel: 'mail', q1: T, q2: T, q3: 9 }),
    f(28, { date: ago(135), client: 'Client C', affaire: 'Platines inox, série 2', contact: 'Responsable appro', channel: 'sms', q1: T, q2: T, q3: 9 }),
    f(29, { date: ago(145), client: 'BâtiPro', affaire: 'Passerelle, reprise', contact: 'Mme Lopez', q1: F, q2: T, q3: 4, q1Detail: 'Épaisseur différente de celle du plan', q3Detail: 'Plusieurs reprises nécessaires', doubtSolvedAt: ago(143) }),
    f(30, { date: ago(165), client: 'Maison Perrin', affaire: 'Banque d\'accueil', contact: 'Mme Perrin', channel: 'tel', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    f(31, { date: ago(175), client: 'Client A', affaire: 'Châssis série 120', contact: 'M. Durand', q1: T, q2: T, q3: 9 }),
    f(32, { date: ago(190), client: 'Client C', affaire: 'Caissons de rangement, série 2', contact: 'Responsable appro', channel: 'sms', q1: T, q2: F, q3: 6, q2Detail: 'Lot livré en deux fois', q3Detail: 'Organisation de la livraison à revoir', doubtSolvedAt: ago(189) }),
    f(33, { date: ago(200), client: 'Atelier Duval', affaire: 'Kit de montage', contact: 'Mme Rey', channel: 'mail', q1: T, q2: T, q3: 8 }),
    f(34, { date: ago(225), client: 'Maison Perrin', affaire: 'Habillage de comptoir', contact: 'Mme Perrin', channel: 'tel', q1: F, q2: F, q3: 3, q1Detail: 'Finition irrégulière sur plusieurs panneaux', q2Detail: 'Livré une semaine après la date annoncée', q3Detail: 'Plusieurs défauts et un retard', verbatim: 'Déçus de cette livraison', doubtSolvedAt: ago(222) }),
    f(35, { date: ago(235), client: 'Client B', affaire: 'Portillons, série 2', contact: 'Acheteur', channel: 'tel', q1: T, q2: T, q3: 8 }),
    f(36, { date: ago(255), client: 'Collectivité Valmont', affaire: 'Barrières de ville', contact: 'M. Garnier', channel: 'mail', q1: T, q2: T, q3: 7 }),
    f(37, { date: ago(270), client: 'Cabinet Rey', affaire: 'Armoires sur mesure', contact: 'Dr Rey', q1: T, q2: T, q3: 7 }),
    f(38, { date: ago(285), client: 'Agencement Morel', affaire: 'Garde-corps de l\'escalier', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 9 }),
    f(39, { date: ago(300), client: 'Client A', affaire: 'Châssis série 60', contact: 'M. Durand', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    f(40, { date: ago(320), client: 'BâtiPro', affaire: 'Rampe d\'accès', contact: 'Mme Lopez', q1: T, q2: T, q3: 9 }),
    f(41, { date: ago(333), client: 'Client C', affaire: 'Platines inox, série 0', contact: 'Responsable appro', channel: 'sms', q1: T, q2: T, q3: 9 }),
    // today and the last days: a complaint just received, questions to ask, a point settled the same day
    f(42, { date: ago(0), client: 'Client C', affaire: 'Platines inox, reprise', contact: 'Responsable appro', channel: 'tel', q1: F, q2: T, q3: 4, q1Detail: 'Cotes de perçage non conformes au plan sur 3 platines', verbatim: 'Réclamation déposée ce matin', complaintId: 'cp_demo_4' }),
    f(43, { date: ago(0), client: 'Collectivité Valmont', affaire: 'Mobilier, lot 2', contact: 'M. Garnier', channel: 'mail', email: 'm.garnier@valmont.example' }),
    f(44, { date: ago(4), client: 'Maison Perrin', affaire: 'Cloison vitrée, finitions', contact: 'Mme Perrin', q1: T, q2: T, q3: 8 }),
    f(45, { date: ago(4), client: 'Cabinet Rey', affaire: 'Aménagement, tranche 2', contact: 'Dr Rey', q1: T, q2: F, q3: 7, q2Detail: 'Un jour de retard sur la date convenue', doubtSolvedAt: ago(4) }),
    f(46, { date: ago(6), client: 'Atelier Duval', affaire: 'Équerres de fixation, lot 2', contact: 'Mme Rey', channel: 'mail', q1: T, q2: T, q3: 9 }),
    f(47, { date: ago(9), client: 'Client A', affaire: 'Supports moteur, lot 2', contact: 'M. Durand', q1: T, q2: T, q3: 10, reviewAsked: true, followUp: 'avis' }),
    f(48, { date: ago(14), client: 'Agencement Morel', affaire: 'Rampe atelier, finitions', contact: 'M. Morel', channel: 'sms', q1: T, q2: T, q3: 7 }),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { quotes: byId(quotes), complaints: byId([...complaints, ...complaintHistory(today), ...safetyComplaints(today)]), feedbacks: byId(feedbacks) };
}

// What the example adds to a complaint of the fictitious company, worked out from the moments the record already holds, so that
// an example saved in a browser before these fields existed is completed in place (the company's own records are never touched).
// Four generations, each applied once: V1 = follow-up of the register (written within the hour, acknowledgement, costs, answer
// at the courtesy call), V2 = how the customer was contacted again and the investigation (verdict, cause, arguments).
function exampleExtraV1(c: Complaint): Partial<Complaint> {
  const t0 = parseStamp(c.at)?.getTime() ?? Date.now();
  const after = (h: number) => nowLocal(new Date(t0 + h * 3600000));
  switch (c.id) {
    case 'cp_demo_1': return { loggedAt: after(0.25), ackAt: after(1), category: c.category || 'delai', logistics: c.cost, cost: null, hours: 3, satisfied: 'oui', courtesyNote: 'Très bien, merci d\'avoir appelé tout de suite', correction: 'Le planning des livraisons est revu chaque lundi ; le client est prévenu dès qu\'un retard dépasse 1 jour' };
    case 'cp_demo_2': return { loggedAt: after(0.5), ackAt: after(2), category: c.category || 'qualite', rework: c.cost, cost: null, hours: 6, blockedInvoice: 3200, message: 'Bonjour, les 4 portillons reçus ont des coulures visibles sur la face avant. Merci de nous dire sous quel délai vous les remplacez.', correction: 'Contrôle final de l\'aspect sous lumière rasante avant chargement' };
    case 'cp_demo_3': return { loggedAt: after(3), category: c.category || 'facture', message: 'Je conteste la facture : le devis indiquait 7 800 € et vous facturez 9 100 €.' };
    case 'cp_demo_4': return { loggedAt: after(0.3), category: c.category || 'qualite' };
    case 'cp_demo_5': return { loggedAt: after(0.3), ackAt: after(1), category: c.category || 'qualite', rework: 90, hours: 4, satisfied: 'non', courtesyNote: 'Le défaut est revenu sur 2 pièces', correction: 'Soudure des angles contrôlée au gabarit après reprise' };
    default: return { loggedAt: c.loggedAt ?? c.at };
  }
}

function exampleExtraV2(c: Complaint): Partial<Complaint> {
  switch (c.id) {
    case 'cp_demo_1': return { contactVia: 'tel', verdict: 'fondee', findings: 'Bon de livraison daté de 3 jours après la date promise ; aucun message envoyé au client entre-temps.', cause: 'Retard de la peinture non signalé : pas de point livraison avec la production.' };
    case 'cp_demo_2': return { contactVia: 'mail', email: 'acheteur@client-b.example', mailLink: 'https://webmail.example.com/message/R-demo-2', verdict: 'fondee', findings: 'Contrôle des 4 portillons : coulures confirmées sur la face avant. Le contrôle final ne regardait pas l\'aspect sous lumière rasante.', cause: 'Viscosité de la peinture non contrôlée après le changement de lot.' };
    case 'cp_demo_3': return { email: 'compta@agencement-morel.example', mailLink: 'https://webmail.example.com/message/R-demo-3', verdict: 'non_fondee', processId: '', findings: 'Facture de 9 100 € = devis de 7 800 € + complément de commande de 1 300 € signé par le client.', defense: 'Le complément de commande de 1 300 € (rampe rallongée de 2 m) est signé par M. Morel ; la facture de 9 100 € est le devis de 7 800 € plus ce complément.' };
    case 'cp_demo_5': return { contactVia: 'tel', verdict: 'fondee', findings: 'Contrôle sur place : 2 soudures d\'angle non reprises sur la passerelle.', cause: 'Pas de gabarit pour la reprise : elle a été faite à vue.' };
    default: return { verdict: c.verdict ?? '' };
  }
}
// V3 = the six-step flow: points checked in the investigation, final solution, customer told the result
function exampleExtraV3(c: Complaint): Partial<Complaint> {
  const t0 = parseStamp(c.resolvedAt || c.at)?.getTime() ?? Date.now();
  const told = nowLocal(new Date(t0 + 10 * 3600000));
  switch (c.id) {
    case 'cp_demo_1': return { checks: { engagement: { state: 'ok', note: 'Délai annoncé : 6 semaines, tenu en fabrication' }, delivery: { state: 'ko', note: 'Bon de livraison daté 3 jours après la date promise' }, exchange: { state: 'ko', note: 'Aucun message envoyé au client avant l\'échéance' } }, solution: 'Livraison express du solde, transport offert', resultSentAt: told, resultVia: 'tel' };
    case 'cp_demo_2': return { checks: { supplier: { state: 'ok', note: 'Lot de peinture conforme' }, method: { state: 'ko', note: 'Instruction sans contrôle de viscosité après changement de lot' }, control: { state: 'ko', note: 'Contrôle final sans examen de l\'aspect' } }, solution: 'Remplacement des 4 portillons sous 5 jours', resultSentAt: told, resultVia: 'mail' };
    case 'cp_demo_3': return { checks: { engagement: { state: 'ok', note: 'Complément de commande de 1 300 € signé par M. Morel' }, billing: { state: 'ok', note: 'Facture = devis + complément' }, exchange: { state: 'ok', note: 'Mail d\'accord du client du 14/09' } } };
    case 'cp_demo_5': return { checks: { method: { state: 'ko', note: 'Pas de gabarit pour la reprise des soudures' }, people: { state: 'ok', note: 'Soudeur habilité au poste' } }, solution: 'Reprise des soudures sur place avec gabarit', resultSentAt: told, resultVia: 'tel' };
    default: return { checks: c.checks ?? {} };
  }
}
// V4 = links to the mails as sent (acknowledgement, result) for the complaint received by mail
function exampleExtraV4(c: Complaint): Partial<Complaint> {
  return c.id === 'cp_demo_2' ? { ackLink: 'https://webmail.example.com/sent/R-demo-2a', resultLink: 'https://webmail.example.com/sent/R-demo-2b' } : { ackLink: c.ackLink ?? '' };
}
// V5 = approval of the management, reception time never edited (except one), and the extra records of the register
function exampleExtraV5(c: Complaint): Partial<Complaint> {
  const day = (c.resolvedAt || c.at).slice(0, 10);
  switch (c.id) {
    case 'cp_demo_1': return { atEdited: false, approval: { by: 'Jean-Marc', at: `${day}T07:00`, note: 'Livraison express offerte : accord' } };
    case 'cp_demo_4': return { atEdited: true };
    default: return { atEdited: c.atEdited ?? false };
  }
}
export function complaintExampleExtra(c: Complaint): Partial<Complaint> {
  const v1 = exampleExtraV1(c), v2 = exampleExtraV2({ ...c, ...v1 }), v3 = exampleExtraV3({ ...c, ...v1, ...v2 }), v4 = exampleExtraV4({ ...c, ...v1, ...v2, ...v3 });
  return { ...v1, ...v2, ...v3, ...v4, ...exampleExtraV5({ ...c, ...v1, ...v2, ...v3, ...v4 }) };
}
// Settings of the fictitious company that make the new rules visible: a decision limit, the answers "unjustified" approved, public holidays
export function commercialExampleParams(today = new Date()) {
  const y = today.getFullYear();
  return { exampleLevel: 11, reviewLink: 'https://avis.example.com/entreprise-exemple', motifs: [...DEFAULT_MOTIFS, { key: 'securite', label: 'Sécurité, hygiène ou environnement', slot: 5 }], creditLimit: 250, approveContest: true, closedDays: [...frenchHolidays(y), ...frenchHolidays(y + 1)].map(h => h.date).sort() };
}

// Fictitious company saved before these fields existed: complete its example complaints, each generation once
export function completeComplaintExamples(complaints: Record<string, Complaint>, today = new Date()): Record<string, Complaint> {
  const demo = (c: Complaint) => c.id.startsWith('cp_demo_');
  const todo = Object.values(complaints).filter(c => demo(c) && (c.loggedAt === undefined || c.verdict === undefined || c.checks === undefined || c.ackLink === undefined || c.atEdited === undefined));
  if (!todo.length) return complaints;
  const out = { ...complaints };
  todo.forEach(c => {
    let x = c;
    if (x.loggedAt === undefined) x = { ...x, ...exampleExtraV1(x) };
    if (x.verdict === undefined) x = { ...x, ...exampleExtraV2(x) };
    if (x.checks === undefined) x = { ...x, ...exampleExtraV3(x) };
    if (x.ackLink === undefined) x = { ...x, ...exampleExtraV4(x) };
    if (x.atEdited === undefined) x = { ...x, ...exampleExtraV5(x) };
    out[c.id] = x;
  });
  // the extra records come with the generation that created them, once
  const fresh = commercialExamples(today).complaints;
  if (todo.some(c => c.loggedAt === undefined)) out.cp_demo_5 ||= fresh.cp_demo_5;
  if (todo.some(c => c.atEdited === undefined)) ['cp_demo_6', 'cp_demo_7', 'cp_demo_8', 'cp_demo_9'].forEach(id => { out[id] ||= fresh[id]; });
  return out;
}

// The monthly figure "complaints" of the dashboard (1.1) for the fictitious company: what tool 2.3 counts, so that both agree.
// A month the company has typed itself (a value different from the one first given to the example) is left alone.
const FIRST_VALUES = [0, 1, 0, 0, 2, 1, 0, 0, 0, 0, 1, 0];   // January to December, as first written in the example
export function alignComplaintValues(s: { complaints: Record<string, Complaint>; kpis: State['kpis']; values: State['values']; timeline?: State['timeline'] }, force = false): State['values'] {
  const kpi = s.kpis?.kpi_reclamations || Object.values(s.kpis || {}).find(k => k.role === 'reclamations');
  if (!kpi || !s.timeline) return s.values;
  const mine = { ...(s.values?.[kpi.id] || {}) };
  for (let p = s.timeline.start; p <= s.timeline.end; p = addMonths(p, 1)) {
    const typed = mine[p];
    if (force || typed === undefined || typed === FIRST_VALUES[+p.slice(5, 7) - 1]) mine[p] = Object.values(s.complaints).filter(c => c.at.slice(0, 7) === p).length;
  }
  return { ...s.values, [kpi.id]: mine };
}

// The indicator "satisfied customers" of the dashboard (1.1) for the fictitious company, with a value for each closed month that has
// reviews, except the last closed month and the current one: those are left for the tool to propose at the closing (the figure is never
// written silently), so the example adds no alert to the dashboard. A month the company has typed itself is left alone.
export function addSatisfactionExample(d: Pick<State, 'kpis' | 'processes' | 'values' | 'feedbacks' | 'params' | 'timeline'>, today = new Date()) {
  const id = addSatisfactionKpi(d), mine = { ...(d.values[id] || {}) }, before = addMonths(periodOfDate(today), -1);
  for (let p = d.timeline.start; p <= d.timeline.end && p < before; p = addMonths(p, 1)) { const v = feedbackMonthPct(d, p); if (mine[p] === undefined && v !== null) mine[p] = v; }
  d.values = { ...d.values, [id]: mine };
}

// The same for the settings and figures of the fictitious company (only where the company has not set them)
export function completeCommercialExamples(s: { complaints: Record<string, Complaint>; params: Params; kpis?: State['kpis']; values?: State['values']; timeline?: State['timeline']; processes?: State['processes']; feedbacks?: State['feedbacks']; quotes?: State['quotes']; orgs?: State['orgs']; contacts?: State['contacts'] }, today = new Date()) {
  let complaints = completeComplaintExamples(s.complaints, today), params = s.params, values = s.values || {}, feedbacks = s.feedbacks, quotes = s.quotes, kpis = s.kpis, processes = s.processes, orgs = s.orgs, contacts = s.contacts;
  const demo = Object.values(s.complaints).some(c => c.id.startsWith('cp_demo_'));
  if (demo && Object.values(s.complaints).some(c => c.id.startsWith('cp_demo_') && c.atEdited === undefined)) {
    const ex = commercialExampleParams(today) as Record<string, unknown>, p = { ...params } as Record<string, unknown>;
    Object.keys(ex).filter(k => k !== 'exampleLevel').forEach(k => { if (p[k] === undefined) p[k] = ex[k]; });
    params = p as unknown as Params;
  }
  // twelve months of complaints for the trend chart, given once to a fictitious company saved before they existed
  const level = params.exampleLevel ?? 5;
  if (demo && level < 7) {
    complaints = { ...complaints };
    const fresh = Object.values(commercialExamples(today).complaints);
    if (level < 6) fresh.filter(c => c.id.startsWith('cp_demo_h')).forEach(c => { complaints[c.id] ||= c; });
    // a motive of complaint the fictitious company added itself, and the complaints that use it
    fresh.filter(c => c.id.startsWith('cp_demo_s')).forEach(c => { complaints[c.id] ||= c; });
    params = { ...params, exampleLevel: 7, motifs: params.motifs ?? (commercialExampleParams(today).motifs as Params['motifs']) };
    values = alignComplaintValues({ complaints, kpis: s.kpis || {}, values, timeline: s.timeline });
  }
  // level 8: twelve months of reviews (tool 2.4), the won quote they refer to, the review page, the satisfaction indicator of the dashboard.
  // Level 9: more reviews with the details given under a "no", two receptions without a review, the online form of the 3 questions.
  // Level 10: no invoice any more in the tool; a review of an unhappy customer is settled by a day or by a closed complaint.
  // Level 11: the directory (1.3) holds the customers of the reviews, with the people questioned (the view by customer of 2.4 opens them);
  // the two receptions without a review (dl_demo_7 and dl_demo_8) come with the orders of tool 3.4 (receptionsExamples.ts)
  if (demo && (params.exampleLevel ?? 5) < 11) {
    const fresh = commercialExamples(today);
    feedbacks = { ...(feedbacks || {}) };
    Object.values(fresh.feedbacks).forEach(f => { feedbacks![f.id] ||= f; });
    // the first two example reviews gain their links to the reception and the quote, unless the company edited them
    (['fb_demo_1', 'fb_demo_2'] as const).forEach(id => { const x = feedbacks![id], n = fresh.feedbacks[id]; if (x && x.deliveryId === undefined && x.quoteId === undefined) feedbacks![id] = { ...x, deliveryId: n.deliveryId, quoteId: n.quoteId }; });
    // the details under a "no" and the day it was settled are given to the example reviews that exist since level 8, only where the company left them empty
    Object.values(fresh.feedbacks).filter(n => Number(n.id.replace('fb_demo_', '')) <= 15).forEach(n => {
      const x = feedbacks![n.id];
      if (x) feedbacks![n.id] = { ...x, q1Detail: x.q1Detail ?? n.q1Detail, q2Detail: x.q2Detail ?? n.q2Detail, q3Detail: x.q3Detail ?? n.q3Detail, email: x.email ?? n.email, doubtSolvedAt: x.doubtSolvedAt || n.doubtSolvedAt };
    });
    quotes = { ...(quotes || {}) };
    quotes.qt_demo_7 ||= fresh.quotes.qt_demo_7;
    // the customers of the reviews in the directory: their organisation and the person questioned, unless the company already has them
    orgs = { ...(orgs || {}) };
    exampleOrgs().filter(o => ['org_demo_batipro', 'org_demo_morel', 'org_demo_perrin', 'org_demo_rey', 'org_demo_valmont'].includes(o.id)).forEach(o => { if (!orgOf({ orgs }, o.name)) orgs![o.id] ||= o; });
    contacts = { ...(contacts || {}) };
    exampleContacts(today).filter(c => c.id.startsWith('ct_demo_cl_')).forEach(c => {
      if (!Object.values(contacts!).some(x => x.category === 'client' && sameClient(x.company, c.company) && x.name.trim().toLowerCase() === c.name.trim().toLowerCase())) contacts![c.id] ||= c;
    });
    const ex = commercialExampleParams(today);
    params = { ...params, exampleLevel: 11, reviewLink: params.reviewLink ?? (ex.reviewLink as string) };
    if (kpis && processes && s.timeline) {
      const d = { kpis: { ...kpis }, processes: processes.map(p => ({ ...p, kpiIds: [...p.kpiIds] })), values, feedbacks, params, timeline: s.timeline };
      addSatisfactionExample(d, today);
      kpis = d.kpis; processes = d.processes; values = d.values;
    }
  }
  return { complaints, params, values, feedbacks, quotes, kpis, processes, orgs, contacts };
}

// Fills the tools 2.1, 2.3 and 2.4 with the examples when they are still empty; what the company typed is kept
export function applyCommercialExample(d: State, today = new Date()) {
  const ex = commercialExamples(today);
  (['quotes', 'complaints', 'feedbacks'] as const).forEach(k => { if (!Object.keys(d[k] || {}).length) Object.assign(d, { [k]: ex[k] }); });
}
