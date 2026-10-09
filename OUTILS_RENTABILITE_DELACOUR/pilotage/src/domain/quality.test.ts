// Tools 5.1 to 5.4: 24 h decision, cost and imputation, five whys states, day-30 check; storage of the new records.
import { describe, expect, it } from 'vitest';
import type { Action, Analysis, Nc, Poka, State } from './types';
import {
  analysisActionEffectiveness, analysisState, blamesPerson, cnqMonth, compensatingRevenue, ncCost, ncOrderFocus, ncState, newAnalysis, newNc, newPoka, pokaState, qualityInsights, slowActions, weakAction, workshopOfNc, workshopsToOpen,
} from './quality';
import { qualityExamples } from './qualityExamples';
import { analysisPdf, labelsPdf, pokaPdf } from './qualityPdf';
import { emptyTools, nextRef } from './base';
import { DEFAULT_SCALE } from './risk';
import { feeds } from './feeds';
import { normalize } from './migrate';
import { demoState } from './templates';
import { bucketOf, flatten, unflatten } from '../store/flat';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const nc = (p: Partial<Nc> = {}): Nc => ({ ...newNc(st(), 'Lucie', now), id: 'n1', ...p });
const act = (p: Partial<Action> = {}): Action => ({
  id: 'a1', kpiId: '', ref: { kind: 'analysis', id: 'an1' }, period: '2026-09', createdAt: '2026-09-10', constat: '', whys: [], plan: [{ dim: 'materiel', text: 'Butée', pilot: '' }],
  pilot: 'Marc', deadline: '2026-09-15', cost: null, status: 'in_progress', closedAt: '', ...p,
});

describe('5.1 red bin', () => {
  it('numbers records per year and follows the 24 h rule', () => {
    expect(nextRef('NC', [{ ref: 'NC-2026-007' }, { ref: 'NC-2025-044' }], now)).toBe('NC-2026-008');
    expect(ncState(nc({ at: '2026-09-25T08:00' }), now)).toBe('quarantine');
    expect(ncState(nc({ at: '2026-09-24T09:59' }), now)).toBe('late');
    expect(ncState(nc({ at: '2026-09-20T08:00', decision: 'rebut' }), now)).toBe('decided');
  });
  it('costs material, lost and rework hours at the hourly rate, logistics', () => {
    const s = st();
    expect(ncCost(nc({ cost: { scrap: 480, lostHours: 4.5, reworkHours: 6, logistics: 190 } }), s.params)).toBeCloseTo(480 + 10.5 * 55 + 190);
    expect(ncCost(nc(), s.params)).toBe(0);
    expect(compensatingRevenue(1000, 5)).toBe(20000);
  });
});

describe('5.2 cost of non-quality', () => {
  it('adds red-bin records, complaints and debit notes of the month, without counting a linked debit twice', () => {
    const s = st({
      ncs: { n1: nc({ at: '2026-09-02T10:00', processId: 'P3', cost: { scrap: 100, lostHours: null, reworkHours: 2, logistics: null } }), n2: nc({ id: 'n2', at: '2026-08-30T10:00', cost: { scrap: 999, lostHours: null, reworkHours: null, logistics: null } }) },
      complaints: { c1: { id: 'c1', ref: 'R-2026-001', at: '2026-09-05T09:00', client: 'A', affaire: '', channel: '', receivedBy: '', description: 'Retard', severity: 'mineure', processId: '', contactedAt: '', immediate: '', pilot: '', cost: 300, resolvedAt: '', courtesyAt: '' } },
      debits: {
        d1: { id: 'd1', ref: 'DEB-2026-001', supplierId: '', date: '2026-09-10', bl: '', reserveOnBl: true, defect: 'Rayures', reworkHours: 1, otherCost: 50, sentAt: '', answer: '', recovered: 80, recoveredAt: '2026-09-20' },
        d2: { id: 'd2', ref: 'DEB-2026-002', supplierId: '', date: '2026-09-11', bl: '', reserveOnBl: true, defect: 'Déjà au bac rouge', reworkHours: 5, otherCost: 500, sentAt: '', answer: '', recovered: null, recoveredAt: '', ncId: 'n1' },
      },
    });
    const m = cnqMonth(s, '2026-09');
    expect(m.total).toBe(210 + 300 + 105);
    expect(m.byProcess.P3).toBe(210 + 105);
    expect(m.byProcess['']).toBe(300);
    expect(m.unqualified).toBe(1);
    expect(m.recovered).toBe(80);
    expect(m.hours).toBe(3);
  });
  it('keeps the amounts of a process that no longer exists under "À qualifier"', () => {
    const s = st({ ncs: { n9: nc({ id: 'n9', at: '2026-09-02T10:00', processId: 'P9', cost: { scrap: 100, lostHours: null, reworkHours: null, logistics: null } }), n3: nc({ id: 'n3', at: '2026-09-03T10:00', processId: 'P3', cost: { scrap: 50, lostHours: null, reworkHours: null, logistics: null } }) } });
    const m = cnqMonth(s, '2026-09');
    expect(m.byProcess).toMatchObject({ '': 100, P3: 50 });
    expect(Object.values(m.byProcess).reduce((a, b) => a + b, 0)).toBe(m.total);
  });
  it('offers the computed figure to the monthly dashboard, never writes it', () => {
    const d = demoState(now);
    Object.assign(d, qualityExamples(now));
    const f = feeds(d, '2026-09', now).find(x => x.kpi.id === 'kpi_cnq');
    expect(f?.value).toBe(cnqMonth(d, '2026-09').total);
    expect(d.values.kpi_cnq?.['2026-09']).not.toBe(f?.value);
  });
});

describe('5.3 five whys', () => {
  const an = (p: Partial<Analysis> = {}): Analysis => ({ ...newAnalysis(st(), { kind: 'free', id: '' }, 'Inversion', 'P3', now), id: 'an1', ...p });
  it('refuses a root cause that points at a person, flags weak actions', () => {
    expect(blamesPerson("L'opérateur a manqué d'attention")).toBe(true);
    expect(blamesPerson('Erreur humaine')).toBe(true);
    expect(blamesPerson('Aucun détrompeur sur le connecteur')).toBe(false);
    expect(weakAction('Rappeler aux peintres de faire attention')).toBe(true);
    expect(weakAction('Poser une butée crantée')).toBe(false);
  });
  it('moves from cause to countermeasure to checked effectiveness', () => {
    const a = an();
    expect(analysisState(st({ analyses: { an1: a } }), a, now)).toBe('draft');
    const b = an({ rootCause: 'Butée sans cran' });
    expect(analysisState(st({ analyses: { an1: b } }), b, now)).toBe('to_act');
    expect(analysisState(st({ analyses: { an1: b }, actions: { a1: act() } }), b, now)).toBe('running');
    expect(analysisState(st({ analyses: { an1: b }, actions: { a1: act({ status: 'done', closedAt: '2026-09-12' }) } }), b, now)).toBe('to_check');
    const ok: Poka = { ...newPoka(b), id: 'p1', installedAt: '2026-08-01', check: { date: '2026-09-01', produced: 400, defects: 0, inPlace: true, cadenceOk: true, note: '', by: '' } };
    const s = st({ analyses: { an1: b }, actions: { a1: act({ status: 'done', closedAt: '2026-08-01' }) }, pokas: { p1: ok } });
    expect(analysisState(s, b, now)).toBe('effective');
    expect(analysisActionEffectiveness(s, act({ status: 'done', closedAt: '2026-08-01' }), now)).toEqual({ state: 'effective', date: '2026-09-01' });
    const ko = { ...ok, check: { ...ok.check!, defects: 2 } };
    expect(analysisState({ ...s, pokas: { p1: ko } }, b, now)).toBe('failed');
  });
  it('warns when a countermeasure is later than 7 working days', () => {
    const a = an({ date: '2026-09-01', rootCause: 'x' });
    expect(slowActions(st({ actions: { a1: act({ deadline: '2026-09-10' }) } }), a)).toHaveLength(0);
    expect(slowActions(st({ actions: { a1: act({ deadline: '2026-09-20' }) } }), a)).toHaveLength(1);
  });
});

describe('5.4 mistake-proofing', () => {
  const pk = (p: Partial<Poka> = {}): Poka => ({ ...newPoka(null), id: 'p1', defect: 'Inversion', ...p });
  it('checks on the ground 30 days after installation', () => {
    expect(pokaState(pk(), now)).toBe('to_install');
    expect(pokaState(pk({ installedAt: '2026-09-10' }), now)).toBe('running');
    expect(pokaState(pk({ installedAt: '2026-08-26' }), now)).toBe('due');
    expect(pokaState(pk({ installedAt: '2026-08-01', check: { date: '2026-09-01', produced: 10, defects: 0, inPlace: false, cadenceOk: true, note: '', by: '' } }), now)).toBe('failed');
  });
});

describe('examples, messages, documents, storage', () => {
  it('example is consistent and raises the expected messages', () => {
    const s = st(qualityExamples(now));
    const keys = qualityInsights(s, '2026-09', now).map(i => i.key);
    expect(keys).toEqual(expect.arrayContaining(['late', 'unq', 'j30']));
    Object.values(s.ncs).forEach(n => { if (n.analysisId) expect(s.analyses[n.analysisId]).toBeTruthy(); });
  });
  it('writes valid PDF files', () => {
    const s = st(qualityExamples(now));
    const o = { company: 'Entreprise é', date: now };
    for (const pdf of [labelsPdf(Object.values(s.ncs), o), analysisPdf(s, s.analyses.an_demo_1, o), pokaPdf(s, s.pokas.pk_demo_1, o)]) {
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    }
  });
  it('stores each record under its own key; quote costs in the direction folder', () => {
    const s = st({ ...qualityExamples(now) });
    s.quotes.q1 = { id: 'q1', ref: 'DEV-2026-001', client: 'A', object: '', date: '2026-09-01', amount: 1000, weeks: 2, locks: [], visas: { commercial: { by: '', date: '' }, technical: { by: '', date: '' }, direction: { by: '', date: '' } }, derogation: '', depositReceived: false, status: 'draft', sentAt: '', followedAt: '', decidedAt: '', lostReason: '', cost: { material: 300, hours: 2, subcontract: null, other: null } };
    const m = flatten(s);
    expect(m['nc|nc_demo_1']).toBeTruthy();
    expect(m['quote|q1']).not.toHaveProperty('cost');
    expect(bucketOf('quotecost|q1', s)).toBe('direction');
    expect(bucketOf('nc|nc_demo_1', s)).toBe('equipe');
    const back = unflatten(JSON.parse(JSON.stringify(m)));
    expect(back.quotes.q1.cost).toEqual(s.quotes.q1.cost);
    expect(Object.keys(back.ncs)).toHaveLength(Object.keys(s.ncs).length);
    expect(back.params.hourlyRate).toBe(55);
  });
  it('data saved before tools 2 to 5 get empty registers', () => {
    const old = st();
    const legacy = { ...old } as Partial<State>;
    delete legacy.ncs; delete legacy.params; delete legacy.ged;
    const s = normalize(legacy as State);
    expect(s.ncs).toEqual({});
    expect(s.params.marginFloorPct).toBe(30);
    expect(s.ged.folders).toHaveLength(5);
  });
});

describe('5.3 workshops suggested for the defects declared from an order of 3.4 (L-15, L-20)', () => {
  // a defect of a milestone names the deliverable of its order in `where`: not a workstation
  const fromOrder = (id: string, over: Partial<Nc> = {}): Nc => nc({ id, ref: id, where: 'Châssis', at: '2026-09-20T09:00', deliveryId: 'dl', milestoneId: `ms_${id}`, ...over });

  it('does not call defects of one order "similar at the same workstation", but still does for defects declared at a workstation', () => {
    const s = st({ ncs: { a: fromOrder('a', { description: 'Rayure' }), b: fromOrder('b', { description: 'Étiquette absente' }), c: fromOrder('c', { description: 'Cote hors tolérance' }) } });
    expect(workshopsToOpen(s, now)).toEqual([]);                                                              // it said 3 times "3 défauts semblables au même poste" before
    const bin = (id: string) => nc({ id, ref: id, where: 'Soudure 2', at: '2026-09-20T09:00' });
    expect(workshopsToOpen(st({ ncs: { a: bin('a'), b: bin('b'), c: bin('c') } }), now).map(x => x.why)).toEqual(Array(3).fill('3 défauts semblables au même poste en 90 jours'));
  });

  it('stops suggesting a workshop for the defect of a reservation once it has a decision, and keeps doing it for the others', () => {
    const reserve = (over: Partial<Nc> = {}) => fromOrder('r', { milestoneId: undefined, reserveId: 'rv', origin: 'client', ...over });
    expect(workshopsToOpen(st({ ncs: { r: reserve() } }), now).map(x => x.why)).toEqual(['défaut vu par le client']);        // seen by the customer, nothing decided
    expect(workshopsToOpen(st({ ncs: { r: reserve({ decision: 'retouche', decidedAt: '2026-09-21T09:00', decidedBy: 'Marc' }) } }), now)).toEqual([]);
    expect(workshopsToOpen(st({ ncs: { r: reserve({ decision: 'attente' }) } }), now)).toHaveLength(1);                      // waiting for the customer: not decided
    expect(workshopsToOpen(st({ ncs: { x: nc({ id: 'x', origin: 'client', decision: 'retouche', decidedAt: '2026-09-21T09:00', decidedBy: 'Marc' }) } }), now)).toHaveLength(1);   // a defect of the customer that is not a reservation of 3.4
    expect(workshopsToOpen(st({ ncs: { r: reserve({ analysisId: 'an' }) } }), now)).toEqual([]);                             // a workshop is open
  });

  it('opens the order on the reservation of the defect, whichever delivery holds it', () => {
    expect(ncOrderFocus({ deliveryId: 'dl', reserveId: 'rv' })).toBe('dl:reception:rv');                          // the tab lists the reservations of every delivery
    expect(ncOrderFocus({ deliveryId: 'dl', milestoneId: 'ms' })).toBe('dl:milestones');
    expect(ncOrderFocus({ deliveryId: 'dl' })).toBe('dl');
    expect(ncOrderFocus({})).toBe('');
  });

  it('gives the workshop already opened for a defect, else a new one that carries the defect', () => {
    const n = fromOrder('n', { description: 'Fuite au raccord', by: 'Luc', decidedBy: 'Marc', processId: 'P3' });
    const s = st({ ncs: { n } });
    const w = workshopOfNc(s, n, now);
    expect(w.isNew).toBe(true);
    expect(w.a).toMatchObject({ problem: 'Fuite au raccord', source: { kind: 'nc', id: 'n' }, participants: 'Luc, Marc', processId: 'P3' });
    const open = { ...w.a, id: 'an1' };
    const again = workshopOfNc(st({ ncs: { n: { ...n, analysisId: 'an1' } }, analyses: { an1: open } }), { ...n, analysisId: 'an1' }, now);
    expect(again).toEqual({ a: open, isNew: false });
    expect(workshopOfNc(st({ ncs: { n } }), { ...n, analysisId: '__proto__' }, now).isNew).toBe(true);           // an address is never a key
  });
});
