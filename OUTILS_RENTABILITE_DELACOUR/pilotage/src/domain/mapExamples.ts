// Example sheets and flowcharts of tool 1.4 for the fictitious company of the demo (the same people as the other tools): 26 flowcharts, four or five per process. Sheets P1 to P3 are
// complete; P4 has no inputs or outputs and was never reviewed; P5 has no outputs, a flowchart with a decision whose "no" leads nowhere (on purpose), and a review that is 420 days old.
import type { Flow, FlowLink, FlowStep, MapReq, Person, Process, Skill, Sop, State, StepKind } from './types';
import { newSop } from './instructions';
import { isoDate } from './periods';
import { dropFlowDuplicates, withReqIds } from './cartography';
import { EXAMPLE_COMPANY } from './base';

export const MAP_EXAMPLE_LEVEL = 17;

type Seed = [string, StepKind, string, string, Partial<FlowStep>?];
const to = (k: number, n: string) => `st_demo_${k}${n}`;   // id suffix, kind, label, role, more
const flow = (n: number, processId: string, name: string, trigger: string, owner: string, seeds: Seed[], today: Date, days: number): Flow => ({
  id: `fl_demo_${n}`, processId, name, trigger, ...(owner ? { ownerId: owner } : {}),
  steps: seeds.map(([k, kind, label, role, more]) => ({ id: `st_demo_${n}${k}`, kind, label, role, ...more })),
  version: 2, updatedAt: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days)), updatedBy: 'Jean-Marc', history: [],
});

export function mapExamples(people: Person[], today = new Date()): { processes: Record<string, Partial<Process>>; flows: Flow[]; sops: Sop[]; skills: Skill[] } {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const id = (name: string) => people.find(p => p.name.trim().toLowerCase() === name.toLowerCase())?.id;
  const jm = id('Jean-Marc') || '', lb = id('Laurent B.') || '', sv = id('Sophie V.') || '', dk = id('David K.') || '', mm = id('Marc M.') || '', hr = id('Hélène R.') || '', tm = id('Thomas M.') || '', ap = id('Antoine P.') || '';
  const processes: Record<string, Partial<Process>> = {
    P1: {
      band: 'management', purpose: 'Fixer le cap, suivre les chiffres du mois et décider des actions à mener.', pilotId: jm, deputyId: hr, trigger: 'Clôture comptable du mois', result: 'Réunion de direction tenue, actions décidées et suivies',
      inputs: [{ what: 'Chiffres du mois', party: 'Comptabilité', processId: undefined }, { what: 'Défauts du mois', party: 'Qualité', processId: 'P5' }, { what: 'Réclamations clients du mois', party: 'Commercial', processId: 'P2' }],
      outputs: [{ what: "Plan d'actions", party: 'Tous les pilotes de processus' }],
      requirements: [{ kind: 'legal', text: 'Tenue de la comptabilité et dépôt des comptes (selon la forme juridique)' }, { kind: 'internal', text: 'Une revue de direction par période fixée' }],
      software: ['Logiciel de comptabilité'], docs: ['01_DIRECTION_STRATEGIE/02_Revues_Direction', '01_DIRECTION_STRATEGIE/03_Indicateurs'], docLinks: [{ tool: '1.1' }, { tool: '1.2' }], equipmentIds: ['eq_demo_serveur'],
      reviewedAt: ago(110), reviewedBy: 'Jean-Marc', notes: 'Revoir la répartition des rôles de direction à la prochaine embauche.',
    },
    P2: {
      band: 'realisation', purpose: "Répondre à la demande du client par une offre rentable, puis suivre la commande jusqu'à sa signature.", pilotId: lb, deputyId: sv, trigger: 'Demande de prix reçue', result: 'Commande signée ou offre abandonnée en connaissance de cause',
      software: ['Logiciel de devis'], docs: ['02_COMMERCIAL_CLIENTS/02_Devis_Offres', '02_COMMERCIAL_CLIENTS/04_Reclamations'], docLinks: [{ tool: '2.1' }, { tool: '2.3' }, { tool: '2.4' }],
      reviewedAt: ago(60), reviewedBy: 'Laurent B.',
    },
    P3: {
      band: 'realisation', purpose: 'Fabriquer, contrôler et livrer ce qui a été promis, dans les délais.', pilotId: dk, deputyId: mm, trigger: 'Commande signée', result: 'Produit livré et reçu par le client',
      software: ['Logiciel de gestion de production'], docs: ['03_ETUDES_OPERATIONS/02_Fabrication_Chantiers', '03_ETUDES_OPERATIONS/04_Achats_Fournisseurs'], docLinks: [{ tool: '3.2' }, { tool: '3.4' }, { tool: '3.1' }],
      equipmentIds: ['eq_demo_cnc', 'eq_demo_plieuse', 'eq_demo_cabine', 'eq_demo_chariot', 'eq_demo_fourgon'],
      reviewedAt: ago(200), reviewedBy: 'David K.',
    },
    P4: { band: 'support', purpose: "Avoir les bonnes personnes, formées, et savoir qui remplace qui quand quelqu'un manque.", pilotId: hr, deputyId: tm, trigger: 'Départ, arrivée ou absence', result: 'Poste tenu par une personne autonome', docLinks: [{ tool: '4.1' }, { tool: '4.2' }, { tool: '4.3' }] },
    P5: {
      band: 'transverse', purpose: 'Isoler les défauts, trouver leur cause, empêcher le retour et mesurer la satisfaction des clients.', pilotId: ap, trigger: 'Défaut constaté', result: 'Cause traitée et vérifiée à J+30',
      inputs: [{ what: 'Défaut constaté', party: 'Opérations', processId: 'P3' }], requirements: [{ kind: 'internal', text: 'Décision rapide sur tout produit isolé' }],
      docs: ['05_QUALITE_AMELIORATION/01_Non_Conformites'], docLinks: [{ tool: '5.1' }, { tool: '5.2' }, { tool: '5.3' }, { tool: '5.4' }], equipmentIds: ['eq_demo_cle'], reviewedAt: ago(420), reviewedBy: 'Antoine P.',
    },
    // two more processes that cross all the others (created in a saved example by applyMapExample)
    P6: {
      name: "Systèmes d'information & Données", color: '#0E7490', order: 5, kpiIds: [], band: 'transverse', purpose: 'Garder les outils informatiques et les données disponibles, sauvegardés et protégés.', pilotId: tm, deputyId: hr, trigger: 'Chaque nuit', result: 'Données sauvegardées et accès maîtrisés',
      requirements: [{ kind: 'legal', text: 'Protection des données personnelles', all: true }], software: ['Sauvegarde en ligne'], reviewedAt: ago(90), reviewedBy: 'Thomas M.',
    },
    P7: {
      name: 'Gestion documentaire', color: '#A16207', order: 6, kpiIds: [], band: 'transverse', purpose: 'Que chaque document se nomme, se range et se retrouve de la même façon dans toute l’entreprise.', pilotId: hr, deputyId: tm, trigger: 'Un document est créé', result: 'Document nommé, rangé et à jour',
      requirements: [{ kind: 'legal', text: 'Conservation des documents pendant la durée légale', all: true }, { kind: 'standard', text: 'ISO 9001 : informations documentées maîtrisées' }], docs: ['Plan de classement de l’entreprise'], reviewedAt: ago(150), reviewedBy: 'Hélène R.',
    },
  };
  const flows: Flow[] = [
    // ---- more flowcharts, four or five per process (all sound but the one of P5 that is wrong on purpose)
    flow(8, 'P1', "Fixer les objectifs de l'année", "Fin d'exercice", jm, [
      ['a', 'start', "Fin d'exercice", ''], ['b', 'action', "Analyser les résultats de l'année", 'Direction', { links: [{ tool: '1.1' }] }], ['c', 'action', 'Fixer les objectifs et le budget', 'Direction'],
      ['d', 'decision', 'Les objectifs sont-ils réalistes ?', 'Direction', { branches: [{ label: 'Oui', to: '' }, { label: 'À ajuster', to: to(8, 'c') }] }],
      ['e', 'action', 'Annoncer les objectifs aux pilotes de processus', 'Direction'], ['f', 'action', 'Traduire chaque objectif en indicateur et en cible', 'Pilote du processus', { control: true, links: [{ tool: '1.1' }] }], ['g', 'end', 'Objectifs partagés', ''],
    ], today, 90),
    flow(9, 'P1', "Décider d'un investissement", "Demande d'investissement", jm, [
      ['a', 'start', "Demande d'investissement", ''], ['b', 'action', 'Chiffrer le besoin et le gain attendu', 'Demandeur'], ['c', 'action', 'Comparer avec la trésorerie disponible', 'Direction', { links: [{ tool: '1.1' }] }],
      ['d', 'decision', 'Que décider ?', 'Direction', { branches: [{ label: 'Accepté', to: '' }, { label: 'Reporté', to: to(9, 'x') }, { label: 'Refusé', to: to(9, 'y') }] }],
      ['e', 'action', 'Passer la commande', 'Achats', { doc: 'Bon de commande' }], ['f', 'action', "Vérifier le résultat six mois après", 'Direction', { control: true }], ['g', 'end', 'Investissement évalué', ''], ['x', 'action', 'Inscrire la demande à la prochaine revue', 'Direction', { goto: to(9, 'z') }], ['z', 'end', 'Demande reportée', ''], ['y', 'end', 'Demande refusée', ''],
    ], today, 120),
    flow(10, 'P1', 'Réagir quand une ressource vitale s\'arrête', 'Ressource vitale à l\'arrêt', jm, [
      ['a', 'start', "Ressource vitale à l'arrêt", ''], ['b', 'action', 'Déclencher le Plan B prévu', 'Pilote du processus', { links: [{ tool: '1.2' }] }], ['c', 'action', 'Prévenir les contacts utiles', 'Pilote du processus', { links: [{ tool: '1.3' }] }],
      ['d', 'decision', 'Le Plan B tient-il ?', 'Pilote du processus', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(10, 'f') }] }], ['e', 'end', 'Activité repartie', ''],
      ['f', 'action', 'Alerter la direction et décider d\'une mesure', 'Direction'], ['g', 'action', 'Corriger le Plan B après coup', 'Pilote du processus', { control: true, links: [{ tool: '1.2' }] }], ['h', 'end', 'Plan B amélioré', ''],
    ], today, 100),
    flow(11, 'P2', 'Relancer un devis', 'Devis envoyé depuis 7 jours', lb, [
      ['a', 'start', 'Devis envoyé depuis 7 jours', ''], ['b', 'action', 'Relancer le client', 'Commercial'],
      ['c', 'decision', 'Que répond le client ?', 'Commercial', { branches: [{ label: 'Signé', to: to(11, 'i') }, { label: 'Veut négocier', to: to(11, 'd') }, { label: 'Pas de réponse', to: to(11, 'h') }, { label: 'Refus', to: to(11, 'f') }] }],
      ['d', 'action', 'Revoir le prix ou le délai', 'Direction', { links: [{ tool: '2.1' }] }], ['e', 'action', "Renvoyer l'offre revue", 'Commercial', { goto: to(11, 'c') }], ['f', 'action', 'Noter la raison du refus', 'Commercial', { goto: to(11, 'h') }],
      ['i', 'end', 'Commande signée', ''], ['h', 'end', 'Offre classée sans suite', ''],
    ], today, 70),
    flow(12, 'P2', "Répondre à un appel d'offres", "Appel d'offres reçu", lb, [
      ['a', 'start', "Appel d'offres reçu", ''], ['b', 'action', 'Lire le cahier des charges', 'Commercial'],
      ['c', 'decision', 'Peut-on y répondre ?', 'Commercial', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(12, 'x') }, { label: 'À clarifier', to: to(12, 'q') }] }],
      ['d', 'subprocess', 'Faire le devis et suivre sa signature', 'Commercial', { flowId: 'fl_demo_1' }], ['e', 'action', 'Faire valider la réponse', 'Direction', { control: true }], ['f', 'action', 'Déposer la réponse dans les délais', 'Commercial'],
      ['g', 'end', 'Réponse déposée', ''], ['q', 'action', 'Poser ses questions au client', 'Commercial', { goto: to(12, 'b') }], ['x', 'end', 'Réponse déclinée', ''],
    ], today, 80),
    flow(13, 'P2', 'Gérer un changement demandé par le client', 'Le client demande un changement', lb, [
      ['a', 'start', 'Le client demande un changement', ''], ['b', 'action', 'Noter le changement par écrit', 'Commercial'], ['c', 'action', "Mesurer l'effet sur le délai et le coût", 'Opérations'],
      ['d', 'decision', 'Le changement est-il acceptable ?', 'Direction', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(13, 'x') }, { label: 'À négocier', to: to(13, 'n') }] }],
      ['e', 'document', "Faire signer l'avenant", 'Commercial', { doc: 'Avenant' }], ['f', 'action', "Prévenir l'atelier", 'Commercial', { links: [{ tool: '3.2' }] }], ['g', 'end', 'Changement pris en compte', ''],
      ['n', 'action', 'Proposer une autre solution au client', 'Commercial', { goto: to(13, 'c') }], ['x', 'action', 'Expliquer le refus au client', 'Commercial', { goto: to(13, 'y') }], ['y', 'end', 'Commande inchangée', ''],
    ], today, 90),
    flow(14, 'P3', 'Acheter une matière ou une pièce', "Besoin d'achat", dk, [
      ['a', 'start', "Besoin d'achat", ''], ['b', 'action', 'Choisir le fournisseur principal du secteur', 'Achats', { links: [{ tool: '3.1' }] }],
      ['c', 'decision', 'Le fournisseur peut-il livrer à temps ?', 'Achats', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(14, 's') }] }],
      ['d', 'action', 'Passer la commande', 'Achats', { doc: 'Bon de commande' }], ['e', 'action', 'Suivre la livraison', 'Achats'], ['f', 'action', 'Contrôler ce qui arrive', 'Réception', { control: true }],
      ['g', 'decision', 'La livraison est-elle conforme ?', 'Réception', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(14, 'h') }] }], ['i', 'end', 'Matière en stock', ''],
      ['h', 'action', 'Isoler la livraison et réclamer au fournisseur', 'Qualité', { links: [{ tool: '5.1' }, { tool: '3.1' }], goto: to(14, 's') }], ['s', 'action', 'Contacter le fournisseur de secours', 'Achats', { goto: to(14, 'd') }],
    ], today, 150),
    flow(15, 'P3', "Surveiller et réparer un équipement", 'Équipement en service', mm, [
      ['a', 'start', 'Équipement en service', ''], ['b', 'action', 'Faire la routine de contrôle', 'Atelier', { links: [{ tool: '3.3' }], control: true }],
      ['c', 'decision', "Que constate-t-on ?", 'Atelier', { branches: [{ label: 'Rien à signaler', to: '' }, { label: 'À surveiller', to: to(15, 'w') }, { label: 'Panne', to: to(15, 'p') }] }],
      ['d', 'end', 'Équipement en service', ''], ['w', 'action', "Noter l'anomalie pour la suivre", 'Atelier', { goto: to(15, 'd') }],
      ['p', 'action', "Arrêter l'équipement", 'Atelier', { links: [{ tool: '3.3' }] }], ['v', 'action', 'Prévenir la maintenance', 'Atelier'], ['q', 'action', 'Diagnostiquer la panne', 'Maintenance'],
      ['r', 'action', "Prendre la pièce dans l'armoire de survie", 'Maintenance', { links: [{ tool: '3.3' }] }], ['s', 'action', 'Réparer et remettre en marche', 'Maintenance'], ['y', 'action', "Noter la durée de l'arrêt", 'Maintenance', { links: [{ tool: '3.3' }] }], ['t', 'end', 'Équipement remis en service', ''],
    ], today, 140),
    flow(16, 'P3', 'Faire réceptionner une livraison chez le client', 'Livraison chez le client', dk, [
      ['a', 'start', 'Livraison chez le client', ''], ['b', 'action', 'Faire constater la réception avec le client', 'Livreur', { links: [{ tool: '3.4' }] }],
      ['c', 'decision', 'Quel est le résultat ?', 'Livreur', { branches: [{ label: 'Sans réserve', to: '' }, { label: 'Avec réserves', to: to(16, 'r') }, { label: 'Refusée', to: to(16, 'x') }] }],
      ['d', 'document', 'Faire signer le procès-verbal', 'Livreur', { doc: 'Procès-verbal' }],
      ['g', 'decision', 'Reste-t-il des réserves à lever ?', 'Commercial', { branches: [{ label: 'Non', to: '' }, { label: 'Oui', to: to(16, 's') }] }], ['f', 'end', 'Réception terminée', ''],
      ['r', 'action', 'Noter chaque réserve avec son échéance', 'Livreur', { goto: to(16, 'd') }], ['s', 'action', 'Lever les réserves auprès du client', 'Commercial', { goto: to(16, 'f') }],
      ['x', 'action', 'Noter le motif du refus', 'Commercial'], ['z', 'action', 'Prévoir une nouvelle livraison', 'Commercial'], ['y', 'end', 'Livraison à refaire', ''],
    ], today, 130),
    flow(17, 'P4', 'Remplacer une personne absente', 'Une personne est absente', hr, [
      ['a', 'start', 'Une personne est absente', ''], ['b', 'action', "Chercher qui tient sa fonction clé", 'Pilote du processus', { links: [{ tool: '4.1' }] }],
      ['c', 'decision', 'Un suppléant formé est-il disponible ?', 'Pilote du processus', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(17, 'g') }] }],
      ['d', 'action', 'Prévenir le suppléant et lui donner les accès', 'Pilote du processus'], ['e', 'action', "Noter l'absence couverte", 'Pilote du processus', { links: [{ tool: '4.1' }] }], ['f', 'end', 'Absence couverte', ''],
      ['g', 'action', 'Décider d\'un remplacement provisoire ou d\'un report', 'Direction'], ['h', 'action', 'Prévenir les clients concernés', 'Commercial', { goto: to(17, 'e') }],
    ], today, 60),
    flow(18, 'P4', 'Mettre à jour la polyvalence', 'Chaque année', hr, [
      ['a', 'start', 'Chaque année', ''], ['b', 'action', 'Relire la matrice de polyvalence', 'Pilote du processus', { links: [{ tool: '4.2' }] }], ['c', 'action', 'Évaluer le niveau de chaque personne', "Chef d'atelier", { links: [{ tool: '4.2' }] }],
      ['d', 'decision', "Une compétence n'est tenue que par une personne ?", 'Pilote du processus', { branches: [{ label: 'Non', to: '' }, { label: 'Oui', to: to(18, 'f') }] }], ['e', 'end', 'Matrice à jour', ''],
      ['f', 'action', 'Planifier une formation de doublure', 'Pilote du processus', { links: [{ tool: '4.2' }] }], ['g', 'action', 'Faire les séances avec un tuteur', "Chef d'atelier"], ['h', 'action', 'Valider le niveau en situation de travail', "Chef d'atelier", { control: true }], ['j', 'action', 'Mettre à jour la matrice', 'Pilote du processus', { links: [{ tool: '4.2' }] }], ['i', 'end', 'Doublure formée', ''],
    ], today, 100),
    flow(19, 'P7', 'Nommer et ranger un document', 'Un document est créé', hr, [
      ['a', 'start', 'Un document est créé', ''], ['b', 'action', 'Nommer le fichier selon la règle', 'Auteur', { links: [{ tool: '4.4' }] }],
      ['c', 'decision', 'Le nom passe-t-il le test des 30 secondes ?', 'Auteur', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(19, 'b') }] }],
      ['d', 'action', 'Ranger le fichier dans le bon dossier', 'Auteur', { links: [{ tool: '4.4' }] }], ['e', 'end', 'Document retrouvable', ''],
    ], today, 120),
    flow(20, 'P5', 'Traiter une pièce non conforme', 'Pièce douteuse repérée', ap, [
      ['a', 'start', 'Pièce douteuse repérée', ''], ['b', 'action', 'Isoler la pièce dans le bac rouge et l\'étiqueter', 'Atelier', { links: [{ tool: '5.1' }] }], ['c', 'action', 'Examiner la pièce sous 24 h', 'Qualité'],
      ['d', 'decision', 'Que décider ?', 'Qualité', { branches: [{ label: 'Retouche', to: '' }, { label: 'Rebut', to: to(20, 'r') }, { label: 'Dérogation', to: to(20, 'w') }] }],
      ['e', 'action', 'Retoucher et recontrôler', 'Atelier', { control: true }], ['f', 'end', 'Pièce reprise', ''],
      ['r', 'action', 'Mettre au rebut et chiffrer le coût', 'Qualité', { links: [{ tool: '5.2' }], goto: to(20, 'g') }], ['w', 'document', 'Faire accepter la dérogation par le client', 'Commercial', { doc: 'Dérogation', goto: to(20, 'g') }], ['g', 'end', 'Défaut clos', ''],
    ], today, 50),
    flow(21, 'P5', 'Mener un atelier 5 Pourquoi', 'Défaut qui revient ou qui coûte cher', ap, [
      ['a', 'start', 'Défaut qui revient ou qui coûte cher', ''], ['b', 'action', 'Réunir les personnes concernées', 'Qualité'], ['c', 'action', 'Demander « pourquoi ? » jusqu\'à la cause racine', 'Animateur', { links: [{ tool: '5.3' }] }],
      ['d', 'decision', 'La cause racine est-elle trouvée ?', 'Animateur', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(21, 'c') }] }],
      ['e', 'action', 'Choisir une contre-mesure sous 7 jours', 'Qualité', { links: [{ tool: '5.3' }] }], ['f', 'action', 'Mettre en place la contre-mesure', 'Responsable du poste'],
      ['g', 'subprocess', 'Vérifier la contre-mesure à J+30', 'Qualité', { flowId: 'fl_demo_22' }], ['h', 'end', 'Cause traitée', ''],
    ], today, 40),
    flow(22, 'P5', 'Vérifier une contre-mesure à J+30', 'Contre-mesure en place depuis 30 jours', ap, [
      ['a', 'start', 'Contre-mesure en place depuis 30 jours', ''], ['b', 'action', 'Constater sur le terrain si le défaut est revenu', 'Qualité', { control: true, links: [{ tool: '5.4' }] }],
      ['c', 'decision', 'Le défaut est-il revenu ?', 'Qualité', { branches: [{ label: 'Non', to: '' }, { label: 'Oui', to: to(22, 'e') }] }], ['d', 'end', 'Contre-mesure efficace', ''],
      ['e', 'action', "Rouvrir l'atelier 5 Pourquoi", 'Qualité', { links: [{ tool: '5.3' }] }], ['f', 'end', 'Atelier rouvert', ''],
    ], today, 40),
    flow(23, 'P5', "Mesurer la satisfaction en fin d'affaire", 'Affaire terminée', ap, [
      ['a', 'start', 'Affaire terminée', ''], ['b', 'action', 'Poser les 3 questions au client', 'Commercial', { links: [{ tool: '2.4' }] }],
      ['c', 'decision', 'Le client est-il satisfait ?', 'Commercial', { branches: [{ label: 'Satisfait', to: '' }, { label: 'Pas satisfait', to: to(23, 'e') }] }],
      ['d', 'action', 'Proposer au client de donner son avis', 'Commercial'], ['f', 'end', 'Client satisfait', ''],
      ['e', 'action', 'Régler le point avec le client', 'Commercial'], ['g', 'decision', 'Le point est-il réglé ?', 'Commercial', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(23, 'i') }] }], ['h', 'end', 'Client rassuré', ''],
      ['i', 'action', 'Ouvrir une réclamation', 'Commercial', { links: [{ tool: '2.3' }] }], ['j', 'end', 'Réclamation ouverte', ''],
    ], today, 40),
    // flowcharts that show the key functions (4.1) and the skills (4.2) at work: the payroll, the opening of the premises, the nightly backup (a lane that is a skill)
    flow(24, 'P1', 'Payer les salaires du mois', 'Fin du mois', jm, [
      ['a', 'start', 'Fin du mois', ''], ['b', 'action', 'Préparer la paie', 'Comptabilité', { links: [{ tool: '4.2', id: 'sk_demo_7' }] }], ['c', 'action', 'Déclarer les charges sociales', 'Comptabilité', { links: [{ tool: '4.2', id: 'sk_demo_13' }, { tool: '4.1', id: 'pw_demo_7' }] }],
      ['d', 'action', 'Valider et signer les virements', 'Direction', { control: true, links: [{ tool: '4.1', id: 'pw_demo_1' }] }],
      ['e', 'decision', 'Les virements sont-ils partis ?', 'Direction', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(24, 'g') }] }], ['f', 'end', 'Salaires payés', ''],
      ['g', 'action', 'Contacter la banque', 'Direction', { goto: to(24, 'd') }],
    ], today, 30),
    flow(25, 'P4', 'Ouvrir les locaux', 'Début de journée', hr, [
      ['a', 'start', 'Début de journée', ''], ['b', 'action', "Désactiver l'alarme et ouvrir les locaux", "Responsable d'ouverture", { links: [{ tool: '4.1', id: 'pw_demo_4' }] }], ['c', 'action', 'Vérifier les accès et les installations', "Responsable d'ouverture"],
      ['d', 'decision', 'Tout est-il en ordre ?', "Responsable d'ouverture", { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(25, 'e') }] }], ['f', 'end', 'Locaux prêts', ''],
      ['e', 'action', 'Prévenir le responsable de site', "Responsable d'ouverture", { goto: to(25, 'c') }],
    ], today, 30),
    flow(26, 'P6', 'Sauvegarder les données', 'Chaque nuit', tm, [
      ['a', 'start', 'Chaque nuit', ''], ['b', 'action', 'Lancer la sauvegarde', 'Informatique', { links: [{ tool: '4.2', id: 'sk_demo_9' }, { tool: '4.1', id: 'pw_demo_9' }] }],
      ['c', 'action', 'Contrôler le résultat de la sauvegarde', 'Sauvegardes et accès informatiques', { control: true, roleRef: { kind: 'skill', id: 'sk_demo_9' } }],
      ['d', 'decision', 'La sauvegarde est-elle complète ?', 'Informatique', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(26, 'e') }] }], ['f', 'end', 'Données sauvegardées', ''],
      ['e', 'action', 'Relancer la sauvegarde', 'Informatique', { goto: to(26, 'c') }],
    ], today, 30),
    // a decision with three outcomes, a sub-process that calls the second flowchart, and links to several tools (and to records of the tool 4.2)
    flow(6, 'P4', 'Recruter et accueillir une personne', 'Besoin de recrutement', hr, [
      ['a', 'start', 'Besoin de recrutement', ''], ['b', 'action', "Rédiger l'offre et la diffuser", 'Ressources humaines'], ['c', 'action', 'Recevoir et lire les candidatures', 'Ressources humaines'], ['k', 'action', 'Recevoir les candidats en entretien', jm ? 'Jean-Marc' : 'Direction', jm ? { roleRef: { kind: 'person', id: jm } } : {}],
      ['d', 'decision', 'Que décider pour ce candidat ?', 'Direction', { branches: [{ label: 'Retenu', to: '' }, { label: 'À revoir', to: to(6, 'c') }, { label: 'Refusé', to: to(6, 'x') }] }],
      ['e', 'document', 'Signer le contrat de travail', 'Ressources humaines', { doc: 'Contrat', links: [{ tool: '1.3' }] }],
      ['f', 'subprocess', 'Accueillir la personne (parcours de 15 jours)', 'Ressources humaines', { flowId: 'fl_demo_7', links: [{ tool: '4.3' }] }],
      ['g', 'action', "Valider l'autonomie sur le poste", "Chef d'atelier", { control: true, links: [{ tool: '4.2' }, { tool: '4.1' }] }],
      ['h', 'end', 'Personne autonome sur son poste', ''], ['x', 'end', 'Candidat remercié', ''],
    ], today, 30),
    flow(7, 'P4', "Parcours d'accueil de 15 jours", "Arrivée de la personne", hr, [
      ['a', 'start', "Arrivée de la personne", ''], ['b', 'action', "Présenter l'entreprise, la sécurité et le poste", 'Ressources humaines', { links: [{ tool: '4.3' }, { tool: '3.2' }] }],
      ['c', 'action', 'Faire accompagner la personne sur son poste pendant une semaine', "Chef d'atelier", { links: [{ tool: '4.2' }] }], ['d', 'action', "Faire passer le test d'autonomie en 3 questions", "Chef d'atelier", { control: true, links: [{ tool: '4.3' }] }],
      ['e', 'decision', 'Test réussi ?', "Chef d'atelier", { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: to(7, 'g') }] }], ['f', 'end', 'Personne autonome', ''],
      ['g', 'action', "Prolonger l'accompagnement d'une semaine", "Chef d'atelier", { goto: to(7, 'd') }],
    ], today, 30),
    flow(5, 'P1', 'Revue de direction du mois', 'Clôture comptable du mois', jm, [
      ['a', 'start', 'Clôture comptable du mois', ''], ['b', 'action', 'Saisir les chiffres du mois', 'Comptabilité', { links: [{ tool: '1.1' }] }], ['c', 'action', 'Lire la synthèse et les dérives', 'Direction', { links: [{ tool: '1.1' }], control: true }], ['m', 'action', 'Tenir la réunion de direction', 'Direction'],
      ['d', 'decision', 'Une dérive demande une action ?', 'Direction', { no: 'st_demo_5f' }], ['e', 'action', "Nommer un pilote et une échéance", 'Direction', { links: [{ tool: '1.1' }] }], ['f', 'end', 'Revue tenue', ''],
    ], today, 110),
    flow(1, 'P2', 'Du devis à la commande', 'Demande de prix reçue', lb, [
      ['a', 'start', 'Demande de prix reçue', ''], ['b', 'action', 'Qualifier la demande', 'Commercial'], ['c', 'action', 'Vérifier la faisabilité en atelier', 'Opérations', { links: [{ tool: '2.1' }] }],
      ['d', 'action', 'Chiffrer le devis', 'Commercial', { links: [{ tool: '2.1' }, { tool: '4.2', id: 'sk_demo_6' }], doc: 'Devis' }], ['e', 'decision', 'Marge suffisante ?', 'Direction', { no: 'st_demo_1d', control: true, links: [{ tool: '4.1', id: 'pw_demo_2' }] }],
      ['f', 'action', 'Envoyer le devis', 'Commercial'], ['g', 'decision', 'Le client signe ?', 'Commercial', { no: 'st_demo_1h' }], ['i', 'end', 'Commande signée', ''], ['h', 'end', 'Offre abandonnée', ''],
    ], today, 60),
    flow(2, 'P2', 'Traiter une réclamation client', 'Réclamation reçue', sv, [
      ['a', 'start', 'Réclamation reçue', ''], ['b', 'action', 'Recontacter le client sous 48 h', 'Commercial', { links: [{ tool: '2.3' }], control: true }], ['c', 'action', "Chercher l'origine", 'Qualité', { links: [{ tool: '5.3' }] }],
      ['d', 'decision', 'La réclamation est-elle fondée ?', 'Direction', { no: 'st_demo_2h' }], ['e', 'action', 'Réparer et chiffrer le coût', 'Commercial', { links: [{ tool: '5.2' }] }], ['g', 'end', 'Client satisfait', ''], ['h', 'action', "Informer le client que la réclamation n'est pas fondée", 'Commercial'], ['f', 'end', 'Réclamation contestée', ''],
    ], today, 60),
    // the sub-processes: the delivery is received by flowchart 16, a defective part is handled by flowchart 20, then the manufacturing starts again
    flow(3, 'P3', 'Fabriquer et livrer une commande', 'Commande signée', dk, [
      ['a', 'start', 'Commande signée', ''], ['b', 'action', 'Lancer la fabrication', 'Atelier', { links: [{ tool: '3.2' }, { tool: '4.1', id: 'pw_demo_3' }] }],
      ['m', 'action', 'Usiner, plier et souder les pièces', 'Atelier', { links: [{ tool: '4.2', id: 'sk_demo_1' }, { tool: '4.2', id: 'sk_demo_2' }, { tool: '4.2', id: 'sk_demo_3' }, { tool: '4.1', id: 'pw_demo_6' }, { tool: '4.1', id: 'pw_demo_8' }] }],
      ['n', 'action', 'Monter et câbler les armoires', 'Atelier', { links: [{ tool: '4.2', id: 'sk_demo_4' }] }], ['c', 'action', 'Contrôler chaque jalon', 'Qualité', { links: [{ tool: '3.4' }, { tool: '4.2', id: 'sk_demo_5' }], control: true }],
      ['d', 'decision', 'Conforme ?', 'Qualité', { no: 'st_demo_3e' }], ['f', 'action', 'Livrer la commande', 'Livreur'], ['s', 'subprocess', 'Faire réceptionner la livraison chez le client', 'Livreur', { flowId: 'fl_demo_16' }], ['g', 'end', 'Produit livré et reçu', ''],
      ['e', 'subprocess', 'Isoler la pièce et décider (rebut, retouche, dérogation)', 'Qualité', { flowId: 'fl_demo_20', links: [{ tool: '5.1' }], goto: 'st_demo_3b' }],
    ], today, 200),
    // a point to correct on purpose: the decision has no "no" (it overlaps flowchart 20 on purpose: it is the short version a company writes first)
    flow(4, 'P5', 'Traiter un défaut', 'Défaut constaté', ap, [
      ['a', 'start', 'Défaut constaté', ''], ['b', 'action', 'Mettre la pièce en quarantaine', 'Atelier', { links: [{ tool: '5.1' }] }], ['c', 'decision', 'La cause est-elle à chercher ?', 'Qualité'], ['d', 'action', 'Mener un atelier 5 Pourquoi', 'Qualité', { links: [{ tool: '5.3' }] }], ['e', 'end', 'Contre-mesure vérifiée à J+30', ''],
    ], today, 420),
  ];
  // the skills (4.2) and key functions (4.1) of the company set on the steps that need them, so that the flowcharts show who can do what
  const SK = (id: number): FlowLink => ({ tool: '4.2', id: `sk_demo_${id}` }), PW = (id: number): FlowLink => ({ tool: '4.1', id: `pw_demo_${id}` });
  const STEP_LINKS: Record<string, FlowLink[]> = {
    '5b': [SK(8)], '11d': [SK(6)], '12e': [PW(2)], '13b': [SK(10)], '13d': [PW(2)], '2d': [PW(2)], '15b': [SK(12), { tool: '3.3', id: 'eq_demo_cnc' }], '15q': [SK(12)], '16d': [SK(5)], '17d': [PW(4)],
    '3m': [{ tool: '3.2', id: 'sop_demo_2' }, { tool: '3.2', id: 'sop_demo_3' }, { tool: '3.3', id: 'eq_demo_cnc' }, { tool: '3.3', id: 'eq_demo_plieuse' }], '3n': [{ tool: '3.2', id: 'sop_demo_1' }], '3c': [{ tool: '3.2', id: 'sop_demo_6' }], '3f': [{ tool: '3.2', id: 'sop_demo_5' }, { tool: '3.3', id: 'eq_demo_chariot' }],
    '14f': [{ tool: '3.2', id: 'sop_demo_8' }],
    '20c': [SK(15)], '20d': [PW(5)], '20e': [SK(5)], '6f': [SK(14)], '6g': [SK(14)], '7c': [SK(14)], '7b': [SK(14)],
  };
  // what the steps of work rely on, so that the matrix of each process reads as a completed one: a skill and, where it makes sense, an instruction, a risk, an indicator
  const M = (n: number): FlowLink => ({ tool: '4.2', id: `sk_map_${n}` }), I = (n: number): FlowLink => ({ tool: '3.2', id: `sop_map_${n}` }), D = (n: number): FlowLink => ({ tool: '3.2', id: `sop_demo_${n}` });
  const R = (n: string): FlowLink => ({ tool: '1.2', id: `risk_demo_${n}` }), K = (n: string): FlowLink => ({ tool: '1.1', id: `kpi_${n}` }), E = (n: string): FlowLink => ({ tool: '3.3', id: `eq_demo_${n}` });
  const MORE: Record<string, FlowLink[]> = {
    '1b': [M(1), I(1)], '1c': [SK(2)], '1d': [I(1)], '1f': [M(1), I(1), K('devis_attente')],
    '2b': [M(2), I(2), K('reclamations')], '2c': [M(5), I(2)], '2e': [M(2), I(2)], '2h': [M(2)],
    '3b': [SK(2)], '3f': [SK(11), M(4), K('otif'), K('retards')], '3s': [M(4), I(9)], '3e': [SK(15), I(5)], '3m': [R('cnc')], '3c': [K('retouches')],
    '4b': [SK(15), I(5)], '4d': [M(5)],
    '5c': [M(6), K('ca'), K('marge')], '5m': [M(6)], '5e': [M(6)],
    '6b': [M(7)], '6c': [M(7)], '6k': [M(7)], '6e': [M(7)],
    '7b': [I(8)], '7c': [I(8)], '7d': [SK(14), I(8)], '7g': [SK(14)],
    '8b': [M(6)], '8c': [M(6)], '8e': [M(6)], '8f': [M(6), K('ca')],
    '9b': [M(6)], '9c': [SK(8), K('treso')], '9e': [M(3), I(7)], '9f': [M(6)], '9x': [M(6)],
    '10b': [M(6)], '10c': [M(6)], '10f': [M(6)], '10g': [M(6)],
    '11b': [M(1), I(1), K('devis_attente'), K('transfo'), R('client')], '11d': [I(1)], '11e': [M(1)], '11f': [M(1)],
    '12b': [SK(6)], '12d': [SK(6)], '12e': [SK(6)], '12f': [M(1)], '12q': [M(1)],
    '13c': [SK(10)], '13e': [SK(10)], '13f': [SK(10)], '13n': [M(1)], '13x': [M(1)],
    '14b': [M(3), R('tole')], '14d': [M(3), I(7), R('tole')], '14e': [M(3), I(7)], '14f': [SK(5), D(8)], '14h': [SK(15), I(5)], '14s': [M(3)],
    '15w': [SK(12), I(4)], '15p': [SK(12), I(4)], '15v': [SK(12)], '15q': [I(4)], '15r': [I(4), E('cnc')], '15s': [SK(12), I(4)], '15y': [SK(12)],
    '16b': [M(4), I(9)], '16r': [M(4), I(9)], '16s': [M(4)], '16x': [M(4)], '16z': [M(4)],
    '17h': [M(1)], '17e': [K('suppleance')],
    '18b': [SK(14)], '18c': [SK(14)], '18f': [SK(14)], '18g': [SK(14)], '18h': [SK(14)], '18j': [SK(14), K('suppleance')],
    '20b': [SK(15), I(5)], '20e': [D(6), K('retouches'), R('lot')], '20r': [SK(15), I(5), K('cnq')], '20w': [SK(15)],
    '21b': [M(5)], '21c': [M(5)], '21e': [M(5)], '21f': [M(5)], '21g': [M(5)],
    '22b': [SK(15), K('actions_j30')], '22e': [M(5)],
    '23b': [M(1), K('satisfaction')], '23d': [M(1)], '23e': [M(2)], '23i': [M(2), K('reclamations')],
    '24d': [SK(7), R('banque')], '24g': [SK(7)],
    '26b': [I(6), R('cyber')], '26c': [I(6)], '26e': [SK(9), I(6)],
  };
  flows.forEach(f => f.steps.forEach(st => { const key = st.id.slice('st_demo_'.length), more = MORE[key]; if (more) st.links = [...(st.links || []), ...more.filter(l => !(st.links || []).some(x => x.tool === l.tool && x.id === l.id))]; }));
  flows.forEach(f => f.steps.forEach(st => { const extra = STEP_LINKS[st.id.slice('st_demo_'.length)]; if (extra) st.links = [...(st.links || []), ...extra.filter(l => !(st.links || []).some(x => x.tool === l.tool && x.id === l.id))]; }));
  // the flowcharts as a whole linked to the tools they rely on (all optional: a flowchart needs none)
  const FLOW_LINKS: Record<number, FlowLink[]> = {
    1: [{ tool: '2.1' }, K('marge'), R('client')], 2: [K('reclamations')], 3: [{ tool: '3.3', id: 'eq_demo_cnc' }, { tool: '3.3', id: 'eq_demo_plieuse' }, { tool: '3.2' }, K('otif'), R('lot')], 9: [{ tool: '1.1' }], 10: [{ tool: '1.2' }], 11: [K('devis_attente')], 15: [{ tool: '3.3', id: 'eq_demo_cnc' }, { tool: '3.3' }, R('cnc')],
    16: [{ tool: '3.4' }], 17: [{ tool: '4.1' }], 18: [{ tool: '4.2' }], 20: [{ tool: '5.1' }, { tool: '5.2' }, K('cnq')],
  };
  flows.forEach(f => { const l = FLOW_LINKS[Number(f.id.slice('fl_demo_'.length))]; if (l) f.links = l; });
  // what each flowchart says precisely about itself: purpose, result, what enters and leaves, what is required (the sheets of P2 and P3 gather it)
  const FLOW_SHEET: Record<number, Pick<Flow, 'purpose' | 'result' | 'inputs' | 'outputs' | 'requirements'>> = {
    1: { purpose: 'Chiffrer une demande et obtenir la signature.', result: 'Commande signée ou offre classée', inputs: [{ what: 'Demande de prix', party: 'Client' }, { what: 'Délais et capacité de fabrication', party: 'Opérations', processId: 'P3' }], outputs: [{ what: 'Commande signée', party: 'Opérations', processId: 'P3' }], requirements: [{ kind: 'client', text: 'Réponse à une demande de prix sous un délai promis' }, { kind: 'internal', text: 'Marge minimale d’un devis' }] },
    2: { purpose: 'Répondre à un client mécontent et empêcher le retour.', result: 'Réclamation clôturée et client informé', inputs: [{ what: 'Réclamation', party: 'Client' }], outputs: [{ what: 'Réclamation traitée', party: 'Client' }, { what: 'Défaut à analyser', party: 'Qualité', processId: 'P5' }], requirements: [{ kind: 'client', text: 'Recontact du client sous 48 h' }] },
    11: { purpose: 'Ne pas laisser un devis sans réponse.', result: 'Devis signé ou classé sans suite', inputs: [{ what: 'Devis envoyé', party: 'Commercial' }], outputs: [{ what: 'Commande signée', party: 'Opérations', processId: 'P3' }] },
    12: { purpose: "Décider de répondre à un appel d'offres et le faire valider.", result: 'Réponse déposée ou décision de ne pas répondre', inputs: [{ what: 'Cahier des charges', party: 'Client' }], outputs: [{ what: 'Offre déposée', party: 'Client' }], requirements: [{ kind: 'legal', text: 'Dépôt avant la date limite du règlement de consultation' }] },
    13: { purpose: 'Chiffrer et accepter un changement en cours de commande.', result: 'Avenant accepté ou changement refusé', inputs: [{ what: 'Demande de changement', party: 'Client' }], outputs: [{ what: 'Commande modifiée', party: 'Opérations', processId: 'P3' }] },
    3: { purpose: 'Fabriquer, contrôler et livrer ce qui a été promis.', result: 'Produit livré et reçu par le client', inputs: [{ what: 'Commande signée', party: 'Commercial', processId: 'P2' }, { what: 'Matières et pièces', party: 'Fournisseurs' }], outputs: [{ what: 'Produit livré, procès-verbal de réception', party: 'Client' }], requirements: [{ kind: 'client', text: 'Spécifications et tolérances de la commande' }, { kind: 'internal', text: 'Autocontrôle à chaque jalon' }] },
    14: { purpose: 'Acheter au bon prix chez un fournisseur évalué.', result: 'Matière reçue et contrôlée', inputs: [{ what: "Besoin d'achat", party: 'Atelier' }], outputs: [{ what: 'Commande fournisseur', party: 'Fournisseurs' }] },
    15: { purpose: 'Garder les équipements en état de marche.', result: 'Équipement remis en service', inputs: [{ what: 'Panne signalée', party: 'Atelier' }], outputs: [{ what: 'Équipement réparé', party: 'Atelier' }], requirements: [{ kind: 'legal', text: 'Vérification des appareils de levage (si concerné)' }] },
    19: { purpose: 'Retrouver un document sans le chercher.', result: 'Document nommé et rangé au bon endroit', inputs: [{ what: 'Document créé', party: 'Toute personne' }], outputs: [{ what: 'Document classé', party: 'Toute personne' }] },
    26: { purpose: 'Ne jamais perdre les données de l’entreprise.', result: 'Sauvegarde vérifiée', inputs: [{ what: 'Données de l’entreprise', party: 'Tous les processus' }], outputs: [{ what: 'Copie de sauvegarde', party: 'Direction', processId: 'P1' }] },
    16: { purpose: 'Faire constater la conformité par le client.', result: 'Procès-verbal de réception signé', inputs: [{ what: 'Produit prêt à livrer', party: 'Atelier' }], outputs: [{ what: 'Procès-verbal signé', party: 'Client' }] },
  };
  // the steps that meet the requirements written on the flowchart (the check of flowchart 15 is left unlinked on purpose: the sheet then shows a requirement no step meets)
  const REQ_STEPS: Record<number, Record<string, string[]>> = {
    1: { b: ['Réponse à une demande'], d: ['Marge minimale'], e: ['Marge minimale'] }, 2: { b: ['Recontact du client'] }, 3: { c: ['Autocontrôle', 'Spécifications et tolérances'], m: ['Spécifications et tolérances'], n: ['Spécifications et tolérances'] }, 12: { f: ['Dépôt avant la date limite'] },
  };
  flows.forEach(f => {
    const n = Number(f.id.slice('fl_demo_'.length)), x = FLOW_SHEET[n];
    if (!x) return;
    Object.assign(f, x);
    if (f.requirements) f.requirements = withReqIds(f.requirements);
    f.steps.forEach(st => { const t = REQ_STEPS[n]?.[st.id.slice(`st_demo_${n}`.length)], ids = t ? (f.requirements || []).filter(r => t.some(q => r.text.startsWith(q))).map(r => r.id!) : []; if (ids.length) st.reqs = ids; });
  });
  // the instructions (drafts) and the skills the flowcharts rely on beyond those of the other examples: written as if created from the steps
  const sop = (n: number, processId: string, poste: string, operation: string, author: string, origin: string): Sop => ({ ...newSop(processId, today), id: `sop_map_${n}`, poste, operation, author, origin: { flowId: `fl_demo_${origin.split(':')[0]}`, stepId: `st_demo_${origin.split(':')[0]}${origin.split(':')[1]}` } });
  const sops: Sop[] = [
    sop(1, 'P2', 'Bureau commercial', "Chiffrage et envoi d'un devis", 'Laurent B.', '1:d'), sop(2, 'P2', 'Bureau commercial', "Traitement d'une réclamation client", 'Sophie V.', '2:b'),
    sop(4, 'P3', 'Maintenance', "Routine de contrôle d'un équipement", 'Rachid H.', '15:b'), sop(5, 'P5', 'Atelier', "Isolement d'une pièce au bac rouge", 'Antoine P.', '20:b'),
    sop(6, 'P6', 'Informatique', 'Contrôle de la sauvegarde de la nuit', 'Thomas M.', '26:c'), sop(7, 'P3', 'Achats', "Passage d'une commande fournisseur", 'Sophie V.', '14:d'),
    sop(8, 'P4', 'Accueil', "Parcours d'une personne qui arrive", 'Hélène R.', '7:b'), sop(9, 'P3', 'Livraison', 'Réception chez le client et procès-verbal', 'David K.', '16:b'),
  ];
  const sk = (n: number, processId: string, name: string, levels: [string, 0 | 1 | 2 | 3 | 4][]): Skill => ({ id: `sk_map_${n}`, name, processId, plan: null, levels: Object.fromEntries(levels.flatMap(([who, l]) => { const pid = id(who); return pid ? [[pid, l]] : []; })) as Skill['levels'] });
  const skills: Skill[] = [
    sk(1, 'P2', 'Relation client et relances', [['Laurent B.', 4], ['Sophie V.', 3], ['Jean-Marc', 2]]), sk(2, 'P2', 'Traitement des réclamations', [['Sophie V.', 4], ['Laurent B.', 3]]),
    sk(3, 'P3', 'Achats et suivi des fournisseurs', [['Sophie V.', 4], ['David K.', 3]]), sk(4, 'P3', 'Livraison et réception chez le client', [['Fabien T.', 4], ['Samuel G.', 3], ['Olivier N.', 3]]),
    sk(5, 'P5', "Animation d'un atelier 5 Pourquoi", [['Antoine P.', 4], ['Manon T.', 3]]), sk(6, 'P1', 'Pilotage par les indicateurs', [['Jean-Marc', 4], ['Hélène R.', 3]]), sk(7, 'P4', 'Recrutement', [['Hélène R.', 4], ['Jean-Marc', 3]]),
  ].filter(k => Object.keys(k.levels).length > 0);
  return { processes, flows, sops, skills };
}

export function applyMapExample(d: Pick<State, 'processes' | 'flows' | 'people' | 'params' | 'settings'> & Partial<Pick<State, 'skills' | 'powers' | 'equipments' | 'sops' | 'risks' | 'kpis'>>, today = new Date()) {
  const ex = mapExamples(Object.values(d.people), today);
  // the equipment of the example only where the company holds it
  Object.values(ex.processes).forEach(e => { if (e.equipmentIds) e.equipmentIds = e.equipmentIds.filter(i => !!d.equipments?.[i]); if (e.equipmentIds && !e.equipmentIds.length) delete e.equipmentIds; });
  // the processes of the example that a saved example does not hold yet (only in the fictitious company, once)
  if (d.settings?.companyName === EXAMPLE_COMPANY && (d.params.mapExampleLevel ?? 0) < 13) ['P6', 'P7'].forEach(id => { const e = ex.processes[id]; if (e && !d.processes.some(p => p.id === id)) d.processes.push({ id, name: '', color: '#64748B', order: d.processes.length, kpiIds: [], ...e } as Process); });
  d.processes.forEach(p => {
    const e = ex.processes[p.id];
    if (!e) return;
    (Object.keys(e) as (keyof Process)[]).forEach(k => { if (e[k] !== undefined && e[k] !== '' && (p[k] === undefined || (Array.isArray(p[k]) && !(p[k] as unknown[]).length))) (p as unknown as Record<string, unknown>)[k] = e[k]; });
  });
  // a flowchart of the example that the company never versioned (still version 2, no history) is brought to the current example; one it marked a version of is its own and stays
  // the extra instructions and skills, only in a company that holds the examples of the instructions and the skills (and never over a record of the same name)
  if (d.sops && d.skills && d.skills.sk_demo_1) { ex.sops.forEach(x => { if (!d.sops![x.id]) d.sops![x.id] = x; }); ex.skills.forEach(x => { if (!d.skills![x.id]) d.skills![x.id] = x; }); }
  // a link to a skill or a key function of the example only where the company holds it (a saved example may not have it)
  const there = (l: { tool: string; id?: string }) => !l.id || (l.tool === '4.2' ? !!d.skills?.[l.id] : l.tool === '4.1' ? !!d.powers?.[l.id] : l.tool === '3.3' ? !!d.equipments?.[l.id] : l.tool === '3.2' ? !!d.sops?.[l.id] : l.tool === '1.2' ? !!d.risks?.[l.id] : l.tool === '1.1' ? !!d.kpis?.[l.id] : true);
  ex.flows.forEach(f => { if (f.links) { f.links = f.links.filter(there); if (!f.links.length) delete f.links; } });
  ex.flows.forEach(f => { f.steps = f.steps.map(st => (st.roleRef?.kind === 'skill' && !d.skills?.[st.roleRef.id] ? (({ roleRef, ...rest }) => ({ ...rest, role: 'Informatique' }))(st) : st)); });
  ex.flows.forEach(f => { f.steps = f.steps.map(st => (st.links ? { ...st, links: st.links.filter(there) } : st)).map(st => (st.links && !st.links.length ? (({ links, ...rest }) => rest)(st) : st)); });
  ex.flows.forEach(f => { const cur = d.flows[f.id]; if (d.processes.some(p => p.id === f.processId) && (!cur || (cur.version === f.version && !cur.history.length))) d.flows[f.id] = f; });
  // the quality process of an example saved before the fourth band was in the support band: it crosses all the others
  const p5 = d.processes.find(p => p.id === 'P5');
  if (p5 && p5.band === 'support' && d.settings?.companyName === EXAMPLE_COMPANY && (d.params.mapExampleLevel ?? 0) < 12) p5.band = 'transverse';
  // an example saved before the inputs, outputs and requirements moved to the flowcharts still has them on the sheet: they would show twice
  if (d.settings?.companyName === EXAMPLE_COMPANY && (d.params.mapExampleLevel ?? 0) < 15) d.processes.forEach(p => dropFlowDuplicates(d, p));
  // level 17: wordings and places corrected in the example. A saved example is changed only where it still reads as the example wrote it (what the company typed is never touched)
  if (d.settings?.companyName === EXAMPLE_COMPANY && (d.params.mapExampleLevel ?? 0) < 17) fixExampleTexts(d, ex);
  if (d.settings?.companyName === EXAMPLE_COMPANY) d.params.mapExampleLevel = MAP_EXAMPLE_LEVEL;
}

// [process, old kind, old words, new kind, new words]: the requirements of the sheets of the first examples, now worded as the catalogue of requirements (cartography.ts) so that they leave its list once added
const REQ_FIXES: [string, MapReq['kind'], string, MapReq['kind'], string][] = [
  ['P1', 'legal', 'Tenue de la comptabilité et dépôt des comptes', 'legal', 'Tenue de la comptabilité et dépôt des comptes (selon la forme juridique)'],
  ['P1', 'internal', 'Une revue de direction par mois', 'internal', 'Une revue de direction par période fixée'],
  ['P5', 'internal', 'Décision sous 24 h sur toute pièce isolée', 'internal', 'Décision rapide sur tout produit isolé'],
];
function fixExampleTexts(d: Parameters<typeof applyMapExample>[0], ex: ReturnType<typeof mapExamples>): void {
  const proc = (id: string) => d.processes.find(p => p.id === id);
  const p4 = proc('P4');
  if (p4 && p4.purpose === "Avoir les bonnes personnes, formées, savoir qui remplace qui quand quelqu'un manque, et que chaque document se retrouve.") {
    p4.purpose = ex.processes.P4.purpose;
    const links = p4.docLinks?.filter(l => l.tool !== '4.4'); links?.length ? (p4.docLinks = links) : delete p4.docLinks;
  }
  const p7 = proc('P7');
  if (p7?.docs) p7.docs = p7.docs.map(x => (x === '04_RH_ADMINISTRATION/01_Plan_de_classement' ? 'Plan de classement de l’entreprise' : x));
  REQ_FIXES.forEach(([pid, k, t, nk, nt]) => { const q = proc(pid); if (q?.requirements) q.requirements = q.requirements.map(r => (r.kind === k && r.text === t ? { ...r, kind: nk, text: nt } : r)); });   // new objects: the saved ones may be shared with the state the caller keeps
  // the backup is a matter of the information systems process (P6), where its flowchart is
  if (proc('P6')) {
    const sk = d.skills?.sk_demo_9, sop = d.sops?.sop_map_6;
    if (sk?.processId === 'P1') d.skills!.sk_demo_9 = { ...sk, processId: 'P6' };
    if (sop?.processId === 'P1') d.sops!.sop_map_6 = { ...sop, processId: 'P6' };
  }
}

// A fictitious company saved before this version gets its sheets and flowcharts once (a real company gets nothing, and what the company wrote is never replaced)
export function completeMapExamples<T extends Pick<State, 'processes' | 'flows' | 'people' | 'params' | 'settings'> & Partial<Pick<State, 'skills' | 'powers' | 'equipments' | 'sops' | 'risks' | 'kpis'>>>(s: T, today = new Date()): T {
  if (s.settings?.companyName !== EXAMPLE_COMPANY || (s.params.mapExampleLevel ?? 0) >= MAP_EXAMPLE_LEVEL || !s.processes.some(p => /^P[1-5]$/.test(p.id))) return s;
  const d = { ...s, processes: s.processes.map(p => ({ ...p })), flows: { ...s.flows }, params: { ...s.params }, ...(s.sops ? { sops: { ...s.sops } } : {}), ...(s.skills ? { skills: { ...s.skills } } : {}) };
  applyMapExample(d, today);
  return d;
}

// For a map with no process: the processes of the example (P1 to P7) with their sheets and flowcharts, so that the tool can be seen worked (nothing else is touched)
const EXAMPLE_NAMES: Record<string, string> = { P1: 'Direction et pilotage', P2: 'Commercial et clients', P3: 'Réalisation et opérations', P4: 'Ressources humaines et organisation', P5: 'Qualité et amélioration' };
const EXAMPLE_COLORS = ['#0f766e', '#b45309', '#1d4ed8', '#7c3aed', '#be123c', '#0E7490', '#A16207'];
export function loadMapExample(d: Parameters<typeof applyMapExample>[0], today = new Date()): void {
  Object.entries(mapExamples(Object.values(d.people), today).processes).forEach(([id, e]) => {
    if (!d.processes.some(p => p.id === id)) d.processes.push({ name: EXAMPLE_NAMES[id] ?? '', color: EXAMPLE_COLORS[d.processes.length % EXAMPLE_COLORS.length], kpiIds: [], ...e, id, order: d.processes.length } as Process);
  });
  applyMapExample(d, today);
}
