// Tool 3.1, purchasing sectors: what the company buys (sheet metal, painting, express transport…), the suppliers that serve each sector in the order
// they are called (main supplier, then backups), who is the best, whether a backup is ready to take over, and the times the main one could not answer.
// Pure functions, covered by sectors.test.ts.
import type { Sector, State, Supplier } from './types';
import { daysBetween, newId, type Insight } from './base';
import { isoDate } from './periods';
import { toCheck } from './contacts';
import {
  classOfSupplier, debitState, isFollowed, lastRating, ratingScore, statusOf, SUPPLIER_STATUS, supplierContacts, supplierFacts, supplierTimeline, type SupplierClass, type TimelineEvent,
} from './suppliers';

const names = <T,>(xs: T[], f: (x: T) => string) => xs.slice(0, 3).map(f).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre(s)` : '');
const plain = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (x: string) => plain(x).split(/[^a-z0-9]+/).filter(w => w.length >= 4);

export const SECTOR_TARGET = 2;
// What the company wants for a sector: a backup (the default), no backup because it is not needed, or a single supplier nobody can replace.
// A sector saved with one supplier wanted (before this choice existed) reads as "not needed".
export type SectorCover = 'backup' | 'none' | 'unique';
export const sectorCover = (sec: Pick<Sector, 'cover' | 'target'>): SectorCover => sec.cover ?? (sec.target === 1 ? 'none' : 'backup');
export const COVER_LABEL: Record<SectorCover, string> = { backup: 'Secours souhaité', none: 'Pas de secours nécessaire', unique: 'Fournisseur unique, sans remplaçant possible' };
export const sectorTarget = (sec: Pick<Sector, 'target' | 'cover'>) => (sectorCover(sec) === 'backup' ? Math.max(2, sec.target ?? SECTOR_TARGET) : 1);
// A sector needs no backup to be covered when the company chose so, or when it wrote what it does if the only supplier stops
export const sectorCovered = (sec: Pick<Sector, 'cover' | 'target' | 'coverNote'>) => sectorCover(sec) === 'none' || (sectorCover(sec) === 'unique' && !!sec.coverNote?.trim());
export const newSector = (name = ''): Sector => ({ id: newId('sec'), name, order: [] });
export const sectorsOf = (s: Pick<State, 'sectors'>, x: Pick<Supplier, 'id' | 'sectorIds'>) => Object.values(s.sectors || {}).filter(sec => x.sectorIds?.includes(sec.id));
export const membersOf = (s: Pick<State, 'suppliers'>, sec: Pick<Sector, 'id'>) => Object.values(s.suppliers).filter(x => x.sectorIds?.includes(sec.id));

export const SWITCH_REASONS = { rupture: 'Rupture ou manque de matière', delai: 'Délai trop long', qualite: 'Qualité insuffisante', capacite: 'Capacité insuffisante', autre: 'Autre' } as const;
export const activeSwitch = (sec: Pick<Sector, 'switches'>) => (sec.switches || []).find(sw => !sw.backAt);
export function startSwitch(sec: Sector, fromId: string, toId: string, p: { reason: string; reasonNote: string; expectedBack: string; by: string }, today = new Date()): Sector {
  return { ...sec, switches: [...(sec.switches || []), { id: newId('sw'), at: isoDate(today), fromId, toId, ...p, backAt: '' }] };
}
export const endSwitch = (sec: Sector, today = new Date()): Sector => ({ ...sec, switches: (sec.switches || []).map(sw => (sw.backAt ? sw : { ...sw, backAt: isoDate(today) })) });
export const switchReason = (sw: { reason: string; reasonNote: string }) => (sw.reason === 'autre' && sw.reasonNote.trim() ? sw.reasonNote.trim() : SWITCH_REASONS[sw.reason as keyof typeof SWITCH_REASONS] || sw.reason);

// A backup is ready when it is referenced, rated A or B, followed on at least one delivery or service of the last 12 months (the account is open and alive),
// and somebody can be called in the directory on a number checked this year. A plan never tried does not exist (rule of the Plans B).
export function backupReadiness(s: State, x: Supplier, today = new Date()): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  const st = statusOf(x), cls = classOfSupplier(x, s.params);
  if (st === 'qualify') missing.push('à qualifier');
  else if (st !== 'listed') missing.push(SUPPLIER_STATUS[st].label.toLowerCase());
  if (st !== 'qualify') { if (!cls) missing.push('pas encore noté'); else if (cls === 'C') missing.push('classe C'); }
  if (!supplierFacts(s, x, today).receipts) missing.push(NO_DELIVERY);
  const people = supplierContacts(s, x);
  if (!people.length) missing.push("aucune personne dans l'annuaire");
  else if (people.every(c => toCheck(c, today))) missing.push('numéro pas vérifié depuis plus d\'un an');
  return { ok: !missing.length, missing };
}

// What a backup lacks when no delivery or service of it was followed: it was never tried
export const NO_DELIVERY = "aucune livraison ou prestation suivie sur 12 mois";
export interface Ranked { x: Supplier; rank: number; role: 'main' | 'backup' | 'out'; score: number | null; cls: SupplierClass | null; ready: { ok: boolean; missing: string[] }; serving: boolean }
const scoreOf = (x: Supplier) => { const r = lastRating(x); return r ? ratingScore(r) : null; };
// The suppliers of a sector in the order they are called: the order set by the company, else the best rating first; suspended and delisted ones last
export function sectorRanking(s: State, sec: Sector, today = new Date()): Ranked[] {
  const members = membersOf(s, sec);
  const auto = (a: Supplier, b: Supplier) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1) || a.name.localeCompare(b.name);
  const at = (x: Supplier) => { const i = sec.order.indexOf(x.id); return i < 0 ? 999 : i; };
  const followed = members.filter(isFollowed).sort(sec.manual ? (a, b) => at(a) - at(b) || auto(a, b) : auto);
  const sw = activeSwitch(sec);
  return [...followed, ...members.filter(x => !isFollowed(x)).sort(auto)].map((x, rank) => ({
    x, rank, role: !isFollowed(x) ? 'out' : rank === 0 ? 'main' : 'backup', score: scoreOf(x), cls: classOfSupplier(x, s.params),
    ready: backupReadiness(s, x, today), serving: isFollowed(x) && (sw ? x.id === sw.toId : rank === 0),
  }));
}
// New order of recourse after moving a supplier one place up or down
export function reordered(ranking: Ranked[], id: string, dir: -1 | 1): string[] {
  const ids = ranking.filter(y => y.role !== 'out').map(y => y.x.id), i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

export type SectorState = 'empty' | 'switched' | 'short' | 'unproven' | 'ok';
export function sectorState(s: State, sec: Sector, today = new Date()): SectorState {
  const r = sectorRanking(s, sec, today).filter(y => y.role !== 'out');
  if (!r.length) return 'empty';
  if (activeSwitch(sec)) return 'switched';
  if (sectorTarget(sec) < 2) return 'ok';
  if (r.length < sectorTarget(sec)) return 'short';
  return r.slice(1).some(y => y.ready.ok) ? 'ok' : 'unproven';
}
export function sectorBadge(s: State, sec: Sector, today = new Date()): { level: 'ok' | 'warn' | 'alert' | 'pending'; text: string } {
  const st = sectorState(s, sec, today), n = sectorRanking(s, sec, today).filter(y => y.role !== 'out').length;
  return st === 'empty' ? { level: 'alert', text: 'Aucun fournisseur' } : st === 'short' ? { level: n < 2 ? 'alert' : 'warn', text: n < 2 ? 'Pas de secours' : `${n} sur ${sectorTarget(sec)} souhaités` }
    : st === 'switched' ? { level: 'warn', text: 'Secours en service' } : st === 'unproven' ? { level: 'warn', text: 'Secours non éprouvé' }
    : sectorCover(sec) === 'none' ? { level: 'ok', text: 'Pas de secours nécessaire' }
    : sectorCover(sec) === 'unique' ? (sectorCovered(sec) ? { level: 'ok', text: 'Fournisseur unique assumé' } : { level: 'warn', text: 'Mesure à écrire' })
    : { level: 'ok', text: 'Principal et secours prêts' };
}
export function sectorSummary(s: State, today = new Date()) {
  const states = Object.values(s.sectors || {}).map(sec => sectorState(s, sec, today));
  const count = (k: SectorState) => states.filter(x => x === k).length;
  return { count: states.length, empty: count('empty'), short: count('short'), unproven: count('unproven'), switched: count('switched'), ok: count('ok'), issues: states.filter(x => x !== 'ok').length };
}

// ---- Plans B (1.2): a risk that names the sector or what it supplies
const riskText = (s: Pick<State, 'risks'>) => Object.values(s.risks).map(r => plain(`${r.resource} ${r.title}`));
export const sectorHasRisk = (s: Pick<State, 'risks'>, sec: Pick<Sector, 'name'>) => { const ws = words(sec.name); return riskText(s).some(t => (!!sec.name.trim() && t.includes(plain(sec.name))) || ws.some(w => t.includes(w))); };
export const sectorRiskText = (s: State, sec: Sector) => ({
  title: `Rupture de fournisseur : ${sec.name}`, resource: `Secteur ${sec.name} : ${membersOf(s, sec).map(x => x.name).join(', ') || 'à renseigner'}`,
  cause: sectorCover(sec) === 'unique' ? 'Fournisseur unique : aucun remplaçant possible sur ce secteur' : sectorTarget(sec) > 1 && membersOf(s, sec).filter(isFollowed).length > 1 ? 'Le fournisseur principal ne peut plus répondre' : 'Un seul fournisseur actif sur ce secteur, sans secours référencé',
  ...(sectorCover(sec) === 'unique' && sec.coverNote?.trim() ? { planB: sec.coverNote.trim() } : {}),
});
// A critical supplier is covered when every sector it serves has a ready backup, or when a risk of 1.2 names it or what it supplies
export function hasPlanB(s: State, x: Supplier, today = new Date()): boolean {
  const secs = sectorsOf(s, x);
  if (secs.length && secs.every(sec => sectorCovered(sec) || sectorRanking(s, sec, today).some(y => y.x.id !== x.id && y.role !== 'out' && y.ready.ok))) return true;
  const ws = words(x.supplies);
  return riskText(s).some(t => (!!x.name.trim() && t.includes(plain(x.name))) || ws.some(w => t.includes(w)));
}

// ---- alerts and tasks
export function sectorInsights(s: State, today = new Date()): Insight[] {
  const out: Insight[] = [];
  const followed = Object.values(s.suppliers).filter(isFollowed);
  const critical = followed.filter(x => x.strategic && !hasPlanB(s, x, today));
  if (critical.length) out.push({ key: 'planb', tone: 'warn', title: 'Fournisseur critique sans secours', text: `${names(critical, x => x.name)} : son arrêt n'est couvert ni par un secours prêt dans son secteur, ni par un Plan B (outil 1.2).` });
  const secs = Object.values(s.sectors || {});
  if (!secs.length) return out;
  const rows = secs.map(sec => ({ sec, r: sectorRanking(s, sec, today).filter(y => y.role !== 'out') }));
  const empty = rows.filter(y => !y.r.length);
  if (empty.length) out.push({ key: 'sector_empty', tone: 'bad', title: 'Secteur sans fournisseur', text: `${names(empty, y => y.sec.name)} : aucun fournisseur actif.` });
  const alone = rows.filter(y => y.r.length === 1 && sectorTarget(y.sec) > 1);
  if (alone.length) out.push({ key: 'sector_alone', tone: 'bad', title: 'Secteur sans secours', text: `${names(alone, y => `${y.sec.name} (${y.r[0].x.name})`)} : un seul fournisseur actif.` });
  const bare = rows.filter(y => y.r.length > 0 && sectorCover(y.sec) === 'unique' && !sectorCovered(y.sec));
  if (bare.length) out.push({ key: 'sector_unique', tone: 'warn', title: 'Fournisseur unique sans mesure prévue', text: `${names(bare, y => `${y.sec.name} (${y.r[0].x.name})`)} : aucune mesure écrite si ce fournisseur s'arrête.` });
  const few = rows.filter(y => y.r.length > 1 && y.r.length < sectorTarget(y.sec));
  if (few.length) out.push({ key: 'sector_few', tone: 'warn', title: 'Moins de fournisseurs que souhaité', text: `${names(few, y => `${y.sec.name} (${y.r.length} sur ${sectorTarget(y.sec)})`)}.` });
  rows.forEach(({ sec }) => {
    const sw = activeSwitch(sec);
    if (!sw) return;
    const late = sw.expectedBack && sw.expectedBack < isoDate(today);
    out.push({ key: `sector_switch_${sec.id}`, tone: late ? 'bad' : 'warn', title: 'Secours en service', text: `${sec.name} : ${s.suppliers[sw.fromId]?.name || 'le principal'} indisponible depuis ${daysBetween(sw.at, today) ?? 0} jour(s) (${switchReason(sw).toLowerCase()}), ${s.suppliers[sw.toId]?.name || 'le secours'} en service${sw.expectedBack ? `, retour prévu le ${new Date(sw.expectedBack).toLocaleDateString('fr-FR')}${late ? ' : dépassé' : ''}` : ''}.` });
  });
  const weak = rows.filter(y => y.r.length > 1 && !activeSwitch(y.sec)).map(y => {
    const m = y.r[0], f = supplierFacts(s, m.x, today), why = [m.cls === 'C' && 'classe C', statusOf(m.x) === 'watch' && 'sous surveillance', f.repeats.length && 'défaut répété', f.claims.some(d => debitState(d, today, s.params) === 'contested') && 'réclamation contestée'].filter(Boolean) as string[];
    return { ...y, why };
  }).filter(y => y.why.length);
  if (weak.length) out.push({ key: 'sector_weak', tone: 'warn', title: 'Principal fragile', text: `${names(weak, y => `${y.sec.name} : ${y.r[0].x.name} (${y.why.join(', ')})`)}.` });
  const better = rows.filter(y => y.sec.manual && y.r.length > 1 && y.r[0].score !== null && y.r.slice(1).some(b => b.score !== null && b.score > y.r[0].score!));
  if (better.length) out.push({ key: 'sector_best', tone: 'warn', title: 'Un secours est mieux noté que le principal', text: `${names(better, y => { const b = y.r.slice(1).filter(c => c.score !== null).sort((p, q) => q.score! - p.score!)[0]; return `${y.sec.name} : ${b.x.name} (${b.score}) devant ${y.r[0].x.name} (${y.r[0].score})`; })}.` });
  const unproven = rows.filter(y => y.r.length > 1 && sectorTarget(y.sec) > 1 && !activeSwitch(y.sec) && !y.r.slice(1).some(b => b.ready.ok));
  if (unproven.length) out.push({ key: 'sector_unproven', tone: 'warn', title: 'Secours non éprouvé', text: `${names(unproven, y => `${y.sec.name} : ${y.r[1].x.name} (${y.r[1].ready.missing.join(', ')})`)}.` });
  const free = followed.filter(x => !sectorsOf(s, x).length);
  if (free.length) out.push({ key: 'sector_free', tone: 'warn', title: 'Fournisseur sans secteur', text: `${names(free, x => x.name)} : pas rangé dans un secteur d'achat.` });
  return out;
}

export function sectorTasks(s: State, today = new Date()): { id: string; text: string; due: string; focus: string }[] {
  const out: { id: string; text: string; due: string; focus: string }[] = [];
  Object.values(s.sectors || {}).forEach(sec => {
    const r = sectorRanking(s, sec, today).filter(y => y.role !== 'out'), sw = activeSwitch(sec);
    if (sw) out.push({ id: `sw${sw.id}`, text: `Retour du principal ${s.suppliers[sw.fromId]?.name || ''} attendu (secteur ${sec.name})`.replace('  ', ' '), due: sw.expectedBack, focus: `sector:${sec.id}` });
    if (r.length && sectorCover(sec) === 'unique' && !sectorCovered(sec)) out.push({ id: `un${sec.id}`, text: `Mesure à écrire si le fournisseur unique du secteur ${sec.name} s'arrête`, due: '', focus: `sector:${sec.id}` });
    if (sectorTarget(sec) > 1 && r.length < sectorTarget(sec)) out.push({ id: `sh${sec.id}`, text: `Fournisseur de secours à référencer : secteur ${sec.name}`, due: '', focus: `sector:${sec.id}` });
    const trial = r.slice(1).find(y => !y.ready.ok && y.ready.missing.includes(NO_DELIVERY));
    if (trial && !sw) out.push({ id: `tr${sec.id}${trial.x.id}`, text: `Commande d'essai à passer chez ${trial.x.name} (secours du secteur ${sec.name})`, due: '', focus: trial.x.id });
  });
  return out;
}

// What the sectors add to the history of a supplier: the times it replaced the main one, or was replaced
export function sectorEvents(s: State, x: Supplier): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  Object.values(s.sectors || {}).forEach(sec => (sec.switches || []).forEach(sw => {
    if (sw.fromId !== x.id && sw.toId !== x.id) return;
    const from = s.suppliers[sw.fromId]?.name || 'le principal', to = s.suppliers[sw.toId]?.name || 'le secours';
    out.push({ date: sw.at, kind: 'switch', text: `Secteur ${sec.name} : ${to} remplace ${from} (${switchReason(sw).toLowerCase()})` });
    if (sw.backAt) out.push({ date: sw.backAt, kind: 'switch', text: `Secteur ${sec.name} : ${from} de nouveau en service` });
  }));
  return out;
}
export const fullTimeline = (s: State, x: Supplier): TimelineEvent[] => [...supplierTimeline(s, x), ...sectorEvents(s, x)].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// Sectors suggested by what the suppliers say they supply, for the suppliers not in a sector yet (the company then renames, merges, removes)
export function proposeSectors(s: State): { name: string; supplierIds: string[] }[] {
  const have = new Set(Object.values(s.sectors || {}).map(sec => plain(sec.name).trim()));
  const groups = new Map<string, { name: string; supplierIds: string[] }>();
  Object.values(s.suppliers).filter(x => x.supplies.trim() && !(x.sectorIds || []).some(id => s.sectors?.[id])).forEach(x => {
    const k = plain(x.supplies).trim();
    if (have.has(k)) return;
    const g = groups.get(k) || { name: x.supplies.trim(), supplierIds: [] };
    g.supplierIds.push(x.id);
    groups.set(k, g);
  });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
