// State <-> flat map of independent keys, the unit of synchronisation between people.
//   settings | timeline | process|<id> | kpi|<id> | value|<kpiId>|<YYYY-MM> | action|<id>
//   risk|<id> (without money) | riskcost|<id> (money figures of a risk, direction folder) | contact|<id> | scale
//   tools 2.1 to 5.4: one key per record (<kind>|<id>, see COLLECTIONS), quotecost|<id> (direction folder),
//   and the single records params, envelope, ged
import type { Quote, QuoteCost, Risk, RiskCost, State } from '../domain/types';
import { DEFAULT_SCALE } from '../domain/risk';
import { DEFAULT_SETTINGS } from '../domain/migrate';
import { emptyTools } from '../domain/base';

export type FlatMap = Record<string, unknown>;

type CollectionKey = 'contacts' | 'changes' | 'complaints' | 'feedbacks' | 'suppliers' | 'debits' | 'sops' | 'equipments' | 'deliveries'
  | 'powers' | 'people' | 'skills' | 'newcomers' | 'chronos' | 'ncs' | 'analyses' | 'pokas';
// key prefix -> collection of the state (records stored whole, readable by the team)
export const COLLECTIONS: Record<string, CollectionKey> = {
  contact: 'contacts', change: 'changes', complaint: 'complaints', feedback: 'feedbacks', supplier: 'suppliers', debit: 'debits',
  sop: 'sops', equipment: 'equipments', delivery: 'deliveries', power: 'powers', person: 'people', skill: 'skills',
  newcomer: 'newcomers', chrono: 'chronos', nc: 'ncs', analysis: 'analyses', poka: 'pokas',
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
  for (const [kind, key] of Object.entries(COLLECTIONS)) {
    Object.values((s[key] || {}) as Record<string, { id: string }>).forEach(x => { m[`${kind}|${x.id}`] = x; });
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
    else if (COLLECTIONS[kind]) (s[COLLECTIONS[kind]] as Record<string, unknown>)[id] = v;
  }
  Object.entries(riskCosts).forEach(([id, c]) => { if (s.risks[id]) s.risks[id].cost = c; });
  Object.entries(quoteCosts).forEach(([id, c]) => { if (s.quotes[id]) s.quotes[id].cost = c; });
  s.processes.sort((a, b) => a.order - b.order);
  s.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => s.kpis[id]); });
  return s;
}

// Confidential values and the financial settings live in the "direction" folder
export function bucketOf(key: string, s: State): 'equipe' | 'direction' {
  if (key === 'settings' || key.startsWith('riskcost|') || key.startsWith('quotecost|')) return 'direction';
  if (key.startsWith('value|')) return s.kpis[key.split('|')[1]]?.confidential ? 'direction' : 'equipe';
  return 'equipe';
}

// Keys whose content differs (added, changed or removed)
export function diffKeys(a: FlatMap, b: FlatMap): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}
