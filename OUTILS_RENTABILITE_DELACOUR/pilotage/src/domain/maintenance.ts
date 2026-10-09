// Tool 3.3 "Maintenance", the routine and the equipment: kinds, models, rhythm and periods of the routine, anomalies, stops and breakdowns, life and retirement,
// links with the other tools, what is left to do and the facts of the routine. The cabinet is in maintenanceSpares.ts, the periodic checks in
// maintenanceChecks.ts, the whole in maintenanceAll.ts. Pure functions, covered by maintenance.test.ts. Messages state facts and give no order
// (only the text of a task of the "À faire" queue is an infinitive).
import type { Action, Anomaly, AnomalySeverity, Breakdown, Checkpoint, EqHelper, Equipment, EquipmentKind, Inspection, Level, MaintTodo, MaintTodoKind, Nc, Params, PointResult, Rhythm, Risk, Sop, State } from './types';
import { addDays, businessOf, daysBetween, formatHours, hoursBetween, newId, nowLocal, parseStamp, sum, type Business, type Insight } from './base';
import { frDate, isoDate, parseDate } from './periods';
import { displayState, habilitated, norm, sopPhase, sopVersion } from './instructions';
import { hoursOf } from './duration';
import { isAbsent } from './commercial';
import { formatValue } from './numbers';
import { nextDue } from './maintenanceChecks';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
// A field that may hold anything (damaged data, a newer version): a text reads as itself, whatever else reads as empty. `dateOf`: a day or a "YYYY-MM-DDTHH:MM" stamp.
export const txt = (x: unknown): string => (typeof x === 'string' ? x : '');
export const dateOf = (x: unknown): string => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x) ? x : '');
const nm = (e: Equipment) => txt(e.name).trim() || 'Équipement sans nom';
const round1 = (n: number) => Math.round(n * 10) / 10;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
// A list read from data that may be damaged: what is not a list reads as empty; an empty slot (null) or a value that is not a record is left out
export const recs = <T,>(x: readonly T[] | undefined | null): T[] => (Array.isArray(x) ? x.filter(r => !!r && typeof r === 'object' && !Array.isArray(r)) : []);
// The points of the routine keep their place (a result is found by its place in the oldest data): an empty slot reads as a point with nothing in it
const pts = (e: Pick<Equipment, 'checkpoints'>): Checkpoint[] => (Array.isArray(e.checkpoints) ? e.checkpoints.map(c => (c && typeof c === 'object' ? c : { label: '', criterion: '' })) : []);
const hoursText = (h: number) => `${formatValue(h, '')} h`;   // "16 h", "8,5 h" (never "16,0 h")
// What an equipment says of its Plan B (1.2) and of its instruction (3.2), read by id from the data: an id that names nothing, or "constructor", gives nothing
const riskOf = (s: Pick<State, 'risks'>, id: string) => (id && Object.hasOwn(s.risks ?? {}, id) ? s.risks[id] : undefined);
const shift = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const OTHER = 'Autre';

// ---- kinds, rhythms and the neutral lists
export const EQ_KINDS: { key: EquipmentKind; label: string }[] = [
  { key: 'machine', label: 'Machine' }, { key: 'vehicle', label: 'Véhicule ou engin' }, { key: 'installation', label: 'Installation ou bâtiment' },
  { key: 'it', label: 'Outil informatique' }, { key: 'instrument', label: 'Instrument de mesure' }, { key: 'other', label: OTHER },
];
export const kindOf = (e: Pick<Equipment, 'kind'>): EquipmentKind => (EQ_KINDS.some(k => k.key === e.kind) ? e.kind! : 'machine');
export const kindLabel = (k: EquipmentKind) => EQ_KINDS.find(x => x.key === k)?.label ?? OTHER;
export const RHYTHMS: { key: Rhythm; label: string }[] = [
  { key: 'day', label: 'Chaque jour' }, { key: 'week', label: 'Chaque semaine' }, { key: 'fortnight', label: 'Toutes les 2 semaines' }, { key: 'month', label: 'Chaque mois' },
];
// What an anomaly is about, and the cause of a breakdown: neutral lists, "Autre" asks to specify (the company may change them in the settings of the tool)
export const DEFAULT_NATURES = ['Bruit', 'Fuite', 'Chaleur', 'Vibration', 'Sécurité', 'Usure visible', 'Fonctionnement', OTHER];
export const DEFAULT_CAUSES = [
  'Usure normale', "Casse d'une pièce", 'Entretien ou lubrification', 'Mauvaise manipulation', 'Alimentation (électricité, air, fluide)',
  'Commande ou électronique', 'Réglage', 'Cause extérieure', OTHER,
];
export function maintCfg(p: Params) {
  const c = p.maint || {};
  const list = (own: string[] | undefined, dflt: string[]) => [...(Array.isArray(own) && own.length ? own : dflt).filter(x => txt(x).trim() && norm(x) !== norm(OTHER)), OTHER];
  const num = (v: number | undefined, dflt: number) => (finite(v) ? v : dflt);   // a number that is not one (NaN, text) falls back to the default
  return { routineDay: num(c.routineDay, 1), soonDays: num(c.soonDays, 30), countDays: num(c.countDays, 30), causes: list(c.causes, DEFAULT_CAUSES), natures: list(c.natures, DEFAULT_NATURES) };
}

// ---- the five points of a new piece of equipment, and the models by kind
export const DEFAULT_CHECKPOINTS: { label: string; criterion: string }[] = [
  { label: "Niveau d'huile ou de fluide", criterion: 'Entre le mini et le maxi de la jauge' },
  { label: 'Pression ou alimentation', criterion: 'Valeur stable, égale à celle du réglage' },
  { label: 'Bruit et vibrations', criterion: 'Fonctionnement régulier, aucun bruit inhabituel' },
  { label: 'Fuites et propreté', criterion: 'Aucun suintement, zone propre' },
  { label: "Arrêts d'urgence et protections", criterion: "Coupure immédiate à l'appui ou à l'ouverture" },
];
export interface EqTemplate { name: string; kind: EquipmentKind; points: { label: string; criterion: string; min?: number; max?: number; unit?: string }[]; safety?: string[] }
// TO BE VALIDATED by a person of the trade: the points, the measured bounds and the safety notes of these models are indicative starting points, written
// from general practice, not from a manufacturer's manual; the company adjusts each point on its own equipment.
export const EQ_TEMPLATES: EqTemplate[] = [
  { name: "Machine d'usinage", kind: 'machine', points: [
    { label: 'Niveau de lubrifiant', criterion: 'Entre le mini et le maxi de la jauge' },
    { label: "Pression d'air", criterion: 'Manomètre dans la plage de réglage', min: 5.5, max: 7, unit: 'bar' },
    { label: 'Bruit et vibrations', criterion: 'Rotation régulière, aucun sifflement ni à-coup' },
    { label: "Déchets d'usinage et fuites au sol", criterion: 'Bacs vidés, aucun suintement' },
    { label: "Arrêts d'urgence et protections", criterion: "Coupure immédiate à l'ouverture de la porte" },
  ], safety: ['Consignation avant toute intervention dans la machine', 'Protections remises en place avant la remise en marche'] },
  { name: 'Presse ou plieuse', kind: 'machine', points: [
    { label: "Niveau d'huile hydraulique", criterion: 'Entre le mini et le maxi de la jauge' },
    { label: 'Pression hydraulique', criterion: 'Conforme à la valeur de réglage du constructeur' },
    { label: 'Outillage (poinçon et matrice)', criterion: 'Bien fixé, sans fissure ni choc visible' },
    { label: 'Barrière de sécurité et protections', criterion: "Mouvement arrêté à l'interruption du faisceau" },
    { label: "Arrêts d'urgence", criterion: "Coupure immédiate à l'appui" },
    { label: "Fuites d'huile", criterion: 'Aucun suintement au sol ni sur les vérins' },
  ], safety: ['Consignation avant toute intervention', 'Coulisseau bloqué mécaniquement avant toute intervention dans la zone'] },
  { name: "Compresseur d'air", kind: 'machine', points: [
    { label: "Niveau d'huile", criterion: 'Entre le mini et le maxi du voyant' },
    { label: 'Purge du condensat', criterion: 'Évacué, aucune eau stagnante' },
    { label: 'Pression de service', criterion: 'Dans la plage de service', min: 6, max: 8, unit: 'bar' },
    { label: 'Température de fonctionnement', criterion: 'Sous la limite du constructeur', max: 90, unit: '°C' },
    { label: "Fuites d'air et bruit", criterion: 'Aucun sifflement, aucune vibration inhabituelle' },
    { label: 'Soupape de sécurité', criterion: 'Plomb intact, aucune fuite' },
  ], safety: ['Réservoir sous pression : purge et consignation avant toute intervention'] },
  { name: 'Chariot élévateur ou engin de levage', kind: 'vehicle', points: [
    { label: 'Charge de la batterie ou niveau de carburant', criterion: 'Suffisant pour la journée' },
    { label: 'Fourches, chaînes et mât', criterion: 'Sans fissure, déformation ni jeu' },
    { label: 'Pneus ou bandages', criterion: 'Sans coupure ni usure excessive' },
    { label: 'Freins et direction', criterion: 'Réponse franche, sans jeu' },
    { label: 'Avertisseur, feux et gyrophare', criterion: 'Tous en état de marche' },
    { label: 'Plaque de charge et ceinture', criterion: 'Plaque lisible, ceinture en état' },
  ], safety: ['Conduite réservée aux personnes autorisées', "Fourches posées au sol avant de quitter l'engin"] },
  { name: 'Véhicule', kind: 'vehicle', points: [
    { label: 'Niveaux (huile, liquide de refroidissement, lave-glace)', criterion: 'Entre le mini et le maxi' },
    { label: 'Pression des pneus', criterion: 'Conforme à la valeur indiquée sur le véhicule' },
    { label: 'Éclairage et signalisation', criterion: 'Tous les feux fonctionnent' },
    { label: 'Freins', criterion: 'Pédale ferme, aucun bruit anormal' },
    { label: 'Propreté et documents à bord', criterion: 'Cabine propre, papiers du véhicule présents' },
  ] },
  { name: 'Cabine ou four', kind: 'installation', points: [
    { label: 'Filtres', criterion: 'Propres, non colmatés' },
    { label: 'Extraction et ventilation', criterion: "Débit d'air normal, aucun bruit anormal" },
    { label: 'Température affichée', criterion: 'Proche de la consigne' },
    { label: 'Joints et portes', criterion: 'Fermeture complète, aucun jeu' },
    { label: 'Détection et extinction incendie', criterion: 'Voyants au vert, extincteur en place' },
    { label: 'Propreté intérieure', criterion: 'Aucun dépôt ni résidu sur les parois' },
  ], safety: ["Atmosphère inflammable : aucune source d'ignition", 'Ventilation en marche avant toute intervention'] },
  { name: 'Groupe froid ou climatisation', kind: 'installation', points: [
    { label: 'Température de la chambre ou du local', criterion: 'Dans la plage de consigne' },
    { label: "Filtres et évaporateur", criterion: 'Sans poussière ni givre épais' },
    { label: 'Givre et condensats', criterion: 'Aucun givre épais, évacuation libre' },
    { label: 'Bruit et vibrations', criterion: 'Régulier, sans bruit métallique' },
    { label: 'Fuite de fluide', criterion: "Aucune trace d'huile sur les raccords" },
    { label: 'Alarmes et voyants', criterion: 'Aucune alarme affichée' },
  ] },
  { name: 'Poste informatique ou serveur', kind: 'it', points: [
    { label: 'Sauvegarde', criterion: 'Dernière sauvegarde terminée sans erreur, datée de moins de 24 h' },
    { label: 'Espace disque libre', criterion: 'Au moins 15 %', min: 15, unit: '%' },
    { label: 'Température du local', criterion: 'Au plus 27 °C', max: 27, unit: '°C' },
    { label: 'Onduleur', criterion: 'Voyant normal, autonomie non dégradée' },
    { label: 'Mises à jour et antivirus', criterion: 'À jour, aucune alerte en attente' },
    { label: 'Voyants et alarmes', criterion: "Aucun voyant d'erreur" },
  ] },
  { name: 'Instrument de mesure', kind: 'instrument', points: [
    { label: 'État physique', criterion: 'Aucun choc, boîtier et pointes intacts' },
    { label: 'Propreté', criterion: 'Surfaces de mesure propres' },
    { label: "Étiquette d'étalonnage", criterion: 'Lisible, date non dépassée' },
    { label: 'Zéro ou lecture sur un étalon', criterion: "Valeur affichée égale à celle de l'étalon" },
    { label: 'Piles ou charge', criterion: 'Niveau suffisant, affichage net' },
    { label: 'Rangement', criterion: 'Dans son étui, à sa place' },
  ] },
];

// ---- creation: empty, from a model, copy of another (the copy keeps what was typed, never the life)
export const newEquipment = (kind: EquipmentKind = 'machine'): Equipment => ({
  id: newId('eq'), name: '', location: '', operator: '', manager: '', riskId: '', kind,
  checkpoints: DEFAULT_CHECKPOINTS.map(c => ({ ...c, id: newId('pt') })), inspections: [], parts: [],
});
export function equipmentFromTemplate(t: EqTemplate): Equipment {
  const e = newEquipment(t.kind);
  return { ...e, name: t.name, checkpoints: t.points.map(p => ({ ...p, id: newId('pt') })), ...(t.safety?.length ? { safety: [...t.safety] } : {}) };
}
export function duplicateEquipment(src: Equipment): Equipment {
  const { tasks, ...c } = structuredClone(src) as Equipment & Record<string, unknown>;
  [...LIFE_KEYS, 'gone', 'pin', 'serial', 'plate'].forEach(k => { delete c[k]; });
  return {
    ...c, id: newId('eq'), name: `${txt(src.name).replace(/ \(copie\)$/, '')} (copie)`, inspections: [], parts: [],
    checkpoints: pts(c).map(p => ({ ...p, id: newId('pt') })),
    // a copied check is never done: its first due date is the next one of the source, so that it does not come out without a date
    ...(tasks ? { tasks: tasks.map(t => { const due = nextDue(src, t), { first: _first, ...rest } = t; return { ...rest, id: newId('tk'), lastDone: '', ...(due ? { first: due } : {}) }; }) } : {}),
  };
}
export type EqStatus = 'service' | 'stopped' | 'retired';
export const eqStatus = (e: Equipment): EqStatus => (txt(e.retiredAt) ? 'retired' : txt(e.stoppedSince) ? 'stopped' : 'service');
// Its stop blocks the activity: what the company ticked, else by kind (a machine, a vehicle, an installation do; a computer tool, an instrument, the rest do not)
export const isBottleneck = (e: Equipment) => e.bottleneck ?? ['machine', 'vehicle', 'installation'].includes(kindOf(e));

// ---- the routine: rhythm and periods
export const routineOf = (e: Equipment, p: Params): { every: Rhythm; day: number } => ({
  every: RHYTHMS.find(r => r.key === e.routine?.every)?.key ?? 'week', day: finite(e.routine?.day) ? e.routine.day : finite(p.maint?.routineDay) ? p.maint.routineDay : 1,   // (as maintCfg, without building its lists: called for every period)
});
const isOff = (d: Date, b: Business) => b !== false && (d.getDay() === 0 || d.getDay() === 6 || (Array.isArray(b) && b.includes(isoDate(d))));
// The period of the routine that holds `today` (back = periods before it). Week: from the last day of the routine, 7 days; two weeks: 14 days counted from the
// Monday 2024-01-01 moved to the day of the routine; month: the calendar month; day: that day, or the last working day when it is off.
export function periodOf(e: Equipment, today: Date, p: Params, back = 0): { from: string; to: string } {
  const { every, day } = routineOf(e, p), t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const offset = (((day - 1) % 7) + 7) % 7;   // 0 = Monday … 6 = Sunday
  if (every === 'month') return { from: isoDate(new Date(t.getFullYear(), t.getMonth() - back, 1)), to: isoDate(new Date(t.getFullYear(), t.getMonth() - back + 1, 0)) };
  if (every === 'day') {
    const biz = businessOf(p);
    let d = t;
    const settle = () => { for (let g = 0; g < 370 && isOff(d, biz); g++) d = shift(d, -1); };
    settle();
    for (let i = 0; i < back; i++) { d = shift(d, -1); settle(); }
    return { from: isoDate(d), to: isoDate(d) };
  }
  if (every === 'fortnight') {
    const anchor = new Date(2024, 0, 1 + offset), n = Math.floor(Math.round((t.getTime() - anchor.getTime()) / 86400000) / 14), from = shift(anchor, 14 * (n - back));
    return { from: isoDate(from), to: isoDate(shift(from, 13)) };
  }
  const from = shift(t, -((((t.getDay() + 6) % 7) - offset + 7) % 7) - 7 * back);
  return { from: isoDate(from), to: isoDate(shift(from, 6)) };
}
export type InspectionState = 'never' | 'ok' | 'due' | 'late' | 'paused';
// "never" is a new piece of equipment as much as a forgotten one, and a late routine is not a danger: amber everywhere (the state, the task, the card)
export const INSPECTION_STATE: Record<InspectionState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  never: { label: 'Première routine à faire', tone: 'warn' }, ok: { label: 'Routine faite', tone: 'ok' }, due: { label: 'Routine à faire', tone: 'warn' },
  late: { label: 'Routine en retard', tone: 'warn' }, paused: { label: 'Routine suspendue', tone: 'pending' },
};
// The day a routine counts for: its own date, except with a daily rhythm where a routine made on a day off counts for the last working day before it
const dayOfRoutine = (e: Equipment, p: Params) => (routineOf(e, p).every !== 'day' ? (i: Inspection) => i.date.slice(0, 10) : (i: Inspection) => { const d = parseDate(i.date); return d ? periodOf(e, d, p).from : i.date; });
// A routine counts once it has a readable date that is not after tomorrow (a phone with a wrong clock, an old copy merged in: such a routine is not yet one)
const countsAt = (today: Date) => { const last = addDays(isoDate(today), 1); return (i: Inspection) => !!dateOf(i.date) && i.date.slice(0, 10) <= last; };
// The routines that count, each with the day it counts for: worked out once per call (with a daily rhythm that day is the costly part, and a period asks for it again)
interface Counted { i: Inspection; day: string }
// (`since`: the routines dated before it are left out; a routine counts for a day that is not after its own date)
const counted = (e: Equipment, p: Params, today: Date, since = ''): Counted[] => {
  const day = dayOfRoutine(e, p), ok = countsAt(today);
  return recs(e.inspections).filter(i => ok(i) && i.date.slice(0, 10) >= since).map(i => ({ i, day: day(i) }));
};
const within = (list: Counted[], per: { from: string; to: string }) => list.filter(c => c.day >= per.from && c.day <= per.to).map(c => c.i);
// ---- the time an equipment spent out of service, as spans [from, to) in milliseconds: each stop (one still going lasts until `now`) and each pause (a retirement
// closed by a return to service, see reinstateEquipment). A day alone ends at the end of that day.
type Span = [number, number];
const msOf = (x: unknown, end = false): number | null => { const t = txt(x), d = parseStamp(t); return d ? d.getTime() + (end && t.length <= 10 ? 86400000 : 0) : null; };
const spanOf = (from: unknown, to: number | null): Span[] => { const a = msOf(from); return a !== null && to !== null && to > a ? [[a, to]] : []; };
const pauseSpans = (e: Equipment): Span[] => recs(e.pauses).flatMap(x => spanOf(x.from, msOf(x.to, true)));
const stopSpans = (e: Equipment, now: Date): Span[] => {
  const bs = recs(e.breakdowns).filter(b => txt(b.startedAt)), t = now.getTime();
  return [...bs.flatMap(b => spanOf(b.startedAt, txt(b.endedAt) ? msOf(b.endedAt, true) : t)), ...(txt(e.stoppedSince) && !bs.some(b => !txt(b.endedAt)) ? spanOf(e.stoppedSince, t) : [])];
};
// Milliseconds of [from, to) inside the spans, overlapping spans counted once
function spent(spans: Span[], from: number, to: number): number {
  let sum = 0, edge = from;
  for (const [a, z] of [...spans].sort((x, y) => x[0] - y[0])) { const lo = Math.max(a, edge), hi = Math.min(z, to); if (hi > lo) { sum += hi - lo; edge = hi; } }
  return sum;
}
// At least half of [from, to) was spent inside the spans
const mostly = (spans: Span[], from: number, to: number) => spent(spans, from, to) * 2 >= to - from;
// Nothing was due in a period when the equipment was out of service (stopped, retired) for at least half of it, by hours: a stop of two hours in a week missed
// excuses nothing, a week spent stopped is not a late routine
const excused = (spans: Span[], per: { from: string; to: string }) => mostly(spans, msOf(per.from)!, msOf(addDays(per.to, 1))!);
// A month (or any span of days) spent on a pause for at least half of it: the equipment was not followed then (activeIn, maintenanceFeeds.ts)
export const pausedIn = (e: Equipment, from: Date, to: Date): boolean => mostly(pauseSpans(e), from.getTime(), to.getTime());
export function inspectionState(e: Equipment, today: Date, p: Params): InspectionState {
  if (eqStatus(e) !== 'service') return 'paused';
  const cur = periodOf(e, today, p), prev = periodOf(e, today, p, 1), ok = countsAt(today), had = recs(e.inspections).some(i => ok(i) && i.date < cur.from), list = counted(e, p, today, prev.from);
  if (within(list, cur).length) return 'ok';
  // the previous period is made when it holds a routine, and was not due when the equipment was out of service during most of it (a restart, a return to service
  // is not a late routine)
  if (within(list, prev).length || (had && excused([...stopSpans(e, today), ...pauseSpans(e)], prev))) return 'due';
  return had ? 'late' : 'never';
}
// Latest routine; of two on the same day, the one written last
// (a routine dated after tomorrow is not one yet, see countsAt)
export const lastInspection = (e: Equipment, today = new Date()): Inspection | undefined => recs(e.inspections).filter(countsAt(today)).reduce<Inspection | undefined>((best, i) => (!best || i.date >= best.date ? i : best), undefined);
// Result of a point at a routine, found by the id of the point (removing or renaming a point never shifts the history); routines of the first versions have no ids
export function resultOf(e: Equipment, insp: Inspection, cpIndex: number): PointResult | undefined {
  const cp = pts(e)[cpIndex];
  if (!cp) return undefined;
  const j = Array.isArray(insp.ids) && cp.id ? insp.ids.indexOf(cp.id) : cpIndex;
  return j < 0 || !Array.isArray(insp.results) ? undefined : insp.results[j];
}
const outOfBounds = (cp: Checkpoint, v: number | null | undefined) => finite(v) && ((cp.min != null && v < cp.min) || (cp.max != null && v > cp.max));
// Results of a routine where a measured value outside the bounds of its point counts as an anomaly
// A routine summarised by compactInspections has no results, only its worst one
const pointResults = (e: Equipment, insp: Inspection): PointResult[] => (Array.isArray(insp.results) && insp.results.length ? insp.results.map((r, j) => {
  const id = insp.ids?.[j], cp = id ? pts(e).find(c => c.id === id) : pts(e)[j];
  return r !== 'ko' && cp && outOfBounds(cp, insp.values?.[j]) ? 'ko' : r;
}) : insp.worst ? [insp.worst] : []);
// Share of the periods where a routine was due that hold one. Counted from the first routine (at most 12 periods back), without the period in progress,
// the ones spent out of service for at least half (nothing was due then, see excused) and the ones that reach the retirement; null when nothing was due
export function routineRate(e: Equipment, today: Date, p: Params): number | null {
  const list = counted(e, p, today), first = list.reduce((m, c) => (!m || c.day < m ? c.day : m), ''), t = isoDate(today), retired = txt(e.retiredAt).slice(0, 10), spans = [...stopSpans(e, today), ...pauseSpans(e)];
  let due = 0, done = 0;
  for (let b = 0; first && due < 12 && b < 60; b++) {
    const per = periodOf(e, today, p, b);
    if (per.to < first) break;
    if (per.to >= t || (retired && per.to >= retired) || excused(spans, per)) continue;
    due++;
    if (within(list, per).length) done++;
  }
  return due ? Math.round(done / due * 100) : null;
}
const RANK: Record<PointResult, number> = { ok: 0, watch: 1, ko: 2 };
// The last periods, oldest first: the worst result of a point in the period (anomaly, then to watch, then in order), "none" when no routine was made
export function strip(e: Equipment, today: Date, p: Params, n = 12): { from: string; to: string; state: PointResult | 'none' }[] {
  const list = counted(e, p, today);
  return Array.from({ length: n }, (_, k) => {
    const per = periodOf(e, today, p, n - 1 - k), ins = within(list, per);
    const worst = ins.flatMap(i => pointResults(e, i)).reduce<PointResult>((w, r) => (RANK[r] > RANK[w] ? r : w), 'ok');
    return { ...per, state: ins.length ? worst : 'none' };
  });
}
// Routines older than 24 months keep their date, author and worst result only (a routine of 8 points weighs about 330 characters, its summary about a third):
// the browser keeps 5 million characters for everything. A summary is read as a routine of one result, `worst`; it never replaces a complete routine when
// two copies are merged, unless the summary is more recent: the merge summarises, in its turn, the complete routines dated no later than the latest summary
// (maintenanceMerge.ts), so that a stale complete copy never brings the weight back.
const worstOf = (rs: PointResult[]) => rs.reduce<PointResult>((w, r) => (RANK[r] > RANK[w] ? r : w), 'ok');
export function compactBefore(e: Equipment, limit: string): Equipment {
  const old = (i: Inspection) => i.date < limit && !!i.results?.length, list = recs(e.inspections);
  if (!list.some(old)) return e;
  return { ...e, inspections: list.map((i): Inspection => (old(i) ? { ...(i.id ? { id: i.id } : {}), date: i.date, by: i.by, results: [], note: '', worst: worstOf(pointResults(e, i)) } : i)) };
}
export const compactInspections = (e: Equipment, today: Date): Equipment => compactBefore(e, isoDate(new Date(today.getFullYear() - 2, today.getMonth(), today.getDate())));
// A person is out of reach that day: on planned leave (tool 4.2) or no longer active in the staff list (isAbsent ignores an inactive person)
const away = (s: Pick<State, 'people'>, name: string, day: string) => {
  const n = name.trim().toLowerCase();
  return isAbsent(s, name, day) || (!!n && Object.values(s.people || {}).some(x => x.active === false && txt(x.name).trim().toLowerCase() === n));
};
// The one rule of absence for every task: the person planned, or the deputy of the equipment when that person is away and the deputy is not
export function taskOwner(s: Pick<State, 'people'>, e: Pick<Equipment, 'deputy'>, planned: string, day: string): { who: string; absent: boolean; deputy: boolean } {
  const who = txt(planned).trim(), deputy = txt(e.deputy).trim();
  if (!who || !away(s, who, day)) return { who, absent: false, deputy: false };
  return deputy && deputy.toLowerCase() !== who.toLowerCase() && !away(s, deputy, day) ? { who: deputy, absent: true, deputy: true } : { who, absent: true, deputy: false };
}
// The person planned for the routine: the holder, else the manager, else the deputy (the card and the task of the queue name the same one)
const plannedFor = (e: Pick<Equipment, 'operator' | 'manager' | 'deputy'>) => txt(e.operator).trim() || txt(e.manager).trim() || txt(e.deputy).trim();
// Who makes the routine that day: the person planned, or the deputy when that person is away
export const routineOwner = (s: State, e: Equipment, day: string): { who: string; absent: boolean; deputy: boolean } => taskOwner(s, e, plannedFor(e), day);

// ---- recording a routine
export const WATCH_NOTE = 'À surveiller deux routines de suite';
// Older data have no list of anomalies: the points in anomaly at the last routine stand for it (stable ids, so that a screen can follow them)
const legacyAnomalies = (e: Equipment): Anomaly[] => {
  const l = lastInspection(e);
  return l ? pts(e).flatMap((cp, i) => (resultOf(e, l, i) === 'ko' ? [{ id: `an_legacy_${cp.id ?? i}`, label: cp.label, date: l.date, note: l.note, closedAt: '', ...(cp.id ? { pointId: cp.id } : {}) }] : [])) : [];
};
// (a label that is not a text reads as empty: it is written in the messages)
const listOf = (e: Equipment) => (Array.isArray(e.anomalies) ? recs(e.anomalies).map(a => (typeof a.label === 'string' ? a : { ...a, label: '' })) : legacyAnomalies(e));
// Adds the routine. A point in anomaly (or measured outside its bounds) opens an anomaly unless one is open on it; a point to watch twice in a row opens one;
// a point in order closes the open anomaly of that point; a point still in anomaly takes back "repaired" (the repair is not confirmed).
// The routine gets an id (merging two people's records tells two routines apart by it); the old ones are summarised (compactInspections).
export function recordInspection(e: Equipment, raw: Inspection, today = new Date()): Equipment {
  // a date that cannot be read is refused; one after tomorrow (a phone with a wrong clock) is brought back to today, and the note says so
  const written = parseDate(raw.date);
  if (!written) return e;
  const fixed = isoDate(written) > addDays(isoDate(today), 1);
  const insp: Inspection = fixed ? { ...raw, date: isoDate(today), ...(raw.at ? { at: `${isoDate(today)}${raw.at.slice(10)}` } : {}), note: [raw.note, `Date notée ${frDate(raw.date)}, ramenée au jour même`].filter(Boolean).join(' · ') } : raw;
  const checkpoints = pts(e).map(c => (c.id ? c : { ...c, id: newId('pt') })), ids = checkpoints.map(c => c.id!), base = { ...e, checkpoints };
  const prev = lastInspection(e, today), before = listOf(base);
  const eff = checkpoints.map((cp, i): PointResult | undefined => (insp.results?.[i] !== 'ko' && outOfBounds(cp, insp.values?.[i]) ? 'ko' : insp.results?.[i]));
  const kept = before.map(a => {
    const r = !a.closedAt && a.pointId ? eff[ids.indexOf(a.pointId)] : undefined;
    if (r === 'ok' && a.severity !== 'danger' && txt(a.date).slice(0, 10) <= insp.date) return { ...a, closedAt: insp.date };   // a routine dated before the anomaly says nothing about it; a danger is never closed by an answer (only the manager's verification closes it)
    if (r === 'ko' && a.repairedAt) { const { repairedAt: _r, ...rest } = a; return rest; }
    return a;
  });
  const fresh: Anomaly[] = [];
  checkpoints.forEach((cp, i) => {
    const twice = eff[i] === 'watch' && !!prev && resultOf(base, prev, i) === 'watch';
    const open = before.some(a => !a.closedAt && (a.pointId ? a.pointId === cp.id : norm(a.label) === norm(cp.label)));
    if ((eff[i] === 'ko' || twice) && !open) fresh.push({ id: newId('an'), label: cp.label, date: insp.date, note: eff[i] === 'ko' ? insp.note : WATCH_NOTE, closedAt: '', pointId: cp.id, by: insp.by, severity: 'degraded' });
  });
  const out: Equipment = { ...base, inspections: [...recs(e.inspections), { ...insp, ids, id: insp.id ?? newId('in') }], anomalies: [...kept, ...fresh] };
  delete out.routineDraft;
  return compactInspections(out, parseDate(insp.date)!);
}
// Ids of the points to watch at the last routine
export function watchPoints(e: Equipment): string[] {
  const l = lastInspection(e);
  return l ? pts(e).flatMap((c, i) => (c.id && resultOf(e, l, i) === 'watch' ? [c.id] : [])) : [];
}
export function saveDraft(e: Equipment, d: Equipment['routineDraft']): Equipment {
  return d ? { ...e, routineDraft: d } : clearDraft(e);
}
export function clearDraft(e: Equipment): Equipment {
  const out = { ...e };
  delete out.routineDraft;
  return out;
}

// ---- anomalies: signalée, prise en charge, en attente, réparée; closed by the routine that finds the point in order or by the check
export const openAnomalies = (e: Equipment): Anomaly[] => listOf(e).filter(a => !txt(a.closedAt));
export type AnomalyStatus = 'reported' | 'handled' | 'waiting' | 'repaired';
export const ANOMALY_STATUS: Record<AnomalyStatus, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  reported: { label: 'Signalée', tone: 'alert' }, handled: { label: 'Prise en charge', tone: 'warn' }, waiting: { label: 'En attente', tone: 'pending' }, repaired: { label: 'Réparée, à vérifier', tone: 'ok' },
};
export const anomalyStatus = (a: Anomaly): AnomalyStatus => (txt(a.repairedAt) ? 'repaired' : txt(a.waitingFor) ? 'waiting' : txt(a.handler) ? 'handled' : 'reported');
export const SEVERITY_LABEL: Record<AnomalySeverity, string> = { degraded: 'Tourne mal', stopped: "À l'arrêt", danger: 'Danger' };
// A problem reported at any time, by anyone; a stop (severity "stopped") also stops the equipment and keeps the link
export function reportAnomaly(e: Equipment, a: { label: string; nature?: string; severity: AnomalySeverity; photo?: string; note?: string; by: string; pointId?: string }, at = nowLocal()): Equipment {
  const an: Anomaly = {
    id: newId('an'), label: a.label, date: at.slice(0, 10), note: a.note ?? '', closedAt: '', severity: a.severity, by: a.by,
    ...(a.nature ? { nature: a.nature } : {}), ...(a.photo ? { photo: a.photo } : {}), ...(a.pointId ? { pointId: a.pointId } : {}),
  };
  const out = { ...e, anomalies: [...listOf(e), an] };
  return a.severity === 'stopped' ? stopEquipment(out, a.by, at, an.id) : out;
}
export const patchAnomaly = (e: Equipment, id: string, patch: Partial<Anomaly>): Equipment => ({ ...e, anomalies: listOf(e).map(a => (a.id === id ? { ...a, ...patch } : a)) });
export const repairAnomaly = (e: Equipment, id: string, at: string): Equipment => patchAnomaly(e, id, { repairedAt: at });
export const verifyAnomaly = (e: Equipment, id: string, at: string): Equipment => ({ ...e, anomalies: listOf(e).map(a => (a.id === id ? { ...a, closedAt: at, repairedAt: a.repairedAt || at } : a)) });
export function reopenAnomaly(e: Equipment, id: string): Equipment {
  return { ...e, anomalies: listOf(e).map(a => { if (a.id !== id) return a; const { repairedAt: _r, ...rest } = a; return { ...rest, closedAt: '' }; }) };
}
// Points with an anomaly opened at least 3 times in the last 12 weeks
export function repeatedPoints(e: Equipment, today: Date): { pointId: string; label: string; times: number }[] {
  const by = new Map<string, number>();
  recs(e.anomalies).forEach(a => { const d = daysBetween(a.date, today); if (a.pointId && d !== null && d >= 0 && d < 84) by.set(a.pointId, (by.get(a.pointId) || 0) + 1); });
  return [...by].filter(([, n]) => n >= 3).map(([pointId, times]) => ({ pointId, times, label: pts(e).find(c => c.id === pointId)?.label ?? recs(e.anomalies).find(a => a.pointId === pointId)!.label })).sort((a, b) => b.times - a.times || txt(a.label).localeCompare(txt(b.label)));
}

// ---- stops and breakdowns: "À l'arrêt" writes the start, "Remis en marche" computes the duration
export const openBreakdown = (e: Equipment): Breakdown | undefined => recs(e.breakdowns).find(b => txt(b.startedAt) && !txt(b.endedAt));
// `by` is kept for the journal of the caller (a breakdown has no author); `anomalyId` links the breakdown to the anomaly that stopped the equipment
export function stopEquipment(e: Equipment, _by: string, at = nowLocal(), anomalyId?: string): Equipment {
  if (txt(e.stoppedSince)) return e;
  const b: Breakdown = { id: newId('bd'), date: at.slice(0, 10), hours: null, cost: null, cause: '', startedAt: at, ...(anomalyId ? { anomalyId } : {}) };
  return { ...e, stoppedSince: at, breakdowns: [...recs(e.breakdowns), b] };
}
// Closes the open breakdown (real hours, to 0.1) and applies what was typed meanwhile (cause, impact, repair…); without an open breakdown it only clears the stop
export function restartEquipment(e: Equipment, at: string, patch: Partial<Breakdown> = {}): Equipment {
  const open = openBreakdown(e), out: Equipment = { ...e };
  delete out.stoppedSince;
  if (open) {
    const h = hoursBetween(open.startedAt!, at);
    out.breakdowns = recs(e.breakdowns).map(b => (b.id === open.id ? { ...b, endedAt: at, hours: h === null ? null : Math.max(0, round1(h)), ...patch } : b));
  }
  return out;
}
export const patchBreakdown = (e: Equipment, id: string, patch: Partial<Breakdown>): Equipment => ({ ...e, breakdowns: recs(e.breakdowns).map(b => (b.id === id ? { ...b, ...patch } : b)) });
const yearAgo = (today: Date) => isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
// Hours of a breakdown: the ones written; a stop still going counts the hours since it began, up to `at` (hours are never left at 0 while the equipment is down)
export const breakdownHours = (b: Breakdown, at: Date): number => (finite(b.hours) ? b.hours : txt(b.startedAt) && !txt(b.endedAt) ? Math.max(0, hoursBetween(b.startedAt!, at) ?? 0) : 0);
// Breakdowns of the last 12 months: count, hours (the stop in progress included), cost typed by the company, average days between two (null under two)
export function downtime(e: Equipment, today: Date): { count: number; hours: number; cost: number; between: number | null } {
  const since = yearAgo(today), end = isoDate(today), bs = recs(e.breakdowns).filter(b => dateOf(b.date) && b.date >= since && b.date <= end), dates = bs.map(b => b.date).sort();
  return {
    count: bs.length, hours: round1(sum(bs.map(b => breakdownHours(b, today)))), cost: sum(bs.map(b => (finite(b.cost) ? b.cost : 0))),
    between: bs.length > 1 ? Math.round((daysBetween(dates[0], dates[dates.length - 1]) ?? 0) / (bs.length - 1)) : null,
  };
}
// Same cause at least twice in 12 months ("Autre" alone says nothing)
export function repeatedCauses(e: Equipment, today: Date): { cause: string; times: number }[] {
  const since = yearAgo(today), by = new Map<string, { cause: string; times: number }>();
  recs(e.breakdowns).filter(b => dateOf(b.date) && b.date >= since && norm(txt(b.cause)) && norm(txt(b.cause)) !== norm(OTHER)).forEach(b => {
    const k = norm(txt(b.cause)), x = by.get(k);
    by.set(k, { cause: x?.cause ?? txt(b.cause), times: (x?.times ?? 0) + 1 });
  });
  return [...by.values()].filter(x => x.times >= 2).sort((a, b) => b.times - a.times || a.cause.localeCompare(b.cause));
}
// The stop lasts longer than the outage tolerated by the Plan B (1.2) linked to the equipment
export function planBExceeded(s: State, e: Equipment, now: Date): { risk: Risk; hours: number; limit: number } | null {
  const risk = riskOf(s, e.riskId), limit = hoursOf(risk?.maxOutage), h = txt(e.stoppedSince) && !txt(e.retiredAt) ? hoursBetween(e.stoppedSince!, now) : null;
  return risk && limit !== null && h !== null && h > limit ? { risk, hours: round1(h), limit } : null;
}

// ---- what a person types and what lives apart; retirement and deletion
// Readings, anomalies, breakdowns, checks done, stop, retirement (and the return to service that cancels it) and the routine under way change through their own
// moves: saving what is typed never overwrites them
export const LIFE_KEYS = ['inspections', 'anomalies', 'breakdowns', 'checkLife', 'stoppedSince', 'retiredAt', 'retiredNote', 'reinstatedAt', 'pauses', 'routineDraft'] as const;
// `gone` (what was removed on purpose) lives with them
export function takeLife(into: Equipment, from: Equipment | undefined): Equipment {
  if (!from) return into;
  const out = { ...into } as Record<string, unknown>;
  for (const k of [...LIFE_KEYS, 'gone'] as const) { if (from[k] === undefined) delete out[k]; else out[k] = from[k]; }
  return out as unknown as Equipment;
}

// ---- removing an element of life on purpose. The key of the element goes into `gone`, so that merging with a copy that still holds it does not bring it back.
// The key is the id; the oldest data have none for a routine or a line of check history, and the content stands for it (inspectionKey, doneKey).
export const GONE_KEPT = 300;
export const addGone = (gone: string[] | undefined, id: string): string[] => [...(gone ?? []).filter(x => x !== id), id].slice(-GONE_KEPT);
export const inspectionKey = (i: Inspection): string => i.id ?? `${i.date}|${i.by}|${i.at ?? ''}|${(i.results ?? []).join()}`;
export function removeInspection(e: Equipment, id: string): Equipment {
  const list = recs(e.inspections);
  return list.some(i => inspectionKey(i) === id) ? { ...e, inspections: list.filter(i => inspectionKey(i) !== id), gone: addGone(e.gone, id) } : e;
}
export function removeAnomaly(e: Equipment, id: string): Equipment {
  const list = listOf(e);
  return list.some(a => a.id === id) ? { ...e, anomalies: list.filter(a => a.id !== id), gone: addGone(e.gone, id) } : e;
}
// An open breakdown takes the stop with it
export function removeBreakdown(e: Equipment, id: string): Equipment {
  const list = recs(e.breakdowns), b = list.find(x => x.id === id);
  if (!b) return e;
  const out: Equipment = { ...e, breakdowns: list.filter(x => x.id !== id), gone: addGone(e.gone, id) };
  if (txt(b.startedAt) && !txt(b.endedAt)) delete out.stoppedSince;
  return out;
}

// What cites the equipment elsewhere: defects of the red bin (5.1) and actions (2.1) about it
export function citedBy(s: Pick<State, 'ncs' | 'actions'>, eqId: string): { ncs: Nc[]; actions: Action[] } {
  return {
    ncs: Object.values(s.ncs ?? {}).filter(n => n.equipmentId === eqId),
    actions: Object.values(s.actions ?? {}).filter(a => a.ref?.kind === 'equipment' && a.ref.id === eqId),
  };
}
type Cited = { ncs: unknown[]; actions: unknown[] };
// Deleted only when nothing is lost and nothing cites it; otherwise retired from service (its history stays)
export const canDelete = (e: Equipment, cited?: Cited): boolean => !cited?.ncs.length && !cited?.actions.length
  && !recs(e.inspections).length && !recs(e.anomalies).length && !recs(e.breakdowns).length && !Object.keys(e.checkLife ?? {}).length;
export function lostByDeleting(e: Equipment, cited?: Cited): string {
  const parts: [number, string, string?][] = [[recs(e.inspections).length, 'routine'], [recs(e.anomalies).length, 'anomalie'], [recs(e.breakdowns).length, 'panne'], [Object.keys(e.checkLife ?? {}).length, 'contrôle suivi', 'contrôles suivis']];
  const [n, m] = [cited?.ncs.length ?? 0, cited?.actions.length ?? 0];
  const fact = n + m ? `${[n && `${plural(n, 'défaut')} du bac rouge`, m && plural(m, 'action')].filter(Boolean).join(' et ')} ${n + m > 1 ? 'citent' : 'cite'} cet équipement` : '';
  return [parts.filter(x => x[0]).map(x => plural(x[0], x[1], x[2])).join(', '), fact].filter(Boolean).join(' ; ');
}
// Retiring a stopped equipment ends the stop on the day of the retirement (hours counted, never before the start), so that putting it back later does not
// bring back a stop of months
// endAt: when the stop ends if the equipment was stopped (the day alone counts from midnight: a stop noted the same day would last 0 h)
// A retirement written after a return to service takes the return off: merging two people's records keeps a retirement only when no return to service is
// as recent or more (maintenanceMerge.ts), a return to service says when it was made (`reinstatedAt`, "YYYY-MM-DDTHH:MM")
export function retireEquipment(e: Equipment, at: string, note: string, endAt = at): Equipment {
  const open = openBreakdown(e), stopped = open || txt(e.stoppedSince) ? restartEquipment(e, open && endAt < open.startedAt! ? open.startedAt! : endAt) : e;
  const out = { ...stopped, retiredAt: at, retiredNote: note };
  delete out.reinstatedAt;
  return out;
}
// The retirement that ends here is kept as a pause { from: day of the retirement, to: now }: the months it lasted are not followed, and the routine is not due
// for the periods it covered (routineRate, inspectionState, activeIn of maintenanceFeeds.ts). Putting back an equipment that is in service adds nothing.
export function reinstateEquipment(e: Equipment, at = nowLocal()): Equipment {
  const out = { ...e, reinstatedAt: at };
  if (txt(e.retiredAt)) out.pauses = [...recs(e.pauses), { from: txt(e.retiredAt), to: at }];
  delete out.retiredAt; delete out.retiredNote;
  return out;
}
// A routine begun more than 12 hours ago, or in an earlier period of the routine: its answers are not those of today
export function staleDraft(e: Equipment, now: Date, p: Params): boolean {
  const d = txt(e.routineDraft?.date), h = d ? hoursBetween(d, now) : null;
  return !!d && (h === null || (d.length > 10 && h > 12) || d.slice(0, 10) < periodOf(e, now, p).from);
}

// ---- links with the other tools
// Defects of the red bin (5.1) on the equipment over the last `days`, newest first: by the equipment chosen on the defect, else by the name of the place
export function ncsOfEquipment(s: State, e: Equipment, now: Date, days = 90): Nc[] {
  const since = addDays(isoDate(now), -days), key = norm(txt(e.name));
  return Object.values(s.ncs).filter(n => n.at.slice(0, 10) >= since && (n.equipmentId ? n.equipmentId === e.id : !!key && norm(txt(n.where)) === key)).sort((a, b) => (a.at < b.at ? 1 : -1));
}
// The people to call (directory 1.3): the list of the equipment, plus the single contact of the first versions as after-sales service
export function helpersOf(e: Equipment): EqHelper[] {
  const hs = recs(e.contacts);
  return e.contactId && !hs.some(h => h.contactId === e.contactId) ? [...hs, { id: `sav_${e.contactId}`, role: 'Service après-vente', contactId: e.contactId }] : hs;
}
export const sopOf = (s: State, e: Equipment): Sop | undefined => (e.sopId && Object.hasOwn(s.sops ?? {}, e.sopId) ? s.sops[e.sopId] : undefined);
// The work instruction (3.2) of the workstation: its version, whether the sheet is posted, how many people are allowed, whether the holder is one of them.
// `shown` says what the line says of the sheet: posted or not for a sheet in force, "à valider" or "brouillon" for one that is not in force yet (it is not meant to be posted).
export function sopLine(s: State, e: Equipment, _now: Date): { sop: Sop; version: number; displayed: boolean; shown: string; habilitated: number; ownerHabilitated: boolean | null } | null {
  const sop = sopOf(s, e), phase = sop && sopPhase(sop);
  if (!sop || phase === 'archived') return null;
  const hab = habilitated(s, sop), holder = norm(txt(e.operator)), displayed = displayState(sop) === 'ok';
  return {
    sop, version: sop.version, displayed, shown: phase === 'active' ? (displayed ? 'affichée' : 'non affichée') : phase === 'draft' ? 'brouillon' : 'fiche à valider',
    habilitated: hab.length, ownerHabilitated: holder ? hab.some(n => norm(n) === holder) : null,
  };
}

// ---- completeness of the sheet: what is missing is shown, each point leads to its tab
export type EqTab = 'routine' | 'issues' | 'cabinet' | 'checks' | 'sheet';
export function completeness(e: Equipment): { pct: number; missing: { key: string; label: string; tab: EqTab }[] } {
  const all: { key: string; label: string; ok: boolean; tab: EqTab }[] = [
    { key: 'name', label: 'Nom', ok: !!txt(e.name).trim(), tab: 'sheet' },
    { key: 'kind', label: "Type d'équipement", ok: !!e.kind, tab: 'sheet' },
    { key: 'points', label: 'Au moins 3 points de routine', ok: pts(e).filter(c => txt(c.label).trim()).length >= 3, tab: 'routine' },
    { key: 'pointPhoto', label: "Photo de référence d'un point", ok: pts(e).some(c => c.photo), tab: 'routine' },
    { key: 'holder', label: 'Titulaire de la routine', ok: !!txt(e.operator).trim(), tab: 'routine' },
    { key: 'deputy', label: 'Suppléant', ok: !!txt(e.deputy).trim(), tab: 'routine' },
    { key: 'helper', label: 'Un intervenant', ok: helpersOf(e).length > 0, tab: 'sheet' },
    { key: 'identity', label: 'Photo ou numéro de série', ok: !!e.photo || !!txt(e.serial).trim(), tab: 'sheet' },
    { key: 'checks', label: 'Un contrôle ou un contrat', ok: !!e.tasks?.length || !!txt(e.contract?.provider).trim(), tab: 'checks' },
  ];
  return { pct: Math.round(all.filter(x => x.ok).length / all.length * 100), missing: all.filter(x => !x.ok).map(({ key, label, tab }) => ({ key, label, tab })) };
}

// ---- what is left to do on the equipment (the routine, the anomalies, the stop), and the level of a card
// `text` of a task is an infinitive, for the queue "À faire"; `fact` says the same as a statement (cards, messages, badge), never an order. `who` is the person
// planned: the holder (else the manager) for a routine, who handles it (else the manager) for an anomaly; maintTodos (maintenanceAll.ts) hands a task over to the
// deputy when that person is away. The urgent ones (danger, stop, stop beyond the Plan B) carry the day of the fact as due date: none of them goes without a date.
// Red (`tone: 'bad'`) is kept for what cannot wait, whatever the part of the tool that raises it (isRed, maintenanceAll.ts). A retired piece of equipment has none;
// a stopped one has no routine.
const tolerated = (limit: number) => (limit === 0 ? 'arrêt toléré : immédiat' : `arrêt toléré de ${formatHours(limit)}`);
export function routineTodos(s: State, now: Date): MaintTodo[] {
  const out: MaintTodo[] = [], today = isoDate(now);
  Object.values(s.equipments).filter(e => eqStatus(e) !== 'retired').forEach(e => {
    const name = nm(e), manager = txt(e.manager).trim(), st = inspectionState(e, now, s.params), add = (t: Omit<MaintTodo, 'eqId' | 'who'> & { who?: string }) => out.push({ who: manager, ...t, eqId: e.id });
    if (st === 'never' || st === 'due' || st === 'late') {
      const last = lastInspection(e, now), when = last ? ` (dernière le ${frDate(last.date)})` : '';
      add({
        id: `routine:${e.id}`, kind: 'routine', tone: 'warn', who: plannedFor(e), due: periodOf(e, now, s.params, st === 'late' ? 1 : 0).to,
        text: st === 'never' ? `Faire la première routine de ${name}` : st === 'late' ? `Faire la routine de ${name}${when}` : `Faire la routine de ${name}`,
        fact: st === 'never' ? 'Première routine à faire' : st === 'late' ? `Routine manquée${when}` : `Routine à faire${when}`,
      });
    }
    openAnomalies(e).forEach(a => {
      const status = anomalyStatus(a), danger = a.severity === 'danger', what = danger ? `le danger « ${a.label} »` : `« ${a.label} »`, day = frDate(a.date);
      const waiting = txt(a.waitingFor), handler = txt(a.handler), due = dateOf(a.dueAt), since = dateOf(a.date).slice(0, 10);
      const text = { reported: `Prendre en charge ${what} (${name})`, handled: `Réparer ${what} (${name})`, waiting: `Suivre ${what} (${name}), en attente : ${waiting}`, repaired: `Vérifier la réparation de ${what} (${name})` }[status];
      const more = { reported: '', handled: `, prise en charge par ${handler}`, waiting: `, en attente : ${waiting}`, repaired: `, réparée le ${frDate(txt(a.repairedAt))}, à vérifier` }[status];
      const late = !!due && due < today;
      add({
        id: `${danger ? 'danger' : 'anomaly'}:${a.id}`, kind: danger ? 'danger' : 'anomaly', ref: a.id, text, who: handler.trim() || manager, due: due || (danger ? since : ''),
        tone: danger ? 'bad' : 'warn',   // red is for a danger: a stop has its own task, a late date limit is said in the fact
        fact: `${danger ? `Danger signalé le ${day} : ${a.label}` : `Anomalie ouverte : ${a.label}, depuis le ${day}`}${more}${late ? `, échéance dépassée depuis le ${frDate(due)}` : ''}`,
      });
    });
    if (txt(e.stoppedSince)) {
      const h = Math.max(0, hoursBetween(txt(e.stoppedSince), now) ?? 0), began = parseDate(txt(e.stoppedSince)), since = began ? isoDate(began) : today;
      add({ id: `stopped:${e.id}`, kind: 'stopped', tone: 'bad', due: since, text: `${name} à l'arrêt depuis ${formatHours(h)}`, fact: `À l'arrêt depuis ${formatHours(h)}` });
      const over = planBExceeded(s, e, now);
      if (over) {
        add({
          id: `plan-b:${e.id}`, kind: 'plan-b', tone: 'bad', ref: over.risk.id, who: manager || over.risk.owner, due: since,
          text: `${name} à l'arrêt depuis ${formatHours(over.hours)}, ${tolerated(over.limit)} dans le Plan B « ${over.risk.title} »`,
          fact: `Arrêt de ${formatHours(over.hours)}, ${tolerated(over.limit)} (Plan B « ${over.risk.title} »)`,
        });
      }
    }
  });
  return out;
}

// Facts of the routine, never an order
export function routineFacts(s: State, now: Date): Insight[] {
  const out: Insight[] = [], eqs = Object.values(s.equipments).filter(e => eqStatus(e) !== 'retired'), live = eqs.filter(e => eqStatus(e) === 'service');
  const states = live.map(e => ({ e, st: inspectionState(e, now, s.params) })), missed = states.filter(x => x.st === 'late'), fresh = states.filter(x => x.st === 'never');
  if (missed.length) out.push({ key: 'routine-missed', tone: 'warn', title: 'Routine manquée', text: `${names(missed, x => `${nm(x.e)} (dernière routine le ${frDate(lastInspection(x.e, now)?.date ?? '')})`)}.` });
  if (fresh.length) out.push({ key: 'routine-first', tone: 'warn', title: 'Première routine à faire', text: `${names(fresh, x => nm(x.e))} : aucune routine enregistrée.` });
  // every open anomaly, the dangers included (they are also told apart, the oldest first)
  const open = eqs.flatMap(e => openAnomalies(e).map(a => ({ e, a }))), danger = open.filter(x => x.a.severity === 'danger').sort((x, y) => txt(x.a.date).localeCompare(txt(y.a.date))), other = open.filter(x => x.a.severity !== 'danger');
  if (danger.length) out.push({ key: 'danger', tone: 'bad', title: 'Danger signalé', text: `${names(danger, x => `${nm(x.e)} : ${x.a.label} (depuis le ${frDate(x.a.date)})`)}.` });
  if (open.length) out.push({ key: 'anomalies', tone: 'warn', title: 'Anomalies ouvertes', text: `${plural(open.length, 'anomalie ouverte', 'anomalies ouvertes')}${danger.length ? `, dont ${plural(danger.length, 'danger')}` : ''}${other.length ? ` : ${names(other, x => `${nm(x.e)} (${x.a.label}${x.a.note === WATCH_NOTE ? ', à surveiller deux routines de suite' : ''}, ${ANOMALY_STATUS[anomalyStatus(x.a)].label.toLowerCase()})`)}` : ''}.` });
  const rep = eqs.flatMap(e => repeatedPoints(e, now).map(r => ({ e, r })));
  if (rep.length) out.push({ key: 'repeat', tone: 'warn', title: 'Même point en anomalie', text: `${names(rep, x => `${nm(x.e)} : le point « ${x.r.label} » est revenu ${x.r.times} fois en 12 semaines`)}.` });
  const watch = live.flatMap(e => watchPoints(e).filter(id => !openAnomalies(e).some(a => a.pointId === id)).map(id => ({ e, label: pts(e).find(c => c.id === id)?.label ?? '' })));
  if (watch.length) out.push({ key: 'watch', tone: 'warn', title: 'Points à surveiller', text: `${names(watch, x => `${nm(x.e)} (${x.label})`)} : à surveiller à la dernière routine.` });
  const stopped = eqs.filter(e => eqStatus(e) === 'stopped').sort((a, b) => txt(a.stoppedSince).localeCompare(txt(b.stoppedSince)));   // the longest stop first: it is the one that must not be hidden
  if (stopped.length) out.push({ key: 'stopped', tone: 'bad', title: "À l'arrêt", text: `${names(stopped, e => `${nm(e)} depuis ${formatHours(Math.max(0, hoursBetween(txt(e.stoppedSince), now) ?? 0))}`)}.` });
  const over = stopped.flatMap(e => { const x = planBExceeded(s, e, now); return x ? [{ e, ...x }] : []; });
  if (over.length) out.push({ key: 'plan-b-over', tone: 'bad', title: 'Arrêt plus long que prévu au Plan B', text: `${names(over, x => `${nm(x.e)} : à l'arrêt depuis ${formatHours(x.hours)}, ${tolerated(x.limit)} (${x.risk.title})`)}.` });
  const down = eqs.map(e => ({ e, d: downtime(e, now) })).filter(x => x.d.count);
  if (down.length) {
    out.push({
      key: 'breakdowns', tone: 'warn', title: 'Pannes sur 12 mois',
      text: `${names(down, x => `${nm(x.e)} : ${plural(x.d.count, 'panne')}, ${hoursText(x.d.hours)} d'arrêt${x.d.cost ? `, ${formatValue(x.d.cost, '€')}` : ''}${x.d.between ? `, en moyenne tous les ${x.d.between} jours` : ''}`)}.`,
    });
  }
  const same = eqs.flatMap(e => repeatedCauses(e, now).map(c => ({ e, c })));
  if (same.length) out.push({ key: 'repeat-cause', tone: 'warn', title: 'Même cause de panne', text: `${names(same, x => `${nm(x.e)} : « ${x.c.cause} », ${x.c.times} fois en 12 mois`)}.` });
  // only the equipment whose stop blocks the activity (isBottleneck) is cited
  const noPlan = Object.keys(s.risks).length ? eqs.filter(e => isBottleneck(e) && !riskOf(s, e.riskId)) : [];
  if (noPlan.length) out.push({ key: 'no-plan-b', tone: 'warn', title: 'Sans Plan B', text: `${names(noPlan, nm)} : ${noPlan.length > 1 ? 'équipements dont' : 'équipement dont'} l'arrêt bloque l'activité, ${noPlan.length > 1 ? 'non reliés' : 'non relié'} à un risque de l'outil 1.2.` });
  const unposted = eqs.flatMap(e => { const l = sopLine(s, e, now); return l && sopPhase(l.sop) === 'active' && !l.displayed ? [{ e, l }] : []; });
  if (unposted.length) out.push({ key: 'sop-posted', tone: 'warn', title: 'Instruction du poste non affichée', text: `${names(unposted, x => `${nm(x.e)} (${sopVersion(x.l.sop)}, ${displayState(x.l.sop) === 'old' ? 'ancienne version affichée' : 'aucun affichage enregistré'})`)}.` });
  // a holder who is not among the people allowed on the sheet in force (3.2) of his workstation
  const unfit = eqs.flatMap(e => { const l = sopLine(s, e, now); return l && sopPhase(l.sop) === 'active' && l.ownerHabilitated === false ? [{ e, l }] : []; });
  if (unfit.length) out.push({ key: 'holder-not-habilitated', tone: 'warn', title: 'Titulaire non habilité', text: `${names(unfit, x => `${nm(x.e)} (${txt(x.e.operator).trim()}, instruction ${sopVersion(x.l.sop)})`)}.` });
  return out;
}

// Why a screen of the field takes no routine, and no report of a problem, on an equipment (a fact); '' when it can
export const ROUTINE_ON_STOP = "L'équipement est à l'arrêt : la routine reprend à la remise en marche.";
export const reportRefusal = (e: Equipment): string => (txt(e.retiredAt) ? `Équipement retiré le ${frDate(txt(e.retiredAt))} : un problème se signale sur un équipement en service.` : '');

// Order of the tasks of a card and of the queue, the most serious first: danger, stop, stop beyond the Plan B, a part out or short, anomaly, check due,
// observation, contract, routine, count, key. One order for the status of a card and for the sentence under it: the first task is the one the status names.
export const TASK_RANK: Record<MaintTodoKind, number> = {
  danger: 0, stopped: 1, 'plan-b': 2, out: 3, 'order-late': 4, order: 5, expiry: 6, anomaly: 7, check: 8, remark: 9, contract: 10, routine: 11, count: 12, key: 13,
};
export const taskRank = (kind: MaintTodoKind): number => TASK_RANK[kind] ?? 99;
// Red before amber, then by kind
export const byUrgency = (a: MaintTodo, b: MaintTodo): number => (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1) || taskRank(a.kind) - taskRank(b.kind);
export const eqTasks = (todos: MaintTodo[], eqId: string): MaintTodo[] => todos.filter(t => t.eqId === eqId).sort(byUrgency);
const TASK_LABEL: Partial<Record<MaintTodoKind, string>> = { danger: 'Danger', stopped: "À l'arrêt", 'plan-b': "À l'arrêt", anomaly: 'Anomalie', check: 'Contrôle', remark: 'Observation à lever', contract: 'Contrat', routine: 'Routine à faire' };
// Level of a card: retired is set aside, a stop or a danger is red, a task in red is red, a task in amber is amber, otherwise in order.
// `todos` are all the tasks of the tool (the ones of this equipment are picked by `eqId`). The label names its first task (eqTasks).
export function eqLevel(e: Equipment, todos: MaintTodo[]): { level: Level; label: string } {
  const status = eqStatus(e);
  if (status === 'retired') return { level: 'pending', label: 'Retiré' };
  const top = eqTasks(todos, e.id)[0];
  if (top?.kind === 'danger') return { level: 'alert', label: 'Danger' };
  if (status === 'stopped') return { level: 'alert', label: "À l'arrêt" };
  return top ? { level: top.tone === 'bad' ? 'alert' : 'warn', label: TASK_LABEL[top.kind] ?? 'À suivre' } : { level: 'ok', label: 'En ordre' };
}
// 10 per task in red, 1 per task in amber: orders the cards, most pressing first
export const urgency = (todos: MaintTodo[], eqId: string): number => todos.filter(t => t.eqId === eqId).reduce((n, t) => n + (t.tone === 'bad' ? 10 : 1), 0);

// Deletes an equipment and takes it off the spare parts it served and off the processes that listed it (the one way, used by tool 3.3 and by tool 1.4)
export function deleteEquipment(d: Pick<State, 'equipments' | 'spares' | 'processes'>, id: string): void {
  delete d.equipments[id];
  Object.values(d.spares || {}).forEach(sp => { sp.equipmentIds = sp.equipmentIds.filter(i => i !== id); });
  d.processes.forEach(p => { if (p.equipmentIds?.includes(id)) p.equipmentIds = p.equipmentIds.filter(i => i !== id); });
}
