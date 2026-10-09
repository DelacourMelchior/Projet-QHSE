// Signature drawn by hand or with the mouse; kept as strokes on a pad of 300 x 100 units (redrawn in the PDF, no image needed). The surface is shown at least 160 px high
// and drawn at the resolution of the screen: the strokes keep their units, whatever the size. `wide`: the full width of its column, label and hint at 14 px (the field screens);
// otherwise 11 px (the other tools). `locked`: a signature already laid (no erase, no hint).
import { useEffect, useId, useRef } from 'react';
import type { Strokes } from '../domain/types';

const W = 300, H = 100;
const TOUCH = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
// A stroke kept in about 40 whole points instead of one per movement of the finger (F-6: the three signatures of an order were half of its weight): the doubles go, then the points
// that lie within a unit of the line between their neighbours (Douglas-Peucker, the tolerance grows until 40 are left); the first and the last are always kept, and a stroke keeps
// at least 6 points so that a straight line still reads as a drawing. The shape and the form of `Strokes` do not change: the strokes already laid stay readable as they are.
type Pt = [number, number];
export function thin(p: Pt[], max = 40): Pt[] {
  const q = p.filter((x, i) => !i || x[0] !== p[i - 1][0] || x[1] !== p[i - 1][1]);
  if (q.length < 2) return p.length > 1 ? [p[0], p[p.length - 1]] : p;
  const off = ([x, y]: Pt, [x1, y1]: Pt, [x2, y2]: Pt) => { const dx = x2 - x1, dy = y2 - y1; return dx || dy ? Math.abs(dy * (x - x1) - dx * (y - y1)) / Math.hypot(dx, dy) : Math.hypot(x - x1, y - y1); };
  const keep = (eps: number) => {
    const on = q.map((_, i) => i === 0 || i === q.length - 1);
    const go = (a: number, b: number) => {
      let m = -1, far = eps;
      for (let i = a + 1; i < b; i++) { const d = off(q[i], q[a], q[b]); if (d > far) { far = d; m = i; } }
      if (m >= 0) { on[m] = true; go(a, m); go(m, b); }
    };
    go(0, q.length - 1);
    return q.filter((_, i) => on[i]);
  };
  let out = keep(0.75);
  for (let eps = 1.1; out.length > max; eps *= 1.5) out = keep(eps);
  const floor = Math.min(q.length, 6);
  return out.length >= floor ? out : Array.from({ length: floor }, (_, i) => q[Math.round(i * (q.length - 1) / (floor - 1))]);
}
export function SignaturePad({ value, onChange, label, wide = false, locked = false }: { value: Strokes | undefined; onChange(v: Strokes | undefined): void; label: string; wide?: boolean; locked?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<[number, number][] | null>(null);
  const strokes = useRef<Strokes>(value || []);
  const hint = useId();
  const draw = () => {
    const c = ref.current, g = c?.getContext('2d');
    if (!c || !g) return;
    const k = window.devicePixelRatio || 1, w = Math.round(c.clientWidth * k), h = Math.round(c.clientHeight * k);
    if (!w || !h) return;   // hidden (a tab that is not shown): drawn when it appears
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#0f172a'; g.lineWidth = 2 * k; g.lineCap = 'round'; g.lineJoin = 'round';
    [...strokes.current, ...(cur.current ? [cur.current] : [])].forEach(s => { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x * w / W, y * h / H) : g.moveTo(x * w / W, y * h / H))); g.stroke(); });
  };
  useEffect(() => { strokes.current = value || []; draw(); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const o = new ResizeObserver(draw); o.observe(ref.current!); return () => o.disconnect(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]; };
  const small = wide ? 'text-sm' : 'text-[11px]';
  return (
    <div className="space-y-1">
      <span className={`block ${small} font-semibold text-slate-700`}>{label}</span>
      <canvas ref={ref} width={W} height={H} role="img" aria-label={label} aria-describedby={locked || value?.length ? undefined : hint}
        className={`block aspect-[3/1] min-h-40 w-full touch-none rounded-lg border border-slate-300 bg-white ${wide ? '' : 'max-w-[300px]'}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); cur.current = [pos(e)]; }}
        onPointerMove={e => { if (cur.current) { cur.current.push(pos(e)); draw(); } }}
        onPointerUp={() => { if (cur.current && cur.current.length > 1) { strokes.current = [...strokes.current, thin(cur.current)]; onChange(strokes.current); } cur.current = null; draw(); }} />
      {!locked && (
        <div className={`flex items-center ${TOUCH}`}>
          {value?.length
            ? <button type="button" aria-label="Effacer la signature" className={`inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-1.5 ${wide ? 'text-sm' : 'text-xs'} font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${TOUCH}`} onClick={() => onChange(undefined)}>Effacer</button>
            : <span id={hint} className={`${small} text-slate-500`}>Zone de signature&#8239;: tracé à la main ou à la souris.</span>}
        </div>
      )}
    </div>
  );
}
