// The matrix of a process: its steps of work in rows (all its flowcharts), what carries each step in columns (instruction, skill, key function, equipment, risk, indicator).
// An empty cell is a hole: its "+" attaches a record that exists or creates it from the step. Under the table, the records of the process that no flowchart uses yet.
import { useState } from 'react';
import { ExternalLink, Table2 } from 'lucide-react';
import { linkLabel, processName } from '../../domain/cartography';
import { filled, linksOfTool, matrixHoles, matrixRows, orphans, SUPPORTS, supportGaps, type MatrixRow, type SupportDef } from '../../domain/mapSupport';
import { useStore } from '../../store/StoreContext';
import type { Nav, ToolId } from '../tools';
import { Button, Modal } from '../common';
import { SupportCell } from './Support';

export function MapMatrix({ processId, nav, can }: { processId: string; nav: Nav; can: boolean }) {
  const { state, update } = useStore();
  const [more, setMore] = useState(false), [pick, setPick] = useState<{ row: MatrixRow; def: SupportDef } | null>(null);
  if (!state) return null;
  const rows = matrixRows(state, processId), holes = matrixHoles(rows), lost = orphans(state, processId), gaps = supportGaps(state, processId), cols = more ? SUPPORTS : SUPPORTS.filter(d => d.kind === 'sop' || d.kind === 'skill' || d.kind === 'power');
  if (!rows.length) return <div className="space-y-2 text-xs text-slate-700"><p className="flex items-center gap-2 font-semibold text-slate-900"><Table2 size={14} aria-hidden />Pas encore de matrice : {processName(state, processId)} n'a pas d'étape de travail.</p><p>La matrice se remplit à partir des logigrammes : une ligne par étape de travail. Décrivez d'abord un cas courant dans l'onglet Logigrammes.</p></div>;
  let flowId = '';
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">Une ligne par étape de travail, tous les logigrammes du processus. Un point vert = il y a quelque chose (le nombre s'il y en a plusieurs), un point orange = attendu et manquant, un point creux = rien. Un clic sur un point ouvre la case : on y voit les fiches, on en rattache une qui existe ou on la crée depuis l'étape, dans le bon outil. L'instruction et la compétence sont attendues pour chaque étape de travail ; le reste seulement quand l'étape en a besoin.</p>
      <ul className="flex flex-wrap gap-2 text-xs" aria-label="Trous de la matrice">
        <li className="rounded-full border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-800">{rows.length} étape{rows.length > 1 ? 's' : ''} de travail</li>
        {cols.map(d => <li key={d.kind} className={`rounded-full border px-2.5 py-1 font-semibold ${holes[d.kind] && d.required ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-300 bg-white text-slate-700'}`}>{holes[d.kind]} sans {d.column.toLowerCase()}</li>)}
      </ul>
      <p className="text-xs font-semibold text-slate-800">{gaps ? `${gaps} case${gaps > 1 ? 's' : ''} attendue${gaps > 1 ? 's' : ''} à remplir (instruction ou compétence).` : 'Toutes les étapes ont une instruction et une compétence.'}</p>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-600">{more ? 'Toutes les colonnes' : 'Trois colonnes : instruction, compétence, fonction clé'}</span>
        <Button aria-pressed={more} onClick={() => setMore(!more)}>{more ? 'Masquer équipement, risque, indicateur' : 'Afficher équipement, risque, indicateur'}</Button></div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-xs">
          <thead><tr className="bg-slate-50"><th scope="col" className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800">Étape</th>
            {cols.map(d => <th key={d.kind} scope="col" className="w-28 border-b border-slate-200 px-2 py-2 text-center font-bold text-slate-800">{d.column} <span className="font-normal text-slate-500">({d.tool})</span>{d.required && <span className="block font-normal text-slate-500">attendu</span>}</th>)}</tr></thead>
          <tbody>
            {rows.flatMap(r => {
              const head = r.flow.id !== flowId ? (flowId = r.flow.id, [<tr key={`h${r.flow.id}`} className="bg-slate-100"><th scope="rowgroup" colSpan={cols.length + 1} className="px-3 py-1.5 text-left font-bold text-slate-900">{r.flow.name || 'Sans nom'}</th></tr>]) : [];
              return [...head, (
                <tr key={`${r.flow.id}${r.step.id}`} className="odd:bg-white even:bg-slate-50/50">
                  <th scope="row" className="border-t border-slate-100 px-3 py-1.5 font-semibold text-slate-900"><span className="flex items-center gap-1.5"><span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[11px] text-slate-700">{r.index + 1}</span><span className="min-w-0 truncate" title={r.step.label.trim() || 'Sans intitulé'}>{r.step.label.trim() || 'Sans intitulé'}</span></span></th>
                  {cols.map(d => {
                    const mine = linksOfTool(r.step, d.tool), role = d.kind === 'skill' && r.step.roleRef?.kind === 'skill' && !mine.some(l => l.id === r.step.roleRef!.id) ? state.skills[r.step.roleRef.id]?.name : undefined, names = [...mine.map(l => linkLabel(state, l) ?? 'introuvable'), ...(role ? [`${role} (rôle de l'étape)`] : [])], has = filled(r.step, d), n = r.index + 1;
                    return (
                      <td key={d.kind} className="border-t border-slate-100 px-2 py-1.5 text-center">
                        <button type="button" onClick={() => setPick({ row: r, def: d })} title={names.length ? `${d.column} : ${names.join(' · ')}` : `${d.column} : rien. Ouvrir pour en ajouter`} aria-label={`${d.column}, étape ${n} ${r.step.label.trim() || ''} : ${names.length ? names.join(', ') : 'rien'}. Ouvrir`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark max-sm:h-11 max-sm:w-11">
                          <span aria-hidden className={`flex h-4 w-4 items-center justify-center rounded-full border text-[11px] font-bold leading-none ${has ? 'border-delacour-primary bg-delacour-primary text-white' : d.required ? 'border-amber-600 bg-amber-400 text-slate-900' : 'border-slate-400 bg-white'}`}>{names.length > 1 ? names.length : ''}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )];
            })}
          </tbody>
        </table>
      </div>
      {pick && <Modal onClose={() => setPick(null)} title={`${pick.def.column} · étape ${pick.row.index + 1}`} subtitle={`${pick.row.flow.name || 'Sans nom'} : ${pick.row.step.label.trim() || 'sans intitulé'}`}
        footer={<Button kind="primary" onClick={() => setPick(null)}>Fermer</Button>}>
        <SupportCell def={pick.def} links={state.flows[pick.row.flow.id]?.steps.find(q => q.id === pick.row.step.id)?.links || []} flow={state.flows[pick.row.flow.id] ?? pick.row.flow} step={state.flows[pick.row.flow.id]?.steps.find(q => q.id === pick.row.step.id) ?? pick.row.step} nav={nav} readOnly={!can}
          onLinks={v => update(x => { const st = x.flows[pick.row.flow.id]?.steps.find(q => q.id === pick.row.step.id); if (st) st.links = v.length ? v : undefined; })} />
      </Modal>}
      {lost.length > 0 && <section aria-label="Fiches non reliées à un logigramme" className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <h3 className="text-xs font-bold text-slate-900">Fiches non reliées à un logigramme ({lost.length})</h3>
        <p className="text-xs text-slate-600">Des instructions, compétences ou fonctions clés de ce processus qu'aucune étape n'utilise. Pour les mettre sur une étape : « + » dans la case de la matrice, puis « Rattacher ».</p>
        <ul className="space-y-0.5">{lost.map(o => <li key={`${o.kind}${o.id}`} className="flex flex-wrap items-center gap-2 text-xs"><span className="min-w-0 flex-1 text-slate-800"><strong>{SUPPORTS.find(d => d.kind === o.kind)!.column}</strong> · {o.label}</span>
          <Button onClick={() => nav.open(o.tool as ToolId, o.id)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button></li>)}</ul>
      </section>}
    </div>
  );
}
