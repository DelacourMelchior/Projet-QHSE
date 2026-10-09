// Small shared UI pieces. Visual rules: ../../app/DESIGN_OUTILS.md (11 px minimum, no emoji, drawn icons).
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, SlidersHorizontal, X } from 'lucide-react';
import type { Level } from '../domain/types';
import type { Insight } from '../domain/base';
import { useStore } from '../store/StoreContext';

export const LEVEL_STYLE: Record<Level, { dot: string; badge: string; hex: string }> = {
  ok: { dot: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', hex: '#059669' },
  warn: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-900 border-amber-200', hex: '#D97706' },
  alert: { dot: 'bg-red-600', badge: 'bg-red-50 text-red-800 border-red-200', hex: '#DC2626' },
  pending: { dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200', hex: '#94A3B8' },
};

export function StatusBadge({ level, text }: { level: Level; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLE[level].dot}`} />{text}
    </span>
  );
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnKind, string> = {
  primary: 'bg-delacour-primary text-white hover:bg-delacour-dark border-delacour-primary disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-600',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 disabled:opacity-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent disabled:opacity-50',
  danger: 'bg-white text-red-700 hover:bg-red-50 border-red-200 disabled:opacity-50',
};
export function Button({ kind = 'secondary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  return <button type="button" {...p}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${BTN[kind]} ${className}`} />;
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

// the border of a field is 3,5:1 on white (WCAG 1.4.11), the focus ring 4:1
export const inputCls = 'w-full rounded-lg border border-[#7b8aa3] bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-delacour-golddark focus:ring-2 focus:ring-delacour-golddark/40 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';

// A dialog or a full screen takes the focus, keeps the page behind it out of the tab order and of the screen reader (inert), and gives the focus back to what opened it
export function useDialogFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const back = document.activeElement as HTMLElement | null;
    const off: Element[] = [];
    for (let n: Element = el; n !== document.body && n.parentElement; n = n.parentElement)
      for (const s of n.parentElement.children) if (s !== n && !s.hasAttribute('inert') && s.tagName !== 'SCRIPT') { s.setAttribute('inert', ''); off.push(s); }
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
    return () => { off.forEach(s => s.removeAttribute('inert')); if (back?.isConnected) back.focus({ preventScroll: true }); };
  }, [ref]);
}

// Modal dialog (Escape or backdrop closes it); drawn in the body, so a draggable parent (a step row) never drags it along
export function Modal({ title, subtitle, onClose, children, footer, wide, xwide, full }: {
  title: ReactNode; subtitle?: ReactNode; onClose(): void; children: ReactNode; footer?: ReactNode; wide?: boolean; xwide?: boolean; full?: boolean;   // full: follows the screen, up to 1280 px
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useDialogFocus(ref);
  // with two sheets open (an action over a workshop), Escape closes the top one only
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && ref.current === [...document.querySelectorAll('[role=dialog]')].at(-1)) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl ${full ? 'sm:max-w-[min(94vw,1280px)]' : xwide ? 'sm:max-w-6xl' : wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={tid} className="text-sm font-bold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 max-sm:p-[13px] [@media(pointer:coarse)]:p-[13px]"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</section>;
}

// ---- building blocks of tools 2.1 to 5.4 (same look as the Plans B screens)

export const TONE = { good: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-950', bad: 'border-red-200 bg-red-50 text-red-900' };

// Key figure of a summary; tone colours the tile only when the figure calls for attention
export function Tile({ title, value, sub, tone, onClick, active, newTab }: { title: string; value: string; sub: string; tone?: 'ok' | 'warn' | 'alert'; onClick?(): void; active?: boolean; newTab?: boolean }) {
  const cls = tone === 'ok' ? 'border-emerald-200 bg-emerald-50/60' : tone === 'warn' ? 'border-amber-300 bg-amber-50/70' : tone === 'alert' ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white';
  const body = <>
    <div className="text-xs font-semibold text-slate-600">{title}{newTab && onClick && <> <NewTab size={11} /></>}</div>
    <div className="font-mono text-lg font-bold text-slate-900">{value}</div>
    <div className="text-xs text-slate-600">{sub}</div>
  </>;
  // a tile with an action is a button (it filters a list); without, a plain figure
  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={!!active} className={`rounded-lg border p-2.5 text-left hover:shadow-sm ${cls} ${active ? 'ring-2 ring-delacour-primary' : ''}`}>{body}</button>
    : <div className={`rounded-lg border p-2.5 ${cls}`}>{body}</div>;
}

// Summary card: question, 4 key figures, messages (the first 4, then "voir les autres")
export function Summary({ title, tiles, insights, max = 4, list = false, answer }: { title: string; tiles: ReactNode; insights: Insight[]; max?: number; list?: boolean; answer?: string }) {
  const [all, setAll] = useState(false);
  const MAX = max;
  const shown = all ? insights : insights.slice(0, MAX);
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <h2 className="text-sm font-bold text-delacour-primary">{title}</h2>
      {answer && <p className="!mt-1 text-xs font-semibold text-slate-800">{answer}</p>}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{tiles}</div>
      {insights.length > 0 && (list ? (
        // a quiet list: a dot for the weight of the message, the title, then the facts; nothing is coloured but the dot
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {shown.map(i => (
            <li key={i.key} className="flex items-start gap-2.5 py-2 text-xs text-slate-700">
              <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.tone === 'bad' ? 'bg-red-600' : i.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
              <span><span className="sr-only">{i.tone === 'bad' ? 'Important : ' : i.tone === 'warn' ? 'À noter : ' : 'Bon point : '}</span><strong className="font-semibold text-slate-900">{i.title}</strong> · {i.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {shown.map(i => <li key={i.key} className={`rounded-lg border px-3 py-2 text-xs ${TONE[i.tone]}`}><strong className="block text-xs">{i.title}</strong>{i.text}</li>)}
        </ul>
      ))}
      {insights.length > MAX && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="text-xs font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] print:hidden">
          {all ? 'Afficher moins de messages' : insights.length - MAX === 1 ? `Voir 1 ${MAX ? 'autre ' : ''}message` : `Voir les ${insights.length - MAX} ${MAX ? 'autres ' : ''}messages`}
        </button>
      )}
    </Card>
  );
}

// Filter pills with their count. As tabs with `panelId`: the tab panel carries that id, and the arrow keys, Home and End move from tab to tab.
export function Chips<T extends string>({ value, onChange, items, tabs, label, panelId }: { value: T; onChange(v: NoInfer<T>): void; items: [NoInfer<T>, string, number?][]; tabs?: boolean; label?: string; panelId?: string }) {
  const keys = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const i = items.findIndex(([k]) => k === value), to = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault(); onChange(items[to][0]);
    window.setTimeout(() => document.getElementById(`${panelId}-tab-${items[to][0]}`)?.focus(), 0);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 print:hidden" role={tabs ? 'tablist' : undefined} aria-label={tabs ? label : undefined}>
      {items.map(([k, l, n]) => (
        <button key={k} type="button" onClick={() => onChange(k)} {...(tabs ? { role: 'tab', 'aria-selected': value === k, ...(panelId ? { id: `${panelId}-tab-${k}`, 'aria-controls': panelId, tabIndex: value === k ? 0 : -1, onKeyDown: keys } : {}) } : { 'aria-pressed': value === k })}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold max-sm:min-h-[44px] max-sm:px-3 [@media(pointer:coarse)]:min-h-[44px] ${value === k ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {l}{n !== undefined && (tabs ? <span className={`ml-1.5 rounded-full px-1.5 text-[11px] font-bold ${value === k ? 'bg-white text-delacour-primary' : 'bg-amber-500 text-slate-900'}`}>{n}<span className="sr-only"> à compléter</span></span> : <span className="opacity-75"> {n}</span>)}
        </button>
      ))}
    </div>
  );
}

// The method of the tool (rule, 3 steps, tips), closed by default
export function Method({ rule, steps, tips = [] }: { rule: string; steps: [string, string][]; tips?: string[] }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white print:hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-3 py-2 text-xs font-semibold text-delacour-primary hover:bg-slate-50 sm:min-h-0 sm:px-4">
        <span className="group-open:hidden">Méthode en {steps.length} étapes</span><span className="hidden group-open:inline">Masquer la méthode</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3 sm:px-4">
        <p className="text-xs font-semibold text-slate-800">{rule}</p>
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map(([t, x], i) => (
            <li key={t} className="rounded-lg bg-slate-50 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-delacour-primary text-xs text-white">{i + 1}</span>{t}</div>
              <p className="mt-1 text-xs text-slate-600">{x}</p>
            </li>
          ))}
        </ol>
        {tips.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-600">{tips.map(t => <li key={t}>{t}</li>)}</ul>}
      </div>
    </details>
  );
}

// Settings that only one tool reads: closed by default, saved as typed (the general Réglages keep what several tools share)
export function ToolSettings({ title = 'Réglages de cet outil', children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white print:hidden">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-delacour-primary hover:bg-slate-50 sm:min-h-0 sm:px-4"><SlidersHorizontal size={13} />{title}</summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3 sm:px-4">
        {children}
        <p className="text-xs text-slate-500">Chaque champ est enregistré dès qu'il est modifié.</p>
      </div>
    </details>
  );
}

// Screen title with its buttons
export function ToolHeader({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-delacour-primary">{title}</h2>
        <p className="max-w-3xl text-xs text-slate-500">{text}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 print:hidden">{children}</div>}
    </div>
  );
}

// First screen of an empty tool
export function Empty({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-bold text-delacour-primary">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-600">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}

// French number input: "1 250,5" -> 1250.5; empty -> null. Keeps what is typed until the field is left.
export function NumInput({ value, onChange, className = '', ...p }: { value: number | null | undefined; onChange(v: number | null): void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const shown = value === null || value === undefined ? '' : String(value).replace('.', ',');
  const [text, setText] = useState(shown);
  const [focus, setFocus] = useState(false);
  const read = (t: string) => { const c = t.replace(/\s/g, '').replace(',', '.'); return c === '' ? null : Number.isFinite(Number(c)) ? Number(c) : undefined; };
  return <input inputMode="decimal" {...p} className={`${inputCls} font-mono ${className}`} value={focus ? text : shown}
    onFocus={() => { setText(shown); setFocus(true); }} onBlur={() => setFocus(false)}
    onChange={e => { setText(e.target.value); const v = read(e.target.value); if (v !== undefined) onChange(v); }} />;
}

export function YesNo({ value, onChange, labels = ['Oui', 'Non'], label }: { value: boolean | null; onChange(v: boolean | null): void; labels?: [string, string]; label: string }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[true, false].map(v => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(value === v ? null : v)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${value === v ? (v ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {labels[v ? 0 : 1]}
        </button>
      ))}
    </div>
  );
}

// Row of a register: title, details, owner/date column, status
export function Row({ onClick, lead, title, sub, right, badge }: { onClick(): void; lead?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; badge?: ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full min-w-0 items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50">
        {lead}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-xs font-semibold text-slate-900 sm:truncate">{title}</span>
          {sub && <span className="line-clamp-2 block text-xs text-slate-500 sm:truncate">{sub}</span>}
        </span>
        {right && <span className="hidden shrink-0 text-right text-xs text-slate-600 sm:block">{right}</span>}
        {badge && <span className="shrink-0">{badge}</span>}
      </button>
    </li>
  );
}

export const SubTitle = ({ children }: { children: ReactNode }) => <h3 className="text-xs font-bold text-slate-900">{children}</h3>;

// Delete button of a sheet: hidden in team view unless the settings allow the team to delete
export function DeleteButton({ onClick, className = '', children }: { onClick(): void; className?: string; children: ReactNode }) {
  const { teamView, state } = useStore();
  if (teamView && !state?.params.teamCanDelete) return null;
  return <Button kind="danger" onClick={onClick} className={className}>{children}</Button>;
}

// Goes inside a button or a link that opens another tool in a new browser tab, after its label: the icon for the eye, the words for a screen reader
export function NewTab({ size = 12 }: { size?: number }) {
  return <><ExternalLink size={size} aria-hidden className="inline shrink-0" /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></>;
}
