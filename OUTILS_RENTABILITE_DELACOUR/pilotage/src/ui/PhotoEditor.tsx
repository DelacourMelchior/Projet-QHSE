// Editor of a photo: marks (arrow, cross, circle, numbers, words, loupe, blur), quarter turns, crop, straightening, brightness and contrast.
// Nothing touches the original: all of it is kept as data in the reference of the photo (photo/ref.ts), so it can be changed again at any time.
// The marks are vectors (SVG): sharp at any size. The view can be zoomed and moved (wheel, pinch, hand) for a precise placing.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, Bold, Circle, Copy, Crop as CropIcon, EyeOff, Hand, Hash, Italic, Maximize, MousePointer2, Redo2, RotateCcw, RotateCw, Search, SlidersHorizontal, Trash2, Type, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { COLORS, DEFAULT_STYLE, FONTS, cleanMarks, cropSvg, dragHandle, handlesOf, hitMark, markSvg, moveMark, selectionSvg, styleOf, tapArrow, turnCrop, turnMark, type FontKey, type HandleKind, type Kind, type Mark, type Style, type TextBg } from './photo';
import { photoDoc } from '../photo/doc';
import { makeRef, parseRef, type Crop, type PhotoRef } from '../photo/ref';
import { toRef } from '../photo/store';
import { usePhotoUrl } from '../photo/Pic';
import { Button, inputCls, Modal } from './common';

type Tool = 'select' | 'pan' | Kind | 'crop';
const TOOLS: { k: Tool; label: string; hint: string; icon: React.ReactNode }[] = [
  { k: 'select', label: 'Modifier', hint: "Toucher une marque pour la déplacer, la tourner, l'agrandir ou changer son aspect", icon: <MousePointer2 size={15} /> },
  { k: 'pan', label: 'Main', hint: 'Glisser pour déplacer la photo agrandie (aussi : deux doigts)', icon: <Hand size={15} /> },
  { k: 'arrow', label: 'Flèche', hint: 'Glisser du début à la pointe : le bon geste', icon: <ArrowUpRight size={15} /> },
  { k: 'cross', label: 'Croix', hint: 'Toucher la photo : le piège', icon: <X size={15} /> },
  { k: 'circle', label: 'Cercle', hint: 'Toucher la photo : le point à regarder', icon: <Circle size={15} /> },
  { k: 'number', label: 'Numéro', hint: "Toucher la photo : l'ordre des gestes", icon: <Hash size={15} /> },
  { k: 'text', label: 'Texte', hint: 'Toucher la photo, puis écrire dans le champ Texte', icon: <Type size={15} /> },
  { k: 'loupe', label: 'Loupe', hint: 'Glisser du détail vers l\'endroit où montrer son agrandissement', icon: <Search size={15} /> },
  { k: 'blur', label: 'Flou', hint: 'Glisser pour entourer ce qu\'il faut masquer (visage, écran, plan)', icon: <EyeOff size={15} /> },
  { k: 'crop', label: 'Recadrer', hint: 'Glisser pour entourer la partie à garder', icon: <CropIcon size={15} /> },
];
const BGS: [TextBg, string][] = [['dark', 'Fond sombre'], ['light', 'Fond clair'], ['none', 'Sans fond']];
const fr = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const touch = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
const KIND_NAME: Record<Kind, string> = { arrow: 'flèches', cross: 'croix', circle: 'cercles', number: 'numéros', text: 'textes', loupe: 'loupes', blur: 'flous' };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// What the editor changes and undoes: the turn, the crop, the adjustments and the marks
interface Doc { r: 0 | 1 | 2 | 3; c?: Crop; t: number; b: number; k: number; m: Mark[] }
type Drag =
  | { mode: 'draw'; x: number; y: number; x2: number; y2: number }
  | { mode: 'move' | 'handle'; i: number; sx: number; sy: number; orig: Mark; hk?: HandleKind; moved?: boolean }
  | { mode: 'pan'; px: number; py: number; fx: number; fy: number };

// One slider of a panel: label, slider, value in a fixed-width cell (the layout never moves with the value), and a way back to the default
function Row({ label, value, shown, def, min, max, step, onChange, onEnd, onReset }: { label: string; value: number; shown: string; def: number; min: number; max: number; step: number; onChange(v: number): void; onEnd(): void; onReset(): void }) {
  return (
    <>
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} className="h-8 w-full min-w-0 accent-delacour-primary [@media(pointer:coarse)]:h-10"
        onChange={e => onChange(Number(e.target.value))} onPointerUp={onEnd} onBlur={onEnd} onKeyUp={onEnd} />
      <span className="text-right text-[11px] tabular-nums text-slate-600">{shown}</span>
      <button type="button" aria-label={`${label} : valeur de départ`} title="Valeur de départ" disabled={value === def} onClick={onReset}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10"><RotateCcw size={13} /></button>
    </>
  );
}
const GRID = 'grid max-w-lg grid-cols-[5.5rem_minmax(0,1fr)_2.75rem_2rem] items-center gap-x-2 gap-y-1 [@media(pointer:coarse)]:grid-cols-[5.5rem_minmax(0,1fr)_2.75rem_2.5rem]';

// A quarter turn clockwise (dir 1) or counter-clockwise (-1): the marks and the crop follow the picture
const turnDoc = (d: Doc, dir: 1 | -1): Doc => ({ ...d, r: ((d.r + (dir === 1 ? 1 : 3)) % 4) as Doc['r'], c: d.c && turnCrop(d.c, dir), m: d.m.map(m => turnMark(m, dir)) });

export function PhotoEditor({ src, onSave, onClose }: { src: string; onSave(v: string): void; onClose(): void }) {
  const [ref, setRef] = useState<PhotoRef | null>(null);   // the photo: its fingerprint and size; the edit is in `doc`
  const initial = useRef('');   // the edit as it was opened, to know whether something changed
  const [doc, setDoc] = useState<Doc>({ r: 0, t: 0, b: 0, k: 0, m: [] });
  const docRef = useRef(doc);
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [tool, setTool] = useState<Tool>('arrow');
  const [panel, setPanel] = useState<'marks' | 'image'>('marks');
  const [styles, setStyles] = useState<Record<Kind, Style>>(DEFAULT_STYLE);   // the look of the next mark of each kind
  const [sel, setSel] = useState(-1);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  const [error, setError] = useState('');
  const [view, setView] = useState({ z: 1, fx: 0.5, fy: 0.5 });   // zoom and centre (share of the visible window) of what is shown
  const [cssW, setCssW] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [focusText, setFocusText] = useState(0);
  const touched = useRef(false);   // a slider records one undo step per gesture, not one per notch
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number; cx: number; cy: number; fx: number; fy: number } | null>(null);
  const uid = useId().replace(/:/g, '');

  // open: the photo becomes a reference (an old picture is moved to the store), its edit is read
  useEffect(() => {
    let live = true;
    toRef(src).then(v => {
      const p = parseRef(v);
      if (!live) return;
      if (!p) { setError('Image illisible.'); return; }
      const d: Doc = { r: p.edit.r || 0, c: p.edit.c, t: p.edit.t || 0, b: p.edit.b || 0, k: p.edit.k || 0, m: cleanMarks(p.edit.m) };
      docRef.current = d; setDoc(d); setRef(p); initial.current = JSON.stringify(d);
    }).catch(() => live && setError('Image illisible.'));
    return () => { live = false; };
  }, [src]);

  // every change goes through here: one place for the undo steps
  const commit = (next: Doc, record = true) => {
    const before = docRef.current;   // read now: the updater below can run after the ref changed
    if (record) { setPast(p => [...p.slice(-59), before]); setFuture([]); }
    docRef.current = next; setDoc(next);
  };
  const setMarks = (fn: (m: Mark[]) => Mark[], record = true) => commit({ ...docRef.current, m: fn(docRef.current.m) }, record);
  const add = (m: Mark) => { setMarks(l => [...l, { ...m, ...styles[m.k] }]); setSel(docRef.current.m.length - 1); };
  const undo = () => { const p = past.at(-1); if (p) { setFuture(f => [docRef.current, ...f]); docRef.current = p; setDoc(p); setPast(past.slice(0, -1)); setSel(-1); } };
  const redo = () => { const n = future[0]; if (n) { setPast(p => [...p, docRef.current]); docRef.current = n; setDoc(n); setFuture(future.slice(1)); setSel(-1); } };
  const removeAt = (i: number) => { if (i >= 0) { setMarks(l => l.filter((_, j) => j !== i)); setSel(s => (s === i ? -1 : s > i ? s - 1 : s)); } };

  // ---- the picture as shown: turned, straightened, adjusted, with its marks
  const big = view.z > 1.6;
  const loaded = usePhotoUrl(ref?.id, big ? 'o' : 'v');
  const lastUrl = useRef('');
  if (loaded) lastUrl.current = loaded;
  const url = loaded || lastUrl.current;
  const { m: marks } = doc;
  const crop = tool === 'crop' && drag?.mode === 'draw' ? { x: Math.min(drag.x, drag.x2), y: Math.min(drag.y, drag.y2), w: Math.abs(drag.x2 - drag.x), h: Math.abs(drag.y2 - drag.y) } : null;
  const draft: Mark[] = useMemo(() => {
    if (drag?.mode !== 'draw' || (tool !== 'arrow' && tool !== 'loupe' && tool !== 'blur')) return [];
    return [{ k: tool, x: drag.x, y: drag.y, x2: drag.x2, y2: drag.y2, ...styles[tool] }];
  }, [drag, tool, styles]);
  const pd = useMemo(() => (ref && url ? photoDoc({ ...ref, edit: { r: doc.r, t: doc.t, b: doc.b, k: doc.k } }, url, uid, true, [...marks.filter(m => m.k !== 'text' || m.t.trim()), ...draft]) : null), [ref, url, uid, doc.r, doc.t, doc.b, doc.k, marks, draft]);
  const W = pd?.w || 1000, H = pd?.h || 750;
  const full: Crop = { x: 0, y: 0, w: W, h: H };
  const baseWin: Crop = tool === 'crop' || !doc.c ? full : { x: doc.c.x * W, y: doc.c.y * H, w: doc.c.w * W, h: doc.c.h * H };
  const vw = baseWin.w / view.z, vh = baseWin.h / view.z;
  const win: Crop = {
    x: Math.min(baseWin.x + baseWin.w - vw, Math.max(baseWin.x, baseWin.x + view.fx * baseWin.w - vw / 2)),
    y: Math.min(baseWin.y + baseWin.h - vh, Math.max(baseWin.y, baseWin.y + view.fy * baseWin.h - vh / 2)),
    w: vw, h: vh,
  };
  const ui = cssW ? win.w / cssW : 1;   // picture units per screen pixel
  const html = useMemo(() => {
    if (!pd) return '';
    const ghosts = marks.filter(m => m.k === 'text' && !m.t.trim()).map(m => `<g opacity=".5">${markSvg({ ...m, t: 'Texte' } as Mark, W, H)}</g>`).join('');
    return pd.defs + pd.base + pd.marks + ghosts;
  }, [pd, marks, W, H]);
  const overlay = tool === 'crop' ? cropSvg(crop || doc.c || { x: 0, y: 0, w: 1, h: 1 }, W, H, ui) : sel >= 0 && marks[sel] ? selectionSvg(marks[sel], W, H, ui) : '';
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setCssW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pd !== null]);
  useEffect(() => { if (focusText) { textRef.current?.focus(); textRef.current?.select(); } }, [focusText]);

  // ---- zoom and move
  const setZoom = (z: number, relx = 0.5, rely = 0.5) => {
    const nz = Math.min(8, Math.max(1, z)), nvw = baseWin.w / nz, nvh = baseWin.h / nz;
    // the point under the pointer stays under it
    const px = win.x + relx * win.w, py = win.y + rely * win.h;
    setView({ z: nz, fx: (px - (relx - 0.5) * nvw - baseWin.x) / baseWin.w, fy: (py - (rely - 0.5) * nvh - baseWin.y) / baseWin.h });
  };
  useEffect(() => {   // ctrl/cmd + wheel (and the pinch of a trackpad) zooms; not passive, to keep the page still
    const el = svgRef.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setZoom(view.z * Math.exp(-e.deltaY * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  });
  const resetView = () => setView({ z: 1, fx: 0.5, fy: 0.5 });
  useEffect(resetView, [tool === 'crop', doc.r]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- pointer
  const at = (e: { clientX: number; clientY: number }, el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: clamp01((win.x + ((e.clientX - r.left) / r.width) * win.w) / W), y: clamp01((win.y + ((e.clientY - r.top) / r.height) * win.h) / H) };
  };
  const near = (p: { x: number; y: number }, u: number, v: number, px: number) => Math.hypot(u - p.x * W, v - p.y * H) < px * ui;   // within px screen pixels
  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    const c = e.currentTarget;
    try { c.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {   // two fingers: zoom and move, whatever the tool
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, fx: view.fx, fy: view.fy };
      setDrag(null);
      return;
    }
    if (tool === 'pan' || e.button === 1) { setDrag({ mode: 'pan', px: e.clientX, py: e.clientY, fx: view.fx, fy: view.fy }); c.style.cursor = 'grabbing'; return; }
    const p = at(e, c);
    const cur = docRef.current.m[sel], hd = cur && handlesOf(cur, W, H).find(h => near(p, h.x, h.y, 24));   // a handle of the picked mark comes first
    if (cur && hd && tool !== 'crop') { c.style.cursor = 'grabbing'; setDrag({ mode: 'handle', i: sel, sx: p.x, sy: p.y, orig: cur, hk: hd.k }); return; }
    if (tool !== 'select') { setDrag({ mode: 'draw', ...p, x2: p.x, y2: p.y }); return; }
    const i = hitMark(docRef.current.m, p.x, p.y, W, H, 12 * ui);
    setSel(i);
    if (i < 0) return;
    setDrag({ mode: 'move', i, sx: p.x, sy: p.y, orig: docRef.current.m[i] });
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const c = e.currentTarget;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pc = pinch.current;
    if (pc && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()], r = c.getBoundingClientRect();
      const z = Math.min(8, Math.max(1, pc.z * (Math.hypot(a.x - b.x, a.y - b.y) / pc.d)));
      setView({ z, fx: pc.fx - ((a.x + b.x) / 2 - pc.cx) / r.width * (win.w / baseWin.w), fy: pc.fy - ((a.y + b.y) / 2 - pc.cy) / r.height * (win.h / baseWin.h) });
      return;
    }
    const d = dragRef.current, p = at(e, c);
    if (!d) {   // nothing held: the pointer shows what it would grab
      const cur = tool !== 'crop' && tool !== 'pan' ? docRef.current.m[sel] : undefined, hd = cur && handlesOf(cur, W, H).find(h => near(p, h.x, h.y, 24));
      c.style.cursor = hd ? 'grab' : tool === 'pan' ? 'grab' : '';
      return;
    }
    if (d.mode === 'pan') { const r = c.getBoundingClientRect(); setView(v => ({ ...v, fx: d.fx - ((e.clientX - d.px) / r.width) * (win.w / baseWin.w), fy: d.fy - ((e.clientY - d.py) / r.height) * (win.h / baseWin.h) })); return; }
    if (d.mode === 'draw') { setDrag({ ...d, x2: p.x, y2: p.y }); return; }
    if (!d.moved) { d.moved = true; const before = docRef.current; setPast(q => [...q.slice(-59), before]); setFuture([]); }   // a plain touch to pick a mark is not an undo step
    const m = d.mode === 'handle' ? dragHandle(d.orig, d.hk!, p.x, p.y, W, H) : moveMark(d.orig, p.x - d.sx, p.y - d.sy);
    setMarks(l => l.map((x, j) => (j === d.i ? m : x)), false);
  };
  const up = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = dragRef.current;
    e.currentTarget.style.cursor = '';
    if (!d) return;
    setDrag(null);
    if (d.mode !== 'draw') return;
    const dx = d.x2 - d.x, dy = d.y2 - d.y, tap = Math.hypot(dx * W, dy * H) < 0.015 * Math.max(W, H);
    if (tool === 'arrow') add({ k: 'arrow', ...(tap ? tapArrow(d.x, d.y, W, H, styles.arrow.size) : { x: d.x, y: d.y, x2: d.x2, y2: d.y2 }) });
    else if (tool === 'loupe') add({ k: 'loupe', x: d.x, y: d.y, x2: tap ? clamp01(d.x + 0.2) : d.x2, y2: tap ? clamp01(d.y - 0.18) : d.y2 });
    else if (tool === 'blur') add({ k: 'blur', ...(Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02 ? { x: clamp01(d.x - 0.08), y: clamp01(d.y - 0.06), x2: clamp01(d.x + 0.08), y2: clamp01(d.y + 0.06) } : { x: d.x, y: d.y, x2: d.x2, y2: d.y2 }) });
    else if (tool === 'cross' || tool === 'circle') add({ k: tool, x: d.x, y: d.y });
    else if (tool === 'number') add({ k: 'number', x: d.x, y: d.y, n: docRef.current.m.filter(x => x.k === 'number').length + 1 });
    else if (tool === 'text') { add({ k: 'text', x: d.x, y: d.y, t: '' }); setTool('select'); setFocusText(n => n + 1); }   // the word is typed in the field of the panel, and shows live
    else if (tool === 'crop' && Math.abs(dx) > 0.05 && Math.abs(dy) > 0.05) commit({ ...docRef.current, c: { x: Math.min(d.x, d.x2), y: Math.min(d.y, d.y2), w: Math.abs(dx), h: Math.abs(dy) } });
  };

  // ---- keyboard: undo, redo, delete, nudge
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement, typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) && !(t as HTMLInputElement).type?.match(/range|color/);
      if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (typing || sel < 0) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeAt(sel); }
      const step = e.shiftKey ? 0.02 : 0.004, dir: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (dir[e.key]) { e.preventDefault(); const [dx, dy] = dir[e.key]; setMarks(l => l.map((m, j) => (j === sel ? moveMark(m, dx, dy) : m)), !touched.current); touched.current = true; }
    };
    const u = (e: KeyboardEvent) => { if (e.key.startsWith('Arrow')) touched.current = false; };
    window.addEventListener('keydown', k); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('keyup', u); };
  });

  // ---- turn, crop, close, save
  const turn = (dir: 1 | -1) => { commit(turnDoc(docRef.current, dir)); setSel(-1); };
  const pick = (t: Tool) => { setTool(t); if (t !== 'select') setSel(-1); };
  const dirty = ref && JSON.stringify(doc) !== initial.current;
  const close = () => { if (dirty && !window.confirm('Abandonner les modifications de cette photo ?')) return; onClose(); };
  const save = () => {
    if (!ref) return;
    const live = docRef.current.m.filter(m => m.k !== 'text' || m.t.trim()), d = docRef.current;
    onSave(makeRef(ref.id, ref.w, ref.h, { r: d.r, c: d.c, t: d.t, b: d.b, k: d.k, m: live }));
  };

  // ---- the look being edited: the picked mark, or the next mark of the tool
  const picked = sel >= 0 ? marks[sel] : undefined;
  const kind: Kind | null = picked ? picked.k : tool !== 'select' && tool !== 'crop' && tool !== 'pan' ? tool : null;
  const st = kind ? (picked ? styleOf(picked) : styles[kind]) : null;
  const patch = (p: Partial<Style>, record = true) => {
    if (!kind || !st) return;
    // a word on a light background written in white (or the reverse) would not be read: the colour follows
    if (kind === 'text' && p.bg && p.color === undefined) {
      if (p.bg === 'light' && st.color === '#ffffff') p = { ...p, color: '#0f172a' };
      if (p.bg === 'dark' && st.color === '#0f172a') p = { ...p, color: '#ffffff' };
    }
    const q = p;
    setStyles(s => ({ ...s, [kind]: { ...s[kind], ...q } }));
    if (sel >= 0) setMarks(l => l.map((m, j) => (j === sel ? ({ ...m, ...q } as Mark) : m)), record);
  };
  const ranged = (p: Partial<Style>) => { const first = !touched.current; touched.current = true; patch(p, first); };
  const endRange = () => { touched.current = false; };
  const setText = (t: string) => { if (picked?.k === 'text') setMarks(l => l.map((m, j) => (j === sel ? ({ ...m, t } as Mark) : m)), false); };
  const setLabel = (label: string) => { if (picked?.k === 'number') setMarks(l => l.map((m, j) => (j === sel ? ({ ...m, label } as Mark) : m)), false); };
  const def = kind ? DEFAULT_STYLE[kind] : DEFAULT_STYLE.arrow;
  const slider = (key: 'size' | 'thick' | 'angle' | 'curve', label: string, min: number, max: number, step: number, show: (v: number) => string) => st && (
    <Row key={key} label={label} value={st[key]} shown={show(st[key])} def={def[key]} min={min} max={max} step={step} onChange={v => ranged({ [key]: v })} onEnd={endRange} onReset={() => patch({ [key]: def[key] })} />
  );
  const sameKind = picked ? marks.filter(m => m.k === picked.k).length : 0;
  const applyToAll = () => {   // the look of the picked mark, to every mark of its kind, in one undo step
    if (!picked) return;
    const look = Object.fromEntries(Object.entries(styleOf(picked)).filter(([k]) => picked.k === 'text' || k !== 'font') ) as Partial<Style>;
    setMarks(l => l.map(m => (m.k === picked.k ? ({ ...m, ...look } as Mark) : m)));
  };
  const duplicate = () => { const m = docRef.current.m[sel]; if (m) { setMarks(l => [...l, moveMark(m, 0.04, 0.04)]); setSel(docRef.current.m.length - 1); } };
  const adjust = (key: 'b' | 'k' | 't', v: number) => { const first = !touched.current; touched.current = true; commit({ ...docRef.current, [key]: v }, first); };
  const zoomPct = Math.round(view.z * 100);
  const aspect = win.w / win.h;
  const ready = !!pd;

  return (
    <Modal wide onClose={close} title="Retoucher la photo" subtitle={TOOLS.find(t => t.k === tool)?.hint}
      footer={<><Button onClick={close}>Annuler</Button><Button kind="primary" onClick={save} disabled={!ready}>Enregistrer la photo</Button></>}>
      <div className="space-y-3">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible">
          {TOOLS.map(t => (
            <button key={t.k} type="button" aria-pressed={tool === t.k} title={t.hint} onClick={() => pick(t.k)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${touch} ${tool === t.k ? 'border-delacour-gold bg-delacour-gold text-delacour-dark' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{t.icon}{t.label}</button>
          ))}
        </div>
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible [&>*]:shrink-0">
          <Button className="!px-2" aria-label="Tourner à gauche" title="Tourner à gauche (les marques suivent)" onClick={() => turn(-1)}><RotateCcw size={14} /></Button>
          <Button className="!px-2" aria-label="Tourner à droite" title="Tourner à droite (les marques suivent)" onClick={() => turn(1)}><RotateCw size={14} /></Button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <Button className="!px-2" aria-label="Annuler le dernier changement" title="Annuler (Ctrl+Z)" disabled={!past.length} onClick={undo}><Undo2 size={14} /></Button>
          <Button className="!px-2" aria-label="Rétablir" title="Rétablir (Ctrl+Maj+Z)" disabled={!future.length} onClick={redo}><Redo2 size={14} /></Button>
          <Button className="!px-2" aria-label="Effacer toutes les marques" title="Effacer toutes les marques" disabled={!marks.length} onClick={() => { setMarks(() => []); setSel(-1); }}><Trash2 size={14} /></Button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <Button className="!px-2" aria-label="Réduire" title="Réduire" disabled={view.z <= 1} onClick={() => setZoom(view.z / 1.5)}><ZoomOut size={14} /></Button>
          <span className="w-10 text-center text-[11px] tabular-nums text-slate-600">{zoomPct} %</span>
          <Button className="!px-2" aria-label="Agrandir" title="Agrandir (Ctrl + molette, ou deux doigts)" disabled={view.z >= 8} onClick={() => setZoom(view.z * 1.5)}><ZoomIn size={14} /></Button>
          <Button className="!px-2" aria-label="Tout voir" title="Tout voir" disabled={view.z === 1} onClick={resetView}><Maximize size={14} /></Button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button type="button" aria-pressed={panel === 'image'} onClick={() => setPanel(panel === 'image' ? 'marks' : 'image')} title="Luminosité, contraste, redressement"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${touch} ${panel === 'image' ? 'border-delacour-gold bg-delacour-gold text-delacour-dark' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}><SlidersHorizontal size={14} />Image</button>
          {tool === 'crop' && doc.c && <Button onClick={() => commit({ ...docRef.current, c: undefined })}>Retirer le recadrage</Button>}
        </div>

        {error && <p role="alert" className="text-[11px] font-semibold text-red-700">{error}</p>}
        <div className="sticky top-0 z-10 mx-auto bg-white pb-1" style={{ width: `min(100%, ${48 * aspect}vh)` }}>
          <div className="relative select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-50" style={{ aspectRatio: `${aspect}` }}>
            {ready ? (
              <svg ref={svgRef} viewBox={`${win.x} ${win.y} ${win.w} ${win.h}`} role="img" aria-label="Photo à retoucher" className={`absolute inset-0 h-full w-full touch-none ${tool === 'select' ? 'cursor-pointer' : tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <g dangerouslySetInnerHTML={{ __html: html }} />
                <g dangerouslySetInnerHTML={{ __html: overlay }} />
              </svg>
            ) : !error && <div className="flex h-full items-center justify-center text-[11px] text-slate-400">Chargement de la photo…</div>}
          </div>
        </div>

        {panel === 'image' ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5" role="group" aria-label="Réglages de l'image">
            <div className={GRID}>
              <Row label="Luminosité" value={doc.b} shown={`${doc.b > 0 ? '+' : ''}${doc.b}`} def={0} min={-50} max={50} step={1} onChange={v => adjust('b', v)} onEnd={endRange} onReset={() => commit({ ...doc, b: 0 })} />
              <Row label="Contraste" value={doc.k} shown={`${doc.k > 0 ? '+' : ''}${doc.k}`} def={0} min={-50} max={50} step={1} onChange={v => adjust('k', v)} onEnd={endRange} onReset={() => commit({ ...doc, k: 0 })} />
              <Row label="Redressement" value={doc.t} shown={`${fr(doc.t)}°`} def={0} min={-15} max={15} step={0.5} onChange={v => adjust('t', v)} onEnd={endRange} onReset={() => commit({ ...doc, t: 0 })} />
            </div>
            {doc.c && <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600"><span>Recadrage en place ({Math.round(doc.c.w * 100)} × {Math.round(doc.c.h * 100)} % de la photo).</span><Button className="!py-1" onClick={() => commit({ ...doc, c: undefined })}>Retirer le recadrage</Button></div>}
            <p className="text-[11px] text-slate-500">La photo d'origine n'est jamais modifiée : ces réglages, le recadrage et les marques peuvent être repris ou retirés à tout moment.</p>
          </div>
        ) : kind && st ? (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5" role="group" aria-label="Aspect de la marque">
            {picked?.k === 'text' && (
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">Texte
                <input ref={textRef} className={`${inputCls} flex-1`} value={picked.t} maxLength={40} placeholder="Écrire un mot ou une courte phrase" aria-label="Texte de la marque"
                  style={{ fontFamily: FONTS[st.font].stack, fontWeight: st.bold ? 700 : 400, fontStyle: st.italic ? 'italic' : 'normal' }}
                  onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.blur(); } }}
                  onBlur={() => { if (!picked.t.trim()) removeAt(sel); }} />   {/* a word left empty is not kept */}
              </label>
            )}
            {picked?.k === 'number' && (
              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">Légende du {picked.n}
                <input className={`${inputCls} flex-1`} value={picked.label || ''} maxLength={80} placeholder="Facultatif : ce que montre ce numéro, écrit sous la photo" aria-label="Légende du numéro" onChange={e => setLabel(e.target.value)} />
              </label>
            )}
            {(kind !== 'blur' || st.solid) && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Couleur">
                <span className="mr-1 text-[11px] font-semibold text-slate-700">Couleur</span>
                {COLORS.map(c => (
                  <button key={c.hex} type="button" aria-label={c.name} title={c.name} aria-pressed={st.color === c.hex} onClick={() => patch({ color: c.hex })} style={{ backgroundColor: c.hex }}
                    className={`h-7 w-7 rounded-full border-2 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-10 ${st.color === c.hex ? 'border-delacour-dark ring-2 ring-delacour-gold ring-offset-1' : 'border-slate-400'}`} />
                ))}
                <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                  <input type="color" value={st.color} aria-label="Autre couleur" className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5 [@media(pointer:coarse)]:h-10 [@media(pointer:coarse)]:w-12"
                    onPointerDown={() => { touched.current = false; }} onChange={e => ranged({ color: e.target.value })} onBlur={endRange} />autre
                </label>
              </div>
            )}
            <div className={GRID}>
              {slider('size', kind === 'blur' ? 'Force du flou' : kind === 'loupe' ? 'Taille loupe' : 'Taille', 0.5, 3, 0.25, v => `×${fr(v)}`)}
              {(kind === 'arrow' || kind === 'cross' || kind === 'circle' || kind === 'loupe') && slider('thick', 'Épaisseur', 0.5, 4, 0.25, v => `×${fr(v)}`)}
              {(kind === 'cross' || kind === 'text') && slider('angle', 'Orientation', -180, 180, 5, v => `${v}°`)}
              {kind === 'arrow' && slider('curve', 'Courbure', -2, 2, 0.05, v => `${Math.round(v * 100)} %`)}
            </div>
            {kind === 'arrow' && (
              <button type="button" aria-pressed={st.both} onClick={() => patch({ both: !st.both })}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${touch} ${st.both ? 'border-delacour-dark bg-delacour-dark text-white' : 'border-slate-300 bg-white text-slate-700'}`}><ArrowLeftRight size={14} />Flèche à deux pointes</button>
            )}
            {kind === 'blur' && (
              <div className="space-y-1.5">
                <button type="button" aria-pressed={st.solid} onClick={() => patch({ solid: !st.solid })}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${touch} ${st.solid ? 'border-delacour-dark bg-delacour-dark text-white' : 'border-slate-300 bg-white text-slate-700'}`}><EyeOff size={14} />Masque plein à la place du flou</button>
                <p className="text-[11px] text-slate-500">Le flou cache à l'écran et sur le papier. La photo d'origine reste intacte dans le stockage : pour un visage, le droit à l'image s'applique toujours.</p>
              </div>
            )}
            {kind === 'text' && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">Police
                  <select className={`${inputCls} !w-auto`} value={st.font} aria-label="Police" onChange={e => patch({ font: e.target.value as FontKey })}>
                    {(Object.keys(FONTS) as FontKey[]).map(f => <option key={f} value={f} style={{ fontFamily: FONTS[f].stack }}>{FONTS[f].label}</option>)}
                  </select></label>
                <button type="button" aria-pressed={st.bold} aria-label="Gras" title="Gras" onClick={() => patch({ bold: !st.bold })}
                  className={`rounded-lg border p-1.5 ${touch} ${st.bold ? 'border-delacour-dark bg-delacour-dark text-white' : 'border-slate-300 bg-white text-slate-700'}`}><Bold size={14} /></button>
                <button type="button" aria-pressed={st.italic} aria-label="Italique" title="Italique" onClick={() => patch({ italic: !st.italic })}
                  className={`rounded-lg border p-1.5 ${touch} ${st.italic ? 'border-delacour-dark bg-delacour-dark text-white' : 'border-slate-300 bg-white text-slate-700'}`}><Italic size={14} /></button>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">Fond
                  <select className={`${inputCls} !w-auto`} value={st.bg} aria-label="Fond du texte" onChange={e => patch({ bg: e.target.value as TextBg })}>{BGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              </div>
            )}
            {picked && (
              <div className="flex flex-wrap items-center gap-2">
                <Button className="!py-1" onClick={duplicate}><Copy size={13} />Dupliquer</Button>
                {sameKind > 1 && <Button className="!py-1" onClick={applyToAll}>Même aspect pour les {sameKind} {KIND_NAME[picked.k]}</Button>}
                <Button kind="danger" className="!py-1" onClick={() => removeAt(sel)}><Trash2 size={13} />Supprimer cette marque</Button>
                <span className="text-[11px] text-slate-500">
                  {picked.k === 'arrow' ? 'Glisser une extrémité pour réorienter, le losange pour courber, le carré pour agrandir.' : picked.k === 'loupe' ? 'Glisser le petit cercle (le détail), la bulle, ou le carré pour agrandir.' : picked.k === 'blur' ? 'Glisser un coin pour redimensionner.' : picked.k === 'cross' || picked.k === 'text' ? 'Tirer la poignée ronde pour tourner, le carré pour agrandir.' : 'Tirer le carré pour agrandir.'}
                </span>
              </div>
            )}
          </div>
        ) : tool === 'select' ? <p className="text-[11px] text-slate-500">Touchez une marque pour la modifier, la déplacer ou la supprimer. Flèches du clavier : déplacer finement.</p> : null}
        <p className="text-[11px] text-slate-500">La photo d'origine n'est jamais modifiée : marques, recadrage et réglages se reprennent à tout moment, même des mois plus tard.</p>
      </div>
    </Modal>
  );
}
