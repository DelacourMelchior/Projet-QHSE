// Tools 2.1, 2.3 and 2.4: feasibility and margin lock of a quote, customer complaints called back within 48 h,
// end-of-job flash review. Pure functions, covered by commercial.test.ts.
import type { Complaint, Delivery, Feedback, FollowUp, Kpi, Params, Period, Quote, State } from './types';
import { addDays, addWorkHours, daysBetween, hoursCost, nextRef, nowLocal, PROCESS_COLORS, PROCESS_IDS, defaultProcess, processLabel, sum, workHoursBetween, businessOf, type Business, type Insight } from './base';
import { addMonths, frDate, isoDate } from './periods';
import { orgKey } from './contacts';
import { formatValue } from './numbers';
import { counted, isPostponed, promisedOn, receptionsOf, reservesOf } from './receptions';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---- 2.1 the 5 locks, checked with the technical manager before the offer leaves
export const LOCKS = [
  { n: 1, label: 'Marge et acompte', point: 'Marge brute calculée, acompte prévu', ideas: ['Marge au-dessus du plancher', 'Acompte de 30 % écrit dans l\'offre', 'Solvabilité du client vérifiée', 'Clause de réception 95/5 dans les conditions générales jointes (outil 3.4)'] },
  { n: 2, label: 'Besoin client', point: 'Cahier des charges, plans et cotes sans ambiguïté', ideas: ['Tolérances écrites', 'Délai demandé réaliste', 'Interlocuteur technique identifié'] },
  { n: 3, label: 'Capacité et délai', point: 'Créneau atelier libre, matière et outillage disponibles', ideas: ['Machine goulet disponible', 'Outillage spécifique approvisionné', 'Sous-traitance réservée'] },
  { n: 4, label: 'Compétences', point: 'Personnes qualifiées présentes sur la période', ideas: ['Opérateur autonome sur le poste (outil 4.2)', 'Pas de congés bloquants'] },
  { n: 5, label: 'Qualité', point: 'Tolérances réalisables avec nos moyens de contrôle', ideas: ['Instrument de contrôle adapté', 'Certificats ou normes exigés connus'] },
];
export const LOCK_STATE = { ok: 'Conforme', reserve: 'Avec réserve', ko: 'Bloquant' } as const;

export const quoteCost = (q: Quote, p: Params): number | null => {
  const c = q.cost;
  if (!c || [c.material, c.hours, c.subcontract, c.other].every(v => v === null)) return null;
  return sum([c.material, c.subcontract, c.other]) + hoursCost(c.hours, p);
};
export function quoteMargin(q: Quote, p: Params): { value: number; pct: number } | null {
  const cost = quoteCost(q, p);
  if (cost === null || !q.amount) return null;
  return { value: q.amount - cost, pct: (q.amount - cost) / q.amount * 100 };
}
export const needsVisas = (q: Quote, p: Params) => (q.amount ?? 0) >= p.visaThreshold;

// What still stops the offer from leaving (empty = ready to send)
export function quoteIssues(q: Quote, p: Params, money = true): string[] {
  const out: string[] = [];
  q.locks.forEach((l, i) => { if (l.state === 'ko') out.push(`Verrou « ${LOCKS[i].label} » bloquant : ${l.note || LOCKS[i].label.toLowerCase()}`); });
  const unset = q.locks.filter(l => !l.state).length;
  if (unset) out.push(`${unset} verrou(s) à vérifier`);
  [2, 4].forEach(i => { const l = q.locks[i]; if (l?.state && !l.by?.trim()) out.push(`Verrou « ${LOCKS[i].label} » : vérifié avec qui ?`); });
  q.locks.forEach((l, i) => { if (l.state === 'reserve' && !l.note.trim()) out.push(`Réserve du verrou « ${LOCKS[i].label} » à écrire`); });
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

// ---- 2.3 complaints: written within the hour, customer called back within 48 h, cause qualified, courtesy call
export const CONTACT_HOURS = 48;
export const COURTESY_DAYS = 15;
export const LOG_HOURS = 1;     // written in the register within the hour
export const ACK_HOURS = 24;    // acknowledgement of receipt, unless the customer has been called by then
export type ComplaintState = 'to_contact' | 'late' | 'in_progress' | 'resolved' | 'unsatisfied' | 'closed';
export const COMPLAINT_STATE: Record<ComplaintState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_contact: { label: 'À recontacter sous 48 h', tone: 'warn' }, late: { label: 'Recontact en retard', tone: 'alert' },
  in_progress: { label: 'En traitement', tone: 'warn' }, resolved: { label: 'Appel de courtoisie à faire', tone: 'pending' },
  unsatisfied: { label: 'Client pas satisfait', tone: 'alert' }, closed: { label: 'Close', tone: 'ok' },
};
// Closed = courtesy call made and the customer satisfied or unreachable (a record closed before the answer was noted counts as satisfied),
// or closed by the management with a written reason
export const isClosed = (c: Pick<Complaint, 'courtesyAt' | 'satisfied' | 'forcedClose'>) => (!!c.courtesyAt && c.satisfied !== 'non') || !!c.forcedClose;
export function complaintState(c: Complaint, now = new Date(), business: Business = false): ComplaintState {
  if (c.forcedClose) return 'closed';
  if (c.courtesyAt) return c.satisfied === 'non' ? 'unsatisfied' : 'closed';
  if (c.contactedAt) return c.resolvedAt ? 'resolved' : 'in_progress';   // "settled" without the call-back is not settled: the 48 h still count
  return (workHoursBetween(c.at, now, business) ?? 0) >= CONTACT_HOURS ? 'late' : 'to_contact';
}
// How the customer is contacted again (each company has its habits) and what the check of the file concludes
export const CONTACT_VIA = { tel: 'Téléphone', mail: 'E-mail', site: 'Sur place', courrier: 'Courrier', sms: 'SMS ou messagerie', autre: 'Autre' } as const;
export const VERDICTS = { fondee: 'Justifiée', partielle: 'En partie justifiée', non_fondee: 'Non justifiée (à contester)' } as const;
// Only web addresses are opened from a pasted link
export const safeUrl = (u: string | undefined) => (/^https?:\/\/\S+$/i.test((u || '').trim()) ? u!.trim() : '');
// Points to check during the investigation: what the company promised, what was made and delivered, who did it.
// Each points to the process it would put in cause and to the tool that holds the evidence.
export interface InvestigationCheck { key: string; label: string; hint: string; process: string; tool?: string }
const pt = (key: string, label: string, hint: string, process: string, tool?: string): InvestigationCheck => ({ key, label, hint, process, tool });
// Industry and workshop (the default)
export const INVESTIGATION: InvestigationCheck[] = [
  pt('engagement', 'Ce qui a été promis au client', 'Devis ou commande signée, délai annoncé, compléments de commande', 'P2', '2.1'),
  pt('billing', 'Facture et conditions de paiement', 'Montant, acompte, conditions annoncées', 'P1'),
  pt('exchange', 'Échanges avec le client', 'E-mails, appels, bilan de fin d\'affaire', 'P2', '2.4'),
  pt('delivery', 'Livraison et réception', 'Bon de livraison, PV de réception, réserves signées', 'P3', '3.4'),
  pt('method', 'Instruction de poste', 'Mode opératoire à jour, bien suivi au poste concerné', 'P3', '3.2'),
  pt('equipment', 'Machine et outillage', 'Contrôle du lundi fait, anomalie ouverte, pièce d\'usure', 'P3', '3.3'),
  pt('supplier', 'Matière ou pièce du fournisseur', 'Lot reçu conforme, fiche de débit', 'P3', '3.1'),
  pt('people', 'Compétence de la personne concernée', 'Formation au poste, autorisation, arrivée récente', 'P4', '4.2'),
  pt('control', 'Contrôle avant expédition', 'Contrôle final fait, défauts mis au bac rouge', 'P5', '5.1'),
];
// Points of the models by business profile; "neutre" serves every other trade
export const INVESTIGATION_PRESETS: Record<string, InvestigationCheck[]> = {
  industrie: INVESTIGATION,
  btp: [
    pt('engagement', 'Ce qui a été promis au client', 'Devis, marché, planning annoncé, travaux supplémentaires acceptés', 'P2', '2.1'),
    pt('billing', 'Situation de travaux et facture', 'Avancement facturé, retenues, conditions de paiement', 'P1'),
    pt('exchange', 'Échanges avec le client', 'Comptes rendus de chantier, e-mails, appels, bilan de fin d\'affaire', 'P2', '2.4'),
    pt('delivery', 'Réception du chantier', 'PV de réception, réserves signées, levée des réserves', 'P3', '3.4'),
    pt('method', 'Mode opératoire et plans', 'Plans à jour sur le chantier, consignes suivies', 'P3', '3.2'),
    pt('equipment', 'Matériel et engins', 'Contrôle fait, anomalie ouverte', 'P3', '3.3'),
    pt('supplier', 'Matériaux et sous-traitants', 'Livraison conforme, travaux sous-traités', 'P3', '3.1'),
    pt('people', 'Compétence et habilitation de l\'équipe', 'Formation, habilitations, arrivée récente', 'P4', '4.2'),
    pt('control', 'Autocontrôle avant réception', 'Contrôle fait avant de demander la réception', 'P5', '5.1'),
  ],
  services: [
    pt('engagement', 'Ce qui a été vendu', 'Devis, contrat, cahier des charges, périmètre et délai annoncés', 'P2', '2.1'),
    pt('billing', 'Facture et conditions de paiement', 'Montant, acompte, jalons facturés', 'P1'),
    pt('exchange', 'Échanges avec le client', 'E-mails, comptes rendus, appels, bilan de fin de mission', 'P2', '2.4'),
    pt('delivery', 'Livrable remis', 'Version, date de remise, validation du client', 'P3', '3.4'),
    pt('method', 'Méthode suivie', 'Procédure ou trame utilisée, à jour', 'P3', '3.2'),
    pt('equipment', 'Outils, logiciels et accès', 'Outil disponible, accès ouverts, panne en cours', 'P3', '3.3'),
    pt('supplier', 'Sous-traitant ou partenaire', 'Prestation sous-traitée conforme', 'P3', '3.1'),
    pt('people', 'Compétence de l\'intervenant', 'Formation, expérience sur ce sujet, arrivée récente', 'P4', '4.2'),
    pt('control', 'Relecture avant remise', 'Second regard avant l\'envoi au client', 'P5'),
  ],
  neutre: [
    pt('engagement', 'Ce qui a été promis au client', 'Devis, commande, engagement de délai ou de qualité', 'P2', '2.1'),
    pt('billing', 'Facture et conditions de paiement', 'Montant, conditions annoncées', 'P1'),
    pt('exchange', 'Échanges avec le client', 'E-mails, appels, bilan de fin d\'affaire', 'P2', '2.4'),
    pt('delivery', 'Livraison ou prestation rendue', 'Bon de livraison, réception, réserves', 'P3', '3.4'),
    pt('method', 'Façon de faire', 'Procédure ou consigne à jour et suivie', 'P3', '3.2'),
    pt('supplier', 'Fournisseur ou sous-traitant', 'Produit ou prestation reçu conforme', 'P3', '3.1'),
    pt('people', 'Compétence de la personne concernée', 'Formation, autorisation, arrivée récente', 'P4', '4.2'),
    pt('control', 'Contrôle avant remise au client', 'Contrôle fait avant la livraison ou l\'envoi', 'P5'),
  ],
};
export const PRESET_LABEL: Record<string, string> = { industrie: 'industrie et atelier', btp: 'BTP et chantiers', services: 'services et conseil', neutre: 'autre secteur' };
export const presetKeyOf = (s: Pick<State, 'settings'>) => (INVESTIGATION_PRESETS[s.settings.profile] ? s.settings.profile : 'neutre');
// The points the company checks: its own list when it has edited it, else the model of its business profile
export const investigationOf = (s: Pick<State, 'settings' | 'params'>): InvestigationCheck[] => (s.params.investigation?.length ? s.params.investigation : INVESTIGATION_PRESETS[presetKeyOf(s)]);
// A tool without any record yet: the link of the investigation says so
export function toolEmpty(s: State, tool: string): boolean {
  const col: Record<string, object> = { '2.1': s.quotes, '2.4': s.feedbacks, '3.1': s.suppliers, '3.2': s.sops, '3.3': s.equipments, '3.4': s.deliveries, '4.2': s.skills, '5.1': s.ncs, '5.3': s.analyses };
  return !!col[tool] && !Object.keys(col[tool]).length;
}
export const hasChecks = (c: Complaint) => Object.values(c.checks || {}).some(x => x.state || x.note.trim());
// Motives of complaint: a neutral list that fits any trade, which each company edits in the settings of 2.3 (add, rename, retire).
// A motive keeps its key and its colour when renamed; a retired motive that complaints still use stays in the history and the chart.
export interface Motif { key: string; label: string; slot?: number; retired?: boolean }
export const DEFAULT_MOTIFS: Motif[] = [
  { key: 'delai', label: 'Délai ou rendez-vous non tenu', slot: 0 },
  { key: 'qualite', label: 'Qualité du produit ou du service', slot: 1 },
  { key: 'facture', label: 'Facture, prix ou paiement', slot: 2 },
  { key: 'comportement', label: 'Accueil, relation ou information', slot: 3 },
  { key: 'emballage', label: 'Livraison, remise ou emballage', slot: 4 },
];
export const MAX_MOTIFS = 8;
export const OTHER_MOTIF = 'autre';
export const motifsOf = (p: Pick<Params, 'motifs'>): Motif[] => (p.motifs?.length ? p.motifs : DEFAULT_MOTIFS);
export function motifLabel(p: Pick<Params, 'motifs'>, key: string | undefined): string {
  if (!key) return 'À classer';
  if (key === OTHER_MOTIF) return 'Autre';
  return motifsOf(p).find(m => m.key === key)?.label || DEFAULT_MOTIFS.find(m => m.key === key)?.label || 'Motif supprimé';
}
// Colours of the chart: the first slots of the categorical palette, then greys (other motives, unqualified, unjustified)
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const GREY = { other: '#9d9c95', light: '#c9c8c1', dark: '#6f6e69' };
export const freeSlot = (list: Motif[]) => SERIES_COLORS.findIndex((_, i) => !list.some(m => (m.slot ?? -1) === i));
// A motive removed from the list: erased when no complaint uses it, else retired (its label and colour stay for the history)
export const withoutMotif = (list: Motif[], key: string, used: boolean): Motif[] => (used ? list.map(m => (m.key === key ? { ...m, retired: true } : m)) : list.filter(m => m.key !== key));
// Back to the neutral list; the motives of the company that complaints still use stay as retired ones
export const resetMotifs = (list: Motif[], usedKeys: string[]): Motif[] => [
  ...DEFAULT_MOTIFS.map(m => ({ ...m })),
  ...list.filter(m => !DEFAULT_MOTIFS.some(d => d.key === m.key) && usedKeys.includes(m.key)).map(m => ({ ...m, retired: true })),
];
// Deliveries of the month: entered in the settings, else counted from tool 3.4: every delivery of an order dated in the month (the closed lots and the one
// under way, each once, archived orders included; a delivery that was refused, or put off by a blocking reservation, is not one received)
export const deliveriesCounted = (s: Pick<State, 'deliveries'>, period: string) =>
  Object.values(s.deliveries).reduce((n, d) => n + receptionsOf(d).filter(x => x.reception.date.slice(0, 7) === period && x.reception.result !== 'refus' && !isPostponed(x)).length, 0);
export const deliveriesOf = (s: State, period: string) => s.params.monthDeliveries?.[period] ?? deliveriesCounted(s, period);
// The number typed for a month, or back to the count of 3.4 (null: the typed number is removed; an emptied box never writes 0)
export function setMonthDeliveries(d: Pick<State, 'params'>, period: string, v: number | null) {
  const m = { ...(d.params.monthDeliveries || {}) };
  if (v === null) delete m[period]; else m[period] = v;
  d.params.monthDeliveries = m;
}
// Letters to the customer: acknowledgement, answer to an unfounded complaint, closing
export function complaintLetter(c: Complaint, kind: 'ack' | 'contest' | 'close', company: string, business = false): string {
  const day = `${c.at.slice(8, 10)}/${c.at.slice(5, 7)}`;
  if (kind === 'ack') return `Bonjour, nous avons bien reçu votre réclamation du ${day} concernant ${c.affaire || 'votre commande'} : « ${c.description} ». ${c.pilot || 'Notre responsable'} la prend en charge et vous recontacte sous ${business ? '2 jours ouvrés' : '48 heures'} avec une solution. Merci de votre confiance. ${company}`.trim();
  if (kind === 'contest') return `Bonjour, nous avons examiné votre réclamation du ${day} concernant ${c.affaire || 'votre commande'} : « ${c.description} ». Après vérification, nous ne pouvons pas y donner suite : ${c.defense?.trim() || '[à compléter : les faits et les pièces qui le montrent]'}. Nous restons à votre disposition pour en parler. ${company}`.trim();
  return `Bonjour, suite à votre réclamation concernant ${c.affaire || 'votre commande'} et après vérification de notre côté, voici la solution retenue : ${c.solution?.trim() || c.immediate || 'le problème est traité'}. Nous avons aussi identifié la cause et pris les mesures pour que cela ne se reproduise pas. N'hésitez pas à nous dire si tout est en ordre. ${company}`.trim();
}
// Hours between reception and the first contact; working hours when the company counts them so
export const contactDelay = (c: Complaint, business: Business = false) => (c.contactedAt ? workHoursBetween(c.at, c.contactedAt, business) : null);
export const contactDeadline = (c: Complaint, business: Business = false) => addWorkHours(c.at, CONTACT_HOURS, business);
export const courtesyDue = (c: Complaint) => (c.resolvedAt ? addDays(c.resolvedAt, COURTESY_DAYS) : '');
// Direct costs and hours spent, at the hourly cost (same reading as the red bin, 5.1)
export const complaintDirect = (c: Complaint) => sum([c.cost, c.credit, c.logistics, c.rework]);
export const complaintCost = (c: Complaint, p: Params) => complaintDirect(c) + hoursCost(c.hours, p);
// The management approves a credit above the limit, and (if the company wants it) every answer "unjustified"
export const needsApproval = (c: Complaint, p: Pick<Params, 'creditLimit' | 'approveContest'>) => (!!p.creditLimit && complaintDirect(c) > p.creditLimit) || (!!p.approveContest && c.verdict === 'non_fondee');
export const directorName = (s: Pick<State, 'contacts' | 'params'>) => (s.params.directorId ? s.contacts[s.params.directorId]?.name || '' : '');
export const isBlocked = (c: Complaint) => !!c.blockedInvoice && !c.unblockedAt && !isClosed(c);
// Who is told when the call-back is late: the backup of the pilot in the call chain of the directory, else the head of the company
export function escalationOf(s: Pick<State, 'contacts' | 'params'>, c: Complaint): string {
  const who = (c.pilot || c.receivedBy).trim().toLowerCase();
  const me = who ? Object.values(s.contacts).find(x => x.name.trim().toLowerCase() === who) : undefined;
  const boss = (me?.backupId && s.contacts[me.backupId]) || (s.params.directorId ? s.contacts[s.params.directorId] : undefined);
  return boss && boss.name.trim().toLowerCase() !== who ? boss.name : '';
}
// A person is on planned leave that day (staff list of tools 4.x)
export const isAbsent = (s: Pick<State, 'people'>, name: string, day: string) => {
  const n = name.trim().toLowerCase();
  return !!n && Object.values(s.people || {}).some(p => p.active && p.name.trim().toLowerCase() === n && (p.absences || []).some(a => a.from <= day && day <= a.to));
};
// Who handles the next step today: the pilot, or the escalation contact when the pilot is on leave
export function ownerToday(s: Pick<State, 'people' | 'contacts' | 'params'>, c: Complaint, day: string) {
  const who = c.pilot || c.receivedBy, absent = isAbsent(s, who, day);
  return { who: absent ? escalationOf(s, c) || who : who, absent };
}
// What is still missing before a complaint can be closed: contacted, motive classed, investigation concluded
// (founded: origin, cause and measure; unfounded: the arguments), customer satisfied
export function closeBlockers(c: Complaint, hasAction = false, p?: Pick<Params, 'creditLimit' | 'approveContest'>): string[] {
  const out: string[] = [];
  if (!c.contactedAt) out.push('recontacter le client (date du contact)');
  if (!c.category) out.push('classer le motif');
  else if (c.category === 'autre' && !c.categoryOther?.trim()) out.push('préciser le motif « autre »');
  if (!c.findings?.trim() && !hasChecks(c)) out.push('documenter l\'enquête (constats ou points vérifiés)');
  if (!c.verdict) out.push('conclure l\'enquête (réclamation justifiée ou non)');
  else if (c.verdict === 'non_fondee') { if (!c.defense?.trim()) out.push('écrire les arguments pour contester'); }
  else {
    if (!c.processId) out.push('qualifier le processus en cause');
    if (!c.cause?.trim() && !c.analysisId) out.push('noter la cause trouvée');
    if (c.severity === 'majeure' && !c.analysisId) out.push('ouvrir l\'atelier 5 Pourquoi (gravité majeure)');
    if (!c.correction?.trim() && !c.ncId && !c.analysisId && !hasAction) out.push('écrire la mesure pour que cela ne se reproduise pas (ou créer l\'action, ou ouvrir la fiche du bac rouge)');
  }
  if (c.blockedInvoice && !c.unblockedAt) out.push('saisir la date de déblocage de la facture');
  if (p && needsApproval(c, p) && !c.approval?.by) out.push('obtenir la validation de la direction');
  if (!c.resultSentAt) out.push('informer le client du résultat de l\'enquête');
  if (!c.satisfied) out.push('noter si le client est satisfait');
  else if (c.satisfied === 'injoignable' && !c.courtesyNote?.trim()) out.push('noter les tentatives faites pour joindre le client');
  return out;
}
// A customer is recognised by the words of its name (orgKey), as in 1.3, 2.4 and 3.4: "Client A" is "Client A (grand compte)". An order that holds its organisation of the
// directory (1.3) belongs to it whatever the name was when the order was typed: renaming the organisation there keeps its orders.
export function clientOrders(s: Pick<State, 'deliveries'> & Partial<Pick<State, 'orgs'>>, name: string, orgId?: string): Delivery[] {
  const nameOf = (id?: string) => (id && s.orgs && Object.hasOwn(s.orgs, id) ? orgKey(s.orgs[id].name) : '');
  const keys = [orgKey(name), nameOf(orgId)].filter(Boolean);
  return Object.values(s.deliveries).filter(d => (!!orgId && d.orgId === orgId) || [orgKey(d.client), nameOf(d.orgId)].some(k => !!k && keys.includes(k)));
}
// Records of the customer in the other tools, to consult during the investigation (quotes, acceptance reports, red bin, end-of-job reviews)
export interface ClientFile { tool: '2.1' | '2.4' | '3.4' | '5.1'; id: string; label: string }
export function clientFiles(s: State, c: Complaint): ClientFile[] {
  const k = orgKey(c.client);
  if (!k) return [];
  const same = (name: string) => orgKey(name) === k;
  // the red bin writes the customer inside a free text: match the whole words of the name, not a few letters of another word
  const named = (text: string) => ` ${text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `.includes(` ${k} `);
  const newest = <T extends { id: string }>(xs: T[], date: (x: T) => string) => xs.sort((a, b) => (date(a) < date(b) ? 1 : -1)).slice(0, 3);
  return [
    ...newest(Object.values(s.quotes).filter(q => same(q.client)), q => q.date).map(q => ({ tool: '2.1' as const, id: q.id, label: `Devis ${q.ref} · ${q.object}` })),
    ...newest(clientOrders(s, c.client), receivedOn).map(x => ({ tool: '3.4' as const, id: x.id, label: `Réception ${x.ref} · ${x.item}` })),
    ...newest(Object.values(s.ncs).filter(n => n.id !== c.ncId && named(n.item)), n => n.at).map(n => ({ tool: '5.1' as const, id: n.id, label: `Bac rouge ${n.ref} · ${n.description}` })),
    ...newest(Object.values(s.feedbacks).filter(f => same(f.client)), f => f.date).map(f => ({ tool: '2.4' as const, id: f.id, label: `Bilan de fin · ${f.affaire || f.date}` })),
  ];
}
// The order of 3.4 a complaint is about: the one the person chose in the list of the customer's orders, never one guessed from a text (none chosen: none cited)
export const complaintDelivery = (s: Pick<State, 'deliveries'>, c: Pick<Complaint, 'deliveryId'>): Delivery | undefined => (c.deliveryId && Object.hasOwn(s.deliveries, c.deliveryId) ? s.deliveries[c.deliveryId] : undefined);
// What the person chooses from: every order of the customer (archived ones too, the one received last first), and the chosen one when it is another customer's after an edit of the name
export function complaintChoices(s: Pick<State, 'deliveries'> & Partial<Pick<State, 'orgs'>>, c: Pick<Complaint, 'client' | 'deliveryId'>): Delivery[] {
  const own = clientOrders(s, c.client).sort((a, b) => (receivedOn(a) < receivedOn(b) ? 1 : receivedOn(a) > receivedOn(b) ? -1 : a.ref.localeCompare(b.ref, 'fr', { numeric: true })));
  const chosen = complaintDelivery(s, c);
  return chosen && !own.includes(chosen) ? [...own, chosen] : own;
}
// The same cause coming back: other complaints of the same process and motive in the last twelve months
export function similarComplaints(s: Pick<State, 'complaints'>, c: Complaint, now = new Date()): Complaint[] {
  if (!c.processId || !c.category) return [];
  return Object.values(s.complaints).filter(x => x.id !== c.id && x.verdict !== 'non_fondee' && x.processId === c.processId && x.category === c.category && (daysBetween(x.at.slice(0, 10), now) ?? 9999) <= 365)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
// Personal data of a closed complaint erased; what serves the statistics (dates, process, motive, costs) is kept
export const anonymize = (c: Complaint, today = new Date()): Complaint => ({
  ...c, client: 'Client anonymisé', affaire: '', message: '', email: '', mailLink: '', photo: undefined, ackLink: '', resultLink: '', letters: undefined, courtesyNote: '', contactViaNote: '', resultViaNote: '', immediate: '', anonymizedAt: isoDate(today),
});
export const RETENTION_DEFAULT = 5;
export const closedOn = (c: Complaint) => c.forcedClose?.at.slice(0, 10) || c.courtesyAt;
export const dueForAnonymizing = (s: Pick<State, 'complaints' | 'params'>, now = new Date()) =>
  Object.values(s.complaints).filter(c => isClosed(c) && !c.anonymizedAt && (daysBetween(closedOn(c), now) ?? 0) > (s.params.retentionYears ?? RETENTION_DEFAULT) * 365);
export const newComplaint = (s: State, receivedBy = '', now = new Date()): Complaint => ({
  id: uid('cp'), ref: nextRef('R', Object.values(s.complaints), now), at: nowLocal(now), client: '', affaire: '', channel: '', receivedBy, description: '',
  severity: 'mineure', processId: '', contactedAt: '', immediate: '', pilot: '', cost: null, resolvedAt: '', courtesyAt: '', loggedAt: nowLocal(now), ackAt: '',
});
// Share (%) of a list satisfying a test; null when the list is empty
const pct = <T,>(xs: T[], ok: (x: T) => boolean) => (xs.length ? Math.round(xs.filter(ok).length / xs.length * 100) : null);
export function complaintStats(s: State, period: string, now = new Date()) {
  const deliveries = deliveriesOf(s, period);
  const biz = businessOf(s.params);
  const cs = Object.values(s.complaints).filter(c => c.at.slice(0, 7) === period);
  const delays = cs.map(c => contactDelay(c, biz)).filter((d): d is number => d !== null);
  const byProcess = PROCESS_IDS.map(p => ({ p, n: cs.filter(c => c.processId === p).length })).sort((a, b) => b.n - a.n);
  const age = (c: Complaint) => workHoursBetween(c.at, now, biz) ?? 0;
  return {
    count: cs.length, cost: sum(cs.map(c => complaintCost(c, s.params))),
    avgDelay: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    // only complaints already called back, or whose 48 h have passed
    within48Pct: pct(cs.filter(c => c.contactedAt || age(c) >= CONTACT_HOURS), c => (contactDelay(c, biz) ?? Infinity) <= CONTACT_HOURS),
    top: byProcess[0]?.n ? byProcess[0] : null,
    deliveries, ratePct: deliveries ? cs.length / deliveries * 100 : null,
    blocked: sum(Object.values(s.complaints).filter(isBlocked).map(c => c.blockedInvoice)),
    byCategory: [...new Set(cs.map(c => c.category).filter((k): k is string => !!k))].map(k => ({ key: k, label: motifLabel(s.params, k), n: cs.filter(c => c.category === k).length })).sort((a, b) => b.n - a.n),
    // how the method is kept: written within the hour, acknowledged, customer satisfied at the courtesy call
    loggedPct: pct(cs.filter(c => c.loggedAt), c => (workHoursBetween(c.at, c.loggedAt!, biz) ?? 0) <= LOG_HOURS),
    ackPct: pct(cs.filter(c => c.ackAt || age(c) >= ACK_HOURS), c => !!c.ackAt),
    satisfiedPct: pct(cs.filter(c => c.satisfied === 'oui' || c.satisfied === 'non'), c => c.satisfied === 'oui'),
    unreachable: cs.filter(c => c.satisfied === 'injoignable').length, forced: cs.filter(c => c.forcedClose).length, edited: cs.filter(c => c.atEdited).length,
    reopened: cs.filter(c => c.rounds?.length).length,
    // result of the investigation
    grounded: { yes: cs.filter(c => c.verdict === 'fondee' || c.verdict === 'partielle').length, no: cs.filter(c => c.verdict === 'non_fondee').length, open: cs.filter(c => !c.verdict).length },
  };
}
// The dashboard indicator that counts complaints: tool 2.3 draws its trend chart next to it
export const isComplaintKpi = (k: Kpi) => k.role === 'reclamations' || k.id === 'kpi_reclamations';
// Complaints per month over the last twelve months, split by motive or by the process at the origin: the trend chart of 2.3 and 1.1
export type TrendBy = 'motif' | 'origine';
export const trendSeries = (by: TrendBy, p: Pick<Params, 'motifs'> = {}): { key: string; label: string; color: string }[] => (by === 'motif'
  ? [...motifsOf(p).map((m, i) => ({ key: m.key, label: m.label, color: SERIES_COLORS[m.slot ?? i] || GREY.other })), { key: OTHER_MOTIF, label: 'Autre ou à classer', color: GREY.other }]
  : [...PROCESS_IDS.map((id, i) => ({ key: id, label: processLabel(id), color: PROCESS_COLORS[id] || SERIES_COLORS[i % SERIES_COLORS.length] })), { key: 'a_qualifier', label: 'Origine à qualifier', color: GREY.light }, { key: 'non_justifiee', label: 'Réclamation non justifiée', color: GREY.dark }]);
export function complaintTrend(s: Pick<State, 'complaints'> & { params?: Params }, end: string, by: TrendBy, months = 12) {
  const periods = Array.from({ length: months }, (_, i) => addMonths(end, i - (months - 1)));
  const known = new Set(trendSeries('motif', s.params || {}).map(x => x.key));
  const keyOf = (c: Complaint) => (by === 'motif' ? (c.category && known.has(c.category) ? c.category : OTHER_MOTIF) : c.verdict === 'non_fondee' ? 'non_justifiee' : c.processId || 'a_qualifier');
  const rows = periods.map(period => ({ period, total: 0, parts: {} as Record<string, number> }));
  Object.values(s.complaints).forEach(c => {
    const row = rows.find(r => r.period === c.at.slice(0, 7));
    if (!row) return;
    const k = keyOf(c);
    row.total++; row.parts[k] = (row.parts[k] || 0) + 1;
  });
  const series = trendSeries(by, s.params || {}).map(x => ({ ...x, total: rows.reduce((a, r) => a + (r.parts[x.key] || 0), 0) })).filter(x => x.total > 0);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const top = series.slice().sort((a, b) => b.total - a.total)[0] || null;
  const last3 = rows.slice(-3).reduce((a, r) => a + r.total, 0), before3 = rows.slice(-6, -3).reduce((a, r) => a + r.total, 0);
  return { periods, rows, series, total, top, last3, before3, changePct: before3 ? Math.round((last3 - before3) / before3 * 100) : null };
}
export function complaintInsights(s: State, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const cs = Object.values(s.complaints);
  const biz = businessOf(s.params);
  const late = cs.filter(c => complaintState(c, now, biz) === 'late');
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Client pas recontacté sous 48 h', text: `${names(late, c => `${c.ref} (${c.client})`)} : contacter le client aujourd'hui, écouter sans se justifier, proposer une solution. Prévenir : ${[...new Set(late.map(c => escalationOf(s, c) || 'la direction'))].join(', ')}` });
  const unsat = cs.filter(c => complaintState(c, now, biz) === 'unsatisfied');
  if (unsat.length) out.push({ key: 'unsat', tone: 'bad', title: 'Client pas satisfait à l\'appel de courtoisie', text: `${names(unsat, c => `${c.ref} (${c.client})`)} : rouvrir la réclamation et proposer une autre solution.` });
  const soon = cs.filter(c => complaintState(c, now, biz) === 'to_contact');
  // third complaint of the same customer within 6 months
  const since = isoDate(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()));
  const byClient: Record<string, number> = {};
  cs.filter(c => c.at.slice(0, 10) >= since).forEach(c => { const k = c.client.trim().toLowerCase(); if (k) byClient[k] = (byClient[k] || 0) + 1; });
  const repeat = Object.entries(byClient).filter(([, n]) => n >= 3);
  if (repeat.length) out.push({ key: 'repeat', tone: 'bad', title: 'Client qui réclame souvent', text: `${repeat.map(([k, n]) => `${cs.find(c => c.client.trim().toLowerCase() === k)!.client} (${n} en 6 mois)`).join(', ')} : rendez-vous de la direction avec ce client.` });
  const held = cs.filter(isBlocked);
  if (held.length) {
    const oldest = Math.max(...held.map(c => daysBetween(c.at.slice(0, 10), now) ?? 0));
    out.push({ key: 'blocked', tone: 'bad', title: 'Factures bloquées par des litiges', text: `${formatValue(sum(held.map(c => c.blockedInvoice)), '€')} retenus par des clients mécontents, le plus ancien depuis ${oldest} jours.` });
  }
  if (soon.length) out.push({ key: 'soon', tone: 'warn', title: 'À recontacter', text: `${names(soon, c => `${c.ref} (${c.client}, reçue le ${c.at.slice(8, 10)}/${c.at.slice(5, 7)})`)}.` });
  const noAck = cs.filter(c => !isClosed(c) && !c.ackAt && !c.contactedAt && (workHoursBetween(c.at, now, biz) ?? 0) >= ACK_HOURS);
  if (noAck.length) out.push({ key: 'ack', tone: 'warn', title: 'Accusé de réception pas envoyé', text: `${names(noAck, c => `${c.ref} (${c.client})`)} : le client n'a ni accusé ni appel depuis plus de ${ACK_HOURS} h.` });
  const toTell = cs.filter(c => c.verdict && !c.resultSentAt && !isClosed(c));
  if (toTell.length) out.push({ key: 'tell', tone: 'warn', title: 'Résultat de l\'enquête à communiquer', text: `${names(toTell, c => `${c.ref} (${c.client})`)} : informer le client du résultat et de la suite.` });
  const noPilot = cs.filter(c => !c.pilot.trim() && !isClosed(c));
  if (noPilot.length) out.push({ key: 'nopilot', tone: 'warn', title: 'Réclamation sans pilote', text: `${names(noPilot, c => `${c.ref} (${c.client})`)} : désigner un pilote, sinon personne n'est responsable de la suite.` });
  const toApprove = cs.filter(c => needsApproval(c, s.params) && !c.approval?.by && !isClosed(c));
  if (toApprove.length) out.push({ key: 'approval', tone: 'warn', title: 'Validation de la direction attendue', text: `${names(toApprove, c => `${c.ref} (${c.client})`)} : ${directorName(s) || 'la direction'} valide avant que le client soit informé du résultat.` });
  const since180 = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180));
  const groups: Record<string, Complaint[]> = {};
  cs.filter(c => c.processId && c.category && c.verdict !== 'non_fondee' && c.at.slice(0, 10) >= since180).forEach(c => { (groups[`${c.processId}|${c.category}`] ||= []).push(c); });
  const recurring = Object.entries(groups).filter(([, xs]) => xs.length >= 3);
  if (recurring.length) out.push({ key: 'recurring', tone: 'warn', title: 'Une cause revient', text: `${recurring.map(([k, xs]) => `${processLabel(k.split('|')[0])} · ${motifLabel(s.params, k.split('|')[1])} (${xs.length} en 6 mois)`).join(', ')} : ouvrir un atelier 5 Pourquoi (outil 5.3) pour traiter la cause commune.` });
  const old = dueForAnonymizing(s, now);
  if (old.length) out.push({ key: 'retention', tone: 'warn', title: 'Données de clients à anonymiser', text: `${old.length} fiche(s) close(s) depuis plus de ${s.params.retentionYears ?? RETENTION_DEFAULT} ans : effacer les données personnelles du client (adresse e-mail, messages, photo).` });
  const unq = cs.filter(c => !c.processId && c.verdict !== 'non_fondee' && !isClosed(c));
  if (unq.length) out.push({ key: 'unq', tone: 'warn', title: 'Processus en cause à qualifier', text: `${names(unq, c => c.ref)} : sans processus d'origine, la cause ne sera pas traitée.` });
  const major = cs.filter(c => c.severity === 'majeure' && !c.analysisId && c.verdict !== 'non_fondee' && !isClosed(c));
  if (major.length) out.push({ key: '5p', tone: 'warn', title: 'Réclamation majeure sans analyse', text: `${names(major, c => c.ref)} : ouvrir un atelier 5 Pourquoi (outil 5.3).` });
  const courtesy = cs.filter(c => complaintState(c, now, biz) === 'resolved' && (daysBetween(courtesyDue(c), now) ?? -1) >= 0);
  if (courtesy.length) out.push({ key: 'courtesy', tone: 'warn', title: 'Appel de courtoisie à J+15', text: `${names(courtesy, c => `${c.ref} (${c.client})`)} : vérifier que le client est satisfait, puis clore.` });
  return out;
}

// ---- 2.4 end-of-job review: 3 questions to the customer at the end of the job, to measure his satisfaction and whether he recommends us
export const questionsOf = (p: Params) => [0, 1, 2].map(i => p.questions?.[i]?.trim() || QUESTIONS[i]);
export const QUESTIONS = [
  'Le livrable répond-il exactement à votre cahier des charges ?',
  'La livraison et les délais ont-ils été respectés comme convenu ?',
  'Sur une échelle de 0 à 10, à combien êtes-vous satisfait de ce qui vous a été livré ? (0 : très bas, 10 : très haut)',
];
// Two settings of the tool: the highest note of an unhappy customer, the share of satisfied customers the company aims for
export const UNHAPPY_MAX_DEFAULT = 6, SATISFACTION_TARGET_DEFAULT = 90;
export const satisfactionTargetOf = (p?: Pick<Params, 'satisfactionTarget'>) => p?.satisfactionTarget ?? SATISFACTION_TARGET_DEFAULT;
export const unhappyMaxOf = (p?: Pick<Params, 'unhappyMax'>) => p?.unhappyMax ?? UNHAPPY_MAX_DEFAULT;
export const isNegative = (f: Feedback, p?: Pick<Params, 'unhappyMax'>) => f.q1 === false || f.q2 === false || (f.q3 !== null && f.q3 <= unhappyMaxOf(p));
export type FeedbackState = 'to_ask' | 'unhappy' | 'settled' | 'satisfied';
export const FEEDBACK_STATE: Record<FeedbackState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_ask: { label: 'Questions à poser', tone: 'pending' }, unhappy: { label: 'Insatisfaction à traiter', tone: 'alert' },
  settled: { label: 'Insatisfaction réglée', tone: 'ok' }, satisfied: { label: 'Client satisfait', tone: 'ok' },
};
// A dissatisfied customer ("no" or a low note) is handled: either the point is settled with him (the day is noted), or it becomes a
// complaint (2.3) and the review stays open until the complaint is closed
export function feedbackState(f: Feedback, s?: Pick<State, 'complaints'> & Partial<Pick<State, 'params'>>): FeedbackState {
  if (f.q1 === null || f.q2 === null || f.q3 === null) return 'to_ask';
  if (!isNegative(f, s?.params)) return 'satisfied';
  return f.doubtSolvedAt || (f.complaintId && s?.complaints[f.complaintId] && isClosed(s.complaints[f.complaintId])) ? 'settled' : 'unhappy';
}
// What the customer said was wrong, question by question (a detail only counts for its own negative answer), then the old reservation
export const detailsOf = (f: Feedback, p?: Pick<Params, 'unhappyMax'>): string[] => [
  f.q1 === false ? f.q1Detail : '', f.q2 === false ? f.q2Detail : '', f.q3 !== null && f.q3 <= unhappyMaxOf(p) ? f.q3Detail : '', f.doubt,
].map(x => (x || '').trim()).filter(Boolean);
// What was asked of a customer who recommends; the data saved before the choice only holds a yes (an online review)
export const FOLLOW_UP: Record<FollowUp, string> = { avis: 'Avis en ligne', contact: 'Mise en relation', temoignage: 'Témoignage', autre: 'Autre' };
export const followOf = (f: Feedback): FollowUp | '' => f.followUp ?? (f.reviewAsked ? 'avis' : '');
// Notes of the customers in three bands: unhappy (up to the threshold of the tool), very satisfied (9 and 10), the others
export const scoreMix = (scores: number[], p?: Pick<Params, 'unhappyMax'>) => {
  const max = unhappyMaxOf(p), low = scores.filter(v => v <= max).length, top = scores.filter(v => v >= 9 && v > max).length;
  return { top, mid: scores.length - low - top, low };
};
const round1 = (n: number) => Math.round(n * 10) / 10;
export const newFeedback = (today = new Date()): Feedback => ({
  id: uid('fb'), date: isoDate(today), client: '', affaire: '', contact: '', channel: 'site', q1: null, q2: null, q3: null,
  verbatim: '', doubt: '', doubtSolvedAt: '', reviewAsked: false,
});
// The last delivery of an order that was received (with or without reservation, not put off by a blocking one still open): the current one, else the last closed lot
const lastReceived = (d: Delivery) => receptionsOf(d).map(x => x.reception).filter(counted).pop();
export const receivedOn = (d: Delivery) => lastReceived(d)?.date ?? '';
// The review of a delivery received in 3.4: client, order, person who received (with the directory card and e-mail when 3.4 has them) and date come from the record
export const feedbackFromDelivery = (d: Delivery, today = new Date()): Feedback => {
  const re = lastReceived(d) ?? d.reception, email = re.email?.trim();
  return {
    ...newFeedback(today), deliveryId: d.id, quoteId: d.quoteId, client: d.client, affaire: d.ref || d.item, contact: re.name, date: re.date || isoDate(today),
    ...(email ? { email } : {}), ...((re.orgId ?? d.orgId) ? { orgId: re.orgId ?? d.orgId } : {}), ...((re.contactId ?? d.contactId) ? { contactId: re.contactId ?? d.contactId } : {}),
  };
};
// The review of an order: the one already made for it, else a new one made from the order. An address or a button used twice (a second device, a link kept) never makes two.
export const feedbackOfDelivery = (s: Pick<State, 'feedbacks'>, d: Delivery, today = new Date()): { f: Feedback; isNew: boolean } => {
  const have = Object.values(s.feedbacks).find(f => f.deliveryId === d.id);
  return have ? { f: have, isNew: false } : { f: feedbackFromDelivery(d, today), isNew: true };
};
// "PV n° PV-2026-014 du 04/10/2026 : sans réserve" (a fact for a complaint): the last delivery of the order that has an outcome; '' before any
export function pvFact(d: Delivery): string {
  const x = receptionsOf(d).filter(y => y.reception.result).pop();
  if (!x) return '';
  const r = x.reception, n = r === d.reception ? reservesOf(d).length : r.reserves?.length ?? (r.reserve?.trim() ? 1 : 0), k = Math.max(1, n);
  const what = r.result === 'sans' ? 'sans réserve' : r.result === 'refus' ? 'livraison refusée' : `avec ${k} réserve${k > 1 ? 's' : ''}`;
  return `${r.pvNo ? `PV n° ${r.pvNo}` : 'PV'}${r.date ? ` du ${frDate(r.date)}` : ''} : ${what}`;
}
// Orders whose last delivery was received (in whole or in part) in the last two weeks and that have no review yet: the review is easy to forget, so the tool
// lists them. Not an archived order, not one whose last delivery was refused and not presented again, put off by a blocking reservation, nor one without an outcome.
// A review of the same customer within a week of the reception counts, even when typed by hand without the link.
export const FEEDBACK_WINDOW_DAYS = 14;
export function deliveriesToAsk(s: Pick<State, 'deliveries' | 'feedbacks'>, today = new Date()): Delivery[] {
  const since = addDays(isoDate(today), -FEEDBACK_WINDOW_DAYS), fbs = Object.values(s.feedbacks);
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return Object.values(s.deliveries)
    .filter(d => {
      const last = receptionsOf(d).map(x => x.reception).filter(r => r.result).pop();
      return !d.archivedAt && !!last && counted(last) && last.date >= since
        && !fbs.some(f => f.deliveryId === d.id || (same(f.client, d.client) && Math.abs(daysBetween(f.date, last.date) ?? 99) <= 7));
    })
    .sort((a, b) => (receivedOn(a) < receivedOn(b) ? 1 : -1));
}
// Answers pasted from Microsoft Forms or Excel (columns client, contact, q1, q2, q3, comment, date): one review per row. A row identical to
// one already in the register (same customer, date and answers: the same file pasted twice) is skipped.
const yesNo = (x: string) => (/^(oui|yes|o|1|vrai)/i.test(x.trim()) ? true : /^(non|no|n|0|faux)/i.test(x.trim()) ? false : null);
const dateOf = (x: string) => { const m = x.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}/.test(x.trim()) ? x.trim().slice(0, 10) : ''; };
export function importFeedbacks(rows: Record<string, string>[], existing: Feedback[], today = new Date()): { added: Feedback[]; duplicates: number } {
  const key = (f: Feedback) => [f.client.trim().toLowerCase(), f.date, f.q1, f.q2, f.q3, f.verbatim.trim()].join('|');
  const seen = new Set(existing.map(key)), added: Feedback[] = [];
  let duplicates = 0;
  rows.filter(r => r.client?.trim()).forEach(r => {
    const q3 = parseInt(r.q3, 10), f = newFeedback(today);
    const x: Feedback = { ...f, client: r.client.trim(), contact: r.contact || '', channel: 'mail', date: dateOf(r.date || '') || f.date, q1: yesNo(r.q1 || ''), q2: yesNo(r.q2 || ''), q3: Number.isFinite(q3) ? Math.max(0, Math.min(10, q3)) : null, verbatim: r.verbatim || '' };
    if (seen.has(key(x))) { duplicates++; return; }
    seen.add(key(x)); added.push(x);
  });
  return { added, duplicates };
}
export function reviewAskMessage(f: Feedback, company: string, link = ''): string {
  return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre note. Si vous avez 1 minute, votre avis nous aiderait beaucoup${link ? ` : ${link}` : ''}. ${company}`.trim();
}
export function reviewMessage(f: Feedback, company: string, p?: Params): string {
  if (p?.questions?.some(Boolean)) { const q = questionsOf(p); return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre confiance${f.affaire ? ` (affaire ${f.affaire})` : ''}. Trois questions : 1. ${q[0]} 2. ${q[1]} 3. ${q[2]} ${company || ''}`.trim(); }
  return `Bonjour${f.contact ? ` ${f.contact}` : ''}, merci pour votre confiance${f.affaire ? ` (affaire ${f.affaire})` : ''}. Trois questions, 45 secondes : 1. Le livrable répond-il à votre cahier des charges (oui / non) ? 2. Les délais ont-ils été respectés (oui / non) ? 3. De 0 (très bas) à 10 (très haut), à combien êtes-vous satisfait de ce qui vous a été livré ? ${company || ''}`.trim();
}
// The e-mail that asks the 3 questions: the model below until the company writes its own (tool settings).
// Tokens: {contact} {affaire} {entreprise} {questions}.
export const MAIL_SUBJECT_MODEL = 'Votre avis sur {affaire}';
export const MAIL_BODY_MODEL = `Bonjour {contact},

Merci pour votre confiance. Pour nous améliorer, trois questions, moins d'une minute :

{questions}

Il suffit de répondre directement à ce message.

Merci d'avance,
{entreprise}`;
export function feedbackMail(f: Feedback, company: string, p?: Pick<Params, 'questions' | 'mailSubject' | 'mailBody'>): { to: string; subject: string; body: string } {
  const q = [0, 1, 2].map(i => p?.questions?.[i]?.trim() || QUESTIONS[i]);
  const list = `1. ${q[0]} (oui / non)\n2. ${q[1]} (oui / non)\n3. ${q[2]}`;
  const fill = (t: string, affaire: string) => t
    .replace(/\{contact\}/g, f.contact.trim()).replace(/\{affaire\}/g, affaire).replace(/\{entreprise\}/g, company.trim()).replace(/\{questions\}/g, list)
    .replace(/ +([,.])/g, '$1').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { to: (f.email || '').trim(), subject: fill(p?.mailSubject?.trim() || MAIL_SUBJECT_MODEL, f.affaire.trim() || 'notre travail ensemble'), body: fill(p?.mailBody?.trim() || MAIL_BODY_MODEL, f.affaire.trim()) };
}
export function feedbackSummary(s: State, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const fs = Object.values(s.feedbacks).filter(f => f.date >= since);
  const complete = fs.filter(f => feedbackState(f) !== 'to_ask');
  const scores = complete.map(f => f.q3).filter((v): v is number => v !== null);
  const states = complete.map(f => feedbackState(f, s));
  return {
    count: fs.length, answers: complete.length, toAsk: fs.length - complete.length,
    avgScore: scores.length ? round1(sum(scores) / scores.length) : null, mix: scoreMix(scores, s.params),
    satisfiedPct: complete.length ? Math.round(complete.filter(f => !isNegative(f, s.params)).length / complete.length * 100) : null,
    unhappy: complete.filter(f => isNegative(f, s.params)).length, settled: states.filter(x => x === 'settled').length, open: states.filter(x => x === 'unhappy').length,
    noReview: deliveriesToAsk(s, today).length,
  };
}
// Reviews of one month for the heading of the list: how many, how many answered, share satisfied, average note
export function monthSummary(fs: Feedback[], p?: Pick<Params, 'unhappyMax'>) {
  const complete = fs.filter(f => feedbackState(f) !== 'to_ask');
  const scores = complete.map(f => f.q3).filter((v): v is number => v !== null);
  return { count: fs.length, answers: complete.length, satisfiedPct: complete.length ? Math.round(complete.filter(f => !isNegative(f, p)).length / complete.length * 100) : null, avg: scores.length ? round1(sum(scores) / scores.length) : null };
}
// Reviews and satisfaction per month over twelve months (month of delivery): the trend chart of 2.4
export function feedbackTrend(s: Pick<State, 'feedbacks'> & Partial<Pick<State, 'params'>>, end: Period, months = 12) {
  const periods = Array.from({ length: months }, (_, i) => addMonths(end, i - (months - 1)));
  const rows = periods.map(period => ({ period, total: 0, satisfied: 0, unhappy: 0, scores: [] as number[] }));
  Object.values(s.feedbacks).filter(f => feedbackState(f) !== 'to_ask').forEach(f => {
    const r = rows.find(x => x.period === f.date.slice(0, 7));
    if (!r) return;
    r.total++; if (isNegative(f, s.params)) r.unhappy++; else r.satisfied++;
    if (f.q3 !== null) r.scores.push(f.q3);
  });
  const out = rows.map(r => ({ ...r, pct: r.total ? Math.round(r.satisfied / r.total * 100) : null, avg: r.scores.length ? round1(sum(r.scores) / r.scores.length) : null }));
  const avgOf = (rs: typeof out) => { const sc = rs.flatMap(r => r.scores); return sc.length ? round1(sum(sc) / sc.length) : null; };
  return { periods, rows: out, total: sum(out.map(r => r.total)), last3: avgOf(out.slice(-3)), before3: avgOf(out.slice(-6, -3)) };
}
// The promised day of a review and the day it was delivered, said once for the sheet, the trend and (the same rules) the indicator of 3.4: the promised day of the order of 3.4
// when the review is linked to one (`promisedOn`: the day entered, else the quote), else of the quote of the review; the delivered day is the reception of the order
// (empty while it is not received), else the day of the review. null when nothing was promised.
export function promiseFact(s: State, f: Feedback): { promised: string; done: string; late: boolean } | null {
  const d = f.deliveryId && Object.hasOwn(s.deliveries, f.deliveryId) ? s.deliveries[f.deliveryId] : undefined;
  const promised = promisedOn(s, { promisedAt: d?.promisedAt, quoteId: d?.quoteId ?? f.quoteId });
  if (!promised) return null;
  const done = d ? receivedOn(d) : f.date;
  return { promised, done, late: !!done && done > promised };
}
// Why customers are not satisfied (12 months), and the delay promised (order of 3.4, else quote) against the delivery date and the customer's answer
export function feedbackCauses(s: State, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const fs = Object.values(s.feedbacks).filter(f => f.date >= since && feedbackState(f) !== 'to_ask');
  const q = questionsOf(s.params), max = unhappyMaxOf(s.params);
  const recent = (xs: Feedback[], text: (f: Feedback) => string | undefined) => xs.filter(f => text(f)?.trim()).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2).map(f => `${f.client} : ${text(f)!.trim()}`);
  const q1 = fs.filter(f => f.q1 === false), q2 = fs.filter(f => f.q2 === false), q3 = fs.filter(f => f.q3 !== null && f.q3 <= max), dbt = fs.filter(f => f.doubt.trim());
  const causes = [
    { key: 'q1', label: `« Non » à la question 1 : ${q[0]}`, n: q1.length, examples: recent(q1, f => f.q1Detail) },
    { key: 'q2', label: `« Non » à la question 2 : ${q[1]}`, n: q2.length, examples: recent(q2, f => f.q2Detail) },
    { key: 'q3', label: `Note de satisfaction de ${max} ou moins`, n: q3.length, examples: recent(q3, f => f.q3Detail) },
    { key: 'doubt', label: 'Réserve notée avant les précisions par question', n: dbt.length, examples: recent(dbt, f => f.doubt) },
  ];
  const linked = fs.flatMap(f => { const p = promiseFact(s, f); return p?.done ? [{ f, late: p.late }] : []; });
  return {
    total: fs.length, causes,
    promise: { linked: linked.length, late: linked.filter(x => x.late).length, lateNotNoticed: linked.filter(x => x.late && x.f.q2 === true).length, notLateYet: linked.filter(x => !x.late && x.f.q2 === false).length },
  };
}
// Share of the month's reviews without a negative answer or a low note, offered to the dashboard (1.1)
export function feedbackMonthPct(s: Pick<State, 'feedbacks'> & Partial<Pick<State, 'params'>>, p: Period): number | null {
  const fs = Object.values(s.feedbacks).filter(f => f.date.slice(0, 7) === p && feedbackState(f) !== 'to_ask');
  return fs.length ? Math.round(fs.filter(f => !isNegative(f, s.params)).length / fs.length * 100) : null;
}
export const isSatisfactionKpi = (k: Kpi) => k.role === 'satisfaction' || k.id === 'kpi_satisfaction';
// Adds the indicator "satisfied customers" to the dashboard (process P5, next to the complaints) for a company whose list of indicators
// was made before the indicator was part of the models; the models of the tool carry it from the start
export function addSatisfactionKpi(d: Pick<State, 'kpis' | 'processes'>, target = SATISFACTION_TARGET_DEFAULT): string {
  const have = Object.values(d.kpis).find(isSatisfactionKpi);
  if (have) return have.id;
  const id = 'kpi_satisfaction', pid = defaultProcess('P5', d.processes.map(x => x.id));
  d.kpis[id] = { id, role: 'satisfaction', name: 'Clients satisfaits à la livraison (%)', processId: pid, type: 'Vital', unit: '%', direction: 'higher', aggregation: 'avg', target: `≥ ${target} %`, targetValue: target, confidential: false, source: 'Bilans de fin d\'affaire (2.4)' };
  d.processes.find(p => p.id === pid)?.kpiIds.push(id);
  return id;
}
// The aim of the company (share of satisfied customers) is written in the settings and, in the same move, as the target of the indicator
// of the dashboard (1.1); an empty value brings back the default
export function setSatisfactionTarget(d: Pick<State, 'params' | 'kpis'>, value: number | null) {
  const t = value === null ? undefined : Math.max(1, Math.min(100, Math.round(value)));
  d.params.satisfactionTarget = t;
  const k = Object.values(d.kpis).find(isSatisfactionKpi);
  if (k) { k.targetValue = t ?? SATISFACTION_TARGET_DEFAULT; k.target = `≥ ${t ?? SATISFACTION_TARGET_DEFAULT} %`; }
}
export function feedbackInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const fs = Object.values(s.feedbacks);
  const byClient = (xs: Feedback[]) => xs.filter((f, i) => xs.findIndex(g => g.client === f.client) === i);   // a customer named once
  const neg = fs.filter(f => feedbackState(f, s) === 'unhappy');
  if (neg.length) out.push({ key: 'neg', tone: 'bad', title: 'Client insatisfait', text: `${names(byClient(neg), f => `${f.client}${detailsOf(f, s.params)[0] ? ` (${detailsOf(f, s.params)[0]})` : ''}`)} : régler le point avec le client et noter le jour, ou l'enregistrer comme réclamation (outil 2.3).` });
  const toAsk = deliveriesToAsk(s, today);
  if (toAsk.length) out.push({ key: 'toask', tone: 'warn', title: 'Livraison sans bilan', text: `${names(toAsk, d => `${d.client || 'client'} (${d.ref || d.item})`)} : reçue sans que les 3 questions aient été posées.` });
  const prom = fs.filter(f => (f.q3 ?? 0) >= 9 && !followOf(f));
  if (prom.length) out.push({ key: 'review', tone: 'good', title: 'Clients très satisfaits', text: `${names(byClient(prom), f => f.client)} : note de 9 ou 10, demander un avis, une mise en relation ou un témoignage.` });
  return out;
}
