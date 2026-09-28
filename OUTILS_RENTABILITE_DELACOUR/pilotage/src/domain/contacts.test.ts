import { describe, expect, it } from 'vitest';
import type { Contact, State } from './types';
import { callChains, candidates, chainIssues, chainOf, duplicates, isUnder, orgGroups, orgTree, pendingOf, toCallThisMonth, vcardOf, vitalContacts } from './contacts';
import { flatten, unflatten, bucketOf } from '../store/flat';
import { demoState } from './templates';
import { allTasks } from './tasks';
import { pocketCardPdf } from './directoryPdf';
import { reflexCardsPdf } from './reflexPdf';

const c = (id: string, p: Partial<Contact> = {}): Contact => ({ id, category: 'prestataire', name: id, role: '', company: '', phone: `04 00 00 00 ${id.length}${id.charCodeAt(0) % 10}`, email: '', always: false, verifiedAt: '', ...p });
const st = (xs: Contact[]) => ({ contacts: Object.fromEntries(xs.map(x => [x.id, x])) }) as Pick<State, 'contacts'>;
const now = new Date(2026, 8, 15);

describe('annuaire 1.3', () => {
  it('follows the call chain and stops on a loop', () => {
    const s = st([c('a', { backupId: 'b' }), c('b', { backupId: 'c' }), c('c', { backupId: 'a' })]);
    const x = chainOf(s, s.contacts.a);
    expect(x.chain.map(y => y.id)).toEqual(['a', 'b', 'c']);
    expect(x.loop).toBe(true);
    expect(chainIssues(s, now).loops.length).toBe(1);
  });
  it('draws chains from their head only', () => {
    const s = st([c('a', { backupId: 'b' }), c('b', { backupId: 'z' }), c('z'), c('solo')]);
    expect(callChains(s).map(x => x.chain.map(y => y.id))).toEqual([['a', 'b', 'z']]);
  });
  it('builds the internal org chart, loops become roots', () => {
    const s = st([c('boss', { category: 'interne' }), c('m', { category: 'interne', reportsTo: 'boss' }), c('w', { category: 'interne', reportsTo: 'm' }),
      c('x', { category: 'interne', reportsTo: 'y' }), c('y', { category: 'interne', reportsTo: 'x' }), c('out', { reportsTo: 'boss' })]);
    const t = orgTree(s);
    const boss = t.find(n => n.c.id === 'boss')!;
    expect(boss.children[0].c.id).toBe('m');
    expect(boss.children[0].children[0].c.id).toBe('w');
    expect(t.map(n => n.c.id).sort()).toEqual(['boss', 'x', 'y']);
  });
  it('finds duplicates by phone or e-mail', () => {
    const s = st([c('a', { phone: '04 00 00 00 01' }), c('b', { phone: '04.00.00.00.01' }), c('d', { email: 'X@y.fr' }), c('e', { email: 'x@y.fr' })]);
    expect(duplicates(s).length).toBe(2);
  });
  it('puts 4 numbers to call this month in the tasks, vital first', () => {
    const s = demoState(now);
    const month = toCallThisMonth(s, now);
    expect(month.length).toBeLessThanOrEqual(4);
    expect(month.every(x => x.category !== 'secours')).toBe(true);
    expect(allTasks(s, now).filter(t => t.tool === '1.3').length).toBe(month.length);
  });
  it('keeps the secret in the direction folder', () => {
    const s = demoState(now);
    s.contacts.ct_demo_it.secret = 'mot de passe 42';
    const m = flatten(s);
    expect(JSON.stringify(m['contact|ct_demo_it'])).not.toContain('42');
    expect(bucketOf('contactsecret|ct_demo_it', s)).toBe('direction');
    expect(unflatten(m).contacts.ct_demo_it.secret).toBe('mot de passe 42');
    const team = Object.fromEntries(Object.entries(m).filter(([k]) => bucketOf(k, s) === 'equipe'));
    expect(unflatten(team).contacts.ct_demo_it.secret).toBeUndefined();
  });
  it('exports vCards, the pocket card and the chain on the reflex cards', () => {
    const s = demoState(now);
    const v = vcardOf(Object.values(s.contacts), 'X');
    expect(v.match(/BEGIN:VCARD/g)!.length).toBe(Object.keys(s.contacts).length);
    expect(v).toContain('TEL;TYPE=WORK,VOICE:0400000001');
    const vit = vitalContacts(s);
    expect(vit.every(x => x.vital)).toBe(true);
    expect(pocketCardPdf(vit, { company: 'X', address: 'a', access: 'b', date: now })).toMatch(/^%PDF/);
    expect(reflexCardsPdf(s, { company: 'X', by: '', date: now })).toMatch(/^%PDF/);
  });
  it('proposes suppliers and customers not yet in the directory', () => {
    const s = demoState(now);
    const xs = candidates(s);
    expect(xs.every(x => !Object.values(s.contacts).some(y => y.company.toLowerCase() === x.company.toLowerCase()))).toBe(true);
  });
});

describe('annuaire de démonstration', () => {
  it('has 34 employees in one org chart under the director, no bad loop, a mutual pair at the end of a chain is fine', () => {
    const s = demoState(now);
    const inside = Object.values(s.contacts).filter(x => x.category === 'interne');
    expect(inside.length).toBe(34);
    const count = (n: ReturnType<typeof orgTree>[number]): number => 1 + n.children.reduce((a, k) => a + count(k), 0);
    const tree = orgTree(s);
    expect(tree.length).toBe(1);
    expect(tree[0].c.id).toBe('ct_demo_dirigeant');
    expect(count(tree[0])).toBe(34);
    expect(chainIssues(s, now).loops).toEqual([]);
    const claire = chainOf(s, s.contacts.ct_demo_claire);
    expect(claire.cycle).toBe(2);
    expect(duplicates(s)).toEqual([]);
  });
});

describe('organigrammes externes', () => {
  it('groups each outside organisation with its own hierarchy', () => {
    const s = demoState(now);
    const clients = orgGroups(s, 'client');
    const a = clients.find(g => g.company.startsWith('Client A'))!;
    expect(a.roots.map(n => n.c.id)).toEqual(['ct_demo_clientA_dg']);
    expect(a.roots[0].children.map(n => n.c.id).sort()).toEqual(['ct_demo_clientA_dir', 'ct_demo_clientA_dq', 'ct_demo_clientA_log']);
    expect(clients.every(g => g.roots.length === 1)).toBe(true);
    expect(orgGroups(s, 'sante')[0].roots[0].children.length).toBe(3);
    expect(orgGroups(s, 'administration').map(g => g.company)).toEqual(['CARSAT', 'Inspection du travail (DREETS)', 'URSSAF']);
  });
  it('refuses a manager placed under the person', () => {
    const s = demoState(now);
    expect(isUnder(s, 'ct_demo_clientA_asst', 'ct_demo_clientA_dir')).toBe(true);
    expect(isUnder(s, 'ct_demo_clientA_dir', 'ct_demo_clientA_asst')).toBe(false);
  });
});

describe('tout le monde sous le dirigeant', () => {
  it('puts people without a manager under the head, as pending', () => {
    const s = st([c('a', { category: 'interne', name: 'Antoine', role: 'Responsable qualité' }), c('j', { category: 'interne', name: 'Jean-Marc', role: 'Dirigeant' }),
      c('d', { category: 'interne', name: 'David', role: 'Chef d\'atelier' }), c('t', { category: 'interne', name: 'Thomas', role: 'Informatique' }), c('w', { category: 'interne', reportsTo: 'd' })]);
    const t = orgTree(s);
    expect(t.map(n => n.c.id)).toEqual(['j']);
    expect(pendingOf(t).map(x => x.id).sort()).toEqual(['a', 'd', 't']);
    expect(t[0].children.find(n => n.c.id === 'd')!.children[0].c.id).toBe('w');
  });
  it('uses the chosen head, and leaves the chart flat when nobody can be found', () => {
    const s = st([c('x', { category: 'interne' }), c('y', { category: 'interne' })]);
    expect(orgTree(s).length).toBe(2);
    expect(orgTree(s, 'interne', 'y').map(n => n.c.id)).toEqual(['y']);
  });
  it('does the same in each outside organisation', () => {
    const s = st([c('p', { category: 'client', company: 'Client Z', name: 'Acheteur' }), c('q', { category: 'client', company: 'Client Z', name: 'Directeur général' })]);
    const g = orgGroups(s, 'client');
    expect(g[0].roots.map(n => n.c.id)).toEqual(['q']);
    expect(pendingOf(g[0].roots).map(x => x.id)).toEqual(['p']);
  });
});
