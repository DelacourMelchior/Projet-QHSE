// Link with the monthly dashboard (tool 1.1): the value a tool computes for a KPI, next to the value entered, one click to copy it.
import { memo, useMemo } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { Period } from '../domain/types';
import { feeds } from '../domain/feeds';
import { valueOf } from '../domain/engine';
import { formatValue } from '../domain/numbers';
import { periodLabel } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card } from './common';

// Only the figures of its own tool are computed, and only when the data or the month changed (not at every key typed in the screen that holds it)
export const FeedBox = memo(function FeedBox({ tool, period }: { tool: string | string[]; period: Period }) {
  const { state, update, teamView } = useStore();
  const tools = Array.isArray(tool) ? tool : [tool], key = tools.join(',');
  const list = useMemo(() => (state ? feeds(state, period, new Date(), tools).filter(f => tools.includes(f.tool)) : []), [state, period, key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state || !list.length) return null;
  const write = (kpiId: string, v: number) => update(d => {
    if (period > d.timeline.end) d.timeline.end = period;
    if (period < d.timeline.start) d.timeline.start = period;
    (d.values[kpiId] ||= {})[period] = v;
  });
  return (
    <Card className="space-y-2 p-3 sm:p-4 print:hidden">
      <h2 className="text-xs font-bold text-slate-900">Tableau de pilotage (outil 1.1) · {periodLabel(period)}</h2>
      <ul className="space-y-1.5">
        {list.map(f => {
          const entered = valueOf(state, f.kpi.id, period);
          const hidden = teamView && f.kpi.confidential;
          const same = entered !== null && Math.abs(entered - f.value) < 0.05;
          return (
            <li key={f.kpi.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
              <span className="min-w-0 flex-1"><strong className="text-slate-900">{f.kpi.name}</strong> : calculé <strong className="font-mono">{hidden ? '···' : formatValue(f.value, f.kpi.unit)}</strong> ({f.how}), saisi <span className="font-mono">{hidden ? '···' : formatValue(entered, f.kpi.unit)}</span></span>
              {!hidden && (same ? <span className="font-semibold text-emerald-700">À jour</span>
                : <Button className="!px-2 !py-1" onClick={() => write(f.kpi.id, f.value)}><ArrowRightLeft size={13} />Reporter dans le tableau</Button>)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
});
