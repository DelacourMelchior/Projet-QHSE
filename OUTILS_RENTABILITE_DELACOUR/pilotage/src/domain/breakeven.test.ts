// Tool 1.4: break-even from the 10 figures of the last profit and loss account.
import { describe, expect, it } from 'vitest';
import { blankAccounts, breakEven, breakEvenDate, breakEvenInsights, exampleAccounts, priceVolume, proposedSettings } from './breakeven';
import { blankState, demoState } from './templates';
import { toolBadge } from './status';
import { bucketOf, flatten, unflatten } from '../store/flat';

const now = new Date(2026, 8, 25, 10, 0);
const A = exampleAccounts(now);

describe('1.4 break-even', () => {
  it('reads the accounts: margin on variable costs, fixed costs, threshold, margin of safety', () => {
    const b = breakEven(A)!;
    expect(b).toMatchObject({ variable: 228000, contribution: 372000, fixed: 345000, fixedPerMonth: 28750, result: 27000, complete: true });
    expect(b.ratePct).toBeCloseTo(62, 5);
    expect(b.threshold).toBeCloseTo(556451.6, 0);
    expect(b.thresholdPct).toBeCloseTo(92.74, 1);
    expect(b.months).toBeCloseTo(11.13, 1);
    expect(b.safety).toBeCloseTo(43548.4, 0);
    expect(b.safetyPct).toBeCloseTo(7.26, 1);
    expect(b.leverage).toBeCloseTo(13.78, 1);
  });

  it('gives nothing without revenue, and no threshold without fixed costs or without margin', () => {
    expect(breakEven(undefined)).toBeNull();
    expect(breakEven(blankAccounts(now))).toBeNull();
    const noFixed = breakEven({ ...blankAccounts(now), revenue: 100000, purchases: 40000 })!;
    expect(noFixed).toMatchObject({ complete: false, threshold: null, safety: null, months: null });
    const noMargin = breakEven({ ...A, purchases: 600000 })!;
    expect(noMargin.ratePct).toBeLessThan(0);
    expect(noMargin.threshold).toBeNull();
    expect(proposedSettings({ ...A, purchases: 600000 })).toBeNull();
  });

  it('a year under the threshold: negative margin of safety, reached after the 12 months, no date', () => {
    const b = breakEven({ ...A, revenue: 520000 })!;
    expect(b.safety).toBeLessThan(0);
    expect(b.months).toBeGreaterThan(12);
    expect(b.leverage).toBeNull();
    expect(breakEvenDate(2025, b.months)).toBeNull();
    expect(breakEvenInsights({ ...A, revenue: 520000 })[0]).toMatchObject({ key: 'loss', tone: 'bad' });
  });

  it('finds the day the threshold is reached on a calendar year', () => {
    const d = breakEvenDate(2025, breakEven(A)!.months)!;
    expect([d.getMonth(), d.getDate()]).toEqual([11, 6]);
    expect(breakEvenDate(2025, 0)).toEqual(new Date(2025, 0, 1));
    expect(breakEvenDate(2025, null)).toBeNull();
  });

  it('measures what a price cut costs in volume, and what a price rise allows to lose', () => {
    const p = priceVolume(35, 5);
    expect(p.cut).toBeCloseTo(16.67, 1);
    expect(p.rise).toBeCloseTo(12.5, 1);
    expect(priceVolume(5, 5)).toEqual({ cut: null, rise: 50 });   // the price falls to the variable costs: no volume makes it up
    expect(priceVolume(0, 5)).toEqual({ cut: null, rise: null });
    expect(priceVolume(35, 0)).toEqual({ cut: null, rise: null });
  });

  it('proposes the values the other tools use, and none when they cannot be computed', () => {
    expect(proposedSettings(A)).toEqual({ variableMarginPct: 62, netMarginPct: 3.3, overheadPct: 47.7, floorPct: 32.3 });   // floor: the gross margin that only pays the overheads
    expect(proposedSettings({ ...A, result: null })!.netMarginPct).toBe(4.5);          // without the typed result: the computed one
    expect(proposedSettings({ ...A, result: -10000 })!.netMarginPct).toBeNull();       // a loss is not a usual margin
    expect(proposedSettings({ ...blankAccounts(now), revenue: 100000, purchases: 40000 })).toBeNull();
  });

  it('warns in order of severity, and checks the typed result against the computed one', () => {
    expect(breakEvenInsights(A).map(i => i.key)).toEqual(['fragile', 'leverage', 'monthly']);
    expect(breakEvenInsights({ ...A, result: 60000 }).map(i => i.key)).toEqual(['fragile', 'leverage', 'gap', 'monthly']);
    expect(breakEvenInsights({ ...A, result: null }).map(i => i.key)).not.toContain('gap');
    expect(breakEvenInsights({ ...A, revenue: 900000, result: null }).map(i => i.key)).toEqual(['monthly']);   // comfortable year: only the monthly cost of the structure
    expect(breakEvenInsights({ ...blankAccounts(now), revenue: 100000 })[0]).toMatchObject({ key: 'nofixed', tone: 'warn' });
    expect(breakEvenInsights({ ...A, purchases: 600000 })[0]).toMatchObject({ key: 'nomargin', tone: 'bad' });
    expect(breakEvenInsights(undefined)).toEqual([]);
  });

  it('status of the tool: to fill, reserved to management in team view, then by margin of safety', () => {
    expect(toolBadge(blankState('industrie', now), '1.4', '2026-09', now)).toMatchObject({ n: 0, tone: 'pending', text: 'Chiffres du compte de résultat à saisir' });
    const s = demoState(now);
    expect(s.settings.accounts).toEqual(A);
    expect(toolBadge(s, '1.4', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: 'Marge de sécurité fragile : 7,3 %' });
    expect(toolBadge(s, '1.4', '2026-09', now, false)).toEqual({ n: 0, tone: 'pending', text: 'Réservé à la direction' });
    expect(toolBadge(blankState('industrie', now), '1.4', '2026-09', now, false).text).toBe('Réservé à la direction');
    s.settings.accounts = { ...A, revenue: 520000 };
    expect(toolBadge(s, '1.4', '2026-09', now)).toMatchObject({ n: 1, tone: 'alert', text: 'Exercice sous le seuil de rentabilité' });
    s.settings.accounts = { ...A, revenue: 900000 };
    expect(toolBadge(s, '1.4', '2026-09', now)).toMatchObject({ n: 0, tone: 'ok' });
    s.settings.accounts = { ...A, purchases: 600000 };
    expect(toolBadge(s, '1.4', '2026-09', now)).toMatchObject({ n: 1, tone: 'alert' });
    s.settings.accounts = { ...blankAccounts(now), revenue: 100000 };
    expect(toolBadge(s, '1.4', '2026-09', now)).toMatchObject({ n: 0, tone: 'pending', text: 'Chiffres du compte de résultat à compléter' });
  });

  it('the accounts travel with the settings, in the direction folder only', () => {
    const s = demoState(now);
    expect(bucketOf('settings', s)).toBe('direction');
    const flat = flatten(s);
    expect(unflatten(JSON.parse(JSON.stringify(flat))).settings.accounts).toEqual(A);
    // nothing of the accounts outside the settings key (the team folder never sees them)
    expect(Object.entries(flat).filter(([k, v]) => k !== 'settings' && JSON.stringify(v).includes('labourProduction'))).toEqual([]);
  });
});
