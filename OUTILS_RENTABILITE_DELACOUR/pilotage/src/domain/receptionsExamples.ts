// Example records of tool 3.4 "Réceptions" for the fictitious company of the demo (same customers, people, quotes and defects as the other tools): fourteen orders
// that show every state of the tool, built with the moves of receptions.ts (so the journal, the history of the checks and the locks are the real ones), with small
// drawings instead of photos and signatures drawn with the finger. No amount anywhere. Dates are relative to today, so the same day always gives the same records;
// nothing happens on a Saturday, a Sunday or a holiday.
// Orders: in progress, not conform (out of the bounds, defect declared), to release (one milestone redone, one not applicable), released by derogation and late,
// delivered (after a refusal, so with a closed delivery), accepted without reservation (finger, paper PV), two reservations (one lifted with a photo), reservation late,
// reservations lifted, delivered in part, refused, archived; a site order, a service, a count with bounds.
import type { Contact, Delivery, Milestone, Nc, Org, Params, Person, Reception, State, Strokes } from './types';
import { DEFAULT_PARAMS, nextRef, EXAMPLE_COMPANY } from './base';
import { isoDate, parseDate } from './periods';
import { orgOf } from './contacts';
import { sameClient } from './clients';
import { frenchHolidays } from './calendar';
import { sha256 } from './sha256';
import { exampleContacts, exampleOrgs } from './riskTemplates';
import {
  DEFAULT_NEXTS, LEGACY_MILESTONES, MILESTONE_TEMPLATES, addReserve, archiveDelivery, checkMilestone, correctLocked, deliveryFromTemplate, liftReserve, linkMilestoneNc, logDelivery, nextPresentation, patchReserve,
  refuse, releaseDelivery, repairReserve, reservesOf, setMilestoneNa, setNoSign, setPvPhoto, setReceptionist, setResult, setShipCheck, shipChecksOf, signClient, signCompany, startReception,
  upgradeDelivery, waiveMilestone, type MilestoneCheck,
} from './receptions';

// Level 2: the PV signed of the example carry their seal, a person is named on every gesture of proof (the customer's signature is recorded by the person who holds the device)
// Level 3: the orders are dated after the decision of their quote (the first one is made, delivered and signed over three days after the quote is decided), an order whose quote the company does not
// hold loses that link, and the defect of a milestone says the deliverable of the order as its place
// Level 4: each order carries `exampleHash` (the renewal and the removal tell an order nobody touched from one the company worked on), the orders are dated on working days, the links to the other
// tools are left out before an order is signed and sealed, the reservation of the third order is late on any day, four hands of signature, people instead of functions, no retention typed
export const RECEPTION_EXAMPLE_LEVEL = 4;
// The clause of retention is shown filled in the example: it is on the reports (a mention of the contract, no percentage is typed on an order).
// It belongs to the fictitious company alone (named as demoState names it): the button of a real company never writes it, and removing the example takes it back.
const EXAMPLE_SETTINGS: NonNullable<Params['reception']> = { retention: { on: true, maxPct: 5 } };
// The quotes of 2.1 the orders come from: the days since the decision and the weeks promised, as `commercialExamples` dates them (a test holds both together)
const QUOTE: Record<string, [number, number]> = { qt_demo_1: [40, 6], qt_demo_7: [26, 3], qt_demo_6: [10, 3] };

// What the orders of the example may point at in the company: the answer is the id to write, or nothing when the link is left out
export type TieKind = 'org' | 'contact' | 'quote' | 'sop' | 'instrument' | 'person';
export type Tie = (kind: TieKind, id: string) => string | undefined;
const KIND: Record<string, TieKind> = { orgId: 'org', contactId: 'contact', quoteId: 'quote', sopId: 'sop', instrumentId: 'instrument' };
type Link = <T extends object>(o: T) => T;
const linker = (tie: Tie): Link => o => Object.fromEntries(Object.entries(o).flatMap(([k, v]) => { const w = KIND[k] && typeof v === 'string' ? tie(KIND[k], v) : v; return w === undefined ? [] : [[k, w]]; })) as typeof o;

// ---- drawings (ASCII only: written in base 64 with btoa, like those of tools 3.2 and 3.3; an accent is written as an XML entity)
const MARK = {
  '': '',
  ok: '<circle cx="352" cy="250" r="26" fill="#16a34a"/><path d="M340 250l9 10 17-20" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  ko: '<circle cx="352" cy="250" r="26" fill="#dc2626"/><path d="M341 239l22 22M363 239l-22 22" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
};
const art = (body: string, mark: keyof typeof MARK = '') => `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eef2f1"/><rect y="236" width="400" height="64" fill="#dbe3e1"/>${body}${MARK[mark]}</svg>`)}`;
const say = (x: number, y: number, t: string, size = 22, fill = '#0f172a') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" font-family="sans-serif" fill="${fill}">${t}</text>`;
const holes = [[115, 85], [285, 85], [115, 185], [285, 185]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#eef2f1"/>`).join('');
const panel = (extra = '', c = '#94a3b8') => `<rect x="90" y="60" width="220" height="150" rx="8" fill="${c}" stroke="#475569" stroke-width="5"/>${holes}${extra}`;
const parcel = (open: boolean) => `<rect x="90" y="110" width="220" height="110" fill="#b9854b"/><rect x="190" y="110" width="20" height="110" fill="#e7d3b0"/>${open ? '<polygon points="90,110 200,110 150,60" fill="#d4a366"/><polygon points="200,110 310,110 250,60" fill="#d4a366"/><rect x="130" y="140" width="140" height="40" fill="#fff" stroke="#94a3b8" stroke-dasharray="6 5"/>' : '<rect x="110" y="140" width="60" height="34" fill="#fff"/><path d="M118 152h44M118 164h30" stroke="#0f172a" stroke-width="3"/>'}`;
const handle = (bent: boolean) => `<rect x="120" y="90" width="160" height="120" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="5"/><path d="${bent ? 'M150 150l60-18' : 'M150 150h110'}" stroke="#334155" stroke-width="12" stroke-linecap="round"/>`;
const stairs = '<polygon points="60,220 160,220 160,190 120,190 120,160 80,160 80,130 60,130" fill="#64748b"/><polygon points="160,220 340,220 340,100 300,100 300,130 260,130 260,160 220,160 220,190 160,190" fill="#94a3b8"/><circle cx="240" cy="150" r="9" fill="#92400e"/><circle cx="276" cy="120" r="7" fill="#92400e"/>';

// Everything is drawn once, when the example is asked for. A photo that proves a check carries no badge (the check says conform or not); one that shows a defect keeps its red one.
let drawn: ReturnType<typeof draw> | undefined;
const pics = () => (drawn ||= draw());
function draw() {
  return {
    ref: art(panel(say(200, 140, 'R&#201;F&#201;RENCE', 20)), 'ok'),
    parts: art('<rect x="70" y="150" width="80" height="50" fill="#94a3b8"/><rect x="170" y="130" width="60" height="70" fill="#64748b"/><rect x="250" y="160" width="90" height="40" fill="#94a3b8"/><rect x="90" y="110" width="50" height="30" fill="#475569"/>'),
    piece: art(panel()),
    frame: art('<rect x="80" y="70" width="240" height="140" fill="none" stroke="#475569" stroke-width="12"/><path d="M80 70L320 210M320 70L80 210" stroke="#64748b" stroke-width="6"/>'),
    bench: art('<rect x="70" y="80" width="260" height="26" rx="4" fill="#d4a366"/><rect x="70" y="120" width="260" height="30" rx="4" fill="#b9854b"/><rect x="90" y="150" width="14" height="70" fill="#64748b"/><rect x="296" y="150" width="14" height="70" fill="#64748b"/>'),
    shelf: art('<rect x="90" y="60" width="12" height="160" fill="#64748b"/><rect x="298" y="60" width="12" height="160" fill="#64748b"/><rect x="90" y="100" width="220" height="10" fill="#94a3b8"/><rect x="90" y="150" width="220" height="10" fill="#94a3b8"/><rect x="90" y="200" width="220" height="10" fill="#94a3b8"/>'),
    parcel: art(parcel(false), 'ok'),
    parcelOpen: art(parcel(true), 'ko'),
    ruler: art(`<rect x="40" y="130" width="320" height="44" rx="4" fill="#cbd5e1"/><path d="M60 130v24M100 130v16M140 130v24M180 130v16M220 130v24M260 130v16M300 130v24M340 130v16" stroke="#0f172a" stroke-width="3"/>${say(200, 100, '1 003,5 mm', 26, '#dc2626')}${say(200, 206, 'LIMITE : 1 001 mm', 18)}`, 'ko'),
    crack: art(panel('<path d="M130 70l30 40-26 30 34 40" stroke="#dc2626" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'), 'ko'),
    scratch: art(panel('<path d="M140 80l120 90M160 76l100 78M130 100l100 72" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'), 'ko'),
    handle: art(handle(true), 'ko'),
    handleFixed: art(handle(false), 'ok'),
    label: art(`<rect x="100" y="70" width="200" height="150" fill="#b9854b"/><rect x="140" y="110" width="120" height="60" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="8 6"/>${say(200, 200, '&#201;TIQUETTE ?', 18, '#fff')}`, 'ko'),
    stairs: art(stairs),
    stairsFlaw: art(stairs, 'ko'),
    rail: art('<rect x="60" y="80" width="10" height="150" fill="#334155"/><rect x="190" y="80" width="10" height="150" fill="#334155"/><rect x="330" y="80" width="10" height="150" fill="#334155"/><path d="M60 90h280M60 130h280M60 170h280" stroke="#64748b" stroke-width="8"/>', 'ok'),
    torque: art(`<circle cx="200" cy="130" r="80" fill="#f8fafc" stroke="#475569" stroke-width="7"/><path d="M200 130L240 84" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/><circle cx="200" cy="130" r="8" fill="#0f172a"/>${say(200, 230, '2,5 Nm', 22)}`, 'ok'),
    paper: art(`<rect x="110" y="30" width="180" height="200" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="4"/>${say(200, 64, 'PV PAPIER', 17)}<path d="M130 84h140M130 104h140M130 124h110" stroke="#cbd5e1" stroke-width="6"/><path d="M135 195q20-40 38-6t36-8 42 4" stroke="#1d4ed8" stroke-width="4" fill="none"/>`, 'ok'),
    swatch: art(`<rect x="70" y="80" width="120" height="120" fill="#6b7f78"/><rect x="210" y="80" width="120" height="120" fill="#8a9a6e"/>${say(130, 225, 'VALID&#201;', 18)}${say(270, 225, 'LIVR&#201;', 18)}`, 'ko'),
    plan: art(`<rect x="80" y="30" width="240" height="190" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="4"/><path d="M100 70h200M100 110h200M100 150h200M140 50v150M200 50v150M260 50v150" stroke="#e2e8f0" stroke-width="2"/><path d="M110 190h150" stroke="#0f172a" stroke-width="3"/>${say(185, 180, '3 200', 16)}`, 'ok'),
    count: art('<rect x="80" y="150" width="70" height="70" fill="#b9854b"/><rect x="160" y="150" width="70" height="70" fill="#b9854b"/><rect x="240" y="150" width="70" height="70" fill="#b9854b"/><rect x="120" y="80" width="70" height="70" fill="#b9854b"/><rect x="200" y="80" width="70" height="70" fill="#b9854b"/>' + say(200, 60, '30 / 30', 24), 'ok'),
    count25: art('<rect x="80" y="150" width="70" height="70" fill="#b9854b"/><rect x="160" y="150" width="70" height="70" fill="#b9854b"/><rect x="240" y="150" width="70" height="70" fill="#b9854b"/><rect x="160" y="80" width="70" height="70" fill="#b9854b"/>' + say(200, 60, '25 / 25', 24), 'ok'),
  };
}
// A signature of the finger in the box of 300 x 100, in four hands: a zigzag, loops, initials with a stroke under them (three pairs), a flourish; `k` gives the hand (k % 4) and a few points of difference
// from one person to the next. The company signs with the first two hands (k % 4 = 0 or 1), the customer with the last two: the two signatures of a PV never look alike.
const LETTER: Record<string, (x: number) => [number, number][]> = {
  M: x => [[x, 80], [x, 24], [x + 24, 64], [x + 48, 24], [x + 48, 80]], L: x => [[x, 24], [x, 80], [x + 30, 80]], D: x => [[x, 24], [x, 80], [x + 22, 72], [x + 32, 52], [x + 22, 30], [x, 24]],
  R: x => [[x, 80], [x, 24], [x + 26, 26], [x + 34, 44], [x + 22, 58], [x, 60], [x + 32, 80]], B: x => [[x, 80], [x, 24], [x + 24, 26], [x + 28, 40], [x + 12, 52], [x + 30, 62], [x + 26, 78], [x, 80]],
  P: x => [[x, 80], [x, 24], [x + 26, 26], [x + 34, 44], [x + 20, 58], [x, 60]],
};
const HANDS: ((k: number) => Strokes)[] = [
  () => [[[12, 72], [34, 26], [52, 80], [78, 22], [104, 74], [140, 40], [190, 66], [250, 36]], [[20, 90], [270, 86]]],
  () => [[[10, 66], [26, 36], [44, 24], [58, 40], [48, 66], [32, 74], [28, 56], [50, 34], [78, 30], [96, 52], [104, 74], [120, 48], [138, 28], [158, 46], [166, 72], [186, 44], [208, 26], [226, 50], [240, 70], [264, 40]]],
  k => { const [a, b] = ['MR', 'LB', 'DP'][(k >> 2) % 3]; return [LETTER[a](16), LETTER[b](92), [[8, 92], [150, 88]]]; },
  () => [[[10, 76], [44, 28], [78, 62], [118, 20], [160, 70], [200, 30], [240, 66], [286, 24]], [[120, 10], [210, 90]]],
];
const sig = (k: number): Strokes => HANDS[k % 4](k).map(line => line.map(([x, y], i) => [x + (i % 2 ? k % 5 : 0), y + (i % 3 ? 0 : (k >> 2) % 4)] as [number, number]));

// ---- the moves of an order, in the order they happened (each one writes its line in the journal)
type Step = (d: Delivery) => Delivery;
type Clock = (n: number, h?: number, m?: number) => string;
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const plus = (at: string, min: number) => { const d = new Date(`${at}:00`); d.setMinutes(d.getMinutes() + min); return stamp(d); };
// The links the moves carry (`lk`) are given to the company's own records before an order is signed: the seal of a PV covers them
const steps = (lk: Link) => ({
  check: (i: number, ok: boolean, by: string, at: string, r: Partial<MilestoneCheck> = {}): Step => d => checkMilestone(d, d.milestones[i].id!, { ok, by, at, ...lk(r) }),
  waive: (i: number, by: string, why: string, at: string): Step => d => waiveMilestone(d, d.milestones[i].id!, by, why, at),
  na: (i: number, why: string, by: string, at: string): Step => d => setMilestoneNa(d, d.milestones[i].id!, why, by, at),
  link: (i: number, ncId: string, by: string, at: string): Step => d => linkMilestoneNc(d, d.milestones[i].id!, ncId, by, at),
  // the four checks before departure are four gestures: two minutes apart
  ships: (by: string, at: string): Step => d => shipChecksOf(d, DEFAULT_PARAMS).reduce((x, c, i) => setShipCheck(x, c.id, true, by, plus(at, i * 2)), d),
  ship: (i: number, by: string, at: string): Step => d => setShipCheck(d, shipChecksOf(d, DEFAULT_PARAMS)[i].id, true, by, at),
  release: (by: string, at: string, sign?: Strokes, why?: string): Step => d => releaseDelivery(d, { by, at, sign, ...(why ? { derogation: { why } } : {}) }),
  arrive: (at: string, place: string, by: string): Step => d => startReception(d, { at, place, by }),
  who: (patch: Parameters<typeof setReceptionist>[1]): Step => d => setReceptionist(d, lk(patch)),
  rec: (patch: Partial<Reception>): Step => d => ({ ...d, reception: { ...d.reception, ...patch } }),
  result: (r: Reception['result'], at: string, by: string): Step => d => setResult(d, r, at, by),
  // the id is stable from the start (the seal of a PV covers it): the n-th reservation of the delivery under way is `rv_<order>_<n>`
  reserve: (r: Parameters<typeof addReserve>[1]): Step => d => { const out = addReserve(d, r), n = reservesOf(out).length; return { ...out, reception: { ...out.reception, reserves: reservesOf(out).map((x, i) => (i === n - 1 ? { ...x, id: `rv_${d.id}_${n}` } : x)) } }; },
  handler: (i: number, handler: string, by: string, at: string): Step => d => patchReserve(d, reservesOf(d)[i].id, { handler }, by, at),
  repair: (i: number, r: Parameters<typeof repairReserve>[2]): Step => d => repairReserve(d, reservesOf(d)[i].id, r),
  lift: (i: number, r: Parameters<typeof liftReserve>[2]): Step => d => liftReserve(d, reservesOf(d)[i].id, { now: r.at, ...r }),   // the moment of the writing is the moment of the fact: the same example is the same records
  refuse: (r: Parameters<typeof refuse>[1], at: string, by: string): Step => d => refuse(d, r, at, by),
  company: (k: number, at: string, by: string): Step => d => signCompany(d, sig(k), at, by),
  client: (k: number, at: string, by: string): Step => d => signClient(d, sig(k), at, by),
  noSign: (kind: 'absent' | 'refused', witness: string, at: string, by: string, org: string): Step => d => setNoSign(d, kind, witness, at, by, org),
  paper: (ref: string, at: string, by: string): Step => d => setPvPhoto(d, ref, at, by),
  // the numbers follow the days of the signatures; given before the move that locks the PV (the seal covers it), in the year of the last line of the journal
  pv: (n: number): Step => d => ({ ...d, reception: { ...d.reception, pvNo: `PV-${d.journal!.at(-1)!.at.slice(0, 4)}-${String(n).padStart(3, '0')}` } }),
  next: (by: string, at: string): Step => d => nextPresentation(d, by, at),
  // the day promised again when the delivery is presented again: the identity of the order is sealed with the closed delivery, so it is a correction, with its reason (and the seal laid again)
  promise: (day: string, by: string, at: string, why: string): Step => d => correctLocked(d, { _why: why, order: { promisedAt: day } }, by, at),
  archive: (at: string, note: string, by: string): Step => d => archiveDelivery(d, at, note, by),
});
// What `newId` gives (the time) is replaced by stable ids: the same example is the same records
const fix = (d: Delivery): Delivery => {
  const rv = (r: Reception, id: string): Reception => (r.reserves ? { ...r, reserves: r.reserves.map((x, i) => ({ ...x, id: `rv_${id}_${i + 1}` })) } : r);
  return { ...d, reception: rv(d.reception, d.id), ...(d.lots ? { lots: d.lots.map((l, i) => ({ ...l, id: `lt_${d.id}_${i + 1}`, reception: rv(l.reception, `${d.id}_${i + 1}`) })) } : {}) };
};

// `tie`: what the company holds of what the orders point at (nothing given: everything is kept); `closed`: the days the company is closed (its settings), else the public holidays of France.
// An order is dated on working days: a day that falls on a Saturday, a Sunday or a closed day moves to the working day before it (the day after it, for a day to come); the moments of one
// order never go back (two days that land on the same Friday follow each other a few minutes apart), and an order that comes from a quote starts after the day of its decision.
export function receptionExamples(today = new Date(), tie: Tie = (_k, id) => id, closed?: readonly string[]): { deliveries: Record<string, Delivery>; ncs: Record<string, Nc> } {
  const y = today.getFullYear(), P = pics(), lk = linker(tie), S = steps(lk);
  const shut = new Set(closed?.length ? closed : [y - 1, y, y + 1].flatMap(x => frenchHolidays(x).map(h => h.date)));
  const calendar = (n: number) => new Date(y, today.getMonth(), today.getDate() - n);
  const walk = (d: Date, by: number) => { for (let i = 0; i < 14 && (d.getDay() % 6 === 0 || shut.has(isoDate(d))); i++) d.setDate(d.getDate() + by); return d; };
  const raw = (n: number) => isoDate(calendar(n));   // a calendar day, as the quotes of 2.1 date theirs
  const ago = (n: number) => isoDate(walk(calendar(n), n < 0 ? 1 : -1));
  const promised = (quote: string) => raw(QUOTE[quote][0] - QUOTE[quote][1] * 7);   // the day of the decision + the weeks of the quote
  // a moment that would come before the one before it (two days that fell on the same Friday) follows it: 10 minutes after when it was the same day, two hours per day of the story else (the evening excepted)
  const clock = (floor = ''): Clock => {
    let last = '', lastN = 0;
    return (n, h = 9, m = 0) => {
      const day = ago(n), at = `${floor && day <= floor ? isoDate(walk(calendar(n), 1)) : day}T${pad(h)}:${pad(m)}`, gap = Math.max(0, lastN - n), later = plus(last || at, gap ? gap * 120 : 10);
      lastN = n;
      return (last = at > last ? at : later.slice(0, 10) === last.slice(0, 10) && later.slice(11, 13) < '20' ? later : plus(last, 10));
    };
  };
  const [A, D, M, J, K, N, L, SV] = ['Antoine P.', 'David K.', 'Marc M.', 'Julien P.', 'Karim T.', 'Nicolas R.', 'Lucie B.', 'Sophie V.'];
  // an order from a model of the tool (stable ids), its own definitions where the milestone is measured, then its moves, dated by its own clock
  const order = (id: string, model: string, born: number, p: Partial<Delivery>, defs: Partial<Milestone>[], moves: (T: Clock) => Step[]): Delivery => {
    const T = clock(p.quoteId && QUOTE[p.quoteId] ? raw(QUOTE[p.quoteId][0]) : ''), d = deliveryFromTemplate(MILESTONE_TEMPLATES.find(t => t.name === model)!), q = lk(p);
    const team = (q.team ?? []).filter(n => tie('person', n) !== undefined);
    const x: Delivery = { ...d, ...q, id, milestones: d.milestones.map((m, i) => ({ ...m, id: `${id}_m${i + 1}`, ...lk(defs[i] ?? {}) })) };
    if (team.length) x.team = team; else delete x.team;
    const first = T(born, 8, 30);
    return fix(moves(T).reduce((acc, f) => f(acc), logDelivery(x, SV, first, 'Commande créée')));
  };
  const nc = (n: number, p: Partial<Nc>): Nc => ({
    id: `nc_demo_r${n}`, ref: `NC-${y}-${String(8 + n).padStart(3, '0')}`, at: '', by: '', where: '', item: '', qty: null, description: '', cause: '', origin: 'interne', decision: '', decidedAt: '', decidedBy: '', decisionNote: '',
    processId: 'P3', cost: { scrap: null, lostHours: null, reworkHours: null, logistics: null }, ...p,
  });

  const clientA = { orgId: 'org_demo_clientA', contactId: 'ct_demo_cl_durand' };
  const deliveries = [
    // 1. accepted without reservation, signed by the finger, both PV; a measured milestone inside its bounds, a second person on the critical one, the review of 2.4 is posted
    // (its quote was decided 40 days ago for a delivery promised after 6 weeks: the order is made the day after the decision and delivered early, the review of 2.4 is dated about the day of the reception)
    order('dl_demo_1', 'Fabrication', 39, { ref: `CMD-${y}-041`, client: 'Client A', item: 'Châssis mécano-soudés peints', qty: 150, ...clientA, quoteId: 'qt_demo_1', promisedAt: promised('qt_demo_1'), team: [N, J, D], lot: `LOT-${y}-17`, material: 'Lot de matière n° 4417' },
      [{}, {}, { unit: 'mm', min: 1244, max: 1246, point: 'Largeur hors tout', requirement: 'Entre 1 244 et 1 246 mm', refPhoto: P.ref, critical: true }, {}], T => [
        S.check(0, true, N, T(39, 8, 50), { photo: P.parts }), S.check(1, true, N, T(39, 9, 40)), S.check(2, true, D, T(39, 10, 15), { measured: '1 245,2 mm', photo: P.frame, second: A }), S.check(3, true, J, T(39, 11), { photo: P.parcel }),
        S.ships(J, T(39, 11, 30)), S.release(A, T(39, 12), sig(4)),
        S.arrive(T(38, 10, 15), 'Site du client, quai 3', D), S.who({ name: 'M. Durand', role: 'Acheteur', ...clientA }), S.result('sans', T(38, 10, 40), D),
        S.company(5, T(38, 10, 50), D), S.pv(2), S.client(6, T(38, 10, 55), D),
      ]),
    // 2. two reservations: one repaired and lifted with a photo and the signature of the customer, one still to lift; delivered two days after the promised day (quote of 2.4, decided 26 days ago, 3 weeks)
    order('dl_demo_2', 'Fabrication', 25, { ref: `CMD-${y}-052`, client: 'Client C', item: 'Caissons de rangement', qty: 12, orgId: 'org_demo_clientC', contactId: 'ct_demo_clientC', quoteId: 'qt_demo_7', promisedAt: promised('qt_demo_7'), team: [D, K, L] }, [], T => [
      S.check(0, true, K, T(20, 8, 40)), S.check(1, true, K, T(14, 16, 10), { photo: P.piece }), S.check(2, true, A, T(8, 10, 30)), S.check(3, true, L, T(5, 14, 20), { photo: P.parcel }),
      S.ships(L, T(4, 15, 40)), S.release(A, T(4, 16, 30), sig(8)),
      S.arrive(T(3, 14, 20), 'Atelier du client, quai de réception', D), S.who({ name: 'Mme Perret', role: 'Responsable approvisionnement', orgId: 'org_demo_clientC' }), S.result('reserve', T(3, 14, 50), D),
      S.reserve({ text: 'Une poignée mal vissée sur un caisson', photo: P.handle, where: 'Caisson 7', severity: 'minor', by: D, at: T(3, 14, 55) }),
      S.reserve({ text: 'Étiquette de référence manquante sur deux caissons', photo: P.label, where: 'Caissons 3 et 9', severity: 'minor', by: D, at: T(3, 14, 58) }),
      S.company(9, T(3, 15, 5), D), S.pv(9), S.client(10, T(3, 15, 10), D),
      S.handler(0, K, D, T(3, 15, 30)), S.handler(1, D, D, T(3, 15, 31)), S.repair(0, { at: T(2, 9, 30), by: K, photo: P.handleFixed }),
      S.lift(0, { at: T(1, 15), by: 'Mme Perret', note: 'Poignée serrée, vérifiée sur place', photo: P.handleFixed, sign: sig(11) }),
    ]),
    // 3. a site order: the reservation is late, on any day (raised 24 days ago: the 7 working days to lift it are over on any day of the calendar)
    order('dl_demo_3', 'Chantier ou pose', 44, { ref: `CMD-${y}-047`, client: 'BâtiPro', item: "Escalier d'atelier", qty: 1, orgId: 'org_demo_batipro', contactId: 'ct_demo_cl_lopez', promisedAt: ago(24), team: [D, N, K] },
      [{}, { unit: 'mm/m', min: 0, max: 2, point: 'Aplomb des limons', requirement: 'Au plus 2 mm par mètre' }, {}, {}], T => [
        S.check(0, true, D, T(40, 9)), S.check(1, true, N, T(35, 14), { measured: '1,5 mm/m', photo: P.stairs }), S.check(2, true, K, T(31, 11, 15)), S.check(3, true, K, T(28, 16, 30)), S.ships(D, T(27, 17)), S.release(D, T(27, 17, 20)),
        S.arrive(T(24, 9, 30), "Atelier de BâtiPro, 8 rue des Chantiers", D), S.who({ name: 'Mme Lopez', role: 'Conductrice de travaux', orgId: 'org_demo_batipro', contactId: 'ct_demo_cl_lopez' }), S.result('reserve', T(24, 10), D),
        S.reserve({ text: 'Retouche de peinture sur 2 marches', photo: P.stairsFlaw, where: 'Marches 4 et 5', severity: 'minor', by: D, at: T(24, 10, 5) }),
        S.company(12, T(24, 10, 15), D), S.pv(5), S.client(14, T(24, 10, 20), D), S.handler(0, J, D, T(24, 10, 40)),
      ]),
    // 4. a milestone not conform: the measure is out of the bounds (the finger pressed "conform", the tool says no), the defect of 5.1 is declared once and decided
    order('dl_demo_4', 'Fabrication', 12, { ref: `CMD-${y}-058`, client: 'Client B', item: 'Portillons de remplacement', qty: 4, orgId: 'org_demo_clientB', contactId: 'ct_demo_clientB', promisedAt: ago(-3), team: [K, J, A] },
      [{}, {}, { unit: 'mm', min: 999, max: 1001, point: 'Largeur du portillon', requirement: 'Entre 999 et 1 001 mm', refPhoto: P.ref }, {}], T => [
        S.check(0, true, K, T(9, 9, 20)), S.check(1, true, K, T(6, 15, 50)),
        S.check(2, true, A, T(2, 14, 30), { measured: '1 003,5 mm', photo: P.piece, gapPhoto: P.ruler }), S.link(2, 'nc_demo_r1', A, T(2, 14, 40)),
      ]),
    // 5. in progress: two milestones done, the instruction of the workstation (3.2) one tap away, quote won in 2.1 (decided 10 days ago, 3 weeks)
    order('dl_demo_5', 'Fabrication', 7, { ref: `CMD-${y}-060`, client: 'Client A', item: 'Supports moteur', qty: 400, ...clientA, quoteId: 'qt_demo_6', promisedAt: promised('qt_demo_6'), team: [M, J] },
      [{}, { sopId: 'sop_demo_2' }, { critical: true }, {}], T => [S.check(0, true, M, T(5, 10, 10), { photo: P.parts }), S.check(1, true, J, T(2, 16, 15))]),
    // 6. released by derogation (a milestone not conform was passed over, who and why), late against the promised day, checks before departure half done
    order('dl_demo_6', 'Standard', 14, { ref: `CMD-${y}-055`, client: 'Agencement Morel', item: "Rampe d'atelier", qty: 1, orgId: 'org_demo_morel', contactId: 'ct_demo_cl_morel', promisedAt: ago(2), team: [D, N] }, [], T => [
      S.check(0, true, D, T(9, 9)), S.check(1, true, N, T(7, 14, 20)), S.check(2, false, A, T(6, 11, 10), { note: 'Rayure sur la face avant', gapPhoto: P.scratch }),
      S.waive(2, D, 'Retouche prévue à la pose, accord de M. Morel', T(5, 9, 30)), S.check(3, true, N, T(5, 15)),
      S.ship(0, N, T(4, 9)), S.ship(1, N, T(4, 9, 5)), S.release(D, T(4, 10), sig(13), 'Retouche de la rayure prévue à la pose, accord de M. Morel'),
    ]),
    // 7. a count with bounds (30 on 30), accepted without reservation, no promised day typed
    order('dl_demo_7', 'Revente ou négoce', 20, { ref: `CMD-${y}-063`, client: 'Menuiserie Roche', item: 'Plateaux et pieds de table', qty: 30, team: [L, D] },
      [{}, {}, { unit: 'pièces', min: 30, max: 30, point: 'Quantité comptée', requirement: 'Égale à la quantité commandée' }, {}], T => [
        S.check(0, true, L, T(12, 9)), S.check(1, true, L, T(10, 11, 30)), S.check(2, true, D, T(9, 14), { measured: '30 pièces', photo: P.count }), S.check(3, true, L, T(8, 10), { photo: P.parcel }),
        S.ships(L, T(7, 15)), S.release(D, T(7, 15, 30)),
        S.arrive(T(6, 9, 45), 'Menuiserie Roche, atelier', L), S.who({ name: 'M. Roche', role: 'Gérant' }), S.rec({ count: 30 }), S.result('sans', T(6, 10, 5), L),
        S.company(16, T(6, 10, 10), L), S.pv(8), S.client(15, T(6, 10, 15), L),
      ]),
    // 8. a site order (fitted benches, nothing of metal to weld) accepted: the customer signed the paper PV (photo), a torque read with an instrument of 3.3, the state at delivery photographed
    order('dl_demo_8', 'Chantier ou pose', 24, { ref: `CMD-${y}-064`, client: 'Hôtel des Tilleuls', item: 'Banquettes de la salle de restaurant', qty: 1, promisedAt: ago(9), team: [D, N] },
      [{}, { unit: 'Nm', min: 2.3, max: 2.7, point: 'Serrage des fixations', requirement: 'Entre 2,3 et 2,7 Nm', instrumentId: 'eq_demo_cle' }, {}, {}], T => [
        S.check(0, true, D, T(16, 9, 30)), S.check(1, true, N, T(13, 10, 45), { measured: '2,5 Nm', photo: P.torque, instrumentId: 'eq_demo_cle' }), S.check(2, true, N, T(11, 15, 10), { photo: P.bench }), S.check(3, true, D, T(10, 12)),
        S.ships(D, T(10, 13)), S.release(D, T(10, 13, 20)),
        S.arrive(T(9, 14), "Hôtel des Tilleuls, salle de restaurant", D), S.who({ name: 'Mme Faure', role: 'Directrice' }), S.rec({ count: 1, photos: [P.bench] }), S.result('sans', T(9, 14, 25), D),
        S.company(17, T(9, 14, 30), D), S.pv(7), S.paper(P.paper, T(9, 14, 40), D),
      ]),
    // 9. to release: a milestone redone after a defect ("conform after rework", its history kept), one that does not apply, a second person on the critical one
    order('dl_demo_9', 'Fabrication', 18, { ref: `CMD-${y}-066`, client: 'Maison Perrin', item: 'Étagères de réserve', qty: 8, orgId: 'org_demo_perrin', contactId: 'ct_demo_cl_perrin', promisedAt: ago(-4), team: [N, D, A] },
      [{}, {}, { unit: 'mm', min: 799, max: 801, point: 'Longueur des montants', requirement: 'Entre 799 et 801 mm', critical: true }, {}], T => [
        S.check(0, true, N, T(12, 9, 30)),
        S.check(1, false, N, T(8, 11, 20), { note: 'Soudure incomplète sur 2 montants', gapPhoto: P.crack }), S.link(1, 'nc_demo_r2', N, T(8, 11, 30)),
        S.check(1, true, N, T(6, 15, 45), { note: 'Soudure reprise et recontrôlée', photo: P.shelf }),
        S.check(2, true, D, T(3, 10, 15), { measured: '800,3 mm', second: A }), S.na(3, 'Livré monté sur place, sans emballage', N, T(3, 10, 20)),
      ]),
    // 10. delivered in part: 12 on 20 received and signed, the customer agreed to several deliveries, 8 left to deliver
    order('dl_demo_10', 'Fabrication', 40, { ref: `CMD-${y}-049`, client: 'Collectivité Valmont', item: 'Bancs et abris urbains', qty: 20, orgId: 'org_demo_valmont', contactId: 'ct_demo_cl_garnier', promisedAt: ago(-5), team: [D, K, N] }, [], T => [
      S.check(0, true, D, T(30, 9)), S.check(1, true, K, T(24, 15), { photo: P.bench }), S.check(2, true, A, T(20, 11)), S.check(3, true, K, T(19, 16, 20), { photo: P.parcel }),
      S.ships(K, T(18, 14)), S.release(A, T(18, 14, 30), sig(20)),
      S.arrive(T(16, 10), 'Service technique de la mairie', D), S.who({ name: 'M. Garnier', role: 'Service technique', orgId: 'org_demo_valmont', contactId: 'ct_demo_cl_garnier' }),
      S.rec({ qty: 12, count: 12, partialOk: { by: 'M. Garnier', at: `${ago(17)}T09:00` } }), S.result('sans', T(16, 10, 30), D),
      S.company(21, T(16, 10, 35), D), S.pv(6), S.client(18, T(16, 10, 40), D),
    ]),
    // 11. a service: the second person reads the deliverable, one reservation repaired and lifted by the customer (a plan corrected), reservations lifted
    order('dl_demo_11', 'Prestation ou service', 40, { ref: `CMD-${y}-048`, client: 'Cabinet Rey', item: "Plans d'exécution du mobilier, tranche 2", qty: 1, orgId: 'org_demo_rey', contactId: 'ct_demo_cl_rey', promisedAt: ago(27), team: [M, A] },
      [{}, {}, { critical: true }, {}], T => [
        S.check(0, true, M, T(36, 10)), S.check(1, true, M, T(31, 16), { photo: P.plan }), S.check(2, true, A, T(28, 9, 20), { second: D }), S.check(3, true, M, T(27, 15, 10), { photo: P.plan }),
        S.release(A, T(27, 15, 30)),
        S.arrive(T(26, 10), 'Cabinet Rey, salle de réunion', M), S.who({ name: 'Dr Rey', role: 'Gérant du cabinet', orgId: 'org_demo_rey', contactId: 'ct_demo_cl_rey' }), S.result('reserve', T(26, 10, 40), M),
        S.reserve({ text: "Cotes de l'escalier à compléter sur le plan 3", photo: P.plan, where: 'Plan 3', severity: 'minor', by: M, at: T(26, 10, 45) }),
        S.company(24, T(26, 10, 50), M), S.pv(4), S.client(19, T(26, 10, 55), M),
        S.handler(0, M, M, T(26, 11)), S.repair(0, { at: T(24, 14), by: M, photo: P.plan }), S.lift(0, { at: T(22, 9, 30), by: 'Dr Rey', note: 'Plan corrigé reçu par e-mail', photo: P.plan }),
      ]),
    // 12. refused: the motive from the list, a photo, what follows chosen; the customer signed the refusal
    order('dl_demo_12', 'Revente ou négoce', 9, { ref: `CMD-${y}-067`, client: 'Atelier Duval', item: 'Kit de montage, lot 2', qty: 25, promisedAt: ago(1), team: [L, SV] }, [], T => [
      S.check(0, true, L, T(7, 9)), S.check(1, true, L, T(6, 11, 15)), S.check(2, true, SV, T(5, 14), { photo: P.count25 }), S.check(3, true, L, T(4, 10, 30), { photo: P.parcel }),
      S.ships(L, T(3, 15)), S.release(A, T(3, 15, 30)),
      S.arrive(T(1, 11), 'Atelier Duval, quai', L), S.who({ name: 'Mme Roux', role: 'Réceptionnaire' }),
      S.refuse({ reason: 'Documents manquants', next: DEFAULT_NEXTS[0], photo: P.parcelOpen }, T(1, 11, 20), L), S.company(25, T(1, 11, 25), L), S.pv(10), S.client(22, T(1, 11, 30), L),
    ]),
    // 13. refused then presented again: the first delivery is closed in `lots` (motive typed with "Autre"), the second one has a new promised day, is delivered and waits for its PV
    order('dl_demo_13', 'Fabrication', 60, { ref: `CMD-${y}-045`, client: 'Client B', item: 'Portillons, série 3', qty: 40, orgId: 'org_demo_clientB', contactId: 'ct_demo_clientB', promisedAt: ago(35), team: [K, J, A] }, [{}, {}, { critical: true }, {}], T => [
      S.check(0, true, K, T(50, 9)), S.check(1, true, J, T(44, 14, 30)), S.check(2, true, A, T(39, 10), { second: D }), S.check(3, true, K, T(37, 15), { photo: P.parcel }),
      S.ships(K, T(36, 14)), S.release(A, T(36, 14, 30)),
      S.arrive(T(35, 10, 30), 'Client B, quai de réception', J), S.who({ name: 'M. Lemaire', role: 'Acheteur', orgId: 'org_demo_clientB' }),
      S.refuse({ reason: 'Autre', other: "Teinte différente de l'échantillon validé", next: DEFAULT_NEXTS[0], photo: P.swatch }, T(35, 10, 50), J), S.company(28, T(35, 10, 55), J), S.pv(3), S.client(23, T(35, 11), J),
      S.next(J, T(34, 9)), S.promise(ago(3), J, T(34, 9, 10), 'Nouvelle date convenue avec le client'),
      S.check(0, true, K, T(30, 9, 20)), S.check(1, true, J, T(12, 15)), S.check(2, true, A, T(6, 10, 40), { second: D }), S.check(3, true, K, T(5, 15, 10), { photo: P.parcel }),
      S.ships(K, T(4, 9)), S.release(A, T(4, 9, 30)),
      S.arrive(T(3, 10, 15), 'Client B, quai de réception', J),
    ]),
    // 14. archived: received while the customer was absent (a witness is named instead of the signature), closed and put away
    order('dl_demo_14', 'Chantier ou pose', 282, { ref: `CMD-${y}-012`, client: 'Collectivité Valmont', item: 'Barrières de ville', qty: 12, orgId: 'org_demo_valmont', contactId: 'ct_demo_cl_garnier', promisedAt: ago(258), team: [D, N] }, [], T => [
      S.check(0, true, D, T(274, 9)), S.check(1, true, N, T(268, 14)), S.check(2, true, D, T(263, 10, 30)), S.check(3, true, N, T(261, 16)),
      S.ships(D, T(260, 14)), S.release(D, T(260, 14, 30)),
      S.arrive(T(258, 9), 'Parking de la mairie de Valmont', D), S.who({ name: 'M. Garnier', role: 'Service technique', orgId: 'org_demo_valmont', contactId: 'ct_demo_cl_garnier' }), S.result('sans', T(258, 9, 20), D),
      S.pv(1), S.noSign('absent', 'Gardien du site', T(258, 9, 30), D, 'Client'), S.company(29, T(258, 9, 35), D),
      S.archive(T(200, 11), 'Commande close, bilan posé', SV),
    ]),
  ];

  // the defects of 5.1 declared from a milestone: one per milestone, decided, no cost, from the milestone of the order (as ncFromMilestone does it); each one is dated by the line of the journal
  // that declared it, and decided after it
  const ms = (id: string, i: number) => deliveries.find(d => d.id === id)!.milestones[i], item = (id: string) => deliveries.find(d => d.id === id)!.item;   // `where` is the deliverable, as ncFromMilestone writes it
  const declared = (id: string) => deliveries.find(d => d.id === id)!.journal!.find(l => l.text.startsWith('Défaut déclaré'))!.at;
  const after = (at: string, n: number, h: number) => { const t = `${ago(n)}T${pad(h)}:00`; return t > at ? t : plus(at, 10); };
  const [at1, at2] = [declared('dl_demo_4'), declared('dl_demo_9')];
  const ncs = [
    nc(1, { at: at1, by: A, where: item('dl_demo_4'), item: 'Portillons de remplacement, CMD-' + y + '-058, Client B', qty: 4, cause: 'reglage', decision: 'retouche', decidedAt: after(at1, 1, 9), decidedBy: M, decisionNote: 'Reprise de la largeur et recontrôle',
      description: `${ms('dl_demo_4', 2).point} : ${ms('dl_demo_4', 2).measured} (exigence : ${ms('dl_demo_4', 2).requirement})`, deliveryId: 'dl_demo_4', milestoneId: ms('dl_demo_4', 2).id, photo: P.ruler }),
    nc(2, { at: at2, by: N, where: item('dl_demo_9'), item: 'Étagères de réserve, CMD-' + y + '-066, Maison Perrin', qty: 2, cause: 'methode', decision: 'retouche', decidedAt: after(at2, 8, 15), decidedBy: M, decisionNote: 'Soudures reprises, recontrôle fait',
      description: `${ms('dl_demo_9', 1).point} : non conforme (exigence : ${ms('dl_demo_9', 1).requirement})`, deliveryId: 'dl_demo_9', milestoneId: ms('dl_demo_9', 1).id, photo: P.crack }),
  ];
  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { deliveries: byId(deliveries), ncs: byId(ncs) };
}

// ---- a fictitious company saved before this version, and the button "Voir un exemple traité"
type Links = {
  deliveries: Record<string, Delivery>; ncs: Record<string, Nc>; orgs: Record<string, Org>; contacts: Record<string, Contact>; params: Params;
  quotes?: State['quotes']; sops?: State['sops']; equipments?: State['equipments']; people?: Record<string, Person>; settings?: Pick<State['settings'], 'companyName'>;
};
// What the first example held before the rework of the tool (as the old tool saved it, amounts of the old invoice field included: kept here only to recognise an order nobody edited).
// Its dates were relative to the day it was made, which the order itself remembers (a checked milestone carries the sixth day before): `today` is that day.
function firstExample(today: Date): Delivery[] {
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
    dl('dl_demo_6', { ref: `CMD-${y}-055`, client: 'Agencement Morel', item: "Rampe d'atelier", qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(4) }),
    dl('dl_demo_7', { ref: `CMD-${y}-063`, client: 'Menuiserie Roche', item: 'Plateaux et pieds de table', qty: 30, milestones: ms([true, true, true, true]), releasedBy: 'David K.', releasedAt: ago(7), reception: rec({ date: ago(6), name: 'M. Roche', role: 'Gérant', result: 'sans', amount: 5400 }) }),
    dl('dl_demo_8', { ref: `CMD-${y}-064`, client: 'Hôtel des Tilleuls', item: 'Garde-corps de terrasse', qty: 1, milestones: ms([true, true, true, true]), releasedBy: 'Marc M.', releasedAt: ago(10), reception: rec({ date: ago(9), name: 'Mme Faure', role: 'Directrice', result: 'sans', amount: 6200 }) }),
  ];
}
// The whole record, keys in any order (a saved copy may have gone through other hands)
const canon = (v: unknown) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
// What level 2 added to the records (the seals, the time zone, the moment of the photo, the requirement and the bounds written in the events of the checks, `sameAsControl` of a derogation,
// the organisation of a witness) and the journal, which grew with it: left out, an order of level 1 that nobody edited is identical to the same order of level 2
const core = (d: Delivery): unknown => {
  const c = JSON.parse(JSON.stringify(upgradeDelivery(d))) as Record<string, any>;
  [c, ...(c.lots ?? [])].forEach(x => { ['seals', 'signTz', 'pvPhotoAt', 'signedAt'].forEach(k => delete x.reception[k]); x.milestones.forEach((m: Milestone) => (m.history ?? []).forEach(e => ['requirement', 'min', 'max', 'instrumentId'].forEach(k => delete (e as any)[k]))); });
  delete c.journal;
  if (c.derogation) delete c.derogation.sameAsControl;
  if (c.reception.noSign) delete c.reception.noSign.witnessOrg;
  return c;
};

// The orders of the levels 1 to 3 carry no mark: they are known by what they held, which the code that made them no longer says (the example has changed since). The fingerprint of a record is the SHA-256
// of its content with every date counted in days from `from` (the day of its first check), without the journal, the seals and the links to the other tools: the same on whatever day the example was
// made. These are those of the fourteen orders and of the two defects as those levels gave them (`receptionExamplesOld.json` holds the records, a test reads them back).
const DAY = /^\d{4}-\d{2}-\d{2}/;
const epoch = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const fingerprint = (x: unknown, from: string, drop: string[] = []): string => {
  const base = DAY.test(from) ? epoch(from) : 0;
  return sha256(JSON.stringify(x, (k, v) => (drop.includes(k) ? undefined : typeof v === 'string' && DAY.test(v) ? `D${epoch(v) - base}${v.slice(10)}` : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v))).slice(0, 20);
};
export const printOfOrder = (d: Delivery): string => { const c = core(d) as Delivery; return fingerprint(c, c.milestones?.[0]?.date ?? '', ['quoteId', 'exampleHash']); };
export const printOfNc = (n: Nc): string => fingerprint(n, n.at, ['ref']);
const KNOWN_ORDERS: Record<string, string[]> = {
  dl_demo_1: ['3dd53a0d735c36b843f5', '16111bd7324e2b8a22cf'], dl_demo_2: ['b63db0a668f9910e8804'], dl_demo_3: ['aa497b9c2097cffb9489'], dl_demo_4: ['5f336f34b00547c801be'], dl_demo_5: ['bfe032c273e935cc21c5'],
  dl_demo_6: ['c1d0414002ba7edc1366'], dl_demo_7: ['e6281a64c448a14013fa'], dl_demo_8: ['d19a0b8e3f18bfd6164e'], dl_demo_9: ['34d773cc76fb2fb110bb'], dl_demo_10: ['3888ae7999723ffff427'],
  dl_demo_11: ['92e9a77df67a9ca76a3a'], dl_demo_12: ['eb5b1310ad2676106b15'], dl_demo_13: ['24cef3080de368750092'], dl_demo_14: ['21f491a730b6a3954b80'],
};
const KNOWN_NCS: Record<string, string> = { nc_demo_r1: '74caa4c7def92ccb018e', nc_demo_r2: 'd5feb953d4a747b3a988' };

// What an order held when the example gave it: the SHA-256 of the whole record (its journal, its signatures and its seals included) without this field. An order that still holds it nobody touched;
// the least change (a milestone checked, a line of the journal, a word) makes it another.
const hashOf = (d: Delivery): string => { const { exampleHash: _mark, ...rest } = d; return sha256(canon(rest)); };
// An order is "untouched" when it holds the hash it was given, or, if it is older than the hash, when it is identical to the first example, field for field (read in the current shape on both sides),
// or to the order of one of the levels 1 to 3 by its fingerprint: then, and only then, it is renewed (and "Retirer l'exemple" takes it)
const untouched = (d: Delivery): boolean => {
  if (d.exampleHash) return d.exampleHash === hashOf(d);
  const first = parseDate(d.milestones?.[0]?.date);
  if (!first) return false;
  first.setDate(first.getDate() + 6);
  const old = firstExample(first).find(x => x.id === d.id);
  return (!!old && canon(upgradeDelivery(d)) === canon(upgradeDelivery(old))) || !!KNOWN_ORDERS[d.id]?.includes(printOfOrder(d));
};
// A defect of the example is untouched when it is, apart from its number and its days, the one the example gives today or one of the levels 1 to 3
let freshNcs: [string, Record<string, Nc>] | undefined;
const untouchedNc = (n: Nc): boolean => {
  const day = isoDate(new Date());
  if (freshNcs?.[0] !== day) freshNcs = [day, receptionExamples().ncs];
  const bare = (x: Nc) => canon({ ...x, ref: '', at: '', decidedAt: '', item: '' }), now = freshNcs[1][n.id];
  return printOfNc(n) === KNOWN_NCS[n.id] || (!!now && bare(n) === bare(now));
};
// An order the company edited keeps everything it holds: only the links and the promised day it did not have are given
const fillScalars = (old: Delivery, fresh: Delivery): Delivery => ({
  ...old, ...Object.fromEntries((['quoteId', 'template', 'orgId', 'contactId', 'promisedAt', 'team'] as const).filter(k => old[k] === undefined && fresh[k] !== undefined).map(k => [k, fresh[k]])),
});

// What the orders may point at in the company: the organisations and the people of the directory the orders cite are added when the company has none like them (an organisation with the same name,
// a person of the same name and the same customer), and the quotes, instructions, instruments and people of the company that it does not hold are left out. A fictitious company is given its
// people after its orders (`team` asks for people only of a real one); a collection that is not given is not looked at.
function ties(s: Links, today: Date, real: boolean): { tie: Tie; orgs: Record<string, Org>; contacts: Record<string, Contact> } {
  const orgs = { ...s.orgs }, contacts = { ...s.contacts }, dir = { orgs: exampleOrgs(), contacts: exampleContacts(today) };
  const held = (c: Record<string, unknown> | undefined, id: string) => !c || Object.hasOwn(c, id);
  const tie: Tie = (kind, id) => {
    if (kind === 'org') {
      if (Object.hasOwn(orgs, id)) return id;
      const o = dir.orgs.find(x => x.id === id);
      return o ? orgOf({ orgs }, o.name)?.id ?? (orgs[id] = o).id : undefined;
    }
    if (kind === 'contact') {
      if (Object.hasOwn(contacts, id)) return id;
      const c = dir.contacts.find(x => x.id === id);
      return c ? Object.values(contacts).find(x => x.category === 'client' && sameClient(x.company, c.company) && x.name.trim().toLowerCase() === c.name.trim().toLowerCase())?.id ?? (contacts[id] = c).id : undefined;
    }
    if (kind === 'person') return !real || !s.people || Object.values(s.people).some(p => p.name === id) ? id : undefined;
    return held({ quote: s.quotes, sop: s.sops, instrument: s.equipments }[kind], id) ? id : undefined;
  };
  return { tie, orgs, contacts };
}

// Writes the orders (those that come from the example now carry their hash), with the defects they declared, the customers and the people of the directory they point at, and, in the fictitious
// company only (`clause`), the clause of the settings when it has none
function place(s: Links, t: { orgs: Record<string, Org>; contacts: Record<string, Contact> }, orders: Delivery[], fresh: Set<string>, ncs: Nc[], today: Date, clause: boolean): Links {
  const deliveries = { ...s.deliveries }, mine = { ...s.ncs };
  orders.forEach(x => { deliveries[x.id] = fresh.has(x.id) ? { ...x, exampleHash: hashOf(x) } : x; });
  ncs.forEach(n => { mine[n.id] ||= Object.values(mine).some(o => o.ref === n.ref) ? { ...n, ref: nextRef('NC', Object.values(mine), today) } : n; });
  return { deliveries, ncs: mine, orgs: t.orgs, contacts: t.contacts, params: { ...s.params, ...(clause && !s.params.reception ? { reception: EXAMPLE_SETTINGS } : {}), receptionExampleLevel: RECEPTION_EXAMPLE_LEVEL } };
}

// A fictitious company saved before this version gets the orders of the current example, once: those nobody edited are renewed, the others only gain what they did not hold (links, promised day,
// team), the missing ones are added with their defects and their customers. A real company gets nothing (no order of the example in it). An order that comes from a quote the company holds is
// dated from the day that quote was decided (as the example of 2.1 and 2.4 saved with it dates its own): the promised day is the one of the quote, and the review is not before the reception.
export function completeReceptionExamples<T extends Links>(s: T, today = new Date()): T {
  if (!Object.keys(s.deliveries).some(id => id.startsWith('dl_demo_')) || (s.params.receptionExampleLevel ?? 0) >= RECEPTION_EXAMPLE_LEVEL) return s;
  const t = ties(s, today, true), made = new Map<string, ReturnType<typeof receptionExamples>>();
  const make = (day: Date) => { const k = isoDate(day); if (!made.has(k)) made.set(k, receptionExamples(day, t.tie, s.params.closedDays)); return made.get(k)!; };
  const ex = make(today), orders: Delivery[] = [], renewed = new Set<string>();
  const dated = (x: Delivery): Delivery => {
    const k = x.quoteId ? QUOTE[x.quoteId] : undefined, decided = k && s.quotes && Object.hasOwn(s.quotes, x.quoteId!) ? parseDate(s.quotes[x.quoteId!].decidedAt) : null;
    if (!k || !decided) return x;
    decided.setDate(decided.getDate() + k[0]);
    return decided < today ? make(decided).deliveries[x.id] : x;
  };
  Object.values(ex.deliveries).map(dated).forEach(x => {
    const old = s.deliveries[x.id];
    if (!old || untouched(old)) { orders.push(x); renewed.add(x.id); } else orders.push(fillScalars(old, x));
  });
  return { ...s, ...place(s, t, orders, renewed, Object.values(ex.ncs).filter(n => renewed.has(n.deliveryId!)), today, s.settings?.companyName === EXAMPLE_COMPANY) };   // the clause of the contract only in the fictitious company: a real one that took the example once does not get it
}

// The button "Voir un exemple traité" of tool 3.4: the orders above, in a company that has none yet (a company that holds orders keeps them)
export function applyReceptionExample(d: State, today = new Date()) {
  if (Object.keys(d.deliveries).length) return;
  const own = d.settings?.companyName === EXAMPLE_COMPANY, t = ties(d, today, !own), ex = receptionExamples(today, t.tie, d.params.closedDays);
  Object.assign(d, place(d, t, Object.values(ex.deliveries), new Set(Object.keys(ex.deliveries)), Object.values(ex.ncs), today, own));
}

// What "Retirer l'exemple" keeps: the orders of the example the company worked on (their id is the example's, their content no longer is) and the defects declared from them that it worked on, or that
// belong to an order that stays. The ids of what stays, orders and defects: the window says how many.
export function modifiedReceptionExamples(s: Pick<State, 'deliveries' | 'ncs'>): { orders: string[]; ncs: string[] } {
  const orders = Object.keys(s.deliveries).filter(id => id.startsWith('dl_demo_') && !untouched(s.deliveries[id]));
  return { orders, ncs: Object.values(s.ncs).filter(n => n.id.startsWith('nc_demo_') && n.deliveryId?.startsWith('dl_demo_') && (orders.includes(n.deliveryId) || !untouchedNc(n))).map(n => n.id) };
}

// The button "Retirer l'exemple" of tool 3.4: the orders of the example nobody touched and the defects declared from them, found by their example ids and their content; an order or a defect of the
// company stays whatever it holds, so does one of the example that it worked on (`modifiedReceptionExamples`). It takes back what the example added to the company: the organisations and people
// of the directory the orders pointed at (example ids, unchanged since, cited by nothing that remains), and the clause of the settings while it is still the example's. Nothing left to remove:
// nothing changes.
export function removeReceptionExample(d: State): void {
  const kept = modifiedReceptionExamples(d), gone = Object.keys(d.deliveries).filter(id => id.startsWith('dl_demo_') && !kept.orders.includes(id)), cited = JSON.stringify(gone.map(id => d.deliveries[id]));
  Object.values(d.ncs).filter(n => n.id.startsWith('nc_demo_') && n.deliveryId?.startsWith('dl_demo_') && !kept.ncs.includes(n.id)).forEach(n => { delete d.ncs[n.id]; });
  gone.forEach(id => { delete d.deliveries[id]; });
  // the directory: the entries of the example that the removed orders cited, as the example gives them (the day of the check of a number aside), cited by nothing else
  const plain = (x: object) => canon({ ...x, verifiedAt: undefined }), day = new Date();
  const mine = (all: Record<string, Org | Contact>, from: (Org | Contact)[], prefix: string) => from.filter(x => x.id.startsWith(prefix) && cited.includes(`"${x.id}"`) && all[x.id] && plain(all[x.id]) === plain(x)).map(x => x.id);
  const orgs = mine(d.orgs, exampleOrgs(), 'org_demo_'), people = mine(d.contacts, exampleContacts(day), 'ct_demo_');
  const out = new Set([...orgs, ...people]), elsewhere = JSON.stringify({ ...d, orgs: {}, contacts: Object.fromEntries(Object.entries(d.contacts).filter(([id]) => !out.has(id))) });
  const free = (ids: string[]) => ids.filter(id => !elsewhere.includes(`"${id}"`));
  const [o, c] = [free(orgs), free(people)];
  if (o.length) d.orgs = Object.fromEntries(Object.entries(d.orgs).filter(([id]) => !o.includes(id)));
  if (c.length) d.contacts = Object.fromEntries(Object.entries(d.contacts).filter(([id]) => !c.includes(id)));
  if (d.params.reception && canon(d.params.reception) === canon(EXAMPLE_SETTINGS)) { const { reception: _clause, ...rest } = d.params; d.params = rest; }
}
