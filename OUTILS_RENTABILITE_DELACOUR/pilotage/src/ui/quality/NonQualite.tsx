// Tool 5.2 "Coût de non-qualité": every defect, complaint and supplier incident of the month, in euros,
// imputed to the process at its origin; 12-month trend; link with the non-quality KPI of tool 1.1.
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import type { State } from '../../domain/types';
import { cnqItems, cnqMonth, cnqSeries, compensatingRevenue, qualityInsights } from '../../domain/quality';
import { frStamp, PROCESS_IDS, processLabel } from '../../domain/base';
import { kpiByRole } from '../../domain/engine';
import { formatValue } from '../../domain/numbers';
import { addMonths, periodLabel, periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Empty, Method, NumInput, Summary, Tile, ToolHeader } from '../common';
import { MonthBars, ShareBars } from '../Bars';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';

const KIND = { nc: 'Bac rouge', complaint: 'Réclamation', debit: 'Fournisseur' } as const;
const TOOL = { nc: '5.1', complaint: '2.3', debit: '3.1' } as const;

export function NonQualite({ nav }: ScreenProps) {
  const { state, period, setPeriod, update } = useStore();
  const [proc, setProc] = useState<string | null>(null);
  // a month still to come has no cost yet: open on the current month
  useEffect(() => { const now = periodOfDate(new Date()); if (period > now) setPeriod(now); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  if (!Object.keys(state.ncs).length && !Object.keys(state.complaints).length && !Object.keys(state.debits).length) {
    return (
      <Empty title="Coût de non-qualité : chaque défaut chiffré en euros" text="Le coût se calcule tout seul à partir des fiches du bac rouge (5.1), des réclamations (2.3) et des fiches de débit fournisseurs (3.1) : matière jetée, heures perdues et de retouche, transport en urgence, avoirs.">
        <Button kind="primary" onClick={() => nav.tool('5.1')}>Déclarer un premier défaut (5.1)</Button>
      </Empty>
    );
  }
  const m = cnqMonth(state, period);
  const prev = [1, 2, 3].map(i => cnqMonth(state, addMonths(period, -i)).total);
  const avg3 = prev.reduce((a, b) => a + b, 0) / 3;
  const kpi = kpiByRole(state, 'cnq');
  const items = cnqItems(state, period).filter(i => proc === null || (i.processId || '') === proc);
  const insights = qualityInsights(state, period).filter(i => ['unq', 'top', '5p'].includes(i.key));
  if (avg3 > 0 && m.total > avg3 * 1.2) insights.unshift({ key: 'up', tone: 'bad', title: 'Non-qualité en hausse', text: `${formatValue(m.total, '€')} en ${periodLabel(period)}, contre ${formatValue(avg3, '€')} en moyenne sur les 3 mois précédents.` });
  const impute = (kind: 'nc' | 'complaint', id: string, p: string) => update(d => { if (kind === 'nc') d.ncs[id].processId = p; else d.complaints[id].processId = p; });

  return (
    <div className="space-y-4">
      <Summary title={`Combien a coûté la non-qualité en ${periodLabel(period)} ?`} insights={insights} tiles={<>
        <Tile title="Coût du mois" value={formatValue(m.total, '€')} sub={kpi?.targetValue ? `cible ${kpi.target}` : `${m.items.length} événement(s) chiffré(s)`} tone={kpi?.targetValue ? (m.total > kpi.targetValue ? 'alert' : 'ok') : undefined} />
        <Tile title="CA à refaire pour compenser" value={formatValue(compensatingRevenue(m.total, state.settings.netMarginPct), '€')} sub={`sur la base d'une marge nette de ${state.settings.netMarginPct} %`} />
        <Tile title="Heures perdues et retouches" value={`${formatValue(m.hours, '')} h`} sub={`à ${formatValue(state.params.hourlyRate, '€')} de l'heure`} />
        <Tile title="Récupéré sur les fournisseurs" value={formatValue(m.recovered, '€')} sub="avoirs reçus dans le mois (3.1)" tone={m.recovered ? 'ok' : undefined} />
      </>} />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="space-y-3 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Par processus d'origine</h2>
          <ShareBars unit="€" picked={proc ?? undefined} onPick={k => setProc(proc === k ? null : k)}
            items={[...PROCESS_IDS, ''].map(p => ({ key: p, label: p ? processLabel(p) : 'À qualifier', value: m.byProcess[p] || 0 })).filter(x => x.value > 0 || x.key).sort((a, b) => b.value - a.value)} />
          <p className="text-[11px] text-slate-500">Le processus d'origine est celui qui a rendu le défaut possible, pas celui qui l'a vu. Cliquez pour filtrer le détail.</p>
        </Card>
        <Card className="min-w-0 space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">12 derniers mois</h2>
          <MonthBars data={cnqSeries(state, period).map(x => ({ period: x.period, value: x.total }))} unit="€" current={period} target={kpi?.targetValue} onPick={setPeriod} />
          {kpi?.targetValue ? <p className="text-[11px] text-slate-500">Pointillé : cible de l'indicateur « {kpi.name} » ({kpi.target}). Barre rouge : au-dessus de la cible.</p> : null}
        </Card>
      </div>

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title={`Détail de ${periodLabel(period)}${proc !== null ? ` · ${proc ? processLabel(proc) : 'à qualifier'}` : ''}`} text="Chaque ligne vient d'une fiche : cliquez sur la référence pour l'ouvrir.">
          <HourlyRate s={state} onChange={v => update(d => { d.params.hourlyRate = v; })} />
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        {items.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun coût enregistré sur ce mois.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-xs">
              <thead><tr className="text-[11px] text-slate-500">{['Date', 'Fiche', 'Origine', 'Événement', 'Processus', 'Heures', 'Coût'].map(h => <th key={h} className="border-b border-slate-200 px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.kind + i.id}>
                    <td className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-slate-600">{frStamp(i.date.slice(0, 10))}</td>
                    <td className="border-b border-slate-100 px-2 py-2"><button type="button" onClick={() => nav.tool(TOOL[i.kind], i.id)} className="font-mono font-semibold text-delacour-primary hover:underline">{i.ref}</button></td>
                    <td className="border-b border-slate-100 px-2 py-2 text-slate-600">{KIND[i.kind]}</td>
                    <td className="max-w-[320px] truncate border-b border-slate-100 px-2 py-2 text-slate-800">{i.label}</td>
                    <td className="border-b border-slate-100 px-2 py-2">
                      {i.kind === 'debit' ? <span className="text-slate-600">P3</span> : (
                        <select value={i.processId} aria-label={`Processus de ${i.ref}`} onChange={e => impute(i.kind as 'nc' | 'complaint', i.id, e.target.value)}
                          className={`rounded-md border px-1.5 py-0.5 text-[11px] ${i.processId ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50 font-semibold text-amber-900'}`}>
                          <option value="">À qualifier</option>
                          {PROCESS_IDS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{i.hours ? formatValue(i.hours, '') : ''}</td>
                    <td className="border-b border-slate-100 px-2 py-2 text-right font-mono font-semibold text-slate-900">{formatValue(i.amount, '€')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <FeedBox tool={['5.2', '5.1']} period={period} />
      <Method rule="Tant qu'un défaut est décrit avec des mots, il est négligé. Chiffré en euros et imputé à son processus, il finance sa propre disparition."
        steps={[['Chiffrer en 3 minutes', "Dès qu'une pièce est rebutée ou retouchée : matière, heures perdues, heures de retouche, frais d'urgence."], ['Imputer au processus', "Quel maillon a rendu le défaut possible ? Sans complaisance, mais sans chercher de coupable."], ['Arbitrer chaque mois', 'Le cumul du mois finance en priorité les détrompeurs et les formations qui suppriment les causes.']]}
        tips={['P1 : devis sous-évalué, achats de dépannage au prix fort.', "P2 : avenant oublié, commande incomplète qui oblige à reprendre.", 'P3 : matière mal coupée, heures de reprise passées sous silence.', 'P4 : temps du chef d\'équipe à rattraper les erreurs des recrues.', 'P5 : défaut vu trop tard, toute la série au rebut au lieu d\'une pièce.']} />
    </div>
  );
}

function HourlyRate({ s, onChange }: { s: State; onChange(v: number): void }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-slate-600">Coût horaire chargé
      <NumInput className="!w-20 !py-1 text-right" value={s.params.hourlyRate} onChange={v => v !== null && v > 0 && onChange(v)} aria-label="Coût horaire chargé (€ par heure)" />€/h
    </label>
  );
}
