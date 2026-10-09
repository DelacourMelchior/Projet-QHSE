// The orders touched by a breakdown (3.3) show their state in 3.4 and a button that opens them.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import { newDelivery } from '../../domain/receptions';
import { IssuesTab } from './EqIssuesTab';

vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: vi.fn(), author: 'Test' }) }));
describe('3.3 breakdown and the orders it touched', () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
  it('says the order, its state and the way to open it, for the orders ticked only', () => {
    const base = demoState(new Date(2026, 8, 25, 10, 0)), noop = () => {};
    const hit = { ...newDelivery(base.params), id: 'dl_hit', ref: 'CMD-77', client: 'Client A' }, other = { ...newDelivery(base.params), id: 'dl_other', ref: 'CMD-88', client: 'Client B' };
    const state = { ...base, deliveries: { dl_hit: hit, dl_other: other } };
    const eq = Object.values(base.equipments)[0];
    const e = { ...eq, breakdowns: [{ id: 'bk', date: '2026-09-20', hours: 2, cost: null, cause: 'Panne', deliveryIds: ['dl_hit', 'dl_gone'] }] };
    const html = renderToStaticMarkup(<IssuesTab e={e} state={state} by="Test" set={noop} act={noop} nav={{ tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop }} openStation={noop} saved={e} />);
    expect(html).toContain('Commande CMD-77 · Client A (3.4)');
    expect(html).toContain('En cours');                      // the state of the order, from 3.4
    expect(html).toContain('Ouvrir la commande');
    expect(html).toContain('Commandes touchées : 2');         // the count of the tool is unchanged
    expect(html.split('Ouvrir la commande').length - 1).toBe(1);   // one button: the order that was deleted shows nothing, the one not ticked neither
  });
});
