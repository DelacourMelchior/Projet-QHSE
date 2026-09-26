// Shared folder storage (OneDrive, SharePoint, Google Drive, Nextcloud… synced on the computer).
//   <donnees>/equipe/pilotage-<auteur>.json      readable by everyone
//   <donnees>/direction/pilotage-<auteur>.json   confidential values + settings (folder rights = real confidentiality)
// Each person writes only their own file, so the sync client never creates conflict copies.
// A file is { version: 2, author, updatedAt, entries: { key: { ts, v } } }; on load all files are merged, newest ts wins.
// Files "journal-*.json" written by the previous version are read once to migrate.
import type { State } from '../domain/types';
import { fromLegacyTool, legacyToolFromFlatMap } from '../domain/migrate';
import { bucketOf, diffKeys, flatten, unflatten, type FlatMap } from './flat';

type Entries = Record<string, { ts: string; v: unknown }>;
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
  hasDirection = false;
  contributors: string[] = [];
  constructor(public dir: FileSystemDirectoryHandle, public author: string) {}

  private get fileName() { return `pilotage-${authorSlug(this.author)}.json`; }

  // Returns the merged state, or null when the folder holds no data yet
  async load(): Promise<State | null> {
    const equipe = await sub(this.dir, 'equipe');
    if (!equipe) throw new Error("Ce dossier ne contient pas de sous-dossier « equipe » : choisissez le dossier « donnees ».");
    const direction = await sub(this.dir, 'direction');
    this.hasDirection = !!direction;
    const files = [
      ...(await readFiles(equipe, 'pilotage-')).map(f => ({ ...f, bucket: 'equipe' as Bucket })),
      ...(direction ? (await readFiles(direction, 'pilotage-')).map(f => ({ ...f, bucket: 'direction' as Bucket })) : []),
    ];
    if (!files.length) return this.loadLegacy(equipe, direction);
    const merged: Entries = {};
    this.own = { equipe: {}, direction: {} };
    files.forEach(f => {
      if (f.name === this.fileName) this.own[f.bucket] = f.entries;
      Object.entries(f.entries).forEach(([k, e]) => { if (!merged[k] || e.ts > merged[k].ts) merged[k] = e; });
    });
    this.contributors = [...new Set(files.map(f => f.author).filter((a): a is string => !!a))];
    const map: FlatMap = await readPhotos(this.dir);
    Object.entries(merged).forEach(([k, e]) => { if (e.v !== null) map[k] = e.v; });
    const state = unflatten(map);
    this.baseline = flatten(state);
    return state;
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

  // Stamps every key that changed since the last load/save into my own file(s)
  async save(state: State) {
    const cur = flatten(state);
    const ts = new Date().toISOString();
    const touched = new Set<Bucket>();
    for (const k of diffKeys(cur, this.baseline)) {
      if (k.startsWith('photo|')) { if (cur[k]) await writePhoto(this.dir, k.slice(6), cur[k] as string); continue; }
      const b = bucketOf(k, state);
      if (b === 'direction' && !this.hasDirection) continue;   // no rights: never write amounts into the team folder
      this.own[b][k] = { ts, v: cur[k] ?? null };
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
    this.baseline = cur;
    return touched.size > 0;
  }
}

// Photos: one .jpg file per picture in donnees/photos, named by its hash (written once, never changed)
async function readPhotos(dir: FileSystemDirectoryHandle): Promise<FlatMap> {
  const out: FlatMap = {};
  const d = await sub(dir, 'photos');
  if (!d) return out;
  for await (const [name, h] of (d as PermHandle).entries()) {
    if (h.kind !== 'file' || !name.endsWith('.jpg')) continue;
    try {
      const bytes = new Uint8Array(await (await (h as FileSystemFileHandle).getFile()).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out[`photo|${name.slice(0, -4)}`] = `data:image/jpeg;base64,${btoa(bin)}`;
    } catch { /* being synced: read next time */ }
  }
  return out;
}
async function writePhoto(dir: FileSystemDirectoryHandle, hash: string, dataUrl: string) {
  const d = await sub(dir, 'photos', true);
  if (!d) return;
  try { await d.getFileHandle(`${hash}.jpg`); return; } catch { /* not written yet */ }
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  const w = await (await d.getFileHandle(`${hash}.jpg`, { create: true })).createWritable();
  await w.write(bytes as unknown as string);
  await w.close();
}
