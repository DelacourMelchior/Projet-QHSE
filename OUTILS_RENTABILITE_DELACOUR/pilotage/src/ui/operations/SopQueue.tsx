// What is left to do on the sheets, most pressing first, each with the one tap that does it: the sheet opens on the right tab, or the move is made at once.
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Sop, State } from '../../domain/types';
import { acknowledge, inform, postSheet, reviewed, versionColor, type SopTodo, type SopTab } from '../../domain/instructions';
import { frDate } from '../../domain/periods';
import { Button, Card, ToolHeader } from '../common';
import { useSopAct } from './SopBits';

const TAB: Record<SopTodo['kind'], SopTab> = { update: 'life', validate: 'life', read: 'people', display: 'display', review: 'life', renew: 'people', answer: 'life', inform: 'display' };

export function SopQueue({ state, todos, onOpen }: { state: State; todos: SopTodo[]; onOpen(s: Sop, tab: SopTab): void }) {
  const act = useSopAct();
  const [all, setAll] = useState(false);
  const shown = all ? todos : todos.slice(0, 6);
  if (!todos.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <ToolHeader title={`À faire : ${todos.length}`} text="Du plus pressant au moins pressant. Un tap fait le geste ou ouvre la fiche au bon endroit." />
      <ul className="divide-y divide-slate-100">
        {shown.map(t => {
          const sop = state.sops[t.sopId];
          if (!sop) return null;
          const open = <Button className="!py-1" onClick={() => onOpen(sop, TAB[t.kind])}>Ouvrir</Button>;
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.tone === 'bad' ? 'bg-red-600' : 'bg-amber-500'}`} />
              <span className="sr-only">{t.tone === 'bad' ? 'Pressant : ' : 'À faire : '}</span>
              <span className="min-w-0 flex-1 text-slate-800">{t.text}{t.due ? <span className="text-slate-500"> · avant le {frDate(t.due)}</span> : null}{t.people?.length && t.kind === 'read' ? <span className="text-slate-500"> · {t.people.join(', ')}</span> : null}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                {t.kind === 'read' && t.people!.slice(0, 3).map(n => <Button key={n} className="!py-1" onClick={() => act(sop.id, x => acknowledge(x, n, today))}><Check size={13} />{n}</Button>)}
                {t.kind === 'inform' && <Button className="!py-1" onClick={() => act(sop.id, (x, by) => inform(x, by))}>Équipe informée</Button>}
                {t.kind === 'review' && <Button className="!py-1" onClick={() => act(sop.id, (x, by) => reviewed(x, by))}>Relue, rien ne change</Button>}
                {t.kind === 'display' && <Button className="!py-1" onClick={() => act(sop.id, (x, by) => postSheet(x, by, true))} title={`Fiche posée aujourd'hui, ancienne retirée (cadre ${versionColor(sop.version).name})`}><Check size={13} />Posée</Button>}
                {open}
              </span>
            </li>
          );
        })}
      </ul>
      {todos.length > 6 && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => setAll(!all)} aria-expanded={all}>{all ? 'Afficher moins' : `Voir les ${todos.length - 6} autres`}</button>}
    </Card>
  );
}
