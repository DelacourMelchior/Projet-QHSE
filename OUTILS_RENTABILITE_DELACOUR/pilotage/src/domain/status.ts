// One line of status per tool: the badge of its tab and its card on the home screen.
// n = number of things that need attention now; tone = how urgent; text = what it is.
import type { Period, State } from './types';
import { synthesis } from './engine';
import { riskSummary, staleContacts } from './risk';
import { chainIssues, duplicates, toCheck } from './contacts';
import { cnqMonth, ncState, pokaState, analysisState } from './quality';
import { formatValue } from './numbers';
import { isoDate } from './periods';
import { businessOf } from './base';
import { complaintState, deliveriesToAsk, feedbackState, quoteState } from './commercial';
import { checklistOf, chronoSummary, keyPeople, newcomerState, skillRisk } from './team';
import { powerTodos, todoWords } from './powersAll';
import { receptionInsights, receptionTodos } from './receptionsAll';
import { plural } from './receptions';
import { eqStatus } from './maintenance';
import { maintSummary } from './maintenanceAll';
import { sopPhase, sopSummary } from './instructions';
import { debitState, supplierSummary } from './suppliers';
import { sectorSummary } from './sectors';
import { mapSummary } from './cartography';

export interface ToolStatus { n: number; tone: 'ok' | 'warn' | 'alert' | 'pending'; text: string }
const ok = (text: string): ToolStatus => ({ n: 0, tone: 'ok', text });
const empty = (text = 'Pas encore utilisé'): ToolStatus => ({ n: 0, tone: 'pending', text });

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
      const loops = chainIssues(s, now).loops.length, dup = duplicates(s).length;
      if (loops) return { n: loops, tone: 'alert', text: `${plural(loops, 'chaîne')} d'appel qui boucle${loops > 1 ? 'nt' : ''}` };
      const stale = staleContacts(s, now).length || all.filter(c => toCheck(c, now)).length;
      if (!stale && dup) return { n: dup, tone: 'warn', text: `${plural(dup, 'doublon')} à fusionner` };
      return stale ? { n: stale, tone: 'warn', text: `${plural(stale, 'numéro')} à vérifier` } : ok(`${plural(all.length, 'contact')} à jour`);
    }
    case '1.4': {
      const m = mapSummary(s, now);
      if (!m.count || !m.started) return empty();
      if (m.noPilot) return { n: m.noPilot, tone: 'alert', text: `${plural(m.noPilot, 'processus', 'processus')} sans pilote` };
      const todo = m.noFlow + m.old;
      return todo ? { n: todo, tone: 'warn', text: `${plural(m.noFlow, 'logigramme')} à faire, ${plural(m.old, 'fiche')} à relire` } : ok(`Carte complète à ${m.pct ?? 0} %`);
    }
    case '5.1': {
      const all = Object.values(s.ncs);
      if (!all.length) return empty();
      const late = all.filter(n => ncState(n, now, businessOf(s.params)) === 'late').length;
      const q = all.filter(n => ncState(n, now, businessOf(s.params)) === 'quarantine').length;
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
    case '2.3': {
      const all = Object.values(s.complaints);
      if (!all.length) return empty();
      const st = all.map(c => complaintState(c, now, businessOf(s.params)));
      const late = st.filter(x => x === 'late').length, call = st.filter(x => x === 'to_contact').length, unsat = st.filter(x => x === 'unsatisfied').length;
      if (late) return { n: late, tone: 'alert', text: late > 1 ? `${late} clients pas recontactés sous 48 h` : '1 client pas recontacté sous 48 h' };
      if (unsat) return { n: unsat, tone: 'alert', text: unsat > 1 ? `${unsat} clients pas satisfaits à reprendre` : '1 client pas satisfait à reprendre' };
      return call ? { n: call, tone: 'warn', text: `${plural(call, 'client')} à recontacter` } : ok('Clients recontactés');
    }
    case '2.4': {
      const all = Object.values(s.feedbacks), noReview = deliveriesToAsk(s, now).length;
      if (!all.length && !noReview) return empty();
      const st = all.map(f => feedbackState(f, s));
      const unhappy = st.filter(x => x === 'unhappy').length, ask = st.filter(x => x === 'to_ask').length + noReview;
      if (unhappy) return { n: unhappy, tone: 'alert', text: `${plural(unhappy, 'client')} à satisfaire` };
      return ask ? { n: ask, tone: 'warn', text: `${plural(ask, 'bilan')} à faire ou finir` } : ok('Clients satisfaits');
    }
    case '3.1': {
      if (!Object.keys(s.suppliers).length && !Object.keys(s.debits).length) return empty();
      const sm = supplierSummary(s, now);
      if (sm.late) return { n: sm.late, tone: 'alert', text: `${plural(sm.late, 'réclamation')} pas envoyée${sm.late > 1 ? 's' : ''} dans les délais` };
      if (sm.inC) return { n: sm.inC, tone: 'alert', text: `${plural(sm.inC, 'fournisseur')} en classe C` };
      const todo = Object.values(s.debits).filter(d => ['to_send', 'chase', 'contested', 'accepted'].includes(debitState(d, now, s.params))).length + sm.due + sectorSummary(s, now).issues;
      return todo ? { n: todo, tone: 'warn', text: `${plural(todo, 'point')} à traiter (envoi, réponse, évaluation, secours)` } : ok(`${plural(Object.keys(s.suppliers).length, 'fournisseur')} suivi${Object.keys(s.suppliers).length > 1 ? 's' : ''}, ${formatValue(sm.recovered, '€')} récupérés sur 12 mois`);
    }
    case '3.2': {
      const all = Object.values(s.sops).filter(x => sopPhase(x) !== 'archived');
      if (!all.length) return empty();
      const sm = sopSummary(s, now), stale = sm.todos.filter(t => t.kind === 'update').length, bad = sm.todos.filter(t => t.tone === 'bad').length, open = sm.todos.length;
      if (stale) return { n: stale, tone: 'alert', text: `${plural(stale, 'instruction')} à mettre à jour` };
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'point')} à traiter sur les instructions (ancienne fiche affichée, habilitation échue)` };
      return open ? { n: open, tone: 'warn', text: `${plural(open, 'point')} à suivre (validation, lecture, affichage, relecture)` } : ok(`${plural(all.length, 'poste')} avec instruction à jour`);
    }
    case '3.3': {
      if (!Object.values(s.equipments).some(e => eqStatus(e) !== 'retired') && !Object.keys(s.spares).length) return empty();
      const sm = maintSummary(s, now), bad = sm.todos.filter(t => t.tone === 'bad').length;
      if (bad) return { n: bad, tone: 'alert', text: `${plural(bad, 'point urgent', 'points urgents')} sur ${sm.todos.length} (équipements et armoire)` };
      return sm.todos.length ? { n: sm.todos.length, tone: 'warn', text: `${plural(sm.todos.length, 'point')} à suivre (équipements et armoire)` } : ok('Équipements et armoire à jour');
    }
    case '3.4': {
      if (!Object.keys(s.deliveries).length) return empty();
      // red: a PV whose content no longer matches its seal, a milestone not conform, a late reservation, a refusal, a late delivery; amber: to release, to sign, to lift, a rest to deliver, a review to post, a defect without decision (facts only);
      // "à jour" only when no task is left (the normal course of an order, a milestone to check or a delivery to make, is not a warning)
      const todos = receptionTodos(s, now), count = (tone: 'bad' | 'warn', ...ks: string[]) => todos.filter(t => t.tone === tone && ks.includes(t.kind)).length;
      const say = (parts: [number, string, string][]) => ({ n: parts.reduce((n, x) => n + x[0], 0), text: parts.filter(x => x[0]).map(x => plural(x[0], x[1], x[2])).join(', ') });
      const red = say([[count('bad', 'seal'), 'PV au scellé modifié', 'PV au scellé modifié'], [count('bad', 'blocked', 'defect'), 'jalon non conforme', 'jalons non conformes'], [count('bad', 'reserve-late'), 'réserve en retard', 'réserves en retard'], [count('bad', 'refused'), 'réception refusée', 'réceptions refusées'], [count('bad', 'late-delivery', 'next-lot'), 'livraison en retard', 'livraisons en retard']]);
      if (red.n) return { ...red, tone: 'alert' };
      const amber = say([
        [count('warn', 'release'), 'commande à libérer', 'commandes à libérer'], [count('warn', 'unsigned'), 'PV sans signature', 'PV sans signature'], [count('warn', 'reserve'), 'réserve à lever', 'réserves à lever'],
        [count('warn', 'next-lot'), 'commande avec un reste à livrer', 'commandes avec un reste à livrer'], [count('warn', 'feedback'), 'bilan à poser', 'bilans à poser'], [count('warn', 'defect'), 'défaut sans décision', 'défauts sans décision'],
      ]);
      // a delivery with no release recorded stays a fact even when its PV is signed (no task left): the badge says it
      const noRelease = !count('warn', 'release') && receptionInsights(s, now).some(i => i.key === 'delivered-unreleased');
      if (noRelease) return { n: amber.n + 1, text: [amber.text, 'livraison sans libération'].filter(Boolean).join(', '), tone: 'warn' };
      return amber.n ? { ...amber, tone: 'warn' } : ok('Réceptions à jour');
    }
    case '4.1': {
      if (!Object.keys(s.powers).length && !Object.keys(s.vaults).length) return empty();
      const todos = powerTodos(s, now), bad = todos.filter(t => t.tone === 'bad');
      if (bad.length) return { n: bad.length, tone: 'alert', text: todoWords(bad) };
      return todos.length ? { n: todos.length, tone: 'warn', text: todoWords(todos) } : ok('Suppléances prêtes');
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
      const st = ns.map(n => newcomerState(n, now, checklistOf(s)));
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

// The status of a tool whose data cannot be read (a damaged record): the card says so, the other cards and the home screen stay
export function safeBadge(...a: Parameters<typeof toolBadge>): ToolStatus {
  try { return toolBadge(...a); } catch { return { n: 0, tone: 'pending', text: 'À vérifier' }; }
}
