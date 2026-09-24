// Screen "Qui fait quoi, pour quand ?": the single action register of tools 1.1 and 1.2, with effectiveness (ISO 9001 §6.1, §10.2).
import { useMemo, useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { effectiveness, isOverdue, kpisInOrder } from '../domain/engine';
import { riskActionEffectiveness, risksInOrder } from '../domain/risk';
import { frDate, periodLabel } from '../domain/periods';
import { formatValue } from '../domain/numbers';
import type { Action } from '../domain/types';
import { useStore } from '../store/StoreContext';
import { Button, Card } from './common';
import { dimLabel, STATUS_LABEL } from './ActionSheet';

type Filter = 'all' | 'open' | 'late' | 'closed';
export type Origin = 'all' | 'kpi' | 'risk';

export function Agir({ onOpenAction, onNewAction, defaultOrigin = 'all' }: { onOpenAction(id: string): void; onNewAction(kpiId: string, riskId?: string): void; defaultOrigin?: Origin }) {
  const { state, teamView } = useStore();
  const [filter, setFilter] = useState<Filter>('open');
  const [origin, setOrigin] = useState<Origin>(defaultOrigin);
  const [pilot, setPilot] = useState('');
  const [newKpi, setNewKpi] = useState('');
  const all = useMemo(() => state ? Object.values(state.actions).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)) : [], [state]);
  if (!state) return null;
  const actions = all.filter(a => origin === 'all' || (origin === 'risk') === !!a.riskId);

  const isOpen = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';
  const count = { all: actions.length, open: actions.filter(isOpen).length, late: actions.filter(a => isOverdue(a)).length, closed: actions.filter(a => !isOpen(a)).length };
  const pilots = [...new Set(actions.map(a => a.pilot).filter(Boolean))].sort();
  const shown = actions.filter(a =>
    (filter === 'all' || (filter === 'open' && isOpen(a)) || (filter === 'late' && isOverdue(a)) || (filter === 'closed' && !isOpen(a)))
    && (!pilot || a.pilot === pilot || a.plan.some(p => p.pilot === pilot)));
  const FILTERS: [Filter, string][] = [['open', 'Ouvertes'], ['late', 'En retard'], ['closed', 'Clôturées'], ['all', 'Toutes']];

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Plan d'actions</h2>
            <p className="text-[11px] text-slate-500">Indicateurs et Plans B dans un seul plan. Efficacité : le mois qui suit la clôture (indicateur) ou le test suivant (Plan B).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select value={newKpi} onChange={e => setNewKpi(e.target.value)} aria-label="Origine de la nouvelle action" className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
              <option value="">Indicateur ou risque…</option>
              {Object.keys(state.kpis).length > 0 && <optgroup label="Indicateurs">{kpisInOrder(state).map(k => <option key={k.id} value={`k:${k.id}`}>{k.name}</option>)}</optgroup>}
              {Object.keys(state.risks).length > 0 && <optgroup label="Risques (Plans B)">{risksInOrder(state).map(r => <option key={r.id} value={`r:${r.id}`}>{r.title}</option>)}</optgroup>}
            </select>
            <Button kind="primary" disabled={!newKpi} onClick={() => newKpi.startsWith('r:') ? onNewAction('', newKpi.slice(2)) : onNewAction(newKpi.slice(2))}><Plus size={14} />Nouvelle action</Button>
            <Button onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          {FILTERS.map(([f, l]) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${filter === f ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {l} <span className="opacity-75">{count[f]}</span>
            </button>
          ))}
          <select value={origin} onChange={e => setOrigin(e.target.value as Origin)} aria-label="Filtrer par origine" className="ml-auto rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px]">
            <option value="all">Indicateurs et Plans B</option>
            <option value="kpi">Indicateurs (1.1)</option>
            <option value="risk">Plans B (1.2)</option>
          </select>
          <select value={pilot} onChange={e => setPilot(e.target.value)} aria-label="Filtrer par pilote" className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px]">
            <option value="">Tous les pilotes</option>
            {pilots.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucune action dans ce filtre.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="text-[11px] text-slate-500">
                  {['Mois', 'Origine', 'Plan', 'Pilote', 'Échéance', 'Statut', 'Efficacité'].map(h => <th key={h} className="border-b border-slate-200 px-2 py-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map(a => {
                  const k = state.kpis[a.kpiId];
                  const r = a.riskId ? state.risks[a.riskId] : undefined;
                  const eff = effectiveness(state, a);
                  const reff = riskActionEffectiveness(state, a);
                  const late = isOverdue(a);
                  const conf = teamView && k?.confidential;
                  return (
                    <tr key={a.id} onClick={() => onOpenAction(a.id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-slate-600">{periodLabel(a.period)}</td>
                      <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-900">{a.riskId ? <><span className="block text-[11px] font-semibold text-slate-500">Plan B</span>{r?.title || 'Risque supprimé'}</> : k?.name || 'Indicateur supprimé'}</td>
                      <td className="max-w-[320px] border-b border-slate-100 px-2 py-2 text-slate-700">
                        {a.plan.slice(0, 2).map((p, i) => <div key={i} className="truncate"><span className="text-slate-500">{dimLabel(p.dim)} :</span> {p.text}{p.pilot ? ` (${p.pilot})` : ''}</div>)}
                        {a.plan.length > 2 && <div className="text-[11px] text-slate-500">+ {a.plan.length - 2} autre(s)</div>}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 font-semibold text-slate-800">{a.pilot || <span className="text-red-700">À désigner</span>}</td>
                      <td className={`whitespace-nowrap border-b border-slate-100 px-2 py-2 font-mono ${late ? 'font-bold text-red-700' : 'text-slate-700'}`}>{frDate(a.deadline)}{late ? ' · en retard' : ''}</td>
                      <td className="border-b border-slate-100 px-2 py-2"><StatusPill a={a} /></td>
                      <td className="border-b border-slate-100 px-2 py-2 text-[11px]">
                        {a.riskId ? (reff.state === 'pending' ? <span className="text-slate-500">Après réalisation</span>
                          : reff.state === 'waiting' ? <span className="text-slate-500">Au prochain test</span>
                          : <span className={reff.state === 'effective' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{reff.state === 'effective' ? 'Test réussi' : 'Test raté'} · {frDate(reff.date)}</span>)
                          : eff.state === 'pending' ? <span className="text-slate-500">Après réalisation</span>
                          : eff.state === 'waiting' ? <span className="text-slate-500">À mesurer ({periodLabel(eff.period)})</span>
                          : <span className={eff.state === 'effective' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
                            {eff.state === 'effective' ? 'Démontrée' : 'Récidive'} · {periodLabel(eff.period)}{!conf && k ? ` : ${formatValue(eff.value, k.unit)}` : ''}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusPill({ a }: { a: Action }) {
  const cls = { to_start: 'bg-red-50 text-red-800 border-red-200', in_progress: 'bg-amber-50 text-amber-900 border-amber-200', done: 'bg-emerald-50 text-emerald-800 border-emerald-200', effective: 'bg-blue-50 text-blue-900 border-blue-200' }[a.status];
  return <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{STATUS_LABEL[a.status]}</span>;
}
