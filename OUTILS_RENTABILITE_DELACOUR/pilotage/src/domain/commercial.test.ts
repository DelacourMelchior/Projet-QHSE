// Tools 2.1 to 2.4: margin lock and visas, follow-up, 48 h call back, flash review.
import { describe, expect, it, vi } from 'vitest';
import type { Complaint, Feedback, Quote, State } from './types';
import {
  DEFAULT_MOTIFS, freeSlot, GREY, motifLabel, motifsOf, resetMotifs, SERIES_COLORS, withoutMotif, anonymize, clientFiles, complaintTrend, isComplaintKpi, closeBlockers, complaintCost, dueForAnonymizing, hasChecks, INVESTIGATION, INVESTIGATION_PRESETS, investigationOf, needsApproval, ownerToday, similarComplaints, toolEmpty, complaintLetter, complaintInsights, complaintState, complaintStats, contactDeadline, contactDelay, escalationOf, isBlocked, isClosed, safeUrl, feedbackState, isNegative, newComplaint, newFeedback, newQuote,
  quoteInsights, quoteIssues, quoteMargin, quoteState, quoteStats,
} from './commercial';
import { commercialExamples, commercialExampleParams, completeCommercialExamples, completeComplaintExamples } from './commercialExamples';
import { allTasks } from './tasks';
import { toolBadge } from './status';
import { focusOfHash, toolOfHash, toolUrl } from '../ui/tools';
import { quotePdf } from './commercialPdf';
import { addWorkHours, businessOf, emptyTools, workHoursBetween } from './base';
import { easter, frenchHolidays } from './calendar';
import { complaintHistory } from './complaintHistory';
import { DEFAULT_SCALE } from './risk';
import { feeds } from './feeds';
import {
  feedbackOfDelivery, complaintChoices, complaintDelivery, deliveriesCounted, setMonthDeliveries, addSatisfactionKpi, monthSummary, satisfactionTargetOf, setSatisfactionTarget, scoreMix, deliveriesToAsk, detailsOf, feedbackCauses, feedbackMail, MAIL_BODY_MODEL, reviewMessage, feedbackFromDelivery, feedbackInsights, feedbackMonthPct, feedbackSummary, feedbackTrend, followOf, importFeedbacks, isSatisfactionKpi, unhappyMaxOf, deliveriesOf, pvFact, receivedOn, promiseFact,
} from './commercial';
import { addSatisfactionExample } from './commercialExamples';
import { blankState, demoState } from './templates';
import { synthesis } from './engine';
import { receptionKpiValue } from './receptionsFeeds';
import type { Delivery, Lot, Reception, ReceptionReserve } from './types';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: 'Atelier', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
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
    expect(complaintStats({ ...s, params: { ...P, businessHours: false } }, '2026-09', now)).toMatchObject({ count: 2, cost: 200, within48Pct: 50, avgDelay: 39, top: { p: 'P3', n: 2 } });
    expect(complaintStats(s, '2026-09', now)).toMatchObject({ within48Pct: 100, avgDelay: 22.5 });   // working days are the default: the weekend does not count
    expect(feeds({ ...s, kpis: { kpi_reclamations: { id: 'kpi_reclamations', role: 'reclamations', name: 'Réclamations', processId: 'P5', type: 'Garde-fou', unit: 'litiges', direction: 'lower', aggregation: 'sum', target: '0', targetValue: 0, confidential: false, source: '' } } }, '2026-09', now)[0].value).toBe(2);
  });
});

describe('2.3 follow-up of a complaint', () => {
  const stats = (c: Complaint, more: Record<string, Complaint>) => complaintStats(st({ complaints: { a: { ...c, id: 'a', at: '2026-09-02T09:00' }, ...Object.fromEntries(Object.entries(more).map(([k, v]) => [k, { ...v, at: '2026-09-03T09:00' }])) } }), '2026-09', now).grounded;
  const cp = (over: Partial<Complaint> = {}): Complaint => ({ ...newComplaint(st(), 'Laurent', now), client: 'A', description: 'Retard', ...over });
  const withBiz = (extra: Partial<State['params']> = {}, rest: Partial<State> = {}) => st({ params: { ...P, businessHours: true, ...extra }, ...rest });

  it('counts the 48 h on working days everywhere when the company asks for it', () => {
    const friday = cp({ at: '2026-09-18T15:00' }), monday = new Date(2026, 8, 21, 10, 0);
    expect(complaintState(friday, monday)).toBe('late');
    expect(complaintState(friday, monday, true)).toBe('to_contact');
    expect(contactDelay(cp({ at: '2026-09-18T15:00', contactedAt: '2026-09-21T10:00' }))).toBe(67);
    expect(contactDelay(cp({ at: '2026-09-18T15:00', contactedAt: '2026-09-21T10:00' }), true)).toBe(19);
    expect(addWorkHours('2026-09-18T15:00', 48)).toBe('2026-09-20T15:00');
    expect(addWorkHours('2026-09-18T15:00', 48, true)).toBe('2026-09-22T15:00');
    expect(contactDeadline(friday, true)).toBe('2026-09-22T15:00');
    // the share called back in time, the home badge and the tasks follow the same rule
    const s = withBiz({}, { complaints: { a: cp({ id: 'a', at: '2026-09-18T15:00', contactedAt: '2026-09-21T10:00' }) } });
    expect(complaintStats(s, '2026-09', monday).within48Pct).toBe(100);
    expect(complaintStats({ ...s, params: { ...P, businessHours: false } }, '2026-09', monday).within48Pct).toBe(0);
    const open = withBiz({}, { complaints: { b: cp({ id: 'b', at: '2026-09-18T15:00' }) } });
    expect(toolBadge(open, '2.3', '2026-09', monday).tone).toBe('warn');
    expect(allTasks(open, monday).find(t => t.id === 'cb')?.due).toBe('2026-09-22');
  });

  it('does not accept "settled" without the call-back', () => {
    expect(complaintState(cp({ at: '2026-09-23T09:00', resolvedAt: '2026-09-24' }), now)).toBe('late');
    expect(closeBlockers(cp())[0]).toMatch(/recontacter/);
  });

  it('closes only when the customer is satisfied; otherwise the complaint stays open and the invoice stays held', () => {
    const base = cp({ contactedAt: '2026-09-23T15:00', resolvedAt: '2026-09-24', courtesyAt: '2026-09-25', blockedInvoice: 1000 });
    expect(complaintState({ ...base, satisfied: 'oui' }, now)).toBe('closed');
    expect(complaintState(base, now)).toBe('closed');   // closed before the answer was noted
    expect(complaintState({ ...base, satisfied: 'non' }, now)).toBe('unsatisfied');
    expect(isClosed({ ...base, satisfied: 'non' })).toBe(false);
    expect(isBlocked({ ...base, satisfied: 'non' })).toBe(true);
    expect(isBlocked({ ...base, satisfied: 'oui' })).toBe(false);
    expect(isBlocked({ ...base, satisfied: 'non', unblockedAt: '2026-09-25' })).toBe(false);
    const f: Feedback = { ...newFeedback(now), client: 'A', q1: false, q2: true, q3: 5, complaintId: 'c' };
    expect(feedbackState(f, { complaints: { c: { ...base, satisfied: 'oui' } } })).toBe('settled');
    expect(feedbackState(f, { complaints: { c: { ...base, satisfied: 'non' } } })).toBe('unhappy');
    expect(complaintInsights(st({ complaints: { c: { ...base, id: 'c', satisfied: 'non' } } }), now).map(i => i.key)).toEqual(expect.arrayContaining(['unsat', 'blocked']));
  });

  it('asks for the investigation before closing: founded = origin, cause and measure; unfounded = the arguments', () => {
    const done = cp({ contactedAt: '2026-09-23T15:00', category: 'delai', findings: 'BL en retard', verdict: 'fondee', processId: 'P3', cause: 'Retard non signalé', correction: 'Planning revu', resultSentAt: '2026-09-24T10:00', satisfied: 'oui' });
    expect(closeBlockers(done)).toEqual([]);
    expect(closeBlockers({ ...done, verdict: '' })).toEqual(["conclure l'enquête (réclamation justifiée ou non)"]);
    expect(closeBlockers({ ...done, findings: '' })).toEqual(["documenter l'enquête (constats ou points vérifiés)"]);
    expect(closeBlockers({ ...done, findings: '', checks: { delivery: { state: 'ko', note: '' } } })).toEqual([]);   // a point checked documents it too
    expect(closeBlockers({ ...done, resultSentAt: '' })).toEqual(["informer le client du résultat de l'enquête"]);
    expect(closeBlockers({ ...done, processId: '', category: '' })).toHaveLength(2);
    expect(closeBlockers({ ...done, category: 'autre' })).toEqual(['préciser le motif « autre »']);
    expect(closeBlockers({ ...done, category: 'autre', categoryOther: 'Bruit de chantier' })).toEqual([]);
    expect(closeBlockers({ ...done, cause: '', correction: '', ncId: 'nc1' })).toEqual(['noter la cause trouvée']);
    expect(closeBlockers({ ...done, correction: '' })).toHaveLength(1);
    expect(closeBlockers({ ...done, correction: '' }, true)).toEqual([]);   // an action created from the complaint is the measure
    expect(closeBlockers({ ...done, cause: '', correction: '', analysisId: 'an1' })).toEqual([]);   // the workshop holds both
    expect(closeBlockers({ ...done, severity: 'majeure' })).toEqual(["ouvrir l'atelier 5 Pourquoi (gravité majeure)"]);
    expect(closeBlockers({ ...done, blockedInvoice: 500 })).toHaveLength(1);
    expect(closeBlockers({ ...done, satisfied: '' })).toEqual(['noter si le client est satisfait']);
    // unfounded: no process, cause or measure to write, but the arguments
    const unfounded = { ...done, verdict: 'non_fondee' as const, processId: '', cause: '', correction: '' };
    expect(closeBlockers(unfounded)).toEqual(['écrire les arguments pour contester']);
    expect(closeBlockers({ ...unfounded, defense: 'Complément signé' })).toEqual([]);
  });

  it('answers an unfounded complaint with the arguments, and keeps it out of the process alerts and the workshops to open', () => {
    const c = cp({ at: '2026-09-23T09:00', verdict: 'non_fondee', defense: 'le complément de commande est signé', severity: 'majeure' });
    expect(complaintLetter(c, 'contest', 'Atelier')).toMatch(/ne pouvons pas y donner suite : le complément de commande est signé/);
    expect(complaintLetter({ ...c, defense: '' }, 'contest', 'Atelier')).toMatch(/\[à compléter/);
    expect(complaintLetter(c, 'ack', 'Atelier')).toMatch(/vous recontacte sous 48 heures/);
    expect(complaintLetter(c, 'ack', 'Atelier', true)).toMatch(/vous recontacte sous 2 jours ouvrés/);
    const keys = complaintInsights(st({ complaints: { a: c } }), now).map(i => i.key);
    expect(keys).not.toContain('unq');
    expect(keys).not.toContain('5p');
    expect(stats(c, { b: { ...c, id: 'b', verdict: 'fondee' }, d: { ...c, id: 'd', verdict: '' } })).toEqual({ yes: 1, no: 1, open: 1 });
  });

  it('lists the customer\'s files to consult during the investigation, and opens only web links', () => {
    const s = st({
      quotes: { q: { ...newQuote(st(), now), id: 'q', client: ' a ', ref: 'DEV-1', object: 'Rampe' } },
      deliveries: { d: { id: 'd', ref: 'CMD-1', client: 'A', item: 'Rampe', reception: { date: '2026-09-10' } } as never },
      ncs: { n: { id: 'n', ref: 'NC-1', item: 'Rampe, A', description: 'Cote', at: '2026-09-11T10:00' } as never, m: { id: 'm', ref: 'NC-2', item: 'Autre client', description: 'x', at: '2026-09-11T10:00' } as never },
      feedbacks: { f: { ...newFeedback(now), id: 'f', client: 'A', affaire: 'Rampe' } },
    });
    expect(clientFiles(s, cp({ client: 'A' })).map(f => `${f.tool}:${f.id}`)).toEqual(['2.1:q', '3.4:d', '5.1:n', '2.4:f']);
    expect(clientFiles(s, cp({ client: '' }))).toEqual([]);
    expect(safeUrl(' https://webmail.example.com/m/1 ')).toBe('https://webmail.example.com/m/1');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('mailto:a@b.fr')).toBe('');
  });

  it('values the dispute with its parts and the hours spent, and counts it in the non-quality of the month', () => {
    const c = cp({ id: 'a', at: '2026-09-02T09:00', credit: 100, logistics: 50, rework: 25, cost: 25, hours: 2, processId: 'P3' });
    expect(complaintCost(c, P)).toBe(200 + 2 * P.hourlyRate);
    expect(complaintStats(st({ complaints: { a: c } }), '2026-09', now).cost).toBe(200 + 2 * P.hourlyRate);
    expect(complaintCost(cp({ cost: 260 }), P)).toBe(260);   // a record typed before the parts existed
  });

  it('checks the register is kept: written within the hour, acknowledged, customer satisfied', () => {
    const s = st({ complaints: {
      a: cp({ id: 'a', at: '2026-09-01T09:00', loggedAt: '2026-09-01T09:20', ackAt: '2026-09-01T10:00', satisfied: 'oui', courtesyAt: '2026-09-20' }),
      b: cp({ id: 'b', at: '2026-09-02T09:00', loggedAt: '2026-09-02T13:00', satisfied: 'non', courtesyAt: '2026-09-20', rounds: [{ resolvedAt: '2026-09-05', courtesyAt: '2026-09-10', solution: 'x', note: '' }] }),
    } });
    expect(complaintStats(s, '2026-09', now)).toMatchObject({ loggedPct: 50, ackPct: 50, satisfiedPct: 50, reopened: 1 });
    const open = st({ complaints: { a: cp({ id: 'a', at: '2026-09-23T09:00', client: 'Client X' }) } });
    expect(complaintInsights(open, now).map(i => i.key)).toContain('ack');
    expect(complaintInsights(st({ complaints: { a: cp({ id: 'a', at: '2026-09-23T09:00', ackAt: '2026-09-23T10:00' }) } }), now).map(i => i.key)).not.toContain('ack');
  });

  it('warns the backup of the pilot, else the head of the company, when the call-back is late', () => {
    const contact = (id: string, name: string, backupId?: string) => ({ id, name, backupId, category: 'interne', role: '', company: '', phone: '', email: '', always: false, verifiedAt: '' }) as State['contacts'][string];
    const s = st({ contacts: { p: contact('p', 'David K.', 'b'), b: contact('b', 'Marie L.'), d: contact('d', 'Jean-Marc') }, params: { ...P, directorId: 'd' } });
    expect(escalationOf(s, cp({ pilot: 'David K.' }))).toBe('Marie L.');
    expect(escalationOf(s, cp({ pilot: 'Laurent' }))).toBe('Jean-Marc');
    expect(escalationOf({ ...s, params: P }, cp({ pilot: 'Laurent' }))).toBe('');
    const late = { ...s, complaints: { a: cp({ id: 'a', at: '2026-09-22T09:00', pilot: 'David K.' }) } };
    expect(allTasks(late, now).find(t => t.id === 'cea')).toMatchObject({ who: 'Marie L.', tool: '2.3' });
    expect(complaintInsights(late, now).find(i => i.key === 'late')?.text).toMatch(/Prévenir : Marie L\./);
  });

  it('completes the example saved before these fields existed, once, and leaves the company records alone', () => {
    const old = commercialExamples(now).complaints;
    const stripped = Object.fromEntries(Object.entries(old).filter(([id]) => id !== 'cp_demo_5').map(([id, c]) => {
      const { loggedAt, ackAt, satisfied, courtesyNote, correction, hours, credit, logistics, rework, message, blockedInvoice, verdict, findings, cause, defense, contactVia, email, mailLink, checks, solution, resultSentAt, resultVia, ackLink, resultLink, letters, ...rest } = c;
      return [id, { ...rest, cost: id === 'cp_demo_1' ? 260 : id === 'cp_demo_2' ? 180 : null } as Complaint];
    }));
    const own = cp({ id: 'cp_mine', client: 'Mon client' });
    const done = completeComplaintExamples({ ...stripped, cp_mine: own }, now);
    expect(done.cp_mine).toBe(own);
    expect(done.cp_demo_5.satisfied).toBe('non');
    expect(complaintCost(done.cp_demo_1, P)).toBe(260 + 3 * P.hourlyRate);
    expect(done.cp_demo_1.cost).toBeNull();
    expect(done.cp_demo_3).toMatchObject({ verdict: 'non_fondee', processId: '' });
    expect(done.cp_demo_2).toMatchObject({ verdict: 'fondee', contactVia: 'mail' });
    expect(completeComplaintExamples(done, now)).toBe(done);
    // an example already completed by the first generation only gets the second one, with nothing counted twice and nothing brought back
    const { cp_demo_5: gone, ...first } = Object.fromEntries(Object.entries(done).map(([id, c]) => { const { verdict, findings, cause, defense, contactVia, email, mailLink, checks, solution, resultSentAt, resultVia, ackLink, resultLink, letters, ...rest } = c; return [id, rest as Complaint]; }));
    const second = completeComplaintExamples(first, now);
    expect(second.cp_demo_5).toBeUndefined();
    expect(second.cp_demo_1).toMatchObject({ verdict: 'fondee', logistics: 260, cost: null });
    const { cp_demo_5, ...without } = done;
    expect(completeComplaintExamples(without, now)).toBe(without);   // a deleted example record does not come back
  });

  it('tells the customer the result: an alert and a task until it is done', () => {
    const c = cp({ id: 'a', at: '2026-09-23T09:00', contactedAt: '2026-09-23T15:00', verdict: 'fondee' });
    expect(complaintInsights(st({ complaints: { a: c } }), now).map(i => i.key)).toContain('tell');
    expect(allTasks(st({ complaints: { a: c } }), now).find(t => t.id === 'cna')?.text).toMatch(/Informer A du résultat/);
    const told = st({ complaints: { a: { ...c, resultSentAt: '2026-09-24T10:00' } } });
    expect(complaintInsights(told, now).map(i => i.key)).not.toContain('tell');
    expect(allTasks(told, now).find(t => t.id === 'cna')).toBeUndefined();
    expect(complaintLetter({ ...c, solution: 'un avoir de 200 €', immediate: 'un dépannage' }, 'close', 'X')).toMatch(/solution retenue : un avoir de 200 €/);
  });

  it('the investigation points each name a process and a tool that holds the evidence', () => {
    expect(INVESTIGATION.map(x => x.key)).toEqual(['engagement', 'billing', 'exchange', 'delivery', 'method', 'equipment', 'supplier', 'people', 'control']);
    expect(new Set(INVESTIGATION.map(x => x.process))).toEqual(new Set(['P1', 'P2', 'P3', 'P4', 'P5']));
    expect(INVESTIGATION.filter(x => !x.tool).map(x => x.key)).toEqual(['billing']);
    expect(hasChecks(cp())).toBe(false);
    expect(hasChecks(cp({ checks: { control: { state: '', note: 'à voir' } } }))).toBe(true);
  });

  it('a link between tools carries the record to open and the tool opens on it', () => {
    expect(toolOfHash('#2.1~qt_demo_2')).toBe('2.1');
    expect(focusOfHash('#2.1~qt_demo_2')).toBe('qt_demo_2');
    expect(focusOfHash('#2.1')).toBe('');
    vi.stubGlobal('window', { location: { href: 'https://x.example/pilotage.html#2.3' } });
    expect(toolUrl('3.4', 'dl 1')).toBe('https://x.example/pilotage.html#3.4~dl%201');
    expect(focusOfHash(toolUrl('3.4', 'dl 1').slice(toolUrl('3.4', 'dl 1').indexOf('#')))).toBe('dl 1');
    vi.unstubAllGlobals();
  });

    it('does not count public holidays and closing days in the 48 h', () => {
    expect(easter(2026)).toBe('2026-04-05');
    const days = frenchHolidays(2026);
    expect(days.find(h => h.label === 'Lundi de Pâques')!.date).toBe('2026-04-06');
    expect(days.find(h => h.label === 'Ascension')!.date).toBe('2026-05-14');
    expect(days.find(h => h.label === 'Lundi de Pentecôte')!.date).toBe('2026-05-25');
    expect(days).toHaveLength(11);
    // Thursday noon to Monday noon, the Friday being a holiday
    expect(workHoursBetween('2026-04-30T12:00', '2026-05-04T12:00', true)).toBe(48);
    expect(workHoursBetween('2026-04-30T12:00', '2026-05-04T12:00', ['2026-05-01'])).toBe(24);
    expect(addWorkHours('2026-04-30T12:00', 24, ['2026-05-01'])).toBe('2026-05-04T12:00');
    expect(addWorkHours('2026-04-30T12:00', 24, true)).toBe('2026-05-01T12:00');
    expect(businessOf({ businessHours: true, closedDays: ['2026-05-01'] })).toEqual(['2026-05-01']);
    expect(businessOf({ businessHours: false, closedDays: ['2026-05-01'] })).toBe(false);
    const c = cp({ at: '2026-04-30T12:00' }), d = new Date(2026, 4, 4, 12, 30);
    expect(complaintState(c, d, true)).toBe('late');
    expect(complaintState(c, d, ['2026-05-01'])).toBe('to_contact');
  });

  it('closes a complaint when the customer cannot be reached, or when the management decides it with a written reason', () => {
    const base = cp({ contactedAt: '2026-09-23T15:00', resolvedAt: '2026-09-24', courtesyAt: '2026-09-25' });
    expect(complaintState({ ...base, satisfied: 'injoignable' }, now)).toBe('closed');
    const file = { ...base, category: 'delai' as const, findings: 'x', verdict: 'non_fondee' as const, defense: 'y', resultSentAt: '2026-09-24T10:00', satisfied: 'injoignable' as const };
    expect(closeBlockers(file)).toEqual(['noter les tentatives faites pour joindre le client']);
    expect(closeBlockers({ ...file, courtesyNote: '2 appels' })).toEqual([]);
    const forced = cp({ forcedClose: { by: 'Jean-Marc', at: '2026-09-25T10:00', reason: 'Interlocuteur parti' }, blockedInvoice: 500 });
    expect(complaintState(forced, now)).toBe('closed');
    expect(isClosed(forced)).toBe(true);
    expect(isBlocked(forced)).toBe(false);
    const stats = complaintStats(st({ complaints: {
      a: cp({ id: 'a', at: '2026-09-02T09:00', satisfied: 'oui', courtesyAt: '2026-09-20' }), b: cp({ id: 'b', at: '2026-09-03T09:00', satisfied: 'injoignable', courtesyAt: '2026-09-20' }),
      c: cp({ id: 'c', at: '2026-09-04T09:00', forcedClose: forced.forcedClose, atEdited: true }),
    } }), '2026-09', now);
    expect(stats).toMatchObject({ satisfiedPct: 100, unreachable: 1, forced: 1, edited: 1 });
  });

  it('asks the management to approve a credit above its limit and, if the company wants it, every answer "unjustified"', () => {
    const p = { creditLimit: 250, approveContest: true };
    expect(needsApproval(cp({ credit: 300 }), p)).toBe(true);
    expect(needsApproval(cp({ credit: 100, logistics: 100 }), p)).toBe(false);
    expect(needsApproval(cp({ verdict: 'non_fondee' }), p)).toBe(true);
    expect(needsApproval(cp({ verdict: 'non_fondee' }), { creditLimit: 250 })).toBe(false);
    expect(needsApproval(cp({ credit: 9999 }), {})).toBe(false);   // no limit = no rule
    const done = cp({ contactedAt: '2026-09-23T15:00', category: 'delai', findings: 'x', verdict: 'non_fondee', defense: 'y', resultSentAt: '2026-09-24T10:00', satisfied: 'oui' });
    expect(closeBlockers(done, false, p)).toEqual(['obtenir la validation de la direction']);
    expect(closeBlockers({ ...done, approval: { by: 'Jean-Marc', at: '2026-09-24T09:00', note: '' } }, false, p)).toEqual([]);
    const s = st({ params: { ...P, ...p }, complaints: { a: { ...done, id: 'a', satisfied: '', courtesyAt: '', pilot: 'Laurent' } } });
    expect(complaintInsights(s, now).map(i => i.key)).toContain('approval');
    expect(allTasks(s, now).find(t => t.id === 'cva')?.text).toMatch(/Valider/);
  });

  it('gives the tasks of a pilot on leave to the escalation contact, and flags a complaint without pilot', () => {
    const person = (name: string, absences: { from: string; to: string }[] = []) => ({ id: name, name, role: '', active: true, absences });
    const contact = (id: string, name: string, backupId?: string) => ({ id, name, backupId, category: 'interne', role: '', company: '', phone: '', email: '', always: false, verifiedAt: '' }) as State['contacts'][string];
    const s = st({ people: { a: person('Lucie B.', [{ from: '2026-09-24', to: '2026-09-30' }]) }, contacts: { l: contact('l', 'Lucie B.', 'm'), m: contact('m', 'Marie L.') } });
    expect(ownerToday(s, cp({ pilot: 'Lucie B.' }), '2026-09-25')).toEqual({ who: 'Marie L.', absent: true });
    expect(ownerToday(s, cp({ pilot: 'Lucie B.' }), '2026-10-05')).toEqual({ who: 'Lucie B.', absent: false });
    const withTask = { ...s, complaints: { a: cp({ id: 'a', at: '2026-09-25T08:00', pilot: 'Lucie B.' }), b: cp({ id: 'b', at: '2026-09-25T08:00', pilot: '' }) } };
    expect(allTasks(withTask, now).find(t => t.id === 'ca')).toMatchObject({ who: 'Marie L.' });
    expect(allTasks(withTask, now).find(t => t.id === 'ca')?.text).toMatch(/pilote absent/);
    expect(allTasks(withTask, now).find(t => t.id === 'cpb')?.text).toMatch(/Désigner un pilote/);
    expect(complaintInsights(withTask, now).map(i => i.key)).toContain('nopilot');
  });

  it('spots the same cause coming back, and personal data to erase after the retention period', () => {
    const mk = (id: string, at: string, over: Partial<Complaint> = {}) => cp({ id, at, processId: 'P3', category: 'qualite', verdict: 'fondee', pilot: 'Laurent', ...over });
    const s = st({ complaints: { a: mk('a', '2026-09-01T09:00'), b: mk('b', '2026-08-01T09:00'), c: mk('c', '2026-07-01T09:00'), d: mk('d', '2026-07-02T09:00', { processId: 'P5' }), e: mk('e', '2025-11-01T09:00', { verdict: 'non_fondee' }) } });
    expect(similarComplaints(s, s.complaints.a, now).map(x => x.id)).toEqual(['b', 'c']);   // not the other process, not the unjustified one
    expect(complaintInsights(s, now).find(i => i.key === 'recurring')?.text).toMatch(/3 en 6 mois/);
    const old = cp({ id: 'o', client: 'Ancien', email: 'a@b.fr', message: 'texte', photo: 'data:x', letters: { ack: 't' }, processId: 'P2', cost: 50, courtesyAt: '2019-01-10', satisfied: 'oui' });
    const t = st({ complaints: { o: old, n: cp({ id: 'n', courtesyAt: '2026-08-10', satisfied: 'oui' }) } });
    expect(dueForAnonymizing(t, now).map(x => x.id)).toEqual(['o']);
    expect(dueForAnonymizing({ ...t, params: { ...P, retentionYears: 10 } }, now)).toEqual([]);
    expect(complaintInsights(t, now).map(i => i.key)).toContain('retention');
    const clean = anonymize(old, now);
    expect(clean).toMatchObject({ client: 'Client anonymisé', email: '', message: '', processId: 'P2', cost: 50, anonymizedAt: '2026-09-25' });
    expect(clean.photo).toBeUndefined();
    expect(dueForAnonymizing(st({ complaints: { o: clean } }), now)).toEqual([]);
  });

  it('proposes the points of the business profile until the company edits its own list', () => {
    const on = (profile: string, params = P) => investigationOf({ settings: { ...st().settings, profile }, params });
    expect(on('industrie')).toBe(INVESTIGATION);
    expect(on('services').map(x => x.key)).toContain('control');
    expect(on('services').find(x => x.key === 'delivery')!.label).toMatch(/Livrable/);
    expect(on('btp').find(x => x.key === 'delivery')!.label).toMatch(/Réception du chantier/);
    expect(on('commerce')).toBe(INVESTIGATION_PRESETS.neutre);   // any other trade
    const own = [{ key: 'x', label: 'Mon point', hint: '', process: 'P2' }];
    expect(on('industrie', { ...P, investigation: own })).toBe(own);
    const s = st();
    expect(toolEmpty(s, '2.1')).toBe(true);
    expect(toolEmpty({ ...s, quotes: { q: {} as never } }, '2.1')).toBe(false);
    expect(toolEmpty(s, '1.3')).toBe(false);   // a tool the check does not know is never "empty"
  });

  it('completes an example saved before the approval and decision rules, once, and keeps the company settings', () => {
    const fresh = commercialExamples(now).complaints;
    const saved = Object.fromEntries(Object.entries(fresh).filter(([id]) => !['cp_demo_6', 'cp_demo_7', 'cp_demo_8', 'cp_demo_9'].includes(id)).map(([id, c]) => {
      const { atEdited, approval, ...rest } = c; return [id, rest as Complaint];
    }));
    const done = completeCommercialExamples({ complaints: saved, params: { ...P, creditLimit: 800 } }, now);
    expect(Object.keys(done.complaints)).toEqual(expect.arrayContaining(['cp_demo_6', 'cp_demo_7', 'cp_demo_8', 'cp_demo_9']));
    expect(done.complaints.cp_demo_1.approval?.by).toBe('Jean-Marc');
    expect(done.complaints.cp_demo_4.atEdited).toBe(true);
    expect(done.params.creditLimit).toBe(800);                   // the company's own value is kept
    expect(done.params.approveContest).toBe(true);
    expect(done.params.closedDays).toEqual(commercialExampleParams(now).closedDays);
    const again = completeCommercialExamples(done, now);
    expect(again.complaints).toBe(done.complaints);
    const { cp_demo_9: gone, ...less } = done.complaints;
    expect(completeCommercialExamples({ complaints: less, params: done.params }, now).complaints).toBe(less);   // a deleted example record stays deleted
    // the fictitious company shows an approved credit, a pending approval, an unreachable customer, a forced closing, an old file, a pilot on leave
    const ex = commercialExamples(now).complaints, p = { ...P, ...commercialExampleParams(now) };
    expect(needsApproval(ex.cp_demo_1, p) && !!ex.cp_demo_1.approval).toBe(true);
    expect(needsApproval(ex.cp_demo_3, p) && !ex.cp_demo_3.approval).toBe(true);
    expect(ex.cp_demo_6.satisfied).toBe('injoignable');
    expect(isClosed(ex.cp_demo_7) && !!ex.cp_demo_7.forcedClose).toBe(true);
    expect(dueForAnonymizing(st({ complaints: ex, params: p }), now).map(x => x.id)).toEqual(['cp_demo_8']);
    expect(complaintInsights(st({ complaints: ex, params: p }), now).map(i => i.key)).toEqual(expect.arrayContaining(['recurring', 'retention', 'approval', 'nopilot']));
  });

  it('counts the complaints per month and per cause for the trend chart', () => {
    const mk = (id: string, at: string, over: Partial<Complaint> = {}) => cp({ id, at, ...over });
    const s = st({ complaints: {
      a: mk('a', '2026-09-03T09:00', { category: 'delai', processId: 'P3' }), b: mk('b', '2026-09-20T09:00', { category: 'delai', processId: 'P2' }),
      c: mk('c', '2026-08-10T09:00', { category: 'qualite', processId: 'P5' }), d: mk('d', '2026-07-10T09:00', { category: 'qualite', processId: 'P5' }),
      e: mk('e', '2026-09-05T09:00', { category: 'facture', verdict: 'non_fondee' }), f: mk('f', '2026-06-05T09:00', { category: '' }),
      old: mk('old', '2024-01-05T09:00', { category: 'delai' }),
    } });
    const t = complaintTrend(s, '2026-09', 'motif');
    expect(t.periods).toHaveLength(12);
    expect(t.periods[0]).toBe('2025-10');
    expect(t.periods[11]).toBe('2026-09');
    expect(t.total).toBe(6);                                      // the complaint of 2024 is outside the twelve months
    expect(t.rows[11]).toMatchObject({ total: 3, parts: { delai: 2, facture: 1 } });
    expect(t.series.map(x => x.key)).toEqual(['delai', 'qualite', 'facture', 'autre']);   // fixed order, only what exists; unclassified = "autre"
    expect(t.top).toMatchObject({ key: 'delai', total: 2 });
    expect(t.last3).toBe(5);
    expect(t.before3).toBe(1);
    expect(t.changePct).toBe(400);
    const o = complaintTrend(s, '2026-09', 'origine');
    expect(o.rows[11].parts).toEqual({ P3: 1, P2: 1, non_justifiee: 1 });
    expect(o.series.map(x => x.key)).toEqual(['P2', 'P3', 'P5', 'a_qualifier', 'non_justifiee']);
    expect(complaintTrend(st(), '2026-09', 'motif')).toMatchObject({ total: 0, top: null, changePct: null });
  });

  it('gives twelve months of fictitious complaints with a story to read, always the same for a given day', () => {
    const today = new Date(2026, 9, 1), history = complaintHistory(today);
    expect(history.map(c => c.id)).toEqual(complaintHistory(today).map(c => c.id));
    expect(history.length).toBeGreaterThanOrEqual(45);
    expect(history.length).toBeLessThanOrEqual(60);
    expect(new Set(history.map(c => c.id)).size).toBe(history.length);
    expect(new Set(history.map(c => c.ref)).size).toBe(history.length);
    expect(history.every(c => c.at.slice(0, 10) <= '2026-09-25')).toBe(true);          // nothing from the last six days
    expect(history.every(c => c.pilot && c.category && c.loggedAt && c.checks && c.atEdited === false && c.ackLink === '')).toBe(true);
    expect(history.some(c => c.verdict === 'non_fondee')).toBe(true);
    expect(history.filter(c => c.verdict === 'non_fondee').every(c => !c.processId && c.defense)).toBe(true);
    const all = commercialExamples(today).complaints, s = st({ complaints: all, params: { ...P, ...commercialExampleParams(today) } });
    const t = complaintTrend(s, '2026-09', 'motif');
    expect(t.rows.filter(r => r.total > 0).length).toBeGreaterThanOrEqual(10);        // a trend, not a few dots
    expect(t.series.length).toBe(7);          // the neutral motives, the one the company added, and "autre"
    expect(Math.max(...t.rows.map(r => r.total))).toBeGreaterThanOrEqual(6);          // a visible peak
    expect(t.last3).toBeLessThan(t.before3 + 3);
    // the history does not flood the alerts: nothing open without a pilot, nothing to tell, no ack missing
    const insights = complaintInsights(s, today);
    for (const key of ['tell', 'nopilot', 'ack', 'unq', 'courtesy']) expect(insights.find(i => i.key === key)?.text || '', key).not.toMatch(/R-\d{4}-1\d\d/);   // never a record of the history
    expect(isComplaintKpi({ id: 'x', role: 'reclamations' } as never)).toBe(true);
    expect(isComplaintKpi({ id: 'kpi_reclamations' } as never)).toBe(true);
    expect(isComplaintKpi({ id: 'kpi_cnq', role: 'cnq' } as never)).toBe(false);
  });

  it('gives the history to a fictitious company saved before it existed, once, and brings the dashboard figures in line', () => {
    const today = new Date(2026, 9, 1), fresh = commercialExamples(today).complaints;
    const level5 = Object.fromEntries(Object.entries(fresh).filter(([id]) => !id.startsWith('cp_demo_h')));
    const kpi = { id: 'kpi_reclamations', role: 'reclamations' } as never;
    const typed = { '2026-01': 0, '2026-02': 1, '2026-03': 0, '2026-04': 0, '2026-05': 2, '2026-06': 7, '2026-07': 0 };   // June was typed by the company
    const base = { complaints: level5, params: { ...P, ...commercialExampleParams(today), exampleLevel: undefined }, kpis: { kpi_reclamations: kpi }, values: { kpi_reclamations: typed }, timeline: { start: '2026-01', end: '2026-12' } };
    const done = completeCommercialExamples(base, today);
    expect(Object.keys(done.complaints).filter(id => id.startsWith('cp_demo_h')).length).toBeGreaterThanOrEqual(45);
    expect(done.params.exampleLevel).toBe(11);
    const count = (p: string) => Object.values(done.complaints).filter(c => c.at.slice(0, 7) === p).length;
    expect(done.values.kpi_reclamations['2026-05']).toBe(count('2026-05'));      // still the first value of the example: replaced by what 2.3 counts
    expect(done.values.kpi_reclamations['2026-06']).toBe(7);                      // typed by the company: kept
    expect(done.values.kpi_reclamations['2026-09']).toBe(count('2026-09'));      // empty month: filled
    const again = completeCommercialExamples({ ...base, complaints: done.complaints, params: done.params, values: done.values }, today);
    expect(again.complaints).toBe(done.complaints);
    expect(again.values).toBe(done.values);
    const { cp_demo_h07: gone, ...less } = done.complaints;
    expect(completeCommercialExamples({ ...base, complaints: less, params: done.params, values: done.values }, today).complaints).toBe(less);   // a deleted record stays deleted
    // a real company is never given fictitious complaints
    const real = completeCommercialExamples({ ...base, complaints: { x: cp({ id: 'x' }) } }, today);
    expect(Object.keys(real.complaints)).toEqual(['x']);
    expect(real.params.exampleLevel).toBeUndefined();
  });

  it('lets each company define its motives of complaint, starting from a neutral list', () => {
    expect(motifsOf({}).map(m => m.key)).toEqual(['delai', 'qualite', 'facture', 'comportement', 'emballage']);
    expect(motifsOf({}).map(m => m.label).join(' ')).not.toMatch(/atelier|chantier|pièce/i);   // no trade in the neutral wording
    const own = [{ key: 'mt_a', label: 'Accès au service', slot: 0 }, { key: 'mt_b', label: 'Facturation', slot: 1 }];
    expect(motifsOf({ motifs: own })).toBe(own);
    expect(motifLabel({ motifs: own }, 'mt_b')).toBe('Facturation');
    expect(motifLabel({}, 'delai')).toMatch(/Délai/);
    expect(motifLabel({ motifs: own }, 'delai')).toMatch(/Délai/);       // an old key keeps its first wording
    expect(motifLabel({}, 'autre')).toBe('Autre');
    expect(motifLabel({}, '')).toBe('À classer');
    expect(motifLabel({}, 'inconnu')).toBe('Motif supprimé');
    // adding takes the first free colour; at most eight
    expect(freeSlot(own)).toBe(2);
    expect(freeSlot(SERIES_COLORS.map((_, i) => ({ key: `k${i}`, label: '', slot: i })))).toBe(-1);
    // removing: erased when unused, retired when complaints still use it
    expect(withoutMotif(own, 'mt_a', false).map(m => m.key)).toEqual(['mt_b']);
    expect(withoutMotif(own, 'mt_a', true).find(m => m.key === 'mt_a')).toMatchObject({ retired: true, label: 'Accès au service' });
    // back to the neutral list keeps the motives still in use, as retired ones
    const back = resetMotifs([...DEFAULT_MOTIFS, ...own], ['mt_b']);
    expect(back.map(m => m.key)).toEqual(['delai', 'qualite', 'facture', 'comportement', 'emballage', 'mt_b']);
    expect(back.find(m => m.key === 'mt_b')?.retired).toBe(true);
  });

  it('draws the chart and counts the month with the motives of the company', () => {
    const motifs = [{ key: 'mt_a', label: 'Accès au service', slot: 0 }, { key: 'mt_b', label: 'Facturation', slot: 5, retired: true }];
    const s = st({ params: { ...P, motifs }, complaints: {
      a: cp({ id: 'a', at: '2026-09-03T09:00', category: 'mt_a' }), b: cp({ id: 'b', at: '2026-09-04T09:00', category: 'mt_b' }),
      c: cp({ id: 'c', at: '2026-09-05T09:00', category: 'delai' }), d: cp({ id: 'd', at: '2026-09-06T09:00', category: 'autre' }),
    } });
    const t = complaintTrend(s, '2026-09', 'motif');
    expect(t.series.map(x => `${x.key}:${x.total}`)).toEqual(['mt_a:1', 'mt_b:1', 'autre:2']);   // a retired motive stays; an old key outside the list goes with "Autre"
    expect(t.series.find(x => x.key === 'mt_b')).toMatchObject({ label: 'Facturation', color: SERIES_COLORS[5] });   // colour kept with the motive, not with its rank
    expect(t.series.find(x => x.key === 'autre')?.color).toBe(GREY.other);
    expect(complaintStats(s, '2026-09', now).byCategory.map(x => `${x.label}:${x.n}`)).toEqual(expect.arrayContaining(['Accès au service:1', 'Facturation:1', 'Autre:1', 'Délai ou rendez-vous non tenu:1']));
    expect(closeBlockers(cp({ category: 'autre' }))).toContain('préciser le motif « autre »');
  });

  it('gives the fictitious company its own motive, once, without touching the motives of a company', () => {
    const today = new Date(2026, 9, 1), ex = commercialExamples(today).complaints;
    expect(Object.keys(ex).filter(id => id.startsWith('cp_demo_s'))).toHaveLength(4);
    expect(commercialExampleParams(today).motifs?.map(m => m.key)).toContain('securite');
    const level6 = Object.fromEntries(Object.entries(ex).filter(([id]) => !id.startsWith('cp_demo_s')));
    const base = { complaints: level6, params: { ...P, ...commercialExampleParams(today), exampleLevel: 6, motifs: undefined }, kpis: {}, values: {}, timeline: { start: '2026-01', end: '2026-12' } };
    const done = completeCommercialExamples(base, today);
    expect(Object.keys(done.complaints).filter(id => id.startsWith('cp_demo_s'))).toHaveLength(4);
    expect(done.params.exampleLevel).toBe(11);
    expect(done.params.motifs?.map(m => m.key)).toContain('securite');
    expect(completeCommercialExamples({ ...base, complaints: done.complaints, params: done.params }, today).complaints).toBe(done.complaints);
    const mine = [{ key: 'mt_a', label: 'Ma liste', slot: 0 }];
    expect(completeCommercialExamples({ ...base, params: { ...base.params, motifs: mine } }, today).params.motifs).toBe(mine);   // never overwritten
    const t = complaintTrend(st({ complaints: done.complaints, params: done.params }), '2026-09', 'motif');
    expect(t.series.find(x => x.key === 'securite')).toMatchObject({ total: 4, color: SERIES_COLORS[5] });
  });

  it('the example shows each state of the tool', () => {
    const states = Object.values(commercialExamples(now).complaints).map(c => complaintState(c, now));
    expect(new Set(states)).toEqual(new Set(['closed', 'resolved', 'late', 'to_contact', 'unsatisfied']));
  });
});

describe('2.4 end-of-job review', () => {
  const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'A', ...over });
  it('tells satisfied, unhappy and settled customers apart', () => {
    expect(feedbackState(f())).toBe('to_ask');
    expect(feedbackState(f({ q1: true, q2: true, q3: 9 }))).toBe('satisfied');
    expect(feedbackState(f({ q1: true, q2: true, q3: 9, doubt: 'Poignée' }))).toBe('satisfied');       // a reservation noted in the old way is only a note
    expect(isNegative(f({ q1: true, q2: false, q3: 8 }))).toBe(true);
    expect(feedbackState(f({ q1: false, q2: true, q3: 5 }))).toBe('unhappy');
    expect(feedbackState(f({ q1: false, q2: true, q3: 5, doubtSolvedAt: '2026-09-25' }))).toBe('settled');   // settled with the customer on a day
    expect(feedbackState(f({ q1: false, q2: true, q3: 5, complaintId: 'c' }), { complaints: { c: { courtesyAt: '2026-09-20' } as Complaint } })).toBe('settled');   // or by a closed complaint
    expect(feedbackState(f({ q1: false, q2: true, q3: 5, complaintId: 'c' }), { complaints: { c: {} as Complaint } })).toBe('unhappy');            // the complaint is not closed
  });
});

describe('examples and documents', () => {
  it('example links complaint, red bin and workshop, and gives valid PDF files', () => {
    const ex = commercialExamples(now);
    expect(ex.complaints.cp_demo_2.ncId).toBe('nc_demo_5');
    const s = st(ex);
    for (const pdf of [quotePdf(s, ex.quotes.qt_demo_2, { company: 'Atelier é', date: now, money: true })]) {
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    }
    const text = (pdf: string) => [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m => m[1].match(/../g)!.map(h => String.fromCharCode(parseInt(h, 16))).join('')).join(' ');
    expect(text(quotePdf(s, ex.quotes.qt_demo_2, { company: '', date: now, money: true }))).toMatch(/Plancher/);
    expect(text(quotePdf(s, ex.quotes.qt_demo_2, { company: '', date: now, money: false }))).not.toMatch(/Plancher|Dérogation/);   // team view
  });
});

describe('2.4 improvements', () => {
  const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'A', q1: true, q2: true, q3: 9, date: '2026-09-20', ...over });
  const dl = (over: Partial<Delivery> = {}, rec: Partial<Delivery['reception']> = {}): Delivery => ({
    id: 'd1', ref: 'CMD-1', client: 'A', item: 'Pièces', qty: 1, milestones: [], releasedBy: '', releasedAt: '',
    reception: { date: '2026-09-22', name: 'M. X', role: '', result: 'sans', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...rec }, ...over,
  });

  it('takes the two thresholds from the settings of the tool', () => {
    const q7 = f({ q3: 7 });
    expect(isNegative(q7)).toBe(false);
    expect(isNegative(q7, { unhappyMax: 7 })).toBe(true);
    expect(unhappyMaxOf({})).toBe(6);
    expect(feedbackState(q7, { complaints: {}, params: { ...P, unhappyMax: 7 } })).toBe('unhappy');
  });

  it('asks the text message questions the next morning, the others the same day', () => {
    const task = (channel: Feedback['channel']) => allTasks(st({ feedbacks: { a: f({ id: 'a', channel, q1: null, q2: null, q3: null, date: '2026-09-24' }) } }), now).find(t => t.tool === '2.4')?.due;
    expect(task('sms')).toBe('2026-09-25');
    expect(task('site')).toBe('2026-09-24');
    expect(task('autre')).toBe('2026-09-24');
  });

  it('lists the deliveries received without a review, and creates it from the reception', () => {
    const ok = deliveriesToAsk(st({ deliveries: { d1: dl() } }), now);
    expect(ok.map(d => d.id)).toEqual(['d1']);
    expect(deliveriesToAsk(st({ deliveries: { d1: dl() }, feedbacks: { a: f({ id: 'a', deliveryId: 'd1', date: '2026-01-01' }) } }), now)).toHaveLength(0);   // linked
    expect(deliveriesToAsk(st({ deliveries: { d1: dl() }, feedbacks: { a: f({ id: 'a', client: ' a ', date: '2026-09-20' }) } }), now)).toHaveLength(0);   // typed by hand, same customer within a week
    expect(deliveriesToAsk(st({ deliveries: { d1: dl() }, feedbacks: { a: f({ id: 'a', client: 'B' }) } }), now)).toHaveLength(1);                          // another customer
    expect(deliveriesToAsk(st({ deliveries: { d1: dl({}, { date: '2026-09-01' }) } }), now)).toHaveLength(0);                                              // too old to ask
    expect(deliveriesToAsk(st({ deliveries: { d1: dl({}, { result: 'refus' }), d2: dl({ id: 'd2' }, { result: '', date: '' }) } }), now)).toHaveLength(0);   // refused or not received
    const s = st({ deliveries: { d1: dl() } });
    expect(feedbackInsights(s, now).find(i => i.key === 'toask')).toBeTruthy();
    expect(allTasks(s, now).find(t => t.tool === '2.4')).toMatchObject({ focus: 'd1', due: '2026-09-22' });
    expect(toolBadge(s, '2.4', '2026-09', now)).toMatchObject({ n: 1, tone: 'warn' });
    expect(feedbackFromDelivery(dl({ quoteId: 'q1' }), now)).toMatchObject({ deliveryId: 'd1', quoteId: 'q1', client: 'A', affaire: 'CMD-1', contact: 'M. X', date: '2026-09-22' });
  });

  it('gives the average note of satisfaction and the three bands from the first answer', () => {
    const few = st({ feedbacks: { a: f({ id: 'a', q3: 10 }), b: f({ id: 'b', q3: 8 }), c: f({ id: 'c', q3: 3, q1: false }) } });
    const s = feedbackSummary(few, now);
    expect(s.avgScore).toBe(7);
    expect(s.mix).toEqual({ top: 1, mid: 1, low: 1 });
    expect(s.satisfiedPct).toBe(67);
    expect(s.unhappy).toBe(1);
    expect(s).not.toHaveProperty('nps');                                                          // the third question is satisfaction, not recommendation
    expect(scoreMix([9, 10, 7, 6, 0])).toEqual({ top: 2, mid: 1, low: 2 });
    expect(scoreMix([9, 10, 7, 6, 0], { unhappyMax: 7 })).toEqual({ top: 2, mid: 0, low: 3 });    // the bands follow the threshold of the company
    expect(scoreMix([9, 10, 8], { unhappyMax: 9 })).toEqual({ top: 1, mid: 0, low: 2 });
  });

  it('writes the aim of the company in the settings and as the target of the indicator of the dashboard', () => {
    const d = st({ processes: [{ id: 'P5', name: 'P5', color: '#000', order: 5, kpiIds: [] }] });
    expect(satisfactionTargetOf(d.params)).toBe(90);
    addSatisfactionKpi(d, 85);
    expect(d.kpis.kpi_satisfaction).toMatchObject({ targetValue: 85, target: '≥ 85 %' });
    setSatisfactionTarget(d, 95.4);
    expect(d.params.satisfactionTarget).toBe(95);
    expect(satisfactionTargetOf(d.params)).toBe(95);
    expect(d.kpis.kpi_satisfaction).toMatchObject({ targetValue: 95, target: '≥ 95 %' });
    setSatisfactionTarget(d, 500);
    expect(d.params.satisfactionTarget).toBe(100);                                                // kept between 1 and 100
    setSatisfactionTarget(d, null);
    expect(d.params.satisfactionTarget).toBeUndefined();                                          // empty: the default again, on both
    expect(d.kpis.kpi_satisfaction).toMatchObject({ targetValue: 90, target: '≥ 90 %' });
    // without the indicator in the list of the company, only the setting is written
    const bare = st();
    setSatisfactionTarget(bare, 80);
    expect(bare.params.satisfactionTarget).toBe(80);
    expect(Object.keys(bare.kpis)).toEqual([]);
  });

  it('counts the unhappy customers and those whose point is settled', () => {
    const s2 = feedbackSummary(st({ feedbacks: {
      a: f({ id: 'a' }), b: f({ id: 'b', q1: false }), c: f({ id: 'c', q2: false, doubtSolvedAt: '2026-09-21' }), d: f({ id: 'd', q3: 2, complaintId: 'k' }), e: f({ id: 'e', q1: null, q2: null, q3: null }),
    }, complaints: { k: { courtesyAt: '2026-09-22' } as Complaint } }), now);
    expect(s2).toMatchObject({ count: 5, answers: 4, toAsk: 1, unhappy: 3, settled: 2, open: 1, satisfiedPct: 25 });
  });

  it('summarises a month for the heading of the list', () => {
    const m = monthSummary([f({ id: 'a', q3: 10 }), f({ id: 'b', q3: 4 }), f({ id: 'c', q1: null, q2: null, q3: null })]);
    expect(m).toEqual({ count: 3, answers: 2, satisfiedPct: 50, avg: 7 });
    expect(monthSummary([f({ q1: null, q2: null, q3: null })])).toEqual({ count: 1, answers: 0, satisfiedPct: null, avg: null });
    expect(monthSummary([f({ q3: 7 })], { unhappyMax: 7 }).satisfiedPct).toBe(0);
  });

  it('draws twelve months of satisfaction, counting the month of delivery', () => {
    const s = st({ feedbacks: {
      a: f({ id: 'a', date: '2026-09-10', q3: 10 }), b: f({ id: 'b', date: '2026-09-12', q3: 4 }), c: f({ id: 'c', date: '2026-08-02', q3: 8 }),
      d: f({ id: 'd', date: '2026-09-20', q1: null, q2: null, q3: null }), e: f({ id: 'e', date: '2024-01-01' }),
    } });
    const t = feedbackTrend(s, '2026-09');
    expect(t.periods).toHaveLength(12);
    expect(t.periods[11]).toBe('2026-09');
    const sep = t.rows[11], aug = t.rows[10];
    expect(sep).toMatchObject({ total: 2, satisfied: 1, unhappy: 1, pct: 50, avg: 7 });        // the review not yet asked is not counted
    expect(aug).toMatchObject({ total: 1, satisfied: 1, pct: 100, avg: 8 });
    expect(t.total).toBe(3);
    expect(t.last3).toBe(7.3);
    expect(feedbackMonthPct(s, '2026-09')).toBe(50);
    expect(feedbackMonthPct(s, '2026-07')).toBeNull();
  });

  it('says why customers are unhappy and compares the promised delay with the real one', () => {
    const won = (id: string, weeks: number): Quote => ({ ...ready(), id, status: 'won', weeks, decidedAt: '2026-08-01' });
    const s = st({
      quotes: { q1: won('q1', 2), q2: won('q2', 4) },
      feedbacks: {
        a: f({ id: 'a', date: '2026-08-20', quoteId: 'q1' }),                    // promised 15/08, delivered 20/08, the customer did not notice
        b: f({ id: 'b', date: '2026-08-20', quoteId: 'q2', q2: false }),         // promised 29/08, delivered 20/08, the customer says the delay was not kept
        c: f({ id: 'c', q1: false, doubt: 'Une rayure' }),
      },
    });
    const c = feedbackCauses(s, now);
    expect(c.causes.find(x => x.key === 'q1')?.n).toBe(1);
    expect(c.causes.find(x => x.key === 'q2')?.n).toBe(1);
    expect(c.causes.find(x => x.key === 'doubt')?.n).toBe(1);
    expect(c.promise).toEqual({ linked: 2, late: 1, lateNotNoticed: 1, notLateYet: 1 });
    expect(feedbackCauses(st({ feedbacks: { a: f({ id: 'a', quoteId: 'gone' }) } }), now).promise.linked).toBe(0);   // a quote that no longer exists
  });

  it('imports answers with their date and skips what is already in the register', () => {
    const rows = [
      { client: 'A', contact: 'M. X', date: '15/09/2026', q1: 'oui', q2: 'non', q3: '8', verbatim: 'ok' },
      { client: 'B', contact: '', date: '', q1: 'oui', q2: 'oui', q3: '12', verbatim: '' },
      { client: '', contact: '', date: '', q1: '', q2: '', q3: '', verbatim: '' },
    ];
    const first = importFeedbacks(rows, [], now);
    expect(first.added).toHaveLength(2);
    expect(first.added[0]).toMatchObject({ client: 'A', date: '2026-09-15', q1: true, q2: false, q3: 8, channel: 'mail' });
    expect(first.added[1]).toMatchObject({ date: '2026-09-25', q3: 10 });                 // no date: today; the note is kept between 0 and 10
    const again = importFeedbacks(rows, first.added, now);
    expect(again.added).toHaveLength(0);
    expect(again.duplicates).toBe(2);
    expect(importFeedbacks([rows[0], rows[0]], [], now)).toMatchObject({ duplicates: 1 });   // twice in the same paste
  });

  it('offers the satisfaction of the month to the dashboard once the company follows the indicator', () => {
    const base = st({ processes: [{ id: 'P2', name: 'P2', color: '#000', order: 1, kpiIds: [] }], feedbacks: { a: f({ id: 'a', date: '2026-09-10' }) } });
    expect(feeds(base, '2026-09', now).find(x => x.tool === '2.4')).toBeUndefined();         // no indicator yet: nothing to fill
    const id = addSatisfactionKpi(base);
    expect(base.processes[0].kpiIds).toEqual([id]);
    expect(addSatisfactionKpi(base)).toBe(id);                                                // twice: the same indicator
    expect(Object.values(base.kpis).filter(isSatisfactionKpi)).toHaveLength(1);
    expect(feeds(base, '2026-09', now).find(x => x.tool === '2.4')).toMatchObject({ value: 100, kpi: { id } });
    expect(feeds(base, '2026-07', now).find(x => x.tool === '2.4')).toBeUndefined();         // a month without a review
    base.feedbacks.b = f({ id: 'b', date: '2026-07-10' });
    base.feedbacks.c = f({ id: 'c', date: '2026-08-10' });
    addSatisfactionExample(base, now);
    expect(base.values[id]['2026-07']).toBe(100);
    expect(base.values[id]['2026-08']).toBeUndefined();                                        // the last closed month and the current one are proposed by the tool, not written by the example
    expect(base.values[id]['2026-09']).toBeUndefined();
  });

  it('keeps the choice of what was asked to a customer who recommends, and reads the old yes as an online review', () => {
    expect(followOf(f())).toBe('');
    expect(followOf(f({ reviewAsked: true }))).toBe('avis');
    expect(followOf(f({ reviewAsked: true, followUp: 'temoignage' }))).toBe('temoignage');
    expect(feedbackInsights(st({ feedbacks: { a: f({ id: 'a', followUp: 'contact', reviewAsked: true }) } }), now).some(i => i.key === 'review')).toBe(false);
    expect(feedbackInsights(st({ feedbacks: { a: f({ id: 'a' }) } }), now).some(i => i.key === 'review')).toBe(true);
  });

  it('shows every state of the tool in the example, with enough answers for the score', () => {
    const d = demoState(new Date(2026, 9, 1)), today = new Date(2026, 9, 1);
    const states = Object.values(d.feedbacks).map(x => feedbackState(x, d));
    expect(new Set(states)).toEqual(new Set(['to_ask', 'unhappy', 'settled', 'satisfied']));
    const s = feedbackSummary(d, today);
    expect(s.avgScore).not.toBeNull();
    expect(s.settled).toBeGreaterThanOrEqual(5);
    expect(s.open).toBeGreaterThanOrEqual(2);
    expect(deliveriesToAsk(d, today).length).toBeGreaterThanOrEqual(1);
    expect(Object.values(d.kpis).some(isSatisfactionKpi)).toBe(true);
    expect(feedbackCauses(d, today).promise.late).toBeGreaterThanOrEqual(1);
    expect(feedbackTrend(d, '2026-09').rows.filter(r => r.total).length).toBeGreaterThanOrEqual(8);
    // the example adds no alert to the dashboard: the month in progress of the satisfaction indicator is left to the tool to propose
    expect(synthesis(d, '2026-10').alerts.some(k => isSatisfactionKpi(k))).toBe(false);
    expect(d.values.kpi_satisfaction['2026-10']).toBeUndefined();
    expect(Object.keys(d.values.kpi_satisfaction).length).toBeGreaterThanOrEqual(6);
    // the customers who recommend were asked for an online review, an introduction, a testimonial or something else
    expect(new Set(Object.values(d.feedbacks).map(x => x.followUp).filter(Boolean)).size).toBeGreaterThanOrEqual(4);
  });

  it('completes an example saved before the reviews of twelve months, once, and leaves a real company alone', () => {
    const today = new Date(2026, 9, 1), full = demoState(today);
    const old = Object.fromEntries(Object.entries(full.feedbacks).filter(([id]) => Number(id.replace('fb_demo_', '')) <= 5).map(([id, x]) => [id, id === 'fb_demo_1' || id === 'fb_demo_2' ? { ...x, deliveryId: undefined, quoteId: undefined } : x]));
    const { qt_demo_7: _q, ...quotes } = full.quotes;
    const kpis = Object.fromEntries(Object.entries(full.kpis).filter(([, k]) => !isSatisfactionKpi(k)));
    const processes = full.processes.map(p => ({ ...p, kpiIds: p.kpiIds.filter(id => kpis[id]) }));
    const base = { complaints: full.complaints, params: { ...full.params, exampleLevel: 7, reviewLink: undefined }, feedbacks: old, quotes, kpis, processes, values: full.values, timeline: full.timeline };
    const done = completeCommercialExamples(base, today);
    expect(done.params.exampleLevel).toBe(11);
    expect(done.params.reviewLink).toBeTruthy();
    expect('deliveries' in done).toBe(false);                                                  // the orders come with tool 3.4 (completeReceptionExamples), not with 2.4
    expect(done.feedbacks!.fb_demo_4.q1Detail).toBeTruthy();                                   // the details given to the first reviews of the example
    expect(done.feedbacks!.fb_demo_12.doubtSolvedAt).toBeTruthy();                             // and the day an old unhappy customer was settled with (no invoice any more to close it)
    expect(feedbackState(done.feedbacks!.fb_demo_12, { complaints: {} })).toBe('settled');
    expect(Object.keys(done.feedbacks!)).toHaveLength(Object.keys(full.feedbacks).length);
    expect(Object.keys(full.feedbacks).length).toBeGreaterThanOrEqual(45);
    expect(done.feedbacks!.fb_demo_2).toMatchObject({ deliveryId: 'dl_demo_2', quoteId: 'qt_demo_7' });
    expect(done.quotes!.qt_demo_7).toBeTruthy();
    expect(Object.values(done.kpis!).filter(isSatisfactionKpi)).toHaveLength(1);
    expect(done.processes!.flatMap(p => p.kpiIds)).toContain('kpi_satisfaction');
    expect(base.processes.flatMap(p => p.kpiIds)).not.toContain('kpi_satisfaction');         // the input is not modified
    const again = completeCommercialExamples({ ...base, params: done.params, feedbacks: done.feedbacks, quotes: done.quotes, kpis: done.kpis, processes: done.processes, values: done.values }, today);
    expect(again.feedbacks).toBe(done.feedbacks);
    expect(again.quotes).toBe(done.quotes);
    // what the company edited is kept: a review whose link it removed keeps no link
    const edited = completeCommercialExamples({ ...base, feedbacks: { ...old, fb_demo_1: { ...old.fb_demo_1, quoteId: 'qt_demo_3' } } }, today);
    expect(edited.feedbacks!.fb_demo_1.quoteId).toBe('qt_demo_3');
    // a real company is never given fictitious reviews
    const real = completeCommercialExamples({ ...base, complaints: { x: { id: 'x' } as Complaint }, feedbacks: {} }, today);
    expect(real.feedbacks).toEqual({});
  });
});

describe('2.4 details under a "no" and the e-mail to the customer', () => {
  const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'A', q1: true, q2: true, q3: 9, date: '2026-09-20', ...over });

  it('keeps what was wrong for each negative answer only, and tells it in the alert, the list and the task', () => {
    const x = f({ q1: false, q1Detail: ' Teinte différente ', q2: true, q2Detail: 'ancien détail', q3: 4, q3Detail: 'Un défaut visible', doubt: 'Réserve notée avant' });
    expect(detailsOf(x)).toEqual(['Teinte différente', 'Un défaut visible', 'Réserve notée avant']);          // the detail of a "yes" is ignored
    expect(detailsOf(f({ q3: 7, q3Detail: 'Note passable' }))).toEqual([]);
    expect(detailsOf(f({ q3: 7, q3Detail: 'Note passable' }), { unhappyMax: 7 })).toEqual(['Note passable']);
    const s = st({ feedbacks: { a: { ...x, id: 'a' } } });
    expect(feedbackInsights(s, now).find(i => i.key === 'neg')?.text).toContain('Teinte différente');
    expect(allTasks(s, now).find(t => t.tool === '2.4')).toMatchObject({ text: 'Régler avec A : Teinte différente', focus: 'a' });
    // a complaint has its own tasks in 2.3: no second one here
    expect(allTasks(st({ feedbacks: { a: { ...x, id: 'a', complaintId: 'c' } } }), now).filter(t => t.tool === '2.4')).toHaveLength(0);
    // settled with the customer: nothing left to do
    expect(allTasks(st({ feedbacks: { a: { ...x, id: 'a', doubtSolvedAt: '2026-09-21' } } }), now).filter(t => t.tool === '2.4')).toHaveLength(0);
  });

  it('lists the recent details of each cause for the chart', () => {
    const s = st({ feedbacks: {
      a: f({ id: 'a', date: '2026-09-01', q1: false, q1Detail: 'Ancien défaut' }), b: f({ id: 'b', date: '2026-09-10', q1: false, q1Detail: 'Teinte', client: 'B' }),
      c: f({ id: 'c', date: '2026-09-12', q1: false, q1Detail: 'Rayure', client: 'C' }), d: f({ id: 'd', date: '2026-09-15', q1: false, client: 'D' }),
    } });
    const q1 = feedbackCauses(s, now).causes.find(x => x.key === 'q1')!;
    expect(q1.n).toBe(4);
    expect(q1.examples).toEqual(['C : Rayure', 'B : Teinte']);                                 // the two most recent that have a detail
  });

  it('writes the e-mail from the model, or from the text of the company', () => {
    const x = f({ contact: 'Mme Perrin', affaire: 'Cloison', email: ' mme@perrin.example ' });
    const m = feedbackMail(x, 'Atelier', P);
    expect(m.to).toBe('mme@perrin.example');
    expect(m.subject).toBe('Votre avis sur Cloison');
    expect(m.body).toContain('Bonjour Mme Perrin,');
    expect(m.body).toContain('1. Le livrable répond-il exactement à votre cahier des charges ? (oui / non)');
    expect(m.body).toContain('3. Sur une échelle de 0 à 10');
    expect(m.body).toContain('3. Sur une échelle de 0 à 10, à combien êtes-vous satisfait de ce qui vous a été livré ? (0 : très bas, 10 : très haut)');   // the scale is in the question
    expect(m.body).toContain('Il suffit de répondre directement à ce message.');
    expect(m.body).not.toMatch(/\n{3,}/);
    expect(m.body.endsWith('Merci d\'avance,\nAtelier')).toBe(true);
    expect(feedbackMail(f(), 'Atelier', P).subject).toBe('Votre avis sur notre travail ensemble');
    expect(feedbackMail(f(), 'Atelier', P).body.startsWith('Bonjour,')).toBe(true);           // no contact name: no dangling space before the comma
    // the company's own text, with its tokens; the questions are the ones the company wrote
    const own = feedbackMail(x, 'Atelier', { ...P, questions: ['Êtes-vous satisfait ?', '', ''], mailSubject: 'Un mot sur {affaire}', mailBody: 'Cher {contact},\n{questions}\n-- {entreprise}' });
    expect(own.subject).toBe('Un mot sur Cloison');
    expect(own.body).toBe('Cher Mme Perrin,\n1. Êtes-vous satisfait ? (oui / non)\n2. La livraison et les délais ont-ils été respectés comme convenu ? (oui / non)\n3. Sur une échelle de 0 à 10, à combien êtes-vous satisfait de ce qui vous a été livré ? (0 : très bas, 10 : très haut)\n-- Atelier');
    expect(MAIL_BODY_MODEL).not.toContain('{lien}');                                              // no online form any more
    // the short text of a text message asks the same three questions
    expect(reviewMessage(x, 'Atelier', P)).toContain('3. De 0 (très bas) à 10 (très haut), à combien êtes-vous satisfait de ce qui vous a été livré ?');
    expect(reviewMessage(x, 'Atelier', P)).not.toContain('recommand');
  });
});

describe('2.4 measures satisfaction only', () => {
  it('has the satisfaction indicator in every model of the dashboard, next to the complaints, like tool 2.3', () => {
    (['industrie', 'btp', 'services'] as const).forEach(profile => {
      const b = blankState(profile, now);
      const k = Object.values(b.kpis).find(isSatisfactionKpi);
      expect(k, profile).toMatchObject({ id: 'kpi_satisfaction', role: 'satisfaction', unit: '%', direction: 'higher', targetValue: 90 });
      const p = b.processes.find(x => x.kpiIds.includes('kpi_satisfaction'))!;
      expect(p.kpiIds.indexOf('kpi_satisfaction')).toBe(p.kpiIds.indexOf('kpi_reclamations') + 1);
    });
    const d = demoState(now);
    expect(d.kpis.kpi_satisfaction.role).toBe('satisfaction');
    expect(Object.keys(d.values.kpi_satisfaction).length).toBeGreaterThanOrEqual(6);
    // a company whose list was made before gets it in P5 with the button of the tool, once
    const old = st({ processes: [{ id: 'P5', name: 'P5', color: '#000', order: 5, kpiIds: [] }] });
    expect(addSatisfactionKpi(old)).toBe('kpi_satisfaction');
    expect(old.processes[0].kpiIds).toEqual(['kpi_satisfaction']);
  });

  it('keeps no trace of invoicing: no invoice state, task, alert or setting', () => {
    const s = st({ feedbacks: { a: { ...newFeedback(now), id: 'a', client: 'A', q1: true, q2: true, q3: 9, date: '2026-09-20', invoicedAt: '', paidAt: '' } as Feedback } });
    expect(feedbackState(s.feedbacks.a, s)).toBe('satisfied');
    expect(allTasks(s, now).filter(t => t.tool === '2.4')).toHaveLength(0);
    expect(feedbackInsights(s, now).map(i => i.key)).toEqual(['review']);
    expect(Object.keys(feedbackSummary(s, now))).not.toEqual(expect.arrayContaining(['toInvoice', 'avgInvoiceDays', 'avgPayDays', 'inTimePct']));
    expect(toolBadge(s, '2.4', '2026-09', now)).toMatchObject({ n: 0, tone: 'ok', text: 'Clients satisfaits' });
    // an unhappy customer is the only reason for an alert; a review to ask only a reminder
    expect(toolBadge({ ...s, feedbacks: { b: { ...s.feedbacks.a, id: 'b', q1: false } } }, '2.4', '2026-09', now)).toMatchObject({ n: 1, tone: 'alert' });
    expect(toolBadge({ ...s, feedbacks: { b: { ...s.feedbacks.a, id: 'b', q1: null } } }, '2.4', '2026-09', now)).toMatchObject({ n: 1, tone: 'warn' });
  });
});

describe('2.3 and 2.4 read the orders of tool 3.4', () => {
  const rec = (over: Partial<Reception> = {}): Reception => ({ date: '2026-09-22', name: 'M. X', role: '', result: 'sans', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...over });
  const order = (over: Partial<Delivery> = {}, re: Partial<Reception> = {}): Delivery => ({ id: 'd1', ref: 'CMD-1', client: 'A', item: 'Pièces', qty: 10, milestones: [], releasedBy: '', releasedAt: '', reception: rec(re), ...over });
  const lot = (re: Partial<Reception>, id = 'lt1'): Lot => ({ id, no: 1, closedAt: '2026-09-12T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: rec(re) });
  const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'A', q1: true, q2: true, q3: 9, date: '2026-09-20', ...over });

  it('counts every delivery of the month once: the closed lots and the one under way, archived orders included, a refusal not', () => {
    const many = order({ id: 'a', lots: [lot({ date: '2026-09-05', qty: 4 }), lot({ date: '2026-09-08', result: 'refus' }, 'lt2'), lot({ date: '2026-08-30', qty: 1 }, 'lt3')], archivedAt: '2026-09-30T10:00' }, { date: '2026-09-22' });
    const noResult = order({ id: 'b', client: 'B' }, { date: '2026-09-23', result: '' });                       // delivered, the PV is still to be signed
    const s = st({ deliveries: { a: many, b: noResult } });
    expect(deliveriesOf(s, '2026-09')).toBe(3);
    expect(deliveriesOf(s, '2026-08')).toBe(1);
    expect(deliveriesOf(s, '2026-07')).toBe(0);
    expect(deliveriesOf(st({ deliveries: { a: many }, params: { ...P, monthDeliveries: { '2026-09': 40 } } }), '2026-09')).toBe(40);   // the figure typed in the settings wins
    expect(complaintStats(s, '2026-09', now).deliveries).toBe(3);
  });

  it('asks for the review of an order received, in whole or in part, but not of an archived one, a refusal, or an order without outcome', () => {
    const ids = (ds: Record<string, Delivery>, fbs: Record<string, Feedback> = {}) => deliveriesToAsk(st({ deliveries: ds, feedbacks: fbs }), now).map(d => d.id);
    const o = (id: string, over: Partial<Delivery> = {}, re: Partial<Reception> = {}) => order({ id, client: `Client ${id}`, ...over }, re);
    expect(ids({ ok: o('ok') })).toEqual(['ok']);
    expect(ids({ x: o('x', { archivedAt: '2026-09-23T10:00' }) })).toEqual([]);                                      // archived
    expect(ids({ x: o('x', {}, { result: 'refus' }) })).toEqual([]);                                               // refused, no new delivery
    expect(ids({ x: o('x', {}, { result: '' }) })).toEqual([]);                                                    // delivered without outcome
    expect(ids({ x: o('x', { lots: [lot({ date: '2026-09-15', result: 'refus' })] }, { date: '', result: '' }) })).toEqual([]);                      // refused, the next delivery not made yet
    expect(ids({ x: o('x', { lots: [lot({ date: '2026-09-15', result: 'refus' })] }, { date: '2026-09-23', result: '' }) })).toEqual([]);          // the new delivery has no outcome yet
    expect(ids({ x: o('x', { lots: [lot({ date: '2026-09-15', result: 'refus' })] }, { date: '2026-09-23' }) })).toEqual(['x']);                    // refused, then presented again and received
    expect(ids({ x: o('x', { lots: [lot({ date: '2026-09-20', qty: 4 })] }, { date: '', result: '' }) })).toEqual(['x']);                           // received in part (closed lot), the rest to come
    expect(ids({ x: o('x', {}, { qty: 4 }) })).toEqual(['x']);                                                                                     // received in part, the current delivery
    expect(ids({ x: o('x', {}, { date: '2026-09-01' }) })).toEqual([]);                                                                            // too old
    expect(ids({ ok: o('ok') }, { a: f({ id: 'a', deliveryId: 'ok', date: '2026-01-01' }) })).toEqual([]);                                         // already linked
    expect(deliveriesToAsk(st({ deliveries: { a: o('a', {}, { date: '2026-09-20' }), b: o('b') } }), now).map(d => d.id)).toEqual(['b', 'a']);    // the latest reception first
    expect(receivedOn(o('x', { lots: [lot({ date: '2026-09-20' })] }, { date: '', result: '' }))).toBe('2026-09-20');
  });

  it('writes the review from the delivery that was received, with the card and the e-mail of the person who received', () => {
    const d = order({ quoteId: 'q1' }, { email: 'x@client.fr', orgId: 'o1', contactId: 'c1' });
    expect(feedbackFromDelivery(d, now)).toMatchObject({ deliveryId: 'd1', quoteId: 'q1', client: 'A', affaire: 'CMD-1', contact: 'M. X', date: '2026-09-22', email: 'x@client.fr', orgId: 'o1', contactId: 'c1' });
    const bare = feedbackFromDelivery(order(), now);
    expect(bare).not.toHaveProperty('email');
    expect(bare).not.toHaveProperty('orgId');
    // the delivery received is in a closed lot: its person and day, not the empty delivery under way
    const inLot = order({ lots: [lot({ date: '2026-09-20', name: 'Mme Lot' })] }, { date: '', name: '', result: '' });
    expect(feedbackFromDelivery(inLot, now)).toMatchObject({ contact: 'Mme Lot', date: '2026-09-20' });
  });

  it('measures the delay against the day promised in the order when the review is linked to one, else against the quote', () => {
    const won = (id: string, weeks: number): Quote => ({ ...ready(), id, status: 'won', weeks, decidedAt: '2026-08-01' });
    const s = st({
      quotes: { q1: won('q1', 4) },                                                                                   // promised 29/08 by the quote
      deliveries: { d1: order({ id: 'd1', promisedAt: '2026-08-15' }, { date: '2026-08-20' }), d2: order({ id: 'd2' }, { date: '2026-08-20' }), d3: order({ id: 'd3', promisedAt: '2026-08-30' }, { date: '2026-08-20' }) },   // received on 20/08 (the day of the reception is the one compared, L-5)
      feedbacks: {
        a: f({ id: 'a', date: '2026-08-20', quoteId: 'q1', deliveryId: 'd1' }),                                       // order: promised 15/08, delivered 20/08: late (the quote alone would say on time)
        b: f({ id: 'b', date: '2026-08-20', quoteId: 'q1', deliveryId: 'd2' }),                                       // order without a date: the quote answers, on time
        c: f({ id: 'c', date: '2026-08-20', deliveryId: 'd3', q2: false }),                                           // no quote: the order alone, on time, the customer says otherwise
        e: f({ id: 'e', date: '2026-08-20' }),                                                                        // nothing to compare with
      },
    });
    expect(feedbackCauses(s, now).promise).toEqual({ linked: 3, late: 1, lateNotNoticed: 1, notLateYet: 1 });
  });

  it('puts aside a reception that is put off by a blocking reservation: no review to ask, no delivery received (L-8)', () => {
    const blocking = (over: Partial<ReceptionReserve> = {}): ReceptionReserve => ({ id: 'r1', text: 'Fuite', raisedAt: '2026-09-22', severity: 'blocking', ...over });
    const off = order({ id: 'p', client: 'P' }, { result: 'reserve', reserves: [blocking()] });
    const lifted = order({ id: 'p', client: 'P' }, { result: 'reserve', reserves: [blocking({ liftedAt: '2026-09-23' })] });
    const minor = order({ id: 'p', client: 'P' }, { result: 'reserve', reserves: [blocking({ severity: 'minor' })] });
    const ids = (d: Delivery) => deliveriesToAsk(st({ deliveries: { [d.id]: d } }), now).map(x => x.id);
    expect(ids(off)).toEqual([]);                                                                       // the PV says "reportée": nothing was received
    expect(ids(lifted)).toEqual(['p']);                                                                  // the reservation is lifted: received
    expect(ids(minor)).toEqual(['p']);                                                                   // a minor one does not put the reception off
    expect(ids(order({ id: 'q', client: 'Q', lots: [lot({ date: '2026-09-20', result: 'reserve', reserves: [blocking()] })] }, { date: '', result: '' }))).toEqual([]);   // closed lot put off
    expect(receivedOn(off)).toBe('');
    expect(receivedOn(lifted)).toBe('2026-09-22');
    expect(deliveriesOf(st({ deliveries: { p: off } }), '2026-09')).toBe(0);
    expect(deliveriesOf(st({ deliveries: { p: lifted } }), '2026-09')).toBe(1);
    const s = st({ deliveries: { p: off } });
    expect(feedbackInsights(s, now).find(i => i.key === 'toask')).toBeUndefined();
    expect(allTasks(s, now).find(t => t.tool === '2.4')).toBeUndefined();
  });

  it('reads the promised day in one place and compares it with the day of the reception, in the sheet, the trend and the indicator of 3.4 (L-5)', () => {
    const won = (weeks: number): Quote => ({ ...ready(), id: 'q1', status: 'won', weeks, decidedAt: '2026-08-01' });
    // the review is dated 2 days after the delivery (it was written later): 27/08 delivered, promised 27/08 by the order (the quote, revised to 10 weeks, says 10/10)
    const s = st({
      quotes: { q1: won(10) },
      deliveries: { d1: order({ id: 'd1', promisedAt: '2026-08-27', quoteId: 'q1' }, { date: '2026-08-27' }), d2: order({ id: 'd2', quoteId: 'q1' }, { date: '2026-08-27' }), d3: order({ id: 'd3', promisedAt: '2026-08-20' }, { date: '2026-08-27' }) },
      feedbacks: {
        a: f({ id: 'a', date: '2026-08-29', deliveryId: 'd1', quoteId: 'q1' }),   // on time: the day of the reception counts, not the day of the review
        b: f({ id: 'b', date: '2026-08-19', deliveryId: 'd3' }),                  // review dated before the reception: late all the same, the reception is on 27/08 for a promise on 20/08
        c: f({ id: 'c', date: '2026-08-29', deliveryId: 'd2', quoteId: 'q1' }),   // order without a day: the quote (10 weeks: 10/10), on time
      },
    });
    expect(promiseFact(s, s.feedbacks.a)).toEqual({ promised: '2026-08-27', done: '2026-08-27', late: false });
    expect(promiseFact(s, s.feedbacks.b)).toEqual({ promised: '2026-08-20', done: '2026-08-27', late: true });
    expect(promiseFact(s, s.feedbacks.c)).toEqual({ promised: '2026-10-10', done: '2026-08-27', late: false });
    expect(promiseFact(s, { ...s.feedbacks.a, deliveryId: undefined })).toEqual({ promised: '2026-10-10', done: '2026-08-29', late: false });   // no order: the quote of the review and its own day
    expect(promiseFact(s, f({ id: 'z', deliveryId: 'gone' }))).toBeNull();
    expect(feedbackCauses(s, now).promise).toMatchObject({ linked: 3, late: 1 });                                                       // the trend says what the sheet says
    // the indicator of 3.4 reads the same promised day and the same reception day
    const fbs = Object.values(s.feedbacks), late = fbs.filter(x => promiseFact(s, x)?.late).length;
    expect(receptionKpiValue(s, 'recep_promised' as never, '2026-08', now)).toBe(Math.round((fbs.length - late) / fbs.length * 100));
  });

  it('says the acceptance report of an order as a fact', () => {
    expect(pvFact(order({}, { pvNo: 'PV-2026-014' }))).toBe('PV n° PV-2026-014 du 22/09/2026 : sans réserve');
    expect(pvFact(order({}, { result: 'reserve', reserves: [{ id: 'r1', text: 'Rayure', raisedAt: '2026-09-22' }, { id: 'r2', text: 'Cale', raisedAt: '2026-09-22' }] }))).toBe('PV du 22/09/2026 : avec 2 réserves');
    expect(pvFact(order({}, { result: 'reserve', reserves: [{ id: 'r1', text: 'Rayure', raisedAt: '2026-09-22' }] }))).toMatch(/avec 1 réserve$/);
    expect(pvFact(order({}, { result: 'reserve', reserve: 'Rayure' }))).toMatch(/avec 1 réserve$/);                  // the single reservation of the first versions
    expect(pvFact(order({}, { result: 'refus' }))).toMatch(/livraison refusée$/);
    expect(pvFact(order({ lots: [lot({ date: '2026-09-15', pvNo: 'PV-2026-009', result: 'reserve', reserves: [{ id: 'r', text: 'x', raisedAt: '2026-09-15' }] })] }, { date: '', result: '' }))).toBe('PV n° PV-2026-009 du 15/09/2026 : avec 1 réserve');
    expect(pvFact(order({}, { result: '', date: '' }))).toBe('');
  });

  it('opens the latest order of the customer from the investigation, by the id of the order', () => {
    const s = st({ deliveries: {
      old: order({ id: 'old', ref: 'CMD-1' }, { date: '2026-09-10' }),
      next: order({ id: 'next', ref: 'CMD-2', lots: [lot({ date: '2026-09-20' })] }, { date: '', result: '' }),   // received in part in a closed lot, the next delivery under way
      other: order({ id: 'other', client: 'B' }),
    } });
    const files = clientFiles(s, { ...newComplaint(st(), '', now), client: 'a' }).filter(x => x.tool === '3.4');
    expect(files.map(x => x.id)).toEqual(['next', 'old']);
  });

  it('reads the customer of a complaint by the words of its name, as 1.3, 2.4 and 3.4 do (L-4)', () => {
    const s = st({
      quotes: { q: { id: 'q', ref: 'DEV-1', client: 'client a', object: 'Rampe', date: '2026-01-01' } as never },
      deliveries: { d: order({ id: 'd', client: 'Client A' }) },
      ncs: { n: { id: 'n', ref: 'NC-1', item: 'Rampe, Client A', description: 'Cote', at: '2026-09-11T10:00' } as never, m: { id: 'm', ref: 'NC-2', item: 'Client Aston', description: 'x', at: '2026-09-11T10:00' } as never },
      feedbacks: { f: f({ id: 'f', client: 'CLIENT A', affaire: 'Rampe' }) },
    });
    // the name of the organisation of the directory, as the lists propose it: it found nothing before
    const files = clientFiles(s, { ...newComplaint(st(), '', now), client: 'Client A (grand compte)' });
    expect(files.map(x => `${x.tool}:${x.id}`)).toEqual(['2.1:q', '3.4:d', '5.1:n', '2.4:f']);               // not the red-bin text of "Client Aston"
  });

  it('cites the order the complaint is about, chosen from every order of the customer, and none when none is chosen (L-4)', () => {
    const s = st({ deliveries: {
      a: order({ id: 'a', ref: 'CMD-1', item: 'Châssis' }, { date: '2026-08-27', pvNo: 'PV-2026-002' }),
      b: order({ id: 'b', ref: 'CMD-2', item: 'Supports moteur' }, { date: '2026-09-10', result: 'reserve', reserve: 'Rayure' }),
      c: order({ id: 'c', ref: 'CMD-3', item: 'Garde-corps', archivedAt: '2026-09-20T10:00' }, { date: '2026-07-01' }),
      d: order({ id: 'd', ref: 'CMD-4', item: 'Rampe', client: 'Client A' }, { date: '2026-06-01' }),
      z: order({ id: 'z', ref: 'CMD-9', client: 'Autre' }),
    } });
    const c = { ...newComplaint(st(), '', now), client: 'A', affaire: 'Supports moteur, lot 1' };
    expect(complaintDelivery(s, c)).toBeUndefined();                                                        // the text of the "affaire" chooses nothing: no PV is cited
    expect(complaintChoices(s, c).map(x => x.id)).toEqual(['b', 'a', 'c']);                                  // all of them (the old list stopped at 3), the one received last first, archived included
    expect(complaintChoices(s, { ...c, client: 'Client A (grand compte)' }).map(x => x.id)).toEqual(['d']);     // another customer's orders are not mixed in
    const chosen = complaintDelivery(s, { ...c, deliveryId: 'b' });
    expect(chosen?.id).toBe('b');
    expect(pvFact(chosen!)).toBe('PV du 10/09/2026 : avec 1 réserve');
    expect(complaintDelivery(s, { ...c, deliveryId: 'gone' })).toBeUndefined();                              // an order deleted since
    expect(complaintDelivery(s, { ...c, deliveryId: '__proto__' })).toBeUndefined();
    // an order chosen before the customer was renamed stays in the list
    expect(complaintChoices(s, { ...c, client: 'Autre', deliveryId: 'a' }).map(x => x.id)).toEqual(['z', 'a']);
  });

  it('gives back the review of an order that already has one, never a second (L-12)', () => {
    const d = order({ id: 'dd' });
    const first = feedbackOfDelivery(st(), d, now);
    expect(first.isNew).toBe(true);
    expect(first.f).toMatchObject({ deliveryId: 'dd', client: 'A' });
    const again = feedbackOfDelivery(st({ feedbacks: { [first.f.id]: first.f } }), d, now);   // a second device, an address kept in a message
    expect(again.isNew).toBe(false);
    expect(again.f.id).toBe(first.f.id);
    expect(feedbackOfDelivery(st({ feedbacks: { x: f({ id: 'x', deliveryId: 'other' }) } }), d, now).isNew).toBe(true);
    // the organisation and the person of the order are carried when the reception does not hold them
    expect(feedbackFromDelivery(order({ orgId: 'o1', contactId: 'c1' }), now)).toMatchObject({ orgId: 'o1', contactId: 'c1' });
    // said as a fact, not as an order
    const text = feedbackInsights(st({ deliveries: { d } }), now).find(x => x.key === 'toask')!.text;
    expect(text).toContain('reçue sans que les 3 questions aient été posées');
    expect(text).not.toMatch(/Créer/);
  });

  it('writes the number of deliveries typed for a month, and goes back to the count of 3.4 without writing 0 (L-17)', () => {
    const s = st({ deliveries: { a: order({ id: 'a' }, { date: '2026-09-05' }), b: order({ id: 'b' }, { date: '2026-09-07' }) } });
    expect(deliveriesCounted(s, '2026-09')).toBe(2);
    setMonthDeliveries(s, '2026-09', 40);
    expect(deliveriesOf(s, '2026-09')).toBe(40);
    expect(deliveriesCounted(s, '2026-09')).toBe(2);                                                         // the count stays available to be shown
    setMonthDeliveries(s, '2026-08', 7);
    setMonthDeliveries(s, '2026-09', null);                                                                  // "Revenir au calcul", or the box emptied
    expect(s.params.monthDeliveries).toEqual({ '2026-08': 7 });                                              // the key is gone, no 0 written
    expect(deliveriesOf(s, '2026-09')).toBe(2);
    expect(complaintStats(s, '2026-09', now).deliveries).toBe(2);
    setMonthDeliveries(s, '2026-09', 0);                                                                     // a typed 0 stays a 0
    expect(deliveriesOf(s, '2026-09')).toBe(0);
  });
});
