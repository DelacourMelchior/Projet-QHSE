// The store, rendered on the server only to take its functions (the effects do not run): unreadable data that no copy holds are not written over without a word.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../domain/templates';
import { LOCAL_KEY, release, uncopied } from './local';
import { StoreProvider, useStore } from './StoreContext';

let ctx: ReturnType<typeof useStore>, store: Map<string, string>;
function Probe() { ctx = useStore(); return null; }
const mount = () => { renderToStaticMarkup(<StoreProvider><Probe /></StoreProvider>); return ctx; };
const confirm = vi.fn();
const ROOM = 5_000_000, cut = (n: number) => `{"settings": {"companyName": "Atelier"}, "ballast": "${'x'.repeat(n - 60)}`;
beforeEach(() => {
  store = new Map();
  const used = () => [...store].reduce((n, [k, v]) => n + k.length + v.length, 0);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { if (used() - (store.has(k) ? k.length + store.get(k)!.length : 0) + k.length + v.length > ROOM) throw new Error('QuotaExceededError'); store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { confirm });
  confirm.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); release(); });

describe('unreadable data that the browser has no room to copy', () => {
  it('are told to the screens, and a new data set asks before it writes over them', () => {
    const text = cut(3_100_000);
    store.set(LOCAL_KEY, text);
    const s = mount();
    expect([s.state, s.unreadable, s.uncopied]).toEqual([null, null, true]);
    confirm.mockReturnValue(false);
    s.replace(demoState());                                        // "Voir un exemple"
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/perdues/);
    expect(store.get(LOCAL_KEY)).toBe(text);                       // refused: nothing written
    expect(uncopied()).toBe(true);
    confirm.mockReturnValue(true);
    s.replace(demoState());
    expect(uncopied()).toBe(false);                                // chosen: the data are written, the unreadable text is gone
    expect(JSON.parse(store.get(LOCAL_KEY)!).settings).toBeDefined();
  });
  it('once downloaded (release), the same gesture asks nothing', () => {
    store.set(LOCAL_KEY, cut(3_100_000));
    const s = mount();
    s.release();
    expect(uncopied()).toBe(false);
    s.replace(demoState());
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.parse(store.get(LOCAL_KEY)!).settings).toBeDefined();
  });
  it('"Repartir de zéro" asks too, and clears everything once it is said yes', () => {
    store.set(LOCAL_KEY, cut(3_100_000));
    const s = mount();
    confirm.mockReturnValue(true);
    s.replace(null);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect([store.has(LOCAL_KEY), uncopied()]).toEqual([false, false]);
  });
  it('a copy that fits is made without a question: the screens are told it is kept', () => {
    store.set(LOCAL_KEY, cut(2_100_000));
    const s = mount();
    expect([s.uncopied, s.unreadable]).toEqual([false, expect.stringMatching(/\.corrupt-/)]);
    s.replace(demoState());
    expect(confirm).not.toHaveBeenCalled();
  });
});
