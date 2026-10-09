// Example records of tools 4.2 to 4.4, for the fictitious company of the demo (the same people as the other tools); the vital powers of 4.1 are in powersExamples.ts.
import type { ChronoTest, Newcomer, Person, Skill, SkillLevel, State } from './types';
import { isoDate } from './periods';
import { defaultGed, fillEmptyCollections, EXAMPLE_COMPANY } from './base';
import { CHECKLIST } from './team';
import { exampleAbsences, examplePeople } from './powersExamples';

export const TEAM_EXAMPLE_LEVEL = 1;
// The people of the fictitious company beyond the first twelve, with the processes they work in (the skills of a process are held by the people of that process)
const EXTRA_PEOPLE: [string, string, string, string[]][] = [
  ['prod', 'Frédéric A.', 'Directeur de production', ['P1', 'P3']], ['claire', 'Claire D.', 'Accueil et assistante de direction', ['P1']], ['valerie', 'Valérie M.', 'Comptable', ['P1']],
  ['kevin', 'Kevin D.', 'Aide-comptable', ['P1']], ['chloe', 'Chloé R.', "Chargée d'affaires", ['P2']], ['ines', 'Inès K.', 'Assistante RH (alternance)', ['P4']],
  ['manon', 'Manon T.', 'Technicienne qualité', ['P5']], ['baptiste', 'Baptiste G.', 'Contrôleur qualité', ['P5']], ['alexis', 'Alexis P.', 'Technicien méthodes', ['P3']],
  ['eric', 'Éric V.', 'Chef d\'équipe montage et soudure', ['P3']], ['damien', 'Damien L.', 'Électromécanicien', ['P3']], ['rachid', 'Rachid H.', 'Responsable maintenance', ['P3']],
  ['samuel', 'Samuel G.', 'Cariste', ['P3']], ['olivier', 'Olivier N.', 'Cariste', ['P3']], ['fabien', 'Fabien T.', 'Chauffeur livreur', ['P3']],
];

export function teamExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const team: [string, string, string][] = [
    ['jm', 'Jean-Marc', 'Dirigeant'], ['lb', 'Laurent B.', 'Commercial'], ['sv', 'Sophie V.', 'Achats et ADV'], ['dk', 'David K.', "Chef d'atelier"],
    ['mm', 'Marc M.', 'Méthodes et programmation'], ['jp', 'Julien P.', 'Régleur CNC'], ['kt', 'Karim T.', 'Plieur'], ['lu', 'Lucie B.', 'Monteuse câbleuse'],
    ['nr', 'Nicolas R.', 'Soudeur'], ['ap', 'Antoine P.', 'Responsable qualité'], ['tm', 'Thomas M.', 'Informatique et administration'], ['hr', 'Hélène R.', 'Comptabilité'],
  ];
  const TEAM: Record<string, string> = { jm: 'Direction', lb: 'Bureau', sv: 'Bureau', hr: 'Bureau', tm: 'Bureau', ap: 'Bureau', dk: 'Atelier', mm: 'Atelier', jp: 'Atelier', kt: 'Atelier', lu: 'Atelier', nr: 'Atelier' };
  const PROC: Record<string, string[]> = { jm: ['P1', 'P2'], lb: ['P2'], sv: ['P2'], dk: ['P3'], mm: ['P3'], jp: ['P3'], kt: ['P3'], lu: ['P3'], nr: ['P3'], ap: ['P5', 'P3'], tm: ['P1', 'P4'], hr: ['P1', 'P4'] };
  const away = exampleAbsences(ago);
  const people: Person[] = [...team.map(([k, name, role]) => ({ id: `pp_demo_${k}`, name, role, active: true, team: TEAM[k], processIds: PROC[k], ...(away[k] ? { absences: away[k] } : {}) })),
    ...EXTRA_PEOPLE.map(([k, name, role, processIds]) => ({ id: `pp_demo_${k}`, name, role, active: true, processIds })), ...examplePeople()];
  const pp = (k: string) => `pp_demo_${k}`;
  const lv = (x: Record<string, SkillLevel>): Record<string, SkillLevel> => Object.fromEntries(Object.entries(x).map(([k, v]) => [pp(k), v]));
  const skill = (n: number, name: string, processId: string, levels: Record<string, SkillLevel>, plan: Skill['plan'] = null): Skill => ({ id: `sk_demo_${n}`, name, processId, levels: lv(levels), plan });
  const skills: Skill[] = [
    // P1 Direction et pilotage
    { ...skill(7, 'Paie et virements', 'P1', { hr: 4, jm: 1 }), critical: true },
    skill(8, 'Clôture comptable du mois', 'P1', { valerie: 4, hr: 3, kevin: 2 }),
    skill(9, 'Sauvegardes et accès informatiques', 'P1', { tm: 4, claire: 1 }),
    // P2 Commercial
    skill(6, 'Chiffrage des devis', 'P2', { lb: 4, jm: 3, sv: 1 }),
    skill(10, 'Suivi des commandes clients', 'P2', { sv: 4, chloe: 3, lb: 2 }),
    // P3 Réalisation et opérations
    { ...skill(1, 'Programmation CNC 5 axes', 'P3', { mm: 4, jp: 2, dk: 1 }, { tutor: pp('mm'), learner: pp('jp'), slot: 'Vendredi 14 h - 16 h', target: ago(-30), sessions: 3 }), critical: true },
    { ...skill(2, 'Réglage de la presse plieuse', 'P3', { kt: 4, nr: 3, dk: 3, jp: 1 }), required: 3, critical: true },
    skill(3, 'Soudure TIG inox', 'P3', { nr: 4, kt: 1 }),
    skill(4, 'Montage et câblage des armoires', 'P3', { lu: 4, jp: 3, nr: 2 }),
    skill(11, 'Conduite du chariot élévateur', 'P3', { samuel: 4, olivier: 3, fabien: 3 }),
    skill(12, 'Maintenance de premier niveau des machines', 'P3', { rachid: 4, damien: 3, dk: 2 }),
    // P4 Ressources humaines et organisation
    skill(13, 'Déclarations sociales du mois', 'P4', { hr: 4, ines: 1 }),
    skill(14, 'Accueil et suivi des nouveaux arrivants', 'P4', { ines: 3, hr: 4, tm: 2 }),
    // P5 Qualité et amélioration
    { ...skill(5, 'Contrôle final et PV de réception', 'P5', { ap: 4, baptiste: 2, manon: 2 }, { tutor: pp('ap'), learner: pp('baptiste'), slot: 'Mardi 9 h - 10 h 30', target: ago(5), sessions: 6 }), critical: true },
    skill(15, 'Traitement des non-conformités', 'P5', { ap: 4, manon: 3 }),
    skill(16, "Étalonnage des instruments de mesure", 'P5', { baptiste: 4, manon: 1 }),
  ];
  const all = (keys: string[], days: number) => Object.fromEntries(keys.map(k => [k, ago(days)]));
  const day1 = CHECKLIST.filter(c => c.stage.startsWith('Jour 1')).map(c => c.key);
  const week1 = CHECKLIST.filter(c => c.stage.startsWith('Semaine 1')).map(c => c.key);
  const week2 = CHECKLIST.filter(c => c.stage.startsWith('Semaine 2')).map(c => c.key);
  const nw = (n: number, p: Partial<Newcomer>): Newcomer => ({
    id: `nw_demo_${n}`, name: '', poste: '', kind: 'cdi', tutor: '', arrival: ago(10), done: {}, test: { date: '', answers: [null, null, null], note: '' },
    authorizedBy: '', authorizedAt: '', sopId: '', skillId: '', ...p,
  });
  const newcomers: Newcomer[] = [
    nw(1, { name: 'Emma G.', poste: 'Monteuse câbleuse', kind: 'interim', tutor: 'Lucie B.', arrival: ago(20), done: { ...all(day1, 20), ...all(week1, 16), ...all(week2, 8) }, test: { date: ago(5), answers: [true, true, true], note: 'Pièce conforme du premier coup' }, sopId: 'sop_demo_1', skillId: 'sk_demo_4' }),
    nw(2, { name: 'Hugo L.', poste: 'Aide soudeur', kind: 'cdd', tutor: 'Nicolas R.', arrival: ago(4), done: { visit: ago(4), ppe: ago(4) } }),
    nw(3, { name: 'Sarah M.', poste: 'Opératrice plieuse', kind: 'alternance', tutor: 'Karim T.', arrival: ago(60), done: { ...all(day1, 60), ...all(week1, 55), ...all(week2, 48) }, test: { date: ago(44), answers: [true, true, true], note: '' }, authorizedBy: 'David K.', authorizedAt: ago(44), skillId: 'sk_demo_2' }),
    nw(4, { name: 'Yanis B.', poste: 'Opérateur sur commande numérique', kind: 'interim', tutor: '', arrival: ago(25), done: { ...all(day1, 25), ...all(week1, 20) }, test: { date: ago(9), answers: [true, false, null], note: 'Ne sait pas montrer le piège du poste' } }),
  ];
  const chrono = (n: number, days: number, person: string, asked: string, seconds: number, found = true, obsolete = false): ChronoTest => ({ id: `ch_demo_${n}`, date: ago(days), person, asked, seconds, found, obsolete });
  const chronos: ChronoTest[] = [
    chrono(1, 150, 'Julien P.', 'Dernier plan du châssis 405', 22),
    chrono(2, 120, 'Sophie V.', 'Devis du Client C', 45),
    chrono(3, 90, 'Karim T.', 'Plan des équerres de fixation', 18, true, true),
    chrono(4, 60, 'Lucie B.', 'Instruction du poste montage', 12),
    chrono(5, 35, 'Laurent B.', 'Avenant signé de BâtiPro', 25),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return {
    people: byId(people), skills: byId(skills), newcomers: byId(newcomers), chronos: byId(chronos),
    ged: { ...defaultGed(), owner: 'Antoine P.' },
  };
}

export function applyTeamExample(d: State, today = new Date()) {
  fillEmptyCollections(d, teamExamples(today));
  if (d.settings?.companyName === EXAMPLE_COMPANY) d.params.teamExampleLevel = TEAM_EXAMPLE_LEVEL;   // only the collections that are empty: the company's own people, skills and rankings are never replaced
}

// A fictitious company saved before this version gets the skills of each process once, and the processes of its people (a real company gets nothing).
export function completeTeamExamples<T extends Pick<State, 'skills' | 'people' | 'params' | 'settings'>>(s: T, today = new Date()): T {
  if (s.settings?.companyName !== EXAMPLE_COMPANY || !Object.keys(s.skills).some(id => id.startsWith('sk_demo_')) || (s.params.teamExampleLevel ?? 0) >= TEAM_EXAMPLE_LEVEL) return s;
  const ex = teamExamples(today), people = { ...s.people }, skills = { ...s.skills };
  const byName = (n: string) => Object.values(people).find(p => p.name.trim().toLowerCase() === n.trim().toLowerCase());
  const ids: Record<string, string> = {};   // the person of the example -> the person of this company with the same name (the directory may have created her under another id)
  Object.values(ex.people).forEach(x => {
    const mine = people[x.id] || byName(x.name);
    ids[x.id] = mine?.id || x.id;
    if (!mine) people[x.id] = x; else if (!mine.processIds && x.processIds) people[mine.id] = { ...mine, processIds: x.processIds };
  });
  const remap = (k: Skill): Skill => ({ ...k, levels: Object.fromEntries(Object.entries(k.levels).map(([id, l]) => [ids[id] || id, l])), plan: k.plan && { ...k.plan, tutor: ids[k.plan.tutor] || k.plan.tutor, learner: ids[k.plan.learner] || k.plan.learner } });
  // the skills of the example only (found by their ids): the missing ones are added, the control skill of the first version changes hands (its people were not of the quality process)
  Object.values(ex.skills).forEach(k => {
    const old = skills[k.id];
    if (!old) skills[k.id] = remap(k); else if (k.id === 'sk_demo_5' && Object.keys(old.levels).some(id => ids.pp_demo_lu === id)) skills[k.id] = remap(k);
  });
  return { ...s, people, skills, params: { ...s.params, teamExampleLevel: TEAM_EXAMPLE_LEVEL } };
}
