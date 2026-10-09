// @vitest-environment happy-dom
// F-8: a second tap on "Imprimer" while the first still waits for the pictures adds no wait; once the dialog was asked for, a new tap prints again.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, mount, text } from './operations/testDom';
import { usePrintOne } from './PrintOne';

const photos = vi.hoisted(() => ({ ready: vi.fn(), release: null as null | (() => void) }));
vi.mock('../photo/store', () => ({ photosReady: () => { photos.ready(); return new Promise<void>(r => { photos.release = r; }); } }));

let print: (c: React.ReactNode, page?: string) => void;
function Probe() { const [node, p] = usePrintOne(); print = p; return <>{node}</>; }
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const tap = () => act(async () => { print(<p>Le document</p>); });

beforeEach(() => { vi.useFakeTimers(); window.print = vi.fn(); photos.ready.mockClear(); photos.release = null; });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe('usePrintOne', () => {
  it('waits for the pictures once, whatever the number of taps, then asks for the dialog once', async () => {
    await mount(<Probe />);
    await tap(); await tick(40);
    expect(text()).toContain("Préparation de l'impression");
    await tap(); await tap();                                        // the person taps again, twice: nothing starts again
    await tick(20);                                                  // 60 ms after the first tap: the first wait is under way (it would not be if the taps had started it again)
    expect(photos.ready).toHaveBeenCalledTimes(1);
    await act(async () => { photos.release!(); });
    await tick(300);
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(photos.ready).toHaveBeenCalledTimes(1);
  });
  it('once the dialog was asked for, a new tap prints again', async () => {
    await mount(<Probe />);
    await tap(); await tick(60); await act(async () => { photos.release!(); }); await tick(300);
    expect(window.print).toHaveBeenCalledTimes(1);
    await tap(); await tick(60); await act(async () => { photos.release!(); }); await tick(300);
    expect(window.print).toHaveBeenCalledTimes(2);
  });
});
