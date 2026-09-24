// Application state: data, current month, team/management view, persistence (browser + shared folder).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Period, State } from '../domain/types';
import { lastFilledPeriod, timelinePeriods } from '../domain/engine';
import { clearLocal, loadLocal, pref, saveLocal } from './local';
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
}

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
  const session = useRef<FolderSession | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const stateRef = useRef(state);
  stateRef.current = state;
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
    setState(prev => (prev && p > prev.timeline.end) ? { ...prev, timeline: { ...prev.timeline, end: p } }
      : (prev && p < prev.timeline.start) ? { ...prev, timeline: { ...prev.timeline, start: p } } : prev);
  }, []);

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

  const flush = useCallback(async () => {
    if (saveTimer.current !== undefined) { window.clearTimeout(saveTimer.current); await saveToFolder(); }
  }, [saveToFolder]);

  const loadFromFolder = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    try {
      await flush();
      const loaded = await s.load();
      if (loaded) {
        setState(loaded);
        saveLocal(loaded);
        if (!Object.keys(s.baseline).length) await s.save(loaded);   // migrated from the previous version: publish
      } else if (stateRef.current) {
        await s.save(stateRef.current);                              // empty folder: publish this computer's data
      }
      syncInfo({ status: 'connected', lastSync: new Date(), error: '' });
    } catch (e) {
      syncInfo({ status: 'error', error: (e as Error).message });
    }
  }, [flush]);

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
  // author name signs the files
  useEffect(() => { if (session.current) session.current.author = author || 'anonyme'; }, [author]);

  // ---- mutations: local save at once, shared folder after a short pause
  const persist = useCallback((next: State | null) => {
    if (next) saveLocal(next); else clearLocal();
    if (next && session.current && folderRef.current.status === 'connected') {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(saveToFolder, 800);
    }
  }, [saveToFolder]);

  const update = useCallback((fn: (d: State) => void) => {
    setState(prev => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      persist(next);
      return next;
    });
  }, [persist]);

  const replace = useCallback((s: State | null) => {
    setState(s);
    persist(s);
    if (s) { setPeriodPref(''); pref.set('period', ''); }
  }, [persist]);

  const value: Store = {
    state, period, setPeriod, teamView, setTeamView, update, replace, author, setAuthor,
    folder, connectFolder, reconnectFolder, disconnectFolder, refresh,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
