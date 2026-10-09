// A change made on a copy that shares with the state it comes from everything it does not touch (F-1, S-21): `produce` gives the mutator a draft and returns the new state.
// Each top-level collection of the state (deliveries, people, settings…) is a shallow copy behind a proxy; a record of it is deep-copied the first time the mutator reads it or
// writes it, so a gesture on one order copies one order, not the whole company. What was not touched keeps its identity (`next.deliveries[other] === prev.deliveries[other]`),
// and a record read but left as it was is put back to its identity, so that "did it change" is an identity test and the journal sees only the records that really changed.
// The previous state is never changed. Nothing changed: the previous state itself is returned. A draft is only valid while the mutator runs (not kept, not put inside the state).
import type { State } from '../domain/types';
import { keepPvCounter } from '../domain/receptions';
import { changedRecords, flatten, logChanges } from './flat';

type Rec = Record<string, unknown>;
const obj = (v: unknown): v is Rec => typeof v === 'object' && v !== null;
const same = (a: unknown, b: unknown) => a === b || (obj(a) && obj(b) && JSON.stringify(a) === JSON.stringify(b));
// the state with its collections emptied: the journal reads the records that changed through it (they are put back in the two shells, before and after)
const shell = (s: Rec): Rec => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Array.isArray(v) ? [] : obj(v) ? {} : v]));

export function produce(prev: State, fn: (d: State) => void, by: string): State {
  const base = prev as unknown as Rec, root: Rec = { ...base };
  const parts = new Map<string, { copy: Rec; fresh: Set<string>; proxy: object }>();
  let open = true;
  for (const [k, v] of Object.entries(base)) {
    if (!obj(v)) continue;
    const copy = (Array.isArray(v) ? [...v] : { ...v }) as Rec, fresh = new Set<string>();   // fresh: the members that are this draft's own (copied or written)
    const proxy = new Proxy(copy, {
      get(t, p) {
        const x = t[p as string];
        if (!open || typeof p !== 'string' || !obj(x) || fresh.has(p) || !Object.hasOwn(t, p)) return x;
        fresh.add(p);
        return (t[p] = structuredClone(x));
      },
      set(t, p, x) { fresh.add(p as string); t[p as string] = x; return true; },
    });
    parts.set(k, { copy, fresh, proxy });
    root[k] = proxy;
  }
  try { fn(root as unknown as State); } catch (e) {
    // a mutator that copies a collection of the draft (`structuredClone` refuses a proxy) is played again on a whole copy: slower, the same result
    if ((e as Error)?.name !== 'DataCloneError') throw e;
    const all = structuredClone(prev);
    fn(all);
    logChanges(prev, all, by);
    return all;
  }
  open = false;

  // what changed: a collection whose members are all the same ones is the previous collection; a replaced collection is compared whole
  const changes: { k: string; ids: string[] | null }[] = [];
  for (const k of new Set([...Object.keys(root), ...Object.keys(base)])) {
    const part = parts.get(k), cur = [...parts.values()].find(x => x.proxy === root[k])?.copy ?? root[k], old = base[k];
    if (cur === undefined) delete root[k]; else root[k] = cur;
    if (cur === old) continue;
    if (part && cur === part.copy && obj(old)) {
      for (const p of part.fresh) if (Object.hasOwn(old, p) && same(part.copy[p], old[p])) part.copy[p] = old[p];
      const ids = [...new Set([...Object.keys(old), ...Object.keys(part.copy)])].filter(p => part.copy[p] !== old[p]);
      if (!ids.length) { root[k] = old; continue; }
      changes.push({ k, ids: Array.isArray(old) ? null : ids });
    } else if (same(cur, old)) { if (cur !== undefined) root[k] = old; }
    else changes.push({ k, ids: null });
  }
  if (!changes.length) return prev;

  const next = root as unknown as State;
  keepPvCounter(next);   // the counter of the PV numbers follows the numbers given (it replaces the settings, never changes them in place)
  const before = shell(base), after = shell(root);
  for (const { k, ids } of changes) {
    if (!ids) { before[k] = base[k]; if (root[k] !== undefined) after[k] = root[k]; continue; }
    for (const id of ids) {
      if (Object.hasOwn(base[k] as Rec, id)) (before[k] as Rec)[id] = (base[k] as Rec)[id];
      if (Object.hasOwn(root[k] as Rec, id)) (after[k] as Rec)[id] = (root[k] as Rec)[id];
    }
  }
  // the journal is written on a copy of its lines (one of them can be touched: the same person, the same record, within ten minutes), and only when a record of the journal's kinds changed
  if (changedRecords(flatten(before as unknown as State), flatten(after as unknown as State)).length) {
    after.logs = structuredClone(root.logs ?? {});
    logChanges(before as unknown as State, after as unknown as State, by);
    root.logs = after.logs;
  }
  return next;
}
