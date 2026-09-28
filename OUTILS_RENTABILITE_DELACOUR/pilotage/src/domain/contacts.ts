// Crisis directory (tool 1.3): categories, labels, numbers to check, call chains (who next when nobody answers),
// the internal org chart, duplicates, the monthly check campaign and the export to the phone contacts (vCard).
import type { Contact, ContactCategory, State } from './types';
import { parseDate } from './periods';

export const CATEGORIES: { key: ContactCategory; label: string }[] = [
  { key: 'secours', label: 'Secours et sécurité' },
  { key: 'interne', label: 'Interne' },
  { key: 'prestataire', label: 'Prestataires, confrères et maintenance' },
  { key: 'fournisseur', label: 'Fournisseurs' },
  { key: 'client', label: 'Clients' },
  { key: 'finance', label: 'Banque et assurance' },
  { key: 'autre', label: 'Autres' },
];

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

// Org chart of the internal contacts: roots are those without a manager (or whose manager is not internal)
export interface OrgNode { c: Contact; children: OrgNode[] }
export function orgTree(s: Pick<State, 'contacts'>): OrgNode[] {
  const inside = Object.values(s.contacts).filter(c => c.category === 'interne');
  const ids = new Set(inside.map(c => c.id));
  const roots = inside.filter(c => !c.reportsTo || !ids.has(c.reportsTo) || reportsLoop(s, c));
  const rootIds = new Set(roots.map(c => c.id));
  const build = (c: Contact): OrgNode => ({ c, children: inside.filter(x => x.reportsTo === c.id && !rootIds.has(x.id)).sort(byLabel).map(build) });
  return roots.sort(byLabel).map(build);
}
const byLabel = (a: Contact, b: Contact) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0) || contactLabel(a).localeCompare(contactLabel(b));
// A manager chain that comes back to the contact: the contact is drawn as a root, not lost
function reportsLoop(s: Pick<State, 'contacts'>, c: Contact): boolean {
  const seen = new Set<string>();
  let m = c.reportsTo ? s.contacts[c.reportsTo] : undefined;
  while (m) { if (m.id === c.id) return true; if (seen.has(m.id)) return false; seen.add(m.id); m = m.reportsTo ? s.contacts[m.reportsTo] : undefined; }
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

// Cards the other tools already know (suppliers 3.1, customers 2.1 / 2.3) and that are not in the directory yet
export function candidates(s: Pick<State, 'contacts' | 'suppliers' | 'quotes' | 'complaints'>): { key: string; category: ContactCategory; company: string; name: string; from: string; supplierId?: string }[] {
  // "Client A" is already there as "Client A (grand compte)": compare the words, not the whole text
  const key = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const known = Object.values(s.contacts).map(c => key(c.company)).filter(Boolean);
  const out: ReturnType<typeof candidates> = [];
  const push = (x: (typeof out)[number]) => { const k = key(x.company); if (!k || known.includes(k)) return; known.push(k); out.push(x); };
  Object.values(s.suppliers || {}).filter(x => !x.contactId).forEach(x => push({ key: `s${x.id}`, category: 'fournisseur', company: x.name, name: x.contact, from: 'Fournisseurs (3.1)', supplierId: x.id }));
  [...Object.values(s.quotes || {}).filter(q => q.status === 'won').map(q => q.client), ...Object.values(s.complaints || {}).map(c => c.client)]
    .forEach(client => push({ key: `c${client}`, category: 'client', company: client, name: '', from: 'Devis gagnés et réclamations' }));
  return out;
}
