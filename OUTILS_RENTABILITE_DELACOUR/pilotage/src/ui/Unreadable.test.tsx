// The banner for unreadable data (audit N-02): "Une copie est gardée" only when a copy is kept; otherwise it asks for the download at once.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Unreadable } from './Unreadable';

let store: { unreadable: string | null; uncopied: boolean };
vi.mock('../store/StoreContext', () => ({ useStore: () => ({ ...store, release: vi.fn() }) }));
const html = () => renderToStaticMarkup(<Unreadable />).replace(/&#x27;/g, "'");

describe('banner of unreadable data', () => {
  it('a copy is kept: says so and offers it', () => {
    store = { unreadable: 'DELACOUR_PILOTAGE_V2.corrupt-2026-10-06-1840', uncopied: false };
    const h = html();
    expect(h).toContain('Une copie est gardée');
    expect(h).toContain('Télécharger la copie');
  });
  it('no copy could be written: never says that one is kept, asks for the download at once and says nothing is saved until then', () => {
    store = { unreadable: null, uncopied: true };
    const h = html();
    expect(h).not.toContain('Une copie est gardée');
    expect(h).toContain("n'ont pas pu être copiées dans le navigateur : télécharger tout de suite");
    expect(h).toContain('Télécharger les données');
    expect(h).toContain('Rien n\'est enregistré dans ce navigateur');
  });
  it('nothing unreadable: nothing shown', () => {
    store = { unreadable: null, uncopied: false };
    expect(html()).toBe('');
  });
});
