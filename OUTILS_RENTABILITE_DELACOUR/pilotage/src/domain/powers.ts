// Tool 4.1 "Suppléances d'urgence": for each vital power (the act without which the company stops) a holder and two deputies who really did it within the year, the
// formalities that let a deputy act, and the accesses under sealed envelopes checked twice a year. Pure functions, covered by powers.test.ts.
// People are names: a name is read against the staff list (4.2) and the directory (1.3) by exact name, so that a phone, a leave or a departure can be told; a name that is on
// neither list still counts (an outside deputy), the screen says it. The life of the tool (a practice, a check, an opening, an absence covered) is one record each, written
// once, so that two people never overwrite each other; the first version kept a date per deputy in the power, it still counts.
import type { Contact, Cover, Params, PersonSign, Person, Power, PowerWait, Practice, State, Vault, VaultLog } from './types';
import { addDays, daysBetween, newId, nowLocal } from './base';
import { frDate, isoDate } from './periods';
import { norm } from './instructions';
import { plural } from './receptions';

export const PRACTICE_DAYS = 365;   // a deputy does the real act once a year
export const ENVELOPE_DAYS = 183;   // an envelope is checked twice a year
export const LONG_HOURS = 24;       // an absence longer than this opens the envelope, under double visa
export const REVIEW_MONTHS = 12;    // the list of powers is read again once a year
export const LOAD_MAX = 3;          // a person who is deputy of more powers than this is said
export const SOON_DAYS = 30;        // a practice that ends within 30 days is "to plan"

// ---- the neutral lists of the tool (the company edits them in the settings of the tool)
export const POWER_LIBRARY: { process: string; text: string }[] = [
  { process: 'P1', text: 'Signature bancaire et virement des salaires' },
  { process: 'P1', text: 'Déclarations légales urgentes (sociales, fiscales)' },
  { process: 'P2', text: 'Validation des offres et des engagements pris auprès des clients' },
  { process: 'P2', text: 'Réponse aux demandes urgentes des clients' },
  { process: 'P3', text: "Lancement de l'activité du jour et planning" },
  { process: 'P3', text: 'Validation de la livraison ou de la mise à disposition' },
  { process: 'P4', text: 'Clés, alarme et ouverture des locaux' },
  { process: 'P4', text: "Contrats de travail temporaire et accueil des personnes en renfort" },
  { process: 'P5', text: "Libération d'un produit ou d'un service au client" },
  { process: 'P5', text: "Mise à l'écart d'un produit ou d'un service non conforme" },
];
// What the assistant of the first start proposes: the first suggestion of each process
export const START_POWERS = ['P1', 'P2', 'P3', 'P4', 'P5'].map(p => POWER_LIBRARY.find(x => x.process === p)!);
export const DEFAULT_FORMS: { key: string; label: string }[] = [
  { key: 'deleg', label: 'Délégation écrite signée' },
  { key: 'limits', label: 'Limites précisées' },
  { key: 'informed', label: 'Organisme concerné informé (banque, assureur, autorité…)' },
];
export const WAITS: Record<PowerWait, string> = { day: 'Le jour même', days3: "Jusqu'à 3 jours", week: "Jusqu'à 1 semaine", more: "Plus d'une semaine", other: 'Autre, précisez' };
const WAIT_RANK: Record<PowerWait, number> = { day: 0, days3: 1, other: 1, week: 2, more: 3 };
export const waitText = (p: Power): string => (p.wait === 'other' ? p.waitOther?.trim() || WAITS.other : p.wait ? WAITS[p.wait] : '');
// The four controls of the check of an envelope
export const VAULT_CHECKS = ['Scellé intact', 'Accès encore valides', 'Contenu conforme à la liste', "Suppléants à l'aise avec les outils"];

export interface PowerCfg { practiceDays: number; envelopeDays: number; longHours: number; reviewMonths: number; loadMax: number; practice: boolean; vaultFull: boolean; forms: { key: string; label: string }[]; library: { process: string; text: string }[] }
const pos = (n: number | undefined, d: number) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n) : d);
export function powerCfg(p: Pick<Params, 'power'> | undefined): PowerCfg {
  const c = p?.power || {};
  return {
    practiceDays: pos(c.practiceDays, PRACTICE_DAYS), envelopeDays: pos(c.envelopeDays, ENVELOPE_DAYS), longHours: pos(c.longHours, LONG_HOURS), reviewMonths: pos(c.reviewMonths, REVIEW_MONTHS), loadMax: pos(c.loadMax, LOAD_MAX), practice: !!c.practice, vaultFull: !!c.vaultFull,
    forms: Array.isArray(c.forms) && c.forms.length ? c.forms : DEFAULT_FORMS, library: Array.isArray(c.library) && c.library.length ? c.library : POWER_LIBRARY,
  };
}

export const newPower = (processId = 'P1', power = ''): Power => ({ id: newId('pw'), processId, power, holder: '', deputies: ['', ''], practiced: ['', ''], access: '' });
export const activePowers = (s: Pick<State, 'powers'>): Power[] => Object.values(s.powers || {}).filter(p => !p.archivedAt);
const day = (d: Date) => isoDate(d);

// ---- people: names read against the staff list (4.2) and the directory (1.3)
type People = Pick<State, 'people' | 'contacts'>;
export const sameName = (a: string, b: string) => !!norm(a) && norm(a) === norm(b);
export interface Who { name: string; person?: Person; contact?: Contact; phone: string; email: string; absent: { from: string; to: string } | null; next: { from: string; to: string } | null; gone: boolean; outside: boolean }
export function whoIs(s: People, name: string, today: string): Who {
  const n = norm(name), people = Object.values(s.people || {}), contacts = Object.values(s.contacts || {});
  if (!n) return { name: '', phone: '', email: '', absent: null, next: null, gone: false, outside: false };
  const person = people.find(p => p.active && norm(p.name) === n) || people.find(p => norm(p.name) === n);
  const contact = (person && contacts.find(c => c.personId === person.id)) || contacts.find(c => !c.vacant && (norm(c.name) === n || norm(c.company ? `${c.name} (${c.company})` : c.name) === n));
  const away = person?.active ? (person.absences || []).find(a => a.from <= today && today <= a.to) : undefined, soon = addDays(today, 30);
  const next = person?.active ? (person.absences || []).filter(a => a.from > today && a.from <= soon).sort((a, b) => (a.from < b.from ? -1 : 1))[0] : undefined;
  return { name: name.trim(), person, contact, phone: contact?.phone || contact?.phone2 || '', email: contact?.email || '', absent: away ? { from: away.from, to: away.to } : null, next: next ? { from: next.from, to: next.to } : null, gone: !!person && !person.active, outside: !person && !contact };
}
// The absence of a person (staff list) that overlaps a period, the first one; the person who is not on the staff list is never away
export function clash(s: Pick<State, 'people'>, name: string, from: string, to: string): { from: string; to: string } | null {
  const n = norm(name), p = n ? Object.values(s.people || {}).find(x => x.active && norm(x.name) === n) : undefined;
  const a = p?.absences?.find(x => x.from <= (to || from) && x.to >= from);
  return a ? { from: a.from, to: a.to } : null;
}
// The people one can pick: the staff first, then the directory (outside people shown with their company); `ref` is the link that the power keeps with the person
export interface Candidate { name: string; sub: string; staff: boolean; ref: string }
const outsideName = (c: Contact) => (c.company ? `${c.name.trim()} (${c.company.trim()})` : c.name.trim());
export function candidates(s: People, query: string): Candidate[] {
  const q = norm(query), seen = new Set<string>(), out: Candidate[] = [];
  const add = (name: string, sub: string, staff: boolean, ref: string) => { const k = norm(name); if (k && !seen.has(k) && (!q || k.includes(q) || norm(sub).includes(q))) { seen.add(k); out.push({ name, sub, staff, ref }); } };
  Object.values(s.people || {}).filter(p => p.active).sort((a, b) => a.name.localeCompare(b.name, 'fr')).forEach(p => add(p.name.trim(), p.role, true, `p:${p.id}`));
  Object.values(s.contacts || {}).filter(c => c.category !== 'interne' && !c.vacant).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    .forEach(c => add(outsideName(c), c.role || c.company || '', false, `c:${c.id}`));
  return out;
}
// The name that a link gives today; undefined when the person is gone from the lists ('' while her name is being typed)
export function refName(s: People, ref: string): string | undefined {
  const [k, id] = [ref.slice(0, 1), ref.slice(2)];
  if (k === 'p') { const p = s.people?.[id]; return p?.active ? p.name.trim() : undefined; }
  const c = s.contacts?.[id];
  return c && !c.vacant ? outsideName(c) : undefined;
}
// The power with a person put in a place, linked with the directory
export const linkRef = (p: Power, name: string, ref?: string): Power => (ref && name.trim() ? { ...p, refs: { ...p.refs, [norm(name)]: ref } } : p);

// A person renamed in the directory or the staff list is renamed in every power, practice and absence that names her (and the envelopes: visa, key)
export function renamePeople(d: State, from: string, to: string): void {
  const k = norm(from), same = (x?: string) => !!x && norm(x) === k, to2 = (x: string) => (same(x) ? to : x);
  Object.values(d.powers || {}).forEach(p => {
    p.holder = to2(p.holder); p.deputies = p.deputies.map(to2) as [string, string]; if (p.extra) p.extra = p.extra.map(to2);
    if (p.dep?.[k]) { p.dep = { ...p.dep, [norm(to)]: p.dep[k] }; delete p.dep[k]; }
    if (p.refs?.[k]) { p.refs = { ...p.refs, [norm(to)]: p.refs[k] }; delete p.refs[k]; }
    if (p.signs) p.signs = Object.fromEntries(Object.values(p.signs).map(g => { const n = { ...g, subject: to2(g.subject), who: to2(g.who) }; return [signKey(n.subject, n.slot), n]; }));
  });
  Object.values(d.practices || {}).forEach(x => { x.who = to2(x.who); x.checkedBy = to2(x.checkedBy); });
  Object.values(d.covers || {}).forEach(c => { c.who = to2(c.who); c.takes = c.takes.map(t => ({ ...t, by: to2(t.by) })); });
  Object.values(d.vaults || {}).forEach(v => { v.visa = v.visa.map(to2) as [string, string]; if (v.keyHolder) v.keyHolder = to2(v.keyHolder); });
}
// Keeps the powers and the directory together: a name with a link follows the person; a name without one that is exactly a person of the lists gets its link. Returns what changed.
export function syncPowerPeople(d: State): number {
  let n = 0;
  const names = (p: Power) => [p.holder, ...p.deputies, ...(p.extra || [])].filter(x => x?.trim());
  const renames: [string, string][] = [];
  Object.values(d.powers || {}).forEach(p => names(p).forEach(name => {
    const ref = p.refs?.[norm(name)];
    if (!ref) return;
    const cur = refName(d, ref);
    if (cur === undefined) { delete p.refs![norm(name)]; n++; } else if (cur && cur !== name.trim() && !renames.some(r => norm(r[0]) === norm(name))) renames.push([name, cur]);
  }));
  renames.forEach(([a, b]) => { renamePeople(d, a, b); n++; });
  const all = candidates(d, '');
  Object.values(d.powers || {}).forEach(p => names(p).forEach(name => {
    if (p.refs?.[norm(name)]) return;
    const c = all.find(x => norm(x.name) === norm(name));
    if (c) { p.refs = { ...p.refs, [norm(name)]: c.ref }; n++; }
  }));
  return n;
}

// ---- the deputies of a power
export interface Dep { name: string; slot: number; practiced: string; declared: string }   // slot: 0 and 1 the two main ones, 2 and more the others
// The deputies, each once, the holder never among them. `practiced` is the last day the act was done and seen by someone (a line with its witness, or a date of the first
// version); `declared` is the last day written, seen or not.
export function powerDeputies(p: Power, practices?: Record<string, Practice>): Dep[] {
  const lines = Object.values(practices || {}).filter(x => x.powerId === p.id), seen = new Set([norm(p.holder)]), out: Dep[] = [];
  const all = [...p.deputies.map((name, i) => ({ name: name || '', slot: i, old: p.practiced?.[i] || '' })), ...(p.extra || []).map((name, i) => ({ name: name || '', slot: i + 2, old: p.extraPracticed?.[i] || '' }))];
  for (const d of all) {
    const k = norm(d.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const mine = lines.filter(x => norm(x.who) === k), last = (xs: string[]) => xs.filter(Boolean).sort().pop() || '';
    out.push({ name: d.name.trim(), slot: d.slot, practiced: last([d.old, ...mine.filter(x => x.checkedBy.trim()).map(x => x.date)]), declared: last([d.old, ...mine.map(x => x.date)]) });
  }
  return out;
}
// Days before the practice of a deputy expires (negative when expired, null when never practised)
export const practiceLeft = (date: string, today = new Date(), period = PRACTICE_DAYS) => { const d = daysBetween(date, today); return d === null ? null : period - d; };
export const periodDaysOf = (p: Power, cfg?: Partial<Pick<PowerCfg, 'practiceDays'>>) => p.periodDays || cfg?.practiceDays || PRACTICE_DAYS;
export interface DepView extends Dep { who: Who; left: number | null; ready: boolean; due: string }   // left: days of the seen practice that remain; ready: it is still valid; due: the day it ends
// The follow-up of the practice is off unless the settings turn it on (a call without settings keeps the first behaviour)
export const tracksPractice = (cfg?: Partial<Pick<PowerCfg, 'practice'>>) => (cfg ? !!cfg.practice : true);
export function depViews(p: Power, s: State, today = new Date(), cfg?: PowerCfg): DepView[] {
  const period = periodDaysOf(p, cfg), t = day(today);
  return powerDeputies(p, s.practices).map(d => {
    if (!tracksPractice(cfg)) return { ...d, who: whoIs(s, d.name, t), left: null, ready: true, due: '' };
    const left = practiceLeft(d.practiced, today, period);
    return { ...d, who: whoIs(s, d.name, t), left, ready: left !== null && left >= 0, due: d.practiced ? addDays(d.practiced, period) : '' };
  });
}

// How many deputies the function expects (two unless it was set to one or none): a function that has them all is not a gap, and nothing about it is red
export const wantedOf = (p: Pick<Power, 'wanted'>): 0 | 1 | 2 => (p.wanted === 0 || p.wanted === 1 ? p.wanted : 2);
export type PowerState = 'no_deputy' | 'one_deputy' | 'unsigned' | 'unpracticed' | 'to_validate' | 'soon' | 'ok';
export const POWER_STATE: Record<PowerState, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  no_deputy: { label: 'Aucun suppléant', tone: 'alert' }, unsigned: { label: 'Signatures manquantes', tone: 'warn' }, one_deputy: { label: 'Un seul suppléant', tone: 'warn' }, unpracticed: { label: 'Pratique à refaire', tone: 'warn' },
  to_validate: { label: 'Pratique à valider', tone: 'warn' }, soon: { label: 'Pratique à planifier', tone: 'warn' }, ok: { label: 'Suppléance prête', tone: 'ok' },
};
export const STATE_RANK: Record<PowerState, number> = { no_deputy: 0, one_deputy: 1, unsigned: 2, unpracticed: 2, to_validate: 3, soon: 4, ok: 5 };
// The state of a power: two distinct deputies besides the holder, and the delegation signed by all (with the follow-up of the practice on: who did the act within the period and were seen doing it). A person who left (4.2) counts as nobody.
export function powerState(p: Power, today = new Date(), s?: Pick<State, 'people' | 'practices'> & Partial<Pick<State, 'contacts' | 'params'>>, cfg?: Partial<Pick<PowerCfg, 'practiceDays' | 'practice'>>): PowerState {
  const period = periodDaysOf(p, cfg);
  const deps = powerDeputies(p, s?.practices).filter(d => !(s?.people && Object.values(s.people).some(x => !x.active && sameName(x.name, d.name))));
  const wanted = wantedOf(p);
  if (deps.length < wanted) return deps.length ? 'one_deputy' : 'no_deputy';
  if (wanted < 2 || !tracksPractice(cfg)) return signStatus(s ?? {}, p).complete ? 'ok' : 'unsigned';   // ready: the holder, the deputies and the direction have signed
  const left = (date: string) => practiceLeft(date, today, period), valid = (n: number | null) => n !== null && n >= 0;
  // two deputies who did it in time are enough, even with more listed
  const fresh = deps.filter(d => valid(left(d.practiced)));
  if (fresh.length < 2) return deps.filter(d => valid(left(d.declared))).length >= 2 ? 'to_validate' : 'unpracticed';
  if (deps.length > 2) return fresh.filter(d => left(d.practiced)! > SOON_DAYS).length >= 2 ? 'ok' : 'soon';
  return fresh.some(d => left(d.practiced)! <= SOON_DAYS) ? 'soon' : 'ok';
}

// ---- formalities: the company's list (settings), done on a day or "na"; the first version had two boxes
export const formDone = (p: Power, key: string): string => p.forms?.[key] || (key === 'deleg' && p.delegationSigned ? 'oui' : key === 'informed' && p.bankInformed ? 'oui' : '');
export function formsOf(p: Power, cfg: Pick<PowerCfg, 'forms'>): { done: number; total: number; missing: string[] } {
  const asked = cfg.forms.filter(f => formDone(p, f.key) !== 'na');
  const missing = asked.filter(f => !formDone(p, f.key)).map(f => f.label);
  return { done: asked.length - missing.length, total: asked.length, missing };
}
export const depInfo = (p: Power, name: string) => p.dep?.[norm(name)] || {};
// A power whose list of accesses is empty and a deputy who has none in his own name: nobody can act
export const noAccess = (p: Power, deps: Pick<Dep, 'name'>[]) => !p.access.trim() ? deps.filter(d => !depInfo(p, d.name).access) : [];

// ---- when a power is read again
export function reviewDue(p: Power, today = new Date(), months_ = REVIEW_MONTHS): boolean {
  if (!p.reviewedAt) return true;
  const d = new Date(p.reviewedAt + 'T00:00');
  if (Number.isNaN(d.getTime())) return true;
  d.setMonth(d.getMonth() + months_);
  return day(today) >= isoDate(d);
}
export const monthsSince = (iso: string, today = new Date()): number | null => { const d = daysBetween(iso, today); return d === null ? null : Math.floor(d / 30.4); };

// ---- who covers whom when someone is away
export type CoverStatus = 'covered' | 'weak' | 'uncovered' | 'none';   // none: the function expects no deputy, so nobody is missing
export interface PowerCover { power: Power; state: PowerState; deps: (DepView & { clash: { from: string; to: string } | null })[]; status: CoverStatus; pick: string }
export interface DeputyOf { power: Power; others: (DepView & { clash: { from: string; to: string } | null })[] }
// An absence is long when it lasts more than the hours of the settings (a day is 24 h); no end given is a long one
export const isLong = (from: string, to: string, cfg: Pick<PowerCfg, 'longHours'>): boolean => { if (!to) return true; const n = daysBetween(from, to); return n === null || (n + 1) * 24 > cfg.longHours; };
// The powers a person holds and who can do them from `from` to `to` (a deputy who is away on those days is not available), and the powers where the person is a deputy
export function coverFor(s: State, name: string, from: string, to: string, today = new Date()): { holds: PowerCover[]; deputyOf: DeputyOf[]; long: boolean } {
  const cfg = powerCfg(s.params), n = norm(name), powers = activePowers(s).sort((a, b) => a.processId.localeCompare(b.processId) || a.power.localeCompare(b.power, 'fr'));
  const view = (p: Power) => depViews(p, s, today, cfg).map(d => ({ ...d, clash: clash(s, d.name, from, to) }));
  const holds = powers.filter(p => n && norm(p.holder) === n).map(p => {
    const all = view(p), free = all.filter(d => !d.clash && !d.who.gone), ready = free.filter(d => d.ready), deps = [...ready, ...free.filter(d => !d.ready), ...all.filter(d => !free.includes(d))];   // the order of the call
    return { power: p, state: powerState(p, today, s, cfg), deps, status: !all.length && wantedOf(p) === 0 ? 'none' as const : ready.length ? 'covered' as const : free.length ? 'weak' as const : 'uncovered' as const, pick: (ready[0] || free[0])?.name || '' };
  });
  const deputyOf = powers.filter(p => n && powerDeputies(p).some(d => norm(d.name) === n)).map(p => ({ power: p, others: view(p).filter(d => norm(d.name) !== n) }));
  return { holds, deputyOf, long: isLong(from, to, cfg) };
}
// Everyone who holds a power or is the deputy of one, with what stops if that person is away for two weeks from today
export function whatIf(s: State, today = new Date()) {
  const t = day(today), to = addDays(t, 13), names = new Map<string, string>();
  activePowers(s).forEach(p => [p.holder, ...powerDeputies(p).map(d => d.name)].forEach(x => { if (norm(x) && !names.has(norm(x))) names.set(norm(x), x.trim()); }));
  return [...names.values()].map(name => {
    const c = coverFor(s, name, t, to, today);
    return { name, who: whoIs(s, name, t), holds: c.holds.length, deputyOf: c.deputyOf.length, uncovered: c.holds.filter(x => x.status === 'uncovered').length, weak: c.holds.filter(x => x.status === 'weak').length, lost: c.deputyOf.filter(x => wantedOf(x.power) >= 2 && !x.others.some(d => !d.clash)).length };
  }).sort((a, b) => b.uncovered - a.uncovered || b.weak - a.weak || (b.holds + b.deputyOf) - (a.holds + a.deputyOf) || a.name.localeCompare(b.name, 'fr'));
}
// The planned leave of a holder, within `horizon` days, during which no deputy is there
export interface Gap { power: Power; who: string; from: string; to: string }
export function futureGaps(s: State, today = new Date(), horizon = 90): Gap[] {
  const t = day(today), end = addDays(t, horizon), out: Gap[] = [];
  activePowers(s).forEach(p => {
    const holder = Object.values(s.people || {}).find(x => x.active && sameName(x.name, p.holder));
    (holder?.absences || []).filter(a => a.to >= t && a.from <= end).forEach(a => {
      const from = a.from < t ? t : a.from, deps = powerDeputies(p);
      if (!deps.length && wantedOf(p) === 0) return;   // no deputy expected: the leave is no gap
      if (!deps.some(d => !clash(s, d.name, from, a.to))) out.push({ power: p, who: p.holder.trim(), from, to: a.to });
    });
  });
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}
// Who is away today and holds a power, with what is covered
export function absentToday(s: State, today = new Date()) {
  const t = day(today), seen = new Set<string>(), out: { name: string; until: string; held: number; uncovered: number }[] = [];
  activePowers(s).forEach(p => {
    const w = whoIs(s, p.holder, t);
    if (!w.absent || seen.has(norm(p.holder))) return;
    seen.add(norm(p.holder));
    const c = coverFor(s, p.holder, t, w.absent.to, today);
    const held = c.holds.filter(x => x.status !== 'none').length;
    if (!held) return;
    out.push({ name: p.holder.trim(), until: w.absent.to, held, uncovered: c.holds.filter(x => x.status === 'uncovered').length });
  });
  return out;
}

// ---- practices: a line of proof each, written once
export const newPractice = (powerId: string, who: string, by: string, today = new Date(), over: Partial<Practice> = {}): Practice =>
  ({ id: newId('pr'), powerId, who: who.trim(), date: day(today), checkedBy: '', note: '', at: nowLocal(today), by, ...over });
export const practicesOf = (s: Pick<State, 'practices'>, powerId: string): Practice[] =>
  Object.values(s.practices || {}).filter(x => x.powerId === powerId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.at < b.at ? 1 : -1));
// Lines that nobody has seen done, which keep a power at "to validate"
export const unseen = (s: Pick<State, 'practices'>, p: Power, today = new Date(), period = PRACTICE_DAYS): Practice[] => practicesOf(s, p.id).filter(x => !x.checkedBy.trim() && (practiceLeft(x.date, today, period) ?? -1) >= 0);

// ---- sealed envelopes
export const vaultLogs = (s: Pick<State, 'vlogs'>, vaultId: string): VaultLog[] => Object.values(s.vlogs || {}).filter(x => x.vaultId === vaultId).sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
export const newVault = (name = ''): Vault => ({ id: newId('vt'), name, location: '', contents: [], visa: ['', ''] });
export const newVaultLog = (vaultId: string, kind: VaultLog['kind'], by: string, at = nowLocal(), over: Partial<VaultLog> = {}): VaultLog => ({ id: newId('vl'), vaultId, kind, at, by, ...over });
export function lastCheck(v: Vault, logs: VaultLog[]): { at: string; by: string } | null {
  const c = logs.filter(x => x.kind === 'check').map(x => ({ at: x.at, by: x.by })).sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return c || (v.checkedAt ? { at: v.checkedAt, by: v.checkedBy || '' } : null);
}
// Openings that are not closed: put back under seal, codes changed
export const openUnsealed = (logs: VaultLog[]): VaultLog[] => logs.filter(x => x.kind === 'open' && (!x.resealedAt || !x.codesChangedAt));
export type VaultState = 'never' | 'due' | 'open' | 'ok';
export function vaultState(s: Pick<State, 'vlogs' | 'params'>, v: Vault, today = new Date()): VaultState {
  const logs = vaultLogs(s, v.id);
  if (openUnsealed(logs).length) return 'open';
  const c = lastCheck(v, logs);
  if (!c) return 'never';
  return (daysBetween(c.at, today) ?? 0) > powerCfg(s.params).envelopeDays ? 'due' : 'ok';
}
export const VAULT_STATE: Record<VaultState, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  never: { label: 'Jamais vérifiée', tone: 'warn' }, due: { label: 'Vérification à faire', tone: 'warn' }, open: { label: 'Ouverte, à refermer', tone: 'alert' }, ok: { label: 'Vérifiée', tone: 'ok' },
};
export const activeVaults = (s: Pick<State, 'vaults'>): Vault[] => Object.values(s.vaults || {}).filter(v => !v.archivedAt).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

// ---- an absence that was covered
export const newCover = (who: string, from: string, to: string, takes: Cover['takes'], by: string, at = nowLocal()): Cover => ({ id: newId('cv'), who: who.trim(), from, to, takes, missing: '', closedAt: '', closedBy: '', at, by });
// Absences covered and over, not closed yet
export const coversToClose = (s: Pick<State, 'covers'>, today = new Date()): Cover[] => Object.values(s.covers || {}).filter(c => !c.closedAt && c.to && c.to < day(today));
export const waitRank = (p: Power) => (p.wait ? WAIT_RANK[p.wait] : 2);

// People who left (inactive in 4.2) and are still named in a power
export function leftPeople(s: State): { name: string; powers: Power[] }[] {
  const by = new Map<string, { name: string; powers: Power[] }>();
  activePowers(s).forEach(p => [p.holder, ...(p.deputies || []), ...(p.extra || [])].forEach(x => {
    const k = norm(x);
    if (k && Object.values(s.people || {}).some(q => !q.active && norm(q.name) === k)) { const e = by.get(k) || { name: x.trim(), powers: [] }; if (!e.powers.includes(p)) e.powers.push(p); by.set(k, e); }
  }));
  return [...by.values()];
}

// ---- moves of the tool, written on the draft of the store (`update(d => …)`): what they change is told, nothing else is touched
// Why a name cannot take a place of a power (the fact, empty = it can): the holder is not a deputy of his own power, and a person is only once among the deputies
export function placeError(p: Power, name: string, place: 'holder' | number): string {
  const n = name.trim();
  if (!n) return '';
  if (place !== 'holder' && sameName(n, p.holder)) return `${n} est déjà titulaire de cette fonction.`;
  if (place === 'holder' && [...p.deputies, ...(p.extra || [])].some(d => sameName(d, n))) return `${n} est déjà suppléant de cette fonction.`;
  const others = [...p.deputies.map((d, i) => [d, i] as const), ...(p.extra || []).map((d, i) => [d, i + 2] as const)].filter(([d, i]) => i !== place && sameName(d, n));
  return place !== 'holder' && others.length ? `${n} est déjà suppléant de cette fonction.` : '';
}
// The deputies of a power in the order of the call: the second comes first (its practice date goes with it)
export const swapDeputies = (p: Power): Power => ({ ...p, deputies: [p.deputies[1], p.deputies[0]], practiced: [p.practiced[1] || '', p.practiced[0] || ''] });
// A person put in place of another one in a slot of a deputy: the old practice date of the slot is not his
export function setDeputy(p: Power, slot: number, name: string): Power {
  if (slot < 2) {
    const was = p.deputies[slot], deputies = (slot === 0 ? [name, p.deputies[1]] : [p.deputies[0], name]) as [string, string], practiced = [...p.practiced] as [string, string];
    if (!sameName(was, name)) practiced[slot] = '';
    return { ...p, deputies, practiced };
  }
  const extra = [...(p.extra || [])], dates = [...(p.extraPracticed || [])], i = slot - 2;
  if (!sameName(extra[i], name)) dates[i] = '';
  extra[i] = name;
  return { ...p, extra, extraPracticed: dates };
}
export const removeExtra = (p: Power, slot: number): Power => ({ ...p, extra: (p.extra || []).filter((_, i) => i !== slot - 2), extraPracticed: (p.extraPracticed || []).filter((_, i) => i !== slot - 2) });
export const reviewPower = (p: Power, by: string, today = new Date()): Power => ({ ...p, reviewedAt: day(today), reviewedBy: by });
// What deleting a power would lose: its lines of practice, the absences covered where it was taken, the risk of 1.2 that cites it
export function lostByDeleting(s: State, p: Power): string {
  const n = practicesOf(s, p.id).length, c = Object.values(s.covers || {}).filter(x => x.takes.some(t => t.powerId === p.id)).length;
  return [n ? plural(n, 'pratique inscrite', 'pratiques inscrites') : '', c ? plural(c, 'absence couverte', 'absences couvertes') : ''].filter(Boolean).join(', ');
}
// An absence declared from the tool: the leave goes into the staff list (4.2 and the directory show it) and the episode is noted with who takes each power; a person that is
// not on the staff list only gets the episode. The same leave is never written twice.
export function declareAbsence(d: State, name: string, from: string, to: string, by: string, today = new Date()): Cover {
  const who = Object.values(d.people || {}).find(x => x.active && sameName(x.name, name));
  if (who && !(who.absences || []).some(a => a.from === from && a.to === to)) who.absences = [...(who.absences || []), { from, to }];
  const c = coverFor(d, name, from, to, today), cover = newCover(name, from, to, c.holds.filter(h => h.pick).map(h => ({ powerId: h.power.id, by: h.pick })), by, nowLocal(today));
  d.covers[cover.id] = cover;
  return cover;
}
// The absence closed: what was missing, and the practice of the deputies who really held the power (seen by the person who closes)
export function closeCover(d: State, id: string, missing: string, by: string, credit: string[], today = new Date()): Practice[] {
  const c = d.covers[id];
  if (!c) return [];
  d.covers[id] = { ...c, missing: missing.trim(), closedAt: day(today), closedBy: by };
  return c.takes.filter(t => credit.includes(t.powerId) && d.powers[t.powerId]).map(t => {
    const line = newPractice(t.powerId, t.by, by, today, { date: c.to && c.to < day(today) ? c.to : day(today), checkedBy: by, coverId: id, note: `A tenu la fonction pendant l'absence de ${c.who}.` });
    d.practices[line.id] = line;
    return line;
  });
}
// "Who could be a deputy?": the people of the staff list who are not on the power yet, best first, each with the facts that put them there (nothing is named by the tool)
export function suggestDeputies(s: State, p: Power, today = new Date()): { name: string; reasons: string[] }[] {
  const t = day(today), skill = p.skillId ? s.skills?.[p.skillId] : undefined, boss = Object.values(s.people || {}).find(x => sameName(x.name, p.holder));
  const taken = new Set([p.holder, ...p.deputies, ...(p.extra || [])].map(norm)), load = new Map<string, number>();
  activePowers(s).forEach(x => powerDeputies(x).forEach(d => load.set(norm(d.name), (load.get(norm(d.name)) || 0) + 1)));
  return Object.values(s.people || {}).filter(x => x.active && x.name.trim() && !taken.has(norm(x.name))).map(x => {
    const reasons: string[] = [], lvl = skill ? skill.levels?.[x.id] ?? 0 : 0, n = load.get(norm(x.name)) || 0;
    let score = 0;
    if (skill && lvl >= 3) { score += 4; reasons.push(`niveau ${lvl} sur ${skill.name}`); } else if (skill && lvl === 2) { score += 1; reasons.push(`niveau 2 sur ${skill.name}`); }
    if (boss?.team && x.team === boss.team) { score += 1; reasons.push(`même équipe (${x.team})`); }
    if (n < powerCfg(s.params).loadMax) { score += 1; reasons.push(n ? `suppléant de ${plural(n, 'fonction')}` : 'suppléant d\'aucune fonction'); }
    if (!clash(s, x.name, t, addDays(t, 13))) { score += 1; reasons.push('présent les 14 prochains jours'); }
    return { name: x.name.trim(), reasons, score };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr')).slice(0, 3).map(({ name, reasons }) => ({ name, reasons }));
}

// The last readings of the list (the day, who, how many powers were read that day), from the dates the powers carry
export function reviewHistory(s: Pick<State, 'powers'>, max = 4): { at: string; by: string; count: number }[] {
  const by = new Map<string, { at: string; by: string; count: number }>();
  activePowers(s).forEach(p => { if (p.reviewedAt) { const k = `${p.reviewedAt}|${p.reviewedBy || ''}`, e = by.get(k) || { at: p.reviewedAt, by: p.reviewedBy || '', count: 0 }; e.count++; by.set(k, e); } });
  return [...by.values()].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, max);
}

// The head of the company, to call when nobody can take a power and to see an act done: the person chosen in the directory, else the internal card whose role says it
const HEAD = /dirigeant|g[ée]rant|pdg|pr[ée]sident|directeur g[ée]n[ée]ral|directrice g[ée]n[ée]rale|chef d'entreprise|\bdg\b/i;
export const headOf = (s: Pick<State, 'contacts' | 'params'>): Contact | undefined =>
  (s.params.directorId ? s.contacts[s.params.directorId] : undefined) || Object.values(s.contacts || {}).find(c => c.category === 'interne' && !c.vacant && c.name.trim() && HEAD.test(c.role || ''));


// ---- the designation in a key function, signed on screen: the holder (herself, and the direction for her), each deputy (herself, the holder and the direction)
export type SignSlot = PersonSign['slot'];
export interface SignNeed { subject: string; subjectRole: 'holder' | 'deputy'; slot: SignSlot; who: string; also?: SignSlot }   // also: the direction is the same person, so this one signature counts for both
export const SLOT_LABEL: Record<SignSlot, string> = { self: 'Signature', holder: 'Validation du titulaire', direction: 'Validation de la direction' };
type SignCtx = Partial<Pick<State, 'contacts' | 'params' | 'people'>>;
// What a signature is called: « Signature », « Validation du titulaire », … (a head of the company who is the holder signs for both)
export const signLabel = (n: Pick<SignNeed, 'slot' | 'also'>) => (n.slot === 'self' ? (n.also === 'direction' ? 'Signature et validation de la direction' : 'Signature') : n.slot === 'holder' && n.also === 'direction' ? 'Validation du titulaire et de la direction' : SLOT_LABEL[n.slot]);
export const signKey = (subject: string, slot: SignSlot) => `${norm(subject)}|${slot}`;
// The signatures that are expected, in order. Nobody signs twice for the same person: the head of the company who is the holder only signs once, a head who is a deputy too.
export function signNeeds(s: SignCtx, p: Power): SignNeed[] {
  const gone = (n: string) => !!s.people && Object.values(s.people).some(x => !x.active && sameName(x.name, n));
  const head = s.contacts && s.params ? headOf({ contacts: s.contacts, params: s.params })?.name.trim() || '' : '', out: SignNeed[] = [];
  const add = (subject: string, subjectRole: SignNeed['subjectRole']) => {
    const slots: [SignSlot, string][] = [['self', subject]];
    if (subjectRole === 'deputy') slots.push(['holder', p.holder.trim()]);
    slots.push(['direction', head]);
    const seen = new Map<string, SignNeed>();
    slots.forEach(([slot, who]) => {
      if (!who) return;
      const first = seen.get(norm(who));
      if (first) { first.also = slot; return; }   // the same person for two slots signs once
      const n: SignNeed = { subject, subjectRole, slot, who };
      seen.set(norm(who), n); out.push(n);
    });
  };
  if (p.holder.trim()) add(p.holder.trim(), 'holder');
  powerDeputies(p).map(d => d.name).filter(n => !gone(n)).forEach(n => add(n, 'deputy'));
  return out;
}
export const signOf = (p: Power, need: Pick<SignNeed, 'subject' | 'slot'>): PersonSign | undefined => p.signs?.[signKey(need.subject, need.slot)];
export function signText(p: Power, need: SignNeed, today: string): string {
  const fn = `« ${p.power.trim()} »`, holder = p.holder.trim(), limits = `Ce que le suppléant peut et ne peut pas faire : ${p.limits?.trim() || 'aucune limite précisée'}.`;
  const by = need.who, sub = need.subject;
  const body = need.subjectRole === 'holder'
    ? (need.slot === 'self' ? `Je soussigné(e) ${by}, titulaire de la fonction clé ${fn}, m'engage à la tenir et à la déléguer à mes suppléants désignés pendant mes absences.`
      : `Je soussigné(e) ${by}, pour la direction, désigne ${sub} titulaire de la fonction clé ${fn}.`)
    : need.slot === 'self' ? `Je soussigné(e) ${by}, accepte d'être suppléant(e) de ${holder} pour la fonction clé ${fn} et d'accomplir cet acte en son absence.\n\n${limits}`
    : need.slot === 'holder' ? `Je soussigné(e) ${by}, titulaire de la fonction clé ${fn}, valide ${sub} comme suppléant(e) et lui délègue le soin d'accomplir cet acte à ma place pendant mes absences.\n\n${limits}`
    : `Je soussigné(e) ${by}, pour la direction, valide la délégation de la fonction clé ${fn} de ${holder} à ${sub}.`;
  const both = need.also === 'direction' ? (need.slot === 'self' ? ' Je me désigne aussi, pour la direction, titulaire de cette fonction.' : ' Je le valide également pour la direction.') : '';
  return `${body}${both}\n\nFait le ${frDate(today)}.`;
}
export function signStatus(s: SignCtx, p: Power): { needs: (SignNeed & { sign?: PersonSign })[]; missing: SignNeed[]; complete: boolean } {
  const needs = signNeeds(s, p).map(x => ({ ...x, sign: signOf(p, x) })), missing = needs.filter(x => !x.sign);
  return { needs, missing, complete: !!p.holder.trim() && missing.length === 0 };
}
// A signature given; the formality « Délégation écrite signée » is ticked when every one that is expected is there
export function signPerson(s: SignCtx, p: Power, need: SignNeed, img: string, today: string): Power {
  const sign: PersonSign = { slot: need.slot, subject: need.subject, who: need.who, at: nowLocal(), img, text: signText(p, need, today) };
  const next: Power = { ...p, signs: { ...p.signs, [signKey(need.subject, need.slot)]: sign } };
  return signStatus(s, next).complete && !formDone(next, 'deleg') ? { ...next, forms: { ...next.forms, deleg: today } } : next;
}
export function unsignPerson(p: Power, need: Pick<SignNeed, 'subject' | 'slot'>): Power {
  const signs = { ...p.signs };
  delete signs[signKey(need.subject, need.slot)];
  return { ...p, signs };
}

// ---- the card of the directory: the key functions where a person is the holder or a deputy, where each one stands and who is on the other side (a tap opens it in tool 4.1)
export interface FunctionOf { id: string; name: string; role: 'titulaire' | 'suppléant'; st: PowerState; holder: string; others: string[]; wanted: 0 | 1 | 2 }
export function functionsOf(s: State, name: string, today = new Date()): FunctionOf[] {
  const out: FunctionOf[] = [];
  if (!name.trim()) return out;
  const cfg = powerCfg(s.params);
  Object.values(s.powers || {}).filter(p => !p.archivedAt).forEach(p => {
    const deps = powerDeputies(p).map(d => d.name), st = powerState(p, today, s, cfg);
    if (sameName(p.holder, name)) out.push({ id: p.id, name: p.power, role: 'titulaire', st, holder: p.holder.trim(), others: deps, wanted: wantedOf(p) });
    else if (deps.some(d => sameName(d, name))) out.push({ id: p.id, name: p.power, role: 'suppléant', st, holder: p.holder.trim(), others: deps.filter(d => !sameName(d, name)), wanted: wantedOf(p) });
  });
  return out.sort((a, b) => Number(b.role === 'titulaire') - Number(a.role === 'titulaire') || STATE_RANK[a.st] - STATE_RANK[b.st] || a.name.localeCompare(b.name, 'fr'));
}
