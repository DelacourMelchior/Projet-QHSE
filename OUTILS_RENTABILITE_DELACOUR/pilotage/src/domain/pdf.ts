// Minimal PDF writer, no library: A4 pages, Helvetica / Helvetica-Bold (built into every PDF reader), text, rectangles.
// The output is plain ASCII (text drawn as hex strings), so it can be written as a string.

export type Rgb = [number, number, number];
type Font = 'F1' | 'F2';   // Helvetica, Helvetica-Bold

// Glyph widths (1/1000 em) of ASCII 32..126, from the standard font metrics
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const SPECIAL_W: Record<string, number> = { '«': 556, '»': 556, '’': 222, '‘': 222, '€': 556, '–': 556, '—': 1000, '…': 1000, 'œ': 944, 'Œ': 1000, '°': 400, '·': 278, '•': 350, '×': 584, ' ': 278, ' ': 278 };
// Unicode -> WinAnsi (cp1252) for the characters outside Latin-1
const CP1252: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, 'œ': 0x9c, 'Œ': 0x8c, '™': 0x99, ' ': 0xa0, ' ': 0x20 };

function charWidth(ch: string, bold: boolean): number {
  if (SPECIAL_W[ch] !== undefined) return SPECIAL_W[ch];
  const base = ch.normalize('NFD')[0];
  const c = base.charCodeAt(0);
  return c >= 32 && c <= 126 ? (bold ? W_BOLD : W_REG)[c - 32] : 556;
}
export const textWidth = (t: string, size: number, bold = false) => [...t].reduce((a, ch) => a + charWidth(ch, bold), 0) * size / 1000;

function hex(t: string): string {
  let out = '';
  for (const ch of t) {
    const c = ch.charCodeAt(0);
    const b = CP1252[ch] ?? (c < 256 && (c < 0x80 || c > 0x9f) ? c : 0x3f);   // '?' when not printable in WinAnsi
    out += b.toString(16).padStart(2, '0');
  }
  return `<${out}>`;
}

// Line breaks on spaces only (no-break spaces keep "12 000 €" together); a word longer than the line is cut
export function wrap(t: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of t.split('\n')) {
    let cur = '';
    for (const word of para.split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (textWidth(next, size, bold) <= width || !cur) { cur = next; continue; }
      lines.push(cur);
      cur = word;
    }
    lines.push(cur);
  }
  return lines;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const col = (c: Rgb) => c.map(x => n(x / 255)).join(' ');

export const A4 = { w: 595.28, h: 841.89 };

export class PdfDoc {
  pages: string[][] = [];
  cur = -1;
  private get ops() { return this.pages[this.cur]; }
  addPage() { this.pages.push([]); this.cur = this.pages.length - 1; }
  setPage(i: number) { this.cur = i; }
  rect(x: number, y: number, w: number, h: number, fill: Rgb) { this.ops.push(`${col(fill)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`); }
  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.5) { this.ops.push(`${col(color)} RG ${n(width)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`); }
  text(t: string, x: number, y: number, size: number, opts: { bold?: boolean; color?: Rgb } = {}) {
    const f: Font = opts.bold ? 'F2' : 'F1';
    this.ops.push(`BT ${col(opts.color || [15, 23, 42])} rg /${f} ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(y)} Tm ${hex(t)} Tj ET`);
  }

  // Serialised file: catalog, page tree, 2 standard fonts, one content stream per page, cross-reference table
  toString(title = 'Document'): string {
    const objs: string[] = [];
    const pageIds = this.pages.map((_, i) => 5 + i * 2);
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    this.pages.forEach((ops, i) => {
      const content = ops.join('\n');
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
