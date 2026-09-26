// One line of status per tool: the badge of its tab and its card on the home screen.
// n = number of things that need attention now; tone = how urgent; text = what it is.
import type { Period, State } from './types';
import { synthesis } from './engine';
import { riskSummary, staleContacts } from './risk';
import { toCheck } from './contacts';
import { cnqMonth, ncState, pokaState, analysisState } from './quality';
import { formatValue } from './numbers';

export interface ToolStatus { n: number; tone: 'ok' | 'warn' | 'alert' | 'pending'; text: string }
const ok = (text: string): ToolStatus => ({ n: 0, tone: 'ok', text });
const empty = (text = 'Pas encore utilisé'): ToolStatus => ({ n: 0, tone: 'pending', text });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function toolBadge(s: State, tool: string, p: Period, now = new Date()): ToolStatus {
  switch (tool) {
    case '1.1': {
      const syn = synthesis(s, p);
      if (!syn.total) return empty();
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
      const m = cnqMonth(s, p);
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
      return ok(`${plural(st.filter(x => x === 'effective').length, 'détrompeur')} efficace(s)`);
    }
    default:
      return empty();
  }
}
