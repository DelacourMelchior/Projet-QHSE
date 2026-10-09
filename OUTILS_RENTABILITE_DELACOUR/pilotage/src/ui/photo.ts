// The marks drawn on a photo: arrows (straight or curved, one or two heads), crosses, circles, numbers, words, loupes and blurs. Every mark has its own
// colour, size, thickness, orientation and, for words, its font. Marks are vectors, in a space whose long side is 1 000 units, so that they look the same
// whatever the size of the picture; they are drawn as SVG (on screen, on paper) and kept as data in the reference of the photo (see ../photo/ref.ts).
// ---- marks: each one has its own colour, size, thickness, orientation and, for words, its font
export type FontKey = 'sans' | 'condensed' | 'serif' | 'hand' | 'mono';
// System fonts only (the application loads nothing from the network): the first one installed on the device is used
export const FONTS: Record<FontKey, { label: string; stack: string }> = {
  sans: { label: 'Standard', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  condensed: { label: 'Étroite et grasse', stack: 'Impact, "Arial Narrow", "Helvetica Neue", sans-serif' },
  serif: { label: 'Avec empattements', stack: 'Georgia, "Times New Roman", serif' },
  hand: { label: 'Manuscrite', stack: '"Bradley Hand", "Segoe Print", "Comic Sans MS", "Chalkboard SE", cursive' },
  mono: { label: 'Machine à écrire', stack: 'ui-monospace, Menlo, Consolas, "Courier New", monospace' },
};
export const GREEN = '#16a34a', RED = '#dc2626', AMBER = '#f59e0b', DARK = '#1B4D3E';
export const COLORS = [
  { hex: GREEN, name: 'Vert' }, { hex: RED, name: 'Rouge' }, { hex: AMBER, name: 'Orange' }, { hex: '#facc15', name: 'Jaune' },
  { hex: '#2563eb', name: 'Bleu' }, { hex: '#ffffff', name: 'Blanc' }, { hex: '#0f172a', name: 'Noir' },
];
export type TextBg = 'dark' | 'light' | 'none';
// curve: bend of an arrow (-2 to 2); both: an arrow with a head at each end; solid: a blur that hides with a plain colour
export interface Style { color: string; size: number; thick: number; angle: number; font: FontKey; bold: boolean; italic: boolean; bg: TextBg; curve: number; both: boolean; solid: boolean }
// Position of a mark as a share of the width and of the height of the picture; a missing style field takes the default of its kind.
// arrow, loupe and blur have two points: arrow from its start to its tip, loupe from the spot looked at to the centre of its enlargement, blur from one corner to the other
export type Mark = (
  | { k: 'arrow'; x: number; y: number; x2: number; y2: number }
  | { k: 'cross'; x: number; y: number }
  | { k: 'circle'; x: number; y: number }
  | { k: 'number'; x: number; y: number; n: number; label?: string }
  | { k: 'text'; x: number; y: number; t: string }
  | { k: 'loupe'; x: number; y: number; x2: number; y2: number }
  | { k: 'blur'; x: number; y: number; x2: number; y2: number }
) & Partial<Style>;
export type Kind = Mark['k'];
export type Two = Extract<Mark, { x2: number }>;
export const isTwo = (m: Mark): m is Two => m.k === 'arrow' || m.k === 'loupe' || m.k === 'blur';
const base = (color: string, over: Partial<Style> = {}): Style => ({ color, size: 1, thick: 1, angle: 0, font: 'sans', bold: true, italic: false, bg: 'dark', curve: 0, both: false, solid: false, ...over });
export const DEFAULT_STYLE: Record<Kind, Style> = {
  arrow: base(GREEN), cross: base(RED), circle: base(AMBER), number: base(DARK), text: base('#ffffff'), loupe: base('#2563eb'), blur: base('#0f172a'),
};
const STYLE_KEYS = ['color', 'size', 'thick', 'angle', 'font', 'bold', 'italic', 'bg', 'curve', 'both', 'solid'] as const;
export function styleOf(m: Mark): Style {
  const out: Record<string, unknown> = { ...DEFAULT_STYLE[m.k] };
  STYLE_KEYS.forEach(k => { if (m[k] !== undefined) out[k] = m[k]; });
  return out as unknown as Style;
}
// Dark text on a light colour, white text on a dark one
export function contrast(hex: string): string {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0f172a' : '#ffffff';
}
// Marks are sized from the long side of the picture, so that a quarter turn never changes how they look
const unit = (w: number, h: number) => { const L = Math.max(w, h); return { lw: Math.max(4, L / 110), s: Math.max(24, L / 11) }; };
const textPx = (st: Style, w: number, h: number) => Math.round(unit(w, h).s * 0.55 * st.size);
const fontOf = (st: Style, px: number) => `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${px}px ${FONTS[st.font].stack}`;
const estWidth = (t: string, px: number) => t.length * px * 0.58;   // used where no canvas can measure (tests)
let meter: CanvasRenderingContext2D | null | undefined;
// Width of a word in its font: measured on a canvas, estimated when none is available
function textWidth(st: Style, t: string, px: number): number {
  if (meter === undefined) { try { meter = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'); } catch { meter = null; } }
  if (!meter) return estWidth(t, px);
  meter.font = fontOf(st, px);
  return meter.measureText(t).width;
}
const shown = (m: Extract<Mark, { k: 'text' }>) => m.t || 'Texte';   // a word being typed has no text yet: the frame is that of the hint
const ZOOM = 2.5;   // enlargement of a loupe
const loupeR = (st: Style, w: number, h: number) => unit(w, h).s * 0.75 * st.size;   // radius of the enlargement

// A simple tap draws an arrow from the lower left that points at the finger: its two ends, as shares of the picture
export function tapArrow(x: number, y: number, w: number, h: number, size = 1) {
  const s = unit(w, h).s * size;
  return { x: x - s / w, y: y + s / h, x2: x, y2: y };
}

// Start, tip and control point of an arrow, in pixels (a too short arrow is a tap arrow)
function arrowPts(m: Extract<Mark, { k: 'arrow' }>, w: number, h: number, st: Style) {
  let ax = m.x * w, ay = m.y * h, bx = m.x2 * w, by = m.y2 * h;
  if (Math.hypot(bx - ax, by - ay) < Math.max(w, h) * 0.015) { const s = unit(w, h).s * st.size; bx = ax; by = ay; ax = bx - s; ay = by + s; }
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, off = st.curve * len * 0.5;
  return { ax, ay, bx, by, cx: (ax + bx) / 2 - (dy / len) * off, cy: (ay + by) / 2 + (dx / len) * off, len };
}
const quad = (p: ReturnType<typeof arrowPts>, t: number): [number, number] => [(1 - t) ** 2 * p.ax + 2 * (1 - t) * t * p.cx + t * t * p.bx, (1 - t) ** 2 * p.ay + 2 * (1 - t) * t * p.cy + t * t * p.by];

// Axis-aligned box around a mark, in pixels (the dashed frame of the selection, and the zone that answers to a touch)
export function markBounds(m: Mark, w: number, h: number) {
  const st = styleOf(m), { lw, s } = unit(w, h), k = st.size, x = m.x * w, y = m.y * h;
  let pts: [number, number][], pad = 0;
  if (m.k === 'arrow') { const p = arrowPts(m, w, h, st); pts = [[p.ax, p.ay], [p.bx, p.by], quad(p, 0.5)]; pad = lw * Math.sqrt(k) * st.thick + s * 0.3 * k; }
  else if (m.k === 'blur') pts = [[x, y], [m.x2 * w, m.y2 * h]];
  else if (m.k === 'loupe') { const R = loupeR(st, w, h), r = R / ZOOM; pts = [[x - r, y - r], [x + r, y + r], [m.x2 * w - R, m.y2 * h - R], [m.x2 * w + R, m.y2 * h + R]]; pad = lw; }
  else if (m.k === 'text') {
    const px = textPx(st, w, h), tw = textWidth(st, shown(m), px) + 12, hh = px * 0.8, a = st.angle * Math.PI / 180, c = Math.cos(a), d = Math.sin(a);
    pts = ([[-6, -hh], [tw - 6, -hh], [tw - 6, hh], [-6, hh]] as [number, number][]).map(([u, v]) => [x + u * c - v * d, y + u * d + v * c]);
  } else { const r = s * k * (m.k === 'circle' ? 0.6 : m.k === 'cross' ? 0.55 : 0.5) + lw * st.thick; pts = [[x - r, y - r], [x + r, y + r]]; }
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  return { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad };
}
const distSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// The mark under a touch (shares of the picture), the last drawn first; -1 when there is none. slack: how far from a line still counts, in picture pixels
export function hitMark(marks: Mark[], nx: number, ny: number, w: number, h: number, slack = 16): number {
  const px = nx * w, py = ny * h, { lw } = unit(w, h);
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i], st = styleOf(m);
    if (m.k === 'arrow') {
      const p = arrowPts(m, w, h, st);
      let hit = false, [qx, qy] = [p.ax, p.ay];
      for (let t = 1; t <= 16 && !hit; t++) { const [rx, ry] = quad(p, t / 16); hit = distSeg(px, py, qx, qy, rx, ry) <= lw * Math.sqrt(st.size) * st.thick * 1.5 + slack; [qx, qy] = [rx, ry]; }
      if (hit) return i;
    } else if (m.k === 'loupe') {
      const R = loupeR(st, w, h);
      if (Math.hypot(px - m.x2 * w, py - m.y2 * h) <= R + slack / 2 || Math.hypot(px - m.x * w, py - m.y * h) <= R / ZOOM + slack) return i;
    } else { const b = markBounds(m, w, h); if (px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1) return i; }
  }
  return -1;
}
const clamp = (v: number) => Math.min(1, Math.max(0, v));
export function moveMark(m: Mark, dx: number, dy: number): Mark {
  return isTwo(m) ? { ...m, x: clamp(m.x + dx), y: clamp(m.y + dy), x2: clamp(m.x2 + dx), y2: clamp(m.y2 + dy) } : { ...m, x: clamp(m.x + dx), y: clamp(m.y + dy) };
}
export function moveArrowEnd(m: Mark, end: 1 | 2, nx: number, ny: number): Mark {
  if (!isTwo(m)) return m;
  return end === 1 ? { ...m, x: clamp(nx), y: clamp(ny) } : { ...m, x2: clamp(nx), y2: clamp(ny) };
}

// ---- handles of the picked mark: ends (arrow, loupe, blur), bend (arrow), turn (cross, word), scale (everything with a size but arrow and blur)
export type HandleKind = 'end1' | 'end2' | 'bend' | 'turn' | 'scale';
// Round handle by which a cross or a word is turned with the mouse or a finger, in pixels: past the end of a word, above a cross; null for the other marks
export function turnHandle(m: Mark, w: number, h: number): { x: number; y: number } | null {
  if (m.k !== 'cross' && m.k !== 'text') return null;
  const st = styleOf(m), { lw, s } = unit(w, h), a = st.angle * Math.PI / 180, x = m.x * w, y = m.y * h;
  const [u, v] = m.k === 'text' ? [textWidth(st, shown(m), textPx(st, w, h)) + 32, 0] : [0, -(s * st.size * 0.55 + lw * st.thick + 34)];   // local position before turning
  return { x: x + u * Math.cos(a) - v * Math.sin(a), y: y + u * Math.sin(a) + v * Math.cos(a) };
}
// Where the mark is scaled from, and the handle that scales it (pixels)
function scaleSpot(m: Mark, w: number, h: number): { cx: number; cy: number; x: number; y: number } | null {
  const st = styleOf(m), { lw, s } = unit(w, h), x = m.x * w, y = m.y * h;
  if (m.k === 'cross' || m.k === 'circle' || m.k === 'number') { const r = s * st.size * (m.k === 'circle' ? 0.6 : m.k === 'cross' ? 0.55 : 0.5) + lw * st.thick; return { cx: x, cy: y, x: x + r, y: y + r }; }
  if (m.k === 'text') { const b = markBounds(m, w, h); return { cx: x, cy: y, x: b.x1, y: b.y1 }; }
  if (m.k === 'loupe') { const R = loupeR(st, w, h); return { cx: m.x2 * w, cy: m.y2 * h, x: m.x2 * w + R * 0.7071, y: m.y2 * h + R * 0.7071 }; }
  return null;
}
export function handlesOf(m: Mark, w: number, h: number): { k: HandleKind; x: number; y: number }[] {
  const out: { k: HandleKind; x: number; y: number }[] = [];
  if (isTwo(m)) out.push({ k: 'end1', x: m.x * w, y: m.y * h }, { k: 'end2', x: m.x2 * w, y: m.y2 * h });
  if (m.k === 'arrow') { const [x, y] = quad(arrowPts(m, w, h, styleOf(m)), 0.5); out.push({ k: 'bend', x, y }); }
  const t = turnHandle(m, w, h);
  if (t) out.push({ k: 'turn', ...t });
  const sc = scaleSpot(m, w, h);
  if (sc) out.push({ k: 'scale', x: sc.x, y: sc.y });
  return out;
}
// The mark turned so that its handle follows the pointer (shares of the picture); close to a multiple of 15 degrees it snaps, to ease straight lines
export function turnTo(m: Mark, nx: number, ny: number, w: number, h: number): Mark {
  if (m.k !== 'cross' && m.k !== 'text') return m;
  let a = Math.atan2(ny * h - m.y * h, nx * w - m.x * w) * 180 / Math.PI + (m.k === 'cross' ? 90 : 0);
  a = ((a + 540) % 360) - 180;
  const near = Math.round(a / 15) * 15;
  if (Math.abs(a - near) < 4) a = near;
  return { ...m, angle: Math.round(a) === 180 ? -180 : Math.round(a) };
}
// The mark scaled so that its handle follows the pointer
export function scaleTo(m: Mark, nx: number, ny: number, w: number, h: number): Mark {
  const sc = scaleSpot(m, w, h);
  if (!sc) return m;
  const d0 = Math.hypot(sc.x - sc.cx, sc.y - sc.cy) || 1, d = Math.hypot(nx * w - sc.cx, ny * h - sc.cy);
  return { ...m, size: Math.round(Math.min(3, Math.max(0.5, styleOf(m).size * d / d0)) * 100) / 100 };
}
// The arrow bent so that its middle follows the pointer
export function bendTo(m: Mark, nx: number, ny: number, w: number, h: number): Mark {
  if (m.k !== 'arrow') return m;
  const ax = m.x * w, ay = m.y * h, dx = m.x2 * w - ax, dy = m.y2 * h - ay, len = Math.hypot(dx, dy);
  if (len < 1) return m;
  const off = ((nx * w - (ax + m.x2 * w) / 2) * -dy + (ny * h - (ay + m.y2 * h) / 2) * dx) / len;   // distance of the pointer from the chord, signed
  const c = Math.round(Math.min(2, Math.max(-2, off / (len * 0.25))) * 20) / 20;
  return { ...m, curve: Math.abs(c) < 0.08 ? 0 : c };
}
// One place for what a handle does
export function dragHandle(orig: Mark, k: HandleKind, nx: number, ny: number, w: number, h: number): Mark {
  return k === 'turn' ? turnTo(orig, nx, ny, w, h) : k === 'scale' ? scaleTo(orig, nx, ny, w, h) : k === 'bend' ? bendTo(orig, nx, ny, w, h) : moveArrowEnd(orig, k === 'end1' ? 1 : 2, nx, ny);
}

// A quarter turn of the picture clockwise (dir 1) or counter-clockwise (-1): where a mark, and a crop window, end up (shares of the turned picture)
export function turnMark(m: Mark, dir: 1 | -1): Mark {
  const pt = (x: number, y: number): [number, number] => (dir === 1 ? [1 - y, x] : [y, 1 - x]);
  const [x, y] = pt(m.x, m.y), out = { ...m, x, y } as Mark;
  if (isTwo(out) && isTwo(m)) [out.x2, out.y2] = pt(m.x2, m.y2);
  if (m.k === 'cross' || m.k === 'text') { const a = ((styleOf(m).angle + dir * 90 + 540) % 360) - 180; out.angle = a === 180 ? -180 : a; }
  return out;
}
export const turnCrop = (c: { x: number; y: number; w: number; h: number }, dir: 1 | -1) => (dir === 1 ? { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w } : { x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w });

// ---- drawing: every mark is an SVG fragment in the units of the picture (the editor shows it, the sheets and the paper show it)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (t: string) => t.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const r2 = (v: number) => Math.round(v * 100) / 100;
// What a loupe and a blur need: the picture as drawn (turned, adjusted), to copy it, and a unique id for their clip
export interface DrawCtx { base: string; id: string }
export function markSvg(m: Mark, w: number, h: number, ctx?: DrawCtx): string {
  const st = styleOf(m), { lw: lw0, s: s0 } = unit(w, h), s = s0 * st.size, lw = r2(lw0 * Math.sqrt(st.size) * st.thick), x = r2(m.x * w), y = r2(m.y * h);
  const line = `fill="none" stroke="${st.color}" stroke-width="${lw}" stroke-linecap="round" stroke-linejoin="round"`;
  const font = `font-family="${esc(FONTS[st.font].stack)}" font-weight="${st.bold ? 700 : 400}" font-style="${st.italic ? 'italic' : 'normal'}"`;
  if (m.k === 'arrow') {
    const p = arrowPts(m, w, h, st), head = s * 0.55, curved = st.curve !== 0;
    const tip = (px: number, py: number, qx: number, qy: number) => { const a = Math.atan2(py - qy, px - qx); return `M${r2(px - head * Math.cos(a - 0.45))} ${r2(py - head * Math.sin(a - 0.45))}L${r2(px)} ${r2(py)}L${r2(px - head * Math.cos(a + 0.45))} ${r2(py - head * Math.sin(a + 0.45))}`; };
    const body = curved ? `M${r2(p.ax)} ${r2(p.ay)}Q${r2(p.cx)} ${r2(p.cy)} ${r2(p.bx)} ${r2(p.by)}` : `M${r2(p.ax)} ${r2(p.ay)}L${r2(p.bx)} ${r2(p.by)}`;
    return `<path ${line} d="${body}${tip(p.bx, p.by, curved ? p.cx : p.ax, curved ? p.cy : p.ay)}${st.both ? tip(p.ax, p.ay, curved ? p.cx : p.bx, curved ? p.cy : p.by) : ''}"/>`;
  }
  if (m.k === 'cross') return `<path ${line} transform="translate(${x} ${y}) rotate(${st.angle})" d="M${r2(-s / 2)} ${r2(-s / 2)}L${r2(s / 2)} ${r2(s / 2)}M${r2(s / 2)} ${r2(-s / 2)}L${r2(-s / 2)} ${r2(s / 2)}"/>`;
  if (m.k === 'circle') return `<circle ${line} cx="${x}" cy="${y}" r="${r2(s * 0.6)}"/>`;
  if (m.k === 'number') return `<g transform="translate(${x} ${y})"><circle r="${r2(s * 0.5)}" fill="${st.color}"/><text transform="rotate(${st.angle})" text-anchor="middle" dy=".35em" font-size="${r2(s * 0.62)}" ${font} fill="${contrast(st.color)}">${m.n}</text></g>`;
  if (m.k === 'loupe') {
    const R = loupeR(st, w, h), r = R / ZOOM, x2 = r2(m.x2 * w), y2 = r2(m.y2 * h), id = ctx?.id || 'l';
    const d = Math.hypot(x2 - x, y2 - y) || 1, ux = (x2 - x) / d, uy = (y2 - y) / d;
    const link = d > R + r ? `<path ${line} d="M${r2(x + ux * r)} ${r2(y + uy * r)}L${r2(x2 - ux * R)} ${r2(y2 - uy * R)}" stroke-dasharray="${r2(lw * 2)} ${r2(lw * 2)}"/>` : '';
    const inside = ctx ? `<defs><clipPath id="lc-${id}"><circle cx="${x2}" cy="${y2}" r="${r2(R)}"/></clipPath></defs><g clip-path="url(#lc-${id})"><g transform="translate(${x2} ${y2}) scale(${ZOOM}) translate(${-x} ${-y})">${ctx.base}</g></g>` : '';
    return `${link}<circle ${line} cx="${x}" cy="${y}" r="${r2(r)}"/>${inside}<circle ${line} cx="${x2}" cy="${y2}" r="${r2(R)}"/>`;
  }
  if (m.k === 'blur') {
    const rx = r2(Math.min(m.x, m.x2) * w), ry = r2(Math.min(m.y, m.y2) * h), rw = r2(Math.abs(m.x2 - m.x) * w), rh = r2(Math.abs(m.y2 - m.y) * h), id = ctx?.id || 'b';
    if (st.solid || !ctx) return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="${r2(lw)}" fill="${st.color}"${ctx ? '' : ' fill-opacity=".4"'}/>`;
    return `<defs><clipPath id="bc-${id}"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}"/></clipPath><filter id="bf-${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${r2(w)}" height="${r2(h)}"><feGaussianBlur stdDeviation="${r2(s0 * 0.28 * st.size)}"/></filter></defs><g clip-path="url(#bc-${id})"><g filter="url(#bf-${id})">${ctx.base}</g></g>`;
  }
  const px = textPx(st, w, h), tw = r2(textWidth(st, m.t, px)), txt = esc(m.t);
  const back = st.bg === 'none' ? '' : `<rect x="-6" y="${r2(-px * 0.8)}" width="${r2(tw + 12)}" height="${r2(px * 1.6)}" rx="${r2(px * 0.28)}" fill="${st.bg === 'dark' ? '#0f172a' : '#ffffff'}" fill-opacity="${st.bg === 'dark' ? 0.86 : 0.92}"/>`;
  const halo = st.bg === 'none' ? ` stroke="${contrast(st.color)}" stroke-width="${r2(Math.max(3, px / 5))}" stroke-linejoin="round" paint-order="stroke"` : '';
  // textLength keeps the word inside its background whatever font the device ends up using
  return `<g transform="translate(${x} ${y}) rotate(${st.angle})">${back}<text dy=".35em" font-size="${px}" ${font} fill="${st.color}" textLength="${tw}" lengthAdjust="spacingAndGlyphs"${halo}>${txt}</text></g>`;
}
// What the editor draws over the picked mark: dashed frame and its handles. ui: picture units per screen pixel
export function selectionSvg(m: Mark, w: number, h: number, ui: number): string {
  const b = markBounds(m, w, h), gold = `stroke="#C5A065" stroke-width="${r2(2.5 * ui)}"`;
  let out = `<rect x="${r2(b.x0)}" y="${r2(b.y0)}" width="${r2(b.x1 - b.x0)}" height="${r2(b.y1 - b.y0)}" fill="none" ${gold} stroke-dasharray="${r2(7 * ui)} ${r2(5 * ui)}"/>`;
  const x = m.x * w, y = m.y * h;
  for (const hd of handlesOf(m, w, h)) {
    if (hd.k === 'end1' || hd.k === 'end2') out += `<circle cx="${r2(hd.x)}" cy="${r2(hd.y)}" r="${r2(9 * ui)}" fill="#fff" ${gold}/>`;
    else if (hd.k === 'bend') out += `<rect x="${r2(hd.x - 7 * ui)}" y="${r2(hd.y - 7 * ui)}" width="${r2(14 * ui)}" height="${r2(14 * ui)}" rx="${r2(3 * ui)}" fill="#fff" ${gold} transform="rotate(45 ${r2(hd.x)} ${r2(hd.y)})"/>`;
    else if (hd.k === 'scale') out += `<rect x="${r2(hd.x - 7 * ui)}" y="${r2(hd.y - 7 * ui)}" width="${r2(14 * ui)}" height="${r2(14 * ui)}" rx="${r2(2 * ui)}" fill="#C5A065" stroke="#fff" stroke-width="${r2(1.5 * ui)}"/>`;
    else {
      const d = Math.hypot(hd.x - x, hd.y - y) || 1, gap = m.k === 'text' ? 26 : 34, a = 5 * ui;   // the stem links the handle to the frame, not through the word
      out += `<path d="M${r2(hd.x - (hd.x - x) / d * gap)} ${r2(hd.y - (hd.y - y) / d * gap)}L${r2(hd.x)} ${r2(hd.y)}" ${gold}/><circle cx="${r2(hd.x)}" cy="${r2(hd.y)}" r="${r2(11 * ui)}" fill="#fff" ${gold}/>`
        + `<path d="M${r2(hd.x + a * Math.cos(-2.6))} ${r2(hd.y + a * Math.sin(-2.6))}A${r2(a)} ${r2(a)} 0 1 1 ${r2(hd.x + a * Math.cos(1.2))} ${r2(hd.y + a * Math.sin(1.2))}" fill="none" ${gold}/>`;
    }
  }
  return out;
}
// The frame of the crop being chosen: what stays clear, the rest dimmed
export function cropSvg(r: { x: number; y: number; w: number; h: number }, w: number, h: number, ui: number): string {
  const x = r.x * w, y = r.y * h, rw = r.w * w, rh = r.h * h;
  return `<path d="M0 0H${w}V${h}H0ZM${r2(x)} ${r2(y)}H${r2(x + rw)}V${r2(y + rh)}H${r2(x)}Z" fill="rgba(15,23,42,.55)" fill-rule="evenodd"/><rect x="${r2(x)}" y="${r2(y)}" width="${r2(rw)}" height="${r2(rh)}" fill="none" stroke="#C5A065" stroke-width="${r2(3 * ui)}"/>`;
}

// ---- marks coming from data (a reference, an old picture): only what is known and in range is kept
const KINDS: Kind[] = ['arrow', 'cross', 'circle', 'number', 'text', 'loupe', 'blur'];
const fin = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
export function cleanMark(raw: unknown): Mark | null {
  const m = raw as Record<string, unknown> | null;
  if (!m || typeof m !== 'object' || !KINDS.includes(m.k as Kind)) return null;
  const x = fin(m.x, 0, 1), y = fin(m.y, 0, 1);
  if (x === undefined || y === undefined) return null;
  const out: Record<string, unknown> = { k: m.k, x, y };
  if (m.k === 'arrow' || m.k === 'loupe' || m.k === 'blur') { const x2 = fin(m.x2, 0, 1), y2 = fin(m.y2, 0, 1); if (x2 === undefined || y2 === undefined) return null; out.x2 = x2; out.y2 = y2; }
  if (m.k === 'number') { const n = fin(m.n, 0, 999); if (n === undefined) return null; out.n = Math.round(n); if (typeof m.label === 'string' && m.label) out.label = m.label.slice(0, 80); }
  if (m.k === 'text') { if (typeof m.t !== 'string') return null; out.t = m.t.slice(0, 80); }
  if (typeof m.color === 'string' && /^#[0-9a-f]{6}$/i.test(m.color)) out.color = m.color;
  const size = fin(m.size, 0.5, 3), thick = fin(m.thick, 0.5, 4), angle = fin(m.angle, -180, 180), curve = fin(m.curve, -2, 2);
  if (size !== undefined) out.size = size;
  if (thick !== undefined) out.thick = thick;
  if (angle !== undefined) out.angle = angle;
  if (curve !== undefined) out.curve = curve;
  if (typeof m.font === 'string' && m.font in FONTS) out.font = m.font;
  if (m.bg === 'dark' || m.bg === 'light' || m.bg === 'none') out.bg = m.bg;
  (['bold', 'italic', 'both', 'solid'] as const).forEach(f => { if (typeof m[f] === 'boolean') out[f] = m[f]; });
  return out as unknown as Mark;
}
export const cleanMarks = (list: unknown): Mark[] => (Array.isArray(list) ? list.map(cleanMark).filter((m): m is Mark => !!m) : []);

// A picture saved by the previous version of the editor (one SVG holding the photo, the marks and the marks as data): the photo and the marks, for the migration.
// Any other picture is returned as it is, with no marks.
export function splitPhoto(src: string): { photo: string; marks: Mark[] } {
  const head = 'data:image/svg+xml;base64,';
  if (!src.startsWith(head)) return { photo: src, marks: [] };
  try {
    const svg = new TextDecoder().decode(Uint8Array.from(atob(src.slice(head.length)), c => c.charCodeAt(0)));
    const meta = svg.match(/<metadata id="dc-marks">([\s\S]*?)<\/metadata>/), img = svg.match(/<image href="([^"]+)"/);
    if (!meta || !img) return { photo: src, marks: [] };
    return { photo: unesc(img[1]), marks: cleanMarks(JSON.parse(unesc(meta[1]))) };
  } catch { return { photo: src, marks: [] }; }
}
