// Printed welcome path of a newcomer (tool 4.3): 15-day checklist, autonomy test, written authorisation to work alone.
import type { Newcomer } from './types';
import { DocWriter } from './docPdf';
import { CHECKLIST, KIND_LABEL, TEST, testDate } from './team';
import { frDate } from './periods';

export function newcomerPdf(n: Newcomer, o: { company: string; date: Date }): string {
  const w = new DocWriter({ company: o.company, title: `Parcours d'accueil · ${n.name}`, date: o.date });
  w.band("Parcours d'accueil et test d'autonomie", n.name || 'Nouvel arrivant', [n.poste, KIND_LABEL[n.kind]].filter(Boolean).join(' · '));
  w.fields([['Tuteur', n.tutor], ['Arrivée', frDate(n.arrival)], ["Test d'autonomie", `à J+15, le ${frDate(testDate(n))}`]]);
  w.heading('Parcours sur 15 jours');
  w.table(['Étape', 'Action', 'Fait le', 'Visa tuteur'], CHECKLIST.map(c => [c.stage, c.label, frDate(n.done[c.key] || ''), '']), [0.26, 0.46, 0.13, 0.15], { size: 9.5 });
  w.heading('Test d\'autonomie en 3 questions, sur le terrain');
  w.table(['', 'Question', 'Résultat'], TEST.map((q, i) => [String(i + 1), q, n.test.answers[i] === null || n.test.answers[i] === undefined ? '' : n.test.answers[i] ? 'Validé' : 'À revoir']), [0.05, 0.75, 0.2], { size: 10 });
  if (n.test.note) w.para(`Constat : ${n.test.note}`, 10);
  w.heading('Autorisation de travailler seul');
  w.signatures([
    { title: 'Tuteur : maîtrise du standard et de la sécurité', name: n.tutor, date: frDate(n.test.date) },
    { title: 'Direction : autorisation accordée', name: n.authorizedBy, date: frDate(n.authorizedAt) },
  ]);
  return w.finish();
}
