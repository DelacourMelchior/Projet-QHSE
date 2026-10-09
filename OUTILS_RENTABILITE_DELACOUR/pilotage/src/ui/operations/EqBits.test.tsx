// "Annuler": one bar at a time for the whole tool (the page, a window and a tab each have their own `useUndo`), the latest offer wins and stays undoable;
// the screens that cover the banner of the page say what the browser says of its room.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import { newSpare } from '../../domain/maintenanceSpares';
import { Strip, StorageNote, useCountCabinet, useUndo } from './EqBits';

const store = vi.hoisted(() => ({ storageFull: false, storageNear: false, storageChars: 0, draft: undefined as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: (f: (d: unknown) => void) => f(store.draft), author: 'Test', ...store }) }));

type Undo = ReturnType<typeof useUndo>;
const screens: Record<string, Undo> = {};
// three screens that draw their own bar, like the page, a sheet and one of its tabs; the same tree rendered again keeps each screen's identity (`useId`)
const Screen = ({ k }: { k: string }) => { const u = useUndo(); screens[k] = u; return <section data-k={k}>{u.bar}</section>; };
const draw = () => renderToStaticMarkup(<><Screen k="page" /><Screen k="sheet" /><Screen k="tab" /></>);
const bars = (html: string) => html.match(/Annuler/g)?.length ?? 0;
// the "Annuler" button of the bar of a screen, as the tap would reach it
const tap = (k: string) => (screens[k].bar as unknown as { props: { children: { props: { onClick(): void } }[] } }).props.children[1].props.onClick();

describe('3.3 the bar "Annuler"', () => {
  beforeAll(() => { vi.stubGlobal('window', globalThis); });
  afterAll(() => { vi.unstubAllGlobals(); });
  beforeEach(() => { vi.useFakeTimers(); store.storageFull = false; store.storageNear = false; draw(); screens.page.offer('', () => {}); draw(); tap('page'); });   // starts from a clean module state
  afterEach(() => { vi.useRealTimers(); });

  it('draws nothing before a move, then one bar for the screen that offered', () => {
    expect(bars(draw())).toBe(0);
    screens.sheet.offer('Point retiré : Niveau d\'huile', () => {});
    const html = draw();
    expect(bars(html)).toBe(1);
    expect(html).toContain('Point retiré');
    expect(html.indexOf('data-k="sheet"')).toBeLessThan(html.indexOf('Point retiré'));   // inside the screen that offered
    expect(html.indexOf('Point retiré')).toBeLessThan(html.indexOf('data-k="tab"'));
  });

  it('keeps ONE bar when two screens offer one after the other: the latest, never two at the same place', () => {
    screens.page.offer('Commande de 1 notée : Courroie', () => {});
    screens.tab.offer('Pièce rangée : Bague', () => {});
    const html = draw();
    expect(bars(html)).toBe(1);
    expect(html).toContain('Pièce rangée');
    expect(html).not.toContain('Commande de 1 notée');
    // and back: the page offers again, the bar of the tab is gone
    screens.page.offer('Armoire comptée', () => {});
    expect(draw()).not.toContain('Pièce rangée');
    expect(bars(draw())).toBe(1);
  });

  it('undoes the latest move, once, and closes the bar', () => {
    const first = vi.fn(), latest = vi.fn();
    screens.page.offer('Commande notée', first);
    screens.tab.offer('Pièce rangée', latest);
    draw(); tap('tab');
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(bars(draw())).toBe(0);
  });

  it('lets a move offered from inside an undo keep its own bar', () => {
    screens.page.offer('Pièce supprimée', () => screens.tab.offer('Remise', () => {}));
    draw(); tap('page');
    const html = draw();
    expect(bars(html)).toBe(1);
    expect(html).toContain('Remise');
  });

  it('leaves after 8 seconds', () => {
    screens.sheet.offer('Retiré', () => {});
    expect(bars(draw())).toBe(1);
    vi.advanceTimersByTime(7900);
    expect(bars(draw())).toBe(1);
    vi.advanceTimersByTime(200);
    expect(bars(draw())).toBe(0);
  });

  it('a second offer restarts the 8 seconds', () => {
    screens.sheet.offer('Premier', () => {});
    vi.advanceTimersByTime(6000);
    screens.tab.offer('Second', () => {});
    vi.advanceTimersByTime(6000);
    expect(draw()).toContain('Second');
    vi.advanceTimersByTime(2100);
    expect(bars(draw())).toBe(0);
  });

  it('says that the browser is full instead of confirming the move, in the one bar', () => {
    store.storageFull = true;
    screens.tab.offer('Pièce rangée : Bague', () => {});
    const html = draw();
    expect(bars(html)).toBe(1);
    expect(html).toContain('Non enregistré : le navigateur est plein');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Pièce rangée');
  });
});

describe('3.3 what the browser says of its room, inside the screens that cover the page banner', () => {
  beforeEach(() => { store.storageFull = false; store.storageNear = false; store.storageChars = 0; });
  it('says nothing when all is well', () => {
    expect(renderToStaticMarkup(<StorageNote near />)).toBe('');
  });
  it('warns from 80 % in the routine, with the share, and not in a window', () => {
    store.storageNear = true; store.storageChars = 4_250_000;
    const html = renderToStaticMarkup(<StorageNote near />);
    expect(html).toContain('Le navigateur est plein à 85 %');
    expect(html).toContain('role="status"');
    expect(renderToStaticMarkup(<StorageNote />)).toBe('');
  });
  it('says "Non enregistré" in an alert, in the routine and in a window, over the warning', () => {
    store.storageNear = true; store.storageFull = true; store.storageChars = 5_300_000;
    for (const html of [renderToStaticMarkup(<StorageNote near />), renderToStaticMarkup(<StorageNote />)]) {
      expect(html).toContain('Non enregistré : le navigateur est plein');
      expect(html).toContain('role="alert"');
      expect(html).not.toContain('plein à');
    }
  });
});

describe('3.3 "Armoire comptée : N pièces, rien à signaler"', () => {
  const say = (draft: unknown): string[] => {
    store.draft = draft;
    const said: string[] = []; let count = () => {};
    const Probe = () => { count = useCountCabinet(what => said.push(what)); return null; };
    renderToStaticMarkup(<Probe />);
    count();
    return said;
  };
  it('says how many parts were counted, the real number, in the plural', () => {
    const s = demoState(new Date(2026, 8, 25)), n = Object.values(s.spares).filter(x => !x.retired).length;
    expect(n).toBeGreaterThan(1);
    expect(say(s)).toEqual([`Armoire comptée : ${n} pièces, rien à signaler`]);
  });
  it('says "1 pièce" for one part, and counts neither a retired one', () => {
    const s = { ...demoState(new Date(2026, 8, 25)), spares: { a: { ...newSpare(), id: 'a', name: 'Joint' }, b: { ...newSpare(), id: 'b', name: 'Vieux', retired: true } } };
    expect(say(s)).toEqual(['Armoire comptée : 1 pièce, rien à signaler']);
  });
});

describe('3.3 the strip of the periods', () => {
  it('draws "à surveiller" on amber-700 (white on it is 5:1), the same amber as the routine at the machine', () => {
    const html = renderToStaticMarkup(<Strip items={[{ from: '2026-09-14', to: '2026-09-20', state: 'watch' }, { from: '2026-09-21', to: '2026-09-27', state: 'ok' }]} />);
    expect(html).toContain('bg-amber-700 text-white');
    expect(html).not.toContain('bg-amber-600');
    expect(html).toContain('à surveiller');   // the label still says it
  });
});
