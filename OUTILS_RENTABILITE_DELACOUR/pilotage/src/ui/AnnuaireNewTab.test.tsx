// The directory (1.3): its buttons to the other tools (supplier sheet 3.1, quotes 2.1, orders 3.4, reviews 2.4, complaints 2.3, versatility 4.2, deputies 4.1) open the tool
// in a new browser tab and do not replace the page. Static render; the click is made on the handler that the render drew (the JSX runtime is wrapped to keep the
// elements that have an onClick), nothing is extracted from the screens.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Contact, State } from '../domain/types';
import { blankState } from '../domain/templates';
import { newComplaint, newFeedback, newQuote } from '../domain/commercial';
import { newDelivery } from '../domain/receptions';
import { newSupplier } from '../domain/suppliers';
import { ContactSheet, OrgLinks, SupplierCard } from './Annuaire';

const seen = vi.hoisted(() => ({ els: [] as { children: unknown; onClick(e?: unknown): void }[] }));
vi.mock('react/jsx-dev-runtime', async orig => {
  const m = await orig<typeof import('react/jsx-dev-runtime')>();
  return { ...m, jsxDEV: (type: unknown, props: { onClick?: unknown; children?: unknown } | null, ...rest: unknown[]) => { if (typeof props?.onClick === 'function') seen.els.push(props as never); return (m.jsxDEV as (...a: unknown[]) => unknown)(type, props, ...rest); } };
});
const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../store/StoreContext', () => ({
  // the stub writes into the state like the store does
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: 'Test', teamView: false, folder: { status: 'none' } }),
}));
vi.mock('./common', async orig => ({ ...(await orig<typeof import('./common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{children}{footer}</section> }));

const now = new Date(2026, 8, 25, 10, 0);
const text = (n: unknown): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : '');
const nav = { tool: vi.fn(), open: vi.fn(), openAction: vi.fn(), newAction: vi.fn(), openRisk: vi.fn(), settings: vi.fn() };
const NEW_TAB = 's&#x27;ouvre dans un nouvel onglet';
const fresh = (): State => (store.state = blankState('industrie', now)) as State;
const draw = (el: React.ReactElement) => { seen.els.length = 0; return renderToStaticMarkup(el); };
const tap = (label: string) => { const b = seen.els.find(x => text(x.children).startsWith(label)); if (!b) throw new Error(`no button "${label}" among ${seen.els.map(x => text(x.children)).filter(Boolean).join(' | ')}`); b.onClick({ stopPropagation() {} }); };
beforeEach(() => { Object.values(nav).forEach(f => f.mockClear()); });

describe('1.3 the links of an organisation open the other tools in a new tab', () => {
  it('a customer: its quotes (2.1), its orders (3.4), its reviews (2.4), its complaints (2.3)', () => {
    const s = fresh();
    const q = (s.quotes.q = { ...newQuote(s, now), id: 'q', client: 'Client A' });
    s.deliveries.d = { ...newDelivery(s.params), id: 'd', ref: 'D', client: 'Client A', item: 'Pièce', qty: 1 };
    s.feedbacks.f = { ...newFeedback(now), id: 'f', client: 'Client A', q1: true, q2: true, q3: 9 };
    const c = (s.complaints.c = { ...newComplaint(s, 'Test', now), id: 'c', client: 'Client A', description: 'Retard' });
    const h = draw(<OrgLinks state={s} company="Client A" category="client" nav={nav} />);
    expect(h.split(NEW_TAB)).toHaveLength(5);                                     // one icon with its words per button
    tap('1 devis'); expect(nav.open).toHaveBeenLastCalledWith('2.1', q.id);
    tap('1 en cours'); expect(nav.open).toHaveBeenLastCalledWith('3.4', 'client:Client A');
    tap('1 bilan'); expect(nav.open).toHaveBeenLastCalledWith('2.4', 'client:Client A');
    tap('1 réclamation'); expect(nav.open).toHaveBeenLastCalledWith('2.3', c.id);
    expect(nav.open).toHaveBeenCalledTimes(4);
    expect(nav.tool).not.toHaveBeenCalled();
  });
  it('a supplier already followed: its sheet (3.1)', () => {
    const s = fresh();
    s.suppliers.sup = { ...newSupplier(), id: 'sup', name: 'Fournisseur Z' };
    const h = draw(<OrgLinks state={s} company="Fournisseur Z" category="fournisseur" nav={nav} />);
    expect(h).toContain(NEW_TAB);
    tap('Fiche fournisseur (3.1)');
    expect(nav.open).toHaveBeenCalledWith('3.1', 'sup');
    expect(nav.tool).not.toHaveBeenCalled();
  });
  it('a supplier not yet followed: follows it (written first), then opens its sheet', () => {
    const s = fresh();
    draw(<OrgLinks state={s} company="Fournisseur N" category="fournisseur" nav={nav} />);
    tap('Suivre ce fournisseur (3.1)');
    const [sup] = Object.values(s.suppliers);
    expect(sup?.name).toBe('Fournisseur N');                                       // the other tab reads it
    expect(nav.open).toHaveBeenCalledWith('3.1', sup.id);
    expect(nav.tool).not.toHaveBeenCalled();
  });
  it('the supplier card of an organisation: its sheet and a new claim (3.1)', () => {
    const s = fresh();
    s.suppliers.sup = { ...newSupplier(), id: 'sup', name: 'Fournisseur Z' };
    const h = draw(<SupplierCard state={s} company="Fournisseur Z" nav={nav} />);
    expect(h.split(NEW_TAB)).toHaveLength(3);
    tap('Fiche et historique'); expect(nav.open).toHaveBeenLastCalledWith('3.1', 'sup');
    tap('Nouvelle réclamation'); expect(nav.open).toHaveBeenLastCalledWith('3.1', 'new:sup');
    expect(nav.tool).not.toHaveBeenCalled();
  });
});

describe('1.3 the card of a person of the company opens 4.2 and 4.1 in a new tab', () => {
  it('without closing the card', () => {
    const s = fresh(), onClose = vi.fn();
    const c: Contact = { id: 'c1', category: 'interne', name: 'Marc', role: 'Chef d\'atelier', company: '', phone: '', email: '', always: false, verifiedAt: '' };
    const h = draw(<ContactSheet c={c} state={s} teamView={false} move={false} nav={nav} onClose={onClose} set={() => {}} verify={() => {}} remove={() => {}} newOrg={() => {}} />);
    expect(h.split(NEW_TAB)).toHaveLength(3);
    tap('Polyvalence (4.2)'); expect(nav.open).toHaveBeenLastCalledWith('4.2');
    tap('Suppléances (4.1)'); expect(nav.open).toHaveBeenLastCalledWith('4.1');
    expect(nav.tool).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
