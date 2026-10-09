// @vitest-environment happy-dom
// The checks of an order full screen (RcMilestone), PLAYED in a DOM (happy-dom; the store is the reactive stand-in of testDom.tsx, the clock is stopped at 25 Sept. 2026 10:00): who checks, the
// start, the answers Conforme / Non conforme written to the store and the journal at once, the tap that was meant for the previous screen, "Annuler", the bounds, a signed PV, the release,
// what is typed and not sent. What the screen draws without a gesture is read by the static tests (RcField*, RcLot*).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { RcMilestone } from './RcMilestone';
import { all, button, cleanup, click, fake, field, mount, plain, radio, seed, stateNow, text, tick, top, type as typeIn, write } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const nav = { open: vi.fn() } as never;
const order = (id: string) => stateNow().deliveries[id];
const last = (id: string) => plain(order(id).journal!.at(-1)!.text);
const vid = (id: string, i: number) => `#rcm-v-${order(id).milestones[i].id}`, nid = (id: string, i: number) => `#rcm-n-${order(id).milestones[i].id}`;   // the field of the value, of the remark
// the screen on an order, the person picked, "Commencer" pressed
async function start(id: string, who = 'Marc M.', onClose = () => {}) {
  const m = await mount(<RcMilestone id={id} onClose={onClose} nav={nav} />);
  await click(radio(who));
  await click(button(/^Commencer/));
  return m;
}
const has = (re: RegExp) => !!button(re);
const settled = () => tick(500);   // past the 450 ms in which a tap is the one meant for the previous screen

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the first screen: who checks', () => {
  it('opens on "Qui contrôle ?", offers the people of the order, and "Commencer" stays shut until one is picked', SLOW, async () => {
    const m = await mount(<RcMilestone id="dl_demo_5" onClose={() => {}} nav={nav} />);
    expect(text()).toContain('Qui contrôle ?');
    expect(all('[role=radio]').map(b => b.textContent)).toEqual(['Marc M.', 'Julien P.', 'Autre, précisez']);
    expect(button(/^Commencer/).disabled).toBe(true);
    expect(text()).toContain('Aucune personne choisie : « Commencer » reste fermé.');
    await click(radio('Marc M.'));
    expect(button(/^Commencer/).disabled).toBe(false);
    await click(button(/^Commencer/));
    expect(text()).toContain('Jalon 3 sur 4');            // the first milestone still to check: the two before are conform
    expect(fake.writes).toBe(0);                          // looking and starting write nothing
    await m.unmount();
  });
  it('an address that is a key of the prototype, or an order that does not exist, opens "Commande introuvable" and never a screen', SLOW, async () => {
    for (const id of ['__proto__', 'constructor', 'toString', 'dl_inconnue']) {
      const m = await mount(<RcMilestone id={id} onClose={() => {}} nav={nav} />);
      expect(text(), id).toContain('Commande introuvable');
      expect(has(/^Commencer/), id).toBe(false);
      await m.unmount();
    }
  });
});


describe('an answer', () => {
  it('a tap right after the change of screen is not an answer (it was meant for the previous one); 450 ms later it is', SLOW, async () => {
    const m = await start('dl_demo_5');
    await click(button(/^Conforme$/));
    expect(order('dl_demo_5').milestones[2].ok).toBeNull();
    expect(fake.writes).toBe(0);
    await settled();
    await click(button(/^Conforme$/));
    expect(order('dl_demo_5').milestones[2].ok).toBe(true);
    await m.unmount();
  });
  it('"Conforme" writes the check in the name of the person picked AND the line of the journal, in ONE write, and goes to the next milestone to check', SLOW, async () => {
    const m = await start('dl_demo_5');
    await settled();
    await click(button(/^Conforme$/));
    const ms = order('dl_demo_5').milestones;
    expect(ms.map(x => x.ok)).toEqual([true, true, true, null]);
    expect(ms[2]).toMatchObject({ by: 'Marc M.', date: '2026-09-25' });
    expect(last('dl_demo_5')).toBe('Jalon 3 « Contrôle final » conforme');
    expect(order('dl_demo_5').journal!.at(-1)).toMatchObject({ by: 'Marc M.' });
    expect(fake.writes).toBe(1);
    expect(text()).toContain('Jalon 4 sur 4');
    await m.unmount();
  });
  it('"Annuler" gives the check back AND brings the screen back to the milestone that was taken back', SLOW, async () => {
    const m = await start('dl_demo_5');
    await settled();
    await click(button(/^Conforme$/));
    expect(text()).toContain('Jalon 3 noté conforme');
    await click(button(/^Annuler$/));
    expect(order('dl_demo_5').milestones.map(x => x.ok)).toEqual([true, true, null, null]);
    expect(text()).toContain('Jalon 3 sur 4');
    expect(button(/^Annuler$/)).toBeUndefined();          // the bar goes with the move it took back
    await m.unmount();
  });
  it('"Non conforme" writes the failure, stays on the milestone, and "Déclarer au bac rouge" opens ONE defect of the year of the gesture, linked to the milestone', SLOW, async () => {
    const m = await start('dl_demo_5');
    await settled();
    await click(button(/^Non conforme$/));
    expect(order('dl_demo_5').milestones[2].ok).toBe(false);
    expect(last('dl_demo_5')).toBe('Jalon 3 « Contrôle final » non conforme');
    expect(text()).toContain('Jalon 3 non conforme');
    const before = Object.keys(stateNow().ncs).length;
    await click(button(/^Déclarer au bac rouge/));
    const nc = Object.values(stateNow().ncs).find(x => x.id === order('dl_demo_5').milestones[2].ncId)!;
    expect(Object.keys(stateNow().ncs)).toHaveLength(before + 1);
    expect(nc.ref).toMatch(/^NC-2026-\d{3}$/);
    expect(text()).toContain(`Défaut ${nc.ref} déjà déclaré`);
    expect(button(/^Déclarer au bac rouge/)).toBeUndefined();   // one defect per milestone
    await m.unmount();
  });
});

describe('a milestone with bounds', () => {
  // the third milestone of the order has bounds of 10 to 20 mm
  const bounded = () => { const s = demoState(NOW); Object.assign(s.deliveries.dl_demo_5.milestones[2], { min: 10, max: 20, unit: 'mm' }); seed(s); };
  it('"Conforme" is shut without a value and for a value out of the bounds, open for one inside; "Non conforme" stays open; the value written is the one typed', SLOW, async () => {
    bounded();
    const m = await start('dl_demo_5');
    await settled();
    expect(text()).toContain('Plage attendue : entre 10 et 20 mm.');
    expect(button(/^Conforme$/).disabled).toBe(true);
    expect(text()).toContain('Valeur mesurée absente.');
    await typeIn(field(vid('dl_demo_5', 2)), '25');
    expect(button(/^Conforme$/).disabled).toBe(true);
    expect(text()).toContain('25 mm est hors de la plage attendue (entre 10 et 20 mm) : non conforme.');
    expect(button(/^Non conforme$/).disabled).toBe(false);
    await typeIn(field(vid('dl_demo_5', 2)), '15');
    expect(button(/^Conforme$/).disabled).toBe(false);
    expect(text()).toContain('Dans la plage attendue.');
    await click(button(/^Conforme$/));
    expect(order('dl_demo_5').milestones[2]).toMatchObject({ ok: true, measured: '15' });
    expect(last('dl_demo_5')).toBe('Jalon 3 « Contrôle final » conforme (15 mm)');
    await m.unmount();
  });
  it('a value out of the bounds noted with "Non conforme" is kept as the measure', SLOW, async () => {
    bounded();
    const m = await start('dl_demo_5');
    await settled();
    await typeIn(field(vid('dl_demo_5', 2)), '25');
    await click(button(/^Non conforme$/));
    expect(order('dl_demo_5').milestones[2]).toMatchObject({ ok: false, measured: '25' });
    await m.unmount();
  });
});

describe('a critical milestone: the second checker', () => {
  it('a second checker chosen on a milestone that is already conform is written with the check, and the screen then closes without asking (it is never dropped silently)', SLOW, async () => {
    write(s => { delete s.deliveries.dl_demo_13.milestones[2].second; });
    const closed = vi.fn(), m = await mount(<RcMilestone id="dl_demo_13" onClose={closed} nav={nav} />);
    await click(radio('Karim T.'));
    await click(button(/^Commencer/));                    // all the milestones are checked: the end of the checks
    await click(button(/^Jalon 3 sur 4/));                 // « Contrôle final », critical, conform, no second checker
    await settled();
    expect(order('dl_demo_13').milestones[2]).toMatchObject({ ok: true, critical: true });
    expect(order('dl_demo_13').milestones[2].second).toBeUndefined();
    await click(all('[role=group] button').find(b => b.textContent === 'Julien P.')!);
    await click(button(/^Conforme$/));
    expect(order('dl_demo_13').milestones[2]).toMatchObject({ ok: true, second: 'Julien P.' });
    await click(button(/^Fermer l'écran/));
    expect(text()).not.toContain('Saisie pas encore envoyée');   // what was chosen was sent: nothing is left to be asked about
    expect(closed).toHaveBeenCalledTimes(1);
    await m.unmount();
  });
});

describe('a signed PV and an archived order', () => {
  it('say so on the first screen and on the milestone, and offer no answer: nothing is written', SLOW, async () => {
    const m = await mount(<RcMilestone id="dl_demo_1" onClose={() => {}} nav={nav} />);
    expect(text()).toMatch(/PV signé le .* les contrôles ne sont plus modifiables/);
    await click(radio('Nicolas R.'));
    await click(button(/^Commencer/));
    await click(button(/^Jalon 1 sur 4/));
    await settled();
    expect(text()).toContain('PV signé : les contrôles ne sont plus modifiables.');
    expect(has(/^Conforme$/)).toBe(false);                // the answer is a fact (a pill), not two buttons
    expect(has(/^Non conforme$/)).toBe(false);
    expect(all('[role=group][aria-label="Résultat du jalon"]')[0].textContent).toContain('Conforme');
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('an archived order opens with no check possible', SLOW, async () => {
    const m = await mount(<RcMilestone id="dl_demo_14" onClose={() => {}} nav={nav} />);
    expect(text()).toMatch(/Commande archivée le .* aucun contrôle n'est possible/);
    await m.unmount();
  });
});

describe('what is typed and not sent', () => {
  it('a remark typed is kept in the tab over a reload, and said on the first screen', SLOW, async () => {
    let m = await start('dl_demo_5');
    await typeIn(field(nid('dl_demo_5', 2)), 'rayure sous le support');
    expect(window.sessionStorage.getItem('rc-draft:milestone:dl_demo_5')).toContain('rayure sous le support');
    await m.unmount();                                    // the page is reloaded: the screen is built again
    m = await mount(<RcMilestone id="dl_demo_5" onClose={() => {}} nav={nav} />);
    expect(text()).toContain('Pas encore envoyé : valeur ou remarque du jalon 3.');
    await click(radio('Marc M.'));
    await click(button(/^Commencer/));
    expect(field(nid('dl_demo_5', 2)).value).toBe('rayure sous le support');
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('closing asks first; "Revenir au contrôle" stays, "Quitter sans l\'envoyer" leaves and forgets the draft; nothing is written', SLOW, async () => {
    const closed = vi.fn(), m = await start('dl_demo_5', 'Marc M.', closed);
    await typeIn(field(nid('dl_demo_5', 2)), 'à revoir');
    await click(button(/^Fermer l'écran/));
    expect(text()).toContain('Saisie pas encore envoyée');
    expect(closed).not.toHaveBeenCalled();
    await click(button(/^Revenir au contrôle/));
    expect(text()).not.toContain('Saisie pas encore envoyée');
    await click(button(/^Fermer l'écran/));
    await click(button(/^Quitter sans l'envoyer/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('rc-draft:milestone:dl_demo_5')).toBeNull();
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
  it('with nothing typed, closing closes at once', SLOW, async () => {
    const closed = vi.fn(), m = await start('dl_demo_5', 'Marc M.', closed);
    await click(button(/^Fermer l'écran/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(text()).not.toContain('Saisie pas encore envoyée');
    await m.unmount();
  });
});

describe('the end of the checks: the release', () => {
  it('"Libérer la commande" is shut until a person is named, then writes the release in her name and the journal; "Annuler" undoes it', SLOW, async () => {
    const m = await mount(<RcMilestone id="dl_demo_9" onClose={() => {}} nav={nav} />);
    await click(radio('Nicolas R.'));
    await click(button(/^Commencer/));
    expect(text()).toContain('Fin du contrôle');
    expect(text()).toContain('Tous les jalons applicables sont contrôlés.');
    expect(button(/^Libérer la commande/).disabled).toBe(true);
    expect(text()).toContain('Aucune personne choisie pour libérer.');
    await click(radio('David K.', document.querySelector('section[aria-label=Libération]')!));
    await settled();
    await click(button(/^Libérer la commande/));
    const d = order('dl_demo_9');
    expect(d.releasedBy).toBe('David K.');
    expect(d.releasedAt).toBeTruthy();
    expect(last('dl_demo_9')).toMatch(/libér/i);
    expect(text()).toContain('Commande libérée par David K.');
    await click(button(/^Annuler$/));
    expect(order('dl_demo_9').releasedAt).toBeFalsy();
    await m.unmount();
  });
  it('an order that is not ready cannot be released as it is: the facts that remain are said; by waiver it is, with a motive (shut until it is typed), the person and the journal', SLOW, async () => {
    const m = await mount(<RcMilestone id="dl_demo_5" onClose={() => {}} nav={nav} />);
    await click(radio('Marc M.'));
    await click(button(/^Commencer/));
    await click(button(/^Fin du contrôle/));
    expect(text()).toContain('Ce qui reste à régler');
    expect(button(/^Libérer par dérogation/).disabled).toBe(true);   // no person named yet
    await click(radio('Julien P.', document.querySelector('section[aria-label=Libération]')!));
    expect(button(/^Libérer la commande/).disabled).toBe(true);       // a person is named: the milestones that remain still close the plain release
    expect(button(/^Libérer par dérogation/).disabled).toBe(false);
    await click(button(/^Libérer par dérogation/));
    expect(text()).toContain('Motif de la dérogation (obligatoire)');
    expect(button(/^Libérer par dérogation/, top()).disabled).toBe(true);
    await typeIn(field('#rcm-why'), 'Livraison urgente, contrôle fait au poste voisin');
    await click(button(/^Libérer par dérogation/, top()));
    const d = order('dl_demo_5');
    expect(d.releasedBy).toBe('Julien P.');
    expect(d.derogation).toMatchObject({ by: 'Julien P.', why: 'Livraison urgente, contrôle fait au poste voisin' });
    expect(last('dl_demo_5')).toMatch(/^Libérée par Julien P\. par dérogation : Livraison urgente, contrôle fait au poste voisin/);
    expect(text()).toContain('Par dérogation de Julien P. : Livraison urgente, contrôle fait au poste voisin.');
    await m.unmount();
  });
});

// a change made at the post while the screen is open is read by the screen (the order is read from the store, never from a copy)
describe('the order is read from the store', () => {
  it('a check made elsewhere while the screen is open is shown, and the answer of the screen does not erase it', SLOW, async () => {
    const m = await start('dl_demo_5');
    await settled();
    write(s => { s.deliveries.dl_demo_5.milestones[3].ok = true; });
    await click(button(/^Conforme$/));
    expect(order('dl_demo_5').milestones.map(x => x.ok)).toEqual([true, true, true, true]);
    await m.unmount();
  });
});
