// The defects declared from an order of 3.4 (a milestone or a reservation) show their order, as a fact, and open it on the right tab.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import { addReserve, ncFromMilestone, ncFromReserve, newDelivery, startReception } from '../../domain/receptions';
import { ncOrderFocus } from '../../domain/quality';
import { OrderLink, orderText } from './BacRouge';

vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: vi.fn(), author: 'Test' }) }));
describe('5.1 defect declared from an order (3.4)', () => {
  const base = demoState(new Date(2026, 8, 25, 10, 0)), noop = () => {};
  const d0 = { ...newDelivery(base.params), ref: 'CMD-9', client: 'Client A' };
  const d = addReserve(startReception(d0, { at: '2026-09-22T09:00', by: 'Luc' }), { text: 'Rayure sur le capot', by: 'Luc', at: '2026-09-22T10:00' });
  const s = { ...base, deliveries: { ...base.deliveries, [d.id]: d } };

  it('opens the order on the tab of its milestones or of its reservations', () => {
    const m = ncFromMilestone(s, d, d.milestones[1], 'Luc'), r = ncFromReserve(s, d, d.reception.reserves![0], 'Luc');
    expect(ncOrderFocus(m)).toBe(`${d.id}:milestones`);
    expect(ncOrderFocus(r)).toBe(`${d.id}:reception:${r.reserveId}`);   // on the reservation itself, whichever delivery holds it
    expect(ncOrderFocus({ deliveryId: d.id })).toBe(d.id);
    expect(ncOrderFocus({})).toBe('');
  });

  it('says the order and the milestone or the reservation, and still does when the defect is edited', () => {
    const m = ncFromMilestone(s, d, d.milestones[1], 'Luc'), r = ncFromReserve(s, d, d.reception.reserves![0], 'Luc');
    const html = (n: typeof m) => renderToStaticMarkup(<OrderLink n={n} s={s} open={noop} />);
    expect(html(m)).toContain(`Commande CMD-9 (3.4) : jalon 2 « ${d.milestones[1].label} »`);
    expect(html(r)).toContain('Commande CMD-9 (3.4) : réserve « Rayure sur le capot »');
    expect(html(m)).toContain('Ouvrir la commande');
    // the sheet writes the whole record back: what is edited changes, the link stays
    const edited = { ...m, description: 'Autre texte', decision: 'retouche' as const };
    expect(ncOrderFocus(edited)).toBe(ncOrderFocus(m));
    expect(html(edited)).toContain('jalon 2');
    // an order that no longer exists is said, the link is kept
    expect(renderToStaticMarkup(<OrderLink n={m} s={{ ...s, deliveries: {} }} open={noop} />)).toContain('existe plus');
  });

  it('finds the reservation of a delivery already closed, and says which delivery (L-20)', () => {
    const rv = d.reception.reserves![0];
    // the first delivery is closed into a lot, the second is under way: the reservation lives in the lot
    const closed = { ...d, lots: [{ id: 'lt1', no: 1, closedAt: '2026-09-23T10:00', milestones: d.milestones, releasedBy: '', releasedAt: '', reception: d.reception }], reception: { ...d.reception, reserves: [], result: '' as const, date: '' } };
    const s2 = { ...base, deliveries: { ...base.deliveries, [closed.id]: closed } };
    const n = ncFromReserve(s2, closed, rv, 'Luc');
    expect(renderToStaticMarkup(<OrderLink n={n} s={s2} open={noop} />)).toContain('Commande CMD-9 (3.4) : réserve « Rayure sur le capot », livraison 1');   // it said the order only, with no reservation
    expect(orderText(n, s2)).toBe('Commande CMD-9 (3.4) : réserve « Rayure sur le capot », livraison 1');
    expect(ncOrderFocus(n)).toBe(`${closed.id}:reception:${rv.id}`);
    expect(orderText(n, { ...s2, deliveries: {} })).toBe('');                       // no order: nothing is said as a fact
    expect(orderText({ ...n, deliveryId: undefined }, s2)).toBe('');
    expect(orderText({ ...n, deliveryId: '__proto__' }, s2)).toBe('');
  });
});
