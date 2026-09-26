// Printable documents of tools 2.1 to 5.4 (debit note, change agreement, acceptance report, red label…):
// a coloured title band, headings, paragraphs, label/value lines, tables and signature boxes, on A4 pages.
// Pure: the same data gives the same file.
import { A4, PdfDoc, textWidth, wrap, type Rgb } from './pdf';

export const M = 42;
export const WIDTH = A4.w - 2 * M;
const BOTTOM = M + 24;
export const COLORS = {
  green: [27, 77, 62] as Rgb, red: [185, 28, 28] as Rgb, dark: [15, 23, 42] as Rgb, gray: [71, 85, 105] as Rgb,
  line: [203, 213, 225] as Rgb, pale: [241, 245, 249] as Rgb, white: [255, 255, 255] as Rgb, amber: [180, 83, 9] as Rgb,
};

export interface DocMeta { company: string; title: string; date: Date; coords?: string }
// Company details printed under the title of the documents sent outside
export const coordsOf = (p: { company?: { address: string; siret: string; phone: string; email: string } }) => { const c = p.company; return c ? [c.address, c.siret && `SIRET ${c.siret}`, c.phone, c.email].filter(Boolean).join(' · ') : ''; };

export class DocWriter {
  doc = new PdfDoc();
  y = 0;
  constructor(private meta: DocMeta, private color: Rgb = COLORS.green) {}

  page() { this.doc.addPage(); this.y = A4.h - M; }
  ensure(h: number) { if (this.y - h < BOTTOM) { this.page(); this.para(`${this.meta.title} (suite)`, 9, { bold: true, color: this.color, gap: 8 }); } }

  // Title band across the top of a new page
  band(kicker: string, title: string, sub = '') {
    this.page();
    const lines = wrap(title, WIDTH, 18, true).slice(0, 3);
    const h = 44 + lines.length * 22 + (sub ? 14 : 0);
    this.doc.rect(0, A4.h - h, A4.w, h, this.color);
    this.doc.text(kicker.toUpperCase(), M, A4.h - 28, 9, { bold: true, color: [220, 232, 226] });
    lines.forEach((l, i) => this.doc.text(l, M, A4.h - 52 - i * 22, 18, { bold: true, color: COLORS.white }));
    if (sub) this.doc.text(wrap(sub, WIDTH, 10)[0], M, A4.h - 52 - lines.length * 22 + 4, 10, { color: [220, 232, 226] });
    this.y = A4.h - h - 8;
    if (this.meta.coords) this.para(`${this.meta.company} · ${this.meta.coords}`, 8.5, { color: COLORS.gray, gap: 2 });
  }

  para(t: string, size = 10.5, o: { bold?: boolean; color?: Rgb; x?: number; width?: number; gap?: number } = {}) {
    const x = o.x ?? M, w = o.width ?? WIDTH - (x - M);
    for (const l of wrap(t, w, size, o.bold)) {
      this.ensure(size * 1.35);
      this.y -= size * 1.35;
      this.doc.text(l, x, this.y + size * 0.3, size, { bold: o.bold, color: o.color });
    }
    this.y -= o.gap ?? 4;
  }

  heading(t: string) {
    this.ensure(40);
    this.y -= 10;
    this.para(t.toUpperCase(), 9, { bold: true, color: this.color, gap: 3 });
    this.doc.line(M, this.y + 2, A4.w - M, this.y + 2, COLORS.line);
    this.y -= 4;
  }

  // "Label : value" lines in two columns of text
  fields(rows: [string, string][], labelW = 150) {
    rows.forEach(([k, v]) => {
      const lines = wrap(v || '—', WIDTH - labelW, 10.5);
      this.ensure(lines.length * 14 + 2);
      this.doc.text(k, M, this.y - 11, 9.5, { color: COLORS.gray });
      lines.forEach((l, i) => this.doc.text(l, M + labelW, this.y - 11 - i * 14, 10.5, { color: COLORS.dark }));
      this.y -= lines.length * 14 + 3;
    });
  }

  // Table with a header row; widths in share of the page width; rows grow with their text
  table(headers: string[], rows: string[][], widths: number[], o: { size?: number; highlight?: (row: number) => Rgb | null } = {}) {
    const size = o.size ?? 9;
    const ws = widths.map(w => w * WIDTH);
    const xs = ws.map((_, i) => M + ws.slice(0, i).reduce((a, b) => a + b, 0));
    const drawHeader = () => {
      const hl = headers.map((h, i) => wrap(h, ws[i] - 8, 8.5, true));
      const hh = Math.max(...hl.map(l => l.length)) * 11 + 6;
      this.ensure(hh + 20);
      this.doc.rect(M, this.y - hh, WIDTH, hh, COLORS.pale);
      hl.forEach((ls, i) => ls.forEach((l, j) => this.doc.text(l, xs[i] + 4, this.y - 11 - j * 11, 8.5, { bold: true, color: COLORS.gray })));
      this.y -= hh;
    };
    drawHeader();
    rows.forEach((r, ri) => {
      const cells = r.map((c, i) => wrap(c || '', ws[i] - 8, size));
      const h = Math.max(...cells.map(l => l.length)) * (size * 1.3) + 6;
      if (this.y - h < BOTTOM) { this.page(); drawHeader(); }
      const fill = o.highlight?.(ri);
      if (fill) this.doc.rect(M, this.y - h, WIDTH, h, fill);
      cells.forEach((ls, i) => ls.forEach((l, j) => this.doc.text(l, xs[i] + 4, this.y - size - 2 - j * size * 1.3, size, { color: COLORS.dark })));
      this.y -= h;
      this.doc.line(M, this.y, A4.w - M, this.y, COLORS.line);
    });
    this.y -= 6;
  }

  // Boxes to sign by hand: title, name and date lines, blank space
  signatures(boxes: { title: string; name?: string; date?: string }[]) {
    const h = 96, gap = 12;
    const w = (WIDTH - gap * (boxes.length - 1)) / boxes.length;
    this.ensure(h + 16);
    this.y -= 8;
    boxes.forEach((b, i) => {
      const x = M + i * (w + gap);
      this.doc.line(x, this.y, x + w, this.y, COLORS.line);
      this.doc.line(x, this.y - h, x + w, this.y - h, COLORS.line);
      this.doc.line(x, this.y, x, this.y - h, COLORS.line);
      this.doc.line(x + w, this.y, x + w, this.y - h, COLORS.line);
      this.doc.text(wrap(b.title, w - 12, 9, true)[0], x + 6, this.y - 13, 9, { bold: true, color: this.color });
      this.doc.text(`Nom : ${b.name || ''}`, x + 6, this.y - 28, 9, { color: COLORS.dark });
      this.doc.text(`Date : ${b.date || ''}`, x + 6, this.y - 41, 9, { color: COLORS.dark });
      this.doc.text('Signature :', x + 6, this.y - 54, 9, { color: COLORS.gray });
    });
    this.y -= h + 8;
  }

  // Framed message in the colour of the document
  callout(t: string, fill: Rgb = COLORS.pale, color: Rgb = this.color) {
    const lines = wrap(t, WIDTH - 20, 10.5, true);
    const h = lines.length * 14 + 12;
    this.ensure(h + 8);
    this.y -= 6;
    this.doc.rect(M, this.y - h, WIDTH, h, fill);
    lines.forEach((l, i) => this.doc.text(l, M + 10, this.y - 16 - i * 14, 10.5, { bold: true, color }));
    this.y -= h + 6;
  }

  // Footer on every page, then the file
  finish(): string {
    const left = `${this.meta.title}${this.meta.company ? ` · ${this.meta.company}` : ''} · édité le ${this.meta.date.toLocaleDateString('fr-FR')}`;
    this.doc.pages.forEach((_, i) => {
      this.doc.setPage(i);
      const right = `page ${i + 1} / ${this.doc.pages.length}`;
      this.doc.text(left, M, M - 8, 8, { color: COLORS.gray });
      this.doc.text(right, A4.w - M - textWidth(right, 8), M - 8, 8, { color: COLORS.gray });
    });
    return this.doc.toString(this.meta.title);
  }
}
