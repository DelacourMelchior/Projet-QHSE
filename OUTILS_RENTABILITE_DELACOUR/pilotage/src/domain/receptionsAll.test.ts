// Tool 3.4 as a whole: the tasks of the queue, what each one opens, the facts, the summary, the level of a card, the status of the tab and "Mes tâches".
import { describe, expect, it } from 'vitest';
import type { Delivery, Lot, Milestone, State, Strokes } from './types';
import { deliveryLevel, quotesWithoutOrder, receptionFocus, receptionInsights, receptionSummary, receptionTodos, urgency } from './receptionsAll';
import {
  addReserve, archiveDelivery, checkMilestone, linkMilestoneNc, linkReserveNc, liftReserve, newDelivery, nextPresentation, patchReserve, refuse, releaseDelivery, sealOf, setQuantities, setResult, signClient, startReception, upgradeDelivery, waiveMilestone,
} from './receptions';
import { toolBadge } from './status';
import { allTasks } from './tasks';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { newNc } from './quality';
import { newQuote } from './commercial';
import { demoState } from './templates';

// The texts of the tool carry the no-break spaces of French typography (nb, base.ts): read as plain spaces here, whatever the shape of what is compared
const sp = <T,>(x: T): T => (typeof x === 'string' ? x.replace(/[\u00a0\u202f]/g, ' ') : Array.isArray(x) ? x.map(sp) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, sp(v)])) : x) as T;
const now = new Date(2026, 8, 25, 10, 0);   // Friday 25 September 2026
const st = (ds: Delivery[] = [], over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), deliveries: Object.fromEntries(ds.map(d => [d.id, d])), ...over,
});
const P = st().params;
const at = (day: string, hm = '10:00') => `${day}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];   // a drawing worth a signature (signatureOk)
const A = 'Alice', IDS = ['m1', 'm2', 'm3'];
// a lift needs a person and a proof (photo, note or the signature of the customer); in these tests the moment of the writing is the moment of the fact
const lift = (d: Delivery, rid: string, r: Parameters<typeof liftReserve>[2]) => liftReserve(d, rid, { now: r.at, note: 'Constaté sur place', ...r });
const ms = (): Milestone[] => IDS.map((id, i) => ({ id, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (id: string, over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id, ref: `CMD-${id.toUpperCase()}`, client: 'Société Martin', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const ko = (d: Delivery, mid = 'm1', day = '2026-09-18') => checkMilestone(d, mid, { ok: false, by: A, at: at(day) });
const allOk = (d: Delivery, day = '2026-09-10') => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at(day, '09:00') }), d);
const released = (d: Delivery, day = '2026-09-11') => releaseDelivery(allOk(d), { by: 'Marc', at: at(day, '16:00') });
const delivered = (d: Delivery, day: string, result?: 'sans' | 'reserve') => { const x = startReception(d, { at: at(day, '14:00'), place: 'Site' }); return result ? setResult(x, result, at(day, '14:30')) : x; };
const signed = (d: Delivery, day: string) => signClient(d, ink, at(day, '14:40'), A);
// A fixture changed by hand after the signature (a quantity put in the reception): the seal is laid again, as the app does through a correction, so that the test says only what it means to say
// (a PV whose content no longer matches its seal is a fact of its own, tested at the end)
const reseal = (d: Delivery): Delivery => (d.reception.seals?.length ? { ...d, reception: { ...d.reception, seals: [{ hash: sealOf(d), at: d.reception.seals.at(-1)!.at, by: A }] } } : d);
const todosOf = (...ds: Delivery[]) => receptionTodos(st(ds), now);
const core = (...ds: Delivery[]) => todosOf(...ds).filter(t => t.kind !== 'feedback');   // without the review of the end (a recent reception has one)
const imperative = /(^|[.;:] )(faire|lever|libérer|signer|créer|poser|déclarer|contrôler|recontrôler|relancer|recontacter|traiter|livrer|décider|donner|préparer|terminer|décrire)\b|\bne pas\b|\bdoit\b|\bil faut\b|€/i;

describe('3.4 tasks of the queue', { timeout: 30_000 }, () => {
  it('lists the first milestone still to check of an order in progress, with its day (the promised one) and the person of the order', () => {
    const d = checkMilestone(dl('a', { promisedAt: '2026-10-15', team: ['Julien P.', 'Awa'] }), 'm1', { ok: true, by: A, at: at('2026-09-20') });
    expect(sp(todosOf(d))).toEqual([{ id: 'jl:a:m2', kind: 'milestone', text: 'Contrôler le jalon 2 « Étape 2 » de CMD-A (Société Martin)', tone: 'warn', who: 'Julien P.', due: '2026-10-15', deliveryId: 'a', milestoneId: 'm2' }]);
    // one per order, the milestones that do not apply are skipped
    expect(todosOf(dl('b'), dl('c', { milestones: ms().map((m, i) => (i === 0 ? { ...m, na: true } : m)) })).map(t => t.milestoneId)).toEqual(['m1', 'm2']);
  });
  it('says a milestone not conform without defect, then with its defect and no decision (red, one task), then decided (to check again)', () => {
    const d = ko(dl('b'));
    expect(sp(todosOf(d))).toEqual([expect.objectContaining({ kind: 'blocked', tone: 'bad', milestoneId: 'm1', due: '2026-09-18', text: 'Traiter le jalon 1 « Étape 1 » de CMD-B (Société Martin), non conforme depuis le 18 sept. : défaut à déclarer ou reprise' })]);
    const nc = { ...newNc(st(), A), id: 'nc1', ref: 'NC-2026-001' }, linked = linkMilestoneNc(d, 'm1', 'nc1');
    const open = receptionTodos(st([linked], { ncs: { nc1: nc } }), now);
    expect(sp(open)).toEqual([expect.objectContaining({ kind: 'defect', tone: 'bad', milestoneId: 'm1', text: 'Décider du défaut NC-2026-001 lié au jalon 1 « Étape 1 » de CMD-B (Société Martin)' })]);
    const waiting = receptionTodos(st([linked], { ncs: { nc1: { ...nc, decision: 'attente' } } }), now);
    expect(waiting.map(t => t.kind)).toEqual(['defect']);
    const decided = receptionTodos(st([linked], { ncs: { nc1: { ...nc, decision: 'retouche' } } }), now);
    expect(sp(decided)).toEqual([expect.objectContaining({ kind: 'blocked', text: 'Recontrôler le jalon 1 « Étape 1 » de CMD-B (Société Martin) après la décision du défaut NC-2026-001' })]);
    // a defect that no longer exists is a milestone without defect; passing over the milestone (derogation) lifts the block
    expect(receptionTodos(st([linked]), now).map(t => t.kind)).toEqual(['blocked']);
    expect(todosOf(waiveMilestone(d, 'm1', 'Marc', 'accord du client', at('2026-09-19'))).map(t => t.kind)).toEqual(['milestone']);
  });
  it('lists an order to release, then released (to deliver), and says a late delivery once whatever the step', () => {
    expect(todosOf(allOk(dl('c', { promisedAt: '2026-10-05' })))).toEqual([expect.objectContaining({ kind: 'release', text: 'Libérer CMD-C (Société Martin)', tone: 'warn', due: '2026-10-05' })]);
    expect(todosOf(released(dl('d', { promisedAt: '2026-09-30' })))).toEqual([expect.objectContaining({ kind: 'ship', text: 'Livrer CMD-D (Société Martin)', due: '2026-09-30' })]);
    for (const d of [dl('e', { promisedAt: '2026-09-22' }), allOk(dl('f', { promisedAt: '2026-09-22' })), released(dl('g', { promisedAt: '2026-09-22' })), ko(dl('h', { promisedAt: '2026-09-22' }))]) {
      const late = todosOf(d).filter(t => t.kind === 'late-delivery');
      expect(sp(late), d.id).toEqual([expect.objectContaining({ tone: 'bad', due: '2026-09-22', text: `Livrer ${d.ref} (Société Martin) : promise le 22 sept., 3 jours de retard` })]);
    }
    expect(todosOf(released(dl('g', { promisedAt: '2026-09-22' }))).map(t => t.kind)).toEqual(['late-delivery']);   // not also "to deliver"
    expect(todosOf(delivered(released(dl('i', { promisedAt: '2026-09-22' })), '2026-09-22')).some(t => t.kind === 'late-delivery')).toBe(false);   // delivered: not late
  });
  it('asks to have the PV signed once the delay of the settings is over, with or without a result', () => {
    const fresh = delivered(released(dl('e')), '2026-09-24', 'sans');   // one day ago: within the 2 days
    expect(core(fresh)).toEqual([]);
    const old = delivered(released(dl('e')), '2026-09-22', 'sans');
    expect(core(old)).toEqual([expect.objectContaining({ kind: 'unsigned', tone: 'warn', text: 'Faire signer le PV de CMD-E (Société Martin)', due: '2026-09-24' })]);
    expect(sp(core(delivered(released(dl('e')), '2026-09-22'))[0].text)).toBe('Terminer la réception de CMD-E (Société Martin) : résultat et signature du client');
    expect(core(signed(old, '2026-09-22'))).toEqual([]);
    // the number of days is a setting
    const slow = st([old], { params: { ...P, reception: { unsignedDays: 5 } } });
    expect(receptionTodos(slow, now).filter(t => t.kind !== 'feedback')).toEqual([]);
  });
  it('gives each open reservation its own task, its own deadline, red when late, and the person who takes charge', () => {
    let d = delivered(released(dl('f')), '2026-09-08', 'reserve');
    d = addReserve(d, { text: 'Poignée desserrée', by: A, at: at('2026-09-08', '15:00') });
    d = addReserve(d, { text: 'Rayure sur le côté', by: A, at: at('2026-09-22', '15:00') });
    const [r1, r2] = d.reception.reserves!;
    d = signed(patchReserve(d, r2.id, { handler: 'Awa' }), '2026-09-08');
    const todos = core(d);
    expect(sp(todos)).toEqual([
      expect.objectContaining({ id: `rv:f:${r1.id}`, kind: 'reserve-late', tone: 'bad', due: '2026-09-17', reserveId: r1.id, who: '', text: 'Lever la réserve « Poignée desserrée » de CMD-F (Société Martin), en retard de 6 jours' }),
      expect.objectContaining({ id: `rv:f:${r2.id}`, kind: 'reserve', tone: 'warn', due: '2026-10-01', reserveId: r2.id, who: 'Awa', text: 'Lever la réserve « Rayure sur le côté » de CMD-F (Société Martin)' }),
    ]);
    // the one that is lifted goes away
    const lifted = lift(d, r1.id, { at: at('2026-09-24'), by: 'M. Durand' });
    expect(core(lifted).map(t => t.kind)).toEqual(['reserve']);
    // a result "with reservation" that has no reservation written yet
    const bare = signed(delivered(released(dl('f')), '2026-09-20', 'reserve'), '2026-09-20');
    expect(core(bare)).toEqual([expect.objectContaining({ kind: 'reserve', text: 'Décrire la réserve de CMD-F (Société Martin)' })]);
  });
  it('lists a defect linked to a reservation without decision, a refusal to follow up, and the quantity left to deliver', () => {
    let d = addReserve(delivered(released(dl('f')), '2026-09-22', 'reserve'), { text: 'Joint abîmé', by: A, at: at('2026-09-22', '15:00') });
    d = signed(d, '2026-09-22');
    const rid = d.reception.reserves![0].id, nc = { ...newNc(st(), A), id: 'nc2', ref: 'NC-2026-002' };
    d = reseal({ ...d, reception: { ...d.reception, qty: 4, reserves: [{ ...d.reception.reserves![0], ncId: 'nc2' }] } });
    const todos = receptionTodos(st([d], { ncs: { nc2: nc } }), now).filter(t => t.kind !== 'feedback');
    expect(todos.map(t => t.kind).sort()).toEqual(['defect', 'next-lot', 'reserve']);
    expect(sp(todos.find(t => t.kind === 'defect'))).toMatchObject({ tone: 'warn', reserveId: rid, text: 'Décider du défaut NC-2026-002 lié à la réserve « Joint abîmé » de CMD-F (Société Martin)' });
    expect(sp(todos.find(t => t.kind === 'next-lot'))).toMatchObject({ text: 'Livrer le reste de CMD-F (Société Martin) : 6 à livrer', tone: 'warn' });
    const refused = signed(refuse(delivered(released(dl('g')), '2026-09-22'), { reason: 'Quantité incorrecte', next: 'À reprendre et livrer à nouveau' }, at('2026-09-22', '15:00'), A), '2026-09-22');
    expect(sp(todosOf(refused))).toEqual([expect.objectContaining({ kind: 'refused', tone: 'bad', due: '2026-09-22', text: 'Donner suite à la réception refusée de CMD-G (Société Martin) : à reprendre et livrer à nouveau' })]);
    const other = signed(refuse(delivered(released(dl('g')), '2026-09-22'), { reason: 'Autre', other: 'Teinte', next: 'Autre', nextOther: 'Rachat par le client' }, at('2026-09-22', '15:00'), A), '2026-09-22');
    expect(sp(todosOf(other)[0].text)).toBe('Donner suite à la réception refusée de CMD-G (Société Martin) : Rachat par le client');   // what was typed is said as it was typed (A-4)
  });
  it('says the rest to deliver in red once the promised day is past, and once the next delivery is opened it is an order in progress again', () => {
    const part = signed(setResult(delivered(released(dl('h', { qty: 10, promisedAt: '2026-09-20' })), '2026-09-18'), 'sans', at('2026-09-18')), '2026-09-18');
    const part4 = reseal({ ...part, reception: { ...part.reception, qty: 4 } });
    expect(sp(core(part4))).toEqual([expect.objectContaining({ kind: 'next-lot', tone: 'bad', text: 'Livrer le reste de CMD-H (Société Martin) : 6 à livrer', due: '2026-09-20' })]);
    const next = nextPresentation(part4, A, at('2026-09-19'));
    expect(core(next).map(t => t.kind)).toEqual(['late-delivery', 'milestone']);
  });
  it('lists the review of the end for the queue (a reception without review in the last two weeks), and nothing for an archived order', () => {
    const d = signed(delivered(released(dl('j', { qty: 1 })), '2026-09-20', 'sans'), '2026-09-20');
    expect(sp(todosOf(d))).toEqual([expect.objectContaining({ kind: 'feedback', tone: 'warn', due: '2026-09-20', text: 'Poser le bilan de fin (3 questions) : CMD-J (Société Martin)' })]);
    expect(todosOf(archiveDelivery(ko(dl('b')), at('2026-09-25'), 'doublon'))).toEqual([]);
  });
  it('sorts the red ones first, then by day (the ones without a day last), and gives each task a stable unique id', () => {
    const ds = [dl('a', { promisedAt: '2026-10-15' }), ko(dl('b', { promisedAt: '2026-09-20' })), allOk(dl('c', { promisedAt: '2026-10-01' })), released(dl('d', { promisedAt: '2026-09-30' })), refuse(delivered(released(dl('g')), '2026-09-22'), { reason: 'Autre', other: 'x', next: 'À remplacer' }, at('2026-09-22'), A)];
    const todos = todosOf(...ds);
    expect(todos.map(t => `${t.tone}:${t.kind}:${t.deliveryId}`)).toEqual(['bad:blocked:b', 'bad:late-delivery:b', 'bad:refused:g', 'warn:unsigned:g', 'warn:ship:d', 'warn:release:c', 'warn:milestone:a']);   // the finding of the day comes before the refusal (D-14: they have a day now)
    expect(new Set(todos.map(t => t.id)).size).toBe(todos.length);
    expect(receptionTodos(st(ds), now).map(t => t.id)).toEqual(todos.map(t => t.id));
    expect(urgency(todos, 'b')).toBe(20);
    expect(urgency(todos, 'a')).toBe(1);
    expect(urgency(todos, 'zz')).toBe(0);
  });
  it('keeps two orders of the same company apart: each has its own tasks, the facts list both', () => {
    const a = ko(dl('a', { promisedAt: '2026-09-20', client: 'Société Martin' })), b = ko(dl('b', { promisedAt: '2026-09-21', client: 'Société Martin' }));
    const todos = todosOf(a, b);
    expect(todos.filter(t => t.deliveryId === 'a').length).toBe(2);
    expect(todos.filter(t => t.deliveryId === 'b').length).toBe(2);
    expect(urgency(todos, 'a')).toBe(20);
    const facts = receptionInsights(st([a, b]), now);
    expect(sp(facts.find(f => f.key === 'late-delivery')?.text)).toBe('CMD-A (Société Martin) : promise le 20 sept., 4 jours de retard ; CMD-B (Société Martin) : promise le 21 sept., 4 jours de retard.');
    expect(sp(facts.find(f => f.key === 'blocked')?.text)).toContain('CMD-A (Société Martin) : jalon 1 « Étape 1 » non conforme depuis le 18 sept.');
    expect(facts.find(f => f.key === 'blocked')?.text).toContain('CMD-B (Société Martin)');
  });
  it('changes nothing in what it reads', () => {
    const deep = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o).forEach(deep); Object.freeze(o); } return o; };
    const s = deep(st(fleet()));
    expect(() => { receptionTodos(s, now); receptionInsights(s, now); receptionSummary(s, now); quotesWithoutOrder(s); toolBadge(s, '3.4', '2026-09', now); allTasks(s, now); }).not.toThrow();
  });
  it('writes every task as an infinitive, without an amount', () => {
    const d1 = ko(dl('b', { promisedAt: '2026-09-20' })), d2 = allOk(dl('c')), d3 = delivered(released(dl('e')), '2026-09-20', 'sans');
    todosOf(d1, d2, d3, dl('a')).forEach(t => { expect(t.text, t.id).toMatch(/^(Contrôler|Traiter|Recontrôler|Décider|Libérer|Livrer|Faire|Terminer|Lever|Décrire|Donner|Poser)\b/); expect(t.text).not.toContain('€'); });
  });
});

describe('3.4 what a task opens', { timeout: 30_000 }, () => {
  const t = (kind: string, extra: object = {}) => ({ id: 'x', kind, text: '', tone: 'warn', who: '', due: '', deliveryId: 'dl9', ...extra }) as never;
  it('gives the focus of the tool: the milestones full screen, the sheet on its tab', () => {
    expect(receptionFocus(t('milestone', { milestoneId: 'm1' }))).toBe('jalon:dl9');
    expect(receptionFocus(t('blocked'))).toBe('dl9:milestones');
    expect(receptionFocus(t('defect', { milestoneId: 'm1' }))).toBe('dl9:milestones');
    expect(receptionFocus(t('defect', { reserveId: 'rv1' }))).toBe('dl9:reception:rv1');
    expect(receptionFocus(t('release'))).toBe('dl9:release');
    expect(['unsigned', 'ship'].map(k => receptionFocus(t(k)))).toEqual(['reception:dl9', 'reception:dl9']);   // at the customer's: the reception full screen
    expect(['reserve', 'reserve-late'].map(k => receptionFocus(t(k)))).toEqual(['dl9:reception', 'dl9:reception']);   // no reservation to point at (a result "avec réserve" not described yet)
    expect(['reserve', 'reserve-late'].map(k => receptionFocus(t(k, { reserveId: 'rv1' })))).toEqual(['dl9:reception:rv1', 'dl9:reception:rv1']);   // a task of a reservation: the sheet scrolls to it
    expect(['refused', 'next-lot', 'feedback'].map(k => receptionFocus(t(k)))).toEqual(['dl9:follow', 'dl9:follow', 'dl9:follow']);
    expect(receptionFocus(t('late-delivery'))).toBe('dl9');
  });
});

// A company with an order at each step
const fleet = () => {
  const a = checkMilestone(dl('a', { promisedAt: '2026-10-15' }), 'm1', { ok: true, by: A, at: at('2026-09-20') });
  const b = ko(dl('b', { promisedAt: '2026-09-20' }));
  const c = allOk(dl('c'));
  const d = released(dl('d', { promisedAt: '2026-09-30' }));
  const e = delivered(released(dl('e')), '2026-09-21', 'sans');
  const f = signed(addReserve(delivered(released(dl('f'), '2026-09-05'), '2026-09-08', 'reserve'), { text: 'Poignée desserrée', by: A, at: at('2026-09-08', '15:00') }), '2026-09-08');
  const g = signed(refuse(delivered(released(dl('g')), '2026-09-22'), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-22', '15:00'), A), '2026-09-22');
  const h = signed(setResult(delivered(released(dl('h', { qty: 10 })), '2026-09-18'), 'sans', at('2026-09-18')), '2026-09-18');
  const i = archiveDelivery(dl('i'), at('2026-09-01'), 'test');
  return [a, b, c, d, e, f, { ...g, qty: 10 }, reseal({ ...h, reception: { ...h.reception, qty: 4 } }), i];
};

describe('3.4 facts', { timeout: 30_000 }, () => {
  it('states what happens, who and since when, with stable keys, red first', () => {
    const s = st(fleet(), { params: { ...P, reception: { retention: { on: true, maxPct: 5 }, releasers: ['Marc'] } } });
    s.deliveries.e = { ...s.deliveries.e, reception: { ...s.deliveries.e.reception, retentionPct: 10 } };
    const facts = receptionInsights(s, now);
    expect(facts.map(f => f.key)).toEqual(['blocked', 'late-delivery', 'reserve-late', 'refused', 'unsigned', 'rest', 'retention']);
    expect(facts.map(f => f.tone)).toEqual(['bad', 'bad', 'bad', 'bad', 'warn', 'warn', 'warn']);
    const by = Object.fromEntries(facts.map(f => [f.key, f.text]));
    expect(sp(by.blocked)).toBe('CMD-B (Société Martin) : jalon 1 « Étape 1 » non conforme depuis le 18 sept.');
    expect(sp(by['late-delivery'])).toBe('CMD-B (Société Martin) : promise le 20 sept., 4 jours de retard.');   // a Sunday: due the Monday, then four working days
    expect(sp(by['reserve-late'])).toBe('CMD-F (Société Martin) : « Poignée desserrée » à lever pour le 17 sept., 6 jours de retard.');
    expect(sp(by.refused)).toBe('CMD-G (Société Martin) : refusée le 22 sept. (motif : Quantité incorrecte).');
    expect(sp(by.unsigned)).toBe('CMD-E (Société Martin) : livrée le 21 sept., 4 jours sans signature.');
    expect(sp(by.rest)).toBe('CMD-H (Société Martin) : 6 sur 10 restent à livrer.');
    expect(sp(by.retention)).toBe('CMD-E (Société Martin) : retenue de 10 % saisie, 5 % au maximum prévu.');
  });
  it('gives only facts: no euro, no order, no verb at the imperative', () => {
    const d = released(dl('d'));
    const waived = { ...d, derogation: { by: 'Awa', why: 'Accord du client', at: at('2026-09-11') }, releasedBy: 'Awa' };
    const rv = (id: string, ref: string) => signed(addReserve(delivered(released(dl(id, { ref })), '2026-09-22', 'reserve'), { text: 'Joint abîmé', by: A, at: at('2026-09-22', '15:00') }), '2026-09-22');
    const s = st([...fleet(), waived, rv('k', 'CMD-K'), rv('l', 'CMD-L')], { params: { ...P, reception: { retention: { on: true, maxPct: 5 }, releasers: ['Marc'] } } });
    s.deliveries.e = { ...s.deliveries.e, reception: { ...s.deliveries.e.reception, retentionPct: 10 } };
    const facts = receptionInsights(s, now);
    expect(facts.map(f => f.key)).toEqual(['blocked', 'late-delivery', 'reserve-late', 'refused', 'unsigned', 'rest', 'retention', 'derogation', 'releaser', 'repeat-reserve']);
    facts.forEach(f => { expect(`${f.title} ${f.text}`, f.key).not.toMatch(imperative); expect(f.title).not.toMatch(/facture|retenus par/i); });
    const by = Object.fromEntries(facts.map(f => [f.key, f.text]));
    expect(sp(by.derogation)).toBe('CMD-D (Société Martin) : libérée le 11 sept. par Awa (Accord du client).');
    expect(sp(by.releaser)).toBe('CMD-D (Société Martin) : libérée par Awa, absent de la liste des personnes qui libèrent.');
    expect(sp(by['repeat-reserve'])).toBe('« Joint abîmé » sur 2 commandes en 12 mois (CMD-K, CMD-L).');
  });
  it('says nothing for a company in order, an archived order, or an order with no figure to state', () => {
    expect(receptionInsights(st(), now)).toEqual([]);
    expect(receptionInsights(st([archiveDelivery(ko(dl('b', { promisedAt: '2026-09-01' })), at('2026-09-25'), 'x')]), now)).toEqual([]);
    expect(receptionInsights(st([signed(delivered(released(dl('h', { qty: null }), '2026-07-30'), '2026-08-01', 'sans'), '2026-08-01')]), now)).toEqual([]);
  });
});

describe('3.4 summary and cards', { timeout: 30_000 }, () => {
  it('counts the orders by state and gives the figures of the tiles', () => {
    const state = st(fleet()), s = receptionSummary(state, now);
    expect(s.counts).toEqual({ in_progress: 1, blocked: 1, to_release: 1, released: 1, delivered: 0, accepted: 1, partial: 1, reserve: 0, reserve_late: 1, lifted: 0, refused: 1, archived: 1 });
    expect(s).toMatchObject({ inProgress: 1, blockedCount: 1, openReserves: 1, lateReserves: 1, received: 2, sansReservePct: 50 });   // E has no signed PV: it is not a reception pronounced
    expect(s.todos).toEqual(receptionTodos(state, now));
    expect(s.insights).toEqual(receptionInsights(state, now));
  });
  it('has no share to give without any reception pronounced in the last 12 months, and counts the deliveries in several times once each', () => {
    expect(receptionSummary(st(), now)).toMatchObject({ sansReservePct: null, received: 0, openReserves: 0, lateReserves: 0 });
    expect(receptionSummary(st([signed(delivered(released(dl('h')), '2025-08-01', 'sans'), '2025-08-01')]), now).received).toBe(0);
    const first = signed(delivered(released(dl('h', { qty: 10 })), '2026-09-10', 'sans'), '2026-09-10');
    const two = nextPresentation(reseal({ ...first, reception: { ...first.reception, qty: 4 } }), A, at('2026-09-11'));
    const done = signed(delivered(released(two), '2026-09-20', 'reserve'), '2026-09-20');
    expect(receptionSummary(st([done]), now)).toMatchObject({ received: 2, sansReservePct: 50 });
  });
  it('gives each card its level: red for what is late or refused, amber for a PV or a reservation, the state otherwise', () => {
    const ds = fleet(), s = st(ds), todos = receptionTodos(s, now), lv = (id: string) => deliveryLevel(s.deliveries[id], todos, s.params, now);
    expect(lv('a')).toEqual({ level: 'pending', label: 'En cours' });
    expect(lv('b')).toEqual({ level: 'alert', label: 'Jalon non conforme' });
    expect(lv('c')).toEqual({ level: 'warn', label: 'À libérer' });
    expect(lv('d')).toEqual({ level: 'pending', label: 'Libérée, à livrer' });
    expect(lv('e')).toEqual({ level: 'warn', label: 'PV à faire signer' });
    expect(lv('f')).toEqual({ level: 'alert', label: 'Réserves en retard' });
    expect(lv('g')).toEqual({ level: 'alert', label: 'Refusée' });
    expect(lv('h')).toEqual({ level: 'warn', label: 'Reste à livrer' });
    expect(lv('i')).toEqual({ level: 'pending', label: 'Archivée' });
    // an order late to deliver says so before the state does
    const late = released(dl('z', { promisedAt: '2026-09-20' }));
    expect(deliveryLevel(late, receptionTodos(st([late]), now), P, now)).toEqual({ level: 'alert', label: 'Livraison en retard' });
    // received, signed, nothing left: in order (the state of the order says it, without tasks)
    const fine = signed(delivered(released(dl('y', { qty: 1 })), '2026-08-01', 'sans'), '2026-08-01');
    expect(deliveryLevel(fine, [], P, now)).toEqual({ level: 'ok', label: 'Reçue sans réserve' });
  });
});

describe('3.4 won quotes without an order', { timeout: 30_000 }, () => {
  it('lists the won quotes no order follows, the latest decision first', () => {
    const q = (id: string, over: object) => ({ ...newQuote(st(), now), id, ref: id.toUpperCase(), client: 'Société Martin', ...over });
    const s = st([dl('a', { quoteId: 'q2' }), dl('b', { quoteId: 'q4' })], { quotes: {
      q1: q('q1', { status: 'won', decidedAt: '2026-09-10' }), q2: q('q2', { status: 'won', decidedAt: '2026-09-11' }), q3: q('q3', { status: 'sent' }),
      q4: q('q4', { status: 'lost' }), q5: q('q5', { status: 'won', decidedAt: '2026-09-20' }),
    } });
    expect(quotesWithoutOrder(s, now).map(x => x.id)).toEqual(['q5', 'q1']);
    expect(quotesWithoutOrder(st(), now)).toEqual([]);
    // an archived order still follows its quote
    expect(quotesWithoutOrder({ ...s, deliveries: { a: archiveDelivery(s.deliveries.a, at('2026-09-25'), 'x'), b: s.deliveries.b } }, now).map(x => x.id)).toEqual(['q5', 'q1']);
  });
  // L-16: the quotes won long ago, and the ones the company set aside, are not listed forever
  it('lists only the quotes won in the last 12 months, and not the ones set aside ("Pas de suivi") (L-16)', () => {
    const q = (id: string, over: object) => ({ ...newQuote(st(), now), id, ref: id.toUpperCase(), client: 'Société Martin', status: 'won' as const, ...over });
    const quotes = {
      new: q('new', { decidedAt: '2026-09-20' }), edge: q('edge', { decidedAt: '2025-09-25' }), old: q('old', { decidedAt: '2025-09-24' }), older: q('older', { decidedAt: '2024-03-01' }),
      undated: q('undated', { decidedAt: '', date: '2026-02-01' }), undatedOld: q('undatedOld', { decidedAt: '', date: '2024-02-01' }),
    };
    expect(quotesWithoutOrder(st([], { quotes }), now).map(x => x.id)).toEqual(['new', 'undated', 'edge']);   // 365 days back from the day, the day itself included
    expect(quotesWithoutOrder(st([], { quotes }), new Date(2027, 8, 25, 10)).map(x => x.id)).toEqual([]);      // a year later none of them is still listed
    const skipped = st([], { quotes, params: { ...P, reception: { skippedQuotes: ['new', 'undated'] } } });
    expect(quotesWithoutOrder(skipped, now).map(x => x.id)).toEqual(['edge']);
    expect(quotesWithoutOrder(st([], { quotes, params: { ...P, reception: { skippedQuotes: [] } } }), now)).toHaveLength(3);
    // an order made later for a quote that was set aside does not bring it back, and a quote set aside is not an order
    expect(quotesWithoutOrder({ ...skipped, deliveries: { a: dl('a', { quoteId: 'edge' }) } }, now)).toEqual([]);
  });
});

describe('3.4 status of the tab and tasks of everyone', { timeout: 30_000 }, () => {
  it('says nothing yet for a company without orders', () => {
    expect(toolBadge(st(), '3.4', '2026-09', now)).toEqual({ n: 0, tone: 'pending', text: 'Pas encore utilisé' });
  });
  it('is red with the facts: milestones not conform, late reservations, refusals, late deliveries', () => {
    expect(sp(toolBadge(st(fleet()), '3.4', '2026-09', now))).toEqual({ n: 4, tone: 'alert', text: '1 jalon non conforme, 1 réserve en retard, 1 réception refusée, 1 livraison en retard' });
    const two = [ko(dl('a')), ko(dl('b')), released(dl('c', { promisedAt: '2026-09-01' }))];
    expect(toolBadge(st(two), '3.4', '2026-09', now)).toMatchObject({ n: 3, tone: 'alert', text: '2 jalons non conformes, 1 livraison en retard' });
  });
  it('is amber when something is left to release, to sign or to lift, and green otherwise', () => {
    const a = allOk(dl('c')), e = delivered(released(dl('e')), '2026-09-21', 'sans');
    const f = signed(addReserve(delivered(released(dl('f')), '2026-09-22', 'reserve'), { text: 'Joint', by: A, at: at('2026-09-22', '15:00') }), '2026-09-22');
    expect(toolBadge(st([a, e, f]), '3.4', '2026-09', now)).toEqual({ n: 5, tone: 'warn', text: '1 commande à libérer, 1 PV sans signature, 1 réserve à lever, 2 bilans à poser' });   // the two receptions have a review of the end to post (D-16)
    const fine = signed(delivered(released(dl('y', { qty: 1 })), '2026-08-01', 'sans'), '2026-08-01');
    expect(toolBadge(st([fine]), '3.4', '2026-09', now)).toEqual({ n: 0, tone: 'ok', text: 'Réceptions à jour' });
    // an order in progress or ready to deliver is the normal course, not a warning
    expect(toolBadge(st([dl('a'), released(dl('d', { promisedAt: '2026-10-30' }))]), '3.4', '2026-09', now).tone).toBe('ok');
  });
  it('lists the tasks in "Mes tâches" with what each opens, the review of the end once (by 2.4) and the defects left to the red bin', () => {
    const ds = fleet(), s = st(ds), todos = receptionTodos(s, now);
    const mine = allTasks(s, now).filter(t => t.tool === '3.4');
    const expected = todos.filter(t => t.kind !== 'feedback' && t.kind !== 'defect');
    expect(mine).toHaveLength(expected.length);
    expect(mine.map(t => t.focus).sort()).toEqual(expected.map(receptionFocus).sort());
    expect(new Set(mine.map(t => t.id)).size).toBe(mine.length);
    expect(sp(mine.find(t => t.focus === 'jalon:a'))).toMatchObject({ text: 'Contrôler le jalon 2 « Étape 2 » de CMD-A (Société Martin)', due: '2026-10-15' });
    // the review of the end: one task in all (tool 2.4), none from 3.4
    expect(todos.filter(t => t.kind === 'feedback').length).toBeGreaterThan(0);
    expect(mine.some(t => /bilan/i.test(t.text))).toBe(false);
    expect(allTasks(s, now).filter(t => t.tool === '2.4' && /^Bilan de fin/.test(t.text)).length).toBe(todos.filter(t => t.kind === 'feedback').length);
    // the defect of a milestone is the task of 5.1 only
    const nc = { ...newNc(st(), A), id: 'nc1', ref: 'NC-2026-001' }, linked = linkMilestoneNc(ko(dl('b')), 'm1', 'nc1');
    const tasks = allTasks(st([linked], { ncs: { nc1: nc } }), now);
    expect(tasks.filter(t => t.tool === '3.4')).toEqual([]);
    expect(tasks.filter(t => t.tool === '5.1')).toHaveLength(1);
  });
});

// ---- corrections after the review of the end of phase 2
// An order of 20 delivered in two times: the first delivery (10, one reservation, PV signed on 8 September) is closed, the second is under way
const twoTimes = (over: Partial<Delivery> = {}): Delivery => {
  const d = delivered(released(dl('t', { qty: 20, ...over }), '2026-09-05'), '2026-09-08', 'reserve');
  return nextPresentation(signed(addReserve({ ...d, reception: { ...d.reception, qty: 10 } }, { text: 'Poignée desserrée', by: A, at: at('2026-09-08', '15:00') }), '2026-09-08'), A, at('2026-09-09'));
};

describe('3.4 the reservations of a closed delivery are followed everywhere', { timeout: 30_000 }, () => {
  it('lists the task to lift it with the number of its delivery, red when late, beside the tasks of the delivery under way', () => {
    const d = twoTimes(), rv = d.lots![0].reception.reserves![0], todos = core(d);
    expect(sp(todos)).toEqual([
      expect.objectContaining({ id: `rv:t:${rv.id}`, kind: 'reserve-late', tone: 'bad', due: '2026-09-17', reserveId: rv.id, text: 'Lever la réserve « Poignée desserrée » de CMD-T (Société Martin), livraison 1, en retard de 6 jours' }),
      expect.objectContaining({ kind: 'milestone', milestoneId: 'm1', text: 'Contrôler le jalon 1 « Étape 1 » de CMD-T (Société Martin)' }),
    ]);
    expect(receptionFocus(todos[0])).toBe(`t:reception:${rv.id}`);
    const late = core(released(twoTimes({ promisedAt: '2026-09-20' }))).map(t => t.kind);   // the promised day is typed before the delivery is closed: afterwards it is part of the seal
    expect(late).toEqual(['reserve-late', 'late-delivery']);   // the flow of the delivery under way goes on
    const lifted = lift(d, rv.id, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(core(lifted).map(t => t.kind)).toEqual(['milestone']);
    expect(core(delivered(allOk(d), '2026-09-12', 'sans')).map(t => t.kind)).toContain('reserve-late');
    // a defect declared from that reservation is decided like any other
    const nc = { ...newNc(st(), A), id: 'nc7', ref: 'NC-2026-007' }, linked = linkReserveNc(d, rv.id, 'nc7');
    expect(sp(receptionTodos(st([linked], { ncs: { nc7: nc } }), now).find(t => t.kind === 'defect'))).toMatchObject({ reserveId: rv.id, text: 'Décider du défaut NC-2026-007 lié à la réserve « Poignée desserrée » de CMD-T (Société Martin), livraison 1' });
  });
  it('an order with one delivery keeps its texts: no number of delivery to say', () => {
    const d = signed(addReserve(delivered(released(dl('f')), '2026-09-08', 'reserve'), { text: 'Poignée desserrée', by: A, at: at('2026-09-08', '15:00') }), '2026-09-08');
    expect(sp(core(d)[0].text)).toBe('Lever la réserve « Poignée desserrée » de CMD-F (Société Martin), en retard de 6 jours');
  });
  it('says it in the facts, the summary, the card, the tab and "Mes tâches"; once lifted, nothing is left', () => {
    const d = twoTimes(), s = st([d]), todos = receptionTodos(s, now);
    expect(sp(receptionInsights(s, now).map(f => [f.key, f.text]))).toEqual([['reserve-late', 'CMD-T (Société Martin) : « Poignée desserrée » à lever pour le 17 sept., 6 jours de retard.']]);
    expect(receptionSummary(s, now)).toMatchObject({ openReserves: 1, lateReserves: 1, inProgress: 1, counts: expect.objectContaining({ reserve_late: 1, in_progress: 0 }) });   // the order keeps its state, the delivery under way is in progress (D-9)
    expect(deliveryLevel(d, todos, s.params, now)).toEqual({ level: 'alert', label: 'Réserves en retard' });
    expect(urgency(todos, 't')).toBeGreaterThanOrEqual(10);
    expect(toolBadge(s, '3.4', '2026-09', now)).toEqual({ n: 1, tone: 'alert', text: '1 réserve en retard' });
    expect(sp(allTasks(s, now).filter(t => t.tool === '3.4').map(t => [t.focus, t.text]))).toEqual([
      [`t:reception:${d.lots![0].reception.reserves![0].id}`, 'Lever la réserve « Poignée desserrée » de CMD-T (Société Martin), livraison 1, en retard de 6 jours'], ['jalon:t', 'Contrôler le jalon 1 « Étape 1 » de CMD-T (Société Martin)'],
    ]);
    const done = st([lift(d, d.lots![0].reception.reserves![0].id, { at: at('2026-09-16'), by: 'M. Durand' })]);
    expect(receptionInsights(done, now)).toEqual([]);
    expect(receptionSummary(done, now)).toMatchObject({ openReserves: 0, lateReserves: 0, inProgress: 1 });
    expect(toolBadge(done, '3.4', '2026-09', now).tone).toBe('ok');
  });
  it('counts the same reservation text of a closed delivery among the ones that came back', () => {
    const other = signed(addReserve(delivered(released(dl('u')), '2026-09-20', 'reserve'), { text: 'Poignée desserrée', by: A, at: at('2026-09-20', '15:00') }), '2026-09-20');
    expect(sp(receptionInsights(st([twoTimes(), other]), now).find(f => f.key === 'repeat-reserve')?.text)).toBe('« Poignée desserrée » sur 2 commandes en 12 mois (CMD-T, CMD-U).');
  });
});

describe('3.4 what a task opens, end to end', { timeout: 30_000 }, () => {
  it('opens the reception full screen for a PV to sign and a delivery to make, and the sheet for the rest', () => {
    expect(todosOf(delivered(released(dl('e')), '2026-09-20', 'sans')).filter(t => t.kind === 'unsigned').map(receptionFocus)).toEqual(['reception:e']);
    expect(todosOf(released(dl('d', { promisedAt: '2026-09-30' }))).map(receptionFocus)).toEqual(['reception:d']);
    expect(todosOf(allOk(dl('c'))).map(receptionFocus)).toEqual(['c:release']);
    expect(todosOf(ko(dl('b'))).map(receptionFocus)).toEqual(['b:milestones']);
    expect(allTasks(st([released(dl('d', { promisedAt: '2026-09-30' }))]), now).filter(t => t.tool === '3.4').map(t => t.focus)).toEqual(['reception:d']);
  });
});

describe('3.4 the names left out of a list', { timeout: 30_000 }, () => {
  it('says "et 1 autre" and "et 2 autres", never "autre(s)"', () => {
    const blocked = (n: number) => receptionInsights(st(['a', 'b', 'c', 'd', 'e'].slice(0, n).map(id => ko(dl(id)))), now).find(f => f.key === 'blocked')!.text;
    expect(blocked(3)).not.toMatch(/ et \d/);
    expect(blocked(4)).toMatch(/ et 1 autre\.$/);
    expect(blocked(5)).toMatch(/ et 2 autres\.$/);
    expect(blocked(5)).not.toContain('(s)');
  });
});

// ---- lot 0 "no more loss of data"
describe('3.4 the reservations of an archived order stay followed (S-9)', { timeout: 30_000 }, () => {
  // delivered on Monday 14 September with a reservation due on the 23rd (7 working days): two working days late on the 25th
  const rv = (d: Delivery) => addReserve(delivered(d, '2026-09-14', 'reserve'), { text: 'Poignée desserrée', by: A, at: at('2026-09-14', '15:00') });
  const lateOne = () => signed(rv(released(dl('r', { promisedAt: '2026-09-01' }))), '2026-09-14');
  const archived = (d: Delivery) => archiveDelivery(d, at('2026-09-24'), 'Commande soldée');
  // the same order with everything else left undone: a milestone not conform, a PV not signed
  const messy = () => rv(ko(dl('x', { promisedAt: '2026-09-01' })));
  const TEXT = 'Lever la réserve « Poignée desserrée » de CMD-R (Société Martin), en retard de 2 jours';
  it('keeps the task of the open reservation of an archived order, and only that one', () => {
    const one = lateOne();
    expect(sp(todosOf(archived(one)))).toEqual([expect.objectContaining({ kind: 'reserve-late', tone: 'bad', text: TEXT, due: '2026-09-23', deliveryId: 'r' })]);
    expect(todosOf(one).filter(t => t.kind === 'reserve-late')).toEqual(todosOf(archived(one)));   // the same task as before the archive
    expect(todosOf(messy()).map(t => t.kind).sort()).toEqual(['feedback', 'release', 'reserve-late', 'unsigned']);   // delivered without a release recorded: said too
    expect(todosOf(archived(messy())).map(t => t.kind)).toEqual(['reserve-late']);   // the rest of an archived order says nothing
    expect(todosOf(archived(lift(one, one.reception.reserves![0].id, { at: at('2026-09-16'), by: 'M. Durand' })))).toEqual([]);   // lifted: nothing left to follow
  });
  it('keeps it in the facts, the tile "Réserves à lever", "Mes tâches" and the badge of the tool', () => {
    const one = lateOne(), s = st([archived(one)]);
    expect(receptionInsights(s, now).map(f => f.key)).toEqual(['reserve-late']);
    expect(sp(receptionInsights(s, now)[0].text)).toBe('CMD-R (Société Martin) : « Poignée desserrée » à lever pour le 23 sept., 2 jours de retard.');
    expect(receptionInsights(st([archived(messy())]), now).map(f => f.key)).toEqual(['reserve-late']);
    expect(receptionSummary(s, now)).toMatchObject({ openReserves: 1, lateReserves: 1 });
    expect(receptionSummary(s, now).counts).toMatchObject({ archived: 1, reserve_late: 0, reserve: 0 });
    expect(sp(allTasks(s, now).filter(t => t.tool === '3.4').map(t => [t.text, t.focus]))).toEqual([[TEXT, `r:reception:${one.reception.reserves![0].id}`]]);
    expect(toolBadge(s, '3.4', '2026-09', now).tone).not.toBe('ok');
    const done = st([archived(lift(one, one.reception.reserves![0].id, { at: at('2026-09-16'), by: 'M. Durand' }))]);
    expect(receptionInsights(done, now)).toEqual([]);
    expect(receptionSummary(done, now)).toMatchObject({ openReserves: 0, lateReserves: 0 });
    expect(toolBadge(done, '3.4', '2026-09', now).tone).toBe('ok');
  });
  it('counts the reservations of an archived order and of the others together in the tile, and keeps a late one of a closed delivery of an archived order', () => {
    const s = st([archived(lateOne()), signed(rv(released(dl('q'))), '2026-09-14')]);
    expect(receptionSummary(s, now)).toMatchObject({ openReserves: 2, lateReserves: 2 });
    const closed = archived(twoTimesAll());
    expect(receptionSummary(st([closed]), now).openReserves).toBe(1);
    expect(todosOf(closed).map(t => t.kind)).toEqual(['reserve']);
  });
});
// An order of 20 delivered in two times, the first (10, one reservation open, PV signed) closed in the lots, the second under way
const twoTimesAll = (): Delivery => {
  let d = delivered(released(dl('t', { qty: 20 })), '2026-09-22', 'reserve');
  d = addReserve({ ...d, reception: { ...d.reception, qty: 10 } }, { text: 'Rayure', by: A, at: at('2026-09-22', '14:35') });
  return nextPresentation(signed(d, '2026-09-22'), A, at('2026-09-23', '08:00'));
};

describe('3.4 ids that are names of Object.prototype stop nothing (S-12)', { timeout: 30_000 }, () => {
  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])('a defect linked as "%s" is a defect that does not exist', n => {
    const rvOpen = (d: Delivery) => linkReserveNc(d, d.reception.reserves![0].id, n);
    const d = rvOpen(addReserve(delivered(released(dl('c')), '2026-09-22', 'reserve'), { text: 'Joint', by: A, at: at('2026-09-22', '15:00') }));
    const ds = [linkMilestoneNc(ko(dl('b')), 'm1', n), d];
    const s = st(ds);
    expect(() => { receptionTodos(s, now); receptionInsights(s, now); receptionSummary(s, now); allTasks(s, now); toolBadge(s, '3.4', '2026-09', now); }).not.toThrow();
    // read as no defect at all: a milestone not conform without defect, a reservation to lift
    expect(receptionTodos(s, now).map(t => t.kind).filter(k => k !== 'feedback').sort()).toEqual(['blocked', 'reserve', 'unsigned']);
  });
});

describe('3.4 a damaged order stops nothing once read (S-11, D-19)', { timeout: 30_000 }, () => {
  const good = () => signed(addReserve(delivered(released(dl('g')), '2026-09-22', 'reserve'), { text: 'Joint', by: A, at: at('2026-09-22', '15:00') }), '2026-09-22');
  const forms: Record<string, Record<string, unknown>> = {
    'no milestones': { milestones: undefined }, 'null milestones': { milestones: null }, 'no reception': { reception: undefined }, 'null reception': { reception: null },
    'lots and journal as texts': { lots: 'x', journal: 'x', shipChecks: 'x' }, 'holes everywhere': { milestones: [null, ...ms()], lots: [null, { no: 1 }], journal: [null], shipChecks: [null] },
    'texts missing': { ref: undefined, client: null, item: 7, releasedBy: null }, 'result without text': { reception: { date: '2026-09-22', result: 'reserve' } },
  };
  it.each(Object.entries(forms))('%s: the summary, the facts, the queue, "Mes tâches" and the badge still work', (_, patch) => {
    const u = upgradeDelivery({ ...good(), ...patch } as unknown as Delivery), s = st([u, dl('ok')]);
    expect(() => { receptionSummary(s, now); allTasks(s, now); toolBadge(s, '3.4', '2026-09', now); }).not.toThrow();
    expect(receptionSummary(s, now).counts.in_progress + receptionSummary(s, now).counts.to_release).toBeGreaterThanOrEqual(1);   // the sound order is still there
  });
});

// ---- lot 1: the release before the delivery (8.6) is said where it was not (D-7)
describe('3.4 lot 1: a delivery without a release, or a release after the delivery, is said as a fact (D-7)', { timeout: 30_000 }, () => {
  const never = (id = 'u') => signed(delivered(dl(id), '2026-09-14', 'sans'), '2026-09-14');   // nothing checked, never released, delivered and signed (the proof t17)
  it('says it in the facts, in red, with the day of the delivery; the proof t17 no longer reads "in order"', () => {
    const s = st([never()]);
    expect(sp(receptionInsights(s, now))).toEqual([expect.objectContaining({ key: 'delivered-unreleased', tone: 'bad', title: 'Livraison sans libération', text: 'CMD-U (Société Martin) : livrée le 14 sept. sans libération enregistrée.' })]);
    expect(receptionInsights(st([signed(delivered(released(dl('r')), '2026-09-14', 'sans'), '2026-09-14')]), now)).toEqual([]);   // released before: nothing to say
    const many = st(['a', 'b', 'c', 'd'].map(id => never(id)));
    expect(sp(receptionInsights(many, now)[0].text)).toBe('CMD-A (Société Martin) : livrée le 14 sept. sans libération enregistrée ; CMD-B (Société Martin) : livrée le 14 sept. sans libération enregistrée ; CMD-C (Société Martin) : livrée le 14 sept. sans libération enregistrée et 1 autre.');
  });
  it('says a release recorded after the delivery, amber, with both days; a release the day of the delivery before the hour is not late', () => {
    const late = signed(releaseDelivery(delivered(allOk(dl('l')), '2026-09-14', 'sans'), { by: 'Marc', at: at('2026-09-18', '09:00') }), '2026-09-18');
    expect(sp(receptionInsights(st([late]), now))).toEqual([expect.objectContaining({ key: 'released-late', tone: 'warn', title: 'Libération après la livraison', text: 'CMD-L (Société Martin) : libérée le 18 sept. après la livraison du 14 sept.' })]);
    const same = signed(releaseDelivery(delivered(allOk(dl('s')), '2026-09-14', 'sans'), { by: 'Marc', at: at('2026-09-14', '13:00') }), '2026-09-14');
    expect(receptionInsights(st([same]), now)).toEqual([]);
  });
  it('says it for a closed delivery of an order too, and not for an archived order', () => {
    const first = signed(delivered(dl('t', { qty: 10 }), '2026-09-08', 'sans'), '2026-09-08');
    const two = nextPresentation(reseal({ ...first, reception: { ...first.reception, qty: 4 } }), A, at('2026-09-09'));
    expect(sp(receptionInsights(st([two]), now).map(f => [f.key, f.text]))).toEqual([['delivered-unreleased', 'CMD-T (Société Martin) : livrée le 8 sept. sans libération enregistrée.']]);
    expect(receptionInsights(st([archiveDelivery(never(), at('2026-09-20'), 'x')]), now)).toEqual([]);
  });
  it('gives a task to record the release while the PV is not signed (a thing to do), and none once it is signed (nothing left to do): the badge counts the first', () => {
    const open = delivered(allOk(dl('o')), '2026-09-14', 'sans');   // delivered, not signed, never released
    const t = core(open).filter(x => x.kind === 'release');
    expect(sp(t)).toEqual([expect.objectContaining({ tone: 'warn', due: '2026-09-14', deliveryId: 'o', text: 'Enregistrer la libération de CMD-O (Société Martin) : livrée le 14 sept. sans libération enregistrée' })]);
    expect(receptionFocus(t[0])).toBe('o:release');
    expect(toolBadge(st([open]), '3.4', '2026-09', now)).toMatchObject({ tone: 'warn', text: expect.stringContaining('commande à libérer') });
    expect(core(never('p')).filter(x => x.kind === 'release')).toEqual([]);
    expect(core(released(dl('q'), '2026-09-11')).filter(x => x.kind === 'release')).toEqual([]);
  });
});

// ---- lot 2: one reading of the states, the figures, the quantities and the tasks
describe('3.4 lot 2: one state for the tiles, the alerts and the badge (D-9, D-15, D-16)', { timeout: 30_000 }, () => {
  // delivery 1 closed with a reservation still open, delivery 2 under way
  const closedWithReserve = () => {
    let d = setQuantities(delivered(released(dl('a', { qty: 20, promisedAt: '2026-09-30' })), '2026-09-14', 'reserve'), { qty: 10 }, A, at('2026-09-14', '14:35'));
    d = addReserve(d, { text: 'rayure', by: A, at: at('2026-09-14', '14:36') });
    return nextPresentation(signed(d, '2026-09-14'), A, at('2026-09-15'));
  };
  it('counts "en cours" and "non conforme" from the delivery under way, as the alerts do, while the order keeps the state of its closed reservation (D-9)', () => {
    const d = closedWithReserve(), blocked = ko(d, 'm1', '2026-09-24'), sm = receptionSummary(st([blocked]), now);
    expect(sm.counts.reserve_late).toBe(1);
    expect(sm.blockedCount).toBe(1);
    expect(sm.insights.map(i => i.key)).toEqual(expect.arrayContaining(['blocked', 'reserve-late']));
    expect([sm.openReserves, sm.lateReserves]).toEqual([1, 1]);
    expect(receptionSummary(st([d]), now)).toMatchObject({ inProgress: 1, blockedCount: 0 });
    expect(receptionSummary(st([dl('z')]), now)).toMatchObject({ inProgress: 1, blockedCount: 0 });
  });
  it('gives the two whole numbers of the tile "X sur N", exact beyond 100 receptions (D-15)', () => {
    const one = (i: number, result: 'sans' | 'reserve'): Delivery => { const d = dl(`n${i}`); return { ...d, reception: { ...d.reception, date: '2026-09-10', result, noSign: { kind: 'absent', witness: 'Témoin', at: at('2026-09-10') } } }; };
    const sm = receptionSummary(st(Array.from({ length: 101 }, (_, i) => one(i, i < 50 ? 'sans' : 'reserve'))), now);
    expect([sm.cleanCount, sm.receivedCount, sm.sansReservePct]).toEqual([50, 101, 50]);
    expect(receptionSummary(st(), now)).toMatchObject({ cleanCount: 0, receivedCount: 0, sansReservePct: null });
  });
  it('gives "Réceptions à jour" only when nothing is left: a rest to deliver, a review to post, a defect without decision each colour the badge (D-16)', () => {
    const part = signed(setQuantities(delivered(released(dl('p')), '2026-09-01', 'sans'), { qty: 4 }, A, at('2026-09-01', '14:35')), '2026-09-01');   // 4 on 10, signed, no review asked (old)
    expect(receptionTodos(st([part]), now).map(t => t.kind)).toEqual(['next-lot']);
    expect(toolBadge(st([part]), '3.4', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: '1 commande avec un reste à livrer' });
    const fresh = signed(delivered(released(dl('f')), '2026-09-22', 'sans'), '2026-09-22');   // received in full, signed, review of the end to post
    expect(receptionTodos(st([fresh]), now).map(t => t.kind)).toEqual(['feedback']);
    expect(toolBadge(st([fresh]), '3.4', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: '1 bilan à poser' });
    const nc = { ...newNc(st(), A), id: 'nc1', ref: 'NC-2026-001' }, def = linkMilestoneNc(checkMilestone(dl('d'), 'm1', { ok: true, by: A, at: at('2026-09-20') }), 'm1', 'nc1');
    expect(toolBadge(st([def], { ncs: { nc1: nc } }), '3.4', '2026-09', now)).toEqual({ n: 1, tone: 'warn', text: '1 défaut sans décision' });
    const fine = signed(delivered(released(dl('y', { qty: 1 })), '2026-08-01', 'sans'), '2026-08-01');
    expect(toolBadge(st([fine]), '3.4', '2026-09', now)).toEqual({ n: 0, tone: 'ok', text: 'Réceptions à jour' });
  });
  it('does not follow the reservations of a refused delivery: no task, not in the summary, not in the alerts (D-4)', () => {
    const rv = addReserve(delivered(released(dl('a')), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:36') });
    expect(receptionTodos(st([rv]), now).map(t => t.kind)).toContain('reserve-late');
    const refused = refuse(rv, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-15'), A), sm = receptionSummary(st([refused]), now);
    expect(receptionTodos(st([refused]), now).map(t => t.kind).filter(k => k.startsWith('reserve'))).toEqual([]);
    expect([sm.openReserves, sm.lateReserves, sm.counts.reserve_late, sm.counts.refused]).toEqual([0, 0, 0, 1]);
    expect(sm.insights.map(i => i.key)).not.toContain('reserve-late');
    expect(sp(toolBadge(st([refused]), '3.4', '2026-09', now).text)).toBe('1 réception refusée');
  });
  it('counts a reservation of a closed delivery as "Réserves à lever" in the tile and in the alert (D-9)', () => {
    const d = closedWithReserve(), sm = receptionSummary(st([d]), now);
    expect(sm.counts.reserve_late).toBe(1);
    expect(sm.insights.find(i => i.key === 'reserve-late')?.text).toContain('rayure');
    expect(toolBadge(st([d]), '3.4', '2026-09', now)).toMatchObject({ tone: 'alert', text: expect.stringContaining('1 réserve en retard') });
  });
});

describe('3.4 lot 2: quantities said as facts (D-3, D-20)', { timeout: 30_000 }, () => {
  it('says what is left with the French comma and the right agreement (D-20)', () => {
    const got = (qty: number, n: number) => setQuantities(delivered(released(dl('r', { qty })), '2026-09-14', 'sans'), { qty: n }, A, at('2026-09-14', '14:35'));
    const say = (d: Delivery) => [receptionTodos(st([d]), now).find(t => t.kind === 'next-lot')?.text, receptionInsights(st([d]), now).find(i => i.key === 'rest')?.text];
    expect(sp(say(got(7.5, 2.5)))).toEqual(['Livrer le reste de CMD-R (Société Martin) : 5 à livrer', 'CMD-R (Société Martin) : 5 sur 7,5 restent à livrer.']);
    expect(sp(say(got(10, 9)))).toEqual(['Livrer le reste de CMD-R (Société Martin) : 1 à livrer', 'CMD-R (Société Martin) : 1 sur 10 reste à livrer.']);
    expect(sp(say(got(1.1, 0.7)))).toEqual(['Livrer le reste de CMD-R (Société Martin) : 0,4 à livrer', 'CMD-R (Société Martin) : 0,4 sur 1,1 reste à livrer.']);
  });
  it('says as a fact that more was received than ordered, without blocking anything (D-20)', () => {
    const d = setQuantities(delivered(released(dl('o', { qty: 10 })), '2026-09-14', 'sans'), { qty: 15 }, A, at('2026-09-14', '14:35'));
    expect(sp(receptionInsights(st([d]), now).find(i => i.key === 'over'))).toEqual({ key: 'over', tone: 'warn', title: 'Reçu au-dessus de la commande', text: 'CMD-O (Société Martin) : 15 reçues pour 10 commandées.' });
    const one = setQuantities(delivered(released(dl('o', { qty: 0 })), '2026-09-14', 'sans'), { qty: 1 }, A, at('2026-09-14', '14:35'));
    expect(sp(receptionInsights(st([one]), now).find(i => i.key === 'over')?.text)).toBe('CMD-O (Société Martin) : 1 reçue pour 0 commandée.');
    const exact = setQuantities(delivered(released(dl('o', { qty: 10 })), '2026-09-14', 'sans'), { qty: 10 }, A, at('2026-09-14', '14:35'));
    expect(receptionInsights(st([exact]), now).map(i => i.key)).not.toContain('over');
  });
  it('does not call a decimal split "to deliver" once everything came (D-3)', () => {
    let d = setQuantities(delivered(released(dl('x', { qty: 0.8 })), '2026-09-14', 'sans'), { qty: 0.7 }, A, at('2026-09-14', '14:35'));
    d = nextPresentation(signed(d, '2026-09-14'), A, at('2026-09-15'), 0.1);
    d = signed(delivered(released(d, '2026-09-16'), '2026-09-17', 'sans'), '2026-09-17');
    expect(receptionTodos(st([d]), now).filter(t => t.kind === 'next-lot')).toEqual([]);
    expect(receptionInsights(st([d]), now).map(i => i.key)).not.toContain('rest');
  });
});

describe('3.4 lot 2: tasks (D-14, L-9, D-6, L-5, L-8, D-24)', { timeout: 30_000 }, () => {
  const people = {
    p1: { id: 'p1', name: 'Nicolas R.', role: '', active: true, absences: [{ from: '2026-09-24', to: '2026-09-30' }] }, p2: { id: 'p2', name: 'David K.', role: '', active: true },
    p3: { id: 'p3', name: 'Antoine P.', role: '', active: false },
  };
  it('gives the red tasks a day, the one of the finding, so they no longer come last (D-14)', () => {
    const b = ko(dl('b'), 'm1', '2026-09-18'), refused = refuse(delivered(released(dl('g')), '2026-09-16'), { reason: 'Quantité incorrecte', next: 'À reprendre et représenter' }, at('2026-09-16'), A);
    expect(todosOf(b).find(t => t.kind === 'blocked')?.due).toBe('2026-09-18');
    expect(todosOf(refused).find(t => t.kind === 'refused')?.due).toBe('2026-09-16');
    const tasks = allTasks(st([b, refused, dl('c', { promisedAt: '2026-10-20' })]), now).filter(t => t.tool === '3.4');
    expect(tasks.map(t => [t.due, t.text.slice(0, 18)])).toEqual([['2026-09-16', 'Donner suite à la '], ['2026-09-18', 'Traiter le jalon 1'], ['2026-09-18', 'Faire signer le PV'], ['2026-10-20', 'Contrôler le jalon']]);
  });
  it('gives a task an id that does not hold its kind: the same fact keeps its id when its motive changes, two facts never share one (D-14)', () => {
    const rv = addReserve(delivered(released(dl('a')), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:40') });
    const early = receptionTodos(st([rv]), new Date(2026, 8, 16, 10, 0)).find(t => t.reserveId), late = receptionTodos(st([rv]), now).find(t => t.reserveId);
    expect([early?.kind, late?.kind]).toEqual(['reserve', 'reserve-late']);
    expect(early?.id).toBe(late?.id);
    const late2 = released(dl('l', { promisedAt: '2026-09-10', qty: 10 })), many = [rv, ko(dl('b')), late2, signed(setQuantities(delivered(released(dl('p')), '2026-09-01', 'sans'), { qty: 4 }, A, at('2026-09-01', '14:35')), '2026-09-01'), delivered(released(dl('u')), '2026-09-10', 'sans')];
    const todos = receptionTodos(st(many), now), ids = todos.map(t => t.id);
    expect(todos.length).toBeGreaterThan(5);
    expect(new Set(ids).size).toBe(ids.length);
    todos.forEach(t => expect(t.id).not.toContain(t.kind));
    const l2 = receptionTodos(st([late2]), now).find(t => t.kind === 'late-delivery'), l3 = receptionTodos(st([late2]), new Date(2026, 8, 12, 10, 0)).find(t => t.kind === 'late-delivery');
    expect(l2?.id).toBe(l3?.id);
    const all = allTasks(st(many), now).map(t => t.id);
    expect(new Set(all).size).toBe(all.length);
  });
  it('names the first person of the team who is there that day, nobody when none is (L-9)', () => {
    const d = dl('a', { team: ['Nicolas R.', 'Antoine P.', 'David K.'], promisedAt: '2026-10-15' }), who = (x: Delivery) => todosOf(x).map(t => t.who);
    const s = (x: Delivery, ps: object = people) => st([x], { people: ps as never });
    expect(receptionTodos(s(d), now).map(t => t.who)).toEqual(['David K.']);                    // Nicolas on leave, Antoine no longer active
    expect(allTasks(s(d), now).find(t => t.tool === '3.4')?.who).toBe('David K.');
    const fresh = signed(delivered(released(dl('f', { team: ['Nicolas R.', 'David K.'] })), '2026-09-22', 'sans'), '2026-09-22');   // received, review of the end to post (2.4): the same person
    expect(allTasks(s(fresh), now).find(t => t.id.startsWith('fd'))?.who).toBe('David K.');
    expect(receptionTodos(s({ ...d, team: ['Nicolas R.', 'Antoine P.'] }), now).map(t => t.who)).toEqual(['']);
    expect(receptionTodos(s(d), new Date(2026, 9, 5, 10, 0)).map(t => t.who)).toEqual(['Nicolas R.']);   // back from leave
    expect(who({ ...d, team: undefined })).toEqual(['']);
    expect(who({ ...d, team: ['Julien P.'] })).toEqual(['Julien P.']);   // not in the staff list: nothing says he is away
    // the person who took a reservation in charge keeps it; away, it goes to the team
    const rv = addReserve(delivered(released(dl('h', { team: ['Nicolas R.', 'David K.'] })), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:40') });
    const take = (handler: string) => patchReserve(rv, rv.reception.reserves![0].id, { handler }, A, at('2026-09-15'));
    expect(receptionTodos(s(take('Awa')), now).find(t => t.reserveId)?.who).toBe('Awa');
    expect(receptionTodos(s(take('Nicolas R.')), now).find(t => t.reserveId)?.who).toBe('David K.');
  });
  it('lists the PV of a closed delivery that was never signed and says it (D-6)', () => {
    const base = dl('u', { qty: 20 }), lot = { ...base, id: 'lt1', no: 1, closedAt: '2026-09-10T10:00', reception: { ...base.reception, date: '2026-09-08', result: 'sans', qty: 10 } } as Lot;
    const d = dl('u', { qty: 20, lots: [lot] }), unsigned = receptionTodos(st([d]), now).filter(t => t.kind === 'unsigned');
    expect(unsigned).toEqual([expect.objectContaining({ tone: 'warn', deliveryId: 'u', text: 'Faire signer le PV de CMD-U (Société Martin), livraison 1', due: '2026-09-10' })]);
    expect(receptionFocus(unsigned[0])).toBe('reception:u');
    expect(sp(receptionInsights(st([d]), now).find(i => i.key === 'unsigned')?.text)).toBe('CMD-U (Société Martin), livraison 1 : livrée le 8 sept., 13 jours sans signature.');   // working days, as everywhere
    expect(toolBadge(st([d]), '3.4', '2026-09', now)).toMatchObject({ tone: 'warn', text: expect.stringContaining('PV sans signature') });
    const signedLot = { ...lot, signClient: ink } as Lot, waived = { ...lot, reception: { ...lot.reception, signWaiver: { by: 'Marc', why: 'client injoignable', at: at('2026-09-08') } } } as Lot;
    [signedLot, waived].forEach(l => expect(receptionTodos(st([dl('u', { qty: 20, lots: [l] })]), now).filter(t => t.kind === 'unsigned')).toEqual([]));
    expect(receptionTodos(st([dl('u', { qty: 20, lots: [{ ...lot, reception: { ...lot.reception, result: 'refus' } } as Lot] })]), now).filter(t => t.kind === 'unsigned')).toEqual([]);
  });
  it('reads the promised day of the order, else of its quote, in the tasks and the facts (L-5)', () => {
    const q = { ...newQuote(st(), now), id: 'q1', client: 'Société Martin', object: 'Objet', weeks: 2, decidedAt: '2026-09-01T10:00', status: 'won' as const };
    const s = (d: Delivery) => st([d], { quotes: { q1: q } }), r = (d: Delivery) => allOk(d), rel = (d: Delivery) => released(d);
    const noDay = rel(dl('q', { quoteId: 'q1' }));
    expect(sp(receptionTodos(s(noDay), now).find(t => t.kind === 'late-delivery'))).toMatchObject({ due: '2026-09-15', text: 'Livrer CMD-Q (Société Martin) : promise le 15 sept., 8 jours de retard' });
    expect(sp(receptionInsights(s(noDay), now).find(i => i.key === 'late-delivery')?.text)).toBe('CMD-Q (Société Martin) : promise le 15 sept., 8 jours de retard.');
    expect(receptionTodos(s(r(dl('q', { quoteId: 'q1' }))), now).find(t => t.kind === 'release')?.due).toBe('2026-09-15');
    const typed = rel(dl('q', { quoteId: 'q1', promisedAt: '2026-10-08' }));   // the order keeps the day typed, whatever the quote says
    expect(receptionTodos(s(typed), now).map(t => t.kind)).toEqual(['ship']);
    expect(receptionTodos(s(typed), now)[0].due).toBe('2026-10-08');
  });
  it('does not ask "Livrer le reste" nor the review of the end of a reception put off by a blocking reservation (L-8)', () => {
    const put = signed(addReserve(delivered(released(dl('p')), '2026-09-22', 'reserve'), { text: 'fuite', severity: 'blocking', by: A, at: at('2026-09-22', '14:35') }), '2026-09-22');
    const kinds = receptionTodos(st([put]), now).map(t => t.kind);
    expect(kinds).toEqual(['reserve']);
    expect(receptionInsights(st([put]), now).map(i => i.key)).not.toContain('rest');
  });
  it('counts the days of delay of a delivery and of a PV in working days, as the lift does (D-24 g)', () => {
    const sat = new Date(2026, 8, 26, 10, 0), mon = new Date(2026, 8, 28, 10, 0);
    const late = released(dl('g', { promisedAt: '2026-09-25' }));   // promised on the Friday
    expect(receptionTodos(st([late]), sat).map(t => t.kind)).toEqual(['ship']);
    expect(sp(receptionTodos(st([late]), mon).find(t => t.kind === 'late-delivery')?.text)).toBe('Livrer CMD-G (Société Martin) : promise le 25 sept., 1 jour de retard');
    const pv = delivered(released(dl('v')), '2026-09-24', 'sans');   // delivered on the Thursday, PV unsigned: the delay of 2 days is over on the Monday
    expect(receptionTodos(st([pv]), sat).filter(t => t.kind === 'unsigned')).toEqual([]);
    expect(receptionTodos(st([pv]), mon).filter(t => t.kind === 'unsigned')).toHaveLength(1);
    expect(receptionTodos(st([pv], { params: { ...P, businessHours: false } }), sat).filter(t => t.kind === 'unsigned')).toHaveLength(1);   // calendar days when the company says so
  });
});

describe('3.4 crit F2a: a PV whose content no longer matches its seal is told everywhere (a fact, a task, the badge)', { timeout: 30_000 }, () => {
  const sealed = signed(delivered(released(dl('s')), '2026-09-22', 'sans'), '2026-09-22');   // signed: locked and sealed
  const altered = (d: Delivery) => ({ ...d, reception: { ...d.reception, place: 'Un autre site' } });   // what a hand on the stored text does to a signed PV
  const seal = (d: Delivery) => {
    const s = st([d]);
    return { todos: receptionTodos(s, now).filter(t => t.kind === 'seal'), fact: receptionInsights(s, now).find(i => i.key === 'seal-modified'), badge: toolBadge(s, '3.4', '2026-09', now), tasks: allTasks(s, now).filter(t => t.text.startsWith('Vérifier')) };
  };
  it('says nothing while the seal is intact', () => {
    expect(sealed.reception.seals?.length).toBe(1);
    const r = seal(sealed);
    expect([r.todos, r.fact]).toEqual([[], undefined]);
    expect(r.badge.text).not.toContain('scellé');
  });
  it('finds every PV of the example intact, and the same example altered by hand on one of them', () => {
    const ex = demoState(now), signedIds = Object.values(ex.deliveries).filter(d => d.reception.seals?.length || d.lots?.some(l => l.reception.seals?.length));
    expect(signedIds.length).toBeGreaterThan(3);
    expect([receptionTodos(ex, now).filter(t => t.kind === 'seal'), receptionInsights(ex, now).filter(i => i.key === 'seal-modified')]).toEqual([[], []]);
    const one = signedIds.find(d => d.reception.seals?.length)!, hand = structuredClone(ex);
    hand.deliveries[one.id].reception.name = 'Quelqu\'un d\'autre';   // the stored text of a signed PV, changed outside the app
    expect(receptionTodos(hand, now).filter(t => t.kind === 'seal').map(t => t.deliveryId)).toEqual([one.id]);
  });
  it('lists the fact, the task (an infinitive that opens the sheet), the red badge and "Mes tâches" once the content is changed', () => {
    const r = seal(altered(sealed));
    expect(sp(r.fact)).toEqual({ key: 'seal-modified', tone: 'bad', title: 'PV au scellé modifié', text: 'CMD-S (Société Martin) : le contenu du PV ne correspond plus à son scellé.' });
    expect(sp(r.todos)).toEqual([{ id: 'sl:s', kind: 'seal', text: 'Vérifier le PV de CMD-S (Société Martin) : son contenu ne correspond plus au scellé', tone: 'bad', who: '', due: '2026-09-25', deliveryId: 's' }]);
    expect(receptionFocus(r.todos[0])).toBe('s:reception');
    expect(r.badge).toMatchObject({ tone: 'alert', text: expect.stringContaining('1 PV au scellé modifié') });
    expect(r.tasks).toEqual([expect.objectContaining({ tool: '3.4', focus: 's:reception' })]);
    expect(imperative.test(r.todos[0].text.replace(/^Vérifier/, ''))).toBe(false);
    // a number of PV is named when it is given
    const numbered = { ...altered(sealed), reception: { ...altered(sealed).reception, pvNo: 'PV-2026-014' } };
    expect(sp(seal(numbered).fact?.text)).toBe('CMD-S (Société Martin) : le contenu du PV-2026-014 ne correspond plus à son scellé.');
    // it is the first thing the queue says, before the red tasks that are older
    expect(receptionTodos(st([...fleet(), altered(sealed)]), now)[0]).toMatchObject({ kind: 'seal', deliveryId: 's' });
    // the card is red and says so
    const s = st([altered(sealed)]);
    expect(deliveryLevel(altered(sealed), receptionTodos(s, now), P, now)).toEqual({ level: 'alert', label: 'Scellé modifié' });
    expect(deliveryLevel(sealed, receptionTodos(st([sealed]), now), P, now).level).not.toBe('alert');
  });
  it('reads the closed deliveries and the archived orders too, and asks nothing of an order that is not signed', () => {
    const first = nextPresentation(reseal({ ...sealed, reception: { ...sealed.reception, qty: 4 } }), A, at('2026-09-23', '08:00')), lot = first.lots![0];
    expect(seal(first).todos).toEqual([]);
    const tampered = { ...first, lots: [{ ...lot, reception: { ...lot.reception, place: 'Un autre site' } }] } as Delivery;
    const r = seal(tampered);
    expect(sp(r.todos)).toEqual([expect.objectContaining({ id: 'sl:s:lot1', text: 'Vérifier le PV de la livraison 1 de CMD-S (Société Martin) : son contenu ne correspond plus au scellé' })]);
    expect(receptionFocus(r.todos[0])).toBe('s:follow');
    expect(sp(r.fact?.text)).toBe('CMD-S (Société Martin) : le contenu du PV de la livraison 1 ne correspond plus à son scellé.');
    expect(seal(archiveDelivery(altered(sealed), at('2026-09-26'), '', A)).todos).toHaveLength(1);
    expect(seal(altered(delivered(released(dl('n')), '2026-09-22', 'sans'))).todos).toEqual([]);   // not signed, no seal: nothing to compare
    expect(seal({ ...sealed, reception: { ...sealed.reception, seals: undefined } }).todos).toEqual([]);   // signed before the seals existed
  });
});

// ---- lot 8: the words, the days and the typography of the tasks and of the facts (A-4, A-11, A-12, A-13)
describe('3.4 lot 8: the tasks and the facts of the queue, in the words of the lexicon', { timeout: 30_000 }, () => {
  it('says "réception refusée", and what was typed for the follow-up as it was typed, a text of the list with its first letter in lower case', () => {
    const refusedWith = (next: string, nextOther?: string) => signed(refuse(delivered(released(dl('g')), '2026-09-22'), { reason: 'Quantité incorrecte', next, ...(nextOther ? { nextOther } : {}) }, at('2026-09-22', '15:00'), A), '2026-09-22');
    expect(sp(todosOf(refusedWith('Autre', 'Refaire chez Dupont'))[0].text)).toBe('Donner suite à la réception refusée de CMD-G (Société Martin) : Refaire chez Dupont');   // not "refaire chez dupont"
    expect(sp(todosOf(refusedWith('À remplacer'))[0].text)).toBe('Donner suite à la réception refusée de CMD-G (Société Martin) : à remplacer');
    expect(receptionInsights(st([refusedWith('À remplacer')]), now).find(i => i.key === 'refused')?.title).toBe('Réception refusée');
    expect(toolBadge(st([refusedWith('À remplacer')]), '3.4', '2026-09', now).text).toBe('1 réception refusée');
  });
  it('never quotes a made-up text for a reservation that is a photo alone: the task, the defect and the fact say it without quotes', () => {
    const d = signed(addReserve(delivered(released(dl('p')), '2026-09-14', 'reserve'), { text: '', photo: 'photo:r-1-1', by: A, at: at('2026-09-14', '14:35') }), '2026-09-14');
    expect(sp(core(d).find(t => t.kind === 'reserve-late')?.text)).toBe('Lever la réserve sans texte (photo seule) de CMD-P (Société Martin), en retard de 2 jours');
    expect(sp(receptionInsights(st([d]), now).find(i => i.key === 'reserve-late')?.text)).toBe('CMD-P (Société Martin) : réserve sans texte (photo seule) à lever pour le 23 sept., 2 jours de retard.');
    expect(JSON.stringify([todosOf(d), receptionInsights(st([d]), now)])).not.toContain('voir la photo');
  });
  it('agrees the verb of a quantity left with a number under 2, 1,5 included: "reste", and from 2 "restent"', () => {
    const got = (qty: number, n: number) => setQuantities(delivered(released(dl('r', { qty })), '2026-09-14', 'sans'), { qty: n }, A, at('2026-09-14', '14:35'));
    const say = (d: Delivery) => sp(receptionInsights(st([d]), now).find(i => i.key === 'rest')?.text);
    expect(say(got(7, 5.5))).toBe('CMD-R (Société Martin) : 1,5 sur 7 reste à livrer.');
    expect(say(got(7, 5))).toBe('CMD-R (Société Martin) : 2 sur 7 restent à livrer.');
    expect(say(got(7, 7.5 - 0.5 - 1))).toBe('CMD-R (Société Martin) : 1 sur 7 reste à livrer.');
  });
  it('says the days of its tasks and of its facts short ("18 sept."), with no numeric day left, and holds the typography', () => {
    const fleetState = st(fleet());
    const texts = [...receptionTodos(fleetState, now).map(t => t.text), ...receptionInsights(fleetState, now).flatMap(i => [i.title, i.text])];
    expect(texts.length).toBeGreaterThan(10);
    texts.forEach(t => { expect(t).not.toMatch(/\d\d\/\d\d\/\d{4}/); expect(t).not.toMatch(/ [:;?!%»]/); expect(t).not.toMatch(/« /); });
    expect(texts.some(t => /\d+\u00A0(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)\./.test(t))).toBe(true);
    // a day of another year says its year
    const old = receptionTodos(st([ko(dl('o', { promisedAt: '2025-09-01' }), 'm1', '2025-09-02')]), now).map(t => t.text).join(' ');
    expect(old).toMatch(/2\u00A0sept\. 2025/);
  });
});

describe('3.4 lot 8: the status of the tool, in the words of the lexicon', { timeout: 30_000 }, () => {
  it('counts one plural at a time: the badge says "2 réceptions refusées" and "1 réception refusée", never "livraison refusée"', () => {
    const refused = (id: string) => signed(refuse(delivered(released(dl(id)), '2026-09-22'), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-22', '15:00'), A), '2026-09-22');
    expect(toolBadge(st([refused('a'), refused('b')]), '3.4', '2026-09', now).text).toBe('2 réceptions refusées');
    expect(toolBadge(st([refused('a')]), '3.4', '2026-09', now).text).not.toMatch(/livraison refusée/);
  });
});
