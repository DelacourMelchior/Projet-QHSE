// Lot 8 of tool 3.4, accessibility and texts, the screens (L8-UI): the agreements are right at 0, 1 and 2 (A-4), the six sentences that were orders are facts (A-6), a card is named by what it shows
// (A-7), the buttons of a list say which one they are (A-8), one word for one notion (A-13), the model list and the mentions end with "Autre, précisez" (A-14), the full screen holds no second
// landmark and says its title once (A-16, A-19), "conforme après reprise" is told apart by a pattern and in words (A-21). Static render; the store is a stub; the dates are written with the
// functions of the domain (never a year typed in the test: the year is told only when it is not the current one).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
import { demoState } from '../../domain/templates';
import { allReservesOf, de, newDelivery, plural, rcDay, rcMoment, reserveWords } from '../../domain/receptions';
import { receptionSummary } from '../../domain/receptionsAll';
import type { Delivery } from '../../domain/types';
import { FeedbackTrend } from '../commercial/FeedbackTrend';
import { SignaturePad } from '../SignaturePad';
import { cap, dayWords, fmtMoment, jalonsOk, liftDelay, sentence } from './RcBits';
import { qtyPlural, RcCard } from './RcCards';
import { RcNew } from './RcNew';
import { RcReserves } from './RcReserves';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabOrder } from './RcTabOrder';
import { RcTabReception } from './RcTabReception';

// the texts carry the narrow no-break spaces of nb(): read as plain spaces
const render = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

const now = new Date(2026, 8, 25, 10, 0), state = demoState(now), noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const props = (d: Delivery) => ({ d, saved: d, set: noop, act: noop, state, nav, close: noop });
beforeAll(() => { h.state = state; vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' }, matchMedia: () => ({ matches: false }), sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } }); vi.stubGlobal('document', { body: {} }); });

describe('lot 8, A-4: the agreements at 0, 1 and 2', { timeout: 30000 }, () => {
  it('writes a quantity with its word in the French way: singular under 2', () => {
    expect([0, 1, 1.5, 2].map(n => qtyPlural(n, 'reçue'))).toEqual(['0 reçue', '1 reçue', '1,5 reçue', '2 reçues']);
    expect([1, 2].map(n => qtyPlural(n, 'reste', 'restent'))).toEqual(['1 reste', '2 restent']);
  });
  it('agrees the sentences with a number: jalons, delay of a lift, other tasks', () => {
    expect([[0, 3], [1, 1], [1, 3], [3, 3]].map(([a, b]) => jalonsOk(a, b))).toEqual(['0 jalon sur 3 conformes', '1 jalon sur 1 conforme', '1 jalon sur 3 conformes', '3 jalons sur 3 conformes']);
    expect([[1, true], [7, true], [1, false], [0, false]].map(([n, b]) => liftDelay(n as number, b as boolean))).toEqual(['1 jour ouvré', '7 jours ouvrés', '1 jour', '0 jour']);
    expect([1, 2].map(n => plural(n, 'autre tâche', 'autres tâches'))).toEqual(['1 autre tâche', '2 autres tâches']);
  });
  it('ends a sentence with one full stop (a name that ends with an initial, a day that ends with one) and elides "de" before a vowel', () => {
    expect(['Karim T.', 'Reprise faite par Karim T.', 'Reprise faite', `Jalon 3 depuis le ${rcDay('2026-10-04')}`].map(sentence)).toEqual(['Karim T.', 'Reprise faite par Karim T.', 'Reprise faite.', `Jalon 3 depuis le ${rcDay('2026-10-04')}${rcDay('2026-10-04').endsWith('.') ? '' : '.'}`]);
    expect([de('Antoine P.'), de('Karim T.')]).toEqual(["d'Antoine P.", 'de Karim T.']);
    expect(cap('client absent')).toBe('Client absent');
  });
  it('says "autre tâche" and "autres tâches" on a card, and the reservation without a text by its words, never a sentence between quotes', () => {
    const base = receptionSummary(state, now).todos[0], d = state.deliveries[base.deliveryId], card = (n: number) => render(<RcCard d={d} state={state} todos={Array.from({ length: n }, (_, i) => ({ ...base, id: `t${i}` }))} now={now} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    expect(card(2)).toContain('· 1 autre tâche');
    expect(card(3)).toContain('· 2 autres tâches');
    expect(card(3)).not.toMatch(/autre tâches|autres? tâche\(s\)/);
    expect(reserveWords('')).toBe('sans texte (photo seule)');
    expect(reserveWords('Poignée')).toBe('« Poignée »');
  });
  it('writes the name of the person who repaired a reservation without a second full stop, and the day as everywhere else', () => {
    const d = structuredClone(state.deliveries.dl_demo_3), rv = allReservesOf(d)[0];
    d.reception.reserves = [{ ...rv, repairedAt: '2026-09-20', handler: 'Karim T.', liftedAt: undefined }];
    const html = render(<RcReserves d={d} act={noop} state={state} nav={nav} who="Paul" />);
    expect(html).toContain('Reprise faite le');
    expect(html).toContain('par Karim T.<');
    expect(html).not.toContain('Karim T..');
    expect(plain(dayWords('depuis le 04/10/2026'))).toBe(plain(`depuis le ${rcDay('2026-10-04')}`));
    expect(plain(fmtMoment('2026-10-04T09:05'))).toBe(plain(rcMoment('2026-10-04T09:05')));
    expect(plain(fmtMoment('2026-10-04'))).toBe(plain(rcDay('2026-10-04')));
  });
});

describe('lot 8, A-6: the six sentences that were orders are facts', { timeout: 30000 }, () => {
  it('the pad says what the zone is, the customer field what the signature needs, the directory what can be done, the sheet what the tab says', () => {
    expect(render(<SignaturePad value={undefined} onChange={noop} label="Signature du client" />)).toContain('Zone de signature : tracé à la main ou à la souris.');
    const d = state.deliveries.dl_demo_3, tab = render(<RcTabOrder {...props({ ...d, client: '', orgId: undefined })} />);
    expect(tab).toContain("Une organisation de l&#x27;annuaire peut être choisie dans la liste ; sinon le nom est écrit à la main.");
    expect(tab).not.toMatch(/se choisit|s&#x27;écrit/);
  });
  it('the follow-up sheet keeps no verb in the infinitive to read: it names the facts', async () => {
    const { RcTabFollow } = await import('./RcTabFollow');
    const html = render(<RcTabFollow {...props(state.deliveries.dl_demo_1)} />);
    expect(html).toContain("Le bilan se pose depuis l&#x27;onglet Suites.");
    expect(html).toContain('Bilan de fin de commande');
    expect(html).not.toMatch(/fin d&#x27;affaire|se fait à la signature/);
  });
});

describe('lot 8, A-7 and A-8: a name is what is shown, a list of identical buttons says which one', { timeout: 30000 }, () => {
  it('names a card by its reference, its customer and the badge of its state, with the first task as description', () => {
    const base = receptionSummary(state, now).todos[0], d = state.deliveries[base.deliveryId], html = render(<RcCard d={d} state={state} todos={[base]} now={now} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    const name = html.match(/aria-label="(Ouvrir la commande [^"]*)"/)![1];
    expect(name).toContain(d.ref);
    expect(name).toMatch(/ : [A-ZÉ][^,"]*/);
    expect(name).not.toContain(base.text);
    expect(html).toMatch(/aria-describedby="[^"]+ [^"]+"/);
    expect(html).toContain(plain('aria-label="Contrôler : ' + d.ref));   // the visible word is in the name of the quick button (WCAG 2.5.3)
  });
  it('adds the milestone to the buttons that repeat on every milestone of a sheet', () => {
    const d = state.deliveries.dl_demo_4, html = render(<RcTabMilestones {...props(d)} />);
    d.milestones.forEach((_, i) => { expect(html).toContain(`Conforme<span class="sr-only"> pour le jalon ${i + 1}</span>`); expect(html).toContain(`Non conforme<span class="sr-only"> pour le jalon ${i + 1}</span>`); });
    expect(html).toContain('Sans objet<span class="sr-only"> pour le jalon 1</span>');
  });
  it('adds the reservation to the buttons that repeat on every reservation', () => {
    const d = structuredClone(state.deliveries.dl_demo_3);   // the PV not signed: a reservation can still be removed
    d.signClient = undefined; d.pvPhoto = undefined; d.reception = { ...d.reception, signedAt: '', noSign: undefined, seals: undefined };
    const html = render(<RcReserves d={d} act={noop} state={state} nav={nav} who="Paul" />);
    expect(html).toContain('Lever la réserve<span class="sr-only"> 1</span>');
    expect(html).toContain('Reprise faite<span class="sr-only"> pour la réserve 1</span>');
    expect(html).toContain('Retirer la réserve<span class="sr-only"> 1</span>');
  });
});

describe('lot 8, A-13 and A-14: one word for one notion, a list that ends with "Autre, précisez"', { timeout: 30000 }, () => {
  it('says "Quantité livrée", "Lieu de la réception", "Plage attendue", "Autre, précisez"; never "présentée", "(s)", "Avec réserves"', () => {
    const d = state.deliveries.dl_demo_3, html = render(<RcTabReception {...props(d)} />) + render(<RcTabMilestones {...props(state.deliveries.dl_demo_4)} />);
    expect(html).toContain('Quantité livrée dans cette livraison');
    expect(html).toContain('Lieu de la réception (adresse ou site)');
    expect(html).toContain('Plage attendue : ');
    expect(html).toContain('Avec réserve<');
    expect(html).not.toMatch(/présentée|\(s\)|Avec réserves|Bornes|Valeur attendue|site, chantier/);
    expect(html).toContain('Ex. : mm, kg, %');
  });
  it('ends the list of models of a new order with "Autre, précisez"', () => {
    const html = render(<RcNew state={state} onClose={noop} onCreate={noop} />);
    expect(html.lastIndexOf('Autre, précisez')).toBeGreaterThan(html.lastIndexOf('<option value="0"'));
    expect(html).toMatch(/<option value="\d+">Autre, précisez<\/option><\/select>/);
  });
  it('offers "Autre, précisez" with "Client absent" and "Signature refusée" on an order whose PV is not signed', () => {
    const d = newDelivery(state.params), html = render(<RcTabReception {...props({ ...d, ref: 'CMD-1', client: 'Client', reception: { ...d.reception, result: 'sans' } })} />);
    expect(html).toMatch(/Client absent<\/button><button[^>]*>Signature refusée<\/button><button[^>]*>Autre, précisez<\/button>/);
  });
});

describe('lot 8, A-21: "conforme après reprise" is not "conforme"', { timeout: 30000 }, () => {
  it('draws the segment in stripes and tells the number in words on the card', () => {
    const d = structuredClone(state.deliveries.dl_demo_4);
    d.milestones[0] = { ...d.milestones[0], ok: true, history: [{ at: '2026-09-01T10:00', by: 'Marc M.', kind: 'check', ok: false, measured: '' }, { at: '2026-09-02T10:00', by: 'Marc M.', kind: 'rework', ok: true, measured: '' }] };
    const html = render(<RcCard d={d} state={state} todos={[]} now={now} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    expect(html).toContain('repeating-linear-gradient');
    expect(html).toContain('dont 1 après reprise');
    const plainCard = render(<RcCard d={state.deliveries.dl_demo_4} state={state} todos={[]} now={now} onOpen={noop} onField={noop} onPrint={noop} menu={[]} />);
    expect(plainCard).not.toContain('repeating-linear-gradient');
  });
});

describe('lot 8, A-16 and A-19: no second landmark in the full screen, a title said once', { timeout: 30000 }, () => {
  it('draws the frame of the full screens without header, main and footer elements', async () => {
    const { Frame } = await import('./RcMilestone');
    const html = render(<Frame label="Essai" title="CMD-1" said="Début du contrôle" onClose={noop}><h1 data-head>Qui contrôle ?</h1></Frame>);
    expect(html).not.toMatch(/<(header|main|footer)[ >]/);
    expect(html).toContain('data-body');
    expect(html).toContain('data-bar');
    expect(html.match(/Qui contrôle \?/g)).toHaveLength(1);
  });
  it('gives the status chip of a milestone no live region of its own (the region of the frame says the screen)', async () => {
    const { RcMilestone } = await import('./RcMilestone');
    h.state = { ...state };
    const html = render(<RcMilestone id="dl_demo_5" onClose={noop} nav={nav as never} />);
    expect(html.match(/role="status"/g) ?? []).toHaveLength(1);   // the region of the frame only, on the first screen
  });
});

describe('lot 8, the chart of 2.4 agrees its words', { timeout: 30000 }, () => {
  it('says "1 bilan", never "bilan(s)", in the summary of a month', () => {
    const html = render(<FeedbackTrend />);
    expect(html).toContain('aria-label="Bilans par mois"');   // the chart is drawn (the example holds reviews)
    expect(html).toMatch(/aria-label="[^"]* : \d+ bilans?, \d+ satisfaits?, \d+ mécontents?/);
    expect(html).not.toMatch(/\(s\)|\(e\)/);
  });
});
