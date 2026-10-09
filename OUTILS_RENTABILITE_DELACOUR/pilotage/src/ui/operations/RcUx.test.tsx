// @vitest-environment happy-dom
// The simplifications of tool 3.4 (UX pass of 2026-10-07), PLAYED in a DOM: ONE button on a card (the next step), the sheet that opens where the next move is, a task of reservation that opens that
// reservation alone with the person of the task, the release offered at the reception, three names at the customer's, place and delivery note folded, the checks of departure in one line, the
// short sheet of a new order.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { allReservesOf, newDelivery, shipChecksOf } from '../../domain/receptions';
import { receptionSummary } from '../../domain/receptionsAll';
import { RcCard } from './RcCards';
import { RcReception } from './RcReception';
import { RcSheet } from './RcSheet';
import { all, button, cleanup, click, field, mount, plain, radio, seed, stateNow, text, type } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const nav = { tool: vi.fn(), open: vi.fn() } as never;
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const card = async (id: string) => {
  const s = stateNow(), { todos } = receptionSummary(s, NOW), onGo = vi.fn(), onField = vi.fn();
  const m = await mount(<RcCard d={s.deliveries[id]} state={s} todos={todos.filter(t => t.deliveryId === id)} now={NOW} onOpen={() => {}} onField={onField} onGo={onGo} onPrint={() => {}} menu={[]} />);
  return { m, onGo, onField };
};
const primary = () => all<HTMLButtonElement>('button').filter(b => b.className.includes('bg-delacour-primary'));
const selected = () => plain(all('[role=tab][aria-selected=true]')[0]?.textContent);

describe('a card has ONE button: the next step', () => {
  it('"Lever" for an order with a reservation to lift, and it opens that reservation; the other screens are behind "…"', SLOW, async () => {
    const { m, onGo } = await card('dl_demo_3');
    expect(primary().map(b => b.textContent)).toEqual(['Lever']);
    expect(all('button').filter(b => /^(Contrôler|Réception)$/.test(b.textContent ?? ''))).toHaveLength(0);
    await click(primary()[0]);
    expect(onGo).toHaveBeenCalledWith(`dl_demo_3:reception:${allReservesOf(stateNow().deliveries.dl_demo_3)[0].id}`);
    await click(button(/^Autres actions/)!);
    expect(text()).toContain('Contrôler les jalons');
    expect(text()).toContain('Réception chez le client');
    await m.unmount();
  });
  it('"Libérer" for an order to release, "Contrôler" while the checks go on, "Réception" for the delivery', SLOW, async () => {
    const a = await card('dl_demo_9');
    expect(primary().map(b => b.textContent)).toEqual(['Libérer']);
    await click(primary()[0]);
    expect(a.onGo).toHaveBeenCalledWith('dl_demo_9:release');
    await a.m.unmount();
    const b = await card('dl_demo_5');
    expect(primary().map(x => x.textContent)).toEqual(['Contrôler']);
    await click(primary()[0]);
    expect(b.onField).toHaveBeenCalledWith('jalon');
    await b.m.unmount();
    const c = await card('dl_demo_13');
    expect(primary().map(x => x.textContent)).toEqual(['Réception']);
    await c.m.unmount();
  });
});

describe('the sheet opens where the next move is', () => {
  const sheet = (id: string, extra: Partial<Parameters<typeof RcSheet>[0]> = {}) => mount(<RcSheet initial={stateNow().deliveries[id]} nav={nav} onClose={() => {}} {...extra} />);
  it('on Libération when the order is to release, on Réception when the PV is to sign or a reservation is open, on Commande otherwise and for a new order', SLOW, async () => {
    for (const [id, tab] of [['dl_demo_9', 'Libération'], ['dl_demo_13', 'Réception'], ['dl_demo_3', 'Réception'], ['dl_demo_5', 'Commande']] as const) {
      const m = await sheet(id);
      expect(selected(), id).toContain(tab);
      await m.unmount();
    }
    const m = await mount(<RcSheet initial={newDelivery(stateNow().params)} nav={nav} onClose={() => {}} />);
    expect(selected()).toContain('Commande');
    await m.unmount();
  });
  it('a tab given by the address stays the one asked for', SLOW, async () => {
    const m = await sheet('dl_demo_9', { tab: 'follow' });
    expect(selected()).toContain('Suites');
    await m.unmount();
  });
});

describe('a task of reservation opens that reservation alone', () => {
  it('with the person of the task already there (even when she is not in the list of the sheet), the lift open, and a way to the whole sheet', SLOW, async () => {
    const rv = allReservesOf(stateNow().deliveries.dl_demo_3)[0].id;
    const m = await mount(<RcSheet initial={stateNow().deliveries.dl_demo_3} nav={nav} tab="reception" focusReserve={rv} onClose={() => {}} />);
    expect(all('[role=tablist]')).toHaveLength(0);
    expect(text()).toContain('Vous : Julien P.');
    expect(text()).toContain('Levée de la réserve');
    expect(button(/^Enregistrer la levée/)).toBeDefined();
    await click(button(/^changer/)!);
    expect(radio('Julien P.')).toBeDefined();                  // the person of the task is in the list of the sheet
    await click(radio('Julien P.')!);                        // picked again from the list: still the same person
    expect(text()).toContain('Vous : Julien P.');
    await click(button(/^Voir toute la fiche/)!);
    expect(all('[role=tablist]')).toHaveLength(1);
    expect(selected()).toContain('Réception');
    await m.unmount();
  });
});

describe('the reception screen', () => {
  const open = async (id: string, who = '') => { const m = await mount(<RcReception id={id} onClose={() => {}} nav={nav} />); if (who) await click(radio(who)!); return m; };
  it('offers "Libérer maintenant" at once when nothing stands in the way, and writes the release in the name of the person', SLOW, async () => {
    const m = await open('dl_demo_9');
    expect(text()).toContain('Commande pas encore libérée.');
    expect(button(/^Libérer maintenant/)!.disabled).toBe(true);
    await click(radio('Nicolas R.')!);
    await click(button(/^Libérer maintenant/)!);
    expect(stateNow().deliveries.dl_demo_9).toMatchObject({ releasedBy: 'Nicolas R.' });
    expect(text()).not.toContain('Commande pas encore libérée.');
    await m.unmount();
  });
  it('says what stands in the way, and sends to the release of the sheet (derogation) instead of discovering it at the signature', SLOW, async () => {
    const m = await open('dl_demo_4', 'Karim T.');
    expect(text()).toContain('Commande pas encore libérée.');
    expect(has(/^Libérer maintenant/)).toBe(false);
    await click(button(/^Libérer dans la fiche/)!);
    expect((nav as unknown as { tool: ReturnType<typeof vi.fn> }).tool).toHaveBeenCalledWith('3.4', 'dl_demo_4:release');
    await m.unmount();
  });
  it('shows three names at the customer\'s (the buyer of the order, "Autre") and the whole directory behind a button', SLOW, async () => {
    const m = await open('dl_demo_13', 'Karim T.');
    const names = () => all<HTMLButtonElement>('section[aria-labelledby=rcr-cl] button[aria-pressed]').length;
    const few = names();
    expect(few).toBeLessThanOrEqual(3);
    await click(button(/^Voir tout l'annuaire/)!);
    expect(names()).toBeGreaterThan(few);
    expect(has(/^Voir tout l'annuaire/)).toBe(false);
    await m.unmount();
  });
  it('folds the place and the delivery note under "Ajouter des détails", open when one is written', SLOW, async () => {
    const m = await open('dl_demo_9');
    const det = () => document.querySelector('details')!;
    expect(det().textContent).toContain('Ajouter des détails');
    expect(det().open).toBe(false);
    expect(det().querySelector('#rcr-place')).not.toBeNull();
    await m.unmount();
    stateNow().deliveries.dl_demo_9.reception.bl = 'BL-7';
    const n = await open('dl_demo_9');
    expect(document.querySelector('details')!.open).toBe(true);
    await n.unmount();
  });
  it('writes the proposed result with "Suivant": with reservation when one is noted, never a refusal', SLOW, async () => {
    const m = await open('dl_demo_13', 'Karim T.');
    for (let i = 1; i < 3; i++) await click(button(/^Suivant/)!);
    await click(button(/^\+ Ajouter une réserve/)!);
    await type(field('#rcr-rv-text'), 'Rayure sur un portillon');
    await click(button(/^Ajouter la réserve$/)!);
    expect(stateNow().deliveries.dl_demo_13.reception.result).toBe('');             // proposed, not written yet
    await click(button(/^Suivant/)!);
    expect(stateNow().deliveries.dl_demo_13.reception.result).toBe('reserve');      // written by "Suivant"
    expect(text()).toContain('Étape 4 sur 5');
    await m.unmount();
  });
});

const has = (re: RegExp) => !!button(re);

describe('the release tab', () => {
  it('puts the checks of departure first, in one line, "Tout fait" does them all in one move, "Signaler un seul" opens the marks', SLOW, async () => {
    const m = await mount(<RcSheet initial={stateNow().deliveries.dl_demo_9} nav={nav} tab="release" onClose={() => {}} />);
    expect(text().indexOf('Contrôle de départ')).toBeLessThan(text().indexOf('Libération avant départ'));
    expect(all('[role=group][aria-label^="Contrôle de départ"]')).toHaveLength(0);
    await click(radio('Nicolas R.')!);
    const before = (await import('./testDom')).fake.writes;
    await click(button(/^Tout fait/)!);
    expect((await import('./testDom')).fake.writes - before).toBe(1);
    const d = stateNow().deliveries.dl_demo_9;
    expect(shipChecksOf(d, stateNow().params).every(c => c.ok === true || c.na)).toBe(true);
    expect(has(/^Tout fait/)).toBe(false);
    await m.unmount();
    const n = await mount(<RcSheet initial={stateNow().deliveries.dl_demo_5} nav={nav} tab="release" onClose={() => {}} />);
    await click(button(/^Signaler un seul/)!);
    expect(all('[role=group][aria-label^="Contrôle de départ"]').length).toBeGreaterThan(0);
    await n.unmount();
  });
});

describe('the sheet of an order is short at first', () => {
  it('folds the quote and the traceability under "Plus de détails", open when one is written', SLOW, async () => {
    const d = newDelivery(stateNow().params);
    const m = await mount(<RcSheet initial={{ ...d, client: 'Client X' }} nav={nav} onClose={() => {}} />);
    const det = () => all<HTMLDetailsElement>('details').find(x => x.textContent?.includes('Plus de détails'))!;
    expect(det().open).toBe(false);
    expect(det().textContent).toContain('Traçabilité');
    expect(det().textContent).toContain("Devis d'origine");
    await m.unmount();
    stateNow().deliveries.dl_demo_5.lot = 'L-42';
    const n = await mount(<RcSheet initial={stateNow().deliveries.dl_demo_5} nav={nav} onClose={() => {}} />);
    expect(all<HTMLDetailsElement>('details').find(x => x.textContent?.includes('Plus de détails'))!.open).toBe(true);
    await n.unmount();
  });
});
