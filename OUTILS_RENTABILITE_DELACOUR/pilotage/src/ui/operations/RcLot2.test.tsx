// Lot 2 of tool 3.4 on the screen side (static render; the store is a stub, the effects and the dialogs are checked in the browser): the tile "X sur N" is counted, not rebuilt from a rounded
// percentage (D-15), the promised day is the one `promisedOn` gives and a changed quote is said (L-5), the next delivery of a received one waits for its signed PV (D-6), quantities are read
// in French (D-20), the tasks dated by their finding are never "en retard" (D-14), the identity of the order is read only once a closed delivery is signed (reliquat du lot 1).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import type { Delivery, Quote, ReceptionTodo, State, Strokes } from '../../domain/types';
import { blankState } from '../../domain/templates';
import { addDays } from '../../domain/base';
import { isoDate } from '../../domain/periods';
import { checkMilestone, isLocked, lotsOf, newDelivery, nextPresentation, rcDay, releaseDelivery, setQuantities, setReceptionist, setResult, signClient, startReception } from '../../domain/receptions';
import { Receptions } from './Receptions';
import { RcCard } from './RcCards';
import { RcQueue } from './RcQueue';
import { RcTabFollow } from './RcTabFollow';
import { RcTabOrder } from './RcTabOrder';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false, teamView: false }) }));
const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const at = '2026-09-10T10:00', pad: Strokes = [[[10, 20], [60, 70], [110, 30], [160, 80], [210, 40], [260, 70]]];
const fresh = (): State => blankState('industrie', new Date(2026, 8, 25, 10, 0));
const props = (d: Delivery, s: State) => ({ d, saved: s.deliveries[d.id], set: noop, act: noop, state: s, nav, close: noop });
const btn = (text: string) => new RegExp(`<button[^>]*disabled=""[^>]*>(?:<svg[^>]*>.*?</svg>)?${text}`, 's');
// an order of 2, checked, released, delivered, one received without reservation (partial)
function received(s: State, sign: boolean): Delivery {
  let d: Delivery = { ...newDelivery(s.params), ref: 'CMD-88', client: 'Client Test', item: 'Portail', qty: 2, promisedAt: '2026-09-12' };
  d.milestones.forEach(m => { d = checkMilestone(d, m.id!, { ok: true, by: 'Paul', at }); });
  d = releaseDelivery(d, { by: 'Paul', at }, s);
  d = startReception(d, { at, by: 'Paul' });
  d = setReceptionist(d, { name: 'Martin' });
  d = setQuantities(d, { qty: 1 }, 'Paul', at);
  d = setResult(d, 'sans', at, 'Paul');
  s.deliveries[d.id] = d;
  if (sign) { d = signClient(d, pad, at, 'Paul', s); s.deliveries[d.id] = d; }
  return d;
}

beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, matchMedia: () => ({ matches: false }) }); });

describe('lot 2, D-15: the tile "X sur N réceptions" is counted', { timeout: 30000 }, () => {
  it('says 50 sur 101 (it said 51 sur 101 when it was rebuilt from the rounded percentage)', () => {
    const s = fresh(), day = addDays(isoDate(new Date()), -3);
    for (let i = 0; i < 101; i++) {
      const d = newDelivery(s.params);
      s.deliveries[d.id] = { ...d, ref: `CMD-${i}`, client: 'Client Test', item: 'Pièce', reception: { ...d.reception, date: day, result: i < 50 ? 'sans' : 'reserve', noSign: { kind: 'absent', witness: 'Témoin', at: `${day}T10:00` } } };
    }
    store.state = s;
    const html = renderToStaticMarkup(<Receptions nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain(plain('50 sur 101 réceptions, 12 derniers mois'));
    expect(html).not.toContain(plain('51 sur 101'));
  });
});

describe('lot 2, L-5: the promised day', { timeout: 30000 }, () => {
  const quote = (weeks: number): Quote => ({ id: 'q_1', ref: 'DV-1', client: 'Client Test', object: 'Portail', status: 'won', decidedAt: '2026-09-01', weeks } as unknown as Quote);
  it('says it when the quote now promises another day than the order, and offers to take it', () => {
    const s = fresh(); s.quotes.q_1 = quote(6);   // 1 September + 6 weeks = 13 October
    const d = { ...newDelivery(s.params), ref: 'CMD-1', client: 'Client Test', item: 'Portail', quoteId: 'q_1', promisedAt: '2026-10-08' };
    const html = renderToStaticMarkup(<RcTabOrder {...props(d, s)} />);
    expect(html).toContain(plain(`La date promise du devis est maintenant le ${rcDay('2026-10-13')} ; la commande garde le ${rcDay('2026-10-08')}`));   // the full stop of "oct." is the one of the sentence
    expect(html).toContain(plain('Reprendre la date du devis'));
    const same = renderToStaticMarkup(<RcTabOrder {...props({ ...d, promisedAt: '2026-10-13' }, s)} />);
    expect(same).not.toContain(plain('La date promise du devis est maintenant'));
    expect(renderToStaticMarkup(<RcTabOrder {...props({ ...d, quoteId: undefined }, s)} />)).not.toContain(plain('La date promise du devis est maintenant'));
  });
  it('reads the day of the quote on the card when the order has none', () => {
    const s = fresh(); s.quotes.q_1 = quote(6);
    const d = { ...newDelivery(s.params), ref: 'CMD-1', client: 'Client Test', item: 'Portail', quoteId: 'q_1' };
    const html = renderToStaticMarkup(<RcCard d={d} state={s} todos={[]} now={new Date(2026, 8, 25, 10, 0)} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    expect(html).toContain(plain('Promise le 13 oct.'));
    expect(renderToStaticMarkup(<RcTabOrder {...props(d, s)} />)).toContain(plain(`Vide : la date promise du devis, le ${rcDay('2026-10-13')}, est lue.`));
  });
});

describe('lot 2, D-6: the next delivery waits for the signed PV', { timeout: 30000 }, () => {
  it('says it as a fact and closes the button while the PV of a received delivery is not signed', () => {
    const s = fresh(), d = received(s, false), html = renderToStaticMarkup(<RcTabFollow {...props(d, s)} />);
    expect(html).toContain(plain("PV non signé : la livraison suivante n&#x27;est pas ouverte."));
    expect(html).toMatch(btn('Ouvrir la livraison suivante'));
  });
  it('opens it once the PV is signed, and for a closed delivery says it is not signed', () => {
    const s = fresh(), d = received(s, true), html = renderToStaticMarkup(<RcTabFollow {...props(d, s)} />);
    expect(html).not.toContain(plain('PV non signé : la livraison suivante'));
    expect(html).not.toMatch(btn('Ouvrir la livraison suivante'));
    const old = { ...d, lots: [{ ...nextPresentation(d, 'Paul', at).lots![0], signClient: undefined }] };   // an old closed delivery with no signature
    expect(renderToStaticMarkup(<RcTabFollow {...props({ ...nextPresentation(d, 'Paul', at), lots: old.lots }, s)} />)).toContain(plain('PV non signé'));
  });
});

describe('lot 2, the identity of the order once a closed delivery is signed (reliquat du lot 1)', { timeout: 30000 }, () => {
  it('reads the identity fields as read only, with "Corriger la commande", and leaves the people and the model of the delivery under way', () => {
    const s = fresh(), d = nextPresentation(received(s, true), 'Paul', at);
    expect(lotsOf(d).some(l => isLocked(l)) && !isLocked(d)).toBe(true);
    const html = renderToStaticMarkup(<RcTabOrder {...props(d, s)} />);
    expect(html).toContain(plain('Une livraison close a un PV signé'));
    expect(html).toContain(plain('Corriger la commande'));
    ['Numéro de commande', 'Client', 'Livrable', 'Quantité commandée', 'Date de livraison promise', 'Numéro de lot', 'Numéro de série', 'Matière ou version'].forEach(l => expect(html, l).toMatch(new RegExp(`<span[^>]*>${l}</span><(?:input|select)[^>]*disabled=""`)));
    const open = renderToStaticMarkup(<RcTabOrder {...props(newDelivery(s.params), s)} />);
    expect(open).not.toContain(plain('Une livraison close a un PV signé'));
    expect(open).not.toContain(plain('disabled=""'));
  });
});

describe('lot 2, D-20 and D-14: quantities in French, tasks dated by their finding', { timeout: 30000 }, () => {
  it('writes the quantities with a comma, and agrees "reçue" with the number', () => {
    const s = fresh();
    let d: Delivery = { ...newDelivery(s.params), ref: 'CMD-9', client: 'Client Test', item: 'Tôle', qty: 0.8 };
    d = setQuantities(startReception(d, { at, by: 'Paul' }), { qty: 0.7 }, 'Paul', at);
    d = setResult(d, 'sans', at, 'Paul');
    const html = renderToStaticMarkup(<RcCard d={d} state={s} todos={[]} now={new Date(2026, 8, 25, 10, 0)} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    expect(html).toContain(plain('0,7 reçue sur 0,8'));
    expect(html).not.toMatch(/\b0\.[78]\b|\de-\d/);
    const tab = renderToStaticMarkup(<RcTabFollow {...props(d, s)} />);
    expect(tab).toContain(plain('reste à livrer : 0,1.'));
  });
  it('never calls "en retard" a task whose day is the one of its finding', () => {
    const s = fresh(), d = newDelivery(s.params);
    s.deliveries[d.id] = { ...d, ref: 'CMD-5', client: 'Client Test' };
    const t = (kind: ReceptionTodo['kind'], text: string): ReceptionTodo => ({ id: `${kind}:${d.id}`, kind, text, tone: 'bad', who: '', due: '2026-08-01', deliveryId: d.id });
    const html = renderToStaticMarkup(<RcQueue state={s} onOpen={noop} todos={[t('blocked', 'Traiter le jalon 2 de CMD-5'), t('refused', 'Donner suite à la livraison refusée de CMD-5')]} />);
    expect(html).not.toContain(plain('en retard'));
    expect(html).toContain(plain('refusée le 1 août'));
  });
});
