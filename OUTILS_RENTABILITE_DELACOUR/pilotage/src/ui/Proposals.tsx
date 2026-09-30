// Values of the settings that a tool can compute: shown next to the current ones, written on click only.
import type { State } from '../domain/types';
import { useStore } from '../store/StoreContext';
import { Button, Card } from './common';

export interface Proposal {
  label: string;
  use: string;             // what the value is used for
  now: string;             // current value, as shown
  next: string | null;     // proposed value, null when it cannot be computed
  none?: string;           // what to say then
  same?: boolean;          // already the proposed value
  save(d: State): void;
}

export function Proposals({ rows, note }: { rows: Proposal[]; note: string }) {
  const { update } = useStore();
  return (
    <Card className="space-y-2 p-3 sm:p-4 print:hidden">
      <h2 className="text-xs font-bold text-slate-900">Valeurs proposées aux autres outils</h2>
      <p className="text-[11px] text-slate-500">{note}</p>
      <ul className="divide-y divide-slate-100">
        {rows.map(r => (
          <li key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="min-w-0 flex-1 basis-64 text-[11px] text-slate-600"><strong className="block text-xs text-slate-900">{r.label}</strong>{r.use}</span>
            <span className="text-[11px] text-slate-600">Actuellement <strong className="font-mono text-slate-900">{r.now}</strong></span>
            {r.next === null ? <span className="text-[11px] text-slate-500">{r.none || 'Non calculable'}</span>
              : r.same ? <span className="text-[11px] font-semibold text-emerald-800">À jour</span>
              : <>
                <span className="text-[11px] text-slate-600">Proposé <strong className="font-mono text-slate-900">{r.next}</strong></span>
                <Button onClick={() => update(r.save)}>Reporter</Button>
              </>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
