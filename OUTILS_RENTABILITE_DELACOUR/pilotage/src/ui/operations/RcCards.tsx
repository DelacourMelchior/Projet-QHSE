// An order in the register: a card (reference, customer, state in colour and in words, the milestones in segments and in words, the next task, the promised day,
// the reservations to lift) or a line of the list. One named button (44 px on a touch screen): the next step ("Contrôler" the checks full screen, "Réception" the reception at
// the customer's, "Libérer", "Lever"). A menu "…" holds the other moves (traveller sheet to print, PV, copy, archive, delete).
import { memo, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Delivery, ReceptionTodo, State } from '../../domain/types';
import { daysBetween, nb } from '../../domain/base';
import { DELIVERY_STATE, deliveryState, milestoneProgress, milestoneStatus, openReserves, plural, promisedOn, qtyReceived, remainingQty, type DeliveryState, type MilestoneStatus } from '../../domain/receptions';
import { deliveryLevel, receptionFocus } from '../../domain/receptionsAll';
import { searchText, shortTask } from '../../domain/rcLogic';
import { isoDate } from '../../domain/periods';
import { Button } from '../common';
import { fmtMoment, SealBadge, StateBadge } from './RcBits';

export interface RcAct { label: string; run(): void; danger?: boolean }
// The full screen that suits the order: the checks until it is released or delivered, then the reception
const fieldKind = (d: Delivery): 'jalon' | 'reception' => (d.releasedAt || d.reception.date ? 'reception' : 'jalon');
export { searchText };   // what the search reads of an order (domain/rcLogic.ts)
export const orderName = (d: Delivery) => d.ref.trim() || 'Commande sans numéro';
const clientName = (d: Delivery) => d.client.trim() || 'Client à saisir';
// A quantity as it is read in French: a comma, six decimals at most (what the domain keeps), never "1.1e-16"; the word agrees with the number (plural from 2: "1,5 reçue", "2 reçues")
export const qtyFr = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 6 });
export const qtyPlural = (n: number, one: string, many = `${one}s`) => `${qtyFr(n)} ${Math.abs(n) >= 2 ? many : one}`;

const BORDER = { alert: 'border-red-300', warn: 'border-amber-300', ok: 'border-slate-200', pending: 'border-slate-200' } as const;
// "conforme" is a plain green, "conforme après reprise" the same green in stripes (a shape, not a colour: the first failure is the trace the tool keeps), said in words under the card
const SEG: Record<MilestoneStatus, string> = {
  todo: 'bg-slate-200', ok: 'bg-emerald-600', ko: 'bg-red-600', na: 'border border-dashed border-slate-400',
  reworked: 'bg-[repeating-linear-gradient(135deg,#059669_0,#059669_3px,#a7f3d0_3px,#a7f3d0_6px)] border border-emerald-700',
};
const SEG_WORD: Record<MilestoneStatus, string> = { todo: 'à contrôler', ok: 'conforme', reworked: 'conforme après reprise', ko: 'non conforme', na: 'sans objet' };
const BEFORE: DeliveryState[] = ['in_progress', 'blocked', 'to_release', 'released'];
// the promised day is told while a delivery is still to make (or to make again)
const SHOW_PROMISED: DeliveryState[] = [...BEFORE, 'partial', 'refused'];
const ICON_BTN = 'inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 max-sm:min-h-[44px] max-sm:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]';

// "2 jalons sur 4 (dont 1 après reprise), 1 non conforme": the milestones conform after a rework and the ones not conform are told when there are some
const wordsOf = (d: Delivery) => {
  const p = milestoneProgress(d), rw = d.milestones.filter(m => milestoneStatus(m) === 'reworked').length;
  return p.total ? `${plural(p.done, 'jalon')} sur ${p.total}${rw ? ` (dont ${rw} après reprise)` : ''}${p.ko ? `, ${plural(p.ko, 'non conforme')}` : ''}` : 'Aucun jalon';
};
function Segs({ d }: { d: Delivery }) {
  return (
    <span className="flex w-[92px] shrink-0 gap-0.5" role="img" aria-label={`Jalons : ${wordsOf(d)}`}>
      {d.milestones.map((m, i) => <span key={m.id ?? i} title={`Jalon ${i + 1}${m.label.trim() ? ` « ${m.label.trim()} »` : ''} : ${SEG_WORD[milestoneStatus(m)]}`} className={`h-2 flex-1 rounded-full ${SEG[milestoneStatus(m)]}`} />)}
    </span>
  );
}

// What the order says about itself, without repeating the badge: the first task, or the facts (promised day, reservations, quantity)
// The promised day is the one every screen reads (`promisedOn`: the one typed on the order, else the one of the quote)
function about(d: Delivery, st: DeliveryState, mine: ReceptionTodo[], now: Date, state: State) {
  const today = isoDate(now), promised = promisedOn(state, d), late = promised && BEFORE.includes(st) && promised < today ? daysBetween(promised, today) ?? 0 : 0;
  const rv = openReserves(d).length, left = remainingQty(d), got = qtyReceived(d);
  const facts = [
    promised && SHOW_PROMISED.includes(st) && !mine.some(t => t.kind === 'late-delivery') ? `Promise le ${fmtMoment(promised)}${late ? `, ${plural(late, 'jour')} de retard` : ''}` : '',
    rv ? plural(rv, 'réserve à lever', 'réserves à lever') : '',
    d.qty != null && got > 0 && left ? `${qtyPlural(got, 'reçue')} sur ${qtyFr(d.qty)}` : '',
  ].filter(Boolean);
  const first = mine[0];
  return { task: first ? nb(`${shortTask(first, d)}${mine.length > 1 ? ` · ${plural(mine.length - 1, 'autre tâche', 'autres tâches')}` : ''}`) : '', bad: first?.tone === 'bad', facts: nb(facts.join(' · ')) };
}

// A small menu of the other moves; closes on a tap outside and on Escape
function Menu({ d, acts }: { d: Delivery; acts: RcAct[] }) {
  const [on, setOn] = useState(false), ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on) return;
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOn(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOn(false); };
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [on]);
  if (!acts.length) return null;
  return (
    <span ref={ref} className="relative">
      <button type="button" aria-expanded={on} aria-label={`Autres actions : ${orderName(d)}`} title="Autres actions" onClick={() => setOn(!on)} className={ICON_BTN}><MoreHorizontal size={16} aria-hidden /></button>
      {on && (
        <ul className="absolute right-0 top-full z-30 mt-1 min-w-[13rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {acts.map(a => (
            <li key={a.label}>
              <button type="button" onClick={() => { setOn(false); a.run(); }}
                className={`block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${a.danger ? 'text-red-700' : 'text-slate-800'}`}>{a.label}</button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

interface Props { d: Delivery; state: State; todos: ReceptionTodo[]; now: Date; onOpen(): void; onField(kind: 'jalon' | 'reception'): void; onPrint(): void; menu: RcAct[]; onGo?(focus: string): void }

// The one step that comes next, as ONE button: the verb of the first task of the order when the task has a place of its own (release, lift a reservation, checks, reception), else the full screen
// that suits the order. The other full screens go behind "…" (the sheet to print goes first there).
function nextStep(d: Delivery, mine: ReceptionTodo[], go?: (focus: string) => void): { label: string; full: string; run(f: Props['onField']): void; other: 'jalon' | 'reception' | null } {
  const t = mine.find(x => ['release', 'reserve', 'reserve-late', 'milestone', 'blocked', 'unsigned', 'ship'].includes(x.kind) || (x.kind === 'defect' && !x.reserveId));
  if (t && go && (t.kind === 'release' || t.kind === 'reserve' || t.kind === 'reserve-late')) {
    const lift = t.kind !== 'release';
    return { label: lift ? 'Lever' : 'Libérer', full: lift ? 'Lever la réserve' : 'Libérer la commande', run: () => go(receptionFocus(t)), other: null };
  }
  const kind = t ? (t.kind === 'unsigned' || t.kind === 'ship' ? 'reception' : 'jalon') : fieldKind(d);
  return { label: kind === 'jalon' ? 'Contrôler' : 'Réception', full: kind === 'jalon' ? 'Contrôles de la commande' : 'Réception chez le client', run: f => f(kind), other: kind === 'jalon' ? 'reception' : 'jalon' };
}

// ONE button in colour, the next step ("Contrôler", "Réception", "Libérer" or "Lever"), then "…": the other full screens and the sheet to print are in the menu. An archived order keeps the menu only.
function Quick({ d, mine, onField, onGo, onPrint, menu }: Pick<Props, 'd' | 'onField' | 'onGo' | 'onPrint' | 'menu'> & { mine: ReceptionTodo[] }) {
  const step = nextStep(d, mine, onGo), both = step.other === null;
  const others: RcAct[] = d.archivedAt ? [] : [
    ...((both || step.other === 'jalon') ? [{ label: 'Contrôler les jalons', run: () => onField('jalon') }] : []),
    ...((both || step.other === 'reception') ? [{ label: 'Réception chez le client', run: () => onField('reception') }] : []),
  ];
  return (
    <span className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
      {!d.archivedAt && <Button kind="primary" className="flex-1 sm:flex-none" aria-label={`${step.label} : ${orderName(d)}`} title={step.full} onClick={() => step.run(onField)}>{step.label}</Button>}
      <Menu d={d} acts={[...others, { label: 'Imprimer la fiche suiveuse', run: onPrint }, ...menu]} />
    </span>
  );
}

// The name of the button that opens an order is what the card shows: the reference, the customer and the badge of the state (a voice command says what is read on the screen);
// the first task and the milestones are its description
const nameOf = (d: Delivery, st: DeliveryState, altered: boolean) => `Ouvrir la commande ${orderName(d)}, ${clientName(d)} : ${DELIVERY_STATE[st].label}${altered ? ', scellé modifié' : ''}`;

export function RcCard({ d, state, todos, now, onOpen, onField, onGo, onPrint, menu }: Props) {
  const st = deliveryState(d, now, state.params), lv = deliveryLevel(d, todos, state.params, now), mine = todos.filter(t => t.deliveryId === d.id), a = about(d, st, mine, now, state), altered = mine.some(t => t.kind === 'seal'), uid = useId();
  return (
    <article className={`flex flex-col rounded-xl border bg-white transition hover:shadow-md ${BORDER[lv.level]} ${d.archivedAt ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onOpen} className="flex-1 space-y-1.5 rounded-t-xl p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark"
        aria-label={nameOf(d, st, altered)} aria-describedby={`${uid}-w ${uid}-t`}>
        <div className="line-clamp-1 text-xs font-bold text-slate-900">{orderName(d)} · {clientName(d)}</div>
        <div className="line-clamp-1 text-xs text-slate-600">{d.item.trim() || 'Livrable à préciser'}</div>
        <div className="flex flex-wrap items-center gap-1.5"><StateBadge st={st} />{altered && <SealBadge />}</div>
        <div className="flex items-center gap-2"><Segs d={d} /><span id={`${uid}-w`} className="text-xs text-slate-600">{wordsOf(d)}</span></div>
        <div id={`${uid}-t`} className={`line-clamp-2 min-h-[2rem] text-xs ${a.bad ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{a.task || (d.archivedAt ? nb(`Archivée le ${fmtMoment(d.archivedAt)}${d.archivedNote ? ` : ${d.archivedNote}` : ''}`) : 'Aucune tâche en attente')}</div>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-slate-100 px-3 py-1.5">
        {a.facts && <span className="min-w-0 text-xs text-slate-500">{a.facts}</span>}
        <Quick d={d} mine={mine} onField={onField} onGo={onGo} onPrint={onPrint} menu={menu} />
      </div>
    </article>
  );
}

export function RcLine({ d, state, todos, now, onOpen, onField, onGo, onPrint, menu }: Props) {
  const st = deliveryState(d, now, state.params), mine = todos.filter(t => t.deliveryId === d.id), a = about(d, st, mine, now, state), uid = useId();
  const badge = <span className="inline-flex flex-wrap items-center gap-1.5"><StateBadge st={st} />{mine.some(t => t.kind === 'seal') && <SealBadge />}</span>;
  return (
    <li className={`flex flex-col gap-1 pb-2 sm:flex-row sm:items-center sm:pb-0 ${d.archivedAt ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onOpen} aria-label={nameOf(d, st, mine.some(t => t.kind === 'seal'))} aria-describedby={`${uid}-t`}
        className="flex min-w-0 items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50 sm:flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-xs font-semibold text-slate-900 sm:truncate">{orderName(d)} · {clientName(d)}<span className="font-normal text-slate-500"> · {d.item.trim() || 'Livrable à préciser'}</span></span>
          <span id={`${uid}-t`} className={`line-clamp-2 block text-xs sm:truncate ${a.bad ? 'font-semibold text-red-700' : 'text-slate-500'}`}><span className="sm:hidden">{wordsOf(d)} · </span>{a.task || a.facts || (d.archivedAt ? `Archivée le ${fmtMoment(d.archivedAt)}` : 'Aucune tâche en attente')}</span>
          <span className="mt-1 block sm:hidden">{badge}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex"><Segs d={d} /><span className="w-32 text-xs text-slate-600">{wordsOf(d)}</span></span>
        <span className="hidden max-w-[11rem] shrink-0 truncate text-right text-xs text-slate-500 sm:block">{a.task ? a.facts : ''}</span>
        <span className="hidden shrink-0 sm:block">{badge}</span>
      </button>
      <Quick d={d} mine={mine} onField={onField} onGo={onGo} onPrint={onPrint} menu={menu} />
    </li>
  );
}

// What a card needs from the register to act, held in ONE object that never changes (it reads the latest drawing of the register when it is called): so that a card is not drawn again at every key
// of the search, nor when the list grows by a page. `menu(d)` is read while the card is drawn, `go`/`open`/`print` when a button is touched.
export interface RcCtl { go(focus: string): void; open(d: Delivery): void; print(d: Delivery): void; menu(d: Delivery): RcAct[] }
// A card or a line of the register, drawn again only when its order, the state, its own tasks, the day or the right to delete changed (`team`: the menu of a team view has no "Supprimer")
export const RcOrder = memo(function RcOrder({ d, state, todos, now, ctl, line = false }: { d: Delivery; state: State; todos: ReceptionTodo[]; now: Date; ctl: RcCtl; line?: boolean; team?: boolean }) {
  const p = { d, state, todos, now, onOpen: () => ctl.open(d), onField: (k: 'jalon' | 'reception') => ctl.go(`${k}:${d.id}`), onGo: (f: string) => ctl.go(f), onPrint: () => ctl.print(d), menu: ctl.menu(d) };
  return line ? <RcLine {...p} /> : <RcCard {...p} />;
});
