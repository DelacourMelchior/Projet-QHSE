// Tool 3.3, periodic checks: frequency, history, states, planning, observations, contract, instruments, calendar, to-dos and facts.
import { describe, expect, it } from 'vitest';
import type { CheckDone, CheckLife, EqCheck, Equipment, Params, State } from './types';
import {
  addEvery, addReserve, calibrationsDue, catalogue, CHECK_BY, CHECK_KIND, CHECK_STATE, checkFacts, checkState, checkTodos, contractFact, contractState, countsAsLate, DEFAULT_CATALOGUE,
  doneKey, dueIn, everyOf, EVERY_UNITS, formatEvery, historyOf, inNotice, koOf, lastDoneOf, lifeOf, liftReserve, markDone, newCheck, nextDue, observationProblem, openReserves, planCheck, removeDone,
  reserveLate, unplanCheck, upcoming,
} from './maintenanceChecks';
import { addDays, emptyTools } from './base';
import { isoDate } from './periods';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25, 10, 0);   // Friday 25 September 2026
const today = isoDate(now);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const eq = (over: Partial<Equipment> = {}): Equipment => ({ id: 'eq1', name: 'Presse plieuse', location: '', operator: '', manager: 'Marc D.', riskId: '', checkpoints: [], inspections: [], parts: [], ...over });
const chk = (over: Partial<EqCheck> = {}): EqCheck => ({ id: 'tk1', label: 'Extincteurs', everyDays: 365, lastDone: '', legal: false, every: { value: 1, unit: 'an' }, ...over });
// A check that falls due `n` days from today (negative: n days ago), never done before
const due = (n: number, over: Partial<EqCheck> = {}) => chk({ first: addDays(today, n), ...over });
const withChecks = (checks: EqCheck[], over: Partial<Equipment> = {}) => eq({ tasks: checks, ...over });
const sOf = (...es: Equipment[]) => st({ equipments: Object.fromEntries(es.map(e => [e.id, e])) });
const done = (date: string, over: Partial<CheckDone> = {}): CheckDone => ({ date, by: 'Marc D.', result: 'ok', note: '', ...over });
const IMPERATIVE = /^(commander|traiter|relancer|planifier|faire|lever|revoir|renouveler|appeler|prévoir|contrôler|vérifier|étalonner|programmer)\b/i;

describe('3.3 frequency', () => {
  it('adds days and weeks', () => {
    expect(addEvery('2026-09-25', { value: 10, unit: 'j' })).toBe('2026-10-05');
    expect(addEvery('2026-12-30', { value: 2, unit: 'sem' })).toBe('2027-01-13');
  });
  it('adds months on the same day, or on the last day of a shorter month', () => {
    expect(addEvery('2026-03-15', { value: 6, unit: 'mois' })).toBe('2026-09-15');
    expect(addEvery('2026-01-31', { value: 1, unit: 'mois' })).toBe('2026-02-28');
    expect(addEvery('2028-01-31', { value: 1, unit: 'mois' })).toBe('2028-02-29');
    expect(addEvery('2026-08-31', { value: 1, unit: 'mois' })).toBe('2026-09-30');
    expect(addEvery('2026-11-30', { value: 3, unit: 'mois' })).toBe('2027-02-28');
  });
  it('adds years, a leap day falling on the 28th of a normal year', () => {
    expect(addEvery('2026-09-25', { value: 1, unit: 'an' })).toBe('2027-09-25');
    expect(addEvery('2028-02-29', { value: 1, unit: 'an' })).toBe('2029-02-28');
    expect(addEvery('2028-02-29', { value: 4, unit: 'an' })).toBe('2032-02-29');
    // a real year: 365 days later would drift by one day every 4 years
    expect(addEvery('2027-03-01', { value: 1, unit: 'an' })).toBe('2028-03-01');
  });
  it('gives nothing for a date that cannot be read', () => {
    expect(addEvery('', { value: 1, unit: 'mois' })).toBe('');
    expect(addEvery('demain', { value: 1, unit: 'j' })).toBe('');
  });
  it('reads the frequency of a check: the new field wins, the first versions are in days', () => {
    expect(everyOf(chk({ every: { value: 6, unit: 'mois' }, everyDays: 365 }))).toEqual({ value: 6, unit: 'mois' });
    expect(everyOf({ id: 'a', label: '', everyDays: 182, lastDone: '', legal: false })).toEqual({ value: 182, unit: 'j' });
  });
  it('writes it in words', () => {
    expect(formatEvery({ value: 6, unit: 'mois' })).toBe('tous les 6 mois');
    expect(formatEvery({ value: 1, unit: 'an' })).toBe('chaque année');
    expect(formatEvery({ value: 1, unit: 'sem' })).toBe('chaque semaine');
    expect(formatEvery({ value: 2, unit: 'sem' })).toBe('toutes les 2 semaines');
    expect(formatEvery({ value: 1, unit: 'mois' })).toBe('chaque mois');
    expect(formatEvery({ value: 1, unit: 'j' })).toBe('chaque jour');
    expect(formatEvery({ value: 10, unit: 'j' })).toBe('tous les 10 jours');
    expect(formatEvery({ value: 2, unit: 'an' })).toBe('tous les 2 ans');
  });
  it('counts a frequency of 0 as 1 so that a check never falls due the day it was done', () => {
    expect(nextDue(eq({ tasks: [chk({ every: { value: 0, unit: 'mois' }, lastDone: '2026-09-01' })] }), chk({ every: { value: 0, unit: 'mois' }, lastDone: '2026-09-01' }))).toBe('2026-10-01');
    expect(formatEvery({ value: 0, unit: 'mois' })).toBe('chaque mois');
  });
  it('lists the units and the people who do the check', () => {
    expect(EVERY_UNITS.map(u => u.key)).toEqual(['j', 'sem', 'mois', 'an']);
    expect(Object.values(CHECK_BY)).toEqual(['Interne', 'Organisme agréé', 'Prestataire', 'Autre']);
    expect(Object.values(CHECK_KIND)).toEqual(['Contrôle périodique', "Étalonnage d'un instrument", 'Entretien préventif']);
  });
});

describe('3.3 catalogue and new check', () => {
  it('offers a neutral catalogue closed by "Autre"', () => {
    expect(DEFAULT_CATALOGUE).toHaveLength(10);
    expect(DEFAULT_CATALOGUE.at(-1)!.label).toBe('Autre');
    expect(DEFAULT_CATALOGUE.map(x => x.label)).toContain('Extincteurs');
    expect(DEFAULT_CATALOGUE.find(x => x.kind === 'instrument')).toBeTruthy();
    expect(DEFAULT_CATALOGUE.every(x => x.every.value >= 1)).toBe(true);
  });
  it('takes the catalogue of the settings when it holds something, the default one otherwise', () => {
    const p = (maint: Params['maint']): Params => ({ ...st().params, maint });
    expect(catalogue(p(undefined))).toBe(DEFAULT_CATALOGUE);
    expect(catalogue(p({ catalogue: [] }))).toBe(DEFAULT_CATALOGUE);
    expect(catalogue(p({ catalogue: [{ label: '  ', every: { value: 1, unit: 'an' } }] }))).toBe(DEFAULT_CATALOGUE);
    const own = catalogue(p({ catalogue: [{ label: 'Grue', every: { value: 3, unit: 'mois' }, legal: true }] }));
    expect(own.map(x => x.label)).toEqual(['Grue', 'Autre']);
    expect(catalogue(p({ catalogue: [{ label: 'Grue', every: { value: 3, unit: 'mois' } }, { label: 'autre', every: { value: 1, unit: 'an' } }] }))).toHaveLength(2);
  });
  it('creates a check with its identifier, its frequency in days and no date', () => {
    const c = newCheck('Extincteurs');
    expect(c.id).toMatch(/^tk_/);
    expect(c).toMatchObject({ label: 'Extincteurs', every: { value: 1, unit: 'an' }, everyDays: 365, legal: false, lastDone: '' });
    expect(c.kind).toBeUndefined();
    expect(newCheck('X', { value: 6, unit: 'mois' }, true, 'preventive')).toMatchObject({ everyDays: 183, legal: true, kind: 'preventive' });
    expect(newCheck('X', { value: 2, unit: 'sem' }).everyDays).toBe(14);
    expect(newCheck().id).not.toBe(newCheck().id);
  });
});

describe('3.3 history and next due date', () => {
  it('reads the last date of the first versions as the first line of history', () => {
    const c = chk({ lastDone: '2026-03-10' }), e = withChecks([c]);
    expect(historyOf(e, c)).toEqual([{ date: '2026-03-10', by: '', result: 'ok', note: '' }]);
    expect(lastDoneOf(e, c)).toBe('2026-03-10');
    expect(historyOf(eq(), chk())).toEqual([]);
    expect(lastDoneOf(eq(), chk())).toBe('');
  });
  it('lists the history from the most recent, and the history written wins over the old date', () => {
    const c = chk({ lastDone: '2025-01-01' });
    const e = withChecks([c], { checkLife: { tk1: { history: [done('2025-06-01'), done('2026-06-01'), done('2025-12-01')] } } });
    expect(historyOf(e, c).map(h => h.date)).toEqual(['2026-06-01', '2025-12-01', '2025-06-01']);
    expect(lastDoneOf(e, c)).toBe('2026-06-01');
    expect(lifeOf(eq(), chk())).toEqual({ history: [] });
  });
  it('falls due one frequency after the last time, on the first date before any, on nothing otherwise', () => {
    const c = chk({ every: { value: 6, unit: 'mois' }, lastDone: '2026-03-31' });
    expect(nextDue(withChecks([c]), c)).toBe('2026-09-30');
    const f = chk({ first: '2026-11-15' });
    expect(nextDue(withChecks([f]), f)).toBe('2026-11-15');
    expect(nextDue(eq(), chk())).toBe('');
    // the first date is only for a check never done
    const g = chk({ first: '2026-11-15', lastDone: '2026-01-10' });
    expect(nextDue(withChecks([g]), g)).toBe('2027-01-10');
  });
  it('counts the days before the due date, negative once past', () => {
    const a = due(10), b = due(-4), c = chk();
    expect(dueIn(withChecks([a]), a, now)).toBe(10);
    expect(dueIn(withChecks([b]), b, now)).toBe(-4);
    expect(dueIn(withChecks([c]), c, now)).toBeNull();
  });
});

describe('3.3 states of a check', () => {
  const state = (c: EqCheck, e = withChecks([c]), soon?: number) => checkState(e, c, now, soon);
  it('has no state to show for a check never dated', () => {
    expect(state(chk())).toBe('nodate');
  });
  it('is up to date beyond the notice, to plan inside it (30 days by default)', () => {
    expect(state(due(31))).toBe('ok');
    expect(state(due(30))).toBe('soon');
    expect(state(due(1))).toBe('soon');
  });
  it('is not late on the day itself, late from the day after', () => {
    expect(state(due(0))).toBe('soon');
    expect(state(due(-1))).toBe('late');
    expect(state(due(-200))).toBe('late');
  });
  it('follows the notice of the settings', () => {
    expect(state(due(45), undefined, 60)).toBe('soon');
    expect(state(due(45), undefined, 44)).toBe('ok');
    expect(state(due(45), undefined, 45)).toBe('soon');
  });
  it('is planned once a date is kept, unless the due date is past', () => {
    const c = due(20), e = planCheck(withChecks([c]), 'tk1', addDays(today, 10), 'Bureau Veritas');
    expect(state(c, e)).toBe('planned');
    expect(state(due(100), planCheck(withChecks([due(100)]), 'tk1', addDays(today, 90)))).toBe('planned');
    const late = due(-3);
    expect(state(late, planCheck(withChecks([late]), 'tk1', addDays(today, 5)))).toBe('late');
  });
  it('is up to date again after a check done, to plan again as its next date comes close', () => {
    const c = due(-3), e = markDone(withChecks([c]), 'tk1', done(today));
    expect(checkState(e, e.tasks![0], now)).toBe('ok');
    const later = new Date(2027, 7, 20, 10, 0);   // 36 days before the next date
    expect(checkState(e, e.tasks![0], later)).toBe('ok');
    expect(checkState(e, e.tasks![0], new Date(2027, 7, 27, 10, 0))).toBe('soon');
  });
  it('says each state with a label and a tone', () => {
    expect(CHECK_STATE.soon.label).toBe('À planifier');
    expect(Object.keys(CHECK_STATE)).toEqual(['nodate', 'ok', 'soon', 'planned', 'late', 'ko']);
    expect(CHECK_STATE.late.tone).toBe('alert');
    expect(CHECK_STATE.ko).toEqual({ label: 'Non conforme', tone: 'alert' });
    expect(new Set(Object.values(CHECK_STATE).map(x => x.label)).size).toBe(6);
  });
});

describe('3.3 moves on the checks', () => {
  it('writes a check done: one more line, planning over, date of the check up to date, input untouched', () => {
    const c = due(5), e0 = planCheck(withChecks([c]), 'tk1', addDays(today, 3), 'Prestataire X');
    const e = markDone(e0, 'tk1', done('2026-09-24', { report: 'photo:abc', note: 'RAS' }));
    expect(historyOf(e, e.tasks![0])).toEqual([{ ...done('2026-09-24', { report: 'photo:abc', note: 'RAS' }), id: expect.stringMatching(/^cd_/) }]);   // the line gets an id
    expect(lifeOf(e, c).plannedAt).toBeUndefined();
    expect(lifeOf(e, c).plannedWith).toBeUndefined();
    expect(e.tasks![0].lastDone).toBe('2026-09-24');
    expect(lifeOf(e0, c).plannedAt).toBe(addDays(today, 3));   // input untouched
    expect(e0.tasks![0].lastDone).toBe('');
  });
  it('keeps the date of the first versions as the first line when the history starts', () => {
    const c = chk({ lastDone: '2025-09-10' }), e = markDone(withChecks([c]), 'tk1', done('2026-09-12'));
    expect(historyOf(e, e.tasks![0]).map(h => h.date)).toEqual(['2026-09-12', '2025-09-10']);
    expect(nextDue(e, e.tasks![0])).toBe('2027-09-12');
  });
  it('does not take the date of the check back when an older check is written afterwards', () => {
    const e1 = markDone(withChecks([chk()]), 'tk1', done('2026-09-12')), e2 = markDone(e1, 'tk1', done('2026-03-01'));
    expect(e2.tasks![0].lastDone).toBe('2026-09-12');
    expect(historyOf(e2, e2.tasks![0])).toHaveLength(2);
  });
  it('leaves the equipment as it is for a check it does not have', () => {
    const e = withChecks([chk()]);
    expect(markDone(e, 'nope', done(today))).toBe(e);
    expect(planCheck(e, 'nope', today)).toBe(e);
    expect(addReserve(e, 'nope', 'x', today)).toBe(e);
  });
  it('plans and unplans, an empty date taking the planning off', () => {
    const e = planCheck(withChecks([due(20)]), 'tk1', '2026-10-05', ' Bureau X ');
    expect(lifeOf(e, e.tasks![0])).toMatchObject({ plannedAt: '2026-10-05', plannedWith: 'Bureau X' });
    expect(lifeOf(planCheck(e, 'tk1', '2026-10-06'), e.tasks![0])).toEqual({ history: [], plannedAt: '2026-10-06' });
    expect(lifeOf(unplanCheck(e, 'tk1'), e.tasks![0])).toEqual({ history: [] });
    expect(lifeOf(planCheck(e, 'tk1', ''), e.tasks![0])).toEqual({ history: [] });
  });
  it('adds observations to lift, with a limit date, and lifts them once', () => {
    let e = withChecks([chk(), chk({ id: 'tk2', label: 'Électricité' })]);
    e = addReserve(e, 'tk1', '  Fixer le support  ', '2026-10-10');
    e = addReserve(e, 'tk2', 'Remplacer un câble', '');
    e = addReserve(e, 'tk1', '   ', '2026-10-10');
    const open = openReserves(e);
    expect(open.map(x => x.reserve.text)).toEqual(['Fixer le support', 'Remplacer un câble']);   // the one without a limit last
    expect(open[0].check.id).toBe('tk1');
    expect(open[0].reserve).toMatchObject({ due: '2026-10-10', liftedAt: '' });
    expect(open[0].reserve.id).toMatch(/^rs_/);
    const lifted = liftReserve(e, 'tk1', open[0].reserve.id, '2026-09-30');
    expect(openReserves(lifted).map(x => x.reserve.text)).toEqual(['Remplacer un câble']);
    // lifting again keeps the first date
    const again = liftReserve(lifted, 'tk1', open[0].reserve.id, '2026-10-02');
    expect(lifeOf(again, again.tasks![0]).reserves![0].liftedAt).toBe('2026-09-30');
  });
  it('is late once the limit is past, never when lifted or without limit', () => {
    expect(reserveLate({ id: 'r', text: 'x', due: today, liftedAt: '' }, now)).toBe(false);
    expect(reserveLate({ id: 'r', text: 'x', due: addDays(today, -1), liftedAt: '' }, now)).toBe(true);
    expect(reserveLate({ id: 'r', text: 'x', due: addDays(today, 1), liftedAt: '' }, now)).toBe(false);
    expect(reserveLate({ id: 'r', text: 'x', due: addDays(today, -9), liftedAt: today }, now)).toBe(false);
    expect(reserveLate({ id: 'r', text: 'x', due: '', liftedAt: '' }, now)).toBe(false);
  });
});

describe('3.3 maintenance contract', () => {
  const ct = (n: number, provider = 'Hydrotech') => eq({ contract: { provider, until: addDays(today, n) } });
  it('is none without a contract or a date, up to date, soon within 60 days, ended once past', () => {
    expect(contractState(eq(), now)).toBe('none');
    expect(contractState(eq({ contract: { provider: 'X', until: '' } }), now)).toBe('none');
    expect(contractState(ct(61), now)).toBe('ok');
    expect(contractState(ct(60), now)).toBe('soon');
    expect(contractState(ct(0), now)).toBe('soon');
    expect(contractState(ct(-1), now)).toBe('ended');
    expect(contractState(ct(100), now, 120)).toBe('soon');
  });
  it('states the fact in words', () => {
    // "expire" while the end is to come, "échu" only once it is past: never "échu dans N jours"
    expect(contractFact(ct(45), now)).toBe('contrat de Hydrotech expire dans 45 jours');
    expect(contractFact(ct(1), now)).toBe('contrat de Hydrotech expire dans 1 jour');
    expect(contractFact(ct(0), now)).toBe("contrat de Hydrotech expire aujourd'hui");
    expect(contractFact(ct(-1), now)).toBe('contrat de Hydrotech échu depuis 1 jour');
    expect(contractFact(ct(-12), now)).toBe('contrat de Hydrotech échu depuis 12 jours');
    expect(contractFact(ct(10, ' '), now)).toBe('contrat de maintenance expire dans 10 jours');
    expect(contractFact(eq(), now)).toBe('');
  });
});

describe('3.3 measuring instruments', () => {
  it('finds the calibrations past or inside the notice, the nearest first', () => {
    const key = eq({ id: 'cle', name: 'Clé dynamométrique', kind: 'instrument', tasks: [chk({ id: 'c1', label: 'Étalonnage', first: addDays(today, 12) })] });
    const press = eq({ id: 'pr', name: 'Presse', tasks: [chk({ id: 'p1', label: 'Électricité', first: addDays(today, 3) }), chk({ id: 'p2', label: 'Étalonnage manomètre', kind: 'instrument', first: addDays(today, -5) })] });
    const out = calibrationsDue(sOf(key, press), now);
    expect(out.map(x => [x.e.id, x.c.id, x.days])).toEqual([['pr', 'p2', -5], ['cle', 'c1', 12]]);
  });
  it('leaves out what is far, undated, retired, or a preventive check of an instrument', () => {
    const far = eq({ id: 'a', kind: 'instrument', tasks: [chk({ first: addDays(today, 90) })] });
    const none = eq({ id: 'b', kind: 'instrument', tasks: [chk()] });
    const gone = eq({ id: 'c', kind: 'instrument', retiredAt: '2026-01-01', tasks: [chk({ first: addDays(today, -5) })] });
    const prev = eq({ id: 'd', kind: 'instrument', tasks: [chk({ kind: 'preventive', first: addDays(today, 2) })] });
    expect(calibrationsDue(sOf(far, none, gone, prev), now)).toEqual([]);
    expect(calibrationsDue(sOf(far), now, 120)).toHaveLength(1);
  });
  it('takes the notice of the settings', () => {
    const e = eq({ kind: 'instrument', tasks: [chk({ first: addDays(today, 45) })] });
    expect(calibrationsDue(sOf(e), now)).toHaveLength(0);
    expect(calibrationsDue({ ...sOf(e), params: { ...st().params, maint: { soonDays: 60 } } }, now)).toHaveLength(1);
  });
});

describe('3.3 calendar of the next 12 months', () => {
  it('groups the due dates by calendar month, the ones past going to the first month', () => {
    const e = eq({ tasks: [
      chk({ id: 'a', label: 'En retard', first: '2026-07-10', legal: true }), chk({ id: 'b', label: 'Ce mois', first: '2026-09-28' }),
      chk({ id: 'c', label: 'Janvier', first: '2027-01-05' }), chk({ id: 'd', label: 'Octobre', first: '2026-10-02' }), chk({ id: 'e', label: 'Sans date' }),
    ] });
    const cal = upcoming(sOf(e), now);
    expect(cal.map(m => m.month)).toEqual(['2026-09', '2026-10', '2027-01']);
    expect(cal[0].items.map(i => [i.label, i.state])).toEqual([['En retard', 'late'], ['Ce mois', 'soon']]);
    expect(cal[0].items[0]).toMatchObject({ eqId: 'eq1', checkId: 'a', eqName: 'Presse plieuse', due: '2026-07-10', legal: true });
    expect(cal[2].items[0].state).toBe('ok');
  });
  it('stops after the number of months asked, with a year change', () => {
    const e = eq({ tasks: [chk({ id: 'a', first: '2027-08-31' }), chk({ id: 'b', first: '2027-09-01' }), chk({ id: 'c', first: '2026-12-31' })] });
    expect(upcoming(sOf(e), now).map(m => m.month)).toEqual(['2026-12', '2027-08']);
    // September, October, November: December is the 4th month
    expect(upcoming(sOf(e), now, 3)).toEqual([]);
    expect(upcoming(sOf(e), now, 4).map(m => m.month)).toEqual(['2026-12']);
    expect(upcoming(sOf(e), now, 13).map(m => m.month)).toEqual(['2026-12', '2027-08', '2027-09']);
  });
  it('leaves out the retired equipment, sorts the month by date then by equipment, and shows planned checks', () => {
    const a = eq({ id: 'a', name: 'Zébu', tasks: [chk({ id: 'x', first: '2026-10-20' })] });
    const b = eq({ id: 'b', name: 'Alpha', tasks: [chk({ id: 'y', first: '2026-10-20' }), chk({ id: 'z', first: '2026-10-03' })] });
    const r = eq({ id: 'r', name: 'Retiré', retiredAt: '2026-05-01', tasks: [chk({ id: 'w', first: '2026-10-01' })] });
    const items = upcoming(sOf(a, b, r), now)[0].items;
    expect(items.map(i => [i.eqName, i.due])).toEqual([['Alpha', '2026-10-03'], ['Alpha', '2026-10-20'], ['Zébu', '2026-10-20']]);
    expect(upcoming(sOf(planCheck(a, 'x', '2026-10-10')), now)[0].items[0].state).toBe('planned');
    expect(upcoming(st(), now)).toEqual([]);
  });
});

describe('3.3 to-dos of the checks', () => {
  it('asks for a late check: urgent when marked mandatory, normal otherwise, with the manager and the due date', () => {
    const e = withChecks([due(-12, { id: 'a', label: 'Extincteurs', legal: true }), due(-2, { id: 'b', label: 'Entretien' })]);
    const todos = checkTodos(sOf(e), now);
    expect(todos).toHaveLength(2);
    const a = todos.find(t => t.ref === 'a')!, b = todos.find(t => t.ref === 'b')!;
    expect(a).toMatchObject({ kind: 'check', tone: 'bad', who: 'Marc D.', due: addDays(today, -12), eqId: 'eq1' });
    expect(a.text).toBe('Faire le contrôle « Extincteurs » (Presse plieuse), échu depuis 12 jours');
    expect(b).toMatchObject({ kind: 'check', tone: 'warn', due: addDays(today, -2) });
    expect(new Set(todos.map(t => t.id)).size).toBe(2);
  });
  it('asks to plan a check that falls due inside the notice, nothing to plan for a planned or up to date one (a planned one has its own to-do, see below)', () => {
    const e = withChecks([due(20, { id: 'a' }), due(25, { id: 'b' }), due(90, { id: 'c' }), chk({ id: 'd' })]);
    const planned = planCheck(e, 'b', addDays(today, 15));
    const todos = checkTodos(sOf(planned), now);
    // before the lot 1 the planned check and the check without date made no to-do; now: planned = "prévu le", no date = "renseigner la date"
    expect(todos.map(t => [t.ref, t.text.split(' ')[0]])).toEqual([['a', 'Planifier'], ['b', 'Contrôle'], ['d', 'Renseigner']]);
    expect(todos[0]).toMatchObject({ tone: 'warn', due: addDays(today, 20) });
    expect(todos[0].text).toBe('Planifier le contrôle « Extincteurs » (Presse plieuse), échéance dans 20 jours');
    expect(checkTodos(sOf(withChecks([due(0)])), now)[0].text).toContain("échéance aujourd'hui");
  });
  it('still asks for a check planned but past its due date, saying when it was planned', () => {
    const e = planCheck(withChecks([due(-3, { legal: true })]), 'tk1', addDays(today, 4));
    const t = checkTodos(sOf(e), now)[0];
    expect(t.tone).toBe('bad');
    expect(t.text).toContain('échu depuis 3 jours');
    expect(t.text).toContain('planifié le ');
  });
  it('asks to lift an observation, urgent once its limit is past', () => {
    let e = withChecks([chk()]);
    e = addReserve(e, 'tk1', 'Fixer le support', addDays(today, 5));
    e = addReserve(e, 'tk1', 'Changer le joint', addDays(today, -4));
    e = addReserve(e, 'tk1', 'Nettoyer', '');
    const todos = checkTodos(sOf(e), now).filter(t => t.kind === 'remark');
    expect(todos).toHaveLength(3);
    const late = todos.find(t => t.text.includes('Changer le joint'))!;
    expect(late).toMatchObject({ tone: 'bad', who: 'Marc D.', due: addDays(today, -4) });
    expect(late.text).toContain('en retard de 4 jours');
    expect(todos.find(t => t.text.includes('Fixer'))).toMatchObject({ tone: 'warn', due: addDays(today, 5) });
    expect(todos.find(t => t.text.includes('Nettoyer'))).toMatchObject({ tone: 'warn', due: '' });
    // the reference leads to the observation, the screen finds the check with openReserves
    expect(openReserves(e).some(x => x.reserve.id === late.ref)).toBe(true);
    expect(new Set(todos.map(t => t.id)).size).toBe(3);
    // lifted: nothing left
    expect(checkTodos(sOf(liftReserve(e, 'tk1', late.ref!, today)), now).filter(t => t.kind === 'remark')).toHaveLength(2);
  });
  it('asks to review a contract that ends soon or ended', () => {
    const soon = eq({ id: 'a', name: 'Presse', manager: 'Eve', contract: { provider: 'Hydrotech', until: addDays(today, 45) } });
    const ended = eq({ id: 'b', name: 'Four', contract: { provider: 'Therma', until: addDays(today, -3) } });
    const fine = eq({ id: 'c', contract: { provider: 'X', until: addDays(today, 200) } });
    const todos = checkTodos(sOf(soon, ended, fine), now);
    expect(todos.map(t => t.kind)).toEqual(['contract', 'contract']);
    expect(todos[0]).toMatchObject({ tone: 'warn', who: 'Eve', due: addDays(today, 45), eqId: 'a', text: 'Revoir le contrat de Hydrotech (Presse), expire dans 45 jours' });
    expect(todos[1].text).toBe('Revoir le contrat de Therma (Four), échu depuis 3 jours');
    expect(new Set(todos.map(t => t.id)).size).toBe(2);
  });
  it('leaves the retired equipment out and reads the checks of the first versions', () => {
    const old = eq({ tasks: [chk({ lastDone: '2025-06-01', legal: true })] });   // done 2025-06-01, every year: due 2026-06-01
    expect(checkTodos(sOf(old), now)[0]).toMatchObject({ kind: 'check', tone: 'bad', due: '2026-06-01' });
    expect(checkTodos(sOf({ ...old, retiredAt: '2026-08-01' }), now)).toEqual([]);
    const gone = eq({ retiredAt: '2026-08-01', contract: { provider: 'X', until: addDays(today, 3) }, tasks: [due(-5)] });
    expect(checkTodos(sOf(gone), now)).toEqual([]);
    expect(checkTodos(st(), now)).toEqual([]);
  });
  it('leaves the manager empty when nobody is named, and follows the notice of the settings', () => {
    const e = eq({ manager: '', tasks: [due(45)] });
    expect(checkTodos(sOf(e), now)).toEqual([]);
    const s = { ...sOf(e), params: { ...st().params, maint: { soonDays: 60 } } };
    expect(checkTodos(s, now)[0]).toMatchObject({ who: '', tone: 'warn' });
  });
});

describe('3.3 facts of the checks', () => {
  const rich = () => {
    let e = eq({ id: 'e1', name: 'Presse', tasks: [due(-12, { id: 'a', label: 'Extincteurs', legal: true }), due(-2, { id: 'b', label: 'Entretien' }), due(14, { id: 'c', label: 'Électricité' })], contract: { provider: 'Hydrotech', until: addDays(today, 45) } });
    e = addReserve(e, 'c', 'Fixer le support', addDays(today, -2));
    const key = eq({ id: 'e2', name: 'Clé 2,5 Nm', kind: 'instrument', tasks: [chk({ id: 'k', label: 'Étalonnage', first: addDays(today, 20) })] });
    return sOf(e, key);
  };
  it('states the late checks with the ones marked mandatory, never the law', () => {
    const f = checkFacts(rich(), now).find(x => x.key === 'check-late')!;
    expect(f).toMatchObject({ tone: 'bad', title: 'Contrôles échus' });
    expect(f.text).toBe('Extincteurs (Presse, depuis 12 jours), Entretien (Presse, depuis 2 jours), dont 1 marqué obligatoire.');
    const soft = checkFacts(sOf(eq({ tasks: [due(-2)] })), now)[0];
    expect(soft.tone).toBe('warn');
    expect(soft.text).not.toContain('obligatoire');
  });
  it('states the checks to plan, the observations, the calibrations and the contracts', () => {
    const facts = checkFacts(rich(), now), key = (k: string) => facts.find(x => x.key === k)!;
    expect(key('check-soon').text).toBe('Électricité (Presse, dans 14 jours).');
    expect(key('check-remark')).toMatchObject({ tone: 'bad' });
    expect(key('check-remark').text).toBe('Fixer le support (Électricité, Presse), dont 1 en retard.');
    expect(key('check-calib').text).toBe('Clé 2,5 Nm (Étalonnage, à étalonner dans 20 jours).');
    expect(key('check-calib').tone).toBe('warn');
    expect(key('check-contract').text).toBe('Presse : contrat de Hydrotech expire dans 45 jours.');
    expect(facts.map(x => x.key)).toEqual(['check-late', 'check-soon', 'check-remark', 'check-calib', 'check-contract']);
  });
  it('shows a calibration once: in its own fact, not among the late or soon checks', () => {
    const e = eq({ kind: 'instrument', name: 'Jauge', tasks: [due(-6, { label: 'Étalonnage', legal: true })] });
    const facts = checkFacts(sOf(e), now);
    expect(facts.map(f => f.key)).toEqual(['check-calib']);
    expect(facts[0]).toMatchObject({ tone: 'bad', text: 'Jauge (Étalonnage, échu depuis 6 jours).' });
  });
  it('says nothing when all is in order, and nothing for the retired equipment', () => {
    expect(checkFacts(st(), now)).toEqual([]);
    expect(checkFacts(sOf(eq({ tasks: [due(200)], contract: { provider: 'X', until: addDays(today, 300) } })), now)).toEqual([]);
    const gone = eq({ retiredAt: '2026-08-01', tasks: [due(-30, { legal: true })], contract: { provider: 'X', until: addDays(today, 3) } });
    expect(checkFacts(sOf(gone), now)).toEqual([]);
  });
  it('lists three names then counts the others', () => {
    const e = eq({ tasks: ['a', 'b', 'c', 'd', 'e'].map(id => due(-3, { id, label: id.toUpperCase() })) });
    expect(checkFacts(sOf(e), now)[0].text).toBe('A (Presse plieuse, depuis 3 jours), B (Presse plieuse, depuis 3 jours), C (Presse plieuse, depuis 3 jours) et 2 autre(s).');
  });
  it('gives no order in a fact, and never speaks of a regulatory obligation', () => {
    const facts = checkFacts(rich(), now);
    expect(facts.length).toBeGreaterThan(4);
    for (const f of facts) {
      expect(f.title).not.toMatch(IMPERATIVE);
      expect(f.text).not.toMatch(IMPERATIVE);
      expect(`${f.title} ${f.text}`).not.toMatch(/obligation|réglementaire|il faut|doit|devez|\b\p{L}+ez\b/iu);
    }
    // a to-do text is an infinitive, never an imperative of the second person
    for (const t of checkTodos(rich(), now)) expect(t.text).not.toMatch(/^\p{L}+ez\b/u);
  });
});

// ---- lot 0, no data lost: lines of history with an id, removing a line
describe('3.3 lines of history: ids and removal', () => {
  it('gives an id to the line written, keeps the id it has, and leaves the older lines as they are', () => {
    const e1 = markDone(withChecks([chk()]), 'tk1', done('2026-09-12')), e2 = markDone(e1, 'tk1', { ...done('2026-09-20'), id: 'cd_mine' }), e3 = markDone(e2, 'tk1', done('2026-09-21'));
    const h = lifeOf(e3, e3.tasks![0]).history;
    expect(h.map(x => x.id)).toEqual([h[0].id, 'cd_mine', h[2].id]);
    expect(h[0].id).toMatch(/^cd_/);
    expect(new Set(h.map(x => x.id)).size).toBe(3);
    // a line of the first versions (no id) stays without one: two copies of the data make the same line, not two
    const old = withChecks([chk()], { checkLife: { tk1: { history: [{ date: '2025-01-01', by: 'Marc D.', result: 'ok', note: '' }] } } });
    expect(lifeOf(markDone(old, 'tk1', done('2026-09-12')), old.tasks![0]).history[0]).not.toHaveProperty('id');
    // the date of the first versions becomes a line without id, the same on every device
    const legacy = markDone(withChecks([chk({ lastDone: '2025-09-10' })]), 'tk1', done('2026-09-12'));
    expect(lifeOf(legacy, legacy.tasks![0]).history[0]).toEqual({ date: '2025-09-10', by: '', result: 'ok', note: '' });
  });
  it('tells a line by its id, or by its content when it has none', () => {
    expect(doneKey({ ...done('2026-09-12'), id: 'cd1' })).toBe('cd1');
    expect(doneKey(done('2026-09-12', { note: 'RAS' }))).toBe('2026-09-12|Marc D.|ok|RAS');
  });
  it('removes a line by its id: the date of the check follows what is left, the id goes into `gone`', () => {
    let e = markDone(withChecks([chk()]), 'tk1', { ...done('2026-03-01'), id: 'cd1' });
    e = markDone(e, 'tk1', { ...done('2026-09-12'), id: 'cd2' });
    const out = removeDone(e, 'tk1', 'cd2');
    expect(historyOf(out, out.tasks![0]).map(h => h.id)).toEqual(['cd1']);
    expect(out.tasks![0].lastDone).toBe('2026-03-01');
    expect(nextDue(out, out.tasks![0])).toBe('2027-03-01');
    expect(out.gone).toEqual(['cd2']);
    expect(lifeOf(e, e.tasks![0]).history).toHaveLength(2);   // input untouched
    expect(removeDone(e, 'tk1', 'nope')).toBe(e);
    expect(removeDone(e, 'nope', 'cd2')).toBe(e);
  });
  it('removes the only line without bringing back the date of the first versions, and keeps the planning', () => {
    const e = planCheck(markDone(withChecks([chk()]), 'tk1', { ...done('2026-09-12'), id: 'cd1' }), 'tk1', '2027-09-01');
    const out = removeDone(e, 'tk1', 'cd1');
    expect(historyOf(out, out.tasks![0])).toEqual([]);   // the date of the check went back to nothing, no line made up from it
    expect(out.tasks![0].lastDone).toBe('');
    expect(lifeOf(out, out.tasks![0]).plannedAt).toBe('2027-09-01');
    expect(checkState(out, out.tasks![0], now)).toBe('planned');
  });
  it('removes a line of the first versions by its content, the date of the first versions included', () => {
    const e = withChecks([chk({ lastDone: '2026-01-01' })], { checkLife: { tk1: { history: [{ date: '2025-01-01', by: 'Marc D.', result: 'ok', note: 'vieux' }, { date: '2026-01-01', by: '', result: 'ok', note: '' }] } } });
    const out = removeDone(e, 'tk1', '2025-01-01|Marc D.|ok|vieux');
    expect(historyOf(out, out.tasks![0]).map(h => h.date)).toEqual(['2026-01-01']);
    expect(out.gone).toEqual(['2025-01-01|Marc D.|ok|vieux']);
    const lastOnly = withChecks([chk({ lastDone: '2025-09-10' })]);
    const gone = removeDone(lastOnly, 'tk1', doneKey({ date: '2025-09-10', by: '', result: 'ok', note: '' }));
    expect(historyOf(gone, gone.tasks![0])).toEqual([]);
    expect(nextDue(gone, gone.tasks![0])).toBe('');
  });
});

// ---- lot 1, the rules: a check "non conforme", a check without date, a planning, the contract wording, the day of the month
const ago = (n: number) => addDays(today, -n);   // today = 2026-09-25
const INFINITIVE = /^(commander|traiter|relancer|planifier|faire|lever|revoir|renouveler|appeler|prévoir|contrôler|vérifier|étalonner|programmer|reprendre|renseigner|noter|refaire|replanifier|rétablir|remplacer)\b/i;
// An equipment whose checks are given as [id, label, legal, history, rest of the life]
const kit = (id: string, name: string, manager: string, specs: [string, string, boolean, CheckDone[], Partial<CheckLife>?][], over: Partial<Equipment> = {}) => eq({
  id, name, manager, tasks: specs.map(([cid, label, legal]) => chk({ id: cid, label, legal })),
  checkLife: Object.fromEntries(specs.map(([cid, , , history, rest]) => [cid, { history, ...rest }])), ...over,
});
const stateOf = (e: Equipment, at = now) => Object.fromEntries((e.tasks || []).map(c => [c.id, checkState(e, c, at)]));

describe('3.3 a check noted "non conforme" (lot 1, 3.1)', () => {
  const press = kit('a', 'Presse A', 'Marc D.', [
    ['ext', 'Extincteurs', true, [done(ago(5), { result: 'ko' })]],
    ['elec', 'Électricité', true, [done(ago(5))]],
    ['lev', 'Levage', true, [done(ago(9), { result: 'remarks' })]],
    ['ven', 'Ventilation', false, [done(ago(9), { result: 'remarks' })], { reserves: [{ id: 'rs1', text: 'Fixer le support', due: addDays(today, 10), liftedAt: '' }] }],
    ['pre', 'Préventif', false, [done(ago(30), { result: 'remarks' })], { reserves: [{ id: 'rs2', text: 'Changer le joint', due: ago(25), liftedAt: ago(20) }] }],
    ['old', 'Ancien', false, [done(ago(3), { result: 'remarks' })], { reserves: [{ id: 'rs3', text: "D'une autre fois", due: ago(30), liftedAt: ago(20) }] }],
    ['back', 'Refait', true, [done(ago(40), { result: 'ko' }), done(ago(10))]],
    ['rev', 'Défait', false, [done(ago(40)), done(ago(10), { result: 'ko' })]],
    ['same', 'Même jour A', false, [done(ago(6), { result: 'ko' }), done(ago(6))]],
    ['same2', 'Même jour B', false, [done(ago(6)), done(ago(6), { result: 'ko' })]],
  ]);
  const oven = kit('b', 'Four B', 'Eve', [['x1', 'Thermocouple', false, [done(ago(2), { result: 'ko' })]], ['x2', 'Brûleur', true, [done(ago(2))]]]);
  const gone = kit('c', 'Retiré C', 'Zoé', [['y1', 'Ancien contrôle', true, [done(ago(2), { result: 'ko' })]]], { retiredAt: '2026-01-01' });
  const s = sOf(press, oven, gone);

  it('is non conform while the last line says so, whatever the due date, and ends with a more recent line that is conform', () => {
    expect(stateOf(press)).toEqual({ ext: 'ko', elec: 'ok', lev: 'ko', ven: 'ok', pre: 'ok', old: 'ko', back: 'ok', rev: 'ko', same: 'ok', same2: 'ko' });
    expect(stateOf(oven)).toEqual({ x1: 'ko', x2: 'ok' });
    // the due date is far for all of them: the state does not come from it
    expect(dueIn(press, press.tasks![0], now)).toBe(360);
    expect(koOf(press, press.tasks![0])).toEqual(done(ago(5), { result: 'ko' }));
    expect(koOf(press, press.tasks![1])).toBeNull();
    // writing a conform line ends it, and removing that line brings it back
    const fixed = markDone(press, 'ext', done(today));
    expect(checkState(fixed, fixed.tasks![0], now)).toBe('ok');
    expect(checkState(fixed, fixed.tasks![1], now)).toBe('ok');
    const line = lifeOf(fixed, fixed.tasks![0]).history.at(-1)!;
    const back = removeDone(fixed, 'ext', doneKey(line));
    expect(checkState(back, back.tasks![0], now)).toBe('ko');
  });
  it('is "avec observations" and non conform only when no observation was written for that line', () => {
    expect(koOf(press, press.tasks![2])).toEqual(done(ago(9), { result: 'remarks' }));   // lev: none at all
    expect(koOf(press, press.tasks![3])).toBeNull();   // ven: one open
    expect(koOf(press, press.tasks![4])).toBeNull();   // pre: one lifted after the line
    expect(koOf(press, press.tasks![5])?.date).toBe(ago(3));   // old: the one lifted is from before the line, it was not written for it
    // an observation added to the line makes it followed by its own to-do; lifting it does not bring the state back
    const added = addReserve(press, 'lev', 'Serrer la poulie', addDays(today, 5));
    expect(checkState(added, added.tasks![2], now)).toBe('ok');
    const lifted = liftReserve(added, 'lev', openReserves(added).find(x => x.check.id === 'lev')!.reserve.id, today);
    expect(checkState(lifted, lifted.tasks![2], now)).toBe('ok');
    // "non conforme" is never covered by an observation
    const ko = addReserve(press, 'ext', 'Remplacer la tête', addDays(today, 5));
    expect(checkState(ko, ko.tasks![0], now)).toBe('ko');
  });
  it('asks for the check again, urgent when marked mandatory, dated the day it was noted', () => {
    const rows = checkTodos(s, now).filter(t => t.kind === 'check').map(t => [t.eqId, t.ref, t.tone, t.due, t.who, t.text]);
    expect(rows).toEqual([
      ['a', 'ext', 'bad', ago(5), 'Marc D.', 'Reprendre le contrôle « Extincteurs » (Presse A), non conforme le 20/09/2026'],
      ['a', 'lev', 'bad', ago(9), 'Marc D.', 'Reprendre le contrôle « Levage » (Presse A), noté « avec observations » le 16/09/2026, sans observation écrite'],
      ['a', 'old', 'warn', ago(3), 'Marc D.', 'Reprendre le contrôle « Ancien » (Presse A), noté « avec observations » le 22/09/2026, sans observation écrite'],
      ['a', 'rev', 'warn', ago(10), 'Marc D.', 'Reprendre le contrôle « Défait » (Presse A), non conforme le 15/09/2026'],
      ['a', 'same2', 'warn', ago(6), 'Marc D.', 'Reprendre le contrôle « Même jour B » (Presse A), non conforme le 19/09/2026'],
      ['b', 'x1', 'warn', ago(2), 'Eve', 'Reprendre le contrôle « Thermocouple » (Four B), non conforme le 23/09/2026'],
    ]);
    const t = checkTodos(s, now).find(x => x.ref === 'ext')!;
    expect(t).toMatchObject({ kind: 'check', id: 'checkaext', fact: 'Contrôle « Extincteurs » non conforme le 20/09/2026' });
    // the retired equipment says nothing
    expect(checkTodos(s, now).some(x => x.eqId === 'c')).toBe(false);
  });
  it('says it as a fact, with the ones marked mandatory, a calibration included', () => {
    const f = checkFacts(sOf(kit('a', 'Presse A', 'Marc D.', [
      ['ext', 'Extincteurs', true, [done(ago(5), { result: 'ko' })]], ['lev', 'Levage', true, [done(ago(9), { result: 'remarks' })]],
    ]), oven), now).find(x => x.key === 'check-ko')!;
    expect(f).toEqual({ key: 'check-ko', tone: 'bad', title: 'Contrôles non conformes', text: 'Extincteurs (Presse A, non conforme le 20/09/2026), Levage (Presse A, noté « avec observations » le 16/09/2026, sans observation écrite), Thermocouple (Four B, non conforme le 23/09/2026), dont 2 marqués obligatoires.' });
    const soft = checkFacts(sOf(oven), now);
    expect(soft).toEqual([{ key: 'check-ko', tone: 'warn', title: 'Contrôles non conformes', text: 'Thermocouple (Four B, non conforme le 23/09/2026).' }]);
    // a calibration that failed shows too, though its own fact only speaks of the ones falling due
    const cal = kit('i', 'Jauge', 'Eve', [['k', 'Étalonnage', false, [done(ago(4), { result: 'ko' })]]], { kind: 'instrument' });
    expect(checkFacts(sOf(cal), now).map(x => [x.key, x.text])).toEqual([['check-ko', 'Étalonnage (Jauge, non conforme le 21/09/2026).']]);
    expect(checkFacts(sOf(gone), now)).toEqual([]);
  });
  it('wins over the date and the planning, which it only mentions', () => {
    // done "non conforme" 400 days ago: due since 35 days, still non conform and not "échu"
    const e = kit('a', 'Presse A', 'Marc D.', [['ext', 'Extincteurs', true, [done(ago(400), { result: 'ko' })]]]);
    expect(dueIn(e, e.tasks![0], now)).toBe(-35);
    expect(checkState(e, e.tasks![0], now)).toBe('ko');
    expect(checkTodos(sOf(e), now)[0].text).toBe('Reprendre le contrôle « Extincteurs » (Presse A), non conforme le 21/08/2025');
    const planned = planCheck(e, 'ext', addDays(today, 7), 'Bureau X');
    expect(checkState(planned, planned.tasks![0], now)).toBe('ko');
    expect(checkTodos(sOf(planned), now)[0].text).toBe(`Reprendre le contrôle « Extincteurs » (Presse A), non conforme le 21/08/2025, planifié le 02/10/2026`);
    expect(checkTodos(sOf(planned), now)[0].fact).toBe('Contrôle « Extincteurs » non conforme le 21/08/2025, planifié le 02/10/2026');
    // a planning past on a non conform check is said in its own line, not once more as a planning without suite
    const missed = planCheck(e, 'ext', ago(2));
    expect(checkTodos(sOf(missed), now)[0].fact).toBe('Contrôle « Extincteurs » non conforme le 21/08/2025, planifié le 23/09/2026, pas noté fait');
    expect(checkFacts(sOf(missed), now).map(f => f.key)).toEqual(['check-ko']);
  });
  it('counts as late for the figures, with the ones past their date and nothing else', () => {
    expect((['nodate', 'ok', 'soon', 'planned', 'late', 'ko'] as const).map(countsAsLate)).toEqual([false, false, false, false, true, true]);
    const states = [press, oven].flatMap(e => e.tasks!.map(c => checkState(e, c, now)));
    expect(states.filter(countsAsLate)).toHaveLength(6);
  });
  it('shows in the calendar with its state', () => {
    const items = upcoming(sOf(oven), now, 13).flatMap(m => m.items);   // done 2 days ago: due in a year, the 13th month
    expect(items.map(i => [i.checkId, i.state])).toEqual([['x2', 'ok'], ['x1', 'ko']]);   // same day: by label
  });
  it('asks for at least one observation when the result is "avec observations", for nothing else', () => {
    const msg = "Le résultat « avec observations » n'a aucune observation écrite.";
    expect(observationProblem('remarks', [])).toBe(msg);
    expect(observationProblem('remarks', ['', '   '])).toBe(msg);
    expect(observationProblem('remarks', ['', 'Serrer'])).toBe('');
    expect(observationProblem('ko', [])).toBe('');
    expect(observationProblem('ok', [])).toBe('');
  });
});

describe('3.3 a check without any date (lot 1, 3.2)', () => {
  const a = kit('a', 'Presse A', 'Marc D.', [['n1', 'Extincteurs', true, []], ['n2', 'Électricité', false, []], ['d1', 'Levage', true, [done(ago(5))]]]);
  const b = eq({ id: 'b', name: 'Jauge B', kind: 'instrument', manager: 'Eve', tasks: [chk({ id: 'n3', label: 'Étalonnage' })] });
  const c = eq({ id: 'c', name: 'Retiré C', retiredAt: '2026-01-01', tasks: [chk({ id: 'n4', label: 'Vieux' })] });
  const dated = eq({ id: 'd', name: 'Daté D', tasks: [chk({ id: 'n5', label: 'Prévu', first: addDays(today, 200) })] });

  it('is a to-do that asks for the date, normal, without due date, for each check without any', () => {
    const rows = checkTodos(sOf(a, b, c, dated), now).map(t => [t.id, t.kind, t.ref, t.tone, t.due, t.who, t.text, t.fact]);
    expect(rows).toEqual([
      ['checkan1', 'check', 'n1', 'warn', '', 'Marc D.', 'Renseigner la date du contrôle « Extincteurs » (Presse A)', 'Contrôle « Extincteurs » sans date : ni contrôle noté, ni première échéance'],
      ['checkan2', 'check', 'n2', 'warn', '', 'Marc D.', 'Renseigner la date du contrôle « Électricité » (Presse A)', 'Contrôle « Électricité » sans date : ni contrôle noté, ni première échéance'],
      ['checkbn3', 'check', 'n3', 'warn', '', 'Eve', 'Renseigner la date du contrôle « Étalonnage » (Jauge B)', 'Contrôle « Étalonnage » sans date : ni contrôle noté, ni première échéance'],
    ]);
  });
  it('is a fact, the calibrations and the first one included, never the retired equipment', () => {
    const f = checkFacts(sOf(a, b, c, dated), now);
    expect(f).toEqual([{ key: 'check-nodate', tone: 'warn', title: 'Contrôles sans date', text: 'Extincteurs (Presse A), Électricité (Presse A), Étalonnage (Jauge B).' }]);
  });
  it('is not mute for a check added from the catalogue or left empty: it is born without a date, and has a to-do at once', () => {
    const fromCatalogue = withChecks([newCheck('Extincteurs', { value: 1, unit: 'an' }, true), newCheck()]);
    const todos = checkTodos(sOf(fromCatalogue), now);
    expect(todos.map(t => t.text)).toEqual(['Renseigner la date du contrôle « Extincteurs » (Presse plieuse)', 'Renseigner la date du contrôle « Contrôle sans nom » (Presse plieuse)']);
    expect(new Set(todos.map(t => t.id)).size).toBe(2);
    // a first date, or a first line, ends it
    const first = { ...fromCatalogue, tasks: fromCatalogue.tasks!.map(t => ({ ...t, first: addDays(today, 90) })) };
    expect(checkTodos(sOf(first), now)).toEqual([]);
    const doneOnce = markDone(fromCatalogue, fromCatalogue.tasks![0].id, done(today));
    expect(checkTodos(sOf(doneOnce), now).map(t => t.text)).toEqual(['Renseigner la date du contrôle « Contrôle sans nom » (Presse plieuse)']);
  });
});

describe('3.3 a planned check (lot 1, 3.13)', () => {
  const plan = (id: string, label: string, dueIn: number, at: string, who = '') => ({ c: chk({ id, label, first: addDays(today, dueIn) }), at, who });
  const mk = (id: string, name: string, items: ReturnType<typeof plan>[]) => items.reduce((e, x) => planCheck(e, x.c.id, x.at, x.who), eq({ id, name, manager: 'Marc D.', tasks: items.map(x => x.c) }));
  const a = mk('a', 'Presse A', [
    plan('tod', 'Aujourd\'hui', 20, today, 'Bureau X'), plan('tom', 'Demain', 20, addDays(today, 1)), plan('yes', 'Hier', 20, ago(1)), plan('far', 'Loin', 100, ago(1)),
    plan('late', 'Échu', -3, ago(1)), plan('lateplan', 'Échu planifié', -3, addDays(today, 4), 'Org Y'), plan('wide', 'Très en avance', 100, addDays(today, 50)),
  ]);

  it('is planned while the planned date is not past (today included), the due date again once it is past', () => {
    expect(stateOf(a)).toEqual({ tod: 'planned', tom: 'planned', yes: 'soon', far: 'ok', late: 'late', lateplan: 'late', wide: 'planned' });
    // one day later the planning of today is past too
    expect(stateOf(a, new Date(2026, 8, 26, 10, 0)).tod).toBe('soon');
    expect(stateOf(a, new Date(2026, 8, 26, 10, 0)).tom).toBe('planned');
  });
  it('is a to-do "prévu le … avec …" dated the day planned, normal; a planning past says it was not noted done', () => {
    const rows = checkTodos(sOf(a), now).map(t => [t.ref, t.kind, t.tone, t.due, t.text, t.fact]);
    expect(rows).toEqual([
      ['tod', 'check', 'warn', today, 'Contrôle « Aujourd\'hui » (Presse A) prévu le 25/09/2026 avec Bureau X', 'Contrôle « Aujourd\'hui » prévu le 25/09/2026 avec Bureau X'],
      ['tom', 'check', 'warn', addDays(today, 1), 'Contrôle « Demain » (Presse A) prévu le 26/09/2026', 'Contrôle « Demain » prévu le 26/09/2026'],
      ['yes', 'check', 'warn', addDays(today, 20), 'Planifier le contrôle « Hier » (Presse A), échéance dans 20 jours, planifié le 24/09/2026, pas noté fait', 'Contrôle « Hier » planifié le 24/09/2026, pas noté fait, échéance dans 20 jours'],
      ['late', 'check', 'warn', ago(3), 'Faire le contrôle « Échu » (Presse A), échu depuis 3 jours, planifié le 24/09/2026, pas noté fait', 'Contrôle « Échu » échu depuis 3 jours, planifié le 24/09/2026, pas noté fait'],
      ['lateplan', 'check', 'warn', ago(3), 'Faire le contrôle « Échu planifié » (Presse A), échu depuis 3 jours, planifié le 29/09/2026', 'Contrôle « Échu planifié » échu depuis 3 jours, planifié le 29/09/2026'],
      ['wide', 'check', 'warn', addDays(today, 50), 'Contrôle « Très en avance » (Presse A) prévu le 14/11/2026', 'Contrôle « Très en avance » prévu le 14/11/2026'],
    ]);
  });
  it('is a fact when the date planned is past and no check was written, whatever the due date', () => {
    const f = checkFacts(sOf(a), now).find(x => x.key === 'check-missed')!;
    expect(f).toEqual({ key: 'check-missed', tone: 'warn', title: 'Contrôles planifiés sans suite', text: 'Hier (Presse A, planifié le 24/09/2026, pas noté fait), Loin (Presse A, planifié le 24/09/2026, pas noté fait), Échu (Presse A, planifié le 24/09/2026, pas noté fait).' });
    // a check written ends the planning: the fact is gone
    const done1 = markDone(a, 'far', done(today));
    expect(checkFacts(sOf(done1), now).find(x => x.key === 'check-missed')!.text).not.toContain('Loin');
    // nothing for a planning to come
    expect(checkFacts(sOf(mk('z', 'Z', [plan('p', 'P', 20, addDays(today, 3))])), now).find(x => x.key === 'check-missed')).toBeUndefined();
  });
  it('counts "to plan" only inside the notice: a check planned long before its date is not near', () => {
    const near = (id: string, soonDays?: number) => inNotice(a, a.tasks!.find(t => t.id === id)!, now, soonDays);
    expect(['tod', 'tom', 'yes', 'far', 'late', 'lateplan', 'wide'].map(id => near(id))).toEqual([true, true, true, false, false, false, false]);
    // the due date of "wide" is in 100 days: inside a notice of 100 days, not of 99
    expect(near('wide', 100)).toBe(true);
    expect(near('wide', 99)).toBe(false);
    expect(near('far', 100)).toBe(true);
    expect(inNotice(eq({ tasks: [chk()] }), chk(), now)).toBe(false);   // no date
  });
});

describe('3.3 the day of the month of a series (lot 1, 3.15)', () => {
  // A series written the way the screen does: the check is done on its due date each time, over 12 months
  const series = (first: string, every: Parameters<typeof addEvery>[1], n: number, legacy = false) => {
    let e = legacy ? withChecks([chk({ every, lastDone: first })]) : withChecks([chk({ every, first })]), at = first;
    const out: string[] = [];
    if (!legacy) e = markDone(e, 'tk1', done(first));
    for (let i = 0; i < n; i++) { at = nextDue(e, e.tasks![0]); out.push(at); e = markDone(e, 'tk1', done(at)); }
    return out;
  };
  it('keeps the 31st of a monthly check: no drift to the 28th', () => {
    const want = ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31'];
    expect(series('2026-01-31', { value: 1, unit: 'mois' }, 12)).toEqual(want);
    // the same with only the date of the first versions of the tool
    expect(series('2026-01-31', { value: 1, unit: 'mois' }, 12, true)).toEqual(want);
    // a leap year
    expect(series('2028-01-31', { value: 1, unit: 'mois' }, 3)).toEqual(['2028-02-29', '2028-03-31', '2028-04-30']);
  });
  it('keeps the 30th of a quarterly check and the leap day of a yearly one', () => {
    expect(series('2025-11-30', { value: 3, unit: 'mois' }, 4)).toEqual(['2026-02-28', '2026-05-30', '2026-08-30', '2026-11-30']);
    expect(series('2028-02-29', { value: 1, unit: 'an' }, 5)).toEqual(['2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29', '2033-02-28']);
  });
  it('takes the first date typed as the anchor before the oldest line', () => {
    // typed for the 31st, first done on the 28th (end of February): the series goes to the 31st, not the 28th
    const e = markDone(withChecks([chk({ every: { value: 1, unit: 'mois' }, first: '2026-01-31' })]), 'tk1', done('2026-02-28'));
    expect(nextDue(e, e.tasks![0])).toBe('2026-03-31');
    // without a first date the oldest line is the anchor
    const g = markDone(markDone(withChecks([chk({ every: { value: 1, unit: 'mois' } })]), 'tk1', done('2026-01-30')), 'tk1', done('2026-02-28'));
    expect(nextDue(g, g.tasks![0])).toBe('2026-03-30');
  });
  it('never moves a date that is not at the end of its month, nor the other frequencies', () => {
    // done on the 10th: due on the 10th, though the series started on the 31st
    const e = markDone(withChecks([chk({ every: { value: 1, unit: 'mois' }, first: '2026-01-31' })]), 'tk1', done('2026-02-10'));
    expect(nextDue(e, e.tasks![0])).toBe('2026-03-10');
    const late = markDone(withChecks([chk({ every: { value: 1, unit: 'mois' }, first: '2026-01-15' })]), 'tk1', done('2026-02-28'));
    expect(nextDue(late, late.tasks![0])).toBe('2026-03-28');
    expect(addEvery('2026-02-28', { value: 1, unit: 'sem' }, '2026-01-31')).toBe('2026-03-07');
    expect(addEvery('2026-02-28', { value: 7, unit: 'j' }, '2026-01-31')).toBe('2026-03-07');
  });
  it('reads the day from the anchor given, and an unreadable anchor changes nothing', () => {
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' }, '2026-01-31')).toBe('2026-03-31');
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' }, '2026-01-30')).toBe('2026-03-30');
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' }, '2026-01-27')).toBe('2026-03-28');
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' }, '31/01/2026')).toBe('2026-03-31');
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' }, 'demain')).toBe('2026-03-28');
    expect(addEvery('2026-02-28', { value: 1, unit: 'mois' })).toBe('2026-03-28');
    expect(addEvery('2026-01-31', { value: 1, unit: 'mois' }, '2026-01-31')).toBe('2026-02-28');
  });
});

describe('3.3 the wording of the contract and a fact for every to-do (lot 1, 5.3)', () => {
  const ct = (id: string, name: string, n: number, provider = 'Hydrotech') => eq({ id, name, manager: 'Marc D.', contract: { provider, until: addDays(today, n) } });
  const s = sOf(ct('a', 'Presse A', 45), ct('b', 'Four B', 0, 'Therma'), ct('c', 'Grue C', -3, 'Levage SA'), ct('d', 'Scie D', 100, 'Loin'));
  it('says "expire dans", "expire aujourd\'hui" or "échu depuis" in the to-do and the fact, never "échu dans"', () => {
    expect(checkTodos(s, now).map(t => [t.eqId, t.text, t.fact])).toEqual([
      ['a', 'Revoir le contrat de Hydrotech (Presse A), expire dans 45 jours', 'Contrat de Hydrotech : expire dans 45 jours'],
      ['b', "Revoir le contrat de Therma (Four B), expire aujourd'hui", "Contrat de Therma : expire aujourd'hui"],
      ['c', 'Revoir le contrat de Levage SA (Grue C), échu depuis 3 jours', 'Contrat de Levage SA : échu depuis 3 jours'],
    ]);
    expect(checkFacts(s, now).find(x => x.key === 'check-contract')!.text).toBe("Presse A : contrat de Hydrotech expire dans 45 jours, Four B : contrat de Therma expire aujourd'hui, Grue C : contrat de Levage SA échu depuis 3 jours.");
  });
  it('gives every to-do of every kind a fact that is not an order, and no text says "échu dans"', () => {
    let e = kit('a', 'Presse A', 'Marc D.', [
      ['k', 'Extincteurs', true, [done(ago(5), { result: 'ko' })]], ['l', 'Levage', true, [done(ago(400))]], ['s', 'Sûreté', false, [done(addDays(ago(365), 20))]], ['n', 'Sans date', false, []],
      ['p', 'Prévu', false, [done(ago(100))], { plannedAt: addDays(today, 8), plannedWith: 'Org' }],
    ], { contract: { provider: 'Hydrotech', until: addDays(today, 5) } });
    e = addReserve(addReserve(e, 'p', 'Remplacer le joint', ago(4)), 'p', 'Nettoyer', '');
    const todos = checkTodos(sOf(e, ct('z', 'Z', 40)), now);
    expect(todos.map(t => [t.ref ?? t.kind, t.kind])).toEqual([['k', 'check'], ['l', 'check'], ['s', 'check'], ['n', 'check'], ['p', 'check'], [expect.stringMatching(/^rs_/), 'remark'], [expect.stringMatching(/^rs_/), 'remark'], ['contract', 'contract'], ['contract', 'contract']]);
    for (const t of todos) {
      expect(typeof t.fact).toBe('string');
      expect(t.fact!.length).toBeGreaterThan(10);
      expect(t.fact).not.toMatch(INFINITIVE);
      expect(`${t.text} ${t.fact}`).not.toMatch(/échu dans/);
    }
    expect(todos.filter(t => t.kind === 'remark').map(t => t.fact)).toEqual([
      'Observation « Remplacer le joint » du contrôle « Prévu » en retard de 4 jours', 'Observation « Nettoyer » du contrôle « Prévu » sans date limite',
    ]);
    for (const f of checkFacts(sOf(e, ct('z', 'Z', 40)), now)) expect(`${f.title} ${f.text}`).not.toMatch(/échu dans/);
  });
});

describe('3.3 damaged checks are read, never fatal (V-06)', () => {
  const junk = (): unknown[] => [null, undefined, 'x', 42, [], [1]];
  // the rule "no date" and the others, over a check that has everything: its history, an observation, a planning
  const full = () => chk({ id: 'k', label: 'Extincteurs', first: addDays(today, -3) });
  const lived = (extra: Partial<Equipment> = {}) => withChecks([full(), chk({ id: 'n', label: 'Sans date', every: undefined, everyDays: 30 }), due(10, { id: 'm', label: 'Bientôt' })], {
    checkLife: { k: { history: [done('2025-01-01', { id: 'cd1' })], reserves: [{ id: 'rs1', text: 'Joint', due: addDays(today, -2), liftedAt: '' }], plannedAt: addDays(today, 5) } }, ...extra,
  });
  const dirty = () => lived({
    tasks: [...junk(), ...lived().tasks!] as EqCheck[],
    checkLife: { k: { history: [...junk(), done('2025-01-01', { id: 'cd1' })], reserves: [...junk(), { id: 'rs1', text: 'Joint', due: addDays(today, -2), liftedAt: '' }], plannedAt: addDays(today, 5) } } as Record<string, CheckLife>,
  } as Partial<Equipment>) as Equipment;
  const reads = (e: Equipment) => {
    const s = sOf(e), c = (e.tasks as EqCheck[]).filter(x => x && typeof x === 'object' && !Array.isArray(x))[0];
    return [checkTodos(s, now), checkFacts(s, now), upcoming(s, now), calibrationsDue(s, now), openReserves(e), historyOf(e, c), nextDue(e, c), checkState(e, c, now), lifeOf(e, c)];
  };

  it('gives the same answers with junk among the checks, the lines of history and the observations as without', () => {
    expect(reads(dirty())).toEqual(reads(lived()));
    expect(checkTodos(sOf(dirty()), now).filter(t => t.kind === 'remark')).toHaveLength(1);
    expect(historyOf(dirty(), full())).toEqual([done('2025-01-01', { id: 'cd1' })]);
  });
  it('writes a damaged check back without the junk: a check done, a line removed, an observation added or lifted', () => {
    const d = dirty(), c = full();
    expect(historyOf(markDone(d, 'k', done('2026-09-20', { id: 'cd2' })), c).map(h => h.id)).toEqual(['cd2', 'cd1']);
    expect(markDone(d, 'k', done('2026-09-20')).tasks).toHaveLength(3);
    expect(removeDone(d, 'k', 'cd1').tasks).toHaveLength(3);
    expect(lifeOf(addReserve(d, 'k', 'Autre', ''), c).reserves).toHaveLength(2);
    expect(lifeOf(liftReserve(d, 'k', 'rs1', today), c).reserves).toEqual([{ id: 'rs1', text: 'Joint', due: addDays(today, -2), liftedAt: today }]);
  });
  it('names a check without a label, and an equipment without a name, by what they are: nothing is called "undefined"', () => {
    for (const label of [undefined, null, '', '  ', 5 > 6 ? 'x' : undefined]) {
      const e = withChecks([{ ...chk({ id: 'z' }), label } as unknown as EqCheck, due(-3, { id: 'y', label: 'Nommé' })], { name: undefined as unknown as string });
      const todos = checkTodos(sOf(e), now), facts = checkFacts(sOf(e), now);
      expect(todos.find(t => t.ref === 'z')!.text).toContain('Contrôle sans nom');
      expect(todos.find(t => t.ref === 'z')!.fact).toContain('Contrôle « Contrôle sans nom »');
      expect(todos.find(t => t.ref === 'y')!.text).toContain('(Équipement sans nom)');
      expect(JSON.stringify([todos, facts])).not.toMatch(/undefined|null|NaN/);
      expect(() => upcoming(sOf(e), now)).not.toThrow();
    }
    expect(upcoming(sOf(withChecks([{ ...due(5, { id: 'a' }), label: undefined } as unknown as EqCheck, { ...due(5, { id: 'b' }), label: 'B' }])), now)[0].items.map(i => i.checkId)).toEqual(['a', 'b']);
  });
  it('reads a list that is not a list as empty, and lets no id that names nothing through (__proto__, constructor)', () => {
    for (const bad of ['x', 42, {}, null]) {
      const e = eq({ tasks: bad as unknown as EqCheck[], checkLife: bad as unknown as Record<string, CheckLife> });
      expect(() => reads({ ...e, tasks: [chk()] })).not.toThrow();
      expect(checkTodos(sOf(e), now)).toEqual([]);
      expect(checkFacts(sOf(e), now)).toEqual([]);
    }
    for (const id of ['__proto__', 'constructor', 'toString']) {
      const e = withChecks([due(-3, { id })], { checkLife: { k: { history: [done('2026-01-01')] } } });
      expect(lifeOf(e, e.tasks![0])).toEqual({ history: [] });
      expect(() => reads(e)).not.toThrow();
      expect(checkTodos(sOf(e), now)).toHaveLength(1);
    }
    const lonely = withChecks([chk({ id: 'k' })], { checkLife: { k: { history: 'x', reserves: 'y' } as unknown as CheckLife } });
    expect(lifeOf(lonely, lonely.tasks![0])).toEqual({ history: [], reserves: [] });
    // the life of a check that is a text, a number or nothing is no life; a list of checks that is not a list holds no check to mark done
    for (const bad of ['x', 42, null]) expect(lifeOf(withChecks([chk({ id: 'k' })], { checkLife: { k: bad } as unknown as Record<string, CheckLife> }), chk({ id: 'k' }))).toEqual({ history: [] });
    const noList = eq({ tasks: 'x' as unknown as EqCheck[] });
    expect(markDone(noList, 'k', done('2026-09-20'))).toBe(noList);
    expect(removeDone(noList, 'k', 'cd1')).toBe(noList);
  });
});

// ---- lot 0 ter, N-10 and N-12
describe('3.3 a frequency that is not one (N-10)', () => {
  it('reads an unknown unit, no frequency, a frequency that is not a number as days, one at least', () => {
    expect(formatEvery({ value: 2, unit: 'x' } as never)).toBe('tous les 2 jours');
    expect(formatEvery({ value: 1, unit: 'x' } as never)).toBe('chaque jour');
    expect(formatEvery(null as never)).toBe('chaque jour');
    expect(formatEvery(undefined as never)).toBe('chaque jour');
    expect(formatEvery('x' as never)).toBe('chaque jour');
    expect(formatEvery({ value: NaN, unit: 'mois' })).toBe('chaque mois');
    expect(formatEvery({ value: 'a', unit: 'j' } as never)).toBe('chaque jour');
    expect(formatEvery({ value: 3, unit: 'sem' })).toBe('toutes les 3 semaines');   // the known ones are as they were
    expect(formatEvery({ value: 1, unit: 'an' })).toBe('chaque année');
  });
  it('dates a check with such a frequency in days, and never throws', () => {
    const next = (every: unknown) => { const c = chk({ every: every as never, everyDays: 10, lastDone: '2026-01-31' }); return nextDue(eq({ tasks: [c] }), c); };
    expect(next({ value: 2, unit: 'x' })).toBe('2026-02-02');
    expect(next(null)).toBe('2026-02-10');   // no frequency: the days of the first versions
    expect(next('x')).toBe('2026-02-10');
    expect(next([])).toBe('2026-02-10');
    expect(next({ value: 1, unit: 'mois' })).toBe('2026-02-28');
  });
  it('keeps the day of the series when the first date is not a text: the anchor is the oldest line of history', () => {
    const history = [done('2026-01-31'), done('2026-02-28')];
    const c = (first?: unknown) => chk({ every: { value: 1, unit: 'mois' }, ...(first === undefined ? {} : { first: first as string }) });
    const e = (first?: unknown) => eq({ tasks: [c(first)], checkLife: { tk1: { history } } });
    expect(nextDue(e(), e().tasks![0])).toBe('2026-03-31');
    expect(nextDue(e({}), e({}).tasks![0])).toBe('2026-03-31');
    expect(nextDue(e([]), e([]).tasks![0])).toBe('2026-03-31');
    expect(nextDue(e('2026-02-15'), e('2026-02-15').tasks![0])).toBe('2026-03-28');   // a first date typed is the anchor
  });
  it('gives the known unit back as it is, and days for a unit that is not known', () => {
    expect(everyOf(chk({ every: { value: 2, unit: 'mois' } }))).toEqual({ value: 2, unit: 'mois' });
    expect(everyOf(chk({ every: { value: 2, unit: 'x' } as never }))).toEqual({ value: 2, unit: 'j' });
    expect(everyOf(chk({ every: [] as never, everyDays: 14 }))).toEqual({ value: 14, unit: 'j' });
    expect(everyOf(chk({ every: undefined, everyDays: 14 }))).toEqual({ value: 14, unit: 'j' });
  });
});

describe('3.3 a planned check shows in the tasks only in the 60 days before its planned date (N-12)', () => {
  const planned = (days: number) => planCheck(withChecks([due(300)]), 'tk1', addDays(today, days));   // due in 300 days: planned, nothing near
  const kinds = (e: Equipment) => checkTodos(sOf(e), now).map(t => [t.kind, t.fact]);
  it('has the task from the 60th day before, not the 61st', () => {
    expect(kinds(planned(60))).toEqual([['check', `Contrôle « Extincteurs » prévu le ${new Date(2026, 10, 24).toLocaleDateString('fr-FR')}`]]);   // 25/09 + 60 days = 24/11
    expect(kinds(planned(61))).toEqual([]);
    expect(kinds(planned(100))).toEqual([]);
    expect(kinds(planned(0)).map(k => k[0])).toEqual(['check']);
    expect(kinds(planned(1)).map(k => k[0])).toEqual(['check']);
  });
  it('still plans the check (the state and the date) when there is no task for it', () => {
    const e = planned(100);
    expect(checkState(e, e.tasks![0], now)).toBe('planned');
    expect(lifeOf(e, e.tasks![0]).plannedAt).toBe(addDays(today, 100));
    expect(checkTodos(sOf(e), now)).toHaveLength(0);
    // with the plan taken off, a check due in 300 days has no task either; one due inside the notice asks to plan it
    expect(checkTodos(sOf(unplanCheck(e, 'tk1')), now)).toHaveLength(0);
    expect(checkTodos(sOf(withChecks([due(10)])), now).map(t => t.text)).toEqual(['Planifier le contrôle « Extincteurs » (Presse plieuse), échéance dans 10 jours']);
  });
  it('is the same at the edge whatever the hour, and is not asked of a plan that is past (it is late or to plan again)', () => {
    expect(kinds(planned(60)).length).toBe(1);
    expect(checkTodos(sOf(planned(60)), new Date(2026, 8, 25, 23, 59))).toHaveLength(1);
    expect(checkTodos(sOf(planned(61)), new Date(2026, 8, 25, 0, 0))).toHaveLength(0);
  });
  it('reads a planning that is not a text as no planning', () => {
    const e = withChecks([due(10)]);
    const damaged = { ...e, checkLife: { tk1: { history: [], plannedAt: [] as never, plannedWith: 5 as never } } };
    expect(lifeOf(damaged, damaged.tasks![0])).toEqual({ history: [] });
    expect(checkTodos(sOf(damaged), now).map(t => t.text)).toEqual(checkTodos(sOf(e), now).map(t => t.text));
    expect(checkState(damaged, damaged.tasks![0], now)).toBe('soon');
  });
});
