// The queue "À faire": red is for the most pressing line only, it is folded on a phone, it says "toucher"; an urgency without a deadline (a stop, a stop past its Plan B, a danger without date limit) says since when, never "avant le" or "en retard de N jours";
// a task that has a real deadline keeps it.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MaintTodo, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { maintTodos } from '../../domain/maintenanceAll';
import { frDate } from '../../domain/periods';
import { EqQueue } from './EqQueue';

vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: vi.fn(), author: 'Test' }) }));
const now = new Date(2026, 8, 25, 10, 0), noop = () => {};
beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });   // the queue counts its days from the clock
afterAll(() => { vi.useRealTimers(); });

const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
// the text of the one line the queue draws for a task
const line = (state: State, t: MaintTodo) => renderToStaticMarkup(<EqQueue state={state} todos={[t]} nav={nav} offer={noop} onEq={noop} onRoutine={noop} onSpare={noop} onSettings={noop} />).replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'");
const withDue = (s: State, eqId: string, dueAt: string | undefined) => ({ ...s, equipments: { ...s.equipments, [eqId]: { ...s.equipments[eqId], anomalies: s.equipments[eqId].anomalies!.map(a => (a.severity === 'danger' ? { ...a, dueAt } : a)) } } });

describe('3.3 the dates of the queue', () => {
  const s = demoState(now), todos = maintTodos(s, now), of = (kind: string, id?: string) => todos.find(t => t.kind === kind && (!id || t.id.includes(id)))!;
  const danger = of('danger'), eqId = danger.eqId!;

  it('says since when for a stop and for a stop past its Plan B, with neither "avant le" nor "en retard"', () => {
    const stopped = of('stopped', 'eq_demo_serveur'), planB = of('plan-b');
    for (const t of [stopped, planB]) {
      expect(t.due, t.id).toBeTruthy();   // the day of the fact is carried: it must not be shown as a deadline
      const text = line(s, t);
      expect(text, t.id).toContain("à l'arrêt depuis 30 h");
      expect(text, t.id).not.toContain('avant le');
      expect(text, t.id).not.toContain('en retard de');
    }
  });

  it('says since when for a danger without date limit', () => {
    const open = withDue(s, eqId, undefined), t = maintTodos(open, now).find(x => x.kind === 'danger')!;
    expect(t.due).toBeTruthy();
    const text = line(open, t);
    expect(text).toContain(`depuis le ${frDate(t.due)}`);
    expect(text).not.toContain('avant le');
    expect(text).not.toContain('en retard de');
  });

  it('keeps the deadline of a danger on which a date limit was typed: before it, then late', () => {
    expect(line(s, danger)).toContain('avant le 26/09/2026');   // the example gives it the 26th
    const late = withDue(s, eqId, '2026-09-20'), t = maintTodos(late, now).find(x => x.kind === 'danger')!;
    const text = line(late, t);
    expect(text).toContain('en retard de 5 jours');
    expect(text).not.toContain('depuis le');
  });

  it('keeps the deadline of the other tasks (a routine, an anomaly with a date)', () => {
    expect(line(s, of('routine'))).toMatch(/en retard de \d+ jours?/);
    expect(line(s, of('anomaly'))).toContain('avant le 26/09/2026');
  });

  it('puts no date next to a task whose text already says it (a late delivery, a check due)', () => {
    for (const k of ['order-late', 'check', 'out'] as const) { const t = of(k); expect(line(s, t), k).not.toMatch(/avant le|en retard de|depuis le/); }
  });
});

describe('3.3 the queue keeps red for the most pressing line and folds on a phone', () => {
  const s = demoState(now), todos = maintTodos(s, now);
  const draw = (ts: MaintTodo[]) => renderToStaticMarkup(<EqQueue state={s} todos={ts} nav={nav} offer={noop} onEq={noop} onRoutine={noop} onSpare={noop} onSettings={noop} />);

  it('gives a red background to the most pressing task when it is red, and to no other', () => {
    expect(todos[0].tone).toBe('bad');
    expect(draw(todos).match(/bg-red-50/g)).toHaveLength(1);
    expect(draw(todos.filter(t => t.tone === 'warn'))).not.toContain('bg-red-50');   // no red background on an amber task: red keeps its meaning
  });

  it('says "en retard de N jours" in amber for an amber task, in red for a red one', () => {
    const routine = todos.find(t => t.kind === 'routine')!, danger = todos.find(t => t.kind === 'danger')!;
    expect(routine.tone).toBe('warn');
    expect(draw([routine])).toMatch(/text-amber-800">[^<]*en retard de \d+ jours?/);
    expect(draw([routine])).not.toContain('text-red-700"> · en retard');
    const late = withDue(s, danger.eqId!, '2026-09-20'), t = maintTodos(late, now).find(x => x.kind === 'danger')!;
    expect(renderToStaticMarkup(<EqQueue state={late} todos={[t]} nav={nav} offer={noop} onEq={noop} onRoutine={noop} onSpare={noop} onSettings={noop} />)).toMatch(/text-red-700">[^<]*en retard de 5 jours/);
  });

  it('is open on a large screen and folded under 640 px, its title saying how many tasks and how many are pressing', () => {
    const urgent = todos.filter(t => t.tone === 'bad').length, title = new RegExp(`À faire : ${todos.length}<span[^>]*> · dont ${urgent} pressantes?</span>`);
    expect(draw(todos)).toMatch(/<details open="" /);
    expect(draw(todos)).toMatch(title);
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    try {
      const phone = draw(todos);
      expect(phone).toMatch(/<details class="group/);
      expect(phone).not.toMatch(/<details open/);
      expect(phone).toMatch(title);   // the folded queue still says what is there
      expect(phone).toContain('<summary class="flex min-h-[44px]');   // and opens with a 44 px touch
    } finally { vi.unstubAllGlobals(); }
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    try { expect(draw(todos)).toMatch(/<details open="" /); } finally { vi.unstubAllGlobals(); }
  });

  it('says "toucher", has a touch height on "Voir les N autres", and no "tap"', () => {
    const html = draw(todos);
    expect(html).toContain('Toucher le bouton d&#x27;une ligne');
    expect(html.replace(/<[^>]+>/g, ' ').match(/(?<!\p{L})tap(?!\p{L})/iu)).toBeNull();
    expect(html).toMatch(/Voir les \d+ autres<\/button>/);
    expect(html).toMatch(/class="[^"]*max-sm:min-h-\[44px\] \[@media\(pointer:coarse\)\]:min-h-\[44px\]"[^>]*aria-expanded="false"/);
  });
});
