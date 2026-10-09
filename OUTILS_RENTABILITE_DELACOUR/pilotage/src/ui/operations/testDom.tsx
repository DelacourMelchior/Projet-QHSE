// Test support for the interface tests of tool 3.4 that PLAY a screen in a DOM (happy-dom: a DOM in Node, no layout, no browser). The test file starts with `// @vitest-environment happy-dom` and
// `vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore())` (a mock is lifted above the imports: it cannot name `fakeStore` itself). The store is a reactive
// stand-in of a few lines: what a screen writes is read back with `stateNow()`, `fake.writes` counts the writes of the company (one per `update`, as the real store writes its whole state each time).
// The gestures are the ones of a finger (click, typing, entering and leaving a field, a stroke on a signature pad); a clock that is stopped (`vi.useFakeTimers`) is moved by `tick`.
import { act, useSyncExternalStore, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { vi } from 'vitest';
import type { State } from '../../domain/types';
import { plain as plainText } from './testPlain';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export const fake = { state: null as State | null, subs: new Set<() => void>(), writes: 0, full: false, author: 'Test', teamView: false };
const sub = (f: () => void) => { fake.subs.add(f); return () => { fake.subs.delete(f); }; };
const snap = () => fake.state;
// like the real store: the change is made on a copy, then the whole state is given
const update = (fn: (s: State) => void) => { if (!fake.state) return; const next = structuredClone(fake.state); fn(next); fake.state = next; fake.writes++; fake.subs.forEach(f => f()); };
export const fakeStore = () => ({ useStore: () => ({ state: useSyncExternalStore(sub, snap), update, author: fake.author, storageFull: fake.full, teamView: fake.teamView }) });
// a change made by someone else while a screen is open (a check at the post, another tab)
export const write = (fn: (s: State) => void) => { const n = fake.writes; update(fn); fake.writes = n; };
export const seed = (s: State) => { fake.state = s; fake.writes = 0; fake.full = false; fake.teamView = false; };
export const stateNow = () => fake.state!;

// what a screen shows, in plain spaces (the texts carry the narrow no-break spaces of nb(): `plain`, testPlain.ts)
export const plain = (s: string | null | undefined) => plainText(s ?? '');
export const text = () => plain(document.body.textContent);
export const all = <T extends HTMLElement = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
export const field = (sel: string) => document.querySelector(sel) as HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement;
// a button by its visible text or by its name (aria-label): the first one that matches
export const button = (re: RegExp, within: ParentNode = document) => [...within.querySelectorAll<HTMLButtonElement>('button')].find(b => re.test(plain(b.textContent)) || re.test(plain(b.getAttribute('aria-label')))) as HTMLButtonElement;
// the window on top of the others, and what a finger can type in inside a part of the page (a field closed by itself or by its fieldset, or read only, is not one)
export const top = () => all('[role=dialog]').at(-1)!;
export const typable = (root: ParentNode = document) => [...root.querySelectorAll<HTMLInputElement>('input,textarea,select')]
  .filter(e => !e.disabled && !e.closest('fieldset[disabled]') && !e.readOnly && !['file', 'checkbox', 'radio', 'hidden', 'button'].includes(e.type));
// the person of a group of people (PeoplePick): the radio with that name
export const radio = (name: string, within: ParentNode = document) => [...within.querySelectorAll<HTMLButtonElement>('[role=radio]')].find(b => plain(b.textContent) === name) as HTMLButtonElement;

export const click = (el: Element) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
// a key typed in a field: the value is set the way a browser does (React reads it), then the event of the input
export const type = (el: HTMLElement, v: string) => act(async () => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, v);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
});
export const enter = (el: HTMLElement) => act(async () => { el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); });
export const leave = (el: HTMLElement) => act(async () => { el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
export const tick = (ms: number) => act(async () => { vi.advanceTimersByTime(ms); });

// A screen mounted in the body of the page; `unmount` takes it away (and what it drew in a portal with it); `cleanup` (afterEach) takes away what a failed test left
const roots = new Set<() => Promise<void>>();
export async function mount(el: ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const unmount = async () => { if (roots.delete(unmount)) await act(async () => { root.unmount(); host.remove(); }); };
  roots.add(unmount);
  await act(async () => { root.render(el); });
  return { unmount };
}
export const cleanup = async () => { for (const u of [...roots]) await u(); document.body.innerHTML = ''; window.sessionStorage.clear(); };

// happy-dom has no layout: the canvas of a signature pad is given a size (and no 2D context is drawn)
export function stubCanvas() {
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  proto.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 100, right: 300, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  proto.setPointerCapture = () => {};
  (HTMLElement.prototype as unknown as Record<string, unknown>).setPointerCapture = () => {};
}
// a stroke on the canvas of a signature pad (`label` is the name of the canvas): down, the moves, up. `sign`: a real signature (six points, long enough); `dot`: a touch that is not one
const stroke = (label: string, pts: [number, number][]) => act(async () => {
  const cv = all('canvas').find(c => c.getAttribute('aria-label') === label)!;
  const ev = (n: string, [x, y]: [number, number]) => cv.dispatchEvent(new PointerEvent(n, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
  ev('pointerdown', pts[0]); pts.slice(1).forEach(p => ev('pointermove', p)); ev('pointerup', pts.at(-1)!);
});
export const sign = (label: string, shift = 0) => stroke(label, [[20, 30], [60, 70], [100, 30], [140, 70], [180, 30], [220 + shift, 60]]);
export const dot = (label: string) => stroke(label, [[20, 30], [22, 31]]);
