// Tool 3.1 "Fournisseurs": evaluation and follow-up of the suppliers. Claims of the company to a supplier (the costed "fiche de débit" is
// their sheet) with their history per supplier, the yearly rating (quality, delays, service) and the links with the directory (1.3):
// a supplier is an organisation of the directory, its people are the contacts of that organisation. Pure functions, covered by suppliers.test.ts.
import type { ClaimSeverity, Contact, ContactCategory, Criterion, CriterionItem, Debit, Org, Params, RatingDecision, RatingItem, RatingScore, State, Supplier, SupplierCategory, SupplierRating, SupplierStatus } from './types';
import { businessOf, daysBetween, DEFAULT_PARAMS, hoursCost, newId, nextRef, sum, workHoursBetween, type Insight } from './base';
import { addMonths, isoDate, parseDate, periodOfDate } from './periods';
import { formatValue } from './numbers';
import { orgKey, orgOf, toCheck } from './contacts';
import { GREY, SERIES_COLORS, type Motif } from './commercial';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addMonthsIso = (iso: string, n: number) => { const d = parseDate(iso); return d ? isoDate(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())) : ''; };
const since12 = (today: Date) => isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));

// ---- settings of the tool (the company fills them once; what is left empty takes these defaults)
// The evaluation grid: quality, delays and service are calculated from the claims and the deliveries followed; price and every criterion the
// company adds are given by hand. Each criterion has its own scale (a note out of 10, 20 or 100) and a weight, applied afterwards to bring the
// notes back to one score out of 100. Each one also has items, the points to look at, that the company edits.
export const SCALES = [10, 20, 100];
// A fraction of a scale as a note: one decimal on 10 and 20, whole on 100
export const onScale = (fraction: number, scale: number) => (scale >= 100 ? Math.round(fraction * scale) : Math.round(fraction * scale * 10) / 10);
export const DEFAULT_ITEMS: Record<string, CriterionItem[]> = {
  quality: [
    { key: 'conformity', label: 'Conformité du produit ou de la prestation', hint: 'Respect de la commande, du cahier des charges, des spécifications' },
    { key: 'constancy', label: "Constance d'une livraison à l'autre", hint: 'Même niveau à chaque fois, pas de mauvaise surprise' },
    { key: 'nc', label: 'Traitement des non-conformités', hint: 'Rapidité et sérieux de la correction quand il y a un défaut' },
    { key: 'docs', label: 'Documents et traçabilité', hint: 'Certificats, rapports, factures et bons exacts' },
  ],
  delay: [
    { key: 'promised', label: 'Respect des dates promises' },
    { key: 'urgent', label: 'Réactivité sur les demandes urgentes' },
    { key: 'inform', label: 'Information en cas de retard', hint: 'Il prévient avant, il ne laisse pas deviner' },
    { key: 'reliable', label: 'Fiabilité du délai annoncé', hint: 'Les délais proposés sont tenables' },
  ],
  service: [
    { key: 'contact', label: 'Disponibilité et qualité de la relation' },
    { key: 'reply', label: 'Rapidité des réponses à nos demandes' },
    { key: 'claims', label: 'Traitement de nos réclamations' },
    { key: 'advice', label: 'Conseil et accompagnement', hint: 'Il propose, il alerte, il explique' },
  ],
  price: [
    { key: 'level', label: 'Niveau de prix comparé aux autres fournisseurs' },
    { key: 'stable', label: 'Stabilité des tarifs', hint: 'Pas de hausse sans prévenir' },
    { key: 'bill', label: 'Exactitude et clarté de la facturation' },
    { key: 'terms', label: 'Conditions de paiement et remises' },
  ],
};
export const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'quality', label: 'Qualité', weight: 35, scale: 10, auto: 'quality', items: DEFAULT_ITEMS.quality },
  { key: 'delay', label: 'Délais', weight: 25, scale: 10, auto: 'delay', items: DEFAULT_ITEMS.delay },
  { key: 'service', label: 'Service', weight: 20, scale: 10, auto: 'service', items: DEFAULT_ITEMS.service },
  { key: 'price', label: 'Prix', weight: 20, scale: 10, items: DEFAULT_ITEMS.price },
];
export const SUPPLIER_DEFAULTS = {
  sendDays: 2, followDays: 15, classA: 85, classB: 70, penaltyPct: [5, 12, 30] as [number, number, number], reviewMonths: 12, criticalMonths: 6, repeat: 3,
};
export const MAIL_SUBJECT = 'Réclamation {ref}';
export const MAIL_BODY = 'Bonjour {contact},\n\nNous avons constaté lors de la réception du {date}{bl}{commande} : {defaut}.\n{montant}Merci de nous indiquer la suite que vous donnez à cette réclamation sous 48 heures.\n\n{entreprise}';
// Levels offered to note a criterion or an item in one click: share of its scale
export const LEVELS: { label: string; pct: number }[] = [{ label: 'Très bien', pct: 100 }, { label: 'Bien', pct: 75 }, { label: 'Moyen', pct: 50 }, { label: 'Insuffisant', pct: 20 }];
export const PRICE_LEVELS: { label: string; pct: number }[] = [{ label: 'Très compétitif', pct: 100 }, { label: 'Dans la moyenne', pct: 70 }, { label: 'Plutôt cher', pct: 40 }, { label: 'Nettement trop cher', pct: 10 }];
export const levelsOf = (key: string) => (key === 'price' ? PRICE_LEVELS : LEVELS);
export const levelNote = (pct: number, scale: number) => onScale(pct / 100, scale);
export const newCriterion = (): Criterion => ({ key: newId('cr'), label: '', weight: 10, scale: 10, items: [] });
// A criterion as saved by older settings (weight in "points") or by the company, with what is missing filled
const normCriterion = (c: Criterion): Criterion => ({ ...c, weight: c.weight ?? c.points ?? 0, scale: c.scale ?? 10, items: c.items ?? DEFAULT_ITEMS[c.key] ?? [] });
export function supplierCfg(p: Pick<Params, 'supplier'>) {
  const c = p.supplier || {}, d = SUPPLIER_DEFAULTS;
  // settings made when the three criteria were fixed (quality, delays, service): they become the grid, without price
  const fromOld = c.max ? DEFAULT_CRITERIA.filter(x => x.auto).map((x, i) => ({ ...x, weight: c.max![i] })) : undefined;
  return {
    sendDays: c.sendDays ?? d.sendDays, followDays: c.followDays ?? d.followDays, criteria: ((c.criteria?.length ? c.criteria : fromOld) ?? DEFAULT_CRITERIA).map(normCriterion), classA: c.classA ?? d.classA, classB: c.classB ?? d.classB,
    penaltyPct: c.penaltyPct ?? d.penaltyPct, qualityFloor: c.qualityFloor, reviewMonths: c.reviewMonths ?? d.reviewMonths, criticalMonths: c.criticalMonths ?? d.criticalMonths, repeat: c.repeat ?? d.repeat,
    mailSubject: c.mailSubject?.trim() || MAIL_SUBJECT, mailBody: c.mailBody?.trim() || MAIL_BODY,
  };
}

// ---- words of the tool
// What a supplier is: goods (products, supplies, raw material) or services (any provision: transport, maintenance, advice, subcontracting…).
// The older four categories are still read: subcontracting and transport count as services.
export const isGoods = (c: SupplierCategory) => c === 'matiere';
export const categoryLabel = (c: SupplierCategory) => (isGoods(c) ? 'Biens' : 'Services');
// A supplier of goods is a "fournisseur" in the directory, a provider of services a "prestataire" (transport stays a "fournisseur", as before)
export const orgCategoryOf = (c: SupplierCategory): ContactCategory => (c === 'service' || c === 'soustraitance' ? 'prestataire' : 'fournisseur');
// The organisations of the directory that can be followed as suppliers
export const SUPPLIER_ORG_CATEGORIES: ContactCategory[] = ['fournisseur', 'prestataire', 'conseil'];

export const SUPPLIER_STATUS: Record<SupplierStatus, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  qualify: { label: 'À qualifier', tone: 'pending' }, listed: { label: 'Référencé', tone: 'ok' }, watch: { label: 'Sous surveillance', tone: 'warn' },
  suspended: { label: 'Suspendu', tone: 'alert' }, delisted: { label: 'Déréférencé', tone: 'pending' },
};
export const statusOf = (x: Supplier): SupplierStatus => x.status ?? 'listed';
// A suspended or delisted supplier is not rated any more and is not offered for a new claim
export const isFollowed = (x: Supplier) => !['suspended', 'delisted'].includes(statusOf(x));

export const SEVERITY: Record<ClaimSeverity, { label: string; hint: string }> = {
  minor: { label: 'Mineure', hint: 'gêne limitée, rattrapée sans conséquence' },
  major: { label: 'Majeure', hint: 'reprise, tri ou retard qui nous coûte' },
  critical: { label: 'Critique', hint: 'arrêt, sécurité ou client touché' },
};
export const SEVERITY_ORDER: ClaimSeverity[] = ['minor', 'major', 'critical'];
export const severityOf = (d: Pick<Debit, 'severity'>): ClaimSeverity => d.severity ?? 'major';

export const CLAIM_CHANNELS = { mail: 'E-mail', courrier: 'Courrier', tel: 'Téléphone', plateforme: 'Plateforme du fournisseur', main: 'En main propre', autre: 'Autre' } as const;
export const CLAIM_SOLUTIONS = { avoir: 'Avoir', remplacement: 'Remplacement', reprise: 'Reprise ou retouche chez le fournisseur', geste: 'Geste commercial', rien: 'Aucune suite', autre: 'Autre' } as const;
export const CLOSE_REASONS = { resolved: 'Réglé avec le fournisseur', nofollow: 'Sans suite de notre côté', accepted: 'Refus accepté', autre: 'Autre' } as const;
export const ANSWERS: Record<Debit['answer'], string> = { '': 'En attente', accepted: 'Reconnue', partial: 'Partiellement reconnue', contested: 'Contestée', refused: 'Refus définitif' };
export const DECISIONS: Record<Exclude<RatingDecision, ''>, string> = {
  keep: 'Maintenir tel quel', watch: 'Mettre sous surveillance', progress: 'Plan de progrès avec le fournisseur', second: 'Second fournisseur à référencer', delist: 'Arrêter de travailler avec lui', other: 'Autre',
};
// The status follows the decision of the rating (it can be changed afterwards)
export const statusAfter = (dec: RatingDecision | undefined, current: SupplierStatus): SupplierStatus =>
  dec === 'delist' ? 'delisted' : dec === 'watch' ? 'watch' : dec === 'keep' && (current === 'watch' || current === 'qualify') ? 'listed' : current;

// Motives of claim: a neutral list that fits any trade, edited by each company in the settings of 3.1 (add, rename, retire)
export const SUPPLIER_MOTIFS: Motif[] = [
  { key: 'produit', label: 'Produit ou prestation non conforme', slot: 0 },
  { key: 'retard', label: "Retard de livraison ou d'exécution", slot: 1 },
  { key: 'quantite', label: 'Quantité ou référence erronée', slot: 2 },
  { key: 'documents', label: 'Documents ou certificat manquants', slot: 3 },
  { key: 'transport', label: 'Livraison, transport ou emballage', slot: 4 },
  { key: 'relation', label: 'Service, information ou relation', slot: 5 },
];
export const OTHER_CLAIM_MOTIF = 'autre';
export const motifsOfClaims = (p: Pick<Params, 'supplier'>): Motif[] => (p.supplier?.motifs?.length ? p.supplier.motifs : SUPPLIER_MOTIFS);
export function claimMotifLabel(p: Pick<Params, 'supplier'>, d: Pick<Debit, 'motif' | 'motifNote'>): string {
  if (!d.motif) return 'À classer';
  if (d.motif === OTHER_CLAIM_MOTIF) return d.motifNote?.trim() ? `Autre : ${d.motifNote.trim()}` : 'Autre';
  return motifsOfClaims(p).find(m => m.key === d.motif)?.label || SUPPLIER_MOTIFS.find(m => m.key === d.motif)?.label || 'Motif supprimé';
}
export const resetClaimMotifs = (list: Motif[], usedKeys: string[]): Motif[] => [
  ...SUPPLIER_MOTIFS.map(m => ({ ...m })),
  ...list.filter(m => !SUPPLIER_MOTIFS.some(d => d.key === m.key) && usedKeys.includes(m.key)).map(m => ({ ...m, retired: true })),
];

// ---- ratings: yearly score out of 100 (quality, delays, service), class A, B or C
export type SupplierClass = 'A' | 'B' | 'C';
export const CLASS_INFO: Record<SupplierClass, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  A: { label: 'A · référent', tone: 'ok' }, B: { label: 'B · sous surveillance', tone: 'warn' }, C: { label: 'C · action requise', tone: 'alert' },
};
// The criteria of a rating as they were that day (the older ratings had three fixed ones)
export type RatingLike = Partial<Pick<SupplierRating, 'quality' | 'delay' | 'service' | 'scores' | 'max'>>;
export function ratingParts(r: RatingLike): (RatingScore & { weight: number })[] {
  const mx = r.max ?? [40, 40, 20];
  const parts: RatingScore[] = r.scores ?? [{ key: 'quality', label: 'Qualité', points: r.quality ?? null, max: mx[0] }, { key: 'delay', label: 'Délais', points: r.delay ?? null, max: mx[1] }, { key: 'service', label: 'Service', points: r.service ?? null, max: mx[2] }];
  return parts.map(p => ({ ...p, weight: p.weight ?? p.max }));
}
// A criterion left empty is not assessed: the score is the weighted mean of the notes given, brought back to 100 (the weight is applied afterwards,
// each note being first brought back to its own scale)
export function ratingScore(r: RatingLike): number {
  const done = ratingParts(r).filter(x => x.points !== null && x.points !== undefined && x.max > 0);
  const total = sum(done.map(x => x.weight));
  return total ? Math.round(sum(done.map(x => x.weight * (x.points as number) / x.max)) / total * 100) : 0;
}
// The note of a criterion from its items (their mean), null when none was given
export function itemsAverage(items: RatingItem[] | undefined, scale: number): number | null {
  const v = (items || []).map(i => i.points).filter((x): x is number => x !== null && x !== undefined);
  return v.length ? onScale(sum(v) / v.length / scale, scale) : null;
}
// Share of each criterion in the score (weights that sum to 100 %)
export const weightShares = (xs: { weight: number }[]) => { const t = sum(xs.map(x => x.weight)); return xs.map(x => (t ? Math.round(x.weight / t * 100) : 0)); };
export const classOf = (score: number, p: Pick<Params, 'supplier'> = {}): SupplierClass => { const c = supplierCfg(p); return score >= c.classA ? 'A' : score >= c.classB ? 'B' : 'C'; };
// The class of a rating: from its score, and no higher than B when the company asks for it and the quality points are too low
export function ratingClass(r: RatingLike, p: Pick<Params, 'supplier'> = {}): SupplierClass {
  const cls = classOf(ratingScore(r), p), floor = supplierCfg(p).qualityFloor, q = ratingParts(r).find(x => x.key === 'quality');
  return cls === 'A' && floor && q && q.points !== null && q.max > 0 && q.points / q.max * 100 < floor ? 'B' : cls;
}
const byDateDesc = (a: SupplierRating, b: SupplierRating) => (a.date < b.date ? 1 : -1);
export const lastRating = (sup: Supplier) => [...sup.ratings].sort(byDateDesc)[0];
export const classOfSupplier = (sup: Supplier, p: Pick<Params, 'supplier'> = {}): SupplierClass | null => { const r = lastRating(sup); return r ? ratingClass(r, p) : null; };
export const reviewEvery = (sup: Supplier, p: Pick<Params, 'supplier'> = {}) => { const c = supplierCfg(p); return sup.strategic ? c.criticalMonths : c.reviewMonths; };
export const nextReview = (sup: Supplier, p: Pick<Params, 'supplier'> = {}) => { const r = lastRating(sup); return r ? r.nextReview || addMonthsIso(r.date, reviewEvery(sup, p)) : ''; };
export const ratingDue = (sup: Supplier, today = new Date(), p: Pick<Params, 'supplier'> = {}) => isFollowed(sup) && (!lastRating(sup) || nextReview(sup, p) <= isoDate(today));
// Class lower than at the previous rating
export function classDrop(sup: Supplier, p: Pick<Params, 'supplier'> = {}): { from: SupplierClass; to: SupplierClass } | null {
  const rs = [...sup.ratings].sort(byDateDesc);
  if (rs.length < 2) return null;
  const from = ratingClass(rs[1], p), to = ratingClass(rs[0], p);
  return to > from ? { from, to } : null;
}

// ---- claims: amount, state, history
export const debitAmount = (d: Debit, p: Params) => hoursCost(d.reworkHours, p) + sum([d.otherCost]);
export const CLAIM_DAYS = 2;   // answer expected from the supplier within 48 h (printed on the sheet)
export type DebitState = 'to_send' | 'late' | 'waiting' | 'chase' | 'contested' | 'accepted' | 'recovered' | 'refused' | 'closed';
export const DEBIT_STATE: Record<DebitState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_send: { label: 'À envoyer', tone: 'warn' },
  late: { label: 'Envoi en retard', tone: 'alert' },
  waiting: { label: 'En attente de réponse', tone: 'pending' },
  chase: { label: 'Sans réponse dans le délai', tone: 'warn' },
  contested: { label: 'Contestée', tone: 'warn' },
  accepted: { label: 'Reconnue, suite à recevoir', tone: 'warn' },
  recovered: { label: 'Récupéré', tone: 'ok' },
  refused: { label: 'Refusé', tone: 'alert' },
  closed: { label: 'Clos', tone: 'ok' },
};
export const OPEN_STATES: DebitState[] = ['to_send', 'late', 'waiting', 'chase', 'contested', 'accepted'];
// Last time the supplier was written to: the sending or the last reminder
export const lastContact = (d: Debit) => [d.sentAt, d.followAt, ...(d.chases || []).map(c => c.date)].filter(Boolean).sort().at(-1) || '';
export function debitState(d: Debit, today = new Date(), p: Pick<Params, 'businessHours' | 'closedDays' | 'supplier'> = DEFAULT_PARAMS): DebitState {
  const cfg = supplierCfg(p);
  if (d.recovered) return 'recovered';
  if (d.closedAt) return d.answer === 'refused' ? 'refused' : 'closed';
  if (d.answer === 'refused') return 'refused';
  if (d.answer === 'contested') return 'contested';
  if (d.answer === 'accepted' || d.answer === 'partial') return 'accepted';
  if (d.sentAt) return (daysBetween(lastContact(d), today) ?? 0) > cfg.followDays ? 'chase' : 'waiting';
  return (workHoursBetween(d.date, startOfDay(today), businessOf(p)) ?? 0) / 24 > cfg.sendDays ? 'late' : 'to_send';
}
export const claimsOf = (s: Pick<State, 'debits'>, supplierId: string) => Object.values(s.debits).filter(d => d.supplierId === supplierId).sort((a, b) => (a.date < b.date ? 1 : -1));
export const claimSupplierName = (s: Pick<State, 'suppliers'>, d: Pick<Debit, 'supplierId' | 'supplierName'>) => s.suppliers[d.supplierId]?.name || d.supplierName || 'Fournisseur supprimé';
export const lateReceipts = (sup: Supplier) => (sup.receipts || []).filter(r => r.promised && r.received && r.received > r.promised);

export const newSupplier = (): Supplier => ({ id: newId('sup'), name: '', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [] });
export const newDebit = (s: State, supplierId = '', today = new Date()): Debit => ({
  id: newId('deb'), ref: nextRef('DEB', Object.values(s.debits), today), supplierId, date: isoDate(today), bl: '', reserveOnBl: false, defect: '',
  reworkHours: null, otherCost: null, sentAt: '', answer: '', recovered: null, recoveredAt: '', motif: '', severity: 'major', contactId: '',
});

// Figures of one supplier over the last 12 months, all calculated from the claims and the receptions
export function supplierFacts(s: State, sup: Supplier, today = new Date()) {
  const cfg = supplierCfg(s.params), since = since12(today);
  const claims = claimsOf(s, sup.id).filter(d => d.date >= since);
  const answered = claims.filter(d => d.answer), recognised = answered.filter(d => d.answer === 'accepted' || d.answer === 'partial').length;
  const waits = claims.filter(d => d.sentAt && d.answeredAt).map(d => daysBetween(d.sentAt, d.answeredAt!) ?? 0).filter(n => n >= 0);
  const receipts = (sup.receipts || []).filter(r => r.date >= since), late = receipts.filter(r => r.promised && r.received && r.received > r.promised);
  const byMotif: Record<string, number> = {};
  claims.forEach(d => { const k = d.motif || OTHER_CLAIM_MOTIF; byMotif[k] = (byMotif[k] || 0) + 1; });
  const repeats = Object.entries(byMotif).filter(([k, n]) => k !== OTHER_CLAIM_MOTIF && n >= cfg.repeat).map(([key, n]) => ({ key, n }));
  return {
    claims, count: claims.length, claimed: sum(claims.map(d => debitAmount(d, s.params))), recovered: sum(claims.map(d => d.recovered)),
    noReserve: claims.filter(d => !d.reserveOnBl).length, open: claims.filter(d => OPEN_STATES.includes(debitState(d, today, s.params))).length,
    answered: answered.length, recognised, recognisedPct: answered.length ? Math.round(recognised / answered.length * 100) : null,
    avgResponseDays: waits.length ? Math.round(sum(waits) / waits.length * 10) / 10 : null,
    receipts: receipts.length, late: late.length,
    byMotif, repeats,
  };
}
export const supplierStats = supplierFacts;

// Yearly score proposed from the facts of the last 12 months, criterion by criterion: quality from the claims (weighted by severity), delays from the
// deliveries followed, service from the answers to the claims. A criterion with no fact yet (no delivery followed) or that only a person can judge
// (price, the criteria added by the company) comes back null: not assessed.
// A criterion as it is proposed for a new rating: its scale (`max`), its weight, its items, and the note the facts give when there are some
export interface ProposedPart extends Omit<RatingScore, 'items'> { weight: number; auto: boolean; grounded: boolean; hint: string; itemDefs: CriterionItem[] }
const withItems = (p: ProposedPart, points: (i: CriterionItem) => number | null): RatingItem[] | undefined => (p.itemDefs.length ? p.itemDefs.map(i => ({ key: i.key, label: i.label, points: points(i) })) : undefined);
export const toScores = (parts: ProposedPart[]): RatingScore[] => parts.map(p => ({ key: p.key, label: p.label, points: p.points, max: p.max, weight: p.weight, items: withItems(p, () => null) }));
// The same criteria with nothing given: the grid of a rating made by hand
export const blankScores = (parts: ProposedPart[]): RatingScore[] => parts.map(p => ({ key: p.key, label: p.label, points: null, max: p.max, weight: p.weight, items: withItems(p, () => null) }));
export const assessed = (scores: RatingScore[]) => scores.some(p => p.points !== null && p.points !== undefined);
export function proposedRating(s: State, sup: Supplier, today = new Date()): { parts: ProposedPart[]; basis: string; facts: ReturnType<typeof supplierFacts> } {
  const cfg = supplierCfg(s.params), f = supplierFacts(s, sup, today);
  const lostPct = sum(f.claims.map(d => cfg.penaltyPct[SEVERITY_ORDER.indexOf(severityOf(d))]));
  const refused = f.claims.filter(d => d.answer === 'refused').length;
  const sent = f.claims.filter(d => d.sentAt);
  const slow = sent.filter(d => ((d.answeredAt ? daysBetween(d.sentAt, d.answeredAt) : daysBetween(d.sentAt, today)) ?? 0) > cfg.followDays).length;
  const parts = cfg.criteria.filter(c => c.weight > 0).map((c): ProposedPart => {
    let points: number | null = null, grounded = false, hint = c.key === 'price' ? 'à comparer aux autres fournisseurs du secteur' : 'à apprécier';
    if (c.auto === 'quality') {
      grounded = f.count > 0;
      if (grounded) { points = onScale(Math.max(0, 100 - lostPct) / 100, c.scale); hint = `${f.count} réclamation(s) sur 12 mois`; } else hint = 'aucune réclamation suivie : à apprécier';
    } else if (c.auto === 'delay') {
      grounded = f.receipts > 0;
      if (grounded) { points = onScale((f.receipts - f.late) / f.receipts, c.scale); hint = `${f.late} retard(s) sur ${f.receipts}`; } else hint = 'aucune livraison ou prestation suivie : à apprécier';
    } else if (c.auto === 'service') {
      grounded = sent.length > 0;
      if (grounded) { points = onScale(Math.max(0, 1 - 0.25 * refused - 0.15 * slow), c.scale); hint = `${sent.length} réclamation(s) envoyée(s), réponses du fournisseur`; } else hint = 'aucune réclamation envoyée : à apprécier';
    }
    return { key: c.key, label: c.label, max: c.scale, weight: c.weight, points, auto: !!c.auto, grounded, hint, itemDefs: c.items || [] };
  });
  return {
    parts, facts: f,
    basis: `${f.count} réclamation(s), ${f.receipts ? `${f.late} livraison(s) ou prestation(s) en retard sur ${f.receipts}` : 'aucune livraison ou prestation suivie'}, ${refused} refus, ${slow} réponse(s) trop lente(s) sur 12 mois`,
  };
}

export function supplierSummary(s: State, today = new Date()) {
  const since = since12(today);
  const claims = Object.values(s.debits).filter(d => d.date >= since);
  const claimed = sum(claims.map(d => debitAmount(d, s.params))), recovered = sum(claims.map(d => d.recovered));
  const followed = Object.values(s.suppliers).filter(isFollowed);
  const states = Object.values(s.debits).map(d => debitState(d, today, s.params));
  const answered = claims.filter(d => d.answer), waits = claims.filter(d => d.sentAt && d.answeredAt).map(d => daysBetween(d.sentAt, d.answeredAt!) ?? 0).filter(n => n >= 0);
  return {
    claimed, recovered, ratePct: claimed ? Math.round(recovered / claimed * 100) : null,
    inC: followed.filter(x => classOfSupplier(x, s.params) === 'C').length, due: Object.values(s.suppliers).filter(x => ratingDue(x, today, s.params)).length,
    late: states.filter(x => x === 'late').length, chase: states.filter(x => x === 'chase').length, contested: states.filter(x => x === 'contested').length,
    open: states.filter(x => OPEN_STATES.includes(x)).length, count: claims.length,
    recognisedPct: answered.length ? Math.round(answered.filter(d => d.answer === 'accepted' || d.answer === 'partial').length / answered.length * 100) : null,
    avgResponseDays: waits.length ? Math.round(sum(waits) / waits.length * 10) / 10 : null,
  };
}

// The alerts that come from the claims; the others come from the evaluation (rating, directory, sectors)
export const CLAIM_INSIGHT_KEYS = ['late', 'contested', 'chase', 'bl', 'acc', 'verify'];
export function supplierInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const sup = (id: string) => s.suppliers[id]?.name || 'fournisseur';
  const withState = (st: DebitState) => Object.values(s.debits).filter(d => debitState(d, today, s.params) === st);
  const cfg = supplierCfg(s.params);
  const late = withState('late');
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Réclamation hors délai', text: `${names(late, d => `${d.ref} (${sup(d.supplierId)})`)} : pas envoyée dans les ${cfg.sendDays} jours ouvrés prévus.` });
  const contested = withState('contested');
  if (contested.length) out.push({ key: 'contested', tone: 'warn', title: 'Réclamation contestée', text: `${names(contested, d => `${d.ref} (${sup(d.supplierId)})`)} : le fournisseur conteste la réclamation.` });
  const chase = withState('chase');
  if (chase.length) out.push({ key: 'chase', tone: 'warn', title: 'Réponse en retard', text: `${names(chase, d => `${d.ref} (${sup(d.supplierId)})`)} : sans réponse depuis plus de ${cfg.followDays} jours.` });
  const repeat = Object.values(s.suppliers).filter(isFollowed).flatMap(x => supplierFacts(s, x, today).repeats.map(r => ({ x, r })));
  if (repeat.length) out.push({ key: 'repeat', tone: 'bad', title: 'Défaut répété', text: `${names(repeat, ({ x, r }) => `${x.name} : ${claimMotifLabel(s.params, { motif: r.key }).toLowerCase()} (${r.n} fois en 12 mois)`)}.` });
  const noRes = Object.values(s.debits).filter(d => !d.reserveOnBl && !d.recovered && ['to_send', 'late'].includes(debitState(d, today, s.params)));
  if (noRes.length) out.push({ key: 'bl', tone: 'warn', title: 'Pas de réserve écrite à la réception', text: `${names(noRes, d => d.ref)} : aucune réserve écrite à la réception (bon de livraison, procès-verbal…). Sans elle, le recours contre le fournisseur ou le transporteur est plus fragile.` });
  const followed = Object.values(s.suppliers).filter(isFollowed);
  const c = followed.filter(x => classOfSupplier(x, s.params) === 'C');
  if (c.length) out.push({ key: 'c', tone: 'bad', title: 'Fournisseur en classe C', text: `${names(c, x => `${x.name}${x.strategic ? ' (critique)' : ''}`)}.` });
  const drop = followed.map(x => ({ x, d: classDrop(x, s.params) })).filter(y => y.d);
  if (drop.length) out.push({ key: 'drop', tone: 'warn', title: 'Classe en baisse', text: `${names(drop, y => `${y.x.name} (${y.d!.from} puis ${y.d!.to})`)} depuis la note précédente.` });
  const acc = withState('accepted');
  if (acc.length) out.push({ key: 'acc', tone: 'warn', title: 'Suite à recevoir', text: `${names(acc, d => d.ref)} : reconnue par le fournisseur, pas encore reçue.` });
  const verify = Object.values(s.debits).filter(d => d.supplierAction?.trim() && !d.actionCheckedAt && ['recovered', 'closed', 'accepted'].includes(debitState(d, today, s.params)));
  if (verify.length) out.push({ key: 'verify', tone: 'warn', title: 'Action promise, pas encore vérifiée', text: `${names(verify, d => `${d.ref} (${sup(d.supplierId)})`)} : le fournisseur a promis une action corrective.` });
  const nocontact = followed.filter(x => !supplierContacts(s, x).length);
  if (nocontact.length) out.push({ key: 'nocontact', tone: 'warn', title: "Aucun contact dans l'annuaire", text: `${names(nocontact, x => x.name)} : aucune personne à contacter dans l'annuaire (1.3).` });
  const stale = followed.flatMap(x => supplierContacts(s, x).filter(ct => toCheck(ct, today)).map(ct => ({ x, ct })));
  if (stale.length) out.push({ key: 'stale', tone: 'warn', title: 'Numéro non vérifié', text: `${names(stale, y => `${y.ct.name || y.x.name} (${y.x.name})`)} : numéro non vérifié depuis plus d'un an (annuaire, 1.3).` });
  const qualify = followed.filter(x => statusOf(x) === 'qualify');
  if (qualify.length) out.push({ key: 'qualify', tone: 'warn', title: 'Fournisseur à qualifier', text: `${names(qualify, x => x.name)} : pas encore noté.` });
  const due = Object.values(s.suppliers).filter(x => ratingDue(x, today, s.params));
  if (due.length) out.push({ key: 'due', tone: 'warn', title: 'Évaluation à faire', text: `${names(due, x => x.name)}.` });
  return out;
}

// ---- history of one supplier: claims, answers, credits, late receptions, ratings, in one chronological list (nothing typed twice)
export interface TimelineEvent { date: string; kind: 'claim' | 'sent' | 'chase' | 'answer' | 'credit' | 'closed' | 'action' | 'late' | 'rating' | 'note' | 'switch'; text: string; claimId?: string }
export function supplierTimeline(s: State, sup: Supplier): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  const add = (date: string | undefined, kind: TimelineEvent['kind'], text: string, claimId?: string) => { if (date) out.push({ date, kind, text, claimId }); };
  const via = (k?: string, note?: string) => (k ? ` (${k === 'autre' && note ? note : CLAIM_CHANNELS[k as keyof typeof CLAIM_CHANNELS] || k})` : '');
  claimsOf(s, sup.id).forEach(d => {
    add(d.date, 'claim', `Réclamation ${d.ref} : ${d.defect || 'défaut à décrire'} · ${claimMotifLabel(s.params, d).toLowerCase()}, ${SEVERITY[severityOf(d)].label.toLowerCase()}`, d.id);
    add(d.sentAt, 'sent', `${d.ref} envoyée${via(d.sentVia, d.sentViaNote)}`, d.id);
    (d.chases || []).forEach(c => add(c.date, 'chase', `${d.ref} relancée${via(c.via)}${c.note ? ` : ${c.note}` : ''}`, d.id));
    if (!(d.chases || []).length) add(d.followAt, 'chase', `${d.ref} relancée`, d.id);
    if (d.answer) add(d.answeredAt || d.sentAt, 'answer', `${d.ref} : réponse « ${ANSWERS[d.answer].toLowerCase()} »${d.solution ? `, ${(d.solution === 'autre' && d.solutionNote ? d.solutionNote : CLAIM_SOLUTIONS[d.solution as keyof typeof CLAIM_SOLUTIONS] || d.solution).toLowerCase()}` : ''}${d.answerNote ? ` : ${d.answerNote}` : ''}`, d.id);
    if (d.recovered) add(d.recoveredAt || d.date, 'credit', `${d.ref} : ${formatValue(d.recovered, '€')} récupérés`, d.id);
    if (d.actionCheckedAt) add(d.actionCheckedAt, 'action', `${d.ref} : action du fournisseur vérifiée, ${d.actionOk === false ? 'ne tient pas' : 'tient'}`, d.id);
    if (d.closedAt) add(d.closedAt, 'closed', `${d.ref} close${d.closedReason ? ` : ${(d.closedReason === 'autre' && d.closedNote ? d.closedNote : CLOSE_REASONS[d.closedReason as keyof typeof CLOSE_REASONS] || d.closedReason).toLowerCase()}` : ''}`, d.id);
    (d.notes || []).forEach(n => add(n.date, 'note', `${d.ref} : ${n.text}${n.by ? ` (${n.by})` : ''}`, d.id));
  });
  lateReceipts(sup).forEach(r => add(r.received, 'late', `Livraison ou prestation en retard de ${daysBetween(r.promised, r.received) ?? 0} jour(s)${r.note ? ` : ${r.note}` : ''}`));
  sup.ratings.forEach(r => add(r.date, 'rating', `Évaluation : ${ratingScore(r)} / 100, classe ${classOf(ratingScore(r), s.params)}${r.decision ? `, ${DECISIONS[r.decision].toLowerCase()}` : ''}`));
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ---- claims per month over twelve months, by motive (one supplier, or all of them with an empty id)
export function claimTrend(s: Pick<State, 'debits' | 'params'>, end: string, supplierId = '', months = 12) {
  const periods = Array.from({ length: months }, (_, i) => addMonths(end, i - (months - 1)));
  const list = motifsOfClaims(s.params);
  const known = new Set(list.map(m => m.key));
  const rows = periods.map(period => ({ period, total: 0, parts: {} as Record<string, number> }));
  Object.values(s.debits).filter(d => !supplierId || d.supplierId === supplierId).forEach(d => {
    const row = rows.find(r => r.period === d.date.slice(0, 7));
    if (!row) return;
    const k = d.motif && known.has(d.motif) ? d.motif : OTHER_CLAIM_MOTIF;
    row.total++; row.parts[k] = (row.parts[k] || 0) + 1;
  });
  const series = [...list.map((m, i) => ({ key: m.key, label: m.label, color: SERIES_COLORS[m.slot ?? i] || GREY.other })), { key: OTHER_CLAIM_MOTIF, label: 'Autre ou à classer', color: GREY.other }]
    .map(x => ({ ...x, total: rows.reduce((a, r) => a + (r.parts[x.key] || 0), 0) })).filter(x => x.total > 0);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const top = series.slice().sort((a, b) => b.total - a.total)[0] || null;
  const last3 = rows.slice(-3).reduce((a, r) => a + r.total, 0), before3 = rows.slice(-6, -3).reduce((a, r) => a + r.total, 0);
  return { periods, rows, series, total, top, last3, before3, changePct: before3 ? Math.round((last3 - before3) / before3 * 100) : null, last: periodOfDate(new Date()) };
}

// ---- e-mail of a claim, from the model of the settings (tokens between braces)
export function claimMail(s: State, d: Debit): { subject: string; body: string } {
  const cfg = supplierCfg(s.params), ct = claimContact(s, d);
  const amount = debitAmount(d, s.params);
  const fr = (iso: string) => parseDate(iso)?.toLocaleDateString('fr-FR') || '';
  const tokens: Record<string, string> = {
    contact: ct?.name || '', ref: d.ref, date: fr(d.date), bl: d.bl ? ` (${d.bl})` : '', commande: d.orderRef ? `, commande ${d.orderRef}` : '', defaut: d.defect,
    montant: amount > 0 ? `Préjudice chiffré : ${formatValue(amount, '€')} HT (détail dans la fiche jointe). ` : '', entreprise: s.settings.companyName,
  };
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (m, k) => (k in tokens ? tokens[k] : m)).replace(/Bonjour ,/g, 'Bonjour,');
  return { subject: fill(cfg.mailSubject), body: fill(cfg.mailBody) };
}

// ---- links with the directory (1.3): the supplier is an organisation, its people are the contacts of that organisation
export const orgOfSupplier = (s: Pick<State, 'orgs'>, x: Pick<Supplier, 'orgId' | 'name'>): Org | undefined => (x.orgId && s.orgs?.[x.orgId]) || orgOf(s, x.name);
const byVital = (a: Contact, b: Contact) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0) || (a.name || '').localeCompare(b.name || '');
export function supplierContacts(s: Pick<State, 'orgs' | 'contacts'>, x: Pick<Supplier, 'orgId' | 'name' | 'contactId'>): Contact[] {
  const o = orgOfSupplier(s, x);
  const people = Object.values(s.contacts).filter(c => (o ? c.category === o.category && orgKey(c.company) === orgKey(o.name) : orgKey(c.company) === orgKey(x.name)) && c.company.trim());
  const main = x.contactId ? s.contacts[x.contactId] : undefined;
  return [...people, ...(main && !people.includes(main) ? [main] : [])].sort(byVital);
}
// The person a claim is addressed to: the one chosen on the claim, else the main contact of the supplier, else the first of its people
export function claimContact(s: Pick<State, 'suppliers' | 'orgs' | 'contacts'>, d: Pick<Debit, 'contactId' | 'supplierId'>): Contact | undefined {
  if (d.contactId && s.contacts[d.contactId]) return s.contacts[d.contactId];
  const x = s.suppliers[d.supplierId];
  return x ? (x.contactId && s.contacts[x.contactId]) || supplierContacts(s, x)[0] : undefined;
}
// Directory organisations that can be followed as suppliers and are not yet
export function followableOrgs(s: Pick<State, 'suppliers' | 'orgs' | 'contacts'>): string[] {
  const known = new Set(Object.values(s.suppliers).map(x => orgKey(x.name)));
  const names = new Map<string, string>();
  [...Object.values(s.orgs || {}).filter(o => SUPPLIER_ORG_CATEGORIES.includes(o.category)).map(o => o.name), ...Object.values(s.contacts).filter(c => SUPPLIER_ORG_CATEGORIES.includes(c.category)).map(c => c.company)]
    .filter(n => n.trim()).forEach(n => { if (!known.has(orgKey(n)) && !names.has(orgKey(n))) names.set(orgKey(n), n.trim()); });
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}

// Gives each supplier its organisation in the directory (found by name, else created) and its main contact, and each claim the name of its
// supplier. Nothing is overwritten: the text of the old version becomes one directory card only when the organisation has nobody yet.
export function linkSuppliers<T extends { suppliers: Record<string, Supplier>; orgs: Record<string, Org>; contacts: Record<string, Contact>; debits: Record<string, Debit> }>(s: T): T {
  let { suppliers, orgs, contacts, debits } = s;
  Object.values(s.suppliers).forEach(x0 => {
    let x = x0, org = x0.orgId ? orgs[x0.orgId] : undefined;
    if (!org) {
      org = orgOf({ orgs }, x.name);
      if (!org && x.name.trim()) {
        org = { id: `org_${x.id}`, name: x.name.trim(), category: orgCategoryOf(x.category), phone: '', email: '', address: '', reference: '' };
        orgs = { ...orgs, [org.id]: org };
      }
    }
    if (!org) return;
    if (x.orgId !== org.id) x = { ...x, orgId: org.id };
    if (x.name !== org.name && org.name.trim()) x = { ...x, name: org.name };
    const people = Object.values(contacts).filter(c => c.category === org!.category && c.company.trim() && orgKey(c.company) === orgKey(org!.name));
    if (!x.contactId || !contacts[x.contactId]) {
      if (!people.length && x.contact.trim()) {
        const text = x.contact.trim(), phone = (text.match(/(\+?\d[\d .]{7,}\d)/) || [''])[0].trim();
        const [name, ...rest] = text.replace(phone, '').replace(/[\s:–·-]+$/, '').split(/\s·\s|,/);
        const c: Contact = { id: `ct_${x.id}`, category: org.category, name: name.trim() || text, role: rest.join(', ').trim(), company: org.name, phone, email: '', always: false, verifiedAt: '' };
        contacts = { ...contacts, [c.id]: c };
        x = { ...x, contactId: c.id };
      } else if (people.length) x = { ...x, contactId: [...people].sort(byVital)[0].id };
    }
    if (x !== x0) suppliers = { ...suppliers, [x.id]: x };
  });
  Object.values(s.debits).forEach(d => {
    const name = suppliers[d.supplierId]?.name;
    if (name && d.supplierName !== name) debits = { ...debits, [d.id]: { ...d, supplierName: name } };
  });
  return suppliers === s.suppliers && orgs === s.orgs && contacts === s.contacts && debits === s.debits ? s : { ...s, suppliers, orgs, contacts, debits };
}

// The organisation of a new supplier: the one of the directory, or a card created there with the coordinates given. When the organisation has nobody to call
// yet, the person given is created with it (number checked that day) and returned as the main contact.
export interface PersonInput { name: string; role: string; phone: string; email: string }
export function ensureSupplierOrg(
  d: State, p: { orgId?: string; name: string; category: ContactCategory; phone?: string; email?: string; address?: string; reference?: string; person?: PersonInput }, author = '', today = new Date(),
): { org: Org; contactId: string } {
  let org = (p.orgId ? d.orgs[p.orgId] : undefined) ?? orgOf(d, p.name);
  if (!org) { org = { id: newId('org'), name: p.name.trim(), category: p.category, phone: (p.phone || '').trim(), email: (p.email || '').trim(), address: (p.address || '').trim(), reference: (p.reference || '').trim() }; d.orgs[org.id] = org; }
  const who = p.person;
  if (!who?.name.trim() || supplierContacts(d, { orgId: org.id, name: org.name, contactId: undefined }).length) return { org, contactId: '' };
  const phone = who.phone.trim();
  const c: Contact = { id: newId('ct'), category: org.category, name: who.name.trim(), role: who.role.trim(), company: org.name, phone, email: who.email.trim(), always: false, verifiedAt: phone ? isoDate(today) : '', verifiedBy: phone ? author : undefined };
  d.contacts[c.id] = c;
  return { org, contactId: c.id };
}

// The supplier of an organisation of the directory, created when the company decides to follow it (the button of the directory, the choice in 3.1)
export function followOrg(d: State, name: string, category: ContactCategory = 'fournisseur', status: SupplierStatus = 'qualify', id = newId('sup')): Supplier {
  const found = Object.values(d.suppliers).find(x => orgKey(x.name) === orgKey(name));
  if (found) return found;
  let org = orgOf(d, name);
  if (!org) { org = { id: newId('org'), name: name.trim(), category, phone: '', email: '', address: '', reference: '' }; d.orgs[org.id] = org; }
  const x: Supplier = { ...newSupplier(), id, name: org.name, orgId: org.id, category: org.category === 'prestataire' ? 'soustraitance' : 'matiere', status };
  d.suppliers[x.id] = x;
  const people = Object.values(d.contacts).filter(c => c.category === org!.category && c.company.trim() && orgKey(c.company) === orgKey(org!.name)).sort(byVital);
  if (people[0]) x.contactId = people[0].id;
  return x;
}
