// Tool 1.5: what one hour costs at each workstation (people and machine, over the hours really spent on orders), and how many hours
// must be sold to pay the structure. Pure functions, covered by hourly.test.ts.
// Pay is a fixed cost (see breakeven.ts): what an extra hour consumes is only what the machine uses (maintenance, energy).
import type { Accounts, HourlyCosts, Params, Workstation } from './types';
import { newId, sum, type Insight } from './base';
import { breakEven, proposedSettings } from './breakeven';
import { formatValue } from './numbers';

export const DEFAULT_HOURS = { contractHours: 1607, absencePct: 6, idlePct: 15 };
export const blankHourly = (): HourlyCosts => ({ ...DEFAULT_HOURS, soldHours: null, stations: [] });
export const blankStation = (): Workstation => ({ id: newId('ws'), name: '', people: 1, labourCost: null, depreciation: null, maintenance: null, energy: null });
// Fictitious workshop of the 1.4 example: the pay of the stations adds up to its production staff (160 000 €)
export const exampleHourly = (): HourlyCosts => ({
  ...DEFAULT_HOURS, soldHours: 4100, stations: [
    { id: 'ws_demo_1', name: 'Découpe et pliage', people: 1, labourCost: 40000, depreciation: 5000, maintenance: 2500, energy: 1500 },
    { id: 'ws_demo_2', name: 'Usinage 5 axes', people: 1, labourCost: 44000, depreciation: 7000, maintenance: 4000, energy: 2500 },
    { id: 'ws_demo_3', name: 'Soudure', people: 1.5, labourCost: 38000, depreciation: 1500, maintenance: 1000, energy: 2500 },
    { id: 'ws_demo_4', name: 'Montage et finition', people: 0.5, labourCost: 38000, depreciation: 500, maintenance: 0, energy: 0 },
  ],
});

// Hours one person really spends on orders over the year: paid hours, less absences, less the time spent on no order
export const productiveHours = (h: HourlyCosts) => h.contractHours * (1 - h.absencePct / 100) * (1 - h.idlePct / 100);
export const roundRate = (x: number) => Math.round(x * 10) / 10;

export interface StationRate {
  id: string;
  name: string;
  people: number;
  hours: number;      // person-hours over the year
  cost: number;       // yearly cost of the workstation: people, then machine
  carried: number;    // depreciation and maintenance of the machine: carried by the hourly cost, so not overheads
  direct: number;     // €/h: people and machine over the productive hours
  variable: number;   // €/h that an extra hour consumes: maintenance and energy of the machine
}
export function stationRate(s: Workstation, perPerson: number): StationRate | null {
  if (!s.name.trim() || !s.people || s.people <= 0 || perPerson <= 0) return null;
  const hours = s.people * perPerson;
  const cost = s.people * (s.labourCost || 0) + sum([s.depreciation, s.maintenance, s.energy]);
  if (cost <= 0) return null;
  return { id: s.id, name: s.name.trim(), people: s.people, hours, cost, carried: sum([s.depreciation, s.maintenance]), direct: cost / hours, variable: sum([s.maintenance, s.energy]) / hours };
}

export interface Costs {
  perPerson: number;
  stations: StationRate[];
  incomplete: Workstation[];     // without name, people or costs: no rate
  people: number;
  capacity: number;              // person-hours of the stations with a rate
  cost: number;
  average: number | null;        // direct €/h over all the stations, weighted by hours
  carried: number;
}
export function hourlyCosts(h: HourlyCosts | undefined): Costs | null {
  if (!h) return null;
  const perPerson = productiveHours(h);
  const rated = h.stations.map(s => ({ s, r: stationRate(s, perPerson) }));
  const stations = rated.flatMap(x => (x.r ? [x.r] : []));
  const cost = sum(stations.map(r => r.cost)), capacity = sum(stations.map(r => r.hours));
  return {
    perPerson, stations, incomplete: rated.filter(x => !x.r).map(x => x.s), people: sum(stations.map(r => r.people)),
    capacity, cost, average: capacity > 0 ? cost / capacity : null, carried: sum(stations.map(r => r.carried)),
  };
}

// Variable hourly cost a quote takes for its workstation: the one of the station named like it (matched as rateFor does), else the average, else 0
export function variableRate(h: HourlyCosts | undefined, name = ''): number {
  const c = hourlyCosts(h);
  if (!c || !c.capacity) return 0;
  const n = name.trim().toLowerCase();
  const s = n ? c.stations.find(x => x.name.toLowerCase() === n || n.includes(x.name.toLowerCase())) : undefined;
  return s ? s.variable : sum(c.stations.map(x => x.variable * x.hours)) / c.capacity;
}

// Overheads added to the direct hourly cost to get the complete one: computed on the accounts when they are typed, else the settings
export function overheadOf(a: Accounts | undefined, carried: number, p: Params): { pct: number; computed: boolean } {
  const pct = proposedSettings(a, carried)?.overheadPct;
  return pct === null || pct === undefined ? { pct: p.overheadPct || 0, computed: false } : { pct, computed: true };
}

// Hours to sell to reach the break-even, and share of the capacity they take, at the average revenue per hour sold
export interface Capacity { capacity: number; sold: number; usedPct: number; revenuePerHour: number; needed: number; neededPct: number }
export function capacity(h: HourlyCosts | undefined, a: Accounts | undefined): Capacity | null {
  const c = hourlyCosts(h), b = breakEven(a);
  if (!h || !c || !b || b.thresholdPct === null || !h.soldHours || h.soldHours <= 0 || c.capacity <= 0) return null;
  const needed = h.soldHours * b.thresholdPct / 100;
  return { capacity: c.capacity, sold: h.soldHours, usedPct: h.soldHours / c.capacity * 100, revenuePerHour: b.revenue / h.soldHours, needed, neededPct: needed / c.capacity * 100 };
}

// Rates of the settings (name, €/h) updated with the direct hourly cost of each workstation: same name (any case) replaced, others added, the rest kept
export function mergeRates(current: Params['rates'], stations: StationRate[]) {
  const key = (n: string) => n.trim().toLowerCase();
  const rates = [...(current || [])];
  let added = 0, changed = 0, same = 0;
  stations.forEach(s => {
    const i = rates.findIndex(r => key(r.name) === key(s.name)), rate = roundRate(s.direct);
    if (i < 0) { rates.push({ name: s.name, rate }); added++; }
    else if (rates[i].rate !== rate) { rates[i] = { ...rates[i], rate }; changed++; }
    else same++;
  });
  return { rates, added, changed, same };
}

const ORDER = { bad: 0, warn: 1, good: 2 } as const;
export function hourlyInsights(h: HourlyCosts | undefined, a: Accounts | undefined): Insight[] {
  const c = hourlyCosts(h);
  if (!h || !c || !h.stations.length) return [];
  const out: Insight[] = [];
  if (c.incomplete.length) out.push({ key: 'incomplete', tone: 'warn', title: 'Poste sans coût calculable', text: `${c.incomplete.slice(0, 3).map(s => s.name || 'sans nom').join(', ')}${c.incomplete.length > 3 ? ` et ${c.incomplete.length - 3} autre(s)` : ''} : nom, personnes et coûts à saisir.` });
  if (c.perPerson < 1000 || c.perPerson > 1500) out.push({ key: 'hours', tone: 'warn', title: 'Heures productives à vérifier', text: `${Math.round(c.perPerson)} h par personne et par an, alors que l'ordre de grandeur courant est de 1 200 à 1 400 h. Revoir les absences et le temps passé hors commandes.` });
  const k = capacity(h, a);
  if (c.stations.length && !k) {
    if (breakEven(a)?.threshold == null) out.push({ key: 'accounts', tone: 'warn', title: 'Seuil de rentabilité à calculer', text: "Sans les chiffres du compte de résultat (outil 1.4), on ne peut pas dire combien d'heures il faut vendre." });
    else out.push({ key: 'sold', tone: 'warn', title: 'Heures vendues à saisir', text: "Sans les heures vendues sur l'exercice, on ne peut traduire le seuil ni en heures ni en part de la capacité." });
  }
  if (k) {
    const per = `au chiffre d'affaires moyen de ${formatValue(k.revenuePerHour, '€')} par heure vendue`;
    if (k.usedPct > 100) out.push({ key: 'oversold', tone: 'warn', title: "Plus d'heures vendues que de capacité", text: `${Math.round(k.sold)} h vendues pour ${Math.round(k.capacity)} h de capacité : postes non saisis, heures supplémentaires, intérim ou heures productives sous-estimées. À vérifier avant de lire le taux d'activité.` });
    if (k.neededPct > 100) out.push({ key: 'over', tone: 'bad', title: "Le seuil demande plus d'heures que la capacité", text: `Il faudrait vendre ${Math.round(k.needed)} h pour couvrir la structure, pour ${Math.round(k.capacity)} h de capacité : ${per}, même à 100 % d'activité la structure n'est pas couverte.` });
    else if (k.sold < k.needed) out.push({ key: 'under', tone: 'bad', title: 'Heures vendues sous le seuil', text: `${Math.round(k.sold)} h vendues pour ${Math.round(k.needed)} h nécessaires : il en manque ${Math.round(k.needed - k.sold)}, ${per}.` });
    else out.push({ key: 'ok', tone: 'good', title: 'Heures vendues au-dessus du seuil', text: `Le seuil demande ${Math.round(k.neededPct)} % de la capacité et ${Math.round(k.usedPct)} % sont vendus : ${Math.round(k.sold - k.needed)} h de marge, ${per}.` });
  }
  return out.sort((x, y) => ORDER[x.tone] - ORDER[y.tone]);
}
