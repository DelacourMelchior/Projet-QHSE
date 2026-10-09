// What is left to do on the equipment, the cabinet and the checks, most pressing first, each line with the one touch that does it: the routine opens full screen,
// an order is noted, the cabinet is counted, or the sheet (or the part) opens on the right tab. A move made by a touch offers "Annuler" through `offer`.
// Under 640 px the queue is folded (its title says how many tasks, and how many are pressing): the register of the equipment comes first, one touch opens it.
import { useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { MaintTodo, Spare, State } from '../../domain/types';
import { daysBetween, type Insight } from '../../domain/base';
import { txt } from '../../domain/maintenance';
import { orderSpare } from '../../domain/maintenanceSpares';
import { frDate, isoDate } from '../../domain/periods';
import { Button, Card } from '../common';
import type { Nav } from '../tools';
import { num, onPhone, useCountCabinet, useSpareMove } from './EqBits';
import { eqName, plural } from './EqCards';
import type { EqTab } from './EqProps';

const SHOWN = 3;
const spareName = (sp: Spare) => sp.name.trim() || sp.ref.trim() || 'Pièce sans nom';
// The text of these tasks already says the date (late delivery, date limit, last count, check due in N days): no second one next to it
const DATE_IN_TEXT: MaintTodo['kind'][] = ['order-late', 'expiry', 'count', 'out', 'check', 'remark', 'contract'];
// Urgencies that have no deadline: the date they carry is the day of the fact (the stop began, the danger was reported), not a day to meet. They say "depuis",
// never "avant le" or "en retard de N jours". A danger on which a date limit was typed keeps it as a deadline.
const SINCE: MaintTodo['kind'][] = ['stopped', 'plan-b', 'danger'];

interface Props {
  state: State; todos: MaintTodo[]; nav: Nav;
  insights?: Insight[];   // the facts the queue does not carry (maintInsights leaves out the ones it does): one card says them all, once
  offer(what: string, back: () => void): void;   // "Annuler" bar of the screen
  onEq(id: string, tab: EqTab): void; onRoutine(id: string): void; onSpare(id: string): void; onSettings(): void;
}

export function EqQueue({ state, todos, nav, insights = [], offer, onEq, onRoutine, onSpare, onSettings }: Props) {
  const spareMove = useSpareMove(offer), counted = useCountCabinet(offer);
  const [all, setAll] = useState(false), [facts, setFacts] = useState(false), [unfolded, setUnfolded] = useState(() => !onPhone());
  if (!todos.length && !insights.length) return null;
  const today = isoDate(new Date());
  const shown = all ? todos : todos.slice(0, SHOWN);

  // a part ordered with one touch: the quantity brings the stock back to the minimum; "Annuler" takes this order away (not an order made meanwhile by someone else)
  const ordered = (sp: Spare) => {
    const qty = Math.max(1, num(sp.min) - num(sp.stock));
    spareMove(sp.id, `Commande de ${qty} notée : ${spareName(sp)}`, x => orderSpare(x, qty, today));
  };
  // the cabinet counted, nothing to report (`counted`): the date and the person on every part; "Annuler" gives each part its previous count back

  const urgent = todos.filter(t => t.tone === 'bad').length;
  return (
    <Card className="p-3 sm:p-4">
      <details open={unfolded} onToggle={e => setUnfolded(e.currentTarget.open)} className="group space-y-2">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 sm:min-h-0">
          <h2 className="min-w-0 text-sm font-bold text-delacour-primary">{todos.length ? `À faire : ${todos.length}` : `À savoir : ${insights.length}`}{urgent > 0 && <span className="font-semibold text-red-700"> · dont {plural(urgent, 'pressante')}</span>}</h2>
          <ChevronDown size={16} aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-180" />
        </summary>
        {todos.length > 0 && <p className="max-w-3xl text-[11px] text-slate-500">Du plus pressant au moins pressant. Toucher le bouton d'une ligne fait le geste ou ouvre la fiche au bon endroit.</p>}
        <ul className="divide-y divide-slate-100">
        {shown.map((t, i) => {
          const eq = t.eqId ? state.equipments[t.eqId] : undefined, sp = t.spareId ? state.spares[t.spareId] : undefined;
          if ((t.eqId && !eq) || (t.spareId && !sp)) return null;
          const dated = !!t.due && !DATE_IN_TEXT.includes(t.kind), since = SINCE.includes(t.kind) && !(t.kind === 'danger' && txt(eq?.anomalies?.find(a => a.id === t.ref)?.dueAt));
          const late = dated && !since ? daysBetween(t.due, today) ?? 0 : 0, name = eq ? eqName(eq) : sp ? spareName(sp) : "l'armoire";
          const open = (what: string, f: () => void, label = 'Ouvrir') => <Button className="!py-1" aria-label={`Ouvrir ${what} : ${name}`} onClick={f}>{label}</Button>;
          let buttons: ReactNode = null;
          if (t.kind === 'routine' && eq) buttons = <Button className="!py-1" aria-label={`Faire la routine : ${name}`} onClick={() => onRoutine(eq.id)}>Faire la routine</Button>;
          else if (t.kind === 'order' && sp) {
            buttons = <>
              <Button className="!py-1" aria-label={`Commandée aujourd'hui : ${name}`} title={`Commande de ${Math.max(1, num(sp.min) - num(sp.stock))} notée à la date du jour`} onClick={() => ordered(sp)}><Check size={13} />Commandée aujourd'hui</Button>
              {open('la pièce', () => onSpare(sp.id))}
            </>;
          }
          else if (t.kind === 'count') buttons = <Button className="!py-1" onClick={counted}><Check size={13} />Armoire comptée, rien à signaler</Button>;
          else if (eq && ['anomaly', 'danger', 'stopped'].includes(t.kind)) buttons = open(t.kind === 'stopped' ? "l'arrêt" : "l'anomalie", () => onEq(eq.id, 'issues'));
          else if (eq && ['check', 'remark', 'contract'].includes(t.kind)) buttons = open('les contrôles', () => onEq(eq.id, 'checks'));
          else if (sp && ['expiry', 'out', 'order-late'].includes(t.kind)) buttons = open('la pièce', () => onSpare(sp.id));
          else if (t.kind === 'key') buttons = <Button className="!py-1" onClick={onSettings}>Ouvrir les réglages</Button>;
          else if (t.kind === 'plan-b' && t.ref) buttons = <Button className="!py-1" aria-label={`Ouvrir le Plan B : ${name}`} onClick={() => nav.openRisk(t.ref!)}>Ouvrir le Plan B</Button>;
          else if (eq) buttons = open('la fiche', () => onEq(eq.id, 'issues'));
          return (
            <li key={t.id} className={`flex flex-wrap items-center gap-2 py-2 text-xs ${i === 0 && t.tone === 'bad' ? 'rounded-md bg-red-50 px-2' : ''}`}>   {/* the most pressing one, when it is red */}
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.tone === 'bad' ? 'bg-red-600' : 'bg-amber-500'}`} />
              <span className="sr-only">{t.tone === 'bad' ? 'Pressant : ' : 'À faire : '}</span>
              <span className="min-w-0 flex-1 text-slate-800">
                {t.text}
                {dated && (since ? (t.kind !== 'danger' ? null : <span className="text-slate-500"> · depuis le {frDate(t.due)}</span>)   // the text of a stop already says "depuis 30 h"
                  : late > 0 ? <span className={`font-semibold ${t.tone === 'bad' ? 'text-red-700' : 'text-amber-800'}`}> · en retard de {plural(late, 'jour')}</span> : <span className="text-slate-500"> · avant le {frDate(t.due)}</span>)}
                {t.who ? <span className="text-slate-500"> · {t.who}</span> : null}
              </span>
              {buttons && <span className="flex flex-wrap items-center gap-1.5">{buttons}</span>}
            </li>
          );
        })}
        </ul>
        {todos.length > SHOWN && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Afficher moins' : todos.length - SHOWN === 1 ? 'Voir 1 autre' : `Voir les ${todos.length - SHOWN} autres`}</button>}
        {insights.length > 0 && (todos.length > 0
          ? <button type="button" className="block text-[11px] font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]" onClick={() => setFacts(!facts)} aria-expanded={facts}>{facts ? 'Masquer les faits à savoir' : `À savoir aussi : ${insights.length}`}</button>
          : null)}
        {insights.length > 0 && (facts || !todos.length) && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {insights.map(i => (
              <li key={i.key} className="flex items-start gap-2.5 py-2 text-xs text-slate-700">
                <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.tone === 'bad' ? 'bg-red-600' : i.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                <span><span className="sr-only">{i.tone === 'bad' ? 'Important : ' : i.tone === 'warn' ? 'À noter : ' : 'Bon point : '}</span><strong className="font-semibold text-slate-900">{i.title}</strong> · {i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </Card>
  );
}
