// Twelve months of fictitious complaints for the demo company, so that the trend chart of tool 2.3 (and its copy in the dashboard 1.1)
// has something to show: complaints about delays fade after a weekly planning point, quality complaints peak in the middle of the year,
// a few are unjustified. Dates are relative to today; the same day always gives the same records.
import type { Complaint } from './types';
import { isoDate } from './periods';
import { nowLocal } from './base';

// Complaints per month, oldest month first, the last one being the current month (history stops 6 days before today)
const PLAN: Record<string, number[]> = {
  delai:        [2, 2, 2, 2, 3, 2, 2, 1, 1, 1, 1, 0],
  qualite:      [1, 1, 1, 2, 2, 3, 2, 2, 1, 2, 1, 1],
  facture:      [1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0],
  comportement: [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  emballage:    [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
  autre:        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
};
// What the customer says, the cause found, the measure, the solution, and the processes it usually comes from (with their weight)
const CASES: Record<string, { what: string; cause: string; fix: string; sol: string }[]> = {
  delai: [
    { what: 'Livraison en retard de quelques jours, client pas prévenu', cause: 'Planning atelier saturé, retard non annoncé au client', fix: 'Point planning chaque lundi et message au client dès qu\'un retard est probable', sol: 'Livraison express du solde' },
    { what: 'Délai annoncé au devis non tenu', cause: 'Délai promis sans vérifier la charge de l\'atelier', fix: 'Délai validé par l\'atelier avant l\'envoi du devis', sol: 'Geste commercial sur la prochaine commande' },
    { what: 'Pose reportée deux fois sans explication', cause: 'Rendez-vous de pose mal coordonnés', fix: 'Une personne confirme chaque rendez-vous la veille', sol: 'Nouveau rendez-vous sous 48 h' },
  ],
  qualite: [
    { what: 'Défaut d\'aspect sur la finition', cause: 'Contrôle final sans examen de l\'aspect', fix: 'Contrôle d\'aspect sous lumière rasante', sol: 'Reprise de la finition' },
    { what: 'Cotes non conformes au plan', cause: 'Plan modifié non diffusé au poste', fix: 'Le bureau diffuse chaque plan à jour au poste concerné', sol: 'Remplacement des pièces' },
    { what: 'Pièce cassée à la première utilisation', cause: 'Matière non conforme reçue du fournisseur', fix: 'Contrôle à la réception de chaque lot', sol: 'Remplacement et avoir partiel' },
  ],
  facture: [
    { what: 'Montant facturé différent du devis', cause: 'Complément de commande non reporté sur le devis', fix: 'Tout complément est écrit et signé avant fabrication', sol: 'Facture corrigée' },
    { what: 'Conditions de paiement contestées', cause: 'Conditions de la facture différentes de celles du devis', fix: 'Conditions reprises du devis signé', sol: 'Facture corrigée' },
  ],
  comportement: [
    { what: 'Équipe peu soigneuse sur le site, salissures', cause: 'Recrue non briefée sur les règles chez le client', fix: 'Briefing de dix minutes avant chaque intervention', sol: 'Nettoyage complémentaire' },
    { what: 'Ton jugé désagréable au téléphone', cause: 'Pas de consigne d\'accueil téléphonique', fix: 'Trame d\'accueil au téléphone', sol: 'Excuses du responsable' },
  ],
  emballage: [
    { what: 'Pièces rayées à la réception', cause: 'Emballage standard utilisé pour des pièces fragiles', fix: 'Emballage spécifique pour les pièces peintes', sol: 'Remplacement des pièces rayées' },
    { what: 'Colis abîmé pendant le transport', cause: 'Aucune consigne de manutention donnée au transporteur', fix: 'Étiquette fragile et choix du transporteur', sol: 'Remboursement du transport' },
  ],
  autre: [{ what: 'Documents manquants à la livraison', cause: 'Dossier de livraison incomplet', fix: 'Liste de contrôle avant le départ', sol: 'Envoi du dossier par e-mail' }],
};
const PROCESSES: Record<string, [string, number][]> = {
  delai: [['P3', 6], ['P2', 3], ['P1', 1]], qualite: [['P5', 5], ['P3', 3.5], ['P4', 1.5]], facture: [['P1', 5], ['P2', 5]],
  comportement: [['P4', 1]], emballage: [['P3', 6], ['P5', 4]], autre: [['P2', 1]],
};
const CLIENTS = ['Client A', 'Client B', 'Client C', 'BâtiPro', 'Agencement Morel', 'Menuiserie Roux', 'Atelier Duval', 'Garage Lenoir', 'Cabinet Faure', 'Mairie de Saint-Aubin'];
const PILOTS = ['Laurent B.', 'David K.', 'Antoine P.', 'Sophie V.'];

// Small seeded generator: the same seed gives the same sequence
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function complaintHistory(today = new Date()): Complaint[] {
  const rand = rng(2026), out: Complaint[] = [];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const weighted = (xs: [string, number][]) => { let r = rand() * xs.reduce((a, [, w]) => a + w, 0); for (const [k, w] of xs) { if ((r -= w) < 0) return k; } return xs[0][0]; };
  const day = (y: number, m: number, d: number) => new Date(y, m, d);
  const limit = day(today.getFullYear(), today.getMonth(), today.getDate() - 6);   // nothing more recent: a complaint of the last days would be open
  const yesterday = day(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const stamp = (d: Date, h: number, min = 0) => `${isoDate(d)}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  const plus = (s: string, hours: number) => { const t = new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13), +s.slice(14, 16)); return nowLocal(new Date(t.getTime() + hours * 3600000)); };
  let n = 0;
  for (let i = 0; i < 12; i++) {
    const offset = 11 - i;                                   // months back from the current one
    const first = day(today.getFullYear(), today.getMonth() - offset, 1);
    for (const cat of Object.keys(PLAN)) {
      for (let k = 0; k < PLAN[cat][i]; k++) {
        let d = day(first.getFullYear(), first.getMonth(), 2 + Math.floor(rand() * 25));
        if (d > limit) d = day(limit.getFullYear(), limit.getMonth(), limit.getDate() - Math.floor(rand() * 3));
        if (d.getMonth() !== first.getMonth() && offset === 0) continue;    // the current month starts too close to today: nothing to show yet
        if (d < first) continue;
        n++;
        const c = pick(CASES[cat]), at = stamp(d, 8 + Math.floor(rand() * 9), Math.floor(rand() * 4) * 15);
        const unjustified = rand() < 0.11, partial = !unjustified && rand() < 0.12;
        const processId = weighted(PROCESSES[cat]);
        const late = rand() < 0.08, delay = late ? 52 + Math.floor(rand() * 18) : 2 + Math.floor(rand() * 38);
        const resolved = day(d.getFullYear(), d.getMonth(), d.getDate() + 3 + Math.floor(rand() * 7));
        const settled = resolved <= yesterday;                         // else the complaint is still being handled: no conclusion yet
        const courtesy = day(resolved.getFullYear(), resolved.getMonth(), resolved.getDate() + 15);
        const talked = settled && courtesy <= yesterday;
        const unreachable = talked && rand() < 0.08;
        const credit = settled && !unjustified && rand() < 0.4 ? Math.round((40 + rand() * 360) / 10) * 10 : null;
        const hours = settled && !unjustified && rand() < 0.7 ? 1 + Math.floor(rand() * 4) : null;
        const pilot = pick(PILOTS);
        const verdict: Complaint['verdict'] = !settled ? '' : unjustified ? 'non_fondee' : partial ? 'partielle' : 'fondee';
        const told = day(resolved.getFullYear(), resolved.getMonth(), resolved.getDate() - 1);
        out.push({
          id: `cp_demo_h${String(n).padStart(2, '0')}`, ref: `R-${d.getFullYear()}-${100 + n}`, at, client: pick(CLIENTS), affaire: '', channel: rand() < 0.55 ? 'tel' : rand() < 0.7 ? 'mail' : 'site',
          receivedBy: pick(PILOTS), description: c.what, severity: 'mineure', processId: settled && !unjustified ? processId : '', contactedAt: plus(at, delay), immediate: unjustified ? '' : 'Prise en charge et première solution proposée', pilot,
          cost: null, resolvedAt: settled ? isoDate(resolved) : '', courtesyAt: talked ? isoDate(courtesy) : '',
          loggedAt: plus(at, 0.3), ackAt: plus(at, 1.2), category: cat as Complaint['category'], categoryOther: cat === 'autre' ? 'Documents de livraison' : undefined,
          contactVia: 'tel', verdict,
          findings: !settled ? undefined : unjustified ? 'Le bon de commande signé montre que ce point était convenu.' : `Vérification faite : ${c.cause.charAt(0).toLowerCase()}${c.cause.slice(1)}.`,
          cause: settled && !unjustified ? c.cause : undefined, correction: settled && !unjustified ? c.fix : undefined, solution: settled && !unjustified ? c.sol : undefined,
          defense: settled && unjustified ? 'Le point reproché figure dans le bon de commande signé par le client.' : undefined,
          credit, hours, resultSentAt: settled ? `${isoDate(told)}T09:30` : '', resultVia: settled ? 'mail' : '',
          satisfied: talked ? (unreachable ? 'injoignable' : 'oui') : '', courtesyNote: unreachable ? '2 appels sans réponse' : undefined, checks: {}, ackLink: '', atEdited: false,
        });
      }
    }
  }
  return out;
}

// A motive added by the fictitious company itself ("Sécurité, hygiène ou environnement"): four closed complaints that use it,
// so that a motive defined by a company shows in the register and in the trend chart.
export function safetyComplaints(today = new Date()): Complaint[] {
  const cases: [number, number, string, string, string][] = [
    [9, 12, 'Client B', 'Zone de passage encombrée de palettes lors de la visite du client', 'Aucun emplacement défini pour les palettes en attente'],
    [7, 8, 'Atelier Duval', 'Produit de nettoyage laissé sans étiquette dans la zone d\'accueil', 'Flacons transvasés sans étiquette'],
    [4, 15, 'BâtiPro', 'Casque non porté par un de nos compagnons sur le chantier du client', 'Rappel des équipements de protection non fait au début du chantier'],
    [2, 10, 'Mairie de Saint-Aubin', 'Déchets de découpe laissés sur le parking du client', 'Consigne de rangement en fin de journée absente'],
  ];
  return cases.map(([back, dayOfMonth, client, what, cause], i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - back, dayOfMonth), at = `${isoDate(d)}T10:00`;
    const plus = (days: number) => isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
    return {
      id: `cp_demo_s${i + 1}`, ref: `R-${d.getFullYear()}-${200 + i + 1}`, at, client, affaire: '', channel: 'tel' as const, receivedBy: 'Antoine P.', description: what, severity: 'mineure' as const,
      processId: 'P4', contactedAt: `${isoDate(d)}T15:30`, immediate: 'Mesure de sécurité prise sur le champ', pilot: 'Antoine P.', cost: null, resolvedAt: plus(4), courtesyAt: plus(19),
      loggedAt: `${isoDate(d)}T10:15`, ackAt: `${isoDate(d)}T11:00`, category: 'securite', contactVia: 'tel' as const, verdict: 'fondee' as const,
      findings: `Constat sur place : ${cause.toLowerCase()}.`, cause, correction: 'Consigne écrite et rappel en début de chaque intervention', solution: 'Mesure corrective expliquée au client',
      resultSentAt: `${plus(3)}T09:30`, resultVia: 'tel' as const, satisfied: 'oui' as const, checks: {}, ackLink: '', atEdited: false,
    };
  });
}
