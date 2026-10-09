// Tool 1.4: creating and deleting processes, flowcharts (issues, layout, versions), review, rights, migration.
import { describe, expect, it } from 'vitest';
import type { Flow, Process, State } from './types';
import {
  moveKpi, moveRisk, branchesOf, callersOf, linkItems, linkLabel, orphanRights, partnersOf, readOnlyReason, registerProcesses, removeStep, reviewBlockers, rightKey, setMapRight,
  bandOf, canAdmin, canEditProcess, canSee, canDeleteProcess, completeness, deleteProcess, exitsOf, flowIssues, layoutFlow, mapSummary, newFlow, newProcess, newStep, nextProcessId,
  effectiveIo, effectiveRequirements, requirementSuggestions, sharedFlows, borrowedFlows, exchanges, withReqIds, reqGaps, flowDuplicates, dropFlowDuplicates, stepsMeeting, stepCountFor, pruneStepReqs, flowResources, processIssues, processUsage, reassignProcess, moveStep, restoreVersion, reviewProcess, rightOf, saveVersion, soundFlow, soundProcess, soundMap, bareName, plainName, personGone,
} from './cartography';
import { defaultGed, emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { normalize } from './migrate';
import { toolBadge } from './status';
import { demoState } from './templates';
import { applyMapExample } from './mapExamples';
import { allTasks } from './tasks';
import { defaultProcess, PROCESS_IDS, PROCESS_NAMES } from './base';
import { PROCESS_SHORT } from './team';
import { SERIES_COLORS, trendSeries } from './commercial';

const now = new Date(2026, 9, 7, 10, 0);
const proc = (id: string, over: Partial<Process> = {}): Process => ({ id, name: `Processus ${id}`, color: '#000', order: Number(id.slice(1)), kpiIds: [], ...over });
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: ['P1', 'P2', 'P3', 'P4', 'P5'].map(i => proc(i)), kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ged: { ...defaultGed(), folders: [] }, ...over,
});
const flow = (steps: Flow['steps'], over: Partial<Flow> = {}): Flow => ({ ...newFlow('P2', 'Devis', now), id: 'fl1', steps, ...over });
const step = (id: string, kind: Flow['steps'][number]['kind'], label: string, role = 'Commercial', over: object = {}) => ({ ...newStep(kind, role), id, label, ...over });

describe('processes: create, bands, delete', () => {
  it('gives a new process the next free code, never a code already used', () => {
    const s = st();
    expect(nextProcessId(s)).toBe('P6');
    s.flows.f = flow([], { processId: 'P9' });
    expect(nextProcessId(s)).toBe('P10');                       // the flow of a deleted P9 keeps the number taken
    const p = newProcess(s, '  Achats  ', 'support');
    expect(p).toMatchObject({ id: 'P10', name: 'Achats', band: 'support', order: 6, kpiIds: [] });
  });
  it('reads the band of the five original processes without being told', () => {
    expect(bandOf(proc('P1'))).toBe('management');
    expect(bandOf(proc('P4'))).toBe('support');
    expect(bandOf(proc('P7'))).toBe('realisation');
    expect(bandOf(proc('P1', { band: 'support' }))).toBe('support');
  });
  it('refuses to delete a process other tools still use, and says what uses it', () => {
    const s = st();
    s.ged = defaultGed();
    s.ncs.n1 = { id: 'n1', processId: 'P3' } as never;
    s.skills.k1 = { id: 'k1', processId: 'P3', levels: {} } as never;
    s.people.pp = { id: 'pp', name: 'Léa', role: '', active: true, processIds: ['P3'] };
    expect(processUsage(s, 'P3').map(u => `${u.n} ${u.label}`)).toEqual(['1 compétence', '1 personne rattachée', '1 dossier du plan de classement', '1 défaut']);
    expect(canDeleteProcess(s, 'P3')).toBe(false);
    expect(deleteProcess(s, 'P3')).toBe(false);
    expect(s.processes).toHaveLength(5);
  });
  it('deletes a free process with its own flowcharts', () => {
    const s = st();
    s.processes.push(proc('P6'));
    s.flows.a = flow([], { id: 'a', processId: 'P6' });
    s.flows.b = flow([], { id: 'b', processId: 'P2' });
    expect(deleteProcess(s, 'P6')).toBe(true);
    expect(s.processes.map(p => p.id)).not.toContain('P6');
    expect(Object.keys(s.flows)).toEqual(['b']);
  });
  it('blocks the deletion while a flowchart of another process calls one of its flowcharts', () => {
    const s = st();
    s.flows.a = flow([], { id: 'a', processId: 'P3' });
    s.flows.b = flow([step('x', 'subprocess', 'Fabriquer', 'Atelier', { flowId: 'a' })], { id: 'b', processId: 'P2' });
    expect(processUsage(s, 'P3').map(u => u.key)).toEqual(['called']);
  });
  it('moves the records of a process to another, then lets it be deleted', () => {
    const s = st();
    s.processes.push(proc('P6', { kpiIds: ['k'] }));
    s.kpis.k = { id: 'k', processId: 'P6' } as never;
    s.ncs.n1 = { id: 'n1', processId: 'P6' } as never;
    s.ged.folders.push({ code: '06_X', processId: 'P6', subfolders: [], rights: '' });
    s.people.pp = { id: 'pp', name: 'Léa', role: '', active: true, processIds: ['P6', 'P3'] };
    expect(reassignProcess(s, 'P6', 'P3')).toBe(4);
    expect(s.ncs.n1.processId).toBe('P3');
    expect(s.kpis.k.processId).toBe('P3');
    expect(s.processes.find(p => p.id === 'P3')!.kpiIds).toEqual(['k']);
    expect(s.people.pp.processIds).toEqual(['P3']);
    expect(deleteProcess(s, 'P6')).toBe(true);
    expect(reassignProcess(s, 'P3', 'P3')).toBe(0);
  });
});

describe('flowcharts', () => {
  const ok = () => [step('s', 'start', 'Demande reçue'), step('a', 'action', 'Chiffrer', 'Commercial'), step('d', 'decision', 'Marge suffisante ?', 'Direction', { no: 'a' }), step('e', 'end', 'Devis envoyé')];
  it('reads the next step of the list unless an arrow says otherwise', () => {
    const f = flow(ok());
    expect(exitsOf(f, 0)).toEqual([{ to: 'a', label: '' }]);
    expect(exitsOf(f, 2)).toEqual([{ to: 'e', label: 'Oui' }, { to: 'a', label: 'Non' }]);
    expect(exitsOf(f, 3)).toEqual([]);
  });
  it('finds nothing wrong with a sound flowchart', () => expect(flowIssues(flow(ok()))).toEqual([]));
  it('lists what is wrong in plain words', () => {
    const f = flow([step('a', 'action', '', ''), step('d', 'decision', 'Ok ?', 'Direction'), step('x', 'action', 'Orpheline', 'Direction', { goto: 'ghost' })]);
    const t = flowIssues(f).map(i => i.text);
    expect(t).toContain('La première étape doit être un début');
    expect(t).toContain('Aucune fin : où le processus s’arrête-t-il ?');
    expect(t).toContain('étape 1 : intitulé vide');
    expect(t).toContain('Ok ? : que se passe-t-il si la réponse est non ?');
    expect(t).toContain('Orpheline : la flèche pointe vers une étape qui n’existe plus');
    expect(flowIssues(flow([step('s', 'start', 'Début'), step('a', 'action', 'Dernière', 'Commercial')])).map(i => i.text)).toContain('Dernière : où va la flèche ensuite ? Ajouter une étape Fin, ou choisir « Puis aller à » dans ses détails');
    expect(flowIssues(flow([step('s', 'start', 'Début'), step('a', 'action', 'Boucle', 'Commercial', { goto: 's' }), step('z', 'action', 'Retour', 'Commercial', { goto: 'a' })])).map(i => i.text)).not.toContain('Retour : où va la flèche ensuite ?');
  });
  it('spots a step that no arrow reaches', () => {
    const f = flow([step('s', 'start', 'Début'), step('e', 'end', 'Fin', 'Commercial', { goto: undefined }), step('z', 'action', 'Perdue'), step('e2', 'end', 'Fin 2')]);
    expect(flowIssues(f).map(i => i.text)).toContain('Perdue : aucune flèche n’y mène. La relier depuis une étape (« Puis aller à ») ou la supprimer');
  });
  it('checks the sub-process, the indicator and the risk it points to', () => {
    const s = st();
    const f = flow([step('s', 'start', 'Début'), step('p', 'subprocess', 'Fabriquer', 'Atelier', { flowId: 'nope', links: [{ tool: '1.1', id: 'k' }, { tool: '1.2', id: 'r' }] }), step('q', 'subprocess', 'Soi-même', 'Atelier', { flowId: 'fl1' }), step('e', 'end', 'Fin')]);
    s.flows.fl1 = f;
    const t = flowIssues(f, s).map(i => i.text);
    expect(t).toContain('Fabriquer : logigramme appelé introuvable');
    expect(t).toContain('Fabriquer : indicateur lié introuvable');
    expect(t).toContain('Fabriquer : risque lié introuvable');
    expect(t).toContain('Soi-même : un logigramme ne peut pas s’appeler lui-même');
  });
  it('draws one column per role and one row per step, loops on the left', () => {
    const l = layoutFlow(flow(ok()));
    expect(l.lanes).toEqual(['Commercial', 'Direction']);          // start takes the lane of the next step, end the one of the previous
    expect(l.nodes.map(n => n.lane)).toEqual([0, 0, 1, 1]);
    expect(l.nodes.map(n => n.y)).toEqual([...l.nodes.map(n => n.y)].sort((a, b) => a - b));
    expect(l.edges).toHaveLength(4);
    expect(l.edges.filter(e => e.back).map(e => e.label)).toEqual(['Non']);   // the "no" goes back to "Chiffrer"
    expect(l.edges.every(e => e.d.startsWith('M'))).toBe(true);
    expect(l.width).toBeGreaterThan(2 * 210);
    expect(l.height).toBeGreaterThan(4 * 84);
  });
  it('draws an empty flowchart without failing', () => expect(layoutFlow({ steps: [] })).toMatchObject({ nodes: [], edges: [], lanes: [] }));
  it('keeps a version on purpose and puts an old one back without losing the current content', () => {
    const f = flow(ok(), { updatedBy: 'Ana', updatedAt: '2026-01-05' });
    saveVersion(f, 'Bob', 'Ajout de la décision', now);
    expect(f).toMatchObject({ version: 2, updatedBy: 'Bob', updatedAt: '2026-10-07' });
    expect(f.history).toHaveLength(1);
    f.steps.push(step('n', 'action', 'Nouvelle'));
    expect(restoreVersion(f, 1, 'Cara', now)).toBe(true);
    expect(f.steps).toHaveLength(4);
    expect(f.version).toBe(3);
    expect(f.history.at(-1)!.steps).toHaveLength(5);              // what was replaced is kept
    expect(restoreVersion(f, 99, 'Cara', now)).toBe(false);
  });
  it('keeps only the last twenty versions', () => {
    const f = flow(ok());
    for (let i = 0; i < 25; i++) saveVersion(f, 'x', '', now);
    expect(f.history).toHaveLength(20);
    expect(f.history[0].version).toBe(6);
  });
});

describe('lanes', () => {
  it('puts an end in the lane of the step that leads to it, not in a lane of its own', () => {
    const f = flow([step('s', 'start', 'Début'), step('d', 'decision', 'Ok ?', 'Direction', { no: 'h' }), step('i', 'end', 'Signée'), step('h', 'end', 'Abandonnée')]);
    const l = layoutFlow(f);
    expect(l.lanes).toEqual(['Direction']);
    expect(l.nodes.map(n => n.lane)).toEqual([0, 0, 0, 0]);
    expect(layoutFlow({ steps: [step('a', 'start', 'x', ''), step('b', 'end', 'y', '')] }).lanes).toEqual(['Sans rôle']);
  });
});

describe('decisions with any number of outcomes, and links to the other tools', () => {
  const three = () => flow([step('s', 'start', 'Début'), step('c', 'action', 'Lire', 'RH'), step('d', 'decision', 'Que décider ?', 'Direction', { branches: [{ label: 'Retenu', to: '' }, { label: 'À revoir', to: 'c' }, { label: 'Refusé', to: 'x' }] }), step('e', 'end', 'Fin'), step('x', 'end', 'Remercié')]);
  it('reads the outcomes of a decision with their own words and their own targets', () => {
    const f = three();
    expect(exitsOf(f, 2)).toEqual([{ to: 'e', label: 'Retenu' }, { to: 'c', label: 'À revoir' }, { to: 'x', label: 'Refusé' }]);   // the first outcome with no target is the next step
    expect(flowIssues(f)).toEqual([]);
    const l = layoutFlow(f);
    expect(l.edges.filter(e => e.from === 'd').map(e => e.label)).toEqual(['Retenu', 'À revoir', 'Refusé']);
    expect(l.edges.find(e => e.label === 'À revoir')!.back).toBe(true);
  });
  it('does not write the words of two arrows on top of each other', () => {
    const f = flow([step('s', 'start', 'Début'), step('d', 'decision', 'Que répond le client ?', 'Commercial', { branches: [{ label: 'Signé', to: 'i' }, { label: 'Négocier', to: 'a' }, { label: 'Silence', to: 'h' }, { label: 'Refus', to: 'h' }] }),
      step('a', 'action', 'Revoir', 'Direction'), step('x', 'action', 'Autre', 'Direction'), step('i', 'end', 'Signée'), step('h', 'end', 'Classée')]);
    const at = layoutFlow(f).edges.filter(e => e.from === 'd').map(e => `${e.lx},${e.ly}`);
    expect(new Set(at).size).toBe(at.length);
  });
  it('still reads the yes and no of the first version', () => {
    expect(branchesOf({ yes: 'a', no: 'b' })).toEqual([{ label: 'Oui', to: 'a' }, { label: 'Non', to: 'b' }]);
    expect(branchesOf({ branches: [] })).toEqual([{ label: 'Oui', to: '' }, { label: 'Non', to: '' }]);
  });
  it('says what is missing on an outcome: a target, a name, a second outcome', () => {
    const f = three(); f.steps[2].branches = [{ label: 'Retenu', to: '' }, { label: 'À revoir', to: '' }, { label: ' ', to: 'x' }];
    const t = flowIssues(f).map(i => i.text);
    expect(t).toContain('Que décider ? : que se passe-t-il pour « À revoir » ?');
    expect(t).toContain('Que décider ? : une réponse n’a pas de nom');
    f.steps[2].branches = [{ label: 'Seule', to: '' }];
    expect(flowIssues(f).map(i => i.text)).toContain('Que décider ? : une décision a au moins deux réponses');
  });
  it('turns the yes and no and the single links of the first version into outcomes and links when it reads them', () => {
    const f = soundFlow('f', { steps: [{ id: 'a', kind: 'decision', label: 'Ok ?', yes: 'b', no: 'c', toolId: '2.1', kpiId: 'k', riskId: 'r' }, { id: 'b', kind: 'action', label: 'B' }, { id: 'c', kind: 'end', label: 'C', links: [{ tool: '3.2', id: 'sop' }, { tool: '3.2', id: 'sop' }, { tool: 5 }] }] });
    expect(f.steps[0].branches).toEqual([{ label: 'Oui', to: 'b' }, { label: 'Non', to: 'c' }]);
    expect(f.steps[0].links).toEqual([{ tool: '2.1' }, { tool: '1.1', id: 'k' }, { tool: '1.2', id: 'r' }]);
    expect(f.steps[2].links).toEqual([{ tool: '3.2', id: 'sop' }]);          // twice the same link is one, a link with no tool is nothing
    expect(soundFlow('g', soundFlow('f', f)).steps).toEqual(f.steps);        // reading twice gives the same
  });
  it('lists the records a step can point to, says when one is gone, and finds who calls a flowchart', () => {
    const s = demoState(now);
    expect(linkItems(s, '4.2').length).toBeGreaterThan(0);
    expect(linkItems(s, '2.1')).toEqual([]);                                   // quotes are not what a process points to: the whole tool is linked
    const sk = Object.values(s.skills)[0];
    expect(linkLabel(s, { tool: '4.2', id: sk.id })).toBe(sk.name);
    expect(linkLabel(s, { tool: '4.2', id: 'gone' })).toBeNull();
    expect(linkLabel(s, { tool: '2.1' })).toBe('');
    expect(callersOf(s, 'fl_demo_7').map(f => f.id)).toEqual(['fl_demo_6']);
    expect(callersOf(s, 'fl_demo_1').map(f => f.id)).toEqual(['fl_demo_12']);
    expect(callersOf(s, 'fl_demo_20').map(f => f.id)).toEqual(['fl_demo_3']);
    expect(callersOf(s, 'fl_demo_16').map(f => f.id)).toEqual(['fl_demo_3']);
    expect(callersOf(s, 'fl_demo_22').map(f => f.id)).toEqual(['fl_demo_21']);
    expect(callersOf(s, 'fl_demo_6')).toEqual([]);
  });
  it('gives the example a flowchart with a three-outcome decision that calls another flowchart', () => {
    const s = demoState(now), f = s.flows.fl_demo_6;
    expect(branchesOf(f.steps.find(x => x.kind === 'decision')!).map(b => b.label)).toEqual(['Retenu', 'À revoir', 'Refusé']);
    expect(f.steps.find(x => x.kind === 'subprocess')!.flowId).toBe('fl_demo_7');
    expect(flowIssues(f, s)).toEqual([]);
    expect(flowIssues(s.flows.fl_demo_7, s)).toEqual([]);
  });
});

describe('the examples of flowcharts', () => {
  it('gives each of the five first processes four or five flowcharts, the two transverse ones one, all sound but the one that is wrong on purpose', () => {
    const s = demoState(now), per = (id: string) => Object.values(s.flows).filter(f => f.processId === id);
    expect(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(id => per(id).length)).toEqual([5, 5, 4, 5, 5, 1, 1]);
    Object.values(s.flows).forEach(f => { if (f.id !== 'fl_demo_4') expect(flowIssues(f, s), f.name).toEqual([]); });
    expect(Object.values(s.flows).flatMap(f => flowIssues(f, s)).map(i => i.text)).toEqual(['La cause est-elle à chercher ? : que se passe-t-il si la réponse est non ?']);
  });
  it('shows every kind of step, decisions with two, three and four outcomes, loops, sub-processes and links to many tools', () => {
    const steps = Object.values(demoState(now).flows).flatMap(f => f.steps), kinds = new Set(steps.map(x => x.kind));
    expect([...kinds].sort()).toEqual(['action', 'decision', 'document', 'end', 'start', 'subprocess']);
    expect([...new Set(steps.filter(x => x.kind === 'decision').map(x => branchesOf(x).length))].sort()).toEqual([2, 3, 4]);
    expect(new Set(steps.flatMap(x => (x.links || []).map(l => l.tool))).size).toBeGreaterThanOrEqual(14);
    expect(steps.filter(x => x.control).length).toBeGreaterThanOrEqual(8);
    Object.values(demoState(now).flows).forEach(f => expect(layoutFlow(f).nodes, f.name).toHaveLength(f.steps.length));
  });
});

const three2 = () => flow([step('s', 'start', 'Début'), step('c', 'action', 'Lire', 'RH'), step('d', 'decision', 'Que décider ?', 'Direction', { branches: [{ label: 'Retenu', to: '' }, { label: 'À revoir', to: 'c' }, { label: 'Refusé', to: 'x' }] }), step('e', 'end', 'Fin'), step('x', 'end', 'Remercié')]);

describe('moving a step', () => {
  it('moves a step to a position, keeps the others in order, and ignores a move that goes nowhere', () => {
    const a = ['a', 'b', 'c', 'd'];
    expect(moveStep(a, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveStep(a, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveStep(a, 1, 1)).toBe(a);
    expect(moveStep(a, -1, 2)).toBe(a);
    expect(moveStep(a, 1, 9)).toBe(a);
    expect(a).toEqual(['a', 'b', 'c', 'd']);                  // the list given is not changed
  });
});

describe('sheet checks, review, summary', () => {
  const full = (): State => {
    const s = st({ processes: [proc('P1', { pilotId: 'pp', purpose: 'Piloter', trigger: 'Début', result: 'Fin', inputs: [{ what: 'a', party: 'b' }], outputs: [{ what: 'a', party: 'b' }], kpiIds: ['k'], reviewedAt: '2026-09-01' })] });
    s.people.pp = { id: 'pp', name: 'Léa', role: '', active: true };
    s.kpis.k = { id: 'k', targetValue: 90 } as never;
    s.flows.f = flow([step('s', 'start', 'Début'), step('e', 'end', 'Fin')], { processId: 'P1' });
    return s;
  };
  it('has nothing to say about a complete sheet', () => {
    const s = full();
    expect(processIssues(s, s.processes[0], now)).toEqual([]);
    expect(completeness(s, s.processes[0], now)).toBe(100);
  });
  it('says what is missing on an empty sheet', () => {
    const s = st();
    expect(processIssues(s, s.processes[0], now).map(i => i.key)).toEqual(['pilot', 'purpose', 'trigger', 'io', 'flow', 'kpi', 'review']);
    expect(completeness(s, s.processes[0], now)).toBe(22);                       // 2 checks of 9 met: no flowchart issue, no target
  });
  it('flags a pilot who left, a missing target and an old review', () => {
    const s = full();
    s.people.pp.active = false;
    s.kpis.k.targetValue = null;
    s.processes[0].reviewedAt = '2025-06-01';
    const t = processIssues(s, s.processes[0], now);
    expect(t.map(i => i.key)).toEqual(['pilot', 'target', 'review']);
    expect(t[0].text).toBe('Léa n’est plus dans l’entreprise : nommer un autre pilote');
    s.params.map = { reviewMonths: 24 };
    expect(processIssues(s, s.processes[0], now).map(i => i.key)).toEqual(['pilot', 'target']);
  });
  it('records a review and keeps the last twelve', () => {
    const p = proc('P1');
    for (let i = 0; i < 14; i++) reviewProcess(p, 'Léa', `r${i}`, now);
    expect(p).toMatchObject({ reviewedAt: '2026-10-07', reviewedBy: 'Léa' });
    expect(p.reviews).toHaveLength(12);
    expect(p.reviews![0].note).toBe('r2');
  });
  it('sums the map and feeds the badge of the tool', () => {
    const s = st();
    expect(mapSummary(s, now)).toMatchObject({ started: false, count: 5, noPilot: 5, noFlow: 5, old: 5 });
    expect(toolBadge(s, '1.4', '2026-10', now).tone).toBe('pending');            // five empty sheets are not a map yet
    s.processes[0].purpose = 'Piloter';
    expect(toolBadge(s, '1.4', '2026-10', now)).toMatchObject({ n: 5, tone: 'alert', text: '5 processus sans pilote' });
    const g = full();
    expect(toolBadge(g, '1.4', '2026-10', now)).toMatchObject({ n: 0, tone: 'ok', text: 'Carte complète à 100 %' });
    expect(toolBadge(st({ processes: [] }), '1.4', '2026-10', now).tone).toBe('pending');
  });
});

describe('rights', () => {
  const s = st();
  s.people.pp = { id: 'pp', name: 'Léa', role: '', active: true };
  s.people.pd = { id: 'pd', name: 'Max', role: '', active: true };
  s.processes[1].pilotId = 'pp'; s.processes[1].deputyId = 'pd';
  it('lets everybody administer while no table is set (one user)', () => {
    expect(rightOf(s, 'Quelqu’un')).toBe('admin');
    expect(canAdmin(s, '')).toBe(true);
  });
  it('reads the table by name, and a person who is not in it only views', () => {
    s.params.map = { rights: { 'léa': 'own', 'max': 'own', 'direction': 'admin', 'stagiaire': 'none' } };
    expect(rightOf(s, ' Léa ')).toBe('own');
    expect(rightOf(s, 'Inconnu')).toBe('view');
    expect(canAdmin(s, 'Direction')).toBe(true);
    expect(canAdmin(s, 'Léa')).toBe(false);
  });
  it('lets a pilot or a deputy edit their own process only', () => {
    expect(canEditProcess(s, s.processes[1], 'Léa')).toBe(true);
    expect(canEditProcess(s, s.processes[1], 'max')).toBe(true);
    expect(canEditProcess(s, s.processes[2], 'Léa')).toBe(false);
    expect(canEditProcess(s, s.processes[2], 'Direction')).toBe(true);
    expect(canEditProcess(s, s.processes[1], 'Stagiaire')).toBe(false);
  });
  it('hides the three blocks from the team until the company shows them', () => {
    expect(canSee(s, 'Inconnu', 'targets')).toBe(false);
    expect(canSee(s, 'Léa', 'targets')).toBe(true);
    s.params.map!.shown = ['notes'];
    expect(canSee(s, 'Inconnu', 'notes')).toBe(true);
    expect(canSee(s, 'Inconnu', 'risks')).toBe(false);
  });
});

describe('data of another version', () => {
  it('reads a damaged sheet and flowchart field by field', () => {
    const p = soundProcess({ ...proc('P1'), purpose: 4, band: 'sideways', inputs: [{ what: 3, party: 'x' }, null], requirements: [{ kind: 'zzz', text: 'ISO' }], docs: 'nope', reviews: [{ at: 1 }] } as never);
    expect(p).toMatchObject({ inputs: [{ what: '', party: 'x' }], requirements: [{ kind: 'other', text: 'ISO' }], reviews: [{ at: '', by: '', note: '' }] });
    expect(p.purpose).toBeUndefined(); expect(p.band).toBeUndefined(); expect(p.docs).toBeUndefined();
    const f = soundFlow('fx', { steps: [{ kind: 'weird', label: 7 }, null], version: -3, history: [null, { version: 1, steps: 'no' }] });
    expect(f).toMatchObject({ id: 'fx', version: 1, steps: [{ kind: 'action', label: '', role: '' }, { kind: 'action' }], history: [{ version: 1, steps: [] }] });
  });
  it('normalizes a saved state: flows exist, sheets are read, nothing is lost', () => {
    const old = { ...st(), flows: undefined } as unknown as State;
    expect(normalize(old).flows).toEqual({});
    const s = st(); s.flows.f = flow([step('s', 'start', 'Début')], { processId: 'P2' });
    s.processes[0] = { ...s.processes[0], purpose: 'Piloter' };
    const n = normalize(s);
    expect(n.flows.f.steps[0]).toMatchObject({ id: 's', label: 'Début' });
    expect(n.processes[0].purpose).toBe('Piloter');
  });
});

describe('example of the fictitious company', () => {
  const demo = () => demoState(now);
  it('gives the demo a map where three sheets are complete and each alert is shown once', () => {
    const s = demo();
    const keys = (id: string) => processIssues(s, s.processes.find(p => p.id === id)!, now).map(i => i.key);
    expect(keys('P1')).toEqual([]);
    expect(keys('P2')).toEqual([]);
    expect(keys('P3')).toEqual([]);
    expect(keys('P4')).toEqual(['io', 'review']);              // no inputs, never reviewed
    expect(keys('P5')).toEqual(['io', 'flowissues', 'review']);        // no outputs, a decision without "no", reviewed 420 days ago
    expect(Object.values(s.flows).flatMap(f => flowIssues(f, s)).map(i => i.text)).toEqual(['La cause est-elle à chercher ? : que se passe-t-il si la réponse est non ?']);
    expect(toolBadge(s, '1.4', '2026-10', now).tone).not.toBe('pending');
  });
  it('draws every flowchart of the example and lets the sub-process find its target', () => {
    const s = demo();
    Object.values(s.flows).forEach(f => { const l = layoutFlow(f); expect(l.nodes).toHaveLength(f.steps.length); expect(l.edges.length).toBeGreaterThanOrEqual(f.steps.length - 2); });
    expect(s.flows.fl_demo_3.steps.filter(x => x.kind === 'subprocess').map(x => x.flowId)).toEqual(['fl_demo_16', 'fl_demo_20']);   // the delivery is received, a defective part is handled: by other flowcharts
    expect(s.flows.fl_demo_12.steps.find(x => x.kind === 'subprocess')!.flowId).toBe('fl_demo_1');
    expect(processUsage(s, 'P5').some(u => u.key === 'called')).toBe(true);        // flowchart 3 (P3) calls flowchart 20 (P5)
  });
  it('is completed once on a saved fictitious company, never on a real one, and never over what the company wrote', () => {
    const saved = demo();
    saved.flows = {}; saved.processes.forEach(p => { delete p.pilotId; delete p.purpose; }); delete saved.params.mapExampleLevel;
    saved.processes[0].purpose = 'Ma finalité';
    const n = normalize(saved);
    expect(n.processes[0].purpose).toBe('Ma finalité');
    expect(n.processes[1].pilotId).toBe('pp_demo_lb');
    expect(Object.keys(n.flows)).toHaveLength(26);
    expect(n.params.mapExampleLevel).toBe(17);
    // an example flowchart saved by an earlier version is brought up to date, unless the company marked a version of it
    const old = normalize({ ...n, params: { ...n.params, mapExampleLevel: 1 } });
    old.flows.fl_demo_3 = { ...old.flows.fl_demo_3, steps: old.flows.fl_demo_3.steps.slice(0, 2) };
    old.flows.fl_demo_8 = { ...old.flows.fl_demo_8, name: 'Le mien', version: 3, history: [{ version: 2, at: '', by: '', note: '', name: '', trigger: '', steps: [] }] };
    old.params = { ...old.params, mapExampleLevel: 1 };
    const up = normalize(old);
    expect(up.flows.fl_demo_3.steps.length).toBeGreaterThan(5);
    expect(up.flows.fl_demo_8.name).toBe('Le mien');
    const again = normalize({ ...n, flows: {} });
    expect(Object.keys(again.flows)).toHaveLength(0);          // done once: a flowchart the company deleted does not come back
    const real = st(); real.settings.companyName = 'Ma société';
    expect(Object.keys(normalize(real).flows)).toHaveLength(0);
  });
});

describe('rights: nobody locks the map, the last administrator stays', () => {
  const person = (id: string, name: string, active = true) => ({ id, name, role: '', active });
  const world = () => { const s = st(); s.people = { a: person('a', 'Anne'), b: person('b', 'Bruno'), c: person('c', 'Chloé') }; return s; };
  it('makes the person who gives the first right to somebody else an administrator, so she is not locked out', () => {
    const s = world();
    expect(setMapRight(s, 'Anne', 'Bruno', 'view')).toBe('');
    expect(s.params.map!.rights).toEqual({ bruno: 'view', anne: 'admin' });
    expect(canAdmin(s, 'Anne')).toBe(true);
    expect(canAdmin(s, 'Bruno')).toBe(false);
  });
  it('refuses to give rights without a name, to lower the only administrator, and to start by lowering oneself', () => {
    const s = world();
    expect(setMapRight(s, '  ', 'Bruno', 'own')).toMatch(/Renseignez/);
    expect(s.params.map?.rights).toBeUndefined();
    expect(setMapRight(s, 'Anne', 'Anne', 'view')).toMatch(/seul à pouvoir administrer/);
    setMapRight(s, 'Anne', 'Bruno', 'own');
    expect(setMapRight(s, 'Anne', 'Anne', 'own')).toBe('Il faut garder au moins un administrateur.');
    expect(rightOf(s, 'Anne')).toBe('admin');
    setMapRight(s, 'Anne', 'Chloé', 'admin');
    expect(setMapRight(s, 'Anne', 'Anne', 'own')).toBe('');                       // with a second administrator it is allowed
    expect(setMapRight(s, 'Chloé', 'Chloé', '')).toBe('Il faut garder au moins un administrateur.');
  });
  it('reads a name with spaces and capitals the way it was written, and gives the right to the same person', () => {
    const s = world();
    setMapRight(s, 'Anne', ' BRUNO ', 'own');
    expect(rightKey(' BRUNO ')).toBe('bruno');
    expect(rightOf(s, 'bruno')).toBe('own');
    expect(rightOf(s, '  Bruno ')).toBe('own');
  });
  it('lists the rights of a name that left the staff list, so that they can be taken back', () => {
    const s = world();
    setMapRight(s, 'Anne', 'Bruno', 'own'); setMapRight(s, 'Anne', 'Zoé', 'view');
    expect(orphanRights(s)).toEqual(['zoé']);
    s.people.b.active = false;
    expect(orphanRights(s).sort()).toEqual(['bruno', 'zoé']);
  });
  it('lets a pilot or a deputy edit only while they are in the company', () => {
    const s = world(); s.processes[1].pilotId = 'a'; s.processes[1].deputyId = 'b';
    setMapRight(s, 'Anne', 'Bruno', 'own'); setMapRight(s, 'Anne', 'Anne', 'admin');
    s.params.map!.rights!.anne = 'own';
    expect(canEditProcess(s, s.processes[1], 'Bruno')).toBe(true);
    s.people.b.active = false;
    expect(canEditProcess(s, s.processes[1], 'Bruno')).toBe(false);
  });
  it('says why a sheet is read only', () => {
    const s = world();
    expect(readOnlyReason(s, '')).toMatch(/Aucun nom/);
    setMapRight(s, 'Anne', 'Bruno', 'view');
    expect(readOnlyReason(s, 'Bruno')).toMatch(/« Consulter »/);
    setMapRight(s, 'Anne', 'Chloé', 'own');
    expect(readOnlyReason(s, 'Chloé')).toMatch(/Seuls le pilote/);
  });
});

describe('processes: the last one stays, links are cleaned, names and deputies are checked', () => {
  it('never deletes the last process', () => {
    const s = st({ processes: [proc('P1')] });
    expect(canDeleteProcess(s, 'P1')).toBe(false);
    expect(deleteProcess(s, 'P1')).toBe(false);
    expect(s.processes).toHaveLength(1);
  });
  it('cleans the links of the other processes when one is deleted or its records move', () => {
    const s = st();
    s.processes[1].inputs = [{ what: 'Commande', party: 'Commercial', processId: 'P3' }];
    s.processes[0].outputs = [{ what: 'Plan', party: 'Atelier', processId: 'P3' }];
    expect(partnersOf(s, s.processes[2]).map(p => p.id)).toEqual(['P1', 'P2']);   // the link is read from both sides
    reassignProcess(s, 'P3', 'P4');
    expect(s.processes[1].inputs![0].processId).toBe('P4');
    expect(deleteProcess(s, 'P4')).toBe(true);
    expect(s.processes[1].inputs![0]).toEqual({ what: 'Commande', party: 'Commercial' });   // the words stay, the link goes
    expect(s.processes[0].outputs![0].processId).toBeUndefined();
  });
  it('flags a process without a name, a deputy who is the pilot or who left, and blank input lines', () => {
    const s = st({ processes: [proc('P1', { name: ' ', pilotId: 'a', deputyId: 'a', inputs: [{ what: ' ', party: '' }], outputs: [{ what: 'x', party: '' }], trigger: 'a', result: 'b' })] });
    s.people.a = { id: 'a', name: 'Anne', role: '', active: true };
    expect(processIssues(s, s.processes[0], now).map(i => i.key)).toEqual(['name', 'deputy', 'purpose', 'io', 'flow', 'kpi', 'review']);
    s.processes[0].deputyId = 'gone';
    expect(processIssues(s, s.processes[0], now).find(i => i.key === 'deputy')!.text).toMatch(/n’est plus dans la liste/);
    s.processes[0].trigger = '';
    expect(processIssues(s, s.processes[0], now).map(i => i.key)).toContain('trigger');
  });
  it('blocks a one-click review for what is in red, not for what is only to complete', () => {
    const s = st(); s.people.a = { id: 'a', name: 'Anne', role: '', active: true };
    expect(reviewBlockers(s, s.processes[0], now).map(i => i.key)).toEqual(['pilot']);
    s.processes[0].pilotId = 'a';
    expect(reviewBlockers(s, s.processes[0], now)).toEqual([]);
    s.people.a.active = false;
    expect(reviewBlockers(s, s.processes[0], now).map(i => i.key)).toEqual(['pilot']);
  });
});

describe('flowcharts: removing a step, loops with no way out, quick entry traps, loops drawn', () => {
  it('clears every arrow that led to a removed step, the answers of a decision included', () => {
    const f = three2();
    const left = removeStep(f.steps, 'x');
    expect(left.find(x => x.id === 'd')!.branches).toEqual([{ label: 'Retenu', to: '' }, { label: 'À revoir', to: 'c' }, { label: 'Refusé', to: '' }]);
    expect(removeStep([{ ...step('a', 'action', 'A'), goto: 'z' }, step('z', 'end', 'Z')], 'z')[0].goto).toBeUndefined();
    expect(f.steps).toHaveLength(5);                                                  // the list given is not changed
  });
  it('spots a loop that no arrow leaves, and says once that a sub-process has no flowchart', () => {
    const loop = flow([step('s', 'start', 'Début'), step('a', 'action', 'A', 'R'), step('b', 'action', 'B', 'R', { goto: 'a' }), step('e', 'end', 'Fin')]);
    loop.steps[1].goto = 'b';                                                          // a -> b -> a, the end is never reached
    expect(flowIssues(loop).map(i => i.text)).toContain('Aucun chemin n’arrive à une fin : le processus tourne sans s’arrêter');
    const sub = flow([step('s', 'start', 'Début'), step('p', 'subprocess', 'Fabriquer', 'Atelier'), step('e', 'end', 'Fin')]);
    const t = flowIssues(sub, st()).map(i => i.text).filter(x => x.startsWith('Fabriquer'));
    expect(t).toEqual(['Fabriquer : quel logigramme appelle-t-elle ? À choisir dans ses détails']);
  });
  it('gives the channel of every backward arrow room on the left, even with many loops', () => {
    const steps = [step('s', 'start', 'Début')];
    for (let i = 0; i < 7; i++) steps.push(step(`a${i}`, 'action', `Étape ${i}`, 'R', { goto: i === 0 ? undefined : 'a0' }));
    steps.push(step('e', 'end', 'Fin'));
    steps[steps.length - 2].goto = 'e';
    const l = layoutFlow({ steps });
    const xs = l.edges.flatMap(e => (e.d.match(/-?\d+(\.\d+)?/g) || []).map(Number));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(l.edges.filter(e => e.back).length).toBeGreaterThanOrEqual(5);
    expect(l.left).toBeGreaterThan(layoutFlow({ steps: steps.slice(0, 2) }).left);
  });
  it('registers the processes of the map for the other tools, then gives them back', () => {
    const was = { ids: [...PROCESS_IDS], names: { ...PROCESS_NAMES }, short: { ...PROCESS_SHORT } };
    registerProcesses([proc('P7', { name: 'P7 · Achats', order: 2 }), proc('P1', { name: 'Direction, Stratégie & Pilotage', order: 1 }), proc('P2', { name: 'Atelier', order: 3 })]);
    expect(PROCESS_IDS).toEqual(['P1', 'P7', 'P2']);
    expect(PROCESS_NAMES.P7).toBe('Achats');
    expect(PROCESS_SHORT).toMatchObject({ P1: 'Direction', P7: 'Achats', P2: 'Atelier' });
    registerProcesses(undefined);
    expect(PROCESS_IDS).toEqual(['P1', 'P7', 'P2']);
    PROCESS_IDS.splice(0, PROCESS_IDS.length, ...was.ids);
    [PROCESS_NAMES, PROCESS_SHORT].forEach(o => Object.keys(o).forEach(k => { delete o[k]; }));
    Object.assign(PROCESS_NAMES, was.names); Object.assign(PROCESS_SHORT, was.short);
  });
});

describe('tasks of the map', () => {
  it('asks for a pilot when a started process has none or has lost them, and for a review when it is old', () => {
    const s = demoState(now);
    const texts = () => allTasks(s, now).filter(t => t.tool === '1.4').map(t => `${t.who || '—'} · ${t.text}`);
    expect(texts().map(t => t.split(' · ')[0]).sort()).toEqual(['Antoine P.', 'Hélène R.']);   // the example: P4 was never reviewed, P5 is 420 days old
    expect(texts().every(t => t.includes('Relire la fiche du processus'))).toBe(true);
    s.processes[1].reviewedAt = '2024-01-01';
    expect(texts().some(t => t.startsWith('Laurent B. · Relire la fiche du processus Commercial'))).toBe(true);
    s.people[s.processes[1].pilotId!].active = false;
    expect(texts().some(t => t.startsWith('— · Nommer un pilote pour le processus Commercial'))).toBe(true);
    expect(texts().some(t => t.startsWith('Laurent B.'))).toBe(false);
    const blank = st();
    expect(allTasks(blank, now).filter(t => t.tool === '1.4')).toEqual([]);   // five empty sheets are not a map yet
  });
});

describe('attaching indicators and risks, document tools', () => {
  it('moves an indicator to another process: its process, the lists of both processes', () => {
    const s = st({ processes: [proc('P1', { kpiIds: ['k'] }), proc('P2')] });
    s.kpis.k = { id: 'k', processId: 'P1' } as never;
    expect(moveKpi(s, 'k', 'P2')).toBe(true);
    expect(s.kpis.k.processId).toBe('P2');
    expect(s.processes.map(p => p.kpiIds)).toEqual([[], ['k']]);
    expect(moveKpi(s, 'k', 'P2')).toBe(true);                                   // again: not listed twice
    expect(s.processes[1].kpiIds).toEqual(['k']);
    expect(moveKpi(s, 'gone', 'P1')).toBe(false);
    expect(moveKpi(s, 'k', 'P9')).toBe(false);
  });
  it('moves a risk to another process', () => {
    const s = st(); s.risks.r = { id: 'r', processId: 'P1' } as never;
    expect(moveRisk(s, 'r', 'P3')).toBe(true);
    expect(s.risks.r.processId).toBe('P3');
    expect(moveRisk(s, 'r', 'P99')).toBe(false);
    expect(moveRisk(s, 'none', 'P1')).toBe(false);
  });
  it('reads the document tools of a sheet field by field, and drops the SWOT of an earlier version', () => {
    const p = soundProcess({ ...proc('P1'), docLinks: [{ tool: '2.1' }, { tool: 3 }, null, { tool: '3.2', id: 'sop' }], swot: { strengths: ['a'] } } as never);
    expect(p.docLinks).toEqual([{ tool: '2.1' }, { tool: '3.2', id: 'sop' }]);
    expect('swot' in p).toBe(false);
    expect(soundProcess({ ...proc('P1'), docLinks: [] } as never).docLinks).toBeUndefined();
  });
  it('gives the example processes their equipment, document tools, only where the company holds the equipment', () => {
    const s = demoState(now);
    expect(s.processes.find(p => p.id === 'P3')!.equipmentIds).toContain('eq_demo_cnc');
    expect(s.processes.find(p => p.id === 'P2')!.docLinks!.map(l => l.tool)).toEqual(['2.1', '2.3', '2.4']);
    const bare = { processes: [proc('P3')], flows: {}, people: {}, params: {}, settings: { ...demoState(now).settings }, equipments: {} } as never as Parameters<typeof applyMapExample>[0];
    applyMapExample(bare, now);
    expect(bare.processes[0].equipmentIds).toBeUndefined();
    expect(bare.processes[0].docLinks!.length).toBeGreaterThan(0);               // the document tools do not depend on the equipment
  });
});

describe('flowcharts linked to the other tools, as a whole', () => {
  it('reads the links of a flowchart field by field, keeps them in a version, and puts them back', () => {
    const f = soundFlow('f', { steps: [], links: [{ tool: '3.3', id: 'eq' }, { tool: 4 }, null, { tool: '2.1' }] });
    expect(f.links).toEqual([{ tool: '3.3', id: 'eq' }, { tool: '2.1' }]);
    expect(soundFlow('g', { steps: [], links: [] }).links).toBeUndefined();
    saveVersion(f, 'Ana', 'avant', now);
    f.links = undefined;
    expect(restoreVersion(f, 1, 'Ana', now)).toBe(true);
    expect(f.links).toEqual([{ tool: '3.3', id: 'eq' }, { tool: '2.1' }]);
    expect(f.history.at(-1)!.links).toBeUndefined();                              // the content put aside had none
  });
  it('proposes first the records of the process the link is written for', () => {
    const s = demoState(now);
    const eq = linkItems(s, '3.3', 'P3'), kpi = linkItems(s, '1.1', 'P2');
    expect(eq.filter(x => x.mine).map(x => x.id)).toEqual(expect.arrayContaining(['eq_demo_cnc', 'eq_demo_plieuse']));
    expect(eq.findIndex(x => !x.mine)).toBeGreaterThan(eq.map(x => x.mine).lastIndexOf(true));   // the others come after
    expect(kpi.some(x => x.mine)).toBe(true);
    expect(linkItems(s, '1.1').every(x => !x.mine)).toBe(true);                   // no process: no preference
    expect(linkItems(s, '2.1', 'P2')).toEqual([]);
  });
  it('gives the example flowcharts links to equipment and tools, none of them required, and keeps only the equipment the company holds', () => {
    const s = demoState(now);
    expect(s.flows.fl_demo_3.links).toEqual([{ tool: '3.3', id: 'eq_demo_cnc' }, { tool: '3.3', id: 'eq_demo_plieuse' }, { tool: '3.2' }, { tool: '1.1', id: 'kpi_otif' }, { tool: '1.2', id: 'risk_demo_lot' }]);
    expect(s.flows.fl_demo_13.links).toBeUndefined();
    Object.values(s.flows).forEach(f => expect(flowIssues(f, s)).toEqual(f.id === 'fl_demo_4' ? flowIssues(f, s) : []));
    const bare = { processes: [proc('P3')], flows: {}, people: {}, params: {}, settings: { ...s.settings }, equipments: {} } as never as Parameters<typeof applyMapExample>[0];
    applyMapExample(bare, now);
    expect(bare.flows.fl_demo_3.links).toEqual([{ tool: '3.2' }]);                // the equipment is not there: its links are dropped, the others stay
  });
});

describe('the sheet of a flowchart feeds the sheet of its process', () => {
  it('gathers inputs, outputs and requirements from the flowcharts with their source, without repeating a line', () => {
    const s = demoState(now), p2 = s.processes.find(p => p.id === 'P2')!, io = effectiveIo(s, p2);
    expect(io.inputs.map(x => x.item.what)).toContain('Demande de prix');
    expect(io.inputs.find(x => x.item.what === 'Demande de prix')!.flows.map(f => f.id)).toEqual(['fl_demo_1']);
    expect(io.outputs.find(x => x.item.what === 'Commande signée')!.flows.map(f => f.id).sort()).toEqual(['fl_demo_1', 'fl_demo_11']);
    expect(effectiveRequirements(s, p2).some(x => x.item.kind === 'client' && x.flows.length > 0)).toBe(true);
  });
  it('keeps what the process says itself, with no flowchart behind it', () => {
    const s = demoState(now), p1 = s.processes.find(p => p.id === 'P1')!, io = effectiveIo(s, p1);
    expect(io.inputs.some(x => x.flows.length === 0)).toBe(true);
  });
  it('lets a process with inputs and outputs only in its flowcharts pass the check, and keeps the others in alert', () => {
    const s = demoState(now), by = (id: string) => processIssues(s, s.processes.find(p => p.id === id)!).map(i => i.key);
    expect(by('P2')).toEqual([]);
    expect(by('P3')).toEqual([]);
    expect(by('P4')).toContain('io');
  });
  it('lists the equipment and documents of the steps of the flowcharts', () => {
    const s = demoState(now), r = flowResources(s, s.processes.find(p => p.id === 'P3')!);
    expect(r.equipments.length).toBeGreaterThan(0);
    expect(r.equipments.every(e => e.flows.length > 0)).toBe(true);
  });
  it('makes the process partners from the flowcharts', () => {
    const s = demoState(now);
    expect(partnersOf(s, s.processes.find(p => p.id === 'P3')!).map(p => p.id)).toContain('P2');
  });
  it('sanitizes the new fields of a flowchart read from another version', () => {
    const s = demoState(now), f = { ...s.flows.fl_demo_1, inputs: 'x', purpose: 3, requirements: [{ kind: 'client', text: 'ok' }, 4] } as unknown as Flow, g = soundFlow('fl_demo_1', f);
    expect(g.inputs ?? []).toEqual([]);
    expect(g.purpose).toBeUndefined();
    expect(g.requirements).toEqual([{ kind: 'client', text: 'ok', id: expect.stringMatching(/^rq_/) }]);
  });
});

describe('requirement suggestions', () => {
  it('offers the requirements of the process first, then the common ones, and never one already written', () => {
    const all = requirementSuggestions('P2', []);
    expect(all[0].text).toBe('Mentions obligatoires des devis et des factures');
    expect(all.some(x => x.text === 'Délai promis au client')).toBe(true);
    const left = requirementSuggestions('P2', [{ kind: 'legal', text: ' mentions obligatoires des devis et des factures ' }]);
    expect(left.some(x => x.text.startsWith('Mentions obligatoires'))).toBe(false);
  });
  it('gives a process of the company that is not in the base the common list only', () => {
    expect(requirementSuggestions('P9', []).every(x => requirementSuggestions('P1', []).some(y => y.text === x.text))).toBe(true);
    expect(requirementSuggestions('P9', []).length).toBeGreaterThan(0);
  });
});

describe('transverse processes', () => {
  it('shows a requirement marked for every process on the sheet of the others, with where it is written, and not twice', () => {
    const s = demoState(now), p1 = s.processes.find(p => p.id === 'P1')!, p3 = s.processes.find(p => p.id === 'P3')!;
    p1.requirements = [{ kind: 'legal', text: 'Protection des données personnelles', all: true }, { kind: 'internal', text: 'Seulement pour P1' }];
    s.flows.fl_demo_3.requirements = [...(s.flows.fl_demo_3.requirements || []), { kind: 'legal', text: 'protection des données personnelles' }];
    const got = effectiveRequirements(s, p3).filter(x => /données personnelles/i.test(x.item.text));
    expect(got).toHaveLength(1);
    expect(effectiveRequirements(s, p3).some(x => x.item.text === 'Seulement pour P1')).toBe(false);
    expect(effectiveRequirements(s, s.processes.find(p => p.id === 'P2')!).find(x => /données personnelles/i.test(x.item.text))!.via?.id).toBe('P1');
  });
  it('keeps the flag of a requirement when a sheet is read', () => {
    expect(soundProcess({ ...proc('P1'), requirements: [{ kind: 'legal', text: 'x', all: true }, { kind: 'legal', text: 'y', all: 'oui' }] } as never).requirements).toEqual([{ kind: 'legal', text: 'x', all: true }, { kind: 'legal', text: 'y' }]);
  });
  it('knows a fourth band, and keeps a process there', () => {
    const s = demoState(now);
    expect(bandOf(s.processes.find(p => p.id === 'P5')!)).toBe('transverse');
    expect(soundProcess({ ...proc('P6'), band: 'transverse' } as never).band).toBe('transverse');
    expect(soundProcess({ ...proc('P6'), band: 'autre' } as never).band).toBeUndefined();
  });
  it('lists the flowcharts a process gives to the others and those it borrows', () => {
    const s = demoState(now);
    s.flows.fl_demo_2.steps.push({ id: 'st_x', kind: 'subprocess', label: 'Analyser le défaut', role: 'Qualité', flowId: 'fl_demo_4' });
    const given = sharedFlows(s, 'P5');
    expect(given.map(x => x.flow.id)).toContain('fl_demo_4');
    expect(given.find(x => x.flow.id === 'fl_demo_4')!.callers.map(c => c.id)).toContain('fl_demo_2');
    expect(borrowedFlows(s, 'P2').map(x => x.flow.id)).toContain('fl_demo_4');
    expect(sharedFlows(s, 'P2').every(x => x.callers.every(c => c.processId !== 'P2'))).toBe(true);
  });
});

describe('the quality process of a saved example', () => {
  it('moves from the support band to the transverse band once, when the example level goes up', () => {
    const s = demoState(now), old = { ...s, processes: s.processes.map(p => (p.id === 'P5' ? { ...p, band: 'support' as const } : { ...p })), params: { ...s.params, mapExampleLevel: 11 } };
    expect(bandOf(old.processes.find(p => p.id === 'P5')!)).toBe('support');
    const up = normalize(old);
    expect(bandOf(up.processes.find(p => p.id === 'P5')!)).toBe('transverse');
    up.processes.find(p => p.id === 'P5')!.band = 'support';
    expect(bandOf(normalize(up).processes.find(p => p.id === 'P5')!)).toBe('support');   // level already up: the company's choice stays
  });
});

describe('exchanges between processes', () => {
  it('lists what goes from a process to another, once per direction, from the flowcharts', () => {
    const e = exchanges(demoState(now)), p2p3 = e.find(x => x.from === 'P2' && x.to === 'P3')!;
    expect(p2p3.what).toContain('Commande signée');
    expect(e.find(x => x.from === 'P3' && x.to === 'P2')!.what).toContain('Délais et capacité de fabrication');
    expect(new Set(e.map(x => `${x.from}>${x.to}`)).size).toBe(e.length);
    expect(e.every(x => x.from !== x.to)).toBe(true);
  });
  it('ignores a process that is not on the map', () => {
    const s = demoState(now);
    s.flows.fl_demo_1.outputs = [...(s.flows.fl_demo_1.outputs || []), { what: 'Rien', party: 'x', processId: 'P99' }];
    expect(exchanges(s).some(x => x.to === 'P99')).toBe(false);
  });
});

describe('requirements met by steps', () => {
  it('gives an id to a requirement written before ids existed, the same one every time, and a different one to two equal lines', () => {
    const a = withReqIds([{ kind: 'client', text: 'Délai' }, { kind: 'client', text: 'Délai' }, { kind: 'legal', text: 'Délai' }]);
    expect(new Set(a.map(r => r.id)).size).toBe(3);
    expect(withReqIds([{ kind: 'client', text: 'Délai' }])[0].id).toBe(a[0].id);
    expect(withReqIds([{ kind: 'client', text: 'x', id: 'mine' }])[0].id).toBe('mine');
  });
  it('knows which steps of a flowchart meet a requirement, and counts them over the flowcharts', () => {
    const s = demoState(now), f1 = s.flows.fl_demo_1, r = f1.requirements!.find(x => /Marge/.test(x.text))!;
    expect(stepsMeeting(f1, r.id).map(x => x.step.id)).toEqual(['st_demo_1d', 'st_demo_1e']);
    expect(stepCountFor([f1], r)).toBe(2);
    const open = s.flows.fl_demo_15.requirements![0];
    expect(stepCountFor([s.flows.fl_demo_15], open)).toBe(0);                       // left unlinked on purpose
  });
  it('drops from the steps a link to a requirement that is gone, and reads a step link field by field', () => {
    const s = demoState(now), f = JSON.parse(JSON.stringify(s.flows.fl_demo_1)) as Flow;
    f.requirements = f.requirements!.filter(r => !/Marge/.test(r.text));
    pruneStepReqs(f);
    expect(f.steps.find(x => x.id === 'st_demo_1d')!.reqs).toBeUndefined();
    expect(f.steps.find(x => x.id === 'st_demo_1b')!.reqs).toHaveLength(1);
    const g = soundFlow('fl_demo_1', { ...s.flows.fl_demo_1, steps: s.flows.fl_demo_1.steps.map(x => (x.id === 'st_demo_1b' ? { ...x, reqs: ['nope', 3] } : x)) });
    expect(g.steps.find(x => x.id === 'st_demo_1b')!.reqs).toBeUndefined();
  });
});

describe('requirements without a step', () => {
  it('counts, per process, the requirements of the flowcharts that no step meets', () => {
    const s = demoState(now);
    expect(reqGaps(s, 'P3')).toBe(1);
    expect(reqGaps(s, 'P2')).toBe(0);
    s.flows.fl_demo_1.requirements = [...s.flows.fl_demo_1.requirements!, { kind: 'internal', text: 'Une autre', id: 'rq_new' }, { kind: 'internal', text: '  ', id: 'rq_blank' }];
    expect(reqGaps(s, 'P2')).toBe(1);                 // a blank line is not a requirement
  });
});

describe('lines written on the sheet and on the flowcharts', () => {
  it('finds the lines of a sheet that its flowcharts already say, and drops them, and only them', () => {
    const s = demoState(now), p2 = s.processes.find(p => p.id === 'P2')!;
    p2.inputs = [{ what: 'Demande de prix', party: 'Client' }, { what: 'Une entrée à moi', party: 'Moi' }];
    p2.requirements = [{ kind: 'client', text: 'réponse à une demande de prix sous un délai promis' }, { kind: 'internal', text: 'À moi' }];
    expect(flowDuplicates(s, p2)).toEqual({ inputs: [0], outputs: [], requirements: [0] });
    dropFlowDuplicates(s, p2);
    expect(p2.inputs).toEqual([{ what: 'Une entrée à moi', party: 'Moi' }]);
    expect(p2.requirements).toEqual([{ kind: 'internal', text: 'À moi' }]);
    expect(flowDuplicates(s, p2)).toEqual({ inputs: [], outputs: [], requirements: [] });
    p2.inputs = [{ what: 'Demande de prix', party: 'Client' }];
    dropFlowDuplicates(s, p2);
    expect(p2.inputs).toBeUndefined();
  });
  it('cleans an example saved before the move, once', () => {
    const s = demoState(now), old = JSON.parse(JSON.stringify(s)) as State;
    old.params.mapExampleLevel = 11;
    old.processes.find(p => p.id === 'P2')!.inputs = [{ what: 'Demande de prix', party: 'Client' }];
    expect(normalize(old).processes.find(p => p.id === 'P2')!.inputs).toBeUndefined();
  });
});

describe('audit lot 1: names, sheets read from outside, rights', () => {
  it('lets a name keep its trailing space while it is typed, and trims it for the lists', () => {
    expect(bareName('P2 · Achats ')).toBe('Achats ');
    expect(plainName('P2 · Achats ')).toBe('Achats');
    expect(bareName('Achats et ')).toBe('Achats et ');
  });
  it('reads a sheet without name, id, order or colour as texts and numbers, and leaves out sheets without id or with an id taken', () => {
    expect(soundProcess({ kpiIds: [], order: 'x', color: 3 } as never)).toMatchObject({ id: '', name: '', color: '', order: 0 });
    const out = normalize(st({ processes: [{ id: 'P1', name: 'A', color: '#000', order: 0, kpiIds: [] }, { name: 'sans id', kpiIds: [] }, { id: 'P1', name: 'doublon', order: 1, kpiIds: [] }, { id: 'P2' }] as never }));
    expect(out.processes.map(p => p.id)).toEqual(['P1', 'P2']);
    expect(out.processes[0].name).toBe('A');
    expect(out.processes[1]).toMatchObject({ name: '', order: 0 });
    expect(() => registerProcesses(out.processes)).not.toThrow();
  });
  it('reads the settings of the map: an invalid right goes, the months are a positive number, the key stays', () => {
    expect(soundMap({ rights: { a: 'admin', b: 'root', c: 3 }, shown: ['notes', 'x'], reviewMonths: -2 })).toEqual({ rights: { a: 'admin' }, shown: ['notes'] });
    expect(soundMap({ reviewMonths: 'six' })).toEqual({});
    expect(soundMap({ reviewMonths: 6 })).toEqual({ reviewMonths: 6 });
    expect(soundMap(7)).toBeUndefined();
    const s = st(); s.params.map = { rights: { a: 'zzz' }, reviewMonths: 0 } as never;
    expect(normalize(s).params.map).toEqual({});
  });
  it('keeps the requirements ticked "Tous les processus" when the duplicates are dropped', () => {
    const s = st(); s.flows.a = flow([], { id: 'a', requirements: [{ kind: 'legal', text: 'RGPD', all: true }, { kind: 'legal', text: 'Loi' }] });
    const p = proc('P2', { requirements: [{ kind: 'legal', text: 'RGPD', all: true }, { kind: 'legal', text: 'Loi' }] });
    expect(flowDuplicates(s, p).requirements).toEqual([1]);
    dropFlowDuplicates(s, p);
    expect(p.requirements).toEqual([{ kind: 'legal', text: 'RGPD', all: true }]);
  });
  it('puts back the sheet of a flowchart with its version, prunes the step links, and keeps the sheet of a version saved before', () => {
    const f = flow([step('a', 'start', 'D'), step('b', 'action', 'X', 'C', { reqs: ['r1'] }), step('c', 'end', 'F')], { purpose: 'Avant', result: 'R1', requirements: [{ id: 'r1', kind: 'legal', text: 'Loi' }] });
    saveVersion(f, 'Ana', 'v');
    f.purpose = 'Après'; f.result = undefined; f.requirements = undefined; f.inputs = [{ what: 'Demande', party: 'Client' }];
    restoreVersion(f, 1, 'Ana', now);
    expect(f).toMatchObject({ purpose: 'Avant', result: 'R1', requirements: [{ id: 'r1', text: 'Loi' }] });
    expect(f.inputs).toBeUndefined();
    f.history[0] = { ...f.history[0], sheet: undefined };            // a version of before the sheet was kept
    f.purpose = 'Courant'; f.requirements = [];
    f.steps[1].reqs = ['r1'];
    restoreVersion(f, 1, 'Ana', now);
    expect(f.purpose).toBe('Courant');
    expect(f.steps[1].reqs).toBeUndefined();                           // the requirement is no longer written: the link goes
    expect(soundFlow('x', { id: 'x', history: [{ version: 1, steps: [], sheet: { purpose: 'P', result: 3, inputs: [{ what: 'a' }] } }] }).history[0].sheet).toEqual({ purpose: 'P', inputs: [{ what: 'a', party: '' }] });
  });
  it('moves the flowcharts of a process that another process calls, whatever the order of the calls', () => {
    const s = st();
    s.flows.a = flow([], { id: 'a', processId: 'P3' }); s.flows.b = flow([], { id: 'b', processId: 'P3' }); s.flows.c = flow([], { id: 'c', processId: 'P3' });
    s.flows.a.steps = [step('x', 'subprocess', 'Appel interne', 'R', { flowId: 'b' })];          // a calls b inside P3: b is not called from outside
    s.flows.z = flow([step('y', 'subprocess', 'Appel externe', 'R', { flowId: 'a' })], { id: 'z', processId: 'P2' });
    expect(processUsage(s, 'P3').find(u => u.key === 'called')!.n).toBe(1);
    expect(reassignProcess(s, 'P3', 'P4')).toBe(1);
    expect(['a', 'b', 'c'].map(i => s.flows[i].processId)).toEqual(['P4', 'P3', 'P3']);
  });
  it('gives the notes of a process only to its pilot, its deputy and the administrators; the team view reads as the right "view"', () => {
    const s = st(); s.people.l = { id: 'l', name: 'Léa', role: '', active: true } as never; s.processes[1].pilotId = 'l';
    s.params.map = { rights: { adm: 'admin', léa: 'own', max: 'own', vue: 'view' } };
    const [p1, p2] = [s.processes[0], s.processes[1]];
    expect(canSee(s, 'adm', 'notes', { process: p1 })).toBe(true);
    expect(canSee(s, 'Léa', 'notes', { process: p2 })).toBe(true);
    expect(canSee(s, 'Léa', 'notes', { process: p1 })).toBe(false);          // "own" does not open the notes of the other processes
    expect(canSee(s, 'max', 'notes', { process: p2 })).toBe(false);
    expect(canSee(s, 'vue', 'notes', { process: p2 })).toBe(false);
    s.params.map.shown = ['notes'];
    expect(canSee(s, 'vue', 'notes', { process: p2 })).toBe(true);
    expect(canSee(s, 'Léa', 'notes', { process: p1 })).toBe(false);
    expect(canSee(s, 'adm', 'notes', { process: p1, team: true })).toBe(true);   // shown to the team
    s.params.map.shown = undefined;
    expect(canSee(s, 'adm', 'notes', { process: p1, team: true })).toBe(false);
    expect(canSee(s, 'adm', 'targets', { team: true })).toBe(false);
    expect(canSee(s, 'adm', 'targets')).toBe(true);
  });
  it('names the short word of the first processes only while the name still begins with it, and falls back on the code for an empty name', () => {
    const was = { ids: [...PROCESS_IDS], names: { ...PROCESS_NAMES }, short: { ...PROCESS_SHORT } };
    registerProcesses([proc('P2', { name: 'Achats et marchés publics', order: 1 }), proc('P1', { name: 'Direction et pilotage', order: 0 }), proc('P7', { name: '', order: 2 })]);
    expect(PROCESS_SHORT.P2).toBe('Achats et march…');
    expect(PROCESS_SHORT.P1).toBe('Direction');
    expect(PROCESS_NAMES.P7).toBe('P7');
    PROCESS_IDS.splice(0, PROCESS_IDS.length, ...was.ids);
    [PROCESS_NAMES, PROCESS_SHORT].forEach(o => Object.keys(o).forEach(k => { delete o[k]; }));
    Object.assign(PROCESS_NAMES, was.names); Object.assign(PROCESS_SHORT, was.short);
  });
  it('tells a pilot who left from one who is here', () => {
    const s = st(); s.people.a = { id: 'a', name: 'A', role: '', active: false } as never; s.people.b = { id: 'b', name: 'B', role: '', active: true } as never;
    expect([personGone(s, 'a'), personGone(s, 'b'), personGone(s, 'zz'), personGone(s, undefined)]).toEqual([true, false, false, false]);
  });
});

describe('processes of the map read by the other tools', () => {
  const saved = PROCESS_IDS.map((id, i) => ({ id, name: PROCESS_NAMES[id], order: i }));
  it('defaultProcess: the wished process if the map has it, else the first, else nothing', () => {
    try {
      registerProcesses([proc('P1'), proc('P4', { order: 4 }), proc('P3', { order: 3 })]);
      expect([defaultProcess('P3'), defaultProcess('P5'), defaultProcess()]).toEqual(['P3', 'P1', 'P1']);
      registerProcesses([]);
      expect(defaultProcess('P3')).toBe('');
    } finally { registerProcesses(saved); }
  });
  it('counts and moves the settings that name a process (2.3 investigation points, 4.1 suggestions)', () => {
    const s = st({ processes: [proc('P1'), proc('P2'), proc('P3')] });
    s.params.investigation = [{ key: 'a', label: 'A', hint: '', process: 'P3' }, { key: 'b', label: 'B', hint: '', process: 'P1' }];
    s.params.power = { library: [{ process: 'P3', text: 'x' }, { process: 'P3', text: 'y' }] };
    expect(processUsage(s, 'P3').map(u => `${u.key}:${u.n}`)).toEqual(['investigation:1', 'library:2']);
    expect(canDeleteProcess(s, 'P3')).toBe(false);
    expect(reassignProcess(s, 'P3', 'P2')).toBe(3);
    expect(s.params.investigation.map(x => x.process)).toEqual(['P2', 'P1']);
    expect(s.params.power.library!.every(x => x.process === 'P2')).toBe(true);
    expect(canDeleteProcess(s, 'P3')).toBe(true);
  });
  it('gives the 2.3 curve the colour of each process, a palette colour when it has none', () => {
    try {
      registerProcesses([proc('P1', { color: '#123456' }), proc('P2', { order: 2, color: 'nope' })]);
      const o = trendSeries('origine');
      expect(o.find(x => x.key === 'P1')!.color).toBe('#123456');
      expect(o.find(x => x.key === 'P2')!.color).toBe(SERIES_COLORS[1]);
    } finally { registerProcesses(saved); }
  });
});
