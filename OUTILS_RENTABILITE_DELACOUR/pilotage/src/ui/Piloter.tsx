// Screen 1 — "Où en est-on ?": executive summary, analysis messages, one block per process (table + chart).
import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import type { Kpi, Period, Process, State } from '../domain/types';
import {
  actionsOf, insights, isOpen, kpiByRole, openActionWithPilot, statusAt, synthesis, timelinePeriods, trend, valueOf, yearSummary,
} from '../domain/engine';
import { formatCompact, formatPct, formatValue } from '../domain/numbers';
import { addMonths, periodLabel, periodShort } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, LEVEL_STYLE, StatusBadge } from './common';
import { ChartLegend, KpiChart, useWidth } from './KpiChart';

const COLORS = ['#059669', '#B8893F', '#2563EB', '#7C3AED', '#DC2626', '#0891B2'];
const shortName = (k: Kpi) => k.name.replace(/\s*\(.*\)\s*$/, '');

export function Piloter({ onOpenKpi, onNewAction, onOpenAction, goSaisir }: {
  onOpenKpi(id: string): void; onNewAction(kpiId: string): void; onOpenAction(id: string): void; goSaisir(): void;
}) {
  const { state, period, teamView } = useStore();
  if (!state) return null;
  const syn = synthesis(state, period);
  const empty = !Object.keys(state.values).length;

  return (
    <div className="space-y-4">
      {empty ? <EmptyState goSaisir={goSaisir} /> : <Summary state={state} period={period} team={teamView} />}
      {[...state.processes].sort((a, b) => a.order - b.order).map(p => (
        <ProcessBlock key={p.id} s={state} period={period} team={teamView} process={p} open={onOpenKpi} newAction={onNewAction} openAction={onOpenAction} />
      ))}
      {syn.total === 0 && <p className="text-xs text-slate-500">Aucun indicateur : ajoutez-en depuis Réglages.</p>}
    </div>
  );
}

function Summary({ state: s, period, team }: { state: State; period: Period; team: boolean }) {
    const syn = synthesis(s, period);
    const ca = kpiByRole(s, 'ca'), marge = kpiByRole(s, 'marge'), treso = kpiByRole(s, 'treso');
    const tone = (lvl: string) => lvl === 'ok' ? 'border-emerald-200 bg-emerald-50/60' : lvl === 'warn' ? 'border-amber-300 bg-amber-50/70' : lvl === 'alert' ? 'border-red-300 bg-red-50/70' : 'border-slate-200 bg-white';
    const hidden = (k?: Kpi) => !!k && team && k.confidential;
    const monthCard = (title: string, k?: Kpi) => {
      if (!k) return <SumCard title={title} value="—" sub="Indicateur absent" cls={tone('pending')} />;
      if (hidden(k)) return <SumCard title={title} value="Masqué" sub="Confidentiel, réservé à la direction" cls={tone('pending')} />;
      const st = statusAt(s, k, period);
      return <SumCard title={title} value={formatValue(valueOf(s, k.id, period), k.unit)} sub={`${periodLabel(period)} · cible ${k.target}`} cls={tone(st.level)} dot={st.level} />;
    };
    let caCard = monthCard(`CA cumulé à ${periodLabel(period)}`, ca);
    if (ca && !hidden(ca) && syn.caYtd) {
      const g = syn.caYtd.gapPct;
      const lvl = g === null ? 'pending' : g >= 0 ? 'ok' : g >= -10 ? 'warn' : 'alert';
      caCard = <SumCard title={`CA cumulé à ${periodLabel(period)}`} value={formatValue(syn.caYtd.value, '€')}
        sub={g === null ? 'Objectif annuel non défini' : `${formatPct(g)} vs objectif à date (${formatValue(syn.caYtd.budget, '€')})`} cls={tone(lvl)} dot={lvl as never} />;
    }
    const alertLvl = syn.alerts.length === 0 ? 'ok' : syn.orphans.length ? 'alert' : 'warn';
    const list = insights(s, period, team);
    return (
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-delacour-primary">Synthèse · {periodLabel(period)}</h2>
          <span className="text-[11px] text-slate-500">{syn.filled} indicateur(s) saisi(s) sur {syn.total}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {caCard}
          {monthCard('Marge brute', marge)}
          {monthCard('Trésorerie', treso)}
          <SumCard title="Indicateurs en alerte" value={`${syn.alerts.length} / ${syn.total}`} cls={tone(alertLvl)} dot={alertLvl}
            sub={syn.alerts.length ? `${syn.orphans.length ? `${syn.orphans.length} sans pilote` : 'Tous pilotés'}` : 'Tout est conforme'} />
        </div>
        {list.length > 0 && (
          <ul className="space-y-1.5">
            {list.map(i => (
              <li key={i.key} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-snug text-slate-700">
                {i.tone === 'good' ? <CheckCircle2 size={15} className="mt-px shrink-0 text-emerald-600" /> : <AlertTriangle size={15} className={`mt-px shrink-0 ${i.tone === 'bad' ? 'text-red-600' : 'text-amber-600'}`} />}
                <span><strong className="text-slate-900">{i.title} :</strong> {i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
}

function ProcessBlock({ s, period, team, process, open, newAction, openAction }: {
    s: State; period: Period; team: boolean; process: Process; open(id: string): void; newAction(id: string): void; openAction(id: string): void;
  }) {
    const kpis = process.kpiIds.map(id => s.kpis[id]).filter(Boolean);
    const [sel, setSel] = useState<string | 'all'>(kpis[0]?.id || '');
    const [ref, w] = useWidth<HTMLDivElement>();
    const ps = timelinePeriods(s);
    const shown = [5, 4, 3, 2, 1, 0].map(i => addMonths(period, -i)).filter(p => ps.includes(p));
    const alerts = kpis.filter(k => ['warn', 'alert'].includes(statusAt(s, k, period).level)).length;
    const perRow = w >= 1100 ? 3 : w >= 700 ? 2 : 1;
    const masked = (k: Kpi) => team && k.confidential;
    if (!kpis.length) return null;

    return (
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: process.color }} />
          <h2 className="text-sm font-bold text-slate-900">{process.name}</h2>
          {alerts > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">{alerts} en alerte</span>}
        </div>

        {/* Table (sm and up) */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[11px] text-slate-500">
                <th className="border-b border-slate-200 py-2 pr-3 font-semibold">Indicateur</th>
                {shown.map(p => <th key={p} className={`border-b border-slate-200 px-2 py-2 text-right font-semibold ${p === period ? 'bg-amber-50 text-amber-900' : ''}`}>{periodShort(p)}</th>)}
                <th className="border-b border-slate-200 px-2 py-2 text-right font-semibold">Année</th>
                <th className="border-b border-slate-200 px-2 py-2 font-semibold">Statut</th>
                <th className="border-b border-slate-200 py-2 pl-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map(k => {
                const st = statusAt(s, k, period);
                const ys = yearSummary(s, k, period);
                const act = actionsOf(s, k.id).find(isOpen);
                const needs = ['warn', 'alert'].includes(st.level) && !openActionWithPilot(s, k.id);
                return (
                  <tr key={k.id} className="group hover:bg-slate-50">
                    <td className="border-b border-slate-100 py-2 pr-3">
                      <button type="button" onClick={() => open(k.id)} className="text-left font-semibold text-slate-900 hover:text-delacour-primary hover:underline">{shortName(k)}</button>
                      <div className="text-[11px] text-slate-500">Cible <span className="font-mono text-slate-700">{masked(k) ? '···' : k.target}</span></div>
                    </td>
                    {shown.map(p => (
                      <td key={p} className={`border-b border-slate-100 px-2 py-2 text-right font-mono ${p === period ? 'bg-amber-50/60 font-bold text-slate-950' : 'text-slate-700'}`}>
                        {masked(k) ? '···' : formatValue(valueOf(s, k.id, p), k.unit)}
                      </td>
                    ))}
                    <td className="border-b border-slate-100 px-2 py-2 text-right">
                      <div className="font-mono font-semibold text-slate-900">{masked(k) ? '···' : formatValue(ys.value, k.unit)}</div>
                      <div className="text-[11px] text-slate-400">{ys.label}</div>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2">{masked(k) ? <span className="text-[11px] text-slate-400">Confidentiel</span> : <StatusBadge level={st.level} text={st.text} />}</td>
                    <td className="border-b border-slate-100 py-2 pl-2">
                      {act ? <button type="button" onClick={() => openAction(act.id)} className="max-w-[210px] truncate text-left text-[11px] text-slate-700 hover:underline">
                        <span className="font-semibold">{act.pilot || 'Pilote ?'}</span> · {act.plan[0]?.text || 'Plan à rédiger'}</button>
                        : needs ? <Button kind="danger" onClick={() => newAction(k.id)} className="!px-2 !py-1">Action requise</Button>
                        : <button type="button" onClick={() => newAction(k.id)} className="text-[11px] text-slate-400 hover:text-delacour-primary">+ Action</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards (phones) */}
        <div className="space-y-2 sm:hidden">
          {kpis.map(k => {
            const st = statusAt(s, k, period);
            const prev = valueOf(s, k.id, addMonths(period, -1));
            const needs = ['warn', 'alert'].includes(st.level) && !openActionWithPilot(s, k.id);
            return (
              <div key={k.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => open(k.id)} className="text-left text-[13px] font-semibold text-slate-900">{shortName(k)}</button>
                  {!masked(k) && <StatusBadge level={st.level} text={st.text} />}
                </div>
                <div className="mt-1.5 flex items-end justify-between">
                  <div className="font-mono text-xl font-bold text-slate-950">{masked(k) ? 'Confidentiel' : formatValue(valueOf(s, k.id, period), k.unit)}</div>
                  <div className="text-right text-[11px] text-slate-500">Cible {masked(k) ? '···' : k.target}<br />Mois préc. {masked(k) ? '···' : formatValue(prev, k.unit)}</div>
                </div>
                {needs && <Button kind="danger" onClick={() => newAction(k.id)} className="mt-2 w-full">Action requise</Button>}
              </div>
            );
          })}
        </div>

        {/* Chart: one KPI large, or all KPIs as small multiples */}
        <div ref={ref} className="mt-3 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {kpis.map((k, i) => {
              const on = sel === k.id, st = statusAt(s, k, period);
              return (
                <button key={k.id} type="button" onClick={() => setSel(k.id)} aria-pressed={on}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${on ? 'bg-white text-slate-900 shadow-sm' : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'}`}
                  style={on ? { borderColor: COLORS[i % COLORS.length], borderWidth: 2 } : undefined}>
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {shortName(k)}
                  {!masked(k) && <><span className="font-mono text-slate-800">{formatCompact(valueOf(s, k.id, period), k.unit)}</span><span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLE[st.level].dot}`} /></>}
                </button>
              );
            })}
            <button type="button" onClick={() => setSel(sel === 'all' ? kpis[0].id : 'all')} aria-pressed={sel === 'all'}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${sel === 'all' ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}>
              {sel === 'all' ? 'Un seul indicateur' : 'Tous les indicateurs'}
            </button>
          </div>
          {sel === 'all' ? (
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))` }}>
              {kpis.map((k, i) => <ChartBlock key={k.id} s={s} k={k} period={period} masked={masked(k)} open={open} color={COLORS[i % COLORS.length]} compact />)}
            </div>
          ) : kpis.filter(k => k.id === sel).map(k => <ChartBlock key={k.id} s={s} k={k} period={period} masked={masked(k)} open={open} color={COLORS[kpis.indexOf(k) % COLORS.length]} />)}
          <ChartLegend />
        </div>
      </Card>
    );
}

function ChartBlock({ s, k, period, masked, open, color, compact }: {
  s: State; k: Kpi; period: Period; masked: boolean; open(id: string): void; color: string; compact?: boolean;
}) {
      const [ref, w] = useWidth<HTMLDivElement>();
      const st = statusAt(s, k, period), t = trend(s, k, period);
      return (
        <div ref={ref} className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[11px] text-slate-600">
            <button type="button" onClick={() => open(k.id)} className="text-xs font-bold text-slate-900 hover:text-delacour-primary">{shortName(k)}</button>
            {!masked && <>
              <span className="font-mono font-semibold text-slate-900">{formatValue(valueOf(s, k.id, period), k.unit)}</span>
              <StatusBadge level={st.level} text={st.text} />
              <span>Cible <span className="font-mono text-[#8A6424]">{k.target}</span></span>
              {t && <span className={t.isGood === null ? 'text-slate-600' : t.isGood ? 'text-emerald-700' : 'text-red-700'}>
                {t.dir === 'up' ? <TrendingUp size={12} className="mr-0.5 inline" /> : t.dir === 'down' ? <TrendingDown size={12} className="mr-0.5 inline" /> : <ArrowRight size={12} className="mr-0.5 inline" />}
                Tendance 3 mois : <strong>{t.dir === 'stable' ? 'stable' : `${t.dir === 'up' ? 'en hausse' : 'en baisse'} de ${Math.abs(Math.round(t.pct))} %`}</strong>{t.drifting ? ' · dérive lente' : ''}
              </span>}
            </>}
          </div>
          {masked ? <div className="flex h-[170px] items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] text-slate-500">Graphique réservé à la direction</div>
            : <KpiChart state={s} kpi={k} period={period} color={color} height={compact ? 170 : (w < 640 ? 200 : 240)} compact={compact} />}
        </div>
      );
}

function SumCard({ title, value, sub, cls, dot }: { title: string; value: string; sub: string; cls: string; dot?: 'ok' | 'warn' | 'alert' | 'pending' }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-xl border p-3 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_STYLE[dot].dot}`} />}{title}
      </div>
      <div className="truncate font-mono text-xl font-bold text-slate-900 sm:text-2xl">{value}</div>
      <div className="text-[11px] leading-snug text-slate-600">{sub}</div>
    </div>
  );
}

function EmptyState({ goSaisir }: { goSaisir(): void }) {
  return (
    <Card className="space-y-2 p-4">
      <h2 className="text-sm font-bold text-delacour-primary">Aucun chiffre saisi pour l'instant</h2>
      <p className="max-w-2xl text-xs text-slate-600">Commencez par les chiffres du dernier mois clôturé : la synthèse, les alertes et les graphiques se remplissent aussitôt.</p>
      <Button kind="primary" onClick={goSaisir}>Saisir les chiffres d'un mois</Button>
    </Card>
  );
}
