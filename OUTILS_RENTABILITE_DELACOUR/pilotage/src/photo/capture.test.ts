// F-8: a photo is read once when it is taken, and its views of 1 600 and 480 px are made then (the store is the memory one of the test: no IndexedDB here; the browser is a few stand-ins).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRef } from './ref';
import { addPhoto, photoBlob } from './store';

// a picture of w x h pixels: `createImageBitmap` gives it, a canvas "draws" it and gives a blob whose text is the size drawn
function browser(w: number, h: number) {
  const read = vi.fn(async () => ({ width: w, height: h, close: vi.fn() })), canvases: { width: number; height: number }[] = [];
  vi.stubGlobal('createImageBitmap', read);
  vi.stubGlobal('document', {
    createElement: () => {
      const c = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (cb: (b: Blob | null) => void) => cb(new Blob([`${c.width}x${c.height}`], { type: 'image/jpeg' })) };
      canvases.push(c);
      return c;
    },
  });
  return { read, canvases };
}
const text = async (id: string, v: 'o' | 'v' | 't') => (await photoBlob(id, v))!.text();
const file = () => new Blob(['photo'], { type: 'image/jpeg' });
afterEach(() => { vi.unstubAllGlobals(); });

describe('addPhoto', () => {
  it('reads the file once and keeps the original and the two views, each from the size above', async () => {
    const b = browser(4032, 3024);
    const ref = await addPhoto(file(), 2560), p = parseRef(ref)!;
    expect(b.read).toHaveBeenCalledTimes(1);
    expect(b.canvases.map(c => `${c.width}x${c.height}`)).toEqual(['2560x1920', '1600x1200', '480x360']);
    expect([p.w, p.h]).toEqual([2560, 1920]);
    expect(await text(p.id, 'o')).toBe('2560x1920');
    expect(await text(p.id, 'v')).toBe('1600x1200');
    expect(await text(p.id, 't')).toBe('480x360');
    expect(b.read).toHaveBeenCalledTimes(1);   // the views were ready: nothing is decoded again to show them
    expect(b.canvases).toHaveLength(3);
  });
  it('a picture that is already small has no view bigger than itself: the original serves', async () => {
    const b = browser(1000, 750);
    const p = parseRef(await addPhoto(file(), 2560))!;
    expect(b.canvases.map(c => `${c.width}x${c.height}`)).toEqual(['1000x750', '480x360']);
    expect(await text(p.id, 't')).toBe('480x360');
    expect(await text(p.id, 'v')).toBe('1000x750');
  });
  it('the same picture taken again makes no view again', async () => {
    const b = browser(3000, 2000);
    const first = await addPhoto(file(), 2560), n = b.canvases.length;
    expect(await addPhoto(file(), 2560)).toBe(first);
    expect(b.canvases.length).toBe(n + 1);   // only the picture itself is drawn, to know it is the same
  });
  it('an image the browser cannot read is refused, as before', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('no'); }));
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL() {} });
    vi.stubGlobal('Image', class { onerror: (() => void) | null = null; set src(_: string) { setTimeout(() => this.onerror?.(), 0); } });
    await expect(addPhoto(file())).rejects.toThrow('Image illisible');
  });
});
