// Tools 4.2 to 4.4: key person, welcome path and autonomy test, naming charter (the deputies of 4.1 are in powers.test.ts).
import { describe, expect, it } from 'vitest';
import type { Newcomer, State } from './types';
import {
  autonomous, checkName, chronoOk, coveragePct, fileName, keyPeople, keyPersonRisk, newcomerInsights, newcomerState, newNewcomer, skillInsights, skillRisk,
  processPeople,
} from './team';
import { completeTeamExamples, teamExamples } from './teamExamples';
import { newcomerPdf } from './teamPdf';
import { defaultGed, emptyTools, PROCESS_IDS } from './base';
import { DEFAULT_SCALE } from './risk';
import { feeds } from './feeds';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});

describe('4.2 versatility', () => {
  it('finds the skills held by one autonomous person, ignoring people who left', () => {
    const s = st(teamExamples(now));
    const cnc = s.skills.sk_demo_1;
    expect(skillRisk(s, cnc)).toBe('single');
    expect(autonomous(s, cnc).map(p => p.name)).toEqual(['Marc M.']);
    expect(skillRisk(s, s.skills.sk_demo_2)).toBe('ok');
    expect(coveragePct(s)).toBe(25);                                   // critical skills only: 1 of 4
    expect(keyPeople(s).map(k => k.person.name).sort()).toEqual(['Antoine P.', 'Baptiste G.', 'Hélène R.', 'Marc M.', 'Nicolas R.', 'Thomas M.']);
    s.people.pp_demo_kt.active = false;
    s.people.pp_demo_nr.active = false;
    expect(skillRisk(s, s.skills.sk_demo_2)).toBe('single');            // only David K. left at level 3
  });
  it('turns a key person into a risk of the Plans B, and feeds the KPI of doubled key posts', () => {
    const s = st(teamExamples(now));
    const r = keyPersonRisk(s, s.skills.sk_demo_1);
    expect(r.title).toMatch(/Marc M\./);
    expect(r.family).toBe('doublure');
    expect(r.gravity).toBeNull();
    const kpi = { id: 'kpi_suppleance', name: 'Postes clés doublés', processId: 'P4', type: 'Garde-fou' as const, unit: '%', direction: 'higher' as const, aggregation: 'avg' as const, target: '100 %', targetValue: 100, confidential: false, source: '' };
    expect(feeds({ ...s, kpis: { kpi_suppleance: kpi } }, '2026-09', now)[0].value).toBe(25);
    expect(skillInsights(s).map(i => i.key)).toEqual(expect.arrayContaining(['single', 'plan', 'late']));
  });
});

describe('4.2 one matrix per process', () => {
  it('holds a skill only through the people of its process, in every process of the example', () => {
    const s = st(teamExamples(now));
    for (const k of Object.values(s.skills)) {
      const team = processPeople(s, k.processId).map(p => p.id);
      expect(Object.entries(k.levels).filter(([, l]) => l > 0).map(([id]) => id).filter(id => !team.includes(id)), k.name).toEqual([]);
    }
    expect(PROCESS_IDS.every(id => Object.values(s.skills).some(k => k.processId === id))).toBe(true);
    expect(processPeople(s, 'P3').map(p => p.name)).not.toContain('Jean-Marc');
  });
  it('tops up a fictitious company saved before, once, and leaves a real company alone', () => {
    const ex = teamExamples(now), old = { skills: { sk_demo_1: ex.skills.sk_demo_1 }, people: Object.fromEntries(Object.entries(ex.people).map(([id, p]) => [id, { ...p, processIds: undefined }])), params: {} as State['params'], settings: { companyName: 'Entreprise exemple (fictive)' } as State['settings'] };
    const up = completeTeamExamples(old, now);
    expect(Object.keys(up.skills).length).toBeGreaterThan(10);
    expect(up.people.pp_demo_mm.processIds).toEqual(['P3']);
    expect(up.params.teamExampleLevel).toBe(1);
    expect(completeTeamExamples({ ...old, settings: { companyName: 'Atelier réel' } as State['settings'] }, now).skills).toEqual(old.skills);
  });
});

describe('4.3 welcome and autonomy test', () => {
  const n = (over: Partial<Newcomer> = {}): Newcomer => ({ ...newNewcomer(now), name: 'Emma', tutor: 'Lucie', arrival: '2026-09-20', ...over });
  const day1 = { visit: '2026-09-20', ppe: '2026-09-20', safety: '2026-09-20' };
  it('follows the path up to the written authorisation', () => {
    expect(newcomerState(n(), now)).toBe('welcome');
    expect(newcomerState(n({ done: day1 }), now)).toBe('tutoring');
    expect(newcomerState(n({ done: day1, arrival: '2026-09-01' }), now)).toBe('test_due');
    expect(newcomerState(n({ done: day1, test: { date: '2026-09-18', answers: [true, false, null], note: '' } }), now)).toBe('failed');
    expect(newcomerState(n({ done: day1, test: { date: '2026-09-18', answers: [true, true, true], note: '' } }), now)).toBe('to_authorize');
    expect(newcomerState(n({ authorizedAt: '2026-09-24' }), now)).toBe('autonomous');
  });
  it('warns when someone works more than 3 weeks without authorisation, or without tutor', () => {
    const keys = newcomerInsights(st(teamExamples(now)), now).map(i => i.key);
    expect(keys).toEqual(expect.arrayContaining(['alone', 'welcome', 'tutor']));
    expect(newcomerPdf(teamExamples(now).newcomers.nw_demo_1, { company: 'Atelier é', date: now }).startsWith('%PDF-1.4')).toBe(true);
  });
});

describe('4.4 naming charter', () => {
  const g = defaultGed();
  it('builds a compliant name', () => {
    expect(fileName({ proc: 'be', type: 'PLN', object: 'Châssis 405', date: '2026-09-14', version: 2, ext: '.PDF' })).toBe('BE_PLN_CHASSIS_405_20260914_V02.pdf');
    expect(checkName('BE_PLN_CHASSIS_405_20260914_V02.pdf', g)).toEqual([]);
  });
  it('says why a name is not compliant', () => {
    const issues = checkName('plan_chassis_final_v2_bon.dwg', g).join(' | ');
    expect(issues).toMatch(/modèle/);
    expect(issues).toMatch(/Mot interdit : final, bon/);
    expect(checkName('XX_PLN_A_20260914_V01.pdf', g).join()).toMatch(/Code processus inconnu/);
    expect(checkName('BE_PLN_A_20261344_V01.pdf', g).join()).toMatch(/Date impossible/);
    expect(checkName('devis dupont.docx', g).join()).toMatch(/Espace/);
  });
  it('counts a 30-second test as passed only with the right version in time', () => {
    const t = { id: 't', date: '2026-09-01', person: 'A', asked: 'Plan', seconds: 25, found: true, obsolete: false };
    expect(chronoOk(t)).toBe(true);
    expect(chronoOk({ ...t, seconds: 31 })).toBe(false);
    expect(chronoOk({ ...t, obsolete: true })).toBe(false);
  });
});
