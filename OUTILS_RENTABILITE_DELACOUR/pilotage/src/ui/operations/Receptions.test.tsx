// @vitest-environment happy-dom
// The register of tool 3.4 (Receptions), PLAYED in a DOM (happy-dom; the store is the reactive stand-in of testDom.tsx, the clock is stopped at 25 Sept. 2026 10:00): the five filters hold every order of
// the example once (an order that no filter holds would vanish from every list), the search reads the PV and the delivery note and writes nothing, the tile that filters brings the list into view, the
// addresses of the QR codes and of the tasks open the right screen (and never a screen for a key of the prototype), the empty register, a new order.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { deliveryState, DELIVERY_STATE } from '../../domain/receptions';
import { FILTERS } from '../../domain/rcLogic';
import { blankState } from '../../domain/templates';
import { Receptions } from './Receptions';
import { all, button, cleanup, click, fake, field, mount, plain, seed, stateNow, text, tick, top, type as typeIn } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const nav = { tool: vi.fn(), open: vi.fn() } as never;
const FILTER = { running: /^En cours \d/, toship: /^À libérer ou à livrer \d/, reserves: /^Réserves \d/, received: /^Réceptionnées \d/, archived: /^Archivées \d/ };
const list = () => plain(document.getElementById('rc-list')!.textContent);   // what the register lists (the queue and the tiles also name orders)
const listed = () => Object.values(stateNow().deliveries).filter(d => list().includes(d.ref)).map(d => d.id).sort();
const filterSel = () => field('select[aria-label="Afficher"]');
const pickFilter = (f: keyof typeof FILTER) => typeIn(filterSel(), f);   // the five filters are one list: its value is the key
const optionOf = (f: keyof typeof FILTER) => [...filterSel().options].find(o => o.value === f)!;
const search = () => field('input[aria-label^="Chercher une commande"]');
async function register(focus = '', clearFocus = vi.fn()) {
  const m = await mount(<Receptions nav={nav} focus={focus} clearFocus={clearFocus} />);
  return { m, clearFocus };
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); window.history.replaceState(null, '', '/pilotage.html#3.4'); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the filters', () => {
  it('hold every order of the example once: no order is listed under none of the first four, and each state is under the filter that holds it', SLOW, async () => {
    const { m } = await register();
    const seen = new Map<string, string[]>();
    for (const [f, re] of Object.entries(FILTER)) {
      await pickFilter(f as keyof typeof FILTER);
      expect(re.test(plain(optionOf(f as keyof typeof FILTER).textContent))).toBe(true);
      expect(filterSel().value).toBe(f);
      listed().forEach(id => seen.set(id, [...(seen.get(id) ?? []), f]));
    }
    const ids = Object.keys(stateNow().deliveries);
    expect(ids).toHaveLength(14);
    ids.forEach(id => expect(seen.get(id), id).toBeDefined());                         // none vanishes
    const where = (id: string) => seen.get(id)!.filter(f => f !== 'reserves')[0];   // an order with a reservation open is also under "Réserves"
    expect(where('dl_demo_13')).toBe('running');           // delivered, to be received
    expect(where('dl_demo_4')).toBe('running');            // a milestone that is not conform
    expect(where('dl_demo_12')).toBe('running');           // refused
    expect(where('dl_demo_9')).toBe('toship');             // to release
    expect(where('dl_demo_6')).toBe('toship');             // released
    expect(where('dl_demo_10')).toBe('toship');            // delivered in part
    expect(where('dl_demo_1')).toBe('received');
    expect(where('dl_demo_14')).toBe('archived');
    expect(seen.get('dl_demo_2')).toEqual(['reserves']);    // "avec réserve": its own filter, and only that one
    expect(seen.get('dl_demo_3')).toEqual(['reserves']);    // a reservation open late
    await m.unmount();
  });
  it('the states are shared between the filters with no state left out and none twice (a state added that no filter holds fails here)', SLOW, async () => {
    const held = Object.values(FILTERS).flat();
    expect([...new Set(held)].sort()).toEqual(Object.keys(DELIVERY_STATE).sort());
    expect(held).toHaveLength(new Set(held).size);
    expect(new Set(Object.values(stateNow().deliveries).map(d => deliveryState(d, NOW, stateNow().params))).size).toBeGreaterThan(8);
  });
  it('tell how many orders each one holds: the four filters of the states and "Réserves" (the two orders with a reservation open) add up to the 14 orders', SLOW, async () => {
    const { m } = await register();
    const n = (re: RegExp) => +plain([...filterSel().options].find(o => re.test(plain(o.textContent)))!.textContent).match(/(\d+)$/)![1];
    expect(n(FILTER.running) + n(FILTER.toship) + n(FILTER.received) + n(FILTER.archived)).toBe(12);   // dl_demo_2 and dl_demo_3 are under "Réserves" only
    expect(n(FILTER.reserves)).toBeGreaterThanOrEqual(2);
    await m.unmount();
  });
});

describe('the search', () => {
  it('reads the number of the PV and of the delivery note, in every filter: the one that holds nothing says where the orders are, and writes nothing', SLOW, async () => {
    const { m } = await register();
    await typeIn(search(), 'PV-2026-002');
    expect(list()).toContain('Aucune commande ne contient « PV-2026-002 » dans ce filtre. 1 dans « Réceptionnées ».');
    expect(listed()).toEqual([]);
    await pickFilter('received');
    expect(listed()).toEqual(['dl_demo_1']);
    await typeIn(search(), '');
    expect(listed().length).toBeGreaterThan(1);
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('every word must be found (a customer and a deliverable together); capitals and accents do not matter', SLOW, async () => {
    const { m } = await register();
    await typeIn(search(), 'PORTILLONS client b');
    expect(listed()).toEqual(['dl_demo_13', 'dl_demo_4']);   // the two orders of Client B that say "Portillons"
    await typeIn(search(), 'portillons serie');
    expect(listed()).toEqual(['dl_demo_13']);                // "Portillons, série 3": no accent typed, one order left
    await typeIn(search(), 'portillons banquettes');
    expect(listed()).toEqual([]);
    await m.unmount();
  });
  it('a key typed starts the list again from its first page, and a customer filter is taken off with its button', SLOW, async () => {
    const { m } = await register('client:Client B');
    expect(text()).toContain('Client : Client B');
    expect(listed().every(id => stateNow().deliveries[id].client === 'Client B')).toBe(true);
    await click(button(/^Retirer le filtre du client Client B/));
    expect(text()).not.toContain('Client : Client B');
    await m.unmount();
  });
});

describe('a tile that filters', () => {
  it('filters the list and brings it into view when it sits low on the screen (not when it is already in sight)', SLOW, async () => {
    const scroll = vi.fn();
    (Element.prototype as unknown as Record<string, unknown>).scrollIntoView = scroll;
    const { m } = await register();
    const rect = (top: number) => { document.getElementById('rc-list')!.getBoundingClientRect = () => ({ top, bottom: top + 400, left: 0, right: 300, width: 300, height: 400, x: 0, y: top, toJSON: () => ({}) }); };
    rect(900);                                              // below the fold of the window (768 px)
    await click(button(/^Réserves à lever/));
    await tick(40);
    expect(filterSel().value).toBe('reserves');
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    rect(120);                                              // already in sight
    await click(button(/^En cours\d/));                     // the tile "En cours" (the filter says "En cours 5", with a space)
    await tick(40);
    expect(filterSel().value).toBe('running');
    expect(scroll).toHaveBeenCalledTimes(1);
    await m.unmount();
  });
});

describe('the addresses', () => {
  it('"jalon:<id>" opens the checks full screen, "reception:<id>" the reception, and the token stays in the address while they are open', SLOW, async () => {
    const { m, clearFocus } = await register('jalon:dl_demo_5');
    expect(top().getAttribute('aria-label')).toContain('Contrôle des jalons');
    expect(text()).toContain('Qui contrôle ?');
    expect(window.location.hash).toBe('#3.4~jalon%3Adl_demo_5');
    expect(clearFocus).not.toHaveBeenCalled();             // the token is kept: a refresh opens it again
    await m.unmount();
    const r = await register('reception:dl_demo_13');
    expect(top().getAttribute('aria-label')).toContain('Réception de la commande');
    expect(window.location.hash).toBe('#3.4~reception%3Adl_demo_13');
    expect(r.clearFocus).not.toHaveBeenCalled();
    await r.m.unmount();
  });
  it('closing a full screen forgets the token and shows the register again', SLOW, async () => {
    const { m, clearFocus } = await register('jalon:dl_demo_5');
    await click(button(/^Fermer l'écran/));
    expect(clearFocus).toHaveBeenCalledTimes(1);
    expect(all('[role=dialog]')).toHaveLength(0);
    await m.unmount();
  });
  it('"<id>:<tab>" opens the sheet on its tab and the token is let go; a full screen never stays open under it', SLOW, async () => {
    const { m, clearFocus } = await register('dl_demo_5:milestones');
    expect(all('[role=tab]').find(t => t.getAttribute('aria-selected') === 'true')!.textContent).toContain('Jalons');
    expect(clearFocus).toHaveBeenCalledTimes(1);
    expect(all('[role=dialog]').filter(d => d.getAttribute('aria-label')?.includes('Contrôle des jalons'))).toHaveLength(0);
    await m.unmount();
  });
  it('"new" opens a new order; "new:quote:<id>" opens the order that already follows that quote instead of making a second one', SLOW, async () => {
    const a = await register('new');
    expect(top().textContent).toContain('Nouvelle commande');
    await a.m.unmount();
    const q = Object.values(stateNow().deliveries).find(d => d.quoteId)!;
    const b = await register(`new:quote:${q.quoteId}`);
    expect(top().textContent).not.toContain('Nouvelle commande depuis le devis');
    expect(all('[role=tab]')).toHaveLength(5);              // the sheet of the order that exists
    expect(text()).toContain(q.ref);
    await b.m.unmount();
  });
  it('"client:<name>" shows the orders of that customer, in the filter that holds some', SLOW, async () => {
    const { m } = await register('client:Client A');
    expect(text()).toContain('Client : Client A');
    expect(listed().length).toBeGreaterThan(0);
    expect(listed().every(id => stateNow().deliveries[id].client === 'Client A')).toBe(true);
    await m.unmount();
  });
  it('an order that does not exist, or a key of the prototype, says "Commande introuvable" and opens no screen', SLOW, async () => {
    for (const f of ['dl_inconnue', 'constructor', '__proto__', 'toString:milestones', 'jalon:constructor', 'reception:__proto__', 'jalon:dl_inconnue']) {
      const { m } = await register(f);
      expect(text(), f).toContain('Commande introuvable');
      expect(all('[role=tab]'), f).toHaveLength(0);
      await click(button(/^Fermer$/, top()));
      expect(text(), f).not.toContain('Cette commande n\'existe pas sur cet appareil');
      await m.unmount();
    }
  });
});

describe('an empty register', () => {
  it('offers a first order and the example, and the example fills the register in one write', SLOW, async () => {
    seed(blankState('industrie', NOW));
    const { m } = await register();
    expect(text()).toContain('Réceptions : des commandes contrôlées à chaque jalon');
    expect(button(/^Nouvelle commande/)).toBeDefined();
    await click(button(/^Voir un exemple traité/));
    expect(fake.writes).toBe(1);
    expect(Object.keys(stateNow().deliveries).length).toBeGreaterThan(5);
    expect(text()).toContain('Commandes suivies');
    await m.unmount();
  });
});

describe('a new order', () => {
  it('"Nouvelle commande" asks the customer, then the sheet of the new order opens on it, and it is written 1,2 s later', SLOW, async () => {
    const { m } = await register();
    const before = Object.keys(stateNow().deliveries).length;
    await click(button(/^Nouvelle commande/));
    await typeIn(top().querySelectorAll('input')[0] as HTMLInputElement, 'Client B');
    await click(button(/^Créer la commande/));
    expect(all('[role=tab]')).toHaveLength(5);
    expect(top().textContent).toContain('Client B');
    await tick(1300);
    expect(Object.keys(stateNow().deliveries)).toHaveLength(before + 1);
    expect(Object.values(stateNow().deliveries).filter(d => d.client === 'Client B' && d.ref === '')).toHaveLength(1);
    await m.unmount();
  });
});
