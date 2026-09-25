// Small shared UI pieces. Visual rules: ../../app/DESIGN_OUTILS.md (11 px minimum, no emoji, drawn icons).
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Level } from '../domain/types';

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
