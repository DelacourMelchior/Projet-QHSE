// Example of tools 1.4 to 1.6: filled in place, kept when the company typed its own, and given once to an example saved before.
import { describe, expect, it } from 'vitest';
import { applyCostExample } from './costExamples';
import { exampleAccounts } from './breakeven';
import { EXAMPLE_LEVEL, normalize } from './migrate';
import { workshopsToOpen } from './quality';
import { toolBadge } from './status';
import { blankState, demoState } from './templates';

const now = new Date(2026, 8, 25, 10, 0);
const IDS = ['1.4', '1.5', '1.6'];
const KEYS = ['accounts', 'previous', 'hourly', 'policy'] as const;
const isPast = (id: string) => id.startsWith('nc_demo_past_');
const tones = (s: ReturnType<typeof blankState>) => IDS.map(id => toolBadge(s, id, '2026-09', now).tone);
// an example company saved by an earlier build: the figures of some of the three tools, or none, and no level
const saved = (keep: readonly (typeof KEYS)[number][]) => {
  const s = structuredClone(demoState(now));
  KEYS.filter(k => !keep.includes(k)).forEach(k => delete s.settings[k]);
  delete s.settings.exampleLevel;
  s.ncs = Object.fromEntries(Object.entries(s.ncs).filter(([id]) => !isPast(id)));
  return s;
};

describe('example of tools 1.4 to 1.6', () => {
  it('fills the three tools of a new company', () => {
    const s = blankState('industrie', now);
    expect(tones(s)).toEqual(['pending', 'pending', 'pending']);
    applyCostExample(s, now);
    tones(s).forEach(t => expect(t).not.toBe('pending'));
  });

  it('keeps the figures and the stations the company already typed', () => {
    const s = blankState('industrie', now);
    s.settings.accounts = { ...exampleAccounts(now), year: 2024, revenue: 1_000_000 };
    applyCostExample(s, now);
    expect(s.settings.accounts.revenue).toBe(1_000_000);
    expect(s.settings.previous?.year).toBe(2023);
    const stations = structuredClone(s.settings.hourly!.stations);
    applyCostExample(s, now);
    expect(s.settings.hourly!.stations).toEqual(stations);
  });

  it('gives an example saved before the three tools existed their figures, without touching the saved data', () => {
    const old = saved([]);
    const back = normalize(old);
    KEYS.forEach(k => expect(back.settings[k], k).toBeTruthy());
    tones(back).forEach(t => expect(t).not.toBe('pending'));
    expect(back.settings.exampleLevel).toBe(EXAMPLE_LEVEL);
    KEYS.forEach(k => expect(old.settings[k], k).toBeUndefined());
    expect(Object.keys(back.ncs).filter(isPast)).toHaveLength(10);        // the defects of the two exercises, for the last light of 1.6
    expect(Object.keys(old.ncs).some(isPast)).toBe(false);
    Object.keys(old.ncs).forEach(id => expect(back.ncs[id], id).toBe(old.ncs[id]));
  });

  it('keeps the defects of the two exercises out of the workshops to open (5.3)', () => {
    const s = demoState(now);
    expect(Object.keys(s.ncs).filter(isPast)).toHaveLength(10);
    expect(workshopsToOpen(s, now).filter(w => isPast(w.id))).toEqual([]);
  });

  it('completes an example saved with only the first tools, keeping what it holds', () => {
    const old = saved(['accounts', 'hourly']);
    old.settings.accounts!.revenue = 700_000;
    const back = normalize(old);
    expect(back.settings.accounts?.revenue).toBe(700_000);
    expect(back.settings.previous).toBeTruthy();
    expect(back.settings.policy).toBeTruthy();
  });

  it('does it once: what the example company then clears stays cleared', () => {
    const back = normalize(saved([]));
    delete back.settings.accounts;
    expect(normalize(back).settings.accounts).toBeUndefined();
  });

  it('leaves alone a company that is not the example', () => {
    const own = blankState('industrie', now);
    own.settings.companyName = 'Atelier Martin';
    expect(normalize(own).settings.accounts).toBeUndefined();
    expect(normalize(own).settings.exampleLevel).toBeUndefined();
  });
});
