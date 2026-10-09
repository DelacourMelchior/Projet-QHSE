// Lot 4 of tool 3.4, the register and the queue on a phone (static render; the store is a stub, the taps and the layout are checked in the browser): the queue is one button
// per task with a short word, five more at each tap, "Mes tâches"; the cards name their two buttons; the search reads the PV and the delivery note; the settings are closed
// sections; a group of radios has one tab stop and the arrows.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import type { Delivery } from '../../domain/types';
import { receptionSummary } from '../../domain/receptionsAll';
import { demoState } from '../../domain/templates';
import { RcCard, searchText } from './RcCards';
import { dayWords, PeoplePick, radioKeys, rcDay, RcFindings, RcTile } from './RcBits';
import { RcQueue } from './RcQueue';
import { RcSettings } from './RcSettings';
import { Receptions } from './Receptions';

const now = new Date(2026, 8, 25, 10, 0), state = demoState(now), base = receptionSummary(state, now).todos[0];
const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false, teamView: false }) }));
const tasks = (n: number, who = '') => Array.from({ length: n }, (_, i) => ({ ...base, id: `x${i}`, who }));

describe('lot 4, the queue "À faire"', { timeout: 30000 }, () => {
  afterEach(() => { delete (globalThis as { window?: unknown }).window; });
  it('is one button per task, with a short word, a short name for a screen reader and the sentence of the task as its description, three tasks at first and five more at each tap', () => {
    const html = renderToStaticMarkup(<RcQueue todos={tasks(11)} state={state} onOpen={() => {}} />);
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain(plain('Voir 5 de plus'));
    expect(html).toMatch(/aria-label="[A-Zé][^":]*"[^>]*aria-describedby="[^"]+"/);   // "Lever CMD-2026-047", the task is read once, as its description
    expect(html).not.toContain(plain('Voir les'));
    expect(renderToStaticMarkup(<RcQueue todos={tasks(2)} state={state} onOpen={() => {}} />)).not.toContain(plain('de plus'));
  });
  it('writes the days as everywhere else on the screen', () => {
    expect(dayWords('Lever la réserve depuis le 04/10/2026, puis le 30/09/2026')).toBe(`Lever la réserve depuis le ${rcDay('2026-10-04')}, puis le ${rcDay('2026-09-30')}`);
    expect(renderToStaticMarkup(<RcQueue todos={[{ ...base, text: 'Traiter le jalon depuis le 04/10/2026' }]} state={state} onOpen={() => {}} />)).toContain(plain(`depuis le ${rcDay('2026-10-04')}`));
  });
  it('offers "Mes tâches" only when a person is picked for the session, with the number of their tasks', () => {
    const todos = [...tasks(2, 'Marc M.'), ...tasks(1, 'Anne')].map((t, i) => ({ ...t, id: `y${i}` }));
    expect(renderToStaticMarkup(<RcQueue todos={todos} state={state} onOpen={() => {}} />)).not.toContain(plain('Mes tâches'));
    (globalThis as { window?: unknown }).window = { sessionStorage: { getItem: () => 'marc m.', setItem() {} } };
    expect(renderToStaticMarkup(<RcQueue todos={todos} state={state} onOpen={() => {}} />)).toContain(plain('Mes tâches : 2'));
  });
});

describe('lot 4, the cards', { timeout: 30000 }, () => {
  const d = Object.values(state.deliveries)[0] as Delivery;
  const p = (x: Delivery) => ({ d: x, state, todos: [], now, onOpen() {}, onField() {}, onPrint() {}, menu: [] });
  it('names its ONE button (the next step), and an archived order keeps the menu only', () => {
    const html = renderToStaticMarkup(<RcCard {...p(d)} />);
    expect(html).toContain(plain('>Réception</button>'));          // received: the reception is the step
    expect(html).not.toContain(plain('>Contrôler</button>'));       // the other full screen is behind "…"
    const running = Object.values(state.deliveries).find(x => !x.releasedAt && !x.reception.date && !x.archivedAt)!;
    const r = renderToStaticMarkup(<RcCard {...p(running)} />);
    expect(r).toContain(plain('>Contrôler</button>'));
    expect(r).not.toContain(plain('>Réception</button>'));
    expect(html).toContain(plain('Autres actions'));
    const gone = renderToStaticMarkup(<RcCard {...p({ ...d, archivedAt: '2026-09-01' })} />);
    expect(gone).not.toContain(plain('>Contrôler</button>'));
    expect(gone).toContain(plain('Autres actions'));
  });
  it('is found by the number of its PV, of its delivery note and by those of its closed deliveries', () => {
    const lot = { ...d, id: 'l1', no: 1, closedAt: '2026-09-02', reception: { ...d.reception, pvNo: 'PV-2026-003', bl: 'BL-77' } };
    const x = { ...d, reception: { ...d.reception, pvNo: 'PV-2026-014', bl: 'BL-9001' }, lots: [lot] };
    ['pv-2026-014', 'bl-9001', 'pv-2026-003', 'bl-77'].forEach(w => expect(searchText(x, state), w).toContain(plain(w)));
    expect(searchText({ ...d, reception: { ...d.reception, pvNo: undefined, bl: undefined }, lots: [] }, state)).not.toContain(plain('pv-2026'));
  });
});

describe('lot 4, the summary on a phone', { timeout: 30000 }, () => {
  it('writes the tile like every other tool: the title, the figure and the facts under it', () => {
    const html = renderToStaticMarkup(<RcTile title="Reçues sans réserve" value="63 %" sub="5 sur 8 réceptions" tone="warn" onClick={() => {}} />);
    expect(html).toContain(plain('Reçues sans réserve'));
    expect(html).toContain(plain('5 sur 8 réceptions'));
    expect(html).not.toMatch(/sr-only/);
  });
  it('folds the messages behind "N constats" and tells their days like the rest', () => {
    const items = [1, 2, 3, 4].map(i => ({ key: `k${i}`, tone: 'warn' as const, title: `Titre ${i}`, text: `depuis le 04/10/2026 (${i})` }));
    const html = renderToStaticMarkup(<RcFindings items={items} />);
    expect(html).toContain(plain('4 constats'));
    expect(html).toContain(plain('aria-expanded="false"'));
    expect(html).toContain(plain('Voir 1 autre constat'));
    expect(renderToStaticMarkup(<RcFindings items={[...items, ...items.map(x => ({ ...x, key: `${x.key}b` }))]} />)).toContain(plain('Voir les 5 autres constats'));
    expect(html).toContain(plain('depuis le 4 oct. (1)'));
    expect(renderToStaticMarkup(<RcFindings items={[]} />)).toBe('');
  });
});

describe('lot 4, a group of radios', { timeout: 30000 }, () => {
  const pick = (value: string) => renderToStaticMarkup(<PeoplePick value={value} onChange={() => {}} names={['Anne', 'Marc']} label="Contrôlé par" />);
  it('has one tab stop: the one ticked, else the first', () => {
    expect(pick('Marc').match(/tabindex="0"/g)).toHaveLength(1);
    expect(pick('Marc')).toMatch(/aria-checked="true" tabindex="0"[^>]*>Marc</);
    expect(pick('').match(/tabindex="-1"/g)).toHaveLength(2);
    expect(pick('')).toMatch(/aria-checked="false" tabindex="0"[^>]*>Anne</);
  });
  it('moves to the next radio with the arrows, round the group, and ticks it', () => {
    const rs = [0, 1, 2].map(() => ({ focus: vi.fn(), click: vi.fn() }));
    const key = (k: string, at: number) => { const e = { key: k, currentTarget: { querySelectorAll: () => rs }, target: rs[at], preventDefault: vi.fn() }; radioKeys(e as never); return e; };
    expect(key('ArrowRight', 0).preventDefault).toHaveBeenCalled();
    expect(rs[1].focus).toHaveBeenCalled(); expect(rs[1].click).toHaveBeenCalled();
    key('ArrowRight', 2); expect(rs[0].click).toHaveBeenCalled();   // after the last, the first
    key('ArrowLeft', 0); expect(rs[2].click).toHaveBeenCalled();    // before the first, the last
    expect(key('a', 1).preventDefault).not.toHaveBeenCalled();
  });
});

describe('lot 4, the settings', { timeout: 30000 }, () => {
  it('are closed sections by subject, with "Retirer" buttons of 44 px on a touch screen', () => {
    store.state = { ...state, params: { ...state.params, reception: { refusals: ['Documents manquants'], templates: [{ name: 'Mon modèle', milestones: [{ label: 'A', point: 'b', requirement: 'c' }] }] } } };
    (globalThis as { window?: unknown }).window = { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } };
    const html = renderToStaticMarkup(<RcSettings />);
    expect(html.match(/<details/g)!.length).toBeGreaterThanOrEqual(9);
    expect(html).not.toMatch(/<details[^>]* open/);
    ['Délais', 'Clause de retenue', "Motifs d&#x27;un refus", 'Contrôles de départ', 'Personnes qui libèrent', 'Modèles de jalons'].forEach(t => expect(html, t).toContain(plain(t)));
    expect(html).toMatch(/aria-label="Retirer motif 1 : Documents manquants"[^>]*pointer:coarse\)\]:min-w-\[44px\]/);   // the number tells the rows apart
    delete (globalThis as { window?: unknown }).window;
  });
});

describe('lot 4, the empty register', { timeout: 30000 }, () => {
  it('keeps the settings within reach, so the models and the delay are set before the first order', () => {
    store.state = { ...state, deliveries: {} };
    const html = renderToStaticMarkup(<Receptions nav={{ tool() {} } as never} focus="" clearFocus={() => {}} />);
    expect(html).toContain(plain('id="reglages-3-4"'));
    expect(html).toContain(plain('Nouvelle commande'));
  });
});
