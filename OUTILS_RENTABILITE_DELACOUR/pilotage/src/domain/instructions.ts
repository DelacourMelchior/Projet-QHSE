// Tool 3.2 "Instructions visuelles au poste": a living standard, 80 % pictures. Pure functions, covered by instructions.test.ts.
// A sheet goes draft, review, in force, archived; it changes after a defect at the workstation, a remark from the people who work there or
// a periodic review; it is posted, read and signed by the people allowed to work alone. Messages state facts and give no order.
import type { Level, Nc, Params, Sop, SopHabilitation, SopSnap, SopStage, SopStep, SopSuggestion, State, Strokes } from './types';
import { addDays, daysBetween, defaultProcess, hoursBetween, newId, type Insight } from './base';
import { isoDate, parseDate } from './periods';
import { activePeople } from './team';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
// Same name whatever the case and the accents
export const norm = (t: string | undefined | null) => (t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fnv = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + text.length.toString(16); };
const addMonthsIso = (iso: string, n: number) => { const d = parseDate(iso); return d ? isoDate(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())) : ''; };

// ---- settings of the tool
export const DEFAULT_PPE = ['Lunettes de sécurité', 'Chaussures de sécurité', 'Gants anti-coupure'];
export const EXTRA_PPE = ['Protections auditives', 'Masque', 'Blouse ou tablier'];
export const OTHER_REASON = 'Autre';
export const DEFAULT_REASONS = [
  'Défaut déclaré au poste', 'Réclamation client', 'Détrompeur ajouté', 'Changement de matière ou de fournisseur', 'Changement de machine ou de plan',
  'Accident ou presque-accident', "Remarque d'un opérateur", 'Audit', 'Revue périodique', OTHER_REASON,
];
export const PHOTO_SIZES: [number, string][] = [[2560, 'Nette (2 560 px), par défaut'], [4096, '4K (4 096 px), pour les grandes affiches'], [1280, 'Légère (1 280 px), peu de place']];
export function sopCfg(p: Params) {
  const c = p.sop || {};
  const reasons = [...(c.reasons?.length ? c.reasons : DEFAULT_REASONS).filter(r => r.trim() && r !== OTHER_REASON), OTHER_REASON];
  return {
    updateHours: c.updateHours ?? 48, reviewMonths: c.reviewMonths ?? 12, minPeople: c.minPeople ?? 2, habLevel: c.habLevel ?? 2, photoPx: c.photoPx ?? 2560,
    ppe: c.ppe || [], reasons, plan: c.plan || '',
  };
}
export const ppeChoices = (p: Params, sop?: Sop) => [...new Set([...DEFAULT_PPE, ...EXTRA_PPE, ...sopCfg(p).ppe, ...(sop?.ppe || [])])];
// "Autre" asks to specify: the reason written in the history
export const reasonText = (kind: string, detail: string) => (kind === OTHER_REASON ? detail.trim() || OTHER_REASON : `${kind}${detail.trim() ? ` : ${detail.trim()}` : ''}`);

// ---- the sheet
export const newSop = (processId = defaultProcess('P3'), today = new Date()): Sop => ({
  id: newId('sop'), processId, poste: '', operation: '', version: 1, versionDate: isoDate(today), history: [], author: '', validatedBy: '', phase: 'draft',
  steps: [{ op: '', how: '', watch: '', check: '', photo: '' }], good: '', trap: '', goodPhoto: '', trapPhoto: '', ppe: [], habilitations: [],
});
export const newStep = (): SopStep => ({ op: '', how: '', watch: '', check: '', photo: '' });
export const sopVersion = (sop: Pick<Sop, 'version'>) => `V${String(sop.version).padStart(2, '0')}`;
// Older sheets have no phase: validated = in force, otherwise to validate
export const sopPhase = (sop: Sop): NonNullable<Sop['phase']> => sop.phase ?? (sop.validatedBy.trim() ? 'active' : 'review');
export const PHASE_LABEL: Record<NonNullable<Sop['phase']>, string> = { draft: 'Brouillon', review: 'À valider', active: 'En vigueur', archived: 'Archivée' };
// The sheet posted is told apart from the old one by the colour of its frame
export const VERSION_COLORS = [
  { hex: '#1d4ed8', name: 'bleu' }, { hex: '#b45309', name: 'ambre' }, { hex: '#7c3aed', name: 'violet' },
  { hex: '#0f766e', name: 'turquoise' }, { hex: '#be123c', name: 'rouge' }, { hex: '#4d7c0f', name: 'vert olive' },
];
export const versionColor = (v: number) => VERSION_COLORS[((v - 1) % VERSION_COLORS.length + VERSION_COLORS.length) % VERSION_COLORS.length];

// ---- pictures: 80 % visual
export const stepPhotos = (st: SopStep) => [st.photo, ...(st.photos || [])].filter(Boolean);
export const sopPhotos = (sop: Sop): string[] => [
  sop.goodPhoto, sop.trapPhoto, ...sop.steps.flatMap(stepPhotos), ...(sop.materials || []).map(m => m.photo),
  sop.limits?.goodPhoto || '', sop.limits?.limitPhoto || '', sop.limits?.rejectPhoto || '', ...(sop.variants || []).map(v => v.photo),
].filter(Boolean);
export const photoCount = (sop: Sop) => sopPhotos(sop).length;
export const coverPhoto = (sop: Sop) => sop.goodPhoto || sop.steps.flatMap(stepPhotos)[0] || sop.trapPhoto || '';
// Share of the described steps that have a picture
export function visualRate(sop: Sop): number {
  const steps = sop.steps.filter(x => x.op.trim() || x.how.trim());
  return steps.length ? Math.round(steps.filter(x => stepPhotos(x).length).length / steps.length * 100) : 0;
}
export const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
export const SHORT_SENTENCE = 15;   // words: past that, the sentence is no longer short

// ---- people allowed to work alone
export const STAGES: { key: SopStage; label: string }[] = [
  { key: 'seen', label: 'A regardé faire' }, { key: 'with', label: 'A fait avec le tuteur' }, { key: 'alone', label: 'Fait seul(e)' }, { key: 'trainer', label: 'Peut former' },
];
export const isHabilitated = (h: SopHabilitation) => !h.stage || h.stage === 'alone' || h.stage === 'trainer';
// People of the versatility matrix (4.2) at the chosen level or more on the skill linked to the sheet
export function fromSkill(s: State, sop: Sop): string[] {
  const k = sop.skillId ? s.skills[sop.skillId] : undefined, lvl = sopCfg(s.params).habLevel;
  return k ? Object.entries(k.levels).filter(([id, l]) => l >= lvl && s.people[id]?.active).map(([id]) => s.people[id].name) : [];
}
const unique = (xs: string[]) => { const seen = new Set<string>(); return xs.filter(x => { const k = norm(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
export const habilitated = (s: State, sop: Sop) => unique([...fromSkill(s, sop), ...sop.habilitations.filter(isHabilitated).map(h => h.person)]);
export const inTraining = (sop: Sop) => sop.habilitations.filter(h => !isHabilitated(h));
export const concerned = (s: State, sop: Sop) => unique([...habilitated(s, sop), ...inTraining(sop).map(h => h.person)]);
// Stage of a person on the sheet: the path written on it first, then the versatility matrix
export function stageOf(s: State, sop: Sop, name: string): { stage: SopStage | null; fromSkill: boolean } {
  const h = sop.habilitations.find(x => norm(x.person) === norm(name));
  if (h) return { stage: h.stage ?? 'alone', fromSkill: false };
  return fromSkill(s, sop).some(n => norm(n) === norm(name)) ? { stage: 'alone', fromSkill: true } : { stage: null, fromSkill: false };
}
// Habilitations ending within a month, or already over
export function renewals(sop: Sop, now = new Date()) {
  return sop.habilitations.filter(h => h.until && isHabilitated(h)).map(h => ({ h, days: daysBetween(isoDate(now), h.until!) ?? 999 })).filter(x => x.days <= 30)
    .map(x => ({ person: x.h.person, until: x.h.until!, late: x.days < 0 }));
}

// ---- reading: every person concerned signs "read and understood" for the version in force
export function mustRead(s: State, sop: Sop): string[] {
  if (sopPhase(sop) !== 'active') return [];
  const done = new Set((sop.acks || []).filter(a => a.v === sop.version).map(a => norm(a.person)));
  // a person trained on this version after it came into force has seen it
  const trained = new Set(sop.habilitations.filter(h => h.date >= sop.versionDate).map(h => norm(h.person)));
  return concerned(s, sop).filter(n => !done.has(norm(n)) && !trained.has(norm(n)));
}
export function readRate(s: State): number | null {
  let all = 0, todo = 0;
  Object.values(s.sops).filter(x => sopPhase(x) === 'active').forEach(x => { all += concerned(s, x).length; todo += mustRead(s, x).length; });
  return all ? Math.round((all - todo) / all * 100) : null;
}

// ---- posting at the workstation
export type DisplayState = 'never' | 'old' | 'ok';
export const displayState = (sop: Sop): DisplayState => (!sop.displayedAt ? 'never' : sop.displayedAt < sop.versionDate ? 'old' : 'ok');

// ---- periodic review
export const nextReview = (sop: Sop, p: Params) => addMonthsIso(sop.reviewedAt && sop.reviewedAt > sop.versionDate ? sop.reviewedAt : sop.versionDate, sopCfg(p).reviewMonths);
export const reviewLate = (sop: Sop, p: Params, now = new Date()) => sopPhase(sop) === 'active' && (daysBetween(nextReview(sop, p), now) ?? 0) > 0;

// ---- defects of the workstation (5.1): by the sheet chosen on the defect, else by the name of the workstation
export const ncTouches = (n: Nc, sop: Sop) => (n.sopId ? n.sopId === sop.id : !!norm(sop.poste) && norm(n.where) === norm(sop.poste));
// Defects declared on the workstation since the current version: the sheet must add the counter-measure
export function ncsSinceVersion(s: State, sop: Sop) {
  const phase = sopPhase(sop);
  return phase === 'draft' || phase === 'archived' ? [] : Object.values(s.ncs).filter(n => n.at.slice(0, 10) >= sop.versionDate && ncTouches(n, sop));
}
export function updateDue(s: State, sop: Sop): { first: string; due: string; late: (now: Date) => boolean } | null {
  const ncs = ncsSinceVersion(s, sop);
  if (!ncs.length) return null;
  const first = ncs.map(n => n.at).sort()[0], hours = sopCfg(s.params).updateHours;
  return { first, due: addDays(first.slice(0, 10), Math.ceil(hours / 24)), late: now => (hoursBetween(first, now) ?? 0) > hours };
}
// Defects of the last 12 months declared on each step of the sheet
export function ncsByStep(s: State, sop: Sop, now = new Date()): Record<number, number> {
  const since = isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())), out: Record<number, number> = {};
  Object.values(s.ncs).filter(n => n.sopId === sop.id && typeof n.sopStep === 'number' && n.at.slice(0, 10) >= since).forEach(n => { out[n.sopStep!] = (out[n.sopStep!] || 0) + 1; });
  return out;
}
export const openSuggestions = (sop: Sop) => (sop.suggestions || []).filter(x => x.status === 'new');

// ---- workstations cited elsewhere that have no sheet
export interface Uncovered { name: string; ncs: number; machine: boolean; skill: boolean }
export function uncoveredPostes(s: State): Uncovered[] {
  const sops = Object.values(s.sops).filter(x => sopPhase(x) !== 'archived');
  const keys = sops.flatMap(x => [norm(x.poste), norm(x.operation), norm(x.skillId ? s.skills[x.skillId]?.name : '')]).filter(k => k.length >= 3);
  const covered = (name: string) => { const k = norm(name); return k.length < 3 || keys.some(c => c === k || c.includes(k) || k.includes(c)); };
  const by = new Map<string, Uncovered>();
  const see = (name: string, patch: Partial<Uncovered>) => {
    const t = name.trim();
    if (!t || covered(t)) return;
    const cur = by.get(norm(t)) || { name: t, ncs: 0, machine: false, skill: false };
    by.set(norm(t), { ...cur, ncs: cur.ncs + (patch.ncs || 0), machine: cur.machine || !!patch.machine, skill: cur.skill || !!patch.skill });
  };
  Object.values(s.ncs).filter(n => !(n.sopId && s.sops[n.sopId])).forEach(n => see(n.where, { ncs: 1 }));
  // equipment that works at a workstation: not the retired ones, the measuring instruments, the computers, nor one already linked to its sheet
  Object.values(s.equipments).filter(e => !e.retiredAt && !e.sopId && !['instrument', 'it'].includes(e.kind || '')).forEach(e => see(e.name, { machine: true }));
  Object.values(s.skills).filter(k => !sops.some(x => x.skillId === k.id)).forEach(k => see(k.name, { skill: true }));
  return [...by.values()].sort((a, b) => b.ncs - a.ncs || a.name.localeCompare(b.name));
}

// ---- what is left to do on a sheet
export type TodoKind = 'update' | 'validate' | 'read' | 'display' | 'review' | 'renew' | 'answer' | 'inform';
export interface SopTodo { id: string; sopId: string; kind: TodoKind; text: string; tone: 'bad' | 'warn'; who: string; due: string; people?: string[]; ref?: string }
export function sopTodos(s: State, now = new Date()): SopTodo[] {
  const out: SopTodo[] = [];
  Object.values(s.sops).forEach(x => {
    const phase = sopPhase(x), v = sopVersion(x), who = x.owner || x.author, add = (kind: TodoKind, text: string, tone: 'bad' | 'warn', due = '', extra: Partial<SopTodo> = {}) => out.push({ id: `${kind}${x.id}${extra.ref || ''}`, sopId: x.id, kind, text, tone, who, due, ...extra });
    if (phase === 'archived' || phase === 'draft') return;
    const up = updateDue(s, x);
    if (up) add('update', `Mettre à jour l'instruction du poste ${x.poste}`, up.late(now) ? 'bad' : 'warn', up.due);
    if (phase === 'review') { add('validate', `Valider l'instruction du poste ${x.poste}`, 'warn'); return; }
    const read = mustRead(s, x);
    if (read.length) add('read', `Faire lire la ${v} du poste ${x.poste}`, 'warn', '', { people: read });
    const d = displayState(x);
    if (d === 'old') add('display', `Remplacer la fiche affichée au poste ${x.poste} par la ${v}`, 'bad');
    else if (d === 'never') add('display', `Afficher la fiche du poste ${x.poste}`, 'warn');
    if (x.version > 1 && x.briefed?.v !== x.version) add('inform', `Informer l'équipe de la ${v} du poste ${x.poste}`, 'warn');
    if (reviewLate(x, s.params, now)) add('review', `Relire l'instruction du poste ${x.poste}`, 'warn', nextReview(x, s.params));
    renewals(x, now).forEach(r => add('renew', `Renouveler l'habilitation de ${r.person} au poste ${x.poste}`, r.late ? 'bad' : 'warn', r.until, { ref: norm(r.person), people: [r.person] }));
    openSuggestions(x).forEach(g => add('answer', `Répondre à la remarque de ${g.by || 'un opérateur'} (poste ${x.poste})`, 'warn', '', { ref: g.id }));
  });
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1));
}
export interface SopStatus { level: Level; label: string; todos: SopTodo[] }
const KIND_LABEL: Record<TodoKind, string> = { update: 'À mettre à jour', validate: 'À valider', read: 'À faire lire', display: 'À afficher', review: 'À relire', renew: 'Habilitation à renouveler', answer: 'Remarque à traiter', inform: 'Équipe à informer' };
export function sopStatus(s: State, sop: Sop, now = new Date(), todos = sopTodos(s, now)): SopStatus {
  const mine = todos.filter(t => t.sopId === sop.id), phase = sopPhase(sop);
  if (phase === 'archived') return { level: 'pending', label: PHASE_LABEL.archived, todos: [] };
  if (phase === 'draft') return { level: 'pending', label: PHASE_LABEL.draft, todos: [] };
  const first = mine[0];
  if (!first) return { level: 'ok', label: 'À jour', todos: [] };
  const late = mine.find(t => t.kind === 'update' && t.tone === 'bad') || mine.find(t => t.kind === 'update') || mine.find(t => t.kind === 'display' && t.tone === 'bad');
  const top = late || first;
  return { level: top.tone === 'bad' || top.kind === 'update' ? 'alert' : 'warn', label: top.kind === 'display' && top.tone === 'bad' ? 'Ancienne fiche affichée' : KIND_LABEL[top.kind], todos: mine };
}
export const urgency = (todos: SopTodo[], id: string) => todos.filter(t => t.sopId === id).reduce((n, t) => n + (t.tone === 'bad' ? 10 : 1), 0);

// ---- completeness of a sheet: what is missing is shown, each point leads to the right tab
export type SopTab = 'content' | 'post' | 'people' | 'display' | 'life';
export interface SopCheck { key: string; label: string; ok: boolean; tab: SopTab }
export function sopChecklist(s: State, sop: Sop): SopCheck[] {
  const min = sopCfg(s.params).minPeople;
  return [
    { key: 'steps', label: 'Étapes décrites', ok: sop.steps.some(x => x.op.trim() && x.how.trim()), tab: 'content' },
    { key: 'photos', label: 'Une photo à presque chaque étape', ok: visualRate(sop) >= 80, tab: 'content' },
    { key: 'good', label: 'Bon geste et piège écrits', ok: !!sop.good.trim() && !!sop.trap.trim(), tab: 'content' },
    { key: 'ppe', label: 'Protections indiquées', ok: sop.ppe.length > 0 || !!sop.ppeNone, tab: 'post' },
    { key: 'valid', label: 'Instruction validée', ok: sopPhase(sop) === 'active', tab: 'life' },
    { key: 'people', label: `Au moins ${plural(min, 'personne habilitée', 'personnes habilitées')}`, ok: habilitated(s, sop).length >= min, tab: 'people' },
    { key: 'display', label: 'Fiche affichée au poste', ok: displayState(sop) === 'ok', tab: 'display' },
    { key: 'read', label: 'Version lue par les personnes concernées', ok: sopPhase(sop) === 'active' && !mustRead(s, sop).length, tab: 'people' },
  ];
}
export const completeness = (checks: SopCheck[]) => Math.round(checks.filter(c => c.ok).length / checks.length * 100);

// ---- figures of the summary
export function sopSummary(s: State, now = new Date()) {
  const live = Object.values(s.sops).filter(x => sopPhase(x) !== 'archived'), active = live.filter(x => sopPhase(x) === 'active');
  const todos = sopTodos(s, now), uncovered = uncoveredPostes(s), min = sopCfg(s.params).minPeople;
  const upToDate = active.filter(x => !todos.some(t => t.sopId === x.id && t.kind !== 'answer' && t.kind !== 'inform'));
  const ages = active.map(x => daysBetween(x.versionDate, now)).filter((n): n is number => n !== null && n >= 0);
  return {
    live: live.length, active: active.length, todos, uncovered, upToDate: upToDate.length,
    stale: active.filter(x => ncsSinceVersion(s, x).length).length, readRate: readRate(s),
    covered: active.filter(x => habilitated(s, x).length >= min).length,
    noPhoto: live.filter(x => !photoCount(x)).length,
    avgMonths: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length / 30.4) : null,
  };
}

// Messages of the summary: facts about the sheets, never an order
export function sopInsights(s: State, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const live = Object.values(s.sops).filter(x => sopPhase(x) !== 'archived'), active = live.filter(x => sopPhase(x) === 'active');
  const todos = sopTodos(s, now), cfg = sopCfg(s.params);
  const of = (kind: TodoKind) => todos.filter(t => t.kind === kind).map(t => s.sops[t.sopId]).filter(Boolean);
  const stale = of('update');
  if (stale.length) out.push({ key: 'stale', tone: todos.some(t => t.kind === 'update' && t.tone === 'bad') ? 'bad' : 'warn', title: 'Standard à mettre à jour', text: `${names(stale, x => x.poste)} : défaut déclaré au poste depuis la dernière version. Délai de mise à jour : ${cfg.updateHours} h.` });
  const old = todos.filter(t => t.kind === 'display' && t.tone === 'bad').map(t => s.sops[t.sopId]);
  if (old.length) out.push({ key: 'poster', tone: 'bad', title: 'Ancienne version affichée', text: `${names(old, x => `${x.poste} (${sopVersion(x)})`)} : la fiche au poste n'est pas la dernière version.` });
  const never = todos.filter(t => t.kind === 'display' && t.tone === 'warn').map(t => s.sops[t.sopId]);
  if (never.length) out.push({ key: 'never', tone: 'warn', title: 'Fiche pas encore affichée', text: `${names(never, x => x.poste)} : aucune date d'affichage enregistrée.` });
  const unread = todos.filter(t => t.kind === 'read');
  if (unread.length) out.push({ key: 'ack', tone: 'warn', title: 'Version non lue', text: `${names(unread, t => `${s.sops[t.sopId].poste} (${plural(t.people?.length || 0, 'personne')})`)} : « lu et compris » absent pour la version en vigueur.` });
  const val = of('validate');
  if (val.length) out.push({ key: 'val', tone: 'warn', title: 'Instruction non validée', text: `${names(val, x => x.poste || 'Sans titre')} : en attente de validation par le responsable du poste.` });
  const noHab = active.filter(x => !habilitated(s, x).length);
  if (noHab.length) out.push({ key: 'hab', tone: 'warn', title: 'Aucune personne habilitée', text: `${names(noHab, x => x.poste || 'Sans titre')} : aucune habilitation enregistrée (test en 3 questions, outil 4.3).` });
  const few = active.filter(x => { const n = habilitated(s, x).length; return n > 0 && n < cfg.minPeople; });
  if (few.length) out.push({ key: 'few', tone: 'warn', title: `Moins de ${plural(cfg.minPeople, 'personne habilitée', 'personnes habilitées')}`, text: `${names(few, x => `${x.poste} (${habilitated(s, x).length})`)} : le poste dépend de peu de personnes.` });
  const ren = todos.filter(t => t.kind === 'renew');
  if (ren.length) out.push({ key: 'renew', tone: ren.some(t => t.tone === 'bad') ? 'bad' : 'warn', title: 'Habilitation à renouveler', text: `${names(ren, t => `${t.people![0]} (${s.sops[t.sopId].poste})`)} : date de renouvellement atteinte ou proche.` });
  const rev = of('review');
  if (rev.length) out.push({ key: 'review', tone: 'warn', title: 'Instruction non relue', text: `${names(rev, x => x.poste)} : pas de relecture depuis plus de ${cfg.reviewMonths} mois.` });
  const sug = todos.filter(t => t.kind === 'answer');
  if (sug.length) out.push({ key: 'sug', tone: 'warn', title: 'Remarque sans réponse', text: `${plural(sug.length, 'remarque')} d'opérateur : ${names(sug, t => s.sops[t.sopId].poste)}.` });
  const noPhoto = live.filter(x => !photoCount(x));
  if (noPhoto.length) out.push({ key: 'photo', tone: 'warn', title: 'Instruction sans photo', text: `${names(noPhoto, x => x.poste || 'Sans titre')} : une photo avec le bon geste et le piège vaut mieux qu'un paragraphe.` });
  const inform = of('inform');
  if (inform.length) out.push({ key: 'inform', tone: 'warn', title: 'Équipe pas informée', text: `${names(inform, x => `${x.poste} (${sopVersion(x)})`)} : le point de 5 minutes sur la nouvelle version n'est pas noté.` });
  const unc = uncoveredPostes(s);
  if (unc.length) out.push({ key: 'uncovered', tone: 'warn', title: 'Postes cités sans instruction', text: `${names(unc, u => `${u.name}${u.ncs ? ` (${plural(u.ncs, 'défaut déclaré', 'défauts déclarés')})` : u.machine ? ' (machine)' : ' (compétence)'}`)}.` });
  return out;
}

// ---- starting points: a template, a copy of another sheet, a sheet written step by step
export interface SopTemplate { name: string; poste: string; operation: string; ppe: string[]; steps: { op: string; how: string; watch: string; check: string }[] }
export const SOP_TEMPLATES: SopTemplate[] = [
  { name: 'Fabrication ou assemblage', poste: 'Poste de fabrication', operation: 'Opération principale', ppe: ['Lunettes de sécurité', 'Chaussures de sécurité'], steps: [
    { op: 'Préparer le poste', how: "Vérifier l'outillage et les consignes du jour", watch: 'Outil abîmé ou mal réglé', check: 'Outillage complet' },
    { op: 'Réaliser l\'opération', how: 'Suivre le geste montré sur la photo', watch: 'Le piège le plus fréquent', check: 'Première pièce validée' },
    { op: 'Contrôler', how: 'Comparer la pièce au gabarit ou au plan', watch: 'Cote ou aspect limite', check: 'Pièce conforme' },
    { op: 'Libérer et ranger', how: 'Identifier la pièce, ranger le poste', watch: 'Pièce douteuse : bac rouge', check: 'Poste propre' },
  ] },
  { name: 'Chantier ou pose', poste: 'Chantier', operation: 'Pose', ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], steps: [
    { op: 'Préparer et sécuriser la zone', how: 'Baliser, vérifier les accès et les protections', watch: 'Présence d\'autres équipes', check: 'Zone balisée' },
    { op: 'Implanter', how: 'Mesurer et tracer d\'après le plan à jour', watch: 'Plan non à jour', check: 'Cotes relevées' },
    { op: 'Réaliser', how: 'Poser selon la notice, étape par étape', watch: 'Fixation ou jeu hors tolérance', check: 'Contrôle visuel à chaque étape' },
    { op: 'Nettoyer et contrôler', how: 'Évacuer les déchets, contrôler avant de partir', watch: 'Reprise visible', check: 'Zone libérée' },
  ] },
  { name: 'Service ou prestation', poste: 'Prestation', operation: 'Réalisation', ppe: [], steps: [
    { op: 'Cadrer le besoin', how: 'Reformuler la demande avec le client', watch: 'Demande floue', check: 'Besoin validé par écrit' },
    { op: 'Réaliser', how: 'Suivre la trame de travail', watch: 'Étape sautée', check: 'Trame complétée' },
    { op: 'Relire', how: 'Faire contrôler par un second intervenant', watch: 'Erreur de saisie ou de calcul', check: 'Aucune remarque bloquante' },
    { op: 'Livrer', how: 'Remettre et expliquer les livrables', watch: 'Livrable incomplet', check: 'Accusé de réception' },
  ] },
  { name: 'Cuisine ou restauration', poste: 'Cuisine', operation: 'Préparation', ppe: ['Chaussures de sécurité', 'Blouse ou tablier'], steps: [
    { op: 'Hygiène et mise en place', how: 'Se laver les mains, préparer le plan de travail', watch: 'Surface mal nettoyée', check: 'Plan de travail propre' },
    { op: 'Préparer', how: 'Suivre la fiche de préparation', watch: 'Allergènes et contamination croisée', check: 'Étiquette de lot posée' },
    { op: 'Cuire et contrôler', how: 'Relever la température à cœur', watch: 'Température trop basse', check: 'Température notée' },
    { op: 'Dresser et tracer', how: 'Dresser selon la photo, noter le lot', watch: 'Produit hors date', check: 'Traçabilité remplie' },
  ] },
  { name: 'Nettoyage ou entretien', poste: 'Entretien', operation: 'Nettoyage', ppe: ['Gants anti-coupure', 'Chaussures de sécurité'], steps: [
    { op: 'Baliser et protéger', how: 'Poser la signalisation, mettre les protections', watch: 'Sol glissant', check: 'Panneau posé' },
    { op: 'Préparer les produits', how: 'Doser selon l\'étiquette', watch: 'Mélange de produits interdit', check: 'Dosage conforme' },
    { op: 'Nettoyer', how: 'Procéder du plus propre au plus sale', watch: 'Zone oubliée', check: 'Contrôle visuel' },
    { op: 'Contrôler et ranger', how: 'Vérifier le résultat, ranger le matériel', watch: 'Produit mal rebouché', check: 'Matériel rangé' },
  ] },
  { name: 'Logistique ou expédition', poste: 'Expédition', operation: 'Préparation de commande', ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], steps: [
    { op: 'Contrôler la commande', how: 'Comparer le bon de commande et les articles', watch: 'Référence proche', check: 'Quantités vérifiées' },
    { op: 'Préparer et emballer', how: 'Caler et protéger selon la photo', watch: 'Charge mal calée', check: 'Colis fermé' },
    { op: 'Étiqueter', how: 'Poser l\'étiquette lisible sur la bonne face', watch: 'Adresse illisible', check: 'Étiquette scannée' },
    { op: 'Remettre au transporteur', how: 'Faire signer le bon de remise', watch: 'Colis abîmé', check: 'Bon signé' },
  ] },
  { name: 'Contrôle qualité', poste: 'Poste de contrôle', operation: 'Contrôle final', ppe: ['Gants anti-coupure'], steps: [
    { op: 'Préparer l\'instrument', how: 'Vérifier la date d\'étalonnage', watch: 'Instrument hors date', check: 'Étalonnage valide' },
    { op: 'Mesurer', how: 'Mesurer aux points marqués sur le plan', watch: 'Mesure faite à la volée', check: 'Mesure répétée si doute' },
    { op: 'Enregistrer', how: 'Noter la valeur lue, sans arrondir', watch: 'Valeur recopiée de mémoire', check: 'Fiche remplie' },
    { op: 'Décider', how: 'Conforme : libérer. Douteux : bac rouge', watch: 'Pièce limite', check: 'Décision écrite' },
  ] },
];
export function sopFromTemplate(t: SopTemplate, processId = defaultProcess('P3'), today = new Date()): Sop {
  return { ...newSop(processId, today), poste: t.poste, operation: t.operation, ppe: [...t.ppe], ppeNone: !t.ppe.length || undefined, steps: t.steps.map(x => ({ ...newStep(), ...x })) };
}
// A copy keeps the content, not the life of the sheet
export function duplicateSop(src: Sop, today = new Date()): Sop {
  const c = structuredClone(src);
  return {
    ...c, id: newId('sop'), poste: `${src.poste} (copie)`, version: 1, versionDate: isoDate(today), history: [], validatedBy: '', phase: 'draft', habilitations: [],
    validatedAt: undefined, archivedAt: undefined, acks: undefined, displayedAt: undefined, displayedBy: undefined, oldRemoved: undefined, briefed: undefined,
    suggestions: undefined, journal: undefined, reviewedAt: undefined, pin: undefined, skillId: undefined,
  };
}

// ---- versions: what changes from one to the next
export const fp = (t: string) => (t ? fnv(t) : '');
export function snapOf(sop: Sop): SopSnap {
  return {
    poste: sop.poste, operation: sop.operation, good: sop.good, trap: sop.trap, goodFp: fp(sop.goodPhoto), trapFp: fp(sop.trapPhoto), ppe: [...sop.ppe],
    steps: sop.steps.map(x => ({ op: x.op, how: x.how, watch: x.watch, check: x.check, critical: x.critical, values: (x.values || []).map(v => `${v.label} ${v.value}`).join(' ; '), fps: stepPhotos(x).map(fp) })),
  };
}
// What differs between a version and the sheet as it stands, in words
export function changes(prev: SopSnap, sop: Sop): string[] {
  const out: string[] = [], cur = snapOf(sop);
  if (prev.poste !== cur.poste || prev.operation !== cur.operation) out.push('Poste ou opération renommé');
  cur.steps.forEach((st, i) => {
    const old = prev.steps[i], n = `Étape ${i + 1}`;
    if (!old) { out.push(`${n} ajoutée`); return; }
    if (old.op !== st.op) out.push(`${n} : opération modifiée`);
    if (old.how !== st.how) out.push(`${n} : « comment » modifié`);
    if (old.watch !== st.watch) out.push(`${n} : vigilance modifiée`);
    if (old.check !== st.check) out.push(`${n} : autocontrôle modifié`);
    if (old.critical !== st.critical) out.push(`${n} : point critique modifié`);
    if (old.values !== st.values) out.push(`${n} : valeurs à respecter modifiées`);
    if (old.fps.join() !== st.fps.join()) out.push(`${n} : photo changée`);
  });
  if (prev.steps.length > cur.steps.length) out.push(`${plural(prev.steps.length - cur.steps.length, 'étape retirée', 'étapes retirées')}`);
  if (prev.good !== cur.good || prev.goodFp !== cur.goodFp) out.push('Bon geste modifié');
  if (prev.trap !== cur.trap || prev.trapFp !== cur.trapFp) out.push('Piège modifié');
  if (prev.ppe.join() !== cur.ppe.join()) out.push('Protections modifiées');
  return out;
}
// Content of the version replaced: the one saved before the edits of this session
export const snapshotOfPrevious = (sop: Sop): SopSnap | undefined => sop.history.find(h => h.v === sop.version - 1)?.snap;

// ---- the life of a sheet (each move is written in its journal)
const JOURNAL_MAX = 60;
export function logged(sop: Sop, by: string, what: string, at = new Date().toISOString()): Sop {
  return { ...sop, journal: [...(sop.journal || []), { at, by: by || 'anonyme', what }].slice(-JOURNAL_MAX) };
}
export function canValidate(sop: Sop): string {
  if (!sop.poste.trim()) return 'Nommez le poste.';
  if (!sop.steps.some(x => x.op.trim())) return 'Décrivez au moins une étape.';
  return '';
}
export const sendToReview = (sop: Sop, by: string): Sop => logged({ ...sop, phase: 'review' }, by, 'Envoyée à validation');
export function validateSop(sop: Sop, by: string, who: string, today = isoDate(new Date())): Sop {
  const first = sopPhase(sop) !== 'active' && sop.version === 1 && sop.history.length <= 1;
  const next: Sop = { ...sop, phase: 'active', validatedBy: who.trim(), validatedAt: today, archivedAt: undefined, reviewedAt: today };
  if (first) { next.versionDate = today; next.history = [{ v: 1, date: today, reason: 'Mise en vigueur', by }]; }
  return logged(next, by, `Validée par ${who.trim()}`);
}
export const archiveSop = (sop: Sop, by: string, today = isoDate(new Date())): Sop => logged({ ...sop, phase: 'archived', archivedAt: today }, by, 'Archivée');
export const reopenSop = (sop: Sop, by: string): Sop => logged({ ...sop, phase: 'review', archivedAt: undefined }, by, 'Rouverte pour validation');
// New version: the content replaced is kept (texts and fingerprints of the pictures) so the next sheet can show what changed
export function bumpSop(sop: Sop, saved: Sop | undefined, o: { kind: string; detail: string; by: string; today?: string }): Sop {
  const today = o.today || isoDate(new Date()), base = sop.history.length ? sop.history : [{ v: sop.version, date: sop.versionDate, reason: 'Création' }];
  const reason = reasonText(o.kind, o.detail);
  const history = [...base.map(h => (h.v === sop.version ? { ...h, snap: snapOf(saved || sop) } : h)), { v: sop.version + 1, date: today, reason, kind: o.kind, by: o.by }];
  return logged({ ...sop, version: sop.version + 1, versionDate: today, history, reviewedAt: today, validatedAt: today }, o.by, `Nouvelle version ${sopVersion({ version: sop.version + 1 })} : ${reason}`);
}
export function postSheet(sop: Sop, by: string, oldRemoved: boolean, today = isoDate(new Date())): Sop {
  return logged({ ...sop, displayedAt: today, displayedBy: by, oldRemoved }, by, `Fiche ${sopVersion(sop)} affichée au poste${oldRemoved ? ', ancienne fiche retirée' : ''}`);
}
export function acknowledge(sop: Sop, person: string, today = isoDate(new Date()), sig?: Strokes): Sop {
  const p = person.trim();
  if (!p || (sop.acks || []).some(a => a.v === sop.version && norm(a.person) === norm(p))) return sop;
  return logged({ ...sop, acks: [...(sop.acks || []), { person: p, v: sop.version, date: today, ...(sig?.length ? { sig } : {}) }] }, p, `Lu et compris ${sopVersion(sop)}`);
}
export const inform = (sop: Sop, by: string, today = isoDate(new Date())): Sop => logged({ ...sop, briefed: { v: sop.version, date: today, by } }, by, `Équipe informée de la ${sopVersion(sop)}`);
export const reviewed = (sop: Sop, by: string, today = isoDate(new Date())): Sop => logged({ ...sop, reviewedAt: today }, by, 'Relue, rien ne change');
// A person reaches a stage on the sheet (null removes the person)
export function setStage(sop: Sop, person: string, stage: SopStage | null, o: { tutor?: string; date?: string; until?: string; by: string }): Sop {
  const p = person.trim(), rest = sop.habilitations.filter(h => norm(h.person) !== norm(p)), old = sop.habilitations.find(h => norm(h.person) === norm(p));
  if (!p) return sop;
  if (!stage) return logged({ ...sop, habilitations: rest }, o.by, `${p} retiré(e) des personnes du poste`);
  const h: SopHabilitation = { person: p, tutor: o.tutor ?? old?.tutor ?? '', date: o.date || isoDate(new Date()), stage, ...(o.until ?? old?.until ? { until: o.until ?? old?.until } : {}) };
  return logged({ ...sop, habilitations: [...rest, h] }, o.by, `${p} : ${STAGES.find(x => x.key === stage)!.label.toLowerCase()}`);
}
export function addSuggestion(sop: Sop, by: string, text: string, photo = '', today = isoDate(new Date())): Sop {
  const g: SopSuggestion = { id: newId('sg'), by: by.trim(), date: today, text: text.trim(), photo: photo || undefined, status: 'new', answer: '', answeredAt: '' };
  return logged({ ...sop, suggestions: [...(sop.suggestions || []), g] }, by, `Remarque de ${by || 'un opérateur'}`);
}
export function answerSuggestion(sop: Sop, id: string, status: 'kept' | 'declined', answer: string, by: string, today = isoDate(new Date())): Sop {
  return logged({ ...sop, suggestions: (sop.suggestions || []).map(g => (g.id === id ? { ...g, status, answer: answer.trim(), answeredAt: today } : g)) }, by, status === 'kept' ? 'Remarque retenue' : 'Remarque non retenue');
}

// ---- test of autonomy: 3 questions made from the sheet, and a picture quiz "good or not good ?"
const short = (t: string, n = 80) => (t.length > n ? `${t.slice(0, n - 1).trim()}…` : t);
export function testQuestions(sop: Sop): string[] {
  const first = sop.steps.find(x => x.op.trim());
  return [
    `Montre-moi la fiche du poste, puis dis la première étape${first ? ` (« ${short(first.op, 50)} »)` : ''}.`,
    `Explique-moi le piège${sop.trap.trim() ? ` : « ${short(sop.trap)} »` : ''} et comment l'éviter.`,
    `Fais l'opération devant moi${sop.operation.trim() ? ` (${short(sop.operation, 60)})` : ''}${sop.ppe.length ? `, avec ${sop.ppe.join(', ').toLowerCase()}` : ''}.`,
  ];
}
export interface QuizItem { photo: string; good: boolean; label: string }
export function photoQuiz(sop: Sop): QuizItem[] {
  const items: QuizItem[] = [
    { photo: sop.goodPhoto, good: true, label: 'Le bon geste' }, { photo: sop.trapPhoto, good: false, label: 'Le piège' },
    { photo: sop.limits?.goodPhoto || '', good: true, label: 'Pièce bonne' }, { photo: sop.limits?.rejectPhoto || '', good: false, label: 'Pièce à rebuter' },
  ].filter(x => x.photo);
  // alternate good and not good, so the order gives nothing away
  const goods = items.filter(x => x.good), bads = items.filter(x => !x.good), out: QuizItem[] = [];
  for (let i = 0; i < Math.max(goods.length, bads.length); i++) { if (bads[i]) out.push(bads[i]); if (goods[i]) out.push(goods[i]); }
  return out;
}

// ---- who can work where: the matrix
export function matrixPeople(s: State): string[] {
  const rows = Object.values(s.sops).filter(x => sopPhase(x) === 'active');
  return unique([...activePeople(s).map(p => p.name), ...rows.flatMap(x => x.habilitations.map(h => h.person))]);
}
// Workstations in force where a person works alone
export const postesHeldBy = (s: State, name: string) => Object.values(s.sops).filter(x => sopPhase(x) === 'active' && ['alone', 'trainer'].includes(stageOf(s, x, name).stage || '')).length;

// ---- what a person types in the sheet, and what lives apart
// Reading, posting, people, journal, versions and state change through their own moves (and from the full-screen view): saving what is typed never overwrites them
const LIFE_KEYS = ['acks', 'suggestions', 'journal', 'habilitations', 'displayedAt', 'displayedBy', 'oldRemoved', 'briefed', 'reviewedAt', 'version', 'versionDate', 'history', 'phase', 'validatedBy', 'validatedAt', 'archivedAt'] as const;
export function takeLife(into: Sop, from: Sop | undefined): Sop {
  if (!from) return into;
  const out = { ...into } as Record<string, unknown>;
  for (const k of LIFE_KEYS) { if (from[k] === undefined) delete out[k]; else out[k] = from[k]; }
  return out as unknown as Sop;
}
// How much a sheet holds, in things that can be removed (list items and pictures), not in letters: used to tell that something was removed
const isPhoto = (v: string) => v.startsWith('photo:') || v.startsWith('data:image/');
export function structMass(x: unknown): number {
  if (typeof x === 'string') return isPhoto(x) ? 1 : 0;
  if (Array.isArray(x)) return x.reduce((n: number, y) => n + structMass(y), x.length);
  if (x && typeof x === 'object') return Object.values(x).reduce((n: number, y) => n + structMass(y), 0);
  return 0;
}
// A sheet may be deleted only while it is a draft that nobody read and that never had a second version; otherwise it is archived (its history stays)
export const canDelete = (sop: Sop): boolean => sopPhase(sop) === 'draft' && !(sop.acks || []).length && sop.version <= 1 && sop.history.length <= 1 && !sop.habilitations.length && !(sop.suggestions || []).length;
export const lostByDeleting = (sop: Sop): string => {
  const parts = [`${(sop.acks || []).length} lecture(s) signée(s)`, `${sop.habilitations.length} personne(s) suivie(s)`, `${Math.max(sop.history.length, 1)} version(s)`, `${(sop.journal || []).length} ligne(s) de journal`, `${(sop.suggestions || []).length} remarque(s)`];
  return parts.join(', ');
};
