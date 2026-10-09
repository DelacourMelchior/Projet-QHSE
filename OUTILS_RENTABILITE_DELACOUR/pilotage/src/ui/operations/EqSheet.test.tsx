// The sheet of a piece of equipment (tool 3.3), polish of the design review: the foot keeps the state of the save and "Fermer" (the other actions are folded in
// "Autres actions"), the banner says what the card says, a retired equipment is not asked to be completed, nothing at 100 %, a list of people from 6 names.
// Static render (the window is drawn as a plain section); the choice in the list is made on the handler that the render drew.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Anomaly, Equipment, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { EQ_TEMPLATES, equipmentFromTemplate, newEquipment } from '../../domain/maintenance';
import { EqSheet } from './EqSheet';
import { SheetTab } from './EqSheetTab';

const held = vi.hoisted(() => ({ state: undefined as unknown, onChange: [] as { 'aria-label'?: string; onChange(e: unknown): void }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onChange?: unknown } | null, ...rest: unknown[]) => { if (type === 'select' && typeof props?.onChange === 'function') held.onChange.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: held.state, update: vi.fn(), author: 'Test', storageFull: false, teamView: false }) }));
vi.mock('../common', async orig => ({
  ...(await orig<typeof import('../common')>()),
  Modal: ({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}><p data-sub>{subtitle}</p><div data-body>{children}</div><footer>{footer}</footer></section>,
}));

const now = new Date(2026, 8, 25, 10, 0);
const noop = () => {};
const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const an = (over: Partial<Anomaly>): Anomaly => ({ id: 'a1', label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const eq = (over: Partial<Equipment>): Equipment => ({ ...newEquipment(), id: 'e1', name: 'Presse', kind: 'machine', operator: 'Alice', manager: 'Marc', inspections: [{ date: '2026-09-22', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }], ...over });
const stateOf = (e: Equipment): State => (held.state = { ...demoState(now), equipments: { [e.id]: e } }) as State;
const sheet = (e: Equipment) => { stateOf(e); return renderToStaticMarkup(<EqSheet initial={e} nav={nav} onClose={noop} />); };
const part = (html: string, tag: 'footer' | 'details') => html.slice(html.indexOf(`<${tag}`), html.indexOf(`</${tag}>`));
// an equipment whose sheet is complete (100 %)
const complete = () => { const e = eq({ deputy: 'Bruno', serial: 'SN-1', contacts: [{ id: 'h', role: 'Électricien' }], tasks: [{ id: 'k', label: 'Extincteurs', everyDays: 365, lastDone: '2026-06-01', legal: false }] }); e.checkpoints = e.checkpoints.map((c, i) => (i === 0 ? { ...c, photo: 'p1' } : c)); return e; };

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
  vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' }, matchMedia: () => ({ matches: false }) });
});
afterAll(() => { vi.useRealTimers(); });

describe('3.3 the foot of the sheet', () => {
  const ACTIONS = ['Retirer du service', 'Supprimer', 'Dupliquer', 'Affiche à imprimer', 'Feuille papier (PDF)'];
  it('keeps the state of the save and "Fermer", nothing else', () => {
    const foot = part(sheet(eq({})), 'footer');
    expect(foot).toContain('Enregistré automatiquement');
    expect(foot).toContain('>Fermer<');
    expect(foot.match(/<button/g)).toHaveLength(1);
    [...ACTIONS, 'Routine plein écran'].forEach(a => expect(foot, a).not.toContain(a));
  });
  it('folds the other actions in "Autres actions", closed, each button at 44 px on a phone', () => {
    const html = sheet(eq({})), d = part(html, 'details');
    const all = html.match(/<details[^>]*>.*?<\/details>/g) ?? [], other = all.find(x => x.includes('Autres actions'))!;
    expect(other).toBeDefined();
    expect(other).not.toMatch(/^<details[^>]* open/);
    ['Retirer du service', 'Dupliquer', 'Affiche à imprimer', 'Feuille papier (PDF)'].forEach(a => expect(other, a).toContain(a));
    expect(other.match(/<button/g)?.length).toBe(other.match(/<button[^>]*max-sm:min-h-\[44px\]/g)?.length);
    expect(d).toBeDefined();
  });
  it('says in the folded block why an equipment is not deleted (no "Supprimer" then)', () => {
    const other = (sheet(eq({ anomalies: [an({})], inspections: [] })).match(/<details[^>]*>.*?<\/details>/g) ?? []).find(x => x.includes('Autres actions'))!;
    expect(other).toContain('Pas de suppression');
    expect(other).not.toContain('Supprimer');
  });
  it('opens the block of a retired equipment, whose way back is there', () => {
    const other = (sheet(eq({ retiredAt: '2026-09-01' })).match(/<details[^>]*>.*?<\/details>/g) ?? []).find(x => x.includes('Autres actions'))!;
    expect(other).toMatch(/^<details[^>]* open/);
    expect(other).toContain('Remettre en service');
  });
});

describe('3.3 the banner of the sheet is the level of the card', () => {
  const banner = (html: string) => html.match(/<div class="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ([^"]*)">(.*?)<\/div>/)!;
  it('is red for a danger and for a stop, with the word', () => {
    const danger = banner(sheet(eq({ anomalies: [an({ severity: 'danger' })] })));
    expect(danger[1]).toContain('border-red-300 bg-red-50');
    expect(danger[2]).toContain('Danger');
    const stop = banner(sheet(eq({ stoppedSince: '2026-09-25T05:00' })));
    expect(stop[1]).toContain('border-red-300 bg-red-50');
    expect(stop[2]).toContain("À l&#x27;arrêt");
    expect(stop[2]).toContain('depuis 5 h');
  });
  it('says the stop and the danger together when both', () => {
    const b = banner(sheet(eq({ stoppedSince: '2026-09-25T05:00', anomalies: [an({ severity: 'danger' })] })));
    expect(b[2]).toContain('Danger');
    expect(b[2]).toContain('à l&#x27;arrêt depuis 5 h');
  });
  it('is amber for a simple anomaly, green only for "En ordre"', () => {
    const one = banner(sheet(eq({ anomalies: [an({})] })));
    expect(one[1]).toContain('border-amber-300 bg-amber-50');
    expect(one[2]).toContain('Anomalie');
    const ok = banner(sheet(eq({})));
    expect(ok[1]).toContain('border-emerald-200 bg-emerald-50');
    expect(ok[2]).toContain('En ordre');
    expect(ok[2]).toContain('En service');
  });
  it('stays grey and says the retirement for a retired equipment', () => {
    const b = banner(sheet(eq({ retiredAt: '2026-09-01', retiredNote: 'Vendue' })));
    expect(b[1]).toContain('border-slate-200 bg-slate-50');
    expect(b[2]).toContain('Retiré du service');
    expect(b[2]).toContain('le 01/09/2026 : Vendue');
  });
});

describe('3.3 what the sheet does not ask', () => {
  it('asks nothing of a retired equipment: no ring, no chip "À compléter", no amber counter on the tabs', () => {
    const e = eq({ retiredAt: '2026-09-01', operator: '' });
    const html = sheet(e);
    expect(html).not.toContain('Fiche complète');
    expect(html).not.toContain('À compléter');
    const tabs = (h: string) => h.slice(h.indexOf('role="tablist"'), h.indexOf('role="tabpanel"'));
    expect(tabs(html)).not.toContain('à compléter');
    const live = sheet(eq({ operator: '' }));
    expect(live).toContain('À compléter : Titulaire de la routine');   // the same gap, on an equipment in service
    expect(tabs(live)).toContain('à compléter');
  });
  it('shows the ring under 100 %, with the missing points, and nothing at 100 %', () => {
    const under = sheet(eq({}));
    expect(under).toMatch(/Fiche complète à \d+ %/);
    expect(under).toContain('role="img"');
    const e = complete(), full = sheet(e);
    expect(full).not.toContain('Fiche complète');
    expect(full).not.toContain('À compléter');
    expect(full).not.toContain('role="img" aria-label="Fiche complète');
  });
  it('writes the group and the place once when they are the same', () => {
    const sub = (over: Partial<Equipment>) => sheet(eq(over)).match(/<p data-sub="true">(.*?)<\/p>/)![1];
    expect(sub({ group: 'Atelier tôlerie', location: 'Atelier tôlerie' })).toBe('Machine · Atelier tôlerie');
    expect(sub({ group: 'Atelier tôlerie', location: ' atelier tolerie ' })).toBe('Machine · Atelier tôlerie');
    expect(sub({ group: 'Atelier tôlerie', location: 'Poste 3' })).toBe('Machine · Atelier tôlerie · Poste 3');
    expect(sub({ location: 'Poste 3' })).toBe('Machine · Poste 3');
  });
});

describe('3.3 a new equipment asks for its name only, and a saved one can report a problem from its header', () => {
  const fresh = () => { const e = eq({ name: '', inspections: [], checkpoints: [] }); held.state = { ...demoState(now), equipments: {} }; return renderToStaticMarkup(<EqSheet initial={e} nav={nav} onClose={noop} />); };
  it('folds the rest of the identity under "Compléter plus tard" and draws no ring nor chip while the name is empty', () => {
    const html = fresh();
    expect(html).toContain('Compléter plus tard');
    expect(html).not.toMatch(/<details open="">(?:(?!<\/summary>).)*Compléter plus tard/);   // closed
    expect(html).not.toContain('Fiche complète à');
    expect(html).not.toContain('À compléter :');
  });
  it('hides the choice of a model once the points are those of a model, offers it otherwise', () => {
    expect(fresh()).toContain('Partir d&#x27;un modèle de routine');
    const e = eq({ name: '', inspections: [] }); held.state = { ...demoState(now), equipments: {} };
    const t = EQ_TEMPLATES[0], m = equipmentFromTemplate(t);
    expect(renderToStaticMarkup(<EqSheet initial={{ ...e, checkpoints: m.checkpoints }} nav={nav} onClose={noop} />)).not.toContain('Partir d&#x27;un modèle de routine');
  });
  it('puts "Signaler" in the header of a saved equipment, not of a retired one', () => {
    expect(sheet(eq({}))).toContain('aria-label="Signaler un problème : Presse"');
    expect(sheet(eq({ retiredAt: '2026-09-01' }))).not.toContain('Signaler un problème');
  });
});

describe('3.3 who looks after it: a list from 6 names', () => {
  const tab = (names: string[], over: Partial<Equipment> = {}, set: (x: unknown) => void = noop) => {
    const e = eq(over), s = stateOf(e);
    s.people = Object.fromEntries(names.map((n, i) => [`p${i}`, { id: `p${i}`, name: n, role: '', active: true, absences: [] }]));
    held.onChange.length = 0;
    return renderToStaticMarkup(<SheetTab e={e} saved={e} state={s} by="Test" set={set as never} act={noop} nav={nav} openStation={noop} undo={noop} />);
  };
  const NAMES = ['Alice', 'Bruno', 'Carine', 'David', 'Élodie', 'Farid'];
  it('keeps the big buttons up to 5 names', () => {
    const html = tab(NAMES.slice(0, 5));
    expect(html.match(/aria-pressed/g)?.length).toBe(3 * 6);   // 3 groups of 5 names + "Autre, précisez"
    expect(html).not.toContain('<option value="Alice"');
  });
  it('is a list to choose from, ending with "Autre, précisez", from 6 names: no row of 39 buttons', () => {
    const html = tab(NAMES);
    expect(html).not.toContain('aria-pressed');
    ['Titulaire de la routine', 'Suppléant', 'Responsable'].forEach(l => expect(html).toMatch(new RegExp(`<select[^>]*aria-label="${l}"`)));
    const list = html.match(/<select[^>]*aria-label="Titulaire de la routine"[^>]*>.*?<\/select>/)![0];
    expect(list.match(/<option/g)).toHaveLength(NAMES.length + 2);   // "Choisir…", the names, "Autre, précisez"
    expect(list.endsWith('Autre, précisez</option></select>')).toBe(true);
  });
  it('selects the holder, and a name that is not on the list reads as "Autre, précisez" with its field', () => {
    const known = tab(NAMES, { operator: 'Alice' }).match(/<select[^>]*aria-label="Titulaire de la routine"[^>]*>.*?<\/select>/)![0];
    expect(known).toContain('<option value="Alice" selected="">Alice</option>');
    const html = tab(NAMES, { operator: 'Intérimaire' }), list = html.match(/<select[^>]*aria-label="Titulaire de la routine"[^>]*>.*?<\/select>/)![0];
    expect(list).toContain('selected="">Autre, précisez</option>');
    expect(html).toContain('aria-label="Titulaire de la routine : nom"');
  });
  it('writes the name that is chosen, and nothing when "Choisir…" is chosen', () => {
    const set = vi.fn();
    tab(NAMES, { operator: 'Alice' }, set);
    const list = held.onChange.find(x => x['aria-label'] === 'Titulaire de la routine')!;
    list.onChange({ target: { value: 'Bruno' } });
    expect(set).toHaveBeenLastCalledWith({ operator: 'Bruno' });
    list.onChange({ target: { value: '' } });
    expect(set).toHaveBeenLastCalledWith({ operator: '' });
  });
});

describe('3.3 one label for the full-screen routine', () => {
  it('says "Faire la routine en plein écran" in the Fiche tab, and where the poster is printed', () => {
    const e = eq({}), s = stateOf(e);
    const html = renderToStaticMarkup(<SheetTab e={e} saved={e} state={s} by="Test" set={noop} act={noop} nav={nav} openStation={noop} undo={noop} />);
    expect(html).toContain('Faire la routine en plein écran');
    expect(html).not.toContain('Ouvrir la routine plein écran');
    expect(html).toContain('Autres actions');
    expect(html).not.toContain('pied de la fiche');
  });
});
