// Minimal PDF writer, no library: A4 pages, Helvetica / Helvetica-Bold (built into every PDF reader), text, rectangles.
// The output is plain ASCII (text drawn as hex strings), so it can be written as a string.

export type Rgb = [number, number, number];
type Font = 'F1' | 'F2';   // Helvetica, Helvetica-Bold

// Glyph widths (1/1000 em) of ASCII 32..126, from the standard font metrics
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const SPECIAL_W: Record<string, number> = { '«': 556, '»': 556, '’': 222, '‘': 222, '€': 556, '–': 556, '—': 1000, '…': 1000, 'œ': 944, 'Œ': 1000, '°': 400, '·': 278, '•': 350, '×': 584, '™': 1000, '‰': 1000, '‹': 333, '›': 333, 'ˆ': 333, '˜': 333, '\u00a0': 278, '\u202f': 278 };
// Unicode -> WinAnsi (cp1252): the characters of 0x80-0x9F, which sit outside Latin-1
const CP1252: Record<string, number> = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
// What the file writes for a character the font cannot draw and that has no accent to strip (the rest goes through the decomposition of Unicode): a sign in letters, a letter near to it
const APPROX: Record<string, string> = {
  'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h', 'Ŧ': 'T', 'ŧ': 't', 'Ŋ': 'N', 'ŋ': 'n', 'ı': 'i', 'ĸ': 'k', 'ẞ': 'SS', '\u03a9': 'ohm', '\u2126': 'ohm', '\u03bc': '\u00b5',
  '≤': '<=', '≥': '>=', '≠': '!=', '≈': '~', '⌀': 'diam.', '→': '->', '←': '<-', '↔': '<->', '⇒': '=>', '′': "'", '″': '"', '‛': "'", '‟': '"', '−': '-', '‐': '-', '‑': '-', '‒': '-', '―': '-', '∕': '/', '⁄': '/', '∙': '·', '⋅': '·',
};
const exact = (ch: string) => { const c = ch.codePointAt(0)!; return (c >= 32 && c <= 126) || (c >= 160 && c < 256) || CP1252[ch] !== undefined; };
// What the file draws for a character, and whether the reader loses something by it (a letter without its accent, a sign written in letters, a "?"); controls and invisible marks go without a trace
function draw(ch: string): [string, boolean] {
  if (exact(ch)) return [ch, false];
  if (ch === '\u202f') return ['\u00a0', false];
  if (/[\t\u1680\u2000-\u200a\u205f\u3000]/.test(ch)) return [' ', false];
  if (/[\p{Cc}\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\ufe00-\ufe0f]/u.test(ch)) return ['', false];
  const k = ch.normalize('NFKD'), t = APPROX[ch] ?? (/\p{L}/u.test(ch) ? k.replace(/\p{M}/gu, '') : k);   // the accent of a letter goes, the mark of a sign ("not equal") would change its meaning
  return t && t !== ch && [...t].every(exact) ? [t, true] : ['?', true];
}
export const LOSSY_NOTE = 'Caractères non représentables dans ce fichier remplacés par leur approximation';

function glyphWidth(ch: string, bold: boolean): number {
  if (SPECIAL_W[ch] !== undefined) return SPECIAL_W[ch];
  const base = ch.normalize('NFD')[0];
  const c = base.charCodeAt(0);
  return c >= 32 && c <= 126 ? (bold ? W_BOLD : W_REG)[c - 32] : 556;
}
// The width of what is drawn for the character (the approximation can be longer than the character: ">=" for "≥")
const charWidth = (ch: string, bold: boolean) => [...draw(ch)[0]].reduce((a, x) => a + glyphWidth(x, bold), 0);
export const textWidth = (t: string, size: number, bold = false) => [...t].reduce((a, ch) => a + charWidth(ch, bold), 0) * size / 1000;

// The hex string of a text in WinAnsi, and whether a character was replaced by an approximation or a "?"
function encode(t: string): [string, boolean] {
  let out = '', lossy = false;
  for (const ch of t) {
    const [s, l] = draw(ch);
    lossy ||= l;
    for (const x of s) out += (CP1252[x] ?? x.charCodeAt(0)).toString(16).padStart(2, '0');
  }
  return [`<${out}>`, lossy];
}
const hex = (t: string) => encode(t)[0];

// Line breaks on spaces only (no-break spaces keep "12 000 €" together); a word longer than a line is cut where the line ends, starting in what is left of the one it comes after
export function wrap(t: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of t.split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size, bold) <= width) { cur = next; continue; }
      if (cur && textWidth(word, size, bold) <= width) { lines.push(cur); cur = word; continue; }   // the word fits on a line of its own
      cur = cur ? `${cur} ` : '';
      for (const ch of word) {
        if (cur && textWidth(cur + ch, size, bold) > width) { lines.push(cur.trimEnd()); cur = ''; }
        cur += ch;
      }
    }
    lines.push(cur);
  }
  return lines;
}
// At most `max` lines: what is left out is told by "…" at the end of the last one
export function wrapMax(t: string, width: number, size: number, bold = false, max = 1): string[] {
  const lines = wrap(t, width, size, bold);
  if (lines.length <= max) return lines;
  let last = lines[max - 1];
  while (last && textWidth(`${last}…`, size, bold) > width) last = last.slice(0, -1);
  return [...lines.slice(0, max - 1), `${last}…`];
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const col = (c: Rgb) => c.map(x => n(x / 255)).join(' ');

export const A4 = { w: 595.28, h: 841.89 };

export class PdfDoc {
  pages: string[][] = [];
  cur = -1;
  lossy = new Set<number>();   // the pages where a character was replaced: toString says it at the foot of each
  private get ops() { return this.pages[this.cur]; }
  addPage() { this.pages.push([]); this.cur = this.pages.length - 1; }
  setPage(i: number) { this.cur = i; }
  rect(x: number, y: number, w: number, h: number, fill: Rgb) { this.ops.push(`${col(fill)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`); }
  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.5) { this.ops.push(`${col(color)} RG ${n(width)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`); }
  private textOp(t: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: Rgb }): [string, boolean] {
    const f: Font = opts.bold ? 'F2' : 'F1', [h, lossy] = encode(t);
    return [`BT ${col(opts.color || [15, 23, 42])} rg /${f} ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(y)} Tm ${h} Tj ET`, lossy];
  }
  text(t: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: Rgb } = {}) {
    const [op, lossy] = this.textOp(t, x, y, size, opts);
    this.ops.push(op);
    if (lossy) this.lossy.add(this.cur);
  }

  // Serialised file: catalog, page tree, 2 standard fonts, one content stream per page, cross-reference table
  toString(title = 'Document'): string {
    const objs: string[] = [];
    const pageIds = this.pages.map((_, i) => 5 + i * 2);
    objs[1] = '<< /Type /Catalog /Pages 2 0 R /Lang (fr-FR) >>';   // the language of the file, read by a screen reader
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    this.pages.forEach((ops, i) => {
      const content = [...ops, ...(this.lossy.has(i) ? [this.textOp(LOSSY_NOTE, 42, 20, 8, { color: [71, 85, 105] })[0]] : [])].join('\n');
      objs[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
      objs[pageIds[i] + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });
    const infoId = objs.length;
    objs[infoId] = `<< /Title ${hex(title)} /Producer (Pilotage Delacour) >>`;
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (let id = 1; id < objs.length; id++) {
      offsets[id] = out.length;
      out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return out;
  }
}
