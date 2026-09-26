// Example records of tools 3.1 to 3.4, for the fictitious company of the demo (same suppliers, machines and people as the other tools).
import type { Debit, Delivery, Equipment, Inspection, Milestone, Sop, State, Supplier } from './types';
import { isoDate } from './periods';
import { DEFAULT_CHECKPOINTS, DEFAULT_MILESTONES } from './operations';

export function operationsExamples(today = new Date()) {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const y = today.getFullYear();
  const sup = (id: string, p: Partial<Supplier>): Supplier => ({ id, name: '', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [], ...p });
  const rating = (days: number, quality: number, delay: number, service: number, note = '') => ({ date: ago(days), quality, delay, service, by: 'Sophie V.', note });
  const suppliers: Supplier[] = [
    sup('sup_demo_acier', { name: 'Aciers du Rhône', supplies: 'Tôle acier et inox', strategic: true, contact: 'Commercial sédentaire · 04 00 00 00 24', contactId: 'ct_demo_acier', certRequired: true, ratings: [rating(300, 34, 32, 16, 'Retards ponctuels en été')],
      receipts: [{ id: 'rc_demo_1', date: ago(60), promised: ago(62), received: ago(60), certOk: true, note: '' }, { id: 'rc_demo_2', date: ago(26), promised: ago(26), received: ago(26), certOk: false, note: 'Certificat demandé' }] }),
    sup('sup_demo_distrib', { name: 'Distributeur B', supplies: 'Tôle, compte de secours', contact: 'Service clients · 04 00 00 00 06', ratings: [rating(200, 38, 36, 16)] }),
    sup('sup_demo_usinage', { name: 'Confrère Usinage X', category: 'soustraitance', supplies: 'Usinage de précision', contact: "Chef d'atelier · 06 00 00 00 04", ratings: [rating(400, 31, 22, 14, 'Délais non tenus sur 3 commandes')] }),
    sup('sup_demo_transport', { name: 'Transports Rapides', category: 'logistique', supplies: 'Transport express', contact: 'Exploitation · 04 00 00 00 25', ratings: [rating(100, 35, 24, 12)] }),
    sup('sup_demo_peinture', { name: 'Thermolaquage Sud', category: 'soustraitance', supplies: 'Peinture poudre', strategic: true }),
  ];
  const deb = (n: number, p: Partial<Debit>): Debit => ({
    id: `deb_demo_${n}`, ref: `DEB-${y}-${String(n).padStart(3, '0')}`, supplierId: '', date: ago(10), bl: '', reserveOnBl: true, defect: '',
    reworkHours: null, otherCost: null, sentAt: '', answer: '', recovered: null, recoveredAt: '', ...p,
  });
  const debits: Debit[] = [
    deb(1, { supplierId: 'sup_demo_usinage', date: ago(45), bl: 'BL 7710', defect: 'Taraudage raté sur une série de 30 pièces', reworkHours: 12, otherCost: 590, sentAt: ago(44), answer: 'accepted', recovered: 1250, recoveredAt: ago(20) }),
    deb(2, { supplierId: 'sup_demo_transport', date: ago(30), bl: 'Récépissé 55812', defect: 'Colis éventré, 3 composants endommagés', reworkHours: 1, otherCost: 620, sentAt: ago(29), answer: 'accepted' }),
    deb(3, { supplierId: 'sup_demo_acier', date: ago(26), bl: 'BL 884', reserveOnBl: false, defect: 'Tôles inox rayées au déballage, film de protection absent', reworkHours: 1.5, otherCost: 60, sentAt: ago(23), ncId: 'nc_demo_4' }),
    deb(4, { supplierId: 'sup_demo_peinture', date: ago(4), bl: 'BL 3021', defect: 'Épaisseur de peinture insuffisante sur 12 pièces (62 microns pour 80)', reworkHours: 3 }),
  ];
  const sops: Sop[] = [
    {
      id: 'sop_demo_1', processId: 'P3', poste: 'Montage armoires', operation: 'Raccordement des connecteurs du faisceau', version: 2, versionDate: ago(33),
      history: [{ v: 1, date: ago(200), reason: 'Création avec la monteuse la plus expérimentée' }, { v: 2, date: ago(33), reason: 'Ajout du détrompeur du connecteur droit (atelier 5P)' }],
      author: 'Lucie B.', validatedBy: 'David K.',
      steps: [
        { op: 'Contrôle visuel des composants', how: 'Vérifier qu\'il n\'y a ni choc, ni bavure, ni rayure sur le corps', watch: 'Pièces conformes au plan', check: 'Visuel à 100 %', photo: '' },
        { op: 'Positionnement et encliquetage', how: 'Insérer le connecteur dans le sens de l\'ergot jusqu\'au clic', watch: 'Le connecteur droit a un ergot : il ne rentre qu\'à droite', check: 'Clic entendu', photo: '' },
        { op: 'Serrage au couple', how: 'Serrer les 4 vis à 2,5 Nm avec la clé dynamométrique étalonnée', watch: 'Ne jamais forcer à la main', check: 'Déclenchement de la clé', photo: '' },
        { op: 'Étiquette de série', how: 'Coller l\'étiquette centrée à 10 mm du bord inférieur', watch: 'Le code doit rester lisible', check: 'Test du scan', photo: '' },
      ],
      good: 'Dénuder avec la butée de calibrage : 12 mm, aucun brin coupé, gaine thermo centrée.', trap: 'Dénuder à la pince universelle sans butée : longueur au hasard, brins coupés, court-circuit au test final.',
      goodPhoto: '', trapPhoto: '', ppe: ['Lunettes de sécurité', 'Chaussures de sécurité', 'Gants anti-coupure'],
      habilitations: [{ person: 'Lucie B.', tutor: 'David K.', date: ago(180) }, { person: 'Nicolas R.', tutor: 'Lucie B.', date: ago(20) }],
      skillId: 'sk_demo_4', displayedAt: ago(31), acks: [{ person: 'Lucie B.', v: 2, date: ago(32) }],
    },
    {
      id: 'sop_demo_2', processId: 'P3', poste: 'Presse plieuse', operation: 'Pliage des équerres de fixation', version: 1, versionDate: ago(90), history: [{ v: 1, date: ago(90), reason: 'Création' }],
      author: 'Karim T.', validatedBy: '',
      steps: [
        { op: 'Choix de l\'outil', how: 'Poinçon 88° et matrice V16 pour la tôle de 3 mm', watch: 'Vérifier le marquage de l\'outil', check: 'Référence lue', photo: '' },
        { op: 'Première pièce', how: 'Plier une pièce et mesurer l\'angle au rapporteur', watch: 'Le retour élastique change d\'une coulée à l\'autre', check: 'Angle 90° ± 0,5°', photo: '' },
        { op: 'Série', how: 'Contrôler une pièce sur 10 au gabarit', watch: 'Arrêter dès qu\'une pièce sort du gabarit', check: 'Gabarit passe', photo: '' },
      ],
      good: 'Mesurer la première pièce de chaque lot de tôle.', trap: 'Garder le réglage de la veille avec un nouveau lot de tôle.', goodPhoto: '', trapPhoto: '',
      ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], habilitations: [],
    },
  ];
  const weekly = (weeks: number[], ko: Record<number, number[]> = {}): Inspection[] => weeks.map(w => ({
    date: ago(w * 7 + 2), by: 'Julien P.', note: ko[w] ? 'Anomalie signalée au chef d\'atelier' : '',
    results: DEFAULT_CHECKPOINTS.map((_, i) => (ko[w]?.includes(i) ? 'ko' : 'ok')),
  }));
  const equipments: Equipment[] = [
    {
      id: 'eq_demo_cnc', name: 'Centre d\'usinage CNC 5 axes', location: 'Atelier principal', operator: 'Julien P.', manager: 'David K.', riskId: 'risk_demo_cnc',
      checkpoints: DEFAULT_CHECKPOINTS.map(c => ({ ...c })), inspections: weekly([0, 1, 2, 3, 4, 6, 7, 8, 9, 10], { 0: [1] }),
      parts: [
        { name: 'Courroie crantée axe Z', ref: 'CR-8840-HD', supplier: 'Constructeur', leadTime: '3 semaines', min: 2, stock: 2 },
        { name: 'Électrovanne pneumatique', ref: 'EV-24V', supplier: 'Constructeur', leadTime: '10 jours', min: 1, stock: 0 },
        { name: 'Jeu de joints racleurs', ref: 'JR-5520', supplier: 'Constructeur', leadTime: '2 semaines', min: 2, stock: 2 },
      ],
      tasks: [
        { id: 'tk_demo_1', label: 'Vérification périodique des installations électriques', everyDays: 365, lastDone: ago(372), legal: true },
        { id: 'tk_demo_2', label: 'Vidange et graissage de la broche', everyDays: 90, lastDone: ago(40), legal: false },
      ],
      breakdowns: [{ id: 'bd_demo_1', date: ago(120), hours: 16, cost: 2400, cause: 'Courroie de l\'axe Z cassée' }],
      anomalies: [{ id: 'an_demo_cnc', label: 'Pression pneumatique', date: ago(2), note: 'Manomètre à 5,8 bars', closedAt: '' }],
      contactId: 'ct_demo_maint', manual: 'Armoire du bureau d\'atelier, classeur bleu', lastRevision: ago(300),
    },
    {
      id: 'eq_demo_plieuse', name: 'Presse plieuse 300 t', location: 'Atelier tôlerie', operator: 'Karim T.', manager: 'David K.', riskId: '',
      checkpoints: [
        { label: 'Niveau d\'huile hydraulique', criterion: 'Entre le mini et le maxi' }, { label: 'Fuites sur les vérins', criterion: 'Aucun suintement' },
        { label: 'Barrières immatérielles', criterion: 'Arrêt immédiat quand la main passe' }, { label: 'Bruit de la pompe', criterion: 'Régulier, sans claquement' },
      ],
      inspections: [{ date: ago(20), by: 'Karim T.', results: ['ok', 'ok', 'ok', 'ok'], note: '' }, { date: ago(27), by: 'Karim T.', results: ['ok', 'ok', 'ok', 'ok'], note: '' }],
      parts: [{ name: 'Kit de joints hydrauliques', ref: 'KJ-300', supplier: 'Constructeur', leadTime: '1 semaine', min: 1, stock: 1 }],
      tasks: [{ id: 'tk_demo_3', label: 'Vérification générale périodique des appareils de levage', everyDays: 182, lastDone: ago(150), legal: true }],
    },
  ];
  const ms = (oks: (boolean | null)[], measured: string[] = []): Milestone[] => DEFAULT_MILESTONES.map((m, i) => ({ ...m, measured: measured[i] || '', ok: oks[i] ?? null, by: oks[i] === null ? '' : 'David K.', date: oks[i] === null ? '' : ago(6) }));
  const reception = (p: Partial<Delivery['reception']> = {}): Delivery['reception'] => ({ date: '', name: '', role: '', result: '', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...p });
  const dl = (id: string, p: Partial<Delivery>): Delivery => ({ id, ref: '', client: '', item: '', qty: null, milestones: ms([]), releasedBy: '', releasedAt: '', reception: reception(), ...p });
  const deliveries: Delivery[] = [
    dl('dl_demo_1', { ref: `CMD-${y}-041`, client: 'Client A', item: 'Châssis mécano-soudés peints', qty: 150, milestones: ms([true, true, true, true], ['1 245,2 mm', 'Cordons conformes', '88 microns', 'Complet']), releasedBy: 'David K.', releasedAt: ago(41), reception: reception({ date: ago(40), name: 'M. Durand', role: 'Acheteur', result: 'sans', amount: 35000 }) }),
    dl('dl_demo_2', { ref: `CMD-${y}-052`, client: 'Client C', item: 'Caissons de rangement', qty: 12, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(4), reception: reception({ date: ago(3), name: 'Responsable appro', role: 'Réceptionnaire', result: 'reserve', reserve: 'Une poignée mal vissée sur un caisson', retentionPct: 5, amount: 9600 }) }),
    dl('dl_demo_3', { ref: `CMD-${y}-047`, client: 'BâtiPro', item: 'Escalier d\'atelier', qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'Marc M.', releasedAt: ago(13), reception: reception({ date: ago(12), name: 'Mme Lopez', role: 'Conductrice de travaux', result: 'reserve', reserve: 'Retouche de peinture sur 2 marches', retentionPct: 10, amount: 14000 }) }),
    dl('dl_demo_4', { ref: `CMD-${y}-058`, client: 'Client B', item: 'Portillons de remplacement', qty: 4, milestones: ms([true, true, false, null], ['', '', '62 microns']) }),
    dl('dl_demo_5', { ref: `CMD-${y}-060`, client: 'Client A', item: 'Supports moteur', qty: 400, milestones: ms([true, true, null, null]) }),
    dl('dl_demo_6', { ref: `CMD-${y}-055`, client: 'Agencement Morel', item: 'Rampe d\'atelier', qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(4) }),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { suppliers: byId(suppliers), debits: byId(debits), sops: byId(sops), equipments: byId(equipments), deliveries: byId(deliveries) };
}

export function applyOperationsExample(d: State, today = new Date()) {
  Object.values(d.actions).filter(a => a.ref?.kind === 'equipment' || a.ref?.kind === 'supplier').forEach(a => { delete d.actions[a.id]; });
  Object.assign(d, operationsExamples(today));
}
