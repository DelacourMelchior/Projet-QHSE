// Detail of one KPI: large chart, month history, its actions, and its definition (editable).
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Aggregation, Direction, Kpi, KpiType } from '../domain/types';
import { actionsOf, effectiveness, statusAt, timelinePeriods, trend, valueOf, yearSummary } from '../domain/engine';
import { formatValue, parseNumber } from '../domain/numbers';
import { periodLabel } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Field, inputCls, Modal, StatusBadge } from './common';
import { ChartLegend, KpiChart } from './KpiChart';
import { STATUS_LABEL } from './ActionSheet';

export function KpiDetail({ kpiId, onClose, onOpenAction, onNewAction }: {
  kpiId: string; onClose(): void; onOpenAction(id: string): void; onNewAction(kpiId: string): void;
}) {
  const { state, period, teamView, update } = useStore();
  const [tab, setTab] = useState<'suivi' | 'definition'>('suivi');
  const k0 = state?.kpis[kpiId];
  const [def, setDef] = useState<Kpi | undefined>(k0 && { ...k0 });
  if (!state || !k0 || !def) return null;
  const k = k0;
  const masked = teamView && k.confidential;
  const st = statusAt(state, k, period), ys = yearSummary(state, k, period), t = trend(state, k, period);
  const acts = actionsOf(state, k.id);

  const saveDef = () => {
    update(d => { d.kpis[k.id] = { ...def, targetValue: parseNumber(def.target) }; });
    setTab('suivi');
  };
  const remove = () => {
    if (!window.confirm(`Supprimer l'indicateur « ${k.name} », ses valeurs et ses actions ?`)) return;
    update(d => {
      delete d.kpis[k.id]; delete d.values[k.id];
      d.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => id !== k.id); });
      Object.values(d.actions).filter(a => a.kpiId === k.id).forEach(a => { delete d.actions[a.id]; });
    });
    onClose();
  };

  return (
    <Modal wide onClose={onClose} title={k.name}
      subtitle={<span>{state.processes.find(p => p.id === k.processId)?.name} · cible {masked ? '···' : k.target} · {k.type}{k.confidential ? ' · confidentiel' : ''}</span>}>
      <div className="mb-3 flex gap-1.5" role="tablist">
        {(['suivi', 'definition'] as const).map(x => (
          <button key={x} role="tab" aria-selected={tab === x} type="button" onClick={() => setTab(x)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tab === x ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
            {x === 'suivi' ? 'Suivi' : "Définition de l'indicateur"}
          </button>
        ))}
      </div>

      {tab === 'suivi' ? (masked ? <p className="text-xs text-slate-500">Indicateur réservé à la direction.</p> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={periodLabel(period)} value={formatValue(valueOf(state, k.id, period), k.unit)}><StatusBadge level={st.level} text={st.text} /></Stat>
            <Stat label={`${ys.label || 'Année'} ${period.slice(0, 4)}`} value={formatValue(ys.value, k.unit)} />
            <Stat label="Tendance 3 mois" value={!t ? '—' : t.dir === 'stable' ? 'Stable' : `${t.dir === 'up' ? '+' : '−'}${Math.abs(Math.round(t.pct))} %`}>
              {t?.drifting && <span className="text-[11px] font-semibold text-amber-800">Dérive lente</span>}
            </Stat>
            <Stat label="Actions" value={String(acts.length)} />
          </div>
          <KpiChart state={state} kpi={k} period={period} color="#1B4D3E" height={260} />
          <ChartLegend />

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Actions sur cet indicateur</h3>
              <Button onClick={() => onNewAction(k.id)}><Plus size={14} />Nouvelle action</Button>
            </div>
            {acts.length === 0 ? <p className="text-[11px] text-slate-500">Aucune action.</p> : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {acts.map(a => {
                  const e = effectiveness(state, a);
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => onOpenAction(a.id)} className="flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-left text-xs hover:bg-slate-50">
                        <span className="text-slate-500">{periodLabel(a.period)}</span>
                        <span className="font-semibold text-slate-900">{a.pilot || 'Pilote à désigner'}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-700">{a.plan.map(p => p.text).join(' · ')}</span>
                        <span className="text-[11px] text-slate-600">{STATUS_LABEL[a.status]}</span>
                        {'value' in e && <span className={`text-[11px] font-semibold ${e.state === 'effective' ? 'text-emerald-700' : 'text-red-700'}`}>{e.state === 'effective' ? 'Efficace' : 'Récidive'}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <details className="rounded-lg border border-slate-200 p-2.5">
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Historique mois par mois</summary>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {timelinePeriods(state).slice().reverse().map(p => {
                  const v = valueOf(state, k.id, p), s = statusAt(state, k, p);
                  return (
                    <tr key={p} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-600">{periodLabel(p)}</td>
                      <td className="py-1.5 text-right font-mono font-semibold text-slate-900">{formatValue(v, k.unit)}</td>
                      <td className="py-1.5 pl-3">{v !== null && <StatusBadge level={s.level} text={s.text} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        </div>
      )) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom"><input className={inputCls} value={def.name} onChange={e => setDef({ ...def, name: e.target.value })} /></Field>
            <Field label="Cible" hint="Ex. : ≥ 35 %, < 5 devis, 50 000 € / mois"><input className={inputCls} value={def.target} onChange={e => setDef({ ...def, target: e.target.value })} /></Field>
            <Field label="Unité"><input className={inputCls} value={def.unit} onChange={e => setDef({ ...def, unit: e.target.value })} /></Field>
            <Field label="Sens de l'objectif">
              <select className={inputCls} value={def.direction} onChange={e => setDef({ ...def, direction: e.target.value as Direction })}>
                <option value="higher">Plus c'est haut, mieux c'est</option>
                <option value="lower">Plus c'est bas, mieux c'est</option>
              </select>
            </Field>
            <Field label="Bilan de l'année">
              <select className={inputCls} value={def.aggregation} onChange={e => setDef({ ...def, aggregation: e.target.value as Aggregation })}>
                <option value="sum">Cumul (ex. CA, heures)</option>
                <option value="avg">Moyenne (ex. taux)</option>
                <option value="last">Dernière valeur (ex. trésorerie, stock)</option>
              </select>
            </Field>
            <Field label="Type">
              <select className={inputCls} value={def.type} onChange={e => setDef({ ...def, type: e.target.value as KpiType })}>
                {['Moteur', 'Garde-fou', 'Vital', 'Performance'].map(x => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Source des chiffres"><input className={inputCls} value={def.source} onChange={e => setDef({ ...def, source: e.target.value })} /></Field>
            <label className="flex items-center gap-2 self-end text-xs text-slate-700">
              <input type="checkbox" checked={def.confidential} onChange={e => setDef({ ...def, confidential: e.target.checked })} />
              Confidentiel (réservé à la direction)
            </label>
          </div>
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button kind="danger" onClick={remove}><Trash2 size={14} />Supprimer l'indicateur</Button>
            <Button kind="primary" onClick={saveDef}>Enregistrer la définition</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-200 p-2.5">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-base font-bold text-slate-900">{value}</div>
      {children}
    </div>
  );
}
