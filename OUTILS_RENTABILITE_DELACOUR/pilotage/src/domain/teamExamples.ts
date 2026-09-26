// Example records of tools 4.1 to 4.4, for the fictitious company of the demo (the same people as the other tools).
import type { ChronoTest, Newcomer, Person, Power, Skill, SkillLevel, State } from './types';
import { isoDate } from './periods';
import { defaultGed } from './base';
import { CHECKLIST } from './team';

export function teamExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const team: [string, string, string][] = [
    ['jm', 'Jean-Marc', 'Dirigeant'], ['lb', 'Laurent B.', 'Commercial'], ['sv', 'Sophie V.', 'Achats et ADV'], ['dk', 'David K.', "Chef d'atelier"],
    ['mm', 'Marc M.', 'Méthodes et programmation'], ['jp', 'Julien P.', 'Régleur CNC'], ['kt', 'Karim T.', 'Plieur'], ['lu', 'Lucie B.', 'Monteuse câbleuse'],
    ['nr', 'Nicolas R.', 'Soudeur'], ['ap', 'Antoine P.', 'Responsable qualité'], ['tm', 'Thomas M.', 'Informatique et administration'], ['hr', 'Hélène R.', 'Comptabilité'],
  ];
  const TEAM: Record<string, string> = { jm: 'Direction', lb: 'Bureau', sv: 'Bureau', hr: 'Bureau', tm: 'Bureau', ap: 'Bureau', dk: 'Atelier', mm: 'Atelier', jp: 'Atelier', kt: 'Atelier', lu: 'Atelier', nr: 'Atelier' };
  const people: Person[] = team.map(([k, name, role]) => ({ id: `pp_demo_${k}`, name, role, active: true, team: TEAM[k], ...(k === 'kt' ? { absences: [{ from: ago(-20), to: ago(-34) }] } : {}) }));
  const pp = (k: string) => `pp_demo_${k}`;
  const power = (n: number, processId: string, what: string, holder: string, d1: string, p1: number | null, d2: string, p2: number | null, access: string): Power =>
    ({ id: `pw_demo_${n}`, processId, power: what, holder, deputies: [d1, d2], practiced: [p1 === null ? '' : ago(p1), p2 === null ? '' : ago(p2)], access });
  const powers: Power[] = [
    { ...power(1, 'P1', 'Signature bancaire et virement des salaires', 'Jean-Marc', 'Hélène R.', 200, '', null, 'Double signature bancaire ; codes sous pli au coffre'), extra: ['Cabinet comptable'], extraPracticed: [''], delegationSigned: true, bankInformed: false },
    power(2, 'P2', 'Validation des devis engageants et des avenants', 'Laurent B.', 'Jean-Marc', 100, 'Sophie V.', null, 'Droits de validation dans le logiciel de devis'),
    power(3, 'P3', 'Lancement des fabrications et planning atelier', 'David K.', 'Marc M.', 60, 'Julien P.', 340, 'Session partagée du planning'),
    power(4, 'P4', 'Clés des locaux, alarme et contrats intérimaires', 'David K.', 'Julien P.', 30, 'Jean-Marc', 90, 'Double des clés et code alarme au coffre'),
    power(5, 'P5', 'Libération des produits et sortie du bac rouge', 'Antoine P.', 'David K.', 150, 'Lucie B.', 120, 'Clé du bac rouge et tampon de libération'),
    power(6, 'P3', 'Programmation de la CNC 5 axes', 'Marc M.', '', null, '', null, 'Programmes sur le serveur, dossier 03_ETUDES_OPERATIONS'),
  ];
  const lv = (x: Record<string, SkillLevel>): Record<string, SkillLevel> => Object.fromEntries(Object.entries(x).map(([k, v]) => [pp(k), v]));
  const skill = (n: number, name: string, processId: string, levels: Record<string, SkillLevel>, plan: Skill['plan'] = null): Skill => ({ id: `sk_demo_${n}`, name, processId, levels: lv(levels), plan });
  const skills: Skill[] = [
    { ...skill(1, 'Programmation CNC 5 axes', 'P3', { mm: 4, jp: 2, dk: 1 }, { tutor: pp('mm'), learner: pp('jp'), slot: 'Vendredi 14 h - 16 h', target: ago(-30), sessions: 3 }), critical: true },
    { ...skill(2, 'Réglage de la presse plieuse', 'P3', { kt: 4, nr: 3, dk: 3, jp: 1 }), required: 3, critical: true },
    skill(3, 'Soudure TIG inox', 'P3', { nr: 4, kt: 1 }),
    skill(4, 'Montage et câblage des armoires', 'P3', { lu: 4, jp: 3, nr: 2 }),
    { ...skill(5, 'Contrôle final et PV de réception', 'P5', { ap: 4, lu: 2, dk: 2 }, { tutor: pp('ap'), learner: pp('lu'), slot: 'Mardi 9 h - 10 h 30', target: ago(5), sessions: 6 }), critical: true },
    skill(6, 'Chiffrage des devis', 'P2', { lb: 4, jm: 3, sv: 1 }),
    { ...skill(7, 'Paie et virements', 'P1', { hr: 4, jm: 1 }), critical: true },
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
    people: byId(people), powers: byId(powers), skills: byId(skills), newcomers: byId(newcomers), chronos: byId(chronos),
    envelope: { location: 'Coffre de la direction, enveloppe scellée signée sur la languette', checkedAt: ago(220), by: 'Jean-Marc' },
    ged: { ...defaultGed(), owner: 'Antoine P.' },
  };
}

export function applyTeamExample(d: State, today = new Date()) {
  Object.values(d.actions).filter(a => a.ref?.kind === 'skill' || a.ref?.kind === 'power').forEach(a => { delete d.actions[a.id]; });
  Object.assign(d, teamExamples(today));
}
