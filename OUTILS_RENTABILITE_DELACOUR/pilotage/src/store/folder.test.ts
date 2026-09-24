// Shared folder: several authors, direction rights, migration of the previous version's journals.
// Uses a minimal in-memory implementation of the File System Access handles.
import { describe, expect, it } from 'vitest';
import { FolderSession, initDataFolder } from './folder';
import { demoState } from '../domain/templates';

class MemFile {
  kind = 'file' as const;
  constructor(public name: string, public data = '') {}
  async getFile() { return { text: async () => this.data }; }
  async createWritable() { let buf = ''; return { write: async (s: string) => { buf += s; }, close: async () => { this.data = buf; } }; }
}
class MemDir {
  kind = 'directory' as const;
  children = new Map<string, MemDir | MemFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(n: string, o?: { create?: boolean }) {
    let c = this.children.get(n);
    if (!c && o?.create) { c = new MemDir(n); this.children.set(n, c); }
    if (!(c instanceof MemDir)) throw new DOMException('not found', 'NotFoundError');
    return c;
  }
  async getFileHandle(n: string, o?: { create?: boolean }) {
    let c = this.children.get(n);
    if (!c && o?.create) { c = new MemFile(n); this.children.set(n, c); }
    if (!(c instanceof MemFile)) throw new DOMException('not found', 'NotFoundError');
    return c;
  }
  async *entries() { yield* this.children.entries(); }
}
const asDir = (d: MemDir) => d as unknown as FileSystemDirectoryHandle;

describe('shared folder', () => {
  it('two people write their own file; the newest value wins; direction values stay in direction/', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const a = new FolderSession(asDir(root), 'Jean-Marc');
    expect(await a.load()).toBeNull();                 // empty folder
    const demo = demoState();
    await a.save(demo);                                // publishes everything
    const equipe = root.children.get('equipe') as MemDir, direction = root.children.get('direction') as MemDir;
    expect([...equipe.children.keys()]).toEqual(['pilotage-jean-marc.json']);
    expect(direction.children.get('pilotage-jean-marc.json')!.constructor).toBe(MemFile);
    const teamFile = (equipe.children.get('pilotage-jean-marc.json') as MemFile).data;
    expect(teamFile).not.toContain('value|kpi_ca|');   // confidential amounts never in the team folder

    const b = new FolderSession(asDir(root), 'Sandrine');
    const sb = (await b.load())!;
    sb.values.kpi_cnq['2026-12'] = 310;
    await b.save(sb);
    expect((equipe.children.get('pilotage-sandrine.json') as MemFile).data).toContain('value|kpi_cnq|2026-12');

    await new Promise(r => setTimeout(r, 5));
    const sa = (await a.load())!;
    expect(sa.values.kpi_cnq['2026-12']).toBe(310);
    sa.values.kpi_cnq['2026-12'] = 295;
    await a.save(sa);
    expect((await b.load())!.values.kpi_cnq['2026-12']).toBe(295);
    expect(b.contributors.sort()).toEqual(['Jean-Marc', 'Sandrine']);
  });

  it('without the direction folder, confidential values are neither read nor written', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    await new FolderSession(asDir(root), 'Jean-Marc').save(demoState());
    root.children.delete('direction');                 // Karim has no rights on it
    const k = new FolderSession(asDir(root), 'Karim');
    const s = (await k.load())!;
    expect(k.hasDirection).toBe(false);
    expect(s.values.kpi_ca).toBeUndefined();
    expect(s.values.kpi_otif['2026-12']).toBe(98.3);
    s.values.kpi_ca = { '2026-12': 1 };                // even if something sets it, it is not published
    await k.save(s);
    // the only change was confidential: nothing is written at all
    expect((root.children.get('equipe') as MemDir).children.get('pilotage-karim.json')).toBeUndefined();
  });

  it('writes the crisis binder next to the data folders', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    await new FolderSession(asDir(root), 'Jean').writeFile('Classeur-de-crise.pdf', '%PDF-1.4');
    expect((root.children.get('Classeur-de-crise.pdf') as MemFile).data).toBe('%PDF-1.4');
  });

  it("migrates the previous version's journals once", async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const equipe = root.children.get('equipe') as MemDir;
    const legacy = {
      timeline: ['2026-01', '2026-02'],
      'process|P1': { name: 'P1 : Direction', order: 0, kpis: ['kpi_otif'] },
      'kpi|kpi_otif': { id: 'kpi_otif', name: 'OTIF', unit: '%', goalDirection: 'higher', calcType: 'avg', targetVal: 95, target: '≥ 95 %' },
      'value|kpi_otif|2026-02': '97,5 %',
    };
    equipe.children.set('journal-ancien.json', new MemFile('journal-ancien.json',
      JSON.stringify({ author: 'Ancien', entries: Object.fromEntries(Object.entries(legacy).map(([k, v]) => [k, { ts: '2026-01-01T00:00:00Z', v }])) })));
    const s = new FolderSession(asDir(root), 'Nouveau');
    const st = (await s.load())!;
    expect(st.values.kpi_otif).toEqual({ '2026-02': 97.5 });
    expect(st.kpis.kpi_otif.role).toBe('otif');
    await s.save(st);
    expect([...equipe.children.keys()]).toContain('pilotage-nouveau.json');
  });
});
