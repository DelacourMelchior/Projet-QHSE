// Tool 3.4, the checks of an order full screen at the workshop or on site (phone or tablet, QR code of the order sheet): who checks, then one milestone at a time
// with two big buttons Conforme / Non conforme fixed at the bottom (never pushed out of sight by a photo or a remark), then the end (release, fixed at the bottom too). Every answer is written to the store at once by the moves of receptions.ts, so a locked
// phone or a back gesture loses nothing; only a value or a remark typed and not yet sent with an answer lives in this screen (leaving asks). No swipe, no global
// key: a stroke of a signature never changes the screen. The order is always read from the store, never from a copy. Also holds the frame, the small window and
// the pieces shared with RcReception.tsx (the other full-screen field screen).
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, Circle, Flag, Minus, MoreHorizontal, Pencil, RotateCcw, TriangleAlert, X } from 'lucide-react';
import type { Delivery, Milestone, MilestoneEvent, Strokes } from '../../domain/types';
import { idOf as mid, blockedAt, boundsChanged, canRelease, checkMilestone, clockFact, deliveryState, derogationFacts, isLocked, linkMilestoneNc, mayRelease, milestoneProgress, milestoneStatus, ncFromMilestone, ncLinkState, ncOf, outOfBounds, receptionCfg, releaseDelivery, reopenMilestone, setMilestoneNa, signatureOk, takeLife, waiveMilestone, DELIVERY_STATE, type DeliveryState, type MilestoneStatus } from '../../domain/receptions';
import { decisionLabel } from '../../domain/quality';
import { nb, nowLocal } from '../../domain/base';
import { calibrationsDue } from '../../domain/maintenanceChecks';
import { sopPhase } from '../../domain/instructions';
import { useStore } from '../../store/StoreContext';
import { LEVEL_STYLE, NewTab, TONE, useDialogFocus } from '../common';
import { PhotoBox } from '../PhotoBox';
import { SignaturePad } from '../SignaturePad';
import { Pic, PicLegend } from '../../photo/Pic';
import type { Nav } from '../tools';
import { PeoplePick, de, fmtMoment, jalonsOk, peopleOf, plural, sentence, useRcAct, useUndo, rcDay } from './RcBits';
import { BIG, boundsText } from './rcShared';

// ---- pieces shared with RcReception.tsx
export const FIELD = 'w-full rounded-xl border-2 border-[#7b8aa3] bg-white px-3 py-3 text-lg outline-none focus:border-delacour-golddark focus:ring-2 focus:ring-delacour-golddark/40 disabled:bg-slate-100';
// The main gesture of a screen (green of the brand: emerald is kept for "conforme", "sans réserve", "libérée")
export const MAIN = 'border-delacour-dark bg-delacour-primary text-white';
// "2 jalons sur 4 conformes, 1 non conforme, 1 sans objet": the progress of the order in one sentence (the checks and the reception say it the same way)
export const progText = (p: { done: number; total: number; ko: number; na: number }) => `${jalonsOk(p.done, p.total)}${p.ko ? `, ${plural(p.ko, 'non conforme')}` : ''}${p.na ? `, ${p.na} sans objet` : ''}.`;
const TONES = { ...TONE, info: 'border-slate-300 bg-slate-50 text-slate-900' };
// A fact in a coloured box (colour and words: never the colour alone)
export const Box = ({ tone = 'info', role, children }: { tone?: keyof typeof TONES; role?: 'status' | 'alert'; children: ReactNode }) => <div role={role} className={`rounded-xl border-2 p-3 text-lg ${TONES[tone]}`}>{children}</div>;
// The state of the order, in words of 16 px with its colour
export const StateText = ({ st }: { st: DeliveryState }) => <span className="inline-flex items-center gap-1.5 text-base font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLE[DELIVERY_STATE[st].tone].dot}`} aria-hidden />{DELIVERY_STATE[st].label}</span>;
export const orderLabel = (d: Delivery) => [d.ref, d.item, d.client].filter(Boolean).join(' · ') || 'Commande sans nom';
export const inked = (s: Strokes | undefined) => !!s?.some(l => l.length);

// What is typed or drawn and not yet sent is kept in the tab (sessionStorage), so that a reload of the page (the camera of a phone can cause one) does not lose it.
// Never the person picked (nobody is picked for the user) nor the screen reached. The storage may be missing or refuse: then nothing is kept, and nothing breaks.
export function readDraft<T>(key: string): Partial<T> {
  try { const v = JSON.parse(window.sessionStorage.getItem(`rc-draft:${key}`) ?? 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
export function writeDraft(key: string, v: object | null) {
  try { if (v) window.sessionStorage.setItem(`rc-draft:${key}`, JSON.stringify(v)); else window.sessionStorage.removeItem(`rc-draft:${key}`); } catch { /* storage not available: no draft kept */ }
}
// The browser asks before the page is left (reload, closing of the tab) while something typed or drawn is not sent
export function useLeaveGuard(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const ask = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', ask);
    return () => window.removeEventListener('beforeunload', ask);
  }, [on]);
}

// What Tab can reach: not what a group of radios holds at tabindex -1 (one tab stop per group), not a closed button, a closed fieldset
const FOCUSABLE = 'a[href],button:not([tabindex="-1"]):not(:disabled),input:not([type=hidden]):not([tabindex="-1"]):not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';
// Escape closes (not while a field has the focus, nor while a window is open above: the confirmation, the photo editor); Tab turns round inside. The focus enters the screen, the page behind
// is inert and the focus goes back to what opened the screen at the end: `useDialogFocus` (common.tsx)
function useKeys(root: RefObject<HTMLElement | null>, onEscape: () => void) {
  const esc = useRef(onEscape);
  esc.current = onEscape;
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const el = root.current;
      if (!el || el !== [...document.querySelectorAll('[role=dialog]')].at(-1)) return;
      if (ev.key === 'Escape') { if (!(ev.target as HTMLElement | null)?.closest?.('input,textarea,select')) esc.current(); return; }
      if (ev.key !== 'Tab') return;
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(x => x.offsetParent !== null), first = f[0], last = f.at(-1), at = document.activeElement;
      if (first && last && (!el.contains(at) || at === (ev.shiftKey ? first : last))) { ev.preventDefault(); (ev.shiftKey ? last : first).focus(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [root]);
}
// The page behind does not scroll; the screen stays on (Wake Lock, asked again when the page comes back to the front) and is let go at the closing
function useAwake() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    let on = true, lock: WakeLockSentinel | undefined;
    const ask = async () => { try { const l = await navigator.wakeLock?.request('screen'); if (l && on) lock = l; else void l?.release(); } catch { /* refused (no https, battery saver): the screen may turn off */ } };
    const seen = () => { if (document.visibilityState === 'visible') void ask(); };
    void ask();
    document.addEventListener('visibilitychange', seen);
    return () => { on = false; document.body.style.overflow = ''; document.removeEventListener('visibilitychange', seen); void lock?.release().catch(() => {}); };
  }, []);
}

interface Go { label: string; run(): void; off?: boolean; end?: boolean; quiet?: boolean; why?: string }   // quiet: a white button, the main gesture is elsewhere; why: the fact that closes it, said next to it
// A phone held across, or a keyboard open (under 500 px of height): the full screens give their height to the content (one-line header, the bar at the bottom in one row, the photos folded)
const SHORT = '(max-height: 500px)';
function useMedia(query: string) {
  const [on, set] = useState(() => { try { return window.matchMedia(query).matches; } catch { return false; } });   // the static render (no window) is the tall, narrow one
  useEffect(() => {
    try { const q = window.matchMedia(query), f = () => set(q.matches); f(); q.addEventListener('change', f); return () => q.removeEventListener('change', f); } catch { return undefined; }
  }, [query]);
  return on;
}
const useShort = () => useMedia(SHORT);
// Room for two columns: a tablet or a desktop (1024 px), or a phone held across (the picture on the left, the point and the measure on the right)
const useWide = () => useMedia('(min-width: 1024px), (max-height: 500px) and (min-width: 600px)');
// PhotoBox is shared with other tools: its two buttons (11 px) are enlarged from a wrapper, for the gloves of the field screens (text of 16 px, targets of 44 px, or 64 px when the box is tall)
export const Snap = ({ tall = false, children }: { tall?: boolean; children: ReactNode }) => (
  <div className={`[&_[role=group].border-dashed>button]:text-base [&_[role=group].border-dashed>button]:font-bold [&_[role=group].border-dashed>button]:text-slate-800 [&_button[aria-label^=Retirer]]:min-h-[44px] [&_button[aria-label^=Retirer]]:min-w-[44px] ${tall ? '[&_[role=group].border-dashed>button]:min-h-[64px]' : '[&_[role=group].border-dashed>button]:min-h-[44px]'}`}>{children}</div>
);
// The person who checks stays at the top of every screen after the first, one tap to change it (a shared tablet says who checks the milestone shown)
export function WhoBtn({ label, who, onClick }: { label: string; who: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`${who ? `${label}\u202f: ${who}` : label}, changer`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-500 px-2 text-base font-semibold text-slate-900 hover:bg-slate-100 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">
      <span className="truncate">{who ? <><span className="max-[359px]:hidden">{label} : </span>{who}</> : label}</span><Pencil size={14} className="hidden shrink-0 sm:block" aria-hidden />
    </button>
  );
}
// The small window that changes the person (one tap on a name closes it; "Autre" types a name, then "Fermer")
export function WhoAsk({ title, who, setWho, names, absent, onClose }: { title: string; who: string; setWho(v: string): void; names: string[]; absent: string[]; onClose(): void }) {
  return (
    <Ask title={title} onClose={onClose}>
      <PeoplePick big value={who} onChange={v => { setWho(v); if (names.includes(v)) onClose(); }} names={names} absent={absent} label="Personne qui contrôle" />
      <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={onClose}>Fermer</button>
    </Ask>
  );
}
const NAV = 'inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-base font-semibold text-slate-800 hover:bg-slate-100 disabled:invisible';   // closed: not drawn (a "Précédent" that leads nowhere), never a faded one
// The full screen: title row, the screen in turn, then the fixed bar. With `answers` (the buttons that answer the screen, 64 px) the bar is the answers and one thin row of 44 px
// above them (previous, next); without, previous / next buttons of 64 px. The focus goes to the element marked data-head at every new screen and after what `notice` says was done
// (a button that did its job leaves the page: the focus is never left on the body).
export function Frame({ label, title, sub, said, notice, top, progress, answers, back, next, bar, closed, onClose, children }: {
  label: string; title: string; sub?: ReactNode; said: string; notice?: string; top?: string; progress?: { n: number; of: number }; answers?: ReactNode; back?: Go; next?: Go; bar?: ReactNode; closed?: string; onClose(): void; children: ReactNode;   // top: when it changes (and is not empty) the screen goes back to its top
}) {
  const root = useRef<HTMLDivElement>(null), main = useRef<HTMLDivElement>(null), { state, storageFull } = useStore(), clock = state ? clockFact(state) : '', why = useId();
  useDialogFocus(root);
  useKeys(root, onClose);
  useAwake();
  const head = () => root.current?.querySelector<HTMLElement>('[data-head]')?.focus({ preventScroll: true });
  useEffect(() => { main.current?.scrollTo({ top: 0 }); head(); }, [said]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (notice) head(); }, [notice]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (top) main.current?.scrollTo({ top: 0 }); }, [top]);
  useEffect(() => { const a = document.activeElement; if (!a || a === document.body) head(); });   // eslint-disable-line react-hooks/exhaustive-deps
  const big = `${BIG} max-sm:gap-1 max-sm:text-base`;
  return createPortal(
    <div ref={root} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="group fixed inset-0 z-[45] flex flex-col bg-white text-slate-900 outline-none print:hidden">
      <div className="h-2 shrink-0 bg-delacour-primary [@media(max-height:500px)]:h-1" />
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-1.5 [@media(max-height:500px)_and_(min-width:600px)]:py-0">
        <div className="min-w-0 flex-1 [@media(max-height:500px)_and_(min-width:600px)]:flex [@media(max-height:500px)_and_(min-width:600px)]:items-center [@media(max-height:500px)_and_(min-width:600px)]:gap-3">
          <div className="line-clamp-2 break-words text-base font-bold">{title}</div>
          {sub && <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate-700 [@media(max-height:500px)_and_(min-width:600px)]:mt-0 [@media(max-height:500px)_and_(min-width:600px)]:shrink-0 [@media(max-height:500px)_and_(min-width:600px)]:flex-nowrap">{sub}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer l'écran" className="shrink-0 rounded-lg p-2.5 text-slate-700 hover:bg-slate-100"><X size={26} aria-hidden /></button>
      </div>
      {/* the alert of the page behind is hidden by this screen: the failure of the browser to keep the data is said here, at the top, while it lasts */}
      {storageFull && <p role="alert" className="flex shrink-0 items-start gap-2 bg-red-700 px-4 py-2 text-base font-semibold text-white"><TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />Non enregistré&#8239;: l'espace du navigateur est plein ou refusé. Ce qui est fait ici est perdu à la fermeture de la page.</p>}
      {/* the clock of the device earlier than the last act recorded: said at the top of both full screens; `closed` says what it closes on this screen (the release; a signature without a waiver) */}
      {clock && <p role="status" className="flex shrink-0 items-start gap-2 border-b-2 border-amber-700 bg-amber-100 px-4 py-2 text-base font-semibold text-amber-950"><TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />{clock.replace(/\.$/, '')}.{closed ? ` ${closed}` : ''}</p>}
      {progress && (
        <div role="progressbar" aria-label="Avancement" aria-valuemin={1} aria-valuemax={progress.of} aria-valuenow={progress.n} aria-valuetext={`Étape ${progress.n} sur ${progress.of}`} className="h-2 shrink-0 bg-slate-200">
          <div className="h-full bg-delacour-primary transition-[width]" style={{ width: `${(progress.n / progress.of) * 100}%` }} />
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{notice || said}</p>
      <div ref={main} data-body className="flex-1 overflow-y-auto px-4 py-4 [@media(max-height:500px)]:py-3">{children}</div>
      {/* under 300 px of height (a phone held across with its keyboard open) the bar folds while a field has the focus: it comes back when the field is left */}
      <div data-bar className="relative shrink-0 border-t border-slate-200 px-4 py-2 [@media(max-height:300px)]:group-has-[[data-body]_input:focus]:hidden [@media(max-height:300px)]:group-has-[[data-body]_textarea:focus]:hidden">
        {/* the bar "Annuler" of EqBits is fixed to the bottom of the page: held by this wrapper (a transform makes it the frame of what is fixed in it), right above the bar of the buttons, in reach of the thumb */}
        {bar && <div className="pointer-events-none absolute inset-x-0 bottom-full z-10 h-14 [transform:translateZ(0)] [&>*]:pointer-events-auto [&>*]:!bottom-2 [&_button]:min-h-[44px] [&_button]:min-w-[44px]">{bar}</div>}
        {next?.off && next.why && <p id={why} className="mb-2 text-sm font-semibold text-slate-800">{next.why}</p>}
        {answers ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 [@media(max-height:500px)_and_(min-width:600px)]:flex-nowrap">
            <button type="button" className={`${NAV} order-1`} disabled={!back || back.off} onClick={back?.run}><ChevronLeft size={20} aria-hidden />{back?.label ?? 'Précédent'}</button>
            <div className="order-3 w-full [@media(max-height:500px)_and_(min-width:600px)]:order-2 [@media(max-height:500px)_and_(min-width:600px)]:w-auto [@media(max-height:500px)_and_(min-width:600px)]:flex-1">{answers}</div>
            <button type="button" className={`${NAV} order-2 [@media(max-height:500px)_and_(min-width:600px)]:order-3`} disabled={!next || next.off} aria-describedby={next?.off && next.why ? why : undefined} onClick={next?.run}>{next?.label}{next && !next.end && <ChevronRight size={20} aria-hidden />}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={`${big} border-slate-500 bg-white text-slate-900`} disabled={!back || back.off} onClick={back?.run}><ChevronLeft size={24} aria-hidden />{back?.label ?? 'Précédent'}</button>
            <button type="button" className={`${big} ${next?.quiet ? 'border-slate-500 bg-white text-slate-900' : MAIN}`} disabled={!next || next.off} aria-describedby={next?.off && next.why ? why : undefined} onClick={next?.run}>{next?.label}{next && !next.end && <ChevronRight size={24} aria-hidden />}</button>
          </div>
        )}
      </div>
    </div>, document.body);
}

// A small window over the screen (confirmation, motive): named, focus on its title, Escape closes it, buttons of 64 px in its content
export function Ask({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null), tid = useId();
  useDialogFocus(root);
  useKeys(root, onClose);
  useEffect(() => { root.current?.querySelector<HTMLElement>('[data-head]')?.focus({ preventScroll: true }); }, []);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4 print:hidden">
      <div ref={root} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className="max-h-[96vh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl outline-none sm:max-w-lg sm:rounded-2xl">
        <h2 id={tid} data-head tabIndex={-1} className="text-2xl font-black text-slate-900 focus:outline-none">{title}</h2>
        {children}
      </div>
    </div>, document.body);
}

// A person among a list, or another typed: for a second checker or a witness (the person of the session is kept by PeoplePick, not by this one)
export function NameChips({ value, onChange, names, label }: { value: string; onChange(v: string): void; names: string[]; label: string }) {
  const [other, setOther] = useState(() => !!value && !names.includes(value)), id = useId();
  const chip = (on: boolean) => `min-h-[48px] rounded-full border-2 px-4 text-base font-semibold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  return (
    <div role="group" aria-labelledby={id} className="space-y-2">
      <div id={id} className="text-base font-semibold text-slate-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {names.map(n => <button key={n} type="button" aria-pressed={!other && value === n} className={chip(!other && value === n)} onClick={() => { setOther(false); onChange(value === n ? '' : n); }}>{n}</button>)}
        <button type="button" aria-pressed={other} className={chip(other)} onClick={() => { setOther(!other); if (other || names.includes(value)) onChange(''); }}>Autre, précisez</button>
      </div>
      {other && <input className={FIELD} value={value} placeholder="Nom de la personne" aria-label={`${label}\u202f: autre personne`} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

// ---- the milestones
// Colour, symbol and words: never the colour alone
export const ST: Record<MilestoneStatus, { label: string; cls: string; Icon: typeof Check }> = {
  todo: { label: 'À contrôler', cls: 'border-slate-500 bg-white text-slate-900', Icon: Circle },
  ok: { label: 'Conforme', cls: 'border-emerald-900 bg-emerald-700 text-white', Icon: Check },
  reworked: { label: 'Conforme après reprise', cls: 'border-emerald-900 bg-emerald-700 text-white', Icon: RotateCcw },
  ko: { label: 'Non conforme', cls: 'border-red-900 bg-red-700 text-white', Icon: X },
  na: { label: 'Sans objet', cls: 'border-slate-500 bg-slate-200 text-slate-900', Icon: Minus },
};
const firstTodo = (d: Delivery) => { const i = d.milestones.findIndex(m => !m.na && m.ok == null); return i < 0 ? d.milestones.length + 1 : i + 1; };
// A check of a milestone that has bounds, passed conform with no value noted (an older check: the domain no longer accepts it) says so
const eventText = (e: MilestoneEvent, m: Milestone) => e.kind === 'reopen' ? 'rouvert' : e.kind === 'derogation' ? `dérogation${e.note ? `\u202f: ${e.note}` : ''}`
  : `${e.kind === 'rework' ? 'conforme après reprise' : e.ok ? 'conforme' : 'non conforme'}${e.measured ? ` (${e.measured})` : e.ok && (m.min != null || m.max != null) ? ' sans valeur mesurée' : ''}${e.note ? `\u202f: ${e.note}` : ''}`;

// Secondary actions of a milestone: not applicable (with its motive), open again, go past it by derogation
function More({ m, by, released, onNa, onReopen, onWaive, onTyped }: { m: Milestone; by: string; released: boolean; onNa(reason: string | null): void; onReopen(): void; onWaive(why: string): void; onTyped(on: boolean): void }) {
  const [na, setNa] = useState(''), [wv, setWv] = useState(''), typed = !!na.trim() || !!wv.trim();
  useEffect(() => { onTyped(typed); return () => onTyped(false); }, [typed]); // eslint-disable-line react-hooks/exhaustive-deps
  const out = 'flex min-h-[56px] items-center gap-2 px-3 text-lg font-semibold text-slate-800';
  return (
    <details className="rounded-2xl border-2 border-slate-200">
      <summary className={`${out} cursor-pointer`}><MoreHorizontal size={22} aria-hidden />Autres actions sur ce jalon</summary>
      <div className="space-y-5 border-t-2 border-slate-200 p-3">
        {m.na ? <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => onNa(null)}>Rendre ce jalon applicable</button> : (
          <>
            {(m.ok != null || m.waivedBy) && (
              <div className="space-y-2">
                {released && <p className="text-lg text-slate-800">La commande est libérée&#8239;: rouvrir ce jalon défait la libération.</p>}
                <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={onReopen}><RotateCcw size={22} aria-hidden />Rouvrir ce jalon</button>
              </div>
            )}
            {m.ok === false && !m.waivedBy && (
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-slate-800" htmlFor="rcm-waive">Motif de la dérogation (obligatoire)</label>
                <input id="rcm-waive" className={FIELD} value={wv} onChange={e => setWv(e.target.value)} />
                <button type="button" disabled={!wv.trim()} className={`${BIG} w-full border-amber-800 bg-white text-amber-950`} onClick={() => { onWaive(wv); setWv(''); }}>Passer outre par dérogation</button>
              </div>
            )}
            {m.ok === false && !m.waivedBy ? <p className="text-lg text-slate-800">Jalon non conforme sans dérogation&#8239;: «&#8239;sans objet&#8239;» n'est pas enregistré tant qu'aucune dérogation n'est notée.</p> : (
              <div className="space-y-2">
                <label className="block text-lg font-semibold text-slate-800" htmlFor="rcm-na">Motif du sans objet (obligatoire)</label>
                <input id="rcm-na" className={FIELD} value={na} onChange={e => setNa(e.target.value)} />
                <p className="text-lg text-slate-700">Inscrit au journal au nom {de(by)}, avec le motif.</p>
                <button type="button" disabled={!na.trim()} className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => { onNa(na.trim()); setNa(''); }}><Minus size={22} aria-hidden />Marquer ce jalon sans objet</button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

type Typed = { measured?: string; note?: string; second?: string };

// The follow-up of a "Non conforme" (defect, waiver): it scrolls into view when it appears
function KoBox({ children }: { children: ReactNode }) {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => { r.current?.scrollIntoView?.({ block: 'nearest' }); }, []);
  return <div ref={r} role="status" className="space-y-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3">{children}</div>;
}

export function RcMilestone({ id, onClose, nav }: { id: string; onClose(): void; nav: Nav }) {
  const { state, update } = useStore();
  const act = useRcAct();
  const { bar, offer } = useUndo();
  const d = state && Object.hasOwn(state.deliveries, id) ? state.deliveries[id] : undefined;   // an id from an address is read only if the data holds it ("__proto__", "constructor"…)
  const key = `milestone:${id}`, [kept] = useState(() => (d && !isLocked(d) && !d.archivedAt ? readDraft<{ draft: Record<string, Typed>; sig: Strokes }>(key) : {}));   // what a reload left
  const [who, setWho] = useState('');   // picked on the first screen (PeoplePick gives back the person of this session): never the name of the device
  const [step, setStep] = useState(0);   // 0: who, 1…n: the milestones, n + 1: the end
  const [draft, setDraft] = useState<Record<string, Typed>>(kept.draft ?? {});   // typed and not yet sent with an answer, by milestone
  const [ask, setAsk] = useState<(() => void) | null>(null), [waive, setWaive] = useState(false), [why, setWhy] = useState(''), [more, setMore] = useState(false);
  const [relWho, setRelWho] = useState(''), [sig, setSig] = useState<Strokes | undefined>(kept.sig);
  const lastGo = useRef(0), closed = useRef(false);
  const short = useShort(), wide = useWide(), [zoom, setZoom] = useState(false), [chg, setChg] = useState(false), [did, setDid] = useState<'' | 'release' | 'declare'>('');   // chg: the window "Qui contrôle ?" over a milestone; did: what was just done (said, then the focus goes to the title)
  // the milestones with a value or a remark typed and not sent, the signature drawn and not sent, a motive typed and not applied: asked about at closing, kept over a reload
  const pend = (d?.milestones ?? []).flatMap((m, i) => { const x = draft[mid(m, i)]; return x && (!!x.note?.trim() || !!x.second || (x.measured !== undefined && x.measured !== m.measured)) ? [i + 1] : []; });
  const sigOn = inked(sig), unsent = pend.length > 0 || sigOn || more;
  useLeaveGuard(unsent);
  useEffect(() => { if (!closed.current) writeDraft(key, pend.length || sigOn ? { draft, sig } : null); }, [key, pend.length, sigOn, draft, sig]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  if (!d) {
    return (
      <Frame label="Commande introuvable" title="Commande introuvable" said="Commande introuvable" onClose={onClose} next={{ label: 'Retour', run: onClose, end: true }}>
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 data-head tabIndex={-1} className="text-3xl font-black focus:outline-none">Commande introuvable</h1>
          <Box tone="warn" role="alert">Cette commande n'existe pas ou n'est pas encore reçue sur cet appareil.</Box>
        </div>
      </Frame>
    );
  }

  const ms = d.milestones, n = ms.length, END = n + 1, s = Math.min(step, END), today = nowLocal().slice(0, 10), archived = !!d.archivedAt, locked = isLocked(d), frozen = archived || locked;   // a signed PV keeps its checks: the moves of the domain do nothing on it
  const { names, absent } = peopleOf(state, d, today), cfg = receptionCfg(state.params), cr = canRelease(state, d), prog = milestoneProgress(d), clock = clockFact(state);   // clock: the device is behind the last act recorded, the release is closed
  const edit = (k: string, p: Typed) => setDraft(x => ({ ...x, [k]: { ...x[k], ...p } }));
  const leave = (f: () => void) => (unsent ? setAsk(() => f) : f());
  const quit = () => { closed.current = true; writeDraft(key, null); onClose(); };
  const go = (to: number) => { lastGo.current = Date.now(); setDid(''); setStep(Math.min(END, Math.max(0, to))); };
  // what a move of the life of the order did can be taken back for a few seconds: the life of the order as it was, the content as it is
  const undoTo = (before: Delivery) => update(x => { if (x.deliveries[id]) x.deliveries[id] = takeLife(x.deliveries[id], before); });
  const setPic = (k: string, f: 'photo' | 'gapPhoto', v: string) => act(id, x => ({ ...x, milestones: x.milestones.map((m, i) => { if (mid(m, i) !== k) return m; const o = { ...m }; if (v) o[f] = v; else delete o[f]; return o; }) }));
  const dropPic = (k: string, f: 'photo' | 'gapPhoto', old: string) => { setPic(k, f, ''); offer('Photo retirée', () => setPic(k, f, old)); };

  // ---- the moves
  const answer = (i: number, ok: boolean) => {
    const m = ms[i], k = mid(m, i), x = draft[k], measured = x?.measured ?? m.measured, note = x?.note?.trim() ?? '', before = d;
    if (m.na || frozen || !who.trim() || Date.now() - lastGo.current < 450) return;   // a second tap meant for the previous screen is not an answer
    if (m.ok === ok && measured === m.measured && !note && (x?.second ?? m.second ?? '') === (m.second ?? '')) return;   // the same answer again changes nothing, unless a second checker was chosen, changed or cleared meanwhile
    if (ok && (m.min != null || m.max != null) && !measured.trim()) return;   // bounds without a value: never conform (the domain refuses it too, the screen says why)
    let done = false;
    act(id, y => { const z = checkMilestone(y, k, { ok, measured, by: who, at: nowLocal(), ...(note ? { note } : {}), ...(x?.second ? { second: x.second } : {}) }); done = z !== y; return z; });
    if (!done) return;   // the domain refused: nothing is announced, nothing is undone
    setDraft(({ [k]: _sent, ...rest }) => rest);
    offer(`Jalon ${i + 1} noté ${ok ? 'conforme' : 'non conforme'}`, () => { undoTo(before); go(i + 1); });   // the screen has moved on: it comes back to the milestone taken back
    if (ok) { const j = ms.findIndex((y, q) => q > i && !y.na && y.ok == null); go(j < 0 ? END : j + 1); }
  };
  const declare = (i: number) => {
    update(x => {
      const y = x.deliveries[id], k = mid(ms[i], i), m = y?.milestones.find((z, j) => mid(z, j) === k);
      if (!y || !m || ncLinkState(x, m.ncId) === 'ok') return;   // one defect per milestone; a link to a defect deleted in 5.1 is no link: the milestone is declared again
      const at = new Date(), nc = ncFromMilestone(x, y, { ...m, id: k }, who, at);   // the number of the defect and the line of the journal are those of the gesture
      x.ncs[nc.id] = nc;
      x.deliveries[id] = linkMilestoneNc(y, k, nc.id, who, nowLocal(at), x);
    });
    setDid('declare');
  };
  const setNa = (i: number, reason: string | null) => { const before = d; act(id, y => setMilestoneNa(y, mid(ms[i], i), reason, who.trim(), nowLocal())); offer(`Jalon ${i + 1} ${reason === null ? 'rendu applicable' : 'noté sans objet'}`, () => undoTo(before)); };
  const reopen = (i: number) => { const before = d; act(id, y => reopenMilestone(y, mid(ms[i], i), who, nowLocal())); offer(`Jalon ${i + 1} rouvert`, () => undoTo(before)); };
  const waiver = (i: number, text: string) => { const before = d; act(id, y => waiveMilestone(y, mid(ms[i], i), who, text, nowLocal())); offer(`Dérogation notée sur le jalon ${i + 1}`, () => undoTo(before)); };
  const release = (derogation?: string) => {
    const before = d, at = nowLocal(), by = relWho.trim(), sign = signatureOk(sig) ? sig : undefined;   // a dot or a short trace is not kept as a signature
    if (clock) return;
    act(id, (x, _by, cur) => releaseDelivery(x, { by, at, ...(sign ? { sign } : {}), ...(derogation ? { derogation: { why: derogation } } : {}) }, cur));
    setSig(undefined); setWaive(false); setWhy(''); setDid('release');
    offer('Commande libérée', () => undoTo(before));
  };

  // ---- the screens
  const startBody = (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Qui contrôle&#8239;?</h1>
      {archived && <Box tone="warn" role="status">Commande archivée le {rcDay(d.archivedAt!.slice(0, 10))} : aucun contrôle n'est possible.</Box>}
      {locked && !archived && <Box tone="info" role="status">PV signé{d.reception.signedAt ? ` le ${fmtMoment(d.reception.signedAt)}` : ''} : les contrôles ne sont plus modifiables.</Box>}
      {(pend.length > 0 || sigOn) && <Box tone="info" role="status">{nb(`Pas encore envoyé\u202f: ${[...pend.map(i => `valeur ou remarque du jalon ${i}`), ...(sigOn ? ['signature de libération dessinée'] : [])].join(', ')}.`)}</Box>}
      <PeoplePick big value={who} onChange={setWho} names={names} absent={absent} label="Personne qui contrôle" />
      {!!who && absent.includes(who) && <Box tone="info">{who} est absent aujourd'hui.</Box>}
      <div className="space-y-1">
        <p className="text-xl font-semibold text-slate-900">{orderLabel(d)}</p>
        <p className="text-lg text-slate-800">{n ? progText(prog) : "Aucun jalon n'est défini pour cette commande."}</p>
      </div>
    </div>
  );

  // what the screen and the fixed bar both need to know about a milestone: the value typed, the bounds, what closes the answers
  const facts = (i: number) => {
    const m = ms[i], k = mid(m, i), x = draft[k], typed = x?.measured ?? m.measured, bounds = boundsText(m);
    return { m, k, x, typed, bounds, oob: outOfBounds(m, typed), noValue: !!bounds && !typed.trim(), off: frozen || !!m.na || !who.trim() };   // bounds without a value: "Conforme" waits for the value
  };
  const point = (i: number) => {
    const { m, k, x, typed, bounds, oob, noValue, off } = facts(i), sts = milestoneStatus(m), meta = ST[sts], nc = ncOf(state, m.ncId);
    const measurable = !!m.unit || m.min != null || m.max != null;
    const sop = m.sopId ? state.sops[m.sopId] : undefined, blocker = blockedAt(d), bi = blocker ? ms.indexOf(blocker) : -1;
    const lastCheck = m.ok != null ? [...(m.history ?? [])].reverse().find(e => e.kind === 'check' || e.kind === 'rework') : undefined;
    const inst = m.instrumentId && Object.hasOwn(state.equipments, m.instrumentId) ? state.equipments[m.instrumentId] : undefined;
    const late = inst ? calibrationsDue(state, new Date(), 0).find(x => x.e.id === inst.id && x.days < 0) : undefined;   // same fact as the sheet: calibration past due
    // the two photos: beside each other, or (phone held across) folded behind "Ajouter une photo" so that they do not take the screen
    const pics = (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-slate-700">Photo de preuve</div>
          <fieldset disabled={off} className="min-w-0"><Snap tall={!short}><PhotoBox tall={!short} value={m.photo ?? ''} label={`Photo de preuve, jalon ${i + 1}`} onChange={v => (v ? setPic(k, 'photo', v) : dropPic(k, 'photo', m.photo ?? ''))} /></Snap></fieldset>
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold text-slate-700">Photo de l'écart</div>
          <fieldset disabled={off} className="min-w-0"><Snap tall={!short}><PhotoBox tall={!short} value={m.gapPhoto ?? ''} label={`Photo de l'écart, jalon ${i + 1}`} onChange={v => (v ? setPic(k, 'gapPhoto', v) : dropPic(k, 'gapPhoto', m.gapPhoto ?? ''))} /></Snap></fieldset>
        </div>
      </div>
    );
    // the reference picture: a thumbnail of 96 px beside the point and the requirement (touched, it is enlarged) so that the value to measure stays near the top of a phone held upright;
    // in two columns (tablet, or a phone held across) the picture is on the left, whole, and stays in view while the right column is read
    const ref = m.refPhoto, thumb = ref && !wide && (
      <button type="button" onClick={() => setZoom(true)} aria-label={`Agrandir la photo de référence\u202f: ${m.label || `jalon ${i + 1}`}`} className="relative shrink-0 overflow-hidden rounded-xl border border-slate-500 bg-white hover:bg-slate-50">
        <Pic value={ref} alt={`Photo de référence\u202f: ${m.label}`} fit="contain" size="t" className="block h-24 w-24 bg-slate-100 sm:h-32 sm:w-32" />
        <span className="absolute inset-x-0 bottom-0 bg-slate-900/80 py-0.5 text-center text-xs font-semibold text-white">Référence</span>
      </button>
    );
    return (
      <div className={`mx-auto grid gap-6 ${ref && wide ? 'max-w-6xl grid-cols-2 [@media(max-height:500px)]:grid-cols-[2fr_3fr]' : 'max-w-3xl'}`}>
        {ref && wide && (
          <figure className="space-y-2 self-start [@media(max-height:500px)]:sticky [@media(max-height:500px)]:top-0">
            <Pic value={ref} alt={`Photo de référence\u202f: ${m.label}`} fit="contain" size="v" className="max-h-[55vh] w-full rounded-2xl bg-slate-100 [@media(max-height:500px)]:max-h-[calc(100vh-170px)]" />
            <figcaption className="text-lg font-semibold text-slate-800 [@media(max-height:500px)]:sr-only">Un bon jalon ressemble à ceci</figcaption>
            <PicLegend value={ref} className="text-lg text-slate-700 [@media(max-height:500px)]:hidden" />
          </figure>
        )}
        <div className="space-y-4 [@media(max-height:500px)]:space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${meta.cls}`}><meta.Icon size={18} aria-hidden />{meta.label}</span>
            {m.ok != null && m.by && <span className="text-base text-slate-700">Contrôlé par {m.by}, {fmtMoment(m.at ?? m.date)}</span>}
          </div>
          <h1 data-head tabIndex={-1} className="text-2xl font-black leading-tight text-slate-900 focus:outline-none sm:text-3xl [@media(max-height:500px)]:sm:text-2xl">{m.label || `Jalon ${i + 1}`}</h1>
          {/* the follow-up of "Non conforme" comes right under the title and scrolls into view when it appears: it is never pushed out of sight */}
          {m.ok === false && !m.na && (
            <KoBox>
              <p className="text-lg font-bold text-red-900">{sentence(`Jalon ${i + 1} non conforme${m.date ? ` depuis le ${rcDay(m.date)}` : ''}`)}</p>
              {m.waivedBy && <p className="text-lg text-red-950">Dérogation {de(m.waivedBy)}{m.waivedAt ? `, ${fmtMoment(m.waivedAt)}` : ''} : {sentence(m.waivedWhy ?? '')}</p>}
              {nc ? (
                <>
                  <p className="text-lg text-red-950">Défaut {nc.ref} déjà déclaré{nc.decision && nc.decision !== 'attente' ? ` · décision\u202f: ${decisionLabel(nc.decision)}` : ', sans décision'}.</p>
                  <button type="button" className={`${BIG} w-full border-red-700 bg-white text-red-800`} onClick={() => nav.open('5.1', nc.id)}>Ouvrir le défaut<NewTab size={20} /></button>
                </>
              ) : (
                <>
                  {m.ncId && <p className="text-lg font-semibold text-red-950">Défaut lié introuvable dans 5.1.</p>}
                  <button type="button" disabled={off} className={`${BIG} w-full border-red-800 bg-white text-red-800`} onClick={() => declare(i)}><TriangleAlert size={24} aria-hidden />{m.ncId ? 'Déclarer à nouveau' : 'Déclarer au bac rouge'}</button>
                </>
              )}
            </KoBox>
          )}
          {(m.point || m.requirement || thumb) && (
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-3 [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-2 [@media(max-height:500px)]:gap-4 [@media(max-height:500px)]:space-y-0">
                {m.point && <div><div className="text-base font-semibold text-slate-600">Point à contrôler</div><p className="text-xl text-slate-900">{m.point}</p></div>}
                {m.requirement && <div><div className="text-base font-semibold text-slate-600">Exigence</div><p className="text-xl font-semibold text-slate-900">{m.requirement}</p></div>}
              </div>
              {thumb}
            </div>
          )}
          {boundsChanged(m) && <Box tone="warn" role="status">{nb(`Plage attendue modifiée depuis le contrôle\u202f: le résultat «\u202f${meta.label.toLowerCase()}\u202f» n'a pas été revu.`)}</Box>}
          {blocker && bi >= 0 && bi < i && <Box tone="warn" role="status">{sentence(nb(`Jalon ${bi + 1} «\u202f${blocker.label}\u202f» non conforme${blocker.date ? ` depuis le ${rcDay(blocker.date)}` : ''}`))}</Box>}
          {sop && <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => nav.open('3.2', `station:${sop.id}`)}>Ouvrir l'instruction du poste<NewTab size={20} /></button>}
          {sop && sopPhase(sop) === 'archived' && <p className="text-lg font-semibold text-slate-800">Instruction archivée.</p>}
          {inst && <p className="text-lg text-slate-800">Instrument&#8239;: {inst.name}{inst.retiredAt ? ', retiré du service' : ''}{late && <span className="font-bold text-red-800">, étalonnage échu depuis {plural(-late.days, 'jour')}</span>}.</p>}
          {frozen && <Box tone="info" role="status">{archived ? 'Commande archivée' : 'PV signé'} : les contrôles ne sont plus modifiables.</Box>}
          {m.na && <Box tone="info" role="status">Jalon sans objet{m.naReason ? `\u202f: ${m.naReason}` : ''}. Il ne bloque pas la libération.</Box>}
          {!m.na && (
            <>
              {m.critical && <NameChips label="Jalon critique&#8239;: second contrôleur (facultatif)" names={names.filter(q => q !== who)} value={x?.second ?? m.second ?? ''} onChange={v => edit(k, { second: v })} />}
              {measurable && (
                <div className="space-y-1">
                  <label htmlFor={`rcm-v-${k}`} className="block text-lg font-semibold text-slate-800">Valeur mesurée{m.unit ? `, en ${m.unit}` : ''}</label>
                  {bounds && <p className="text-lg text-slate-700">{nb(`Plage attendue\u202f: ${bounds}.`)}</p>}
                  <input id={`rcm-v-${k}`} inputMode="decimal" autoComplete="off" enterKeyHint="done" disabled={off} value={typed} className={`${FIELD}\u202f!min-h-[64px] font-mono\u202f!text-2xl`}
                    onChange={e => edit(k, { measured: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                  {oob && <p role="status" className="text-xl font-bold text-red-800">{nb(`${typed.trim()}${m.unit && !typed.includes(m.unit) ? ` ${m.unit}` : ''} est hors de la plage attendue (${bounds})\u202f: non conforme.`)}</p>}
                  {!oob && !!bounds && !!typed.trim() && <p role="status" className="text-lg font-semibold text-emerald-800">Dans la plage attendue.</p>}
                  {noValue && <p role="status" className="text-lg font-semibold text-slate-800">Aucune valeur mesurée notée&#8239;: le résultat «&#8239;Conforme&#8239;» n'est pas proposé sans valeur.</p>}
                </div>
              )}
              {short ? (
                <details className="rounded-2xl border-2 border-slate-200">
                  <summary className="flex min-h-[56px] cursor-pointer items-center px-3 text-lg font-semibold text-slate-800">{m.photo || m.gapPhoto ? 'Photos du jalon' : 'Ajouter une photo'}</summary>
                  <div className="border-t-2 border-slate-200 p-3">{pics}</div>
                </details>
              ) : pics}
              <div className="space-y-1">
                <label htmlFor={`rcm-n-${k}`} className="block text-lg font-semibold text-slate-800">Remarque (facultatif)</label>
                <textarea id={`rcm-n-${k}`} rows={2} disabled={off} value={x?.note ?? ''} className={FIELD} onChange={e => edit(k, { note: e.target.value })} />
                {lastCheck?.note && !x?.note && <p className="text-lg text-slate-700">Remarque du dernier contrôle&#8239;: {lastCheck.note}.</p>}
              </div>
              {!who.trim() && <Box tone="warn" role="status">{nb("Aucune personne choisie\u202f: «\u202fQui contrôle\u202f?\u202f» n'est pas renseigné, aucun résultat n'est possible.")}</Box>}
            </>
          )}
          {(m.history?.length ?? 0) > 0 && (
            <details className="rounded-2xl border-2 border-slate-200">
              <summary className="flex min-h-[56px] cursor-pointer items-center px-3 text-lg font-semibold text-slate-800">Historique du jalon ({m.history!.length})</summary>
              <ul className="space-y-2 border-t-2 border-slate-200 p-3 text-lg text-slate-800">
                {[...m.history!].reverse().map((e, j) => <li key={j}>{fmtMoment(e.at)} · {e.by || 'personne'} · {eventText(e, m)}</li>)}
              </ul>
            </details>
          )}
          {!frozen && who.trim() !== '' && <More key={k} m={m} by={who} released={!!d.releasedAt} onNa={r => setNa(i, r)} onReopen={() => reopen(i)} onWaive={t => waiver(i, t)} onTyped={setMore} />}
        </div>
      </div>
    );
  };

  const releasers = cfg.releasers.length ? names.filter(q => mayRelease(state.params, q)) : names;
  const named = !!relWho.trim(), outside = named && !mayRelease(state.params, relWho);   // a person outside the list is told, never blocked
  const endBody = (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Fin du contrôle</h1>
      <p className="text-xl font-semibold text-slate-900">{orderLabel(d)}</p>
      {n === 0 ? <Box tone="info">Aucun jalon n'est défini pour cette commande.</Box>
        : cr.ok ? <Box tone="good" role="status"><span className="flex items-center gap-2 font-bold"><Check size={24} className="shrink-0" aria-hidden />Tous les jalons applicables sont contrôlés.</span></Box>
        : (
          <Box tone="warn" role="status">
            <p className="font-bold">Ce qui reste à régler&#8239;:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{cr.why.map(w => <li key={w}>{w}</li>)}</ul>
          </Box>
        )}
      {n > 0 && <p className="text-lg text-slate-800">{progText(prog)}</p>}
      {cr.notes?.map(t => <p key={t} role="status" className="text-lg font-semibold text-slate-900">{t}.</p>)}
      {d.releasedAt ? (
        <Box tone="good" role="status">
          <p className="font-bold">Commande libérée par {d.releasedBy} le {fmtMoment(d.releasedMoment ?? d.releasedAt)}.</p>
          {d.derogation && <p>Par dérogation {de(d.derogation.by)} : {sentence(d.derogation.why)}</p>}
          {derogationFacts(d, state.params).map(f => <p key={f}>{f}.</p>)}
        </Box>
      ) : frozen ? <Box tone="warn">{archived ? 'Commande archivée' : 'PV signé'} : aucune libération possible.</Box> : (
        <section className="space-y-3 rounded-2xl border-2 border-slate-200 p-3" aria-label="Libération">
          <h2 className="text-2xl font-black text-slate-900">Libération</h2>
          {cfg.releasers.length > 0 && <p className="text-lg text-slate-700">Libération confiée à&#8239;: {cfg.releasers.join(', ')}.</p>}
          <PeoplePick big value={relWho} onChange={setRelWho} names={releasers} absent={absent} label="Qui libère ?" />
          {outside && <Box tone="warn" role="status">{relWho} ne figure pas dans la liste des personnes qui libèrent. La libération reste possible&#8239;: elle est inscrite au journal sous ce nom.</Box>}
          <div className="[&_canvas]:max-w-none"><SignaturePad value={sig} onChange={setSig} label="Signature de la personne qui libère (facultative)" /></div>
          {sigOn && !signatureOk(sig) && <p role="status" className="text-lg font-semibold text-red-800">Tracé trop court&#8239;: il n'est pas enregistré comme signature avec la libération.</p>}
          {!!clock && <p className="text-lg font-semibold text-amber-950">Libération fermée&#8239;: l'horloge de l'appareil est en retard sur le dernier acte enregistré.</p>}
        </section>
      )}
    </div>
  );

  const body = s === 0 ? startBody : s === END ? endBody : point(s - 1);
  const at = s > 0 && s < END ? ms[s - 1] : undefined;
  const said = s === 0 ? 'Début du contrôle' : s === END ? 'Fin du contrôle' : `Jalon ${s} sur ${n}\u202f: ${at?.label ?? ''}`;   // the title of the screen is said by the focus, never twice
  const notice = did === 'release' && d.releasedAt ? `Commande libérée par ${d.releasedBy} le ${fmtMoment(d.releasedMoment ?? d.releasedAt)}` : did === 'declare' && at?.ncId ? `Défaut ${ncOf(state, at.ncId)?.ref ?? ''} déclaré, jalon ${s} sur ${n}` : '';
  const dots = n > 0 && (
    <nav aria-label="Jalons de la commande" className="flex flex-wrap justify-center gap-2">
      {ms.map((m, i) => {
        const M = ST[milestoneStatus(m)];
        return (
          <button key={mid(m, i)} type="button" disabled={!who.trim()} aria-current={s === i + 1 ? 'step' : undefined} aria-label={`Jalon ${i + 1} sur ${n}${m.label ? `\u202f: ${m.label}` : ''}, ${M.label}`} onClick={() => go(i + 1)}
            className={`flex h-11 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full border-2 px-1 text-base font-bold leading-none disabled:opacity-40 ${M.cls} ${s === i + 1 ? 'ring-4 ring-delacour-golddark ring-offset-2' : ''}`}>
            <span>{i + 1}</span><M.Icon size={13} aria-hidden />
          </button>
        );
      })}
      <button type="button" disabled={!who.trim()} aria-current={s === END ? 'step' : undefined} aria-label="Fin du contrôle" onClick={() => go(END)}
        className={`flex h-11 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-full border-2 border-slate-500 bg-white px-2 text-base font-bold leading-none text-slate-900 disabled:opacity-40 ${s === END ? 'ring-4 ring-delacour-golddark ring-offset-2' : ''}`}><Flag size={15} aria-hidden /><span className="sr-only">Fin</span></button>
    </nav>
  );
  // the state of the order is said on the first screen; after it the line holds the rank and the person who checks (one tap to change)
  const sub = s === 0 ? <StateText st={deliveryState(d, new Date(), state.params)} /> : <>{s < END && <span className="font-bold">Jalon {s} sur {n}</span>}<WhoBtn label="Contrôle" who={who.trim()} onClick={() => setChg(true)} /></>;
  // the bar at the bottom: on a milestone the two answers (a milestone passed without result says "Passer"), at the end the release; elsewhere previous / next of 64 px
  const cur = at && !at.na ? facts(s - 1) : undefined, answered = !!at && (at.ok != null || !!at.na || frozen);
  const closedWhy = cur ? (cur.off ? (frozen ? '' : 'Aucune personne choisie pour contrôler.') : cur.oob ? 'Valeur hors de la plage attendue.' : cur.noValue ? 'Valeur mesurée absente.' : '') : '';
  const hint = (t: string) => t && <p id="rcm-hint" className="mb-1 text-base font-semibold text-slate-800 [@media(max-height:500px)_and_(min-width:600px)]:hidden">{t}</p>;
  const two = `${BIG} w-full max-sm:gap-1 max-sm:px-2 max-sm:text-base`;
  const given = cur && ST[milestoneStatus(cur.m)];
  const answers = cur && given && frozen ? (
    // a check already made on a signed PV (or an archived order) is a fact, not two faded buttons: colour, symbol and words, full opacity, nothing to touch
    <div role="group" aria-label="Résultat du jalon" className="flex min-h-[64px] items-center justify-center"><span className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 px-5 text-lg font-bold ${given.cls}`}><given.Icon size={22} aria-hidden />{given.label}</span></div>
  ) : cur ? (
    <div>
      {hint(closedWhy)}
      <div role="group" aria-label="Résultat du jalon" className="grid grid-cols-2 gap-6">
        <button type="button" aria-pressed={cur.m.ok === true} aria-describedby={closedWhy ? 'rcm-hint' : undefined} disabled={cur.off || cur.oob || cur.noValue} onClick={() => answer(s - 1, true)}
          className={`${two} border-emerald-900 bg-emerald-700 text-white ${cur.m.ok === true ? 'ring-4 ring-delacour-golddark ring-offset-2' : ''}`}><Check size={24} className="max-[399px]:hidden" aria-hidden />Conforme</button>
        <button type="button" aria-pressed={cur.m.ok === false} disabled={cur.off} onClick={() => answer(s - 1, false)}
          className={`${two} border-red-900 bg-red-700 text-white ${cur.m.ok === false ? 'ring-4 ring-delacour-golddark ring-offset-2' : ''}`}><TriangleAlert size={24} className="max-[399px]:hidden" aria-hidden />Non conforme</button>
      </div>
    </div>
  ) : s === END && !d.releasedAt && !frozen ? (
    <div>
      {hint(named ? '' : 'Aucune personne choisie pour libérer.')}
      <div className={`grid gap-3 ${cr.ok ? '' : 'grid-cols-2'}`}>
        <button type="button" disabled={!named || !cr.ok || !!clock} aria-describedby={named ? undefined : 'rcm-hint'} className={`${two} border-emerald-900 bg-emerald-700 text-white`} onClick={() => release()}><Check size={24} className="max-[399px]:hidden" aria-hidden />Libérer la commande</button>
        {!cr.ok && <button type="button" disabled={!named || !!clock} aria-describedby={named ? undefined : 'rcm-hint'} className={`${two} border-amber-800 bg-white text-amber-950`} onClick={() => setWaive(true)}>Libérer par dérogation</button>}
      </div>
    </div>
  ) : undefined;
  const next: Go = s === 0 ? { label: 'Commencer', run: () => go(firstTodo(d)), off: !who.trim(), why: 'Aucune personne choisie\u202f: «\u202fCommencer\u202f» reste fermé.' } : s === END ? { label: 'Fermer', run: () => leave(quit), end: true } : { label: answered ? (s === n ? 'Terminer' : 'Suivant') : 'Passer', run: () => go(s + 1) };

  return (
    <>
      <Frame label={`Contrôle des jalons\u202f: ${orderLabel(d)}`} title={orderLabel(d)} sub={sub} said={said} notice={notice} answers={answers} bar={bar} closed="La libération est fermée." onClose={() => leave(quit)} next={next} back={{ label: 'Précédent', run: () => go(s - 1), off: s === 0 }}>
        {s > 0 && dots && <div className="mx-auto mb-3 max-w-3xl [@media(max-height:500px)]:hidden">{dots}</div>}
        {body}
      </Frame>
      {chg && <WhoAsk title="Qui contrôle ?" who={who} setWho={setWho} names={names} absent={absent} onClose={() => setChg(false)} />}
      {zoom && at?.refPhoto && (
        <Ask title="Photo de référence" onClose={() => setZoom(false)}>
          <figure className="space-y-2">
            <Pic value={at.refPhoto} alt={`Photo de référence\u202f: ${at.label}`} fit="contain" size="v" className="max-h-[60vh] w-full rounded-2xl bg-slate-100" />
            <figcaption className="text-lg font-semibold text-slate-800">Un bon jalon ressemble à ceci</figcaption>
            <PicLegend value={at.refPhoto} className="text-lg text-slate-700" />
          </figure>
          <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => setZoom(false)}>Fermer</button>
        </Ask>
      )}
      {ask && (
        <Ask title="Saisie pas encore envoyée" onClose={() => setAsk(null)}>
          <p className="text-lg text-slate-800">
            {pend.length > 0 && "Une valeur ou une remarque tapée n'est envoyée qu'avec Conforme ou Non conforme. "}
            {more && "Un motif tapé n'est appliqué qu'avec le bouton du motif. "}
            {sigOn && "La signature dessinée n'est enregistrée qu'avec «\u202fLibérer la commande\u202f». "}
            Quitter l'écran perd ce qui n'est pas envoyé.
          </p>
          <div className="grid gap-3">
            <button type="button" className={`${BIG} ${MAIN}`} onClick={() => setAsk(null)}>Revenir au contrôle</button>
            <button type="button" className={`${BIG} border-red-700 bg-white text-red-800`} onClick={() => { const f = ask; setAsk(null); setDraft({}); setSig(undefined); f(); }}>Quitter sans l'envoyer</button>
          </div>
        </Ask>
      )}
      {waive && (
        <Ask title="Libérer par dérogation" onClose={() => setWaive(false)}>
          <p className="text-lg text-slate-800">Ce qui reste à régler est inscrit avec le motif, la personne et l'heure&#8239;:</p>
          <ul className="list-disc space-y-1 pl-5 text-lg text-slate-900">{cr.why.map(w => <li key={w}>{w}</li>)}</ul>
          <div className="space-y-1">
            <label htmlFor="rcm-why" className="block text-lg font-semibold text-slate-800">Motif de la dérogation (obligatoire)</label>
            <textarea id="rcm-why" rows={3} className={FIELD} value={why} onChange={e => setWhy(e.target.value)} />
          </div>
          <div className="grid gap-3">
            <button type="button" disabled={!why.trim() || !!clock} className={`${BIG} border-amber-800 bg-amber-700 text-white`} onClick={() => release(why.trim())}>Libérer par dérogation</button>
            <button type="button" className={`${BIG} border-slate-500 bg-white text-slate-900`} onClick={() => setWaive(false)}>Revenir au contrôle</button>
          </div>
        </Ask>
      )}
    </>
  );
}
