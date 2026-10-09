// A photo in a record is a reference, never the picture: "photo:<id>-<width>-<height>" (id: fingerprint of the original, then its size in pixels),
// followed by "~<edit>" once it has been retouched: quarter turns, crop, straightening, brightness, contrast and the marks, as base64url JSON.
// The original is never changed, so everything drawn on it can be changed again at any time. The picture itself lives in the photo store
// (this computer, then the shared folder, later the server).
export interface Crop { x: number; y: number; w: number; h: number }
export interface PhotoEdit {
  r?: 0 | 1 | 2 | 3;   // quarter turns clockwise
  c?: Crop;            // crop window, shares of the turned picture
  t?: number;          // straightening, degrees (-15 to 15)
  b?: number;          // brightness (-50 to 50)
  k?: number;          // contrast (-50 to 50)
  m?: unknown[];       // marks (see ui/photo.ts)
}
export interface PhotoRef { id: string; w: number; h: number; edit: PhotoEdit }

const RE = /^photo:([0-9a-f]{6,64})-(\d{1,5})-(\d{1,5})(?:~([A-Za-z0-9_-]+))?$/;
const ANY = /photo:([0-9a-f]{6,64})-\d{1,5}-\d{1,5}/g;

export const isRef = (v: unknown): v is string => typeof v === 'string' && RE.test(v);

const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
// Only what is known and in range survives (the text can come from a file written by someone else)
export function cleanEdit(e: unknown): PhotoEdit {
  const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>, out: PhotoEdit = {};
  if (o.r === 1 || o.r === 2 || o.r === 3) out.r = o.r;
  const c = o.c as Record<string, unknown> | undefined;
  if (c && [c.x, c.y, c.w, c.h].every(v => typeof v === 'number')) {
    const x = num(c.x, 0, 1)!, y = num(c.y, 0, 1)!, w = num(c.w, 0.02, 1)!, h = num(c.h, 0.02, 1)!;
    if (x + w <= 1.0001 && y + h <= 1.0001 && (w < 0.999 || h < 0.999)) out.c = { x, y, w, h };
  }
  const t = num(o.t, -15, 15), b = num(o.b, -50, 50), k = num(o.k, -50, 50);
  if (t) out.t = t;
  if (b) out.b = b;
  if (k) out.k = k;
  if (Array.isArray(o.m) && o.m.length) out.m = o.m.slice(0, 60);
  return out;
}

const round = (_: string, v: unknown) => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v);
const enc = (o: object) => { const b = new TextEncoder().encode(JSON.stringify(o, round)); let s = ''; b.forEach(x => { s += String.fromCharCode(x); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const dec = (t: string): unknown => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0)))); };

export function makeRef(id: string, w: number, h: number, edit: PhotoEdit = {}): string {
  const e = cleanEdit(edit);
  return `photo:${id}-${Math.round(w)}-${Math.round(h)}${Object.keys(e).length ? `~${enc(e)}` : ''}`;
}
export function parseRef(v: string): PhotoRef | null {
  const m = RE.exec(v);
  if (!m) return null;
  let edit: PhotoEdit = {};
  if (m[4]) { try { edit = cleanEdit(dec(m[4])); } catch { /* unreadable edit: the photo shows without it */ } }
  return { id: m[1], w: Number(m[2]), h: Number(m[3]), edit };
}
export const withEdit = (v: string, edit: PhotoEdit): string => { const p = parseRef(v); return p ? makeRef(p.id, p.w, p.h, edit) : v; };

// Every photo id used by some text or record (to know which pictures a shared folder or the server must hold)
export function refIds(x: unknown, out = new Set<string>()): Set<string> {
  if (typeof x === 'string') { if (x.startsWith('photo:')) for (const m of x.matchAll(ANY)) out.add(m[1]); }
  else if (Array.isArray(x)) x.forEach(y => refIds(y, out));
  else if (x && typeof x === 'object') Object.values(x).forEach(y => refIds(y, out));
  return out;
}
