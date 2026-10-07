// What is left to do on the powers, most pressing first (the order is the one of the domain: red before amber, the act that cannot wait, then the day). Each line is one button that
// does the gesture or opens the place where it is done: the practice of a deputy opens the form of the practice, an envelope its check, an absence its closing. Three lines at first,
// five more at each press; with a person picked ("Je suis"), "Mes tâches" keeps hers.
import { Fragment, useId, useState } from 'react';
import { daysBetween } from '../../domain/base';
import { norm } from '../../domain/instructions';
import { isoDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { powerFocus, type PowerTodo, type PowerTodoKind } from '../../domain/powersAll';
import { frDate } from '../../domain/periods';
import { Card } from '../common';
import { LINK, TOUCH } from './PwBits';

const SHOWN = 3, MORE = 5;
const VERB: Record<PowerTodoKind, string> = {
  none: 'Nommer', one: 'Nommer', left: 'Remplacer', today: 'Voir', gap: 'Voir', unsealed: 'Refermer', practice: "A fait l'acte", validate: 'Valider', sign: 'Signer', contact: 'Compléter', forms: 'Compléter', vault: 'Vérifier', cover: 'Clore', review: 'Relire',
};
// The text of these tasks says what is asked, and their day is the one of the fact, not a deadline: no second date next to it
const NO_DATE: PowerTodoKind[] = ['none', 'one', 'left', 'today', 'gap', 'forms', 'validate', 'review', 'cover', 'sign', 'contact'];

export function PwQueue({ todos, me, onOpen }: { todos: PowerTodo[]; me: string; onOpen(focus: string): void }) {
  const [n, setN] = useState(SHOWN), [mine, setMine] = useState(false), uid = useId();
  const mineList = me ? todos.filter(t => norm(t.who) === norm(me)) : [], list = mine && me ? mineList : todos, shown = list.slice(0, n), rest = list.length - shown.length, today = isoDate(new Date());
  if (!todos.length) return <Card className="p-3 sm:p-4"><h2 className="text-sm font-bold text-delacour-primary">À faire</h2><p className="text-xs text-slate-600">Rien à faire pour le moment.</p></Card>;
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-delacour-primary">À faire : {todos.length}</h2>
          <p className="hidden max-w-3xl text-xs text-slate-600 sm:block">Du plus pressant au moins pressant. Un seul geste fait ce qui est demandé ou ouvre la fonction au bon endroit.</p>
        </div>
        {me && <button type="button" aria-pressed={mine} onClick={() => { setMine(!mine); setN(SHOWN); }} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TOUCH} ${mine ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Mes tâches : {mineList.length}</button>}
      </div>
      {!list.length && <p className="py-2 text-xs text-slate-600">Aucune tâche au nom de {me}.</p>}
      <ul className="divide-y divide-slate-100">
        {shown.map((t, i) => {
          const late = t.due && !NO_DATE.includes(t.kind) ? daysBetween(t.due, today) ?? 0 : 0;
          const when = !t.due || NO_DATE.includes(t.kind) ? '' : t.kind === 'unsealed' ? `ouverte depuis le ${frDate(t.due)}` : late > 0 ? '' : t.due === today ? "aujourd'hui" : `avant le ${frDate(t.due)}`;
          return (
            <li key={t.id}>
              <button type="button" aria-label={`${VERB[t.kind]} : ${t.text}`} aria-describedby={`${uid}-${i}`} onClick={() => onOpen(powerFocus(t))}
                className={`flex w-full flex-col gap-1 rounded-lg px-1 py-2 text-left text-xs hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark sm:flex-row sm:items-center sm:gap-3 ${TOUCH}`}>
                <span id={`${uid}-${i}`} className="block min-w-0 text-slate-800 sm:flex-1">
                  {t.tone === 'bad'
                    ? <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 align-middle text-xs font-bold text-red-700"><span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />Pressant</span>
                    : <><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" /><span className="sr-only">À faire : </span></>}
                  {t.text}
                </span>
                <span className="flex items-center justify-between gap-2 sm:shrink-0">
                  <span className="min-w-0 text-xs text-slate-600">{[
                    late > 0 ? <span className="font-semibold text-red-700">en retard de {plural(late, 'jour')}</span> : when, t.who,
                  ].filter(Boolean).map((x, k) => <Fragment key={k}>{k ? ' · ' : ''}{x}</Fragment>)}</span>
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
}
