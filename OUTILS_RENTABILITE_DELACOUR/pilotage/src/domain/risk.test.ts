// Business continuity: criticality and zone rules, rating, readiness state, delays, crisis directory, reflex cards PDF, storage split.
import { describe, expect, it } from 'vitest';
import type { Action, Risk, State } from './types';
import {
  autoThresholds, DEFAULT_SCALE, gravityScale, newRisk, planBGain, riskActionEffectiveness, riskInsights, riskState, riskSummary, score, slowness,
  staleContacts, suggestedGravity, testDueDate, yearlyExposure, zoneOf,
} from './risk';
import { formatDuration, parseDuration } from './duration';
import { cardPdf, reflexCardsPdf } from './reflexPdf';
import { contactLabel, toCheck } from './contacts';
import { wrap } from './pdf';
import { demoState } from './templates';
import { typicalRisks } from './riskTemplates';
import { contactsFromText, legacyRisks, normalize } from './migrate';
import { bucketOf, flatten, unflatten } from '../store/flat';

const today = new Date(2026, 8, 25);
const st = (risks: Risk[], actions: Action[] = []): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, contacts: {}, scale: DEFAULT_SCALE,
  actions: Object.fromEntries(actions.map(a => [a.id, a])), risks: Object.fromEntries(risks.map(r => [r.id, r])),
});
// red by default (4 x 3 = 12)
const risk = (over: Partial<Risk> = {}): Risk => ({ ...newRisk('P1', today), id: 'r', title: 'Panne', owner: 'Jean', gravity: 4, likelihood: 3, ...over });
const prep = (status: Action['status'], closedAt = ''): Action => ({
  id: 'a', kpiId: '', riskId: 'r', period: '2026-09', createdAt: '2026-09-01', constat: '', whys: [], plan: [], pilot: 'Jean', deadline: '2026-09-30', cost: null, status, closedAt,
});
const test = (date: string, ok = true) => ({ date, ok, note: '', by: '' });

describe('criticality and rating', () => {
  it('scores, zones, not rated', () => {
    expect(score(risk())).toBe(12);
    expect(zoneOf(12)).toBe('high');
    expect(zoneOf(4)).toBe('medium');
    expect(zoneOf(3)).toBe('low');
    expect(score(newRisk('P1'))).toBeNull();
    expect(riskState(st([]), newRisk('P1'), today)).toBe('unrated');
    expect(typicalRisks('btp').every(r => r.gravity === null && r.likelihood === null)).toBe(true);   // the company rates them
  });
  it('gravity bounds follow the revenue objective, or the company choice', () => {
    expect(autoThresholds({ annualBudget: 600000 })).toEqual([1200, 12000, 48000]);
    expect(autoThresholds({ annualBudget: 2500000 })).toEqual([5000, 50000, 200000]);
    const s = st([]);
    expect(gravityScale(s)[3].money).toMatch(/48\s000/);
    s.settings.gravityThresholds = [500, 5000, 20000];
    expect(gravityScale(s)[3].money).toMatch(/20\s000/);
    expect(gravityScale(s, false)[3].money).toBe('');   // team view: no amount
  });
  it('money: suggested gravity, yearly exposure, Plan B payback', () => {
    const r = risk({ likelihood: 3, cost: { perDay: 800, daysWithout: 10, daysWith: 2, planBCost: 1600 } });
    expect(suggestedGravity(r, { annualBudget: 600000 })).toBe(2);       // 8 000 €
    expect(yearlyExposure(r)).toBe(4000);                                // once every 2 years
    expect(planBGain(r)).toEqual({ avoided: 6400, paybackYears: 0.5 });
    expect(yearlyExposure(risk())).toBeNull();
  });
});

describe('readiness state and zone rules', () => {
  it('red: uncovered, preparing, ready, tested, expired after 6 months, failed', () => {
    expect(riskState(st([risk()]), risk(), today)).toBe('uncovered');
    const r = risk({ planB: 'Confrère' });
    expect(riskState(st([r], [prep('in_progress')]), r, today)).toBe('preparing');
    expect(riskState(st([r], [prep('done', '2026-09-10')]), r, today)).toBe('ready');
    expect(riskState(st([r]), r, today)).toBe('ready');                  // nothing to prepare
    const tested = { ...r, tests: [test('2026-06-01')] };
    expect(riskState(st([tested]), tested, today)).toBe('tested');
    expect(testDueDate(tested)).toBe('2026-11-28');
    const old = { ...r, tests: [test('2026-03-01')] };
    expect(riskState(st([old]), old, today)).toBe('expired');            // more than 180 days
    const ko = { ...r, tests: [test('2026-03-01'), test('2026-09-01', false)] };
    expect(riskState(st([ko]), ko, today)).toBe('failed');               // the latest test counts
  });
  it('orange: tested once a year; green: accepted', () => {
    const orange = risk({ gravity: 2, likelihood: 3, planB: 'x', tests: [test('2026-03-01')] });
    expect(riskState(st([orange]), orange, today)).toBe('tested');       // 208 days, still valid in orange
    expect(testDueDate(orange)).toBe('2027-03-01');
    const green = risk({ gravity: 1, likelihood: 3 });
    expect(riskState(st([green]), green, today)).toBe('accepted');
  });
  it('a preparation action is effective when the next test succeeds', () => {
    const r = risk({ planB: 'x', tests: [test('2026-09-20')] });
    expect(riskActionEffectiveness(st([r]), prep('in_progress'))).toEqual({ state: 'pending' });
    expect(riskActionEffectiveness(st([r]), prep('done', '2026-09-10'))).toEqual({ state: 'effective', date: '2026-09-20' });
    expect(riskActionEffectiveness(st([r]), prep('done', '2026-09-22'))).toEqual({ state: 'waiting' });
  });
  it('coverage: share of the orange and red criticality tested in time', () => {
    const a = risk({ id: 'a', gravity: 4, likelihood: 3, planB: 'x', tests: [test('2026-09-01')] });
    const b = risk({ id: 'b', gravity: 2, likelihood: 2 });
    const c = risk({ id: 'c', gravity: 1, likelihood: 1 });              // green: not counted
    const d = risk({ id: 'd', gravity: null, likelihood: null });        // not rated: not counted
    const sum = riskSummary(st([a, b, c, d]), today);
    expect(sum.coveragePct).toBe(75);
    expect(sum.byState).toMatchObject({ uncovered: 1, accepted: 1, unrated: 1, tested: 1 });
  });
});

describe('delays', () => {
  it('reads, writes and compares durations', () => {
    expect(parseDuration('sous 4 h')).toEqual({ value: 4, unit: 'h' });
    expect(parseDuration('2 jours')).toEqual({ value: 2, unit: 'j' });
    expect(parseDuration('sous 1 semaine')).toEqual({ value: 1, unit: 'sem' });
    expect(parseDuration('immédiat')).toEqual({ value: 0, unit: 'h' });
    expect(formatDuration({ value: 2, unit: 'j' })).toBe('2 jours');
    expect(formatDuration({ value: 0, unit: 'h' })).toBe('immédiat');
  });
  it('a Plan B slower than the tolerable outage is flagged, measured delay first', () => {
    const r = risk({ maxOutage: { value: 2, unit: 'j' }, activation: { value: 3, unit: 'j' } });
    expect(slowness(r)).toEqual({ kind: 'announced', hours: 72 });
    const measured = { ...r, activation: { value: 1, unit: 'j' as const }, tests: [{ ...test('2026-09-01'), delay: { value: 60, unit: 'h' as const } }] };
    expect(slowness(measured)).toEqual({ kind: 'measured', hours: 60 });
    expect(slowness({ ...r, activation: { value: 4, unit: 'h' } })).toBeNull();
  });
});

describe('demo, directory, reflex cards', () => {
  it('the demo shows every state and every kind of message', () => {
    const s = demoState(today);
    expect(Object.keys(s.risks)).toHaveLength(9);
    const states = new Set(Object.values(s.risks).map(r => riskState(s, r, today)));
    expect([...states].sort()).toEqual(['accepted', 'expired', 'failed', 'preparing', 'ready', 'tested', 'uncovered', 'unrated']);
    expect(riskInsights(s, today).map(i => i.key)).toEqual(expect.arrayContaining(['failed', 'slow', 'expired', 'unrated', 'contacts', 'uncovered-medium']));
    expect(staleContacts(s, today).map(c => c.id)).toEqual(['ct_demo_banque2']);
  });
  it('old free-text contacts become directory entries, the same id for everyone', () => {
    const a = {}, b = {};
    const ids = contactsFromText('Prestataire informatique : 04 00 00 00 01\nThomas M., IT : 06 00 00 00 01', a);
    expect(ids).toEqual(contactsFromText('Prestataire informatique : 04 00 00 00 01\nThomas M., IT : 06 00 00 00 01', b));
    expect(Object.values(a)).toMatchObject([{ name: 'Prestataire informatique', phone: '04 00 00 00 01', category: 'autre' }, { name: 'Thomas M.', role: 'IT', phone: '06 00 00 00 01' }]);
    const s = demoState(today);
    const r = s.risks.risk_demo_cyber as unknown as Record<string, unknown>;
    Object.assign(r, { maxOutage: '1 jour', activation: 'sous 4 h', contacts: 'Banque : 04 11 11 11 11', firstHour: 'Débrancher le réseau\nAppeler le support' });
    delete r.contactIds; delete r.steps;
    delete (s.contacts.ct_demo_it as unknown as Record<string, unknown>).category;
    const ns = normalize(s);
    expect(ns.risks.risk_demo_cyber.maxOutage).toEqual({ value: 1, unit: 'j' });
    expect(ns.risks.risk_demo_cyber.contactIds).toHaveLength(1);
    expect(ns.contacts.ct_demo_it.category).toBe('autre');
    expect(ns.risks.risk_demo_cyber.steps).toEqual([{ when: '', what: 'Débrancher le réseau', who: '' }, { when: '', what: 'Appeler le support', who: '' }]);
    expect(ns.risks.risk_demo_cyber).not.toHaveProperty('firstHour');
  });
  it('directory: company first, numbers to check', () => {
    const s = demoState(today);
    expect(contactLabel(s.contacts.ct_demo_banque2)).toBe('Banque B · Conseiller entreprises');
    expect(toCheck(s.contacts.ct_demo_banque2, today)).toBe(true);    // 400 days
    expect(toCheck(s.contacts.ct_demo_it, today)).toBe(false);
    expect(toCheck({ ...s.contacts.ct_demo_it, verifiedAt: '' }, today)).toBe(true);
  });
  it('writes a valid PDF: one reflex card per page', () => {
    const s = demoState(today);
    const pdf = reflexCardsPdf(s, { company: 'Exemple', by: 'Jean', date: today });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(/[^\x09\x0a\x0d\x20-\x7e]/.test(pdf)).toBe(false);          // plain ASCII
    const count = Number(pdf.match(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/)![1]);
    expect(count).toBeGreaterThanOrEqual(9);
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');                     // offsets are right
    const one = cardPdf(s, s.risks.risk_demo_cnc, { company: '', by: '', date: today });
    expect(one).toContain('/Count 1');
  });
  it('wraps text on spaces, keeps "12 000 €" together', () => {
    const lines = wrap('Perte de 12 000 € par jour pendant la panne', 60, 11);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some(l => l.includes('12 000'))).toBe(true);
  });
});

describe('storage', () => {
  it('money of a risk goes to the direction folder only; directory and scale to everyone', () => {
    const s = demoState(today);
    const m = flatten(s);
    expect(m['risk|risk_demo_cnc']).not.toHaveProperty('cost');
    expect(bucketOf('riskcost|risk_demo_cnc', s)).toBe('direction');
    for (const k of ['risk|risk_demo_cnc', 'contact|ct_demo_it', 'scale']) expect(bucketOf(k, s)).toBe('equipe');
    const back = unflatten(m);
    expect(back.risks.risk_demo_cnc.cost?.perDay).toBe(2800);
    expect(back.contacts.ct_demo_it.phone).toBe('04 00 00 00 01');
    delete m['riskcost|risk_demo_cnc'];                                 // team member without rights
    expect(unflatten(m).risks.risk_demo_cnc.cost).toBeUndefined();
  });
  it('reads the rows of the previous tool 1.2, not rated', () => {
    const rs = legacyRisks({ rows: [['P3', 'Casse broche', 'Usure', 'Confrère X', 'David K. (Atelier)'], ['', '', '', '', '']] });
    expect(rs).toHaveLength(1);
    expect(rs[0]).toMatchObject({ processId: 'P3', title: 'Casse broche', cause: 'Usure', planB: 'Confrère X', owner: 'David K.', gravity: null });
  });
});
