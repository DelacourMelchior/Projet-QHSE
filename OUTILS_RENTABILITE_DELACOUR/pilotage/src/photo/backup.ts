// The pictures of a backup file: the references in the data are not the pictures, so the file carries the originals (as data URLs) next to the data,
// and putting a backup back (or adding the records of another device) puts them back in the photo store.
import { refIds } from './ref';
import { dataBlob, photoBlob, putPhoto } from './store';

const toDataUrl = (b: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = () => reject(r.error); r.readAsDataURL(b); });

// What a file can hold: the browser stops a text at about 540 million characters (a picture is 4/3 bigger as text), and the same text has to be read back
// in one piece when the backup is restored: a file carries at most this much of pictures, the others go to another file
export const BATCH = 100 * 1048576;
export interface Held { id: string; size: number }

// The pictures the data refer to that are on this computer (or at their source), with their size, and how many references there are in all
export async function planPhotos(data: unknown): Promise<{ held: Held[]; refs: number }> {
  const ids = [...refIds(data)], held: Held[] = [];
  for (const id of ids) { const b = await photoBlob(id, 'o'); if (b) held.push({ id, size: b.size }); }
  return { held, refs: ids.length };
}
// The pictures cut in files of at most `cap` bytes (a picture bigger than that is alone in its file)
export function batches(held: Held[], cap = BATCH): Held[][] {
  const out: Held[][] = []; let used = 0;
  for (const h of held) { if (!out.length || used + h.size > cap) { out.push([]); used = 0; } out.at(-1)!.push(h); used += h.size; }
  return out;
}
// { id: data URL } for these pictures
export async function packPhotos(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of ids) { const b = await photoBlob(id, 'o'); if (b) out[id] = await toDataUrl(b); }
  return out;
}
// The text of file `i` of a backup: the first holds the data and the first pictures, each other one only pictures; "part 2 of 3" says where it belongs
export async function backupFile(state: unknown, parts: Held[][], i: number, at = new Date().toISOString()): Promise<string> {
  const photos = parts[i] ? await packPhotos(parts[i].map(h => h.id)) : {};
  return JSON.stringify({ app: 'delacour-pilotage', version: 2, exportedAt: at, ...(i ? {} : { state }), ...(parts.length > 1 ? { part: i + 1, of: parts.length } : {}), photos }, null, 1);
}
export async function unpackPhotos(photos: unknown): Promise<number> {
  if (!photos || typeof photos !== 'object') return 0;
  let n = 0;
  for (const url of Object.values(photos as Record<string, unknown>)) {
    if (typeof url !== 'string' || !url.startsWith('data:image/')) continue;
    try { await putPhoto(dataBlob(url), 0, 0); n++; } catch { /* unreadable picture: the others are kept */ }
  }
  return n;
}
