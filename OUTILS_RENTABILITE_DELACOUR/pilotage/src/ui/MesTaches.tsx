// "Mes tâches": everything one person has to do, from every tool, by due date; calendar file and weekly sheet to print.
import { useState } from 'react';
import { CalendarPlus, ChevronRight, FileDown } from 'lucide-react';
import { allTasks, icsOf, peopleWithTasks, type Task } from '../domain/tasks';
import { weekPdf } from '../domain/reportPdf';
import { daysBetween } from '../domain/base';
import { frDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, ToolHeader } from './common';
import { downloadFile, fileSlug } from './download';
import type { Nav, ToolId } from './tools';

export function MesTaches({ nav }: { nav: Nav }) {
  const { state, author } = useStore();
  const all = state ? allTasks(state) : [];
  const people = peopleWithTasks(all);
  const [who, setWho] = useState(() => people.find(p => p.toLowerCase() === author.trim().toLowerCase()) || '');
  if (!state) return null;
  const now = new Date();
  const mine = all.filter(t => (who === '*' ? true : who ? t.who === who : !t.who));
  const late = (t: Task) => !!t.due && (daysBetween(t.due, now) ?? 0) > 0;
  const groups: [string, Task[]][] = [
    ['En retard', mine.filter(late)],
    ['Cette semaine', mine.filter(t => t.due && !late(t) && (daysBetween(t.due, now) ?? 0) > -7)],
    ['Plus tard', mine.filter(t => t.due && (daysBetween(t.due, now) ?? 0) <= -7)],
    ['Sans date', mine.filter(t => !t.due)],
  ];
  const label = who === '*' ? 'toute l\'équipe' : who || 'non attribué';
  const open = (t: Task) => (t.tool ? nav.tool(t.tool as ToolId, t.focus) : nav.openAction(t.focus));
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Mes tâches" text="Tout ce qu'il y a à faire dans les 19 outils, par échéance : actions, rappels clients, décisions du bac rouge, tests, contrôles, relances.">
          <select value={who} onChange={e => setWho(e.target.value)} aria-label="Personne" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
            <option value="">Non attribué</option>
            <option value="*">Toute l'équipe</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button onClick={() => downloadFile(`Echeances-${fileSlug(label)}.ics`, icsOf(mine, state.settings.companyName), 'text/calendar')} title="Fichier à ouvrir dans Outlook, Google Agenda ou le téléphone"><CalendarPlus size={14} />Agenda</Button>
          <Button onClick={() => downloadFile(`Semaine-${fileSlug(label)}.pdf`, weekPdf(mine, who === '*' ? '' : who, { company: state.settings.companyName, date: now }), 'application/pdf')}><FileDown size={14} />Semaine (PDF)</Button>
        </ToolHeader>
        {!mine.length && <p className="py-6 text-center text-xs text-slate-500">Rien à faire pour {label}.</p>}
        {groups.filter(([, xs]) => xs.length).map(([title, xs]) => (
          <section key={title} className="space-y-1">
            <h3 className={`text-xs font-bold ${title === 'En retard' ? 'text-red-700' : 'text-slate-900'}`}>{title} <span className="font-normal text-slate-500">{xs.length}</span></h3>
            <ul className="divide-y divide-slate-100">
              {xs.map(t => (
                <li key={t.id}>
                  <button type="button" onClick={() => open(t)} className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-slate-50">
                    <span className={`w-20 shrink-0 font-mono text-[11px] ${late(t) ? 'font-bold text-red-700' : 'text-slate-600'}`}>{t.due ? frDate(t.due) : '—'}</span>
                    <span className="min-w-0 flex-1 text-xs text-slate-900">{t.text}{who === '*' && <span className="text-slate-500"> · {t.who || 'non attribué'}</span>}</span>
                    <span className="shrink-0 font-mono text-[11px] text-delacour-golddark">{t.tool || 'Action'}</span>
                    <ChevronRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-[11px] text-slate-500">Astuce : importez le fichier Agenda chaque lundi ; les échéances apparaissent dans votre calendrier avec un rappel.</p>
      </Card>
    </div>
  );
}
