// Tool 1.4 as the starting point of the other tools: what carries a step (the instruction that says how, the skill it takes, the key function that covers it, the equipment, the risk, the
// indicator), created from the step or attached when it exists; the matrix of a process (its steps in rows, these supports in columns, the holes visible); the records that nothing uses.
// Pure functions, covered by mapSupport.test.ts.
import type { Equipment, Flow, FlowLink, FlowStep, Kpi, Power, Risk, Skill, Sop, State, StepOrigin } from './types';
import { newId } from './base';
import { newSkill } from './team';
import { newPower } from './powers';
import { newRisk } from './risk';
import { linkLabel, withRoles } from './cartography';
import { hasSkill, usedInFlows } from './mapCover';
import { deleteKpi } from './engine';
import { canDelete, lostByDeleting, newSop } from './instructions';
import { deleteEquipment, newEquipment } from './maintenance';

export type SupportKind = 'sop' | 'skill' | 'power' | 'equipment' | 'risk' | 'kpi';
export interface SupportDef { kind: SupportKind; tool: '3.2' | '4.2' | '4.1' | '3.3' | '1.2' | '1.1'; column: string; a: string; existing: string; required: boolean }
// required: a step that is work done by somebody is expected to say how (instruction) and who can do it (skill); the others are for the steps that need them
export const SUPPORTS: SupportDef[] = [
  { kind: 'sop', tool: '3.2', column: 'Instruction', a: 'une instruction', existing: 'une instruction existante', required: true },
  { kind: 'skill', tool: '4.2', column: 'Compétence', a: 'une compétence', existing: 'une compétence existante', required: true },
  { kind: 'power', tool: '4.1', column: 'Fonction clé', a: 'une fonction clé', existing: 'une fonction clé existante', required: false },
  { kind: 'equipment', tool: '3.3', column: 'Équipement', a: 'un équipement', existing: 'un équipement existant', required: false },
  { kind: 'risk', tool: '1.2', column: 'Risque', a: 'un risque', existing: 'un risque existant', required: false },
  { kind: 'kpi', tool: '1.1', column: 'Indicateur', a: 'un indicateur', existing: 'un indicateur existant', required: false },
];
export const SUPPORT_TOOLS: string[] = SUPPORTS.map(d => d.tool);
export const supportByTool = (tool: string) => SUPPORTS.find(d => d.tool === tool);
export const supportByKind = (kind: SupportKind) => SUPPORTS.find(d => d.kind === kind)!;
// the links of a step that point to a record of one of these tools (the others stay in the free links)
export const richLinks = (st: Pick<FlowStep, 'links'>) => (st.links || []).filter(l => !!l.id && SUPPORT_TOOLS.includes(l.tool));
export const otherLinks = (st: Pick<FlowStep, 'links'>) => (st.links || []).filter(l => !(l.id && SUPPORT_TOOLS.includes(l.tool)));
export const linksOfTool = (st: Pick<FlowStep, 'links'>, tool: string) => richLinks(st).filter(l => l.tool === tool);
// the steps that are work done by somebody (not the start, the end, nor a question)
export const isWork = (st: Pick<FlowStep, 'kind'>) => st.kind === 'action' || st.kind === 'document' || st.kind === 'subprocess';

export type SupportRecord = Sop | Skill | Power | Equipment | Risk;
// A new record prefilled from a step, not saved: the sheet of its own tool is opened on it and saves it. A new indicator is created by createKpi (it has no sheet of its own to open on).
export function draftFor(kind: Exclude<SupportKind, 'kpi'>, s: State, f: Flow, st: FlowStep, now = new Date()): SupportRecord {
  const origin: StepOrigin = { flowId: f.id, stepId: st.id }, label = st.label.trim(), role = withRoles({ ...f, steps: [st] }, s).steps[0].role.trim(), who = st.roleRef?.kind === 'person' ? s.people[st.roleRef.id]?.name || '' : '';
  switch (kind) {
    case 'sop': return { ...newSop(f.processId, now), operation: label, poste: role, origin };
    case 'skill': return { ...newSkill(f.processId), name: label, origin };
    case 'power': return { ...newPower(f.processId, label), holder: who, origin };
    case 'equipment': return { ...newEquipment(), origin };
    case 'risk': return { ...newRisk(f.processId, now), origin };
  }
}
export function createKpi(d: Pick<State, 'kpis' | 'processes'>, processId: string, name: string, origin?: StepOrigin): string {
  const id = newId('kpi');
  const k: Kpi = { id, name: name.trim() || 'Nouvel indicateur', processId, type: 'Moteur', unit: '', direction: 'higher', aggregation: 'avg', target: '', targetValue: null, confidential: false, source: '', ...(origin ? { origin } : {}) };
  d.kpis[id] = k;
  d.processes.find(p => p.id === processId)?.kpiIds.push(id);
  return id;
}
// Does the record of that kind exist (a sheet that is closed without saving leaves nothing: no link must be written)
export const recordExists = (s: State, tool: string, id: string): boolean => {
  const col = ({ '3.2': s.sops, '4.2': s.skills, '4.1': s.powers, '3.3': s.equipments, '1.2': s.risks, '1.1': s.kpis } as Record<string, Record<string, unknown>>)[tool];
  return !!col && Object.hasOwn(col, id);
};
// Adds a link to a step without writing it twice
export const withLink = (links: FlowLink[] | undefined, l: FlowLink): FlowLink[] => ((links || []).some(x => x.tool === l.tool && x.id === l.id) ? links! : [...(links || []), l]);

// ---- the matrix of a process
export interface MatrixRow { flow: Flow; step: FlowStep; index: number }
export function matrixRows(s: Pick<State, 'flows'>, processId: string): MatrixRow[] {
  return Object.values(s.flows || {}).filter(f => f.processId === processId).sort((a, b) => a.name.localeCompare(b.name, 'fr')).flatMap(flow => flow.steps.flatMap((step, index) => (isWork(step) ? [{ flow, step, index }] : [])));
}
// Does the step have something in the column (a skill is also the role of the step when the role is a skill)
export const filled = (st: Pick<FlowStep, 'links' | 'roleRef'>, d: SupportDef): boolean => (d.kind === 'skill' && hasSkill(st)) || linksOfTool(st, d.tool).length > 0;
// How many steps have nothing in each column
export function matrixHoles(rows: MatrixRow[]): Record<SupportKind, number> {
  return Object.fromEntries(SUPPORTS.map(d => [d.kind, rows.filter(r => !filled(r.step, d)).length])) as Record<SupportKind, number>;
}
// The holes that count on the map: the steps without an instruction or without a skill (a key function, an equipment… are only for the steps that need them)
export const supportGaps = (s: Pick<State, 'flows'>, processId: string): number => {
  const rows = matrixRows(s, processId);
  return rows.reduce((n, r) => n + SUPPORTS.filter(d => d.required && !filled(r.step, d)).length, 0);
};
// Records of the process that no flowchart uses: instructions, skills and key functions waiting to be put on a step
export interface Orphan { kind: SupportKind; tool: string; id: string; label: string }
export function orphans(s: State, processId: string): Orphan[] {
  const out: Orphan[] = [];
  const add = (kind: SupportKind, tool: '3.2' | '4.2' | '4.1', xs: { id: string; processId: string }[]) => xs.filter(x => x.processId === processId && !usedInFlows(s, tool, x.id).length).forEach(x => out.push({ kind, tool, id: x.id, label: linkLabel(s, { tool, id: x.id }) || x.id }));
  add('sop', '3.2', Object.values(s.sops).filter(x => x.phase !== 'archived'));
  add('skill', '4.2', Object.values(s.skills));
  add('power', '4.1', Object.values(s.powers).filter(x => !x.archivedAt));
  return out;
}

// ---- what a step or a flowchart created
// lost: what deleting the record would lose, in words; signed: an instruction already read or signed; other: still used by a step or a flowchart that stays (it is then never offered for deletion)
export interface Created { kind: SupportKind; tool: string; id: string; label: string; lost: string; signed: boolean; other: boolean }
const nOf = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
function lostOf(s: State, kind: SupportKind, id: string): { lost: string; signed: boolean } {
  if (kind === 'kpi') return { lost: [nOf(Object.keys(s.values[id] || {}).length, 'valeur saisie'), nOf(Object.values(s.actions).filter(a => a.kpiId === id).length, 'action')].join(', '), signed: false };
  if (kind === 'sop') { const x = s.sops[id]; return x ? { lost: canDelete(x) ? 'un brouillon, rien d’autre' : lostByDeleting(x), signed: (x.acks || []).length > 0 } : { lost: '', signed: false }; }
  if (kind === 'equipment') { const e = s.equipments[id]; return { lost: e ? [nOf((e.breakdowns || []).length, 'panne'), nOf((e.anomalies || []).length, 'anomalie'), nOf(Object.values(s.spares || {}).filter(sp => sp.equipmentIds.includes(id)).length, 'pièce de rechange liée')].join(', ') : '', signed: false }; }
  return { lost: '', signed: false };
}
export function createdFrom(s: State, flowId: string, stepId?: string): Created[] {
  const hit = (o?: StepOrigin) => !!o && o.flowId === flowId && (stepId === undefined || o.stepId === stepId);
  // used somewhere that stays: another flowchart, another step of this one, or the flowchart as a whole (when only one step goes)
  const staying = (tool: string, id: string) => usedInFlows(s, tool, id).some(u => u.flow.id !== flowId || (stepId !== undefined && u.step?.id !== stepId));
  const out: Created[] = [];
  const scan = (kind: SupportKind, xs: { id: string; origin?: StepOrigin }[]) => xs.filter(x => hit(x.origin)).forEach(x => { const d = supportByKind(kind); out.push({ kind, tool: d.tool, id: x.id, label: linkLabel(s, { tool: d.tool, id: x.id }) || x.id, ...lostOf(s, kind, x.id), other: staying(d.tool, x.id) }); });
  scan('sop', Object.values(s.sops)); scan('skill', Object.values(s.skills)); scan('power', Object.values(s.powers)); scan('equipment', Object.values(s.equipments)); scan('risk', Object.values(s.risks)); scan('kpi', Object.values(s.kpis));
  return out;
}
const collection = (d: State, kind: SupportKind) => ({ sop: d.sops, skill: d.skills, power: d.powers, equipment: d.equipments, risk: d.risks, kpi: d.kpis } as Record<SupportKind, Record<string, unknown>>)[kind];
// Deletes records that a step had created (when the person says so), the way their own tool deletes them; the links to them go with the step
export function deleteCreated(d: State, items: Pick<Created, 'kind' | 'id'>[]): void {
  items.forEach(({ kind, id }) => {
    if (kind === 'kpi') deleteKpi(d, id); else if (kind === 'equipment') deleteEquipment(d, id); else delete collection(d, kind)[id];
    Object.values(d.flows).forEach(f => { const t = supportByKind(kind).tool; f.links = f.links?.filter(l => !(l.tool === t && l.id === id)); if (!f.links?.length) delete f.links; f.steps.forEach(st => { st.links = st.links?.filter(l => !(l.tool === t && l.id === id)); if (!st.links?.length) delete st.links; }); });
  });
}
// Records that are kept: they forget where they came from, so that deleting the step or the flowchart does not offer them again
export function keepCreated(d: State, items: Pick<Created, 'kind' | 'id'>[]): void {
  items.forEach(({ kind, id }) => { const r = collection(d, kind)[id] as { origin?: StepOrigin } | undefined; if (r) delete r.origin; });
}
