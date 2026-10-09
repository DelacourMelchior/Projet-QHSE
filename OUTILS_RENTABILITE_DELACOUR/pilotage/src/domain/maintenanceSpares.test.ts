// Tool 3.3, the common survival cabinet: levels, movements, orders, counts, statistics, supplier facts, taking over the old parts, to-do list and facts.
import { describe, expect, it } from 'vitest';
import type { Equipment, Person, Spare, SparePart, State, Supplier } from './types';
import {
  activeSpares, cancelOrder, countCabinet, countDue, countSpare, createdOf, expiresIn, followedSpares, isCritical, keepMoves, leadDaysOf, leadLabel, lowSpares, migrateParts, MOVES_KEPT, moveSpare, newSpare,
  orderDue, orderLateDays, ORDER_DEFAULT_DAYS, orderOf, orderSpare, putBack, receiveSpare, SPARE_LEVEL, SPARE_LIFE, spareFacts, spareKey, spareLevel, sparesOf, spareTodos, stockWeeks, supplierFacts,
  takeOut, takeSpareLife, usedLast12m,
} from './maintenanceSpares';
import { addDays, emptyTools, nowLocal } from './base';
import { isoDate } from './periods';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const eq = (over: Partial<Equipment> = {}): Equipment => ({
  id: 'eq1', name: "Centre d'usinage", location: '', operator: '', manager: 'David K.', riskId: '', checkpoints: [], inspections: [], parts: [], ...over,
});
const sp = (over: Partial<Spare> = {}): Spare => ({ ...newSpare(['eq1']), id: 'sp1', name: 'Courroie crantée axe Z', ref: 'CR-8840-HD', min: 2, stock: 3, ...over });
const cabinet = (xs: Spare[], over: Partial<State> = {}) => st({ spares: Object.fromEntries(xs.map(x => [x.id, x])), equipments: { eq1: eq() }, ...over });
const part = (over: Partial<SparePart> = {}): SparePart => ({ name: 'Courroie', ref: 'CR-1', supplier: '', leadTime: '', min: 1, stock: 1, ...over });
const person = (name: string, from: string, to: string): Person => ({ id: name, name, role: '', active: true, absences: [{ from, to }] });
const supplier = (over: Partial<Supplier> = {}): Supplier => ({ id: 'su1', name: 'Hydro-Parts', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [], ...over });
const rating = (q: number, d: number, sv: number) => ({ date: '2026-06-01', by: 'D', note: '', quality: q, delay: d, service: sv, max: [40, 40, 20] as [number, number, number] });
const use = (at: string, n = 1) => ({ id: `mv_${at}${n}`, at, by: 'Julien P.', delta: -n, why: 'use' as const });

describe('3.3 the part and its level', () => {
  it('a new part is critical, at 1 for a mini of 1, with no lead time', () => {
    const x = newSpare(['eq1', 'eq2']);
    expect(x.id).toMatch(/^sp_/);
    expect(x).toMatchObject({ critical: true, min: 1, stock: 1, leadDays: null, why: [], equipmentIds: ['eq1', 'eq2'], name: '', ref: '' });
    expect(newSpare().equipmentIds).toEqual([]);
  });
  it('a part without the flag is critical, a consumable is not', () => {
    expect(isCritical(sp({ critical: undefined }))).toBe(true);
    expect(isCritical(sp({ critical: false }))).toBe(false);
  });
  it('has four levels: above, at, under the mini, rupture', () => {
    expect(spareLevel(sp({ min: 2, stock: 3 }))).toBe('ok');
    expect(spareLevel(sp({ min: 2, stock: 2 }))).toBe('min');
    expect(spareLevel(sp({ min: 2, stock: 1 }))).toBe('low');
    expect(spareLevel(sp({ min: 2, stock: 0 }))).toBe('out');
    expect(spareLevel(sp({ min: 0, stock: 0 }))).toBe('min');
    expect(Object.values(SPARE_LEVEL).map(l => l.label)).toEqual(['Au-dessus du mini', 'Au mini', 'Sous le mini', 'En rupture']);
  });
  it('lists the active parts by name, without the retired ones', () => {
    const s = cabinet([sp({ id: 'a', name: 'Joint' }), sp({ id: 'b', name: 'Courroie' }), sp({ id: 'c', name: 'Ancienne', retired: true })]);
    expect(activeSpares(s).map(x => x.id)).toEqual(['b', 'a']);
  });
  it('one part serves several pieces of equipment with a single stock', () => {
    const s = cabinet([sp({ id: 'a', equipmentIds: ['eq1', 'eq2', 'eq3'] }), sp({ id: 'b', equipmentIds: ['eq2'] })]);
    expect(sparesOf(s, 'eq3').map(x => x.id)).toEqual(['a']);
    expect(sparesOf(s, 'eq2')).toHaveLength(2);
    expect(sparesOf(s, 'eq9')).toEqual([]);
  });
  it('lowSpares keeps the critical parts under the mini or in rupture', () => {
    const s = cabinet([sp({ id: 'a', stock: 1 }), sp({ id: 'b', stock: 0 }), sp({ id: 'c', stock: 2 }), sp({ id: 'd', stock: 0, critical: false }), sp({ id: 'e', stock: 0, retired: true })]);
    expect(lowSpares(s).map(x => x.id).sort()).toEqual(['a', 'b']);
  });
  it('reads data that has no collection yet', () => {
    const s = st();
    delete (s as { spares?: unknown }).spares;
    expect(activeSpares(s)).toEqual([]);
    expect(spareTodos(s, now)).toEqual([]);
    expect(spareFacts(s, now)).toEqual([]);
  });
});

describe('3.3 movements', () => {
  it('writes a dated movement and never goes under 0', () => {
    const a = moveSpare(sp({ stock: 1 }), { delta: -3, why: 'use', by: 'Julien P.', at: '2026-09-25T09:30', equipmentId: 'eq1', anomalyId: 'an1', breakdownId: 'bd1', note: 'Courroie cassée' });
    expect(a.stock).toBe(0);
    expect(a.moves).toHaveLength(1);
    expect(a.moves![0]).toMatchObject({ at: '2026-09-25T09:30', by: 'Julien P.', delta: -3, why: 'use', equipmentId: 'eq1', anomalyId: 'an1', breakdownId: 'bd1', note: 'Courroie cassée' });
    expect(a.moves![0].id).toMatch(/^mv_/);
  });
  it('stamps the moment when none is given and leaves out what was not said', () => {
    const m = moveSpare(sp(), { delta: 1, why: 'return', by: 'A', note: '' }).moves![0];
    expect(m.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(Object.keys(m).sort()).toEqual(['at', 'by', 'delta', 'id', 'why']);
  });
  it('keeps the movements of the 13 months before the newest one, however many there are, and 1000 at most', () => {
    const old = sp({ stock: 10, moves: [use('2025-07-31'), use('2025-08-01'), use('2026-01-05')] });
    const x = moveSpare(old, { delta: -1, why: 'use', by: 'A', at: '2026-09-01T08:00' });
    expect(x.moves!.map(m => m.at)).toEqual(['2025-08-01', '2026-01-05', '2026-09-01T08:00']);   // 2025-08-01 is the first day kept, 2025-07-31 is cut
    let y = sp({ stock: 5000, moves: [] });
    for (let i = 0; i < 300; i++) y = moveSpare(y, { delta: -1, why: 'use', by: 'A', at: `2026-0${1 + (i % 9)}-15T08:00`, note: `n${i}` });
    expect(y.moves).toHaveLength(300);
    expect(y.stock).toBe(4700);
    for (let i = 0; i < 705; i++) y = moveSpare(y, { delta: -1, why: 'use', by: 'A', at: '2026-09-20T08:00', note: `m${i}` });
    expect(y.moves).toHaveLength(MOVES_KEPT);
    expect(y.moves![0].note).toBe('n5');
    expect(y.moves![999].note).toBe('m704');
    expect(y.stock).toBe(3995);
  });
  it('keepMoves cuts by the newest movement of the list, not by the clock', () => {
    const ms = [use('2023-11-30'), use('2023-12-01'), use('2025-01-01')];
    expect(keepMoves(ms).map(m => m.at)).toEqual(['2023-12-01', '2025-01-01']);   // the newest is 2025-01-01: the window starts 13 months before, on 2023-12-01
    expect(keepMoves([use('2025-01-01'), use('2023-11-30'), use('2023-12-01')]).map(m => m.at)).toEqual(['2025-01-01', '2023-12-01']);   // whatever the order of the list
    expect(keepMoves([])).toEqual([]);
    expect(keepMoves([{ ...use('2025-01-01'), at: '' }, use('2025-01-02')]).map(m => m.id)).toHaveLength(2);   // a movement without a day is kept
  });
  it('takeOut removes one for an equipment and an anomaly, putBack gives it back', () => {
    const a = takeOut(sp({ stock: 2 }), 'Julien P.', { equipmentId: 'eq1', anomalyId: 'an1', at: '2026-09-25T08:00' });
    expect(a.stock).toBe(1);
    expect(a.moves![0]).toMatchObject({ delta: -1, why: 'use', by: 'Julien P.', equipmentId: 'eq1', anomalyId: 'an1', at: '2026-09-25T08:00' });
    const b = putBack(a, 'Julien P.', '2026-09-25T08:05');
    expect(b.stock).toBe(2);
    expect(b.moves![1]).toMatchObject({ delta: 1, why: 'return', at: '2026-09-25T08:05' });
    expect(takeOut(sp({ stock: 0 }), 'A').stock).toBe(0);
  });
  it('does not touch the part it is given', () => {
    const x = sp({ stock: 2 });
    takeOut(x, 'A');
    expect(x.stock).toBe(2);
    expect(x.moves).toBeUndefined();
  });
});

describe('3.3 order, delivery, delay', () => {
  it('records an order with its quantity, its day and the day expected', () => {
    expect(orderSpare(sp(), 2, '2026-09-20', '2026-10-10').order).toEqual({ qty: 2, at: '2026-09-20', expectedAt: '2026-10-10' });
    expect(orderOf(orderSpare(sp(), 2, '2026-09-20', '2026-10-10'))).toEqual({ qty: 2, at: '2026-09-20', expectedAt: '2026-10-10' });
    expect(orderOf(sp())).toBeNull();
  });
  it('takes the expected day from the lead time of the part, and none without it', () => {
    expect(orderSpare(sp({ leadDays: 21 }), 1, '2026-09-20').order!.expectedAt).toBe('2026-10-11');
    expect(orderSpare(sp({ leadDays: 21 }), 1, '2026-09-20', '').order!.expectedAt).toBe('2026-10-11');
    expect(orderSpare(sp({ leadDays: null }), 1, '2026-09-20').order!.expectedAt).toBe('');
    expect(orderSpare(sp({ leadDays: 0 }), 1, '2026-09-20').order!.expectedAt).toBe('2026-09-20');
    expect(orderSpare(sp(), 0, '2026-09-20').order!.qty).toBe(1);
  });
  it('a reception adds the quantity ordered, empties the order and writes a movement', () => {
    const a = receiveSpare(orderSpare(sp({ stock: 0 }), 3, '2026-09-20', '2026-10-01'), 'Julien P.', '2026-09-30');
    expect(a.stock).toBe(3);
    expect(a.order).toBeUndefined();
    expect(a.moves![0]).toMatchObject({ delta: 3, why: 'received', by: 'Julien P.', at: '2026-09-30' });
  });
  it('a reception can take another quantity, or nothing when nothing is known', () => {
    expect(receiveSpare(orderSpare(sp({ stock: 0 }), 3, '2026-09-20'), 'A', '2026-09-30', 2).stock).toBe(2);
    const none = receiveSpare(sp({ stock: 1 }), 'A', '2026-09-30');
    expect(none.stock).toBe(1);
    expect(none.moves).toBeUndefined();
  });
  it('cancels an order without moving the stock', () => {
    const a = cancelOrder(orderSpare(sp({ stock: 1 }), 2, '2026-09-20'));
    expect(a.order).toBeUndefined();
    expect(a.stock).toBe(1);
  });
  it('counts the days of delay from the expected day, 0 when not late', () => {
    const o = (expectedAt: string) => orderSpare(sp(), 1, '2026-09-01', expectedAt);
    expect(orderLateDays(sp(), now)).toBe(0);
    expect(orderLateDays(o('2026-10-02'), now)).toBe(0);
    expect(orderLateDays(o('2026-09-25'), now)).toBe(0);
    expect(orderLateDays(o('2026-09-16'), now)).toBe(9);
    expect(orderLateDays({ ...sp(), order: { qty: 1, at: '2026-09-01', expectedAt: '' } }, now)).toBe(0);
  });
  it('turns a written lead time into days', () => {
    expect(leadDaysOf('3 semaines')).toBe(21);
    expect(leadDaysOf('10 jours')).toBe(10);
    expect(leadDaysOf('1 mois')).toBe(30);
    expect(leadDaysOf('sous 4 h')).toBe(1);
    expect(leadDaysOf('immédiat')).toBe(0);
    expect(leadDaysOf('2,5 jours')).toBe(3);
    expect(leadDaysOf('quand il pourra')).toBeNull();
    expect(leadDaysOf('')).toBeNull();
  });
  it('writes the lead time in days or says it is unknown', () => {
    expect(leadLabel(sp({ leadDays: 21 }))).toBe('21 jours');
    expect(leadLabel(sp({ leadDays: 1 }))).toBe('1 jour');
    expect(leadLabel(sp({ leadDays: null }))).toBe('délai inconnu');
  });
});

describe('3.3 count of the cabinet', () => {
  it('writes the date and the person, and no movement when the count is right', () => {
    const a = countSpare(sp({ stock: 3 }), 'Julien P.', '2026-09-25', 3);
    expect(a).toMatchObject({ countedAt: '2026-09-25', countedBy: 'Julien P.', stock: 3 });
    expect(a.moves).toBeUndefined();
    expect(countSpare(sp({ stock: 3 }), 'Julien P.', '2026-09-25').moves).toBeUndefined();
  });
  it('turns a gap into a movement "count" of the difference and fixes the stock', () => {
    const down = countSpare(sp({ stock: 3 }), 'Julien P.', '2026-09-25', 1);
    expect(down.stock).toBe(1);
    expect(down.moves![0]).toMatchObject({ delta: -2, why: 'count', by: 'Julien P.', at: '2026-09-25' });
    const up = countSpare(sp({ stock: 1 }), 'Julien P.', '2026-09-25', 4);
    expect(up.stock).toBe(4);
    expect(up.moves![0].delta).toBe(3);
    expect(countSpare(sp({ stock: 1 }), 'A', '2026-09-25', -2).stock).toBe(0);
  });
  it('the count is due after 30 days, from the count that is the oldest of the critical parts', () => {
    const at = (d: string) => cabinet([sp({ id: 'a', countedAt: d }), sp({ id: 'b', countedAt: '2026-09-24' })]);
    expect(countDue(at('2026-09-20'), now)).toEqual({ due: false, days: 5 });
    expect(countDue(at('2026-08-27'), now)).toEqual({ due: false, days: 29 });
    expect(countDue(at('2026-08-26'), now)).toEqual({ due: true, days: 30 });
    expect(countDue(at('2026-07-01'), now)).toEqual({ due: true, days: 86 });
  });
  it('counting one part does not start the clock again for the others; a retired part does not count', () => {
    const s = cabinet([sp({ id: 'a', countedAt: '2026-06-01' }), sp({ id: 'b', countedAt: '2026-09-24' }), sp({ id: 'c', countedAt: '2026-09-25', retired: true })]);
    expect(countDue(s, now)).toEqual({ due: true, days: 116 });
    const one = cabinet([sp({ id: 'a', countedAt: '2026-06-01' }), sp({ id: 'b', countedAt: '2026-06-01' })]);
    const after = { ...one, spares: { ...one.spares, a: countSpare(one.spares.a, 'Julien P.', '2026-09-25T09:00') } };
    expect(countDue(after, now)).toEqual({ due: true, days: 116 });
    expect(countDue({ ...after, spares: { ...after.spares, ...countCabinet(after, 'Julien P.', '2026-09-25T09:05') } }, now)).toEqual({ due: false, days: 0 });
  });
  it('never counted is due, a part never counted makes the cabinet due, and an empty cabinet is not', () => {
    expect(countDue(cabinet([sp()]), now)).toEqual({ due: true, days: null });
    expect(countDue(cabinet([sp({ id: 'a', countedAt: '2026-09-25' }), sp({ id: 'b' })]), now)).toEqual({ due: true, days: null });
    expect(countDue(cabinet([]), now)).toEqual({ due: false, days: null });
  });
  it('follows the limit of the settings', () => {
    const s = cabinet([sp({ countedAt: '2026-09-10' })], { params: { ...st().params, maint: { countDays: 14 } } });
    expect(countDue(s, now)).toEqual({ due: true, days: 15 });
    expect(countDue({ ...s, params: { ...s.params, maint: { countDays: 60 } } }, now).due).toBe(false);
  });
  it('"nothing to report" stamps every active part and only them', () => {
    const s = cabinet([sp({ id: 'a' }), sp({ id: 'b', stock: 5 }), sp({ id: 'c', retired: true })]);
    const out = countCabinet(s, 'Julien P.', '2026-09-25');
    expect(Object.keys(out).sort()).toEqual(['a', 'b']);
    expect(out.a).toMatchObject({ countedAt: '2026-09-25', countedBy: 'Julien P.' });
    expect(out.b.stock).toBe(5);
    expect(s.spares.a.countedAt).toBeUndefined();
  });
});

describe('3.3 statistics', () => {
  it('adds the uses of the last 12 months and nothing else', () => {
    const x = sp({ stock: 3, moves: [use('2026-09-01', 2), use('2025-10-01'), use('2025-09-24'), use('2026-08-01'), { ...use('2026-08-02'), why: 'return' as const, delta: 1 }, { ...use('2026-08-03'), why: 'count' as const, delta: -4 }] });
    expect(usedLast12m(x, now)).toBe(3);   // 2 + 1 + 1 out, 1 back; the day 2025-09-24 is before the year, the count is not a use
    expect(usedLast12m(sp(), now)).toBe(0);
  });
  it('a part taken then put back was not used: the net use, never under 0', () => {
    const back = (at: string, n = 1) => ({ ...use(at, n), why: 'return' as const, delta: n });
    expect(usedLast12m(sp({ moves: [use('2026-09-01'), back('2026-09-02')] }), now)).toBe(0);
    expect(usedLast12m(sp({ moves: [use('2026-09-01', 3), back('2026-09-02', 2)] }), now)).toBe(1);
    expect(usedLast12m(sp({ moves: [back('2026-09-02', 2)] }), now)).toBe(0);
    expect(usedLast12m(sp({ moves: [use('2025-08-01', 4), back('2026-09-02')] }), now)).toBe(0);
    expect(stockWeeks(sp({ stock: 3, moves: [use('2026-09-01'), back('2026-09-02')] }), now)).toBeNull();
  });
  it('gives the weeks the stock lasts at the rhythm since the first movement of the part', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => use(`2026-0${(i % 9) + 1}-10`, 1));   // first on 2026-01-10: 258 days before the 25th of September
    expect(stockWeeks(sp({ stock: 3, moves: twelve }), now)).toBe(9.2);   // 3 ÷ 12 uses × 258 days ÷ 7
    expect(stockWeeks(sp({ stock: 0, moves: twelve }), now)).toBe(0);
    expect(stockWeeks(sp({ stock: 3 }), now)).toBeNull();
  });
  it('measures the days from the first movement, between 28 and 365', () => {
    const days = (d: number) => stockWeeks(sp({ stock: 7, moves: [{ ...use(addDays('2026-09-25', -d)), why: 'start' as const, delta: 8 }, use('2026-09-20')] }), now);   // stock 7, one use: weeks = days
    expect([10, 27, 28, 29, 100, 365, 366, 700].map(days)).toEqual([28, 28, 28, 29, 100, 365, 365, 365]);
  });
  it('300 uses in 9 months are 300 uses, and the stock lasts as long as their rhythm says', () => {
    let x = sp({ stock: 0, moves: [] });
    x = moveSpare(x, { delta: 1000, why: 'start', by: 'A', at: '2026-01-01T08:00' });
    for (let i = 0; i < 300; i++) x = moveSpare(x, { delta: -1, why: 'use', by: 'A', at: `2026-0${1 + (i % 9)}-15T08:00` });
    expect(x.moves).toHaveLength(301);
    expect(x.moves![0].why).toBe('start');
    expect(usedLast12m(x, now)).toBe(300);
    expect(x.stock).toBe(700);
    expect(stockWeeks(x, now)).toBe(89);   // 700 ÷ 300 uses × 267 days ÷ 7
  });
  it('a part created 14 days ago with one use is read on 28 days, so the stock that is shorter than the delivery time is said', () => {
    const young = sp({ id: 'a', stock: 1, min: 1, leadDays: 30, countedAt: '2026-09-20', moves: [{ ...use('2026-09-11'), why: 'start' as const, delta: 2 }, use('2026-09-18')] });
    expect(stockWeeks(young, now)).toBe(4);   // 1 ÷ 1 use × 28 days ÷ 7, and no longer 52 weeks
    const calm = sp({ id: 'b', name: 'Joint', stock: 9, min: 1, leadDays: 30, countedAt: '2026-09-20', moves: [{ ...use('2026-09-11'), why: 'start' as const, delta: 10 }, use('2026-09-18')] });
    const f = spareFacts(cabinet([young, calm]), now).filter(x => x.key === 'spare-weeks');
    expect(f.map(x => x.text)).toEqual(['Courroie crantée axe Z : stock pour 4 semaines, livraison en 30 jours. Calcul au rythme observé depuis le premier mouvement de la pièce, 12 mois au plus.']);
  });
  it('counts the days before the date limit, negative once past', () => {
    expect(expiresIn(sp({ expiresAt: '2026-10-25' }), now)).toBe(30);
    expect(expiresIn(sp({ expiresAt: '2026-09-25' }), now)).toBe(0);
    expect(expiresIn(sp({ expiresAt: '2026-09-15' }), now)).toBe(-10);
    expect(expiresIn(sp(), now)).toBeNull();
  });
});

describe('3.3 supplier of the part', () => {
  const withSup = (x: Supplier, over: Partial<State> = {}) => st({ suppliers: { [x.id]: x }, ...over });
  it('says class C and single source for the supplier picked in 3.1', () => {
    const s = withSup(supplier({ strategic: true, ratings: [rating(10, 10, 5)] }));
    expect(supplierFacts(s, sp({ supplierId: 'su1' }))).toEqual(['le fournisseur est en classe C', 'fournisseur unique ou difficile à remplacer']);
  });
  it('says nothing about a supplier in class A, or without rating', () => {
    expect(supplierFacts(withSup(supplier({ ratings: [rating(40, 40, 20)] })), sp({ supplierId: 'su1' }))).toEqual([]);
    expect(supplierFacts(withSup(supplier()), sp({ supplierId: 'su1' }))).toEqual([]);
  });
  it('finds the supplier by the name written, and says nothing when there is none', () => {
    const s = withSup(supplier({ ratings: [rating(10, 10, 5)] }));
    expect(supplierFacts(s, sp({ supplier: ' hydro-parts ' }))).toEqual(['le fournisseur est en classe C']);
    expect(supplierFacts(s, sp({ supplier: 'Autre atelier' }))).toEqual([]);
    expect(supplierFacts(s, sp({ supplier: '' }))).toEqual([]);
    expect(supplierFacts(s, sp({ supplierId: 'gone' }))).toEqual([]);
  });
});

describe('3.3 taking over the old parts', () => {
  it('keys a part by its reference, else its name, ignoring case and accents', () => {
    expect(spareKey({ ref: ' CR-8840-HD ', name: 'Courroie' })).toBe('cr-8840-hd');
    expect(spareKey({ ref: '', name: 'Électrovanne' })).toBe('electrovanne');
    expect(spareKey({ ref: '', name: '' })).toBe('');
  });
  it('two machines with the same reference give one stock that serves both', () => {
    const s = {
      equipments: {
        a: eq({ id: 'a', parts: [part({ ref: 'CR-8840', name: 'Courroie crantée', stock: 2, min: 2, leadTime: '3 semaines', supplier: 'Constructeur' })] }),
        b: eq({ id: 'b', parts: [part({ ref: 'cr-8840', name: 'Courroie Z', stock: 1, min: 3, leadTime: '10 jours' })] }),
      },
      spares: {},
    };
    const r = migrateParts(s, '2026-09-25T10:00');
    const list = Object.values(r.spares);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Courroie crantée', ref: 'CR-8840', equipmentIds: ['a', 'b'], stock: 3, min: 3, leadDays: 21, supplier: 'Constructeur', critical: true, why: [] });
    expect(list[0].id).toMatch(/^sp_/);
    expect(list[0].moves).toHaveLength(1);
    expect(list[0].moves![0]).toMatchObject({ why: 'start', delta: 3, at: '2026-09-25T10:00' });
    expect(r.equipments.a.parts).toEqual([]);
    expect(r.equipments.b.parts).toEqual([]);
    expect(s.equipments.a.parts).toHaveLength(1);
  });
  it('is repeatable: a second pass changes nothing', () => {
    const s = { equipments: { a: eq({ id: 'a', parts: [part(), part({ ref: '', name: 'Électrovanne' })] }), b: eq({ id: 'b', parts: [part()] }) }, spares: {} };
    const once = migrateParts(s, '2026-09-25T10:00');
    const twice = migrateParts(once, '2026-12-01T08:00');
    expect(twice).toEqual(once);
    expect(twice.equipments).toBe(once.equipments);
    expect(twice.spares).toBe(once.spares);
    expect(Object.keys(once.spares)).toHaveLength(2);
    expect(migrateParts(migrateParts(s, 'x'), 'y').spares).toEqual(migrateParts(s, 'x').spares);
  });
  it('gives the same identifier for the same part, whatever the device', () => {
    const mk = () => ({ equipments: { a: eq({ id: 'a', parts: [part({ ref: 'KJ-300' })] }) }, spares: {} as Record<string, Spare> });
    expect(Object.keys(migrateParts(mk()).spares)).toEqual(Object.keys(migrateParts(mk()).spares));
  });
  it('keys a part without reference by its name, and drops one with neither', () => {
    const r = migrateParts({ equipments: { a: eq({ id: 'a', parts: [part({ ref: '', name: 'Joint torique' }), part({ ref: '', name: '' })] }) }, spares: {} });
    const list = Object.values(r.spares);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'Joint torique', ref: '' });
    expect(r.equipments.a.parts).toEqual([]);
  });
  it('only adds the equipment when the cabinet already holds the part', () => {
    const known = sp({ id: 'sp_known', ref: 'CR-1', equipmentIds: ['z'], stock: 7, min: 4 });
    const r = migrateParts({ equipments: { a: eq({ id: 'a', parts: [part({ ref: 'CR-1', stock: 9, min: 9 })] }), z: eq({ id: 'z' }) }, spares: { sp_known: known } });
    expect(Object.keys(r.spares)).toEqual(['sp_known']);
    expect(r.spares.sp_known).toMatchObject({ equipmentIds: ['z', 'a'], stock: 7, min: 4 });
    expect(r.spares.sp_known.moves).toBeUndefined();
    expect(r.equipments.a.parts).toEqual([]);
  });
  it('keeps the order of the old part, with the quantity that brings the stock back to the mini', () => {
    const r = migrateParts({ equipments: { a: eq({ id: 'a', parts: [part({ stock: 0, min: 2, orderedAt: '2026-09-10', expectedAt: '2026-09-30' })] }) }, spares: {} });
    expect(Object.values(r.spares)[0].order).toEqual({ qty: 2, at: '2026-09-10', expectedAt: '2026-09-30' });
    expect(Object.values(migrateParts({ equipments: { a: eq({ id: 'a', parts: [part({ orderedAt: '2026-09-10' })] }) }, spares: {} }).spares)[0].order).toEqual({ qty: 1, at: '2026-09-10', expectedAt: '' });
    expect(Object.values(migrateParts({ equipments: { a: eq({ id: 'a', parts: [part()] }) }, spares: {} }).spares)[0].order).toBeUndefined();
  });
  it('leaves a state without old parts as it is', () => {
    const s = { equipments: { a: eq({ id: 'a' }), b: { ...eq({ id: 'b' }), parts: undefined as unknown as SparePart[] } }, spares: { x: sp() } };
    const r = migrateParts(s);
    expect(r.equipments).toBe(s.equipments);
    expect(r.spares).toBe(s.spares);
  });
});

describe('3.3 what is typed and what lives apart', () => {
  const saved = sp({ stock: 1, moves: [use('2026-09-24')], order: { qty: 2, at: '2026-09-20', expectedAt: '2026-10-01' }, countedAt: '2026-09-24', countedBy: 'Julien P.' });
  it('takes the life from the saved part and the rest from the typed copy', () => {
    const typed = { ...sp({ stock: 9, name: 'Courroie renommée', place: 'Tiroir 3' }), moves: [], countedAt: '2020-01-01', countedBy: 'X' };
    const out = takeSpareLife(typed, saved);
    expect(out).toMatchObject({ name: 'Courroie renommée', place: 'Tiroir 3', stock: 1, countedAt: '2026-09-24', countedBy: 'Julien P.', order: { qty: 2, at: '2026-09-20', expectedAt: '2026-10-01' } });
    expect(out.moves).toEqual(saved.moves);
  });
  it('drops a life key the saved part does not have, and keeps the copy when nothing is saved', () => {
    const noOrder = takeSpareLife({ ...sp(), order: { qty: 1, at: 'x', expectedAt: '' } }, sp({ stock: 1 }));
    expect('order' in noOrder).toBe(false);
    const typed = sp({ stock: 9 });
    expect(takeSpareLife(typed, undefined)).toBe(typed);
    expect(SPARE_LIFE).toEqual(['stock', 'moves', 'order', 'countedAt', 'countedBy']);
  });
});

describe('3.3 to-do list of the cabinet', () => {
  const todos = (xs: Spare[], over: Partial<State> = {}) => spareTodos(cabinet(xs, { equipments: { eq1: eq() }, ...over }), now);
  const counted = { countedAt: '2026-09-20' };
  it('a critical part under the mini without order is a red task for the manager of its equipment', () => {
    const t = todos([sp({ ...counted, stock: 1, leadDays: 21 })]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ kind: 'order', tone: 'bad', who: 'David K.', due: '', spareId: 'sp1' });
    expect(t[0].text).toBe("Commander Courroie crantée axe Z (Centre d'usinage) : 1 en stock pour un mini de 2, délai 21 jours");
    expect(t[0].eqId).toBeUndefined();
  });
  it('a rupture without order gives the one task "order", not two', () => {
    const t = todos([sp({ ...counted, stock: 0 })]);
    expect(t.map(x => x.kind)).toEqual(['order']);
    expect(t[0].text).toContain('en rupture');
  });
  it('a part on its way gives nothing, except a rupture that lasts', () => {
    const ordered = orderSpare(sp({ ...counted, stock: 1 }), 2, '2026-09-20', '2026-10-05');
    expect(todos([ordered])).toEqual([]);
    const t = todos([orderSpare(sp({ ...counted, stock: 0 }), 2, '2026-09-20', '2026-10-05')]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ kind: 'out', tone: 'bad' });
    expect(t[0].text).toBe("Courroie crantée axe Z (Centre d'usinage) : en rupture, livraison attendue le 05/10/2026");
    expect(todos([orderSpare(sp({ ...counted, stock: 0 }), 2, '2026-09-20', '')])[0].text).toContain('commande en cours');
  });
  it('a late delivery is a fact with the days of delay', () => {
    const late = orderSpare(sp({ ...counted, stock: 1 }), 2, '2026-09-01', '2026-09-16');
    const t = todos([late]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ kind: 'order-late', tone: 'bad', due: '2026-09-16' });
    expect(t[0].text).toBe("Livraison de Courroie crantée axe Z (Centre d'usinage) attendue depuis 9 jours");
    expect(todos([orderSpare(sp({ ...counted, stock: 0 }), 2, '2026-09-01', '2026-09-16')])[0].text).toMatch(/9 jours, pièce en rupture$/);
    const calm = todos([orderSpare(sp({ ...counted, stock: 5 }), 2, '2026-09-01', '2026-09-16')]);
    expect(calm[0]).toMatchObject({ kind: 'order-late', tone: 'warn' });
  });
  it('a consumable gives a line only for a late delivery or a date limit', () => {
    expect(todos([sp({ ...counted, critical: false, stock: 0 })])).toEqual([]);
    expect(todos([orderSpare(sp({ ...counted, critical: false, stock: 0 }), 1, '2026-09-01', '2026-09-16')])[0]).toMatchObject({ kind: 'order-late', tone: 'warn' });
    expect(todos([sp({ ...counted, critical: false, stock: 5, expiresAt: '2026-10-10' })])[0]).toMatchObject({ kind: 'expiry', tone: 'warn' });
  });
  it('a date limit past or within 60 days is a task, past is red', () => {
    const at = (d: string) => todos([sp({ ...counted, stock: 5, expiresAt: d })]);
    expect(at('2026-12-01')).toEqual([]);
    expect(at('2026-11-24')).toHaveLength(1);
    expect(at('2026-11-24')[0]).toMatchObject({ kind: 'expiry', tone: 'warn', due: '2026-11-24' });
    expect(at('2026-11-24')[0].text).toBe("Courroie crantée axe Z (Centre d'usinage) : date limite dans 60 jours");
    expect(at('2026-09-22')[0]).toMatchObject({ tone: 'bad' });
    expect(at('2026-09-22')[0].text).toContain('dépassée depuis 3 jours');
    expect(at('2026-09-25')[0].text).toContain("aujourd'hui");
  });
  it('the count due is one yellow task for the holder of the key, the deputy when the holder is away', () => {
    const params = { ...st().params, maint: { keyHolder: 'Julien P.', keyDeputy: 'Karim T.' } };
    const t = todos([sp({ countedAt: '2026-08-01', stock: 5 })], { params });
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ kind: 'count', tone: 'warn', who: 'Julien P.', due: '2026-08-31' });
    expect(t[0].text).toBe("Compter l'armoire : plus ancien comptage d'une pièce il y a 55 jours");
    const away = todos([sp({ countedAt: '2026-08-01', stock: 5 })], { params, people: { p: person('Julien P.', '2026-09-20', '2026-09-30') } });
    expect(away.find(x => x.kind === 'count')!.who).toBe('Karim T.');
    expect(todos([sp({ stock: 5 })], { params })[0].text).toBe("Compter l'armoire : jamais comptée");
  });
  it('the key holder away without deputy is one task, with a deputy present it is none', () => {
    const base = { ...counted, stock: 5 };
    const away = { p: person('Julien P.', '2026-09-20', '2026-09-30') };
    const alone = todos([sp(base)], { params: { ...st().params, maint: { keyHolder: 'Julien P.' } }, people: away });
    expect(alone.filter(x => x.kind === 'key')).toHaveLength(1);
    expect(alone[0]).toMatchObject({ kind: 'key', tone: 'warn', who: '' });
    expect(alone[0].text).toContain('sans suppléant');
    const cover = todos([sp(base)], { params: { ...st().params, maint: { keyHolder: 'Julien P.', keyDeputy: 'Karim T.' } }, people: away });
    expect(cover).toEqual([]);
    const both = todos([sp(base)], { params: { ...st().params, maint: { keyHolder: 'Julien P.', keyDeputy: 'Karim T.' } }, people: { ...away, q: person('Karim T.', '2026-09-24', '2026-09-26') } });
    expect(both.map(x => x.kind)).toEqual(['key']);
    expect(todos([sp(base)], { params: { ...st().params, maint: { keyHolder: 'Julien P.' } } })).toEqual([]);
  });
  it('an empty cabinet gives no task, a part serving several equipments names their number', () => {
    expect(todos([])).toEqual([]);
    const s = cabinet([sp({ ...counted, stock: 0, equipmentIds: ['eq2', 'eq1', 'eq3'] })], { equipments: { eq1: eq(), eq2: eq({ id: 'eq2', manager: 'Karim T.', retiredAt: '2026-01-01' }), eq3: eq({ id: 'eq3' }) } });
    const t = spareTodos(s, now);
    expect(t[0].text).toContain('(2 équipements)');   // the retired one is not served any more
    expect(t[0].who).toBe('David K.');
  });
  it('gives each task a stable identifier', () => {
    const xs = [sp({ id: 'a', ...counted, stock: 0, expiresAt: '2026-09-20' }), sp({ id: 'b', ...counted, stock: 1, name: 'Joint' })];
    const t = todos(xs);
    expect(t.map(x => x.id).sort()).toEqual(['expiry:a', 'order:a', 'order:b']);
    expect(todos(xs).map(x => x.id)).toEqual(t.map(x => x.id));
  });
});

describe('3.3 facts of the cabinet', () => {
  const facts = (xs: Spare[], over: Partial<State> = {}) => spareFacts(cabinet(xs, over), now);
  const counted = { countedAt: '2026-09-20' };
  const find = (list: ReturnType<typeof spareFacts>, key: string) => list.find(f => f.key === key);
  it('says nothing when the cabinet is in order', () => {
    expect(facts([sp({ ...counted, stock: 5 })])).toEqual([]);
    expect(facts([])).toEqual([]);
  });
  it('counts the parts under the mini and in rupture, by name', () => {
    const f = facts([sp({ id: 'a', ...counted, name: 'Courroie axe Z', stock: 1 }), sp({ id: 'b', ...counted, name: 'Électrovanne', stock: 0 }), sp({ id: 'c', ...counted, name: 'Joint', stock: 1 })]);
    expect(find(f, 'spare-low')).toMatchObject({ tone: 'bad', text: '2 pièces sous le mini : Courroie axe Z, Joint.' });
    expect(find(f, 'spare-out')).toMatchObject({ tone: 'bad', text: '1 pièce en rupture : Électrovanne.' });
  });
  it('lowers the tone of the parts under the mini when every one is on order', () => {
    const f = facts([orderSpare(sp({ ...counted, stock: 1 }), 2, '2026-09-20', '2026-10-05')]);
    expect(find(f, 'spare-low')!.tone).toBe('warn');
    expect(find(f, 'spare-late')).toBeUndefined();
  });
  it('states the late deliveries with their days', () => {
    const one = facts([orderSpare(sp({ ...counted, stock: 5, name: 'Joint' }), 1, '2026-09-01', '2026-09-16')]);
    expect(find(one, 'spare-late')).toMatchObject({ tone: 'warn', text: 'Livraison de Joint attendue depuis 9 jours.' });
    const two = facts([orderSpare(sp({ id: 'a', ...counted, stock: 1, name: 'Joint' }), 1, '2026-09-01', '2026-09-16'), orderSpare(sp({ id: 'b', ...counted, stock: 5, name: 'Courroie' }), 1, '2026-09-01', '2026-09-22')]);
    expect(find(two, 'spare-late')).toMatchObject({ tone: 'bad', text: '2 livraisons en retard : Courroie (3 jours), Joint (9 jours).' });
  });
  it('says how many weeks the stock lasts when it is shorter than the delivery time', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => use(`2026-0${(i % 9) + 1}-10`));
    const f = facts([sp({ ...counted, min: 1, stock: 1, leadDays: 45, moves: twelve })]);
    expect(find(f, 'spare-weeks')).toMatchObject({ tone: 'warn', text: 'Courroie crantée axe Z : stock pour 3 semaines, livraison en 45 jours. Calcul au rythme observé depuis le premier mouvement de la pièce, 12 mois au plus.' });
  });
  it('says nothing about the weeks when the stock covers the delivery time or when nothing was used', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => use(`2026-0${(i % 9) + 1}-10`));
    expect(find(facts([sp({ ...counted, stock: 3, leadDays: 14, moves: twelve })]), 'spare-weeks')).toBeUndefined();
    expect(find(facts([sp({ ...counted, stock: 3, leadDays: 14 })]), 'spare-weeks')).toBeUndefined();
    expect(find(facts([sp({ ...counted, stock: 3, moves: twelve })]), 'spare-weeks')).toBeUndefined();
  });
  it('states the count and the date limits', () => {
    const f = facts([sp({ countedAt: '2026-07-01', stock: 5, expiresAt: '2026-09-20' }), sp({ id: 'b', name: 'Graisse', countedAt: '2026-09-01', stock: 5, expiresAt: '2026-10-15' })]);
    expect(find(f, 'spare-count')!.text).toBe("Plus ancien comptage d'une pièce de l'armoire il y a 86 jours, intervalle prévu de 30 jours.");
    expect(find(f, 'spare-expiry')).toMatchObject({ tone: 'bad', text: 'Date limite : Courroie crantée axe Z (dépassée depuis 5 jours), Graisse (dans 20 jours).' });
    expect(find(facts([sp({ stock: 5 })]), 'spare-count')!.text).toBe("L'armoire n'a jamais été comptée.");
    expect(find(facts([sp({ id: 'a', stock: 5, countedAt: '2026-09-24' }), sp({ id: 'b', name: 'Joint', stock: 5 }), sp({ id: 'c', name: 'Vis', stock: 5 })]), 'spare-count')!.text).toBe('2 pièces jamais comptées sur 3, intervalle prévu de 30 jours.');
  });
  it('states the suppliers in class C with their parts', () => {
    const s = { suppliers: { su1: supplier({ ratings: [rating(10, 10, 5)] }) } };
    const f = facts([sp({ id: 'a', ...counted, stock: 5, name: 'Courroie', supplierId: 'su1' }), sp({ id: 'b', ...counted, stock: 5, name: 'Joint', supplier: 'Hydro-Parts' }), sp({ id: 'c', ...counted, stock: 5, name: 'Vis' })], s);
    expect(find(f, 'spare-supplier')).toMatchObject({ tone: 'warn', text: "Pièces d'un fournisseur en classe C : Hydro-Parts (Courroie, Joint)." });
  });
  it('keeps stable keys and ignores consumables and retired parts for the levels', () => {
    const f = facts([sp({ id: 'a', ...counted, stock: 0, critical: false }), sp({ id: 'b', ...counted, stock: 0, retired: true })]);
    expect(f).toEqual([]);
    const all = facts([sp({ ...counted, stock: 0, expiresAt: '2026-09-20', leadDays: 10 }), sp({ id: 'b', ...counted, stock: 1, name: 'Joint' })]);
    expect(all.map(x => x.key)).toEqual(['spare-out', 'spare-low', 'spare-expiry']);
  });
});

describe('3.3 messages give facts, not orders', () => {
  // infinitive and imperative of the verbs a message of the cabinet could be tempted to use
  const FORBIDDEN = /\b(command(?:er|ez)|trait(?:er|ez)|relanc(?:er|ez)|compt(?:er|ez)|v[ée]rifi(?:er|ez)|contact(?:er|ez)|pr[ée]voir|pr[ée]voyez|planifi(?:er|ez)|remplac(?:er|ez)|appel(?:er|ez)|rang(?:er|ez)|r[ée]approvisionn(?:er|ez)|faites|faire|pensez|penser|veillez|veiller)\b/i;
  const busy = () => {
    const twelve = Array.from({ length: 12 }, (_, i) => use(`2026-0${(i % 9) + 1}-10`));
    const params = { ...st().params, maint: { keyHolder: 'Julien P.' } };
    return cabinet([
      sp({ id: 'a', name: 'Courroie axe Z', stock: 0, leadDays: 21, expiresAt: '2026-09-20', supplier: 'Hydro-Parts' }),
      orderSpare(sp({ id: 'b', name: 'Électrovanne', stock: 1, countedAt: '2026-06-01', moves: twelve, leadDays: 30 }), 2, '2026-09-01', '2026-09-16'),
      orderSpare(sp({ id: 'c', name: 'Joint', stock: 0 }), 2, '2026-09-20', '2026-10-05'),
      sp({ id: 'd', name: 'Graisse', stock: 4, critical: false, expiresAt: '2026-10-20' }),
      sp({ id: 'e', name: 'Capteur', stock: 1 }),
    ], { params, suppliers: { su1: supplier({ ratings: [rating(10, 10, 5)] }) }, people: { p: person('Julien P.', '2026-09-20', '2026-09-30') } });
  };
  it('no fact starts with a verb of order or holds one', () => {
    const f = spareFacts(busy(), now);
    expect(f.length).toBeGreaterThanOrEqual(6);
    f.forEach(x => {
      expect(x.title).not.toMatch(FORBIDDEN);
      expect(x.text).not.toMatch(FORBIDDEN);
      expect(['good', 'warn', 'bad']).toContain(x.tone);
    });
  });
  it('only the task "order" and the task "count" start with an infinitive', () => {
    const t = spareTodos(busy(), now);
    expect(new Set(t.map(x => x.kind))).toEqual(new Set(['order', 'order-late', 'out', 'expiry', 'count', 'key']));
    t.filter(x => !['order', 'count'].includes(x.kind)).forEach(x => expect(x.text).not.toMatch(FORBIDDEN));
    t.filter(x => x.kind === 'order').forEach(x => expect(x.text).toMatch(/^Commander /));
    t.forEach(x => expect(x.text).not.toMatch(/\b(tout de suite|immédiatement|obligatoire|obligation)\b/i));
  });
});

// ---- lot 0, no data lost: the movements removed on purpose live with the stock
describe('3.3 the removed movements live with the stock', () => {
  it('carries `gone` with the life when the typed copy is saved, and drops it when the saved part has none', () => {
    const saved = sp({ gone: ['mv_a'] }), typed = sp({ name: 'Renommée', gone: ['mv_old'] });
    expect(takeSpareLife(typed, saved)).toMatchObject({ name: 'Renommée', gone: ['mv_a'] });
    expect('gone' in takeSpareLife(typed, sp())).toBe(false);
  });
  it('keeps at most 1000 movements, the hard limit the merge of two copies relies on', () => {
    expect(MOVES_KEPT).toBe(1000);
    let x = sp({ stock: 2000, moves: [] });
    for (let i = 0; i < 1005; i++) x = moveSpare(x, { delta: -1, why: 'use', by: 'A', at: `2026-01-01T08:${String(i % 60).padStart(2, '0')}` });
    expect(x.moves).toHaveLength(MOVES_KEPT);
    expect(x.stock).toBe(995);
  });
});

// ---- lot 1, "règles justes": the cabinet tells the truth about orders, stock, lead times, counts and retired equipment
describe('lot 1, 3.6 an order with no delay known is late 30 days after it was placed', () => {
  const placed = (at: string, over: Partial<Spare> = {}, expectedAt = ''): Spare => ({ ...sp({ leadDays: null, ...over }), order: { qty: 2, at, expectedAt } });
  const cab = (xs: Spare[]) => cabinet(xs);
  it('counts from 30 days after the order when neither a day nor a lead time is known, both sides of the limit', () => {
    expect(ORDER_DEFAULT_DAYS).toBe(30);
    expect(orderDue(placed('2026-08-20'))).toBe('2026-09-19');
    expect([placed('2026-08-20'), placed('2026-08-25'), placed('2026-08-26'), placed('2026-08-27'), placed('2026-08-20T09:30')].map(x => orderLateDays(x, now))).toEqual([6, 1, 0, 0, 6]);
    expect(orderDue(sp())).toBe('');
    expect(orderLateDays(sp(), now)).toBe(0);
  });
  it('the lead time of the part replaces the 30 days, and a day expected replaces both', () => {
    expect(orderLateDays(placed('2026-09-01', { leadDays: 14 }), now)).toBe(10);
    expect(orderLateDays(placed('2026-09-01', { leadDays: 14 }, '2026-09-16'), now)).toBe(9);
    expect(orderLateDays(placed('2026-09-01', { leadDays: 14 }, '2026-10-02'), now)).toBe(0);
    expect(orderLateDays(placed('2026-09-20', { leadDays: 0 }), now)).toBe(5);
    expect(orderDue(placed('2026-09-01', { leadDays: 14 }, '2026-09-16'))).toBe('2026-09-16');
    expect(orderDue(placed('2026-09-01', { leadDays: 14 }, '16/09/2026'))).toBe('2026-09-16');
  });
  it('a lead time that is not a number, or a day that is not a day, count as unknown', () => {
    expect(orderLateDays(placed('2026-08-01', { leadDays: NaN }), now)).toBe(25);
    expect(orderLateDays(placed('2026-08-01', {}, 'bientôt'), now)).toBe(25);
    expect(orderLateDays(placed('2026-08-01', {}, '16/09/2026'), now)).toBe(9);
  });
  it('the task, the fact and the statement of a late order with no delay known say that the 30 days were counted', () => {
    const a = placed('2026-08-01', { id: 'a', stock: 0, countedAt: '2026-09-20' }), b = placed('2026-08-27', { id: 'b', name: 'Joint', stock: 0, countedAt: '2026-09-20' });
    const t = spareTodos(cab([a, b]), now);
    expect(t.map(x => [x.id, x.kind, x.tone, x.due])).toEqual([['order-late:a', 'order-late', 'bad', '2026-08-31'], ['out:b', 'out', 'bad', '2026-09-26']]);
    expect(t[0].text).toBe("Livraison de Courroie crantée axe Z (Centre d'usinage) attendue depuis 25 jours, pièce en rupture");
    expect(t[0].fact).toBe("Courroie crantée axe Z (Centre d'usinage) : en rupture, commandée le 01/08/2026, attendue depuis 25 jours (sans délai connu : 30 jours comptés après la commande)");
    expect(t[1].text).toBe("Joint (Centre d'usinage) : en rupture, commande en cours");
    expect(t[1].fact).toBe("Joint (Centre d'usinage) : en rupture, commandée le 27/08/2026, sans date de livraison prévue");
    const late = spareFacts(cab([a, b]), now).find(x => x.key === 'spare-late')!;
    expect(late).toMatchObject({ tone: 'bad', text: 'Livraison de Courroie crantée axe Z attendue depuis 25 jours. Sans délai connu pour Courroie crantée axe Z : 30 jours comptés après la commande.' });
  });
  it('a late delivery with a day expected or a lead time does not claim the 30 days', () => {
    const c = placed('2026-08-01', { id: 'c', name: 'Vis', stock: 5, countedAt: '2026-09-20' }, '2026-09-10'), d = placed('2026-08-01', { id: 'd', name: 'Écrou', stock: 5, leadDays: 14, countedAt: '2026-09-20' });
    const t = spareTodos(cab([c, d]), now);
    expect(t.map(x => [x.id, x.tone, x.due])).toEqual([['order-late:d', 'warn', '2026-08-15'], ['order-late:c', 'warn', '2026-09-10']]);
    expect(t[0].fact).toBe("Écrou (Centre d'usinage) : 5 en stock pour un mini de 2, commandée le 01/08/2026, attendue depuis 41 jours");
    expect(t[1].fact).toBe("Vis (Centre d'usinage) : 5 en stock pour un mini de 2, commandée le 01/08/2026, attendue depuis 15 jours");
    expect(spareFacts(cab([c, d]), now).find(x => x.key === 'spare-late')!.text).toBe('2 livraisons en retard : Écrou (41 jours), Vis (15 jours).');
  });
});

describe('lot 1, 3.7 the movements kept and what they say about the consumption', () => {
  it('a movement of the last year counts, whatever the number of movements', () => {
    let x = sp({ stock: 1000, moves: [] });
    for (let i = 0; i < 261; i++) x = moveSpare(x, { delta: -1, why: 'use', by: 'A', at: addDays('2026-01-01', Math.floor(i * 265 / 261)) + 'T08:00' });
    expect(x.moves).toHaveLength(261);
    expect(usedLast12m(x, now)).toBe(261);
  });
  it('the uses older than a year stay in the list for a month but are not counted', () => {
    const x = sp({ stock: 5, moves: [use('2025-09-24', 3), use('2025-09-25', 2), use('2026-09-25', 1)] });
    expect(usedLast12m(x, now)).toBe(3);
  });
});

describe('lot 1, 3.14 a lead time written by a person', () => {
  const cases: [string, number | null][] = [
    ['2 à 3 semaines', 21], ['1 mois', 30], ['sous 48 h', 2], ['sous 4 h', 1], ['3 semaines', 21], ['10 jours', 10], ['5 jours ouvrés', 7], ['1 sem', 7], ['2 sem.', 14], ['15 j', 15],
    ['1,5 semaine', 11], ['immédiat', 0], ['immédiatement', 0], ['Immédiat', 0], ['48h/72h', 3], ['quinze jours', null], ['1 an', 365], ['24-48 h', 2], ['sur commande', null],
    ['', null], ['   ', null], ['J+3', null], ['de 3 à 5 jours ouvrables', 7], ['Délai 15 habituellement', null], ['réf 12 hydraulique', null], ['3 j', 3], ['3j', 3], ['0 jour', 0],
    ['6 mois', 180], ['8 semaines environ', 56], ['environ 2 semaines', 14], ['7 jrs', 7], ['3 hrs', 1], ['10 days', 10], ['1 semaine, 2 jours', 9], ['2 semaines 3 jours', 17],
    ['1 semaine et 2 jours', 9], ['3 sem. 2 jours', 23], ['3 jours ouvrés', 5], ['10 jours ouvrés', 14], ['5 jo', 7], ['2 ans', 730], ['2 weeks', 14], ['48 heures', 2], ['21', 21], ['2,5 jours', 3],
    ['2 à 3 jours / 1 semaine', 7], ['1 semaine ou 10 jours', 10], ['une pièce 3 jours après 12 hydrauliques', 3],
  ];
  it.each(cases)('reads %j as %j', (text, days) => { expect(leadDaysOf(text)).toBe(days); });
  it('does not read a number that is not followed by a whole unit', () => {
    expect(['15 habituellement', '12 hydraulique', '3 heureusement', '4 jouets', '2 anomalies', '7 semblent'].map(leadDaysOf)).toEqual([null, null, null, null, null, null]);
  });
  it('says that the lead time is not known or not understood, for the parts that move', () => {
    const moving = (id: string, name: string, over: Partial<Spare> = {}) => sp({ id, name, stock: 5, min: 1, countedAt: '2026-09-20', moves: [{ ...use('2026-07-10'), why: 'start' as const, delta: 8 }, use('2026-09-01')], ...over });
    const f = (xs: Spare[]) => spareFacts(cabinet(xs), now).filter(x => x.key === 'spare-lead');
    expect(f([moving('a', 'Courroie'), moving('b', 'Joint', { leadDays: 21 }), moving('c', 'Vis', { leadDays: NaN }), moving('d', 'Graisse', { critical: false }), sp({ id: 'e', name: 'Écrou', stock: 5, countedAt: '2026-09-20' })]))
      .toEqual([{ key: 'spare-lead', tone: 'warn', title: 'Délai de livraison inconnu', text: "Délai de livraison non renseigné ou non compris pour Courroie, Vis : le stock n'est pas comparé au délai." }]);
    expect(f([moving('b', 'Joint', { leadDays: 21 })])).toEqual([]);
  });
});

describe('lot 1, 3.17 the count of the cabinet', () => {
  const todosOf = (xs: Spare[], over: Partial<State> = {}) => spareTodos(cabinet(xs, over), now).filter(x => x.kind === 'count');
  it('a cabinet never counted has its task, which says so, and is yellow', () => {
    const t = todosOf([sp({ id: 'a' }), sp({ id: 'b', name: 'Joint' })]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ id: 'count:cabinet', kind: 'count', tone: 'warn', due: '', text: "Compter l'armoire : jamais comptée", fact: 'Armoire jamais comptée' });
    expect(spareFacts(cabinet([sp({ id: 'a' }), sp({ id: 'b', name: 'Joint' })]), now).find(x => x.key === 'spare-count')).toMatchObject({ tone: 'warn', text: "L'armoire n'a jamais été comptée." });
  });
  it('counting one part of a cabinet counted 100 days ago leaves the task, with the age of the others', () => {
    const old = { countedAt: '2026-06-17T09:00' };
    const one = countSpare(sp({ id: 'a', ...old }), 'Julien P.', '2026-09-25T09:00');
    const t = todosOf([one, sp({ id: 'b', name: 'Joint', ...old }), sp({ id: 'c', name: 'Vis', ...old })]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ due: '2026-07-17', text: "Compter l'armoire : plus ancien comptage d'une pièce il y a 100 jours", fact: "Armoire : plus ancien comptage d'une pièce il y a 100 jours" });
    expect(todosOf([one, sp({ id: 'b', name: 'Joint', countedAt: '2026-09-25T09:01' })])).toEqual([]);
  });
  it('one part never counted among counted ones says how many', () => {
    const t = todosOf([sp({ id: 'a', countedAt: '2026-09-24' }), sp({ id: 'b', name: 'Joint' }), sp({ id: 'c', name: 'Vis' })]);
    expect(t.map(x => [x.text, x.fact, x.due])).toEqual([["Compter l'armoire : 2 pièces jamais comptées sur 3", 'Armoire : 2 pièces jamais comptées sur 3', '']]);
    expect(todosOf([sp({ id: 'a', countedAt: '2026-09-24' }), sp({ id: 'b', name: 'Joint' })])[0].fact).toBe('Armoire : 1 pièce jamais comptée sur 2');
  });
  it('consumables, retired parts and parts of retired equipment are not counted for the due date', () => {
    const eqs = { eq1: eq(), eq9: eq({ id: 'eq9', retiredAt: '2026-01-01' }) };
    const s = cabinet([sp({ id: 'a', countedAt: '2026-09-20' }), sp({ id: 'b', critical: false }), sp({ id: 'c', retired: true }), sp({ id: 'd', equipmentIds: ['eq9'] })], { equipments: eqs });
    expect(countDue(s, now)).toEqual({ due: false, days: 5 });
    expect(spareTodos(s, now).filter(x => x.kind === 'count')).toEqual([]);
    expect(countDue(cabinet([sp({ id: 'b', critical: false })]), now)).toEqual({ due: false, days: null });
  });
  it('retiring the part counted last does not make the cabinet never counted', () => {
    const s = cabinet([sp({ id: 'a', countedAt: '2026-08-16' }), sp({ id: 'b', countedAt: '2026-09-24', retired: true })]);
    expect(countDue(s, now)).toEqual({ due: true, days: 40 });
  });
  it('reads the interval in the settings once: 0 is 0, empty is 30', () => {
    const at = (maint: object) => cabinet([sp({ countedAt: '2026-09-25' })], { params: { ...st().params, maint } });
    expect(countDue(at({ countDays: 0 }), now)).toEqual({ due: true, days: 0 });
    expect(countDue(at({}), now)).toEqual({ due: false, days: 0 });
    expect(countDue(cabinet([sp({ countedAt: '2026-08-26' })], { params: { ...st().params, maint: { countDays: undefined } } }), now)).toEqual({ due: true, days: 30 });
  });
  it('"nothing to report" stamps every part, even the ones never counted, and the task is gone', () => {
    const s = cabinet([sp({ id: 'a', countedAt: '2026-06-01' }), sp({ id: 'b', name: 'Joint' }), sp({ id: 'c', name: 'Graisse', critical: false })]);
    const done = { ...s, spares: { ...s.spares, ...countCabinet(s, 'Julien P.', '2026-09-25T10:00') } };
    expect(Object.values(done.spares).map(x => [x.id, x.countedAt, x.countedBy])).toEqual([['a', '2026-09-25T10:00', 'Julien P.'], ['b', '2026-09-25T10:00', 'Julien P.'], ['c', '2026-09-25T10:00', 'Julien P.']]);
    expect(countDue(done, now)).toEqual({ due: false, days: 0 });
    expect(countDue(s, now).due).toBe(true);
  });
});

describe('lot 1, 3.9 parts of retired equipment', () => {
  const eqs = { eq1: eq({ manager: 'David K.' }), eq2: eq({ id: 'eq2', name: 'Presse plieuse', manager: 'Karim T.' }), eq3: eq({ id: 'eq3', name: 'Ancienne scie', manager: 'Zoé', retiredAt: '2026-05-01' }), eq4: eq({ id: 'eq4', name: 'Vieux tour', retiredAt: '2026-06-01' }) };
  const counted = { countedAt: '2026-09-20' };
  const classC = { suppliers: { su1: supplier({ ratings: [rating(10, 10, 5)] }) } };
  const parts = () => [
    orderSpare(sp({ id: 'a', ...counted, name: 'Bague', equipmentIds: ['eq3'], stock: 0, supplier: 'Hydro-Parts', expiresAt: '2026-09-01' }), 1, '2026-08-01'),
    sp({ id: 'b', ...counted, name: 'Courroie', equipmentIds: ['eq3', 'eq2', 'eq1'], stock: 0 }),
    sp({ id: 'c', ...counted, name: 'Joint', equipmentIds: [], stock: 0 }),
    sp({ id: 'd', ...counted, name: 'Vis', equipmentIds: ['eq3', 'eq4'], stock: 0 }),
    sp({ id: 'e', ...counted, name: 'Écrou', equipmentIds: ['eqX'], stock: 0 }),
  ];
  const s = () => cabinet(parts(), { equipments: eqs, ...classC });
  it('followedSpares leaves out the parts whose equipment is all retired, and only them', () => {
    expect(followedSpares(s()).map(x => x.id)).toEqual(['b', 'e', 'c']);   // by name: Courroie, Écrou, Joint
    expect(activeSpares(s()).map(x => x.id)).toEqual(['a', 'b', 'e', 'c', 'd']);   // the cabinet still lists them
    expect(lowSpares(s()).map(x => x.id)).toEqual(['b', 'e', 'c']);
  });
  it('the tasks and the facts hold only the followed parts, and the owner is the first equipment in service', () => {
    const t = spareTodos(s(), now);
    expect(t.map(x => [x.id, x.who])).toEqual([['order:b', 'Karim T.'], ['order:e', ''], ['order:c', '']]);
    expect(t[0].text).toBe('Commander Courroie (2 équipements) : en rupture');
    expect(t[0].fact).toBe('Courroie (2 équipements) : en rupture, aucune commande en cours');
    const f = spareFacts(s(), now);
    expect(f.map(x => x.key)).toEqual(['spare-out']);
    expect(f[0].text).toBe('3 pièces en rupture : Courroie, Écrou, Joint.');
  });
  it('the part comes back with the equipment', () => {
    const back = cabinet(parts(), { equipments: { ...eqs, eq3: { ...eqs.eq3, retiredAt: undefined } }, ...classC });
    expect(followedSpares(back).map(x => x.id)).toEqual(['a', 'b', 'e', 'c', 'd']);
    expect(spareTodos(back, now).map(x => [x.id, x.who])).toEqual([['order-late:a', 'Zoé'], ['expiry:a', 'Zoé'], ['order:b', 'Zoé'], ['order:e', ''], ['order:c', ''], ['order:d', 'Zoé']]);   // Courroie lists eq3 first: back in service, its manager answers again
    expect(spareFacts(back, now).map(x => x.key)).toEqual(['spare-out', 'spare-late', 'spare-expiry', 'spare-supplier']);
  });
  it('the one who answers is the first manager in service, even when the first equipment has none', () => {
    const x = cabinet([sp({ id: 'a', ...counted, stock: 0, equipmentIds: ['eq5', 'eq2'] })], { equipments: { eq2: eqs.eq2, eq5: eq({ id: 'eq5', manager: '' }) } });
    expect(spareTodos(x, now)[0].who).toBe('Karim T.');
  });
  it('the supplier fact and the key do not follow a part of retired equipment either', () => {
    const only = cabinet([sp({ id: 'a', ...counted, name: 'Bague', equipmentIds: ['eq3'], stock: 5, supplier: 'Hydro-Parts' })], { equipments: eqs, ...classC, params: { ...st().params, maint: { keyHolder: 'Julien P.' } }, people: { p: person('Julien P.', '2026-09-20', '2026-09-30') } });
    expect(spareFacts(only, now)).toEqual([]);
    expect(spareTodos(only, now)).toEqual([]);
  });
});

describe('lot 1, 3.21 numbers that are not numbers', () => {
  it('a count of NaN leaves the stock and the movements as they are, and still stamps the count', () => {
    const x = countSpare(sp({ stock: 3, moves: [] }), 'Julien P.', '2026-09-25', NaN);
    expect(x).toMatchObject({ stock: 3, moves: [], countedAt: '2026-09-25', countedBy: 'Julien P.' });
    expect(countSpare(sp({ stock: 3 }), 'A', '2026-09-25', Infinity).stock).toBe(3);
    expect(countSpare(sp({ stock: 3 }), 'A', '2026-09-25', 0).stock).toBe(0);
  });
  it('a part with no stock is read as 0', () => {
    const bare = { ...sp({ min: 2 }) } as Partial<Spare>;
    delete bare.stock;
    expect(spareLevel(bare as Spare)).toBe('out');
    const taken = takeOut(bare as Spare, 'A', { at: '2026-09-25T08:00' });
    expect(taken.stock).toBe(0);
    expect(taken.moves!.map(m => m.delta)).toEqual([-1]);
    expect(putBack(bare as Spare, 'A').stock).toBe(1);
    expect(countSpare(bare as Spare, 'A', '2026-09-25', 4).moves![0]).toMatchObject({ delta: 4, note: 'Compté 4 pour 0 en stock' });
  });
  it('a lead time that is not finite is unknown', () => {
    expect(leadLabel(sp({ leadDays: NaN }))).toBe('délai inconnu');
    expect(leadLabel(sp({ leadDays: Infinity }))).toBe('délai inconnu');
    expect(orderSpare(sp({ leadDays: NaN }), 1, '2026-09-20').order!.expectedAt).toBe('');
    const t = spareTodos(cabinet([sp({ countedAt: '2026-09-20', stock: 0, leadDays: NaN })]), now);
    expect(t[0].text).toBe("Commander Courroie crantée axe Z (Centre d'usinage) : en rupture");
    expect(t[0].fact).toBe("Courroie crantée axe Z (Centre d'usinage) : en rupture, aucune commande en cours");
  });
  it('a decimal stock is written with 3 decimals at most', () => {
    let x = sp({ stock: 0 });
    for (let i = 0; i < 3; i++) x = moveSpare(x, { delta: 0.1, why: 'received', by: 'A' });
    expect(x.stock).toBe(0.3);
    expect(moveSpare(sp({ stock: 0.3 }), { delta: 0.2, why: 'received', by: 'A' }).stock).toBe(0.5);
    expect(moveSpare(sp({ stock: 1 }), { delta: -0.0004, why: 'use', by: 'A' }).stock).toBe(1);
    expect(moveSpare(sp({ stock: 1 }), { delta: 1 / 3, why: 'received', by: 'A' }).stock).toBe(1.333);
    const t = spareTodos(cabinet([sp({ countedAt: '2026-09-20', stock: 0.30000000000000004, min: 1 })]), now);
    expect(t[0].text).toBe("Commander Courroie crantée axe Z (Centre d'usinage) : 0.3 en stock pour un mini de 1");
  });
  it('a movement of NaN changes nothing', () => {
    const x = sp({ stock: 2 });
    expect(moveSpare(x, { delta: NaN, why: 'use', by: 'A' })).toBe(x);
  });
  it('a reception of NaN takes the quantity ordered', () => {
    const r = receiveSpare(orderSpare(sp({ stock: 1 }), 3, '2026-09-20'), 'A', '2026-09-30', NaN);
    expect(r.stock).toBe(4);
    expect(r.order).toBeUndefined();
  });
});

describe('lot 1, every task of the cabinet carries a fact that gives no order', () => {
  const FORBIDDEN = /\b(command(?:er|ez)|compt(?:er|ez)|relanc(?:er|ez)|trait(?:er|ez)|v[ée]rifi(?:er|ez)|contact(?:er|ez)|faire|faites)\b/i;
  const s = () => cabinet([
    sp({ id: 'a', name: 'Courroie', stock: 1, leadDays: 21, countedAt: '2026-06-01' }),
    orderSpare(sp({ id: 'b', name: 'Électrovanne', stock: 0, countedAt: '2026-06-01' }), 2, '2026-09-01', '2026-09-16'),
    orderSpare(sp({ id: 'c', name: 'Joint', stock: 0, countedAt: '2026-06-01' }), 2, '2026-09-20', '2026-10-05'),
    sp({ id: 'd', name: 'Graisse', stock: 4, critical: false, expiresAt: '2026-10-20', countedAt: '2026-06-01' }),
  ], { params: { ...st().params, maint: { keyHolder: 'Julien P.' } }, people: { p: person('Julien P.', '2026-09-20', '2026-09-30') } });
  it('gives each task its fact, word for word', () => {
    const t = spareTodos(s(), now);
    expect(t.map(x => [x.id, x.fact])).toEqual([
      ['order:a', "Courroie (Centre d'usinage) : 1 en stock pour un mini de 2, aucune commande en cours, délai 21 jours"],
      ['order-late:b', "Électrovanne (Centre d'usinage) : en rupture, commandée le 01/09/2026, attendue depuis 9 jours"],
      ['expiry:d', "Graisse (Centre d'usinage) : date limite dans 25 jours"],
      ['out:c', "Joint (Centre d'usinage) : en rupture, commandée le 20/09/2026, livraison attendue le 05/10/2026"],
      ['count:cabinet', 'Armoire : plus ancien comptage d\'une pièce il y a 116 jours'],
      ['key:cabinet', "Absence de Julien P., porteur de la clé de l'armoire, sans suppléant"],
    ]);
    expect(t.every(x => typeof x.fact === 'string' && x.fact.length > 0)).toBe(true);
  });
  it('no fact holds a verb of order', () => {
    spareTodos(s(), now).forEach(x => expect(x.fact).not.toMatch(FORBIDDEN));
  });
});

describe('3.3 damaged parts are read, never fatal (V-06)', () => {
  const junk = (): unknown[] => [null, undefined, 'x', 42, [], [1]];
  const clean = () => sp({
    stock: 1, min: 2, expiresAt: addDays('2026-09-25', 10), countedAt: '2026-08-01T09:00',
    moves: [{ id: 'm1', at: '2026-07-01T08:00', by: 'A', delta: 3, why: 'start' }, use('2026-08-10T08:00'), use('2026-09-01T08:00'), use('2026-09-10T08:00')] as Spare['moves'],
  });
  const dirty = () => ({ ...clean(), moves: [...junk(), ...clean().moves!, ...junk()] }) as unknown as Spare;
  const reads = (x: Spare) => [usedLast12m(x, now), stockWeeks(x, now), spareTodos(cabinet([x]), now), spareFacts(cabinet([x]), now), lowSpares(cabinet([x])).map(y => y.id), spareLevel(x), expiresIn(x, now), activeSpares(cabinet([x])).map(y => y.id)];

  it('gives the same answers with junk among the movements as without', () => {
    expect(reads(dirty())).toEqual(reads(clean()));
    expect(usedLast12m(dirty(), now)).toBe(3);
    expect(stockWeeks(dirty(), now)).toBe(stockWeeks(clean(), now));
    expect(stockWeeks(clean(), now)).not.toBeNull();
  });
  it('writes a damaged part back without the junk: a take, a reception, a count', () => {
    expect(takeOut(dirty(), 'Bob', { at: '2026-09-25T09:00' }).moves).toHaveLength(5);
    expect(takeOut(dirty(), 'Bob', { at: '2026-09-25T09:00' }).moves!.every(m => m && typeof m === 'object')).toBe(true);
    expect(countSpare(dirty(), 'Bob', '2026-09-25T09:00', 5).moves!.map(m => m.why).slice(-1)).toEqual(['count']);
    expect(receiveSpare({ ...dirty(), order: { qty: 2, at: '2026-09-20', expectedAt: '' } }, 'Bob', '2026-09-25T09:00').stock).toBe(3);
    for (const bad of ['x', 42, {}, null]) expect(takeOut({ ...clean(), moves: bad } as unknown as Spare, 'Bob', { at: '2026-09-25T09:00' }).moves).toHaveLength(1);
    expect(() => reads({ ...clean(), moves: 'x' } as unknown as Spare)).not.toThrow();
    expect(usedLast12m({ ...clean(), moves: { 0: use('2026-09-10T08:00') } } as unknown as Spare, now)).toBe(0);
  });
  it('names a part that has neither name nor reference by what it is, and sorts it', () => {
    for (const x of [{ name: undefined, ref: undefined }, { name: null, ref: null }, { name: '', ref: '' }]) {
      const s = cabinet([{ ...sp({ stock: 0 }), ...x } as unknown as Spare, { ...sp({ id: 'sp3', stock: 0 }), ...x } as unknown as Spare, sp({ id: 'sp2', name: 'Bague' })]);
      expect(() => activeSpares(s)).not.toThrow();
      expect(JSON.stringify([spareTodos(s, now), spareFacts(s, now)])).toContain('Pièce sans nom');
      expect(JSON.stringify([spareTodos(s, now), spareFacts(s, now)])).not.toMatch(/undefined|null/);
    }
  });
  it('lets no id that names nothing through: the supplier and the equipment of a part (__proto__, constructor)', () => {
    for (const id of ['__proto__', 'constructor', 'toString']) {
      const x = sp({ supplierId: id, supplier: '', equipmentIds: [id, 'eq1'], stock: 0 });
      const s = st({ suppliers: { su1: supplier({ ratings: [rating(10, 10, 5)] }) }, spares: { sp1: x }, equipments: { eq1: eq() } });
      expect(supplierFacts(s, x)).toEqual([]);
      expect(followedSpares(s).map(y => y.id)).toEqual(['sp1']);
      expect(() => { spareTodos(s, now); spareFacts(s, now); }).not.toThrow();
      // no equipment by that name: the part serves nothing else, and the retired equipment test sees only eq1
      const retired = st({ spares: { sp1: x }, equipments: { eq1: eq({ retiredAt: '2026-09-01' }) } });
      expect(followedSpares(retired)).toEqual([]);
    }
    // by its name, the supplier is still found
    expect(supplierFacts(st({ suppliers: { su1: supplier({ ratings: [rating(10, 10, 5)] }) } }), sp({ supplier: 'Hydro-Parts' }))).toEqual(['le fournisseur est en classe C']);
  });
});

// ---- lot 0 ter, N-13: a part created lately does not make the cabinet late for its count
describe('3.3 the count of the cabinet and the parts created lately (N-13)', () => {
  // the identifier of a part made by newId holds the time of its creation, in base 36 after the prefix
  const idAt = (d: Date) => `sp_${d.getTime().toString(36)}abcd`;
  const made = (daysAgo: number, over: Partial<Spare> = {}) => sp({ id: idAt(new Date(2026, 8, 25 - daysAgo, 9, 0)), name: `Pièce ${daysAgo}`, ref: `R${daysAgo}`, ...over });
  const old = (id: string, over: Partial<Spare> = {}) => sp({ id, name: `Ancienne ${id}`, ref: id, ...over });   // an identifier that says nothing: an old part
  it('reads the creation in the identifier, else in the first movement, else nowhere', () => {
    expect(createdOf(made(10))).toBe('2026-09-15T09:00');
    const before = isoDate(new Date()), c = createdOf(newSpare(['eq1'])).slice(0, 10), after = isoDate(new Date());
    expect([before, after]).toContain(c);
    expect(createdOf(old('sp_demo_courroie'))).toBe('');
    expect(createdOf(old('sp_demo_courroie', { moves: [use('2026-05-02T10:00'), use('2026-04-01T08:00')] }))).toBe('2026-04-01T08:00');
    expect(createdOf(old('sp_abcdefgh1234'))).toBe('');    // twelve characters, but not a time of this century
    expect(createdOf(old('sp_6lbxfd0bbbbb'))).toBe('');
    expect(createdOf({ ...old('x'), id: 5 as never })).toBe('');
    expect(createdOf(old(idAt(new Date(2020, 0, 2, 9, 0))))).toBe('2020-01-02T09:00');
    expect(createdOf(old(idAt(new Date(2014, 0, 2, 9, 0))))).toBe('');   // a time that no part of this tool can have
    expect(nowLocal(new Date(2026, 8, 15, 9, 0))).toBe('2026-09-15T09:00');
  });
  it('leaves out a part never counted that was created less than the days of the count ago: 29 days (30 asked) is young, 30 is not', () => {
    const counted = old('a', { countedAt: '2026-09-20' });
    expect(countDue(cabinet([counted, made(29)]), now)).toEqual({ due: false, days: 5 });
    expect(countDue(cabinet([counted, made(30)]), now)).toEqual({ due: true, days: null });
    expect(countDue(cabinet([counted, made(0)]), now)).toEqual({ due: false, days: 5 });
    // the days of the settings are the limit
    const ten = (n: number) => cabinet([counted, made(n)], { params: { ...st().params, maint: { countDays: 10 } } });
    expect([countDue(ten(9), now).due, countDue(ten(10), now).due]).toEqual([false, true]);
    // a counted part is a counted part, young or not
    expect(countDue(cabinet([made(3, { countedAt: '2026-08-01' })]), now)).toEqual({ due: true, days: 55 });
  });
  it('has no count to do, no task and no fact, when the only parts never counted are young', () => {
    const s = cabinet([made(5), made(12)]);
    expect(countDue(s, now)).toEqual({ due: false, days: null });
    expect(spareTodos(s, now).filter(t => t.kind === 'count')).toEqual([]);
    expect(spareFacts(s, now).find(f => f.key === 'spare-count')).toBeUndefined();
    const s2 = cabinet([made(5), old('a', { countedAt: '2026-09-24' })]);
    expect(countDue(s2, now)).toEqual({ due: false, days: 1 });
  });
  it('says "never counted" only of the older parts, out of the older parts', () => {
    const s = cabinet([old('a'), old('b'), made(5), old('c', { countedAt: '2026-09-22' })]);
    expect(spareTodos(s, now).find(t => t.kind === 'count')).toMatchObject({ text: "Compter l'armoire : 2 pièces jamais comptées sur 3", fact: 'Armoire : 2 pièces jamais comptées sur 3' });
    expect(spareFacts(s, now).find(f => f.key === 'spare-count')!.text).toBe('2 pièces jamais comptées sur 3, intervalle prévu de 30 jours.');
    const all = cabinet([old('a'), made(5)]);
    expect(spareTodos(all, now).find(t => t.kind === 'count')).toMatchObject({ text: "Compter l'armoire : jamais comptée", fact: 'Armoire jamais comptée' });
    expect(spareFacts(all, now).find(f => f.key === 'spare-count')!.text).toBe("L'armoire n'a jamais été comptée.");
    // the part is counted at the next count like the others
    expect(countDue(cabinet([made(40)]), now)).toEqual({ due: true, days: null });
  });
  it('takes the days of the settings for the task and the fact too, not only for the figure', () => {
    const s = cabinet([old('a', { countedAt: '2026-09-05' }), made(15)], { params: { ...st().params, maint: { countDays: 10 } } });   // 20 days since the count; the new part, 15 days old, is older than 10
    expect(countDue(s, now)).toEqual({ due: true, days: null });
    expect(spareTodos(s, now).find(t => t.kind === 'count')).toMatchObject({ text: "Compter l'armoire : 1 pièce jamais comptée sur 2", fact: 'Armoire : 1 pièce jamais comptée sur 2' });
    expect(spareFacts(s, now).find(f => f.key === 'spare-count')!.text).toBe('1 pièce jamais comptée sur 2, intervalle prévu de 10 jours.');
    // under the default 30 days the same cabinet leaves the new part out, and says the oldest count
    const thirty = cabinet([old('a', { countedAt: '2026-08-20' }), made(15)]);
    expect(spareTodos(thirty, now).find(t => t.kind === 'count')!.text).toBe("Compter l'armoire : plus ancien comptage d'une pièce il y a 36 jours");
  });
  it('reads a count date that is a list holding a date as no date, and a minimum that is not a number as none', () => {
    expect(countDue(cabinet([old('a', { countedAt: ['2026-09-24'] as never })]), now)).toEqual({ due: true, days: null });
    expect(countDue(cabinet([old('a', { countedAt: '2026-09-24' })]), now)).toEqual({ due: false, days: 1 });
    for (const min of ['x', [], {}, null, true, undefined] as unknown[]) expect(spareLevel(sp({ min: min as never, stock: 0 })), `min = ${JSON.stringify(min)}`).toBe('min');   // no minimum: at the minimum of 0
    expect(spareLevel(sp({ min: 'x' as never, stock: 2 }))).toBe('ok');
  });
  it('does not count a movement whose quantity is a text, and reads equipment that is not a list as none', () => {
    const odd = sp({ moves: [{ id: 'm1', at: '2026-09-20T08:00', by: 'A', delta: '-1' as never, why: 'use' }, { id: 'm2', at: '2026-09-21T08:00', by: 'A', delta: -2, why: 'use' }] });
    expect(usedLast12m(odd, now)).toBe(2);
    for (const ids of ['x', {}, 5, null] as unknown[]) {
      const s = cabinet([sp({ equipmentIds: ids as never })]);
      expect(sparesOf(s, 'eq1')).toEqual([]);
      expect(followedSpares(s).map(x => x.id)).toEqual(['sp1']);   // it serves nothing: it stays in the cabinet
    }
  });
  it('reads a count limit or a count date that is not the right type as the default ones', () => {
    const s = cabinet([old('a', { countedAt: [] as never }), old('b', { countedAt: '2026-09-20' })], { params: { ...st().params, maint: { countDays: 'x' as never } } });
    expect(countDue(s, now)).toEqual({ due: true, days: null });   // a count date that is not a date: never counted
    expect(countDue(cabinet([old('b', { countedAt: '2026-09-01' })], { params: { ...st().params, maint: { countDays: 'x' as never } } }), now)).toEqual({ due: false, days: 24 });
    expect(countDue(cabinet([old('b', { countedAt: '2026-08-20' })], { params: { ...st().params, maint: { countDays: 'x' as never } } }), now)).toEqual({ due: true, days: 36 });
  });
});
