// The cards, the lines and the queue of tool 3.4 render for every order of the example: the milestones in words, no amount, nothing undefined.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { receptionSummary } from '../../domain/receptionsAll';
import { demoState } from '../../domain/templates';
import { RcCard, RcLine } from './RcCards';
import { RcQueue } from './RcQueue';
import { Receptions } from './Receptions';
import { receptionTodos } from '../../domain/receptionsAll';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false, teamView: false }) }));

describe('screen of the receptions', { timeout: 30000 }, () => {
  const now = new Date(2026, 8, 25, 10, 0), state = demoState(now), { todos } = receptionSummary(state, now), ds = Object.values(state.deliveries);
  const p = (d: typeof ds[number]) => ({ d, state, todos, now, onOpen() {}, onField() {}, onPrint() {}, menu: [{ label: 'Archiver', run() {} }] });
  it('draws a card and a line for every order, without amount nor undefined text', () => {
    expect(ds.length).toBeGreaterThan(5);
    ds.forEach(d => [<RcCard {...p(d)} />, <RcLine {...p(d)} />].forEach(el => {
      const html = renderToStaticMarkup(el);
      expect(html, d.id).toMatch(/jalons? sur \d/);
      expect(html, d.id).not.toMatch(/€|undefined|NaN|\[object/);
    }));
  });
  // a PV whose stored text was changed by hand: the card and the line say it in red and in words, the queue asks to check it ("Vérifier"); the intact example says nothing
  it('says a PV whose content no longer matches its seal on the card, on the line and in the queue', () => {
    const signedOrder = ds.find(d => d.reception.seals?.length)!, hand = structuredClone(state);
    expect(renderToStaticMarkup(<RcCard {...p(signedOrder)} />)).not.toContain(plain('Scellé modifié'));
    hand.deliveries[signedOrder.id].reception.name = "Quelqu'un d'autre";
    const todos2 = receptionTodos(hand, now), d2 = hand.deliveries[signedOrder.id], q = (x: typeof d2) => ({ d: x, state: hand, todos: todos2, now, onOpen() {}, onField() {}, onPrint() {}, menu: [] });
    expect(todos2.filter(t => t.kind === 'seal').map(t => t.deliveryId)).toEqual([signedOrder.id]);
    [<RcCard {...q(d2)} />, <RcLine {...q(d2)} />].forEach(el => expect(renderToStaticMarkup(el)).toContain(plain('Scellé modifié')));
    expect(renderToStaticMarkup(<RcCard {...q(hand.deliveries[ds.find(d => d.id !== signedOrder.id)!.id])} />)).not.toContain(plain('Scellé modifié'));
    const html = renderToStaticMarkup(<RcQueue todos={todos2} state={hand} onOpen={() => {}} />);
    expect(html).toContain(plain('Vérifier le PV'));
    expect(html).toContain(plain('son contenu ne correspond plus au scellé'));
  });
  it('lists the tasks with the order they concern, and says when there is nothing to do', () => {
    const html = renderToStaticMarkup(<RcQueue todos={todos} state={state} onOpen={() => {}} />);
    expect(html).toContain(plain(`À faire : ${todos.length}`));
    expect(renderToStaticMarkup(<RcQueue todos={[]} state={state} onOpen={() => {}} />)).toContain(plain('Rien à faire'));
  });
});

// The register at the top of the page (static render, the date fixed): the first action next to the question, the four tiles coloured by what they say, the same words for a tile and its filter,
// the filters that wrap instead of scrolling, the views under one button on a phone, the list that a tile reaches
describe('crit F2a: the register', { timeout: 30000 }, () => {
  afterEach(() => { vi.useRealTimers(); });
  const now = new Date(2026, 8, 25, 10, 0), draw = (state: unknown) => { vi.useFakeTimers({ now }); store.state = state; return renderToStaticMarkup(<Receptions nav={{ tool() {} } as never} focus="" clearFocus={() => {}} />); };
  const tile = (html: string, title: string) => { const i = html.indexOf(`>${title}<`); return html.slice(Math.max(html.lastIndexOf('<button', i), html.lastIndexOf('<div class="rounded-lg border', i)), i); };   // the opening tag of the tile that says `title` (a button when it filters, else a div)
  it('has "Nouvelle commande" once, next to the question and before the queue; the list has an anchor under the sticky header', () => {
    const html = draw(demoState(now));
    expect(html.match(/Nouvelle commande/g)).toHaveLength(1);
    expect(html.indexOf('Nouvelle commande')).toBeLessThan(html.indexOf('À faire :'));
    expect(html.indexOf('Nouvelle commande')).toBeGreaterThan(html.indexOf('Les commandes sont-elles'));
    expect(html).toMatch(/id="rc-list" class="scroll-mt-36"/);
  });
  it('colours a tile by its fact: nothing amber by default, green only when it is good, red when it is serious', () => {
    const html = draw(demoState(now));
    expect(tile(html, 'Reçues sans réserve')).toMatch(/^<button .*aria-pressed/);       // the tile that is read is a whole opening tag
    expect(tile(html, 'Reçues sans réserve')).toMatch(/border-slate-200/);              // 63 %: neutral
    expect(tile(html, 'Réserves à lever')).toMatch(/border-red-300/);            // one reservation late
    expect(tile(html, 'En cours')).toMatch(/border-red-300/);                    // a milestone not conform
    expect(tile(html, 'À libérer ou à livrer')).toMatch(/border-amber-300/);     // one order to release
    const calm = demoState(now);
    calm.deliveries = Object.fromEntries(Object.entries(calm.deliveries).filter(([, d]) => d.reception.result === 'sans' && !d.reception.reserves?.length && !d.lots?.length && !d.archivedAt));   // only orders received without reservation
    expect(Object.keys(calm.deliveries).length).toBeGreaterThan(0);
    const quiet = draw(calm);
    expect(tile(quiet, 'Reçues sans réserve')).toMatch(/border-emerald-200/);          // 100 %: green
    expect(tile(quiet, 'Réserves à lever')).toMatch(/border-emerald-200/);      // none open: green
    expect(tile(quiet, 'En cours')).toMatch(/border-slate-200/);                // nothing wrong: neutral
    expect(quiet).not.toMatch(/border-(?:amber|red)-300/);
  });
  it('says the same words on the tile and on the filter, the filters wrap, and the views sit under one button on a phone', () => {
    const html = draw(demoState(now));
    expect(html.match(/À libérer ou à livrer/g)!.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toMatch(/>À livrer</);
    expect(html).not.toContain(plain('overflow-x-auto'));
    expect(html).toMatch(/aria-expanded="false"[^>]*sm:hidden[^>]*>Affichage : (?:cartes|liste)/);
    expect(html).toMatch(/max-sm:hidden[^"]*"><div class="flex flex-wrap[^"]*"><button[^>]*aria-pressed="(?:true|false)"[^>]*>Cartes/);   // the three views stay for a wide screen
  });
});
