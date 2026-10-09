// A photo taken or chosen on the device, retouched in the photo editor (marks, turn, crop). The value is a reference to the photo (see photo/ref.ts); the original
// is kept as it was, so everything drawn on it can be changed again. px: longest side kept (tool 3.2 lets the company choose).
// Without a photo two buttons are offered: "Prendre une photo" (the camera, on a phone or a tablet) and "Choisir une image" (the gallery or any file).
import { useRef, useState } from 'react';
import { Camera, ImagePlus, PenLine, X } from 'lucide-react';
import { addPhoto, persistent } from '../photo/store';
import { Pic } from '../photo/Pic';
import { PhotoEditor } from './PhotoEditor';

export function PhotoBox({ value, onChange, label, px = 2560, tall = false }: { value: string; onChange(v: string): void; label: string; px?: number; tall?: boolean }) {
  const [edit, setEdit] = useState(false);
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const h = tall ? 'h-48 sm:h-64' : 'h-28', hMin = tall ? 'min-h-48 sm:min-h-64' : 'min-h-28';
  const read = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { onChange(await addPhoto(f, px)); setError(persistent ? '' : "Le navigateur ne garde pas les photos : elle disparaîtra à la fermeture de la page."); } catch { setError('Image illisible.'); }
  };
  const pick = `flex flex-1 items-center justify-center ${tall ? 'gap-2' : 'flex-col gap-0.5'} rounded-md px-1.5 text-center text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-delacour-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]`;
  return (
    <div className="space-y-1">
      {value ? (
        <div className="relative">
          <button type="button" onClick={() => setEdit(true)} aria-label={`Retoucher la photo : ${label}`} title="Retoucher : flèche, croix, cercle, numéro, texte, recadrage" className="block w-full">
            <Pic value={value} alt={label} size={tall ? 'v' : 't'} className={`${h} w-full rounded-lg border border-slate-200 bg-slate-50`} />
          </button>
          <span className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700"><PenLine size={12} />Retoucher</span>
          <button type="button" aria-label={`Retirer la photo : ${label}`} onClick={() => onChange('')} className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-600 hover:text-red-600 max-sm:p-2 [@media(pointer:coarse)]:p-3"><X size={14} /></button>
          {edit && <PhotoEditor src={value} onClose={() => setEdit(false)} onSave={v => { onChange(v); setEdit(false); }} />}
        </div>
      ) : (
        <div role="group" aria-label={label} className={`flex ${hMin} w-full flex-col justify-center gap-1 rounded-lg border border-dashed border-slate-300 p-1`}>
          <button type="button" onClick={() => camera.current?.click()} aria-label={`Prendre une photo : ${label}`} className={pick}><Camera size={tall ? 22 : 16} className="shrink-0" />Prendre une photo</button>
          <button type="button" onClick={() => gallery.current?.click()} aria-label={`Choisir une image : ${label}`} className={pick}><ImagePlus size={tall ? 22 : 16} className="shrink-0" />Choisir une image</button>
        </div>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label={`${label} : appareil photo`} onChange={read} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" aria-label={`${label} : galerie`} onChange={read} />
      {error && <span role="alert" className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}
