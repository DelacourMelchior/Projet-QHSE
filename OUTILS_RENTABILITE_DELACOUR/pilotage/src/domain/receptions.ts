// Tool 3.4 "Réceptions": checks at the milestones of an order, release before departure, delivery and acceptance report (PV) with its reservations,
// refusals, signatures and lock, deliveries in several times (lots), the facts of an order and its life. Pure functions (they return the new order and never
// change the one given), covered by receptions.test.ts. The tasks, the summary and the indicators are in receptionsAll.ts and receptionsFeeds.ts. No amount
// is read or written here (the field `reception.amount` of old data is only kept). Messages state facts and give no order.
// The PV signed is the proof: its content is locked (takeLife, correctLocked), sealed (SHA-256, sealContent) and the gestures that change the proof carry a person and a
// line of the journal that is never dropped (proof lines).
import type { Delivery, Lot, Milestone, MilestoneEvent, MilestoneTemplate, Nc, Params, Presentation, Reception, ReceptionReserve, ShipCheck, State, Strokes } from './types';
import { DEFAULT_PARAMS, addDays, businessOf, defaultProcess, nb, newId, nowLocal, type Business } from './base';
import { frDate, isoDate, parseDate } from './periods';
import { norm } from './text';
import { newNc } from './newNc';
import { sha256 } from './sha256';

// "2 jours": the number and the word of its agreement (under 2, 0 included, the word is singular). Applied to ONE word or to the group that carries the agreement ("réserve non levée", "réserves non levées"):
// `many` is given whenever it is not the word with an "s" (never "2 autre tâches": "autre tâche", "autres tâches").
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n >= 2 ? many : one}`;
// The first letter in lower or upper case: a label said in the middle of a sentence, or at the start of one
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// "de Antoine" is "d'Antoine": the name of a person after "de" (a vowel or an h, a name starting with an h being taken as one)
export const de = (name: string): string => (/^[aeiouyhàâäéèêëîïôöùûüœæ]/i.test(name.trim()) ? `d'${name.trim()}` : `de ${name.trim()}`);
// What the screens of 3.4 say of a day and of a moment: "4 oct.", "4 oct. 2025" (the year only when it is not the one of `now`), "4 oct. à 9 h 05" (never "09 h 05"); '' when there is no day.
// The documents (PV, PDF, printed sheet) keep "04/10/2026 à 9 h 05" (atFr, receptionsPdf.ts).
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export function rcDay(iso: string | undefined, now = new Date()): string {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m && +m[2] >= 1 && +m[2] <= 12 ? `${+m[3]}\u00A0${MONTHS[+m[2] - 1]}${+m[1] === now.getFullYear() ? '' : ` ${m[1]}`}` : '';
}
export function rcMoment(iso: string | undefined, now = new Date()): string {
  const day = rcDay(iso, now), t = String(iso || '').match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/);
  return day && t ? nb(`${day} à ${+t[1]} h ${t[2]}`) : day;
}
// A reservation in a sentence: its words between quotes, or "sans texte (photo seule)" when only a photo was taken (never a made-up text between quotes)
export const reserveWords = (text: string | undefined): string => (text?.trim() ? `« ${text.trim()} »` : 'sans texte (photo seule)');
export const OTHER = 'Autre';
const day = (at: string) => at.slice(0, 10);
// A text read for a guard of proof: a person or a reason that is not a text (a caller that forgot it) is empty, and the guard returns the order as it was
const trimmed = (x: unknown): string => (typeof x === 'string' ? x.trim() : '');
const inked = (s: Strokes | undefined) => !!s?.some(x => x.length);
// Quantities: a quantity with decimals is compared at 6 digits (0,8 - 0,7 - 0,1 is 0, never 1,1e-16), a negative or damaged one is read as nothing, and every text says it with the French comma
const round = (n: number): number => Math.round(n * 1e6) / 1e6;
const pos = (n: number | null | undefined): number | null => (n == null ? null : n > 0 ? n : 0);
export const frQty = (n: number): string => n.toLocaleString('fr-FR', { maximumFractionDigits: 6 });
// A drawing worth a signature: at least 5 points, 2 of them apart, and a line of 40 units or more on the pad of 300 x 100 (a tap, a dot or a scribble in place is not one)
export function signatureOk(s: Strokes | undefined): boolean {
  const lines = Array.isArray(s) ? s.filter(Array.isArray) : [], pts = lines.flat().filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const length = lines.reduce((n, l) => n + l.slice(1).reduce((m, p, i) => m + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0), 0);
  return pts.length >= 5 && new Set(pts.map(p => `${p[0]},${p[1]}`)).size >= 2 && length >= 40;
}
// Keys of `o` that are set (a value of `undefined` never overwrites)
const defined = <T extends object>(o: T): { [K in keyof T]?: Exclude<T[K], undefined> } => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as never;
const pick = <T extends object, K extends keyof T>(o: T, ks: readonly K[]): Pick<T, K> => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]])) as Pick<T, K>;
const drop = <T extends object>(o: T, ks: readonly string[]): T => { const c = { ...o } as Record<string, unknown>; ks.forEach(k => { delete c[k]; }); return c as unknown as T; };

// ---- settings of the tool and the neutral lists ("Autre" asks to specify)
export const DEFAULT_REFUSALS = ['Non conforme à la commande', 'Dégât constaté à la livraison', 'Quantité incorrecte', 'Documents manquants', 'Livraison hors du délai convenu', OTHER];
export const DEFAULT_NEXTS = ['À reprendre et livrer à nouveau', 'À remplacer', OTHER];
export const DEFAULT_SHIP_CHECKS = ['Documents remis', 'Quantité ou livrables'];
export function receptionCfg(p: Params) {
  const c = p.reception || {};
  const list = (own: string[] | undefined, dflt: string[]) => [...(own?.length ? own : dflt).filter(x => x.trim() && norm(x) !== norm(OTHER)), OTHER];
  return {
    liftDays: c.liftDays ?? 7, liftBusiness: c.liftBusiness ?? !!p.businessHours, retention: { on: c.retention?.on ?? false, maxPct: c.retention?.maxPct ?? 5 },
    refusals: list(c.refusals, DEFAULT_REFUSALS), nexts: list(c.nexts, DEFAULT_NEXTS), releasers: (c.releasers ?? []).filter(x => x.trim()),
    shipChecks: (c.shipChecks?.length ? c.shipChecks : DEFAULT_SHIP_CHECKS).filter(x => x.trim()), unsignedDays: c.unsignedDays ?? 2,
  };
}

// ---- the milestones of a model: neutral for any trade; the four of the first version (metalwork) are kept for the examples and the old data
type Def = MilestoneTemplate['milestones'][number];
export const DEFAULT_MILESTONES: Def[] = [
  { label: 'Préparation', point: 'Informations, moyens et éléments nécessaires réunis', requirement: 'Tout est disponible avant de commencer' },
  { label: 'Réalisation', point: 'Travail réalisé selon la commande', requirement: 'Conforme à la commande et aux consignes' },
  { label: 'Contrôle final', point: 'Vérification complète avant la remise', requirement: 'Aucun écart constaté' },
  { label: 'Remise', point: 'Livrable propre, complet et conditionné', requirement: 'Documents et accessoires joints' },
];
export const LEGACY_MILESTONES: Def[] = [
  { label: 'Débit matière', point: 'Cotes hors tout et équerrage', requirement: '± 0,5 mm selon le plan' },
  { label: 'Assemblage', point: 'Cordons de soudure, montage', requirement: 'Aucune fissure, aucun manque' },
  { label: 'Finition', point: 'Épaisseur et adhérence de la peinture', requirement: 'Épaisseur au moins 80 microns' },
  { label: 'Libération finale', point: 'Propreté, accessoires, emballage', requirement: 'Notice jointe, aucune rayure' },
];
export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  { name: 'Standard', milestones: DEFAULT_MILESTONES },
  { name: 'Fabrication', milestones: [
    { label: 'Éléments reçus', point: 'Matières et pièces reçues', requirement: 'Conformes à la commande' },
    { label: 'Fabrication', point: 'Pièces fabriquées', requirement: 'Conformes aux plans et aux consignes' },
    { label: 'Contrôle final', point: 'Cotes principales et aspect', requirement: 'Dans les tolérances, aucun défaut visible' },
    { label: 'Conditionnement', point: 'Protection et identification', requirement: 'Étiquette présente, aucune dégradation' },
  ], shipChecks: ['Emballage', 'Identification et étiquetage', 'Accessoires et notices', 'Quantité chargée'] },
  { name: 'Chantier ou pose', milestones: [
    { label: 'Implantation', point: 'Repères, cotes et alignements', requirement: "Conformes au plan d'exécution" },
    { label: 'Pose ou mise en œuvre', point: 'Fixations, aplomb, étanchéité', requirement: 'Selon la notice et les règles de l\'art' },
    { label: 'Finitions', point: 'Aspect, joints, retouches', requirement: 'Aucun défaut visible à 1 m' },
    { label: 'Nettoyage et remise', point: 'Zone propre, déchets évacués', requirement: 'Zone libérée, notices remises' },
  ], shipChecks: ['Matériel repris', 'Documents remis', 'Accès rendu'] },
  { name: 'Prestation ou service', milestones: [
    { label: 'Cadrage', point: 'Besoin et livrables validés', requirement: 'Compte rendu validé par le client' },
    { label: 'Réalisation', point: 'Travaux conformes au cahier des charges', requirement: "Point d'étape fait" },
    { label: 'Relecture', point: 'Contrôle par un second intervenant', requirement: 'Aucune remarque bloquante' },
    { label: 'Livraison', point: 'Livrables remis et expliqués', requirement: 'Accusé de réception du client' },
  ] },
  { name: 'Revente ou négoce', milestones: [
    { label: 'Réception de la marchandise', point: 'Références et quantités reçues', requirement: "Conformes à la commande d'achat" },
    { label: 'Conformité', point: 'Désignation, état, aspect', requirement: 'Conformes à la commande du client' },
    { label: 'Quantité', point: 'Quantité comptée', requirement: 'Égale à la quantité commandée' },
    { label: 'Conditionnement', point: 'Emballage et protection', requirement: 'Aucun dégât, étiquette présente' },
  ], shipChecks: ['Quantité', 'Conditionnement', 'Documents joints'] },
  { name: 'Intervention', milestones: [
    { label: 'Prise en charge', point: 'Demande comprise, accès et consignes confirmés', requirement: 'Confirmés avec le client' },
    { label: 'État des lieux', point: "État avant l'intervention constaté", requirement: 'Photo ou compte rendu' },
    { label: 'Intervention', point: 'Travaux réalisés', requirement: 'Conformes à la demande' },
    { label: 'Vérification et remise', point: 'Fonctionnement vérifié, lieu rangé', requirement: 'Constat remis au client' },
  ] },
];
// Built-in models, then the older format of the settings, then the models of the company; a name given twice keeps its place and the last version
export function templatesOf(p: Params): MilestoneTemplate[] {
  const by = new Map<string, MilestoneTemplate>();
  [...MILESTONE_TEMPLATES, ...(p.milestoneTemplates || []), ...(p.reception?.templates || [])].filter(t => norm(t.name)).forEach(t => by.set(norm(t.name), t));
  return [...by.values()];
}

// ---- creation: empty, from a model, from a won quote, copy of another (the copy keeps what was typed, never the life)
const blankReception = (): Reception => ({ date: '', name: '', role: '', result: '', reserve: '', retentionPct: null, amount: null, liftedAt: '' });
const freshMilestone = (m: Def): Milestone => ({
  id: newId('ms'), label: m.label, point: m.point, requirement: m.requirement, measured: '', ok: null, by: '', date: '',
  ...pick(m, ['unit', 'min', 'max', 'refPhoto', 'critical', 'sopId']),
});
const freshShip = (label: string, i: number): ShipCheck => ({ id: `sc_${i}`, label, ok: null, by: '', at: '' });
export function deliveryFromTemplate(t: MilestoneTemplate): Delivery {
  return {
    id: newId('dl'), ref: '', client: '', item: '', qty: null, template: t.name, milestones: t.milestones.map(freshMilestone), releasedBy: '', releasedAt: '', reception: blankReception(),
    ...(t.shipChecks?.some(x => x.trim()) ? { shipChecks: t.shipChecks.filter(x => x.trim()).map(freshShip) } : {}),
  };
}
export const newDelivery = (p?: Params): Delivery => deliveryFromTemplate(p ? templatesOf(p)[0] : MILESTONE_TEMPLATES[0]);
// The day the quote promises: the day of the decision + the weeks, when both are known, else ''
export const quotePromisedOn = (s: Pick<State, 'quotes'>, quoteId?: string): string => {
  const q = quoteId && Object.hasOwn(s.quotes, quoteId) ? s.quotes[quoteId] : undefined;
  return q?.decidedAt && q.weeks != null && q.weeks > 0 ? addDays(day(q.decidedAt), Math.round(q.weeks * 7)) : '';
};
// The one promised day everyone reads: the day of the order when it has one, else the one of its quote, else ''. A quote that changes its weeks never rewrites a day already given.
export const promisedOn = (s: Pick<State, 'quotes'>, d: Pick<Delivery, 'promisedAt' | 'quoteId'>): string => d.promisedAt || quotePromisedOn(s, d.quoteId);
// Client, object and promised day (day of the decision + weeks of the quote, when both are known); never the amount
export function deliveryFromQuote(s: State, quoteId: string, p?: Params): Delivery {
  const q = Object.hasOwn(s.quotes, quoteId) ? s.quotes[quoteId] : undefined, d = newDelivery(p), promisedAt = quotePromisedOn(s, quoteId);
  return q ? { ...d, quoteId, client: q.client, item: q.object, ...(promisedAt ? { promisedAt } : {}) } : d;
}
export const RECEPTION_CONTENT_KEYS = ['name', 'role', 'place', 'email', 'orgId', 'contactId', 'bl'] as const;
// What a copy or the next delivery keeps of the person who receives: the delivery note number belongs to one delivery only
const KEPT_KEYS = RECEPTION_CONTENT_KEYS.filter(k => k !== 'bl');
export function duplicateDelivery(src: Delivery): Delivery {
  const d = newDelivery();
  return {
    ...d, ...pick(src, ['client', 'item', 'qty', 'template', 'orgId', 'contactId', 'material']), ...(src.team ? { team: [...src.team] } : {}),
    milestones: src.milestones.map(m => ({ ...freshMilestone(m), ...pick(m, ['instrumentId', 'na', 'naReason']) })),
    ...(src.shipChecks ? { shipChecks: src.shipChecks.map(c => ({ id: c.id, label: c.label, ok: null, by: '', at: '' })) } : {}),
    reception: { ...d.reception, ...pick(src.reception, KEPT_KEYS) },
  };
}
// Older orders: stable ids for the milestones (by position: the one id every screen and every task of 3.4 gives to a milestone that has none), the single reservation becomes the first of `reserves`; read twice it changes nothing more
export const idOf = (m: Milestone, i: number) => m.id ?? `ms_legacy_${i}`;
// The single reservation of the first versions: written (a text or a lift) while `reserves` is not
const hasLegacy = (r: Reception) => r.reserves === undefined && r.result === 'reserve' && !!(r.reserve?.trim() || r.liftedAt);
const legacyReserve = (d: Presentation): ReceptionReserve => {
  const r = d.reception;
  return {
    id: 'rv_legacy', text: r.reserve, raisedAt: r.date,
    ...(r.liftedAt ? { liftedAt: r.liftedAt, ...(d.liftSignedBy ? { liftedBy: d.liftSignedBy } : {}), ...(d.liftPhoto ? { liftPhoto: d.liftPhoto } : {}) } : {}),
  };
};
// An order read from outside (an import, a file edited by hand) may be incomplete or damaged: it gets the shape the screens read (lists that are lists, records that are records,
// texts that are texts), what is sound is kept as it is, and reading it never fails. A list or a drawing that is absent stays absent; one that is not what it should be goes.
const isRec = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const recs = (v: unknown): Record<string, any>[] => (Array.isArray(v) ? v.filter(isRec) : []);
const texts = <T extends object>(o: T, ks: string[]): T => ({ ...o, ...Object.fromEntries(ks.filter(k => typeof (o as Record<string, unknown>)[k] !== 'string').map(k => [k, ''])) });
const soundMs = (ms: unknown): Milestone[] => recs(ms).map((m, i) => ({
  ...texts(m, ['label', 'point', 'requirement', 'measured', 'by', 'date']), ...(m.history != null ? { history: recs(m.history) } : {}), id: m.id ? m.id : idOf(m as Milestone, i),
})) as Milestone[];
const soundRec = (r: unknown): Reception => {
  const re = isRec(r) ? texts(r, ['date', 'name', 'role', 'result', 'reserve']) : blankReception();
  return (re.reserves != null ? { ...re, reserves: recs(re.reserves).map(x => texts(x, ['text', 'raisedAt'])) } : re) as Reception;
};
// What a delivery under way and a closed one hold alike
const soundOf = (p: Record<string, any>): Record<string, any> => {
  const o: Record<string, any> = { ...p, milestones: soundMs(p.milestones), reception: soundRec(p.reception) };
  (['shipChecks', 'releaseSign', 'signCompany', 'signClient'] as const).forEach(k => { if (!Array.isArray(o[k])) delete o[k]; else o[k] = k === 'shipChecks' ? recs(o[k]) : o[k].filter(Array.isArray); });
  return o;
};
export function upgradeDelivery(d0: Delivery): Delivery {
  const o = texts(soundOf(isRec(d0) ? d0 : {}), ['ref', 'client', 'item', 'releasedBy', 'releasedAt']);
  const lots = Array.isArray(o.lots) ? recs(o.lots).map((l, i) => ({ ...soundOf(l), no: Number.isFinite(l.no) ? l.no : i + 1 })) : undefined;
  if (lots) o.lots = lots; else delete o.lots;
  if (Array.isArray(o.journal)) o.journal = recs(o.journal); else delete o.journal;
  if (Array.isArray(o.team)) o.team = o.team.filter((x: unknown) => typeof x === 'string'); else delete o.team;
  return { ...o, reception: hasLegacy(o.reception) ? { ...o.reception, reserves: [legacyReserve(o as Presentation)] } : o.reception } as Delivery;
}

// ---- the journal of the order (newest last): at most 300 lines of noise, the proof lines (signature, release, derogation, lift, refusal, milestone withdrawn or "not applicable", correction, seal) are never dropped
export function logDelivery(d: Delivery, by: string, at: string, text: string, proof?: boolean): Delivery {
  const all = [...(d.journal ?? []), { at, by, text: nb(text), ...(proof ? { proof: true } : {}) }];
  let extra = all.filter(x => !x.proof).length - 300;
  return { ...d, journal: extra > 0 ? all.filter(x => x.proof || extra-- <= 0) : all };
}
const logged = (d: Delivery, by: string, at: string, text: string): Delivery => logDelivery(d, by, at, text, true);

// ---- milestones
export type MilestoneStatus = 'todo' | 'ok' | 'reworked' | 'ko' | 'na';
// `reworked`: conform after a failed check of its history
export function milestoneStatus(m: Milestone): MilestoneStatus {
  if (m.na) return 'na';
  if (m.ok == null) return 'todo';
  return !m.ok ? 'ko' : m.history?.some(e => e.ok === false) ? 'reworked' : 'ok';
}
// A number read in the value, comma of the French notation included ("12,5 mm" is 12.5, "1 250" is 1250), the typographic minus and the en dash read as the minus sign
const readNumber = (t: string | undefined): number | null => {
  const m = String(t ?? '').replace(/[\u2212\u2013]/g, '-').replace(/(\d{1,3})[\s  ](?=\d{3}(?!\d))/g, '$1').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
};
export function outOfBounds(m: Milestone, value?: string): boolean {
  const v = readNumber(value ?? m.measured);
  return v !== null && ((m.min != null && v < m.min) || (m.max != null && v > m.max));
}
// The bounds of a checked milestone are no longer the ones it was checked against (said as a fact; its result stays as it was)
export function boundsChanged(m: Milestone): boolean {
  const last = [...(m.history ?? [])].reverse().find(e => (e.kind === 'check' || e.kind === 'rework') && e.ok !== null);
  return !m.na && m.ok != null && !!last && ((last.min ?? null) !== (m.min ?? null) || (last.max ?? null) !== (m.max ?? null));
}
// said in the middle of a sentence ("Dérogation sur jalon 3"), `cap` when it starts one
const mlabel = (m: Milestone | undefined, i: number) => `jalon ${i + 1}${m?.label.trim() ? ` « ${m.label.trim()} »` : ''}`;
const nameOf = (d: Delivery, mid: string) => { const i = d.milestones.findIndex((m, j) => idOf(m, j) === mid); return mlabel(d.milestones[i], i); };
const findMs = (d: Delivery, mid: string) => d.milestones.find((m, i) => idOf(m, i) === mid);
const upMs = (d: Delivery, mid: string, f: (m: Milestone) => Milestone): Delivery => ({ ...d, milestones: d.milestones.map((m, i) => (idOf(m, i) === mid ? f({ ...m, id: idOf(m, i) }) : m)) });
const RELEASE_KEYS = ['releasedMoment', 'releaseSign', 'derogation'];
// Undoes the release (the milestone that was conform is open again or no longer conform) and says it in the journal
const undoRelease = (d: Delivery, by: string, at: string, text: string): Delivery => (d.releasedAt ? logged({ ...drop(d, RELEASE_KEYS), releasedBy: '', releasedAt: '' }, by, at, text) : d);
export interface MilestoneCheck { ok: boolean; measured?: string; by: string; at: string; note?: string; photo?: string; gapPhoto?: string; second?: string; instrumentId?: string }
// The moves on the milestones, the checks before departure and the release do nothing on a signed PV (only `correctLocked` changes it)
// A value out of the bounds is not conform whatever was pressed. Every check is kept in the history (nothing is erased by checking again); a release made before is undone when the milestone is not conform.
// The event of the history keeps the requirement, the bounds and the instrument as they were at the check (the definition may be corrected later). Done twice (same moment, person, result, value and reason), the same check changes nothing more.
export function checkMilestone(d: Delivery, mid: string, r: MilestoneCheck): Delivery {
  const m = findMs(d, mid);
  if (!m || m.na || inert(d) || !trimmed(r.by)) return d;
  const measured = r.measured ?? '', forced = r.ok && outOfBounds(m, measured), ok = r.ok && !forced;
  if (r.ok && (m.min != null || m.max != null) && !measured.trim()) return d;   // bounds and no value: not conform
  const lastDecided = [...(m.history ?? [])].reverse().find(e => e.ok !== null)?.ok;
  const wasFailed = m.ok === false || (m.ok == null && lastDecided === false);
  const note = [r.note?.trim(), forced ? 'mesure hors de la plage attendue' : ''].filter(Boolean).join(' · '), last = m.history?.at(-1);
  if (m.ok === ok && m.measured === measured && m.by === r.by && last && last.at === r.at && (last.kind === 'check' || last.kind === 'rework') && last.ok === ok && (last.note ?? '') === note
    && (['photo', 'gapPhoto', 'second', 'instrumentId'] as const).every(k => r[k] === undefined || r[k] === m[k])) return d;
  const ev: MilestoneEvent = {
    at: r.at, by: r.by, kind: ok && wasFailed ? 'rework' : 'check', ok, measured, ...(note ? { note } : {}), requirement: m.requirement, ...defined({ min: m.min, max: m.max, instrumentId: r.instrumentId ?? m.instrumentId }),
  };
  const out = upMs(d, mid, x => ({
    ...drop(x, ['second', 'waivedBy', 'waivedWhy', 'waivedAt']), ok, by: r.by, date: day(r.at), at: r.at, measured, history: [...(x.history ?? []), ev],
    ...defined({ photo: r.photo, gapPhoto: r.gapPhoto, second: r.second, instrumentId: r.instrumentId }),
  }));
  const name = nameOf(d, mid), what = ok ? (ev.kind === 'rework' ? 'conforme après reprise' : 'conforme') : 'non conforme';
  const text = `${cap(name)} ${what}${measured.trim() ? ` (${measured.trim()}${m.unit && !measured.includes(m.unit) ? ` ${m.unit}` : ''})` : ''}${forced ? ', mesure hors de la plage attendue' : ''}`;
  return logDelivery(ok ? out : undoRelease(out, r.by, r.at, `Libération défaite : ${name} non conforme`), r.by, r.at, text);
}
// The current result is erased, the history stays; a release made before is undone
export function reopenMilestone(d: Delivery, mid: string, by: string, at: string): Delivery {
  const m = findMs(d, mid);
  if (!m || inert(d) || !trimmed(by) || (m.ok == null && !m.waivedBy)) return d;
  const name = nameOf(d, mid), was = m.ok === false ? 'non conforme' : m.ok ? 'conforme' : 'à contrôler';
  const out = upMs(d, mid, x => ({ ...drop(x, ['at', 'second', 'waivedBy', 'waivedWhy', 'waivedAt']), ok: null, by: '', date: '', measured: '', history: [...(x.history ?? []), { at, by, kind: 'reopen', ok: null, measured: x.measured } as MilestoneEvent] }));
  return logged(undoRelease(out, by, at, `Libération défaite : ${name} rouvert`), by, at, `${cap(name)} rouvert (résultat précédent : ${was})`);
}
// Passing over a milestone that is not conform: who, why, when (it unblocks the following ones, the release still says it)
export function waiveMilestone(d: Delivery, mid: string, by: string, why: string, at: string): Delivery {
  const m = findMs(d, mid), reason = trimmed(why);
  if (!m || inert(d) || m.ok !== false || m.waivedBy || !reason || !trimmed(by)) return d;
  const out = upMs(d, mid, x => ({ ...x, waivedBy: by, waivedWhy: reason, waivedAt: at, history: [...(x.history ?? []), { at, by, kind: 'derogation', ok: false, measured: x.measured, note: reason } as MilestoneEvent] }));
  return logged(out, by, at, `Dérogation sur ${nameOf(d, mid)} non conforme : ${reason}`);
}
// The last state of a milestone, in words (said when it is set aside or withdrawn)
const stateOf = (m: Milestone): string => `${m.waivedBy ? 'non conforme, dérogé' : m.ok === false ? 'non conforme' : m.ok ? 'conforme' : 'à contrôler'}${m.measured.trim() ? `, mesuré ${m.measured.trim()}` : ''}${m.by.trim() ? `, par ${m.by.trim()}` : ''}${m.date ? ` le ${frDate(m.date)}` : ''}`;
// "Not applicable": a reason and a person, a line that is kept; a milestone that is not conform and not waived cannot be set aside. Applicable again: the release made while it was set aside is undone when it is to check.
export function setMilestoneNa(d: Delivery, mid: string, reason: string | null, by: string, at: string): Delivery {
  const m = findMs(d, mid), why = trimmed(reason);
  if (!m || inert(d) || !trimmed(by) || (reason !== null && !why)) return d;
  const name = nameOf(d, mid);
  if (reason === null) {
    if (!m.na) return d;
    const out = upMs(d, mid, x => drop(x, ['na', 'naReason']));
    return logged(m.ok === true || m.waivedBy ? out : undoRelease(out, by, at, `Libération défaite : ${name} rendu applicable`), by, at, `${cap(name)} rendu applicable (état : ${stateOf(m)})`);
  }
  if ((m.ok === false && !m.waivedBy) || (m.na && m.naReason === why)) return d;
  return logged(upMs(d, mid, x => ({ ...x, na: true, naReason: why })), by, at, `${cap(name)} sans objet : ${why} (état précédent : ${stateOf(m)})`);
}
// A milestone added after the release and still to check undoes the release (what stands in the way is back), and the journal says it
export function addMilestone(d: Delivery, m: Partial<Milestone> = {}, by = '', at = nowLocal()): Delivery {
  if (inert(d)) return d;
  const out = { ...d, milestones: [...d.milestones, { label: '', point: '', requirement: '', measured: '', ok: null, by: '', date: '', ...m, id: m.id ?? newId('ms') }] }, n = out.milestones.length;
  const added = logDelivery(out, by, at, `Jalon ${n}${m.label?.trim() ? ` « ${m.label.trim()} »` : ''} ajouté`);
  return m.ok === true || m.na ? added : undoRelease(added, by, at, `Libération défaite : ${mlabel(out.milestones[n - 1], n - 1)} ajouté, à contrôler`);
}
// Withdrawn with a person and a line that says its last state; refused for a milestone that is not conform and not waived, or that has a defect (5.1) without decision: a defect is looked for in `s` when given, else any defect declared from it counts
export function removeMilestone(d: Delivery, mid: string, by: string, at: string, s?: State): Delivery {
  const m = findMs(d, mid);
  if (!m || inert(d) || !trimmed(by) || (m.ok === false && !m.waivedBy)) return d;
  if (m.ncId && (!s || undecided(ncOf(s, m.ncId)))) return d;
  const name = nameOf(d, mid);
  return logged({ ...d, milestones: d.milestones.filter((x, i) => idOf(x, i) !== mid) }, by, at, `${cap(name)} retiré (dernier état : ${m.na ? `sans objet${m.naReason ? ` : ${m.naReason}` : ''}` : stateOf(m)}${m.history?.length ? `, ${plural(m.history.length, 'contrôle')} dans l'historique` : ''})`);
}
export function moveMilestone(d: Delivery, mid: string, dir: -1 | 1, by = '', at = nowLocal()): Delivery {
  const i = d.milestones.findIndex((m, j) => idOf(m, j) === mid), j = i + dir;
  if (inert(d) || i < 0 || j < 0 || j >= d.milestones.length) return d;
  const ms = [...d.milestones];
  [ms[i], ms[j]] = [ms[j], ms[i]];
  return logDelivery({ ...d, milestones: ms }, by, at, `Jalon ${i + 1}${d.milestones[i].label.trim() ? ` « ${d.milestones[i].label.trim()} »` : ''} déplacé en position ${j + 1}`);
}
// `total` leaves out the milestones that do not apply
export function milestoneProgress(d: Delivery): { done: number; total: number; ko: number; na: number } {
  const on = d.milestones.filter(m => !m.na);
  return { done: on.filter(m => m.ok === true).length, total: on.length, ko: on.filter(m => m.ok === false).length, na: d.milestones.length - on.length };
}
export const blockedAt = (d: Delivery): Milestone | undefined => d.milestones.find(m => !m.na && m.ok === false && !m.waivedBy);

// ---- links with the red bin (5.1): one defect per milestone or reservation, remembered on it
const orderLabel = (d: Delivery) => [d.item, d.ref, d.client].filter(Boolean).join(', ');
// `where` of a defect of a milestone is the deliverable of the order (else its number): the label of a milestone ("Contrôle final") is not a place, and the same label on unrelated orders made 5.3 read them as one repeated defect
// The number of the defect and its moment are those of the gesture (`now`: the instant of the tap, the clock of the device when it is not given), never the clock read inside
export function ncFromMilestone(s: State, d: Delivery, m: Milestone, by: string, now = new Date()): Nc {
  return {
    ...newNc(s, by, now), where: d.item.trim() || d.ref.trim(), item: orderLabel(d), description: `${m.point} : ${m.measured || 'non conforme'} (exigence : ${m.requirement})`, processId: defaultProcess('P3'),
    deliveryId: d.id, ...(m.id ? { milestoneId: m.id } : {}), ...(m.gapPhoto ? { photo: m.gapPhoto } : {}),
  };
}
export function ncFromReserve(s: State, d: Delivery, r: ReceptionReserve, by: string, now = new Date()): Nc {
  return { ...newNc(s, by, now), where: r.where || 'Réception', item: orderLabel(d), description: r.text, processId: defaultProcess('P3'), origin: 'client', deliveryId: d.id, reserveId: r.id, ...(r.photo ? { photo: r.photo } : {}) };
}
// The defect a milestone or a reservation points at: none declared, there, or declared but no longer in 5.1 (deleted there): a link to a defect that is gone is no link
export const ncLinkState = (s: State, id?: string): 'none' | 'ok' | 'missing' => (!id ? 'none' : ncOf(s, id) ? 'ok' : 'missing');
// Already linked to a defect that exists: nothing changes (the screen opens that defect again). With `s` (the state the new defect was written in), a link to a defect that was deleted in 5.1 is
// replaced: the journal says it is declared again; without `s` the link is never replaced.
const stays = (s: State | undefined, linked: string | undefined, ncId: string): boolean => !!linked && (linked === ncId || !s || ncLinkState(s, linked) === 'ok');
export function linkMilestoneNc(d: Delivery, mid: string, ncId: string, by = '', at = nowLocal(), s?: State): Delivery {
  const m = findMs(d, mid);
  return !m || stays(s, m.ncId, ncId) ? d : logDelivery(upMs(d, mid, x => ({ ...x, ncId })), by, at, `Défaut déclaré${m.ncId ? ' à nouveau' : ''} depuis ${nameOf(d, mid)}${m.ncId ? " (le défaut lié n'existe plus dans 5.1)" : ''}`);
}
export function linkReserveNc(d: Delivery, rid: string, ncId: string, by = '', at = nowLocal(), s?: State): Delivery {
  const sp = spotOf(d, rid);
  return !sp || stays(s, sp.rv.ncId, ncId) ? d : logDelivery(mapReserve(d, sp, x => ({ ...x, ncId })), by, at, `Défaut déclaré${sp.rv.ncId ? ' à nouveau' : ''} depuis la réserve ${reserveWords(sp.rv.text)}${lotTag(d, sp)}${sp.rv.ncId ? " (le défaut lié n'existe plus dans 5.1)" : ''}`);
}
// An id is read as an own key: `constructor` or `toString` are not defects
export const ncOf = (s: State, id?: string): Nc | undefined => (id && Object.hasOwn(s.ncs, id) ? s.ncs[id] : undefined);
const undecided = (n: Nc | undefined): boolean => !!n && (!n.decision || n.decision === 'attente');
// ---- link with the maintenance (3.3), read only (the equipments are never written here): the breakdowns that touched an order, with the equipment, the moment (start of the breakdown, else its day) and the id, oldest first
export function breakdownsTouching(s: State, d: Delivery): { equipmentName: string; at: string; id: string }[] {
  return Object.values(s.equipments ?? {}).flatMap(e => (e.breakdowns ?? []).filter(b => b.deliveryIds?.includes(d.id)).map(b => ({ equipmentName: e.name, at: b.startedAt || b.date, id: b.id })))
    .sort((a, b) => a.at.localeCompare(b.at));
}

// ---- release before departure
export const mayRelease = (p: Params, name: string): boolean => { const l = receptionCfg(p).releasers; return !l.length || l.some(x => norm(x) === norm(name)); };
// A milestone passed over (waived) counts as lifted: the waiver is the decision, it is said as a fact on the release (`waivedFacts`) and asks no second reason
const milestoneWhy = (d: Delivery): string[] => d.milestones.flatMap((m, i) => (m.na || m.waivedBy ? [] : m.ok === false ? [nb(`${cap(mlabel(m, i))} non conforme${m.date ? ` depuis le ${frDate(m.date)}` : ''}`)] : m.ok == null ? [`${cap(mlabel(m, i))} à contrôler`] : []));
export const waivedFacts = (d: Delivery): string[] => d.milestones.flatMap((m, i) => (!m.na && m.ok === false && m.waivedBy ? [nb(`${cap(mlabel(m, i))} dérogé par ${m.waivedBy}${m.waivedWhy ? ` : ${m.waivedWhy}` : ''}`)] : []));
// What stands in the way, as facts: milestones not conform or still to check, a check before departure not conform, defects of 5.1 declared for this order from a milestone (even a milestone
// withdrawn since) without decision (a waived milestone no longer stands in the way). A defect that is no longer in 5.1 stands in no one's way: `notes` says it (the key is absent when there is none).
export function canRelease(s: State, d: Delivery): { ok: boolean; why: string[]; notes?: string[] } {
  const here = new Set(d.milestones.map((m, i) => idOf(m, i))), seen = new Set<string>();
  const defects = [
    ...d.milestones.flatMap((m, i) => { const n = ncOf(s, m.ncId); return undecided(n) ? (seen.add(n!.id), [`Défaut ${n!.ref} du jalon ${i + 1} sans décision`]) : []; }),
    ...Object.values(s.ncs).filter(n => n.deliveryId === d.id && n.milestoneId && !seen.has(n.id) && undecided(n)).map(n => `Défaut ${n.ref} ${here.has(n.milestoneId!) ? 'd\'un jalon' : 'd\'un jalon retiré'} sans décision`),
  ];
  const ship = shipChecksOf(d, s.params).filter(c => !c.na && c.ok === false).map(c => `Contrôle de départ « ${c.label} » non conforme`);
  const why = [...milestoneWhy(d), ...ship, ...defects].map(nb), notes = d.milestones.flatMap((m, i) => (ncLinkState(s, m.ncId) === 'missing' ? [nb(`${cap(mlabel(m, i))} : défaut lié introuvable dans 5.1`)] : []));
  return { ok: !why.length, why, ...(notes.length ? { notes } : {}) };
}
// A person who controlled or waived a milestone that stood in the way, and releases it by derogation: said as a fact on the release (`derogationFacts`)
const sameAsControl = (d: Delivery, by: string): boolean => d.milestones.some(m => !m.na && (m.ok === false || m.waivedBy) && [m.by, m.waivedBy, ...(m.history ?? []).map(e => e.by)].some(x => x && norm(x) === norm(by)));
// Refused when something stands in the way and no derogation (who, why) is given; `s` also checks the defects. Released once: nothing changes when it already is.
// A release with a milestone waived keeps the derogation: the reason given, else the waivers themselves (who and why), said as facts. The derogation says whether the person had controlled or waived herself (`sameAsControl`).
// A release recorded after the delivery says it in the journal.
export function releaseDelivery(d: Delivery, r: { by: string; at: string; sign?: Strokes; derogation?: { why: string } }, s?: State): Delivery {
  if (inert(d) || d.releasedAt || !trimmed(r.by)) return d;
  const why = s ? canRelease(s, d).why : milestoneWhy(d), reason = trimmed(r.derogation?.why);
  if (why.length && !reason) return d;
  const facts = [...why, ...waivedFacts(d)].map(lc), said = reason || facts.join(' ; ');
  const out: Delivery = {
    ...drop(d, RELEASE_KEYS), releasedBy: r.by, releasedAt: day(r.at), releasedMoment: r.at, ...(inked(r.sign) ? { releaseSign: r.sign } : {}),
    ...(facts.length ? { derogation: { by: r.by, why: said, at: r.at, sameAsControl: sameAsControl(d, r.by) } as NonNullable<Delivery['derogation']> } : {}),
  };
  const after = d.reception.date && releasedAfterDelivery(out) ? ` ; enregistrée après la livraison du ${frDate(d.reception.date)}` : '';
  return logged(out, r.by, r.at, `Libérée par ${r.by}${facts.length ? ` par dérogation : ${said}${reason ? ` (${facts.join(' ; ')})` : ''}` : ''}${after}`);
}
// A release by derogation or a waiver of a milestone stands in the journal: it stays there when the release is undone (the derogation of the order goes) and made again without one
export const derogationLogged = (d: Pick<Delivery, 'journal'>): boolean => !!d.journal?.some(e => /^(Libérée par .+ par dérogation\s:\s|Dérogation sur )/.test(e.text));
// The release is dated after the delivery (the day, or the hour when both are given)
export function releasedAfterDelivery(d: Presentation): boolean {
  const re = d.reception, at = d.releasedMoment ?? d.releasedAt;
  if (!re.date || !at) return false;
  return at.length > 10 && re.time ? at.slice(0, 16) > `${re.date}T${re.time}` : at.slice(0, 10) > re.date;
}
// What the screen and the PV say of the authorisation to release, as facts: the same person controlled, waived and released; a critical milestone without a second person; a person outside the list
// of those who release (when the settings are given)
export function derogationFacts(d: Delivery, p?: Params): string[] {
  if (!d.releasedAt) return [];
  const g = d.derogation as (Delivery['derogation'] & { sameAsControl?: boolean }) | undefined, who = d.releasedBy.trim();
  return [
    ...(g?.sameAsControl ? [`${g.by} a contrôlé ou passé outre un jalon de cette commande et la libère par dérogation`] : []),
    ...d.milestones.flatMap((m, i) => (m.critical && !m.na && m.ok != null && !m.second?.trim() ? [`${cap(mlabel(m, i))} critique : pas de second contrôleur indiqué`] : [])),
    ...(p && who && !mayRelease(p, who) ? [`${who} : personne hors de la liste des personnes qui libèrent`] : []),
  ].map(nb);
}
export function unreleaseDelivery(d: Delivery, by: string, why: string, at: string): Delivery {
  const reason = trimmed(why);
  return !inert(d) && d.releasedAt && reason && trimmed(by) ? undoRelease(d, by, at, `Libération annulée par ${by} : ${reason}`) : d;
}
// The checks before departure: the list of the settings until one is touched
export const shipChecksOf = (d: Delivery, p: Params): ShipCheck[] => d.shipChecks ?? receptionCfg(p).shipChecks.map(freshShip);
export function setShipCheck(d: Delivery, id: string, ok: boolean | null, by: string, at: string, na?: boolean, p: Params = DEFAULT_PARAMS): Delivery {
  const list = shipChecksOf(d, p), c = list.find(x => x.id === id);
  if (!c || inert(d)) return d;
  if (na ? c.na : ok === null ? c.ok === null && !c.na : c.ok === ok && !c.na) return d;   // already so: done twice, nothing more
  const base = drop(c, ['na']), next: ShipCheck = na ? { ...base, ok: null, na: true, by, at } : ok === null ? { ...base, ok: null, by: '', at: '' } : { ...base, ok, by, at };
  return logDelivery({ ...d, shipChecks: list.map(x => (x.id === id ? next : x)) }, by, at, `Contrôle de départ « ${c.label} » : ${na ? 'sans objet' : ok === null ? 'à contrôler' : ok ? 'conforme' : 'non conforme'}`);
}

// ---- reservations (several per delivery, each with its own deadline and lift)
// Older data hold a single reservation in `reception.reserve`; it is read as the first one until upgradeDelivery writes it.
// `reservesOf` is the delivery under way (or one closed lot given as is); `allReservesOf` and `openReserves` are every delivery of the order: the reservations of a closed delivery stay to follow.
export const reservesOf = (d: Presentation): ReceptionReserve[] => d.reception.reserves ?? (hasLegacy(d.reception) ? [legacyReserve(d)] : []);
// A reservation of a REFUSED delivery is kept (nothing is deleted) and flagged `refused`: it is no longer followed (`openReserves` leaves it out: not open, not late, not counted)
export type ReserveAt = ReceptionReserve & { lotNo: number; refused?: true };
export const allReservesOf = (d: Delivery): ReserveAt[] =>
  [...lotsOf(d).map(l => ({ p: l as Presentation, no: l.no })), { p: d as Presentation, no: presentationNo(d) }]
    .flatMap(x => reservesOf(x.p).map(r => ({ ...r, lotNo: x.no, ...(x.p.reception.result === 'refus' ? { refused: true as const } : {}) })));
export const openReserves = (d: Delivery): ReserveAt[] => allReservesOf(d).filter(r => !r.liftedAt && !r.refused);
const setReserves = (d: Delivery, reserves: ReceptionReserve[]): Delivery => ({ ...d, reception: { ...d.reception, reserves } });
// Where a reservation is: in the delivery under way (`lot` -1) or in a closed delivery (its index in `lots`); a closed delivery is never changed, a reservation of it is still followed and lifted
type Spot = { lot: number; rv: ReceptionReserve };
const spotOf = (d: Delivery, rid: string): Spot | undefined => {
  const now = reservesOf(d).find(x => x.id === rid);
  if (now) return { lot: -1, rv: now };
  const lot = lotsOf(d).findIndex(l => reservesOf(l).some(x => x.id === rid));
  return lot < 0 ? undefined : { lot, rv: reservesOf(lotsOf(d)[lot]).find(x => x.id === rid)! };
};
// `f` gives the new reservation, or null to remove it
const mapReserve = (d: Delivery, sp: Spot, f: (r: ReceptionReserve) => ReceptionReserve | null): Delivery => {
  const list = reservesOf(sp.lot < 0 ? d : lotsOf(d)[sp.lot]).flatMap(x => (x.id !== sp.rv.id ? [x] : f(x) ?? []));
  return sp.lot < 0 ? setReserves(d, list) : { ...d, lots: lotsOf(d).map((l, i) => (i === sp.lot ? { ...l, reception: { ...l.reception, reserves: list } } : l)) };
};
const lotTag = (d: Delivery, sp: Spot) => (sp.lot < 0 ? '' : ` (livraison ${lotsOf(d)[sp.lot].no})`);
const frozen = (d: Delivery, sp: Spot) => sp.lot >= 0 || inert(d);
// What the lift of a reservation reads of the settings (the delay, and whether it counts working days): not the whole `receptionCfg` (its lists are rebuilt at each call)
const NO_DAYS: readonly string[] = [];
const liftOf = (p: Params): { days: number; business: Business } => ({ days: p.reception?.liftDays ?? 7, business: (p.reception?.liftBusiness ?? !!p.businessHours) ? p.closedDays || NO_DAYS : false });
const isOff = (iso: string, b: Business) => { const g = parseDate(iso)?.getDay(); return b !== false && (g === 0 || g === 6 || (Array.isArray(b) && b.includes(iso))); };
// ---- days counted without a loop (a day is a whole number: the days since 1970-01-01, so that a week is 7 of them and holds 2 days off whatever the day it starts)
const DAY = 86400000, GUARD = 4000;   // GUARD: the longest span counted (a date that went wrong never makes a count that does not end)
const dayNo = (iso: string): number => { const d = parseDate(iso); return d ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY : NaN; };
const isoOfDay = (n: number): string => { const d = new Date(n * DAY); return isoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const weekend = (n: number): boolean => { const g = (((n + 4) % 7) + 7) % 7; return g === 0 || g === 6; };   // 1970-01-01 is a Thursday
// The days off of the settings that fall on a working day, as day numbers (a closed day is read as written: only "2026-05-01", never "2026-5-1" or a day with an hour), in order; kept for the list given
const closedCache = new WeakMap<readonly string[], number[]>();
const closedOf = (b: readonly string[]): number[] => {
  let c = closedCache.get(b);
  if (!c) { c = [...new Set(b.map(x => [x, dayNo(x)] as const).filter(([x, n]) => !Number.isNaN(n) && isoOfDay(n) === x && !weekend(n)).map(([, n]) => n))].sort((x, y) => x - y); closedCache.set(b, c); }
  return c;
};
// The working days in ]a, z]: the days between, less the 2 days off of each whole week, those of the rest, and the closed days
const worked = (a: number, z: number, b: Business): number => {
  const n = z - a;
  if (b === false || n <= 0) return Math.max(n, 0);
  let w = n - 2 * Math.floor(n / 7);
  for (let r = n % 7, x = a + 1 + 7 * Math.floor(n / 7); r > 0; r--, x++) if (weekend(x)) w--;
  if (Array.isArray(b)) for (const c of closedOf(b)) if (c > a && c <= z) w--;
  return w;
};
// `n` days after `iso`, working days only when the calendar says so: the n-th working day is the first day that has n working days behind it (each step moves by what is still missing, never past it)
function shiftDays(iso: string, n: number, b: Business): string {
  const k = Math.min(Math.ceil(n), GUARD), a = dayNo(iso);
  if (!(k > 0)) return iso;
  if (Number.isNaN(a)) return '';
  let z = a + k;
  for (let w = worked(a, z, b); w < k; w = worked(a, z, b)) z += k - w;
  return isoOfDay(Math.min(z, a + GUARD));
}
// Day the reservation must be lifted: the one typed, else the reception day plus the delay of the settings (working days or calendar days)
export function reserveDue(r: ReceptionReserve, d: Delivery, p: Params): string {
  const from = r.raisedAt || d.reception.date, lift = liftOf(p);
  return r.dueAt || (from ? shiftDays(from, lift.days, lift.business) : '');
}
// A day that falls on a day off is due the first working day after it; days past it up to `end` (working days only when the calendar says so, 0 when on time, and 0 when a day is not a day: the loop counted 4 000 of them)
const pastDays = (due: string, end: string, b: Business): number => {
  const a = dayNo(isOff(due, b) ? shiftDays(due, 1, b) : due), z = dayNo(end);
  return Number.isNaN(a) || Number.isNaN(z) ? 0 : worked(a, Math.min(z, a + GUARD), b);
};
// Days past the deadline up to today (up to the day of the lift for a reservation lifted); 0 when on time
export function reserveLateDays(r: ReceptionReserve, d: Delivery, p: Params, today: Date): number {
  const due = reserveDue(r, d, p);
  return due ? pastDays(due, r.liftedAt || isoDate(today), liftOf(p).business) : 0;
}
// The delays of a delivery and of a PV, counted as the company calendar counts its days (working days, or calendar days when it has none): days past `due` up to `today`, and `n` days after a day
export const daysLate = (due: string, today: string, p: Params): number => pastDays(due, today, businessOf(p));
export const afterDays = (iso: string, n: number, p: Params): string => { const b = businessOf(p); return shiftDays(isOff(iso, b) ? shiftDays(iso, 1, b) : iso, n, b); };
// The deadline is written when the reservation is made (`p` given): a later change of the settings never moves a deadline already given; without `p` it is read by reserveDue
export function addReserve(d: Delivery, r: { text: string; photo?: string; where?: string; severity?: 'minor' | 'blocking'; dueAt?: string; by: string; at: string }, p?: Params): Delivery {
  if (inert(d) || !d.reception.date || (!r.text.trim() && !r.photo)) return d;   // a reservation belongs to a delivery that was made: before it, nothing could lift it
  const rv: ReceptionReserve = { id: newId('rv'), text: r.text.trim(), raisedAt: day(r.at), severity: r.severity ?? 'minor', ...defined({ photo: r.photo, where: r.where, dueAt: r.dueAt }) };
  const due = p && !rv.dueAt ? reserveDue(rv, d, p) : '';
  if (due) rv.dueAt = due;
  return logDelivery(setReserves(d, [...reservesOf(d), rv]), r.by, r.at, `Réserve ajoutée${rv.severity === 'blocking' ? ' (bloquante)' : ''} : ${reserveWords(rv.text)}`);
}
const FROZEN = ['text', 'photo', 'where', 'severity', 'raisedAt'];
// What was written on a signed PV (text, photo, place, gravity) is not changed here; who takes charge and the deadline are. A deadline changes with a person and a reason: the journal says from what to what
// (a line that is kept), and a PV already sealed gets its new seal.
export function patchReserve(d: Delivery, rid: string, patch: Partial<ReceptionReserve>, by = '', at = nowLocal(), why = ''): Delivery {
  const sp = spotOf(d, rid);
  if (!sp) return d;
  const rv = sp.rv, reason = trimmed(why), dueMoved = patch.dueAt !== undefined && patch.dueAt !== rv.dueAt, noDue = dueMoved && (!reason || !trimmed(by));
  const body = Object.fromEntries(Object.entries(defined(patch)).filter(([k]) => k !== 'id' && !(frozen(d, sp) && FROZEN.includes(k)) && !(k === 'dueAt' && noDue))) as Partial<ReceptionReserve>;
  const out = mapReserve(d, sp, x => ({ ...x, ...body }));
  const handler = body.handler !== undefined && body.handler !== rv.handler ? `prise en charge par ${body.handler || 'personne'}` : '';
  const out2 = handler ? logDelivery(out, by, at, `Réserve ${reserveWords(rv.text)} : ${handler}${lotTag(d, sp)}`) : out;
  if (!dueMoved || noDue) return out2;
  const from = rv.dueAt ?? '', to = body.dueAt ?? '', verb = !to ? 'remise au délai des réglages' : !from ? 'fixée' : to > from ? 'repoussée' : 'avancée';
  const line = `Réserve ${reserveWords(rv.text)} : échéance ${verb}${from ? ` du ${frDate(from)}` : ''}${to ? ` au ${frDate(to)}` : ''} : ${reason}${lotTag(d, sp)}`;
  return resealed(d, logged(out2, by, at, line), by, at, 'échéance de réserve modifiée');
}
export function repairReserve(d: Delivery, rid: string, r: { at: string; by?: string; photo?: string }): Delivery {
  const sp = spotOf(d, rid);
  if (!sp || sp.rv.liftedAt || (sp.rv.repairedAt && (!r.photo || r.photo === sp.rv.repairPhoto))) return d;   // already repaired: done twice, nothing more
  const out = mapReserve(d, sp, x => ({ ...x, repairedAt: day(r.at), ...(r.photo ? { repairPhoto: r.photo } : {}), ...(r.by && !x.handler ? { handler: r.by } : {}) }));
  return logDelivery(out, r.by ?? '', r.at, `Reprise faite pour la réserve ${reserveWords(sp.rv.text)}${lotTag(d, sp)}`);
}
// A reservation cannot be lifted before the reception of ITS delivery (the one under way, or a closed one), nor at an instant that has not come (the clock of the device, a minute of margin);
// without the signature of the customer it needs a photo, a note or the name of the person on the customer side (`pour`). `at` is the moment of the fact, the line of the journal carries the moment
// of the writing (`now`: the clock of the device when it is not given); `by` is the person of the company who records it, never the one who stated the lift: the line says "enregistrée par",
// then the person on the customer side and the note when they are given.
export function liftReserve(d: Delivery, rid: string, r: { at: string; by: string; note?: string; pour?: string; photo?: string; sign?: Strokes; now?: string }): Delivery {
  const sp = spotOf(d, rid), rec = sp ? (sp.lot < 0 ? d : lotsOf(d)[sp.lot]).reception.date : '', now = r.now ?? nowLocal(), pour = trimmed(r.pour), note = trimmed(r.note);
  if (!sp || sp.rv.liftedAt || !rec || day(r.at) < rec || !trimmed(r.by) || r.at.slice(0, 16) > nowLocal(new Date(new Date(now.length > 10 ? now : `${now}T23:59`).getTime() + 60_000)) || !(inked(r.sign) || r.photo || note || pour)) return d;
  const said = [pour && `Constatée côté client par ${pour}`, note].filter(Boolean).join(' · ');
  const out = mapReserve(d, sp, x => ({ ...x, liftedAt: day(r.at), liftedBy: r.by, ...(said ? { liftNote: said } : {}), ...defined({ liftPhoto: r.photo }), ...(inked(r.sign) ? { liftSign: r.sign } : {}) }));
  return logged(out, r.by, now, `Réserve ${reserveWords(sp.rv.text)} levée enregistrée par ${r.by.trim()}${pour ? `, constatée côté client par ${pour}` : ''}${note ? ` : ${note}` : ''}${day(r.at) !== day(now) ? ` (fait le ${frDate(day(r.at))})` : ''}${lotTag(d, sp)}`);
}
export function removeReserve(d: Delivery, rid: string, by = '', at = nowLocal()): Delivery {
  const sp = spotOf(d, rid);
  return !sp || frozen(d, sp) ? d : logDelivery(mapReserve(d, sp, () => null), by, at, `Réserve retirée : ${reserveWords(sp.rv.text)}`);
}

// ---- reception, refusal, signatures, seal and lock
const RESULT_LABEL: Record<Reception['result'], string> = { '': 'aucun', sans: 'sans réserve', reserve: 'avec réserve', refus: 'refusée' };
const moment = (at: string) => ({ date: day(at), ...(at.length > 10 ? { time: at.slice(11, 16) } : {}) });
// The delivery is made: the order becomes "Livrée, PV à signer". Asked again, the first moment stays (the place may be given later).
export function startReception(d: Delivery, r: { at: string; place?: string; by?: string }): Delivery {
  if (inert(d)) return d;
  const fresh = !d.reception.date, out = { ...d, reception: { ...d.reception, ...(fresh ? moment(r.at) : {}), ...defined({ place: r.place }) } };
  return fresh ? logDelivery(out, r.by ?? '', r.at, `Livraison chez le client${r.place?.trim() ? ` (${r.place.trim()})` : ''}`) : out;
}
export const setReceptionist = (d: Delivery, patch: { name?: string; role?: string; orgId?: string; contactId?: string; email?: string; bl?: string }): Delivery => (inert(d) ? d : { ...d, reception: { ...d.reception, ...defined(patch) } });
// The quantities of this delivery (presented, counted: `null` empties one) and the agreement of the customer to be delivered in several times (`true` records who and when, `false` takes it back):
// a person, a line of the journal (the agreement is a proof line), nothing on a signed PV; what is already so changes nothing more.
export function setQuantities(d: Delivery, q: { qty?: number | null; count?: number | null; partialOk?: boolean }, by: string, at: string): Delivery {
  const re = d.reception, num = (v: unknown) => v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
  if (inert(d) || !trimmed(by) || !num(q.qty) || !num(q.count)) return d;
  const qty = q.qty !== undefined && !same(re.qty ?? null, q.qty), count = q.count !== undefined && !same(re.count ?? null, q.count), agree = q.partialOk !== undefined && !!re.partialOk !== q.partialOk;
  if (!qty && !count && !agree) return d;
  const rest = drop(re, agree && !q.partialOk ? ['partialOk'] : []);
  const out: Delivery = { ...d, reception: { ...rest, ...(qty ? { qty: q.qty } : {}), ...(count ? { count: q.count } : {}), ...(agree && q.partialOk ? { partialOk: { by, at } } : {}) } };
  const lines = [...(qty ? [`Quantité livrée : ${q.qty == null ? 'tout le reste de la commande' : frQty(q.qty)}`] : []), ...(count ? [`Quantité comptée : ${q.count == null ? 'non comptée' : frQty(q.count)}`] : [])];
  const noted = lines.length ? logDelivery(out, by, at, lines.join(' ; ')) : out;
  return agree ? logged(noted, by, at, `Livraison en plusieurs fois : accord du client ${q.partialOk ? 'enregistré' : 'retiré'}`) : noted;
}
// The photos of the state at delivery, the whole list as it becomes: a person, a line of the journal (added, withdrawn or replaced), nothing on a signed PV; the same list changes nothing more.
export function setStatePhotos(d: Delivery, photos: string[], by: string, at: string): Delivery {
  const was = d.reception.photos ?? [];
  if (inert(d) || !trimmed(by) || !Array.isArray(photos) || photos.some(x => typeof x !== 'string' || !x) || same(was, photos)) return d;
  const reception = photos.length ? { ...d.reception, photos } : drop(d.reception, ['photos']);
  return logDelivery({ ...d, reception }, by, at, `Photo de l'état à la livraison ${photos.length > was.length ? 'ajoutée' : photos.length < was.length ? 'retirée' : 'remplacée'}`);
}
export const pvSigned = (d: Presentation): boolean => inked(d.signClient) || !!d.pvPhoto || !!d.reception.noSign;
// Locked: the result is given and the PV is signed (customer, photo of the paper PV, or the mention absent / refused). Only `correctLocked` changes it.
export const isLocked = (d: Presentation): boolean => !!d.reception.result && pvSigned(d);
// The moves of the life of an order do nothing on a locked PV (only `correctLocked` changes it) nor on an archived order (restored first); the reservations of an archived order are still lifted
const inert = (d: Delivery): boolean => isLocked(d) || !!d.archivedAt;

// ---- the seal: SHA-256 of everything the PV prints (the order, the milestones with their definitions, results and history, the checks before departure, the release and its derogation,
// the reception with its reservations as they were written, the signatures and their moments, the closed deliveries), laid when the PV becomes locked and again after each correction.
// What happens to a reservation after the PV (the lift, the repair, who takes charge, a defect declared) is not part of it: it is the follow-up, said apart. The seal is not a certificate:
// whoever recomputes everything can seal again; it shows that a copy that left the device (paper, PDF, photo) no longer matches what is kept.
const canon = (v: unknown): string => JSON.stringify(v, (_, x) => (isRec(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
export const AFTER_PV = ['liftedAt', 'liftedBy', 'liftNote', 'liftPhoto', 'liftSign', 'repairedAt', 'repairPhoto', 'handler', 'ncId'];
const sealedPart = (p: Presentation) => ({
  milestones: p.milestones.map(m => drop(m, ['ncId'])), reception: { ...drop(p.reception, ['seals', 'liftedAt']), ...(p.reception.reserves ? { reserves: p.reception.reserves.map(r => drop(r, AFTER_PV)) } : {}) },
  ...pick(p, ['releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'signCompany', 'signClient', 'pvPhoto']),
});
export const sealContent = (d: Delivery): string => canon({
  ...pick(d, ['id', 'ref', 'client', 'item', 'qty', 'promisedAt', 'lot', 'serial', 'material', 'orgId', 'contactId']), ...sealedPart(d),
  lots: lotsOf(d).map(l => ({ id: l.id, no: l.no, closedAt: l.closedAt, ...sealedPart(l) })),
});
export const sealOf = (d: Delivery): string => sha256(sealContent(d));
// `none`: no seal laid (a PV signed before the seals, or not signed); `intact`: the content is the one of the last seal; `modified`: it is not
export function sealState(d: Delivery): 'none' | 'intact' | 'modified' {
  const seals = d.reception.seals, last = Array.isArray(seals) ? seals.at(-1) : undefined;
  return !last ? 'none' : last.hash === sealOf(d) ? 'intact' : 'modified';
}
// A closed delivery read as if it were the root of the order, as it stood when it was signed: the identity of the order, the deliveries closed before it, its own content
export const lotView = (d: Delivery, lot: Lot): Delivery => ({ ...drop(d, PRESENTATION_KEYS), ...pick(lot, PRESENTATION_KEYS), id: d.id, lots: lotsOf(d).filter(l => l.no < lot.no) });
// What the seal of a closed delivery says now (the number of the delivery, from 1; the delivery under way, or a number that does not exist, is read by `sealState`)
export function lotSealState(d: Delivery, no: number): 'none' | 'intact' | 'modified' {
  const lot = lotsOf(d).find(l => l.no === no);
  return lot ? sealState(lotView(d, lot)) : sealState(d);
}
// The first 12 characters, by groups of 4: "3a7f 9c21 04be"
export const shortSeal = (hash: string): string => (hash.slice(0, 12).match(/.{1,4}/g) ?? []).join(' ');
const sealed = (d: Delivery, by: string, at: string, why?: string): Delivery => {
  const hash = sealOf(d);
  return logged({ ...d, reception: { ...d.reception, seals: [...(Array.isArray(d.reception.seals) ? d.reception.seals : []), { hash, at, by, ...(why ? { why } : {}) }] } }, by, at, `Scellé SHA-256 posé : ${shortSeal(hash)}${why ? ` (${why})` : ''}`);
};
// A move that changes what is sealed (a deadline moved, the company signs, the number of the PV is given late): a PV that was intact gets its new seal
const resealed = (before: Delivery, after: Delivery, by: string, at: string, why: string): Delivery => (before.reception.seals?.length && sealState(before) === 'intact' ? sealed(after, by, at, why) : after);
// The identity of the order is part of what each closed delivery sealed: a correction of it lays the seal of every closed delivery that was signed again, with the same reason and a line of the journal
// each (the delivery is named); one that no longer matched its seal says so, as the current delivery does.
const resealLots = (before: Delivery, after: Delivery, by: string, at: string, why: string): Delivery => lotsOf(after).reduce((out, l) => {
  if (!isLocked(l)) return out;
  const hash = sealOf(lotView(out, l)), seals = Array.isArray(l.reception.seals) ? l.reception.seals : [];
  if (seals.at(-1)?.hash === hash) return out;
  const text = `${why}${seals.length && lotSealState(before, l.no) === 'modified' ? ' ; le contenu ne correspondait plus au scellé précédent' : ''}`;
  const lots = lotsOf(out).map(x => (x.no === l.no ? { ...x, reception: { ...x.reception, seals: [...seals, { hash, at, by, why: text }] } } : x));
  return logged({ ...out, lots }, by, at, `Scellé SHA-256 posé : ${shortSeal(hash)} (livraison ${l.no}, ${text})`);
}, after);
// The deadlines of the reservations are written when the PV locks (the settings may change later)
const freezeDue = (d: Delivery, s?: State): Delivery => (s && d.reception.reserves?.some(r => !r.dueAt)
  ? setReserves(d, d.reception.reserves.map(r => (r.dueAt ? r : { ...r, ...defined({ dueAt: reserveDue(r, d, s.params) || undefined }) }))) : d);
// The PV becomes locked by this move: the number is given (with `s`), the deadlines are written and the seal is laid
const sealOnLock = (before: Delivery, after: Delivery, by: string, at: string, s?: State): Delivery => (isLocked(before) || !isLocked(after) ? after : sealed(freezeDue(s ? assignPvNo(s, after, at) : after, s), by, at));

// A refusal needs its motive (see `refuse`) and "sans réserve" is not possible while a reservation of the delivery is open (the screen says it); nothing changes on a signed PV. With `s`, a result that locks
// the PV (the signature was laid before it) gives the number of the PV and writes the deadlines of the reservations, as the signature does.
export function setResult(d: Delivery, result: Reception['result'], at: string, by = '', s?: State): Delivery {
  const re = d.reception;
  if (inert(d) || re.result === result || (result === 'refus' && !re.refusal) || (result === 'sans' && reservesOf(d).some(r => !r.liftedAt))) return d;
  const reception: Reception = { ...re, result, ...(result && !re.date ? moment(at) : {}), ...(result === 'reserve' && !re.reserves ? { reserves: reservesOf(d) } : {}) };
  return sealOnLock(d, logDelivery({ ...d, reception }, by, at, result ? `Résultat de la réception : ${RESULT_LABEL[result]}` : 'Résultat de la réception retiré'), by, at, s);
}
// A refusal: the motive and, when "Autre" is chosen, what it is; a person. Done twice with the same words it changes nothing more. With `s`, a refusal that locks the PV (already signed) gives its number.
export function refuse(d: Delivery, r: { reason: string; other?: string; next: string; nextOther?: string; photo?: string }, at: string, by: string, s?: State): Delivery {
  if (!trimmed(r.reason) || !trimmed(by) || inert(d) || (r.reason === OTHER && !r.other?.trim()) || (r.next === OTHER && !r.nextOther?.trim())) return d;
  const re = d.reception, refusal = { reason: r.reason, next: r.next, ...defined({ other: r.other, nextOther: r.nextOther, photo: r.photo }) };
  if (re.result === 'refus' && same(re.refusal, refusal)) return d;
  return sealOnLock(d, logged({ ...d, reception: { ...re, result: 'refus', refusal, ...(re.date ? {} : moment(at)) } }, by, at, `Réception refusée : ${r.reason === OTHER ? r.other?.trim() || OTHER : r.reason}`), by, at, s);
}

// ---- signing: what stands in the way is said as facts; the customer, the company, the witness or the photo of the paper PV
// Facts only: nothing released, no milestone checked, no result, a reservation open with the result "without reservation", the clock of the device behind the last act
export function signBlockers(s: State, d: Delivery, now?: Date): string[] {
  const re = d.reception, rv = reservesOf(d), fact = clockFact(s, now);
  return [
    ...(d.releasedAt ? [] : ["Rien n'est libéré"]), ...(d.milestones.some(m => !m.na && m.ok != null) ? [] : ['Aucun jalon applicable contrôlé']), ...(re.result ? [] : ['Aucun résultat de réception']),
    ...(re.result === 'sans' && rv.some(r => !r.liftedAt) ? ['Réserve ouverte avec résultat « sans réserve »'] : []), ...(re.result === 'reserve' && !rv.length ? ['Résultat « avec réserve » sans réserve écrite'] : []), ...(fact ? [fact] : []),
  ].map(nb);
}
// The clock of the device is behind the latest act recorded (any journal of any order): the moment of a signature would not be credible
export function clockFact(s: State, now = new Date()): string {
  const last = Object.values(s.deliveries).flatMap(d => d.journal ?? []).reduce((m, e) => (/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(e.at) && e.at.slice(0, 16) > m ? e.at.slice(0, 16) : m), ''), here = nowLocal(now);
  return last && here < last ? nb(`L'horloge de cet appareil (${rcMoment(here, now)}) est antérieure au dernier acte enregistré (${rcMoment(last, now)}) : l'heure des signatures ne serait pas crédible`) : '';
}
// The person who allows a signature although something stands in the way (before the signature: a signed PV is not waived afterwards); the PV says it
export function signWaiver(d: Delivery, by: string, why: string, at: string): Delivery {
  const reason = trimmed(why), w = d.reception.signWaiver;
  if (!trimmed(by) || !reason || inert(d) || (w && w.by === by && w.why === reason)) return d;
  return logged({ ...d, reception: { ...d.reception, signWaiver: { by, why: reason, at } } }, by, at, `Signature autorisée par ${by} malgré ce qui s'y oppose : ${reason}`);
}
const stopped = (d: Delivery, s?: State): boolean => !!s && !d.reception.signWaiver && signBlockers(s, d).length > 0;
// The photo of the paper PV is already the one of another order (or of another delivery of this one): said as a fact, empty when not
export function photoReuse(s: State, ref: string, id: string): string {
  const o = ref ? Object.values(s.deliveries).find(x => [...(x.id === id ? [] : [x]), ...lotsOf(x)].some(p => p.pvPhoto === ref)) : undefined;
  return o ? `Cette photo est déjà utilisée par la commande ${o.ref.trim() || o.item.trim() || o.id}` : '';
}
// The shape of a drawing, whatever its place and its size on the pad (the same trace moved or enlarged is the same trace): its points taken from the corner of its box, in thousandths of its longest side
const shapeOf = (g: Strokes | undefined): string => {
  const lines = (Array.isArray(g) ? g.filter(Array.isArray) : []).map(l => l.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))).filter(l => l.length);
  const xs = lines.flat().map(p => p[0]), ys = lines.flat().map(p => p[1]), [x0, y0] = [Math.min(...xs), Math.min(...ys)], span = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1;
  return lines.length ? JSON.stringify(lines.map(l => l.map(p => [Math.round((p[0] - x0) / span * 1000), Math.round((p[1] - y0) / span * 1000)]))) : '';
};
// The drawing is already a signature of another PV (customer or company, an order or a closed delivery; the delivery under way of `id` is left out): said as a fact, empty when not
export function signatureReuse(s: State, strokes: Strokes, id: string): string {
  const key = shapeOf(strokes);
  const o = key ? Object.values(s.deliveries).find(x => [...(x.id === id ? [] : [x]), ...lotsOf(x)].some(p => [p.signClient, p.signCompany].some(g => shapeOf(g) === key))) : undefined;
  return o ? `Cette signature est identique à celle de la commande ${o.ref.trim() || o.item.trim() || o.id}` : '';
}
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } };
// The customer signs: a person who records it (the person who holds the device), a real drawing, not after a mention "absent / refused". With `s`, what stands in the way (signBlockers) stops it
// unless a waiver was written, nor a drawing that is the signature of another PV (`signatureReuse`). The time zone of the device is kept. A signature drawn again replaces the first one, the journal keeps
// the imprint of the one it replaces; the same drawing twice changes nothing.
export function signClient(d: Delivery, strokes: Strokes, at: string, by: string, s?: State): Delivery {
  const re = d.reception, again = inked(d.signClient);
  if (!trimmed(by) || !signatureOk(strokes) || d.archivedAt || re.noSign || (isLocked(d) && again) || stopped(d, s) || (again && same(d.signClient, strokes)) || (s && signatureReuse(s, strokes, d.id))) return d;
  const name = re.name.trim(), zone = tz(), old = again ? ` ; signature remplacée, empreinte de la précédente : ${shortSeal(sha256(canon(d.signClient)))}` : '';
  const out = logged({ ...d, signClient: strokes, reception: { ...re, signedAt: at, ...(zone ? { signTz: zone } : {}) } }, by, at, `PV signé par le client${name ? ` (${name})` : ''}${old}`);
  return sealOnLock(d, out, by, at, s);
}
export function signCompany(d: Delivery, strokes: Strokes, at: string, by: string, s?: State): Delivery {
  if (!trimmed(by) || !signatureOk(strokes) || d.archivedAt || (isLocked(d) && inked(d.signCompany)) || (inked(d.signCompany) && same(d.signCompany, strokes)) || (s && signatureReuse(s, strokes, d.id))) return d;
  const out = logged({ ...d, signCompany: strokes, reception: { ...d.reception, companySignedAt: at } }, by, at, COMPANY_SIGNED);
  return resealed(d, out, by, at, "signature de l'entreprise");
}
// The line the journal gets when the company signs (receptionsPdf.ts reads it back to name the signer)
const COMPANY_SIGNED = "PV signé pour l'entreprise";
const companySigner = (d: Delivery): string => d.journal?.find(e => e.text === COMPANY_SIGNED && e.at === d.reception.companySignedAt)?.by ?? '';
// The mention of a PV without the signature of the customer, in words: the two usual ones, or what was written for "Autre, précisez"
export const noSignWords = (x: NonNullable<Reception['noSign']>): string => (x.kind === 'absent' ? 'client absent' : x.kind === 'refused' ? 'signature refusée' : x.other?.trim() || 'autre');
// The customer was absent, refused to sign, or could not (`other`, said in words: "Autre, précisez"): a witness is named, who is neither the person who records nor the one who signs for the company; the organisation of the witness is kept
export function setNoSign(d: Delivery, kind: 'absent' | 'refused' | 'other', witness: string, at: string, by: string, witnessOrg?: string, s?: State, other?: string): Delivery {
  const w = trimmed(witness), what = trimmed(other);
  if (!w || !trimmed(by) || d.archivedAt || pvSigned(d) || [by, companySigner(d)].some(x => x && norm(x) === norm(w)) || stopped(d, s) || (kind === 'other' && !what)) return d;
  const org = witnessOrg?.trim() ?? '', noSign: NonNullable<Reception['noSign']> = { kind, ...(kind === 'other' ? { other: what } : {}), witness: w, at, ...(org ? { witnessOrg: org } : {}) };
  const out = logged({ ...d, reception: { ...d.reception, noSign } }, by, at, `PV sans signature du client : ${noSignWords(noSign)} (témoin : ${w}${org ? `, ${org}` : ''})`);
  return sealOnLock(d, out, by, at, s);
}
// Photo of the paper PV signed, with the moment it is attached (the moment of the signature when none is given); an empty reference takes it away (not on a signed PV).
// Added to a PV already signed on the screen, the journal says "after the signature" and the seal is laid again. With `s`: what stands in the way, and a photo already used elsewhere, stop it.
export function setPvPhoto(d: Delivery, ref: string, at: string, by: string, s?: State): Delivery {
  if (!trimmed(by) || d.archivedAt) return d;
  const re = d.reception;
  if (!ref) return d.pvPhoto && !isLocked(d) ? logged({ ...drop(d, ['pvPhoto']), reception: drop(re, re.signedAt && re.signedAt === re.pvPhotoAt ? ['pvPhotoAt', 'signedAt'] : ['pvPhotoAt']) }, by, at, 'Photo du PV papier retirée') : d;
  const late = isLocked(d);
  if (d.pvPhoto === ref || (late && d.pvPhoto) || (s && ((!late && stopped(d, s)) || photoReuse(s, ref, d.id)))) return d;
  const out = logged({ ...d, pvPhoto: ref, reception: { ...re, pvPhotoAt: at, signedAt: re.signedAt || at } }, by, at, `Photo du PV papier signé ajoutée${late ? ' après la signature' : ''}`);
  return late ? resealed(d, out, by, at, 'photo du PV papier ajoutée après la signature') : sealOnLock(d, out, by, at, s);
}

// ---- the only way to change a signed PV: a reason and a person, a line of the journal (a proof line) that says what became what, a new seal
const FIELD: Record<string, string> = {
  date: 'date', time: 'heure', place: 'lieu', name: 'nom', role: 'fonction', email: 'e-mail', result: 'résultat', retentionPct: 'retenue', qty: 'quantité', count: 'quantité comptée',
  bl: 'bon de livraison', reserves: 'réserves', refusal: 'refus', signedAt: 'moment de la signature du client', companySignedAt: "moment de la signature de l'entreprise", noSign: 'absence de signature', pvNo: 'numéro de PV',
};
const ORDER_FIELD = { client: 'client', ref: 'numéro de commande', item: 'livrable', qty: 'quantité commandée', promisedAt: 'date promise', lot: 'lot', serial: 'numéro de série', material: 'matière', orgId: 'client de l\'annuaire', contactId: 'contact de l\'annuaire' } as const;
const MILESTONE_FIELD = { label: 'libellé', point: 'point', requirement: 'exigence', unit: 'unité', min: 'mini', max: 'maxi' } as const;
const ORDER_KEYS = Object.keys(ORDER_FIELD) as (keyof typeof ORDER_FIELD)[];
export type OrderPatch = Partial<Pick<Delivery, keyof typeof ORDER_FIELD>>;
export type MilestonePatch = { id: string; fields: Partial<Pick<Milestone, keyof typeof MILESTONE_FIELD>> };
// The patch may carry reception fields, `order` (customer, number, object, quantity, promised day, lot, serial, material, directory links) and `milestone` (the definition of one milestone).
// Refused (the order is returned): no reason or no person, a result that does not fit (a refusal without its motive, "without reservation" with a reservation open), the reservations (they have their own moves),
// an amount, the seals, a milestone that does not exist, a quantity or a bound that is not a number.
export function correctLocked(d: Delivery, patch: Partial<Reception> & { _why: string; order?: OrderPatch; milestone?: MilestonePatch }, by: string, at: string): Delivery {
  const { _why, amount, order, milestone, ...rest } = patch, fields: Partial<Reception> = rest, why = trimmed(_why), re = d.reception;
  if (!why || !trimmed(by) || amount !== undefined || fields.reserves !== undefined || fields.seals !== undefined) return d;
  if (fields.result !== undefined && fields.result !== re.result && ((fields.result === 'refus' && !(fields.refusal ?? re.refusal)) || (fields.result === 'sans' && reservesOf(d).some(r => !r.liftedAt)))) return d;
  const num = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v)), qtyOk = (v: unknown) => v === null || (num(v) && (v as number) >= 0);
  const o = defined(order ?? {}) as Record<string, unknown>, ms = milestone ? findMs(d, milestone.id) : undefined, f = defined(milestone?.fields ?? {}) as Record<string, unknown>;
  const orderOk = Object.entries(o).every(([k, v]) => k in ORDER_FIELD && (k === 'qty' ? qtyOk(v) : typeof v === 'string')), msOk = Object.entries(f).every(([k, v]) => k in MILESTONE_FIELD && (k === 'min' || k === 'max' ? num(v) : typeof v === 'string'));
  if (!orderOk || (milestone && (!ms || !msOk))) return d;
  const changed = (Object.keys(defined(fields)) as (keyof Reception)[]).filter(k => !same(re[k], fields[k])), ko = Object.keys(o).filter(k => !same(d[k as keyof Delivery], o[k])), kf = Object.keys(f).filter(k => !same(ms![k as keyof Milestone], f[k]));
  if (!changed.length && !ko.length && !kf.length) return d;
  const show = (v: unknown, k: string) => (v === '' || v == null ? '—' : k === 'result' ? RESULT_LABEL[v as Reception['result']] : String(v));
  const what = [
    ...changed.map(k => (typeof re[k] === 'object' || typeof fields[k] === 'object' ? FIELD[k] ?? k : `${FIELD[k] ?? k} ${show(re[k], k)} → ${show(fields[k], k)}`)),
    ...ko.map(k => `${ORDER_FIELD[k as keyof typeof ORDER_FIELD]} ${show(d[k as keyof Delivery], k)} → ${show(o[k], k)}`),
    ...kf.map(k => `${nameOf(d, milestone!.id)} : ${MILESTONE_FIELD[k as keyof typeof MILESTONE_FIELD]} ${show(ms![k as keyof Milestone], k)} → ${show(f[k], k)}`),
  ];
  const reception: Reception = { ...re, ...defined(fields), ...(fields.result === 'reserve' && !re.reserves ? { reserves: reservesOf(d) } : {}) };
  const fixed = logged({ ...d, ...o, reception, ...(kf.length ? { milestones: d.milestones.map((m, i) => (idOf(m, i) === milestone!.id ? { ...m, ...f } : m)) } : {}) }, by, at, `Corrigé : ${what.join(' ; ')} (motif : ${why})`);
  const out = ko.length ? resealLots(d, fixed, by, at, `correction : ${why}`) : fixed, was = d.reception.seals?.length && sealState(d) === 'modified';
  return isLocked(out) ? sealed(out, by, at, `correction : ${why}${was ? ' ; le contenu ne correspondait plus au scellé précédent' : ''}`) : out;
}
// The highest PV number of each year ("2026" -> 14): the counter of the settings (`pvCounter`, which never goes down) and the numbers of the PV present, every delivery and lot counted; a damaged number is ignored
const PV_NO = /^PV-(\d{4})-(\d+)$/;
export function pvIssued(s: Pick<State, 'deliveries' | 'params'>): Record<string, number> {
  const c = s.params?.reception?.pvCounter, out: Record<string, number> = isRec(c) ? Object.fromEntries(Object.entries(c).filter(([, n]) => Number.isInteger(n) && n > 0)) : {};
  for (const d of Object.values(s.deliveries ?? {})) for (const r of [d?.reception, ...(Array.isArray(d?.lots) ? d.lots.map(l => l?.reception) : [])]) {
    const m = typeof r?.pvNo === 'string' ? r.pvNo.match(PV_NO) : null;
    if (m && +m[2] > (out[m[1]] ?? 0)) out[m[1]] = +m[2];
  }
  return out;
}
// PV-2026-014: next number of the year, after the highest one given (counter and PV present): a deleted order, an older backup or a start over never gives a number twice
export const pvNumber = (s: State, year: number): string => `PV-${year}-${String((pvIssued(s)[year] ?? 0) + 1).padStart(3, '0')}`;
// The counter follows the numbers given: raised to the highest PV present. Called on the draft of `update` (the objects of the settings are replaced, never changed in place: the previous state may share them)
export function keepPvCounter(s: State): void {
  const had = pvIssued({ deliveries: {}, params: s.params }), now = pvIssued(s);
  if (Object.entries(now).some(([y, n]) => had[y] !== n)) s.params = { ...s.params, reception: { ...s.params.reception, pvCounter: now } };
}
// A state that takes the place of another (a backup put back, the start over, the example): it keeps the highest number the replaced one had given
export function carryPvCounter(from: State | null | undefined, to: State): State {
  const out = pvIssued(to), had = pvIssued({ deliveries: {}, params: to.params });
  if (from) Object.entries(pvIssued(from)).forEach(([y, n]) => { out[y] = Math.max(out[y] ?? 0, n); });
  return Object.entries(out).every(([y, n]) => had[y] === n) ? to : { ...to, params: { ...to.params, reception: { ...to.params.reception, pvCounter: out } } };
}
// At the signature: the number is given once (the moves that lock the PV give it themselves when `s` is passed to them; given later, a PV already sealed is sealed again).
// The year is the one of the gesture (`at`), else the one of the day of the delivery; the clock is read only when neither is a date.
export function assignPvNo(s: State, d: Delivery, at: string): Delivery {
  if (d.reception.pvNo) return d;
  const year = Number(/^\d{4}/.exec(at)?.[0] ?? /^\d{4}/.exec(d.reception.date)?.[0]) || new Date().getFullYear();
  return resealed(d, { ...d, reception: { ...d.reception, pvNo: pvNumber(s, year) } }, d.reception.seals?.at(-1)?.by ?? '', at, 'numéro de PV attribué');
}

// ---- deliveries in several times: the root holds the delivery under way, `lots` the closed ones (oldest first)
export const lotsOf = (d: Delivery): Lot[] => d.lots ?? [];
export const presentationNo = (d: Delivery): number => lotsOf(d).length + 1;
const received = (r: Reception) => r.result === 'sans' || r.result === 'reserve';
// A reception "with reservations" with a blocking one still open is put off (the PV says so): its quantity is not counted as received until that reservation is lifted
export const counted = (r: Reception) => received(r) && !(r.result === 'reserve' && r.reserves?.some(x => !x.liftedAt && x.severity === 'blocking'));
// The reception is put off (a blocking reservation still open): the one rule that the quantities, the figures, the tasks, the review of the end and the PV all read
export const isPostponed = (d: Pick<Presentation, 'reception'>): boolean => received(d.reception) && !counted(d.reception);
// Every delivery, the current one last, with the quantity it carries (empty = the whole rest of the order)
export function receptionsOf(d: Delivery): { reception: Reception; qty: number | null; closed: boolean }[] {
  let rest = pos(d.qty);
  const all = [...lotsOf(d).map(l => l.reception), d.reception];
  return all.map((reception, i) => {
    const qty = pos(reception.qty) ?? rest;
    if (counted(reception) && qty != null && rest != null) rest = round(Math.max(0, rest - qty));
    return { reception, qty, closed: i < all.length - 1 || !!reception.result };
  });
}
export const qtyReceived = (d: Delivery): number => round(receptionsOf(d).filter(x => counted(x.reception)).reduce((n, x) => n + (x.qty ?? 0), 0));
export const remainingQty = (d: Delivery): number | null => (d.qty == null ? null : Math.max(0, round(d.qty - qtyReceived(d))));
// Received, and nothing left to deliver (an order of unknown quantity is settled by a delivery that carries the whole rest)
export const isSettled = (d: Delivery): boolean => counted(d.reception) && (d.qty == null ? d.reception.qty == null : remainingQty(d) === 0);
const PRESENTATION_KEYS = ['milestones', 'releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'reception', 'signCompany', 'signClient', 'pvPhoto', 'liftPhoto', 'liftSignedBy'] as const;
// Closes the delivery under way (received in part, or refused) into `lots` and opens the next: milestones back to "to check", no release, no result, no signature. The customer and the place stay.
// A delivery received whose PV is not signed is not closed (its PV would never be signed: the closed ones are frozen), unless a waiver was written; a refusal is closed as it is.
export function nextPresentation(d: Delivery, by: string, at: string, qty?: number | null): Delivery {
  const re = d.reception, refused = re.result === 'refus';
  if (d.archivedAt || (!refused && !(received(re) && !isSettled(d))) || (received(re) && !pvSigned(d) && !re.signWaiver)) return d;
  const lot = { id: newId('lt'), no: presentationNo(d), closedAt: at, ...pick(d, PRESENTATION_KEYS) } as Lot, size = qty !== undefined ? qty : refused ? re.qty ?? null : null;
  const out: Delivery = {
    ...drop(d, ['releasedMoment', 'releaseSign', 'derogation', 'signCompany', 'signClient', 'pvPhoto', 'liftPhoto', 'liftSignedBy']), lots: [...lotsOf(d), lot], releasedBy: '', releasedAt: '',
    milestones: d.milestones.map(m => ({ ...drop(m, MILESTONE_LIFE_KEYS), ok: null, by: '', date: '', measured: '' })),
    reception: { ...blankReception(), ...pick(re, [...KEPT_KEYS, 'partialOk']), ...(size != null ? { qty: size } : {}) },
    ...(d.shipChecks ? { shipChecks: d.shipChecks.map(c => ({ id: c.id, label: c.label, ok: null, by: '', at: '' })) } : {}),
  };
  return logDelivery(out, by, at, `${refused ? `Réception refusée à la livraison ${lot.no}` : `Livraison ${lot.no} reçue en partie`} : livraison ${lot.no + 1} ouverte`);
}

// ---- states of an order
export type DeliveryState = 'in_progress' | 'blocked' | 'to_release' | 'released' | 'delivered' | 'accepted' | 'partial' | 'reserve' | 'reserve_late' | 'lifted' | 'refused' | 'archived';
export const DELIVERY_STATE: Record<DeliveryState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  in_progress: { label: 'En cours', tone: 'pending' }, blocked: { label: 'Jalon non conforme', tone: 'alert' }, to_release: { label: 'À libérer', tone: 'warn' },
  released: { label: 'Libérée, à livrer', tone: 'pending' }, delivered: { label: 'Livrée, PV à signer', tone: 'warn' }, accepted: { label: 'Reçue sans réserve', tone: 'ok' },
  partial: { label: 'Livrée en partie', tone: 'warn' }, reserve: { label: 'Réserves à lever', tone: 'warn' }, reserve_late: { label: 'Réserves en retard', tone: 'alert' },
  lifted: { label: 'Réserves levées', tone: 'ok' }, refused: { label: 'Refusée', tone: 'alert' }, archived: { label: 'Archivée', tone: 'pending' },
};
// The delivery under way alone, the reservations of the closed ones left aside (what its milestones, release and reception say): archived, refused, its own reservations
// open (late or not), then received (but in part while quantity is left), delivered without a result, released, then the milestones
export function currentState(d: Delivery, today = new Date(), p: Params = DEFAULT_PARAMS): DeliveryState {
  const re = d.reception, all = reservesOf(d), open = all.filter(r => !r.liftedAt);
  if (d.archivedAt) return 'archived';
  if (re.result === 'refus') return 'refused';
  if (open.length || (re.result === 'reserve' && !all.length)) return open.some(r => reserveLateDays(r, d, p, today) > 0) ? 'reserve_late' : 'reserve';
  if (received(re)) return (remainingQty(d) ?? 0) > 0 ? 'partial' : re.result === 'sans' ? 'accepted' : 'lifted';
  if (re.date) return 'delivered';
  if (d.releasedAt) return 'released';
  if (blockedAt(d)) return 'blocked';
  return d.milestones.every(m => m.na || m.ok === true || (m.ok === false && m.waivedBy)) ? 'to_release' : 'in_progress';
}
// The state of the order: as the delivery under way, but a reservation still open on any delivery (a closed one included) comes before everything except the archive and a refusal
export function deliveryState(d: Delivery, today = new Date(), p: Params = DEFAULT_PARAMS): DeliveryState {
  const own = currentState(d, today, p), open = openReserves(d);
  if (own === 'archived' || own === 'refused' || !open.length) return own;
  return open.some(r => reserveLateDays(r, d, p, today) > 0) ? 'reserve_late' : 'reserve';
}
// The clause of retention is a mention of the contract (never an amount); a percentage above the maximum of the clause is said as a fact
export function retentionFact(d: Delivery, p: Params): string {
  const { retention } = receptionCfg(p), pct = d.reception.retentionPct, fr = (n: number) => n.toLocaleString('fr-FR');
  return retention.on && pct != null && pct > retention.maxPct ? nb(`retenue de ${fr(pct)} % saisie, ${fr(retention.maxPct)} % au maximum prévu`) : '';
}

// A quantity typed in a field, read the same way by every screen: spaces (the thousands, non-breaking ones included) and the French comma are accepted; empty is `null` (nothing typed);
// a text that is not a plain number, a negative one, `1e3` or `0x10` is `undefined` (invalid: the screen keeps the text, says it, and writes nothing)
export function parseQty(text: string): number | null | undefined {
  const t = String(text ?? '').replace(/\s/g, '');
  return t === '' ? null : /^\d+(?:[.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : undefined;
}

// ---- what is typed and what lives apart; archive and deletion
// The checks, the release, the signatures, the lots, the journal and the archive change through their own moves: saving what is typed never overwrites them.
// The milestones keep the structure and the definitions typed; the reception keeps the typed customer and place (RECEPTION_CONTENT_KEYS), the rest is life.
export const LIFE_KEYS = ['releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'signCompany', 'signClient', 'pvPhoto', 'liftPhoto', 'liftSignedBy', 'lots', 'journal', 'archivedAt', 'archivedNote'] as const;
export const MILESTONE_LIFE_KEYS = ['ok', 'by', 'date', 'at', 'measured', 'photo', 'gapPhoto', 'history', 'ncId', 'waivedBy', 'waivedWhy', 'waivedAt', 'second'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// With `base` (the typed copy as it was when it last met the saved order) the typed copy `i` owns only the keys it changed since: the others are read from `f`, the saved one (a key `f` no
// longer has is gone, a key the typed copy emptied is gone too); `life` always comes from `f`. Without `base` the typed copy owns every key but the life.
const mix = <T extends object>(i: T, f: T, b: T | undefined, life: readonly string[], skip: readonly string[] = []): T => {
  const [x, y, z] = [i, f, b].map(o => (o ?? {}) as Record<string, unknown>);
  const pf = pick(f as Record<string, unknown>, life);
  if (!b) return { ...drop(i, life), ...pf } as T;
  const ks = [...new Set([...Object.keys(x), ...Object.keys(y), ...Object.keys(z)])].filter(k => !life.includes(k) && !skip.includes(k));
  return { ...pf, ...Object.fromEntries(ks.flatMap(k => { const v = same(x[k], z[k]) ? y[k] : x[k]; return v === undefined ? [] : [[k, v]]; })) } as T;
};
// A signed PV is never rewritten by a typed copy (an old sheet would put its customer, quantity, promised day, milestone definitions or place over it): the saved order is kept whole,
// whatever was typed; only `correctLocked` changes it, with a reason, a line of the journal and a new seal. The identity of the order (customer, number, object, quantity, promised day, traceability,
// directory) is part of what a signed closed delivery sealed: as soon as one exists it stays as saved, the same way. A quantity typed that is not a number to read is the saved one.
export function takeLife(into: Delivery, from: Delivery | undefined, base?: Delivery): Delivery {
  if (!from) return into;
  if (isLocked(from)) return from;
  const find = (d: Delivery | undefined, m: Milestone, i: number) => d?.milestones.find((x, j) => idOf(x, j) === idOf(m, i));
  const milestones = into.milestones.map((m, i) => { const f = find(from, m, i); return f ? { ...mix(m, f, find(base, m, i), MILESTONE_LIFE_KEYS), ...(f.id ? { id: f.id } : {}) } : m; });
  const content = RECEPTION_CONTENT_KEYS as readonly string[], life = [...new Set([...Object.keys(into.reception), ...Object.keys(from.reception)])].filter(k => !content.includes(k));
  const reception = base ? mix(into.reception, from.reception, base.reception, life) : { ...from.reception, ...pick(into.reception, RECEPTION_CONTENT_KEYS) };
  const out: Delivery = { ...mix(into, from, base, LIFE_KEYS, ['milestones', 'reception']), milestones, reception };
  const kept = lotsOf(from).some(isLocked) ? { ...drop(out, ORDER_KEYS), ...pick(from, ORDER_KEYS) } : out;
  return kept.qty != null && !(kept.qty >= 0) ? { ...kept, qty: from.qty ?? null } : kept;
}
const checked = (d: Delivery) => d.milestones.filter(m => m.ok != null || m.history?.length || m.waivedBy || m.photo || m.gapPhoto).length;
const signatures = (d: Delivery) => (pvSigned(d) ? 1 : 0) + (inked(d.signCompany) ? 1 : 0);
// Deleted only when nothing is lost (nothing checked, released, delivered or signed, no lot, no journal beyond the creation); otherwise archived
export const canDelete = (d: Delivery): boolean => !lostByDeleting(d);
// What forbids deleting an order, as a fact ('' when nothing does): a review of the end (2.4) linked to it (it would be left pointing at nothing), else what would be lost with it
export const deletable = (s: Pick<State, 'feedbacks'>, d: Delivery): string =>
  Object.values(s.feedbacks ?? {}).some(f => f.deliveryId === d.id) ? nb('Un bilan de fin est lié à cette commande : archiver') : lostByDeleting(d);
// The three questions to the customer (2.4) are asked once a delivery was made: before it, the review would carry the day it is typed as the day of the reception
export const canAskFeedback = (d: Delivery): boolean => receptionsOf(d).some(x => !!x.reception.date);
export function lostByDeleting(d: Delivery): string {
  const ship = (d.shipChecks ?? []).filter(c => c.ok != null || c.na).length, log = d.journal?.length ?? 0;
  const parts: [number, string, string?][] = [
    [checked(d), 'jalon contrôlé', 'jalons contrôlés'], [ship, 'contrôle de départ', 'contrôles de départ'], [d.releasedAt ? 1 : 0, 'libération'],
    [d.reception.date || d.reception.result ? 1 : 0, 'réception'], [reservesOf(d).length, 'réserve'], [signatures(d), 'signature'], [lotsOf(d).length, 'livraison close', 'livraisons closes'], [log > 1 ? log : 0, 'ligne de journal', 'lignes de journal'],
  ];
  return parts.filter(x => x[0]).map(x => plural(x[0], x[1], x[2])).join(', ');
}
// Done twice, nothing more: an order already archived keeps its date, an order not archived is not "restored"
export const archiveDelivery = (d: Delivery, at: string, note: string, by = ''): Delivery => (d.archivedAt ? d : logDelivery({ ...d, archivedAt: at, archivedNote: note }, by, at, `Commande archivée${note.trim() ? ` : ${note.trim()}` : ''}`));
export const restoreDelivery = (d: Delivery, by = '', at = nowLocal()): Delivery => (d.archivedAt ? logDelivery(drop(d, ['archivedAt', 'archivedNote']), by, at, 'Commande restaurée') : d);

// ---- completeness of the sheet: what is missing is shown (as a fact), each point leads to its tab
export const RC_TABS = ['order', 'milestones', 'release', 'reception', 'follow'] as const;   // the five tabs of the sheet of an order, in the order they are shown
export type RcTab = (typeof RC_TABS)[number];
export function completeness(d: Delivery): { pct: number; missing: { key: string; label: string; tab: RcTab }[] } {
  const on = d.milestones.filter(m => !m.na), todo = on.filter(m => m.ok == null).length;
  const all: { key: string; label: string; ok: boolean; tab: RcTab }[] = [
    { key: 'client', label: 'Pas encore de client', ok: !!d.client.trim(), tab: 'order' },
    { key: 'item', label: 'Pas encore de livrable', ok: !!d.item.trim(), tab: 'order' },
    { key: 'promisedAt', label: 'Pas de date de livraison promise', ok: !!d.promisedAt, tab: 'order' },
    { key: 'milestones', label: todo === on.length ? 'Aucun jalon contrôlé' : `${plural(todo, 'jalon', 'jalons')} à contrôler`, ok: !todo, tab: 'milestones' },
    { key: 'release', label: 'Pas encore libérée', ok: !!d.releasedAt, tab: 'release' },
    { key: 'result', label: 'Aucun résultat de réception', ok: !!d.reception.result, tab: 'reception' },
    { key: 'signature', label: 'PV non signé', ok: pvSigned(d), tab: 'reception' },
    { key: 'reserves', label: plural(openReserves(d).length, 'réserve non levée', 'réserves non levées'), ok: !openReserves(d).length, tab: 'follow' },
  ];
  return { pct: Math.round(all.filter(x => x.ok).length / all.length * 100), missing: all.filter(x => !x.ok).map(({ key, label, tab }) => ({ key, label, tab })) };
}
