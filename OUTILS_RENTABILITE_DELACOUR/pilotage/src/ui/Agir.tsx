// Screen "Qui fait quoi, pour quand ?": the single action register of every tool, with effectiveness (ISO 9001 §6.1, §10.2).
// Shown in each process, filtered on the actions created from that process's tools.
import { useMemo, useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { effectiveness, isOverdue, kpisInOrder } from '../domain/engine';
import { riskActionEffectiveness, risksInOrder } from '../domain/risk';
import { analysisActionEffectiveness } from '../domain/quality';
import { KIND_LABEL, refLabel, refOptions } from '../domain/refs';
import { frDate, periodLabel } from '../domain/periods';
import { formatValue } from '../domain/numbers';
import type { Action, Ref, State } from '../domain/types';
import { useStore } from '../store/StoreContext';
import { Button, Card } from './common';
import { dimLabel, STATUS_LABEL } from './ActionSheet';
import { actionTool, PROCESSES, TOOLS, toolDef, type NewActionInit, type ProcessKey, type ToolId } from './tools';

type Filter = 'all' | 'open' | 'late' | 'closed';
export type Scope = 'all' | ProcessKey | ToolId;

const inScope = (a: Action, scope: Scope) => {
  const t = actionTool(a);
  return scope === 'all' || scope === t || scope === toolDef(t).process;
};

export function Agir({ onOpenAction, onNewAction, onOpenRisk, defaultScope = 'all' }: {
  onOpenAction(id: string): void; onNewAction(init: NewActionInit): void; onOpenRisk?(id: string): void; defaultScope?: Scope;
}) {
  const { state, teamView } = useStore();
  const [filter, setFilter] = useState<Filter>('open');
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [pilot, setPilot] = useState('');
  const [origin, setOrigin] = useState('');
  const all = useMemo(() => state ? Object.values(state.actions).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)) : [], [state]);
  if (!state) return null;
  const actions = all.filter(a => inScope(a, scope));

  const isOpen = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';
  const count = { all: actions.length, open: actions.filter(isOpen).length, late: actions.filter(a => isOverdue(a)).length, closed: actions.filter(a => !isOpen(a)).length };
  const pilots = [...new Set(actions.map(a => a.pilot).filter(Boolean))].sort();
  const shown = actions.filter(a =>
    (filter === 'all' || (filter === 'open' && isOpen(a)) || (filter === 'late' && isOverdue(a)) || (filter === 'closed' && !isOpen(a)))
    && (!pilot || a.pilot === pilot || a.plan.some(p => p.pilot === pilot)));
  const FILTERS: [Filter, string][] = [['open', 'Ouvertes'], ['late', 'En retard'], ['closed', 'Clôturées'], ['all', 'Toutes']];
  const create = () => {
    const [k, id] = [origin.slice(0, origin.indexOf(':')), origin.slice(origin.indexOf(':') + 1)];
    if (k === 'k') onNewAction({ kpiId: id });
    else if (k === 'r') onNewAction({ riskId: id });
    else if (k) onNewAction({ ref: { kind: k as Ref['kind'], id } });
  };
  const scopeName = scope === 'all' ? 'tous les outils' : scope.startsWith('P') ? PROCESSES.find(p => p.key === scope)!.name.toLowerCase() : toolDef(scope as ToolId).label.toLowerCase();

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Actions</h2>
            <p className="text-[11px] text-slate-500">Qui fait quoi, pour quand : {scopeName}. Un seul plan d'actions pour toute l'entreprise.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <OriginSelect s={state} scope={scope} value={origin} onChange={setOrigin} />
            <Button kind="primary" disabled={!origin} onClick={create}><Plus size={14} />Nouvelle action</Button>
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
          <select value={scope} onChange={e => setScope(e.target.value as Scope)} aria-label="Filtrer par outil" className="ml-auto max-w-[240px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px]">
            <option value="all">Tous les outils</option>
            {PROCESSES.map(p => (
              <optgroup key={p.key} label={`${p.key} · ${p.name}`}>
                <option value={p.key}>Tout {p.key}</option>
                {TOOLS.filter(t => t.process === p.key && all.some(a => actionTool(a) === t.id)).map(t => <option key={t.id} value={t.id}>{t.id} {t.label}</option>)}
              </optgroup>
            ))}
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
                  const late = isOverdue(a);
                  return (
                    <tr key={a.id} onClick={() => onOpenAction(a.id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-slate-600">{periodLabel(a.period)}</td>
                      <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-900"><Origin s={state} a={a} onOpenRisk={onOpenRisk} /></td>
                      <td className="max-w-[320px] border-b border-slate-100 px-2 py-2 text-slate-700">
                        {a.plan.slice(0, 2).map((p, i) => <div key={i} className="truncate"><span className="text-slate-500">{dimLabel(p.dim)} :</span> {p.text}{p.pilot ? ` (${p.pilot})` : ''}</div>)}
                        {a.plan.length > 2 && <div className="text-[11px] text-slate-500">+ {a.plan.length - 2} autre(s)</div>}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 font-semibold text-slate-800">{a.pilot || <span className="text-red-700">À désigner</span>}</td>
                      <td className={`whitespace-nowrap border-b border-slate-100 px-2 py-2 font-mono ${late ? 'font-bold text-red-700' : 'text-slate-700'}`}>{frDate(a.deadline)}{late ? ' · en retard' : ''}</td>
                      <td className="border-b border-slate-100 px-2 py-2"><StatusPill a={a} /></td>
                      <td className="border-b border-slate-100 px-2 py-2 text-[11px]"><Eff s={state} a={a} team={teamView} /></td>
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

// Choice of what a new action is attached to, limited to the tools in scope
function OriginSelect({ s, scope, value, onChange }: { s: State; scope: Scope; value: string; onChange(v: string): void }) {
  const want = (t: ToolId) => scope === 'all' || scope === t || scope === toolDef(t).process;
  const refs = refOptions(s).filter(g => want(actionTool({ ref: { kind: g.kind, id: '' } } as Action)));
  return (
    <select value={value} onChange={e => onChange(e.target.value)} aria-label="Origine de la nouvelle action" className="max-w-[240px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
      <option value="">Origine de l'action…</option>
      {want('1.1') && Object.keys(s.kpis).length > 0 && <optgroup label="Indicateurs (1.1)">{kpisInOrder(s).map(k => <option key={k.id} value={`k:${k.id}`}>{k.name}</option>)}</optgroup>}
      {want('1.2') && Object.keys(s.risks).length > 0 && <optgroup label="Risques (1.2)">{risksInOrder(s).map(r => <option key={r.id} value={`r:${r.id}`}>{r.title}</option>)}</optgroup>}
      {refs.map(g => <optgroup key={g.kind} label={KIND_LABEL[g.kind]}>{g.items.map(x => <option key={x.id} value={`${g.kind}:${x.id}`}>{x.label}</option>)}</optgroup>)}
    </select>
  );
}

function Origin({ s, a, onOpenRisk }: { s: State; a: Action; onOpenRisk?(id: string): void }) {
  if (a.ref) return <><span className="block text-[11px] font-normal text-slate-500">{KIND_LABEL[a.ref.kind]} ({actionTool(a)})</span>{refLabel(s, a.ref)}</>;
  if (a.riskId) {
    const r = s.risks[a.riskId];
    return <><span className="block text-[11px] font-normal text-slate-500">Pour préparer le Plan B de :</span>{r && onOpenRisk
      ? <button type="button" onClick={e => { e.stopPropagation(); onOpenRisk(r.id); }} className="text-left font-semibold text-delacour-primary hover:underline">{r.title}</button>
      : r?.title || 'Risque supprimé'}</>;
  }
  return <>{s.kpis[a.kpiId]?.name || 'Indicateur supprimé'}</>;
}

function Eff({ s, a, team }: { s: State; a: Action; team: boolean }) {
  const muted = (t: string) => <span className="text-slate-500">{t}</span>;
  const shown = (ok: boolean, t: string) => <span className={ok ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{t}</span>;
  if (a.ref) {
    const e = analysisActionEffectiveness(s, a);
    if (e.state === 'pending') return muted('Après réalisation');
    if (e.state === 'waiting') return muted(a.ref.kind === 'analysis' ? 'Contrôle J+30' : 'À constater');
    return shown(e.state === 'effective', `${e.state === 'effective' ? 'Démontrée' : 'Récidive'} · ${frDate(e.date)}`);
  }
  if (a.riskId) {
    const e = riskActionEffectiveness(s, a);
    if (e.state === 'pending') return muted('Après réalisation');
    if (e.state === 'waiting') return muted('Au prochain test');
    return shown(e.state === 'effective', `${e.state === 'effective' ? 'Test réussi' : 'Test raté'} · ${frDate(e.date)}`);
  }
  const k = s.kpis[a.kpiId];
  const e = effectiveness(s, a);
  if (e.state === 'pending') return muted('Après réalisation');
  if (e.state === 'waiting') return muted(`À mesurer (${periodLabel(e.period)})`);
  const conf = team && k?.confidential;
  return shown(e.state === 'effective', `${e.state === 'effective' ? 'Démontrée' : 'Récidive'} · ${periodLabel(e.period)}${!conf && k ? ` : ${formatValue(e.value, k.unit)}` : ''}`);
}

function StatusPill({ a }: { a: Action }) {
  const cls = { to_start: 'bg-red-50 text-red-800 border-red-200', in_progress: 'bg-amber-50 text-amber-900 border-amber-200', done: 'bg-emerald-50 text-emerald-800 border-emerald-200', effective: 'bg-blue-50 text-blue-900 border-blue-200' }[a.status];
  return <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{STATUS_LABEL[a.status]}</span>;
}
