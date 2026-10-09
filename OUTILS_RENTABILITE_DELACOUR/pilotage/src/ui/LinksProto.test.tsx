// @vitest-environment happy-dom
// L-7: an address that carries a name of `Object.prototype` (`#2.1~constructor`, `#3.2~__proto__`…, the shape 3.4 gives to its links and its QR codes) opens the tool on its list; it never
// stops it ("Cet outil n'a pas pu s'afficher"). The six tools linked to 3.4 are PLAYED in a DOM (happy-dom): the lookup of the record is made by an effect, which a static render does not run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { demoState } from '../domain/templates';
import { applyQualityExample } from '../domain/qualityExamples';
import { applySopExample } from '../domain/instructionsExamples';
import { cleanup, mount, text } from './operations/testDom';
import { Devis } from './commercial/Devis';
import { Reclamations } from './commercial/Reclamations';
import { BilanFin } from './commercial/BilanFin';
import { Ateliers } from './quality/Ateliers';
import { Detrompeurs } from './quality/Detrompeurs';
import { Instructions } from './operations/Instructions';
import type { ScreenProps } from './screens';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../store/StoreContext', () => ({
  useStore: () => ({ state: store.state, update: () => {}, author: 'Test', teamView: false, storageFull: false, period: '2026-09', setPeriod: () => {}, folder: { status: 'local', name: '', contributors: [], hasDirection: true, lastSync: null, error: '' } }),
}));

const NAMES = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
const SCREENS: [string, ComponentType<ScreenProps>, string[]][] = [
  ['2.1', Devis, NAMES], ['2.3', Reclamations, NAMES], ['2.4', BilanFin, NAMES], ['5.3', Ateliers, NAMES], ['5.4', Detrompeurs, NAMES],
  ['3.2', Instructions, [...NAMES, ...NAMES.map(n => `station:${n}`)]],
];
beforeEach(() => { const s = demoState(new Date(2026, 8, 25, 10, 0)); applyQualityExample(s); applySopExample(s); store.state = s; });
afterEach(async () => { await cleanup(); vi.restoreAllMocks(); });

describe('L-7: an address with a name of the prototype opens the tool, it does not stop it', () => {
  for (const [id, Screen, focuses] of SCREENS) {
    it(`#${id}~constructor, __proto__, toString…: the tool stays on its list, whatever the data hold`, async () => {
      const nav = { open: vi.fn(), tool: vi.fn() } as never;
      for (const focus of focuses) {
        const clear = vi.fn(), m = await mount(<Screen nav={nav} focus={focus} clearFocus={clear} />);   // a crash in the effect rejects here
        expect(text().length, `${id} ${focus}`).toBeGreaterThan(20);
        expect(text(), `${id} ${focus}`).not.toContain("n'a pas pu s'afficher");
        await m.unmount();
      }
    });
  }
  it('a record that exists is still opened by its id (the guard does not close the real links)', async () => {
    const s = store.state as ReturnType<typeof demoState>, qid = Object.keys(s.quotes)[0], clear = vi.fn();
    const m = await mount(<Devis nav={{ open: vi.fn(), tool: vi.fn() } as never} focus={qid} clearFocus={clear} />);
    expect(clear).toHaveBeenCalled();   // the screen found the quote and took the address
    await m.unmount();
  });
});
