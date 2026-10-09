// Shared folder storage (OneDrive, SharePoint, Google Drive, Nextcloud… synced on the computer).
//   <donnees>/equipe/pilotage-<auteur>.json      readable by everyone
//   <donnees>/direction/pilotage-<auteur>.json   confidential values + settings (folder rights = real confidentiality)
// Each person writes only their own file, so the sync client never creates conflict copies.
// A file is { version: 2, author, updatedAt, entries: { key: { ts, v, base? } } }; on load all files are merged, newest ts wins,
// except equipment and spare parts: the versions of everyone since the last deletion are folded together (what each person did is kept).
// `base`: the newest `ts` the writing computer had read in the files of the others when it wrote the entry. A deletion (v: null) newer than the base of a version wins over that version:
// a computer that had not seen the deletion cannot bring the record back by a gesture (a version without base keeps the old rule: written after the deletion, it lives).
// Such a record is also written with `touched` (the typed fields this computer changed since it last read the folder) and `touchedAt` (for each typed field, the
// stamp of the last change made by this computer, kept from one reading to the next), so that the fold takes each typed field from the version that changed it
// last (a routine noted by a computer that has not read the new holder does not bring the old holder back, nor does it undo a later retyping).
// Orders (`delivery|<id>`) are folded too: the versions of everyone since the last deletion become one (mergeDelivery: the checks, the journal, the signatures of each are kept), so a stale
// copy written later never erases the PV signed on another computer.
// What this computer did since its last synchronisation (the pause before the write, the time before the folder asked for permission again) is put back over what is read (`overlaySince`):
// the browser keeps, per key, a fingerprint of what the folder held when it was last in step.
// Files "journal-*.json" written by the previous version are read once to migrate.
import type { Delivery, Params, State } from '../domain/types';
import { fromLegacyTool, isState, legacyToolFromFlatMap, normalize } from '../domain/migrate';
import { bucketOf, diffKeys, fingerprint, flatten, overlaySince, syncMark, unflatten, type FlatMap, type SyncMark } from './flat';
import { mergeEquipment, mergeSpare } from '../domain/maintenanceMerge';
import { mergeDelivery } from '../domain/receptionsMerge';
import { pvIssued } from '../domain/receptions';
import { LOCAL_KEY, pref } from './local';
import { LIFE_KEYS } from '../domain/maintenance';
import { SPARE_LIFE } from '../domain/maintenanceSpares';
import { refIds } from '../photo/ref';
import { photoBlob } from '../photo/store';

type Entries = Record<string, { ts: string; v: unknown; base?: string }>;
const FOLDED = /^(equipment|spare|delivery)\|/;   // records that two people write together: folded on load, never replaced
const TYPED = /^(equipment|spare)\|/;   // of these, the ones whose typed fields are told apart from the life of the record (`touched`)
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const withoutTouched = (r: unknown) => { if (!isRecord(r)) return r; const { touched: _t, touchedAt: _a, ...rest } = r; return rest; };   // `touched` and `touchedAt` live in the folder only
// The typed fields (not the life of the record) of one version that differ from another
const typedChanges = (key: string, a: unknown, b: unknown): string[] => {
  const life: readonly string[] = key.startsWith('spare|') ? SPARE_LIFE : LIFE_KEYS, x = isRecord(a) ? a : {}, y = isRecord(b) ? b : {};
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(f => !life.includes(f) && f !== 'gone' && f !== 'touched' && f !== 'touchedAt' && JSON.stringify(x[f] ?? null) !== JSON.stringify(y[f] ?? null));
};
type Bucket = 'equipe' | 'direction';

export const folderSupported = () => typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

export const authorSlug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anonyme';

// ---- remember the folder handle between sessions (IndexedDB)
function idb<T>(mode: 'get' | 'put' | 'delete', value?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('delacour-pilotage', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const store = req.result.transaction('kv', mode === 'get' ? 'readonly' : 'readwrite').objectStore('kv');
      const r = mode === 'get' ? store.get('dir') : mode === 'put' ? store.put(value, 'dir') : store.delete('dir');
      r.onsuccess = () => resolve(r.result as T);
      r.onerror = () => reject(r.error);
    };
  });
}
export const rememberedFolder = () => idb<FileSystemDirectoryHandle | undefined>('get');
export const rememberFolder = (d: FileSystemDirectoryHandle) => idb('put', d);
export const forgetFolder = () => idb('delete');

type PermHandle = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: string }): Promise<string>;
  requestPermission(o: { mode: string }): Promise<string>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};
export const hasPermission = async (d: FileSystemDirectoryHandle) => (await (d as PermHandle).queryPermission({ mode: 'readwrite' })) === 'granted';
export const askPermission = async (d: FileSystemDirectoryHandle) => (await (d as PermHandle).requestPermission({ mode: 'readwrite' })) === 'granted';
export const pickFolder = () => (window as unknown as { showDirectoryPicker(o: object): Promise<FileSystemDirectoryHandle> })
  .showDirectoryPicker({ id: 'delacour-donnees', mode: 'readwrite' });

async function sub(dir: FileSystemDirectoryHandle, name: Bucket | 'photos', create = false) {
  try { return await dir.getDirectoryHandle(name, { create }); } catch { return null; }
}

async function readFiles(dir: FileSystemDirectoryHandle, prefix: string) {
  const out: { name: string; author?: string; entries: Entries }[] = [];
  for await (const [name, h] of (dir as PermHandle).entries()) {
    if (h.kind !== 'file' || !name.startsWith(prefix) || !name.endsWith('.json')) continue;
    try {
      const j = JSON.parse(await (await (h as FileSystemFileHandle).getFile()).text());
      if (j && j.entries) out.push({ name, author: j.author, entries: j.entries });
    } catch { /* unreadable file (sync in progress): skipped, read again next time */ }
  }
  return out;
}

export const isDataFolder = async (dir: FileSystemDirectoryHandle) => !!(await sub(dir, 'equipe'));
export async function initDataFolder(dir: FileSystemDirectoryHandle) {
  await sub(dir, 'equipe', true);
  await sub(dir, 'direction', true);
}

// One connected session on the shared folder
export class FolderSession {
  own: Record<Bucket, Entries> = { equipe: {}, direction: {} };
  baseline: FlatMap = {};
  typed: Record<string, Set<string>> = {};   // per equipment or part: the typed fields changed here since the folder was read
  stamps: Record<string, Record<string, string>> = {};   // per equipment or part: when this computer last changed each typed field (read back from its own file)
  seen: string | null = null;   // the newest `ts` this computer read in the files of the others at the last load ('' if none): written as `base`; null before the first load: no base
  hasDirection = false;
  contributors: string[] = [];
  mark: SyncMark | null = null;   // what the folder held per key when this computer was last in step with it (kept in the browser); null: not known
  constructor(public dir: FileSystemDirectoryHandle, public author: string) {
    try { const j = JSON.parse(pref.get('sync') || 'null'); if (j && j.dir === dir.name && isRecord(j.marks)) this.mark = j.marks as SyncMark; } catch { /* no mark: what was done here is read from the screen only */ }
  }
  // A mark that does not fit the room of the browser is dropped (never a stale one: it would tell the folder's version from the work done here)
  private keepMark(m: SyncMark) { this.mark = m; if (!pref.set('sync', JSON.stringify({ dir: this.dir.name, marks: m }))) pref.set('sync', ''); }

  private get fileName() { return `pilotage-${authorSlug(this.author)}.json`; }

  // Returns the merged state, or null when the folder holds no data yet. `local`: the state of this computer (what the screen holds; the browser's copy when not given): what was done
  // here since the last synchronisation is put back over what the folder holds.
  async load(local?: State | null): Promise<State | null> {
    const equipe = await sub(this.dir, 'equipe');
    if (!equipe) throw new Error("Ce dossier ne contient pas de sous-dossier « equipe » : choisissez le dossier « donnees ».");
    const direction = await sub(this.dir, 'direction');
    this.hasDirection = !!direction;
    const files = [
      ...(await readFiles(equipe, 'pilotage-')).map(f => ({ ...f, bucket: 'equipe' as Bucket })),
      ...(direction ? (await readFiles(direction, 'pilotage-')).map(f => ({ ...f, bucket: 'direction' as Bucket })) : []),
    ];
    if (!files.length) { this.seen = ''; this.stamps = {}; this.keepMark({}); return this.loadLegacy(equipe, direction); }
    const merged: Entries = {};
    const versions: Record<string, Entries[string][]> = {};
    const counters: Entries[string][] = [];   // the versions of the settings: the counter of the PV numbers is the highest of them
    this.own = { equipe: {}, direction: {} };
    this.typed = {};
    this.stamps = {};
    this.seen = '';
    files.forEach(f => {
      if (f.name === this.fileName) this.own[f.bucket] = f.entries;
      Object.entries(f.entries).forEach(([k, e]) => {
        if (f.name !== this.fileName && e.ts > this.seen!) this.seen = e.ts;   // what this computer wrote itself says nothing about what it has seen of the others
        if (!merged[k] || e.ts > merged[k].ts) merged[k] = e;
        if (FOLDED.test(k)) (versions[k] ||= []).push(e);
        if (k === 'params') counters.push(e);
      });
    });
    this.contributors = [...new Set(files.map(f => f.author).filter((a): a is string => !!a))];
    for (const own of Object.values(this.own)) for (const [k, e] of Object.entries(own)) if (TYPED.test(k) && isRecord(e.v) && isRecord(e.v.touchedAt)) this.stamps[k] = { ...e.v.touchedAt } as Record<string, string>;
    const map: FlatMap = await readPhotos(this.dir);
    Object.entries(merged).forEach(([k, e]) => { if (e.v !== null) map[k] = e.v; });
    // the live versions after the last deletion (only records: a list or a text is not a version) and written by a computer that had seen it (`base` not before it),
    // oldest first, folded into one (a record that does not fold falls back to the newest); the fold reads `touched` and `touchedAt` of each version, the state does not keep them
    for (const [k, vs] of Object.entries(versions)) {
      const tomb = vs.filter(e => e.v === null).map(e => e.ts).sort().pop();
      const live = vs.filter(e => isRecord(e.v) && (!tomb || (e.ts > tomb && (e.base === undefined || e.base >= tomb)))).sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0)).map(e => e.v);
      if (!live.length) { delete map[k]; continue; }
      const fold = (k.startsWith('spare|') ? mergeSpare : k.startsWith('delivery|') ? (a: unknown, b: unknown) => mergeDelivery(a as Delivery, b as Delivery, 'b') : mergeEquipment) as (a: unknown, b: unknown) => unknown;
      let rec = live[live.length - 1];
      try { rec = live.reduce((a, b) => fold(a, b)); } catch { /* keeps the newest */ }
      map[k] = withoutTouched(rec);
    }
    // the counter of the PV numbers never goes down: the settings of the newest author hold the highest number any author wrote
    const nums = counters.filter(e => isRecord(e.v)).map(e => pvIssued({ deliveries: {}, params: e.v as unknown as Params })), params = map.params as Params | undefined;
    if (params && nums.length > 1) {
      const top: Record<string, number> = {};
      nums.forEach(c => Object.entries(c).forEach(([y, n]) => { top[y] = Math.max(top[y] ?? 0, n); }));
      if (Object.entries(top).some(([y, n]) => (pvIssued({ deliveries: {}, params })[y] ?? 0) < n)) map.params = { ...params, reception: { ...params.reception, pvCounter: top } };
    }
    const state = unflatten(map);
    this.baseline = flatten(state);
    const before = this.mark;
    let mark: SyncMark;
    try { mark = syncMark(flatten(normalize(state))); } catch { mark = syncMark(this.baseline); }   // as the state here is: read the same way
    this.keepMark(mark);
    const mine = local === undefined ? localState() : local;
    return before && mine ? overlaySince(state, before, mine) : state;
  }

  // Previous version's journals: merged once, converted, then published in the new format by the caller
  private async loadLegacy(equipe: FileSystemDirectoryHandle, direction: FileSystemDirectoryHandle | null): Promise<State | null> {
    const files = [...await readFiles(equipe, 'journal-'), ...(direction ? await readFiles(direction, 'journal-') : [])];
    if (!files.length) return null;
    const merged: Entries = {};
    files.forEach(f => Object.entries(f.entries).forEach(([k, e]) => { if (!merged[k] || e.ts > merged[k].ts) merged[k] = e; }));
    const map: Record<string, unknown> = {};
    Object.entries(merged).forEach(([k, e]) => { if (e.v !== null) map[k] = e.v; });
    this.contributors = [...new Set(files.map(f => f.author).filter((a): a is string => !!a))];
    this.baseline = {};   // everything will be published
    return fromLegacyTool(legacyToolFromFlatMap(map));
  }

  // The original of a photo, written once as photos/<id>.<ext> (the name never changes: nothing to conflict on)
  private async pushPhoto(id: string) {
    const d = await sub(this.dir, 'photos', true);
    if (!d) return;
    for (const ext of ['jpg', 'png', 'svg']) { try { await d.getFileHandle(`${id}.${ext}`); return; } catch { /* not there */ } }
    const blob = await photoBlob(id, 'o');
    if (!blob) return;   // not on this computer: whoever has it writes it
    const ext = blob.type === 'image/svg+xml' ? 'svg' : blob.type === 'image/png' ? 'png' : 'jpg';
    const w = await (await d.getFileHandle(`${id}.${ext}`, { create: true })).createWritable();
    await w.write(new Uint8Array(await blob.arrayBuffer()) as unknown as string);
    await w.close();
  }
  // The original of a photo held by the folder, for the photo store (null when it is not there yet: the sync is still running)
  async readPhotoFile(id: string): Promise<Blob | null> {
    const d = await sub(this.dir, 'photos');
    if (!d) return null;
    for (const ext of ['jpg', 'png', 'svg']) {
      try { const f = await (await d.getFileHandle(`${id}.${ext}`)).getFile(); return new Blob([await f.arrayBuffer()], { type: PHOTO_MIME[ext] }); } catch { /* try the next */ }
    }
    return null;
  }

  // Stamps every key that changed since the last load/save into my own file(s)
  async save(state: State) {
    const cur = flatten(state);
    const ts = new Date().toISOString();
    const touched = new Set<Bucket>(), marks: SyncMark = { ...(this.mark ?? {}) };
    for (const k of diffKeys(cur, this.baseline)) {
      if (k.startsWith('photo|')) { if (cur[k]) await writePhoto(this.dir, k.slice(6), cur[k] as string); continue; }
      const b = bucketOf(k, state);
      if (b === 'direction' && !this.hasDirection) continue;   // no rights: never write amounts into the team folder
      let v = cur[k] ?? null;
      if (v && TYPED.test(k)) {   // what was typed here since the folder was read stays "touched" until the next reading; its stamp stays as long as it is not typed again
        const t = (this.typed[k] ||= new Set<string>()), at = (this.stamps[k] ||= {});
        typedChanges(k, cur[k], this.baseline[k]).forEach(f => { t.add(f); at[f] = ts; });
        v = { ...(v as object), touched: [...t], touchedAt: { ...at } };
      }
      this.own[b][k] = this.seen === null ? { ts, v } : { ts, v, base: this.seen };
      if (cur[k] === undefined) delete marks[k]; else marks[k] = fingerprint(cur[k]);   // kept when the files are written
      touched.add(b);
    }
    for (const b of touched) {
      const d = await sub(this.dir, b);
      if (!d) continue;
      const fh = await d.getFileHandle(this.fileName, { create: true });
      const w = await fh.createWritable();
      await w.write(JSON.stringify({ version: 2, author: this.author, updatedAt: ts, entries: this.own[b] }));
      await w.close();
    }
    const before = refIds(this.baseline);
    for (const id of refIds(cur)) if (!before.has(id)) await this.pushPhoto(id);   // the originals of the pictures new to this folder
    this.baseline = cur;
    this.keepMark(marks);
    return touched.size > 0;
  }
}

// The state of this computer as the browser holds it (when the caller gives none), read the way the application reads it; null when there is none or it cannot be read
function localState(): State | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY), j: unknown = raw ? JSON.parse(raw) : null;
    return isState(j) ? normalize(j) : null;
  } catch { return null; }
}

// Photos: one file per picture in donnees/photos, named by its hash (written once, never changed); .jpg for the photos, .svg and .png for the others
const PHOTO_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const photoExt = (dataUrl: string) => (dataUrl.startsWith('data:image/svg+xml') ? 'svg' : dataUrl.startsWith('data:image/png') ? 'png' : 'jpg');
async function readPhotos(dir: FileSystemDirectoryHandle): Promise<FlatMap> {
  const out: FlatMap = {};
  const d = await sub(dir, 'photos');
  if (!d) return out;
  for await (const [name, h] of (d as PermHandle).entries()) {
    const m = name.match(/^(.+)\.(jpg|png|svg)$/);
    if (h.kind !== 'file' || !m || m[1].length >= 16) continue;   // files of 16 signs or more are the originals of the photo references: read when a page asks for them
    try {
      const bytes = new Uint8Array(await (await (h as FileSystemFileHandle).getFile()).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out[`photo|${m[1]}`] = `data:${PHOTO_MIME[m[2]]};base64,${btoa(bin)}`;
    } catch { /* being synced: read next time */ }
  }
  return out;
}
async function writePhoto(dir: FileSystemDirectoryHandle, hash: string, dataUrl: string) {
  const d = await sub(dir, 'photos', true);
  if (!d) return;
  const file = `${hash}.${photoExt(dataUrl)}`;
  try { await d.getFileHandle(file); return; } catch { /* not written yet */ }
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const w = await (await d.getFileHandle(file, { create: true })).createWritable();
  await w.write(bytes as unknown as string);
  await w.close();
}
