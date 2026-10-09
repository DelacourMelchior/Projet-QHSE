// G-17: a defect of 5.1 that an order of 3.4 holds is not deleted once the order is released or signed (said as a fact); before that, the deletion is written in the journal of the order.
import { describe, expect, it } from 'vitest';
import { demoState } from './templates';
import { deleteNc, ncDeleteBar } from './quality';

const demo = () => demoState(new Date(2026, 8, 25, 10, 0));
const plain = (s: string) => s.replace(/[  ]/g, ' ');
const link = (s: ReturnType<typeof demo>, nc: string, order: string) => { s.ncs[nc] = { ...s.ncs[nc], deliveryId: order }; return s.ncs[nc]; };

describe('the deletion of a defect that an order holds', () => {
  it('is refused, with the fact, when the PV of the order is signed', () => {
    const s = demo(), n = link(s, 'nc_demo_r1', 'dl_demo_2');   // dl_demo_2: released and signed
    expect(plain(ncDeleteBar(s, n))).toBe(`La fiche ${n.ref} ne se supprime pas : la commande ${s.deliveries.dl_demo_2.ref} a un PV signé et la fiche fait partie de sa preuve. Une décision la clôt, la fiche reste.`);
  });

  it('is refused, with the day, when the order is released and not signed yet', () => {
    const s = demo(), n = link(s, 'nc_demo_r1', 'dl_demo_6');   // released on 21 Sept., no signature
    expect(plain(ncDeleteBar(s, n))).toContain('est libérée le 21/09/2026');
    expect(plain(ncDeleteBar(s, n))).toContain('ne se supprime pas');
  });

  it('is refused when only a closed delivery (a lot) is signed or released', () => {
    const s = demo(), d = s.deliveries.dl_demo_4;
    s.deliveries.dl_demo_4 = { ...d, lots: [{ id: 'lt_1', no: 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: 'Luc', releasedAt: '2026-09-01', reception: { ...d.reception, result: 'sans', signedAt: '2026-09-01T09:50' }, signClient: [[[1, 1], [50, 40], [99, 10]]] }] };
    expect(ncDeleteBar(s, link(s, 'nc_demo_r1', 'dl_demo_4'))).toContain('PV signé');
  });

  it('is allowed (no sentence) for an order that is neither released nor signed, for a defect with no order, and for an order that no longer exists', () => {
    const s = demo();
    expect(ncDeleteBar(s, s.ncs.nc_demo_r1)).toBe('');              // dl_demo_4: under control
    expect(ncDeleteBar(s, s.ncs.nc_demo_1)).toBe('');               // no order
    expect(ncDeleteBar(s, { ref: 'NC-1', deliveryId: 'dl_inconnue' })).toBe('');
    expect(ncDeleteBar(s, { ref: 'NC-1', deliveryId: '__proto__' })).toBe('');
    expect(ncDeleteBar(s, { ref: 'NC-1', deliveryId: 'constructor' })).toBe('');
  });

  it('writes a line of proof in the journal of the order, with the defect and its decision, and takes the defect away', () => {
    const s = demo(), n = s.ncs.nc_demo_r1, before = s.deliveries.dl_demo_4.journal?.length ?? 0;
    deleteNc(s, n.id, 'Luc', '2026-09-25T10:00');
    expect(s.ncs.nc_demo_r1).toBeUndefined();
    const j = s.deliveries.dl_demo_4.journal!;
    expect(j).toHaveLength(before + 1);
    expect(plain(j.at(-1)!.text)).toMatch(new RegExp(`^Fiche ${n.ref} supprimée dans l'outil 5\\.1 : « .+ » \\((sans décision|décision : .+)\\)$`));
    expect(j.at(-1)).toMatchObject({ by: 'Luc', at: '2026-09-25T10:00', proof: true });   // a line of proof is never dropped by the cap of the journal
  });

  it('leaves no trace to write when the defect holds no order, and does not stop on an id of the prototype', () => {
    const s = demo(), logs = Object.values(s.deliveries).map(d => d.journal?.length ?? 0);
    deleteNc(s, 'nc_demo_1', 'Luc', '2026-09-25T10:00');
    expect(s.ncs.nc_demo_1).toBeUndefined();
    expect(Object.values(s.deliveries).map(d => d.journal?.length ?? 0)).toEqual(logs);
    expect(() => deleteNc(s, 'constructor', 'Luc', '2026-09-25T10:00')).not.toThrow();
    expect(() => deleteNc(s, '__proto__', 'Luc', '2026-09-25T10:00')).not.toThrow();
  });
});
