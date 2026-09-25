// Reflex cards (PDF), one per page, to print: the day of an IT outage the application may be out of reach.
// Pure: the same data gives the same file.
import type { Contact, Risk, State } from './types';
import { A4, PdfDoc, textWidth, wrap, type Rgb } from './pdf';
import { score, zoneOf, ZONE_LABEL } from './risk';
import { familyLabel } from './riskTemplates';
import { contactLabel } from './contacts';
import { formatDuration } from './duration';

const M = 42;
const WIDTH = A4.w - 2 * M;
const BOTTOM = M + 24;
const RED: Rgb = [185, 28, 28], DARK: Rgb = [15, 23, 42], GRAY: Rgb = [71, 85, 105], PALE: Rgb = [254, 242, 242], WHITE: Rgb = [255, 255, 255];

interface Opts { company: string; by: string; date: Date }

// Cards in order of criticality, not rated last
const cardsOrder = (s: State) => Object.values(s.risks).sort((a, b) => (score(b) ?? -1) - (score(a) ?? -1) || a.title.localeCompare(b.title));
export const sentence = (t: string) => (/[.!?…]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
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
    this.doc.text(wrap(contactLabel(c), WIDTH - phoneW - 16, 11, true)[0], M, this.y, 11, { bold: true });
    const sub = [c.role, c.always ? 'joignable 24 h/24' : '', c.email].filter(Boolean).join(' · ');
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
  if (r.maxOutage) w.para(`Arrêt tolérable : ${formatDuration(r.maxOutage)}`, 10, { color: GRAY, gap: 0 });
  const steps = r.steps.filter(x => x.what.trim());
  const who = (ids: string[]) => ids.map(id => s.contacts[id]).filter(Boolean);

  if (!r.planB.trim() && !steps.length) {
    const call = `Pas de Plan B prévu. Appelez ${noDot(r.owner) || 'le dirigeant'}${r.deputy ? `, ou ${noDot(r.deputy)}` : ''}.`;
    w.ensure(40);
    w.y -= 12;
    w.doc.rect(M, w.y - 26, WIDTH, 30, PALE);
    w.doc.text(call, M + 10, w.y - 15, 12, { bold: true, color: RED });
    w.y -= 34;
  } else {
    if (r.planB.trim()) {
      w.heading(`Plan B${r.family ? ` · ${familyLabel(r.family)}` : ''}`);
      w.para(sentence(r.planB) + (r.relay ? ` Relais : ${r.relay}.` : ''), 11.5);
    }
    if (r.signal || r.trigger) {
      w.heading('1. Déclencher');
      if (r.signal) w.para(`Signal : ${r.signal}`);
      if (r.trigger) w.para(`Décide du déclenchement : ${r.trigger}`, 11, { bold: true });
    }
    w.heading(`2. Dérouler${r.activation ? ` · Plan B opérationnel en ${formatDuration(r.activation)}` : ''}`);
    if (!steps.length) w.para('Étapes à écrire dans la fiche du risque.', 11, { color: GRAY });
    steps.forEach((x, i) => {
      w.ensure(18);
      const top = w.y;
      w.para(`${x.when ? `${x.when} : ` : ''}${x.what}${x.who ? ` (${x.who})` : ''}`, 12, { x: M + 20, gap: 3 });
      w.doc.text(`${i + 1}.`, M, top - 12 * 1.35 + 12 * 0.3, 12, { bold: true, color: RED });
    });
    if (r.holdFor || r.sacrifice) {
      w.heading('3. Tenir');
      if (r.holdFor) w.para(`Le Plan B tient ${formatDuration(r.holdFor)} au maximum.`);
      if (r.sacrifice) w.para(`On laisse tomber d'abord : ${r.sacrifice}`);
    }
  }
  if (r.contactIds.length || r.notifyIds.length || r.clientMessage) {
    w.heading('4. Prévenir');
    if (r.contactIds.length) { w.para('Qui appeler', 10, { bold: true, gap: 0 }); who(r.contactIds).forEach(c => w.contact(c)); }
    if (r.notifyIds.length) { w.para('Qui informer', 10, { bold: true, gap: 0 }); who(r.notifyIds).forEach(c => w.contact(c)); }
    if (r.clientMessage) w.para(`Message aux clients : « ${r.clientMessage} »`, 10.5, { color: GRAY });
  }
  if (r.access) { w.heading('5. Accès'); w.para(r.access); }
  if (r.recovery) { w.heading('6. Revenir à la normale'); w.para(r.recovery); }
}

function footers(doc: PdfDoc, o: Opts) {
  const left = `Fiches réflexes${o.company ? ` · ${o.company}` : ''} · éditées le ${o.date.toLocaleDateString('fr-FR')}`;
  doc.pages.forEach((_, i) => {
    doc.setPage(i);
    const right = `page ${i + 1} / ${doc.pages.length}`;
    doc.text(left, M, M - 8, 8, { color: GRAY });
    doc.text(right, A4.w - M - textWidth(right, 8), M - 8, 8, { color: GRAY });
  });
}

function cards(s: State, risks: Risk[], o: Opts) {
  const doc = new PdfDoc();
  let current = '';
  const w = new Writer(doc, () => w.para(`Fiche réflexe (suite) · ${current}`, 9, { bold: true, color: RED, gap: 8 }));
  risks.forEach(r => { current = r.title; drawCard(w, s, r, o); });
  return { doc };
}

// Every card, in order of criticality (not rated last)
export function reflexCardsPdf(s: State, o: Opts): string {
  const { doc } = cards(s, cardsOrder(s), o);
  footers(doc, o);
  return doc.toString('Fiches réflexes');
}

// One reflex card
export function cardPdf(s: State, r: Risk, o: Opts): string {
  const { doc } = cards(s, [r], o);
  footers(doc, o);
  return doc.toString(`Fiche réflexe : ${r.title}`);
}
