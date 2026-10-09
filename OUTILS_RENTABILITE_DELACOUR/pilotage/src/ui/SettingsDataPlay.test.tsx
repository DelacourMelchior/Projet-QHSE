// @vitest-environment happy-dom
// G-17 / S-18, PLAYED in a DOM (happy-dom): the three replacements of Réglages > Données (restore a backup, load the example, start from zero) ask in the window of the application, say how many signed PV go
// (and the day of the last one), offer Annuler, and replace nothing before the answer; a restoration keeps the data it replaces in this browser first, and says when there is no room for that.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { demoState } from '../domain/templates';
import type { State } from '../domain/types';
import { all, button, cleanup, click, mount, text } from './operations/testDom';
import { SettingsData } from './SettingsData';

const store = vi.hoisted(() => ({ state: null as unknown, chars: 100_000, replace: vi.fn(), onClose: vi.fn() }));
vi.mock('../store/StoreContext', () => ({
  useStore: () => ({
    state: store.state, update: vi.fn(), replace: store.replace, author: 'Test', setAuthor: vi.fn(), connectFolder: vi.fn(), reconnectFolder: vi.fn(), disconnectFolder: vi.fn(), refresh: vi.fn(),
    folder: { status: 'local', name: '', contributors: [], hasDirection: true, lastSync: null, error: '' }, storageChars: store.chars, unreadable: null, dropCopy: vi.fn(),
  }),
}));

const NOW = new Date(2026, 8, 25, 10, 0), BEFORE = 'DELACOUR_PILOTAGE_V2.before-restore-';
// the storage of the browser: the one of Node (experimental, absent) is replaced by a map, as the other tests of Réglages do
let mem: Map<string, string>;
const stubStorage = () => { mem = new Map(); vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); }, clear: () => mem.clear(), get length() { return mem.size; }, key: (i: number) => [...mem.keys()][i] ?? null }); };
const keys = () => [...mem.keys()].filter(k => k.startsWith(BEFORE));
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
// a file chosen in the input that restores a backup (the first of the two file inputs)
async function choose(file: File, i = 0) {
  const input = all('input[type=file]')[i] as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  await flush(); await flush();
}
const backup = (s: State) => new File([JSON.stringify({ app: 'delacour-pilotage', version: 2, state: s })], 'sauvegarde.json', { type: 'application/json' });

beforeEach(() => { stubStorage(); store.state = demoState(NOW); store.chars = 100_000; store.replace = vi.fn(); store.onClose = vi.fn(); });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Repartir de zéro and Charger l\'exemple', () => {
  it('"Repartir de zéro" asks in the window of the application, counts the signed PV with the day of the last, and does nothing before the answer', async () => {
    localStorage.setItem(`${BEFORE}2026-10-07-154012`, JSON.stringify(demoState(NOW)));
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await click(button(/^Repartir de zéro$/));
    const dialog = document.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Repartir de zéro');
    expect(dialog.textContent).toContain('10 PV signés (dernier le 24/09/2026) seront perdus.');
    expect(dialog.textContent).toContain("ainsi que 1 copie des données d'avant une restauration");
    expect(dialog.textContent).toMatch(/Aucune sauvegarde exportée depuis ce poste\./);
    expect(store.replace).not.toHaveBeenCalled();
    await click(button(/^Annuler$/, dialog));                                   // Annuler: nothing is replaced, the window is gone
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(store.replace).not.toHaveBeenCalled();
    expect(keys()).toHaveLength(1);
    await click(button(/^Repartir de zéro$/));
    await click(button(/^Tout effacer$/));
    expect(store.replace).toHaveBeenCalledWith(null);
    expect(store.onClose).toHaveBeenCalled();
    expect(keys()).toEqual([]);                                                 // the copies kept before a restoration go with the data: "from zero" is from zero
    await m.unmount();
  });

  it('says the date of the last backup exported from this computer', async () => {
    localStorage.setItem('DELACOUR_PILOTAGE_PREF_lastBackup', new Date(2026, 8, 20, 14, 5).toISOString());
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await click(button(/^Repartir de zéro$/));
    expect(document.querySelector('[role=dialog]')!.textContent).toContain('Dernière sauvegarde exportée depuis ce poste : le 20/09/2026 14 h 05.');
    await m.unmount();
  });

  it('"Charger l\'exemple" asks the same way and replaces only after "Charger l\'exemple" in the window', async () => {
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await click(button(/^Charger l'exemple de démonstration$/));
    const dialog = document.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain("L'exemple fictif remplace les données actuelles.");
    expect(dialog.textContent).toMatch(/PV signés? .*(seront perdus|sera perdu)\.|Aucun PV signé ne disparaît/);
    expect(store.replace).not.toHaveBeenCalled();
    await click(button(/^Charger l'exemple$/, dialog));
    expect(store.replace).toHaveBeenCalledTimes(1);
    await m.unmount();
  });
});

describe('Restaurer une sauvegarde', () => {
  const fewer = () => { const s = demoState(NOW); delete s.deliveries.dl_demo_12; return s; };   // a backup older than the data: one signed PV less

  it('asks first, says the signed PV that are no longer in the data, then keeps the data replaced under their own key before replacing', async () => {
    const m = await mount(<SettingsData onClose={store.onClose} />), next = fewer();
    await choose(backup(next));
    const dialog = document.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Restaurer cette sauvegarde');
    expect(dialog.textContent).toContain('1 PV signé (dernier le 24/09/2026) ne sera plus dans les données.');
    expect(store.replace).not.toHaveBeenCalled();
    expect(keys()).toEqual([]);                                                 // asking changes nothing
    await click(button(/^Restaurer$/, dialog));
    await flush();
    expect(keys()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(keys()[0])!).deliveries.dl_demo_12.id).toBe('dl_demo_12');   // the data as they were, with the PV that the backup lacks
    expect(store.replace).toHaveBeenCalledTimes(1);
    expect(Object.keys((store.replace.mock.calls[0][0] as State).deliveries)).not.toContain('dl_demo_12');
    expect(text()).toContain('Sauvegarde restaurée. Les données remplacées sont gardées dans ce navigateur');
    expect(text()).toMatch(/Données d'avant la restauration du \d\d\/\d\d à \d+ h \d\d/);
    await m.unmount();
  });

  it('Annuler restores nothing and keeps nothing', async () => {
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await choose(backup(fewer()));
    await click(button(/^Annuler$/, document.querySelector('[role=dialog]')!));
    await flush();
    expect(store.replace).not.toHaveBeenCalled();
    expect(keys()).toEqual([]);
    await m.unmount();
  });

  it('when the browser has no room to keep the data, the question comes again and says so; "Restaurer sans copie" restores', async () => {
    store.chars = 4_500_000;
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await choose(backup(fewer()));
    await click(button(/^Restaurer$/, document.querySelector('[role=dialog]')!));
    await flush();
    const dialog = document.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain('Pas de place pour garder les données actuelles');
    expect(dialog.textContent).toContain("Le navigateur n'a pas la place de garder une copie des données actuelles");
    expect(dialog.textContent).toContain('1 PV signé (dernier le 24/09/2026) sera perdu.');
    expect(store.replace).not.toHaveBeenCalled();
    expect(keys()).toEqual([]);
    await click(button(/^Restaurer sans copie$/, dialog));
    await flush();
    expect(store.replace).toHaveBeenCalledTimes(1);
    expect(keys()).toEqual([]);
    expect(text()).toContain('Sauvegarde restaurée.');
    await m.unmount();
  });

  it('"Reprendre" puts the data of a kept copy back, after the same question, and keeps the data it replaces', async () => {
    const old = fewer();
    localStorage.setItem(`${BEFORE}2026-10-07-154012`, JSON.stringify(old));
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await click(button(/^Reprendre$/));
    const dialog = document.querySelector('[role=dialog]')!;
    expect(dialog.textContent).toContain("Reprendre les données d'avant la restauration");
    expect(dialog.textContent).toContain('1 PV signé (dernier le 24/09/2026) ne sera plus dans les données.');
    await click(button(/^Reprendre$/, dialog));
    await flush();
    expect(store.replace).toHaveBeenCalledTimes(1);
    expect(keys()).toHaveLength(2);                                             // the copy taken, and the data that it replaces
    await m.unmount();
  });

  it('a file that is not a backup, and a file of pictures only, ask nothing', async () => {
    const m = await mount(<SettingsData onClose={store.onClose} />);
    await choose(new File(['{"a":1}'], 'x.json'));
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(text()).toContain("Ce fichier n'est pas une sauvegarde du tableau de pilotage.");
    expect(store.replace).not.toHaveBeenCalled();
    await m.unmount();
  });
});
