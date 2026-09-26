// Small shared UI pieces. Visual rules: ../../app/DESIGN_OUTILS.md (11 px minimum, no emoji, drawn icons).
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Level } from '../domain/types';
import type { Insight } from '../domain/base';

export const LEVEL_STYLE: Record<Level, { dot: string; badge: string; hex: string }> = {
  ok: { dot: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', hex: '#059669' },
  warn: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-900 border-amber-200', hex: '#D97706' },
  alert: { dot: 'bg-red-600', badge: 'bg-red-50 text-red-800 border-red-200', hex: '#DC2626' },
  pending: { dot: 'bg-slate-300', badge: 'bg-slate-50 text-slate-500 border-slate-200', hex: '#94A3B8' },
};

export function StatusBadge({ level, text }: { level: Level; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${LEVEL_STYLE[level].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLE[level].dot}`} />{text}
    </span>
  );
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnKind, string> = {
  primary: 'bg-delacour-primary text-white hover:bg-delacour-dark border-delacour-primary',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
  danger: 'bg-white text-red-700 hover:bg-red-50 border-red-200',
};
export function Button({ kind = 'secondary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  return <button type="button" {...p}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold disabled:opacity-50 ${BTN[kind]} ${className}`} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-delacour-gold focus:ring-2 focus:ring-delacour-gold/30';

// Modal dialog (Escape or backdrop closes it)
export function Modal({ title, subtitle, onClose, children, footer, wide, xwide }: {
  title: ReactNode; subtitle?: ReactNode; onClose(): void; children: ReactNode; footer?: ReactNode; wide?: boolean; xwide?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${xwide ? 'sm:max-w-6xl' : wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</section>;
}

// ---- building blocks of tools 2.1 to 5.4 (same look as the Plans B screens)

export const TONE = { good: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-950', bad: 'border-red-200 bg-red-50 text-red-900' };

// Key figure of a summary; tone colours the tile only when the figure calls for attention
export function Tile({ title, value, sub, tone }: { title: string; value: string; sub: string; tone?: 'ok' | 'warn' | 'alert' }) {
  const cls = tone === 'ok' ? 'border-emerald-200 bg-emerald-50/60' : tone === 'warn' ? 'border-amber-300 bg-amber-50/70' : tone === 'alert' ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-lg border p-2.5 ${cls}`}>
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="font-mono text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-600">{sub}</div>
    </div>
  );
}

// Summary card: question, 4 key figures, messages (the first 4, then "voir les autres")
export function Summary({ title, tiles, insights }: { title: string; tiles: ReactNode; insights: Insight[] }) {
  const [all, setAll] = useState(false);
  const MAX = 4;
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <h2 className="text-sm font-bold text-delacour-primary">{title}</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{tiles}</div>
      {insights.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {(all ? insights : insights.slice(0, MAX)).map(i => <li key={i.key} className={`rounded-lg border px-3 py-2 text-[11px] ${TONE[i.tone]}`}><strong className="block text-xs">{i.title}</strong>{i.text}</li>)}
        </ul>
      )}
      {insights.length > MAX && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="text-[11px] font-semibold text-delacour-primary hover:underline print:hidden">
          {all ? 'Afficher moins de messages' : insights.length - MAX === 1 ? 'Voir 1 autre message' : `Voir les ${insights.length - MAX} autres messages`}
        </button>
      )}
    </Card>
  );
}

// Filter pills with their count
export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange(v: NoInfer<T>): void; items: [NoInfer<T>, string, number?][] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 print:hidden">
      {items.map(([k, l, n]) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${value === k ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
          {l}{n !== undefined && <span className="opacity-75"> {n}</span>}
        </button>
      ))}
    </div>
  );
}

// The method of the tool (rule, 3 steps, tips), closed by default
export function Method({ rule, steps, tips = [] }: { rule: string; steps: [string, string][]; tips?: string[] }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white print:hidden">
      <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold text-delacour-primary hover:bg-slate-50 sm:px-4">
        <span className="group-open:hidden">Méthode en 3 étapes</span><span className="hidden group-open:inline">Masquer la méthode</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3 sm:px-4">
        <p className="text-xs font-semibold text-slate-800">{rule}</p>
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map(([t, x], i) => (
            <li key={t} className="rounded-lg bg-slate-50 p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-delacour-primary text-[11px] text-white">{i + 1}</span>{t}</div>
              <p className="mt-1 text-[11px] text-slate-600">{x}</p>
            </li>
          ))}
        </ol>
        {tips.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">{tips.map(t => <li key={t}>{t}</li>)}</ul>}
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
        <p className="max-w-3xl text-[11px] text-slate-500">{text}</p>
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
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${value === v ? (v ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
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
          {sub && <span className="block truncate text-[11px] text-slate-500">{sub}</span>}
        </span>
        {right && <span className="hidden shrink-0 text-right text-[11px] text-slate-600 sm:block">{right}</span>}
        {badge && <span className="shrink-0">{badge}</span>}
      </button>
    </li>
  );
}

export const SubTitle = ({ children }: { children: ReactNode }) => <h3 className="text-xs font-bold text-slate-900">{children}</h3>;
