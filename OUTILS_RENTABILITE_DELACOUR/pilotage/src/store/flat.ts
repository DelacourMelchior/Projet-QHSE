// State <-> flat map of independent keys, the unit of synchronisation between people.
//   settings | timeline | process|<id> | kpi|<id> | value|<kpiId>|<YYYY-MM> | action|<id>
import type { State } from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/migrate';

export type FlatMap = Record<string, unknown>;

export function flatten(s: State): FlatMap {
  const m: FlatMap = { settings: s.settings, timeline: s.timeline };
  s.processes.forEach(p => { m[`process|${p.id}`] = p; });
  Object.values(s.kpis).forEach(k => { m[`kpi|${k.id}`] = k; });
  Object.entries(s.values).forEach(([id, byP]) => Object.entries(byP).forEach(([p, v]) => { m[`value|${id}|${p}`] = v; }));
  Object.values(s.actions).forEach(a => { m[`action|${a.id}`] = a; });
  return m;
}

export function unflatten(m: FlatMap): State {
  const s: State = {
    settings: { ...DEFAULT_SETTINGS, ...(m.settings as object || {}) },
    timeline: (m.timeline as State['timeline']) || { start: '2026-01', end: '2026-12' },
    processes: [], kpis: {}, values: {}, actions: {},
  };
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    const [kind, id, period] = k.split('|');
    if (kind === 'process') s.processes.push(v as State['processes'][number]);
    else if (kind === 'kpi') s.kpis[id] = v as State['kpis'][string];
    else if (kind === 'value' && typeof v === 'number') (s.values[id] ||= {})[period] = v;
    else if (kind === 'action') s.actions[id] = v as State['actions'][string];
  }
  s.processes.sort((a, b) => a.order - b.order);
  s.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => s.kpis[id]); });
  return s;
}

// Confidential values and the financial settings live in the "direction" folder
export function bucketOf(key: string, s: State): 'equipe' | 'direction' {
  if (key === 'settings') return 'direction';
  if (key.startsWith('value|')) return s.kpis[key.split('|')[1]]?.confidential ? 'direction' : 'equipe';
  return 'equipe';
}

// Keys whose content differs (added, changed or removed)
export function diffKeys(a: FlatMap, b: FlatMap): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(k => JSON.stringify(a[k] ?? null) !== JSON.stringify(b[k] ?? null));
}
