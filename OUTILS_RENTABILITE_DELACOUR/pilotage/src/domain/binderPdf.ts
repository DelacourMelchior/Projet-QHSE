// Crisis binder (PDF): cover with the emergency numbers and the table of contents, then one reflex card per risk.
// Also used alone for one card. Pure: the same data gives the same file.
import type { Contact, Risk, State } from './types';
import { A4, PdfDoc, textWidth, wrap, type Rgb } from './pdf';
import { score, zoneOf, ZONE_LABEL } from './risk';
import { familyLabel } from './riskTemplates';
import { formatDuration } from './duration';

const M = 42;
const WIDTH = A4.w - 2 * M;
const BOTTOM = M + 24;
const RED: Rgb = [185, 28, 28], DARK: Rgb = [15, 23, 42], GRAY: Rgb = [71, 85, 105], PALE: Rgb = [254, 242, 242], WHITE: Rgb = [255, 255, 255], RULE: Rgb = [226, 232, 240];
const ZONE_RGB = { high: [220, 38, 38], medium: [245, 158, 11], low: [5, 150, 105] } as Record<string, Rgb>;

interface Opts { company: string; by: string; date: Date }

// Cards in order of criticality, not rated last
const cardsOrder = (s: State) => Object.values(s.risks).sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1) || a.title.localeCompare(b.title));
const lines = (t: string) => t.split('\n').map(x => x.trim()).filter(Boolean);
export const noDot = (t: string) => t.trim().replace(/\.+$/, '');   // "Antoine P." at the end of a sentence

class Writer {
  y = 0;
  constructor(public doc: PdfDoc, private continued: () => void) {}
  page() { this.doc.addPage(); this.y = A4.h - M; }
  ensure(h: number) { if (this.y - h < BOTTOM) { this.page(); this.continued(); } }
  para(t: string, size = 11, o: { bold?: boolean; color?: Rgb; x?: number; width?: number; gap?: number } = {}) {
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
    this.para(t.toUpperCase(), 9, { bold: true, color: RED, gap: 2 });
  }
  contact(c: Contact) {
    this.ensure(34);
    this.y -= 14;
    const phoneW = textWidth(c.phone, 12.5, true);
    this.doc.text(c.phone, A4.w - M - phoneW, this.y, 12.5, { bold: true, color: DARK });
    this.doc.text(wrap([c.company, c.name].filter(Boolean).join(' · '), WIDTH - phoneW - 16, 11, true)[0], M, this.y, 11, { bold: true });
    const sub = [c.role, c.always ? 'joignable 24 h/24' : ''].filter(Boolean).join(' · ');
    if (sub) { this.y -= 12; this.doc.text(wrap(sub, WIDTH - phoneW - 16, 9)[0], M, this.y, 9, { color: GRAY }); }
    this.y -= 5;
  }
}

function drawCard(w: Writer, s: State, r: Risk, o: Opts) {
  w.page();
  const title = wrap(r.title || 'Risque sans titre', WIDTH, 20, true).slice(0, 3);
  const band = 44 + title.length * 24;
  w.doc.rect(0, A4.h - band, A4.w, band, RED);
  w.doc.text(`FICHE RÉFLEXE${o.company ? ` · ${o.company.toUpperCase()}` : ''}`, M, A4.h - 30, 9, { bold: true, color: [254, 202, 202] });
  title.forEach((l, i) => w.doc.text(l, M, A4.h - 56 - i * 24, 20, { bold: true, color: WHITE }));
  w.y = A4.h - band - 6;

  const sc = score(r);
  w.para([sc === null ? 'Criticité : à coter' : `Criticité ${sc} / 16 (${ZONE_LABEL[zoneOf(sc)].toLowerCase()})`,
    `Responsable : ${r.owner || 'à désigner'}`, r.deputy && `Suppléant : ${r.deputy}`].filter(Boolean).join('   ·   '), 10, { color: GRAY, gap: 0 });
  const delays = [r.maxOutage && `Arrêt tolérable : ${formatDuration(r.maxOutage)}`, r.activation && `Activation du Plan B : ${formatDuration(r.activation)}`].filter(Boolean).join('   ·   ');
  if (delays) w.para(delays, 10, { color: GRAY, gap: 0 });
  if (r.signal) { w.heading('Signal'); w.para(r.signal); }

  if (!r.planB.trim()) {
    const who = `Pas de Plan B prévu. Appelez ${noDot(r.owner) || 'le dirigeant'}${r.deputy ? `, ou ${noDot(r.deputy)}` : ''}.`;
    w.ensure(40);
    w.y -= 12;
    w.doc.rect(M, w.y - 26, WIDTH, 30, PALE);
    w.doc.text(who, M + 10, w.y - 15, 12, { bold: true, color: RED });
    w.y -= 34;
  } else {
    w.heading('Première heure');
    const steps = lines(r.firstHour);
    if (!steps.length) w.para('Gestes à écrire dans la fiche du risque.', 11, { color: GRAY });
    steps.forEach((t, i) => {
      w.ensure(18);
      const top = w.y;
      w.para(t, 12, { x: M + 20, gap: 3 });
      w.doc.text(`${i + 1}.`, M, top - 12 * 1.35 + 12 * 0.3, 12, { bold: true, color: RED });
    });
    w.heading(`Plan B${r.family ? ` · ${familyLabel(r.family)}` : ''}`);
    w.para(r.planB, 11.5);
    if (r.relay) w.para(`Relais : ${r.relay}`, 10, { color: GRAY });
  }
  const who = (ids: string[]) => ids.map(id => s.contacts[id]).filter(Boolean);
  if (r.contactIds.length) { w.heading('Qui appeler'); who(r.contactIds).forEach(c => w.contact(c)); }
  if (r.notifyIds.length) { w.heading('Qui prévenir'); who(r.notifyIds).forEach(c => w.contact(c)); }
  if (r.access) { w.heading('Clés, codes, documents'); w.para(r.access); }
  if (r.sacrifice) { w.heading("On laisse tomber d'abord"); w.para(r.sacrifice); }
}

function drawCover(w: Writer, s: State, o: Opts, pageOf: Map<string, number>) {
  w.page();
  w.y -= 10;
  w.para('Classeur de crise', 26, { bold: true, color: RED, gap: 2 });
  if (o.company) w.para(o.company, 14, { bold: true, gap: 2 });
  w.para(`Édité le ${o.date.toLocaleDateString('fr-FR')}${o.by ? ` par ${o.by}` : ''}. Réimprimez-le après chaque modification ou chaque test.`, 10, { color: GRAY, gap: 12 });

  const steps = ['Trouvez la fiche du risque dans le sommaire.', 'Appliquez les gestes de la première heure.', 'Appelez les numéros de la fiche, puis prévenez les clients indiqués.'];
  const boxTop = w.y;
  w.y -= 8;
  w.para('EN CAS DE CRISE', 9, { bold: true, color: RED, x: M + 12, gap: 2 });
  steps.forEach((t, i) => w.para(`${i + 1}. ${t}`, 11, { x: M + 12, gap: 1 }));
  w.y -= 8;
  w.doc.rect(M, w.y, 3, boxTop - w.y, RED);

  const contacts = Object.values(s.contacts).sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
  if (contacts.length) { w.heading("Numéros d'urgence"); contacts.forEach(c => w.contact(c)); }

  w.heading('Sommaire');
  cardsOrder(s).forEach(r => {
    w.ensure(20);
    w.y -= 17;
    const sc = score(r);
    w.doc.rect(M, w.y - 3, 16, 14, sc === null ? [148, 163, 184] : ZONE_RGB[zoneOf(sc)]);
    const label = sc === null ? '?' : String(sc);
    w.doc.text(label, M + 8 - textWidth(label, 8, true) / 2, w.y + 1, 8, { bold: true, color: WHITE });
    const page = `page ${pageOf.get(r.id) ?? ''}`;
    w.doc.text(wrap(r.title, WIDTH - 90, 11)[0], M + 24, w.y, 11);
    w.doc.text(page, A4.w - M - textWidth(page, 10), w.y, 10, { color: GRAY });
    w.doc.line(M + 24, w.y - 5, A4.w - M, w.y - 5, RULE);
  });
}

function footers(doc: PdfDoc, o: Opts) {
  const left = `Classeur de crise${o.company ? ` · ${o.company}` : ''} · édité le ${o.date.toLocaleDateString('fr-FR')}`;
  doc.pages.forEach((_, i) => {
    doc.setPage(i);
    const right = `page ${i + 1} / ${doc.pages.length}`;
    doc.text(left, M, M - 8, 8, { color: GRAY });
    doc.text(right, A4.w - M - textWidth(right, 8), M - 8, 8, { color: GRAY });
  });
}

function cards(s: State, risks: Risk[], o: Opts) {
  const doc = new PdfDoc();
  const start = new Map<string, number>();
  let current = '';
  const w = new Writer(doc, () => w.para(`Fiche réflexe (suite) · ${current}`, 9, { bold: true, color: RED, gap: 8 }));
  risks.forEach(r => { current = r.title; start.set(r.id, doc.pages.length); drawCard(w, s, r, o); });
  return { doc, start };
}

// The whole binder
export function binderPdf(s: State, o: Opts): string {
  const { doc: body, start } = cards(s, cardsOrder(s), o);
  let coverPages = 1;
  let cover = new PdfDoc();
  for (let pass = 0; pass < 3; pass++) {
    cover = new PdfDoc();
    const pageOf = new Map([...start].map(([id, p]) => [id, coverPages + p + 1]));
    const w = new Writer(cover, () => undefined);
    drawCover(w, s, o, pageOf);
    if (cover.pages.length === coverPages) break;
    coverPages = cover.pages.length;
  }
  const doc = new PdfDoc();
  doc.pages = [...cover.pages, ...body.pages];
  footers(doc, o);
  return doc.toString('Classeur de crise');
}

// One reflex card
export function cardPdf(s: State, r: Risk, o: Opts): string {
  const { doc } = cards(s, [r], o);
  footers(doc, o);
  return doc.toString(`Fiche réflexe : ${r.title}`);
}
