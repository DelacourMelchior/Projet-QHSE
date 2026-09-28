// Directory (tool 1.3): categories, labels, numbers to check, call chains (who next when nobody answers),
// the org charts (the company, and each outside organisation: customer, supplier, occupational health…), duplicates, the monthly check campaign and the export to the phone contacts (vCard).
import type { Contact, ContactCategory, Person, State } from './types';
import { parseDate } from './periods';

export const CATEGORIES: { key: ContactCategory; label: string }[] = [
  { key: 'secours', label: 'Secours et sécurité' },
  { key: 'interne', label: 'Interne' },
  { key: 'client', label: 'Clients' },
  { key: 'fournisseur', label: 'Fournisseurs' },
  { key: 'prestataire', label: 'Prestataires et sous-traitants' },
  { key: 'finance', label: 'Banques et assurances' },
  { key: 'conseil', label: 'Expert-comptable, avocat et conseils' },
  { key: 'sante', label: 'Médecine du travail' },
  { key: 'administration', label: 'Inspection du travail et administrations' },
  { key: 'autre', label: 'Autres' },
];
export const categoryLabel = (k: ContactCategory) => CATEGORIES.find(c => c.key === k)?.label || 'Autres';

// "Banque B · Conseiller entreprises": the company first, it is what people look for
export const contactLabel = (c: Contact) => [c.company, c.name].filter(Boolean).join(' · ') || 'Sans nom';
export const telOf = (phone: string) => phone.replace(/[^\d+]/g, '');

// Never checked, or checked more than a year ago
export function toCheck(c: Contact, today = new Date()): boolean {
  const d = parseDate(c.verifiedAt);
  return !d || (today.getTime() - d.getTime()) / 86400000 > 365;
}

// Who to call, in order: the contact, then its backup, then the backup of the backup… (stops on a loop)
// cycle = number of people who send back to each other at the end of the chain (0 when it ends)
export function chainOf(s: Pick<State, 'contacts'>, c: Contact): { chain: Contact[]; loop: boolean; cycle: number } {
  const chain = [c];
  let next = c.backupId ? s.contacts[c.backupId] : undefined;
  while (next) {
    if (chain.includes(next)) return { chain, loop: true, cycle: chain.length - chain.indexOf(next) };
    chain.push(next);
    next = next.backupId ? s.contacts[next.backupId] : undefined;
  }
  return { chain, loop: false, cycle: 0 };
}

// Chains to draw: they start at a contact that is nobody's backup (a loop is drawn from its first member)
export function callChains(s: Pick<State, 'contacts'>): ReturnType<typeof chainOf>[] {
  const all = Object.values(s.contacts);
  const isBackup = new Set(all.map(c => c.backupId).filter(Boolean));
  const out = all.filter(c => c.backupId && !isBackup.has(c.id)).map(c => chainOf(s, c));
  const seen = new Set(out.flatMap(x => x.chain.map(c => c.id)));
  for (const c of all) {
    if (!c.backupId || seen.has(c.id)) continue;
    const x = chainOf(s, c);
    x.chain.forEach(y => seen.add(y.id));
    out.push(x);
  }
  return out.sort((a, b) => contactLabel(a.chain[0]).localeCompare(contactLabel(b.chain[0])));
}

// Org chart of one category. Everyone hangs from one top person: people without a manager are placed under the top
// person as "to attach" (pending) until someone drags them under their real manager.
export interface OrgNode { c: Contact; children: OrgNode[]; pending?: boolean }
function forest(s: Pick<State, 'contacts'>, category: ContactCategory): OrgNode[] {
  const inside = Object.values(s.contacts).filter(c => c.category === category);
  const ids = new Set(inside.map(c => c.id));
  const roots = inside.filter(c => !c.reportsTo || !ids.has(c.reportsTo) || reportsLoop(s, c));
  const rootIds = new Set(roots.map(c => c.id));
  const build = (c: Contact): OrgNode => ({ c, children: inside.filter(x => x.reportsTo === c.id && !rootIds.has(x.id)).sort(byLabel).map(build) });
  return roots.sort(byLabel).map(build);
}
// Who is on top, from the wording: the head first, then a director, then a manager (outside, the function is often in the name)
const TOP_WORDS = [/dirigeant|g[ée]rant|pdg|pr[ée]sident|directeur g[ée]n[ée]ral|directrice g[ée]n[ée]rale|chef d'entreprise|\bdg\b/i, /directeur|directrice/i, /responsable|chef/i];
const size = (n: OrgNode): number => 1 + n.children.reduce((a, k) => a + size(k), 0);
export function topOf(roots: OrgNode[], topId?: string): OrgNode | undefined {
  const chosen = roots.find(n => n.c.id === topId);
  if (chosen) return chosen;
  for (const re of TOP_WORDS) {
    const hits = roots.filter(n => re.test(`${n.c.name} ${n.c.role}`));
    if (hits.length) return hits.sort((a, b) => size(b) - size(a))[0];
  }
  return undefined;
}
function cascade(roots: OrgNode[], topId?: string): OrgNode[] {
  if (roots.length < 2) return roots;
  const top = topOf(roots, topId);
  if (!top) return roots;
  return [{ ...top, children: [...top.children, ...roots.filter(n => n !== top).map(n => ({ ...n, pending: true }))] }];
}
export function orgTree(s: Pick<State, 'contacts'>, category: ContactCategory = 'interne', topId?: string): OrgNode[] {
  return cascade(forest(s, category), topId);
}
// Outside the company: one org chart per organisation (Client A, Fournisseur B…), each with its own top person
export function orgGroups(s: Pick<State, 'contacts'>, category: ContactCategory): { company: string; roots: OrgNode[] }[] {
  const groups = new Map<string, { company: string; roots: OrgNode[] }>();
  forest(s, category).forEach(n => {
    const company = n.c.company.trim() || 'Sans société';
    const k = company.toLowerCase();
    if (!groups.has(k)) groups.set(k, { company, roots: [] });
    groups.get(k)!.roots.push(n);
  });
  return [...groups.values()].map(g => ({ ...g, roots: cascade(g.roots) })).sort((a, b) => a.company.localeCompare(b.company));
}
// People shown under the top person only because nobody attached them yet
export const pendingOf = (roots: OrgNode[]): Contact[] => roots.flatMap(n => [...(n.pending ? [n.c] : []), ...pendingOf(n.children)]);
const byLabel = (a: Contact, b: Contact) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0) || contactLabel(a).localeCompare(contactLabel(b));
// A manager chain that comes back to the contact: the contact is drawn as a root, not lost
function reportsLoop(s: Pick<State, 'contacts'>, c: Contact): boolean {
  const seen = new Set<string>();
  let m = c.reportsTo ? s.contacts[c.reportsTo] : undefined;
  while (m) { if (m.id === c.id) return true; if (seen.has(m.id)) return false; seen.add(m.id); m = m.reportsTo ? s.contacts[m.reportsTo] : undefined; }
  return false;
}
// True when "who" is "boss" or somewhere under "boss": putting boss under who would close a loop
export function isUnder(s: Pick<State, 'contacts'>, who: string, boss: string): boolean {
  const seen = new Set<string>();
  let id: string | undefined = who;
  while (id && !seen.has(id)) { if (id === boss) return true; seen.add(id); id = s.contacts[id]?.reportsTo; }
  return false;
}

// Deputies named in tool 4.1 for the vital acts this person holds
export function deputiesFromPowers(s: Pick<State, 'powers'>, c: Contact): string[] {
  const n = c.name.trim().toLowerCase();
  if (!n) return [];
  return [...new Set(Object.values(s.powers || {}).filter(p => p.holder.trim().toLowerCase() === n).flatMap(p => [...p.deputies, ...(p.extra || [])]).map(x => x.trim()).filter(Boolean))];
}

// Same phone number or same e-mail on two cards
export function duplicates(s: Pick<State, 'contacts'>): Contact[][] {
  const groups = new Map<string, Contact[]>();
  Object.values(s.contacts).forEach(c => {
    const keys = [telOf(c.phone).replace(/^\+33/, '0'), c.email.trim().toLowerCase()].filter(k => k.length > 3);
    keys.forEach(k => groups.set(k, [...(groups.get(k) || []), c]));
  });
  const seen = new Set<string>();
  return [...groups.values()].filter(g => g.length > 1).filter(g => { const k = g.map(c => c.id).sort().join(); if (seen.has(k)) return false; seen.add(k); return true; });
}

// Two people who stand in for each other is normal; a loop of 3 or more means nobody knows where the chain ends
export const badLoop = (x: { cycle: number }) => x.cycle > 2;

// What is wrong in the chains: a loop of 3 or more, or a number never checked (or checked more than a year ago) in a chain
export function chainIssues(s: Pick<State, 'contacts'>, today = new Date()): { loops: Contact[][]; unchecked: Contact[] } {
  const chains = callChains(s);
  return {
    loops: chains.filter(badLoop).map(x => x.chain),
    unchecked: [...new Set(chains.flatMap(x => x.chain).filter(c => toCheck(c, today)))],
  };
}

// Monthly campaign: 4 numbers to call this month, the vital and the used ones first, the oldest checks first
export function toCallThisMonth(s: Pick<State, 'contacts' | 'risks'>, today = new Date(), n = 4): Contact[] {
  const used = new Set(Object.values(s.risks || {}).flatMap(r => [...r.contactIds, ...r.notifyIds]));
  const score = (c: Contact) => (c.vital ? 2 : 0) + (used.has(c.id) ? 1 : 0);
  return Object.values(s.contacts).filter(c => c.phone.trim() && c.category !== 'secours' && toCheck(c, today))
    .sort((a, b) => score(b) - score(a) || (a.verifiedAt || '').localeCompare(b.verifiedAt || '') || contactLabel(a).localeCompare(contactLabel(b)))
    .slice(0, n);
}

// Vital first, then by category and label: the order of the pocket card
export function vitalContacts(s: Pick<State, 'contacts'>, n = 12): Contact[] {
  const rank = (c: Contact) => CATEGORIES.findIndex(x => x.key === c.category);
  const pinned = Object.values(s.contacts).filter(c => c.vital && c.phone.trim());
  const list = pinned.length ? pinned : Object.values(s.contacts).filter(c => c.phone.trim() && (c.category === 'secours' || c.always));
  return list.sort((a, b) => rank(a) - rank(b) || contactLabel(a).localeCompare(contactLabel(b))).slice(0, n);
}

// vCard 3.0 file: all the cards open in the phone contacts (iPhone, Android, Outlook)
export function vcardOf(list: Contact[], company = ''): string {
  const esc = (t: string) => t.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');
  return list.map(c => [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${esc(contactLabel(c))}`, `N:${esc(c.name)};;;;`,
    c.company && `ORG:${esc(c.company)}`, c.role && `TITLE:${esc(c.role)}`,
    c.phone && `TEL;TYPE=WORK,VOICE:${telOf(c.phone)}`, c.phone2 && `TEL;TYPE=OTHER:${telOf(c.phone2)}`,
    c.email && `EMAIL;TYPE=INTERNET:${c.email}`,
    `NOTE:${esc([company && `Annuaire de crise ${company}`, c.hours && `Horaires : ${c.hours}`, c.reference && `Référence : ${c.reference}`, c.always && 'Joignable 24 h/24'].filter(Boolean).join(' · '))}`,
    'CATEGORIES:Annuaire de crise', 'END:VCARD',
  ].filter(Boolean).join('\r\n')).join('\r\n');
}

// "Client A" is the same organisation as "Client A (grand compte)": compare the words, not the whole text
export const orgKey = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Cards the other tools already know (suppliers 3.1, customers 2.1 / 2.3) and that are not in the directory yet
export function candidates(s: Pick<State, 'contacts' | 'suppliers' | 'quotes' | 'complaints'>): { key: string; category: ContactCategory; company: string; name: string; from: string; supplierId?: string }[] {
  const key = orgKey;
  const known = Object.values(s.contacts).map(c => key(c.company)).filter(Boolean);
  const out: ReturnType<typeof candidates> = [];
  const push = (x: (typeof out)[number]) => { const k = key(x.company); if (!k || known.includes(k)) return; known.push(k); out.push(x); };
  Object.values(s.suppliers || {}).filter(x => !x.contactId).forEach(x => push({ key: `s${x.id}`, category: 'fournisseur', company: x.name, name: x.contact, from: 'Fournisseurs (3.1)', supplierId: x.id }));
  [...Object.values(s.quotes || {}).filter(q => q.status === 'won').map(q => q.client), ...Object.values(s.complaints || {}).map(c => c.client)]
    .forEach(client => push({ key: `c${client}`, category: 'client', company: client, name: '', from: 'Devis gagnés et réclamations' }));
  return out;
}

// ---- one staff list: the internal contacts of the directory and the people of tools 4.1 to 4.3 are the same people
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const personOf = (s: Pick<State, 'people'>, c: Contact): Person | undefined =>
  (c.personId && s.people?.[c.personId]) || Object.values(s.people || {}).find(p => p.name.trim() && same(p.name, c.name));
// Adds the missing side (a contact for a person, a person for a contact) and keeps the link; returns the number added
export function syncStaff(d: State): number {
  let n = 0;
  const inside = Object.values(d.contacts).filter(c => c.category === 'interne' && !c.vacant && c.name.trim());
  inside.forEach(c => {
    if (c.personId && !d.people[c.personId]) return;   // removed from the staff list on purpose: not created again
    const p = personOf(d, c);
    if (p) { if (c.personId !== p.id) c.personId = p.id; if (!p.role && c.role) p.role = c.role; return; }
    const id = `pp_${c.id}`;
    d.people[id] = { id, name: c.name.trim(), role: c.role, active: true };
    c.personId = id; n++;
  });
  const linked = new Set(Object.values(d.contacts).map(c => c.personId).filter(Boolean));
  Object.values(d.people || {}).filter(p => p.active && p.name.trim() && !linked.has(p.id)).forEach(p => {
    const id = `ct_${p.id}`;
    d.contacts[id] = { id, category: 'interne', name: p.name.trim(), role: p.role, company: 'Interne', phone: '', email: '', always: false, verifiedAt: '', personId: p.id };
    n++;
  });
  return n;
}
// What the staff tools know about this person: absent today (until when), sole holder of a skill (4.2) or of a vital act (4.1)
export function staffInfo(s: State, c: Contact, today = new Date()): { absentUntil: string; skills: string[]; powers: string[] } {
  const p = c.category === 'interne' ? personOf(s, c) : undefined;
  const day = today.toISOString().slice(0, 10);
  const abs = (p?.absences || []).find(a => a.from <= day && day <= a.to);
  const skills = p ? Object.values(s.skills || {}).filter(k => { const aut = Object.entries(k.levels).filter(([id, l]) => l >= 3 && s.people[id]?.active); return aut.length === 1 && aut[0][0] === p.id; }).map(k => k.name) : [];
  const powers = c.name.trim() ? Object.values(s.powers || {}).filter(x => same(x.holder, c.name) && ![...x.deputies, ...(x.extra || [])].some(d => d.trim())).map(x => x.power) : [];
  return { absentUntil: abs?.to || '', skills, powers };
}
// Managers from the person up to the top of the chart
export function managersOf(s: Pick<State, 'contacts'>, c: Contact): Contact[] {
  const out: Contact[] = [];
  let m = c.reportsTo ? s.contacts[c.reportsTo] : undefined;
  while (m && !out.includes(m) && m !== c) { out.push(m); m = m.reportsTo ? s.contacts[m.reportsTo] : undefined; }
  return out;
}
export const CONTRACTS: { key: NonNullable<Contact['contract']>; label: string }[] = [
  { key: '', label: 'CDI' }, { key: 'cdd', label: 'CDD' }, { key: 'interim', label: 'Intérim' }, { key: 'alternance', label: 'Alternance' }, { key: 'stage', label: 'Stage' },
];
