// The five tabs of the sheet of an order (Commande, Jalons, Libération, Réception, Suites) and the block of reservations render for every example order and for a new one, without any amount (static
// render; the store is a stub). The sheet itself (autosave, lock, tabs, closing) is played in a DOM by RcSheet.test.tsx.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { newDelivery } from '../../domain/receptions';
import { isoDate } from '../../domain/periods';
import { RcReserves } from './RcReserves';
import { RcTabFollow } from './RcTabFollow';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabOrder } from './RcTabOrder';
import { RcTabReception } from './RcTabReception';
import { RcTabRelease } from './RcTabRelease';

vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: vi.fn(), author: 'Test' }) }));
describe('tabs Commande and Jalons', { timeout: 30000 }, () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
  const state = demoState(new Date(2026, 8, 25, 10, 0)), noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
  it('renders without error and shows no amount', () => {
    [...Object.values(state.deliveries), newDelivery(state.params)].forEach(d => {
      const p = { d, saved: state.deliveries[d.id], set: noop, act: noop, state, nav, close: noop };
      const html = renderToStaticMarkup(<><RcTabOrder {...p} print={noop} /><RcTabMilestones {...p} /></>);
      expect(html, d.id).toContain(plain('QR code de la commande'));
      expect(html, d.id).toContain(plain('Définition du jalon'));
      expect(html, d.id).not.toContain(plain('€'));
    });
  }, 30000);
  it('asks to specify when the model is "Autre"', () => {
    const d = { ...newDelivery(state.params), template: 'Autre' }, p = { d, saved: undefined, set: noop, act: noop, state, nav, close: noop };
    expect(renderToStaticMarkup(<RcTabOrder {...p} />)).toContain(plain('Précisez'));
    expect(renderToStaticMarkup(<RcTabOrder {...p} d={newDelivery(state.params)} />)).not.toContain(plain('Précisez'));
  });
});

describe('tabs Libération, Réception, Suites', { timeout: 30000 }, () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
  const state = demoState(new Date(2026, 8, 25, 10, 0)), noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
  it('renders without error and shows no amount', () => {
    [...Object.values(state.deliveries), newDelivery(state.params)].forEach(d => {
      const p = { d, saved: state.deliveries[d.id], set: noop, act: noop, state, nav, close: noop };
      const html = renderToStaticMarkup(<><RcTabRelease {...p} /><RcTabReception {...p} /><RcTabFollow {...p} /><RcReserves d={d} act={noop} state={state} nav={nav} /></>);
      ['Libération avant départ', 'Contrôle de départ', 'Résultat de la réception', 'Journal de la commande', 'Réserves : ', 'Bon de livraison n°'].forEach(t => expect(html, `${d.id} ${t}`).toContain(plain(t)));
      expect(html, d.id).not.toMatch(/€|facturation/);
    });
  });
  it('lists the reservations of a closed delivery with its number, and offers the 5 whys for one that came back', () => {
    const day = isoDate(new Date()), rv = { id: 'rv_t', text: 'Retouche de peinture', raisedAt: day }, d = structuredClone(state.deliveries.dl_demo_13), other = structuredClone(state.deliveries.dl_demo_1);
    d.lots![0].reception = { ...d.lots![0].reception, date: day, result: 'reserve', refusal: undefined, reserves: [rv] };   // a refused delivery's reservations are no longer followed: the lot is a received one
    other.reception = { ...other.reception, reserves: [{ ...rv, id: 'rv_u' }] };
    const html = renderToStaticMarkup(<RcReserves d={d} act={noop} state={{ ...state, deliveries: { ...state.deliveries, [d.id]: d, [other.id]: other } }} nav={nav} />);
    ['Retouche de peinture', 'Livraison n° 1', 'Lever la réserve', 'Ouvrir un atelier 5 Pourquoi'].forEach(t => expect(html, t).toContain(plain(t)));
  });
});
