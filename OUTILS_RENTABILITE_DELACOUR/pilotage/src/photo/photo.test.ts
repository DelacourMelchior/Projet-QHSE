// Photo references, the document that draws them, and the store (memory fallback in the test: no IndexedDB here).
import { describe, expect, it } from 'vitest';
import { cleanEdit, isRef, makeRef, parseRef, refIds, withEdit } from './ref';
import { legendOf, photoDoc, turned } from './doc';
import { fingerprint, imageDims, inlineMap, isInline, photoBlob, photoUrl, putPhoto, replaceStrings, toRef } from './store';

const jpeg = (w: number, h: number) => {   // the header of a JPEG with its size, enough to be read
  const b = new Uint8Array(40); b.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3]);
  return b;
};
const dataUrl = (bytes: Uint8Array, mime = 'image/jpeg') => `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`;

describe('photo reference', () => {
  it('writes and reads a reference with its edit', () => {
    const plain = makeRef('a1b2c3d4e5f6a1b2c3d4e5f6', 4032, 3024);
    expect(plain).toBe('photo:a1b2c3d4e5f6a1b2c3d4e5f6-4032-3024');
    expect(parseRef(plain)).toEqual({ id: 'a1b2c3d4e5f6a1b2c3d4e5f6', w: 4032, h: 3024, edit: {} });
    const edited = makeRef('a1b2c3d4e5f6a1b2c3d4e5f6', 4032, 3024, { r: 1, c: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, b: 10, m: [{ k: 'text', x: 0.2, y: 0.3, t: 'À 12 Nm, « serré »' }] });
    const p = parseRef(edited)!;
    expect(p.edit.r).toBe(1);
    expect(p.edit.b).toBe(10);
    expect(p.edit.m).toEqual([{ k: 'text', x: 0.2, y: 0.3, t: 'À 12 Nm, « serré »' }]);
    expect(isRef(edited)).toBe(true);
    expect(isRef('data:image/jpeg;base64,AAAA')).toBe(false);
    expect(isRef('photo:abc')).toBe(false);   // the form of the previous version is not a reference
  });
  it('keeps a reference short and free of default values', () => {
    expect(makeRef('abcdef123456', 10, 10, { r: 0, t: 0, b: 0, k: 0, m: [] })).toBe('photo:abcdef123456-10-10');
    expect(makeRef('abcdef123456', 10, 10, { m: Array.from({ length: 10 }, (_, i) => ({ k: 'cross', x: i / 10 + 0.01234567, y: 0.5, color: '#dc2626' })) }).length).toBeLessThan(900);
  });
  it('refuses what is out of range or unreadable', () => {
    expect(cleanEdit({ r: 7, t: 99, b: -500, c: { x: 0, y: 0, w: 1, h: 1 }, m: 'x' })).toEqual({ t: 15, b: -50 });
    expect(parseRef('photo:abcdef123456-10-10~AAAA')!.edit).toEqual({});
    expect(withEdit('data:image/png;base64,AA', { r: 1 })).toBe('data:image/png;base64,AA');
  });
  it('finds every photo id in records', () => {
    const ids = refIds({ a: ['photo:aaaaaa111111-10-10~xyz', 'text'], b: { c: 'photo:bbbbbb222222-5-5' } });
    expect([...ids].sort()).toEqual(['aaaaaa111111', 'bbbbbb222222']);
  });
});

describe('document of a photo', () => {
  const ref = (edit = {}) => ({ id: 'abcdef123456', w: 4000, h: 3000, edit });
  it('lays the picture out with its long side at 1 000 units, turned', () => {
    expect(photoDoc(ref(), 'blob:x', 'u').w).toBe(1000);
    expect(photoDoc(ref(), 'blob:x', 'u').h).toBe(750);
    expect(turned(ref({ r: 1 }))).toEqual({ tw: 3000, th: 4000 });
    const d = photoDoc(ref({ r: 1 }), 'blob:x', 'u');
    expect([d.w, d.h]).toEqual([750, 1000]);
    expect(d.base).toContain('matrix(0 1 -1 0');
  });
  it('shows only the crop, adjusts light and straightens', () => {
    const d = photoDoc(ref({ c: { x: 0.5, y: 0, w: 0.5, h: 1 }, b: 20, k: -10, t: 3 }), 'blob:x', 'u');
    expect(d.win).toEqual({ x: 500, y: 0, w: 500, h: 750 });
    expect(d.defs).toContain('feComponentTransfer');
    expect(d.base).toContain('filter="url(#fl-u)"');
    expect(d.base).toContain('rotate(3)');
    expect(photoDoc(ref(), 'blob:x', 'u').defs).toBe('');
  });
  it('draws the marks, without the empty words, and keys the numbered ones with a caption', () => {
    const edit = { m: [{ k: 'cross', x: 0.5, y: 0.5 }, { k: 'text', x: 0.1, y: 0.1, t: ' ' }, { k: 'number', x: 0.2, y: 0.2, n: 2, label: 'Clipser' }, { k: 'number', x: 0.3, y: 0.3, n: 1, label: 'Aligner' }] };
    const d = photoDoc(ref(edit), 'blob:x', 'u');
    expect(d.marks).toContain('rotate(0)');
    expect(d.marks).not.toContain('> </text>');
    expect(legendOf(ref(edit))).toEqual([{ n: 1, label: 'Aligner' }, { n: 2, label: 'Clipser' }]);
  });
});

describe('photo store', () => {
  it('reads the size of a picture in its bytes', () => {
    expect(imageDims(jpeg(4032, 3024), 'image/jpeg')).toEqual({ w: 4032, h: 3024 });
    expect(imageDims(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">'), 'image/svg+xml')).toEqual({ w: 400, h: 300 });
    expect(imageDims(new Uint8Array(10), 'image/jpeg')).toBeNull();
  });
  it('gives the same fingerprint to the same bytes only', async () => {
    const a = await fingerprint(jpeg(10, 10).buffer as ArrayBuffer), b = await fingerprint(jpeg(10, 10).buffer as ArrayBuffer), c = await fingerprint(jpeg(11, 10).buffer as ArrayBuffer);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{24}$/);
  });
  it('keeps an original once and gives it back, as an address a page can show', async () => {
    const blob = new Blob([jpeg(1600, 1200)], { type: 'image/jpeg' });
    const ref = await putPhoto(blob, 1600, 1200), again = await putPhoto(blob, 1600, 1200);
    expect(again).toBe(ref);
    const p = parseRef(ref)!;
    expect((await photoBlob(p.id, 'o'))!.size).toBe(blob.size);
    expect(await photoUrl(p.id, 'o')).toMatch(/^blob:/);
    expect(await photoBlob('0123456789abcdef01234567', 'o')).toBeNull();
  });
  it('moves the big pictures of the records to the store and leaves the small drawings', async () => {
    const bytes = new Uint8Array(20000); bytes.set(jpeg(3000, 2000));
    const big = dataUrl(bytes), small = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"/>');
    expect(isInline(big)).toBe(true);
    expect(isInline(small)).toBe(false);
    const data = { s: { goodPhoto: big, steps: [{ photo: small }, { photo: big }] } };
    const map = await inlineMap(data);
    expect(map.size).toBe(1);
    const out = replaceStrings(data, map);
    expect(isRef(out.s.goodPhoto)).toBe(true);
    expect(out.s.steps[0].photo).toBe(small);
    expect(out.s.steps[1].photo).toBe(out.s.goodPhoto);   // same picture, same reference
    expect(parseRef(out.s.goodPhoto)).toMatchObject({ w: 3000, h: 2000 });
    expect(await toRef(out.s.goodPhoto)).toBe(out.s.goodPhoto);   // idempotent
  });
  it('turns a picture saved by the previous editor into a reference with its marks', async () => {
    const photo = dataUrl(jpeg(1280, 960)), marks = [{ k: 'cross', x: 0.4, y: 0.4, thick: 2 }];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><metadata id="dc-marks">${JSON.stringify(marks).replace(/"/g, '&quot;')}</metadata><image href="${photo}" width="1280" height="960"/></svg>`;
    const ref = await toRef(`data:image/svg+xml;base64,${btoa(svg)}`);
    const p = parseRef(ref)!;
    expect([p.w, p.h]).toEqual([1280, 960]);
    expect(p.edit.m).toEqual([{ k: 'cross', x: 0.4, y: 0.4, thick: 2 }]);
  });
});
