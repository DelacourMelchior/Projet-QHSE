// Tools 3.1 to 3.4: supplier classes, 48 h claim, living standard, Monday routine and survival cabinet, 95/5 acceptance.
import { describe, expect, it } from 'vitest';
import type { Debit, Delivery, Equipment, State } from './types';
import {
  anomalies, classOf, debitAmount, debitState, deliveryInsights, deliveryState, equipmentInsights, inspectionState, lowParts, ncsSinceVersion, newDebit,
  newDelivery, newEquipment, newSop, ratingScore, routineRate, split, supplierInsights, supplierSummary,
} from './operations';
import { operationsExamples } from './operationsExamples';
import { debitPdf, pvPdf, routinePdf } from './operationsPdf';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { newNc } from './quality';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});

describe('3.1 suppliers and debit notes', () => {
  it('scores out of 100 and sorts in A, B, C', () => {
    expect(ratingScore({ quality: 38, delay: 37, service: 18 })).toBe(93);
    expect(classOf(85)).toBe('A');
    expect(classOf(84)).toBe('B');
    expect(classOf(70)).toBe('B');
    expect(classOf(69)).toBe('C');
  });
  it('claims within 48 h, then follows the credit note', () => {
    const d = (over: Partial<Debit> = {}): Debit => ({ ...newDebit(st(), 's', now), ...over });
    expect(debitState(d({ date: '2026-09-24' }), now)).toBe('to_send');
    expect(debitState(d({ date: '2026-09-22' }), now)).toBe('late');
    expect(debitState(d({ date: '2026-09-22', sentAt: '2026-09-23' }), now)).toBe('waiting');
    expect(debitState(d({ sentAt: '2026-09-23', answer: 'accepted' }), now)).toBe('accepted');
    expect(debitState(d({ sentAt: '2026-09-23', answer: 'accepted', recovered: 300 }), now)).toBe('recovered');
    expect(debitAmount(d({ reworkHours: 4.5, otherCost: 100 }), st().params)).toBe(4.5 * 55 + 100);
  });
  it('sums what was claimed and recovered this year', () => {
    const s = st(operationsExamples(now));
    const sm = supplierSummary(s, now);
    expect(sm.recovered).toBe(1250);
    expect(sm.ratePct).toBe(Math.round(1250 / sm.claimed * 100));
    expect(sm.inC).toBe(1);
    expect(supplierInsights(s, now).map(i => i.key)).toEqual(expect.arrayContaining(['late', 'bl', 'c', 'acc']));
  });
});

describe('3.2 living standard', () => {
  it('asks for a new version when a defect is declared at the workstation after the current one', () => {
    const sop = { ...newSop('P3', now), poste: 'Presse plieuse', versionDate: '2026-09-01' };
    const s = st({ ncs: { a: { ...newNc(st(), 'x', now), id: 'a', where: 'presse plieuse ', at: '2026-09-10T08:00' }, b: { ...newNc(st(), 'x', now), id: 'b', where: 'Presse plieuse', at: '2026-08-10T08:00' } } });
    expect(ncsSinceVersion(s, sop).map(n => n.id)).toEqual(['a']);
  });
});

describe('3.3 Monday routine and survival cabinet', () => {
  const eq = (over: Partial<Equipment> = {}): Equipment => ({ ...newEquipment(), name: 'CNC', ...over });
  const insp = (date: string, ko: number[] = []) => ({ date, by: 'J', note: '', results: [0, 1, 2, 3, 4].map(i => (ko.includes(i) ? 'ko' as const : 'ok' as const)) });
  it('expects an inspection every week', () => {
    expect(inspectionState(eq(), now)).toBe('never');
    expect(inspectionState(eq({ inspections: [insp('2026-09-21')] }), now)).toBe('ok');
    expect(inspectionState(eq({ inspections: [insp('2026-09-15')] }), now)).toBe('due');
    expect(inspectionState(eq({ inspections: [insp('2026-09-01')] }), now)).toBe('late');
  });
  it('keeps the anomalies of the last inspection only, and the parts under the minimum', () => {
    expect(anomalies(eq({ inspections: [insp('2026-09-14', [1]), insp('2026-09-21', [4])] })).map(c => c.label)).toEqual(["Arrêts d'urgence et carters"]);
    expect(anomalies(eq({ inspections: [insp('2026-09-14', [1]), insp('2026-09-21')] }))).toEqual([]);
    expect(lowParts(eq({ parts: [{ name: 'A', ref: '', supplier: '', leadTime: '', min: 2, stock: 1 }, { name: 'B', ref: '', supplier: '', leadTime: '', min: 1, stock: 1 }] })).map(p => p.name)).toEqual(['A']);
    expect(routineRate(eq({ inspections: [insp('2026-09-21'), insp('2026-09-14'), insp('2026-09-13')] }), now)).toBe(17);   // 2 weeks out of 12
  });
  it('example raises the expected messages', () => {
    expect(equipmentInsights(st(operationsExamples(now)), now).map(i => i.key)).toEqual(expect.arrayContaining(['low', 'ano', 'late']));
  });
});

describe('3.4 milestones and acceptance', () => {
  const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(), ref: 'CMD-1', ...over });
  const ok = (d: Delivery, oks: (boolean | null)[]) => d.milestones.map((m, i) => ({ ...m, ok: oks[i] }));
  it('goes from milestones to release to acceptance', () => {
    const d = dl();
    expect(deliveryState(d, now)).toBe('in_progress');
    expect(deliveryState(dl({ milestones: ok(d, [true, false, null, null]) }), now)).toBe('blocked');
    expect(deliveryState(dl({ milestones: ok(d, [true, true, true, true]) }), now)).toBe('to_release');
    expect(deliveryState(dl({ milestones: ok(d, [true, true, true, true]), releasedAt: '2026-09-20' }), now)).toBe('released');
    expect(deliveryState(dl({ reception: { ...d.reception, result: 'sans' } }), now)).toBe('accepted');
  });
  it('holds at most the retention until the reservation is lifted within 7 days', () => {
    const d = dl();
    const res = (date: string, pct: number, lifted = '') => dl({ reception: { ...d.reception, date, result: 'reserve', reserve: 'Poignée', retentionPct: pct, amount: 10000, liftedAt: lifted } });
    expect(deliveryState(res('2026-09-20', 5), now)).toBe('reserve');
    expect(deliveryState(res('2026-09-10', 5), now)).toBe('reserve_late');
    expect(deliveryState(res('2026-09-10', 5, '2026-09-15'), now)).toBe('lifted');
    expect(split(res('2026-09-20', 5))).toEqual({ now: 9500, held: 500, pct: 5 });
    expect(split(res('2026-09-10', 5, '2026-09-15'))).toEqual({ now: 10000, held: 0, pct: 0 });
    expect(deliveryInsights(st({ deliveries: { a: res('2026-09-10', 10) } }), now).map(i => i.key)).toEqual(expect.arrayContaining(['late', 'over', 'held']));
  });
});

describe('documents', () => {
  it('writes valid PDF files', () => {
    const ex = operationsExamples(now);
    const s = st(ex);
    const o = { company: 'Atelier é', date: now };
    for (const pdf of [debitPdf(s, ex.debits.deb_demo_1, o), routinePdf(ex.equipments.eq_demo_cnc, o), pvPdf(ex.deliveries.dl_demo_2, o)]) {
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    }
  });
});
