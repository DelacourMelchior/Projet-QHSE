// On the screen of any tool: the flowcharts (tool 1.4) that pass through it, as a whole or by a step. Nothing is drawn when none does.
import { GitBranch } from 'lucide-react';
import { toolUses } from '../../domain/mapCover';
import { useStore } from '../../store/StoreContext';
import { openTab } from '../tools';
import { NewTab } from '../common';
import { plural } from '../../domain/receptions';

const MAX = 6;
export function ToolFlows({ tool }: { tool: string }) {
  const { state, flush } = useStore();
  if (!state) return null;
  const uses = toolUses(state, tool);
  // the steps that use a record of this tool (not the tool as a whole): counted, with a way to the first
  const recs = Object.values(state.flows || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr')).flatMap(flow => flow.steps.flatMap((step, index) => ((step.links || []).some(l => l.tool === tool && l.id) ? [{ flow, step, index }] : [])));
  if (!uses.length && !recs.length) return null;
  const open = (flowId: string) => openTab(flush, '1.4', `flow:${flowId}`);
  return (
    <section aria-label="Logigrammes qui passent par cet outil" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950 print:hidden">
      <span className="flex items-center gap-1.5 font-bold"><GitBranch size={13} aria-hidden />Logigrammes qui passent par cet outil{uses.length ? ' :' : ''}</span>
      {uses.slice(0, MAX).map(u => (
        <button key={`${u.flow.id}${u.step?.id ?? ''}`} type="button" onClick={() => open(u.flow.id)} className="inline-flex min-h-[28px] items-center gap-1 font-semibold underline-offset-2 hover:underline max-sm:min-h-[44px]">
          {u.flow.name || 'Sans nom'} ({u.step ? `étape ${u.index + 1}` : 'entier'})<NewTab /></button>
      ))}
      {recs.length > 0 && <button type="button" onClick={() => open(recs[0].flow.id)} className="inline-flex min-h-[28px] items-center gap-1 font-semibold underline-offset-2 hover:underline max-sm:min-h-[44px]">{plural(recs.length, 'étape')} {recs.length > 1 ? 'utilisent' : 'utilise'} des fiches de cet outil (première : {recs[0].flow.name || 'Sans nom'}, étape {recs[0].index + 1})<NewTab /></button>}
      {uses.length > MAX && <span>et {uses.length - MAX} autre{uses.length - MAX > 1 ? 's' : ''}</span>}
    </section>
  );
}
