// The plan of the workshop with a pin on every workstation, coloured by what is left to do. Pick a sheet in the list, then touch the plan to place it.
import { useState } from 'react';
import type { Sop, State } from '../../domain/types';
import { sopCfg, sopPhase, sopStatus, sopTodos } from '../../domain/instructions';
import { Card } from '../common';
import { useSopAct } from './SopBits';
import { Pic } from '../../photo/Pic';

const PIN = { ok: 'bg-emerald-600', warn: 'bg-amber-500', alert: 'bg-red-600', pending: 'bg-slate-400' } as const;

export function SopPlan({ state, onOpen }: { state: State; onOpen(s: Sop): void }) {
  const act = useSopAct(), [placing, setPlacing] = useState('');
  const plan = sopCfg(state.params).plan, now = new Date(), todos = sopTodos(state, now);
  if (!plan) return <Card className="p-4 text-xs text-slate-600">Aucun plan pour l'instant. Ajoutez l'image du plan de l'atelier dans « Réglages de cet outil », en bas de l'écran : les postes s'y placent d'un tap.</Card>;
  const live = Object.values(state.sops).filter(x => sopPhase(x) !== 'archived').sort((a, b) => a.poste.localeCompare(b.poste)), unplaced = live.filter(x => !x.pin);
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <strong className="text-slate-800">Plan de l'atelier</strong>
        <span className="text-slate-500">{placing ? 'Touchez le plan pour placer la fiche choisie.' : unplaced.length ? 'Sans place :' : 'Toutes les fiches sont placées.'}</span>
        {unplaced.map(x => <button key={x.id} type="button" aria-pressed={placing === x.id} onClick={() => setPlacing(placing === x.id ? '' : x.id)} className={`rounded-full border px-2 py-1 font-semibold max-sm:min-h-[44px] ${placing === x.id ? 'border-delacour-gold bg-delacour-gold text-delacour-dark' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{x.poste || 'Sans nom'}</button>)}
      </div>
      <div className={`relative mx-auto max-w-4xl ${placing ? 'cursor-crosshair' : ''}`}
        onClick={e => { if (!placing) return; const r = e.currentTarget.getBoundingClientRect(); const pin = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; act(placing, x => ({ ...x, pin })); setPlacing(''); }}>
        <Pic value={plan} alt="Plan de l'atelier" size="v" className="w-full rounded-lg border border-slate-200" />
        {live.filter(x => x.pin).map(x => {
          const st = sopStatus(state, x, now, todos);
          return (
            <button key={x.id} type="button" onClick={e => { e.stopPropagation(); onOpen(x); }} title={`${x.poste} : ${st.label}`} aria-label={`${x.poste} : ${st.label}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${x.pin!.x * 100}%`, top: `${x.pin!.y * 100}%` }}>
              <span className={`h-5 w-5 rounded-full border-2 border-white shadow ${PIN[st.level]}`} />
              <span className="mt-0.5 hidden max-w-[7rem] truncate rounded bg-white/90 px-1 text-[11px] font-semibold text-slate-800 shadow-sm sm:block">{x.poste}</span>
            </button>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-1.5 sm:hidden">{live.filter(x => x.pin).map(x => <li key={x.id}><button type="button" onClick={() => onOpen(x)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 max-sm:min-h-[44px]"><span className={`h-2.5 w-2.5 rounded-full ${PIN[sopStatus(state, x, now, todos).level]}`} />{x.poste}</button></li>)}</ul>
      <p className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">{([['ok', 'À jour'], ['warn', 'À suivre'], ['alert', 'À mettre à jour ou à remplacer'], ['pending', 'Brouillon']] as const).map(([k, l]) => <span key={k} className="inline-flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${PIN[k]}`} />{l}</span>)}</p>
    </Card>
  );
}
