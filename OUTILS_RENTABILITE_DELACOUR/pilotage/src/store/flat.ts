// State <-> flat map of independent keys, the unit of synchronisation between people.
//   settings | timeline | process|<id> | kpi|<id> | value|<kpiId>|<YYYY-MM> | action|<id>
//   risk|<id> (without money) | riskcost|<id> (money figures of a risk, direction folder) | contact|<id> | scale
//   tools 2.1 to 5.4: one key per record (<kind>|<id>, see COLLECTIONS), quotecost|<id> (direction folder),
//   contactsecret|<id> (what to say when calling, direction folder), and the single records params, envelope, ged
import type { Delivery, Equipment, Params, Power, Quote, QuoteCost, Risk, RiskCost, Spare, State } from '../domain/types';
import { DEFAULT_SCALE } from '../domain/risk';
import { DEFAULT_SETTINGS } from '../domain/migrate';
import { emptyTools } from '../domain/base';
import { LIFE_KEYS } from '../domain/maintenance';
import { SPARE_LIFE } from '../domain/maintenanceSpares';
import { mergeEquipment, mergeSpare } from '../domain/maintenanceMerge';
import { canon, mergeDelivery, pvDuplicates } from '../domain/receptionsMerge';
import { carryPvCounter, keepPvCounter } from '../domain/receptions';
import { sha256 } from '../domain/sha256';

export type FlatMap = Record<string, unknown>;

type CollectionKey = 'contacts' | 'complaints' | 'feedbacks' | 'suppliers' | 'debits' | 'sectors' | 'sops' | 'equipments' | 'spares' | 'deliveries'
  | 'people' | 'skills' | 'newcomers' | 'chronos' | 'ncs' | 'analyses' | 'pokas' | 'logs' | 'orgs' | 'practices' | 'covers' | 'vaults' | 'vlogs';
// key prefix -> collection of the state (records stored whole, readable by the team)
export const COLLECTIONS: Record<string, CollectionKey> = {
  contact: 'contacts', complaint: 'complaints', feedback: 'feedbacks', supplier: 'suppliers', debit: 'debits', sector: 'sectors',
  sop: 'sops', equipment: 'equipments', spare: 'spares', delivery: 'deliveries', person: 'people', skill: 'skills',
  newcomer: 'newcomers', chrono: 'chronos', nc: 'ncs', analysis: 'analyses', poka: 'pokas', log: 'logs', org: 'orgs',
  practice: 'practices', cover: 'covers', vault: 'vaults', vlog: 'vlogs',   // 4.1: one key per line of proof, so two people never overwrite each other (vaults and their lines: direction folder)
};
const SINGLES = ['params', 'envelope', 'ged'] as const;

export function flatten(s: State): FlatMap {
  const m: FlatMap = { settings: s.settings, timeline: s.timeline };
  s.processes.forEach(p => { m[`process|${p.id}`] = p; });
  Object.values(s.kpis).forEach(k => { m[`kpi|${k.id}`] = k; });
  Object.entries(s.values).forEach(([id, byP]) => Object.entries(byP).forEach(([p, v]) => { m[`value|${id}|${p}`] = v; }));
  Object.values(s.actions).forEach(a => { m[`action|${a.id}`] = a; });
  Object.values(s.risks || {}).forEach(({ cost, ...r }) => {
    m[`risk|${r.id}`] = r;
    if (cost) m[`riskcost|${r.id}`] = cost;
  });
  Object.values(s.quotes || {}).forEach(({ cost, ...q }) => {
    m[`quote|${q.id}`] = q;
    if (cost) m[`quotecost|${q.id}`] = cost;
  });
  // where the codes of a vital power are: direction folder
  Object.values(s.powers || {}).forEach(({ access, ...p }) => {
    m[`power|${p.id}`] = p;
    if (access) m[`poweraccess|${p.id}`] = access;
  });
  // what to say when calling a contact (password, instruction): direction folder
  Object.values(s.contacts || {}).forEach(({ secret, id }) => { if (secret) m[`contactsecret|${id}`] = secret; });
  for (const [kind, key] of Object.entries(COLLECTIONS)) {
    Object.values((s[key] || {}) as Record<string, { id: string; secret?: string }>).forEach(x => {
      const rec = kind === 'contact' ? (({ secret: _, ...c }) => c)(x) : x;
      m[`${kind}|${x.id}`] = extractPhotos(rec, m);
    });
  }
  // the pictures of the settings (the workshop plan of tool 3.2) are stored apart too
  SINGLES.forEach(k => { if (s[k]) m[k] = k === 'params' ? extractPhotos(s[k], m) : s[k]; });
  if (s.scale) m.scale = s.scale;
  return m;
}

const UNSAFE = ['__proto__', 'constructor', 'prototype'];
export function unflatten(m: FlatMap): State {
  const tools = emptyTools();
  const s: State = {
    settings: { ...DEFAULT_SETTINGS, ...(m.settings as object || {}) },
    timeline: (m.timeline as State['timeline']) || { start: '2026-01', end: '2026-12' },
    processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {},
    scale: (m.scale as State['scale']) || DEFAULT_SCALE,
    ...tools,
    params: { ...tools.params, ...restorePhotos(m.params as object || {}, m) },
    envelope: (m.envelope as State['envelope']) || tools.envelope,
    ged: (m.ged as State['ged']) || tools.ged,
  };
  const riskCosts: Record<string, RiskCost> = {};
  const quoteCosts: Record<string, QuoteCost> = {};
  const accesses: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    const [kind, id, period] = k.split('|');
    if (UNSAFE.includes(id)) continue;   // a record named like a property of Object would change the prototype of its collection
    if (kind === 'process') s.processes.push(v as State['processes'][number]);
    else if (kind === 'kpi') s.kpis[id] = v as State['kpis'][string];
    else if (kind === 'value' && typeof v === 'number') (s.values[id] ||= {})[period] = v;
    else if (kind === 'action') s.actions[id] = v as State['actions'][string];
    else if (kind === 'risk') s.risks[id] = { ...(v as Risk) };
    else if (kind === 'riskcost') riskCosts[id] = v as RiskCost;
    else if (kind === 'quote') s.quotes[id] = { ...(v as Quote) };
    else if (kind === 'quotecost') quoteCosts[id] = v as QuoteCost;
    else if (kind === 'power') s.powers[id] = { ...(v as Power), access: (v as Power).access || '' };
    else if (kind === 'poweraccess') accesses[id] = v as string;
    else if (kind === 'contactsecret') secrets[id] = v as string;
    else if (Object.hasOwn(COLLECTIONS, kind)) (s[COLLECTIONS[kind]] as Record<string, unknown>)[id] = restorePhotos(v, m);
  }
  Object.entries(riskCosts).forEach(([id, c]) => { if (s.risks[id]) s.risks[id].cost = c; });
  Object.entries(quoteCosts).forEach(([id, c]) => { if (s.quotes[id]) s.quotes[id].cost = c; });
  Object.entries(accesses).forEach(([id, a]) => { if (s.powers[id]) s.powers[id].access = a; });
  Object.entries(secrets).forEach(([id, a]) => { if (s.contacts[id]) s.contacts[id] = { ...s.contacts[id], secret: a }; });
  s.processes.sort((a, b) => a.order - b.order);
  s.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => s.kpis[id]); });
  return s;
}

// Confidential values and the financial settings live in the "direction" folder
export function bucketOf(key: string, s: State): 'equipe' | 'direction' {
  if (key === 'settings' || key.startsWith('riskcost|') || key.startsWith('quotecost|') || key.startsWith('poweraccess|') || key.startsWith('contactsecret|') || key.startsWith('vault|') || key.startsWith('vlog|') || key === 'envelope') return 'direction';
  if (key.startsWith('value|')) return s.kpis[key.split('|')[1]]?.confidential ? 'direction' : 'equipe';
  return 'equipe';
}

// Keys whose content differs (added, changed or removed)
export function diffKeys(a: FlatMap, b: FlatMap): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}

// Photos (data URLs) are stored once under photo|<hash> and referenced as "photo:<hash>" in the records,
// so that editing a text does not rewrite the pictures (in the shared folder they are separate .jpg files)
// SHA-256 of the whole text, 15 signs (a file name of 16 signs or more is the original of a photo reference, folder.ts): two pictures never share a key (S-19); the keys of the older hash are still read (a reference holds its key)
export const hash = (text: string) => sha256(text).slice(0, 15);
function extractPhotos<T>(x: T, m: FlatMap): T {
  if (typeof x === 'string') { if (!x.startsWith('data:image/')) return x; const k = hash(x); m[`photo|${k}`] = x; return `photo:${k}` as T; }
  if (Array.isArray(x)) return x.map(y => extractPhotos(y, m)) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, extractPhotos(v, m)])) as T;
  return x;
}
// Only a picture held as text (an old reference "photo:<hash>") is put back; the references of the photo store ("photo:<id>-<w>-<h>") have no entry here and stay as they are
function restorePhotos<T>(x: T, m: FlatMap): T {
  if (typeof x === 'string') { if (!x.startsWith('photo:')) return x; const k = `photo|${x.slice(6)}`; return (k in m ? m[k] : x) as T; }
  if (Array.isArray(x)) return x.map(y => restorePhotos(y, m)) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, restorePhotos(v, m)])) as T;
  return x;
}

// Records created, changed or deleted between two states (the journal, not the figures of the month)
const LOGGED = /^(action|risk|contact|org|quote|complaint|feedback|supplier|debit|sop|equipment|spare|delivery|power|practice|cover|vault|person|skill|newcomer|chrono|nc|analysis|poka|kpi|process)\|/;
export function changedRecords(a: FlatMap, b: FlatMap): { key: string; what: 'création' | 'modification' | 'suppression' }[] {
  return diffKeys(a, b).filter(k => LOGGED.test(k)).map(k => ({ key: k, what: a[k] === undefined ? 'création' as const : b[k] === undefined ? 'suppression' as const : 'modification' as const }));
}

// ---- records of equipment, spare parts and orders are never replaced by another copy: what each person did (routines, reports, breakdowns, stock moves, checks, signatures) is kept
// How two versions of one record of these kinds become one (`b` is the later one), null for any other record
type Fold = (a: unknown, b: unknown) => unknown;
const foldOf = (k: string): Fold | null => (k.startsWith('equipment|') ? mergeEquipment as Fold : k.startsWith('spare|') ? mergeSpare as Fold : k.startsWith('delivery|') ? ((a, b) => mergeDelivery(a as Delivery, b as Delivery, 'b')) : null);
// "Records of another file": what to take from the flat map of a backup (`theirs`) into the flat map of this computer (`mine`).
// New records are added; equipment, spare parts and orders present on both sides are merged (this computer's copy counts as the newer one);
// any other record that exists on both sides and differs stays as it is here, because nothing says which one is the latest (counted in `kept`).
// `dupes`: the PV numbers that two orders carry once the file is taken, one of them coming from the file (said as a fact by the screen).
export function mergeFile(mine: FlatMap, theirs: FlatMap) {
  const put: FlatMap = {};
  let added = 0, merged = 0, kept = 0;
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null) || canon(a ?? null) === canon(b ?? null);
  for (const [k, t] of Object.entries(theirs)) {
    const m = mine[k], counted = !/^(photo|log)\|/.test(k);
    if (k === 'settings' || k === 'timeline' || k === 'params' || same(m, t)) continue;
    if (m === undefined) { put[k] = t; if (counted) added++; continue; }
    const both = foldOf(k);
    if (!both) { kept++; continue; }
    let x: unknown;
    try { x = both(t, m); } catch { kept++; continue; }   // a record that cannot be read is left as it is here
    if (!same(x, m)) { put[k] = x; merged++; }
  }
  const sent = Object.keys(put).some(k => k.startsWith('delivery|'));
  const dupes = sent ? pvDuplicates(Object.entries({ ...mine, ...put }).filter(([k]) => k.startsWith('delivery|')).map(([, v]) => v as Delivery))
    .filter(x => x.carriers.some(c => put[`delivery|${c.d.id}`] !== undefined)).map(x => x.no) : [];
  return { put, added, merged, kept, dupes };
}

// The same, applied to `d`: the CURRENT state, from inside `update`. The merge is computed on what is there when it is applied, never on what the screen drew
// before a question was asked (a danger or an action written elsewhere meanwhile stays); the settings, timeline and params of `d` are left as they are,
// except the counter of the PV numbers (the highest of both: it never goes down)
export function applyFile(d: State, theirs: FlatMap) {
  const mine = flatten(d), r = mergeFile(mine, theirs);
  Object.assign(d, unflatten({ ...mine, ...r.put }), { settings: d.settings, timeline: d.timeline, params: d.params });
  d.params = carryPvCounter({ deliveries: {}, params: (theirs.params ?? {}) as Params } as State, d).params;
  return r;
}

// What changed on this computer (`keys`, from `fb` to `fn`) is put back over what was read from the shared folder (`fl`). A record deleted here stays deleted; an order is merged (nothing a person
// did on either side is lost); equipment and spare parts are merged (this computer's copy is the newer one, but what only the others typed meanwhile stays); any other record: this computer's value.
function replay(fl: FlatMap, keys: string[], fb: FlatMap, fn: FlatMap) {
  const rebase = <T extends object>(theirs: T, base: T | undefined, mine: T, life: readonly string[]): T => {
    const t = theirs as Record<string, unknown>, b = (base || {}) as Record<string, unknown>, mi = mine as Record<string, unknown>;
    return { ...mi, ...Object.fromEntries(Object.keys(t).filter(f => !life.includes(f) && JSON.stringify(b[f]) === JSON.stringify(mi[f])).map(f => [f, t[f]])) } as T;
  };
  for (const k of keys) {
    const mine = fn[k], theirs = fl[k];
    if (mine === undefined) delete fl[k];
    else if (theirs && k.startsWith('equipment|')) fl[k] = mergeEquipment(theirs as Equipment, rebase(theirs as Equipment, fb[k] as Equipment | undefined, mine as Equipment, LIFE_KEYS));
    else if (theirs && k.startsWith('spare|')) fl[k] = mergeSpare(theirs as Spare, rebase(theirs as Spare, fb[k] as Spare | undefined, mine as Spare, SPARE_LIFE));
    else if (theirs && k.startsWith('delivery|')) { try { fl[k] = mergeDelivery(theirs as Delivery, mine as Delivery, 'b'); } catch { fl[k] = mine; } }
    else fl[k] = mine;
  }
}

// What changed on this computer (`before` -> `now`) while the shared folder was being read is put back over `loaded`: a tap made during the wait is never wiped.
export function overlayChanges(loaded: State, before: State, now: State): State {
  const fl = flatten(loaded), fb = flatten(before), fn = flatten(now);
  replay(fl, diffKeys(fb, fn), fb, fn);
  return unflatten(fl);
}

// ---- what was done on this computer since the last synchronisation with the shared folder (S-3): before the folder is asked for permission again, or the page closed within the pause
// before the write, the work lives in the browser only; the next reading must not take the folder's version over it. The browser keeps, per key, a short fingerprint of what the folder
// held at the last synchronisation (not the data: the room of the browser is short); a key whose fingerprint is no longer the one of the state here was changed here.
export type SyncMark = Record<string, string>;
const cyrb53 = (s: string): string => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};
export const fingerprint = (v: unknown): string => { const t = JSON.stringify(v ?? null); return cyrb53(t) + t.length.toString(36); };
// The pictures held as text are stored apart, by their hash: they have no mark
export const syncMark = (m: FlatMap): SyncMark => Object.fromEntries(Object.entries(m).filter(([k]) => !k.startsWith('photo|')).map(([k, v]) => [k, fingerprint(v)]));
// `loaded` (read from the folder) with what changed here since `mark` put back over it: `now` is the state of this computer (what is in the browser)
export function overlaySince(loaded: State, mark: SyncMark, now: State): State {
  const fl = flatten(loaded), fn = flatten(now);
  const keys = [...new Set([...Object.keys(mark), ...Object.keys(fn)])].filter(k => !k.startsWith('photo|') && (fn[k] === undefined ? Object.hasOwn(mark, k) : mark[k] !== fingerprint(fn[k])));
  replay(fl, keys, {}, fn);
  return unflatten(fl);
}

// Journal: one line per record created, changed or deleted, the 400 most recent kept; the same person touching the same record
// the same way within 10 minutes (the answers of a routine, the taps of a count) keeps one line whose time is the latest
const MAX_LOG = 400, GROUP_MS = 10 * 60000;
export function logChanges(prev: State, next: State, by: string, now = new Date()) {
  keepPvCounter(next);   // the counter of the PV numbers follows the numbers given (the settings are replaced, never changed in place)
  const changes = changedRecords(flatten(prev), flatten(next));
  if (!changes.length) return;
  const at = now.toISOString();
  next.logs ||= {};
  changes.forEach((c, i) => {
    const [kind, ref] = c.key.split('|');
    const line = Object.values(next.logs).find(x => x.by === by && x.kind === kind && x.ref === ref && x.what === c.what && now.getTime() - Date.parse(x.at) < GROUP_MS);
    if (line) { line.at = at; return; }
    const id = `log_${now.getTime().toString(36)}${i}${Math.random().toString(36).slice(2, 5)}`;
    next.logs[id] = { id, at, by, kind, ref, what: c.what };
  });
  const all = Object.values(next.logs).sort((x, y) => (x.at < y.at ? 1 : -1));
  all.slice(MAX_LOG).forEach(x => { delete next.logs[x.id]; });
}
