// Browser storage: the data when no shared folder is connected, and per-computer preferences.
import type { State } from '../domain/types';
import { fromLegacyTool, isState, legacyRisks, normalize } from '../domain/migrate';
import { LEGACY_TOOL_IDS } from '../domain/legacyTools';

export const LOCAL_KEY = 'DELACOUR_PILOTAGE_V2';
const KEY = LOCAL_KEY;
const LEGACY_KEY = 'DELACOUR_DATA_1.1';   // tool 1.1 of the previous version

const safe = <T>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

// Space the browser gives to one origin for what is kept here (about 5 million characters)
export const LOCAL_LIMIT = 5_000_000;
// Share of that room used, never past 100 (the browser can hold a little more than it says, and the text would read "105 %")
export const storagePct = (chars: number) => Math.min(100, Math.round(chars / LOCAL_LIMIT * 100));
// Text that could not be read: copied under another key (and kept in memory), and only then taken off the key of the data; never overwritten, never lost
const CORRUPT = `${KEY}.corrupt-`;
let unreadableKey: string | null = null, unreadableRaw: string | null = null, held = false;
export const unreadable = () => unreadableKey;
// True when the browser had no room for the copy: the text stays under the key of the data, and nothing is written over it until the person has downloaded it
// (`release`) or chosen to lose it (`clearLocal`, `release`)
export const uncopied = () => held;
export const release = () => { held = false; };

// The copies of unreadable data in this browser, newest first: they use the same room as the data, so the gauge counts them
export interface Copy { key: string; on: string; chars: number }   // on: "JJ/MM"
export const copies = (): Copy[] => safe(() => {
  const out: Copy[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i), m = k?.startsWith(CORRUPT) ? k.slice(CORRUPT.length).match(/^\d{4}-(\d{2})-(\d{2})/) : null;
    if (k && m) out.push({ key: k, on: `${m[2]}/${m[1]}`, chars: localStorage.getItem(k)?.length ?? 0 });
  }
  return out.sort((a, b) => (a.key < b.key ? 1 : -1));
}, []);
export const copiesChars = () => copies().reduce((n, c) => n + c.chars, 0);
export const localSize = () => safe(() => localStorage.getItem(KEY)?.length ?? 0, 0) + copiesChars();
export const dropCopy = (key: string) => {
  if (!key.startsWith(CORRUPT)) return;
  safe(() => { localStorage.removeItem(key); return true; }, false);
  if (key === unreadableKey) unreadableKey = unreadableRaw = null;
};

// What a person downloads from a copy: the text as a backup that "Restaurer une sauvegarde" takes back (when it is valid JSON; a text cut short stays as it is)
export const copyFile = (raw: string) => { try { return JSON.stringify({ app: 'delacour-pilotage', version: 2, state: JSON.parse(raw) }); } catch { return raw; } };
// The state a backup file holds: a backup of this application, the bare state it keeps (what is left of data that could not be read), or a backup of the previous version
// (null when the file is none of these). The state is normalised by whoever puts it back.
export function stateOfFile(j: unknown): State | null {
  const rec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!rec(j)) return null;
  if (j.app === 'delacour-pilotage' && rec(j.state)) return j.state as unknown as State;
  if ('settings' in j && 'timeline' in j) return j as unknown as State;
  const old = j.tool_1_1 as { processes?: unknown } | undefined;
  return old?.processes ? fromLegacyTool(old) : null;
}
export const copyText = (key: string | null): string | null => {
  const raw = key !== null && key === unreadableKey && unreadableRaw !== null ? unreadableRaw : safe(() => (key ? localStorage.getItem(key) : null), null);
  return raw === null ? null : copyFile(raw);
};
export const unreadableText = () => (unreadableRaw !== null ? copyFile(unreadableRaw) : copyText(unreadableKey));
// The text of the data as the browser holds it (for the error screen of the whole application)
export const rawLocal = () => safe(() => localStorage.getItem(KEY), null);

export const loadLocal = (): State | null => {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  unreadableKey = unreadableRaw = null; held = false;
  if (!raw) { unreadableKey = copies()[0]?.key ?? null; return null; }   // no data: the newest copy of unreadable data, if one is kept, is still said
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isState(parsed)) throw new Error('not a state');   // valid text that has no timeline, settings… would give a blank page: same path as a text cut short
    return normalize(parsed);
  } catch {
    // one copy per text (the same unreadable text found again at every opening is not copied again)
    const same = safe(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(CORRUPT) && localStorage.getItem(k) === raw) return k; } return null; }, null);
    const d = new Date(), p = (n: number) => String(n).padStart(2, '0');
    const key = same ?? `${CORRUPT}${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    unreadableRaw = raw;
    // the copy is written and read back before the text leaves its own key: a browser that refuses (or silently drops) the copy leaves the text where it is
    if (safe(() => { if (!same) localStorage.setItem(key, raw!); return localStorage.getItem(key) === raw; }, false)) {
      unreadableKey = key;
      safe(() => { localStorage.removeItem(KEY); return true; }, false);   // moved, not doubled
    } else { held = true; if (!same) safe(() => { localStorage.removeItem(key); return true; }, false); }   // a copy that does not read back is not kept (it would be counted and trusted)
    return null;
  }
};

// "Repartir de zéro": the data and the copies of unreadable data
export const clearLocal = () => {
  copies().forEach(c => dropCopy(c.key));
  unreadableKey = unreadableRaw = null; held = false;
  return safe(() => { localStorage.removeItem(KEY); return true; }, false);
};

// Number of characters written, 0 when the browser refused (so that it still reads as a yes or a no)
// (nothing while unreadable text is held under that key: writing would destroy it)
export const saveLocal = (s: State): number => held ? 0 : safe(() => { const t = JSON.stringify(s); localStorage.setItem(KEY, t); return t.length; }, 0);

// Data left by the previous version on this computer (null if none or empty)
export const legacyLocal = (): State | null => safe(() => {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  const s = fromLegacyTool(JSON.parse(raw));
  return Object.keys(s.values).length ? s : null;
}, null);

// Risks of the previous version's tool 1.2 on this computer (empty if none)
export const legacyLocalRisks = () => safe(() => {
  const raw = localStorage.getItem('DELACOUR_DATA_1.2');
  return raw ? legacyRisks(JSON.parse(raw)) : [];
}, []);

// Tables of the previous version's tools 2.1 to 5.3 on this computer (only those it saved)
export const legacyLocalTools = (): Record<string, unknown> => safe(() => Object.fromEntries(LEGACY_TOOL_IDS
  .map(id => [id, localStorage.getItem(`DELACOUR_DATA_${id}`)] as const)
  .filter(([, raw]) => raw)
  .map(([id, raw]) => [id, JSON.parse(raw!)])), {});

export const pref = {
  get: (k: string, fallback = '') => safe(() => localStorage.getItem(`DELACOUR_PILOTAGE_PREF_${k}`) ?? fallback, fallback),
  set: (k: string, v: string) => safe(() => { localStorage.setItem(`DELACOUR_PILOTAGE_PREF_${k}`, v); return true; }, false),
};
