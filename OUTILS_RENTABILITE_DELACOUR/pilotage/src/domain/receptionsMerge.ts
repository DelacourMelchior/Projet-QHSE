// Tool 3.4: two copies of one order (the file of a phone, the version of another computer in the shared folder, another tab) become one, and nothing a person did is lost.
// Pure functions of the domain: no access to any storage, the same rules will run on a server. `mergeDelivery(a, b)` is idempotent and commutative (the order of the arguments
// changes nothing, unless `newer` says which copy is the later one: it then gives the typed content), covered by receptionsMerge.test.ts.
// - the milestones are merged by id: the history is the union of both (a check both hold counts once), the current result is the one of the copy whose last check is the latest;
//   the reservations and the closed deliveries (`lots`) by id and by number, the checks before departure by their latest moment;
// - the journal is the union of both by (moment, text), the lines of proof included (the 300 lines of noise cap stands);
// - a signature (client, company, witness, photo of the paper PV) is the first one given, never replaced by an absence; a release made on one side is not undone by the other
//   (unless the journal says it was undone after it); the seals are united in the order of their moments;
// - a signed PV is not rewritten by a copy that did not see the signature: its sealed content is kept as it is, and when the other copy held something else the journal says
//   which version was kept ("conflit : version signée à 9 h 05 gardée, autre version non reprise").
// A milestone or a reservation withdrawn on one side comes back from the other (nothing says it was withdrawn on purpose).
import type { Delivery } from './types';
import { nb } from './base';
import { AFTER_PV, MILESTONE_LIFE_KEYS, idOf, isLocked, sealContent } from './receptions';

type R = Record<string, any>;
const isRec = (v: unknown): v is R => !!v && typeof v === 'object' && !Array.isArray(v);
const recs = (v: unknown): R[] => (Array.isArray(v) ? v.filter(isRec) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
// The same content whatever the order of the keys (a key set to undefined is a key not set)
export const canon = (v: unknown): string => JSON.stringify(v, (_, x) => (isRec(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => cmp(a, b))) : x));
const empty = (v: unknown): boolean => v === undefined || v === null || v === '';
const latest = (xs: unknown[]): string => xs.map(str).reduce((m, x) => (x > m ? x : m), '');
const drop = (o: R, ks: readonly string[]): R => Object.fromEntries(Object.entries(o).filter(([k]) => !ks.includes(k)));
const take = (o: R, ks: readonly string[]): R => Object.fromEntries(ks.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
// `p` with, for what it has nothing in (a key without value, an empty text), the value of `o`
const fill = (p: R, o: R): R => { const out = { ...o, ...p }; for (const k of Object.keys(out)) if (empty(p[k]) && !empty(o[k])) out[k] = o[k]; return out; };
// The keys `ks` of `from` (none when `from` is none) put on `out`
const setFrom = (out: R, from: R | undefined, ks: readonly string[]): void => { ks.forEach(k => { delete out[k]; }); if (from) Object.assign(out, take(from, ks)); };
// Among the candidates, the one that holds its fact the earliest (no moment: after any moment); at the same moment the smaller content: the choice never depends on the order
const firstBy = <T,>(xs: T[], at: (x: T) => unknown): T | undefined => xs.map(x => [x, str(at(x)) || '~'] as const).sort((a, b) => cmp(a[1], b[1]) || cmp(canon(a[0]), canon(b[0])))[0]?.[0];

// Two lists, each in its own order, become one: what both hold (`cmpf` says 0) is joined into one item, the rest is put in the order of `cmpf`; each list keeps its own order.
// `once`: an item that was already put (the same content, a list that is not in order) is not put again
function weave(a: R[], b: R[], cmpf: (x: R, y: R) => number, join: (x: R, y: R) => R, once = false): R[] {
  const out: R[] = [], seen = new Set<string>();
  for (let i = 0, j = 0; i < a.length || j < b.length;) {
    const c = i >= a.length ? 1 : j >= b.length ? -1 : cmpf(a[i], b[j]), x = c === 0 ? join(a[i++], b[j++]) : c < 0 ? a[i++] : b[j++], k = once ? canon(x) : '';
    if (!once || !seen.has(k)) { out.push(x); seen.add(k); }
  }
  return out;
}
// Two lists of records by id: the ones of `a` in their order (joined with the one of `b` of the same id), then the ones only `b` holds
function byId(a: R[], b: R[], key: (x: R, i: number) => string, join: (p: R, o: R) => R): R[] {
  const bm = new Map(b.map((x, i) => [key(x, i), x])), seen = new Set<string>();
  const out = a.map((x, i) => { const k = key(x, i), y = bm.get(k); seen.add(k); return y ? join(x, y) : x; });
  b.forEach((x, i) => { if (!seen.has(key(x, i))) out.push(x); });
  return out;
}

// ---- the journal: the lines of both by (moment, text), the same person or not; a line of proof stays one; at most 300 lines of noise
const line = (x: R, y: R): R => ({ at: x.at, by: [x.by, y.by].map(str).filter(Boolean).sort()[0] ?? '', text: x.text, ...(x.proof || y.proof ? { proof: true } : {}) });
const sameLine = (x: R, y: R): number => cmp(str(x.at), str(y.at)) || cmp(str(x.text), str(y.text));
const capped = (js: R[]): R[] => { let extra = js.filter(l => !l.proof).length - 300; return extra > 0 ? js.filter(l => l.proof || extra-- <= 0) : js; };
const UNDONE = /^Libération (défaite|annulée)/, RESTORED = /^Commande restaurée/;

// ---- one milestone, the same id on both sides: the definition (typed) of `p`, the history of both, the result of the copy that checked last
const byEvent = (x: R, y: R): number => cmp(str(x.at), str(y.at)) || cmp(canon(x), canon(y));
function mergeMilestone(p: R, o: R): R {
  const [x, y] = [p, o].map(m => latest(recs(m.history).map(e => e.at))), lead = x !== y ? x > y : canon(p) <= canon(o), L = lead ? p : o, N = lead ? o : p, out = fill(p, o);
  const life = MILESTONE_LIFE_KEYS.filter(k => k !== 'history' && k !== 'ncId');
  setFrom(out, L, life);
  setFrom(out, { ncId: L.ncId ?? N.ncId }, ['ncId']);
  setFrom(out, p, ['na', 'naReason']);   // set aside or applicable again: the line of the journal says who; the copy that leads says what stands
  if (p.history !== undefined || o.history !== undefined) out.history = weave(recs(p.history), recs(o.history), byEvent, e => e); else delete out.history;
  return out;
}
const msKey = (m: R, i: number) => idOf(m as never, i);

// ---- a reservation, the same id on both sides: a lift is never undone by a copy that did not see it (the earliest lift stands), nor a repair
const LIFT = ['liftedAt', 'liftedBy', 'liftNote', 'liftPhoto', 'liftSign'];
function mergeReserve(p: R, o: R): R {
  const out = fill(p, o);
  setFrom(out, firstBy([p, o].filter(r => r.liftedAt), r => r.liftedAt), LIFT);
  setFrom(out, firstBy([p, o].filter(r => r.repairedAt), r => r.repairedAt), ['repairedAt', 'repairPhoto']);
  return out;
}

// ---- one delivery (the one under way or a closed one) of the two copies
const OWN = ['milestones', 'reception', 'releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'signCompany', 'signClient', 'pvPhoto', 'liftPhoto', 'liftSignedBy'];
const SEALED = ['releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'signCompany', 'signClient', 'pvPhoto'];
const inked = (s: unknown): boolean => Array.isArray(s) && s.some(x => Array.isArray(x) && x.length);
const side = (x: R): R => { const re = isRec(x.reception) ? { ...x.reception } : {}; if (re.reserves !== undefined && !Array.isArray(re.reserves)) delete re.reserves; return { ...take(x, OWN), milestones: recs(x.milestones), reception: re }; };
const locked = (x: R): boolean => isLocked(x as never);
// When a copy became locked: the first of its moments of signature (a PV that was signed before the moments were kept has none: '')
const lockAt = (x: R): string => [x.reception.signedAt, x.reception.noSign?.at, x.reception.pvPhotoAt].map(str).filter(Boolean).sort()[0] ?? '';
// What the seal of a PV covers, for this delivery alone (the identity of the order and the closed deliveries are the business of the whole order)
const sealed = (x: R): string => sealContent({ ...x, id: '', lots: [] } as never);
// The sealed content of `w` put on the merged `u`: the part that is not sealed (the lifts, the repairs, the seals) stays the merged one
function enforce(u: R, w: R): R {
  const out: R = { ...drop(u, SEALED), ...take(w, SEALED) }, found = new Map<string, R>(u.milestones.map((m: R, i: number) => [msKey(m, i), m])), later = new Map(recs(u.reception.reserves).map(r => [r.id, r] as const));
  out.milestones = w.milestones.map((m: R, i: number) => { const nc = found.get(msKey(m, i))?.ncId; return nc && !m.ncId ? { ...m, ncId: nc } : m; });
  out.reception = { ...drop(w.reception, ['seals', 'liftedAt', 'reserves']), ...take(u.reception, ['seals', 'liftedAt']), ...(w.reception.reserves !== undefined ? { reserves: recs(w.reception.reserves).map(r => ({ ...r, ...take(later.get(r.id) ?? {}, AFTER_PV) })) } : {}) };
  return out;
}

// The same but for a fact that may be absent on both sides (then what the copies hold stays): the keys of the one that holds it the earliest
const firstOf = (out: R, from: R[], at: (x: R) => unknown, ks: readonly string[], src: (x: R) => R = x => x): void => { const f = firstBy(from, at); if (f) setFrom(out, src(f), ks); };
// The version of a signed PV that stands among the copies that hold one: signed first; then the one that went furthest (its seals continue the other's); then the latest seal
const heir = (xs: R[]): R | undefined => [...xs].sort((a, b) => cmp(lockAt(a) || '~', lockAt(b) || '~') || recs(b.reception.seals).length - recs(a.reception.seals).length
  || cmp(latest(recs(b.reception.seals).map(x => x.at)), latest(recs(a.reception.seals).map(x => x.at))) || cmp(canon(a), canon(b)))[0];
const conflict = (at: string, tag = ''): R => { const t = at.match(/T(\d\d):(\d\d)/); return { at: at === '~' ? '' : at, by: '', text: nb(`conflit : version signée ${t ? `à ${+t[1]} h ${t[2]} ` : ''}gardée, autre version non reprise${tag}`), proof: true }; };

// `p0` is the copy that leads (typed content), `o0` the other; a signed copy leads whatever the order. `undo`: for each copy, the latest moment a release was undone on the other copy
// without this copy knowing it (null for a closed delivery);
// `notes` receives the lines of the journal to add.
function mergeDelivered(p0: R, o0: R, undo: [string, string] | null, notes: R[], tag: string): R {
  const sides = [side(p0), side(o0)], side0 = sides[0], w = heir(sides.filter(locked)), [p, o] = w && w === sides[1] ? [sides[1], sides[0]] : sides, [rp, ro] = [p.reception, o.reception];
  const out = fill(take(p, ['liftPhoto', 'liftSignedBy']), take(o, ['liftPhoto', 'liftSignedBy'])), re = fill(rp, ro), recd = [rp, ro];
  // the reception: the first moments given stay (delivery, signatures, witness, waivers, agreement), a result is never replaced by "none", the lowest number stays
  firstOf(re, recd.filter(r => r.date), r => `${r.date}T${str(r.time)}`, ['date', 'time']);
  firstOf(re, recd.filter(r => r.signedAt), r => r.signedAt, ['signedAt', 'signTz']);
  firstOf(re, recd.filter(r => r.companySignedAt), r => r.companySignedAt, ['companySignedAt']);
  firstOf(re, recd.filter(r => isRec(r.noSign)), r => r.noSign.at, ['noSign']);
  firstOf(re, recd.filter(r => isRec(r.signWaiver)), r => r.signWaiver.at, ['signWaiver']);
  firstOf(re, recd.filter(r => isRec(r.partialOk)), r => r.partialOk.at, ['partialOk']);
  setFrom(re, empty(rp.result) ? ro : rp, ['result', 'refusal']);
  firstOf(re, recd.filter(r => !empty(r.pvNo)), r => String(r.pvNo), ['pvNo']);   // two numbers for one PV: the lowest
  if (rp.reserves !== undefined || ro.reserves !== undefined) re.reserves = byId(recs(rp.reserves), recs(ro.reserves), x => str(x.id), mergeReserve); else delete re.reserves;
  if (rp.seals !== undefined || ro.seals !== undefined) re.seals = weave(recs(rp.seals), recs(ro.seals), (x, y) => cmp(str(x.at), str(y.at)) || cmp(canon(x), canon(y)), s => s, true); else delete re.seals;
  out.milestones = byId(p.milestones, o.milestones, msKey, mergeMilestone);
  // the signatures: the first of each kind (with its moment); the photo of the paper PV with the moment it was attached
  firstOf(out, sides.filter(x => inked(x.signClient)), x => x.reception.signedAt, ['signClient']);
  firstOf(out, sides.filter(x => inked(x.signCompany)), x => x.reception.companySignedAt, ['signCompany']);
  const photo = firstBy(sides.filter(x => x.pvPhoto), x => x.reception.pvPhotoAt);
  if (photo) { setFrom(out, photo, ['pvPhoto']); setFrom(re, photo.reception, ['pvPhotoAt']); }
  // the release: the earliest of those that were not undone after being made; none when they all were
  const rel = firstBy(sides.filter(x => x.releasedAt && !(undo && undo[x === side0 ? 0 : 1] > str(x.releasedMoment ?? x.releasedAt))), x => x.releasedMoment ?? x.releasedAt);
  setFrom(out, rel, ['releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation']);
  if (!rel) { out.releasedBy = ''; out.releasedAt = ''; }
  // the checks before departure: for each, the latest moment
  if (p.shipChecks !== undefined || o.shipChecks !== undefined) out.shipChecks = byId(recs(p.shipChecks), recs(o.shipChecks), x => str(x.id), (x, y) => (str(x.at) !== str(y.at) ? (str(x.at) > str(y.at) ? x : y) : canon(x) <= canon(y) ? x : y)); else delete out.shipChecks;
  out.reception = re;
  // a signed PV is not rewritten: its sealed content stands, and the journal says so when the other copy held something else that is not taken
  const res = w && sealed(out) !== sealed(w) ? enforce(out, w) : out;
  if (w && res !== out) notes.push(conflict(lockAt(w) || '~', tag));
  const last = w && recs(w.reception.seals).at(-1);   // the last seal of the version kept stays the last: it is the one that counts
  if (last && Array.isArray(res.reception.seals)) res.reception = { ...res.reception, seals: [...res.reception.seals.filter((x: R) => canon(x) !== canon(last)), last] };
  return res;
}

// ---- the whole order
const IDENTITY = ['id', 'ref', 'client', 'item', 'qty', 'promisedAt', 'lot', 'serial', 'material', 'orgId', 'contactId'];   // what the seal of a PV covers of the order
const activity = (d: R): string => latest([...recs(d.journal).map(l => l.at), ...[d, ...recs(d.lots)].flatMap(x => [x.reception?.signedAt, x.reception?.companySignedAt, ...recs(x.milestones).flatMap(m => recs(m.history).map(e => e.at))])]);
// The deliveries of an order, the closed ones then the one under way, by number
const deliveries = (d: R): { no: number; x: R; lot?: R }[] => {
  const lots = recs(d.lots).map((l, i) => ({ no: Number.isFinite(l.no) ? l.no : i + 1, x: l, lot: l }));
  return [...lots, { no: lots.length + 1, x: d }];
};
const anchor = (d: R): string | undefined => { const at = deliveries(d).map(y => side(y.x)).filter(locked).map(x => lockAt(x) || '~').sort()[0]; return at; };

export function mergeDelivery(a: Delivery, b: Delivery, newer?: 'a' | 'b'): Delivery {
  if (!isRec(a)) return b;
  if (!isRec(b)) return a;
  const [x, y] = [a, b].map(activity), lead = newer ? newer === 'a' : x !== y ? x > y : canon(a) <= canon(b), [p, o]: [R, R] = lead ? [a, b] : [b, a];
  const journal = weave(recs(a.journal), recs(b.journal), sameLine, line), notes: R[] = [];
  const unseen = (from: R, by: R, re: RegExp): string => { const known = new Set(recs(by.journal).map(l => `${l.at}|${l.text}`)); return latest(recs(from.journal).filter(l => re.test(str(l.text)) && !known.has(`${l.at}|${l.text}`)).map(l => l.at)); };
  const undoAt = [unseen(o, p, UNDONE), unseen(p, o, UNDONE)] as [string, string];
  // the deliveries of both copies by number: the closed ones become `lots`, the highest number is the one under way
  const [dp, dq] = [deliveries(p), deliveries(o)], top = Math.max(dp.length, dq.length), lots: R[] = [];
  let current: R = {};
  for (let no = 1; no <= top; no++) {
    const [u, v] = [dp.find(z => z.no === no), dq.find(z => z.no === no)], tag = top > 1 ? ` (livraison ${no})` : '';
    const merged = u && v ? mergeDelivered(u.x, v.x, no === top ? undoAt : null, notes, tag) : side((u ?? v)!.x);
    if (no === top) { current = merged; break; }
    const shell = [u?.lot, v?.lot].filter(isRec);
    lots.push({ ...merged, id: shell.map(l => str(l.id)).filter(Boolean).sort()[0] ?? '', no, closedAt: shell.map(l => str(l.closedAt)).filter(Boolean).sort()[0] ?? '' });
  }
  const own = [...OWN, 'lots', 'journal', 'archivedAt', 'archivedNote'], base = fill(drop(p, own), drop(o, own)), held = ([p, o] as R[]).filter(z => anchor(z) !== undefined).sort((x, y) => cmp(anchor(x)!, anchor(y)!))[0];   // signed first; at the same moment the copy that leads
  if (held) {   // a signed PV holds the order as it was: the copy signed first gives it; the journal says when the other copy typed something else
    setFrom(base, held, IDENTITY);
    const other = ([a, b] as R[]).find(z => z !== held);
    if (other && IDENTITY.some(k => !empty(other[k]) && canon(other[k]) !== canon(held[k]))) notes.push(conflict(anchor(held)!));
  }
  // archived: the earliest archive that the other copy did not restore after it (a restoration this copy does not know)
  setFrom(base, firstBy(([a, b] as R[]).filter(z => z.archivedAt && !(unseen(z === a ? b : a, z, RESTORED) > str(z.archivedAt))), z => z.archivedAt), ['archivedAt', 'archivedNote']);
  return {
    ...base, ...current, ...(a.lots !== undefined || b.lots !== undefined ? { lots } : {}),
    ...(a.journal !== undefined || b.journal !== undefined || notes.length ? { journal: capped(weave(journal, notes.sort(sameLine), sameLine, line)) } : {}),
  } as Delivery;
}

// ---- the numbers of the PV: who carries each one (the delivery under way and every closed one of every order); a number carried twice is said as a fact
const PV_NO = /^PV-(\d{4})-(\d+)$/;
export interface PvCarrier { d: Delivery; no: number }   // the order and the number of the delivery (1 for the first)
export function pvCarriers(ds: Delivery[]): Map<string, PvCarrier[]> {
  const out = new Map<string, PvCarrier[]>();
  for (const d of ds) [...recs(d?.lots), d as R].forEach((x, i) => { const n = str(x?.reception?.pvNo); if (PV_NO.test(n)) out.set(n, [...(out.get(n) ?? []), { d, no: i + 1 }]); });
  return out;
}
// The numbers carried twice, in the order of the numbers
export const pvDuplicates = (ds: Delivery[]): { no: string; carriers: PvCarrier[] }[] => [...pvCarriers(ds)].filter(([, c]) => c.length > 1).map(([no, carriers]) => ({ no, carriers })).sort((a, b) => cmp(a.no, b.no));
