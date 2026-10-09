// Tool 3.2: the work instruction as a living standard (phases, versions, reading, posting, habilitations, to-do list, completeness).
import { describe, expect, it } from 'vitest';
import type { Params, Person, Skill, Sop, State } from './types';
import {
  acknowledge, addSuggestion, answerSuggestion, archiveSop, bumpSop, canValidate, changes, completeness, concerned, displayState, duplicateSop, habilitated, inform,
  ncsByStep, ncsSinceVersion, newSop, photoQuiz, postSheet, renewals, reviewLate, setStage, snapOf, sopChecklist, sopCfg, sopInsights, sopPhase, sopStatus, sopSummary,
  sopTodos, testQuestions, uncoveredPostes, validateSop, versionColor, visualRate, mustRead, DEFAULT_REASONS, snapshotOfPrevious, reopenSop, sendToReview, matrixPeople,
  takeLife, structMass, canDelete, lostByDeleting,
} from './instructions';
import { demoState } from './templates';
import { applySopExample, completeSopExamples, sopExamples } from './instructionsExamples';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';
import { newNc } from './quality';

const now = new Date(2026, 8, 25, 10, 0);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  ...emptyTools(), ...over,
});
const sop = (over: Partial<Sop> = {}): Sop => ({
  ...newSop('P3', now), id: 's1', poste: 'Presse plieuse', operation: 'Pliage', phase: 'active', version: 2, versionDate: '2026-09-01', validatedBy: 'David K.', author: 'Karim T.',
  steps: [{ op: 'Choisir', how: "Poinçon 88°", watch: '', check: '', photo: 'data:image/jpeg;base64,AAA' }, { op: 'Plier', how: 'Une pièce', watch: '', check: '', photo: '' }],
  good: 'Mesurer la première pièce', trap: 'Garder le réglage de la veille', ...over,
});
const person = (id: string, name: string): Person => ({ id, name, role: '', active: true });
const nc = (id: string, over: Partial<ReturnType<typeof newNc>> = {}) => ({ ...newNc(st(), 'x', now), id, ...over });
const withSop = (x: Sop, over: Partial<State> = {}) => st({ sops: { [x.id]: x }, ...over });

describe('3.2 phases of a sheet', () => {
  it('older sheets without a phase are in force when validated, to validate otherwise', () => {
    expect(sopPhase(sop({ phase: undefined }))).toBe('active');
    expect(sopPhase(sop({ phase: undefined, validatedBy: '' }))).toBe('review');
    expect(sopPhase(newSop('P3', now))).toBe('draft');
  });
  it('asks for a name and a step before the validation', () => {
    expect(canValidate(newSop('P3', now))).toBe('Nommez le poste.');
    expect(canValidate({ ...newSop('P3', now), poste: 'X' })).toBe('Décrivez au moins une étape.');
    expect(canValidate(sop())).toBe('');
  });
  it('puts a new sheet in force at its validation, with the day it starts and its journal', () => {
    const v = validateSop({ ...newSop('P3', now), poste: 'X', versionDate: '2026-01-01' }, 'Marc', 'David K.', '2026-09-20');
    expect(v).toMatchObject({ phase: 'active', validatedBy: 'David K.', validatedAt: '2026-09-20', versionDate: '2026-09-20', version: 1 });
    expect(v.history).toEqual([{ v: 1, date: '2026-09-20', reason: 'Mise en vigueur', by: 'Marc' }]);
    expect(v.journal?.at(-1)?.what).toBe('Validée par David K.');
    // a sheet already in force keeps its version date when validated again
    expect(validateSop(sop(), 'Marc', 'Eve', '2026-09-20').versionDate).toBe('2026-09-01');
  });
  it('goes to review, archive and back', () => {
    expect(sendToReview(sop({ phase: 'draft' }), 'M').phase).toBe('review');
    const a = archiveSop(sop(), 'M', '2026-09-24');
    expect(a).toMatchObject({ phase: 'archived', archivedAt: '2026-09-24' });
    expect(reopenSop(a, 'M')).toMatchObject({ phase: 'review', archivedAt: undefined });
  });
});

describe('3.2 defects at the workstation', () => {
  it('asks for a new version when a defect is declared at the workstation after the current one', () => {
    const s = st({ ncs: { a: nc('a', { where: 'presse plieuse ', at: '2026-09-10T08:00' }), b: nc('b', { where: 'Presse plieuse', at: '2026-08-10T08:00' }) } });
    expect(ncsSinceVersion(s, sop()).map(n => n.id)).toEqual(['a']);
  });
  it('reads accents and case alike, and follows the sheet chosen on the defect before the name', () => {
    const s = st({ ncs: { a: nc('a', { where: 'PRESSE PLIEUSE', at: '2026-09-10T08:00', sopId: 'other' }), b: nc('b', { where: 'Atelier', at: '2026-09-11T08:00', sopId: 's1' }) } });
    expect(ncsSinceVersion(s, sop()).map(n => n.id)).toEqual(['b']);
    expect(ncsSinceVersion(st({ ncs: { c: nc('c', { where: 'Pliage à chaud', at: '2026-09-11T08:00' }) } }), sop({ poste: 'Pliage à chaud' })).map(n => n.id)).toEqual(['c']);
  });
  it('does not ask a draft or an archived sheet to change', () => {
    const s = st({ ncs: { a: nc('a', { where: 'Presse plieuse', at: '2026-09-10T08:00' }) } });
    expect(ncsSinceVersion(s, sop({ phase: 'draft' }))).toEqual([]);
    expect(ncsSinceVersion(s, sop({ phase: 'archived' }))).toEqual([]);
  });
  it('is late after the delay of the tool, 48 h by default', () => {
    const x = sop(), s = withSop(x, { ncs: { a: nc('a', { where: 'Presse plieuse', at: '2026-09-24T08:00' }) } });
    expect(sopTodos(s, now).find(t => t.kind === 'update')).toMatchObject({ tone: 'warn', due: '2026-09-26' });
    expect(sopTodos(s, new Date(2026, 8, 27, 10, 0)).find(t => t.kind === 'update')?.tone).toBe('bad');
    const s2 = { ...s, params: { ...s.params, sop: { updateHours: 6 } } };
    expect(sopTodos(s2, now).find(t => t.kind === 'update')?.tone).toBe('bad');
  });
  it('counts the defects of the last 12 months on each step', () => {
    const s = withSop(sop(), { ncs: { a: nc('a', { sopId: 's1', sopStep: 1, at: '2026-09-02T08:00' }), b: nc('b', { sopId: 's1', sopStep: 1, at: '2026-06-02T08:00' }), c: nc('c', { sopId: 's1', sopStep: 0, at: '2024-06-02T08:00' }), d: nc('d', { sopId: 'z', sopStep: 1, at: '2026-09-02T08:00' }) } });
    expect(ncsByStep(s, sop(), now)).toEqual({ 1: 2 });
  });
});

describe('3.2 versions', () => {
  it('keeps the content replaced and shows what changed, pictures included', () => {
    const saved = sop(), edited = sop({ steps: [{ ...saved.steps[0], how: 'Poinçon 90°', photo: 'data:image/jpeg;base64,BBB' }, saved.steps[1], { op: 'Contrôler', how: 'Au gabarit', watch: '', check: '', photo: '' }], trap: 'Autre piège' });
    const next = bumpSop(edited, saved, { kind: 'Défaut déclaré au poste', detail: 'NC-2026-007', by: 'Marc', today: '2026-09-25' });
    expect(next).toMatchObject({ version: 3, versionDate: '2026-09-25' });
    expect(next.history.at(-1)).toMatchObject({ v: 3, reason: 'Défaut déclaré au poste : NC-2026-007', by: 'Marc' });
    const prev = snapshotOfPrevious(next)!;
    expect(prev.steps[0].how).toBe('Poinçon 88°');   // the content saved before the edits, not the buffer
    expect(changes(prev, next)).toEqual(["Étape 1 : « comment » modifié", 'Étape 1 : photo changée', 'Étape 3 ajoutée', 'Piège modifié']);
    expect(changes(snapOf(next), next)).toEqual([]);
  });
  it('writes "Autre" as what was typed', () => {
    expect(bumpSop(sop(), sop(), { kind: 'Autre', detail: 'Nouvelle machine', by: 'M' }).history.at(-1)?.reason).toBe('Nouvelle machine');
  });
  it('gives each version a colour, to tell the sheet posted from the old one', () => {
    expect(versionColor(1).name).not.toBe(versionColor(2).name);
    expect(versionColor(7)).toBe(versionColor(1));
  });
  it('keeps the reason "Autre" last in the list of the company', () => {
    expect(sopCfg(st().params).reasons).toEqual(DEFAULT_REASONS);
    expect(sopCfg({ ...st().params, sop: { reasons: ['Audit', 'Autre', 'Visite'] } }).reasons).toEqual(['Audit', 'Visite', 'Autre']);
  });
});

describe('3.2 people allowed and reading', () => {
  const skill: Skill = { id: 'k1', name: 'Pliage', processId: 'P3', levels: { p1: 3, p2: 1, p3: 2 }, plan: null };
  const team = { p1: person('p1', 'Alice'), p2: person('p2', 'Bruno'), p3: person('p3', 'Chloé') };
  it('allows the people of the matrix at the chosen level, and those written on the sheet', () => {
    const x = sop({ skillId: 'k1', habilitations: [{ person: 'Dan', tutor: '', date: '2026-09-02' }, { person: 'Eve', tutor: 'Dan', date: '2026-09-03', stage: 'with' }] });
    const s = withSop(x, { skills: { k1: skill }, people: team });
    expect(habilitated(s, x)).toEqual(['Alice', 'Chloé', 'Dan']);   // level 2 and up, "Eve" is still on the path
    expect(concerned(s, x)).toEqual(['Alice', 'Chloé', 'Dan', 'Eve']);
    const s3 = { ...s, params: { ...s.params, sop: { habLevel: 3 } } };
    expect(habilitated(s3, x)).toEqual(['Alice', 'Dan']);
  });
  it('asks each person concerned to read the version in force, except those trained on it', () => {
    const x = sop({ skillId: 'k1', habilitations: [{ person: 'Dan', tutor: '', date: '2026-09-02' }], acks: [{ person: 'alice', v: 2, date: '2026-09-03' }, { person: 'Chloé', v: 1, date: '2026-05-01' }] });
    const s = withSop(x, { skills: { k1: skill }, people: team });
    expect(mustRead(s, x)).toEqual(['Chloé']);   // Alice read it (any case), Dan was trained after the version came out, Chloé read the old one
    expect(mustRead(s, sop({ ...x, phase: 'review' }))).toEqual([]);
    expect(acknowledge(x, 'Chloé', '2026-09-24').acks).toHaveLength(3);
    expect(acknowledge(x, 'ALICE', '2026-09-24')).toBe(x);
  });
  it('moves a person along the path, and removes them', () => {
    let x = setStage(sop(), 'Eve', 'seen', { tutor: 'Dan', date: '2026-09-02', by: 'M' });
    expect(x.habilitations).toEqual([{ person: 'Eve', tutor: 'Dan', date: '2026-09-02', stage: 'seen' }]);
    x = setStage(x, 'eve', 'trainer', { date: '2026-09-20', until: '2027-09-20', by: 'M' });
    expect(x.habilitations).toEqual([{ person: 'eve', tutor: 'Dan', date: '2026-09-20', stage: 'trainer', until: '2027-09-20' }]);
    expect(setStage(x, 'Eve', null, { by: 'M' }).habilitations).toEqual([]);
  });
  it('warns of the habilitations that end within a month', () => {
    const x = sop({ habilitations: [{ person: 'A', tutor: '', date: '2026-01-01', until: '2026-10-10' }, { person: 'B', tutor: '', date: '2026-01-01', until: '2026-09-01' }, { person: 'C', tutor: '', date: '2026-01-01', until: '2027-09-01' }] });
    expect(renewals(x, now)).toEqual([{ person: 'A', until: '2026-10-10', late: false }, { person: 'B', until: '2026-09-01', late: true }]);
  });
});

describe('3.2 posting, review, briefing', () => {
  it('compares the date posted with the version date', () => {
    expect(displayState(sop())).toBe('never');
    expect(displayState(sop({ displayedAt: '2026-08-30' }))).toBe('old');
    expect(displayState(postSheet(sop(), 'M', true, '2026-09-02'))).toBe('ok');
    expect(postSheet(sop(), 'M', true, '2026-09-02')).toMatchObject({ displayedBy: 'M', oldRemoved: true });
  });
  it('is late for its review after the months of the tool', () => {
    expect(reviewLate(sop({ versionDate: '2025-08-01' }), st().params, now)).toBe(true);
    expect(reviewLate(sop({ versionDate: '2025-08-01', reviewedAt: '2026-08-01' }), st().params, now)).toBe(false);
    expect(reviewLate(sop({ versionDate: '2025-08-01' }), { ...st().params, sop: { reviewMonths: 24 } }, now)).toBe(false);
  });
  it('lists what is left to do, the most pressing first, and the status follows the first', () => {
    const x = sop({ displayedAt: '2026-08-30', suggestions: [{ id: 'g1', by: 'Nico', date: '2026-09-20', text: 'Gabarit trop lourd', status: 'new', answer: '', answeredAt: '' }], habilitations: [{ person: 'Dan', tutor: '', date: '2026-01-01', until: '2026-10-05' }] });
    const s = withSop(x);
    const todos = sopTodos(s, now);
    expect(todos.map(t => t.kind)).toEqual(['display', 'read', 'inform', 'renew', 'answer']);
    expect(todos[0].tone).toBe('bad');
    expect(sopStatus(s, x, now, todos)).toMatchObject({ level: 'alert', label: 'Ancienne fiche affichée' });
    const done = inform(postSheet(acknowledge(x, 'Dan', '2026-09-24'), 'M', true, '2026-09-24'), 'M', '2026-09-24');
    const quiet = withSop({ ...done, habilitations: [], suggestions: [] });
    expect(sopTodos(quiet, now)).toEqual([]);
    expect(sopStatus(quiet, quiet.sops.s1, now)).toMatchObject({ level: 'ok', label: 'À jour' });
  });
  it('has nothing to do on a draft, asks only for the validation of a sheet in review', () => {
    expect(sopTodos(withSop(sop({ phase: 'draft' })), now)).toEqual([]);
    expect(sopTodos(withSop(sop({ phase: 'review', validatedBy: '' })), now).map(t => t.kind)).toEqual(['validate']);
  });
  it('answers a remark of an operator', () => {
    const x = addSuggestion(sop(), 'Nico', ' Gabarit trop lourd ', '', '2026-09-20');
    expect(x.suggestions).toMatchObject([{ by: 'Nico', text: 'Gabarit trop lourd', status: 'new' }]);
    const y = answerSuggestion(x, x.suggestions![0].id, 'kept', 'Gabarit allégé', 'Marc', '2026-09-22');
    expect(y.suggestions![0]).toMatchObject({ status: 'kept', answer: 'Gabarit allégé', answeredAt: '2026-09-22' });
    expect(sopTodos(withSop(y), now).some(t => t.kind === 'answer')).toBe(false);
  });
});

describe('3.2 workstations cited without a sheet', () => {
  it('finds the places named in defects, machines and skills that no sheet covers', () => {
    const s = st({
      sops: { s1: sop({ poste: 'Presse plieuse' }), s2: sop({ id: 's2', poste: 'Soudure', skillId: 'k2' }) },
      ncs: { a: nc('a', { where: 'Peinture' }), b: nc('b', { where: 'peinture ' }), c: nc('c', { where: 'Presse plieuse 300 t' }), d: nc('d', { where: 'Sablage', sopId: 's1' }) },
      equipments: { e1: { id: 'e1', name: 'Centre CNC', location: '', operator: '', manager: '', riskId: '', checkpoints: [], inspections: [], parts: [] } },
      skills: { k1: { id: 'k1', name: 'Câblage', processId: 'P3', levels: {}, plan: null }, k2: { id: 'k2', name: 'Soudure TIG', processId: 'P3', levels: {}, plan: null } },
    });
    expect(uncoveredPostes(s)).toEqual([
      { name: 'Peinture', ncs: 2, machine: false, skill: false },
      { name: 'Câblage', ncs: 0, machine: false, skill: true },
      { name: 'Centre CNC', ncs: 0, machine: true, skill: false },
    ]);
    expect(sopInsights(s, now).find(i => i.key === 'uncovered')?.text).toContain('Peinture (2 défauts déclarés)');
  });
  it('does not count an archived sheet as a cover', () => {
    const s = st({ sops: { s1: sop({ phase: 'archived' }) }, ncs: { a: nc('a', { where: 'Presse plieuse' }) } });
    expect(uncoveredPostes(s).map(u => u.name)).toEqual(['Presse plieuse']);
  });
});

describe('3.2 completeness, summary, messages', () => {
  it('shows what is missing on a sheet', () => {
    const x = sop({ ppe: ['Gants'], displayedAt: '2026-09-02' });
    const s = withSop(x);
    const c = sopChecklist(s, x);
    expect(c.filter(k => !k.ok).map(k => k.key)).toEqual(['photos', 'people']);
    expect(completeness(c)).toBe(75);
    expect(visualRate(x)).toBe(50);
    expect(sopChecklist(s, { ...x, ppe: [], ppeNone: true }).find(k => k.key === 'ppe')?.ok).toBe(true);
  });
  it('states facts in the messages, without any order', () => {
    const s = demoState(now);
    const texts = sopInsights(s, now).map(i => i.text).join(' ');
    expect(texts).not.toMatch(/\b(Ajouter|Réimprimer|Faire signer|Commander|Traiter)\b/);
    expect(sopInsights(s, now).map(i => i.key)).toEqual(expect.arrayContaining(['stale', 'poster', 'ack', 'val']));
  });
  it('gives the figures of the summary', () => {
    const sm = sopSummary(demoState(now), now);
    expect(sm.live).toBeGreaterThan(3);
    expect(sm.active).toBeGreaterThan(1);
    expect(sm.todos.length).toBeGreaterThan(3);
    expect(sm.readRate).not.toBeNull();
  });
});

describe('3.2 starting points and test', () => {
  it('copies the content of a sheet, not its life', () => {
    const x = sop({ habilitations: [{ person: 'A', tutor: '', date: '2026-01-01' }], displayedAt: '2026-09-02', acks: [{ person: 'A', v: 2, date: '2026-09-02' }], journal: [{ at: 'x', by: 'y', what: 'z' }] });
    const c = duplicateSop(x, now);
    expect(c).toMatchObject({ poste: 'Presse plieuse (copie)', version: 1, phase: 'draft', validatedBy: '', habilitations: [], displayedAt: undefined, acks: undefined, journal: undefined });
    expect(c.id).not.toBe(x.id);
    expect(c.steps).toEqual(x.steps);
  });
  it('writes the 3 questions from the sheet and alternates good and not good pictures', () => {
    const x = sop({ ppe: ['Gants anti-coupure'], goodPhoto: 'g', trapPhoto: 't', limits: { good: '', limit: '', reject: '', goodPhoto: 'lg', limitPhoto: 'll', rejectPhoto: 'lr' } });
    const q = testQuestions(x);
    expect(q).toHaveLength(3);
    expect(q[0]).toContain('Choisir');
    expect(q[1]).toContain('Garder le réglage de la veille');
    expect(q[2]).toContain('gants anti-coupure');
    expect(photoQuiz(x).map(i => i.photo)).toEqual(['t', 'g', 'lr', 'lg']);
    expect(photoQuiz(sop())).toEqual([]);
  });
  it('lists the active people and those written on a sheet in the matrix', () => {
    const s = withSop(sop({ habilitations: [{ person: 'Zoé', tutor: '', date: '2026-01-01' }] }), { people: { p1: person('p1', 'Alice') } });
    expect(matrixPeople(s)).toEqual(['Alice', 'Zoé']);
  });
});

describe('3.2 examples', () => {
  it('give every state of the tool', () => {
    const s = demoState(now);
    const phases = new Set(Object.values(s.sops).map(sopPhase));
    expect([...phases].sort()).toEqual(['active', 'archived', 'draft', 'review']);
    const kinds = new Set(sopTodos(s, now).map(t => t.kind));
    ['update', 'validate', 'read', 'display', 'inform', 'review', 'renew', 'answer'].forEach(k => expect(kinds.has(k as never), k).toBe(true));
    expect(Object.values(s.sops).some(x => visualRate(x) >= 80)).toBe(true);
    expect(Object.values(s.sops).some(x => !x.goodPhoto && !x.steps.some(y => y.photo))).toBe(true);
  });
});

const plan = (p: Params) => p.sop?.plan;
describe('3.2 example given once to a fictitious company saved before', () => {
  // the sheets as the first generation of the example wrote them: five fields per step, no phase, no picture
  const legacy = (x: Sop): Sop => {
    const { phase, group, owner, materials, ifWrong, limits, riskIds, emergency, variants, links, suggestions, pin, journal, briefed, displayedBy, oldRemoved, validatedAt, reviewedAt, ...rest } = x;
    void [phase, group, owner, materials, ifWrong, limits, riskIds, emergency, variants, links, suggestions, pin, journal, briefed, displayedBy, oldRemoved, validatedAt, reviewedAt];
    return { ...rest, goodPhoto: '', trapPhoto: '', history: rest.history.map(h => ({ v: h.v, date: h.date, reason: h.reason })), steps: rest.steps.map(y => ({ op: y.op, how: y.how, watch: y.watch, check: y.check, photo: '' })) };
  };
  const ex = sopExamples(now);
  const old = () => ({
    sops: { sop_demo_1: { ...legacy(ex[0]), poste: 'Montage (nom saisi)', steps: legacy(ex[0]).steps.map((y, i) => (i === 1 ? { ...y, how: 'Texte saisi par l\'entreprise' } : y)) }, sop_demo_2: legacy(ex[1]), mine: { ...newSop('P3', now), id: 'mine', poste: 'Ma fiche' } },
    ncs: { nc_demo_3: nc('nc_demo_3', { where: 'Montage armoires' }), nc_demo_5: nc('nc_demo_5', { where: 'Peinture', sopId: 'mon_choix' }) },
    params: st().params,
  });
  it('gives the pictures and the new fields, adds the missing sheets, and keeps what was typed', () => {
    const done = completeSopExamples(old(), now);
    expect(done.sops.sop_demo_1.poste).toBe('Montage (nom saisi)');
    expect(done.sops.sop_demo_1.steps[1].how).toBe("Texte saisi par l'entreprise");
    expect(done.sops.sop_demo_1.steps[1].photo).toContain('data:image/svg+xml');
    expect(done.sops.sop_demo_1).toMatchObject({ phase: 'active', group: 'Atelier montage', owner: 'David K.' });
    expect(done.sops.sop_demo_1.history[0].snap).toBeDefined();
    expect(done.sops.sop_demo_2.validatedBy).toBe('David K.');
    expect(Object.keys(done.sops).sort()).toEqual(['mine', 'sop_demo_1', 'sop_demo_2', 'sop_demo_3', 'sop_demo_4', 'sop_demo_5', 'sop_demo_6', 'sop_demo_7', 'sop_demo_8']);
    expect(done.sops.mine.poste).toBe('Ma fiche');
    expect(done.ncs.nc_demo_3).toMatchObject({ sopId: 'sop_demo_1', sopStep: 1 });
    expect(done.ncs.nc_demo_5.sopId).toBe('mon_choix');   // a choice made by the company is not replaced
    expect(done.params).toMatchObject({ sopExampleLevel: 1 });
    expect(plan(done.params)).toContain('data:image/svg+xml');
    expect(completeSopExamples(done, now)).toBe(done);
  });
  it('gives nothing to a real company', () => {
    const real = { sops: { a: sop() }, ncs: {}, params: st().params };
    expect(completeSopExamples(real, now)).toBe(real);
  });
  it('the button gives the sheets and the plan to a company that has none, and links the defects', () => {
    const d = demoState(now);
    d.sops = {}; d.params.sop = undefined; d.params.sopExampleLevel = undefined; delete d.ncs.nc_demo_3.sopId;
    applySopExample(d, now);
    expect(Object.keys(d.sops)).toHaveLength(8);
    expect(d.ncs.nc_demo_3.sopId).toBe('sop_demo_1');
    expect(plan(d.params)).toContain('data:image/svg+xml');
  });
  it('is the same for the example of the demo and for the example completed afterwards', () => {
    const fresh = demoState(now).sops, completed: Record<string, Sop> = completeSopExamples({ ...old(), params: st().params }, now).sops;
    expect(Object.keys(completed).filter(id => id.startsWith('sop_demo_')).sort()).toEqual(Object.keys(fresh).filter(id => id.startsWith('sop_demo_')).sort());   // (the map 1.4 adds instructions of its own to the demo)
    expect(completed.sop_demo_4).toEqual(fresh.sop_demo_4);
  });
});

describe('what is typed and what lives apart (lot 0: no more silent losses)', () => {
  const sheets = () => sopExamples(now);
  it('keeps the readings, journal and versions of the saved sheet when a screen with an older copy is written', () => {
    const saved = sheets().find(x => (x.acks || []).length > 0 && sopPhase(x) === 'active')!;
    const stale = { ...structuredClone(saved), acks: [], journal: [], poste: 'Poste renommé', good: 'Nouveau bon geste' };
    const out = takeLife(stale, saved);
    expect(out.poste).toBe('Poste renommé');       // what was typed is written
    expect(out.good).toBe('Nouveau bon geste');
    expect(out.acks).toEqual(saved.acks);         // what the full-screen view wrote meanwhile stays
    expect(out.journal).toEqual(saved.journal);
    expect(out.version).toBe(saved.version);
    expect(out.history).toEqual(saved.history);
    expect(takeLife(stale, undefined)).toBe(stale);   // a new sheet is written as it is
  });
  it('tells that something was removed, not that a letter was', () => {
    const a = sheets()[0], b = structuredClone(a);
    b.steps[0].how = 'x';
    expect(structMass(b)).toBe(structMass(a));
    const fewer = { ...a, steps: a.steps.slice(1) };
    expect(structMass(fewer)).toBeLessThan(structMass(a));
    const noPhoto = structuredClone(a); noPhoto.steps[0].photo = '';
    expect(structMass(noPhoto)).toBeLessThan(structMass(a));
  });
  it('deletes only a draft nobody read; the others are archived', () => {
    const all = sheets();
    const draft = all.find(x => sopPhase(x) === 'draft')!;
    expect(canDelete({ ...draft, acks: [], habilitations: [], suggestions: [], history: [], version: 1 })).toBe(true);
    const active = all.find(x => sopPhase(x) === 'active' && (x.acks || []).length)!;
    expect(canDelete(active)).toBe(false);
    expect(lostByDeleting(active)).toMatch(/lecture\(s\) signée\(s\)/);
    expect(canDelete({ ...draft, acks: [{ person: 'A', v: 1, date: '2026-01-01' }], habilitations: [], suggestions: [], history: [], version: 1 })).toBe(false);
  });
});
