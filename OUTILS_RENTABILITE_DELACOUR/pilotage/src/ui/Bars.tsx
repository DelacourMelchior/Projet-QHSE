// Monthly bars (12 months) with an optional target line, and horizontal share bars. Same rules as the KPI charts:
// 11 px axes, system fonts, target in dotted gold, current month highlighted, value on focus or hover.
import { useState } from 'react';
import type { Period } from '../domain/types';
import { formatCompact, formatValue } from '../domain/numbers';
import { periodLabel, periodShort } from '../domain/periods';
import { useWidth } from './KpiChart';

export function MonthBars({ data, unit, current, target, above = 'bad', onPick }: {
  data: { period: Period; value: number }[]; unit: string; current: Period; target?: number | null; above?: 'bad' | 'good'; onPick?(p: Period): void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<number | null>(null);
  const h = 170, top = 14, bottom = 22, left = 44;
  const w = Math.max(280, width);
  const max = Math.max(1, target ?? 0, ...data.map(d => d.value)) * 1.1;
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const bw = (w - left - 4) / data.length;
  const ticks = [0, max / 2, max].map(v => Math.round(v));
  const colorOf = (v: number) => target === null || target === undefined ? '#1B4D3E' : (v > target) === (above === 'bad') ? '#DC2626' : '#059669';
  return (
    <div ref={ref} className="relative">
      <svg width={w} height={h} role="img" aria-label={`Évolution sur 12 mois, en ${unit}`} className="block">
        {ticks.map(t => (
          <g key={t}>
            <line x1={left} x2={w} y1={y(t)} y2={y(t)} stroke="#E2E8F0" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">{formatCompact(t, unit)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = left + i * bw + bw * 0.18;
          const cur = d.period === current;
          return (
            <g key={d.period} tabIndex={0} role="button" aria-label={`${periodLabel(d.period)} : ${formatValue(d.value, unit)}`}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(i)} onBlur={() => setTip(null)} onClick={() => onPick?.(d.period)}
              className={onPick ? 'cursor-pointer outline-none' : 'outline-none'}>
              {cur && <rect x={left + i * bw} y={top - 6} width={bw} height={h - top - bottom + 6} fill="#FDF6E9" />}
              <rect x={x} y={y(d.value)} width={bw * 0.64} height={Math.max(0, y(0) - y(d.value))} rx={2} fill={colorOf(d.value)} opacity={d.value ? 1 : 0.2} />
              <text x={left + i * bw + bw / 2} y={h - 6} textAnchor="middle" fontSize="11" fill={cur ? '#11352A' : '#64748B'} fontWeight={cur ? 700 : 400}>{periodShort(d.period).split(' ')[0]}</text>
            </g>
          );
        })}
        {target !== null && target !== undefined && <line x1={left} x2={w} y1={y(target)} y2={y(target)} stroke="#C5A065" strokeWidth={1.5} strokeDasharray="4 3" />}
      </svg>
      {tip !== null && (
        <div className="pointer-events-none absolute rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white" style={{ left: Math.min(w - 120, left + tip * bw), top: 0 }}>
          {periodLabel(data[tip].period)} : {formatValue(data[tip].value, unit)}
        </div>
      )}
    </div>
  );
}

// Share of a total, one line per item, largest first
export function ShareBars({ items, unit, onPick, picked }: { items: { key: string; label: string; value: number }[]; unit: string; onPick?(k: string): void; picked?: string }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <ul className="space-y-1.5">
      {items.map(i => (
        <li key={i.key}>
          <button type="button" disabled={!onPick} onClick={() => onPick?.(i.key)} aria-pressed={picked === i.key}
            className={`grid w-full grid-cols-[minmax(0,1fr)_90px] items-center gap-2 rounded-md px-1 py-0.5 text-left text-[11px] ${onPick ? 'hover:bg-slate-50' : ''} ${picked === i.key ? 'bg-amber-50 ring-1 ring-delacour-gold' : ''}`}>
            <span className="min-w-0">
              <span className="block truncate text-slate-700">{i.label}</span>
              <span className="mt-0.5 block h-2 rounded-full bg-slate-100"><span className="block h-2 rounded-full bg-delacour-primary" style={{ width: `${i.value / max * 100}%` }} /></span>
            </span>
            <span className="text-right font-mono font-semibold text-slate-900">{formatValue(i.value, unit)}<span className="block font-normal text-slate-500">{total ? Math.round(i.value / total * 100) : 0} %</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}
