// Printed document of tool 3.3: the routine sheet of a piece of equipment, to tick on paper where nobody carries a phone (the screen routine and the QR poster are the usual way).
import type { Equipment, Spare } from './types';
import { COLORS, DocWriter } from './docPdf';
import { leadLabel } from './maintenanceSpares';

interface Opts { company: string; date: Date }

export function routinePdf(e: Equipment, spares: Spare[], o: Opts): string {
  const w = new DocWriter({ company: o.company, title: `Routine · ${e.name}`, date: o.date });
  w.band('Routine sensorielle · 10 minutes', e.name, [e.location, e.operator && `titulaire : ${e.operator}`, e.deputy && `suppléant : ${e.deputy}`, e.manager && `responsable : ${e.manager}`].filter(Boolean).join(' · '));
  w.para('À chaque routine : regarder, écouter, sentir, vérifier les niveaux. Une anomalie s\'écrit tout de suite, avant la casse.', 10, { color: COLORS.gray });
  w.heading('Points à contrôler');
  w.table(['Point', 'Bon fonctionnement', 'S1', 'S2', 'S3', 'S4', 'Anomalie, action'], e.checkpoints.map(c => [c.label, [c.criterion, c.min != null || c.max != null ? `(${c.min ?? ''} à ${c.max ?? ''} ${c.unit || ''})` : ''].filter(Boolean).join(' '), '', '', '', '', '']), [0.24, 0.26, 0.06, 0.06, 0.06, 0.06, 0.26], { size: 9.5 });
  if (spares.length) {
    w.heading('Armoire de survie : pièces d\'usure sous clé');
    w.table(['Pièce', 'Référence, fournisseur', 'Délai', 'Stock mini', 'Stock réel', 'Visa'], spares.map(p => [p.name, [p.ref, p.supplier].filter(Boolean).join(' · '), leadLabel(p), String(p.min), '', '']), [0.26, 0.28, 0.12, 0.11, 0.11, 0.12], { size: 9.5 });
    w.para('Dès qu\'une pièce est sortie de l\'armoire, la commande de remplacement part le jour même.', 9.5, { color: COLORS.gray });
  }
  return w.finish();
}
