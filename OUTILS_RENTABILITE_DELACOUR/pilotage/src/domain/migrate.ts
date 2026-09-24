// Conversion of the previous version (tool 1.1 of tool_page.html) into the new model.
// Used for: JSON backups made with the old app, its localStorage, its shared-folder journals,
// and to build the demo data and job templates from the same source.
import type { Action, ActionStatus, Aggregation, Dim5M, Kpi, KpiRole, KpiType, PlanItem, Process, Settings, State } from './types';
import { isoDate, parseDate, periodOf } from './periods';
import { parseNumber } from './numbers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Legacy = any;

const ROLE_BY_ID: Record<string, KpiRole> = {
  kpi_ca: 'ca', kpi_marge: 'marge', kpi_treso: 'treso', kpi_cnq: 'cnq', kpi_devis_attente: 'devis_attente',
  kpi_otif: 'otif', kpi_retouches: 'retouches', kpi_reclamations: 'reclamations',
};
const STOCK_IDS = ['kpi_treso', 'kpi_devis_attente', 'kpi_creances_echues'];
const CAUSE_TO_DIM: Record<string, Dim5M> = {
  manpower: 'main_oeuvre', method: 'methode', machine: 'materiel', material: 'matiere', environment: 'milieu', commercial: 'milieu', other: 'methode',
};
const LEGACY_DIMS: Dim5M[] = ['main_oeuvre', 'methode', 'materiel', 'matiere', 'milieu'];
const PROCESS_COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2'];

export const DEFAULT_SETTINGS: Settings = {
  companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500,
};

const kpiType = (t: string): KpiType => {
  const x = String(t || '').toLowerCase();
  if (x.startsWith('garde')) return 'Garde-fou';
  if (x.startsWith('vital')) return 'Vital';
  if (x.startsWith('perf')) return 'Performance';
  return 'Moteur';
};

function legacyPeriods(tool: Legacy): string[] {
  if (Array.isArray(tool.columns) && tool.columns.length) return tool.columns.map((c: any) => periodOf(c.year, c.month));
  const y = tool.startYear || 2026, m = tool.startMonth || 0;
  const n = Math.max(12, ...(tool.processes || []).flatMap((p: any) => (p.indicators || []).map((i: any) => (i.months || []).length)));
  return Array.from({ length: n }, (_, i) => periodOf(y, m + i));
}

const iso = (s: string | undefined) => { const d = parseDate(s); return d ? isoDate(d) : ''; };

function legacyAction(a: Legacy, kpiIdByName: Record<string, string>, periods: string[]): Action | null {
  const kpiId = a.kpiId || kpiIdByName[a.kpiName];
  if (!kpiId) return null;
  const plan: PlanItem[] = Array.isArray(a.plan5M) && a.plan5M.length
    ? a.plan5M.map((p: any) => ({ dim: (LEGACY_DIMS.includes(p.dim) ? p.dim : 'methode') as Dim5M, text: String(p.text || ''), pilot: String(p.pilot || '') }))
    : (a.action || a.actionText) ? [{ dim: CAUSE_TO_DIM[a.causeCategory] || 'methode', text: String(a.action || a.actionText), pilot: '' }] : [];
  const status: ActionStatus = ['to_start', 'in_progress', 'done', 'effective'].includes(a.status) ? a.status
    : String(a.status || '').includes('Clôtur') ? 'done' : 'in_progress';
  const created = iso(a.createdAt) || iso(a.date) || isoDate(new Date());
  return {
    id: String(a.id || `act_${Math.random().toString(36).slice(2, 10)}`),
    kpiId,
    period: typeof a.monthIdx === 'number' && periods[a.monthIdx] ? periods[a.monthIdx] : created.slice(0, 7),
    createdAt: created,
    constat: String(a.constat || ''),
    whys: [a.why1, a.why2, a.why3, a.why4, a.why5].map(w => String(w || '')),
    plan,
    pilot: String(a.pilot || '').replace(/^Pilote$/, ''),
    deadline: iso(a.deadline),
    cost: parseNumber(a.cost),
    status,
    closedAt: iso(a.closedAt),
  };
}

// Old tool object ({ processes[].indicators[].months[], columns, actionRegistry, pmeSettings }) -> new state
export function fromLegacyTool(tool: Legacy): State {
  const periods = legacyPeriods(tool);
  const processes: Process[] = [];
  const kpis: Record<string, Kpi> = {};
  const values: State['values'] = {};
  const kpiIdByName: Record<string, string> = {};
  (tool.processes || []).forEach((p: any, order: number) => {
    const pid = String(p.id || `P${order + 1}`);
    const ids: string[] = [];
    (p.indicators || []).forEach((ind: any, i: number) => {
      const id = String(ind.id || `kpi_${pid}_${i}`);
      ids.push(id);
      kpiIdByName[ind.name] = id;
      const aggregation: Aggregation = ind.calcType === 'last' || STOCK_IDS.includes(id) ? 'last' : ind.calcType === 'sum' ? 'sum' : 'avg';
      kpis[id] = {
        id, role: ROLE_BY_ID[id], name: String(ind.name || 'Indicateur'), processId: pid, type: kpiType(ind.type),
        unit: String(ind.unit || ''), direction: ind.goalDirection === 'lower' ? 'lower' : 'higher', aggregation,
        target: String(ind.target || ''), targetValue: ind.targetVal ?? parseNumber(ind.target),
        confidential: !!ind.isConfidential, source: String(ind.source || ''),
      };
      (ind.months || []).forEach((raw: any, m: number) => {
        const v = parseNumber(raw);
        if (v !== null && periods[m]) (values[id] ||= {})[periods[m]] = v;
      });
    });
    processes.push({ id: pid, name: String(p.name || pid).replace(/^P(\d)\s*[:.]\s*/, 'P$1 · '), color: PROCESS_COLORS[order % PROCESS_COLORS.length], order, kpiIds: ids });
  });
  const actions: State['actions'] = {};
  (tool.actionRegistry || []).forEach((a: any) => { const x = legacyAction(a, kpiIdByName, periods); if (x) actions[x.id] = x; });
  const ps = tool.pmeSettings || {};
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      companyName: String(ps.companyName && ps.companyName !== 'Entreprise Démo & Co.' ? ps.companyName : ''),
      annualBudget: parseNumber(ps.annualBudget) ?? DEFAULT_SETTINGS.annualBudget,
      netMarginPct: parseNumber(ps.margeNettePct) ?? DEFAULT_SETTINGS.netMarginPct,
      avgQuoteValue: parseNumber(ps.valeurMoyenneDevis) ?? DEFAULT_SETTINGS.avgQuoteValue,
    },
    timeline: { start: periods[0], end: periods[periods.length - 1] },
    processes, kpis, values, actions,
  };
}

// Old shared-folder journals flatten keys ("value|kpi|2026-01", "kpi|id", "process|P1", "action|id"…) -> old tool object
export function legacyToolFromFlatMap(map: Record<string, any>): Legacy {
  const periods: string[] = map['timeline'] || [];
  const processes = Object.keys(map).filter(k => k.startsWith('process|') && map[k])
    .map(k => ({ id: k.slice(8), ...map[k] })).sort((a, b) => a.order - b.order)
    .map(p => ({ id: p.id, name: p.name, indicators: (p.kpis || []).filter((id: string) => map[`kpi|${id}`])
      .map((id: string) => ({ ...map[`kpi|${id}`], months: periods.map(per => map[`value|${id}|${per}`] || '') })) }));
  const columns = periods.map(per => { const [y, m] = per.split('-').map(Number); return { year: y, month: m - 1 }; });
  const actionRegistry = Object.keys(map).filter(k => k.startsWith('action|') && map[k]).map(k => map[k]);
  return { processes, columns, actionRegistry, pmeSettings: map['settings'] };
}
