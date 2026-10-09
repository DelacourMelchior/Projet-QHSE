// Tool 1.4 "Cartographie": the processes of the company (the list of state.processes, shared by every tool), their sheets and their flowcharts.
// Pure functions, covered by cartography.test.ts. A flowchart is a list of steps; the diagram is drawn from the list (lanes = roles), never placed by hand.
import type { Flow, FlowBranch, FlowSheet, FlowLink, FlowStep, MapBand, MapSettings, MapIo, MapReq, MapHideable, MapRight, Process, State, StepKind } from './types';
import { daysBetween, newId, PROCESS_COLORS, PROCESS_IDS, PROCESS_NAMES } from './base';
export { defaultProcess } from './base';
import { PROCESS_SHORT } from './team';
import { isoDate } from './periods';

export const BANDS: { key: MapBand; label: string; hint: string }[] = [
  { key: 'management', label: 'Management', hint: 'Ce qui dirige l’entreprise : décider, piloter, améliorer' },
  { key: 'realisation', label: 'Réalisation', hint: 'Ce qui crée la valeur pour le client' },
  { key: 'support', label: 'Support', hint: 'Les moyens dont la réalisation a besoin : personnes, outils, documents' },
  { key: 'transverse', label: 'Transverse', hint: 'Ce qui concerne tous les processus à la fois : qualité, sécurité, données, documents' },
];
// The five processes every company starts with
export const DEFAULT_BAND: Record<string, MapBand> = { P1: 'management', P2: 'realisation', P3: 'realisation', P4: 'support', P5: 'support' };
export const bandOf = (p: Process): MapBand => p.band ?? DEFAULT_BAND[p.id] ?? 'realisation';

export const STEP_KINDS: { key: StepKind; label: string }[] = [
  { key: 'start', label: 'Début' }, { key: 'action', label: 'Action' }, { key: 'decision', label: 'Décision' },
  { key: 'document', label: 'Document' }, { key: 'subprocess', label: 'Sous-processus' }, { key: 'end', label: 'Fin' },
];
export const REQ_KINDS: { key: 'client' | 'legal' | 'standard' | 'internal' | 'other'; label: string }[] = [
  { key: 'client', label: 'Client' }, { key: 'legal', label: 'Loi ou règlement' }, { key: 'standard', label: 'Norme (volontaire sauf exigence du client)' }, { key: 'internal', label: 'Interne' }, { key: 'other', label: 'Autre, précisez' },
];
// Requirements met in most small companies, to pick from instead of typing: by process of the base (P1 to P5), then those of every process.
// Wording stays general (the company adapts it); the loi/norme lines name the subject, not an article, so they never go out of date.
const K = { c: 'client', l: 'legal', s: 'standard', i: 'internal' } as const;
const list = (rows: [keyof typeof K, string[]][]): MapReq[] => rows.flatMap(([k, ts]) => ts.map(text => ({ kind: K[k], text })));
const REQ_COMMON: MapReq[] = list([
  ['c', ['Délai promis au client', 'Cahier des charges ou plans du client', 'Spécification technique du client', 'Conditions particulières d’un contrat ou d’une commande', 'Audit ou visite du client', 'Confidentialité demandée par le client', 'Mode de communication convenu avec le client', 'Documents à remettre au client avec le produit ou le service', 'Exigence d’un donneur d’ordre ou d’un client final']],
  ['l', ['Conservation des documents pendant la durée légale', 'Protection des données personnelles', 'Respect du droit du travail', 'Obligations en matière de santé et de sécurité des salariés', 'Réglementation environnementale applicable (déchets, rejets, produits)', 'Affichages et registres obligatoires', 'Règles de sécurité incendie et d’évacuation']],
  ['s', ['ISO 9001 : informations documentées maîtrisées', 'ISO 9001 : approche par les risques et les opportunités', 'ISO 9001 : amélioration continue', 'ISO 14001 : exigences environnementales', 'ISO 45001 : santé et sécurité au travail']],
  ['i', ['Validation par le responsable avant envoi ou exécution', 'Double contrôle sur les opérations sensibles', 'Enregistrement de chaque opération importante', 'Archivage des preuves au bon endroit', 'Remontée d’un écart au responsable le jour même', 'Réponse aux demandes internes dans un délai fixé', 'Règles d’accès aux documents et aux locaux', 'Mise à jour du document au moins une fois par an']],
]);
const REQ_BY_PROCESS: Record<string, MapReq[]> = {
  P1: list([
    ['l', ['Tenue de la comptabilité et dépôt des comptes (selon la forme juridique)', 'Évaluation des risques professionnels tenue à jour (document unique)', 'Déclarations fiscales et sociales dans les délais', 'Respect des règles de gouvernance de la société (selon la forme juridique)', 'Registres légaux de la société (selon la forme juridique)', 'Assurances obligatoires en vigueur', 'Respect des règles de la commande publique (si l’entreprise y répond)', 'Prévention de la corruption et des conflits d’intérêts (selon la taille)', 'Coordination avec les entreprises extérieures qui interviennent (plan de prévention, selon les travaux et la durée)']],
    ['s', ['ISO 9001 : contexte de l’organisme et parties intéressées', 'ISO 9001 : leadership et engagement de la direction', 'ISO 9001 : politique qualité', 'ISO 9001 : objectifs qualité et planification', 'ISO 9001 : revue de direction', 'ISO 9001 : ressources nécessaires', 'ISO 9001 : maîtrise des modifications']],
    ['c', ['Information du client sur un changement important de l’entreprise', 'Preuve de la situation fiscale et sociale demandée par un client', 'Questionnaire d’évaluation du fournisseur rempli pour un client']],
    ['i', ['Une revue de direction par période fixée', 'Objectifs de l’année partagés avec les pilotes', 'Décision d’investissement validée au-dessus d’un montant fixé', 'Suivi des indicateurs à date fixe', 'Plan de continuité pour les ressources vitales', 'Sauvegarde des données à fréquence fixée']],
  ]),
  P2: list([
    ['l', ['Mentions obligatoires des devis et des factures', 'Conditions générales de vente (communiquées selon le type de client)', 'Délais de paiement respectés', 'Information précontractuelle du client (selon le type de client)', 'Règles applicables à la vente à un consommateur (si concerné)', 'Règles de démarchage et de prospection commerciale', 'Règles de prospection par message, selon le type de client', 'Garanties légales applicables à la vente (selon le type de client)', 'Étiquetage et information sur le produit', 'Règles de la publicité et des allégations commerciales']],
    ['s', ['ISO 9001 : communication avec les clients', 'ISO 9001 : revue des exigences relatives au produit', 'ISO 9001 : détermination des exigences du client', 'ISO 9001 : propriété du client conservée avec soin', 'ISO 9001 : retour d’information du client', 'ISO 9001 : traitement des réclamations']],
    ['c', ['Réponse à une demande de prix sous un délai promis', 'Accusé de réception d’une réclamation sous un délai promis', 'Confirmation écrite de la commande', 'Prix et conditions figés pendant la durée du devis', 'Information du client sur l’avancement de sa commande', 'Respect du cahier des charges de l’appel d’offres', 'Dépôt de la réponse avant la date limite', 'Documents administratifs demandés avec l’offre', 'Facturation selon les modalités du contrat', 'Remise d’un avenant écrit pour tout changement demandé']],
    ['i', ['Marge minimale d’un devis', 'Visa de la direction au-dessus d’un montant fixé', 'Relance d’un devis sans réponse à une date fixée', 'Vérification de la faisabilité auprès des opérations avant de s’engager', 'Vérification de la solvabilité d’un nouveau client', 'Devis conservé avec sa version et sa date', 'Réponse à une réclamation par une personne désignée', 'Enregistrement de chaque réclamation']],
  ]),
  P3: list([
    ['l', ['Vérification périodique des équipements de travail', 'Consignes de sécurité sur le lieu de travail', 'Formation et habilitations requises pour le travail à réaliser', 'Équipements de protection individuelle fournis et portés', 'Vérification des appareils de levage (si concerné)', 'Contrôle des installations électriques', 'Gestion des produits chimiques (étiquetage, fiches de données de sécurité)', 'Tri et traçabilité des déchets', 'Exigences de sécurité des machines (marquage, notice, si concerné)', 'Marquage et déclaration de conformité du produit (si applicable)', 'Règles de transport et de chargement', 'Obligations du donneur d’ordre et de l’entreprise extérieure sur un lieu d’intervention', 'Registre des vérifications et contrôles obligatoires']],
    ['s', ['ISO 9001 : maîtrise de la production et de la prestation de service', 'ISO 9001 : identification et traçabilité', 'ISO 9001 : maîtrise des équipements de surveillance et de mesure', 'ISO 9001 : évaluation des fournisseurs externes', 'ISO 9001 : maîtrise des processus et produits fournis par des prestataires', 'ISO 9001 : libération des produits et services', 'ISO 9001 : préservation (stockage, manutention, emballage)', 'ISO 9001 : conception et développement (si concerné)']],
    ['c', ['Spécifications et tolérances de la commande', 'Certificat de conformité remis avec la livraison', 'Dossier de contrôle remis au client', 'Marquage ou étiquetage demandé par le client', 'Emballage demandé par le client', 'Date de livraison confirmée au client', 'Procès-verbal de réception signé par le client', 'Validation par le client d’un échantillon ou d’une première réalisation', 'Point d’arrêt imposé par le client (contrôle avant de continuer)']],
    ['i', ['Autocontrôle à chaque jalon', 'Contrôle final avant livraison', 'Instruction de travail disponible et à jour sur le lieu de travail', 'Fiche de suivi renseignée à chaque étape', 'Produit non conforme isolé et identifié', 'Réception des fournitures et des produits contrôlée à l’arrivée', 'Maintenance préventive faite à la date prévue', 'Vérification des instruments de mesure à fréquence fixée', 'Lieu de travail rangé et propre en fin de journée', 'Respect du planning de réalisation', 'Fournisseur choisi parmi les fournisseurs évalués', 'Stock minimal de fournitures et de rechanges tenu']],
  ]),
  P4: list([
    ['l', ['Entretien professionnel et formation des salariés', 'Accueil et information sécurité de la personne qui arrive', 'Registre du personnel et dossiers du personnel', 'Visite d’information et de prévention, ou suivi médical renforcé selon le poste', 'Contrat de travail remis dans les délais', 'Déclaration préalable à l’embauche', 'Durée du travail et temps de repos respectés', 'Affichages obligatoires sur le lieu de travail', 'Représentation du personnel (selon l’effectif)', 'Égalité professionnelle et lutte contre les discriminations', 'Habilitations spécifiques à jour (électrique, conduite, travaux en hauteur)', 'Droit d’accès des personnes à leurs données personnelles', 'Conservation des dossiers du personnel pendant la durée légale', 'Accessibilité des locaux et des lieux de travail']],
    ['s', ['ISO 9001 : compétence', 'ISO 9001 : sensibilisation du personnel', 'ISO 9001 : communication interne', 'ISO 9001 : informations documentées conservées', 'ISO 9001 : infrastructures et environnement de travail', 'ISO 45001 : participation et consultation des travailleurs']],
    ['c', ['Qualification du personnel demandée par un client', 'Liste des personnes habilitées transmise au client', 'Preuve de formation exigée par un client avant intervention']],
    ['i', ['Une personne formée pour remplacer chaque fonction clé', 'Parcours d’accueil suivi pendant les premiers jours', 'Matrice de polyvalence mise à jour au moins une fois par an', 'Besoin de formation recueilli chaque année', 'Document nommé et rangé selon le plan de classement', 'Départ d’une personne : accès et matériel récupérés', 'Recrutement : profil de poste écrit avant l’annonce', 'Période d’essai évaluée avec la personne', 'Temps de formation consigné', 'Consignes d’absence et de remplacement connues de l’équipe']],
  ]),
  P5: list([
    ['l', ['Rappel ou retrait d’un produit non conforme et information des autorités (si applicable)', 'Déclaration des accidents du travail', 'Évaluation des risques professionnels mise à jour après un accident ou un changement', 'Registre des accidents bénins (si autorisé par la CPAM)', 'Droit d’alerte et de retrait des salariés', 'Information du client en cas de produit dangereux']],
    ['s', ['ISO 9001 : maîtrise des éléments de sortie non conformes', 'ISO 9001 : actions correctives', 'ISO 9001 : audit interne', 'ISO 9001 : satisfaction du client', 'ISO 9001 : surveillance, mesure, analyse et évaluation', 'ISO 9001 : analyse et évaluation des données', 'ISO 9001 : amélioration', 'ISO 9001 : actions face aux risques et opportunités', 'ISO 14001 : situations d’urgence et capacité à réagir', 'ISO 45001 : enquête sur les incidents et actions correctives']],
    ['c', ['Traitement d’une réclamation dans un délai promis', 'Rapport d’analyse remis au client après un défaut', 'Information du client en cas de non-conformité livrée', 'Plan d’actions partagé avec le client', 'Mesure de satisfaction demandée par le client', 'Accord du client avant une dérogation']],
    ['i', ['Décision rapide sur tout produit isolé', 'Analyse de cause faite pour tout défaut qui revient ou qui coûte cher', 'Contre-mesure vérifiée après un délai fixé', 'Audit interne avec un plan annuel', 'Indicateur qualité revu chaque mois', 'Risque identifié, évalué et suivi avec une action', 'Situation dangereuse remontée par toute personne', 'Plan B écrit pour les situations graves', 'Mesure de satisfaction en fin d’affaire', 'Action corrective avec un responsable et une date', 'Registre des non-conformités tenu à jour']],
  ]),
};
// A requirement of a flowchart has an id so that steps can say they meet it; one written before ids existed gets one from its words (stable, and kept once saved)
const hashId = (t: string) => { let h = 5381; for (const ch of t) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return `rq_${h.toString(36)}`; };
// Two passes: the ids already written are reserved first (the first of a repeated one keeps it), then the missing ones are made, so a made id never takes one that is written further down
export function withReqIds(reqs: MapReq[]): MapReq[] {
  const used = new Set<string>(), keep = reqs.map(r => { if (!r.id || used.has(r.id)) return false; used.add(r.id); return true; });
  return reqs.map((r, i) => { if (keep[i]) return r; let id = hashId(`${r.kind}|${r.text.trim().toLowerCase()}`); while (used.has(id)) id += 'x'; used.add(id); return { ...r, id }; });
}
// The steps of a flowchart that meet a requirement of the flowchart (by id), with their number in the list
export const stepsMeeting = (f: Pick<Flow, 'steps'>, reqId: string | undefined): { step: FlowStep; n: number }[] => (reqId ? f.steps.map((step, i) => ({ step, n: i + 1 })).filter(x => (x.step.reqs || []).includes(reqId)) : []);
// How many steps, in the flowcharts, meet a requirement given by its kind and words (a requirement may be written in several flowcharts)
export function stepCountFor(flows: Flow[], req: Pick<MapReq, 'kind' | 'text'>): number {
  return flows.reduce((n, f) => n + (f.requirements || []).filter(r => r.kind === req.kind && r.text.trim().toLowerCase() === req.text.trim().toLowerCase()).reduce((m, r) => m + stepsMeeting(f, r.id).length, 0), 0);
}
// Drop from the steps the links to requirements that are no longer written on the flowchart
export function pruneStepReqs(f: Flow): void {
  const ids = new Set((f.requirements || []).map(r => r.id).filter((x): x is string => !!x));
  f.steps.forEach(s => { if (s.reqs) { const k = s.reqs.filter(i => ids.has(i)); if (k.length) s.reqs = k; else delete s.reqs; } });
}
export const requirementSuggestions = (processId: string, have: MapReq[]): MapReq[] => [...(REQ_BY_PROCESS[processId] || []), ...REQ_COMMON].filter(x => !have.some(h => h.kind === x.kind && h.text.trim().toLowerCase() === x.text.toLowerCase()));
export const RIGHTS: { key: MapRight; label: string; hint: string }[] = [
  { key: 'none', label: 'Aucun accès', hint: "Ne voit pas l'outil" },
  { key: 'view', label: 'Consulter', hint: 'Voit la carte, les fiches et les logigrammes' },
  { key: 'own', label: 'Modifier ses processus', hint: 'Modifie les processus dont il est pilote ou suppléant' },
  { key: 'admin', label: 'Administrer', hint: 'Modifie tout, crée et supprime les processus, fait la revue' },
];
export const HIDEABLE: { key: MapHideable; label: string }[] = [
  { key: 'targets', label: 'Cibles des indicateurs' }, { key: 'risks', label: 'Risques et Plans B' }, { key: 'notes', label: 'Notes de direction' },
];

const PALETTE = ['#0f766e', '#b45309', '#1d4ed8', '#7c3aed', '#be123c', '#4d7c0f', '#0e7490', '#a21caf', '#475569', '#c2410c'];
const MAX_HISTORY = 20, MAX_REVIEWS = 12;
const text = (v: unknown) => (typeof v === 'string' ? v : '');

// One way to sort words in French (accents, case) for every list of the map
export const byFr = (a: string, b: string) => a.localeCompare(b, 'fr');
export const sortedProcesses = (s: Pick<State, 'processes'>) => [...s.processes].sort((a, b) => a.order - b.order);
export const processName = (s: Pick<State, 'processes'>, id: string) => { const n = s.processes.find(p => p.id === id)?.name; return n ? plainName(n) : id || 'À qualifier'; };
export const flowsOf = (s: Pick<State, 'flows'>, processId: string) => Object.values(s.flows || {}).filter(f => f.processId === processId).sort((a, b) => byFr(a.name, b.name));

// ---- the processes of the company, read by every tool
// The other tools list the processes through PROCESS_IDS, PROCESS_NAMES and PROCESS_SHORT (base.ts, team.ts). Those lists follow the map: the shell calls this at each drawing,
// so a process added, renamed or deleted here is the one every select, tab and label shows. Names lose the "P1 · " the old data carried (the code is shown beside).
const SHORT_DEFAULT: Record<string, string> = { P1: 'Direction', P2: 'Commercial', P3: 'Opérations', P4: 'RH', P5: 'Qualité' };
// bareName: without the old "P1 · " and nothing else cut (what a field shows while somebody types); plainName: the same, trimmed
export const bareName = (name: string) => name.replace(/^P\d+\s*[·:.-]\s*/, '');
export const plainName = (name: string) => bareName(name).trim() || name;
export function registerProcesses(ps: (Pick<Process, 'id' | 'name' | 'order'> & Partial<Pick<Process, 'color'>>)[] | undefined): void {
  if (!ps) return;
  const sorted = [...ps].sort((a, b) => a.order - b.order);
  PROCESS_IDS.splice(0, PROCESS_IDS.length, ...sorted.map(p => p.id));
  [PROCESS_NAMES, PROCESS_SHORT, PROCESS_COLORS].forEach(o => Object.keys(o).forEach(k => { delete o[k]; }));
  sorted.forEach(p => {
    const n = plainName(p.name) || p.id;
    PROCESS_NAMES[p.id] = n;
    if (typeof p.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(p.color)) PROCESS_COLORS[p.id] = p.color;
    // the short word of the five first processes only while the name still begins with it (the original names do); a renamed process is cut like any other
    const dflt = SHORT_DEFAULT[p.id];
    PROCESS_SHORT[p.id] = n.length <= 16 ? n : dflt && n.toLowerCase().startsWith(dflt.toLowerCase()) ? dflt : `${n.slice(0, 15)}…`;
  });
}

// ---- creating and deleting processes
// A new code is the next number after the highest of the processes, the flows and the filing plan: not one still in use (a code whose process was deleted, with nothing left pointing to it, can come back)
export function nextProcessId(s: Pick<State, 'processes' | 'flows' | 'ged'>): string {
  const ids = [...s.processes.map(p => p.id), ...Object.values(s.flows || {}).map(f => f.processId), ...(s.ged?.folders || []).map(f => f.processId)];
  return `P${Math.max(0, ...ids.map(id => Number(/^P(\d+)$/.exec(id)?.[1] || 0))) + 1}`;
}
export function newProcess(s: Pick<State, 'processes' | 'flows' | 'ged'>, name: string, band: MapBand = 'realisation'): Process {
  const id = nextProcessId(s);
  return { id, name: name.trim(), color: PALETTE[s.processes.length % PALETTE.length], order: Math.max(-1, ...s.processes.map(p => p.order)) + 1, kpiIds: [], band };
}

// What still points to a process in the other tools: deleting it would leave those records without a process
export interface Usage { key: string; label: string; many?: string; tool: string; n: number }   // many: the plural of the label when it is not the label + s
export function processUsage(s: State, id: string): Usage[] {
  const count = (xs: { processId: string }[] | undefined) => (xs || []).filter(x => x.processId === id).length;
  const p = s.processes.find(x => x.id === id);
  const out: Usage[] = [
    { key: 'kpis', label: 'indicateur', tool: '1.1', n: Math.max(p?.kpiIds.length || 0, Object.values(s.kpis).filter(k => k.processId === id).length) },
    { key: 'risks', label: 'risque', tool: '1.2', n: count(Object.values(s.risks)) },
    { key: 'complaints', label: 'réclamation', tool: '2.3', n: count(Object.values(s.complaints)) },
    { key: 'sops', label: 'instruction de poste', many: 'instructions de poste', tool: '3.2', n: count(Object.values(s.sops)) },
    { key: 'powers', label: 'fonction clé', many: 'fonctions clés', tool: '4.1', n: count(Object.values(s.powers)) },
    { key: 'skills', label: 'compétence', tool: '4.2', n: count(Object.values(s.skills)) },
    { key: 'people', label: 'personne rattachée', many: 'personnes rattachées', tool: '1.3', n: Object.values(s.people).filter(x => x.processIds?.includes(id)).length },
    { key: 'ged', label: 'dossier du plan de classement', many: 'dossiers du plan de classement', tool: '4.4', n: count(s.ged?.folders) },
    { key: 'ncs', label: 'défaut', tool: '5.1', n: count(Object.values(s.ncs)) },
    { key: 'analyses', label: 'atelier 5 Pourquoi', many: 'ateliers 5 Pourquoi', tool: '5.3', n: count(Object.values(s.analyses)) },
    { key: 'pokas', label: 'détrompeur', tool: '5.4', n: count(Object.values(s.pokas)) },
    { key: 'investigation', label: 'point de contrôle d’enquête', many: 'points de contrôle d’enquête', tool: '2.3', n: count(s.params?.investigation?.map(x => ({ processId: x.process }))) },
    { key: 'library', label: 'suggestion de fonction clé', many: 'suggestions de fonction clé', tool: '4.1', n: count((s.params?.power?.library || []).map(x => ({ processId: x.process }))) },
    { key: 'called', label: 'étape qui appelle un logigramme de ce processus', many: 'étapes qui appellent un logigramme de ce processus', tool: '1.4',
      n: Object.values(s.flows || {}).filter(f => f.processId !== id).reduce((n, f) => n + f.steps.filter(st => st.kind === 'subprocess' && s.flows[st.flowId || '']?.processId === id).length, 0) },
  ];
  return out.filter(u => u.n > 0);
}
// The last process is never deleted: a company without any would leave every list of processes of the other tools empty
export const canDeleteProcess = (s: State, id: string) => s.processes.length > 1 && s.processes.some(p => p.id === id) && !processUsage(s, id).length;
// Deletes the process and its own flowcharts; false (nothing changed) when other records still point to it
export function deleteProcess(d: State, id: string): boolean {
  if (!canDeleteProcess(d, id)) return false;
  d.processes = d.processes.filter(p => p.id !== id);
  Object.values(d.flows || {}).filter(f => f.processId === id).forEach(f => { delete d.flows[f.id]; });
  // the inputs and outputs of the other processes that came from it or went to it keep their words, without the link
  d.processes.forEach(p => [...(p.inputs || []), ...(p.outputs || [])].forEach(x => { if (x.processId === id) delete x.processId; }));
  Object.values(d.flows || {}).forEach(f => [...(f.inputs || []), ...(f.outputs || [])].forEach(x => { if (x.processId === id) delete x.processId; }));
  return true;
}
// Moves every record of the other tools from a process to another (the step before deleting a used process)
export function reassignProcess(d: State, from: string, to: string): number {
  if (from === to || !d.processes.some(p => p.id === to)) return 0;
  let n = 0;
  const move = (xs: { processId: string }[] | undefined) => (xs || []).forEach(x => { if (x.processId === from) { x.processId = to; n++; } });
  [d.risks, d.complaints, d.sops, d.powers, d.skills, d.ncs, d.analyses, d.pokas, d.kpis].forEach(c => move(Object.values(c)));
  move(d.ged?.folders);
  // the settings that name a process: the points of the complaint investigation (2.3) and the suggestions of key functions (4.1)
  [...(d.params?.investigation || []), ...(d.params?.power?.library || [])].forEach(x => { if (x.process === from) { x.process = to; n++; } });
  Object.values(d.people).forEach(x => { if (x.processIds?.includes(from)) { x.processIds = [...new Set(x.processIds.map(i => (i === from ? to : i)))]; n++; } });
  const src = d.processes.find(p => p.id === from), dst = d.processes.find(p => p.id === to);
  if (src && dst) { dst.kpiIds = [...new Set([...dst.kpiIds, ...src.kpiIds])]; src.kpiIds = []; }
  // the flowcharts of this process that another process calls (the same condition as processUsage); the set is read before anything moves
  const called = new Set<string>();
  Object.values(d.flows || {}).filter(f => f.processId !== from).forEach(f => f.steps.forEach(st => { if (st.kind === 'subprocess' && d.flows[st.flowId || '']?.processId === from) called.add(st.flowId!); }));
  called.forEach(fid => { d.flows[fid].processId = to; n++; });
  d.processes.forEach(p => [...(p.inputs || []), ...(p.outputs || [])].forEach(x => { if (x.processId === from) x.processId = to; }));
  Object.values(d.flows || {}).forEach(f => [...(f.inputs || []), ...(f.outputs || [])].forEach(x => { if (x.processId === from) x.processId = to; }));
  return n;
}

// Moves an indicator or a risk to another process (from the sheet of a process: attach one that exists, or send one away)
export function moveKpi(d: Pick<State, 'processes' | 'kpis'>, kpiId: string, to: string): boolean {
  const k = d.kpis[kpiId];
  if (!k || !d.processes.some(p => p.id === to)) return false;
  d.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(i => i !== kpiId); });
  d.processes.find(p => p.id === to)!.kpiIds.push(kpiId);
  k.processId = to;
  return true;
}
export function moveRisk(d: Pick<State, 'processes' | 'risks'>, riskId: string, to: string): boolean {
  const r = d.risks[riskId];
  if (!r || !d.processes.some(p => p.id === to)) return false;
  r.processId = to;
  return true;
}

// ---- flowcharts
export const newStep = (kind: StepKind = 'action', role = ''): FlowStep => ({ id: newId('st'), kind, label: '', role });
export function newFlow(processId: string, name = '', now = new Date()): Flow {
  return { id: newId('fl'), processId, name, trigger: '', steps: [newStep('start'), newStep('action'), newStep('end')], version: 1, updatedAt: isoDate(now), updatedBy: '', history: [] };
}
// The exits of a step: where each arrow goes ('' = nowhere yet). Steps are read in order: no goto means the next step of the list.
export interface Exit { to: string; label: string }
// The outcomes of a decision: its own, or "Oui" and "Non" of the first version
export const branchesOf = (st: Pick<FlowStep, 'branches' | 'yes' | 'no'>): FlowBranch[] => (st.branches?.length ? st.branches : [{ label: 'Oui', to: st.yes || '' }, { label: 'Non', to: st.no || '' }]);
export function exitsOf(f: Pick<Flow, 'steps'>, i: number): Exit[] {
  const st = f.steps[i], next = f.steps[i + 1]?.id || '';
  if (st.kind === 'end') return [];
  if (st.kind === 'decision') return branchesOf(st).map((b, k) => ({ to: b.to || (k === 0 ? next : ''), label: b.label }));
  return [{ to: st.goto || next, label: '' }];
}

// ---- links to the other tools
// The tools whose records a step can point to (the others are linked as a whole tool), with the name of one record in a sentence
export const LINK_KINDS: Record<string, string> = { '1.1': 'indicateur', '1.2': 'risque', '1.3': 'contact', '3.1': 'fournisseur', '3.2': 'instruction', '3.3': 'équipement', '4.1': 'fonction clé', '4.2': 'compétence' };
export interface LinkItem { id: string; label: string; mine?: boolean }   // mine: it belongs to the process the link is written for
// Where the records of a tool are and how one is named
const LINK_SRC: Record<string, { xs(s: State): Record<string, any>; label(x: any): string }> = {
  '1.1': { xs: s => s.kpis, label: k => k.name }, '1.2': { xs: s => s.risks, label: r => r.title },
  '1.3': { xs: s => s.contacts, label: c => `${c.name}${c.role ? ` · ${c.role}` : c.company ? ` · ${c.company}` : ''}` }, '3.1': { xs: s => s.suppliers, label: x => x.name },
  '3.2': { xs: s => s.sops, label: x => `${x.poste}${x.operation ? ` · ${x.operation}` : ''}` }, '3.3': { xs: s => s.equipments, label: x => x.name },
  '4.1': { xs: s => s.powers, label: x => x.power }, '4.2': { xs: s => s.skills, label: x => x.name },
};
export function linkItems(s: State, tool: string, processId = ''): LinkItem[] {
  const src = LINK_SRC[tool];
  if (!src) return [];
  const eq = new Set(s.processes.find(p => p.id === processId)?.equipmentIds || []);
  const mine = (x: { id: string; processId?: string }) => !!processId && (tool === '1.3' || tool === '3.1' ? false : tool === '3.3' ? eq.has(x.id) : x.processId === processId);
  return Object.values(src.xs(s)).map(x => ({ id: x.id as string, label: src.label(x) || 'Sans nom', mine: mine(x) })).sort((a, b) => Number(b.mine) - Number(a.mine) || byFr(a.label, b.label));
}
// null: the record is gone ('' for a link to a whole tool); read straight by its id
export const linkLabel = (s: State, l: FlowLink): string | null => {
  if (!l.id) return '';
  const src = LINK_SRC[l.tool], x = src && Object.hasOwn(src.xs(s), l.id) ? src.xs(s)[l.id] : undefined;
  return x ? src.label(x) || 'Sans nom' : null;
};
// The links of a step as they were written in the first version (one tool, one indicator, one risk), moved into the list of links
const legacyLinks = (o: Record<string, any>): FlowLink[] => [
  ...(typeof o.toolId === 'string' && o.toolId ? [{ tool: o.toolId }] : []), ...(typeof o.kpiId === 'string' && o.kpiId ? [{ tool: '1.1', id: o.kpiId }] : []), ...(typeof o.riskId === 'string' && o.riskId ? [{ tool: '1.2', id: o.riskId }] : []),
];
// The flowchart with each role that is a skill or a person read again from it (a rename in 4.2 or in the staff list is carried to the lanes)
export const withRoles = (f: Flow, s: Pick<State, 'skills' | 'people'>): Flow => ({
  ...f, steps: f.steps.map(st => { const n = st.roleRef ? (st.roleRef.kind === 'skill' ? s.skills[st.roleRef.id]?.name : s.people[st.roleRef.id]?.name) : ''; return n ? { ...st, role: n } : st; }),
});
// The flowcharts that call this one as a sub-process
export const callersOf = (s: Pick<State, 'flows'>, id: string) => Object.values(s.flows || {}).filter(f => f.id !== id && f.steps.some(st => st.kind === 'subprocess' && st.flowId === id)).sort((a, b) => byFr(a.name, b.name));

// A call that comes back to the flowchart through other flowcharts (A calls B, B calls A): the chain from this flowchart, and the step that starts it. A direct self-call is another message.
function callCycle(s: Pick<State, 'flows'>, f: Flow): { stepId: string; names: string[] } | null {
  const dead = new Set<string>(), name = (x: Flow) => x.name.trim() || 'sans nom';
  const walk = (cur: Flow, path: Flow[]): Flow[] | null => {
    for (const st of cur.steps) {
      const t = st.kind === 'subprocess' && st.flowId ? s.flows?.[st.flowId] : undefined;
      if (!t || t.id === cur.id) continue;
      if (t.id === f.id) return [...path, t];
      if (dead.has(t.id) || path.some(x => x.id === t.id)) continue;
      const r = walk(t, [...path, t]);
      if (r) return r;
    }
    dead.add(cur.id);
    return null;
  };
  const chain = walk(f, [f]);
  return chain ? { stepId: f.steps.find(st => st.kind === 'subprocess' && st.flowId === chain[1].id)?.id || '', names: chain.map(name) } : null;
}
export interface FlowIssue { stepId: string; text: string }
export function flowIssues(f: Flow, s?: State): FlowIssue[] {
  const out: FlowIssue[] = [], ids = new Set(f.steps.map(x => x.id)), at = (i: number) => f.steps[i].label.trim() || `étape ${i + 1}`;
  if (!f.steps.length) return [{ stepId: '', text: 'Aucune étape' }];
  if (f.steps[0].kind !== 'start') out.push({ stepId: f.steps[0].id, text: 'La première étape doit être un début' });
  if (!f.steps.some(x => x.kind === 'end')) out.push({ stepId: '', text: 'Aucune fin : où le processus s’arrête-t-il ?' });
  f.steps.forEach((st, i) => {
    if (st.kind === 'start' && i > 0) out.push({ stepId: st.id, text: `${at(i)} : un début est toujours la première étape, et il n’y en a qu’un` });
    if (!st.label.trim()) out.push({ stepId: st.id, text: `${at(i)} : intitulé vide` });
    if (!st.role.trim() && st.kind !== 'start' && st.kind !== 'end') out.push({ stepId: st.id, text: `${at(i)} : qui la fait ?` });
    if (st.kind === 'decision') {
      const br = branchesOf(st);
      if (br.length < 2) out.push({ stepId: st.id, text: `${at(i)} : une décision a au moins deux réponses` });
      br.forEach((b, k) => {
        if (!b.label.trim()) out.push({ stepId: st.id, text: `${at(i)} : une réponse n’a pas de nom` });
        else if (!b.to && k > 0) out.push({ stepId: st.id, text: `${at(i)} : ${b.label.trim().toLowerCase() === 'non' ? 'que se passe-t-il si la réponse est non ?' : `que se passe-t-il pour « ${b.label.trim()} » ?`}` });
      });
      // two answers with the same name, or that go to the same step
      const names = br.map(b => b.label.trim().toLowerCase()).filter(Boolean), goes = exitsOf(f, i).map(e => e.to).filter(Boolean);
      if (new Set(names).size < names.length) out.push({ stepId: st.id, text: `${at(i)} : deux réponses portent le même nom` });
      if (new Set(goes).size < goes.length) out.push({ stepId: st.id, text: `${at(i)} : deux réponses mènent à la même étape` });
    }
    exitsOf(f, i).forEach((e, k) => {
      if (!e.to && st.kind === 'decision' && k === 0) out.push({ stepId: st.id, text: `${at(i)} : la première réponse (« ${branchesOf(st)[0].label.trim() || 'sans nom'} ») ne mène nulle part : choisir où elle va` });   // a decision that is the last step has no next one to fall back on
      if (e.to && !ids.has(e.to)) out.push({ stepId: st.id, text: `${at(i)} : la flèche pointe vers une étape qui n’existe plus` });
      else if (!e.to && st.kind !== 'decision') out.push({ stepId: st.id, text: `${at(i)} : où va la flèche ensuite ? Ajouter une étape Fin, ou choisir « Puis aller à » dans ses détails` });   // a last step that is not an end
    });
    if (st.kind === 'subprocess' && st.flowId && s && !s.flows?.[st.flowId]) out.push({ stepId: st.id, text: `${at(i)} : logigramme appelé introuvable` });
    if (st.kind === 'subprocess' && !st.flowId) out.push({ stepId: st.id, text: `${at(i)} : quel logigramme appelle-t-elle ? À choisir dans ses détails` });
    if (st.kind === 'subprocess' && st.flowId === f.id) out.push({ stepId: st.id, text: `${at(i)} : un logigramme ne peut pas s’appeler lui-même` });
    if (s && st.roleRef && !(st.roleRef.kind === 'skill' ? s.skills[st.roleRef.id] : s.people[st.roleRef.id])) out.push({ stepId: st.id, text: `${at(i)} : ${st.roleRef.kind === 'skill' ? 'la compétence' : 'la personne'} choisie pour la faire n’existe plus` });
    if (s) (st.links || []).forEach(l => { if (l.id && linkLabel(s as State, l) === null) out.push({ stepId: st.id, text: `${at(i)} : ${LINK_KINDS[l.tool] || 'élément'} lié introuvable` }); });
  });
  const cyc = s ? callCycle(s, f) : null;
  if (cyc) out.push({ stepId: cyc.stepId, text: `appel circulaire : ${cyc.names.join(' -> ')}` });
  // steps that no arrow reaches from the start
  const seen = new Set<string>(), todo = [f.steps[0].id];
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const i = f.steps.findIndex(x => x.id === id);
    if (i >= 0) exitsOf(f, i).forEach(e => { if (e.to) todo.push(e.to); });
  }
  // a loop that no arrow leaves: the process never stops
  if (f.steps.some(x => x.kind === 'end') && !f.steps.some(x => x.kind === 'end' && seen.has(x.id))) out.push({ stepId: '', text: 'Aucun chemin n’arrive à une fin : le processus tourne sans s’arrêter' });
  f.steps.forEach((st, i) => { if (!seen.has(st.id)) out.push({ stepId: st.id, text: `${at(i)} : aucune flèche n’y mène. La relier depuis une étape (« Puis aller à ») ou la supprimer` }); });
  return out;
}

// The diagram drawn from the list: one column per role, one row per step; an arrow to a step that does not follow goes down a channel on the side of the diagram
export const LAYOUT = { laneW: 210, rowH: 84, nodeW: 160, nodeH: 46, head: 34, pad: 16 };
export interface Laid { left: number; lanes: string[]; nodes: { id: string; i: number; x: number; y: number; w: number; h: number; lane: number }[]; edges: { from: string; to: string; label: string; d: string; lx: number; ly: number; back: boolean }[]; width: number; height: number }
export function layoutFlow(f: Pick<Flow, 'steps'>): Laid {
  const { laneW, rowH, nodeW, nodeH, head, pad } = LAYOUT;
  // the lane of a step is its role; a start sits in the lane of the first step that has one, an end in the lane of the step that leads to it (so a "no" that ends the process stays where it was decided)
  const own = (st: FlowStep) => (st.kind === 'start' || st.kind === 'end' ? '' : st.role.trim());
  const lead = (i: number) => f.steps.findIndex((_, j) => j !== i && exitsOf(f, j).some(e => e.to === f.steps[i].id));
  const nameOf = (i: number, depth = 0): string => {
    const st = f.steps[i], r = own(st);
    if (r) return r;
    if (st.kind === 'start') return f.steps.slice(i + 1).map(own).find(Boolean) || '';
    const p = lead(i);
    if (p >= 0 && depth < 6) return nameOf(p, depth + 1);
    return f.steps.slice(0, i).map(own).reverse().find(Boolean) || '';
  };
  const names = f.steps.map((_, i) => nameOf(i) || 'Sans rôle'), lanes = [...new Set(names)];
  const laneIndex = (i: number) => lanes.indexOf(names[i]);
  // room on the left for the channels of the backward arrows: one per arrow that goes back
  const backs = f.steps.reduce((n, _, i) => n + exitsOf(f, i).filter(e => e.to && f.steps.findIndex(x => x.id === e.to) <= i).length, 0);
  const left = pad + 14 + 12 * Math.max(1, backs);
  const nodes = f.steps.map((st, i) => {
    const lane = laneIndex(i);
    return { id: st.id, i, lane, w: nodeW, h: st.kind === 'decision' ? nodeH + 14 : st.kind === 'subprocess' ? nodeH + 12 : nodeH, x: left + lane * laneW + (laneW - nodeW) / 2, y: head + pad + i * rowH };
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  const right = left + lanes.length * laneW;
  let fwd = 0, back = 0;
  const side: Record<string, number> = {};   // arrows that leave one decision by the side: their words are stacked, not written over each other
  const edges: Laid['edges'] = [];
  f.steps.forEach((_, i) => {
    exitsOf(f, i).forEach(e => {
      const a = nodes[i], b = byId.get(e.to);
      if (!b) return;
      const ax = a.x + a.w / 2, bx = b.x + b.w / 2, ay = a.y + a.h, by = b.y;
      let d: string, lx: number, ly: number, isBack = false;
      if (b.i === a.i + 1) {   // straight down, with a bend when the lane changes
        const my = ay + (by - ay) / 2;
        d = `M${ax} ${ay} V${my} H${bx} V${by}`; lx = (ax + bx) / 2 + (ax === bx ? 10 : 0); ly = ay + 12;
      } else if (b.i > a.i) {   // forward but not next: channel on the right
        const cx = right + 14 + 12 * fwd++;
        d = `M${a.x + a.w} ${a.y + a.h / 2} H${cx} V${b.y + b.h / 2} H${b.x + b.w}`; lx = a.x + a.w + 6; ly = a.y + a.h / 2 - 5 - 15 * (side[a.id] = (side[a.id] ?? -1) + 1);
      } else {   // backward (a loop): channel on the left
        isBack = true;
        const cx = left - 14 - 12 * back++;
        d = `M${a.x} ${a.y + a.h / 2} H${cx} V${b.y + b.h / 2} H${b.x}`; lx = a.x - 30; ly = a.y + a.h / 2 - 6 - 15 * (side[`b${a.id}`] = (side[`b${a.id}`] ?? -1) + 1);
      }
      edges.push({ from: a.id, to: b.id, label: e.label, d, lx, ly, back: isBack });
    });
  });
  return { left, lanes, nodes, edges, width: right + 14 + 12 * fwd + pad, height: head + pad * 2 + f.steps.length * rowH };
}

// The steps (their numbers in the list) with an arrow to this step: they lose it when it is taken out, and fall back on the next step (a decision keeps the answer without a target)
export const arrowsInto = (steps: FlowStep[], id: string): number[] => steps.flatMap((x, i) => (x.id !== id && (x.goto === id || x.yes === id || x.no === id || x.branches?.some(b => b.to === id)) ? [i + 1] : []));
// Takes a step out of a list: the arrows that led to it (next-step overrides, answers of a decision, the first version's yes and no) are cleared, so none points to a step that is gone
export const removeStep = (steps: FlowStep[], id: string): FlowStep[] => steps.filter(x => x.id !== id).map(x => ({
  ...x, goto: x.goto === id ? undefined : x.goto, yes: x.yes === id ? undefined : x.yes, no: x.no === id ? undefined : x.no, branches: x.branches?.map(b => (b.to === id ? { ...b, to: '' } : b)),
}));

// Moves the step at `from` to the position `to` (a drag and drop of the list); arrows are by id, so they follow the step
export function moveStep<T>(steps: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= steps.length || to < 0 || to >= steps.length) return steps;
  const a = [...steps], [m] = a.splice(from, 1);
  a.splice(to, 0, m);
  return a;
}

// ---- versions of a flowchart: a version is kept when somebody saves one on purpose
export function saveVersion(f: Flow, by: string, note: string, now = new Date()): void {
  f.history = [...f.history, { version: f.version, at: f.updatedAt, by: f.updatedBy, note, name: f.name, trigger: f.trigger, steps: JSON.parse(JSON.stringify(f.steps)), ...(f.links ? { links: JSON.parse(JSON.stringify(f.links)) } : {}), sheet: sheetOf(f) }].slice(-MAX_HISTORY);
  f.version += 1; f.updatedAt = isoDate(now); f.updatedBy = by;
}
// The sheet of a flowchart (purpose, result, inputs, outputs, requirements), kept with each version
const SHEET = ['purpose', 'result', 'inputs', 'outputs', 'requirements'] as const;
const sheetOf = (f: Pick<Flow, typeof SHEET[number]>): FlowSheet => JSON.parse(JSON.stringify(Object.fromEntries(SHEET.filter(k => f[k] !== undefined).map(k => [k, f[k]]))));
// Puts an old version back as the current content (the content it replaces is kept as a version first)
export function restoreVersion(f: Flow, version: number, by: string, now = new Date()): boolean {
  const v = f.history.find(x => x.version === version);
  if (!v) return false;
  saveVersion(f, by, `Avant retour à la version ${version}`, now);
  f.name = v.name; f.trigger = v.trigger; f.steps = JSON.parse(JSON.stringify(v.steps)); f.links = v.links ? JSON.parse(JSON.stringify(v.links)) : undefined;
  // a version saved before the sheet was kept has none: the current sheet stays
  if (v.sheet) { const g = f as unknown as Record<string, unknown>, sh = JSON.parse(JSON.stringify(v.sheet)) as Record<string, unknown>; SHEET.forEach(k => { if (sh[k] === undefined) delete g[k]; else g[k] = sh[k]; }); }
  pruneStepReqs(f);
  return true;
}

// ---- review and alerts
export const reviewMonths = (s: Pick<State, 'params'>) => s.params?.map?.reviewMonths || 12;
export const reviewAge = (p: Process, now = new Date()) => (p.reviewedAt ? daysBetween(p.reviewedAt, now) : null);
export const reviewOld = (s: State, p: Process, now = new Date()) => { const a = reviewAge(p, now); return a === null || a > reviewMonths(s) * 30; };
export function reviewProcess(p: Process, by: string, note = '', now = new Date()): void {
  p.reviewedAt = isoDate(now); p.reviewedBy = by;
  p.reviews = [...(p.reviews || []), { at: isoDate(now), by, note }].slice(-MAX_REVIEWS);
}
export const personName = (s: Pick<State, 'people'>, id?: string) => (id && s.people[id]?.name) || '';
// A person who is named but no longer in the company (a pilot who left)
export const personGone = (s: Pick<State, 'people'>, id?: string) => !!id && !!s.people[id] && !s.people[id].active;
export interface ProcIssue { key: string; text: string; tone: 'warn' | 'bad' }
export function processIssues(s: State, p: Process, now = new Date()): ProcIssue[] {
  const out: ProcIssue[] = [], pilot = p.pilotId ? s.people[p.pilotId] : undefined, flows = flowsOf(s, p.id);
  if (!p.name.trim()) out.push({ key: 'name', tone: 'bad', text: 'Le processus n’a pas de nom' });
  if (!pilot) out.push({ key: 'pilot', tone: 'bad', text: p.pilotId ? 'Le pilote n’est plus dans la liste du personnel' : 'Pas de pilote' });
  else if (!pilot.active) out.push({ key: 'pilot', tone: 'bad', text: `${pilot.name} n’est plus dans l’entreprise : nommer un autre pilote` });
  if (p.deputyId) {
    const dep = s.people[p.deputyId];
    if (p.deputyId === p.pilotId) out.push({ key: 'deputy', tone: 'warn', text: 'Le suppléant est le pilote : nommer une autre personne' });
    else if (!dep || !dep.active) out.push({ key: 'deputy', tone: 'warn', text: dep ? `${dep.name} n’est plus dans l’entreprise : nommer un autre suppléant` : 'Le suppléant n’est plus dans la liste du personnel' });
  }
  if (!p.purpose?.trim()) out.push({ key: 'purpose', tone: 'warn', text: '« À quoi il sert » non rempli' });
  if (!p.trigger?.trim() || !p.result?.trim()) out.push({ key: 'trigger', tone: 'warn', text: '« Ce qui le déclenche » ou « Ce qu’il livre » non rempli' });
  const io = effectiveIo(s, p);
  if (!io.inputs.length || !io.outputs.length) out.push({ key: 'io', tone: 'warn', text: 'Entrées ou sorties non renseignées' });
  if (!flows.length) out.push({ key: 'flow', tone: 'warn', text: 'Aucun logigramme' });
  const broken = flows.reduce((n, f) => n + flowIssues(f, s).length, 0);
  if (broken) out.push({ key: 'flowissues', tone: 'warn', text: `${broken} point${broken > 1 ? 's' : ''} à corriger dans les logigrammes` });
  const kpiIds = p.kpiIds.filter(id => s.kpis[id]);   // an indicator that was deleted is no indicator
  if (!kpiIds.length) out.push({ key: 'kpi', tone: 'warn', text: 'Aucun indicateur' });
  else if (kpiIds.some(id => !s.kpis[id].targetValue && s.kpis[id].targetValue !== 0)) out.push({ key: 'target', tone: 'warn', text: 'Un indicateur sans cible' });
  const age = reviewAge(p, now);
  if (age === null) out.push({ key: 'review', tone: 'warn', text: 'Jamais relue' });
  else if (age > reviewMonths(s) * 30) out.push({ key: 'review', tone: 'bad', text: `Relue il y a plus de ${reviewMonths(s)} mois` });
  return out;
}
// Share of the checks of a sheet that are met (nine checks: a pilot who is here, a purpose, a trigger and a result, inputs and outputs, a flowchart that holds, an indicator with a target, a fresh review)
export function completeness(s: State, p: Process, now = new Date()): number {
  const keys = new Set(processIssues(s, p, now).map(i => i.key));
  const checks = ['pilot', 'purpose', 'trigger', 'io', 'flow', 'flowissues', 'kpi', 'target', 'review'];
  return Math.round(checks.filter(k => !keys.has(k)).length / checks.length * 100);
}
// Flowcharts whose process is gone (a deleted or unknown code): no sheet shows them
export const lostFlows = (s: Pick<State, 'flows' | 'processes'>): Flow[] => Object.values(s.flows || {}).filter(f => !s.processes.some(p => p.id === f.processId)).sort((a, b) => byFr(a.name, b.name));
export interface MapSummary { started: boolean; count: number; noPilot: number; noFlow: number; old: number; issues: number; pct: number | null; lost: number }
export function mapSummary(s: State, now = new Date()): MapSummary {
  const ps = s.processes, is = ps.map(p => processIssues(s, p, now));
  const has = (i: ProcIssue[], k: string) => i.some(x => x.key === k);
  return {
    started: Object.keys(s.flows || {}).length > 0 || ps.some(p => p.pilotId || p.purpose?.trim() || p.inputs?.length || p.reviewedAt),
    count: ps.length, noPilot: is.filter(i => has(i, 'pilot')).length, noFlow: is.filter(i => has(i, 'flow')).length, old: is.filter(i => has(i, 'review')).length,
    issues: is.reduce((n, i) => n + i.length, 0), pct: ps.length ? Math.round(ps.reduce((n, p) => n + completeness(s, p, now), 0) / ps.length) : null, lost: lostFlows(s).length,
  };
}

// ---- rights (per person; the accounts themselves are set up by the cabinet, this is only the table the screens read; the name is the one chosen in the settings)
export const rightKey = (name: string) => name.trim().toLowerCase();
export const rightOf = (s: Pick<State, 'params'>, who: string): MapRight => {
  const t = s.params?.map?.rights;
  return !t || !Object.keys(t).length ? 'admin' : t[rightKey(who)] ?? 'view';
};
const sameName = (a: string, b: string) => !!a.trim() && rightKey(a) === rightKey(b);
// the pilot and the deputy edit the sheet while they are in the company: somebody who left no longer does
const activeName = (s: Pick<State, 'people'>, id?: string) => { const x = id ? s.people[id] : undefined; return x?.active ? x.name : ''; };
export const isPilotOf = (s: State, p: Process, who: string) => sameName(activeName(s, p.pilotId), who) || sameName(activeName(s, p.deputyId), who);
export const canEditProcess = (s: State, p: Process, who: string) => { const r = rightOf(s, who); return r === 'admin' || (r === 'own' && isPilotOf(s, p, who)); };
export const canAdmin = (s: State, who: string) => rightOf(s, who) === 'admin';
// The team (right "view") sees a hideable block only when the company shows it
// teamView (the "Vue équipe" switch) reads as the right "view". The notes of a process belong to those who have rights on it: its pilot, its deputy, the administrators (the right "own" does not open the notes of the others)
export function canSee(s: State, who: string, block: MapHideable, o: { team?: boolean; process?: Process } = {}): boolean {
  const r = rightOf(s, who), shown = !!s.params?.map?.shown?.includes(block);
  if (block === 'notes' && o.process) {
    const priv = r === 'admin' || (r !== 'none' && isPilotOf(s, o.process, who));
    return priv && !o.team ? true : (r === 'view' || priv) && shown;
  }
  return (r !== 'view' && !o.team) || shown;
}
// Why somebody who cannot edit cannot: said in words
export function readOnlyReason(s: State, who: string): string {
  if (!who.trim()) return "Aucun nom n'est renseigné dans les réglages : la fiche est en lecture seule.";
  const r = rightOf(s, who);
  return r === 'view' ? 'Votre droit est « Consulter » : la fiche est en lecture seule.' : 'Seuls le pilote, son suppléant (tant qu’ils sont dans l’entreprise) et les administrateurs modifient cette fiche.';
}
// Gives or takes a right. The first right given to somebody else also makes the person who gives it an administrator (without it she would become a simple reader and lock herself out),
// and the last administrator is never removed. Returns '' when done, the reason when not.
export function setMapRight(d: Pick<State, 'params'>, author: string, name: string, right: MapRight | ''): string {
  if (!author.trim()) return "Renseignez d'abord votre nom dans les réglages : les droits se donnent à partir de votre nom.";
  const m = (d.params.map ||= {}), t = { ...(m.rights || {}) }, k = rightKey(name), first = !Object.keys(t).length;
  if (t[k] === 'admin' && right !== 'admin' && Object.values(t).filter(r => r === 'admin').length <= 1 && !first) return 'Il faut garder au moins un administrateur.';
  if (first && right && right !== 'admin' && rightKey(author) === k) return 'Vous seriez le seul à pouvoir administrer : donnez d’abord un droit à une autre personne, ou gardez « Administrer » pour vous.';
  if (right) t[k] = right; else delete t[k];
  if (first && right && rightKey(author) !== k) t[rightKey(author)] = 'admin';
  m.rights = Object.keys(t).length ? t : undefined;
  return '';
}
// Rights written for a name that is no longer in the staff list (a person who left or was renamed): shown so that they can be taken back
export const orphanRights = (s: Pick<State, 'params' | 'people'>) => Object.keys(s.params?.map?.rights || {}).filter(k => !Object.values(s.people).some(x => x.active && rightKey(x.name) === k));
// What stops a one-click review: a point in red other than the review itself
export const reviewBlockers = (s: State, p: Process, now = new Date()) => processIssues(s, p, now).filter(i => i.tone === 'bad' && i.key !== 'review');
// ---- what a process holds is what its flowcharts hold: the precise facts are written in each flowchart, the sheet of the process gathers them (and keeps its own for what is in no flowchart)
export interface Sourced<T> { item: T; flows: Flow[]; via?: Process }   // flows: the flowcharts the item comes from (none: written on the sheet of the process)
export const sameIo = (a: MapIo, b: MapIo) => a.what.trim().toLowerCase() === b.what.trim().toLowerCase() && a.party.trim().toLowerCase() === b.party.trim().toLowerCase() && (a.processId || '') === (b.processId || '');
function gather<T>(manual: T[] | undefined, flows: Flow[], of: (f: Flow) => T[] | undefined, same: (a: T, b: T) => boolean, blank: (x: T) => boolean): Sourced<T>[] {
  const out: Sourced<T>[] = [];
  const add = (item: T, flow?: Flow) => { if (blank(item)) return; const hit = out.find(o => same(o.item, item)); if (hit) { if (flow && !hit.flows.includes(flow)) hit.flows.push(flow); } else out.push({ item, flows: flow ? [flow] : [] }); };
  (manual || []).forEach(x => add(x));
  flows.forEach(f => (of(f) || []).forEach(x => add(x, f)));
  return out;
}
export function effectiveIo(s: Pick<State, 'flows'>, p: Pick<Process, 'id' | 'inputs' | 'outputs'>): { inputs: Sourced<MapIo>[]; outputs: Sourced<MapIo>[] } {
  const fl = flowsOf(s, p.id), blank = (x: MapIo) => !x.what.trim();
  return { inputs: gather(p.inputs, fl, f => f.inputs, sameIo, blank), outputs: gather(p.outputs, fl, f => f.outputs, sameIo, blank) };
}
// The requirements of a process: its own and those of its flowcharts, then those that other processes marked as applying to every process (via: where it is written)
export const sameReq = (a: MapReq, b: MapReq) => a.kind === b.kind && a.text.trim().toLowerCase() === b.text.trim().toLowerCase();
// The lines written on the sheet of a process that its flowcharts already say: they show twice. Indexes in the sheet's own lists.
export function flowDuplicates(s: Pick<State, 'flows'>, p: Pick<Process, 'id' | 'inputs' | 'outputs' | 'requirements'>): { inputs: number[]; outputs: number[]; requirements: number[] } {
  const fl = flowsOf(s, p.id), at = <T,>(rows: T[] | undefined, of: (f: Flow) => T[] | undefined, same: (a: T, b: T) => boolean) => (rows || []).flatMap((r, i) => (fl.some(f => (of(f) || []).some(x => same(x, r))) ? [i] : []));
  return { inputs: at(p.inputs, f => f.inputs, sameIo), outputs: at(p.outputs, f => f.outputs, sameIo), requirements: at(p.requirements, f => f.requirements, sameReq).filter(i => !p.requirements![i].all) };   // a requirement ticked "Tous les processus" stays: it is shown on every sheet from here
}
export function dropFlowDuplicates(s: Pick<State, 'flows'>, p: Process): void {
  const d = flowDuplicates(s, p);
  (['inputs', 'outputs', 'requirements'] as const).forEach(k => { if (d[k].length) { const keep = ((p[k] || []) as unknown[]).filter((_, i) => !d[k].includes(i)); (p as unknown as Record<string, unknown>)[k] = keep.length ? keep : undefined; } });
}
export function effectiveRequirements(s: Pick<State, 'flows' | 'processes'>, p: Pick<Process, 'id' | 'requirements'>): Sourced<MapReq>[] {
  const same = sameReq, blank = (x: MapReq) => !x.text.trim();
  const out = gather(p.requirements, flowsOf(s, p.id), f => f.requirements, same, blank);
  (s.processes || []).filter(q => q.id !== p.id).forEach(q => gather(q.requirements, flowsOf(s, q.id), f => f.requirements, same, blank).filter(x => x.item.all).forEach(x => { if (!out.some(o => same(o.item, x.item))) out.push({ item: x.item, flows: [], via: q }); }));
  return out;
}
// What the steps of the flowcharts of a process use: the equipment they are linked to (as a whole or by a step) and the documents they name
export function flowResources(s: Pick<State, 'flows' | 'equipments'>, p: Pick<Process, 'id' | 'equipmentIds'>): { equipments: { id: string; flows: Flow[] }[]; docs: { text: string; flows: Flow[] }[] } {
  const equipments = new Map<string, Flow[]>(), docs = new Map<string, Flow[]>(), push = (m: Map<string, Flow[]>, k: string, f: Flow) => { const a = m.get(k) || []; if (!a.includes(f)) a.push(f); m.set(k, a); };
  flowsOf(s, p.id).forEach(f => {
    (f.links || []).forEach(l => { if (l.tool === '3.3' && l.id && s.equipments[l.id]) push(equipments, l.id, f); });
    f.steps.forEach(st => { (st.links || []).forEach(l => { if (l.tool === '3.3' && l.id && s.equipments[l.id]) push(equipments, l.id, f); }); if (st.doc?.trim()) push(docs, st.doc.trim(), f); });
  });
  return { equipments: [...equipments].map(([id, flows]) => ({ id, flows })), docs: [...docs].map(([text, flows]) => ({ text, flows })) };
}

// What goes from one process to another, from the inputs and outputs written on the flowcharts and the sheets: one line per direction, with what travels
export function exchanges(s: Pick<State, 'processes' | 'flows'>): { from: string; to: string; what: string[] }[] {
  const out = new Map<string, { from: string; to: string; what: string[] }>(), ids = new Set(s.processes.map(p => p.id)), rank = new Map(sortedProcesses(s).map((p, i) => [p.id, i]));
  // the same thing written with another case or a space around it is one thing
  const add = (from: string, to: string, what: string) => { if (from === to || !ids.has(from) || !ids.has(to)) return; const k = `${from}>${to}`, e = out.get(k) || { from, to, what: [] }; if (!e.what.some(w => w.toLowerCase() === what.trim().toLowerCase())) e.what.push(what.trim()); out.set(k, e); };
  s.processes.forEach(p => { const io = effectiveIo(s, p); io.inputs.forEach(x => x.item.processId && add(x.item.processId, p.id, x.item.what)); io.outputs.forEach(x => x.item.processId && add(p.id, x.item.processId, x.item.what)); });
  return [...out.values()].sort((a, b) => rank.get(a.from)! - rank.get(b.from)! || rank.get(a.to)! - rank.get(b.to)!);   // in the order of the map (P2 before P10)
}
// The requirements written on the flowcharts of a process that no step meets
// Counted like the badge of the sheet (stepCountFor): one requirement is its kind and its words, whatever the flowcharts that write it
export const reqGaps = (s: Pick<State, 'flows'>, processId: string): number => {
  const fl = flowsOf(s, processId), seen = new Set<string>();
  return fl.flatMap(f => f.requirements || []).filter(r => { const k = `${r.kind}|${r.text.trim().toLowerCase()}`; if (!r.text.trim() || seen.has(k)) return false; seen.add(k); return stepCountFor(fl, r) === 0; }).length;
};
// The flowcharts of a process that flowcharts of OTHER processes call as a sub-process: what the process gives to the others, with who calls it
export function sharedFlows(s: Pick<State, 'flows' | 'processes'>, processId: string): { flow: Flow; callers: Flow[] }[] {
  return flowsOf(s, processId).map(flow => ({ flow, callers: callersOf(s, flow.id).filter(c => c.processId !== processId) })).filter(x => x.callers.length > 0);
}
// The flowcharts of other processes that a process calls as a sub-process
export function borrowedFlows(s: Pick<State, 'flows'>, processId: string): { flow: Flow; callers: Flow[] }[] {
  const mine = flowsOf(s, processId), out = new Map<string, Flow[]>();
  mine.forEach(f => f.steps.forEach(st => { const t = st.kind === 'subprocess' && st.flowId ? s.flows[st.flowId] : undefined; if (t && t.processId !== processId) out.set(t.id, [...(out.get(t.id) || []).filter(x => x !== f), f]); }));
  return [...out].map(([id, callers]) => ({ flow: s.flows[id], callers }));
}
// The processes a process exchanges with, by name: those it takes from or gives to, and those that name it
export function partnersOf(s: Pick<State, 'processes' | 'flows'>, p: Process): Process[] {
  const ioOf = (q: Process) => { const e = effectiveIo(s, q); return [...e.inputs, ...e.outputs].map(x => x.item); };
  const ids = new Set(ioOf(p).map(x => x.processId).filter((x): x is string => !!x));
  s.processes.forEach(q => { if (ioOf(q).some(x => x.processId === p.id)) ids.add(q.id); });
  ids.delete(p.id);
  return sortedProcesses(s).filter(q => ids.has(q.id));
}
export const adminCount = (s: Pick<State, 'params'>) => Object.values(s.params?.map?.rights || {}).filter(r => r === 'admin').length;

// A sheet read from data of another version: only the fields the screens use, with the right types
export function soundProcess(p: Process): Process {
  const io = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is { what: string; party: string; processId?: string } => !!x && typeof x === 'object').map(x => ({ ...x, what: text(x.what), party: text(x.party) })) : undefined);
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);
  const o: Process = { ...p, id: text(p.id), name: text(p.name), color: text(p.color), order: typeof p.order === 'number' && Number.isFinite(p.order) ? p.order : 0 };
  (['purpose', 'pilotId', 'deputyId', 'trigger', 'result', 'notes', 'reviewedAt', 'reviewedBy'] as const).forEach(k => { if (o[k] !== undefined && typeof o[k] !== 'string') delete o[k]; });
  if (o.band !== undefined && !BANDS.some(b => b.key === o.band)) delete o.band;
  const inputs = io(p.inputs), outputs = io(p.outputs);
  inputs ? (o.inputs = inputs) : delete o.inputs; outputs ? (o.outputs = outputs) : delete o.outputs;
  const sw = strs(p.software), eq = strs(p.equipmentIds), dc = strs(p.docs);
  const links = Array.isArray(p.docLinks) ? p.docLinks.filter(l => l && typeof l === 'object' && typeof l.tool === 'string' && l.tool).map(l => ({ tool: l.tool, ...(typeof l.id === 'string' && l.id ? { id: l.id } : {}) })) : undefined;
  links?.length ? (o.docLinks = links) : delete o.docLinks;
  delete (o as { swot?: unknown }).swot;                                   // the SWOT of an earlier version is dropped
  sw ? (o.software = sw) : delete o.software; eq ? (o.equipmentIds = eq) : delete o.equipmentIds; dc ? (o.docs = dc) : delete o.docs;
  if (p.requirements !== undefined) o.requirements = Array.isArray(p.requirements) ? p.requirements.filter(r => r && typeof r === 'object').map(r => ({ kind: REQ_KINDS.some(k => k.key === r.kind) ? r.kind : 'other', text: text(r.text), ...(r.all === true ? { all: true } : {}) })) : [];
  if (p.reviews !== undefined) o.reviews = Array.isArray(p.reviews) ? p.reviews.filter(r => r && typeof r === 'object').map(r => ({ at: text(r.at), by: text(r.by), note: text(r.note) })) : [];
  return o;
}
// The settings of the map read from outside: a right that is not one is dropped, the months are a positive number (the structure and the key stay as they are)
export function soundMap(m: unknown): MapSettings | undefined {
  if (!m || typeof m !== 'object') return undefined;
  const x = m as Record<string, unknown>, o: MapSettings = { ...x };
  if (x.rights !== undefined) { const r = Object.entries(x.rights && typeof x.rights === 'object' ? x.rights : {}).filter(([, v]) => RIGHTS.some(q => q.key === v)); r.length ? (o.rights = Object.fromEntries(r) as Record<string, MapRight>) : delete o.rights; }
  if (x.shown !== undefined) { const h = Array.isArray(x.shown) ? x.shown.filter(v => HIDEABLE.some(q => q.key === v)) : []; h.length ? (o.shown = h as MapHideable[]) : delete o.shown; }
  if (x.reviewMonths !== undefined && !(typeof x.reviewMonths === 'number' && Number.isFinite(x.reviewMonths) && x.reviewMonths > 0)) delete o.reviewMonths;
  return o;
}
const ioList = (v: unknown) => (Array.isArray(v) && v.length ? v.filter((x): x is { what: string; party: string; processId?: string } => !!x && typeof x === 'object').map(x => ({ what: text(x.what), party: text(x.party), ...(typeof x.processId === 'string' && x.processId ? { processId: x.processId } : {}) })) : undefined);
const reqList = (v: unknown) => (Array.isArray(v) && v.length ? v.filter((x): x is { kind: string; text: string; all?: unknown; id?: unknown } => !!x && typeof x === 'object').map(x => ({ kind: (REQ_KINDS.some(k => k.key === x.kind) ? x.kind : 'other') as MapReq['kind'], text: text(x.text), ...(x.all === true ? { all: true } : {}), ...(typeof x.id === 'string' && x.id ? { id: x.id } : {}) })) : undefined);
export function soundFlow(id: string, f0: unknown): Flow {
  const x = (f0 && typeof f0 === 'object' ? f0 : {}) as Record<string, any>;
  const step = (st: any): FlowStep => {
    const o = (st && typeof st === 'object' ? st : {}) as Record<string, any>;
    const r: FlowStep = { id: text(o.id) || newId('st'), kind: STEP_KINDS.some(k => k.key === o.kind) ? o.kind : 'action', label: text(o.label), role: text(o.role) };
    (['goto', 'doc', 'flowId', 'note'] as const).forEach(k => { if (typeof o[k] === 'string' && o[k]) r[k] = o[k]; });
    // a decision of the first version (yes / no) becomes a decision with two outcomes; the links of the first version (one tool, one indicator, one risk) become links
    if (r.kind === 'decision') {
      const br = Array.isArray(o.branches) ? o.branches.filter((b: unknown) => b && typeof b === 'object').map((b: any) => ({ label: text(b.label), to: text(b.to) })) : [];
      r.branches = br.length ? br : [{ label: 'Oui', to: text(o.yes) }, { label: 'Non', to: text(o.no) }];
    }
    const links = [...(Array.isArray(o.links) ? o.links.filter((l: unknown) => l && typeof l === 'object' && typeof (l as FlowLink).tool === 'string' && (l as FlowLink).tool).map((l: any) => ({ tool: l.tool, ...(typeof l.id === 'string' && l.id ? { id: l.id } : {}) })) : []), ...legacyLinks(o)];
    if (links.length) r.links = links.filter((l, k) => links.findIndex(m => m.tool === l.tool && m.id === l.id) === k);
    if (o.control === true) r.control = true;
    if (Array.isArray(o.reqs)) { const k = o.reqs.filter((i: unknown) => typeof i === 'string' && i); if (k.length) r.reqs = k; }
    if (o.roleRef && typeof o.roleRef === 'object' && (o.roleRef.kind === 'skill' || o.roleRef.kind === 'person') && typeof o.roleRef.id === 'string' && o.roleRef.id) r.roleRef = { kind: o.roleRef.kind, id: o.roleRef.id };
    return r;
  };
  // two steps with the same id: the first keeps it (the arrows point to it), the next ones get a new one
  const steps = (v: unknown) => { const seen = new Set<string>(); return Array.isArray(v) ? v.map(step).map(st => { while (seen.has(st.id)) st = { ...st, id: newId('st') }; seen.add(st.id); return st; }) : []; };
  const out: Flow = {
    id: text(x.id) || id, processId: text(x.processId), name: text(x.name), trigger: text(x.trigger), ...(typeof x.ownerId === 'string' && x.ownerId ? { ownerId: x.ownerId } : {}),
    ...(Array.isArray(x.links) && x.links.some((l: any) => l && typeof l.tool === 'string' && l.tool) ? { links: x.links.filter((l: any) => l && typeof l === 'object' && typeof l.tool === 'string' && l.tool).map((l: any) => ({ tool: l.tool, ...(typeof l.id === 'string' && l.id ? { id: l.id } : {}) })) } : {}),
    ...(typeof x.purpose === 'string' && x.purpose ? { purpose: x.purpose } : {}), ...(typeof x.result === 'string' && x.result ? { result: x.result } : {}),
    ...(ioList(x.inputs) ? { inputs: ioList(x.inputs) } : {}), ...(ioList(x.outputs) ? { outputs: ioList(x.outputs) } : {}), ...(reqList(x.requirements) ? { requirements: withReqIds(reqList(x.requirements)!) } : {}),
    steps: steps(x.steps), version: typeof x.version === 'number' && x.version >= 1 ? Math.floor(x.version) : 1, updatedAt: text(x.updatedAt), updatedBy: text(x.updatedBy),
    history: Array.isArray(x.history) ? x.history.filter((v: any) => v && typeof v === 'object').map((v: any) => ({ version: typeof v.version === 'number' ? v.version : 0, at: text(v.at), by: text(v.by), note: text(v.note), name: text(v.name), trigger: text(v.trigger), steps: steps(v.steps), ...(v.sheet && typeof v.sheet === 'object' ? { sheet: { ...(typeof v.sheet.purpose === 'string' && v.sheet.purpose ? { purpose: v.sheet.purpose } : {}), ...(typeof v.sheet.result === 'string' && v.sheet.result ? { result: v.sheet.result } : {}), ...(ioList(v.sheet.inputs) ? { inputs: ioList(v.sheet.inputs) } : {}), ...(ioList(v.sheet.outputs) ? { outputs: ioList(v.sheet.outputs) } : {}), ...(reqList(v.sheet.requirements) ? { requirements: withReqIds(reqList(v.sheet.requirements)!) } : {}) } } : {}), ...(Array.isArray(v.links) && v.links.length ? { links: v.links.filter((l: any) => l && typeof l.tool === 'string' && l.tool).map((l: any) => ({ tool: l.tool, ...(typeof l.id === 'string' && l.id ? { id: l.id } : {}) })) } : {}) })) : [],
  };
  pruneStepReqs(out);
  return out;
}
