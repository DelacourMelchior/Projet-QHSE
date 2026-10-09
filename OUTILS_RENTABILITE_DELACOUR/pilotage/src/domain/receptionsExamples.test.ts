// Example records of tool 3.4: every state of the tool is shown, no amount anywhere, photos as small drawings, the example adds no alert to the other tools, never replaces
// what a company holds, and a fictitious company saved before this version is completed once (its orders read in the current shape, nothing typed lost).
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Delivery, Nc, State, Strokes } from './types';
import { DEFAULT_NEXTS, DELIVERY_STATE, LEGACY_MILESTONES, isLocked, logDelivery, lotSealState, lotsOf, milestoneStatus, outOfBounds, pvSigned, qtyReceived, receptionCfg, remainingQty, reserveLateDays, reservesOf, deliveryState, sealState, shortSeal, signBlockers, signCompany, signatureOk, quotePromisedOn, retentionFact, type DeliveryState } from './receptions';
import { RECEPTION_EXAMPLE_LEVEL, applyReceptionExample, completeReceptionExamples, modifiedReceptionExamples, printOfNc, printOfOrder, receptionExamples, removeReceptionExample } from './receptionsExamples';
import OLD from './receptionExamplesOld.json';
import { blankState, demoState } from './templates';
import { normalize } from './migrate';
import { deliveriesToAsk } from './commercial';
import { ncCost, ncState, workshopsToOpen } from './quality';
import { synthesis } from './engine';
import { toolBadge } from './status';
import { businessOf } from './base';
import { isoDate } from './periods';
import { frenchHolidays } from './calendar';
import { quotesWithoutOrder, receptionInsights, receptionSummary, receptionTodos } from './receptionsAll';
import { RECEPTION_KPIS } from './receptionsFeeds';

const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const ex = receptionExamples(now);
const orders = Object.values(ex.deliveries);
const P = blankState('industrie', now).params;
const demo = demoState(now);
const CLIENTS: Record<string, string> = { dl_demo_1: 'Client A', dl_demo_2: 'Client C', dl_demo_3: 'BâtiPro', dl_demo_4: 'Client B', dl_demo_5: 'Client A', dl_demo_6: 'Agencement Morel', dl_demo_7: 'Menuiserie Roche', dl_demo_8: 'Hôtel des Tilleuls' };
const STATES: Record<string, DeliveryState> = {
  dl_demo_1: 'accepted', dl_demo_2: 'reserve', dl_demo_3: 'reserve_late', dl_demo_4: 'blocked', dl_demo_5: 'in_progress', dl_demo_6: 'released', dl_demo_7: 'accepted', dl_demo_8: 'accepted',
  dl_demo_9: 'to_release', dl_demo_10: 'partial', dl_demo_11: 'lifted', dl_demo_12: 'refused', dl_demo_13: 'delivered', dl_demo_14: 'archived',
};
const mine = (id: string) => id.startsWith('nc_demo_r');
// the order as the renewal of a company saved on `saved` gives it today: the example of the day, with its mark; the three orders that come from a quote follow the day that quote was decided (the company
// of these tests holds the quotes of the demo of `now`)
// The renewal dates the example with the days the company is closed (its settings): those of the demo company, written the day it was made, whatever the day the test runs (T-3)
const renewedAs = (id: string, today = new Date(), saved = now) => ({ ...receptionExamples(['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].includes(id) ? saved : today, undefined, demo.params.closedDays).deliveries[id], exampleHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
const everyReception = (d: Delivery) => [d.reception, ...lotsOf(d).map(l => l.reception)];

// What the first example held before the rework of the tool (from the previous code): the orders and the defects a fictitious company saved then holds
const oldOrders = (today: Date): Delivery[] => {
  const ago = (n: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n)), y = today.getFullYear();
  const ms = (oks: (boolean | null)[], measured: string[] = []) => LEGACY_MILESTONES.map((m, i) => ({ ...m, measured: measured[i] || '', ok: oks[i] ?? null, by: oks[i] === null ? '' : 'David K.', date: oks[i] === null ? '' : ago(6) }));
  const rec = (p: Partial<Delivery['reception']> = {}): Delivery['reception'] => ({ date: '', name: '', role: '', result: '', reserve: '', retentionPct: null, amount: null, liftedAt: '', ...p });
  const dl = (id: string, p: Partial<Delivery>): Delivery => ({ id, ref: '', client: '', item: '', qty: null, milestones: ms([]), releasedBy: '', releasedAt: '', reception: rec(), ...p });
  return [
    dl('dl_demo_1', { ref: `CMD-${y}-041`, client: 'Client A', item: 'Châssis mécano-soudés peints', qty: 150, milestones: ms([true, true, true, true], ['1 245,2 mm', 'Cordons conformes', '88 microns', 'Complet']), releasedBy: 'David K.', releasedAt: ago(41), reception: rec({ date: ago(40), name: 'M. Durand', role: 'Acheteur', result: 'sans', amount: 35000 }) }),
    dl('dl_demo_2', { ref: `CMD-${y}-052`, client: 'Client C', item: 'Caissons de rangement', qty: 12, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(4), reception: rec({ date: ago(3), name: 'Responsable appro', role: 'Réceptionnaire', result: 'reserve', reserve: 'Une poignée mal vissée sur un caisson', retentionPct: 5, amount: 9600 }) }),
    dl('dl_demo_3', { ref: `CMD-${y}-047`, client: 'BâtiPro', item: "Escalier d'atelier", qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'Marc M.', releasedAt: ago(13), reception: rec({ date: ago(12), name: 'Mme Lopez', role: 'Conductrice de travaux', result: 'reserve', reserve: 'Retouche de peinture sur 2 marches', retentionPct: 10, amount: 14000 }) }),
    dl('dl_demo_4', { ref: `CMD-${y}-058`, client: 'Client B', item: 'Portillons de remplacement', qty: 4, milestones: ms([true, true, false, null], ['', '', '62 microns']) }),
    dl('dl_demo_5', { ref: `CMD-${y}-060`, client: 'Client A', item: 'Supports moteur', qty: 400, milestones: ms([true, true, null, null]) }),
    dl('dl_demo_7', { ref: `CMD-${y}-063`, client: 'Menuiserie Roche', item: 'Plateaux et pieds de table', qty: 30, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(7), reception: rec({ date: ago(6), name: 'M. Roche', role: 'Gérant', result: 'sans', amount: 5400 }) }),
    dl('dl_demo_8', { ref: `CMD-${y}-064`, client: 'Hôtel des Tilleuls', item: 'Garde-corps de terrasse', qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'Marc M.', releasedAt: ago(10), reception: rec({ date: ago(9), name: 'Mme Faure', role: 'Directrice', result: 'sans', amount: 6200 }) }),
    dl('dl_demo_6', { ref: `CMD-${y}-055`, client: 'Agencement Morel', item: "Rampe d'atelier", qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(4) }),
  ];
};
// The company saved with that example: the new tool has not touched it, and the marker of 3.4 is absent
const savedOld = (edit: (d: Record<string, Delivery>) => void = () => {}): State => {
  const s = demoState(now), d = Object.fromEntries(oldOrders(now).map(x => [x.id, x]));
  edit(d);
  s.deliveries = d;
  Object.keys(s.ncs).filter(mine).forEach(id => { delete s.ncs[id]; });
  delete s.params.receptionExampleLevel; delete s.params.reception;
  return s;
};

describe('3.4 example: the records', { timeout: 30_000 }, () => {
  it('has fourteen orders, keeps the ids and the customers of the first example, and is the same records on the same day', () => {
    expect(orders).toHaveLength(14);
    expect(Object.keys(ex.deliveries)).toEqual(Object.keys(STATES));
    Object.entries(CLIENTS).forEach(([id, client]) => expect(ex.deliveries[id].client, id).toBe(client));
    expect(receptionExamples(now)).toEqual(ex);
    expect(new Set(orders.flatMap(d => d.milestones.map(m => m.id))).size).toBe(orders.length * 4);
  });
  it('holds no amount and no wording of money or invoicing', () => {
    orders.forEach(d => everyReception(d).forEach(r => expect(r.amount, d.id).toBeNull()));
    const text = JSON.stringify(ex).replace(/data:image[^"]*/g, '');
    expect(text).not.toMatch(/"amount":\s*\d/);
    expect(text).not.toMatch(/€|\beuros?\b|prix|factur|\bmontant\b|marge/i);   // (the time zone of a signature is written "Europe/Paris")
  });
  it('shows the photos as small ASCII drawings or as references, never as a big picture', () => {
    const urls = JSON.stringify(ex).match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g)!;
    expect(urls.length).toBeGreaterThan(30);
    new Set(urls).forEach(src => {
      const svg = atob(src.split(',')[1]);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toMatch(/^[\x20-\x7e]*$/);
      expect(src.length).toBeLessThan(4000);
    });
    const kinds = new Set<string>();
    const walk = (v: unknown, key = '') => {   // `pvPhotoAt` (the moment of the photo) is not a photo
      if (typeof v === 'string' && /photo|Photo/.test(key) && !/At$/.test(key)) { expect(v, key).toMatch(/^(data:image\/svg\+xml;base64,|photo:)/); kinds.add(key); }
      else if (Array.isArray(v)) v.forEach(x => walk(x, key));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
    };
    walk(ex);
    ['photo', 'gapPhoto', 'refPhoto', 'repairPhoto', 'liftPhoto', 'pvPhoto', 'photos'].forEach(k => expect(kinds.has(k), k).toBe(true));
  });
  it('is consistent: a journal in order, defects linked once and decided, locks, numbers of PV, links of the directory and of the other tools', () => {
    orders.forEach(d => {
      const at = (d.journal ?? []).map(l => l.at);
      expect(at, d.id).toEqual([...at].sort());
      expect(d.journal![0].text).toBe('Commande créée');
      d.milestones.forEach(m => { if (m.ncId) { const n = ex.ncs[m.ncId]; expect(n, m.id).toMatchObject({ deliveryId: d.id, milestoneId: m.id, origin: 'interne', processId: 'P3' }); } });
    });
    expect(Object.values(ex.ncs).map(n => n.decision)).toEqual(['retouche', 'retouche']);
    const pvs = orders.flatMap(d => everyReception(d).map(r => r.pvNo)).filter(Boolean) as string[];
    expect(pvs).toHaveLength(10);
    expect(new Set(pvs).size).toBe(pvs.length);
    pvs.forEach(n => expect(n).toMatch(/^PV-\d{4}-\d{3}$/));
    // every PV with a result is signed (finger, photo of the paper, or the mention absent with its witness); the order still open is not
    orders.filter(d => d.reception.result).forEach(d => { expect(pvSigned(d), d.id).toBe(true); expect(isLocked(d), d.id).toBe(true); });
    expect(isLocked(ex.deliveries.dl_demo_13)).toBe(false);
    // the directory, the work instruction, the instrument and the quote the orders point at exist in the demo company
    orders.forEach(d => {
      [d.orgId, d.reception.orgId].filter(Boolean).forEach(id => expect(demo.orgs[id!], `${d.id} ${id}`).toMatchObject({ id }));
      [d.contactId, d.reception.contactId].filter(Boolean).forEach(id => expect(demo.contacts[id!], `${d.id} ${id}`).toMatchObject({ id }));
      if (d.quoteId) expect(demo.quotes[d.quoteId], d.id).toMatchObject({ id: d.quoteId });
      d.milestones.forEach(m => { if (m.sopId) expect(demo.sops[m.sopId], m.id).toMatchObject({ id: m.sopId }); if (m.instrumentId) expect(demo.equipments[m.instrumentId], m.id).toMatchObject({ id: m.instrumentId }); });
    });
    expect(ex.deliveries.dl_demo_2).toMatchObject({ quoteId: 'qt_demo_7', promisedAt: isoDate(new Date(2026, 8, 20)) });   // 26 days ago + 3 weeks
  });
});

describe('3.4 example: every state is shown', { timeout: 30_000 }, () => {
  it('covers each state of the tool, on one order each as designed', () => {
    const st = (d: Delivery, today = now) => deliveryState(d, today, P);
    expect(Object.fromEntries(orders.map(d => [d.id, st(d)]))).toEqual(STATES);
    expect(new Set(orders.map(d => st(d)))).toEqual(new Set(Object.keys(DELIVERY_STATE)));
  });
  it('holds those states on any day, whatever the weekday, the holidays or the year', () => {
    for (let n = 0; n < 60; n++) {
      const d = new Date(2026, 7, 20 + n, 10, 0), e = receptionExamples(d), p = demoState(d).params;
      expect(Object.fromEntries(Object.values(e.deliveries).map(x => [x.id, deliveryState(x, d, p)])), isoDate(d)).toEqual(STATES);
    }
    [new Date(2026, 0, 5, 10), new Date(2026, 0, 6, 10), new Date(2027, 0, 4, 10), new Date(2028, 1, 29, 10), new Date(2026, 11, 31, 10)].forEach(d => {
      const e = receptionExamples(d);
      expect(Object.fromEntries(Object.values(e.deliveries).map(x => [x.id, deliveryState(x, d, demoState(d).params)])), isoDate(d)).toEqual(STATES);
    });
  }, 30000);
  it('milestones: to check, conform, conform after rework, not conform, not applicable; one measure out of its bounds, the others inside; a second person on the critical ones', () => {
    const all = orders.flatMap(d => d.milestones.map(m => ({ d, m })));
    expect(new Set(all.map(x => milestoneStatus(x.m)))).toEqual(new Set(['todo', 'ok', 'reworked', 'ko', 'na']));
    expect(all.filter(x => x.m.measured && (x.m.min != null || x.m.max != null)).length).toBeGreaterThanOrEqual(6);
    expect(all.filter(x => outOfBounds(x.m)).map(x => x.m.id)).toEqual(['dl_demo_4_m3']);
    expect(ex.deliveries.dl_demo_4.milestones[2].history!.at(-1)).toMatchObject({ ok: false, note: expect.stringContaining('mesure hors') });   // pressed "conform", the tool said no
    expect(ex.deliveries.dl_demo_9.milestones[1].history!.map(h => [h.kind, h.ok])).toEqual([['check', false], ['rework', true]]);
    all.filter(x => x.m.critical && x.m.ok).forEach(x => expect(x.m.second, x.m.id).toMatch(/\S/));
    expect(ex.deliveries.dl_demo_9.milestones[3]).toMatchObject({ na: true, naReason: expect.any(String) });
  });
  it('release: by derogation with its reason, a late promised day, checks before departure; the other releases are clean', () => {
    const six = ex.deliveries.dl_demo_6;
    expect(six.derogation).toMatchObject({ by: 'David K.', why: expect.stringContaining('rayure') });
    expect(six.milestones[2]).toMatchObject({ waivedBy: 'David K.', ok: false });
    expect(six.promisedAt! < isoDate(now)).toBe(true);
    expect(signatureOk(six.releaseSign)).toBe(true);
    expect(orders.filter(d => d.derogation).map(d => d.id)).toEqual(['dl_demo_6']);
    expect(six.shipChecks!.filter(c => c.ok).length).toBe(2);
    expect(orders.filter(d => d.releasedAt && d.promisedAt && !d.reception.date && d.promisedAt < isoDate(now)).map(d => d.id)).toEqual(['dl_demo_6']);
    expect(ex.deliveries.dl_demo_1.shipChecks!.every(c => c.ok)).toBe(true);
  });
  it('reservations: two on one order (one lifted with a photo and the signature of the customer), one late, one lifted by the customer for a service', () => {
    const two = reservesOf(ex.deliveries.dl_demo_2);
    expect(two).toHaveLength(2);
    expect(two[0]).toMatchObject({ liftedBy: 'Mme Perret', liftPhoto: expect.stringContaining('data:image'), repairPhoto: expect.any(String), photo: expect.any(String) });
    expect(signatureOk(two[0].liftSign)).toBe(true);
    expect(two[1]).toMatchObject({ handler: 'David K.' });
    expect(two[1].liftedAt).toBeUndefined();
    const late = ex.deliveries.dl_demo_3;
    expect(reserveLateDays(reservesOf(late)[0], late, demo.params, now)).toBeGreaterThanOrEqual(1);
    expect(demo.params.reception?.retention).toEqual({ on: true, maxPct: 5 });   // the clause is a mention of the contract: no percentage is typed on an order (X-13)
    expect(reservesOf(ex.deliveries.dl_demo_11)[0]).toMatchObject({ liftedBy: 'Dr Rey' });
  });
  it('refusal and several deliveries: refused with its motive and photo; refused then presented again (the first one closed in `lots`); in part with the rest to deliver', () => {
    expect(ex.deliveries.dl_demo_12.reception.refusal).toMatchObject({ reason: 'Documents manquants', next: DEFAULT_NEXTS[0], photo: expect.any(String) });
    const two = ex.deliveries.dl_demo_13;
    expect(lotsOf(two)).toHaveLength(1);
    expect(lotsOf(two)[0]).toMatchObject({ no: 1, reception: { result: 'refus', refusal: { reason: 'Autre', other: "Teinte différente de l'échantillon validé" } } });
    expect(signatureOk(lotsOf(two)[0].signClient)).toBe(true);
    expect(two.reception.result).toBe('');
    const part = ex.deliveries.dl_demo_10;
    expect([part.qty, qtyReceived(part), remainingQty(part)]).toEqual([20, 12, 8]);
    expect(part.reception.partialOk).toMatchObject({ by: 'M. Garnier' });
  });
  it('proofs, models and people: finger signatures, paper PV, absent customer with a witness, archive; a site order and a service; teams of the people of 4.2', () => {
    expect(ex.deliveries.dl_demo_1.signClient!.flat().length).toBeGreaterThan(5);
    expect(ex.deliveries.dl_demo_8).toMatchObject({ pvPhoto: expect.any(String) });
    expect(ex.deliveries.dl_demo_8.signClient).toBeUndefined();
    expect(ex.deliveries.dl_demo_14.reception.noSign).toMatchObject({ kind: 'absent', witness: 'Gardien du site' });
    expect(ex.deliveries.dl_demo_14.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Set(orders.map(d => d.template))).toEqual(new Set(['Fabrication', 'Standard', 'Chantier ou pose', 'Revente ou négoce', 'Prestation ou service']));
    const names = Object.values(demo.people).map(p => p.name);
    orders.forEach(d => (d.team ?? []).forEach(n => expect(names, `${d.id} ${n}`).toContain(n)));
    orders.forEach(d => (d.journal ?? []).forEach(l => expect(l.by === '' || names.includes(l.by) || /^(M\.|Mme|Dr) /.test(l.by), `${d.id} ${l.by}`).toBe(true)));
  });
});

describe('3.4 example: what the other tools say', { timeout: 30_000 }, () => {
  const without = (s: State): State => { const w = structuredClone(s); w.deliveries = {}; Object.keys(w.ncs).filter(mine).forEach(id => { delete w.ncs[id]; }); return w; };
  it('5.1: the defects of the example are decided, cost nothing, and leave the workshops of 5.3 as they were', () => {
    const own = Object.values(demo.ncs).filter(n => mine(n.id));
    expect(own).toHaveLength(2);
    own.forEach(n => { expect(ncState(n, now, businessOf(demo.params))).toBe('decided'); expect(ncCost(n, demo.params)).toBeLessThan(500); expect(n.analysisId).toBeUndefined(); });
    expect(workshopsToOpen(demo, now).map(w => w.id)).toEqual(workshopsToOpen(without(demo), now).map(w => w.id));
    expect(Object.values(demo.ncs).map(n => n.ref).length).toBe(new Set(Object.values(demo.ncs).map(n => n.ref)).size);
  });
  it('1.1, 2.3, 5.1, 5.2, 5.3: no indicator added, no alert added, the badges of those tools are unchanged', () => {
    const w = without(demo);
    expect(demo.kpis).toEqual(w.kpis);
    expect(demo.values).toEqual(w.values);
    ['2026-08', '2026-09', '2026-10'].forEach(p => {
      expect(synthesis(demo, p).alerts.map(k => k.id), p).toEqual(synthesis(w, p).alerts.map(k => k.id));
      ['1.1', '2.3', '5.1', '5.2', '5.3'].forEach(t => expect(toolBadge(demo, t, p, now), `${t} ${p}`).toEqual(toolBadge(w, t, p, now)));
    });
  });
  it('2.4: the two receptions without a review stay "without a review", on any day', () => {
    expect(deliveriesToAsk(demo, now).map(d => d.id)).toEqual(['dl_demo_7', 'dl_demo_8']);
    for (let n = 0; n < 15; n++) { const d = new Date(2026, 8, 10 + n, 10, 0); expect(deliveriesToAsk(demoState(d), d).map(x => x.id), isoDate(d)).toEqual(['dl_demo_7', 'dl_demo_8']); }
    expect(demo.feedbacks.fb_demo_1).toMatchObject({ deliveryId: 'dl_demo_1', client: demo.deliveries.dl_demo_1.client });
    expect(demo.feedbacks.fb_demo_2).toMatchObject({ deliveryId: 'dl_demo_2', client: demo.deliveries.dl_demo_2.client });
  });
  it('the demo company holds the orders, the clause of retention and the marker of 3.4', () => {
    expect(Object.keys(demo.deliveries)).toEqual(Object.keys(STATES));
    expect(demo.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    expect(toolBadge(demo, '3.4', '2026-09', now).text).not.toBe('Pas encore utilisé');
  });
});

describe('3.4 example: the queue, the facts and the proposals of the tool', { timeout: 30_000 }, () => {
  it('gives the queue a task of each kind the example can show, one per milestone to check, and states facts without any amount', () => {
    const todos = receptionTodos(demo, now), kinds = new Set(todos.map(t => t.kind));
    ['milestone', 'blocked', 'release', 'late-delivery', 'unsigned', 'reserve', 'reserve-late', 'refused', 'next-lot', 'feedback'].forEach(k => expect(kinds.has(k as never), k).toBe(true));
    expect(todos.filter(t => t.kind === 'feedback').map(t => t.deliveryId).sort()).toEqual(['dl_demo_7', 'dl_demo_8']);
    expect(todos.find(t => t.kind === 'late-delivery')).toMatchObject({ deliveryId: 'dl_demo_6', tone: 'bad' });
    expect(todos.find(t => t.kind === 'blocked')!.text).toContain(ex.ncs.nc_demo_r1.ref);
    expect(JSON.stringify([todos, receptionInsights(demo, now)])).not.toMatch(/€|euro|prix|factur|\bmontant\b/i);
    expect(quotesWithoutOrder(demo)).toEqual([]);
  });
  it('counts one order per state (three accepted), and adds no indicator to the dashboard: the proposals stay proposals', () => {
    const c = receptionSummary(demo, now).counts;
    expect(c).toEqual({ ...Object.fromEntries(Object.keys(DELIVERY_STATE).map(k => [k, 1])), accepted: 3 });
    expect(Object.values(demo.kpis).filter(k => RECEPTION_KPIS.some(m => m.role === k.role || m.id === k.id))).toEqual([]);
  });
});

describe('3.4 example: the button and the fictitious company saved earlier', { timeout: 30_000 }, () => {
  it('fills a company that has no order (orders, defects, customers) without touching its settings, and twice changes nothing', () => {
    const s = blankState('industrie', now);
    applyReceptionExample(s, now);
    expect(Object.keys(s.deliveries)).toHaveLength(14);
    expect(Object.keys(s.ncs).sort()).toEqual(['nc_demo_r1', 'nc_demo_r2']);
    expect(Object.keys(s.orgs).length).toBeGreaterThanOrEqual(7);
    expect(s.contacts.ct_demo_cl_durand).toMatchObject({ id: 'ct_demo_cl_durand' });
    expect(s.orgs[s.deliveries.dl_demo_3.orgId!].name).toBe('BâtiPro');
    expect(s.params).toMatchObject({ receptionExampleLevel: RECEPTION_EXAMPLE_LEVEL });
    expect(s.params.reception).toBeUndefined();   // the clause of the example belongs to the fictitious company: see X-2 below
    const once = structuredClone(s);
    applyReceptionExample(s, now);
    expect(s).toEqual(once);
  });
  it('never replaces what a company holds: its orders, its settings, its directory, its red bin', () => {
    const own: Delivery = { ...structuredClone(ex.deliveries.dl_demo_5), id: 'dl_own', ref: 'MA-1', client: 'Ma cliente' };
    const s = blankState('industrie', now);
    s.deliveries = { dl_own: own };
    s.params.reception = { liftDays: 3 };
    applyReceptionExample(s, now);
    expect(Object.keys(s.deliveries)).toEqual(['dl_own']);
    expect(s.deliveries.dl_own).toEqual(own);
    expect(s.params.reception).toEqual({ liftDays: 3 });
    expect(s.ncs).toEqual({});
    const t = blankState('industrie', now);
    t.params.reception = { liftDays: 3 };
    t.orgs = { org_x: { id: 'org_x', name: 'BâtiPro', category: 'client', phone: '', email: '', address: '', reference: '' } };
    t.ncs = { n1: { ...demo.ncs.nc_demo_1, id: 'n1', ref: 'NC-2026-009' } };
    applyReceptionExample(t, now);
    expect(t.params.reception).toEqual({ liftDays: 3 });
    expect(t.deliveries.dl_demo_3.orgId).toBe('org_x');                       // the organisation the company already has, not a second one
    expect(Object.values(t.orgs).filter(o => o.name === 'BâtiPro')).toHaveLength(1);
    expect(t.ncs.n1.ref).toBe('NC-2026-009');
    expect(t.ncs.nc_demo_r1.ref).not.toBe('NC-2026-009');                       // numbers already used are skipped
  });
  it('gives the example once to a fictitious company saved before: the orders nobody edited are renewed (without their amounts), the missing ones added, with their defects', () => {
    const today = new Date(), fresh = receptionExamples(today);
    const s0 = savedOld();
    expect(Object.keys(s0.deliveries)).toHaveLength(8);
    const s = normalize(s0);
    expect(Object.keys(s.deliveries).sort()).toEqual(Object.keys(STATES).sort());
    Object.keys(fresh.deliveries).forEach(id => expect(s.deliveries[id], id).toEqual(renewedAs(id, today)));
    expect(s.params).toMatchObject({ receptionExampleLevel: RECEPTION_EXAMPLE_LEVEL, reception: { retention: { on: true } } });
    expect(Object.keys(s.ncs).filter(mine).sort()).toEqual(['nc_demo_r1', 'nc_demo_r2']);
    // every state is there, each order on the day it was dated: the three orders of a quote follow the day that quote was decided (X-7), the others the day of the renewal
    const st = Object.fromEntries(Object.values(s.deliveries).map(d => [d.id, deliveryState(d, ['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].includes(d.id) ? now : today, s.params)]));
    expect(st).toEqual(STATES);
    Object.values(s.deliveries).forEach(d => everyReception(d).forEach(r => expect(r.amount).toBeNull()));
    // a second reading changes nothing, and the marker keeps a company that removed an order from getting it back
    expect(normalize(s).deliveries).toEqual(s.deliveries);
    const removed = structuredClone(s);
    delete removed.deliveries.dl_demo_9;
    expect(completeReceptionExamples(removed)).toBe(removed);
    expect(normalize(removed).deliveries.dl_demo_9).toBeUndefined();
  });
  it('an old order the company edited keeps everything it typed (its checks, its text, its single reservation, its amount); it only gains the links and the promised day', () => {
    const s = normalize(savedOld(d => {
      d.dl_demo_1.item = 'Châssis renommés par la société';
      d.dl_demo_3.reception.reserve = 'Retouche de peinture sur 3 marches';
      d.dl_demo_4.milestones[2].measured = '60 microns';
      d.dl_demo_5.milestones[2] = { ...d.dl_demo_5.milestones[2], ok: true, by: 'Zoé', date: '2026-09-20' };
    }));
    const fresh = receptionExamples(now);   // (what an order gains follows the day its quote was decided: the demo of `now`)
    // kept as typed, read in the current shape
    expect(s.deliveries.dl_demo_1).toMatchObject({ item: 'Châssis renommés par la société', client: 'Client A', qty: 150, reception: { amount: 35000, result: 'sans', name: 'M. Durand' } });
    expect(s.deliveries.dl_demo_1.milestones.map(m => m.id)).toEqual(['ms_legacy_0', 'ms_legacy_1', 'ms_legacy_2', 'ms_legacy_3']);
    expect(s.deliveries.dl_demo_1.milestones.map(m => m.label)).toEqual(LEGACY_MILESTONES.map(m => m.label));
    expect(reservesOf(s.deliveries.dl_demo_3)).toMatchObject([{ id: 'rv_legacy', text: 'Retouche de peinture sur 3 marches', raisedAt: s.deliveries.dl_demo_3.reception.date }]);
    expect(s.deliveries.dl_demo_3.reception).toMatchObject({ amount: 14000, retentionPct: 10, reserve: 'Retouche de peinture sur 3 marches' });
    expect(s.deliveries.dl_demo_5.milestones[2]).toMatchObject({ ok: true, by: 'Zoé', date: '2026-09-20' });
    expect(s.deliveries.dl_demo_4.milestones[2]).toMatchObject({ ok: false, measured: '60 microns' });
    // what it did not have: the links, the promised day, the team, the quote
    expect(s.deliveries.dl_demo_1).toMatchObject({ orgId: 'org_demo_clientA', contactId: 'ct_demo_cl_durand', promisedAt: fresh.deliveries.dl_demo_1.promisedAt, quoteId: 'qt_demo_1', team: fresh.deliveries.dl_demo_1.team });
    expect(s.deliveries.dl_demo_5.promisedAt).toBe(fresh.deliveries.dl_demo_5.promisedAt);
    expect(s.deliveries.dl_demo_1.journal).toBeUndefined();
    expect(s.deliveries.dl_demo_1.signClient).toBeUndefined();
    // the others are renewed, and the defect of an order it kept is not given (nothing points at it)
    expect(s.deliveries.dl_demo_2).toEqual(renewedAs('dl_demo_2'));
    expect(s.ncs.nc_demo_r1).toBeUndefined();
    expect(s.ncs.nc_demo_r2).toMatchObject({ id: 'nc_demo_r2' });
    expect(s.deliveries.dl_demo_9.milestones[1].ncId).toBe('nc_demo_r2');
  });
  it('removes the example: its orders and the defects declared from them, found by their example ids; an order or a defect of the company stays; twice changes nothing', () => {
    const s = blankState('industrie', now);
    applyReceptionExample(s, now);
    const base = s.ncs.nc_demo_r1;
    s.deliveries.dl_own = { ...structuredClone(ex.deliveries.dl_demo_5), id: 'dl_own', ref: 'MA-1', client: 'Ma cliente' };
    s.ncs.nc_own = { ...structuredClone(base), id: 'nc_own', ref: 'NC-2026-099', deliveryId: 'dl_own' };                     // a defect of the company, on its own order
    s.ncs.nc_own_demo = { ...structuredClone(base), id: 'nc_own_demo', ref: 'NC-2026-098', deliveryId: 'dl_demo_4' };      // a defect of the company declared on an example order: not an example id
    s.ncs.nc_demo_1 = { ...structuredClone(demo.ncs.nc_demo_1), deliveryId: undefined };                                     // another example (the red bin's own): not linked to an order
    removeReceptionExample(s);
    expect(Object.keys(s.deliveries)).toEqual(['dl_own']);
    expect(Object.keys(s.ncs).sort()).toEqual(['nc_demo_1', 'nc_own', 'nc_own_demo']);
    expect(s.deliveries.dl_own.client).toBe('Ma cliente');
    const once = structuredClone(s);
    removeReceptionExample(s);
    expect(s).toEqual(once);
    const none = blankState('industrie', now), clone = structuredClone(none);
    removeReceptionExample(none);
    expect(none).toEqual(clone);
  });
  it('the example can be asked again once it is removed, and the marker never brings it back by itself', () => {
    const s = blankState('industrie', now);
    applyReceptionExample(s, now);
    removeReceptionExample(s);
    expect(s.deliveries).toEqual({});
    expect(s.ncs).toEqual({});
    expect(completeReceptionExamples(s, now)).toBe(s);   // no order of the example: nothing is given
    expect(normalize(s).deliveries).toEqual({});
    applyReceptionExample(s, now);
    expect(Object.keys(s.deliveries)).toHaveLength(14);
  });
  it('gives a real company nothing, and a company without the orders of the example nothing either', () => {
    const real = blankState('industrie', now);
    real.deliveries = { dl_own: structuredClone(ex.deliveries.dl_demo_5) };
    real.deliveries.dl_own.id = 'dl_own';
    expect(completeReceptionExamples(real, now)).toBe(real);
    expect(normalize(real).deliveries.dl_own).toMatchObject({ id: 'dl_own' });
    expect(Object.keys(normalize(real).deliveries)).toEqual(['dl_own']);
    const empty = blankState('industrie', now);
    expect(completeReceptionExamples(empty, now)).toBe(empty);
    const demoWithout = { ...demoState(now), deliveries: {} };
    delete demoWithout.params.receptionExampleLevel;
    expect(completeReceptionExamples(demoWithout, now)).toBe(demoWithout);
  });
});

// ---- lot 0 "no more loss of data"
describe('3.4 example: the renewal of the first example never erases an edit (X-1)', { timeout: 30_000 }, () => {
  // one edit each, on a field the old fingerprint did not read: the order is kept whole (what the company typed stays), the others are renewed
  const edits: [string, string, (d: Record<string, Delivery>) => void, (s: State) => void][] = [
    ['the lift of the reservation made in the old tool', 'dl_demo_2', d => { d.dl_demo_2.reception.liftedAt = '2026-09-24'; d.dl_demo_2.liftSignedBy = 'Responsable appro'; d.dl_demo_2.liftPhoto = 'photo:abcdef-100-100'; },
      s => expect(reservesOf(s.deliveries.dl_demo_2)[0]).toMatchObject({ liftedAt: '2026-09-24', liftedBy: 'Responsable appro', liftPhoto: 'photo:abcdef-100-100' })],
    ['the delivery date and the role recorded', 'dl_demo_6', d => { d.dl_demo_6.reception.date = '2026-09-23'; d.dl_demo_6.reception.role = 'Chef de chantier'; },
      s => expect(s.deliveries.dl_demo_6.reception).toMatchObject({ date: '2026-09-23', role: 'Chef de chantier' })],
    ['the retention typed', 'dl_demo_3', d => { d.dl_demo_3.reception.retentionPct = 3; }, s => expect(s.deliveries.dl_demo_3.reception.retentionPct).toBe(3)],
    ['the person and the day of the release', 'dl_demo_1', d => { d.dl_demo_1.releasedBy = 'Zoé'; d.dl_demo_1.releasedAt = '2026-08-20'; }, s => expect(s.deliveries.dl_demo_1).toMatchObject({ releasedBy: 'Zoé', releasedAt: '2026-08-20' })],
    ['the quote and the model chosen', 'dl_demo_5', d => { d.dl_demo_5.quoteId = 'qt_x'; d.dl_demo_5.template = 'Mon modèle'; }, s => expect(s.deliveries.dl_demo_5).toMatchObject({ quoteId: 'qt_x', template: 'Mon modèle' })],
    ['an amount of the old invoice field', 'dl_demo_7', d => { d.dl_demo_7.reception.amount = 5555; }, s => expect(s.deliveries.dl_demo_7.reception.amount).toBe(5555)],
    ['a milestone checked again (who and day only)', 'dl_demo_8', d => { d.dl_demo_8.milestones[0] = { ...d.dl_demo_8.milestones[0], by: 'Zoé', date: '2026-09-24' }; }, s => expect(s.deliveries.dl_demo_8.milestones[0]).toMatchObject({ by: 'Zoé', date: '2026-09-24' })],
    ['the role of the person who received', 'dl_demo_1', d => { d.dl_demo_1.reception.role = 'Directeur achats'; }, s => expect(s.deliveries.dl_demo_1.reception.role).toBe('Directeur achats')],
    ['the name of the customer who received', 'dl_demo_7', d => { d.dl_demo_7.reception.name = 'Mme Roche'; }, s => expect(s.deliveries.dl_demo_7.reception.name).toBe('Mme Roche')],
    ['a quantity', 'dl_demo_4', d => { d.dl_demo_4.qty = 5; }, s => expect(s.deliveries.dl_demo_4.qty).toBe(5)],
  ];
  it.each(edits)('keeps %s', (_, id, edit, holds) => {
    const s = normalize(savedOld(edit));
    expect(s.deliveries[id]).not.toEqual(renewedAs(id));   // not replaced by the order of the new example
    holds(s);
    oldOrders(now).map(o => o.id).filter(x => x !== id).forEach(x => expect(s.deliveries[x], x).toEqual(renewedAs(x)));   // the others are renewed
    expect(s.deliveries[id].journal).toBeUndefined();   // nothing of the new example is written over it
    expect(s.deliveries[id].signClient).toBeUndefined();
  });
  it('renews an order that is identical to the first example, field for field, whatever the day the example was made', () => {
    const made = new Date(2026, 1, 3), s = normalize((() => { const x = savedOld(); x.deliveries = Object.fromEntries(oldOrders(made).map(d => [d.id, d])); return x; })());
    Object.keys(STATES).forEach(id => expect(s.deliveries[id], id).toEqual(renewedAs(id)));
    // edited then put back as it was: identical again, renewed
    const back = savedOld(d => { d.dl_demo_1.item = 'zzz'; d.dl_demo_1.item = 'Châssis mécano-soudés peints'; });
    expect(normalize(back).deliveries.dl_demo_1).toEqual(renewedAs('dl_demo_1'));
  });
});

describe('3.4 example: the button never touches the settings of a company, and removing the example takes back what it added (X-2)', { timeout: 30_000 }, () => {
  const real = () => { const s = blankState('industrie', now); s.orgs = { org_mine: { id: 'org_mine', name: 'Mon client', category: 'client', phone: '', email: '', address: '', reference: '' } }; s.contacts = { ct_mine: { ...demo.contacts.ct_demo_cl_durand, id: 'ct_mine', name: 'Moi' } }; return s; };
  const J = (x: unknown) => JSON.stringify(x);
  it('does not write the clause of retention in a company, writes it only in the fictitious company, and the upgrade of the fictitious company saved earlier still gives it', () => {
    const s = real();
    applyReceptionExample(s, now);
    expect(s.params.reception).toBeUndefined();
    expect(receptionCfg(s.params).retention.on).toBe(false);
    expect(s.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    expect(Object.keys(s.deliveries)).toHaveLength(14);
    const own = real();
    own.params.reception = { liftDays: 3 };
    applyReceptionExample(own, now);
    expect(own.params.reception).toEqual({ liftDays: 3 });
    const fictitious = blankState('industrie', now);
    fictitious.settings.companyName = 'Entreprise exemple (fictive)';
    applyReceptionExample(fictitious, now);
    expect(fictitious.params.reception).toEqual({ retention: { on: true, maxPct: 5 } });
    expect(demoState(now).params.reception).toEqual({ retention: { on: true, maxPct: 5 } });
    expect(normalize(savedOld()).params.reception).toEqual({ retention: { on: true, maxPct: 5 } });
  });
  it('removes the directory entries the example added (example ids, unchanged, cited by nothing of the company) and puts the settings back; the company keeps all the rest', () => {
    const s = real(), before = structuredClone(s);
    applyReceptionExample(s, now);
    expect(Object.keys(s.orgs).length).toBeGreaterThan(Object.keys(before.orgs).length);
    expect(Object.keys(s.contacts).length).toBeGreaterThan(Object.keys(before.contacts).length);
    s.params.reception = { retention: { on: true, maxPct: 5 } };   // what the button wrote before this version
    removeReceptionExample(s);
    expect(s.orgs).toEqual(before.orgs);
    expect(s.contacts).toEqual(before.contacts);
    expect(s.deliveries).toEqual({});
    expect(s.ncs).toEqual({});
    expect(s.params.reception).toBeUndefined();
    expect(receptionCfg(s.params).retention.on).toBe(false);
    const once = J(s);
    removeReceptionExample(s);
    expect(J(s)).toBe(once);   // twice changes nothing
  });
  it('keeps an entry the company modified, one that something of the company cites, one that is not of the example, and settings that are no longer the example\'s', () => {
    const s = real();
    applyReceptionExample(s, now);
    s.orgs.org_demo_batipro = { ...s.orgs.org_demo_batipro, phone: '04 11 11 11 11' };            // modified
    s.contacts.ct_demo_cl_lopez = { ...s.contacts.ct_demo_cl_lopez, phone: '06 11 11 11 11' };      // modified
    s.deliveries.dl_own = { ...structuredClone(ex.deliveries.dl_demo_5), id: 'dl_own', ref: 'MA-1', client: 'Ma cliente', orgId: 'org_demo_morel', contactId: 'ct_demo_cl_durand', milestones: [], quoteId: undefined };   // cites two entries
    s.risks.r1 = { ...Object.values(demoState(now).risks)[0], id: 'r1', contactIds: ['ct_demo_cl_garnier'] };   // cites a person
    s.params.reception = { retention: { on: true, maxPct: 5 }, liftDays: 3 };
    removeReceptionExample(s);
    expect(Object.keys(s.deliveries)).toEqual(['dl_own']);
    expect(Object.keys(s.orgs).sort()).toEqual(['org_demo_batipro', 'org_demo_morel', 'org_mine']);
    expect(Object.keys(s.contacts).sort()).toEqual(['ct_demo_cl_durand', 'ct_demo_cl_garnier', 'ct_demo_cl_lopez', 'ct_mine']);
    expect(s.orgs.org_demo_batipro.phone).toBe('04 11 11 11 11');
    expect(s.params.reception).toEqual({ retention: { on: true, maxPct: 5 }, liftDays: 3 });
    const other = real();
    applyReceptionExample(other, now);
    other.params.reception = { retention: { on: true, maxPct: 3 } };
    removeReceptionExample(other);
    expect(other.params.reception).toEqual({ retention: { on: true, maxPct: 3 } });
  });
  it('in the fictitious company, takes only what the orders of the example cite and nothing else cites; the rest of its directory stays', () => {
    const s = demoState(now), before = structuredClone(s);
    removeReceptionExample(s);
    expect(s.deliveries).toEqual({});
    const gone = Object.keys(before.orgs).filter(id => !s.orgs[id]), goneC = Object.keys(before.contacts).filter(id => !s.contacts[id]);
    const cited = J(Object.values(before.deliveries));
    [...gone, ...goneC].forEach(id => expect(cited, id).toContain(`"${id}"`));
    const rest = J({ ...s, orgs: {}, contacts: {} });
    [...gone, ...goneC].forEach(id => expect(rest, id).not.toContain(`"${id}"`));
    goneC.forEach(id => expect(J(Object.values(s.contacts)), id).not.toContain(`"${id}"`));
    expect(Object.keys(s.orgs).length + Object.keys(s.contacts).length).toBeGreaterThan(20);
    expect(s.params.reception).toBeUndefined();   // the clause of the example goes with it
  });
});

// ---- lot 1: the proof of the example is as sound as the one the tool asks for
describe('3.4 example: the PV signed carry their seal, the persons are named and the signatures are drawings (lot 1)', { timeout: 30_000 }, () => {
  const locked = orders.filter(d => isLocked(d));
  const people = (d: Delivery) => (d.journal ?? []).filter(l => l.proof);
  it('lays the seal on each PV signed of the example, intact: the customer, the paper PV, the mention absent, the closed deliveries too; the number of the PV is part of it', () => {
    expect(locked.map(d => d.id)).toEqual(['dl_demo_1', 'dl_demo_2', 'dl_demo_3', 'dl_demo_7', 'dl_demo_8', 'dl_demo_10', 'dl_demo_11', 'dl_demo_12', 'dl_demo_14']);
    locked.forEach(d => {
      expect(d.reception.seals?.length, d.id).toBeGreaterThanOrEqual(1);
      expect(sealState(d), d.id).toBe('intact');
      expect(d.reception.pvNo, d.id).toMatch(/^PV-\d{4}-\d{3}$/);
      expect(d.journal?.filter(l => l.text.startsWith('Scellé SHA-256 posé')).map(l => /([0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4})/.exec(l.text)?.[1]), d.id).toEqual(d.reception.seals!.map(x => shortSeal(x.hash)));
    });
    expect(ex.deliveries.dl_demo_14.reception.seals).toHaveLength(2);   // the mention absent seals, then the company signs and seals again
    expect(ex.deliveries.dl_demo_13.lots![0].reception.seals).toHaveLength(2);   // the refused delivery was signed before it was closed; the new promised day (a correction of the order) sealed it again (X-10)
    expect(pvSigned(ex.deliveries.dl_demo_13.lots![0])).toBe(true);
    expect(ex.deliveries.dl_demo_13.reception.seals).toBeUndefined();   // the delivery under way is not signed
    ['dl_demo_4', 'dl_demo_5', 'dl_demo_6', 'dl_demo_9'].forEach(id => expect(ex.deliveries[id].reception.seals, id).toBeUndefined());
    expect(new Set(locked.map(d => d.reception.seals![0].hash)).size).toBe(locked.length);
  });
  it('holds every proof gesture with a person: no line of the journal without its author, the signatures are drawings worth a signature, the witness is not the one who records', () => {
    orders.forEach(d => (d.journal ?? []).forEach(l => expect(l.by.trim(), `${d.id} ${l.text}`).not.toBe('')));
    orders.forEach(d => [d.signClient, d.signCompany, ...lotsOf(d).flatMap(l => [l.signClient, l.signCompany])].filter(Boolean).forEach(x => expect(signatureOk(x), d.id).toBe(true)));
    expect(orders.filter(d => d.signClient).length).toBeGreaterThanOrEqual(6);
    orders.forEach(d => { if (d.reception.signedAt && d.signClient) expect(d.reception.signTz, d.id).toMatch(/\S/); });
    const absent = ex.deliveries.dl_demo_14;
    expect(absent.reception.noSign).toMatchObject({ kind: 'absent', witness: 'Gardien du site', witnessOrg: 'Client' });
    expect(absent.journal?.find(l => l.text.startsWith('PV sans signature'))?.by).not.toBe(absent.reception.noSign!.witness);
    expect(people(ex.deliveries.dl_demo_1).map(l => l.text)).toContain('PV signé par le client (M. Durand)');
    expect(people(ex.deliveries.dl_demo_1).find(l => l.text.startsWith('PV signé par le client'))?.by).toBe('David K.');   // recorded by the person who held the device, not by the customer
    expect(ex.deliveries.dl_demo_9.journal?.find(l => l.text.includes('sans objet'))).toMatchObject({ by: 'Nicolas R.', proof: true });
  });
  it('asks no waiver of the signature: nothing stands in the way of any PV of the example (released, checked, a result, no reservation open with "without reservation", a clock that is right)', () => {
    const s = { ...blankState('industrie', now), deliveries: ex.deliveries };
    locked.forEach(d => expect(signBlockers(s, d, now), d.id).toEqual([]));
    orders.forEach(d => expect(d.reception.signWaiver, d.id).toBeUndefined());
  });
  it('keeps the lifts, the repairs and the persons in charge after the signature out of the seal: the orders with reservations are still intact', () => {
    ['dl_demo_2', 'dl_demo_3', 'dl_demo_11'].forEach(id => { expect(reservesOf(ex.deliveries[id]).length, id).toBeGreaterThan(0); expect(sealState(ex.deliveries[id]), id).toBe('intact'); });
    expect(reservesOf(ex.deliveries.dl_demo_2)[0]).toMatchObject({ handler: 'Karim T.', repairedAt: expect.any(String), liftedAt: expect.any(String) });
  });
});

// ---- lot 6 (X-6, X-4, X-7): the mark of the orders of the example, the levels before it, what the renewal and the removal keep
// `receptionExamplesOld.json` holds the example of level 3 as the code of that level made it (the delivered build of 2026-10-07, taken on that day) and the first order of level 2: the records a
// company saved then holds, which the present code no longer makes
type Records = { deliveries: Record<string, Delivery>; ncs: Record<string, Nc> };
const L3 = OLD.level3 as unknown as Records, L2ONE = (OLD.level2 as unknown as Record<string, Delivery>).dl_demo_1;
// an order as level 1 saved it: what level 2 added to the records is not there (no seal, no time zone, no moment of the photo, no requirement in the events, no `sameAsControl`, no organisation of the witness),
// and its journal had no proof lines
const asLevelOne = (d: Delivery): Delivery => {
  const c = JSON.parse(JSON.stringify(d)) as Delivery;
  [c, ...(c.lots ?? [])].forEach(x => {
    ['seals', 'signTz', 'pvPhotoAt'].forEach(k => delete (x.reception as unknown as Record<string, unknown>)[k]);
    x.milestones.forEach(m => (m.history ?? []).forEach(e => { delete e.requirement; delete e.min; delete e.max; delete e.instrumentId; }));
  });
  c.journal = (c.journal ?? []).filter(l => !l.text.startsWith('Scellé SHA-256')).map(l => ({ at: l.at, by: l.by, text: l.text }));
  if (c.derogation) delete (c.derogation as Record<string, unknown>).sameAsControl;
  if (c.reception.noSign) delete c.reception.noSign.witnessOrg;
  return c;
};
// the fictitious company saved at that level (the orders as it gave them, no mark), the day the fixture was taken
const savedAt = (level: 1 | 2 | 3, edit: (d: Record<string, Delivery>) => void = () => {}): State => {
  const s = demoState(new Date(2026, 9, 7, 10)), d = structuredClone(L3.deliveries);
  if (level <= 2) d.dl_demo_1 = structuredClone(L2ONE);
  if (level === 1) Object.keys(d).forEach(id => { d[id] = asLevelOne(d[id]); });
  edit(d);
  s.deliveries = d;
  s.ncs = { ...Object.fromEntries(Object.entries(s.ncs).filter(([id]) => !mine(id))), ...structuredClone(L3.ncs) };
  s.params.receptionExampleLevel = level;
  return s;
};
const day7 = new Date(2026, 9, 7, 10), later = new Date(2026, 9, 14, 10);

describe('3.4 example: each order carries its mark, and the levels before it are known by what they held (X-6)', { timeout: 30_000 }, () => {
  const fresh = () => { const s = demoState(now); return s; };
  it('is level 4, and gives each order of the example the SHA-256 of its whole record', () => {
    expect(RECEPTION_EXAMPLE_LEVEL).toBe(4);
    const s = fresh();
    Object.values(s.deliveries).forEach(d => expect(d.exampleHash, d.id).toMatch(/^[0-9a-f]{64}$/));
    expect(new Set(Object.values(s.deliveries).map(d => d.exampleHash)).size).toBe(14);
    expect(modifiedReceptionExamples(s)).toEqual({ orders: [], ncs: [] });
    expect(normalize(structuredClone(s)).deliveries).toEqual(s.deliveries);   // read again by the application: still the orders of the example, mark included
    expect(JSON.parse(JSON.stringify(s)).deliveries).toEqual(s.deliveries);   // and through the file
  });
  it('the least change makes an order another: a word, a milestone, a line of the journal, a signature, a photo, the promised day', () => {
    const edits: [string, string, (d: Delivery) => Delivery][] = [
      ['a word', 'dl_demo_5', d => ({ ...d, item: `${d.item} (renommé)` })],
      ['a milestone', 'dl_demo_5', d => ({ ...d, milestones: d.milestones.map((m, i) => (i === 3 ? { ...m, measured: '12' } : m)) })],
      ['a line of the journal', 'dl_demo_1', d => logDelivery(d, 'Zoé', '2026-09-25T11:00', 'Une note')],
      ['a signature drawn again', 'dl_demo_13', d => ({ ...d, signCompany: [[[1, 1], [2, 9], [3, 1], [4, 9], [5, 1], [90, 90]]] })],
      ['a photo', 'dl_demo_8', d => ({ ...d, reception: { ...d.reception, photos: [...(d.reception.photos ?? []), 'photo:abc-1-1'] } })],
      ['the promised day', 'dl_demo_4', d => ({ ...d, promisedAt: '2031-01-01' })],
    ];
    edits.forEach(([what, id, edit]) => {
      const s = fresh();
      s.deliveries[id] = edit(s.deliveries[id]);
      expect(modifiedReceptionExamples(s).orders, what).toEqual([id]);
    });
    const s = fresh();
    s.deliveries.dl_demo_5 = { ...s.deliveries.dl_demo_5, item: 'zzz' };
    s.deliveries.dl_demo_5 = { ...s.deliveries.dl_demo_5, item: demo.deliveries.dl_demo_5.item };   // put back as it was: the same record, untouched again
    expect(modifiedReceptionExamples(s).orders).toEqual([]);
  });
  it('a company saved at the level before: the orders still holding their mark follow the new example, the one it worked on stays as it is, and the level is written once', () => {
    const s = fresh();
    s.params.receptionExampleLevel = RECEPTION_EXAMPLE_LEVEL - 1;
    s.deliveries.dl_demo_5 = { ...s.deliveries.dl_demo_5, milestones: s.deliveries.dl_demo_5.milestones.map((m, i) => (i === 2 ? { ...m, ok: true, by: 'Zoé', date: '2026-09-24' } : m)) };
    s.deliveries.dl_demo_13 = signCompany(s.deliveries.dl_demo_13, [[[1, 1], [2, 9], [3, 1], [4, 9], [5, 1], [90, 90]]], '2026-09-24T09:00', 'Zoé');   // the PV of the second delivery signed by the company, after the example was saved
    const worked = structuredClone({ five: s.deliveries.dl_demo_5, thirteen: s.deliveries.dl_demo_13 });
    const out = completeReceptionExamples(s, later), next = receptionExamples(later);
    expect(out.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    ['dl_demo_3', 'dl_demo_4', 'dl_demo_6', 'dl_demo_7', 'dl_demo_8', 'dl_demo_9', 'dl_demo_10', 'dl_demo_11', 'dl_demo_12', 'dl_demo_14'].forEach(id => {
      expect(out.deliveries[id], id).toEqual({ ...next.deliveries[id], exampleHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
      expect(out.deliveries[id].exampleHash, id).not.toBe(demo.deliveries[id].exampleHash);   // not the order that was saved: the days moved
    });
    expect(out.deliveries.dl_demo_5.milestones[2]).toMatchObject({ ok: true, by: 'Zoé', date: '2026-09-24' });
    expect({ five: out.deliveries.dl_demo_5, thirteen: out.deliveries.dl_demo_13 }).toEqual(worked);   // what the company worked on is not touched at all (it has its mark, it no longer matches)
    expect(completeReceptionExamples(out, later)).toBe(out);   // once
  });
  it('the orders of level 3 (the delivered build, no mark) are known by what they held: all fourteen are renewed with their mark, the one edited stays', () => {
    Object.values(L3.deliveries).forEach(d => expect(d.exampleHash, d.id).toBeUndefined());
    expect(Object.keys(L3.deliveries)).toEqual(Object.keys(STATES));
    expect(modifiedReceptionExamples({ deliveries: L3.deliveries, ncs: L3.ncs })).toEqual({ orders: [], ncs: [] });
    expect(printOfNc({ ...L3.ncs.nc_demo_r2, decisionNote: 'Ma note' })).not.toBe(printOfNc(L3.ncs.nc_demo_r2));   // a word typed on a defect makes it another
    expect(printOfNc({ ...L3.ncs.nc_demo_r2, ref: 'NC-2031-001' })).toBe(printOfNc(L3.ncs.nc_demo_r2));            // its number is the company's to give
    const out = normalize(savedAt(3));
    expect(out.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    Object.values(out.deliveries).forEach(d => expect(d.exampleHash, d.id).toMatch(/^[0-9a-f]{64}$/));
    Object.values(out.deliveries).filter(d => d.reception.seals?.length).forEach(d => expect(sealState(d), d.id).toBe('intact'));
    const edited = normalize(savedAt(3, d => { d.dl_demo_8.item = 'Banquettes renommées'; d.dl_demo_14.archivedNote = 'Ma note'; }));
    expect(edited.deliveries.dl_demo_8).toEqual({ ...savedAt(3).deliveries.dl_demo_8, item: 'Banquettes renommées' });   // as typed, no mark, nothing of the new example written over it
    expect(edited.deliveries.dl_demo_14.archivedNote).toBe('Ma note');
    expect(edited.deliveries.dl_demo_14.exampleHash).toBeUndefined();
    expect(edited.deliveries.dl_demo_1.exampleHash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('the orders of levels 1 and 2 are known too (level 2 dated the first order before its quote; level 1 had no seals), so an example saved a day earlier is renewed all the same', () => {
    ['dl_demo_1', 'dl_demo_2', 'dl_demo_7'].forEach(id => expect(modifiedReceptionExamples({ deliveries: { [id]: savedAt(2).deliveries[id] }, ncs: {} }).orders, `level 2 ${id}`).toEqual([]));
    expect(printOfOrder(L2ONE)).not.toBe(printOfOrder(L3.deliveries.dl_demo_1));   // the two dated their first order differently
    Object.values(savedAt(1).deliveries).forEach(d => expect(modifiedReceptionExamples({ deliveries: { [d.id]: d }, ncs: {} }).orders, `level 1 ${d.id}`).toEqual([]));
    [1, 2].forEach(level => {
      const s = savedAt(level as 1 | 2, d => { d.dl_demo_5.milestones[2] = { ...d.dl_demo_5.milestones[2], measured: '12 mm', by: 'Zoé' }; d.dl_demo_1.item = 'Châssis renommés'; });
      const out = completeReceptionExamples(s, day7);
      expect(out.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
      ['dl_demo_2', 'dl_demo_3', 'dl_demo_7', 'dl_demo_8', 'dl_demo_10', 'dl_demo_11', 'dl_demo_12', 'dl_demo_14'].forEach(id => { expect(out.deliveries[id].exampleHash, `${level} ${id}`).toMatch(/^[0-9a-f]{64}$/); expect(sealState(out.deliveries[id]), id).toBe('intact'); });
      expect(out.deliveries.dl_demo_5.milestones[2]).toMatchObject({ measured: '12 mm', by: 'Zoé' });   // edited: kept as typed
      expect(out.deliveries.dl_demo_1.item).toBe('Châssis renommés');
      expect(out.deliveries.dl_demo_1.exampleHash).toBeUndefined();
      expect(sealState(out.deliveries.dl_demo_1), `${level}`).toBe(level === 1 ? 'none' : 'modified');   // not sealed behind the back of the company: renamed after its seal (level 2), it says so
    });
  });
  it('a real company that took the example before (its orders carry the ids of the example) gets them renewed, and the clause of the contract still is not turned on for it', () => {
    const real = savedAt(3);
    real.settings = { ...real.settings, companyName: 'Société réelle SARL' };
    delete real.params.reception;
    const out = normalize(real);
    expect(out.params.receptionExampleLevel).toBe(RECEPTION_EXAMPLE_LEVEL);
    expect(Object.values(out.deliveries).every(d => d.exampleHash)).toBe(true);
    expect(out.params.reception).toBeUndefined();
    expect(normalize(savedAt(3)).params.reception).toEqual({ retention: { on: true, maxPct: 5 } });   // the fictitious company has it
  });
  it('renews nothing a company that reached the level holds, and a real company gets nothing', () => {
    const s = savedAt(3);
    s.params.receptionExampleLevel = RECEPTION_EXAMPLE_LEVEL;
    expect(completeReceptionExamples(s, now)).toBe(s);
    const real = savedAt(3, d => { Object.keys(d).forEach(id => { d[`mine_${id}`] = { ...d[id], id: `mine_${id}` }; delete d[id]; }); });
    expect(completeReceptionExamples(real, now)).toBe(real);
  });
});

describe('3.4 example: "Retirer l\'exemple" keeps what the company worked on and says it (X-4)', { timeout: 30_000 }, () => {
  const company = () => { const s = blankState('industrie', now); applyReceptionExample(s, now); return s; };
  it('takes the orders and the defects of the example nobody touched, keeps an order with a milestone checked, a defect with a note and a cost typed, and the defect of an order that stays', () => {
    const s = company();
    s.deliveries.dl_demo_5 = { ...s.deliveries.dl_demo_5, item: 'Supports moteur (série 2)', milestones: s.deliveries.dl_demo_5.milestones.map((m, i) => (i === 2 ? { ...m, ok: true, by: 'Zoé', date: '2026-09-24' } : m)) };
    s.ncs.nc_demo_r2 = { ...s.ncs.nc_demo_r2, decisionNote: 'Ma note', cost: { ...s.ncs.nc_demo_r2.cost, reworkHours: 3 } };
    s.deliveries.dl_own = { ...structuredClone(s.deliveries.dl_demo_5), id: 'dl_own', ref: 'MA-1', client: 'Ma cliente' };
    delete (s.deliveries.dl_own as Partial<Delivery>).exampleHash;
    s.ncs.nc_own_declared = { ...structuredClone(s.ncs.nc_demo_r1), id: 'nc_own_declared', ref: 'NC-2026-099', deliveryId: 'dl_demo_5' };   // a defect of the company on an order that stays
    expect(modifiedReceptionExamples(s)).toEqual({ orders: ['dl_demo_5'], ncs: ['nc_demo_r2'] });   // the window says: 1 order, 1 defect
    const before = structuredClone(s);
    removeReceptionExample(s);
    expect(Object.keys(s.deliveries).sort()).toEqual(['dl_demo_5', 'dl_own']);
    expect(Object.keys(s.ncs).sort()).toEqual(['nc_demo_r2', 'nc_own_declared']);   // nc_demo_r1 went with its order
    expect(s.deliveries.dl_demo_5).toEqual(before.deliveries.dl_demo_5);
    expect(s.ncs.nc_demo_r2).toEqual(before.ncs.nc_demo_r2);
    expect(s.deliveries.dl_demo_5.milestones[2]).toMatchObject({ ok: true, by: 'Zoé' });
    const once = structuredClone(s);
    removeReceptionExample(s);
    expect(s).toEqual(once);   // twice changes nothing
    expect(modifiedReceptionExamples(s)).toEqual({ orders: ['dl_demo_5'], ncs: ['nc_demo_r2'] });   // still said, the same
  });
  it('an order of the example that holds a defect stays with it, even when only the order was worked on; nothing worked on: nothing is said', () => {
    const s = company();
    expect(modifiedReceptionExamples(s)).toEqual({ orders: [], ncs: [] });
    s.deliveries.dl_demo_9 = logDelivery(s.deliveries.dl_demo_9, 'Zoé', '2026-09-25T10:00', 'Une note');
    expect(modifiedReceptionExamples(s)).toEqual({ orders: ['dl_demo_9'], ncs: ['nc_demo_r2'] });   // the defect is not a loose end: its order stays, so does it
    removeReceptionExample(s);
    expect(Object.keys(s.deliveries)).toEqual(['dl_demo_9']);
    expect(Object.keys(s.ncs)).toEqual(['nc_demo_r2']);
    expect(s.deliveries.dl_demo_9.milestones[1].ncId).toBe('nc_demo_r2');   // the link still points at something
  });
  it('takes the example saved at level 3 (no mark) whole, the defects included, and keeps what was edited there', () => {
    const whole = savedAt(3);
    removeReceptionExample(whole);
    expect(Object.keys(whole.deliveries)).toEqual([]);
    expect(Object.keys(whole.ncs).filter(mine)).toEqual([]);
    const worked = savedAt(3, d => { d.dl_demo_12.client = 'Atelier Duval (siège)'; });
    worked.ncs.nc_demo_r1 = { ...worked.ncs.nc_demo_r1, decisionNote: 'Ma note' };
    expect(modifiedReceptionExamples(worked)).toEqual({ orders: ['dl_demo_12'], ncs: ['nc_demo_r1'] });
    removeReceptionExample(worked);
    expect(Object.keys(worked.deliveries)).toEqual(['dl_demo_12']);
    expect(Object.keys(worked.ncs).filter(mine)).toEqual(['nc_demo_r1']);
  });
});

describe('3.4 example: an order that comes from a quote the company holds is dated from the decision it recorded (X-7)', { timeout: 30_000 }, () => {
  const quote = (id: string) => demo.quotes[id];
  it('keeps the days of the quotes of 2.1 the example counts from: decided 40, 26 and 10 days ago, promised after 6, 3 and 3 weeks', () => {
    const back = (n: number) => isoDate(new Date(2026, 8, 25 - n));
    expect(['qt_demo_1', 'qt_demo_7', 'qt_demo_6'].map(id => quote(id).decidedAt)).toEqual([back(40), back(26), back(10)]);
    expect(['qt_demo_1', 'qt_demo_7', 'qt_demo_6'].map(id => quote(id).weeks)).toEqual([6, 3, 3]);
    ['qt_demo_1', 'qt_demo_7', 'qt_demo_6'].forEach(id => expect(demo.deliveries[Object.keys(demo.deliveries).find(k => demo.deliveries[k].quoteId === id)!].promisedAt, id).toBe(quotePromisedOn(demo, id)));
  });
  it('a company saved twenty days ago and renewed today: the orders of its quotes keep the days they had with them, the others are dated from today', () => {
    const saved = new Date(2026, 8, 5, 10, 0), renewed = new Date(2026, 8, 25, 10, 0), s = demoState(saved);
    s.params.receptionExampleLevel = RECEPTION_EXAMPLE_LEVEL - 1;
    const out = completeReceptionExamples(s, renewed), onDay = receptionExamples(saved), today = receptionExamples(renewed);
    ['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].forEach(id => expect(out.deliveries[id], id).toEqual({ ...onDay.deliveries[id], exampleHash: expect.any(String) }));
    ['dl_demo_3', 'dl_demo_4', 'dl_demo_8'].forEach(id => expect(out.deliveries[id], id).toEqual({ ...today.deliveries[id], exampleHash: expect.any(String) }));
    ['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].forEach(id => expect(out.deliveries[id].promisedAt, id).toBe(quotePromisedOn(out as State, out.deliveries[id].quoteId)));   // the promise of the quote
    expect(out.feedbacks.fb_demo_2.date >= out.deliveries.dl_demo_2.reception.date).toBe(true);   // the review is not before the reception it judges
    expect(Math.abs(Date.parse(out.feedbacks.fb_demo_1.date) - Date.parse(out.deliveries.dl_demo_1.reception.date))).toBeLessThanOrEqual(3 * 864e5);
  });
  it('without the quote the company has no days to follow: dated from today, as the others; a decision to come is not followed either', () => {
    const saved = new Date(2026, 8, 5, 10, 0), renewed = new Date(2026, 8, 25, 10, 0), s = demoState(saved);
    s.params.receptionExampleLevel = RECEPTION_EXAMPLE_LEVEL - 1;
    delete s.quotes.qt_demo_7;
    s.quotes.qt_demo_6 = { ...s.quotes.qt_demo_6, decidedAt: isoDate(new Date(2026, 8, 24)) };   // decided yesterday: its example order would be dated in the future
    const out = completeReceptionExamples(s, renewed), today = receptionExamples(renewed), onDay = receptionExamples(saved);
    expect(out.deliveries.dl_demo_2).toEqual({ ...Object.fromEntries(Object.entries(today.deliveries.dl_demo_2).filter(([k]) => k !== 'quoteId')), exampleHash: expect.any(String) });
    expect(out.deliveries.dl_demo_1).toEqual({ ...onDay.deliveries.dl_demo_1, exampleHash: expect.any(String) });
    expect(out.deliveries.dl_demo_5.milestones[0].date <= isoDate(renewed)).toBe(true);
  });
});

// ---- lot 5: the example does not cite quotes that are not there, the orders come after the decision of their quote (L-18)
describe('3.4 example: the quotes the orders cite, and the dates after the decision (L-18)', { timeout: 30_000 }, () => {
  it('leaves out the quote of an order when the company does not hold it ("Devis supprimé" on a fictitious order), keeps the ones it holds', () => {
    const s = blankState('industrie', now);
    applyReceptionExample(s, now);
    Object.values(s.deliveries).forEach(d => expect(d.quoteId === undefined || Object.hasOwn(s.quotes, d.quoteId), d.id).toBe(true));
    expect(['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].map(id => s.deliveries[id].quoteId)).toEqual([undefined, undefined, undefined]);
    expect(Object.keys(s.deliveries.dl_demo_1)).not.toContain('quoteId');
    expect(ex.deliveries.dl_demo_1.quoteId).toBe('qt_demo_1');   // the example itself still carries them: it is the company that decides
    const some = blankState('industrie', now);
    some.quotes = { qt_demo_7: demo.quotes.qt_demo_7 };
    applyReceptionExample(some, now);
    expect(['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].map(id => some.deliveries[id].quoteId)).toEqual([undefined, 'qt_demo_7', undefined]);
    expect(['dl_demo_1', 'dl_demo_2', 'dl_demo_5'].map(id => demo.deliveries[id].quoteId)).toEqual(['qt_demo_1', 'qt_demo_7', 'qt_demo_6']);   // the fictitious company holds the three quotes
    expect(quotesWithoutOrder(s, now)).toEqual([]);
  });
  it('does the same when a fictitious company saved earlier is completed: a quote it deleted is not given back as a link', () => {
    const u = savedOld();
    delete u.quotes.qt_demo_6;
    delete u.params.receptionExampleLevel;
    const out = completeReceptionExamples(u, now);   // (the quotes are read from the company the function is given: normalize hands it the orders, not the quotes)
    expect(out.deliveries.dl_demo_5.quoteId).toBeUndefined();
    expect(out.deliveries.dl_demo_1.quoteId).toBe('qt_demo_1');
    expect(out.deliveries.dl_demo_2.quoteId).toBe('qt_demo_7');
  });
  it('dates every order after the decision of its quote, on any day, and the review of 2.4 within a weekend of the reception', () => {
    for (let n = 0; n < 40; n++) {
      const d = new Date(2026, 7, 20 + n, 10, 0), s = demoState(d);
      Object.values(s.deliveries).filter(x => x.quoteId).forEach(x => {
        const q = s.quotes[x.quoteId!];
        expect(q.decidedAt, `${isoDate(d)} ${x.id}`).toMatch(/^\d{4}-\d{2}-\d{2}/);
        const days = [...(x.journal ?? []).map(l => l.at), ...x.milestones.map(m => m.date), x.reception.date, x.releasedAt, x.promisedAt ?? ''].filter(Boolean).map(a => a.slice(0, 10));
        days.forEach(day => expect(day > q.decidedAt, `${isoDate(d)} ${x.id} ${day} vs decided ${q.decidedAt}`).toBe(true));
      });
      expect(Math.abs(Date.parse(s.feedbacks.fb_demo_1.date) - Date.parse(s.deliveries.dl_demo_1.reception.date)), isoDate(d)).toBeLessThanOrEqual(3 * 864e5);   // the review of 2.4 keeps its own day (counted in calendar days): within a weekend of the reception
    }
  });
  it('puts the deliverable of the order as the place of the defects of the example, as ncFromMilestone writes it', () => {
    expect(Object.values(ex.ncs).map(n => n.where)).toEqual([ex.deliveries.dl_demo_4.item, ex.deliveries.dl_demo_9.item]);
    Object.values(ex.ncs).forEach(n => expect(n.item.startsWith(n.where), n.id).toBe(true));
  });
});

// ---- lot 6: the stories of the example (X-8 to X-14, X-17 to X-20)
const closedDay = (iso: string): boolean => {
  const d = new Date(`${iso}T12:00:00`);
  return d.getDay() % 6 === 0 || [d.getFullYear() - 1, d.getFullYear(), d.getFullYear() + 1].flatMap(y => frenchHolidays(y).map(h => h.date)).includes(iso);
};
const daysOf = (d: Delivery): string[] => [...(d.journal ?? []).map(l => l.at), d.reception.date, d.releasedAt, ...d.milestones.map(m => m.date), ...lotsOf(d).flatMap(l => [l.reception.date, l.releasedAt, l.closedAt])].filter(Boolean).map(x => x.slice(0, 10));
// the days that gave trouble: the Mondays after a holiday, the end of a year, the Friday decisions, the weeks of the Ascension, the audit's list of days with one day of margin
const HARD = [new Date(2026, 4, 11, 10), new Date(2026, 4, 12, 10), new Date(2026, 11, 28, 10), new Date(2027, 0, 4, 10), new Date(2027, 3, 6, 10), new Date(2028, 4, 30, 10), new Date(2029, 4, 13, 10), new Date(2029, 4, 14, 10)];
describe('3.4 example: dated on working days, the late reservation late on any day, stories that hold together (X-8 to X-11, X-13, X-20)', { timeout: 30_000 }, () => {
  const days = [...HARD, ...Array.from({ length: 40 }, (_, n) => new Date(2026, 9, 1 + n, 10, 0))];
  it('no line of the journal, reception, signature or release falls on a Saturday, a Sunday or a holiday, and none is in the future (X-9)', () => {
    days.forEach(today => {
      Object.values(receptionExamples(today).deliveries).forEach(d => {
        daysOf(d).forEach(day => expect(closedDay(day), `${isoDate(today)} ${d.id} ${day}`).toBe(false));
        (d.journal ?? []).forEach(l => expect(l.at < `${isoDate(today)}T10:00`, `${isoDate(today)} ${d.id} ${l.at}`).toBe(true));
        const at = (d.journal ?? []).map(l => l.at);
        expect(at, `${isoDate(today)} ${d.id}`).toEqual([...at].sort());
        if (d.reception.seals?.length) expect(sealState(d), `${isoDate(today)} ${d.id}`).toBe('intact');
      });
    });
  });
  it('uses the days the company is closed (its settings) instead of the holidays: nothing happens on them either', () => {
    const today = new Date(2026, 9, 7, 10, 0), shut = ['2026-10-05', '2026-10-06', '2026-10-02'];   // the Monday and the Tuesday of the week, and the Friday before
    const all = Object.values(receptionExamples(today, undefined, shut).deliveries).flatMap(daysOf);
    all.forEach(day => { expect(shut.includes(day), day).toBe(false); expect(new Date(`${day}T12:00:00`).getDay() % 6 === 0, day).toBe(false); });
    expect(Object.values(receptionExamples(today).deliveries).flatMap(daysOf).some(day => shut.includes(day))).toBe(true);   // (without them the same days are used)
  });
  it('the reservation of the third order is late on any day: eight days of margin where it had one (X-8)', () => {
    days.forEach(today => {
      const late = receptionExamples(today).deliveries.dl_demo_3, p = blankState('industrie', today).params;
      expect(deliveryState(late, today, p), isoDate(today)).toBe('reserve_late');
      expect(reserveLateDays(reservesOf(late)[0], late, p, today), isoDate(today)).toBeGreaterThanOrEqual(3);
    });
  });
  it('the story of the orders holds: the quote decided, then the order, the promised day of the quote, a new promised day when the delivery is presented again (X-10)', () => {
    const six = ex.deliveries.dl_demo_6;
    expect(six.derogation!.why).toBe('Retouche de la rayure prévue à la pose, accord de M. Morel');   // not in the past: the order is not delivered yet
    expect(six.milestones[2].waivedWhy).toBe('Retouche prévue à la pose, accord de M. Morel');
    expect(JSON.stringify(receptionSummary(demo, now))).not.toMatch(/rayure faite/);
    days.forEach(today => {
      const s = demoState(today);
      Object.values(s.deliveries).filter(d => d.quoteId).forEach(d => {
        expect(d.promisedAt, `${isoDate(today)} ${d.id}`).toBe(quotePromisedOn(s, d.quoteId));
        expect(d.journal![0].at.slice(0, 10) > s.quotes[d.quoteId!].decidedAt, `${isoDate(today)} ${d.id} created after the decision`).toBe(true);
      });
    });
    // the first order is delivered early: the quote promised six weeks
    expect(ex.deliveries.dl_demo_1.promisedAt! > ex.deliveries.dl_demo_1.reception.date).toBe(true);
    // the refused delivery was promised 35 days ago; the second one has the day agreed again, by a correction of the order, with its reason and a new seal of the closed delivery
    const two = ex.deliveries.dl_demo_13;
    expect(two.promisedAt! > lotsOf(two)[0].reception.date && two.promisedAt! < isoDate(now)).toBe(true);
    expect(two.journal!.find(l => l.text.startsWith('Corrigé') && l.text.includes('date promise'))?.text).toMatch(/motif\s*: Nouvelle date convenue/);
    expect(lotSealState(two, 1)).toBe('intact');
    // the numbers of the orders are the example's, in the order they were written (X-10 e: left as they are)
    expect(orders.map(d => d.ref.slice(-3))).toEqual(['041', '052', '047', '058', '060', '055', '063', '064', '066', '049', '048', '067', '045', '012']);
  });
  it('a photo that proves a check shows no badge, a photo that shows a defect keeps its red one (X-11)', () => {
    const svg = (src: string) => atob(src.split(',')[1]);
    const badge = (src: string) => /r="26"/.test(svg(src)), red = (src: string) => /r="26" fill="#dc2626"/.test(svg(src));
    orders.forEach(d => d.milestones.forEach(m => { if (m.photo) expect(red(m.photo), `${d.id} ${m.id}`).toBe(false); }));
    const four = ex.deliveries.dl_demo_4.milestones[2];
    expect(outOfBounds(four)).toBe(true);
    expect([badge(four.photo!), red(four.gapPhoto!)]).toEqual([false, true]);   // the proof of a measure out of its bounds is no green one; the gap keeps its red one
    expect(badge(ex.deliveries.dl_demo_3.milestones[1].photo!)).toBe(false);   // the stairs of a check conform
    expect(red(reservesOf(ex.deliveries.dl_demo_3)[0].photo!)).toBe(true);     // the stairs of the reservation: the defect
    expect(ex.deliveries.dl_demo_3.milestones[1].photo).not.toBe(reservesOf(ex.deliveries.dl_demo_3)[0].photo);
  });
  it('shows no percentage of retention on any order: nothing of the screens writes it, the clause alone stays as a mention (X-13)', () => {
    orders.forEach(d => { everyReception(d).forEach(r => expect(r.retentionPct ?? null, d.id).toBeNull()); expect(retentionFact(d, demo.params), d.id).toBeFalsy(); });
    expect(JSON.stringify(ex)).not.toMatch(/retentionPct":\s*\d/);
    expect(demo.params.reception?.retention).toEqual({ on: true, maxPct: 5 });
  });
  it('the four checks before departure are four gestures, two minutes apart, not four lines of the same minute (X-20)', () => {
    orders.forEach(d => {
      const lines = (d.journal ?? []).filter(l => l.text.startsWith('Contrôle de départ'));
      if (lines.length < 3) return;
      expect(new Set(lines.map(l => l.at)).size, d.id).toBe(lines.length);
    });
    const one = ex.deliveries.dl_demo_1.journal!.filter(l => l.text.startsWith('Contrôle de départ')).map(l => l.at);
    expect(one).toHaveLength(4);
    expect(one.map(a => Number(a.slice(14, 16)) - Number(one[0].slice(14, 16)))).toEqual([0, 2, 4, 6]);
  });
});

describe('3.4 example: people, hands and words that look like the real thing (X-17, X-18, X-19)', { timeout: 30_000 }, () => {
  const strokes = (d: Delivery) => [d.releaseSign, d.signCompany, d.signClient, ...lotsOf(d).flatMap(l => [l.releaseSign, l.signCompany, l.signClient]), ...reservesOf(d).map(r => r.liftSign), ...lotsOf(d).flatMap(l => reservesOf(l).map(r => r.liftSign))].filter(Boolean) as Strokes[];
  const hand = (s: Strokes) => `${s[0][0][0]},${s.length}`;   // what tells the four hands apart: the first point and the number of strokes
  it('draws four hands, and the company and the customer of a same PV never sign alike; no two signatures are the same drawing (X-17)', () => {
    const all = orders.flatMap(strokes);
    expect(new Set(all.map(hand)).size).toBe(4);
    expect(new Set(all.map(s => JSON.stringify(s))).size).toBe(all.length);
    orders.forEach(d => [d, ...lotsOf(d)].forEach(x => { if (x.signCompany && x.signClient) expect(hand(x.signCompany), d.id).not.toBe(hand(x.signClient)); }));
    expect(orders.flatMap(strokes).length).toBeGreaterThanOrEqual(20);
  });
  it('writes the accents and the decimal comma in the drawings, as the measures typed say them (X-17)', () => {
    const texts = [...new Set(JSON.stringify(ex).match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g)!)].flatMap(src => [...atob(src.split(',')[1]).matchAll(/>([^<]+)<\/text>/g)].map(m => m[1]));
    expect(texts).toEqual(expect.arrayContaining(['R&#201;F&#201;RENCE', '&#201;TIQUETTE ?', '1 003,5 mm', 'LIMITE : 1 001 mm', '2,5 Nm', 'VALID&#201;', 'LIVR&#201;']));
    texts.forEach(t => expect(t).not.toMatch(/REFERENCE|ETIQUETTE|VALIDE|LIVRE|\d\.\d/));
    expect(ex.ncs.nc_demo_r1.description).toContain('1 003,5 mm');
  });
  it('names people where it named functions, and keeps the two Reys apart (X-18)', () => {
    const named = orders.flatMap(d => [d.reception.name, ...lotsOf(d).map(l => l.reception.name), ...reservesOf(d).map(r => r.liftedBy ?? ''), ...(d.journal ?? []).map(l => l.by), d.reception.noSign?.witness ?? ''].filter(Boolean));
    named.forEach(n => expect(n, n).not.toMatch(/^(Acheteur|Responsable|Directeur|Directrice|Gérant)/i));
    expect(JSON.stringify(ex)).not.toMatch(/Responsable appro\b/);
    expect(ex.deliveries.dl_demo_2.reception).toMatchObject({ name: 'Mme Perret', role: 'Responsable approvisionnement' });
    expect(ex.deliveries.dl_demo_13.reception).toMatchObject({ name: 'M. Lemaire', role: 'Acheteur' });
    expect(named).toContain('Dr Rey');
    expect(named).not.toContain('Mme Rey');   // two customers, one family name: the receptionist of the other one is someone else
    expect(ex.deliveries.dl_demo_12.reception.name).toBe('Mme Roux');
    expect(ex.deliveries.dl_demo_2.journal!.some(l => /Mme Perret/.test(l.text) || l.by === 'Mme Perret')).toBe(true);
  });
  it('is less metalwork: a site order that fits benches, with its torque read on a wrench of 3.3; models, ids and states unchanged (X-19, partly)', () => {
    expect(ex.deliveries.dl_demo_8).toMatchObject({ item: 'Banquettes de la salle de restaurant', template: 'Chantier ou pose', client: 'Hôtel des Tilleuls' });
    expect(ex.deliveries.dl_demo_8.milestones[1]).toMatchObject({ unit: 'Nm', instrumentId: 'eq_demo_cle' });
    expect(new Set(orders.map(d => d.template))).toEqual(new Set(['Fabrication', 'Standard', 'Chantier ou pose', 'Revente ou négoce', 'Prestation ou service']));
  });
});

describe('3.4 example: it points only at what the company holds, before the PV is sealed (X-12, X-14)', { timeout: 30_000 }, () => {
  const sealsOk = (s: State) => Object.values(s.deliveries).forEach(d => { expect(sealState(d), d.id).not.toBe('modified'); lotsOf(d).forEach(l => expect(lotSealState(d, l.no), `${d.id} lot ${l.no}`).not.toBe('modified')); });
  const links = (s: State) => Object.values(s.deliveries).flatMap(d => [d.quoteId, ...d.milestones.flatMap(m => [m.sopId, m.instrumentId, ...(m.history ?? []).map(e => e.instrumentId)]), ...(d.team ?? [])]).filter(Boolean);
  it('an empty company is given no quote, no instruction, no instrument, no person of the team the others do not have', () => {
    const s = blankState('industrie', now);
    applyReceptionExample(s, now);
    expect(links(s)).toEqual([]);
    expect(Object.values(s.deliveries).every(d => d.team === undefined)).toBe(true);
    sealsOk(s);
    expect(ex.deliveries.dl_demo_5.milestones[1].sopId).toBe('sop_demo_2');   // the example itself holds them
    expect(ex.deliveries.dl_demo_8.milestones[1].history!.at(-1)!.instrumentId).toBe('eq_demo_cle');
  });
  it('what the company holds is kept, one by one: its instruction, its instrument, its people, its quote', () => {
    const s = blankState('industrie', now);
    s.sops = { sop_demo_2: demo.sops.sop_demo_2 };
    s.equipments = { eq_demo_cle: demo.equipments.eq_demo_cle };
    s.quotes = { qt_demo_6: demo.quotes.qt_demo_6 };
    s.people = { p1: { id: 'p1', name: 'Antoine P.', role: '', active: true }, p2: { id: 'p2', name: 'Sophie V.', role: '', active: true } };
    applyReceptionExample(s, now);
    expect(s.deliveries.dl_demo_5.milestones[1].sopId).toBe('sop_demo_2');
    expect(s.deliveries.dl_demo_8.milestones[1].instrumentId).toBe('eq_demo_cle');
    expect(s.deliveries.dl_demo_8.milestones[1].history!.at(-1)!.instrumentId).toBe('eq_demo_cle');
    expect(s.deliveries.dl_demo_5.quoteId).toBe('qt_demo_6');
    expect(s.deliveries.dl_demo_4.team).toEqual(['Antoine P.']);   // [Karim T., Julien P., Antoine P.]: only the one the company has
    expect(s.deliveries.dl_demo_1.team).toBeUndefined();            // none of its people
    expect(links(s).every(x => ['sop_demo_2', 'eq_demo_cle', 'qt_demo_6', 'Antoine P.', 'Sophie V.'].includes(x as string))).toBe(true);
    sealsOk(s);
  });
  it('the fictitious company keeps everything (its people come after its orders), and so does the renewal of a saved one', () => {
    expect(links(demo).filter(x => x === 'sop_demo_2').length).toBe(1);
    expect(Object.values(demo.deliveries).filter(d => d.team?.length).length).toBe(14);
    const out = normalize(savedAt(3));
    expect(links(out).length).toBe(links(demo).length);
  });
  it('a person the company already has in the directory (same name, same customer) is not given twice, and the PV is sealed with her id (X-14)', () => {
    const s = blankState('industrie', now);
    s.contacts = { ct_x: { id: 'ct_x', category: 'client', name: 'Mme Lopez', role: 'Conductrice', company: 'BâtiPro', phone: '', email: '', always: false, verifiedAt: '' } };
    s.orgs = { org_x: { id: 'org_x', name: 'BâtiPro', category: 'client', phone: '', email: '', address: '', reference: '' } };
    applyReceptionExample(s, now);
    expect(Object.keys(s.contacts).filter(id => id.startsWith('ct_demo_cl_lopez'))).toEqual([]);
    expect(Object.values(s.contacts).filter(c => c.name === 'Mme Lopez')).toHaveLength(1);
    expect(s.deliveries.dl_demo_3).toMatchObject({ orgId: 'org_x', contactId: 'ct_x' });
    expect(s.deliveries.dl_demo_3.reception).toMatchObject({ orgId: 'org_x', contactId: 'ct_x' });
    sealsOk(s);   // the seal of the third order covers the customer: it was laid with the company's own ids (it said "modified" when the ids were changed after it)
    // a person of the same name at another customer is another person
    const t = blankState('industrie', now);
    t.contacts = { ct_y: { id: 'ct_y', category: 'client', name: 'Mme Lopez', role: '', company: 'Autre société', phone: '', email: '', always: false, verifiedAt: '' } };
    applyReceptionExample(t, now);
    expect(t.deliveries.dl_demo_3.contactId).toBe('ct_demo_cl_lopez');
    expect(Object.values(t.contacts).filter(c => c.name === 'Mme Lopez')).toHaveLength(2);
    // removing the example leaves what the company had
    removeReceptionExample(s);
    expect(Object.keys(s.contacts)).toEqual(['ct_x']);
    expect(Object.keys(s.orgs)).toEqual(['org_x']);
  });
});

describe('3.4 example: removed after the year turned', { timeout: 30_000 }, () => {
  afterEach(() => { vi.useRealTimers(); });
  // KNOWN DEFECT, found by running this folder at 12 simulated dates (lot 9, T-3): the defects of the example hold the number of their order in their text ("CMD-2026-058", "CMD-2027-058" a year later),
  // and `untouchedNc` (receptionsExamples.ts) compares the defect with the one the example gives TODAY without blanking that text: from 1 January the defects of an example made the year before are read as
  // "worked on", kept by "Retirer l'exemple" and counted in its message. `it.fails` stays until `untouchedNc` ignores the year of the number of the order; then it becomes `it` (and 6 tests of this file,
  // red at every simulated date after the new year, turn green).
  it('takes the defects of the example nobody touched whatever the year it is removed in: made on 25 September 2026, removed on 5 January 2027', () => {
    const s = demoState(now);
    expect(Object.keys(s.ncs).filter(mine)).toEqual(['nc_demo_r1', 'nc_demo_r2']);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 0, 5, 10, 0));
    expect(modifiedReceptionExamples(s)).toEqual({ orders: [], ncs: [] });
    removeReceptionExample(s);
    expect(Object.keys(s.ncs).filter(mine)).toEqual([]);
    expect(Object.keys(s.deliveries).filter(id => id.startsWith('dl_demo_'))).toEqual([]);
  });
});
