// Browser storage: the data when no shared folder is connected, and per-computer preferences.
import type { State } from '../domain/types';
import { fromLegacyTool, legacyRisks, normalize } from '../domain/migrate';

const KEY = 'DELACOUR_PILOTAGE_V2';
const LEGACY_KEY = 'DELACOUR_DATA_1.1';   // tool 1.1 of the previous version

const safe = <T>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

export const loadLocal = (): State | null => safe(() => {
  const raw = localStorage.getItem(KEY);
  return raw ? normalize(JSON.parse(raw)) : null;
}, null);

export const clearLocal = () => safe(() => { localStorage.removeItem(KEY); return true; }, false);

export const saveLocal = (s: State) => safe(() => { localStorage.setItem(KEY, JSON.stringify(s)); return true; }, false);

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

export const pref = {
  get: (k: string, fallback = '') => safe(() => localStorage.getItem(`DELACOUR_PILOTAGE_PREF_${k}`) ?? fallback, fallback),
  set: (k: string, v: string) => safe(() => { localStorage.setItem(`DELACOUR_PILOTAGE_PREF_${k}`, v); return true; }, false),
};
