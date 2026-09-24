// Line chart of one KPI, drawn at its real pixel size.
// Conforming zone tinted, active month band, points coloured by monthly status (tooltip on hover/tap/focus),
// labels on last / min / max only, dashed 3-month moving average.
import { useLayoutEffect, useRef, useState } from 'react';
import type { Kpi, Period, State } from '../domain/types';
import { kpiStatus, movingAverage, timelinePeriods, valueOf } from '../domain/engine';
import { formatCompact, formatValue } from '../domain/numbers';
import { periodLabel, periodShort } from '../domain/periods';
import { LEVEL_STYLE } from './common';

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Tip { x: number; y: number; period: Period; value: number }

export function KpiChart({ state, kpi, period, color, height = 240, compact = false }: {
  state: State; kpi: Kpi; period: Period; color: string; height?: number; compact?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const periods = timelinePeriods(state);
  const n = periods.length;
  const pts = periods.map((p, m) => ({ p, m, v: valueOf(state, kpi.id, p) })).filter((x): x is { p: Period; m: number; v: number } => x.v !== null);
  const target = kpi.targetValue;
  const w = Math.max(width, 240);

  const padL = compact ? 50 : 62, padR = 16, padT = compact ? 14 : 20, padB = 26;
  const innerW = w - padL - padR, innerH = height - padT - padB;

  // Y range: values + target, 8 % margin, round ticks; rates between 0 and 100
  const vals = pts.map(x => x.v).concat(target !== null ? [target] : []);
  let lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 100;
  if (lo === hi) { lo -= Math.abs(lo) * 0.1 || 1; hi += Math.abs(hi) * 0.1 || 1; }
  const margin = (hi - lo) * 0.08;
  lo -= margin; hi += margin;
  if (kpi.unit === '%') { lo = Math.max(lo, 0); hi = Math.min(hi, 100); }
  if (lo < 0 && vals.every(v => v >= 0)) lo = 0;
  const rawStep = (hi - lo) / (compact ? 3 : 4);
  const p10 = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = p10 * ([1, 2, 2.5, 5, 10].find(f => f >= rawStep / p10) || 10);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (kpi.unit === '%') hi = Math.min(hi, 100);
  const range = hi - lo || 1;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(v);

  const xStep = innerW / Math.max(1, n - 1);
  const X = (m: number) => padL + m * xStep;
  const Y = (v: number) => padT + innerH - ((v - lo) / range) * innerH;
  const activeIdx = periods.indexOf(period);
  const line = pts.map(x => `${X(x.m).toFixed(1)},${Y(x.v).toFixed(1)}`).join(' ');
  const ma = pts.length >= 6 ? periods.map((p, m) => ({ m, v: movingAverage(state, kpi, p) })).filter(x => x.v !== null) : [];
  const labelled = new Set<number>();
  if (pts.length) {
    labelled.add(pts[pts.length - 1].m);
    if (!compact) {
      labelled.add(pts.reduce((a, b) => (b.v < a.v ? b : a)).m);
      labelled.add(pts.reduce((a, b) => (b.v > a.v ? b : a)).m);
    }
  }
  const every = xStep >= 52 ? 1 : xStep >= 28 ? 2 : 3;
  const gid = `g_${kpi.id.replace(/[^a-z0-9_]/gi, '')}_${compact ? 'c' : 'l'}`;
  const targetOk = target !== null && target >= lo && target <= hi;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="block select-none rounded-lg border border-slate-200 bg-white"
          role="img" aria-label={`Évolution de ${kpi.name}`} onMouseLeave={() => setTip(null)}>
          {activeIdx >= 0 && (
            <rect x={Math.max(padL, X(activeIdx) - xStep / 2)} y={padT} height={innerH} fill="#F59E0B" fillOpacity={0.1}
              width={Math.min(padL + innerW, X(activeIdx) + xStep / 2) - Math.max(padL, X(activeIdx) - xStep / 2)} />
          )}
          {targetOk && (kpi.direction === 'lower'
            ? <rect x={padL} y={Y(target!)} width={innerW} height={Math.max(0, padT + innerH - Y(target!))} fill="#10B981" fillOpacity={0.07} />
            : <rect x={padL} y={padT} width={innerW} height={Math.max(0, Y(target!) - padT)} fill="#10B981" fillOpacity={0.07} />)}
          {ticks.map(v => (
            <g key={v}>
              <line x1={padL} x2={padL + innerW} y1={Y(v)} y2={Y(v)} stroke="#E2E8F0" />
              <text x={padL - 8} y={Y(v) + 4} textAnchor="end" fill="#64748B" fontSize={11}>{formatCompact(v, kpi.unit)}</text>
            </g>
          ))}
          {targetOk && <line x1={padL} x2={padL + innerW} y1={Y(target!)} y2={Y(target!)} stroke="#B8893F" strokeWidth={1.5} strokeDasharray="6 4" />}
          {pts.length >= 2 && !compact && (
            <>
              <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.16} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <path d={`M ${X(pts[0].m)},${padT + innerH} L ${line.replace(/ /g, ' L ')} L ${X(pts[pts.length - 1].m)},${padT + innerH} Z`} fill={`url(#${gid})`} />
            </>
          )}
          {ma.length >= 2 && <polyline fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round"
            points={ma.map(x => `${X(x.m).toFixed(1)},${Y(x.v!).toFixed(1)}`).join(' ')} />}
          {pts.length >= 2 && <polyline fill="none" stroke={color} strokeWidth={compact ? 2.2 : 2.8} strokeLinecap="round" strokeLinejoin="round" points={line} />}
          {pts.map(x => {
            const st = kpiStatus(kpi, x.v);
            const show = () => setTip({ x: X(x.m), y: Y(x.v), period: x.p, value: x.v });
            return (
              <g key={x.p} tabIndex={0} role="img" aria-label={`${periodLabel(x.p)} : ${formatValue(x.v, kpi.unit)}, ${st.text}`}
                onMouseEnter={show} onFocus={show} onClick={show} onBlur={() => setTip(null)} style={{ cursor: 'pointer', outline: 'none' }}>
                <circle cx={X(x.m)} cy={Y(x.v)} r={12} fill="transparent" />
                <circle cx={X(x.m)} cy={Y(x.v)} r={compact ? 3.5 : 4.5} fill={LEVEL_STYLE[st.level].hex} stroke="#fff" strokeWidth={1.5} />
              </g>
            );
          })}
          {pts.filter(x => labelled.has(x.m)).map(x => {
            const txt = formatCompact(x.v, kpi.unit);
            const bw = txt.length * 6.6 + 10;
            const ly = Y(x.v) - padT > 24 ? Y(x.v) - 22 : Y(x.v) + 9;
            const lx = Math.min(Math.max(X(x.m) - bw / 2, padL), padL + innerW - bw);
            return (
              <g key={`l${x.p}`} pointerEvents="none">
                <rect x={lx} y={ly} width={bw} height={16} rx={3} fill="#0F172A" fillOpacity={0.82} />
                <text x={lx + bw / 2} y={ly + 12} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>{txt}</text>
              </g>
            );
          })}
          {periods.map((p, m) => (m === activeIdx || (m % every === 0 && Math.abs(m - activeIdx) >= every)) && (
            <text key={p} x={X(m)} y={height - 8} textAnchor={X(m) > w - 30 ? 'end' : 'middle'} dx={X(m) > w - 30 ? 14 : 0} fontSize={11} fill={m === activeIdx ? '#92400E' : '#64748B'} fontWeight={m === activeIdx ? 700 : 500}>{periodShort(p)}</text>
          ))}
        </svg>
      )}
      {tip && (() => {
        const st = kpiStatus(kpi, tip.value);
        return (
          <div role="tooltip" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-2 text-[12px] leading-snug text-white shadow-lg"
            style={{ left: Math.min(Math.max(tip.x, 70), w - 70), top: tip.y - 12 }}>
            <div className="font-bold">{periodLabel(tip.period)}</div>
            <div className="font-mono text-[13px] font-bold">{formatValue(tip.value, kpi.unit)}</div>
            {kpi.target && <div className="text-slate-300">Cible {kpi.target}</div>}
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: LEVEL_STYLE[st.level].hex }} />{st.text}</div>
          </div>
        );
      })()}
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-3 rounded-sm bg-emerald-500/25" />Zone conforme</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-[#B8893F]" />Cible</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed border-slate-400" />Tendance 3 mois</span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-600" />Conforme
        <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" />Dérive
        <span className="ml-1 h-2 w-2 rounded-full bg-red-600" />Alerte
      </span>
      <span>Survolez ou touchez un point : mois, valeur, cible et statut</span>
    </div>
  );
}
