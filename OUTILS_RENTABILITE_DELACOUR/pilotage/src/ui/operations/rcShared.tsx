// The small pieces that the screens of tool 3.4 share, kept here and nowhere else: the touch target, the big button of the field screens, the bar "Annuler", the text field that writes a moment
// after the last key (and its number twin), the choice in a list that ends with "Autre, précisez", the bounds of a milestone in words, the local address. The screens of 3.3 and 3.2 (written
// by another session) used to hold them: 3.4 no longer imports a file of those two tools, so that the rewrite of one never breaks the other.
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react';
import { OTHER } from '../../domain/receptions';
import { norm } from '../../domain/text';
import { useStore } from '../../store/StoreContext';
import { inputCls } from '../common';

// A target of 44 px on a touch screen (a phone, a tablet)
export const TOUCH = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
// A big button of the field screens, usable with gloves (64 px). Closed: full opacity, grey fill, 6:1 (never a faded button, 1.77:1); a button pressed (the answer given) keeps its colour
const OFF = 'disabled:!opacity-100 [&:disabled:not([aria-pressed=true])]:border-slate-300 [&:disabled:not([aria-pressed=true])]:bg-slate-200 [&:disabled:not([aria-pressed=true])]:text-slate-600';
export const BIG = `inline-flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 px-5 text-lg font-bold max-sm:px-3 ${OFF}`;
// The address of the page is the one of this computer, of the local network or of a test: a QR code printed from it stops serving the day the application is hosted (one definition, in tools.ts)
export { isLocalAddress } from '../tools';

// The bounds of a milestone in words: "entre 5,5 et 7 bar", "au plus 90 °C" (the numbers in the French way; the printed sheet says "1001", the screens "1 001": `plain`)
export function boundsText(m: { min?: number | null; max?: number | null; unit?: string }, plain = false): string {
  const u = m.unit ? ` ${m.unit}` : '', fr = (n: number) => (plain ? String(n).replace('.', ',') : n.toLocaleString('fr-FR'));
  return m.min != null && m.max != null ? `entre ${fr(m.min)} et ${fr(m.max)}${u}` : m.min != null ? `au moins ${fr(m.min)}${u}` : m.max != null ? `au plus ${fr(m.max)}${u}` : '';
}

// "Retiré · Annuler" for 8 seconds: anything removed or done by mistake can be brought back. Draw `bar` once in each screen, call `offer` after the move.
// ONE bar at a time for the whole tool (the page, a window and a tab each have their `useUndo`): only the instance that received the last `offer` draws it, and a new offer replaces the previous one,
// so the undo of the latest move is always there. When the browser refuses to write (full), the bar says so instead of confirming a move that is not kept.
interface Offered { owner: string; what: string; back(): void }
let current: Offered | null = null, timer = 0;
const listeners = new Set<() => void>();
const show = (o: Offered | null) => {
  current = o;
  window.clearTimeout(timer);
  if (o) timer = window.setTimeout(() => show(null), 8000);
  listeners.forEach(f => f());
};
const watch = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const latest = () => current;
export function useUndo(): { bar: ReactNode; offer(what: string, back: () => void): void } {
  const { storageFull } = useStore();
  const me = useId();
  const u = useSyncExternalStore(watch, latest, latest);
  const offer = useCallback((what: string, back: () => void) => show({ owner: me, what, back }), [me]);
  useEffect(() => () => { if (current?.owner === me) show(null); }, [me]);   // a screen that closes takes its bar with it
  const bar = u && u.owner === me && (
    <div role={storageFull ? 'alert' : 'status'} className={`fixed bottom-4 left-1/2 z-[70] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-lg ${storageFull ? 'bg-red-800' : 'bg-slate-800'}`}>
      <span className="min-w-0 truncate">{storageFull ? 'Non enregistré : le navigateur est plein' : u.what}</span>
      <button type="button" className="shrink-0 rounded bg-white/15 px-3 py-1.5 hover:bg-white/25 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]" onClick={() => { show(null); u.back(); }}>Annuler</button>
    </div>
  );
  return { bar, offer };
}

// What a field that keeps its text keeps apart: the text typed and not written yet. It is written 1,2 s after the last key, when the field is left, when the page goes to the background or is left,
// and when the field goes away: nothing typed is lost and the store is not rewritten at every key. While nothing is typed and not written, a new `value` (a move taken back, another row) is shown.
const kept = new Set<() => void>();   // the fields mounted: `flushTyped` writes what each holds
export const flushTyped = () => kept.forEach(f => f());   // a screen that leaves a step calls it first: what the fields hold goes to the store with the move of the step (see `act.soon`), not one write per field later
function useKept(value: string, save: (v: string) => void, onType?: (v: string) => void, adopt = true) {
  const [v, setV] = useState(value), cur = useRef(value), sent = useRef(value), timer = useRef(0), out = useRef(save);
  out.current = save;
  const flush = () => { window.clearTimeout(timer.current); if (cur.current !== sent.current) { sent.current = cur.current; out.current(cur.current); } };
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hide); kept.add(flush);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); kept.delete(flush); flush(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (adopt && cur.current === sent.current && value !== cur.current) { cur.current = sent.current = value; setV(value); } }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const type = (t: string) => { setV(t); cur.current = t; onType?.(t); window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 1200); };
  const reset = (t: string) => { window.clearTimeout(timer.current); cur.current = sent.current = t; setV(t); };   // the field starts again from what is kept (what was typed and not written is written first: `flush`)
  return { v, type, flush, reset };
}

// A text field of a form: `onSave` follows the text a moment after the last key (see `useKept`), `onType` follows every key (to enable a button at once), `onLeave` the leaving of the field after its write
export function Typed({ value, onSave, onType, onLeave, area = false, rows = 3, className = inputCls, ...p }: {
  value: string; onSave(v: string): void; onType?(v: string): void; onLeave?(v: string): void; area?: boolean; rows?: number; className?: string; id?: string; list?: string;
  inputMode?: 'decimal' | 'email' | 'text'; disabled?: boolean; placeholder?: string; autoComplete?: string; 'aria-label'?: string;
}) {
  const { v, type, flush } = useKept(value, onSave, onType), common = { ...p, value: v, className, onBlur: () => { flush(); onLeave?.(v); }, onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => type(e.target.value) };
  return area ? <textarea {...common} rows={rows} /> : <input {...common} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />;
}

// A number field of the settings, in the French way ("1 250,5" is 1250.5, empty is nothing): what is typed is kept as typed, and the number is written like a `Typed` text. A text that is not a number writes nothing.
const readNum = (t: string): number | null | undefined => { const c = t.replace(/\s/g, '').replace(',', '.'); return c === '' ? null : Number.isFinite(Number(c)) ? Number(c) : undefined; };
export function TypedNum({ value, onChange, className = '', ...p }: { value: number | null | undefined; onChange(v: number | null): void; className?: string; placeholder?: string; disabled?: boolean; 'aria-label'?: string }) {
  const shown = value === null || value === undefined ? '' : String(value).replace('.', ',');
  const [focus, setFocus] = useState(false), { v, type, flush, reset } = useKept(shown, t => { const n = readNum(t); if (n !== undefined) onChange(n); }, undefined, false);
  return <input inputMode="decimal" {...p} className={`${inputCls} font-mono ${className}`} value={focus ? v : shown} onFocus={() => { reset(shown); setFocus(true); }} onBlur={() => { flush(); setFocus(false); }} onChange={e => type(e.target.value)} />;
}

// A choice in a list that ends with "Autre": chips (field screens) or a select (sheets). "Autre" opens a field to specify; the value is the typed text ("Autre" while nothing is typed)
export function Choose({ list, value, onChange, label, chips = false }: { list: string[]; value: string; onChange(v: string): void; label: string; chips?: boolean }) {
  const known = list.filter(x => norm(x) !== norm(OTHER));
  const [other, setOther] = useState(() => !!value && !known.includes(value));
  const pickOther = () => { setOther(true); if (!value || known.includes(value)) onChange(OTHER); };
  const field = (
    <input className={chips ? 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-golddark' : inputCls} value={value === OTHER ? '' : value} placeholder="Autre : précisez" aria-label={`${label} : précisez`}
      onChange={e => onChange(e.target.value.trim() ? e.target.value : OTHER)} />
  );
  if (!chips) {
    return (
      <div className="space-y-1.5">
        <select className={inputCls} value={other ? OTHER : value} aria-label={label} onChange={e => { if (e.target.value === OTHER) pickOther(); else { setOther(false); onChange(e.target.value); } }}>
          <option value="">Choisir…</option>
          {known.map(x => <option key={x} value={x}>{x}</option>)}
          <option value={OTHER}>Autre, précisez</option>
        </select>
        {other && field}
      </div>
    );
  }
  const chip = (on: boolean) => `min-h-[48px] rounded-full border-2 px-4 text-base font-semibold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {known.map(x => <button key={x} type="button" role="radio" aria-checked={!other && value === x} className={chip(!other && value === x)} onClick={() => { setOther(false); onChange(value === x ? '' : x); }}>{x}</button>)}
        <button type="button" role="radio" aria-checked={other} className={chip(other)} onClick={() => (other ? (setOther(false), onChange('')) : pickOther())}>Autre, précisez</button>
      </div>
      {other && field}
    </div>
  );
}
