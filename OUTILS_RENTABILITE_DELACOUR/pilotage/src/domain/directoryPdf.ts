// Pocket card of the directory (1.3): 4 identical A6 cards on one A4 page, to cut out, plasticize and keep in the wallet,
// the van or next to the phone. The vital numbers, the site address and how the emergency services get in.
import { A4, PdfDoc, textWidth, wrap, type Rgb } from './pdf';
import type { Contact } from './types';
import { contactLabel } from './contacts';

const RED: Rgb = [185, 28, 28], DARK: Rgb = [15, 23, 42], GRAY: Rgb = [71, 85, 105], LINE: Rgb = [203, 213, 225], WHITE: Rgb = [255, 255, 255];

export function pocketCardPdf(list: Contact[], o: { company: string; address: string; access: string; date: Date }): string {
  const doc = new PdfDoc();
  doc.addPage();
  const W = A4.w / 2, H = A4.h / 2, P = 16;
  doc.line(W, 0, W, A4.h, LINE, 0.4);
  doc.line(0, H, A4.w, H, LINE, 0.4);
  [[0, H], [W, H], [0, 0], [W, 0]].forEach(([x0, y0]) => {
    let y = y0 + H - P;
    doc.rect(x0 + P, y - 30, W - 2 * P, 30, RED);
    doc.text('NUMÉROS VITAUX', x0 + P + 8, y - 12, 8, { bold: true, color: [254, 202, 202] });
    doc.text(wrap(o.company || 'Annuaire de crise', W - 2 * P - 16, 11, true)[0], x0 + P + 8, y - 25, 11, { bold: true, color: WHITE });
    y -= 42;
    const site = [o.address, o.access].filter(Boolean);
    site.forEach(t => wrap(t, W - 2 * P, 7.5).slice(0, 2).forEach(l => { doc.text(l, x0 + P, y, 7.5, { color: GRAY }); y -= 9.5; }));
    if (site.length) y -= 3;
    const rowH = Math.min(24, (y - y0 - P - 12) / Math.max(1, list.length));
    list.forEach(c => {
      const phoneW = textWidth(c.phone, 11, true);
      doc.text(c.phone, x0 + W - P - phoneW, y - 9, 11, { bold: true, color: DARK });
      doc.text(wrap(contactLabel(c), W - 2 * P - phoneW - 8, 8.5, true)[0], x0 + P, y - 8, 8.5, { bold: true, color: DARK });
      const sub = [c.always ? '24 h/24' : c.hours, c.reference && `donner : ${c.reference}`].filter(Boolean).join(' · ');
      if (sub && rowH >= 18) doc.text(wrap(sub, W - 2 * P - phoneW - 8, 7)[0], x0 + P, y - 16, 7, { color: GRAY });
      doc.line(x0 + P, y - rowH + 2, x0 + W - P, y - rowH + 2, LINE, 0.3);
      y -= rowH;
    });
    doc.text(`Mis à jour le ${o.date.toLocaleDateString('fr-FR')}`, x0 + P, y0 + P, 7, { color: GRAY });
  });
  return doc.toString(`Carte de poche ${o.company}`.trim());
}
