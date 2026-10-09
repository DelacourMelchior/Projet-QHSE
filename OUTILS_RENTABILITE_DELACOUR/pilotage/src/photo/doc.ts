// A photo as an SVG document: the original, turned, straightened and adjusted, and the marks drawn over it. One place builds it for the editor, the sheets,
// the station and the paper, so that they always agree. The picture is laid out in a space whose long side is 1 000 units (marks use the same space).
import { cleanMarks, markSvg, type Mark } from '../ui/photo';
import type { Crop, PhotoEdit, PhotoRef } from './ref';

export const LONG = 1000;
export interface PhotoDoc {
  w: number; h: number;   // size of the turned picture in units
  win: Crop;              // the visible part, in units (the crop, or everything)
  base: string;           // the picture alone (what a loupe or a blur copies)
  marks: string;          // the marks
  defs: string;
}
export const turned = (p: { w: number; h: number; edit: PhotoEdit }) => ((p.edit.r || 0) % 2 ? { tw: p.h, th: p.w } : { tw: p.w, th: p.h });

// uid keeps the ids of filters and clips apart when several photos are on one page. withMarks: false for the picture alone
export function photoDoc(p: PhotoRef, href: string, uid: string, withMarks = true, marks?: Mark[]): PhotoDoc {
  const { tw, th } = turned(p), k = LONG / Math.max(tw, th), W = tw * k, H = th * k, iw = p.w * k, ih = p.h * k, e = p.edit;
  const matrix = [`none`, `matrix(0 1 -1 0 ${ih} 0)`, `matrix(-1 0 0 -1 ${iw} ${ih})`, `matrix(0 -1 1 0 0 ${iw})`][e.r || 0];
  const t = e.t || 0, ar = Math.abs(t) * Math.PI / 180, fit = Math.cos(ar) + Math.sin(ar) * Math.max(W / H, H / W);   // scale that keeps a straightened picture covering its frame
  const c = 1 + (e.k || 0) / 50, br = (e.b || 0) / 100;
  const adjusted = !!(e.b || e.k);
  const defs = adjusted ? `<filter id="fl-${uid}" color-interpolation-filters="sRGB"><feComponentTransfer>${['R', 'G', 'B'].map(ch => `<feFunc${ch} type="linear" slope="${c}" intercept="${Math.round((0.5 * (1 - c) + br) * 1000) / 1000}"/>`).join('')}</feComponentTransfer></filter>` : '';
  const image = `<image href="${href}" width="${iw}" height="${ih}"${matrix === 'none' ? '' : ` transform="${matrix}"`} preserveAspectRatio="none"/>`;
  const straight = t ? `<g transform="translate(${W / 2} ${H / 2}) rotate(${t}) scale(${fit}) translate(${-W / 2} ${-H / 2})">${image}</g>` : image;
  const base = `<g${adjusted ? ` filter="url(#fl-${uid})"` : ''}>${straight}</g>`;
  const list = marks || cleanMarks(e.m);
  const out = withMarks ? list.filter(m => m.k !== 'text' || m.t.trim()).map((m, i) => markSvg(m, W, H, { base, id: `${uid}-${i}` })).join('') : '';
  const c0 = e.c;
  return { w: W, h: H, win: c0 ? { x: c0.x * W, y: c0.y * H, w: c0.w * W, h: c0.h * H } : { x: 0, y: 0, w: W, h: H }, base, marks: out, defs };
}

// The numbered marks that have a caption (shown under the photo, like the key of an assembly drawing)
export function legendOf(p: PhotoRef): { n: number; label: string }[] {
  return cleanMarks(p.edit.m).flatMap(m => (m.k === 'number' && m.label ? [{ n: m.n, label: m.label }] : [])).sort((a, b) => a.n - b.n);
}
