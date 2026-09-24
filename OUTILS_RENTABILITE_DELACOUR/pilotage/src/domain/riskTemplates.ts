// Tool 1.2 content: Plan B families with ideas, typical risks per job, demo risks of the fictitious company.
import type { Action, ParadeFamily, Risk, Scale, State } from './types';
import { isoDate } from './periods';
import { newRisk } from './risk';

export const FAMILIES: { key: ParadeFamily; label: string; hint: string; ideas: string[] }[] = [
  { key: 'relais', label: 'Relais externe', hint: 'confrère, sous-traitant, 2e fournisseur', ideas: ['Accord de réciprocité signé avec un confrère (machines, personnel)', 'Sous-traitant référencé, compte ouvert, fichiers prêts à envoyer', 'Second fournisseur référencé avec prix et délais connus', 'Ligne de trésorerie de secours dans une 2e banque'] },
  { key: 'stock', label: 'Stock tampon', hint: 'matière, pièces, trésorerie', ideas: ['Stock de sécurité de la matière critique (2 semaines)', 'Pièces d\'usure critiques en réserve au magasin', 'Réserve de trésorerie équivalente à 1 mois de charges', 'Produits finis d\'avance pour le client n°1'] },
  { key: 'doublure', label: 'Doublure formée', hint: 'binôme, polyvalence, procédure écrite', ideas: ['Binôme formé et entraîné sur le poste clé', 'Fiches opératoires visuelles au poste', 'Accès et mots de passe détenus par 2 personnes', 'Intérimaire qualifié identifié à l\'avance'] },
  { key: 'degrade', label: 'Fonctionnement dégradé', hint: 'mode manuel, priorités, hors réseau', ideas: ['Mode manuel sur papier (bons, planning, factures)', 'Tableur miroir hors réseau mis à jour chaque semaine', 'Liste des commandes prioritaires et de celles à reporter', 'Sauvegarde hors ligne restaurable en 4 h'] },
];
export const familyLabel = (f: ParadeFamily | '') => FAMILIES.find(x => x.key === f)?.label || '';

// Ideas of preparation actions, per 5M dimension (shown in the action sheet for a risk)
export const PREP_IDEAS: Record<string, string[]> = {
  main_oeuvre: ['Former la doublure et la faire pratiquer 1 journée', 'Nommer un suppléant au responsable du risque', 'Diffuser la fiche réflexe à l\'équipe concernée'],
  methode: ['Écrire la fiche réflexe (première heure) et la ranger au poste', 'Écrire la procédure de bascule en mode dégradé', 'Planifier le test du Plan B dans l\'agenda'],
  materiel: ['Mettre en place une sauvegarde hors réseau testée', 'Acheter les pièces d\'usure critiques en réserve', 'Double des clés et des accès sous enveloppe au coffre'],
  matiere: ['Ouvrir un compte chez un second fournisseur', 'Constituer le stock tampon convenu', 'Négocier un délai de dépannage garanti'],
  milieu: ['Signer l\'accord de réciprocité avec un confrère', 'Prévenir le client clé du dispositif de secours', 'Vérifier le contrat d\'assurance perte d\'exploitation'],
};

type Seed = [process: string, title: string, resource: string, family: ParadeFamily, gravity: Scale, likelihood: Scale];
const TYPICAL: Record<string, Seed[]> = {
  industrie: [
    ['P3', 'Panne de la machine goulet', 'Machine principale de production', 'relais', 4, 3],
    ['P3', 'Rupture de la matière critique', 'Fournisseur unique de matière', 'stock', 3, 3],
    ['P4', 'Absence du programmeur ou de l\'expert clé', 'Compétence détenue par une seule personne', 'doublure', 3, 3],
    ['P1', 'Cyberattaque ou panne du logiciel de gestion', 'ERP, fichiers, messagerie', 'degrade', 4, 2],
    ['P2', 'Perte du premier client', 'Client qui pèse plus de 30 % du CA', 'relais', 4, 2],
    ['P1', 'Blocage bancaire ou fraude au président', 'Trésorerie et virements', 'relais', 4, 1],
    ['P5', 'Lot non conforme livré chez un grand compte', 'Contrôle final', 'degrade', 3, 2],
    ['P1', 'Incendie ou dégât des eaux dans l\'atelier', 'Bâtiment et stock', 'relais', 4, 1],
  ],
  btp: [
    ['P3', 'Absence du chef de chantier', 'Encadrement du chantier principal', 'doublure', 3, 3],
    ['P3', 'Panne de l\'engin ou du véhicule clé', 'Engin de levage, camion', 'relais', 3, 3],
    ['P4', 'Défaillance d\'un sous-traitant en cours de chantier', 'Sous-traitant de lot', 'relais', 3, 3],
    ['P3', 'Rupture d\'approvisionnement en matériaux', 'Négoce principal', 'stock', 3, 2],
    ['P4', 'Accident grave sur chantier', 'Sécurité des équipes', 'degrade', 4, 2],
    ['P1', 'Retard de paiement d\'un gros marché', 'Trésorerie', 'relais', 4, 2],
    ['P1', 'Cyberattaque ou perte des fichiers de chiffrage', 'Logiciel de devis, fichiers', 'degrade', 3, 2],
    ['P1', 'Vol sur chantier ou au dépôt', 'Outillage et matériaux', 'stock', 2, 3],
  ],
  services: [
    ['P3', 'Départ ou absence d\'un consultant clé', 'Compétence et relation client', 'doublure', 4, 3],
    ['P2', 'Perte du premier client', 'Client qui pèse plus de 30 % du CA', 'relais', 4, 2],
    ['P1', 'Cyberattaque ou perte des données clients', 'Messagerie, cloud, fichiers', 'degrade', 4, 2],
    ['P1', 'Retard de paiement d\'un gros client', 'Trésorerie', 'relais', 3, 3],
    ['P3', 'Panne des outils de travail à distance', 'Ordinateurs, connexion, visio', 'degrade', 2, 3],
    ['P4', 'Surcharge et épuisement de l\'équipe', 'Capacité de production', 'relais', 3, 3],
    ['P5', 'Litige ou réclamation grave d\'un client', 'Réputation, responsabilité', 'degrade', 3, 2],
    ['P1', 'Absence prolongée du dirigeant', 'Décisions, signatures, banque', 'doublure', 4, 1],
  ],
};

export function typicalRisks(profile: string): Risk[] {
  return (TYPICAL[profile] || TYPICAL.industrie).map(([processId, title, resource, family, gravity, likelihood], i) => {
    const r = newRisk(processId);
    return { ...r, id: `${r.id}${i}`, title, resource, family, gravity, likelihood };
  });
}

// ---- fictitious company: the 7 risks of the previous version, completed, with tests at various ages
export function demoRisks(today = new Date()): { risks: State['risks']; actions: State['actions'] } {
  const ago = (days: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days));
  const base = (id: string, p: Partial<Risk>): Risk => ({ ...newRisk('P1', today), id, createdAt: ago(300), ...p });
  const risks: Risk[] = [
    base('risk_demo_cyber', {
      processId: 'P1', title: 'Cyberattaque ERP / rançongiciel', resource: 'ERP, fichiers de production, messagerie', signal: 'Fichiers illisibles, message de rançon, ERP inaccessible',
      maxOutage: '1 jour', owner: 'Thomas M.', deputy: 'Hélène R.', gravity: 4, likelihood: 2,
      whys: ['Les fichiers sont chiffrés', 'La sauvegarde est chiffrée aussi', 'Elle est branchée en continu sur le réseau', 'Personne n\'a prévu de copie déconnectée', ''],
      cause: 'Sauvegarde branchée en continu sur le réseau, sans copie déconnectée',
      family: 'degrade', planB: 'Débrancher le réseau, basculer sur le tableur miroir hors réseau et restaurer la sauvegarde J-1 du disque externe rangé au coffre', relay: 'Prestataire informatique (contrat d\'intervention sous 4 h)', activation: 'sous 4 h',
      firstHour: 'Débrancher le câble réseau des postes et du serveur\nNe rien éteindre, ne rien payer\nAppeler le prestataire informatique\nPasser la production sur les bons papier du classeur rouge',
      contacts: 'Prestataire informatique : 04 00 00 00 01\nThomas M. (IT) : 06 00 00 00 01\nCyber-assurance, numéro d\'urgence : 0 800 000 000', access: 'Disque de sauvegarde J-1 : coffre du bureau direction (code chez Hélène R.)', sacrifice: 'Factures et relances reportées de 48 h',
      testMethod: 'Restauration réelle de la sauvegarde sur un poste de secours', testCriterion: 'ERP restauré et utilisable en moins de 4 h',
      tests: [{ date: ago(40), ok: true, note: 'Restauration en 3 h 10', by: 'Thomas M.' }],
      cost: { perDay: 6500, daysWithout: 10, daysWith: 1, planBCost: 1800 },
    }),
    base('risk_demo_banque', {
      processId: 'P1', title: 'Blocage bancaire / fraude au président', resource: 'Trésorerie, virements', signal: 'Virement inhabituel demandé en urgence, compte bloqué',
      maxOutage: '2 jours', owner: 'Hélène R.', gravity: 4, likelihood: 1,
      cause: 'Une seule banque et pas de contre-appel sur les virements inhabituels',
      family: 'relais', planB: 'Activer la ligne de trésorerie de secours de la 2e banque ; tout virement inhabituel est validé par contre-appel du dirigeant', relay: '2e banque partenaire', activation: 'sous 24 h',
      firstHour: 'Ne valider aucun virement demandé par mail ou téléphone\nContre-appeler le dirigeant sur son numéro habituel\nPrévenir la banque', contacts: 'Conseiller banque principale : 04 00 00 00 02\nConseiller 2e banque : 04 00 00 00 03', access: 'Convention de trésorerie : classeur Finances, onglet Banques', sacrifice: 'Paiements fournisseurs non urgents décalés d\'une semaine',
      testMethod: 'Fausse demande de virement envoyée à la comptabilité', testCriterion: 'Contre-appel fait avant toute exécution',
      tests: [{ date: ago(230), ok: true, note: 'Contre-appel fait en 10 min', by: 'Hélène R.' }],
    }),
    base('risk_demo_client', {
      processId: 'P2', title: 'Perte brutale du client n°1 (plus de 30 % du CA)', resource: 'Portefeuille clients', signal: 'Appel d\'offres lancé par le client, baisse des commandes sur 2 mois',
      maxOutage: '3 mois', owner: 'Laurent B.', gravity: 4, likelihood: 2,
      cause: 'Dépendance historique sans réserve de devis relançables',
      family: 'relais', planB: 'Relancer les 15 devis en sommeil (remise de 5 % contre acompte de 50 %) et prospecter 2 secteurs voisins', relay: 'Équipe commerciale', activation: 'sous 1 semaine',
      testMethod: 'Revue trimestrielle de la liste des devis relançables', testCriterion: 'Au moins 15 devis relançables à jour',
      tests: [],
      cost: { perDay: 1200, daysWithout: 90, daysWith: 45, planBCost: 0 },
    }),
    base('risk_demo_cnc', {
      processId: 'P3', title: 'Casse broche de la machine goulet CNC', resource: 'Centre d\'usinage CNC n°2', signal: 'Bruit anormal, vibrations, arrêt machine',
      maxOutage: '4 h', owner: 'David K.', deputy: 'Marc M.', gravity: 4, likelihood: 3,
      whys: ['La broche a cassé', 'Les roulements étaient usés', 'L\'usure n\'a pas été détectée', 'Aucun suivi vibratoire', 'Maintenance uniquement curative'],
      cause: 'Maintenance uniquement curative, sans suivi des vibrations',
      family: 'relais', planB: 'Déclencher l\'accord de réciprocité avec le confrère : envoi des programmes sous 4 h, usinage chez lui', relay: 'Confrère Usinage X (accord signé)', activation: 'sous 4 h',
      firstHour: 'Arrêter la machine et sécuriser la zone\nAppeler le confrère pour réserver un créneau\nEnvoyer les programmes FAO du dossier partagé\nPrévenir les 2 clients concernés du nouveau délai',
      contacts: 'Confrère Usinage X, chef d\'atelier : 06 00 00 00 04\nMaintenance constructeur : 04 00 00 00 05', access: 'Programmes FAO : dossier partagé « Secours CNC »', sacrifice: 'Petites séries du client C reportées d\'une semaine',
      testMethod: 'Envoi réel d\'un programme et usinage d\'une pièce chez le confrère', testCriterion: 'Pièce conforme reçue en moins de 48 h',
      tests: [{ date: ago(90), ok: false, note: 'Programme refusé : version de post-processeur différente', by: 'David K.' }],
      cost: { perDay: 2800, daysWithout: 15, daysWith: 2, planBCost: 900 },
    }),
    base('risk_demo_tole', {
      processId: 'P3', title: 'Rupture de tôle (matière critique)', resource: 'Fournisseur unique de tôle', signal: 'Retard de livraison annoncé, stock sous le seuil',
      maxOutage: '3 jours', owner: 'Sophie V.', gravity: 3, likelihood: 3,
      cause: 'Fournisseur unique, sans stock tampon ni compte de secours',
      family: 'stock', planB: 'Débloquer le stock de sécurité négocié chez le distributeur B (compte de secours ouvert)', relay: 'Distributeur B', activation: 'sous 24 h',
      testMethod: 'Commande test chez le distributeur B', testCriterion: 'Livraison en moins de 48 h',
      tests: [{ date: ago(200), ok: true, note: 'Livré en 36 h', by: 'Sophie V.' }],
      cost: { perDay: 1500, daysWithout: 8, daysWith: 1, planBCost: 0 },
    }),
    base('risk_demo_expert', {
      processId: 'P4', title: 'Absence du programmeur (compétence unique)', resource: 'Programmeur CN', signal: 'Arrêt maladie, départ',
      maxOutage: '1 jour', owner: 'Marc M.', gravity: 3, likelihood: 3,
      cause: 'Compétence non documentée, pas de doublure formée',
      family: 'doublure', planB: 'Prise de poste par le binôme formé, avec les fiches opératoires visuelles', relay: 'Binôme formé (Julien P.)', activation: 'immédiat',
      testMethod: 'Journée de programmation par le binôme seul', testCriterion: 'Programmes du jour livrés sans aide',
      tests: [],
    }),
    base('risk_demo_lot', {
      processId: 'P5', title: 'Lot non conforme livré à un grand compte', resource: 'Contrôle final', signal: 'Réclamation client, retour de pièces',
      maxOutage: '2 h', owner: 'Antoine P.', gravity: 3, likelihood: 2,
      cause: 'Gabarit de contrôle usé, non vérifié au changement de série',
      family: '', planB: '', relay: '', activation: '', tests: [],
    }),
  ];
  const action = (id: string, riskId: string, days: number, status: Action['status'], pilot: string, plan: Action['plan'], closedDays?: number): Action => ({
    id, kpiId: '', riskId, period: ago(days).slice(0, 7), createdAt: ago(days), constat: 'Préparer le Plan B', whys: ['', '', '', '', ''],
    plan, pilot, deadline: ago(days - 21), cost: null, status, closedAt: closedDays !== undefined ? ago(closedDays) : '',
  });
  const actions: Action[] = [
    action('act_demo_cyber', 'risk_demo_cyber', 120, 'effective', 'Thomas M.', [{ dim: 'materiel', text: 'Mettre en place une sauvegarde hors réseau testée', pilot: '' }, { dim: 'methode', text: 'Écrire la fiche réflexe (première heure) et la ranger au poste', pilot: '' }], 60),
    action('act_demo_cnc', 'risk_demo_cnc', 80, 'in_progress', 'David K.', [{ dim: 'materiel', text: 'Aligner la version du post-processeur avec le confrère', pilot: 'Marc M.' }, { dim: 'milieu', text: 'Refaire le test d\'usinage chez le confrère', pilot: '' }]),
    action('act_demo_client', 'risk_demo_client', 30, 'to_start', 'Laurent B.', [{ dim: 'methode', text: 'Tenir à jour la liste des devis relançables chaque trimestre', pilot: '' }]),
    action('act_demo_expert', 'risk_demo_expert', 60, 'done', 'Marc M.', [{ dim: 'main_oeuvre', text: 'Former le binôme et le faire pratiquer 1 journée', pilot: 'Julien P.' }, { dim: 'methode', text: 'Écrire les fiches opératoires visuelles', pilot: '' }], 10),
  ];
  return { risks: Object.fromEntries(risks.map(r => [r.id, r])), actions: Object.fromEntries(actions.map(a => [a.id, a])) };
}
