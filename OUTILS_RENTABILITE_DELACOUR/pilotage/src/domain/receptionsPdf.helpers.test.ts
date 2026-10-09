// The sentences and the helpers of the PV (receptionsPdf.ts), tested one by one (lot 9, T-10): the screen, the paper and the file read the same words from them, and until now they were
// reached only through the text of the 14 examples. Then the three rules of the file that no example reached: the corrections after the signature (printed once, on the last delivery
// only) and the person who signed for the company (the line of the journal that matches the moment printed).
import { describe, expect, it } from 'vitest';
import type { Delivery, Milestone, Reception, ReceptionReserve, Strokes } from './types';
import {
  CLOCK_NOTE, MS_LABEL, SEVERITY_LABEL, atFr, boundsWords, clientSignAt, clientSigner, clockText, companySigner, controlFacts, corrections, deliveredAt, deliveryAt, editedAt, instrumentName, liftLine, liftedAfterSign, milestoneFacts, msLabel,
  noSignHead, noSignText, orderRows, photosLine, postponed, pvPdf, receptionistText, refusalLines, releaseLines, reserveName, resultText, sealView, shipChecksDone, shipLabel, valueText, NO_NAME, NO_RECEIVER,
} from './receptionsPdf';
import { OTHER, addReserve, checkMilestone, correctLocked, newDelivery, nextPresentation, releaseDelivery, setNoSign, setResult, signClient, signCompany, signWaiver, startReception, sealOf, sealState, refuse, repairReserve, reservesOf } from './receptions';
import { DEFAULT_PARAMS } from './base';

const plain = <T,>(x: T): T => (typeof x === 'string' ? x.replace(/[  ]/g, ' ') : Array.isArray(x) ? x.map(plain) : x) as T;
const textOf = (pdf: string) => [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m => new TextDecoder('windows-1252').decode(Uint8Array.from(m[1].match(/../g)!.map(h => parseInt(h, 16))))).join('\n').replace(/ /g, ' ');
const flat = (pdf: string) => textOf(pdf).replace(/\n/g, ' ');
const P = DEFAULT_PARAMS, A = 'Alice', IDS = ['m1', 'm2', 'm3', 'm4'];
const at = (day: string, hm = '10:00') => `${day}T${hm}`;
const ink: Strokes = [[[10, 10], [60, 40], [120, 20], [160, 60], [220, 30]]];
const ink2: Strokes = [[[12, 50], [70, 20], [130, 60], [180, 20], [240, 55]]];
const ms = (): Milestone[] => IDS.map((id, i) => ({ id, label: `Étape ${i + 1}`, point: `Point ${i + 1}`, requirement: `Exigence ${i + 1}`, measured: '', ok: null, by: '', date: '' }));
const dl = (over: Partial<Delivery> = {}): Delivery => ({ ...newDelivery(P), id: 'dl1', ref: 'CMD-1', client: 'Client A', item: 'Lot de pièces', qty: 10, milestones: ms(), ...over });
const m1 = (over: Partial<Milestone> = {}): Milestone => ({ ...ms()[0], ...over });
const rv = (over: Partial<ReceptionReserve> = {}): ReceptionReserve => ({ id: 'rv1', text: 'Rayure', raisedAt: '2026-09-14', ...over });
const withRec = (d: Delivery, patch: Partial<Reception>): Delivery => ({ ...d, reception: { ...d.reception, ...patch } });
const released = (d: Delivery = dl()) => releaseDelivery(IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at('2026-09-10', '09:00') }), d), { by: 'Marc', at: at('2026-09-11', '16:00') });
const received = (d: Delivery, day = '2026-09-14', result: Reception['result'] = 'sans') => setResult(startReception(d, { at: at(day, '14:00'), place: 'Chantier Nord' }), result, at(day, '14:30'));
const signed = (d: Delivery, day = '2026-09-14') => signClient(d, ink, at(day, '14:40'), A);

describe('PV, the moments and the lines of a delivery', { timeout: 30_000 }, () => {
  it('atFr: the day as 04/10/2026, the hour as "9 h 05" with no-break spaces and never "09 h 05", nothing when empty', () => {
    expect(atFr(undefined)).toBe('');
    expect(atFr('')).toBe('');
    expect(atFr('2026-10-04')).toBe('04/10/2026');
    expect(atFr('2026-10-04T14:05')).toBe('04/10/2026 à 14 h 05');
    expect(atFr('2026-10-04T09:05')).toBe('04/10/2026 à 9 h 05');
    expect(atFr('2026-10-04T09:05:59')).toBe('04/10/2026 à 9 h 05');
  });
  it('editedAt: the date AND the hour of the copy, so that two copies of one day tell apart', () => {
    expect(editedAt(new Date(2026, 9, 7, 10, 15))).toBe('Édité le 07/10/2026 à 10 h 15');
    expect(editedAt(new Date(2026, 9, 7, 9, 5))).not.toBe(editedAt(new Date(2026, 9, 7, 9, 6)));
  });
  it('deliveredAt: the day and the hour of the delivery under way, empty before it', () => {
    expect(deliveredAt(dl())).toBe('');
    expect(deliveredAt(withRec(dl(), { date: '2026-09-14' }))).toBe('14/09/2026');
    expect(deliveredAt(withRec(dl(), { date: '2026-09-14', time: '14:00' }))).toBe('14/09/2026 à 14 h 00');
  });
  it('deliveryAt: the delivery under way by default (the same object), a closed one read as the root of the order with the deliveries closed before it only', () => {
    const signedOne = signClient(withRec(received(released(dl({ qty: 10 }))), { qty: 4 }), ink, at('2026-09-14', '14:40'), A), two = nextPresentation(signedOne, A, at('2026-09-15'));
    const signedTwo = signClient(withRec(received(released(two), '2026-09-18'), { qty: 3 }), ink2, at('2026-09-18', '14:40'), A), three = nextPresentation(signedTwo, A, at('2026-09-19'));
    expect(deliveryAt(dl())).toEqual({ d: dl(), no: 1, total: 1 });
    expect(deliveryAt(three)).toMatchObject({ no: 3, total: 3 });
    expect(deliveryAt(three).d).toBe(three);
    [0, 4, 99].forEach(n => expect(deliveryAt(three, n)).toMatchObject({ no: 3, total: 3 }));   // no such delivery: the one under way
    const first = deliveryAt(three, 1), mid = deliveryAt(three, 2);
    expect([first.no, first.total, mid.no, mid.total]).toEqual([1, 3, 2, 3]);
    expect(first.d.lots).toEqual([]);
    expect(mid.d.lots?.map(l => l.no)).toEqual([1]);
    expect(first.d.reception.qty).toBe(4);               // its own reception, not the one under way
    expect(mid.d.reception.qty).toBe(three.lots![1].reception.qty);
    expect(first.d.signClient).toBe(signedOne.signClient);
    expect([first.d.id, first.d.ref, first.d.client, first.d.journal]).toEqual([three.id, three.ref, three.client, three.journal]);   // the identity and the journal are the order's
    // what the delivery under way holds is not lent to a closed one that did not have it (a signature of the company, a release signature, a derogation, a photo of the paper PV)
    const richer: Delivery = { ...three, signCompany: ink, releaseSign: ink2, derogation: { by: 'Marc', why: 'Accord', at: at('2026-09-19') }, pvPhoto: 'photo:pv-9-9', liftSignedBy: 'M. Durand' };
    expect(Object.keys(deliveryAt(richer, 1).d).filter(k => ['signCompany', 'releaseSign', 'derogation', 'pvPhoto', 'liftSignedBy'].includes(k))).toEqual([]);
    expect(deliveryAt(richer).d.signCompany).toBe(ink);
  });
});

describe('PV, the signers and the persons named', { timeout: 30_000 }, () => {
  it('receptionistText: the name and the function, the e-mail after a dot, "Nom non renseigné" when the box is empty and never a function in place of a name', () => {
    expect(receptionistText({ ...dl().reception, name: ' M. Durand ', role: ' Conducteur ' })).toBe('M. Durand, Conducteur');
    expect(receptionistText({ ...dl().reception, name: 'M. Durand', role: '', email: 'd@x.fr' })).toBe('M. Durand · d@x.fr');
    expect(receptionistText({ ...dl().reception, name: '', role: 'Conducteur' })).toBe(`${NO_NAME}, Conducteur`);
    expect(receptionistText({ ...dl().reception, name: '', role: '' })).toBe(NO_NAME);
  });
  it('clientSigner: what was typed with the function; "Réceptionnaire : nom non renseigné" when the box is signed without a name; nothing when it waits for a hand signature', () => {
    const base = dl();
    expect(clientSigner(base)).toBe('');
    expect(clientSigner(withRec(base, { name: 'M. Durand', role: 'Directeur' }))).toBe('M. Durand, Directeur');
    expect(clientSigner(withRec(base, { name: ' ', role: '' }))).toBe('');
    expect(clientSigner({ ...base, signClient: ink })).toBe(NO_RECEIVER);
    expect(clientSigner({ ...base, signClient: ink, reception: { ...base.reception, role: 'Directeur' } })).toBe(`${NO_RECEIVER}, Directeur`);
    expect(clientSigner(withRec(base, { signedAt: at('2026-09-14') }))).toBe(NO_RECEIVER);
    expect(clientSigner({ ...base, pvPhoto: 'photo:pv-1-1' })).toBe(NO_RECEIVER);
    expect(clientSigner(withRec(base, { noSign: { kind: 'absent', witness: 'Paul', at: at('2026-09-14') } }))).toBe(NO_RECEIVER);
    expect(clientSigner({ ...base, signClient: [[]] })).toBe('');     // an empty stroke is no signature
    expect(clientSigner({ ...base, signClient: [[[5, 5]]] })).toBe('');   // nor a dot
    expect(clientSigner({ ...base, signClient: [[[5, 5], [9, 9]]] })).toBe(NO_RECEIVER);
  });
  it('clientSignAt: the moment of the signature; a photo of the paper PV carries the moment it was taken; nothing without either', () => {
    expect(clientSignAt(dl())).toBe('');
    expect(clientSignAt(withRec(dl(), { signedAt: at('2026-09-14', '14:40'), pvPhotoAt: at('2026-09-15') }))).toBe('2026-09-14T14:40');
    expect(clientSignAt({ ...withRec(dl(), { pvPhotoAt: at('2026-09-15', '08:00') }), pvPhoto: 'photo:pv-1-1' })).toBe('2026-09-15T08:00');
    expect(clientSignAt(withRec(dl(), { pvPhotoAt: at('2026-09-15', '08:00') }))).toBe('');   // a moment without its photo is not a signature
  });
  it('companySigner: the person of the line written when the company signed, matched on the moment printed; the first line is not taken when the signature was drawn again', () => {
    const open = received(released(dl()));
    expect(companySigner(open)).toBe('');
    const one = signCompany(open, ink, at('2026-09-14', '14:35'), 'Paul'), two = signCompany(one, ink2, at('2026-09-14', '14:50'), 'Marc');
    expect(companySigner(one)).toBe('Paul');
    expect(companySigner(two)).toBe('Marc');
    expect(companySigner({ ...two, journal: two.journal!.filter(e => e.by !== 'Marc') })).toBe('');   // the moment printed has no line: nobody is named
    expect(companySigner({ ...dl(), journal: [{ at: at('2026-09-14'), by: 'Paul', text: 'Autre ligne' }], reception: { ...dl().reception, companySignedAt: at('2026-09-14') } })).toBe('');
  });
  it('noSignHead / noSignText: the delivery stated, never "pronounced", with the witness, the organisation of the witness and the moment', () => {
    const base = received(released(dl())), put = (kind: 'absent' | 'refused' | 'other', org?: string, other?: string) => setNoSign({ ...base, reception: { ...base.reception, result: '' } }, kind, 'Éloïse', at('2026-09-14', '15:00'), 'Paul', org, undefined, other);
    expect(noSignHead(dl())).toBe('');
    expect(noSignText(dl())).toBe('');
    expect(noSignHead(put('absent'))).toBe("Livraison constatée en l'absence du client");
    expect(noSignHead(put('refused'))).toBe('Livraison constatée, signature du client refusée');
    expect(noSignHead(put('other', undefined, 'Main blessée'))).toBe('Livraison constatée, signature du client non obtenue (Main blessée)');
    expect(plain(noSignText(put('absent')))).toBe('Signature du client non obtenue : client absent, témoin : Éloïse, le 14/09/2026 à 15 h 00');
    expect(plain(noSignText(put('refused', ' Maison Perrin ')))).toBe('Signature du client non obtenue : signature refusée, témoin : Éloïse (Maison Perrin), le 14/09/2026 à 15 h 00');
    expect(plain(noSignText(put('other', undefined, 'Main blessée')))).toContain('Main blessée, témoin');
  });
});

describe('PV, the milestones and the checks before departure', { timeout: 30_000 }, () => {
  it('boundsWords: "entre 5,5 et 7 bar", "au plus 90 °C", "au moins 2 mm", nothing without a bound, a bound of 0 is a bound', () => {
    expect(boundsWords(5.5, 7, 'bar')).toBe('entre 5,5 et 7 bar');
    expect(boundsWords(undefined, 90, '°C')).toBe('au plus 90 °C');
    expect(boundsWords(2, null, 'mm')).toBe('au moins 2 mm');
    expect(boundsWords(null, null, 'mm')).toBe('');
    expect(boundsWords(undefined, undefined)).toBe('');
    expect(boundsWords(0, 3)).toBe('entre 0 et 3');
    expect(boundsWords(0, undefined)).toBe('au moins 0');
    expect(boundsWords(undefined, 0, 'mm')).toBe('au plus 0 mm');
  });
  it('valueText: the value with the unit of the milestone, the unit added only when the value does not say it, empty when nothing was measured', () => {
    expect(valueText(m1({ measured: '1 245,2', unit: 'mm' }))).toBe('1 245,2 mm');
    expect(valueText(m1({ measured: '1 245,2 mm', unit: 'mm' }))).toBe('1 245,2 mm');
    expect(valueText(m1({ measured: '  12 ', unit: undefined }))).toBe('12');
    expect(valueText(m1({ measured: '', unit: 'mm' }))).toBe('');
    expect(valueText(m1({ measured: '   ', unit: 'mm' }))).toBe('');
  });
  it('msLabel / MS_LABEL: the five results in words, "dérogation" only on a milestone not conform that was waived', () => {
    expect(MS_LABEL).toEqual({ todo: 'À contrôler', ok: 'Conforme', reworked: 'Conforme après reprise', ko: 'Non conforme', na: 'Sans objet' });
    expect(msLabel(m1())).toBe('À contrôler');
    expect(msLabel(m1({ ok: true }))).toBe('Conforme');
    expect(msLabel(m1({ ok: true, history: [{ at: at('2026-09-10'), by: A, kind: 'check', ok: false, measured: '' }] }))).toBe('Conforme après reprise');
    expect(msLabel(m1({ ok: false }))).toBe('Non conforme');
    expect(msLabel(m1({ ok: false, waivedBy: 'Marc' }))).toBe('Non conforme, dérogation');
    expect(msLabel(m1({ ok: true, waivedBy: 'Marc' }))).toBe('Conforme');
    expect(msLabel(m1({ na: true, ok: false }))).toBe('Sans objet');
  });
  it('controlFacts: the requirement of the check only when the definition changed, the bounds and the instrument kept, the definition now when it differs; nothing for an old check', () => {
    const ev = (over = {}) => ({ at: at('2026-09-10', '09:05'), by: A, kind: 'check' as const, ok: true, measured: '6', requirement: 'Exigence 1', min: 5.5, max: 7, ...over });
    const base = m1({ ok: true, unit: 'bar', min: 5.5, max: 7, history: [ev()] });
    expect(controlFacts(m1())).toEqual([]);
    expect(controlFacts(m1({ ok: true, history: [{ at: at('2026-09-10'), by: A, kind: 'check', ok: true, measured: '6' }] }))).toEqual([]);   // an old event kept no copy
    expect(plain(controlFacts(base))).toEqual(['Au contrôle du 10/09/2026 à 9 h 05 : plage attendue : entre 5,5 et 7 bar']);
    const edited = { ...base, requirement: 'Exigence bis', max: 8 };
    expect(plain(controlFacts(edited))).toEqual([
      'Au contrôle du 10/09/2026 à 9 h 05 : exigence « Exigence 1 » ; plage attendue : entre 5,5 et 7 bar',
      'Définition actuelle du jalon différente : exigence « Exigence bis » ; plage attendue : entre 5,5 et 8 bar',
    ]);
    // the bounds alone changed (the requirement did not): the check says what it was made against, and the definition now says what it is
    expect(plain(controlFacts({ ...base, max: 8 }))).toEqual([
      'Au contrôle du 10/09/2026 à 9 h 05 : exigence « Exigence 1 » ; plage attendue : entre 5,5 et 7 bar',
      'Définition actuelle du jalon différente : exigence « Exigence 1 » ; plage attendue : entre 5,5 et 8 bar',
    ]);
    expect(plain(controlFacts({ ...base, min: 5 }))[1]).toBe('Définition actuelle du jalon différente : exigence « Exigence 1 » ; plage attendue : entre 5 et 7 bar');
    expect(plain(controlFacts({ ...base, max: undefined }))[1]).toContain('plage attendue : au moins 5,5 bar');   // a bound taken off is a change
    expect(plain(controlFacts({ ...base, instrumentId: 'eq1' }, id => `Pied à coulisse ${id}`))[0]).toBe('Au contrôle du 10/09/2026 à 9 h 05 : plage attendue : entre 5,5 et 7 bar ; instrument : Pied à coulisse eq1');
    expect(plain(controlFacts({ ...base, instrumentId: 'eq1' }))[0]).not.toContain('instrument');   // no name to say it with
    expect(plain(controlFacts({ ...base, history: [ev({ instrumentId: 'eq2' })], instrumentId: 'eq1' }, id => id))[0]).toContain('instrument : eq2');   // the one of the check, not the one now
    expect(plain(controlFacts({ ...base, history: [ev({ kind: 'rework' as const })] }))).toHaveLength(1);
    expect(controlFacts({ ...base, history: [ev({ kind: 'reopen' as never, ok: null as never })] })).toEqual([]);   // a reopening is not a check
  });
  it('shipChecksDone / shipLabel: the checks before departure only once one was made; "À contrôler", "Conforme", "Non conforme", "Sans objet"', () => {
    const c = (over = {}) => ({ id: 'sc_0', label: 'Documents remis', ok: null as boolean | null, by: '', at: '', ...over });
    expect(shipChecksDone(dl())).toEqual([]);
    expect(shipChecksDone({ ...dl(), shipChecks: [c(), c({ id: 'sc_1' })] })).toEqual([]);
    expect(shipChecksDone({ ...dl(), shipChecks: [c({ ok: true }), c({ id: 'sc_1' })] })).toHaveLength(2);
    expect(shipChecksDone({ ...dl(), shipChecks: [c({ na: true })] })).toHaveLength(1);
    expect([c(), c({ ok: true }), c({ ok: false }), c({ na: true, ok: null }), c({ na: true, ok: true })].map(shipLabel)).toEqual(['À contrôler', 'Conforme', 'Non conforme', 'Sans objet', 'Sans objet']);
  });
  it('instrumentName: the name of an instrument of 3.3, "supprimé" when it is not there any more (a key of the prototype is not an instrument), nothing without the list', () => {
    expect(instrumentName(undefined)).toBeUndefined();
    const name = instrumentName({ eq1: { name: 'Pied à coulisse' } })!;
    expect(name('eq1')).toBe('Pied à coulisse');
    expect(name('eq9')).toBe('supprimé');
    expect(name('constructor')).toBe('supprimé');
    expect(name('toString')).toBe('supprimé');
  });
});

describe('PV, the reservations, the photos and the notes', { timeout: 30_000 }, () => {
  it('reserveName / liftLine: "Réserve 2 · Capot", the lift with the person who records it and what the customer side said', () => {
    expect(reserveName(rv(), 0)).toBe('Réserve 1');
    expect(reserveName(rv({ where: 'Capot' }), 1)).toBe('Réserve 2 · Capot');
    expect(plain(liftLine(rv({ liftedAt: '2026-09-16' }), 0))).toBe('Réserve 1 : levée le 16/09/2026');
    expect(plain(liftLine(rv({ liftedAt: '2026-09-16', liftedBy: 'Paul', where: 'Capot' }), 1))).toBe('Réserve 2 · Capot : levée le 16/09/2026, enregistrée par Paul');
    expect(plain(liftLine(rv({ liftedAt: '2026-09-16', liftedBy: 'Paul', liftNote: 'Constatée côté client par M. Durand' }), 0))).toBe('Réserve 1 : levée le 16/09/2026, enregistrée par Paul : Constatée côté client par M. Durand');
  });
  it('SEVERITY_LABEL: the two gravities in words', () => {
    expect(SEVERITY_LABEL).toEqual({ minor: 'Mineure', blocking: 'Bloquante' });
  });
  it('postponed: only a reception "avec réserve" with a blocking reservation still open is put off', () => {
    const d = (result: Reception['result'], reserves: ReceptionReserve[]) => withRec(dl(), { result, reserves });
    expect(postponed(d('reserve', [rv({ severity: 'blocking' })]))).toBe(true);
    expect(postponed(d('reserve', [rv({ severity: 'blocking', liftedAt: '2026-09-16' })]))).toBe(false);
    expect(postponed(d('reserve', [rv({ severity: 'minor' })]))).toBe(false);
    expect(postponed(d('reserve', [rv()]))).toBe(false);
    expect(postponed(d('sans', [rv({ severity: 'blocking' })]))).toBe(false);
    expect(postponed(d('refus', [rv({ severity: 'blocking' })]))).toBe(false);
    expect(postponed(d('reserve', []))).toBe(false);
  });
  it('photosLine: the kinds that are there, counted, "jointe(s) dans l\'application", nothing when none', () => {
    expect(photosLine([[undefined, 'contrôle'], ['', 'écart constaté']])).toBe('');
    expect(photosLine([])).toBe('');
    expect(photosLine([['photo:a-1-1', 'contrôle'], [undefined, 'écart constaté']])).toBe("1 photo jointe dans l'application, non reprise dans ce fichier (contrôle)");
    expect(photosLine([['photo:a-1-1', 'contrôle'], ['photo:b-1-1', 'écart constaté']])).toBe("2 photos jointes dans l'application, non reprises dans ce fichier (contrôle, écart constaté)");
  });
  it('CLOCK_NOTE: the hours are those of the device, not certified', () => {
    expect(CLOCK_NOTE).toBe("Heures lues sur l'horloge de l'appareil, non certifiées");
  });
});

describe('PV, the corrections after the signature and the person who signed for the company, in the file (P01 to P03)', { timeout: 30_000 }, () => {
  // an order in two deliveries: the first closed (signed, received in part), the second under way and signed, then corrected twice
  const base = () => {
    const first = signClient(withRec(received(released(dl({ qty: 10 }))), { qty: 4 }), ink, at('2026-09-14', '14:40'), A);
    const second = nextPresentation(first, A, at('2026-09-15'));
    return signClient(received(released(second), '2026-09-18'), ink2, at('2026-09-18', '14:40'), A);
  };
  const o = { company: 'Atelier', date: new Date(2026, 8, 25, 10, 0), params: P };
  it('P01: prints every correction once, on the last delivery of the order only: the closed delivery prints none', () => {
    const c = correctLocked(correctLocked(base(), { place: 'Quai 9', _why: 'Lieu mal noté' }, 'Marc M.', at('2026-09-26', '08:30')), { name: 'M. Durand', _why: 'Nom mal écrit' }, 'Paul', at('2026-09-26', '09:10'));
    const last = flat(pvPdf(c, o)), closed = flat(pvPdf(c, { ...o, no: 1 }));
    expect(last.match(/Correction après signature/g)).toHaveLength(2);
    expect(last).toContain('Lieu mal noté');
    expect(last).toContain('Nom mal écrit');
    expect(last).toMatch(/26\/09\/2026 à 8 h 30, Marc M\. : Corrigé : lieu Chantier Nord devient Quai 9/);
    expect(closed).not.toContain('Correction après signature');
    expect(flat(pvPdf(c, { ...o, no: 2 })).match(/Correction après signature/g)).toHaveLength(2);   // the delivery 2 of 2 is the last one
  });
  it('P02: prints the lines of the journal that are corrections and no other (the journal of an order holds a dozen lines that are not)', () => {
    const c = correctLocked(base(), { place: 'Quai 9', _why: 'Lieu mal noté' }, 'Marc M.', at('2026-09-26', '08:30'));
    expect(c.journal!.length).toBeGreaterThan(10);
    expect(corrections(c)).toHaveLength(1);
    expect(plain(corrections(c)[0])).toBe('26/09/2026 à 8 h 30, Marc M. : Corrigé : lieu Chantier Nord devient Quai 9 (motif : Lieu mal noté)');
    expect(corrections(dl())).toEqual([]);
    expect(corrections({ ...dl(), journal: [{ at: at('2026-09-26'), by: '', text: 'Corrigé : x → y (motif : z)' }] }).map(plain)).toEqual(['26/09/2026 à 10 h 00, — : Corrigé : x devient y (motif : z)']);
    expect(flat(pvPdf(c, o)).match(/Correction après signature/g)).toHaveLength(1);
  });
  it('P03: names the person who signed for the company at the moment printed, not the first line of the journal', () => {
    const open = received(released(dl())), one = signCompany(open, ink, at('2026-09-14', '09:00'), 'Paul'), two = signCompany(one, ink2, at('2026-09-14', '09:30'), 'Marc');
    expect(companySigner(two)).toBe('Marc');
    const t = flat(pvPdf(two, o));
    expect(t).toMatch(/Marc/);
    expect(t).not.toMatch(/Paul/);
    expect(flat(pvPdf(one, o))).toMatch(/Paul/);
    expect(flat(pvPdf({ ...two, journal: two.journal!.filter(e => e.by !== 'Marc') }, o))).toContain(NO_NAME);   // a signature without its line: the box says the name is missing
  });
  it('the last delivery is delivery 2 of 2: the report of a closed one says its own number and prints no correction', () => {
    const t = flat(pvPdf(base(), { ...o, no: 1 }));
    expect(t).toMatch(/Livraison\s+1 sur 2/);
    expect(flat(pvPdf(base(), o))).toMatch(/Livraison\s+2 sur 2/);
  });
});

describe('PV, what is said of a milestone, of the release, of the result and of the clock', () => {
  const ev = (kind: string, ok: boolean | null, day = '2026-09-10', over: object = {}) => ({ at: at(day, '09:00'), by: A, kind, ok, measured: '', ...over }) as never;
  it('milestoneFacts: "Sans objet" with its reason, the failure then the rework, a value out of its bounds, the waiver and the second person; nothing for a milestone that is simply conform', () => {
    expect(milestoneFacts(m1({ ok: true }))).toEqual([]);
    expect(milestoneFacts(m1({ na: true, naReason: 'Sans objet ici' })).map(plain)).toEqual(['Sans objet : Sans objet ici']);
    expect(milestoneFacts(m1({ na: true }))).toEqual([]);
    const reworked = m1({ ok: true, at: at('2026-09-12', '10:30'), date: '2026-09-12', history: [ev('check', false), ev('rework', true, '2026-09-12')] });
    expect(plain(milestoneFacts(reworked)[0])).toBe('Non conforme le 10/09/2026 à 9 h 00, conforme après reprise le 12/09/2026 à 10 h 30');
    expect(milestoneFacts(m1({ ok: true, history: [ev('check', true)] })).every(x => !/reprise/.test(x))).toBe(true);
    const out = m1({ ok: false, measured: '12', min: 1, max: 5 }), within = m1({ ok: false, measured: '3', min: 1, max: 5 });
    expect(milestoneFacts(out)).toContain('Valeur hors de la plage attendue');
    expect(milestoneFacts(within)).not.toContain('Valeur hors de la plage attendue');
    expect(milestoneFacts({ ...out, ok: true })).not.toContain('Valeur hors de la plage attendue');   // only a milestone not conform says it
    expect(plain(milestoneFacts(m1({ ok: false, waivedBy: 'Antoine', waivedAt: at('2026-09-11', '08:05'), waivedWhy: 'Accord du client' }))[0])).toBe("Dérogation d'Antoine le 11/09/2026 à 8 h 05 : Accord du client");
    expect(plain(milestoneFacts(m1({ ok: false, waivedBy: 'Marc', waivedAt: at('2026-09-11') }))[0])).toBe('Dérogation de Marc le 11/09/2026 à 10 h 00 : —');
    expect(milestoneFacts(m1({ ok: true, second: 'Paul' })).map(plain)).toEqual(['Contrôle confirmé par un second : Paul']);
  });
  it('releaseLines: who released and when (the hour when there is one), a release recorded after the delivery, the derogation and the waiver of a signature without a release', () => {
    const rel = released(), at14 = (d: Delivery) => ({ ...d, reception: { ...d.reception, date: '2026-09-11', time: '09:00' } });
    expect(plain(releaseLines(rel)[0])).toBe('Libérée par Marc le 11/09/2026 à 16 h 00');
    expect(plain(releaseLines({ ...rel, releasedMoment: undefined })[0])).toBe('Libérée par Marc le 11/09/2026');
    expect(plain(releaseLines({ ...rel, releasedBy: '' })[0])).toBe('Libérée par — le 11/09/2026 à 16 h 00');
    expect(releaseLines(rel)).toHaveLength(1);
    expect(plain(releaseLines(at14(rel))[1])).toBe('Libération enregistrée après la livraison du 11/09/2026 à 9 h 00');
    const waived = releaseDelivery(checkMilestone(allOkOf(), 'm2', { ok: false, by: A, at: at('2026-09-10', '09:30') }), { by: 'Marc', at: at('2026-09-11', '16:00'), derogation: { why: 'Accord du client' } });
    expect(releaseLines(waived).map(plain)).toContain('Par dérogation de Marc le 11/09/2026 à 16 h 00 : Accord du client');
    const none = releaseLines(dl());
    expect(none).toEqual(['Pas de libération enregistrée']);
    const open = signWaiver(dl(), 'Marc', 'Client pressé', at('2026-09-12', '08:00'));
    expect(releaseLines(open).map(plain)).toEqual(['Pas de libération enregistrée', 'Signé sans libération préalable : dérogation de Marc, motif : Client pressé, le 12/09/2026 à 8 h 00']);
  });
  const allOkOf = () => IDS.reduce((x, id) => checkMilestone(x, id, { ok: true, by: A, at: at('2026-09-10', '09:00') }), dl());
  it('resultText: the sentence of the result, with the reservations counted, minor ones named so, a reception put off, a refusal, a result not given yet', () => {
    const d = (result: Reception['result'], reserves: ReceptionReserve[] = [], over: Partial<Reception> = {}) => withRec(dl(), { result, ...(reserves.length ? { reserves } : {}), ...over });
    expect(resultText(d('sans'))).toBe('Réception prononcée sans réserve');
    expect(resultText(d(''))).toBe('Résultat de la réception pas encore renseigné');
    expect(resultText(d('refus'))).toBe('Réception refusée');
    expect(plain(resultText(d('reserve')))).toBe('Réception prononcée avec réserve');
    expect(plain(resultText(d('reserve', [rv({ severity: 'minor' })])))).toBe('Réception prononcée avec 1 réserve mineure');
    expect(plain(resultText(d('reserve', [rv({ severity: 'minor' }), rv({ id: 'rv2' })])))).toBe('Réception prononcée avec 2 réserves mineures');
    expect(plain(resultText(d('reserve', [rv({ severity: 'minor' }), rv({ id: 'rv2', severity: 'blocking', liftedAt: '2026-09-16' })])))).toBe('Réception prononcée avec 2 réserves');
    expect(plain(resultText(d('reserve', [rv({ severity: 'blocking' }), rv({ id: 'rv2', severity: 'blocking' })])))).toBe('Réception reportée : 2 réserves bloquantes');
    expect(plain(resultText(d('reserve', [rv({ severity: 'blocking' })])))).toBe('Réception reportée : 1 réserve bloquante');
  });
  it('resultText of a PV the customer did not sign: the delivery is stated, the reservations are "notées" (never "prononcée")', () => {
    const noSign = { kind: 'absent' as const, witness: 'Paul', at: at('2026-09-14', '15:00') };
    const d = (result: Reception['result'], reserves: ReceptionReserve[] = []) => withRec(dl(), { result, noSign, ...(reserves.length ? { reserves } : {}) });
    expect(plain(resultText(d('sans')))).toBe("Livraison constatée en l'absence du client");
    expect(plain(resultText(d('reserve')))).toBe("Livraison constatée en l'absence du client, avec réserve");
    expect(plain(resultText(d('reserve', [rv()])))).toBe("Livraison constatée en l'absence du client, 1 réserve notée");
    expect(plain(resultText(d('reserve', [rv(), rv({ id: 'rv2' })])))).toBe("Livraison constatée en l'absence du client, 2 réserves notées");
    expect(plain(resultText(d('refus')))).toBe('Réception refusée');
    expect(plain(resultText(d('reserve', [rv({ severity: 'blocking' })])))).toBe('Réception reportée : 1 réserve bloquante');
  });
  it('refusalLines: the motive and what follows, "Autre" saying what it is, and "Autre" alone when nothing was said', () => {
    const d = (reason: string, next: string, over: object = {}) => withRec(dl(), { refusal: { reason, next, ...over } });
    expect(refusalLines(dl())).toEqual([]);
    expect(refusalLines(d('Quantité incorrecte', 'À remplacer')).map(plain)).toEqual(['Motif : Quantité incorrecte', 'Suite : À remplacer']);
    expect(refusalLines(d(OTHER, OTHER, { other: ' Colis écrasé ', nextOther: 'Reprise sur site' })).map(plain)).toEqual(['Motif : Colis écrasé', 'Suite : Reprise sur site']);
    expect(refusalLines(d(OTHER, OTHER, { other: ' ', nextOther: '' })).map(plain)).toEqual(['Motif : Autre', 'Suite : Autre']);
  });
  it('clockText: the hours are those of the device as soon as one moment of the PV is written (a signature, the company, the mention, the photo), with the time zone when it is known', () => {
    expect(clockText(dl())).toBe('');
    const note = (patch: Partial<Reception>) => clockText(withRec(dl(), patch));
    expect(note({ signedAt: at('2026-09-14') })).toBe(`${CLOCK_NOTE}.`);
    expect(note({ companySignedAt: at('2026-09-14') })).toBe(`${CLOCK_NOTE}.`);
    expect(note({ noSign: { kind: 'absent', witness: 'P', at: at('2026-09-14') } })).toBe(`${CLOCK_NOTE}.`);
    expect(note({ pvPhotoAt: at('2026-09-14') })).toBe(`${CLOCK_NOTE}.`);
    expect(note({ signedAt: at('2026-09-14'), signTz: 'Europe/Paris' })).toBe(`${CLOCK_NOTE}, fuseau Europe/Paris.`);
    expect(note({ signTz: 'Europe/Paris' })).toBe('');
  });
  it('liftedAfterSign: a lift of a later day comes after, of an earlier day before; on the same day the line of the journal tells which came first; nothing is "after" without a lift or a signature', () => {
    const signedD = (signedAt: string, journal: Delivery['journal'] = []) => ({ ...withRec(dl(), { signedAt }), journal });
    const lifted = (liftedAt?: string) => rv({ text: 'Rayure', ...(liftedAt ? { liftedAt } : {}) });
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40')), lifted('2026-09-15'))).toBe(true);
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40')), lifted('2026-09-13'))).toBe(false);
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40')), lifted())).toBe(false);
    expect(liftedAfterSign(signedD(''), lifted('2026-09-15'))).toBe(false);
    const line = (hm: string) => [{ at: at('2026-09-14', hm), by: A, text: 'Réserve « Rayure » levée enregistrée par Alice' }];
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40'), line('15:00')), lifted('2026-09-14'))).toBe(true);
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40'), line('14:40')), lifted('2026-09-14'))).toBe(false);   // the same minute: as signed
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40'), line('14:30')), lifted('2026-09-14'))).toBe(false);
    expect(liftedAfterSign(signedD(at('2026-09-14', '14:40')), lifted('2026-09-14'))).toBe(false);   // no line: not told
    expect(liftedAfterSign({ ...dl(), reception: { ...dl().reception, noSign: { kind: 'absent', witness: 'P', at: at('2026-09-14', '15:00') } } }, lifted('2026-09-15'))).toBe(true);   // the moment of the mention
    expect(liftedAfterSign({ ...dl(), reception: { ...dl().reception, pvPhotoAt: at('2026-09-14', '15:00') } }, lifted('2026-09-15'))).toBe(true);   // the moment of the photo
  });
  it('sealView: "aucun" before the signature and for an old signed PV, the seals with their moments and reasons, intact or modified', () => {
    expect(sealView(dl())).toMatchObject({ state: 'none' });
    expect(plain(sealView(dl()).lines[0])).toBe('Scellé SHA-256 : aucun (calculé à la signature)');
    const lock = signed(received(released())), noSeal = { ...lock, reception: { ...lock.reception, seals: undefined } };
    expect(plain(sealView(noSeal).lines[0])).toBe('Scellé SHA-256 : aucun enregistré pour ce PV signé');
    expect(sealState(lock)).toBe('intact');
    const v = sealView(lock);
    expect(v.state).toBe('intact');
    expect(v.lines).toHaveLength(2);
    expect(plain(v.lines[0])).toMatch(/^Scellé SHA-256 : [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} \(calculé à la signature\)$/);
    expect(plain(v.lines[1])).toBe('Scellé intact : le contenu de ce PV correspond au dernier scellé.');
    const fixed = correctLocked(lock, { place: 'Quai 9', _why: 'Lieu' }, 'Marc', at('2026-09-15', '08:00')), w = sealView(fixed);
    expect(w.lines).toHaveLength(3);
    expect(plain(w.lines[1])).toMatch(/^Scellé SHA-256 : [0-9a-f ]{14} \(recalculé le 15\/09\/2026 à 8 h 00, par Marc : correction : Lieu\)$/);
    const broken = { ...fixed, client: 'Autre' }, b = sealView(broken);
    expect(b.state).toBe('modified');
    expect(plain(b.lines.at(-1)!)).toBe('Modifié depuis la signature : le contenu de ce PV ne correspond plus au scellé du 15/09/2026 à 8 h 00.');
    expect(sealOf(fixed)).toBe(fixed.reception.seals!.at(-1)!.hash);
  });
  it('orderRows: the lines of the report, the empty ones given empty, the delivery number only for an order in several times, the number of the PV only when asked, the traceability only when written', () => {
    const d = withRec({ ...dl({ lot: 'L1', serial: ' ', material: 'Acier' }), reception: { ...dl().reception, name: 'M. Durand', place: '', bl: '', pvNo: 'PV-2026-001', count: 3 } }, {});
    const rows = (v?: { no: number; total: number }, withPv = false) => orderRows(d, v, withPv).map(r => [r[0], plain(r[1])]);
    const names = (v?: { no: number; total: number }, withPv = false) => rows(v, withPv).map(r => r[0]);
    expect(names()).toEqual(['Client', 'Personne qui réceptionne', 'Commande', 'Livrable', 'Quantité livrée', 'Quantité comptée sur place', 'Lieu', 'Livrée le', 'Bon de livraison n°', 'Lot', 'Matière ou version']);
    expect(names({ no: 1, total: 1 })).not.toContain('Livraison');
    expect(rows({ no: 2, total: 3 })).toContainEqual(['Livraison', '2 sur 3']);
    expect(names(undefined, true)).toContain('Numéro de PV');
    expect(rows(undefined, true)).toContainEqual(['Numéro de PV', 'PV-2026-001']);
    expect(rows()).toContainEqual(['Lieu', '']);
    expect(rows()).toContainEqual(['Bon de livraison n°', '']);
    expect(rows()).toContainEqual(['Quantité comptée sur place', '3']);
    expect(orderRows(dl()).map(r => r[0])).not.toContain('Quantité comptée sur place');
    expect(rows()).toContainEqual(['Client', 'Client A']);
    expect(rows()).toContainEqual(['Client', 'Client A']);
    expect(orderRows({ ...dl(), client: ' ', ref: '' })[0]).toEqual(['Client', 'Client non renseigné']);
    expect(orderRows({ ...dl(), client: ' ', ref: '' })[2]).toEqual(['Commande', 'Commande sans numéro']);
  });
});

describe('PV in the file: the boxes ticked, the signature boxes, the table of a milestone', () => {
  const o = { company: 'Atelier', date: new Date(2026, 8, 25, 10, 0), params: P };
  it('ticks the result that was given and leaves the others as boxes to tick by hand: "sans réserve", "avec réserve", "refusée"', () => {
    const t = (d: Delivery) => flat(pvPdf(d, o));
    const sans = signed(received(released(), '2026-09-14', 'sans')), reserve = signed(addReserveTo(received(released(), '2026-09-14', 'reserve')));
    expect(t(sans)).toContain('[X] Réception prononcée sans réserve.');
    expect(t(sans)).toMatch(/\[\s+\] Réception prononcée avec réserve/);
    expect(t(sans)).toMatch(/\[\s+\] Réception refusée\. Motif : \.{10,}/);
    expect(t(reserve)).toMatch(/\[X\] Réception prononcée avec 1 réserve mineure\./);
    expect(t(reserve)).toMatch(/\[\s+\] Réception prononcée sans réserve\./);
    const refused = signed(refuse(startReception(released(), { at: at('2026-09-14', '14:00'), place: 'Quai' }), { reason: 'Quantité incorrecte', next: 'À remplacer' }, at('2026-09-14', '14:30'), A));
    expect(t(refused)).toContain('[X] Réception refusée.');
    expect(t(refused)).not.toMatch(/Réception refusée\. Motif : \.{5}/);
    expect(t(refused)).toContain('Motif : Quantité incorrecte');
    expect(t(refused)).toContain('Suite : À remplacer');
    expect(t(refused)).toMatch(/\[\s+\] Réception prononcée sans réserve\./);
  });
  it('names the box of the company by the person who signed (the line of the journal); a signature without that line says the name is missing; a box not signed has no name; the release box too', () => {
    const lock = withRec(signed(received(released(), '2026-09-14')), { name: 'M. Durand', role: 'Directeur' });   // the person who receives is named: only the boxes of the signatures are looked at
    const unsigned = flat(pvPdf(lock, o)), withCo = flat(pvPdf(signCompany(lock, ink, at('2026-09-14', '15:00'), 'Paul'), o));
    expect(unsigned).not.toContain(NO_NAME);
    expect(withCo).toContain('Paul');
    const noLine = { ...signCompany(lock, ink, at('2026-09-14', '15:00'), 'Paul'), journal: [] as Delivery['journal'] };
    expect(flat(pvPdf(noLine, o))).toContain(NO_NAME);
    const rel = flat(pvPdf({ ...lock, releaseSign: ink2 }, o)), relNoName = flat(pvPdf({ ...lock, releaseSign: ink2, releasedBy: '' }, o));
    expect(rel.match(/Libération avant départ/gi)).toHaveLength(2);   // the heading and the box of the signature
    expect(rel).not.toContain(NO_NAME);
    expect(relNoName).toContain(NO_NAME);
    expect(flat(pvPdf(lock, o)).match(/Libération avant départ/gi)).toHaveLength(1);   // the heading of the section alone: no signature of the release, no box
  });
  it('titles the box of the company with its name, "l\'entreprise" when it has none; gives the release box its moment (the hour when there is one) and the table of the milestones the day of an old check that kept no hour', () => {
    const lock = withRec(signed(received(released(), '2026-09-14')), { name: 'M. Durand', role: 'Directeur' });
    expect(flat(pvPdf(lock, o))).toContain('Pour Atelier (qui remet)');
    expect(flat(pvPdf(lock, { ...o, company: '' }))).toContain("Pour l'entreprise (qui remet)");
    expect(flat(pvPdf({ ...lock, releaseSign: ink2 }, o))).toContain('Libération avant départ Nom : Marc Date : 11/09/2026 à 16 h 00 Signature');
    expect(flat(pvPdf({ ...lock, releaseSign: ink2, releasedMoment: undefined }, o))).toContain('Libération avant départ Nom : Marc Date : 11/09/2026 Signature');
    const old = { ...lock, milestones: lock.milestones.map((m, i) => (i === 0 ? { ...m, at: undefined, date: '2026-09-10' } : m)) as Delivery['milestones'] };
    expect(flat(pvPdf(old, o)).match(/Alice 10\/09\/2026(?! à)/g)).toHaveLength(1);   // the milestone that kept no hour says its day, the others say day and hour
  });
  it('says the seal broke twice on the paper (a red box at the top and in the section of the seal), and never when the PV is intact', () => {
    const lock = signed(received(released(), '2026-09-14')), broken = { ...lock, client: 'Un autre client' };
    expect(flat(pvPdf(lock, o)).match(/Modifié depuis la signature/g)).toBeNull();
    expect(flat(pvPdf(broken, o)).match(/Modifié depuis la signature/g)).toHaveLength(2);
    expect(flat(pvPdf(lock, o)).match(/Scellé intact/g)).toHaveLength(1);
  });
  it('prints the requirement of a milestone under its point only when it has one, the repair of a reservation and the checks before departure only once one was made', () => {
    const d = signed(received(released(dl({ milestones: ms().map((m, i) => (i === 0 ? { ...m, requirement: '' } : m)) })), '2026-09-14', 'reserve'));
    const t = flat(pvPdf(d, o));
    expect(t).toContain('Exigence : Exigence 2');
    expect(t).not.toContain('Exigence : Exigence 1');
    expect(t).not.toMatch(/contrôle de départ/i);
    const withShip = flat(pvPdf({ ...d, shipChecks: [{ id: 'sc_0', label: 'Documents remis', ok: true, by: A, at: at('2026-09-11', '07:00') }] }, o));
    expect(withShip).toMatch(/contrôle de départ/i);
    expect(withShip).toMatch(/Documents remis Conforme Alice 11\/09\/2026 à 7 h 00/);   // who and when of a check made
    const half = flat(pvPdf({ ...d, shipChecks: [{ id: 'sc_0', label: 'Documents remis', ok: true, by: A, at: at('2026-09-11', '07:00') }, { id: 'sc_1', label: 'Quantité', ok: null, by: '', at: '' }] }, o));
    expect(half).toMatch(/Quantité À contrôler Documents|Quantité À contrôler(?! \w+ \d)/);   // a check not made says nobody and no moment
    const mid = addReserveTo(received(released(), '2026-09-14', 'reserve')), plainRv = flat(pvPdf(signed(mid), o)), fixed = flat(pvPdf(signed(repairReserve(mid, reservesOf(mid)[0].id, { at: at('2026-09-16'), by: 'Paul' })), o));
    expect(plainRv).not.toContain('Reprise faite le');
    expect(fixed).toContain('Reprise faite le 16/09/2026');
  });
});
const addReserveTo = (d: Delivery) => addReserve(d, { text: 'Rayure', by: 'Alice', at: '2026-09-14T14:35', severity: 'minor' });
