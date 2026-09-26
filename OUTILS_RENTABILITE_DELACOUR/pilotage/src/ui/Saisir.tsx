// Screen 2 — "Je rentre les chiffres du mois": one form per month, previous month and target alongside.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Kpi, Period } from '../domain/types';
import { kpiStatus, timelinePeriods, valueOf } from '../domain/engine';
import { formatValue, parseNumber } from '../domain/numbers';
import { addMonths, periodLabel, periodLong } from '../domain/periods';
import { feeds } from '../domain/feeds';
import { useStore } from '../store/StoreContext';
import { Button, Card, StatusBadge } from './common';

export function Saisir({ done }: { done(): void }) {
  const { state, period, setPeriod, update, teamView } = useStore();
  const [month, setMonth] = useState<Period>(period);
  if (!state) return null;
  const ps = timelinePeriods(state);
  const options = [...ps, addMonths(ps[ps.length - 1], 1)];
  const filled = Object.values(state.kpis).filter(k => valueOf(state, k.id, month) !== null).length;
  const total = Object.keys(state.kpis).length;
  const computed = Object.fromEntries(feeds(state, month).map(f => [f.kpi.id, f]));

  const commit = (k: Kpi, raw: string) => {
    const v = raw.trim() === '' ? null : parseNumber(raw);
    if (raw.trim() !== '' && v === null) return;   // not a figure: keep the previous value
    update(d => {
      if (month > d.timeline.end) d.timeline.end = month;
      if (v === null) { if (d.values[k.id]) delete d.values[k.id][month]; }
      else (d.values[k.id] ||= {})[month] = v;
    });
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Saisie du mois</h2>
          <p className="text-[11px] text-slate-500">Chaque valeur est enregistrée dès que vous quittez le champ. Tab ou Entrée pour passer au suivant.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button kind="ghost" aria-label="Mois précédent" disabled={month <= options[0]} onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={16} /></Button>
          <select value={month} onChange={e => setMonth(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold">
            {options.map(p => <option key={p} value={p}>{periodLong(p)}{p > ps[ps.length - 1] ? ' (nouveau)' : ''}</option>)}
          </select>
          <Button kind="ghost" aria-label="Mois suivant" disabled={month >= options[options.length - 1]} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={16} /></Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-600">{filled} / {total} saisi(s)</span>
          <Button kind="primary" onClick={() => { setPeriod(month); done(); }}>Voir la synthèse de {periodLabel(month)}</Button>
        </div>
      </Card>

      {[...state.processes].sort((a, b) => a.order - b.order).map(p => {
        const kpis = p.kpiIds.map(id => state.kpis[id]).filter(Boolean);
        if (!kpis.length) return null;
        return (
          <Card key={p.id} className="p-3 sm:p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.name}</h3>
            <div className="divide-y divide-slate-100">
              {kpis.map(k => {
                const locked = teamView && k.confidential;
                const v = valueOf(state, k.id, month);
                const prev = valueOf(state, k.id, addMonths(month, -1));
                const st = kpiStatus(k, v);
                return (
                  <div key={k.id} className="grid grid-cols-1 items-center gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_170px_150px_140px]">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{k.name}</div>
                      <div className="text-[11px] text-slate-500">{k.source ? `Source : ${k.source}` : k.type}</div>
                      {computed[k.id] && !locked && (
                        <div className="text-[11px] text-slate-600">
                          Outil {computed[k.id].tool} : <strong className="font-mono">{formatValue(computed[k.id].value, k.unit)}</strong>
                          {v === null || Math.abs(v - computed[k.id].value) >= 0.05
                            ? <button type="button" title={computed[k.id].how} className="ml-1.5 font-semibold text-delacour-primary hover:underline" onClick={() => commit(k, String(computed[k.id].value))}>Reprendre</button>
                            : <span className="ml-1.5 text-emerald-700">identique</span>}
                        </div>
                      )}
                    </div>
                    <div>
                      {locked ? <span className="text-[11px] text-slate-400">Réservé à la direction</span> : (
                        <div className="flex items-center gap-1.5">
                          <input key={`${k.id}|${month}|${v}`} defaultValue={v === null ? '' : String(v).replace('.', ',')} inputMode="decimal"
                            aria-label={`${k.name}, ${periodLong(month)}`}
                            onBlur={e => commit(k, e.currentTarget.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); focusNext(e.currentTarget); } }}
                            className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right font-mono text-sm font-semibold text-slate-900 outline-none focus:border-delacour-gold focus:ring-2 focus:ring-delacour-gold/30"
                            placeholder="—" />
                          <span className="text-[11px] font-semibold text-slate-500">{k.unit}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cible <span className="font-mono text-slate-700">{locked ? '···' : k.target}</span><br />
                      Mois préc. <span className="font-mono text-slate-700">{locked ? '···' : formatValue(prev, k.unit)}</span>
                    </div>
                    <div>{!locked && <StatusBadge level={st.level} text={st.text} />}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function focusNext(el: HTMLInputElement) {
  const all = [...document.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')];
  const i = all.indexOf(el);
  (all[i + 1] || el).focus();
  (all[i + 1] || el).select();
}
