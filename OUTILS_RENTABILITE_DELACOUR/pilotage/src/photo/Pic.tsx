// Shows a photo of a record: its original (from the photo store) with its turn, crop, adjustments and marks, drawn as SVG, so that it stays sharp at any
// size. A value that is not a reference (a small drawing kept as an inline picture) is shown as it is.
import { useEffect, useId, useMemo, useState } from 'react';
import { cachedUrl, photoUrl, type Variant } from './store';
import { parseRef } from './ref';
import { legendOf, photoDoc } from './doc';

// '' when the picture is neither here nor at its source, null while it loads
export function usePhotoUrl(id: string | undefined, v: Variant): string | null {
  const [url, setUrl] = useState<string | null>(() => (id ? cachedUrl(id, v) ?? null : ''));
  useEffect(() => {
    if (!id) { setUrl(''); return; }
    const hit = cachedUrl(id, v);
    if (hit) { setUrl(hit); return; }
    let live = true;
    setUrl(null);
    photoUrl(id, v).then(u => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [id, v]);
  return url;
}

export function Pic({ value, alt = '', className = '', fit = 'cover', size = 'v' }: { value: string; alt?: string; className?: string; fit?: 'cover' | 'contain'; size?: Variant }) {
  const ref = useMemo(() => (value ? parseRef(value) : null), [value]);
  const url = usePhotoUrl(ref?.id, size);
  const uid = useId().replace(/:/g, '');
  const doc = useMemo(() => (ref && url ? photoDoc(ref, url, uid) : null), [ref, url, uid]);
  if (!value) return null;
  if (!ref) return <img src={value} alt={alt} className={className} />;
  if (!doc) return <div role="img" aria-label={alt || 'Photo'} title={url === '' ? 'Photo pas encore reçue sur cet ordinateur' : 'Chargement'} className={`${className} flex items-center justify-center bg-slate-100 text-[11px] text-slate-400`}>{url === '' ? 'Photo non reçue' : ''}</div>;
  const { win } = doc;
  return (
    <svg role="img" aria-label={alt} viewBox={`${win.x} ${win.y} ${win.w} ${win.h}`} preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} className={className}>
      <g dangerouslySetInnerHTML={{ __html: doc.defs + doc.base + doc.marks }} />
    </svg>
  );
}

// The key of the numbered marks of a photo, to show under it
export function PicLegend({ value, className = '' }: { value: string; className?: string }) {
  const ref = useMemo(() => (value ? parseRef(value) : null), [value]);
  const items = ref ? legendOf(ref) : [];
  if (!items.length) return null;
  return <ol className={`space-y-0.5 ${className}`}>{items.map(i => <li key={i.n} className="flex gap-1.5"><span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-delacour-dark text-[10px] font-bold text-white">{i.n}</span><span>{i.label}</span></li>)}</ol>;
}
