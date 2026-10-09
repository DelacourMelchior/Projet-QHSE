import { describe, expect, it } from 'vitest';
import { applyFile, changedRecords, bucketOf, diffKeys, flatten, logChanges, mergeFile, overlayChanges, unflatten } from './flat';
import { demoState } from '../domain/templates';
import { newEquipment, recordInspection, reportAnomaly } from '../domain/maintenance';
import { newSpare, takeOut } from '../domain/maintenanceSpares';

describe('shared storage keys', () => {
  const d = demoState();
  it('flatten then unflatten keeps everything', () => {
    const back = unflatten(JSON.parse(JSON.stringify(flatten(d))));
    expect(back.values).toEqual(d.values);
    expect(Object.keys(back.actions).sort()).toEqual(Object.keys(d.actions).sort());
    expect(back.processes.map(p => p.kpiIds)).toEqual(d.processes.map(p => p.kpiIds));
    expect(back.settings).toEqual(d.settings);
  });
  it('stores every picture of the work instructions, and the workshop plan, apart and gives them back', () => {
    const flat = flatten(d), photos = Object.keys(flat).filter(k => k.startsWith('photo|'));
    expect(photos.length).toBeGreaterThan(20);
    expect(JSON.stringify(flat['sop|sop_demo_1'])).not.toContain('data:image');
    expect(JSON.stringify(flat.params)).not.toContain('data:image');
    const back = unflatten(JSON.parse(JSON.stringify(flat)));
    expect(back.sops).toEqual(d.sops);
    expect(back.params.sop?.plan).toBe(d.params.sop?.plan);
    expect(back.params.sop?.plan).toContain('data:image/svg+xml');
  });
  it('confidential values and settings go to the direction folder', () => {
    expect(bucketOf('value|kpi_ca|2026-01', d)).toBe('direction');
    expect(bucketOf('value|kpi_otif|2026-01', d)).toBe('equipe');
    expect(bucketOf('settings', d)).toBe('direction');
    expect(bucketOf('kpi|kpi_ca', d)).toBe('equipe');
  });
  it('diff only lists changed keys', () => {
    const a = flatten(d);
    const b = { ...a, 'value|kpi_ca|2026-01': 1 };
    delete (b as Record<string, unknown>)['value|kpi_ca|2026-02'];
    expect(diffKeys(b, a).sort()).toEqual(['value|kpi_ca|2026-01', 'value|kpi_ca|2026-02']);
  });
});

// A photo of the photo store is a reference "photo:<id>-<width>-<height>", with "~<edit>" once retouched: it has no entry of its own in the flat map and must come back untouched
describe('photo references through the flat map', () => {
  const REF = 'photo:0123456789abcdef01234567-640-480', RETOUCHED = `${REF}~eyJyIjoxfQ`;
  it('every reference of a 3.3 record and of the settings comes back as it was', () => {
    const s = demoState();
    const e = newEquipment(); e.name = 'Presse'; e.photo = REF; e.plate = RETOUCHED; e.checkpoints[0].photo = REF; e.docs = [{ label: 'Notice', photo: REF }];
    e.anomalies = [{ id: 'an1', label: 'x', date: '2026-10-01', note: '', closedAt: '', photo: REF }];
    e.breakdowns = [{ id: 'bd1', date: '2026-10-01', hours: 1, cost: null, cause: '', photo: RETOUCHED }];
    e.tasks = [{ id: 'tk1', label: 'c', everyDays: 30, lastDone: '', legal: false }];
    e.checkLife = { tk1: { history: [{ date: '2026-10-01', by: 'a', result: 'ok', report: REF, note: '' }] } };
    s.equipments[e.id] = e;
    const sp = newSpare([e.id]); sp.name = 'Joint'; sp.photo = REF; sp.placePhoto = RETOUCHED; s.spares[sp.id] = sp;
    s.params.sop = { ...s.params.sop, plan: RETOUCHED };
    const back = unflatten(JSON.parse(JSON.stringify(flatten(s))));
    const be = back.equipments[e.id], bs = back.spares[sp.id];
    expect([be.photo, be.plate, be.checkpoints[0].photo, be.docs?.[0].photo, be.anomalies?.[0].photo, be.breakdowns?.[0].photo, be.checkLife?.tk1.history[0].report, bs.photo, bs.placePhoto, back.params.sop?.plan])
      .toEqual([REF, RETOUCHED, REF, REF, REF, RETOUCHED, REF, REF, RETOUCHED, RETOUCHED]);
  });
});

// A record named like a property of Object must not change the prototype of its collection, and a key whose kind is such a name must not stop the reading
describe('unsafe identifiers in a file', () => {
  it('are ignored', () => {
    const m = flatten(demoState());
    m['equipment|__proto__'] = { id: '__proto__', name: 'X', checkpoints: [], inspections: [] };
    m['spare|constructor'] = { id: 'constructor', name: 'Y', equipmentIds: [] };
    m['constructor|x'] = { id: 'x' }; m['toString|y'] = { id: 'y' };
    const s = unflatten(JSON.parse(JSON.stringify(m)));
    expect(Object.getPrototypeOf(s.equipments)).toBe(Object.prototype);
    expect(Object.keys(s.equipments)).not.toContain('__proto__');
    expect((s.equipments as Record<string, unknown>).name).toBeUndefined();
    expect(Object.hasOwn(s.spares, 'constructor')).toBe(false);
    expect(Object.keys(s.equipments)).toContain('eq_demo_cnc');
  });
});

// What two people did on the same equipment or the same part is never replaced by the other copy
describe('records of another file', () => {
  const base = () => { const s = demoState(); return s; };
  it('adds the new records, merges the equipment and the parts present on both sides, keeps the other records as they are and counts them', () => {
    const mine = base(), theirs = structuredClone(mine);
    const id = 'eq_demo_fourgon', sp = 'sp_demo_courroie';
    // this computer: a routine; the file: a report on the same equipment, a part taken, a new equipment, a changed indicator target
    mine.equipments[id] = recordInspection(mine.equipments[id], { date: '2026-10-06', by: 'Alice', results: mine.equipments[id].checkpoints.map(() => 'ok' as const), note: '' });
    theirs.equipments[id] = reportAnomaly(theirs.equipments[id], { label: 'Fuite', severity: 'degraded', by: 'Bob' }, '2026-10-06T08:00');
    theirs.spares[sp] = takeOut(theirs.spares[sp], 'Bob');
    const fresh = newEquipment(); fresh.name = 'Nouveau'; theirs.equipments[fresh.id] = fresh;
    const kpi = Object.keys(theirs.kpis)[0]; theirs.kpis[kpi] = { ...theirs.kpis[kpi], name: 'Autre nom' };
    const r = mergeFile(flatten(mine), flatten(theirs));
    expect([r.added, r.merged, r.kept]).toEqual([1, 2, 1]);
    const out = unflatten({ ...flatten(mine), ...r.put });
    expect(out.equipments[id].inspections).toHaveLength(1);       // Alice's routine is still there
    expect(out.equipments[id].anomalies).toHaveLength(1);         // and Bob's report arrived
    expect(out.spares[sp].stock).toBe(1);                         // Bob's movement arrived
    expect(out.equipments[fresh.id].name).toBe('Nouveau');
    expect(out.kpis[kpi].name).toBe(mine.kpis[kpi].name);         // present on both sides and different: this computer's stays
  });
  it('does not erase the photo references', () => {
    const REF = 'photo:0123456789abcdef01234567-640-480';
    const mine = base(); mine.spares.sp_demo_courroie.photo = REF;
    const theirs = structuredClone(mine), fresh = newSpare([]); fresh.name = 'Joint'; fresh.photo = REF; theirs.spares[fresh.id] = fresh;
    const out = unflatten({ ...flatten(mine), ...mergeFile(flatten(mine), flatten(theirs)).put });
    expect(out.spares.sp_demo_courroie.photo).toBe(REF);
    expect(out.spares[fresh.id].photo).toBe(REF);
  });
});

// "Fusionner un fichier de saisies" asks a question first: what is written elsewhere while it is open (another tab, the shared folder) must stay (audit V-02)
describe('a file put on the data as they are when it is applied', () => {
  it('keeps a danger and an action written while the question was open, adds the file\'s records, merges the equipment present on both sides', () => {
    const id = 'eq_demo_fourgon', render = demoState(), theirs = structuredClone(render);
    const fresh = newEquipment(); fresh.name = 'Nouveau'; theirs.equipments[fresh.id] = fresh;
    theirs.equipments[id] = reportAnomaly(theirs.equipments[id], { label: 'Fuite', severity: 'degraded', by: 'Bob' }, '2026-10-06T08:00');
    const asked = mergeFile(flatten(render), flatten(theirs));                       // what the question says
    const now = structuredClone(render);                                             // the data when the answer comes: something was written elsewhere
    now.equipments[id] = reportAnomaly(now.equipments[id], { label: 'Danger écrit ailleurs', severity: 'danger', by: 'Autre' }, '2026-10-06T09:00');
    now.actions.ac_other = { ...Object.values(now.actions)[0], id: 'ac_other', constat: 'ACTION AUTRE ONGLET' };
    const settings = now.settings;
    const r = applyFile(now, flatten(theirs));
    expect([r.added, r.merged, r.kept]).toEqual([asked.added, asked.merged, asked.kept]);
    expect((now.equipments[id].anomalies || []).map(a => a.label).sort()).toEqual([...(demoState().equipments[id].anomalies || []).map(a => a.label), 'Danger écrit ailleurs', 'Fuite'].sort());
    expect(now.actions.ac_other.constat).toBe('ACTION AUTRE ONGLET');
    expect(now.equipments[fresh.id].name).toBe('Nouveau');
    expect(now.settings).toBe(settings);
  });
  it('a second application finds nothing new', () => {
    const now = demoState(), theirs = structuredClone(now), fresh = newEquipment(); fresh.name = 'Nouveau'; theirs.equipments[fresh.id] = fresh;
    expect(applyFile(now, flatten(theirs)).added).toBe(1);
    expect(applyFile(now, flatten(theirs))).toMatchObject({ added: 0, merged: 0 });
  });
});

// A tap made on this computer while the shared folder was being read must still be there once the reading is over
describe('what changed during the reading of the folder', () => {
  it('is put back over what was read: the stock moves of the folder and the tap both count', () => {
    const before = demoState(), sp = 'sp_demo_courroie';            // stock 2
    const read = structuredClone(before); read.spares[sp] = takeOut(read.spares[sp], 'Bob');          // the folder: Bob took one
    const now = structuredClone(before); now.spares[sp] = takeOut(now.spares[sp], 'Alice');            // the screen: Alice took one during the wait
    const out = overlayChanges(read, before, now);
    expect(out.spares[sp].stock).toBe(0);
    expect(out.spares[sp].moves).toHaveLength(before.spares[sp].moves!.length + 2);
  });
  it('keeps what only the others typed, and takes this computer\'s value for any other record', () => {
    const before = demoState(), sp = 'sp_demo_courroie';
    const read = structuredClone(before); read.spares[sp] = { ...read.spares[sp], place: 'Tiroir B' }; read.settings = { ...read.settings, companyName: 'Dossier' };
    const now = structuredClone(before); now.spares[sp] = takeOut(now.spares[sp], 'Alice'); now.settings = { ...now.settings, companyName: 'Local' };
    const out = overlayChanges(read, before, now);
    expect(out.spares[sp].place).toBe('Tiroir B');                   // typed by someone else meanwhile, not touched here
    expect(out.spares[sp].stock).toBe(1);
    expect(out.settings.companyName).toBe('Local');
  });
  it('a record deleted on this computer during the wait stays deleted', () => {
    const before = demoState(), now = structuredClone(before);
    delete now.equipments.eq_demo_cle;
    expect(overlayChanges(structuredClone(before), before, now).equipments.eq_demo_cle).toBeUndefined();
  });
});

describe('journal', () => {
  const t0 = new Date(2026, 9, 6, 10, 0), min = (n: number) => new Date(t0.getTime() + n * 60000);
  const touch = (s: ReturnType<typeof demoState>) => { const n = structuredClone(s); n.equipments.eq_demo_cnc.location += '.'; return n; };
  it('one person touching the same record the same way within 10 minutes keeps one line, with the latest time', () => {
    let s = demoState();
    for (let i = 0; i < 5; i++) { const n = touch(s); logChanges(s, n, 'Alice', min(i)); s = n; }
    const lines = Object.values(s.logs).filter(l => l.ref === 'eq_demo_cnc');
    expect(lines).toHaveLength(1);
    expect(lines[0].at).toBe(min(4).toISOString());
  });
  it('a line is added for another person, another record, another kind of change, or after 10 minutes', () => {
    const s0 = demoState();
    const a = touch(s0); a.logs = {}; logChanges(s0, a, 'Alice', t0);
    const b = touch(a); logChanges(a, b, 'Bob', min(1));       // another person
    const c = touch(b); logChanges(b, c, 'Alice', min(11));    // more than 10 minutes after Alice's line
    expect(Object.values(c.logs).filter(l => l.ref === 'eq_demo_cnc').map(l => l.by).sort()).toEqual(['Alice', 'Alice', 'Bob']);
  });
});

describe('journal of the process map', () => {
  it('logs the flowcharts and the processes', () => {
    const a = { 'flow|f1': { id: 'f1' }, 'process|P1': { id: 'P1' } } as never, b = { 'flow|f1': { id: 'f1', name: 'x' }, 'process|P1': { id: 'P1' }, 'flow|f2': { id: 'f2' } } as never;
    expect(changedRecords(a, b)).toEqual([{ key: 'flow|f1', what: 'modification' }, { key: 'flow|f2', what: 'création' }]);
  });
});
