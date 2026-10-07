// Application state: data, current month, team/management view, persistence (browser + shared folder).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Period, State } from '../domain/types';
import { lastFilledPeriod, timelinePeriods } from '../domain/engine';
import { normalize } from '../domain/migrate';
import { clearLocal, copiesChars, dropCopy as dropLocalCopy, LOCAL_KEY, LOCAL_LIMIT, loadLocal, localSize, pref, release as releaseLocal, saveLocal, uncopied as uncopiedNow, unreadable as unreadableKey } from './local';
import { overlayChanges } from './flat';
import { produce } from './draft';
import { carryPvCounter, pvIssued } from '../domain/receptions';
import { inlineMap, persistent, replaceStrings, setRemote } from '../photo/store';
import {
  askPermission, folderSupported, forgetFolder, FolderSession, hasPermission, initDataFolder, isDataFolder,
  pickFolder, rememberFolder, rememberedFolder,
} from './folder';

export type FolderStatus = 'unsupported' | 'local' | 'needs-permission' | 'connected' | 'error';

export interface FolderInfo {
  status: FolderStatus;
  name: string;
  contributors: string[];
  hasDirection: boolean;
  lastSync: Date | null;
  error: string;
}

interface Store {
  state: State | null;
  period: Period;
  setPeriod(p: Period): void;
  teamView: boolean;
  setTeamView(v: boolean): void;
  update(fn: (draft: State) => void): void;
  replace(s: State | null): void;
  author: string;
  setAuthor(a: string): void;
  folder: FolderInfo;
  connectFolder(): Promise<void>;
  reconnectFolder(): Promise<void>;
  disconnectFolder(): Promise<void>;
  refresh(): Promise<void>;
  // writes at once what waits: the browser's copy (a gesture is written within 250 ms; a screen that leaves, a tool that changes or a full screen that closes may call this) and the
  // shared folder (called before another tab of the application opens: it reads them when it starts)
  flush(): Promise<void>;
  // true when the browser refused to keep the data (its storage is full): what was typed since is lost at the next opening
  storageFull: boolean;
  // characters kept in the browser (of about 5 million, the copies of unreadable data included); storageNear: past 80 %, the warning before the browser refuses
  storageChars: number;
  storageNear: boolean;
  // key under which the text of the data that could not be read was kept (null: the data were read)
  unreadable: string | null;
  // deletes a copy of unreadable data (its key comes from `copies()` of local.ts)
  dropCopy(key: string): void;
  // true when the unreadable data could not be copied in the browser: they stay where they are, nothing is saved in the browser until `release` (called once they are downloaded)
  uncopied: boolean;
  release(): void;
}

// The PV numbers given before the data were erased ("Repartir de zéro"), kept in the browser until new data come: as a state that holds only the counter (null when none)
const keptCounter = (): State | null => {
  try { const c = JSON.parse(pref.get('pvCounter') || 'null'); return c ? ({ deliveries: {}, params: { reception: { pvCounter: c } } } as unknown as State) : null; } catch { return null; }
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider missing'); return s; };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(() => loadLocal());
  const [periodPref, setPeriodPref] = useState<string>(() => pref.get('period'));
  const [teamViewPref, setTeamViewPref] = useState(() => pref.get('teamView') === '1');
  const [author, setAuthorState] = useState(() => pref.get('author'));
  const [folder, setFolder] = useState<FolderInfo>({
    status: folderSupported() ? 'local' : 'unsupported', name: '', contributors: [], hasDirection: true, lastSync: null, error: '',
  });
  const [storageFull, setStorageFull] = useState(false);
  const [storageChars, setStorageChars] = useState(() => localSize());
  const [unreadable, setUnreadable] = useState(() => unreadableKey());
  const [uncopied, setUncopied] = useState(() => uncopiedNow());
  const afterLoad = useRef<() => void>(() => {});   // what to do once data came from the folder (set below)
  const session = useRef<FolderSession | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const stateRef = useRef(state);
  stateRef.current = state;
  // the data are read from the ref by the next call, before the screen is drawn again: two changes in a row never overwrite each other
  const put = useCallback((next: State | null) => { stateRef.current = next; setState(next); }, []);
  const folderRef = useRef(folder);
  folderRef.current = folder;

  // ---- current month: saved choice if still in the timeline, else the last month with data
  const period = useMemo(() => {
    if (!state) return '';
    const ps = timelinePeriods(state);
    return ps.includes(periodPref) ? periodPref : lastFilledPeriod(state);
  }, [state, periodPref]);
  const setPeriod = useCallback((p: Period) => {
    setPeriodPref(p); pref.set('period', p);
    // choosing a month after the timeline extends it
    const prev = stateRef.current;
    if (prev && p > prev.timeline.end) put({ ...prev, timeline: { ...prev.timeline, end: p } });
    else if (prev && p < prev.timeline.start) put({ ...prev, timeline: { ...prev.timeline, start: p } });
  }, [put]);

  // without rights on the direction folder the team view is forced
  const teamView = teamViewPref || (folder.status === 'connected' && !folder.hasDirection);
  const setTeamView = useCallback((v: boolean) => { setTeamViewPref(v); pref.set('teamView', v ? '1' : '0'); }, []);
  const setAuthor = useCallback((a: string) => { setAuthorState(a); pref.set('author', a); }, []);

  // ---- shared folder
  const syncInfo = (extra: Partial<FolderInfo> = {}) => {
    const s = session.current;
    setFolder(f => ({ ...f, name: s?.dir.name || '', contributors: s?.contributors || [], hasDirection: s ? s.hasDirection : true, ...extra }));
  };

  const saveToFolder = useCallback(async () => {
    saveTimer.current = undefined;
    const s = session.current, st = stateRef.current;
    if (!s || !st) return;
    try {
      await s.save(st);
      syncInfo({ status: 'connected', lastSync: new Date(), error: '' });
    } catch (e) {
      syncInfo({ status: 'error', error: `Écriture impossible dans le dossier : ${(e as Error).message}` });
    }
  }, []);

  // the browser's copy: what it holds, and whether it refused (full) or is about to (the size comes from the text already written: nothing to measure).
  // `saved`: the state of the last write or reading (what a change made here since is told from, when another tab writes)
  const saved = useRef<State | null>(state);
  const keepLocal = useCallback((next: State): boolean => {
    if (uncopiedNow()) return false;   // the unreadable text is still under the key of the data: nothing is written over it until the person has downloaded it or chosen to lose it
    const n = saveLocal(next);
    setStorageFull(!n || !persistent);
    if (n) { const all = n + copiesChars(); setStorageChars(c => (Math.abs(c - all) < 10_000 ? c : all)); saved.current = next; }   // a gauge that moves by less than 0.2 % draws nothing again
    return n > 0;
  }, []);
  // a gesture is on the screen at once and in the browser within 250 ms: the writes of a burst of gestures are one (F-2); `dirty` stays until the browser has taken the data,
  // so that a refusal (full) is tried again at the next gesture, at the next `flush` and when the page closes: a gesture is never given up
  const dirty = useRef(false), localTimer = useRef<number | undefined>(undefined);
  const stopLocal = () => { if (localTimer.current !== undefined) { window.clearTimeout(localTimer.current); localTimer.current = undefined; } };
  const flushLocal = useCallback(() => {
    stopLocal();
    const st = stateRef.current;
    if (dirty.current && st && keepLocal(st)) dirty.current = false;
  }, [keepLocal]);

  // writes at once what waits: the browser's copy (a tab that opens reads it) and the shared folder
  const flush = useCallback(async () => {
    flushLocal();
    if (saveTimer.current !== undefined) { window.clearTimeout(saveTimer.current); await saveToFolder(); }
  }, [flushLocal, saveToFolder]);
  // the page goes away (closed, hidden on a phone, another page of the address bar): what waits is written first
  useEffect(() => {
    const hide = () => { if (document.visibilityState !== 'hidden') return; void flush(); };
    const go = () => { void flush(); };
    window.addEventListener('pagehide', go); window.addEventListener('hashchange', go); document.addEventListener('visibilitychange', hide);
    return () => { window.removeEventListener('pagehide', go); window.removeEventListener('hashchange', go); document.removeEventListener('visibilitychange', hide); flushLocal(); };
  }, [flush, flushLocal]);

  const loadFromFolder = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    try {
      await flush();
      const before = stateRef.current;   // what the screen holds when the reading starts
      const raw = await s.load(before);   // what was done here since the last synchronisation goes back over what the folder holds (S-3)
      const now = stateRef.current;
      // a tap made during the wait is put back over what was read (otherwise it would be wiped, and never sent)
      const loaded = raw && normalize(before && now && now !== before ? overlayChanges(raw, before, now) : raw);
      if (loaded) {
        put(loaded);
        if (keepLocal(loaded)) dirty.current = false;
        await s.save(loaded);   // publishes only what changed: migration from an earlier version, converted fields
      } else if (stateRef.current) {
        await s.save(stateRef.current);                              // empty folder: publish this computer's data
      }
      syncInfo({ status: 'connected', lastSync: new Date(), error: '' });
      afterLoad.current();
    } catch (e) {
      syncInfo({ status: 'error', error: (e as Error).message });
    }
  }, [flush, keepLocal, put]);

  const connectFolder = useCallback(async () => {
    if (!folderSupported()) return;
    let dir: FileSystemDirectoryHandle;
    try { dir = await pickFolder(); } catch { return; }   // cancelled
    if (!(await isDataFolder(dir))) {
      if (!window.confirm(`Le dossier « ${dir.name} » n'est pas encore un dossier de données Delacour.\n\nCréer les sous-dossiers « equipe » et « direction » et y publier les données de ce poste ?`)) return;
      await initDataFolder(dir);
    }
    await rememberFolder(dir);
    session.current = new FolderSession(dir, pref.get('author') || 'anonyme');
    await loadFromFolder();
  }, [loadFromFolder]);

  const reconnectFolder = useCallback(async () => {
    const dir = session.current?.dir || await rememberedFolder();
    if (!dir) return connectFolder();
    if (await askPermission(dir)) {
      session.current = new FolderSession(dir, pref.get('author') || 'anonyme');
      await loadFromFolder();
    }
  }, [connectFolder, loadFromFolder]);

  const disconnectFolder = useCallback(async () => {
    await flush();
    await forgetFolder();
    session.current = null;
    setFolder(f => ({ ...f, status: 'local', name: '', contributors: [], hasDirection: true, lastSync: null, error: '' }));
  }, [flush]);

  const refresh = useCallback(async () => { if (session.current) await loadFromFolder(); }, [loadFromFolder]);
  const readFlags = useCallback(() => { setUnreadable(unreadableKey()); setUncopied(uncopiedNow()); setStorageChars(localSize()); }, []);
  const dropCopy = useCallback((key: string) => { dropLocalCopy(key); readFlags(); }, [readFlags]);
  const release = useCallback(() => { releaseLocal(); setUncopied(false); }, []);

  // boot: reopen the remembered folder when the browser still grants access (otherwise one click to reconnect)
  useEffect(() => {
    if (!folderSupported()) return;
    (async () => {
      try {
        const dir = await rememberedFolder();
        if (!dir || !pref.get('author')) return;
        session.current = new FolderSession(dir, pref.get('author'));
        if (await hasPermission(dir)) await loadFromFolder();
        else syncInfo({ status: 'needs-permission' });
      } catch { /* no remembered folder */ }
    })();
    const onFocus = () => { if (session.current && folderRef.current.status === 'connected') loadFromFolder(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadFromFolder]);
  // another tab of the application changed the data: take it, so that a save here never wipes what was done there
  // A gesture of this tab that the browser does not hold yet (the 250 ms of the write) goes back over what the other tab wrote: nothing of either is lost.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_KEY) return;
      const theirs = loadLocal(), mine = stateRef.current, base = saved.current, pending = dirty.current && !!theirs && !!mine && !!base;
      let next = theirs;
      if (pending) { try { next = normalize(overlayChanges(theirs!, base!, mine!)); } catch { /* the other tab's data stand */ } }
      put(next); saved.current = theirs; dirty.current = pending && next !== theirs; readFlags();
      if (dirty.current) flushLocal();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [put, readFlags, flushLocal]);
  // author name signs the files
  useEffect(() => { if (session.current) session.current.author = author || 'anonyme'; }, [author]);

  // ---- mutations: the browser's copy within 250 ms (at once with `now`), the shared folder after a short pause
  const persist = useCallback((next: State | null, now = false) => {
    if (next) {
      dirty.current = true;
      if (now) flushLocal(); else localTimer.current ??= window.setTimeout(flushLocal, 250);
    } else { stopLocal(); dirty.current = false; saved.current = null; clearLocal(); readFlags(); setStorageChars(0); }
    if (next && session.current && folderRef.current.status === 'connected') {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(saveToFolder, 800);
    }
  }, [flushLocal, readFlags, saveToFolder]);

  // Pictures still held as text in the records (older versions) move to the photo store and become references. Applied to the latest data, so that
  // nothing typed meanwhile is lost; not written in the journal (nothing changed for the people)
  const migrating = useRef(false);
  const migratePhotos = useCallback(async () => {
    const st = stateRef.current;
    if (!st || migrating.current) return;
    migrating.current = true;
    try {
      const map = await inlineMap(st);
      const cur = stateRef.current;
      if (map.size && cur) { const next = replaceStrings(cur, map); put(next); persist(next); }
    } finally { migrating.current = false; }
  }, [persist, put]);
  afterLoad.current = () => { void migratePhotos(); };
  useEffect(() => { void migratePhotos(); }, [migratePhotos]);
  // ask the browser not to empty this space when the disk is short (the photos live here)
  useEffect(() => { try { void navigator.storage?.persist?.(); } catch { /* refused: the gauge in the settings says so */ } }, []);
  // a picture missing on this computer is read from the shared folder when a page asks for it
  useEffect(() => { setRemote(id => (session.current ? session.current.readPhotoFile(id) : Promise.resolve(null))); return () => setRemote(null); }, []);

  const authorRef = useRef(author);
  authorRef.current = author;
  const update = useCallback((fn: (d: State) => void) => {
    const prev = stateRef.current;
    if (!prev) return;
    const next = produce(prev, fn, authorRef.current || 'anonyme');   // a copy of what the gesture touches, the rest shared; the previous state itself when nothing changed
    if (next === prev) return;
    put(next);   // on the screen at once
    persist(next);   // in the browser within 250 ms, one write for a burst
  }, [persist, put]);

  const replace = useCallback((raw: State | null) => {
    // unreadable data that no copy holds are lost by what follows (it writes over them): said, and asked
    if (uncopiedNow()) {
      if (!window.confirm("Les données illisibles de ce navigateur n'ont pas pu être copiées dans le navigateur : elles seront perdues si elles n'ont pas été téléchargées. Continuer ?")) return;
      release();
    }
    // the PV numbers given never go back: what replaces the data keeps the highest of each year (when the data were erased, the numbers are kept in the browser until new data come)
    const prev = stateRef.current, kept = keptCounter();
    const s = raw && carryPvCounter(prev ?? kept, normalize(raw));
    if (!raw && prev) pref.set('pvCounter', JSON.stringify(pvIssued(prev)));
    else if (raw && kept) pref.set('pvCounter', '');
    put(s);
    persist(s, true);
    if (s) { setPeriodPref(''); pref.set('period', ''); void migratePhotos(); }
  }, [persist, put, migratePhotos, release]);

  const value: Store = {
    state, period, setPeriod, teamView, setTeamView, update, replace, author, setAuthor,
    folder, connectFolder, reconnectFolder, disconnectFolder, refresh, flush, storageFull, storageChars, storageNear: storageChars > LOCAL_LIMIT * 0.8, unreadable, dropCopy, uncopied, release,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
