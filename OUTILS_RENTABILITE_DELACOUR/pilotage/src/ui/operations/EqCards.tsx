// A piece of equipment in the register: a card with its picture, its status in colour and in words, the strip of the last routines, how complete the sheet is,
// who does the routine and the next due date; or a line of the list. Quick buttons (all at 44 px on a touch screen): "Faire la routine" (in words: the most frequent
// gesture of the tool) opens the routine full screen, the printer alone prints the poster.
import { Printer } from 'lucide-react';
import type { Equipment, MaintTodo, State } from '../../domain/types';
import { addDays } from '../../domain/base';
import { completeness, eqLevel, eqStatus, eqTasks, inspectionState, kindLabel, kindOf, periodOf, routineOwner, strip } from '../../domain/maintenance';
import { nextDue } from '../../domain/maintenanceChecks';
import { frDate, isoDate, parseDate } from '../../domain/periods';
import { Pic } from '../../photo/Pic';
import { Button, StatusBadge } from '../common';
import { KindIcon, Strip } from './EqBits';
import { Ring } from './SopBits';

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
export const eqName = (e: Equipment) => e.name.trim() || 'Équipement sans nom';

// The next date the equipment asks for: the routine (end of the period when it is not made, start of the next one when it is) or a periodic check, the nearest first
export function nextStep(e: Equipment, state: State, now: Date): { text: string; date: string; past: boolean } | null {
  const st = eqStatus(e);
  if (st === 'retired') return null;
  const today = isoDate(now), p = state.params, found: { text: string; date: string }[] = [];
  if (st === 'service') {
    const per = periodOf(e, now, p), s = inspectionState(e, now, p);
    let date = per.to;
    if (s === 'late') date = periodOf(e, now, p, 1).to;
    if (s === 'ok') {
      // the first day after the period that opens another one (a daily routine skips the days off)
      date = addDays(per.to, 1);
      for (let i = 0; i < 4; i++) { const d = parseDate(date); if (!d || periodOf(e, d, p).from === date) break; date = addDays(date, 1); }
    }
    found.push({ text: s === 'ok' ? 'Routine' : 'Routine à faire', date });
  }
  (e.tasks || []).forEach(c => { const d = nextDue(e, c); if (d) found.push({ text: c.label.trim() || 'Contrôle', date: d }); });
  const first = found.sort((a, b) => a.date.localeCompare(b.date))[0];
  return first ? { ...first, past: first.date < today } : null;
}
const nextText = (n: ReturnType<typeof nextStep>) => (n ? (n.past ? `Échéance dépassée : ${n.text}, le ${frDate(n.date)}` : `Prochaine échéance : ${n.text}, le ${frDate(n.date)}`) : '');
// The same on one line where the room is short: the words give way (they end with "…"), the date is never cut
function NextStep({ n, className = '' }: { n: NonNullable<ReturnType<typeof nextStep>>; className?: string }) {
  return (
    <span className={`flex min-w-0 ${className}`} title={nextText(n)}>
      <span className="min-w-0 truncate">{n.past ? 'Échéance dépassée' : 'Prochaine échéance'} : {n.text}</span>
      <span className="shrink-0 whitespace-nowrap">, le {frDate(n.date)}</span>
    </span>
  );
}

// Who does the routine today (the deputy when the holder is away), else the manager
function ownerText(state: State, e: Equipment, now: Date) {
  const o = routineOwner(state, e, isoDate(now));
  return o.who ? `Routine : ${o.who}${o.deputy ? ' (suppléant)' : o.absent ? ' (absent, sans suppléant)' : ''}` : e.manager.trim() ? `Responsable : ${e.manager.trim()}` : 'Titulaire à nommer';
}
// The sentence under the status of a card or a line: the fact of its first task (the one the status names, same order: eqTasks), then how many others;
// a statement, never the infinitive of the queue; without a task, its next due date
export function cardText(e: Equipment, todos: MaintTodo[], state: State, now: Date): string {
  if (eqStatus(e) === 'retired') return `Retiré du service le ${frDate(e.retiredAt || '')}${e.retiredNote ? ` : ${e.retiredNote}` : ''}`;
  const mine = eqTasks(todos, e.id);
  return mine.length ? `${mine[0].fact ?? mine[0].text}${mine.length > 1 ? ` · et ${plural(mine.length - 1, 'autre point', 'autres points')}` : ''}` : nextText(nextStep(e, state, now));
}
const BORDER = { alert: 'border-red-300', warn: 'border-amber-300', ok: 'border-slate-200', pending: 'border-slate-200' } as const;
const ICON_BTN = 'inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 max-sm:min-h-[44px] max-sm:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]';

interface Props { e: Equipment; state: State; todos: MaintTodo[]; now: Date; onOpen(): void; onRoutine(): void; onPrint(): void; onReport?(): void }

// "Faire la routine" only where a routine can be made (a stopped or a retired equipment says why in its status)
// and not when the routine of the period is already made (the card says "Routine faite"; starting another one is a choice made from the sheet)
function Quick({ e, state, now, onRoutine, onPrint, onReport, className = '' }: Pick<Props, 'e' | 'state' | 'now' | 'onRoutine' | 'onPrint' | 'onReport'> & { className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-1 ${className}`}>
      {eqStatus(e) === 'service' && inspectionState(e, now, state.params) !== 'ok' && <Button className="!py-1" aria-label={`Faire la routine : ${eqName(e)}`} onClick={onRoutine}>Faire la routine</Button>}
      {onReport && eqStatus(e) !== 'retired' && <Button className="!py-1" aria-label={`Signaler un problème : ${eqName(e)}`} onClick={onReport}>Signaler</Button>}
      <button type="button" aria-label={`Imprimer l'affiche : ${eqName(e)}`} title="Imprimer l'affiche (A4)" onClick={onPrint} className={ICON_BTN}><Printer size={16} /></button>
    </span>
  );
}

export function EqCard({ e, state, todos, now, onOpen, onRoutine, onPrint, onReport }: Props) {
  const lv = eqLevel(e, todos), mine = eqTasks(todos, e.id), retired = eqStatus(e) === 'retired', next = nextStep(e, state, now);
  const pct = completeness(e).pct, kind = kindLabel(kindOf(e)), about = cardText(e, todos, state, now);
  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md ${BORDER[lv.level]} ${retired ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onOpen} className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold"
        aria-label={`Ouvrir la fiche de ${eqName(e)} : ${kind}, ${lv.label}${next ? `, ${nextText(next).toLowerCase()}` : ''}`}>
        <div className="relative aspect-[16/10] bg-slate-100">
          {e.photo ? <Pic value={e.photo} alt="" size="t" className="h-full w-full" /> : <div className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-slate-500"><KindIcon kind={kindOf(e)} size={26} className="text-slate-400" />Pas encore de photo</div>}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700"><KindIcon kind={kindOf(e)} size={12} />{kind}</span>
          {pct < 100 && <span className="absolute right-2 top-2"><Ring pct={pct} size={38} /></span>}
        </div>
        <div className="space-y-1.5 p-3">
          <div className="line-clamp-1 text-xs font-bold text-slate-900">{eqName(e)}</div>
          <div className="line-clamp-1 text-[11px] text-slate-500">{e.location.trim() || 'Emplacement à préciser'}</div>
          <div className="flex flex-wrap items-center gap-1.5"><StatusBadge level={lv.level} text={lv.label} />{e.group && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{e.group}</span>}</div>
          <div className="line-clamp-2 min-h-[2rem] text-[11px] text-slate-600">{about}</div>
        </div>
      </button>
      <div className="space-y-1.5 px-3 pb-2">
        {!retired && <Strip items={strip(e, now, state.params)} />}
        <div className="truncate text-[11px] text-slate-600">{ownerText(state, e, now)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 px-3 py-1">
        {mine.length > 0 && next && <NextStep n={next} className="flex-1 basis-[9rem] text-[11px] text-slate-500" />}
        <Quick e={e} state={state} now={now} onRoutine={onRoutine} onPrint={onPrint} onReport={onReport} className="ml-auto" />
      </div>
    </article>
  );
}

export function EqLine({ e, state, todos, now, onOpen, onRoutine, onPrint, onReport }: Props) {
  const lv = eqLevel(e, todos), mine = eqTasks(todos, e.id), retired = eqStatus(e) === 'retired', next = nextStep(e, state, now), kind = kindLabel(kindOf(e));
  const sub = cardText(e, todos, state, now) || kind;
  const badge = <StatusBadge level={lv.level} text={lv.label} />;
  return (
    <li className={`flex flex-wrap items-center gap-x-1 sm:flex-nowrap ${retired ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onOpen} aria-label={`Ouvrir la fiche de ${eqName(e)} : ${kind}, ${lv.label}${next ? `, ${nextText(next).toLowerCase()}` : ''}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold max-sm:basis-full">
        {e.photo ? <Pic value={e.photo} alt="" size="t" className="h-10 w-14 shrink-0 rounded" /> : <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400"><KindIcon kind={kindOf(e)} size={18} /></span>}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-xs font-semibold text-slate-900 sm:truncate">{eqName(e)}<span className="font-normal text-slate-500"> · {kind}{e.group ? ` · ${e.group}` : ''}</span></span>
          <span className="line-clamp-2 block text-[11px] text-slate-500">{sub}</span>
          <span className="mt-1 block sm:hidden">{badge}</span>
        </span>
        <span className="hidden max-w-[15rem] shrink-0 text-right text-[11px] text-slate-600 md:block">
          <span className="block truncate">{ownerText(state, e, now)}</span>
          {mine.length > 0 && next && <NextStep n={next} className="justify-end text-slate-500" />}
        </span>
      </button>
      <span className="hidden shrink-0 lg:block">{retired ? null : <Strip items={strip(e, now, state.params)} />}</span>
      <span className="hidden shrink-0 sm:block"><Ring pct={completeness(e).pct} size={36} /></span>
      <span className="hidden shrink-0 sm:block">{badge}</span>
      <Quick e={e} state={state} now={now} onRoutine={onRoutine} onPrint={onPrint} onReport={onReport} className="max-sm:pl-[4.5rem]" />
    </li>
  );
}
