// Tool 4.1 seen from outside the tool: the summary of the screen and of the home badge, the findings (facts, never orders), and what is left to do (the queue of the screen,
// "Mes tâches", the calendar). Each todo knows the address that opens the tool on the right place (`powerFocus`).
import type { Power, State } from './types';
import { addDays, PROCESS_IDS, processLabel, type Insight } from './base';
import { frDate, isoDate } from './periods';
import { plural } from './receptions';
import { norm } from './instructions';
import {
  absentToday, activePowers, activeVaults, coversToClose, depViews, formsOf, futureGaps, lastCheck, leftPeople, monthsSince, noAccess, openUnsealed, powerCfg, powerDeputies, powerState,
  reviewDue, sameName, vaultLogs, vaultState, waitRank, whatIf, whoIs, SOON_DAYS, tracksPractice, signStatus, type PowerState, type VaultState,
} from './powers';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const title = (p: { power: string }) => p.power.trim() || 'Fonction à décrire';
export type PowerTab = 'act' | 'people' | 'practice' | 'forms';

// ---- what is left to do
export type PowerTodoKind = 'none' | 'left' | 'today' | 'gap' | 'unsealed' | 'one' | 'sign' | 'contact' | 'practice' | 'validate' | 'forms' | 'vault' | 'cover' | 'review';
export interface PowerTodo { id: string; kind: PowerTodoKind; tone: 'bad' | 'warn'; text: string; due: string; who: string; powerId?: string; vaultId?: string; coverId?: string; name?: string; to?: string }
const enc = encodeURIComponent;
// The address (after "#4.1~") that opens the tool where the todo is
export function powerFocus(t: PowerTodo): string {
  switch (t.kind) {
    case 'cover': return `cover:${t.coverId}`;
    case 'vault': case 'unsealed': return `vault:${t.vaultId}`;
    case 'today': case 'gap': return `absent:${enc(t.name || '')}:${t.due}:${t.to || ''}`;
    case 'review': return 'review';
    case 'practice': return `practice:${t.powerId}:${enc(t.name || '')}`;
    case 'contact': return `contact:${t.name}`;
    case 'validate': case 'sign': case 'none': case 'one': case 'left': return `${t.powerId}:people`;
    case 'forms': return `${t.powerId}:forms`;
  }
}

export function powerTodos(s: State, today = new Date()): PowerTodo[] {
  const cfg = powerCfg(s.params), t = isoDate(today), out: PowerTodo[] = [];
  const add = (x: Omit<PowerTodo, 'who' | 'due'> & Partial<Pick<PowerTodo, 'who' | 'due'>>) => out.push({ who: '', due: '', ...x });
  const ps = activePowers(s);
  ps.forEach(p => {
    const st = powerState(p, today, s, cfg), name = title(p);
    if (st === 'no_deputy') add({ id: `none${p.id}`, kind: 'none', tone: 'bad', text: `Nommer un suppléant : ${name}`, powerId: p.id, due: t });
    if (st === 'one_deputy') add({ id: `one${p.id}`, kind: 'one', tone: 'warn', text: `Nommer un second suppléant : ${name}`, powerId: p.id, due: t });
    if (st === 'unsigned') { const miss = signStatus(s, p).missing; add({ id: `sg${p.id}`, kind: 'sign', tone: 'warn', text: `${plural(miss.length, 'signature à recueillir', 'signatures à recueillir')} : ${name}`, powerId: p.id, who: miss[0]?.who || '', due: t }); }
    if (tracksPractice(cfg) && (st === 'unpracticed' || st === 'to_validate' || st === 'soon')) {
      const period = p.periodDays || cfg.practiceDays;
      depViews(p, s, today, cfg).filter(d => !d.who.gone).forEach(d => {
        const declaredOnly = !d.ready && d.declared && d.declared !== d.practiced && (d.declared >= addDays(t, -period));
        if (declaredOnly) add({ id: `val${p.id}${norm(d.name)}`, kind: 'validate', tone: 'warn', text: `Valider la pratique de ${d.name} : ${name}`, powerId: p.id, who: p.holder.trim(), due: t, name: d.name });
        else if (!d.ready || (d.left !== null && d.left <= SOON_DAYS)) add({ id: `pr${p.id}${norm(d.name)}`, kind: 'practice', tone: 'warn', text: `Faire l'acte en suppléant : ${name}`, powerId: p.id, who: d.name, due: p.nextPracticeAt && p.nextPracticeAt >= t ? p.nextPracticeAt : d.due || t, name: d.name });
      });
    }
    const f = formsOf(p, cfg);
    if (st !== 'no_deputy' && f.missing.length) add({ id: `fm${p.id}`, kind: 'forms', tone: 'warn', text: `Formalités à faire (${f.done} sur ${f.total}) : ${name}`, powerId: p.id, due: t });
  });
  // a person who is on a key function and that nobody can call or write to
  const seen = new Set<string>();
  ps.forEach(p => [p.holder, ...powerDeputies(p).map(d => d.name)].forEach(n => {
    const w = whoIs(s, n, t), c = w.contact;
    if (!c || seen.has(c.id) || w.gone) return;
    seen.add(c.id);
    const miss = [c.phone || c.phone2 ? '' : 'téléphone', c.email ? '' : 'e-mail'].filter(Boolean);
    if (miss.length) add({ id: `ct${c.id}`, kind: 'contact', tone: 'warn', text: `Compléter dans l'annuaire : ${n.trim()} (${miss.join(', ')})`, who: n.trim(), name: c.id, due: t });
  }));
  leftPeople(s).forEach(x => add({ id: `lf${norm(x.name)}`, kind: 'left', tone: 'bad', text: `Remplacer ${x.name}, sorti du personnel : ${plural(x.powers.length, 'fonction')}, accès à changer`, powerId: x.powers[0].id, due: t }));
  absentToday(s, today).filter(a => a.uncovered).forEach(a => add({ id: `td${norm(a.name)}`, kind: 'today', tone: 'bad', text: `${a.name} est absent jusqu'au ${frDate(a.until)} : ${plural(a.uncovered, 'fonction')} sans suppléant disponible`, name: a.name, due: t, to: a.until }));
  futureGaps(s, today, 90).forEach((g, i) => add({ id: `gp${g.power.id}${g.from}${i}`, kind: 'gap', tone: g.from <= addDays(t, 14) ? 'bad' : 'warn', text: `Du ${frDate(g.from)} au ${frDate(g.to)} : aucun suppléant disponible pour ${title(g.power)}`, name: g.who, powerId: g.power.id, due: g.from, to: g.to }));
  (cfg.vaultFull ? activeVaults(s) : []).forEach(v => {
    const st = vaultState(s, v, today), logs = vaultLogs(s, v.id), c = lastCheck(v, logs);
    if (st === 'open') add({ id: `vo${v.id}`, kind: 'unsealed', tone: 'bad', text: `Remettre sous pli et changer les codes : ${v.name || 'enveloppe'}`, vaultId: v.id, due: openUnsealed(logs).map(x => x.at.slice(0, 10)).sort()[0] || t });
    else if (st !== 'ok') add({ id: `vc${v.id}`, kind: 'vault', tone: 'warn', text: `Vérifier l'enveloppe : ${v.name || 'enveloppe'}`, vaultId: v.id, due: c ? addDays(c.at.slice(0, 10), cfg.envelopeDays) : t });
  });
  coversToClose(s, today).forEach(c => add({ id: `cv${c.id}`, kind: 'cover', tone: 'warn', text: `Clore l'absence de ${c.who} (terminée le ${frDate(c.to)})`, coverId: c.id, due: c.to }));
  const toReview = ps.filter(p => reviewDue(p, today, cfg.reviewMonths));
  if (toReview.length) add({ id: 'review', kind: 'review', tone: 'warn', text: `Revoir la liste des fonctions clés (${plural(toReview.length, 'fonction')} à relire)`, due: toReview.map(p => (p.reviewedAt ? addDays(p.reviewedAt, Math.round(cfg.reviewMonths * 30.4)) : t)).sort()[0] });
  // red before amber; then the act that cannot wait comes first (the delay of the power), then the day
  const wait = (x: PowerTodo) => (x.powerId && s.powers[x.powerId] ? waitRank(s.powers[x.powerId]) : 2);
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1) || wait(a) - wait(b) || (a.due || '9').localeCompare(b.due || '9') || a.text.localeCompare(b.text, 'fr'));
}

// "2 fonctions sans suppléant, 1 enveloppe à vérifier": the badge of the tool says what is left, the two most frequent kinds
const SAY: Record<PowerTodoKind, [string, string]> = {
  none: ['fonction sans suppléant', 'fonctions sans suppléant'], left: ['personne sortie encore citée', 'personnes sorties encore citées'], today: ['absence sans suppléant disponible', 'absences sans suppléant disponible'],
  gap: ['absence à venir sans suppléant', 'absences à venir sans suppléant'], unsealed: ['enveloppe à refermer', 'enveloppes à refermer'], one: ['fonction avec un seul suppléant', 'fonctions avec un seul suppléant'],
  practice: ['pratique à refaire', 'pratiques à refaire'], validate: ['pratique à valider', 'pratiques à valider'], forms: ['fonction aux formalités incomplètes', 'fonctions aux formalités incomplètes'],
  sign: ['fonction aux signatures manquantes', 'fonctions aux signatures manquantes'], contact: ['coordonnées à compléter', 'coordonnées à compléter'],
  vault: ['enveloppe à vérifier', 'enveloppes à vérifier'], cover: ['absence à clore', 'absences à clore'], review: ['liste à relire', 'liste à relire'],
};
export function todoWords(ts: PowerTodo[]): string {
  const c = new Map<PowerTodoKind, number>();
  ts.forEach(t => c.set(t.kind, (c.get(t.kind) || 0) + 1));
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => plural(n, ...SAY[k])).join(', ');
}

// ---- the findings: facts, one line each
export function powerInsights(s: State, today = new Date()): Insight[] {
  const cfg = powerCfg(s.params), out: Insight[] = [], ps = activePowers(s);
  const state = new Map(ps.map(p => [p.id, powerState(p, today, s, cfg)] as const)), of = (x: PowerState) => ps.filter(p => state.get(p.id) === x);
  const none = of('no_deputy'), one = of('one_deputy'), prac = [...of('unpracticed'), ...of('soon')], val = of('to_validate');
  absentToday(s, today).filter(a => a.held).forEach(a => out.push({ key: `today${norm(a.name)}`, tone: a.uncovered ? 'bad' : 'warn', title: `${a.name} est absent`, text: `jusqu'au ${frDate(a.until)} : ${plural(a.held - a.uncovered, 'fonction couverte', 'fonctions couvertes')}${a.uncovered ? `, ${plural(a.uncovered, 'fonction')} sans suppléant disponible` : ''}.` }));
  const gone = leftPeople(s);
  if (gone.length) out.push({ key: 'left', tone: 'bad', title: 'Personne sortie du personnel encore citée', text: `${names(gone, g => `${g.name} (${plural(g.powers.length, 'fonction')})`)}.` });
  if (none.length) out.push({ key: 'none', tone: 'bad', title: 'Fonction sans suppléant', text: `${names(none, title)} : aucun suppléant nommé.` });
  if (one.length) out.push({ key: 'one', tone: 'warn', title: 'Un seul suppléant', text: `${names(one, title)} : un suppléant nommé sur deux.` });
  if (tracksPractice(cfg) && prac.length) out.push({ key: 'prac', tone: 'warn', title: 'Pratique à refaire ou à planifier', text: `${names(prac, title)} : un suppléant n'a pas fait l'acte dans les ${plural(Math.round(cfg.practiceDays / 30), 'dernier mois', 'derniers mois')}, ou la fin du délai approche.` });
  if (tracksPractice(cfg) && val.length) out.push({ key: 'val', tone: 'warn', title: 'Pratique à valider', text: `${names(val, title)} : pratique inscrite, personne ne l'a vue faire.` });
  const gaps = futureGaps(s, today, 90);
  if (gaps.length) out.push({ key: 'gaps', tone: 'warn', title: 'Absences à venir', text: `${names(gaps, g => `${title(g.power)} du ${frDate(g.from)} au ${frDate(g.to)}`)} : aucun suppléant disponible.` });
  const forms = ps.filter(p => state.get(p.id) !== 'no_deputy' && formsOf(p, cfg).missing.length);
  if (forms.length) out.push({ key: 'forms', tone: 'warn', title: 'Formalités incomplètes', text: `${names(forms, p => { const f = formsOf(p, cfg); return `${title(p)} (${f.done} sur ${f.total})`; })}.` });
  const noAcc = ps.flatMap(p => noAccess(p, powerDeputies(p, s.practices)).map(d => ({ p, d })));
  if (noAcc.length) out.push({ key: 'access', tone: 'warn', title: 'Suppléant sans accès', text: `${names(noAcc, x => `${x.d.name} (${title(x.p)})`)} : ni accès à son nom, ni accès indiqués pour la fonction.` });
  if (powerCfg(s.params).vaultFull) vaultInsights(s, today).forEach(i => out.push(i));
  const hold: Record<string, number> = {}, back: Record<string, { name: string; n: number }> = {};
  ps.forEach(p => { const h = p.holder.trim(); if (h) hold[h] = (hold[h] || 0) + 1; powerDeputies(p).forEach(d => { const e = (back[norm(d.name)] ||= { name: d.name, n: 0 }); e.n++; }); });
  const many = Object.entries(hold).filter(([, n]) => n >= 3);
  if (many.length) out.push({ key: 'over', tone: 'warn', title: 'Titulaire de plusieurs fonctions', text: `${many.map(([n, c]) => `${n} (${c})`).join(', ')} : l'absence de cette personne touche plusieurs fonctions à la fois.` });
  const load = Object.values(back).filter(x => x.n > cfg.loadMax);
  if (load.length) out.push({ key: 'load', tone: 'warn', title: 'Suppléant de nombreux fonctions', text: `${load.map(x => `${x.name} (${x.n})`).join(', ')} : plus de ${plural(cfg.loadMax, 'fonction')} chacun.` });
  const dup = ps.filter(p => [...p.deputies, ...(p.extra || [])].some(d => sameName(d, p.holder)) || (p.deputies[0] && sameName(p.deputies[0], p.deputies[1])));
  if (dup.length) out.push({ key: 'dup', tone: 'warn', title: 'Même personne à deux places', text: `${names(dup, title)} : titulaire et suppléant, ou deux fois suppléant ; la personne ne compte qu'une fois.` });
  const pairs = new Map<string, { names: string; powers: Power[] }>();
  ps.forEach(p => { const d = powerDeputies(p).slice(0, 2); if (d.length === 2) { const k = d.map(x => norm(x.name)).sort().join('|'), e = pairs.get(k) || { names: d.map(x => x.name).join(' et '), powers: [] }; e.powers.push(p); pairs.set(k, e); } });
  [...pairs.values()].filter(e => e.powers.length > 1).forEach((e, i) => out.push({ key: `pair${i}`, tone: 'warn', title: 'Les deux mêmes suppléants', text: `${e.names} pour ${names(e.powers, title)} : l'absence de l'un d'eux touche toutes ces fonctions.` }));
  const empty = PROCESS_IDS.filter(id => ps.length && !ps.some(p => p.processId === id));
  if (empty.length) out.push({ key: 'process', tone: 'warn', title: 'Processus sans fonction décrite', text: `${empty.map(processLabel).join(', ')}.` });
  const due = ps.filter(p => reviewDue(p, today, cfg.reviewMonths));
  if (due.length) { const last = ps.map(p => p.reviewedAt || '').filter(Boolean).sort().pop(), m = last ? monthsSince(last, today) : null; out.push({ key: 'review', tone: 'warn', title: 'Liste à relire', text: m === null ? `${plural(due.length, 'fonction')} jamais relue${due.length > 1 ? 's' : ''}.` : `${plural(due.length, 'fonction')} sans relecture depuis ${cfg.reviewMonths} mois ; dernière relecture il y a ${plural(m, 'mois', 'mois')}.` }); }
  if (!out.length && ps.length) out.push({ key: 'good', tone: 'good', title: 'Rien à signaler', text: `${plural(ps.length, 'fonction clé', 'fonctions clés')} avec deux suppléants pratiqués dans l'année.` });
  return out;
}

function vaultInsights(s: State, today: Date): Insight[] {
  const cfg = powerCfg(s.params), out: Insight[] = [], vs = activeVaults(s);
  vs.forEach(v => {
    const st = vaultState(s, v, today), logs = vaultLogs(s, v.id), c = lastCheck(v, logs), name = v.name || 'Enveloppe';
    if (st === 'open') out.push({ key: `vo${v.id}`, tone: 'bad', title: `${name} ouverte`, text: `ouverte le ${frDate(openUnsealed(logs)[0].at.slice(0, 10))} : ${openUnsealed(logs).some(x => !x.resealedAt) ? 'pas remise sous pli' : 'codes non changés'}.` });
    else if (st === 'never') out.push({ key: `vc${v.id}`, tone: 'warn', title: `${name}`, text: 'aucune vérification enregistrée.' });
    else if (st === 'due') out.push({ key: `vc${v.id}`, tone: 'warn', title: `${name}`, text: `dernière vérification il y a ${plural(monthsSince(c!.at.slice(0, 10), today) ?? 0, 'mois', 'mois')} (${plural(Math.round(cfg.envelopeDays / 30), 'mois', 'mois')} au plus).` });
    const visa = [...new Set(v.visa.map(norm).filter(Boolean))], key = v.keyHolder?.trim() ? whoIs(s, v.keyHolder, isoDate(today)) : null;
    if (visa.length < 2) out.push({ key: `vv${v.id}`, tone: 'warn', title: name, text: `double visa : ${visa.length ? '1 personne nommée sur 2' : 'personne de nommé'}.` });
    if (key?.absent) out.push({ key: `vk${v.id}`, tone: 'bad', title: name, text: `clé du coffre détenue par ${key.name}, absent jusqu'au ${frDate(key.absent.to)}.` });
  });
  return out;
}

// ---- the summary of the screen and of the badge
export interface PowerSummary {
  total: number; ready: number; counts: Record<PowerState, number>; toTrain: number;
  absent: ReturnType<typeof absentToday>; uncoveredToday: number; heldByAbsent: number;
  vaults: { total: number; counts: Record<VaultState, number>; toDo: number };
  todos: PowerTodo[]; insights: Insight[]; people: ReturnType<typeof whatIf>;
}
export function powerSummary(s: State, today = new Date()): PowerSummary {
  const cfg = powerCfg(s.params), ps = activePowers(s), st = ps.map(p => powerState(p, today, s, cfg));
  const counts = { no_deputy: 0, one_deputy: 0, unsigned: 0, unpracticed: 0, to_validate: 0, soon: 0, ok: 0 } as Record<PowerState, number>;
  st.forEach(x => { counts[x]++; });
  const absent = absentToday(s, today), vs = activeVaults(s).map(v => vaultState(s, v, today));
  const vcounts = { never: 0, due: 0, open: 0, ok: 0 } as Record<VaultState, number>;
  vs.forEach(x => { vcounts[x]++; });
  return {
    total: ps.length, ready: counts.ok, counts, toTrain: counts.unsigned + counts.unpracticed + counts.to_validate + counts.soon,
    absent, uncoveredToday: absent.reduce((n, a) => n + a.uncovered, 0), heldByAbsent: absent.reduce((n, a) => n + a.held, 0),
    vaults: { total: vs.length, counts: vcounts, toDo: cfg.vaultFull ? vs.length - vcounts.ok : 0 },
    todos: powerTodos(s, today), insights: powerInsights(s, today), people: whatIf(s, today),
  };
}
