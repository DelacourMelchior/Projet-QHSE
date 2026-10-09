// @vitest-environment happy-dom
// The sheet of an order (RcSheet), PLAYED in a DOM (happy-dom; the store is the reactive stand-in of testDom.tsx, the clock is stopped at 25 Sept. 2026 10:00): what is typed is written 1,2 s after
// the last key, when the sheet goes away and when the page is left; a check made meanwhile at the post is never erased by a stale sheet; an order with nothing in it is not written; a signed PV is locked
// and corrected only through "Corriger"; the tabs are drawn when they are first opened; archive and delete. The tabs themselves are rendered for every example by RcTabs.test.tsx.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { demoState } from '../../domain/templates';
import { checkMilestone, isLocked, newDelivery } from '../../domain/receptions';
import { RcSheet } from './RcSheet';
import { all, button, cleanup, click, fake, field, leave, mount, plain, radio, seed, stateNow, text, tick, top, type as typeIn, typable, write } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const nav = { tool: vi.fn(), open: vi.fn() } as never;
const order = (id: string) => stateNow().deliveries[id];
const ITEM = 'input[placeholder="Ce qui est commandé"]';
const sheet = (initial = order('dl_demo_5'), onClose = () => {}, tab?: 'milestones') => mount(<RcSheet initial={initial} onClose={onClose} nav={nav} tab={tab} />);
const tabOf = (label: string) => all('[role=tab]').find(t => t.textContent!.startsWith(label))!;

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });

describe('what is typed is written', () => {
  it('1,2 s after the last key: nothing at 1 199 ms, one write at 1 201 ms, and the status goes from "Enregistrement…" to "Enregistré automatiquement"', SLOW, async () => {
    const m = await sheet();
    expect(text()).toContain('Enregistré automatiquement');
    await typeIn(field(ITEM), 'Supports moteur, série B');
    expect(text()).toContain('Enregistrement…');
    await tick(1199);
    expect(order('dl_demo_5').item).toBe('Supports moteur');
    expect(fake.writes).toBe(0);
    await tick(2);
    expect(order('dl_demo_5').item).toBe('Supports moteur, série B');
    expect(fake.writes).toBe(1);
    expect(text()).toContain('Enregistré automatiquement');
    await m.unmount();
  });
  it('every key starts the pause again: two keys 1 s apart are one write, 1,2 s after the second', SLOW, async () => {
    const m = await sheet();
    await typeIn(field(ITEM), 'Supports A');
    await tick(1000);
    await typeIn(field(ITEM), 'Supports AB');
    await tick(1100);
    expect(fake.writes).toBe(0);
    await tick(200);
    expect(fake.writes).toBe(1);
    expect(order('dl_demo_5').item).toBe('Supports AB');
    await m.unmount();
  });
  it('when the sheet goes away (closed, or covered by a full screen), what is typed is written at once', SLOW, async () => {
    const m = await sheet();
    await typeIn(field(ITEM), 'Supports C');
    await m.unmount();
    expect(order('dl_demo_5').item).toBe('Supports C');
  });
  it('when the page is left, or goes to the background, what is typed is written at once', SLOW, async () => {
    let m = await sheet();
    await typeIn(field(ITEM), 'Supports D');
    await tick(1);
    await click(document.body);
    window.dispatchEvent(new Event('pagehide'));
    expect(order('dl_demo_5').item).toBe('Supports D');
    await m.unmount();
    seed(demoState(NOW));
    m = await sheet();
    await typeIn(field(ITEM), 'Supports E');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(order('dl_demo_5').item).toBe('Supports E');
    await m.unmount();
  });
  it('"Fermer" writes what is typed and closes', SLOW, async () => {
    const closed = vi.fn(), m = await sheet(order('dl_demo_5'), closed);
    await typeIn(field(ITEM), 'Supports F');
    await click(button(/^Fermer$/));
    expect(order('dl_demo_5').item).toBe('Supports F');
    expect(closed).toHaveBeenCalledTimes(1);
    await m.unmount();
  });
  it('a check made meanwhile at the post is never erased by the sheet that was open: the typed text is written, the check stays', SLOW, async () => {
    const m = await sheet();
    await typeIn(field(ITEM), 'Supports G');
    write(s => { s.deliveries.dl_demo_5 = checkMilestone(s.deliveries.dl_demo_5, 'dl_demo_5_m3', { ok: true, measured: '', by: 'Marc M.', at: '2026-09-25T09:30' }); });
    await tick(1300);
    expect(order('dl_demo_5').item).toBe('Supports G');
    expect(order('dl_demo_5').milestones[2]).toMatchObject({ ok: true, by: 'Marc M.' });
    expect(order('dl_demo_5').journal!.at(-1)!.text).toContain('Contrôle final');
    await m.unmount();
  });
});

describe('a new order', () => {
  it('is not written while it has neither number, customer nor item, and says so; closing after a field typed asks first', SLOW, async () => {
    const closed = vi.fn(), m = await sheet(newDelivery(stateNow().params), closed);
    expect(text()).toContain('Rien n\'est enregistré tant que la commande n\'a ni numéro, ni client, ni livrable');
    const qty = field('input[aria-label="Quantité commandée"]');
    await typeIn(qty, '12'); await leave(qty);
    await tick(1500);
    expect(fake.writes).toBe(0);
    await click(button(/^Fermer$/));
    expect(text()).toContain('Fermer sans enregistrer');
    expect(closed).not.toHaveBeenCalled();
    await click(button(/^Fermer quand même/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('is written, with a new identity, 1,2 s after the first customer typed', SLOW, async () => {
    const fresh = newDelivery(stateNow().params), m = await sheet(fresh);
    await typeIn(field('input[list=rc-clients]'), 'Client D');
    await tick(1300);
    expect(order(fresh.id)).toMatchObject({ client: 'Client D' });
    expect(fake.writes).toBe(1);
    await m.unmount();
  });
  it('closed with nothing typed, it closes at once and writes nothing', SLOW, async () => {
    const closed = vi.fn(), m = await sheet(newDelivery(stateNow().params), closed);
    await click(button(/^Fermer$/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
});

describe('a signed PV', () => {
  it('is told locked with its number and its seal, and no typed field of any of the five tabs stays open', SLOW, async () => {
    const m = await sheet(order('dl_demo_1'));
    expect(isLocked(order('dl_demo_1'))).toBe(true);
    expect(text()).toMatch(/PV-2026-002 · Scellé intact : /);
    for (const label of ['Commande', 'Jalons', 'Libération', 'Réception', 'Suites']) {
      await click(tabOf(label));
      const open = typable(all('[role=tabpanel]:not([hidden])')[0]);
      expect(open.map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? e.getAttribute('placeholder') ?? ''}`), label).toEqual([]);
    }
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('typing nowhere changes it: after a long while nothing is written', SLOW, async () => {
    const m = await sheet(order('dl_demo_1'));
    await tick(5000);
    window.dispatchEvent(new Event('pagehide'));
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('a content that no longer matches its seal is told in red, in words', SLOW, async () => {
    write(s => { s.deliveries.dl_demo_1.item = 'Châssis modifiés à la main'; });
    const m = await sheet(order('dl_demo_1'));
    expect(all('[role=alert]').map(a => plain(a.textContent ?? '')).join(' ')).toContain('Modifié depuis la signature : le contenu ne correspond plus au scellé');
    await m.unmount();
  });
  it('"Corriger la commande" asks a person and a reason, writes the correction, the line of the journal and a new seal; nothing is written without them', SLOW, async () => {
    const m = await sheet(order('dl_demo_1'));
    const seals = order('dl_demo_1').reception.seals!.length;
    await click(button(/^Corriger la commande/));
    expect(button(/^Enregistrer la correction/).disabled).toBe(true);
    expect(text()).toContain('Personne pas encore choisie.');
    await click(radio('Nicolas R.', top()));
    expect(text()).toContain('Motif pas encore écrit.');
    await typeIn(top().querySelector('input')!, 'Faute de frappe sur le livrable');   // the first field of the window is the motive
    expect(text()).toContain('Aucun champ modifié.');
    const item = [...top().querySelectorAll('input')].find(i => i.value === 'Châssis mécano-soudés peints')!;
    await typeIn(item, 'Châssis mécano-soudés peints RAL 7016');
    expect(button(/^Enregistrer la correction/).disabled).toBe(false);
    await click(button(/^Enregistrer la correction/));
    const d = order('dl_demo_1');
    expect(d.item).toBe('Châssis mécano-soudés peints RAL 7016');
    expect(d.reception.seals).toHaveLength(seals + 1);
    const fix = d.journal!.filter(e => plain(e.text).startsWith('Corrigé :')).at(-1)!;
    expect(plain(fix.text)).toBe('Corrigé : livrable Châssis mécano-soudés peints → Châssis mécano-soudés peints RAL 7016 (motif : Faute de frappe sur le livrable)');
    expect(fix).toMatchObject({ by: 'Nicolas R.', at: '2026-09-25T10:00', proof: true });
    expect(plain(d.journal!.at(-1)!.text)).toMatch(/^Scellé SHA-256 posé : .* \(correction : Faute de frappe sur le livrable\)$/);
    expect(text()).toMatch(/Scellé intact/);
    await m.unmount();
  });
});

describe('the tabs', () => {
  it('a tab is drawn when it is first opened and kept (what is typed in it stays); the others cost nothing', SLOW, async () => {
    const m = await sheet();
    expect(all('[role=tab]').map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(text()).toContain('QR code de la commande');
    expect(text()).not.toContain('Libération avant départ');
    await click(tabOf('Libération'));
    expect(text()).toContain('Libération avant départ');
    expect(all('[role=tabpanel]').filter(p => !p.hidden)).toHaveLength(1);
    await typeIn(field(ITEM), 'Supports H');   // the Commande tab is still there, hidden
    await click(tabOf('Commande'));
    expect(field(ITEM).value).toBe('Supports H');
    expect(text()).not.toContain('Résultat de la réception');   // Réception was never opened
    await m.unmount();
  });
  it('the arrows move from one tab to the next round the list, Home and End go to the ends', SLOW, async () => {
    const m = await sheet();
    const key = (k: string) => act(async () => { tabOf('Commande').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
    const sel = () => all('[role=tab]').findIndex(t => t.getAttribute('aria-selected') === 'true');
    await key('ArrowRight'); expect(sel()).toBe(1);
    await key('End'); expect(sel()).toBe(4);
    await key('ArrowRight'); expect(sel()).toBe(0);
    await key('ArrowLeft'); expect(sel()).toBe(4);
    await key('Home'); expect(sel()).toBe(0);
    await m.unmount();
  });
  it('a task opens the sheet on its tab', SLOW, async () => {
    const m = await sheet(order('dl_demo_5'), () => {}, 'milestones');
    expect(tabOf('Jalons').getAttribute('aria-selected')).toBe('true');
    expect(text()).toContain('Définition du jalon');
    await m.unmount();
  });
});

describe('archive and delete', () => {
  it('"Archiver" asks, writes the archiving with its reason and the journal, and says what stays followed', SLOW, async () => {
    const m = await sheet(order('dl_demo_13'));
    await click(button(/^Autres actions de la commande/));
    await click(button(/^Archiver$/));
    expect(text()).toContain('Archiver la commande');
    await typeIn(top().querySelector('input')!, 'commande soldée');
    await click(button(/^Archiver$/, top()));
    const d = order('dl_demo_13');
    expect(d.archivedAt).toBeTruthy();
    expect(d.archivedNote).toBe('commande soldée');
    expect(plain(text())).toContain('Commande archivée le');
    await m.unmount();
  });
  it('an order with nothing to lose can be deleted: it leaves the store and is not written back when the sheet goes away', SLOW, async () => {
    const fresh = newDelivery(stateNow().params);
    write(s => { s.deliveries[fresh.id] = { ...fresh, client: 'Client E', item: 'Pièces' }; });
    const closed = vi.fn(), m = await sheet(order(fresh.id), closed);
    await typeIn(field(ITEM), 'Pièces B');                // typed and not written yet: it must not come back after the deletion
    await click(button(/^Autres actions de la commande/));
    await click(button(/^Supprimer$/));
    expect(text()).toContain('Aucun jalon n\'est contrôlé');
    await click(button(/Supprimer/, top()));
    expect(stateNow().deliveries[fresh.id]).toBeUndefined();
    expect(closed).toHaveBeenCalledTimes(1);
    await m.unmount();                                   // the sheet goes away: what it held is not written back
    expect(stateNow().deliveries[fresh.id]).toBeUndefined();
  });
  it('an order with proofs is not offered for deletion', SLOW, async () => {
    const m = await sheet(order('dl_demo_13'));
    await click(button(/^Autres actions de la commande/));
    expect(button(/^Supprimer$/)).toBeUndefined();
    expect(button(/^Archiver$/)).toBeDefined();
    await m.unmount();
  });
});

