// Tools 2.1 to 2.4: margin lock and visas, follow-up, change orders, 48 h call back, flash review.
import { describe, expect, it } from 'vitest';
import type { Change, Complaint, Feedback, Quote, State } from './types';
import {
  agreementMessage, changeState, complaintState, complaintStats, contactDelay, feedbackState, isNegative, maxDiscount, newChange, newComplaint, newFeedback, newQuote, nps,
  priceLadder, quoteHourMargin, quoteInsights, quoteIssues, quoteMargin, quoteState, quoteStats, startedWithout,
} from './commercial';
import { commercialExamples } from './commercialExamples';
import { changePdf, quotePdf } from './commercialPdf';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { feeds } from './feeds';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: 'Atelier', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const P = st().params;
const ready = (over: Partial<Quote> = {}): Quote => ({
  ...newQuote(st(), now), client: 'A', amount: 8000, locks: Array.from({ length: 5 }, () => ({ state: 'ok' as const, note: '', by: 'David' })),
  cost: { material: 3000, hours: 20, subcontract: 500, other: null }, ...over,
});

describe('2.1 quotes', () => {
  it('computes the margin with hours at the hourly cost', () => {
    const m = quoteMargin(ready(), P)!;
    expect(m.value).toBe(8000 - 3000 - 1100 - 500);
    expect(Math.round(m.pct)).toBe(43);
    expect(quoteMargin(ready({ cost: undefined }), P)).toBeNull();
  });
  it('blocks the offer: unchecked lock, blocking lock, reservation without text, margin under the floor, missing visas', () => {
    expect(quoteIssues(ready(), P)).toEqual([]);
    expect(quoteState(ready(), P, now)).toBe('ready');
    const q = ready({ locks: [{ state: '', note: '' }, { state: 'ko', note: 'Plieuse saturée' }, { state: 'reserve', note: '' }, { state: 'ok', note: '' }, { state: 'ok', note: '' }] });
    expect(quoteIssues(q, P)).toHaveLength(5);                          // + P3 and P5 locks without 'checked with'
    const low = ready({ amount: 5000 });
    expect(quoteIssues(low, P)[0]).toMatch(/plancher/);
    expect(quoteIssues({ ...low, derogation: 'Jean-Marc, client stratégique' }, P)).toEqual([]);
    expect(quoteIssues(low, P, false)).toEqual([]);                           // team view: the margin is not judged
    const big = ready({ amount: 20000 });
    expect(quoteIssues(big, P).join()).toMatch(/Visa/);
    expect(quoteIssues({ ...big, visas: { commercial: { by: 'L', date: '' }, technical: { by: 'D', date: '' }, direction: { by: 'J', date: '' } } }, P)).toEqual([]);
  });
  it('asks for a follow-up after 7 days without news and measures conversion', () => {
    expect(quoteState(ready({ status: 'sent', sentAt: '2026-09-20' }), P, now)).toBe('sent');
    expect(quoteState(ready({ status: 'sent', sentAt: '2026-09-10' }), P, now)).toBe('to_follow');
    expect(quoteState(ready({ status: 'sent', sentAt: '2026-09-10', followedAt: '2026-09-22' }), P, now)).toBe('sent');
    const s = st({ quotes: {
      a: ready({ id: 'a', status: 'won', sentAt: '2026-09-02', decidedAt: '2026-09-15', amount: 10000 }),
      b: ready({ id: 'b', status: 'lost', sentAt: '2026-08-02', decidedAt: '2026-08-20' }),
      c: ready({ id: 'c', status: 'sent', sentAt: '2026-09-05', amount: 3000 }),
    } });
    const x = quoteStats(s, '2026-09', now);
    expect(x).toMatchObject({ sentCount: 2, sentAmount: 13000, wonCount: 1, wonAmount: 10000, conversionPct: 50, toFollow: 1, pendingAmount: 3000 });
  });
  it('warns about a won order without deposit', () => {
    const s = st({ quotes: { a: ready({ status: 'won', decidedAt: '2026-09-20' }) } });
    expect(quoteInsights(s, now).map(i => i.key)).toContain('deposit');
  });
});

describe('2.1 price ladder', () => {
  const P40 = { ...P, overheadPct: 40 };
  it('gives the price to ask and the prices under which the quote stops paying', () => {
    const l = priceLadder(ready(), P40, 5, 3)!;                        // direct cost: 3 000 + 500 + 20 h at 55 = 4 600
    expect(l.complete).toBeCloseTo(6440, 5);                           // plus 40 % of overheads
    expect(l.floor).toBeCloseTo(4600 / 0.7, 5);                        // gross margin floor of 30 %
    expect(l.target).toBeCloseTo(6440 / 0.95, 5);                      // complete cost, then 5 % of net margin
    expect(l.variable).toBe(3000 + 500 + 20 * 3);                      // materials, subcontracting, what the machines consume: pay is fixed
    expect(priceLadder(ready({ cost: undefined }), P40, 5)).toBeNull();
    expect(priceLadder(ready({ cost: { material: null, hours: null, subcontract: null, other: 4600 } }), P40, 5)!.variable).toBeNull();   // express control: a total cost cannot be split
  });
  it('aims at the margin given, before tax', () => {
    expect(priceLadder(ready(), P40, 8)!.target).toBeCloseTo(6440 / 0.92, 5);
    expect(priceLadder(ready(), P40, 100)!.target).toBeNull();
  });
  it('gives the margin per hour of a quote: price less variable costs, over the hours', () => {
    expect(quoteHourMargin(ready(), 3)).toBe((8000 - (3000 + 500 + 20 * 3)) / 20);                                                         // 222 €/h
    expect(quoteHourMargin(ready({ cost: { material: null, hours: null, subcontract: null, other: 4600 } }), 3)).toBeNull();             // express control
    expect(quoteHourMargin(ready({ cost: { material: 3000, hours: null, subcontract: null, other: null } }), 3)).toBeNull();             // no hours
    expect(quoteHourMargin(ready({ amount: null }), 3)).toBeNull();
  });
  it('gives the largest discount that stays above the floor and above the complete cost, by half points', () => {
    const l = priceLadder(ready(), P40, 5)!;                           // floor 6 571, above the complete cost of 6 440
    expect(maxDiscount(8000, l)).toBe(17.5);
    expect(maxDiscount(6571, l)).toBe(0);                              // already at the floor
    expect(maxDiscount(null, l)).toBe(0);
    const heavy = priceLadder(ready(), { ...P, overheadPct: 60 }, 5)!; // complete cost 7 360, above the floor: it limits
    expect(maxDiscount(8000, heavy)).toBe(8);
  });
  it('warns about the offers under the complete cost, in management view only', () => {
    const s = st({ params: P40, quotes: {
      a: ready({ id: 'a', ref: 'DEV-A', amount: 6000 }),
      b: ready({ id: 'b', ref: 'DEV-B', amount: 8000 }),
      c: ready({ id: 'c', ref: 'DEV-C', amount: 6000, status: 'won', decidedAt: '2026-09-20', depositReceived: true }),
    } });
    const w = quoteInsights(s, now).find(i => i.key === 'belowcost')!;
    expect(w.text).toContain('DEV-A (A)');
    expect(w.text).not.toMatch(/DEV-B|DEV-C/);
    expect(quoteInsights(s, now, false).map(i => i.key)).not.toContain('belowcost');
  });
  it('weights the average margin of the won quotes by their amounts', () => {
    const won = (id: string, amount: number, material: number) => ready({ id, status: 'won', decidedAt: '2026-09-10', amount, cost: { material, hours: null, subcontract: null, other: null } });
    const s = st({ quotes: { big: won('big', 10000, 9000), small: won('small', 1000, 600) } });
    expect(quoteStats(s, '2026-09', now).avgMarginPct).toBeCloseTo((1000 + 400) / 11000 * 100, 5);   // 12.7 %, not the 25 % of the plain average
  });
});

describe('2.2 change orders', () => {
  const c = (over: Partial<Change> = {}): Change => ({ ...newChange(st(), now), client: 'A', description: 'Peinture', ...over });
  it('moves from price to agreement to invoice', () => {
    expect(changeState(c())).toBe('to_price');
    expect(changeState(c({ price: 850 }))).toBe('to_send');
    expect(changeState(c({ price: 850, sentAt: '2026-09-20' }))).toBe('waiting');
    expect(changeState(c({ price: 850, answer: 'accepted', answeredAt: '2026-09-21' }))).toBe('accepted');
    expect(changeState(c({ price: 850, answer: 'accepted', answeredAt: '2026-09-21', invoicedAt: '2026-09-24' }))).toBe('invoiced');
  });
  it('flags work started before the written agreement', () => {
    expect(startedWithout(c({ startedAt: '2026-09-20' }))).toBe(true);
    expect(startedWithout(c({ startedAt: '2026-09-20', answer: 'accepted', answeredAt: '2026-09-21' }))).toBe(true);
    expect(startedWithout(c({ startedAt: '2026-09-22', answer: 'accepted', answeredAt: '2026-09-21' }))).toBe(false);
  });
  it('writes a short message answered by OK', () => {
    const m = agreementMessage(c({ price: 1450, delayDays: 3, askedBy: 'M. Durand', affaire: '2026-04' }), 'Atelier');
    expect(m).toMatch(/1\s450 € HT/);
    expect(m).toMatch(/3 jours/);
    expect(m).toMatch(/« OK »/);
  });
});

describe('2.3 complaints', () => {
  const cp = (over: Partial<Complaint> = {}): Complaint => ({ ...newComplaint(st(), 'Laurent', now), client: 'A', description: 'Retard', ...over });
  it('follows the 48 h rule, then the courtesy call', () => {
    expect(complaintState(cp({ at: '2026-09-24T12:00' }), now)).toBe('to_contact');
    expect(complaintState(cp({ at: '2026-09-23T09:00' }), now)).toBe('late');
    expect(complaintState(cp({ at: '2026-09-23T09:00', contactedAt: '2026-09-23T15:00' }), now)).toBe('in_progress');
    expect(contactDelay(cp({ at: '2026-09-23T09:00', contactedAt: '2026-09-23T15:00' }))).toBe(6);
    expect(complaintState(cp({ contactedAt: '2026-09-23T15:00', resolvedAt: '2026-09-24' }), now)).toBe('resolved');
    expect(complaintState(cp({ contactedAt: '2026-09-23T15:00', resolvedAt: '2026-09-24', courtesyAt: '2026-09-25' }), now)).toBe('closed');
  });
  it('counts the month, the share called back in time and the process most in cause', () => {
    const s = st({ complaints: {
      a: cp({ id: 'a', at: '2026-09-01T09:00', contactedAt: '2026-09-01T15:00', processId: 'P3', cost: 200 }),
      b: cp({ id: 'b', at: '2026-09-10T09:00', contactedAt: '2026-09-13T09:00', processId: 'P3' }),
      c: cp({ id: 'c', at: '2026-08-10T09:00', processId: 'P5' }),
    } });
    expect(complaintStats(s, '2026-09', now)).toMatchObject({ count: 2, cost: 200, within48Pct: 50, avgDelay: 39, top: { p: 'P3', n: 2 } });
    expect(feeds({ ...s, kpis: { kpi_reclamations: { id: 'kpi_reclamations', role: 'reclamations', name: 'Réclamations', processId: 'P5', type: 'Garde-fou', unit: 'litiges', direction: 'lower', aggregation: 'sum', target: '0', targetValue: 0, confidential: false, source: '' } } }, '2026-09', now)[0].value).toBe(2);
  });
});

describe('2.4 end-of-job review', () => {
  const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'A', ...over });
  it('settles the doubt before the invoice, and scores recommendation', () => {
    expect(feedbackState(f())).toBe('to_ask');
    expect(feedbackState(f({ q1: true, q2: true, q3: 9, doubt: 'Poignée' }))).toBe('doubt');
    expect(feedbackState(f({ q1: true, q2: true, q3: 9, doubt: 'Poignée', doubtSolvedAt: '2026-09-25' }))).toBe('to_invoice');
    expect(feedbackState(f({ q1: true, q2: true, q3: 9, invoicedAt: '2026-09-25' }))).toBe('done');
    expect(isNegative(f({ q1: true, q2: false, q3: 8 }))).toBe(true);
    expect(feedbackState(f({ q1: false, q2: true, q3: 5 }))).toBe('unhappy');
    expect(feedbackState(f({ q1: false, q2: true, q3: 5, complaintId: 'c' }), { complaints: { c: { courtesyAt: '2026-09-20' } as Complaint } })).toBe('to_invoice');
    expect(nps([f({ q3: 10 }), f({ q3: 9 }), f({ q3: 7 }), f({ q3: 3 })])).toBe(25);
    expect(nps([f()])).toBeNull();
  });
});

describe('examples and documents', () => {
  it('example links complaint, red bin and workshop, and gives valid PDF files', () => {
    const ex = commercialExamples(now);
    expect(ex.complaints.cp_demo_2.ncId).toBe('nc_demo_5');
    const s = st(ex);
    for (const pdf of [quotePdf(s, ex.quotes.qt_demo_2, { company: 'Atelier é', date: now, money: true }), changePdf(ex.changes.av_demo_2, { company: 'Atelier', date: now })]) {
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    }
    const text = (pdf: string) => [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m => m[1].match(/../g)!.map(h => String.fromCharCode(parseInt(h, 16))).join('')).join(' ');
    expect(text(quotePdf(s, ex.quotes.qt_demo_2, { company: '', date: now, money: true }))).toMatch(/Plancher.*Prix cible|Prix cible.*Plancher/);
    expect(text(quotePdf(s, ex.quotes.qt_demo_2, { company: '', date: now, money: false }))).not.toMatch(/Plancher|Dérogation|Prix cible/);   // team view
  });
});
