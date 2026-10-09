// Complaints per month over twelve months, stacked by motive or by process at the origin. Shown in tool 2.3 and copied in the
// dashboard (1.1) next to the complaints indicator, from the same records. Colours: the first slots of the categorical palette
// (blue, orange, aqua, yellow, magenta) then greys, always the same colour for the same entity; the legend, the tooltip and the
// table carry the numbers (three of the hues are light on white, so nothing relies on colour alone).
import { useState } from 'react';
import type { Period } from '../../domain/types';
import { complaintTrend, type TrendBy } from '../../domain/commercial';
import { periodLabel, periodOfDate, periodShort } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { useWidth } from '../KpiChart';

export const GAP = 2, MAX_BAR = 24, RADIUS = 4;

// Text laid on a coloured segment: white or near-black, whichever reads better on that fill
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const inkOn = (hex: string) => (1.05 / (luminance(hex) + 0.05) >= (luminance(hex) + 0.05) / 0.053 ? '#ffffff' : '#0b0b0b');

// A bar segment with its top corners rounded (the baseline end stays square)
export const segment = (x: number, y: number, w: number, h: number, round: boolean) => {
  const r = round ? Math.min(RADIUS, h, w / 2) : 0;
  return `M${x},${y + h}V${y + r}${r ? `Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}` : `H${x + w}`}V${y + h}Z`;
};
export const niceStep = (max: number) => [1, 2, 5, 10, 20, 50, 100].find(s => max / s <= 5) || 100;

export function ComplaintTrend({ end, compact = false }: { end?: Period; compact?: boolean }) {
  const { state } = useStore();
  const [by, setBy] = useState<TrendBy>('motif');
  const [hover, setHover] = useState<number | null>(null);
  const [ref, width] = useWidth<HTMLDivElement>();
  if (!state || !Object.keys(state.complaints).length) return null;
  const current = periodOfDate(new Date()), last = end && end < current ? end : current;   // never beyond the current month
  const t = complaintTrend(state, last, by);
  const colorOf = Object.fromEntries(t.series.map(x => [x.key, x.color])) as Record<string, string>;   // set by the company's list of motives
  const w = Math.max(width, 280), height = compact ? 190 : 230;
  const padL = 26, padR = 6, padT = 18, padB = 26, innerW = w - padL - padR, innerH = height - padT - padB;
  const maxTotal = Math.max(1, ...t.rows.map(r => r.total)), step = niceStep(maxTotal), yMax = Math.ceil(maxTotal / step) * step;
  const unit = innerH / yMax, band = innerW / t.rows.length, bar = Math.min(MAX_BAR, band * 0.62), base = padT + innerH;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const label = (i: number) => (band >= 44 ? periodShort(t.rows[i].period) : periodShort(t.rows[i].period).split(' ')[0]);   // "Juin" and "Juil" stay apart
  const every = band >= 30 ? 1 : 2;
  const tip = hover === null ? null : t.rows[hover];
  const centre = (i: number) => padL + (i + 0.5) * band;
  const summary = (i: number) => `${periodLabel(t.rows[i].period)} : ${t.rows[i].total} réclamation(s)${t.series.filter(s => t.rows[i].parts[s.key]).map(s => `, ${s.label} ${t.rows[i].parts[s.key]}`).join('')}`;

  return (
    <div ref={ref} className="min-w-0 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Évolution des réclamations et leurs causes · 12 mois</h3>
          <p className="text-[11px] text-slate-500">Données de l'outil 2.3, mois de réception.</p>
        </div>
        <div role="group" aria-label="Regrouper par" className="flex overflow-hidden rounded-full border border-slate-300 text-[11px] font-semibold">
          {([['motif', 'Par motif'], ['origine', 'Par origine']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={by === k} onClick={() => { setBy(k); setHover(null); }}
              className={`px-2.5 py-1 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${by === k ? 'bg-delacour-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      {t.total === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">Aucune réclamation reçue sur ces 12 mois.</p> : (
        <>
          <p className="text-[11px] text-slate-700">
            {t.top && <><strong>{by === 'motif' ? 'Motif le plus fréquent' : 'Origine la plus fréquente'} :</strong> {t.top.label} ({t.top.total} sur {t.total}). </>}
            {t.before3 > 0 && <>Les 3 derniers mois : <strong>{t.last3}</strong> contre {t.before3} sur les 3 mois d'avant ({t.changePct! > 0 ? '+' : ''}{t.changePct} %).</>}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-700" aria-label="Légende">
            {t.series.map(s => (
              <li key={s.key} className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: colorOf[s.key] }} />{s.label}<span className="font-mono font-semibold text-slate-900">{s.total}</span></li>
            ))}
          </ul>
          <div className="relative" onPointerLeave={() => setHover(null)}>
            <svg width={w} height={height} role="group" aria-label="Réclamations par mois" className="block max-w-full">
              {ticks.map(v => (
                <g key={v}>
                  <line x1={padL} x2={w - padR} y1={base - v * unit} y2={base - v * unit} stroke="#e2e8f0" strokeWidth={1} />
                  <text x={padL - 6} y={base - v * unit + 3.5} textAnchor="end" className="fill-slate-500 text-[10px]">{v}</text>
                </g>
              ))}
              {t.rows.map((r, i) => {
                const segs = t.series.filter(s => r.parts[s.key]).map(s => ({ key: s.key, v: r.parts[s.key] }));
                let acc = 0;
                return (
                  <g key={r.period} tabIndex={0} role="img" aria-label={summary(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="outline-none focus-visible:[&>rect:first-child]:fill-slate-200">
                    <rect x={padL + i * band} y={padT} width={band} height={innerH + padB - 4} fill={hover === i ? '#f1f5f9' : 'transparent'} onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onPointerDown={() => setHover(i)} />
                    {segs.map((sg, k) => {
                      const h = sg.v * unit, y = base - (acc + sg.v) * unit; acc += sg.v;
                      const drawn = k === 0 ? h : Math.max(1, h - GAP), top = k === segs.length - 1;
                      return (
                        <g key={sg.key} pointerEvents="none">
                          <path d={segment(centre(i) - bar / 2, y, bar, drawn, top)} fill={colorOf[sg.key]} />
                          {drawn >= 14 && bar >= 18 && <text x={centre(i)} y={y + drawn / 2 + 3.5} textAnchor="middle" className="text-[10px] font-semibold" fill={inkOn(colorOf[sg.key])}>{sg.v}</text>}
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
                <div className="mb-1 font-semibold text-slate-900">{periodLabel(tip.period)}{tip.period === last ? ' (en cours)' : ''} · <span className="font-mono">{tip.total}</span></div>
                {t.series.filter(s => tip.parts[s.key]).map(s => (
                  <div key={s.key} className="flex items-center gap-1.5 text-slate-600"><span aria-hidden className="h-[3px] w-3 shrink-0 rounded" style={{ background: colorOf[s.key] }} /><strong className="font-mono text-slate-900">{tip.parts[s.key]}</strong>{s.label}</div>
                ))}
                {tip.total === 0 && <div className="text-slate-500">Aucune réclamation</div>}
              </div>
            )}
          </div>
          <details className="text-[11px] text-slate-700">
            <summary className="cursor-pointer font-semibold text-delacour-primary">Voir en tableau</summary>
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-0 text-right">
                <caption className="sr-only">Réclamations reçues par mois</caption>
                <thead><tr className="text-slate-500"><th scope="col" className="border-b border-slate-200 py-1 text-left font-semibold">Mois</th>
                  {t.series.map(s => <th key={s.key} scope="col" className="border-b border-slate-200 px-2 py-1 font-semibold">{s.label}</th>)}<th scope="col" className="border-b border-slate-200 px-2 py-1 font-semibold">Total</th></tr></thead>
                <tbody>{t.rows.map(r => (
                  <tr key={r.period}><th scope="row" className="border-b border-slate-100 py-1 text-left font-normal">{periodLabel(r.period)}</th>
                    {t.series.map(s => <td key={s.key} className="border-b border-slate-100 px-2 py-1 font-mono">{r.parts[s.key] || '·'}</td>)}<td className="border-b border-slate-100 px-2 py-1 font-mono font-semibold text-slate-900">{r.total}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
