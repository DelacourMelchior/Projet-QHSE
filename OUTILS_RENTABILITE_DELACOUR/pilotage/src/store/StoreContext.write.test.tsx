// @vitest-environment happy-dom
// F-1 / F-2 / S-21, the real store played in a DOM: a gesture is on the screen at once and in the browser within 250 ms (one write for a burst), never lost when the page goes away right
// after it or when the browser has no room; the PV numbers never go back (G-13); the reading of the shared folder is given the state of this computer (S-3).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { demoState } from '../domain/templates';
import type { State } from '../domain/types';
import { LOCAL_KEY, release } from './local';
import { StoreProvider, useStore } from './StoreContext';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const folder = vi.hoisted(() => ({ on: false, load: vi.fn(async (_local?: unknown) => null as unknown), save: vi.fn(async () => true) }));
vi.mock('./folder', () => ({
  folderSupported: () => folder.on,
  FolderSession: class { dir = { name: 'donnees' }; contributors: string[] = []; hasDirection = true; constructor(public d: unknown, public author: string) {} load(l?: unknown) { return folder.load(l); } save() { return folder.save(); } readPhotoFile() { return Promise.resolve(null); } },
  rememberedFolder: async () => ({ name: 'donnees' }), hasPermission: async () => true, askPermission: async () => true, forgetFolder: async () => {}, initDataFolder: async () => {},
  isDataFolder: async () => true, pickFolder: async () => ({ name: 'donnees' }), rememberFolder: async () => {},
}));

const NOW = new Date(2026, 9, 6, 10, 0), ID = 'dl_demo_3', OTHER = 'dl_demo_4', ROOM = 5_000_000;
let ctx: ReturnType<typeof useStore>, mem: Map<string, string>, room: number, writes: number;
function Probe() { ctx = useStore(); return null; }
const used = () => [...mem].reduce((n, [k, v]) => n + k.length + v.length, 0);
const stored = (): State => JSON.parse(mem.get(LOCAL_KEY)!);
let unmount: () => Promise<void>;
async function open(seed: State | null = demoState(NOW)) {
  if (seed) mem.set(LOCAL_KEY, JSON.stringify(seed));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(<StoreProvider><Probe /></StoreProvider>); });
  unmount = async () => { await act(async () => { root.unmount(); }); host.remove(); };
  writes = 0;   // the reading of the opening is not a gesture
}
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const gesture = (qty: number, id = ID) => act(async () => { ctx.update(d => { d.deliveries[id].qty = qty; }); });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  mem = new Map(); room = ROOM; writes = 0; folder.on = false; folder.load.mockClear(); folder.save.mockClear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { if (used() - (mem.has(k) ? k.length + mem.get(k)!.length : 0) + k.length + v.length > room) throw new Error('QuotaExceededError'); if (k === LOCAL_KEY) writes++; mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
    get length() { return mem.size; },
    key: (i: number) => [...mem.keys()][i] ?? null,
  });
});
afterEach(async () => { await unmount?.(); release(); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ''; });

describe('a burst of gestures', () => {
  it('is on the screen at once and written once, 250 ms after the first', async () => {
    await open();
    await act(async () => { for (const q of [1, 2, 3]) ctx.update(d => { d.deliveries[ID].qty = q; }); });
    expect(ctx.state!.deliveries[ID].qty).toBe(3);                    // the screen: at once
    expect(writes).toBe(0);                                           // the browser: not yet
    await tick(249); expect(writes).toBe(0);
    await tick(2);
    expect(writes).toBe(1);                                           // one write for the three gestures
    expect(stored().deliveries[ID].qty).toBe(3);
    await tick(1000); expect(writes).toBe(1);                         // nothing more is written when nothing changed
  });
  it('shares what the gesture did not touch: the other orders are the same objects', async () => {
    await open();
    const before = ctx.state!;
    await gesture(9);
    expect(ctx.state!.deliveries[ID]).not.toBe(before.deliveries[ID]);
    expect(ctx.state!.deliveries[OTHER]).toBe(before.deliveries[OTHER]);
    expect(ctx.state!.logs).not.toBe(before.logs);
  });
  it('a gesture that changes nothing is neither drawn again nor written', async () => {
    await open();
    const before = ctx.state!;
    await act(async () => { ctx.update(d => { d.deliveries[ID].qty = d.deliveries[ID].qty; }); });
    expect(ctx.state).toBe(before);
    await tick(1000); expect(writes).toBe(0);
  });
});

describe('the page goes away right after a gesture', () => {
  it('pagehide: the gesture is in the browser, no timer needed', async () => {
    await open();
    await gesture(41);
    expect(writes).toBe(0);
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    expect(writes).toBe(1);
    expect(stored().deliveries[ID].qty).toBe(41);
  });
  it('the page hidden (a phone put away): the same', async () => {
    await open();
    await gesture(42);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(writes).toBe(0);                                           // shown: nothing to hurry
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(stored().deliveries[ID].qty).toBe(42);
  });
  it('flush() (before another tab opens, before a tool or a full screen closes) writes it too, and leaving the page of the address bar as well', async () => {
    await open();
    await gesture(43);
    await act(async () => { await ctx.flush(); });
    expect(stored().deliveries[ID].qty).toBe(43);
    await gesture(44);
    await act(async () => { window.dispatchEvent(new Event('hashchange')); });
    expect(stored().deliveries[ID].qty).toBe(44);
  });
  it('the store taken away writes what waits', async () => {
    await open();
    await gesture(45);
    await unmount();
    expect(stored().deliveries[ID].qty).toBe(45);
  });
});

describe('the browser has no room', () => {
  it('the gesture is never lost: said (storageFull), kept on the screen, written again as soon as there is room (next gesture, flush or page closing)', async () => {
    await open();
    room = used();                                                    // full: any bigger text is refused
    await gesture(51);
    await tick(300);
    expect(ctx.storageFull).toBe(true);                               // said
    expect(ctx.state!.deliveries[ID].qty).toBe(51);                   // not lost on the screen
    await gesture(52, OTHER);
    expect(ctx.state!.deliveries[ID].qty).toBe(51);
    expect(ctx.state!.deliveries[OTHER].qty).toBe(52);
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    expect(ctx.storageFull).toBe(true);                               // still no room: tried again at the closing, said again
    expect(stored().deliveries[ID].qty).not.toBe(51);
    room = ROOM;                                                      // room is made (a backup downloaded, a copy dropped)
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    expect(ctx.storageFull).toBe(false);
    expect([stored().deliveries[ID].qty, stored().deliveries[OTHER].qty]).toEqual([51, 52]);   // both gestures, kept at last
  });
  it('a refusal at the first write is tried again at the next gesture', async () => {
    await open();
    room = used();
    await gesture(53); await tick(300);
    expect(ctx.storageFull).toBe(true);
    room = ROOM;
    await gesture(54); await tick(300);
    expect(ctx.storageFull).toBe(false);
    expect(stored().deliveries[ID].qty).toBe(54);
  });
});

describe('another tab writes while this one holds a gesture it has not written yet', () => {
  it('both are kept: the gesture goes back over what the other tab wrote', async () => {
    await open();
    const other = demoState(NOW);
    await gesture(61, ID);
    other.deliveries[OTHER].qty = 62;                                 // what the other tab did, from the same data
    mem.set(LOCAL_KEY, JSON.stringify(other));
    await act(async () => { window.dispatchEvent(Object.assign(new Event('storage'), { key: LOCAL_KEY })); });
    expect([ctx.state!.deliveries[ID].qty, ctx.state!.deliveries[OTHER].qty]).toEqual([61, 62]);
    expect([stored().deliveries[ID].qty, stored().deliveries[OTHER].qty]).toEqual([61, 62]);   // and the browser holds both
  });
  it('nothing waiting: the other tab\'s data are taken as they are', async () => {
    await open();
    const other = demoState(NOW);
    other.deliveries[OTHER].qty = 63;
    mem.set(LOCAL_KEY, JSON.stringify(other));
    await act(async () => { window.dispatchEvent(Object.assign(new Event('storage'), { key: LOCAL_KEY })); });
    expect(ctx.state!.deliveries[OTHER].qty).toBe(63);
  });
});

describe('the PV numbers given never go back (G-13)', () => {
  const issued = (n: number) => { const s = demoState(NOW); s.params.reception = { ...s.params.reception, pvCounter: { '2026': n } } as never; return s; };
  it('restoring or loading the example over data whose counter is higher keeps the higher counter, and writes it at once', async () => {
    await open(issued(14));
    await act(async () => { ctx.replace(demoState(NOW)); });
    expect(ctx.state!.params.reception?.pvCounter?.['2026']).toBe(14);
    expect(stored().params.reception?.pvCounter?.['2026']).toBe(14);
  });
  it('"Repartir de zéro" then new data: the numbers given before are not given again', async () => {
    await open(issued(14));
    await act(async () => { ctx.replace(null); });
    expect(mem.has(LOCAL_KEY)).toBe(false);
    await act(async () => { ctx.replace(demoState(NOW)); });
    expect(ctx.state!.params.reception?.pvCounter?.['2026']).toBe(14);
    expect(mem.get('DELACOUR_PILOTAGE_PREF_pvCounter')).toBe('');     // taken: not kept in the browser any longer
  });
  it('the counter follows a PV given by a gesture', async () => {
    await open();
    await act(async () => { ctx.update(d => { const r = d.deliveries[ID].reception; d.deliveries[ID].reception = { ...r, pvNo: 'PV-2026-031' }; }); });
    expect(ctx.state!.params.reception?.pvCounter?.['2026']).toBe(31);
    await tick(300);
    expect(stored().params.reception?.pvCounter?.['2026']).toBe(31);
  });
});

describe('the shared folder', () => {
  it('the reading is given the state of this computer, so that what was done since the last synchronisation is put back over what the folder holds (S-3)', async () => {
    folder.on = true;
    mem.set('DELACOUR_PILOTAGE_PREF_author', 'Alice');
    await open();
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(folder.load).toHaveBeenCalled();
    expect(folder.load.mock.calls[0][0]).toBeTruthy();
    expect(folder.load.mock.calls[0][0]).toBe(ctx.state);
  });
});
