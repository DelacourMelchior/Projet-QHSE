// Tool 1.4: from the 10 figures of the last profit and loss account, the revenue needed to pay the structure (break-even),
// the margin of safety, the price/volume trade-off and the values the other tools use. Pure functions, covered by breakeven.test.ts.
// Pay is a fixed cost (permanent contracts): the part paid by the hour goes in "autres charges variables".
import type { Accounts } from './types';
import { sum, type Insight } from './base';
import { formatValue } from './numbers';

export type Line = Exclude<keyof Accounts, 'year'>;
export const LINE_GROUPS = {
  sales: 'Ventes',
  variable: 'Charges variables : elles disparaissent si la commande disparaît',
  fixed: 'Charges fixes : payées même sans commande',
  result: "Résultat de l'exercice",
} as const;
export const ACCOUNT_LINES: { key: Line; group: keyof typeof LINE_GROUPS; label: string; hint: string }[] = [
  { key: 'revenue', group: 'sales', label: "Chiffre d'affaires (€ HT)", hint: "Ligne « Chiffre d'affaires net » du compte de résultat." },
  { key: 'purchases', group: 'variable', label: 'Achats consommés (€)', hint: 'Matières, marchandises et fournitures, variation de stock comprise.' },
  { key: 'subcontracting', group: 'variable', label: 'Sous-traitance (€)', hint: 'Travaux confiés à des tiers pour vos commandes.' },
  { key: 'otherVariable', group: 'variable', label: 'Autres charges variables (€)', hint: 'Énergie de production, transport sur ventes, commissions, emballages, intérim.' },
  { key: 'labourProduction', group: 'fixed', label: 'Personnel de production (€)', hint: 'Salaires et charges de ceux dont le temps est vendu : atelier, chantier, études.' },
  { key: 'labourOverhead', group: 'fixed', label: 'Personnel de structure (€)', hint: "Direction, administratif, commercial. Ajouter la rémunération du dirigeant si elle n'est pas dans les salaires." },
  { key: 'otherFixed', group: 'fixed', label: 'Autres charges fixes (€)', hint: 'Loyers, assurances, honoraires, entretien, véhicules, télécoms, impôts et taxes.' },
  { key: 'depreciation', group: 'fixed', label: 'Amortissements (€)', hint: 'Dotations aux amortissements.' },
  { key: 'interest', group: 'fixed', label: 'Charges financières (€)', hint: "Intérêts d'emprunt, agios." },
  { key: 'result', group: 'result', label: 'Résultat net (€)', hint: "Ligne « Résultat de l'exercice », négatif en cas de perte. Donne la marge nette et sert à vérifier la saisie." },
];

export const blankAccounts = (today = new Date()): Accounts => ({
  year: today.getFullYear() - 1, revenue: null, purchases: null, subcontracting: null, otherVariable: null, labourProduction: null,
  labourOverhead: null, otherFixed: null, depreciation: null, interest: null, result: null,
});
// Fictitious workshop of 600 000 € with a thin margin of safety, the usual case
export const exampleAccounts = (today = new Date()): Accounts => ({
  ...blankAccounts(today), revenue: 600000, purchases: 190000, subcontracting: 30000, otherVariable: 8000, labourProduction: 160000,
  labourOverhead: 90000, otherFixed: 75000, depreciation: 15000, interest: 5000, result: 20000,
});

// The exercise before the example one: more revenue, more hours, a thinner margin on each hour (what 1.6 is there to show)
export const examplePrevious = (today = new Date()): Accounts => ({
  ...blankAccounts(today), year: today.getFullYear() - 2, revenue: 520000, purchases: 152000, subcontracting: 18000, otherVariable: 6000,
  labourProduction: 150000, labourOverhead: 85000, otherFixed: 72000, depreciation: 14000, interest: 4500, result: 13000, soldHours: 3500,
});

export interface BreakEven {
  revenue: number;
  variable: number;            // charges variables
  contribution: number;        // marge sur coûts variables (€)
  ratePct: number;             // taux de marge sur coûts variables (% of the revenue)
  fixed: number;               // charges fixes
  fixedPerMonth: number;
  result: number;              // contribution - fixed, before tax and exceptional items
  complete: boolean;           // fixed costs typed
  threshold: number | null;    // seuil de rentabilité = fixed / rate (null without fixed costs or with a rate <= 0)
  thresholdPct: number | null; // share of the revenue
  months: number | null;       // months of regular activity to reach it
  safety: number | null;       // revenue - threshold (negative: under the threshold)
  safetyPct: number | null;    // fall of the revenue the year can take before the loss
  leverage: number | null;     // % of result lost for 1 % of revenue lost (contribution / result, result > 0)
}

export function breakEven(a: Accounts | undefined): BreakEven | null {
  if (!a?.revenue || a.revenue <= 0) return null;
  const variable = sum([a.purchases, a.subcontracting, a.otherVariable]);
  const fixed = sum([a.labourProduction, a.labourOverhead, a.otherFixed, a.depreciation, a.interest]);
  const contribution = a.revenue - variable;
  const rate = contribution / a.revenue;
  const complete = fixed > 0;
  const threshold = complete && rate > 0 ? fixed / rate : null;
  const result = contribution - fixed;
  return {
    revenue: a.revenue, variable, contribution, ratePct: rate * 100, fixed, fixedPerMonth: fixed / 12, result, complete, threshold,
    thresholdPct: threshold === null ? null : threshold / a.revenue * 100,
    months: threshold === null ? null : threshold / a.revenue * 12,
    safety: threshold === null ? null : a.revenue - threshold,
    safetyPct: threshold === null ? null : (a.revenue - threshold) / a.revenue * 100,
    leverage: complete && result > 0 ? contribution / result : null,
  };
}

// Day the threshold is reached, for a calendar year of regular activity (null beyond the 12 months)
export function breakEvenDate(year: number, months: number | null): Date | null {
  if (months === null || months < 0 || months > 12) return null;
  return new Date(year, 0, 1 + Math.round(months / 12 * 365));
}

// Price cut of d %: extra volume (%) to sell to keep the same margin. Price rise of d %: volume (%) that can be lost for the same margin.
// The margin on variable costs is m % of the price and the variable costs follow the volume.
export function priceVolume(ratePct: number, changePct: number): { cut: number | null; rise: number | null } {
  const m = ratePct / 100, d = changePct / 100;
  if (m <= 0 || d <= 0) return { cut: null, rise: null };
  return { cut: m > d ? d / (m - d) * 100 : null, rise: d / (m + d) * 100 };
}

// Values the other tools ask for, computed on these accounts (offered by the screen, never written silently).
// Overheads: fixed costs without the production staff, in % of the direct costs (variable costs and production staff), as the quotes of 2.1 use them.
// carried: depreciation and maintenance of the machines that the hourly costs of the workstations already carry (1.5): they are direct, not overheads.
// floorPct: the gross margin at which a job only pays its overheads (complete cost): a quote floor under it loses money after the structure.
export interface Proposed { variableMarginPct: number; netMarginPct: number | null; overheadPct: number | null; floorPct: number | null }
export function proposedSettings(a: Accounts | undefined, carried = 0): Proposed | null {
  const b = breakEven(a);
  if (!a || !b || !b.complete || b.ratePct <= 0) return null;
  const round = (x: number) => Math.round(x * 10) / 10;
  const net = (a.result ?? b.result) / b.revenue * 100;
  const production = a.labourProduction || 0, machines = Math.min(carried, Math.max(0, b.fixed - production));
  const direct = b.variable + production + machines;
  const overhead = direct > 0 ? (b.fixed - production - machines) / direct * 100 : null;
  return {
    variableMarginPct: round(b.ratePct), netMarginPct: net > 0 ? round(net) : null,
    overheadPct: overhead === null ? null : round(overhead), floorPct: overhead === null ? null : round(overhead / (100 + overhead) * 100),
  };
}

const ORDER = { bad: 0, warn: 1, good: 2 } as const;
export function breakEvenInsights(a: Accounts | undefined): Insight[] {
  const b = breakEven(a);
  if (!a || !b) return [];
  const out: Insight[] = [];
  if (b.ratePct <= 0) out.push({ key: 'nomargin', tone: 'bad', title: 'Les ventes ne couvrent pas les achats et la sous-traitance', text: "La marge sur coûts variables est nulle ou négative : chaque vente perd de l'argent avant de payer la structure. Revoir les prix ou les coûts d'achat avant tout." });
  else if (!b.complete) out.push({ key: 'nofixed', tone: 'warn', title: 'Charges fixes à saisir', text: 'Sans le personnel, les loyers et les amortissements, le seuil ne peut pas être calculé.' });
  else {
    if (b.safety! < 0) out.push({ key: 'loss', tone: 'bad', title: 'Exercice sous le seuil de rentabilité', text: `Il manquait ${formatValue(-b.safety!, '€')} de chiffre d'affaires pour couvrir la structure, sur la base d'une marge sur coûts variables de ${Math.round(b.ratePct)} %.` });
    else if (b.safetyPct! < 10) out.push({ key: 'fragile', tone: 'warn', title: 'Marge de sécurité fragile', text: `Une baisse de ${formatValue(b.safetyPct, '%')} du chiffre d'affaires ferait passer l'exercice en perte (seuil à ${Math.round(b.thresholdPct!)} % du chiffre d'affaires).` });
    if (b.leverage !== null && b.leverage >= 5) out.push({ key: 'leverage', tone: 'warn', title: 'Un peu moins de ventes, beaucoup moins de résultat', text: `1 % de chiffre d'affaires en moins retire environ ${Math.round(b.leverage)} % du résultat, si les coûts variables suivent les ventes.` });
    out.push({ key: 'monthly', tone: 'good', title: `La structure coûte ${formatValue(b.fixedPerMonth, '€')} par mois`, text: `À ${Math.round(b.ratePct)} % de marge sur coûts variables, il faut vendre ${formatValue(b.fixedPerMonth / (b.ratePct / 100), '€')} par mois avant de gagner un euro.` });
    if (a.result !== null && Math.abs(a.result - b.result) > b.revenue * 0.03) out.push({ key: 'gap', tone: 'warn', title: 'Résultat saisi différent du résultat calculé', text: `Écart de ${formatValue(Math.abs(a.result - b.result), '€')} : produits ou charges exceptionnels, impôt sur les sociétés, subventions, ou une ligne mal classée. Vérifier la saisie.` });
  }
  return out.sort((x, y) => ORDER[x.tone] - ORDER[y.tone]);
}
