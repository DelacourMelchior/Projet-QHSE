// Printed documents of tools 5.1, 5.3 and 5.4: red-bin labels (two per A4 page, to cut), workshop sheet, device sheet with the day-30 check.
import type { Analysis, Nc, Poka, State } from './types';
import { A4, PdfDoc, wrap, type Rgb } from './pdf';
import { COLORS, DocWriter, M, WIDTH } from './docPdf';
import { causeLabel, checkDate, DECISIONS, levelLabel, ncCost, POKA_LEVELS, actionsOfAnalysis } from './quality';
import { frStamp, processLabel } from './base';
import { frDate } from './periods';
import { formatValue } from './numbers';

interface Opts { company: string; date: Date }
const RED: Rgb = [185, 28, 28];

function box(doc: PdfDoc, x: number, y: number, w: number, h: number, color: Rgb, width = 1) {
  doc.line(x, y, x + w, y, color, width); doc.line(x, y - h, x + w, y - h, color, width);
  doc.line(x, y, x, y - h, color, width); doc.line(x + w, y, x + w, y - h, color, width);
}

// Label of the red bin: what, how many, since when, who decides within 24 h
function label(doc: PdfDoc, n: Nc, top: number, o: Opts) {
  const h = A4.h / 2 - 2 * M + 10;
  box(doc, M, top, WIDTH, h, RED, 3);
  doc.rect(M, top - 40, WIDTH, 40, RED);
  doc.text(`QUARANTAINE · NE PAS UTILISER${o.company ? ` · ${o.company.toUpperCase()}` : ''}`, M + 12, top - 16, 9, { bold: true, color: [254, 202, 202] });
  doc.text(n.ref, M + 12, top - 33, 15, { bold: true, color: COLORS.white });
  let y = top - 58;
  const line = (k: string, v: string, size = 11) => {
    doc.text(k, M + 12, y, 9, { color: COLORS.gray });
    wrap(v || '', WIDTH - 140, size).slice(0, 2).forEach((l, i) => doc.text(l, M + 120, y - i * (size + 3), size, { bold: true, color: COLORS.dark }));
    y -= 19 + (wrap(v || '', WIDTH - 140, size).length > 1 ? size + 3 : 0);
  };
  line('Isolé le', frStamp(n.at));
  line('Pièce, affaire', n.item);
  line('Quantité', n.qty === null ? '' : String(n.qty));
  line('Poste, machine', n.where);
  line('Défaut constaté', n.description);
  line('Déclaré par', n.by);
  y -= 2;
  doc.text('DÉCISION SOUS 24 H', M + 12, y, 9, { bold: true, color: RED });
  y -= 16;
  DECISIONS.forEach((d, i) => {
    const x = M + 12 + i * ((WIDTH - 24) / 4);
    box(doc, x, y + 9, 10, 10, COLORS.dark);
    if (n.decision === d.key) doc.rect(x + 2, y + 7 - 6, 6, 6, COLORS.dark);
    doc.text(d.label, x + 15, y, 10, { bold: true });
    doc.text(`Visa : ${d.visa.toLowerCase()}`, x + 15, y - 12, 8, { color: COLORS.gray });
  });
}

// Labels for the given records, two per page
export function labelsPdf(ncs: Nc[], o: Opts): string {
  const doc = new PdfDoc();
  ncs.forEach((n, i) => {
    if (i % 2 === 0) doc.addPage();
    label(doc, n, i % 2 === 0 ? A4.h - M : A4.h / 2 - 10, o);
  });
  if (!ncs.length) doc.addPage();
  return doc.toString('Étiquettes bac rouge');
}

// Workshop sheet: the problem, the chain of whys, the root cause and the countermeasures
export function analysisPdf(s: State, a: Analysis, o: Opts): string {
  const w = new DocWriter({ company: o.company, title: `Atelier 5 Pourquoi ${a.ref}`, date: o.date });
  w.band('Atelier 5 Pourquoi · sans recherche de coupable', a.problem || 'Problème à décrire', `${a.ref} · ${frDate(a.date)} · ${processLabel(a.processId)}`);
  w.fields([['Participants', a.participants], ['Pilote', a.pilot]]);
  w.heading('Enchaînement des causes');
  const whys = a.whys.filter(x => x.trim());
  w.table(['', 'Réponse vérifiée sur place'], [['Constat', a.problem], ...whys.map((x, i) => [`Pourquoi ${i + 1}`, x])], [0.18, 0.82], { size: 10 });
  w.callout(`Cause racine : ${a.rootCause || 'à trouver'}`, [254, 242, 242], RED);
  w.para(a.backCheck ? 'Test à rebours fait : « puisque la cause racine, donc… donc le problème » tient.' : 'Test à rebours à faire : relire de la cause racine vers le problème avec « donc ».', 9.5, { color: COLORS.gray });
  const acts = actionsOfAnalysis(s, a.id);
  w.heading('Contre-mesures');
  if (!acts.length) w.para('Aucune contre-mesure décidée.', 10, { color: COLORS.gray });
  else w.table(['Action', 'Pilote', 'Échéance'], acts.flatMap(x => x.plan.map(p => [p.text, p.pilot || x.pilot, frDate(x.deadline)])), [0.62, 0.2, 0.18]);
  return w.finish();
}

// Device sheet: what it blocks, how, and the field check at day 30, with the two signatures
export function pokaPdf(s: State, p: Poka, o: Opts): string {
  const w = new DocWriter({ company: o.company, title: 'Fiche détrompeur', date: o.date });
  const an = p.analysisId ? s.analyses[p.analysisId] : null;
  w.band('Détrompeur et contrôle à J+30', p.defect || 'Défaut à éliminer', `${processLabel(p.processId)}${p.poste ? ` · poste ${p.poste}` : ''}`);
  w.heading('Le dispositif');
  w.fields([
    ['Niveau', `${levelLabel(p.level)} (${POKA_LEVELS.find(x => x.key === p.level)!.text})`],
    ['Description', p.description], ['Comment il bloque', p.howItBlocks],
    ['Coût', p.cost === null ? '' : formatValue(p.cost, '€')], ['Responsable', p.owner],
    ['Mis en service le', frDate(p.installedAt)], ['Opérateurs formés', p.trained ? 'Oui, tous' : 'Non'],
    ['Test de contournement', p.bypassTested ? 'Fait : le dispositif résiste' : 'À faire'],
    ...(an ? [['Atelier 5 Pourquoi', `${an.ref} : ${an.rootCause}`] as [string, string]] : []),
  ]);
  w.heading(`Contrôle sur le terrain à J+30${p.installedAt ? ` (le ${frDate(checkDate(p))})` : ''}`);
  const c = p.check;
  w.table(['Point contrôlé', 'Constat', 'Résultat'], [
    ['Récidive du défaut sur 30 jours', c ? `${c.produced ?? '?'} pièces produites, ${c.defects ?? '?'} défaut(s)` : '', c ? ((c.defects ?? 0) === 0 ? 'Réussi' : 'Récidive') : ''],
    ['Dispositif en place, non contourné', c ? c.note : '', c ? (c.inPlace ? 'Conforme' : 'Non conforme') : ''],
    ['Cadence de travail', '', c ? (c.cadenceOk ? 'Conforme' : 'Ralentie') : ''],
  ], [0.36, 0.44, 0.2], { size: 10 });
  w.signatures([{ title: 'Responsable qualité : efficace et durable', name: c?.by || '', date: c ? frDate(c.date) : '' }, { title: "Chef d'atelier : intégré au standard du poste" }]);
  return w.finish();
}

// cost line of a record, for the lists
export const ncCostText = (s: State, n: Nc) => { const c = ncCost(n, s.params); return c ? formatValue(c, '€') : ''; };
export const ncLine = (n: Nc) => [n.item, n.where, causeLabel(n.cause)].filter(Boolean).join(' · ');
