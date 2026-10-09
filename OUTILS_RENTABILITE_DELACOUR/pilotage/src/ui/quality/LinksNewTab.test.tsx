// Tools 5.1 to 5.4: a button that leads to ANOTHER tool opens it in a new browser tab (nav.open) and leaves the sheet where it is (no nav.tool, no onClose);
// what the other tab reads is written before. No DOM library in the repo: the render is static, and the handlers are taken from the buttons the render creates.
import { describe, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Analysis, Nc, Poka, State } from '../../domain/types';
import { demoState, blankState } from '../../domain/templates';
import { applyQualityExample } from '../../domain/qualityExamples';
import { cnqItems, ncOrderFocus } from '../../domain/quality';
import { periodOfDate } from '../../domain/periods';
import { NcSheet } from './BacRouge';
import { AnalysisSheet } from './Ateliers';
import { PokaSheet } from './Detrompeurs';
import { NonQualite } from './NonQualite';

type Props = { onClick?: () => void; children?: unknown };
const seen = vi.hoisted(() => ({ buttons: [] as { onClick?: () => void; children?: unknown }[] }));
const store = vi.hoisted(() => ({ state: null as unknown, period: '' }));
// every <button onClick> the render creates (the Button of the app too: it renders one)
vi.mock('react/jsx-dev-runtime', async orig => {
  const o = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...o, jsxDEV: (type: unknown, props: Props, ...rest: unknown[]) => { if (type === 'button' && props.onClick) seen.buttons.push(props); return (o.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, period: store.period, setPeriod: vi.fn(), update: (f: (d: State) => void) => f(store.state as State), author: 'Test', teamView: false, storageFull: false, folder: { status: 'none' } }) }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{children}{footer}</section> }));

const now = new Date(2026, 8, 25, 10, 0);
// what a button says to the eye: its text, not the words for a screen reader (the icon NewTab is a component, not drawn here)
const said = (n: unknown): string => Array.isArray(n) ? n.map(said).join('') : typeof n === 'string' || typeof n === 'number' ? String(n) : isValidElement(n) && typeof n.type === 'string' ? said((n.props as Props).children) : '';
const click = (text: string, exact = false) => {
  const b = seen.buttons.filter(x => (exact ? said(x.children) === text : said(x.children).includes(text)));
  expect(b, `one button "${text}"`).toHaveLength(1);
  b[0].onClick!();
};
const spies = () => ({ nav: { tool: vi.fn(), open: vi.fn(), openAction: vi.fn(), newAction: vi.fn(), openRisk: vi.fn(), settings: vi.fn() }, onClose: vi.fn() });
const setup = () => { const s = demoState(now); applyQualityExample(s, now); store.state = s; store.period = periodOfDate(now); return s; };
const NEW_TAB = 'ouvre dans un nouvel onglet';
const gone = (c: ReturnType<typeof spies>) => { expect(c.nav.tool).not.toHaveBeenCalled(); expect(c.onClose).not.toHaveBeenCalled(); };

describe('5.1 defect sheet: links to other tools open in a new tab', () => {
  const sheet = (n: Nc, c = spies()) => { seen.buttons.length = 0; const html = renderToStaticMarkup(<NcSheet initial={n} onClose={c.onClose} nav={c.nav} />); return { ...c, html }; };
  const linked = (s: State, over: Partial<Nc> = {}): Nc => ({ ...s.ncs.nc_demo_8, sopId: 'sop_demo_2', equipmentId: 'eq_demo_plieuse', deliveryId: 'dl_demo_1', complaintId: 'cp_demo_2', analysisId: undefined, ...over });

  it('the order, the equipment, the work instruction and the complaint', () => {
    const s = setup(), n = linked(s), { nav, onClose, html } = sheet(n);
    expect(html).toContain(NEW_TAB);
    click("Ouvrir l'instruction (3.2)"); expect(nav.open).toHaveBeenLastCalledWith('3.2', 'sop_demo_2');
    click("Ouvrir l'équipement (3.3)"); expect(nav.open).toHaveBeenLastCalledWith('3.3', 'eq_demo_plieuse');
    click('Ouvrir la commande'); expect(nav.open).toHaveBeenLastCalledWith('3.4', ncOrderFocus(n));
    click(`Réclamation ${s.complaints.cp_demo_2.ref}`); expect(nav.open).toHaveBeenLastCalledWith('2.3', 'cp_demo_2');
    expect(nav.open).toHaveBeenCalledTimes(4);
    gone({ nav, onClose });
  });

  it('writes the sheet before the other tab reads it', () => {
    const s = setup(), n = linked(s, { description: 'Texte modifié dans la fiche' }), { nav } = sheet(n);
    let atOpen = '';
    nav.open.mockImplementation(() => { atOpen = s.ncs[n.id].description; });
    click("Ouvrir l'instruction (3.2)");
    expect(atOpen).toBe('Texte modifié dans la fiche');
  });

  it('opens the workshop 5.3 it just created, linked to the defect, without leaving', () => {
    const s = setup(), n = linked(s), c = sheet(n);
    expect(Object.values(s.analyses).some(a => a.source.id === n.id)).toBe(false);
    click('Ouvrir un atelier 5 Pourquoi');
    const a = Object.values(s.analyses).find(x => x.source.id === n.id)!;
    expect(a).toBeDefined();
    expect(s.ncs[n.id].analysisId).toBe(a.id);
    expect(c.nav.open).toHaveBeenCalledWith('5.3', a.id);
    gone(c);
  });

  it('opens the workshop that already exists', () => {
    const s = setup(), c = sheet(linked(s, { analysisId: 'an_demo_1' }));
    click("Voir l'atelier");
    expect(c.nav.open).toHaveBeenCalledWith('5.3', 'an_demo_1');
    gone(c);
  });

  it('opens the debit note 3.1 it just created, or the one that exists', () => {
    const s = setup(), n = linked(s, { origin: 'fournisseur', supplierId: 'sup_demo_it' }), c = sheet(n);
    click('Réclamer au fournisseur (fiche de débit)');
    const d = Object.values(s.debits).find(x => x.ncId === n.id)!;
    expect(d).toBeDefined();
    expect(c.nav.open).toHaveBeenCalledWith('3.1', d.id);
    gone(c);
    const c2 = sheet(n);
    click('Voir la fiche de débit');
    expect(c2.nav.open).toHaveBeenCalledWith('3.1', d.id);
    expect(Object.values(s.debits).filter(x => x.ncId === n.id)).toHaveLength(1);
    gone(c2);
  });
});

describe('5.3 workshop sheet: links to other tools open in a new tab', () => {
  const sheet = (a: Analysis, c = spies()) => { seen.buttons.length = 0; const html = renderToStaticMarkup(<AnalysisSheet initial={a} onClose={c.onClose} nav={c.nav} />); return { ...c, html }; };

  it('the source defect, the countermeasure 5.4 and the one just created', () => {
    const s = setup(), a = s.analyses.an_demo_1, { nav, onClose, html } = sheet(a);
    expect(html).toContain(NEW_TAB);
    click("Ouvrir la fiche d'origine"); expect(nav.open).toHaveBeenLastCalledWith('5.1', 'nc_demo_3');
    click('Détrompeur : Ergot asymétrique'); expect(nav.open).toHaveBeenLastCalledWith('5.4', 'pk_demo_1');
    const before = Object.keys(s.pokas).length;
    click('Détrompeur (5.4)');
    const p = Object.values(s.pokas).find(x => x.id !== 'pk_demo_1' && x.id !== 'pk_demo_2')!;
    expect(Object.keys(s.pokas)).toHaveLength(before + 1);
    expect(p.analysisId).toBe(a.id);
    expect(nav.open).toHaveBeenLastCalledWith('5.4', p.id);
    expect(nav.open).toHaveBeenCalledTimes(3);
    gone({ nav, onClose });
  });

  it('the source complaint, and the sheet is written before', () => {
    const s = setup(), a: Analysis = { ...s.analyses.an_demo_3, problem: 'Problème modifié dans la fiche' }, { nav, onClose } = sheet(a);
    let atOpen = '';
    nav.open.mockImplementation(() => { atOpen = s.analyses[a.id].problem; });
    click("Ouvrir la fiche d'origine");
    expect(nav.open).toHaveBeenCalledWith('2.3', 'cp_demo_2');
    expect(atOpen).toBe('Problème modifié dans la fiche');
    gone({ nav, onClose });
  });
});

describe('5.4 device sheet: links to other tools open in a new tab', () => {
  const sheet = (p: Poka, c = spies()) => { seen.buttons.length = 0; const html = renderToStaticMarkup(<PokaSheet initial={p} onClose={c.onClose} nav={c.nav} />); return { ...c, html }; };

  it('the origin workshop and the work instruction of the workstation, the sheet written before', () => {
    const s = setup(), p: Poka = { ...s.pokas.pk_demo_1, description: 'Dispositif modifié dans la fiche' }, { nav, onClose, html } = sheet(p);
    expect(html).toContain(NEW_TAB);
    const atOpen: string[] = [];
    nav.open.mockImplementation(() => { atOpen.push(s.pokas[p.id].description); });
    click("Ouvrir l'atelier");
    expect(nav.open).toHaveBeenLastCalledWith('5.3', 'an_demo_1');
    click("Mettre à jour l'instruction du poste Montage armoires");
    expect(nav.open).toHaveBeenLastCalledWith('3.2', 'sop_demo_1');
    expect(atOpen).toEqual(['Dispositif modifié dans la fiche', 'Dispositif modifié dans la fiche']);
    gone({ nav, onClose });
  });
});

describe('5.2 cost screen: links to other tools open in a new tab', () => {
  const screen = (c = spies()) => { seen.buttons.length = 0; const html = renderToStaticMarkup(<NonQualite nav={c.nav} focus="" clearFocus={() => {}} />); return { ...c, html }; };

  it('each reference of the detail opens its sheet in the tool it comes from', () => {
    const s = setup(), items = cnqItems(s, store.period), { nav, html } = screen();
    expect(items.some(i => i.kind === 'nc')).toBe(true);
    expect(html).toContain(NEW_TAB);
    const TOOL = { nc: '5.1', complaint: '2.3', debit: '3.1' } as const;
    items.forEach(i => { click(i.ref, true); expect(nav.open).toHaveBeenLastCalledWith(TOOL[i.kind], i.id); });
    expect(nav.open).toHaveBeenCalledTimes(items.length);
    expect(nav.tool).not.toHaveBeenCalled();
  });

  it('the first defect is declared in 5.1 in a new tab', () => {
    store.state = blankState('industrie', now); store.period = periodOfDate(now);
    const { nav, html } = screen();
    expect(html).toContain(NEW_TAB);
    click('Déclarer un premier défaut (5.1)');
    expect(nav.open).toHaveBeenCalledWith('5.1');
    expect(nav.tool).not.toHaveBeenCalled();
  });
});
