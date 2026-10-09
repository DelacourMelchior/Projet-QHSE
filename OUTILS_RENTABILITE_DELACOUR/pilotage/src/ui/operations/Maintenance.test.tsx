// The tiles of tool 3.3 are red only for what cannot wait (the card, the queue and the badge say the same): "Contrôles échus" when an overdue check is mandatory,
// "Anomalies ouvertes" for a danger or a stop, "Pièces" for a critical part out; amber otherwise. The screen answers its question in facts, says why a figure counts
// fewer routines, leaves out of its messages what the queue says, and has one title (h1) and a list of filters on a phone.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Anomaly, Equipment, Spare, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { maintAnswer, maintInsights, maintSummary } from '../../domain/maintenanceAll';
import { newEquipment } from '../../domain/maintenance';
import { newSpare } from '../../domain/maintenanceSpares';
import { Maintenance } from './Maintenance';

const held = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: held.state, update: vi.fn(), author: 'Test' }) }));
const now = new Date(), noop = () => {};
const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };

const draw = (s: State) => { held.state = s; return renderToStaticMarkup(<Maintenance nav={nav} focus="" clearFocus={noop} />); };
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
// the classes of the tile, and its text, in the screen as the person sees it
function tile(s: State, title = 'Contrôles échus') {
  const html = draw(s);
  const m = html.match(new RegExp(`<(?:button|div)[^>]*class="([^"]*)"[^>]*><div[^>]*>${title}</div><div[^>]*>(.*?)</div><div[^>]*>(.*?)</div>`));   // class, value, then the line under it
  return { cls: m?.[1] ?? '', value: m?.[2] ?? '', text: m?.[3] ?? '' };
}
const withLegal = (s: State, legal: boolean): State => ({ ...s, equipments: Object.fromEntries(Object.entries(s.equipments).map(([id, e]) => [id, { ...e, tasks: (e.tasks ?? []).map(c => ({ ...c, legal })) }])) });
const without = (s: State): State => ({ ...s, equipments: Object.fromEntries(Object.entries(s.equipments).map(([id, e]) => [id, { ...e, tasks: [] }])) });

describe('3.3 the tile of the overdue checks', () => {
  const s = demoState(now);
  it('is red when an overdue check is mandatory, and says how many', () => {
    const sm = maintSummary(s, now);
    expect(sm.checksLate).toBeGreaterThan(0);
    expect(sm.checksLateLegal).toBeGreaterThan(0);
    const t = tile(s);
    expect(t.cls).toContain('border-red-300');
    expect(t.text).toMatch(/dont \d+ obligatoires?/);
  });
  it('is amber when none of the overdue checks is mandatory', () => {
    const open = withLegal(s, false);
    const sm = maintSummary(open, now);
    expect(sm.checksLate).toBeGreaterThan(0);   // there are overdue checks...
    expect(sm.checksLateLegal).toBe(0);         // ...and none is mandatory
    const t = tile(open);
    expect(t.cls).toContain('border-amber-300');
    expect(t.cls).not.toContain('border-red-300');
    expect(t.text).not.toContain('obligatoire');
  });
  it('is not coloured by a check that is not overdue: no check, no alarm', () => {
    const t = tile(without(s));
    expect(t.cls).not.toContain('border-red-300');
    expect(t.cls).not.toContain('border-amber-300');
  });
});

// a state with one healthy equipment and the cabinet we give it: the tiles say only what is in it
const an = (over: Partial<Anomaly>): Anomaly => ({ id: 'a1', label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const eq = (over: Partial<Equipment> = {}): Equipment => ({ ...newEquipment(), id: 'e1', name: 'Presse', operator: 'Alice', manager: 'Marc', inspections: [{ date: new Date().toISOString().slice(0, 10), by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }], ...over });
const sp = (over: Partial<Spare> = {}): Spare => ({ ...newSpare(['e1']), id: 'sp1', name: 'Courroie', ref: 'C1', min: 2, stock: 2, countedAt: new Date().toISOString().slice(0, 16), countedBy: 'Marc', ...over });
const small = (e: Equipment, spares: Spare[] = []): State => ({ ...demoState(new Date()), equipments: { [e.id]: e }, spares: Object.fromEntries(spares.map(x => [x.id, x])), risks: {} });

describe('3.3 the tiles keep red for what cannot wait', () => {
  it('"Anomalies ouvertes": red for a danger or a stop, amber for a simple anomaly, green for none', () => {
    const danger = tile(small(eq({ anomalies: [an({ severity: 'danger' })] })), 'Anomalies ouvertes');
    const stop = tile(small(eq({ anomalies: [an({ severity: 'stopped' })], stoppedSince: '2026-09-25T04:00' })), 'Anomalies ouvertes');
    const simple = tile(small(eq({ anomalies: [an({})] })), 'Anomalies ouvertes');
    const none = tile(small(eq()), 'Anomalies ouvertes');
    expect(danger.cls).toContain('border-red-300');
    expect(stop.cls).toContain('border-red-300');
    expect(simple.cls).toContain('border-amber-300');
    expect(simple.cls).not.toContain('border-red-300');
    expect(simple.value).toBe('1');
    expect(none.cls).toContain('border-emerald-200');
  });
  it('"Pièces sous le mini ou en rupture": red for a critical part out, amber for a part under its minimum', () => {
    expect(tile(small(eq(), [sp({ stock: 0 })]), 'Pièces sous le mini ou en rupture').cls).toContain('border-red-300');
    const low = tile(small(eq(), [sp({ stock: 1 })]), 'Pièces sous le mini ou en rupture');
    expect(low.cls).toContain('border-amber-300');
    expect(low.cls).not.toContain('border-red-300');
    expect(tile(small(eq(), [sp({ stock: 3 })]), 'Pièces sous le mini ou en rupture').cls).toContain('border-emerald-200');
  });
});

describe('3.3 the screen answers its question, in facts', () => {
  const s = demoState(new Date()), sm = maintSummary(s, new Date());
  it('writes no sentence of seven numbers under the title: the tiles say it (the sentence stays computed, for the other tools)', () => {
    const answer = maintAnswer(sm);
    expect(answer).toMatch(/^\d+ danger signalé, \d+ équipements à l'arrêt/);
    expect(draw(s)).not.toContain(esc(answer));
  });
  it('says why "Routines à jour" counts fewer routines than there are equipment: the ones stopped do not count', () => {
    expect(sm.stopped).toBeGreaterThan(0);
    const t = tile(s, 'Routines à jour');
    expect(t.value).toBe(`${sm.routineDone} / ${sm.routineTotal}`);
    expect(t.text).toContain(esc(`(${sm.stopped} équipements à l'arrêt ne comptent pas)`));
    expect(sm.routineTotal).toBeLessThan(sm.equipments);   // the stopped ones are the difference
    const one = tile(small(eq({ stoppedSince: '2026-09-25T04:00' })), 'Routines à jour');
    expect(one.text).toContain(esc("(1 équipement à l'arrêt ne compte pas)"));
    expect(tile(small(eq()), 'Routines à jour').text).not.toContain('ne compte');
  });
  it('says each fact once: the queue carries the tasks, and what it does not carry is folded in the same card ("À savoir aussi")', () => {
    const html = draw(s), todos = maintSummary(s, new Date()).todos, rest = maintInsights(s, new Date(), todos);
    expect(rest.length).toBeGreaterThan(0);
    expect(html).toContain('À faire : ');
    expect(html).toContain(`À savoir aussi : ${rest.length}`);
    expect(html).not.toMatch(/Voir (les \d+ )?(autres )?messages?/);   // no second list of messages above the queue
    for (const k of ['danger', 'stopped', 'plan-b-over', 'anomalies', 'spare-out', 'routine-missed']) expect(rest.map(i => i.key), k).not.toContain(k);
  });
});

describe('3.3 the screen has a title and a list of filters for the phone', () => {
  it('has one h1 with the name of the tool, and none in the empty state twice', () => {
    expect(draw(demoState(new Date())).match(/<h1[^>]*>/g)).toEqual(['<h1 class="sr-only">']);
    expect(draw(demoState(new Date()))).toContain('<h1 class="sr-only">Maintenance</h1>');
    const empty = draw({ ...demoState(new Date()), equipments: {}, spares: {} });
    expect(empty.match(/<h1[^>]*>/g)).toHaveLength(1);
  });
  it('shows the seven filters as one list at every width, with the counts, and no pills', () => {
    const s = demoState(new Date()), sm = maintSummary(s, new Date()), html = draw(s);
    expect(html).toMatch(/<select[^>]*aria-label="Afficher"/);
    expect(html).toContain(`>Suivis ${sm.equipments}</option>`);
    expect(html).toMatch(/<option value="todo">Routine à faire \d+<\/option>/);
    expect(html.match(/<option value="(service|todo|stopped|anomalies|spares|checks|retired)"/g)).toHaveLength(7);
    expect(html).not.toMatch(/<select[^>]*\bsm:hidden\b[^>]*aria-label="Afficher"/);
    expect(html).not.toContain('<div class="max-sm:hidden"><div class="flex flex-wrap items-center gap-1.5 print:hidden">');
  });
  it('folds the queue on a phone, so that the first equipment comes within a screen and a bit: the queue closed, the list as the view', () => {
    const s = demoState(new Date());
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    try {
      const html = draw(s);
      expect(html).not.toMatch(/<details open/);   // the queue is folded
      expect(html).toContain('<li class="flex flex-wrap items-center gap-x-1 sm:flex-nowrap');   // the list, not the cards
      expect(html).not.toContain('sm:grid-cols-2 xl:grid-cols-3');
    } finally { vi.unstubAllGlobals(); }
    const wide = draw(s);
    expect(wide).toMatch(/<details open="" /);
    expect(wide).toContain('sm:grid-cols-2 xl:grid-cols-3');
  });
  it('says "toucher", never "tap"', () => {
    for (const s of [demoState(new Date()), { ...demoState(new Date()), equipments: {}, spares: {} }]) expect(draw(s).replace(/<[^>]+>/g, ' ').match(/.{60}(?<!\p{L})tap(?!\p{L}).{60}/iu)?.[0]).toBeUndefined();   // ("tapé", typed, is French)
  });
});
