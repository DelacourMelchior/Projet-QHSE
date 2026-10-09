// Who can work where: the workstations in force against the people. A tap on a cell moves the person along the path (watched, done with the tutor,
// alone, can teach). The people allowed through the versatility matrix (4.2) are shown and cannot be changed here.
import { useState } from 'react';
import { Link2 } from 'lucide-react';
import type { SopStage, State } from '../../domain/types';
import { habilitated, matrixPeople, postesHeldBy, setStage, sopCfg, sopPhase, STAGES, stageOf } from '../../domain/instructions';
import { isoDate } from '../../domain/periods';
import { Button, Card, Modal, StatusBadge } from '../common';
import { useSopAct } from './SopBits';

const CELL: Record<SopStage, { l: string; cls: string; label: string }> = {
  seen: { l: 'V', cls: 'bg-slate-200 text-slate-900', label: 'A regardé faire' }, with: { l: 'T', cls: 'bg-amber-300 text-amber-950', label: 'A fait avec le tuteur' },
  alone: { l: '✓', cls: 'bg-emerald-600 text-white', label: 'Fait seul(e)' }, trainer: { l: 'F', cls: 'bg-emerald-900 text-white', label: 'Peut former' },
};

export function SopMatrix({ state }: { state: State }) {
  const act = useSopAct();
  const [pick, setPick] = useState<{ sopId: string; name: string } | null>(null);
  const rows = Object.values(state.sops).filter(x => sopPhase(x) === 'active').sort((a, b) => a.poste.localeCompare(b.poste)), people = matrixPeople(state), min = sopCfg(state.params).minPeople;
  if (!rows.length) return <Card className="p-4 text-xs text-slate-600">Aucune instruction en vigueur : la grille se remplit dès qu'une instruction est validée.</Card>;
  const sop = pick && state.sops[pick.sopId], cur = pick && sop ? stageOf(state, sop, pick.name) : null;
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <strong className="text-slate-800">Qui peut tenir quel poste</strong>
        {(Object.keys(CELL) as SopStage[]).map(k => <span key={k} className="inline-flex items-center gap-1"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${CELL[k].cls}`}>{CELL[k].l}</span>{CELL[k].label}</span>)}
        <span className="inline-flex items-center gap-1"><Link2 size={12} />Depuis la polyvalence (4.2)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[11rem] bg-white p-1.5 text-left text-[11px] font-semibold text-slate-600">Poste</th>
              {people.map(n => <th key={n} className="h-24 w-9 p-0 align-bottom"><span className="mx-auto block h-24 w-5 whitespace-nowrap text-left text-[11px] font-semibold text-slate-700 [writing-mode:vertical-rl] [transform:rotate(180deg)]">{n}</span></th>)}
              <th className="p-1.5 text-left text-[11px] font-semibold text-slate-600">Habilités</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(x => {
              const n = habilitated(state, x).length;
              return (
                <tr key={x.id} className="hover:bg-slate-50">
                  <th scope="row" className="sticky left-0 z-10 border-t border-slate-100 bg-white p-1.5 text-left font-semibold text-slate-900">{x.poste}<span className="block text-[11px] font-normal text-slate-500">{x.operation}</span></th>
                  {people.map(p => {
                    const c = stageOf(state, x, p);
                    return (
                      <td key={p} className="border-t border-slate-100 p-0.5 text-center">
                        <button type="button" onClick={() => setPick({ sopId: x.id, name: p })} aria-label={`${p}, ${x.poste} : ${c.stage ? CELL[c.stage].label : 'pas encore'}`} title={`${p} · ${c.stage ? CELL[c.stage].label : 'Pas encore'}${c.fromSkill ? ' (polyvalence)' : ''}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:ring-2 hover:ring-delacour-gold max-sm:h-10 max-sm:w-10">
                          {c.stage ? <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${CELL[c.stage].cls} ${c.fromSkill ? 'ring-2 ring-sky-400 ring-offset-1' : ''}`}>{CELL[c.stage].l}</span> : <span className="h-2 w-2 rounded-full bg-slate-200" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-t border-slate-100 p-1.5"><StatusBadge level={n >= min ? 'ok' : n ? 'warn' : 'alert'} text={`${n} / ${min}`} /></td>
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="sticky left-0 bg-white p-1.5 text-left text-[11px] font-semibold text-slate-600">Postes tenus seul(e)</th>
              {people.map(p => <td key={p} className="p-1.5 text-center font-mono text-[11px] font-bold text-slate-700">{postesHeldBy(state, p)}</td>)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {pick && sop && cur && (
        <Modal onClose={() => setPick(null)} title={`${pick.name} · ${sop.poste}`} subtitle={cur.fromSkill ? 'Habilitée par la matrice de polyvalence (4.2) : à modifier dans l\'outil 4.2.' : 'Où en est la personne sur ce poste ?'}>
          <div className="grid gap-2">
            {STAGES.map(t => (
              <Button key={t.key} kind={cur.stage === t.key && !cur.fromSkill ? 'primary' : 'secondary'} disabled={cur.fromSkill} onClick={() => { act(sop.id, (x, by) => setStage(x, pick.name, t.key, { by, date: isoDate(new Date()) })); setPick(null); }}>{t.label}</Button>
            ))}
            {cur.stage && !cur.fromSkill && <Button kind="danger" onClick={() => { act(sop.id, (x, by) => setStage(x, pick.name, null, { by })); setPick(null); }}>Retirer du poste</Button>}
          </div>
        </Modal>
      )}
    </Card>
  );
}
