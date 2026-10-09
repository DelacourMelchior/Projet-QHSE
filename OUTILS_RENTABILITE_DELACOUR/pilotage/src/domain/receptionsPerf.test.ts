// Tool 3.4, speed and structure (lot 9): the days of a reservation counted without a loop give what the loop gave; the indicators build the presentations once; the number of a defect is the one
// of the gesture; the modules of 3.4 do not import one another in a circle, nor the screens of 3.3 and 3.2, and the few files of those two tools that 3.4 still reads are the ones said.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Delivery, Params, ReceptionReserve } from './types';
import { DEFAULT_PARAMS, addDays, type Business } from './base';
import { isoDate, parseDate } from './periods';
import { afterDays, daysLate, ncFromMilestone, ncFromReserve, receptionCfg, reserveDue, reserveLateDays } from './receptions';
import { RECEPTION_KPIS, addReceptionKpis, receptionFeeds, receptionKpiValue } from './receptionsFeeds';
import { feeds } from './feeds';
import { newNc as newNcOfQuality } from './quality';
import { newNc } from './newNc';
import { allReservesOf } from './receptions';
import { demoState } from './templates';

// ---- the old way, day by day (receptions.ts before the lot 9): the reference the direct count is compared with
const isOff = (iso: string, b: Business) => { const g = parseDate(iso)?.getDay(); return b !== false && (g === 0 || g === 6 || (Array.isArray(b) && b.includes(iso))); };
function shiftLoop(iso: string, n: number, b: Business): string {
  let out = iso;
  for (let left = n, guard = 0; left > 0 && guard < 4000; guard++) { out = addDays(out, 1); if (!isOff(out, b)) left--; }
  return out;
}
const pastLoop = (due: string, end: string, b: Business): number => {
  let n = 0;
  for (let t = addDays(isOff(due, b) ? shiftLoop(due, 1, b) : due, 1), g = 0; t <= end && g < 4000; t = addDays(t, 1), g++) if (!isOff(t, b)) n++;
  return n;
};
const businessOfCfg = (p: Params): Business => (receptionCfg(p).liftBusiness ? p.closedDays || [] : false);
const dueLoop = (r: ReceptionReserve, d: Delivery, p: Params) => { const from = r.raisedAt || d.reception.date; return r.dueAt || (from ? shiftLoop(from, receptionCfg(p).liftDays, businessOfCfg(p)) : ''); };
const lateLoop = (r: ReceptionReserve, d: Delivery, p: Params, today: Date) => { const due = dueLoop(r, d, p); return due ? pastLoop(due, r.liftedAt || isoDate(today), businessOfCfg(p)) : 0; };

// a generator that gives the same numbers on every run (a failure is read again)
const rng = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const CLOSED = ['2025-12-25', '2026-01-01', '2026-05-01', '2026-05-08', '2026-07-14', '2026-08-15', '2026-11-01', '2026-12-25', '2027-01-01', '2026-10-12', '2026-10-12', '2026-6-1', '01/05/2026', '2026-02-31', '2026-10-10'];   // a day twice, two that are written otherwise, one that does not exist, a Saturday
const TODAY = new Date(2026, 9, 7);

describe('the days of a reservation, counted without a loop (F-5, D-18)', () => {
  it('give what the loop gave: the day it is due, the days late, the days after a day, on 5 000 reservations drawn at random (calendar and working days, with and without days off)', () => {
    const rand = rng(20261007), ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
    const day = (n: number) => addDays(isoDate(TODAY), n);
    let differences = 0, late = 0;
    for (let i = 0; i < 5000; i++) {
      const p = {
        ...DEFAULT_PARAMS, businessHours: rand() < 0.5, closedDays: rand() < 0.7 ? CLOSED.filter(() => rand() < 0.6) : undefined,
        reception: rand() < 0.5 ? { liftDays: ri(1, 60), liftBusiness: rand() < 0.5 } : rand() < 0.2 ? { liftBusiness: rand() < 0.5 } : undefined,
      } as Params;
      const raised = day(-ri(0, 900)), r = { id: 'r', text: 'x', raisedAt: raised, ...(rand() < 0.25 ? { dueAt: day(-ri(0, 700)) } : {}), ...(rand() < 0.3 ? { liftedAt: day(-ri(0, 400)) } : {}) } as ReceptionReserve;
      const d = { reception: { date: rand() < 0.2 ? `${raised.slice(0, 7)}-15` : raised } } as Delivery, today = new Date(2026, 9, 7 + ri(-30, 30));
      const from = day(-ri(0, 900)) + (rand() < 0.1 ? 'T10:00' : ''), k = ri(-3, 70);
      const got = [reserveDue(r, d, p), reserveLateDays(r, d, p, today), afterDays(from, k, p), daysLate(from, isoDate(today), p)];
      const want = [dueLoop(r, d, p), lateLoop(r, d, p, today), (() => { const b = p.businessHours ? p.closedDays || [] : false; return shiftLoop(isOff(from, b) ? shiftLoop(from, 1, b) : from, k, b); })(), pastLoop(from, isoDate(today), p.businessHours ? p.closedDays || [] : false)];
      if (JSON.stringify(got) !== JSON.stringify(want)) { if (differences++ < 3) console.log('DIFF', JSON.stringify({ r, p: { b: p.businessHours, c: p.closedDays, rc: p.reception }, from, k, today: isoDate(today) }), got, want); }
      if (got[1] as number > 0) late++;
    }
    expect(differences).toBe(0);
    expect(late, 'the draw holds late reservations').toBeGreaterThan(1500);
  }, 30_000);
  it('the edges: a start that is not a day, a delay of 0, negative, with decimals, longer than the guard, a day written dd/mm/yyyy or with its hour, a reservation lifted before its deadline', () => {
    const cal = { ...DEFAULT_PARAMS, businessHours: false } as Params, biz = { ...DEFAULT_PARAMS, businessHours: true, closedDays: CLOSED } as Params;
    for (const [from, k] of [['', 5], ['garbage', 5], ['2026-10-07', 0], ['2026-10-07', -2], ['2026-10-07', 2.5], ['2026-10-07', 5000], ['2026-10-07', 1e9], ['07/10/2026', 3], ['2026-10-07T23:30', 3], ['2026-10-09', 1], ['2026-10-10', 1], ['2026-12-24', 2]] as [string, number][]) {
      for (const p of [cal, biz]) {
        const b = p.businessHours ? p.closedDays || [] : false;
        expect(afterDays(from, k, p), `${from} +${k} ${p.businessHours}`).toBe(shiftLoop(isOff(from, b) ? shiftLoop(from, 1, b) : from, k, b));
      }
    }
    const r = { id: 'r', text: 'x', raisedAt: '2026-10-01', liftedAt: '2026-10-02' } as ReceptionReserve, d = { reception: { date: '2026-10-01' } } as Delivery;
    expect(reserveLateDays(r, d, biz, TODAY)).toBe(lateLoop(r, d, biz, TODAY));   // lifted a day after the reception: on time
    expect(reserveLateDays({ ...r, liftedAt: undefined }, d, biz, TODAY)).toBe(lateLoop({ ...r, liftedAt: undefined }, d, biz, TODAY));
  });
  it('the longest span counted is 4 000 days, as the loop stopped (a deadline of 11 years ago does not count 11 years)', () => {
    const d = { reception: { date: '2015-01-05' } } as Delivery, r = { id: 'r', text: 'x', raisedAt: '2015-01-05', dueAt: '2015-01-12' } as ReceptionReserve;
    for (const p of [{ ...DEFAULT_PARAMS, businessHours: false }, { ...DEFAULT_PARAMS, businessHours: true, closedDays: CLOSED }] as Params[]) {
      expect(reserveLateDays(r, d, p, TODAY), String(p.businessHours)).toBe(lateLoop(r, d, p, TODAY));
      expect(reserveLateDays(r, d, p, TODAY)).toBeLessThanOrEqual(4000);
    }
    expect(reserveLateDays(r, d, { ...DEFAULT_PARAMS, businessHours: false } as Params, TODAY)).toBe(4000);
  });
  it('a reservation two years old is counted as the calendar counts it (a week has two days off, a closed day on a working day is one more)', () => {
    const r = { id: 'r', text: 'x', raisedAt: '2024-10-07' } as ReceptionReserve, d = { reception: { date: '2024-10-07' } } as Delivery, p = { ...DEFAULT_PARAMS, businessHours: true, closedDays: [] } as Params;
    expect(reserveDue(r, d, p)).toBe('2024-10-16');   // 7 working days after Monday 7 October 2024
    expect(reserveLateDays(r, d, p, new Date(2026, 9, 7))).toBe(pastLoop('2024-10-16', '2026-10-07', []));
    expect(reserveLateDays(r, d, { ...p, closedDays: ['2025-12-25', '2026-01-01'] }, new Date(2026, 9, 7))).toBe(reserveLateDays(r, d, p, new Date(2026, 9, 7)) - 2);
    expect(reserveLateDays(r, d, { ...p, businessHours: false }, new Date(2026, 9, 7))).toBe(pastLoop('2024-10-14', '2026-10-07', false));
  });
});

describe('the indicators for the dashboard build the presentations once (F-11)', () => {
  const s = demoState(new Date(2026, 8, 25, 10, 0)), now = new Date(2026, 8, 25, 10, 0);
  addReceptionKpis(s);
  it('every figure is the one of the indicator read alone, for several months', () => {
    ['2026-07', '2026-08', '2026-09', '2026-10'].forEach(p => {
      const all = receptionFeeds(s, p, now);
      RECEPTION_KPIS.forEach(k => expect(all.find(x => x.role === k.role)?.value ?? null, `${p} ${k.role}`).toBe(receptionKpiValue(s, k.role, p, now)));
    });
    expect(['2026-08', '2026-09'].some(p => receptionFeeds(s, p, now).length >= 3), 'the example gives some figures').toBe(true);
  });
  it('the presentations of the orders are built once for the five indicators, not once per indicator', () => {
    const t = structuredClone(s), reads = { n: 0 };
    Object.values(t.deliveries).forEach(d => { let j = d.journal; Object.defineProperty(d, 'journal', { get() { reads.n++; return j; }, set(v) { j = v; }, enumerable: true, configurable: true }); });
    reads.n = 0; receptionKpiValue(t, 'recep_first' as never, '2026-09', now);
    const once = reads.n;
    reads.n = 0; receptionFeeds(t, '2026-09', now);
    expect(once).toBeGreaterThan(0);
    expect(reads.n).toBe(once);   // four indicators read the presentations: one build, not four
  });
  it('the presentations come from the one that is given, and are not built for the indicator that does not read them', () => {
    expect(receptionKpiValue(s, 'recep_released' as never, '2026-09', now, () => [])).toBeNull();   // nothing presented: nothing to say
    expect(() => receptionKpiValue(s, 'recep_clean' as never, '2026-09', now, () => { throw new Error('read'); })).not.toThrow();
  });
  it('`feeds` for a tool computes that tool only, and gives what the full computation gave for it', () => {
    const full = feeds(s, '2026-09', now);
    expect(full.some(f => f.tool === '3.4')).toBe(true);
    expect(new Set(full.map(f => f.tool)).size, 'several tools have a figure').toBeGreaterThan(2);
    [...new Set(full.map(f => f.tool))].forEach(tool => {
      const only = feeds(s, '2026-09', now, [tool]);
      expect(only.every(f => f.tool === tool), tool).toBe(true);
      expect(only.map(f => [f.kpi.id, f.value]), tool).toEqual(full.filter(f => f.tool === tool).map(f => [f.kpi.id, f.value]));
    });
    expect(feeds(s, '2026-09', now, ['3.4', '2.1']).map(f => f.tool).sort()).toEqual(full.filter(f => f.tool === '3.4' || f.tool === '2.1').map(f => f.tool).sort());
    expect(feeds(s, '2026-09', now, [])).toEqual([]);
    // the other tools are not even read: the orders of 3.4 that a tool of another family asks for are never touched
    const trap = { ...s, deliveries: new Proxy({}, { ownKeys() { throw new Error('the orders were read'); }, get() { throw new Error('the orders were read'); } }) } as typeof s;
    expect(() => feeds(trap, '2026-09', now, ['2.1', '2.4'])).not.toThrow();
    expect(() => feeds(trap, '2026-09', now, ['3.4'])).toThrow('the orders were read');
    expect(feeds(s, '2026-09', now).map(f => f.kpi.id)).toEqual(full.map(f => f.kpi.id));   // without the list: every tool, as before
  });
});

describe('the number and the moment of a defect are those of the gesture (T-3)', () => {
  const s = demoState(new Date(2026, 8, 25, 10, 0));
  const d = Object.values(s.deliveries).find(x => x.milestones.length > 1 && allReservesOf(x).length > 0)!;
  it('a defect declared from a milestone or a reservation on 1 January 2027 is numbered 2027 and dated that day, whatever the clock of the device says', () => {
    const jan = new Date(2027, 0, 1, 9, 30), dec = new Date(2026, 11, 31, 23, 58);
    for (const [now, year, at] of [[jan, 2027, '2027-01-01T09:30'], [dec, 2026, '2026-12-31T23:58']] as const) {
      const a = ncFromMilestone(s, d, d.milestones[0], 'Alice', now), b = ncFromReserve(s, d, allReservesOf(d)[0], 'Alice', now);
      expect(a.ref.startsWith(`NC-${year}-`), a.ref).toBe(true);
      expect(b.ref.startsWith(`NC-${year}-`), b.ref).toBe(true);
      expect([a.at, b.at]).toEqual([at, at]);
    }
    expect(ncFromMilestone(s, d, d.milestones[0], 'Alice', jan).ref).toBe('NC-2027-001');
  });
  it('without a moment it is the clock of the device, as before; `newNc` is the same function whether quality.ts or newNc.ts gives it', () => {
    expect(ncFromMilestone(s, d, d.milestones[0], 'Alice').ref.startsWith(`NC-${new Date().getFullYear()}-`)).toBe(true);
    expect(newNcOfQuality).toBe(newNc);
  });
});

// ---- structure: who imports whom
const SRC = `${process.cwd()}/src`, read = (rel: string) => readFileSync(`${SRC}/${rel}`, 'utf8');
const domain = readdirSync(`${SRC}/domain`).filter(f => f.endsWith('.ts') && !f.includes('.test.')).map(f => f.replace(/\.ts$/, ''));
const ops = readdirSync(`${SRC}/ui/operations`).filter(f => /^(Rc[A-Z].*|Receptions|rcShared)\.tsx?$/.test(f) && !f.includes('.test.'));
const imports = (src: string): { names: string[]; from: string }[] => [...src.matchAll(/^import\s+(type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/gm)].filter(m => !m[1]).map(m => ({ names: m[2].split(',').map(x => x.trim().replace(/^type\s.*/, '').replace(/\s+as\s+.*/, '')).filter(Boolean), from: m[3] }));

describe('who imports whom (T-6, T-7)', () => {
  it('the modules of the domain that 3.4 uses, with the quality (5.1), the commercial and the clients, import one another in no circle', () => {
    const graph = new Map(domain.map(f => [f, [...read(`domain/${f}.ts`).matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+'\.\/([A-Za-z0-9_]+)'/gm)].map(m => m[1]).filter(x => domain.includes(x))]));
    let n = 0; const stack: string[] = [], on = new Set<string>(), idx = new Map<string, number>(), low = new Map<string, number>(), cycles: string[][] = [];
    const visit = (v: string): void => {
      idx.set(v, n); low.set(v, n++); stack.push(v); on.add(v);
      for (const w of graph.get(v)!) { if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!)); }
      if (low.get(v) === idx.get(v)) { const c: string[] = []; let w: string; do { w = stack.pop()!; on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) cycles.push(c.sort()); }
    };
    [...graph.keys()].forEach(v => { if (!idx.has(v)) visit(v); });
    const mine = cycles.filter(c => c.some(m => /^(reception|rcLogic|quality|commercial|clients|newNc|text|contacts|status|tasks|feeds)/.test(m)));
    expect(mine, 'a circle of imports among 3.4, 5.1, 2.x and the dashboard').toEqual([]);
    expect(domain).toContain('newNc');   // the file that broke the circle exists
  });
  it('no screen of 3.4 imports a file of the screens of 3.3 or 3.2 (Eq*, Sop*): the pieces they shared are in rcShared.tsx', () => {
    const bad = ops.flatMap(f => imports(read(`ui/operations/${f}`)).filter(i => /^\.\/(Eq|Sop)[A-Za-z]*$/.test(i.from)).map(i => `${f} <- ${i.from}`));
    expect(bad).toEqual([]);
    expect(ops).toContain('rcShared.tsx');
  });
  it('what 3.4 still reads of the domain of 3.3 and 3.2 is this list, and nothing else (a new dependency is told to the owner of those tools first)', () => {
    const files = [...ops.map(f => `ui/operations/${f}`), ...domain.filter(f => /^(reception|rcLogic)/.test(f)).map(f => `domain/${f}.ts`)];
    const used = files.flatMap(f => imports(read(f)).filter(i => /\/(instructions|maintenance[A-Za-z]*)$/.test(i.from)).flatMap(i => i.names.map(n => `${i.from.split('/').pop()}.${n}`)));
    expect([...new Set(used)].sort()).toEqual(['instructions.sopCfg', 'instructions.sopPhase', 'maintenance.kindOf', 'maintenanceChecks.calibrationsDue']);
  });
  it('one `plural`, one `Typed`, one `BIG`, one `TOUCH` in the files of 3.4', () => {
    const src = [...ops.map(f => read(`ui/operations/${f}`)), ...domain.filter(f => /^(reception|rcLogic|text)/.test(f)).map(f => read(`domain/${f}.ts`))];
    const count = (re: RegExp) => src.reduce((n, s) => n + (s.match(re)?.length ?? 0), 0);
    expect(count(/^export const plural\b|^const plural\b|^function plural\b/gm)).toBe(1);
    expect(count(/^(export )?(function|const) Typed\b/gm)).toBe(1);
    expect(count(/^(export )?const BIG\b/gm)).toBe(1);
    expect(count(/^(export )?const TOUCH\b/gm)).toBe(1);
    expect(count(/^(export )?(function|const) boundsText\b/gm)).toBe(1);
  });
});
