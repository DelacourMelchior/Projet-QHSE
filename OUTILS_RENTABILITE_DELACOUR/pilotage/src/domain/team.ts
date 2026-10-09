// Tools 4.2 to 4.4: versatility matrix and key person, welcome path with the 3-question autonomy test, naming charter and 30-second test.
// Pure functions, covered by team.test.ts. Tool 4.1 (emergency deputies) is in powers.ts.
import type { ChronoTest, Ged, Newcomer, Person, Risk, Skill, SkillLevel, State } from './types';
import { addDays, daysBetween, defaultProcess, PROCESS_IDS, type Insight } from './base';
import { isoDate } from './periods';
import { newRisk } from './risk';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---- 4.2 versatility: levels 0 to 4, at least 2 people autonomous (level 3 or 4) on every key skill
export const LEVELS: { level: SkillLevel; label: string; short: string }[] = [
  { level: 0, label: 'Non formé', short: '0' }, { level: 1, label: 'Débutant, supervisé', short: '1' }, { level: 2, label: 'Autonome sur le courant', short: '2' },
  { level: 3, label: 'Autonome complet', short: '3' }, { level: 4, label: 'Formateur', short: '4' },
];
// Short names of the processes, for the tabs of the matrix and the directory
export const PROCESS_SHORT: Record<string, string> = { P1: 'Direction', P2: 'Commercial', P3: 'Opérations', P4: 'RH', P5: 'Qualité' };
// Processes a person works in: the ones chosen in the directory, else the ones of the skills she already holds
export const processesOf = (s: State, p: Person) => p.processIds ?? PROCESS_IDS.filter(id => Object.values(s.skills).some(k => k.processId === id && (k.levels[p.id] ?? 0) > 0));
// Columns of the matrix of a process: the people who work in it (the skill belongs to the process, so does the team that holds it)
export const processPeople = (s: State, id: string) => activePeople(s).filter(p => processesOf(s, p).includes(id));
export const activePeople = (s: State) => Object.values(s.people).filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name));
export const autonomous = (s: State, k: Skill) => activePeople(s).filter(p => (k.levels[p.id] ?? 0) >= 3);
export type SkillRisk = 'none' | 'single' | 'short' | 'ok';
export const SKILL_RISK: Record<SkillRisk, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  none: { label: 'Personne d\'autonome', tone: 'alert' }, single: { label: 'Homme-clé', tone: 'alert' }, short: { label: 'Doublure insuffisante', tone: 'warn' }, ok: { label: 'Doublé', tone: 'ok' },
};
export const skillRisk = (s: State, k: Skill): SkillRisk => { const n = autonomous(s, k).length; return n === 0 ? 'none' : n === 1 ? 'single' : n < (k.required || 2) ? 'short' : 'ok'; };
export const LEVEL_CRITERIA = [
  'N\'a jamais pratiqué, ou seulement observé.',
  'Fait les tâches simples avec quelqu\'un à côté.',
  'Fait seul le travail courant ; appelle pour les cas difficiles.',
  'Fait seul tout le travail du poste, y compris les réglages et les cas difficiles.',
  'Forme les autres et fait évoluer la méthode.',
];
export const staleLevels = (s: State, today = new Date()) => Object.values(s.skills).filter(k => Object.entries(k.levels).some(([id, l]) => l >= 3 && s.people[id]?.active && (daysBetween(k.levelDates?.[id] || '', today) ?? 9999) > 365));
export const coveragePct = (s: State) => {
  const all = Object.values(s.skills);
  const ks = all.some(k => k.critical) ? all.filter(k => k.critical) : all;   // the critical skills when some are flagged
  return ks.length ? Math.round(ks.filter(k => skillRisk(s, k) === 'ok').length / ks.length * 100) : null;
};
// People who are the only autonomous one on at least one skill
export const keyPeople = (s: State) => {
  const out: Record<string, string[]> = {};
  Object.values(s.skills).forEach(k => { const a = autonomous(s, k); if (a.length === 1) (out[a[0].id] ||= []).push(k.name); });
  return Object.entries(out).map(([id, skills]) => ({ person: s.people[id], skills }));
};
export const PLAN_SESSIONS = 6;   // after 6 tutoring sessions, 2 days alone on the job validate level 3
export const newPerson = (name = ''): Person => ({ id: uid('pp'), name, role: '', active: true });
export const newSkill = (processId = defaultProcess('P3')): Skill => ({ id: uid('sk'), name: '', processId, levels: {}, plan: null });
export const bestTutor = (s: State, k: Skill) => activePeople(s).filter(p => (k.levels[p.id] ?? 0) === 4)[0] || activePeople(s).filter(p => (k.levels[p.id] ?? 0) === 3)[0];

// Risk of tool 1.2 for a key person: absence of the only autonomous one, covered by a trained double
export function keyPersonRisk(s: State, k: Skill): Risk {
  const who = autonomous(s, k)[0]?.name || 'la personne clé';
  return { ...newRisk(k.processId), title: `Absence de ${who} (${k.name})`, resource: `Compétence tenue par une seule personne : ${k.name}`, family: 'doublure', owner: '', cause: 'Aucune autre personne autonome sur ce poste (matrice de polyvalence, outil 4.2)' };
}
export function skillInsights(s: State): Insight[] {
  const out: Insight[] = [];
  const ks = Object.values(s.skills);
  const single = ks.filter(k => skillRisk(s, k) === 'single');
  if (single.length) out.push({ key: 'single', tone: 'bad', title: 'Homme-clé', text: `${names(single, k => `${k.name} (${autonomous(s, k)[0].name})`)} : une seule personne autonome. Former une doublure, 2 h par semaine.` });
  const none = ks.filter(k => skillRisk(s, k) === 'none');
  if (none.length) out.push({ key: 'none', tone: 'bad', title: 'Personne d\'autonome', text: `${names(none, k => k.name)}.` });
  const noPlan = single.concat(none).filter(k => !k.plan);
  if (noPlan.length) out.push({ key: 'plan', tone: 'warn', title: 'Doublure à organiser', text: `${names(noPlan, k => k.name)} : choisir un tuteur, un apprenant et un créneau fixe.` });
  const late = ks.filter(k => k.plan?.target && (daysBetween(k.plan.target, new Date()) ?? -1) > 0 && skillRisk(s, k) !== 'ok');
  if (late.length) out.push({ key: 'late', tone: 'warn', title: 'Doublure en retard', text: `${names(late, k => k.name)} : date cible dépassée sans passage au niveau 3.` });
  const stale = staleLevels(s);
  if (stale.length) out.push({ key: 'stale', tone: 'warn', title: 'Niveaux à réévaluer', text: `${names(stale, k => k.name)} : évaluation de plus d'un an.` });
  const noRisk = single.filter(k => !Object.values(s.risks).some(r => r.resource.includes(k.name)));
  if (noRisk.length && single.length) out.push({ key: 'risk', tone: 'warn', title: 'Risque à inscrire dans les Plans B', text: `${names(noRisk, k => k.name)} : l'absence de la personne clé est un risque vital (outil 1.2).` });
  return out;
}

// ---- 4.3 welcome path over 15 days and autonomy test in 3 questions
export const CHECKLIST: { key: string; stage: string; label: string; legal?: boolean }[] = [
  { key: 'visit', stage: 'Jour 1 : accueil et sécurité', label: 'Visite des locaux et présentation de l\'équipe et du tuteur' },
  { key: 'ppe', stage: 'Jour 1 : accueil et sécurité', label: 'Équipements de protection remis et portés' },
  { key: 'safety', stage: 'Jour 1 : accueil et sécurité', label: 'Consignes de sécurité et d\'urgence expliquées' },
  { key: 'pair', stage: 'Semaine 1 : en binôme', label: 'Travail côte à côte avec le tuteur, sans rien faire seul' },
  { key: 'standard', stage: 'Semaine 1 : en binôme', label: 'Instructions du poste montrées au poste (outil 3.2)' },
  { key: 'practice', stage: 'Semaine 2 : prise en main', label: 'Tâches courantes sous supervision légère' },
  { key: 'review', stage: 'Semaine 2 : prise en main', label: 'Questions et retouches revues avec le tuteur' },
];
// Legal and practical steps the company can add to its checklist (settings)
export const EXTRA_STEPS: { key: string; stage: string; label: string; legal?: boolean }[] = [
  { key: 'dpae', stage: 'Avant l\'arrivée', label: 'Déclaration préalable à l\'embauche faite (sauf intérim)', legal: true },
  { key: 'vip', stage: 'Avant l\'arrivée', label: 'Visite d\'information et de prévention planifiée', legal: true },
  { key: 'renforcee', stage: 'Jour 1 : accueil et sécurité', label: 'Formation renforcée à la sécurité (intérimaire ou CDD sur poste à risques)', legal: true },
  { key: 'acces', stage: 'Jour 1 : accueil et sécurité', label: 'Badge, clés, accès informatique remis' },
];
export const DOCS = ['Règlement intérieur', 'Livret sécurité', 'Instruction du poste (3.2)', 'Organigramme et contacts'];
export const checklistOf = (s: Pick<State, 'params'>) => s.params.welcome?.length ? s.params.welcome : CHECKLIST;
export const TEST = [
  'Montre-moi la fiche du poste et explique-moi les points de contrôle et de sécurité.',
  'Montre-moi le piège à éviter qui donne un rebut ou une non-conformité.',
  'Fais une pièce ou une tâche complète devant moi, sans aide.',
];
export const TEST_DAYS = 15;
export const KIND_LABEL: Record<Newcomer['kind'], string> = { cdi: 'CDI', cdd: 'CDD', interim: 'Intérim', alternance: 'Alternance' };
export const testDate = (n: Newcomer) => (n.arrival ? addDays(n.arrival, n.testDays || TEST_DAYS) : '');
export const testPassed = (n: Newcomer) => n.test.answers.length === 3 && n.test.answers.every(a => a === true);
export type NewcomerState = 'welcome' | 'tutoring' | 'test_due' | 'failed' | 'to_authorize' | 'autonomous';
export const NEWCOMER_STATE: Record<NewcomerState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  welcome: { label: 'Accueil du jour 1 à finir', tone: 'warn' }, tutoring: { label: 'En binôme', tone: 'pending' },
  test_due: { label: 'Test d\'autonomie à faire', tone: 'warn' }, failed: { label: 'Test à repasser', tone: 'alert' },
  to_authorize: { label: 'Autorisation à signer', tone: 'warn' }, autonomous: { label: 'Autonome', tone: 'ok' },
};
export function newcomerState(n: Newcomer, today = new Date(), list = CHECKLIST): NewcomerState {
  if (n.authorizedAt) return 'autonomous';
  if (testPassed(n)) return 'to_authorize';
  if (n.test.answers.some(a => a === false)) return 'failed';
  if (list.filter(c => c.stage.startsWith('Jour 1') || c.stage.startsWith('Avant')).some(c => !n.done[c.key])) return 'welcome';
  return (daysBetween(testDate(n), today) ?? -1) >= 0 ? 'test_due' : 'tutoring';
}
export const newNewcomer = (today = new Date()): Newcomer => ({
  id: uid('nw'), name: '', poste: '', kind: 'cdi', tutor: '', arrival: isoDate(today), done: {}, test: { date: '', answers: [null, null, null], note: '' },
  authorizedBy: '', authorizedAt: '', sopId: '', skillId: '',
});
export function newcomerInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const ns = Object.values(s.newcomers);
  const alone = ns.filter(n => !n.authorizedAt && (daysBetween(n.arrival, today) ?? 0) > TEST_DAYS + 7);
  if (alone.length) out.push({ key: 'alone', tone: 'bad', title: 'Autonomie non validée', text: `${names(alone, n => n.name)} : plus de 3 semaines sans autorisation écrite. Ne pas le laisser seul au poste avant le test.` });
  const due = ns.filter(n => newcomerState(n, today, checklistOf(s)) === 'test_due');
  if (due.length) out.push({ key: 'due', tone: 'warn', title: 'Test d\'autonomie à faire', text: `${names(due, n => `${n.name} (tuteur : ${n.tutor || 'à désigner'})`)}.` });
  const welcome = ns.filter(n => newcomerState(n, today, checklistOf(s)) === 'welcome');
  if (welcome.length) out.push({ key: 'welcome', tone: 'warn', title: 'Accueil incomplet', text: `${names(welcome, n => n.name)} : sécurité et équipements du jour 1 à terminer.` });
  const load: Record<string, number> = {};
  ns.filter(n => !n.authorizedAt && n.tutor.trim()).forEach(n => { load[n.tutor.trim()] = (load[n.tutor.trim()] || 0) + 1; });
  const heavy = Object.entries(load).filter(([, x]) => x > 2);
  if (heavy.length) out.push({ key: 'load', tone: 'warn', title: 'Tuteur surchargé', text: `${heavy.map(([t, x]) => `${t} (${x} recrues)`).join(', ')} : répartir le tutorat.` });
  const noFb = ns.filter(n => n.authorizedAt && !n.feedback?.trim() && (daysBetween(n.arrival, today) ?? 0) >= 30 && (daysBetween(n.arrival, today) ?? 0) <= 120);
  if (noFb.length) out.push({ key: 'fb', tone: 'warn', title: 'Rapport d\'étonnement', text: `${names(noFb, n => n.name)} : demander ce qui l'a surpris en arrivant (J+30).` });
  const noTutor = ns.filter(n => !n.authorizedAt && !n.tutor.trim());
  if (noTutor.length) out.push({ key: 'tutor', tone: 'bad', title: 'Recrue sans tuteur', text: `${names(noTutor, n => n.name)} : le tuteur répond des premières pièces de la recrue.` });
  return out;
}

// ---- 4.4 naming charter: PROC_TYPE_OBJET_AAAAMMJJ_Vxx, one active version, the 30-second test
const clean = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
export function fileName(p: { proc: string; type: string; object: string; date: string; version: number; ext: string }): string {
  const ext = p.ext.replace(/^\./, '').toLowerCase();
  return `${clean(p.proc)}_${clean(p.type)}_${clean(p.object) || 'OBJET'}_${p.date.replace(/-/g, '')}_V${String(Math.max(1, p.version)).padStart(2, '0')}${ext ? `.${ext}` : ''}`;
}
const FORBIDDEN = /^(final|finale|dernier|derniere|nouveau|nouvelle|bon|copie|copy|old|ancien|bis|temp|tmp)$/i;
// Why a file name does not follow the charter (empty = compliant)
export function checkName(name: string, g: Ged): string[] {
  const out: string[] = [];
  const t = name.trim();
  if (!t) return ['Nom vide'];
  if (/\s/.test(t)) out.push('Espace dans le nom : utiliser _');
  if (/[À-ÿ]/.test(t)) out.push('Accent dans le nom');
  const base = t.replace(/\.[a-z0-9]{1,5}$/i, '');
  const parts = base.split('_');
  const m = base.match(/^([A-Za-z]+)_([A-Za-z]+)_(.+)_(\d{8})_[Vv](\d{2})$/);
  if (!m) {
    out.push('Ne suit pas le modèle PROC_TYPE_OBJET_AAAAMMJJ_Vxx');
    if (!/_[Vv]\d{2}$/.test(base)) out.push('Indice de version absent (_V01, _V02…)');
    if (!parts.some(x => /^\d{8}$/.test(x))) out.push('Date AAAAMMJJ absente');
  } else {
    if (!g.procCodes.some(c => c.code === m[1].toUpperCase())) out.push(`Code processus inconnu : ${m[1]} (${g.procCodes.map(c => c.code).join(', ')})`);
    if (!g.typeCodes.some(c => c.code === m[2].toUpperCase())) out.push(`Type de document inconnu : ${m[2]} (${g.typeCodes.map(c => c.code).join(', ')})`);
    const [y, mo, d] = [+m[4].slice(0, 4), +m[4].slice(4, 6), +m[4].slice(6, 8)];
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000) out.push(`Date impossible : ${m[4]}`);
  }
  const words = base.split(/[_\-. ]+/).filter(w => FORBIDDEN.test(w));
  if (words.length) out.push(`Mot interdit : ${words.join(', ')} (la version se lit dans l'indice Vxx)`);
  return out;
}
// Audit of a real folder: file names off the charter, several versions of the same document in the same folder
export function auditFiles(files: { folder: string; name: string }[], g: Ged) {
  const bad = files.filter(f => checkName(f.name, g).length);
  const groups: Record<string, string[]> = {};
  files.forEach(f => { const m = f.name.replace(/\.[a-z0-9]{1,5}$/i, '').match(/^(.*)_[Vv]\d{2}$/); if (m) (groups[`${f.folder}/${m[1]}`] ||= []).push(f.name); });
  const versions = Object.entries(groups).filter(([, xs]) => xs.length > 1).map(([k, xs]) => ({ folder: k.slice(0, k.lastIndexOf('/')), names: xs.sort() }));
  return { total: files.length, bad, versions, okPct: files.length ? Math.round((files.length - bad.length) / files.length * 100) : null };
}
export const MIGRATION_STEPS = ['Nouveaux fichiers nommés selon la charte', 'Dossiers des affaires en cours renommés', 'Plans de fabrication : une seule version active', 'Bureaux des ordinateurs vidés', 'Anciens dossiers archivés tels quels'];
export const CHRONO_SECONDS = 30;
export const chronoOk = (c: ChronoTest) => c.found && !c.obsolete && c.seconds !== null && c.seconds <= CHRONO_SECONDS;
export const newChrono = (today = new Date()): ChronoTest => ({ id: uid('ch'), date: isoDate(today), person: '', asked: '', seconds: null, found: true, obsolete: false });
export function chronoSummary(s: State, today = new Date()) {
  const since = isoDate(new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()));
  const recent = Object.values(s.chronos).filter(c => c.date >= since);
  const last = Object.values(s.chronos).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return {
    count: recent.length, okPct: recent.length ? Math.round(recent.filter(chronoOk).length / recent.length * 100) : null,
    obsolete: recent.filter(c => c.obsolete).length, last, monthDone: !!last && last.date.slice(0, 7) === isoDate(today).slice(0, 7),
  };
}
export function gedInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const c = chronoSummary(s, today);
  if (!c.monthDone) out.push({ key: 'month', tone: 'warn', title: 'Test des 30 secondes du mois', text: 'Tirer au sort un collaborateur et lui demander d\'ouvrir le dernier plan ou devis validé, chronomètre en main.' });
  if (c.obsolete) out.push({ key: 'obs', tone: 'bad', title: 'Version périmée trouvée', text: `${c.obsolete} test(s) sur 6 mois ont fait ouvrir une ancienne version : la déplacer dans ${s.ged.archive}.` });
  const failed = Object.values(s.chronos).filter(x => x.date.slice(0, 7) === isoDate(today).slice(0, 7) && !chronoOk(x));
  if (failed.length) out.push({ key: 'fail', tone: 'warn', title: 'Document trop long à trouver', text: `${names(failed, x => `${x.asked} (${x.seconds ?? '?'} s)`)} : revoir le classement ou le nom.` });
  if ((daysBetween(s.ged.rightsCheckedAt || '', today) ?? 999) > 183) out.push({ key: 'rights', tone: 'warn', title: 'Droits d\'accès à vérifier', text: 'Revoir chaque semestre qui a accès à chaque dossier (direction, RH).' });
  if (!s.ged.owner.trim()) out.push({ key: 'owner', tone: 'warn', title: 'Responsable du classement', text: 'Nommer la personne qui fait respecter la charte et le plan de classement.' });
  return out;
}
