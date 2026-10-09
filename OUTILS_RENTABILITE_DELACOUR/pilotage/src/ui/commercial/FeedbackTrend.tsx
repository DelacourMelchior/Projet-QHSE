// Satisfaction of tool 2.4 over twelve months (month of delivery): customers without a negative answer or a low note against
// the others, stacked per month, with the average note, the reasons for dissatisfaction and the promised delay against the real one.
// Same drawing rules as the complaints chart (2.3): two palette colours, the numbers in a legend, a tooltip and a table.
import { useState } from 'react';
import type { Period } from '../../domain/types';
import { feedbackCauses, feedbackTrend, unhappyMaxOf } from '../../domain/commercial';
import { SERIES_COLORS } from '../../domain/commercial';
import { periodLabel, periodOfDate, periodShort } from '../../domain/periods';
import { orgKey } from '../../domain/contacts';
import { useStore } from '../../store/StoreContext';
import { useWidth } from '../KpiChart';
import { GAP, inkOn, MAX_BAR, niceStep, segment } from './ComplaintTrend';

const SERIES = [{ key: 'satisfied', label: 'Clients satisfaits', color: SERIES_COLORS[0] }, { key: 'unhappy', label: 'Clients mécontents', color: SERIES_COLORS[1] }] as const;
const fr = (n: number) => String(n).replace('.', ',');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;   // the word agrees with the number (0 and 1 are singular)

// end: last month shown (the month of the dashboard); compact: the chart alone, in the dashboard; onPick: a click on a month (the list of 2.4 shows it)
export function FeedbackTrend({ end, compact = false, selected, onPick, client }: { end?: Period; compact?: boolean; selected?: Period | 'all'; onPick?(p: Period): void; client?: string }) {
  const { state: all } = useStore();
  // client: the chart of one customer (the reviews whose customer has the same name)
  const state = all && client ? { ...all, feedbacks: Object.fromEntries(Object.entries(all.feedbacks).filter(([, f]) => orgKey(f.client) === orgKey(client))) } : all;
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  if (!state || !Object.keys(state.feedbacks).length) return null;
  const current = periodOfDate(new Date()), last = end && end < current ? end : current;   // never beyond the current month
  const t = feedbackTrend(state, last);
  const c = compact ? null : feedbackCauses(state);
  const maxTotal = Math.max(1, ...t.rows.map(r => r.total)), step = niceStep(maxTotal), yMax = Math.ceil(maxTotal / step) * step;
  // same scale as the complaints chart (2.3: 230 px, 190 in the dashboard); the chart grows with the tallest month so that no bar is
  // squashed (at least 18 px per unit, a month of 1 keeps its figure), up to 560 px
  const w = Math.max(width, 280), padL = 26, padR = 6, padT = 18, padB = 26, innerW = w - padL - padR, innerH = Math.min(Math.max((compact ? 190 : 230) - padT - padB, yMax * 18), 560), height = innerH + padT + padB;
  const unit = innerH / yMax, band = innerW / t.rows.length, bar = Math.min(MAX_BAR, band * 0.62), base = padT + innerH;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const every = band >= 30 ? 1 : 2, centre = (i: number) => padL + (i + 0.5) * band;
  const label = (i: number) => (band >= 44 ? periodShort(t.rows[i].period) : periodShort(t.rows[i].period).split(' ')[0]);
  const summary = (i: number) => `${periodLabel(t.rows[i].period)} : ${plural(t.rows[i].total, 'bilan')}, ${plural(t.rows[i].satisfied, 'satisfait')}, ${plural(t.rows[i].unhappy, 'mécontent')}${t.rows[i].avg !== null ? `, note moyenne ${fr(t.rows[i].avg!)}` : ''}`;
  const tip = hover === null ? null : t.rows[hover];
  const p = c?.promise, max = unhappyMaxOf(state.params);

  return (
    <div ref={ref} className="min-w-0 space-y-2.5">
      <div>
        <h3 className="text-xs font-bold text-slate-900">{client ? `Évolution de la satisfaction de ${client} · 12 mois` : 'Évolution de la satisfaction et ses causes · 12 mois'}</h3>
        <p className="text-[11px] text-slate-500">Données de l'outil 2.4, mois de livraison. Mécontent : une réponse « non » ou une note de {max} ou moins.{onPick ? ' Cliquer sur un mois pour voir ses bilans.' : ''}</p>
      </div>
      {t.total === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">Aucun bilan complet sur ces 12 mois.</p> : (
        <>
          {!compact && <p className="text-[11px] text-slate-700">
            {t.last3 !== null && <>Note moyenne des 3 derniers mois : <strong>{fr(t.last3)}</strong>{t.before3 !== null && <> contre {fr(t.before3)} sur les 3 mois d'avant</>}.</>}
          </p>}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-700" aria-label="Légende">
            {SERIES.map(x => <li key={x.key} className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: x.color }} />{x.label}{x.key === 'unhappy' ? ` (« non » ou note ≤ ${max})` : ''}<span className="font-mono font-semibold text-slate-900">{t.rows.reduce((a, r) => a + r[x.key], 0)}</span></li>)}
          </ul>
          <div className="relative" onPointerLeave={() => setHover(null)}>
            <svg width={w} height={height} role="group" aria-label="Bilans par mois" className="block max-w-full">
              {ticks.map(v => (
                <g key={v}>
                  <line x1={padL} x2={w - padR} y1={base - v * unit} y2={base - v * unit} stroke="#e2e8f0" strokeWidth={1} />
                  <text x={padL - 6} y={base - v * unit + 3.5} textAnchor="end" className="fill-slate-500 text-[10px]">{v}</text>
                </g>
              ))}
              {t.rows.map((r, i) => {
                const segs = SERIES.filter(x => r[x.key]).map(x => ({ ...x, v: r[x.key] }));
                let acc = 0;
                return (
                  <g key={r.period} tabIndex={0} role={onPick ? 'button' : 'img'} aria-label={summary(i)} aria-pressed={onPick ? selected === r.period : undefined} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                    onClick={() => onPick?.(r.period)} onKeyDown={e => { if (onPick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(r.period); } }} className={`outline-none focus-visible:[&>rect:first-child]:fill-slate-200 ${onPick ? 'cursor-pointer' : ''}`}>
                    <rect x={padL + i * band} y={padT} width={band} height={innerH + padB - 4} fill={selected === r.period ? '#d9e6df' : hover === i ? '#f1f5f9' : 'transparent'} onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onPointerDown={() => setHover(i)} />
                    {segs.map((sg, k) => {
                      const h = sg.v * unit, y = base - (acc + sg.v) * unit; acc += sg.v;
                      const drawn = k === 0 ? h : Math.max(1, h - GAP);
                      return (
                        <g key={sg.key} pointerEvents="none">
                          <path d={segment(centre(i) - bar / 2, y, bar, drawn, k === segs.length - 1)} fill={sg.color} />
                          {drawn >= 14 && bar >= 18 && <text x={centre(i)} y={y + drawn / 2 + 3.5} textAnchor="middle" className="text-[10px] font-semibold" fill={inkOn(sg.color)}>{sg.v}</text>}
                        </g>
                      );
                    })}
                    <text x={centre(i)} y={base - r.total * unit - 5} textAnchor="middle" className={`text-[11px] font-semibold ${r.total ? 'fill-slate-900' : 'fill-slate-400'}`} pointerEvents="none">{r.total}</text>
                    {i % every === (t.rows.length - 1) % every && <text x={centre(i)} y={height - 8} textAnchor="middle" className={`text-[10px] ${i === t.rows.length - 1 ? 'fill-slate-900 font-semibold' : 'fill-slate-500'}`} pointerEvents="none">{label(i)}</text>}
                  </g>
                );
              })}
              <line x1={padL} x2={w - padR} y1={base} y2={base} stroke="#cbd5e1" strokeWidth={1} />
            </svg>
            {tip && hover !== null && (
              <div role="status" className="pointer-events-none absolute z-10 w-48 rounded-lg border border-slate-200 bg-white p-2 text-[11px] shadow-md" style={{ top: 0, left: Math.min(Math.max(centre(hover) - 96, 0), w - 192) }}>
                <div className="mb-1 font-semibold text-slate-900">{periodLabel(tip.period)} · <span className="font-mono">{tip.total}</span></div>
                {SERIES.filter(x => tip[x.key]).map(x => <div key={x.key} className="flex items-center gap-1.5 text-slate-600"><span aria-hidden className="h-[3px] w-3 shrink-0 rounded" style={{ background: x.color }} /><strong className="font-mono text-slate-900">{tip[x.key]}</strong>{x.label}</div>)}
                {tip.avg !== null && <div className="text-slate-600">Note moyenne <strong className="font-mono text-slate-900">{fr(tip.avg)}</strong></div>}
                {tip.total === 0 && <div className="text-slate-500">Aucun bilan</div>}
              </div>
            )}
          </div>
          <details className="text-[11px] text-slate-700">
            <summary className="cursor-pointer font-semibold text-delacour-primary">Voir en tableau</summary>
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-0 text-right">
                <caption className="sr-only">Bilans de fin d'affaire par mois</caption>
                <thead><tr className="text-slate-500"><th scope="col" className="border-b border-slate-200 py-1 text-left font-semibold">Mois</th>
                  {['Bilans', 'Satisfaits', 'Mécontents', '% satisfaits', 'Note moyenne'].map(h => <th key={h} scope="col" className="border-b border-slate-200 px-2 py-1 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{t.rows.map(r => (
                  <tr key={r.period}><th scope="row" className="border-b border-slate-100 py-1 text-left font-normal">{periodLabel(r.period)}</th>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono font-semibold text-slate-900">{r.total || '·'}</td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono">{r.satisfied || '·'}</td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono">{r.unhappy || '·'}</td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono">{r.pct === null ? '·' : `${r.pct} %`}</td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono">{r.avg === null ? '·' : fr(r.avg)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </details>
          {c && p && (
          <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
            <h4 className="text-[11px] font-bold text-slate-900">Pourquoi des clients ne sont pas satisfaits</h4>
            {c.causes.every(x => !x.n) ? <p className="text-[11px] text-slate-600">Aucune cause relevée sur {plural(c.total, 'bilan')}.</p> : (
              <ul className="space-y-0.5 text-[11px] text-slate-700">
                {c.causes.filter(x => x.n).sort((a, b) => b.n - a.n).map(x => (
                  <li key={x.key} className="flex gap-2"><strong className="w-6 shrink-0 text-right font-mono text-slate-900">{x.n}</strong>
                    <span>{x.label}{x.examples.length > 0 && <span className="block text-slate-500">{x.examples.map(e => `« ${e} »`).join(' · ')}</span>}</span></li>
                ))}
              </ul>
            )}
            {p.linked > 0 && (
              <p className="text-[11px] text-slate-700">
                Délai promis au devis : {plural(p.linked, 'bilan rattaché', 'bilans rattachés')} à un devis, <strong>{p.late}</strong> {p.late > 1 ? 'livrés' : 'livré'} après la date promise.
                {p.lateNotNoticed > 0 && <> {plural(p.lateNotNoticed, "retard que le client n'a pas relevé", "retards que le client n'a pas relevés")}.</>}
                {p.notLateYet > 0 && <> {p.notLateYet} fois le client juge le délai non tenu alors que la date promise était respectée.</>}
              </p>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}
