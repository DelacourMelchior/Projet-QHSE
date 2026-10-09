// The plan of the workshop (the one of tool 3.2, kept in one place) with a pin on every piece of equipment, coloured by its status AND marked with a symbol, with its
// label under it. Pick a piece of equipment in the list, then touch the plan to place it or to move it, or set its position with the two sliders and press
// "Placer ici" (the way for the keyboard). The list below is always there: it names the status in words and reaches the equipment the pins hide.
import { useState } from 'react';
import { Check, Clock, Minus, TriangleAlert } from 'lucide-react';
import type { Equipment, Level, MaintTodo, State } from '../../domain/types';
import { eqLevel, eqStatus } from '../../domain/maintenance';
import { Button, Card } from '../common';
import { Pic } from '../../photo/Pic';
import { useEqMove, useUndo } from './EqBits';
import { eqName } from './EqCards';

type Pin = { x: number; y: number };
// colour and symbol together: a pin is read by someone who does not tell the colours apart, and the symbol is the same in the legend
const PIN: Record<Level, { bg: string; icon: typeof Check }> = {
  ok: { bg: 'bg-emerald-700', icon: Check }, warn: { bg: 'bg-amber-700', icon: Clock }, alert: { bg: 'bg-red-700', icon: TriangleAlert }, pending: { bg: 'bg-slate-500', icon: Minus },
};
const TOUCH = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
const CENTER: Pin = { x: 0.5, y: 0.5 };

function Mark({ level, size }: { level: Level; size: number }) {
  const I = PIN[level].icon;
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full text-white ${PIN[level].bg}`} style={{ width: size, height: size }}><I size={Math.round(size * 0.65)} strokeWidth={3} /></span>;
}

// The position of the pin set without the pointer: two sliders (the arrows of the keyboard move them), then "Placer ici"; the first one takes the focus
export function PlaceBar({ name, at, onAt, onPlace }: { name: string; at: Pin; onAt(p: Pin): void; onPlace(): void }) {
  const slider = (axis: 'x' | 'y', label: string) => (
    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">{label}
      <input type="range" min={0} max={100} value={Math.round(at[axis] * 100)} autoFocus={axis === 'x'} aria-valuetext={`${Math.round(at[axis] * 100)} %`}
        onChange={e => onAt({ ...at, [axis]: Number(e.target.value) / 100 })} className={`w-32 accent-delacour-primary ${TOUCH}`} />
    </label>
  );
  return (
    <div role="group" aria-label={`Position de l'épingle : ${name}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-2 py-1">
      {slider('x', 'Horizontale')}{slider('y', 'Verticale')}
      <Button kind="primary" className="!py-1" onClick={onPlace}>Placer ici</Button>
    </div>
  );
}

export function EqPlan({ state, todos, onOpen }: { state: State; todos: MaintTodo[]; onOpen(e: Equipment): void }) {
  const { bar, offer } = useUndo(), move = useEqMove(offer), [placing, setPlacing] = useState(''), [at, setAt] = useState<Pin>(CENTER);
  const plan = state.params.sop?.plan;
  if (!plan) return <Card className="p-4 text-xs text-slate-600">Aucun plan pour l'instant. Ajoutez l'image du plan dans « Réglages de cet outil » de l'outil 3.2 (Instructions) : les équipements s'y placent d'un toucher.</Card>;
  const live = Object.values(state.equipments).filter(e => eqStatus(e) !== 'retired').sort((a, b) => eqName(a).localeCompare(eqName(b), 'fr')), pinned = live.filter(e => e.pin), unplaced = live.filter(e => !e.pin);
  const chosen = live.find(e => e.id === placing);
  const choose = (e: Equipment) => { if (placing === e.id) setPlacing(''); else { setPlacing(e.id); setAt(e.pin ?? CENTER); } };
  const put = (pin: Pin) => { move(placing, `Épingle ${chosen?.pin ? 'déplacée' : 'placée'} : ${chosen ? eqName(chosen) : ''}`, x => ({ ...x, pin })); setPlacing(''); };
  const toggle = (e: Equipment, cls = '') => <button type="button" aria-pressed={placing === e.id} onClick={() => choose(e)} className={`${cls} ${TOUCH} ${placing === e.id ? 'border-delacour-gold bg-delacour-gold text-delacour-dark' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{e.pin ? 'Déplacer' : 'Placer'}<span className="sr-only"> : {eqName(e)}</span></button>;
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <strong className="text-slate-800">Plan des locaux</strong>
        <span className="text-slate-500" role="status">{chosen ? `Touchez le plan pour placer « ${eqName(chosen)} », ou réglez sa position puis « Placer ici ».` : unplaced.length ? 'Sans place :' : 'Tous les équipements sont placés.'}</span>
        {unplaced.map(e => <button key={e.id} type="button" aria-pressed={placing === e.id} onClick={() => choose(e)} className={`rounded-full border px-2 py-1 font-semibold ${TOUCH} ${placing === e.id ? 'border-delacour-gold bg-delacour-gold text-delacour-dark' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{eqName(e)}</button>)}
      </div>
      {chosen && <PlaceBar name={eqName(chosen)} at={at} onAt={setAt} onPlace={() => put(at)} />}
      <div className={`relative mx-auto max-w-4xl ${placing ? 'cursor-crosshair' : ''}`}
        onClick={ev => { if (!placing) return; const r = ev.currentTarget.getBoundingClientRect(); put({ x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }); }}>
        <Pic value={plan} alt="Plan des locaux" size="v" className="w-full rounded-lg border border-slate-200" />
        {pinned.map(e => {
          const lv = eqLevel(e, todos);
          return (
            <button key={e.id} type="button" onClick={ev => { ev.stopPropagation(); onOpen(e); }} title={`${eqName(e)} : ${lv.label}`} aria-label={`${eqName(e)} : ${lv.label}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center p-2 max-sm:p-3 [@media(pointer:coarse)]:p-3" style={{ left: `${e.pin!.x * 100}%`, top: `${e.pin!.y * 100}%` }}>
              <span className="rounded-full border-2 border-white shadow"><Mark level={lv.level} size={16} /></span>
              <span className="mt-0.5 hidden max-w-[7rem] truncate rounded bg-white/90 px-1 text-[11px] font-semibold text-slate-800 shadow-sm sm:block">{eqName(e)}</span>
            </button>
          );
        })}
        {chosen && <span aria-hidden className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-delacour-primary bg-white/70" style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }} />}
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3" aria-label="Les équipements et leur état">
        {live.map(e => {
          const lv = eqLevel(e, todos);
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-1">
              <button type="button" onClick={() => onOpen(e)} className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-2 rounded-lg px-1.5 py-1 text-left text-[11px] hover:bg-slate-50 ${TOUCH}`}>
                <Mark level={lv.level} size={16} />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{eqName(e)}</span>
                <span className="min-w-0 text-slate-600 max-sm:basis-full max-sm:pl-6">{lv.label}{e.pin ? '' : ', sans place'}</span>
              </button>
              {toggle(e, 'shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold')}
            </li>
          );
        })}
      </ul>
      {bar}
      <p className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">{([['ok', 'En ordre'], ['warn', 'À suivre'], ['alert', 'Urgent : danger, arrêt ou contrôle obligatoire échu']] as const).map(([k, l]) => <span key={k} className="inline-flex items-center gap-1"><Mark level={k} size={16} />{l}</span>)}</p>
    </Card>
  );
}
