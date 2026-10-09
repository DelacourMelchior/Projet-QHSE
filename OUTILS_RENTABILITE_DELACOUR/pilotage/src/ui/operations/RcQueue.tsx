// What is left to do on the orders, most pressing first (the order is the one of the domain: red before amber, then by day). Each line is one button that opens the right
// place: the task on the whole width of the screen (the order is named in it), then, under it on a phone, the day and a short word ("Lever", "Libérer"; the full name stays for
// a screen reader). Three tasks at first, five more at each press; "Mes tâches" keeps those of the person picked for the session. The name of a button is short ("Lever CMD-2026-047"),
// the sentence of the task is its description (read once, not twice).
import { Fragment, memo, useId, useState } from 'react';
import type { ReceptionTodo, ReceptionTodoKind, State } from '../../domain/types';
import { daysBetween } from '../../domain/base';
import { norm } from '../../domain/text';
import { plural } from '../../domain/receptions';
import { receptionFocus } from '../../domain/receptionsAll';
import { isoDate } from '../../domain/periods';
import { Card } from '../common';
import { dayWords, fmtMoment, remembered } from './RcBits';

const SHOWN = 3, MORE = 5;
const VERB: Record<ReceptionTodoKind, string> = {
  milestone: 'Contrôler', blocked: 'Traiter', defect: 'Décider', release: 'Libérer', ship: 'Livrer', 'late-delivery': 'Livrer', unsigned: 'Faire signer', reserve: 'Lever', 'reserve-late': 'Lever',
  refused: 'Donner suite', 'next-lot': 'Livrer le reste', feedback: 'Poser le bilan', seal: 'Vérifier',
};
// The text of these tasks already says the day (late delivery, reservation late), or their day is the one of the finding (a milestone not conform, a refusal: it is not a deadline,
// so it is never told "en retard"; a PV whose content no longer matches its seal has no deadline): no second one next to it
const DATE_IN_TEXT: ReceptionTodoKind[] = ['late-delivery', 'reserve-late', 'blocked', 'refused', 'seal'];
const LINK = 'text-xs font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';

export const RcQueue = memo(function RcQueue({ todos, state, onOpen }: { todos: ReceptionTodo[]; state: State; onOpen(focus: string): void }) {
  const [n, setN] = useState(SHOWN), [mineOnly, setMineOnly] = useState(false), uid = useId();
  const me = remembered(), mine = me ? todos.filter(t => norm(t.who) === norm(me)) : [];
  const today = isoDate(new Date()), list = mineOnly && me ? mine : todos, shown = list.slice(0, n), rest = list.length - shown.length;
  if (!todos.length) return <Card className="p-3 sm:p-4"><h2 className="text-sm font-bold text-delacour-primary">À faire</h2><p className="text-xs text-slate-500">Rien à faire pour le moment.</p></Card>;
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-delacour-primary">À faire&#8239;: {todos.length}</h2>
          <p className="hidden max-w-3xl text-xs text-slate-500 sm:block">Du plus pressant au moins pressant. Un seul geste ouvre la commande au bon endroit.</p>
        </div>
        {me && <button type="button" aria-pressed={mineOnly} onClick={() => { setMineOnly(!mineOnly); setN(SHOWN); }} className={`rounded-full border px-2.5 py-1 text-xs font-semibold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${mineOnly ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Mes tâches&#8239;: {mine.length}</button>}
      </div>
      {!list.length && <p className="py-2 text-xs text-slate-500">Aucune tâche au nom de {me}.</p>}
      <ul className="divide-y divide-slate-100">
        {shown.map((t, i) => {
          const d = state.deliveries[t.deliveryId];
          if (!d) return null;
          const late = t.due && !DATE_IN_TEXT.includes(t.kind) ? daysBetween(t.due, today) ?? 0 : 0, name = d.ref.trim() || d.item.trim() || 'commande sans nom';
          return (
            <li key={t.id}>
              <button type="button" aria-label={`${VERB[t.kind]} ${name}`} aria-describedby={`${uid}-${i}`} onClick={() => onOpen(receptionFocus(t))}
                className="flex w-full flex-col gap-1 rounded-lg px-1 py-2 text-left text-xs hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark max-sm:min-h-[44px] sm:flex-row sm:items-center sm:gap-3 [@media(pointer:coarse)]:min-h-[44px]">
                <span id={`${uid}-${i}`} className="block min-w-0 text-slate-800 sm:flex-1">
                  {t.tone === 'bad'
                    ? <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 align-middle text-xs font-bold text-red-700"><span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />Pressant</span>
                    : <><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" /><span className="sr-only">À faire&#8239;: </span></>}
                  {dayWords(t.text)}
                </span>
                <span className="flex items-center justify-between gap-2 sm:shrink-0">
                  <span className="min-w-0 text-xs text-slate-500 first-letter:uppercase">{[
                    t.due && !DATE_IN_TEXT.includes(t.kind) ? (late > 0 ? <span className="font-semibold text-red-700">en retard de {plural(late, 'jour')}</span> : `avant le ${fmtMoment(t.due)}`) : '',
                    t.kind === 'refused' && t.due ? `réception refusée le ${fmtMoment(t.due)}` : '', t.who,
                  ].filter(Boolean).map((x, i) => <Fragment key={i}>{i ? ' · ' : ''}{x}</Fragment>)}</span>
                  <span aria-hidden className="ml-auto shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{VERB[t.kind]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {(rest > 0 || n > SHOWN) && (
        <div className="flex flex-wrap gap-x-4">
          {rest > 0 && <button type="button" className={LINK} onClick={() => setN(n + MORE)}>Voir {Math.min(MORE, rest)} de plus</button>}
          {n > SHOWN && <button type="button" className={LINK} onClick={() => setN(SHOWN)}>Afficher moins</button>}
        </div>
      )}
    </Card>
  );
});
