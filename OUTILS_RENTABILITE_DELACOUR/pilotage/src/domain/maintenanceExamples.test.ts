// Example records of tool 3.3: every state of the tool is shown, the example never replaces what a company holds, a saved fictitious company is completed once.
import { describe, expect, it } from 'vitest';
import type { Equipment, Spare, State } from './types';
import { applyMaintenanceExample, completeMaintenanceExamples, maintenanceExamples, maintExampleParams, NC_EQ_LINKS } from './maintenanceExamples';
import {
  DEFAULT_CAUSES, DEFAULT_NATURES, WATCH_NOTE, anomalyStatus, completeness, downtime, eqStatus, inspectionState, kindOf, ncsOfEquipment, openAnomalies, openBreakdown, planBExceeded, repeatedCauses,
  repeatedPoints, routineOwner, sopLine, watchPoints,
} from './maintenance';
import { expiresIn, migrateParts, orderLateDays, spareLevel, supplierFacts, countDue, usedLast12m, type SpareLevel } from './maintenanceSpares';
import { calibrationsDue, checkState, contractState, historyOf, lifeOf, openReserves, reserveLate, type CheckState } from './maintenanceChecks';
import { maintInsights, maintTodos } from './maintenanceAll';
import { blankState, demoState } from './templates';
import { norm, uncoveredPostes } from './instructions';
import { isoDate } from './periods';

const now = new Date(2026, 8, 25, 10, 0);   // a Friday
const ex = maintenanceExamples(now);
const eqs = Object.values(ex.equipments), sps = Object.values(ex.spares);
const P = blankState('industrie', now).params;
// the state of the demo company with the equipment of this example in place of the older one
const withExample = (today = now): State => {
  const s = demoState(today);
  s.equipments = {}; s.spares = {}; delete s.params.maint;
  applyMaintenanceExample(s, today);
  return s;
};
const stateOf = (today: Date) => ({ ...blankState('industrie', today), people: demoState(today).people, ...maintenanceExamples(today) });

describe('3.3 example: the records', () => {
  it('has nine pieces of equipment of five kinds, and keeps the ids and the Plan B of the first example', () => {
    expect(eqs).toHaveLength(9);
    expect(new Set(eqs.map(kindOf)).size).toBeGreaterThanOrEqual(5);
    expect(ex.equipments.eq_demo_cnc).toMatchObject({ name: "Centre d'usinage CNC 5 axes", riskId: 'risk_demo_cnc' });
    expect(ex.equipments.eq_demo_plieuse.name).toBe('Presse plieuse 300 t');
    expect(Object.keys(ex.equipments).every(id => id.startsWith('eq_demo_'))).toBe(true);
    expect(Object.keys(ex.spares).every(id => id.startsWith('sp_demo_'))).toBe(true);
    expect(eqs.every(e => e.parts.length === 0)).toBe(true);
  });
  it('gives each equipment a photo, a plate, and a reference photo to every point; the pictures are ASCII drawings in base 64', () => {
    eqs.forEach(e => {
      expect(e.photo, e.id).toBeTruthy();
      expect(e.plate || e.id === 'eq_demo_ancienne', e.id).toBeTruthy();
      e.checkpoints.forEach(c => expect(c.photo, `${e.id} ${c.label}`).toBeTruthy());
    });
    const all = JSON.stringify(ex).match(/data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+/g)!;
    expect(all.length).toBeGreaterThan(60);
    new Set(all).forEach(src => {
      const svg = atob(src.split(',')[1]);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toMatch(/^[\x20-\x7e]*$/);
    });
    expect(openAnomalies(ex.equipments.eq_demo_cnc)[0].photo).toBeTruthy();
    expect(openAnomalies(ex.equipments.eq_demo_chariot)[0].photo).toBeTruthy();
  });
  it('is consistent: points, routines, anomalies and cabinet point at each other', () => {
    eqs.forEach(e => {
      const ids = e.checkpoints.map(c => c.id);
      expect(new Set(ids).size, e.id).toBe(ids.length);
      e.inspections.forEach(i => {
        expect(i.ids, e.id).toEqual(ids);
        expect(i.results).toHaveLength(ids.length);
        if (i.values) expect(i.values).toHaveLength(ids.length);
      });
      (e.anomalies || []).forEach(a => { if (a.pointId) expect(ids, `${e.id} ${a.id}`).toContain(a.pointId); if (a.spareId) expect(ex.spares[a.spareId], a.id).toBeTruthy(); });
      expect(e.pin === undefined || (e.pin.x >= 0 && e.pin.x <= 1 && e.pin.y >= 0 && e.pin.y <= 1)).toBe(true);
      (e.tasks || []).forEach(c => expect(lifeOf(e, c).history.length > 0 || !c.lastDone, `${e.id} ${c.id}`).toBe(true));
    });
    const allIds = eqs.flatMap(e => [...(e.tasks || []).map(c => c.id), ...(e.anomalies || []).map(a => a.id), ...(e.breakdowns || []).map(b => b.id)]);
    expect(new Set(allIds).size).toBe(allIds.length);
    sps.forEach(sp => {
      sp.equipmentIds.forEach(id => expect(ex.equipments[id], `${sp.id} ${id}`).toBeTruthy());
      expect((sp.moves || []).reduce((n, m) => n + m.delta, 0), sp.id).toBe(sp.stock);
    });
    const demo = demoState(now);
    eqs.flatMap(e => e.breakdowns || []).flatMap(b => b.deliveryIds || []).forEach(id => expect(demo.deliveries[id], id).toBeTruthy());
    expect(sps.filter(sp => sp.supplierId).every(sp => demo.suppliers[sp.supplierId!])).toBe(true);
    const contacts = [...eqs.flatMap(e => [...(e.contacts || []).map(h => h.contactId), e.contract?.contactId, e.contactId]), ...eqs.flatMap(e => (e.tasks || []).map(c => c.contactId)), ...eqs.flatMap(e => (e.breakdowns || []).map(b => b.contactId))].filter(Boolean);
    contacts.forEach(id => expect(demo.contacts[id!], id).toBeTruthy());
  });
  it('uses the causes and the natures of the neutral lists', () => {
    const causes = DEFAULT_CAUSES.map(norm), natures = DEFAULT_NATURES.map(norm);
    eqs.flatMap(e => e.breakdowns || []).filter(b => b.cause).forEach(b => expect(causes).toContain(norm(b.cause)));
    eqs.flatMap(e => e.anomalies || []).filter(a => a.nature).forEach(a => expect(natures).toContain(norm(a.nature)));
  });
  it('sets the key of the cabinet and the links of the defects', () => {
    expect(maintExampleParams()).toMatchObject({ keyHolder: 'David K.', keyDeputy: 'Julien P.' });
    const demo = demoState(now);
    Object.entries(NC_EQ_LINKS).forEach(([nc, eq]) => { expect(demo.ncs[nc], nc).toBeTruthy(); expect(ex.equipments[eq], eq).toBeTruthy(); });
  });
});

describe('3.3 example: every state is shown', () => {
  const E = ex.equipments, S = ex.spares;
  it('routine: done, to do, late, never made, suspended', () => {
    const st = Object.fromEntries(eqs.map(e => [e.id, inspectionState(e, now, P)]));
    expect(st).toEqual({
      eq_demo_cnc: 'ok', eq_demo_plieuse: 'due', eq_demo_compresseur: 'ok', eq_demo_chariot: 'paused', eq_demo_cabine: 'late', eq_demo_fourgon: 'never', eq_demo_serveur: 'paused', eq_demo_cle: 'due', eq_demo_ancienne: 'paused',
    });
    expect(Object.values(E).map(eqStatus).sort()).toEqual(['retired', 'service', 'service', 'service', 'service', 'service', 'service', 'stopped', 'stopped']);
    expect(E.eq_demo_plieuse.routineDraft).toBeTruthy();
  });
  it('holds those states on any day, whatever the weekday or the month', () => {
    for (let n = 0; n < 40; n++) {
      const d = new Date(2026, 8, 7 + n, 10, 0), s = stateOf(d);
      const st = Object.fromEntries(Object.values(s.equipments).map(e => [e.id, inspectionState(e, d, s.params)]));
      expect(st, isoDate(d)).toMatchObject({ eq_demo_cnc: 'ok', eq_demo_plieuse: 'due', eq_demo_compresseur: 'ok', eq_demo_cabine: 'late', eq_demo_fourgon: 'never', eq_demo_cle: 'due', eq_demo_chariot: 'paused', eq_demo_serveur: 'paused' });
      expect(planBExceeded(s as unknown as State, s.equipments.eq_demo_serveur, d)).toBeNull();   // no risk in this state: only the demo company has them
    }
    [new Date(2026, 0, 1, 10), new Date(2026, 2, 1, 10), new Date(2027, 11, 31, 10), new Date(2028, 1, 29, 10)].forEach(d => {
      const s = stateOf(d);
      expect(inspectionState(s.equipments.eq_demo_cnc, d, s.params), isoDate(d)).toBe('ok');
      expect(inspectionState(s.equipments.eq_demo_cabine, d, s.params), isoDate(d)).toBe('late');
    });
  });
  it('points: one to watch once, one twice in a row that opened an anomaly, and a measured value outside its bounds', () => {
    expect(watchPoints(E.eq_demo_cnc)).toEqual(['cp2']);
    const twice = E.eq_demo_plieuse, last = twice.inspections.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    expect(last[0].results[1]).toBe('watch');
    expect(last[1].results[1]).toBe('watch');
    expect(twice.anomalies).toMatchObject([{ pointId: 'cp1', note: WATCH_NOTE, date: last[0].date }]);
    const cnc = E.eq_demo_cnc, cp = cnc.checkpoints[1], v = cnc.inspections.find(i => i.date === openAnomalies(cnc)[0].date)!.values![1]!;
    expect(v < cp.min!).toBe(true);
    expect(repeatedPoints(cnc, now)).toMatchObject([{ pointId: 'cp1', times: 3 }]);
  });
  it('anomalies: signalée, prise en charge, en attente, réparée; the three gravities; with a photo', () => {
    const all = eqs.flatMap(e => openAnomalies(e));
    expect(all.map(anomalyStatus).sort()).toEqual(['handled', 'handled', 'repaired', 'reported', 'waiting', 'waiting']);
    expect(new Set(all.map(a => a.severity))).toEqual(new Set(['degraded', 'stopped', 'danger']));
    expect(all.filter(a => a.photo).length).toBeGreaterThanOrEqual(5);
    expect(openAnomalies(E.eq_demo_cnc)[0]).toMatchObject({ waitingFor: 'Pièce', spareId: 'sp_demo_electrovanne' });
    expect(E.eq_demo_compresseur.anomalies![0].closedAt).toBe('');   // repaired, not verified: the next routine closes it
    expect(E.eq_demo_cnc.anomalies!.filter(a => a.closedAt)).toHaveLength(2);
  });
  it('stops: a few hours, and one longer than the Plan B tolerates', () => {
    const s = withExample();
    expect(planBExceeded(s, s.equipments.eq_demo_serveur, now)).toMatchObject({ limit: 24 });
    expect(planBExceeded(s, s.equipments.eq_demo_serveur, now)!.hours).toBeGreaterThan(24);
    expect(Object.values(s.equipments).filter(e => planBExceeded(s, e, now)).map(e => e.id)).toEqual(['eq_demo_serveur']);
    const fork = s.equipments.eq_demo_chariot, hours = (now.getTime() - new Date(fork.stoppedSince!).getTime()) / 3600000;
    expect(hours).toBeGreaterThan(3);
    expect(hours).toBeLessThan(8);
    expect(openBreakdown(fork)).toMatchObject({ anomalyId: 'an_demo_chariot', hours: null });
    expect(openBreakdown(s.equipments.eq_demo_serveur)).toMatchObject({ planB: true });
  });
  it('breakdowns: a past one with cause, impact, hours and cost; a cause that comes back', () => {
    expect(downtime(E.eq_demo_cnc, now)).toMatchObject({ count: 1, hours: 16, cost: 2400 });
    expect(E.eq_demo_cnc.breakdowns![0]).toMatchObject({ cause: "Casse d'une pièce", impact: 'stopped', repairBy: 'maker', fix: 'definitive', deliveryIds: ['dl_demo_5'] });
    expect(downtime(E.eq_demo_compresseur, now)).toMatchObject({ count: 2, hours: 8.5, cost: 680, between: 195 });
    expect(repeatedCauses(E.eq_demo_compresseur, now)).toEqual([{ cause: "Casse d'une pièce", times: 2 }]);
  });
  it('cabinet: the four levels, an order in time and a late one, a part received, a date limit, a part for three machines', () => {
    const level = Object.fromEntries(sps.map(sp => [sp.id, spareLevel(sp)])) as Record<string, SpareLevel>;
    expect(new Set(Object.values(level))).toEqual(new Set(['ok', 'min', 'low', 'out']));
    expect(level.sp_demo_electrovanne).toBe('out');
    expect(orderLateDays(S.sp_demo_electrovanne, now)).toBe(9);
    expect(orderLateDays(S.sp_demo_disque, now)).toBe(0);
    expect(S.sp_demo_disque.order).toBeTruthy();
    expect(S.sp_demo_courroie_comp.order).toBeUndefined();
    expect(S.sp_demo_courroie_comp.moves!.some(m => m.why === 'received' && m.at.slice(0, 10) >= isoDate(new Date(2026, 8, 15)))).toBe(true);
    expect(expiresIn(S.sp_demo_batterie, now)).toBe(25);
    expect(sps.filter(sp => sp.equipmentIds.length >= 3).map(sp => sp.id)).toContain('sp_demo_electrovanne');
    expect(sps.filter(sp => sp.photo && sp.placePhoto).length).toBeGreaterThanOrEqual(10);
    expect(sps.some(sp => sp.critical === false)).toBe(true);
    expect(usedLast12m(S.sp_demo_electrovanne, now)).toBe(2);
    expect(countDue({ spares: ex.spares, params: P }, now)).toEqual({ due: false, days: 12 });
    expect(S.sp_demo_joints.moves!.some(m => m.why === 'count')).toBe(true);
  });
  it('suppliers of 3.1: one in class C, one critical supplier', () => {
    const s = withExample();
    expect(supplierFacts(s, s.spares.sp_demo_bague)).toEqual(['le fournisseur est en classe C']);
    expect(supplierFacts(s, s.spares.sp_demo_disque)).toHaveLength(1);
    expect(supplierFacts(s, s.spares.sp_demo_courroie)).toEqual([]);
  });
  it('checks: to plan, planned, late and marked mandatory, never dated, with remarks (one late), done with a report; a calibration; a contract that ends', () => {
    const states = new Set<CheckState>(eqs.flatMap(e => (e.tasks || []).map(c => checkState(e, c, now))));
    expect(states).toEqual(new Set(['nodate', 'ok', 'soon', 'planned', 'late']));
    const late = eqs.flatMap(e => (e.tasks || []).filter(c => checkState(e, c, now) === 'late' && c.legal));
    expect(late).toHaveLength(1);
    const reserves = eqs.flatMap(openReserves);
    expect(reserves).toHaveLength(2);
    expect(reserves.filter(r => reserveLate(r.reserve, now))).toHaveLength(1);
    const withReport = eqs.flatMap(e => (e.tasks || []).flatMap(c => historyOf(e, c))).filter(h => h.report?.startsWith('data:image'));
    expect(withReport.length).toBeGreaterThanOrEqual(5);
    expect(eqs.flatMap(e => (e.tasks || []).flatMap(c => historyOf(e, c))).some(h => h.result === 'remarks')).toBe(true);
    expect(calibrationsDue(stateOf(now) as unknown as State, now).map(x => x.e.id)).toEqual(['eq_demo_cle']);
    expect(contractState(E.eq_demo_cnc, now)).toBe('soon');
    expect(contractState(E.eq_demo_serveur, now)).toBe('ok');
    expect(E.eq_demo_cabine.tasks!.some(c => c.first && !c.lastDone)).toBe(true);
  });
  it('people: the holder away gives the routine to the deputy; the equipment is mostly complete', () => {
    const s = withExample();
    expect(routineOwner(s, s.equipments.eq_demo_cle, '2026-09-25')).toEqual({ who: 'Nicolas R.', absent: true, deputy: true });
    expect(routineOwner(s, s.equipments.eq_demo_cnc, '2026-09-25')).toMatchObject({ who: 'Julien P.', absent: false });
    expect(Object.fromEntries(eqs.filter(e => completeness(e).pct < 100).map(e => [e.id, completeness(e).missing.map(m => m.key)]))).toEqual({ eq_demo_fourgon: ['deputy'], eq_demo_ancienne: expect.any(Array) });
  });
  it('links: defects of the red bin on their equipment, the instruction of the workstation, the plan', () => {
    const s = withExample();
    expect(ncsOfEquipment(s, s.equipments.eq_demo_plieuse, now).map(n => n.id)).toEqual(['nc_demo_7', 'nc_demo_1']);
    expect(ncsOfEquipment(s, s.equipments.eq_demo_cabine, now).map(n => n.id)).toEqual(['nc_demo_5']);
    expect(sopLine(s, s.equipments.eq_demo_cle, now)).toMatchObject({ version: 2, displayed: true });
    expect(sopLine(s, s.equipments.eq_demo_cabine, now)).toMatchObject({ displayed: false });
    expect(s.params.sop?.plan).toMatch(/^data:image\/svg\+xml/);
    expect(s.params.maint).toMatchObject({ keyHolder: 'David K.' });
  });
});

describe('3.3 example: what the other tools and the summary say', () => {
  it('says facts and gives no order in the messages of the example', () => {
    const s = withExample();
    const texts = maintInsights(s, now).map(i => i.text).join(' ');
    expect(texts).not.toMatch(/(^|\. |\| )(Commander|Traiter|Relancer|Faire|Planifier|Réparer)\b/);
    expect(texts).not.toMatch(/obligation réglementaire|tout de suite/);
    expect(maintTodos(s, now).length).toBeGreaterThan(15);
    expect(new Set(maintTodos(s, now).map(t => t.kind))).toEqual(new Set(['routine', 'anomaly', 'danger', 'stopped', 'plan-b', 'order', 'order-late', 'out', 'expiry', 'check', 'remark', 'contract']));
  });
  it('leaves two equipment names without a sheet in 3.2 (before this version: one, the CNC); retired ones, instruments and computers are not asked for a sheet, the others carry the name of a sheet', () => {
    const s = withExample(), machines = uncoveredPostes(s).filter(u => u.machine).map(u => u.name).sort();
    expect(machines).toEqual(["Centre d'usinage CNC 5 axes", "Compresseur d'air à vis 7,5 kW"]);
    // the press, the paint booth, the forklift and the van of the shipping area, and the retired press, are covered by the sheets of the example
    expect(Object.values(s.equipments).filter(e => !machines.includes(e.name)).map(e => e.id).sort()).toEqual(['eq_demo_ancienne', 'eq_demo_cabine', 'eq_demo_chariot', 'eq_demo_cle', 'eq_demo_fourgon', 'eq_demo_plieuse', 'eq_demo_serveur']);
  });
});

describe('3.3 example: the button and the fictitious company saved earlier', () => {
  const own = (over: Partial<Equipment> = {}): Equipment => ({ id: 'eq_own', name: 'Four à pain', location: '', operator: 'Zoé', manager: 'Zoé', riskId: '', checkpoints: [], inspections: [], parts: [], ...over });
  it('fills a company that has nothing, links the defects already declared, gives the plan and the key', () => {
    const s = blankState('industrie', now);
    s.ncs = demoState(now).ncs;
    applyMaintenanceExample(s, now);
    expect(Object.keys(s.equipments)).toHaveLength(9);
    expect(Object.keys(s.spares)).toHaveLength(12);
    expect(s.ncs.nc_demo_1.equipmentId).toBe('eq_demo_plieuse');
    expect(s.params).toMatchObject({ maintExampleLevel: 1, maint: { keyHolder: 'David K.' } });
    expect(s.params.sop?.plan).toBeTruthy();
  });
  it('twice changes nothing', () => {
    const s = blankState('industrie', now);
    s.ncs = demoState(now).ncs;
    applyMaintenanceExample(s, now);
    const once = structuredClone(s);
    applyMaintenanceExample(s, now);
    expect(s).toEqual(once);
  });
  it('never replaces what a company holds: its equipment, its cabinet, its settings, its plan', () => {
    const s = blankState('industrie', now);
    s.equipments = { eq_own: own() };
    s.params.maint = { keyHolder: 'Zoé' };
    s.params.sop = { plan: 'data:image/png;base64,AAAA' };
    applyMaintenanceExample(s, now);
    expect(Object.keys(s.equipments)).toEqual(['eq_own']);
    expect(s.spares).toEqual({});   // the parts come with the equipment they serve
    expect(s.params.maint).toEqual({ keyHolder: 'Zoé' });
    expect(s.params.sop?.plan).toBe('data:image/png;base64,AAAA');
    const t = blankState('industrie', now), mine: Spare = { id: 'sp_own', name: 'Courroie du four', ref: 'CF-1', equipmentIds: [], supplier: '', leadDays: null, min: 1, stock: 3 };
    t.spares = { sp_own: mine };
    t.ncs = { ...demoState(now).ncs, nc_demo_1: { ...demoState(now).ncs.nc_demo_1, equipmentId: 'eq_own' } };
    applyMaintenanceExample(t, now);
    expect(t.spares).toEqual({ sp_own: mine });
    expect(Object.keys(t.equipments)).toHaveLength(9);
    expect(t.ncs.nc_demo_1.equipmentId).toBe('eq_own');
  });

  // a fictitious company saved with the first example of the tool: two machines, their parts listed per machine (taken over into the cabinet when the data is read)
  const saved = (): State => {
    const s = demoState(now), ago = (n: number) => isoDate(new Date(2026, 8, 25 - n));
    const cps = ['Niveau de lubrifiant et huile des glissières', 'Pression pneumatique', 'Bruit et vibrations', 'Copeaux et fuites au sol', "Arrêts d'urgence et carters"].map((label, i) => ({ id: `cp${i}`, label, criterion: 'Critère tapé' }));
    s.equipments = {
      eq_demo_cnc: {
        id: 'eq_demo_cnc', name: "Centre d'usinage CNC 5 axes", location: 'Atelier principal', operator: 'Julien P.', manager: 'David K.', riskId: 'risk_demo_cnc', checkpoints: cps,
        inspections: [0, 1, 2].map(w => ({ date: ago(w * 7 + 2), by: 'Julien P.', note: '', results: w ? ['ok', 'ok', 'ok', 'ok', 'ok'] as const : ['ok', 'ko', 'ok', 'ok', 'ok'] as const, ids: cps.map(c => c.id) })).map(i => ({ ...i, results: [...i.results] })),
        parts: [
          { name: 'Courroie crantée axe Z', ref: 'CR-8840-HD', supplier: 'Constructeur', leadTime: '3 semaines', min: 2, stock: 2 },
          { name: 'Électrovanne pneumatique', ref: 'EV-24V', supplier: 'Constructeur', leadTime: '10 jours', min: 1, stock: 0 },
        ],
        tasks: [{ id: 'tk_demo_1', label: 'Vérification périodique des installations électriques', everyDays: 365, lastDone: ago(372), legal: true }],
        breakdowns: [{ id: 'bd_demo_1', date: ago(120), hours: 16, cost: 2400, cause: "Courroie de l'axe Z cassée" }],
        anomalies: [{ id: 'an_demo_cnc', label: 'Pression pneumatique', date: ago(2), note: 'Manomètre à 5,8 bars', closedAt: '' }],
        contactId: 'ct_demo_maint', manual: "Armoire du bureau d'atelier, classeur bleu",
      },
      eq_demo_plieuse: { id: 'eq_demo_plieuse', name: 'Presse plieuse 300 t', location: 'Atelier tôlerie', operator: 'Karim T.', manager: 'David K.', riskId: '', checkpoints: cps.slice(0, 4), inspections: [], parts: [{ name: 'Kit de joints hydrauliques', ref: 'KJ-300', supplier: 'Constructeur', leadTime: '1 semaine', min: 1, stock: 1 }] },
    };
    s.spares = {}; delete s.params.maint; delete s.params.maintExampleLevel;
    return { ...s, ...migrateParts({ equipments: s.equipments, spares: s.spares }, now.toISOString()) } as State;
  };
  it('does not hide a "Fait" typed before the upgrade behind the history of the example', () => {
    const s0 = saved(), yesterday = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    s0.equipments.eq_demo_cnc.tasks![0].lastDone = yesterday;   // the company ticked the electrical check yesterday
    const cnc = completeMaintenanceExamples(s0, now).equipments.eq_demo_cnc, c = cnc.tasks!.find(x => x.id === 'tk_demo_1')!;
    expect(historyOf(cnc, c)[0].date).toBe(yesterday);          // the most recent line is the typed one
    expect(checkState(cnc, c, now)).toBe('ok');                // done yesterday, not "to plan in 20 days"
  });
  it('completes it once without touching what was typed, and without doubling a part', () => {
    const s0 = saved(), oldIds = Object.values(s0.spares).map(sp => sp.id);
    expect(oldIds).toHaveLength(3);
    s0.equipments.eq_demo_cnc.operator = 'Samuel G.';
    const s = completeMaintenanceExamples(s0, now), cnc = s.equipments.eq_demo_cnc;
    expect(Object.keys(s.equipments)).toHaveLength(9);
    expect(Object.keys(s.spares)).toHaveLength(12);
    expect(oldIds.every(id => s.spares[id])).toBe(true);
    const ev = Object.values(s.spares).filter(sp => sp.ref === 'EV-24V');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ id: oldIds[1], stock: 0, photo: expect.stringContaining('data:image'), equipmentIds: ['eq_demo_cnc', 'eq_demo_compresseur', 'eq_demo_cabine'], order: { qty: 2 } });
    expect(openAnomalies(cnc).filter(a => a.waitingFor).map(a => a.spareId)).toEqual([oldIds[1]]);   // follows the part it already had
    // typed: kept; empty: filled
    expect(cnc).toMatchObject({ operator: 'Samuel G.', manual: "Armoire du bureau d'atelier, classeur bleu", kind: 'machine', photo: expect.stringContaining('data:image'), pin: { x: 0.52, y: 0.64 }, deputy: 'Marc M.' });
    expect(cnc.checkpoints.map(c => c.label)[3]).toBe('Copeaux et fuites au sol');
    expect(cnc.checkpoints.every(c => c.photo)).toBe(true);
    expect(cnc.checkpoints[1]).toMatchObject({ min: 6, max: 7, unit: 'bar' });
    expect(cnc.inspections).toHaveLength(3);
    expect(cnc.anomalies!.find(a => a.id === 'an_demo_cnc')).toMatchObject({ note: 'Manomètre à 5,8 bars', photo: expect.stringContaining('data:image'), handler: 'David K.' });
    expect(cnc.breakdowns![0]).toMatchObject({ id: 'bd_demo_1', cause: "Courroie de l'axe Z cassée", hours: 16, cost: 2400, impact: 'stopped' });
    expect(cnc.tasks![0]).toMatchObject({ id: 'tk_demo_1', everyDays: 365, every: { value: 1, unit: 'an' } });
    expect(s.ncs.nc_demo_1.equipmentId).toBe('eq_demo_plieuse');
    expect(s.params).toMatchObject({ maintExampleLevel: 1, maint: { keyHolder: 'David K.' } });
    // the states read well on the completed data
    const st = s as State;
    expect(inspectionState(cnc, now, st.params)).toBe('ok');
    expect(maintTodos(st, now).length).toBeGreaterThan(10);
    expect(Object.values(st.equipments).every(e => e.parts.length === 0)).toBe(true);
  });
  it('gives the example once: a second pass, or the marker, leaves the company as it is', () => {
    const s = completeMaintenanceExamples(saved(), now);
    expect(completeMaintenanceExamples(s, now)).toBe(s);
    const marked = saved();
    marked.params.maintExampleLevel = 1;
    expect(completeMaintenanceExamples(marked, now)).toBe(marked);
  });
  it('gives nothing to a real company', () => {
    const real = blankState('industrie', now);
    real.equipments = { eq_own: own() };
    expect(completeMaintenanceExamples(real, now)).toBe(real);
    const empty = blankState('industrie', now);
    expect(completeMaintenanceExamples(empty, now)).toBe(empty);
    const demoWithoutEquipment = { ...demoState(now), equipments: {} };
    expect(completeMaintenanceExamples(demoWithoutEquipment, now)).toBe(demoWithoutEquipment);
  });
});
