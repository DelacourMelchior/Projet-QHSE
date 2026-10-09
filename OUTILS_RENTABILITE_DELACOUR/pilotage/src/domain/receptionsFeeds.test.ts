// Figures of tool 3.4 proposed to the dashboard 1.1: the five indicators, their value of a month, the proposal of the box of the tool.
import { describe, expect, it } from 'vitest';
import type { Delivery, Milestone, State, Strokes } from './types';
import { RECEPTION_KPIS, addReceptionKpis, isReceptionKpi, receptionFeeds, receptionKpiValue, receptionsBetween } from './receptionsFeeds';
import { addReserve, checkMilestone, liftReserve, newDelivery, nextPresentation, refuse, releaseDelivery, setNoSign, setPvPhoto, setQuantities, setResult, signClient, startReception, unreleaseDelivery, waiveMilestone } from './receptions';
import { newQuote } from './commercial';
import { feeds } from './feeds';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);   // Friday 25 September 2026
const st = (ds: Delivery[] = [], over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [{ id: 'P3', name: 'P3', color: '#000', order: 3, kpiIds: [] }], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), deliveries: Object.fromEntries(ds.map(d => [d.id, d])), ...over,
});
const P = st().params;
const at = (day: string, hm = '10:00') => `${day}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];   // a drawing worth a signature (signatureOk)
const A = 'Alice', IDS = ['m1', 'm2', 'm3'];
// a lift needs a person and a proof (photo, note or the signature of the customer); in these tests the moment of the writing is the moment of the fact
const lift = (d: Delivery, rid: string, r: Parameters<typeof liftReserve>[2]) => liftReserve(d, rid, { now: r.at, note: 'Constaté sur place', ...r });
const ms = (): Milestone[] => IDS.map((id, i) => ({ id, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (id: string, over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id, ref: `CMD-${id.toUpperCase()}`, client: 'Société Martin', item: 'Lot', qty: 10, milestones: ms(), ...over });
const allOk = (d: Delivery, day = '2026-08-10') => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at(day, '09:00') }), d);
const released = (d: Delivery, day = '2026-08-11') => releaseDelivery(allOk(d), { by: 'Marc', at: at(day, '16:00') });
const delivered = (d: Delivery, day: string, result?: 'sans' | 'reserve') => { const x = startReception(d, { at: at(day, '14:00') }); return result ? setResult(x, result, at(day, '14:30')) : x; };
const signed = (d: Delivery, day: string) => signClient(d, ink, at(day, '14:40'), A);
const val = (s: State, role: string, period = '2026-09') => receptionKpiValue(s, role as never, period, now);

describe('indicators proposed to the dashboard', () => {
  it('adds the five indicators once, never twice, in the process P3, with no amount', () => {
    const d = st();
    expect(RECEPTION_KPIS).toHaveLength(5);
    expect(addReceptionKpis(d)).toBe(5);
    expect(addReceptionKpis(d)).toBe(0);
    expect(Object.values(d.kpis).every(isReceptionKpi)).toBe(true);
    expect(d.processes[0].kpiIds).toHaveLength(5);
    Object.values(d.kpis).forEach(k => { expect(k).toMatchObject({ processId: 'P3', unit: '%', direction: 'higher', source: 'Outil 3.4', confidential: false }); expect(JSON.stringify(k)).not.toContain('€'); });
    expect(Object.values(d.kpis).map(k => k.role)).toEqual(['recep_clean', 'recep_lifted', 'recep_first', 'recep_released', 'recep_promised']);
  });
  it('does not add the indicator a company already follows (by id or by role), and takes the first process when P3 does not exist', () => {
    const d = st([], { processes: [{ id: 'P1', name: 'P1', color: '#000', order: 1, kpiIds: [] }] });
    d.kpis.mine = { ...{ id: 'mine', name: 'Mes réceptions', processId: 'P1', type: 'Garde-fou', unit: '%', direction: 'higher', aggregation: 'avg', target: '', targetValue: null, confidential: false, source: '' }, role: 'recep_clean' as never };
    expect(addReceptionKpis(d)).toBe(4);
    expect(d.processes[0].kpiIds).toHaveLength(4);
    expect(isReceptionKpi(d.kpis.mine)).toBe(true);
    expect(isReceptionKpi({ ...d.kpis.mine, id: 'other', role: 'otif' })).toBe(false);
  });
  it('computes nothing for a company without orders, for an unknown role, or for a month without any record', () => {
    expect(receptionFeeds(st(), '2026-09', now)).toEqual([]);
    const s = st([signed(delivered(released(dl('a', { promisedAt: '2026-09-15' })), '2026-09-10', 'sans'), '2026-09-10')]);
    expect(val(s, 'otif')).toBeNull();
    expect(val(s, 'recep_clean', '2026-11')).toBeNull();
    expect(receptionFeeds(s, '2026-11', now)).toEqual([]);
  });
  it('gives the share of receptions pronounced without reservation in the month (a refusal is not a reception pronounced)', () => {
    const s = st([
      signed(delivered(released(dl('a')), '2026-09-10', 'sans'), '2026-09-10'), signed(delivered(released(dl('b')), '2026-09-12', 'reserve'), '2026-09-12'),
      signed(delivered(released(dl('c')), '2026-09-14', 'sans'), '2026-09-14'), signed(refuse(delivered(released(dl('d')), '2026-09-15'), { reason: 'Autre', other: 'x', next: 'À remplacer' }, at('2026-09-15'), A), '2026-09-15'),
      signed(delivered(released(dl('e')), '2026-08-20', 'sans'), '2026-08-20'),
    ]);
    expect(val(s, 'recep_clean')).toBe(67);
    expect(val(s, 'recep_clean', '2026-08')).toBe(100);
    expect(val(s, 'recep_clean', '2026-10')).toBeNull();
  });
  it('counts only the receptions whose PV is signed: the customer, the photo of the paper PV or the mention absent with a witness; a result with no signature is not counted (G-18, the proof p3 P13)', () => {
    const unsigned = delivered(released(dl('u')), '2026-09-11', 'sans');
    const finger = signed(delivered(released(dl('f')), '2026-09-10', 'sans'), '2026-09-10');
    const paper = setPvPhoto(delivered(released(dl('p')), '2026-09-12', 'reserve'), 'photo:pv-1-1', at('2026-09-12', '15:00'), A);
    const absent = setNoSign(delivered(released(dl('a')), '2026-09-13', 'sans'), 'absent', 'Bruno', at('2026-09-13', '15:00'), A);
    expect(val(st([unsigned]), 'recep_clean')).toBeNull();   // nothing signed: nothing to say
    expect(val(st([unsigned, finger]), 'recep_clean')).toBe(100);   // the result without signature does not dilute
    expect(val(st([unsigned, finger, paper, absent]), 'recep_clean')).toBe(67);
    expect(receptionFeeds(st([unsigned]), '2026-09', now).find(f => f.role === 'recep_clean')).toBeUndefined();
    expect(RECEPTION_KPIS.find(k => k.role === 'recep_clean')?.how).toMatch(/PV est signé/);
    // a closed delivery of an order counts by its own signature
    const first = signed(delivered(released(dl('t', { qty: 10 })), '2026-09-02', 'sans'), '2026-09-02');
    const two = nextPresentation({ ...first, reception: { ...first.reception, qty: 4 } }, A, at('2026-09-03'));
    const second = delivered(released(two, '2026-09-04'), '2026-09-18', 'reserve');   // the second delivery is not signed yet
    expect(val(st([second]), 'recep_clean')).toBe(100);
  });
  it('counts a delivery in several times once for each of its receptions', () => {
    const first = signed(delivered(released(dl('a', { qty: 10 })), '2026-09-02', 'sans'), '2026-09-02');
    const two = nextPresentation({ ...first, reception: { ...first.reception, qty: 4 } }, A, at('2026-09-03'));
    const second = signed(delivered(released(two, '2026-09-04'), '2026-09-18', 'reserve'), '2026-09-18');
    expect(val(st([second]), 'recep_clean')).toBe(50);
  });
  it('gives the share of reservations lifted in time, among the ones whose deadline falls in the month and which are decided (lifted, or already late)', () => {
    // received on Tuesday 8 September: the deadline is 7 working days later, Thursday 17 September
    let d = delivered(released(dl('a')), '2026-09-08', 'reserve');
    ['Poignée', 'Rayure', 'Joint', 'Vis'].forEach((t, i) => { d = addReserve(d, { text: t, by: A, at: at(i < 3 ? '2026-09-08' : '2026-09-22', '15:00') }); });
    const [r1, r2, , r4] = d.reception.reserves!;
    d = lift(d, r1.id, { at: at('2026-09-16'), by: 'M. Durand' });   // in time
    d = lift(d, r2.id, { at: at('2026-09-21'), by: 'M. Durand' });   // two working days late
    d = signed(d, '2026-09-08');                                            // the third is open and late; the fourth falls in October
    expect(r4.text).toBe('Vis');
    expect(val(st([d]), 'recep_lifted')).toBe(33);
    expect(val(st([d]), 'recep_lifted', '2026-10')).toBeNull();   // October: not decided yet, nothing to say
    // a later day of reference decides it
    expect(receptionKpiValue(st([d]), 'recep_lifted' as never, '2026-10', new Date(2026, 9, 5))).toBe(0);
  });
  it('counts the reservations of the closed deliveries too: lifted in time, lifted late, or still open and late', () => {
    // 3 reservations on the first delivery (received on Tuesday 8 September, deadline Thursday 17), closed into the lots before any of them is lifted
    let d = delivered(released(dl('a', { qty: 20 })), '2026-09-08', 'reserve');
    d = ['Poignée', 'Rayure', 'Joint'].reduce<Delivery>((x, t) => addReserve(x, { text: t, by: A, at: at('2026-09-08', '15:00') }), { ...d, reception: { ...d.reception, qty: 10 } });
    d = nextPresentation(signed(d, '2026-09-08'), A, at('2026-09-09'));
    expect(d.reception.reserves).toBeUndefined();
    const [r1, r2] = d.lots![0].reception.reserves!;
    expect(val(st([d]), 'recep_lifted')).toBe(0);   // none lifted, all late: nothing in time
    d = lift(d, r1.id, { at: at('2026-09-16'), by: 'M. Durand' });   // in time
    d = lift(d, r2.id, { at: at('2026-09-21'), by: 'M. Durand' });   // two working days late
    expect(val(st([d]), 'recep_lifted')).toBe(33);
    expect(val(st([d]), 'recep_lifted', '2026-10')).toBeNull();
  });
  it('gives the share of milestones conform at the first check, from the history (a rework is not a first time), the ones that do not apply left out', () => {
    let d = dl('a', { milestones: [...ms(), { id: 'm4', label: 'Sans objet', point: '', requirement: '', measured: '', ok: null, by: '', date: '', na: true }] });
    d = checkMilestone(d, 'm1', { ok: true, by: A, at: at('2026-09-03') });
    d = checkMilestone(d, 'm2', { ok: false, by: A, at: at('2026-09-04') });
    d = checkMilestone(d, 'm2', { ok: true, by: A, at: at('2026-09-05') });   // reworked: conform now, not at the first check
    d = checkMilestone(d, 'm3', { ok: true, by: A, at: at('2026-08-28') });   // another month
    expect(val(st([d]), 'recep_first')).toBe(50);
    expect(val(st([d]), 'recep_first', '2026-08')).toBe(100);
    // old data without history use the current result, on its day
    const old = dl('b', { milestones: ms().map((m, i) => ({ ...m, ok: i === 0 ? false : true, date: '2026-09-07', by: 'x' })) });
    expect(val(st([old]), 'recep_first')).toBe(67);
  });
  it('gives the share of releases made without derogation', () => {
    const plain = released(dl('a'), '2026-09-11');
    const waived = releaseDelivery(dl('b'), { by: 'Marc', at: at('2026-09-12', '16:00'), derogation: { why: 'Accord du client' } });
    const other = released(dl('c'), '2026-08-12');
    expect(waived.derogation).toMatchObject({ by: 'Marc', why: 'Accord du client' });
    expect(val(st([plain, waived, other]), 'recep_released')).toBe(50);
    expect(val(st([plain, waived, other]), 'recep_released', '2026-08')).toBe(100);
    expect(val(st([dl('z')]), 'recep_released')).toBeNull();   // nothing released
  });
  it('counts a release undone and made again as a release with derogation when a derogation was written in the journal; each delivery of an order answers for its own release (G-18)', () => {
    const ko = checkMilestone(allOk(dl('a')), 'm2', { ok: false, by: A, at: at('2026-09-10', '10:00') });
    const first = releaseDelivery(ko, { by: 'Marc', at: at('2026-09-11', '16:00'), derogation: { why: 'Accord du client' } });
    expect(val(st([first]), 'recep_released')).toBe(0);
    const undone = unreleaseDelivery(first, 'Marc', 'Reprise du jalon', at('2026-09-12', '08:00'));
    expect(undone.derogation).toBeUndefined();   // the derogation of the order goes with the release
    const again = releaseDelivery(checkMilestone(undone, 'm2', { ok: true, by: A, at: at('2026-09-12', '09:00') }), { by: 'Marc', at: at('2026-09-12', '16:00') });
    expect(again.derogation).toBeUndefined();
    expect(val(st([again]), 'recep_released')).toBe(0);   // before: 100 %, the release looked clean
    expect(val(st([again, released(dl('b'), '2026-09-11')]), 'recep_released')).toBe(50);
    expect(RECEPTION_KPIS.find(k => k.role === 'recep_released')?.how).toMatch(/refaite/);
    // a milestone waived, then checked again, is a derogation that existed too
    const waived = waiveMilestone(ko, 'm2', 'Marc', 'Accord du client', at('2026-09-10', '11:00'));
    const clean = releaseDelivery(checkMilestone(waived, 'm2', { ok: true, by: A, at: at('2026-09-10', '12:00') }), { by: 'Marc', at: at('2026-09-11', '16:00') });
    expect(clean.derogation).toBeUndefined();
    expect(val(st([clean]), 'recep_released')).toBe(0);
    // an order in two deliveries: the derogation of the first one (written, then the release made again) does not fall on the second
    const one = signed(delivered(releaseDelivery(checkMilestone(undone, 'm2', { ok: true, by: A, at: at('2026-09-12', '09:00') }), { by: 'Marc', at: at('2026-09-12', '16:00') }), '2026-09-14', 'sans'), '2026-09-14');
    const two = nextPresentation({ ...one, reception: { ...one.reception, qty: 4 } }, A, at('2026-09-15'));
    const second = released(two, '2026-09-18');
    expect(val(st([second]), 'recep_released')).toBe(50);   // the first delivery counts with its derogation, the second one without
  });
  it('gives the share of deliveries made by the promised day, only for the orders that have one, a delivery refused not counting (D-17), the one made again counting once it is received', () => {
    const early = delivered(released(dl('a', { promisedAt: '2026-09-12' })), '2026-09-10', 'sans');
    const late = delivered(released(dl('b', { promisedAt: '2026-09-09' })), '2026-09-12', 'sans');
    const none = delivered(released(dl('c')), '2026-09-12', 'sans');
    expect(val(st([early, late, none]), 'recep_promised')).toBe(50);
    const refused = refuse(delivered(released(dl('d', { promisedAt: '2026-09-15' })), '2026-09-10'), { reason: 'Autre', other: 'x', next: 'À reprendre et représenter' }, at('2026-09-10'), A);
    const again = delivered(nextPresentation(refused, A, at('2026-09-11')), '2026-09-20');
    expect(val(st([again]), 'recep_promised')).toBeNull();   // the first (refused) delivery is not a delivery made, the second one has no result yet
    expect(val(st([delivered(nextPresentation(refused, A, at('2026-09-11')), '2026-09-20', 'sans')]), 'recep_promised')).toBe(0);   // received, but after the day promised
    expect(val(st([dl('e', { promisedAt: '2026-09-15' })]), 'recep_promised')).toBeNull();
  });
  it('offers to the dashboard only the indicators that have something to say, with how each was computed, and only once they are followed', () => {
    const s = st([signed(delivered(released(dl('a', { promisedAt: '2026-09-15' }), '2026-09-09'), '2026-09-10', 'sans'), '2026-09-10')]);
    const offered = receptionFeeds(s, '2026-09', now);
    expect(offered.map(f => f.role)).toEqual(['recep_clean', 'recep_released', 'recep_promised']);
    offered.forEach(f => { expect(f.value).toBe(100); expect(f.how).not.toMatch(/€|euro/i); });
    // the box of the dashboard shows them once the indicators are added
    expect(feeds(s, '2026-09', now).filter(f => f.tool === '3.4')).toEqual([]);
    addReceptionKpis(s);
    const shown = feeds(s, '2026-09', now).filter(f => f.tool === '3.4');
    expect(shown.map(f => [f.kpi.role, f.value])).toEqual([['recep_clean', 100], ['recep_released', 100], ['recep_promised', 100]]);
    expect(shown.every(f => f.how.length > 10)).toBe(true);
  });
  it('changes nothing in what it reads', () => {
    const deep = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o).forEach(deep); Object.freeze(o); } return o; };
    const s = deep(st([signed(delivered(released(dl('a', { promisedAt: '2026-09-15' })), '2026-09-10', 'sans'), '2026-09-10')]));
    expect(() => RECEPTION_KPIS.forEach(k => receptionKpiValue(s, k.role, '2026-09', now))).not.toThrow();
    expect(() => receptionFeeds(s, '2026-09', now)).not.toThrow();
  });
});

// ---- lot 2: the figures read the same facts as the rest of the tool
describe('indicators: lot 2 (D-8, D-17, D-4, L-5, L-8)', () => {
  const two = (promisedAt = '2026-09-20') => {   // delivery 1 released clean and received in part, delivery 2 released by derogation, the same month
    let d = setQuantities(delivered(released(dl('a', { qty: 20, promisedAt }), '2026-09-11'), '2026-09-14', 'sans'), { qty: 10 }, A, at('2026-09-14', '14:35'));
    d = nextPresentation(signed(d, '2026-09-14'), A, at('2026-09-15'));
    d = checkMilestone(d, 'm1', { ok: false, by: A, at: at('2026-09-16') });
    return releaseDelivery(d, { by: 'Marc', at: at('2026-09-17'), derogation: { why: 'urgence client' } });
  };
  it('does not give the derogation of the delivery under way to a closed delivery released cleanly (D-8)', () => {
    const d = two();
    expect(d.lots![0].derogation).toBeUndefined();
    expect(d.derogation).toMatchObject({ by: 'Marc', why: 'urgence client' });
    expect(val(st([d]), 'recep_released')).toBe(50);
  });
  it('counts only the deliveries received and not refused, on the day of the reception (D-17)', () => {
    const refused = refuse(startReception(released(dl('r', { promisedAt: '2026-09-20' })), { at: at('2026-09-14', '14:00') }), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), A);
    expect(val(st([refused]), 'recep_promised')).toBeNull();
    const unfinished = startReception(released(dl('u', { promisedAt: '2026-09-10' })), { at: at('2026-09-14', '14:00') });
    expect(val(st([unfinished]), 'recep_promised')).toBeNull();
    const onTime = signed(delivered(released(dl('o', { promisedAt: '2026-09-20' })), '2026-09-14', 'sans'), '2026-09-14'), late = signed(delivered(released(dl('l', { promisedAt: '2026-09-10' })), '2026-09-14', 'reserve'), '2026-09-14');
    expect(val(st([onTime, late, refused, unfinished]), 'recep_promised')).toBe(50);
  });
  it('does not count a reception put off by a blocking reservation as pronounced (L-8)', () => {
    const put = signed(addReserve(delivered(released(dl('p', { promisedAt: '2026-09-20' })), '2026-09-14', 'reserve'), { text: 'fuite', severity: 'blocking', by: A, at: at('2026-09-14', '14:35') }), '2026-09-14');
    const clean = signed(delivered(released(dl('c', { promisedAt: '2026-09-20' })), '2026-09-14', 'sans'), '2026-09-14');
    expect(receptionsBetween(st([put]), '2026-09-01', '2026-09-30')).toEqual([]);
    expect(val(st([put]), 'recep_clean')).toBeNull();
    expect(val(st([put]), 'recep_promised')).toBeNull();
    expect(val(st([put, clean]), 'recep_clean')).toBe(100);
    expect(val(st([lift(put, put.reception.reserves![0].id, { at: at('2026-09-16'), by: A })]), 'recep_clean')).toBe(0);   // lifted: pronounced "avec réserve"
  });
  it('reads the promised day of the order, else of its quote (L-5)', () => {
    const q = { ...newQuote(st(), now), id: 'q1', client: 'Société Martin', object: 'Objet', weeks: 2, decidedAt: '2026-09-01T10:00', status: 'won' as const };
    const onTime = signed(delivered(released(dl('a', { quoteId: 'q1' })), '2026-09-14', 'sans'), '2026-09-14'), late = signed(delivered(released(dl('b', { quoteId: 'q1' })), '2026-09-16', 'sans'), '2026-09-16');
    expect(val(st([onTime, late], { quotes: { q1: q } }), 'recep_promised')).toBe(50);   // the quote says 15 September
    expect(val(st([onTime, late], { quotes: { q1: { ...q, weeks: 4 } } }), 'recep_promised')).toBe(100);
    expect(val(st([onTime, late]), 'recep_promised')).toBeNull();
  });
  it('does not follow the reservations of a refused delivery in the indicator of the lifts (D-4)', () => {
    const rv = addReserve(delivered(released(dl('a')), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:35') });
    expect(val(st([rv]), 'recep_lifted')).toBe(0);   // due on 23 September, late today
    const refused = refuse(rv, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-15'), A);
    expect(val(st([refused]), 'recep_lifted')).toBeNull();
    expect(val(st([nextPresentation(refused, A, at('2026-09-16'))]), 'recep_lifted')).toBeNull();
  });
});
