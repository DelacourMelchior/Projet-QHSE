// Business continuity: criticality, gravity scale, readiness state, effectiveness of preparation actions, storage split.
import { describe, expect, it } from 'vitest';
import type { Action, Risk, State } from './types';
import {
  gravityThresholds, newRisk, planBGain, riskActionEffectiveness, riskInsights, riskState, riskSummary, score, suggestedGravity, yearlyExposure, zoneOf,
} from './risk';
import { demoState } from './templates';
import { legacyRisks } from './migrate';
import { bucketOf, flatten, unflatten } from '../store/flat';

const today = new Date(2026, 8, 25);
const st = (risks: Risk[], actions: Action[] = []): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {},
  actions: Object.fromEntries(actions.map(a => [a.id, a])), risks: Object.fromEntries(risks.map(r => [r.id, r])),
});
const risk = (over: Partial<Risk> = {}): Risk => ({ ...newRisk('P1', today), id: 'r', title: 'Panne', owner: 'Jean', ...over });
const prep = (status: Action['status'], closedAt = ''): Action => ({
  id: 'a', kpiId: '', riskId: 'r', period: '2026-09', createdAt: '2026-09-01', constat: '', whys: [], plan: [], pilot: 'Jean', deadline: '2026-09-30', cost: null, status, closedAt,
});

describe('criticality', () => {
  it('scores and zones', () => {
    expect(score(risk({ gravity: 4, likelihood: 3 }))).toBe(12);
    expect(zoneOf(12)).toBe('high');
    expect(zoneOf(4)).toBe('medium');
    expect(zoneOf(3)).toBe('low');
  });
  it('gravity thresholds follow the revenue objective', () => {
    expect(gravityThresholds({ annualBudget: 600000 })).toEqual([1200, 12000, 48000]);
    expect(gravityThresholds({ annualBudget: 2500000 })).toEqual([5000, 50000, 200000]);
  });
  it('money: suggested gravity, yearly exposure, Plan B payback', () => {
    const r = risk({ likelihood: 3, cost: { perDay: 800, daysWithout: 10, daysWith: 2, planBCost: 1600 } });
    expect(suggestedGravity(r, { annualBudget: 600000 })).toBe(2);       // 8 000 €
    expect(yearlyExposure(r)).toBe(4000);                                // once every 2 years
    expect(planBGain(r)).toEqual({ avoided: 6400, paybackYears: 0.5 });
    expect(yearlyExposure(risk())).toBeNull();
  });
});

describe('readiness state', () => {
  it('uncovered, preparing, ready, tested, expired, failed', () => {
    expect(riskState(st([risk()]), risk(), today)).toBe('uncovered');
    const r = risk({ planB: 'Confrère' });
    expect(riskState(st([r], [prep('in_progress')]), r, today)).toBe('preparing');
    expect(riskState(st([r], [prep('done', '2026-09-10')]), r, today)).toBe('ready');
    expect(riskState(st([r]), r, today)).toBe('ready');                  // nothing to prepare
    const tested = { ...r, tests: [{ date: '2026-06-01', ok: true, note: '', by: '' }] };
    expect(riskState(st([tested]), tested, today)).toBe('tested');
    const old = { ...r, tests: [{ date: '2026-03-01', ok: true, note: '', by: '' }] };
    expect(riskState(st([old]), old, today)).toBe('expired');            // more than 180 days
    const ko = { ...r, tests: [{ date: '2026-03-01', ok: true, note: '', by: '' }, { date: '2026-09-01', ok: false, note: '', by: '' }] };
    expect(riskState(st([ko]), ko, today)).toBe('failed');               // the latest test counts
  });
  it('a preparation action is effective when the next test succeeds', () => {
    const r = risk({ planB: 'x', tests: [{ date: '2026-09-20', ok: true, note: '', by: '' }] });
    expect(riskActionEffectiveness(st([r]), prep('in_progress'))).toEqual({ state: 'pending' });
    expect(riskActionEffectiveness(st([r]), prep('done', '2026-09-10'))).toEqual({ state: 'effective', date: '2026-09-20' });
    expect(riskActionEffectiveness(st([r]), prep('done', '2026-09-22'))).toEqual({ state: 'waiting' });
  });
  it('coverage is the share of criticality whose Plan B is tested', () => {
    const a = risk({ id: 'a', gravity: 4, likelihood: 3, planB: 'x', tests: [{ date: '2026-09-01', ok: true, note: '', by: '' }] });
    const b = risk({ id: 'b', gravity: 2, likelihood: 2 });
    const sum = riskSummary(st([a, b]), today);
    expect(sum.coveragePct).toBe(75);
    expect(sum.byState.uncovered).toBe(1);
  });
});

describe('demo, messages, storage', () => {
  it('the demo shows every kind of message', () => {
    const s = demoState(today);
    expect(Object.keys(s.risks)).toHaveLength(7);
    expect(riskInsights(s, today).map(i => i.key)).toEqual(expect.arrayContaining(['failed', 'expired']));
  });
  it('money of a risk goes to the direction folder only', () => {
    const s = demoState(today);
    const m = flatten(s);
    expect(m['risk|risk_demo_cnc']).not.toHaveProperty('cost');
    expect(bucketOf('riskcost|risk_demo_cnc', s)).toBe('direction');
    expect(bucketOf('risk|risk_demo_cnc', s)).toBe('equipe');
    expect(unflatten(m).risks.risk_demo_cnc.cost?.perDay).toBe(2800);
    delete m['riskcost|risk_demo_cnc'];                                 // team member without rights
    expect(unflatten(m).risks.risk_demo_cnc.cost).toBeUndefined();
  });
  it('reads the rows of the previous tool 1.2', () => {
    const rs = legacyRisks({ rows: [['P3', 'Casse broche', 'Usure', 'Confrère X', 'David K. (Atelier)'], ['', '', '', '', '']] });
    expect(rs).toHaveLength(1);
    expect(rs[0]).toMatchObject({ processId: 'P3', title: 'Casse broche', cause: 'Usure', planB: 'Confrère X', owner: 'David K.' });
  });
});
