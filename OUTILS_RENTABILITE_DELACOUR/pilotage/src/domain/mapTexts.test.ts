// Tool 1.4, audit lots 5 and 6: the wording of the catalogue of requirements, the example without broken references, the example saved before the corrections, no "bloc" in the texts.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { State } from './types';
import { processIssues, processUsage, requirementSuggestions, REQ_KINDS } from './cartography';
import { completeMapExamples, mapExamples, MAP_EXAMPLE_LEVEL } from './mapExamples';
import { defaultGed } from './base';
import { demoState } from './templates';

const now = new Date(2026, 9, 9, 10, 0);
const ALL = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].flatMap(p => requirementSuggestions(p, []));

describe('catalogue of requirements (lot 6)', () => {
  it('holds no line to complete and no line that is neither a sentence nor a subject', () => {
    expect(ALL.length).toBeGreaterThan(150);
    expect(ALL.filter(x => /précisez/i.test(x.text))).toEqual([]);
    expect(ALL.every(x => x.text === x.text.trim() && x.text.length > 8)).toBe(true);
  });
  it('words the lines for any trade: no workshop vocabulary', () => {
    expect(ALL.filter(x => /\b(pièces?|chantiers?|premier article|atelier|bac rouge)\b/i.test(x.text.replace(/pièces de rechange/gi, '')))).toEqual([]);
  });
  it('qualifies the lines that depend on the kind of client, the legal form or the work', () => {
    const t = ALL.map(x => x.text);
    expect(t).toContain('Visite d’information et de prévention, ou suivi médical renforcé selon le poste');
    expect(t).toContain('Conditions générales de vente (communiquées selon le type de client)');
    expect(t).toContain('Règles de prospection par message, selon le type de client');
    expect(t).toContain('Garanties légales applicables à la vente (selon le type de client)');
    expect(t).toContain('Tenue de la comptabilité et dépôt des comptes (selon la forme juridique)');
    expect(t).toContain('Registre des accidents bénins (si autorisé par la CPAM)');
    expect(t).toContain('Registre des vérifications et contrôles obligatoires');
    expect(t.some(x => /plan de prévention, selon les travaux et la durée/.test(x))).toBe(true);
    ['Visite médicale d’embauche et suivi médical', 'Registre de sécurité et de contrôles', 'Obligations de vigilance sur les produits et substances', 'Consentement du client pour recevoir des messages commerciaux'].forEach(x => expect(t).not.toContain(x));
  });
  it('says that standards are voluntary unless a client asks, and has no repeated line in a kind', () => {
    expect(REQ_KINDS.find(k => k.key === 'standard')!.label).toBe('Norme (volontaire sauf exigence du client)');
    const keys = requirementSuggestions('P3', []).map(x => `${x.kind}|${x.text.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('example of tool 1.4 (lot 5)', () => {
  const s = demoState(now), ex = mapExamples(Object.values(s.people), now);
  const holders: Record<string, Record<string, unknown>> = { '1.1': s.kpis, '1.2': s.risks, '3.2': { ...s.sops, ...Object.fromEntries(ex.sops.map(x => [x.id, x])) }, '3.3': s.equipments, '4.1': s.powers, '4.2': { ...s.skills, ...Object.fromEntries(ex.skills.map(x => [x.id, x])) } };
  it('cites only records that exist (instructions, skills, indicators, risks, key functions, equipment)', () => {
    const missing: string[] = [];
    ex.flows.forEach(f => [...(f.links || []), ...f.steps.flatMap(st => st.links || [])].forEach(l => { if (l.id && !holders[l.tool]?.[l.id]) missing.push(`${f.id} ${l.tool} ${l.id}`); }));
    expect(missing).toEqual([]);
  });
  it('points the documents of the sheets to a folder of the filing plan, or names them freely', () => {
    const folders = new Set(defaultGed().folders.flatMap(f => [f.code, ...f.subfolders.map(x => `${f.code}/${x}`)]));
    const bad = Object.entries(ex.processes).flatMap(([id, p]) => (p.docs || []).filter(d => /^\d\d_/.test(d) && !folders.has(d)).map(d => `${id} ${d}`));
    expect(bad).toEqual([]);
  });
  it('files the backup in the information systems process, where its flowchart is', () => {
    expect(ex.flows.find(f => f.id === 'fl_demo_26')!.processId).toBe('P6');
    expect(ex.sops.find(x => x.id === 'sop_map_6')!.processId).toBe('P6');
    expect(s.skills.sk_demo_9.processId).toBe('P6');
  });
  it('has no skill unrelated to the step it is set on (feasibility, launching the manufacturing)', () => {
    const links = (fid: string, sid: string) => ex.flows.find(f => f.id === fid)!.steps.find(x => x.id === sid)!.links || [];
    [['fl_demo_1', 'st_demo_1c'], ['fl_demo_3', 'st_demo_3b']].forEach(([f, st]) => ['sk_demo_6', 'sk_demo_10'].forEach(k => expect(links(f, st).some(l => l.id === k)).toBe(false)));
  });
  it('words the requirements of the example as the catalogue does, so that they leave its list once added', () => {
    const wording = [...Object.values(ex.processes).flatMap(p => p.requirements || []), ...ex.flows.flatMap(f => f.requirements || [])];
    const inCatalogue = wording.filter(r => ALL.some(x => x.kind === r.kind && x.text === r.text));
    expect(inCatalogue.length).toBeGreaterThanOrEqual(9);
    // a requirement of the example that reads as a catalogue line but is worded another way is a mistake
    const near = wording.filter(r => !inCatalogue.includes(r) && ALL.some(x => x.text.toLowerCase().replace(/ \(.*\)$/, '') === r.text.toLowerCase()));
    expect(near).toEqual([]);
    const p1 = s.processes.find(p => p.id === 'P1')!;
    expect(requirementSuggestions('P1', p1.requirements || []).some(x => (p1.requirements || []).some(r => r.text === x.text))).toBe(false);
  });
  it('has no mention of documents in the purpose of P4, nor a link to the filing plan', () => {
    const p4 = ex.processes.P4;
    expect(p4.purpose).not.toMatch(/document/i);
    expect((p4.docLinks || []).some(l => l.tool === '4.4')).toBe(false);
  });
  it('brings a saved example of the previous level to the same wording, without touching what the company wrote', () => {
    const fresh = demoState(now), old = JSON.parse(JSON.stringify(fresh)) as State;
    const proc = (st: State, id: string) => st.processes.find(p => p.id === id)!;
    proc(old, 'P4').purpose = "Avoir les bonnes personnes, formées, savoir qui remplace qui quand quelqu'un manque, et que chaque document se retrouve.";
    proc(old, 'P4').docLinks = [{ tool: '4.1' }, { tool: '4.4' }];
    proc(old, 'P7').docs = ['04_RH_ADMINISTRATION/01_Plan_de_classement'];
    proc(old, 'P1').requirements = [{ kind: 'legal', text: 'Tenue de la comptabilité et dépôt des comptes' }, { kind: 'internal', text: 'Une revue de direction par mois' }, { kind: 'client', text: 'Ma propre exigence' }];
    proc(old, 'P5').requirements = [{ kind: 'internal', text: 'Décision sous 24 h sur toute pièce isolée' }];
    old.skills.sk_demo_9 = { ...old.skills.sk_demo_9, processId: 'P1' }; old.sops.sop_map_6 = { ...old.sops.sop_map_6, processId: 'P1' };
    old.params.mapExampleLevel = 16;
    const up = completeMapExamples(old, now);
    expect(up.params.mapExampleLevel).toBe(MAP_EXAMPLE_LEVEL);
    expect(proc(up, 'P4').purpose).toBe(proc(fresh, 'P4').purpose);
    expect(proc(up, 'P4').docLinks).toEqual([{ tool: '4.1' }]);
    expect(proc(up, 'P7').docs).toEqual(['Plan de classement de l’entreprise']);
    expect(proc(up, 'P1').requirements!.map(r => r.text)).toEqual(['Tenue de la comptabilité et dépôt des comptes (selon la forme juridique)', 'Une revue de direction par période fixée', 'Ma propre exigence']);
    expect(proc(up, 'P5').requirements![0].text).toBe('Décision rapide sur tout produit isolé');
    expect(up.skills.sk_demo_9.processId).toBe('P6');
    expect(up.sops.sop_map_6.processId).toBe('P6');
    expect(old.skills.sk_demo_9.processId).toBe('P1');   // the state given is not changed in place
    // what the company changed itself stays
    const mine = JSON.parse(JSON.stringify(old)) as State;
    proc(mine, 'P4').purpose = 'Ma phrase'; proc(mine, 'P7').docs = ['Mon dossier']; mine.skills.sk_demo_9.processId = 'P3';
    const kept = completeMapExamples(mine, now);
    expect(proc(kept, 'P4').purpose).toBe('Ma phrase');
    expect(proc(kept, 'P7').docs).toEqual(['Mon dossier']);
    expect(kept.skills.sk_demo_9.processId).toBe('P3');
  });
  it('the example loaded at the current level is the one a saved example reaches', () => {
    const fresh = demoState(now), old = JSON.parse(JSON.stringify(fresh)) as State;
    old.params.mapExampleLevel = 16;
    const up = completeMapExamples(old, now);
    const pick = (st: State) => ({ p: st.processes.map(p => [p.id, p.purpose, p.docs, p.requirements, p.docLinks]), f: Object.values(st.flows).map(f => [f.id, f.processId, f.requirements?.map(r => [r.kind, r.text])]) });
    expect(pick(up)).toEqual(pick(fresh));
  });
});

describe('texts of the map (lot 5)', () => {
  it('words the points of a sheet as the fields are named, and the review as a sheet (feminine)', () => {
    const st = demoState(now), p = { ...st.processes.find(x => x.id === 'P4')!, purpose: '', trigger: '', reviewedAt: undefined };
    const t = processIssues(st, p, now).map(i => i.text);
    expect(t).toContain('« À quoi il sert » non rempli');
    expect(t).toContain('« Ce qui le déclenche » ou « Ce qu’il livre » non rempli');
    expect(t).toContain('Jamais relue');
    const q = { ...p, reviewedAt: '2024-01-01' };
    expect(processIssues(st, q, now).find(i => i.key === 'review')!.text).toMatch(/^Relue il y a plus de \d+ mois$/);
  });
  it('gives a plural to every multi-word thing that still uses a process', () => {
    const st = demoState(now);
    const usages = st.processes.flatMap(p => processUsage(st, p.id));
    expect(usages.length).toBeGreaterThan(3);
    expect(usages.filter(u => u.label.includes(' ') && !u.many)).toEqual([]);
  });
  it('has no « bloc » in the texts of the screens of the map (a step, a section, a band)', () => {
    const dir = join(__dirname, '..', 'ui', 'map');
    const hits = readdirSync(dir).filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx')).flatMap(f => readFileSync(join(dir, f), 'utf8').split('\n').map((l, i) => [f, i + 1, l] as const).filter(([, , l]) => /\bblocs?\b|couloirs?/i.test(l)).map(([f, i]) => `${f}:${i}`));
    expect(hits).toEqual([]);
  });
});
