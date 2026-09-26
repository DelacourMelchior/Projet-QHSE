// Home screen: the 5 processes and their tools, each with what needs attention now.
import { ChevronRight } from 'lucide-react';
import { toolBadge } from '../domain/status';
import { useStore } from '../store/StoreContext';
import { Card, LEVEL_STYLE } from './common';
import { PROCESSES, toolsOf, type Nav } from './tools';

export function Home({ nav }: { nav: Nav }) {
  const { state, period } = useStore();
  if (!state) return null;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-delacour-primary">Les outils de l'entreprise</h1>
        <p className="text-[11px] text-slate-500">Un outil par question de l'audit des 5 processus. Les données restent sur ce poste ou dans le dossier partagé de l'entreprise.</p>
      </div>
      {PROCESSES.map(p => (
        <Card key={p.key} className="space-y-2 p-3 sm:p-4">
          <h2 className="flex items-baseline gap-2 text-sm font-bold text-slate-900"><span className="rounded bg-delacour-primary px-1.5 py-0.5 font-mono text-[11px] text-white">{p.key}</span>{p.name}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {toolsOf(p.key).map(t => {
              const st = toolBadge(state, t.id, period);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => nav.tool(t.id)} className="flex h-full w-full flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-delacour-gold hover:bg-slate-50">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900"><span className="mr-1 font-mono text-[11px] text-delacour-golddark">{t.id}</span>{t.label}</span>
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
    </div>
  );
}
