// @vitest-environment happy-dom
// Starting an order (RcNew), PLAYED in a DOM (happy-dom): the customer (found in the directory or not, suggestions), the deliverable, the model of milestones (the first, another, "Autre, précisez"), the
// order that comes out of "Créer la commande" (or Enter), the order started from a quote. The screen writes nothing itself: the register opens the sheet on what `onCreate` gives.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { templatesOf } from '../../domain/receptions';
import type { Delivery, State } from '../../domain/types';
import { RcNew } from './RcNew';
import { act } from 'react';
import { all, button, cleanup, click, mount, plain, text, type as typeIn } from './testDom';

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
let state: State;
beforeEach(() => { state = demoState(NOW); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });

const fields = () => all<HTMLInputElement>('[role=dialog] input');
async function open(quoteId?: string) {
  const created = vi.fn<(d: Delivery) => void>(), closed = vi.fn();
  const m = await mount(<RcNew state={state} quoteId={quoteId} onClose={closed} onCreate={created} />);
  return { m, created, closed, client: fields()[0], item: fields()[1] };
}

describe('the customer', () => {
  it('a customer of the directory is told so and linked to the order; one that is not is told so and typed freely', SLOW, async () => {
    const { m, created, client, item } = await open();
    await typeIn(client, 'Client B');
    expect(text()).toContain('Dans l\'annuaire : Client B');
    await typeIn(item, 'Portillons');
    await click(button(/^Créer la commande/));
    expect(created).toHaveBeenCalledTimes(1);
    expect(created.mock.calls[0][0]).toMatchObject({ client: 'Client B', item: 'Portillons', orgId: 'org_demo_clientB' });
    await m.unmount();
    const b = await open();
    await typeIn(b.client, 'Nouveau client SARL');
    expect(text()).toContain('Pas encore dans l\'annuaire');
    await click(button(/^Créer la commande/));
    expect(b.created.mock.calls[0][0].orgId).toBeUndefined();
    expect(b.created.mock.calls[0][0].client).toBe('Nouveau client SARL');
    await b.m.unmount();
  });
  it('the customer and the deliverable are written without the spaces round them', SLOW, async () => {
    const { m, created, client, item } = await open();
    await typeIn(client, '  Client B  ');
    await typeIn(item, '  Portillons  ');
    await click(button(/^Créer la commande/));
    expect(created.mock.calls[0][0]).toMatchObject({ client: 'Client B', item: 'Portillons' });
    await m.unmount();
  });
  it('the customers already known are offered while typing (the one typed left out) and a tap fills the field', SLOW, async () => {
    const { m, client } = await open();
    await typeIn(client, 'client');
    const chips = all('[role=group][aria-label="Clients connus"] button').map(b => b.textContent);
    expect(chips.length).toBeGreaterThan(1);
    expect(chips.every(c => plain(c ?? '').toLowerCase().includes('client'))).toBe(true);
    await click(all('[role=group][aria-label="Clients connus"] button').find(b => b.textContent === 'Client C')!);
    expect(fields()[0].value).toBe('Client C');
    expect(all('[role=group][aria-label="Clients connus"] button').map(b => b.textContent)).not.toContain('Client C');
    await m.unmount();
  });
});

describe('the model of milestones', () => {
  it('the first model is chosen and said (number of milestones and their names); another one is taken as chosen', SLOW, async () => {
    const tpls = templatesOf(state.params), { m, created, client } = await open();
    expect(text()).toContain(`${tpls[0].milestones.length} jalons : ${tpls[0].milestones.map(x => x.label).join(' · ')}`);
    await typeIn(client, 'Client B');
    await typeIn(all('[role=dialog] select')[0], '1');
    expect(text()).toContain(tpls[1].milestones.map(x => x.label).join(' · '));
    await click(button(/^Créer la commande/));
    const d = created.mock.calls[0][0];
    expect(d.template).toBe(tpls[1].name);
    expect(d.milestones.map(x => x.label)).toEqual(tpls[1].milestones.map(x => x.label));
    expect(d.shipChecks?.map(c => c.label)).toEqual(tpls[1].shipChecks);
    await m.unmount();
  });
  it('a check before departure left blank in the settings is not created', SLOW, async () => {
    state.params.reception = { ...state.params.reception, templates: [{ name: 'Modèle maison', milestones: [{ label: 'Réception', point: '', requirement: '' }], shipChecks: ['Palette filmée', '   '] }] };
    const { m, created, client } = await open();
    await typeIn(client, 'Client B');
    const select = all<HTMLSelectElement>('[role=dialog] select')[0];
    await typeIn(select, String([...select.options].findIndex(o => o.textContent === 'Modèle maison')));
    await click(button(/^Créer la commande/));
    expect(created.mock.calls[0][0].template).toBe('Modèle maison');
    expect(created.mock.calls[0][0].shipChecks?.map(c => c.label)).toEqual(['Palette filmée']);
    await m.unmount();
  });
  it('"Autre, précisez" starts with ONE blank milestone and the name of the model as typed', SLOW, async () => {
    const tpls = templatesOf(state.params), { m, created, client } = await open();
    await typeIn(client, 'Client B');
    await typeIn(all('[role=dialog] select')[0], String(tpls.length));
    expect(text()).toContain('Un seul jalon vide, précisé ensuite dans la fiche.');
    expect(text()).toContain('Précisez le modèle');
    await typeIn(all('[role=dialog] input').at(-1)!, '  Peinture sur mesure ');
    await click(button(/^Créer la commande/));
    const d = created.mock.calls[0][0];
    expect(d.milestones).toHaveLength(1);
    expect(d.milestones[0].label).toBe('');
    expect(d.template).toBe('Peinture sur mesure');
    await m.unmount();
  });
});

describe('Enter, and the buttons', () => {
  it('Enter in a field creates the order; "Annuler" closes without creating', SLOW, async () => {
    const { m, created, closed, client } = await open();
    await typeIn(client, 'Client B');
    await act(async () => { client.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    expect(created).toHaveBeenCalledTimes(1);
    await click(button(/^Annuler$/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledTimes(1);
    await m.unmount();
  });
});

describe('an order started from a quote', () => {
  it('takes the customer, the deliverable and the promised day of the quote, and keeps the link', SLOW, async () => {
    const q = state.quotes.qt_demo_6, { m, created, client, item } = await open('qt_demo_6');
    expect(text()).toContain(`Nouvelle commande depuis le devis ${q.ref}`);
    expect(client.value).toBe(q.client);
    expect(item.value).toBe(q.object);
    expect(text()).toMatch(/Livraison promise le .*, reprise du devis/);
    await click(button(/^Créer la commande/));
    const d = created.mock.calls[0][0];
    expect(d).toMatchObject({ client: q.client, item: q.object, quoteId: 'qt_demo_6' });
    expect(d.promisedAt).toBeTruthy();
    await m.unmount();
  });
  it('an address that is a key of the prototype is no quote: a plain new order', SLOW, async () => {
    for (const id of ['__proto__', 'constructor', 'qt_inconnu']) {
      const { m, created, client } = await open(id);
      expect(text(), id).toContain('Nouvelle commande');
      expect(text(), id).not.toContain('depuis le devis');
      expect(client.value, id).toBe('');
      await click(button(/^Créer la commande/));
      expect(created.mock.calls[0][0].quoteId, id).toBeUndefined();
      await m.unmount();
    }
  });
});
