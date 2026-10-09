// Tool 3.4, two copies of one order become one (G-3, S-4, S-5): the rules of mergeDelivery and the numbers of the PV carried twice.
import { describe, expect, it } from 'vitest';
import type { Delivery, Milestone, Reception, Strokes } from './types';
import {
  addReserve, archiveDelivery, checkMilestone, isLocked, liftReserve, logDelivery, newDelivery, nextPresentation, openReserves, pvSigned, releaseDelivery, reopenMilestone, restoreDelivery, sealState,
  setNoSign, setPvPhoto, setQuantities, setReceptionist, setResult, setShipCheck, signClient, signCompany, startReception, unreleaseDelivery, correctLocked,
} from './receptions';
import { mergeDelivery, pvCarriers, pvDuplicates } from './receptionsMerge';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import type { State } from './types';

const plain = (x: string) => x.replace(/[  ]/g, ' ');
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const P = st().params;
const at = (dayIso: string, hm = '10:00') => `${dayIso}T${hm}`;
const ink = (n = 0): Strokes => [[[10 + n, 10], [60, 40], [120, 20], [160, 60], [220 + n, 30]]];
const ms = (n = 4): Milestone[] => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id: 'dl1', ref: 'CMD-1', client: 'Client A', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const IDS = ['m1', 'm2', 'm3', 'm4'];
const check = (d: Delivery, id: string, hm: string, by = 'Karim', day = '2026-10-06') => checkMilestone(d, id, { ok: true, by, at: at(day, hm) });
const allOk = (d: Delivery) => IDS.reduce((x, id, i) => check(x, id, `09:0${i}`), d);
const released = (d: Delivery = dl()) => releaseDelivery(allOk(d), { by: 'Marc', at: at('2026-10-06', '10:00') });
const arrived = (d: Delivery) => startReception(d, { at: at('2026-10-06', '14:00'), place: 'Chantier' });
const received = (d: Delivery, hm = '14:30') => setResult(arrived(d), 'sans', at('2026-10-06', hm), 'Alice');
const signed = (d: Delivery, hm = '14:40', n = 0) => signClient(received(d), ink(n), at('2026-10-06', hm), 'Alice');
const proofs = (d: Delivery) => (d.journal ?? []).filter(l => l.proof).map(l => plain(l.text));

describe('mergeDelivery: what both copies did is kept (S-4, S-5)', () => {
  it('the checks of the workshop and the typed content of the office: both stay (the later copy gives the typed content)', () => {
    const base = dl(), workshop = ['m1', 'm2', 'm3'].reduce((x, id, i) => check(x, id, `09:0${i}`), base), office = { ...base, item: 'Livrable corrigé', promisedAt: '2026-10-20' };
    const m = mergeDelivery(workshop, office, 'b');
    expect(m.milestones.filter(x => x.ok === true)).toHaveLength(3);
    expect(m.journal).toHaveLength(workshop.journal!.length);
    expect([m.item, m.promisedAt]).toEqual(['Livrable corrigé', '2026-10-20']);
    expect(mergeDelivery(office, workshop, 'a')).toEqual(m);                                 // the same, the copies given the other way round
    expect(mergeDelivery(workshop, office).item).toBe('Lot de pièces');                       // without the order of the copies the one that did more leads: the typed content of the workshop stays
  });
  it('a signature given on one copy is not erased by a stale copy saved later (a3 of the audit)', () => {
    const base = dl(), tablet = signed(released(base)), office = { ...released(base), qty: 12 };
    const m = mergeDelivery(tablet, office, 'b');
    expect(pvSigned(m)).toBe(true);
    expect(m.reception.result).toBe('sans');
    expect(m.signClient).toEqual(ink());
    expect(m.reception.seals).toHaveLength(tablet.reception.seals!.length);
    expect(sealState(m)).toBe('intact');                                                       // the signed content is the one that stands, its seal still matches
    expect(m.qty).toBe(10);                                                                    // the order as it was signed
    expect(proofs(m).some(t => t.startsWith('conflit : version signée à 14 h 40 gardée'))).toBe(true);
  });
  it('the signed copy and an older copy without anything new: no conflict is said', () => {
    const base = released(), tablet = signed(base), m = mergeDelivery(tablet, base);
    expect(m).toEqual(tablet);
    expect(proofs(m).filter(t => t.startsWith('conflit'))).toEqual([]);
  });
  it('S-5: a phone brings the checks and the PV of an order the computer holds as it was', () => {
    const base = dl(), phone = signed(released(base)), computer = { ...base, ref: 'CMD-1 bis' };
    const m = mergeDelivery(phone, computer, 'b');
    expect(isLocked(m)).toBe(true);
    expect(m.releasedBy).toBe('Marc');
    expect(m.milestones.every(x => x.ok === true)).toBe(true);
    expect(m.reception.pvNo).toBeUndefined();
  });
  it('the first signature wins, whatever its kind, and is never replaced by an absence', () => {
    const base = released(arrived(dl())), a = signCompany(signClient(setResult(base, 'sans', at('2026-10-06', '14:30'), 'Alice'), ink(1), at('2026-10-06', '14:40'), 'Alice'), ink(2), at('2026-10-06', '14:45'), 'Marc');
    const b = signClient(setResult(base, 'sans', at('2026-10-06', '14:31'), 'Alice'), ink(3), at('2026-10-06', '14:50'), 'Bob');   // signed later on another copy
    const m = mergeDelivery(a, b);
    expect(m.signClient).toEqual(ink(1));                    // the earlier one
    expect(m.signCompany).toEqual(ink(2));                   // the company signed only on one copy: it stays
    expect(m.reception.signedAt).toBe(at('2026-10-06', '14:40'));
    expect(m.reception.companySignedAt).toBe(at('2026-10-06', '14:45'));
    expect(mergeDelivery(b, a)).toEqual(m);
  });
  it('the witness of a PV without signature and the photo of the paper PV are kept the same way', () => {
    const base = released(received(dl())), witness = setNoSign(base, 'absent', 'Mme Roux', at('2026-10-06', '15:00'), 'Alice'), plainCopy = base;
    expect(mergeDelivery(witness, plainCopy).reception.noSign).toMatchObject({ kind: 'absent', witness: 'Mme Roux' });
    const photo = setPvPhoto(base, 'photo:aaaaaaaaaaaaaaaaaaaaaaaa-100-100', at('2026-10-06', '15:10'), 'Alice');
    const m = mergeDelivery(photo, plainCopy);
    expect(m.pvPhoto).toBe('photo:aaaaaaaaaaaaaaaaaaaaaaaa-100-100');
    expect(m.reception.pvPhotoAt).toBe(at('2026-10-06', '15:10'));
  });
  it('two copies signed differently: the one signed first is kept, the journal says it with the moment', () => {
    const base = released(arrived(dl())), early = signClient(setResult(base, 'sans', at('2026-10-06', '14:30'), 'Alice'), ink(1), at('2026-10-06', '14:40'), 'Alice');
    const late = signClient(setResult(base, 'reserve', at('2026-10-06', '14:35'), 'Bob'), ink(2), at('2026-10-06', '15:10'), 'Bob');
    const m = mergeDelivery(late, early);
    expect(m.signClient).toEqual(ink(1));
    expect(m.reception.result).toBe('sans');
    expect(sealState(m)).toBe('intact');
    const lines = (m.journal ?? []).filter(l => plain(l.text).startsWith('conflit'));
    expect(lines).toHaveLength(1);
    expect(plain(lines[0].text)).toBe('conflit : version signée à 14 h 40 gardée, autre version non reprise');
    expect(lines[0]).toMatchObject({ proof: true, at: at('2026-10-06', '14:40') });
    expect(mergeDelivery(early, late)).toEqual(m);
    expect(mergeDelivery(m, late)).toEqual(m);                 // merged again with the copy that was not retaken: nothing new
    expect(mergeDelivery(m, early)).toEqual(m);
  });
  it('the lifts of reservations and the corrections made after the signature are kept; the seals are united and the last one is the one of the content kept', () => {
    const rv = (d: Delivery) => d.reception.reserves![0].id;
    const base = addReserve(received(released(dl()), '14:30'), { text: 'Rayure', by: 'Alice', at: at('2026-10-06', '14:35') }), s0 = signClient(setResult(base, 'reserve', at('2026-10-06', '14:36'), 'Alice'), ink(), at('2026-10-06', '14:40'), 'Alice');
    const lifted = liftReserve(s0, rv(s0), { at: at('2026-10-07', '09:00'), by: 'Marc', note: 'Repris', now: at('2026-10-07', '09:00') });
    const corrected = correctLocked(s0, { place: 'Quai 2', _why: 'Lieu erroné' }, 'Marc', at('2026-10-06', '16:00'));
    const m = mergeDelivery(lifted, corrected);
    expect(m.reception.reserves![0].liftedAt).toBe('2026-10-07');                              // the lift is a follow-up: it is not sealed
    expect(m.reception.place).toBe('Quai 2');
    expect(openReserves(m)).toHaveLength(0);
    expect(m.reception.seals!.at(-1)!.hash).toBe(corrected.reception.seals!.at(-1)!.hash);
    expect(m.reception.seals).toHaveLength(corrected.reception.seals!.length);
    expect(sealState(m)).toBe('intact');
    expect(mergeDelivery(corrected, lifted)).toEqual(m);
  });
});

describe('mergeDelivery: the journal, the release, the milestones, the closed deliveries', () => {
  it('the journal is the union of both by (moment, text), the proof lines included, without doubles', () => {
    const base = released(dl()), a = logDelivery(base, 'Alice', at('2026-10-06', '11:00'), 'Note A'), b = logDelivery(logDelivery(base, 'Bob', at('2026-10-06', '11:00'), 'Note A'), 'Bob', at('2026-10-06', '11:05'), 'Preuve B', true);
    const m = mergeDelivery(a, b);
    expect(m.journal!.filter(l => l.text === 'Note A')).toHaveLength(1);
    expect(m.journal!.some(l => l.text === 'Preuve B' && l.proof)).toBe(true);
    expect(m.journal).toHaveLength(base.journal!.length + 2);
    expect([...m.journal!].map(l => l.at)).toEqual([...m.journal!].map(l => l.at).sort());
  });
  it('the cap of 300 lines of noise stands and the proof lines are never dropped', () => {
    let a = released(dl()), b = a;
    for (let i = 0; i < 200; i++) { a = logDelivery(a, 'A', at('2026-10-07', `${String(10 + (i >> 6)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`), `A ${i}`); b = logDelivery(b, 'B', at('2026-10-08', `${String(10 + (i >> 6)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`), `B ${i}`); }
    const m = mergeDelivery(a, b);
    expect(m.journal!.filter(l => !l.proof)).toHaveLength(300);
    expect(m.journal!.filter(l => l.proof).length).toBe(a.journal!.filter(l => l.proof).length);
    expect(m.journal!.at(-1)!.text).toBe('B 199');
  });
  it('a release made on one copy is not undone by the other; undone after it, it stays undone; made again after, it stands', () => {
    const base = allOk(dl()), rel = releaseDelivery(base, { by: 'Marc', at: at('2026-10-06', '10:00') });
    expect(mergeDelivery(rel, base).releasedBy).toBe('Marc');
    expect(mergeDelivery(base, rel).releasedAt).toBe('2026-10-06');
    const undone = unreleaseDelivery(rel, 'Marc', 'Erreur de saisie', at('2026-10-06', '11:00'));
    const m = mergeDelivery(undone, rel);                                   // the other copy still holds the release the first one undid
    expect(m.releasedAt).toBe('');
    expect(m.releasedMoment).toBeUndefined();
    const again = releaseDelivery(undone, { by: 'Paul', at: at('2026-10-06', '12:00') });
    expect(mergeDelivery(again, rel).releasedBy).toBe('Paul');
    expect(mergeDelivery(rel, again)).toEqual(mergeDelivery(again, rel));
  });
  it('a milestone checked on both copies: the history is the union, the result is the latest check; a milestone only one copy holds comes along', () => {
    const base = dl(), a = checkMilestone(check(base, 'm1', '09:00'), 'm2', { ok: false, by: 'Karim', at: at('2026-10-06', '09:10'), measured: '3' });
    const b = reopenMilestone(checkMilestone(check(base, 'm1', '09:00'), 'm2', { ok: true, by: 'Léa', at: at('2026-10-06', '09:20') }), 'm1', 'Léa', at('2026-10-06', '09:30'));
    const extra = { ...b, milestones: [...b.milestones, { id: 'm5', label: 'Ajouté', point: 'p', requirement: 'e', measured: '', ok: null, by: '', date: '' }] };
    const m = mergeDelivery(a, extra);
    const m2 = m.milestones.find(x => x.id === 'm2')!, m1 = m.milestones.find(x => x.id === 'm1')!;
    expect(m2.history!.map(e => e.at)).toEqual([at('2026-10-06', '09:10'), at('2026-10-06', '09:20')]);
    expect([m2.ok, m2.by]).toEqual([true, 'Léa']);                                            // the later check
    expect(m1.ok).toBeNull();                                                                 // reopened after the check both hold
    expect(m1.history!).toHaveLength(2);
    expect(m.milestones.map(x => x.id)).toEqual(m.milestones.length === 5 ? ['m1', 'm2', 'm3', 'm4', 'm5'] : []);
    expect(mergeDelivery(extra, a)).toEqual(m);
  });
  it('the deliveries are put by number: a copy that closed the first one and a copy still on it become one order', () => {
    const first = signClient(setResult(setQuantities(arrived(released(dl())), { qty: 4 }, 'Alice', at('2026-10-06', '14:10')), 'sans', at('2026-10-06', '14:30'), 'Alice'), ink(), at('2026-10-06', '14:40'), 'Alice'), closed = nextPresentation(first, 'Alice', at('2026-10-07', '09:00'));
    expect(closed.lots).toHaveLength(1);
    const stale = { ...first, reception: { ...first.reception, place: 'Quai 3' } };             // the copy that did not see the closing
    const m = mergeDelivery(closed, stale, 'a');
    expect(m.lots).toHaveLength(1);
    expect(m.lots![0].reception.signedAt).toBe(first.reception.signedAt);
    expect(m.reception.result).toBe('');                                                      // the delivery under way is the second one
    expect(m.milestones.every(x => x.ok === null)).toBe(true);
    expect(mergeDelivery(stale, closed, 'b')).toEqual(m);
  });
  it('archived on one copy, restored later on the other: restored; archived only: archived', () => {
    const base = dl(), arch = archiveDelivery(base, at('2026-10-06', '12:00'), 'Doublon', 'Alice');
    expect(mergeDelivery(arch, base).archivedAt).toBe(at('2026-10-06', '12:00'));
    const back = restoreDelivery(arch, 'Alice', at('2026-10-06', '13:00'));
    expect(mergeDelivery(back, arch).archivedAt).toBeUndefined();
  });
  it('a copy that is not an order or is damaged never makes the merge fail', () => {
    const d = dl();
    expect(mergeDelivery(d, null as never)).toBe(d);
    expect(mergeDelivery(undefined as never, d)).toBe(d);
    const hurt = { id: 'dl1', milestones: 'x', reception: null, lots: 3, journal: [null, 1] } as never;
    expect(() => mergeDelivery(d, hurt)).not.toThrow();
    expect(mergeDelivery(d, hurt).milestones).toHaveLength(4);
  });
});

// ---- idempotent and commutative on pairs drawn at random from the gestures of the tool
const rng = (seed: number) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hm = (n: number) => `${String(8 + (n >> 6)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
type Op = (d: Delivery, n: number, by: string) => Delivery;
const OPS: Op[] = [
  (d, n, by) => checkMilestone(d, IDS[n % 4], { ok: n % 3 !== 0, measured: n % 5 === 0 ? '12' : '', by, at: at('2026-10-06', hm(n)) }),
  (d, n, by) => reopenMilestone(d, IDS[n % 4], by, at('2026-10-06', hm(n))),
  (d, n, by) => releaseDelivery(d, { by, at: at('2026-10-06', hm(n)), derogation: { why: 'Urgence du client' } }),
  (d, n, by) => unreleaseDelivery(d, by, 'Erreur', at('2026-10-06', hm(n))),
  (d, n, by) => startReception(d, { at: at('2026-10-06', hm(n)), place: n % 2 ? 'Quai' : 'Chantier', by }),
  (d, n, by) => setResult(d, n % 2 ? 'sans' : 'reserve', at('2026-10-06', hm(n)), by),
  (d, n, by) => addReserve(d, { text: `Réserve ${n % 7}`, by, at: at('2026-10-06', hm(n)) }),
  (d, n, by) => { const r = d.reception.reserves?.find(x => !x.liftedAt); return r ? liftReserve(d, r.id, { at: at('2026-10-07', hm(n)), by, note: 'Levée', now: at('2026-10-07', hm(n)) }) : d; },
  (d, n, by) => signClient(d, ink(n % 9), at('2026-10-06', hm(n)), by),
  (d, n, by) => signCompany(d, ink(20 + (n % 9)), at('2026-10-06', hm(n)), by),
  (d, n, by) => setShipCheck(d, 'sc_0', n % 2 === 0, by, at('2026-10-06', hm(n))),
  (d, n) => setReceptionist(d, { name: `Nom ${n % 4}`, role: n % 2 ? 'Chef de chantier' : '' }),
  (d, n) => ({ ...d, item: `Livrable ${n % 5}`, qty: 10 + (n % 3) }),
  (d, n, by) => logDelivery(d, by, at('2026-10-06', hm(n)), `Note ${n % 11}`, n % 4 === 0),
  (d, n, by) => nextPresentation(d, by, at('2026-10-07', hm(n)), 3),
  (d, n, by) => (n % 2 ? archiveDelivery(d, at('2026-10-07', hm(n)), 'Doublon', by) : restoreDelivery(d, by, at('2026-10-07', hm(n)))),
  (d, n, by) => setPvPhoto(d, `photo:${String(n % 5).padStart(24, 'a')}-10-10`, at('2026-10-06', hm(n)), by),
  (d, n, by) => setNoSign(d, 'absent', `Témoin ${n % 3}`, at('2026-10-06', hm(n)), by),
  (d, n, by) => correctLocked(d, { place: `Quai ${n % 4}`, _why: 'Correction' }, by, at('2026-10-06', hm(n))),
];
// The clock of a copy only goes forward (the tool refuses a signature when it is behind the last act): each gesture is a few minutes after the previous one
function random(seed: number): { a: Delivery; b: Delivery } {
  const r = rng(seed), steps = (d: Delivery, k: number, t: { n: number }, by: string[]) => { for (let i = 0; i < k; i++) { t.n += 1 + Math.floor(r() * 6); d = OPS[Math.floor(r() * OPS.length)](d, t.n, by[Math.floor(r() * by.length)]); } return d; };
  const clock = { n: 0 }, base = steps(dl(), Math.floor(r() * 12), clock, ['Alice', 'Bob']);
  return { a: steps(base, 1 + Math.floor(r() * 10), { n: clock.n }, ['Alice', 'Karim']), b: steps(base, 1 + Math.floor(r() * 10), { n: clock.n + Math.floor(r() * 10) }, ['Bob', 'Léa']) };
}
describe('mergeDelivery: idempotent and commutative, on 200 random pairs', () => {
  const pairs = Array.from({ length: 200 }, (_, i) => random(1000 + i));
  it('merging a copy with itself changes nothing', () => {
    pairs.forEach(({ a, b }) => { expect(mergeDelivery(a, a)).toEqual(a); expect(mergeDelivery(b, b)).toEqual(b); });
  });
  it('the order of the two copies changes nothing', () => {
    pairs.forEach(({ a, b }, i) => { expect(mergeDelivery(a, b), `pair ${i}`).toEqual(mergeDelivery(b, a)); });
  });
  it('merging the result (the later copy) again with either copy changes nothing, and nothing a person did is lost', () => {
    pairs.forEach(({ a, b }, i) => {
      const m = mergeDelivery(a, b), noConflict = (d: Delivery) => ({ ...d, journal: (d.journal ?? []).filter(l => !plain(l.text).startsWith('conflit')) });   // a conflict is said once the second time the copy is met
      expect(noConflict(mergeDelivery(m, a, 'a')), `pair ${i} with a`).toEqual(noConflict(m));
      expect(noConflict(mergeDelivery(m, b, 'a')), `pair ${i} with b`).toEqual(noConflict(m));
      for (const x of [a, b]) {
        const lines = new Set((m.journal ?? []).map(l => `${l.at}|${l.text}`));
        (x.journal ?? []).filter(l => l.proof).forEach(l => expect(lines.has(`${l.at}|${l.text}`), `pair ${i}: ${l.text}`).toBe(true));
        if (isLocked(x) && !isLocked(m)) throw new Error(`pair ${i}: a locked copy is not locked once merged`);
        const said = (re: RegExp) => (m.journal ?? []).some(l => re.test(plain(l.text))), conflict = said(/^conflit/);   // what a signed PV does not take is said, never silently dropped
        if (x.releasedAt) expect(!!m.releasedAt || conflict || said(/^Libération (défaite|annulée)/), `pair ${i}: release`).toBe(true);
        (x.reception.reserves ?? []).filter(r => r.liftedAt).forEach(r => expect(!!m.reception.reserves?.find(y => y.id === r.id)?.liftedAt || conflict, `pair ${i}: lift`).toBe(true));
      }
    });
  });
});

describe('the numbers of the PV carried twice', () => {
  const withNo = (id: string, no: string, lots: string[] = []): Delivery => dl({ id, ref: id, reception: { ...dl().reception, pvNo: no }, ...(lots.length ? { lots: lots.map((n, i) => ({ id: `lt${i}`, no: i + 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception: { ...dl().reception, pvNo: n } as Reception })) } : {}) });
  it('lists a number held by two orders, or by two deliveries of one, in the order of the numbers', () => {
    const ds = [withNo('a', 'PV-2026-011'), withNo('b', 'PV-2026-011'), withNo('c', 'PV-2026-012', ['PV-2026-012']), withNo('d', 'PV-2026-013')];
    expect(pvDuplicates(ds).map(x => [x.no, x.carriers.map(c => `${c.d.id}:${c.no}`)])).toEqual([['PV-2026-011', ['a:1', 'b:1']], ['PV-2026-012', ['c:1', 'c:2']]]);
    expect([...pvCarriers(ds).keys()]).toEqual(['PV-2026-011', 'PV-2026-012', 'PV-2026-013']);
    expect(pvDuplicates([withNo('x', ''), withNo('y', 'PV-2026-x')])).toEqual([]);
  });
});
