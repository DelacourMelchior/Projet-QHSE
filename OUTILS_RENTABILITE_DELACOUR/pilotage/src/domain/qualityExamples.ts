// Example records of tools 5.1 to 5.4, for the fictitious company of the demo (metal workshop, same people as the Plans B).
// Dates are relative to today so the example stays alive: decisions late, day-30 checks due, efficient devices.
import type { Action, Analysis, Nc, Poka, State } from './types';
import { isoDate } from './periods';

export function qualityExamples(today = new Date()) {
  const day = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  const ago = (n: number) => isoDate(day(n));
  const at = (n: number, h: number, m = 0) => `${ago(n)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const hoursAgo = (h: number) => { const d = new Date(today.getTime() - h * 3600000); return `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const y = today.getFullYear();
  const nc = (n: number, p: Partial<Nc>): Nc => ({
    id: `nc_demo_${n}`, ref: `NC-${y}-${String(n).padStart(3, '0')}`, at: at(20, 9), by: 'David K.', where: '', item: '', qty: null, description: '', cause: '', origin: 'interne',
    decision: '', decidedAt: '', decidedBy: '', decisionNote: '', processId: '', cost: { scrap: null, lostHours: null, reworkHours: null, logistics: null }, ...p,
  });
  const ncs: Nc[] = [
    nc(1, { at: at(75, 9, 30), by: 'Julien P.', where: 'Presse plieuse', item: 'Châssis 405, affaire Client A', qty: 1, description: 'Filetage M12 arraché au taraudage', cause: 'outillage', decision: 'rebut', decidedAt: at(75, 15), decidedBy: 'David K.', processId: 'P3', cost: { scrap: 180, lostHours: 3, reworkHours: null, logistics: null }, analysisId: 'an_demo_2' }),
    nc(2, { at: at(52, 11, 15), by: 'Karim T.', where: 'Poinçonneuse', item: 'Lot cornières 88 (50 pièces)', qty: 50, description: 'Perçages décalés de 2 mm et bavures', cause: 'reglage', decision: 'retouche', decidedAt: at(52, 16), decidedBy: 'Marc M.', processId: 'P3', cost: { scrap: null, lostHours: 1, reworkHours: 6, logistics: null }, analysisId: 'an_demo_2' }),
    nc(3, { at: at(40, 8, 40), by: 'Lucie B.', where: 'Montage armoires', item: 'Faisceau châssis 44, affaire Client C', qty: 1, description: 'Connecteurs gauche et droit inversés au montage', cause: 'methode', decision: 'retouche', decidedAt: at(40, 10), decidedBy: 'Antoine P.', processId: 'P3', cost: { scrap: 40, lostHours: 1, reworkHours: 2.5, logistics: 190 }, analysisId: 'an_demo_1' }),
    nc(4, { at: at(26, 14), by: 'Sophie V.', where: 'Réception', item: 'Tôle inox 3 mm, BL 884', qty: 12, description: 'Tôles rayées au déballage, film de protection absent', cause: 'matiere', origin: 'fournisseur', supplierId: 'sup_demo_acier', decision: 'retour', decidedAt: at(26, 17), decidedBy: 'Sophie V.', processId: 'P3', cost: { scrap: null, lostHours: 1.5, reworkHours: null, logistics: 60 } }),
    nc(5, { at: at(12, 10), by: 'Julien P.', where: 'Peinture', item: 'Portillons thermolaqués, affaire Client B', qty: 4, description: 'Défaut d\'aspect peinture sur 4 pièces (coulures)', cause: 'manipulation', origin: 'client', complaintId: 'cp_demo_2', decision: 'retouche', decidedAt: at(12, 16), decidedBy: 'David K.', processId: 'P5', cost: { scrap: 120, lostHours: null, reworkHours: 4, logistics: 85 } }),
    nc(6, { at: at(6, 9), by: 'Nicolas R.', where: 'Soudure', item: 'Cadre mécano-soudé, affaire Client A', qty: 2, description: 'Cordon de soudure non continu au contrôle visuel', cause: 'plan', decision: 'retouche', decidedAt: at(5, 8, 30), decidedBy: 'Marc M.', processId: '', cost: { scrap: null, lostHours: null, reworkHours: 3, logistics: null } }),
    nc(7, { at: hoursAgo(30), by: 'Karim T.', where: 'Presse plieuse', item: 'Équerres de fixation (20 pièces)', qty: 20, description: 'Angle de pliage à 92° au lieu de 90°', cause: 'reglage' }),
    nc(8, { at: hoursAgo(3), by: 'Lucie B.', where: 'Contrôle final', item: 'Platine inox, affaire Client C', qty: 3, description: 'Planéité hors tolérance (0,3 mm pour 0,15 mm)', cause: '' }),
  ];
  const analyses: Analysis[] = [
    {
      id: 'an_demo_1', ref: `5P-${y}-001`, date: ago(40), problem: 'Connecteurs gauche et droit inversés sur le faisceau du châssis 44 (court-circuit chez le client)',
      source: { kind: 'nc', id: 'nc_demo_3' }, processId: 'P3', participants: 'Lucie B. (monteuse), David K., Antoine P.', pilot: 'Marc M.',
      whys: ['Le connecteur droit a été inséré dans le logement gauche', 'Les deux connecteurs ont la même forme et la même taille', 'Le bureau d\'études a retenu la même référence pour simplifier les achats', 'Aucun détrompage n\'a été demandé à la conception', ''],
      rootCause: 'Aucun détrompeur physique : rien n\'empêche d\'inverser les connecteurs au montage', backCheck: true,
    },
    {
      id: 'an_demo_2', ref: `5P-${y}-002`, date: ago(51), problem: 'Perçages décalés de 2 mm sur un lot de 50 cornières',
      source: { kind: 'nc', id: 'nc_demo_2' }, processId: 'P3', participants: 'Karim T., David K., Antoine P.', pilot: 'David K.',
      whys: ['La butée de la poinçonneuse a bougé pendant la série', 'La butée se règle par une vis de serrage à la main', 'Rien ne repère la position de la butée', 'La butée d\'origine n\'a jamais été remplacée', ''],
      rootCause: 'Butée à serrage manuel sans repère ni cran : elle se dérègle sans que personne ne le voie', backCheck: true,
    },
    {
      id: 'an_demo_3', ref: `5P-${y}-003`, date: ago(10), problem: 'Défaut d\'aspect peinture sur 4 portillons livrés au Client B',
      source: { kind: 'complaint', id: 'cp_demo_2' }, processId: 'P5', participants: 'Julien P., Antoine P.', pilot: 'Antoine P.',
      whys: ['Des coulures sont apparues après cuisson', 'Les pièces ont été manipulées avant séchage complet', 'L\'opérateur a manqué d\'attention', '', ''],
      rootCause: 'L\'opérateur a manqué d\'attention', backCheck: false,
    },
  ];
  const pokas: Poka[] = [
    {
      id: 'pk_demo_1', analysisId: 'an_demo_1', processId: 'P3', poste: 'Montage armoires', defect: 'Connecteurs inversés au montage', level: 'detromper',
      description: 'Ergot asymétrique en plastique sur le connecteur droit', howItBlocks: 'Le connecteur droit ne rentre pas dans le logement gauche', cost: 35, owner: 'Marc M.',
      installedAt: ago(33), trained: true, bypassTested: true, check: { date: ago(2), produced: 420, defects: 0, inPlace: true, cadenceOk: true, note: 'Aucune inversion, ergot intact, pas de ralentissement', by: 'Antoine P.' },
    },
    {
      id: 'pk_demo_2', analysisId: 'an_demo_2', processId: 'P3', poste: 'Poinçonneuse', defect: 'Butée déréglée pendant la série', level: 'detromper',
      description: 'Butée crantée indexée par broche fixe', howItBlocks: 'La butée ne peut se placer que sur les crans prévus ; elle ne glisse plus', cost: 240, owner: 'David K.',
      installedAt: ago(34), trained: true, bypassTested: false, check: null,
    },
  ];
  const action = (id: string, ref: string, days: number, status: Action['status'], pilot: string, plan: Action['plan'], deadline: number, closed?: number): Action => ({
    id, kpiId: '', ref: { kind: 'analysis', id: ref }, period: ago(days).slice(0, 7), createdAt: ago(days), constat: '', whys: ['', '', '', '', ''],
    plan, pilot, deadline: ago(deadline), cost: null, status, closedAt: closed !== undefined ? ago(closed) : '',
  });
  const actions: Action[] = [
    action('act_demo_5p1', 'an_demo_1', 40, 'done', 'Marc M.', [{ dim: 'materiel', text: 'Poser un ergot asymétrique sur le connecteur droit', pilot: '' }, { dim: 'methode', text: 'Mettre à jour l\'instruction du poste montage (outil 3.2)', pilot: 'David K.' }], 34, 33),
    action('act_demo_5p2', 'an_demo_2', 51, 'done', 'David K.', [{ dim: 'materiel', text: 'Remplacer la butée par une butée crantée à broche', pilot: '' }], 44, 34),
    action('act_demo_5p3', 'an_demo_3', 10, 'to_start', 'Antoine P.', [{ dim: 'methode', text: 'Rappeler aux peintres de faire attention', pilot: '' }], -20),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { ncs: byId(ncs), analyses: byId(analyses), pokas: byId(pokas), actions: byId(actions) };
}

// Replaces the records of tools 5.1 to 5.4 by the examples (their actions too); the other tools are untouched
export function applyQualityExample(d: State, today = new Date()) {
  const ex = qualityExamples(today);
  Object.values(d.actions).filter(a => a.ref?.kind === 'analysis').forEach(a => { delete d.actions[a.id]; });
  d.ncs = ex.ncs;
  d.analyses = ex.analyses;
  d.pokas = ex.pokas;
  Object.assign(d.actions, ex.actions);
}
