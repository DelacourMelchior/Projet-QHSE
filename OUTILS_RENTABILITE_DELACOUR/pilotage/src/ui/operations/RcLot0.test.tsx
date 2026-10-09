// Lot 0 of tool 3.4 on the screen side (static render; the store is a stub, the effects and the dialogs are checked in the browser): the settings lists are not filtered while they
// are typed ("Autre site" starts with the letters of "Autre"), the dialogs of archiving say that the open reservations stay followed.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { openReserves } from '../../domain/receptions';
import { followedText } from './RcBits';
import { RcSettings } from './RcSettings';

const state = demoState(new Date(2026, 8, 25, 10, 0));
const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

describe('lot 0, screens of 3.4', { timeout: 30000 }, () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
  it('keeps every row of a list while it is typed, whatever it starts with', () => {
    store.state = { ...state, params: { ...state.params, reception: { refusals: ['Autre site', 'Autre', 'Documents manquants'] } } };
    const html = renderToStaticMarkup(<RcSettings />);
    ['value="Autre site"', 'value="Autre"', 'value="Documents manquants"'].forEach(t => expect(html, t).toContain(plain(t)));
  });
  it('says that the open reservations of an order stay followed once it is archived', () => {
    const d = state.deliveries.dl_demo_3;
    expect(openReserves(d).length).toBeGreaterThan(0);
    expect(followedText(d)).toMatch(/non levées? rest(e|ent) suivies?/);
    expect(followedText({ ...d, reception: { ...d.reception, reserves: [] }, lots: [] })).toBe('');
  });
});
