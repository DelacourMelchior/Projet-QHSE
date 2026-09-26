// A photo taken or chosen on the device, with a simple annotation (green arrow, red cross, circle) drawn on it.
import { useRef, useState } from 'react';
import { Camera, PenLine, X } from 'lucide-react';
import { readPhoto, annotate, type Mark } from './photo';

export function PhotoBox({ value, onChange, label }: { value: string; onChange(v: string): void; label: string }) {
  const [mark, setMark] = useState<Mark | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <div className="space-y-1">
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className={`h-28 w-full rounded-lg border border-slate-200 object-cover ${mark ? 'cursor-crosshair ring-2 ring-delacour-gold' : ''}`}
            onClick={async e => { if (!mark) return; const r = e.currentTarget.getBoundingClientRect(); onChange(await annotate(value, mark, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)); setMark(null); }} />
          <div className="absolute bottom-1 left-1 flex gap-1">
            {([['arrow', 'Flèche verte : le bon geste'], ['cross', 'Croix rouge : le piège'], ['circle', 'Cercle : le point à regarder']] as const).map(([m, l]) => (
              <button key={m} type="button" title={`${l}. Cliquez ensuite sur la photo.`} aria-label={l} aria-pressed={mark === m} onClick={() => setMark(mark === m ? null : m)}
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${mark === m ? 'bg-delacour-gold text-delacour-dark' : 'bg-white/90 text-slate-700'}`}>{m === 'arrow' ? '→' : m === 'cross' ? '×' : '○'}</button>
            ))}
            <PenLine size={14} className="self-center text-white drop-shadow" />
          </div>
          <button type="button" aria-label={`Retirer la photo : ${label}`} onClick={() => onChange('')} className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-600 hover:text-red-600"><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-delacour-gold hover:text-delacour-primary">
          <Camera size={18} />Photo
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" aria-label={label}
        onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { onChange(await readPhoto(f)); setError(''); } catch { setError('Image illisible.'); } }} />
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

