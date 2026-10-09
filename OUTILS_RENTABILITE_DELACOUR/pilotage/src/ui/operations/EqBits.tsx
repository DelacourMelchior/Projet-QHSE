// Small pieces shared by the screens of tool 3.3: write moves, the "Retiré · Annuler" bar, the 12-period strip, the icon of the kind of equipment.
import { useCallback, useEffect, useId, useSyncExternalStore, type ReactNode } from 'react';
import { Building2, Cog, Laptop, Ruler, Truck, Wrench } from 'lucide-react';
import type { Equipment, EquipmentKind, PointResult, Spare } from '../../domain/types';
import { nowLocal } from '../../domain/base';
import { frDate } from '../../domain/periods';
import { countCabinet } from '../../domain/maintenanceSpares';
import { revertEquipment, revertSpare } from '../../domain/maintenanceMerge';
import { storagePct } from '../../store/local';
import { useStore } from '../../store/StoreContext';
import { toolUrl } from '../tools';

// A phone: under 640 px (the register opens as a list, the queue and the messages are folded: the equipment comes first)
export const onPhone = (): boolean => { try { return window.matchMedia('(max-width: 639px)').matches; } catch { return false; } };

// Address that opens the routine of a piece of equipment full screen (the QR code stuck on it)
export const eqStationUrl = (id: string) => toolUrl('3.3', `station:${id}`);
export { isLocalAddress } from './SopBits';

// A figure typed wrong (text, an object) shows as 0 instead of stopping the screen: it is drawn as a child of a tag
export const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

// A move of the life of one piece of equipment (a reading, an anomaly, a stop, a check done), written to the store at once, author in hand
export function useEqAct() {
  const { update, author } = useStore();
  return (id: string, f: (e: Equipment, by: string) => Equipment) => update(d => { const x = d.equipments[id]; if (x) d.equipments[id] = f(x, author || 'anonyme'); });
}
// Same for one spare part of the common cabinet (a part taken out, put back, ordered, received, counted)
export function useSpareAct() {
  const { update, author } = useStore();
  return (id: string, f: (s: Spare, by: string) => Spare) => update(d => { const x = d.spares[id]; if (x) d.spares[id] = f(x, author || 'anonyme'); });
}

// A move of the life with its "Annuler": the record before and after the move are kept, and the undo removes only what the move did, on the record as it is
// then (a routine, a report or a stock move made meanwhile, here or on another device, stays). Returns both, so that the caller can read what changed.
// `onUndo` runs after the undo (to bring a screen back where it was).
type Offer = (what: string, back: () => void) => void;
export function useEqMove(offer: Offer) {
  const { update, author } = useStore();
  return (id: string, what: string, f: (e: Equipment, by: string) => Equipment, onUndo?: () => void): { before: Equipment; after: Equipment } | undefined => {
    const was: { v?: { before: Equipment; after: Equipment } } = {};
    update(d => { const x = d.equipments[id]; if (x) { was.v = { before: x, after: f(x, author || 'anonyme') }; d.equipments[id] = was.v.after; } });
    const m = was.v;
    if (m) offer(what, () => { update(d => { if (d.equipments[id]) d.equipments[id] = revertEquipment(d.equipments[id], m.before, m.after); }); onUndo?.(); });
    return m;
  };
}
// Same for one part of the cabinet: the stock goes back by the inverse of the move (never to an absolute value)
export function useSpareMove(offer: Offer) {
  const { update, author } = useStore();
  return (id: string, what: string, f: (s: Spare, by: string) => Spare) => {
    const was: { v?: { before: Spare; after: Spare } } = {};
    update(d => { const x = d.spares[id]; if (x) { was.v = { before: x, after: f(x, author || 'anonyme') }; d.spares[id] = was.v.after; } });
    const m = was.v;
    if (m) offer(what, () => update(d => { if (d.spares[id]) d.spares[id] = revertSpare(d.spares[id], m.before, m.after); }));
  };
}
// "Armoire comptée : N pièces, rien à signaler": the date and the person on every part; "Annuler" puts back the previous count of each part, and only that
export function useCountCabinet(offer: Offer) {
  const { update, author } = useStore();
  return () => {
    const moves: { id: string; before: Spare; after: Spare }[] = [];
    update(d => Object.entries(countCabinet(d, author || 'anonyme', nowLocal())).forEach(([id, after]) => { const before = d.spares[id]; if (before) { moves.push({ id, before, after }); d.spares[id] = after; } }));
    offer(`Armoire comptée : ${moves.length} pièce${moves.length > 1 ? 's' : ''}, rien à signaler`, () => update(d => moves.forEach(m => { if (d.spares[m.id]) d.spares[m.id] = revertSpare(d.spares[m.id], m.before, m.after); })));
  };
}
// The tabs of the sheet receive `set` typed for a plain patch; the sheet's own `set` also takes a function of the copy being typed (a photo that comes back
// a few seconds later must not put back the list as it was when the button was touched). `life` is a move of the life that goes with the typed change (removing
// a check takes its history with it): both are undone together by the one "Annuler".
export type EqSet = (x: Partial<Equipment> | ((prev: Equipment) => Partial<Equipment>), life?: (e: Equipment, by: string) => Equipment) => void;

// "Retiré · Annuler" for 8 seconds: anything removed or done by mistake can be brought back. Draw `bar` once in each screen, call `offer` after the move.
// ONE bar at a time for the whole tool (the page, a window and a tab each have their `useUndo`, and their bars used to pile up at the same place, the oldest on
// top): only the instance that received the last `offer` draws it, and a new offer replaces the previous one, so the undo of the latest move is always there.
// When the browser refuses to write (full), the bar says so instead of confirming a move that is not kept.
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

// What the browser says about its room, drawn inside the screens that cover the banner of the page (the routine at the machine, the windows): "Non enregistré"
// when it refuses to write, and with `near` the warning from 80 % (the routine; the windows only repeat the refusal). Nothing when all is well.
export function StorageNote({ near = false, className = '' }: { near?: boolean; className?: string }) {
  const { storageFull, storageNear, storageChars } = useStore();
  if (storageFull) return <p role="alert" className={`rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 ${className}`}>Non enregistré : le navigateur est plein. Ce qui est fait ici ne sera pas gardé après la fermeture de la page. Faire une sauvegarde (Réglages, onglet Données).</p>;
  if (near && storageNear) return <p role="status" className={`rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ${className}`}>Le navigateur est plein à {storagePct(storageChars)} % : faire une sauvegarde (Réglages, onglet Données).</p>;
  return null;
}

const KIND_ICON: Record<EquipmentKind, typeof Cog> = { machine: Cog, vehicle: Truck, installation: Building2, it: Laptop, instrument: Ruler, other: Wrench };
export function KindIcon({ kind = 'machine', size = 16, className = '' }: { kind?: EquipmentKind; size?: number; className?: string }) {
  const I = KIND_ICON[kind] || Wrench;
  return <I size={size} className={className} aria-hidden />;
}

// The last periods of the routine, oldest first: one square each, colour and symbol (the state is also written in the label of each square)
const STRIP: Record<PointResult | 'none', { cls: string; sym: string; label: string }> = {
  ok: { cls: 'bg-emerald-700 text-white', sym: '✓', label: 'tout en ordre' },
  watch: { cls: 'bg-amber-700 text-white', sym: '!', label: 'à surveiller' },
  ko: { cls: 'bg-red-700 text-white', sym: '✕', label: 'anomalie' },
  none: { cls: 'bg-slate-200 text-slate-600', sym: '–', label: 'pas de routine' },
};
export function Strip({ items }: { items: { from: string; to: string; state: PointResult | 'none' }[] }) {
  return (
    <ul className="flex flex-wrap gap-0.5" aria-label="Les dernières routines, de la plus ancienne à la plus récente">
      {items.map(i => {
        const t = STRIP[i.state];
        return <li key={i.from} title={`Du ${frDate(i.from)} au ${frDate(i.to)} : ${t.label}`} aria-label={`Du ${frDate(i.from)} au ${frDate(i.to)} : ${t.label}`} className={`flex h-4 w-4 items-center justify-center rounded-sm text-[11px] font-bold leading-none ${t.cls}`}><span aria-hidden>{t.sym}</span></li>;
      })}
    </ul>
  );
}
