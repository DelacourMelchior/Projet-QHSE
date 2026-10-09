// Tool 3.3 "Maintenance", two people write the same record: nothing a person did is lost.
// 1. mergeEquipment / mergeSpare: two versions of one record become one. What was typed (name, points, checks, contacts…) comes from the newer version, except
//    the fields that the other version's device typed and the newer one did not (`touched`, see `typed`); the life (routines, anomalies, breakdowns, check
//    history, stock movements) is the union of both, by id, minus what was removed on purpose (`gone`); a retirement stands unless a return to service is as
//    recent. Versions of one key are folded in ascending order of time: `versions.reduce(mergeEquipment)`.
// 2. revertEquipment / revertSpare: "Annuler" undoes what the gesture changed (before → after) on the CURRENT record, and nothing else: what other people did
//    since stays. Pure functions, covered by maintenanceMerge.test.ts.
import type { Anomaly, Breakdown, CheckLife, Equipment, Inspection, Spare, SpareMove } from './types';
import { GONE_KEPT, LIFE_KEYS, compactBefore, inspectionKey, recs } from './maintenance';
import { doneKey } from './maintenanceChecks';
import { MOVES_KEPT, SPARE_LIFE, atOf, keepMoves, movesFrom } from './maintenanceSpares';
import { addDays } from './base';

type Rec = Record<string, unknown>;
// Incomplete records (a list that is not a list, an empty slot, a value that is not a record) read as empty
const arr = recs;
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);
const idOf = (x: object): string => (x as { id?: string }).id ?? JSON.stringify(x);
// A pause (a retirement closed by a return to service) has no id: its two dates make it
const pauseKey = (x: { from: string; to: string }): string => `${x.from}|${x.to}`;
// Same content, whatever the order of the keys; a key set to undefined is a key not set
const defined = (o: object) => Object.keys(o).filter(k => (o as Rec)[k] !== undefined);
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = defined(a), kb = defined(b);
  return ka.length === kb.length && ka.every(k => same((a as Rec)[k], (b as Rec)[k]));
}
const keepGone = (gone: Iterable<string>) => [...gone].slice(-GONE_KEPT);

// ---- merging
// Union of two lists by key, minus what was removed on purpose; for one key `pick(copy of the older, copy of the newer)` says which one stays (the newer one by default)
function union<T extends object>(a: T[] | undefined, b: T[] | undefined, key: (x: T) => string, gone: Set<string>, pick: (o: T, n: T) => T = (_, n) => n): T[] {
  const m = new Map<string, T>();
  for (const x of [...arr(a), ...arr(b)]) {
    const k = key(x);
    if (!gone.has(k)) m.set(k, m.has(k) ? pick(m.get(k)!, x) : x);
  }
  return [...m.values()];
}
// A routine summarised by compactInspections (no results, only its worst one). The oldest data have no id: their summary is a different key from the complete
// routine, so it is left out when a complete routine of the same day and person is there
const isSummary = (i: Inspection) => !i.results?.length && !!i.worst;
// In order of date then of time: the last of the list is the latest routine, whichever copy it was written in first
function mergeInspections(a: Inspection[] | undefined, b: Inspection[] | undefined, gone: Set<string>): Inspection[] {
  const list = union(a, b, inspectionKey, gone);
  const full = new Set(list.filter(i => !isSummary(i)).map(i => `${i.date}|${i.by}`));
  return list.filter(i => !(isSummary(i) && !i.id && full.has(`${i.date}|${i.by}`)))
    .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.at ?? '') < (y.at ?? '') ? -1 : (x.at ?? '') > (y.at ?? '') ? 1 : 0));
}
// The copy that went furthest stays; at the same stage, the newer one
const furthest = <T,>(rank: (x: T) => number) => (o: T, n: T) => (rank(n) >= rank(o) ? n : o);
const anomalyRank = (a: Anomaly) => (a.closedAt ? 2 : a.repairedAt ? 1 : 0);
const breakdownRank = (b: Breakdown) => (b.endedAt ? 1 : 0);
// The stop follows the breakdowns: the oldest one still open gives its start; with none open the stop is over, unless it has no breakdown of its own (the first
// versions, or a breakdown without start): then the stop given is kept
function stopOf(bs: Breakdown[], given: string | undefined): string | undefined {
  const open = bs.filter(b => b.startedAt && !b.endedAt).map(b => b.startedAt!).sort()[0];
  return open ?? (given && !bs.some(b => b.startedAt === given) ? given : undefined);
}
// A check: the history and the observations of both; the planning of the newer (marking a check done takes it off)
function mergeLife(o: CheckLife | undefined, n: CheckLife | undefined, gone: Set<string>): CheckLife {
  const out: CheckLife = { ...(n ?? o), history: union(o?.history, n?.history, doneKey, gone) };
  const reserves = union(o?.reserves, n?.reserves, idOf, gone, (a, b) => (b.liftedAt || !a.liftedAt ? b : a));   // the copy with the lifting date
  if (o?.reserves || n?.reserves) out.reserves = reserves; else delete out.reserves;
  return out;
}

// What was typed (everything that is not life): the newer copy's, except for the fields the other copy's device typed. A copy says which fields its device typed,
// in `touchedAt` (field -> when, an ISO stamp; a field keeps the stamp of its last change until the device changes it again) and in `touched` (the fields typed
// since it read the folder, written before the stamps existed). A field only one copy touched is that copy's (the other device did not change it, it only wrote
// it along with a gesture on a sheet it had read before). A field both touched is the one of the later stamp, so that a field typed again after the other device typed
// it stays as typed last, even when the other device's file was written afterwards; without a stamp on both, the newer copy's. A field neither touched is the newer
// copy's. A copy that says nothing (written before the lists existed) says nothing: the newer copy is taken whole. The result holds what both say (the later stamp
// of each field), so that folding a third copy goes on in the same way.
const stampsOf = (x: unknown): Record<string, string> => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([k, v]) => !(k in Object.prototype) && typeof v === 'string' && v)) : {});
const says = (x: Rec) => Array.isArray(x.touched) || (!!x.touchedAt && typeof x.touchedAt === 'object' && !Array.isArray(x.touchedAt));
function typed<T extends object>(older: T, newer: T, life: readonly string[]): T {
  const [o, n] = [older, newer] as unknown as Rec[], out = { ...n };
  if (!says(o) || !says(n)) return out as T;
  const [so, sn] = [stampsOf(o.touchedAt), stampsOf(n.touchedAt)], mine = new Set([...strings(n.touched), ...Object.keys(sn)]);
  for (const k of new Set([...strings(o.touched), ...Object.keys(so)])) {
    if (life.includes(k) || k === 'id' || k === 'gone' || k in Object.prototype) continue;   // the life, the key and the removed ids are never taken from a list of typed fields, nor the names every object has
    if (mine.has(k) && !(so[k] && sn[k] && so[k] > sn[k])) continue;
    if (Object.hasOwn(o, k) && o[k] !== undefined) out[k] = o[k]; else delete out[k];
  }
  if (Array.isArray(o.touched) || Array.isArray(n.touched)) out.touched = [...new Set([...strings(n.touched), ...strings(o.touched)])];
  const at = new Map<string, string>();
  for (const [k, v] of [...Object.entries(so), ...Object.entries(sn)]) if (!life.includes(k) && k !== 'id' && k !== 'gone' && (!at.has(k) || v > at.get(k)!)) at.set(k, v);
  if (at.size) out.touchedAt = Object.fromEntries(at); else delete out.touchedAt;
  return out as T;
}
// The day of a date or of a "YYYY-MM-DDTHH:MM" stamp
const dayOf = (x: unknown) => (typeof x === 'string' ? x.slice(0, 10) : '');

export function mergeEquipment(older: Equipment, newer: Equipment): Equipment {
  if (!older || typeof older !== 'object') return newer;
  if (!newer || typeof newer !== 'object') return older;
  const goneList = keepGone(new Set([...strings(older.gone), ...strings(newer.gone)])), gone = new Set(goneList);
  const out: Equipment = { ...typed(older, newer, LIFE_KEYS), inspections: mergeInspections(older.inspections, newer.inspections, gone) };
  // A routine is summarised once it is older than 24 months (compactInspections) and then no copy holds it complete, but a stale copy may: the complete routines
  // dated no later than the latest summary of either copy are summarised here too, so that the weight does not come back at each merge
  const cut = [...arr(older.inspections), ...arr(newer.inspections)].filter(isSummary).map(i => i.date).sort().pop();
  if (typeof cut === 'string' && addDays(cut, 1)) out.inspections = compactBefore(out, addDays(cut, 1)).inspections;
  if (older.anomalies || newer.anomalies) out.anomalies = union(older.anomalies, newer.anomalies, idOf, gone, furthest(anomalyRank));
  if (older.breakdowns || newer.breakdowns) out.breakdowns = union(older.breakdowns, newer.breakdowns, idOf, gone, furthest(breakdownRank));
  if (older.checkLife || newer.checkLife) {
    const lives = (x: Equipment) => (x.checkLife && typeof x.checkLife === 'object' ? x.checkLife : {});
    out.checkLife = Object.fromEntries([...new Set([...Object.keys(lives(older)), ...Object.keys(lives(newer))])].map(id => [id, mergeLife(lives(older)[id], lives(newer)[id], gone)]));
  }
  if (older.pauses || newer.pauses) out.pauses = union(older.pauses, newer.pauses, pauseKey, gone).sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  const stop = stopOf(arr(out.breakdowns), newer.stoppedSince);
  if (stop) out.stoppedSince = stop; else delete out.stoppedSince;
  // The retirement of the copy that holds one (the newer first) stands unless a return to service is more recent than it, by the day: a retirement is a day, a
  // return to service has its time. On the same day the order of the copies says: a return to service held by the newer copy cancels a retirement of the older one,
  // a retirement held by the newer copy is made after the return to service the older one holds (and a copy that holds both is its own witness).
  const back = [older.reinstatedAt, newer.reinstatedAt].filter(x => dayOf(x)).sort().pop(), byNewer = !!dayOf(newer.retiredAt), from = byNewer ? newer : dayOf(older.retiredAt) ? older : null;
  if (back) out.reinstatedAt = back; else delete out.reinstatedAt;
  if (from && ![older.reinstatedAt, newer.reinstatedAt].some(b => dayOf(b) > dayOf(from.retiredAt)) && !(!byNewer && dayOf(newer.reinstatedAt) === dayOf(from.retiredAt))) {
    out.retiredAt = from.retiredAt;
    if (from.retiredNote === undefined) delete out.retiredNote; else out.retiredNote = from.retiredNote;
  } else { delete out.retiredAt; delete out.retiredNote; }
  if (goneList.length) out.gone = goneList; else delete out.gone;
  return out;
}

// The stock of the newer copy, plus the movements of the older one it does not know, minus the ones removed on purpose that it still holds: a movement both
// copies hold is counted once. The newer copy cuts its movements by age (13 months before its newest one) and by number (1000): what it cut is not unknown, and
// older ones of the same age are not counted again.
export function mergeSpare(older: Spare, newer: Spare): Spare {
  if (!older || typeof older !== 'object') return newer;
  if (!newer || typeof newer !== 'object') return older;
  const goneList = keepGone(new Set([...strings(older.gone), ...strings(newer.gone)])), gone = new Set(goneList);
  const mine = arr(newer.moves), known = new Set(mine.map(idOf)), start = mine.map(atOf).sort()[0] ?? '', from = movesFrom(mine);
  const delta = (ms: SpareMove[]) => ms.reduce((n, m) => n + (Number(m.delta) || 0), 0);
  const fresh = arr(older.moves).filter(m => !known.has(idOf(m)) && !gone.has(idOf(m)) && !(atOf(m) < start && (mine.length >= MOVES_KEPT || atOf(m).slice(0, 10) < from)));
  const out: Spare = { ...typed(older, newer, SPARE_LIFE), stock: Math.max(0, (Number(newer.stock) || 0) + delta(fresh) - delta(mine.filter(m => gone.has(idOf(m))))) };
  if (older.moves || newer.moves) out.moves = keepMoves(union(older.moves, newer.moves, idOf, gone).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)));
  if ((older.countedAt || '') > (newer.countedAt || '')) {
    out.countedAt = older.countedAt;
    if (older.countedBy === undefined) delete out.countedBy; else out.countedBy = older.countedBy;
  }
  if (goneList.length) out.gone = goneList; else delete out.gone;
  return out;
}

// ---- reverting a gesture: a three-way merge of before, after and the current record
// The fields the gesture changed go back to their old value, unless someone changed them since (the current value is no longer the one the gesture left)
function revertFields<T extends object>(cur: T, before: T, after: T, skip: readonly string[] = []): T {
  const out = { ...cur } as Rec, [c, b, a] = [cur, before, after] as unknown as Rec[];
  for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (skip.includes(k) || same(b[k], a[k]) || !same(c[k], a[k])) continue;
    if (b[k] === undefined) delete out[k]; else out[k] = b[k];
  }
  return out as T;
}
// The same for a list: what the gesture added goes (if unchanged since, and its key is written in `gone`), what it changed goes back field by field, what it
// removed comes back at its place if it is not there (and its key leaves `gone`)
function revertList<T extends object>(cur: T[] | undefined, before: T[] | undefined, after: T[] | undefined, key: (x: T) => string, gone: Set<string>): T[] {
  const b = arr(before), bm = new Map(b.map(x => [key(x), x])), am = new Map(arr(after).map(x => [key(x), x]));
  const out = arr(cur).flatMap((x): T[] => {
    const k = key(x), was = bm.get(k), now = am.get(k);
    if (!now) return [x];
    if (!was) { if (!same(x, now)) return [x]; gone.add(k); return []; }
    return [same(was, now) ? x : revertFields(x, was, now)];
  });
  b.forEach((x, i) => {
    const k = key(x);
    if (am.has(k) || out.some(y => key(y) === k)) return;
    const prev = i ? out.findIndex(y => key(y) === key(b[i - 1])) : -1;
    out.splice(i ? (prev < 0 ? out.length : prev + 1) : 0, 0, x);
    gone.delete(k);
  });
  return out;
}

const LISTS = { inspections: inspectionKey, anomalies: idOf, breakdowns: idOf, pauses: pauseKey, checkpoints: idOf, tasks: idOf, contacts: idOf, docs: idOf } as const;
// `before` and `after` are the record around the gesture, `current` is the record now: only what the gesture changed is undone (a routine, a stop, a line of
// history, a planning date, a removed point…), what changed elsewhere since stays. The stop is derived again from the breakdowns, as in the merge.
export function revertEquipment(current: Equipment, before: Equipment, after: Equipment): Equipment {
  if (![current, before, after].every(x => x && typeof x === 'object')) return current;   // nothing to undo on a record that is not there
  const [c, b, a] = [current, before, after], gone = new Set(strings(current.gone));
  const out = revertFields(current, before, after, [...Object.keys(LISTS), 'checkLife', 'stoppedSince', 'gone']);
  for (const k of Object.keys(LISTS) as (keyof typeof LISTS)[]) {
    if (c[k] === undefined && b[k] === undefined && a[k] === undefined) continue;
    const next = revertList(c[k] as object[] | undefined, b[k] as object[] | undefined, a[k] as object[] | undefined, LISTS[k] as (x: object) => string, gone);
    if (next.length || c[k] !== undefined) (out as unknown as Rec)[k] = next;
  }
  // A stop made by someone else since stays the only one: undoing a restart does not open the older breakdown beside it
  const live = (x: Breakdown) => x.startedAt && !x.endedAt, now = arr(c.breakdowns).filter(live);
  if (now.length && out.breakdowns) out.breakdowns = out.breakdowns.map(x => (live(x) && !now.some(y => y.id === x.id) ? arr(c.breakdowns).find(y => y.id === x.id) ?? x : x));
  const ids = new Set([...Object.keys(c.checkLife ?? {}), ...Object.keys(b.checkLife ?? {}), ...Object.keys(a.checkLife ?? {})]), none: CheckLife = { history: [] };
  const lives = Object.fromEntries([...ids].flatMap((id): [string, CheckLife][] => {
    const [lc, lb, la] = [c.checkLife?.[id], b.checkLife?.[id], a.checkLife?.[id]];
    const life = revertFields(lc ?? none, lb ?? none, la ?? none, ['history', 'reserves']);
    life.history = revertList(lc?.history, lb?.history, la?.history, doneKey, gone);
    const reserves = revertList(lc?.reserves, lb?.reserves, la?.reserves, idOf, gone);
    if (reserves.length || lc?.reserves) life.reserves = reserves; else delete life.reserves;
    return !lb && !life.history.length && !life.reserves?.length && !life.plannedAt ? [] : [[id, life]];   // a check the gesture was the first to write about is not left empty
  }));
  if (Object.keys(lives).length || c.checkLife) out.checkLife = lives;
  if (!same(b.breakdowns, a.breakdowns) || !same(b.stoppedSince, a.stoppedSince)) {
    const stop = stopOf(arr(out.breakdowns), same(c.stoppedSince, a.stoppedSince) ? b.stoppedSince : c.stoppedSince);
    if (stop) out.stoppedSince = stop; else delete out.stoppedSince;
  }
  const kept = keepGone(gone);
  if (kept.length) out.gone = kept; else delete out.gone;
  return out;
}

// The movements the gesture added are taken out of the current part and the stock follows by their delta (never put back to an absolute value: other people
// moved the stock since); the order, the count and the rest go back only if nobody changed them since. A part taken from an empty shelf gave a stock that stayed
// at 0: giving it back does not make a part appear.
export function revertSpare(current: Spare, before: Spare, after: Spare): Spare {
  if (![current, before, after].every(x => x && typeof x === 'object')) return current;
  const gone = new Set(strings(current.gone)), had = new Set(arr(before.moves).map(idOf));
  const added = arr(after.moves).filter(m => !had.has(idOf(m))), ids = new Set(added.map(idOf)), removed = arr(current.moves).filter(m => ids.has(idOf(m)));
  const delta = (ms: SpareMove[]) => ms.reduce((n, m) => n + (Number(m.delta) || 0), 0);
  const out = revertFields(current, before, after, ['moves', 'stock', 'gone']);
  if (removed.length) {
    out.moves = arr(current.moves).filter(m => !ids.has(idOf(m)));
    out.stock = Math.max(0, (Number(current.stock) || 0) - ((Number(before.stock) || 0) + delta(added) < 0 ? (Number(after.stock) || 0) - (Number(before.stock) || 0) : delta(removed)));
    removed.forEach(m => gone.add(idOf(m)));
  }
  const kept = keepGone(gone);
  if (kept.length) out.gone = kept; else delete out.gone;
  return out;
}
