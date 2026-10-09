// F-1 / S-21: a gesture copies what it touches and shares the rest; the result is the one the whole copy gave (differential test on mutators of every shape).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { State } from '../domain/types';
import { newDelivery } from '../domain/receptions';
import { demoState } from '../domain/templates';
import { logChanges } from './flat';
import { produce } from './draft';

const NOW = new Date(2026, 9, 6, 10, 0);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

// what `update` did before: a deep copy of everything, then the diff of everything
const whole = (prev: State, fn: (d: State) => void, by = 'Test') => { const next = structuredClone(prev); fn(next); logChanges(prev, next, by); return next; };
// the journal without the random part of its keys
const lines = (s: State) => Object.values(s.logs).map(({ id: _i, ...l }) => JSON.stringify(l)).sort();

// the state as a text, without its journal (compared apart) and without the counter of the PV numbers (raised by a change; a state that is not changed is not touched)
const strip = (s: State) => { const j = JSON.parse(JSON.stringify(s)); delete j.logs; delete j.params.reception?.pvCounter; return j; };

const ID = 'dl_demo_3', OTHER = 'dl_demo_4';
const base = () => demoState(NOW);

const NEW = { ...newDelivery(), id: 'dl_new', ref: 'CMD-NEW', client: 'Client' };
const MUTATORS: Record<string, (d: State) => void> = {
  'a field of an order': d => { d.deliveries[ID].item = 'Lot corrigé'; },
  'a journal line pushed in an order': d => { d.deliveries[ID].journal = [...(d.deliveries[ID].journal ?? []), { at: '2026-10-06T10:00', by: 'x', text: 'ligne' }]; },
  'an order replaced by a new object': d => { d.deliveries[ID] = { ...d.deliveries[ID], qty: 99 }; },
  'an order added': d => { d.deliveries.dl_new = structuredClone(NEW); },
  'an order deleted': d => { delete d.deliveries[OTHER]; },
  'two orders': d => { d.deliveries[ID].qty = 7; d.deliveries[OTHER].client = 'Autre client'; },
  'a setting': d => { d.settings.companyName = 'Atelier Test'; },
  'a nested setting': d => { d.params.reception = { ...d.params.reception, retentionPct: 3 } as never; },
  'the timeline': d => { d.timeline.end = '2027-03'; },
  'a process (array)': d => { d.processes[0].name = 'Direction'; },
  'a process pushed': d => { d.processes.push({ ...d.processes[0], id: 'P9', order: 9 }); },
  'a process removed': d => { d.processes.splice(1, 1); },
  'a value of a kpi': d => { const k = Object.keys(d.values)[0]; d.values[k]['2026-05'] = 42; },
  'an action added': d => { const a = Object.values(d.actions)[0]; d.actions.act_new = { ...a, id: 'act_new', constat: 'Nouvelle' }; },
  'a risk deleted': d => { delete d.risks[Object.keys(d.risks)[0]]; },
  'a collection replaced by a filtered copy': d => { d.deliveries = Object.fromEntries(Object.entries(d.deliveries).filter(([k]) => k !== OTHER)); },
  'a collection replaced by an equal one': d => { d.deliveries = structuredClone(d.deliveries); },
  'a read of every order, no change': d => { Object.values(d.deliveries).forEach(x => x.milestones.length); },
  'a write of the same value': d => { d.deliveries[ID].client = d.deliveries[ID].client; },
  'nothing': () => {},
};

describe('produce gives what the whole copy gave', () => {
  for (const [name, fn] of Object.entries(MUTATORS)) {
    it(name, () => {
      const prev = base(), snap = JSON.stringify(prev);
      const a = produce(prev, fn, 'Test'), b = whole(prev, fn);
      expect(strip(a)).toEqual(strip(b));
      expect(lines(a)).toEqual(lines(b));
      expect(JSON.stringify(prev)).toBe(snap);   // the previous state is never changed
    });
  }
});

describe('what is not touched is shared', () => {
  it('a gesture on one order copies that order: the others, the collections not touched and the settings keep their identity', () => {
    const prev = base(), next = produce(prev, d => { d.deliveries[ID].item = 'Lot corrigé'; }, 'Test');
    expect(next.deliveries[ID]).not.toBe(prev.deliveries[ID]);
    expect(next.deliveries[ID].item).toBe('Lot corrigé');
    expect(prev.deliveries[ID].item).not.toBe('Lot corrigé');
    expect(next.deliveries[OTHER]).toBe(prev.deliveries[OTHER]);
    for (const k of ['settings', 'timeline', 'processes', 'kpis', 'values', 'actions', 'risks', 'contacts', 'people', 'ncs'] as const) expect(next[k], k).toBe(prev[k]);
  });
  it('an order that is read, even rewritten as the same, is the same object: nothing changed, the state is the previous one', () => {
    const prev = base();
    expect(produce(prev, d => { Object.values(d.deliveries).forEach(x => x.milestones.length); }, 'Test')).toBe(prev);
    expect(produce(prev, d => { d.deliveries[ID].client = d.deliveries[ID].client; }, 'Test')).toBe(prev);
    expect(produce(prev, () => {}, 'Test')).toBe(prev);
  });
  it('an order read and not changed keeps its identity next to one that is changed', () => {
    const prev = base(), next = produce(prev, d => { d.deliveries[OTHER].qty; d.deliveries[ID].qty = 123; }, 'Test');
    expect(next.deliveries[OTHER]).toBe(prev.deliveries[OTHER]);
    expect(next.deliveries[ID].qty).toBe(123);
  });
  it('the draft of a collection answers like the collection (keys, values, in, array methods)', () => {
    const prev = base();
    produce(prev, d => {
      expect(Object.keys(d.deliveries)).toEqual(Object.keys(prev.deliveries));
      expect(ID in d.deliveries).toBe(true);
      expect(Object.hasOwn(d.deliveries, 'constructor')).toBe(false);
      expect(d.deliveries.constructor).toBe(Object);                 // inherited members are not copies
      expect(Array.isArray(d.processes)).toBe(true);
      expect(d.processes.map(p => p.id)).toEqual(prev.processes.map(p => p.id));
      expect(JSON.stringify(d.deliveries[ID])).toBe(JSON.stringify(prev.deliveries[ID]));
    }, 'Test');
  });
});

describe('a mutator that copies a collection of the draft', () => {
  it('is played again on a whole copy, with the same result', () => {
    const prev = base(), fn = (d: State) => { d.deliveries = structuredClone(d.deliveries); d.deliveries[ID].qty = 8; };
    const next = produce(prev, fn, 'Test');
    expect(next.deliveries[ID].qty).toBe(8);
    expect(prev.deliveries[ID].qty).not.toBe(8);
    expect(Object.values(next.logs).map(l => [l.kind, l.ref, l.what])).toEqual([['delivery', ID, 'modification']]);
  });
  it('an error of the mutator itself is not hidden', () => {
    expect(() => produce(base(), () => { throw new Error('boom'); }, 'Test')).toThrow('boom');
  });
});

describe('the journal', () => {
  it('writes one line for the record that changed, and none for a record that was only read', () => {
    const prev = base(), next = produce(prev, d => { d.deliveries[OTHER].qty; d.deliveries[ID].qty = 5; }, 'Alice');
    expect(Object.values(next.logs).map(l => [l.kind, l.ref, l.what, l.by])).toEqual([['delivery', ID, 'modification', 'Alice']]);
  });
  it('the same person on the same record within ten minutes keeps one line (its time moves), without touching the line of the previous state', () => {
    const first = produce(base(), d => { d.deliveries[ID].qty = 5; }, 'Alice'), line = Object.values(first.logs)[0], was = line.at;
    vi.setSystemTime(new Date(NOW.getTime() + 3 * 60000));
    const second = produce(first, d => { d.deliveries[ID].qty = 6; }, 'Alice');
    expect(Object.values(second.logs)).toHaveLength(1);
    expect(Object.values(second.logs)[0].at).not.toBe(was);
    expect(Object.values(first.logs)[0].at).toBe(was);   // the previous state's journal is as it was
  });
  it('a change that is not a record of the journal (a setting) writes no line and leaves the journal as it is', () => {
    const prev = base(), next = produce(prev, d => { d.settings.companyName = 'Atelier'; }, 'Alice');
    expect(next.logs).toBe(prev.logs);
    expect(next.settings.companyName).toBe('Atelier');
  });
  it('the 400 most recent lines are kept', () => {
    let s = base();
    for (let i = 0; i < 405; i++) { vi.setSystemTime(new Date(NOW.getTime() + i * 11 * 60000)); const n = i; s = produce(s, d => { d.deliveries[ID].qty = 1000 + n; }, 'Alice'); }
    expect(Object.keys(s.logs)).toHaveLength(400);
  });
});

describe('the counter of the PV numbers (G-13)', () => {
  it('follows the numbers given: raised to the highest PV of the orders, in the settings that are replaced, never changed in place', () => {
    const prev = base(), settings = prev.params;
    const next = produce(prev, d => { d.deliveries[ID] = { ...d.deliveries[ID], reception: { ...d.deliveries[ID].reception, pvNo: 'PV-2026-077' } }; }, 'Alice');
    expect(next.params.reception?.pvCounter?.['2026']).toBe(77);
    expect(prev.params).toBe(settings);
    expect(prev.params.reception?.pvCounter?.['2026']).not.toBe(77);
  });
});
