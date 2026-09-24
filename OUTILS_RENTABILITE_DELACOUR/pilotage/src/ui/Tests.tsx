// Tool 1.2, screen "Tests": a Plan B is only guaranteed if tested within 6 months. Most urgent first.
import { CalendarCheck } from 'lucide-react';
import { lastTest, riskState, risksInOrder, STATE_INFO, testDueDate, TEST_VALIDITY_DAYS } from '../domain/risk';
import { frDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, StatusBadge } from './common';
import { ScoreBadge } from './RiskSheet';

export function Tests({ onOpenRisk }: { onOpenRisk(id: string, step?: number): void }) {
  const { state } = useStore();
  if (!state) return null;
  const rows = risksInOrder(state).map(r => ({ r, st: riskState(state, r), due: testDueDate(r), t: lastTest(r) }))
    .filter(x => x.st !== 'uncovered')
    .sort((a, b) => STATE_INFO[a.st].order - STATE_INFO[b.st].order || (a.due || '').localeCompare(b.due || ''));
  const uncovered = Object.keys(state.risks).length - rows.length;

  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Tests des Plans B</h2>
        <p className="text-[11px] text-slate-500">Un Plan B non testé depuis {TEST_VALIDITY_DAYS} jours n'est plus garanti : un contact a changé, un accès a expiré, le relais n'est plus disponible.{uncovered ? ` ${uncovered} risque(s) sans Plan B n'apparaissent pas ici.` : ''}</p>
      </div>
      {rows.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun Plan B à tester : écrivez d'abord les parades dans la cartographie.</p> : (
        <ul className="divide-y divide-slate-100">
          {rows.map(({ r, st, due, t }) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
              <ScoreBadge r={r} />
              <div className="min-w-0 flex-1 basis-48">
                <div className="truncate text-xs font-semibold text-slate-900">{r.title}</div>
                <div className="truncate text-[11px] text-slate-500">{r.testMethod ? `${r.testMethod}${r.testCriterion ? ` · réussi si : ${r.testCriterion}` : ''}` : 'Méthode de test à définir'}</div>
              </div>
              <div className="shrink-0 text-[11px] text-slate-600 sm:w-44">
                <div>{t ? `Dernier : ${t.ok ? 'réussi' : 'raté'} le ${frDate(t.date)}` : 'Jamais testé'}</div>
                {due && <div className={st === 'expired' ? 'font-semibold text-amber-800' : ''}>À refaire avant le {frDate(due)}</div>}
              </div>
              <StatusBadge level={STATE_INFO[st].tone} text={STATE_INFO[st].label} />
              <Button onClick={() => onOpenRisk(r.id, 3)} className="shrink-0"><CalendarCheck size={14} />Enregistrer un test</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
