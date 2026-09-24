// Business continuity engine (tool 1.2): criticality, readiness state, tests, exposure. Pure functions, covered by risk.test.ts.
import type { Action, Risk, RiskState, Scale, Settings, State } from './types';
import { isoDate, parseDate } from './periods';
import { formatValue } from './numbers';

export const TEST_VALIDITY_DAYS = 180;

// ---- criticality: gravity x likelihood (1 to 16)
export const score = (r: Risk) => r.gravity * r.likelihood;
export type Zone = 'low' | 'medium' | 'high';
export const zoneOf = (sc: number): Zone => sc >= 9 ? 'high' : sc >= 4 ? 'medium' : 'low';
export const ZONE_LABEL: Record<Zone, string> = { low: 'Faible', medium: 'À surveiller', high: 'Critique' };

// Gravity levels anchored in euros, scaled on the yearly revenue objective (0.2 %, 2 %, 8 %),
// plus consequences that are not money, so everyone rates the same way
const round2 = (v: number) => { const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(v, 1))) - 1); return Math.round(v / p) * p; };
export function gravityThresholds(settings: Pick<Settings, 'annualBudget'>): [number, number, number] {
  const b = settings.annualBudget > 0 ? settings.annualBudget : 600000;
  return [round2(b * 0.002), round2(b * 0.02), round2(b * 0.08)];
}

export function gravityScale(settings: Pick<Settings, 'annualBudget'>, showMoney = true) {
  const [a, b, c] = gravityThresholds(settings);
  const m = (v: number) => formatValue(v, '€');
  return [
    { level: 1 as Scale, label: 'Mineure', money: `moins de ${m(a)}`, text: 'gêne interne, rattrapée dans la journée' },
    { level: 2 as Scale, label: 'Sérieuse', money: `${m(a)} à ${m(b)}`, text: 'retard client rattrapable' },
    { level: 3 as Scale, label: 'Grave', money: `${m(b)} à ${m(c)}`, text: 'client important mécontent, pénalités' },
    { level: 4 as Scale, label: 'Critique', money: `plus de ${m(c)}`, text: "perte d'un client clé, accident, survie de l'entreprise" },
  ].map(x => ({ ...x, money: showMoney ? x.money : '' }));
}

export const LIKELIHOOD_SCALE = [
  { level: 1 as Scale, label: 'Rare', text: 'moins d\'une fois en 10 ans', perYear: 0.05 },
  { level: 2 as Scale, label: 'Possible', text: 'une fois en 3 à 10 ans', perYear: 0.2 },
  { level: 3 as Scale, label: 'Probable', text: 'une fois en 1 à 3 ans', perYear: 0.5 },
  { level: 4 as Scale, label: 'Fréquent', text: 'au moins une fois par an', perYear: 1 },
];

// ---- money (optional): loss for one event, suggested gravity, yearly exposure, Plan B payback
export function lossPerEvent(r: Risk): number | null {
  const c = r.cost;
  return c && c.perDay !== null && c.daysWithout !== null ? c.perDay * c.daysWithout : null;
}
export function suggestedGravity(r: Risk, settings: Pick<Settings, 'annualBudget'>): Scale | null {
  const loss = lossPerEvent(r);
  if (loss === null) return null;
  const [a, b, c] = gravityThresholds(settings);
  return loss < a ? 1 : loss < b ? 2 : loss < c ? 3 : 4;
}
export function yearlyExposure(r: Risk): number | null {
  const loss = lossPerEvent(r);
  return loss === null ? null : loss * LIKELIHOOD_SCALE[r.likelihood - 1].perYear;
}
// Loss avoided per event thanks to the Plan B, and years to pay back its cost
export function planBGain(r: Risk): { avoided: number; paybackYears: number | null } | null {
  const c = r.cost;
  if (!c || c.perDay === null || c.daysWithout === null || c.daysWith === null) return null;
  const avoided = Math.max(0, c.perDay * (c.daysWithout - c.daysWith));
  const perYear = avoided * LIKELIHOOD_SCALE[r.likelihood - 1].perYear;
  return { avoided, paybackYears: c.planBCost && perYear > 0 ? c.planBCost / perYear : null };
}

// ---- tests and readiness
export const lastTest = (r: Risk) => [...r.tests].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
const dayMs = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Date the last successful test expires (null if never tested successfully)
export function testDueDate(r: Risk): string {
  const t = lastTest(r);
  const d = t?.ok ? parseDate(t.date) : null;
  return d ? isoDate(new Date(d.getTime() + TEST_VALIDITY_DAYS * dayMs)) : '';
}

export const actionsOfRisk = (s: State, riskId: string): Action[] =>
  Object.values(s.actions).filter(a => a.riskId === riskId).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
const open = (a: Action) => a.status === 'to_start' || a.status === 'in_progress';

// A Plan B exists only once prepared, then tested: the state is computed, never guessed from words
export function riskState(s: State, r: Risk, today = new Date()): RiskState {
  if (!r.planB.trim()) return 'uncovered';
  const t = lastTest(r);
  if (t && !t.ok) return 'failed';
  const d = t ? parseDate(t.date) : null;
  if (d) return startOfDay(today).getTime() - d.getTime() <= TEST_VALIDITY_DAYS * dayMs ? 'tested' : 'expired';
  return actionsOfRisk(s, r.id).some(open) ? 'preparing' : 'ready';
}

export const STATE_INFO: Record<RiskState, { label: string; tone: 'ok' | 'warn' | 'alert' | 'pending'; order: number }> = {
  uncovered: { label: 'Non couvert', tone: 'alert', order: 0 },
  failed: { label: 'Test raté', tone: 'alert', order: 1 },
  expired: { label: 'Test périmé', tone: 'warn', order: 2 },
  preparing: { label: 'Plan B à préparer', tone: 'warn', order: 3 },
  ready: { label: 'Prêt, à tester', tone: 'pending', order: 4 },
  tested: { label: 'Testé', tone: 'ok', order: 5 },
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
export const risksInOrder = (s: State, today = new Date()) =>
  Object.values(s.risks).sort((a, b) => score(b) - score(a) || STATE_INFO[riskState(s, a, today)].order - STATE_INFO[riskState(s, b, today)].order || a.title.localeCompare(b.title));

export function riskSummary(s: State, today = new Date()) {
  const risks = Object.values(s.risks);
  const states = risks.map(r => ({ r, st: riskState(s, r, today) }));
  const total = risks.reduce((a, r) => a + score(r), 0);
  const tested = states.filter(x => x.st === 'tested').reduce((a, x) => a + score(x.r), 0);
  const count = (st: RiskState) => states.filter(x => x.st === st).length;
  const exposures = risks.map(yearlyExposure).filter((v): v is number => v !== null);
  return {
    count: risks.length,
    critical: risks.filter(r => zoneOf(score(r)) === 'high').length,
    coveragePct: total ? Math.round((tested / total) * 100) : null,   // share of the criticality whose Plan B is tested
    toTest: states.filter(x => ['failed', 'expired', 'ready'].includes(x.st)).length,
    byState: Object.fromEntries((Object.keys(STATE_INFO) as RiskState[]).map(k => [k, count(k)])) as Record<RiskState, number>,
    exposure: exposures.length ? exposures.reduce((a, b) => a + b, 0) : null,
    exposureCount: exposures.length,
  };
}

export interface RiskInsight { key: string; tone: 'good' | 'warn' | 'bad'; title: string; text: string }

export function riskInsights(s: State, today = new Date()): RiskInsight[] {
  const out: RiskInsight[] = [];
  const all = risksInOrder(s, today).map(r => ({ r, st: riskState(s, r, today), z: zoneOf(score(r)) }));
  const names = (xs: typeof all) => xs.slice(0, 3).map(x => x.r.title).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
  const bad = all.filter(x => x.z === 'high' && x.st === 'uncovered');
  if (bad.length) out.push({ key: 'uncovered', tone: 'bad', title: 'Risque critique sans Plan B', text: `${names(bad)}. Priorité : écrire la parade et nommer son responsable.` });
  const failed = all.filter(x => x.st === 'failed');
  if (failed.length) out.push({ key: 'failed', tone: 'bad', title: 'Plan B raté au dernier test', text: `${names(failed)}. Ouvrir une action corrective puis tester de nouveau.` });
  const expired = all.filter(x => x.st === 'expired');
  if (expired.length) out.push({ key: 'expired', tone: 'warn', title: `Test de plus de ${TEST_VALIDITY_DAYS} jours`, text: `${names(expired)}. Un Plan B non testé depuis 6 mois n'est plus garanti (contacts, accès, relais).` });
  const soon = all.filter(x => x.st === 'tested' && (parseDate(testDueDate(x.r))?.getTime() ?? Infinity) - startOfDay(today).getTime() <= 30 * dayMs);
  if (soon.length) out.push({ key: 'soon', tone: 'warn', title: 'Test à planifier sous 30 jours', text: names(soon) + '.' });
  const noOwner = all.filter(x => !x.r.owner.trim());
  if (noOwner.length) out.push({ key: 'owner', tone: 'warn', title: 'Responsable à désigner', text: names(noOwner) + '.' });
  if (!out.length && all.length) out.push({ key: 'ok', tone: 'good', title: 'Plans B sous contrôle', text: 'Chaque risque critique a une parade, et les tests sont à jour.' });
  return out;
}

export function newRisk(processId: string, today = new Date()): Risk {
  return {
    id: `risk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, processId, createdAt: isoDate(today),
    title: '', resource: '', signal: '', maxOutage: '', owner: '',
    whys: ['', '', '', '', ''], cause: '', gravity: 2, likelihood: 2,
    family: '', planB: '', relay: '', activation: '',
    firstHour: '', contacts: '', access: '', sacrifice: '', deputy: '', testMethod: '', testCriterion: '', tests: [],
  };
}
