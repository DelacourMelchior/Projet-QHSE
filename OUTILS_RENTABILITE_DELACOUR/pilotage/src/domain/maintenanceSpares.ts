// Tool 3.3 "Maintenance", the survival cabinet: ONE common list of spare parts for the whole company, each part saying which equipment it serves.
// Levels, movements (each one dated and signed), orders, counts, statistics, facts about the supplier (3.1), taking over the parts that used to be listed
// per machine, then the to-do list and the facts of the cabinet. Pure functions, covered by maintenanceSpares.test.ts.
// Facts state who, how many, since when and give no order; only the text of a task of the queue "À faire" may start with an infinitive.
import type { Equipment, MaintTodo, Spare, SparePart, SpareMove, State } from './types';
import { addDays, daysBetween, newId, nowLocal, sum, type Insight } from './base';
import { frDate, isoDate, parseDate } from './periods';
import { isAbsent } from './commercial';
import { classOfSupplier } from './suppliers';
import { norm } from './instructions';
import { recs, txt } from './maintenance';

const names = <T,>(xs: T[], f: (x: T) => string, sep = ', ') => xs.slice(0, 3).map(f).join(sep) + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
// A name or a reference that is not there (damaged data) reads as empty
const label = (sp: Spare) => txt(sp.name).trim() || txt(sp.ref).trim() || 'Pièce sans nom';
const since12 = (today: Date) => isoDate(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const qty = (n: unknown) => String(round3(Number(n) || 0));
// What a part may hold that is not a number (a stock never typed, a lead time of NaN) reads as 0 and as unknown
const stockOf = (sp: Spare) => (Number.isFinite(sp.stock) ? sp.stock : 0);
const minOf = (sp: Spare) => (Number.isFinite(sp.min) ? sp.min : 0);
const leadOf = (sp: Spare): number | null => (Number.isFinite(sp.leadDays) ? (sp.leadDays as number) : null);
const EXPIRY_DAYS = 60;   // a date limit shows when it is past or within this many days
export const ORDER_DEFAULT_DAYS = 30;   // an order with neither a day expected nor a lead time is late this many days after it was placed
export const MOVES_KEPT = 1000;         // hard limit on the movements of a part; the age rule below comes first
const MOVES_MONTHS = 13;                // the 12 months of the statistics, plus one

// ---- the part and its level
export const newSpare = (equipmentIds: string[] = []): Spare => ({
  id: newId('sp'), name: '', ref: '', equipmentIds, supplier: '', leadDays: null, min: 1, stock: 1, critical: true, why: [],
});
// Absent = critical; a consumable is told apart on purpose
export const isCritical = (sp: Spare) => sp.critical !== false;
export type SpareLevel = 'ok' | 'min' | 'low' | 'out';
export const SPARE_LEVEL: Record<SpareLevel, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending' }> = {
  ok: { label: 'Au-dessus du mini', tone: 'ok' }, min: { label: 'Au mini', tone: 'warn' },
  low: { label: 'Sous le mini', tone: 'alert' }, out: { label: 'En rupture', tone: 'alert' },
};
export const spareLevel = (sp: Spare): SpareLevel => { const n = stockOf(sp), min = minOf(sp); return n <= 0 && min > 0 ? 'out' : n < min ? 'low' : n === min ? 'min' : 'ok'; };
// The equipment may be missing from the state (a list of parts alone is enough for the levels and the movements)
type Cabinet = Pick<State, 'spares'> & { equipments?: State['equipments'] };
export const activeSpares = (s: Pick<State, 'spares'>): Spare[] => Object.values(s.spares || {}).filter(x => !x.retired).sort((a, b) => txt(a.name).localeCompare(txt(b.name), 'fr'));
const eqIdsOf = (sp: Spare): string[] => (Array.isArray(sp.equipmentIds) ? sp.equipmentIds : []);
export const sparesOf = (s: Pick<State, 'spares'>, equipmentId: string): Spare[] => activeSpares(s).filter(x => eqIdsOf(x).includes(equipmentId));
const equipmentsOf = (s: Cabinet, sp: Spare): Equipment[] => eqIdsOf(sp).map(id => (s.equipments && Object.hasOwn(s.equipments, id) ? s.equipments[id] : undefined)).filter((e): e is Equipment => !!e);
const liveOf = (s: Cabinet, sp: Spare): Equipment[] => equipmentsOf(s, sp).filter(e => !txt(e.retiredAt));
// A part whose equipment is all retired is not followed any more (no task, no fact, no figure); one that serves any equipment in service stays, and so does one
// that serves none. The cabinet itself (activeSpares) still lists it: it is on the shelf until it is retired from the cabinet.
export const followedSpares = (s: Cabinet): Spare[] => activeSpares(s).filter(x => liveOf(s, x).length > 0 || !equipmentsOf(s, x).length);
export const lowSpares = (s: Cabinet): Spare[] => followedSpares(s).filter(x => isCritical(x) && ['low', 'out'].includes(spareLevel(x)));

// ---- movements: the stock never goes below 0; every movement says who, when and why. The movement keeps the delta asked for (a part taken from an empty
// shelf is still a part used), the stock stays at 0 and has at most 3 decimals.
// A part keeps the movements of the 13 months before its newest one (at most 1000): the statistics need 12 months, however many movements a month holds.
// The time of a movement; a time that is not a text (damaged data) reads as none
export const atOf = (m: Pick<SpareMove, 'at'>): string => (typeof m.at === 'string' ? m.at : '');
export const movesFrom = (ms: SpareMove[]): string => {
  const d = parseDate([...ms].map(atOf).sort().pop());
  return d ? isoDate(new Date(d.getFullYear(), d.getMonth() - MOVES_MONTHS, d.getDate())) : '';
};
export const keepMoves = (ms: SpareMove[]): SpareMove[] => { const from = movesFrom(ms); return ms.filter(m => !atOf(m) || atOf(m).slice(0, 10) >= from).slice(-MOVES_KEPT); };
type MoveLink = Pick<SpareMove, 'equipmentId' | 'anomalyId' | 'breakdownId' | 'note'>;
export function moveSpare(sp: Spare, { delta, why, by, at = nowLocal(), ...link }: { delta: number; why: SpareMove['why']; by: string; at?: string } & MoveLink): Spare {
  if (!Number.isFinite(delta)) return sp;
  const move: SpareMove = { id: newId('mv'), at, by, delta, why };
  (['equipmentId', 'anomalyId', 'breakdownId', 'note'] as const).forEach(k => { if (link[k]) move[k] = link[k]; });
  return { ...sp, stock: Math.max(0, round3(stockOf(sp) + delta)), moves: keepMoves([...recs(sp.moves), move]) };
}
export const takeOut = (sp: Spare, by: string, o: MoveLink & { at?: string } = {}): Spare => moveSpare(sp, { delta: -1, why: 'use', by, ...o });
export const putBack = (sp: Spare, by: string, at = nowLocal()): Spare => moveSpare(sp, { delta: 1, why: 'return', by, at });

// ---- order: placed (quantity, day, expected day), received (the stock goes up by the quantity ordered), cancelled
// Without an expected day, the lead time of the part gives one.
export const orderSpare = (sp: Spare, qty: number, at: string, expectedAt?: string): Spare => ({
  ...sp, order: { qty: Math.max(1, Math.round(qty) || 1), at, expectedAt: expectedAt || (leadOf(sp) !== null ? addDays(at.slice(0, 10), leadOf(sp)!) : '') },
});
export function receiveSpare(sp: Spare, by: string, at: string, qty?: number): Spare {
  const { order: _order, ...rest } = sp, order = orderOf(sp);
  const n = Number.isFinite(qty) ? qty! : Number.isFinite(order?.qty) ? order!.qty : 0;
  return n > 0 ? moveSpare(rest, { delta: n, why: 'received', by, at }) : rest;
}
export function cancelOrder(sp: Spare): Spare {
  const { order: _gone, ...rest } = sp;
  return rest;
}
// An order that is not a record (damaged data) is no order
export const orderOf = (sp: Spare): NonNullable<Spare['order']> | null => (sp.order && typeof sp.order === 'object' && !Array.isArray(sp.order) ? sp.order : null);
// The day the delivery was expected: the day given, else the lead time of the part, else 30 days after the order ('' when nothing is on order)
export function orderDue(sp: Spare): string {
  const order = orderOf(sp), given = parseDate(txt(order?.expectedAt));
  return !order ? '' : given ? isoDate(given) : addDays(txt(order.at).slice(0, 10), leadOf(sp) ?? ORDER_DEFAULT_DAYS);
}
// Whole days since that day; 0 when nothing is on order or the day is not over
export const orderLateDays = (sp: Spare, today: Date): number => Math.max(0, daysBetween(orderDue(sp), today) ?? 0);

// ---- lead time in days. Words are read whole ("15 habituellement" and "réf 12 hydraulique" hold no lead time); terms side by side add up ("1 semaine, 2 jours"
// is 9); a range or a list of alternatives gives the longest ("2 à 3 semaines", "48h/72h"); working days are counted on the calendar (×7/5); a month is 30 days and
// a year 365; a bare number is a number of days; a started day counts ("sous 4 h" gives 1). A text with no duration gives null.
const LEAD_TERM = /(^|[^a-z0-9.,])(\d+(?:[.,]\d+)?)\s*(jo|h(?:eures?|rs?|ours?)?|j(?:ours?|rs?)?|days?|sem(?:aines?)?|sems?|w(?:eeks?|ks?)?|mois|months?|ans?|annees?|years?|yrs?)(?![a-z])(\s+ouvr[a-z]*)?/g;
const LEAD_DAYS: Record<string, number> = { j: 1, d: 1, s: 7, w: 7, m: 30, a: 365, y: 365 };   // by first letter of the unit; the hours are apart
export function leadDaysOf(text: string): number | null {
  const t = String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return Math.ceil(parseFloat(t.replace(',', '.')));
  let total = 0, longest = 0, end = -1;
  for (const m of t.matchAll(LEAD_TERM)) {
    const at = m.index! + m[1].length, v = parseFloat(m[2].replace(',', '.')), u = m[3][0];
    if (end >= 0 && !/^(?:[.,;+]|et|and)?$/.test(t.slice(end, at).trim())) { longest = Math.max(longest, total); total = 0; }
    total += u === 'h' ? v / 24 : u === 'j' && (m[3] === 'jo' || m[4]) ? v * 7 / 5 : v * LEAD_DAYS[u];
    end = m.index! + m[0].length;
  }
  return end < 0 ? (/immediat/.test(t) ? 0 : null) : Math.ceil(Math.round(Math.max(longest, total) * 1e6) / 1e6);
}
export const leadLabel = (sp: Spare) => (leadOf(sp) !== null ? plural(leadOf(sp)!, 'jour') : 'délai inconnu');

// ---- count of the cabinet: date and person on the part, a gap becomes a movement "count"
export function countSpare(sp: Spare, by: string, at: string, real?: number): Spare {
  const have = stockOf(sp), n = Number.isFinite(real) ? Math.max(0, Math.round(real!)) : have;
  const counted = n === have ? sp : moveSpare(sp, { delta: n - have, why: 'count', by, at, note: `Compté ${n} pour ${have} en stock` });
  return { ...counted, countedAt: at, countedBy: by };
}
const countLimit = (s: Pick<State, 'params'>) => (Number.isFinite(s.params.maint?.countDays) ? s.params.maint!.countDays! : 30);
// When the part was created: the time written in its identifier (newId puts the time in base 36 after the prefix), else its first movement; '' when nothing says,
// and such a part counts as an old one
const ID_TIME = /^sp_([0-9a-z]{8})[0-9a-z]{4}$/;
export function createdOf(sp: Spare): string {
  const m = ID_TIME.exec(txt(sp.id)), ms = m ? parseInt(m[1], 36) : NaN;
  return ms > 1.5e12 && ms < 4.1e12 ? nowLocal(new Date(ms)) : recs(sp.moves).map(atOf).filter(Boolean).sort()[0] ?? '';
}
// The cabinet is as recently counted as the part counted the longest ago, among the critical parts still followed: counting one part does not start the clock again
// for the others. `days` is null when one of them was never counted; `never` says how many. A part created less than `limit` days ago and never counted is left out:
// no count was late for it.
function countView(s: Cabinet, now: Date, limit: number) {
  const young = (x: Spare) => !txt(x.countedAt) && (daysBetween(createdOf(x).slice(0, 10), now) ?? Infinity) < limit;
  const xs = followedSpares(s).filter(x => isCritical(x) && !young(x)), ages = xs.map(x => (txt(x.countedAt) ? daysBetween(x.countedAt!, now) : null));
  const never = ages.filter(a => a === null).length;
  return { xs, never, days: xs.length && !never ? Math.max(...(ages as number[])) : null };
}
// Due from the limit of the settings (30 days); a cabinet without any critical part has nothing to count
export function countDue(s: Cabinet & Pick<State, 'params'>, now: Date): { due: boolean; days: number | null } {
  const { xs, days } = countView(s, now, countLimit(s));
  return { due: xs.length > 0 && (days === null || days >= countLimit(s)), days };
}
// "Nothing to report": every active part gets the date and the person, nothing else changes (by id, to be merged into the collection)
export const countCabinet = (s: Pick<State, 'spares'>, by: string, at: string): Record<string, Spare> =>
  Object.fromEntries(activeSpares(s).map(x => [x.id, { ...x, countedAt: at, countedBy: by }]));

// ---- statistics of the last 12 months, from the movements
// What went out net of what came back (a part taken then put back was not used)
export const usedLast12m = (sp: Spare, today: Date): number => {
  const since = since12(today);
  return Math.max(0, round3(sum(recs(sp.moves).filter(m => atOf(m).slice(0, 10) >= since && Number.isFinite(m.delta)).map(m => (m.why === 'use' && m.delta < 0) || (m.why === 'return' && m.delta > 0) ? -m.delta : 0))));
};
// Weeks the stock lasts at the rhythm of the part: the net use over the days since its first movement (28 at least, so that one use in a few days is not taken
// for a rhythm; 365 at most, the year of the statistics), one decimal; null without any use
export function stockWeeks(sp: Spare, today: Date): number | null {
  const used = usedLast12m(sp, today), first = recs(sp.moves).map(atOf).filter(Boolean).sort()[0] ?? '';
  const days = Math.min(365, Math.max(28, daysBetween(first.slice(0, 10), today) ?? 365));
  return used ? Math.round(stockOf(sp) / used * days / 7 * 10) / 10 : null;
}
// Days before the date limit, negative once it is past
export const expiresIn = (sp: Spare, today: Date): number | null => (txt(sp.expiresAt) ? daysBetween(isoDate(today), txt(sp.expiresAt)) : null);

// ---- supplier (3.1): the one picked in the list, else the one the text names; a part without supplier gives no fact
const supplierOf = (s: Pick<State, 'suppliers'>, sp: Spare) =>
  (sp.supplierId && s.suppliers && Object.hasOwn(s.suppliers, sp.supplierId) ? s.suppliers[sp.supplierId] : undefined) || (norm(txt(sp.supplier)) ? Object.values(s.suppliers || {}).find(x => norm(txt(x.name)) === norm(txt(sp.supplier))) : undefined);
const CLASS_C = 'le fournisseur est en classe C';
export function supplierFacts(s: State, sp: Spare): string[] {
  const x = supplierOf(s, sp);
  return x ? [...(classOfSupplier(x, s.params) === 'C' ? [CLASS_C] : []), ...(x.strategic ? ['fournisseur unique ou difficile à remplacer'] : [])] : [];
}

// ---- taking over the parts that were listed machine by machine (before the common cabinet)
// Same part = same reference, else same name (case and accents ignored)
export const spareKey = (sp: { ref: string; name: string }) => norm(txt(sp.ref)) || norm(txt(sp.name));
// Same text, same identifier on every device (the data of two phones merge without a second copy); fnv of instructions.ts, which it does not export
const hash = (t: string) => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
// Pure and repeatable: every `parts` list is emptied, so a second pass finds nothing to do. A part with neither name nor reference identifies nothing and is not kept.
// An order of the old data had no quantity: the quantity that brings the stock back to the mini is taken.
export function migrateParts(
  s: { equipments: Record<string, Equipment>; spares: Record<string, Spare> }, at = nowLocal(),
): { equipments: Record<string, Equipment>; spares: Record<string, Spare> } {
  if (!Object.values(s.equipments).some(e => e.parts?.length)) return { equipments: s.equipments, spares: s.spares };
  const groups = new Map<string, { parts: SparePart[]; eqIds: string[] }>();
  Object.values(s.equipments).forEach(e => (e.parts || []).forEach(p => {
    const k = spareKey(p);
    if (!k) return;
    const g = groups.get(k) || { parts: [], eqIds: [] };
    g.parts.push(p);
    if (!g.eqIds.includes(e.id)) g.eqIds.push(e.id);
    groups.set(k, g);
  }));
  const spares = { ...s.spares };
  groups.forEach(({ parts, eqIds }, k) => {
    const found = Object.values(spares).find(x => spareKey(x) === k);
    if (found) {
      const add = eqIds.filter(i => !found.equipmentIds.includes(i));
      if (add.length) spares[found.id] = { ...found, equipmentIds: [...found.equipmentIds, ...add] };
      return;
    }
    const first = (f: (p: SparePart) => string | undefined) => parts.map(p => (f(p) || '').trim()).find(Boolean) || '';
    const stock = sum(parts.map(p => p.stock)), min = Math.max(...parts.map(p => p.min || 0));
    const leads = parts.map(p => leadDaysOf(p.leadTime || '')).filter((n): n is number => n !== null);
    const ordered = parts.find(p => p.orderedAt);
    let id = `sp_${hash(k)}`;
    while (spares[id]) id += '_';
    spares[id] = {
      id, name: first(p => p.name) || first(p => p.ref), ref: first(p => p.ref), equipmentIds: eqIds, supplier: first(p => p.supplier),
      leadDays: leads.length ? Math.max(...leads) : null, min, stock, critical: true, why: [],
      ...(ordered ? { order: { qty: Math.max(1, min - stock), at: ordered.orderedAt!, expectedAt: ordered.expectedAt || '' } } : {}),
      moves: [{ id: `mv_${hash(k)}`, at, by: '', delta: stock, why: 'start', note: 'Reprise des pièces des équipements' }],
    };
  });
  return { equipments: Object.fromEntries(Object.entries(s.equipments).map(([id, e]) => [id, e.parts?.length ? { ...e, parts: [] } : e])), spares };
}

// ---- what a person types in the sheet of a part, and what lives apart
// Stock, movements, order and count change through their own moves (and from the full-screen view): saving what is typed never overwrites them;
// `gone` (the movements removed on purpose) lives with them
export const SPARE_LIFE = ['stock', 'moves', 'order', 'countedAt', 'countedBy'] as const;
export function takeSpareLife(into: Spare, from: Spare | undefined): Spare {
  if (!from) return into;
  const out = { ...into } as Record<string, unknown>;
  for (const k of [...SPARE_LIFE, 'gone'] as const) { if (from[k] === undefined) delete out[k]; else out[k] = from[k]; }
  return out as unknown as Spare;
}

// ---- assembly: the to-do list and the facts of the cabinet
// The manager of the first equipment in service the part serves
const whoOf = (s: State, sp: Spare) => liveOf(s, sp).map(e => txt(e.manager)).find(Boolean) || '';
const whereOf = (s: State, sp: Spare) => { const n = liveOf(s, sp).map(e => txt(e.name)).filter(Boolean); return n.length > 1 ? ` (${plural(n.length, 'équipement')})` : n.length ? ` (${n[0]})` : ''; };
// The holder of the key, or the deputy when the holder is away that day
const keyHolderOf = (s: State, day: string) => {
  const c = s.params.maint || {}, holder = txt(c.keyHolder), deputy = txt(c.keyDeputy);
  return holder && deputy && isAbsent(s, holder, day) && !isAbsent(s, deputy, day) ? deputy : holder;
};
const when = (days: number) => (days < 0 ? `dépassée depuis ${plural(-days, 'jour')}` : days === 0 ? "aujourd'hui" : `dans ${plural(days, 'jour')}`);
// How the cabinet stands for its count, as a statement (`all`: no part was ever counted)
const countState = (s: State, now: Date) => {
  const { xs, never, days } = countView(s, now, countLimit(s)), all = never === xs.length;
  return { all, st: all ? 'jamais comptée' : never ? `${plural(never, 'pièce jamais comptée', 'pièces jamais comptées')} sur ${xs.length}` : `plus ancien comptage d'une pièce il y a ${plural(days ?? 0, 'jour')}` };
};
// An order with no day expected and no lead time is counted from a default of 30 days: the statement says so
const undated = (sp: Spare) => !!orderOf(sp) && !parseDate(txt(orderOf(sp)!.expectedAt)) && leadOf(sp) === null;

// One line per part and per situation: a critical part under the mini without order (a rupture included) is "order"; an order past its day is "order-late"; a critical
// part still at 0 with an order on its way is "out". Consumables give a line only for a late order and a date limit. Counts and key give one line for the cabinet.
// Every line carries its `text` (the task, for the queue) and its `fact` (the same thing as a statement, for cards and messages). Parts of retired equipment give none.
export function spareTodos(s: State, now: Date): MaintTodo[] {
  const out: MaintTodo[] = [], day = isoDate(now), active = followedSpares(s);
  active.forEach(sp => {
    const lv = spareLevel(sp), late = orderLateDays(sp, now), order = orderOf(sp), exp = expiresIn(sp, now);
    const short = isCritical(sp) && (lv === 'low' || lv === 'out'), name = `${label(sp)}${whereOf(s, sp)}`;
    const have = lv === 'out' ? 'en rupture' : `${qty(stockOf(sp))} en stock pour un mini de ${qty(minOf(sp))}`, lead = leadOf(sp) !== null ? `, délai ${leadLabel(sp)}` : '';
    const add = (kind: MaintTodo['kind'], text: string, fact: string, tone: MaintTodo['tone'], due = '') => out.push({ id: `${kind}:${sp.id}`, kind, text, fact, tone, who: whoOf(s, sp), due, spareId: sp.id });
    if (order && late) {
      add('order-late', `Livraison de ${name} attendue depuis ${plural(late, 'jour')}${short && lv === 'out' ? ', pièce en rupture' : ''}`,
        `${name} : ${have}, commandée le ${frDate(order.at)}, attendue depuis ${plural(late, 'jour')}${undated(sp) ? ` (sans délai connu : ${ORDER_DEFAULT_DAYS} jours comptés après la commande)` : ''}`, short ? 'bad' : 'warn', orderDue(sp));
    } else if (short && !order) add('order', `Commander ${name} : ${have}${lead}`, `${name} : ${have}, aucune commande en cours${lead}`, 'bad');
    else if (order && isCritical(sp) && lv === 'out') {
      add('out', `${name} : en rupture, ${parseDate(order.expectedAt) ? `livraison attendue le ${frDate(order.expectedAt)}` : 'commande en cours'}`,
        `${name} : en rupture, commandée le ${frDate(order.at)}, ${undated(sp) ? 'sans date de livraison prévue' : `livraison attendue le ${frDate(orderDue(sp))}`}`, 'bad', orderDue(sp));
    }
    if (exp !== null && exp <= EXPIRY_DAYS) { const t = `${name} : date limite ${when(exp)}`; add('expiry', t, t, exp < 0 ? 'bad' : 'warn', txt(sp.expiresAt)); }
  });
  const c = countDue(s, now);
  if (c.due) {
    const { all, st } = countState(s, now);
    out.push({ id: 'count:cabinet', kind: 'count', tone: 'warn', who: keyHolderOf(s, day), due: c.days === null ? '' : addDays(day, countLimit(s) - c.days), text: `Compter l'armoire : ${st}`, fact: `Armoire${all ? '' : ' :'} ${st}` });
  }
  const m = s.params.maint || {}, deputy = txt(m.keyDeputy).trim(), holder = txt(m.keyHolder);
  if (active.length && holder.trim() && isAbsent(s, holder, day) && !(deputy && !isAbsent(s, deputy, day))) {
    const text = `Absence de ${holder}, porteur de la clé de l'armoire, ${deputy ? `et de ${deputy}, son suppléant` : 'sans suppléant'}`;
    out.push({ id: 'key:cabinet', kind: 'key', tone: 'warn', who: '', due: '', text, fact: text });
  }
  return out;
}

export function spareFacts(s: State, now: Date): Insight[] {
  const out: Insight[] = [], active = followedSpares(s), crit = active.filter(isCritical);
  const outs = crit.filter(x => spareLevel(x) === 'out'), lows = crit.filter(x => spareLevel(x) === 'low');
  if (outs.length) out.push({ key: 'spare-out', tone: 'bad', title: 'Pièces en rupture', text: `${plural(outs.length, 'pièce')} en rupture : ${names(outs, label)}.` });
  if (lows.length) out.push({ key: 'spare-low', tone: lows.every(x => !!orderOf(x)) ? 'warn' : 'bad', title: 'Pièces sous le mini', text: `${plural(lows.length, 'pièce')} sous le mini : ${names(lows, label)}.` });
  const late = active.filter(x => orderLateDays(x, now) > 0), blind = late.filter(undated);
  if (late.length) {
    out.push({
      key: 'spare-late', tone: late.some(x => isCritical(x) && ['low', 'out'].includes(spareLevel(x))) ? 'bad' : 'warn', title: 'Livraison en retard',
      text: (late.length === 1 ? `Livraison de ${label(late[0])} attendue depuis ${plural(orderLateDays(late[0], now), 'jour')}.`
        : `${plural(late.length, 'livraison')} en retard : ${names(late, x => `${label(x)} (${plural(orderLateDays(x, now), 'jour')})`)}.`)
        + (blind.length ? ` Sans délai connu pour ${names(blind, label)} : ${ORDER_DEFAULT_DAYS} jours comptés après la commande.` : ''),
    });
  }
  // stock shorter than the delivery time, at the rhythm of the part; a rhythm that cannot be compared to a delivery time without one is said
  const tight = crit.filter(x => spareLevel(x) !== 'out' && leadOf(x) !== null && (stockWeeks(x, now) ?? Infinity) * 7 < leadOf(x)!);
  if (tight.length) out.push({ key: 'spare-weeks', tone: 'warn', title: 'Stock plus court que le délai', text: `${names(tight, x => `${label(x)} : stock pour ${plural(Math.round(stockWeeks(x, now)!), 'semaine')}, livraison en ${leadLabel(x)}`, ' ; ')}. Calcul au rythme observé depuis le premier mouvement de la pièce, 12 mois au plus.` });
  const blank = crit.filter(x => leadOf(x) === null && stockWeeks(x, now) !== null);
  if (blank.length) out.push({ key: 'spare-lead', tone: 'warn', title: 'Délai de livraison inconnu', text: `Délai de livraison non renseigné ou non compris pour ${names(blank, label)} : le stock n'est pas comparé au délai.` });
  const dated = active.map(x => ({ x, d: expiresIn(x, now) })).filter((y): y is { x: Spare; d: number } => y.d !== null && y.d <= EXPIRY_DAYS);
  if (dated.length) out.push({ key: 'spare-expiry', tone: dated.some(y => y.d < 0) ? 'bad' : 'warn', title: 'Date limite', text: `Date limite : ${names(dated, y => `${label(y.x)} (${when(y.d)})`)}.` });
  const c = countDue(s, now), { xs, never } = countView(s, now, countLimit(s));
  if (c.due) {
    out.push({
      key: 'spare-count', tone: 'warn', title: "Comptage de l'armoire",
      text: never === xs.length ? "L'armoire n'a jamais été comptée." : `${never ? `${plural(never, 'pièce jamais comptée', 'pièces jamais comptées')} sur ${xs.length}` : `Plus ancien comptage d'une pièce de l'armoire il y a ${plural(c.days!, 'jour')}`}, intervalle prévu de ${plural(countLimit(s), 'jour')}.`,
    });
  }
  const inC = new Map<string, string[]>();
  active.filter(x => supplierFacts(s, x).includes(CLASS_C)).forEach(x => { const n = supplierOf(s, x)!.name; inC.set(n, [...(inC.get(n) || []), label(x)]); });
  if (inC.size) out.push({ key: 'spare-supplier', tone: 'warn', title: 'Fournisseur en classe C', text: `Pièces d'un fournisseur en classe C : ${names([...inC], ([n, ps]) => `${n} (${ps.join(', ')})`, ' ; ')}.` });
  return out;
}
