// Tool 1.5: hourly cost of the workstations, hours to sell, rates offered to the settings.
import { describe, expect, it } from 'vitest';
import { blankStation, capacity, DEFAULT_HOURS, exampleHourly, hourlyCosts, hourlyInsights, mergeRates, overheadOf, productiveHours, stationRate, variableRate } from './hourly';
import { exampleAccounts, proposedSettings } from './breakeven';
import { toolBadge } from './status';
import { blankState, demoState } from './templates';
import { DEFAULT_PARAMS } from './base';
import { bucketOf, flatten, unflatten } from '../store/flat';

const now = new Date(2026, 8, 25, 10, 0);
const H = exampleHourly();
const A = exampleAccounts(now);
const perPerson = productiveHours(H);

describe('1.5 hourly costs', () => {
  it('counts the hours really spent on orders, not the 1 607 paid ones', () => {
    expect(perPerson).toBeCloseTo(1283.99, 1);
    expect(productiveHours({ ...H, absencePct: 0, idlePct: 0 })).toBe(DEFAULT_HOURS.contractHours);
  });

  it('gives a station its direct cost per hour and the part a machine consumes when it runs', () => {
    const r = stationRate(H.stations[0], perPerson)!;
    expect(r.cost).toBe(49000);
    expect(r.direct).toBeCloseTo(38.16, 1);
    expect(r.variable).toBeCloseTo(3.12, 1);      // maintenance and energy only: pay does not follow the use
    expect(r.carried).toBe(7500);                  // depreciation and maintenance
    const shared = stationRate(H.stations[2], perPerson)!;   // 1.5 people: the machine is shared over more hours
    expect(shared.hours).toBeCloseTo(1.5 * perPerson, 5);
    expect(shared.direct).toBeCloseTo(32.19, 1);
    expect(stationRate(H.stations[3], perPerson)!.variable).toBe(0);   // a station without machine costs nothing more when an hour is added
  });

  it('gives no rate to a station without name, people or costs', () => {
    expect(stationRate({ ...H.stations[0], name: ' ' }, perPerson)).toBeNull();
    expect(stationRate({ ...H.stations[0], people: 0 }, perPerson)).toBeNull();
    expect(stationRate({ ...H.stations[0], people: null }, perPerson)).toBeNull();
    expect(stationRate(blankStation(), perPerson)).toBeNull();
    expect(stationRate({ ...blankStation(), name: 'Peinture' }, perPerson)).toBeNull();
    expect(stationRate(H.stations[0], 0)).toBeNull();
  });

  it('adds the stations up: capacity in hours, average rate weighted by hours, machine costs carried', () => {
    const c = hourlyCosts(H)!;
    expect(c.stations).toHaveLength(4);
    expect(c.incomplete).toEqual([]);
    expect(c.people).toBe(4);
    expect(c.capacity).toBeCloseTo(4 * perPerson, 5);
    expect(c.cost).toBe(188000);
    expect(c.average).toBeCloseTo(36.6, 1);
    expect(c.carried).toBe(21500);
    const withGap = hourlyCosts({ ...H, stations: [...H.stations, { ...blankStation(), name: 'Peinture' }] })!;
    expect(withGap.incomplete.map(s => s.name)).toEqual(['Peinture']);
    expect(withGap.cost).toBe(188000);
    expect(hourlyCosts(undefined)).toBeNull();
    expect(hourlyCosts({ ...H, stations: [] })!.average).toBeNull();
  });

  it('takes the machines out of the overheads once the hourly costs carry them', () => {
    expect(proposedSettings(A)!.overheadPct).toBe(47.7);
    expect(proposedSettings(A, 21500)!.overheadPct).toBeCloseTo(39.9, 1);
    expect(proposedSettings(A, 21500)!.floorPct).toBeCloseTo(28.5, 1);          // the floor of the quotes follows the overheads
    expect(proposedSettings(A, 10 ** 9)!.overheadPct).toBe(0);                      // never more than the fixed costs left
    expect(overheadOf(A, 21500, DEFAULT_PARAMS)).toEqual({ pct: proposedSettings(A, 21500)!.overheadPct, computed: true });
    expect(overheadOf(undefined, 21500, { ...DEFAULT_PARAMS, overheadPct: 30 })).toEqual({ pct: 30, computed: false });
  });

  it('translates the break-even into hours to sell and share of the capacity', () => {
    const k = capacity(H, A)!;
    expect(k.usedPct).toBeCloseTo(79.83, 1);
    expect(k.revenuePerHour).toBeCloseTo(146.34, 1);
    expect(k.needed).toBeCloseTo(3802.4, 0);
    expect(k.neededPct).toBeCloseTo(74.03, 1);
    expect(capacity({ ...H, soldHours: null }, A)).toBeNull();
    expect(capacity(H, undefined)).toBeNull();
    expect(capacity({ ...H, stations: [] }, A)).toBeNull();
  });

  it('gives a quote the variable hourly cost of its workstation, else the average, else nothing', () => {
    expect(variableRate(H, 'Soudure')).toBeCloseTo(1.82, 2);
    expect(variableRate(H, 'soudure semi-automatique')).toBeCloseTo(1.82, 2);    // named like the station, as the quotes do
    expect(variableRate(H, 'Peinture')).toBeCloseTo(2.726, 2);                    // unknown station: the average over the hours
    expect(variableRate(H)).toBeCloseTo(2.726, 2);
    expect(variableRate(undefined, 'Soudure')).toBe(0);
    expect(variableRate({ ...H, stations: [] })).toBe(0);
  });

  it('updates the rates of the settings by name and keeps the others', () => {
    const c = hourlyCosts(H)!;
    const m = mergeRates([{ name: 'soudure', rate: 30 }, { name: 'Autre poste', rate: 10 }], c.stations);
    expect(m).toMatchObject({ added: 3, changed: 1, same: 0 });
    expect(m.rates.find(r => r.name === 'soudure')!.rate).toBe(32.2);     // name of the setting kept, rate replaced
    expect(m.rates.map(r => r.name)).toEqual(['soudure', 'Autre poste', 'Découpe et pliage', 'Usinage 5 axes', 'Montage et finition']);
    expect(mergeRates(m.rates, c.stations)).toMatchObject({ added: 0, changed: 0, same: 4 });   // second time: nothing to do
    expect(mergeRates(undefined, [])).toEqual({ rates: [], added: 0, changed: 0, same: 0 });
  });

  it('warns about what blocks the reading, then about the capacity, most serious first', () => {
    const keys = (h = H, a: typeof A | null = A) => hourlyInsights(h, a ?? undefined).map(i => i.key);
    expect(keys()).toEqual(['ok']);
    expect(keys({ ...H, soldHours: null })).toEqual(['sold']);
    expect(keys(H, null)).toEqual(['accounts']);
    expect(keys({ ...H, contractHours: 900, soldHours: null })).toEqual(['hours', 'sold']);       // 719 productive hours per person: to check
    expect(keys({ ...H, stations: [...H.stations, { ...blankStation(), name: 'Peinture' }] })).toEqual(['incomplete', 'ok']);
    expect(keys({ ...H, soldHours: 5500 })).toEqual(['oversold', 'ok']);                        // more hours sold than the capacity
    expect(keys(H, { ...A, revenue: 520000 })).toEqual(['under']);                                // a year under the break-even
    expect(keys({ ...H, soldHours: 4900 }, { ...A, revenue: 520000 })).toEqual(['over']);         // full capacity would not be enough
    expect(hourlyInsights(undefined, A)).toEqual([]);
    expect(hourlyInsights({ ...H, stations: [] }, A)).toEqual([]);
  });

  it('status of the tool: to fill, reserved to management in team view, then by capacity', () => {
    expect(toolBadge(blankState('industrie', now), '1.5', '2026-09', now)).toMatchObject({ n: 0, tone: 'pending', text: 'Postes de travail à saisir' });
    const s = demoState(now);
    expect(s.settings.hourly).toEqual(H);
    expect(toolBadge(s, '1.5', '2026-09', now)).toEqual({ n: 0, tone: 'ok', text: 'Coût horaire moyen : 36,6 €/h' });
    expect(toolBadge(s, '1.5', '2026-09', now, false)).toEqual({ n: 0, tone: 'pending', text: 'Réservé à la direction' });
    s.settings.hourly = { ...H, soldHours: 5000 };        // 90 % of the capacity to sell
    expect(toolBadge(s, '1.5', '2026-09', now)).toMatchObject({ n: 1, tone: 'warn', text: 'Le seuil demande 90 % de la capacité' });
    s.settings.accounts = { ...A, revenue: 520000 };
    s.settings.hourly = H;
    expect(toolBadge(s, '1.5', '2026-09', now)).toEqual({ n: 1, tone: 'alert', text: 'Heures vendues sous le seuil' });
    s.settings.hourly = { ...H, soldHours: 4900 };
    expect(toolBadge(s, '1.5', '2026-09', now)).toEqual({ n: 1, tone: 'alert', text: "Le seuil demande plus d'heures que la capacité" });
    s.settings.hourly = { ...H, stations: [...H.stations, { ...blankStation(), name: 'Peinture' }] };
    expect(toolBadge(s, '1.5', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: '1 poste à compléter' });
  });

  it('the pay and machine costs travel with the settings, in the direction folder only', () => {
    const s = demoState(now);
    expect(bucketOf('settings', s)).toBe('direction');
    const flat = flatten(s);
    expect(unflatten(JSON.parse(JSON.stringify(flat))).settings.hourly).toEqual(H);
    expect(Object.entries(flat).filter(([k, v]) => k !== 'settings' && JSON.stringify(v).includes('labourCost'))).toEqual([]);
  });
});
