// Tool 3.4, rules that no other test pinned (lot 9, T-2). Each test below stands for a rule that was undone, one at a time, in a COPY of the code (outside the repository): the suite stayed
// green. It now fails when that rule is undone (the mutation that proves it is named at the head of each test: R = receptions.ts, A = receptionsAll.ts, F = receptionsFeeds.ts,
// C = commercial.ts / clients.ts). No test reads the clock: every moment is given.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery, Feedback, Milestone, Quote, Reception, State, Strokes } from './types';
import {
  addReserve, archiveDelivery, checkMilestone, counted, deliveryFromQuote, isPostponed, isSettled, liftReserve, ncFromMilestone, ncFromReserve, newDelivery, nextPresentation, patchReserve, pvNumber, qtyReceived, quotePromisedOn,
  OTHER, addMilestone, boundsChanged, correctLocked, currentState, deliveryState, lostByDeleting, photoReuse, receptionCfg, refuse, releaseDelivery, releasedAfterDelivery, repairReserve, reservesOf, setMilestoneNa, setNoSign, setPvPhoto, setQuantities, setResult, signatureOk, signatureReuse,
  signClient, signCompany, startReception, takeLife, waiveMilestone,
} from './receptions';
import { deliveryLevel, receptionInsights, receptionSummary, receptionTodos } from './receptionsAll';
import { addReceptionKpis, receptionKpiValue, receptionsBetween } from './receptionsFeeds';
import { deliveriesToAsk, pvFact } from './commercial';
import { clientReceptions } from './clients';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const st = (ds: Delivery[] = [], over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 }, timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {},
  contacts: {}, scale: DEFAULT_SCALE, ...emptyTools(), deliveries: Object.fromEntries(ds.map(d => [d.id, d])), ...over,
});
const P = st().params;
const at = (day: string, hm = '10:00') => `${day}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];
const ink2: Strokes = [[[12, 50], [70, 20], [130, 60], [180, 20], [240, 55]]];
const A = 'Alice', IDS = ['m1', 'm2', 'm3', 'm4'];
const ms = () => IDS.map((id, i) => ({ id, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id: 'dl1', ref: 'CMD-1', client: 'Client A', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const allOk = (d: Delivery, day = '2026-09-10') => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at(day, '09:00') }), d);
const released = (d: Delivery = dl(), day = '2026-09-11') => releaseDelivery(allOk(d), { by: 'Marc', at: at(day, '16:00') });
const arrived = (d: Delivery, day = '2026-09-14') => startReception(d, { at: at(day, '14:00'), place: 'Chantier Nord' });
const received = (d: Delivery, day = '2026-09-14', result: Reception['result'] = 'sans') => setResult(arrived(d, day), result, at(day, '14:30'));
const signed = (d: Delivery, day = '2026-09-14') => signClient(d, ink, at(day, '14:40'), A);
const withRv = (d: Delivery, text = 'Rayure', day = '2026-09-14', over: Partial<Parameters<typeof addReserve>[1]> = {}) => addReserve(d, { text, by: A, at: at(day, '14:35'), ...over });
const withRec = (d: Delivery, patch: Partial<Reception>): Delivery => ({ ...d, reception: { ...d.reception, ...patch } });
const plain = (x: string) => x.replace(/[\u00a0\u202f]/g, ' ');   // the texts of the tool carry the no-break spaces of French typography

describe('3.4 rules: the number of the PV, the reservations and what counts as received', () => {
  it('R08: the number of the next PV is the highest of the year, whatever the order the orders are read in, the closed deliveries included, other years and damaged numbers ignored', () => {
    const rec = (pvNo: string): Reception => ({ ...dl().reception, pvNo });
    const one = dl({ id: 'a', reception: rec('PV-2026-012') }), two = dl({ id: 'b', reception: rec('PV-2026-007') });
    expect(pvNumber(st([one, two]), 2026)).toBe('PV-2026-013');
    expect(pvNumber(st([two, one]), 2026)).toBe('PV-2026-013');
    const closed = dl({ id: 'c', reception: rec('PV-2026-003'), lots: [{ id: 'lt1', no: 1, closedAt: at('2026-09-01'), milestones: [], releasedBy: '', releasedAt: '', reception: rec('PV-2026-020') }] });
    expect(pvNumber(st([one, closed]), 2026)).toBe('PV-2026-021');
    expect(pvNumber(st([dl({ reception: rec('PV-2025-099') }), dl({ id: 'x', reception: rec('PV-2026-12x') })]), 2026)).toBe('PV-2026-001');
    expect(pvNumber(st(), 2027)).toBe('PV-2027-001');
  });
  it('R09: a reservation without gravity (old data) does not put the reception off; a blocking one open does, and lifted it does not', () => {
    const d = received(released(dl({ qty: 10 })), '2026-09-14', 'reserve');
    const old = withRec(d, { reserves: [{ id: 'rv_legacy', text: 'Poignée', raisedAt: '2026-09-14' }] });
    expect(counted(old.reception)).toBe(true);
    expect(isPostponed(old)).toBe(false);
    expect(qtyReceived(old)).toBe(10);
    const blocking = withRec(d, { reserves: [{ id: 'rv1', text: 'Fissure', raisedAt: '2026-09-14', severity: 'blocking' }] });
    expect([counted(blocking.reception), isPostponed(blocking), qtyReceived(blocking)]).toEqual([false, true, 0]);
    const lifted = withRec(d, { reserves: [{ id: 'rv1', text: 'Fissure', raisedAt: '2026-09-14', severity: 'blocking', liftedAt: '2026-09-16' }] });
    expect([counted(lifted.reception), qtyReceived(lifted)]).toEqual([true, 10]);
  });
  it('R10: the day a reservation was raised, its text, its photo, its place and its gravity are frozen on a signed PV (the deadline hangs on the day); free before the signature', () => {
    const open = withRv(received(released(), '2026-09-14', 'reserve'), 'Rayure', '2026-09-14', { photo: 'photo:r-1-1', where: 'Capot' }), rid = reservesOf(open)[0].id;
    const free = reservesOf(patchReserve(open, rid, { raisedAt: '2026-09-15', text: 'Autre', where: 'Porte', severity: 'blocking' }, A, at('2026-09-15')))[0];
    expect(free).toMatchObject({ raisedAt: '2026-09-15', text: 'Autre', where: 'Porte', severity: 'blocking' });
    const locked = signed(open);
    const same = reservesOf(patchReserve(locked, rid, { raisedAt: '2026-10-30', text: 'Autre', photo: 'photo:z-1-1', where: 'Porte', severity: 'blocking' }, A, at('2026-09-15')))[0];
    expect(same).toMatchObject({ raisedAt: '2026-09-14', text: 'Rayure', photo: 'photo:r-1-1', where: 'Capot', severity: 'minor' });
  });
  it('R21: the place typed first is not erased by a later call without a place, and a later place replaces it; the first moment stays', () => {
    const d = startReception(dl(), { at: at('2026-09-14'), place: 'Quai 3' });
    const again = startReception(d, { at: at('2026-09-14', '15:00') });
    expect(again.reception).toMatchObject({ place: 'Quai 3', date: '2026-09-14', time: '10:00' });
    expect(startReception(d, { at: at('2026-09-14', '15:00'), place: 'Quai 5' }).reception.place).toBe('Quai 5');
  });
  it('R24: a reservation already lifted is not repaired again, one not lifted is (the repair keeps the day and the person in charge)', () => {
    const open = withRv(received(released(), '2026-09-14', 'reserve')), rid = reservesOf(open)[0].id;
    const fixed = repairReserve(open, rid, { at: at('2026-09-16'), by: 'Paul', photo: 'photo:f-1-1' });
    expect(reservesOf(fixed)[0]).toMatchObject({ repairedAt: '2026-09-16', repairPhoto: 'photo:f-1-1', handler: 'Paul' });
    const lifted = liftReserve(open, rid, { at: at('2026-09-17'), by: A, note: 'Vu avec le client', now: at('2026-09-17') });
    expect(reservesOf(lifted)[0].liftedAt).toBe('2026-09-17');
    expect(repairReserve(lifted, rid, { at: at('2026-09-18'), by: 'Paul' })).toBe(lifted);
  });
});

describe('3.4 rules: the signatures and the next delivery', () => {
  it('R12: the signature of the company is not replaced once the PV is locked and the company signed; it can still be added to a locked PV that lacks it, and drawn again while the PV is open', () => {
    const open = received(released()), coSigned = signCompany(open, ink, at('2026-09-14', '14:35'), 'Paul');
    expect(coSigned.signCompany).toBe(ink);
    expect(signCompany(coSigned, ink2, at('2026-09-14', '14:36'), 'Paul').signCompany).toBe(ink2);   // open: drawn again, the last one is kept
    const lock = signed(coSigned);
    expect(signCompany(lock, ink2, at('2026-09-14', '15:00'), 'Marc')).toBe(lock);
    const late = signCompany(signed(open), ink2, at('2026-09-14', '15:00'), 'Marc');
    expect(late.signCompany).toBe(ink2);
    expect(late.reception.companySignedAt).toBe('2026-09-14T15:00');
  });
  it('R11: the signature of the customer is not replaced on a locked PV, and drawn again while the PV is open the journal keeps the imprint of the first', () => {
    const open = received(released()), first = signClient(open, ink, at('2026-09-14', '14:40'), A), lock = signed(open);
    expect(first.signClient).toBe(ink);
    expect(signClient(lock, ink2, at('2026-09-14', '15:00'), A)).toBe(lock);
    const noLock = signClient({ ...first, reception: { ...first.reception, result: '' } }, ink2, at('2026-09-14', '14:50'), A);
    expect(noLock.signClient).toBe(ink2);
    expect(noLock.journal?.at(-1)?.text).toMatch(/signature remplacée, empreinte de la précédente\s:\s[0-9a-f]{4}\s[0-9a-f]{4}\s[0-9a-f]{4}/);
  });
  it('R13: no next delivery is opened on an order that is settled (the quantity is there); one received in part opens it, and a refusal is closed as it is', () => {
    const whole = signed(received(released(dl({ qty: 10 })), '2026-09-14'));
    const full = withRec(whole, { qty: 10 });
    expect(isSettled(full)).toBe(true);
    expect(nextPresentation(full, A, at('2026-09-15'))).toBe(full);
    const part = withRec(whole, { qty: 4 });
    expect(isSettled(part)).toBe(false);
    expect(nextPresentation(part, A, at('2026-09-15')).lots).toHaveLength(1);
  });
});

describe('3.4 rules: the day promised by a quote (R22, R23)', () => {
  const q = (weeks: number | undefined, id = 'q1') => ({ id, client: 'Client Q', object: 'Objet Q', decidedAt: '2026-09-01', date: '2026-08-20', status: 'won', weeks }) as unknown as Quote;
  const sq = (weeks: number | undefined) => st([], { quotes: { q1: q(weeks) } });
  it('gives a whole number of days: 1,5 week is 11 days after the decision (10,5 days rounded up), 2 weeks 14, 1,4 week 10', () => {
    expect(deliveryFromQuote(sq(1.5), 'q1', P).promisedAt).toBe('2026-09-12');
    expect(deliveryFromQuote(sq(2), 'q1', P).promisedAt).toBe('2026-09-15');
    expect(deliveryFromQuote(sq(1.4), 'q1', P).promisedAt).toBe('2026-09-11');
    expect(quotePromisedOn(sq(1.5), 'q1')).toBe('2026-09-12');
  });
  it('gives no promised day for a quote of 0 week, a negative or an unknown number of weeks, nor without the day of the decision', () => {
    [0, -2, undefined].forEach(w => { expect(deliveryFromQuote(sq(w), 'q1', P)).not.toHaveProperty('promisedAt'); expect(quotePromisedOn(sq(w), 'q1')).toBe(''); });
    expect(quotePromisedOn(st([], { quotes: { q1: { ...q(2), decidedAt: '' } } }), 'q1')).toBe('');
    expect(deliveryFromQuote(sq(2), 'q1', P)).toMatchObject({ quoteId: 'q1', client: 'Client Q', item: 'Objet Q' });
  });
});

describe('3.4 rules: the tasks and the facts of the queue', () => {
  it('A01: a PV without a signature is a task from the day the delay of the settings is reached (2 working days: the second day, not the first, not the third only)', () => {
    const d = received(released(), '2026-09-22');   // a Tuesday
    const todo = (day: number) => receptionTodos(st([d]), new Date(2026, 8, day, 10, 0)).some(t => t.kind === 'unsigned');
    expect([todo(22), todo(23), todo(24), todo(25)]).toEqual([false, false, true, true]);
    const fact = (day: number) => receptionInsights(st([d]), new Date(2026, 8, day, 10, 0)).some(f => f.key === 'unsigned');
    expect([fact(23), fact(24)]).toEqual([false, true]);
  });
  it('A03: the same reservation text on two orders counts the one raised exactly 365 days ago, not the one raised 366 days ago', () => {
    const one = (id: string, day: string) => signed(withRv(received(released(dl({ id, ref: id.toUpperCase() }), '2025-09-10'), day, 'reserve'), 'Joint abîmé', day), day);
    const repeated = (old: string) => receptionInsights(st([one('a', old), one('b', '2026-09-22')]), now).some(f => f.key === 'repeat-reserve');
    expect(repeated('2025-09-25')).toBe(true);    // 365 days before the 25 September 2026
    expect(repeated('2025-09-24')).toBe(false);   // 366 days
  });
  it('A04: the tiles count the receptions of the last 12 months: 365 days ago yes, 366 days ago no (the percentage and the whole numbers agree)', () => {
    const one = (id: string, day: string, result: Reception['result'] = 'sans') => signed(received(released(dl({ id, ref: id.toUpperCase() }), '2025-09-10'), day, result), day);
    const sm = receptionSummary(st([one('a', '2025-09-25'), one('b', '2025-09-24'), one('c', '2025-09-26', 'reserve'), one('d', '2025-10-02')]), now);
    expect(sm).toMatchObject({ received: 3, receivedCount: 3, cleanCount: 2, sansReservePct: 67 });   // 2 of 3 (and not the 1 of 3 that a mix-up of "sans" and "avec réserve" gives)
    expect(receptionSummary(st([one('b', '2025-09-24')]), now)).toMatchObject({ received: 0, sansReservePct: null });
  });
  it('A04b: the tiles do not count a reception put off by a blocking reservation, nor one whose PV is not signed', () => {
    const open = received(released(dl({ id: 'o', ref: 'O' })), '2026-09-20');   // received but the PV is not signed
    const off = signed(withRv(received(released(dl({ id: 'p', ref: 'P' })), '2026-09-20', 'reserve'), 'Fissure', '2026-09-20', { severity: 'blocking' }), '2026-09-20');
    expect(receptionSummary(st([open, off]), now)).toMatchObject({ received: 0, cleanCount: 0 });
  });
});

describe('3.4 rules: the indicators of the dashboard', () => {
  it('F01: a delivery made ON the promised day is on time ("au plus tard"), one the day after is not', () => {
    const on = received(released(dl({ promisedAt: '2026-09-14' })), '2026-09-14'), after = received(released(dl({ id: 'b', ref: 'B', promisedAt: '2026-09-13' })), '2026-09-14');
    expect(receptionKpiValue(st([on]), 'recep_promised' as never, '2026-09', now)).toBe(100);
    expect(receptionKpiValue(st([after]), 'recep_promised' as never, '2026-09', now)).toBe(0);
    expect(receptionKpiValue(st([on, after]), 'recep_promised' as never, '2026-09', now)).toBe(50);
  });
  it('F02: a reception pronounced on the 31st belongs to its month, one pronounced on the 1st of the next month does not', () => {
    const last = signed(received(released(dl(), '2026-08-28'), '2026-08-31'), '2026-08-31'), first = signed(received(released(dl({ id: 'b', ref: 'B' }), '2026-08-28'), '2026-09-01', 'reserve'), '2026-09-01');
    expect(receptionKpiValue(st([last]), 'recep_clean' as never, '2026-08', now)).toBe(100);
    expect(receptionKpiValue(st([last, first]), 'recep_clean' as never, '2026-08', now)).toBe(100);
    expect(receptionKpiValue(st([last, first]), 'recep_clean' as never, '2026-09', now)).toBe(0);
    expect(receptionsBetween(st([last, first]), '2026-08-01', '2026-08-31').map(r => r.date)).toEqual(['2026-08-31']);
    expect(receptionsBetween(st([last, first]), '2026-08-31', '2026-09-01').map(r => r.date)).toEqual(['2026-08-31', '2026-09-01']);
  });
  it('F03: an indicator the company already holds under the same id is not added a second time, and the process is the one asked', () => {
    const base = { processes: [{ id: 'P3', name: 'P3', color: '#000', order: 3, kpiIds: [] as string[] }], kpis: {} as State['kpis'] };
    const mine = { id: 'kpi_recep_clean', name: 'Mon indicateur', processId: 'P3', type: 'Performance', unit: '%', direction: 'higher', aggregation: 'avg', target: '', targetValue: null, confidential: false, source: '' } as never;
    const s = { ...base, kpis: { kpi_recep_clean: mine } };
    expect(addReceptionKpis(s)).toBe(4);
    expect(s.kpis.kpi_recep_clean).toBe(mine);
    expect(s.processes[0].kpiIds).toHaveLength(4);
  });
  it('F04: a release by derogation is not "without derogation"; a release undone and made again keeps the derogation written in the journal', () => {
    const clean = released(dl({ id: 'c', ref: 'C' }), '2026-09-11');
    const ko = checkMilestone(allOk(dl({ id: 'k', ref: 'K' }), '2026-09-09'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
    const waived = releaseDelivery(ko, { by: 'Marc', at: at('2026-09-12', '16:00'), derogation: { why: 'Accord du client' } });
    expect(waived.derogation).toBeDefined();
    expect(receptionKpiValue(st([clean]), 'recep_released' as never, '2026-09', now)).toBe(100);
    expect(receptionKpiValue(st([waived]), 'recep_released' as never, '2026-09', now)).toBe(0);
    expect(receptionKpiValue(st([clean, waived]), 'recep_released' as never, '2026-09', now)).toBe(50);
    const noLine = { ...waived, journal: [] };   // the derogation is on the order though the journal does not say it (an old record): it counts all the same
    expect(receptionKpiValue(st([noLine]), 'recep_released' as never, '2026-09', now)).toBe(0);
    const { derogation: _gone, ...bare } = waived;   // and the line of the journal alone counts when the derogation was taken away by a release made again
    expect(receptionKpiValue(st([bare as Delivery]), 'recep_released' as never, '2026-09', now)).toBe(0);
  });
});

describe('3.4 rules: what the other tools read of the orders', () => {
  it('C01: the review (2.4) is asked for a reception exactly 14 days old, not for one of 15 days', () => {
    const rec = (day: string, id = 'dl1') => signed(received(released(dl({ id, ref: id.toUpperCase() })), day), day);
    expect(deliveriesToAsk(st([rec('2026-09-11')]), now).map(x => x.id)).toEqual(['dl1']);
    expect(deliveriesToAsk(st([rec('2026-09-10')]), now)).toEqual([]);
  });
  it('C02: a review of the same customer written within 7 days of the reception counts (the review is not asked again), 8 days apart it does not', () => {
    const d = signed(received(released(dl()), '2026-09-18'), '2026-09-18');
    const fb = (date: string) => ({ id: 'fb1', client: ' CLIENT a ', date, contact: '' }) as unknown as Feedback;
    expect(deliveriesToAsk({ deliveries: { dl1: d }, feedbacks: { fb1: fb('2026-09-11') } }, now)).toEqual([]);
    expect(deliveriesToAsk({ deliveries: { dl1: d }, feedbacks: { fb1: fb('2026-09-25') } }, now)).toEqual([]);
    expect(deliveriesToAsk({ deliveries: { dl1: d }, feedbacks: { fb1: fb('2026-09-10') } }, now).map(x => x.id)).toEqual(['dl1']);
    expect(deliveriesToAsk({ deliveries: { dl1: d }, feedbacks: { fb1: { ...fb('2026-09-18'), client: 'Autre client' } } }, now).map(x => x.id)).toEqual(['dl1']);
  });
  it('C04: the fact of a complaint says the NEWEST PV of the order that has an outcome, its number and its day', () => {
    const first = signed(received(released(dl({ qty: 10 })), '2026-09-14'), '2026-09-14');
    const two = nextPresentation(withRec(first, { qty: 4, pvNo: 'PV-2026-001' }), A, at('2026-09-15'));
    const last = signed(withRv(received(released(two, '2026-09-16'), '2026-09-18', 'reserve'), 'Rayure', '2026-09-18'), '2026-09-18');
    const out = pvFact(withRec(last, { pvNo: 'PV-2026-002' }));
    expect(out).toMatch(/PV-2026-002/);
    expect(out).not.toMatch(/PV-2026-001/);
    expect(out).toMatch(/18\/09\/2026/);
    expect(out).toMatch(/avec 1 réserve$/);
    expect(pvFact(dl())).toBe('');
  });
  it('C05: an archived order is not an order "en cours" of the customer, a settled one neither; a received one in part is', () => {
    const part = withRec(received(released(dl({ qty: 10 })), '2026-09-14', 'sans'), { qty: 4 });
    expect(clientReceptions({ deliveries: { dl1: part } }, 'Client A').open).toBe(1);
    expect(clientReceptions({ deliveries: { dl1: archiveDelivery(part, at('2026-09-20'), '') } }, 'Client A').open).toBe(0);
    expect(clientReceptions({ deliveries: { dl1: withRec(part, { qty: 10 }) } }, 'Client A').open).toBe(0);
  });
});

describe('3.4 rules: the number and the moment of a defect are those of the gesture, never the clock read inside (T-3)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const base = () => {
    const d = checkMilestone(dl(), 'm2', { ok: false, measured: '12', by: A, at: at('2026-09-10'), gapPhoto: 'photo:gap-1-1' }), r = withRv(received(d, '2026-09-14', 'reserve'), 'Poignée', '2026-09-14', { where: 'Porte' });
    return { d: r, s: st([r]), m: r.milestones[1], rv: reservesOf(r)[0] };
  };
  it('writes the year of the instant given: a gesture of January 2027 is NC-2027-001 on a clock that still says 2026, and the moment is the gesture\'s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 10, 0));
    const { d, s, m, rv } = base(), gesture = new Date(2027, 0, 5, 9, 30);
    expect(ncFromMilestone(s, d, m, A, gesture)).toMatchObject({ ref: 'NC-2027-001', at: '2027-01-05T09:30', by: A, deliveryId: 'dl1', milestoneId: 'm2' });
    expect(ncFromReserve(s, d, rv, A, gesture)).toMatchObject({ ref: 'NC-2027-001', at: '2027-01-05T09:30', reserveId: rv.id, origin: 'client' });
  });
  it('numbers after the defects the state already holds, in the year of the gesture; the clock of the device is the default of a gesture that gives none', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 10, 0));
    const { d, s, m } = base(), first = ncFromMilestone(s, d, m, A, new Date(2026, 8, 25, 10, 0));
    const held = { ...s, ncs: { [first.id]: first } };
    expect(first.ref).toBe('NC-2026-001');
    expect(ncFromMilestone(held, d, m, A, new Date(2026, 8, 26, 8, 0)).ref).toBe('NC-2026-002');
    expect(ncFromMilestone(held, d, m, A, new Date(2027, 0, 2, 8, 0)).ref).toBe('NC-2027-001');
    expect(ncFromMilestone(held, d, m, A)).toMatchObject({ ref: 'NC-2026-002', at: '2026-09-25T10:00' });
    expect(ncFromReserve(held, d, base().rv, A)).toMatchObject({ ref: 'NC-2026-002', at: '2026-09-25T10:00' });
  });
});

describe('3.4 rules: what a typed copy owns and what is life (the rule, not the lists of keys)', () => {
  // The typed copy of an order owns the identity and the definitions (customer, number, object, quantity, promised day, directory links, traceability, the milestones as defined, the person who receives and the
  // place); EVERYTHING else a saved order holds is life and stays as saved. Each test fills a saved record with every kind of life it can hold, gives the typed copy another value for every key, and names the key that moves.
  const STALE = 'STALE';
  const ORDER_TYPED = ['id', 'ref', 'client', 'item', 'qty', 'quoteId', 'template', 'orgId', 'contactId', 'promisedAt', 'team', 'lot', 'serial', 'material', 'milestones', 'reception', 'exampleHash'];
  const MS_TYPED = ['id', 'label', 'point', 'requirement', 'unit', 'min', 'max', 'refPhoto', 'critical', 'sopId', 'instrumentId', 'na', 'naReason'];
  const RC_TYPED = ['name', 'role', 'place', 'email', 'orgId', 'contactId', 'bl'];
  const rc = (): Reception => ({
    date: '2026-09-14', time: '14:00', name: 'M. Durand', role: 'Directeur', place: 'Quai 3', email: 'd@x.fr', orgId: 'o1', contactId: 'c1', bl: 'BL-1', result: 'reserve', reserve: 'Rayure', retentionPct: 5, amount: 100, liftedAt: '2026-09-16',
    qty: 4, count: 4, partialOk: { by: A, at: at('2026-09-14') }, photos: ['photo:s-1-1'], reserves: [{ id: 'rv1', text: 'Rayure', raisedAt: '2026-09-14' }], refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' },
    signedAt: at('2026-09-14', '14:40'), companySignedAt: at('2026-09-14', '14:41'), signTz: 'Europe/Paris', pvNo: 'PV-2026-001', pvPhotoAt: at('2026-09-14', '15:00'), seals: [{ hash: 'abc', at: at('2026-09-14'), by: A }],
    signWaiver: { by: A, why: 'x', at: at('2026-09-14') },
  });
  const saved = (): Delivery => ({
    ...dl({ promisedAt: '2026-09-20', lot: 'L1', serial: 'S1', material: 'Acier', team: ['Alice'], orgId: 'o1', contactId: 'c1', quoteId: 'q1', template: 'Standard' }),
    releasedBy: 'Marc', releasedAt: '2026-09-11', releasedMoment: at('2026-09-11', '16:00'), releaseSign: ink, derogation: { by: 'Marc', why: 'Accord', at: at('2026-09-11', '16:00') },
    shipChecks: [{ id: 'sc_0', label: 'Documents remis', ok: true, by: A, at: at('2026-09-11', '07:00') }], signCompany: ink2, liftPhoto: 'photo:l-1-1', liftSignedBy: 'M. Durand',
    lots: [{ id: 'lt1', no: 1, closedAt: at('2026-09-01'), milestones: [], releasedBy: '', releasedAt: '', reception: dl().reception }], journal: [{ at: at('2026-09-11', '16:00'), by: 'Marc', text: 'Libérée' }],
    archivedAt: at('2026-09-20'), archivedNote: 'Fin', exampleHash: 'h', reception: rc(),
  });
  const rec = (d: unknown) => d as Record<string, unknown>;
  const stale = (o: Record<string, unknown>, typed: string[]) => Object.fromEntries(Object.keys(o).map(k => [k, k === 'qty' ? 12 : typed.includes(k) ? `typed ${k}` : STALE]));   // a quantity is a number
  it('an order: every key that is not identity or definition comes from the saved order, every typed one from the typed copy; no key is made up', () => {
    const from = saved(), typed = { ...from, ...stale(rec(from), ORDER_TYPED), milestones: from.milestones, reception: from.reception } as Delivery;
    const out = rec(takeLife(typed, from));
    Object.keys(from).filter(k => !ORDER_TYPED.includes(k)).forEach(k => expect(out[k], `life: ${k}`).toEqual(rec(from)[k]));
    ORDER_TYPED.filter(k => k !== 'milestones' && k !== 'reception').forEach(k => expect(out[k], `typed: ${k}`).toEqual(rec(typed)[k]));
    expect(Object.keys(out).filter(k => !(k in from))).toEqual([]);
  });
  it('a milestone: the result, the proofs, the history, the defect, the waiver and the second person are life; the definition is typed (the instrument and the "sans objet" mention included)', () => {
    const full = { ...ms()[0], ok: true, by: A, date: '2026-09-10', at: at('2026-09-10', '09:00'), measured: '1,5', photo: 'photo:a-1-1', gapPhoto: 'photo:g-1-1', history: [{ at: at('2026-09-10', '09:00'), by: A, kind: 'check' as const, ok: true, measured: '1,5' }],
      ncId: 'nc1', waivedBy: 'Marc', waivedWhy: 'Accord', waivedAt: at('2026-09-11'), second: 'Paul', unit: 'mm', min: 1, max: 2, refPhoto: 'photo:r-1-1', critical: true, sopId: 'sop1', instrumentId: 'eq1', na: true, naReason: 'Sans objet ici' };
    const from = { ...saved(), milestones: [full, ...ms().slice(1)] }, def = Object.fromEntries(MS_TYPED.map(k => [k, k === 'id' ? 'm1' : k === 'critical' || k === 'na' ? false : typeof (full as Record<string, unknown>)[k] === 'number' ? 9 : `typed ${k}`]));
    const typedMs = { ...stale(rec(full), MS_TYPED), ...def };
    const out = rec(takeLife({ ...from, milestones: [typedMs as never, ...ms().slice(1)] }, from).milestones[0]);
    Object.keys(full).filter(k => !MS_TYPED.includes(k)).forEach(k => expect(out[k], `life: ${k}`).toEqual(rec(full)[k]));
    MS_TYPED.forEach(k => expect(out[k], `typed: ${k}`).toEqual(def[k]));
  });
  it('the reception: the person who receives, the place, the customer and the delivery note are typed; the result, the quantities, the reservations, the signatures, the number, the seals and the rest are life', () => {
    const from = saved(), r = rc(), typed = { ...from, reception: { ...(stale(rec(r), RC_TYPED) as unknown as Reception) } };
    const out = rec(takeLife(typed, from).reception);
    Object.keys(r).filter(k => !RC_TYPED.includes(k)).forEach(k => expect(out[k], `life: ${k}`).toEqual(rec(r)[k]));
    RC_TYPED.forEach(k => expect(out[k], `typed: ${k}`).toBe(`typed ${k}`));
    expect(Object.keys(out).filter(k => !(k in r))).toEqual([]);
  });
  it('a signed PV is never rewritten by a typed copy: the saved order is kept whole, the identity included', () => {
    const lock = signed(received(released(dl({ promisedAt: '2026-09-20', lot: 'L1' }))));
    const typed: Delivery = { ...dl({ client: 'Client Z', ref: 'CMD-99', item: 'Autre chose', qty: 99, promisedAt: '2026-12-31', lot: 'L9' }), milestones: ms().map(m => ({ ...m, requirement: 'Changée', min: 1, max: 2 })) };
    const out = takeLife(typed, lock);
    expect(out).toBe(lock);
    expect([out.client, out.ref, out.item, out.qty, out.promisedAt, out.lot]).toEqual(['Client A', 'CMD-1', 'Lot de pièces', 10, '2026-09-20', 'L1']);
    expect(out.milestones.map(m => m.requirement)).toEqual(['Exigence 1', 'Exigence 2', 'Exigence 3', 'Exigence 4']);
  });
});

describe('3.4 rules: the words and the counts of the facts of the queue', () => {
  const milestoneTask = (d: Delivery) => plain(receptionTodos(st([d]), now).find(t => t.kind === 'milestone')!.text);
  it('names an order by its number, else its object, else "commande sans nom", with the customer in brackets when there is one', () => {
    expect(milestoneTask(dl())).toBe('Contrôler le jalon 1 « Étape 1 » de CMD-1 (Client A)');
    expect(milestoneTask(dl({ ref: ' ', client: ' ' }))).toBe('Contrôler le jalon 1 « Étape 1 » de Lot de pièces');
    expect(milestoneTask(dl({ ref: '', item: '', client: 'Client A' }))).toBe('Contrôler le jalon 1 « Étape 1 » de commande sans nom (Client A)');
    expect(milestoneTask(dl({ ref: '', item: '', client: '' }))).toBe('Contrôler le jalon 1 « Étape 1 » de commande sans nom');
  });
  it('says the motive of a refusal as it was written ("Autre" says what it is) and what follows it in lower case, or as written for "Autre"', () => {
    const refusedWith = (r: Parameters<typeof refuse>[1]) => signed(refuse(arrived(released()), r, at('2026-09-14', '14:30'), A));
    const other = refusedWith({ reason: OTHER, other: 'Colis écrasé', next: OTHER, nextOther: 'Reprise sur site' }), plainRsn = refusedWith({ reason: 'Quantité incorrecte', next: 'À remplacer' });
    const fact = (d: Delivery) => plain(receptionInsights(st([d]), now).find(f => f.key === 'refused')!.text), todo = (d: Delivery) => plain(receptionTodos(st([d]), now).find(t => t.kind === 'refused')!.text);
    expect(fact(other)).toBe('CMD-1 (Client A) : refusée le 14 sept. (motif : Colis écrasé).');
    expect(fact(plainRsn)).toBe('CMD-1 (Client A) : refusée le 14 sept. (motif : Quantité incorrecte).');
    expect(todo(other)).toBe('Donner suite à la réception refusée de CMD-1 (Client A) : Reprise sur site');
    expect(todo(plainRsn)).toBe('Donner suite à la réception refusée de CMD-1 (Client A) : à remplacer');
  });
  it('names the milestone not conform that stands in the way, not one that was waived or does not apply', () => {
    const ko = (d: Delivery, id: string) => checkMilestone(d, id, { ok: false, by: A, at: at('2026-09-10', '09:00') });
    const waived = waiveMilestone(ko(dl(), 'm1'), 'm1', 'Marc', 'Accord du client', at('2026-09-10', '10:00'));
    const naSecond = setMilestoneNa(waived, 'm2', 'Sans objet ici', A, at('2026-09-10', '11:00'));
    const d = ko(naSecond, 'm3');
    const fact = plain(receptionInsights(st([d]), now).find(f => f.key === 'blocked')!.text);
    expect(fact).toBe('CMD-1 (Client A) : jalon 3 « Étape 3 » non conforme depuis le 10 sept..'.replace('..', '.'));
    expect(plain(receptionTodos(st([d]), now).find(t => t.kind === 'blocked')!.text)).toContain('jalon 3 « Étape 3 »');
  });
  it('tells a reservation late only once its day is past: one open and not late is no fact, one late is (with the days of delay), and the tile counts both open ones', () => {
    const onTime = withRv(received(released(dl({ id: 'a', ref: 'A' })), '2026-09-24', 'reserve'), 'Rayure', '2026-09-24'), late = withRv(received(released(dl({ id: 'b', ref: 'B' })), '2026-09-01', 'reserve'), 'Joint', '2026-09-01');
    expect(receptionInsights(st([onTime]), now).some(f => f.key === 'reserve-late')).toBe(false);
    const both = st([onTime, late]), fact = plain(receptionInsights(both, now).find(f => f.key === 'reserve-late')!.text);
    expect(fact).toBe('B (Client A) : « Joint » à lever pour le 10 sept., 11 jours de retard.');
    expect(receptionSummary(both, now)).toMatchObject({ openReserves: 2, lateReserves: 1 });
  });
  it('says more received than ordered only when it is more: exactly the quantity is no fact, and the verbs agree (one received for one ordered, 3 received for 2 ordered)', () => {
    const got = (qty: number, n: number) => signed(withRec(received(released(dl({ qty })), '2026-09-14'), { qty: n }));
    const say = (d: Delivery) => receptionInsights(st([d]), now).find(f => f.key === 'over')?.text;
    expect(say(got(10, 10))).toBeUndefined();
    expect(say(got(10, 9))).toBeUndefined();
    expect(plain(say(got(1, 1.5))!)).toBe('CMD-1 (Client A) : 1,5 reçue pour 1 commandée.');
    expect(plain(say(got(2, 3))!)).toBe('CMD-1 (Client A) : 3 reçues pour 2 commandées.');
    expect(plain(say(got(1, 2))!)).toBe('CMD-1 (Client A) : 2 reçues pour 1 commandée.');   // two is plural, one is not
  });
  it('names the orders of a reservation that came back by their number, else their object, else their id, in the order they are read', () => {
    const one = (d: Delivery) => signed(withRv(received(released(d, '2026-09-11'), '2026-09-14', 'reserve'), 'Joint abîmé', '2026-09-14'), '2026-09-14');
    const fact = receptionInsights(st([one(dl({ id: 'a', ref: 'CMD-A' })), one(dl({ id: 'b', ref: '', item: 'Portail' })), one(dl({ id: 'c', ref: '', item: '' }))]), now).find(f => f.key === 'repeat-reserve')!;
    expect(plain(fact.text)).toBe('« Joint abîmé » sur 3 commandes en 12 mois (CMD-A, Portail, c).');
  });
  it('says the most pressing of an order: its red task comes before its amber one, and the card is red then; with an amber task alone the card is amber', () => {
    const both = withRv(received(released(dl()), '2026-09-01', 'reserve'), 'Joint', '2026-09-01');   // a reservation late (red) and a PV that nobody signed (amber)
    const todos = receptionTodos(st([both]), now);
    expect(todos.map(t => t.kind).sort()).toEqual(['reserve-late', 'unsigned']);
    expect(deliveryLevel(both, todos, P, now)).toEqual({ level: 'alert', label: 'Réserves en retard' });
    const amber = received(released(dl({ id: 'b', ref: 'B' })), '2026-09-22');
    expect(deliveryLevel(amber, receptionTodos(st([amber]), now), P, now)).toEqual({ level: 'warn', label: 'PV à faire signer' });
  });
});

describe('3.4 rules: the indicators read the right presentation of the order', () => {
  const val = (ds: Delivery[], role: string, period = '2026-09') => receptionKpiValue(st(ds), role as never, period, now);
  it('addReceptionKpis: puts each indicator in the process P3, else in the first process', () => {
    const procs = () => ['P1', 'P3', 'P5'].map((id, i) => ({ id, name: id, color: '#000', order: i, kpiIds: [] as string[] }));
    const withP3 = { processes: procs(), kpis: {} as State['kpis'] }, noP3 = { processes: procs().filter(p => p.id !== 'P3'), kpis: {} as State['kpis'] };
    expect(addReceptionKpis(withP3)).toBe(5);
    expect(withP3.processes.map(p => p.kpiIds.length)).toEqual([0, 5, 0]);
    expect(Object.values(withP3.kpis).every(k => k.processId === 'P3')).toBe(true);
    expect(addReceptionKpis(noP3)).toBe(5);
    expect(noP3.processes.map(p => p.kpiIds.length)).toEqual([5, 0]);
    expect(addReceptionKpis(withP3)).toBe(0);
  });
  it('a derogation said in the journal at the very moment a delivery was closed belongs to that delivery, not to the next one', () => {
    const lot = { id: 'lt1', no: 1, closedAt: at('2026-09-15'), milestones: [], releasedBy: 'Marc', releasedAt: '2026-09-12', reception: dl().reception };
    const d = { ...dl({ id: 'a' }), lots: [lot], releasedBy: 'Marc', releasedAt: '2026-09-17', journal: [{ at: at('2026-09-15'), by: 'Marc', text: 'Libérée par Marc par dérogation : Accord', proof: true }] } as Delivery;
    expect(val([d], 'recep_released')).toBe(50);   // the closed delivery had the derogation, the one under way (released two days later) had none
  });
  it('the first check of a milestone is its first check or rework: a waiver or a reopening before it is not one, an old milestone without history uses its result, one never checked is not counted', () => {
    const ev = (kind: string, ok: boolean | null, day: string) => ({ at: at(day), by: A, kind, ok, measured: '' }) as never;
    const m = (over: object) => ({ ...ms()[0], ...over });
    const checked = (day: string) => ({ ok: true, by: A, date: day, at: at(day) });
    const d = dl({ milestones: [
      m({ ...checked('2026-09-12'), history: [ev('derogation', false, '2026-08-20'), ev('check', true, '2026-09-12')] }),   // the waiver of August is not a check: the first check is the one of September, conform
      m({ ...checked('2026-09-12'), id: 'm2', history: [ev('reopen', null, '2026-08-21'), ev('check', false, '2026-09-12'), ev('rework', true, '2026-09-13')] }),   // not conform at the first check
      m({ ...checked('2026-09-12'), id: 'm3' }),   // an old order: no history, its result is the check
      m({ id: 'm4' }),                              // never checked: not counted
    ] });
    expect(val([d], 'recep_first')).toBe(67);   // 2 conform at the first check of 3 checked
    expect(val([d], 'recep_first', '2026-08')).toBeNull();
  });
});

describe('3.4 rules: a drawing worth a signature, the settings read as written, the bounds of a check', () => {
  const line = (...pts: [number, number][]): Strokes => [pts];
  it('signatureOk: at least 5 points, 2 of them apart, and a line of 40 units on the pad; a tap, a dot, a scribble in place, or points that are not numbers are not one', () => {
    expect(signatureOk(line([0, 0], [10, 0], [20, 0], [30, 0], [40, 0]))).toBe(true);     // 5 points, a line of exactly 40
    expect(signatureOk(line([0, 0], [10, 0], [20, 0], [30, 0], [39.9, 0]))).toBe(false);  // 39.9 is under
    expect(signatureOk(line([0, 0], [20, 0], [40, 0], [60, 0]))).toBe(false);             // 4 points, however long
    expect(signatureOk(line([0, 0], [100, 0], [100, 0], [100, 0], [100, 0]))).toBe(true); // 5 points, two distinct, 100 long
    expect(signatureOk(line([5, 5], [5, 5], [5, 5], [5, 5], [5, 5]))).toBe(false);        // a dot pressed five times
    expect(signatureOk(line([0, 0], [10, 0], [20, 0], [30, 0], [Number.NaN, 0]))).toBe(false);   // a point that is not a number is not counted: 4 left
    expect(signatureOk(line([0, 0], [10, 0], [20, 0], [30, 0], [40, Infinity]))).toBe(false);
    expect(signatureOk([[], line([0, 0])[0]] as Strokes)).toBe(false);
    expect(signatureOk(undefined)).toBe(false);
    expect(signatureOk('x' as never)).toBe(false);
  });
  it('receptionCfg keeps a zero and a "no" that were written (a delay of 0 day, a calendar of days not ticked, a retention of 0 %, a PV due the same day), and reads the defaults only when nothing is written', () => {
    const c = receptionCfg({ ...P, businessHours: true, reception: { liftDays: 0, liftBusiness: false, retention: { on: false, maxPct: 0 }, unsignedDays: 0 } });
    expect([c.liftDays, c.liftBusiness, c.retention, c.unsignedDays]).toEqual([0, false, { on: false, maxPct: 0 }, 0]);
    const d = receptionCfg({ ...P, businessHours: true });
    expect([d.liftDays, d.liftBusiness, d.retention, d.unsignedDays]).toEqual([7, true, { on: false, maxPct: 5 }, 2]);
    expect(receptionCfg({ ...P, businessHours: false }).liftBusiness).toBe(false);
    expect(receptionCfg({ ...P, businessHours: true, reception: { liftBusiness: true } }).liftBusiness).toBe(true);
  });
  it('boundsChanged: the bounds of the last check against the bounds now, a bound taken off or put at 0 included; a waiver or a reopening after the check is not a check', () => {
    const ev = (kind: string, ok: boolean | null, over: object = {}) => ({ at: at('2026-09-10'), by: A, kind, ok, measured: '', ...over }) as never;
    const base = { ...ms()[0], ok: true, unit: 'mm' };
    expect(boundsChanged({ ...base, min: 1, max: 2, history: [ev('check', true, { min: 1, max: 2 })] })).toBe(false);
    expect(boundsChanged({ ...base, min: 1, max: 3, history: [ev('check', true, { min: 1, max: 2 })] })).toBe(true);
    expect(boundsChanged({ ...base, history: [ev('check', true, { min: 0 })] })).toBe(true);                     // 0 was a bound, now there is none
    expect(boundsChanged({ ...base, min: 0, history: [ev('check', true, { min: 0 })] })).toBe(false);            // 0 and 0
    expect(boundsChanged({ ...base, max: 0, history: [ev('check', true, { max: undefined })] })).toBe(true);     // none, now 0
    expect(boundsChanged({ ...base, min: 1, max: 2, history: [ev('check', false, { min: 1, max: 2 }), ev('derogation', false), ev('reopen', null)] })).toBe(false);   // those events kept no bounds: the check is the last that did
    expect(boundsChanged({ ...base, min: 1, max: 2, history: [ev('check', true, { min: 1, max: 2 }), ev('derogation', false)] })).toBe(false);
    expect(boundsChanged({ ...base, history: [] })).toBe(false);
    expect(boundsChanged({ ...base, ok: null, min: 9, history: [ev('check', true, { min: 1 })] })).toBe(false);   // not checked now
    expect(boundsChanged({ ...base, na: true, min: 9, history: [ev('check', true, { min: 1 })] })).toBe(false);   // not applicable
  });
});

describe('3.4 rules: the checks and the journal words', () => {
  it('checks the same milestone twice with the same moment, person and value: nothing more; with another proof photo it is a new check that keeps the first in the history', () => {
    const one = checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10'), photo: 'photo:a-1-1' });
    expect(checkMilestone(one, 'm1', { ok: true, by: A, at: at('2026-09-10'), photo: 'photo:a-1-1' })).toBe(one);
    expect(checkMilestone(one, 'm1', { ok: true, by: A, at: at('2026-09-10') })).toBe(one);   // no photo given: the same check
    const other = checkMilestone(one, 'm1', { ok: true, by: A, at: at('2026-09-10'), photo: 'photo:b-1-1' });
    expect(other).not.toBe(one);
    expect(other.milestones[0]).toMatchObject({ photo: 'photo:b-1-1' });
    expect(other.milestones[0].history).toHaveLength(2);
    const second = checkMilestone(one, 'm1', { ok: true, by: A, at: at('2026-09-10'), second: 'Paul' });
    expect(second.milestones[0].second).toBe('Paul');
  });
  it('writes the value with its unit in the journal only when the value does not say the unit already', () => {
    const withUnit = (measured: string, unit?: string) => plain(checkMilestone(dl({ milestones: ms().map((m, i) => (i ? m : { ...m, ...(unit ? { unit } : {}) })) }), 'm1', { ok: true, by: A, at: at('2026-09-10'), measured }).journal!.at(-1)!.text);
    expect(withUnit('12', 'mm')).toBe('Jalon 1 « Étape 1 » conforme (12 mm)');
    expect(withUnit('12 mm', 'mm')).toBe('Jalon 1 « Étape 1 » conforme (12 mm)');
    expect(withUnit('12')).toBe('Jalon 1 « Étape 1 » conforme (12)');
    expect(withUnit('', 'mm')).toBe('Jalon 1 « Étape 1 » conforme');
  });
  it('a milestone added after the release undoes it unless it is already conform or does not apply', () => {
    const r = released();
    expect(addMilestone(r, { label: 'A' }, A, at('2026-09-12')).releasedAt).toBe('');
    expect(addMilestone(r, { label: 'B', ok: true }, A, at('2026-09-12')).releasedAt).toBe('2026-09-11');
    expect(addMilestone(r, { label: 'C', na: true }, A, at('2026-09-12')).releasedAt).toBe('2026-09-11');
  });
  it('says a release recorded after the delivery: by the hour when both have one, by the day else, and never for the same moment or the same day', () => {
    const rel = (releasedAt: string, releasedMoment: string | undefined, date: string, time?: string) => releasedAfterDelivery({ releasedAt, ...(releasedMoment ? { releasedMoment } : {}), reception: { ...dl().reception, date, ...(time ? { time } : {}) } } as never);
    expect(rel('2026-09-14', '2026-09-14T16:00', '2026-09-14', '14:00')).toBe(true);
    expect(rel('2026-09-14', '2026-09-14T14:00', '2026-09-14', '14:00')).toBe(false);   // the same minute
    expect(rel('2026-09-14', '2026-09-14T13:59', '2026-09-14', '14:00')).toBe(false);
    expect(rel('2026-09-14', '2026-09-14T14:01', '2026-09-14', '14:00')).toBe(true);
    expect(rel('2026-09-14', undefined, '2026-09-14', '14:00')).toBe(false);            // a day alone against a day with an hour: the days are compared
    expect(rel('2026-09-15', undefined, '2026-09-14', '14:00')).toBe(true);
    expect(rel('2026-09-14', '2026-09-14T09:00', '2026-09-14')).toBe(false);            // the delivery has no hour: the days
    expect(rel('2026-09-15', '2026-09-15T09:00', '2026-09-14')).toBe(true);
    expect(rel('2026-09-13', '2026-09-13T09:00', '2026-09-14', '08:00')).toBe(false);
    expect(rel('', undefined, '2026-09-14')).toBe(false);
    expect(rel('2026-09-15', undefined, '')).toBe(false);
  });
  it('writes "enregistrée après la livraison" in the journal of a release made after the delivery, and nothing before one', () => {
    const late = releaseDelivery(allOk(received(dl(), '2026-09-14')), { by: 'Marc', at: at('2026-09-15', '09:00') });
    expect(plain(late.journal!.at(-1)!.text)).toBe('Libérée par Marc ; enregistrée après la livraison du 14/09/2026');
    expect(plain(released().journal!.at(-1)!.text)).toBe('Libérée par Marc');
  });
});

describe('3.4 rules: the reservations, the quantities and the corrections of a signed PV', () => {
  const open = () => withRv(received(released(), '2026-09-14', 'reserve'));
  it('moving the deadline needs a person and a reason; the same deadline is not a move; a deadline moved says from what to what', () => {
    const d = open(), rid = reservesOf(d)[0].id;
    const withDue = patchReserve(d, rid, { dueAt: '2026-09-25' }, A, at('2026-09-15'), 'Accord du client');
    expect(reservesOf(withDue)[0].dueAt).toBe('2026-09-25');
    expect(plain(withDue.journal!.at(-1)!.text)).toBe('Réserve « Rayure » : échéance fixée au 25/09/2026 : Accord du client');
    expect(patchReserve(withDue, rid, { dueAt: '2026-09-25' }, A, at('2026-09-16'))).toEqual(withDue);                       // the same day: no reason needed, nothing moves
    expect(reservesOf(patchReserve(withDue, rid, { dueAt: '2026-09-30' }, A, at('2026-09-16')))[0].dueAt).toBe('2026-09-25');    // no reason: the deadline stays
    expect(reservesOf(patchReserve(withDue, rid, { dueAt: '2026-09-30' }, '', at('2026-09-16'), 'Accord'))[0].dueAt).toBe('2026-09-25');   // no person
    const later = patchReserve(withDue, rid, { dueAt: '2026-10-02' }, A, at('2026-09-16'), 'Retard du fournisseur'), sooner = patchReserve(withDue, rid, { dueAt: '2026-09-18' }, A, at('2026-09-16'), 'Urgent');
    expect(plain(later.journal!.at(-1)!.text)).toBe('Réserve « Rayure » : échéance repoussée du 25/09/2026 au 02/10/2026 : Retard du fournisseur');
    expect(plain(sooner.journal!.at(-1)!.text)).toBe('Réserve « Rayure » : échéance avancée du 25/09/2026 au 18/09/2026 : Urgent');
  });
  it('a repair takes the person as the one in charge only when nobody is, and a repair without a person names nobody', () => {
    const d = open(), rid = reservesOf(d)[0].id;
    expect(reservesOf(repairReserve(d, rid, { at: at('2026-09-16'), by: 'Paul' }))[0].handler).toBe('Paul');
    expect(reservesOf(repairReserve(d, rid, { at: at('2026-09-16') }))[0]).not.toHaveProperty('handler');
    const owned = patchReserve(d, rid, { handler: 'Bruno' }, A, at('2026-09-15'));
    expect(reservesOf(repairReserve(owned, rid, { at: at('2026-09-16'), by: 'Paul' }))[0].handler).toBe('Bruno');
  });
  it('a lift is written for a moment that has not come only within one minute of the clock of the device, never a minute later; a clock given as a day alone is the end of that day', () => {
    const d = open(), rid = reservesOf(d)[0].id, who = { by: 'M. Durand', note: 'Revu', now: '2026-09-20T11:30' };
    expect(reservesOf(liftReserve(d, rid, { at: '2026-09-20T11:31', ...who }))[0].liftedAt).toBe('2026-09-20');
    expect(liftReserve(d, rid, { at: '2026-09-20T11:32', ...who })).toBe(d);
    expect(reservesOf(liftReserve(d, rid, { at: '2026-09-20T10:00', by: 'M. Durand', note: 'Revu', now: '2026-09-20' }))[0].liftedAt).toBe('2026-09-20');   // the day alone: any hour of that day
    expect(liftReserve(d, rid, { at: '2026-09-21T00:30', by: 'M. Durand', note: 'Revu', now: '2026-09-20' })).toBe(d);
  });
  it('says if the person who releases by derogation had controlled or waived a milestone that stood in the way, whoever she was in its history, accents and case aside; a person who only checked conform milestones had not', () => {
    const ko = (d: Delivery, by: string, id = 'm2', day = '2026-09-10') => checkMilestone(d, id, { ok: false, by, at: at(day, '09:30') });
    const base = allOk(dl(), '2026-09-09'), release = (d: Delivery, by: string) => releaseDelivery(d, { by, at: at('2026-09-11', '16:00'), derogation: { why: 'Accord du client' } }).derogation as { sameAsControl?: boolean } | undefined;
    expect(release(ko(base, 'Paul'), 'Paul')?.sameAsControl).toBe(true);                       // controlled it
    expect(release(ko(base, 'Paul'), ' paul ')?.sameAsControl).toBe(true);                     // case and spaces aside
    expect(release(ko(base, 'Éloïse'), 'Eloise')?.sameAsControl).toBe(true);                   // accents aside
    expect(release(ko(base, 'Paul'), 'Marc')?.sameAsControl).toBe(false);                      // another person
    expect(release(waiveMilestone(ko(base, 'Paul'), 'm2', 'Bruno', 'Accord', at('2026-09-10', '10:00')), 'Bruno')?.sameAsControl).toBe(true);   // waived it
    const redone = checkMilestone(ko(base, 'Paul'), 'm2', { ok: true, by: 'Zoé', at: at('2026-09-10', '11:00') });
    expect(release(redone, 'Paul')).toBeUndefined();   // conform now: nothing stood in the way, no derogation
    const history = waiveMilestone(checkMilestone(ko(base, 'Paul'), 'm2', { ok: false, by: 'Zoé', at: at('2026-09-10', '10:30') }), 'm2', 'Bruno', 'Accord', at('2026-09-10', '11:00'));
    expect(release(history, 'Paul')?.sameAsControl).toBe(true);       // her check is in the history of the milestone, though the last one is another person's
    expect(release(history, 'Zoé')?.sameAsControl).toBe(true);
    const third = ko(base, 'Paul', 'm3');
    expect(release(third, 'Alice')?.sameAsControl).toBe(true);    // Alice checked that milestone conform before Paul found it not: she is in its history
    expect(release(third, 'Zoé')?.sameAsControl).toBe(false);     // Zoé never touched the milestone that stands in the way
  });
  it('writes a quantity of 0 (a count of 0 too), twice nothing more; a quantity that is not written keeps the agreement of the customer', () => {
    const d = arrived(released(), '2026-09-14'), w = at('2026-09-14', '14:20');
    const zero = setQuantities(d, { qty: 0, count: 0 }, A, w);
    expect(zero.reception).toMatchObject({ qty: 0, count: 0 });
    expect(setQuantities(zero, { qty: 0, count: 0 }, A, w)).toBe(zero);
    const agreed = setQuantities(d, { partialOk: true }, 'Marc', w);
    const moved = setQuantities(agreed, { qty: 5 }, A, at('2026-09-14', '14:30'));
    expect(moved.reception).toMatchObject({ qty: 5, partialOk: { by: 'Marc', at: w } });   // the agreement stays when only the quantity changes
  });
  it('taking the result off a delivery that has no day does not make one up; setting a result without a day gives it the moment', () => {
    const noDay = { ...dl(), reception: { ...dl().reception, result: 'sans' as const } };
    expect(setResult(noDay, '', at('2026-09-14', '14:30')).reception.date).toBe('');
    expect(setResult({ ...dl() }, 'sans', at('2026-09-14', '14:30')).reception).toMatchObject({ date: '2026-09-14', time: '14:30' });
  });
  it('a correction cannot make the PV contradict itself: a refusal needs its motive (given or already there), "sans réserve" needs every reservation lifted; a result that does not change is not checked', () => {
    const sansRv = signed(received(released()));
    expect(correctLocked(sansRv, { result: 'refus', _why: 'Erreur' }, A, at('2026-09-15'))).toBe(sansRv);
    const refused = correctLocked(sansRv, { result: 'refus', refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' }, _why: 'Erreur' }, A, at('2026-09-15'));
    expect(refused.reception).toMatchObject({ result: 'refus', refusal: { reason: 'Quantité incorrecte' } });
    expect(correctLocked(refused, { result: 'sans', _why: 'Erreur' }, A, at('2026-09-16')).reception.result).toBe('sans');   // the motive may stay, no reservation
    const reserved = signed(withRv(received(released(), '2026-09-14', 'reserve')));
    expect(correctLocked(reserved, { result: 'sans', _why: 'Erreur' }, A, at('2026-09-15'))).toBe(reserved);
    const lifted = liftReserve(reserved, reservesOf(reserved)[0].id, { at: at('2026-09-16'), by: A, note: 'Revu', now: at('2026-09-16') });
    expect(correctLocked(lifted, { result: 'sans', _why: 'Erreur' }, A, at('2026-09-17')).reception.result).toBe('sans');
    const refusedAlready = signed(refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '14:30'), A));
    expect(correctLocked(refusedAlready, { result: 'refus', place: 'Quai 9', _why: 'Lieu' }, A, at('2026-09-15')).reception.place).toBe('Quai 9');   // the result is the same: not checked again
  });
  it('a correction says what became what: "—" for what was empty, the name of the field only for what is not a text, a quantity of 0 accepted, a negative one refused', () => {
    const lock = signed(withRec(received(released()), { place: '' }));
    const placed = correctLocked(lock, { place: 'Quai 9', _why: 'Lieu oublié' }, A, at('2026-09-15'));
    const said = (d: Delivery) => plain(d.journal!.find(l => l.text.startsWith('Corrigé'))!.text);
    expect(said(placed)).toBe('Corrigé : lieu — → Quai 9 (motif : Lieu oublié)');
    const counted = correctLocked(lock, { count: 3, _why: 'Comptage' }, A, at('2026-09-15'));
    expect(said(counted)).toBe('Corrigé : quantité comptée — → 3 (motif : Comptage)');
    const refusal = correctLocked(lock, { refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' }, _why: 'Motif' }, A, at('2026-09-15'));
    expect(said(refusal)).toBe('Corrigé : refus (motif : Motif)');   // an object is told by its name
    const zero = correctLocked(lock, { order: { qty: 0 }, _why: 'Zéro' }, A, at('2026-09-15'));
    expect(zero.qty).toBe(0);
    expect(correctLocked(lock, { order: { qty: -1 }, _why: 'Moins un' }, A, at('2026-09-15'))).toBe(lock);
  });
  it('a correction leaves the reservations as they were: it adds no list of reservations to a PV that has none, and one that holds none is not given one', () => {
    const lock = signed(received(released()));
    expect(lock.reception.reserves).toBeUndefined();
    const out = correctLocked(lock, { place: 'Quai 9', _why: 'Lieu' }, A, at('2026-09-15'));
    expect(out.reception).not.toHaveProperty('reserves');
    const unsignedNoRv = received(released());
    expect(setResult(unsignedNoRv, 'sans', at('2026-09-14', '15:00'))).toBe(unsignedNoRv);
    expect(setResult(arrived(released()), 'sans', at('2026-09-14', '15:00')).reception).not.toHaveProperty('reserves');
  });
  it('the photo of the paper PV taken away on a PV not locked keeps the moment of a signature drawn on the screen; one that was the signature takes its moment with it', () => {
    const base = arrived(released(), '2026-09-14');
    const viaPhoto = setPvPhoto(base, 'photo:pv-1-1', at('2026-09-14', '15:00'), A);
    expect(viaPhoto.reception).toMatchObject({ signedAt: '2026-09-14T15:00', pvPhotoAt: '2026-09-14T15:00' });
    const gone = setPvPhoto(viaPhoto, '', at('2026-09-14', '15:10'), A);
    expect(gone.reception).not.toHaveProperty('signedAt');
    expect(gone.reception).not.toHaveProperty('pvPhotoAt');
    const drawn = { ...viaPhoto, reception: { ...viaPhoto.reception, signedAt: '2026-09-14T14:40' } };   // a signature on the screen at 14:40, the photo at 15:00
    const kept = setPvPhoto(drawn, '', at('2026-09-14', '15:10'), A);
    expect(kept.reception.signedAt).toBe('2026-09-14T14:40');
    expect(kept.reception).not.toHaveProperty('pvPhotoAt');
  });
  it('a photo or a signature already used by another order is told by the number of that order, else its object, else its id', () => {
    const named = (over: Partial<Delivery>) => ({ ...dl({ id: 'other', ...over }), pvPhoto: 'photo:pv-9-9', signClient: ink2 }) as Delivery;
    const s = (d: Delivery) => st([d, dl({ id: 'mine' })]);
    expect(photoReuse(s(named({ ref: 'CMD-9' })), 'photo:pv-9-9', 'mine')).toBe('Cette photo est déjà utilisée par la commande CMD-9');
    expect(photoReuse(s(named({ ref: '', item: 'Portail' })), 'photo:pv-9-9', 'mine')).toBe('Cette photo est déjà utilisée par la commande Portail');
    expect(photoReuse(s(named({ ref: '', item: '' })), 'photo:pv-9-9', 'mine')).toBe('Cette photo est déjà utilisée par la commande other');
    expect(signatureReuse(s(named({ ref: 'CMD-9' })), ink2, 'mine')).toBe('Cette signature est identique à celle de la commande CMD-9');
    expect(signatureReuse(s(named({ ref: '', item: 'Portail' })), ink2, 'mine')).toBe('Cette signature est identique à celle de la commande Portail');
    expect(signatureReuse(s(named({ ref: '', item: '' })), ink2, 'mine')).toBe('Cette signature est identique à celle de la commande other');
    expect(signatureReuse(s(named({ ref: 'CMD-9' })), ink2, 'other')).toBe('');   // the order itself is left out
  });
  it('the witness of a PV the customer did not sign is neither the person who records nor the person who signed for the company at the moment written (the last one drawn)', () => {
    const open = received(released()), one = signCompany(open, ink, at('2026-09-14', '14:35'), 'Paul'), two = signCompany(one, ink2, at('2026-09-14', '14:50'), 'Marc');
    const reset = (d: Delivery) => ({ ...d, reception: { ...d.reception, result: '' as const } });
    expect(setNoSign(reset(two), 'absent', 'Marc', at('2026-09-14', '15:00'), A)).toEqual(reset(two));                 // the signer of the moment written
    expect(setNoSign(reset(two), 'absent', 'Paul', at('2026-09-14', '15:00'), A).reception.noSign?.witness).toBe('Paul');   // the first one signed over: he is not the signer of the moment
  });
  it('a quantity typed that is not a number to read is the saved one, but 0 is a number: the typed copy keeps it', () => {
    const saved = dl({ qty: 10 });
    expect(takeLife({ ...saved, qty: 0 }, saved).qty).toBe(0);
    expect(takeLife({ ...saved, qty: -3 }, saved).qty).toBe(10);
    expect(takeLife({ ...saved, qty: Number.NaN }, saved).qty).toBe(10);
    expect(takeLife({ ...saved, qty: null }, saved).qty).toBeNull();
  });
  it('deleting an order says what would be lost: a milestone with a result, a history, a waiver or a photo is a milestone checked; a check before departure is told once made', () => {
    const one = (over: Partial<Milestone>) => dl({ milestones: [{ ...ms()[0], ...over }, ...ms().slice(1)] });
    expect(lostByDeleting(dl())).toBe('');
    expect(plain(lostByDeleting(one({ ok: true })))).toBe('1 jalon contrôlé');
    expect(plain(lostByDeleting(one({ history: [{ at: at('2026-09-10'), by: A, kind: 'reopen', ok: null, measured: '' }] })))).toBe('1 jalon contrôlé');
    expect(plain(lostByDeleting(one({ waivedBy: 'Marc' })))).toBe('1 jalon contrôlé');
    expect(plain(lostByDeleting(one({ photo: 'photo:a-1-1' })))).toBe('1 jalon contrôlé');
    expect(plain(lostByDeleting(one({ gapPhoto: 'photo:g-1-1' })))).toBe('1 jalon contrôlé');
    expect(plain(lostByDeleting({ ...dl(), shipChecks: [{ id: 'sc_0', label: 'Docs', ok: true, by: A, at: at('2026-09-10') }, { id: 'sc_1', label: 'Qté', ok: null, by: '', at: '' }] }))).toBe('1 contrôle de départ');
  });
});

describe('3.4 rules: the state of the delivery under way, read alone (currentState)', () => {
  const state = (d: Delivery) => currentState(d, now, P);
  it('tells each of the twelve states in the order of the rules: archived, refused, a reservation open (late or not), received (in part, without reservation, lifted), delivered, released, not conform, to release, in progress', () => {
    const ko = (d: Delivery) => checkMilestone(d, 'm2', { ok: false, by: A, at: at('2026-09-10', '09:00') });
    const open = (day: string) => withRv(received(released(dl({ qty: 10 })), day, 'reserve'), 'Rayure', day);
    expect(state(dl())).toBe('in_progress');
    expect(state(checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') }))).toBe('in_progress');
    expect(state(allOk(dl()))).toBe('to_release');
    expect(state(ko(dl()))).toBe('blocked');
    expect(state(waiveMilestone(ko(allOk(dl())), 'm2', 'Marc', 'Accord', at('2026-09-10', '10:00')))).toBe('to_release');   // a waived milestone no longer stands in the way
    expect(state(setMilestoneNa(allOk(dl()), 'm4', 'Sans objet ici', A, at('2026-09-10', '10:00')))).toBe('to_release');
    expect(state({ ...allOk(dl()), milestones: allOk(dl()).milestones.map((m, i) => (i === 3 ? { ...m, ok: null, na: true } : m)) })).toBe('to_release');
    expect(state(released())).toBe('released');
    expect(state(arrived(released()))).toBe('delivered');
    expect(state(signed(received(released(dl({ qty: 10 })), '2026-09-14')))).toBe('accepted');
    expect(state(withRec(signed(received(released(dl({ qty: 10 })), '2026-09-14')), { qty: 4 }))).toBe('partial');
    expect(state(open('2026-09-24'))).toBe('reserve');           // due on the 5 October: not late on the 25 September
    expect(state(open('2026-09-01'))).toBe('reserve_late');      // due on the 10 September: late
    expect(state(withRec(received(released(), '2026-09-14', 'reserve'), { reserves: [] }))).toBe('reserve');   // "avec réserve" and none written: still to describe
    const o14 = open('2026-09-14'), lifted = liftReserve(o14, reservesOf(o14)[0].id, { at: at('2026-09-16'), by: A, note: 'Revu', now: at('2026-09-16') });
    expect(state(lifted)).toBe('lifted');
    expect(state(signed(refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '14:30'), A)))).toBe('refused');
    expect(state(archiveDelivery(open('2026-09-01'), at('2026-09-20'), ''))).toBe('archived');
    expect(state(archiveDelivery(signed(refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '14:30'), A)), at('2026-09-20'), ''))).toBe('archived');
  });
  it('a refusal comes before an open reservation, an open reservation before a reception, a reception before the delivery, the delivery before the release, the release before a milestone not conform', () => {
    const refusedWithRv = refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '14:30'), A);
    expect(state({ ...refusedWithRv, reception: { ...refusedWithRv.reception, reserves: [{ id: 'rv1', text: 'Rayure', raisedAt: '2026-09-14' }] } })).toBe('refused');   // the rule is read on a record that holds both
    const koAfterRelease = { ...released(), milestones: released().milestones.map((m, i) => (i === 1 ? { ...m, ok: false } : m)) };
    expect(state(koAfterRelease)).toBe('released');
    expect(state({ ...arrived(released()), milestones: released().milestones.map((m, i) => (i === 1 ? { ...m, ok: false } : m)) })).toBe('delivered');
  });
  it('the state of the order reads the reservations of the closed deliveries too, the one of the delivery under way does not', () => {
    const first = signed(withRv(received(released(dl({ qty: 10 })), '2026-09-14', 'reserve'), 'Rayure', '2026-09-14'), '2026-09-14'), two = nextPresentation(withRec(first, { qty: 4 }), A, at('2026-09-15'));
    expect(deliveryState(two, now, P)).toBe('reserve_late');   // the reservation of the first delivery is open, due on the 23 September
    expect(state(two)).toBe('in_progress');                     // the delivery under way has none
  });
});

describe('3.4 rules: the facts of the queue come most pressing first', () => {
  // KNOWN DEFECT (production, receptionsAll.ts, last line of `receptionInsights`): the `.sort(...)` that puts the red facts before the amber ones sits INSIDE the line comment
  // ("... the sentence does not add another.sort((a, b) => ..."): it never runs, and the facts come in the order they are written in the function. `it.fails` stays until the comment is
  // moved after the `.sort(...)`; then it becomes `it`.
  it('lists the red facts before the amber ones, whatever the order the rules are written in', () => {
    const amber = received(released(dl({ id: 'a', ref: 'A' })), '2026-09-22');                    // a PV that nobody signed (amber)
    const red = signed(received(dl({ id: 'b', ref: 'B' }), '2026-09-14'));                        // delivered, no release recorded (red)
    const facts = receptionInsights(st([amber, red]), now), rank = { bad: 0, warn: 1, good: 2 };
    expect(facts.map(f => f.key)).toEqual(expect.arrayContaining(['unsigned', 'delivered-unreleased']));
    expect(facts.map(f => rank[f.tone])).toEqual(facts.map(f => rank[f.tone]).sort((x, y) => x - y));
  });
});
