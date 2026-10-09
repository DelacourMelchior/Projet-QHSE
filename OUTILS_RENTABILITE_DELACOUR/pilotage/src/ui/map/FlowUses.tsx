// In the sheet of an equipment, an indicator, a risk, an instruction, a key function or a skill: the flowcharts (tool 1.4) that rely on it, as a whole or by one of their steps, to see
// what is touched if it stops. Quiet by default in the sheets of the tools that are not about people: nothing is drawn when no flowchart uses the record.
import { GitBranch } from 'lucide-react';
import { LINK_KINDS } from '../../domain/cartography';
import { usedInFlows } from '../../domain/mapCover';
import { useStore } from '../../store/StoreContext';
import { openTab } from '../tools';
import { NewTab } from '../common';

const THIS: Record<string, string> = { '1.1': 'cet indicateur', '1.2': 'ce risque', '1.3': 'ce contact', '3.1': 'ce fournisseur', '3.2': 'cette instruction', '3.3': 'cet équipement', '4.1': 'cette fonction clé', '4.2': 'cette compétence' };

export function FlowUses({ tool, id, quiet }: { tool: string; id: string; quiet?: boolean }) {
  const { state, flush } = useStore();
  if (!state || !LINK_KINDS[tool]) return null;
  const uses = usedInFlows(state, tool, id);
  if (quiet && !uses.length) return null;
  const open = (flowId: string) => openTab(flush, '1.4', `flow:${flowId}`);
  return (
    <section aria-label="Utilisé dans les logigrammes" className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><GitBranch size={13} aria-hidden />Utilisé dans les logigrammes (cartographie 1.4)</h3>
      {uses.length ? <>
        <p className="text-xs text-slate-600">Si {THIS[tool]} disparaît ou change, ces logigrammes sont touchés :</p>
        <ul className="space-y-0.5">{uses.map(u => (
          <li key={`${u.flow.id}${u.step?.id ?? ''}`}><button type="button" onClick={() => open(u.flow.id)} className="inline-flex min-h-[32px] items-center gap-1 text-left text-xs font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px]">
            {u.flow.name || 'Sans nom'} · {u.step ? `étape ${u.index + 1} « ${u.step.label.trim() || 'sans intitulé'} »` : 'le logigramme entier'}<NewTab /></button></li>
        ))}</ul>
      </> : <p className="text-xs text-slate-600">Aucun logigramme ne s'appuie encore sur {THIS[tool]}. Une étape, ou le logigramme entier, peut s'appuyer sur lui.</p>}
    </section>
  );
}
