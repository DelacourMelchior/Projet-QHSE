// G-17: what replacing the data takes away of the proof is counted before it is asked (restore a backup, load the example, start from zero).
import { describe, expect, it } from 'vitest';
import { demoState } from './templates';
import { lostText, pvLost, signedPvs } from './signedLoss';

const now = new Date(2026, 8, 25, 10, 0);
const demo = () => demoState(now);

describe('the signed PV of the data', () => {
  it('counts one per delivery of an order that is signed, with the moment of the signature', () => {
    const s = demo(), all = signedPvs(s);
    expect(all).toHaveLength(10);
    expect(all.every(x => x.key.startsWith('dl_demo_') && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x.at))).toBe(true);
    expect(signedPvs(null)).toEqual([]);
    expect(signedPvs({ deliveries: {} })).toEqual([]);
  });

  it('counts the PV of a delivery closed into a lot as well as the one under way', () => {
    const s = demo(), d = s.deliveries.dl_demo_4;
    expect(signedPvs(s).some(x => x.key.startsWith('dl_demo_4|'))).toBe(false);   // the order under way is not signed
    const reception = { date: '', name: 'Mme Martin', role: '', result: 'sans' as const, reserve: '', retentionPct: null, amount: null, liftedAt: '', signedAt: '2026-09-01T09:50' };
    s.deliveries.dl_demo_4 = { ...d, lots: [{ id: 'lt_1', no: 1, closedAt: '2026-09-01T10:00', milestones: [], releasedBy: '', releasedAt: '', reception, signClient: [[[1, 1], [50, 40], [99, 10]]] }] };
    expect(signedPvs(s).filter(x => x.key.startsWith('dl_demo_4|')).map(x => x.key)).toEqual(['dl_demo_4|2026-09-01T09:50']);
  });

  it('a record that cannot be read holds nothing to count and stops nothing', () => {
    const s = demo();
    (s.deliveries as Record<string, unknown>).broken = { id: 'broken' };
    (s.deliveries as Record<string, unknown>).hollow = { id: 'hollow', reception: null, lots: 'x' };
    expect(signedPvs(s)).toHaveLength(10);
  });
});

describe('the sentence of the question', () => {
  it('says the number and the day of the last PV signed, as a fact, when everything goes', () => {
    expect(lostText(demo(), null)).toBe('10 PV signés (dernier le 24/09/2026) seront perdus.');
    expect(lostText(demo(), { deliveries: {} })).toBe('10 PV signés (dernier le 24/09/2026) seront perdus.');
  });

  it('says "ne seront plus dans les données" when the data are kept elsewhere, and speaks in the singular for one', () => {
    expect(lostText(demo(), null, true)).toBe('10 PV signés (dernier le 24/09/2026) ne seront plus dans les données.');
    const there = demo();
    delete there.deliveries.dl_demo_12;
    expect(lostText(demo(), there)).toBe('1 PV signé (dernier le 24/09/2026) sera perdu.');
    expect(lostText(demo(), there, true)).toBe('1 PV signé (dernier le 24/09/2026) ne sera plus dans les données.');
  });

  it('counts only the PV that the other data do not hold: the same order signed at the same moment is the same PV', () => {
    const s = demo(), file = demo();
    expect(pvLost(s, file)).toEqual([]);
    expect(lostText(s, file)).toBe('Aucun PV signé ne disparaît : ceux des données actuelles se retrouvent tous après.');
    file.deliveries.dl_demo_1 = { ...file.deliveries.dl_demo_1, client: 'Autre client', item: 'Autre objet' };   // edited elsewhere: still the same PV
    expect(pvLost(s, file)).toEqual([]);
    const unsigned = demo();
    unsigned.deliveries.dl_demo_2 = { ...unsigned.deliveries.dl_demo_2, signClient: undefined, pvPhoto: undefined, reception: { ...unsigned.deliveries.dl_demo_2.reception, signedAt: undefined, noSign: undefined, pvPhotoAt: undefined } };
    expect(pvLost(s, unsigned).map(x => x.key)).toEqual([expect.stringMatching(/^dl_demo_2\|/)]);
  });

  it('says there was nothing to lose when no PV is signed', () => {
    expect(lostText({ deliveries: {} }, null)).toBe('Aucun PV signé dans les données actuelles.');
  });
});
