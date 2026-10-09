// Tools 3.1, 3.2 and 3.4: a button that leads to ANOTHER tool opens it in a new tab (`nav.open`), the sheet or the full screen where we were stays open (no `onClose`, no `nav.tool`),
// and what the other tab must read is written first. No jsdom in this repository: a component is called inside a render, the tree it returns is searched for the button by its
// label (the components under it are called too), and the handler is run as the tap would run it.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';
import { demoState } from '../../domain/templates';
import { isoDate } from '../../domain/periods';
import type { Delivery, State } from '../../domain/types';
import { ClaimSheet } from './ClaimSheet';
import { Receptions } from './Receptions';
import { RcMilestone } from './RcMilestone';
import { SupplierSheet } from './SupplierSheet';
import { SopStation } from './SopStation';
import { RcReserves } from './RcReserves';
import { RcTabFollow } from './RcTabFollow';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabReception } from './RcTabReception';
import { RcTabRelease } from './RcTabRelease';
import { RcReception } from './RcReception';
import { PvPrintButton } from './RcPv';
import { allReservesOf } from '../../domain/receptions';
import { plain } from './testPlain';

const h = vi.hoisted(() => ({ state: null as unknown, update: vi.fn(), first: new Map<string, unknown>(), teamView: false }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: h.update, author: 'Test', storageFull: false, storageNear: false, storageChars: 0, teamView: h.teamView, folder: { status: 'none' } }) }));
// the first `useState(initial)` called with a given initial value (a number, or the name of the function that gives it) starts on the value set here: a full screen opens on its first slide, the tap is on a later one
vi.mock('react', async orig => {
  const r = await orig<typeof import('react')>();
  return { ...r, useState: (init: unknown) => { const key = typeof init === 'number' ? String(init) : typeof init === 'function' ? init.name : '', has = h.first.has(key), v = h.first.get(key); h.first.delete(key); return r.useState(has ? v : init as never); } };
});

type El = ReactElement<{ children?: ReactNode; footer?: ReactNode; onClick?: () => void; 'aria-label'?: string }>;
const isEl = (n: unknown): n is El => typeof n === 'object' && n !== null && 'props' in n && 'type' in n;
const words = (n: ReactNode): string => (Array.isArray(n) ? n.map(words).join('') : typeof n === 'string' || typeof n === 'number' ? String(n) : isEl(n) ? words(n.props.children) : '');
// the first element that has a handler and says `text` (in its words or in its aria-label)
function find(n: ReactNode, text: string): El | undefined {
  if (Array.isArray(n)) { for (const c of n) { const f = find(c, text); if (f) return f; } return undefined; }
  if (!isEl(n)) return undefined;
  const p = n.props;
  if (p.onClick && (words(p.children).includes(text) || p['aria-label']?.includes(text))) return n;
  const inside = find(p.children, text) ?? find(p.footer, text);
  if (inside || typeof n.type !== 'function' || n.type.prototype?.isReactComponent) return inside;
  try { return find((n.type as (q: unknown) => ReactNode)(p), text); } catch { return undefined; }   // a function component is called to look inside it
}
// the handler of the button, found inside a render (the hooks of the components run there), then run outside it
function tap(render: () => ReactNode, text: string): void {
  let on: (() => void) | undefined;
  const Grab = () => { on = find(render(), text)?.props.onClick; return null; };
  renderToStaticMarkup(<Grab />);
  expect(on, `a button "${text}"`).toBeTypeOf('function');
  on!();
}
const html = (n: ReactNode) => plain(renderToStaticMarkup(<>{n}</>).replace(/&#x27;/g, "'"));
const NEW_TAB = "(s'ouvre dans un nouvel onglet)";

const noop = () => {};
let nav: { tool: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn>; openAction: () => void; newAction: () => void; openRisk: () => void; settings: () => void };
let onClose: ReturnType<typeof vi.fn>;
let state: State;
// the other tab opens, the page stays, the window stays
const opened = (id: string, focus?: string) => {
  expect(nav.open).toHaveBeenCalledTimes(1);
  expect(nav.open).toHaveBeenCalledWith(...(focus === undefined ? [id] : [id, focus]));
  expect(nav.tool).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
};
// what the record held in the window says in the store once the updater runs
const written = () => { const copy = structuredClone(state); h.update.mock.calls.forEach(([f]) => f(copy)); return copy; };

beforeAll(() => {
  vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, matchMedia: () => ({ matches: false }), sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop }, setTimeout: () => 0, clearTimeout: noop });   // the timers: the bar "Annuler" of a move that can be taken back
  vi.stubGlobal('document', { body: {}, addEventListener: noop, removeEventListener: noop });
});
beforeEach(() => {
  state = demoState(new Date(2026, 8, 25, 10, 0));
  h.state = state; h.update.mockReset(); h.first.clear(); h.teamView = false;
  nav = { tool: vi.fn(), open: vi.fn(), openAction: noop, newAction: noop, openRisk: noop, settings: noop };
  onClose = vi.fn();
});

describe('3.1 the claim to a supplier: the other tools open in a new tab', () => {
  const sheet = (id = 'deb_demo_3') => <ClaimSheet initial={state.debits[id]} onClose={onClose} nav={nav} />;
  it('"Fiche du bac rouge": the claim is written, the defect opens in 5.1, the sheet stays', () => {
    const d = state.debits.deb_demo_3;
    expect(html(sheet())).toContain(plain(`Fiche du bac rouge ${state.ncs[d.ncId!].ref}`));
    expect(html(sheet())).toContain(plain(NEW_TAB));
    tap(() => ClaimSheet({ initial: d, onClose, nav }), 'Fiche du bac rouge');
    opened('5.1', d.ncId);
    expect(written().debits[d.id].id).toBe(d.id);
    expect(h.update.mock.invocationCallOrder[0]).toBeLessThan(nav.open.mock.invocationCallOrder[0]);   // written first: the other tab reads it
  });
  it('"Annuaire": the supplier opens in 1.3 with the claim written', () => {
    const d = state.debits.deb_demo_3;
    tap(() => ClaimSheet({ initial: d, onClose, nav }), 'Annuaire');
    opened('1.3', `org:${state.suppliers[d.supplierId].name}`);
    expect(h.update).toHaveBeenCalledTimes(1);
  });
});

describe('3.1 the sheet of a supplier: the directory opens in a new tab', () => {
  // an existing supplier whose sheet opens on the "Fiche" tab (a sheet opens there when the name is empty); its id is in the store
  const bare = () => { const x = { ...state.suppliers.sup_demo_acier, name: '' }; state.suppliers[x.id] = x; return x; };
  it.each(['Modifier dans l\'annuaire', 'Ajouter une personne dans l\'annuaire'])('"%s": the supplier is written, 1.3 opens, the sheet stays', label => {
    const x = bare();
    expect(html(<SupplierSheet initial={x} onClose={onClose} nav={nav} onClaim={noop} />)).toContain(plain(NEW_TAB));
    tap(() => SupplierSheet({ initial: x, onClose, nav, onClaim: noop }), label);
    expect(nav.open).toHaveBeenCalledTimes(1);
    expect(nav.open).toHaveBeenCalledWith('1.3', 'org:');
    expect(nav.tool).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(written().suppliers[x.id]).toEqual(x);
  });
});

describe('3.2 the full screen at the workstation: the defect opens in a new tab and the screen stays', () => {
  const sop = () => state.sops.sop_demo_1;   // 4 steps, the good gesture, the limits, "if it goes wrong": a slide of each
  const station = () => SopStation({ sop: sop(), onClose, nav });
  // the slides in order, each as the screen would draw it (the first useState(0) of the screen is the slide)
  const slides = () => {
    const out: string[] = [];
    for (let i = 0; i < 20; i++) {
      h.first.set('0', i);
      try { out.push(html(<SopStation sop={sop()} onClose={onClose} nav={nav} />)); } catch { break; }
    }
    h.first.clear();
    return out;
  };
  it.each([['Défaut sur cette étape', ':0'], ['Déclarer un défaut (bac rouge)', ''], ['Déclarer un défaut', '']])('"%s" (the slide that says it)', (label, step) => {
    const all = slides(), at = label === 'Déclarer un défaut' ? all.length - 1 : all.findIndex(x => x.includes(label));   // the last slide is "read and understood"
    expect(at).toBeGreaterThan(0);
    expect(all[at]).toContain(plain(label));
    expect(all[at]).toContain(plain(NEW_TAB));
    h.first.set('0', at);
    tap(station, label);
    opened('5.1', `new:sop:${sop().id}${step}`);
  });
});

describe('3.4 the tabs of the sheet of an order: the other tools open in a new tab', () => {
  const props = (d: Delivery) => ({ d, saved: state.deliveries[d.id], set: noop, act: noop, state, nav, close: onClose });
  it('Suites: the review of 2.4, the customer and the directory', () => {
    const d = state.deliveries.dl_demo_1;
    expect(html(<RcTabFollow {...props(d)} />)).toContain(plain(NEW_TAB));
    tap(() => RcTabFollow(props(d)), 'Ouvrir la fiche client (2.4)');
    opened('2.4', `client:${d.client}`);
  });
  it('Suites: "Poser les 3 questions au client" writes the review, then opens it', () => {
    const d = { ...state.deliveries.dl_demo_1, id: 'dl_new_fb' };
    state.deliveries[d.id] = d;
    h.state = state;
    tap(() => RcTabFollow({ ...props(d), saved: d }), 'Poser les 3 questions');
    expect(nav.open).toHaveBeenCalledTimes(1);
    expect(nav.open.mock.calls[0][0]).toBe('2.4');
    expect(nav.tool).not.toHaveBeenCalled();
    expect(Object.values(written().feedbacks).some(f => f.id === nav.open.mock.calls[0][1] && f.deliveryId === d.id)).toBe(true);
  });
  it('Suites, Libération, Jalons: the defect of an order opens in 5.1', () => {
    const d = state.deliveries.dl_demo_4, nc = d.milestones.find(m => m.ncId)!.ncId!;
    tap(() => RcTabFollow(props(d)), 'Ouvrir le défaut');
    opened('5.1', nc);
    nav.open.mockClear();
    tap(() => RcTabMilestones(props(d)), 'Ouvrir le défaut');
    opened('5.1', nc);
    nav.open.mockClear();
    const open = { ...d, milestones: d.milestones.map(m => (m.ncId ? { ...m, ncId: m.ncId } : m)) };
    state.ncs[nc] = { ...state.ncs[nc], decision: 'attente' };
    tap(() => RcTabRelease(props(open)), 'Ouvrir le défaut');
    opened('5.1', nc);
  });
  it('Jalons: the work instruction of the workstation opens in 3.2', () => {
    const d = state.deliveries.dl_demo_5, sop = d.milestones.find(m => m.sopId)!.sopId!;
    tap(() => RcTabMilestones(props(d)), 'Ouvrir l\'instruction');
    opened('3.2', `station:${sop}`);
  });
  it('Réception: the receptionist\'s card opens in the directory', () => {
    const d: Delivery = { ...state.deliveries.dl_demo_1 }, c = Object.values(state.contacts)[0];
    d.reception = { ...d.reception, contactId: c.id };
    tap(() => RcTabReception(props(d)), 'Ouvrir dans l\'annuaire');
    opened('1.3', c.id);
  });
  it('Réserves: the defect of a reservation and the workshop of the 5 whys open in new tabs', () => {
    const day = isoDate(new Date()), rv = { id: 'rv_t', text: 'Retouche de peinture', raisedAt: day, ncId: 'nc_demo_4' }, d = structuredClone(state.deliveries.dl_demo_13), other = structuredClone(state.deliveries.dl_demo_1);
    d.lots![0].reception = { ...d.lots![0].reception, date: day, result: 'reserve', refusal: undefined, reserves: [rv] };
    other.reception = { ...other.reception, reserves: [{ ...rv, id: 'rv_u', ncId: undefined }] };   // the same reservation on another order: the 5 whys are offered
    const st = { ...state, deliveries: { ...state.deliveries, [d.id]: d, [other.id]: other } };
    expect(html(<RcReserves d={d} act={noop} state={st} nav={nav} />)).toContain(plain(NEW_TAB));
    tap(() => RcReserves({ d, act: noop, state: st, nav }), 'Ouvrir le défaut');
    opened('5.1', 'nc_demo_4');
    nav.open.mockClear();
    tap(() => RcReserves({ d, act: noop, state: st, nav }), 'Ouvrir un atelier 5 Pourquoi');
    opened('5.3', 'new:nc:nc_demo_4');   // the workshop opens on the defect of the reservation
    nav.open.mockClear();
    tap(() => RcReserves({ d: other, act: noop, state: st, nav }), 'Ouvrir un atelier 5 Pourquoi');
    opened('5.3');   // a reservation without a defect: the workshops
    nav.open.mockClear();
    const gone = { ...st, ncs: Object.fromEntries(Object.entries(st.ncs).filter(([id]) => id !== 'nc_demo_4')) };
    tap(() => RcReserves({ d, act: noop, state: gone, nav }), 'Ouvrir un atelier 5 Pourquoi');
    opened('5.3');   // the defect is no longer in 5.1: nothing to open the workshop on
  });
  it('the jumps inside the tool 3.4 stay on nav.tool (same tool, same record)', () => {
    const d = state.deliveries.dl_demo_5;
    tap(() => RcTabMilestones({ ...props(d), full: undefined }), 'Contrôler en grand écran');
    expect(nav.tool).toHaveBeenCalledWith('3.4', `jalon:${d.id}`);
    expect(nav.open).not.toHaveBeenCalled();
  });
});

describe('3.4 the checks of an order full screen: the defect and the work instruction open in new tabs, the screen stays', () => {
  // the first useState(0) of the screen is the step: 0 is "who checks", then one step per milestone
  const screen = (id: string, step: number) => { h.first.set('0', step); return RcMilestone({ id, onClose, nav }); };
  it('"Ouvrir le défaut" on a milestone that has one', () => {
    const d = state.deliveries.dl_demo_4, i = d.milestones.findIndex(m => m.ncId);
    h.first.set('0', i + 1);
    const out = html(<RcMilestone id={d.id} onClose={onClose} nav={nav} />);
    expect(out).toContain(plain('Ouvrir le défaut'));
    expect(out).toContain(plain(NEW_TAB));
    tap(() => screen(d.id, i + 1), 'Ouvrir le défaut');
    opened('5.1', d.milestones[i].ncId);
  });
  it('"Ouvrir l\'instruction du poste" on a milestone whose workstation has an instruction', () => {
    const d = state.deliveries.dl_demo_5, i = d.milestones.findIndex(m => m.sopId);
    tap(() => screen(d.id, i + 1), "Ouvrir l'instruction du poste");
    opened('3.2', `station:${d.milestones[i].sopId}`);
  });
});

describe('3.4 the page of the orders: the customer opens in the directory in a new tab', () => {
  it('"Annuaire" on a line of the customers view', () => {
    const clients = () => h.first.set('defaultView', 'clients');   // the page opens on the cards: this one on the customers
    clients();
    expect(html(<Receptions nav={nav} focus="" clearFocus={noop} />)).toContain(plain(NEW_TAB));
    tap(() => { clients(); return Receptions({ nav, focus: '', clearFocus: noop }); }, "dans l'annuaire (nouvel onglet)");   // the aria-label says it too
    expect(nav.open).toHaveBeenCalledTimes(1);
    expect(nav.open.mock.calls[0][0]).toBe('1.3');
    expect(nav.open.mock.calls[0][1]).toMatch(/^org:/);
    expect(nav.tool).not.toHaveBeenCalled();
  });
});

// Lot 5: the links of the screens with the other tools (a defect deleted in 5.1, the customer renamed in 1.3, the review of 2.4, the breakdowns of 3.3, the quotes of 2.1, the PV printed from the sheet)
describe('lot 5, the screens of the links', () => {
  const props = (d: Delivery, st: State = state) => ({ d, saved: d, set: noop, act: noop, state: st, nav, close: onClose });
  const without = (id: string) => { const x = structuredClone(state); delete x.ncs[id]; return x; };
  const writtenOn = (x: State) => { const copy = structuredClone(x); h.update.mock.calls.forEach(([f]) => f(copy)); return copy; };

  it('a milestone whose defect is gone from 5.1 says it and declares it again (sheet), the release says it too', () => {
    const d = state.deliveries.dl_demo_4, i = d.milestones.findIndex(m => m.ncId), old = d.milestones[i].ncId!, gone = without(old);
    const out = html(<RcTabMilestones {...props(d, gone)} />);
    expect(out).toContain(plain('Défaut lié introuvable dans 5.1.'));
    expect(out).toContain(plain('Déclarer à nouveau'));
    expect(out).not.toContain(plain("fiche introuvable"));
    expect(html(<RcTabRelease {...props(d, gone)} />)).toContain(plain('défaut lié introuvable dans 5.1'));
    let after: Delivery | undefined;
    const draft = structuredClone(gone);
    tap(() => RcTabMilestones({ ...props(d, gone), act: f => { after = f(d, 'Test', draft); } }), 'Déclarer à nouveau');
    const now = after!.milestones[i].ncId!;
    expect(now).not.toBe(old);
    expect(draft.ncs[now]).toBeDefined();
    expect(after!.journal!.at(-1)!.text).toContain(plain('à nouveau'));
  });
  it('a milestone whose defect is gone from 5.1 says it and declares it again (full screen)', () => {
    const d = state.deliveries.dl_demo_4, i = d.milestones.findIndex(m => m.ncId), gone = without(d.milestones[i].ncId!);
    h.state = gone; h.first.set('0', i + 1);
    const out = html(<RcMilestone id={d.id} onClose={onClose} nav={nav} />);
    expect(out).toContain(plain('Défaut lié introuvable dans 5.1.'));
    expect(out).toContain(plain('Déclarer à nouveau'));
    h.first.set('0', i + 1);
    tap(() => RcMilestone({ id: d.id, onClose, nav }), 'Déclarer à nouveau');
    const after = writtenOn(gone), ncId = after.deliveries[d.id].milestones[i].ncId!;
    expect(ncId).not.toBe(d.milestones[i].ncId);
    expect(after.ncs[ncId]).toBeDefined();
  });
  it('a reservation whose defect is gone from 5.1 says it and declares it again; the workshop opens on the defect that exists', () => {
    const d = structuredClone(state.deliveries.dl_demo_3);
    d.reception.reserves![0] = { ...d.reception.reserves![0], ncId: 'nc_gone' };
    const out = html(<RcReserves d={d} act={noop} state={state} nav={nav} />);
    expect(out).toContain(plain('Défaut lié introuvable dans 5.1.'));
    expect(out).toContain(plain('Déclarer à nouveau'));
    let after: Delivery | undefined;
    const draft = structuredClone(state);
    tap(() => RcReserves({ d, act: f => { after = f(d, 'Test', draft); }, state, nav }), 'Déclarer à nouveau');
    const nc = allReservesOf(after!)[0].ncId!;
    expect(nc).not.toBe('nc_gone');
    expect(draft.ncs[nc].reserveId).toBe(d.reception.reserves![0].id);
    expect(after!.journal!.at(-1)!.text).toContain(plain("n'existe plus dans 5.1"));
  });

  it('Suites: the 3 questions are offered once the order is received, the breakdowns of 3.3 are told, one link opens the equipment', () => {
    const before = state.deliveries.dl_demo_4, got = state.deliveries.dl_demo_3;
    expect(html(<RcTabFollow {...props(before)} />)).not.toContain(plain('Poser les 3 questions'));
    expect(html(<RcTabFollow {...props(before)} />)).toContain(plain('Les 3 questions se posent une fois la commande reçue'));
    expect(html(<RcTabFollow {...props(got)} />)).toContain(plain('Poser les 3 questions'));
    const d = state.deliveries.dl_demo_5, out = html(<RcTabFollow {...props(d)} />);
    expect(out).toContain(plain("Panne de Centre d'usinage CNC 5 axes"));
    expect(out).toContain(plain('qui a touché cette commande'));
    expect(html(<RcTabFollow {...props(before)} />)).not.toContain(plain('Panne de'));
    tap(() => RcTabFollow(props(d)), 'Ouvrir dans 3.3');
    opened('3.3', 'eq_demo_cnc:issues');
  });
  it('Suites: "Ajouter à l\'annuaire" says the organisation and the people, and is never offered to a customer whose organisation the order holds', () => {
    const x = structuredClone(state), d = { ...x.deliveries.dl_demo_7, client: 'Menuiserie Roche', orgId: undefined };
    ['fb_demo_3', 'fb_demo_4'].forEach((id, i) => { x.feedbacks[id] = { ...x.feedbacks[id], client: 'Menuiserie Roche', contact: `Personne ${i}` }; });
    expect(html(<RcTabFollow {...props(d, x)} />)).toContain(plain("Ajouter à l'annuaire : l'organisation et 2 personnes interrogées"));
    // the organisation was renamed in 1.3 and the order still holds it: found by its link, nothing to add
    const r = structuredClone(state), o = { ...r.deliveries.dl_demo_1, client: 'Ancien nom du client' };
    r.orgs.org_demo_clientA = { ...r.orgs.org_demo_clientA, name: 'Client A SAS' };
    const out = html(<RcTabFollow {...props(o, r)} />);
    expect(out).not.toContain(plain("Ajouter à l'annuaire"));
    expect(out).toContain(plain("Ouvrir dans l'annuaire"));
    tap(() => RcTabFollow(props(o, r)), "Ouvrir dans l'annuaire");
    opened('1.3', 'org:Client A SAS');
  });
  it('the PV window of the sheet prints the PV as the last step of the reception does', () => {
    expect(html(<PvPrintButton d={state.deliveries.dl_demo_1} state={state} />)).toContain(plain('Imprimer le PV'));
  });
  it('Réception: the person linked is gone from the directory, "Autre, précisez" and the typed name stay; no customer, no list of the people of others', () => {
    const x = structuredClone(state), d = x.deliveries.dl_demo_13, card = d.reception.contactId!;
    h.state = x;
    const known = html(<RcReception id={d.id} onClose={onClose} nav={nav} />);
    expect(known).toContain(plain("Voir tout l'annuaire"));          // three names at first, the whole directory of the customer behind a button
    expect(known).not.toContain(plain('Directeur technique'));       // a contact that is neither the last one nor the buyer is behind the button
    delete x.contacts[card];
    const gone = html(<RcReception id={d.id} onClose={onClose} nav={nav} />);
    expect(gone).toContain(plain('Autre, précisez'));
    expect(gone).toContain(plain('aria-label="Nom de la personne qui réceptionne"'));
    expect(gone).toContain(plain('value="Acheteur"'));
    x.deliveries[d.id] = { ...d, client: '', orgId: undefined, reception: { ...d.reception, contactId: '', name: '', orgId: undefined } };
    const none = html(<RcReception id={d.id} onClose={onClose} nav={nav} />);
    expect(none).not.toContain(plain('Directeur technique'));
    expect(none).not.toContain(plain('Durand'));
  });

  it('the register: "Pas de suivi" sets a won quote aside and takes it back; "Retirer l\'exemple" follows the right to delete', () => {
    const x = structuredClone(state), today = new Date().toISOString().slice(0, 10);
    delete x.deliveries.dl_demo_5.quoteId;
    x.quotes.qt_demo_6 = { ...x.quotes.qt_demo_6, decidedAt: today, date: today };
    h.state = x;
    expect(html(<Receptions nav={nav} focus="" clearFocus={noop} />)).toContain(plain('Pas de suivi pour le devis DEV-2026-006'));
    tap(() => Receptions({ nav, focus: '', clearFocus: noop }), 'Pas de suivi');
    expect(writtenOn(x).params.reception!.skippedQuotes).toEqual(['qt_demo_6']);
    x.params.reception = { skippedQuotes: ['qt_demo_6'] };
    expect(html(<Receptions nav={nav} focus="" clearFocus={noop} />)).not.toContain(plain('Pas de suivi pour le devis'));
    // removing the example is deleting: in team view only with the right to delete
    h.teamView = true;
    expect(html(<Receptions nav={nav} focus="" clearFocus={noop} />)).not.toContain(plain("Retirer l'exemple"));
    x.params.teamCanDelete = true;
    expect(html(<Receptions nav={nav} focus="" clearFocus={noop} />)).toContain(plain("Retirer l'exemple"));
  });
});
