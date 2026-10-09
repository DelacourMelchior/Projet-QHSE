// Printed document of tool 2.1: validation sheet of an offer (5 locks, margin, visas).
import type { Quote, State } from './types';
import { COLORS, DocWriter } from './docPdf';
import { LOCK_STATE, LOCKS, needsVisas, quoteMargin } from './commercial';
import { frDate } from './periods';
import { formatValue } from './numbers';

interface Opts { company: string; date: Date; money: boolean; coords?: string }

export function quotePdf(s: State, q: Quote, o: Opts): string {
  const w = new DocWriter({ company: o.company, title: `Validation de l'offre ${q.ref}`, date: o.date });
  w.band('Faisabilité et marge avant envoi', `${q.ref} · ${q.client || 'Client'}`, q.object);
  w.fields([['Date du devis', frDate(q.date)], ['Montant', q.amount === null ? '' : `${formatValue(q.amount, '€')} HT`], ['Délai promis', q.weeks === null ? '' : `${q.weeks} semaine(s)`]]);
  w.heading('Les 5 verrous');
  w.table(['Verrou', 'Point de contrôle', 'Statut', 'Réserve ou visa'], q.locks.map((l, i) => [LOCKS[i].label, LOCKS[i].point, l.state ? LOCK_STATE[l.state] : 'À vérifier', [l.note, l.by && `vérifié avec ${l.by}`].filter(Boolean).join(' · ')]), [0.26, 0.38, 0.14, 0.22], {
    highlight: i => (q.locks[i].state === 'ko' ? [254, 226, 226] : null),
  });
  if (o.money) {
    const m = quoteMargin(q, s.params);
    w.heading('Marge');
    w.fields([
      ['Marge brute', m ? `${formatValue(m.value, '€')} (${Math.round(m.pct)} %)` : 'Coûts à chiffrer'],
      ['Plancher', `${s.params.marginFloorPct} %`], ['Acompte à la commande', `${s.params.depositPct} %`],
      ...(q.derogation ? [['Dérogation', q.derogation] as [string, string]] : []),
    ]);
  }
  if (needsVisas(q, s.params)) {
    w.heading(`Visas obligatoires au-dessus de ${formatValue(s.params.visaThreshold, '€')}`);
    w.signatures([
      { title: 'Commercial', name: q.visas.commercial.by, date: frDate(q.visas.commercial.date) },
      { title: 'Responsable technique', name: q.visas.technical.by, date: frDate(q.visas.technical.date) },
      { title: 'Direction : bon pour offre', name: q.visas.direction.by, date: frDate(q.visas.direction.date) },
    ]);
  }
  w.para('Mieux vaut perdre un devis que signer une affaire qui détruit la marge.', 9.5, { color: COLORS.gray });
  return w.finish();
}
