// Who controls: nobody is picked for the user (a shared post), the person of the session is only offered; the urgent tasks say "Pressant" in text.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { receptionSummary } from '../../domain/receptionsAll';
import { demoState } from '../../domain/templates';
import { PeoplePick, fmtMoment, peopleOf } from './RcBits';
import { RcQueue } from './RcQueue';

describe('PeoplePick and the queue', { timeout: 30000 }, () => {
  afterEach(() => { delete (globalThis as { window?: unknown }).window; });
  const pick = (value = '') => renderToStaticMarkup(<PeoplePick value={value} onChange={() => {}} names={['Anne', 'Marc']} label="Contrôlé par" />);
  it('picks nobody, and offers the person of the session as a button to touch', () => {
    (globalThis as { window?: unknown }).window = { sessionStorage: { getItem: () => 'Marc', setItem() {} } };
    expect(pick()).not.toContain(plain('aria-checked="true"'));
    expect(pick()).toContain(plain('Même personne : Marc (dernier choix)'));
    expect(pick('Marc')).not.toContain(plain('Même personne'));
  });
  it('shows "Pressant" as visible text, not only to screen readers', () => {
    const now = new Date(2026, 8, 25, 10, 0), state = demoState(now), t = receptionSummary(state, now).todos[0];
    const html = renderToStaticMarkup(<RcQueue todos={[{ ...t, tone: 'bad' }]} state={state} onOpen={() => {}} />);
    expect(html).toMatch(/Pressant<\/span>/);
    expect(html).not.toContain(plain('sr-only">Pressant'));
  });
});

// The small functions of the screens that read a moment and a list of people (the year is told only when it is not the current one: the clock is stopped at 25 Sept. 2026)
describe('fmtMoment and peopleOf', { timeout: 30000 }, () => {
  afterEach(() => { vi.useRealTimers(); });
  const at = () => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 8, 25, 10, 0)); };
  it('writes the day with its month, and the hour when there is one; the year only when it is not this one; nothing for nothing', () => {
    at();
    expect(plain(fmtMoment('2026-10-04T14:05'))).toBe('4 oct. à 14 h 05');
    expect(plain(fmtMoment('2026-12-31'))).toBe('31 déc.');
    expect(plain(fmtMoment('2025-01-02T08:00'))).toBe('2 janv. 2025 à 8 h 00');
    expect(fmtMoment('')).toBe('');
  });
  it('offers each person of an order once, trimmed, with no blank name, in the order of the team', () => {
    const state = demoState(new Date(2026, 8, 25, 10, 0)), d = { ...state.deliveries.dl_demo_5, team: ['Anne', 'Anne ', ' Marc', '', 'Anne'] };
    expect(peopleOf(state, d, '2026-09-25')).toEqual({ names: ['Anne', 'Marc'], absent: [] });
  });
  it('takes the active people of 4.2 when the order names nobody', () => {
    const state = demoState(new Date(2026, 8, 25, 10, 0)), d = { ...state.deliveries.dl_demo_5, team: undefined };
    const { names, absent } = peopleOf(state, d, '2026-09-25');
    expect(names.length + absent.length).toBeGreaterThan(2);
    expect(new Set([...names, ...absent]).size).toBe(names.length + absent.length);
  });
});
