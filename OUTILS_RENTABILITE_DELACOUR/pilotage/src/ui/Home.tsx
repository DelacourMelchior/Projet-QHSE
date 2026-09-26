// Home screen: the 5 processes and their tools, each with what needs attention now.
import { ChevronRight, FileDown, Lock } from 'lucide-react';
import { monthlyReportPdf } from '../domain/reportPdf';
import { GLOSSARY } from '../domain/base';
import { periodLabel, periodOfDate } from '../domain/periods';
import { downloadFile } from './download';
import { Button } from './common';
import { toolBadge } from '../domain/status';
import { useStore } from '../store/StoreContext';
import { Card, LEVEL_STYLE } from './common';
import { PROCESSES, toolsOf, type Nav } from './tools';

export function Home({ nav }: { nav: Nav }) {
  const { state, period, teamView } = useStore();
  if (!state) return null;
  const month = period > periodOfDate(new Date()) ? periodOfDate(new Date()) : period;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-delacour-primary">Les outils de l'entreprise</h1>
          <p className="text-[11px] text-slate-500">Un outil par question de l'audit des 5 processus. Les données restent sur ce poste ou dans le dossier partagé de l'entreprise.</p>
        </div>
        <Button onClick={() => downloadFile(`Rapport-${month}.pdf`, monthlyReportPdf(state, month, { company: state.settings.companyName, date: new Date(), money: !teamView }), 'application/pdf')} title="Pour la réunion de direction : chiffres clés et état de chaque outil"><FileDown size={14} />Rapport de {periodLabel(month)} (PDF)</Button>
      </div>
      {PROCESSES.map(p => (
        <Card key={p.key} className="space-y-2 p-3 sm:p-4">
          <h2 className="flex items-baseline gap-2 text-sm font-bold text-slate-900"><span className="rounded bg-delacour-primary px-1.5 py-0.5 font-mono text-[11px] text-white">{p.key}</span>{p.name}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {toolsOf(p.key).map(t => {
              const st = toolBadge(state, t.id, month);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => nav.tool(t.id)} className="flex h-full w-full flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-delacour-gold hover:bg-slate-50">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900"><span className="mr-1 font-mono text-[11px] text-delacour-golddark">{t.id}</span>{t.label}{(state.params.restricted || []).includes(t.id) && <Lock size={11} className="ml-1 inline text-slate-500" aria-label="Réservé à la direction" />}</span>
                      <ChevronRight size={14} className="shrink-0 text-slate-400" />
                    </span>
                    <span className="flex-1 text-[11px] text-slate-600">{t.desc}</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_STYLE[st.tone].dot}`} />{st.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-delacour-primary sm:px-4">Les mots des outils, expliqués</summary>
        <dl className="grid gap-x-4 gap-y-1.5 border-t border-slate-100 px-3 py-3 sm:grid-cols-2 sm:px-4">
          {GLOSSARY.map(([w, d]) => <div key={w} className="text-[11px]"><dt className="inline font-bold text-slate-900">{w} : </dt><dd className="inline text-slate-600">{d}</dd></div>)}
        </dl>
      </details>
    </div>
  );
}
