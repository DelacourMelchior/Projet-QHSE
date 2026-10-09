// Tool 3.4 and the shared storage: the orders are folded, never replaced (G-3, S-4, S-5), what was done here since the last synchronisation is put back (S-3),
// the counter of the PV numbers survives (G-13, S-6), the pictures held as text have a key of their own (S-19).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Delivery, State, Strokes } from '../domain/types';
import { checkMilestone, isLocked, newDelivery, releaseDelivery, sealState, setReceptionist, setResult, signClient, startReception } from '../domain/receptions';
import { receptionInsights } from '../domain/receptionsAll';
import { demoState } from '../domain/templates';
import { applyFile, flatten, fingerprint, hash, logChanges, mergeFile, overlaySince, syncMark, unflatten } from './flat';
import { FolderSession, initDataFolder } from './folder';
import { LOCAL_KEY } from './local';

const ink = (n = 0): Strokes => [[[10 + n, 10], [60, 40], [120, 20], [160, 60], [220 + n, 30]]];
const at = (hm: string, day = '2026-10-06') => `${day}T${hm}`;
// the example, with an order of ours to check from the start (4 milestones without bounds, the same ids on every copy)
const OWN = newDelivery(), ORDER = 'dl_t1';
const base = () => { const s = demoState(new Date(2026, 9, 6, 10, 0)); s.deliveries[ORDER] = { ...OWN, id: ORDER, ref: 'CMD-T1', client: 'Client T', item: 'Lot', qty: 5 }; return s; };
const plain = (x: string) => x.replace(/[  ]/g, ' ');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const checks = (d: Delivery) => d.milestones.filter(m => m.ok === true).length;

// an order taken as far as a signed PV (on the device that "went to the customer")
function signedOrder(s: State, id: string, n = 0, who = 'M. Durand'): Delivery {
  let d = s.deliveries[id];
  d = d.milestones.reduce((x, m, i) => checkMilestone(x, m.id!, { ok: true, by: 'Karim', at: at(`09:0${i}`) }), d);
  d = releaseDelivery(d, { by: 'Marc', at: at('10:00') });
  d = setResult(startReception(d, { at: at('14:00'), place: 'Chantier' }), 'sans', at('14:30'), 'Alice');
  return signClient(setReceptionist(d, { name: who }), ink(n), at('14:40'), 'Alice', { ...s, deliveries: { ...s.deliveries, [id]: d } });
}

describe('S-5: the file of a phone brings the checks and the PV of an order the computer already holds', () => {
  it('merges the order instead of leaving it (the audit gave: added 1, merged 0, kept 1)', () => {
    const office = base(), phone = structuredClone(office);
    phone.deliveries[ORDER] = signedOrder(phone, ORDER);
    office.deliveries[ORDER] = { ...office.deliveries[ORDER], item: `${office.deliveries[ORDER].item} (corrigé)` };   // the office typed something meanwhile
    const r = mergeFile(flatten(office), flatten(phone));
    expect([r.added, r.merged, r.kept]).toEqual([0, 1, 0]);
    const out = unflatten({ ...flatten(office), ...r.put }).deliveries[ORDER];
    expect(isLocked(out)).toBe(true);
    expect(out.signClient).toEqual(ink());
    expect(out.reception.pvNo).toBe('PV-2026-011');                                                      // the number the phone gave
    expect(sealState(out)).toBe('intact');
    expect(out.item).toBe(phone.deliveries[ORDER].item);                                              // a signed PV holds the order as it was signed
    // a second application finds nothing new
    const again = applyFile(structuredClone(unflatten({ ...flatten(office), ...r.put })), flatten(phone));
    expect([again.added, again.merged]).toEqual([0, 0]);
  });
  it('an order only the file holds is added, an order both hold unchanged is left alone', () => {
    const office = base(), phone = structuredClone(office);
    phone.deliveries.dl_new = { ...phone.deliveries[ORDER], id: 'dl_new', ref: 'CMD-NEW' };
    const r = mergeFile(flatten(office), flatten(phone));
    expect([r.added, r.merged, r.kept]).toEqual([1, 0, 0]);
    expect(Object.keys(r.put)).toEqual(['delivery|dl_new']);
  });
  it('S-6: two PV given the same number on two devices are said as a fact once the file is taken', () => {
    const office = base(), phone = structuredClone(office);
    phone.deliveries.dl_t2 = { ...phone.deliveries[ORDER], id: 'dl_t2', ref: 'CMD-T2' };
    office.deliveries.dl_t2 = structuredClone(phone.deliveries.dl_t2);
    const a = signedOrder(office, ORDER), b = signedOrder(phone, 'dl_t2', 3);
    office.deliveries[ORDER] = { ...a, reception: { ...a.reception, pvNo: 'PV-2026-011' } };
    phone.deliveries.dl_t2 = { ...b, reception: { ...b.reception, pvNo: 'PV-2026-011' } };
    const r = mergeFile(flatten(office), flatten(phone));
    expect(r.dupes).toEqual(['PV-2026-011']);
    const mine = structuredClone(office), applied = applyFile(mine, flatten(phone));
    expect(applied.dupes).toEqual(['PV-2026-011']);
    expect(receptionInsights(mine, new Date(2026, 9, 7)).find(i => i.key === 'pv-duplicate')?.tone).toBe('bad');
    expect(mergeFile(flatten(office), flatten(office)).dupes).toEqual([]);                               // a number already carried twice before the file is not the file's
  });
  it('the counter of the PV numbers of the file is kept when it is the higher one', () => {
    const office = base(), phone = structuredClone(office);
    phone.params = { ...phone.params, reception: { ...phone.params.reception, pvCounter: { '2026': 25 } } };
    const mine = structuredClone(office);
    applyFile(mine, flatten(phone));
    expect(mine.params.reception?.pvCounter).toEqual({ '2026': 25 });
    expect(mine.params.reception?.retention).toEqual(office.params.reception?.retention);                  // the rest of the settings stays
  });
  it('the journal of the store keeps the counter after each update', () => {
    const prev = base(), next = structuredClone(prev);
    next.deliveries[ORDER] = { ...next.deliveries[ORDER], reception: { ...next.deliveries[ORDER].reception, pvNo: 'PV-2026-031' } };
    logChanges(prev, next, 'Alice');
    expect(next.params.reception?.pvCounter).toEqual({ '2026': 31 });
  });
});

// ---- the shared folder (a minimal in-memory implementation of the handles)
class MemFile {
  kind = 'file' as const;
  constructor(public name: string, public data = '') {}
  async getFile() { return { text: async () => this.data, arrayBuffer: async () => new TextEncoder().encode(this.data).buffer }; }
  async createWritable() { let buf = ''; return { write: async (s: string | Uint8Array) => { if (typeof s === 'string') buf += s; }, close: async () => { this.data = buf; } }; }
}
class MemDir {
  kind = 'directory' as const;
  children = new Map<string, MemDir | MemFile>();
  constructor(public name: string) {}
  async getDirectoryHandle(n: string, o?: { create?: boolean }) { let c = this.children.get(n); if (!c && o?.create) { c = new MemDir(n); this.children.set(n, c); } if (!(c instanceof MemDir)) throw new DOMException('not found', 'NotFoundError'); return c; }
  async getFileHandle(n: string, o?: { create?: boolean }) { let c = this.children.get(n); if (!c && o?.create) { c = new MemFile(n); this.children.set(n, c); } if (!(c instanceof MemFile)) throw new DOMException('not found', 'NotFoundError'); return c; }
  async *entries() { yield* this.children.entries(); }
}
const dirOf = async () => { const root = new MemDir('donnees'); await initDataFolder(root as unknown as FileSystemDirectoryHandle); return root as unknown as FileSystemDirectoryHandle; };

// each computer has its own browser: its own storage (the marks are kept there)
let store: Map<string, string>;
const browsers = new Map<string, Map<string, string>>();
const on = (who: string) => { store = browsers.get(who) ?? browsers.set(who, new Map()).get(who)!; };
beforeEach(() => {
  browsers.clear(); on('Bureau');
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, get length() { return store.size; }, key: (i: number) => [...store.keys()][i] ?? null });
});
afterEach(() => { vi.unstubAllGlobals(); });

// a computer joins the folder: its session reads it first (the application always does)
const join = async (root: FileSystemDirectoryHandle, who: string, local?: State | null) => { on(who); const f = new FolderSession(root, who); const state = await f.load(local); return { f, state }; };

describe('S-4: two computers write the same order in the shared folder', () => {
  it('the checks of the workshop and the typed content of the office both stay (the audit gave 2 checks of 3)', async () => {
    const root = await dirOf(), office = await join(root, 'Bureau'), seed = base();
    await office.f.save(seed);
    const o = await join(root, 'Bureau'), t = await join(root, 'Atelier'), so = o.state!, st = t.state!;
    st.deliveries[ORDER] = ['m1', 'm2', 'm3'].reduce((d, _, i) => checkMilestone(d, d.milestones[i].id!, { ok: true, by: 'Karim', at: at(`09:0${i}`) }), st.deliveries[ORDER]);
    await sleep(5); on('Atelier'); await t.f.save(st);
    so.deliveries[ORDER] = { ...so.deliveries[ORDER], item: 'Livrable corrigé au bureau', promisedAt: '2026-10-20' };
    await sleep(5); on('Bureau'); await o.f.save(so);
    const merged = (await join(root, 'Lecteur')).state!.deliveries[ORDER];
    expect(checks(merged)).toBe(3);
    expect(merged.journal!.length).toBe(st.deliveries[ORDER].journal!.length);
    expect([merged.item, merged.promisedAt]).toEqual(['Livrable corrigé au bureau', '2026-10-20']);
  });
  it('a signature given on the tablet is not erased by the office copy saved later (the audit gave: no signature, no result)', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    const o = await join(root, 'Bureau'), t = await join(root, 'Atelier'), so = o.state!, st = t.state!;
    st.deliveries[ORDER] = signedOrder(st, ORDER);
    on('Atelier'); await t.f.save(st); await sleep(5);
    so.deliveries[ORDER] = { ...so.deliveries[ORDER], qty: 12 };                                           // a typed quantity, on a copy that did not see the signature
    on('Bureau'); await o.f.save(so);
    const m = (await join(root, 'Lecteur')).state!.deliveries[ORDER];
    expect(isLocked(m)).toBe(true);
    expect([m.signClient, m.reception.result]).toEqual([ink(), 'sans']);
    expect(m.qty).toBe(st.deliveries[ORDER].qty);                                                          // the order as it was signed
    expect(sealState(m)).toBe('intact');
    expect(m.journal!.some(l => plain(l.text).startsWith('conflit : version signée'))).toBe(true);
  });
  it('an order deleted by one computer is not brought back by an older copy of another', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    const a = await join(root, 'Bureau'), b = await join(root, 'Atelier');
    delete b.state!.deliveries.dl_demo_6;
    await sleep(5); on('Atelier'); await b.f.save(b.state!);
    await sleep(5); a.state!.deliveries.dl_demo_7 = { ...a.state!.deliveries.dl_demo_7, item: 'Autre libellé' };   // the other computer writes something else, still holding the order
    on('Bureau'); await a.f.save(a.state!);
    const out = (await join(root, 'Lecteur')).state!;
    expect(out.deliveries.dl_demo_6).toBeUndefined();
    expect(out.deliveries.dl_demo_7.item).toBe('Autre libellé');
  });
  it('the counter of the PV numbers is the highest any author wrote, even when the settings of another are the newest', async () => {
    const root = await dirOf(), s = base();
    s.params = { ...s.params, reception: { ...s.params.reception, pvCounter: { '2026': 9 } } };
    await (await join(root, 'Bureau')).f.save(s);
    const b = await join(root, 'Atelier');
    b.state!.params = { ...b.state!.params, reception: { ...b.state!.params.reception, pvCounter: { '2026': 4 } } };   // an older backup put back, then written
    await sleep(5); on('Atelier'); await b.f.save(b.state!);
    expect((await join(root, 'Lecteur')).state!.params.reception?.pvCounter).toEqual({ '2026': 9 });
  });
});

describe('S-3: what was done here before the folder was read again is put back', () => {
  const work = (s: State) => { const x = structuredClone(s); x.deliveries[ORDER] = checkMilestone(x.deliveries[ORDER], x.deliveries[ORDER].milestones[0].id!, { ok: true, by: 'Karim', at: at('09:00') }); return x; };
  it('the check made while the browser asked for access is still there after "Reconnecter", and is published', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());                                                     // in step with the folder
    const local = work(base());                                                                            // the day goes on, offline: the folder is not asked
    const reopened = await join(root, 'Bureau', local);                                                    // the page was closed and opened again: a new session, the mark is in the browser
    expect(checks(reopened.state!.deliveries[ORDER])).toBe(1);
    expect(reopened.state!.deliveries[ORDER].journal!.length).toBe(local.deliveries[ORDER].journal!.length);
    await reopened.f.save(reopened.state!);                                                                // what the application does next
    expect(checks((await join(root, 'Lecteur')).state!.deliveries[ORDER])).toBe(1);
  });
  it('without the state given, the one of the browser is read', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    store.set(LOCAL_KEY, JSON.stringify(work(base())));
    expect(checks((await join(root, 'Bureau')).state!.deliveries[ORDER])).toBe(1);
  });
  it('what the others did meanwhile stays; a record deleted by the others goes, a record deleted here stays deleted, a record created here is added', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    const t = await join(root, 'Atelier');
    t.state!.deliveries.dl_demo_5 = { ...t.state!.deliveries.dl_demo_5, item: 'Libellé de l\'atelier' };      // the others: a typed change on another order
    delete t.state!.deliveries.dl_demo_6;                                                                  // and a deletion
    await sleep(5); on('Atelier'); await t.f.save(t.state!);
    const local = work(base());                                                                            // here, offline: a check on our order, dl_demo_7 deleted, one order created
    delete local.deliveries.dl_demo_7;
    local.deliveries.dl_new = { ...local.deliveries.dl_demo_8, id: 'dl_new', ref: 'CMD-NEW' };
    const out = (await join(root, 'Bureau', local)).state!;
    expect(checks(out.deliveries[ORDER])).toBe(1);                                                         // mine
    expect(out.deliveries.dl_demo_5.item).toBe('Libellé de l\'atelier');                                    // theirs
    expect(out.deliveries.dl_demo_6).toBeUndefined();                                                      // deleted by them, untouched here
    expect(out.deliveries.dl_demo_7).toBeUndefined();                                                      // deleted here
    expect(out.deliveries.dl_new.ref).toBe('CMD-NEW');
  });
  it('without a mark (first reading, another browser) the folder is read as it always was', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    browsers.get('Bureau')!.clear();                                                                       // the browser forgot
    expect(checks((await join(root, 'Bureau', work(base()))).state!.deliveries[ORDER])).toBe(0);
  });
  it('a mark of another folder is not used', async () => {
    const root = await dirOf(), other = new MemDir('autre') as unknown as FileSystemDirectoryHandle;
    await initDataFolder(other);
    await (await join(root, 'Bureau')).f.save(base());
    expect(JSON.parse(store.get('DELACOUR_PILOTAGE_PREF_sync')!).dir).toBe('donnees');
    await (await join(other, 'Bureau')).f.save(base());
    expect(checks((await join(other, 'Bureau', work(base()))).state!.deliveries[ORDER])).toBe(1);        // the mark is the one of this folder
    expect(JSON.parse(store.get('DELACOUR_PILOTAGE_PREF_sync')!).dir).toBe('autre');
    expect(checks((await join(root, 'Bureau', work(base()))).state!.deliveries[ORDER])).toBe(0);          // read again, the mark of "autre" is not the one of "donnees"
  });
  it('a mark of the browser holds a fingerprint per key, not the data', async () => {
    const root = await dirOf();
    await (await join(root, 'Bureau')).f.save(base());
    const kept = JSON.parse(store.get('DELACOUR_PILOTAGE_PREF_sync')!), flat = flatten(base());
    expect(Object.keys(kept.marks).sort()).toEqual(Object.keys(syncMark(flat)).sort());
    expect(kept.marks[`delivery|${ORDER}`]).toBe(fingerprint(flat[`delivery|${ORDER}`]));
    expect(store.get('DELACOUR_PILOTAGE_PREF_sync')!.length).toBeLessThan(JSON.stringify(flat).length / 5);
  });
  it('overlaySince: a key unchanged here takes the folder\'s version, a key changed here is merged or kept', () => {
    const was = base(), mark = syncMark(flatten(was)), folder = structuredClone(was), here = structuredClone(was);
    folder.deliveries.dl_demo_5 = { ...folder.deliveries.dl_demo_5, item: 'Version du dossier' };
    here.deliveries[ORDER] = { ...here.deliveries[ORDER], item: 'Version ici' };
    folder.deliveries[ORDER] = checkMilestone(folder.deliveries[ORDER], folder.deliveries[ORDER].milestones[0].id!, { ok: true, by: 'Karim', at: at('08:00') });
    const out = overlaySince(folder, mark, here);
    expect(out.deliveries.dl_demo_5.item).toBe('Version du dossier');
    expect(out.deliveries[ORDER].item).toBe('Version ici');
    expect(checks(out.deliveries[ORDER])).toBe(1);                                                         // and the check of the folder is merged in
  });
});

describe('S-19: a picture held as text has a key of its own', () => {
  const img = (s: string) => `data:image/png;base64,${s}`;
  it('two pictures of the same length that share every 7th sign are two keys, and come back as they were', () => {
    const one = 'A'.repeat(40) + 'B'.repeat(60), two = 'A'.repeat(41) + 'C' + 'B'.repeat(58);               // same length, same signs at 0, 7, 14…
    const s = base();
    s.deliveries.dl_demo_4 = { ...s.deliveries.dl_demo_4, reception: { ...s.deliveries.dl_demo_4.reception, photos: [img(one), img(two)] } };
    const flat = flatten(s), keys = Object.keys(flat).filter(k => k.startsWith('photo|') && flat[k] === img(one) || flat[k] === img(two));
    expect(keys).toHaveLength(2);
    expect(keys.every(k => k.length - 'photo|'.length === 15)).toBe(true);                                // under 16 signs: not taken for the original of a photo reference
    expect(hash(img(one))).toBe(keys.find(k => flat[k] === img(one))!.slice(6));
    expect(unflatten(JSON.parse(JSON.stringify(flat))).deliveries.dl_demo_4.reception.photos).toEqual([img(one), img(two)]);
  });
  it('a key of the older hash is still read', () => {
    const flat = flatten(base());
    flat['photo|1a2b3c4d5e6f7'] = img('OLD');
    flat['delivery|dl_demo_4'] = { ...(flat['delivery|dl_demo_4'] as object), reception: { ...(flat['delivery|dl_demo_4'] as { reception: object }).reception, photos: ['photo:1a2b3c4d5e6f7'] } };
    expect(unflatten(flat).deliveries.dl_demo_4.reception.photos).toEqual([img('OLD')]);
  });
});
