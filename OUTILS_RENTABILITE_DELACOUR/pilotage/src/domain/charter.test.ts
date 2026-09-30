// Tool 1.6: price charter (decisions taken once) and the light on growth that only inflates the revenue.
import { describe, expect, it } from 'vitest';
import { blankPolicy, chartModel, charterChanges, cnqYear, examplePolicy, hourState, hourValues, isStale, issueCharter, nextExercise, signals } from './charter';
import { exampleAccounts, examplePrevious } from './breakeven';
import { toolBadge } from './status';
import { blankState, demoState } from './templates';
import { bucketOf, flatten, unflatten } from '../store/flat';
import type { State } from './types';

const now = new Date(2026, 8, 25, 10, 0);
const A = exampleAccounts(now);
const sig = (s: State) => signals(s, hourValues(s, chartModel(s)), now);
const tone = (s: State, key: string) => sig(s).find(x => x.key === key)!;

describe('1.6 price charter', () => {
  it('reads the coefficients while the decisions are left empty: it gives back what the accounts show', () => {
    const m = chartModel(demoState(now), blankPolicy())!;
    expect([m.mat, m.sub, m.labour, m.direct]).toEqual([198000, 30000, 181500, 409500]);     // materials and other variable costs, subcontracting, pay and machines
    expect(m.kReal).toBeCloseTo(1.4652, 3);                                                   // revenue over direct costs
    expect(m.kBreak).toBeCloseTo(1.3993, 3);                                                  // 1 plus the overheads: the job earns nothing
    expect(m.marginDerived).toBe(true);
    expect(m.marginPct).toBeCloseTo(4.5, 1);
    expect(m.kTarget).toBeCloseTo(m.kReal, 3);
    expect(m.priceChangePct).toBeCloseTo(0, 1);                                               // the overheads are rounded to a tenth of a percent: no price change to show under 0.05 %
    expect(m.volumePct).toBeNull();
    expect(m.kLabour).toBeCloseTo(m.kTarget, 6);
    expect(m.discountSales).toBeCloseTo(4.5, 1);                                              // the margin aimed at is also the largest discount before losing money
    expect(m.rates).toHaveLength(4);
    expect(m.rates.find(r => r.name === 'Soudure')!.target).toBeCloseTo(47.17, 1);
  });

  it('lets the hours carry what the materials and the subcontracting do not', () => {
    const m = chartModel(demoState(now), { ...blankPolicy(), marginPct: 3.3, coefMaterials: 1.3, coefSubcontracting: 1.15 })!;
    expect(m.kTarget).toBeCloseTo(1.447, 3);
    expect(m.kLabour).toBeCloseTo(1.656, 2);
    const rate = (name: string) => m.rates.find(r => r.name === name)!;
    expect(rate('Soudure').target).toBeCloseTo(53.3, 1);
    expect(rate('Usinage 5 axes').target).toBeCloseTo(74.2, 0);
    expect(rate('Soudure').salesMin).toBeCloseTo(53.3 * (1 - 0.033), 1);                     // largest discount of the sales person: the margin aimed at
    expect(m.priceChangePct).toBeCloseTo(-1.24, 1);
    expect(m.volumePct).toBeCloseTo(2.04, 1);                                                // volume to win to keep the result at that lower average price
  });

  it('asks for a price rise when the margin aimed at is higher, and says how much volume it can cost', () => {
    const m = chartModel(demoState(now), { ...blankPolicy(), marginPct: 6 })!;
    expect(m.priceChangePct).toBeCloseTo(1.6, 1);
    expect(m.volumePct).toBeCloseTo(2.5, 1);
  });

  it('has no hour rate without production staff, and no model without complete accounts', () => {
    const s = demoState(now);
    s.settings.accounts = { ...A, labourProduction: null };
    s.settings.hourly = undefined;
    const m = chartModel(s, blankPolicy())!;
    expect(m.kLabour).toBeNull();
    expect(m.rates).toEqual([]);
    expect(chartModel(blankState('industrie', now))).toBeNull();
    s.settings.accounts = { ...A, labourProduction: null, labourOverhead: null, otherFixed: null, depreciation: null, interest: null };
    expect(chartModel(s)).toBeNull();
  });

  it('gives the value of an hour: what it must leave to pay the structure and the margin aimed at', () => {
    const s = demoState(now), pol = blankPolicy(), hv = hourValues(s, chartModel(s, pol), pol)!;
    expect(hv.breakEven).toBeCloseTo(84.15, 1);                       // fixed costs over the hours sold
    expect(hv.value).toBeCloseTo(90.73, 1);                           // plus the result aimed at
    expect(hv.atCeiling).toBeCloseTo(85.21, 1);                       // the same at the load ceiling
    expect(hv.usedPct).toBeCloseTo(79.83, 1);
    expect(hv.freeHours).toBeCloseTo(265.6, 0);
    expect(hv.room).toBeCloseTo(6.08, 1);                             // fall of the margin per hour that the volume can still make up
    expect([hourState(80, hv), hourState(88, hv), hourState(95, hv)]).toEqual(['loses', 'dilutes', 'ok']);
    s.settings.hourly!.soldHours = null;
    expect(hourValues(s, chartModel(s, pol), pol)).toBeNull();
  });

  it('lights the demo: growth on a thin margin, more hours for less margin per hour, thin jobs, defects that rose with the load', () => {
    const s = demoState(now), sg = sig(s);
    expect(sg.map(x => x.key)).toEqual(['growth', 'hours', 'load', 'thin', 'quality']);
    expect(sg.map(x => x.tone)).toEqual(['warn', 'warn', 'ok', 'warn', 'alert']);
    expect(sg[0].text).toMatch(/35 € de marge sur coûts variables seulement \(66 € avant\)/);
    expect(sg[1].text).toMatch(/\+17 %.*8 %/);
    expect(sg[2].text).toMatch(/80 % vendus.*85 %/);
    expect(sg[3].text).toContain('DEV-2026-004');
    expect(sg[3].text).not.toContain('DEV-2026-002');
    expect(sg[4].text).toMatch(/Charge de 68 à 80 %.*0,2 % à 0,5 %.*la charge coûte de la qualité/);
    s.ncs = Object.fromEntries(Object.entries(s.ncs).filter(([id]) => !id.startsWith('nc_demo_past_')));   // without the defects of the two exercises, the light waits
    expect(tone(s, 'quality').tone).toBe('pending');
  });

  it('turns the growth light red when the revenue grew and the result fell, green when the growth paid', () => {
    const s = demoState(now);
    s.settings.previous = { ...examplePrevious(now), revenue: 500000, purchases: 130000, subcontracting: 14000, otherVariable: 6000, labourProduction: 140000, labourOverhead: 80000, otherFixed: 60000, depreciation: 14000, interest: 6000 };
    expect(tone(s, 'growth')).toMatchObject({ tone: 'alert' });
    expect(tone(s, 'growth').text).toMatch(/a coûté de l'argent/);
    s.settings.previous = { ...examplePrevious(now), revenue: 500000, purchases: 165000, subcontracting: 20000, otherVariable: 5000, labourProduction: 150000, labourOverhead: 85000, otherFixed: 70000, depreciation: 12000, interest: 3000 };
    expect(tone(s, 'growth')).toMatchObject({ tone: 'ok' });
    s.settings.previous = { ...examplePrevious(now), revenue: 700000 };                        // a revenue that fell: nothing to judge
    expect(tone(s, 'growth').text).toMatch(/baisse/);
    s.settings.previous = undefined;
    expect(sig(s).filter(x => x.tone === 'pending').map(x => x.key)).toEqual(['growth', 'hours', 'quality']);
  });

  it('watches the load against the ceiling, and the jobs against the value of an hour', () => {
    const s = demoState(now);
    s.settings.hourly!.soldHours = 4500;
    expect(tone(s, 'load').tone).toBe('alert');
    s.settings.hourly!.soldHours = 4300;
    expect(tone(s, 'load').tone).toBe('warn');
    s.settings.hourly!.soldHours = 3000;
    expect(tone(s, 'load').tone).toBe('ok');
    const t = demoState(now);
    t.quotes.qt_demo_3.amount = 20000;                                // a big job sold under its variable costs
    expect(tone(t, 'thin')).toMatchObject({ tone: 'alert' });
    expect(tone(t, 'thin').text).toMatch(/perd de l'argent|perdent de l'argent/);
    t.quotes = {};
    expect(tone(t, 'thin').tone).toBe('pending');
  });

  it('sets the quality against the load when both exercises have their defects and hours', () => {
    const s = demoState(now);
    expect(cnqYear(s, 2026)).toBeGreaterThan(0);
    expect(cnqYear(s, 2019)).toBe(0);
    s.settings.accounts = { ...A, year: 2026 };
    s.settings.previous = { ...examplePrevious(now), year: 2019 };    // no defect that year, and less load: the cost of non-quality rose with it
    expect(tone(s, 'quality')).toMatchObject({ tone: 'alert' });
    expect(tone(s, 'quality').text).toMatch(/la charge coûte de la qualité/);
  });

  it('keeps the charter up to date: what moved since it was validated', () => {
    const s = demoState(now), m = chartModel(s)!, issued = issueCharter(m, now);
    expect(issued.at).toBe('2026-09-25');
    expect(charterChanges(issued, m)).toEqual([]);
    const up = charterChanges(issued, chartModel(s, { ...s.settings.policy!, marginPct: 7 })!);
    expect(up.some(x => x.startsWith('Soudure : de'))).toBe(true);
    expect(up.some(x => x.startsWith('Marge visée'))).toBe(true);
    const fewer = demoState(now);
    fewer.settings.hourly!.stations = fewer.settings.hourly!.stations.slice(1);
    expect(charterChanges(issued, chartModel(fewer)!).join()).toContain('Découpe et pliage : poste retiré');
    expect(charterChanges(undefined, m)).toEqual([]);
  });

  it('reminds to start a new exercise once the accounts are old, not while the last one is being closed', () => {
    expect(isStale({ ...A, year: 2025 }, now)).toBe(false);
    expect(isStale({ ...A, year: 2024 }, now)).toBe(true);
    expect(isStale({ ...A, year: 2025 }, new Date(2027, 3, 30))).toBe(false);
    expect(isStale({ ...A, year: 2025 }, new Date(2027, 4, 1))).toBe(true);
    expect(isStale(undefined, now)).toBe(false);
  });

  it('starts a new exercise: the closed one becomes the previous one, the fixed costs stay, the rest waits to be typed', () => {
    const st = demoState(now).settings, next = nextExercise(st);
    expect(next.previous).toMatchObject({ year: 2025, revenue: 600000, soldHours: 4100 });
    expect(next.accounts).toMatchObject({ year: 2026, revenue: null, purchases: null, subcontracting: null, otherVariable: null, result: null, labourProduction: 160000, otherFixed: 75000 });
    expect(next.hourly!.soldHours).toBeNull();
    expect(next.hourly!.stations).toHaveLength(4);
    expect(next.policy).toEqual(st.policy);
    expect(nextExercise({ ...st, accounts: undefined })).toEqual({ ...st, accounts: undefined });
    const s = demoState(now);
    s.settings = next;
    expect(chartModel(s)).toBeNull();                                 // the new exercise waits for its revenue
  });

  it('status of the tool: to fill, reserved to management, then red, to reissue, old figures, watch points, green', () => {
    const s = demoState(now), status = (x = s, money = true) => toolBadge(x, '1.6', '2026-09', now, money);
    expect(status(blankState('industrie', now)).text).toBe('Chiffres du compte de résultat à saisir (1.4)');
    expect(status(s, false)).toEqual({ n: 0, tone: 'pending', text: 'Réservé à la direction' });
    expect(status()).toEqual({ n: 1, tone: 'alert', text: '1 alerte du voyant' });
    const green = demoState(now);
    green.settings.previous = { ...examplePrevious(now), revenue: 500000, purchases: 165000, subcontracting: 20000, otherVariable: 5000, labourProduction: 150000, labourOverhead: 85000, otherFixed: 70000, depreciation: 12000, interest: 3000, soldHours: 4300 };
    green.quotes = {};
    expect(status(green)).toEqual({ n: 1, tone: 'warn', text: 'Charte à valider' });
    green.settings.policy!.issued = issueCharter(chartModel(green)!, now);
    expect(status(green)).toEqual({ n: 0, tone: 'ok', text: 'Voyant au vert, charte validée le 25/09/2026' });
    green.settings.policy!.marginPct = 7;
    expect(status(green)).toMatchObject({ tone: 'warn', text: 'Charte à rééditer : les coûts ont changé' });
    green.settings.accounts = { ...A, year: 2023 };
    green.settings.policy!.issued = undefined;
    expect(status(green).text).toBe('Chiffres de 2023 : nouvel exercice à saisir');
    const red = demoState(now);
    red.settings.previous = { ...examplePrevious(now), revenue: 500000, purchases: 130000, subcontracting: 14000, otherVariable: 6000, labourProduction: 140000, labourOverhead: 80000, otherFixed: 60000, depreciation: 14000, interest: 6000 };
    expect(status(red)).toMatchObject({ n: 3, tone: 'alert', text: '3 alertes du voyant' });
  });

  it('the decisions and the previous exercise travel with the settings, in the direction folder only', () => {
    const s = demoState(now);
    expect(bucketOf('settings', s)).toBe('direction');
    const flat = flatten(s), back = unflatten(JSON.parse(JSON.stringify(flat)));
    expect(back.settings.policy).toEqual(examplePolicy());
    expect(back.settings.previous).toEqual(examplePrevious(now));
    expect(Object.entries(flat).filter(([k, v]) => k !== 'settings' && /coefMaterials|soldHours/.test(JSON.stringify(v)))).toEqual([]);
  });
});
