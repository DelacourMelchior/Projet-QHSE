// Printed documents of tools 3.1, 3.3 and 3.4: claim sent to a supplier (debit note), weekly routine sheet to post on the machine,
// acceptance report signed on delivery day (95/5 rule).
import type { Debit, Delivery, Equipment, State } from './types';
import { COLORS, DocWriter } from './docPdf';
import { categoryLabel, CLAIM_DAYS, debitAmount, LIFT_DAYS, liftDue, MAX_RETENTION, split } from './operations';
import { frDate } from './periods';
import { formatValue } from './numbers';

interface Opts { company: string; date: Date; coords?: string }

export function debitPdf(s: State, d: Debit, o: Opts): string {
  const sup = s.suppliers[d.supplierId];
  const w = new DocWriter({ company: o.company, title: `Fiche de débit ${d.ref}`, date: o.date }, COLORS.red);
  w.band('Réclamation fournisseur et demande d\'avoir', `${d.ref} · ${sup?.name || 'Fournisseur'}`, sup ? categoryLabel(sup.category) : '');
  const co = s.params.company;
  const ct = sup?.contactId ? s.contacts[sup.contactId] : undefined;
  w.fields([
    ['Émetteur', [o.company, co?.address, co?.siret && `SIRET ${co.siret}`, co?.phone, co?.email].filter(Boolean).join(' · ')],
    ['Destinataire', [sup?.name, ct ? `${ct.name}, ${ct.phone}${ct.email ? `, ${ct.email}` : ''}` : sup?.contact].filter(Boolean).join(' · ')],
    ['Réception du', frDate(d.date)], ['Commande', d.orderRef || ''], ['Bon de livraison', d.bl], ['Réserve écrite sur le BL', d.reserveOnBl ? 'Oui' : 'Non'],
    ['Défaut constaté', d.defect], ['Photos', d.photo ? 'jointes à l\'envoi' : ''],
  ]);
  w.heading('Préjudice chiffré');
  w.table(['Poste', 'Détail', 'Montant HT'], [
    ['Heures de tri et de reprise', d.reworkHours ? `${formatValue(d.reworkHours, '')} h à ${formatValue(s.params.hourlyRate, '€')}` : '', formatValue((d.reworkHours || 0) * s.params.hourlyRate, '€')],
    ['Matière, transport, tri', '', formatValue(d.otherCost || 0, '€')],
    ['Total demandé', '', formatValue(debitAmount(d, s.params), '€')],
  ], [0.34, 0.4, 0.26], { size: 10, highlight: i => (i === 2 ? [254, 242, 242] : null) });
  w.callout(`Nous vous demandons un avoir de ${formatValue(debitAmount(d, s.params), '€')} HT, ou la reprise à vos frais des pièces concernées. Merci de nous répondre sous ${CLAIM_DAYS * 24} heures.`, [254, 242, 242], COLORS.red);
  w.signatures([{ title: `Pour ${o.company || "l'entreprise"}` }, { title: `Pour ${sup?.name || 'le fournisseur'}` }]);
  return w.finish();
}

export function routinePdf(e: Equipment, o: Opts): string {
  const w = new DocWriter({ company: o.company, title: `Routine du lundi · ${e.name}`, date: o.date });
  w.band('Routine sensorielle du lundi · 10 minutes', e.name, [e.location, e.operator && `opérateur : ${e.operator}`, e.manager && `responsable : ${e.manager}`].filter(Boolean).join(' · '));
  w.para('Chaque lundi avant le lancement : regarder, écouter, sentir, vérifier les niveaux. Une anomalie s\'écrit tout de suite, avant la casse.', 10, { color: COLORS.gray });
  w.heading('Points à contrôler');
  w.table(['Point', 'Bon fonctionnement', 'S1', 'S2', 'S3', 'S4', 'Anomalie, action'], e.checkpoints.map(c => [c.label, c.criterion, '', '', '', '', '']), [0.24, 0.26, 0.06, 0.06, 0.06, 0.06, 0.26], { size: 9.5 });
  if (e.parts.length) {
    w.heading('Armoire de survie : pièces d\'usure sous clé');
    w.table(['Pièce', 'Référence, fournisseur', 'Délai', 'Stock mini', 'Stock réel', 'Visa'], e.parts.map(p => [p.name, [p.ref, p.supplier].filter(Boolean).join(' · '), p.leadTime, String(p.min), '', '']), [0.26, 0.28, 0.12, 0.11, 0.11, 0.12], { size: 9.5 });
    w.para('Dès qu\'une pièce est sortie de l\'armoire, la commande de remplacement part le jour même.', 9.5, { color: COLORS.gray });
  }
  return w.finish();
}

export function pvPdf(dl: Delivery, o: Opts): string {
  const r = dl.reception;
  const w = new DocWriter({ company: o.company, title: `PV de réception ${dl.ref}`, date: o.date, coords: o.coords });
  w.band('Procès-verbal de réception contradictoire', `${dl.ref} · ${dl.client || 'Client'}`, [dl.item, dl.qty !== null ? `${dl.qty} pièce(s)` : ''].filter(Boolean).join(' · '));
  w.heading('Autocontrôle aux jalons');
  w.table(['Jalon', 'Point contrôlé', 'Exigence', 'Mesuré', 'Conforme', 'Visa'], dl.milestones.map(m => [m.label, m.point, m.requirement, m.measured, m.ok === null ? '' : m.ok ? 'Oui' : 'Non', m.by]), [0.15, 0.22, 0.2, 0.17, 0.11, 0.15], { size: 9 });
  if (dl.releasedAt) w.para(`Libéré par ${dl.releasedBy || '—'} le ${frDate(dl.releasedAt)}.`, 9.5, { color: COLORS.gray });
  w.heading('Réception');
  w.para('Le client soussigné atteste avoir vérifié contradictoirement les prestations et fournitures livrées, conformément à la commande citée en référence.', 10);
  const sp = split(dl);
  const box = (on: boolean) => (on ? '[X]' : '[  ]');
  w.para(`${box(r.result === 'sans')} Réception sans réserve : bon pour facturation du solde à 100 %.`, 10.5, { bold: r.result === 'sans' });
  w.para(`${box(r.result === 'reserve')} Réception avec réserve mineure : ${r.reserve || '................................................'}`, 10.5, { bold: r.result === 'reserve' });
  w.para(`Retenue : ${r.retentionPct ?? MAX_RETENTION} % au plus ${MAX_RETENTION} %, levée sous ${LIFT_DAYS} jours${r.date ? ` (avant le ${frDate(liftDue(dl))})` : ''}. Le reste est payable immédiatement${sp ? ` : ${formatValue(sp.now, '€')} HT sur ${formatValue(r.amount, '€')} HT` : ''}.`, 10, { x: 62 });
  w.para('Clause applicable si elle figure dans les conditions générales ou le devis acceptés par le client.', 8.5, { color: COLORS.gray });
  if (r.liftedAt) w.para(`Réserve levée le ${frDate(r.liftedAt)}${dl.liftSignedBy ? `, constaté par ${dl.liftSignedBy}` : ''}.`, 10, { bold: true });
  w.para(`${box(r.result === 'refus')} Réception refusée (motif) : ........................................`, 10.5, { bold: r.result === 'refus' });
  w.signatures([
    { title: `Pour ${o.company || "l'entreprise"} (libération)`, name: dl.releasedBy, date: frDate(dl.releasedAt), strokes: dl.signCompany },
    { title: 'Pour le client (réceptionnaire habilité)', name: [r.name, r.role].filter(Boolean).join(', '), date: frDate(r.date), strokes: dl.signClient },
  ]);
  return w.finish();
}
