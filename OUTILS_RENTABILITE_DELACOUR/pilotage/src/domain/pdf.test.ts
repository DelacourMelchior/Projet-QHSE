// The writer shared by every PDF of the application (pdf.ts) and the document blocks on top of it (docPdf.ts): the characters of Latin-1 and what is not, the words longer than
// the line, the blocks taller than a page, the head and the foot of the pages. Whatever the text, the file stays a PDF 1.4 in pure ASCII.
import { describe, expect, it } from 'vitest';
import { A4, LOSSY_NOTE, PdfDoc, textWidth, wrap, wrapMax } from './pdf';
import { DocWriter, M } from './docPdf';

const decode = (h: string) => new TextDecoder('windows-1252').decode(Uint8Array.from((h.match(/../g) ?? []).map(x => parseInt(x, 16))));
const runs = (pdf: string) => [...pdf.matchAll(/\/(F[12]) ([\d.]+) Tf 1 0 0 1 ([\d.-]+) ([\d.-]+) Tm <([0-9a-f]*)> Tj/g)].map(m => ({ bold: m[1] === 'F2', size: +m[2], x: +m[3], y: +m[4], t: decode(m[5]) }));
const pages = (pdf: string) => pdf.split(/\/Type \/Page \/Parent/).slice(1).map(p => runs(p));
const one = (t: string) => { const d = new PdfDoc(); d.addPage(); d.text(t, 42, 700, 10); return d; };
const written = (t: string) => runs(one(t).toString()).map(r => r.t).filter(x => x !== LOSSY_NOTE).join('');
const meta = { company: 'Atelier', title: 'Document', date: new Date(2026, 9, 7, 9, 5) };

describe('pdf.ts: the characters', () => {
  it('draws the closest letters for what Latin-1 lacks, instead of "?" (P-2)', () => {
    expect(written('Ștefan Țurcanu, Responsable Łódź')).toBe('Stefan Turcanu, Responsable Lódz');
    expect(written('Épaisseur ≥ 2 mm, ≤ 5, ⌀ 12, → fin, ′ ″, œ Œ')).toBe("Épaisseur >= 2 mm, <= 5, diam. 12, -> fin, ' \", œ Œ");
    expect(written('Š š Ž ž Ÿ ƒ † ‡ ˆ ‰ ‹ › ˜ ™')).toBe('Š š Ž ž Ÿ ƒ † ‡ ˆ ‰ ‹ › ˜ ™');          // the whole block 0x80-0x9F of Windows-1252
    expect(written('ﬁ ² ① ℃ № ǆ')).toBe('fi ² 1 °C No dz');
    expect(written('Ω µ μ Ø ß')).toBe('ohm µ µ Ø ß');
    expect(written('a\tb​c‮d\u0007e f g h')).toBe('a bcde f g h');       // controls and invisible marks leave no trace, the spaces stay spaces
    expect(written('≮ ☃ 日 😀')).toBe('? ? ? ?');                                                           // nothing near: "?"
  });
  it('measures what it draws (">=" for "≥"), so that the lines break where they should', () => {
    expect(textWidth('≥', 10)).toBe(textWidth('>=', 10));
    expect(textWidth('Ș', 10)).toBe(textWidth('S', 10));
    expect(textWidth('​', 10)).toBe(0);
  });
  it('says at the foot of the page where a character was replaced, and only there', () => {
    const d = new PdfDoc();
    d.addPage(); d.text('Rien de spécial : é à ç œ €', 42, 700, 10);
    d.addPage(); d.text('Ștefan', 42, 700, 10);
    d.addPage(); d.text('a b   \t', 42, 700, 10);
    const [p1, p2, p3] = pages(d.toString());
    expect(p1.map(r => r.t)).not.toContain(LOSSY_NOTE);
    expect(p2.map(r => r.t)).toContain(LOSSY_NOTE);
    expect(p3.map(r => r.t)).not.toContain(LOSSY_NOTE);
    expect(d.toString()).toBe(d.toString());                                                              // writing the file twice does not add the note twice
  });
  it('stays a valid PDF 1.4 in pure ASCII whatever the text, the title included', () => {
    let all = '';
    for (let c = 0; c < 0x3000; c++) if (c < 0xd800 || c > 0xdfff) all += String.fromCodePoint(c);
    all += '😀 ))) ( \\ %PDF endstream <48656c6c6f>';
    const d = new PdfDoc();
    d.addPage();
    for (let i = 0; i < all.length; i += 80) d.text(all.slice(i, i + 80), 42, 700, 10);
    const pdf = d.toString(all.slice(0, 200));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    expect(Number(pdf.match(/startxref\n(\d+)/)![1])).toBe(pdf.indexOf('xref\n0'));
    const len = pdf.match(/<< \/Length (\d+) >>\nstream\n/)!;
    expect(pdf.slice(len.index! + len[0].length).startsWith('BT')).toBe(true);
    expect(pdf.slice(len.index! + len[0].length + Number(len[1]), len.index! + len[0].length + Number(len[1]) + 10)).toBe('\nendstream');
  });
});

describe('pdf.ts: the words longer than the line (P-10, S-16)', () => {
  it('cuts a word where the line ends, loses nothing, and leaves the other words alone', () => {
    const word = 'https://exemple.fr/' + 'a'.repeat(120), lines = wrap(`Adresse : ${word} fin`, 200, 10);
    lines.forEach(l => expect(textWidth(l, 10)).toBeLessThanOrEqual(200));
    expect(lines.join('').replace(/ /g, '')).toBe(`Adresse:${word}fin`);
    expect(wrap('Perte de 12 000 € par jour pendant la panne', 60, 11)).toEqual(wrap('Perte de 12 000 € par jour pendant la panne', 60, 11));
    expect(wrap('un deux trois', 1000, 10)).toEqual(['un deux trois']);
    expect(wrap('un\ndeux', 1000, 10)).toEqual(['un', 'deux']);
    expect(wrap('X'.repeat(30), 1, 10)).toHaveLength(30);                                                  // a width smaller than a letter: one letter a line, no endless loop
    expect(wrap('', 100, 10)).toEqual(['']);
  });
  it('keeps the lines it is allowed and ends the last one with "…"', () => {
    expect(wrapMax('a b c', 100, 10, false, 2)).toEqual(['a b c']);
    const cut = wrapMax('mot '.repeat(100), 100, 10, false, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith('…')).toBe(true);
    expect(textWidth(cut[1], 10)).toBeLessThanOrEqual(100);
  });
});

describe('docPdf.ts: blocks and pages', () => {
  const inside = (pdf: string) => runs(pdf).forEach(r => { expect(r.x + textWidth(r.t, r.size, r.bold), r.t.slice(0, 30)).toBeLessThanOrEqual(A4.w - M + 0.5); expect(r.y, r.t.slice(0, 30)).toBeGreaterThan(15); });
  it('keeps the head within three lines and the sub-title within two, with "…" where it stops', () => {
    const w = new DocWriter(meta);
    w.band('Kicker', 'Un titre très long '.repeat(12), 'Un sous-titre '.repeat(30));
    const pdf = w.finish(), band = runs(pdf).filter(r => r.y > A4.h - 150);
    expect(band.filter(r => r.size === 18)).toHaveLength(3);
    expect(band.filter(r => r.size === 18).at(-1)!.t.endsWith('…')).toBe(true);
    expect(band.filter(r => r.size === 10)).toHaveLength(2);
    expect(band.filter(r => r.size === 10).at(-1)!.t.endsWith('…')).toBe(true);
    inside(pdf);
    const short = new DocWriter(meta);
    short.band('K', 'Titre', 'PV-2026-009 · ' + 'X'.repeat(200));                                           // the first line of the sub-title used to be "PV-2026-009 ·" alone
    expect(runs(short.finish()).filter(r => r.size === 10 && r.y > A4.h - 150)[0].t).toMatch(/^PV-2026-009 · X{20}/);
  });
  it('goes on to the next page with a value taller than a page, without losing a line', () => {
    const w = new DocWriter(meta);
    w.band('K', 'T');
    w.fields([['Court', 'valeur'], ['Livrable', 'mot '.repeat(1500)], ['Après', 'fin']]);
    const pdf = w.finish(), all = pages(pdf);
    expect(all.length).toBeGreaterThan(1);
    inside(pdf);
    expect(runs(pdf).filter(r => r.t.startsWith('mot')).reduce((a, r) => a + r.t.trim().split(' ').length, 0)).toBe(1500);
    expect(all.at(-1)!.map(r => r.t)).toContain('fin');
  });
  it('never leaves the header of a table alone at the foot of a page, and cuts a row taller than a page', () => {
    const w = new DocWriter(meta);
    w.band('K', 'T');
    while (w.y > 120) w.para('ligne', 10);
    w.table(['Colonne un', 'Colonne deux'], [['début ' + 'mot '.repeat(1800), 'b'], ['suivante', 'c']], [0.7, 0.3]);
    const pdf = w.finish(), all = pages(pdf);
    expect(all.length).toBeGreaterThan(2);
    all.forEach((p, i) => { if (p.some(r => r.t === 'Colonne un')) expect(p.some(r => r.t.startsWith('début')) || i > 0, `page ${i + 1}`).toBe(true); });
    const first = all.findIndex(p => p.some(r => r.t === 'Colonne un'));
    expect(all[first].some(r => r.t.startsWith('début'))).toBe(true);                                       // the header and the first line of the row are on the same page
    expect(all.slice(first + 1).every(p => p.some(r => r.t === 'Colonne un') || !p.some(r => r.t.startsWith('mot')))).toBe(true);   // the header comes back on the pages of the row
    expect(runs(pdf).filter(r => r.x < 200 && r.t.includes('mot')).reduce((a, r) => a + r.t.trim().split(' ').filter(x => x === 'mot').length, 0)).toBe(1800);
    inside(pdf);
  });
  it('keeps a heading with the lines that follow it', () => {
    const w = new DocWriter(meta);
    w.band('K', 'T');
    while (w.y > 120) w.para('ligne', 10);
    w.heading('Section');
    w.para('premier', 10);
    const all = pages(w.finish());
    all.forEach(p => { if (p.some(r => r.t === 'SECTION')) expect(p.some(r => r.t === 'premier')).toBe(true); });
  });
  it('writes the first line of the page that follows, then a long name or title in a box of signature without leaving it', () => {
    const w = new DocWriter({ ...meta, head: 'PV-1 · CMD-1 · Client' });
    w.band('K', 'T');
    while (w.y > 120) w.para('ligne', 10);
    w.signatures([{ title: 'Pour une entreprise au nom vraiment très long (qui remet)', name: 'Prénom Nom, ' + 'Responsable de la qualité '.repeat(8), date: '07/10/2026 à 9 h 05' }, { title: 'Pour le client', name: 'M. Durand' }]);
    const pdf = w.finish(), all = pages(pdf);
    expect(all.at(-1)![0].t).toBe('PV-1 · CMD-1 · Client (suite)');                                         // the box does not fit under the paragraphs: it starts a page that says whose it is
    inside(pdf);
    expect(runs(pdf).filter(r => r.t.endsWith('…')).length).toBeGreaterThan(0);                              // the name is cut, with a sign
    const compact = new DocWriter(meta);
    compact.band('K', 'T');
    compact.signatures([{ title: 'Signature de levée', strokes: [[[0, 0], [100, 50]]] }], 3, true);
    expect(compact.finish().match(/ RG 1 w /g)).toHaveLength(1);
  });
  it('writes at the foot of every page the date AND the hour of the copy, and "page n sur N" (P-20)', () => {
    const w = new DocWriter(meta);
    w.band('K', 'T');
    for (let i = 0; i < 120; i++) w.para('ligne', 10);
    const pdf = w.finish(), foot = pages(pdf).map(p => p.filter(r => r.y < 40).map(r => r.t));
    expect(foot.length).toBeGreaterThan(1);
    foot.forEach((f, i) => { expect(f).toContain('Document · Atelier · édité le 07/10/2026 à 9 h 05'); expect(f).toContain(`page ${i + 1} sur ${foot.length}`); });
    const long = new DocWriter({ ...meta, title: 'Un titre de document très long '.repeat(8) });
    long.band('K', 'T');
    inside(long.finish());                                                                                  // a long title does not run into the number of the page
  });
});
