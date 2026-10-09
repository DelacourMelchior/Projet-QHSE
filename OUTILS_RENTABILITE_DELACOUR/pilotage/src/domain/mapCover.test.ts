// Tool 1.4 with 4.1 and 4.2: what a process, a step and a flowchart say about who can do the work; where a skill or a function is used; a role that is a skill or a person.
import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { flowPowerIssues, flowRisks, processCover, skillCover, stepCover, usedByFlow, usedInFlows } from './mapCover';
import { flowIssues, layoutFlow, soundFlow, withRoles } from './cartography';
import { completeMapExamples } from './mapExamples';
import { demoState } from './templates';

const now = new Date(2026, 9, 7, 10, 0);
const demo = (): State => demoState(now);

describe('what a process holds in 4.1 and 4.2', () => {
  it('counts the skills held by nobody or by one person, and the key functions that are not ready', () => {
    const s = demo(), c = processCover(s, 'P3', now);
    expect(c.skills.map(x => x.skill.id)).toContain('sk_demo_1');
    expect(c.keyPerson).toBe(c.skills.filter(x => x.risk === 'single').length);
    expect(c.uncovered).toBe(c.skills.filter(x => x.risk === 'none').length);
    expect(c.keyPerson).toBeGreaterThanOrEqual(2);                              // the CNC programming and the TIG welding are held by one person each
    expect(c.skills[0].tone).toBe('alert');                                     // the urgent lines come first
    expect(c.powers.map(x => x.power.id)).toContain('pw_demo_3');
    expect(processCover(s, 'P99', now)).toMatchObject({ skills: [], powers: [], keyPerson: 0, uncovered: 0, weak: 0, powerGaps: 0 });
  });
  it('says who is autonomous on a skill', () => {
    const s = demo(), c = skillCover(s, s.skills.sk_demo_1);
    expect(c).toMatchObject({ risk: 'single', tone: 'alert', people: ['Marc M.'], label: 'Homme-clé' });
    expect(skillCover(s, s.skills.sk_demo_6)).toMatchObject({ risk: 'ok', tone: 'ok' });
  });
});

describe('what a step says about who can do it', () => {
  it('reads a link to a skill, to a key function and a role that is a skill, once each', () => {
    const s = demo();
    const t = stepCover(s, { links: [{ tool: '4.2', id: 'sk_demo_1' }, { tool: '4.1', id: 'pw_demo_3' }, { tool: '2.1' }], roleRef: { kind: 'skill', id: 'sk_demo_1' } }, now);
    expect(t.map(x => `${x.kind}:${x.id}`)).toEqual(['skill:sk_demo_1', 'power:pw_demo_3']);
    expect(t[0]).toMatchObject({ tone: 'alert', text: 'une seule personne autonome : Marc M.', tool: '4.2' });
    expect(t[1].text).toMatch(/^titulaire .*· /);
    expect(stepCover(s, { links: [{ tool: '4.2', id: 'gone' }, { tool: '2.1' }] }, now)).toEqual([]);
  });
  it('reads a role that is a person: present, away today, or gone', () => {
    const s = demo(), id = 'pp_demo_lb', ref = { kind: 'person' as const, id };
    expect(stepCover(s, { roleRef: ref }, now)[0]).toMatchObject({ tone: 'ok', text: 'présent', tool: '1.3' });
    s.people[id].absences = [{ from: '2026-10-05', to: '2026-10-09' }];
    expect(stepCover(s, { roleRef: ref }, now)[0]).toMatchObject({ tone: 'warn', text: 'absent aujourd’hui' });
    s.people[id].active = false;
    expect(stepCover(s, { roleRef: ref }, now)[0]).toMatchObject({ tone: 'alert', text: 'n’est plus dans l’entreprise' });
  });
  it('lists the steps of a flowchart that stop if one person is missing', () => {
    const s = demo(), r = flowRisks(s.flows.fl_demo_3, s, now);
    expect(r.some(x => x.stepId === 'st_demo_3m' && x.tone === 'alert' && x.text.startsWith('Usiner, plier et souder les pièces : compétence « Programmation CNC 5 axes »'))).toBe(true);
    expect(flowRisks(s.flows.fl_demo_8, s, now)).toEqual([]);
  });
});

describe('where a skill or a function is used', () => {
  it('finds the flowcharts that link to it as a whole, and the steps that link to it or take it as their role', () => {
    const w = demo();
    expect(usedInFlows(w, '3.3', 'eq_demo_cnc').map(u => `${u.flow.id}:${u.index}`)).toEqual(['fl_demo_3:-1', 'fl_demo_3:2', 'fl_demo_15:-1', 'fl_demo_15:1', 'fl_demo_15:8']);   // by name, the flowchart as a whole first, then its steps
    expect(usedInFlows(w, '3.3', 'eq_demo_cnc').filter(u => u.index === -1).every(u => u.step === undefined)).toBe(true);
    const s = demo();
    expect(usedInFlows(s, '4.2', 'sk_demo_1').map(u => `${u.flow.id}:${u.index + 1}`)).toEqual(['fl_demo_3:3']);
    expect(usedInFlows(s, '4.1', 'pw_demo_2').map(u => u.flow.id)).toEqual(['fl_demo_1', 'fl_demo_13', 'fl_demo_12', 'fl_demo_2']);   // by name
    s.flows.fl_demo_8.steps[1].roleRef = { kind: 'skill', id: 'sk_demo_1' };
    expect(usedInFlows(s, '4.2', 'sk_demo_1').map(u => u.flow.id)).toEqual(['fl_demo_3', 'fl_demo_8'].sort((a, b) => s.flows[a].name.localeCompare(s.flows[b].name, 'fr')));
    expect(usedInFlows(s, '4.1', 'pw_none')).toEqual([]);
  });
});

describe('a role that is a skill or a person', () => {
  it('puts the name of the skill in the lane, follows a rename, and says when it is gone', () => {
    const s = demo(), f = JSON.parse(JSON.stringify(s.flows.fl_demo_8));
    f.steps[1].roleRef = { kind: 'skill', id: 'sk_demo_1' };
    expect(layoutFlow(withRoles(f, s)).lanes).toContain('Programmation CNC 5 axes');
    s.skills.sk_demo_1.name = 'CNC';
    expect(layoutFlow(withRoles(f, s)).lanes).toContain('CNC');
    expect(withRoles(f, s).steps[1].role).toBe('CNC');
    expect(flowIssues(f, s)).toEqual([]);
    delete s.skills.sk_demo_1;
    expect(flowIssues(f, s).map(i => i.text)).toContain("Analyser les résultats de l'année : la compétence choisie pour la faire n’existe plus");
    expect(withRoles(f, s).steps[1].role).toBe('Direction');                       // the text written stays when the skill is gone
  });
  it('reads a role reference field by field', () => {
    const f = soundFlow('f', { steps: [{ id: 'a', kind: 'action', label: 'A', role: 'x', roleRef: { kind: 'skill', id: 'k' } }, { id: 'b', kind: 'action', label: 'B', role: 'y', roleRef: { kind: 'weird', id: 'k' } }, { id: 'c', kind: 'action', label: 'C', role: 'z', roleRef: { kind: 'person', id: 3 } }] });
    expect(f.steps[0].roleRef).toEqual({ kind: 'skill', id: 'k' });
    expect(f.steps[1].roleRef).toBeUndefined();
    expect(f.steps[2].roleRef).toBeUndefined();
  });
  it('does not give a saved example a link to a skill or a function it does not have', () => {
    const s = demo();
    s.flows = {}; s.skills = {}; s.powers = {}; s.params = { ...s.params, mapExampleLevel: 0 };
    const out = completeMapExamples(s, now);
    expect(Object.keys(out.flows)).toHaveLength(26);
    Object.values(out.flows).forEach(f => f.steps.forEach(st => (st.links || []).forEach(l => expect(['4.1', '4.2'].includes(l.tool) && l.id).toBeFalsy())));
    Object.values(out.flows).forEach(f => expect(flowIssues(f, out as State), f.name).toEqual(f.id === 'fl_demo_4' ? flowIssues(f, out as State) : []));
  });
});

describe('key functions that are not ready, seen from the flowcharts', () => {
  it('names the cause on the step and counts each function once with its steps', () => {
    const s = demo();
    expect(stepCover(s, { links: [{ tool: '4.1', id: 'pw_demo_3' }] }, now)[0]).toMatchObject({ kind: 'power', tone: 'warn', why: 'signatures manquantes' });
    expect(stepCover(s, { links: [{ tool: '4.1', id: 'pw_demo_1' }] }, now)[0].why).toBeUndefined();
    const issues = flowPowerIssues(s.flows.fl_demo_3, s, now);
    expect(issues.find(x => x.id === 'pw_demo_3')).toMatchObject({ why: 'signatures manquantes', steps: [2], tone: 'warn' });
    expect(issues.find(x => x.id === 'pw_demo_6')).toMatchObject({ why: 'aucun suppléant', tone: 'alert' });
    expect(new Set(issues.map(x => x.id)).size).toBe(issues.length);
    expect(flowPowerIssues(s.flows.fl_demo_8, s, now)).toEqual([]);
    // the count of the list agrees with the steps at risk of the same flowchart
    expect(flowRisks(s.flows.fl_demo_3, s, now).filter(r => /fonction clé/.test(r.text)).length).toBe(issues.reduce((n, x) => n + x.steps.length, 0));
  });
  it('gives, per flowchart, the numbers of the steps that use a record', () => {
    const s = demo();
    expect(usedByFlow(s, '4.1', 'pw_demo_3')).toEqual([{ flow: s.flows.fl_demo_3, steps: [2], whole: false }]);
    expect(usedByFlow(s, '4.1', 'nope')).toEqual([]);
  });
});
