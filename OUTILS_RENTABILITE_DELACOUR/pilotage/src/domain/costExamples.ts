// Examples of tools 1.4 to 1.6: a workshop of 600 000 €, its two exercises, its workstations and its price decisions.
import type { Nc, NcCost, State } from './types';
import { exampleAccounts, examplePrevious } from './breakeven';
import { exampleHourly } from './hourly';
import { examplePolicy } from './charter';

// Fills what the three tools lack; what the company already typed is kept
export function applyCostExample(d: State, today = new Date()) {
  const s = d.settings;
  s.accounts ??= exampleAccounts(today);
  s.previous ??= { ...examplePrevious(today), year: s.accounts.year - 1 };
  if (!s.hourly?.stations.length) s.hourly = exampleHourly();
  s.policy ??= examplePolicy();
}

// Decided defects of the two exercises (register of 5.1): more than twice the cost in the last one, as the hours sold rise.
// Each one stays under the cost that calls for a workshop (500 €), so that the history does not fill the list of 5.3.
const PAST: [last: boolean, day: string, where: string, item: string, description: string, cause: Nc['cause'], decision: Nc['decision'], cost: Partial<NcCost>][] = [
  [false, '04-16', 'Presse plieuse', 'Lot de supports (60 pièces)', 'Pliage hors cote sur un lot', 'reglage', 'retouche', { scrap: 120, lostHours: 2, reworkHours: 4 }],
  [false, '09-03', 'Soudure', 'Cadre mécano-soudé', 'Cordon de soudure poreux', 'methode', 'rebut', { scrap: 260, lostHours: 2, logistics: 40 }],
  [false, '11-20', 'Peinture', 'Portillons (20 pièces)', 'Coulures après cuisson', 'manipulation', 'retouche', { scrap: 60, reworkHours: 4, logistics: 30 }],
  [true, '02-11', 'Poinçonneuse', 'Lot cornières (200 pièces)', 'Perçages décalés', 'reglage', 'retouche', { scrap: 150, lostHours: 1, reworkHours: 5 }],
  [true, '03-27', 'Presse plieuse', 'Platines inox (80 pièces)', 'Angle de pliage hors tolérance', 'plan', 'rebut', { scrap: 340, lostHours: 2, logistics: 40 }],
  [true, '05-19', 'Soudure', 'Portique de 3 m', 'Déformation après soudage', 'methode', 'retouche', { scrap: 90, lostHours: 1, reworkHours: 5 }],
  [true, '07-08', 'Contrôle final', 'Lot de supports (40 pièces)', 'Cote de perçage hors tolérance', 'reglage', 'retouche', { scrap: 60, lostHours: 2, reworkHours: 4 }],
  [true, '09-24', 'Peinture', 'Portillons (25 pièces)', "Défaut d'aspect de la peinture", 'manipulation', 'retouche', { scrap: 110, reworkHours: 5, logistics: 50 }],
  [true, '11-13', 'Montage armoires', 'Coffret 12', 'Câblage inversé au montage', 'methode', 'retouche', { scrap: 140, lostHours: 1, reworkHours: 4, logistics: 60 }],
  [true, '12-09', 'Presse plieuse', 'Équerres (100 pièces)', 'Angle de pliage à 92°', 'reglage', 'retouche', { scrap: 70, lostHours: 1, reworkHours: 5 }],
];

function pastDefects(last: number, before: number): Record<string, Nc> {
  return Object.fromEntries(PAST.map(([isLast, day, where, item, description, cause, decision, cost], i) => {
    const year = isLast ? last : before;
    const n: Nc = {
      id: `nc_demo_past_${i + 1}`, ref: `NC-${year}-${String(i + 1).padStart(3, '0')}`, at: `${year}-${day}T09:00`, by: 'Julien P.', where, item, qty: null, description, cause, origin: 'interne',
      decision, decidedAt: `${year}-${day}T16:00`, decidedBy: 'David K.', decisionNote: '', processId: 'P3', cost: { scrap: null, lostHours: null, reworkHours: null, logistics: null, ...cost },
    };
    return [n.id, n];
  }));
}

// The example company: the three tools, and the defects of their two exercises, which the last light of 1.6 compares with the hours sold
export function applyExampleCompany(d: State, today = new Date()) {
  applyCostExample(d, today);
  d.ncs = { ...pastDefects(d.settings.accounts!.year, d.settings.previous!.year), ...d.ncs };
}
