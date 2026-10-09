// Example records of tool 3.2 for the fictitious company of the demo (same people, machines and defects as the other tools): eight sheets that
// show every state of the tool, with small drawings instead of photos, and the plan of the workshop. Dates are relative to today.
import type { Nc, Params, Sop, SopStep } from './types';
import { isoDate } from './periods';
import { snapOf } from './instructions';

// ---- drawings (ASCII only: they are written in base 64 with btoa)
type V = 'ok' | 'ko' | 'limit' | 'plain';
const MARK: Record<V, string> = {
  ok: '<circle cx="352" cy="250" r="26" fill="#16a34a"/><path d="M340 250l9 10 17-20" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  ko: '<circle cx="352" cy="250" r="26" fill="#dc2626"/><path d="M341 239l22 22M363 239l-22 22" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
  limit: '<circle cx="352" cy="250" r="26" fill="#f59e0b"/><path d="M352 237v15M352 261v1" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
  plain: '',
};
const pic = (body: string, v: V = 'plain', w = 400, h = 300) => `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#eef2f1"/><rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#dbe3e1"/>${body}${MARK[v]}</svg>`)}`;
const ARROW = '<path d="M70 70l55 45" stroke="#16a34a" stroke-width="10" stroke-linecap="round"/><path d="M128 118l-26-4m26 4l-8-24" stroke="#16a34a" stroke-width="10" stroke-linecap="round"/>';
const SCENES = {
  wire: (v: V) => pic(`<rect x="20" y="130" width="190" height="44" rx="8" fill="#1f2937"/><rect x="170" y="124" width="36" height="56" rx="6" fill="#0f766e"/>${
    v === 'ko' ? '<path d="M206 140l46-10l8 12l26-8l6 16l-20 6l12 12l-32 2l-10-8l-22 8z" fill="#b45309"/><path d="M280 120l30-24" stroke="#dc2626" stroke-width="7" stroke-linecap="round"/>'
      : `<rect x="206" y="142" width="${v === 'limit' ? 104 : 80}" height="20" rx="3" fill="#b45309"/><path d="M206 190h${v === 'limit' ? 104 : 80}" stroke="#0f172a" stroke-width="3"/><text x="${v === 'limit' ? 236 : 222}" y="212" font-size="22" font-family="sans-serif" fill="#0f172a">${v === 'limit' ? '13 mm' : '12 mm'}</text>`}${v === 'ok' ? ARROW : ''}`, v),
  connector: (v: V) => pic(`<rect x="130" y="100" width="150" height="100" rx="10" fill="#334155"/><circle cx="170" cy="135" r="9" fill="#fbbf24"/><circle cx="170" cy="168" r="9" fill="#fbbf24"/><circle cx="215" cy="135" r="9" fill="#fbbf24"/><circle cx="215" cy="168" r="9" fill="#fbbf24"/>${
    v === 'ko' ? '<rect x="116" y="130" width="16" height="40" fill="#ef4444"/><path d="M60 100l50 50M110 100l-50 50" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>' : '<rect x="278" y="130" width="16" height="40" fill="#22c55e"/>'}<rect x="20" y="140" width="110" height="20" rx="8" fill="#1f2937"/>${v === 'ok' ? ARROW : ''}`, v),
  torque: (v: V) => pic(`<path d="M60 215l140-70" stroke="#64748b" stroke-width="22" stroke-linecap="round"/><circle cx="215" cy="138" r="26" fill="#475569"/><circle cx="215" cy="138" r="11" fill="#cbd5e1"/><path d="M250 120a70 70 0 0 1 100 70" stroke="#e2e8f0" stroke-width="22" fill="none"/><path d="M280 108a70 70 0 0 1 40 22" stroke="#22c55e" stroke-width="22" fill="none"/><path d="M334 150a70 70 0 0 1 16 40" stroke="#ef4444" stroke-width="22" fill="none"/><path d="M300 190l${v === 'ko' ? '40 -20' : v === 'limit' ? '30 -34' : '16 -52'}" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/><circle cx="300" cy="190" r="7" fill="#0f172a"/>`, v),
  label: (v: V) => pic(`<rect x="70" y="60" width="260" height="180" rx="10" fill="#94a3b8"/><g transform="${v === 'ko' ? 'rotate(14 200 150)' : v === 'limit' ? 'translate(80 40)' : ''}"><rect x="125" y="120" width="150" height="80" rx="4" fill="#fff"/><path d="M140 135v50M148 135v50M154 135v50M166 135v50M172 135v50M182 135v50M190 135v50M204 135v50M212 135v50M224 135v50M232 135v50M246 135v50M254 135v50" stroke="#0f172a" stroke-width="3"/></g><path d="M200 60v-30M190 38l10-10l10 10" stroke="#0f766e" stroke-width="6" fill="none"/>`, v),
  press: (v: V) => pic(`<polygon points="130,215 270,215 235,170 165,170" fill="#475569"/><polygon points="160,60 240,60 200,150" fill="#64748b"/><path d="M60 152L200 168L340 152" stroke="#b45309" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="${v === 'ko' ? 24 : 150}" y="262" font-size="24" font-family="sans-serif" fill="#0f172a">${v === 'ko' ? 'angle 92 deg' : 'angle 90 deg'}</text>`, v),
  weld: (v: V) => pic(`<rect x="40" y="110" width="320" height="60" fill="#94a3b8"/><rect x="40" y="170" width="320" height="60" fill="#64748b"/><path d="${v === 'ko' ? 'M50 170h60M150 170h40M240 170h30M310 170h40' : v === 'limit' ? 'M50 170h130M200 170h150' : 'M50 170h300'}" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>${v === 'ko' ? '<path d="M120 140l30 60M150 140l-30 60" stroke="#dc2626" stroke-width="7"/>' : ''}`, v),
  paint: (v: V) => pic(`<rect x="60" y="60" width="280" height="150" rx="8" fill="#6b7f78"/><rect x="60" y="60" width="280" height="40" rx="8" fill="#ffffff" fill-opacity=".18"/>${
    v === 'ko' ? '<path d="M110 210v34M170 210v54M250 210v40M300 210v28" stroke="#6b7f78" stroke-width="12" stroke-linecap="round"/>' : v === 'limit' ? '<g fill="#ffffff" fill-opacity=".25"><circle cx="110" cy="130" r="5"/><circle cx="160" cy="150" r="5"/><circle cx="220" cy="120" r="5"/><circle cx="270" cy="160" r="5"/><circle cx="300" cy="110" r="5"/></g>' : ''}`, v),
  parcel: (v: V) => pic(`<polygon points="70,100 330,100 330,230 70,230" fill="#b9854b"/><rect x="185" y="100" width="30" height="130" fill="#e7d3b0"/><rect x="95" y="150" width="70" height="46" fill="#fff"/><path d="M104 160h52M104 172h40M104 184h46" stroke="#0f172a" stroke-width="3"/>${v === 'ko' ? '<polygon points="270,100 330,100 330,160" fill="#5b3a17"/><path d="M60 250c60 20 100-10 160 6" stroke="#dc2626" stroke-width="6" fill="none"/>' : ''}`, v),
  gauge: (v: V) => pic(`<rect x="50" y="140" width="300" height="40" rx="4" fill="#cbd5e1"/><path d="M70 140v22M100 140v16M130 140v22M160 140v16M190 140v22M220 140v16M250 140v22M280 140v16M310 140v22" stroke="#0f172a" stroke-width="3"/><rect x="${v === 'limit' ? 262 : 242}" y="100" width="28" height="100" rx="4" fill="#475569"/><rect x="70" y="100" width="22" height="100" rx="4" fill="#475569"/>`, v),
  bench: (v: V) => pic(`<rect x="40" y="170" width="320" height="26" rx="4" fill="#92400e"/><rect x="60" y="196" width="14" height="70" fill="#78350f"/><rect x="326" y="196" width="14" height="70" fill="#78350f"/><rect x="80" y="130" width="70" height="40" rx="6" fill="#64748b"/><rect x="170" y="110" width="26" height="60" rx="5" fill="#0f766e"/><circle cx="260" cy="146" r="24" fill="#f59e0b"/><rect x="300" y="140" width="40" height="30" rx="4" fill="#334155"/>`, v),
} as const;
const PLAN = () => pic([
  ['RECEPTION', 0.03, 0.12, 0.22, 0.45], ['SOUDURE', 0.27, 0.12, 0.5, 0.45], ['TOLERIE', 0.5, 0.12, 0.72, 0.45], ['MONTAGE', 0.1, 0.52, 0.38, 0.9], ['PEINTURE', 0.66, 0.45, 0.9, 0.75], ['EXPEDITION', 0.78, 0.78, 0.97, 0.97],
].map(([n, x0, y0, x1, y1]) => `<rect x="${(x0 as number) * 800}" y="${(y0 as number) * 500}" width="${((x1 as number) - (x0 as number)) * 800}" height="${((y1 as number) - (y0 as number)) * 500}" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="3"/><text x="${(x0 as number) * 800 + 10}" y="${(y0 as number) * 500 + 26}" font-size="18" font-family="sans-serif" font-weight="700" fill="#475569">${n}</text>`).join('') + '<rect x="2" y="2" width="796" height="496" fill="none" stroke="#334155" stroke-width="4"/>', 'plain', 800, 500);

const st = (op: string, how: string, watch: string, check: string, photo = '', extra: Partial<SopStep> = {}): SopStep => ({ op, how, watch, check, photo, ...extra });

export function sopExamples(today = new Date()): Sop[] {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const base = (p: Partial<Sop>): Sop => ({
    id: '', processId: 'P3', poste: '', operation: '', version: 1, versionDate: ago(30), history: [], author: '', validatedBy: '', steps: [], good: '', trap: '', goodPhoto: '', trapPhoto: '', ppe: [], habilitations: [], ...p,
  });
  const w = SCENES;

  // 1. In force, version 2: one person has still not read it, a remark waits for an answer, a defect points to a step
  const s1steps: SopStep[] = [
    st('Contrôle visuel des composants', "Vérifier qu'il n'y a ni choc, ni bavure, ni rayure sur le corps", 'Pièces conformes au plan', 'Visuel à 100 %', w.connector('plain')),
    st('Positionnement et encliquetage', "Insérer le connecteur dans le sens de l'ergot jusqu'au clic", 'Le connecteur droit a un ergot : il ne rentre qu\'à droite', 'Clic entendu', w.connector('ok'), { photos: [w.connector('ko')], critical: 'quality', video: 'https://exemple.fr/video/encliquetage' }),
    st('Serrage au couple', "Serrer les 4 vis avec la clé dynamométrique étalonnée", 'Ne jamais forcer à la main', 'Déclenchement de la clé', w.torque('ok'), { critical: 'quality', values: [{ label: 'Couple', value: '2,5 Nm' }, { label: 'Vis', value: '4' }] }),
    st('Étiquette de série', "Coller l'étiquette centrée à 10 mm du bord inférieur", 'Le code doit rester lisible', 'Test du scan', w.label('ok'), { values: [{ label: 'Distance au bord', value: '10 mm' }] }),
  ];
  const s1 = base({
    id: 'sop_demo_1', poste: 'Montage armoires', operation: 'Raccordement des connecteurs du faisceau', version: 2, versionDate: ago(33), author: 'Lucie B.', validatedBy: 'David K.', phase: 'active', validatedAt: ago(33),
    steps: s1steps, good: 'Dénuder avec la butée de calibrage : 12 mm, aucun brin coupé, gaine thermo centrée.', trap: 'Dénuder à la pince universelle sans butée : longueur au hasard, brins coupés, court-circuit au test final.',
    goodPhoto: w.wire('ok'), trapPhoto: w.wire('ko'), ppe: ['Lunettes de sécurité', 'Chaussures de sécurité', 'Gants anti-coupure'],
    habilitations: [{ person: 'Lucie B.', tutor: 'David K.', date: ago(180), stage: 'trainer' }, { person: 'Nicolas R.', tutor: 'Lucie B.', date: ago(20), stage: 'alone' }, { person: 'Emma G.', tutor: 'Lucie B.', date: ago(5), stage: 'with' }],
    skillId: 'sk_demo_4', displayedAt: ago(31), displayedBy: 'David K.', oldRemoved: true, acks: [{ person: 'Lucie B.', v: 2, date: ago(32) }],
    group: 'Atelier montage', owner: 'David K.', materials: [{ label: 'Clé dynamométrique 2,5 Nm', photo: w.torque('plain') }, { label: 'Butée de calibrage 12 mm', photo: w.wire('plain') }, { label: 'Étiquettes de série', photo: w.label('plain') }],
    ifWrong: { stop: 'Arrêter le montage du faisceau et mettre la pièce dans le bac rouge.', who: "David K., chef d'atelier", where: "Bac rouge de l'atelier montage" },
    limits: { good: 'Brins intacts, 12 mm', limit: 'Entre 12 et 13 mm, brins serrés', reject: 'Brins coupés ou longueur hors tolérance', goodPhoto: w.wire('ok'), limitPhoto: w.wire('limit'), rejectPhoto: w.wire('ko') },
    riskIds: ['risk_demo_lot'], emergency: "Arrêt d'urgence : bouton rouge au bout de l'établi. Trousse de secours : bureau d'atelier. Extincteur : près de la porte.",
    variants: [{ name: 'Faisceau droit (réf. FD-12)', diff: "L'ergot est à droite : le connecteur ne rentre qu'à droite.", photo: w.connector('ok') }, { name: 'Faisceau gauche (réf. FG-12)', diff: "L'ergot est à gauche : même geste, côté inversé.", photo: w.connector('plain') }],
    links: [{ label: 'Plan de câblage (exemple)', url: 'https://exemple.fr/plan-cablage' }],
    suggestions: [
      { id: 'sg_demo_0', by: 'Lucie B.', date: ago(40), text: "Ajouter en photo le sens de l'ergot du connecteur droit.", status: 'kept', answer: 'Fait dans la V02 : ergot du connecteur droit ajouté.', answeredAt: ago(33) },
      { id: 'sg_demo_1', by: 'Nicolas R.', date: ago(4), text: 'Le gabarit de dénudage est lourd à tenir toute la journée. Une version plus légère serait mieux.', status: 'new', answer: '', answeredAt: '' },
    ],
    pin: { x: 0.2, y: 0.68 },
    journal: [{ at: `${ago(33)}T09:10:00.000Z`, by: 'David K.', what: 'Nouvelle version V02 : Détrompeur ajouté : ergot du connecteur droit (atelier 5P)' }, { at: `${ago(31)}T08:00:00.000Z`, by: 'David K.', what: 'Fiche V02 affichée au poste, ancienne fiche retirée' }],
  });
  s1.history = [
    { v: 1, date: ago(200), reason: 'Création avec la monteuse la plus expérimentée', by: 'Lucie B.', snap: snapOf({ ...s1, trap: 'Dénuder à la pince universelle.', steps: s1steps.map((x, i) => (i === 1 ? { ...x, watch: 'Vérifier le sens du connecteur', photos: undefined } : x)) }) },
    { v: 2, date: ago(33), reason: "Détrompeur ajouté : ergot du connecteur droit (atelier 5P)", kind: 'Détrompeur ajouté', by: 'David K.' },
  ];

  // 2. In force since 85 days, no picture, defects declared since: the update is late, never posted
  const s2 = base({
    id: 'sop_demo_2', poste: 'Presse plieuse', operation: 'Pliage des équerres de fixation', version: 1, versionDate: ago(90), history: [{ v: 1, date: ago(90), reason: 'Création' }], author: 'Karim T.', validatedBy: 'David K.', phase: 'active', validatedAt: ago(85),
    steps: [
      st("Choix de l'outil", 'Poinçon 88° et matrice V16 pour la tôle de 3 mm', "Vérifier le marquage de l'outil", 'Référence lue'),
      st('Première pièce', "Plier une pièce et mesurer l'angle au rapporteur", "Le retour élastique change d'une coulée à l'autre", 'Angle 90° ± 0,5°', '', { critical: 'quality', values: [{ label: 'Angle', value: '90° ± 0,5°' }] }),
      st('Série', 'Contrôler une pièce sur 10 au gabarit', "Arrêter dès qu'une pièce sort du gabarit", 'Gabarit passe'),
    ],
    good: 'Mesurer la première pièce de chaque lot de tôle.', trap: 'Garder le réglage de la veille avec un nouveau lot de tôle.',
    ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], skillId: 'sk_demo_2', group: 'Atelier tôlerie', owner: 'Karim T.', pin: { x: 0.58, y: 0.3 },
  });

  // 3. Written, waiting for its validation
  const s3 = base({
    id: 'sop_demo_3', poste: 'Soudure TIG inox', operation: 'Cordon sur cadre mécano-soudé', version: 1, versionDate: ago(3), history: [{ v: 1, date: ago(3), reason: 'Création avec le meilleur soudeur' }], author: 'Nicolas R.', validatedBy: '', phase: 'review',
    steps: [
      st('Préparer les bords', 'Dégraisser et brosser les bords à souder', 'Trace de gras ou de calamine', 'Bords brillants', w.bench('plain')),
      st('Régler le poste', "Régler l'intensité et le débit de gaz selon la fiche", 'Débit de gaz trop faible', 'Débit lu au débitmètre', w.gauge('plain'), { values: [{ label: 'Intensité', value: '90 A' }, { label: 'Débit de gaz', value: '8 l/min' }] }),
      st('Souder', 'Avancer à vitesse régulière, le cordon sans interruption', 'Reprise au milieu du cordon', 'Cordon continu', w.weld('ok'), { critical: 'quality' }),
      st('Contrôler', 'Regarder le cordon à la lumière rasante', 'Piqûre ou manque de pénétration', 'Aucune piqûre', w.weld('limit')),
    ],
    good: 'Un cordon continu, régulier, sans reprise visible.', trap: 'Reprendre le cordon au milieu : manque de pénétration au contrôle.', goodPhoto: w.weld('ok'), trapPhoto: w.weld('ko'),
    ppe: ['Lunettes de sécurité', 'Gants anti-coupure', 'Masque'], skillId: 'sk_demo_3', group: 'Atelier soudure', owner: 'Marc M.', pin: { x: 0.38, y: 0.3 },
    materials: [{ label: 'Baguettes inox 2,4 mm', photo: w.bench('plain') }],
    journal: [{ at: `${ago(3)}T16:00:00.000Z`, by: 'Nicolas R.', what: 'Envoyée à validation' }],
  });

  // 4. In force, version 3: the sheet posted is the old one, a person must renew, only one person is allowed
  const s4steps: SopStep[] = [
    st('Préparer la pièce', "Dégraisser et suspendre la pièce sur le crochet", 'Doigts sur la surface à peindre', 'Surface propre et sèche', w.paint('plain')),
    st('Appliquer', "Passer le pistolet à 25 cm, par passes croisées", 'Trop de peinture au même endroit : coulures', 'Aspect lisse', w.paint('ok'), { photos: [w.paint('ko')], critical: 'quality', values: [{ label: 'Distance', value: '25 cm' }, { label: 'Épaisseur', value: '80 microns' }] }),
    st('Cuire', 'Régler le four et lancer le cycle', 'Porte du four ouverte pendant le cycle', 'Température affichée', w.gauge('plain'), { critical: 'safety', values: [{ label: 'Température', value: '180 °C' }, { label: 'Durée', value: '20 min' }] }),
    st('Contrôler', "Vérifier l'aspect et l'épaisseur sur 3 points", 'Pièce encore chaude', 'Épaisseur au moins 80 microns', w.gauge('ok')),
  ];
  const s4 = base({
    id: 'sop_demo_4', poste: 'Peinture', operation: 'Thermolaquage et contrôle d\'aspect', version: 3, versionDate: ago(5), author: 'Julien P.', validatedBy: 'Antoine P.', phase: 'active', validatedAt: ago(5), reviewedAt: ago(5),
    steps: s4steps, good: 'Passes croisées à 25 cm, fines, sans repasser sur une zone déjà couverte.', trap: 'Charger le pistolet et insister au même endroit : coulures visibles après cuisson.', goodPhoto: w.paint('ok'), trapPhoto: w.paint('ko'),
    ppe: ['Lunettes de sécurité', 'Gants anti-coupure', 'Masque', 'Blouse ou tablier'],
    habilitations: [{ person: 'Julien P.', tutor: 'David K.', date: ago(150), stage: 'alone', until: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 12)) }, { person: 'Karim T.', tutor: 'Julien P.', date: ago(10), stage: 'with' }, { person: 'Sarah M.', tutor: 'Julien P.', date: ago(3), stage: 'seen' }],
    displayedAt: ago(20), displayedBy: 'Julien P.', oldRemoved: true, acks: [{ person: 'Julien P.', v: 3, date: ago(4) }], briefed: { v: 3, date: ago(4), by: 'Julien P.' },
    group: 'Atelier peinture', owner: 'Julien P.', pin: { x: 0.78, y: 0.58 },
    limits: { good: 'Surface lisse, brillante', limit: 'Léger grain de peau d\'orange', reject: 'Coulures ou manques', goodPhoto: w.paint('ok'), limitPhoto: w.paint('limit'), rejectPhoto: w.paint('ko') },
    ifWrong: { stop: 'Arrêter la cabine et isoler les pièces touchées.', who: 'Antoine P., responsable qualité', where: 'Bac rouge de la peinture' }, riskIds: ['risk_demo_lot'],
    emergency: "Arrêt d'urgence de la cabine : bouton rouge à gauche de la porte. Douche oculaire : couloir.",
  });
  s4.history = [
    { v: 1, date: ago(200), reason: 'Création', by: 'Julien P.' },
    { v: 2, date: ago(90), reason: 'Température et durée de cuisson ajoutées', kind: 'Revue périodique', by: 'Julien P.', snap: snapOf({ ...s4, trap: 'Trop de peinture.', steps: s4steps.map((x, i) => (i === 1 ? { ...x, how: 'Passer le pistolet à 25 cm', photos: undefined } : x)) }) },
    { v: 3, date: ago(5), reason: 'Réclamation client : coulures sur les portillons du client B', kind: 'Réclamation client', by: 'Julien P.' },
  ];

  // 5. In force for more than a year: the periodic review is due
  const s5 = base({
    id: 'sop_demo_5', poste: 'Expédition', operation: 'Conditionnement et expédition des colis', version: 3, versionDate: ago(400), history: [{ v: 1, date: ago(700), reason: 'Création' }, { v: 2, date: ago(500), reason: 'Étiquette sur la bonne face', kind: 'Remarque d\'un opérateur' }, { v: 3, date: ago(400), reason: 'Calage des charges lourdes', kind: 'Accident ou presque-accident' }],
    author: 'Sophie V.', validatedBy: 'David K.', phase: 'active', validatedAt: ago(400),
    steps: [
      st('Contrôler la commande', 'Comparer le bon de commande et les articles', 'Référence proche', 'Quantités vérifiées', w.parcel('plain')),
      st('Emballer et caler', 'Caler les charges lourdes en bas du colis', 'Charge mal calée', 'Colis fermé', w.parcel('ok')),
      st('Étiqueter et remettre', "Poser l'étiquette lisible sur la bonne face", 'Adresse illisible', 'Étiquette scannée'),
    ],
    good: 'Charges lourdes en bas, colis calé, étiquette lisible.', trap: 'Colis trop plein : carton écrasé au transport.', goodPhoto: w.parcel('ok'), trapPhoto: w.parcel('ko'),
    ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], habilitations: [{ person: 'Sophie V.', tutor: '', date: ago(380), stage: 'alone' }, { person: 'Julien P.', tutor: 'Sophie V.', date: ago(300), stage: 'alone' }],
    displayedAt: ago(399), displayedBy: 'Sophie V.', oldRemoved: true, acks: [{ person: 'Sophie V.', v: 3, date: ago(399) }, { person: 'Julien P.', v: 3, date: ago(300) }], briefed: { v: 3, date: ago(399), by: 'Sophie V.' },
    group: 'Expédition', owner: 'Sophie V.', pin: { x: 0.88, y: 0.87 },
  });

  // 6. Draft started from a template
  const s6 = base({
    id: 'sop_demo_6', poste: 'Contrôle final', operation: 'Contrôle final des platines', version: 1, versionDate: ago(2), author: 'Antoine P.', phase: 'draft',
    steps: [st("Préparer l'instrument", "Vérifier la date d'étalonnage", 'Instrument hors date', 'Étalonnage valide'), st('Mesurer', 'Mesurer aux points marqués sur le plan', 'Mesure faite à la volée', 'Mesure répétée si doute'), st('Décider', 'Conforme : libérer. Douteux : bac rouge', 'Pièce limite', 'Décision écrite'), st('', '', '', '')],
    ppe: ['Gants anti-coupure'], skillId: 'sk_demo_5', group: 'Qualité', owner: 'Antoine P.',
  });

  // 7. Archived: replaced by a new machine
  const s7 = base({
    id: 'sop_demo_7', poste: 'Cintrage manuel (ancienne presse)', operation: 'Cintrage des tubes', version: 4, versionDate: ago(300), history: [{ v: 1, date: ago(900), reason: 'Création' }, { v: 4, date: ago(300), reason: 'Revue périodique' }],
    author: 'Karim T.', validatedBy: 'David K.', phase: 'archived', archivedAt: ago(120), validatedAt: ago(300),
    steps: [st('Tracer', 'Marquer le point de cintrage au feutre', 'Trait trop épais', 'Cote relevée'), st('Cintrer', 'Cintrer à vitesse lente jusqu\'à la butée', 'Doigts près de la butée', 'Angle contrôlé')],
    good: 'Cintrer lentement jusqu\'à la butée.', trap: 'Forcer au-delà de la butée.', ppe: ['Gants anti-coupure'], group: 'Atelier tôlerie', journal: [{ at: `${ago(120)}T10:00:00.000Z`, by: 'David K.', what: 'Archivée' }],
  });

  // 8. In force and up to date: posted, read, team told, reviewed
  const s8 = base({
    id: 'sop_demo_8', poste: 'Réception des marchandises', operation: 'Contrôle à la livraison', version: 2, versionDate: ago(70), history: [{ v: 1, date: ago(250), reason: 'Création' }, { v: 2, date: ago(70), reason: 'Réserve écrite sur le bon de livraison', kind: 'Défaut déclaré au poste' }],
    author: 'Sophie V.', validatedBy: 'David K.', phase: 'active', validatedAt: ago(70), reviewedAt: ago(30),
    steps: [
      st('Contrôler le colis', 'Regarder les angles et le film avant de signer', 'Carton abîmé ou ouvert', 'État noté sur le bon', w.parcel('plain')),
      st('Contrôler le contenu', 'Comparer le bon de livraison et les articles', 'Quantité différente', 'Quantités cochées', w.gauge('plain')),
      st('Signer avec réserve', 'Écrire la réserve sur le bon avant de signer', 'Signature sans réserve', 'Réserve écrite', w.parcel('ok'), { critical: 'quality' }),
    ],
    good: 'Réserve écrite sur le bon de livraison, photo du défaut.', trap: 'Signer sans regarder : le défaut ne se réclame plus.', goodPhoto: w.parcel('ok'), trapPhoto: w.parcel('ko'),
    ppe: ['Chaussures de sécurité', 'Gants anti-coupure'], habilitations: [{ person: 'Sophie V.', tutor: '', date: ago(240), stage: 'alone' }, { person: 'David K.', tutor: 'Sophie V.', date: ago(200), stage: 'alone' }],
    displayedAt: ago(69), displayedBy: 'Sophie V.', oldRemoved: true, acks: [{ person: 'Sophie V.', v: 2, date: ago(69) }, { person: 'David K.', v: 2, date: ago(68) }], briefed: { v: 2, date: ago(68), by: 'Sophie V.' },
    group: 'Réception', owner: 'Sophie V.', pin: { x: 0.12, y: 0.3 },
    ifWrong: { stop: 'Écrire la réserve avant de signer, photographier le défaut.', who: 'Sophie V., achats et ADV', where: 'Zone de quarantaine à droite du quai' },
  });
  return [s1, s2, s3, s4, s5, s6, s7, s8];
}

// The defects of the example (tool 5.1) that happened on a step of a sheet
export const NC_LINKS: Record<string, { sopId: string; sopStep: number }> = {
  nc_demo_3: { sopId: 'sop_demo_1', sopStep: 1 },
  nc_demo_5: { sopId: 'sop_demo_4', sopStep: 1 },
};
export const sopExampleParams = () => ({ plan: PLAN() });

// What the company already holds stays: a field is filled only when it is empty
const isEmpty = (x: unknown) => x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length);
function fillEmpty<T>(old: T, fresh: T, appendArrays = false): T {
  if (isEmpty(old)) return fresh;
  if (Array.isArray(old) && Array.isArray(fresh)) {
    const merged = old.map((o, i) => (i < fresh.length && typeof o === 'object' && o !== null ? fillEmpty(o, fresh[i]) : o));
    return (appendArrays ? [...merged, ...fresh.slice(old.length)] : merged) as T;
  }
  if (typeof old === 'object' && old !== null && typeof fresh === 'object' && fresh !== null && !Array.isArray(fresh)) {
    const out: Record<string, unknown> = { ...(fresh as Record<string, unknown>) };
    Object.entries(old as Record<string, unknown>).forEach(([k, v]) => { out[k] = k in out && (isEmpty(v) || typeof v === 'object') ? fillEmpty(v, out[k], k === 'steps') : v; });
    return out as T;
  }
  return old;
}

// A fictitious company saved before this version gets the sheets of the current example, once: the sheets it holds are completed (pictures, new fields)
// without touching what was typed, the missing ones are added, and the defects are linked to their sheet. A real company gets nothing.
export function completeSopExamples<T extends { sops: Record<string, Sop>; ncs: Record<string, Nc>; params: Params }>(s: T, today = new Date()): T {
  const demo = Object.keys(s.sops).some(id => id.startsWith('sop_demo_'));
  if (!demo || (s.params.sopExampleLevel ?? 0) >= 1) return s;
  const sops = { ...s.sops };
  sopExamples(today).forEach(x => { sops[x.id] = sops[x.id] ? fillEmpty(sops[x.id], x) : x; });
  const ncs = { ...s.ncs };
  Object.entries(NC_LINKS).forEach(([id, l]) => { if (ncs[id]) ncs[id] = { ...ncs[id], sopId: ncs[id].sopId ?? l.sopId, sopStep: ncs[id].sopStep ?? l.sopStep }; });
  const sop = { ...(s.params.sop || {}) };
  sop.plan ||= sopExampleParams().plan;
  return { ...s, sops, ncs, params: { ...s.params, sop, sopExampleLevel: 1 } };
}

// The button "Voir un exemple traité" of tool 3.2: the sheets and the plan, in a company that has none yet; the defects already declared are linked
export function applySopExample(d: { sops: Record<string, Sop>; ncs: Record<string, Nc>; params: Params }, today = new Date()) {
  sopExamples(today).forEach(x => { d.sops[x.id] ||= x; });
  Object.entries(NC_LINKS).forEach(([id, l]) => { const n = d.ncs[id]; if (n) { n.sopId ??= l.sopId; n.sopStep ??= l.sopStep; } });
  d.params.sop = { ...(d.params.sop || {}) };
  d.params.sop.plan ||= sopExampleParams().plan;
  d.params.sopExampleLevel = 1;
}
