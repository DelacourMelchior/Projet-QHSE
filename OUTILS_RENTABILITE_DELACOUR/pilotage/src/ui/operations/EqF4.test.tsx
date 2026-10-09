// Tool 3.3, tabs of the sheet, cabinet and sheet of a part (design review): the Routine tab opens on the period in progress and folds its setting; an equipment
// that is not in service cannot start a routine and says why; the Problems tab has one main button; the sheet of a part opens on where it is and how many are
// left; the buttons of the cabinet say which part they act on. Static render (no browser): the order of the blocks, the texts, the `disabled`, the `aria-label`.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Equipment, Spare, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { frDate } from '../../domain/periods';
import { CabinetView, SpareRow } from './EqCabinet';
import { IssuesTab } from './EqIssuesTab';
import { RoutineTab } from './EqRoutineTab';
import { SpareSheet } from './EqSpareSheet';

const held = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: held.state, update: vi.fn(), author: 'Test', storageFull: false }) }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{subtitle}{children}{footer}</section> }));
const noop = () => {};
const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const CNC = 'eq_demo_cnc', SRV = 'eq_demo_serveur', OLD = 'eq_demo_ancienne', FOURGON = 'eq_demo_fourgon', VALVE = 'sp_demo_electrovanne';

const props = (e: Equipment, state: State) => ({ e, saved: e, state, by: 'Test', set: noop, act: noop, nav, openStation: noop });
const routine = (s: State, e: Equipment) => { held.state = s; return renderToStaticMarkup(<RoutineTab {...props(e, s)} />); };
const issues = (s: State, e: Equipment) => { held.state = s; return renderToStaticMarkup(<IssuesTab {...props(e, s)} />); };
const sheet = (s: State, sp: Spare) => { held.state = s; return renderToStaticMarkup(<SpareSheet initial={sp} onClose={noop} nav={nav} />); };
const before = (html: string, a: string, b: string) => { const i = html.indexOf(a), j = html.indexOf(b); expect(i, a).toBeGreaterThan(-1); expect(j, b).toBeGreaterThan(-1); expect(i, `${a} before ${b}`).toBeLessThan(j); };
// the opening tag of the button that carries this label
const button = (html: string, label: string) => (html.match(new RegExp(`<button[^>]*>(?:<svg.*?</svg>)?${label.replace(/'/g, '&#x27;')}</button>`)) ?? [''])[0];

describe('3.3 Routine tab', () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' }, matchMedia: () => ({ matches: false }) }); });
  const s = demoState(new Date()), cnc = s.equipments[CNC];

  it('opens on the period in progress, then the history and the readings, the setting last and folded', () => {
    const html = routine(s, cnc);
    before(html, 'Période en cours', 'Faire la routine');
    before(html, 'Faire la routine', 'Les dernières routines, de la plus ancienne');   // the strip of the 12 periods
    before(html, 'Les dernières routines, de la plus ancienne', 'Les 8 dernières routines');
    before(html, 'Les 8 dernières routines', 'Relevés chiffrés');
    before(html, 'Relevés chiffrés', 'Modifier la routine');
    before(html, 'Modifier la routine', 'Rythme de la routine');
    before(html, 'Rythme de la routine', 'Qui fait la routine');
    before(html, 'Qui fait la routine', 'Points de la routine');
    expect(html).toMatch(/<details class="group[^"]*"><summary[^>]*>Modifier la routine/);   // closed: an equipment with points and routines
  });
  it('opens the setting when there is no point and no routine', () => {
    expect(routine(s, { ...cnc, checkpoints: [], inspections: [] })).toMatch(/<details open="" class="group[^"]*"><summary[^>]*>Modifier la routine/);
    expect(routine(s, { ...cnc, checkpoints: [] })).not.toMatch(/<details open=""[^>]*><summary[^>]*>Modifier la routine/);   // routines made: the setting stays folded
  });
  it('offers "Faire la routine" as the main button of an equipment in service', () => {
    const b = button(routine(s, cnc), 'Faire la routine');
    expect(b).toContain('bg-delacour-primary');
    expect(b).not.toContain('disabled=""');
  });
  it('disables it, with the reason, on an equipment that is retired', () => {
    const e = s.equipments[OLD], html = routine(s, e);
    expect(button(html, 'Faire la routine')).toContain('disabled=""');
    expect(button(html, 'Faire la routine')).not.toContain('bg-delacour-primary');
    expect(html).toContain('Équipement retiré du service.');
    expect(html).toContain('Pas encore assez de recul pour un taux.');
    expect(html).not.toMatch(/Routine faite pour 0 périodes/);
    expect(html).not.toMatch(/\d+ % des périodes dues/);
  });
  it('disables it, with the reason, on an equipment that is stopped', () => {
    const html = routine(s, s.equipments[SRV]);
    expect(button(html, 'Faire la routine')).toContain('disabled=""');
    expect(html).toMatch(/À l&#x27;arrêt depuis [^<]*: la routine reprend quand il tourne\./);
  });
  it('gives a rate only when periods were due', () => {
    expect(routine(s, cnc)).toMatch(/Routine faite pour \d+ périodes? sur 12 \(\d+ % des périodes dues\)\./);
    expect(routine(s, { ...cnc, inspections: [] })).toContain('Pas encore assez de recul pour un taux.');
  });
  it('keeps the icons that act dark enough and writes no English', () => {
    const html = routine(s, cnc);
    expect(html).not.toContain('text-slate-400');
    expect(html).not.toMatch(/\btap\b/i);
    expect(html).toContain('Un toucher sur une case');
  });
});

describe('3.3 Problems tab', () => {
  const s = demoState(new Date()), quiet = s.equipments[FOURGON];
  it('has one main button; the follow-ups are folded under "Suite à donner"', () => {
    const html = issues(s, quiet);   // an equipment with no open anomaly: the only "Ouvrir une action" is the follow-up
    before(html, 'Signaler un problème', 'Suite à donner');
    before(html, 'Suite à donner', 'Ouvrir une action');
    before(html, 'Ouvrir une action', 'Ouvrir un défaut du bac rouge');
    expect(html).toMatch(/<details class="group[^"]*"><summary[^>]*>Suite à donner/);   // folded
    expect(html.split('Signaler un problème').length - 1).toBe(1);
    expect(button(html, 'Signaler un problème')).toContain('bg-delacour-primary');
    expect(html.slice(0, html.indexOf('Suite à donner'))).not.toContain('Ouvrir');
  });
  it('keeps the new-tab sign on the red bin button', () => {
    expect(issues(s, quiet)).toMatch(/Ouvrir un défaut du bac rouge<svg[^>]*>.*?<\/svg><span class="sr-only"> \(s&#x27;ouvre dans un nouvel onglet\)/);
  });
  it('writes no English', () => { expect(issues(s, s.equipments[CNC])).not.toMatch(/\btap\b/i); });
});

describe('3.3 sheet of a part', () => {
  const now = new Date(), s = demoState(now), valve = s.spares[VALVE];
  it('opens on where it is: one line of facts, then where to find it, stock and order, then the part', () => {
    const html = sheet(s, valve), o = valve.order!;
    expect(html).toContain(`Stock 0, mini 1 · Commandée le ${frDate(o.at)}, livraison attendue depuis 9 jours · Rangée : ${valve.place}`);
    before(html, 'Stock 0, mini 1', '1. Où la trouver');
    before(html, '1. Où la trouver', '2. Stock et commande');
    before(html, '2. Stock et commande', '3. La pièce');
    before(html, '3. La pièce', '4. Les équipements');
    before(html, '4. Les équipements', '5. Le fournisseur');
    before(html, '5. Le fournisseur', '6. Critique ou consommable');
    before(html, '6. Critique ou consommable', '7. Historique des mouvements');
    expect(html.indexOf('Références équivalentes')).toBeGreaterThan(html.indexOf('3. La pièce'));
  });
  it('says that nothing is on order when the part is short and no order is made', () => {
    const bare = structuredClone(s);
    delete bare.spares[VALVE].order;   // the life of the part is read from the saved one
    expect(sheet(bare, bare.spares[VALVE])).toContain('Stock 0, mini 1 · Aucune commande en cours · Rangée :');
  });
  it('opens a new part on its name', () => {
    const html = sheet({ ...s, spares: {} } as State, { ...valve, id: 'sp_new', name: '', ref: '', place: undefined, order: undefined, moves: [] });
    before(html, '1. La pièce', '2. Où la trouver');
    before(html, '2. Où la trouver', '3. Stock et commande');
    expect(html).not.toMatch(/Stock \d+, mini \d+ ·/);   // nothing written yet: no line of facts
  });
});

describe('3.3 cabinet', () => {
  const now = new Date(), s = demoState(now), valve = s.spares[VALVE];
  const row = (sp: Spare, unlink?: () => void) => renderToStaticMarkup(<ul><SpareRow sp={sp} state={s} offer={noop} now={now} onOpen={noop} eqId={CNC} compact onUnlink={unlink} /></ul>);
  it('names the part on "Retirer la commande"', () => {
    const html = row(valve);
    expect(html).toContain(`aria-label="Retirer la commande de ${valve.name}"`);
    expect(button(html, 'Retirer la commande')).toContain('aria-label');
  });
  it('names the part on every "Commandée aujourd\'hui" of the cabinet', () => {
    held.state = s;
    const html = renderToStaticMarkup(<CabinetView state={s} onOpen={noop} onNew={noop} />);
    const visible = html.split('>Commandée aujourd&#x27;hui</button>').length - 1, named = html.match(/aria-label="Commandée aujourd&#x27;hui : [^",]+,/g) ?? [];
    expect(visible).toBeGreaterThan(1);
    expect(named.length).toBe(visible);
    expect(new Set(named).size).toBe(visible);   // no two buttons with the same name
  });
  it('says what "Retirer" detaches', () => {
    const html = row({ ...valve, order: undefined }, noop);
    expect(html).toContain('>Retirer de cet équipement</button>');
    expect(html).toContain(`aria-label="Retirer de cet équipement : ${valve.name}"`);
    expect(html).not.toMatch(/>Retirer<\/button>/);
  });
  it('titles the view at level 3, under the title of the tool', () => {
    held.state = s;
    const html = renderToStaticMarkup(<CabinetView state={s} onOpen={noop} onNew={noop} />);
    expect(html).toMatch(/<h3[^>]*>L&#x27;armoire de survie<\/h3>/);
    expect(html).not.toContain('<h2');
  });
});
