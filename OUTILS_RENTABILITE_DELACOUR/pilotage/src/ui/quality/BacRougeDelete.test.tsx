// G-17 on the screen of 5.1: the sheet of a defect that an order released or signed holds says, as a fact, that it is not deleted, and offers no button for it; for any other defect the button stays.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { demoState } from '../../domain/templates';
import type { State } from '../../domain/types';
import { NcSheet } from './BacRouge';
import { plain } from '../operations/testPlain';

const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', teamView: false, storageFull: false, folder: { status: 'none' } }) }));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={title}>{children}{footer}</section> }));

const sheet = (order?: string) => {
  const s = demoState(new Date(2026, 8, 25, 10, 0)), nc = { ...s.ncs.nc_demo_r1, deliveryId: order };
  s.ncs[nc.id] = nc;
  h.state = s as State;
  return plain(renderToStaticMarkup(<NcSheet initial={nc} onClose={() => {}} nav={{ open: vi.fn(), tool: vi.fn() } as never} />).replace(/&#x27;/g, "'"));
};

describe('5.1: delete a defect', () => {
  it('an order that is signed keeps its defect: the fact is written where the button was', () => {
    const html = sheet('dl_demo_2');
    expect(html).toContain('ne se supprime pas : la commande');
    expect(html).toContain('a un PV signé et la fiche fait partie de sa preuve');
    expect(html).not.toMatch(/>Supprimer</);
  });
  it('an order that is released says the day', () => {
    const html = sheet('dl_demo_6');
    expect(html).toContain('est libérée le 21/09/2026');
    expect(html).not.toMatch(/>Supprimer</);
  });
  it('an order still under control, or an order that does not exist, leaves the button', () => {
    expect(sheet('dl_demo_4')).toMatch(/>Supprimer</);
    expect(sheet('dl_inconnue')).toMatch(/>Supprimer</);
    expect(sheet(undefined)).toMatch(/>Supprimer</);
  });
});
