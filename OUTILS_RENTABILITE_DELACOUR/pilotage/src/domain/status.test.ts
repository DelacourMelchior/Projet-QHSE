// Status of each tool on the home screen and in the tabs.
import { describe, expect, it } from 'vitest';
import { toolBadge } from './status';
import { blankState, demoState } from './templates';
import { TOOLS } from '../ui/tools';

const now = new Date(2026, 8, 25, 10, 0);

describe('tool status', () => {
  it('the demo gives every tool something to show', () => {
    const s = demoState(now);
    TOOLS.forEach(t => expect(toolBadge(s, t.id, '2026-09', now).text, t.id).not.toBe('Pas encore utilisé'));
  });
  it('counts a newcomer once, even without tutor and with a failed test', () => {
    const s = demoState(now);
    expect(toolBadge(s, '4.3', '2026-09', now)).toMatchObject({ n: 1, tone: 'alert' });
  });
  it('a new company starts with empty tools and a month to enter', () => {
    const s = blankState('industrie', now);
    expect(toolBadge(s, '1.1', '2026-09', now).text).toBe('Chiffres du mois à saisir');
    TOOLS.filter(t => !['1.1', '4.4'].includes(t.id)).forEach(t => expect(toolBadge(s, t.id, '2026-09', now).text, t.id).toBe('Pas encore utilisé'));
  });
});
