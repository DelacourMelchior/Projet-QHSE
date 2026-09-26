// One line of status per tool: the badge of its tab and its card on the home screen.
// n = number of things that need attention now; tone = how urgent; text = what it is.
import type { Period, State } from './types';
import { synthesis } from './engine';
import { riskSummary, staleContacts } from './risk';
import { toCheck } from './contacts';
import { cnqMonth, ncState, pokaState, analysisState } from './quality';
import { formatValue } from './numbers';
import { isoDate } from './periods';
import { changeState, changeSummary, complaintState, feedbackState, quoteState } from './commercial';
import { chronoSummary, envelopeState, keyPeople, newcomerState, powerState, skillRisk } from './team';
import { anomalies, debitState, deliveryState, inspectionState, lowParts, ncsSinceVersion, supplierSummary } from './operations';

export interface ToolStatus { n: number; tone: 'ok' | 'warn' | 'alert' | 'pending'; text: string }
const ok = (text: string): ToolStatus => ({ n: 0, tone: 'ok', text });
const empty = (text = 'Pas encore utilisé'): ToolStatus => ({ n: 0, tone: 'pending', text });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function toolBadge(s: State, tool: string, p: Period, now = new Date()): ToolStatus {
  switch (tool) {
    case '1.1': {
      const syn = synthesis(s, p);
      if (!syn.total) return empty();
      if (!syn.filled) return { n: 0, tone: 'pending', text: 'Chiffres du mois à saisir' };
      return syn.alerts.length ? { n: syn.alerts.length, tone: syn.orphans.length ? 'alert' : 'warn', text: `${plural(syn.alerts.length, 'indicateur')} en dérive` } : ok('Indicateurs dans leur cible');
    }
    case 'saisie': {
      const syn = synthesis(s, p);
      return syn.total - syn.filled ? { n: syn.total - syn.filled, tone: 'pending', text: 'à saisir' } : ok('Mois saisi');
    }
    case '1.2': {
      const r = riskSummary(s, now);
      if (!r.count) return empty();
      if (r.byState.uncovered) return { n: r.byState.uncovered, tone: 'alert', text: `${plural(r.byState.uncovered, 'risque')} sans Plan B` };
      if (r.toTest) return { n: r.toTest, tone: 'warn', text: `${plural(r.toTest, 'Plan B')} à tester` };
      return ok(`Couverture ${r.coveragePct ?? 0} %`);
    }
    case '1.3': {
      const all = Object.values(s.contacts);
      if (!all.length) return empty();
      const stale = staleContacts(s, now).length || all.filter(c => toCheck(c, now)).length;
      return stale ? { n: stale, tone: 'warn', text: `${plural(stale, 'numéro')} à vérifier` } : ok(`${plural(all.length, 'contact')} à jour`);
    }
    case '5.1': {
      const all = Object.values(s.ncs);
      if (!all.length) return empty();
      const late = all.filter(n => ncState(n, now) === 'late').length;
      const q = all.filter(n => ncState(n, now) === 'quarantine').length;
      if (late) return { n: late, tone: 'alert', text: `${plural(late, 'décision')} en retard (plus de 24 h)` };
      if (q) return { n: q, tone: 'warn', text: `${plural(q, 'pièce')} en quarantaine` };
      return ok('Bac rouge vide');
    }
    case '5.2': {
      const m = cnqMonth(s, p > isoDate(now).slice(0, 7) ? isoDate(now).slice(0, 7) : p);
      if (!Object.keys(s.ncs).length && !Object.keys(s.complaints).length && !Object.keys(s.debits).length) return empty();
      return m.unqualified ? { n: m.unqualified, tone: 'warn', text: `${plural(m.unqualified, 'coût')} à imputer` } : { n: 0, tone: 'ok', text: `${formatValue(m.total, '€')} ce mois` };
    }
    case '5.3': {
      const all = Object.values(s.analyses);
      if (!all.length) return empty();
      const st = all.map(a => analysisState(s, a, now));
      const bad = st.filter(x => x === 'to_act' || x === 'failed').length;
      const todo = st.filter(x => x === 'draft' || x === 'running' || x === 'to_check').length;
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'atelier')} sans contre-mesure ou en récidive` };
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'atelier')} en cours` } : ok('Ateliers clos et efficaces');
    }
    case '5.4': {
      const all = Object.values(s.pokas);
      if (!all.length) return empty();
      const st = all.map(x => pokaState(x, now));
      const failed = st.filter(x => x === 'failed').length, due = st.filter(x => x === 'due').length;
      if (failed) return { n: failed, tone: 'alert', text: `${plural(failed, 'récidive')}` };
      if (due) return { n: due, tone: 'warn', text: `${plural(due, 'contrôle')} J+30 à faire` };
      const eff = st.filter(x => x === 'effective').length;
      return ok(eff ? `${plural(eff, 'détrompeur')} efficace${eff > 1 ? 's' : ''} à J+30` : 'Détrompeurs en service');
    }
    case '2.1': {
      const all = Object.values(s.quotes);
      if (!all.length) return empty();
      const st = all.map(q => quoteState(q, s.params, now));
      const follow = st.filter(x => x === 'to_follow').length, draft = st.filter(x => x === 'draft').length;
      if (follow) return { n: follow, tone: 'alert', text: `${plural(follow, 'devis', 'devis')} à relancer` };
      return draft ? { n: draft, tone: 'warn', text: `${plural(draft, 'devis', 'devis')} à valider avant envoi` } : ok('Devis à jour');
    }
    case '2.2': {
      const all = Object.values(s.changes);
      if (!all.length) return empty();
      const sm = changeSummary(s, now);
      if (sm.risky) return { n: sm.risky, tone: 'alert', text: sm.risky > 1 ? `${sm.risky} avenants commencés sans accord` : '1 avenant commencé sans accord' };
      const todo = all.filter(c => ['to_price', 'to_send', 'accepted'].includes(changeState(c))).length;
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'avenant')} à chiffrer, envoyer ou facturer` } : ok('Avenants à jour');
    }
    case '2.3': {
      const all = Object.values(s.complaints);
      if (!all.length) return empty();
      const st = all.map(c => complaintState(c, now));
      const late = st.filter(x => x === 'late').length, call = st.filter(x => x === 'to_contact').length;
      if (late) return { n: late, tone: 'alert', text: late > 1 ? `${late} clients pas rappelés sous 48 h` : '1 client pas rappelé sous 48 h' };
      return call ? { n: call, tone: 'warn', text: `${plural(call, 'client')} à rappeler` } : ok('Clients rappelés');
    }
    case '2.4': {
      const all = Object.values(s.feedbacks);
      if (!all.length) return empty();
      const st = all.map(f => feedbackState(f, s));
      const doubt = st.filter(x => x === 'doubt' || x === 'unhappy').length, inv = st.filter(x => x === 'to_invoice' || x === 'to_ask').length;
      if (doubt) return { n: doubt, tone: 'alert', text: `${plural(doubt, 'client')} à satisfaire avant la facture` };
      return inv ? { n: inv, tone: 'warn', text: `${plural(inv, 'bilan')} à finir ou facturer` } : ok('Bilans facturés');
    }
    case '3.1': {
      if (!Object.keys(s.suppliers).length && !Object.keys(s.debits).length) return empty();
      const sm = supplierSummary(s, now);
      if (sm.late) return { n: sm.late, tone: 'alert', text: `${plural(sm.late, 'réclamation')} hors délai de 48 h` };
      if (sm.inC) return { n: sm.inC, tone: 'alert', text: `${plural(sm.inC, 'fournisseur')} en classe C` };
      const todo = Object.values(s.debits).filter(d => ['to_send', 'accepted'].includes(debitState(d, now))).length + sm.due;
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'point')} à traiter (envoi, avoir, notation)` } : ok(`${formatValue(sm.recovered, '€')} récupérés cette année`);
    }
    case '3.2': {
      const all = Object.values(s.sops);
      if (!all.length) return empty();
      const stale = all.filter(x => ncsSinceVersion(s, x).length).length, noVal = all.filter(x => !x.validatedBy.trim()).length;
      if (stale) return { n: stale, tone: 'alert', text: `${plural(stale, 'instruction')} à mettre à jour` };
      return noVal ? { n: noVal, tone: 'warn', text: `${plural(noVal, 'instruction')} à valider` } : ok(`${plural(all.length, 'poste')} avec instruction`);
    }
    case '3.3': {
      const all = Object.values(s.equipments);
      if (!all.length) return empty();
      const bad = all.filter(e => anomalies(e).length || lowParts(e).length).length;
      const late = all.filter(e => inspectionState(e, now) !== 'ok').length;
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'machine')} avec anomalie ou pièce à commander` };
      return late ? { n: late, tone: 'warn', text: `${plural(late, 'inspection')} du lundi à faire` } : ok('Machines inspectées cette semaine');
    }
    case '3.4': {
      const all = Object.values(s.deliveries);
      if (!all.length) return empty();
      const st = all.map(d => deliveryState(d, now));
      const bad = st.filter(x => x === 'blocked' || x === 'reserve_late' || x === 'refused').length;
      const todo = st.filter(x => x === 'to_release' || x === 'released' || x === 'reserve').length;
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'commande')} en défaut (jalon, réserve, refus)` };
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'commande')} à libérer, faire signer ou lever` } : ok('Réceptions à jour');
    }
    case '4.1': {
      const all = Object.values(s.powers);
      if (!all.length) return empty();
      const st = all.map(p => powerState(p, now));
      const none = st.filter(x => x === 'no_deputy').length;
      const todo = st.filter(x => x !== 'ok' && x !== 'no_deputy').length + (envelopeState(s.envelope, now) === 'ok' ? 0 : 1);
      if (none) return { n: none, tone: 'alert', text: `${plural(none, 'pouvoir')} sans suppléant` };
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'suppléance')} à compléter ou à entraîner` } : ok('Suppléances prêtes');
    }
    case '4.2': {
      const ks = Object.values(s.skills);
      if (!ks.length) return empty();
      const keys = keyPeople(s).length, bad = ks.filter(k => skillRisk(s, k) !== 'ok').length;
      return bad ? { n: bad, tone: 'alert', text: `${plural(bad, 'compétence')} sans doublure${keys ? `, ${plural(keys, 'homme-clé', 'hommes-clés')}` : ''}` } : ok('Toutes les compétences doublées');
    }
    case '4.3': {
      const ns = Object.values(s.newcomers);
      if (!ns.length) return empty();
      const st = ns.map(n => newcomerState(n, now));
      const bad = ns.filter((n, i) => st[i] === 'failed' || (!n.authorizedAt && !n.tutor.trim())).length;
      const todo = st.filter(x => ['welcome', 'test_due', 'to_authorize'].includes(x)).length;
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'recrue')} sans tuteur ou avec un test à repasser` };
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'étape')} d'accueil à faire` } : ok('Recrues autonomes');
    }
    case '4.4': {
      const c = chronoSummary(s, now);
      if (!c.count && !s.ged.owner) return empty('Plan de classement à adopter');
      if (c.obsolete) return { n: c.obsolete, tone: 'alert', text: c.obsolete > 1 ? `${c.obsolete} versions périmées trouvées` : '1 version périmée trouvée' };
      return c.monthDone ? ok(`Tests réussis : ${c.okPct ?? 0} %`) : { n: 1, tone: 'warn', text: 'Test des 30 secondes du mois à faire' };
    }
    default:
      return empty();
  }
}
