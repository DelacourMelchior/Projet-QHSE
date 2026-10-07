// Tool 4.1: the state of a power (two distinct people, seen doing the act, within the year), who covers whom when someone is away, the formalities, the sealed envelopes,
// what is left to do, the figures proposed to the dashboard, the example that shows every state, and the reading of the data of the first version.
import { describe, expect, it } from 'vitest';
import { norm } from './instructions';
import type { Contact, Person, Power, State, Vault, VaultLog } from './types';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { demoState } from './templates';
import { normalize } from './migrate';
import { allTasks } from './tasks';
import { feeds } from './feeds';
import { toolBadge } from './status';
import { bucketOf, flatten, unflatten } from '../store/flat';
import {
  absentToday, activeVaults, candidates, closeCover, coverFor, coversToClose, declareAbsence, formsOf, futureGaps, isLong, lastCheck, lostByDeleting, newCover, newPower, newPractice, newVault, newVaultLog,
  headOf, syncPowerPeople, functionsOf, wantedOf, signKey, signNeeds, signPerson, signStatus, signText, unsignPerson, openUnsealed, placeError, powerCfg, powerDeputies, powerState, practicesOf, removeExtra, reviewHistory, setDeputy, suggestDeputies, swapDeputies, vaultState, whatIf, whoIs, type PowerState,
} from './powers';
import { powerFocus, powerInsights, powerSummary, powerTodos, todoWords } from './powersAll';
import { addPowerKpis, powerFeeds, powerKpiValue } from './powersFeeds';
import { completePowerExamples, hasPowerExample, POWER_EXAMPLE_LEVEL, powerExamples, removePowerExample } from './powersExamples';

const now = new Date(2026, 8, 25, 10, 0);   // Friday 25 September 2026
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
  params: { ...emptyTools().params, power: { practice: true }, ...over.params },   // these tests are about the follow-up of the practice, which is off by default
});
const p = (over: Partial<Power> = {}): Power => ({ ...newPower('P1', 'Paie'), holder: 'Jean', ...over });
const person = (name: string, over: Partial<Person> = {}): Person => ({ id: `pp_${name}`, name, role: '', active: true, ...over });
const people = (...xs: Person[]) => Object.fromEntries(xs.map(x => [x.id, x]));

describe('4.1 the state of a power', () => {
  it('needs two deputies who did the act within the year', () => {
    expect(powerState(p(), now)).toBe('no_deputy');
    expect(powerState(p({ deputies: ['A', ''], practiced: ['2026-09-01', ''] }), now)).toBe('one_deputy');
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2026-09-01', ''] }), now)).toBe('unpracticed');
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2026-09-01', '2025-09-01'] }), now)).toBe('unpracticed');
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2026-09-01', '2025-10-10'] }), now)).toBe('soon');
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-03-01'] }), now)).toBe('ok');
  });
  it('counts a person once, and never the holder among the deputies', () => {
    expect(powerState(p({ deputies: ['A', 'a'], practiced: ['2026-09-01', '2026-09-01'] }), now)).toBe('one_deputy');
    expect(powerState(p({ deputies: ['Jean', 'B'], practiced: ['2026-09-01', '2026-09-01'] }), now)).toBe('one_deputy');
    expect(powerDeputies(p({ deputies: ['É.', 'e.'], extra: ['Jean', 'C'] })).map(d => d.name)).toEqual(['É.', 'C']);
  });
  it('a practice that nobody saw is "to validate", seen it makes the power ready', () => {
    const power = p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', ''] });
    const declared = { ...newPractice('x', 'B', 'B', now, { date: '2026-09-10' }), id: 'l1' };
    expect(powerState(power, now, { people: {}, practices: { l1: declared } })).toBe('to_validate');
    expect(powerState(power, now, { people: {}, practices: { l1: { ...declared, checkedBy: 'Jean' } } })).toBe('ok');
    // a line of another power, or too old, counts for nothing
    expect(powerState(power, now, { people: {}, practices: { l1: { ...declared, powerId: 'y', checkedBy: 'Jean' } } })).toBe('unpracticed');
    expect(powerState(power, now, { people: {}, practices: { l1: { ...declared, date: '2025-01-01', checkedBy: 'Jean' } } })).toBe('unpracticed');
  });
  it('a person who left counts as nobody; the period of the power is its own', () => {
    const ok = p({ deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-09-01'] });
    expect(powerState(ok, now, { people: people(person('A', { active: false })), practices: {} })).toBe('one_deputy');
    expect(powerState({ ...ok, practiced: ['2026-05-01', '2026-05-01'], periodDays: 90 }, now)).toBe('unpracticed');
    expect(powerState({ ...ok, practiced: ['2026-05-01', '2026-05-01'] }, now, undefined, { practiceDays: 90, practice: true })).toBe('unpracticed');   // the period of the settings
  });
  it('a third deputy covers for a late one: two who are fresh are enough', () => {
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2024-01-01', '2026-09-01'], extra: ['C'], extraPracticed: ['2026-09-01'] }), now)).toBe('ok');
    expect(powerState(p({ deputies: ['A', 'B'], practiced: ['2024-01-01', '2026-09-01'], extra: ['C'], extraPracticed: ['2025-10-10'] }), now)).toBe('soon');
  });
});

describe('4.1 people: names read against the staff list and the directory', () => {
  const ct = (name: string, over: Partial<Contact> = {}): Contact => ({ id: `ct_${name}`, category: 'interne', name, role: '', company: 'Interne', phone: '', email: '', always: false, verifiedAt: '', ...over });
  const s = st({
    people: people(person('Hélène R.', { absences: [{ from: '2026-09-20', to: '2026-09-30' }] }), person('Marc M.', { active: false })),
    contacts: { a: ct('Hélène R.', { phone: '06 00 00 00 13', email: 'h@example.com' }), b: ct('Marie S.', { category: 'conseil', company: 'Cabinet X', phone: '04 00 00 00 27' }) },
  });
  it('reads the phone, the leave and the departure, whatever the case and the accents', () => {
    expect(whoIs(s, ' helene r. ', '2026-09-25')).toMatchObject({ phone: '06 00 00 00 13', email: 'h@example.com', gone: false, outside: false, absent: { from: '2026-09-20', to: '2026-09-30' } });
    expect(whoIs(s, 'Hélène R.', '2026-10-05').absent).toBeNull();
    expect(whoIs(s, 'Marc M.', '2026-09-25')).toMatchObject({ gone: true, outside: false });
    expect(whoIs(s, 'Marie S. (Cabinet X)', '2026-09-25')).toMatchObject({ phone: '04 00 00 00 27', outside: false });
    expect(whoIs(s, 'Quelqu\'un', '2026-09-25')).toMatchObject({ outside: true, phone: '' });
    expect(whoIs(s, '', '2026-09-25')).toMatchObject({ name: '', outside: false });
  });
  it('proposes the staff first, then the directory with the company, filtered by what is typed', () => {
    expect(candidates(s, '').map(c => c.name)).toEqual(['Hélène R.', 'Marie S. (Cabinet X)']);
    expect(candidates(s, 'cabinet').map(c => c.name)).toEqual(['Marie S. (Cabinet X)']);
    expect(candidates(s, 'HELENE')[0]).toMatchObject({ staff: true });
  });
});

describe('4.1 who covers whom when someone is away', () => {
  const away = (from: string, to: string) => [{ from, to }];
  const base = (over: Partial<State> = {}) => st({
    powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-09-01'] }), y: p({ id: 'y', power: 'Clés', holder: 'A', deputies: ['Jean', ''], practiced: ['2026-09-01', ''] }) },
    people: people(person('Jean'), person('A'), person('B')), ...over,
  });
  it('takes the first deputy who is there and did the act; a deputy who is away that day is not there', () => {
    const c = coverFor(base(), 'jean', '2026-09-28', '2026-09-28', now);
    expect(c.holds).toHaveLength(1);
    expect(c.holds[0]).toMatchObject({ status: 'covered', pick: 'A' });
    const away1 = base({ people: people(person('Jean'), person('A', { absences: away('2026-09-28', '2026-09-30') }), person('B')) });
    expect(coverFor(away1, 'Jean', '2026-09-28', '2026-09-28', now).holds[0]).toMatchObject({ status: 'covered', pick: 'B' });
    expect(coverFor(away1, 'Jean', '2026-09-28', '2026-09-28', now).holds[0].deps.map(d => d.name)).toEqual(['B', 'A']);   // the one who is there is called first, the one who is away comes last
    expect(coverFor(away1, 'Jean', '2026-10-05', '2026-10-05', now).holds[0].pick).toBe('A');
    const none = base({ people: people(person('Jean'), person('A', { absences: away('2026-09-28', '2026-09-30') }), person('B', { absences: away('2026-09-29', '2026-10-02') })) });
    expect(coverFor(none, 'Jean', '2026-09-28', '2026-10-01', now).holds[0]).toMatchObject({ status: 'uncovered', pick: '' });
  });
  it('is "weak" when the deputies are there but did not do the act in time', () => {
    const s = base({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2024-01-01', ''] }) } });
    expect(coverFor(s, 'Jean', '2026-09-28', '2026-09-28', now).holds[0]).toMatchObject({ status: 'weak', pick: 'A' });
  });
  it('tells the powers where the person is a deputy, and who remains', () => {
    const c = coverFor(base(), 'A', '2026-09-28', '2026-09-28', now);
    expect(c.holds.map(h => h.power.id)).toEqual(['y']);
    expect(c.deputyOf.map(d => d.power.id)).toEqual(['x']);
    expect(c.deputyOf[0].others.map(o => o.name)).toEqual(['B']);
  });
  it('an absence of more than a day opens the envelope; no end given is a long one', () => {
    const cfg = powerCfg(undefined);
    expect(isLong('2026-09-28', '2026-09-28', cfg)).toBe(false);
    expect(isLong('2026-09-28', '2026-09-29', cfg)).toBe(true);
    expect(isLong('2026-09-28', '', cfg)).toBe(true);
    expect(isLong('2026-09-28', '2026-09-29', { longHours: 72 })).toBe(false);
  });
  it('ranks the people by what stops without them, and finds the leave of a holder that no deputy covers', () => {
    const s = base({ people: people(person('Jean', { absences: away('2026-10-10', '2026-10-20') }), person('A', { absences: away('2026-10-12', '2026-10-13') }), person('B', { absences: away('2026-10-18', '2026-10-19') })) });
    const w = whatIf(s, now);
    expect(w.map(x => x.name)).toEqual(['A', 'Jean', 'B']);   // nobody is away in the two weeks to come: the ones who hold and cover most come first, then the one who only covers
    expect(futureGaps(s, now, 90).map(g => [g.who, g.from, g.to])).toEqual([['Jean', '2026-10-10', '2026-10-20'], ['A', '2026-10-12', '2026-10-13']]);   // and the leave of A, whose only deputy (Jean) is away then
    expect(futureGaps(s, now, 10)).toHaveLength(0);   // beyond the horizon
  });
  it('knows who is away today and what is covered', () => {
    const s = base({ people: people(person('Jean', { absences: away('2026-09-24', '2026-09-27') }), person('A'), person('B')) });
    expect(absentToday(s, now)).toEqual([{ name: 'Jean', until: '2026-09-27', held: 1, uncovered: 0 }]);
  });
});

describe('4.1 formalities', () => {
  const cfg = powerCfg(undefined);
  it('reads the two boxes of the first version, a day, or "not applicable"', () => {
    expect(formsOf(p(), cfg)).toMatchObject({ done: 0, total: 3 });
    expect(formsOf(p({ delegationSigned: true, bankInformed: true }), cfg)).toMatchObject({ done: 2, total: 3, missing: ['Limites précisées'] });
    expect(formsOf(p({ forms: { deleg: '2026-03-01', limits: 'na', informed: 'na' } }), cfg)).toMatchObject({ done: 1, total: 1, missing: [] });
  });
  it('follows the list of the company', () => {
    const c = powerCfg({ power: { forms: [{ key: 'cle', label: 'Clé remise' }] } });
    expect(formsOf(p({ forms: { cle: '2026-03-01' } }), c)).toMatchObject({ done: 1, total: 1 });
  });
});

describe('4.1 sealed envelopes', () => {
  const v: Vault = { ...newVault('Coffre'), id: 'v' };
  const sv = (logs: VaultLog[], vault = v) => st({ vaults: { v: vault }, vlogs: Object.fromEntries(logs.map(l => [l.id, l])) });
  it('is never checked, checked, due after six months, and open until it is sealed again with new codes', () => {
    expect(vaultState(sv([]), v, now)).toBe('never');
    const fresh = newVaultLog('v', 'check', 'Jean', '2026-08-01T09:00');
    expect(vaultState(sv([fresh]), v, now)).toBe('ok');
    expect(vaultState(sv([{ ...fresh, at: '2026-01-10T09:00' }]), v, now)).toBe('due');
    expect(vaultState(sv([], { ...v, checkedAt: '2026-06-10', checkedBy: 'Jean' }), { ...v, checkedAt: '2026-06-10' }, now)).toBe('ok');   // the single check of the first version
    const open = newVaultLog('v', 'open', 'Jean', '2026-09-20T08:00');
    expect(vaultState(sv([fresh, open]), v, now)).toBe('open');
    expect(vaultState(sv([fresh, { ...open, resealedAt: '2026-09-21' }]), v, now)).toBe('open');   // the codes are not changed yet
    expect(vaultState(sv([fresh, { ...open, resealedAt: '2026-09-21', codesChangedAt: '2026-09-21' }]), v, now)).toBe('ok');
    expect(openUnsealed([fresh, open])).toHaveLength(1);
    expect(lastCheck(v, [fresh, { ...fresh, id: 'z', at: '2026-09-01T09:00' }])?.at).toBe('2026-09-01T09:00');
  });
  it('the period of the check is the one of the settings', () => {
    const fresh = newVaultLog('v', 'check', 'Jean', '2026-08-01T09:00'), s = { ...sv([fresh]), params: { ...emptyTools().params, power: { envelopeDays: 30 } } };
    expect(vaultState(s, v, now)).toBe('due');
  });
});

describe('4.1 what is left to do', () => {
  it('asks the practice only of the deputy who needs it, on the day it ends, or today when it is over', () => {
    const s = st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', '2025-10-10'], periodDays: undefined }) } });
    const t = powerTodos(s, now).filter(x => x.kind === 'practice');
    expect(t).toEqual([expect.objectContaining({ who: 'B', due: '2026-10-10', name: 'B', powerId: 'x' })]);   // A did it three weeks ago: nothing for A
    const never = powerTodos(st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', ''] }) } }), now).filter(x => x.kind === 'practice');
    expect(never).toEqual([expect.objectContaining({ who: 'B', due: '2026-09-25' })]);
    expect(powerTodos(st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-09-01'], forms: { deleg: 'na', limits: 'na', informed: 'na' } }) } }), now).filter(x => x.kind !== 'review')).toEqual([]);
  });
  it('a practice that nobody saw is asked of the holder, not of the deputy', () => {
    const s = st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', ''] }) }, practices: { l: { ...newPractice('x', 'B', 'B', now, { date: '2026-09-10' }), id: 'l' } } });
    expect(powerTodos(s, now).filter(x => x.kind === 'validate')).toEqual([expect.objectContaining({ who: 'Jean', name: 'B', text: 'Valider la pratique de B : Paie' })]);
    expect(powerTodos(s, now).some(x => x.kind === 'practice')).toBe(false);
  });
  it('puts red before amber, then the act that cannot wait, then the day', () => {
    const s = st({ powers: {
      a: p({ id: 'a', power: 'Lent', wait: 'more' }), b: p({ id: 'b', power: 'Urgent', wait: 'day' }), c: p({ id: 'c', power: 'Un seul', deputies: ['A', ''], practiced: ['2026-09-01', ''], wait: 'day' }),
    } });
    expect(powerTodos(s, now).filter(x => x.kind === 'none' || x.kind === 'one').map(x => x.powerId)).toEqual(['b', 'a', 'c']);
  });
  it('gives each todo the address that opens the tool on the right place', () => {
    const d = demoState(now);
    expect(powerTodos(d, now).some(t => t.kind === 'vault' || t.kind === 'unsealed')).toBe(false);   // the light list of the accesses has no check to make
    d.params.power = { vaultFull: true, practice: true };
    const todos = powerTodos(d, now), by = (k: string) => todos.find(t => t.kind === k)!;
    expect(powerFocus(by('none'))).toMatch(/^pw_demo_6:people$/);
    expect(powerFocus(by('practice'))).toMatch(/^practice:pw_demo_\d:/);
    expect(powerFocus(by('validate'))).toMatch(/^pw_demo_2:people$/);
    expect(powerFocus(by('vault'))).toBe('vault:vt_demo_1');
    expect(powerFocus(by('review'))).toBe('review');
    expect(powerFocus(by('gap'))).toMatch(/^absent:Karim%20T\.:/);
    expect(powerFocus(by('forms'))).toMatch(/^pw_demo_\d:forms$/);   // the unsigned powers have their formality undone
  });
  it('lists the absences that are over and not closed, and sends the todos to "Mes tâches" with their person', () => {
    const c = newCover('Jean', '2026-09-10', '2026-09-12', [], 'Anne', '2026-09-10T08:00');
    const s = st({ covers: { [c.id]: c } });
    expect(coversToClose(s, now)).toHaveLength(1);
    expect(coversToClose({ covers: { [c.id]: { ...c, closedAt: '2026-09-13' } } }, now)).toHaveLength(0);
    expect(coversToClose({ covers: { [c.id]: { ...c, to: '2026-09-26' } } }, now)).toHaveLength(0);
    const tasks = allTasks(demoState(now), now).filter(t => t.tool === '4.1');
    expect(tasks.length).toBeGreaterThan(3);
    expect(tasks.some(t => t.who === 'Julien P.' && /signature à recueillir/.test(t.text))).toBe(true);   // the person who has not signed gets the task
  });
  it('says what is left in a few words for the badge', () => {
    expect(todoWords(powerTodos(demoState(now), now).filter(t => t.tone === 'bad'))).toMatch(/fonction sans suppléant/);
    expect(toolBadge(demoState(now), '4.1', '2026-09', now)).toMatchObject({ tone: 'alert' });
    expect(toolBadge(st(), '4.1', '2026-09', now)).toMatchObject({ tone: 'pending', text: 'Pas encore utilisé' });
  });
});

describe('4.1 the example shows every state, in facts', () => {
  const d = demoState(now);
  it('has the six states, the people who left and who are away, the envelopes and the absence under way', () => {
    const dp = { ...d, params: { ...d.params, power: { practice: true } } } as State;   // with the follow-up of the practice on
    const states = new Set(Object.values(dp.powers).map(x => powerState(x, now, dp, powerCfg(dp.params))));
    expect([...states].sort()).toEqual(['no_deputy', 'ok', 'one_deputy', 'soon', 'to_validate', 'unpracticed'] satisfies PowerState[]);
    const keys = powerInsights(dp, now).map(i => i.key);
    expect(keys).toEqual(expect.arrayContaining(['left', 'none', 'one', 'prac', 'val', 'gaps', 'forms', 'access', 'review']));
    expect(keys.some(k => k.startsWith('today'))).toBe(true);
    expect(activeVaults(d).map(v => vaultState(d, v, now)).sort()).toEqual(['due', 'ok']);
    expect(Object.values(d.covers).filter(c => !c.closedAt)).toHaveLength(1);
    expect(practicesOf(d, 'pw_demo_2')).toHaveLength(1);
  });
  it('by default the states are about the signatures: ready, missing signatures, one or no deputy', () => {
    const states = new Set(Object.values(d.powers).map(x => powerState(x, now, d, powerCfg(d.params))));
    expect([...states].sort()).toEqual(['no_deputy', 'ok', 'one_deputy', 'unsigned'] satisfies PowerState[]);
    const todos = powerTodos(d, now);
    expect(todos.some(t => t.kind === 'sign' && t.who === 'Julien P.')).toBe(true);
    expect(todos.some(t => t.kind === 'practice' || t.kind === 'validate')).toBe(false);
    expect(powerFocus(todos.find(t => t.kind === 'sign')!)).toMatch(/^pw_demo_\d:people$/);
  });
  it('says facts: no finding begins like an order', () => {
    powerInsights(d, now).forEach(i => expect(`${i.title} ${i.text}`, i.key).not.toMatch(/^(Nommer|Faire|Relancer|Vérifier|Valider|Prévenir|Demander|Changer|Renouveler)\b/));
    expect(powerSummary(d, now).total).toBe(Object.keys(d.powers).length);
  });
  it('the phone of an outside deputy comes from the directory', () => {
    expect(whoIs(d, 'Marie-Laure S. (Cabinet Comptable)', '2026-09-25')).toMatchObject({ outside: false, phone: '04 00 00 00 27' });
  });
  it('the example raises no extra red state in the other tools of the staff', () => {
    expect(toolBadge(d, '4.2', '2026-09', now).tone).toBe('alert');   // it already did before: the key persons of the example
    expect(toolBadge(d, '4.3', '2026-09', now)).toMatchObject({ n: 1, tone: 'alert' });
  });
});

describe('4.1 the figures proposed to the dashboard (1.1)', () => {
  it('are computed for the month under way and the month just closed, never for an older one', () => {
    const d = demoState(now);
    expect(powerKpiValue(d, 'power_ready', '2026-09', now)).toBe(Math.round(Object.values(d.powers).filter(x => powerState(x, now, d, powerCfg(d.params)) === 'ok').length / Object.keys(d.powers).length * 100));
    expect(powerKpiValue(d, 'power_ready', '2026-08', now)).not.toBeNull();
    expect(powerKpiValue(d, 'power_ready', '2026-06', now)).toBeNull();
    expect(powerKpiValue(d, 'power_vault', '2026-09', now)).toBe(50);   // one envelope of two
    expect(powerKpiValue(st(), 'power_ready', '2026-09', now)).toBeNull();
  });
  it('are added once and then offered', () => {
    const d = demoState(now);
    expect(feeds(d, '2026-09', now).filter(f => f.tool === '4.1')).toHaveLength(0);
    expect(addPowerKpis(d)).toBe(3);
    expect(addPowerKpis(d)).toBe(0);
    expect(feeds(d, '2026-09', now).filter(f => f.tool === '4.1').map(f => f.kpi.role).sort()).toEqual(['power_practised', 'power_ready', 'power_vault']);
    expect(powerFeeds(d, '2026-09', now)).toHaveLength(3);
  });
});

describe('4.1 data of the first version, and the store', () => {
  it('the single envelope becomes a vault, once, and is emptied', () => {
    const s = st({ powers: { x: p({ id: 'x' }) }, envelope: { location: 'Coffre du bureau', checkedAt: '2026-06-10', by: 'Jean' } });
    const n = normalize(structuredClone(s));
    expect(Object.values(n.vaults)).toEqual([expect.objectContaining({ id: 'vt_main', location: 'Coffre du bureau', checkedAt: '2026-06-10', checkedBy: 'Jean', contents: [], visa: ['', ''] })]);
    expect(n.envelope).toEqual({ location: '', checkedAt: '', by: '' });
    expect(vaultState(n, n.vaults.vt_main, now)).toBe('ok');
    // deleting the vault does not bring the envelope back
    const again = normalize(structuredClone({ ...n, vaults: {} }));
    expect(again.vaults).toEqual({});
  });
  it('a fictitious company saved with the first example gets the new one once, and keeps what it typed', () => {
    const d = demoState(now), old = structuredClone(d) as State;
    // back to the first version: six powers without the new fields, the envelope alone, no marker
    Object.keys(old.powers).filter(id => Number(id.slice(-1)) > 6).forEach(id => delete old.powers[id]);
    Object.values(old.powers).forEach(x => { for (const k of ['impact', 'wait', 'howTo', 'limits', 'contactIds', 'forms', 'dep', 'reviewedAt', 'reviewedBy'] as const) delete x[k]; });
    old.powers.pw_demo_2.power = 'Validation des devis engageants et des avenants';
    old.powers.pw_demo_3.holder = 'Quelqu\'un d\'autre';
    old.powers.pw_demo_1.extra = ['Cabinet comptable'];
    old.practices = {}; old.covers = {}; old.vaults = {}; old.vlogs = {};
    old.envelope = { location: 'Coffre de la direction, enveloppe scellée signée sur la languette', checkedAt: '2026-02-17', by: 'Jean-Marc' };
    delete old.params.powerExampleLevel;
    ['pp_demo_pd'].forEach(id => delete old.people[id]);
    ['kt', 'lu'].forEach(k => { /* the first example already had these leaves */ void k; });
    old.people.pp_demo_tm.absences = [];
    const n = normalize(structuredClone(old));
    expect(Object.keys(n.powers)).toHaveLength(9);
    expect(n.powers.pw_demo_2.power).toBe('Validation des offres et des engagements pris auprès des clients');   // the old wording is renewed
    expect(n.powers.pw_demo_3.holder).toBe('Quelqu\'un d\'autre');                                                // what the company typed stays
    expect(n.powers.pw_demo_3.impact).toBeTruthy();                                                               // and gains the new fields
    expect(n.powers.pw_demo_1.extra).toEqual(['Marie-Laure S. (Cabinet Comptable)']);
    expect(Object.keys(n.vaults).sort()).toEqual(['vt_demo_1', 'vt_demo_2']);                                    // the single envelope gave way to the two of the example
    expect(n.envelope.location).toBe('');
    expect(n.people.pp_demo_pd).toMatchObject({ active: false });
    expect(n.people.pp_demo_tm.absences?.length).toBe(1);
    expect(n.params.powerExampleLevel).toBe(POWER_EXAMPLE_LEVEL);
    expect(normalize(structuredClone(n))).toEqual(n);   // read again: nothing moves
  });
  it('a company that is not the example is left alone, and so is a state that already has the level', () => {
    const real = st({ powers: { x: p({ id: 'x' }) } });
    expect(completePowerExamples(real, now)).toBe(real);
    const d = demoState(now);
    expect(completePowerExamples(d, now)).toBe(d);
  });
  it('the new records are stored one key each, the vaults and their lines in the direction folder', () => {
    const d = demoState(now), m = flatten(d);
    expect(Object.keys(m).filter(k => k.startsWith('practice|')).length).toBe(Object.keys(d.practices).length);
    expect(Object.keys(m).filter(k => k.startsWith('vault|') || k.startsWith('vlog|') || k.startsWith('cover|'))).toHaveLength(Object.keys(d.vaults).length + Object.keys(d.vlogs).length + Object.keys(d.covers).length);
    expect(bucketOf('vault|vt_demo_1', d)).toBe('direction');
    expect(bucketOf('vlog|vl_demo_1', d)).toBe('direction');
    expect(bucketOf('practice|pr_demo_1', d)).toBe('equipe');
    expect(bucketOf('cover|cv_demo_1', d)).toBe('equipe');
    const back = unflatten(m);
    expect(back.practices).toEqual(d.practices);
    expect(back.vaults).toEqual(d.vaults);
    expect(back.vlogs).toEqual(d.vlogs);
    expect(back.covers).toEqual(d.covers);
  });
  it('reads a damaged power without stopping', () => {
    const s = st({ powers: { a: { id: 'a' } as unknown as Power, b: { id: 'b', power: 5, deputies: 'x', practiced: null, extra: 'y', wait: 'soon', forms: 3, dep: [] } as unknown as Power } });
    const n = normalize(structuredClone(s));
    expect(powerState(n.powers.a, now, n)).toBe('no_deputy');
    expect(powerState(n.powers.b, now, n)).toBe('no_deputy');
    expect(() => powerSummary(n, now)).not.toThrow();
  });
  it('the examples are built on a given day: every date is relative to it', () => {
    const a = powerExamples(new Date(2026, 8, 25)), b = powerExamples(new Date(2027, 0, 15));
    expect(a.powers.pw_demo_1.reviewedAt).not.toBe(b.powers.pw_demo_1.reviewedAt);
    expect(Object.keys(a.powers)).toEqual(Object.keys(b.powers));
  });
});

describe('4.1 the moves of the tool', () => {
  const power = p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-08-01'], extra: ['C'], extraPracticed: ['2026-07-01'] });
  it('says why a name cannot take a place, and lets it take it otherwise', () => {
    expect(placeError(power, 'jean', 0)).toBe('jean est déjà titulaire de cette fonction.');
    expect(placeError(power, 'B', 0)).toBe('B est déjà suppléant de cette fonction.');
    expect(placeError(power, 'a', 0)).toBe('');   // the place it already has
    expect(placeError(power, 'C', 2)).toBe('');
    expect(placeError(power, 'C', 3)).toBe('C est déjà suppléant de cette fonction.');
    expect(placeError(power, 'A', 2)).toBe('A est déjà suppléant de cette fonction.');
    expect(placeError(power, 'B', 'holder')).toBe('B est déjà suppléant de cette fonction.');
    expect(placeError(power, 'Zoé', 1)).toBe('');
    expect(placeError(power, '  ', 1)).toBe('');
  });
  it('a new person in a slot does not inherit the practice of the one before; the same person keeps it', () => {
    expect(setDeputy(power, 0, 'Z')).toMatchObject({ deputies: ['Z', 'B'], practiced: ['', '2026-08-01'] });
    expect(setDeputy(power, 0, 'a')).toMatchObject({ deputies: ['a', 'B'], practiced: ['2026-09-01', '2026-08-01'] });
    expect(setDeputy(power, 2, 'Z')).toMatchObject({ extra: ['Z'], extraPracticed: [''] });
    expect(removeExtra(power, 2)).toMatchObject({ extra: [], extraPracticed: [] });
    expect(swapDeputies(power)).toMatchObject({ deputies: ['B', 'A'], practiced: ['2026-08-01', '2026-09-01'] });
  });
  it('an absence declared goes into the staff list once, and notes who takes each power', () => {
    const d = st({ powers: { x: power }, people: people(person('Jean'), person('A'), person('B'), person('C')) });
    const c = declareAbsence(d, 'Jean', '2026-09-28', '2026-10-02', 'Anne', now);
    expect(d.people.pp_Jean.absences).toEqual([{ from: '2026-09-28', to: '2026-10-02' }]);
    expect(c).toMatchObject({ who: 'Jean', takes: [{ powerId: 'x', by: 'A' }], closedAt: '', by: 'Anne' });
    expect(d.covers[c.id]).toBe(c);
    declareAbsence(d, 'Jean', '2026-09-28', '2026-10-02', 'Anne', now);
    expect(d.people.pp_Jean.absences).toHaveLength(1);
    declareAbsence(d, 'Quelqu\'un', '2026-09-28', '2026-09-28', 'Anne', now);   // not on the staff list: the episode only
    expect(Object.values(d.covers)).toHaveLength(3);
  });
  it('closing an absence notes what was missing and credits the practice of the ones who held the power, seen by the person who closes', () => {
    const d = st({ powers: { x: power }, people: people(person('Jean'), person('A')) });
    const c = declareAbsence(d, 'Jean', '2026-09-14', '2026-09-18', 'Anne', now);
    const lines = closeCover(d, c.id, '  Le code manquait ', 'Anne', ['x'], now);
    expect(d.covers[c.id]).toMatchObject({ missing: 'Le code manquait', closedAt: '2026-09-25', closedBy: 'Anne' });
    expect(lines).toEqual([expect.objectContaining({ powerId: 'x', who: 'A', date: '2026-09-18', checkedBy: 'Anne', coverId: c.id })]);
    expect(d.practices[lines[0].id]).toBe(lines[0]);
    expect(powerState(power, now, d)).toBe('ok');
    const d2 = st({ powers: { x: power }, people: people(person('Jean'), person('A')) });
    const c2 = declareAbsence(d2, 'Jean', '2026-09-14', '2026-09-18', 'Anne', now);
    expect(closeCover(d2, c2.id, '', 'Anne', [], now)).toEqual([]);
    expect(closeCover(d2, 'nope', '', 'Anne', ['x'], now)).toEqual([]);
  });
  it('proposes the people of the staff list who are not on the power, with the facts that put them there', () => {
    const s = st({
      powers: { x: p({ id: 'x', skillId: 'k', deputies: ['A', ''] }) }, skills: { k: { id: 'k', name: 'Paie', processId: 'P1', levels: { pp_B: 4, pp_C: 2 }, plan: null } },
      people: people(person('Jean', { team: 'Bureau' }), person('A'), person('B', { team: 'Bureau' }), person('C', { team: 'Atelier' }), person('D', { active: false })),
    });
    const r = suggestDeputies(s, s.powers.x, now);
    expect(r.map(x => x.name)).toEqual(['B', 'C']);
    expect(r[0].reasons).toEqual(['niveau 4 sur Paie', 'même équipe (Bureau)', "suppléant d'aucune fonction", 'présent les 14 prochains jours']);
  });
  it('says what deleting a power would lose', () => {
    const d = st({ powers: { x: power } });
    expect(lostByDeleting(d, power)).toBe('');
    d.practices.l = newPractice('x', 'A', 'Jean', now);
    d.covers.c = newCover('Jean', '2026-09-01', '2026-09-02', [{ powerId: 'x', by: 'A' }], 'Anne');
    expect(lostByDeleting(d, power)).toBe('1 pratique inscrite, 1 absence couverte');
  });
});

describe('4.1 later additions', () => {
  it('finds the head of the company: the one the directory names, else the internal card whose role says it', () => {
    const c = (id: string, name: string, role: string, over: object = {}) => ({ id, category: 'interne', name, role, company: 'Interne', phone: '06', email: '', always: false, verifiedAt: '', ...over }) as State['contacts'][string];
    const s = st({ contacts: { a: c('a', 'Anne', 'Responsable qualité'), b: c('b', 'Luc', 'Gérant'), v: c('v', '', 'Dirigeant', { vacant: true }) } });
    expect(headOf(s)?.name).toBe('Luc');
    expect(headOf({ ...s, params: { ...s.params, directorId: 'a' } })?.name).toBe('Anne');
    expect(headOf(st())).toBeUndefined();
  });
  it('the planned day of the practice is the day asked of the deputy who needs it, and the leave to come is told', () => {
    const planned = st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', ''], nextPracticeAt: '2026-10-14' }) } });
    expect(powerTodos(planned, now).find(t => t.kind === 'practice')).toMatchObject({ who: 'B', due: '2026-10-14' });
    expect(powerTodos(st({ powers: { x: p({ id: 'x', deputies: ['A', 'B'], practiced: ['2026-09-01', ''], nextPracticeAt: '2026-09-01' }) } }), now).find(t => t.kind === 'practice')).toMatchObject({ due: '2026-09-25' });   // a planned day that is over is not kept
    const s = st({ people: people(person('A', { absences: [{ from: '2026-10-10', to: '2026-10-14' }, { from: '2026-12-01', to: '2026-12-05' }] })) });
    expect(whoIs(s, 'A', '2026-09-25')).toMatchObject({ absent: null, next: { from: '2026-10-10', to: '2026-10-14' } });
    expect(whoIs(s, 'A', '2026-10-20').next).toBeNull();   // the second leave is more than a month away from that day
    expect(whoIs(s, 'A', '2026-10-11')).toMatchObject({ absent: { from: '2026-10-10', to: '2026-10-14' }, next: null });
  });
  it('says when the same two deputies hold several powers', () => {
    const s = st({ powers: { x: p({ id: 'x', power: 'Paie', deputies: ['A', 'B'], practiced: ['2026-09-01', '2026-09-01'] }), y: p({ id: 'y', power: 'Clés', holder: 'Zoé', deputies: ['b', 'a'], practiced: ['2026-09-01', '2026-09-01'] }), z: p({ id: 'z', power: 'Autre', deputies: ['A', 'C'], practiced: ['2026-09-01', '2026-09-01'] }) } });
    expect(powerInsights(s, now).filter(i => i.key.startsWith('pair')).map(i => i.text)).toEqual(["A et B pour Paie, Clés : l'absence de l'un d'eux touche toutes ces fonctions."]);
  });
  it('lists the last readings of the list, by day and person', () => {
    const s = st({ powers: { a: p({ id: 'a', reviewedAt: '2026-09-01', reviewedBy: 'Jean' }), b: p({ id: 'b', reviewedAt: '2026-09-01', reviewedBy: 'Jean' }), c: p({ id: 'c', reviewedAt: '2025-08-01', reviewedBy: 'Anne' }), d: p({ id: 'd' }) } });
    expect(reviewHistory(s)).toEqual([{ at: '2026-09-01', by: 'Jean', count: 2 }, { at: '2025-08-01', by: 'Anne', count: 1 }]);
  });
  it('removes the example and what was written on its powers, and leaves what the company holds', () => {
    const d = demoState(now);
    d.powers.pw_mine = p({ id: 'pw_mine', power: 'Le mien' }); d.practices.pr_x = { ...newPractice('pw_demo_1', 'Hélène R.', 'Test', now), id: 'pr_x' }; d.practices.pr_mine = { ...newPractice('pw_mine', 'A', 'Test', now), id: 'pr_mine' };
    expect(hasPowerExample(d)).toBe(true);
    const gone = removePowerExample(d);
    expect(gone).toEqual({ powers: 9, practices: 6, covers: 2, vaults: 2 });
    expect(Object.keys(d.powers)).toEqual(['pw_mine']);
    expect(Object.keys(d.practices)).toEqual(['pr_mine']);
    expect(d.vlogs).toEqual({});
    expect(hasPowerExample(d)).toBe(false);
    expect(removePowerExample(d)).toEqual({ powers: 0, practices: 0, covers: 0, vaults: 0 });
  });
});

describe('4.1 the link with the directory', () => {
  const mk = () => {
    const d = demoState(now), p = Object.values(d.powers)[0];
    return { d, p };
  };
  it('gives a link to the names that are exactly a person of the lists, once', () => {
    const { d, p } = mk();
    const n = syncPowerPeople(d);
    expect(n).toBeGreaterThan(0);
    expect(p.refs?.[norm(p.holder)]).toMatch(/^p:/);
    expect(syncPowerPeople(d)).toBe(0);
  });
  it('carries a rename of the directory to the power, its practices and its absences', () => {
    const { d, p } = mk();
    syncPowerPeople(d);
    const old = p.holder, person = Object.values(d.people).find(x => norm(x.name) === norm(old))!;
    d.practices.x1 = { id: 'x1', powerId: p.id, who: old, date: '2026-01-01', checkedBy: old, note: '', at: '', by: '' };
    person.name = 'Nouveau Nom';
    expect(syncPowerPeople(d)).toBeGreaterThan(0);
    expect(p.holder).toBe('Nouveau Nom');
    expect(d.practices.x1.who).toBe('Nouveau Nom');
    expect(p.refs?.[norm('Nouveau Nom')]).toBeDefined();
    expect(p.refs?.[norm(old)]).toBeUndefined();
  });
  it('keeps the link while a name is being typed, and drops it when the person is gone', () => {
    const { d, p } = mk();
    syncPowerPeople(d);
    const person = Object.values(d.people).find(x => norm(x.name) === norm(p.holder))!;
    person.name = '';
    syncPowerPeople(d);
    expect(Object.keys(p.refs || {}).length).toBeGreaterThan(0);
    delete d.people[person.id];
    syncPowerPeople(d);
    expect(p.refs?.[norm(p.holder)]).toBeUndefined();
  });
});

describe('4.1 the signatures: the direction signs for the holder (2), the holder and the direction validate a deputy (3)', () => {
  const setup = () => {
    const d = demoState(now), head = headOf(d)!.name, p0 = Object.values(d.powers).find(x => x.holder && x.holder !== head && x.deputies[0] && x.deputies[0] !== head && x.deputies[1] && x.deputies[1] !== head)!;
    const p: Power = { ...p0, signs: {}, forms: {}, delegationSigned: false };
    return { d, head, p };
  };
  it('asks two signatures for the holder and three for each deputy', () => {
    const { d, head, p } = setup();
    const needs = signNeeds(d, p), of = (n: string) => needs.filter(x => norm(x.subject) === norm(n)).map(x => `${x.slot}:${x.who}`);
    expect(of(p.holder)).toEqual([`self:${p.holder}`, `direction:${head}`]);
    expect(of(p.deputies[0])).toEqual([`self:${p.deputies[0]}`, `holder:${p.holder}`, `direction:${head}`]);
    expect(needs).toHaveLength(2 + 3 * 2);
  });
  it('does not ask the head twice: when he is the holder he signs once for himself, and he validates his deputies only once', () => {
    const { d, head, p } = setup();
    const q = { ...p, holder: head }, needs = signNeeds(d, q);
    expect(needs.filter(x => x.subjectRole === 'holder').map(x => x.slot)).toEqual(['self']);
    expect(needs.filter(x => norm(x.subject) === norm(q.deputies[0])).map(x => x.slot)).toEqual(['self', 'holder']);
  });
  it('is ready only when all are signed; the text is frozen with the signature and the formality is ticked at the last one', () => {
    const { d, p } = setup();
    expect(powerState(p, now, d, powerCfg(d.params))).toBe('unsigned');
    let q = p;
    const needs = signNeeds(d, q);
    needs.slice(0, -1).forEach(n => { q = signPerson(d, q, n, 'data:image/png;base64,AAAA', '2026-09-25'); });
    expect(signStatus(d, q).missing).toHaveLength(1);
    expect(q.forms?.deleg).toBeUndefined();
    expect(powerState(q, now, d, powerCfg(d.params))).toBe('unsigned');
    expect(q.signs![signKey(needs[0].subject, needs[0].slot)].text).toContain(p.power);
    q = signPerson(d, q, needs.at(-1)!, '', '2026-09-27');
    expect(signStatus(d, q).complete).toBe(true);
    expect(q.forms?.deleg).toBe('2026-09-27');
    expect(powerState(q, now, d, powerCfg(d.params))).toBe('ok');
    expect(signStatus(d, unsignPerson(q, needs[1])).complete).toBe(false);
  });
  it('writes the limits in the text of a deputy, and follows a rename', () => {
    const { d, p } = setup();
    const need = signNeeds(d, p).find(x => x.subjectRole === 'deputy' && x.slot === 'self')!;
    expect(signText({ ...p, limits: 'jamais seul' }, need, '2026-09-25')).toContain('jamais seul');
    expect(signText({ ...p, limits: '' }, need, '2026-09-25')).toContain('aucune limite précisée');
    d.powers[p.id] = signPerson(d, p, need, '', '2026-09-25');
    syncPowerPeople(d);
    const person = Object.values(d.people).find(x => norm(x.name) === norm(need.subject))!;
    person.name = 'Renommé Test';
    syncPowerPeople(d);
    expect(d.powers[p.id].signs?.[signKey('Renommé Test', 'self')]).toMatchObject({ subject: 'Renommé Test', who: 'Renommé Test' });
  });
});

describe('4.1 the card of the directory: functions of a person', () => {
  it('lists the functions held first, then the ones where she is a deputy, with who is on the other side and where each stands', () => {
    const d = demoState(now), hele = functionsOf(d, 'Hélène R.', now);
    expect(hele.map(f => f.role)).toEqual(['titulaire', 'suppléant']);
    expect(hele[0]).toMatchObject({ role: 'titulaire', others: expect.arrayContaining(['Jean-Marc']) });
    expect(hele[1]).toMatchObject({ role: 'suppléant', holder: 'Jean-Marc' });
    expect(hele[1].others).not.toContain('Hélène R.');
    expect(functionsOf(d, 'Marc M.', now).find(f => f.st === 'no_deputy')).toMatchObject({ role: 'titulaire', others: [] });
    expect(functionsOf(d, '', now)).toEqual([]);
    expect(functionsOf(d, 'Personne Inconnue', now)).toEqual([]);
  });
});

describe('4.1 a function that expects one deputy, or none, shows nothing in red', () => {
  const d0 = demoState(now), cfg = () => powerCfg(d0.params);
  it('is not a gap to have as many deputies as the function expects', () => {
    const p = Object.values(d0.powers).find(x => x.id === 'pw_demo_6')!;   // the CNC: nobody named
    expect(wantedOf(p)).toBe(2);
    expect(powerState(p, now, d0, cfg())).toBe('no_deputy');
    const none: Power = { ...p, wanted: 0 };
    expect(powerState(none, now, d0, cfg())).toBe('ok');   // only the holder and the direction sign, and the example has them
    expect(powerState({ ...none, signs: {}, forms: {} }, now, d0, cfg())).toBe('unsigned');
    let q: Power = { ...none, signs: {}, forms: {} };
    signNeeds(d0, q).forEach(n => { q = signPerson(d0, q, n, '', '2026-09-25'); });
    expect(signNeeds(d0, q)).toHaveLength(2);
    expect(powerState(q, now, d0, cfg())).toBe('ok');
    const one: Power = { ...p, wanted: 1, deputies: ['Julien P.', ''] };
    expect(powerState(one, now, d0, cfg())).toBe('unsigned');
    let r = one;
    signNeeds(d0, r).forEach(n => { r = signPerson(d0, r, n, '', '2026-09-25'); });
    expect(powerState(r, now, d0, cfg())).toBe('ok');
    expect(powerState({ ...one, deputies: ['', ''] }, now, d0, cfg())).toBe('no_deputy');   // one is expected and none is named
  });
  it('raises no task, no red cover and no gap for a function that expects none', () => {
    const d = structuredClone(d0) as State;
    d.powers.pw_demo_6.wanted = 0;
    expect(powerTodos(d, now).some(t => t.kind === 'none' && t.powerId === 'pw_demo_6')).toBe(false);
    const c = coverFor(d, 'Marc M.', '2026-09-25', '2026-10-02', now).holds.find(h => h.power.id === 'pw_demo_6')!;
    expect(c.status).toBe('none');
    expect(futureGaps(d, now, 90).some(g => g.power.id === 'pw_demo_6')).toBe(false);
    expect(absentToday(d, now).every(a => a.uncovered === 0 || a.name !== 'Marc M.')).toBe(true);
    expect(functionsOf(d, 'Marc M.', now).find(f => f.id === 'pw_demo_6')).toMatchObject({ wanted: 0, st: 'ok' });
  });
});
