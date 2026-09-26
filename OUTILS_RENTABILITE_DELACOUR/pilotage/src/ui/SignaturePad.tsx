// Signature drawn with the finger or the mouse; kept as strokes (redrawn in the PDF, no image needed).
import { useEffect, useRef } from 'react';
import type { Strokes } from '../domain/types';

const W = 300, H = 100;
export function SignaturePad({ value, onChange, label }: { value: Strokes | undefined; onChange(v: Strokes | undefined): void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<[number, number][] | null>(null);
  const strokes = useRef<Strokes>(value || []);
  const draw = () => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = '#0f172a'; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
    [...strokes.current, ...(cur.current ? [cur.current] : [])].forEach(s => { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
  };
  useEffect(() => { strokes.current = value || []; draw(); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => { const r = e.currentTarget.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * W), Math.round((e.clientY - r.top) / r.height * H)]; };
  return (
    <div className="space-y-1">
      <span className="block text-[11px] font-semibold text-slate-700">{label}</span>
      <canvas ref={ref} width={W} height={H} aria-label={label} className="w-full max-w-[300px] touch-none rounded-lg border border-slate-300 bg-white"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); cur.current = [pos(e)]; }}
        onPointerMove={e => { if (cur.current) { cur.current.push(pos(e)); draw(); } }}
        onPointerUp={() => { if (cur.current && cur.current.length > 1) { strokes.current = [...strokes.current, cur.current]; onChange(strokes.current); } cur.current = null; draw(); }} />
      {value?.length ? <button type="button" className="text-[11px] font-semibold text-slate-500 hover:underline" onClick={() => onChange(undefined)}>Effacer la signature</button> : <span className="text-[11px] text-slate-500">Signer avec le doigt ou la souris.</span>}
    </div>
  );
}
