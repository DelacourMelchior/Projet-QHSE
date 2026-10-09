// Tools 5.1 to 5.4: red bin (quarantine and 24 h decision), cost of non-quality by process,
// five whys workshop, mistake-proofing checked at day 30. Pure functions, covered by quality.test.ts.
import type { Action, Analysis, Nc, NcCause, NcDecision, Params, Period, Poka, PokaLevel, State } from './types';
import { addDays, daysBetween, hoursCost, nb, defaultProcess, nextRef, PROCESS_IDS, sum, workHoursBetween, businessOf, type Business, type Insight } from './base';
import { addMonths, frDate, isoDate } from './periods';
import { logDelivery, lotsOf, pvSigned } from './receptions';
import { formatValue } from './numbers';
import { complaintCost } from './commercial';

// ---- 5.1 red bin
export const NC_CAUSES: { key: NcCause; label: string }[] = [
  { key: 'outillage', label: 'Outil usé ou cassé' },
  { key: 'reglage', label: 'Réglage machine' },
  { key: 'plan', label: 'Plan ou consigne mal lu' },
  { key: 'matiere', label: 'Matière ou pièce fournisseur' },
  { key: 'manipulation', label: 'Choc, manutention, emballage' },
  { key: 'methode', label: 'Méthode ou gamme absente' },
  { key: 'autre', label: 'Autre' },
];
export const causeLabel = (c: NcCause | '') => NC_CAUSES.find(x => x.key === c)?.label || 'À préciser';

export const DECISIONS: { key: NcDecision; label: string; text: string; visa: string }[] = [
  { key: 'rebut', label: 'Rebut', text: 'Pièce irrécupérable : mise à la benne sous contrôle.', visa: "Chef d'atelier" },
  { key: 'retouche', label: 'Retouche', text: 'Reprise selon une gamme définie ; heures et matière chiffrées.', visa: 'Méthodes' },
  { key: 'derogation', label: 'Dérogation client', text: "Défaut sans impact technique accepté par écrit par le client.", visa: 'Direction' },
  { key: 'retour', label: 'Retour fournisseur', text: 'Pièce renvoyée au fournisseur, fiche de débit sous 48 h (outil 3.1).', visa: 'Achats' },
  { key: 'tri', label: 'Tri à 100 %', text: 'Tout le lot est contrôlé pièce par pièce ; les bonnes sont libérées.', visa: 'Qualité' },
  { key: 'declassement', label: 'Déclassement', text: 'Pièce utilisée pour un usage moins exigeant, ou vendue en second choix.', visa: 'Direction' },
  { key: 'attente', label: 'Attente de l\'avis client', text: 'Le client est consulté ; la pièce reste isolée jusqu\'à sa réponse.', visa: 'Commercial' },
];
export const decisionLabel = (d: NcDecision | '') => DECISIONS.find(x => x.key === d)?.label || '';
// What a defect declared from an order of 3.4 opens there: the order, on the tab of its milestones, or of its reservations on that reservation, wherever its delivery is ('' for any other defect)
export const ncOrderFocus = (n: Pick<Nc, 'deliveryId' | 'milestoneId' | 'reserveId'>): string => (n.deliveryId ? `${n.deliveryId}${n.milestoneId ? ':milestones' : n.reserveId ? `:reception:${n.reserveId}` : ''}` : '');

export const DECISION_HOURS = 24;
export type NcState = 'quarantine' | 'late' | 'decided';
export function ncState(n: Nc, now = new Date(), business: Business = false): NcState {
  if (n.decision && n.decision !== 'attente') return 'decided';
  if (n.decision === 'attente') return 'quarantine';
  const age = workHoursBetween(n.at, now, business);
  return age !== null && age >= DECISION_HOURS ? 'late' : 'quarantine';
}
export const NC_STATE: Record<NcState, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  quarantine: { label: 'En quarantaine', tone: 'warn' },
  late: { label: 'Décision en retard', tone: 'alert' },
  decided: { label: 'Décidé', tone: 'ok' },
};

// Direct cost of a non-conformity: scrapped material, wasted and rework hours at the hourly cost, exceptional logistics
export function ncCost(n: Nc, p: Params): number {
  const c = n.cost;
  return sum([c.scrap, c.logistics]) + hoursCost(sum([c.lostHours, c.reworkHours]), p);
}
export const ncHours = (n: Nc) => sum([n.cost.lostHours, n.cost.reworkHours]);

export { newNc } from './newNc';

// Deleting a defect that an order of 3.4 holds (declared from one of its milestones or reservations): refused, as a fact, when the order is released or a PV of it is signed (the defect
// belongs to what was controlled, released or signed); otherwise allowed and written in the journal of the order (a line of proof), so that the order never loses a defect without a trace.
const orderOfNc = (s: State, n: Pick<Nc, 'deliveryId'>) => (n.deliveryId && Object.hasOwn(s.deliveries, n.deliveryId) ? s.deliveries[n.deliveryId] : undefined);
export function ncDeleteBar(s: State, n: Pick<Nc, 'ref' | 'deliveryId'>): string {
  const d = orderOfNc(s, n);
  if (!d) return '';
  const parts = [d, ...lotsOf(d)], name = d.ref.trim() || d.item.trim() || 'sans numéro';
  if (parts.some(pvSigned)) return nb(`La fiche ${n.ref} ne se supprime pas : la commande ${name} a un PV signé et la fiche fait partie de sa preuve. Une décision la clôt, la fiche reste.`);
  const rel = parts.find(p => p.releasedAt);
  return rel ? nb(`La fiche ${n.ref} ne se supprime pas : la commande ${name} est libérée le ${frDate(rel.releasedAt.slice(0, 10))} et la fiche fait partie de ce qui a été contrôlé. Une décision la clôt, la fiche reste.`) : '';
}
// On a draft of the state: the defect goes, and the order that held it says so (who, what the defect was, whether it had a decision)
export function deleteNc(s: State, id: string, by: string, at: string): void {
  const n = Object.hasOwn(s.ncs, id) ? s.ncs[id] : undefined, d = n && orderOfNc(s, n);
  if (n && d) s.deliveries[d.id] = logDelivery(d, by || 'anonyme', at, `Fiche ${n.ref} supprimée dans l'outil 5.1${n.description.trim() ? ` : « ${n.description.trim()} »` : ''} (${n.decision ? `décision : ${decisionLabel(n.decision)}` : 'sans décision'})`, true);
  delete s.ncs[id];
}

// ---- 5.2 cost of non-quality: every costed event of the month, imputed to its process
export interface CnqItem { kind: 'nc' | 'complaint' | 'debit'; id: string; ref: string; label: string; date: string; processId: string; amount: number; hours: number }

export function cnqItems(s: State, p: Period): CnqItem[] {
  const out: CnqItem[] = [];
  Object.values(s.ncs).filter(n => n.at.slice(0, 7) === p).forEach(n => {
    const amount = ncCost(n, s.params);
    if (amount > 0) out.push({ kind: 'nc', id: n.id, ref: n.ref, label: n.description || n.item, date: n.at, processId: n.processId, amount, hours: ncHours(n) });
  });
  Object.values(s.complaints).filter(c => c.at.slice(0, 7) === p).forEach(c => {
    const amount = complaintCost(c, s.params);
    if (amount > 0) out.push({ kind: 'complaint', id: c.id, ref: c.ref, label: `${c.client} : ${c.description}`, date: c.at, processId: c.processId, amount, hours: c.hours || 0 });
  });
  // a debit note linked to a red-bin record is already counted there
  Object.values(s.debits).filter(d => d.date.slice(0, 7) === p && !d.ncId).forEach(d => {
    const amount = sum([d.otherCost]) + hoursCost(d.reworkHours, s.params);
    if (amount > 0) out.push({ kind: 'debit', id: d.id, ref: d.ref, label: `${s.suppliers[d.supplierId]?.name || 'Fournisseur'} : ${d.defect}`, date: d.date, processId: defaultProcess('P3'), amount, hours: d.reworkHours || 0 });
  });
  return out.sort((a, b) => b.amount - a.amount);
}

export function cnqMonth(s: State, p: Period) {
  const items = cnqItems(s, p);
  // an amount whose process is unknown (deleted, never set) goes under '' ("À qualifier") instead of being lost
  const known = (i: { processId: string }) => (PROCESS_IDS.includes(i.processId) ? i.processId : '');
  const byProcess = Object.fromEntries([...PROCESS_IDS, ''].map(id => [id, sum(items.filter(i => known(i) === id).map(i => i.amount))])) as Record<string, number>;
  const recovered = sum(Object.values(s.debits).filter(d => d.recoveredAt.slice(0, 7) === p).map(d => d.recovered));
  const total = sum(items.map(i => i.amount));
  const indirect = s.params.cnqIndirect?.[p] || 0;
  return {
    items, byProcess, recovered, indirect,
    net: total + indirect - recovered,      // after the credit notes received from suppliers
    total,
    hours: sum(items.map(i => i.hours)),
    unqualified: items.filter(i => !i.processId).length,
  };
}

// Revenue to make again to pay a loss back: loss x 100 / net margin (strict reading: every euro lost comes out of the profit)
export const compensatingRevenue = (loss: number, netMarginPct: number) => (netMarginPct > 0 ? loss * 100 / netMarginPct : loss * 20);

// Red-bin records per week over the last 8 weeks: a cost of non-quality is only as good as the declarations behind it
export function declarationsPerWeek(s: State, now = new Date()): number[] {
  return Array.from({ length: 8 }, (_, i) => Object.values(s.ncs).filter(n => { const d = daysBetween(n.at.slice(0, 10), now); return d !== null && d >= (7 - i) * 7 && d < (8 - i) * 7; }).length);
}

// Pareto of the last 90 days: which causes and which workstations give the most defects
export function pareto(s: State, by: 'cause' | 'where', now = new Date()): { key: string; n: number; cost: number }[] {
  const recent = Object.values(s.ncs).filter(n => (daysBetween(n.at.slice(0, 10), now) ?? 999) <= 90);
  const groups: Record<string, { n: number; cost: number }> = {};
  recent.forEach(n => { const k = (by === 'cause' ? causeLabel(n.cause) : n.where.trim() || 'Poste non précisé'); groups[k] ||= { n: 0, cost: 0 }; groups[k].n++; groups[k].cost += ncCost(n, s.params); });
  return Object.entries(groups).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.n - a.n || b.cost - a.cost);
}

// Twelve months ending with p
export const cnqSeries = (s: State, p: Period) => Array.from({ length: 12 }, (_, i) => addMonths(p, i - 11)).map(m => ({ period: m, total: cnqMonth(s, m).total }));

// ---- 5.3 five whys
// Words that point at a person instead of the process
const BLAME = /(inattenti|manqu[ée]\w* d.attention|attenti[fv]|vigilan|faute|erreur humaine|n[ée]glig|distrait|gaffe|rigueur|[ée]tourd|oubli|pas fait attention|mauvaise volont)/i;
export const blamesPerson = (t: string) => BLAME.test(t);

export type AnalysisState = 'draft' | 'to_act' | 'running' | 'to_check' | 'effective' | 'failed';
export const ANALYSIS_STATE: Record<AnalysisState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  draft: { label: 'Cause à trouver', tone: 'pending' },
  to_act: { label: 'Contre-mesure à décider', tone: 'alert' },
  running: { label: 'Actions en cours', tone: 'warn' },
  to_check: { label: 'Efficacité à vérifier', tone: 'warn' },
  effective: { label: 'Efficace', tone: 'ok' },
  failed: { label: 'Récidive', tone: 'alert' },
};

export const actionsOfAnalysis = (s: State, id: string): Action[] =>
  Object.values(s.actions).filter(a => a.ref?.kind === 'analysis' && a.ref.id === id).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
export const pokasOfAnalysis = (s: State, id: string): Poka[] => Object.values(s.pokas).filter(p => p.analysisId === id);
const open = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';

// The same defect declared again at the same workstation after the countermeasures were done
export function recurrences(s: State, a: Analysis) {
  const src = a.source.kind === 'nc' ? s.ncs[a.source.id] : undefined;
  const acts = actionsOfAnalysis(s, a.id);
  if (!src || !src.where.trim() || !acts.length || acts.some(open)) return [];
  const closed = acts.map(x => x.closedAt).filter(Boolean).sort().pop() || a.date;
  return Object.values(s.ncs).filter(n => n.id !== src.id && n.at.slice(0, 10) > closed && n.where.trim().toLowerCase() === src.where.trim().toLowerCase() && (!src.cause || n.cause === src.cause));
}

export function analysisState(s: State, a: Analysis, today = new Date()): AnalysisState {
  if (!a.rootCause.trim()) return 'draft';
  const acts = actionsOfAnalysis(s, a.id);
  const pokas = pokasOfAnalysis(s, a.id);
  if (!acts.length && !pokas.length) return 'to_act';
  const ps = pokas.map(p => pokaState(p, today));
  if (ps.includes('failed') || recurrences(s, a).length) return 'failed';
  if (acts.some(open) || ps.includes('to_install')) return 'running';
  if (ps.includes('effective') || (acts.length && acts.every(x => x.status === 'effective'))) return 'effective';
  return 'to_check';
}

// A countermeasure should be in place within 7 working days (9 calendar days)
export const slowActions = (s: State, a: Analysis) =>
  actionsOfAnalysis(s, a.id).filter(x => (daysBetween(a.date, x.deadline) ?? 0) > 9);

// Problems that deserve a workshop and have none: costly, customer, or repeated defects
export function workshopsToOpen(s: State, now = new Date()): { kind: 'nc' | 'complaint'; id: string; ref: string; why: string }[] {
  const trigger = s.params.cnqTrigger ?? 500;
  const out: { kind: 'nc' | 'complaint'; id: string; ref: string; why: string }[] = [];
  // a defect declared from an order of 3.4 names the deliverable of the order, not a workstation: it is not "at the same workstation" as another
  Object.values(s.ncs).filter(n => !n.analysisId).forEach(n => {
    const cost = ncCost(n, s.params);
    const repeats = n.deliveryId ? 0 : Object.values(s.ncs).filter(m => !m.deliveryId && m.where.trim() && m.where.trim().toLowerCase() === n.where.trim().toLowerCase() && m.cause === n.cause && Math.abs(daysBetween(m.at.slice(0, 10), n.at.slice(0, 10)) ?? 999) <= 90).length;
    if (cost >= trigger) out.push({ kind: 'nc', id: n.id, ref: n.ref, why: `coût de ${Math.round(cost)} € (seuil ${trigger} €)` });
    else if (repeats >= 3) out.push({ kind: 'nc', id: n.id, ref: n.ref, why: `${repeats} défauts semblables au même poste en 90 jours` });
    else if (n.origin === 'client' && !(n.reserveId && ncState(n, now) === 'decided')) out.push({ kind: 'nc', id: n.id, ref: n.ref, why: 'défaut vu par le client' });   // a reservation's defect, once decided, is dealt with
  });
  Object.values(s.complaints).filter(c => c.severity === 'majeure' && c.verdict !== 'non_fondee' && !c.analysisId && (daysBetween(c.at.slice(0, 10), now) ?? 0) <= 180).forEach(c => out.push({ kind: 'complaint', id: c.id, ref: c.ref, why: 'réclamation majeure' }));
  return out;
}

// The workshop of a defect: the one already opened for it, else a new one that carries the defect (the people who declared and decided it take part)
export function workshopOfNc(s: State, n: Nc, today = new Date()): { a: Analysis; isNew: boolean } {
  const have = n.analysisId && Object.hasOwn(s.analyses, n.analysisId) ? s.analyses[n.analysisId] : undefined;
  return have ? { a: have, isNew: false } : { a: { ...newAnalysis(s, { kind: 'nc', id: n.id }, n.description, n.processId || defaultProcess('P3'), today), participants: [n.by, n.decidedBy].filter(Boolean).join(', ') }, isNew: true };
}
export function newAnalysis(s: State, source: Analysis['source'], problem: string, processId: string, today = new Date()): Analysis {
  return {
    id: `an_${today.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ref: nextRef('5P', Object.values(s.analyses), today),
    date: isoDate(today), problem, source, processId, participants: '', whys: ['', '', '', '', ''], rootCause: '', backCheck: false, pilot: '',
  };
}

// ---- 5.4 mistake-proofing, checked on the ground 30 days after it is in place
export const POKA_LEVELS: { key: PokaLevel; label: string; text: string; rank: number }[] = [
  { key: 'supprimer', label: "Supprimer l'étape", text: "L'opération qui créait le défaut n'existe plus.", rank: 1 },
  { key: 'detromper', label: 'Détrompeur physique', text: 'Butée, téton, gabarit, forme : le mauvais geste est impossible.', rank: 2 },
  { key: 'detecter', label: 'Détection et blocage', text: 'Capteur, scan, blocage logiciel : l\'erreur est arrêtée avant de passer.', rank: 3 },
  { key: 'consigne', label: 'Consigne ou affichage', text: "Rappel écrit ou visuel : l'erreur reste possible.", rank: 4 },
];
export const levelLabel = (l: PokaLevel) => POKA_LEVELS.find(x => x.key === l)?.label || l;

// Catalogue by type of defect
export const POKA_CATALOGUE: { defect: string; ideas: string[] }[] = [
  { defect: 'Montage inversé ou à l\'envers', ideas: ['Téton ou ergot asymétrique', 'Gabarit qui n\'accepte la pièce que dans un sens', 'Connecteurs de formes ou de couleurs différentes'] },
  { defect: 'Oubli d\'une pièce ou d\'une étape', ideas: ['Kit préparé à l\'avance avec un emplacement par pièce', 'Compteur de vis relié à la visseuse', 'Check-list bloquante dans le logiciel avant l\'étape suivante'] },
  { defect: 'Mauvaise cote ou mauvais réglage', ideas: ['Butée crantée ou indexée', 'Gabarit « passe / passe pas » au poste', 'Programme machine verrouillé par référence'] },
  { defect: 'Mauvaise référence ou mauvais lot', ideas: ['Scan du code-barre qui bloque la mauvaise référence', 'Bacs de couleur par référence', 'Détrompage des outillages par forme'] },
  { defect: 'Erreur administrative', ideas: ['Champ obligatoire dans le devis ou l\'ERP', 'Blocage de la commande sans acompte', 'Double validation au-dessus d\'un montant'] },
];
// Yearly cost of the defect before the device (red-bin records of the workshop over the 12 months before installation) and payback
export function pokaPayback(s: State, p: Poka): { yearly: number; months: number | null } | null {
  const an = p.analysisId ? s.analyses[p.analysisId] : undefined;
  const src = an?.source.kind === 'nc' ? s.ncs[an.source.id] : undefined;
  const where = (p.poste || src?.where || '').trim().toLowerCase();
  const end = p.installedAt || isoDate(new Date());
  const ncs = Object.values(s.ncs).filter(n => (where && n.where.trim().toLowerCase() === where) || n.analysisId === p.analysisId).filter(n => n.at.slice(0, 10) <= end && (daysBetween(n.at.slice(0, 10), end) ?? 999) <= 365);
  const yearly = sum(ncs.map(n => ncCost(n, s.params)));
  if (!yearly) return null;
  return { yearly, months: p.cost ? Math.max(0.1, p.cost / (yearly / 12)) : null };
}

export const POKA_IDEAS: Record<string, string[]> = {
  P1: ['Blocage dans le logiciel de devis si la marge est sous le plancher', 'Double signature bancaire obligatoire au-delà d\'un montant'],
  P2: ['Pas d\'ordre de fabrication sans acompte encaissé', 'Devis type avec cases obligatoires (délai, acompte, tolérances)'],
  P3: ['Butée fixe empêchant le montage inversé', 'Téton asymétrique de positionnement sur le gabarit'],
  P4: ['Code couleur des bacs et des outillages par poste', 'Fiche standard plastifiée avec photos à hauteur des yeux'],
  P5: ['Gabarit « passe / passe pas » au poste', 'Scan du code-barre bloquant l\'étiquette d\'expédition'],
};

export const CHECK_DAYS = 30;
export type PokaState = 'to_install' | 'running' | 'due' | 'effective' | 'recheck' | 'failed';
export const POKA_STATE: Record<PokaState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  to_install: { label: 'À installer', tone: 'pending' },
  running: { label: 'En service, contrôle J+30 à venir', tone: 'pending' },
  due: { label: 'Contrôle J+30 à faire', tone: 'warn' },
  effective: { label: 'Efficace', tone: 'ok' },
  recheck: { label: 'Contrôle de suivi à faire', tone: 'warn' },
  failed: { label: 'Récidive', tone: 'alert' },
};
// After day 30: checks at day 90, then every year (devices disappear after a few months)
export function nextFollowCheck(p: Poka): string {
  if (!p.installedAt || !p.check) return '';
  const n = (p.later || []).length;
  return addDays(p.installedAt, n === 0 ? 90 : 90 + 365 * n);
}
export const checkDate = (p: Poka) => (p.installedAt ? addDays(p.installedAt, CHECK_DAYS) : '');
export const checkPassed = (c: NonNullable<Poka['check']>) => c.inPlace && (c.seen === undefined || c.seen === null ? (c.defects ?? 0) === 0 : !c.seen && (c.defects ?? 0) === 0);

export function pokaState(p: Poka, today = new Date()): PokaState {
  if (!p.installedAt) return 'to_install';
  if (p.check) {
    const checks = [p.check, ...(p.later || [])];
    if (!checks.every(checkPassed)) return 'failed';
    return (daysBetween(nextFollowCheck(p), today) ?? -1) >= 0 ? 'recheck' : 'effective';
  }
  return (daysBetween(checkDate(p), today) ?? -1) >= 0 ? 'due' : 'running';
}

// Red-bin records declared on the same workstation since the device is in place (a hint for the day-30 check)
export const ncsSince = (s: State, p: Poka) => (p.installedAt && p.poste.trim()
  ? Object.values(s.ncs).filter(n => n.at.slice(0, 10) >= p.installedAt && n.where.trim().toLowerCase() === p.poste.trim().toLowerCase())
  : []);

export function newPoka(analysis: Analysis | null, processId = defaultProcess('P3')): Poka {
  return {
    id: `pk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, analysisId: analysis?.id || '', processId: analysis?.processId || processId,
    poste: '', defect: analysis?.problem || '', level: 'detromper', description: '', howItBlocks: '', cost: null, owner: analysis?.pilot || '',
    installedAt: '', trained: false, bypassTested: false, check: null,
  };
}

// Effectiveness of an action born from a five whys workshop: the day-30 check of its devices, else the pilot's judgement
export type RefEffectiveness = { state: 'pending' } | { state: 'waiting' } | { state: 'effective' | 'relapse'; date: string };
export function analysisActionEffectiveness(s: State, a: Action, today = new Date()): RefEffectiveness {
  if (open(a)) return { state: 'pending' };
  if (a.status === 'effective') return { state: 'effective', date: a.closedAt };
  if (a.ref?.kind !== 'analysis') return { state: 'waiting' };
  const checked = pokasOfAnalysis(s, a.ref.id).filter(p => p.check).sort((x, y) => (x.check!.date < y.check!.date ? 1 : -1))[0];
  if (checked) return { state: pokaState(checked, today) === 'effective' ? 'effective' : 'relapse', date: checked.check!.date };
  return { state: 'waiting' };
}

// ---- messages of the quality tools
export function qualityInsights(s: State, p: Period, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
  const late = Object.values(s.ncs).filter(n => ncState(n, now, businessOf(s.params)) === 'late');
  if (late.length) out.push({ key: 'late', tone: 'bad', title: 'Bac rouge : décision en retard', text: `${names(late, n => n.ref)} : en quarantaine depuis plus de ${DECISION_HOURS} h. Rebut, retouche ou dérogation ?` });
  const m = cnqMonth(s, p);
  if (m.unqualified) out.push({ key: 'unq', tone: 'warn', title: 'Processus à qualifier', text: `${m.unqualified} coût(s) du mois sans processus d'origine : la répartition est incomplète.` });
  const top = Object.entries(m.byProcess).filter(([k]) => k).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0 && m.total > 0) out.push({ key: 'top', tone: 'warn', title: 'Processus le plus coûteux', text: `${top[0]} : ${formatValue(top[1], '€')}, soit ${Math.round(top[1] / m.total * 100)} % de la non-qualité du mois.` });
  const toOpen = workshopsToOpen(s, now);
  if (toOpen.length) out.push({ key: '5p', tone: 'warn', title: 'Atelier 5 Pourquoi à mener', text: `${names(toOpen, x => `${x.ref} (${x.why})`)}.` });
  const due = Object.values(s.pokas).filter(x => pokaState(x, now) === 'due');
  if (due.length) out.push({ key: 'j30', tone: 'warn', title: 'Contrôle J+30 à faire', text: `${names(due, x => x.poste || x.defect)} : vérifier sur le terrain que le défaut ne revient pas.` });
  const re = Object.values(s.pokas).filter(x => pokaState(x, now) === 'recheck');
  if (re.length) out.push({ key: 'recheck', tone: 'warn', title: 'Détrompeur à revérifier', text: `${names(re, x => x.poste || x.defect)} : est-il toujours en place et utilisé ?` });
  const failed = Object.values(s.pokas).filter(x => pokaState(x, now) === 'failed');
  if (failed.length) out.push({ key: 'failed', tone: 'bad', title: 'Récidive après détrompeur', text: `${names(failed, x => x.poste || x.defect)} : reprendre l'analyse de la cause.` });
  return out;
}

// Messages of the five whys workshops
const WEAK = /(rappel|sensibilis|attention|vigilan|faire gaffe|redire|re-?expliquer|consigne orale)/i;
export const weakAction = (text: string) => WEAK.test(text);
export function analysisInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const all = Object.values(s.analyses);
  const blame = all.filter(a => blamesPerson(a.rootCause));
  if (blame.length) out.push({ key: 'blame', tone: 'bad', title: 'Cause racine à vérifier', text: `${blame.map(a => a.ref).join(', ')} : la cause semble viser une personne. Qu'est-ce qui, dans le poste, la méthode ou l'outil, a rendu l'erreur possible ?` });
  const toAct = all.filter(a => analysisState(s, a, today) === 'to_act');
  if (toAct.length) out.push({ key: 'act', tone: 'bad', title: 'Contre-mesure à décider', text: `${toAct.map(a => a.ref).join(', ')} : cause trouvée, aucune action. Une action physique sous 7 jours ouvrés.` });
  const slow = all.filter(a => slowActions(s, a).length);
  if (slow.length) out.push({ key: 'slow', tone: 'warn', title: 'Contre-mesure trop lointaine', text: `${slow.map(a => a.ref).join(', ')} : échéance à plus de 7 jours ouvrés après l'atelier.` });
  const weak = all.filter(a => actionsOfAnalysis(s, a.id).some(x => x.plan.some(p => weakAction(p.text))));
  if (weak.length) out.push({ key: 'weak', tone: 'warn', title: 'Contre-mesure fragile', text: `${weak.map(a => a.ref).join(', ')} : un rappel ou une consigne n'empêche pas l'erreur. Préférer une butée, un gabarit, un blocage (outil 5.4).` });
  const failed = all.filter(a => analysisState(s, a, today) === 'failed');
  if (failed.length) out.push({ key: 'failed', tone: 'bad', title: 'Récidive', text: `${failed.map(a => a.ref).join(', ')} : le défaut est revenu (contrôle J+30 ou nouvelle fiche au même poste). Reprendre l'analyse.` });
  const toOpen = workshopsToOpen(s, today);
  if (toOpen.length) out.push({ key: 'open', tone: 'warn', title: 'Ateliers à ouvrir', text: `${toOpen.slice(0, 3).map(x => `${x.ref} (${x.why})`).join(', ')}${toOpen.length > 3 ? ` et ${toOpen.length - 3} autre(s)` : ''}.` });
  return out;
}

