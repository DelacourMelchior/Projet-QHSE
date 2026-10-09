// Tool 2.4 by customer, linked with the directory (1.3).
import { describe, expect, it } from 'vitest';
import type { Complaint, Contact, Delivery, Feedback, Reception, State } from './types';
import { addClientToDirectory, clientReceptions, clientRecords, clientSummaries, clientSummary, directoryOfClient, feedbackForClient, orgFor, ordersCiting, peopleToAdd, receptionsLabel, renameOrgOrders, sameClient, sortClients } from './clients';
import { candidates } from './contacts';
import { newFeedback } from './commercial';
import { commercialExamples, completeCommercialExamples } from './commercialExamples';
import { demoState } from './templates';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: 'Atelier', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const f = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'Client A', q1: true, q2: true, q3: 9, date: '2026-09-10', ...over });
const card = (over: Partial<Contact>): Contact => ({ id: 'c', category: 'client', name: 'M. Durand', role: '', company: 'Client A (grand compte)', phone: '', email: '', always: false, verifiedAt: '', ...over });

describe('2.4 by customer', () => {
  it('groups the reviews by customer, whatever the way the name is written, and sums each up', () => {
    const s = st({
      feedbacks: {
        a: f({ id: 'a', date: '2026-09-10', q3: 10 }), b: f({ id: 'b', date: '2026-08-01', client: 'Client A (grand compte)', q1: false, q3: 4, doubtSolvedAt: '2026-08-02' }),
        c: f({ id: 'c', date: '2026-07-01', q3: 3, q2: false }), d: f({ id: 'd', date: '2026-09-20', q1: null, q2: null, q3: null }), e: f({ id: 'e', client: 'BâtiPro', q3: 8 }),
        n: f({ id: 'n', client: '  ' }),
      },
    });
    const all = clientSummaries(s);
    expect(all.map(c => c.name)).toEqual(['BâtiPro', 'Client A']);                                       // sorted by name, the newest spelling, no customer without a name
    const a = all[1];
    expect(a).toMatchObject({ count: 4, answers: 3, satisfiedPct: 33, avg: 5.7, unhappy: 2, settled: 1, open: 1, last: '2026-09-20', lastScore: 10 });
    expect(a.feedbacks.map(x => x.id)).toEqual(['d', 'a', 'b', 'c']);                                      // newest first
    expect(clientSummary('Client Z', [], s)).toMatchObject({ count: 0, satisfiedPct: null, avg: null, lastScore: null, last: '' });
    expect(sameClient('Client A', 'client a (grand compte)')).toBe(true);
    expect(sameClient('', '')).toBe(false);
    // the threshold of the company changes who is unhappy
    expect(clientSummaries({ ...s, params: { ...s.params, unhappyMax: 9 } })[0]).toMatchObject({ name: 'BâtiPro', unhappy: 1 });
  });

  it('puts first the customers to watch', () => {
    const s = st({ feedbacks: {
      a: f({ id: 'a', client: 'Alpha', q3: 10 }), b: f({ id: 'b', client: 'Bravo', q3: 3 }), c: f({ id: 'c', client: 'Charlie', q1: false, q3: 4 }),
      d: f({ id: 'd', client: 'Delta', q1: null, q2: null, q3: null }), e: f({ id: 'e', client: 'Echo', q3: 8 }),
    } });
    const list = clientSummaries(s);
    expect(sortClients(list, 'name').map(c => c.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);
    // a point still to settle first (both Bravo and Charlie have one), the lowest share satisfied, the ones without answer last
    expect(sortClients(list, 'watch').map(c => c.name)).toEqual(['Bravo', 'Charlie', 'Echo', 'Alpha', 'Delta']);
  });

  it('finds what the directory holds for a customer: its organisation and its customer cards only', () => {
    const s = st({
      orgs: { o: { id: 'o', name: 'Client A (grand compte)', category: 'client', phone: '04 00', email: '', address: '', reference: 'F-20331' }, p: { id: 'p', name: 'Aciers', category: 'fournisseur', phone: '', email: '', address: '', reference: '' } },
      contacts: { c1: card({ id: 'c1', name: 'Mme Z' }), c2: card({ id: 'c2', name: 'M. Durand' }), c3: card({ id: 'c3', category: 'fournisseur', name: 'Commercial', company: 'Client A' }), c4: card({ id: 'c4', category: 'interne', company: 'Interne' }) },
    });
    const d = directoryOfClient(s, 'Client A');
    expect(d.org?.reference).toBe('F-20331');
    expect(d.contacts.map(c => c.id)).toEqual(['c2', 'c1']);                                              // by name; the supplier and the colleague are not customers
    expect(directoryOfClient(s, 'Client B')).toEqual({ org: undefined, contacts: [] });
    expect(directoryOfClient({}, 'Client A')).toEqual({ org: undefined, contacts: [] });
  });

  it('lists what the other tools hold for the customer', () => {
    const s = st({
      quotes: { q1: { id: 'q1', client: 'Client A', date: '2026-01-01' } as never, q2: { id: 'q2', client: 'client a (x)', date: '2026-05-01' } as never, q3: { id: 'q3', client: 'Autre', date: '2026-06-01' } as never },
      complaints: { k: { id: 'k', client: 'Client A', at: '2026-08-01T10:00' } as Complaint },
      deliveries: { d: { id: 'd', client: 'Client A', reception: { date: '2026-09-01' } } as never },
    });
    const r = clientRecords(s, 'Client A');
    expect(r.quotes.map(x => x.id)).toEqual(['q2', 'q1']);
    expect(r.complaints).toHaveLength(1);
    expect(r.deliveries).toHaveLength(1);
    expect(clientRecords(s, 'Autre').quotes).toHaveLength(1);
  });

  it('counts the receptions of 3.4 of a customer: every lot, the share without reservation, the open orders (archived ones stay in the history only)', () => {
    const rc = (over: Partial<Reception> = {}): Reception => ({ date: '2026-09-01', name: '', role: '', result: 'sans', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...over });
    const order = (id: string, client: string, re: Partial<Reception>, over: Partial<Delivery> = {}): Delivery => ({ id, ref: id, client, item: '', qty: null, milestones: [], releasedBy: '', releasedAt: '', reception: rc(re), ...over });
    const lot = { id: 'lt', no: 1, closedAt: '2026-08-02T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: rc({ date: '2026-08-01', result: 'reserve' }) };
    const s = st({ deliveries: {
      a: order('a', 'Client A', { date: '2026-09-01' }),                                                    // received without reservation
      b: order('b', 'client a (grand compte)', { date: '2026-09-10', result: 'reserve' }, { lots: [lot] }),   // received with reservation, after a lot also received with one
      c: order('c', 'Client A', { date: '', result: '' }),                                                  // under way
      d: order('d', 'Client A', { date: '2026-05-01' }, { archivedAt: '2026-06-01T10:00' }),                 // archived: in the history, not open
      e: order('e', 'Autre', { date: '2026-09-01' }),
    } });
    expect(clientReceptions(s, 'Client A')).toEqual({ received: 4, cleanPct: 50, open: 1 });                 // a, b and its lot, d: 2 without reservation out of 4; only c is open (b is received, d archived)
    expect(clientRecords(s, 'Client A').deliveries.map(x => x.id)).toEqual(['b', 'a', 'd', 'c']);            // the history keeps the archived order; the one received last first
    expect(receptionsLabel(clientReceptions(s, 'Client A'))).toBe('4 réceptions · 50 % sans réserve · 1 en cours (3.4)');
    expect(receptionsLabel(clientReceptions(s, 'Autre'))).toBe('1 réception · 100 % sans réserve (3.4)');
    expect(receptionsLabel(clientReceptions(st({ deliveries: { c: s.deliveries.c } }), 'Client A'))).toBe('1 en cours (3.4)');
    expect(receptionsLabel(clientReceptions(s, 'Inconnu'))).toBe('');
  });

  it('does not count as a reception one that is put off by a blocking reservation, but keeps the order open (L-8)', () => {
    const rc = (over: Partial<Reception> = {}): Reception => ({ date: '2026-09-01', name: '', role: '', result: 'reserve', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...over });
    const blocking = { id: 'r1', text: 'Fuite', raisedAt: '2026-09-01', severity: 'blocking' as const };
    const order = (re: Partial<Reception>): Delivery => ({ id: 'a', ref: 'a', client: 'Client A', item: '', qty: 10, milestones: [], releasedBy: '', releasedAt: '', reception: rc(re) });
    expect(clientReceptions(st({ deliveries: { a: order({ reserves: [blocking] }) } }), 'Client A')).toEqual({ received: 0, cleanPct: null, open: 1 });
    expect(receptionsLabel(clientReceptions(st({ deliveries: { a: order({ reserves: [blocking] }) } }), 'Client A'))).toBe('1 en cours (3.4)');
    expect(clientReceptions(st({ deliveries: { a: order({ reserves: [{ ...blocking, liftedAt: '2026-09-03' }] }) } }), 'Client A')).toEqual({ received: 1, cleanPct: 0, open: 0 });   // lifted: received, the 10 on order are delivered
  });

  it('adds a customer to the directory with the people questioned, once, and keeps what the company has', () => {
    const s = st({ feedbacks: {
      a: f({ id: 'a', contact: 'M. Durand', email: 'old@a.example', date: '2026-05-01' }), b: f({ id: 'b', contact: ' m. durand ', email: 'durand@a.example', date: '2026-09-01' }),
      c: f({ id: 'c', contact: 'Mme Z', date: '2026-07-01' }), d: f({ id: 'd', contact: '', date: '2026-08-01' }),
    } });
    expect(peopleToAdd(s, 'Client A')).toEqual([{ name: 'm. durand', email: 'durand@a.example' }, { name: 'Mme Z', email: '' }]);   // the newest spelling and e-mail, no empty name
    const r = addClientToDirectory(s, 'Client A');
    expect(r.added).toBe(2);
    expect(r.org).toMatchObject({ name: 'Client A', category: 'client' });
    const cards = Object.values(s.contacts);
    expect(cards.map(c => `${c.category}|${c.company}|${c.name}`).sort()).toEqual(['client|Client A|Mme Z', 'client|Client A|m. durand']);
    expect(cards.find(c => c.name === 'm. durand')?.email).toBe('durand@a.example');
    expect(new Set(cards.map(c => c.id)).size).toBe(2);
    expect(addClientToDirectory(s, 'client a (grand compte)').added).toBe(0);                             // already there: nothing added twice
    expect(Object.keys(s.orgs)).toHaveLength(1);
    // an organisation the company typed itself is kept and its people are added to it
    const own = st({ orgs: { o: { id: 'o', name: 'Client A (grand compte)', category: 'client', phone: '04', email: '', address: '', reference: '' } }, feedbacks: { a: f({ id: 'a', contact: 'M. Durand' }) } });
    const r2 = addClientToDirectory(own, 'Client A');
    expect(r2.org.id).toBe('o');
    expect(Object.values(own.contacts)[0]).toMatchObject({ company: 'Client A (grand compte)', name: 'M. Durand' });
    // a review still being typed counts as an extra one
    const e = st();
    expect(addClientToDirectory(e, 'Client B', [f({ client: 'Client B', contact: 'Acheteur', email: 'a@b.example' })]).added).toBe(1);
    expect(Object.values(e.contacts)[0].email).toBe('a@b.example');
  });

  it('starts a review for a customer with the person questioned last time, or the first card of the directory', () => {
    const s = st({ feedbacks: { a: f({ id: 'a', contact: 'M. Durand', email: 'd@a.example', date: '2026-09-01' }) }, contacts: { c: card({ id: 'c', name: 'Mme Z', email: 'z@a.example' }) } });
    expect(feedbackForClient(s, 'Client A', now)).toMatchObject({ client: 'Client A', contact: 'M. Durand', email: 'd@a.example', q1: null, date: '2026-09-25' });
    const fresh = st({ contacts: { c: card({ id: 'c', name: 'Mme Z', email: 'z@a.example' }) } });
    expect(feedbackForClient(fresh, 'Client A', now)).toMatchObject({ contact: 'Mme Z', email: 'z@a.example' });
    expect(feedbackForClient(st(), 'Client Q', now)).toMatchObject({ client: 'Client Q', contact: '', email: '' });
  });

  it('offers the customers of the reviews to the directory, with the person who answered', () => {
    const s = st({ feedbacks: { a: f({ id: 'a', client: 'Client N', contact: 'Mme N' }), b: f({ id: 'b', client: 'Client N', contact: 'Autre', date: '2026-01-01' }), c: f({ id: 'c', client: 'Client A' }) }, contacts: { x: card({ id: 'x' }) } });
    const list = candidates(s);
    expect(list.map(x => `${x.company}|${x.name}|${x.category}`)).toEqual(['Client N|Mme N|client']);   // Client A is already there, one line per customer, the newest person
    expect(list[0].from).toContain('2.4');
    expect(candidates({ ...s, feedbacks: undefined } as never)).toEqual([]);
  });

  it('shows the customers of the example in the directory, except one left out on purpose, and tops up a saved example once', () => {
    const d = demoState(now);
    ['Maison Perrin', 'Cabinet Rey', 'Collectivité Valmont', 'BâtiPro', 'Agencement Morel', 'Client A', 'Client B', 'Client C'].forEach(name => {
      const dir = directoryOfClient(d, name);
      expect(dir.org, name).toBeTruthy();
      expect(dir.contacts.length, name).toBeGreaterThan(0);
    });
    expect(directoryOfClient(d, 'Atelier Duval')).toEqual({ org: undefined, contacts: [] });              // shown as "not in the directory yet"
    // the person questioned in the reviews is a card of the directory (the e-mail is offered on the review)
    expect(directoryOfClient(d, 'Maison Perrin').contacts[0]).toMatchObject({ name: 'Mme Perrin', email: expect.stringContaining('@') });
    expect(clientSummaries(d).length).toBeGreaterThanOrEqual(9);
    // saved before the directory knew them: added once, nothing of the company touched
    const gone = (id: string) => !id.startsWith('ct_demo_cl_') && !['org_demo_batipro', 'org_demo_morel', 'org_demo_perrin', 'org_demo_rey', 'org_demo_valmont'].includes(id);
    const base = {
      complaints: d.complaints, params: { ...d.params, exampleLevel: 10 }, feedbacks: d.feedbacks, quotes: d.quotes, kpis: d.kpis, processes: d.processes, values: d.values, timeline: d.timeline, deliveries: d.deliveries,
      orgs: Object.fromEntries(Object.entries(d.orgs).filter(([id]) => gone(id))), contacts: Object.fromEntries(Object.entries(d.contacts).filter(([id]) => gone(id))),
    };
    const done = completeCommercialExamples(base, now);
    expect(Object.keys(done.orgs!)).toHaveLength(Object.keys(d.orgs).length);
    expect(Object.keys(done.contacts!)).toHaveLength(Object.keys(d.contacts).length);
    expect(done.params.exampleLevel).toBe(11);
    const again = completeCommercialExamples({ ...base, params: done.params, orgs: done.orgs, contacts: done.contacts }, now);
    expect(again.orgs).toBe(done.orgs);                                                                    // once
    // a company that typed its own "Maison Perrin" keeps it, and no second one is added
    const mine = { ...base, orgs: { ...base.orgs, mine: { id: 'mine', name: 'Maison Perrin', category: 'client' as const, phone: '1', email: '', address: '', reference: '' } },
      contacts: { ...base.contacts, mc: card({ id: 'mc', name: 'Mme Perrin', company: 'Maison Perrin' }) } };
    const kept = completeCommercialExamples(mine, now);
    expect(Object.values(kept.orgs!).filter(o => o.name === 'Maison Perrin')).toHaveLength(1);
    expect(Object.values(kept.contacts!).filter(c => c.company === 'Maison Perrin' && c.name === 'Mme Perrin')).toHaveLength(1);
    // a real company is given nothing
    const real = completeCommercialExamples({ ...mine, complaints: {}, orgs: {}, contacts: {}, feedbacks: {} }, now);
    expect(real.orgs).toEqual({});
    expect(commercialExamples(now).feedbacks).toBeTruthy();
  });
});

describe('an organisation renamed in the directory keeps its orders (L-3)', () => {
  const rc = (over: Partial<Reception> = {}): Reception => ({ date: '2026-09-01', name: 'M. Durand', role: '', result: 'sans', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...over });
  const order = (id: string, over: Partial<Delivery> = {}): Delivery => ({ id, ref: id, client: 'Client A', item: 'Rampe', qty: null, milestones: [], releasedBy: '', releasedAt: '', reception: rc(), ...over });
  // "Client A" was typed on the orders, then the organisation was renamed "Client A SAS" in 1.3 (its people follow, the orders did not)
  const renamed = () => st({
    orgs: { o: { id: 'o', name: 'Client A SAS', category: 'client', phone: '04 00', email: '', address: '', reference: '' } },
    contacts: { c1: card({ id: 'c1', name: 'M. Durand', company: 'Client A SAS' }) },
    deliveries: { a: order('a', { orgId: 'o' }), b: order('b', { orgId: 'o', client: 'Cl. A', reception: rc({ result: 'reserve' }) }), z: order('z', { client: 'Autre' }) },
  });

  it('finds the orders by the organisation they hold, whatever the name typed on them', () => {
    const s = renamed();
    expect(clientReceptions(s, 'Client A SAS')).toEqual({ received: 2, cleanPct: 50, open: 0 });             // the name the card of 1.3 shows now (it was 0 reception)
    expect(clientReceptions(s, 'Client A', 'o')).toEqual({ received: 2, cleanPct: 50, open: 0 });             // the name still typed on a review, with its organisation
    expect(clientRecords(s, 'Client A SAS').deliveries.map(x => x.id).sort()).toEqual(['a', 'b']);
    expect(clientReceptions(s, 'Autre')).toEqual({ received: 1, cleanPct: 100, open: 0 });                    // another customer is not mixed in
    expect(clientRecords(s, 'Client A').deliveries.map(x => x.id)).toEqual(['a']);                            // by the words alone, the order typed "Cl. A" is lost: the link makes the difference
  });

  it('finds the organisation and its people by the organisation the order holds, so that it is never offered again to the directory', () => {
    const s = renamed();
    expect(orgFor(s, 'Client A', 'o')?.name).toBe('Client A SAS');
    expect(orgFor(s, 'Client A')).toBeUndefined();                                                            // by the typed name alone, the old name leads nowhere (the cause of the double)
    const d = directoryOfClient(s, 'Client A', 'o');
    expect(d.org?.id).toBe('o');
    expect(d.contacts.map(c => c.name)).toEqual(['M. Durand']);
    expect(directoryOfClient(s, 'Client A').contacts).toEqual([]);
    // "add to the directory" for that customer makes no second organisation, and puts its people on the one that exists
    const f2 = f({ client: 'Client A', contact: 'Mme Z', orgId: 'o' });
    expect(peopleToAdd({ ...s, feedbacks: { x: f2 } }, 'Client A', [], 'o').map(p => p.name)).toEqual(['Mme Z']);   // M. Durand is already a card
    const r = addClientToDirectory(s, 'Client A', [f2], 'o');
    expect(r.org.id).toBe('o');
    expect(Object.keys(s.orgs)).toEqual(['o']);
    expect(Object.values(s.contacts).filter(c => c.name === 'Mme Z').map(c => c.company)).toEqual(['Client A SAS']);
    // a review typed by hand for the customer carries the organisation of the last one
    expect(feedbackForClient({ ...s, feedbacks: { x: f2 } }, 'Client A', now).contact).toBe('Mme Z');
  });

  it('puts the new name on the orders of a renamed organisation and keeps the link', () => {
    const s = renamed();
    s.deliveries.c = order('c');                                                                               // typed "Client A", never linked
    expect(renameOrgOrders(s, { id: 'o', category: 'client' }, 'Client A', 'Client A SAS')).toBe(3);          // a, b and c; z is another customer
    expect(Object.values(s.deliveries).map(d => `${d.id}:${d.client}:${d.orgId ?? ''}`).sort()).toEqual(['a:Client A SAS:o', 'b:Client A SAS:o', 'c:Client A SAS:', 'z:Autre:']);
    expect(renameOrgOrders(s, { id: 'o', category: 'client' }, 'Client A SAS', 'Client A SAS')).toBe(0);      // already so
    expect(renameOrgOrders(s, { id: 'o', category: 'client' }, 'Client A SAS', '  ')).toBe(0);                 // a name cleared while typing blanks nothing
    expect(renameOrgOrders(s, { id: 'p', category: 'fournisseur' }, 'Autre', 'Autre SA')).toBe(0);            // a supplier's name never reaches a customer's order
  });

  it('counts the orders that cite an organisation or a person, to say it before deleting', () => {
    const s = renamed();
    s.deliveries.a.contactId = 'c1';
    s.deliveries.b.reception.contactId = 'c1';
    s.deliveries.z.lots = [{ id: 'l', no: 1, closedAt: '2026-09-02T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: rc({ orgId: 'o', contactId: 'c9' }) }];
    expect(ordersCiting(s, { contactId: 'c1' }).map(d => d.id).sort()).toEqual(['a', 'b']);
    expect(ordersCiting(s, { contactId: 'c9' }).map(d => d.id)).toEqual(['z']);                                // a closed delivery counts too
    expect(ordersCiting(s, { orgId: 'o', name: 'Client A SAS' }).map(d => d.id).sort()).toEqual(['a', 'b', 'z']);
    expect(ordersCiting(s, { contactId: 'nobody' })).toEqual([]);
  });
});
