// Réglages > Données: the copies of unreadable data are listed with their day and counted in the gauge (audit V-05), the gauge never reads past 100 % (V-14).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../domain/templates';
import { SettingsData } from './SettingsData';

let chars = 0;
vi.mock('../store/StoreContext', () => ({
  useStore: () => ({
    state: demoState(), update: vi.fn(), replace: vi.fn(), author: '', setAuthor: vi.fn(), connectFolder: vi.fn(), reconnectFolder: vi.fn(), disconnectFolder: vi.fn(), refresh: vi.fn(),
    folder: { status: 'local', name: '', contributors: [], hasDirection: true, lastSync: null, error: '' }, storageChars: chars, unreadable: null, dropCopy: vi.fn(),
  }),
}));
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, get length() { return store.size; }, key: (i: number) => [...store.keys()][i] ?? null });
});
afterEach(() => vi.unstubAllGlobals());
const html = () => renderToStaticMarkup(<SettingsData onClose={() => {}} />).replace(/&#x27;/g, "'");

describe('Réglages > Données: the copies of unreadable data', () => {
  it('lists each copy with its day, a way to download it and a way to delete it', () => {
    store.set('DELACOUR_PILOTAGE_V2.corrupt-2026-10-06-1840', 'x'.repeat(2500)); store.set('DELACOUR_PILOTAGE_V2.corrupt-2026-09-30-0815', 'y');
    chars = 1000;
    const h = html();
    expect(h).toContain('Copie de données illisibles du 06/10');
    expect(h).toContain('Copie de données illisibles du 30/09');
    expect((h.match(/>Télécharger</g) || []).length).toBe(2);
    expect((h.match(/>Supprimer</g) || []).length).toBe(2);
  });
  it('says nothing when there is none', () => {
    chars = 1000;
    expect(html()).not.toContain('Copie de données illisibles');
  });
  it('the gauge reads 100 % and no more when the browser holds more than it says', () => {
    chars = 5_239_000;
    const h = html();
    expect(h).toContain('(100 %)');
    expect(h).not.toContain('105');
  });
});

// S-18: the data a restoration replaces are kept in this browser, apart, and taken back from the list "Espace sur cet ordinateur"
import { beforeCopies, dropBefore, keepBeforeRestore, mergeSummary } from './SettingsData';
const KEY = 'DELACOUR_PILOTAGE_V2.before-restore-';
describe('Réglages > Données: the data before a restoration (S-18)', () => {
  it('keeps the data under their own key, written and read back, and lists them newest first with their day', () => {
    const s = demoState(), when = new Date(2026, 9, 7, 15, 40, 12);
    expect(keepBeforeRestore(s, 0, when)).toBe(true);
    expect(keepBeforeRestore(s, 0, new Date(2026, 9, 8, 9, 5, 0))).toBe(true);
    expect([...store.keys()]).toEqual([`${KEY}2026-10-07-154012`, `${KEY}2026-10-08-090500`]);
    expect(JSON.parse(store.get(`${KEY}2026-10-07-154012`)!)).toEqual(JSON.parse(JSON.stringify(s)));   // the whole state, as it was
    expect(beforeCopies().map(c => c.on)).toEqual(['08/10 à 9 h 05', '07/10 à 15 h 40']);
    expect(beforeCopies()[1].chars).toBe(JSON.stringify(s).length);
    expect(store.has('DELACOUR_PILOTAGE_V2')).toBe(false);   // never written over the data themselves
  });

  it('keeps nothing, and says so, when the copy would take the browser past 80 % of its room or when the browser refuses', () => {
    const s = demoState(), size = JSON.stringify(s).length;
    expect(keepBeforeRestore(s, 4_000_000 - size + 1)).toBe(false);
    expect(store.size).toBe(0);
    expect(keepBeforeRestore(s, 4_000_000 - size)).toBe(true);
    store.clear();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); }, removeItem: () => undefined, length: 0, key: () => null });
    expect(keepBeforeRestore(s, 0)).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, length: 0, key: () => null });   // a browser that drops the copy silently: it does not read back
    expect(keepBeforeRestore(s, 0)).toBe(false);
  });

  it('shows each copy in "Espace sur cet ordinateur" with Télécharger, Reprendre and Supprimer, and counts it in the gauge', () => {
    chars = 1000;
    store.set(`${KEY}2026-10-07-154012`, 'x'.repeat(2_500_000));
    const h = html();
    expect(h).toMatch(/Données d'avant la restauration du 07\/10 à 15 h 40 \(2\s500\s000 caractères, comptés ci-dessus\)/);
    expect(h).toContain('>Reprendre<');
    expect(h).toMatch(/Données de l'application : 2\s501\s000 caractères/);   // the copy is counted with the data: the browser holds both
    expect(h).toContain('(50 %)');
  });

  it('removes a copy, and only a copy of this kind', () => {
    store.set(`${KEY}2026-10-07-154012`, '{}'); store.set('DELACOUR_PILOTAGE_V2', '{}');
    dropBefore('DELACOUR_PILOTAGE_V2');
    expect(store.has('DELACOUR_PILOTAGE_V2')).toBe(true);
    dropBefore(`${KEY}2026-10-07-154012`);
    expect(beforeCopies()).toEqual([]);
  });
});

describe('Réglages > Données: the message of a merge (S-5)', () => {
  const put = { 'delivery|a': 1, 'delivery|b': 1, 'sop|s1': 1, 'equipment|e1': 1 };
  it('says the orders merged and added, the other records added, the equipment completed, the records not taken', () => {
    const mine = { 'delivery|b': 0, 'equipment|e1': 0 }, theirs = { 'delivery|a': 1, 'delivery|b': 1, 'sop|s1': 1, 'equipment|e1': 1, 'delivery|c': 9 };
    const r = mergeSummary(mine, theirs, { put, added: 2, merged: 2, kept: 1 });
    expect(r.text).toBe('1 commande fusionnée, 1 ajoutée ; 1 autre fiche ajoutée ; 1 équipement ou pièce complété');
    expect(r.left).toBe('1 fiche non reprise car déjà présente et différente');
    expect(r.count).toBe(4);
  });
  it('speaks in the plural, and says "0 commande fusionnée" in the singular of French when only new orders come', () => {
    const r = mergeSummary({}, { 'delivery|a': 1, 'delivery|b': 1, 'delivery|c': 1 }, { put: { 'delivery|a': 1, 'delivery|b': 1, 'delivery|c': 1 }, added: 3, merged: 0, kept: 2 });
    expect(r.text).toBe('0 commande fusionnée, 3 ajoutées');
    expect(r.left).toBe('2 fiches non reprises car déjà présentes et différentes');
    expect(mergeSummary({}, {}, { put: {}, added: 0, merged: 0, kept: 0 })).toEqual({ text: '', left: '', count: 0 });
  });
  it('merged orders only: "2 commandes fusionnées, 0 ajoutée"', () => {
    const k = { 'delivery|a': 0, 'delivery|b': 0 };
    expect(mergeSummary(k, { 'delivery|a': 1, 'delivery|b': 1 }, { put: { 'delivery|a': 1, 'delivery|b': 1 }, added: 0, merged: 2, kept: 0 }).text).toBe('2 commandes fusionnées, 0 ajoutée');
  });
  it('the page has no "(s)" and speaks of the orders', () => {
    chars = 1000;
    const h = html();
    expect(h).not.toMatch(/\(s\)/);
    expect(h).toContain('Pour une commande présente des deux côtés');
  });
});
