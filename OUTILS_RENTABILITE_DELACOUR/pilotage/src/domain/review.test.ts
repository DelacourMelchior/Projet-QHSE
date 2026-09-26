// Rules added after the client review: working days, rates per workstation, recurrences, follow-up checks, tasks, absences, audit of names.
import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { emptyTools, rateFor, workHoursBetween } from './base';
import { DEFAULT_SCALE } from './risk';
import { demoState } from './templates';
import { allTasks, icsOf } from './tasks';
import { cnqMonth, ncCost, newNc, newPoka, pokaState, workshopsToOpen, compensatingRevenueVariable } from './quality';
import { complaintState, newComplaint, lostStats, forecast, quoteIssues, newQuote, changePriceHint, newChange } from './commercial';
import { amountFromQuote, proposedRating, taskDue, resultOf, anomalies } from './operations';
import { absenceGaps, absenceView, auditFiles, powerState, newPower } from './team';
import { defaultGed } from './base';
import { monthlyReportPdf, weekPdf } from './reportPdf';

const now = new Date(2026, 8, 25, 10, 0);   // Friday
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});

describe('cross-tool', () => {
  it('counts working hours only on weekdays', () => {
    expect(workHoursBetween('2026-09-25T17:00', new Date(2026, 8, 28, 17, 0), false)).toBe(72);
    expect(workHoursBetween('2026-09-25T17:00', new Date(2026, 8, 28, 17, 0), true)).toBe(24);
    const c = { ...newComplaint(st(), 'x', now), at: '2026-09-25T17:00' };
    expect(complaintState(c, new Date(2026, 8, 27, 18, 0), false)).toBe('late');
    expect(complaintState(c, new Date(2026, 8, 27, 18, 0), true)).toBe('to_contact');
  });
  it('values hours at the rate of the workstation', () => {
    const s = st();
    s.params.rates = [{ name: 'CNC 5 axes', rate: 90 }];
    expect(rateFor(s.params, 'cnc 5 axes')).toBe(90);
    expect(ncCost({ ...newNc(s, 'x', now), where: 'CNC 5 axes', cost: { scrap: null, lostHours: 1, reworkHours: 1, logistics: null } }, s.params)).toBe(180);
  });
  it('gathers the tasks of every tool and writes a calendar and PDF files', () => {
    const d = demoState(now);
    const ts = allTasks(d, now);
    expect(new Set(ts.map(t => t.tool)).size).toBeGreaterThan(10);
    const ics = icsOf(ts, 'Atelier', now);
    expect(ics).toMatch(/BEGIN:VCALENDAR/);
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(ts.filter(t => t.due).length);
    for (const pdf of [weekPdf(ts.slice(0, 10), 'David K.', { company: 'A', date: now }), monthlyReportPdf(d, '2026-09', { company: 'A', date: now, money: true })]) expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
  });
});

describe('commercial', () => {
  it('lost reasons, weighted pipeline, price hint, locks checked with someone', () => {
    const s = st({ quotes: {
      a: { ...newQuote(st(), now), id: 'a', status: 'lost', decidedAt: '2026-09-01', lostCategory: 'prix', amount: 1000 },
      b: { ...newQuote(st(), now), id: 'b', status: 'sent', amount: 10000, probability: 30 },
    } });
    expect(lostStats(s, now)[0]).toMatchObject({ key: 'prix', n: 1 });
    expect(forecast(s).weighted).toBe(3000);
    expect(changePriceHint({ ...newChange(s, now), hours: 10, material: 150 }, s.params)).toBe(1000);   // 700 / 0.7
    const q = { ...newQuote(s, now), amount: 100, locks: [0, 1, 2, 3, 4].map(() => ({ state: 'ok' as const, note: '' })), cost: { material: 10, hours: null, subcontract: null, other: null } };
    expect(quoteIssues(q, s.params).join()).toMatch(/P3 : vérifié avec qui/);
  });
});

describe('operations', () => {
  it('proposes a rating from the facts, amounts from the quote, periodic checks and history by checkpoint id', () => {
    const d = demoState(now);
    const r = proposedRating(d, d.suppliers.sup_demo_usinage, now);
    expect(r.quality).toBe(32);
    expect(amountFromQuote(d, 'qt_demo_1')).toBe(35000 + 1450);
    expect(taskDue({ everyDays: 365, lastDone: '2025-09-25' })).toBe('2026-09-25');
    const e = { ...d.equipments.eq_demo_cnc };
    const insp = { date: '2026-09-20', by: 'x', note: '', results: ['ok', 'ko'] as ('ok' | 'ko')[], ids: ['a', 'b'] };
    e.checkpoints = [{ label: 'B', criterion: '', id: 'b' }];
    expect(resultOf(e, insp, 0)).toBe('ko');
    expect(anomalies({ ...e, anomalies: [{ id: '1', label: 'B', date: '', note: '', closedAt: '' }, { id: '2', label: 'C', date: '', note: '', closedAt: '2026-09-21' }] }).map(a => a.label)).toEqual(['B']);
  });
});

describe('team', () => {
  it('extra deputies, absence view, absences leaving a skill uncovered, audit of file names', () => {
    const p = { ...newPower('P1', 'Paie'), holder: 'Jean', deputies: ['A', ''] as [string, string], practiced: ['2026-09-01', ''] as [string, string], extra: ['Expert-comptable'], extraPracticed: ['2026-06-01'] };
    expect(powerState(p, now)).toBe('ok');
    expect(absenceView(st({ powers: { p } }), 'jean', now)[0].ready.map(x => x.name)).toEqual(['A', 'Expert-comptable']);
    const d = demoState(now);
    d.people.pp_demo_kt.absences = [{ from: '2026-10-05', to: '2026-10-20' }];
    d.people.pp_demo_nr.absences = [{ from: '2026-10-10', to: '2026-10-12' }];
    expect(absenceGaps(d, now).map(g => g.skill.id)).toContain('sk_demo_2');
    const a = auditFiles([{ folder: 'BE', name: 'BE_PLN_A_20260101_V01.pdf' }, { folder: 'BE', name: 'BE_PLN_A_20260201_V02.pdf' }, { folder: 'BE', name: 'plan final.dwg' }], defaultGed());
    expect(a.bad.map(f => f.name)).toEqual(['plan final.dwg']);
    expect(a.versions).toHaveLength(0);   // dates differ: two documents
  });
});

describe('quality', () => {
  it('workshops to open, net cost, second reading, follow-up checks after day 30', () => {
    const d = demoState(now);
    expect(workshopsToOpen(d, now).length).toBeGreaterThan(0);
    const m = cnqMonth(d, '2026-09');
    expect(m.net).toBe(m.total + m.indirect - m.recovered);
    expect(compensatingRevenueVariable(1000, 25)).toBe(4000);
    const pk = { ...newPoka(null), installedAt: '2026-05-01', check: { date: '2026-06-01', produced: 10, defects: 0, inPlace: true, cadenceOk: true, note: '', by: '' } };
    expect(pokaState(pk, now)).toBe('recheck');   // day 90 passed
    expect(pokaState({ ...pk, later: [{ ...pk.check, date: '2026-08-01' }] }, now)).toBe('effective');
  });
});
