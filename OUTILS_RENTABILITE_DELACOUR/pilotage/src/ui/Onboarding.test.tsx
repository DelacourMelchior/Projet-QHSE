// First screen, without data: besides the example and the folder, a backup can be restored (the way out for a person whose data could not be read).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Onboarding } from './Onboarding';

vi.mock('../store/StoreContext', () => ({
  useStore: () => ({ replace: vi.fn(), folder: { status: 'local' }, author: '', setAuthor: vi.fn(), connectFolder: vi.fn(), reconnectFolder: vi.fn() }),
}));
beforeEach(() => {
  vi.stubGlobal('window', { location: { hash: '' } });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, length: 0, key: () => null });
});
afterEach(() => vi.unstubAllGlobals());

describe('first screen', () => {
  it('offers to restore a backup next to the example, with a file input that takes a .json', () => {
    const h = renderToStaticMarkup(<Onboarding />);
    expect(h).toContain('Restaurer une sauvegarde');
    expect(h).toContain('Voir un exemple');
    expect(h).toMatch(/<input[^>]*type="file"[^>]*accept="\.json,application\/json"/);
  });
});
