// Tool 1.4 as the starting point of the other tools: supports of a step, drafts created from a step, the matrix, holes, orphans, what a step created.
import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { createKpi, createdFrom, deleteCreated, keepCreated, filled, draftFor, isWork, matrixHoles, matrixRows, orphans, otherLinks, recordExists, richLinks, supportGaps, SUPPORTS, withLink } from './mapSupport';
import { demoState } from './templates';
import { hasSkill, skillIds } from './mapCover';
import { newEquipment } from './maintenance';
import { newSop } from './instructions';

const now = new Date(2026, 9, 8, 10, 0);
const demo = (): State => demoState(now);

describe('what carries a step', () => {
  it('knows the six tools it can rely on, two of them expected on every step of work', () => {
    expect(SUPPORTS.map(d => d.tool)).toEqual(['3.2', '4.2', '4.1', '3.3', '1.2', '1.1']);
    expect(SUPPORTS.filter(d => d.required).map(d => d.column)).toEqual(['Instruction', 'Compétence']);
  });
  it('splits the links of a step: those on a record of these tools, and the free ones', () => {
    const st = { links: [{ tool: '3.2', id: 'a' }, { tool: '3.2' }, { tool: '2.1' }, { tool: '4.2', id: 'b' }, { tool: '5.1', id: 'x' }] };
    expect(richLinks(st).map(l => l.id)).toEqual(['a', 'b']);
    expect(otherLinks(st)).toEqual([{ tool: '3.2' }, { tool: '2.1' }, { tool: '5.1', id: 'x' }]);
    expect(withLink([{ tool: '3.2', id: 'a' }], { tool: '3.2', id: 'a' })).toHaveLength(1);
    expect(withLink(undefined, { tool: '3.2', id: 'a' })).toEqual([{ tool: '3.2', id: 'a' }]);
  });
  it('counts a step of work, not the start, the end or a question', () => {
    expect(['action', 'document', 'subprocess'].every(k => isWork({ kind: k as never }))).toBe(true);
    expect(['start', 'end', 'decision'].some(k => isWork({ kind: k as never }))).toBe(false);
  });
});

describe('a record created from a step', () => {
  it('is prefilled from the step and keeps where it comes from', () => {
    const s = demo(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!, origin = { flowId: 'fl_demo_3', stepId: 'st_demo_3m' };
    const sop = draftFor('sop', s, f, st, now) as State['sops'][string], skill = draftFor('skill', s, f, st, now) as State['skills'][string], power = draftFor('power', s, f, st, now) as State['powers'][string];
    expect(sop).toMatchObject({ processId: 'P3', operation: 'Usiner, plier et souder les pièces', poste: 'Atelier', origin, phase: 'draft' });
    expect(skill).toMatchObject({ processId: 'P3', name: 'Usiner, plier et souder les pièces', origin });
    expect(power).toMatchObject({ processId: 'P3', power: 'Usiner, plier et souder les pièces', origin, holder: '' });
    expect(draftFor('equipment', s, f, st, now).origin).toEqual(origin);
    expect(draftFor('risk', s, f, st, now)).toMatchObject({ processId: 'P3', origin });
    expect(new Set([sop.id, skill.id, power.id]).size).toBe(3);
    expect(recordExists(s, '3.2', sop.id)).toBe(false);                            // not saved: the sheet of the tool saves it
  });
  it('takes the holder of a key function from a lane that is a person', () => {
    const s = demo(), f = s.flows.fl_demo_6, st = f.steps.find(x => x.id === 'st_demo_6k')!;
    expect((draftFor('power', s, f, st, now) as State['powers'][string]).holder).toBe('Jean-Marc');
  });
  it('creates an indicator in the process, named after the step, with its origin', () => {
    const s = demo(), before = s.processes.find(p => p.id === 'P3')!.kpiIds.length;
    const id = createKpi(s, 'P3', ' Délai de fabrication ', { flowId: 'fl_demo_3', stepId: 'st_demo_3b' });
    expect(id).toMatch(/^kpi_/);
    expect(s.kpis[id]).toMatchObject({ name: 'Délai de fabrication', processId: 'P3', origin: { flowId: 'fl_demo_3', stepId: 'st_demo_3b' }, targetValue: null });
    expect(s.processes.find(p => p.id === 'P3')!.kpiIds).toHaveLength(before + 1);
    expect(createKpi(s, 'P3', '')).toBeTruthy();
    expect(s.kpis[Object.keys(s.kpis).at(-1)!].name).toBe('Nouvel indicateur');
    expect(recordExists(s, '1.1', id)).toBe(true);
    expect(recordExists(s, '9.9', id)).toBe(false);
  });
});

describe('the matrix of a process', () => {
  it('has one row per step of work of its flowcharts, grouped by flowchart', () => {
    const s = demo(), rows = matrixRows(s, 'P3');
    expect(rows.every(r => r.flow.processId === 'P3' && isWork(r.step))).toBe(true);
    expect(rows.some(r => r.step.id === 'st_demo_3m')).toBe(true);
    expect(rows.some(r => r.step.kind === 'start' || r.step.kind === 'decision')).toBe(false);
    expect(matrixRows(s, 'P99')).toEqual([]);
    const flows = rows.map(r => r.flow.id);
    expect(flows).toEqual([...flows].sort((a, b) => 0 || flows.indexOf(a) - flows.indexOf(b)));    // the steps of a flowchart stay together
  });
  it('counts the holes of each column, and the expected ones that count on the map', () => {
    const s = demo(), rows = matrixRows(s, 'P3'), holes = matrixHoles(rows);
    expect(holes.sop).toBeLessThan(rows.length);                                     // some steps have an instruction
    expect(holes.sop).toBeGreaterThan(0);
    expect(holes.risk).toBeLessThan(rows.length);                                    // a few steps carry a risk, most do not
    expect(holes.risk).toBeGreaterThan(rows.length / 2);
    const gaps = supportGaps(s, 'P3');
    expect(gaps).toBe(holes.sop + holes.skill);
    expect(supportGaps(s, 'P99')).toBe(0);
  });
  it('lists the instructions, skills and key functions of the process that no flowchart uses, and not the others', () => {
    const s = demo();
    const before = orphans(s, 'P3');
    s.flows.fl_demo_3.steps.forEach(st => { st.links = st.links?.filter(l => !(l.tool === '3.2' && l.id === 'sop_demo_2')); });
    const after = orphans(s, 'P3');
    expect(after.map(o => o.id)).toContain('sop_demo_2');
    expect(before.map(o => o.id)).not.toContain('sop_demo_2');
    expect(after.every(o => ['sop', 'skill', 'power'].includes(o.kind))).toBe(true);
    expect(orphans(s, 'P99')).toEqual([]);
  });
});

describe('what a step or a flowchart created', () => {
  it('finds the records created from a step, from a flowchart, and none for the others', () => {
    const s = demo(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!;
    const sop = draftFor('sop', s, f, st, now) as State['sops'][string], skill = draftFor('skill', s, f, f.steps[1], now) as State['skills'][string];
    s.sops[sop.id] = sop as never; s.skills[skill.id] = skill as never;
    expect(createdFrom(s, 'fl_demo_3', 'st_demo_3m').map(c => c.id)).toEqual([sop.id]);
    expect(createdFrom(s, 'fl_demo_3').map(c => c.id).sort()).toEqual([sop.id, skill.id].sort());
    expect(createdFrom(s, 'fl_demo_3', 'st_demo_3z')).toEqual([]);
    expect(createdFrom(s, 'fl_demo_8')).toEqual([]);
  });
  it('deletes them when asked, with their links', () => {
    const s = demo(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!;
    const sop = draftFor('sop', s, f, st, now) as State['sops'][string];
    s.sops[sop.id] = sop as never; st.links = withLink(st.links, { tool: '3.2', id: sop.id });
    const id = createKpi(s, 'P3', 'Délai', { flowId: 'fl_demo_3', stepId: 'st_demo_3m' });
    f.links = [...(f.links || []), { tool: '1.1', id }];
    deleteCreated(s, createdFrom(s, 'fl_demo_3', 'st_demo_3m'));
    expect(s.sops[sop.id]).toBeUndefined();
    expect(s.kpis[id]).toBeUndefined();
    expect(s.processes.find(p => p.id === 'P3')!.kpiIds).not.toContain(id);
    expect(st.links!.some(l => l.id === sop.id)).toBe(false);
    expect(f.links!.some(l => l.id === id)).toBe(false);
    expect(s.sops.sop_demo_2).toBeDefined();                                         // a record the step did not create stays
  });
});

describe('audit lot 1: skill roles, deletion like the owner tools', () => {
  it('counts a role that is a skill as the skill of the step, in the matrix and on the map', () => {
    const s = demo(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!;
    st.links = (st.links || []).filter(l => l.tool !== '4.2'); delete st.roleRef;
    const before = supportGaps(s, 'P3'), holesBefore = matrixHoles(matrixRows(s, 'P3')).skill;
    st.roleRef = { kind: 'skill', id: 'sk_x' };
    expect(skillIds(st)).toEqual(['sk_x']);
    expect(hasSkill(st)).toBe(true);
    expect(hasSkill({ links: [{ tool: '4.2' }] })).toBe(false);
    expect(filled(st, SUPPORTS[1])).toBe(true);
    expect(supportGaps(s, 'P3')).toBe(before - 1);
    expect(matrixHoles(matrixRows(s, 'P3')).skill).toBe(holesBefore - 1);
  });
  it('deletes an indicator with its values and actions, an equipment with its place in the spare parts and the processes, like their own tools', () => {
    const s = demo(), id = createKpi(s, 'P3', 'Délai', { flowId: 'fl_demo_3', stepId: 'st_demo_3m' });
    s.values[id] = { '2026-01': 3 } as never; s.actions.ac1 = { id: 'ac1', kpiId: id } as never; s.actions.ac2 = { id: 'ac2', kpiId: 'autre' } as never;
    const e = { ...newEquipment(), id: 'eq_t', origin: { flowId: 'fl_demo_3', stepId: 'st_demo_3m' } };
    s.equipments.eq_t = e as never; s.spares.sp_t = { id: 'sp_t', name: 'Courroie', ref: '', equipmentIds: ['eq_t', 'eq_u'] } as never; s.processes.find(p => p.id === 'P3')!.equipmentIds = ['eq_t', 'eq_u'];
    const made = createdFrom(s, 'fl_demo_3', 'st_demo_3m');
    expect(made.find(c => c.kind === 'kpi')).toMatchObject({ lost: '1 valeur saisie, 1 action', signed: false, other: false });
    expect(made.find(c => c.kind === 'equipment')!.lost).toContain('1 pièce de rechange liée');
    deleteCreated(s, made);
    expect(s.values[id]).toBeUndefined();
    expect(Object.keys(s.actions)).toEqual(expect.not.arrayContaining(['ac1']));
    expect(s.actions.ac2).toBeDefined();
    expect(s.spares.sp_t.equipmentIds).toEqual(['eq_u']);
    expect(s.processes.find(p => p.id === 'P3')!.equipmentIds).toEqual(['eq_u']);
  });
  it('says what an instruction already read would lose, and offers nothing when another flowchart still uses the record', () => {
    const s = demo(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!;
    const sop = { ...newSop('P3', now), origin: { flowId: 'fl_demo_3', stepId: 'st_demo_3m' }, acks: [{ who: 'A' }] } as never as State['sops'][string];
    s.sops[sop.id] = sop; st.links = withLink(st.links, { tool: '3.2', id: sop.id });
    expect(createdFrom(s, 'fl_demo_3', 'st_demo_3m').find(c => c.id === sop.id)).toMatchObject({ signed: true, other: false });
    const other = Object.values(s.flows).find(x => x.id !== 'fl_demo_3')!;
    other.links = [...(other.links || []), { tool: '3.2', id: sop.id }];
    expect(createdFrom(s, 'fl_demo_3', 'st_demo_3m').find(c => c.id === sop.id)!.other).toBe(true);
    expect(createdFrom(s, 'fl_demo_3').find(c => c.id === sop.id)!.other).toBe(true);
  });
  it('forgets where a kept record came from, so that deleting the step does not offer it again', () => {
    const s = demo(), id = createKpi(s, 'P3', 'Délai', { flowId: 'fl_demo_3', stepId: 'st_demo_3m' });
    keepCreated(s, createdFrom(s, 'fl_demo_3', 'st_demo_3m'));
    expect(s.kpis[id]).toBeDefined();
    expect(s.kpis[id].origin).toBeUndefined();
    expect(createdFrom(s, 'fl_demo_3')).toEqual([]);
  });
});
