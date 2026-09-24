// Tool 1.2, screen "Cartographie": are we ready? Summary, messages, criticality matrix, risks by criticality.
import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Printer } from 'lucide-react';
import type { Risk, State } from '../domain/types';
import { lastTest, riskInsights, riskState, riskSummary, risksInOrder, STATE_INFO, zoneOf } from '../domain/risk';
import { typicalRisks } from '../domain/riskTemplates';
import { PROFILES, type ProfileKey } from '../domain/templates';
import { formatValue } from '../domain/numbers';
import { frDate } from '../domain/periods';
import { legacyLocalRisks } from '../store/local';
import { useStore } from '../store/StoreContext';
import { Button, Card, StatusBadge } from './common';
import { ScoreBadge, ZONE_STYLE } from './RiskSheet';

const TONE = { good: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-950', bad: 'border-red-200 bg-red-50 text-red-900' };

export function Risques({ onOpenRisk, onNewRisk }: { onOpenRisk(id: string): void; onNewRisk(): void }) {
  const { state, update, teamView } = useStore();
  const [cell, setCell] = useState<[number, number] | null>(null);
  const legacy = useMemo(() => legacyLocalRisks(), []);
  if (!state) return null;
  const risks = risksInOrder(state);
  const addAll = (rs: Risk[]) => update(d => { rs.forEach(r => { d.risks[r.id] = r; }); });
  const profile = (state.settings.profile in PROFILES ? state.settings.profile : 'industrie') as ProfileKey;

  if (!risks.length) {
    return (
      <Card className="space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-sm font-bold text-delacour-primary">Plans B : de quoi l'entreprise ne peut-elle pas se passer ?</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">Recensez les machines, personnes, fournisseurs, clients et logiciels dont l'arrêt bloque l'activité. Pour chacun : un Plan B, un responsable, une fiche réflexe et un test tous les 6 mois.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button kind="primary" onClick={() => addAll(typicalRisks(profile))}>Partir des 8 risques fréquents ({PROFILES[profile]})</Button>
          <Button onClick={onNewRisk}><Plus size={14} />Ajouter un risque</Button>
          {legacy.length > 0 && <Button onClick={() => addAll(legacy)}>Reprendre les {legacy.length} risques de l'ancienne version</Button>}
        </div>
      </Card>
    );
  }

  const shown = cell ? risks.filter(r => r.gravity === cell[0] && r.likelihood === cell[1]) : risks;
  return (
    <div className="space-y-4">
      <Summary s={state} team={teamView} />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="space-y-2 p-3 sm:p-4 print:break-inside-avoid">
          <h2 className="text-xs font-bold text-slate-900">Matrice de criticité</h2>
          <Matrix risks={risks} cell={cell} setCell={setCell} />
          <p className="text-[11px] text-slate-500">{cell ? <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => setCell(null)}>Afficher tous les risques</button> : 'Cliquez sur une case pour filtrer la liste.'}</p>
        </Card>
        <Card className="min-w-0 space-y-2 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-slate-900">Risques par criticité <span className="font-normal text-slate-500">{shown.length}</span></h2>
            <div className="flex gap-2 print:hidden">
              <Button kind="primary" onClick={onNewRisk}><Plus size={14} />Ajouter un risque</Button>
              <Button onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
            </div>
          </div>
          {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun risque dans cette case.</p> : (
            <ul className="divide-y divide-slate-100">
              {shown.map(r => <RiskRow key={r.id} s={state} r={r} open={() => onOpenRisk(r.id)} />)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Summary({ s, team }: { s: State; team: boolean }) {
  const sum = riskSummary(s);
  const list = riskInsights(s);
  const cov = sum.coveragePct ?? 0;
  const covTone = cov >= 70 ? 'border-emerald-200 bg-emerald-50/60' : cov >= 40 ? 'border-amber-300 bg-amber-50/70' : 'border-red-300 bg-red-50/70';
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <h2 className="text-sm font-bold text-delacour-primary">Sommes-nous prêts ?</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile title="Couverture testée" value={`${cov} %`} sub="de la criticité a un Plan B testé depuis moins de 6 mois" cls={covTone} />
        <Tile title="Risques recensés" value={String(sum.count)} sub={`dont ${sum.critical} critique(s)`} />
        <Tile title="Sans Plan B" value={String(sum.byState.uncovered)} sub="risque(s) non couvert(s)" cls={sum.byState.uncovered ? 'border-red-300 bg-red-50/70' : undefined} />
        {team ? <Tile title="Exposition annuelle" value="Masqué" sub="Réservé à la direction" />
          : <Tile title="Exposition annuelle" value={sum.exposure === null ? '—' : formatValue(sum.exposure, '€')}
            sub={sum.exposure === null ? 'Renseignez le coût d\'un arrêt dans les fiches' : `perte moyenne par an, sur ${sum.exposureCount} risque(s) chiffré(s)`} />}
      </div>
      {list.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map(i => <li key={i.key} className={`rounded-lg border px-3 py-2 text-[11px] ${TONE[i.tone]}`}><strong className="block text-xs">{i.title}</strong>{i.text}</li>)}
        </ul>
      )}
    </Card>
  );
}

function Tile({ title, value, sub, cls = 'border-slate-200 bg-white' }: { title: string; value: string; sub: string; cls?: string }) {
  return (
    <div className={`rounded-lg border p-2.5 ${cls}`}>
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="font-mono text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-600">{sub}</div>
    </div>
  );
}

// Gravity from 4 (top) to 1, likelihood from 1 (left) to 4
function Matrix({ risks, cell, setCell }: { risks: Risk[]; cell: [number, number] | null; setCell(c: [number, number] | null): void }) {
  return (
    <div className="mx-auto flex max-w-[300px] gap-1.5">
      <div className="flex w-3 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold text-slate-500">Gravité</span></div>
      <div className="flex-1 space-y-1">
        {[4, 3, 2, 1].map(g => (
          <div key={g} className="grid grid-cols-[14px_repeat(4,1fr)] gap-1">
            <span className="self-center text-center font-mono text-[11px] text-slate-500">{g}</span>
            {[1, 2, 3, 4].map(l => {
              const n = risks.filter(r => r.gravity === g && r.likelihood === l).length;
              const sel = cell?.[0] === g && cell?.[1] === l;
              return (
                <button key={l} type="button" disabled={!n} onClick={() => setCell(sel ? null : [g, l])} aria-pressed={sel}
                  aria-label={`Gravité ${g}, probabilité ${l} : ${n} risque(s)`}
                  className={`flex aspect-square items-center justify-center rounded-md font-mono text-sm font-bold transition ${n ? ZONE_STYLE[zoneOf(g * l)] : `${ZONE_STYLE[zoneOf(g * l)]} opacity-20`} ${sel ? 'ring-2 ring-slate-900 ring-offset-1' : ''} ${n ? 'hover:opacity-90' : ''}`}>
                  {n || ''}
                </button>
              );
            })}
          </div>
        ))}
        <div className="grid grid-cols-[14px_repeat(4,1fr)] gap-1 text-center font-mono text-[11px] text-slate-500"><span />{[1, 2, 3, 4].map(l => <span key={l}>{l}</span>)}</div>
        <div className="text-center text-[11px] font-semibold text-slate-500">Probabilité</div>
      </div>
    </div>
  );
}

function RiskRow({ s, r, open }: { s: State; r: Risk; open(): void }) {
  const st = STATE_INFO[riskState(s, r)];
  const t = lastTest(r);
  const proc = s.processes.find(p => p.id === r.processId);
  return (
    <li>
      <button type="button" onClick={open} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50">
        <ScoreBadge r={r} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-xs font-semibold text-slate-900 sm:truncate">{r.title || 'Sans titre'}</span>
          <span className="block truncate text-[11px] text-slate-500">{[proc?.name.split(' · ')[0] || r.processId, r.planB ? `Plan B : ${r.planB}` : r.resource].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="hidden shrink-0 text-right text-[11px] text-slate-600 sm:block">
          <span className="block font-semibold text-slate-800">{r.owner || <span className="text-red-700">À désigner</span>}</span>
          {t ? `Test ${t.ok ? 'réussi' : 'raté'} le ${frDate(t.date)}` : 'Jamais testé'}
        </span>
        <span className="shrink-0"><StatusBadge level={st.tone} text={st.label} /></span>
        <ChevronRight size={16} className="shrink-0 text-slate-400 print:hidden" />
      </button>
    </li>
  );
}

