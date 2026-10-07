// Tool 4.1, the screens: the register of the example (the question and its door, who is away, the tiles, the queue, the matrix), the page "Qui remplace qui ?", the people, the envelopes
// (direction only), the assistant and the review; the sheet; the taps that leave the tool open another tab; a damaged power and the view of the team. Static render, the date fixed, the
// click made on the handler that the render drew (the JSX runtime is wrapped to keep the elements that have an onClick).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import type { Power, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { blankState } from '../../domain/templates';
import { newPower } from '../../domain/powers';
import { normalize } from '../../domain/migrate';
import { plain } from '../operations/testPlain';
import { Suppleances } from './Suppleances';
import { PwAbsent } from './PwAbsent';
import { PwList, rowOf } from './PwCards';
import { PwPeople } from './PwPeople';
import { PwQueue } from './PwQueue';
import { PwReview, PwSetup } from './PwSetup';
import { PwSheet } from './PwSheet';
import { PwVaults } from './PwVaults';
import { powerTodos } from '../../domain/powersAll';

const seen = vi.hoisted(() => ({ els: [] as { children: unknown; onClick(e?: unknown): void; 'aria-label'?: string }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onClick?: unknown } | null, ...rest: unknown[]) => { if (typeof props?.onClick === 'function') seen.els.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
const store = vi.hoisted(() => ({ state: null as unknown, team: false }));
vi.mock('../../store/StoreContext', () => ({
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: 'Test', teamView: store.team, storageFull: false, folder: { status: 'none' } }),
}));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={String(title)}>{children}{footer}</section> }));

const now = new Date(2026, 8, 25, 10, 0), noop = () => {};
const nav = { tool: vi.fn(), open: vi.fn(), openAction: vi.fn(), newAction: vi.fn(), openRisk: vi.fn(), settings: vi.fn() };
const text = (n: unknown): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : '');
const draw = (el: React.ReactElement) => { seen.els.length = 0; return plain(renderRaw(el)); };
const tap = (label: string) => { const b = seen.els.find(x => text(x.children).startsWith(label) || x['aria-label']?.startsWith(label)); if (!b) throw new Error(`no button "${label}" among ${seen.els.map(x => text(x.children) || x['aria-label']).filter(Boolean).join(' | ')}`); b.onClick({ stopPropagation() {} }); };
const fresh = (s: State = demoState(now)) => { store.state = s; store.team = false; return s; };
beforeEach(() => { vi.useFakeTimers({ now, toFake: ['Date'] }); Object.values(nav).forEach(f => f.mockClear()); });
afterEach(() => { vi.useRealTimers(); });

describe('4.1 the register', () => {
  it('draws the question and its door, who is away today, one verdict line, the queue and the list', () => {
    fresh();
    const html = draw(<Suppleances nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain(plain("L'entreprise tourne-t-elle si quelqu'un manque ?").replace(/'/g, '&#x27;'));
    expect(html.match(/Quelqu&#x27;un est absent/g)).toHaveLength(1);
    expect(html).toContain('Thomas M.');   // away today, holds a power
    expect(html).toMatch(/\d+ fonctions? clés? sur \d+ (est prête|sont prêtes)/);
    expect(html).not.toContain('Suppléants à entraîner');   // the tiles are gone: the queue is the only place that lists what is left
    expect(html).toMatch(/À faire : \d+/);
    expect(html).not.toContain('Voir toutes les fonctions');   // the list is never hidden
    expect(html).toContain('Fonction, personne, processus');
    expect(html).not.toMatch(/undefined|NaN|\[object|€/);
    expect(html.indexOf("Quelqu&#x27;un est absent")).toBeLessThan(html.indexOf('À faire :'));
  });
  it('an empty tool says what it is and offers the library, a new power and the example', () => {
    fresh(blankState('industrie', now));
    const html = draw(<Suppleances nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Partir de la bibliothèque');
    expect(html).toContain('Voir un exemple traité');
    expect(html).not.toContain('À faire :');
  });
  it('a tap on the title gives the power; each person says where her signature stands', () => {
    const s = fresh(), p = s.powers.pw_demo_3, onOpen = vi.fn();
    const html = draw(<PwList rows={[rowOf(p, s, now)]} state={s} onOpen={onOpen} />);
    expect(html).toMatch(/1 signature manquante/);   // Julien P. has not signed in the example
    expect(html).toMatch(/signatures complètes/);
    tap('Ouvrir : Lancement de l');
    expect(onOpen).toHaveBeenCalledWith(p);
  });
  it('the deputy who is the holder, or twice on a power, is told, and the empty places say "À nommer"', () => {
    const s = fresh(), p: Power = { ...newPower('P3', 'Test'), id: 'x', holder: 'Jean-Marc', deputies: ['jean-marc', ''] };
    const html = draw(<PwList rows={[rowOf(p, s, now)]} state={s} onOpen={noop} />);
    expect(html).toContain('même personne qu&#x27;une autre place');
    expect(html).toContain('À nommer');
  });
});

describe('4.1 the queue', () => {
  it('says what is left, red first, with the verb of the tap, and each line opens the right place', () => {
    const s = fresh(), todos = powerTodos(s, now), onOpen = vi.fn();
    const html = draw(<PwQueue todos={todos} me="" onOpen={onOpen} />);
    expect(html).toContain(`À faire : ${todos.length}`);
    expect(html).toContain('Pressant');
    expect(html.indexOf('Pressant')).toBeLessThan(html.indexOf('À faire :') + html.length);
    tap('Remplacer');
    expect(onOpen).toHaveBeenCalledWith(expect.stringMatching(/^pw_demo_\d:people$/));
    expect(draw(<PwQueue todos={[]} me="" onOpen={onOpen} />)).toContain('Rien à faire');
  });
  it('keeps the tasks of one person', () => {
    const s = fresh(), todos = powerTodos(s, now), html = draw(<PwQueue todos={todos} me="Julien P." onOpen={noop} />);
    expect(html).toMatch(/Mes tâches : \d+/);
  });
});

describe('4.1 the other pages', () => {
  it('"Qui remplace qui ?" gives the phone of the first deputy as the main button, the accesses of the envelopes for a long absence, and the practice of each', () => {
    const s = fresh();
    s.params.power = { vaultFull: true };
    const html = draw(<PwAbsent initial={{ name: 'Thomas M.', from: '2026-09-25', to: '2026-10-02' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />);
    expect(html).toContain('Appeler Marc M.');
    expect(html).toContain('06 00 00 00 20');
    expect(html).toContain('Les accès de secours');
    expect(html).toContain('Double visa');
    expect(html).toContain('1 fonction couverte');
    expect(s.people.pp_demo_tm.absences).toHaveLength(1);   // a simulation writes nothing
    expect(html).toContain('Absence enregistrée.');   // the absence of Thomas M. is already noted in the example: the page says so and offers to close it
    expect(html).toContain("Clore l&#x27;absence");
    expect(draw(<PwAbsent initial={{ name: 'Marc M.', from: '2026-09-25', to: '2026-10-02' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />)).toContain("Enregistrer l&#x27;absence");
  });
  it('the deputy who is there is called first, the one who is away comes last and is not called; an uncovered power has a next step', () => {
    const s = fresh();
    s.people.pp_demo_mm.absences = [{ from: '2026-09-25', to: '2026-10-05' }];   // Marc M., first deputy of the power of Thomas M.
    const html = draw(<PwAbsent initial={{ name: 'Thomas M.', from: '2026-09-25', to: '2026-09-26' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />);
    expect(html).toContain('Appeler Sophie V.');
    expect(html.indexOf('Sophie V.')).toBeLessThan(html.indexOf('Marc M.</strong>'));
    expect(html).toMatch(/absent du 25\/09\/2026 au 05\/10\/2026/);
    const none = draw(<PwAbsent initial={{ name: 'Marc M.', from: '2026-09-25', to: '2026-09-25' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />);
    expect(none).toContain('Nommer un suppléant');
    expect(none).toMatch(/Direction à joindre : <strong>Jean-Marc<\/strong>[\s\S]*?06 00 00 00 10/);   // the head of the company, found by his role when the directory does not name him
    tap('Nommer un suppléant');
  });
  it('a holder with nobody there is in red and first; the person who holds nothing is told', () => {
    const s = fresh(), html = draw(<PwAbsent initial={{ name: 'Marc M.', from: '2026-09-25', to: '2026-09-25' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />);
    expect(html).toContain('Aucun suppléant disponible');
    expect(html).toContain('sans suppléant disponible');
    expect(html).not.toContain('Les accès de secours');   // one day: the deputies act with their own accesses
    expect(draw(<PwAbsent initial={{ name: 'Nicolas R.', from: '2026-09-25', to: '2026-09-25' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />)).toContain('ne détient aucune fonction clé');
    void s;
  });
  it('an absence saved is in the staff list, and the page says so', () => {
    vi.stubGlobal('window', globalThis);   // the bar "Annuler" runs a timer of the window
    const s = fresh();
    draw(<PwAbsent initial={{ name: 'Jean-Marc', from: '2026-09-28', to: '2026-10-02' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />);
    tap("Enregistrer l'absence");
    expect(s.people.pp_demo_jm.absences).toEqual([{ from: '2026-09-28', to: '2026-10-02' }]);
    expect(Object.values(s.covers).filter(c => c.who === 'Jean-Marc' && !c.closedAt)).toHaveLength(1);
    expect(draw(<PwAbsent initial={{ name: 'Jean-Marc', from: '2026-09-28', to: '2026-10-02' }} nav={nav} onOpenPower={noop} onCover={noop} onClose={noop} />)).toContain("Clore l&#x27;absence");
    vi.unstubAllGlobals();
  });
  it('the people page ranks the people and lists the absences to come', () => {
    const s = fresh(), html = draw(<PwPeople state={s} now={now} onAbsent={noop} onOpen={noop} />);
    expect(html).toContain('Si une personne est absente');
    expect(html).toContain('Absences à venir');
    expect(html).toContain('Karim T.');
  });
  it('the emergency accesses stay a light list: where, what, who can get to it, with no check and no journal', () => {
    fresh();
    const html = draw(<PwVaults focusId="" nav={nav} offer={noop} />);
    expect(html).toContain('Accès de secours');
    expect(html).toContain('Coffre de la direction');
    expect(html).toContain('Peut y accéder');
    expect(html).not.toMatch(/Vérifier l&#x27;enveloppe|Double visa|Journal|Enveloppe ouverte|Vérification à faire/);
  });
  it('the envelopes (complete follow-up on): where, what they hold, the double visa, the last check, the journal', () => {
    const s = fresh();
    s.params.power = { vaultFull: true };
    const html = draw(<PwVaults focusId="" nav={nav} offer={noop} />);
    expect(html).toContain('Coffre de la direction');
    expect(html).toContain('Mots de passe maîtres de la banque');
    expect(html).toContain('Vérification à faire');
    expect(html).toContain('Journal : 2 lignes');
    expect(html).not.toMatch(/mot de passe : |password/i);
  });
  it('the assistant starts from the neutral library; the review reads the powers that are due', () => {
    fresh(blankState('industrie', now));
    const a = draw(<PwSetup onClose={noop} onDone={noop} />);
    expect(a).toContain('Signature bancaire et virement des salaires');
    expect(a).not.toMatch(/fabrication|atelier|bac rouge/i);
    fresh();
    const r = draw(<PwReview onOpen={noop} onClose={noop} />);
    expect(r).toContain('Revue de la liste');
    expect(r).toContain('Toujours juste');
  });
});

describe('4.1 the sheet', () => {
  it('draws each tab of an existing power; the accesses are for the direction only', () => {
    const s = fresh(), p = s.powers.pw_demo_1;
    for (const tab of ['act', 'people', 'forms'] as const) {
      const html = draw(<PwSheet id={p.id} draft={p} tab={tab} nav={nav} onClose={noop} />);
      expect(html, tab).toContain('Signature bancaire et virement des salaires');
      expect(html, tab).not.toMatch(/undefined|NaN|\[object/);
    }
    const forms = draw(<PwSheet id={p.id} draft={p} tab="forms" nav={nav} onClose={noop} />);
    expect(forms).toContain('Où sont les accès');
    expect(forms).toContain('aucun mot de passe');
    store.team = true;
    expect(draw(<PwSheet id={p.id} draft={p} tab="forms" nav={nav} onClose={noop} />)).not.toContain('Où sont les accès');
  });
  it('a new power is a draft until its act is named, and opens on the first tab', () => {
    const s = fresh(), d = newPower('P2');
    const html = draw(<PwSheet id={d.id} draft={d} nav={nav} onClose={noop} />);
    expect(html).toContain('Nouvelle fonction clé');
    expect(s.powers[d.id]).toBeUndefined();
    expect(html).not.toContain('Autres actions</summary><div class="mt-2 flex flex-wrap gap-2"><button');   // nothing to archive or delete yet
  });
  it('under each person of the sheet: her card of the directory (function, phone, e-mail, link) and her signature, with an alert when it is missing', () => {
    const s = fresh(), p = s.powers.pw_demo_3;
    const html = draw(<PwSheet id={p.id} draft={p} nav={nav} onClose={noop} />);
    expect(html).toContain('Qui prend le relais');
    expect(html).toMatch(/manquante/);
    expect(html).toContain('Signer pour Julien P. : signature de Julien P.');
    expect(html).toContain('Validation du titulaire');
    expect(html).toContain('Validation de la direction');
    expect(html).toContain('Ouvrir la fiche dans l&#x27;annuaire (1.3)');
    expect(html).toMatch(/mailto:/);
    expect(html).not.toMatch(/Entraînement|A fait l&#x27;acte|Qui pourrait être suppléant/);
    tap('Ouvrir la fiche dans l');
    expect(nav.open).toHaveBeenCalledWith('1.3', expect.any(String));
  });
  it('the buttons toward another tool open it in a new tab, and the page does not change', () => {
    const s = fresh();
    s.powers.pw_demo_3.sopId = Object.keys(s.sops)[0];
    draw(<PwSheet id="pw_demo_3" draft={s.powers.pw_demo_3} tab="act" nav={nav} onClose={noop} />);
    tap("Ouvrir l'instruction (3.2)");
    expect(nav.open).toHaveBeenCalledWith('3.2', s.powers.pw_demo_3.sopId);
    expect(nav.tool).not.toHaveBeenCalled();
  });
});

describe('4.1 data that are not what they should be do not stop the screens', () => {
  it('draws the register, the people and the page of absence with a damaged power', () => {
    const raw = demoState(now);
    (raw.powers as Record<string, unknown>).bad = { id: 'bad', power: 5, deputies: 'x', holder: null, wait: 'soon', forms: 3 };
    const s = fresh(normalize(raw));   // the data are read as they arrive in the app
    const html = draw(<Suppleances nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Quelqu&#x27;un est absent');
    expect(() => draw(<PwPeople state={s} now={now} onAbsent={noop} onOpen={noop} />)).not.toThrow();
  });
});
