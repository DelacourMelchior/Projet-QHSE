// Browser storage: data that cannot be read are kept apart and told, never overwritten silently; the size written is known.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../domain/templates';
import { clearLocal, copies, copyFile, copyText, dropCopy, loadLocal, LOCAL_KEY, LOCAL_LIMIT, localSize, release, saveLocal, stateOfFile, storagePct, uncopied, unreadable, unreadableText } from './local';
import { isState, normalize } from '../domain/migrate';
import { toolBadge } from '../domain/status';
import { allTasks } from '../domain/tasks';

let store: Map<string, string>;
const stub = (limit = Infinity) => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { if (v.length > limit) throw new Error('QuotaExceededError'); store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
};
beforeEach(() => stub());
afterEach(() => { vi.unstubAllGlobals(); release(); });

describe('browser data that cannot be read', () => {
  it('keeps the text under another key, says so, and gives the text back', () => {
    store.set(LOCAL_KEY, '{"settings": {"companyName": "Atelier", ');   // cut short
    expect(loadLocal()).toBeNull();
    const key = unreadable()!;
    expect(key).toMatch(/^DELACOUR_PILOTAGE_V2\.corrupt-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(store.get(key)).toBe('{"settings": {"companyName": "Atelier", ');
    expect(unreadableText()).toBe('{"settings": {"companyName": "Atelier", ');
    expect(store.has(LOCAL_KEY)).toBe(false);                            // moved to its copy, not doubled
    expect(uncopied()).toBe(false);
  });
  it('does not copy the same text again at the next opening', () => {
    store.set(LOCAL_KEY, 'not json');
    loadLocal(); loadLocal();
    expect([...store.keys()].filter(k => k.includes('corrupt'))).toHaveLength(1);
  });
  it('a text that is valid but is not data is unreadable too', () => {
    store.set(LOCAL_KEY, 'null');
    expect(loadLocal()).toBeNull();
    expect(unreadable()).not.toBeNull();
  });
  it('keeps the text in memory when the browser has no room for a copy, and where it is: no copy, the text stays under its key', () => {
    stub(10);
    store.set(LOCAL_KEY, 'this is not json at all');
    expect(loadLocal()).toBeNull();
    expect([...store.keys()].filter(k => k.includes('corrupt'))).toHaveLength(0);
    expect(unreadableText()).toBe('this is not json at all');
    expect(store.get(LOCAL_KEY)).toBe('this is not json at all');
    expect([unreadable(), uncopied()]).toEqual([null, true]);
  });
  it('readable data, or none: nothing to say', () => {
    expect(loadLocal()).toBeNull();
    expect(unreadable()).toBeNull();
    saveLocal(demoState());
    expect(loadLocal()).not.toBeNull();
    expect(unreadable()).toBeNull();
  });
});

describe('the size written', () => {
  it('is the length of the text written, 0 when the browser refuses', () => {
    const n = saveLocal(demoState());
    expect(n).toBe(store.get(LOCAL_KEY)!.length);
    stub(1000);
    expect(saveLocal(demoState())).toBe(0);
  });
});

// Valid text that is not a state used to give a blank page (nothing in the application sits above the screens to say so): it is unreadable like a text cut short
describe('data that are valid text but have no state shape', () => {
  const good = () => JSON.parse(JSON.stringify(demoState()));
  const bad: [string, (s: Record<string, unknown>) => unknown][] = [
    ['an empty object', () => ({})], ['a list', () => []], ['a number', () => 123], ['null', () => null],
    ['a null timeline', s => ({ ...s, timeline: null })], ['a timeline without end', s => ({ ...s, timeline: { start: '2026-01' } })], ['an empty timeline', s => ({ ...s, timeline: {} })],
    ['null settings', s => ({ ...s, settings: null })], ['processes that are not a list', s => ({ ...s, processes: {} })], ['kpis that are a list', s => ({ ...s, kpis: [] })], ['no kpis', s => { const { kpis: _, ...r } = s; return r; }],
  ];
  it.each(bad)('%s: no state, a copy is kept, the banner has its key', (_, make) => {
    const text = JSON.stringify(make(good()));
    store.set(LOCAL_KEY, text);
    expect(loadLocal()).toBeNull();
    expect(unreadable()).toMatch(/\.corrupt-/);
    expect(store.get(unreadable()!)).toBe(text);
  });
  it('a state of the application is read', () => {
    store.set(LOCAL_KEY, JSON.stringify(good()));
    expect(loadLocal()).not.toBeNull();
    expect(unreadable()).toBeNull();
  });
  it('isState holds for the example and for a new data set, not for the shapes above', () => {
    expect(isState(good())).toBe(true);
    bad.forEach(([, make]) => expect(isState(make(good()))).toBe(false));
  });
});

// The downloaded copy goes back by "Restaurer une sauvegarde": wrapped as a backup when it is valid text, restored through the tolerant normalisation
describe('the copy that is kept can be put back', () => {
  const cases: [string, unknown][] = [
    ['an empty object', {}], ['a null timeline', { settings: { companyName: 'Atelier' }, timeline: null, processes: [], kpis: {}, values: {}, actions: {} }],
    ['null settings', { settings: null, timeline: { start: '2026-01', end: '2026-06' }, processes: [{ id: 'P1', name: 'P1', order: 0 }], kpis: {} }],
    ['a timeline without end', { ...JSON.parse(JSON.stringify(demoState())), timeline: { start: '2026-01' } }],
  ];
  it.each(cases)('%s: download, restore, the state is usable', (_, data) => {
    store.set(LOCAL_KEY, JSON.stringify(data));
    expect(loadLocal()).toBeNull();
    const file = unreadableText()!;
    expect(JSON.parse(file)).toMatchObject({ app: 'delacour-pilotage', version: 2 });
    const next = stateOfFile(JSON.parse(file));
    expect(next).not.toBeNull();
    const back = normalize(next!);                         // what "replace" does
    expect(isState(back)).toBe(true);
    expect(() => { allTasks(back); toolBadge(back, '3.3', '2026-10'); toolBadge(back, '1.1', '2026-10'); }).not.toThrow();
    store.set(LOCAL_KEY, JSON.stringify(back));            // and it is kept: the next opening reads it
    expect(loadLocal()).not.toBeNull();
  });
  it('keeps the settings that were there', () => {
    store.set(LOCAL_KEY, JSON.stringify({ settings: { companyName: 'Atelier' }, timeline: null, processes: [], kpis: {} }));
    loadLocal();
    expect(normalize(stateOfFile(JSON.parse(unreadableText()!))!).settings.companyName).toBe('Atelier');
  });
  it('the import takes a backup, the bare state, a backup of the previous version, and nothing else', () => {
    const s = demoState();
    expect(stateOfFile({ app: 'delacour-pilotage', version: 2, state: s })).toBe(s);
    expect(stateOfFile(JSON.parse(JSON.stringify(s)))!.settings).toEqual(s.settings);
    expect(stateOfFile({ tool_1_1: { processes: [] } })).not.toBeNull();
    for (const x of [null, 5, 'x', [], {}, { app: 'delacour-pilotage' }, { app: 'delacour-pilotage', state: 3 }, { settings: {} }]) expect(stateOfFile(x), JSON.stringify(x)).toBeNull();
  });
  it('a text that is not valid stays as it is (nothing to restore, but nothing lost)', () => {
    expect(copyFile('{"settings": {"co')).toBe('{"settings": {"co');
    store.set(LOCAL_KEY, '{"settings": {"co');
    loadLocal();
    expect(unreadableText()).toBe('{"settings": {"co');
  });
});

// The copy is counted in the gauge, listed with its date, and removed by "Repartir de zéro" or by its own button
describe('copies of unreadable data', () => {
  const make = (day: string, text: string) => { store.set(`${LOCAL_KEY}.corrupt-2026-${day}`, text); };
  it('are listed newest first with their day, and counted in the size', () => {
    saveLocal(demoState());
    const main = store.get(LOCAL_KEY)!.length;
    make('09-30-0815', 'x'.repeat(100)); make('10-06-1840', 'y'.repeat(250));
    expect(copies()).toEqual([{ key: `${LOCAL_KEY}.corrupt-2026-10-06-1840`, on: '06/10', chars: 250 }, { key: `${LOCAL_KEY}.corrupt-2026-09-30-0815`, on: '30/09', chars: 100 }]);
    expect(localSize()).toBe(main + 350);
  });
  it('are measured again once one is deleted, and only a copy can be deleted', () => {
    saveLocal(demoState());
    const main = store.get(LOCAL_KEY)!.length;
    make('10-06-1840', 'y'.repeat(250));
    expect(localSize()).toBe(main + 250);
    dropCopy(LOCAL_KEY);                                     // the data themselves are not a copy
    expect(store.has(LOCAL_KEY)).toBe(true);
    dropCopy(`${LOCAL_KEY}.corrupt-2026-10-06-1840`);
    expect(copies()).toEqual([]);
    expect(localSize()).toBe(main);
  });
  it('the copy of the opening is deleted with its banner, and gives its text before', () => {
    store.set(LOCAL_KEY, '{"cut');
    loadLocal();
    const key = unreadable()!;
    expect(copyText(key)).toBe('{"cut');
    dropCopy(key);
    expect(unreadable()).toBeNull();
    expect(store.has(key)).toBe(false);
  });
  it('"Repartir de zéro" removes the data and every copy', () => {
    saveLocal(demoState()); make('10-06-1840', 'y'); make('09-30-0815', 'z');
    store.set('DELACOUR_PILOTAGE_PREF_author', 'Alice');
    clearLocal();
    expect([...store.keys()]).toEqual(['DELACOUR_PILOTAGE_PREF_author']);
    expect(unreadable()).toBeNull();
  });
  it('the share of the room used never reads past 100 %', () => {
    expect(storagePct(LOCAL_LIMIT * 1.05)).toBe(100);
    expect(storagePct(4_050_000)).toBe(81);
    expect(storagePct(0)).toBe(0);
  });
});

// "Une copie est gardée" must be true (audit N-02): the text leaves its own key only once a copy that reads back exists; a browser that cannot hold two copies keeps the
// text where it is, and nothing is written over it until the person has downloaded it or chosen to lose it
describe('a copy that is kept for sure', () => {
  const COPY = /^DELACOUR_PILOTAGE_V2\.corrupt-/;
  // a browser that holds about 5 million characters in all (keys and values), as the real ones do
  const room = (total = 5_000_000) => {
    store = new Map();
    const used = () => [...store].reduce((n, [k, v]) => n + k.length + v.length, 0);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { if (used() - (store.has(k) ? k.length + store.get(k)!.length : 0) + k.length + v.length > total) throw new Error('QuotaExceededError'); store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      get length() { return store.size; },
      key: (i: number) => [...store.keys()][i] ?? null,
    });
  };
  const cut = (n: number) => `{"settings": {"companyName": "Atelier"}, "ballast": "${'x'.repeat(n - 60)}`;   // a text cut short, n characters long
  const copyKeys = () => [...store.keys()].filter(k => COPY.test(k));

  it('2.1 million characters: the copy is written and read back, the text leaves its key, the room is free again', () => {
    room();
    const text = cut(2_100_000);
    store.set(LOCAL_KEY, text);
    expect(loadLocal()).toBeNull();
    expect(copyKeys()).toEqual([unreadable()]);
    expect(store.get(unreadable()!)).toBe(text);
    expect(store.has(LOCAL_KEY)).toBe(false);
    expect(uncopied()).toBe(false);
    expect(localSize()).toBe(text.length);                    // counted once
    expect(saveLocal(demoState())).toBeGreaterThan(0);        // the person starts again: it is kept, the copy too
    expect(store.get(unreadable()!)).toBe(text);
  });
  it('3.1 million characters: no room for a copy; the text stays under its key, is said, and nothing is written over it', () => {
    room();
    const text = cut(3_100_000);
    store.set(LOCAL_KEY, text);
    expect(loadLocal()).toBeNull();
    expect(copyKeys()).toEqual([]);
    expect(store.get(LOCAL_KEY)).toBe(text);
    expect([unreadable(), uncopied()]).toEqual([null, true]);
    expect(unreadableText()).toBe(text);                      // what the banner downloads
    expect(saveLocal(demoState())).toBe(0);                   // "Voir un exemple", a typing…: not written
    expect(store.get(LOCAL_KEY)).toBe(text);
    expect(loadLocal()).toBeNull();                           // the next opening finds the same
    expect(store.get(LOCAL_KEY)).toBe(text);
    expect(uncopied()).toBe(true);
  });
  it('once the text is downloaded (release) the person can write again; "Repartir de zéro" is the other way out', () => {
    room();
    const text = cut(3_100_000);
    store.set(LOCAL_KEY, text);
    loadLocal();
    release();
    expect(uncopied()).toBe(false);
    expect(saveLocal(demoState())).toBeGreaterThan(0);
    expect(store.get(LOCAL_KEY)).not.toBe(text);
    store.set(LOCAL_KEY, text);
    loadLocal();
    expect(uncopied()).toBe(true);
    clearLocal();
    expect(uncopied()).toBe(false);
    expect(store.has(LOCAL_KEY)).toBe(false);
  });
  it('a browser that accepts the copy and does not give it back: the text is not taken off its key, the bad copy is not kept', () => {
    stub();
    const set = localStorage.setItem.bind(localStorage);
    vi.stubGlobal('localStorage', { ...localStorage, getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => set(k, COPY.test(k) ? v.slice(0, 5) : v), removeItem: (k: string) => { store.delete(k); }, get length() { return store.size; }, key: (i: number) => [...store.keys()][i] ?? null });
    store.set(LOCAL_KEY, 'not json, and long enough');
    expect(loadLocal()).toBeNull();
    expect(store.get(LOCAL_KEY)).toBe('not json, and long enough');
    expect(copyKeys()).toEqual([]);
    expect(uncopied()).toBe(true);
  });
  it('the next opening, once the text was moved, still says that a copy is kept (no data, a copy): without copying again', () => {
    stub();
    store.set(LOCAL_KEY, '{"cut');
    loadLocal();
    const key = unreadable()!;
    expect(loadLocal()).toBeNull();
    expect([unreadable(), copyKeys(), uncopied()]).toEqual([key, [key], false]);
    expect(unreadableText()).toBe('{"cut');
    dropCopy(key);                                            // the person deleted it: nothing to say any more
    expect(loadLocal()).toBeNull();
    expect(unreadable()).toBeNull();
  });
  it('the same text already copied (an earlier opening): the text under the key of the data is moved too', () => {
    stub();
    store.set(`${LOCAL_KEY}.corrupt-2026-10-06-1840`, '{"cut');
    store.set(LOCAL_KEY, '{"cut');
    loadLocal();
    expect(store.has(LOCAL_KEY)).toBe(false);
    expect(copyKeys()).toEqual([`${LOCAL_KEY}.corrupt-2026-10-06-1840`]);
  });
});
