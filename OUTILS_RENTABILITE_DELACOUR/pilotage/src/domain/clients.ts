// Satisfaction by customer (tool 2.4), linked with the directory (1.3): one summary per customer from its reviews, the organisation and
// the people the directory holds for it, what the other tools hold, and the move "add this customer to the directory".
// A customer is recognised by the words of its name (orgKey), as everywhere else: "Client A" is "Client A (grand compte)"; an order that holds its
// organisation (orgId) follows it when the organisation is renamed in the directory.
import type { Complaint, Contact, Delivery, Feedback, Org, Quote, State } from './types';
import { orgKey, orgOf } from './contacts';
import { clientOrders, feedbackState, isNegative, newFeedback, receivedOn } from './commercial';
import { counted, isSettled, receptionsOf } from './receptions';

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface ClientSummary {
  key: string; name: string; orgId?: string; feedbacks: Feedback[];   // newest first
  count: number; answers: number; satisfiedPct: number | null; avg: number | null; lastScore: number | null;
  unhappy: number; settled: number; open: number; last: string;
}
export const sameClient = (a: string, b: string) => !!orgKey(a) && orgKey(a) === orgKey(b);

export function clientSummary(name: string, fs: Feedback[], s: Pick<State, 'complaints'> & Partial<Pick<State, 'params'>>): ClientSummary {
  const list = fs.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const done = list.filter(f => feedbackState(f) !== 'to_ask');
  const scores = done.map(f => f.q3).filter((v): v is number => v !== null);
  const states = done.map(f => feedbackState(f, s));
  return {
    key: orgKey(name), name, orgId: list.find(f => f.orgId)?.orgId, feedbacks: list, count: list.length, answers: done.length,
    satisfiedPct: done.length ? Math.round(done.filter(f => !isNegative(f, s.params)).length / done.length * 100) : null,
    avg: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null, lastScore: done[0]?.q3 ?? null,
    unhappy: done.filter(f => isNegative(f, s.params)).length, settled: states.filter(x => x === 'settled').length, open: states.filter(x => x === 'unhappy').length,
    last: list[0]?.date || '',
  };
}
// Every customer that has a review, the name as written on its newest review
export function clientSummaries(s: Pick<State, 'feedbacks' | 'complaints'> & Partial<Pick<State, 'params'>>): ClientSummary[] {
  const groups = new Map<string, Feedback[]>();
  Object.values(s.feedbacks).filter(f => orgKey(f.client)).forEach(f => { const k = orgKey(f.client); groups.set(k, [...(groups.get(k) || []), f]); });
  return [...groups.values()].map(fs => clientSummary(fs.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0].client.trim(), fs, s)).sort((a, b) => a.name.localeCompare(b.name));
}
export type ClientSort = 'name' | 'watch';
// "To watch" first: customers with a point still to settle, then the least satisfied, then those without answer yet; the others by name
export const sortClients = (list: ClientSummary[], by: ClientSort): ClientSummary[] => list.slice().sort((a, b) => by === 'name' ? a.name.localeCompare(b.name)
  : (b.open - a.open) || ((a.satisfiedPct ?? 101) - (b.satisfiedPct ?? 101)) || ((a.avg ?? 11) - (b.avg ?? 11)) || a.name.localeCompare(b.name));

// The organisation of a customer: the one its orders hold (`orgId`, under the name it has now), else the one that bears its name
export const orgFor = (s: Partial<Pick<State, 'orgs'>>, name: string, orgId?: string): Org | undefined => (orgId && s.orgs && Object.hasOwn(s.orgs, orgId) ? s.orgs[orgId] : orgOf(s, name));
// What the directory holds for a customer: its organisation (switchboard, address, our customer number) and the people of that organisation
export function directoryOfClient(s: Partial<Pick<State, 'orgs' | 'contacts'>>, name: string, orgId?: string): { org?: Org; contacts: Contact[] } {
  const org = orgFor(s, name, orgId);
  return {
    org,
    contacts: Object.values(s.contacts || {}).filter(c => c.category === 'client' && (sameClient(c.company, name) || (!!org && sameClient(c.company, org.name)))).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
// What the other tools hold for a customer
export function clientRecords(s: Pick<State, 'quotes' | 'complaints' | 'deliveries'> & Partial<Pick<State, 'orgs'>>, name: string, orgId?: string): { quotes: Quote[]; complaints: Complaint[]; deliveries: Delivery[] } {
  return {
    quotes: Object.values(s.quotes).filter(x => sameClient(x.client, name)).sort((a, b) => (a.date < b.date ? 1 : -1)),
    complaints: Object.values(s.complaints).filter(x => sameClient(x.client, name)).sort((a, b) => (a.at < b.at ? 1 : -1)),
    // every order of the customer, archived ones too (the history), the one received last first
    deliveries: clientOrders(s, name, orgId).sort((a, b) => (receivedOn(a) < receivedOn(b) ? 1 : -1)),
  };
}
// Tool 3.4 for a customer: the deliveries received over all its orders (each lot counts, archived orders keep their history), the share pronounced without
// reservation, and the orders still open (archived ones are not)
export function clientReceptions(s: Pick<State, 'deliveries'> & Partial<Pick<State, 'orgs'>>, name: string, orgId?: string): { received: number; cleanPct: number | null; open: number } {
  const orders = clientOrders(s, name, orgId);
  const rs = orders.flatMap(d => receptionsOf(d).map(x => x.reception).filter(counted));   // a reception put off by a blocking reservation is not one received
  return { received: rs.length, cleanPct: rs.length ? Math.round(rs.filter(r => r.result === 'sans').length / rs.length * 100) : null, open: orders.filter(d => !d.archivedAt && !isSettled(d)).length };
}
// "5 réceptions · 80 % sans réserve · 1 en cours (3.4)"; '' for a customer without order
export function receptionsLabel(r: ReturnType<typeof clientReceptions>): string {
  const rec = r.received ? `${r.received} réception${r.received > 1 ? 's' : ''}${r.cleanPct !== null ? ` · ${r.cleanPct} % sans réserve` : ''}` : '';
  const open = r.open ? `${r.open} en cours` : '';
  return rec || open ? `${[rec, open].filter(Boolean).join(' · ')} (3.4)` : '';
}
// People questioned in the reviews of a customer who are not yet on a card of its organisation (with the e-mail of the newest review)
export function peopleToAdd(s: Pick<State, 'feedbacks'> & Partial<Pick<State, 'orgs' | 'contacts'>>, name: string, extra: Feedback[] = [], orgId?: string): { name: string; email: string }[] {
  const known = new Set(directoryOfClient(s, name, orgId).contacts.map(c => c.name.trim().toLowerCase()));
  const fs = [...Object.values(s.feedbacks).filter(f => sameClient(f.client, name)), ...extra.filter(f => sameClient(f.client, name))].sort((a, b) => (a.date < b.date ? 1 : -1));
  const out = new Map<string, { name: string; email: string }>();
  fs.filter(f => f.contact.trim()).forEach(f => {
    const k = f.contact.trim().toLowerCase();
    if (known.has(k)) return;
    const have = out.get(k);
    if (!have) out.set(k, { name: f.contact.trim(), email: (f.email || '').trim() }); else if (!have.email && f.email) have.email = f.email.trim();
  });
  return [...out.values()];
}
// "Add this customer to the directory": its organisation (when it has none) and a card, category customers, for each person questioned
export function addClientToDirectory(d: State, name: string, extra: Feedback[] = [], orgId?: string): { org: Org; added: number } {
  const clean = name.trim();
  let org = orgFor(d, clean, orgId);   // an organisation that exists, under whatever name it has now, is never made twice
  if (!org) { org = { id: uid('org'), name: clean, category: 'client', phone: '', email: '', address: '', reference: '' }; d.orgs[org.id] = org; }
  const people = peopleToAdd(d, clean, extra, orgId);
  people.forEach(p => { const id = uid('ct'); d.contacts[id] = { id, category: 'client', name: p.name, role: '', company: org!.name, phone: '', email: p.email, always: false, verifiedAt: '' }; });
  return { org, added: people.length };
}
// A new review for a customer: the person questioned last time (or the first card of the directory) and the e-mail that goes with it
export function feedbackForClient(s: Pick<State, 'feedbacks'> & Partial<Pick<State, 'orgs' | 'contacts'>>, name: string, today = new Date()): Feedback {
  const last = Object.values(s.feedbacks).filter(f => sameClient(f.client, name)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const dir = directoryOfClient(s, name, last?.orgId);
  const contact = last?.contact || dir.contacts[0]?.name || '';
  const card = dir.contacts.find(c => c.name.trim().toLowerCase() === contact.trim().toLowerCase());
  return { ...newFeedback(today), client: name, contact, email: last?.email || card?.email || '' };
}
// The orders of 3.4 that cite an organisation or a person of the directory (as the organisation or the receptionist of one of their deliveries): said before one is deleted
export function ordersCiting(s: Pick<State, 'deliveries'> & Partial<Pick<State, 'orgs'>>, ref: { orgId?: string; name?: string; contactId?: string }): Delivery[] {
  const { orgId, name, contactId } = ref;
  return Object.values(s.deliveries).filter(d => (contactId && (d.contactId === contactId || receptionsOf(d).some(x => x.reception.contactId === contactId)))
    || (orgId && (d.orgId === orgId || receptionsOf(d).some(x => x.reception.orgId === orgId)))
    || (name && !d.orgId && sameClient(d.client, name)));
}
// An organisation renamed in the directory renames it on its orders (the text shown); the link (`orgId`) stays. An order without a link follows by the words of the old name.
export function renameOrgOrders(d: Pick<State, 'deliveries'>, org: Pick<Org, 'id' | 'category'>, before: string, after: string): number {
  if (!after.trim()) return 0;
  const hit = Object.values(d.deliveries).filter(x => (x.orgId === org.id || (!x.orgId && org.category === 'client' && !!before.trim() && sameClient(x.client, before))) && x.client !== after);
  hit.forEach(x => { x.client = after; });
  return hit.length;
}
