// Corrections of the critique (F2b): a locked fact is not drawn as a switched-off control, the ring is never red, the title keeps the item, one person for the whole sheet,
// "(en cours)" only for a delivery under way, one h1 at most in the PV (static render; the store is a stub; the sizes on screen are measured in the browser).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { newDelivery, shipChecksOf } from '../../domain/receptions';
import { PvPrint, PvView } from './RcPv';
import { RcSheet } from './RcSheet';
import { RcTabFollow } from './RcTabFollow';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabOrder } from './RcTabOrder';
import { RcTabReception } from './RcTabReception';
import { RcTabRelease } from './RcTabRelease';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false }) }));
// the dialogs are drawn in a portal of the page, which a static render has not: the sheet is rendered with its body in place
vi.mock('../common', async importOriginal => {
  const h = (await import('react')).createElement;
  return { ...(await importOriginal<typeof import('../common')>()), Modal: ({ title, subtitle, children, footer }: { title: unknown; subtitle?: unknown; children: unknown; footer?: unknown }) => h('section', null, h('h2', null, title as string), subtitle as string, children as string, footer as string) };
});

const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
const state = demoState(new Date(2026, 8, 25, 10, 0));
store.state = state;
const props = (id: string) => { const d = state.deliveries[id]; return { d, saved: d, set: noop, act: noop, state, nav, close: noop }; };
const sheet = (id: string, tab?: 'order' | 'milestones' | 'release' | 'reception' | 'follow') => renderToStaticMarkup(<RcSheet initial={state.deliveries[id]} onClose={noop} nav={nav} tab={tab} />);
const count = (html: string, t: string) => html.split(t).length - 1;

describe('a locked fact is a fact, not a switched-off control (the PV of dl_demo_8 is signed)', { timeout: 30000 }, () => {
  it('tab Réception: the result is a pill (colour, icon, word) and the other choices are not drawn', () => {
    const html = renderToStaticMarkup(<RcTabReception {...props('dl_demo_8')} />);
    expect(html).toContain(plain('Résultat de la réception : </span>Sans réserve'));
    expect(html).not.toContain(plain('role="group" aria-label="Résultat de la réception"'));
    expect(html).not.toContain(plain('Avec réserves'));
    expect(html).not.toContain(plain('le résultat est inactif'));
  });
  it('tab Réception, an order still open: the three choices stay buttons, legible when nobody is picked yet', () => {
    const html = renderToStaticMarkup(<RcTabReception {...props('dl_demo_5')} />);
    expect(html).toContain(plain('role="group" aria-label="Résultat de la réception"'));
    expect(html).toMatch(/disabled="" class="[^"]*disabled:!opacity-100[^"]*">Sans réserve/);
    expect(html.slice(html.lastIndexOf('<button', html.indexOf('Commencer la réception')))).toMatch(/^<button[^>]*disabled:!opacity-100[^>]*disabled:bg-slate-200[^>]*>/);   // the lone gesture of the step, 6:1 when off
  });
  it('tab Libération: no question of who, no "inactifs", no switched-off button; the release is a line, the checks are pills', () => {
    const html = renderToStaticMarkup(<RcTabRelease {...props('dl_demo_8')} />);
    expect(html).not.toContain(plain('Qui libère ou contrôle le départ ?'));
    expect(html).not.toMatch(/inactifs?/);
    expect(html).not.toMatch(/disabled=""/);
    expect(html).not.toContain(plain('Annuler la libération'));
    expect(html).toMatch(/Libérée par David K\./);
    expect(html).toContain(plain('Contrôle de départ : Matériel repris : </span>Fait'));
    expect(html).not.toContain(plain('aria-pressed'));
  });
  it('tab Libération, an order not signed: the question stays when the tab is alone, the checks of departure come first as one line, the marks are buttons once one is asked for', () => {
    const html = renderToStaticMarkup(<RcTabRelease {...props('dl_demo_5')} />);
    expect(html).toContain(plain('Qui libère ou contrôle le départ ?'));
    expect(html).toContain('Tout fait');
    expect(html).toContain('Signaler un seul');
    expect(html.indexOf('Contrôle de départ')).toBeLessThan(html.indexOf('Libération avant départ'));
    expect(html).not.toMatch(/aria-pressed="false"[^>]*>Fait/);
    const d = state.deliveries.dl_demo_5, half = renderToStaticMarkup(<RcTabRelease {...props('dl_demo_5')} d={{ ...d, shipChecks: shipChecksOf(d, state.params).map((c, i) => (i === 0 ? { ...c, ok: true } : c)) }} />);
    expect(half).toMatch(/aria-pressed="false"[^>]*>Fait/);
    expect(half).not.toContain('Signaler un seul');
  });
  it('tab Jalons: no Conforme / Non conforme / Rouvrir / Monter / Retirer / Ajouter drawn off, the state stays in the badge', () => {
    const html = renderToStaticMarkup(<RcTabMilestones {...props('dl_demo_8')} />);
    ['Non conforme<', 'Rouvrir', 'Sans objet<', 'Monter', 'Descendre', 'Retirer', 'Ajouter un jalon'].forEach(t => expect(html, t).not.toContain(plain(t)));
    expect(html).toContain(plain('Corriger la définition'));
    expect(html).not.toMatch(/<button[^>]*disabled=""/);
  });
  it('tab Commande: the people of a signed order are a list, not switched-off buttons', () => {
    const d = state.deliveries.dl_demo_8, html = renderToStaticMarkup(<RcTabOrder {...props('dl_demo_8')} d={{ ...d, team: ['David K.', 'Nicolas R.'] }} />);
    expect(html).toContain(plain('aria-label="Personnes de la commande"'));
    expect(html).not.toMatch(/<button[^>]*>Autre, précisez/);   // no button "Autre, précisez" for the people (the model list holds an option of that name)
    expect(html).not.toMatch(/<button[^>]*aria-pressed/);
  });
});

describe('the header of the sheet', { timeout: 30000 }, () => {
  it('draws the ring grey until the sheet is complete, green when it is, never red or amber; the figure is 12 px at least', () => {
    ['dl_demo_5', 'dl_demo_13', 'dl_demo_3'].forEach(id => { const h = sheet(id); expect(h, id).toContain(plain('stroke="#94a3b8"')); expect(h, id).not.toMatch(/stroke="#(DC2626|D97706)"/); });
    expect(sheet('dl_demo_8')).toContain(plain('stroke="#059669"'));
    expect(renderToStaticMarkup(<RcSheet initial={newDelivery(state.params)} onClose={noop} nav={nav} />)).not.toMatch(/stroke="#(DC2626|D97706)"/);
    expect(sheet('dl_demo_5')).toMatch(/aria-label="Fiche complète à \d+ %" class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold/);
  });
  it('lets the item of an order with several deliveries go to its own line, two lines at most, instead of getting no width', () => {
    const many = sheet('dl_demo_13'), one = sheet('dl_demo_5');
    expect(many).toMatch(/flex flex-wrap items-center gap-x-2 gap-y-1[^"]*"/);
    expect(many).toMatch(/line-clamp-2 min-w-0 break-words basis-full sm:basis-auto">Portillons, série 3/);
    expect(one).toMatch(/line-clamp-2 min-w-0 break-words ">Supports moteur/);
  });
  it('keeps the label of every tab at the same place, the badge under it', () => {
    const html = sheet('dl_demo_8');
    expect(count(html, 'justify-start'), 'five tabs').toBe(5);
    expect(html).not.toMatch(/role="tab"[^>]*justify-center gap-0\.5/);
  });
});

describe('one person for the whole sheet', { timeout: 30000 }, () => {
  it('asks once on top of the tabs that write a gesture, and the tabs do not ask again', () => {
    const rel = sheet('dl_demo_5', 'release'), rec = sheet('dl_demo_5', 'reception'), ms = sheet('dl_demo_5', 'milestones');
    [rel, rec, ms].forEach(h => { expect(count(h, 'Qui enregistre sur cette fiche ?')).toBe(1); });
    expect(rel).not.toContain(plain('Qui libère ou contrôle le départ ?'));
    expect(rec).not.toMatch(/Qui remet pour l.{1,6}entreprise/);
  });
  it('asks nothing on the tabs that write no gesture, nor on the checks and the release of a signed PV', () => {
    ['order', 'follow'].forEach(t => expect(sheet('dl_demo_5', t as 'order' | 'follow')).not.toContain(plain('Qui enregistre sur cette fiche ?')));
    ['milestones', 'release'].forEach(t => expect(sheet('dl_demo_8', t as 'milestones' | 'release')).not.toContain(plain('Qui enregistre sur cette fiche ?')));
  });
  it('keeps the question of each tab when a tab is rendered alone (nothing is chosen for the user)', () => {
    expect(renderToStaticMarkup(<RcTabReception {...props('dl_demo_5')} />)).toMatch(/Qui remet pour l.{1,6}entreprise/);
  });
});

describe('tab Suites', { timeout: 30000 }, () => {
  it('says "(en cours)" for a delivery under way only, not for one whose PV is signed', () => {
    expect(renderToStaticMarkup(<RcTabFollow {...props('dl_demo_8')} />)).not.toContain(plain('(en cours)'));
    expect(renderToStaticMarkup(<RcTabFollow {...props('dl_demo_5')} />)).toContain(plain('Livraison n° 1 (en cours)'));
  });
});

describe('tab Suites, the seal of a closed delivery', { timeout: 30000 }, () => {
  it('says in a red line that the content of a closed delivery no longer matches its seal, and says nothing when it matches', () => {
    const d = state.deliveries.dl_demo_13, tampered = { ...d, client: 'Autre client' };
    expect(renderToStaticMarkup(<RcTabFollow {...props('dl_demo_13')} d={d} />)).not.toContain(plain('ne correspond plus à son scellé'));
    const html = renderToStaticMarkup(<RcTabFollow {...props('dl_demo_13')} d={tampered} />);
    expect(html).toMatch(/role="alert"[^>]*>(<svg[^>]*>.*?<\/svg>)?Le contenu du PV-[\w-]+ ne correspond plus à son scellé\./);
  });
});

describe('the PV', { timeout: 30000 }, () => {
  it('has no h1 on the screen (the dialog or the step above has it), its title is an h2 and its sections h3; on paper the title is the one h1', () => {
    ['dl_demo_8', 'dl_demo_1', 'dl_demo_13'].forEach(id => {
      const d = state.deliveries[id], screen = renderToStaticMarkup(<PvView d={d} state={state} />), paper = renderToStaticMarkup(<PvPrint d={d} state={state} />);
      expect(screen, id).not.toContain(plain('<h1'));
      expect(screen, id).toMatch(/<h2[^>]*>CMD-/);
      expect(screen, id).toMatch(/<h3[^>]*>Commande et livraison</);
      expect(count(paper, '<h1'), id).toBe(1);
      expect(paper, id).toMatch(/<h2[^>]*>Commande et livraison</);
    });
  });
  it('is 12 px on the screen for its small lines and keeps the size of the page on paper', () => {
    const screen = renderToStaticMarkup(<PvView d={state.deliveries.dl_demo_8} state={state} />);
    expect(screen).toContain(plain('text-xs text-slate-600 print:text-[0.85em]'));
    expect(screen).not.toContain(plain('text-[0.85em] text-slate-600"'));
  });
});
