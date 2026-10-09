// Tool 3.4, the numbers of the PV (G-13, S-6): a counter per year that never goes down, a number given only when the gesture changes the proof, the facts "carried twice" and "absent from the series".
import { describe, expect, it } from 'vitest';
import type { Delivery, Reception, State, Strokes } from './types';
import { assignPvNo, carryPvCounter, checkMilestone, keepPvCounter, newDelivery, pvIssued, pvNumber, releaseDelivery, setNoSign, setPvPhoto, setResult, signClient, startReception } from './receptions';
import { pvGaps, receptionInsights } from './receptionsAll';
import { removeReceptionExample } from './receptionsExamples';
import { demoState } from './templates';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { logChanges } from '../store/flat';

const plain = (x: string) => x.replace(/[  ]/g, ' ');
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const at = (day: string, hm = '10:00') => `${day}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];
const withNo = (id: string, no: string, lots: string[] = []): Delivery => ({
  ...newDelivery(), id, ref: id.toUpperCase(), client: 'Client', item: 'Livrable', reception: { ...newDelivery().reception, ...(no ? { pvNo: no } : {}) },
  ...(lots.length ? { lots: lots.map((n, i) => ({ id: `lt${i}`, no: i + 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: { ...newDelivery().reception, pvNo: n } as Reception })) } : {}),
});
const state = (ds: Delivery[], counter?: Record<string, number>): State => { const s = st({ deliveries: Object.fromEntries(ds.map(d => [d.id, d])) }); if (counter) s.params = { ...s.params, reception: { pvCounter: counter } }; return s; };

describe('the counter of the PV numbers', () => {
  it('the next number follows the highest of the counter and of the PV present, per year', () => {
    expect(pvNumber(state([]), 2026)).toBe('PV-2026-001');
    expect(pvNumber(state([], { '2026': 12 }), 2026)).toBe('PV-2026-013');
    expect(pvNumber(state([withNo('a', 'PV-2026-014')], { '2026': 12 }), 2026)).toBe('PV-2026-015');
    expect(pvNumber(state([withNo('a', 'PV-2026-004', ['PV-2026-009'])], { '2025': 80 }), 2026)).toBe('PV-2026-010');
    expect(pvNumber(state([], { '2026': 3, '2027': 0, x: -4 } as never), 2027)).toBe('PV-2027-001');
    expect(pvNumber(state([], { '2026': 'x' } as never), 2026)).toBe('PV-2026-001');                // a damaged counter is no counter
    expect(pvIssued(state([withNo('a', 'PV-2026-004'), withNo('b', 'PV-2025-020')], { '2026': 2 }))).toEqual({ '2026': 4, '2025': 20 });
  });
  it('a deleted order, the removal of the example or a start over never gives a number twice', () => {
    const s = demoState(new Date(2026, 9, 6, 10, 0)), next = structuredClone(s);
    expect(pvNumber(s, 2026)).toBe('PV-2026-011');
    keepPvCounter(next);
    expect(next.params.reception?.pvCounter).toEqual({ '2026': 10 });
    removeReceptionExample(next);                                                                    // the orders of the example are gone, the counter stays
    expect(Object.keys(next.deliveries)).toEqual([]);
    expect(pvNumber(next, 2026)).toBe('PV-2026-011');
    expect(pvNumber({ ...next, params: { ...next.params, reception: undefined } }, 2026)).toBe('PV-2026-001');   // (without the counter the number would be given again: the point of it)
  });
  it('keepPvCounter replaces the settings, it never changes the previous state in place', () => {
    const prev = state([withNo('a', 'PV-2026-007')]), draft = { ...prev }, before = prev.params;
    keepPvCounter(draft);
    expect(draft.params).not.toBe(before);
    expect(draft.params.reception?.pvCounter).toEqual({ '2026': 7 });
    expect(before.reception).toBeUndefined();
    const same = state([withNo('a', 'PV-2026-007')], { '2026': 7 }), keep = same.params;
    keepPvCounter(same);
    expect(same.params).toBe(keep);                                                               // nothing to raise: nothing replaced
  });
  it('the journal of the store keeps the counter after each update, as the PV is numbered', () => {
    const prev = state([{ ...withNo('a', ''), id: 'a' }]), next = structuredClone(prev);
    next.deliveries.a = assignPvNo(next, next.deliveries.a, at('2026-10-06', '14:41'));
    logChanges(prev, next, 'Alice');
    expect(next.deliveries.a.reception.pvNo).toBe('PV-2026-001');
    expect(next.params.reception?.pvCounter).toEqual({ '2026': 1 });
    expect(prev.params.reception).toBeUndefined();
    delete next.deliveries.a;                                                                      // deleted afterwards
    logChanges(prev, next, 'Alice');
    expect(pvNumber(next, 2026)).toBe('PV-2026-002');
  });
  it('a state that takes the place of another (a backup put back, the start over) keeps the highest number of the replaced one', () => {
    const current = state([withNo('a', 'PV-2026-014'), withNo('b', 'PV-2025-003')]), older = state([withNo('a', 'PV-2026-009')], { '2026': 9 });
    const back = carryPvCounter(current, older);
    expect(back.params.reception?.pvCounter).toEqual({ '2026': 14, '2025': 3 });
    expect(pvNumber(back, 2026)).toBe('PV-2026-015');
    expect(carryPvCounter(current, st()).params.reception?.pvCounter).toEqual({ '2026': 14, '2025': 3 });   // the start over
    expect(carryPvCounter(null, older)).toBe(older);
    const already = state([], { '2026': 20, '2025': 3 });
    expect(carryPvCounter(current, already)).toBe(already);                                          // nothing to raise
    expect(current.params.reception).toBeUndefined();                                                // the state replaced is left alone
  });
});

describe('a number is given only when the gesture changes the proof', () => {
  const base = (): { s: State; d: Delivery } => {
    let d: Delivery = { ...newDelivery(), id: 'd1', ref: 'CMD-1', client: 'Client', item: 'Lot', qty: 5 };
    d = d.milestones.reduce((x, m, i) => checkMilestone(x, m.id!, { ok: true, by: 'Karim', at: at('2026-10-06', `09:0${i}`) }), d);
    d = releaseDelivery(d, { by: 'Marc', at: at('2026-10-06', '10:00') });
    d = setResult(startReception(d, { at: at('2026-10-06', '14:00') }), 'sans', at('2026-10-06', '14:30'), 'Alice');
    return { s: state([d]), d };
  };
  it('a refused signature, an empty photo or a refused mention gives no number', () => {
    const { s, d } = base(), s2 = (x: Delivery) => ({ ...s, deliveries: { d1: x } });
    expect(signClient(d, [[[5, 5], [5, 5]]] as Strokes, at('2026-10-06', '14:40'), 'Alice', s)).toBe(d);        // a dot is not a signature
    expect(signClient(d, ink, at('2026-10-06', '14:40'), '', s)).toBe(d);                                         // nobody records it
    expect(setPvPhoto(d, '', at('2026-10-06', '14:40'), 'Alice', s)).toBe(d);
    expect(setNoSign(d, 'absent', '', at('2026-10-06', '14:40'), 'Alice', undefined, s)).toBe(d);                 // no witness
    expect(d.reception.pvNo).toBeUndefined();
    expect(pvNumber(s2(d), 2026)).toBe('PV-2026-001');                                                           // nothing was consumed
    const signed = signClient(d, ink, at('2026-10-06', '14:40'), 'Alice', s);
    expect(signed.reception.pvNo).toBe('PV-2026-001');
    expect(pvNumber(s2(signed), 2026)).toBe('PV-2026-002');
  });
  it('the year is the one of the gesture, else the one of the day of the delivery; the clock is read when neither is a date', () => {
    const { s, d } = base();
    expect(assignPvNo(s, d, at('2027-01-04', '09:00')).reception.pvNo).toBe('PV-2027-001');
    expect(assignPvNo(s, d, '').reception.pvNo).toBe('PV-2026-001');
    const noDay = { ...d, reception: { ...d.reception, date: '' } };
    expect(assignPvNo(s, noDay, 'x').reception.pvNo).toBe(`PV-${new Date().getFullYear()}-001`);
  });
});

describe('the facts of the numbers: carried twice, absent from the series', () => {
  const now = new Date(2026, 9, 7, 10, 0), facts = (s: State) => receptionInsights(s, now).filter(i => i.key.startsWith('pv-')).map(i => ({ key: i.key, tone: i.tone, text: plain(i.text) }));
  it('a number carried by two orders is said in red, with both orders', () => {
    const s = state([withNo('a', 'PV-2026-011'), withNo('b', 'PV-2026-011'), withNo('c', 'PV-2026-012')]);
    expect(facts(s)).toEqual([{ key: 'pv-duplicate', tone: 'bad', text: 'PV-2026-011 : A (Client) et B (Client).' }]);
  });
  it('three carriers: the first ones separated, "et" before the last', () => {
    expect(facts(state([withNo('a', 'PV-2026-011'), withNo('b', 'PV-2026-011'), withNo('c', 'PV-2026-011')]))[0].text).toBe('PV-2026-011 : A (Client) ; B (Client) et C (Client).');
  });
  it('two deliveries of one order carrying the same number are told apart by the number of the delivery', () => {
    expect(facts(state([withNo('a', 'PV-2026-005', ['PV-2026-005'])]))[0].text).toBe('PV-2026-005 : A (Client), livraison 1 et A (Client), livraison 2.');
  });
  it('a number absent between the lowest and the highest of a year is said in amber; the numbers before the first present are not holes', () => {
    const s = state([withNo('a', 'PV-2026-011'), withNo('b', 'PV-2026-014'), withNo('c', 'PV-2025-001'), withNo('d', 'PV-2025-002')]);
    expect(pvGaps(Object.values(s.deliveries))).toEqual(['PV-2026-012', 'PV-2026-013']);
    expect(facts(s)).toEqual([{ key: 'pv-gap', tone: 'warn', text: 'PV-2026-012, PV-2026-013 sont absents de la suite des numéros.' }]);
    expect(facts(state([withNo('a', 'PV-2026-011'), withNo('b', 'PV-2026-013')]))[0].text).toBe('PV-2026-012 est absent de la suite des numéros.');
    expect(facts(state([withNo('a', 'PV-2026-011')]))).toEqual([]);
  });
  it('says nothing of the example (numbers 1 to 10 without a hole), nor of the first real PV after the example was removed', () => {
    const ex = demoState(new Date(2026, 9, 6, 10, 0));
    expect(facts(ex)).toEqual([]);
    const only = state([withNo('x', 'PV-2026-011')], { '2026': 10 });
    expect(facts(only)).toEqual([]);
  });
  it('the examples never carry a number twice', () => {
    const s = demoState(new Date(2026, 9, 6, 10, 0)), nos = Object.values(s.deliveries).flatMap(d => [d.reception.pvNo, ...(d.lots ?? []).map(l => l.reception.pvNo)]).filter(Boolean);
    expect(new Set(nos).size).toBe(nos.length);
  });
});
