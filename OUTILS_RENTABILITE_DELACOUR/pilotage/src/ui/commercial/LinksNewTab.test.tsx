// The buttons of tools 2.1, 2.3 and 2.4 that lead to ANOTHER tool open it in a new browser tab: the sheet stays as it is, what it concerns is written first,
// the page is not replaced (nav.tool) and the sheet is not closed. Static render; the click is made on the handler that the render drew (the JSX runtime is
// wrapped to keep the elements that have an onClick), nothing is extracted from the screens.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Complaint, Delivery, Feedback, Quote, State } from '../../domain/types';
import { blankState } from '../../domain/templates';
import { newComplaint, newFeedback, newQuote } from '../../domain/commercial';
import { newDelivery } from '../../domain/receptions';
import { ComplaintSheet } from './Reclamations';
import { QuoteSheet } from './Devis';
import { FeedbackSheet } from './BilanFin';
import { ClientSheet } from './BilanClients';

const seen = vi.hoisted(() => ({ els: [] as { children: unknown; onClick(e?: unknown): void }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onClick?: unknown; children?: unknown } | null, ...rest: unknown[]) => { if (typeof props?.onClick === 'function') seen.els.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({
  // the stub writes into the state like the store does: the next render, and the other tab, read what was written
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: 'Test', storageFull: false, teamView: false, folder: { status: 'none' } }),
}));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{children}{footer}</section> }));

const now = new Date(2026, 8, 25, 10, 0);
const text = (n: unknown): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : '');
const nav = { tool: vi.fn(), open: vi.fn(), openAction: vi.fn(), newAction: vi.fn(), openRisk: vi.fn(), settings: vi.fn() };
const onClose = vi.fn();
const NEW_TAB = 's&#x27;ouvre dans un nouvel onglet';
const fresh = (): State => (store.state = blankState('industrie', now)) as State;
// draws the screen, then taps the first button whose label starts with `label`
const draw = (el: React.ReactElement) => { seen.els.length = 0; return renderToStaticMarkup(el); };
const tap = (label: string) => { const b = seen.els.find(x => text(x.children).startsWith(label)); if (!b) throw new Error(`no button "${label}" among ${seen.els.map(x => text(x.children)).filter(Boolean).join(' | ')}`); b.onClick({ stopPropagation() {} }); };
const noLeave = () => { expect(nav.tool).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled(); };
const order = (s: State, id: string, over: Partial<Delivery>): Delivery => (s.deliveries[id] = { ...newDelivery(s.params), id, ref: id.toUpperCase(), client: 'Client A', item: `Pièce ${id}`, qty: 4, ...over });

beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:', pathname: '/pilotage.html', search: '', hash: '' }, matchMedia: () => ({ matches: false }) }); });
beforeEach(() => { Object.values(nav).forEach(f => f.mockClear()); onClose.mockClear(); });

describe('2.1 the won quote leads to its order in 3.4, in a new tab', () => {
  const won = (s: State, over: Partial<Quote> = {}): Quote => ({ ...newQuote(s, now), client: 'Client A', status: 'won', ...over });
  it('writes the quote, opens "the order from this quote" in 3.4 and leaves the sheet open', () => {
    const s = fresh(), q = won(s);
    const h = draw(<QuoteSheet initial={q} onClose={onClose} nav={nav} />);
    expect(h).toContain('Suivre la commande');
    expect(h).toContain(NEW_TAB);
    tap('Suivre la commande');
    expect(s.quotes[q.id]).toBeDefined();                                     // written before: the other tab reads it
    expect(nav.open).toHaveBeenCalledTimes(1);
    expect(nav.open).toHaveBeenCalledWith('3.4', `new:quote:${q.id}`);
    noLeave();
  });
  it('opens the order already followed', () => {
    const s = fresh(), q = won(s);
    order(s, 'a', { quoteId: q.id });
    draw(<QuoteSheet initial={q} onClose={onClose} nav={nav} />);
    tap('Voir la commande');
    expect(nav.open).toHaveBeenCalledWith('3.4', 'a');
    noLeave();
  });
  it('goes nowhere while the customer is not typed', () => {
    const s = fresh(), q = won(s, { client: '' });
    draw(<QuoteSheet initial={q} onClose={onClose} nav={nav} />);
    tap('Suivre la commande');
    expect(nav.open).not.toHaveBeenCalled();
    expect(s.quotes[q.id]).toBeUndefined();
  });
});

describe('2.4 the review sheet opens the other tools in a new tab', () => {
  const review = (over: Partial<Feedback> = {}): Feedback => ({ ...newFeedback(now), client: 'Client A', contact: 'M. Durand', q1: false, q2: true, q3: 9, date: '2026-09-10', channel: 'tel', ...over });
  it('opens the PV of the delivery (3.4) after writing the review', () => {
    const s = fresh(); order(s, 'a', {});
    const f = review({ deliveryId: 'a' });
    const h = draw(<FeedbackSheet initial={f} onClose={onClose} nav={nav} />);
    expect(h).toContain(NEW_TAB);
    tap('PV de réception');
    expect(s.feedbacks[f.id]).toBeDefined();
    expect(nav.open).toHaveBeenCalledWith('3.4', 'a');
    noLeave();
  });
  it('opens the customer of the directory (1.3)', () => {
    const s = fresh();
    s.orgs.o = { id: 'o', name: 'Client A', category: 'client', phone: '04 00 00 00 00', email: '', address: '', reference: '' };
    const f = review({ orgId: 'o' });
    draw(<FeedbackSheet initial={f} onClose={onClose} nav={nav} />);
    tap('Ouvrir');
    expect(nav.open).toHaveBeenCalledWith('1.3', 'org:Client A');
    expect(s.feedbacks[f.id]).toBeDefined();
    noLeave();
  });
  it('records the complaint (2.3), writes its number on the review and opens it in a new tab', () => {
    const s = fresh(), f = review();
    draw(<FeedbackSheet initial={f} onClose={onClose} nav={nav} />);
    tap('enregistrer une réclamation (2.3)');
    const c = Object.values(s.complaints);
    expect(c).toHaveLength(1);
    expect(s.feedbacks[f.id].complaintId).toBe(c[0].id);
    expect(nav.open).toHaveBeenCalledWith('2.3', c[0].id);
    noLeave();
  });
  it('opens the complaint that already exists', () => {
    const s = fresh(), cp = (s.complaints.k = { ...newComplaint(s, 'Test', now), id: 'k', client: 'Client A', description: 'Retard' });
    const f = review({ complaintId: cp.id });
    draw(<FeedbackSheet initial={f} onClose={onClose} nav={nav} />);
    tap('voir la réclamation');
    expect(nav.open).toHaveBeenCalledWith('2.3', 'k');
    noLeave();
  });
});

describe('2.3 the complaint sheet opens the other tools in a new tab', () => {
  const claim = (over: Partial<Complaint> = {}): Complaint => ({ ...newComplaint(fresh(), 'Test', now), client: 'Client A', description: 'Rayure', verdict: 'fondee', processId: 'P3', ...over });
  it('makes the red-bin sheet (5.1), opens it, and keeps its link on the sheet', () => {
    const c = claim(), s = store.state as State;
    const h = draw(<ComplaintSheet initial={c} onClose={onClose} nav={nav} />);
    expect(h).toContain('Isoler les pièces défectueuses (bac rouge 5.1)');
    expect(h).toContain(NEW_TAB);
    tap('Isoler les pièces défectueuses');
    const [nc] = Object.values(s.ncs);
    expect(nc).toBeDefined();
    expect(s.complaints[c.id].ncId).toBe(nc.id);
    expect(nav.open).toHaveBeenCalledTimes(1);
    expect(nav.open).toHaveBeenCalledWith('5.1', nc.id);
    noLeave();
  });
  it('opens the red-bin sheet that already exists', () => {
    const c = claim(), s = store.state as State;
    s.ncs.n1 = { id: 'n1', ref: 'NC-1' } as never;
    draw(<ComplaintSheet initial={{ ...c, ncId: 'n1' }} onClose={onClose} nav={nav} />);
    tap('Fiche du bac rouge');
    expect(nav.open).toHaveBeenCalledWith('5.1', 'n1');
    noLeave();
  });
  it('makes the 5 Pourquoi workshop (5.3) and opens it', () => {
    const c = claim(), s = store.state as State;
    draw(<ComplaintSheet initial={c} onClose={onClose} nav={nav} />);
    tap('Chercher la cause');
    const [an] = Object.values(s.analyses);
    expect(an).toBeDefined();
    expect(s.complaints[c.id].analysisId).toBe(an.id);
    expect(nav.open).toHaveBeenCalledWith('5.3', an.id);
    noLeave();
  });
  it('opens the review the complaint was born from (2.4)', () => {
    const c = claim(), s = store.state as State;
    s.feedbacks.fb = { ...newFeedback(now), id: 'fb', client: 'Client A', complaintId: c.id };
    draw(<ComplaintSheet initial={c} onClose={onClose} nav={nav} />);
    tap('ouvrir le bilan (2.4)');
    expect(s.complaints[c.id]).toBeDefined();
    expect(nav.open).toHaveBeenCalledWith('2.4', 'fb');
    noLeave();
  });
  it('keeps the creation of an action in a window over the sheet (nav.newAction)', () => {
    const c = claim();
    draw(<ComplaintSheet initial={c} onClose={onClose} nav={nav} />);
    tap("Créer l'action corrective");
    expect(nav.newAction).toHaveBeenCalledTimes(1);
    expect(nav.open).not.toHaveBeenCalled();
  });
});

describe('2.4 the customer sheet opens the directory (1.3) in a new tab', () => {
  it('without closing the sheet', () => {
    const s = fresh();
    s.orgs.o = { id: 'o', name: 'Client A SAS', category: 'client', phone: '04 00 00 00 00', email: '', address: '', reference: '' };
    s.feedbacks.f = { ...newFeedback(now), id: 'f', client: 'Client A', contact: 'M. Durand', q1: true, q2: true, q3: 9, date: '2026-09-10', orgId: 'o' };
    const h = draw(<ClientSheet name="Client A" nav={nav} onClose={onClose} onOpenFeedback={() => {}} onNew={() => {}} />);
    expect(h).toContain(NEW_TAB);
    tap("Ouvrir dans l'annuaire");
    expect(nav.open).toHaveBeenCalledWith('1.3', 'org:Client A SAS');
    noLeave();
  });
});
