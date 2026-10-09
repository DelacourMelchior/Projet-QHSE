// Tool 1.4 and tools 4.1 and 4.2: who can do a process, a step, a function. A process shows its key functions (4.1) and its skills (4.2); a step linked to a skill, a key function or a person
// says who holds it and whether it stops if one person is missing; a skill or a function says where it is used. Pure functions, covered by mapCover.test.ts.
import type { Flow, FlowStep, Power, Skill, State } from './types';
import { activePowers, POWER_STATE, powerCfg, powerState, whoIs, type PowerState } from './powers';
import { autonomous, skillRisk, SKILL_RISK, type SkillRisk } from './team';
import { isoDate } from './periods';

export type Tone = 'ok' | 'warn' | 'alert';
export interface SkillCover { skill: Skill; risk: SkillRisk; label: string; tone: Tone; people: string[] }
export interface PowerCover { power: Power; state: PowerState; label: string; tone: Tone; holder: string; deputies: string[] }
export interface ProcessCover { skills: SkillCover[]; powers: PowerCover[]; keyPerson: number; uncovered: number; weak: number; powerGaps: number }

export function skillCover(s: State, k: Skill): SkillCover {
  const risk = skillRisk(s, k);
  return { skill: k, risk, label: SKILL_RISK[risk].label, tone: SKILL_RISK[risk].tone, people: autonomous(s, k).map(p => p.name) };
}
export function powerCover(s: State, p: Power, now = new Date()): PowerCover {
  const state = powerState(p, now, s, powerCfg(s.params));
  return { power: p, state, label: POWER_STATE[state].label, tone: POWER_STATE[state].tone, holder: p.holder.trim(), deputies: p.deputies.map(d => d.trim()).filter(Boolean) };
}
// What a process holds in the tools 4.1 and 4.2: a skill held by one person only (the key person) or by nobody (uncovered), a doubling that is too short, a function without a ready deputy
export function processCover(s: State, processId: string, now = new Date()): ProcessCover {
  const skills = Object.values(s.skills).filter(k => k.processId === processId).map(k => skillCover(s, k)).sort((a, b) => ['alert', 'warn', 'ok'].indexOf(a.tone) - ['alert', 'warn', 'ok'].indexOf(b.tone) || a.skill.name.localeCompare(b.skill.name, 'fr'));
  const powers = activePowers(s).filter(p => p.processId === processId).map(p => powerCover(s, p, now)).sort((a, b) => ['alert', 'warn', 'ok'].indexOf(a.tone) - ['alert', 'warn', 'ok'].indexOf(b.tone) || a.power.power.localeCompare(b.power.power, 'fr'));
  return { skills, powers, keyPerson: skills.filter(x => x.risk === 'single').length, uncovered: skills.filter(x => x.risk === 'none').length, weak: skills.filter(x => x.risk === 'short').length, powerGaps: powers.filter(x => x.tone !== 'ok').length };
}

// What a step says about who can do it: its skills (links to 4.2 and a role that is a skill), its key functions (links to 4.1), a role that is a person
export interface StepCover { kind: 'skill' | 'power' | 'person'; id: string; name: string; text: string; tone: Tone; tool: '4.1' | '4.2' | '1.3' }
// The skills a step relies on: its links to tool 4.2 and its role when the role is a skill (one list for the cover of a step and for the holes of the matrix)
export const skillIds = (st: Pick<FlowStep, 'links' | 'roleRef'>): string[] => [...new Set([...(st.roleRef?.kind === 'skill' ? [st.roleRef.id] : []), ...(st.links || []).flatMap(l => (l.tool === '4.2' && l.id ? [l.id] : []))])];
export const hasSkill = (st: Pick<FlowStep, 'links' | 'roleRef'>): boolean => skillIds(st).length > 0;
export function stepCover(s: State, st: Pick<FlowStep, 'links' | 'roleRef'>, now = new Date()): StepCover[] {
  const out: StepCover[] = [], seen = new Set<string>();
  const skill = (id: string) => {
    const k = s.skills[id];
    if (!k || seen.has(`k${id}`)) return;
    seen.add(`k${id}`);
    const c = skillCover(s, k);
    out.push({ kind: 'skill', id, name: k.name, tone: c.tone, tool: '4.2', text: c.risk === 'none' ? 'personne d’autonome' : c.risk === 'single' ? `une seule personne autonome : ${c.people[0]}` : c.risk === 'short' ? `doublure insuffisante : ${c.people.join(', ')}` : `${c.people.length} autonomes : ${c.people.join(', ')}` });
  };
  skillIds(st).forEach(skill);
  (st.links || []).forEach(l => {
    const p = l.tool === '4.1' && l.id ? s.powers[l.id] : undefined;
    if (!p || p.archivedAt || seen.has(`p${p.id}`)) return;
    seen.add(`p${p.id}`);
    const c = powerCover(s, p, now), away = c.holder ? whoIs(s, c.holder, isoDate(now)).absent : null;
    out.push({ kind: 'power', id: p.id, name: p.power, tone: away && c.tone === 'ok' ? 'warn' : c.tone, tool: '4.1', text: `${c.holder ? `titulaire ${c.holder}${away ? ' (absent)' : ''}` : 'sans titulaire'} · ${c.label.toLowerCase()}` });
  });
  if (st.roleRef?.kind === 'person') {
    const p = s.people[st.roleRef.id];
    if (p) { const away = p.active ? whoIs(s, p.name, isoDate(now)).absent : null; out.push({ kind: 'person', id: p.id, name: p.name, tone: !p.active ? 'alert' : away ? 'warn' : 'ok', tool: '1.3', text: !p.active ? 'n’est plus dans l’entreprise' : away ? 'absent aujourd’hui' : 'présent' }); }
  }
  return out;
}
// The steps of a flowchart that stop, or are weak, if one person is missing
export function flowRisks(f: Flow, s: State, now = new Date()): { stepId: string; text: string; tone: Tone }[] {
  return f.steps.flatMap((st, i) => stepCover(s, st, now).filter(c => c.tone !== 'ok').map(c => ({ stepId: st.id, tone: c.tone, text: `${st.label.trim() || `Étape ${i + 1}`} : ${c.kind === 'skill' ? 'compétence' : c.kind === 'power' ? 'fonction clé' : 'personne'} « ${c.name} », ${c.text}` })));
}

// The flowcharts that pass through a tool as a whole (a link to the tool, without a record): the flowchart itself or one of its steps
export function toolUses(s: Pick<State, 'flows'>, tool: string): { flow: Flow; step?: FlowStep; index: number }[] {
  return Object.values(s.flows || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr')).flatMap(flow => [
    ...((flow.links || []).some(l => l.tool === tool && !l.id) ? [{ flow, index: -1 }] : []),
    ...flow.steps.flatMap((step, index) => ((step.links || []).some(l => l.tool === tool && !l.id) ? [{ flow, step, index }] : [])),
  ]);
}

// Where a record of another tool is used: the flowcharts that link to it as a whole, and the steps that link to it (or that take a skill as their role)
export function usedInFlows(s: Pick<State, 'flows'>, tool: string, id: string): { flow: Flow; step?: FlowStep; index: number }[] {
  return Object.values(s.flows || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr')).flatMap(flow => [
    ...((flow.links || []).some(l => l.tool === tool && l.id === id) ? [{ flow, index: -1 }] : []),
    ...flow.steps.flatMap((step, index) => ((step.links || []).some(l => l.tool === tool && l.id === id) || (tool === '4.2' && step.roleRef?.kind === 'skill' && step.roleRef.id === id)) ? [{ flow, step, index }] : []),
  ]);
}
