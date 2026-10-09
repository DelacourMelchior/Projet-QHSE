// Printed document of tool 3.1: the claim sent to a supplier (debit note). The routine sheet of tool 3.3 is in maintenancePdf.ts, the acceptance report
// (PV) of tool 3.4 in receptionsPdf.ts.
import type { Debit, State } from './types';
import { COLORS, DocWriter } from './docPdf';
import { categoryLabel, CLAIM_DAYS, claimContact, claimMotifLabel, claimSupplierName, debitAmount, SEVERITY, severityOf } from './suppliers';
import { frDate } from './periods';
import { formatValue } from './numbers';

interface Opts { company: string; date: Date; coords?: string }

export function debitPdf(s: State, d: Debit, o: Opts): string {
  const sup = s.suppliers[d.supplierId];
  const w = new DocWriter({ company: o.company, title: `Fiche de débit ${d.ref}`, date: o.date }, COLORS.red);
  w.band('Réclamation fournisseur et demande d\'avoir', `${d.ref} · ${claimSupplierName(s, d)}`, sup ? categoryLabel(sup.category) : '');
  const co = s.params.company;
  const ct = claimContact(s, d);
  w.fields([
    ['Émetteur', [o.company, co?.address, co?.siret && `SIRET ${co.siret}`, co?.phone, co?.email].filter(Boolean).join(' · ')],
    ['Destinataire', [claimSupplierName(s, d), ct ? `${ct.name}, ${ct.phone}${ct.email ? `, ${ct.email}` : ''}` : sup?.contact].filter(Boolean).join(' · ')],
    ['Reçu ou constaté le', frDate(d.date)], ['Commande', d.orderRef || ''], ['Bon de livraison ou référence', d.bl], ['Réserve écrite à la réception', d.reserveOnBl ? 'Oui' : 'Non'],
    ['Défaut constaté', d.defect], ['Motif', claimMotifLabel(s.params, d)], ['Gravité', SEVERITY[severityOf(d)].label], ['Lot ou quantité', d.lot || ''], ['Photos', d.photo ? 'jointes à l\'envoi' : ''],
  ]);
  w.heading('Préjudice chiffré');
  w.table(['Poste', 'Détail', 'Montant HT'], [
    ['Heures perdues à reprendre ou à corriger', d.reworkHours ? `${formatValue(d.reworkHours, '')} h à ${formatValue(s.params.hourlyRate, '€')}` : '', formatValue((d.reworkHours || 0) * s.params.hourlyRate, '€')],
    ['Autres coûts : pièces, déplacement, remplacement', '', formatValue(d.otherCost || 0, '€')],
    ['Total demandé', '', formatValue(debitAmount(d, s.params), '€')],
  ], [0.34, 0.4, 0.26], { size: 10, highlight: i => (i === 2 ? [254, 242, 242] : null) });
  w.callout(`Nous vous demandons un avoir de ${formatValue(debitAmount(d, s.params), '€')} HT, ou la reprise à vos frais des pièces concernées. Merci de nous répondre sous ${CLAIM_DAYS * 24} heures.`, [254, 242, 242], COLORS.red);
  w.signatures([{ title: `Pour ${o.company || "l'entreprise"}` }, { title: `Pour ${claimSupplierName(s, d)}` }]);
  return w.finish();
}
