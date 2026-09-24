import { describe, expect, it } from 'vitest';
import type { Kpi, State } from './types';
import { parseNumber, formatValue, formatCompact } from './numbers';
import { addMonths, periodsBetween, parseDate } from './periods';
import { effectiveness, insights, kpiStatus, lastFilledPeriod, synthesis, trend, yearSummary, yearToDate } from './engine';
import { demoState, blankState } from './templates';
import { fromLegacyTool } from './migrate';

const kpi = (over: Partial<Kpi> = {}): Kpi => ({
  id: 'k', name: 'KPI', processId: 'P1', type: 'Moteur', unit: '€', direction: 'higher', aggregation: 'sum',
  target: '100', targetValue: 100, confidential: false, source: '', ...over,
});
const stateWith = (k: Kpi, vals: (number | null)[], start = '2026-01'): State => {
  const ps = periodsBetween(start, addMonths(start, Math.max(vals.length, 12) - 1));
  const values: Record<string, number> = {};
  vals.forEach((v, i) => { if (v !== null) values[ps[i]] = v; });
  return {
    settings: { companyName: '', profile: 'industrie', annualBudget: 1200, netMarginPct: 5, avgQuoteValue: 100 },
    timeline: { start: ps[0], end: ps[ps.length - 1] },
    processes: [{ id: 'P1', name: 'P1', color: '#000', order: 0, kpiIds: [k.id] }],
    kpis: { [k.id]: k }, values: { [k.id]: values }, actions: {}, risks: {},
  };
};

describe('numbers', () => {
  it('reads French formats', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56);
    expect(parseNumber('45 000 €')).toBe(45000);
    expect(parseNumber('2.5 h')).toBe(2.5);
    expect(parseNumber('12k€')).toBe(12000);
    expect(parseNumber('-')).toBeNull();
  });
  it('formats', () => {
    expect(formatValue(52400, '€')).toMatch(/^52\s400 €$/);
    expect(formatValue(35.5, '%')).toBe('35,5 %');
    expect(formatCompact(30000, '€')).toBe('30 k€');
    expect(formatCompact(52400, '€')).toBe('52,4 k€');
  });
  it('reads dates', () => {
    expect(parseDate('14/01/2026')?.getMonth()).toBe(0);
    expect(parseDate('2026-03-05')?.getDate()).toBe(5);
  });
});

describe('status', () => {
  it('higher is better: drift to -10 %, alert beyond', () => {
    expect(kpiStatus(kpi(), 100).level).toBe('ok');
    expect(kpiStatus(kpi(), 95).level).toBe('warn');
    expect(kpiStatus(kpi(), 80).level).toBe('alert');
    expect(kpiStatus(kpi(), null).level).toBe('pending');
  });
  it('lower is better: drift to +20 %', () => {
    const k = kpi({ direction: 'lower' });
    expect(kpiStatus(k, 115).level).toBe('warn');
    expect(kpiStatus(k, 130).level).toBe('alert');
  });
  it('zero target shows an absolute gap', () => {
    const st = kpiStatus(kpi({ direction: 'lower', targetValue: 0 }), 2);
    expect(st.level).toBe('alert');
    expect(st.text).toMatch(/2 pour 0/);
  });
});

describe('year summary', () => {
  it('only counts the calendar year of the period', () => {
    const k = kpi();
    const s = stateWith(k, [999, 100, 50], '2025-12');
    expect(yearToDate(s, k, '2026-02').sum).toBe(150);
    expect(yearSummary(s, k, '2026-02')).toEqual({ value: 150, label: 'Cumul' });
  });
  it('stocks use the last value', () => {
    const k = kpi({ aggregation: 'last' });
    expect(yearSummary(stateWith(k, [40, 30]), k, '2026-02').value).toBe(30);
  });
});

describe('trend and slow drift', () => {
  it('needs 6 months', () => {
    const k = kpi();
    expect(trend(stateWith(k, [1, 2, 3, 4, 5]), k, '2026-05')).toBeNull();
  });
  it('flags a compliant KPI whose average worsens 3 months in a row', () => {
    const k = kpi({ targetValue: 30 });
    const s = stateWith(k, [35, 35, 34.5, 34, 33, 32, 31.5, 30.5]);
    expect(trend(s, k, '2026-08')?.drifting).toBe(true);
    expect(trend(s, { ...k, targetValue: 31 }, '2026-08')?.drifting).toBe(false); // already in alert
  });
});

describe('effectiveness', () => {
  it('is judged on the month after closure', () => {
    const k = kpi();
    const s = stateWith(k, [90, 80, 120]);
    const a = { id: 'a', kpiId: 'k', period: '2026-01', createdAt: '2026-01-05', constat: '', whys: [], plan: [], pilot: 'X', deadline: '', cost: null, status: 'done' as const, closedAt: '2026-01-20' };
    expect(effectiveness(s, a).state).toBe('relapse');          // February 80 < 100
    expect(effectiveness(s, { ...a, closedAt: '2026-02-10' }).state).toBe('effective'); // March 120
    expect(effectiveness(s, { ...a, status: 'in_progress' }).state).toBe('pending');
    expect(effectiveness(s, { ...a, closedAt: '2026-03-10' }).state).toBe('waiting');   // April not entered
  });
});

describe('demo and templates', () => {
  const d = demoState();
  it('demo has a full year, 15 KPIs and its actions', () => {
    expect(Object.keys(d.kpis)).toHaveLength(15);
    expect(lastFilledPeriod(d)).toBe('2026-12');
    expect(Object.keys(d.actions).length).toBeGreaterThanOrEqual(13);
    expect(d.kpis.kpi_treso.aggregation).toBe('last');
  });
  it('december summary: 5 alerts, 3 without pilot, slow drift on conversion rate', () => {
    const syn = synthesis(d, '2026-12');
    expect(syn.alerts).toHaveLength(5);
    expect(syn.orphans).toHaveLength(3);
    const ins = insights(d, '2026-12', false).map(i => i.key);
    expect(ins).toContain('drift');
    expect(ins).toContain('orphans');
  });
  it('a month being entered does not replace the last complete month, and is flagged incomplete', () => {
    const s = structuredClone(d);
    s.timeline.end = '2027-01';
    s.values.kpi_ca['2027-01'] = 51200;
    expect(lastFilledPeriod(s)).toBe('2026-12');
    expect(insights(s, '2027-01', false).map(i => i.key)).toContain('missing');
  });
  it('team view never mentions confidential KPIs', () => {
    const txt = insights(d, '2026-12', true).map(i => i.text).join(' ');
    expect(txt).not.toMatch(/Chiffre d'Affaires|projection|Atterrissage/);
  });
  it('blank templates have KPIs but no value', () => {
    for (const p of ['industrie', 'btp', 'services'] as const) {
      const b = blankState(p, new Date(2026, 8, 24));
      expect(Object.keys(b.kpis).length).toBeGreaterThan(10);
      expect(Object.keys(b.values)).toHaveLength(0);
      expect(b.timeline).toEqual({ start: '2026-01', end: '2026-12' });
    }
  });
  it('imports an old backup with columns and string values', () => {
    const s = fromLegacyTool({
      columns: [{ year: 2025, month: 11 }, { year: 2026, month: 0 }],
      processes: [{ id: 'P1', name: 'P1 : Direction', indicators: [{ id: 'kpi_ca', name: 'CA', unit: '€', calcType: 'sum', goalDirection: 'higher', targetVal: 50, target: '50', months: ['1.234,5 €', '48 900 €'] }] }],
      actionRegistry: [{ id: 'x', kpiId: 'kpi_ca', status: '✅ Clôturé le 20/01', date: '14/01/2026', action: 'Relance', pilot: 'Marc' }],
    });
    expect(s.values.kpi_ca).toEqual({ '2025-12': 1234.5, '2026-01': 48900 });
    expect(s.kpis.kpi_ca.role).toBe('ca');
    expect(s.actions.x.status).toBe('done');
    expect(s.processes[0].name).toBe('P1 · Direction');
  });
});
