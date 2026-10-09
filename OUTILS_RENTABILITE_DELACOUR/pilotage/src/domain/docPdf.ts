// Printable documents of tools 2.1 to 5.4 (debit note, change agreement, acceptance report, red label…):
// a coloured title band, headings, paragraphs, label/value lines, tables and signature boxes, on A4 pages.
// Pure: the same data gives the same file.
import { A4, PdfDoc, textWidth, wrap, wrapMax, type Rgb } from './pdf';
import type { Strokes } from './types';

export const M = 42;
export const WIDTH = A4.w - 2 * M;
const BOTTOM = M + 24;
const PAGE_H = A4.h - M - BOTTOM;   // the height a block can have on an empty page
export const COLORS = {
  green: [27, 77, 62] as Rgb, red: [185, 28, 28] as Rgb, dark: [15, 23, 42] as Rgb, gray: [71, 85, 105] as Rgb,
  line: [203, 213, 225] as Rgb, pale: [241, 245, 249] as Rgb, white: [255, 255, 255] as Rgb, amber: [180, 83, 9] as Rgb,
};

export interface DocMeta { company: string; title: string; date: Date; coords?: string; head?: string }   // `head`: what the top of the pages that follow says (the title when absent)
// Company details printed under the title of the documents sent outside
export const coordsOf = (p: { company?: { address: string; siret: string; phone: string; email: string } }) => { const c = p.company; return c ? [c.address, c.siret && `SIRET ${c.siret}`, c.phone, c.email].filter(Boolean).join(' · ') : ''; };

export class DocWriter {
  doc = new PdfDoc();
  y = 0;
  constructor(private meta: DocMeta, private color: Rgb = COLORS.green) {}

  page() { this.doc.addPage(); this.y = A4.h - M; }
  // The page that follows: it says whose it is
  private next() { this.page(); this.para(`${this.meta.head ?? this.meta.title} (suite)`, 9, { bold: true, color: this.color, gap: 8 }); }
  ensure(h: number) { if (this.y - h < BOTTOM) this.next(); }

  // Title band across the top of a new page; what does not fit (3 lines of title, 2 of sub-title) is told by "…"
  band(kicker: string, title: string, sub = '') {
    this.page();
    const lines = wrapMax(title, WIDTH, 18, true, 3), subs = sub ? wrapMax(sub, WIDTH, 10, false, 2) : [];
    const h = 44 + lines.length * 22 + subs.length * 14;
    this.doc.rect(0, A4.h - h, A4.w, h, this.color);
    this.doc.text(kicker.toUpperCase(), M, A4.h - 28, 9, { bold: true, color: [220, 232, 226] });
    lines.forEach((l, i) => this.doc.text(l, M, A4.h - 52 - i * 22, 18, { bold: true, color: COLORS.white }));
    subs.forEach((l, i) => this.doc.text(l, M, A4.h - 52 - lines.length * 22 + 4 - i * 14, 10, { color: [220, 232, 226] }));
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
    this.ensure(64);   // room for the heading and two lines under it: a heading never stays alone at the foot of a page
    this.y -= 10;
    this.para(t.toUpperCase(), 9, { bold: true, color: this.color, gap: 3 });
    this.doc.line(M, this.y + 2, A4.w - M, this.y + 2, COLORS.line);
    this.y -= 4;
  }

  // "Label : value" lines in two columns of text; a value stays whole on a page, one taller than a page goes on to the next
  fields(rows: [string, string][], labelW = 150) {
    rows.forEach(([k, v]) => {
      const lines = wrap(v || '—', WIDTH - labelW, 10.5), tall = lines.length * 14 + 2 > PAGE_H;
      this.ensure(tall ? 16 : lines.length * 14 + 2);
      this.doc.text(k, M, this.y - 11, 9.5, { color: COLORS.gray });
      lines.forEach((l, i) => {
        if (tall && i) this.ensure(14);
        this.doc.text(l, M + labelW, this.y - 11, 10.5, { color: COLORS.dark });
        this.y -= 14;
      });
      this.y -= 3;
    });
  }

  // Table with a header row; widths in share of the page width; rows grow with their text. A row stays whole on a page; one taller than a page goes on to the next, and the header never
  // stays alone at the foot of a page
  table(headers: string[], rows: string[][], widths: number[], o: { size?: number; highlight?: (row: number) => Rgb | null } = {}) {
    const size = o.size ?? 9, lh = size * 1.3;
    const ws = widths.map(w => w * WIDTH);
    const xs = ws.map((_, i) => M + ws.slice(0, i).reduce((a, b) => a + b, 0));
    const hl = headers.map((h, i) => wrap(h, ws[i] - 8, 8.5, true)), hh = Math.max(...hl.map(l => l.length)) * 11 + 6;
    const empty = Math.floor((PAGE_H - 24 - hh - 6) / lh);   // lines of a row on an empty page (the line "(suite)" taken off)
    const cellsOf = rows.map(r => r.map((c, i) => wrap(c || '', ws[i] - 8, size)));
    const count = (cs: string[][]) => Math.max(...cs.map(l => l.length));
    const drawHeader = () => {
      this.doc.rect(M, this.y - hh, WIDTH, hh, COLORS.pale);
      hl.forEach((ls, i) => ls.forEach((l, j) => this.doc.text(l, xs[i] + 4, this.y - 11 - j * 11, 8.5, { bold: true, color: COLORS.gray })));
      this.y -= hh;
    };
    const n0 = cellsOf.length ? count(cellsOf[0]) : 1;
    this.ensure(hh + (n0 <= empty ? n0 : 1) * lh + 6);
    drawHeader();
    cellsOf.forEach((cells, ri) => {
      const n = count(cells), fill = o.highlight?.(ri);
      for (let from = 0; from < n;) {
        const room = Math.floor((this.y - BOTTOM - 6) / lh), left = n - from;
        if (room < left && (left <= empty || room < 1)) { this.next(); drawHeader(); continue; }
        const k = Math.min(left, room), h = k * lh + 6;
        if (fill) this.doc.rect(M, this.y - h, WIDTH, h, fill);
        cells.forEach((ls, i) => ls.slice(from, from + k).forEach((l, j) => this.doc.text(l, xs[i] + 4, this.y - size - 2 - j * lh, size, { color: COLORS.dark })));
        this.y -= h;
        this.doc.line(M, this.y, A4.w - M, this.y, COLORS.line);
        from += k;
      }
    });
    this.y -= 6;
  }

  // Boxes to sign by hand: title, name and date lines, blank space (`cols` boxes to a row; the boxes of a row have the same height, a long title or name takes more lines and is cut with "…").
  // `label`: what precedes the name ("Nom" when absent, nothing when it is ''). `compact`: the title and the drawing only, when the text around already says who and when
  signatures(boxes: { title: string; name?: string; label?: string; date?: string; strokes?: Strokes }[], cols = boxes.length, compact = false) {
    const gap = 12, w = (WIDTH - gap * (cols - 1)) / cols;
    for (let at = 0; at < boxes.length; at += cols) {
      const row = boxes.slice(at, at + cols);
      const heads = row.map(b => ({ t: wrapMax(b.title, w - 12, 9, true, 2), n: wrapMax(b.label === '' ? b.name || '' : `${b.label ?? 'Nom'} : ${b.name || ''}`, w - 12, 9, false, 3), d: wrapMax(`Date : ${b.date || ''}`, w - 12, 9)[0] }));
      const tl = Math.max(...heads.map(x => x.t.length)), nl = Math.max(...heads.map(x => x.n.length));
      const dateY = 13 + (tl - 1) * 12 + 15 + (nl - 1) * 12 + 13;   // from the top of the box: the date line, then "Signature :", then room for the drawing
      const oy0 = compact ? 13 + (tl - 1) * 12 + 8 : dateY + 11, h = oy0 + 36 + 8;
      this.ensure(h + 16);
      this.y -= 8;
      row.forEach((b, i) => {
        const x = M + i * (w + gap);
        this.doc.line(x, this.y, x + w, this.y, COLORS.line);
        this.doc.line(x, this.y - h, x + w, this.y - h, COLORS.line);
        this.doc.line(x, this.y, x, this.y - h, COLORS.line);
        this.doc.line(x + w, this.y, x + w, this.y - h, COLORS.line);
        heads[i].t.forEach((l, j) => this.doc.text(l, x + 6, this.y - 13 - j * 12, 9, { bold: true, color: this.color }));
        if (!compact) {
          heads[i].n.forEach((l, j) => this.doc.text(l, x + 6, this.y - 13 - (tl - 1) * 12 - 15 - j * 12, 9, { color: COLORS.dark }));
          this.doc.text(heads[i].d, x + 6, this.y - dateY, 9, { color: COLORS.dark });
          this.doc.text('Signature :', x + 6, this.y - dateY - 13, 9, { color: COLORS.gray });
        }
        // signature drawn on the tablet: 300 x 100 box scaled into the lower part of the frame
        const left = compact ? 10 : 60, k = Math.min((w - left - 10) / 300, 36 / 100), ox = x + left, oy = this.y - oy0;
        (b.strokes || []).forEach(s => s.forEach(([px, py], j) => { if (j) this.doc.line(ox + s[j - 1][0] * k, oy - s[j - 1][1] * k, ox + px * k, oy - py * k, COLORS.dark, 1); }));
      });
      this.y -= h + 8;
    }
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

  // Footer on every page (the date AND the hour of the copy), then the file
  finish(): string {
    const d = this.meta.date, left = `${this.meta.title}${this.meta.company ? ` · ${this.meta.company}` : ''} · édité le ${d.toLocaleDateString('fr-FR')} à ${d.getHours()}\u00a0h\u00a0${String(d.getMinutes()).padStart(2, '0')}`;
    this.doc.pages.forEach((_, i) => {
      this.doc.setPage(i);
      const right = `page ${i + 1} sur ${this.doc.pages.length}`;
      this.doc.text(wrapMax(left, WIDTH - textWidth(right, 8) - 12, 8)[0], M, M - 8, 8, { color: COLORS.gray });
      this.doc.text(right, A4.w - M - textWidth(right, 8), M - 8, 8, { color: COLORS.gray });
    });
    return this.doc.toString(this.meta.title);
  }
}
