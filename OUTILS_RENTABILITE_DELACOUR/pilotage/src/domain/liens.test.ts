// Tool 3.4 and the other tools, the cases that break (lot 9, L-19): a quote deleted, an organisation renamed or deleted, a defect deleted, a milestone withdrawn that holds a defect, a review linked to an order,
// a breakdown of 3.3 (read only), a delivery put off by a blocking reservation read by the five consumers, a closed delivery and the review of 2.4, an address that is a key of the prototype.
// Every moment is given: no test reads the clock.
import { describe, expect, it } from 'vitest';
import type { Contact, Delivery, Feedback, Milestone, Nc, Org, Quote, Reception, State, Strokes } from './types';
import {
  addMilestone, addReserve, canAskFeedback, canRelease, checkMilestone, deletable, deliveryFromQuote, isPostponed, liftReserve, linkMilestoneNc, linkReserveNc, ncLinkState, ncOf, newDelivery, nextPresentation,
  promisedOn, qtyReceived, quotePromisedOn, releaseDelivery, removeMilestone, reservesOf, setResult, signClient, startReception, breakdownsTouching, reserveLateDays,
} from './receptions';
import { quotesWithoutOrder, receptionSummary, receptionTodos } from './receptionsAll';
import { receptionFeeds, receptionKpiValue, receptionsBetween } from './receptionsFeeds';
import { clientFiles, clientOrders, complaintDelivery, deliveriesCounted, deliveriesOf, deliveriesToAsk, feedbackFromDelivery, feedbackOfDelivery, receivedOn } from './commercial';
import { clientReceptions, directoryOfClient, orgFor, ordersCiting, renameOrgOrders } from './clients';
import { newNc } from './quality';
import { toolBadge } from './status';
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
const A = 'Alice', IDS = ['m1', 'm2', 'm3', 'm4'];
const ms = (): Milestone[] => IDS.map((id, i) => ({ id, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id: 'dl1', ref: 'CMD-1', client: 'Client A', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const allOk = (d: Delivery, day = '2026-09-10') => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at(day, '09:00') }), d);
const released = (d: Delivery = dl(), day = '2026-09-11') => releaseDelivery(allOk(d), { by: 'Marc', at: at(day, '16:00') });
const received = (d: Delivery, day = '2026-09-14', result: Reception['result'] = 'sans') => setResult(startReception(d, { at: at(day, '14:00'), place: 'Chantier Nord' }), result, at(day, '14:30'));
const signed = (d: Delivery, day = '2026-09-14') => signClient(d, ink, at(day, '14:40'), A);
const withRv = (d: Delivery, over: Partial<Parameters<typeof addReserve>[1]> = {}, day = '2026-09-14') => addReserve(d, { text: 'Rayure', by: A, at: at(day, '14:35'), ...over });
const plain = (x: string) => x.replace(/[  ]/g, ' ');
const baseQuote = { id: '', ref: '', date: '', client: '', object: '', status: 'won' } as Quote;
const quote = (id: string, over: Partial<Quote> = {}): Quote => ({ ...baseQuote, id, ref: `D-${id}`, client: 'Client A', object: 'Lot de pièces', decidedAt: '2026-09-01', date: '2026-08-20', status: 'won', weeks: 2, ...over });
const nc = (s: State, over: Partial<Nc> = {}): Nc => ({ ...newNc(s, A, now), id: 'nc1', ref: 'NC-2026-001', ...over });

describe('3.4 and 2.1: a quote deleted after the order was made', () => {
  const order = (over: Partial<Delivery> = {}) => dl({ quoteId: 'q1', ...over });
  it('keeps the day the order was given; an order that only had the day of the quote has none any more; neither fails', () => {
    const own = order({ promisedAt: '2026-09-15' }), borrowed = order({ id: 'dl2', ref: 'CMD-2' });
    const held = st([own, borrowed], { quotes: { q1: quote('q1') } }), gone = st([own, borrowed]);
    expect([promisedOn(held, own), promisedOn(held, borrowed)]).toEqual(['2026-09-15', '2026-09-15']);   // the quote decided 1 September for 2 weeks: the 15th
    expect([promisedOn(gone, own), promisedOn(gone, borrowed)]).toEqual(['2026-09-15', '']);
    expect(quotePromisedOn(gone, 'q1')).toBe('');
    expect(() => receptionTodos(gone, now)).not.toThrow();
    expect(receptionTodos(gone, now).find(t => t.kind === 'milestone' && t.deliveryId === 'dl2')?.due).toBe('');
  });
  it('makes no order from a quote that is not there: a blank one, without the link', () => {
    const out = deliveryFromQuote(st(), 'q1', P);
    expect(out).toMatchObject({ client: '', item: '', qty: null });
    expect(out).not.toHaveProperty('quoteId');
    expect(out).not.toHaveProperty('promisedAt');
  });
  it('does not count a delivery on time against a day that only the deleted quote gave', () => {
    const d = received(released(order({ id: 'dl3', ref: 'CMD-3' })), '2026-09-14');
    expect(receptionKpiValue(st([d], { quotes: { q1: quote('q1') } }), 'recep_promised' as never, '2026-09', now)).toBe(100);   // promised the 15th, delivered the 14th
    expect(receptionKpiValue(st([d]), 'recep_promised' as never, '2026-09', now)).toBeNull();   // no day promised any more: nothing to say
    expect(receptionFeeds(st([d]), '2026-09', now).some(f => (f.role as string) === 'recep_promised')).toBe(false);
  });
  it('lists a won quote that no order follows, but not one that is gone, nor one an order holds, nor one set aside', () => {
    const quotes = { q1: quote('q1'), q2: quote('q2', { client: 'Autre' }), q3: quote('q3', { client: 'Client C' }) };
    const s = st([order()], { quotes, params: { ...P, reception: { skippedQuotes: ['q3'] } } });
    expect(quotesWithoutOrder(s, now).map(q => q.id)).toEqual(['q2']);
    expect(quotesWithoutOrder(st([order()], { quotes: { q2: quotes.q2 } }), now).map(q => q.id)).toEqual(['q2']);
  });
});

describe('3.4 and 1.3: an organisation or a person of the directory renamed or deleted', () => {
  const org = (over: Partial<Org> = {}): Org => ({ id: 'o1', name: 'Maison Perrin', category: 'client', phone: '', email: '', address: '', reference: '', ...over });
  const orders = () => [dl({ id: 'a', ref: 'A', client: 'Maison Perrin', orgId: 'o1' }), dl({ id: 'b', ref: 'B', client: 'Maison Perrin (grand compte)' }), dl({ id: 'c', ref: 'C', client: 'Autre client' }), dl({ id: 'd', ref: 'D', client: 'Maison Perrin Nord', orgId: 'o9' }),
    dl({ id: 'e', ref: 'E', client: 'Maison Perrin (autre site)', orgId: 'o9' }), dl({ id: 'f', ref: 'F', client: 'Écrit autrement', orgId: 'o1' })];   // e: the same words, but it holds another organisation; f: the link only
  it('renames the orders that hold the link and those that carry the old name by its words; the link stays, an order that holds another organisation does not move even with the same words, and a second time changes nothing', () => {
    const s = st(orders(), { orgs: { o1: org() } });
    expect(renameOrgOrders(s, org(), 'Maison Perrin', 'Perrin et Fils')).toBe(3);
    expect(Object.values(s.deliveries).map(d => [d.id, d.client, d.orgId])).toEqual([['a', 'Perrin et Fils', 'o1'], ['b', 'Perrin et Fils', undefined], ['c', 'Autre client', undefined], ['d', 'Maison Perrin Nord', 'o9'], ['e', 'Maison Perrin (autre site)', 'o9'], ['f', 'Perrin et Fils', 'o1']]);
    expect(renameOrgOrders(s, org(), 'Maison Perrin', 'Perrin et Fils')).toBe(0);
    expect(renameOrgOrders(s, org(), 'Perrin et Fils', '  ')).toBe(0);   // an empty name renames nothing
  });
  it('finds the orders of a customer by the link under its new name, and by the words of the name typed on an order: the order that still carries the old name answers to it', () => {
    const s = st(orders(), { orgs: { o1: org({ name: 'Perrin et Fils' }) } });   // renamed in the directory, the orders not yet
    expect(clientOrders(s, 'Perrin et Fils', 'o1').map(d => d.id)).toEqual(['a', 'f']);              // the link wins over the name typed on the order
    expect(clientOrders(s, 'Maison Perrin').map(d => d.id)).toEqual(['a', 'b', 'e']);                // "Maison Perrin (grand compte)" is "Maison Perrin", the order of o1 still carries it
    expect(clientOrders(s, 'MAISON  perrin').map(d => d.id)).toEqual(['a', 'b', 'e']);
    expect(clientOrders(s, 'Perrin et Fils').map(d => d.id)).toEqual(['a', 'f']);                    // by the name alone: the orders of the link hold the name of the organisation of the directory
    expect(clientReceptions(s, 'Perrin et Fils', 'o1').open).toBe(2);
    renameOrgOrders(s, org(), 'Maison Perrin', 'Perrin et Fils');
    expect(clientOrders(s, 'Perrin et Fils', 'o1').map(d => d.id)).toEqual(['a', 'b', 'f']);         // renamed: the order without link follows
    expect(clientOrders(s, 'Maison Perrin').map(d => d.id)).toEqual(['e']);                          // the one of another organisation keeps its words
  });
  it('an organisation deleted leaves its orders as they were: they keep their text and their link, found by their name, and the directory of the customer is empty without failing', () => {
    const s = st(orders());   // no organisation any more
    expect(clientOrders(s, 'Maison Perrin', 'o1').map(d => d.id)).toEqual(['a', 'b', 'e', 'f']);   // the link alone finds f, whatever name it carries
    expect(clientOrders(s, 'Whatever', 'o1').map(d => d.id)).toEqual(['a', 'f']);
    expect(orgFor(s, 'Maison Perrin', 'o1')).toBeUndefined();
    expect(directoryOfClient(s, 'Maison Perrin', 'o1')).toEqual({ org: undefined, contacts: [] });
    expect(ordersCiting(s, { orgId: 'o1', name: 'Maison Perrin' }).map(d => d.id)).toEqual(['a', 'b', 'f']);   // said before the deletion: the orders that hold the link, the one that carries the name; not e, which holds another organisation
  });
  it('says the orders that cite an organisation or a person, in their reception too, before one is deleted', () => {
    const viaReception = dl({ id: 'e', ref: 'E', client: 'Autre', reception: { ...dl().reception, orgId: 'o2', contactId: 'c2' } });
    const s = st([...orders(), viaReception]);
    expect(ordersCiting(s, { contactId: 'c2' }).map(d => d.id)).toEqual(['e']);
    expect(ordersCiting(s, { orgId: 'o2' }).map(d => d.id)).toEqual(['e']);
    expect(ordersCiting(s, { orgId: 'o3' })).toEqual([]);
    const lot = { id: 'lt1', no: 1, closedAt: at('2026-09-01'), milestones: [], releasedBy: '', releasedAt: '', reception: { ...dl().reception, contactId: 'c7' } };
    expect(ordersCiting(st([{ ...dl(), lots: [lot] } as Delivery]), { contactId: 'c7' }).map(d => d.id)).toEqual(['dl1']);   // a person cited by a closed delivery counts too
  });
  it('a person who is the contact of an order and was deleted: the order shows the name that was typed, the review takes it', () => {
    const d = signed(received(released(dl({ contactId: 'c1' })), '2026-09-14'));
    const withName = { ...d, reception: { ...d.reception, name: 'M. Durand', contactId: 'c1' } };
    expect(feedbackFromDelivery(withName, now)).toMatchObject({ contact: 'M. Durand', contactId: 'c1', client: 'Client A' });   // the card is gone from the directory; the name is on the order
    const c: Contact = { id: 'c1', category: 'client', name: 'M. Durand', role: '', company: 'Client A', phone: '', email: '', always: false, verifiedAt: '' };
    expect(st([withName], { contacts: { c1: c } }).deliveries.dl1.reception.name).toBe('M. Durand');
  });
});

describe('3.4 and 5.1: a defect deleted, a milestone withdrawn with its defect', () => {
  const base = () => {
    const d = checkMilestone(dl(), 'm2', { ok: false, measured: '12', by: A, at: at('2026-09-10') });
    return linkMilestoneNc(d, 'm2', 'nc1', A, at('2026-09-10', '09:10'));
  };
  const withNc = (d: Delivery, over: Partial<Nc> = {}) => { const s = st([d]); return { ...s, ncs: { nc1: nc(s, { deliveryId: 'dl1', milestoneId: 'm2', ...over }) } } as State; };
  it('a link to a defect that is gone is no link: the milestone says it, the release does not wait for it, the queue asks to deal with the milestone again', () => {
    const d = base(), s = st([d]);   // the defect was deleted in 5.1
    expect([ncLinkState(withNc(d), d.milestones[1].ncId), ncLinkState(s, d.milestones[1].ncId), ncLinkState(s, undefined)]).toEqual(['ok', 'missing', 'none']);
    const rel = canRelease(s, d);
    expect(rel.why.some(x => /Défaut/.test(x))).toBe(false);
    expect(rel.notes?.map(plain)).toEqual(['Jalon 2 « Étape 2 » : défaut lié introuvable dans 5.1']);
    const todos = receptionTodos(s, now);
    expect(todos.some(t => t.kind === 'defect')).toBe(false);
    expect(todos.find(t => t.kind === 'blocked')?.text).toMatch(/Traiter le jalon 2/);
  });
  it('declares the defect again after it was deleted: the journal says it, and the link is replaced; a defect that is there is kept', () => {
    const d = base(), s = st([d]), out = linkMilestoneNc(d, 'm2', 'nc2', A, at('2026-09-11'), s);
    expect(out.milestones[1].ncId).toBe('nc2');
    expect(plain(out.journal!.at(-1)!.text)).toBe("Défaut déclaré à nouveau depuis jalon 2 « Étape 2 » (le défaut lié n'existe plus dans 5.1)");
    expect(linkMilestoneNc(d, 'm2', 'nc2', A, at('2026-09-11'))).toBe(d);                       // without the state, a link is never replaced
    expect(linkMilestoneNc(d, 'm2', 'nc2', A, at('2026-09-11'), withNc(d))).toBe(d);            // the defect is there: the screen opens it again
  });
  it('a reservation holds one defect, replaced when it was deleted', () => {
    const r = withRv(received(released(dl()), '2026-09-14', 'reserve')), rid = reservesOf(r)[0].id;
    const linked = linkReserveNc(r, rid, 'nc1', A, at('2026-09-14', '15:00'));
    expect(reservesOf(linked)[0].ncId).toBe('nc1');
    expect(linkReserveNc(linked, rid, 'nc2', A, at('2026-09-15'))).toBe(linked);
    expect(reservesOf(linkReserveNc(linked, rid, 'nc2', A, at('2026-09-15'), st([linked])))[0].ncId).toBe('nc2');
  });
  it('refuses to withdraw a milestone whose defect has no decision (a defect is not left pointing at nothing); allows it once decided, or when the defect is gone', () => {
    const ok = (d: Delivery) => linkMilestoneNc(checkMilestone(d, 'm2', { ok: true, by: A, at: at('2026-09-10') }), 'm2', 'nc1', A, at('2026-09-10', '09:10'));
    const d = ok(dl());
    expect(removeMilestone(d, 'm2', A, at('2026-09-11'), withNc(d, { decision: '' }))).toBe(d);
    expect(removeMilestone(d, 'm2', A, at('2026-09-11'), withNc(d, { decision: 'attente' }))).toBe(d);
    expect(removeMilestone(d, 'm2', A, at('2026-09-11'))).toBe(d);   // without the state the defect cannot be looked for: nothing is withdrawn
    expect(removeMilestone(d, 'm2', A, at('2026-09-11'), withNc(d, { decision: 'rebut' as never })).milestones.map(m => m.id)).toEqual(['m1', 'm3', 'm4']);
    expect(removeMilestone(d, 'm2', A, at('2026-09-11'), st([d])).milestones.map(m => m.id)).toEqual(['m1', 'm3', 'm4']);   // the defect was deleted
  });
  it('a defect declared from a milestone later withdrawn still stands in the way of the release, said as the one of a milestone withdrawn, until it is decided', () => {
    const d = linkMilestoneNc(allOk(dl()), 'm2', 'nc1', A, at('2026-09-10', '09:10')), s = withNc(d, { decision: '' }), gone = { ...d, milestones: d.milestones.filter(m => m.id !== 'm2') };
    expect(canRelease(s, d).why.map(plain)).toEqual(['Défaut NC-2026-001 du jalon 2 sans décision']);
    const out = canRelease({ ...s, deliveries: { dl1: gone } }, gone);
    expect(out.ok).toBe(false);
    expect(out.why.map(plain)).toEqual(["Défaut NC-2026-001 d'un jalon retiré sans décision"]);
    expect(canRelease({ ...s, ncs: { nc1: { ...s.ncs.nc1, decision: 'rebut' as never } } }, gone).ok).toBe(true);
  });
  it('a milestone added after the release that is still to check puts the order back to "à contrôler"', () => {
    const r = released(), added = addMilestone(r, { label: 'Extra' }, A, at('2026-09-12'));
    expect(added.releasedAt).toBe('');
    expect(plain(added.journal!.at(-1)!.text)).toBe('Libération défaite : jalon 5 « Extra » ajouté, à contrôler');
  });
});

describe('3.4 and 2.4: the review of the end, linked to the order, a closed delivery', () => {
  const fb = (over: Partial<Feedback> = {}): Feedback => ({ id: 'fb1', date: '2026-09-15', client: 'Client A', affaire: '', contact: '', channel: 'site', q1: true, q2: true, q3: 9, verbatim: '', doubt: '', doubtSolvedAt: '', reviewAsked: true, ...over });
  const twice = () => {   // delivered in two times: the first closed at the 14th (4 of 10), the second received on the 23rd
    const first = signed(withRecQty(received(released(dl({ qty: 10 })), '2026-09-14'), 4), '2026-09-14'), second = nextPresentation(first, A, at('2026-09-15'));
    return received(released(second, '2026-09-22'), '2026-09-23');
  };
  const withRecQty = (d: Delivery, qty: number): Delivery => ({ ...d, reception: { ...d.reception, qty } });
  it('says it cannot be deleted when a review is linked to it (it is archived), and what would be lost when it is not', () => {
    const d = released(), s = st([d], { feedbacks: { fb1: fb({ deliveryId: 'dl1' }) } });
    expect(plain(deletable(s, d))).toBe('Un bilan de fin est lié à cette commande : archiver');
    expect(deletable(st([d]), dl())).toBe('');
    expect(plain(deletable(st([d]), d))).toMatch(/jalons contrôlés/);
    expect(deletable({ feedbacks: undefined } as never, dl())).toBe('');
  });
  it('asks the three questions only once a delivery was made; an address used twice never makes two reviews', () => {
    expect(canAskFeedback(dl())).toBe(false);
    const d = signed(received(released(), '2026-09-14'));
    expect(canAskFeedback(d)).toBe(true);
    const first = feedbackOfDelivery({ feedbacks: {} }, d, now);
    expect(first.isNew).toBe(true);
    expect(first.f).toMatchObject({ deliveryId: 'dl1', client: 'Client A', affaire: 'CMD-1', date: '2026-09-14' });
    const again = feedbackOfDelivery({ feedbacks: { [first.f.id]: first.f } }, d, now);
    expect(again.isNew).toBe(false);
    expect(again.f).toBe(first.f);
  });
  it('the review of an order made in two times is about the last delivery received: its day, its person; the first one alone, when the second is not received yet', () => {
    const d = twice();
    expect(receivedOn(d)).toBe('2026-09-23');
    expect(feedbackFromDelivery(d, now)).toMatchObject({ date: '2026-09-23', deliveryId: 'dl1' });
    const open = nextPresentation(signed(withRecQty(received(released(dl({ qty: 10 })), '2026-09-14'), 4), '2026-09-14'), A, at('2026-09-15'));
    expect(receivedOn(open)).toBe('2026-09-14');   // the second delivery has no result yet: the last received is the closed one
  });
  it('asks for the review of the order made in two times from the last delivery received, not from the first; a refused last delivery asks nothing, an archived order neither', () => {
    const d = twice();
    expect(deliveriesToAsk(st([d]), now).map(x => x.id)).toEqual(['dl1']);
    expect(deliveriesToAsk(st([d]), new Date(2026, 9, 15, 10, 0))).toEqual([]);     // 14 days after the 23rd is the 7th of October: the 15th is past
    expect(deliveriesToAsk(st([d], { feedbacks: { fb1: fb({ deliveryId: 'dl1', date: '2026-01-01' }) } }), now)).toEqual([]);   // already made, linked
    expect(deliveriesToAsk(st([{ ...d, archivedAt: at('2026-09-24') }]), now)).toEqual([]);
    const refused = { ...d, reception: { ...d.reception, result: 'refus' as const, refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' } } };
    expect(deliveriesToAsk(st([refused]), now)).toEqual([]);
  });
  it('counts the deliveries of the month of every delivery of the order, each once, a refused one never', () => {
    const d = twice();
    expect(deliveriesCounted(st([d]), '2026-09')).toBe(2);
    expect(deliveriesOf(st([d], { params: { ...P, monthDeliveries: { '2026-09': 7 } } }), '2026-09')).toBe(7);   // the number typed in the settings wins
    expect(deliveriesCounted(st([{ ...d, reception: { ...d.reception, result: 'refus' as const, refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' } } }]), '2026-09')).toBe(1);
  });
});

describe('3.4 and 3.3: the breakdowns that touched an order are read, never written', () => {
  const eq = (id: string, name: string, breakdowns: object[] | undefined) => ({ id, name, location: '', operator: '', manager: '', riskId: '', checkpoints: [], inspections: [], parts: [], breakdowns }) as never;
  const freeze = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  it('lists them oldest first with the equipment, the moment (the start of the breakdown, else its day) and the id; none for another order, none without equipment', () => {
    const s = st([dl()], { equipments: {
      e1: eq('e1', 'Presse', [{ id: 'b1', date: '2026-09-10', startedAt: '2026-09-10T08:00', deliveryIds: ['dl1'] }, { id: 'b2', date: '2026-09-05', deliveryIds: ['dl1', 'dl2'] }, { id: 'b3', date: '2026-09-01', deliveryIds: ['dl2'] }, { id: 'b4', date: '2026-09-02' }]),
      e2: eq('e2', 'Scie', [{ id: 'b5', date: '2026-09-07', startedAt: '2026-09-07T14:30', deliveryIds: ['dl1'] }]), e3: eq('e3', 'Four', undefined),
    } as never });
    expect(breakdownsTouching(s, dl())).toEqual([{ equipmentName: 'Presse', at: '2026-09-05', id: 'b2' }, { equipmentName: 'Scie', at: '2026-09-07T14:30', id: 'b5' }, { equipmentName: 'Presse', at: '2026-09-10T08:00', id: 'b1' }]);
    expect(breakdownsTouching(st([dl()]), dl())).toEqual([]);
    expect(breakdownsTouching({ ...s, equipments: undefined } as never, dl())).toEqual([]);
  });
  it('writes nothing in the equipments, the maintenance state being frozen; the summary and the tasks of 3.4 read an order touched by a breakdown without failing', () => {
    const s = freeze(st([dl()], { equipments: { e1: eq('e1', 'Presse', [{ id: 'b1', date: '2026-09-10', deliveryIds: ['dl1'] }]) } as never }));
    expect(() => breakdownsTouching(s, dl())).not.toThrow();
    expect(() => receptionSummary(s, now)).not.toThrow();
    expect(() => receptionTodos(s, now)).not.toThrow();
    expect(toolBadge(s, '3.4', '2026-09', now).text).toBeTruthy();
  });
});

describe('3.4 put off by a blocking reservation: the five readers of a reception leave it out until the reservation is lifted (L-8)', () => {
  const off = () => signed(withRv(received(released(dl({ qty: 10, promisedAt: '2026-09-20' })), '2026-09-14', 'reserve'), { severity: 'blocking' }), '2026-09-14');
  const readers = (d: Delivery) => {
    const s = st([d]);
    return {
      qty: qtyReceived(d), postponed: isPostponed(d), receivedOn: receivedOn(d), month: deliveriesCounted(s, '2026-09'), asked: deliveriesToAsk(s, now).length, between: receptionsBetween(s, '2026-09-01', '2026-09-30').length,
      client: clientReceptions(s, 'Client A').received, tile: receptionSummary(s, now).received, clean: receptionKpiValue(s, 'recep_clean' as never, '2026-09', now), onTime: receptionKpiValue(s, 'recep_promised' as never, '2026-09', now),
    };
  };
  it('counts nothing while the blocking reservation is open: no quantity, no day of reception, no delivery of the month, no review to ask, no figure, no tile', () => {
    expect(readers(off())).toEqual({ qty: 0, postponed: true, receivedOn: '', month: 0, asked: 0, between: 0, client: 0, tile: 0, clean: null, onTime: null });
  });
  it('counts it everywhere once the blocking reservation is lifted, with the same figures', () => {
    const d = off(), rid = reservesOf(d)[0].id, lifted = liftReserve(d, rid, { at: at('2026-09-16'), by: A, note: 'Remplacée', now: at('2026-09-16') });
    expect(readers(lifted)).toEqual({ qty: 10, postponed: false, receivedOn: '2026-09-14', month: 1, asked: 1, between: 1, client: 1, tile: 1, clean: 0, onTime: 100 });
    expect(reserveLateDays(reservesOf(lifted)[0], lifted, P, now)).toBe(0);
  });
});

describe('an address that is a key of the prototype is no record (L-7)', () => {
  const s = st([dl()]);
  it('finds no quote, no defect, no order, no organisation, no complaint order for "constructor", "__proto__" or "toString"', () => {
    ['constructor', '__proto__', 'toString', 'hasOwnProperty'].forEach(k => {
      expect(deliveryFromQuote(s, k, P), k).not.toHaveProperty('quoteId');
      expect(quotePromisedOn(s, k), k).toBe('');
      expect(ncOf(s, k), k).toBeUndefined();
      expect(ncLinkState(s, k), k).toBe('missing');
      expect(complaintDelivery(s, { deliveryId: k }), k).toBeUndefined();
      expect(orgFor({ ...s, orgs: {} }, 'x', k), k).toBeUndefined();
      expect(clientOrders({ ...s, orgs: {} }, 'Client A', k).map(d => d.id), k).toEqual(['dl1']);
      expect(promisedOn(s, { promisedAt: undefined, quoteId: k }), k).toBe('');
    });
  });
  it('the files of a customer for a complaint name the customer by the words of its name, whatever the case, the accents or the brackets', () => {
    const d = signed(received(released(dl({ client: 'Client A (grand compte)' })), '2026-09-14'));
    const s2 = st([d], { quotes: { q1: quote('q1', { client: 'client  À' }) } });
    ['Client A', 'CLIENT a', 'client à'].forEach(name => {
      const files = clientFiles(s2, { client: name } as never);
      expect(files.filter(f => f.tool === '3.4').map(f => f.id), name).toEqual(['dl1']);
    });
    expect(clientFiles(s2, { client: ' ' } as never)).toEqual([]);
    expect(clientFiles(s2, { client: 'Client B' } as never)).toEqual([]);
  });
});
