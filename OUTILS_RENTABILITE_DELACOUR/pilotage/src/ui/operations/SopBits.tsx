// Small pieces shared by the screens of tool 3.2: version pill, completeness ring, avatars of the people allowed, critical point badge.
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import type { Sop } from '../../domain/types';
import { sopVersion, versionColor } from '../../domain/instructions';
import { toolUrl } from '../tools';
import { useStore } from '../../store/StoreContext';

// The version in the colour of its frame: the sheet posted is told apart from the old one at a glance
export function VersionPill({ sop, v = sop.version, className = '' }: { sop: Pick<Sop, 'version'>; v?: number; className?: string }) {
  const c = versionColor(v);
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-white ${className}`} style={{ backgroundColor: c.hex }} title={`Cadre ${c.name}`}>{sopVersion({ version: v })}</span>;
}

// Share of a sheet that is complete, as a ring. Nothing at 100 %: the good state is the absence of a gap to fill. The figure is never under 11 px, whatever the size.
export function Ring({ pct, size = 36 }: { pct: number; size?: number }) {
  if (pct >= 100) return null;
  const r = 15, c = 2 * Math.PI * r, tone = pct >= 60 ? '#D97706' : '#DC2626', fs = Math.max(10, 396 / size);
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" role="img" aria-label={`Fiche complète à ${pct} %`}>
      <circle cx="18" cy="18" r={r} fill="rgba(255,255,255,.92)" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * pct / 100} ${c}`} transform="rotate(-90 18 18)" />
      <text x="18" y={18 + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight="700" fill="#0f172a" fontFamily="ui-monospace, monospace">{pct}</text>
    </svg>
  );
}

const TINTS = ['bg-emerald-700', 'bg-sky-700', 'bg-violet-700', 'bg-amber-700', 'bg-rose-700', 'bg-teal-700'];
const initials = (n: string) => n.trim().split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
export function Avatars({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  return (
    <span className="flex items-center" aria-label={names.length ? `Habilités : ${names.join(', ')}` : 'Personne habilitée'}>
      {shown.map((n, i) => <span key={n} title={n} className={`-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white first:ml-0 ${TINTS[(n.length + i) % TINTS.length]}`}>{initials(n)}</span>)}
      {names.length > max && <span className="-ml-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 px-1 text-[11px] font-bold text-slate-700">+{names.length - max}</span>}
    </span>
  );
}

export function CriticalBadge({ kind, big = false }: { kind: NonNullable<Sop['steps'][number]['critical']>; big?: boolean }) {
  const safety = kind === 'safety';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${big ? 'px-3 py-1 text-sm' : 'px-1.5 py-0.5 text-[11px]'} ${safety ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
      {safety ? <ShieldAlert size={big ? 18 : 12} /> : <BadgeCheck size={big ? 18 : 12} />}{safety ? 'Sécurité' : 'Qualité'}
    </span>
  );
}

// Address that opens the sheet full screen at the workstation (the QR code of the printed sheet)
export const stationUrl = (id: string) => toolUrl('3.2', `station:${id}`);
export { isLocalAddress } from '../tools';   // this computer, the local network, a test name or a file: one definition

// Applies a change to one sheet and writes the author in its journal
export function useSopAct() {
  const { update, author } = useStore();
  return (id: string, f: (s: Sop, by: string) => Sop) => update(d => { if (d.sops[id]) d.sops[id] = f(d.sops[id], author || 'anonyme'); });
}
