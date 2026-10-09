// Tool 3.4 as a whole: what is left to do on the orders, the facts and the figures of the screen, put together from the rules of receptions.ts.
// The text of a task of the "À faire" queue is an infinitive (a thing to do); the messages of the summary state facts (who, how many, since when) and give
// no order. No amount is read. The review of the end (2.4) is listed here for the queue of the tool; "Mes tâches" (tasks.ts) lists it itself, from the
// same source, and leaves it out of the tasks of this tool (as the defects, which the red bin 5.1 lists).
import type { Delivery, Level, Milestone, Nc, Params, Presentation, Quote, ReceptionTodo, ReceptionTodoKind, State } from './types';
import { addDays, nb, type Insight } from './base';
import { isoDate } from './periods';
import { norm } from './text';
import { deliveriesToAsk, isAbsent } from './commercial';
import { DECISION_HOURS } from './quality';
import {
  DELIVERY_STATE, OTHER, afterDays, allReservesOf, counted, currentState, daysLate, deliveryState, frQty, isLocked, lotsOf, mayRelease, ncOf, openReserves, presentationNo, promisedOn, pvSigned, qtyReceived, receptionCfg,
  idOf as mid, lc, lotSealState, plural, rcDay, releasedAfterDelivery, remainingQty, reserveDue, reserveLateDays, reservesOf, reserveWords, retentionFact, sealState, RC_TABS, type DeliveryState, type RcTab,
} from './receptions';
import { receptionsBetween } from './receptionsFeeds';
import { pvCarriers, pvDuplicates } from './receptionsMerge';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(' ; ') + (xs.length > 3 ? ` et ${plural(xs.length - 3, 'autre')}` : '');
// The order as the text of a task names it (the card of the register finds this name again to leave it out of the task: `shortTask`, rcLogic.ts)
export const ord = (d: Delivery) => `${d.ref.trim() || d.item.trim() || 'commande sans nom'}${d.client.trim() ? ` (${d.client.trim()})` : ''}`;
const jalon = (m: Milestone, i: number) => `jalon ${i + 1}${m.label.trim() ? ` « ${m.label.trim()} »` : ''}`;
const since = (at: string, now: Date) => (at ? ` depuis le ${rcDay(at, now)}` : '');
const undecided = (n: Nc) => !n.decision || n.decision === 'attente';   // same rule as canRelease
const got = (d: Pick<Presentation, 'reception'>) => d.reception.result === 'sans' || d.reception.result === 'reserve';
const taken = (d: Delivery) => counted(d.reception);   // received and not put off by a blocking reservation: what is left to deliver is said for these only
// a reservation in a sentence: its words between quotes; one made of a photo alone says so ("la réserve sans texte (photo seule)"), it is not quoted
const txt = (r: { text: string }) => reserveWords(r.text);
const reason = (d: Delivery) => { const f = d.reception.refusal; return f ? (f.reason === OTHER ? f.other?.trim() || OTHER : f.reason) : ''; };
// Days past a promised day, as the company calendar counts them (working days, a day off is due the next working day), 0 when not due yet
const overdue = (day: string | undefined, today: string, p: Params) => (day ? daysLate(day, today, p) : 0);
// Not delivered yet: still to check, to release or released
const BEFORE: DeliveryState[] = ['in_progress', 'blocked', 'to_release', 'released'];
// Days since a delivery whose PV carries no signature, once the delay of the settings is over (null otherwise)
const unsigned = (x: Presentation, today: string, days: number, p: Params): number | null => {
  const n = x.reception.date && !pvSigned(x) ? daysLate(x.reception.date, today, p) : -1;
  return n >= days ? n : null;
};
// The PV never signed of an order: the one of the delivery under way, whatever its result, and those of the closed deliveries that were received without a signature nor a waiver (an old record:
// a closed delivery is frozen and can no longer be signed; the task and the fact say it as long as it stays so)
const unsignedPvs = (d: Delivery, today: string, days: number, p: Params) =>
  [...lotsOf(d).filter(l => got(l) && !l.reception.signWaiver).map(l => ({ x: l as Presentation, no: l.no, now: false })), { x: d as Presentation, no: presentationNo(d), now: true }]
    .flatMap(y => { const n = unsigned(y.x, today, days, p); return n === null ? [] : [{ ...y, n }]; });
// The PVs of an order whose content no longer matches the seal laid at their signature: the delivery under way and each closed one (an archived order too: the proof is not a step of the flow).
// `pv` is how the PV is named (its number, else "PV" or "PV de la livraison 2" once the order has several). Hashing a signed order is the cost of this fact (about 0.1 ms each, measured on
// the example: 14 orders, 9 signed, 3.7 ms for all the tasks); nothing is kept between two calls, so a record changed in place is always read as it is.
type SealedPv = { no: number; pv: string; now: boolean };
function modifiedPvs(d: Delivery): SealedPv[] {
  const several = lotsOf(d).length > 0, pv = (no: number, n?: string) => n?.trim() || (several ? `PV de la livraison ${no}` : 'PV');
  return [
    ...lotsOf(d).filter(l => lotSealState(d, l.no) === 'modified').map(l => ({ no: l.no, pv: pv(l.no, l.reception.pvNo), now: false })),
    ...(isLocked(d) && sealState(d) === 'modified' ? [{ no: presentationNo(d), pv: pv(presentationNo(d), d.reception.pvNo), now: true }] : []),
  ];
}
// The numbers missing between the lowest and the highest PV number of a year, in order ("PV-2026-003"): a number is never given twice, so a hole is a PV deleted, or one that another computer
// holds and that this one has not received. The numbers before the first one present are not holes (the company may have started the year, or the tool, at that number).
export function pvGaps(ds: Delivery[]): string[] {
  const years = new Map<string, number[]>();
  for (const no of pvCarriers(ds).keys()) { const [, y, n] = no.match(/^PV-(\d{4})-(\d+)$/)!; years.set(y, [...(years.get(y) ?? []), +n]); }
  return [...years].sort(([a], [b]) => a.localeCompare(b)).flatMap(([y, ns]) => {
    const have = new Set(ns), lo = Math.min(...ns), hi = Math.max(...ns);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(n => !have.has(n)).map(n => `PV-${y}-${String(n).padStart(3, '0')}`);
  });
}
// Who does a task of an order that day: `first` (who took it in charge) or else the first person of its team who is there (not on planned leave, still in the staff list of 4.x), nobody when none is
const away = (s: Pick<State, 'people'>, name: string, day: string) => isAbsent(s, name, day) || Object.values(s.people || {}).some(x => !x.active && x.name.trim().toLowerCase() === name.trim().toLowerCase());
export const whoOf = (s: Pick<State, 'people'>, d: Pick<Delivery, 'team'>, day: string, first = ''): string => [first, ...(d.team ?? [])].map(n => n.trim()).find(n => n && !away(s, n, day)) ?? '';
// One id per fact, never the kind of the task: a reservation that becomes late is the same task (the same event of a calendar)
const FACT: Record<ReceptionTodoKind, string> = { milestone: 'jl', blocked: 'jl', defect: 'df', release: 'lb', ship: 'lv', 'late-delivery': 'lv', unsigned: 'pv', reserve: 'rv', 'reserve-late': 'rv', refused: 'rf', 'next-lot': 'rs', feedback: 'bl', seal: 'sl' };

// Most pressing first (a PV that no longer matches its seal, then red before amber), then by due date (the ones without a date last).
// An archived order says nothing but its open reservations: the lift in the delay agreed is a commitment that archiving does not end.
export function receptionTodos(s: State, now: Date): ReceptionTodo[] {
  const out: ReceptionTodo[] = [], today = isoDate(now), p = s.params, cfg = receptionCfg(p), ask = new Set(deliveriesToAsk(s, now).map(d => d.id));
  Object.values(s.deliveries).forEach(d => {
    const st = currentState(d, now, p), name = ord(d), re = d.reception, promised = promisedOn(s, d), pre = !d.releasedAt && !re.date;
    const add = (kind: ReceptionTodoKind, tone: 'bad' | 'warn', text: string, due: string, x: { milestoneId?: string; reserveId?: string; who?: string; part?: string } = {}) => {
      const { who = whoOf(s, d, today), part, ...ids } = x;
      out.push({ id: [FACT[kind], d.id, ids.milestoneId ?? ids.reserveId ?? part].filter(Boolean).join(':'), kind, text: nb(text), tone, who, due, deliveryId: d.id, ...ids });
    };
    // the reservations of every delivery of the order, the closed ones included (the number of the delivery is said once the order has several)
    const reserves = () => openReserves(d).forEach(r => {
      const late = reserveLateDays(r, d, p, now), n = ncOf(s, r.ncId), due = reserveDue(r, d, p), where = `${name}${lotsOf(d).length ? `, livraison ${r.lotNo}` : ''}`;
      const who = whoOf(s, d, today, r.handler);
      add(late ? 'reserve-late' : 'reserve', late ? 'bad' : 'warn', `Lever la réserve ${txt(r)} de ${where}${late ? `, en retard de ${plural(late, 'jour')}` : ''}`, due, { reserveId: r.id, who });
      if (n && undecided(n) && !d.archivedAt) add('defect', 'warn', `Décider du défaut ${n.ref} lié à la réserve ${txt(r)} de ${where}`, addDays(n.at.slice(0, 10), Math.ceil(DECISION_HOURS / 24)), { reserveId: r.id, who });
    });
    // a PV whose content no longer matches its seal comes first, archived order or not: nothing else is told of an archived order, the proof is
    modifiedPvs(d).forEach(y => add('seal', 'bad', `Vérifier le ${y.pv} de ${name} : son contenu ne correspond plus au scellé`, today, y.now ? {} : { part: `lot${y.no}` }));
    if (d.archivedAt) return reserves();
    // milestones: a defect without decision, a milestone not conform (with or without its defect), the next one to check
    d.milestones.forEach((m, i) => {
      if (!pre || m.na) return;
      const n = ncOf(s, m.ncId), ko = m.ok === false && !m.waivedBy;
      if (n && undecided(n)) add('defect', ko ? 'bad' : 'warn', `Décider du défaut ${n.ref} lié au ${jalon(m, i)} de ${name}`, addDays(n.at.slice(0, 10), Math.ceil(DECISION_HOURS / 24)), { milestoneId: mid(m, i) });
      else if (ko) add('blocked', 'bad', n ? `Recontrôler le ${jalon(m, i)} de ${name} après la décision du défaut ${n.ref}` : `Traiter le ${jalon(m, i)} de ${name}, non conforme${since(m.date, now)} : défaut à déclarer ou reprise`, m.date || today, { milestoneId: mid(m, i) });
    });
    const next = st === 'in_progress' ? d.milestones.findIndex(m => !m.na && m.ok == null) : -1;
    if (next >= 0) add('milestone', 'warn', `Contrôler le ${jalon(d.milestones[next], next)} de ${name}`, promised, { milestoneId: mid(d.milestones[next], next) });
    // release and delivery: a late delivery is said once, whatever the step the order is at
    if (st === 'to_release') add('release', 'warn', `Libérer ${name}`, promised);
    else if (re.date && !d.releasedAt && !isLocked(d)) add('release', 'warn', `Enregistrer la libération de ${name} : livrée le ${rcDay(re.date, now)} sans libération enregistrée`, re.date);   // delivered without release: the central rule of the tool
    const days = BEFORE.includes(st) ? overdue(promised, today, p) : 0;
    if (days) add('late-delivery', 'bad', `Livrer ${name} : promise le ${rcDay(promised, now)}, ${plural(days, 'jour')} de retard`, promised);
    else if (st === 'released') add('ship', 'warn', `Livrer ${name}`, promised);
    // PV and reservations
    unsignedPvs(d, today, cfg.unsignedDays, p).forEach(y => add('unsigned', 'warn', !y.now ? `Faire signer le PV de ${name}, livraison ${y.no}` : re.result ? `Faire signer le PV de ${name}` : `Terminer la réception de ${name} : résultat et signature du client`,
      afterDays(y.x.reception.date, cfg.unsignedDays, p), y.now ? {} : { part: `lot${y.no}` }));
    reserves();
    if (re.result === 'reserve' && !reservesOf(d).length) add('reserve', 'warn', `Décrire la réserve de ${name}`, '');
    // refusal, rest to deliver, review of the end
    if (st === 'refused') { const f = re.refusal, nx = f ? (f.next === OTHER ? f.nextOther?.trim() || OTHER : lc(f.next)) : ''; add('refused', 'bad', `Donner suite à la réception refusée de ${name}${nx ? ` : ${nx}` : ''}`, re.date || today); }
    const rest = remainingQty(d);
    if (taken(d) && rest) add('next-lot', overdue(promised, today, p) ? 'bad' : 'warn', `Livrer le reste de ${name} : ${frQty(rest)} à livrer`, promised);
    if (ask.has(d.id)) add('feedback', 'warn', `Poser le bilan de fin (3 questions) : ${name}`, re.date);
  });
  const first = (t: ReceptionTodo) => (t.kind === 'seal' ? 0 : 1);   // a PV whose content no longer matches its seal is the first thing the queue says
  return out.sort((a, b) => first(a) - first(b) || (a.tone === b.tone ? 0 : a.tone === 'bad' ? -1 : 1) || (a.due || '9').localeCompare(b.due || '9') || a.text.localeCompare(b.text));
}

// What a task opens in tool 3.4: the milestones or the reception (at the customer's) full screen, the sheet on the right tab; a task of a reservation adds its id
// (`<id>:reception:<reserveId>`): the sheet scrolls to that reservation and marks it
export function receptionFocus(t: ReceptionTodo): string {
  const id = t.deliveryId, rv = t.reserveId ? `${id}:reception:${t.reserveId}` : `${id}:reception`;
  switch (t.kind) {
    case 'milestone': return `jalon:${id}`;
    case 'blocked': return `${id}:milestones`;
    case 'defect': return t.reserveId ? rv : `${id}:milestones`;
    case 'release': return `${id}:release`;
    case 'unsigned': case 'ship': return `reception:${id}`;
    case 'reserve': case 'reserve-late': return rv;   // "Décrire la réserve" has no reservation yet: the tab only
    case 'refused': case 'next-lot': case 'feedback': return `${id}:follow`;
    case 'seal': return `${id}:${t.id.includes(':lot') ? 'follow' : 'reception'}`;   // the sheet says it above its tabs; the PV under way is on the reception tab, a closed delivery on the follow-up tab
    default: return id;
  }
}

// What an address of 3.4 asks for (the one `receptionFocus` writes, a QR code of the printed sheet, a link of another tool): a new order, the orders of a customer, an order made from a quote,
// the checks or the reception full screen, or the sheet of an order on a tab (and on a reservation). Read by the register; `parseFocus(receptionFocus(t))` gives back the order of the task.
export type Focus =
  | { kind: 'new' } | { kind: 'client'; name: string } | { kind: 'quote'; quoteId: string }
  | { kind: 'field'; field: 'jalon' | 'reception'; id: string } | { kind: 'sheet'; id: string; tab?: RcTab; reserve?: string };
export function parseFocus(f: string): Focus {
  const m = f.match(/^(jalon|reception):(.+)$/);
  if (f === 'new') return { kind: 'new' };
  if (f.startsWith('client:')) return { kind: 'client', name: f.slice(7) };
  if (f.startsWith('new:quote:')) return { kind: 'quote', quoteId: f.slice(10) };
  if (m) return { kind: 'field', field: m[1] as 'jalon' | 'reception', id: m[2] };
  const [id, tab, reserve] = f.split(':');
  return { kind: 'sheet', id, tab: RC_TABS.find(t => t === tab), reserve };
}

// Facts, never an order; what the tiles of the screen already count (the number of orders by state) is not repeated
export function receptionInsights(s: State, now: Date): Insight[] {
  const out: Insight[] = [], today = isoDate(now), p = s.params, cfg = receptionCfg(p), all = Object.values(s.deliveries), ds = all.filter(d => !d.archivedAt);
  const states = ds.map(d => ({ d, st: currentState(d, now, p) }));
  const altered = all.flatMap(d => modifiedPvs(d).map(y => ({ d, ...y })));
  if (altered.length) out.push({ key: 'seal-modified', tone: 'bad', title: 'PV au scellé modifié', text: `${names(altered, x => `${ord(x.d)} : le contenu du ${x.pv} ne correspond plus à son scellé`)}.` });
  const twice = pvDuplicates(all), holes = pvGaps(all);
  if (twice.length) out.push({ key: 'pv-duplicate', tone: 'bad', title: 'Numéro de PV porté deux fois', text: `${names(twice, x => `${x.no} : ${((l: string[]) => [l.slice(0, -1).join(' ; '), l.at(-1)].filter(Boolean).join(' et '))(x.carriers.map(c => `${ord(c.d)}${lotsOf(c.d).length ? `, livraison ${c.no}` : ''}`))}`)}.` });
  if (holes.length) out.push({ key: 'pv-gap', tone: 'warn', title: 'Numéro de PV absent de la suite', text: `${holes.slice(0, 3).join(', ')}${holes.length > 3 ? ` et ${plural(holes.length - 3, 'autre')}` : ''} ${holes.length >= 2 ? 'sont absents' : 'est absent'} de la suite des numéros.` });
  const blocked = states.filter(x => x.st === 'blocked').flatMap(x => { const i = x.d.milestones.findIndex(m => !m.na && m.ok === false && !m.waivedBy); return i < 0 ? [] : [{ d: x.d, m: x.d.milestones[i], i }]; });
  if (blocked.length) out.push({ key: 'blocked', tone: 'bad', title: 'Jalon non conforme', text: `${names(blocked, x => `${ord(x.d)} : ${jalon(x.m, x.i)} non conforme${since(x.m.date, now)}`)}.` });
  const late = states.filter(x => BEFORE.includes(x.st) && overdue(promisedOn(s, x.d), today, p)).map(x => ({ d: x.d, on: promisedOn(s, x.d), n: overdue(promisedOn(s, x.d), today, p) }));
  if (late.length) out.push({ key: 'late-delivery', tone: 'bad', title: 'Livraison en retard', text: `${names(late, x => `${ord(x.d)} : promise le ${rcDay(x.on, now)}, ${plural(x.n, 'jour')} de retard`)}.` });
  const lateRv = all.flatMap(d => openReserves(d).map(r => ({ d, r, n: reserveLateDays(r, d, p, now) }))).filter(x => x.n > 0);   // an archived order keeps its open reservations followed
  if (lateRv.length) out.push({ key: 'reserve-late', tone: 'bad', title: 'Réserves en retard', text: `${names(lateRv, x => `${ord(x.d)} : ${x.r.text.trim() ? '' : 'réserve '}${txt(x.r)} à lever pour le ${rcDay(reserveDue(x.r, x.d, p), now)}, ${plural(x.n, 'jour')} de retard`)}.` });
  const refused = states.filter(x => x.st === 'refused');
  if (refused.length) out.push({ key: 'refused', tone: 'bad', title: 'Réception refusée', text: `${names(refused, x => `${ord(x.d)} : refusée${x.d.reception.date ? ` le ${rcDay(x.d.reception.date, now)}` : ''}${reason(x.d) ? ` (motif : ${reason(x.d)})` : ''}`)}.` });
  const unsignedPv = ds.flatMap(d => unsignedPvs(d, today, cfg.unsignedDays, p).map(y => ({ d, ...y })));
  if (unsignedPv.length) out.push({ key: 'unsigned', tone: 'warn', title: 'PV sans signature', text: `${names(unsignedPv, x => `${ord(x.d)}${x.now ? '' : `, livraison ${x.no}`} : livrée le ${rcDay(x.x.reception.date, now)}, ${plural(x.n, 'jour')} sans signature`)}.` });
  const rest = ds.filter(d => taken(d) && remainingQty(d)).map(d => ({ d, n: remainingQty(d)! }));
  if (rest.length) out.push({ key: 'rest', tone: 'warn', title: 'Reste à livrer', text: `${names(rest, x => `${ord(x.d)} : ${frQty(x.n)} sur ${frQty(x.d.qty!)} ${x.n >= 2 ? 'restent' : 'reste'} à livrer`)}.` });
  // more received than ordered: a fact, nothing is blocked
  const over = ds.filter(d => d.qty != null && qtyReceived(d) > d.qty).map(d => ({ d, got: qtyReceived(d), qty: d.qty! }));
  if (over.length) out.push({ key: 'over', tone: 'warn', title: 'Reçu au-dessus de la commande', text: `${names(over, x => `${ord(x.d)} : ${frQty(x.got)} ${x.got >= 2 ? 'reçues' : 'reçue'} pour ${frQty(x.qty)} ${x.qty >= 2 ? 'commandées' : 'commandée'}`)}.` });
  // the release before the delivery (8.6): a delivery with no release recorded, a release recorded after the delivery (the current delivery and each closed one)
  const sent = ds.flatMap(d => [...lotsOf(d), d].filter(x => x.reception.date).map(x => ({ d, x })));
  const noRelease = sent.filter(y => !y.x.releasedAt), lateRelease = sent.filter(y => releasedAfterDelivery(y.x));
  if (noRelease.length) out.push({ key: 'delivered-unreleased', tone: 'bad', title: 'Livraison sans libération', text: `${names(noRelease, y => `${ord(y.d)} : livrée le ${rcDay(y.x.reception.date, now)} sans libération enregistrée`)}.` });
  if (lateRelease.length) out.push({ key: 'released-late', tone: 'warn', title: 'Libération après la livraison', text: `${names(lateRelease, y => `${ord(y.d)} : libérée le ${rcDay(y.x.releasedAt, now)} après la livraison du ${rcDay(y.x.reception.date, now)}`)}.` });
  const held = ds.filter(d => retentionFact(d, p));
  if (held.length) out.push({ key: 'retention', tone: 'warn', title: 'Retenue au-dessus de la clause', text: `${names(held, d => `${ord(d)} : ${retentionFact(d, p)}`)}.` });
  const waived = ds.filter(d => d.derogation && !got(d));
  if (waived.length) out.push({ key: 'derogation', tone: 'warn', title: 'Libération par dérogation', text: `${names(waived, d => `${ord(d)} : libérée le ${rcDay(d.releasedAt, now)} par ${d.derogation!.by} (${d.derogation!.why})`)}.` });
  const outside = ds.filter(d => d.releasedBy.trim() && !got(d) && !mayRelease(p, d.releasedBy));
  if (outside.length) out.push({ key: 'releaser', tone: 'warn', title: 'Libération hors de la liste', text: `${names(outside, d => `${ord(d)} : libérée par ${d.releasedBy}, absent de la liste des personnes qui libèrent`)}.` });
  // the same reservation text on two orders within 12 months
  const from = addDays(today, -365), seen = new Map<string, { text: string; orders: Map<string, Delivery> }>();
  all.forEach(d => allReservesOf(d).filter(r => r.text.trim() && r.raisedAt >= from).forEach(r => {
    const g = seen.get(norm(r.text)) ?? { text: r.text.trim(), orders: new Map() };
    seen.set(norm(r.text), g); g.orders.set(d.id, d);
  }));
  const again = [...seen.values()].filter(g => g.orders.size > 1);
  if (again.length) out.push({ key: 'repeat-reserve', tone: 'warn', title: 'Même réserve revenue', text: `${names(again, g => `« ${g.text} » sur ${g.orders.size} commandes en 12 mois (${[...g.orders.values()].map(d => d.ref.trim() || d.item.trim() || d.id).join(', ')})`)}.` });
  // a day ends with its own point ("18 sept."): the sentence does not add another
  return out.map(i => ({ ...i, title: nb(i.title), text: nb(i.text.replace(/\.\.$/, '.')) })).sort((a, b) => ({ bad: 0, warn: 1, good: 2 }[a.tone] - { bad: 0, warn: 1, good: 2 }[b.tone]));
}

interface ReceptionSummary {
  todos: ReceptionTodo[]; insights: Insight[];
  counts: Record<DeliveryState, number>;   // every order, archived included
  sansReservePct: number | null;           // receptions pronounced without reservation, over the last 12 months
  received: number;                        // receptions pronounced (without or with reservation) over the last 12 months
  cleanCount: number; receivedCount: number;   // the same two numbers as whole numbers (the pronounced without reservation, all the pronounced): the tile "X sur N" reads them, never the rounded percentage
  openReserves: number; lateReserves: number; inProgress: number; blockedCount: number;
}
export function receptionSummary(s: State, now: Date): ReceptionSummary {
  const p = s.params, ds = Object.values(s.deliveries), counts = Object.fromEntries(Object.keys(DELIVERY_STATE).map(k => [k, 0])) as Record<DeliveryState, number>;
  ds.forEach(d => { counts[deliveryState(d, now, p)]++; });
  const here = ds.map(d => currentState(d, now, p));   // the delivery under way: what the alerts, the tasks and the badge read (the order keeps its own state, with the reservations of the closed deliveries, for the cards and the filters)
  const open = ds.flatMap(d => openReserves(d).map(r => reserveLateDays(r, d, p, now)));   // every order, archived included: its open reservations are still followed
  const rs = receptionsBetween(s, addDays(isoDate(now), -365), '9999-12-31');
  return {
    todos: receptionTodos(s, now), insights: receptionInsights(s, now), counts, sansReservePct: rs.length ? Math.round(rs.filter(r => r.result === 'sans').length / rs.length * 100) : null,
    received: rs.length, cleanCount: rs.filter(r => r.result === 'sans').length, receivedCount: rs.length, openReserves: open.length, lateReserves: open.filter(n => n > 0).length, inProgress: here.filter(x => x === 'in_progress').length, blockedCount: here.filter(x => x === 'blocked').length,
  };
}

// Won quotes that no order follows (the order is created from the quote in one tap), most recent decision first: only those of the last 12 months, and not the ones the company set aside ("Pas de suivi")
export function quotesWithoutOrder(s: State, now = new Date()): Quote[] {
  const linked = new Set(Object.values(s.deliveries).map(d => d.quoteId)), skipped = new Set(s.params.reception?.skippedQuotes ?? []), from = addDays(isoDate(now), -365);
  return Object.values(s.quotes).filter(q => q.status === 'won' && !linked.has(q.id) && !skipped.has(q.id) && (q.decidedAt || q.date) >= from).sort((a, b) => (b.decidedAt || b.date).localeCompare(a.decidedAt || a.date));
}

// Level of a card: archived is set aside; what is late or refused is red; a PV or a reservation to deal with is amber (the normal course of an order,
// a milestone to check or a delivery to make, does not colour it); otherwise the state of the order says it.
const FLOW: ReceptionTodoKind[] = ['milestone', 'ship', 'feedback'];
const TOP: ReceptionTodoKind[] = ['seal', 'refused', 'blocked', 'defect', 'late-delivery', 'reserve-late', 'unsigned', 'reserve', 'next-lot', 'release'];
const KIND_LABEL: Partial<Record<ReceptionTodoKind, string>> = {
  seal: 'Scellé modifié', refused: 'Refusée', blocked: 'Jalon non conforme', defect: 'Défaut sans décision', 'late-delivery': 'Livraison en retard', 'reserve-late': 'Réserves en retard', unsigned: 'PV à faire signer',
  reserve: 'Réserves à lever', 'next-lot': 'Reste à livrer', release: 'À libérer',
};
export function deliveryLevel(d: Delivery, todos: ReceptionTodo[], p?: Params, now = new Date()): { level: Level; label: string } {
  if (d.archivedAt) return { level: 'pending', label: 'Archivée' };
  const rank = (t: ReceptionTodo) => (t.tone === 'bad' ? 0 : 100) + TOP.indexOf(t.kind);
  const top = todos.filter(t => t.deliveryId === d.id && !FLOW.includes(t.kind)).sort((a, b) => rank(a) - rank(b))[0];
  if (top) return { level: top.tone === 'bad' ? 'alert' : 'warn', label: KIND_LABEL[top.kind] ?? DELIVERY_STATE[deliveryState(d, now, p)].label };
  const st = DELIVERY_STATE[deliveryState(d, now, p)];
  return { level: st.tone, label: st.label };
}
// 10 per task in red, 1 per task in amber: orders the cards, most pressing first
export const urgency = (todos: ReceptionTodo[], id: string): number => todos.filter(t => t.deliveryId === id).reduce((n, t) => n + (t.tone === 'bad' ? 10 : 1), 0);
// The same score for every order in one pass over the tasks (a sort that asks `urgency` at each comparison reads all the tasks each time)
export function urgencies(todos: ReceptionTodo[]): Map<string, number> {
  const out = new Map<string, number>();
  todos.forEach(t => out.set(t.deliveryId, (out.get(t.deliveryId) ?? 0) + (t.tone === 'bad' ? 10 : 1)));
  return out;
}
