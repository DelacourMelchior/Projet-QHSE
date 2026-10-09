// The pure logic of the screens of tool 3.4, kept out of the files of the screens so that a test reads it without a DOM: the five filters of the register and the states each one holds, what the
// search reads of an order, the count and the sort of the list, the customers, the name of an order taken out of the text of its task, the reservations that came back on several orders.
// What the register shows of a state is computed ONCE by `registerOf` (per state and per day): a key of the search or a click on a filter only reads it. The addresses are read by
// `parseFocus` (receptionsAll.ts, next to `receptionFocus` that writes them), given again here.
import type { Delivery, Org, ReceptionReserve, ReceptionTodo, State } from './types';
import { addDays } from './base';
import { orgKey } from './contacts';
import { isoDate } from './periods';
import { norm } from './text';
import { allReservesOf, deliveryState, isPostponed, lotsOf, openReserves, promisedOn, receptionsOf, type DeliveryState } from './receptions';
import { ord, receptionSummary, urgencies } from './receptionsAll';
export { parseFocus, type Focus } from './receptionsAll';

export type Filter = 'running' | 'toship' | 'reserves' | 'received' | 'archived';
// Every state of an order is in exactly one filter (a state added to `DELIVERY_STATE` that is in none would vanish from every list: a test reads it)
export const FILTERS: Record<Filter, DeliveryState[]> = {
  running: ['in_progress', 'blocked', 'delivered', 'refused'], toship: ['to_release', 'released', 'partial'], reserves: ['reserve', 'reserve_late'],
  received: ['accepted', 'lifted'], archived: ['archived'],
};
export const FILTER_KEYS = Object.keys(FILTERS) as Filter[];
// An order is in "Réserves" as long as a reservation is open on it (an archived one too: its follow-up goes on), else in the filter that holds its state
export const inFilter = (d: Delivery, f: Filter, st: DeliveryState): boolean => (f === 'reserves' ? openReserves(d).length > 0 : FILTERS[f].includes(st));

// What the search reads of an order: what a customer says on the phone (the order, the customer, the deliverable, the traceability, the quote) and the number of the PV and of the delivery
// note of every delivery of the order, the closed ones included
export const searchText = (d: Delivery, state: Pick<State, 'quotes'>) => norm([d.ref, d.client, d.item, d.lot, d.serial, d.material, d.template, d.quoteId && Object.hasOwn(state.quotes, d.quoteId) ? state.quotes[d.quoteId].ref : '',
  d.reception.pvNo, d.reception.bl, ...lotsOf(d).flatMap(l => [l.reception.pvNo, l.reception.bl])].join(' '));

// The text of a task says its order (for the queue); on the card of that order the name is left out (the domain writes the narrow spaces of nb(): they are read as plain spaces to find the name)
export const shortTask = (t: ReceptionTodo, d: Delivery) => { const o = ord(d); return t.text.replace(/[  ]/g, ' ').replace(` de ${o}`, '').replace(` : ${o}`, '').replace(` ${o}`, ''); };

// What the register shows of a state at a day: the summary (tasks, findings, counts), the state of each order, the customer key of each (one `orgKey` per name), what each is searched on, the tasks of
// each order (in the order of the queue) and its score of urgency. Computed once, read at every key.
export function registerOf(state: State, now: Date) {
  const sm = receptionSummary(state, now), all = Object.values(state.deliveries), st = new Map<string, DeliveryState>(), keys = new Map<string, string>(), texts = new Map<string, string>(), mine = new Map<string, ReceptionTodo[]>();
  all.forEach(d => { st.set(d.id, deliveryState(d, now, state.params)); keys.set(d.id, orgKey(d.client)); texts.set(d.id, searchText(d, state)); });
  sm.todos.forEach(t => { const l = mine.get(t.deliveryId); if (l) l.push(t); else mine.set(t.deliveryId, [t]); });
  return { state, sm, all, st, keys, texts, mine, urgency: urgencies(sm.todos) };
}
export type Register = ReturnType<typeof registerOf>;

// The orders of a filter (of a customer when `client` is given) that hold every word, unsorted
export const matching = (r: Register, f: Filter, client: string | undefined, words: string[]): Delivery[] =>
  r.all.filter(d => inFilter(d, f, r.st.get(d.id)!) && (!client || r.keys.get(d.id) === client) && words.every(w => r.texts.get(d.id)!.includes(w)));
const BY_REF = new Intl.Collator('fr', { numeric: true });
// The same, most pressing first, then the soonest promised day (the ones without a day last), then the number of the order
export const listOf = (r: Register, f: Filter, client: string | undefined, words: string[]): Delivery[] =>
  matching(r, f, client, words).sort((a, b) => (r.urgency.get(b.id) ?? 0) - (r.urgency.get(a.id) ?? 0) || (promisedOn(r.state, a) || '9').localeCompare(promisedOn(r.state, b) || '9') || BY_REF.compare(a.ref, b.ref));
// How many orders each filter holds (of a customer when `client` is given)
export function countBy(r: Register, client?: string): Record<Filter, number> {
  const out = Object.fromEntries(FILTER_KEYS.map(f => [f, 0])) as Record<Filter, number>;
  r.all.forEach(d => { if (!client || r.keys.get(d.id) === client) FILTER_KEYS.forEach(f => { if (inFilter(d, f, r.st.get(d.id)!)) out[f]++; }); });
  return out;
}

// By customer: orders, receptions pronounced, share without reservation; the organisation of the directory of each (found by its key: one `orgKey` per organisation, not one per customer and organisation)
export function clientsOf(r: Register): { key: string; name: string; orders: number; got: number; clean: number; org?: Org }[] {
  const groups = new Map<string, { name: string; orders: Delivery[] }>(), orgs = new Map<string, Org>();
  Object.values(r.state.orgs || {}).forEach(o => { const k = orgKey(o.name); if (!orgs.has(k)) orgs.set(k, o); });
  r.all.forEach(d => { const k = r.keys.get(d.id)!; if (!k) return; const g = groups.get(k); if (g) g.orders.push(d); else groups.set(k, { name: d.client.trim(), orders: [d] }); });
  return [...groups].map(([key, g]) => {
    const rs = g.orders.flatMap(d => receptionsOf(d)).map(x => x.reception).filter(x => (x.result === 'sans' || x.result === 'reserve') && !isPostponed({ reception: x }));   // a reception put off is not counted (as everywhere)
    return { key, name: g.name, orders: g.orders.length, got: rs.length, clean: rs.filter(x => x.result === 'sans').length, org: orgs.get(orgKey(g.name)) };
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// How many orders hold the same reservation text, noted within the last 12 months (the fact `receptionInsights` tells, read for one reservation): one pass over the orders, then one read per reservation
export function reserveBacks(s: Pick<State, 'deliveries'>, now: Date): (r: ReceptionReserve) => number {
  const from = addDays(isoDate(now), -365), orders = new Map<string, Set<string>>();
  Object.values(s.deliveries).forEach(d => allReservesOf(d).forEach(y => {
    const k = norm(y.text);
    if (k && y.raisedAt >= from) { const o = orders.get(k); if (o) o.add(d.id); else orders.set(k, new Set([d.id])); }
  }));
  return r => { const k = norm(r.text); return !k || r.raisedAt < from ? 0 : orders.get(k)?.size ?? 0; };
}
