// Tool 1.4, internal coherence (lot 3 of the audit): flowchart checks, removing a step, ids, exchanges, orphans, the example loader.
import { describe, expect, it } from 'vitest';
import type { Flow, FlowStep, Process, State } from './types';
import { arrowsInto, exchanges, flowIssues, linkLabel, lostFlows, mapSummary, newFlow, newStep, processIssues, removeStep, reqGaps, soundFlow, stepCountFor, withReqIds } from './cartography';
import { defaultGed, emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { loadMapExample } from './mapExamples';

const now = new Date(2026, 9, 7, 10, 0);
const proc = (id: string, over: Partial<Process> = {}): Process => ({ id, name: `Processus ${id}`, color: '#000', order: Number(id.slice(1)), kpiIds: [], ...over });
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: ['P1', 'P2', 'P3'].map(i => proc(i)), kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ged: { ...defaultGed(), folders: [] }, ...over,
});
const step = (id: string, kind: FlowStep['kind'], label: string, over: Partial<FlowStep> = {}): FlowStep => ({ ...newStep(kind, kind === 'start' || kind === 'end' ? '' : 'Commercial'), id, label, ...over });
const flow = (id: string, steps: FlowStep[], over: Partial<Flow> = {}): Flow => ({ ...newFlow('P2', id.toUpperCase(), now), id, steps, ...over });
const texts = (f: Flow, s?: State) => flowIssues(f, s).map(i => i.text);

describe('flowIssues: new checks', () => {
  it('spots a call that comes back through other flowcharts (A -> B -> A) and names the chain', () => {
    const a = flow('a', [step('s', 'start', 'Début'), step('c', 'subprocess', 'Appel B', { flowId: 'b' }), step('e', 'end', 'Fin')]);
    const b = flow('b', [step('s', 'start', 'Début'), step('c', 'subprocess', 'Appel A', { flowId: 'a' }), step('e', 'end', 'Fin')]);
    const s = st({ flows: { a, b } });
    expect(texts(a, s)).toContain('appel circulaire : A -> B -> A');
    expect(flowIssues(a, s).find(i => /circulaire/.test(i.text))!.stepId).toBe('c');
    expect(texts(b, s)).toContain('appel circulaire : B -> A -> B');
    // a flowchart that calls into a loop without being part of it is not in the cycle, and a direct self-call keeps its own message only
    const c = flow('c', [step('s', 'start', 'Début'), step('x', 'subprocess', 'Appel A', { flowId: 'a' }), step('e', 'end', 'Fin')]);
    expect(texts(c, st({ flows: { a, b, c } })).some(t => /circulaire/.test(t))).toBe(false);
    const lone = flow('lone', [step('s', 'start', 'Début'), step('x', 'subprocess', 'Appel', { flowId: 'lone' }), step('e', 'end', 'Fin')]);
    expect(texts(lone, st({ flows: { lone } })).some(t => /circulaire/.test(t))).toBe(false);
  });
  it('flags a decision that is the last step when its first answer has nowhere to go', () => {
    const f = flow('f', [step('s', 'start', 'Début'), step('d', 'decision', 'Valider ?', { branches: [{ label: 'Oui', to: '' }, { label: 'Non', to: 's' }] })]);
    expect(texts(f).some(t => /première réponse \(« Oui »\) ne mène nulle part/.test(t))).toBe(true);
    const ok = flow('g', [step('s', 'start', 'Début'), step('d', 'decision', 'Valider ?', { branches: [{ label: 'Oui', to: 'e' }, { label: 'Non', to: 's' }] }), step('e', 'end', 'Fin')]);
    expect(texts(ok).some(t => /ne mène nulle part/.test(t))).toBe(false);
  });
  it('flags several starts, and a start that is not the first step', () => {
    const f = flow('f', [step('s', 'start', 'Début'), step('a', 'action', 'Faire'), step('s2', 'start', 'Autre début'), step('e', 'end', 'Fin')]);
    expect(flowIssues(f).filter(i => /un début est toujours la première étape/.test(i.text)).map(i => i.stepId)).toEqual(['s2']);
    expect(texts(flow('g', [step('s', 'start', 'Début'), step('e', 'end', 'Fin')])).some(t => /un début/.test(t))).toBe(false);
  });
  it('flags the answers of a decision that share a name or a target', () => {
    const same = flow('f', [step('s', 'start', 'Début'), step('d', 'decision', 'Valider ?', { branches: [{ label: 'Oui', to: 'e' }, { label: ' oui ', to: 's' }] }), step('e', 'end', 'Fin')]);
    expect(texts(same)).toContain('Valider ? : deux réponses portent le même nom');
    const target = flow('g', [step('s', 'start', 'Début'), step('d', 'decision', 'Valider ?', { branches: [{ label: 'Oui', to: 'e' }, { label: 'Non', to: 'e' }] }), step('e', 'end', 'Fin')]);
    expect(texts(target)).toContain('Valider ? : deux réponses mènent à la même étape');
    const fine = flow('h', [step('s', 'start', 'Début'), step('d', 'decision', 'Valider ?', { branches: [{ label: 'Oui', to: 'e' }, { label: 'Non', to: 's' }] }), step('e', 'end', 'Fin')]);
    expect(texts(fine).some(t => /deux réponses/.test(t))).toBe(false);
  });
});

describe('removeStep: the arrows that led to the step are listed', () => {
  it('says which steps pointed to it (goto, answers, yes/no) before they lose the arrow', () => {
    const steps = [step('a', 'action', 'A', { goto: 'z' }), step('d', 'decision', 'D ?', { branches: [{ label: 'Oui', to: 'z' }, { label: 'Non', to: 'a' }] }), step('y', 'action', 'Y', { yes: 'z' }), step('z', 'end', 'Z')];
    expect(arrowsInto(steps, 'z')).toEqual([1, 2, 3]);
    expect(arrowsInto(steps, 'a')).toEqual([2]);
    expect(arrowsInto(steps, 'nobody')).toEqual([]);
    const left = removeStep(steps, 'z');
    expect(left[0].goto).toBeUndefined();
    expect(left[1].branches![0].to).toBe('');
    expect(arrowsInto(left, 'z')).toEqual([]);
  });
});

describe('ids of requirements and steps', () => {
  it('reserves the ids already written before it makes the missing ones', () => {
    const made = withReqIds([{ kind: 'client', text: 'Délai' }])[0].id!;
    const out = withReqIds([{ kind: 'client', text: 'Délai' }, { kind: 'client', text: 'Délai', id: made }]);
    expect(out[1].id).toBe(made);               // the written id is kept…
    expect(out[0].id).not.toBe(made);           // …and the made one steps aside
    expect(new Set(out.map(r => r.id)).size).toBe(2);
    const dup = withReqIds([{ kind: 'client', text: 'a', id: 'x' }, { kind: 'legal', text: 'b', id: 'x' }]);
    expect(dup[0].id).toBe('x');
    expect(dup[1].id).not.toBe('x');
  });
  it('gives a new id to a step that repeats the id of another, in the flowchart and in its versions', () => {
    const f = soundFlow('f', { steps: [{ id: 'a', kind: 'action', label: '1', goto: 'a' }, { id: 'a', kind: 'action', label: '2' }, { id: 'b', kind: 'end', label: 'Fin' }], history: [{ version: 1, steps: [{ id: 'q', kind: 'action' }, { id: 'q', kind: 'action' }] }] });
    expect(new Set(f.steps.map(x => x.id)).size).toBe(3);
    expect(f.steps[0].id).toBe('a');            // the first keeps it: the arrows point to it
    expect(new Set(f.history[0].steps.map(x => x.id)).size).toBe(2);
  });
});

describe('flowcharts of a process that is gone', () => {
  it('lists them and counts them in the summary of the map', () => {
    const lost = flow('l', [step('s', 'start', 'Début'), step('e', 'end', 'Fin')], { processId: 'P99', name: 'Perdu' });
    const s = st({ flows: { l: lost, k: flow('k', [step('s', 'start', 'Début')]) } });
    expect(lostFlows(s).map(f => f.id)).toEqual(['l']);
    expect(mapSummary(s, now).lost).toBe(1);
    expect(mapSummary(st(), now).lost).toBe(0);
  });
});

describe('exchanges: one thing written twice, and the order of the map', () => {
  it('merges what differs by case or by a space, and sorts by the order of the processes (P2 before P10)', () => {
    const ps = [proc('P2', { order: 0 }), proc('P10', { order: 1 }), proc('P3', { order: 2 })];
    ps[0].outputs = [{ what: 'Commande', party: 'x', processId: 'P10' }, { what: ' commande ', party: 'y', processId: 'P10' }, { what: 'Plan', party: 'z', processId: 'P3' }];
    const s = st({ processes: ps });
    const e = exchanges(s);
    expect(e.map(x => `${x.from}>${x.to}`)).toEqual(['P2>P10', 'P2>P3']);
    expect(e[0].what).toEqual(['Commande']);
  });
});

describe('processIssues: an indicator that no longer exists', () => {
  it('does not read a deleted indicator as one without a target', () => {
    const p = proc('P2', { kpiIds: ['gone'] });
    const s = st({ processes: [p] });
    expect(processIssues(s, p, now).map(i => i.key)).toContain('kpi');          // none left
    expect(processIssues(s, p, now).map(i => i.key)).not.toContain('target');
    s.kpis.k1 = { id: 'k1', name: 'Délai', processId: 'P2', type: 'Moteur', unit: '', direction: 'higher', aggregation: 'avg', target: '', targetValue: null, confidential: false, source: '' };
    p.kpiIds = ['gone', 'k1'];
    const keys = processIssues(s, p, now).map(i => i.key);
    expect(keys).toContain('target');
    expect(keys).not.toContain('kpi');
  });
});

describe('links read straight by id', () => {
  it('names a record by its id, null when it is gone, empty for a whole tool', () => {
    const s = st();
    s.skills.k1 = { id: 'k1', name: 'Soudure', processId: 'P3', levels: {} } as never;
    expect(linkLabel(s, { tool: '4.2', id: 'k1' })).toBe('Soudure');
    expect(linkLabel(s, { tool: '4.2', id: 'zz' })).toBeNull();
    expect(linkLabel(s, { tool: '4.2' })).toBe('');
    expect(linkLabel(s, { tool: '9.9', id: 'k1' })).toBeNull();
  });
});

describe('reqGaps and the badge of the sheet say the same', () => {
  it('counts a requirement by its kind and words over the flowcharts: met anywhere, it is met', () => {
    const r1 = { kind: 'legal' as const, text: 'Archivage', id: 'r1' }, r2 = { kind: 'legal' as const, text: ' archivage ', id: 'r2' };
    const f1 = flow('f1', [step('s', 'start', 'Début'), step('a', 'action', 'A', { reqs: ['r1'] }), step('e', 'end', 'Fin')], { requirements: [r1] });
    const f2 = flow('f2', [step('s', 'start', 'Début'), step('e', 'end', 'Fin')], { requirements: [r2, { kind: 'client', text: 'Délai', id: 'r3' }] });
    const s = st({ flows: { f1, f2 } });
    expect(stepCountFor([f1, f2], r2)).toBe(1);
    expect(reqGaps(s, 'P2')).toBe(1);               // only « Délai » has no step; « Archivage » is met in f1 whichever flowchart writes it
  });
});

describe('loadMapExample: the example on an empty map', () => {
  it('creates the example processes with their flowcharts, and leaves existing processes alone', () => {
    const s = st({ processes: [] });
    loadMapExample(s, now);
    expect(s.processes.map(p => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
    expect(s.processes.every(p => p.name.trim())).toBe(true);
    expect(Object.keys(s.flows).length).toBeGreaterThan(10);
    expect(Object.values(s.flows).every(f => s.processes.some(p => p.id === f.processId))).toBe(true);
    const again = st({ processes: [proc('P2', { name: 'Mon commerce' })] });
    loadMapExample(again, now);
    expect(again.processes.find(p => p.id === 'P2')!.name).toBe('Mon commerce');
  });
});
