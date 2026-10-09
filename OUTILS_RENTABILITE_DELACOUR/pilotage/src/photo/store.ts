// The photo store: every original picture kept once, never changed, under its fingerprint, with two smaller copies (480 and 1 600 px) made when first needed.
// This computer: IndexedDB (hundreds of MB, not the 5 MB of localStorage). A source can be plugged in for pictures held elsewhere (the shared folder now,
// the server later): a missing picture is fetched from there, then kept here. The records only hold references (see ref.ts).
import { makeRef, parseRef, withEdit, type PhotoEdit } from './ref';
import { splitPhoto } from '../ui/photo';

export type Variant = 'o' | 'v' | 't';   // original, view (sheets, station), thumbnail (lists, cards)
const SIZES: Record<Variant, number> = { o: 4096, v: 1600, t: 480 };

// ---- IndexedDB, with a memory fallback (private window): the pictures then live until the page closes
let dbp: Promise<IDBDatabase | null> | undefined;
const db = () => (dbp ||= new Promise(res => {
  try {
    const r = indexedDB.open('delacour-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('blobs');
    r.onsuccess = () => res(r.result);
    r.onerror = () => res(null);
  } catch { res(null); }
}));
const mem = new Map<string, Blob>();
export let persistent = true;   // false when pictures are only in memory
async function get(key: string): Promise<Blob | undefined> {
  const d = await db();
  if (!d) { persistent = false; return mem.get(key); }
  return new Promise(res => { const r = d.transaction('blobs').objectStore('blobs').get(key); r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => res(mem.get(key)); });
}
async function put(key: string, blob: Blob): Promise<void> {
  const d = await db();
  if (!d) { persistent = false; mem.set(key, blob); return; }
  return new Promise(res => {
    const t = d.transaction('blobs', 'readwrite');
    t.objectStore('blobs').put(blob, key);
    t.oncomplete = () => res();
    t.onerror = () => { mem.set(key, blob); persistent = false; res(); };   // quota or other failure: kept in memory, and the caller can tell
    t.onabort = t.onerror;
  });
}

let remote: ((id: string) => Promise<Blob | null>) | null = null;
export const setRemote = (f: typeof remote) => { remote = f; };

// ---- identity and size of a picture
export async function fingerprint(bytes: ArrayBuffer): Promise<string> {
  try {
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...d.slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {   // no crypto (insecure page): a simple hash over the bytes
    let h = 0x811c9dc5; const u = new Uint8Array(bytes);
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0') + u.length.toString(16).padStart(8, '0');
  }
}
// Size read in the bytes themselves (JPEG, PNG, SVG), so that no image has to be decoded
export function imageDims(u: Uint8Array, mime: string): { w: number; h: number } | null {
  if (mime === 'image/png' && u.length > 24) return { w: (u[16] << 24 | u[17] << 16 | u[18] << 8 | u[19]) >>> 0, h: (u[20] << 24 | u[21] << 16 | u[22] << 8 | u[23]) >>> 0 };
  if (mime === 'image/jpeg') {
    for (let i = 2; i + 9 < u.length;) {
      if (u[i] !== 0xff) { i++; continue; }
      const m = u[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: u[i + 5] << 8 | u[i + 6], w: u[i + 7] << 8 | u[i + 8] };
      i += 2 + (u[i + 2] << 8 | u[i + 3]);
    }
    return null;
  }
  if (mime === 'image/svg+xml') {
    const t = new TextDecoder().decode(u.subarray(0, 4000));
    const a = /<svg[^>]*\bwidth="(\d+(?:\.\d+)?)"[^>]*\bheight="(\d+(?:\.\d+)?)"/.exec(t) || /<svg[^>]*\bheight="(\d+(?:\.\d+)?)"[^>]*\bwidth="(\d+(?:\.\d+)?)"/.exec(t);
    if (a) return /\bwidth="[^"]+"[^>]*\bheight/.test(a[0]) ? { w: Number(a[1]), h: Number(a[2]) } : { w: Number(a[2]), h: Number(a[1]) };
    const v = /viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/.exec(t);
    if (v) return { w: Number(v[1]), h: Number(v[2]) };
  }
  return null;
}

// ---- put and get
export async function putPhoto(blob: Blob, w: number, h: number): Promise<string> {
  const id = await fingerprint(await blob.arrayBuffer());
  if (!(await get(`${id}:o`))) await put(`${id}:o`, blob);
  return makeRef(id, w, h);
}
async function original(id: string): Promise<Blob | null> {
  let b = await get(`${id}:o`);
  if (!b && remote) { try { b = (await remote(id)) || undefined; } catch { b = undefined; } if (b) await put(`${id}:o`, b); }
  return b || null;
}
export const hasPhoto = async (id: string) => !!(await get(`${id}:o`));
export async function photoBlob(id: string, v: Variant = 'v'): Promise<Blob | null> {
  if (v !== 'o') { const c = await get(`${id}:${v}`); if (c) return c; }
  const o = await original(id);
  if (!o || v === 'o' || o.type === 'image/svg+xml') return o;
  const small = await shrink(o, SIZES[v]);
  if (small) { await put(`${id}:${v}`, small); return small; }
  return o;
}
const urls = new Map<string, string>();
const pending = new Set<Promise<unknown>>();
// An address a page can show (object URL, one per picture and size). '' when the picture is not on this computer nor at its source.
export function photoUrl(id: string, v: Variant = 'v'): Promise<string> {
  const k = `${id}:${v}`, hit = urls.get(k);
  if (hit) return Promise.resolve(hit);
  const p = photoBlob(id, v).then(b => { const u = b ? URL.createObjectURL(b) : ''; if (u) urls.set(k, u); return u; }).finally(() => pending.delete(p));
  pending.add(p);
  return p;
}
export const cachedUrl = (id: string, v: Variant) => urls.get(`${id}:${v}`);
// Resolves once every picture asked for so far is ready (printing waits for it)
export async function photosReady() { while (pending.size) await Promise.allSettled([...pending]); }

// ---- browser side: decode, scale, re-encode (also removes the position and camera data of the file, and applies its orientation)
function loadFile(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}
// A picture decoded once: `createImageBitmap` where the browser has it (the decoding is done off the page), else an image element; `from-image`: the orientation of the file is applied
async function decode(blob: Blob): Promise<{ src: CanvasImageSource; w: number; h: number; close(): void }> {
  try { const b = await createImageBitmap(blob, { imageOrientation: 'from-image' }); return { src: b, w: b.width, h: b.height, close: () => b.close() }; } catch { /* no such function, or a format it refuses: read as before */ }
  const img = await loadFile(blob);
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, close() {} };
}
// `src` drawn on a canvas whose long side is at most `max` (never enlarged), on white
function draw(src: CanvasImageSource, w: number, h: number, max: number): HTMLCanvasElement {
  const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const jpeg = (c: HTMLCanvasElement) => new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.88));
async function shrink(o: Blob, max: number): Promise<Blob | null> {
  try {
    const d = await decode(o);
    try { return Math.max(d.w, d.h) <= max ? null : await jpeg(draw(d.src, d.w, d.h, max)); } finally { d.close(); }
  } catch { return null; }
}
// A photo taken or chosen on the device: kept up to max pixels on its long side (4 096 = 4K), as a reference. The file is read once; the views of 1 600 and 480 px are made now,
// from the picture already decoded (each size from the one above), so that the sheets and the PV find them ready instead of making them at the first display, one by one (F-8)
export async function addPhoto(file: Blob, max = 2560): Promise<string> {
  const d = await decode(file);
  try {
    let from = draw(d.src, d.w, d.h, Math.min(max, SIZES.o));
    const out = await jpeg(from);
    if (!out) throw new Error('Image illisible');
    const ref = await putPhoto(out, from.width, from.height), id = parseRef(ref)!.id;
    if (await get(`${id}:t`)) return ref;   // this picture was kept before, with its views
    for (const v of ['v', 't'] as const) {
      if (Math.max(from.width, from.height) <= SIZES[v]) continue;   // already that small: the original serves
      const c = draw(from, from.width, from.height, SIZES[v]), b = await jpeg(c);
      if (b) await put(`${id}:${v}`, b);
      from = c;
    }
    return ref;
  } finally { d.close(); }
}

// ---- pictures still held as text in the records (data URLs): moved to the store, and replaced by references
const BIG = 20000;   // the small drawings of the examples stay as they are
export const isInline = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:image/') && (v.length > BIG || v.includes('dc-marks'));
export function dataBlob(url: string): Blob {
  const i = url.indexOf(','), head = url.slice(5, i), mime = head.split(';')[0];
  const raw = head.includes(';base64') ? atob(url.slice(i + 1)) : decodeURIComponent(url.slice(i + 1));
  return new Blob([Uint8Array.from(raw, c => c.charCodeAt(0))], { type: mime });
}
export async function toRef(value: string): Promise<string> {
  if (!value.startsWith('data:image/')) return value;
  const { photo, marks } = splitPhoto(value);
  const blob = dataBlob(photo), bytes = new Uint8Array(await blob.arrayBuffer());
  let d = imageDims(bytes, blob.type);
  if (!d) { const i = await loadFile(blob); d = { w: i.naturalWidth, h: i.naturalHeight }; }
  const ref = await putPhoto(blob, d.w, d.h);
  return marks.length ? withEdit(ref, { m: marks }) : ref;
}
const collect = (x: unknown, out: Set<string>) => {
  if (typeof x === 'string') { if (isInline(x)) out.add(x); }
  else if (Array.isArray(x)) x.forEach(y => collect(y, out));
  else if (x && typeof x === 'object') Object.values(x).forEach(y => collect(y, out));
};
export const replaceStrings = <T>(x: T, map: Map<string, string>): T => {
  if (typeof x === 'string') return (map.get(x) ?? x) as T;
  if (Array.isArray(x)) return x.map(y => replaceStrings(y, map)) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, replaceStrings(v, map)])) as T;
  return x;
};
// What to replace in some data: each inline picture and its reference (empty when there is none)
export async function inlineMap(data: unknown): Promise<Map<string, string>> {
  const found = new Set<string>(), map = new Map<string, string>();
  collect(data, found);
  for (const v of found) { try { map.set(v, await toRef(v)); } catch { /* unreadable picture: left as it is */ } }
  return map;
}
export { parseRef, type PhotoEdit };
