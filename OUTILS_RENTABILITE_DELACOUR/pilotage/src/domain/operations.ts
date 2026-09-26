// Tools 3.1 to 3.4: supplier rating and 48 h debit notes, visual work instructions, weekly sensory routine
// and survival cabinet, self-inspection at milestones and acceptance report (95/5 rule). Pure functions, covered by operations.test.ts.
import type { Debit, Delivery, Equipment, Params, Sop, State, Supplier, SupplierCategory, SupplierRating } from './types';
import { addDays, daysBetween, hoursCost, nextRef, sum, type Insight } from './base';
import { isoDate } from './periods';
import { formatValue } from './numbers';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---- 3.1 suppliers
export const SUPPLIER_CATEGORIES: { key: SupplierCategory; label: string }[] = [
  { key: 'matiere', label: 'Matière première' }, { key: 'soustraitance', label: 'Sous-traitance' },
  { key: 'logistique', label: 'Transport, logistique' }, { key: 'service', label: 'Service, maintenance' },
];
export const categoryLabel = (c: SupplierCategory) => SUPPLIER_CATEGORIES.find(x => x.key === c)?.label || c;

// Yearly score out of 100: quality /40, delays /40, service /20. A from 85, B from 70, C below.
export const ratingScore = (r: Pick<SupplierRating, 'quality' | 'delay' | 'service'>) => r.quality + r.delay + r.service;
export type SupplierClass = 'A' | 'B' | 'C';
export const classOf = (score: number): SupplierClass => (score >= 85 ? 'A' : score >= 70 ? 'B' : 'C');
export const CLASS_INFO: Record<SupplierClass, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  A: { label: 'A · référent', tone: 'ok' }, B: { label: 'B · sous surveillance', tone: 'warn' }, C: { label: 'C · action requise', tone: 'alert' },
};
export const lastRating = (sup: Supplier) => [...sup.ratings].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
export const ratingDue = (sup: Supplier, today = new Date()) => { const r = lastRating(sup); return !r || (daysBetween(r.date, today) ?? 0) > 365; };

// Debit note: internal hours at the hourly cost + scrapped material, transport, sorting
export const debitAmount = (d: Debit, p: Params) => hoursCost(d.reworkHours, p) + sum([d.otherCost]);
export const CLAIM_DAYS = 2;   // claim within 48 h of the reception
export type DebitState = 'to_send' | 'late' | 'waiting' | 'accepted' | 'recovered' | 'refused';
export const DEBIT_STATE: Record<DebitState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_send: { label: 'À envoyer sous 48 h', tone: 'warn' },
  late: { label: 'Envoi en retard', tone: 'alert' },
  waiting: { label: 'En attente de réponse', tone: 'pending' },
  accepted: { label: 'Avoir accepté, à recevoir', tone: 'warn' },
  recovered: { label: 'Récupéré', tone: 'ok' },
  refused: { label: 'Refusé', tone: 'alert' },
};
export function debitState(d: Debit, today = new Date()): DebitState {
  if (d.recovered) return 'recovered';
  if (d.answer === 'refused') return 'refused';
  if (d.answer === 'accepted') return 'accepted';
  if (d.sentAt) return 'waiting';
  return (daysBetween(d.date, today) ?? 0) > CLAIM_DAYS ? 'late' : 'to_send';
}

export function supplierStats(s: State, id: string, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
  const ds = Object.values(s.debits).filter(d => d.supplierId === id && d.date >= since);
  return { count: ds.length, claimed: sum(ds.map(d => debitAmount(d, s.params))), recovered: sum(ds.map(d => d.recovered)), noReserve: ds.filter(d => !d.reserveOnBl).length };
}

export const newSupplier = (): Supplier => ({ id: uid('sup'), name: '', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [] });
export const newDebit = (s: State, supplierId = '', today = new Date()): Debit => ({
  id: uid('deb'), ref: nextRef('DEB', Object.values(s.debits), today), supplierId, date: isoDate(today), bl: '', reserveOnBl: false, defect: '',
  reworkHours: null, otherCost: null, sentAt: '', answer: '', recovered: null, recoveredAt: '',
});

export function supplierSummary(s: State, today = new Date()) {
  const y = String(today.getFullYear());
  const debits = Object.values(s.debits).filter(d => d.date.startsWith(y));
  const claimed = sum(debits.map(d => debitAmount(d, s.params)));
  const recovered = sum(debits.map(d => d.recovered));
  const sups = Object.values(s.suppliers);
  const cls = sups.map(x => lastRating(x)).filter(Boolean).map(r => classOf(ratingScore(r!)));
  return {
    claimed, recovered, ratePct: claimed ? Math.round(recovered / claimed * 100) : null,
    inC: cls.filter(c => c === 'C').length, due: sups.filter(x => ratingDue(x, today)).length,
    late: Object.values(s.debits).filter(d => debitState(d, today) === 'late').length,
    open: Object.values(s.debits).filter(d => ['to_send', 'late', 'waiting', 'accepted'].includes(debitState(d, today))).length,
  };
}

export function supplierInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const late = Object.values(s.debits).filter(d => debitState(d, today) === 'late');
  const sup = (id: string) => s.suppliers[id]?.name || 'fournisseur';
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Réclamation hors délai', text: `${names(late, d => `${d.ref} (${sup(d.supplierId)})`)} : pas envoyée sous 48 h. Plus on attend, moins l'avoir est probable.` });
  const noRes = Object.values(s.debits).filter(d => !d.reserveOnBl && !d.recovered && d.answer !== 'refused');
  if (noRes.length) out.push({ key: 'bl', tone: 'warn', title: 'Pas de réserve sur le bon de livraison', text: `${names(noRes, d => d.ref)} : sans réserve écrite sur le BL à la réception, le recours contre le transporteur ou le fournisseur est fragile.` });
  const c = Object.values(s.suppliers).filter(x => { const r = lastRating(x); return r && classOf(ratingScore(r)) === 'C'; });
  if (c.length) out.push({ key: 'c', tone: 'bad', title: 'Fournisseur en classe C', text: `${names(c, x => x.name)} : plan de progrès à exiger, ou second fournisseur à référencer${c.some(x => x.strategic) ? ' (fournisseur unique : voir les Plans B, outil 1.2)' : ''}.` });
  const acc = Object.values(s.debits).filter(d => debitState(d, today) === 'accepted');
  if (acc.length) out.push({ key: 'acc', tone: 'warn', title: 'Avoir à recevoir', text: `${names(acc, d => d.ref)} : accepté mais pas encore reçu. Vérifier la prochaine facture.` });
  const due = Object.values(s.suppliers).filter(x => ratingDue(x, today));
  if (due.length) out.push({ key: 'due', tone: 'warn', title: 'Notation annuelle à faire', text: `${names(due, x => x.name)}.` });
  return out;
}

// ---- 3.2 visual work instructions (80 % pictures, a living standard)
export const DEFAULT_PPE = ['Lunettes de sécurité', 'Chaussures de sécurité', 'Gants anti-coupure'];
export const newSop = (processId = 'P3', today = new Date()): Sop => ({
  id: uid('sop'), processId, poste: '', operation: '', version: 1, versionDate: isoDate(today), history: [], author: '', validatedBy: '',
  steps: [{ op: '', how: '', watch: '', check: '', photo: '' }], good: '', trap: '', goodPhoto: '', trapPhoto: '', ppe: [], habilitations: [],
});
export const sopVersion = (sop: Pick<Sop, 'version'>) => `V${String(sop.version).padStart(2, '0')}`;

// Defects declared on the workstation since the current version: the sheet must add the counter-measure within 48 h
export const ncsSinceVersion = (s: State, sop: Sop) => (sop.poste.trim()
  ? Object.values(s.ncs).filter(n => n.at.slice(0, 10) >= sop.versionDate && n.where.trim().toLowerCase() === sop.poste.trim().toLowerCase())
  : []);
export const photoCount = (sop: Sop) => [sop.goodPhoto, sop.trapPhoto, ...sop.steps.map(x => x.photo)].filter(Boolean).length;

export function sopInsights(s: State): Insight[] {
  const out: Insight[] = [];
  const sops = Object.values(s.sops);
  const stale = sops.filter(x => ncsSinceVersion(s, x).length);
  if (stale.length) out.push({ key: 'stale', tone: 'warn', title: 'Standard à mettre à jour', text: `${names(stale, x => x.poste)} : défaut déclaré au poste depuis la dernière version. Ajouter la parade sous 48 h et passer à la version suivante.` });
  const noPhoto = sops.filter(x => !photoCount(x));
  if (noPhoto.length) out.push({ key: 'photo', tone: 'warn', title: 'Instruction sans photo', text: `${names(noPhoto, x => x.poste || 'Sans titre')} : une photo avec le bon geste et le piège vaut mieux qu'un paragraphe.` });
  const noHab = sops.filter(x => !x.habilitations.length);
  if (noHab.length) out.push({ key: 'hab', tone: 'warn', title: 'Personne habilitée', text: `${names(noHab, x => x.poste || 'Sans titre')} : aucune habilitation enregistrée (test en 3 questions, outil 4.3).` });
  const noVal = sops.filter(x => !x.validatedBy.trim());
  if (noVal.length) out.push({ key: 'val', tone: 'warn', title: 'Instruction non validée', text: `${names(noVal, x => x.poste || 'Sans titre')} : à faire valider par le responsable du poste.` });
  return out;
}

// ---- 3.3 weekly sensory routine (10 min on Monday) and survival cabinet
export const DEFAULT_CHECKPOINTS = [
  { label: 'Niveau de lubrifiant et huile des glissières', criterion: 'Entre le mini et le maxi de la jauge' },
  { label: 'Pression pneumatique', criterion: 'Manomètre stable à la valeur de réglage' },
  { label: 'Bruit et vibrations', criterion: 'Rotation silencieuse, aucun sifflement' },
  { label: 'Copeaux et fuites au sol', criterion: 'Bacs vidés, aucun suintement' },
  { label: 'Arrêts d\'urgence et carters', criterion: "Coupure immédiate à l'ouverture de la porte" },
];
export const newEquipment = (): Equipment => ({
  id: uid('eq'), name: '', location: '', operator: '', manager: '', riskId: '', checkpoints: DEFAULT_CHECKPOINTS.map(c => ({ ...c })), inspections: [], parts: [],
});
export const lastInspection = (e: Equipment) => [...e.inspections].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
export type InspectionState = 'never' | 'ok' | 'due' | 'late';
export const INSPECTION_STATE: Record<InspectionState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  never: { label: 'Jamais inspecté', tone: 'alert' }, ok: { label: 'Inspecté cette semaine', tone: 'ok' },
  due: { label: 'Inspection à faire', tone: 'warn' }, late: { label: 'Inspection en retard', tone: 'alert' },
};
export function inspectionState(e: Equipment, today = new Date()): InspectionState {
  const l = lastInspection(e);
  if (!l) return 'never';
  const age = daysBetween(l.date, today) ?? 99;
  return age < 7 ? 'ok' : age <= 14 ? 'due' : 'late';
}
// Points found out of order at the last inspection (fixed when the next inspection finds them in order)
export const anomalies = (e: Equipment) => { const l = lastInspection(e); return l ? e.checkpoints.filter((_, i) => l.results[i] === 'ko') : []; };
export const lowParts = (e: Equipment) => e.parts.filter(p => p.stock < p.min);
// Share of the last 12 weeks with an inspection
export function routineRate(e: Equipment, today = new Date()): number {
  const weeks = new Set(e.inspections.map(i => daysBetween(i.date, today)).filter((d): d is number => d !== null && d >= 0 && d < 84).map(d => Math.floor(d / 7)));
  return Math.round(weeks.size / 12 * 100);
}
export function equipmentInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const eqs = Object.values(s.equipments);
  const low = eqs.flatMap(e => lowParts(e).map(p => ({ e, p })));
  if (low.length) out.push({ key: 'low', tone: 'bad', title: 'Armoire de survie incomplète', text: `${names(low, x => `${x.p.name} (${x.e.name}, ${x.p.stock} pour ${x.p.min})`)} : commander tout de suite, le délai compte.` });
  const ano = eqs.filter(e => anomalies(e).length);
  if (ano.length) out.push({ key: 'ano', tone: 'bad', title: 'Anomalie relevée', text: `${names(ano, e => `${e.name} : ${anomalies(e).map(c => c.label.toLowerCase()).join(', ')}`)}. Traiter avant la casse.` });
  const late = eqs.filter(e => ['late', 'never'].includes(inspectionState(e, today)));
  if (late.length) out.push({ key: 'late', tone: 'warn', title: 'Routine du lundi manquée', text: `${names(late, e => e.name)} : pas d'inspection depuis plus de 2 semaines.` });
  const noRisk = eqs.filter(e => !e.riskId);
  if (noRisk.length && Object.keys(s.risks).length) out.push({ key: 'risk', tone: 'warn', title: 'Sans Plan B', text: `${names(noRisk, e => e.name)} : machine goulet non reliée à un risque de l'outil 1.2.` });
  return out;
}

// ---- 3.4 self-inspection at 4 milestones and acceptance report (95/5 rule)
export const DEFAULT_MILESTONES = [
  { label: 'Débit matière', point: 'Cotes hors tout et équerrage', requirement: '± 0,5 mm selon le plan' },
  { label: 'Assemblage', point: 'Cordons de soudure, montage', requirement: 'Aucune fissure, aucun manque' },
  { label: 'Finition', point: 'Épaisseur et adhérence de la peinture', requirement: 'Épaisseur au moins 80 microns' },
  { label: 'Libération finale', point: 'Propreté, accessoires, emballage', requirement: 'Notice jointe, aucune rayure' },
];
export const MAX_RETENTION = 5;
export const LIFT_DAYS = 7;
export const newDelivery = (): Delivery => ({
  id: uid('dl'), ref: '', client: '', item: '', qty: null,
  milestones: DEFAULT_MILESTONES.map(m => ({ ...m, measured: '', ok: null, by: '', date: '' })),
  releasedBy: '', releasedAt: '',
  reception: { date: '', name: '', role: '', result: '', reserve: '', retentionPct: null, amount: null, liftedAt: '' },
});
export type DeliveryState = 'in_progress' | 'blocked' | 'to_release' | 'released' | 'accepted' | 'reserve' | 'reserve_late' | 'lifted' | 'refused';
export const DELIVERY_STATE: Record<DeliveryState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  in_progress: { label: 'En fabrication', tone: 'pending' }, blocked: { label: 'Jalon non conforme', tone: 'alert' },
  to_release: { label: 'À libérer', tone: 'warn' }, released: { label: 'Libéré, PV à signer', tone: 'warn' },
  accepted: { label: 'Reçu sans réserve', tone: 'ok' }, reserve: { label: 'Réserve à lever', tone: 'warn' },
  reserve_late: { label: 'Réserve en retard', tone: 'alert' }, lifted: { label: 'Réserve levée', tone: 'ok' }, refused: { label: 'Réception refusée', tone: 'alert' },
};
export const liftDue = (d: Delivery) => (d.reception.date ? addDays(d.reception.date, LIFT_DAYS) : '');
export function deliveryState(d: Delivery, today = new Date()): DeliveryState {
  const r = d.reception;
  if (r.result === 'refus') return 'refused';
  if (r.result === 'sans') return 'accepted';
  if (r.result === 'reserve') return r.liftedAt ? 'lifted' : (daysBetween(liftDue(d), today) ?? -1) > 0 ? 'reserve_late' : 'reserve';
  if (d.releasedAt) return 'released';
  if (d.milestones.some(m => m.ok === false)) return 'blocked';
  return d.milestones.every(m => m.ok === true) ? 'to_release' : 'in_progress';
}
// Payment due at once and amount held until the reservation is lifted
export function split(d: Delivery) {
  const a = d.reception.amount;
  if (a === null) return null;
  const pct = d.reception.result === 'reserve' && !d.reception.liftedAt ? Math.min(d.reception.retentionPct ?? MAX_RETENTION, 100) : 0;
  return { now: a * (1 - pct / 100), held: a * pct / 100, pct };
}
export function deliveryInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const ds = Object.values(s.deliveries);
  const blocked = ds.filter(d => deliveryState(d, today) === 'blocked');
  if (blocked.length) out.push({ key: 'blocked', tone: 'bad', title: 'Jalon non conforme', text: `${names(blocked, d => d.ref || d.item)} : ne pas passer au jalon suivant avant correction (bac rouge, outil 5.1).` });
  const late = ds.filter(d => deliveryState(d, today) === 'reserve_late');
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Réserve non levée sous 7 jours', text: `${names(late, d => `${d.ref} (${d.client})`)} : le client garde la retenue tant que la réserve n'est pas levée.` });
  const over = ds.filter(d => (d.reception.retentionPct ?? 0) > MAX_RETENTION);
  if (over.length) out.push({ key: 'over', tone: 'warn', title: 'Retenue supérieure à 5 %', text: `${names(over, d => d.ref)} : une réserve mineure ne justifie pas de bloquer plus de 5 % de la facture.` });
  const unsigned = ds.filter(d => deliveryState(d, today) === 'released' && (daysBetween(d.releasedAt, today) ?? 0) > 2);
  if (unsigned.length) out.push({ key: 'pv', tone: 'warn', title: 'PV de réception à faire signer', text: `${names(unsigned, d => d.ref)} : livré sans PV signé, la facture de solde attend.` });
  const held = sum(ds.map(d => split(d)?.held));
  if (held > 0) out.push({ key: 'held', tone: 'warn', title: 'Montants retenus', text: `${formatValue(held, '€')} retenus par les clients en attendant la levée des réserves.` });
  return out;
}
