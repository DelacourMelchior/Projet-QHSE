// State <-> flat map of independent keys, the unit of synchronisation between people.
//   settings | timeline | process|<id> | kpi|<id> | value|<kpiId>|<YYYY-MM> | action|<id>
//   risk|<id> (without money) | riskcost|<id> (money figures of a risk, direction folder) | contact|<id> | scale
//   tools 2.1 to 5.4: one key per record (<kind>|<id>, see COLLECTIONS), quotecost|<id> (direction folder),
//   and the single records params, envelope, ged
import type { Power, Quote, QuoteCost, Risk, RiskCost, State } from '../domain/types';
import { DEFAULT_SCALE } from '../domain/risk';
import { DEFAULT_SETTINGS } from '../domain/migrate';
import { emptyTools } from '../domain/base';

export type FlatMap = Record<string, unknown>;

type CollectionKey = 'contacts' | 'changes' | 'complaints' | 'feedbacks' | 'suppliers' | 'debits' | 'sops' | 'equipments' | 'deliveries'
  | 'people' | 'skills' | 'newcomers' | 'chronos' | 'ncs' | 'analyses' | 'pokas' | 'logs';
// key prefix -> collection of the state (records stored whole, readable by the team)
export const COLLECTIONS: Record<string, CollectionKey> = {
  contact: 'contacts', change: 'changes', complaint: 'complaints', feedback: 'feedbacks', supplier: 'suppliers', debit: 'debits',
  sop: 'sops', equipment: 'equipments', delivery: 'deliveries', person: 'people', skill: 'skills',
  newcomer: 'newcomers', chrono: 'chronos', nc: 'ncs', analysis: 'analyses', poka: 'pokas', log: 'logs',
};
const SINGLES = ['params', 'envelope', 'ged'] as const;

export function flatten(s: State): FlatMap {
  const m: FlatMap = { settings: s.settings, timeline: s.timeline };
  s.processes.forEach(p => { m[`process|${p.id}`] = p; });
  Object.values(s.kpis).forEach(k => { m[`kpi|${k.id}`] = k; });
  Object.entries(s.values).forEach(([id, byP]) => Object.entries(byP).forEach(([p, v]) => { m[`value|${id}|${p}`] = v; }));
  Object.values(s.actions).forEach(a => { m[`action|${a.id}`] = a; });
  Object.values(s.risks || {}).forEach(({ cost, ...r }) => {
    m[`risk|${r.id}`] = r;
    if (cost) m[`riskcost|${r.id}`] = cost;
  });
  Object.values(s.quotes || {}).forEach(({ cost, ...q }) => {
    m[`quote|${q.id}`] = q;
    if (cost) m[`quotecost|${q.id}`] = cost;
  });
  // where the codes of a vital power are: direction folder
  Object.values(s.powers || {}).forEach(({ access, ...p }) => {
    m[`power|${p.id}`] = p;
    if (access) m[`poweraccess|${p.id}`] = access;
  });
  for (const [kind, key] of Object.entries(COLLECTIONS)) {
    Object.values((s[key] || {}) as Record<string, { id: string }>).forEach(x => { m[`${kind}|${x.id}`] = extractPhotos(x, m); });
  }
  SINGLES.forEach(k => { if (s[k]) m[k] = s[k]; });
  if (s.scale) m.scale = s.scale;
  return m;
}

export function unflatten(m: FlatMap): State {
  const tools = emptyTools();
  const s: State = {
    settings: { ...DEFAULT_SETTINGS, ...(m.settings as object || {}) },
    timeline: (m.timeline as State['timeline']) || { start: '2026-01', end: '2026-12' },
    processes: [], kpis: {}, values: {}, actions: {}, risks: {}, contacts: {},
    scale: (m.scale as State['scale']) || DEFAULT_SCALE,
    ...tools,
    params: { ...tools.params, ...(m.params as object || {}) },
    envelope: (m.envelope as State['envelope']) || tools.envelope,
    ged: (m.ged as State['ged']) || tools.ged,
  };
  const riskCosts: Record<string, RiskCost> = {};
  const quoteCosts: Record<string, QuoteCost> = {};
  const accesses: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    const [kind, id, period] = k.split('|');
    if (kind === 'process') s.processes.push(v as State['processes'][number]);
    else if (kind === 'kpi') s.kpis[id] = v as State['kpis'][string];
    else if (kind === 'value' && typeof v === 'number') (s.values[id] ||= {})[period] = v;
    else if (kind === 'action') s.actions[id] = v as State['actions'][string];
    else if (kind === 'risk') s.risks[id] = { ...(v as Risk) };
    else if (kind === 'riskcost') riskCosts[id] = v as RiskCost;
    else if (kind === 'quote') s.quotes[id] = { ...(v as Quote) };
    else if (kind === 'quotecost') quoteCosts[id] = v as QuoteCost;
    else if (kind === 'power') s.powers[id] = { ...(v as Power), access: (v as Power).access || '' };
    else if (kind === 'poweraccess') accesses[id] = v as string;
    else if (COLLECTIONS[kind]) (s[COLLECTIONS[kind]] as Record<string, unknown>)[id] = restorePhotos(v, m);
  }
  Object.entries(riskCosts).forEach(([id, c]) => { if (s.risks[id]) s.risks[id].cost = c; });
  Object.entries(quoteCosts).forEach(([id, c]) => { if (s.quotes[id]) s.quotes[id].cost = c; });
  Object.entries(accesses).forEach(([id, a]) => { if (s.powers[id]) s.powers[id].access = a; });
  s.processes.sort((a, b) => a.order - b.order);
  s.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => s.kpis[id]); });
  return s;
}

// Confidential values and the financial settings live in the "direction" folder
export function bucketOf(key: string, s: State): 'equipe' | 'direction' {
  if (key === 'settings' || key.startsWith('riskcost|') || key.startsWith('quotecost|') || key.startsWith('poweraccess|') || key === 'envelope') return 'direction';
  if (key.startsWith('value|')) return s.kpis[key.split('|')[1]]?.confidential ? 'direction' : 'equipe';
  return 'equipe';
}

// Keys whose content differs (added, changed or removed)
export function diffKeys(a: FlatMap, b: FlatMap): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}

// Photos (data URLs) are stored once under photo|<hash> and referenced as "photo:<hash>" in the records,
// so that editing a text does not rewrite the pictures (in the shared folder they are separate .jpg files)
const hash = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i += 7) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16) + text.length.toString(16); };
function extractPhotos<T>(x: T, m: FlatMap): T {
  if (typeof x === 'string') { if (!x.startsWith('data:image/')) return x; const k = hash(x); m[`photo|${k}`] = x; return `photo:${k}` as T; }
  if (Array.isArray(x)) return x.map(y => extractPhotos(y, m)) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, extractPhotos(v, m)])) as T;
  return x;
}
function restorePhotos<T>(x: T, m: FlatMap): T {
  if (typeof x === 'string') return (x.startsWith('photo:') ? (m[`photo|${x.slice(6)}`] as string) || '' : x) as T;
  if (Array.isArray(x)) return x.map(y => restorePhotos(y, m)) as T;
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, restorePhotos(v, m)])) as T;
  return x;
}

// Records created, changed or deleted between two states (the journal, not the figures of the month)
const LOGGED = /^(action|risk|contact|quote|change|complaint|feedback|supplier|debit|sop|equipment|delivery|power|person|skill|newcomer|chrono|nc|analysis|poka|kpi|process)\|/;
export function changedRecords(a: FlatMap, b: FlatMap): { key: string; what: 'création' | 'modification' | 'suppression' }[] {
  return diffKeys(a, b).filter(k => LOGGED.test(k)).map(k => ({ key: k, what: a[k] === undefined ? 'création' as const : b[k] === undefined ? 'suppression' as const : 'modification' as const }));
}
