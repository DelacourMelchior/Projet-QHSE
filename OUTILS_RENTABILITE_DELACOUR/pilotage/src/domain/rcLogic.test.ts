// The logic of the screens of 3.4 that was shut in the files of the screens (rcLogic.ts): the filters of the register and the states each holds, the addresses, the search, the name of an order
// taken out of its task, the list, the counts, the customers, the reservations that came back. The register is also compared with the way the screen computed it before (a copy of the old code below).
import { describe, expect, it, vi } from 'vitest';
import type { Delivery, ReceptionTodo, ReceptionTodoKind, State } from './types';
import { DELIVERY_STATE, allReservesOf, deliveryState, isPostponed, openReserves, promisedOn, receptionsOf, type DeliveryState } from './receptions';
import { ord, parseFocus as parseFocusOfAll, receptionFocus, receptionSummary, receptionTodos, urgency } from './receptionsAll';
import { FILTERS, FILTER_KEYS, clientsOf, countBy, inFilter, listOf, matching, parseFocus, registerOf, reserveBacks, searchText, shortTask, type Filter } from './rcLogic';
import { orgKey, orgOf } from './contacts';
import { norm } from './text';
import { addDays } from './base';
import { isoDate } from './periods';
import { demoState } from './templates';

vi.setConfig({ testTimeout: 30_000 });   // the register of 100 orders is built and compared many times: the default of 5 s does not hold on a busy machine
const now = new Date(2026, 8, 25, 10, 0);   // Friday 25 September 2026

// The orders of the example, copied a few times (new numbers and ids, other customers: one of them written another way, an accent and a bracket), so that the register has something to sort and to count
const big = (): State => {
  const s = demoState(now), base = Object.values(s.deliveries);
  const clients = ['Société Martin', 'Établissements Léa (grand compte)', 'Client B', 'Société Martin (siège)', ''];
  for (let k = 1; k <= 4; k++) base.forEach((d, i) => {
    const c = structuredClone(d);
    c.id = `${d.id}_c${k}`; c.ref = `${d.ref}-${k}`; c.client = clients[(i + k) % clients.length];
    if (k === 3 && i % 3 === 0) c.archivedAt = '2026-09-20T10:00';
    s.deliveries[c.id] = c;
  });
  return s;
};

describe('the five filters of the register (T-17)', () => {
  it('every state of an order is in exactly one filter, and no filter holds a state that does not exist', () => {
    const states = Object.keys(DELIVERY_STATE) as DeliveryState[], held = FILTER_KEYS.flatMap(f => FILTERS[f]);
    expect([...held].sort()).toEqual([...states].sort());   // none lost, none twice, none unknown: a 13th state in DELIVERY_STATE makes this red
    expect(new Set(held).size).toBe(held.length);
  });
  it('"Réserves" holds the orders with a reservation open, whatever their state (an archived one too); the other filters hold their states', () => {
    const s = demoState(now), withRv = Object.values(s.deliveries).find(d => openReserves(d).length > 0)!, st = deliveryState(withRv, now, s.params);
    expect(inFilter(withRv, 'reserves', st)).toBe(true);
    expect(inFilter({ ...withRv, archivedAt: '2026-09-01T10:00' }, 'reserves', 'archived')).toBe(true);
    const plain = Object.values(s.deliveries).find(d => openReserves(d).length === 0 && deliveryState(d, now, s.params) === 'accepted')!;
    expect(inFilter(plain, 'reserves', 'accepted')).toBe(false);
    expect(inFilter(plain, 'received', 'accepted')).toBe(true);
    expect(inFilter(plain, 'running', 'accepted')).toBe(false);
  });
});

describe('the addresses of 3.4 (T-9, T-17): what the register reads is what the tasks write', () => {
  const todo = (kind: ReceptionTodoKind, over: Partial<ReceptionTodo> = {}): ReceptionTodo => ({ id: `x:dl_1:${kind}`, kind, text: 't', tone: 'warn', who: '', due: '', deliveryId: 'dl_1', ...over });
  // what each kind of task opens: the tab, the full screen, or the reservation (a table typed by kind: a 14th kind makes the compiler ask for its line)
  const OPENS: Record<ReceptionTodoKind, { todo: ReceptionTodo; focus: ReturnType<typeof parseFocus> }> = {
    milestone: { todo: todo('milestone'), focus: { kind: 'field', field: 'jalon', id: 'dl_1' } },
    blocked: { todo: todo('blocked'), focus: { kind: 'sheet', id: 'dl_1', tab: 'milestones', reserve: undefined } },
    defect: { todo: todo('defect'), focus: { kind: 'sheet', id: 'dl_1', tab: 'milestones', reserve: undefined } },
    release: { todo: todo('release'), focus: { kind: 'sheet', id: 'dl_1', tab: 'release', reserve: undefined } },
    ship: { todo: todo('ship'), focus: { kind: 'field', field: 'reception', id: 'dl_1' } },
    'late-delivery': { todo: todo('late-delivery'), focus: { kind: 'sheet', id: 'dl_1', tab: undefined, reserve: undefined } },
    unsigned: { todo: todo('unsigned'), focus: { kind: 'field', field: 'reception', id: 'dl_1' } },
    reserve: { todo: todo('reserve', { reserveId: 'rv_9' }), focus: { kind: 'sheet', id: 'dl_1', tab: 'reception', reserve: 'rv_9' } },
    'reserve-late': { todo: todo('reserve-late', { reserveId: 'rv_9' }), focus: { kind: 'sheet', id: 'dl_1', tab: 'reception', reserve: 'rv_9' } },
    refused: { todo: todo('refused'), focus: { kind: 'sheet', id: 'dl_1', tab: 'follow', reserve: undefined } },
    'next-lot': { todo: todo('next-lot'), focus: { kind: 'sheet', id: 'dl_1', tab: 'follow', reserve: undefined } },
    feedback: { todo: todo('feedback'), focus: { kind: 'sheet', id: 'dl_1', tab: 'follow', reserve: undefined } },
    seal: { todo: todo('seal'), focus: { kind: 'sheet', id: 'dl_1', tab: 'reception', reserve: undefined } },
  };
  it.each(Object.entries(OPENS))('the address of a task "%s" is read back as what it opens', (_k, { todo: t, focus }) => {
    const read = parseFocus(receptionFocus(t));
    if (t.kind === 'late-delivery') expect(read).toEqual({ kind: 'sheet', id: 'dl_1', tab: undefined, reserve: undefined });   // no tab: the sheet opens where it was
    else expect(read).toEqual(focus);
  });
  it('a task of a reservation without a reservation (a result "avec réserve" with none written), a defect of a reservation, a PV of a closed delivery, each open the right place', () => {
    expect(parseFocus(receptionFocus(todo('reserve')))).toEqual({ kind: 'sheet', id: 'dl_1', tab: 'reception', reserve: undefined });
    expect(parseFocus(receptionFocus(todo('defect', { reserveId: 'rv_2' })))).toEqual({ kind: 'sheet', id: 'dl_1', tab: 'reception', reserve: 'rv_2' });
    expect(parseFocus(receptionFocus(todo('seal', { id: 'sl:dl_1:lot2' })))).toEqual({ kind: 'sheet', id: 'dl_1', tab: 'follow', reserve: undefined });
  });
  it('the other addresses: a new order, a customer, an order made from a quote, the two full screens, a tab that does not exist, an id that is a word of the prototype', () => {
    expect(parseFocus('new')).toEqual({ kind: 'new' });
    expect(parseFocus('client:Société Martin')).toEqual({ kind: 'client', name: 'Société Martin' });
    expect(parseFocus('client:A:B')).toEqual({ kind: 'client', name: 'A:B' });   // a name keeps its colon
    expect(parseFocus('new:quote:q_12')).toEqual({ kind: 'quote', quoteId: 'q_12' });
    expect(parseFocus('jalon:dl_1')).toEqual({ kind: 'field', field: 'jalon', id: 'dl_1' });
    expect(parseFocus('reception:dl_1')).toEqual({ kind: 'field', field: 'reception', id: 'dl_1' });
    expect(parseFocus('dl_1:follow')).toEqual({ kind: 'sheet', id: 'dl_1', tab: 'follow', reserve: undefined });
    expect(parseFocus('dl_1:nowhere:rv_1')).toEqual({ kind: 'sheet', id: 'dl_1', tab: undefined, reserve: 'rv_1' });
    expect(parseFocus('constructor')).toEqual({ kind: 'sheet', id: 'constructor', tab: undefined, reserve: undefined });   // the register opens it only if the data holds it (Object.hasOwn)
    expect(parseFocus).toBe(parseFocusOfAll);   // one function, said where the addresses are written and where they are read
  });
  it('every task of the example opens an order that exists, with a tab or a reservation that exists', () => {
    const s = demoState(now);
    receptionTodos(s, now).forEach(t => {
      const f = parseFocus(receptionFocus(t));
      expect(['sheet', 'field'], t.id).toContain(f.kind);
      const id = f.kind === 'sheet' || f.kind === 'field' ? f.id : '';
      expect(Object.hasOwn(s.deliveries, id), t.id).toBe(true);
      if (f.kind === 'sheet' && f.reserve) expect(allReservesOf(s.deliveries[id]).some(r => r.id === f.reserve), t.id).toBe(true);
    });
  });
});

describe('what the search reads, and the name of an order in its task', () => {
  it('searchText reads the order, the customer, the deliverable, the traceability, the quote, the PV and delivery note numbers of every delivery, without accents or case', () => {
    const s = demoState(now), d = { ...Object.values(s.deliveries)[0], ref: 'CMD-77', client: 'Établissements Léa', item: 'Portillon', lot: 'LOT-9', serial: 'SN-5', material: 'Inox', template: 'Fabrication' } as Delivery;
    d.reception = { ...d.reception, pvNo: 'PV-2026-123', bl: 'BL-4' };
    d.lots = [{ ...d, id: 'lt1', no: 1, closedAt: '2026-09-01T10:00', reception: { ...d.reception, pvNo: 'PV-2026-099', bl: 'BL-3' } } as never];
    const t = searchText(d, s);
    ['cmd-77', 'etablissements lea', 'portillon', 'lot-9', 'sn-5', 'inox', 'fabrication', 'pv-2026-123', 'bl-4', 'pv-2026-099', 'bl-3'].forEach(w => expect(t, w).toContain(w));
    expect(t).toBe(t.toLowerCase());
    const q = Object.values(s.quotes)[0];
    expect(searchText({ ...d, quoteId: q.id }, s)).toContain(norm(q.ref));
    expect(searchText({ ...d, quoteId: 'constructor' }, s)).not.toContain('undefined');   // an id of the prototype is no quote
  });
  it('shortTask takes the name of the order out of its task, wherever the domain wrote it ("de X", ": X", " X"), and only that one', () => {
    const s = demoState(now), todos = receptionTodos(s, now), plain = (x: string) => x.replace(/[\u202f\u00a0]/g, ' ');
    const WRITTEN: [string, string, string][] = [   // [the name of the order, what the domain writes, what the card says]
      ['CMD-2026-047 (BâtiPro)', 'Lever la réserve « Retouche de peinture sur 2 marches » de CMD-2026-047 (BâtiPro), en retard de 11 jours', 'Lever la réserve « Retouche de peinture sur 2 marches », en retard de 11 jours'],
      ['CMD-2026-055 (Agencement Morel)', 'Livrer CMD-2026-055 (Agencement Morel) : promise le 23 sept., 2 jours de retard', 'Livrer : promise le 23 sept., 2 jours de retard'],
      ['CMD-2026-064 (Hôtel des Tilleuls)', 'Poser le bilan de fin (3 questions) : CMD-2026-064 (Hôtel des Tilleuls)', 'Poser le bilan de fin (3 questions)'],
      ['CMD-2026-066 (Maison Perrin)', 'Libérer CMD-2026-066 (Maison Perrin)', 'Libérer'],
    ];
    WRITTEN.forEach(([name, written, said]) => {
      const t = todos.find(x => plain(x.text) === written)!, d = s.deliveries[t.deliveryId];
      expect(t, written).toBeDefined();
      expect(ord(d)).toBe(name);   // the name the card looks for is the one the domain writes (one function: `ord`)
      expect(shortTask(t, d)).toBe(said);
    });
    todos.forEach(t => expect(plain(shortTask(t, s.deliveries[t.deliveryId])), t.id).not.toContain(ord(s.deliveries[t.deliveryId])));
    const t = todos.find(x => plain(x.text) === WRITTEN[3][1])!;
    expect(shortTask(t, { ...s.deliveries[t.deliveryId], ref: 'Autre-ref' })).toBe(plain(t.text));   // another name: nothing is taken out (and the spaces are the plain ones)
  });
});

// The way the screen computed the register before (Receptions.tsx, at each key): the reference the new one is compared with
const before = (s: State, f: Filter, client: string | undefined, q: string, nowD: Date) => {
  const all = Object.values(s.deliveries), todos = receptionSummary(s, nowD).todos, st = new Map(all.map(d => [d.id, deliveryState(d, nowD, s.params)] as const));
  const inF = (d: Delivery, g: Filter) => (g === 'reserves' ? openReserves(d).length > 0 : FILTERS[g].includes(st.get(d.id)!));
  const mine = (d: Delivery) => !client || orgKey(d.client) === client;
  const words = norm(q).split(/\s+/).filter(Boolean), found = (d: Delivery) => words.every(w => searchText(d, s).includes(w));
  const shown = all.filter(d => inF(d, f) && mine(d) && found(d)).sort((a, b) => urgency(todos, b.id) - urgency(todos, a.id) || (promisedOn(s, a) || '9').localeCompare(promisedOn(s, b) || '9') || a.ref.localeCompare(b.ref, 'fr', { numeric: true }));
  return { shown: shown.map(d => d.id), counts: Object.fromEntries((Object.keys(FILTERS) as Filter[]).map(g => [g, all.filter(d => inF(d, g) && mine(d)).length])) };
};

describe('the register, computed once (F-4, F-7, F-12)', () => {
  const s = big(), r = registerOf(s, now), keys = new Set(Object.values(s.deliveries).map(d => orgKey(d.client)).filter(Boolean));
  it('has many orders and several customers, and every filter holds something (so that the comparisons mean something)', () => {
    expect(r.all.length).toBeGreaterThan(50);
    expect(keys.size).toBeGreaterThanOrEqual(3);
    FILTER_KEYS.forEach(f => expect(countBy(r)[f], f).toBeGreaterThan(0));
  });
  it('the list of a filter, of a customer, of a search is the one the screen drew before, in the same order', () => {
    const cases: [Filter, string | undefined, string][] = [];
    FILTER_KEYS.forEach(f => { cases.push([f, undefined, '']); [...keys].forEach(k => cases.push([f, k, ''])); });
    cases.push(['running', undefined, 'cmd'], ['received', undefined, 'pv 2026'], ['running', undefined, 'LEA établ'], ['reserves', undefined, 'zzzz'], ['archived', undefined, 'portillon']);
    cases.forEach(([f, c, q]) => {
      const words = norm(q).split(/\s+/).filter(Boolean), was = before(s, f, c, q, now);
      expect(listOf(r, f, c, words).map(d => d.id), `${f} ${c} "${q}"`).toEqual(was.shown);
      expect(countBy(r, c), `${f} ${c} counts`).toEqual(was.counts);
    });
  });
  it('matching holds the same orders unsorted, and a word that is nowhere finds nothing', () => {
    expect(new Set(matching(r, 'running', undefined, []).map(d => d.id))).toEqual(new Set(listOf(r, 'running', undefined, []).map(d => d.id)));
    expect(matching(r, 'running', undefined, ['zzzz'])).toEqual([]);
  });
  it('gives every order its tasks in the order of the queue, and its score of urgency (10 per red task, 1 per amber one) in one pass', () => {
    const todos = receptionSummary(s, now).todos;
    expect([...r.mine.values()].flat().length).toBe(todos.length);
    r.mine.forEach((l, id) => { expect(l.every(t => t.deliveryId === id)).toBe(true); expect(l).toEqual(todos.filter(t => t.deliveryId === id)); });
    r.all.forEach(d => expect(r.urgency.get(d.id) ?? 0, d.id).toBe(urgency(todos, d.id)));
  });
  // the way the screen grouped the customers before
  const wasClients = (t: State) => {
    const groups = new Map<string, { name: string; orders: Delivery[] }>(), all = Object.values(t.deliveries);
    all.filter(d => orgKey(d.client)).forEach(d => { const g = groups.get(orgKey(d.client)) ?? { name: d.client.trim(), orders: [] }; g.orders.push(d); groups.set(orgKey(d.client), g); });
    return [...groups].map(([key, g]) => {
      const rs = g.orders.flatMap(d => receptionsOf(d)).map(x => x.reception).filter(x => (x.result === 'sans' || x.result === 'reserve') && !isPostponed({ reception: x }));
      return { key, name: g.name, orders: g.orders.length, got: rs.length, clean: rs.filter(x => x.result === 'sans').length, org: orgOf(t, g.name) };
    }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  };
  it('the customers are grouped as the screen grouped them, with their organisation of the directory found by its key', () => {
    const now2 = clientsOf(r);
    expect(now2).toEqual(wasClients(s));
    expect(now2.some(c => c.org), 'one customer is in the directory').toBe(true);
    expect(now2.some(c => !c.org), 'one is not').toBe(true);
    expect(now2.map(c => c.key).includes(''), 'an order without customer is in no group').toBe(false);
  });
  it('a reception put off by a blocking reservation is not counted among the receptions of the customer (as everywhere)', () => {
    const t = big(), d = Object.values(t.deliveries).find(x => x.reception.result === 'reserve' && x.client.trim() && openReserves(x).length > 0 && !x.lots?.length)!;
    const before = clientsOf(registerOf(t, now)).find(c => c.key === orgKey(d.client))!;
    t.deliveries[d.id] = { ...d, reception: { ...d.reception, reserves: d.reception.reserves!.map(x => ({ ...x, severity: 'blocking' as const, liftedAt: undefined })) } };
    const after = clientsOf(registerOf(t, now));
    expect(after.find(c => c.key === orgKey(d.client))!.got).toBe(before.got - 1);
    expect(after).toEqual(wasClients(t));
  });
  it('the organisation of the directory is the first that has the key (two with the same key: the first one)', () => {
    const t = structuredClone(s), first = Object.values(t.orgs ?? {}).find(o => orgKey(o.name))!;
    t.orgs = { ...t.orgs, org_dup: { ...first, id: 'org_dup' } };
    const c = clientsOf(registerOf(t, now)).find(x => x.key === orgKey(first.name));
    if (c) expect(c.org?.id).toBe(first.id);
  });
});

describe('the reservations that came back on several orders (F-9)', () => {
  // the way the sheet counted them before: for each reservation, a scan of every order
  const was = (s: State, text: string, raisedAt: string, nowD: Date) => {
    const key = norm(text), from = addDays(isoDate(nowD), -365);
    return !key || raisedAt < from ? 0 : Object.values(s.deliveries).filter(x => allReservesOf(x).some(y => norm(y.text) === key && y.raisedAt >= from)).length;
  };
  it('counts the orders that hold the same text within 12 months, as the scan did, for every reservation of the example (and for texts typed otherwise)', () => {
    const s = big(), backs = reserveBacks(s, now), reserves = Object.values(s.deliveries).flatMap(d => allReservesOf(d));
    expect(reserves.length).toBeGreaterThan(5);
    expect(reserves.some(r => backs(r) >= 2), 'some reservation did come back').toBe(true);
    reserves.forEach(r => expect(backs(r), r.text).toBe(was(s, r.text, r.raisedAt, now)));
    const r0 = reserves.find(r => r.text.trim())!;
    expect(backs({ ...r0, text: r0.text.toUpperCase() })).toBe(was(s, r0.text.toUpperCase(), r0.raisedAt, now));   // the case and the accents do not count
    expect(backs({ ...r0, text: '' })).toBe(0);
    expect(backs({ ...r0, raisedAt: '2020-01-01' })).toBe(0);   // older than 12 months: not counted
  });
  it('an order counts once however many of its deliveries hold the text', () => {
    const s = demoState(now), d = Object.values(s.deliveries).find(x => allReservesOf(x).length > 0)!, rv = allReservesOf(d)[0];
    const two = { ...d, id: 'dl_twice', lots: [...(d.lots ?? []), { ...d, id: 'lt_x', no: (d.lots?.length ?? 0) + 1, closedAt: '2026-09-01T10:00' } as never] };
    s.deliveries[two.id] = two;
    expect(reserveBacks(s, now)(rv)).toBe(was(s, rv.text, rv.raisedAt, now));
  });
});
