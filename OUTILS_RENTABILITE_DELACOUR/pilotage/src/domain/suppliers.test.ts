// Tool 3.1: the evaluation grid and the score, the classes, claims followed from sending to closing, facts and alerts per supplier, history,
// the links with the directory (a supplier is an organisation of the directory) and the fictitious data.
import { describe, expect, it } from 'vitest';
import type { Contact, Criterion, Debit, State, Supplier, SupplierRating } from './types';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { blankState, demoState } from './templates';
import { normalize } from './migrate';
import { allTasks } from './tasks';
import { toolBadge } from './status';
import { debitPdf } from './operationsPdf';
import { hasPlanB, sectorInsights } from './sectors';
import { applySupplierExample, completeSupplierExamples, supplierExamples } from './supplierExamples';
import {
  assessed, blankScores, itemsAverage, levelNote, onScale, weightShares, CLAIM_INSIGHT_KEYS, claimContact, claimMail, type ProposedPart, claimTrend, classDrop, classOf, DEFAULT_CRITERIA, debitAmount, debitState, followableOrgs, followOrg, isGoods, lastRating, linkSuppliers, newDebit, nextReview,
  ensureSupplierOrg, orgCategoryOf, proposedRating, ratingClass, ratingDue, ratingParts, ratingScore, statusAfter, supplierCfg, supplierContacts, supplierFacts, supplierInsights, supplierSummary, supplierTimeline, toScores,
} from './suppliers';

const now = new Date(2026, 8, 25, 10, 0);   // Friday
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: 'Atelier', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const demo = () => demoState(now);
const claim = (over: Partial<Debit> = {}): Debit => ({ ...newDebit(st(), 's', now), ...over });
const person = (p: Partial<Contact>): Contact => ({ id: 'c1', category: 'fournisseur', name: 'Anne', role: 'Commerciale', company: 'Aciers X', phone: '04 00 00 00 00', email: 'a@x.example.com', always: false, verifiedAt: '', ...p });
const part = (r: { parts: ProposedPart[] }, key: string) => r.parts.find(p => p.key === key)!;

describe('3.1 the evaluation grid and the score', () => {
  it('scores out of 100 and sorts in A, B, C', () => {
    expect(ratingScore({ quality: 38, delay: 37, service: 18 })).toBe(93);
    expect(classOf(85)).toBe('A');
    expect(classOf(84)).toBe('B');
    expect(classOf(70)).toBe('B');
    expect(classOf(69)).toBe('C');
  });
  it('starts with quality, delays, service and price, each noted out of 10, and the company changes them', () => {
    expect(supplierCfg({}).criteria.map(c => `${c.key} ${c.weight} /${c.scale}`)).toEqual(['quality 35 /10', 'delay 25 /10', 'service 20 /10', 'price 20 /10']);
    expect(supplierCfg({}).criteria.every(c => (c.items || []).length === 4)).toBe(true);   // the points to look at, to note one by one
    const own: Criterion[] = [{ key: 'quality', label: 'Qualité', weight: 50, scale: 20, auto: 'quality' }, { key: 'eco', label: 'Démarche environnementale', weight: 10, scale: 100, items: [] }];
    expect(supplierCfg({ supplier: { criteria: own } }).criteria).toMatchObject([{ key: 'quality', weight: 50, scale: 20 }, { key: 'eco', weight: 10, scale: 100, items: [] }]);
    // settings of the first version (weights in points, no scale, no items) keep their weights, and take a scale and the items of the kind
    const legacy = supplierCfg({ supplier: { criteria: [{ key: 'quality', label: 'Qualité', points: 40, auto: 'quality' } as unknown as Criterion] } }).criteria[0];
    expect(legacy).toMatchObject({ weight: 40, scale: 10 });
    expect(legacy.items).toHaveLength(4);
    // settings made when the three criteria were fixed become the grid
    expect(supplierCfg({ supplier: { max: [30, 50, 20] } }).criteria.map(c => `${c.key} ${c.weight}`)).toEqual(['quality 30', 'delay 50', 'service 20']);
    expect(DEFAULT_CRITERIA.filter(c => c.auto)).toHaveLength(3);
  });
  it('notes each criterion on its own scale, and applies the weights afterwards', () => {
    // 8 out of 10 on a criterion of weight 50, 40 out of 100 on another of weight 50: 0.8 and 0.4 of their scales, mean 60 %
    const r: SupplierRating = { date: '2026-09-01', by: '', note: '', scores: [{ key: 'a', label: 'A', points: 8, max: 10, weight: 50 }, { key: 'b', label: 'B', points: 40, max: 100, weight: 50 }] };
    expect(ratingScore(r)).toBe(60);
    // the same notes with other weights
    expect(ratingScore({ ...r, scores: [{ ...r.scores![0], weight: 75 }, { ...r.scores![1], weight: 25 }] })).toBe(70);   // 0.8 x 75 + 0.4 x 25
    // a scale of 20 and a scale of 10 are worth the same when the share of the scale is the same
    expect(ratingScore({ scores: [{ key: 'a', label: 'A', points: 15, max: 20, weight: 1 }, { key: 'b', label: 'B', points: 7.5, max: 10, weight: 1 }] })).toBe(75);
    // a criterion not assessed is left out, and its weight with it
    expect(ratingScore({ ...r, scores: [r.scores![0], { ...r.scores![1], points: null }] })).toBe(80);
    expect(weightShares([{ weight: 35 }, { weight: 25 }, { weight: 20 }, { weight: 20 }])).toEqual([35, 25, 20, 20]);
    expect(weightShares([{ weight: 1 }, { weight: 1 }])).toEqual([50, 50]);
    expect(onScale(0.713, 10)).toBe(7.1);
    expect(onScale(0.713, 20)).toBe(14.3);
    expect(onScale(0.713, 100)).toBe(71);
    expect(levelNote(75, 20)).toBe(15);
  });
  it('the note of a criterion is the mean of its items, when some were noted', () => {
    expect(itemsAverage([{ key: 'a', label: 'A', points: 9 }, { key: 'b', label: 'B', points: 10 }, { key: 'c', label: 'C', points: 9 }, { key: 'd', label: 'D', points: 9.5 }], 10)).toBe(9.4);
    expect(itemsAverage([{ key: 'a', label: 'A', points: 12 }, { key: 'b', label: 'B', points: null }], 20)).toBe(12);   // the one not noted is left out
    expect(itemsAverage([{ key: 'a', label: 'A', points: null }], 10)).toBeNull();
    expect(itemsAverage(undefined, 10)).toBeNull();
    expect(itemsAverage([{ key: 'a', label: 'A', points: 70 }, { key: 'b', label: 'B', points: 41 }], 100)).toBe(56);
  });
  it('takes the score on the criteria that were assessed, brought back to 100', () => {
    expect(ratingScore({ quality: 30, delay: null, service: 15 })).toBe(75);   // 45 points out of 60
    expect(ratingScore({ quality: null, delay: null, service: null })).toBe(0);
    const r: SupplierRating = { date: '2026-09-01', by: '', note: '', scores: [{ key: 'quality', label: 'Qualité', points: 30, max: 35 }, { key: 'price', label: 'Prix', points: null, max: 20 }, { key: 'eco', label: 'Environnement', points: 5, max: 10 }] };
    expect(ratingScore(r)).toBe(Math.round(35 / 45 * 100));   // price not assessed
    expect(ratingParts(r)).toHaveLength(3);
  });
  it('a rating keeps the criteria of its day, so changing the grid never changes the past', () => {
    const r: SupplierRating = { date: '2026-01-01', by: '', note: '', scores: [{ key: 'quality', label: 'Qualité', points: 30, max: 40 }, { key: 'price', label: 'Prix', points: 15, max: 20 }] };
    const before = ratingScore(r);
    const other = { supplier: { criteria: [{ key: 'quality', label: 'Qualité', weight: 10, scale: 100, auto: 'quality' as const }] } };
    expect(ratingScore(r)).toBe(before);
    expect(classOf(before, other)).toBe(classOf(before));
    expect(ratingScore({ quality: 45, delay: 45, service: 10, max: [50, 50, 10] })).toBe(91);   // an older rating keeps its three fixed criteria
    expect(ratingParts({ quality: 20, delay: null, service: 10 }).map(p => p.label)).toEqual(['Qualité', 'Délais', 'Service']);
  });
  it('the thresholds of the classes are the company\'s', () => {
    expect(classOf(80, { supplier: { classA: 80, classB: 60 } })).toBe('A');
    expect(classOf(59, { supplier: { classA: 80, classB: 60 } })).toBe('C');
    expect(supplierCfg({}).sendDays).toBe(2);
  });
  it('keeps a supplier out of class A when its quality is too low, if the company asks for it', () => {
    const r: SupplierRating = { date: '2026-09-01', by: '', note: '', scores: [{ key: 'quality', label: 'Qualité', points: 20, max: 35 }, { key: 'delay', label: 'Délais', points: 25, max: 25 }, { key: 'service', label: 'Service', points: 20, max: 20 }, { key: 'price', label: 'Prix', points: 20, max: 20 }] };
    expect(ratingScore(r)).toBe(85);
    expect(ratingClass(r)).toBe('A');
    expect(ratingClass(r, { supplier: { qualityFloor: 60 } })).toBe('B');   // 20 points out of 35 is 57 %, under 60 %
    expect(ratingClass(r, { supplier: { qualityFloor: 50 } })).toBe('A');
  });
  it('the status follows the decision of the rating', () => {
    expect(statusAfter('delist', 'listed')).toBe('delisted');
    expect(statusAfter('watch', 'listed')).toBe('watch');
    expect(statusAfter('keep', 'watch')).toBe('listed');
    expect(statusAfter('progress', 'watch')).toBe('watch');
  });
  it('asks for a new rating at the rhythm of the supplier: 12 months, 6 months when critical, never when delisted', () => {
    const x = (p: Partial<Supplier>): Supplier => ({ id: 's', name: 'X', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [{ date: '2026-02-01', quality: 30, delay: 30, service: 15, by: '', note: '' }], ...p });
    expect(ratingDue(x({}), now)).toBe(false);
    expect(ratingDue(x({ strategic: true }), now)).toBe(true);
    expect(ratingDue(x({ ratings: [] }), now)).toBe(true);
    expect(ratingDue(x({ ratings: [], status: 'delisted' }), now)).toBe(false);
    expect(nextReview(x({}))).toBe('2027-02-01');
    expect(nextReview(x({ ratings: [{ date: '2026-02-01', quality: 1, delay: 1, service: 1, by: '', note: '', nextReview: '2026-12-01' }] }))).toBe('2026-12-01');
  });
  it('sees a class lower than at the previous rating', () => {
    const r = (date: string, q: number) => ({ date, quality: q, delay: 30, service: 15, by: '', note: '' });
    const x: Supplier = { id: 's', name: 'X', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [r('2025-01-01', 40), r('2026-01-01', 10)] };
    expect(classDrop(x)).toEqual({ from: 'A', to: 'C' });
    expect(classDrop({ ...x, ratings: [r('2025-01-01', 10), r('2026-01-01', 40)] })).toBeNull();
  });
  it('a supplier is of goods or of services, and the old categories still read', () => {
    expect(isGoods('matiere')).toBe(true);
    ['service', 'soustraitance', 'logistique'].forEach(c => expect(isGoods(c as Supplier['category']), c).toBe(false));
    expect(orgCategoryOf('matiere')).toBe('fournisseur');
    expect(orgCategoryOf('service')).toBe('prestataire');
    expect(orgCategoryOf('logistique')).toBe('fournisseur');
  });
});

describe('3.1 claims', () => {
  it('claims within the working days, then waits for the answer and follows the credit', () => {
    const s = st();
    // Friday 25 September: a reception of Thursday is on time, one of Tuesday is late (three working days)
    expect(debitState(claim({ date: '2026-09-24' }), now, s.params)).toBe('to_send');
    expect(debitState(claim({ date: '2026-09-22' }), now, s.params)).toBe('late');
    expect(debitState(claim({ date: '2026-09-22', sentAt: '2026-09-23' }), now, s.params)).toBe('waiting');
    expect(debitState(claim({ date: '2026-08-22', sentAt: '2026-09-02' }), now, s.params)).toBe('chase');
    expect(debitState(claim({ date: '2026-08-22', sentAt: '2026-09-02', chases: [{ date: '2026-09-20', via: 'mail', note: '' }] }), now, s.params)).toBe('waiting');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'accepted' }), now, s.params)).toBe('accepted');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'partial' }), now, s.params)).toBe('accepted');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'contested' }), now, s.params)).toBe('contested');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'refused' }), now, s.params)).toBe('refused');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'accepted', recovered: 300 }), now, s.params)).toBe('recovered');
    expect(debitState(claim({ sentAt: '2026-09-23', answer: 'accepted', closedAt: '2026-09-24', closedReason: 'resolved' }), now, s.params)).toBe('closed');
    expect(debitAmount(claim({ reworkHours: 4.5, otherCost: 100 }), s.params)).toBe(4.5 * 55 + 100);
    expect(debitAmount(claim({}), s.params)).toBe(0);   // a claim of delay can stay without an amount
  });
  it('does not count the week-end in the delay to send, unless the company turns the working days off', () => {
    const monday = new Date(2026, 8, 21, 10, 0);
    const fri = claim({ date: '2026-09-18' });
    expect(debitState(fri, monday, { ...st().params, businessHours: true })).toBe('to_send');
    expect(debitState(fri, monday, { ...st().params, businessHours: false })).toBe('late');
    expect(debitState(claim({ date: '2026-09-23' }), now, { ...st().params, supplier: { sendDays: 1 } })).toBe('late');
  });
  it('writes the e-mail of a claim from the model, with the person chosen in the directory', () => {
    const x: Supplier = { id: 'sup1', name: 'Aciers X', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [], contactId: 'c1' };
    const s = st({ suppliers: { sup1: x }, contacts: { c1: person({}) } });
    const d = claim({ supplierId: 'sup1', ref: 'DEB-2026-001', date: '2026-09-22', bl: 'BL 12', defect: 'Tôles rayées', reworkHours: 2 });
    const m = claimMail(s, d);
    expect(m.subject).toBe('Réclamation DEB-2026-001');
    expect(m.body).toContain('Bonjour Anne,');
    expect(m.body).toContain('(BL 12)');
    expect(m.body).toContain('Tôles rayées');
    expect(m.body).toContain('110');
    const free = claimMail({ ...s, params: { ...s.params, supplier: { mailSubject: 'Litige {ref}', mailBody: 'Bonjour {contact}, {defaut}' } } }, { ...d, contactId: '' });
    expect(free.subject).toBe('Litige DEB-2026-001');
    expect(claimContact(s, { supplierId: 'sup1', contactId: '' })?.name).toBe('Anne');
  });
  it('writes a valid PDF sheet with the motive, the severity and the person it goes to', () => {
    const s = demo();
    const pdf = debitPdf(s, s.debits.deb_demo_5, { company: 'Atelier é', date: now });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
  });
});

describe('3.1 history and facts of the fictitious company', () => {
  it('every state of a claim is shown, with a late one, a contested one, a refused one and a closed one', () => {
    const s = demo();
    const states = Object.values(s.debits).map(d => debitState(d, now, s.params));
    ['to_send', 'late', 'waiting', 'chase', 'contested', 'accepted', 'recovered', 'refused', 'closed'].forEach(k => expect(states, k).toContain(k));
    expect(Object.values(s.debits)).toHaveLength(28);
  });
  it('comes from every trade, not only from industry', () => {
    const s = demo();
    const supplies = Object.values(s.suppliers).map(x => x.supplies).join(' | ');
    ['bureau', 'informatique', 'nettoyage', 'Repas', 'comptable', 'Transport'].forEach(w => expect(supplies.toLowerCase(), w).toContain(w.toLowerCase()));
    expect(Object.values(s.suppliers).filter(x => isGoods(x.category))).toHaveLength(4);
    expect(Object.values(s.suppliers).filter(x => !isGoods(x.category))).toHaveLength(10);
    expect(Object.keys(s.sectors)).toHaveLength(8);
  });
  it('gives each class to a supplier, and leaves one unrated', () => {
    const s = demo();
    const cls = Object.values(s.suppliers).map(x => (lastRating(x) ? ratingClass(lastRating(x)!, s.params) : '?'));
    expect(cls.sort()).toEqual(['?', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'C', 'C']);
  });
  it('some of the ratings use the grid with price, the older ones the three fixed criteria', () => {
    const s = demo();
    expect(ratingParts(lastRating(s.suppliers.sup_demo_bureau)!).map(p => p.key)).toEqual(['quality', 'delay', 'service', 'price']);
    expect(ratingScore(lastRating(s.suppliers.sup_demo_bureau)!)).toBe(90);
    expect(ratingParts(lastRating(s.suppliers.sup_demo_acier)!).map(p => p.key)).toEqual(['quality', 'delay', 'service']);
    expect(ratingScore(lastRating(s.suppliers.sup_demo_acier)!)).toBe(82);
  });
  it('sums the year of claims and credits', () => {
    const s = demo();
    const sm = supplierSummary(s, now);
    const claimed = Object.values(s.debits).reduce((a, d) => a + debitAmount(d, s.params), 0);
    expect(sm.recovered).toBe(1895);
    expect(sm.claimed).toBe(claimed);
    expect(sm.ratePct).toBe(Math.round(1895 / claimed * 100));
    expect(sm.inC).toBe(2);
    expect(sm.late).toBe(1);
    expect(sm.contested).toBe(1);
    expect(sm.chase).toBe(2);
    expect(sm.open).toBe(8);
    expect(sm.due).toBe(5);
  });
  it('raises the alerts of the supplier follow-up, claims on one side and evaluation on the other', () => {
    const list = supplierInsights(demo(), now), keys = list.map(i => i.key);
    ['late', 'contested', 'chase', 'repeat', 'bl', 'c', 'drop', 'acc', 'verify', 'qualify', 'due'].forEach(k => expect(keys, k).toContain(k));
    const claimSide = list.filter(i => CLAIM_INSIGHT_KEYS.includes(i.key)).map(i => i.key);
    expect(claimSide).toEqual(expect.arrayContaining(['late', 'contested', 'chase', 'bl', 'acc', 'verify']));
    expect(claimSide).not.toContain('c');
    expect(CLAIM_INSIGHT_KEYS).not.toContain('repeat');
  });
  it('sees a defect that comes back at the same supplier', () => {
    const s = demo();
    expect(supplierFacts(s, s.suppliers.sup_demo_proprete, now).repeats).toEqual([{ key: 'produit', n: 3 }]);
    expect(supplierFacts(s, s.suppliers.sup_demo_acier, now).repeats).toEqual([]);
  });
  it('proposes a rating from the facts, weighting the claims by severity, leaving price and the criteria without facts unassessed', () => {
    const s = demo();
    const u = proposedRating(s, s.suppliers.sup_demo_usinage, now);
    expect(u.parts.map(p => p.key)).toEqual(['quality', 'delay', 'service', 'price']);
    expect(part(u, 'quality').points).toBe(7.1);   // two major claims (12 %) and a minor one (5 %): 29 % of the note lost
    expect(part(u, 'quality').max).toBe(10);
    expect(part(u, 'delay').points).toBeNull();   // no delivery followed
    expect(part(u, 'service').points).toBe(10);
    expect(part(u, 'price').points).toBeNull();   // only a person can judge it
    expect(u.parts.filter(p => p.auto).map(p => p.key)).toEqual(['quality', 'delay', 'service']);
    expect(ratingScore({ scores: toScores(u.parts) })).toBe(Math.round((35 * 0.71 + 20) / 55 * 100));   // weights 35 and 20 applied to the notes given
    const p = proposedRating(s, s.suppliers.sup_demo_proprete, now);
    expect(part(p, 'quality').points).toBe(5.4);   // three major and two minor claims: 46 % lost
    expect(part(p, 'delay').points).toBe(0);   // both deliveries followed were late
    // nothing is proposed where there are no facts: a supplier never evaluated does not start at 100
    const none = proposedRating(s, s.suppliers.sup_demo_reseaux, now);
    expect(none.parts.map(p => p.points)).toEqual([null, null, null, null]);
    expect(none.parts.every(p => !p.grounded)).toBe(true);
    expect(assessed(toScores(none.parts))).toBe(false);
    expect(part(none, 'quality')).toMatchObject({ grounded: false, hint: 'aucune réclamation suivie : à apprécier' });
    expect(part(u, 'quality').grounded).toBe(true);
    expect(part(u, 'delay').grounded).toBe(false);
  });
  it('an evaluation made by hand starts empty and counts only what was given', () => {
    const s = demo();
    const pr = proposedRating(s, s.suppliers.sup_demo_proprete, now);
    const blank = blankScores(pr.parts);
    expect(blank.map(p => p.points)).toEqual([null, null, null, null]);
    expect(blank.map(p => p.max)).toEqual([10, 10, 10, 10]);
    expect(blank.map(p => p.weight)).toEqual([35, 25, 20, 20]);
    expect(blank[0].items).toHaveLength(4);
    expect(assessed(blank)).toBe(false);
    expect(ratingScore({ scores: blank })).toBe(0);
    const byHand = blank.map(p => (p.key === 'quality' ? { ...p, points: 8 } : p.key === 'price' ? { ...p, points: 7 } : p));
    expect(assessed(byHand)).toBe(true);
    expect(ratingScore({ scores: byHand })).toBe(Math.round((35 * 0.8 + 20 * 0.7) / 55 * 100));   // quality and price only, with their weights
  });
  it('uses the grid of the company: added criteria are given by hand, a zero weight removes one, the penalty shares are its own', () => {
    const s = demo();
    const own: Criterion[] = [{ key: 'quality', label: 'Qualité', weight: 50, scale: 20, auto: 'quality' }, { key: 'eco', label: 'Environnement', weight: 10, scale: 100, items: [{ key: 'iso', label: 'Certification' }] }, { key: 'delay', label: 'Délais', weight: 0, scale: 10, auto: 'delay' }];
    const t = { ...s, params: { ...s.params, supplier: { criteria: own, penaltyPct: [10, 20, 40] as [number, number, number] } } };
    const r = proposedRating(t, t.suppliers.sup_demo_usinage, now);
    expect(r.parts.map(p => p.key)).toEqual(['quality', 'eco']);
    expect(part(r, 'quality')).toMatchObject({ points: 10, max: 20 });   // two major claims (20 % each) and a minor one (10 %): half of the note out of 20
    expect(part(r, 'eco').points).toBeNull();
    expect(r.parts[1]).toMatchObject({ auto: false, max: 100, weight: 10, label: 'Environnement' });
    expect(r.parts[1].itemDefs).toEqual([{ key: 'iso', label: 'Certification' }]);
    // the grid of a new rating carries the scale, the weight and the items, nothing noted
    const blank = blankScores(r.parts);
    expect(blank.map(p => [p.key, p.max, p.weight, p.points])).toEqual([['quality', 20, 50, null], ['eco', 100, 10, null]]);
    expect(blank[0].items).toHaveLength(4);   // a criterion of a known kind that has no items of its own takes the items of the kind
    expect(blank[1].items).toEqual([{ key: 'iso', label: 'Certification', points: null }]);
  });
  it('slow answers cost service points, and the company\'s own reminder delay applies', () => {
    const s = demo();
    const a = proposedRating(s, s.suppliers.sup_demo_acier, now);   // one claim sent 23 days ago without answer
    expect(part(a, 'service').points).toBe(8.5);
    expect(part(a, 'quality').points).toBe(6.6);
    expect(part(a, 'delay').points).toBe(5);   // one of two deliveries was late
    expect(part(proposedRating({ ...s, params: { ...s.params, supplier: { followDays: 30 } } }, s.suppliers.sup_demo_acier, now), 'service').points).toBe(10);
  });
  it('builds the history of a supplier from its records, most recent first', () => {
    const s = demo();
    const tl = supplierTimeline(s, s.suppliers.sup_demo_acier);
    expect(tl.map(e => e.date)).toEqual([...tl.map(e => e.date)].sort().reverse());
    expect(tl.filter(e => e.kind === 'rating')).toHaveLength(2);
    expect(tl.filter(e => e.kind === 'claim')).toHaveLength(4);
    expect(tl.some(e => e.kind === 'late')).toBe(true);   // the late deliveries are part of the history
    expect(tl.every(e => e.kind !== 'claim' || !!e.claimId)).toBe(true);
  });
  it('counts the claims of the twelve months by motive', () => {
    const s = demo();
    const t = claimTrend(s, '2026-09');
    expect(t.rows).toHaveLength(12);
    expect(t.total).toBe(Object.values(s.debits).filter(d => d.date >= '2025-10-01').length);
    expect(t.series.map(x => x.key)).toEqual(expect.arrayContaining(['produit', 'retard', 'transport']));
    expect(claimTrend(s, '2026-09', 'sup_demo_proprete').total).toBe(5);
  });
  it('turns the claims into tasks of the follow-up', () => {
    const tasks = allTasks(demo(), now).filter(t => t.tool === '3.1').map(t => t.text);
    expect(tasks.some(x => x.startsWith('Réclamation DEB'))).toBe(true);
    expect(tasks.some(x => x.startsWith('Réponse de'))).toBe(true);
    expect(tasks.some(x => x.includes('contestée par'))).toBe(true);
    expect(tasks.some(x => x.startsWith('Évaluation du fournisseur'))).toBe(true);
  });
  it('the tool badge flags the claim that was not sent in time', () => {
    expect(toolBadge(demo(), '3.1', '2026-09', now)).toMatchObject({ tone: 'alert', n: 1 });
  });
});

describe('3.1 links with the directory', () => {
  const sup = (p: Partial<Supplier>): Supplier => ({ id: 'sup1', name: 'Aciers X', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [], ...p });
  it('gives a supplier of the old version its organisation and its contact card, once', () => {
    const s = st({ suppliers: { sup1: sup({ contact: 'Responsable achats · 04 00 00 00 24' }) }, debits: { d1: claim({ id: 'd1', supplierId: 'sup1' }) } });
    const a = linkSuppliers(s);
    const x = a.suppliers.sup1;
    expect(x.orgId).toBeTruthy();
    expect(a.orgs[x.orgId!]).toMatchObject({ name: 'Aciers X', category: 'fournisseur' });
    expect(a.contacts[x.contactId!]).toMatchObject({ company: 'Aciers X', category: 'fournisseur', phone: '04 00 00 00 24', name: 'Responsable achats' });
    expect(a.debits.d1.supplierName).toBe('Aciers X');
    expect(linkSuppliers(a)).toBe(a);   // nothing left to do: same object
  });
  it('a subcontractor is a "prestataire" of the directory, and an existing organisation is found by its name', () => {
    const s = st({ suppliers: { sup1: sup({ name: 'Usinage X', category: 'soustraitance' }), sup2: sup({ id: 'sup2', name: 'aciers x (agence)' }) }, orgs: { o1: { id: 'o1', name: 'Aciers X', category: 'fournisseur', phone: '', email: '', address: '', reference: '' } }, contacts: { c1: person({}) } });
    const a = linkSuppliers(s);
    expect(a.orgs[a.suppliers.sup1.orgId!].category).toBe('prestataire');
    expect(a.suppliers.sup2.orgId).toBe('o1');
    expect(a.suppliers.sup2.contactId).toBe('c1');   // the person of that organisation becomes the main contact
    expect(a.suppliers.sup2.name).toBe('Aciers X');   // the name is the one of the directory
  });
  it('follows the name of the organisation when it is renamed in the directory', () => {
    const s = st({ suppliers: { sup1: sup({ name: 'Ancien nom', orgId: 'o1' }) }, orgs: { o1: { id: 'o1', name: 'Nouveau nom', category: 'fournisseur', phone: '', email: '', address: '', reference: '' } } });
    expect(linkSuppliers(s).suppliers.sup1.name).toBe('Nouveau nom');
  });
  it('lists the people of the organisation and the organisations that can still be followed, advisers included', () => {
    const s = st({
      suppliers: { sup1: sup({ orgId: 'o1', contactId: 'c1' }) }, orgs: { o1: { id: 'o1', name: 'Aciers X', category: 'fournisseur', phone: '', email: '', address: '', reference: '' } },
      contacts: { c1: person({}), c2: person({ id: 'c2', name: 'Bruno', vital: true }), c3: person({ id: 'c3', name: 'Autre', company: 'Transports Y' }), c4: person({ id: 'c4', category: 'client', company: 'Client Z' }), c5: person({ id: 'c5', category: 'conseil', company: 'Cabinet Q' }) },
    });
    expect(supplierContacts(s, s.suppliers.sup1).map(c => c.name)).toEqual(['Bruno', 'Anne']);   // the vital one first
    expect(followableOrgs(s)).toEqual(['Cabinet Q', 'Transports Y']);
  });
  it('follows an organisation of the directory, or creates it', () => {
    const s = st({ contacts: { c3: person({ id: 'c3', company: 'Transports Y' }) } });
    followOrg(s, 'Transports Y', 'fournisseur', 'qualify', 'sup9');
    expect(s.suppliers.sup9).toMatchObject({ name: 'Transports Y', status: 'qualify' });
    expect(s.suppliers.sup9.contactId).toBe('c3');
    expect(Object.values(s.orgs)).toHaveLength(1);
    expect(followOrg(s, 'transports y', 'fournisseur').id).toBe('sup9');   // already followed
    const n = followOrg(s, 'Nouveau fournisseur', 'prestataire', 'listed', 'sup10');
    expect(s.orgs[n.orgId!]).toMatchObject({ name: 'Nouveau fournisseur', category: 'prestataire' });
  });
  it('loads an old saved company with its suppliers linked to the directory', () => {
    const s = st({ suppliers: { sup1: sup({ contact: 'Jean · 06 00 00 00 01' }) } });
    const n = normalize(s);
    expect(n.suppliers.sup1.orgId).toBeTruthy();
    expect(Object.values(n.orgs).some(o => o.name === 'Aciers X')).toBe(true);
    expect(Object.values(n.contacts).some(c => c.name === 'Jean')).toBe(true);
  });
});

describe('3.1 fictitious data', () => {
  it('links every fictitious supplier to an organisation and a person of the directory', () => {
    const s = demo();
    Object.values(s.suppliers).forEach(x => {
      expect(s.orgs[x.orgId!], x.name).toBeTruthy();
      expect(s.orgs[x.orgId!].name).toBe(x.name);
      expect(supplierContacts(s, x).length, x.name).toBeGreaterThan(0);
    });
  });
  it('replaces the example of a fictitious company saved before, once, and keeps what the company created and typed', () => {
    const fresh = supplierExamples(now);
    const old = st({
      suppliers: {
        sup_demo_acier: { ...fresh.suppliers.sup_demo_acier, ratings: [fresh.suppliers.sup_demo_acier.ratings[0]], status: undefined, supplies: 'Aciers spéciaux (saisi)' },
        sup_demo_bureau: { ...fresh.suppliers.sup_demo_bureau, ratings: [{ date: '2026-03-01', by: '', note: '', scores: [{ key: 'quality', label: 'Qualité', points: 30, max: 35 }, { key: 'price', label: 'Prix', points: 15, max: 20 }] }] },
        sup_demo_peinture: { ...fresh.suppliers.sup_demo_acier, id: 'sup_demo_peinture', name: 'Thermolaquage Sud', orgId: 'org_demo_peinture' },
        mine: { id: 'mine', name: 'Mon fournisseur', category: 'service', supplies: 'Conseil', strategic: false, contact: '', ratings: [] },
      },
      debits: {
        deb_demo_1: { id: 'deb_demo_1', ref: 'DEB-2026-001', supplierId: 'sup_demo_usinage', date: '2026-08-11', bl: 'BL 7710', reserveOnBl: true, defect: 'Taraudage raté', reworkHours: 12, otherCost: 590, sentAt: '2026-08-12', answer: 'accepted', recovered: 999, recoveredAt: '2026-09-05' },
        mine_d: { id: 'mine_d', ref: 'DEB-2026-090', supplierId: 'mine', date: '2026-09-01', bl: '', reserveOnBl: true, defect: 'Le mien', reworkHours: null, otherCost: null, sentAt: '', answer: '', recovered: null, recoveredAt: '' },
      },
      sectors: { sec_demo_peinture: { id: 'sec_demo_peinture', name: 'Peinture', order: [] } },
      orgs: { org_demo_peinture: { id: 'org_demo_peinture', name: 'Thermolaquage Sud', category: 'prestataire', phone: '', email: '', address: '', reference: '' } },
      contacts: { ct_demo_peinture: person({ id: 'ct_demo_peinture', company: 'Thermolaquage Sud' }) },
    });
    old.params = { ...old.params, supplierExampleLevel: 2 };
    const a = completeSupplierExamples(old, now);
    expect(Object.keys(a.suppliers).filter(id => id.startsWith('sup_demo_'))).toHaveLength(14);
    expect(a.suppliers.sup_demo_peinture).toBeUndefined();   // retired
    expect(a.sectors.sec_demo_peinture).toBeUndefined();
    expect(a.orgs.org_demo_peinture).toBeUndefined();
    expect(a.contacts.ct_demo_peinture).toBeUndefined();
    expect(a.suppliers.mine.name).toBe('Mon fournisseur');   // created by the company
    expect(a.debits.mine_d.defect).toBe('Le mien');
    expect(Object.keys(a.debits).filter(id => id.startsWith('deb_demo_'))).toHaveLength(28);
    expect(a.debits.deb_demo_1.recovered).toBe(1250);   // the example claims are given again
    expect(Object.keys(a.sectors)).toHaveLength(8);
    expect(a.suppliers.sup_demo_acier.supplies).toBe('Aciers spéciaux (saisi)');   // typed by the company
    // the rating of the previous generation (no weight) gives way to the current one, with its items
    expect(a.suppliers.sup_demo_bureau.ratings).toHaveLength(1);
    expect(ratingParts(a.suppliers.sup_demo_bureau.ratings[0]).every(p => p.max === 10 && p.weight > 0)).toBe(true);
    expect(a.suppliers.sup_demo_bureau.ratings[0].scores![0].items).toHaveLength(4);
    expect(a.suppliers.sup_demo_acier.ratings).toHaveLength(2);   // the older rating joins
    expect(a.suppliers.sup_demo_acier.sectorIds).toEqual(['sec_demo_tole']);
    expect(a.params.supplierExampleLevel).toBe(6);
    expect(completeSupplierExamples(a, now)).toBe(a);
    expect(completeSupplierExamples(st({ suppliers: { s1: { id: 's1', name: 'Réel', category: 'matiere', supplies: '', strategic: false, contact: '', ratings: [] } } }), now).debits).toEqual({});   // a real company gets nothing
  });
});

describe('3.1 example button and Plans B', () => {
  it('fills an empty company with the suppliers, their organisations, people and claims, once', () => {
    const d = blankState('industrie', now);
    applySupplierExample(d, now);
    expect(Object.keys(d.suppliers)).toHaveLength(14);
    expect(Object.keys(d.debits)).toHaveLength(28);
    expect(Object.keys(d.sectors)).toHaveLength(8);
    const linked = linkSuppliers(d);
    Object.values(linked.suppliers).forEach(x => {
      expect(linked.orgs[x.orgId!], x.name).toBeTruthy();
      expect(supplierContacts(linked, x).length, x.name).toBeGreaterThan(0);
    });
    const again = structuredClone(d);
    applySupplierExample(again, now);
    expect(Object.keys(again.debits)).toHaveLength(28);
  });
  it('a critical supplier is covered by a ready backup of its sector, or by a risk that names it or what it supplies', () => {
    const s = demo();
    expect(hasPlanB(s, s.suppliers.sup_demo_acier, now)).toBe(true);   // a ready backup in its sector, and "Fournisseur unique de tôle"
    expect(hasPlanB(s, s.suppliers.sup_demo_it, now)).toBe(false);   // its backup is still to be qualified
    expect(sectorInsights(s, now).find(i => i.key === 'planb')?.text).toContain('Prestataire IT');
    const ready: State = { ...s, suppliers: { ...s.suppliers, sup_demo_reseaux: { ...s.suppliers.sup_demo_reseaux, status: 'listed', ratings: [{ date: '2026-09-01', quality: 30, delay: 30, service: 15, by: '', note: '' }], receipts: [{ id: 'r1', date: '2026-09-01', promised: '2026-09-01', received: '2026-09-01', note: '' }] } } };
    expect(hasPlanB(ready, ready.suppliers.sup_demo_it, now)).toBe(true);
  });
});

describe('3.1 fictitious data and the other tools', () => {
  it('the claims of the example add no alert to the dashboard, the directory or the quality tools', () => {
    // on the day of the tests, and on the day it is looked at (the example moves with the calendar)
    [now, new Date()].forEach(day => {
      const period = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;
      const withClaims = demoState(day), without = demoState(day);
      without.debits = {};
      without.suppliers = {};
      ['1.1', '1.2', '1.3', '2.3', '2.4', '3.2', '3.3', '3.4', '5.1', '5.2', '5.3', '5.4'].forEach(t => {
        const a = toolBadge(withClaims, t, period, day), b = toolBadge(without, t, period, day);
        expect({ n: a.n, tone: a.tone }, `${t} ${period}`).toEqual({ n: b.n, tone: b.tone });
      });
    });
  });
});

describe('3.1 a new supplier creates its card in the directory', () => {
  const today = new Date(2026, 9, 3);
  const person = { name: 'Claire Martin', role: 'Chargée de compte', phone: '04 00 00 09 09', email: 'c.martin@exemple.fr' };
  it('creates the organisation with its coordinates and the person to call, number checked today', () => {
    const s = st();
    const { org, contactId } = ensureSupplierOrg(s, { name: ' Papeterie du Parc ', category: 'fournisseur', phone: '04 00 00 09 00', email: 'contact@parc.fr', address: '2 rue des Lilas, Lyon', reference: 'CLI-4471', person }, 'Sophie V.', today);
    expect(s.orgs[org.id]).toMatchObject({ name: 'Papeterie du Parc', category: 'fournisseur', phone: '04 00 00 09 00', email: 'contact@parc.fr', address: '2 rue des Lilas, Lyon', reference: 'CLI-4471' });
    expect(s.contacts[contactId]).toMatchObject({ name: 'Claire Martin', role: 'Chargée de compte', company: 'Papeterie du Parc', category: 'fournisseur', phone: '04 00 00 09 09', verifiedAt: '2026-10-03', verifiedBy: 'Sophie V.' });
    expect(supplierContacts(s, { orgId: org.id, name: org.name, contactId })).toHaveLength(1);
  });
  it('keeps the organisation and the people already in the directory', () => {
    const s = st({ orgs: { o1: { id: 'o1', name: 'Bureau Plus', category: 'fournisseur', phone: '1', email: '', address: '', reference: '' } }, contacts: { c1: { id: 'c1', category: 'fournisseur', name: 'Bruno', role: '', company: 'Bureau Plus', phone: '2', email: '', always: false, verifiedAt: '2026-01-01' } } });
    const r = ensureSupplierOrg(s, { name: 'bureau plus', category: 'prestataire', phone: 'autre', person }, 'Sophie V.', today);
    expect(r.org.id).toBe('o1');
    expect(r.org.phone).toBe('1');   // the card of the directory is not overwritten
    expect(r.contactId).toBe('');   // somebody is already there
    expect(Object.keys(s.contacts)).toEqual(['c1']);
    expect(Object.keys(s.orgs)).toEqual(['o1']);
  });
  it('creates no person without a name, and leaves the number unchecked when none is given', () => {
    const s = st();
    expect(ensureSupplierOrg(s, { name: 'Sans nom', category: 'prestataire', person: { ...person, name: ' ' } }, '', today).contactId).toBe('');
    expect(Object.keys(s.contacts)).toHaveLength(0);
    const { contactId } = ensureSupplierOrg(s, { name: 'Autre', category: 'prestataire', person: { ...person, phone: '' } }, 'Sophie V.', today);
    expect(s.contacts[contactId]).toMatchObject({ phone: '', verifiedAt: '' });
  });
});
