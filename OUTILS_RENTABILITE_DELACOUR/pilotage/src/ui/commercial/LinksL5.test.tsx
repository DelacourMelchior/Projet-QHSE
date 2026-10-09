// Lot 5 of tool 3.4, links with 2.3 and 2.4 (static render; the store is a stub, the dialog is drawn in place, the effects are checked in the browser):
// the order a complaint is about is chosen in the list of the customer's orders and only that one is cited (L-4), the number of deliveries typed for the month goes back
// to the count of 3.4 (L-17), a customer whose organisation was renamed in the directory is still "in the directory" (L-3).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Complaint, Delivery, State } from '../../domain/types';
import { blankState } from '../../domain/templates';
import { INVESTIGATION, newComplaint, newFeedback } from '../../domain/commercial';
import { newDelivery } from '../../domain/receptions';
import { periodOfDate } from '../../domain/periods';
import { ComplaintSheet, Reclamations } from './Reclamations';
import { ClientSheet } from './BilanClients';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false, teamView: false, folder: { status: 'none' } }) }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{children}{footer}</section> }));
const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const now = new Date(2026, 8, 25, 10, 0);
const fresh = (): State => blankState('industrie', now);
const order = (s: State, id: string, over: Partial<Delivery>, re: Partial<Delivery['reception']> = {}): Delivery => {
  const d = newDelivery(s.params);
  return (s.deliveries[id] = { ...d, id, ref: id.toUpperCase(), client: 'Client A', item: `Pièce ${id}`, qty: 4, ...over, reception: { ...d.reception, date: '2026-09-10', name: 'M. Durand', result: 'sans', pvNo: `PV-${id}`, ...re } });
};

beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, matchMedia: () => ({ matches: false }) }); });

describe('2.3 the order a complaint is about (L-4)', () => {
  const setup = () => {
    const s = fresh();
    order(s, 'a', { item: 'Châssis' }, { date: '2026-08-27' });
    order(s, 'b', { item: 'Supports moteur' }, { date: '2026-09-10', result: 'reserve', reserves: [{ id: 'r1', text: 'Rayure', raisedAt: '2026-09-10' }] });
    order(s, 'z', { client: 'Autre' });
    store.state = s;
    // the customer is written as the directory names it; the investigation of "Livraison et réception" is the point that links 3.4
    return { s, c: { ...newComplaint(s, 'Test', now), client: 'Client A (grand compte)', affaire: 'Supports moteur, lot 1', description: 'Rayure', checks: { [INVESTIGATION[0].key]: { state: 'ok', note: '' } } } as Complaint };   // a point of the investigation filled: the block is open in the short view
  };
  const html = (c: Complaint) => renderToStaticMarkup(<ComplaintSheet initial={c} onClose={noop} nav={nav} />);

  it('offers every order of the customer, and cites no PV while none is chosen (it cited the newest one, the wrong one)', () => {
    const { c } = setup();
    const h = html(c);
    expect(h).toContain('Commande en cause');
    expect(h).toContain('Aucune choisie');
    expect(h).toContain('B · Supports moteur');
    expect(h).toContain('A · Châssis');
    expect(h).not.toContain('Pièce z');                                            // another customer's order is not offered
    expect(h).not.toMatch(/Commande [AB] : /);                                    // no order named as a fact
    expect(h).not.toContain('PV n°');
  });

  it('cites the PV of the order that was chosen, as a fact', () => {
    const { c } = setup();
    const h = html({ ...c, deliveryId: 'b' });
    expect(h).toContain('Commande B : PV n° PV-b du 10/09/2026 : avec 1 réserve');
    expect(h).toMatch(/<option value="b" selected/);
  });

  it('says it when the chosen order no longer exists', () => {
    const { c } = setup();
    expect(html({ ...c, deliveryId: 'gone' })).toContain('La commande choisie n&#x27;existe plus dans l&#x27;outil 3.4.');
  });
});

describe('2.3 the deliveries of the month (L-17)', () => {
  const month = periodOfDate(new Date());                                          // the screen reads the month of today
  const screen = (typed?: number) => {
    const s = fresh();
    order(s, 'a', {}, { date: `${month}-05` });
    s.complaints.k = { ...newComplaint(s, 'Test', now), id: 'k', client: 'Client A', description: 'Retard' };
    if (typed !== undefined) s.params.monthDeliveries = { [month]: typed };
    store.state = s;
    return renderToStaticMarkup(<Reclamations nav={nav} focus="" clearFocus={noop} />);
  };
  it('offers "Revenir au calcul" once a number is typed, and says what 3.4 counts', () => {
    const typed = screen(40);
    expect(typed).toContain('Revenir au calcul');
    expect(typed).toContain('nombre saisi ; l&#x27;outil 3.4 en compte 1');
  });
  it('offers nothing to go back to while the count of 3.4 is the one used', () => {
    const h = screen();
    expect(h).not.toContain('Revenir au calcul');
    expect(h).toContain('compté depuis les livraisons de l&#x27;outil 3.4');
  });
});

describe('2.4 a customer whose organisation was renamed in the directory (L-3)', () => {
  it('is in the directory, not offered to be added again (it made a second organisation)', () => {
    const s = fresh();
    s.orgs.o = { id: 'o', name: 'Client A SAS', category: 'client', phone: '04 00 00 00 00', email: '', address: '', reference: '' };
    s.feedbacks.f = { ...newFeedback(now), id: 'f', client: 'Client A', contact: 'M. Durand', q1: true, q2: true, q3: 9, date: '2026-09-10', orgId: 'o' };
    order(s, 'a', { orgId: 'o', client: 'Client A SAS' });
    store.state = s;
    const h = renderToStaticMarkup(<ClientSheet name="Client A" nav={nav} onClose={noop} onOpenFeedback={noop} onNew={noop} />);
    expect(h).toContain('Client A SAS');
    expect(h).toContain('standard 04 00 00 00 00');
    expect(h).not.toContain('pas encore dans l&#x27;annuaire');
    expect(h).not.toContain('Ajouter à l&#x27;annuaire');
    expect(h).toContain('1 réception');                                                    // the card of 3.4 finds its order
    expect(h).toContain('client%3AClient%20A%20SAS');                                         // and opens the filter under the name the order shows now
  });
  it('is offered to the directory when it is nowhere in it', () => {
    const s = fresh();
    s.feedbacks.f = { ...newFeedback(now), id: 'f', client: 'Client Z', contact: 'Mme Z', q1: true, q2: true, q3: 9, date: '2026-09-10' };
    store.state = s;
    const h = renderToStaticMarkup(<ClientSheet name="Client Z" nav={nav} onClose={noop} onOpenFeedback={noop} onNew={noop} />);
    expect(h).toContain('Ajouter à l&#x27;annuaire (organisation et 1 personne interrogée)');
  });
});
