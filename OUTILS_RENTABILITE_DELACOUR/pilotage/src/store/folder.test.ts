// Shared folder: several authors, direction rights, migration of the previous version's journals.
// Uses a minimal in-memory implementation of the File System Access handles.
import { describe, expect, it } from 'vitest';
import { FolderSession, initDataFolder } from './folder';
import { demoState } from '../domain/templates';
import { newEquipment, recordInspection, reportAnomaly } from '../domain/maintenance';
import type { Equipment, State } from '../domain/types';
import { takeOut } from '../domain/maintenanceSpares';

class MemFile {
  kind = 'file' as const;
  constructor(public name: string, public data = '') {}
  bytes: Uint8Array | null = null;
  async getFile() { return { text: async () => this.data, arrayBuffer: async () => (this.bytes || new TextEncoder().encode(this.data)).buffer }; }
  async createWritable() { let buf = ''; return { write: async (s: string | Uint8Array) => { if (typeof s === 'string') buf += s; else this.bytes = s; }, close: async () => { this.data = buf; } }; }
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
  it('stores photos as separate files and the codes of the vital powers in direction/', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const a = new FolderSession(asDir(root), 'Jean-Marc');
    const s = demoState();
    const img = 'data:image/jpeg;base64,' + btoa('fake-jpeg-bytes');
    s.sops.sop_demo_1.goodPhoto = img;
    await a.load();
    await a.save(s);
    const photos = root.children.get('photos') as MemDir;
    const names = [...photos.children.keys()];
    expect(names.filter(n => n.endsWith('.jpg'))).toHaveLength(1);   // the photo above
    expect(names.filter(n => n.endsWith('.svg')).length).toBeGreaterThan(20);   // the drawings of the example sheets keep their type
    const equipe = (root.children.get('equipe') as MemDir).children.get('pilotage-jean-marc.json') as MemFile;
    expect(equipe.data).not.toContain('fake');
    expect(equipe.data).not.toContain('codes sous pli');
    expect(equipe.data).not.toContain('enveloppe scellée signée');
    const back = await new FolderSession(asDir(root), 'Sophie').load();
    expect(back!.sops.sop_demo_1.goodPhoto).toBe(img);
    expect(back!.sops.sop_demo_4).toEqual(s.sops.sop_demo_4);   // drawings come back as they were written
    expect(back!.params.sop?.plan).toBe(s.params.sop?.plan);
    expect(back!.powers.pw_demo_1.access).toMatch(/coffre/);
  });

  // Equipment and spare parts of several people are folded on load, never replaced by the newest copy alone
  const wait = () => new Promise(r => setTimeout(r, 5));
  it('keeps what each person did on the same equipment and the same part, and a later deletion stays deleted', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const a = new FolderSession(asDir(root), 'Alice'), b = new FolderSession(asDir(root), 'Bob'), c = new FolderSession(asDir(root), 'Carole');
    await a.load();
    await a.save(demoState());
    const sa = (await a.load())!, sb = (await b.load())!, sc = (await c.load())!;   // all three start from the same data
    const eq = 'eq_demo_fourgon', sp = 'sp_demo_courroie';   // stock 2
    sa.equipments[eq] = recordInspection(sa.equipments[eq], { date: '2026-10-06', at: '2026-10-06T08:00', by: 'Alice', results: sa.equipments[eq].checkpoints.map(() => 'ok' as const), note: '' });
    sb.equipments[eq] = reportAnomaly(sb.equipments[eq], { label: 'Fuite', severity: 'degraded', by: 'Bob' }, '2026-10-06T09:00');
    sc.equipments[eq] = reportAnomaly(sc.equipments[eq], { label: 'Bruit', severity: 'degraded', by: 'Carole' }, '2026-10-06T10:00');
    sa.spares[sp] = takeOut(sa.spares[sp], 'Alice');
    sb.spares[sp] = takeOut(sb.spares[sp], 'Bob');
    for (const [x, st] of [[a, sa], [b, sb], [c, sc]] as const) { await x.save(st); await wait(); }
    const m = (await new FolderSession(asDir(root), 'Dan').load())!;
    expect(m.equipments[eq].inspections).toHaveLength(1);                       // Alice's routine
    expect((m.equipments[eq].anomalies || []).map(x => x.label).sort()).toEqual(['Bruit', 'Fuite']);   // Bob's and Carole's reports
    expect(m.spares[sp].stock).toBe(0);                                         // two parts taken by two people
    expect(m.spares[sp].moves).toHaveLength(demoState().spares[sp].moves!.length + 2);
    // a person deletes the equipment after all this: it stays deleted for everyone, whatever the older copies hold
    const d = new FolderSession(asDir(root), 'Dan');
    const sd = (await d.load())!;
    delete sd.equipments[eq];
    await d.save(sd);
    expect((await new FolderSession(asDir(root), 'Eve').load())!.equipments[eq]).toBeUndefined();
  });
  it('gives the photo references back as they were written', async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const REF = 'photo:0123456789abcdef01234567-640-480', RETOUCHED = `${REF}~eyJyIjoxfQ`;
    const s = demoState();
    s.equipments.eq_demo_cnc.photo = REF; s.equipments.eq_demo_cnc.checkpoints[0].photo = RETOUCHED; s.spares.sp_demo_courroie.photo = REF;
    const a = new FolderSession(asDir(root), 'Alice');
    await a.load();
    await a.save(s);
    const b = new FolderSession(asDir(root), 'Bob');
    const sb = (await b.load())!;
    expect([sb.equipments.eq_demo_cnc.photo, sb.equipments.eq_demo_cnc.checkpoints[0].photo, sb.spares.sp_demo_courroie.photo]).toEqual([REF, RETOUCHED, REF]);
    sb.equipments.eq_demo_cnc.location = 'Atelier B';    // Bob saves one change: the references must not be wiped for the others
    await b.save(sb);
    await wait();
    const sc = (await new FolderSession(asDir(root), 'Chloé').load())!;
    expect(sc.equipments.eq_demo_cnc.photo).toBe(REF);
    expect(sc.equipments.eq_demo_cnc.location).toBe('Atelier B');
  });
});

// Equipment and parts carry `touched`: what each computer typed since it read the folder, so that a gesture made from an old base never brings old typed content back
describe('typed fields of an equipment or a part, per computer', () => {
  const wait = () => new Promise(r => setTimeout(r, 5));
  const EQ = 'eq_demo_cnc', SP = 'sp_demo_courroie';
  const routine = (e: Equipment, by: string) => recordInspection(e, { date: '2026-10-06', at: '2026-10-06T14:00', by, results: e.checkpoints.map(() => 'ok' as const), note: '' });
  const entries = (root: MemDir, who: string) => JSON.parse((((root.children.get('equipe') as MemDir).children.get(`pilotage-${who}.json`)) as MemFile).data).entries as Record<string, { v: Record<string, unknown> }>;
  const start = async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const a = new FolderSession(asDir(root), 'Alice'), b = new FolderSession(asDir(root), 'Bob');
    await a.load(); await a.save(demoState()); await wait();
    return { root, a, b };
  };

  it('are written with the record, add up while the computer has not read the folder, and are not in the state that is read', async () => {
    const { root, a } = await start();
    const sa = (await a.load())!;
    sa.equipments[EQ] = { ...sa.equipments[EQ], operator: 'Nouvelle personne', safety: [...(sa.equipments[EQ].safety || []), 'Nouvelle consigne'] };
    sa.spares[SP] = { ...sa.spares[SP], place: 'Nouveau tiroir' };
    await a.save(sa);
    expect([...(entries(root, 'alice')[`equipment|${EQ}`].v.touched as string[])].sort()).toEqual(['operator', 'safety']);
    expect(entries(root, 'alice')[`spare|${SP}`].v.touched).toEqual(['place']);
    sa.equipments[EQ] = { ...sa.equipments[EQ], location: 'Nouvel atelier' };
    sa.equipments[EQ] = routine(sa.equipments[EQ], 'Alice');                       // a gesture does not take the typed fields off the list
    await a.save(sa);
    expect([...(entries(root, 'alice')[`equipment|${EQ}`].v.touched as string[])].sort()).toEqual(['location', 'operator', 'safety']);
    // the life is never "typed"
    const touched = entries(root, 'alice')[`equipment|${EQ}`].v.touched as string[];
    expect(touched.filter(f => ['inspections', 'anomalies', 'breakdowns', 'checkLife', 'stoppedSince', 'retiredAt', 'retiredNote', 'routineDraft', 'gone', 'touched'].includes(f))).toEqual([]);
    // reading gives the state without `touched`, and the list starts again: a gesture alone writes an empty list
    const s2 = (await a.load())!;
    expect('touched' in s2.equipments[EQ]).toBe(false);
    expect('touched' in s2.spares[SP]).toBe(false);
    await wait();
    s2.equipments[EQ] = reportAnomaly(s2.equipments[EQ], { label: 'Fuite', severity: 'degraded', by: 'Alice' }, '2026-10-06T15:00');
    s2.spares[SP] = takeOut(s2.spares[SP], 'Alice');
    await a.save(s2);
    expect(entries(root, 'alice')[`equipment|${EQ}`].v.touched).toEqual([]);
    expect(entries(root, 'alice')[`spare|${SP}`].v.touched).toEqual([]);
  });

  it('a new record has all its typed fields touched, a field removed counts, a record deleted is written as deleted', async () => {
    const { root, a } = await start();
    const sa = (await a.load())!;
    const e = newEquipment(); e.name = 'Neuf'; e.location = 'Quai';
    sa.equipments[e.id] = e;
    sa.equipments[EQ] = (({ pin: _, ...rest }) => rest as Equipment)({ ...sa.equipments[EQ], pin: { x: 1, y: 2 } } as Equipment);
    delete sa.spares[SP];
    await a.save(sa);
    const f = entries(root, 'alice');
    expect(f[`equipment|${e.id}`].v.touched).toEqual(expect.arrayContaining(['name', 'location', 'checkpoints']));
    expect(f[`spare|${SP}`].v).toBeNull();
  });

  // The scenario of the audit (V-01), with real sessions on one folder
  it('Alice changes the holder, the place and adds a note; Bob, on the old base, notes a routine and takes a part out: all of it is there', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!;                                                  // Bob's phone: the base of before
    const sa = (await a.load())!;
    sa.equipments[EQ] = { ...sa.equipments[EQ], operator: 'Nouvelle personne', location: 'Nouvel atelier', safety: [...(sa.equipments[EQ].safety || []), 'Nouvelle consigne'] };
    sa.spares[SP] = { ...sa.spares[SP], place: 'Nouveau tiroir' };
    await a.save(sa); await wait();
    sb.equipments[EQ] = routine(sb.equipments[EQ], 'Bob');
    sb.spares[SP] = takeOut(sb.spares[SP], 'Bob');
    await b.save(sb); await wait();
    const z = (await new FolderSession(asDir(root), 'Zed').load())!, e = z.equipments[EQ], p = z.spares[SP];
    expect([e.operator, e.location, e.safety]).toEqual(['Nouvelle personne', 'Nouvel atelier', [...(demoState().equipments[EQ].safety || []), 'Nouvelle consigne']]);
    expect(e.inspections.some(i => i.by === 'Bob')).toBe(true);
    expect(p.place).toBe('Nouveau tiroir');
    expect((p.moves || []).some(m => m.by === 'Bob')).toBe(true);
    expect(p.stock).toBe(demoState().spares[SP].stock - 1);
    expect('touched' in e || 'touched' in p).toBe(false);
  });
  it('a field typed by both: the latest wins; a field nobody typed comes from the newest version', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!, sa = (await a.load())!;
    sa.equipments[EQ] = { ...sa.equipments[EQ], location: 'Chez Alice', operator: 'Alice a tapé' };
    await a.save(sa); await wait();
    sb.equipments[EQ] = { ...routine(sb.equipments[EQ], 'Bob'), location: 'Chez Bob' };
    await b.save(sb); await wait();
    const e = (await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ];
    expect([e.location, e.operator]).toEqual(['Chez Bob', 'Alice a tapé']);
  });
  it('three computers, one of them late: each typed field comes from the latest that changed it', async () => {
    const { root, a, b } = await start();
    const c = new FolderSession(asDir(root), 'Carole');
    const sb = (await b.load())!, sc = (await c.load())!, sa = (await a.load())!;
    sa.equipments[EQ] = { ...sa.equipments[EQ], operator: 'Choix A' }; await a.save(sa); await wait();
    sb.equipments[EQ] = { ...sb.equipments[EQ], location: 'Choix B' }; await b.save(sb); await wait();
    sc.equipments[EQ] = reportAnomaly(sc.equipments[EQ], { label: 'Bruit', severity: 'degraded', by: 'Carole' }, '2026-10-06T10:00'); await c.save(sc);
    const e = (await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ];
    expect([e.operator, e.location, (e.anomalies || []).length]).toEqual(['Choix A', 'Choix B', (demoState().equipments[EQ].anomalies || []).length + 1]);
  });

  it('a version that is not a record (a list, a text) is not folded: the record keeps its content; a key with only such versions is not read', async () => {
    const { root } = await start();
    const day = new Date(Date.now() + 86_400_000).toISOString();
    const eve = { version: 2, author: 'Eve', updatedAt: day, entries: {
      [`spare|${SP}`]: { ts: day, v: [1, 2] }, [`equipment|${EQ}`]: { ts: day, v: 'texte' }, 'spare|only_junk': { ts: day, v: [3] }, 'equipment|only_text': { ts: day, v: 'x' },
    } };
    ((root.children.get('equipe') as MemDir).children).set('pilotage-eve.json', new MemFile('pilotage-eve.json', JSON.stringify(eve)));
    const z = (await new FolderSession(asDir(root), 'Zed').load())!;
    expect(z.spares[SP].name).toBe(demoState().spares[SP].name);
    expect(z.equipments[EQ].name).toBe(demoState().equipments[EQ].name);
    expect(Object.keys(z.spares)).not.toContain('only_junk');
    expect(Object.keys(z.equipments)).not.toContain('only_text');
  });
});

// What a computer says about the base of its gestures: `touchedAt` (when each typed field was last changed here) and `base` (what it had read of the others)
describe('stamps of typed fields and bases of the entries', () => {
  const wait = () => new Promise(r => setTimeout(r, 5));
  const EQ = 'eq_demo_cnc', SP = 'sp_demo_courroie';
  type Entry = { ts: string; base?: string; v: Record<string, unknown> | null };
  const routine = (e: Equipment, by: string) => recordInspection(e, { date: '2026-10-06', at: '2026-10-06T14:00', by, results: e.checkpoints.map(() => 'ok' as const), note: '' });
  const entries = (root: MemDir, who: string, bucket = 'equipe') => JSON.parse((((root.children.get(bucket) as MemDir).children.get(`pilotage-${who}.json`)) as MemFile).data).entries as Record<string, Entry>;
  const stampsOf = (root: MemDir, who: string, key: string) => entries(root, who)[key].v!.touchedAt as Record<string, string>;
  const start = async () => {
    const root = new MemDir('donnees');
    await initDataFolder(asDir(root));
    const a = new FolderSession(asDir(root), 'Alice'), b = new FolderSession(asDir(root), 'Bob');
    await a.load(); await a.save(demoState()); await wait();
    return { root, a, b };
  };
  const typed = (s: State, id: string, patch: Partial<Equipment>) => { s.equipments[id] = { ...s.equipments[id], ...patch }; };

  it('a typed field takes the stamp of the moment it differs from what this computer last wrote or read; the others keep theirs, from one reading to the next and from one session to the next', async () => {
    const { root, a } = await start();
    const key = `equipment|${EQ}`, first = { ...stampsOf(root, 'alice', key) };
    expect(Object.keys(first)).toEqual(expect.arrayContaining(['name', 'location', 'operator']));   // first publication: all the typed fields
    const s = (await a.load())!;
    typed(s, EQ, { location: 'Nouveau lieu' });
    await wait(); await a.save(s);
    const second = { ...stampsOf(root, 'alice', key) };
    expect(second.location > first.location).toBe(true);
    expect(second.operator).toBe(first.operator);                                          // not typed again: its stamp stays
    typed(s, EQ, { location: 'Encore un autre' });                                         // typed again later: a more recent stamp, even if the field was already "touched"
    await wait(); await a.save(s);
    const third = { ...stampsOf(root, 'alice', key) };
    expect(third.location > second.location).toBe(true);
    // a reading and a gesture change nothing about the stamps (the stamp of a gesture is not a typing)
    const s2 = (await a.load())!;
    expect('touchedAt' in s2.equipments[EQ] || 'touched' in s2.equipments[EQ]).toBe(false);   // not in the state that is read
    s2.equipments[EQ] = routine(s2.equipments[EQ], 'Alice');
    await wait(); await a.save(s2);
    expect(stampsOf(root, 'alice', key)).toEqual(third);
    // a new session of the same person (the page was closed): the stamps are read back from its own file
    const again = new FolderSession(asDir(root), 'Alice');
    const s3 = (await again.load())!;
    typed(s3, EQ, { operator: 'Quelqu\'un d\'autre' });
    await wait(); await again.save(s3);
    const fourth = stampsOf(root, 'alice', key);
    expect(fourth.operator > third.operator).toBe(true);
    expect(fourth.location).toBe(third.location);
  });
  it('a part carries its stamps too', async () => {
    const { root, a } = await start();
    const s = (await a.load())!, before = { ...stampsOf(root, 'alice', `spare|${SP}`) };
    s.spares[SP] = { ...s.spares[SP], place: 'Tiroir 9' };
    await wait(); await a.save(s);
    const after = stampsOf(root, 'alice', `spare|${SP}`);
    expect(after.place > before.place).toBe(true);
    expect(after.name).toBe(before.name);
  });

  // The regression of the first correction (N-01): the list `touched` of an old file kept the first person's value for ever
  it('Alice types, Bob types the same field later, then notes a routine: Bob\'s value stays, for Carole and for Bob himself', async () => {
    const { root, a, b } = await start();
    const c = new FolderSession(asDir(root), 'Carole');
    const sa = (await a.load())!;
    typed(sa, EQ, { location: 'LIEU ALICE' });
    await wait(); await a.save(sa); await wait();
    const sb = (await b.load())!;
    typed(sb, EQ, { location: 'LIEU BOB' });
    await wait(); await b.save(sb); await wait();
    const sb2 = (await b.load())!;                                                         // Bob reads again: his list of typed fields starts again
    sb2.equipments[EQ] = routine(sb2.equipments[EQ], 'Bob');
    await wait(); await b.save(sb2); await wait();
    expect((await c.load())!.equipments[EQ].location).toBe('LIEU BOB');
    expect((await b.load())!.equipments[EQ].location).toBe('LIEU BOB');
    // Alice, who has not read since, notes a routine: her file still says she typed the place, before Bob
    sa.equipments[EQ] = routine(sa.equipments[EQ], 'Alice');
    await wait(); await a.save(sa);
    const z = (await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ];
    expect(z.location).toBe('LIEU BOB');
    expect(z.inspections.filter(i => i.date === '2026-10-06').map(i => i.by).sort()).toEqual(['Alice', 'Bob']);
  });
  it('the same for a part: a place typed twice by two people, then a gesture of the first from her old base', async () => {
    const { root, a, b } = await start();
    const sa = (await a.load())!;
    sa.spares[SP] = { ...sa.spares[SP], place: 'TIROIR ALICE' };
    await wait(); await a.save(sa); await wait();
    const sb = (await b.load())!;
    sb.spares[SP] = { ...sb.spares[SP], place: 'TIROIR BOB' };
    await wait(); await b.save(sb); await wait();
    sa.spares[SP] = takeOut(sa.spares[SP], 'Alice');
    await wait(); await a.save(sa);
    const p = (await new FolderSession(asDir(root), 'Zed').load())!.spares[SP];
    expect(p.place).toBe('TIROIR BOB');
    expect((p.moves || []).some(m => m.by === 'Alice')).toBe(true);
  });

  // A deletion against a gesture made from a base older than it (M3-24)
  it('every entry carries the newest stamp this computer had read in the files of the others', async () => {
    const { root, a, b } = await start();
    const first = Object.values(entries(root, 'alice'));
    expect(first.every(e => e.base === '')).toBe(true);                                    // alone in the folder: nothing read from anyone
    const sb = (await b.load())!, newest = Object.values(entries(root, 'alice')).map(e => e.ts).sort().pop();
    typed(sb, EQ, { location: 'Quai 2' });
    await wait(); await b.save(sb);
    expect(entries(root, 'bob')[`equipment|${EQ}`].base).toBe(newest);
    expect(Object.values(entries(root, 'bob')).every(e => typeof e.base === 'string')).toBe(true);
    // what Bob wrote himself does not count as read from the others
    const own = Object.values(entries(root, 'bob')).map(e => e.ts).sort().pop()!;
    await wait(); await b.load();
    typed(sb, EQ, { location: 'Quai 3' });
    await wait(); await b.save(sb);
    expect(entries(root, 'bob')[`equipment|${EQ}`].base).toBe(newest);
    expect(own > newest!).toBe(true);
    void a;
  });
  it('an equipment deleted by one is not brought back by a gesture of another who had not read the deletion', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!;                                                          // Bob's phone: the base of before
    const sa = (await a.load())!;
    delete sa.equipments[EQ];
    await wait(); await a.save(sa); await wait();
    expect((await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ]).toBeUndefined();
    sb.equipments[EQ] = routine(sb.equipments[EQ], 'Bob');                                 // the gesture of the stale phone
    await wait(); await b.save(sb);
    expect((await new FolderSession(asDir(root), 'Yan').load())!.equipments[EQ]).toBeUndefined();
    typed(sb, EQ, { location: 'Quai 4' });                                                 // a typed change as well
    await wait(); await b.save(sb);
    expect((await new FolderSession(asDir(root), 'Xia').load())!.equipments[EQ]).toBeUndefined();
    // Bob reads the folder: he sees the deletion, as everyone
    expect((await b.load())!.equipments[EQ]).toBeUndefined();
  });
  it('the same for a part of the cabinet', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!, sa = (await a.load())!;
    delete sa.spares[SP];
    await wait(); await a.save(sa); await wait();
    sb.spares[SP] = takeOut(sb.spares[SP], 'Bob');
    await wait(); await b.save(sb);
    expect((await new FolderSession(asDir(root), 'Zed').load())!.spares[SP]).toBeUndefined();
  });
  it('a computer that read the deletion and writes the record again (the person undid it) brings it back, with what the others did before', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!;
    sb.equipments[EQ] = routine(sb.equipments[EQ], 'Bob');                                 // Bob's routine, before the deletion
    await wait(); await b.save(sb); await wait();
    const sa = (await a.load())!, was = sa.equipments[EQ];
    delete sa.equipments[EQ];
    await wait(); await a.save(sa); await wait();
    sa.equipments[EQ] = was;                                                               // "Remettre la fiche": the same person puts it back
    await wait(); await a.save(sa);
    const z = (await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ];
    expect(z).toBeDefined();
    expect(z.inspections.some(i => i.by === 'Bob')).toBe(true);
    // and a computer that read the deletion, then the record put back by another: the record is there
    const sb2 = (await b.load())!;
    expect(sb2.equipments[EQ]).toBeDefined();
  });
  it('a version without base (written by an earlier version of the application) keeps the old rule: written after the deletion, it lives', async () => {
    const { root, a, b } = await start();
    const sb = (await b.load())!, sa = (await a.load())!;
    delete sa.equipments[EQ];
    await wait(); await a.save(sa); await wait();
    sb.equipments[EQ] = routine(sb.equipments[EQ], 'Bob');
    await wait(); await b.save(sb);
    const file = (root.children.get('equipe') as MemDir).children.get('pilotage-bob.json') as MemFile;
    const j = JSON.parse(file.data);
    Object.values(j.entries as Record<string, { base?: string }>).forEach(e => { delete e.base; });
    file.data = JSON.stringify(j);
    expect((await new FolderSession(asDir(root), 'Zed').load())!.equipments[EQ]).toBeDefined();
  });
});
