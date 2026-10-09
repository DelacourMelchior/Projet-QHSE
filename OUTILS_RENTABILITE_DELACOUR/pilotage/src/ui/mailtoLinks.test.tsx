// S-17 (the last two links): the e-mail typed in the directory ends up in a mailto: link of the reflex card (1.2) and of the claim sheet (3.1): one plain address goes through, encoded;
// "a@b.fr?bcc=x@y.fr" never makes a link that carries a hidden recipient.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../domain/templates';
import type { Contact } from '../domain/types';
import { newRisk } from '../domain/risk';
import { applySupplierExample } from '../domain/supplierExamples';
import { ReflexCard } from './ReflexCard';
import { ClaimSheet } from './operations/ClaimSheet';

const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', teamView: false, storageFull: false, folder: { status: 'none' } }) }));
const hrefs = (html: string) => [...html.matchAll(/href="(mailto:[^"]*)"/g)].map(m => m[1].replace(/&amp;/g, '&'));

describe('1.2 reflex card: the address of a contact', () => {
  const s = demoState(new Date(2026, 8, 25, 10, 0));
  const first = Object.keys(s.contacts)[0], risk = { ...newRisk('P2', new Date(2026, 8, 25)), title: 'Casse broche', owner: 'Luc', planB: 'Machine de secours', contactIds: [first] };
  const withEmail = (email: string) => ({ ...s, contacts: { ...s.contacts, [first]: { ...s.contacts[first], email } as Contact } });
  it('a plain address is a link, a typed query is not', () => {
    expect(hrefs(renderToStaticMarkup(<ReflexCard r={risk} s={withEmail('jean.dupont+qhse@client.fr')} />))).toContain('mailto:jean.dupont%2Bqhse@client.fr');
    const bad = renderToStaticMarkup(<ReflexCard r={risk} s={withEmail('a@b.fr?bcc=x@y.fr')} />);
    expect(hrefs(bad).filter(x => x.includes('bcc'))).toEqual([]);
    expect(bad).toContain('a@b.fr?bcc=x@y.fr');   // still read on the card, as text
  });
});

describe('3.1 claim sheet: the e-mail to the supplier', () => {
  beforeAll(() => { vi.stubGlobal('document', { body: {} }); });   // the window of the sheet is drawn in the body: here the portal gives its content back
  afterAll(() => { vi.unstubAllGlobals(); });
  const base = demoState(new Date(2026, 8, 25, 10, 0));
  applySupplierExample(base, new Date(2026, 8, 25, 10, 0));
  const debit = Object.values(base.debits)[0];
  const sheet = (email: string) => {
    const ct = Object.values(base.contacts)[0];
    h.state = { ...base, contacts: { ...base.contacts, ct_x: { ...ct, id: 'ct_x', email } }, debits: { ...base.debits, [debit.id]: { ...debit, contactId: 'ct_x' } } };
    return renderToStaticMarkup(<ClaimSheet initial={{ ...debit, contactId: 'ct_x' }} onClose={() => {}} nav={{ open: vi.fn(), tool: vi.fn() } as never} />);
  };
  it('goes to one plain address, encoded', () => {
    const [link] = hrefs(sheet('contact@fournisseur.fr'));
    expect(link.startsWith('mailto:contact@fournisseur.fr?subject=')).toBe(true);
  });
  it('an address with a typed query opens the mail with no recipient, and the button does not say it is sent to it', () => {
    const html = sheet('a@b.fr?bcc=x@y.fr'), links = hrefs(html);
    expect(links.some(l => l.includes('bcc'))).toBe(false);
    expect(links.some(l => l.startsWith('mailto:?subject='))).toBe(true);
    expect(html).not.toMatch(/E-mail à a@b\.fr\?bcc/);
  });
});
