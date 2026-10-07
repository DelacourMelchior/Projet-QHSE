// Conversion of the previous version (tool 1.1 of tool_page.html) into the new model.
// Used for: JSON backups made with the old app, its localStorage, its shared-folder journals,
// and to build the demo data and job templates from the same source.
import type { Contact, Cover, Delivery, Equipment, Risk, Action, ActionStatus, Aggregation, Dim5M, Kpi, KpiRole, KpiType, PlanItem, Power, Process, Settings, Spare, State, Vault } from './types';
import { isoDate, parseDate, periodOf } from './periods';
import { DEFAULT_SCALE, newRisk } from './risk';
import { parseDuration } from './duration';
import { exampleEmail, EMAILS } from './riskTemplates';
import { completeCommercialExamples } from './commercialExamples';
import { completeSupplierExamples } from './supplierExamples';
import { completeSopExamples } from './instructionsExamples';
import { migrateParts } from './maintenanceSpares';
import { completeMaintenanceExamples } from './maintenanceExamples';
import { upgradeDelivery } from './receptions';
import { completeReceptionExamples } from './receptionsExamples';
import { completePowerExamples } from './powersExamples';
import { linkSuppliers } from './suppliers';
import { emptyTools, newId } from './base';

// Short stable hash (FNV-1a): the same old contact line gives the same id on every computer
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
import { parseNumber } from './numbers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Legacy = any;

const ROLE_BY_ID: Record<string, KpiRole> = {
  kpi_ca: 'ca', kpi_marge: 'marge', kpi_treso: 'treso', kpi_cnq: 'cnq', kpi_devis_attente: 'devis_attente',
  kpi_otif: 'otif', kpi_retouches: 'retouches', kpi_reclamations: 'reclamations', kpi_satisfaction: 'satisfaction',
};
const STOCK_IDS = ['kpi_treso', 'kpi_devis_attente', 'kpi_creances_echues'];
const CAUSE_TO_DIM: Record<string, Dim5M> = {
  manpower: 'main_oeuvre', method: 'methode', machine: 'materiel', material: 'matiere', environment: 'milieu', commercial: 'milieu', other: 'methode',
};
const LEGACY_DIMS: Dim5M[] = ['main_oeuvre', 'methode', 'materiel', 'matiere', 'milieu'];
const PROCESS_COLORS = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2'];

export const DEFAULT_SETTINGS: Settings = {
  companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5,
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
    },
    timeline: { start: periods[0], end: periods[periods.length - 1] },
    processes, kpis, values, actions, risks: {}, contacts: {}, scale: DEFAULT_SCALE, ...emptyTools(),
  };
}

// A record read from a file or from the browser may be incomplete or damaged (a person edited it, a sync stopped half-way): it gets what the screens read, and never stops the application.
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const records = (v: unknown): Record<string, any>[] => (Array.isArray(v) ? v.filter(isObj) : []);
const guard = <T>(f: () => T, raw: unknown): T => { try { return f(); } catch { return raw as T; } };   // a record that does not normalise is kept as it is, apart from the others
// A collection read from outside: what is not a record (null, a text, a list) is left out, a record without id takes its key
const sound = (c: unknown): Record<string, any> => Object.fromEntries(Object.entries(isObj(c) ? c : {}).filter(([, r]) => isObj(r)).map(([k, r]) => [k, { ...r, id: text(r.id) || k }]));
// A state the screens can open: the parts they read without a guard have their shape (an empty object, a null timeline… would give a blank page)
export const isState = (s: unknown): s is State => isObj(s) && isObj(s.settings) && isObj(s.timeline) && typeof s.timeline.start === 'string' && typeof s.timeline.end === 'string' && Array.isArray(s.processes) && isObj(s.kpis);
// The root of a state that is not one (a copy restored from a backup): what is missing gets what a new state has
const soundRoot = (s: unknown): State => {
  const x: Record<string, any> = isObj(s) ? { ...s } : {};
  if (!isObj(x.settings)) x.settings = { ...DEFAULT_SETTINGS };
  if (!isObj(x.timeline) || typeof x.timeline.start !== 'string' || typeof x.timeline.end !== 'string') x.timeline = { start: '2026-01', end: '2026-12' };
  x.processes = records(x.processes).map(p => ({ ...p, kpiIds: Array.isArray(p.kpiIds) ? p.kpiIds : [] }));
  for (const k of ['kpis', 'values', 'actions', 'risks', 'contacts']) if (!isObj(x[k])) x[k] = {};
  return x as State;
};
// A field of the wrong type (a record edited by hand, written by another version) reads as no value, as the screens read it: '' for a text the type requires,
// absent for an optional one, 0 or null for a number (a text is only a string: a list, an object or a number is not one)
const clean = (r: Record<string, any>, req: string, opt = '', num: Record<string, number | null> = {}): Record<string, any> => {
  const o = { ...r };
  req.split(' ').forEach(k => { if (o[k] !== undefined && typeof o[k] !== 'string') o[k] = ''; });
  opt.split(' ').forEach(k => { if (o[k] !== undefined && typeof o[k] !== 'string') delete o[k]; });
  Object.entries(num).forEach(([k, d]) => { if (o[k] !== undefined && !(typeof o[k] === 'number' && Number.isFinite(o[k]))) o[k] = d; });
  return o;
};
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const RHYTHMS = ['day', 'week', 'fortnight', 'month'], KINDS = ['machine', 'vehicle', 'installation', 'it', 'instrument', 'other'], UNITS = ['j', 'sem', 'mois', 'an'];
// [text the type requires, optional text, numbers with their value when wrong] of the lists of an equipment
const LISTS: Record<string, [string, string, Record<string, number | null>?]> = {
  anomalies: ['label date note closedAt', 'pointId photo severity nature by handler dueAt waitingFor repairedAt spareId'],
  breakdowns: ['date cause', 'startedAt endedAt impact repairBy repairWho contactId fix anomalyId note photo', { hours: null, cost: null }],
  tasks: ['lastDone', 'kind first by who contactId', { everyDays: 0 }],
  docs: ['label', 'photo url'],
  contacts: ['role', 'contactId name phone hours'],
};
function soundEquipment(id: string, e0: unknown): Equipment {
  const x = isObj(e0) ? e0 : {}, e: Record<string, any> = clean({ ...x, id: text(x.id) || id }, '', 'photo maker model serial since plate deputy group sopId manual lastRevision contactId stoppedSince retiredAt retiredNote reinstatedAt');
  ['name', 'location', 'operator', 'manager', 'riskId'].forEach(k => { e[k] = text(x[k]); });
  e.parts = records(x.parts);
  // a point without id takes cp<index> when that one is free (two points never share an id), a new one otherwise
  const used = new Set(records(x.checkpoints).map(c => c.id));
  e.checkpoints = records(x.checkpoints).map((c, i) => ({ ...clean(c, 'label criterion', 'photo unit', { min: null, max: null }), id: text(c.id) || (used.has(`cp${i}`) ? newId('pt') : `cp${i}`) }));
  // past inspections remember which point each result belongs to
  e.inspections = records(x.inspections).map(i => {
    const results = Array.isArray(i.results) ? i.results : [];
    return { ...clean(i, 'date by note', 'at id worst'), results, ids: Array.isArray(i.ids) ? i.ids : e.checkpoints.slice(0, results.length).map((c: Record<string, any>) => c.id) };
  });
  for (const [k, [req, opt, num]] of Object.entries(LISTS)) if (x[k] !== undefined) e[k] = records(x[k]).map(r => clean(r, req, opt, num));   // absent stays absent (old data: see openAnomalies)
  if (x.safety !== undefined) e.safety = strings(x.safety);
  if (x.checkLife !== undefined && !isObj(x.checkLife)) delete e.checkLife;
  // a check has a label, an id and a frequency made of a number of days, weeks, months or years (anything else is no frequency); its history and reservations are lists of records (a null line is left out)
  if (e.tasks) e.tasks = e.tasks.map((t: Record<string, any>) => {
    const { every, ...rest } = t, base = { ...rest, label: text(t.label), id: text(t.id) || newId('tk') };
    return isObj(every) && typeof every.value === 'number' && every.value > 0 && Number.isFinite(every.value) ? { ...base, every: { ...every, unit: UNITS.includes(every.unit) ? every.unit : 'j' } } : base;
  });
  if (e.checkLife) e.checkLife = Object.fromEntries(Object.entries(e.checkLife as Record<string, any>).filter(([, c]) => isObj(c))
    .map(([id, c]) => [id, { ...clean(c, '', 'plannedAt plannedWith'), history: records(c.history).map(h => clean(h, 'date by note', 'report')), ...(c.reserves !== undefined ? { reserves: records(c.reserves).map(r => clean(r, 'text due liftedAt')) } : {}) }]));
  if (x.contract !== undefined) { if (isObj(x.contract)) e.contract = clean(x.contract, 'provider until', 'contactId response note'); else delete e.contract; }
  if (x.routine !== undefined) { if (isObj(x.routine) && RHYTHMS.includes(x.routine.every)) { e.routine = { ...x.routine }; if (typeof x.routine.day !== 'number') delete e.routine.day; } else delete e.routine; }
  if (x.kind !== undefined && !KINDS.includes(x.kind)) delete e.kind;
  if (x.bottleneck !== undefined && typeof x.bottleneck !== 'boolean') delete e.bottleneck;
  if (x.pin !== undefined && !(isObj(x.pin) && Number.isFinite(x.pin.x) && Number.isFinite(x.pin.y))) delete e.pin;
  if (x.routineDraft !== undefined && !isObj(x.routineDraft)) delete e.routineDraft;
  if (x.pauses !== undefined) e.pauses = records(x.pauses).filter(p => typeof p.from === 'string' && typeof p.to === 'string');
  return e as Equipment;
}
function soundSpare(id: string, p0: unknown): Spare {
  const x = isObj(p0) ? p0 : {}, n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const s = clean({
    ...x, id: text(x.id) || id, name: text(x.name), ref: text(x.ref), supplier: text(x.supplier),
    equipmentIds: strings(x.equipmentIds), moves: records(x.moves).map(m => clean(m, 'at by why', 'equipmentId anomalyId breakdownId note', { delta: 0 })),
    stock: n(x.stock, 0), min: n(x.min, 1), leadDays: n(x.leadDays, -1) >= 0 ? x.leadDays : null,
  }, '', 'supplierId place photo placePhoto refs2 expiresAt countedAt countedBy');
  if (x.order !== undefined) { if (isObj(x.order)) s.order = clean(x.order, 'at expectedAt', '', { qty: 0 }); else delete s.order; }
  if (x.why !== undefined) s.why = strings(x.why);
  return s as Spare;
}

// An order of 3.4 read field by field before upgradeDelivery gives it its ids (one record that is damaged must not stop the others, nor the tool): the texts are texts, the lists are lists, the records are
// records; what is sound is not touched (a list or a record that is absent stays absent: upgradeDelivery gives it its empty shape).
const presentation = (p: Record<string, any>): Record<string, any> => {
  const o = clean(p, '', 'releasedMoment pvPhoto liftPhoto liftSignedBy');
  if (isObj(p.reception)) {
    const r = clean(p.reception, '', 'time place orgId contactId email signedAt companySignedAt pvNo bl signTz pvPhotoAt', { retentionPct: null, amount: null, qty: null, count: null });
    if (Array.isArray(r.reserves)) r.reserves = records(r.reserves).map(x => clean(x, '', 'photo where severity handler dueAt repairedAt repairPhoto liftedAt liftedBy liftNote liftPhoto ncId'));
    if (r.refusal !== undefined) { if (isObj(r.refusal)) r.refusal = { reason: '', next: '', ...clean(r.refusal, 'reason next', 'other nextOther photo') }; else delete r.refusal; }
    o.reception = r;
  }
  if (Array.isArray(p.milestones)) o.milestones = records(p.milestones).map(m => ({ ...clean(m, '', 'unit naReason at photo gapPhoto refPhoto second sopId instrumentId ncId waivedBy waivedWhy waivedAt', { min: null, max: null }), ...(Array.isArray(m.history) ? { history: records(m.history).map(e => clean(e, 'at by measured', 'note requirement instrumentId', { min: null, max: null })) } : {}) }));
  if (Array.isArray(p.shipChecks)) o.shipChecks = records(p.shipChecks).map(c => clean(c, 'id label by at'));
  return o;
};
function soundDelivery(d0: unknown): Delivery {
  const x = isObj(d0) ? d0 : {}, o = presentation(clean(x, '', 'quoteId template orgId contactId promisedAt lot serial material archivedAt archivedNote exampleHash', { qty: null }));
  if (Array.isArray(x.lots)) o.lots = records(x.lots).map(l => clean(presentation(l), 'closedAt'));
  if (Array.isArray(x.journal)) o.journal = records(x.journal).map(l => clean(l, 'at by text'));
  return o as Delivery;
}

// A power, an envelope and an absence covered read field by field (a list that is not one is empty, a text that is not one is no text)
const two = (v: unknown): [string, string] => { const a = Array.isArray(v) ? v : []; return [text(a[0]), text(a[1])]; };
const WAITS_KEYS = ['day', 'days3', 'week', 'more', 'other'];
function soundPower(id: string, p0: unknown): Power {
  const x = isObj(p0) ? p0 : {}, p = clean({ ...x, id: text(x.id) || id }, '', 'nextPracticeAt impact waitOther howTo sopId skillId riskId limits docRef reviewedAt reviewedBy archivedAt') as Record<string, any>;
  ['power', 'holder', 'access'].forEach(k => { p[k] = text(x[k]); }); p.processId = text(x.processId) || 'P1';
  p.deputies = two(x.deputies); p.practiced = two(x.practiced);
  if (x.extra !== undefined) { const ex = Array.isArray(x.extra) ? x.extra : [], ep = Array.isArray(x.extraPracticed) ? x.extraPracticed : []; p.extra = ex.map(text); p.extraPracticed = ex.map((_, i) => text(ep[i])); } else delete p.extraPracticed;
  if (p.periodDays !== undefined && !(typeof p.periodDays === 'number' && p.periodDays > 0)) delete p.periodDays;
  if (p.wait !== undefined && !WAITS_KEYS.includes(p.wait)) delete p.wait;
  ['delegationSigned', 'bankInformed'].forEach(k => { if (p[k] !== undefined && typeof p[k] !== 'boolean') delete p[k]; });
  if (x.contactIds !== undefined) p.contactIds = strings(x.contactIds);
  if (x.forms !== undefined) { if (isObj(x.forms)) p.forms = Object.fromEntries(Object.entries(x.forms).filter(([, v]) => typeof v === 'string')); else delete p.forms; }
  if (x.dep !== undefined) { if (isObj(x.dep)) p.dep = Object.fromEntries(Object.entries(x.dep).filter(([, v]) => isObj(v)).map(([k, v]) => [k, clean(v as Record<string, any>, '', 'accepted access')])); else delete p.dep; }
  return p as Power;
}
function soundVault(id: string, v0: unknown): Vault {
  const x = isObj(v0) ? v0 : {};
  return { ...clean({ ...x, id: text(x.id) || id }, '', 'keyHolder sealedAt checkedAt checkedBy archivedAt'), name: text(x.name), location: text(x.location), contents: strings(x.contents), visa: two(x.visa) } as Vault;
}
function soundCover(id: string, c0: unknown): Cover {
  const x = isObj(c0) ? c0 : {};
  const c = clean({ ...x, id: text(x.id) || id }, '');
  'who from to missing closedAt closedBy at by'.split(' ').forEach(k => { c[k] = text(x[k]); });
  return { ...c, takes: records(x.takes).map(t => ({ ...t, powerId: text(t.powerId), by: text(t.by) })) } as Cover;
}

// A risk read field by field (the first versions kept texts where lists are now)
function soundRisk(r0: Record<string, any>, contacts: Record<string, Contact>): Risk {
  const r = { ...r0 } as any;
  if (typeof r.maxOutage === 'string') r.maxOutage = parseDuration(r.maxOutage);
  if (typeof r.activation === 'string') r.activation = parseDuration(r.activation);
  if (typeof r.contacts === 'string') { r.contactIds = contactsFromText(r.contacts, contacts); delete r.contacts; }
  if (typeof r.firstHour === 'string') {   // first-hour lines become steps, to complete with when and who
    r.steps ||= r.firstHour.split('\n').map((l: string) => l.trim()).filter(Boolean).map((what: string) => ({ when: '', what, who: '' }));
    delete r.firstHour;
  }
  r.steps ||= []; r.trigger ??= ''; r.holdFor ??= null; r.clientMessage ??= ''; r.recovery ??= '';
  r.maxOutage ??= null; r.activation ??= null; r.contactIds ||= []; r.notifyIds ||= []; r.tests ||= [];
  return r as Risk;
}

// Data saved by an earlier build of this app: add the missing parts, convert the old free-text fields.
// Never fatal: what is not a record is left out, a record that does not convert is kept as it is, a step that fails is skipped
export function normalize(s0: State): State {
  const s = soundRoot(s0);
  const contacts = sound(s.contacts) as Record<string, Contact>;
  const risks = Object.fromEntries(Object.entries(sound(s.risks)).map(([id, r0]) => [id, guard(() => soundRisk(r0, contacts), r0)]));
  // example contacts filled before e-mails existed get their fictitious e-mail; the contacts typed by the company are left as they are
  Object.values(contacts).forEach(c => guard(() => { c.category ||= 'autre'; c.email ??= EMAILS[c.id] || ''; if (!c.email && c.id.startsWith('ct_demo_')) c.email = exampleEmail(c); }, 0));
  const tools = emptyTools();
  // the records of a collection are objects; equipment and parts are read below (an empty slot becomes a blank record), the single records (params, envelope, ged) must be objects
  const withTools = Object.fromEntries(Object.entries(tools).map(([k, v]) => [k, ['equipments', 'spares', 'params', 'envelope', 'ged'].includes(k) ? (isObj((s as any)[k]) ? (s as any)[k] : v) : sound((s as any)[k])])) as typeof tools;
  // equipment and spare parts are read field by field (checkpoints get an id, past inspections remember which point each result belongs to)
  const equipments = Object.fromEntries(Object.entries(withTools.equipments).map(([id, e0]) => [id, guard(() => soundEquipment(id, e0), e0)]));
  const spares = Object.fromEntries(Object.entries(withTools.spares).map(([id, p0]) => [id, guard(() => soundSpare(id, p0), p0)]));
  const completedIn = { complaints: withTools.complaints, params: { ...tools.params, ...withTools.params }, kpis: s.kpis, values: s.values, timeline: s.timeline, processes: s.processes, feedbacks: withTools.feedbacks, quotes: withTools.quotes, orgs: withTools.orgs, contacts };
  const completed = guard(() => completeCommercialExamples(completedIn), completedIn);
  // tool 3.1: the fictitious suppliers and claims once, then every supplier linked to its organisation in the directory
  const supIn = { suppliers: withTools.suppliers, debits: withTools.debits, sectors: withTools.sectors, orgs: completed.orgs ?? withTools.orgs, contacts: completed.contacts ?? contacts, params: completed.params };
  const sup = guard(() => linkSuppliers(completeSupplierExamples(supIn)), supIn);
  // tool 3.2: the fictitious work instructions completed once (pictures, new fields), and the defects linked to their sheet
  const sopIn = { sops: withTools.sops, ncs: withTools.ncs, params: sup.params };
  const sopEx = guard(() => completeSopExamples(sopIn), sopIn);
  // tool 3.3: the parts listed per machine move into the common cabinet, then the fictitious equipment is completed once
  const taken = guard(() => migrateParts({ equipments, spares }), { equipments, spares });
  const maintIn = { equipments: taken.equipments, spares: taken.spares, ncs: sopEx.ncs, params: sopEx.params };
  const maintEx = guard(() => completeMaintenanceExamples(maintIn), maintIn);
  // tool 3.4: every order read field by field (soundDelivery) and in the current shape (ids of the milestones, the single reservation among the reservations), then the fictitious orders completed once (fictitious company only)
  const rcIn = { deliveries: Object.fromEntries(Object.entries(withTools.deliveries).map(([id, d]) => [id, guard(() => upgradeDelivery(soundDelivery(d)), d)])), ncs: maintEx.ncs, orgs: sup.orgs, contacts: sup.contacts, params: maintEx.params, quotes: completed.quotes ?? withTools.quotes, sops: sopEx.sops, equipments: maintEx.equipments, people: withTools.people, settings: s.settings };
  const rc = guard(() => completeReceptionExamples(rcIn), rcIn);
  // tool 4.1: powers, envelopes and absences read field by field; the single envelope of the first version becomes a vault, once (and is emptied, so that deleting the vault does not bring it back); the fictitious powers completed once
  const [pws, covs] = [Object.fromEntries(Object.entries(withTools.powers).map(([id, p]) => [id, guard(() => soundPower(id, p), p)])), Object.fromEntries(Object.entries(withTools.covers).map(([id, c]) => [id, guard(() => soundCover(id, c), c)]))];
  const vts = Object.fromEntries(Object.entries(withTools.vaults).map(([id, v]) => [id, guard(() => soundVault(id, v), v)])), env = withTools.envelope, first = !Object.keys(vts).length && !!(text(env.location) || text(env.checkedAt));
  const vaults = first ? { vt_main: { id: 'vt_main', name: 'Enveloppe des accès', location: text(env.location), contents: [], visa: ['', ''] as [string, string], ...(text(env.checkedAt) ? { checkedAt: text(env.checkedAt), checkedBy: text(env.by) } : {}) } } : vts;
  const pwIn = { powers: pws, practices: withTools.practices, covers: covs, vaults, vlogs: withTools.vlogs, people: withTools.people, params: rc.params };
  const pw = guard(() => completePowerExamples(pwIn), pwIn);
  return { ...s, ...withTools, powers: pw.powers, practices: pw.practices, covers: pw.covers, vaults: pw.vaults, vlogs: pw.vlogs, people: pw.people, envelope: first ? { location: '', checkedAt: '', by: '' } : env, sops: sopEx.sops, ncs: rc.ncs, complaints: completed.complaints, feedbacks: completed.feedbacks ?? withTools.feedbacks, quotes: completed.quotes ?? withTools.quotes, deliveries: rc.deliveries, orgs: rc.orgs, suppliers: sup.suppliers, debits: sup.debits, sectors: sup.sectors, kpis: completed.kpis ?? s.kpis, processes: completed.processes ?? s.processes, values: completed.values, equipments: maintEx.equipments, spares: maintEx.spares, params: pw.params, risks, contacts: rc.contacts, scale: s.scale || DEFAULT_SCALE };
}

// "Nom, rôle : 06 00 00 00 00" lines -> crisis directory entries (same line = same id, whoever converts it)
export function contactsFromText(text: string, into: Record<string, Contact>): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const m = line.match(/(\+?\d[\d .]{7,}\d)/);
    const phone = m ? m[0].trim() : '';
    const [name, ...rest] = line.replace(phone, '').replace(/[\s:–-]+$/, '').split(',');
    const id = `ct_${fnv(line)}`;
    into[id] ||= { id, category: 'autre', name: name.trim() || line, role: rest.join(',').trim(), company: '', phone, email: '', always: false, verifiedAt: '' };
    return id;
  });
}

// Old tool 1.2 (rows: process, problem, origin, solution(s), responsible) -> risks to complete
export function legacyRisks(tool: Legacy): Risk[] {
  return (tool?.rows || []).filter((r: any) => Array.isArray(r) && String(r[1] || '').trim()).map((row: any, i: number) => {
    const r = newRisk(/^P[1-5]$/.test(String(row[0]).trim()) ? String(row[0]).trim() : 'P1');
    const clean = (x: unknown) => String(x ?? '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]\uFE0F?/gu, '').trim();
    return {
      ...r, id: `${r.id}${i}`, title: clean(row[1]), cause: clean(row[2]), planB: clean(row[3]),
      owner: clean(row[4]).replace(/\s*\(.*\)\s*$/, ''),
    };
  });
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
