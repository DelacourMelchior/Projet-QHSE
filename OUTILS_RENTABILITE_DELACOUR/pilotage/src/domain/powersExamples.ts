// Example records of tool 4.1 for the fictitious company of the demo (the same people as the other tools): nine vital powers that show every state of the tool, lines of
// practice with what blocked, two envelopes (one to check, one checked) with an opening that is closed, an absence that was covered and one under way.
// Own marker `Params.powerExampleLevel`: a fictitious company saved before this version gets what is new once, and never loses what it typed (`completePowerExamples`).
import type { Cover, Person, PersonSign, Power, Practice, State, Vault, VaultLog } from './types';
import { signKey, signNeeds, signText } from './powers';
import { isoDate } from './periods';
import { fillEmptyCollections } from './base';

export const POWER_EXAMPLE_LEVEL = 2;
const EXAMPLE_COMPANY = 'Entreprise exemple (fictive)';

// Who is away in the example (days from today, a negative number is ahead); the people of 4.2 carry them
export const exampleAbsences = (ago: (n: number) => string): Record<string, { from: string; to: string }[]> => ({
  kt: [{ from: ago(-20), to: ago(-34) }],   // the plier: away in three weeks (4.2 says it for the skill; here the two deputies of his power are away too)
  lu: [{ from: ago(2), to: ago(-5) }],      // a deputy of the release, away now
  tm: [{ from: ago(1), to: ago(-3) }],      // the holder of the access to the IT, away now
  nr: [{ from: ago(-24), to: ago(-27) }],
  dk: [{ from: ago(-30), to: ago(-31) }],
});
export const examplePeople = (): Person[] => [{ id: 'pp_demo_pd', name: 'Pierre D.', role: 'Régleur (parti)', active: false, team: 'Atelier' }];

export function powerExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const stamp = (n: number, h: number, m = 0) => `${ago(n)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const forms = (n: number, ...keys: string[]) => Object.fromEntries(keys.map(k => [k, ago(n)]));
  const P = (n: number, o: Omit<Power, 'id'>): Power => ({ id: `pw_demo_${n}`, ...o });
  const powers: Power[] = [
    P(1, {
      processId: 'P1', power: 'Signature bancaire et virement des salaires', holder: 'Jean-Marc', deputies: ['Hélène R.', ''], practiced: [ago(200), ''], access: 'Double signature bancaire ; codes rangés au coffre',
      extra: ['Marie-Laure S. (Cabinet Comptable)'], extraPracticed: [''], impact: 'Les salaires et les fournisseurs ne sont plus payés.', wait: 'days3', howTo: "1. Ouvrir le portail de la banque. 2. Valider le lot de virements préparé par la comptabilité. 3. Faire contre-signer par la deuxième personne.",
      limits: 'Double signature au-delà du seuil fixé avec la banque ; jamais seul pour un nouveau bénéficiaire.', contactIds: ['ct_demo_banque1', 'ct_demo_expert'], forms: forms(300, 'deleg', 'limits'),
      dep: { 'helene r.': { accepted: ago(310), access: ago(310) } }, reviewedAt: ago(430), reviewedBy: 'Jean-Marc',
    }),
    P(2, {
      processId: 'P2', power: 'Validation des offres et des engagements pris auprès des clients', holder: 'Laurent B.', deputies: ['Jean-Marc', 'Sophie V.'], practiced: [ago(100), ''], access: 'Droits de validation dans le logiciel de devis',
      impact: 'Plus aucune offre ne peut partir : les clients attendent leur réponse.', wait: 'week', howTo: "Relire l'offre avec les cinq verrous, vérifier la marge, viser, envoyer.", limits: 'Au-dessus du seuil de visa : validation de la direction.',
      forms: forms(200, 'deleg', 'limits', 'informed'), dep: { 'jean-marc': { accepted: ago(210), access: ago(210) }, 'sophie v.': { accepted: ago(210) } }, reviewedAt: ago(70), reviewedBy: 'Jean-Marc',
    }),
    P(3, {
      processId: 'P3', power: "Lancement de l'activité du jour et planning", holder: 'David K.', deputies: ['Marc M.', 'Julien P.'], practiced: [ago(60), ago(340)], access: 'Session partagée du planning',
      impact: "L'atelier ne sait pas quoi faire ce matin.", wait: 'day', howTo: "Ouvrir le planning, répartir les postes, annoncer les priorités à 7 h 30.", forms: forms(150, 'deleg', 'limits', 'informed'),
      dep: { 'marc m.': { accepted: ago(150), access: ago(150) }, 'julien p.': { accepted: ago(150), access: ago(150) } }, reviewedAt: ago(70), reviewedBy: 'David K.',
    }),
    P(4, {
      processId: 'P4', power: 'Clés, alarme et ouverture des locaux', holder: 'David K.', deputies: ['Julien P.', 'Jean-Marc'], practiced: [ago(30), ago(90)], access: 'Double des clés et code alarme au coffre',
      impact: "Personne ne peut entrer le matin, l'alarme se déclenche.", wait: 'day', howTo: "Désactiver l'alarme dans les 60 secondes, ouvrir le portail, rallumer les tableaux.", forms: forms(120, 'deleg', 'limits', 'informed'),
      dep: { 'julien p.': { accepted: ago(120), access: ago(120) }, 'jean-marc': { accepted: ago(120), access: ago(120) } }, reviewedAt: ago(70), reviewedBy: 'David K.',
    }),
    P(5, {
      processId: 'P5', power: "Libération d'un produit ou d'un service au client", holder: 'Antoine P.', deputies: ['David K.', 'Lucie B.'], practiced: [ago(150), ago(120)], access: 'Clé du bac rouge et tampon de libération',
      impact: 'Rien ne part chez le client.', wait: 'days3', howTo: "Vérifier les contrôles de la commande, libérer sous son nom, tamponner le bon de livraison.", forms: forms(130, 'deleg', 'limits', 'informed'),
      dep: { 'david k.': { accepted: ago(130), access: ago(130) }, 'lucie b.': { accepted: ago(130), access: ago(130) } }, reviewedAt: ago(70), reviewedBy: 'Antoine P.',
    }),
    P(6, { processId: 'P3', power: 'Programmation de la CNC 5 axes', holder: 'Marc M.', deputies: ['', ''], practiced: ['', ''], access: 'Programmes sur le serveur, dossier 03_ETUDES_OPERATIONS', impact: 'Les pièces complexes ne sont plus programmées.', wait: 'week' }),
    P(7, {
      processId: 'P1', power: 'Déclarations légales urgentes (sociales, fiscales)', holder: 'Hélène R.', deputies: ['Jean-Marc', 'Pierre D.'], practiced: [ago(40), ago(250)], access: 'Espaces en ligne des organismes, accès au nom de la direction',
      impact: 'Une échéance légale est manquée.', wait: 'days3', howTo: 'Se connecter à chaque espace, déposer la déclaration du mois, enregistrer le justificatif.', contactIds: ['ct_demo_expert'], forms: forms(100, 'deleg', 'limits', 'informed'),
      dep: { 'jean-marc': { accepted: ago(100), access: ago(100) } }, reviewedAt: ago(70), reviewedBy: 'Jean-Marc',
    }),
    P(8, {
      processId: 'P3', power: 'Réglage de la presse plieuse', holder: 'Karim T.', deputies: ['Nicolas R.', 'David K.'], practiced: [ago(90), ago(200)], access: '', impact: 'Les pièces pliées sont bloquées : la production attend.', wait: 'days3',
      howTo: 'Choisir le programme de la pièce, régler la butée, faire la pièce de contrôle.', forms: forms(90, 'deleg', 'limits', 'informed'), dep: { 'nicolas r.': { accepted: ago(90), access: ago(90) } }, reviewedAt: ago(70), reviewedBy: 'David K.',
    }),
    P(9, {
      processId: 'P4', power: 'Accès à la messagerie, au serveur et aux sauvegardes', holder: 'Thomas M.', deputies: ['Marc M.', 'Sophie V.'], practiced: [ago(120), ago(110)], access: 'Comptes administrateur rangés au coffre',
      impact: 'Plus de messagerie ni de fichiers : tout le monde est bloqué.', wait: 'day', howTo: "Ouvrir la console d'administration, vérifier les sauvegardes de la nuit, relancer le service si besoin.", contactIds: ['ct_demo_it', 'ct_demo_itboss'], forms: forms(110, 'deleg', 'limits', 'informed'),
      dep: { 'marc m.': { accepted: ago(110), access: ago(110) }, 'sophie v.': { accepted: ago(110), access: ago(110) } }, reviewedAt: ago(70), reviewedBy: 'Thomas M.',
    }),
  ];
  const line = (n: number, powerId: string, who: string, days: number, checkedBy: string, note = '', by = checkedBy || who): Practice => ({ id: `pr_demo_${n}`, powerId, who, date: ago(days), checkedBy, note, at: stamp(days, 15), by });
  const practices: Practice[] = [
    line(1, 'pw_demo_2', 'Sophie V.', 45, '', 'Fait seule sur une offre réelle ; personne ne l\'a vue faire.'),
    line(2, 'pw_demo_3', 'Marc M.', 60, 'David K.', 'Session du planning retrouvée après un appel : le mot de passe était périmé.'),
    line(3, 'pw_demo_4', 'Julien P.', 30, 'David K.', "N'a pas retrouvé le code de l'alarme : ajouté sur la fiche."),
    line(4, 'pw_demo_5', 'Lucie B.', 120, 'Antoine P.'),
    line(5, 'pw_demo_9', 'Marc M.', 120, 'Thomas M.', 'A relancé la sauvegarde de la nuit.'),
  ];
  const vaults: Vault[] = [
    {
      id: 'vt_demo_1', name: 'Coffre de la direction', location: 'Coffre de la direction, fermé à clé', contents: ['Mots de passe maîtres de la banque', "Code d'alarme", 'Accès au logiciel de devis', 'Comptes administrateur du serveur'],
      visa: ['Jean-Marc', 'Hélène R.'], keyHolder: 'Jean-Marc', sealedAt: ago(400),
    },
    { id: 'vt_demo_2', name: "Armoire de l'atelier", location: "Armoire du bureau d'atelier, clés chez le chef d'atelier", contents: ['Double des clés des machines', 'Code des armoires électriques'], visa: ['David K.', 'Antoine P.'], keyHolder: 'David K.', sealedAt: ago(200) },
  ];
  const vlogs: VaultLog[] = [
    { id: 'vl_demo_1', vaultId: 'vt_demo_1', kind: 'check', at: stamp(220, 9, 30), by: 'Jean-Marc', ticks: [true, true, true, false], note: 'Un accès du logiciel de devis est à renouveler.' },
    { id: 'vl_demo_2', vaultId: 'vt_demo_1', kind: 'open', at: stamp(300, 7, 45), by: 'Hélène R.', absent: 'Jean-Marc', reason: 'Absence imprévue du dirigeant', openedBy: 'Hélène R.', visaBy: 'David K.', note: "Accès bancaire pour le virement des salaires.", resealedAt: ago(297), codesChangedAt: ago(297) },
    { id: 'vl_demo_3', vaultId: 'vt_demo_2', kind: 'check', at: stamp(40, 11, 0), by: 'David K.', ticks: [true, true, true, true] },
  ];
  const covers: Cover[] = [
    {
      id: 'cv_demo_1', who: 'Jean-Marc', from: ago(300), to: ago(297), takes: [{ powerId: 'pw_demo_1', by: 'Hélène R.' }], missing: "Le code de validation des virements n'était pas dans les accès de secours.",
      closedAt: ago(296), closedBy: 'Antoine P.', at: stamp(300, 7, 30), by: 'Hélène R.',
    },
    { id: 'cv_demo_2', who: 'Thomas M.', from: ago(1), to: ago(-3), takes: [{ powerId: 'pw_demo_9', by: 'Marc M.' }], missing: '', closedAt: '', closedBy: '', at: stamp(1, 8, 10), by: 'Sophie V.' },
  ];
  // the signatures: everything that is expected is signed except the ones listed (`<person>|<slot>`), so that the example shows powers that are ready and two that are not
  const missing = ['pw_demo_3:julien p.|self', 'pw_demo_5:lucie b.|direction'], head = 'Jean-Marc', left = ['Pierre D.'];
  powers.forEach((p, k) => {
    const ctx = { contacts: { head: { id: 'head', category: 'interne', name: head, role: 'Dirigeant', company: 'Interne', phone: '', email: '', always: false, verifiedAt: '' } } as State['contacts'], params: {} as State['params'], people: { pd: { id: 'pd', name: left[0], role: '', active: false } } as State['people'] };
    const signs: Record<string, PersonSign> = {};
    signNeeds(ctx, p).forEach((need, i) => {
      if (missing.includes(`${p.id}:${signKey(need.subject, need.slot)}`)) return;
      const n = 200 - k * 5 - i;
      signs[signKey(need.subject, need.slot)] = { slot: need.slot, subject: need.subject, who: need.who, at: stamp(n, 9, 30 + i), img: '', text: signText(p, need, ago(n)) };
    });
    p.signs = signs;
    if (missing.some(m => m.startsWith(`${p.id}:`)) && p.forms) delete p.forms.deleg;
  });
  const by = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { powers: by(powers), practices: by(practices), vaults: by(vaults), vlogs: by(vlogs), covers: by(covers) };
}

// The button "Voir un exemple traité" of tool 4.1: the example in a company that holds none of it yet (what the company has is kept)
export function applyPowerExample(d: State, today = new Date()) {
  fillEmptyCollections(d, powerExamples(today));
  if (d.settings?.companyName === EXAMPLE_COMPANY) d.params.powerExampleLevel = POWER_EXAMPLE_LEVEL;   // only the fictitious company is topped up later
}

// The first version of the example (6 powers and one envelope): the wording of its powers is renewed when nobody changed it, the rest of a power is only completed
const V1_TEXT: Record<string, string> = {
  pw_demo_2: 'Validation des devis engageants et des avenants', pw_demo_3: 'Lancement des fabrications et planning atelier', pw_demo_4: 'Clés des locaux, alarme et contrats intérimaires', pw_demo_5: 'Libération des produits et sortie du bac rouge',
};
const V1_VAULT = 'Coffre de la direction, enveloppe scellée signée sur la languette';

// A fictitious company saved before this version gets the example of the tool, once: a power it holds only gains the fields it lacks (and the new wording when its text is the old
// one), the missing powers, the lines of practice, the envelopes, the absence under way and the people of the example (a person who left, the leave of a few others) are added.
// A real company gets nothing.
export function completePowerExamples<T extends Pick<State, 'powers' | 'practices' | 'covers' | 'vaults' | 'vlogs' | 'people' | 'params'>>(s: T, today = new Date()): T {
  if (!Object.keys(s.powers).some(id => id.startsWith('pw_demo_')) || (s.params.powerExampleLevel ?? 0) >= POWER_EXAMPLE_LEVEL) return s;
  const ex = powerExamples(today), ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const powers = { ...s.powers };
  Object.values(ex.powers).forEach(x => {
    const old = powers[x.id];
    powers[x.id] = !old ? x : { ...x, ...old, power: V1_TEXT[x.id] === old.power ? x.power : old.power, extra: old.extra?.length === 1 && old.extra[0] === 'Cabinet comptable' ? x.extra : old.extra };
    if (powers[x.id].extra === undefined) delete powers[x.id].extra;
  });
  const people = { ...s.people }, away = exampleAbsences(ago);
  examplePeople().forEach(p => { if (!people[p.id]) people[p.id] = p; });
  Object.entries(away).forEach(([k, a]) => { const p = people[`pp_demo_${k}`]; if (p && !p.absences?.length) people[p.id] = { ...p, absences: a }; });
  // the envelope of the first version (moved into a vault by `normalize`) is the one of the example: it gives way to the two envelopes of the example
  const main = s.vaults.vt_main, first = !!main && main.location === V1_VAULT && !main.contents.length, vaults = { ...s.vaults };
  if (first) delete vaults.vt_main;
  return {
    ...s, powers, people, params: { ...s.params, powerExampleLevel: POWER_EXAMPLE_LEVEL },
    practices: { ...ex.practices, ...s.practices }, covers: { ...ex.covers, ...s.covers }, vaults: { ...ex.vaults, ...vaults }, vlogs: { ...ex.vlogs, ...s.vlogs },
  };
}

// What "Retirer l'exemple" takes out of a company: the powers, absences covered, envelopes and lines of the example (found by their example ids), and the lines of practice written on
// those powers since (they would be left with no power). The people of the example stay: they belong to the staff list. Nothing of a company that never took the example leaves.
const demo = (id: string) => id.includes('_demo_');
export const hasPowerExample = (s: Pick<State, 'powers' | 'covers' | 'vaults'>) => [...Object.keys(s.powers), ...Object.keys(s.covers), ...Object.keys(s.vaults)].some(demo);
export function removePowerExample(d: State): { powers: number; practices: number; covers: number; vaults: number } {
  const gone = Object.keys(d.powers).filter(demo), vaults = Object.keys(d.vaults).filter(demo), covers = Object.keys(d.covers).filter(demo);
  const practices = Object.values(d.practices).filter(x => demo(x.id) || gone.includes(x.powerId)).map(x => x.id), logs = Object.values(d.vlogs).filter(x => demo(x.id) || vaults.includes(x.vaultId)).map(x => x.id);
  gone.forEach(id => { delete d.powers[id]; }); vaults.forEach(id => { delete d.vaults[id]; }); covers.forEach(id => { delete d.covers[id]; }); practices.forEach(id => { delete d.practices[id]; }); logs.forEach(id => { delete d.vlogs[id]; });
  return { powers: gone.length, practices: practices.length, covers: covers.length, vaults: vaults.length };
}
