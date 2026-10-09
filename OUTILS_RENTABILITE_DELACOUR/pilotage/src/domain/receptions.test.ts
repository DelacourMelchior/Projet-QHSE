// Tool 3.4, orders: models and settings, creation, milestones, links with the red bin, release, reception and reservations, refusal, signatures and lock,
// deliveries in several times, states, life, deletion and completeness.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery, Lot, Milestone, Reception, State, Strokes } from './types';
import {
  DEFAULT_MILESTONES, DEFAULT_NEXTS, DEFAULT_REFUSALS, DEFAULT_SHIP_CHECKS, DELIVERY_STATE, LEGACY_MILESTONES, LIFE_KEYS, MILESTONE_TEMPLATES, OTHER,
  addMilestone, addReserve, allReservesOf, archiveDelivery, assignPvNo, blockedAt, canDelete, canRelease, checkMilestone, completeness, correctLocked, currentState, deliveryFromQuote, deliveryFromTemplate, deliveryState,
  duplicateDelivery, isLocked, isSettled, liftReserve, linkMilestoneNc, linkReserveNc, logDelivery, lostByDeleting, lotsOf, mayRelease, milestoneProgress, milestoneStatus,
  moveMilestone, ncFromMilestone, ncFromReserve, ncOf, newDelivery, nextPresentation, openReserves, outOfBounds, parseQty, patchReserve, presentationNo, pvNumber, pvSigned, qtyReceived, receptionCfg,
  receptionsOf, refuse, releaseDelivery, remainingQty, removeMilestone, removeReserve, reopenMilestone, repairReserve, reserveDue, reserveLateDays, reservesOf, restoreDelivery, retentionFact,
  setMilestoneNa, setNoSign, setPvPhoto, setReceptionist, setResult, setShipCheck, shipChecksOf, signClient, signCompany, startReception, takeLife, templatesOf, unreleaseDelivery,
  upgradeDelivery, waiveMilestone, waivedFacts,
  clockFact, derogationFacts, photoReuse, releasedAfterDelivery, sealContent, sealOf, sealState, shortSeal, signatureOk, signBlockers, signWaiver,
  lotSealState, setQuantities, setStatePhotos, signatureReuse,
  boundsChanged, counted, frQty, isPostponed, promisedOn, quotePromisedOn,
  breakdownsTouching, canAskFeedback, deletable, ncLinkState,
  de, noSignWords, plural, rcDay, rcMoment, reserveWords,
} from './receptions';
import { deliveryAt } from './receptionsPdf';
const lastLog = (d: Delivery) => d.journal?.at(-1);   // the last line of the journal of an order (the helper of the domain had no caller outside the tests)
import { receptionExamples } from './receptionsExamples';
import { sha256 } from './sha256';
import { GLOSSARY, emptyTools, nb } from './base';
import { DEFAULT_SCALE } from './risk';
import { newNc } from './quality';
import { newQuote } from './commercial';
import { norm } from './instructions';

// The texts of the tool carry the no-break spaces of French typography (nb, base.ts): read as plain spaces here, whatever the shape of what is compared
const sp = <T,>(x: T): T => (typeof x === 'string' ? x.replace(/[\u00a0\u202f]/g, ' ') : Array.isArray(x) ? x.map(sp) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, sp(v)])) : x) as T;
const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const P = st().params;                                   // working days (the default of the company)
const PC = { ...P, businessHours: false };               // calendar days
const at = (dayIso: string, hm = '10:00') => `${dayIso}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];   // a drawing worth a signature (signatureOk)
const ms = (n = 4): Milestone[] => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id: 'dl1', ref: 'CMD-1', client: 'Client A', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const A = 'Alice', IDS = ['m1', 'm2', 'm3', 'm4'];
const allOk = (d: Delivery, day = '2026-09-10') => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at(day, '09:00') }), d);
const released = (d: Delivery = dl(), day = '2026-09-11') => releaseDelivery(allOk(d), { by: 'Marc', at: at(day, '16:00') });
const arrived = (d: Delivery, day = '2026-09-14') => startReception(d, { at: at(day, '14:00'), place: 'Chantier Nord' });
const received = (d: Delivery, day = '2026-09-14', result: Reception['result'] = 'sans') => setResult(arrived(d, day), result, at(day, '14:30'));
const signed = (d: Delivery, day = '2026-09-14') => signClient(d, ink, at(day, '14:40'), A);
// a lift needs a person and a proof (photo, note or the signature of the customer); in these tests the moment of the writing is the moment of the fact
const lift = (d: Delivery, rid: string, r: Parameters<typeof liftReserve>[2]) => liftReserve(d, rid, { now: r.at, note: 'Constaté sur place', ...r });
const deepFreeze = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };
const legacy = (over: Partial<Reception> = {}, root: Partial<Delivery> = {}): Delivery => ({
  id: 'old', ref: 'CMD-0', client: 'Client B', item: 'Portail', qty: null,
  milestones: LEGACY_MILESTONES.map(m => ({ ...m, measured: '', ok: true, by: 'Jean', date: '2026-09-01' })),
  releasedBy: 'Jean', releasedAt: '2026-09-05',
  reception: { date: '2026-09-10', name: 'M. Durand', role: 'Conducteur', result: 'reserve', reserve: 'Poignée desserrée', retentionPct: 5, amount: 12000, liftedAt: '2026-09-15', ...over },
  liftPhoto: 'photo:abc-10-10', liftSignedBy: 'M. Durand', signClient: ink, ...root,
});

describe('3.4 settings and neutral lists', () => {
  it('has neutral default lists, "Autre" ending the choices', () => {
    expect(DEFAULT_REFUSALS.at(-1)).toBe(OTHER);
    expect(sp(DEFAULT_NEXTS)).toEqual(['À reprendre et livrer à nouveau', 'À remplacer', 'Autre']);
    expect(DEFAULT_SHIP_CHECKS).toEqual(['Documents remis', 'Quantité ou livrables']);
    expect(JSON.stringify([DEFAULT_REFUSALS, DEFAULT_NEXTS, DEFAULT_SHIP_CHECKS]).toLowerCase()).not.toMatch(/atelier|soud|peinture|facture|prix|€/);
  });
  it('reads the settings: defaults, the days follow the company calendar, an empty list is the default list, "Autre" is kept once and last', () => {
    expect(receptionCfg(P)).toEqual({ liftDays: 7, liftBusiness: true, retention: { on: false, maxPct: 5 }, refusals: DEFAULT_REFUSALS, nexts: DEFAULT_NEXTS, releasers: [], shipChecks: DEFAULT_SHIP_CHECKS, unsignedDays: 2 });
    expect(receptionCfg(PC).liftBusiness).toBe(false);
    expect(receptionCfg({ ...PC, reception: { liftBusiness: true } }).liftBusiness).toBe(true);
    expect(receptionCfg({ ...P, reception: { liftBusiness: false } }).liftBusiness).toBe(false);
    expect(receptionCfg({ ...P, reception: { refusals: [] } }).refusals).toEqual(DEFAULT_REFUSALS);
    const c = receptionCfg({ ...P, reception: { liftDays: 10, retention: { on: true, maxPct: 3 }, refusals: ['Abîmé', 'autre', ' ', 'Trop tard'], nexts: ['À reprendre'], releasers: ['Marc', ''], shipChecks: ['Étiquette'], unsignedDays: 5 } });
    expect(c).toEqual({ liftDays: 10, liftBusiness: true, retention: { on: true, maxPct: 3 }, refusals: ['Abîmé', 'Trop tard', 'Autre'], nexts: ['À reprendre', 'Autre'], releasers: ['Marc'], shipChecks: ['Étiquette'], unsignedDays: 5 });
  });
  it('tells who may release: everyone when the list is empty, else the people of the list, accents and case aside', () => {
    expect(mayRelease(P, 'Bob')).toBe(true);
    const p = { ...P, reception: { releasers: ['Marc Léon'] } };
    expect(mayRelease(p, 'marc leon')).toBe(true);
    expect(mayRelease(p, 'Bob')).toBe(false);
  });
});

describe('3.4 models of milestones', () => {
  it('has neutral default milestones and the four of the first version apart', () => {
    expect(DEFAULT_MILESTONES.map(m => m.label)).toEqual(['Préparation', 'Réalisation', 'Contrôle final', 'Remise']);
    expect(LEGACY_MILESTONES.map(m => m.label)).toEqual(['Débit matière', 'Assemblage', 'Finition', 'Libération finale']);
    expect(MILESTONE_TEMPLATES.map(t => t.name)).toEqual(['Standard', 'Fabrication', 'Chantier ou pose', 'Prestation ou service', 'Revente ou négoce', 'Intervention']);
    MILESTONE_TEMPLATES.forEach(t => { expect(t.milestones).toHaveLength(4); t.milestones.forEach(m => { expect(m.label && m.point && m.requirement).toBeTruthy(); }); });
    expect(JSON.stringify(MILESTONE_TEMPLATES).toLowerCase()).not.toMatch(/microns|soudure|débit|peinture|équerrage|facture|€/);
    expect(MILESTONE_TEMPLATES.find(t => t.name === 'Chantier ou pose')?.shipChecks).toBeTruthy();
  });
  it('lists the built-in models, the ones of the older format and the ones of the company, a name given twice once (the last version, at its place)', () => {
    expect(templatesOf(P).map(t => t.name)).toEqual(MILESTONE_TEMPLATES.map(t => t.name));
    const mine = (point: string) => ({ label: 'Étape', point, requirement: 'ok' });
    const p = { ...P, milestoneTemplates: [{ name: 'Mon modèle', milestones: [mine('ancien')] }, { name: 'standard', milestones: [mine('à moi')] }], reception: { templates: [{ name: 'MON MODÈLE', milestones: [mine('récent')] }] } };
    const t = templatesOf(p);
    expect(t.map(x => x.name)).toEqual(['standard', 'Fabrication', 'Chantier ou pose', 'Prestation ou service', 'Revente ou négoce', 'Intervention', 'MON MODÈLE']);
    expect(t[6].milestones[0].point).toBe('récent');
    expect(newDelivery(p).milestones[0].point).toBe('à moi');   // the first model of the list gives the milestones of a new order
  });
});

describe('3.4 creation', () => {
  it('creates an empty order with the neutral milestones, an id each, no amount and no result', () => {
    const d = newDelivery(P);
    expect(d.id).toMatch(/^dl_/);
    expect(d.milestones.map(m => m.label)).toEqual(DEFAULT_MILESTONES.map(m => m.label));
    expect(new Set(d.milestones.map(m => m.id)).size).toBe(4);
    expect(d.milestones.every(m => m.ok === null && m.by === '' && m.measured === '')).toBe(true);
    expect(d).toMatchObject({ template: 'Standard', qty: null, releasedAt: '', reception: { result: '', amount: null } });
    expect(newDelivery().milestones).toHaveLength(4);
    expect(newDelivery().id).not.toBe(d.id);
  });
  it('builds an order from a model: the bounds, the unit and the checks before departure come along', () => {
    const d = deliveryFromTemplate({ name: 'Mesures', milestones: [{ label: 'Cote', point: 'Longueur', requirement: '100 à 102', unit: 'mm', min: 100, max: 102, critical: true, sopId: 's1', refPhoto: 'photo:r-1-1' }, { label: 'Aspect', point: 'Surface', requirement: 'Propre' }], shipChecks: ['Étiquette'] });
    expect(d.template).toBe('Mesures');
    expect(d.milestones[0]).toMatchObject({ label: 'Cote', unit: 'mm', min: 100, max: 102, critical: true, sopId: 's1', refPhoto: 'photo:r-1-1', ok: null });
    expect(d.milestones[1]).not.toHaveProperty('min');
    expect(d.shipChecks).toEqual([{ id: 'sc_0', label: 'Étiquette', ok: null, by: '', at: '' }]);
    expect(deliveryFromTemplate(MILESTONE_TEMPLATES[0])).not.toHaveProperty('shipChecks');
  });
  it('takes the client, the object and the promised day (decision + weeks) from a won quote, never its amount', () => {
    const q = { ...newQuote(st(), now), id: 'q1', client: 'Client A', object: 'Garde-corps', amount: 35871, weeks: 3, decidedAt: '2026-09-01', status: 'won' as const };
    const s = st({ quotes: { q1: q, q2: { ...q, id: 'q2', decidedAt: '' }, q3: { ...q, id: 'q3', weeks: null } } });
    const d = deliveryFromQuote(s, 'q1', P);
    expect(d).toMatchObject({ quoteId: 'q1', client: 'Client A', item: 'Garde-corps', promisedAt: '2026-09-22', qty: null });
    expect(d.reception.amount).toBeNull();
    expect(JSON.stringify(d)).not.toContain('35871');
    expect(deliveryFromQuote(s, 'q2', P)).not.toHaveProperty('promisedAt');
    expect(deliveryFromQuote(s, 'q3', P)).not.toHaveProperty('promisedAt');
    expect(deliveryFromQuote(s, 'nope', P)).toMatchObject({ client: '', item: '' });
    expect(deliveryFromQuote(s, 'nope', P)).not.toHaveProperty('quoteId');
  });
  it('copies the model and the customer of an order, never its results, release, signatures, lots nor journal', () => {
    const src = signed(received(released(dl({
      team: ['Alice', 'Bruno'], lot: 'L1', serial: 'S1', material: 'Acier', promisedAt: '2026-09-12', orgId: 'o1', contactId: 'c1', template: 'Fabrication',
      milestones: ms().map((m, i) => (i === 0 ? { ...m, unit: 'mm', min: 1, max: 2, critical: true, sopId: 's1', instrumentId: 'e1', refPhoto: 'photo:r-1-1' } : i === 1 ? { ...m, na: true, naReason: 'Sans objet ici' } : m)),
    }))));
    const c = duplicateDelivery({ ...src, lots: [{ id: 'lt1', no: 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: src.reception }], shipChecks: [{ id: 'sc_0', label: 'Emballage', ok: true, by: A, at: '2026-09-11T10:00' }] });
    expect(c.id).not.toBe(src.id);
    expect(c).toMatchObject({ client: 'Client A', item: 'Lot de pièces', qty: 10, template: 'Fabrication', orgId: 'o1', contactId: 'c1', material: 'Acier', team: ['Alice', 'Bruno'], releasedBy: '', releasedAt: '' });
    ['quoteId', 'promisedAt', 'lot', 'serial', 'lots', 'journal', 'signClient', 'signCompany', 'pvPhoto', 'releasedMoment', 'archivedAt'].forEach(k => expect(c).not.toHaveProperty(k));
    expect(c.ref).toBe('');   // a new order number is given
    expect(c.milestones[0]).toMatchObject({ label: 'Étape 1', unit: 'mm', min: 1, max: 2, critical: true, sopId: 's1', instrumentId: 'e1', refPhoto: 'photo:r-1-1', ok: null, by: '' });
    expect(c.milestones[1]).toMatchObject({ na: true, naReason: 'Sans objet ici' });
    expect(c.milestones.every(m => !m.history && !m.photo && !m.at)).toBe(true);
    expect(c.milestones[0].id).not.toBe('m1');
    expect(c.reception).toMatchObject({ result: '', date: '', name: src.reception.name, amount: null });
    expect(c.shipChecks).toEqual([{ id: 'sc_0', label: 'Emballage', ok: null, by: '', at: '' }]);
    expect(c.team).not.toBe(src.team);
    expect(src.journal?.length).toBeGreaterThan(3);   // the source is not touched
  });
});

describe('3.4 an older order is read, then written once', () => {
  it('gives the milestones an id by position, turns the single reservation (lifted, with its photo) into the first reservation, and does it once', () => {
    const old = legacy(), up = upgradeDelivery(old);
    expect(up.milestones.map(m => m.id)).toEqual(['ms_legacy_0', 'ms_legacy_1', 'ms_legacy_2', 'ms_legacy_3']);
    expect(up.reception.reserves).toEqual([{ id: 'rv_legacy', text: 'Poignée desserrée', raisedAt: '2026-09-10', liftedAt: '2026-09-15', liftedBy: 'M. Durand', liftPhoto: 'photo:abc-10-10' }]);
    expect(upgradeDelivery(up)).toEqual(up);
    expect(upgradeDelivery(upgradeDelivery(old))).toEqual(up);
    expect(up).not.toHaveProperty('team');
    expect(up.reception.amount).toBe(12000);   // kept, never read nor written
    expect(old.milestones.every(m => !m.id)).toBe(true);   // the order given is not touched
    expect(old.reception.reserves).toBeUndefined();
  });
  it('reads the reservation the same before and after (open: no lift, no photo), and nothing when the result is not "with reservation"', () => {
    const open = legacy({ liftedAt: '' }, { liftPhoto: undefined, liftSignedBy: undefined });
    expect(reservesOf(open)).toEqual([{ id: 'rv_legacy', text: 'Poignée desserrée', raisedAt: '2026-09-10' }]);
    expect(reservesOf(upgradeDelivery(open))).toEqual(reservesOf(open));
    expect(reservesOf(upgradeDelivery(legacy())).length).toBe(1);
    expect(reservesOf(legacy({ result: 'sans' }))).toEqual([]);
    expect(upgradeDelivery(legacy({ result: 'sans' })).reception.reserves).toBeUndefined();
    expect(deliveryState(legacy(), now, P)).toBe('lifted');
    expect(deliveryState(upgradeDelivery(legacy()), now, P)).toBe('lifted');
    expect(deliveryState(open, now, P)).toBe('reserve_late');   // 7 working days from the 10th ended on the 21st
  });
  it('writes no reservation for a result "with reservation" that has neither text nor lift (the state says it)', () => {
    const bare = legacy({ reserve: '', liftedAt: '' }, { liftPhoto: undefined, liftSignedBy: undefined, signClient: undefined });
    expect(reservesOf(bare)).toEqual([]);
    expect(upgradeDelivery(bare).reception.reserves).toBeUndefined();
    expect(deliveryState(bare, now, P)).toBe('reserve');
    expect(reservesOf(addReserve(bare, { text: 'Rayure', by: A, at: at('2026-09-14') })).map(r => r.text)).toEqual(['Rayure']);
  });
  it('upgrades the milestones of the closed deliveries too, and a team that is absent stays absent', () => {
    const d = legacy({}, { lots: [{ id: 'lt1', no: 1, closedAt: '2026-08-01T10:00', milestones: ms(2).map(m => ({ ...m, id: undefined })), releasedBy: '', releasedAt: '', reception: legacy().reception }] });
    const up = upgradeDelivery(d);
    expect(up.lots?.[0].milestones.map(m => m.id)).toEqual(['ms_legacy_0', 'ms_legacy_1']);
    expect(up.team).toBeUndefined();
    expect(upgradeDelivery({ ...up, team: ['Alice'] }).team).toEqual(['Alice']);
  });
  it('lets the checks work on the milestones of an order not yet upgraded', () => {
    const out = checkMilestone(legacy({ result: '', reserve: '' }), 'ms_legacy_2', { ok: false, by: A, at: at('2026-09-02') });
    expect(out.milestones[2]).toMatchObject({ id: 'ms_legacy_2', ok: false });
    expect(out.milestones[0].id).toBeUndefined();
  });
});

describe('3.4 milestone results', () => {
  it('tells the five statuses: to check, conform, reworked, not conform, not applicable', () => {
    const m = ms(1)[0], ev = { at: at('2026-09-10'), by: A, measured: '' };
    expect(milestoneStatus(m)).toBe('todo');
    expect(milestoneStatus({ ...m, ok: true })).toBe('ok');
    expect(milestoneStatus({ ...m, ok: false })).toBe('ko');
    expect(milestoneStatus({ ...m, ok: true, history: [{ ...ev, kind: 'check', ok: false }, { ...ev, kind: 'rework', ok: true }] })).toBe('reworked');
    expect(milestoneStatus({ ...m, ok: true, history: [{ ...ev, kind: 'check', ok: true }] })).toBe('ok');
    expect(milestoneStatus({ ...m, ok: false, na: true })).toBe('na');
  });
  it('reads a number in the value, the French comma and a thousand separator included; bounds are inclusive; no number, no judgement', () => {
    const m: Milestone = { ...ms(1)[0], unit: 'mm', min: 10, max: 12 };
    expect(outOfBounds(m, '12,8')).toBe(true);
    expect(outOfBounds(m, '12.8 mm')).toBe(true);
    expect(outOfBounds(m, '9,99')).toBe(true);
    expect(outOfBounds(m, '10')).toBe(false);
    expect(outOfBounds(m, '12')).toBe(false);
    expect(outOfBounds(m, '11,5 mm')).toBe(false);
    expect(outOfBounds({ ...m, measured: '13' })).toBe(true);   // the value of the milestone when none is given
    expect(outOfBounds(m, 'conforme')).toBe(false);
    expect(outOfBounds(m, '')).toBe(false);
    expect(outOfBounds({ ...m, min: undefined, max: undefined }, '999')).toBe(false);
    expect(outOfBounds({ ...m, min: null, max: 1000 }, '1 250')).toBe(true);
    expect(outOfBounds({ ...m, min: null, max: 1000 }, '-5')).toBe(false);
    expect(outOfBounds({ ...m, min: 0, max: null }, '-5')).toBe(true);
  });
  it('records a check with who, day, moment, value and proofs, and says it in the journal', () => {
    const d = dl({ milestones: ms().map((m, i) => (i === 1 ? { ...m, unit: 'mm', min: 10, max: 12 } : m)) });
    const out = checkMilestone(d, 'm2', { ok: true, measured: '11,5', by: A, at: at('2026-09-10', '09:05'), photo: 'photo:a-1-1', instrumentId: 'e9', second: 'Bruno' });
    expect(out.milestones[1]).toMatchObject({ ok: true, by: A, date: '2026-09-10', at: '2026-09-10T09:05', measured: '11,5', photo: 'photo:a-1-1', instrumentId: 'e9', second: 'Bruno' });
    expect(out.milestones[1].history).toEqual([{ at: '2026-09-10T09:05', by: A, kind: 'check', ok: true, measured: '11,5', requirement: 'Exigence 2', min: 10, max: 12, instrumentId: 'e9' }]);   // the definition as it was at the check
    expect(out.milestones[0].ok).toBeNull();
    expect(sp(lastLog(out))).toEqual({ at: '2026-09-10T09:05', by: A, text: 'Jalon 2 « Étape 2 » conforme (11,5 mm)' });
    expect(d.milestones[1].ok).toBeNull();   // the order given is not touched
    expect(checkMilestone(d, 'nope', { ok: true, by: A, at: at('2026-09-10') })).toBe(d);
  });
  it('forces a value out of the bounds to not conform, whatever was pressed, and says it as a fact', () => {
    const d = dl({ milestones: ms().map((m, i) => (i === 1 ? { ...m, unit: 'mm', min: 10, max: 12 } : m)) });
    const out = checkMilestone(d, 'm2', { ok: true, measured: '12,8', by: A, at: at('2026-09-10', '09:05') });
    expect(out.milestones[1].ok).toBe(false);
    expect(sp(out.milestones[1].history?.[0])).toMatchObject({ ok: false, kind: 'check', note: 'mesure hors de la plage attendue' });
    expect(sp(lastLog(out)?.text)).toBe('Jalon 2 « Étape 2 » non conforme (12,8 mm), mesure hors de la plage attendue');
    expect(milestoneStatus(out.milestones[1])).toBe('ko');
    expect(checkMilestone(d, 'm2', { ok: false, measured: '11', by: A, at: at('2026-09-10') }).milestones[1].ok).toBe(false);   // not conform stays so, a value in the bounds does not turn it conform
    expect(checkMilestone(d, 'm2', { ok: true, by: A, at: at('2026-09-10') })).toBe(d);   // bounds and no value: not conform, nothing is written (D-21)
  });
  it('never loses the history: not conform, reworked, reopened, checked again', () => {
    let d = checkMilestone(dl(), 'm1', { ok: false, measured: 'rayé', by: A, at: at('2026-09-10', '09:00'), gapPhoto: 'photo:gap-1-1', note: 'Rayure au centre' });
    expect(milestoneStatus(d.milestones[0])).toBe('ko');
    d = checkMilestone(d, 'm1', { ok: true, by: 'Bruno', at: at('2026-09-11', '10:00') });
    expect(d.milestones[0]).toMatchObject({ ok: true, by: 'Bruno', date: '2026-09-11', measured: '', gapPhoto: 'photo:gap-1-1' });   // the photo of the gap stays
    expect(d.milestones[0].history?.map(e => [e.kind, e.ok, e.by])).toEqual([['check', false, A], ['rework', true, 'Bruno']]);
    expect(d.milestones[0].history?.[0].note).toBe('Rayure au centre');
    expect(milestoneStatus(d.milestones[0])).toBe('reworked');
    expect(sp(lastLog(d)?.text)).toBe('Jalon 1 « Étape 1 » conforme après reprise');
    d = reopenMilestone(d, 'm1', A, at('2026-09-12'));
    expect(d.milestones[0]).toMatchObject({ ok: null, by: '', date: '', measured: '', gapPhoto: 'photo:gap-1-1' });
    expect(d.milestones[0]).not.toHaveProperty('at');
    expect(d.milestones[0].history).toHaveLength(3);
    expect(d.milestones[0].history?.[2]).toMatchObject({ kind: 'reopen', ok: null, by: A });
    d = checkMilestone(d, 'm1', { ok: true, by: A, at: at('2026-09-12', '11:00') });
    expect(d.milestones[0].history?.map(e => e.kind)).toEqual(['check', 'rework', 'reopen', 'check']);   // already reworked once: a plain check
    expect(milestoneStatus(d.milestones[0])).toBe('reworked');
    let e = checkMilestone(dl(), 'm1', { ok: false, by: A, at: at('2026-09-10') });
    e = reopenMilestone(e, 'm1', A, at('2026-09-11'));
    e = checkMilestone(e, 'm1', { ok: true, by: A, at: at('2026-09-12') });
    expect(e.milestones[0].history?.map(x => x.kind)).toEqual(['check', 'reopen', 'rework']);   // not conform, reopened, then conform: a rework
  });
  it('a second person and the instrument of a check belong to that check: a new check asks the second person again', () => {
    let d = checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10'), second: 'Bruno', instrumentId: 'e1' });
    d = checkMilestone(d, 'm1', { ok: true, by: A, at: at('2026-09-11') });
    expect(d.milestones[0]).not.toHaveProperty('second');
    expect(d.milestones[0].instrumentId).toBe('e1');
  });
  it('reopening a milestone undoes the release and says it; checking one not conform does too; a conform check does not', () => {
    const r = released();
    expect(r.releasedAt).toBe('2026-09-11');
    const re = reopenMilestone(r, 'm3', 'Bruno', at('2026-09-12'));
    expect(re).toMatchObject({ releasedBy: '', releasedAt: '' });
    expect(re).not.toHaveProperty('releasedMoment');
    expect(sp(re.journal?.slice(-2).map(l => l.text))).toEqual(['Libération défaite : jalon 3 « Étape 3 » rouvert', 'Jalon 3 « Étape 3 » rouvert (résultat précédent : conforme)']);
    const ko = checkMilestone(r, 'm2', { ok: false, by: 'Bruno', at: at('2026-09-12') });
    expect(ko.releasedAt).toBe('');
    expect(sp(ko.journal?.slice(-2).map(l => l.text))).toEqual(['Libération défaite : jalon 2 « Étape 2 » non conforme', 'Jalon 2 « Étape 2 » non conforme']);
    expect(checkMilestone(r, 'm2', { ok: true, by: 'Bruno', at: at('2026-09-12') }).releasedAt).toBe('2026-09-11');
    const todo = dl();
    expect(reopenMilestone(todo, 'm1', A, at('2026-09-12'))).toBe(todo);   // nothing to reopen
  });
  it('waives a milestone not conform only, with a reason: it no longer blocks, and counts as lifted at the release', () => {
    const d = checkMilestone(dl(), 'm2', { ok: false, by: A, at: at('2026-09-10') });
    expect(blockedAt(d)?.id).toBe('m2');
    expect(waiveMilestone(d, 'm2', 'Marc', '  ', at('2026-09-10'))).toBe(d);
    expect(waiveMilestone(d, 'm1', 'Marc', 'Raison', at('2026-09-10'))).toBe(d);   // nothing wrong there
    const w = waiveMilestone(d, 'm2', 'Marc', 'Accord du client', at('2026-09-10', '11:00'));
    expect(w.milestones[1]).toMatchObject({ ok: false, waivedBy: 'Marc', waivedWhy: 'Accord du client', waivedAt: '2026-09-10T11:00' });
    expect(w.milestones[1].history?.at(-1)).toMatchObject({ kind: 'derogation', ok: false, note: 'Accord du client' });
    expect(blockedAt(w)).toBeUndefined();
    expect(milestoneStatus(w.milestones[1])).toBe('ko');
    expect(sp(lastLog(w)?.text)).toBe('Dérogation sur jalon 2 « Étape 2 » non conforme : Accord du client');
    expect(waiveMilestone(w, 'm2', 'Marc', 'Encore', at('2026-09-11'))).toBe(w);
    expect(canRelease(st(), allOkExcept(w, 'm2'))).toEqual({ ok: true, why: [] });   // the waiver is the decision: no second reason is asked at the release
    expect(sp(waivedFacts(w))).toEqual(['Jalon 2 « Étape 2 » dérogé par Marc : Accord du client']);
    const c = checkMilestone(w, 'm2', { ok: true, by: A, at: at('2026-09-12') });
    expect(c.milestones[1]).not.toHaveProperty('waivedBy');   // a new result ends the waiver
  });
  it('sets a milestone aside as not applicable with a reason, and brings it back', () => {
    let d = setMilestoneNa(dl(), 'm3', 'Pas de finition prévue', A, at('2026-09-12'));
    expect(d.milestones[2]).toMatchObject({ na: true, naReason: 'Pas de finition prévue' });
    expect(milestoneStatus(d.milestones[2])).toBe('na');
    expect(milestoneProgress(d)).toEqual({ done: 0, total: 3, ko: 0, na: 1 });
    expect(checkMilestone(d, 'm3', { ok: true, by: A, at: at('2026-09-10') })).toBe(d);   // not applicable: nothing to check
    d = setMilestoneNa(d, 'm3', null, A, at('2026-09-12'));
    expect(d.milestones[2]).not.toHaveProperty('na');
    expect(d.milestones[2]).not.toHaveProperty('naReason');
    expect(milestoneProgress(d).total).toBe(4);
  });
  it('adds, removes and moves milestones, and counts the progress without the ones that do not apply', () => {
    let d = addMilestone(dl(), { label: 'Étiquetage', point: 'Étiquette posée', requirement: 'Lisible' });
    expect(d.milestones).toHaveLength(5);
    expect(d.milestones[4]).toMatchObject({ label: 'Étiquetage', ok: null });
    expect(d.milestones[4].id).toMatch(/^ms_/);
    expect(addMilestone(dl()).milestones[4]).toMatchObject({ label: '', point: '', requirement: '' });
    d = moveMilestone(d, 'm1', 1);
    expect(d.milestones.map(m => m.id).slice(0, 3)).toEqual(['m2', 'm1', 'm3']);
    expect(moveMilestone(d, 'm2', -1)).toBe(d);
    expect(moveMilestone(d, d.milestones[4].id!, 1)).toBe(d);
    expect(moveMilestone(d, 'nope', 1)).toBe(d);
    d = removeMilestone(d, 'm3', A, at('2026-09-12'));
    expect(d.milestones.map(m => m.id)).not.toContain('m3');
    let e = checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') });
    e = checkMilestone(e, 'm2', { ok: false, by: A, at: at('2026-09-10') });
    expect(milestoneProgress(e)).toEqual({ done: 1, total: 4, ko: 1, na: 0 });
  });
});

const allOkExcept = (d: Delivery, id: string) => IDS.filter(x => x !== id).reduce((x, k) => checkMilestone(x, k, { ok: true, by: A, at: at('2026-09-10') }), d);

describe('3.4 links with the red bin (5.1)', () => {
  it('builds a defect from a milestone or a reservation, linked to the order, in the process of the production', () => {
    const d = checkMilestone(dl({ milestones: ms().map((m, i) => (i === 1 ? { ...m, unit: 'mm' } : m)) }), 'm2', { ok: false, measured: '12,8', by: A, at: at('2026-09-10'), gapPhoto: 'photo:gap-1-1' });
    const s = st({ deliveries: { dl1: d } }), n = ncFromMilestone(s, d, d.milestones[1], A, now);   // the instant of the gesture is given: the number of the defect never reads the clock (T-3)
    expect(n).toMatchObject({ by: A, where: 'Lot de pièces', processId: 'P3', origin: 'interne', deliveryId: 'dl1', milestoneId: 'm2', photo: 'photo:gap-1-1', decision: '', ref: 'NC-2026-001', at: '2026-09-25T10:00' });
    expect(n.item).toBe('Lot de pièces, CMD-1, Client A');
    expect(n.description).toBe('Point 2 : 12,8 (exigence : Exigence 2)');
    expect(ncFromMilestone(s, d, { ...d.milestones[0] }, A, now).description).toBe('Point 1 : non conforme (exigence : Exigence 1)');
    const r = addReserve(received(d, '2026-09-14', 'reserve'), { text: 'Poignée desserrée', photo: 'photo:p-1-1', where: 'Porte', by: A, at: at('2026-09-14', '14:35') }), rv = reservesOf(r)[0];
    const nr = ncFromReserve(s, r, rv, A, now);
    expect(nr).toMatchObject({ where: 'Porte', description: 'Poignée desserrée', origin: 'client', processId: 'P3', deliveryId: 'dl1', reserveId: rv.id, photo: 'photo:p-1-1', ref: 'NC-2026-001', at: '2026-09-25T10:00' });
    expect(ncFromReserve(s, r, { ...rv, where: undefined }, A, now).where).toBe('Réception');
  });
  it('remembers one defect per milestone and per reservation, and finds it', () => {
    let d = dl();
    d = linkMilestoneNc(d, 'm2', 'nc1', A, at('2026-09-10'));
    expect(d.milestones[1].ncId).toBe('nc1');
    expect(sp(lastLog(d)?.text)).toBe('Défaut déclaré depuis jalon 2 « Étape 2 »');
    expect(linkMilestoneNc(d, 'm2', 'nc2')).toBe(d);   // already linked: the screen opens that defect again
    expect(linkMilestoneNc(d, 'nope', 'nc2')).toBe(d);
    let r = addReserve(received(d, '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    const rid = reservesOf(r)[0].id;
    r = linkReserveNc(r, rid, 'nc3', A, at('2026-09-14', '15:00'));
    expect(reservesOf(r)[0].ncId).toBe('nc3');
    expect(linkReserveNc(r, rid, 'nc4')).toBe(r);
    expect(linkReserveNc(r, 'nope', 'nc4')).toBe(r);
    const s = st({ ncs: { nc1: { ...newNc(st(), A, now), id: 'nc1' } } });
    expect(ncOf(s, 'nc1')?.id).toBe('nc1');
    expect(ncOf(s, 'gone')).toBeUndefined();
    expect(ncOf(s, undefined)).toBeUndefined();
    expect(ncOf(s, '')).toBeUndefined();
  });
});

describe('3.4 release before departure', () => {
  const nc = (decision: ReturnType<typeof newNc>['decision'], over = {}) => ({ ...newNc(st(), A, now), id: 'nc1', ref: 'NC-2026-001', decision, ...over });
  it('says what stands in the way as facts: milestones not conform since a day, to check, defects without decision; not applicable ones do not count', () => {
    let d = checkMilestone(dl(), 'm2', { ok: false, by: A, at: at('2026-09-04', '09:00') });
    d = setMilestoneNa(d, 'm4', 'Sans objet', A, at('2026-09-12'));
    const c = canRelease(st(), d);
    expect(c.ok).toBe(false);
    expect(sp(c.why)).toEqual(['Jalon 1 « Étape 1 » à contrôler', 'Jalon 2 « Étape 2 » non conforme depuis le 04/09/2026', 'Jalon 3 « Étape 3 » à contrôler']);
    expect(canRelease(st(), allOk(dl()))).toEqual({ ok: true, why: [] });
    const linked = linkMilestoneNc(allOk(dl()), 'm2', 'nc1');
    expect(canRelease(st({ ncs: { nc1: nc('') } }), linked).why).toEqual(['Défaut NC-2026-001 du jalon 2 sans décision']);
    expect(canRelease(st({ ncs: { nc1: nc('attente') } }), linked).ok).toBe(false);   // waiting for the customer is not a decision
    expect(canRelease(st({ ncs: { nc1: nc('retouche') } }), linked).ok).toBe(true);
    expect(canRelease(st({ ncs: {} }), linked).ok).toBe(true);   // the defect was deleted
  });
  it('releases with who, day and moment; refuses with something in the way unless a reason is given (who, why, when); once', () => {
    const ko = checkMilestone(allOk(dl()), 'm2', { ok: false, by: A, at: at('2026-09-10', '15:00') });
    expect(releaseDelivery(ko, { by: 'Marc', at: at('2026-09-11') })).toBe(ko);
    expect(releaseDelivery(ko, { by: 'Marc', at: at('2026-09-11'), derogation: { why: '   ' } })).toBe(ko);
    const d = releaseDelivery(ko, { by: 'Marc', at: at('2026-09-11', '16:00'), derogation: { why: 'Accord écrit du client' } });
    expect(d).toMatchObject({ releasedBy: 'Marc', releasedAt: '2026-09-11', releasedMoment: '2026-09-11T16:00', derogation: { by: 'Marc', why: 'Accord écrit du client', at: '2026-09-11T16:00' } });
    expect(sp(lastLog(d)?.text)).toBe('Libérée par Marc par dérogation : Accord écrit du client (jalon 2 « Étape 2 » non conforme depuis le 10/09/2026)');
    const ok = releaseDelivery(allOk(dl()), { by: 'Marc', at: at('2026-09-11', '16:00'), sign: ink, derogation: { why: 'Inutile' } });
    expect(ok).toMatchObject({ releasedBy: 'Marc', releasedAt: '2026-09-11', releaseSign: ink });
    expect(ok).not.toHaveProperty('derogation');   // nothing in the way: no derogation recorded
    expect(lastLog(ok)).toEqual({ at: '2026-09-11T16:00', by: 'Marc', text: 'Libérée par Marc', proof: true });
    expect(releaseDelivery(ok, { by: 'Paul', at: at('2026-09-12') })).toBe(ok);   // already released
    expect(releaseDelivery(allOk(dl()), { by: ' ', at: at('2026-09-11') }).releasedAt).toBe('');   // a named person
    expect(releaseDelivery(allOk(dl()), { by: 'Marc', at: at('2026-09-11'), sign: [[]] })).not.toHaveProperty('releaseSign');
  });
  it('checks the defects too when the state is given', () => {
    const linked = linkMilestoneNc(allOk(dl()), 'm2', 'nc1'), s = st({ ncs: { nc1: nc('') } });
    expect(releaseDelivery(linked, { by: 'Marc', at: at('2026-09-11') }, s)).toBe(linked);
    expect(releaseDelivery(linked, { by: 'Marc', at: at('2026-09-11'), derogation: { why: 'Décision attendue du client' } }, s).releasedAt).toBe('2026-09-11');
    expect(releaseDelivery(linked, { by: 'Marc', at: at('2026-09-11') }, st({ ncs: { nc1: nc('rebut') } })).releasedAt).toBe('2026-09-11');
  });
  it('undoes a release with a reason, and says it', () => {
    const r = released();
    expect(unreleaseDelivery(r, 'Marc', ' ', at('2026-09-12'))).toBe(r);
    const u = unreleaseDelivery(r, 'Marc', 'Pièce reprise', at('2026-09-12', '08:00'));
    expect(u).toMatchObject({ releasedBy: '', releasedAt: '' });
    ['releasedMoment', 'releaseSign', 'derogation'].forEach(k => expect(u).not.toHaveProperty(k));
    expect(sp(lastLog(u))).toEqual({ at: '2026-09-12T08:00', by: 'Marc', text: 'Libération annulée par Marc : Pièce reprise', proof: true });
    expect(unreleaseDelivery(dl(), 'Marc', 'x', at('2026-09-12')).journal).toBeUndefined();
    expect(deliveryState(u, now, P)).toBe('to_release');
  });
  it('lists the checks before departure from the settings until one is touched, then keeps them with their result', () => {
    const d = dl();
    expect(sp(shipChecksOf(d, P).map(c => [c.id, c.label]))).toEqual([['sc_0', 'Documents remis'], ['sc_1', 'Quantité ou livrables']]);
    expect(shipChecksOf(d, { ...P, reception: { shipChecks: ['Étiquette', 'Photo'] } }).map(c => c.label)).toEqual(['Étiquette', 'Photo']);
    expect(shipChecksOf(deliveryFromTemplate(MILESTONE_TEMPLATES[2]), P).map(c => c.label)).toEqual(['Matériel repris', 'Documents remis', 'Accès rendu']);
    let x = setShipCheck(d, 'sc_1', true, A, at('2026-09-11', '07:30'));
    expect(x.shipChecks).toHaveLength(2);
    expect(x.shipChecks?.[1]).toEqual({ id: 'sc_1', label: 'Quantité ou livrables', ok: true, by: A, at: '2026-09-11T07:30' });
    expect(sp(lastLog(x)?.text)).toBe('Contrôle de départ « Quantité ou livrables » : conforme');
    x = setShipCheck(x, 'sc_0', false, A, at('2026-09-11', '07:31'));
    x = setShipCheck(x, 'sc_1', null, 'Bruno', at('2026-09-11', '07:32'), true);
    expect(x.shipChecks?.[1]).toEqual({ id: 'sc_1', label: 'Quantité ou livrables', ok: null, na: true, by: 'Bruno', at: '2026-09-11T07:32' });
    x = setShipCheck(x, 'sc_0', null, A, at('2026-09-11', '07:33'));
    expect(x.shipChecks?.[0]).toEqual({ id: 'sc_0', label: 'Documents remis', ok: null, by: '', at: '' });
    expect(sp(x.journal?.map(l => l.text))).toEqual(['Contrôle de départ « Quantité ou livrables » : conforme', 'Contrôle de départ « Documents remis » : non conforme', 'Contrôle de départ « Quantité ou livrables » : sans objet', 'Contrôle de départ « Documents remis » : à contrôler']);
    expect(setShipCheck(x, 'sc_9', true, A, at('2026-09-11'))).toBe(x);
    expect(setShipCheck(d, 'sc_0', true, A, at('2026-09-11'), false, { ...P, reception: { shipChecks: ['Étiquette'] } }).shipChecks).toEqual([{ id: 'sc_0', label: 'Étiquette', ok: true, by: A, at: '2026-09-11T10:00' }]);
  });
});

describe('3.4 reception, reservations and their deadlines', () => {
  const withReserves = () => {
    let d = received(released(), '2026-09-14', 'reserve');
    d = addReserve(d, { text: 'Poignée desserrée', by: A, at: at('2026-09-14', '14:35') });
    return addReserve(d, { text: 'Rayure sur le capot', photo: 'photo:r-2-2', where: 'Capot', severity: 'blocking', by: A, at: at('2026-09-14', '14:36') });
  };
  it('records the delivery: the order is delivered, the first moment stays, the place may come later', () => {
    const d = startReception(released(), { at: at('2026-09-14', '14:05'), by: A });
    expect(d.reception).toMatchObject({ date: '2026-09-14', time: '14:05' });
    expect(deliveryState(d, now, P)).toBe('delivered');
    expect(lastLog(d)).toEqual({ at: '2026-09-14T14:05', by: A, text: 'Livraison chez le client' });
    const again = startReception(d, { at: at('2026-09-15', '09:00'), place: ' Chantier Nord ' });
    expect(again.reception).toMatchObject({ date: '2026-09-14', time: '14:05', place: ' Chantier Nord ' });
    expect(again.journal).toHaveLength(d.journal!.length);   // no second line
    expect(startReception(dl(), { at: '2026-09-14' }).reception).toMatchObject({ date: '2026-09-14' });
    expect(startReception(dl(), { at: '2026-09-14' }).reception).not.toHaveProperty('time');
    expect(lastLog(arrived(dl()))?.text).toBe('Livraison chez le client (Chantier Nord)');
  });
  it('sets the result (the delivery moment follows when none), and the customer and role of the person who receives', () => {
    let d = setResult(dl(), 'sans', at('2026-09-14', '14:30'), A);
    expect(d.reception).toMatchObject({ result: 'sans', date: '2026-09-14', time: '14:30' });
    expect(sp(lastLog(d))).toEqual({ at: '2026-09-14T14:30', by: A, text: 'Résultat de la réception : sans réserve' });
    expect(setResult(d, 'sans', at('2026-09-14', '15:00'))).toBe(d);   // nothing changes
    expect(setResult(d, '', at('2026-09-14', '15:00')).reception.result).toBe('');
    expect(lastLog(setResult(d, '', at('2026-09-14', '15:00')))?.text).toBe('Résultat de la réception retiré');
    expect(setResult(dl(), 'reserve', at('2026-09-14')).reception.reserves).toEqual([]);   // the reservations are now written
    const plain = dl();
    expect(setResult(plain, 'refus', at('2026-09-14'))).toBe(plain);   // a refusal goes through `refuse`
    d = setReceptionist(d, { name: 'M. Durand', role: 'Conducteur de travaux', orgId: 'o1', contactId: 'c1', email: 'durand@exemple.fr' });
    expect(d.reception).toMatchObject({ name: 'M. Durand', role: 'Conducteur de travaux', orgId: 'o1', contactId: 'c1', email: 'durand@exemple.fr' });
    expect(setReceptionist(d, { name: undefined, role: 'Chef de chantier' }).reception).toMatchObject({ name: 'M. Durand', role: 'Chef de chantier' });
  });
  it('raises several reservations, each with its text, photo, place, gravity and day; one without text or photo is not raised', () => {
    const d = withReserves(), [a, b] = reservesOf(d);
    expect(reservesOf(d)).toHaveLength(2);
    expect(a).toMatchObject({ text: 'Poignée desserrée', raisedAt: '2026-09-14', severity: 'minor' });
    expect(b).toMatchObject({ text: 'Rayure sur le capot', photo: 'photo:r-2-2', where: 'Capot', severity: 'blocking', raisedAt: '2026-09-14' });
    expect(a.id).toMatch(/^rv_/);
    expect(a.id).not.toBe(b.id);
    expect(a).not.toHaveProperty('dueAt');   // asked without the settings, `addReserve` writes no deadline: it is read from the settings (given the settings, it is written: see the lot 1 tests below)
    expect(a).not.toHaveProperty('photo');
    expect(sp(d.journal?.slice(-2).map(l => l.text))).toEqual(['Réserve ajoutée : « Poignée desserrée »', 'Réserve ajoutée (bloquante) : « Rayure sur le capot »']);
    expect(addReserve(d, { text: '  ', by: A, at: at('2026-09-14') })).toBe(d);
    expect(reservesOf(addReserve(d, { text: '', photo: 'photo:x-1-1', by: A, at: at('2026-09-14') }))).toHaveLength(3);
    expect(openReserves(d)).toHaveLength(2);
  });
  it('counts the deadline of each reservation in working days from the day it was raised, by the settings', () => {
    const d = withReserves(), [a] = reservesOf(d);
    expect(reserveDue(a, d, P)).toBe('2026-09-23');   // 7 working days after Monday the 14th
    expect(reserveDue(a, d, PC)).toBe('2026-09-21');
    expect(reserveDue(a, d, { ...P, reception: { liftDays: 3 } })).toBe('2026-09-17');
    expect(reserveDue(a, d, { ...P, reception: { liftDays: 3 }, closedDays: ['2026-09-15'] })).toBe('2026-09-18');   // a closed day does not count
    expect(reserveDue(a, d, { ...PC, closedDays: ['2026-09-15'] })).toBe('2026-09-21');   // calendar days: it does
    expect(reserveDue(a, d, { ...P, reception: { liftBusiness: false } })).toBe('2026-09-21');
    expect(reserveDue({ ...a, raisedAt: '2026-09-12' }, d, { ...P, reception: { liftDays: 1 } })).toBe('2026-09-14');   // raised on a Saturday: the Monday is the first working day
    expect(reserveDue({ ...a, dueAt: '2026-09-18' }, d, P)).toBe('2026-09-18');   // a deadline typed wins
    expect(reserveDue({ ...a, raisedAt: '' }, d, P)).toBe('2026-09-23');   // the reception day when the reservation has no day
    expect(reserveDue({ ...a, raisedAt: '' }, dl(), P)).toBe('');
    expect(addReserve(d, { text: 'Jeu', dueAt: '2026-09-16', by: A, at: at('2026-09-14', '15:00') }).reception.reserves?.[2].dueAt).toBe('2026-09-16');
  });
  it('tells the days late as a fact: from the day after the deadline, in working days or calendar days, and up to the lift for a lifted one', () => {
    const d = withReserves(), [a] = reservesOf(d);
    expect(reserveLateDays(a, d, P, new Date(2026, 8, 23))).toBe(0);   // the deadline day itself
    expect(reserveLateDays(a, d, P, new Date(2026, 8, 24))).toBe(1);
    expect(reserveLateDays(a, d, P, now)).toBe(2);
    expect(reserveLateDays(a, d, PC, now)).toBe(4);
    expect(reserveLateDays(a, d, P, new Date(2026, 8, 28))).toBe(3);   // the week-end does not count
    expect(reserveLateDays(a, d, PC, new Date(2026, 8, 28))).toBe(7);
    expect(reserveLateDays({ ...a, liftedAt: '2026-09-22' }, d, P, now)).toBe(0);   // lifted in time
    expect(reserveLateDays({ ...a, liftedAt: '2026-09-25' }, d, P, new Date(2026, 9, 30))).toBe(2);   // lifted late, whenever it is read
    expect(reserveLateDays({ ...a, raisedAt: '' }, dl(), P, now)).toBe(0);   // no deadline: no delay
  });
  it('refuses to lift a reservation before the reception, or twice; lifts it with the person, photo and signature of the customer, one at a time', () => {
    const d = withReserves(), [a, b] = reservesOf(d);
    expect(lift(d, a.id, { at: at('2026-09-13', '23:00'), by: 'M. Durand' })).toBe(d);   // before the reception day
    expect(lift(dl(), 'rv_x', { at: at('2026-09-16'), by: 'M. Durand' }).journal).toBeUndefined();
    const noDate = { ...d, reception: { ...d.reception, date: '' } };
    expect(lift(noDate, a.id, { at: at('2026-09-16'), by: 'M. Durand' })).toBe(noDate);   // no reception yet
    expect(lift(d, 'nope', { at: at('2026-09-16'), by: 'M. Durand' })).toBe(d);
    const l = lift(d, a.id, { at: at('2026-09-14', '16:00'), by: 'M. Durand', note: 'Revu avec le client', photo: 'photo:l-1-1', sign: ink });   // the reception day is accepted
    expect(reservesOf(l)[0]).toMatchObject({ liftedAt: '2026-09-14', liftedBy: 'M. Durand', liftNote: 'Revu avec le client', liftPhoto: 'photo:l-1-1', liftSign: ink });
    expect(reservesOf(l)[1]).not.toHaveProperty('liftedAt');
    expect(openReserves(l).map(r => r.id)).toEqual([b.id]);
    expect(deliveryState(l, now, P)).toBe('reserve_late');   // the other one is still open and late
    expect(lift(l, a.id, { at: at('2026-09-20'), by: 'Autre' })).toBe(l);   // already lifted
    expect(sp(lastLog(l))).toEqual({ at: '2026-09-14T16:00', by: 'M. Durand', text: 'Réserve « Poignée desserrée » levée enregistrée par M. Durand : Revu avec le client', proof: true });   // the person who records, and the note (the old line said "constatée par" the person of the company, G-8)
    const both = lift(l, b.id, { at: at('2026-09-18'), by: 'M. Durand' });
    expect(deliveryState(both, now, P)).toBe('lifted');
    expect(reservesOf(lift(d, a.id, { at: at('2026-09-16'), by: 'M. Durand' }))[0]).not.toHaveProperty('liftSign');   // no signature drawn: none kept
  });
  it('follows the reservation: who takes charge and for when, the repair with its photo, then the lift; a retired one is gone with its line', () => {
    let d = withReserves();
    const [a, b] = reservesOf(d), n = d.journal!.length;
    d = patchReserve(d, a.id, { handler: 'Bruno', dueAt: '2026-09-18' }, A, at('2026-09-15', '08:00'), 'Accord du client');
    expect(reservesOf(d)[0]).toMatchObject({ handler: 'Bruno', dueAt: '2026-09-18' });
    expect(sp(d.journal?.slice(-2))).toEqual([
      { at: '2026-09-15T08:00', by: A, text: 'Réserve « Poignée desserrée » : prise en charge par Bruno' },
      { at: '2026-09-15T08:00', by: A, text: 'Réserve « Poignée desserrée » : échéance fixée au 18/09/2026 : Accord du client', proof: true },
    ]);
    expect(patchReserve(d, a.id, { text: 'Poignée desserrée à gauche' }).journal).toHaveLength(n + 2);   // a typed text is not a line of the journal
    expect(reservesOf(patchReserve(d, a.id, { id: 'autre', text: 'Poignée à gauche', severity: 'blocking' }))[0]).toMatchObject({ id: a.id, text: 'Poignée à gauche', severity: 'blocking' });
    expect(patchReserve(d, 'nope', { text: 'x' })).toBe(d);
    d = repairReserve(d, a.id, { at: at('2026-09-16', '09:00'), by: 'Bruno', photo: 'photo:rep-1-1' });
    expect(reservesOf(d)[0]).toMatchObject({ repairedAt: '2026-09-16', repairPhoto: 'photo:rep-1-1', handler: 'Bruno' });
    expect(reservesOf(repairReserve(d, b.id, { at: at('2026-09-16'), by: 'Paul' }))[1]).toMatchObject({ repairedAt: '2026-09-16', handler: 'Paul' });
    expect(repairReserve(lift(d, a.id, { at: at('2026-09-17'), by: 'M. Durand' }), a.id, { at: at('2026-09-18') })).toEqual(lift(d, a.id, { at: at('2026-09-17'), by: 'M. Durand' }));
    const r = removeReserve(d, b.id, A, at('2026-09-16', '10:00'));
    expect(reservesOf(r).map(x => x.id)).toEqual([a.id]);
    expect(sp(lastLog(r)?.text)).toBe('Réserve retirée : « Rayure sur le capot »');
    expect(removeReserve(d, 'nope')).toBe(d);
  });
  it('refuses with its motive, a photo and what follows; a refusal without motive does nothing; the order is refused', () => {
    const d = arrived(released());
    expect(refuse(d, { reason: '  ', next: 'À remplacer' }, at('2026-09-14', '15:00'), A)).toBe(d);
    const r = refuse(d, { reason: 'Dégât constaté à la livraison', next: 'À reprendre et représenter', photo: 'photo:d-1-1' }, at('2026-09-14', '15:00'), A);
    expect(r.reception).toMatchObject({ result: 'refus', refusal: { reason: 'Dégât constaté à la livraison', next: 'À reprendre et représenter', photo: 'photo:d-1-1' } });
    expect(r.reception.refusal).not.toHaveProperty('other');
    expect(sp(lastLog(r))).toEqual({ at: '2026-09-14T15:00', by: A, text: 'Réception refusée : Dégât constaté à la livraison', proof: true });
    expect(deliveryState(r, now, P)).toBe('refused');
    expect(refuse(d, { reason: OTHER, other: 'Couleur différente', next: OTHER, nextOther: 'À voir' }, at('2026-09-14', '15:00'), A).reception.refusal).toEqual({ reason: 'Autre', other: 'Couleur différente', next: 'Autre', nextOther: 'À voir' });
    expect(sp(lastLog(refuse(d, { reason: OTHER, other: 'Couleur différente', next: OTHER, nextOther: 'À voir' }, at('2026-09-14'), A))?.text)).toBe('Réception refusée : Couleur différente');
    expect(setResult(d, 'refus', at('2026-09-14'))).toBe(d);   // a refusal goes through `refuse`: the motive is needed
    expect(setResult(r, 'refus', at('2026-09-14'))).toBe(r);
    expect(refuse(startReception(released(), { at: at('2026-09-14') }), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), A).reception.date).toBe('2026-09-14');
    expect(refuse(released(), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-15', '08:00'), A).reception).toMatchObject({ date: '2026-09-15', time: '08:00' });   // refused on arrival
  });
});

describe('3.4 signatures, proof and lock', () => {
  it('signs for the customer and for the company with the moment of each; a drawing with no stroke is not a signature', () => {
    let d = setReceptionist(received(dl()), { name: 'M. Durand' });
    expect(signClient(d, [[]], at('2026-09-14', '14:40'), A)).toBe(d);
    expect(signClient(d, [], at('2026-09-14', '14:40'), A)).toBe(d);
    d = signCompany(d, ink, at('2026-09-14', '14:41'), 'Marc');
    expect(d).toMatchObject({ signCompany: ink, reception: { companySignedAt: '2026-09-14T14:41' } });
    expect(isLocked(d)).toBe(false);   // the company alone does not close the PV
    d = signClient(d, ink, at('2026-09-14', '14:42'), A);
    expect(d).toMatchObject({ signClient: ink, reception: { signedAt: '2026-09-14T14:42' } });
    expect(d.journal?.find(l => l.text === 'PV signé par le client (M. Durand)')).toEqual({ at: '2026-09-14T14:42', by: A, text: 'PV signé par le client (M. Durand)', proof: true });   // the person who recorded it, not the customer
    expect(d.journal?.map(l => l.text)).toContain("PV signé pour l'entreprise");
    expect(pvSigned(d)).toBe(true);
    expect(isLocked(d)).toBe(true);
  });
  it('locks the PV when the result is given and the PV is signed: signature of the customer, photo of the paper PV, or the mention absent or refused', () => {
    const r = received(dl());
    expect(isLocked(r)).toBe(false);
    expect(isLocked(signed(arrived(dl())))).toBe(false);   // signed, no result yet
    expect(isLocked(signed(r))).toBe(true);
    expect(isLocked(setPvPhoto(r, 'photo:pv-1-1', at('2026-09-14', '15:00'), A))).toBe(true);
    expect(isLocked(setNoSign(r, 'absent', 'Bruno', at('2026-09-14', '15:00'), A))).toBe(true);
    expect(isLocked(setNoSign(r, 'refused', 'Bruno', at('2026-09-14', '15:00'), A))).toBe(true);
    expect(setNoSign(r, 'absent', 'Bruno', at('2026-09-14', '15:00'), A).reception.noSign).toEqual({ kind: 'absent', witness: 'Bruno', at: '2026-09-14T15:00' });
    expect(sp(setNoSign(r, 'refused', 'Bruno', at('2026-09-14', '15:00'), A).journal?.find(l => l.text.startsWith('PV sans signature')))).toEqual({ at: '2026-09-14T15:00', by: A, text: 'PV sans signature du client : signature refusée (témoin : Bruno)', proof: true });
    expect(setNoSign(r, 'absent', '  ', at('2026-09-14'), A)).toBe(r);   // a witness is named
    expect(setNoSign(signed(r), 'absent', 'Bruno', at('2026-09-14'), A)).toEqual(signed(r));   // a proof is not replaced
    expect(setResult(signed(arrived(dl())), 'sans', at('2026-09-14', '14:50')).reception.result).toBe('sans');   // the result is given before it is locked
  });
  it('the photo of the paper PV is kept or taken away while the PV is not locked, never replaced on a locked one', () => {
    const r = received(dl());
    let d = setPvPhoto(r, 'photo:pv-1-1', at('2026-09-14', '15:00'), A);
    expect(d.pvPhoto).toBe('photo:pv-1-1');
    expect(d.journal?.map(l => l.text)).toContain('Photo du PV papier signé ajoutée');
    expect(setPvPhoto(d, 'photo:pv-2-2', at('2026-09-14', '15:05'), A)).toBe(d);   // locked
    expect(setPvPhoto(d, '', at('2026-09-14', '15:05'), A)).toBe(d);
    d = setPvPhoto(arrived(dl()), 'photo:pv-1-1', at('2026-09-14', '15:00'), A);   // no result yet: not locked
    expect(setPvPhoto(d, 'photo:pv-2-2', at('2026-09-14', '15:05'), A).pvPhoto).toBe('photo:pv-2-2');
    const gone = setPvPhoto(d, '', at('2026-09-14', '15:05'), A);
    expect(gone).not.toHaveProperty('pvPhoto');
    expect(lastLog(gone)?.text).toBe('Photo du PV papier retirée');
    const plain = arrived(dl());
    expect(setPvPhoto(plain, '', at('2026-09-14'), A)).toBe(plain);   // nothing to take away
  });
  it('changes nothing of a locked PV except what is lifted, and keeps the signatures already given', () => {
    let d = setReceptionist(received(addReserve(received(dl(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), '2026-09-14', 'reserve'), { name: 'M. Durand' });
    d = signCompany(signed(d), ink, at('2026-09-14', '14:41'), A);
    expect(isLocked(d)).toBe(true);
    const rid = reservesOf(d)[0].id, journal = d.journal!.length;
    expect(setResult(d, 'sans', at('2026-09-15'))).toBe(d);
    expect(refuse(d, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-15'), A)).toBe(d);
    expect(startReception(d, { at: at('2026-09-15') })).toBe(d);
    expect(setReceptionist(d, { name: 'Autre' })).toBe(d);
    expect(addReserve(d, { text: 'Nouvelle', by: A, at: at('2026-09-15') })).toBe(d);
    expect(removeReserve(d, rid)).toBe(d);
    expect(signClient(d, [[[1, 1], [2, 2]]], at('2026-09-15'), A)).toBe(d);
    expect(signCompany(d, [[[1, 1], [2, 2]]], at('2026-09-15'), A)).toBe(d);
    const p = patchReserve(d, rid, { text: 'Réécrite', where: 'Ailleurs', severity: 'blocking', photo: 'photo:z-1-1', handler: 'Bruno', dueAt: '2026-09-20' }, A, at('2026-09-15'), 'Accord du client');
    expect(reservesOf(p)[0]).toMatchObject({ text: 'Rayure', handler: 'Bruno', dueAt: '2026-09-20' });   // the text, place, gravity and photo of the PV are frozen
    expect(reservesOf(p)[0]).not.toHaveProperty('photo');
    expect(reservesOf(p)[0]).not.toHaveProperty('where');
    expect(lift(d, rid, { at: at('2026-09-16'), by: 'M. Durand' }).reception.reserves?.[0].liftedAt).toBe('2026-09-16');   // lifting goes on
    expect(repairReserve(d, rid, { at: at('2026-09-15') }).reception.reserves?.[0].repairedAt).toBe('2026-09-15');
    const open = signed(received(allOk(dl()), '2026-09-14'));   // every milestone checked, nothing released, the PV signed: only the lock stands in the way of a release
    expect(isLocked(open)).toBe(true);
    expect(releaseDelivery(open, { by: 'Marc', at: at('2026-09-15') })).toBe(open);
    expect(d.journal).toHaveLength(journal);
  });
  it('corrects a locked PV only with a reason, and says what became what in the journal', () => {
    const d = signed(setReceptionist(received(dl()), { name: 'M. Durand' }));
    expect(correctLocked(d, { result: 'reserve', _why: ' ' }, A, at('2026-09-15'))).toBe(d);
    expect(correctLocked(d, { _why: 'Rien à corriger' }, A, at('2026-09-15'))).toBe(d);
    expect(correctLocked(d, { result: 'sans', _why: 'Même valeur' }, A, at('2026-09-15'))).toBe(d);
    const c = correctLocked(d, { result: 'reserve', place: 'Hangar 2', name: 'M. Dupont', _why: 'Erreur de saisie' }, A, at('2026-09-15', '08:30'));
    expect(c.reception).toMatchObject({ result: 'reserve', place: 'Hangar 2', name: 'M. Dupont', reserves: [] });
    expect(c.reception).not.toHaveProperty('_why');
    expect(sp(c.journal?.at(-2))).toEqual({ at: '2026-09-15T08:30', by: A, text: 'Corrigé : résultat sans réserve → avec réserve ; lieu Chantier Nord → Hangar 2 ; nom M. Durand → M. Dupont (motif : Erreur de saisie)', proof: true });
    expect(lastLog(c)).toMatchObject({ at: '2026-09-15T08:30', by: A, proof: true });   // and the new seal
    expect(correctLocked(d, { amount: 999, place: 'Quai 3', _why: 'Lieu' }, A, at('2026-09-15'))).toBe(d);   // the amount is never written: the whole patch is refused
    expect(correctLocked(d, { amount: 999, _why: 'Montant' }, A, at('2026-09-15'))).toBe(d);
    expect(correctLocked(d, { reserves: [{ id: 'rv_a', text: 'Oubliée', raisedAt: '2026-09-14' }], _why: 'Réserve oubliée' }, A, at('2026-09-15'))).toBe(d);   // the reservations have their own moves
    expect(isLocked(c)).toBe(true);
  });
  it('numbers the PV by year after the ones already given, deliveries and lots, and gives the number once', () => {
    const rec = (pvNo?: string): Reception => ({ ...dl().reception, ...(pvNo ? { pvNo } : {}) });
    const s = st({ deliveries: {
      a: dl({ id: 'a', reception: rec('PV-2026-007'), lots: [{ id: 'lt1', no: 1, closedAt: '2026-08-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: rec('PV-2026-012') }] }),
      b: dl({ id: 'b', reception: rec('PV-2025-099') }), c: dl({ id: 'c', reception: rec('PV-2026-x') }), d: dl({ id: 'd', reception: rec() }),
    } });
    expect(pvNumber(s, 2026)).toBe('PV-2026-013');
    expect(pvNumber(s, 2025)).toBe('PV-2025-100');
    expect(pvNumber(s, 2027)).toBe('PV-2027-001');
    expect(pvNumber(st(), 2026)).toBe('PV-2026-001');
    const d = assignPvNo(s, s.deliveries.d, at('2026-09-14', '14:40'));
    expect(d.reception.pvNo).toBe('PV-2026-013');
    expect(assignPvNo(st({ deliveries: { ...s.deliveries, d } }), d, at('2026-09-15'))).toBe(d);   // given once
    expect(assignPvNo(s, s.deliveries.d, at('2027-01-04', '09:00')).reception.pvNo).toBe('PV-2027-001');
  });
});

describe('3.4 deliveries in several times', () => {
  const part = (qty: number | undefined, day = '2026-09-14') => { const d = received(released(dl(), '2026-09-11'), day); return qty === undefined ? d : { ...d, reception: { ...d.reception, qty } }; };
  it('counts what is received and what is left: a delivery without quantity carries the whole rest, a refused one counts for nothing', () => {
    expect(qtyReceived(dl())).toBe(0);
    expect(remainingQty(dl())).toBe(10);
    expect(remainingQty(part(4))).toBe(6);
    expect(qtyReceived(part(4))).toBe(4);
    expect(remainingQty(part(undefined))).toBe(0);
    expect(remainingQty(part(25))).toBe(0);   // never negative
    expect(remainingQty(dl({ qty: null }))).toBeNull();
    expect(qtyReceived(dl({ qty: null }))).toBe(0);
    const refused = refuse({ ...arrived(dl()), reception: { ...arrived(dl()).reception, qty: 3 } }, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '15:00'), A);
    expect(qtyReceived(refused)).toBe(0);
    expect(remainingQty(refused)).toBe(10);
    expect(qtyReceived(received(dl(), '2026-09-14', 'reserve'))).toBe(10);   // received with reservations counts
  });
  it('is settled when everything is received; an order of unknown quantity is settled by a delivery that carries the whole rest', () => {
    expect(isSettled(dl())).toBe(false);
    expect(isSettled(part(4))).toBe(false);
    expect(isSettled(part(undefined))).toBe(true);
    expect(isSettled(part(10))).toBe(true);
    expect(isSettled(received(dl({ qty: null })))).toBe(true);
    const unknown = received(dl({ qty: null }));
    expect(isSettled({ ...unknown, reception: { ...unknown.reception, qty: 5 } })).toBe(false);   // 5 of an unknown quantity: not known to be the whole
    expect(isSettled(arrived(dl({ qty: 10 })))).toBe(false);   // not received yet
  });
  // the delivery received in part is closed into `lots`, the next one opens: one fixture, three rules (what the closed one keeps, what the next one starts with, what is said)
  const closing = () => {
    const base = signCompany(signed(setReceptionist(part(4), { name: 'M. Durand', role: 'Conducteur', email: 'd@exemple.fr' })), ink, at('2026-09-14', '14:41'), A);
    const withLife = { ...base, shipChecks: [{ id: 'sc_0', label: 'Emballage', ok: true, by: A, at: '2026-09-11T08:00' }], milestones: base.milestones.map((m, i) => (i === 1 ? { ...m, ncId: 'nc1', gapPhoto: 'photo:g-1-1', unit: 'mm', min: 1, max: 2, refPhoto: 'photo:r-1-1', na: true, naReason: 'x' } : m)) };
    const n = nextPresentation(withLife, A, at('2026-09-15', '08:00'));
    return { base, withLife, n };
  };
  it('keeps in the closed delivery everything it held: its checks, its release, its two signatures, its reception, its checks before departure', () => {
    const { n } = closing();
    expect(lotsOf(n)).toHaveLength(1);
    expect(lotsOf(n)[0]).toMatchObject({ no: 1, closedAt: '2026-09-15T08:00', releasedBy: 'Marc', releasedAt: '2026-09-11', signClient: ink, signCompany: ink, reception: { result: 'sans', qty: 4, name: 'M. Durand' } });
    expect(lotsOf(n)[0].milestones.every(m => m.ok === true)).toBe(true);   // the closed delivery keeps its checks
    expect(lotsOf(n)[0].milestones[1].history).toHaveLength(1);
    expect(lotsOf(n)[0].shipChecks?.[0].ok).toBe(true);
  });
  it('opens the next delivery empty: milestones back to check with their definitions, no release, no result, no signature, the customer and the person who receives stay', () => {
    const { n } = closing();
    expect(n).toMatchObject({ releasedBy: '', releasedAt: '' });
    ['releasedMoment', 'releaseSign', 'derogation', 'signClient', 'signCompany', 'pvPhoto'].forEach(k => expect(n).not.toHaveProperty(k));
    expect(n.reception).toMatchObject({ result: '', date: '', name: 'M. Durand', role: 'Conducteur', email: 'd@exemple.fr', amount: null });
    ['qty', 'reserves', 'pvNo', 'signedAt', 'time'].forEach(k => expect(n.reception).not.toHaveProperty(k));
    expect(n.milestones.map(m => m.ok)).toEqual([null, null, null, null]);
    expect(n.milestones[1]).toMatchObject({ id: 'm2', label: 'Étape 2', unit: 'mm', min: 1, max: 2, refPhoto: 'photo:r-1-1', na: true, naReason: 'x', by: '', date: '', measured: '' });
    ['ncId', 'gapPhoto', 'history', 'at'].forEach(k => expect(n.milestones[1]).not.toHaveProperty(k));
    expect(n.shipChecks).toEqual([{ id: 'sc_0', label: 'Emballage', ok: null, by: '', at: '' }]);
  });
  it('numbers the deliveries, says the closing in the journal, and the order is delivered in part before and in progress after', () => {
    const { base, withLife, n } = closing();
    expect(presentationNo(withLife)).toBe(1);
    expect(presentationNo(n)).toBe(2);
    expect(sp(lastLog(n))).toEqual({ at: '2026-09-15T08:00', by: A, text: 'Livraison 1 reçue en partie : livraison 2 ouverte' });
    expect(deliveryState(n, now, P)).toBe('in_progress');
    expect(deliveryState(base, now, P)).toBe('partial');
  });
  it('carries the delivery after the first one, with its own quantity, up to the order being settled', () => {
    let d = nextPresentation(signed(part(4)), A, at('2026-09-15'));   // the PV of the delivery under way is signed first (D-6)
    expect(receptionsOf(d).map(x => [x.qty, x.closed])).toEqual([[4, true], [6, false]]);   // the current delivery carries the rest
    d = received(allOk(d, '2026-09-16'), '2026-09-18');
    expect(receptionsOf(d).map(x => [x.qty, x.closed, x.reception.result])).toEqual([[4, true, 'sans'], [6, true, 'sans']]);
    expect(qtyReceived(d)).toBe(10);
    expect(remainingQty(d)).toBe(0);
    expect(isSettled(d)).toBe(true);
    expect(deliveryState(d, now, P)).toBe('accepted');
    expect(nextPresentation(d, A, at('2026-09-19'))).toBe(d);   // nothing left to deliver
    let e = nextPresentation(signed(part(4)), A, at('2026-09-15'), 3);
    expect(e.reception.qty).toBe(3);
    e = received({ ...e, reception: { ...e.reception, qty: 3 } }, '2026-09-18', 'reserve');
    expect(remainingQty(e)).toBe(3);
    e = nextPresentation(signed(addReserve(e, { text: 'Rayure', by: A, at: at('2026-09-18', '14:35') }), '2026-09-18'), A, at('2026-09-19'), null);
    expect(lotsOf(e)).toHaveLength(2);
    expect(lotsOf(e).map(l => l.no)).toEqual([1, 2]);
    expect(lotsOf(e)[1].reception.reserves?.[0].text).toBe('Rayure');   // the reservations stay with their delivery
    expect(reservesOf(e)).toEqual([]);
    expect(presentationNo(e)).toBe(3);
  });
  it('does not close a delivery that is not received nor refused', () => {
    const fresh = dl(), a = arrived(dl());
    expect(nextPresentation(fresh, A, at('2026-09-15'))).toBe(fresh);
    expect(nextPresentation(a, A, at('2026-09-15'))).toBe(a);
  });
  it('presents again after a refusal: the refused delivery goes into the lots with its motive, the quantity stays to deliver and follows the new presentation', () => {
    let d: Delivery = { ...arrived(released()), reception: { ...arrived(released()).reception, qty: 3 } };
    d = refuse(d, { reason: 'Dégât constaté à la livraison', next: 'À reprendre et représenter', photo: 'photo:d-1-1' }, at('2026-09-14', '15:00'), A);
    d = nextPresentation(d, A, at('2026-09-16', '08:00'));
    expect(lotsOf(d)[0].reception).toMatchObject({ result: 'refus', qty: 3, refusal: { reason: 'Dégât constaté à la livraison', photo: 'photo:d-1-1' } });
    expect(sp(lastLog(d)?.text)).toBe('Réception refusée à la livraison 1 : livraison 2 ouverte');
    expect(d.reception).toMatchObject({ result: '', qty: 3 });   // the same goods are presented again
    expect(d.reception).not.toHaveProperty('refusal');
    expect(qtyReceived(d)).toBe(0);
    expect(remainingQty(d)).toBe(10);
    expect(deliveryState(d, now, P)).toBe('in_progress');
    d = received(released(allOk(d, '2026-09-16'), '2026-09-17'), '2026-09-18');
    expect(qtyReceived(d)).toBe(3);
    expect(remainingQty(d)).toBe(7);
    expect(deliveryState(d, now, P)).toBe('partial');
    expect(nextPresentation(refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), A), A, at('2026-09-15'), 8).reception.qty).toBe(8);
  });
  it('keeps the quantity of each delivery when the quantity ordered is unknown', () => {
    const d = nextPresentation(signed({ ...part(4), qty: null }), A, at('2026-09-15'));
    expect(receptionsOf(d).map(x => [x.qty, x.closed])).toEqual([[4, true], [null, false]]);
    expect(remainingQty(d)).toBeNull();
  });
});

describe('3.4 states of an order', () => {
  it('tells the twelve states with their label and tone', () => {
    expect(Object.keys(DELIVERY_STATE)).toEqual(['in_progress', 'blocked', 'to_release', 'released', 'delivered', 'accepted', 'partial', 'reserve', 'reserve_late', 'lifted', 'refused', 'archived']);
    expect(Object.values(DELIVERY_STATE).map(x => x.label)).toEqual([
      'En cours', 'Jalon non conforme', 'À libérer', 'Libérée, à livrer', 'Livrée, PV à signer', 'Reçue sans réserve', 'Livrée en partie', 'Réserves à lever', 'Réserves en retard', 'Réserves levées', 'Refusée', 'Archivée',
    ]);
    expect(Object.values(DELIVERY_STATE).every(x => ['ok', 'warn', 'alert', 'pending'].includes(x.tone))).toBe(true);
    expect(DELIVERY_STATE.reserve_late.tone).toBe('alert');
    expect(DELIVERY_STATE.accepted.tone).toBe('ok');
  });
  it('goes from the milestones to the release to the acceptance', () => {
    const d = dl();
    expect(deliveryState(d, now, P)).toBe('in_progress');
    expect(deliveryState(checkMilestone(d, 'm2', { ok: false, by: A, at: at('2026-09-10') }), now, P)).toBe('blocked');
    expect(deliveryState(allOk(d), now, P)).toBe('to_release');
    expect(deliveryState(released(), now, P)).toBe('released');
    expect(deliveryState(arrived(released()), now, P)).toBe('delivered');
    expect(deliveryState(received(released()), now, P)).toBe('accepted');
    expect(deliveryState(d)).toBe('in_progress');   // today and the settings of the company by default
  });
  it('tells every state in its order of priority', () => {
    const rec = received(released(), '2026-09-14', 'reserve'), one = addReserve(rec, { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), rid = reservesOf(one)[0].id;
    expect(deliveryState(one, now, P)).toBe('reserve_late');   // 7 working days from the 14th ended on the 23rd
    expect(deliveryState(one, new Date(2026, 8, 23), P)).toBe('reserve');
    expect(deliveryState(lift(one, rid, { at: at('2026-09-16'), by: 'M. Durand' }), now, P)).toBe('lifted');
    expect(deliveryState(received(dl(), '2026-09-14', 'reserve'), now, P)).toBe('reserve');   // reservations announced, none written yet
    const partial = part4();
    expect(deliveryState(partial, now, P)).toBe('partial');
    const open = addReserve({ ...partial, reception: { ...partial.reception, result: 'reserve' } }, { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    expect(deliveryState(open, new Date(2026, 8, 16), P)).toBe('reserve');   // open reservations come before the quantity left
    expect(deliveryState(open, now, P)).toBe('reserve_late');
    expect(deliveryState(lift(open, reservesOf(open)[0].id, { at: at('2026-09-16'), by: 'M. Durand' }), now, P)).toBe('partial');   // all lifted, quantity left
    const refused = refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '15:00'), A);
    expect(deliveryState(refused, now, P)).toBe('refused');
    expect(deliveryState(addReserve(refused, { text: 'Rayure', by: A, at: at('2026-09-14', '15:05') }), now, P)).toBe('refused');   // refused first
    expect(deliveryState(archiveDelivery(refused, at('2026-09-20'), 'Abandonnée'), now, P)).toBe('archived');   // archived before everything
    expect(deliveryState(archiveDelivery(dl(), at('2026-09-20'), ''), now, P)).toBe('archived');
    expect(deliveryState(restoreDelivery(archiveDelivery(refused, at('2026-09-20'), '')), now, P)).toBe('refused');
  });
  it('tells delivered before released, and released before the milestones; a milestone not applicable or waived does not hold back the release', () => {
    expect(deliveryState(arrived(dl()), now, P)).toBe('delivered');   // delivered without a release or a check
    expect(deliveryState(releaseDelivery(allOk(dl()), { by: 'Marc', at: at('2026-09-11') }), now, P)).toBe('released');
    const na = setMilestoneNa(allOkExcept(dl(), 'm3'), 'm3', 'Sans objet', A, at('2026-09-12'));
    expect(deliveryState(na, now, P)).toBe('to_release');
    const ko = checkMilestone(allOkExcept(dl(), 'm3'), 'm3', { ok: false, by: A, at: at('2026-09-10') });
    expect(deliveryState(ko, now, P)).toBe('blocked');
    expect(deliveryState(waiveMilestone(ko, 'm3', 'Marc', 'Accord', at('2026-09-11')), now, P)).toBe('to_release');
    expect(deliveryState(dl({ milestones: [] }), now, P)).toBe('to_release');
  });
  it('counts the deadline of the reservations by the settings: the day of the deadline is on time, the day after is late', () => {
    const d = addReserve(received(dl(), '2026-09-18', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-18', '14:35') });
    expect(deliveryState(d, new Date(2026, 8, 25), PC)).toBe('reserve');
    expect(deliveryState(d, new Date(2026, 8, 26), PC)).toBe('reserve_late');
    expect(deliveryState(d, new Date(2026, 8, 28), P)).toBe('reserve');   // working days: due on the 29th
    expect(deliveryState(d, new Date(2026, 8, 30), P)).toBe('reserve_late');
    expect(deliveryState(d, new Date(2026, 8, 26), { ...P, reception: { liftDays: 14 } })).toBe('reserve');
  });
  it('says a retention above the maximum of the clause as a fact, never an amount, only when the clause is on', () => {
    const d = (pct: number | null) => dl({ reception: { ...dl().reception, retentionPct: pct, amount: 12000 } });
    const on = { ...P, reception: { retention: { on: true, maxPct: 5 } } };
    expect(sp(retentionFact(d(10), on))).toBe('retenue de 10 % saisie, 5 % au maximum prévu');
    expect(retentionFact(d(10), P)).toBe('');   // no clause
    expect(retentionFact(d(5), on)).toBe('');
    expect(retentionFact(d(null), on)).toBe('');
    expect(sp(retentionFact(d(8), { ...P, reception: { retention: { on: true, maxPct: 7.5 } } }))).toBe('retenue de 8 % saisie, 7,5 % au maximum prévu');
    expect(retentionFact(d(10), on)).not.toMatch(/€|12/);
  });
});
const part4 = (): Delivery => ({ ...received(released(dl(), '2026-09-11'), '2026-09-14'), reception: { ...received(released(dl(), '2026-09-11'), '2026-09-14').reception, qty: 4 } });

describe('3.4 the old tests of the first version, without the amounts', () => {
  const old = (res: Partial<Reception>) => dl({ qty: null, reception: { ...dl().reception, result: 'reserve', reserve: 'Poignée', retentionPct: 5, amount: 10000, liftedAt: '', ...res } });
  it('goes from milestones to release to acceptance (older records, the four old milestones)', () => {
    const d = legacy({ result: '', reserve: '', liftedAt: '', date: '' }, { releasedAt: '', releasedBy: '', signClient: undefined, milestones: LEGACY_MILESTONES.map(m => ({ ...m, measured: '', ok: null, by: '', date: '' })) });
    const ok = (oks: (boolean | null)[]) => d.milestones.map((m, i) => ({ ...m, ok: oks[i] }));
    expect(deliveryState(d, now, P)).toBe('in_progress');
    expect(deliveryState({ ...d, milestones: ok([true, false, null, null]) }, now, P)).toBe('blocked');
    expect(deliveryState({ ...d, milestones: ok([true, true, true, true]) }, now, P)).toBe('to_release');
    expect(deliveryState({ ...d, milestones: ok([true, true, true, true]), releasedAt: '2026-09-20' }, now, P)).toBe('released');
    expect(deliveryState({ ...d, reception: { ...d.reception, result: 'sans' } }, now, P)).toBe('accepted');
  });
  it('is late when the reservation is not lifted within the delay, lifted when it is, with the clause as a fact and no amount (reservation of the first version)', () => {
    expect(deliveryState(old({ date: '2026-09-20' }), now, P)).toBe('reserve');
    expect(deliveryState(old({ date: '2026-09-10' }), now, P)).toBe('reserve_late');
    expect(deliveryState(old({ date: '2026-09-10', liftedAt: '2026-09-15' }), now, P)).toBe('lifted');
    expect(deliveryState(old({ date: '2026-09-20' }), now, PC)).toBe('reserve');
    expect(deliveryState(old({ date: '2026-09-17' }), new Date(2026, 8, 18), PC)).toBe('reserve');
    expect(deliveryState(old({ date: '2026-09-17' }), new Date(2026, 8, 25), PC)).toBe('reserve_late');
    const on = { ...P, reception: { retention: { on: true, maxPct: 5 } } };
    expect(sp(retentionFact(old({ date: '2026-09-10', retentionPct: 10 }), on))).toBe('retenue de 10 % saisie, 5 % au maximum prévu');
    const o = old({ date: '2026-09-10' });
    expect(reserveDue(reservesOf(o)[0], o, P)).toBe('2026-09-21');
    expect(reserveDue(reservesOf(o)[0], o, PC)).toBe('2026-09-17');
    expect(openReserves(old({ date: '2026-09-10', liftedAt: '2026-09-15' }))).toEqual([]);
  });
});

describe('3.4 life, deletion and archive', () => {
  const lived = () => {
    const ready = setShipCheck(released(), 'sc_0', true, A, at('2026-09-11', '07:00'));
    let d = signCompany(signed(setReceptionist(addReserve(received(ready, '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), { name: 'M. Durand' })), ink, at('2026-09-14', '14:41'), 'Marc');
    d = linkMilestoneNc(d, 'm2', 'nc1', A, at('2026-09-14', '15:00'));
    return { ...d, pvPhoto: 'photo:pv-1-1', lots: [{ id: 'lt0', no: 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: dl().reception }], reception: { ...d.reception, pvNo: 'PV-2026-001', qty: 4 } };
  };
  it('writes what was typed and keeps the life of the saved order, so a stale sheet never erases a check, a signature or a reservation', () => {
    const { signClient: _signed, pvPhoto: _photo, ...unsigned } = lived(), saved: Delivery = unsigned;   // the PV of a signed order is kept whole: see the lock tests
    const stale: Delivery = {
      ...dl({ item: 'Renommé', client: 'Client Z', qty: 12, team: ['Alice'], promisedAt: '2026-09-30', lot: 'L9' }),
      milestones: [...ms(3).map(m => ({ ...m, label: `${m.label} bis` })), { ...ms(1)[0], id: 'm9', label: 'Ajouté' }],
      reception: { ...dl().reception, name: 'M. Martin', role: 'Chef de chantier', place: 'Hangar', email: 'martin@exemple.fr', orgId: 'o2', contactId: 'c2' },
    };
    const out = takeLife(stale, saved);
    expect(out).toMatchObject({ item: 'Renommé', client: 'Client Z', qty: 12, team: ['Alice'], promisedAt: '2026-09-30', lot: 'L9', id: 'dl1' });
    LIFE_KEYS.forEach(k => expect(out[k]).toEqual(saved[k]));
    expect(out.signCompany).toEqual(ink);
    expect(out.releasedAt).toBe('2026-09-11');
    expect(out.journal).toEqual(saved.journal);
    expect(out.lots).toHaveLength(1);
    expect(out.milestones.map(m => m.id)).toEqual(['m1', 'm2', 'm3', 'm9']);   // the structure typed (a milestone removed or added) wins
    expect(out.milestones[1]).toMatchObject({ label: 'Étape 2 bis', ok: true, by: A, date: '2026-09-10', ncId: 'nc1' });   // typed definition, saved result
    expect(out.milestones[1].history).toEqual(saved.milestones[1].history);
    expect(out.milestones[3]).toMatchObject({ label: 'Ajouté', ok: null });   // a milestone typed and not saved yet has no life
    expect(out.reception).toMatchObject({ name: 'M. Martin', role: 'Chef de chantier', place: 'Hangar', email: 'martin@exemple.fr', orgId: 'o2', contactId: 'c2' });   // typed
    expect(out.reception).toMatchObject({ result: 'reserve', pvNo: 'PV-2026-001', qty: 4, signedAt: '2026-09-14T14:40', companySignedAt: '2026-09-14T14:41', date: '2026-09-14', time: '14:00' });   // saved
    expect(out.reception.reserves).toEqual(saved.reception.reserves);
    expect(takeLife(stale, undefined)).toBe(stale);   // a new order is written as it is (what is typed and what is life, key by key: receptions.rules.test.ts)
  });
  it('removes from the typed copy what the saved order no longer has (a release undone in the meantime), and keeps the typed copy of an unsaved one', () => {
    const typed = { ...dl(), releasedBy: 'Marc', releasedAt: '2026-09-11', releasedMoment: '2026-09-11T16:00', signClient: ink, journal: [{ at: 'x', by: 'y', text: 'z' }] };
    const out = takeLife(typed, dl());
    expect(out).toMatchObject({ releasedBy: '', releasedAt: '' });
    ['releasedMoment', 'signClient', 'journal'].forEach(k => expect(out).not.toHaveProperty(k));
  });
  it('matches the milestones by id, and a milestone of an order not yet upgraded by its position', () => {
    const saved = checkMilestone(dl(), 'm3', { ok: true, by: A, at: at('2026-09-10') }), typed = { ...dl(), milestones: [...dl().milestones].reverse() };
    expect(takeLife(typed, saved).milestones.map(m => [m.id, m.ok])).toEqual([['m4', null], ['m3', true], ['m2', null], ['m1', null]]);
    const old = checkMilestone(legacy({ result: '', reserve: '' }), 'ms_legacy_1', { ok: false, by: A, at: at('2026-09-02') });
    const t = takeLife(legacy({ result: '', reserve: '' }), upgradeDelivery(old));
    expect(t.milestones[1]).toMatchObject({ id: 'ms_legacy_1', ok: false });
  });
  it('deletes an order where nothing is lost: the creation line alone, an empty list of closed deliveries', () => {
    expect(canDelete(dl())).toBe(true);
    expect(canDelete(newDelivery(P))).toBe(true);
    expect(canDelete(logDelivery(dl(), A, at('2026-09-01'), 'Commande créée'))).toBe(true);   // the creation line alone
    expect(canDelete(dl({ lots: [] }))).toBe(true);
  });
  it('does not delete an order that holds a line of the journal, a check, a photo, a release, a delivery, a result, a signature, a closed delivery, a check before departure, a reservation, or old data', () => {
    expect(canDelete(logDelivery(logDelivery(dl(), A, at('2026-09-01'), 'Commande créée'), A, at('2026-09-02'), 'Autre chose'))).toBe(false);
    expect(canDelete(checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') }))).toBe(false);
    expect(canDelete(dl({ milestones: ms().map((m, i) => (i === 0 ? { ...m, photo: 'photo:a-1-1' } : m)) }))).toBe(false);
    expect(canDelete(dl({ releasedAt: '2026-09-11' }))).toBe(false);
    expect(canDelete(arrived(dl()))).toBe(false);
    expect(canDelete(setResult(dl(), 'sans', at('2026-09-14')))).toBe(false);
    expect(canDelete(dl({ pvPhoto: 'photo:pv-1-1' }))).toBe(false);
    expect(canDelete(dl({ signCompany: ink }))).toBe(false);
    expect(canDelete(dl({ lots: [{ id: 'lt0', no: 1, closedAt: '', milestones: [], releasedBy: '', releasedAt: '', reception: dl().reception }] }))).toBe(false);
    expect(canDelete(setShipCheck(dl(), 'sc_0', true, A, at('2026-09-10')))).toBe(false);
    expect(canDelete(dl({ reception: { ...dl().reception, reserves: [{ id: 'rv_a', text: 'x', raisedAt: '' }] } }))).toBe(false);
    expect(canDelete(legacy())).toBe(false);
  });
  it('tells what would be lost when an order is not deleted', () => {
    expect(lostByDeleting(dl())).toBe('');
    expect(lostByDeleting(lived())).toBe('4 jalons contrôlés, 1 contrôle de départ, 1 libération, 1 réception, 1 réserve, 2 signatures, 1 livraison close, 14 lignes de journal');   // two of them are the seals (the customer signs, then the company)
    expect(lostByDeleting(checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') }))).toBe('1 jalon contrôlé');   // one line of journal is the creation
  });
  it('archives with a day and a note, puts back, and says it in the journal; nothing else changes', () => {
    const a = archiveDelivery(received(released()), at('2026-09-20'), 'Commande soldée', A);
    expect(a).toMatchObject({ archivedAt: '2026-09-20T10:00', archivedNote: 'Commande soldée' });
    expect(sp(lastLog(a))).toEqual({ at: '2026-09-20T10:00', by: A, text: 'Commande archivée : Commande soldée' });
    expect(archiveDelivery(a, at('2026-09-25'), 'Autre note', A)).toBe(a);   // already archived: the date does not move, nothing is written twice
    expect(lastLog(archiveDelivery(dl(), at('2026-09-20'), ' '))?.text).toBe('Commande archivée');
    const r = restoreDelivery(a, A, at('2026-09-21', '08:00'));
    ['archivedAt', 'archivedNote'].forEach(k => expect(r).not.toHaveProperty(k));
    expect(sp(lastLog(r))).toEqual({ at: '2026-09-21T08:00', by: A, text: 'Commande restaurée' });
    expect(r.reception).toEqual(a.reception);
    const plain = dl();
    expect(restoreDelivery(plain)).toBe(plain);   // not archived: nothing to put back, nothing written
  });
  it('keeps the last 300 lines of the journal, newest last', () => {
    let d = dl();
    for (let i = 0; i < 305; i++) d = logDelivery(d, A, at('2026-09-10'), `ligne ${i}`);
    expect(d.journal).toHaveLength(300);
    expect(d.journal?.[0].text).toBe('ligne 5');
    expect(lastLog(d)?.text).toBe('ligne 304');
    expect(lastLog(dl())).toBeUndefined();
  });
});

describe('3.4 completeness of the sheet', () => {
  it('tells what is missing as facts, each point leading to its tab', () => {
    const fresh = completeness(newDelivery(P));
    expect(fresh.pct).toBe(13);   // only "no reservation open" is true
    expect(fresh.missing.map(m => m.key)).toEqual(['client', 'item', 'promisedAt', 'milestones', 'release', 'result', 'signature']);
    expect(fresh.missing.map(m => m.tab)).toEqual(['order', 'order', 'order', 'milestones', 'release', 'reception', 'reception']);
    expect(fresh.missing[0].label).toBe('Pas encore de client');
    expect(fresh.missing.find(m => m.key === 'milestones')?.label).toBe('Aucun jalon contrôlé');
    const half = completeness(allOkExcept(dl({ promisedAt: '2026-09-30' }), 'm4'));
    expect(half.missing.find(m => m.key === 'milestones')?.label).toBe('1 jalon à contrôler');
    expect(half.missing.map(m => m.key)).not.toContain('client');
    const full = signed(received(released(dl({ promisedAt: '2026-09-30' }))));
    expect(completeness(full)).toEqual({ pct: 100, missing: [] });
    const open = addReserve(received(released(dl({ promisedAt: '2026-09-30' })), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    expect(completeness(signed(open)).missing).toEqual([{ key: 'reserves', label: '1 réserve non levée', tab: 'follow' }]);
    expect(completeness(setMilestoneNa(released(dl({ promisedAt: '2026-09-30' })), 'm4', 'Sans objet', A, at('2026-09-12'))).missing.map(m => m.key)).toEqual(['result', 'signature']);
  });
});

describe('3.4 pure functions and plain messages', () => {
  it('never changes the order given (frozen all the way down) and never writes an amount', () => {
    const f = <T,>(x: T) => deepFreeze(x);
    let d: Delivery = f({ ...dl({ team: ['Alice'] }), reception: { ...dl().reception, amount: 12000 } });
    d = f(checkMilestone(d, 'm1', { ok: false, by: A, at: at('2026-09-10', '09:00'), gapPhoto: 'photo:g-1-1' }));
    d = f(waiveMilestone(d, 'm1', 'Marc', 'Accord', at('2026-09-10', '09:30')));
    d = f(reopenMilestone(d, 'm1', A, at('2026-09-10', '09:40')));
    d = f(setMilestoneNa(addMilestone(moveMilestone(d, 'm2', -1), { label: 'Extra' }), 'm3', 'Sans objet', A, at('2026-09-12')));
    d = f(removeMilestone(d, d.milestones.at(-1)!.id!, A, at('2026-09-12')));
    d = f(allOk(d));
    d = f(setShipCheck(d, 'sc_0', true, A, at('2026-09-11', '07:00')));
    d = f(releaseDelivery(d, { by: 'Marc', at: at('2026-09-11', '16:00'), sign: ink }));
    d = f(linkMilestoneNc(d, 'm2', 'nc1'));
    d = f(setReceptionist(startReception(d, { at: at('2026-09-14', '14:00'), place: 'Chantier Nord' }), { name: 'M. Durand' }));
    d = f(setResult(d, 'reserve', at('2026-09-14', '14:30')));
    d = f(addReserve(d, { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }));
    const rid = reservesOf(d)[0].id;
    d = f(patchReserve(d, rid, { handler: 'Bruno' }, A, at('2026-09-15')));
    d = f(linkReserveNc(d, rid, 'nc2'));
    d = f(repairReserve(d, rid, { at: at('2026-09-16'), photo: 'photo:rep-1-1' }));
    d = f(lift(d, rid, { at: at('2026-09-17'), by: 'M. Durand', sign: ink }));
    d = f(signCompany(signClient(d, ink, at('2026-09-14', '14:40'), A), ink, at('2026-09-14', '14:41'), A));
    d = f(assignPvNo(st(), d, at('2026-09-14', '14:41')));
    d = f(correctLocked(d, { place: 'Quai 3', _why: 'Lieu' }, A, at('2026-09-18')));
    d = f(unreleaseDelivery(d, 'Marc', 'Reprise', at('2026-09-18')));
    d = f(archiveDelivery(d, at('2026-09-19'), 'Fin'));
    d = f(restoreDelivery(d, A, at('2026-09-20')));
    d = f(setReceptionist({ ...d, reception: { ...d.reception, result: '' } }, { name: 'X' }));
    expect(d.reception.amount).toBe(12000);
    expect(JSON.stringify(d.journal)).not.toMatch(/12000|€|factur/i);
    expect(d.journal?.length).toBeGreaterThan(20);
    f(duplicateDelivery(d)); f(upgradeDelivery(d)); f(takeLife(d, d)); f(nextPresentation({ ...d, reception: { ...d.reception, result: 'sans', qty: 2 } }, A, at('2026-09-21')));
    f(ncFromMilestone(st(), d, d.milestones[0], A));
    expect(deliveryState(d, now, P)).toBe('delivered');   // the walk ends on a delivery made, its result taken off, restored from the archive
  });
  it('writes facts, never orders: the reasons that stand in the way, the journal and the clause', () => {
    const verbs = 'commander traiter relancer faire verifier planifier appeler contacter prevoir remplacer reparer signaler controler lever prendre suivre mettre afficher recontacter surveiller corriger liberer signer attendre';
    const orders = 'commandez traitez relancez faites verifiez planifiez appelez contactez prevoyez remplacez reparez signalez controlez levez prenez suivez mettez affichez recontactez surveillez corrigez liberez signez attendez';
    const first = (t: string) => norm(t).split(/[\s']/)[0];
    const ko = checkMilestone(dl(), 'm2', { ok: false, by: A, at: at('2026-09-04', '09:00') });
    const lines = [
      ...canRelease(st(), ko).why, ...canRelease(st({ ncs: { nc1: { ...newNc(st(), A, now), id: 'nc1', ref: 'NC-2026-001' } } }), linkMilestoneNc(allOk(dl()), 'm2', 'nc1')).why,
      ...((): string[] => {
        let d = released();
        d = signClient(addReserve(received(d, '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14') }), ink, at('2026-09-14', '14:40'), A);
        d = lift(d, reservesOf(d)[0].id, { at: at('2026-09-16'), by: 'M. Durand' });
        d = setNoSign(setResult(dl(), 'sans', at('2026-09-14')), 'absent', 'Bruno', at('2026-09-14'), A);
        return (d.journal ?? []).map(l => l.text);
      })(),
      retentionFact({ ...dl(), reception: { ...dl().reception, retentionPct: 10 } }, { ...P, reception: { retention: { on: true, maxPct: 5 } } }),
    ];
    expect(lines.length).toBeGreaterThan(5);
    lines.forEach(t => { expect(orders.split(' ')).not.toContain(first(t)); expect(verbs.split(' ')).not.toContain(first(t)); expect(t).not.toMatch(/ne pas |facturation|solde|obligation|tout de suite|attend\b/i); });
  });
});

// ---- corrections after the review of the end of phase 2
// Received, then signed by the customer: the PV is locked
const lock = (d: Delivery, day = '2026-09-14') => signClient(received(d, day), ink, at(day, '14:40'), A);
// An order of 20 delivered in two times: the first delivery (10, with reservations, PV signed) is closed into the lots, the second is under way
const twoTimes = (reserves: { text: string; severity?: 'minor' | 'blocking' }[] = [{ text: 'Rayure' }]): Delivery => {
  let d = received(released(dl({ qty: 20 })), '2026-09-14', 'reserve');
  d = reserves.reduce<Delivery>((x, r) => addReserve(x, { ...r, by: A, at: at('2026-09-14', '14:35') }), { ...d, reception: { ...d.reception, qty: 10 } });
  return nextPresentation(signed(d), A, at('2026-09-15', '08:00'));
};

describe('3.4 the reservations of the closed deliveries stay followed', () => {
  it('reads the reservations of every delivery of the order with the number of its delivery; `reservesOf` stays the delivery under way', () => {
    const e = deepFreeze(twoTimes([{ text: 'Rayure' }, { text: 'Joint' }]));
    expect(reservesOf(e)).toEqual([]);
    expect(allReservesOf(e).map(r => [r.text, r.lotNo])).toEqual([['Rayure', 1], ['Joint', 1]]);
    expect(openReserves(e)).toHaveLength(2);
    const next = addReserve(received(allOk(e, '2026-09-16'), '2026-09-22', 'reserve'), { text: 'Étiquette', by: A, at: at('2026-09-22', '15:00') });
    expect(reservesOf(next).map(r => r.text)).toEqual(['Étiquette']);
    expect(allReservesOf(next).map(r => [r.text, r.lotNo])).toEqual([['Rayure', 1], ['Joint', 1], ['Étiquette', 2]]);
    expect(allReservesOf(dl())).toEqual([]);
    const second = nextPresentation({ ...signed(next), reception: { ...signed(next).reception, qty: 5 } }, A, at('2026-09-23'));
    expect(allReservesOf(second).map(r => r.lotNo)).toEqual([1, 1, 2]);   // the numbers of the closed deliveries stay
  });
  it('says the open reservations of a closed delivery in the state of the order, while the delivery under way goes on with its own', () => {
    const e = twoTimes();
    expect(currentState(e, now, P)).toBe('in_progress');
    expect(deliveryState(e, now, P)).toBe('reserve_late');   // 7 working days from the 14th ended on the 23rd
    expect(deliveryState(e, new Date(2026, 8, 23), P)).toBe('reserve');
    expect(deliveryState(allOk(e, '2026-09-16'), new Date(2026, 8, 23), P)).toBe('reserve');   // to release or released: the reservation comes first
    expect(deliveryState(refuse(arrived(e, '2026-09-22'), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-22'), A), now, P)).toBe('refused');   // a refusal of the delivery under way first
    expect(deliveryState(archiveDelivery(e, at('2026-09-20'), ''), now, P)).toBe('archived');
    const lifted = lift(e, allReservesOf(e)[0].id, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(deliveryState(lifted, now, P)).toBe('in_progress');
    expect(deliveryState(received(allOk(lifted, '2026-09-16'), '2026-09-22'), now, P)).toBe('accepted');   // the second delivery carries the 10 left
  });
  it('lifts a reservation of a closed delivery by its id, against the reception day of THAT delivery, and says which delivery in the journal', () => {
    const e = deepFreeze(twoTimes()), rid = allReservesOf(e)[0].id;
    expect(lift(e, rid, { at: at('2026-09-13', '23:00'), by: 'M. Durand' })).toBe(e);   // before the reception of the first delivery
    const l = lift(e, rid, { at: at('2026-09-16', '09:00'), by: 'M. Durand', note: 'Revu avec le client', photo: 'photo:l-1-1', sign: ink });   // the second one is not even delivered
    expect(lotsOf(l)[0].reception.reserves?.[0]).toMatchObject({ liftedAt: '2026-09-16', liftedBy: 'M. Durand', liftNote: 'Revu avec le client', liftPhoto: 'photo:l-1-1', liftSign: ink });
    expect(sp(lastLog(l))).toEqual({ at: '2026-09-16T09:00', by: 'M. Durand', text: 'Réserve « Rayure » levée enregistrée par M. Durand : Revu avec le client (livraison 1)', proof: true });
    expect(openReserves(l)).toEqual([]);
    expect(lift(l, rid, { at: at('2026-09-20'), by: 'Autre' })).toBe(l);   // already lifted
    expect(openReserves(e)).toHaveLength(1);   // the order given is not touched
    const later = received(allOk(e, '2026-09-16'), '2026-09-22');
    expect(openReserves(lift(later, rid, { at: at('2026-09-18'), by: 'M. Durand' }))).toEqual([]);   // compared with the day of its own delivery, not the one under way
    expect(lift(e, 'nope', { at: at('2026-09-16'), by: 'M. Durand' })).toBe(e);
    // a reservation of the delivery under way is found there first
    const both = addReserve(received(allOk(e, '2026-09-16'), '2026-09-22', 'reserve'), { text: 'Étiquette', by: A, at: at('2026-09-22', '15:00') }), mine = reservesOf(both)[0].id;
    expect(lift(both, mine, { at: at('2026-09-22', '16:00'), by: 'M. Durand' }).reception.reserves?.[0].liftedAt).toBe('2026-09-22');
    expect(sp(lastLog(lift(both, mine, { at: at('2026-09-22', '16:00'), by: 'M. Durand' }))?.text)).toBe('Réserve « Étiquette » levée enregistrée par M. Durand : Constaté sur place');   // no delivery number: the one under way
  });
  it('repairs, hands over, links and dates a reservation of a closed delivery; its text, photo, place and gravity are frozen, and it is never removed', () => {
    const e = deepFreeze(twoTimes()), rid = allReservesOf(e)[0].id;
    const rep = repairReserve(e, rid, { at: at('2026-09-16', '09:00'), by: 'Bruno', photo: 'photo:rep-1-1' });
    expect(lotsOf(rep)[0].reception.reserves?.[0]).toMatchObject({ repairedAt: '2026-09-16', repairPhoto: 'photo:rep-1-1', handler: 'Bruno' });
    expect(sp(lastLog(rep)?.text)).toBe('Reprise faite pour la réserve « Rayure » (livraison 1)');
    const pat = patchReserve(e, rid, { handler: 'Awa', dueAt: '2026-09-30', text: 'Réécrite', severity: 'blocking', where: 'Ailleurs', photo: 'photo:z-1-1' }, A, at('2026-09-16'), 'Pièce attendue');
    expect(lotsOf(pat)[0].reception.reserves?.[0]).toMatchObject({ text: 'Rayure', severity: 'minor', handler: 'Awa', dueAt: '2026-09-30' });
    ['where', 'photo'].forEach(k => expect(lotsOf(pat)[0].reception.reserves?.[0]).not.toHaveProperty(k));
    expect(sp(pat.journal?.slice(-2).map(l => l.text))).toEqual(['Réserve « Rayure » : prise en charge par Awa (livraison 1)', 'Réserve « Rayure » : échéance fixée au 30/09/2026 : Pièce attendue (livraison 1)']);
    expect(reserveDue(allReservesOf(pat)[0], pat, P)).toBe('2026-09-30');
    const lnk = linkReserveNc(e, rid, 'nc1', A, at('2026-09-16', '10:00'));
    expect(lotsOf(lnk)[0].reception.reserves?.[0].ncId).toBe('nc1');
    expect(sp(lastLog(lnk)?.text)).toBe('Défaut déclaré depuis la réserve « Rayure » (livraison 1)');
    expect(linkReserveNc(lnk, rid, 'nc2')).toBe(lnk);
    expect(removeReserve(e, rid)).toBe(e);   // a closed delivery is never changed
    expect(patchReserve(e, 'nope', { handler: 'Awa' })).toBe(e);
    const done = lift(e, rid, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(repairReserve(done, rid, { at: at('2026-09-17') })).toBe(done);   // a lifted one is not repaired
  });
  it('counts them in the nearest deadline and in the completeness of the sheet', () => {
    const e = twoTimes([{ text: 'Rayure' }, { text: 'Joint' }]), [a] = allReservesOf(e);
    expect(openReserves(e).map(r => reserveDue(r, e, P))).toEqual(['2026-09-23', '2026-09-23']);
    expect(completeness(e).missing.find(m => m.key === 'reserves')).toEqual({ key: 'reserves', label: '2 réserves non levées', tab: 'follow' });
    const l = lift(patchReserve(e, a.id, { dueAt: '2026-09-18' }, A, at('2026-09-15'), 'Accord du client'), a.id, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(openReserves(l).map(r => reserveDue(r, l, P))).toEqual(['2026-09-23']);   // the one lifted no longer counts
    expect(completeness(l).missing.find(m => m.key === 'reserves')?.label).toBe('1 réserve non levée');
  });
});

describe('3.4 a blocking reservation puts the reception off', () => {
  const rec = (...rs: { text: string; severity?: 'minor' | 'blocking' }[]) => rs.reduce((x, r) => addReserve(x, { ...r, by: A, at: at('2026-09-14', '14:35') }), received(released(dl({ qty: 10 })), '2026-09-14', 'reserve'));
  it('counts nothing as received while a blocking reservation is open; a minor one lets the delivery count', () => {
    const minor = rec({ text: 'Rayure' }), blocking = rec({ text: 'Fissure', severity: 'blocking' });
    expect(qtyReceived(minor)).toBe(10);
    expect(remainingQty(minor)).toBe(0);
    expect(qtyReceived(blocking)).toBe(0);
    expect(remainingQty(blocking)).toBe(10);
    expect(isSettled(blocking)).toBe(false);
    expect(receptionsOf(blocking)[0]).toMatchObject({ qty: 10, closed: true });
    expect(deliveryState(blocking, now, P)).toBe('reserve_late');   // still "Réserves": the reservation is open, and late
    expect(deliveryState(blocking, new Date(2026, 8, 16), P)).toBe('reserve');
    expect(qtyReceived(rec({ text: 'Rayure' }, { text: 'Fissure', severity: 'blocking' }))).toBe(0);   // the blocking one decides
    expect(qtyReceived(received(released(dl({ qty: 10 })), '2026-09-14', 'sans'))).toBe(10);   // no reservation at all
    expect(qtyReceived({ ...blocking, reception: { ...blocking.reception, result: 'sans' } })).toBe(10);   // only a reception "with reservations" is put off
  });
  it('counts the quantity once the blocking reservation is lifted, and the order is then settled', () => {
    const two = rec({ text: 'Fissure', severity: 'blocking' }, { text: 'Joint', severity: 'blocking' }), [first, second] = reservesOf(two);
    const one = lift(two, first.id, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(qtyReceived(one)).toBe(0);   // the second blocking one is still open
    const all = lift(one, second.id, { at: at('2026-09-17'), by: 'M. Durand' });
    expect(qtyReceived(all)).toBe(10);
    expect(remainingQty(all)).toBe(0);
    expect(isSettled(all)).toBe(true);
    expect(deliveryState(all, now, P)).toBe('lifted');
  });
  it('does the same for a closed delivery: its quantity is counted again when its blocking reservation is lifted there', () => {
    const e = twoTimes([{ text: 'Fissure', severity: 'blocking' }]), rid = allReservesOf(e)[0].id;
    expect(qtyReceived(e)).toBe(0);
    expect(remainingQty(e)).toBe(20);
    expect(receptionsOf(e).map(x => x.qty)).toEqual([10, 20]);   // the delivery under way carries the whole rest
    const l = lift(e, rid, { at: at('2026-09-16'), by: 'M. Durand' });
    expect(qtyReceived(l)).toBe(10);
    expect(remainingQty(l)).toBe(10);
    expect(receptionsOf(l).map(x => x.qty)).toEqual([10, 10]);
    expect(qtyReceived(twoTimes([{ text: 'Rayure' }]))).toBe(10);
  });
});

describe('3.4 a waived milestone counts as lifted at the release', () => {
  const ko = () => checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
  it('asks no second reason: the waiver is the decision, and the release says it as a fact', () => {
    expect(canRelease(st(), ko()).ok).toBe(false);
    const w = waiveMilestone(ko(), 'm2', 'Marc', 'Accord du client', at('2026-09-11', '09:00'));
    expect(canRelease(st(), w)).toEqual({ ok: true, why: [] });
    expect(sp(waivedFacts(w))).toEqual(['Jalon 2 « Étape 2 » dérogé par Marc : Accord du client']);
    expect(waivedFacts(ko())).toEqual([]);
    const r = releaseDelivery(w, { by: 'Bruno', at: at('2026-09-11', '16:00') });
    expect(r.releasedAt).toBe('2026-09-11');
    expect(sp(r.derogation)).toEqual({ by: 'Bruno', why: 'jalon 2 « Étape 2 » dérogé par Marc : Accord du client', at: '2026-09-11T16:00', sameAsControl: false });   // Bruno neither checked nor waived the milestone
    expect(sp(lastLog(r)?.text)).toBe('Libérée par Bruno par dérogation : jalon 2 « Étape 2 » dérogé par Marc : Accord du client');
    expect(deliveryState(r, now, P)).toBe('released');
    const g = releaseDelivery(w, { by: 'Bruno', at: at('2026-09-11', '16:00'), derogation: { why: 'Retouche à la pose' } });
    expect(g.derogation?.why).toBe('Retouche à la pose');
    expect(sp(lastLog(g)?.text)).toBe('Libérée par Bruno par dérogation : Retouche à la pose (jalon 2 « Étape 2 » dérogé par Marc : Accord du client)');
  });
  it('still stops at another milestone not conform, and at a defect without decision, even beside a waived one', () => {
    const w = waiveMilestone(ko(), 'm2', 'Marc', 'Accord du client', at('2026-09-11'));
    const two = checkMilestone(w, 'm3', { ok: false, by: A, at: at('2026-09-10') });
    expect(sp(canRelease(st(), two).why)).toEqual(['Jalon 3 « Étape 3 » non conforme depuis le 10/09/2026']);
    expect(releaseDelivery(two, { by: 'Bruno', at: at('2026-09-11') })).toBe(two);
    const linked = linkMilestoneNc(w, 'm2', 'nc1'), s = st({ ncs: { nc1: { ...newNc(st(), A, now), id: 'nc1', ref: 'NC-2026-001', decision: '' } } });
    expect(canRelease(s, linked).why).toEqual(['Défaut NC-2026-001 du jalon 2 sans décision']);
    expect(releaseDelivery(linked, { by: 'Bruno', at: at('2026-09-11') }, s)).toBe(linked);
    expect(releaseDelivery(allOk(dl()), { by: 'Bruno', at: at('2026-09-11') })).not.toHaveProperty('derogation');   // nothing waived, nothing in the way: no derogation
  });
});

describe('3.4 the lock of a signed PV is tight', () => {
  const notConform = () => checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
  it('keeps the whole reception of a locked order against a typed copy; an order not signed takes what was typed', () => {
    const typed = (): Delivery => ({ ...dl({ client: 'Client Z' }), reception: { ...dl().reception, name: 'Dupont', role: 'Autre', place: 'Hangar', email: 'dupont@exemple.fr', orgId: 'o9', contactId: 'c9', bl: 'BL-99' } });
    const content = { name: 'Martin', role: 'Conducteur', email: 'martin@exemple.fr', orgId: 'o1', contactId: 'c1', bl: 'BL-14' };
    const saved = lock(setReceptionist(released(), content)), out = takeLife(typed(), saved);
    expect(isLocked(saved)).toBe(true);
    expect(out.reception).toEqual(saved.reception);
    expect(out.reception).toMatchObject({ name: 'Martin', role: 'Conducteur', place: 'Chantier Nord', email: 'martin@exemple.fr', orgId: 'o1', contactId: 'c1', bl: 'BL-14', result: 'sans' });
    expect(out).toBe(saved);   // a locked PV is kept whole: the order too (its customer, its quantity, its promised day, its milestone definitions), whatever was typed
    expect(out.client).toBe('Client A');
    expect(isLocked(out)).toBe(true);
    const open = takeLife(typed(), received(setReceptionist(released(), content)));   // result given, not signed
    expect(isLocked(open)).toBe(false);
    expect(open.reception).toMatchObject({ name: 'Dupont', place: 'Hangar', email: 'dupont@exemple.fr', orgId: 'o9', contactId: 'c9', bl: 'BL-99', result: 'sans', date: '2026-09-14' });
    expect(takeLife(typed(), lock(released())).reception.name).toBe('');   // the empty name of a locked PV is not filled in from a copy
  });
  it('does nothing on the milestones, the checks before departure and the release once the PV is signed', () => {
    const d = lock(notConform()), at1 = at('2026-09-15');
    expect(isLocked(d)).toBe(true);
    expect(checkMilestone(d, 'm1', { ok: false, by: A, at: at1 })).toBe(d);
    expect(checkMilestone(d, 'm2', { ok: true, by: A, at: at1 })).toBe(d);
    expect(reopenMilestone(d, 'm1', A, at1)).toBe(d);
    expect(waiveMilestone(d, 'm2', 'Marc', 'Accord', at1)).toBe(d);
    expect(setMilestoneNa(d, 'm1', 'Sans objet', A, at('2026-09-12'))).toBe(d);
    expect(addMilestone(d, { label: 'Extra' })).toBe(d);
    expect(removeMilestone(d, 'm1', A, at('2026-09-12'))).toBe(d);
    expect(moveMilestone(d, 'm1', 1)).toBe(d);
    expect(setShipCheck(d, 'sc_0', true, A, at1)).toBe(d);
    expect(releaseDelivery(d, { by: 'Marc', at: at1, derogation: { why: 'Accord du client' } })).toBe(d);
    const r = lock(released());
    expect(unreleaseDelivery(r, 'Marc', 'Reprise', at1)).toBe(r);
    expect(reopenMilestone(r, 'm3', A, at1)).toBe(r);
    expect(r.releasedAt).toBe('2026-09-11');
    expect(setMilestoneNa(setMilestoneNa(r, 'm3', 'Sans objet', A, at('2026-09-12')), 'm3', null, A, at('2026-09-12'))).toBe(r);
    // a photo of the paper PV or the mention "absent" locks just the same
    const paper = setPvPhoto(received(notConform()), 'photo:pv-1-1', at('2026-09-14', '15:00'), A), absent = setNoSign(received(notConform()), 'absent', 'Bruno', at('2026-09-14', '15:00'), A);
    [paper, absent].forEach(x => { expect(isLocked(x)).toBe(true); expect(checkMilestone(x, 'm1', { ok: false, by: A, at: at1 })).toBe(x); expect(setShipCheck(x, 'sc_0', true, A, at1)).toBe(x); });
  });
  it('the same moves work before the signature, and again once the correction (with its reason) has taken the result back', () => {
    const open = received(notConform());   // result given, not signed
    expect(isLocked(open)).toBe(false);
    expect(reopenMilestone(open, 'm1', A, at('2026-09-15')).milestones[0].ok).toBeNull();
    expect(waiveMilestone(open, 'm2', 'Marc', 'Accord', at('2026-09-15')).milestones[1].waivedBy).toBe('Marc');
    expect(setShipCheck(open, 'sc_0', true, A, at('2026-09-15')).shipChecks?.[0].ok).toBe(true);
    const d = signClient(open, ink, at('2026-09-14', '14:40'), A), back = correctLocked(d, { result: '', _why: 'Résultat posé par erreur' }, A, at('2026-09-16'));
    expect(isLocked(back)).toBe(false);
    expect(reopenMilestone(back, 'm1', A, at('2026-09-16')).milestones[0].ok).toBeNull();
    expect(checkMilestone(back, 'm2', { ok: true, by: A, at: at('2026-09-16') }).milestones[1].ok).toBe(true);
  });
  it('keeps the delivery note number of a delivery: a content key, written with the person who receives, never carried to the next delivery nor a copy, corrected with a reason once locked', () => {
    const d = setReceptionist(dl(), { bl: 'BL-2026-118' });
    expect(d.reception.bl).toBe('BL-2026-118');
    expect(setReceptionist(d, { name: 'M. Durand' }).reception.bl).toBe('BL-2026-118');   // not given: it stays
    expect(setReceptionist(d, { bl: '' }).reception.bl).toBe('');
    const typed = takeLife({ ...d, reception: { ...d.reception, bl: 'BL-2026-120' } }, d);
    expect(typed.reception.bl).toBe('BL-2026-120');   // typed on a sheet not signed: written
    const l = lock(setReceptionist(released(), { bl: 'BL-2026-118', name: 'M. Durand' }));
    expect(setReceptionist(l, { bl: 'BL-2026-999' })).toBe(l);
    const c = correctLocked(l, { bl: 'BL-2026-119', _why: 'Numéro mal lu' }, A, at('2026-09-15'));
    expect(c.reception.bl).toBe('BL-2026-119');
    expect(sp(c.journal?.at(-2)?.text)).toBe('Corrigé : bon de livraison BL-2026-118 → BL-2026-119 (motif : Numéro mal lu)');
    const part = { ...l, reception: { ...l.reception, qty: 4 } };
    const n = nextPresentation(part, A, at('2026-09-15'));
    expect(n.reception).toMatchObject({ name: 'M. Durand', place: 'Chantier Nord' });
    expect(n.reception).not.toHaveProperty('bl');   // each delivery has its own note
    expect(lotsOf(n)[0].reception.bl).toBe('BL-2026-118');
    expect(duplicateDelivery(part).reception).not.toHaveProperty('bl');
    expect(duplicateDelivery(part).reception.name).toBe('M. Durand');
  });
});

describe('3.4 words of the tool in the glossary', () => {
  it('explains the milestone, the release, the reservation, its lift and the PV, one sentence each, as facts', () => {
    ['Jalon', 'Libération', 'Réserve', 'Levée', 'PV', 'Livraison', 'Réception', 'Plage attendue', 'Fiche', 'Fiche suiveuse'].forEach(w => {   // the ten words of the lexicon (A-13)
      const entry = GLOSSARY.find(([k]) => k === w);
      expect(entry, w).toBeTruthy();
      expect(entry![1]).toMatch(/\.$/);
      expect(entry![1].slice(0, -1)).not.toMatch(/[.!?]/);   // one sentence
      expect(entry![1]).not.toMatch(/€|\b(il faut|ne pas|doit|faites|vérifiez)\b/i);
    });
    expect(new Set(GLOSSARY.map(([k]) => k)).size).toBe(GLOSSARY.length);
  });
});

// ---- lot 0 "no more loss of data": what a stale sheet writes back, damaged records, ids that are names of Object.prototype, the quantity typed
describe('3.4 takeLife with the copy it started from: a typed copy writes only what it changed (D-10, S-1)', () => {
  // the sheet was opened on `base`; the full screens then wrote `saved` (the life of the order), the sheet types on top of `base`
  const base = () => dl({ qty: 20, milestones: ms().map((m, i) => (i === 0 ? { ...m, unit: 'mm', min: 1, max: 2, instrumentId: 'eq1' } : m)) });
  const lived = (d = base()) => {
    let x = setMilestoneNa(d, 'm2', 'Sans objet ici', A, at('2026-09-12'));
    x = checkMilestone(x, 'm1', { ok: true, by: A, at: at('2026-09-10'), measured: '1,5', instrumentId: 'eq9' });
    return setReceptionist(startReception(x, { at: at('2026-09-14'), place: 'Quai 3', by: A }), { name: 'Mme Dupont', role: 'Directrice', email: 'dupont@exemple.fr', orgId: 'o1', contactId: 'c1', bl: 'BL-77' });
  };
  it('keeps what the field screens wrote (not applicable, instrument, the person who receives, place, delivery note) when the sheet did not touch it', () => {
    const typed = base(), saved = lived();
    const out = takeLife({ ...structuredClone(typed), item: 'Renommé' }, saved, typed);
    expect(out.item).toBe('Renommé');
    expect(out.milestones[1]).toMatchObject({ na: true, naReason: 'Sans objet ici' });
    expect(out.milestones[0]).toMatchObject({ instrumentId: 'eq9', ok: true, measured: '1,5' });
    expect(out.reception).toMatchObject({ name: 'Mme Dupont', role: 'Directrice', email: 'dupont@exemple.fr', orgId: 'o1', contactId: 'c1', bl: 'BL-77', place: 'Quai 3', date: '2026-09-14' });
    // without the copy it started from, the typed copy still wins on those keys (the behaviour of the screens that do not pass it)
    const old = takeLife({ ...structuredClone(typed), item: 'Renommé' }, saved);
    expect(old.milestones[1].na).toBeUndefined();
    expect(old.reception.name).toBe('');
  });
  it('writes what the sheet changed, key by key: a definition, the place, a field of the order; the rest comes from the saved order', () => {
    const typed = base(), saved = lived();
    const edited: Delivery = {
      ...structuredClone(typed), client: 'Client Z',
      milestones: typed.milestones.map((m, i) => (i === 0 ? { ...m, label: 'Largeur', max: 3, instrumentId: undefined } : i === 1 ? { ...m, requirement: 'Exigence bis' } : m)),
      reception: { ...typed.reception, place: 'Hangar' },
    };
    const out = takeLife(edited, saved, typed);
    expect(out.client).toBe('Client Z');
    expect(out.milestones[0]).toMatchObject({ label: 'Largeur', max: 3, ok: true });
    expect(out.milestones[0]).not.toHaveProperty('instrumentId');   // typed: the instrument was taken off
    expect(out.milestones[1]).toMatchObject({ requirement: 'Exigence bis', na: true });
    expect(out.reception).toMatchObject({ place: 'Hangar', name: 'Mme Dupont', bl: 'BL-77' });
    // a field of the order changed elsewhere meanwhile (hosted copy) is kept when the sheet did not touch it
    const elsewhere = takeLife({ ...structuredClone(typed), client: 'Client Z' }, { ...saved, item: 'Changé ailleurs', qty: 25 }, typed);
    expect(elsewhere).toMatchObject({ client: 'Client Z', item: 'Changé ailleurs', qty: 25 });
  });
  it('does not carry a delivery note to the next delivery when the saved order no longer has one; the person who receives stays', () => {
    let d = received(released(dl({ qty: 20 })), '2026-09-14', 'sans');
    d = setReceptionist(d, { bl: 'BL-77', name: 'Martin' });
    d = signed({ ...d, reception: { ...d.reception, qty: 8 } });   // the PV is signed before the next delivery is opened (D-6)
    const stale = structuredClone(d), next = nextPresentation(d, A, at('2026-09-15'));
    expect(next.reception.bl).toBeUndefined();
    expect(takeLife(structuredClone(stale), next, stale).reception).toMatchObject({ name: 'Martin' });
    expect(takeLife(structuredClone(stale), next, stale).reception).not.toHaveProperty('bl');
    expect(takeLife(structuredClone(stale), next).reception.bl).toBe('BL-77');   // the old behaviour, without the copy it started from
  });
  it('keeps a milestone the sheet added, never takes life of another order, and still keeps the whole reception of a signed PV', () => {
    const typed = base(), saved = lived();
    const added = takeLife({ ...structuredClone(typed), milestones: [...typed.milestones, { ...ms(1)[0], id: 'm9', label: 'Ajouté' }] }, saved, typed);
    expect(added.milestones.map(m => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm9']);
    expect(added.milestones[4]).toMatchObject({ label: 'Ajouté', ok: null });
    const l = lock(setReceptionist(released(), { name: 'Martin', bl: 'BL-14' }));
    const staleTyped = { ...dl(), reception: { ...dl().reception, place: 'Hangar' } };
    expect(takeLife(staleTyped, l, dl()).reception).toEqual(l.reception);
    LIFE_KEYS.forEach(k => expect(takeLife(base(), saved, base())[k]).toEqual(saved[k]));
  });
});

describe('3.4 the quantity typed (T-5)', () => {
  const cases: [string, number | null | undefined][] = [
    ['12', 12], ['1 250', 1250], ['1\u00a0250', 1250], ['1\u202f250', 1250], ['1 250,5', 1250.5], ['5 000', 5000], ['1,5', 1.5], ['1.5', 1.5], [' 7 ', 7], ['12 ', 12], ['0', 0],
    ['', null], ['   ', null],
    ['12 pièces', undefined], ['-5', undefined], ['1,2,3', undefined], ['1e3', undefined], ['0x10', undefined], ['abc', undefined], ['∞', undefined], ['1/2', undefined], ['Infinity', undefined], ['+5', undefined], [',5', undefined], ['5,', undefined],
  ];
  it.each(cases)('reads %j as %j: spaces and the French comma accepted, empty is empty, anything else is invalid', (text, expected) => {
    expect(parseQty(text)).toBe(expected);
  });
});

describe('3.4 an order read from outside never stops the tool (D-19, S-11)', () => {
  const good = () => received(released(dl({ qty: 20, team: ['Alice'] })), '2026-09-14', 'reserve');
  const damaged = (patch: Record<string, unknown>) => ({ ...good(), ...patch }) as unknown as Delivery;
  const bad: [string, Record<string, unknown>][] = [
    ['no milestones', { milestones: undefined }], ['null milestones', { milestones: null }], ['milestones as a text', { milestones: 'x' }], ['milestones as an object', { milestones: { a: 1 } }],
    ['a null among the milestones', { milestones: [null, 3, 'x', ...ms(2)] }], ['a milestone without text', { milestones: [{ ok: false }, { id: 'm2' }] }],
    ['no reception', { reception: undefined }], ['null reception', { reception: null }], ['reception as a text', { reception: 'x' }], ['reception without name or result', { reception: { date: '2026-09-14' } }],
    ['reception with numbers where texts are', { reception: { date: 5, name: 7, role: null, result: 3, reserve: 9 } }],
    ['lots as a text', { lots: 'x' }], ['null lots', { lots: null }], ['lots with holes', { lots: [null, { no: 1 }, { id: 'lt', no: 2, milestones: null, reception: 'x' }] }],
    ['journal as a text', { journal: 'x' }], ['null journal', { journal: null }], ['journal as an object', { journal: { at: 'x' } }],
    ['shipChecks as a text', { shipChecks: 'x' }], ['null shipChecks', { shipChecks: null }], ['shipChecks with holes', { shipChecks: [null, { id: 'a' }] }],
    ['no texts on the order', { ref: undefined, client: null, item: 5, releasedBy: undefined, releasedAt: null }], ['signatures that are not drawings', { signClient: 'x', signCompany: [null, 3], releaseSign: {} }],
    ['reserves that are not records', { reception: { ...good().reception, reserves: ['x', null, { id: 'rv', text: 4 }] } }], ['history that is not a list', { milestones: ms().map(m => ({ ...m, history: 'x' })) }],
  ];
  it.each(bad)('reads %s: it gets the shape the screens read, and reading it twice changes nothing', (_, patch) => {
    const u = upgradeDelivery(damaged(patch));
    expect(Array.isArray(u.milestones)).toBe(true);
    expect(typeof u.reception).toBe('object');
    expect(typeof u.reception.name).toBe('string');
    [u.ref, u.client, u.item, u.releasedBy, u.releasedAt].forEach(t => expect(typeof t).toBe('string'));
    expect(Array.isArray(u.lots ?? [])).toBe(true);
    expect(Array.isArray(u.journal ?? [])).toBe(true);
    expect(Array.isArray(u.shipChecks ?? [])).toBe(true);
    expect(upgradeDelivery(u)).toEqual(u);
    // every reading of the domain works on it
    const s = st({ deliveries: { [u.id]: u } });
    [deliveryState, currentState, completeness, lostByDeleting, canDelete, milestoneProgress, openReserves, allReservesOf, qtyReceived, remainingQty, isLocked, pvSigned, receptionsOf].forEach(f => expect(() => (f as (x: Delivery) => unknown)(u), f.name).not.toThrow());
    expect(() => canRelease(s, u)).not.toThrow();
    expect(() => takeLife(u, u, u)).not.toThrow();
    expect(() => duplicateDelivery(u)).not.toThrow();
    expect(() => pvNumber(s, 2026)).not.toThrow();
  });
  it('keeps what is sound in a damaged order and adds nothing to a sound one', () => {
    const u = upgradeDelivery(damaged({ milestones: [null, ...ms(2)], journal: 'x', lots: 'x' }));
    expect(u.milestones.map(m => m.id)).toEqual(['m1', 'm2']);
    expect(u).not.toHaveProperty('lots');
    expect(u).not.toHaveProperty('journal');
    expect(u.reception.result).toBe('reserve');
    const sound = good();
    expect(upgradeDelivery(sound)).toEqual(sound);
    expect(upgradeDelivery(upgradeDelivery(legacy()))).toEqual(upgradeDelivery(legacy()));
  });
  it('gives an order without milestones and without reception the blank ones, and keeps the rest', () => {
    const u = upgradeDelivery({ id: 'x', ref: 'C-1', client: 'A', item: 'B', qty: 3, releasedBy: '', releasedAt: '' } as unknown as Delivery);
    expect(u).toMatchObject({ id: 'x', ref: 'C-1', milestones: [], reception: { date: '', name: '', role: '', result: '', reserve: '' } });
    expect(deliveryState(u, now, P)).toBe('to_release');   // no milestone stands in the way
  });
});

describe('3.4 ids that are names of Object.prototype read nothing (S-12)', () => {
  const names = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
  it.each(names)('%s is not a defect nor a quote', n => {
    expect(ncOf(st(), n)).toBeUndefined();
    expect(deliveryFromQuote(st(), n)).toMatchObject({ client: '', item: '' });
    expect(deliveryFromQuote(st(), n)).not.toHaveProperty('quoteId');
    const d = linkMilestoneNc(dl(), 'm1', n);
    expect(sp(canRelease(st(), d).why)).toEqual(['Jalon 1 « Étape 1 » à contrôler', 'Jalon 2 « Étape 2 » à contrôler', 'Jalon 3 « Étape 3 » à contrôler', 'Jalon 4 « Étape 4 » à contrôler']);
  });
  it('still reads a real defect and a real quote by their id', () => {
    const nc = { ...newNc(st(), A), id: 'nc1', ref: 'NC-2026-001' }, q = { ...newQuote(st(), now), id: 'q1', client: 'Client Q', object: 'Objet Q' };
    expect(ncOf(st({ ncs: { nc1: nc } }), 'nc1')).toBe(nc);
    expect(ncOf(st({ ncs: { nc1: nc } }), 'nc2')).toBeUndefined();
    expect(deliveryFromQuote(st({ quotes: { q1: q } }), 'q1')).toMatchObject({ quoteId: 'q1', client: 'Client Q', item: 'Objet Q' });
  });
});

// ---- lot 1 "the PV signed tells the truth and is not rewritten": the lock of the whole content, the seal, the persons, the proof lines, the signing, the clock, the lifts and the deadlines
describe('3.4 lot 1: the lock covers everything the PV prints (D-1, G-1)', () => {
  const lockedOrder = () => lock(released(dl({ promisedAt: '2026-09-10', milestones: ms().map((m, i) => (i === 0 ? { ...m, unit: 'mm', min: 10, max: 12 } : m)) })));
  it('keeps the saved order whole against any typed copy: customer, number, object, quantity, promised day, milestone definitions (the proof t24 and p1)', () => {
    const saved = lockedOrder();
    const typed: Delivery = { ...saved, client: 'Autre client', ref: 'CMD-999', item: 'Autre', qty: 3, promisedAt: '2026-09-20', lot: 'L9', milestones: saved.milestones.map(m => ({ ...m, max: 11, requirement: '10 à 11 mm' })), team: ['Zoé'] };
    expect(takeLife(typed, saved)).toBe(saved);
    expect(takeLife(typed, saved, saved)).toBe(saved);
    expect(saved).toMatchObject({ client: 'Client A', ref: 'CMD-1', qty: 10, promisedAt: '2026-09-10' });
    expect(saved.milestones[0]).toMatchObject({ requirement: 'Exigence 1', max: 12 });
    expect(takeLife(typed, undefined)).toBe(typed);   // a new order is written as typed
    expect(takeLife(typed, { ...saved, reception: { ...saved.reception, signedAt: undefined, noSign: undefined }, signClient: undefined })).not.toBe(saved);   // not signed: typed again
  });
  it('corrects the order and a milestone definition with a reason and a person: one proof line with the old and the new values, a new seal; the saved PV is the only way', () => {
    const d = lockedOrder(), when = at('2026-09-16', '09:00');
    const c = correctLocked(d, { _why: 'Erreur de saisie', order: { client: 'Client B', qty: 12, promisedAt: '2026-09-12' }, milestone: { id: 'm1', fields: { requirement: '10 à 11 mm', max: 11 } } }, A, when);
    expect(c).toMatchObject({ client: 'Client B', qty: 12, promisedAt: '2026-09-12' });
    expect(c.milestones[0]).toMatchObject({ requirement: '10 à 11 mm', max: 11, min: 10 });
    expect(sp(c.journal?.at(-2))).toEqual({
      at: when, by: A, proof: true,
      text: 'Corrigé : client Client A → Client B ; quantité commandée 10 → 12 ; date promise 2026-09-10 → 2026-09-12 ; jalon 1 « Étape 1 » : exigence Exigence 1 → 10 à 11 mm ; jalon 1 « Étape 1 » : maxi 12 → 11 (motif : Erreur de saisie)',
    });
    expect(c.reception.seals).toHaveLength(2);
    expect(c.reception.seals?.[1]).toMatchObject({ at: when, by: A, why: 'correction : Erreur de saisie' });
    expect(sealState(c)).toBe('intact');
    expect(c.reception.seals?.[0]).toEqual(d.reception.seals?.[0]);   // the first seal stays
    expect(d.client).toBe('Client A');   // the order given is not touched
    // a value that is the same changes nothing
    expect(correctLocked(d, { _why: 'Rien', order: { client: 'Client A' }, milestone: { id: 'm1', fields: { max: 12 } } }, A, when)).toBe(d);
  });
  it('refuses what would make an incoherent PV: no reason, no person, a result that does not fit, the reservations, an amount, the seals, a milestone that does not exist, a value that is not a number', () => {
    const d = lockedOrder(), w = at('2026-09-16');
    expect(correctLocked(d, { _why: ' ', order: { client: 'B' } }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', order: { client: 'B' } }, ' ', w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', result: 'refus' }, A, w)).toBe(d);   // a refusal without its motive (t14)
    expect(correctLocked(d, { _why: 'x', result: 'refus', refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' } }, A, w).reception.result).toBe('refus');   // with it: accepted
    const open = lock(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }));
    expect(correctLocked(open, { _why: 'x', result: 'sans' }, A, w)).toBe(open);   // "without reservation" with a reservation open (t14)
    expect(correctLocked(d, { _why: 'x', reserves: [] }, A, w)).toBe(d);   // the reservations are erased only by their own moves (t14)
    expect(correctLocked(d, { _why: 'x', amount: 5 }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', seals: [] }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', milestone: { id: 'nope', fields: { label: 'Autre' } } }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', milestone: { id: 'm1', fields: { min: Number.NaN } } }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', order: { qty: Number.NaN } }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', order: { client: 5 as unknown as string } }, A, w)).toBe(d);
    expect(correctLocked(d, { _why: 'x', order: { qty: null } }, A, w).qty).toBeNull();   // an empty quantity is allowed
  });
  it('freezes the promised day: it moves only with a correction that leaves a line (the indicator of the dashboard cannot be inflated, G-18)', () => {
    const d = lockedOrder();
    expect(takeLife({ ...d, promisedAt: '2026-09-30' }, d).promisedAt).toBe('2026-09-10');
    const c = correctLocked(d, { _why: 'Date mal lue', order: { promisedAt: '2026-09-15' } }, A, at('2026-09-16'));
    expect(c.promisedAt).toBe('2026-09-15');
    expect(sp(c.journal?.at(-2)?.text)).toBe('Corrigé : date promise 2026-09-10 → 2026-09-15 (motif : Date mal lue)');
  });
});

describe('3.4 lot 1: the seal (G-2)', () => {
  const sealed = () => signed(received(released(dl({ promisedAt: '2026-09-10' }))));
  it('is laid when the PV locks, never before: the signature, the mention absent, the photo of the paper PV, or the result given after the signature', () => {
    const r = received(released());
    expect(sealState(r)).toBe('none');
    expect(sealState(signed(arrived(dl())))).toBe('none');   // signed, no result yet: not locked, no seal
    const d = signed(r), hash = d.reception.seals![0].hash;
    expect(d.reception.seals).toEqual([{ hash, at: at('2026-09-14', '14:40'), by: A }]);
    expect(hash).toBe(sealOf(d));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(shortSeal(hash)).toBe(`${hash.slice(0, 4)} ${hash.slice(4, 8)} ${hash.slice(8, 12)}`);
    expect(sealState(d)).toBe('intact');
    expect(sp(lastLog(d))).toEqual({ at: at('2026-09-14', '14:40'), by: A, text: `Scellé SHA-256 posé : ${shortSeal(hash)}`, proof: true });
    [setNoSign(r, 'absent', 'Bruno', at('2026-09-14', '15:00'), A), setPvPhoto(r, 'photo:pv-1-1', at('2026-09-14', '15:00'), A), setResult(signed(arrived(dl())), 'sans', at('2026-09-14', '14:50'), A)].forEach(x => {
      expect(x.reception.seals, JSON.stringify(x.reception.noSign ?? x.pvPhoto ?? x.reception.result)).toHaveLength(1);
      expect(sealState(x)).toBe('intact');
    });
    expect(sealOf(sealed())).toBe(sealOf(sealed()));   // the same content is the same seal
  });
  it('says "modified" after any write that does not go through a correction (console, localStorage, restore of a backup): the customer, the quantity, a definition, a name, a signature, a moment (the proof b4)', () => {
    const d = sealed();
    expect(sealState(d)).toBe('intact');
    const other: Strokes = [[[1, 1], [50, 60], [90, 10], [130, 70], [200, 20]]];
    const tampered: Delivery[] = [
      { ...d, client: 'Autre client' }, { ...d, ref: 'CMD-X' }, { ...d, qty: 3 }, { ...d, promisedAt: '2026-09-30' },
      { ...d, milestones: d.milestones.map((m, i) => (i === 0 ? { ...m, requirement: 'Autre exigence' } : m)) }, { ...d, milestones: d.milestones.map((m, i) => (i === 1 ? { ...m, ok: false } : m)) },
      { ...d, reception: { ...d.reception, name: "Quelqu'un d'autre" } }, { ...d, reception: { ...d.reception, signedAt: '2026-09-01T08:00' } }, { ...d, reception: { ...d.reception, result: 'reserve' } },
      { ...d, signClient: other }, { ...d, releasedBy: 'Paul' }, { ...d, releasedAt: '2026-09-01' }, { ...d, reception: { ...d.reception, reserves: [{ id: 'rv_x', text: 'Ajoutée', raisedAt: '2026-09-14' }] } },
    ];
    tampered.forEach((x, i) => expect(sealState(x), String(i)).toBe('modified'));
    expect(sealState({ ...d, journal: [] })).toBe('intact');   // the journal is not part of the seal (it grows)
    expect(sealState({ ...d, reception: { ...d.reception, seals: [{ hash: 'ab'.repeat(32), at: d.reception.seals![0].at, by: A }] } })).toBe('modified');
    expect(sealState({ ...d, reception: { ...d.reception, seals: {} as never } })).toBe('none');   // a damaged list is not a seal
    expect(sealContent(d)).toBe(sealContent({ ...d, journal: [{ at: 'x', by: 'y', text: 'z' }] }));
  });
  it('keeps the follow-up out of the seal: a reservation lifted, repaired or taken in charge after the PV, a defect declared, still "intact"', () => {
    const base = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    const d = signed(base), rid = reservesOf(d)[0].id;
    const followed = lift(repairReserve(patchReserve(d, rid, { handler: 'Bruno' }, A, at('2026-09-15')), rid, { at: at('2026-09-16'), by: 'Bruno', photo: 'photo:rep-1-1' }), rid, { at: at('2026-09-17'), by: 'M. Durand', photo: 'photo:l-1-1', sign: ink });
    expect(reservesOf(followed)[0]).toMatchObject({ handler: 'Bruno', repairedAt: '2026-09-16', liftedAt: '2026-09-17' });
    expect(sealState(followed)).toBe('intact');
    expect(sealState(linkMilestoneNc(d, 'm2', 'nc1', A, at('2026-09-15')))).toBe('intact');
    expect(sealState({ ...d, reception: { ...d.reception, reserves: [{ ...reservesOf(d)[0], text: 'Réécrite' }] } })).toBe('modified');   // what was written on the PV is
  });
  it('is laid again with a person after the moves that change what is sealed: the company signs after the customer, the number of the PV is given late, a photo is added after the signature', () => {
    const d = signed(received(released()));
    const c = signCompany(d, ink, at('2026-09-14', '14:45'), 'Marc');
    expect(c.reception.seals).toHaveLength(2);
    expect(c.reception.seals?.[1]).toMatchObject({ by: 'Marc', why: "signature de l'entreprise" });
    expect(sealState(c)).toBe('intact');
    const n = assignPvNo(st(), c, at('2026-09-14', '14:50'));
    expect(n.reception.pvNo).toBe('PV-2026-001');
    expect(n.reception.seals).toHaveLength(3);
    expect(sealState(n)).toBe('intact');
    const p = setPvPhoto(n, 'photo:pv-1-1', at('2026-09-15', '08:00'), A);
    expect(p.journal?.map(l => l.text)).toContain('Photo du PV papier signé ajoutée après la signature');
    expect(p.reception.seals?.at(-1)?.why).toBe('photo du PV papier ajoutée après la signature');
    expect(sealState(p)).toBe('intact');
    // the company signs BEFORE the customer: a single seal, which covers it
    const first = signed(signCompany(received(released()), ink, at('2026-09-14', '14:35'), 'Marc'));
    expect(first.reception.seals).toHaveLength(1);
    expect(sealState(first)).toBe('intact');
    // a PV that is not intact is not sealed again by a follow-up move: the difference stays visible
    const bad = { ...d, client: 'Autre client' };
    expect(signCompany(bad, ink, at('2026-09-14', '14:45'), 'Marc').reception.seals).toHaveLength(1);
    expect(sealState(signCompany(bad, ink, at('2026-09-14', '14:45'), 'Marc'))).toBe('modified');
  });
  it('lays a new seal after a correction even on a PV whose content no longer matched, and says it as a fact', () => {
    const d = sealed(), tampered = { ...d, reception: { ...d.reception, name: 'Autre' } };
    expect(sealState(tampered)).toBe('modified');
    const c = correctLocked(tampered, { _why: 'Remise en ordre', place: 'Quai 3' }, A, at('2026-09-16'));
    expect(c.reception.seals).toHaveLength(2);
    expect(c.reception.seals?.[1].why).toBe('correction : Remise en ordre ; le contenu ne correspondait plus au scellé précédent');
    expect(sealState(c)).toBe('intact');
    expect(sealState(correctLocked(d, { _why: 'Lieu', place: 'Quai 3' }, A, at('2026-09-16')))).toBe('intact');
  });
  it('keeps the seal of a closed delivery in its lot and starts the next delivery without one', () => {
    const l = nextPresentation({ ...received(released(dl({ qty: 10 }))), reception: { ...received(released(dl({ qty: 10 }))).reception, qty: 4 } }, A, at('2026-09-15'));
    expect(sealState(l)).toBe('none');
    const first = signed({ ...received(released(dl({ qty: 10 }))), reception: { ...received(released(dl({ qty: 10 }))).reception, qty: 4 } });
    const n = nextPresentation(first, A, at('2026-09-15'));
    expect(lotsOf(n)[0].reception.seals).toEqual(first.reception.seals);
    expect(n.reception).not.toHaveProperty('seals');
    expect(sealState(n)).toBe('none');
    const again = signed(received(released(n, '2026-09-16'), '2026-09-20'), '2026-09-20');
    expect(again.reception.seals).toHaveLength(1);
    expect(sealContent(again)).toContain(lotsOf(again)[0].id);   // the closed deliveries are part of what it seals
  });
});

describe('3.4 lot 1: the journal keeps the proof (D-13, G-11)', () => {
  it('never drops a proof line, whatever the number of lines of noise after it (400 gestures)', () => {
    let d = signCompany(signed(received(released())), ink, at('2026-09-14', '14:45'), 'Marc');
    const proofs = d.journal!.filter(l => l.proof).map(l => l.text);
    expect(sp(proofs)).toEqual(['Libérée par Marc', 'PV signé par le client', `Scellé SHA-256 posé : ${shortSeal(d.reception.seals![0].hash)}`, "PV signé pour l'entreprise", `Scellé SHA-256 posé : ${shortSeal(d.reception.seals![1].hash)} (signature de l'entreprise)`]);
    for (let i = 0; i < 400; i++) d = logDelivery(d, A, at('2026-09-15'), `bruit ${i}`);
    d = correctLocked(d, { place: 'Quai 3', _why: 'Lieu' }, A, at('2026-09-16'));
    for (let i = 0; i < 400; i++) d = logDelivery(d, A, at('2026-09-17'), `autre bruit ${i}`);
    expect(d.journal!.filter(l => !l.proof)).toHaveLength(300);
    expect(sp(d.journal!.filter(l => l.proof).map(l => l.text))).toEqual([...sp(proofs), expect.stringMatching(/^Corrigé : lieu/), expect.stringMatching(/^Scellé SHA-256 posé/)]);
    expect(d.journal!.at(-1)?.text).toBe('autre bruit 399');
    expect(d.journal!.find(l => l.text === 'bruit 0')).toBeUndefined();   // the noise goes, oldest first
    expect(d.journal!.map(l => l.at)).toEqual([...d.journal!.map(l => l.at)].sort());   // and the order of the lines is kept
    expect(logDelivery(dl(), A, at('2026-09-10'), 'x', true).journal).toEqual([{ at: at('2026-09-10'), by: A, text: 'x', proof: true }]);
    expect(logDelivery(dl(), A, at('2026-09-10'), 'x').journal).toEqual([{ at: at('2026-09-10'), by: A, text: 'x' }]);   // a line of noise has no mark
  });
  it('writes the signature, the release, the derogation, the lift, the refusal, the correction and the seal as proof lines, and a check or a ship check as noise', () => {
    const ko = checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
    const w = waiveMilestone(ko, 'm2', 'Marc', 'Accord', at('2026-09-11'));
    expect(ko.journal?.at(-1)?.proof).toBeUndefined();
    expect(w.journal?.at(-1)?.proof).toBe(true);
    expect(setShipCheck(dl(), 'sc_0', true, A, at('2026-09-11')).journal?.at(-1)?.proof).toBeUndefined();
    expect(reopenMilestone(allOk(dl()), 'm1', A, at('2026-09-12')).journal?.at(-1)?.proof).toBe(true);
    expect(refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), A).journal?.at(-1)?.proof).toBe(true);
  });
});

describe('3.4 lot 1: a gesture of proof carries a person (D-11, G-8)', () => {
  const rv = () => addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
  const kod = () => checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
  const gestures: [string, Delivery, (d: Delivery, by: string) => Delivery][] = [
    ['checkMilestone', dl(), (d, by) => checkMilestone(d, 'm1', { ok: true, by, at: at('2026-09-10') })],
    ['reopenMilestone', allOk(dl()), (d, by) => reopenMilestone(d, 'm1', by, at('2026-09-12'))],
    ['waiveMilestone', kod(), (d, by) => waiveMilestone(d, 'm2', by, 'Accord du client', at('2026-09-11'))],
    ['setMilestoneNa', dl(), (d, by) => setMilestoneNa(d, 'm3', 'Sans objet', by, at('2026-09-12'))],
    ['removeMilestone', dl(), (d, by) => removeMilestone(d, 'm4', by, at('2026-09-12'))],
    ['releaseDelivery', allOk(dl()), (d, by) => releaseDelivery(d, { by, at: at('2026-09-11', '16:00') })],
    ['unreleaseDelivery', released(), (d, by) => unreleaseDelivery(d, by, 'Reprise', at('2026-09-12'))],
    ['liftReserve', rv(), (d, by) => liftReserve(d, reservesOf(d)[0].id, { at: at('2026-09-15'), by, note: 'Revu', now: at('2026-09-15') })],
    ['refuse', arrived(released()), (d, by) => refuse(d, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), by)],
    ['signClient', received(released()), (d, by) => signClient(d, ink, at('2026-09-14', '14:40'), by)],
    ['signCompany', received(released()), (d, by) => signCompany(d, ink, at('2026-09-14', '14:41'), by)],
    ['setNoSign', received(released()), (d, by) => setNoSign(d, 'absent', 'Bruno', at('2026-09-14', '15:00'), by)],
    ['setPvPhoto', received(released()), (d, by) => setPvPhoto(d, 'photo:pv-1-1', at('2026-09-14', '15:00'), by)],
    ['correctLocked', lock(released()), (d, by) => correctLocked(d, { place: 'Quai 3', _why: 'Lieu' }, by, at('2026-09-15'))],
  ];
  it.each(gestures)('%s: an empty person changes nothing, a person does', (_name, base, f) => {
    expect(f(base, '')).toBe(base);
    expect(f(base, '   ')).toBe(base);
    const out = f(base, A);
    expect(out).not.toBe(base);
    expect(out.journal!.length).toBeGreaterThan(base.journal?.length ?? 0);
    expect(out.journal!.at(-1)!.by === A || out.journal!.at(-2)!.by === A).toBe(true);
  });
  it('never throws when the person or the reason is missing altogether (a caller that forgot it): the order comes back as it was', () => {
    const u = undefined as unknown as string, d = dl();
    const calls = [
      () => checkMilestone(d, 'm1', { ok: true, by: u, at: 'x' }), () => reopenMilestone(d, 'm1', u, 'x'), () => waiveMilestone(d, 'm1', u, u, 'x'), () => setMilestoneNa(d, 'm1', u, u, 'x'), () => removeMilestone(d, 'm1', u, 'x'),
      () => releaseDelivery(d, { by: u, at: 'x' }), () => unreleaseDelivery(d, u, u, 'x'), () => liftReserve(d, 'r', { at: 'x', by: u }), () => refuse(d, { reason: u, next: u }, 'x', u), () => signClient(d, u as unknown as Strokes, 'x', u),
      () => signCompany(d, ink, 'x', u), () => setNoSign(d, 'absent', u, 'x', u), () => setPvPhoto(d, 'p', 'x', u), () => correctLocked(d, { _why: u }, u, 'x'), () => signWaiver(d, u, u, 'x'), () => patchReserve(d, 'r', { dueAt: 'x' }, u, 'x', u),
    ];
    calls.forEach((f, i) => expect(f(), String(i)).toBe(d));
  });
  it('asks for the words of a refusal: "Autre" says what it is (the motive and what follows)', () => {
    const d = arrived(released());
    expect(refuse(d, { reason: OTHER, next: 'À remplacer' }, at('2026-09-14'), A)).toBe(d);
    expect(refuse(d, { reason: OTHER, other: ' ', next: 'À remplacer' }, at('2026-09-14'), A)).toBe(d);
    expect(refuse(d, { reason: 'Quantité incorrecte', next: OTHER }, at('2026-09-14'), A)).toBe(d);
    expect(refuse(d, { reason: OTHER, other: 'Teinte', next: OTHER, nextOther: 'À voir' }, at('2026-09-14'), A).reception.result).toBe('refus');
  });
});

describe('3.4 lot 1: a milestone set aside or withdrawn leaves a trace and no way around the release (D-2, L-6, G-12)', () => {
  const ko = () => checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: A, at: at('2026-09-10') });
  it('refuses "not applicable" for a milestone that is not conform and not waived, and asks for a reason; the proof t7b no longer opens the release', () => {
    const d = ko();
    expect(setMilestoneNa(d, 'm2', 'Sans objet', A, at('2026-09-12'))).toBe(d);
    expect(setMilestoneNa(d, 'm2', '', A, at('2026-09-12'))).toBe(d);
    expect(canRelease(st(), d).ok).toBe(false);
    const empty = dl();
    expect(setMilestoneNa(empty, 'm3', '  ', A, at('2026-09-12'))).toBe(empty);
    expect(setMilestoneNa(empty, 'nope', 'Sans objet', A, at('2026-09-12'))).toBe(empty);
  });
  it('writes who, when, why and the last state in the journal, and a replay changes nothing', () => {
    const w = waiveMilestone(ko(), 'm2', 'Marc', 'Accord du client', at('2026-09-11'));
    const na = setMilestoneNa(w, 'm2', 'Pièce non livrée', A, at('2026-09-12', '08:00'));
    expect(na.milestones[1]).toMatchObject({ na: true, naReason: 'Pièce non livrée' });
    expect(sp(na.journal?.at(-1))).toEqual({ at: at('2026-09-12', '08:00'), by: A, proof: true, text: 'Jalon 2 « Étape 2 » sans objet : Pièce non livrée (état précédent : non conforme, dérogé, par Alice le 10/09/2026)' });
    expect(setMilestoneNa(na, 'm2', 'Pièce non livrée', A, at('2026-09-12', '09:00'))).toBe(na);   // done twice, nothing more
    expect(setMilestoneNa(na, 'm2', 'Autre raison', A, at('2026-09-12', '09:00')).milestones[1].naReason).toBe('Autre raison');
    const back = setMilestoneNa(na, 'm2', null, A, at('2026-09-13'));
    expect(back.milestones[1]).not.toHaveProperty('na');
    expect(sp(back.journal?.at(-1)?.text)).toMatch(/^Jalon 2 « Étape 2 » rendu applicable \(état : /);
    expect(setMilestoneNa(back, 'm2', null, A, at('2026-09-13'))).toBe(back);   // not set aside: nothing to undo
  });
  it('undoes the release made while a milestone was set aside, when it is applicable again and still to check', () => {
    const r = releaseDelivery(allOk(setMilestoneNa(dl(), 'm4', 'Sans objet', A, at('2026-09-09'))), { by: 'Marc', at: at('2026-09-11', '16:00') });
    expect(r.releasedAt).toBe('2026-09-11');
    const back = setMilestoneNa(r, 'm4', null, A, at('2026-09-12'));
    expect(back).toMatchObject({ releasedAt: '', releasedBy: '' });
    expect(sp(back.journal?.map(l => l.text))).toContain('Libération défaite : jalon 4 « Étape 4 » rendu applicable');
    const conform = setMilestoneNa(released(), 'm1', 'Sans objet', A, at('2026-09-12'));   // a milestone already conform that is set aside, then back: the release stands
    expect(setMilestoneNa(conform, 'm1', null, A, at('2026-09-13')).releasedAt).toBe('2026-09-11');
  });
  it('withdraws a milestone with a person and a line that says its last state; refuses one that is not conform and not waived (t7b, p4)', () => {
    const d = ko();
    expect(removeMilestone(d, 'm2', A, at('2026-09-12'))).toBe(d);
    const w = waiveMilestone(d, 'm2', 'Marc', 'Accord', at('2026-09-11'));
    const r = removeMilestone(w, 'm2', A, at('2026-09-12', '08:00'));
    expect(r.milestones.map(m => m.id)).toEqual(['m1', 'm3', 'm4']);
    expect(sp(r.journal?.at(-1))).toEqual({ at: at('2026-09-12', '08:00'), by: A, proof: true, text: 'Jalon 2 « Étape 2 » retiré (dernier état : non conforme, dérogé, par Alice le 10/09/2026, 2 contrôles dans l\'historique)' });
    expect(removeMilestone(r, 'm2', A, at('2026-09-12'))).toBe(r);   // already gone
    const free = removeMilestone(dl(), 'm4', A, at('2026-09-12'));
    expect(sp(free.journal?.at(-1)?.text)).toBe('Jalon 4 « Étape 4 » retiré (dernier état : à contrôler)');
    const na = removeMilestone(setMilestoneNa(dl(), 'm4', 'Livré monté', A, at('2026-09-12')), 'm4', A, at('2026-09-13'));
    expect(sp(na.journal?.at(-1)?.text)).toBe('Jalon 4 « Étape 4 » retiré (dernier état : sans objet : Livré monté)');
  });
  it('refuses to withdraw a milestone with a defect of 5.1 without decision, and lets the decided one go; the release reads the defects of an order, even of a milestone withdrawn since (L-6)', () => {
    const nc = (decision: string) => ({ ...newNc(st(), A, now), id: 'nc1', ref: 'NC-2026-001', decision: decision as never, deliveryId: 'dl1', milestoneId: 'm2' });
    const linked = linkMilestoneNc(checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: true, by: A, at: at('2026-09-10') }), 'm2', 'nc1', A, at('2026-09-10', '10:00'));
    expect(removeMilestone(linked, 'm2', A, at('2026-09-12'))).toBe(linked);   // without the state: any defect declared holds it back
    expect(removeMilestone(linked, 'm2', A, at('2026-09-12'), st({ ncs: { nc1: nc('') } }))).toBe(linked);
    expect(removeMilestone(linked, 'm2', A, at('2026-09-12'), st({ ncs: { nc1: nc('attente') } }))).toBe(linked);
    expect(removeMilestone(linked, 'm2', A, at('2026-09-12'), st({ ncs: { nc1: nc('retouche') } })).milestones).toHaveLength(3);
    expect(removeMilestone(linked, 'm2', A, at('2026-09-12'), st()).milestones).toHaveLength(3);   // the defect was deleted
    // an order that lost the milestone some other way (an older record): the defect still stands in the way of the release
    const gone = { ...linked, milestones: linked.milestones.filter(m => m.id !== 'm2') };
    expect(canRelease(st({ ncs: { nc1: nc('') } }), gone)).toEqual({ ok: false, why: ["Défaut NC-2026-001 d'un jalon retiré sans décision"] });
    expect(canRelease(st({ ncs: { nc1: nc('retouche') } }), gone).ok).toBe(true);
    expect(canRelease(st({ ncs: { nc1: nc('') } }), linked).why).toEqual(['Défaut NC-2026-001 du jalon 2 sans décision']);   // said once when the milestone is there
    expect(releaseDelivery(gone, { by: 'Marc', at: at('2026-09-11') }, st({ ncs: { nc1: nc('') } }))).toBe(gone);
  });
  it('says adding and moving a milestone in the journal', () => {
    const a = addMilestone(dl(), { label: 'Extra' }, A, at('2026-09-12', '08:00'));
    expect(sp(a.journal?.at(-1))).toEqual({ at: at('2026-09-12', '08:00'), by: A, text: 'Jalon 5 « Extra » ajouté' });
    expect(sp(moveMilestone(a, 'm2', -1, A, at('2026-09-12', '08:05')).journal?.at(-1))).toEqual({ at: at('2026-09-12', '08:05'), by: A, text: 'Jalon 2 « Étape 2 » déplacé en position 1' });
  });
});

describe('3.4 lot 1: signing, what stands in the way, the drawing and the clock (D-7, G-5, G-6, G-9)', () => {
  const s = st();
  it('says what stands in the way as facts: nothing released, no milestone checked, no result, a reservation open with "without reservation", "with reservation" with none written', () => {
    expect(signBlockers(s, dl(), now)).toEqual(["Rien n'est libéré", 'Aucun jalon applicable contrôlé', 'Aucun résultat de réception']);
    expect(signBlockers(s, received(released()), now)).toEqual([]);
    const forced = releaseDelivery(dl(), { by: 'Marc', at: at('2026-09-11'), derogation: { why: 'Urgent' } });
    expect(signBlockers(s, forced, now)).toEqual(['Aucun jalon applicable contrôlé', 'Aucun résultat de réception']);
    expect(sp(signBlockers(s, addReserve(received(released(), '2026-09-14', 'sans'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), now))).toEqual(['Réserve ouverte avec résultat « sans réserve »']);
    expect(sp(signBlockers(s, received(released(), '2026-09-14', 'reserve'), now))).toEqual(['Résultat « avec réserve » sans réserve écrite']);
    const none = setMilestoneNa(setMilestoneNa(setMilestoneNa(setMilestoneNa(dl(), 'm1', 'x', A, at('2026-09-01')), 'm2', 'x', A, at('2026-09-01')), 'm3', 'x', A, at('2026-09-01')), 'm4', 'x', A, at('2026-09-01'));
    expect(signBlockers(s, received(releaseDelivery(none, { by: 'Marc', at: at('2026-09-11') })), now)).toEqual(['Aucun jalon applicable contrôlé']);   // no milestone applicable: nothing was checked
    expect(JSON.stringify(signBlockers(s, dl(), now))).not.toMatch(/\bfaut\b|doit|faites|vérifiez/i);   // facts, no order
  });
  it('stops the signature, the mention absent and the photo of the paper PV while something stands in the way (when the state is given), until a person waives it with a reason', () => {
    const open = arrived(dl());
    expect(signClient(open, ink, at('2026-09-14', '14:40'), A, s)).toBe(open);
    expect(setNoSign(setResult(open, 'sans', at('2026-09-14')), 'absent', 'Bruno', at('2026-09-14', '15:00'), A, undefined, s)).toEqual(setResult(open, 'sans', at('2026-09-14')));
    expect(setPvPhoto(setResult(open, 'sans', at('2026-09-14')), 'photo:pv-1-1', at('2026-09-14', '15:00'), A, s).pvPhoto).toBeUndefined();
    expect(isLocked(signClient(open, ink, at('2026-09-14', '14:40'), A))).toBe(false);   // without the state: nothing is checked here (the screens pass it)
    const ok = received(released());
    expect(isLocked(signClient(ok, ink, at('2026-09-14', '14:40'), A, s))).toBe(true);
    // the waiver: a person and a reason, before the signature, as a proof line
    expect(signWaiver(open, A, ' ', at('2026-09-14'))).toBe(open);
    expect(signWaiver(open, ' ', 'Client pressé', at('2026-09-14'))).toBe(open);
    const w = signWaiver(setResult(open, 'sans', at('2026-09-14', '14:30')), 'Marc', 'Client pressé, libération à régulariser', at('2026-09-14', '14:35'));
    expect(w.reception.signWaiver).toEqual({ by: 'Marc', why: 'Client pressé, libération à régulariser', at: at('2026-09-14', '14:35') });
    expect(sp(w.journal?.at(-1))).toEqual({ at: at('2026-09-14', '14:35'), by: 'Marc', proof: true, text: "Signature autorisée par Marc malgré ce qui s'y oppose : Client pressé, libération à régulariser" });
    expect(signWaiver(w, 'Marc', 'Client pressé, libération à régulariser', at('2026-09-14', '14:36'))).toBe(w);   // done twice, nothing more
    const done = signClient(w, ink, at('2026-09-14', '14:40'), A, s);
    expect(isLocked(done)).toBe(true);
    expect(signBlockers(s, done, now).length).toBeGreaterThan(0);   // the facts stay true: the PV says them
    expect(signWaiver(done, 'Marc', 'Trop tard', at('2026-09-15'))).toBe(done);   // not after the signature
  });
  it('writes the number of the PV, the deadlines of the reservations and the time zone when the PV locks with the state given, and seals all of it', () => {
    const d = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    expect(reservesOf(d)[0]).not.toHaveProperty('dueAt');
    const l = signClient(d, ink, at('2026-09-14', '14:40'), A, s);
    expect(l.reception.pvNo).toBe('PV-2026-001');
    expect(reservesOf(l)[0].dueAt).toBe('2026-09-23');   // 7 working days: the settings may change later, the PV keeps it
    expect(l.reception.signTz).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(sealState(l)).toBe('intact');
    expect(l.reception.seals).toHaveLength(1);
    expect(assignPvNo(s, l, at('2026-09-14', '14:41'))).toBe(l);   // given once
    expect(signClient(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), ink, at('2026-09-14', '14:40'), A).reception).not.toHaveProperty('pvNo');   // without the state: left to assignPvNo
  });
  it('reads a drawing worth a signature: 5 points or more, 2 of them apart, a line of 40 units or more on the pad of 300 x 100 (the proof p2: a dot or a tap signed)', () => {
    expect(signatureOk(ink)).toBe(true);
    expect(signatureOk([[[0, 0], [10, 0], [20, 0], [30, 0], [40, 0]]])).toBe(true);   // exactly 40 units, 5 points
    expect(signatureOk([[[0, 0], [10, 0], [20, 0], [30, 0], [39, 0]]])).toBe(false);
    expect(signatureOk([[[5, 5], [5, 5]]])).toBe(false);
    expect(signatureOk([[[5, 5]]])).toBe(false);
    expect(signatureOk([[[5, 5], [5, 5], [5, 5], [5, 5], [5, 5]]])).toBe(false);
    expect(signatureOk([[[0, 0], [100, 0]]])).toBe(false);   // two points are a segment, not a signature
    expect(signatureOk([[[0, 0], [30, 0], [60, 0]], [[0, 10], [30, 10]]])).toBe(true);   // two strokes count together
    expect(signatureOk([[], []])).toBe(false);
    expect(signatureOk([])).toBe(false);
    expect(signatureOk(undefined)).toBe(false);
    const r = received(released());
    [[[[5, 5], [5, 5]]], [[[5, 5]]], [[[0, 0], [10, 0], [20, 0], [30, 0], [35, 0]]]].forEach(x => { expect(signClient(r, x as Strokes, at('2026-09-14', '14:40'), A)).toBe(r); expect(signCompany(r, x as Strokes, at('2026-09-14', '14:41'), A)).toBe(r); });
  });
  it('refuses a signature after the mention "absent", signs again with the imprint of the one replaced in the journal, and does nothing the same drawing twice', () => {
    const r = received(released());
    const absent = setNoSign(r, 'absent', 'Bruno', at('2026-09-14', '15:00'), A);
    expect(signClient(absent, ink, at('2026-09-14', '15:05'), A)).toBe(absent);   // both mentions on one PV (p2 P10)
    const one = signClient(arrived(dl()), ink, at('2026-09-14', '14:40'), A);
    expect(signClient(one, ink, at('2026-09-14', '14:41'), A)).toBe(one);
    const other: Strokes = [[[1, 1], [50, 60], [90, 10], [130, 70], [200, 20]]];
    const two = signClient(one, other, at('2026-09-14', '14:42'), A);
    expect(two.signClient).toBe(other);
    expect(sp(two.journal?.at(-1)?.text)).toBe(`PV signé par le client ; signature remplacée, empreinte de la précédente : ${shortSeal(sha256(JSON.stringify(ink)))}`);
    expect(two.journal?.at(-1)?.proof).toBe(true);
    const company = signCompany(one, ink, at('2026-09-14', '14:43'), 'Marc');
    expect(signCompany(company, ink, at('2026-09-14', '14:44'), 'Marc')).toBe(company);
  });
  it('tells the clock of the device when it is behind the last act recorded (any order), and says nothing otherwise (the proof b3)', () => {
    expect(clockFact(st(), now)).toBe('');
    const ahead = st({ deliveries: { x: logDelivery(dl({ id: 'x' }), A, at('2026-09-30', '10:30'), 'Dernier acte') } });
    expect(sp(clockFact(ahead, now))).toBe("L'horloge de cet appareil (25 sept. à 10 h 00) est antérieure au dernier acte enregistré (30 sept. à 10 h 30) : l'heure des signatures ne serait pas crédible");
    expect(clockFact(ahead, new Date(2026, 8, 30, 10, 30))).toBe('');   // the same minute is not behind
    expect(clockFact(ahead, new Date(2026, 8, 30, 10, 29))).not.toBe('');
    expect(clockFact(ahead, new Date(2026, 9, 1))).toBe('');
    expect(signBlockers(ahead, received(released()), now).at(-1)).toMatch(/^L'horloge de cet appareil/);
    const far = st({ deliveries: { x: logDelivery(dl({ id: 'x' }), A, '2099-01-01T10:00', 'Dernier acte') } });
    expect(isLocked(signClient(received(released()), ink, at('2026-09-14', '14:40'), A, far))).toBe(false);   // the signature waits for a clock that is right
    expect(clockFact(st({ deliveries: { x: { ...dl({ id: 'x' }), journal: [{ at: 'illisible', by: A, text: 'x' }] } } }), now)).toBe('');   // a line without a moment says nothing
  });
});

describe('3.4 lot 1: a lift has a person, a proof and a moment that is true (G-10, D-5)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const base = () => addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
  it('refuses an instant that has not come (the clock of the device, one minute of margin), and the lift of the 31 December 2027 (the proof p2 P6)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 11, 30));
    const d = base(), rid = reservesOf(d)[0].id, who = { by: 'M. Durand', note: 'Revu avec le client' };
    expect(liftReserve(d, rid, { at: '2027-12-31T09:00', ...who })).toBe(d);
    expect(liftReserve(d, rid, { at: '2026-09-21T10:00', ...who })).toBe(d);
    expect(liftReserve(d, rid, { at: '2026-09-20T11:32', ...who })).toBe(d);
    expect(reservesOf(liftReserve(d, rid, { at: '2026-09-20T11:31', ...who }))[0].liftedAt).toBe('2026-09-20');   // within the minute of margin
    expect(reservesOf(liftReserve(d, rid, { at: '2026-09-18T09:00', ...who }))[0].liftedAt).toBe('2026-09-18');
  });
  it('writes the moment of the writing in the journal, and the day of the fact when it is another one (the proof p2 P6: the date typed no longer replaces the instant)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    const d = base(), rid = reservesOf(d)[0].id;
    const back = liftReserve(d, rid, { at: '2026-09-18T09:00', by: 'M. Durand', note: 'Revu avec le client' });
    expect(sp(back.journal?.at(-1))).toEqual({ at: '2026-09-30T10:00', by: 'M. Durand', proof: true, text: 'Réserve « Rayure » levée enregistrée par M. Durand : Revu avec le client (fait le 18/09/2026)' });
    expect(reservesOf(back)[0].liftedAt).toBe('2026-09-18');
    expect(reserveLateDays(reservesOf(back)[0], back, P, new Date(2026, 8, 30))).toBe(0);   // the fact day counts for the delay, the writing for the journal
    const same = liftReserve(d, rid, { at: '2026-09-30T09:00', by: 'M. Durand', note: 'Revu' });
    expect(sp(same.journal?.at(-1)?.text)).toBe('Réserve « Rayure » levée enregistrée par M. Durand : Revu');
    expect(liftReserve(d, rid, { at: '2026-09-18T09:00', by: 'M. Durand', note: 'Revu', now: '2026-09-18T09:05' }).journal?.at(-1)?.at).toBe('2026-09-18T09:05');   // the clock can be given
  });
  it('asks for the signature of the customer, a photo or a note (a note of blanks is none)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    const d = base(), rid = reservesOf(d)[0].id, when = '2026-09-18T09:00';
    expect(liftReserve(d, rid, { at: when, by: 'M. Durand' })).toBe(d);
    expect(liftReserve(d, rid, { at: when, by: 'M. Durand', note: '   ' })).toBe(d);
    expect(liftReserve(d, rid, { at: when, by: 'M. Durand', sign: [[]] })).toBe(d);
    expect(reservesOf(liftReserve(d, rid, { at: when, by: 'M. Durand', sign: ink }))[0].liftSign).toBe(ink);
    expect(reservesOf(liftReserve(d, rid, { at: when, by: 'M. Durand', photo: 'photo:l-1-1' }))[0].liftPhoto).toBe('photo:l-1-1');
    expect(liftReserve(d, rid, { at: when, by: ' ', note: 'Revu' })).toBe(d);
  });
  it('writes the deadline when the reservation is made: a change of the settings no longer moves a PV signed, a delay or the indicator (the proof t18)', () => {
    const d = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }, P);
    const [r] = reservesOf(d);
    expect(r.dueAt).toBe('2026-09-23');
    expect(reserveDue(r, d, { ...P, reception: { liftDays: 3 } })).toBe('2026-09-23');   // the deadline of the PV is the one written
    expect(reserveDue(r, d, PC)).toBe('2026-09-23');
    expect(reserveLateDays({ ...r, liftedAt: '2026-09-22' }, d, { ...P, reception: { liftDays: 3 } }, now)).toBe(0);   // lifted in time stays in time
    expect(reservesOf(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }))[0]).not.toHaveProperty('dueAt');   // no settings given: read when needed
    expect(reservesOf(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Jeu', dueAt: '2026-09-16', by: A, at: at('2026-09-14', '14:35') }, P))[0].dueAt).toBe('2026-09-16');   // a deadline typed wins
    expect(reservesOf(addReserve(arrived(dl()), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }, P))[0].dueAt).toBe('2026-09-23');   // counted from the day the reservation is raised
  });
  it('moves a deadline only with a person and a reason, says from what to what in a line that is kept, and seals a PV again (the proof p2 P6b)', () => {
    const d = signed(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }, P)), rid = reservesOf(d)[0].id;
    const none = patchReserve(d, rid, { dueAt: '2026-12-31' }, A, at('2026-10-01'));
    expect(reservesOf(none)[0].dueAt).toBe('2026-09-23');   // no reason: the deadline stays
    expect(reservesOf(patchReserve(d, rid, { dueAt: '2026-12-31' }, ' ', at('2026-10-01'), 'Pièce attendue'))[0].dueAt).toBe('2026-09-23');   // no person
    const m = patchReserve(d, rid, { dueAt: '2026-10-05' }, A, at('2026-09-22', '09:00'), 'Pièce attendue');
    expect(reservesOf(m)[0].dueAt).toBe('2026-10-05');
    expect(sp(m.journal?.at(-2))).toEqual({ at: at('2026-09-22', '09:00'), by: A, proof: true, text: 'Réserve « Rayure » : échéance repoussée du 23/09/2026 au 05/10/2026 : Pièce attendue' });
    expect(m.reception.seals).toHaveLength(2);
    expect(m.reception.seals?.at(-1)?.why).toBe('échéance de réserve modifiée');
    expect(sealState(m)).toBe('intact');
    expect(sp(patchReserve(m, rid, { dueAt: '2026-09-30' }, A, at('2026-09-23'), 'Levée promise').journal?.at(-2)?.text)).toBe('Réserve « Rayure » : échéance avancée du 05/10/2026 au 30/09/2026 : Levée promise');
    expect(reservesOf(patchReserve(m, rid, { handler: 'Bruno' }, A, at('2026-09-23')))[0].handler).toBe('Bruno');   // who takes charge needs no reason
    expect(patchReserve(m, rid, { handler: 'Bruno' }, A, at('2026-09-23')).reception.seals).toHaveLength(2);
    const free = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), fid = reservesOf(free)[0].id;
    expect(sp(patchReserve(free, fid, { dueAt: '2026-09-30' }, A, at('2026-09-15'), 'Accord').journal?.at(-1)?.text)).toBe('Réserve « Rayure » : échéance fixée au 30/09/2026 : Accord');   // no deadline written before
    expect(patchReserve(free, fid, { dueAt: '2026-09-30' }, A, at('2026-09-15'), 'Accord').reception.seals).toBeUndefined();   // not sealed: nothing to seal again
  });
});

describe('3.4 lot 1: the authorisation to release, the photo of the paper PV and the witness (G-14, G-15, P-18, G-20)', () => {
  const kod = () => checkMilestone(allOkExcept(dl(), 'm2'), 'm2', { ok: false, by: 'Paul', at: at('2026-09-10') });
  it('says whether the person who releases by derogation had controlled or waived herself (the proof p3 P14), and the facts of the authorisation', () => {
    const waived = waiveMilestone(kod(), 'm2', 'Paul', 'Accord du client', at('2026-09-11'));
    const same = releaseDelivery(waived, { by: 'Paul', at: at('2026-09-11', '16:00'), derogation: { why: 'Accord du client' } });
    expect(same.derogation).toMatchObject({ by: 'Paul', why: 'Accord du client', sameAsControl: true });
    expect(derogationFacts(same)).toEqual(['Paul a contrôlé ou passé outre un jalon de cette commande et la libère par dérogation']);
    const other = releaseDelivery(waived, { by: 'Marc', at: at('2026-09-11', '16:00'), derogation: { why: 'Accord du client' } });
    expect(other.derogation).toMatchObject({ sameAsControl: false });
    expect(derogationFacts(other)).toEqual([]);
    expect(derogationFacts(dl())).toEqual([]);   // not released: nothing to say
    expect(derogationFacts(other, { ...P, reception: { releasers: ['Marc'] } })).toEqual([]);
    expect(sp(derogationFacts(other, { ...P, reception: { releasers: ['Awa'] } }))).toEqual(['Marc : personne hors de la liste des personnes qui libèrent']);
    expect(sp(derogationFacts(released(), { ...P, reception: { releasers: ['Awa'] } }))).toEqual(['Marc : personne hors de la liste des personnes qui libèrent']);   // a release without derogation too
    expect(releaseDelivery(allOk(dl()), { by: 'Marc', at: at('2026-09-11') })).not.toHaveProperty('derogation');
  });
  it('says a critical milestone with no second person, as a fact (G-14), and nothing once it has one', () => {
    const critical = () => dl({ milestones: ms().map((m, i) => (i === 0 ? { ...m, critical: true } : m)) });
    const crit = (second?: string) => releaseDelivery(IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at('2026-09-10'), ...(id === 'm1' && second ? { second } : {}) }), critical()), { by: 'Marc', at: at('2026-09-11') });
    expect(sp(derogationFacts(crit()))).toEqual(['Jalon 1 « Étape 1 » critique : pas de second contrôleur indiqué']);
    expect(derogationFacts(crit('Bruno'))).toEqual([]);
  });
  it('says when the release is dated after the delivery (D-7): in the journal of the release and by `releasedAfterDelivery`', () => {
    const delivered = arrived(allOk(dl()), '2026-09-14');   // delivered at 14:00 on the 14th
    const late = releaseDelivery(delivered, { by: 'Marc', at: at('2026-09-18', '09:00') });
    expect(releasedAfterDelivery(late)).toBe(true);
    expect(sp(late.journal?.at(-1)?.text)).toBe('Libérée par Marc ; enregistrée après la livraison du 14/09/2026');
    expect(releasedAfterDelivery(releaseDelivery(delivered, { by: 'Marc', at: at('2026-09-14', '13:59') }))).toBe(false);
    expect(releasedAfterDelivery(releaseDelivery(delivered, { by: 'Marc', at: at('2026-09-14', '14:01') }))).toBe(true);   // the hour counts when both are known
    expect(releasedAfterDelivery(released())).toBe(false);
    expect(releasedAfterDelivery(dl())).toBe(false);
    expect(releasedAfterDelivery({ ...delivered, releasedAt: '2026-09-14' })).toBe(false);   // a release known by its day only, the same day
    expect(releasedAfterDelivery({ ...delivered, releasedAt: '2026-09-15' })).toBe(true);
    expect(released().journal?.at(-1)?.text).toBe('Libérée par Marc');
  });
  it('writes the moment of the photo of the paper PV and takes it as the moment of the signature when none is given; a photo added after the signature says so', () => {
    const r = received(released());
    const p = setPvPhoto(r, 'photo:pv-1-1', at('2026-09-14', '15:00'), A);
    expect(p.reception).toMatchObject({ pvPhotoAt: at('2026-09-14', '15:00'), signedAt: at('2026-09-14', '15:00') });
    expect(isLocked(p)).toBe(true);
    expect(sealState(p)).toBe('intact');
    const kept = setPvPhoto({ ...r, reception: { ...r.reception, signedAt: at('2026-09-14', '14:50') } }, 'photo:pv-1-1', at('2026-09-14', '15:00'), A);
    expect(kept.reception.signedAt).toBe(at('2026-09-14', '14:50'));   // a moment already there stays
    expect(setPvPhoto(p, 'photo:pv-1-1', at('2026-09-14', '15:05'), A)).toBe(p);   // the same photo twice
    const open = setPvPhoto(arrived(dl()), 'photo:pv-1-1', at('2026-09-14', '15:00'), A);   // no result yet
    const gone = setPvPhoto(open, '', at('2026-09-14', '15:05'), A);
    expect(gone.reception).not.toHaveProperty('pvPhotoAt');
    expect(gone.reception).not.toHaveProperty('signedAt');   // the moment came from the photo: it goes with it
    const late = setPvPhoto(signed(r), 'photo:pv-2-2', at('2026-09-15', '08:00'), A);
    expect(late.pvPhoto).toBe('photo:pv-2-2');
    expect(late.reception.signedAt).toBe(at('2026-09-14', '14:40'));
    expect(late.journal?.map(l => l.text)).toContain('Photo du PV papier signé ajoutée après la signature');
  });
  it('tells a photo already used by another order or another delivery, as a fact, and refuses it when the state is given', () => {
    const a = { ...setPvPhoto(received(released(dl({ id: 'a', ref: 'CMD-A' }))), 'photo:p-1-1', at('2026-09-14', '15:00'), A) };
    const b = received(released(dl({ id: 'b', ref: 'CMD-B' })));
    const s = st({ deliveries: { a, b } });
    expect(photoReuse(s, 'photo:p-1-1', 'b')).toBe('Cette photo est déjà utilisée par la commande CMD-A');
    expect(photoReuse(s, 'photo:p-1-1', 'a')).toBe('');   // its own
    expect(photoReuse(s, 'photo:autre', 'b')).toBe('');
    expect(photoReuse(s, '', 'b')).toBe('');
    expect(setPvPhoto(b, 'photo:p-1-1', at('2026-09-14', '15:00'), A, s)).toBe(b);
    expect(setPvPhoto(b, 'photo:p-9-9', at('2026-09-14', '15:00'), A, s).pvPhoto).toBe('photo:p-9-9');
    expect(isLocked(setPvPhoto(b, 'photo:p-1-1', at('2026-09-14', '15:00'), A))).toBe(true);   // the state is what lets the move check it
    const closed = { ...a, lots: [{ id: 'lt1', no: 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: a.reception, pvPhoto: 'photo:lot-1-1' }] };
    expect(photoReuse(st({ deliveries: { a: closed } }), 'photo:lot-1-1', 'a')).toBe('Cette photo est déjà utilisée par la commande CMD-A');   // another delivery of the same order
  });
  it('takes as witness neither the person who records nor the one who signs for the company, accents and case aside; the organisation of the witness is kept (the proof p2 P10)', () => {
    const r = received(released());
    expect(setNoSign(r, 'absent', 'Alice', at('2026-09-14', '15:00'), A)).toBe(r);
    expect(setNoSign(r, 'absent', ' alice ', at('2026-09-14', '15:00'), A)).toBe(r);
    const accents = received(released(), '2026-09-14');
    expect(setNoSign(accents, 'absent', 'Éloïse', at('2026-09-14', '15:00'), 'Eloise')).toBe(accents);   // the same person without the accents
    const e = received(released());
    expect(setNoSign(e, 'absent', 'éloïse', at('2026-09-14', '15:00'), 'ELOISE')).toBe(e);
    const company = signCompany(r, ink, at('2026-09-14', '14:41'), 'Marc');
    expect(setNoSign(company, 'refused', 'MARC', at('2026-09-14', '15:00'), A)).toBe(company);
    const ok = setNoSign(company, 'absent', 'Bruno', at('2026-09-14', '15:00'), A, ' Client ');
    expect(ok.reception.noSign).toEqual({ kind: 'absent', witness: 'Bruno', at: at('2026-09-14', '15:00'), witnessOrg: 'Client' });
    expect(sp(ok.journal?.find(l => l.text.startsWith('PV sans signature'))?.text)).toBe('PV sans signature du client : client absent (témoin : Bruno, Client)');
    expect(setNoSign(r, 'absent', 'Bruno', at('2026-09-14', '15:00'), A).reception.noSign).not.toHaveProperty('witnessOrg');
  });
});

describe('3.4 lot 1: the same gesture twice changes nothing more (D-22)', () => {
  const twice = <T,>(f: (d: Delivery) => Delivery, d: T & Delivery) => { const once = f(d); expect(once).not.toBe(d); expect(f(once)).toBe(once); return once; };
  it('checkMilestone, setShipCheck, refuse, repairReserve, signCompany, archiveDelivery, restoreDelivery', () => {
    const c = twice(x => checkMilestone(x, 'm1', { ok: true, by: A, at: at('2026-09-10'), measured: '11', photo: 'photo:a-1-1' }), dl());
    expect(c.milestones[0].history).toHaveLength(1);
    expect(c.journal).toHaveLength(1);
    expect(checkMilestone(c, 'm1', { ok: true, by: A, at: at('2026-09-11') }).milestones[0].history).toHaveLength(2);   // another moment: a new check
    expect(checkMilestone(c, 'm1', { ok: false, by: A, at: at('2026-09-10') }).milestones[0].history).toHaveLength(2);   // another result
    expect(checkMilestone(c, 'm1', { ok: true, by: 'Bruno', at: at('2026-09-10') }).milestones[0].history).toHaveLength(2);   // another person
    twice(x => setShipCheck(x, 'sc_0', true, A, at('2026-09-11')), dl());
    twice(x => setShipCheck(x, 'sc_1', null, A, at('2026-09-11'), true), dl());
    const s0 = setShipCheck(dl(), 'sc_0', true, A, at('2026-09-11'));
    expect(setShipCheck(s0, 'sc_0', null, A, at('2026-09-11')).shipChecks?.[0].ok).toBeNull();
    const fresh = dl();
    expect(setShipCheck(fresh, 'sc_0', null, A, at('2026-09-11'))).toBe(fresh);   // still to check: nothing to say
    const reason = { reason: 'Quantité incorrecte', next: 'À remplacer' };
    const r = twice(x => refuse(x, reason, at('2026-09-14', '15:00'), A), arrived(released()));
    expect(r.journal!.filter(l => l.text.startsWith('Réception refusée'))).toHaveLength(1);
    expect(refuse(r, { reason: 'Documents manquants', next: 'À remplacer' }, at('2026-09-14', '15:05'), A).reception.refusal?.reason).toBe('Documents manquants');   // another motive before the signature is another gesture
    const rv = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    const fixed = twice(x => repairReserve(x, reservesOf(x)[0].id, { at: at('2026-09-16'), by: 'Bruno', photo: 'photo:rep-1-1' }), rv);
    expect(fixed.journal!.filter(l => l.text.startsWith('Reprise faite'))).toHaveLength(1);
    expect(repairReserve(fixed, reservesOf(fixed)[0].id, { at: at('2026-09-18'), by: 'Bruno' })).toBe(fixed);   // already repaired
    const sc = twice(x => signCompany(x, ink, at('2026-09-14', '14:41'), 'Marc'), received(released()));
    expect(sc.journal!.filter(l => l.text === "PV signé pour l'entreprise")).toHaveLength(1);
    const a = twice(x => archiveDelivery(x, at('2026-09-20'), 'Soldée', A), dl());
    expect(archiveDelivery(a, at('2026-09-25'), 'Autre', A)).toBe(a);
    expect(a.archivedAt).toBe(at('2026-09-20'));
    twice(x => restoreDelivery(x, A, at('2026-09-21')), a);
    const live = dl();
    expect(restoreDelivery(live, A, at('2026-09-21'))).toBe(live);
  });
});

describe('3.4 lot 1, remaining points: the seals of the closed deliveries, the line of a lift, the number of the PV, the quantities, the reuse of a signature', () => {
  // an order of 10 whose first delivery (4 of them) is signed and closed, the second one is under way
  const withLot = () => {
    const base = received(released(dl({ qty: 10 })));
    return nextPresentation(signed({ ...base, reception: { ...base.reception, qty: 4 } }), A, at('2026-09-15'));
  };
  it('a correction of the identity of the order lays the seal of the delivery under way AND of every closed signed delivery again, with the same reason, and a closed delivery reads its seal (the proof dl_demo_13)', () => {
    const d = withLot(), when = at('2026-09-16', '09:00');
    expect(lotSealState(d, 1)).toBe('intact');
    expect(lotSealState(d, 2)).toBe('none');   // the delivery under way: not signed, no seal
    const c = correctLocked(d, { _why: 'Client mal écrit', order: { client: 'Client B' } }, A, when);
    expect(c.client).toBe('Client B');
    expect(lotSealState(c, 1)).toBe('intact');   // before: "modified" although the correction is in the journal
    expect(sealState(deliveryAt(c, 1).d)).toBe('intact');   // the PV of the closed delivery reads the same
    const seals = lotsOf(c)[0].reception.seals!;
    expect(seals).toHaveLength(2);
    expect(seals[0]).toEqual(lotsOf(d)[0].reception.seals![0]);   // the first seal stays
    expect(seals[1]).toMatchObject({ at: when, by: A, why: 'correction : Client mal écrit' });
    expect(sp(c.journal?.at(-1))).toEqual({ at: when, by: A, proof: true, text: `Scellé SHA-256 posé : ${shortSeal(seals[1].hash)} (livraison 1, correction : Client mal écrit)` });
    expect(sp(c.journal?.at(-2)?.text)).toBe('Corrigé : client Client A → Client B (motif : Client mal écrit)');
    expect(c.reception.seals).toBeUndefined();   // the delivery under way is not signed: nothing to seal
    expect(d.client).toBe('Client A');
    // a correction that leaves the identity alone leaves the seals of the closed deliveries alone
    expect(lotsOf(correctLocked(signed(received(d, '2026-09-20'), '2026-09-20'), { _why: 'Lieu', place: 'Quai 3' }, A, when))[0].reception.seals).toHaveLength(1);
    // the same on the example of the tool: dl_demo_13 holds a refused delivery signed and closed, the second one is not signed
    const two = receptionExamples(new Date(2026, 8, 25, 10, 0)).deliveries.dl_demo_13;
    expect(lotSealState(two, 1)).toBe('intact');
    const fixed = correctLocked(two, { _why: 'Nom du client', order: { client: 'Hôtel des Tilleuls (siège)' } }, A, when);
    expect(lotSealState(fixed, 1)).toBe('intact');
    expect(lotsOf(fixed)[0].reception.seals).toHaveLength(lotsOf(two)[0].reception.seals!.length + 1);   // one more seal, the reason given
  });
  it('lays the seal of a closed delivery again with the fact that it no longer matched, and leaves alone a closed delivery that was never signed', () => {
    const d = withLot(), tampered = { ...d, lots: lotsOf(d).map(l => ({ ...l, reception: { ...l.reception, name: 'Autre' } })) };
    expect(lotSealState(tampered, 1)).toBe('modified');
    const c = correctLocked(tampered, { _why: 'Remise en ordre', order: { item: 'Autre lot' } }, A, at('2026-09-16'));
    expect(lotsOf(c)[0].reception.seals?.at(-1)?.why).toBe('correction : Remise en ordre ; le contenu ne correspondait plus au scellé précédent');
    expect(lotSealState(c, 1)).toBe('intact');
    const unsigned = { ...d, lots: lotsOf(d).map(l => ({ ...l, signClient: undefined, reception: { ...l.reception, seals: undefined } })) } as Delivery;
    expect(lotsOf(correctLocked(unsigned, { _why: 'x', order: { item: 'Autre lot' } }, A, at('2026-09-16')))[0].reception.seals).toBeUndefined();
  });
  it('a lift is "enregistrée par" the person of the company, never "constatée par" her; the note and the person of the customer side are said when they exist (G-8)', () => {
    const d = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }), rid = reservesOf(d)[0].id, w = at('2026-09-16', '09:00');
    const l = liftReserve(d, rid, { at: w, now: w, by: 'Paul', pour: 'M. Durand', note: 'Revu sur place' });
    expect(sp(lastLog(l))).toEqual({ at: w, by: 'Paul', proof: true, text: 'Réserve « Rayure » levée enregistrée par Paul, constatée côté client par M. Durand : Revu sur place' });
    expect(reservesOf(l)[0]).toMatchObject({ liftedBy: 'Paul', liftNote: 'Constatée côté client par M. Durand · Revu sur place' });
    expect(sp(lastLog(liftReserve(d, rid, { at: w, now: w, by: 'Paul', photo: 'photo:l-1-1' }))?.text)).toBe('Réserve « Rayure » levée enregistrée par Paul');   // no note, no name: nothing added
    expect(sp(lastLog(liftReserve(d, rid, { at: w, now: w, by: 'Paul', pour: ' M. Durand ' }))?.text)).toBe('Réserve « Rayure » levée enregistrée par Paul, constatée côté client par M. Durand');   // the name alone is a proof
    expect(JSON.stringify(l.journal)).not.toContain('constatée par');
  });
  it('a result or a refusal that locks the PV (the signature was laid before it) gives the number of the PV, writes the deadlines and lays one seal, with `s`', () => {
    const s = st();
    const before = signed(addReserve(arrived(released()), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') }));
    expect(isLocked(before)).toBe(false);   // signed, no result: not locked yet
    const sans = setResult(before, 'reserve', at('2026-09-14', '14:50'), A);
    expect(isLocked(sans)).toBe(true);
    expect(sans.reception.pvNo).toBeUndefined();   // without `s`: no number (the old behaviour of the callers that forgot it)
    const x = setResult(before, 'reserve', at('2026-09-14', '14:50'), A, s);
    expect(x.reception.pvNo).toBe('PV-2026-001');
    expect(reservesOf(x)[0].dueAt).toBe('2026-09-23');   // seven working days after the reception
    expect(x.reception.seals).toHaveLength(1);
    expect(sealState(x)).toBe('intact');
    expect(sealContent(x)).toContain('PV-2026-001');
    const reason = { reason: 'Quantité incorrecte', next: 'À remplacer' }, r = refuse(signed(arrived(released())), reason, at('2026-09-14', '15:00'), A, s);
    expect(isLocked(r)).toBe(true);
    expect(r.reception.pvNo).toBe('PV-2026-001');
    expect(r.reception.seals).toHaveLength(1);
    expect(refuse(signed(arrived(released())), reason, at('2026-09-14', '15:00'), A).reception.pvNo).toBeUndefined();
    // the numbers go on: another PV already numbered in the state
    expect(setResult(before, 'reserve', at('2026-09-14', '14:50'), A, st({ deliveries: { z: { ...dl({ id: 'z' }), reception: { ...dl().reception, pvNo: 'PV-2026-004' } } } })).reception.pvNo).toBe('PV-2026-005');
  });
  // one test for what a person can write, one for what is refused, one for the agreement, one for the lock: a red line names the rule that broke (G-12)
  const qtyBase = () => { const d = arrived(released(), '2026-09-14'), w = at('2026-09-14', '14:20'); return { d, w, q: setQuantities(d, { qty: 4, count: 4 }, A, w) }; };
  it('writes the quantity and the count of a delivery with a person and a line of the journal; the same value changes nothing more; null empties one (G-12)', () => {
    const { w, q } = qtyBase();
    expect(q.reception).toMatchObject({ qty: 4, count: 4 });
    expect(sp(lastLog(q))).toEqual({ at: w, by: A, text: 'Quantité livrée : 4 ; Quantité comptée : 4' });
    expect(setQuantities(q, { qty: 4, count: 4 }, A, w)).toBe(q);   // twice: nothing more
    expect(setQuantities(q, { qty: 4 }, A, w)).toBe(q);
    const emptied = setQuantities(q, { qty: null }, A, w);
    expect(emptied.reception.qty).toBeNull();
    expect(sp(lastLog(emptied)?.text)).toBe('Quantité livrée : tout le reste de la commande');
    expect(sp(lastLog(setQuantities(q, { count: null }, A, w))?.text)).toBe('Quantité comptée : non comptée');
  });
  it('writes no quantity without a person, none that is not a number or is negative, and nothing when nothing is asked (G-12)', () => {
    const { d, w } = qtyBase();
    expect(setQuantities(d, { qty: 4 }, ' ', w)).toBe(d);   // a person
    expect(setQuantities(d, { qty: Number.NaN }, A, w)).toBe(d);
    expect(setQuantities(d, { count: -1 }, A, w)).toBe(d);
    expect(setQuantities(d, {}, A, w)).toBe(d);
  });
  it('records the agreement of the customer to be delivered in several times as a proof line (who, when), once, and takes it back with a line (G-12)', () => {
    const { w, q } = qtyBase();
    const ok = setQuantities(q, { partialOk: true }, 'Marc', at('2026-09-14', '14:25'));
    expect(ok.reception.partialOk).toEqual({ by: 'Marc', at: at('2026-09-14', '14:25') });
    expect(sp(lastLog(ok))).toEqual({ at: at('2026-09-14', '14:25'), by: 'Marc', text: 'Livraison en plusieurs fois : accord du client enregistré', proof: true });
    expect(setQuantities(ok, { partialOk: true }, 'Paul', at('2026-09-14', '14:30'))).toBe(ok);   // already so: the first person and moment stay
    const back = setQuantities(ok, { partialOk: false }, 'Marc', at('2026-09-14', '14:40'));
    expect(back.reception).not.toHaveProperty('partialOk');
    expect(sp(lastLog(back)?.text)).toBe('Livraison en plusieurs fois : accord du client retiré');
    expect(setQuantities(back, { partialOk: false }, 'Marc', w)).toBe(back);
  });
  it('takes no quantity, no agreement and no photo of the state on a signed PV (G-12)', () => {
    const w = at('2026-09-14', '14:20'), locked = lock(released());
    expect(setQuantities(locked, { qty: 3, count: 3, partialOk: true }, A, w)).toBe(locked);   // a signed PV takes none
    expect(setStatePhotos(locked, ['photo:a-1-1'], A, w)).toBe(locked);
  });
  it('writes the photos of the state at delivery with a person and a line (added, replaced, withdrawn); the same list changes nothing more (G-12)', () => {
    const d = arrived(released()), w = at('2026-09-14', '14:20');
    const one = setStatePhotos(d, ['photo:a-1-1'], A, w);
    expect(one.reception.photos).toEqual(['photo:a-1-1']);
    expect(lastLog(one)).toEqual({ at: w, by: A, text: "Photo de l'état à la livraison ajoutée" });
    expect(setStatePhotos(one, ['photo:a-1-1'], A, w)).toBe(one);
    const two = setStatePhotos(one, ['photo:a-1-1', 'photo:b-1-1'], A, w), swapped = setStatePhotos(two, ['photo:a-1-1', 'photo:c-1-1'], A, w), gone = setStatePhotos(two, ['photo:a-1-1'], A, w);
    expect(lastLog(swapped)?.text).toBe("Photo de l'état à la livraison remplacée");
    expect(lastLog(gone)?.text).toBe("Photo de l'état à la livraison retirée");
    expect(setStatePhotos(gone, [], A, w).reception).not.toHaveProperty('photos');
    expect(setStatePhotos(d, [], A, w)).toBe(d);   // nothing to withdraw
    expect(setStatePhotos(d, ['photo:a-1-1'], '', w)).toBe(d);   // a person
    expect(setStatePhotos(d, [''], A, w)).toBe(d);   // an empty reference is not a photo
  });
  it('refuses a signature that is already the one of another PV (customer or company, an order or a closed delivery), moved or enlarged included, and says it (G-6b)', () => {
    const a = signCompany(signed(received(released(dl({ id: 'a', ref: 'CMD-A' })))), ink, at('2026-09-14', '14:45'), 'Marc');
    const s = st({ deliveries: { a } });
    const fact = 'Cette signature est identique à celle de la commande CMD-A';
    expect(signatureReuse(s, ink, 'b')).toBe(fact);
    expect(signatureReuse(s, ink.map(l => l.map(([x, y]) => [x + 30, y + 20])), 'b')).toBe(fact);   // moved on the pad
    expect(signatureReuse(s, ink.map(l => l.map(([x, y]) => [x * 2, y * 2])), 'b')).toBe(fact);   // enlarged
    expect(signatureReuse(s, [[[1, 1], [50, 60], [90, 10], [130, 70], [200, 20]]], 'b')).toBe('');   // another drawing
    expect(signatureReuse(s, ink, 'a')).toBe('');   // the delivery under way of the same order is left out
    expect(signatureReuse(s, [], 'b')).toBe('');
    const b = received(released(dl({ id: 'b', ref: 'CMD-B' })));
    expect(signClient(b, ink, at('2026-09-14', '14:40'), A, s)).toBe(b);   // refused
    expect(signCompany(b, ink, at('2026-09-14', '14:41'), 'Marc', s)).toBe(b);
    expect(signClient(b, ink, at('2026-09-14', '14:40'), A).signClient).toBe(ink);   // without `s`: the old behaviour
    const other: Strokes = [[[1, 1], [50, 60], [90, 10], [130, 70], [200, 20]]];
    expect(signClient(b, other, at('2026-09-14', '14:40'), A, s).signClient).toBe(other);
    // a closed delivery of another order counts too
    const closed = nextPresentation({ ...a, reception: { ...a.reception, qty: 4 } }, A, at('2026-09-15'));
    expect(lotsOf(closed)).toHaveLength(1);
    expect(signatureReuse(st({ deliveries: { a: closed } }), ink, 'b')).toBe(fact);
  });
});

// ---- lot 2: fair rules (quantities, states, measures, deadlines)
describe('3.4 lot 2: quantities (D-3, D-20)', () => {
  const rc = (over: Partial<Reception> = {}): Reception => ({ ...newDelivery(P).reception, date: '2026-09-14', result: 'sans', ...over });
  const lotOf = (no: number, reception: Reception): Lot => ({ ...dl(), id: `lt${no}`, no, closedAt: '2026-09-15T09:00', reception } as Lot);
  it('settles an order delivered in two times whatever the decimals: no 1,1e-16 left to deliver (D-3)', () => {
    let bad = 0;
    for (let t10 = 2; t10 <= 60; t10++) for (let a10 = 1; a10 < t10; a10++) {
      const T = t10 / 10, a = a10 / 10, b = Math.round((T - a) * 10) / 10, d = dl({ qty: T, lots: [lotOf(1, rc({ qty: a }))], reception: rc({ qty: b }) });
      if (remainingQty(d) !== 0 || !isSettled(d) || currentState(d, now, P) !== 'accepted') bad++;
    }
    expect(bad).toBe(0);
    expect(remainingQty(dl({ qty: 0.8, reception: rc({ qty: 0.7 }) }))).toBe(0.1);
    expect(qtyReceived(dl({ qty: 0.3, lots: [lotOf(1, rc({ qty: 0.1 }))], reception: rc({ qty: 0.2 }) }))).toBe(0.3);
  });
  it('writes a quantity with the French comma (D-3, D-20)', () => {
    expect(frQty(7.5)).toBe('7,5');
    expect(frQty(10)).toBe('10');
    expect(frQty(0.4)).toBe('0,4');
    expect(sp(lastLog(setQuantities(received(released()), { qty: 7.5 }, A, at('2026-09-14', '14:35')))?.text)).toBe('Quantité livrée : 7,5');
  });
  it('reads a negative quantity as nothing received and refuses it to be written: the screen, the domain, the correction and the typed copy (D-20)', () => {
    const d = dl({ qty: 10, reception: rc({ qty: -5 }) });
    expect(qtyReceived(d)).toBe(0);
    expect(remainingQty(d)).toBe(10);
    const base = received(released());
    expect(setQuantities(base, { qty: -5 }, A, at('2026-09-14', '14:35'))).toBe(base);
    expect(setQuantities(base, { count: -1 }, A, at('2026-09-14', '14:35'))).toBe(base);
    const locked = signed(base);
    expect(correctLocked(locked, { _why: 'erreur de saisie', order: { qty: -3 } }, A, at('2026-09-16'))).toBe(locked);
    expect(correctLocked(locked, { _why: 'erreur de saisie', order: { qty: 12 } }, A, at('2026-09-16')).qty).toBe(12);
    expect(takeLife({ ...dl(), qty: -3 }, dl()).qty).toBe(10);
    expect(takeLife({ ...dl(), qty: 12 }, dl()).qty).toBe(12);
  });
  it('counts a quantity put off by a blocking reservation as not received, with the same rule everywhere (L-8)', () => {
    const put = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'fuite', severity: 'blocking', by: A, at: at('2026-09-14', '14:40') });
    expect(isPostponed(put)).toBe(true);
    expect(counted(put.reception)).toBe(false);
    expect(qtyReceived(put)).toBe(0);
    const minor = addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:40') });
    expect([isPostponed(minor), counted(minor.reception)]).toEqual([false, true]);
    expect(isPostponed(received(released()))).toBe(false);
    expect(isPostponed(lift(put, reservesOf(put)[0].id, { at: at('2026-09-15'), by: A }))).toBe(false);
    expect(isPostponed(dl())).toBe(false);
  });
});

describe('3.4 lot 2: results and reservations (D-4, D-6, reliquat of lot 1)', () => {
  const withRv = (result: 'reserve' | 'sans' = 'reserve') => addReserve(received(released(), '2026-09-14', result), { text: 'rayure', by: A, at: at('2026-09-14', '14:40') });
  it('refuses "sans réserve" while a reservation of the delivery is open, and accepts it once it is lifted (D-4)', () => {
    const d = withRv();
    expect(setResult(d, 'sans', at('2026-09-15'), A)).toBe(d);
    const lifted = lift(d, reservesOf(d)[0].id, { at: at('2026-09-15'), by: A });
    expect(setResult(lifted, 'sans', at('2026-09-15', '11:00'), A).reception.result).toBe('sans');
    expect(setResult(d, 'refus', at('2026-09-15'), A)).toBe(d);   // a refusal still needs its motive
  });
  it('stops following the reservations of a refused delivery: not open, not late, nothing deleted (D-4)', () => {
    const d = withRv(), refused = refuse(d, { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-15'), A);
    expect(refused.reception.result).toBe('refus');
    expect(reservesOf(refused)).toHaveLength(1);
    expect(deliveryState(d, now, P)).toBe('reserve_late');
    expect(openReserves(refused)).toEqual([]);
    expect(deliveryState(refused, now, P)).toBe('refused');
    const next = nextPresentation(refused, A, at('2026-09-16'));
    expect(openReserves(next)).toEqual([]);
    expect(deliveryState(next, now, P)).toBe('in_progress');
    expect(allReservesOf(next)).toEqual([expect.objectContaining({ text: 'rayure', lotNo: 1, refused: true })]);
    expect(allReservesOf(d).map(r => r.refused)).toEqual([undefined]);
    expect(completeness(next).missing.map(m => m.key)).not.toContain('reserves');
  });
  it('never says "Reçue sans réserve" with a reservation open, nor "Réserves en retard" for a reservation of an order never delivered (D-4)', () => {
    const odd = { ...withRv(), reception: { ...withRv().reception, result: 'sans' as const } };   // an old record: "sans" with a reservation open
    expect(['reserve', 'reserve_late']).toContain(currentState(odd, now, P));
    expect(['reserve', 'reserve_late']).toContain(deliveryState(odd, now, P));
    const never = dl();
    expect(addReserve(never, { text: 'avant la livraison', by: A, at: at('2026-09-01') })).toBe(never);
  });
  it('refuses to open the next delivery while the PV of the one under way is not signed, unless a waiver says so (D-6)', () => {
    const part = setQuantities(received(released(), '2026-09-14', 'sans'), { qty: 4 }, A, at('2026-09-14', '14:35'));
    expect(nextPresentation(part, A, at('2026-09-15'))).toBe(part);
    expect(lotsOf(nextPresentation(signed(part), A, at('2026-09-15')))).toHaveLength(1);
    expect(lotsOf(nextPresentation(signWaiver(part, 'Marc', 'client injoignable', at('2026-09-14', '15:00')), A, at('2026-09-15')))).toHaveLength(1);
    const refused = refuse(arrived(released()), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14'), A);
    expect(lotsOf(nextPresentation(refused, A, at('2026-09-15')))).toHaveLength(1);   // the refusal is not a reception: unchanged
  });
  it('keeps the identity of the order as the signed closed delivery sealed it when a typed copy comes back, and leaves the rest free (reliquat of lot 1)', () => {
    const part = setQuantities(received(released(), '2026-09-14', 'sans'), { qty: 4 }, A, at('2026-09-14', '14:35')), s = st();
    const two = nextPresentation(assignPvNo(s, signed(part), at('2026-09-14', '14:41')), A, at('2026-09-15'));
    expect(lotSealState(two, 1)).toBe('intact');
    const typed = { ...two, client: 'Autre client', ref: 'CMD-999', item: 'Autre objet', promisedAt: '2026-12-01', team: ['Nicolas'] };
    const back = takeLife(typed, two);
    expect([back.client, back.ref, back.item, back.promisedAt]).toEqual(['Client A', 'CMD-1', 'Lot de pièces', undefined]);
    expect(back.team).toEqual(['Nicolas']);
    expect(lotSealState(back, 1)).toBe('intact');
    // nothing sealed yet: the identity is still free
    expect(takeLife({ ...part, client: 'Autre client' }, part).client).toBe('Autre client');
  });
});

describe('3.4 lot 2: promised day (L-5)', () => {
  const q = { ...newQuote(st(), now), id: 'q1', client: 'Client A', object: 'Garde-corps', weeks: 2, decidedAt: '2026-09-01T10:00', status: 'won' as const };
  const s = st({ quotes: { q1: q } });
  it('reads the day of the order first, else the day of its quote (decision + weeks), else nothing', () => {
    expect(promisedOn(s, dl({ quoteId: 'q1' }))).toBe('2026-09-15');
    expect(promisedOn(s, dl({ quoteId: 'q1', promisedAt: '2026-10-08' }))).toBe('2026-10-08');
    expect(promisedOn(s, dl())).toBe('');
    expect(promisedOn(s, dl({ quoteId: 'gone' }))).toBe('');
    expect(promisedOn(s, dl({ quoteId: 'constructor' }))).toBe('');
    expect(quotePromisedOn(s, 'q1')).toBe('2026-09-15');
    expect([deliveryFromQuote(s, 'constructor', P).client, deliveryFromQuote(s, 'constructor', P).quoteId]).toEqual(['', undefined]);   // an id is read as an own key (D-24 a)
    expect(quotePromisedOn(st({ quotes: { q1: { ...q, weeks: 0 } } }), 'q1')).toBe('');
    expect(quotePromisedOn(st({ quotes: { q1: { ...q, decidedAt: '' } } }), 'q1')).toBe('');
  });
  it('does not rewrite the day already typed when the quote changes its weeks', () => {
    const d = deliveryFromQuote(s, 'q1', P);
    expect(d.promisedAt).toBe('2026-09-15');
    const later = st({ quotes: { q1: { ...q, weeks: 6 } } });
    expect(promisedOn(later, d)).toBe('2026-09-15');
    expect(promisedOn(later, { quoteId: 'q1' })).toBe('2026-10-13');
  });
});

describe('3.4 lot 2: measures (D-21)', () => {
  const m = (min: number | null, max: number | null, over: Partial<Milestone> = {}): Milestone => ({ id: 'm1', label: 'Cote', point: 'Largeur', requirement: '10 à 12', measured: '', ok: null, by: '', date: '', unit: 'mm', min, max, ...over });
  it('reads the typographic minus and the en dash as a minus sign', () => {
    ['-3', '\u22123', '\u2212 3 mm'.replace(' ', ''), '\u20133'].forEach(v => expect(outOfBounds(m(-5, -1), v)).toBe(false));
    ['\u22127', '\u20137', '-7'].forEach(v => expect(outOfBounds(m(-5, -1), v)).toBe(true));
    expect(outOfBounds(m(-5, -1), '3')).toBe(true);
    expect(outOfBounds(m(10, 13), '12,5-13')).toBe(false);
    expect(outOfBounds(m(10, 13), '12,5\u201313')).toBe(false);
  });
  it('refuses "conforme" for a milestone with bounds and no value; a failure and a milestone without bounds need none', () => {
    const d = dl({ milestones: [m(10, 12), m(null, null, { id: 'm2' }), m(10, null, { id: 'm3' })] });
    const ok = (id: string, measured?: string) => checkMilestone(d, id, { ok: true, by: A, at: at('2026-09-10'), ...(measured !== undefined ? { measured } : {}) });
    expect(ok('m1')).toBe(d);
    expect(ok('m1', '  ')).toBe(d);
    expect(ok('m3')).toBe(d);
    expect(ok('m1', '11').milestones[0].ok).toBe(true);
    expect(ok('m2').milestones[1].ok).toBe(true);
    expect(checkMilestone(d, 'm1', { ok: false, by: A, at: at('2026-09-10') }).milestones[0].ok).toBe(false);
  });
  it('says the bounds changed since the check without changing its result', () => {
    const d = dl({ milestones: [m(10, 12)] });
    expect(boundsChanged(d.milestones[0])).toBe(false);
    const c = checkMilestone(d, 'm1', { ok: true, by: A, at: at('2026-09-10'), measured: '11,5' });
    expect(boundsChanged(c.milestones[0])).toBe(false);
    const narrowed = { ...c.milestones[0], max: 11 };
    expect(boundsChanged(narrowed)).toBe(true);
    expect(narrowed.ok).toBe(true);
    expect(boundsChanged({ ...c.milestones[0], min: null })).toBe(true);
    expect(boundsChanged(checkMilestone({ ...c, milestones: [narrowed] }, 'm1', { ok: false, by: A, at: at('2026-09-11'), measured: '11,5' }).milestones[0])).toBe(false);   // checked again with the new bounds
    expect(boundsChanged({ ...c.milestones[0], ok: null })).toBe(false);
    expect(boundsChanged({ ...c.milestones[0], na: true, max: 20 })).toBe(false);
    expect(boundsChanged({ ...d.milestones[0], ok: true, max: 99 })).toBe(false);   // an old result without history
  });
});

describe('3.4 lot 2: release, ship checks, archive, deadlines (D-16, D-24)', () => {
  it('says a ship check that is not conform among the facts that stand in the way of the release (D-16)', () => {
    const d = setShipCheck(allOk(dl()), 'sc_0', false, A, at('2026-09-10', '15:00')), s = st();
    expect(canRelease(s, allOk(dl())).ok).toBe(true);
    expect(sp(canRelease(s, d))).toEqual({ ok: false, why: ['Contrôle de départ « Documents remis » non conforme'] });
    expect(releaseDelivery(d, { by: 'Marc', at: at('2026-09-11') }, s)).toBe(d);
    const by = releaseDelivery(d, { by: 'Marc', at: at('2026-09-11'), derogation: { why: 'urgence client' } }, s);
    expect(by.derogation).toMatchObject({ by: 'Marc', why: 'urgence client' });
    expect(canRelease(s, setShipCheck(d, 'sc_0', null, A, at('2026-09-10', '16:00'))).ok).toBe(true);
    expect(canRelease(s, setShipCheck(d, 'sc_0', null, A, at('2026-09-10', '16:00'), true)).ok).toBe(true);
  });
  it('undoes the release, and says it, when a milestone to check is added or made applicable again (D-24 b)', () => {
    const r = released(), added = addMilestone(r, { label: 'Nouveau' }, A, at('2026-09-12'));
    expect(added.releasedAt).toBe('');
    expect(lastLog(added)?.text).toContain('Libération défaite');
    expect(canRelease(st(), added).ok).toBe(false);
    const na = IDS.slice(1).reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at('2026-09-10', '09:00') }), setMilestoneNa(dl(), 'm1', 'sans objet ici', A, at('2026-09-10', '08:00'))), rel = releaseDelivery(na, { by: 'Marc', at: at('2026-09-11') });
    expect(rel.releasedAt).toBe('2026-09-11');
    expect(setMilestoneNa(rel, 'm1', null, A, at('2026-09-12')).releasedAt).toBe('');
  });
  it('does not change an archived order by the moves of its life; a reservation of it is still lifted (D-24 c)', () => {
    const arch = archiveDelivery(dl(), at('2026-09-20'), 'terminée', A);
    expect(checkMilestone(arch, 'm1', { ok: true, by: A, at: at('2026-09-21') })).toBe(arch);
    expect(setResult(arch, 'sans', at('2026-09-21'), A)).toBe(arch);
    expect(startReception(arch, { at: at('2026-09-21') })).toBe(arch);
    expect(addMilestone(arch, { label: 'x' }, A, at('2026-09-21'))).toBe(arch);
    expect(releaseDelivery(allOk(arch), { by: 'Marc', at: at('2026-09-21') })).toBe(allOk(arch));
    expect(checkMilestone(restoreDelivery(arch, A, at('2026-09-22')), 'm1', { ok: true, by: A, at: at('2026-09-22') }).milestones[0].ok).toBe(true);
    const rv = withRvArchived();
    expect(lift(rv, reservesOf(rv)[0].id, { at: at('2026-09-21'), by: A }).reception.reserves![0].liftedAt).toBe('2026-09-21');
    function withRvArchived() { return archiveDelivery(addReserve(received(released(), '2026-09-14', 'reserve'), { text: 'rayure', by: A, at: at('2026-09-14', '14:40') }), at('2026-09-20'), 'terminée', A); }
  });
  it('does not count a deadline typed on a day off as late on the first working day after it (D-24 e)', () => {
    const rv = { id: 'r', text: 'x', raisedAt: '2026-09-28', dueAt: '2026-10-03' };   // a Saturday
    expect(reserveLateDays(rv, dl(), P, new Date(2026, 9, 5, 8, 0))).toBe(0);    // Monday morning
    expect(reserveLateDays(rv, dl(), P, new Date(2026, 9, 6, 8, 0))).toBe(1);    // Tuesday
    expect(reserveLateDays(rv, dl(), PC, new Date(2026, 9, 5, 8, 0))).toBe(2);   // calendar days: Sunday and Monday
    expect(reserveLateDays({ ...rv, dueAt: '2026-10-02' }, dl(), P, new Date(2026, 9, 5, 8, 0))).toBe(1);   // a Friday: Monday is one day late
  });
});

describe('3.4 lot 5: links with the other tools (L-2, L-10, L-12, L-15)', () => {
  const nc = (id: string, over = {}) => ({ ...newNc(st(), A, now), id, ref: 'NC-2026-001', ...over });
  const ko = (d = dl()) => checkMilestone(d, 'm2', { ok: false, by: A, at: at('2026-09-10') });
  it('reads the defect a milestone points at: none, there, or gone from 5.1 (L-2)', () => {
    const s = st({ ncs: { nc1: nc('nc1') } });
    expect(ncLinkState(s, undefined)).toBe('none');
    expect(ncLinkState(s, '')).toBe('none');
    expect(ncLinkState(s, 'nc1')).toBe('ok');
    expect(ncLinkState(s, 'gone')).toBe('missing');
    expect(ncLinkState(s, 'constructor')).toBe('missing');   // an own key only
  });
  it('declares the defect again when the one linked was deleted in 5.1, and still refuses a second one while it exists (L-2)', () => {
    const linked = linkMilestoneNc(ko(), 'm2', 'nc1', A, at('2026-09-10', '10:00')), gone = st(), there = st({ ncs: { nc1: nc('nc1'), nc2: nc('nc2') } });
    expect(linkMilestoneNc(linked, 'm2', 'nc2', A, at('2026-09-11'), there)).toBe(linked);   // the first one is still in 5.1: the screen opens it again
    expect(linkMilestoneNc(linked, 'm2', 'nc2', A, at('2026-09-11'))).toBe(linked);          // without the state: never replaced
    const again = linkMilestoneNc(linked, 'm2', 'nc2', A, at('2026-09-11'), st({ ncs: { nc2: nc('nc2') } }));
    expect(again.milestones[1].ncId).toBe('nc2');
    expect(sp(lastLog(again)?.text)).toBe("Défaut déclaré à nouveau depuis jalon 2 « Étape 2 » (le défaut lié n'existe plus dans 5.1)");
    expect(linkMilestoneNc(again, 'm2', 'nc2', A, at('2026-09-11'), st({ ncs: { nc2: nc('nc2') } }))).toBe(again);   // done twice: nothing more
    expect(ncLinkState(gone, linked.milestones[1].ncId)).toBe('missing');
  });
  it('does the same for a reservation, and says it as a fact in the journal (L-2)', () => {
    let r = addReserve(received(dl(), '2026-09-14', 'reserve'), { text: 'Rayure', by: A, at: at('2026-09-14', '14:35') });
    const rid = reservesOf(r)[0].id;
    r = linkReserveNc(r, rid, 'nc3', A, at('2026-09-14', '15:00'));
    expect(linkReserveNc(r, rid, 'nc4', A, at('2026-09-15'), st({ ncs: { nc3: nc('nc3'), nc4: nc('nc4') } }))).toBe(r);
    const again = linkReserveNc(r, rid, 'nc4', A, at('2026-09-15'), st({ ncs: { nc4: nc('nc4') } }));
    expect(reservesOf(again)[0].ncId).toBe('nc4');
    expect(sp(lastLog(again)?.text)).toBe("Défaut déclaré à nouveau depuis la réserve « Rayure » (le défaut lié n'existe plus dans 5.1)");
  });
  it('says a defect that is gone from 5.1 on the release without standing in its way (L-2)', () => {
    const d = linkMilestoneNc(allOk(dl()), 'm2', 'nc1', A, at('2026-09-10', '10:00'));
    expect(sp(canRelease(st(), d))).toEqual({ ok: true, why: [], notes: ['Jalon 2 « Étape 2 » : défaut lié introuvable dans 5.1'] });
    expect(canRelease(st({ ncs: { nc1: nc('nc1', { decision: 'retouche' }) } }), d)).toEqual({ ok: true, why: [] });   // there: no note
    expect(canRelease(st({ ncs: { nc1: nc('nc1') } }), d).ok).toBe(false);                                            // there and undecided: it stands in the way as before
    expect(releaseDelivery(d, { by: 'Marc', at: at('2026-09-11') }, st()).releasedAt).toBe('2026-09-11');            // released without a derogation
  });
  it('writes the deliverable of the order as the place of a defect of a milestone, never the label of the milestone (L-15)', () => {
    const s = st(), d = dl(), m = d.milestones[2];
    expect(ncFromMilestone(s, d, m, A, now).where).toBe('Lot de pièces');
    expect(ncFromMilestone(s, dl({ item: '' }), m, A).where).toBe('CMD-1');
    expect(ncFromMilestone(s, dl({ item: '  ', ref: '' }), m, A).where).toBe('');
    const other = dl({ id: 'dl2', item: 'Autre livrable' }), a = ncFromMilestone(s, d, m, A, now), b = ncFromMilestone(s, other, m, A, now);
    expect(a.where).not.toBe(b.where);   // the same milestone label on two orders is no longer one place
  });
  it('asks the three questions of 2.4 only once a delivery was made (L-12)', () => {
    expect(canAskFeedback(dl())).toBe(false);
    expect(canAskFeedback(released())).toBe(false);
    expect(canAskFeedback(arrived(released(), '2026-09-14'))).toBe(true);
    const refused = refuse(arrived(released(), '2026-09-14'), { reason: 'Documents manquants', next: 'À reprendre et représenter' }, at('2026-09-14', '15:00'), A);
    const second = nextPresentation(setPvPhoto(refused, 'photo:paper-1-1', at('2026-09-14', '15:10'), A), A, at('2026-09-15'));
    expect(second.reception.date).toBe('');
    expect(canAskFeedback(second)).toBe(true);   // the delivery refused is closed in `lots`: a delivery was made
  });
  it('does not delete an order that a review of the end points at, and says why; otherwise says what would be lost (L-12)', () => {
    const fb = (deliveryId?: string) => ({ f1: { id: 'f1', deliveryId } as never });
    expect(deletable(st({ feedbacks: {} }), dl())).toBe('');
    expect(deletable(st({ feedbacks: fb('other') }), dl())).toBe('');
    expect(sp(deletable(st({ feedbacks: fb('dl1') }), dl()))).toBe('Un bilan de fin est lié à cette commande : archiver');
    const checked = checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') });
    expect(deletable(st({ feedbacks: {} }), checked)).toBe(lostByDeleting(checked));
    expect(deletable(st({ feedbacks: {} }), checked)).toContain('1 jalon contrôlé');
    expect(sp(deletable(st({ feedbacks: fb('dl1') }), checked))).toBe('Un bilan de fin est lié à cette commande : archiver');   // the review comes first
    expect(canDelete(dl())).toBe(true);   // the old rule alone keeps its meaning
  });
  it('reads the breakdowns of 3.3 that touched an order, without changing the equipments (L-10)', () => {
    const bd = (id: string, date: string, over = {}) => ({ id, date, hours: null, cost: null, cause: '', ...over });
    const eq = (id: string, name: string, breakdowns: ReturnType<typeof bd>[]) => ({ [id]: { id, name, location: '', operator: '', manager: '', riskId: '', checkpoints: [], inspections: [], parts: [], breakdowns } as never });
    const s = st({ equipments: {
      ...eq('e1', 'Presse 80 t', [bd('b2', '2026-09-12', { deliveryIds: ['dl1', 'dl9'] }), bd('b1', '2026-09-02', { startedAt: '2026-09-02T07:30', deliveryIds: ['dl1'] }), bd('b3', '2026-09-03', { deliveryIds: ['dl9'] }), bd('b4', '2026-09-04')]),
      ...eq('e2', 'Four', [bd('b5', '2026-09-08', { deliveryIds: ['dl1'] })]), ...eq('e3', 'Scie', []),
    } });
    const before = JSON.stringify(s.equipments);
    expect(breakdownsTouching(s, dl())).toEqual([
      { equipmentName: 'Presse 80 t', at: '2026-09-02T07:30', id: 'b1' }, { equipmentName: 'Four', at: '2026-09-08', id: 'b5' }, { equipmentName: 'Presse 80 t', at: '2026-09-12', id: 'b2' },
    ]);
    expect(breakdownsTouching(s, dl({ id: 'dl7' }))).toEqual([]);
    expect(breakdownsTouching(st(), dl())).toEqual([]);
    expect(JSON.stringify(s.equipments)).toBe(before);
  });
});

// ---- lot 8: the words and the typography of the texts (A-4, A-5, A-11, A-12, A-13)
describe('3.4 lot 8: the agreement of the words (A-4)', () => {
  it('puts the word in the singular for 0 and 1 and in the plural from 2, the word alone or the group that carries the agreement', () => {
    expect([0, 1, 2, 3].map(n => plural(n, 'jour'))).toEqual(['0 jour', '1 jour', '2 jours', '3 jours']);
    expect([0, 1, 2].map(n => plural(n, 'autre tâche', 'autres tâches'))).toEqual(['0 autre tâche', '1 autre tâche', '2 autres tâches']);   // never "2 autre tâches"
    expect([0, 1, 2].map(n => plural(n, 'jour ouvré', 'jours ouvrés'))).toEqual(['0 jour ouvré', '1 jour ouvré', '2 jours ouvrés']);
    expect([0, 1, 2].map(n => plural(n, 'réserve non levée', 'réserves non levées'))).toEqual(['0 réserve non levée', '1 réserve non levée', '2 réserves non levées']);
  });
  it('says "de" before a consonant and "d\'" before a vowel in front of the name of a person', () => {
    expect(['Antoine P.', 'Élodie', 'Hugo', 'Karim T.', 'Mme Perret', ' Awa '].map(de)).toEqual(["d'Antoine P.", "d'Élodie", "d'Hugo", 'de Karim T.', 'de Mme Perret', "d'Awa"]);
  });
  it('quotes a reservation that has a text, and says one that is a photo alone without quoting a made-up text', () => {
    expect(reserveWords('Poignée desserrée')).toBe('« Poignée desserrée »');
    expect(reserveWords('  ')).toBe('sans texte (photo seule)');
    expect(reserveWords(undefined)).toBe('sans texte (photo seule)');
    const d = addReserve(received(released(), '2026-09-14', 'reserve'), { text: '', photo: 'photo:r-1-1', by: A, at: at('2026-09-14', '14:35') });
    expect(sp(lastLog(d)?.text)).toBe('Réserve ajoutée : sans texte (photo seule)');
    expect(JSON.stringify(d.journal)).not.toContain('voir la photo');
    const l = lift(d, d.reception.reserves![0].id, { at: at('2026-09-15'), by: A });
    expect(sp(lastLog(l)?.text)).toMatch(/^Réserve sans texte \(photo seule\) levée enregistrée par Alice/);
  });
  it('writes the label of a milestone with a small letter in the middle of a sentence and with a capital at the start of one', () => {
    const w = waiveMilestone(checkMilestone(dl(), 'm2', { ok: false, by: A, at: at('2026-09-10') }), 'm2', 'Marc', 'Accord du client', at('2026-09-11'));
    expect(sp(lastLog(w)?.text)).toBe('Dérogation sur jalon 2 « Étape 2 » non conforme : Accord du client');
    expect(sp(lastLog(checkMilestone(dl(), 'm1', { ok: true, by: A, at: at('2026-09-10') }))?.text)).toBe('Jalon 1 « Étape 1 » conforme');
    const r = releaseDelivery(allOk(dl()), { by: 'Marc', at: at('2026-09-11', '16:00') });
    expect(sp(reopenMilestone(r, 'm3', A, at('2026-09-12'))?.journal?.slice(-2).map(l => l.text))).toEqual(['Libération défaite : jalon 3 « Étape 3 » rouvert', 'Jalon 3 « Étape 3 » rouvert (résultat précédent : conforme)']);
    const list = canRelease(st(), dl()).why;
    expect(sp(list[0])).toBe('Jalon 1 « Étape 1 » à contrôler');   // an item of a list starts with a capital
  });
});

describe('3.4 lot 8: the same words everywhere (A-5, A-13)', () => {
  it('says "avec réserve" and never "(s)" in the journal, the correction and the sentences of the result', () => {
    const d = setResult(arrived(released()), 'reserve', at('2026-09-14', '14:30'), A);
    expect(sp(lastLog(d)?.text)).toBe('Résultat de la réception : avec réserve');
    const c = correctLocked(signed(received(released())), { result: 'reserve', _why: 'Erreur de saisie' }, A, at('2026-09-15'));
    expect(sp(c.journal?.at(-2)?.text)).toBe('Corrigé : résultat sans réserve → avec réserve (motif : Erreur de saisie)');
    Object.values(receptionExamples(now).deliveries).forEach(x => expect(JSON.stringify(x.journal ?? []), x.id).not.toContain('(s)'));
  });
  it('says "livraison" for the event and the quantity delivered, "réception refusée" for a refusal and "restaurée" for an order put back', () => {
    const q = setQuantities(received(released()), { qty: 7.5 }, A, at('2026-09-14', '14:35'));
    expect(sp(lastLog(q)?.text)).toBe('Quantité livrée : 7,5');
    const d = nextPresentation(refuse(arrived(released(), '2026-09-14'), { reason: 'Documents manquants', next: DEFAULT_NEXTS[0] }, at('2026-09-14', '15:00'), A, undefined), A, at('2026-09-15'));
    expect(sp(lastLog(d)?.text)).toBe('Réception refusée à la livraison 1 : livraison 2 ouverte');
    expect(sp(lastLog(restoreDelivery(archiveDelivery(dl(), at('2026-09-20'), 'x'), A, at('2026-09-21')))?.text)).toBe('Commande restaurée');
    expect(JSON.stringify([DEFAULT_NEXTS, DEFAULT_REFUSALS, DEFAULT_SHIP_CHECKS])).not.toMatch(/représent|présentée|Emballage|Accessoires/);
  });
  it('says "plage attendue" for the bounds of a measure', () => {
    const d = { ...dl(), milestones: ms().map((m, i) => (i === 1 ? { ...m, unit: 'mm', min: 10, max: 12 } : m)) };
    const out = checkMilestone(d, 'm2', { ok: true, measured: '12,8', by: A, at: at('2026-09-10', '09:05') });
    expect(out.milestones[1].history?.[0].note).toBe('mesure hors de la plage attendue');
    expect(sp(lastLog(out)?.text)).toBe('Jalon 2 « Étape 2 » non conforme (12,8 mm), mesure hors de la plage attendue');
    expect(JSON.stringify(out.journal)).not.toContain('bornes');
  });
});

describe('3.4 lot 8: the typography and the days (A-11, A-12)', () => {
  it('writes a narrow no-break space before : ; ? ! % » and after «, and no-break spaces inside an hour', () => {
    expect(nb('Réserve « Poignée » : 10 % ; 14 h 05 ? 48 h !')).toBe('Réserve «\u202fPoignée\u202f»\u202f: 10\u202f%\u202f; 14\u00a0h\u00a005\u202f? 48\u00a0h\u202f!');
    expect(nb('Sans signe')).toBe('Sans signe');
    expect(nb('10:30 et http://x')).toBe('10:30 et http://x');   // no space, nothing to hold
    const once = nb('Livrée le 4 oct. à 9 h 05 : « OK »');
    expect(nb(once)).toBe(once);   // a text already set stays as it is
  });
  it('says a day as "4 oct.", with the year only when it is not the current one, and a moment as "4 oct. à 9 h 05"', () => {
    const today = new Date(2026, 9, 7);
    expect(sp(rcDay('2026-10-04', today))).toBe('4 oct.');
    expect(sp(rcDay('2026-10-04T14:05', today))).toBe('4 oct.');
    expect(sp(rcDay('2025-10-04', today))).toBe('4 oct. 2025');
    expect(['2026-01-01', '2026-03-09', '2026-08-31', '2026-12-25'].map(x => sp(rcDay(x, today)))).toEqual(['1 janv.', '9 mars', '31 août', '25 déc.']);
    expect(['', undefined, 'n.c.', '2026-13-01'].map(x => rcDay(x, today))).toEqual(['', '', '', '']);
    expect(sp(rcMoment('2026-10-04T09:05', today))).toBe('4 oct. à 9 h 05');       // never "09 h 05"
    expect(sp(rcMoment('2026-10-04T14:30', today))).toBe('4 oct. à 14 h 30');
    expect(sp(rcMoment('2026-10-04T00:07', today))).toBe('4 oct. à 0 h 07');
    expect(sp(rcMoment('2025-10-04T09:05', today))).toBe('4 oct. 2025 à 9 h 05');
    expect(sp(rcMoment('2026-10-04', today))).toBe('4 oct.');                            // the day alone when there is no hour
    expect(rcMoment('', today)).toBe('');
    expect(rcMoment('2026-10-04T09:05', today)).toContain('\u00a0h\u00a0');        // the hour holds together
  });
  it('holds the typography in every text the domain writes for the screen: the journal, the facts of the release and of the signature', () => {
    const d = signed(received(released(waiveMilestone(checkMilestone(dl(), 'm2', { ok: false, by: A, at: at('2026-09-10') }), 'm2', 'Marc', 'Accord', at('2026-09-11')))));
    const lines = [...d.journal!.map(l => l.text), ...canRelease(st(), dl()).why, ...signBlockers(st(), dl(), now), ...waivedFacts(d), ...derogationFacts(d)];
    expect(lines.length).toBeGreaterThan(8);
    lines.forEach(t => { expect(t).not.toMatch(/ [:;?!%»]/); expect(t).not.toMatch(/« /); expect(t).not.toMatch(/\d h \d/); });
  });
  it('says a mention of "Autre, précisez" for a PV signed by nobody: the words typed, a witness, nothing without them', () => {
    const base = released(), w = (d: Delivery, o?: string) => setNoSign(arrived(d), 'other', 'Gardien', at('2026-09-14', '14:50'), A, 'Client', undefined, o);
    expect(w(base)).toEqual(arrived(base));   // nothing typed: nothing written
    expect(w(base, '  ')).toEqual(arrived(base));
    const x = w(base, 'Client injoignable');
    expect(x.reception.noSign).toEqual({ kind: 'other', other: 'Client injoignable', witness: 'Gardien', at: at('2026-09-14', '14:50'), witnessOrg: 'Client' });
    expect(sp(lastLog(x)?.text)).toBe('PV sans signature du client : Client injoignable (témoin : Gardien, Client)');
    expect(noSignWords(x.reception.noSign!)).toBe('Client injoignable');
    expect(['absent', 'refused'].map(k => noSignWords({ kind: k as 'absent', witness: 'W', at: '' }))).toEqual(['client absent', 'signature refusée']);
    expect(pvSigned(x)).toBe(true);
  });
});
