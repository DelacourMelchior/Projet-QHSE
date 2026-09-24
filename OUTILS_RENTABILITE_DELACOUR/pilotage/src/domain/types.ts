// Data model of the monthly KPI dashboard.
// Every value is keyed by its period ("2026-12"), never by a column position.

export type Period = string; // "YYYY-MM"

export type Direction = 'higher' | 'lower';
export type Aggregation = 'sum' | 'avg' | 'last';
export type KpiType = 'Moteur' | 'Garde-fou' | 'Vital' | 'Performance';

// Role of a KPI in the executive summary and analysis messages (explicit, not guessed from its name)
export type KpiRole = 'ca' | 'marge' | 'treso' | 'cnq' | 'devis_attente' | 'otif' | 'retouches' | 'reclamations';

export interface Kpi {
  id: string;
  role?: KpiRole;
  name: string;
  processId: string;
  type: KpiType;
  unit: string;            // "€", "%", "h", "j", "devis"…
  direction: Direction;
  aggregation: Aggregation; // how the year is summarised: cumul, moyenne, dernier solde
  target: string;          // as displayed, e.g. "≥ 35 %"
  targetValue: number | null;
  confidential: boolean;   // amounts reserved to management (CA, marge, trésorerie)
  source: string;
}

export interface Process {
  id: string;
  name: string;
  color: string;
  order: number;
  kpiIds: string[];
}

export type Dim5M = 'main_oeuvre' | 'methode' | 'materiel' | 'matiere' | 'milieu';

export interface PlanItem {
  dim: Dim5M;
  text: string;
  pilot: string; // empty = main pilot
}

export type ActionStatus = 'to_start' | 'in_progress' | 'done' | 'effective';

export interface Action {
  id: string;
  kpiId: string;
  period: Period;         // month of the deviation
  createdAt: string;      // ISO date
  constat: string;
  whys: string[];         // up to 5, the last filled one is the root cause
  plan: PlanItem[];
  pilot: string;          // main pilot, mandatory
  deadline: string;       // ISO date
  cost: number | null;
  status: ActionStatus;
  closedAt: string;       // ISO date, when done/effective
}

export interface Settings {
  companyName: string;
  profile: string;
  annualBudget: number;   // yearly revenue objective (€ HT)
  netMarginPct: number;   // to compute the revenue needed to offset a loss
  avgQuoteValue: number;  // to value pending quotes
}

export interface Timeline {
  start: Period;
  end: Period;
}

export interface State {
  settings: Settings;
  timeline: Timeline;
  processes: Process[];
  kpis: Record<string, Kpi>;
  values: Record<string, Record<Period, number>>; // kpiId -> period -> value
  actions: Record<string, Action>;
}

export type Level = 'ok' | 'warn' | 'alert' | 'pending';

export interface Status {
  level: Level;
  text: string;
  gapPct: number | null;
}
