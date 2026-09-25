// Business continuity engine (tool 1.2): criticality, zone rules, readiness state, tests, delays, exposure.
// Pure functions, covered by risk.test.ts.
import type { Action, Risk, RiskScale, RiskState, Scale, Settings, State } from './types';
import { isoDate, parseDate } from './periods';
import { formatValue } from './numbers';
import { formatDuration, hoursOf } from './duration';
import { contactLabel, toCheck } from './contacts';

// ---- criticality: gravity x likelihood (1 to 16), null while the risk is not rated
export const score = (r: Pick<Risk, 'gravity' | 'likelihood'>): number | null =>
  r.gravity && r.likelihood ? r.gravity * r.likelihood : null;
export type Zone = 'low' | 'medium' | 'high';
export const zoneOf = (sc: number): Zone => sc >= 9 ? 'high' : sc >= 4 ? 'medium' : 'low';
export const riskZone = (r: Risk): Zone | null => { const sc = score(r); return sc === null ? null : zoneOf(sc); };
export const ZONE_LABEL: Record<Zone, string> = { low: 'Faible', medium: 'À surveiller', high: 'Critique' };

// What each zone requires: red = Plan B tested every 6 months, orange = Plan B tested every year, green = accepted
export const ZONE_RULES: { zone: Zone; range: string; rule: string; testDays: number | null }[] = [
  { zone: 'high', range: '9 à 16', rule: 'Plan B testé tous les 6 mois', testDays: 180 },
  { zone: 'medium', range: '4 à 8', rule: 'Plan B testé chaque année', testDays: 365 },
  { zone: 'low', range: '1 à 3', rule: 'risque accepté', testDays: null },
];
export const testValidityDays = (r: Risk): number | null => {
  const z = riskZone(r);
  return z ? ZONE_RULES.find(x => x.zone === z)!.testDays : null;
};

// ---- scales: gravity anchored in euros (0.2 %, 2 %, 8 % of the revenue objective, or the company's own bounds)
export const DEFAULT_SCALE: RiskScale = {
  gravity: ['gêne interne, rattrapée dans la journée', 'retard client rattrapable', 'client important mécontent, pénalités', "perte d'un client clé, accident, survie de l'entreprise"],
  likelihood: ["moins d'une fois en 10 ans", 'une fois en 3 à 10 ans', 'une fois en 1 à 3 ans', 'au moins une fois par an'],
};
const GRAVITY_LABELS = ['Mineure', 'Sérieuse', 'Grave', 'Critique'];
const LIKELIHOOD_LABELS = ['Rare', 'Possible', 'Probable', 'Fréquent'];
export const LIKELIHOOD_PER_YEAR = [0.05, 0.2, 0.5, 1];

const round2 = (v: number) => { const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(v, 1))) - 1); return Math.round(v / p) * p; };
export function autoThresholds(settings: Pick<Settings, 'annualBudget'>): [number, number, number] {
  const b = settings.annualBudget > 0 ? settings.annualBudget : 600000;
  return [round2(b * 0.002), round2(b * 0.02), round2(b * 0.08)];
}
export const gravityThresholds = (settings: Pick<Settings, 'annualBudget' | 'gravityThresholds'>): [number, number, number] =>
  settings.gravityThresholds || autoThresholds(settings);

export interface ScaleLevel { level: Scale; label: string; money: string; text: string }
export function gravityScale(s: Pick<State, 'settings' | 'scale'>, showMoney = true): ScaleLevel[] {
  const [a, b, c] = gravityThresholds(s.settings);
  const m = (v: number) => formatValue(v, '€');
  const money = [`moins de ${m(a)}`, `${m(a)} à ${m(b)}`, `${m(b)} à ${m(c)}`, `plus de ${m(c)}`];
  return GRAVITY_LABELS.map((label, i) => ({ level: (i + 1) as Scale, label, money: showMoney ? money[i] : '', text: s.scale.gravity[i] || DEFAULT_SCALE.gravity[i] }));
}
export const likelihoodScale = (s: Pick<State, 'scale'>): ScaleLevel[] =>
  LIKELIHOOD_LABELS.map((label, i) => ({ level: (i + 1) as Scale, label, money: '', text: s.scale.likelihood[i] || DEFAULT_SCALE.likelihood[i] }));

// ---- money (optional): loss for one event, suggested gravity, yearly exposure, Plan B payback
export function lossPerEvent(r: Risk): number | null {
  const c = r.cost;
  return c && c.perDay !== null && c.daysWithout !== null ? c.perDay * c.daysWithout : null;
}
export function suggestedGravity(r: Risk, settings: Pick<Settings, 'annualBudget' | 'gravityThresholds'>): Scale | null {
  const loss = lossPerEvent(r);
  if (loss === null) return null;
  const [a, b, c] = gravityThresholds(settings);
  return loss < a ? 1 : loss < b ? 2 : loss < c ? 3 : 4;
}
export function yearlyExposure(r: Risk): number | null {
  const loss = lossPerEvent(r);
  return loss === null || !r.likelihood ? null : loss * LIKELIHOOD_PER_YEAR[r.likelihood - 1];
}
// Loss avoided per event thanks to the Plan B, and years to pay back its cost
export function planBGain(r: Risk): { avoided: number; paybackYears: number | null } | null {
  const c = r.cost;
  if (!c || c.perDay === null || c.daysWithout === null || c.daysWith === null || !r.likelihood) return null;
  const avoided = Math.max(0, c.perDay * (c.daysWithout - c.daysWith));
  const perYear = avoided * LIKELIHOOD_PER_YEAR[r.likelihood - 1];
  return { avoided, paybackYears: c.planBCost && perYear > 0 ? c.planBCost / perYear : null };
}

// ---- delays: a Plan B slower than the tolerable outage does not protect anything
export function slowness(r: Risk): { kind: 'announced' | 'measured'; hours: number } | null {
  const max = hoursOf(r.maxOutage);
  if (max === null) return null;
  const measured = hoursOf(lastTest(r)?.delay);
  if (measured !== null && measured > max) return { kind: 'measured', hours: measured };
  const announced = hoursOf(r.activation);
  return announced !== null && announced > max ? { kind: 'announced', hours: announced } : null;
}

// ---- tests and readiness
export const lastTest = (r: Risk) => [...r.tests].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
const dayMs = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Rounded: a day across a daylight saving change lasts 23 or 25 hours
const ageDays = (iso: string | undefined, today: Date) => { const d = parseDate(iso); return d ? Math.round((startOfDay(today).getTime() - d.getTime()) / dayMs) : Infinity; };

// Date the last successful test expires ('' if never tested successfully or no test required)
export function testDueDate(r: Risk): string {
  const t = lastTest(r);
  const days = testValidityDays(r);
  const d = t?.ok ? parseDate(t.date) : null;
  return d && days ? isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)) : '';
}

export const actionsOfRisk = (s: State, riskId: string): Action[] =>
  Object.values(s.actions).filter(a => a.riskId === riskId).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
const open = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';

// A Plan B exists only once prepared, then tested within the delay of its zone: computed, never guessed from words
export function riskState(s: State, r: Risk, today = new Date()): RiskState {
  const z = riskZone(r);
  if (!z) return 'unrated';
  if (z === 'low') return 'accepted';
  if (!r.planB.trim()) return 'uncovered';
  const t = lastTest(r);
  if (t && !t.ok) return 'failed';
  if (t) return ageDays(t.date, today) <= testValidityDays(r)! ? 'tested' : 'expired';
  return actionsOfRisk(s, r.id).some(open) ? 'preparing' : 'ready';
}

export const STATE_INFO: Record<RiskState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending'; order: number }> = {
  unrated: { label: 'À coter', tone: 'pending', order: 0 },
  uncovered: { label: 'Non couvert', tone: 'alert', order: 1 },
  failed: { label: 'Test raté', tone: 'alert', order: 2 },
  expired: { label: 'Test périmé', tone: 'warn', order: 3 },
  preparing: { label: 'Plan B à préparer', tone: 'warn', order: 4 },
  ready: { label: 'Prêt, à tester', tone: 'pending', order: 5 },
  tested: { label: 'Testé', tone: 'ok', order: 6 },
  accepted: { label: 'Accepté', tone: 'ok', order: 7 },
};

// Effectiveness of a preparation action: the first test after its closure
export type RiskEffectiveness = { state: 'pending' } | { state: 'waiting' } | { state: 'effective' | 'relapse'; date: string };
export function riskActionEffectiveness(s: State, a: Action): RiskEffectiveness {
  if (open(a)) return { state: 'pending' };
  const r = a.riskId ? s.risks[a.riskId] : undefined;
  if (!r) return { state: 'pending' };
  const since = a.closedAt || a.createdAt;
  const t = [...r.tests].filter(x => x.date >= since).sort((x, y) => (x.date > y.date ? 1 : -1))[0];
  return t ? { state: t.ok ? 'effective' : 'relapse', date: t.date } : { state: 'waiting' };
}

// ---- summary and messages
// Unrated first (they need a decision), then by criticality, then by state
export const risksInOrder = (s: State, today = new Date()) =>
  Object.values(s.risks).sort((a, b) =>
    (score(b) ?? 99) - (score(a) ?? 99) || STATE_INFO[riskState(s, a, today)].order - STATE_INFO[riskState(s, b, today)].order || a.title.localeCompare(b.title));

export function riskSummary(s: State, today = new Date()) {
  const risks = Object.values(s.risks);
  const states = risks.map(r => ({ r, st: riskState(s, r, today), sc: score(r) ?? 0, z: riskZone(r) }));
  const required = states.filter(x => x.z === 'high' || x.z === 'medium');
  const total = required.reduce((a, x) => a + x.sc, 0);
  const tested = required.filter(x => x.st === 'tested').reduce((a, x) => a + x.sc, 0);
  const count = (st: RiskState) => states.filter(x => x.st === st).length;
  const exposures = risks.map(yearlyExposure).filter((v): v is number => v !== null);
  return {
    count: risks.length,
    critical: states.filter(x => x.z === 'high').length,
    coveragePct: total ? Math.round((tested / total) * 100) : null,   // share of the orange + red criticality whose Plan B is tested in time
    toTest: states.filter(x => ['failed', 'expired', 'ready'].includes(x.st)).length,
    byState: Object.fromEntries((Object.keys(STATE_INFO) as RiskState[]).map(k => [k, count(k)])) as Record<RiskState, number>,
    exposure: exposures.length ? exposures.reduce((a, b) => a + b, 0) : null,
    exposureCount: exposures.length,
  };
}

// Contacts used by at least one card whose number was not checked for a year
export function staleContacts(s: State, today = new Date()) {
  const used = new Set(Object.values(s.risks).flatMap(r => [...r.contactIds, ...r.notifyIds]));
  return Object.values(s.contacts).filter(c => used.has(c.id) && toCheck(c, today));
}

export interface RiskInsight { key: string; tone: 'good' | 'warn' | 'bad'; title: string; text: string }

export function riskInsights(s: State, today = new Date()): RiskInsight[] {
  const out: RiskInsight[] = [];
  const all = risksInOrder(s, today).map(r => ({ r, st: riskState(s, r, today), z: riskZone(r) }));
  if (!all.length) return out;
  const names = (xs: { r: Risk }[]) => xs.slice(0, 3).map(x => x.r.title).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
  const push = (key: string, tone: RiskInsight['tone'], title: string, text: string) => out.push({ key, tone, title, text });

  const redNoPlan = all.filter(x => x.z === 'high' && x.st === 'uncovered');
  if (redNoPlan.length) push('uncovered', 'bad', 'Risque critique sans Plan B', `${names(redNoPlan)}. Priorité : écrire la parade et nommer son responsable.`);
  const failed = all.filter(x => x.st === 'failed');
  if (failed.length) push('failed', 'bad', 'Plan B raté au dernier test', `${names(failed)}. Ouvrir une action corrective puis tester de nouveau.`);
  const slow = all.map(x => ({ ...x, sl: slowness(x.r) })).filter(x => x.sl && x.z !== 'low');
  if (slow.length) {
    const x = slow[0];
    push('slow', 'bad', 'Plan B trop lent', `${x.r.title} : ${x.sl!.kind === 'measured' ? 'délai mesuré au dernier test' : 'activation annoncée'} ${formatDuration({ value: x.sl!.hours, unit: 'h' })} pour ${formatDuration(x.r.maxOutage)} d'arrêt tolérable${slow.length > 1 ? ` (et ${slow.length - 1} autre(s))` : ''}. Raccourcir le délai ou renforcer la parade (stock tampon, relais plus proche).`);
  }
  const orangeNoPlan = all.filter(x => x.z === 'medium' && x.st === 'uncovered');
  if (orangeNoPlan.length) push('uncovered-medium', 'warn', 'Risque à surveiller sans Plan B', `${names(orangeNoPlan)}.`);
  const expired = all.filter(x => x.st === 'expired');
  if (expired.length) push('expired', 'warn', 'Test périmé', `${names(expired)}.`);
  const soon = all.filter(x => x.st === 'tested' && (parseDate(testDueDate(x.r))?.getTime() ?? Infinity) - startOfDay(today).getTime() <= 30 * dayMs);
  if (soon.length) push('soon', 'warn', 'Test à planifier sous 30 jours', names(soon) + '.');
  const unrated = all.filter(x => x.st === 'unrated');
  if (unrated.length) push('unrated', 'warn', 'Risque à coter', `${names(unrated)}.`);
  const noOwner = all.filter(x => !x.r.owner.trim());
  if (noOwner.length) push('owner', 'warn', 'Responsable à désigner', names(noOwner) + '.');
  const stale = staleContacts(s, today);
  if (stale.length) push('contacts', 'warn', 'Numéros à vérifier', `${stale.slice(0, 3).map(contactLabel).join(', ')}${stale.length > 3 ? ` et ${stale.length - 3} autre(s)` : ''} : pas vérifié(s) depuis plus d'un an (annuaire).`);
  const review = all.filter(x => x.st !== 'unrated' && x.r.ratedAt && ageDays(x.r.ratedAt, today) > 365);
  if (review.length) push('review', 'warn', 'Revue annuelle des cotations', `${names(review)} : cotation de plus d'un an, à revoir.`);
  if (!out.length) push('ok', 'good', 'Plans B sous contrôle', 'Chaque risque orange ou rouge a un Plan B testé à temps.');
  return out;
}

export function newRisk(processId: string, today = new Date()): Risk {
  return {
    id: `risk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, processId, createdAt: isoDate(today),
    title: '', resource: '', signal: '', maxOutage: null, owner: '',
    whys: ['', '', '', '', ''], cause: '', gravity: null, likelihood: null,
    family: '', planB: '', relay: '', activation: null,
    firstHour: '', contactIds: [], notifyIds: [], access: '', sacrifice: '', deputy: '', testMethod: '', testCriterion: '', tests: [],
  };
}
