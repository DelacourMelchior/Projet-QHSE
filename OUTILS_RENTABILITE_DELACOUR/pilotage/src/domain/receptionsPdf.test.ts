// The acceptance report (PV) of tool 3.4 on paper, for every order of the example (no reservation, reservations, refused, in several deliveries, archived with the customer
// absent): a valid PDF 1.4 in pure ASCII, the facts of the delivery, the clause of retention only when ticked, no amount and no word of invoicing anywhere.
import { describe, expect, it } from 'vitest';
import type { Delivery, Params } from './types';
import { CLAUSE_NOTE, CLIENT_TITLE, LOCK_NOTE, NO_CLIENT, NO_ORDER, NO_PV, UNLOCKED_NOTE, clauseLine, corrections, deliveryAt, editedAt, liftLine, liftedAfterSign, milestoneFacts, noSignText, orderRows, orderTitle, photosNote, pvHead, pvPdf, quantityText, receptionistText, refusalLines, releaseLines, reserveText, resultText, retentionText, sealView } from './receptionsPdf';
import { A4, LOSSY_NOTE, textWidth } from './pdf';
import { correctLocked, derogationFacts, isLocked, qtyReceived, sealOf } from './receptions';
import { demoState } from './templates';

// The sentences of the report carry the no-break spaces of French typography (nb, base.ts): read as plain spaces here, whatever the shape of what is compared
const sp = <T,>(x: T): T => (typeof x === 'string' ? x.replace(/[\u00a0\u202f]/g, ' ') : Array.isArray(x) ? x.map(sp) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, sp(v)])) : x) as T;
const now = new Date(2026, 8, 25, 10, 0);
const state = demoState(now), p = state.params, o = { company: 'Atelier é', date: now, params: p };
// The text drawn in the file: the hex strings of the content, read back as Windows-1252
// (the no-break spaces of the French typography, which the file draws as the character of Windows-1252, are read as plain spaces: the tests that look at them read `runs`)
const textOf = (pdf: string) => [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m => new TextDecoder('windows-1252').decode(Uint8Array.from(m[1].match(/../g)!.map(h => parseInt(h, 16))))).join('\n').replace(/[\u00a0]/g, ' ');
const pv = (id: string, extra: Partial<typeof o & { no: number }> = {}) => pvPdf(state.deliveries[id], { ...o, ...extra });
const withClause = (on: boolean): Params => ({ ...p, reception: { ...p.reception, retention: { on, maxPct: 5 } } });
const flat = (pdf: string) => textOf(pdf).replace(/\n/g, ' ').replace(/\u00a0/g, ' ');   // the cells and the paragraphs wrap; the hours hold their no-break spaces
const reserveLines = (d: Delivery) => (d.reception.reserves ?? []).filter(x => x.liftedAt).map((x, i) => liftLine(x, i));
const withRec = (d: Delivery, patch: Partial<Delivery['reception']>): Delivery => ({ ...d, reception: { ...d.reception, ...patch } });
// A PV sealed as the domain seals it at the signature (the hash of its content, receptions.ts)
const sealed = (d: Delivery, at = '2026-09-25T09:00', by = 'Paul'): Delivery => withRec(d, { seals: [{ hash: sealOf(d), at, by }] });

describe('PV de réception, PDF', { timeout: 30_000 }, () => {
  it('is a valid ASCII PDF 1.4 for every order of the example, with no amount and no word of invoicing', () => {
    const orders = Object.values(state.deliveries);
    expect(orders).toHaveLength(14);
    orders.forEach((d: Delivery) => {
      const pdf = pvPdf(d, o), t = textOf(pdf);
      expect(pdf.startsWith('%PDF-1.4'), d.id).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf), d.id).toBe(false);
      expect(t, d.id).toContain(d.ref);
      expect(t, d.id).not.toMatch(/€|factur|bon pour|payable|solde/i);
      expect(t, d.id).not.toMatch(/atteste|Clause applicable|opposable|contradictoire|habilit|Constat fait avec|aucune modification|\(s\)/i);   // no legal word, no effect claimed: the report states facts
      expect(t, d.id).not.toContain('?');                 // a character the file cannot draw would show as a question mark
      expect(pdf).toMatch(/\/Count [1-9]/);
      expect(t).toMatch(/page 1 sur \d/);                // the number of the page
    });
  });
  it('says an acceptance without reservation, who signed and when (date and hour), the place and the number of the PV', () => {
    const t = textOf(pv('dl_demo_1'));
    expect(t).toContain('Réception prononcée sans réserve');
    expect(t).toMatch(/PV-2026-002/);
    expect(t).toContain('Site du client, quai 3');
    expect(t).toMatch(/10\sh\s50/);                         // the company signed at 10:50
    expect(t).toMatch(/10\sh\s55/);                         // the customer signed at 10:55
    expect(t).toContain('Largeur hors tout');
    expect(t).toContain('1 245,2 mm');
    expect(t).toContain('Contrôle confirmé par un second');
  });
  it('lists the reservations with place, gravity, deadline and lift', () => {
    const t = textOf(pv('dl_demo_2'));
    const flat = t.replace(/\n/g, ' ');                   // the cells of the table wrap
    expect(flat).toContain('Une poignée mal vissée sur un');
    expect(flat).toContain('Étiquette de référence manquante');
    expect(t).toContain('Caisson 7');
    expect(t).toContain('Mineure');
    expect(t).toContain('Non levée');
    expect(flat).toContain('enregistrée par Mme Perret');   // the person of the company who records the lift, never "constatée par" her (lot 1, G-8)
    expect(flat).not.toContain('constatée par');
    expect(flat).toContain('Reprise faite le');
    expect(textOf(pv('dl_demo_1'))).not.toContain('Gravité');   // no reservation: no table
  });
  it('gives the motive and what follows a refusal, and the number of the delivery', () => {
    const t = textOf(pv('dl_demo_12'));
    expect(t).toContain('Motif : Documents manquants');
    expect(t).toContain('Suite : À reprendre et livrer à nouveau');
    const two = textOf(pv('dl_demo_13')), one = textOf(pv('dl_demo_13', { no: 1 }));
    expect(two).toContain('Livraison');
    expect(two).toMatch(/2 sur 2/);
    expect(one).toMatch(/1 sur 2/);
    expect(one).toContain("Motif : Teinte différente de l'échantillon validé");   // "Autre" is replaced by what was typed
    expect(textOf(pv('dl_demo_1'))).not.toMatch(/Livraison\n\d sur \d/);          // one delivery: no "n sur n"
  });
  it('gives the quantity received against the quantity ordered', () => {
    expect(textOf(pv('dl_demo_10'))).toContain('12 · commandée : 20 · reste à livrer : 8');
    expect(textOf(pv('dl_demo_12'))).toContain('Quantité livrée');
  });
  it('says the customer was absent, with the witness, and that the PV is locked', () => {
    const t = textOf(pv('dl_demo_14'));
    expect(t).toContain('client absent, témoin : Gardien du site');
    expect(flat(pv('dl_demo_14'))).toContain(sp(LOCK_NOTE));
    expect(textOf(pv('dl_demo_13'))).not.toContain('PV signé');          // delivered, not signed: no lock to tell
    expect(textOf(pv('dl_demo_13'))).not.toContain('PV non verrouillé');   // a note for the company: the screen says it, the file never
  });
  it('says the derogation of a release and the milestone that does not apply', () => {
    expect(textOf(pv('dl_demo_6'))).toContain('Par dérogation de');
    expect(textOf(pv('dl_demo_9'))).toContain('Sans objet : Livré monté sur place, sans emballage');
    expect(textOf(pv('dl_demo_9'))).toMatch(/conforme après reprise le \d\d\/09\/2026 à 15\sh\s45/);
  });
  it('prints the clause of retention only when the company ticked it and the reception is "avec réserve", without any amount and without the note for the company', () => {
    const on = textOf(pv('dl_demo_3', { params: withClause(true) })), off = textOf(pv('dl_demo_3', { params: withClause(false) })), none = textOf(pvPdf(state.deliveries.dl_demo_3, { company: '', date: now }));
    expect(on).toMatch(/Retenue prévue au contrat : 5 % au plus, levée sous 7 jours/);
    expect(on.replace(/\n/g, ' ')).not.toContain(CLAUSE_NOTE);          // P-6: the note "non vérifiée par l'outil" is for the company, the screen says it, the file never
    expect(CLAUSE_NOTE).toMatch(/n'est pas vérifiée/);                 // a fact about the tool, no effect in law
    expect(on).not.toContain('Retenue indiquée');                      // A-15: the percentage noted for an order is no longer printed (no screen writes it)
    [off, none].forEach(t => { expect(t).not.toMatch(/Retenue|Mention de clause/); });
    // P-6: no object when nothing is reserved (CMD-041, CMD-012) or when the delivery is refused (CMD-067)
    Object.values(state.deliveries).forEach(d => {
      const t = flat(pvPdf(d, { ...o, params: withClause(true) }));
      expect(/Retenue prévue au contrat/.test(t), d.id).toBe(d.reception.result === 'reserve');
      expect(clauseLine(d, withClause(true)) !== '', d.id).toBe(d.reception.result === 'reserve');
      expect(t, d.id).not.toMatch(/Mention de clause|PV non verrouillé|non vérifiée par l'outil/);
    });
    expect(sp(UNLOCKED_NOTE)).toBe('PV non verrouillé : le contenu peut encore changer.');   // for the screen, which keeps it as a banner
  });
  // G-4 (proof b2/b8 of the audit): the lock sentence said "toute correction s'inscrit au journal", the title "contradictoire", the frame "réceptionnaire habilité": more than the tool knows
  it('says nothing more than the tool knows: no "contradictoire", no "habilité", the names typed and not verified, the lock told as a fact', () => {
    const t = flat(pv('dl_demo_1'));
    expect(t).toContain('Procès-verbal de réception'.toUpperCase().replace('É', 'É'));
    expect(t).toContain('Pour le client (personne qui réceptionne) Nom : M. Durand, Acheteur');
    expect(t).toContain('Noms et fonctions saisis dans l\'application, non vérifiés.');
    expect(t).toContain(sp(LOCK_NOTE));
    expect(LOCK_NOTE).not.toMatch(/toute correction s'inscrit|aucune/);
    expect(t).not.toMatch(/atteste|contradictoire|habilit|Constat fait avec/);
  });
  it('does not say that a customer who was absent pronounced the reception', () => {
    const d = state.deliveries.dl_demo_14, t = flat(pv('dl_demo_14'));
    expect(resultText(d)).toBe("Livraison constatée en l'absence du client");
    expect(t).toContain("[X] Livraison constatée en l'absence du client.");
    expect(t).not.toContain('Réception prononcée sans réserve.');
    const refused = withRec(d, { noSign: { ...d.reception.noSign!, kind: 'refused', witnessOrg: 'Client' } });
    expect(resultText(refused)).toBe('Livraison constatée, signature du client refusée');
    expect(flat(pvPdf(refused, o))).toContain('signature refusée, témoin : Gardien du site (Client)');
  });
  it('gives the number of the delivery note, a dash when there is none', () => {
    const d = state.deliveries.dl_demo_1, t = textOf(pvPdf({ ...d, reception: { ...d.reception, bl: 'BL-2026-0412' } }, o));
    expect(t).toContain('Bon de livraison n°');
    expect(t).toContain('BL-2026-0412');
    expect(textOf(pv('dl_demo_1'))).toMatch(/Bon de livraison n°\n—\n/);
  });
  // E6: a blocking reservation still open puts the reception off, and the quantity is not counted as received, as `qtyReceived` counts it
  const withBlocking = (liftedAt?: string): Delivery => {
    const d = state.deliveries.dl_demo_2;
    return { ...d, qty: 20, reception: { ...d.reception, result: 'reserve', qty: 5, reserves: d.reception.reserves!.map((r, i) => ({ ...r, liftedAt: undefined, liftedBy: undefined, ...(i === 0 ? { severity: 'blocking' as const, ...(liftedAt ? { liftedAt, liftedBy: 'M. Durand' } : {}) } : {}) })) } };
  };
  it('says "Réception reportée" and does not count the quantity while a blocking reservation is open, as qtyReceived does', () => {
    const d = withBlocking(), t = textOf(pvPdf(d, o)).replace(/\n/g, ' ');
    expect(sp(resultText(d))).toBe('Réception reportée : 1 réserve bloquante');
    expect(quantityText(d)).toMatchObject({ label: 'Quantité livrée' });
    expect(quantityText(d).value).toContain('non comptée comme reçue');
    expect(quantityText(d).value).not.toContain('reste à livrer');
    expect(qtyReceived(d)).toBe(0);
    expect(t).toContain('[X] Réception reportée : 1 réserve bloquante.');   // the sentence of the screen
    expect(t).toContain('Quantité livrée');
  });
  it('pronounces the reception again, quantity received counted, once the blocking reservation is lifted', () => {
    const d = withBlocking('2026-09-20');
    expect(resultText(d)).toMatch(/^Réception prononcée avec 2 réserves$/);
    expect(quantityText(d).label).toBe('Quantité reçue');
    expect(sp(quantityText(d).value)).toBe('5 · commandée : 20 · reste à livrer : 15');
    expect(qtyReceived(d)).toBe(5);
    expect(textOf(pvPdf(d, o)).replace(/\n/g, ' ')).toContain('[X] Réception prononcée avec 2 réserves.');
  });
  it('prints on several pages when the report is long, with the number of the page on each', () => {
    const d = state.deliveries.dl_demo_2, long = { ...d, reception: { ...d.reception, reserves: Array.from({ length: 14 }, (_, i) => ({ ...d.reception.reserves![0], id: `rv_${i}`, text: `Réserve numéro ${i + 1} à décrire sur plusieurs lignes pour remplir la page du procès-verbal` })) } };
    const pdf = pvPdf(long, o), pages = Number(pdf.match(/\/Count (\d+)/)![1]);
    expect(pages).toBeGreaterThan(1);
    expect(textOf(pdf)).toContain(`page ${pages} sur ${pages}`);
  });
  // ---- LOT 1: the proof stays whole (the seal, what happened after the signature, the facts of the release, the hour of the device)
  it('prints the seal of a signed PV in the same words everywhere, with its state', () => {
    const d = sealed(state.deliveries.dl_demo_1), t = flat(pvPdf(d, o));
    expect(sealView(d).state).toBe('intact');
    expect(t).toMatch(/Scellé SHA-256 : [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} \(calculé à la signature\)/);
    expect(t).toContain('Scellé intact : le contenu de ce PV correspond au dernier scellé.');
    expect(t).not.toContain('Modifié depuis la signature');
    expect(flat(pv('dl_demo_13'))).toContain('Scellé SHA-256 : aucun (calculé à la signature)');   // not signed: nothing to say yet
  });
  it('prints an intact seal on every signed order of the example, the closed delivery of an order in two times included', () => {
    const signed = Object.values(state.deliveries).filter(d => isLocked(d));
    expect(signed.length).toBeGreaterThanOrEqual(9);
    signed.forEach(d => {
      expect(sealView(d).state, d.id).toBe('intact');
      expect(flat(pvPdf(d, o)), d.id).toMatch(/Scellé SHA-256 : [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} \(calculé à la signature\)/);
    });
    expect(sealView(deliveryAt(state.deliveries.dl_demo_13, 1).d).state).toBe('intact');
    expect(flat(pv('dl_demo_13', { no: 1 }))).toContain('Scellé intact');
    expect(flat(pv('dl_demo_14'))).toMatch(/recalculé le 09\/01\/2026 à 9 h 35, par .* : signature de l'entreprise/);   // the company signed after the mention: sealed again
  });
  // G-2 (proof b4 of the audit): the file edited outside of the screen is told, with the moment of the seal it no longer matches
  it('says "Modifié depuis la signature" when the content is not the one that was sealed, whatever was changed', () => {
    const d = sealed(state.deliveries.dl_demo_1);
    const edited: Delivery[] = [{ ...d, client: 'Autre client' }, { ...d, qty: 3 }, { ...d, promisedAt: '2026-01-01' }, { ...d, milestones: d.milestones.map((m, i) => (i === 2 ? { ...m, max: 11, requirement: '10 à 11 mm' } : m)) },
      withRec(d, { name: 'Quelqu un d autre' }), withRec(d, { signedAt: '2026-08-01T08:00' }), { ...d, signClient: state.deliveries.dl_demo_2.signClient }];
    edited.forEach((x, i) => {
      expect(sealView(x).state, `edit ${i}`).toBe('modified');
      expect(flat(pvPdf(x, o)), `edit ${i}`).toContain('Modifié depuis la signature : le contenu de ce PV ne correspond plus au scellé du 25/09/2026 à 9 h 00.');
    });
    expect(sp(sealView(withRec(d, { seals: [...d.reception.seals!, { hash: sealOf(d), at: '2026-09-26T08:00', by: 'Paul', why: 'correction : faute de frappe' }] })).lines.join(' '))).toContain(sp('recalculé le 26/09/2026 à 8 h 00, par Paul : correction : faute de frappe'));
  });
  it('lists what was corrected after the signature, one line each, with the seal laid again by each correction (the moves of the domain)', () => {
    const d = state.deliveries.dl_demo_1, fixed = correctLocked(d, { name: 'M. Dupont', _why: 'faute de frappe' }, 'Paul', '2026-09-26T08:00'), t = flat(pvPdf(fixed, o));
    expect(fixed).not.toBe(d);
    expect(sealView(fixed).state).toBe('intact');                                              // the correction is sealed: it is not a change outside of the screen
    expect(t).toContain('Correction après signature, le 26/09/2026 à 8 h 00, Paul : Corrigé : nom M. Durand devient M. Dupont (motif : faute de frappe)');
    expect(t.match(/Scellé SHA-256/g)).toHaveLength(2);
    expect(t).toContain('(calculé à la signature)');
    expect(t).toContain('(recalculé le 26/09/2026 à 8 h 00, par Paul : correction : faute de frappe)');
    expect(flat(pvPdf({ ...fixed, client: 'Autre client' }, o))).toContain('Modifié depuis la signature : le contenu de ce PV ne correspond plus au scellé du 26/09/2026 à 8 h 00.');   // the last seal counts
  });

  it('keeps the bounds and the instrument of a check as they were; the requirement of the check is told only when the definition has changed since (otherwise it repeats the table)', () => {
    const d = state.deliveries.dl_demo_1, ev = { at: '2026-08-17T11:05', by: 'David K.', kind: 'check' as const, ok: true, measured: '1 245,2 mm', requirement: 'Entre 1 244 et 1 246 mm', min: 1244, max: 1246, instrumentId: 'eq_demo_cle' };
    const ms = d.milestones.map((m, i) => (i === 2 ? { ...m, unit: 'mm', min: 1244, max: 1246, history: [ev] } : m));
    const same = flat(pvPdf({ ...d, milestones: ms }, { ...o, equipments: state.equipments }));
    expect(same).toContain(`Jalon 3 : Au contrôle du 17/08/2026 à 11 h 05 : plage attendue : entre 1244 et 1246 mm ; instrument : ${state.equipments.eq_demo_cle.name}`);
    expect(same).not.toContain('exigence « Entre 1 244 et 1 246 mm »');                                                       // unchanged: the table says it already
    expect(same).not.toContain('Définition actuelle du jalon différente');
    const later = flat(pvPdf({ ...d, milestones: ms.map((m, i) => (i === 2 ? { ...m, requirement: 'Entre 1 240 et 1 250 mm', min: 1240, max: 1250 } : m)) }, { ...o, equipments: state.equipments }));
    expect(later).toContain('exigence « Entre 1 244 et 1 246 mm » ; plage attendue : entre 1244 et 1246 mm');                            // as it was
    expect(later).toContain('Définition actuelle du jalon différente : exigence « Entre 1 240 et 1 250 mm » ; plage attendue : entre 1240 et 1250 mm');
    expect(flat(pvPdf({ ...d, milestones: ms }, o))).not.toContain('instrument :');                                            // equipments not given: no invented name
    expect(flat(pvPdf({ ...d, milestones: ms }, { ...o, equipments: {} }))).toContain('instrument : supprimé');
    expect(flat(pv('dl_demo_1'))).toMatch(/Jalon 3 : Au contrôle du 17\/08\/2026 à \d+ h \d\d : plage attendue : entre 1244 et 1246 mm/);   // the checks of the example keep them
    expect(flat(pv('dl_demo_1'))).not.toContain('exigence «');
    const old = { ...d, milestones: ms.map(m => ({ ...m, history: m.history?.map(({ requirement, min, max, instrumentId, ...e }) => e) })) };   // an old check kept no copy of them
    expect(flat(pvPdf(old, { ...o, equipments: state.equipments }))).not.toContain('Au contrôle du');
  });

  // G-19: a lift made after the signature is not part of the PV as signed
  it('tells apart the reservations lifted after the signature, and keeps the list as it was signed', () => {
    const d = state.deliveries.dl_demo_2, t = flat(pv('dl_demo_2'));
    expect(t).toContain('LEVÉES APRÈS LA SIGNATURE Réserve 1 · Caisson 7 : levée le 24/09/2026, enregistrée par Mme Perret');
    expect(t).toContain('Non levée à la signature');
    const before = flat(pvPdf(withRec(d, { signedAt: '2026-09-25T10:00' }), o));          // lifted before the signature: the list says it, no block
    expect(before).not.toContain('Levées après la signature'.toUpperCase());
    expect(before).not.toContain('Non levée à la signature');
    expect(before).toContain('levée enregistrée par Mme Perret');
  });
  it('compares the day of a lift with the day of the signature, and the journal when it is the same day', () => {
    const d = state.deliveries.dl_demo_2, x = d.reception.reserves![0];
    expect(liftedAfterSign(d, x)).toBe(true);                                                                                      // 24/09 after 22/09
    expect(liftedAfterSign({ ...d, journal: [] }, { ...x, liftedAt: '2026-09-22' })).toBe(false);                                     // same day, nothing in the journal says it came later
    const log = (at: string): Delivery => ({ ...d, journal: [{ at, by: 'M', text: `Réserve « ${x.text} » levée, constatée par M`, proof: true }] });
    expect(liftedAfterSign(log('2026-09-22T16:00'), { ...x, liftedAt: '2026-09-22' })).toBe(true);
    expect(liftedAfterSign(log('2026-09-22T15:00'), { ...x, liftedAt: '2026-09-22' })).toBe(false);                               // before the signature of 15 h 10
    expect(liftedAfterSign(state.deliveries.dl_demo_13, x)).toBe(false);                                                           // not signed: nothing is "after"
  });

  // D-7, G-14
  it('says a signature without a release before, who allowed it and why, and the facts of a derogation', () => {
    const d = withRec(state.deliveries.dl_demo_5, { signWaiver: { by: 'Paul', why: 'Livraison urgente chez le client', at: '2026-09-25T08:00' } });
    expect(sp(releaseLines(d))).toEqual(['Pas de libération enregistrée', 'Signé sans libération préalable : dérogation de Paul, motif : Livraison urgente chez le client, le 25/09/2026 à 8 h 00']);
    expect(flat(pvPdf(d, o))).toMatch(/Signé sans libération préalable : dérogation de Paul, motif : Livraison urgente chez le client/);
    const dero = state.deliveries.dl_demo_6, t = flat(pv('dl_demo_6'));
    expect(t).toContain(`Par dérogation de ${dero.derogation!.by}`);
    expect(t).toContain(dero.derogation!.why);
    expect(t.match(new RegExp(dero.derogation!.why.slice(0, 20), 'g'))).toHaveLength(1);        // said once
    // what the domain says of the authorisation is on the PV: the person outside the list of those who release
    const listed: Params = { ...p, reception: { ...p.reception, releasers: ['Nicolas R.'] } }, d1 = state.deliveries.dl_demo_1;
    expect(sp(derogationFacts(d1, listed))).toEqual(['Antoine P. : personne hors de la liste des personnes qui libèrent']);
    expect(flat(pvPdf(d1, { ...o, params: listed }))).toContain('Antoine P. : personne hors de la liste des personnes qui libèrent');
    expect(flat(pvPdf(d1, o))).not.toContain('hors de la liste');
  });
  it('says a release recorded after the delivery', () => {
    const d = state.deliveries.dl_demo_1;
    expect(releaseLines(d).join(' ')).not.toContain('après la livraison');
    expect(releaseLines({ ...d, releasedAt: '2026-08-19', releasedMoment: '2026-08-19T09:00' })).toContain('Libération enregistrée après la livraison du 18/08/2026 à 10\u00a0h\u00a015');
  });

  // D-23, P-18
  it('says that the hours are those of the device, with its time zone, and the moment of the photo of a paper PV', () => {
    const d = state.deliveries.dl_demo_1;
    expect(flat(pv('dl_demo_1'))).toMatch(/Heures lues sur l'horloge de l'appareil, non certifiées(, fuseau \S+)?\./);   // the zone is the one of the device that built the example
    expect(flat(pvPdf(withRec(d, { signTz: 'Europe/Paris' }), o))).toContain("Heures lues sur l'horloge de l'appareil, non certifiées, fuseau Europe/Paris.");
    expect(textOf(pv('dl_demo_5'))).not.toContain('horloge');                                   // nothing signed: no hour to read
    const paper = withRec(state.deliveries.dl_demo_8, { signedAt: undefined, pvPhotoAt: '2026-09-16T14:20' }), t = flat(pvPdf(paper, o));
    expect(t).toContain('Photo du PV papier signé, prise le 16/09/2026 à 14 h 20, jointe au dossier de la commande.');
    expect(t).toMatch(/Pour le client \(personne qui réceptionne\) Nom : .* Date : 16\/09\/2026 à 14 h 20/);               // the date of the box is the one of the photo
  });
  it('gives the organisation of the witness of a customer who did not sign', () => {
    const d = state.deliveries.dl_demo_14, x = withRec(d, { noSign: { ...d.reception.noSign!, witnessOrg: 'Client' } });
    expect(flat(pvPdf(x, o))).toContain('témoin : Gardien du site (Client), le 09/01/2026 à 9 h 30');
  });
});

// ---- LOT 3: the PV on paper (P-1, P-2, P-6, P-10, P-11, P-12, P-19, P-20, S-16)
const decode = (h: string) => new TextDecoder('windows-1252').decode(Uint8Array.from((h.match(/../g) ?? []).map(x => parseInt(x, 16))));
// The runs of text of a file with their place: x, y, size, text
const runs = (pdf: string) => [...pdf.matchAll(/\/(F[12]) ([\d.]+) Tf 1 0 0 1 ([\d.-]+) ([\d.-]+) Tm <([0-9a-f]*)> Tj/g)].map(m => ({ bold: m[1] === 'F2', size: +m[2], x: +m[3], y: +m[4], t: decode(m[5]) }));
const segs = (s?: number[][][]) => (s ?? []).reduce((a, st) => a + Math.max(st.length - 1, 0), 0);
const inkSegments = (pdf: string) => (pdf.match(/ RG 1 w /g) || []).length;   // the strokes of a signature are drawn at a width of 1, the frames at 0.5

describe('PV de réception, PDF: the signatures of the lift and of the release, the photos told (P-1)', { timeout: 30_000 }, () => {
  const d = state.deliveries.dl_demo_2;
  it('draws the signature of the release and of the lift as it draws the two signatures of the PV', () => {
    const rv = d.reception.reserves!, pdf = pv('dl_demo_2');
    expect(segs(d.releaseSign)).toBeGreaterThan(0);      // the order of the example has both a signature of the release
    expect(rv.some(x => segs(x.liftSign) > 0)).toBe(true);   // and one of a lift
    const all = segs(d.signCompany) + segs(d.signClient) + segs(d.releaseSign) + rv.reduce((a, x) => a + segs(x.liftSign), 0);
    expect(inkSegments(pdf)).toBe(all);
    expect(inkSegments(pdf)).toBeGreaterThan(segs(d.signCompany) + segs(d.signClient));
    const t = flat(pdf);
    expect(t).toContain('Libération avant départ Nom : Antoine P.');                    // the box of the release, with who and when
    expect(t).toMatch(/Signature de levée · Réserve 1 · Caisson 7/);
    expect(inkSegments(pv('dl_demo_1'))).toBe(segs(state.deliveries.dl_demo_1.signCompany) + segs(state.deliveries.dl_demo_1.signClient) + segs(state.deliveries.dl_demo_1.releaseSign));
  });
  it('draws the signature of a lift made before the signature of the PV next to the list, and the one of a lift made after it in its own block', () => {
    const before = withRec(d, { signedAt: '2026-09-25T10:00', reserves: d.reception.reserves!.map(x => ({ ...x })) }), t = flat(pvPdf(before, o));
    expect(t).not.toContain('Levées après la signature'.toUpperCase());
    expect(t).toContain('Signature de levée · Réserve 1 · Caisson 7');
    expect(inkSegments(pvPdf(before, o))).toBe(inkSegments(pv('dl_demo_2')));
  });
  it('tells every photo by its count and says that it stays in the application, never "Voir la photo"', () => {
    const t = flat(pv('dl_demo_2'));
    expect(t).toContain("Réserve 1 · Caisson 7 : 2 photos jointes dans l'application, non reprises dans ce fichier (constat, reprise).");
    expect(t).toContain("Réserve 2 · Caissons 3 et 9 : 1 photo jointe dans l'application, non reprise dans ce fichier (constat).");
    expect(t).toContain("Réserve 1 · Caisson 7 : 1 photo jointe dans l'application, non reprise dans ce fichier (levée).");   // the lift made after the signature
    expect(t).toMatch(/Jalon 2 : 1 photo jointe dans l'application, non reprise dans ce fichier \(contrôle\)/);
    expect(photosNote(3)).toBe("3 photos jointes dans l'application, non reprises dans ce fichier");
    const photos = (x: Delivery) => x.milestones.reduce((a, m) => a + +!!m.photo + +!!m.gapPhoto, 0) + (x.reception.photos ?? []).length + (x.reception.reserves ?? []).reduce((a, r) => a + +!!r.photo + +!!r.repairPhoto + +!!r.liftPhoto, 0) + +!!x.reception.refusal?.photo;
    Object.values(state.deliveries).forEach(x => expect(/dans l'application, non reprises? dans ce fichier/.test(flat(pvPdf(x, o))), x.id).toBe(photos(x) > 0));
    Object.values(state.deliveries).forEach(x => expect(textOf(pvPdf(x, o)), x.id).not.toMatch(/Voir la photo/));
  });
  it('says a reservation without text, and where its photo is', () => {
    const edit = (patch: Partial<Delivery['reception']['reserves'] extends (infer R)[] | undefined ? R : never>) => withRec(d, { reserves: d.reception.reserves!.map((x, i) => (i ? x : { ...x, ...patch })) });
    const t = flat(pvPdf(edit({ text: '' }), o));
    expect(t).toContain("Réserve sans texte (photo dans l'application)");
    expect(t).not.toContain('Voir la photo');
    expect(flat(pvPdf(edit({ text: '  ', photo: undefined }), o))).toMatch(/Réserve sans texte(?! \()/);
    expect(reserveText({ ...d.reception.reserves![0], text: '' })).toBe("Réserve sans texte (photo dans l'application)");
    expect(reserveText({ ...d.reception.reserves![0], text: '' }, true)).toBe('Réserve sans texte (photo ci-dessous)');      // as the screen and the paper say it, the photo is drawn there
  });
  it('tells the photos of the delivery, of the refusal and of the paper PV', () => {
    const x = withRec(state.deliveries.dl_demo_12, { photos: ['a', 'b'], refusal: { ...state.deliveries.dl_demo_12.reception.refusal!, photo: 'c' } }), t = flat(pvPdf(x, o));
    expect(t).toContain(`État à la livraison : ${photosNote(2)}.`);
    expect(t).toContain(`Constat du refus : ${photosNote(1)}.`);
    const paper = flat(pvPdf({ ...state.deliveries.dl_demo_8, pvPhoto: 'p' }, o));
    expect(paper).toContain('jointe au dossier de la commande.');                                                 // the sentence of the screen, as it is
    expect(paper).toContain(`PV papier signé : ${photosNote(1)}.`);
  });
});

describe('PV de réception, PDF: the characters of Latin-1 and what is not (P-2)', { timeout: 30_000 }, () => {
  const d = state.deliveries.dl_demo_1;
  it('writes the closest letters instead of "?", names and bounds included, and says it at the foot of the page', () => {
    const x = { ...withRec(d, { name: 'Ștefan Țurcanu', role: 'Responsable Łódź' }), milestones: d.milestones.map((m, i) => (i ? m : { ...m, requirement: 'Épaisseur ≥ 2 mm, ⌀ 12 ±0,1 ≤ 5′ Ž Š Ÿ' })) }, pdf = pvPdf(x, o), t = flat(pdf);
    expect(t).toContain('Personne qui réceptionne Stefan Turcanu, Responsable Lódz');
    expect(t).toContain('Nom : Stefan Turcanu, Responsable Lódz');
    expect(t).toContain("Exigence : Épaisseur >= 2 mm, diam. 12 ±0,1 <= 5' Ž Š Ÿ");                         // Ž Š Ÿ are in the table of Windows-1252: drawn as they are
    expect(t).not.toContain('?');
    expect(t).toContain(LOSSY_NOTE);
    expect(runs(pdf).filter(r => r.t === LOSSY_NOTE).length).toBe(2);                                          // on each of the two pages, where the table and the box of the signature hold a replaced character
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    Object.values(state.deliveries).forEach(y => expect(flat(pvPdf(y, o)), y.id).not.toContain(LOSSY_NOTE));    // the examples are in Latin-1
  });
  it('still writes "?" for what has no approximation, and says so', () => {
    const t = flat(pvPdf({ ...d, item: 'Étagère ☃ 日本' }, o));
    expect(t).toContain('Étagère ? ??');
    expect(t).toContain(LOSSY_NOTE);
  });
});

describe('PV de réception, PDF: nothing leaves the page (P-10, S-16)', { timeout: 30_000 }, () => {
  const d = state.deliveries.dl_demo_2, rv0 = d.reception.reserves![0];
  const hostile: Delivery = {
    ...d, item: 'X'.repeat(200), client: 'C'.repeat(150),
    milestones: d.milestones.map((m, i) => (i ? m : { ...m, label: 'Soudure/étanchéité-périmétrique-complète', point: 'P'.repeat(180), requirement: 'E'.repeat(160) })),
    reception: { ...d.reception, place: `https://exemple.fr/${'a'.repeat(120)}`, email: `prenom.nom.tres.long.${'x'.repeat(60)}@entreprise-cliente.example.com`, bl: 'B'.repeat(90),
      reserves: [{ ...rv0, text: 'R'.repeat(500), where: 'Z'.repeat(70) }, ...d.reception.reserves!.slice(1)] },
  };
  it('cuts a word longer than the line, in the cells, the lines and the heads', () => {
    const pdf = pvPdf(hostile, o), all = runs(pdf);
    all.forEach(r => { expect(r.x + textWidth(r.t, r.size, r.bold), r.t.slice(0, 40)).toBeLessThanOrEqual(A4.w - 42 + 0.5); expect(r.y).toBeGreaterThan(15); });
    expect(all.length).toBeGreaterThan(50);
    const t = flat(pdf);
    expect(t.replace(/ /g, '')).toContain('X'.repeat(200));                                                    // the 200 characters are all there, cut at the width
    expect(t.replace(/ /g, '')).toContain('R'.repeat(500));
    expect(t).toContain('Soudure/étanchéité-périmétrique-complète'.slice(0, 12));
    const band = all.filter(r => r.size === 10 && r.y > A4.h - 150).map(r => r.t).join('');
    expect(band).toContain('PV-2026-009');                                                                     // the sub-title says the number of the PV AND the beginning of the deliverable
    expect(band).toContain('XXXX');
  });
  it('goes on to the next page with a value or a cell taller than a page, and never leaves the header of a table alone at the foot', () => {
    const wide = pvPdf({ ...hostile, item: 'mot '.repeat(900), reception: { ...hostile.reception, reserves: [{ ...rv0, text: 'texte '.repeat(1200) }] } }, o), all = runs(wide);
    expect(Number(wide.match(/\/Count (\d+)/)![1])).toBeGreaterThan(3);
    all.forEach(r => { expect(r.y).toBeGreaterThan(15); expect(r.x + textWidth(r.t, r.size, r.bold)).toBeLessThanOrEqual(A4.w - 42 + 0.5); });
    const pages = wide.split(/\/Type \/Page \/Parent/).slice(1).map(p => runs(p).map(r => r.t));
    pages.forEach((p, i) => { if (p.includes('Réserve') && p.includes('Gravité')) expect(p.some(l => l.startsWith('texte')), `page ${i + 1}`).toBe(true); });   // the header and the beginning of the first row are on the same page
    expect(flat(wide).match(/texte/g)!.length).toBe(1200);                                                       // nothing lost
  });
  it('keeps a title of 5 lines to 3, with "…"', () => {
    const t = textOf(pvPdf({ ...d, ref: 'a '.repeat(80), client: 'b '.repeat(80) }, o)).split('\n').filter(l => l.includes('…'));
    expect(t.length).toBeGreaterThan(0);
  });
});

describe('PV de réception, PDF: the same words as the screen and the paper (P-11, P-12, P-19, P-20)', { timeout: 30_000 }, () => {
  it('says the sentences exported for the screen, the lines of the order and the clause, for the 14 orders', () => {
    Object.values(state.deliveries).forEach(d => {
      const t = flat(pv(d.id)), v = deliveryAt(d);
      if (d.reception.result) expect(t, d.id).toContain(sp(resultText(d)));   // a reception without result: two empty boxes to tick by hand
      orderRows(d, v, true).filter(x => x[1]).forEach(([k, val]) => { expect(t, `${d.id} ${k}`).toContain(k); expect(t, `${d.id} ${k}`).toContain(sp(val)); });
      const c = clauseLine(d, p);
      if (c) expect(t, d.id).toContain(sp(c));
      expect(t, d.id).toContain(sp(orderTitle(d)));
      expect(t, d.id).not.toMatch(/contradictoire|Constat fait avec|Voir la photo/);
    });
  });
  it('says what is missing in so many words: a client, a number of order, the name of the person (P-12, P-19)', () => {
    const d = state.deliveries.dl_demo_1, none = { ...withRec(d, { name: '', role: '', email: '', place: '' }), ref: '', client: '', item: '' }, t = flat(pvPdf(none, o));
    expect(orderTitle(none)).toBe('Commande sans numéro · Client non renseigné');
    expect(t).toContain(`${NO_ORDER} · ${NO_CLIENT}`);
    expect(t).toContain('Client Client non renseigné');
    expect(t).toContain('Commande Commande sans numéro');
    expect(t).toContain('Personne qui réceptionne Nom non renseigné');
    expect(t).toMatch(/Pour le client \(personne qui réceptionne\)\s+Réceptionnaire : nom non renseigné\s+Date :/);                         // signed without a name: in so many words, in the box too
    expect(t).toMatch(/Pour Atelier é \(qui remet\)\s+Nom : David K\./);                                           // the company side has its name
    expect(t).toContain('PV de réception Commande sans numéro');                                                // the foot of the pages and the title of the file
    expect(t).not.toMatch(/Commande · Client|Client · /);
    const role = withRec(d, { name: '', role: 'Acheteur', email: 'a@b.fr' });
    expect(receptionistText(role.reception)).toBe('Nom non renseigné, Acheteur · a@b.fr');                       // the function is never the name; no "· e-mail" at the head
    expect(flat(pvPdf(role, o))).toMatch(/Pour le client \(personne qui réceptionne\)\s+Réceptionnaire : nom non renseigné, Acheteur/);
    expect(receptionistText(withRec(d, { name: 'M. Durand', role: '', email: '' }).reception)).toBe('M. Durand');
    // nothing signed: the box stays to fill by hand
    const unsigned = withRec({ ...state.deliveries.dl_demo_4, signClient: undefined, signCompany: undefined }, { name: '' });
    expect(flat(pvPdf(unsigned, o))).toMatch(/Pour le client \(personne qui réceptionne\)\s+Nom :\s+Date :\s+Signature :/);
    // the number of the PV that is not given yet
    expect(pvHead(d)).toBe('PV-2026-002 · CMD-2026-041 · Client A');
    expect(pvHead(unsigned)).toBe(`${NO_PV} · CMD-2026-058 · Client B`);
  });
  it('writes the date AND the hour of the copy at the foot of every page, and "page n sur N"', () => {
    const pdf = pv('dl_demo_2'), foot = runs(pdf).filter(r => r.y < 40 && r.size === 8).map(r => r.t);
    expect(foot.filter(t => t.includes('édité le 25/09/2026 à 10\u00a0h\u00a000')).length).toBe(Number(pdf.match(/\/Count (\d+)/)![1]));
    expect(foot).toContain(`page 1 sur ${pdf.match(/\/Count (\d+)/)![1]}`);
    expect(editedAt(now)).toBe('Édité le 25/09/2026 à 10\u00a0h\u00a000');
    expect(textOf(pdf)).not.toMatch(/Édité le/);                                                               // said once per page, at the foot: no page for it alone
    const late = new Date(2026, 8, 25, 9, 5), t = textOf(pvPdf(state.deliveries.dl_demo_1, { ...o, date: late }));
    expect(t).toContain('édité le 25/09/2026 à 9 h 05');
  });
  it('names the PV, the order and the customer at the head of the pages that follow', () => {
    const heads = runs(pv('dl_demo_2')).filter(r => r.t.endsWith('(suite)')).map(r => r.t);
    expect(heads.length).toBeGreaterThan(0);
    heads.forEach(h => expect(h).toBe(`${pvHead(state.deliveries.dl_demo_2)} (suite)`));
  });
});

// ---- lot 8: the language of the file, one title for the customer, the typography and the elision (A-11, A-15, A-4)
describe('PV de réception, PDF: lot 8, the same words and the typography on the screen, the paper and the file', { timeout: 30_000 }, () => {
  it('declares the language of the file for a screen reader and stays a pure ASCII file', () => {
    const pdf = pv('dl_demo_1');
    expect(pdf).toContain('/Lang (fr-FR)');
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
  });
  it('gives the box of the customer the one title of the screen, the paper and the file, and the report one title only', () => {
    expect(CLIENT_TITLE).toBe('Pour le client (personne qui réceptionne)');
    Object.values(state.deliveries).forEach(d => {
      const t = flat(pvPdf(d, o));
      expect(t, d.id).toContain(CLIENT_TITLE);
      expect(t.match(/PROCÈS-VERBAL DE RÉCEPTION/g), d.id).toHaveLength(1);
      expect(t, d.id).not.toMatch(/contradictoire|habilité/i);
    });
  });
  it('prints the clause of the contract and never the percentage noted for an order (no screen writes it)', () => {
    const d = withRec(state.deliveries.dl_demo_3, { result: 'reserve', retentionPct: 10 }), p2 = withClause(true);
    expect(clauseLine(d, p2)).toBe(retentionText(p2));
    expect(sp(clauseLine(d, p2))).toBe('Retenue prévue au contrat : 5 % au plus, levée sous 7 jours ouvrés.');
    expect(flat(pvPdf(d, { ...o, params: p2 }))).not.toContain('Retenue indiquée');
  });
  it('says "d\'Antoine" and "de Karim" before the name of the person who waived or allowed, never "de Antoine"', () => {
    const m = (by: string) => ({ ...state.deliveries.dl_demo_6.milestones[0], ok: false, waivedBy: by, waivedWhy: 'Accord', waivedAt: '2026-09-10T09:00' });
    expect(sp(milestoneFacts(m('Antoine P.'))).join(' | ')).toContain("Dérogation d'Antoine P. le 10/09/2026 à 9 h 00 : Accord");
    expect(sp(milestoneFacts(m('Karim T.'))).join(' | ')).toContain('Dérogation de Karim T. le 10/09/2026 à 9 h 00 : Accord');
    const w = withRec(state.deliveries.dl_demo_6, { signWaiver: { by: 'Antoine P.', why: 'Urgence', at: '2026-09-10T09:00' } }), none = { ...w, releasedAt: '' };
    expect(sp(releaseLines(none)).join(' | ')).toContain("dérogation d'Antoine P., motif : Urgence");
    expect(sp(releaseLines(withRec(state.deliveries.dl_demo_6, { signWaiver: undefined }))).join('|')).not.toMatch(/de [AEIOUÉ]/);
  });
  it('holds the typography in every sentence shared by the screen, the paper and the file: a narrow no-break space before : ; ? ! % » and after «', () => {
    const all = Object.values(state.deliveries).flatMap(d => {
      const v = deliveryAt(d);
      return [resultText(d), quantityText(d).value, noSignText(d), ...releaseLines(d, p), ...refusalLines(d), ...sealView(d).lines, ...corrections(d), ...milestoneFacts(d.milestones[0]),
        ...reserveLines(v.d)];
    }).filter(Boolean);
    expect(all.length).toBeGreaterThan(40);
    all.forEach(t => { expect(t).not.toMatch(/ [:;?!%»]/); expect(t).not.toMatch(/« /); });
    expect(all.some(t => /\u202f:/.test(t))).toBe(true);
    expect(UNLOCKED_NOTE).not.toMatch(/ :/);
  });
});
