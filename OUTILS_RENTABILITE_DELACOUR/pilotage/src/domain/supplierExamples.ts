// Fictitious suppliers and claims of tool 3.1 for the demo company, from every trade: office supplies, IT services, cleaning, catering,
// transport, accounting advice and a few industrial suppliers. Fourteen suppliers rated on the grid of criteria (price included), eight purchasing
// sectors (a ready backup, a backup never tried, a better-rated backup, a supplier alone, a backup in service), 28 claims over 14 months in every
// state, a defect that comes back, and the people of the suppliers in the directory (1.3).
// Dates are relative to today: the same day always gives the same records.
import type { Contact, Debit, Org, Params, Sector, State, Supplier, SupplierRating } from './types';
import { isoDate } from './periods';
import { orgOf } from './contacts';
import { DEFAULT_ITEMS } from './suppliers';
import { exampleContacts, exampleOrgs } from './riskTemplates';

const pad = (n: number) => String(n).padStart(3, '0');

// The organisations and people of the suppliers that the directory of the demo company does not hold yet
export function supplierDirectory(today = new Date()): { orgs: Org[]; contacts: Contact[] } {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const org = (id: string, name: string, category: Org['category'], phone: string, address: string, reference = '', email = ''): Org => ({ id: `org_demo_${id}`, name, category, phone, address, reference, email });
  const person = (id: string, category: Contact['category'], company: string, name: string, role: string, phone: string, email: string, p: Partial<Contact> = {}): Contact =>
    ({ id: `ct_demo_${id}`, category, company, name, role, phone, email, always: false, verifiedAt: ago(40), verifiedBy: 'Sophie V.', ...p });
  return {
    orgs: [
      org('distrib', 'Distributeur B', 'fournisseur', '04 00 00 02 21', '40 rue du Négoce, 69007 Lyon', 'Compte secours n° S-88'),
      org('usinage', 'Confrère Usinage X', 'prestataire', '04 00 00 02 22', 'Zone artisanale des Combes, 69580 Sathonay', 'Accord de réciprocité 2025'),
      org('transport', 'Transports Rapides', 'fournisseur', '04 00 00 02 23', '2 chemin de la Gare, 69960 Corbas', 'Contrat express n° T-3010'),
      org('messagerie', 'Messagerie Alpine', 'fournisseur', '04 00 00 02 27', '31 avenue du Vercors, 38000 Grenoble', 'Contrat messagerie n° M-77', 'exploitation@messagerie-alpine.example.com'),
      org('it', 'Prestataire IT', 'prestataire', '04 00 00 02 28', '7 rue de la République, 69002 Lyon', 'Contrat d\'intervention n° IT-204'),
      org('expert', 'Cabinet Comptable', 'conseil', '04 00 00 02 29', '12 place Bellecour, 69002 Lyon', 'Dossier n° 5512'),
      org('bureau', 'Bureau Plus', 'fournisseur', '04 00 00 02 30', '25 avenue Jean Jaurès, 69007 Lyon', 'Compte client BP-3381', 'commandes@bureau-plus.example.com'),
      org('papeterie', 'Papeterie Centrale', 'fournisseur', '04 00 00 02 31', '3 rue des Imprimeurs, 69003 Lyon', 'Client n° 9027', 'contact@papeterie-centrale.example.com'),
      org('reseaux', 'Assistance Réseaux 69', 'prestataire', '04 00 00 02 32', '18 rue Garibaldi, 69006 Lyon', '', 'support@reseaux69.example.com'),
      org('proprete', 'Propreté Services', 'prestataire', '04 00 00 02 33', '5 rue de la Gare, 69100 Villeurbanne', 'Contrat nettoyage n° N-14', 'planning@proprete-services.example.com'),
      org('net', 'Net & Co Entretien', 'prestataire', '04 00 00 02 34', '22 cours Gambetta, 69003 Lyon', '', 'contact@netco.example.com'),
      org('traiteur', 'Traiteur Gourmand', 'prestataire', '04 00 00 02 35', '9 rue Mercière, 69002 Lyon', 'Client n° 612', 'evenements@traiteur-gourmand.example.com'),
      org('cuisine', 'Cuisine Nomade', 'prestataire', '04 00 00 02 36', '14 quai Saint-Antoine, 69002 Lyon', '', 'contact@cuisine-nomade.example.com'),
    ],
    contacts: [
      person('messagerie', 'fournisseur', 'Messagerie Alpine', 'Exploitation', 'Enlèvements et suivi des colis', '04 00 00 03 05', 'exploitation@messagerie-alpine.example.com', { hours: 'lun-ven 6 h-19 h' }),
      person('bureau', 'fournisseur', 'Bureau Plus', 'Service commandes', 'Commandes, livraisons et avoirs', '04 00 00 03 11', 'commandes@bureau-plus.example.com', { hours: 'lun-ven 8 h-18 h' }),
      person('papeterie', 'fournisseur', 'Papeterie Centrale', 'Commercial', 'Devis et livraisons', '04 00 00 03 12', 'contact@papeterie-centrale.example.com'),
      person('reseaux', 'prestataire', 'Assistance Réseaux 69', 'Support', 'Dépannage réseau et téléphonie', '04 00 00 03 13', 'support@reseaux69.example.com', { hours: 'lun-ven 8 h-19 h' }),
      person('proprete', 'prestataire', 'Propreté Services', 'Responsable de secteur', 'Planning des passages', '04 00 00 03 14', 'planning@proprete-services.example.com'),
      person('net', 'prestataire', 'Net & Co Entretien', 'Gérante', 'Devis et interventions', '06 00 00 03 15', 'contact@netco.example.com'),
      person('traiteur', 'prestataire', 'Traiteur Gourmand', 'Chargée d\'événements', 'Menus, horaires et livraisons', '04 00 00 03 16', 'evenements@traiteur-gourmand.example.com'),
      person('cuisine', 'prestataire', 'Cuisine Nomade', 'Responsable commercial', 'Menus et devis', '06 00 00 03 17', 'contact@cuisine-nomade.example.com'),
    ],
  };
}

// What the first generations of the example gave and the current one does not: removed from a saved fictitious company, once
const RETIRED = {
  suppliers: ['sup_demo_peinture', 'sup_demo_peinture2', 'sup_demo_visserie'], sectors: ['sec_demo_peinture', 'sec_demo_visserie'],
  orgs: ['org_demo_peinture', 'org_demo_peinture2', 'org_demo_visserie'], contacts: ['ct_demo_peinture', 'ct_demo_peinture_dir', 'ct_demo_peinture2', 'ct_demo_visserie'],
};

export function supplierExamples(today = new Date()): { suppliers: Record<string, Supplier>; debits: Record<string, Debit>; sectors: Record<string, Sector> } {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const ahead = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
  const y = today.getFullYear();
  // ratings of the older version (three fixed criteria) and of the grid with price: each criterion noted out of 10, weighted 35, 25, 20 and 20
  const old = (days: number, quality: number, delay: number | null, service: number, note = '', p: Partial<SupplierRating> = {}): SupplierRating => ({ date: ago(days), quality, delay, service, by: 'Sophie V.', note, ...p });
  const GRID = [['quality', 'Qualité', 35], ['delay', 'Délais', 25], ['service', 'Service', 20], ['price', 'Prix', 20]] as const;
  type Detail = Partial<Record<(typeof GRID)[number][0], { items?: (number | null)[]; comment?: string }>>;
  const rate = (days: number, notes: [number | null, number | null, number | null, number | null], note = '', p: Partial<SupplierRating> = {}, detail: Detail = {}): SupplierRating => ({
    date: ago(days), by: 'Sophie V.', note,
    scores: GRID.map(([key, label, weight], i) => ({
      key, label, points: notes[i], max: 10, weight, comment: detail[key]?.comment,
      items: detail[key]?.items ? DEFAULT_ITEMS[key].map((d, j) => ({ key: d.key, label: d.label, points: detail[key]!.items![j] ?? null })) : undefined,
    })),
    ...p,
  });
  const sup = (id: string, p: Partial<Supplier>): Supplier => ({ id, name: '', category: 'service', supplies: '', strategic: false, contact: '', ratings: [], ...p });
  const rc = (n: number, daysAgo: number, lateDays = 0, note = '') => ({ id: `rc_demo_${n}`, date: ago(daysAgo), promised: ago(daysAgo + lateDays), received: ago(daysAgo), note });
  const suppliers: Supplier[] = [
    sup('sup_demo_bureau', {
      name: 'Bureau Plus', category: 'matiere', supplies: 'Fournitures de bureau et consommables', contactId: 'ct_demo_bureau', orgId: 'org_demo_bureau', sectorIds: ['sec_demo_bureau'],
      ratings: [rate(120, [9.4, 9.6, 9.5, 7], 'Fiable, prix dans la moyenne', { decision: 'keep', strengths: 'Commandes complètes et bon suivi des livraisons', improvements: 'Prévenir quand un article est en rupture' }, { quality: { items: [9, 10, 9, 9.5], comment: 'Un carton manquant en juin, avoir reçu sans discussion' }, price: { items: [7, 8, 6, 7], comment: 'Tarifs stables, un peu plus cher que Papeterie Centrale' } })], receipts: [rc(1, 100), rc(2, 60), rc(3, 20)],
    }),
    sup('sup_demo_papeterie', {
      name: 'Papeterie Centrale', category: 'matiere', supplies: 'Papier, enveloppes et imprimés', contactId: 'ct_demo_papeterie', orgId: 'org_demo_papeterie', sectorIds: ['sec_demo_bureau'],
      ratings: [rate(150, [7.7, 7.6, 7.5, 9], 'Moins cher, un peu moins régulier', { decision: 'keep' })], receipts: [rc(4, 90), rc(5, 30, 3, 'Livraison un jour plus tard que promis')],
    }),
    sup('sup_demo_it', {
      name: 'Prestataire IT', supplies: 'Assistance informatique et sauvegardes', strategic: true, contactId: 'ct_demo_it', orgId: 'org_demo_it', sectorIds: ['sec_demo_it'],
      ratings: [rate(250, [7.4, 7.2, 7, 6.5], 'Bon technicien, délais d\'intervention à surveiller', { decision: 'keep', strengths: 'Technicien compétent, qui explique ce qu\'il fait', improvements: "Tenir les délais d'intervention et tester les sauvegardes" }, { quality: { items: [7, 8, 7, 7.5], comment: 'Sauvegarde non testée en mars' }, delay: { comment: 'Deux interventions reportées sur le semestre' } })], receipts: [rc(6, 140), rc(7, 70, 2, 'Intervention reportée de deux jours'), rc(8, 22)],
    }),
    sup('sup_demo_reseaux', {
      name: 'Assistance Réseaux 69', supplies: 'Réseau, wifi et téléphonie', contactId: 'ct_demo_reseaux', orgId: 'org_demo_reseaux', sectorIds: ['sec_demo_it'], status: 'qualify',
    }),
    sup('sup_demo_proprete', {
      name: 'Propreté Services', supplies: 'Nettoyage des locaux', contactId: 'ct_demo_proprete', orgId: 'org_demo_proprete', sectorIds: ['sec_demo_proprete'],
      ratings: [rate(200, [4.3, 4.8, 5, 8.5], 'Prix bas, mais prestation irrégulière', { decision: 'watch', decisionNote: 'Voir si les passages se régularisent' })], status: 'watch',
      receipts: [rc(9, 80, 2, 'Passage décalé de deux jours'), rc(10, 38, 1)],
    }),
    sup('sup_demo_net', {
      name: 'Net & Co Entretien', supplies: 'Nettoyage et entretien des locaux', contactId: 'ct_demo_net', orgId: 'org_demo_net', sectorIds: ['sec_demo_proprete'],
      ratings: [rate(90, [7.4, 7.6, 7, 8], 'Retenu comme secours, jamais encore sollicité', { decision: 'second' })],
    }),
    sup('sup_demo_traiteur', {
      name: 'Traiteur Gourmand', supplies: 'Repas et événements', contactId: 'ct_demo_traiteur', orgId: 'org_demo_traiteur', sectorIds: ['sec_demo_traiteur'],
      ratings: [rate(100, [9.4, 8.8, 9, 7], 'Très bon, un peu plus cher', { decision: 'keep' })], receipts: [rc(11, 85), rc(12, 40)],
    }),
    sup('sup_demo_cuisine', {
      name: 'Cuisine Nomade', supplies: 'Repas et événements', contactId: 'ct_demo_cuisine', orgId: 'org_demo_cuisine', sectorIds: ['sec_demo_traiteur'],
      ratings: [rate(60, [8.6, 8, 8, 8], 'Bonne alternative, prix comparables', { decision: 'keep' })], receipts: [rc(13, 45)],
    }),
    sup('sup_demo_expert', {
      name: 'Cabinet Comptable', supplies: 'Expertise comptable et paie', strategic: true, contactId: 'ct_demo_expert', orgId: 'org_demo_expert', sectorIds: ['sec_demo_conseil'],
      ratings: [rate(220, [8.6, 8.8, 9, 6], 'Sérieux, honoraires dans le haut de la fourchette', { decision: 'keep' })],
    }),
    sup('sup_demo_acier', {
      name: 'Aciers du Rhône', category: 'matiere', supplies: 'Tôle acier et inox', strategic: true, contact: 'Commercial sédentaire · 04 00 00 00 24', contactId: 'ct_demo_acier', orgId: 'org_demo_acier', sectorIds: ['sec_demo_tole'],
      ratings: [old(300, 34, 32, 16, 'Retards ponctuels en été', { decision: 'keep' }), old(665, 38, 36, 17)],
      receipts: [rc(14, 60, 2), rc(15, 26, 0)],
    }),
    sup('sup_demo_distrib', {
      name: 'Distributeur B', category: 'matiere', supplies: 'Tôle, compte de secours', contact: 'Service clients · 04 00 00 00 06', contactId: 'ct_demo_distrib', orgId: 'org_demo_distrib', sectorIds: ['sec_demo_tole'],
      ratings: [old(200, 38, 36, 16, '', { decision: 'keep' })], receipts: [rc(16, 90), rc(17, 45), rc(18, 12, 2, 'Livraison partielle')],
    }),
    sup('sup_demo_usinage', {
      name: 'Confrère Usinage X', supplies: 'Usinage de précision', contact: "Chef d'atelier · 06 00 00 00 04", contactId: 'ct_demo_confrere', orgId: 'org_demo_usinage', sectorIds: ['sec_demo_usinage'], status: 'watch',
      ratings: [old(400, 31, 22, 14, 'Délais non tenus sur 3 commandes', { decision: 'watch', decisionNote: 'Réévaluer après deux livraisons à l\'heure' })],
    }),
    sup('sup_demo_transport', {
      name: 'Transports Rapides', supplies: 'Transport express', contact: 'Exploitation · 04 00 00 00 25', contactId: 'ct_demo_transport', orgId: 'org_demo_transport', sectorIds: ['sec_demo_transport'],
      ratings: [old(100, 35, 24, 12, '', { decision: 'keep' })], receipts: [rc(19, 70), rc(20, 25)],
    }),
    sup('sup_demo_messagerie', {
      name: 'Messagerie Alpine', supplies: 'Transport express et messagerie', contactId: 'ct_demo_messagerie', orgId: 'org_demo_messagerie', sectorIds: ['sec_demo_transport'],
      ratings: [old(80, 34, 36, 16, '', { decision: 'keep' })], receipts: [rc(21, 50), rc(22, 18)],
    }),
  ];

  // days: days since the reception; send, reply, credit, close: days since the reception when it happened
  type C = Partial<Debit> & { send?: number; reply?: number; credit?: number; close?: number };
  const claim = (n: number, supplierId: string, days: number, { send, reply, credit, close, ...p }: C): Debit => ({
    id: `deb_demo_${n}`, ref: `DEB-${n <= 4 ? y : ago(days).slice(0, 4)}-${pad(n)}`, supplierId, date: ago(days), bl: '', reserveOnBl: true, defect: '', reworkHours: null, otherCost: null,
    sentAt: send === undefined ? '' : ago(days - send), answer: '', recovered: null, recoveredAt: credit === undefined ? '' : ago(days - credit),
    answeredAt: send !== undefined && reply !== undefined ? ago(days - send - reply) : '', closedAt: close === undefined ? '' : ago(days - close), ...p,
  });
  const debits: Debit[] = [
    claim(1, 'sup_demo_usinage', 45, { bl: 'BL 7710', motif: 'produit', severity: 'major', defect: 'Taraudage raté sur une série de 30 pièces', lot: 'Lot de 30 pièces', reworkHours: 12, otherCost: 590, send: 1, reply: 4, credit: 25, answer: 'accepted', recovered: 1250, contactId: 'ct_demo_confrere', sentVia: 'mail', solution: 'avoir', cause: 'Taraud usé, non remplacé en cours de série', supplierAction: 'Changement du taraud toutes les 10 pièces', actionCheckedAt: ago(15), actionOk: true }),
    claim(2, 'sup_demo_transport', 30, { bl: 'Récépissé 55812', motif: 'transport', severity: 'major', defect: 'Colis éventré, 3 composants endommagés', reworkHours: 1, otherCost: 620, send: 1, reply: 5, answer: 'accepted', contactId: 'ct_demo_transport', sentVia: 'mail', solution: 'avoir' }),
    claim(3, 'sup_demo_acier', 26, { bl: 'BL 884', reserveOnBl: false, motif: 'produit', severity: 'major', defect: 'Tôles inox rayées au déballage, film de protection absent', reworkHours: 1.5, otherCost: 60, send: 3, ncId: 'nc_demo_4', contactId: 'ct_demo_acier', sentVia: 'mail' }),
    // cleaning: a defect that comes back, then a service that is no longer reliable
    claim(4, 'sup_demo_proprete', 4, { bl: 'Bon de passage du lundi', motif: 'produit', severity: 'major', defect: 'Sanitaires et salle de réunion non nettoyés lors du passage', reworkHours: 2, contactId: 'ct_demo_proprete' }),
    claim(5, 'sup_demo_proprete', 60, { bl: 'Bon de passage du mardi', motif: 'produit', severity: 'major', defect: "Sols de l'accueil non lavés, produit absent", reworkHours: 2, send: 1, reply: 3, close: 14, answer: 'accepted', contactId: 'ct_demo_proprete', sentVia: 'mail', solution: 'geste', answerNote: 'Un passage offert', closedReason: 'resolved' }),
    claim(6, 'sup_demo_proprete', 110, { bl: 'Bon de passage du jeudi', motif: 'produit', severity: 'major', defect: 'Poubelles non vidées pendant une semaine', send: 2, reply: 6, close: 20, answer: 'partial', contactId: 'ct_demo_proprete', sentVia: 'courrier', solution: 'geste', answerNote: 'Remise de 10 % sur la facture du mois', closedReason: 'resolved' }),
    claim(7, 'sup_demo_proprete', 35, { motif: 'retard', severity: 'minor', defect: 'Passage décalé de deux jours sans prévenir', send: 1, reply: 2, close: 8, answer: 'accepted', contactId: 'ct_demo_proprete', sentVia: 'tel', solution: 'rien', closedReason: 'nofollow' }),
    claim(8, 'sup_demo_proprete', 15, { motif: 'relation', severity: 'minor', defect: 'Aucune réponse du responsable à notre demande de rendez-vous', send: 1, contactId: 'ct_demo_proprete', sentVia: 'mail' }),
    // catering
    claim(9, 'sup_demo_traiteur', 50, { bl: 'Bon de livraison 4471', motif: 'retard', severity: 'major', defect: 'Repas du séminaire livrés 40 minutes après l\'heure prévue', reworkHours: 2, otherCost: 120, send: 1, reply: 3, credit: 20, answer: 'accepted', recovered: 120, contactId: 'ct_demo_traiteur', sentVia: 'mail', solution: 'avoir' }),
    claim(10, 'sup_demo_traiteur', 1, { bl: 'Bon de livraison 4602', reserveOnBl: false, motif: 'produit', severity: 'minor', defect: 'Menu végétarien non respecté pour 3 convives', contactId: 'ct_demo_traiteur' }),
    // IT services
    claim(11, 'sup_demo_it', 24, { bl: 'Facture 2026-0418', motif: 'quantite', severity: 'major', defect: 'Facture de maintenance émise deux fois', otherCost: 480, send: 1, contactId: 'ct_demo_it', sentVia: 'mail' }),
    claim(12, 'sup_demo_it', 70, { motif: 'retard', severity: 'major', defect: 'Dépannage réalisé avec deux jours de retard, un poste est resté inutilisable', reworkHours: 6, send: 1, reply: 2, close: 12, answer: 'accepted', contactId: 'ct_demo_it', sentVia: 'mail', solution: 'geste', closedReason: 'resolved' }),
    claim(13, 'sup_demo_it', 12, { bl: 'Intervention du jeudi', motif: 'produit', severity: 'major', defect: "Pare-feu mal configuré après l'intervention : l'accès distant est bloqué", reworkHours: 3, send: 1, reply: 4, answer: 'contested', answerNote: 'Le prestataire estime la configuration conforme au cahier des charges', contactId: 'ct_demo_itboss', sentVia: 'mail' }),
    claim(14, 'sup_demo_it', 130, { motif: 'produit', severity: 'major', defect: "Sauvegarde non vérifiée : la restauration d'essai a échoué", reworkHours: 4, send: 1, reply: 3, close: 25, answer: 'accepted', contactId: 'ct_demo_it', sentVia: 'mail', solution: 'reprise', cause: 'Sauvegarde jamais testée par le prestataire', supplierAction: 'Test de restauration chaque mois, compte rendu envoyé', closedReason: 'resolved' }),
    // accounting advice
    claim(15, 'sup_demo_expert', 40, { motif: 'retard', severity: 'major', defect: "Déclaration de TVA transmise la veille de l'échéance", send: 1, reply: 3, close: 9, answer: 'accepted', contactId: 'ct_demo_expert', sentVia: 'mail', solution: 'autre', solutionNote: 'Rappel des échéances chaque mois', closedReason: 'resolved' }),
    // office supplies
    claim(16, 'sup_demo_bureau', 210, { bl: 'BL 66120', motif: 'transport', severity: 'major', defect: "Palette de papier abîmée par l'eau", otherCost: 150, send: 2, reply: 8, answer: 'refused', contactId: 'ct_demo_bureau', sentVia: 'courrier', answerNote: 'Le fournisseur renvoie vers le transporteur' }),
    claim(17, 'sup_demo_bureau', 90, { bl: 'BL 70411', motif: 'quantite', severity: 'minor', defect: 'Cartons de ramettes manquants (4 sur 10)', otherCost: 90, send: 1, reply: 2, credit: 18, answer: 'accepted', recovered: 90, contactId: 'ct_demo_bureau', sentVia: 'mail', solution: 'avoir' }),
    claim(18, 'sup_demo_bureau', 30, { bl: 'BL 72218', motif: 'retard', severity: 'minor', defect: 'Commande de consommables livrée avec cinq jours de retard', send: 1, reply: 1, close: 5, answer: 'accepted', contactId: 'ct_demo_bureau', sentVia: 'mail', solution: 'rien', closedReason: 'nofollow' }),
    claim(19, 'sup_demo_papeterie', 75, { bl: 'BL 9120', motif: 'produit', severity: 'minor', defect: 'Enveloppes livrées au mauvais format', otherCost: 60, send: 1, reply: 3, credit: 14, answer: 'accepted', recovered: 60, contactId: 'ct_demo_papeterie', sentVia: 'mail', solution: 'avoir' }),
    // industrial suppliers
    claim(20, 'sup_demo_acier', 150, { bl: 'BL 640', motif: 'retard', severity: 'major', defect: 'Tôle livrée 5 jours après la date promise', send: 1, reply: 2, close: 10, answer: 'accepted', contactId: 'ct_demo_acier', sentVia: 'mail', solution: 'geste', answerNote: 'Remise de 3 % sur la commande suivante', closedReason: 'resolved' }),
    claim(21, 'sup_demo_acier', 260, { bl: 'BL 402', motif: 'documents', severity: 'minor', defect: 'Certificat matière absent sur le lot', reworkHours: 1, send: 1, reply: 2, close: 12, answer: 'accepted', contactId: 'ct_demo_acier', sentVia: 'mail', solution: 'autre', solutionNote: 'Certificat envoyé', cause: "Oubli à l'expédition", supplierAction: 'Certificat joint au bon de livraison à chaque envoi', actionCheckedAt: ago(200), actionOk: true, closedReason: 'resolved' }),
    claim(22, 'sup_demo_acier', 340, { bl: 'BL 177', motif: 'quantite', severity: 'minor', defect: '2 tôles manquantes sur 12', otherCost: 180, send: 1, reply: 3, credit: 20, answer: 'accepted', recovered: 180, contactId: 'ct_demo_acier', sentVia: 'tel', solution: 'avoir' }),
    claim(23, 'sup_demo_distrib', 120, { bl: 'BL 9005', motif: 'quantite', severity: 'minor', defect: 'Référence livrée différente de la commande', otherCost: 60, reworkHours: 1, send: 1, reply: 2, close: 12, answer: 'accepted', contactId: 'ct_demo_distrib', sentVia: 'mail', solution: 'remplacement', closedReason: 'resolved' }),
    claim(24, 'sup_demo_distrib', 60, { bl: 'BL 9231', motif: 'retard', severity: 'minor', defect: 'Livraison reportée de 3 jours', send: 1, reply: 1, close: 5, answer: 'accepted', contactId: 'ct_demo_distrib', sentVia: 'tel', solution: 'rien', closedReason: 'nofollow' }),
    claim(25, 'sup_demo_usinage', 180, { bl: 'BL 6220', motif: 'retard', severity: 'major', defect: 'Délai non tenu sur la commande 2210', send: 2, reply: 5, close: 15, answer: 'accepted', contactId: 'ct_demo_confrere', sentVia: 'mail', solution: 'geste', closedReason: 'resolved' }),
    claim(26, 'sup_demo_usinage', 250, { bl: 'BL 5410', motif: 'produit', severity: 'minor', defect: 'Ébavurage insuffisant sur des supports', reworkHours: 2, send: 1, reply: 3, credit: 22, answer: 'accepted', recovered: 110, contactId: 'ct_demo_confrere', sentVia: 'mail', solution: 'avoir' }),
    claim(27, 'sup_demo_transport', 8, { bl: 'Récépissé 56731', motif: 'transport', severity: 'minor', defect: 'Livraison déposée au mauvais service', reworkHours: 1, send: 1, contactId: 'ct_demo_transport', sentVia: 'mail' }),
    claim(28, 'sup_demo_transport', 290, { bl: 'Récépissé 51220', motif: 'transport', severity: 'minor', defect: 'Carton écrasé, un composant à remplacer', otherCost: 85, send: 1, reply: 3, credit: 18, answer: 'accepted', recovered: 85, contactId: 'ct_demo_transport', sentVia: 'mail', solution: 'avoir' }),
  ];

  const sec = (id: string, name: string, p: Partial<Sector> = {}): Sector => ({ id: `sec_demo_${id}`, name, order: [], ...p });
  const sectors: Sector[] = [
    sec('bureau', 'Fournitures de bureau et papeterie'),
    // the second supplier was retained as a backup and is not rated for the delays yet: the tool asks to try it
    sec('it', 'Informatique et assistance'),
    // the main supplier cannot answer for now, and the backup that takes over has never been tried
    sec('proprete', 'Nettoyage et entretien des locaux', { manual: true, order: ['sup_demo_proprete', 'sup_demo_net'], switches: [{ id: 'sw_demo_2', at: ago(3), fromId: 'sup_demo_proprete', toId: 'sup_demo_net', reason: 'capacite', reasonNote: '', expectedBack: ahead(6), backAt: '', by: 'Sophie V.' }] }),
    sec('traiteur', 'Restauration et événements'),
    // a single supplier nobody can replace at short notice: the company wrote what it does if the firm stops
    sec('conseil', 'Conseil comptable et juridique', { cover: 'unique', coverNote: 'Les pièces et les accès sont sauvegardés chez nous. Un autre cabinet peut reprendre le dossier sous trois semaines : le contacter dès que le cabinet annonce un arrêt, et prévenir la banque.' }),
    // the main supplier is the one the company chose, and a backup is rated higher: the tool asks whether to swap them
    sec('tole', 'Matières et composants', { manual: true, order: ['sup_demo_acier', 'sup_demo_distrib'], switches: [{ id: 'sw_demo_1', at: ago(130), fromId: 'sup_demo_acier', toId: 'sup_demo_distrib', reason: 'rupture', reasonNote: '', expectedBack: ago(120), backAt: ago(118), by: 'Sophie V.' }] }),
    sec('usinage', 'Sous-traitance'),
    sec('transport', 'Transport et livraison'),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { suppliers: byId(suppliers), debits: byId(debits), sectors: byId(sectors) };
}

// The names the sectors of the example had before they were made general (level 6)
const RENAMED: Record<string, string> = { sec_demo_tole: 'Tôle (acier, inox)', sec_demo_usinage: 'Usinage de précision' };

// A fictitious company saved before this version gets the suppliers, claims, sectors and directory cards of the current example, once:
// what the first generations gave and this one does not is removed, the example claims and sectors are given again, and a supplier or a field
// the company typed itself is kept. Everything the company created (other ids) is left alone.
export function completeSupplierExamples<T extends { suppliers: Record<string, Supplier>; debits: Record<string, Debit>; sectors: Record<string, Sector>; orgs: Record<string, Org>; contacts: Record<string, Contact>; params: Params }>(s: T, today = new Date()): T {
  const demo = Object.keys(s.suppliers).some(id => id.startsWith('sup_demo_')) || Object.keys(s.debits).some(id => id.startsWith('deb_demo_'));
  const level = s.params.supplierExampleLevel ?? 0;
  if (!demo || level >= 6) return s;
  // levels 4 and 5 already hold the current example: they only gain the choice of a sector without backup (level 4) and the general names of two sectors,
  // when the company did not rename them; what the company changed stays
  if (level >= 4) {
    const sectors = { ...s.sectors };
    Object.values(supplierExamples(today).sectors).forEach(sc => {
      const old = sectors[sc.id];
      if (!old) return;
      let next = old;
      if (level === 4 && sc.cover && old.cover === undefined && old.target === undefined) next = { ...next, cover: sc.cover, coverNote: sc.coverNote };
      if (RENAMED[sc.id] === old.name) next = { ...next, name: sc.name };
      sectors[sc.id] = next;
    });
    return { ...s, sectors, params: { ...s.params, supplierExampleLevel: 6 } };
  }
  const fresh = supplierExamples(today), dir = supplierDirectory(today);
  const fill = <X extends object>(old: X | undefined, n: X): X => (old ? (Object.fromEntries(Object.entries({ ...n, ...old }).map(([k, v]) => [k, (old as Record<string, unknown>)[k] === undefined ? (n as Record<string, unknown>)[k] : v])) as X) : n);
  const suppliers = { ...s.suppliers }, debits = { ...s.debits }, sectors = { ...s.sectors }, orgs = { ...s.orgs }, contacts = { ...s.contacts };
  RETIRED.suppliers.forEach(id => { delete suppliers[id]; });
  RETIRED.sectors.forEach(id => { delete sectors[id]; });
  RETIRED.orgs.forEach(id => { delete orgs[id]; });
  RETIRED.contacts.forEach(id => { delete contacts[id]; });
  Object.keys(debits).filter(id => id.startsWith('deb_demo_')).forEach(id => { delete debits[id]; });
  Object.values(fresh.suppliers).forEach(x => {
    const old = suppliers[x.id], merged = fill(old, x);
    // the ratings of the previous generation of the example (criteria without weight) are replaced by the current ones; the ratings the company made
    // stay, and a rating older than the oldest the company holds comes along (it shows the drop of class)
    if (old) {
      const kept = old.ratings.filter(r => !(r.scores && r.scores.every(sc => sc.weight === undefined))), dropped = old.ratings.length - kept.length;
      const oldest = kept.map(r => r.date).sort()[0] || '9999';
      merged.ratings = [...kept, ...x.ratings.filter(r => dropped > 0 || r.date < oldest)];
    }
    suppliers[x.id] = merged;
  });
  Object.values(fresh.debits).forEach(d => { debits[d.id] = d; });
  Object.values(fresh.sectors).forEach(sc => { sectors[sc.id] = sc; });
  dir.orgs.forEach(o => { if (!orgOf({ orgs }, o.name)) orgs[o.id] ||= o; });
  dir.contacts.forEach(c => { contacts[c.id] ||= c; });
  // a claim of the company on a supplier removed above has nowhere to go: those of the example are replaced, the company's own keep their name
  return { ...s, suppliers, debits, sectors, orgs, contacts, params: { ...s.params, supplierExampleLevel: 6 } };
}

// The button "Voir un exemple traité" of tool 3.1: the suppliers, claims, sectors, organisations and people above, in a company that has none of them yet
export function applySupplierExample(d: State, today = new Date()) {
  const ex = supplierExamples(today), dir = supplierDirectory(today);
  Object.values(ex.suppliers).forEach(x => { d.suppliers[x.id] ||= x; });
  Object.values(ex.debits).forEach(x => { d.debits[x.id] ||= x; });
  Object.values(ex.sectors).forEach(x => { d.sectors[x.id] ||= x; });
  [...exampleOrgs().filter(o => o.id === 'org_demo_acier'), ...dir.orgs].forEach(o => { if (!orgOf(d, o.name)) d.orgs[o.id] ||= o; });
  const own = ['ct_demo_acier', 'ct_demo_distrib', 'ct_demo_confrere', 'ct_demo_transport', 'ct_demo_it', 'ct_demo_itboss', 'ct_demo_expert'];
  [...exampleContacts(today).filter(c => own.includes(c.id)), ...dir.contacts].forEach(c => { d.contacts[c.id] ||= c; });
  d.params.supplierExampleLevel = 6;
}
