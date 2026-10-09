// S-8: a backup never fails in silence nor writes a file too big to be read back: the pictures are cut in files of a bounded size, and each file says where it belongs.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { batches, backupFile, BATCH, planPhotos, unpackPhotos } from './backup';
import { makeRef } from './ref';
import { photoBlob, putPhoto } from './store';

beforeAll(() => {   // no FileReader in node
  vi.stubGlobal('FileReader', class { result = ''; onload: () => void = () => {}; readAsDataURL(b: Blob) { b.arrayBuffer().then(buf => { this.result = `data:${b.type};base64,${Buffer.from(buf).toString('base64')}`; this.onload(); }); } });
});
const pic = (n: number, kb = 1) => { const a = new Uint8Array(kb * 1024); a.fill(n); return new Blob([a], { type: 'image/jpeg' }); };

describe('batches', () => {
  it('cuts the pictures in files of at most the bound, a bigger picture alone in its file', () => {
    const h = (size: number, i: number) => ({ id: `p${i}`, size });
    expect(batches([4, 4, 4, 12, 1].map(h), 10).map(f => f.map(x => x.size))).toEqual([[4, 4], [4], [12], [1]]);
    expect(batches([], 10)).toEqual([]);
    expect(batches([3, 3].map(h)).length).toBe(1);   // the usual case: one file, as before
    expect(BATCH).toBeLessThan(536870888 / 2);       // the browser's limit on a text, with room to read it back
  });
});

describe('a backup in several files', () => {
  it('counts what is held and what is only referenced, and every picture lands in exactly one file', async () => {
    const ids = [] as string[];
    for (let i = 0; i < 5; i++) ids.push((await putPhoto(pic(i + 1, 4), 10, 10)).replace(/^photo:|-10-10$/g, ''));
    const state = { a: { photos: ids.map(id => makeRef(id, 10, 10)) }, gone: makeRef('ab'.repeat(12), 10, 10) };
    const { held, refs } = await planPhotos(state);
    expect(held.length).toBe(5); expect(refs).toBe(6);   // "5 photos sur 6" : one has no original here
    expect(held.every(h => h.size === 4096)).toBe(true);

    const parts = batches(held, 2 * 4096 + 10);          // two pictures per file: 3 files
    expect(parts.map(p => p.length)).toEqual([2, 2, 1]);
    const files = await Promise.all(parts.map((_, i) => backupFile(state, parts, i, '2026-10-07T00:00:00Z'))).then(t => t.map(x => JSON.parse(x)));
    expect(files[0].state).toEqual(state);
    expect(files[1].state).toBeUndefined(); expect(files[2].state).toBeUndefined();
    expect(files.map(f => [f.part, f.of])).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect(files.flatMap(f => Object.keys(f.photos)).sort()).toEqual([...ids].sort());
    expect((await Promise.all(files.map(f => unpackPhotos(f.photos)))).reduce((a, b) => a + b, 0)).toBe(5);   // each file puts its pictures back
    expect(await photoBlob(ids[4], 'o')).not.toBeNull();
  });
  it('one file stays the file it always was; without pictures, the data only', async () => {
    const state = { x: 1 };
    const one = JSON.parse(await backupFile(state, [], 0, 'T'));
    expect(one).toEqual({ app: 'delacour-pilotage', version: 2, exportedAt: 'T', state, photos: {} });
    const { held } = await planPhotos({ y: makeRef('cd'.repeat(12), 1, 1) });
    expect(held).toEqual([]);
  });
});
