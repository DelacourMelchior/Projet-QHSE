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
  kpiId: string;          // origin: a KPI in deviation (tool 1.1)…
  riskId?: string;        // …or a risk whose Plan B must be prepared (tool 1.2); then kpiId is ''
  period: Period;         // month of the deviation (month of creation for a risk)
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
  gravityThresholds?: [number, number, number] | null; // risk gravity bounds in € (null = from annualBudget)
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
  risks: Record<string, Risk>;
  contacts: Record<string, Contact>;  // crisis directory, shared by the reflex cards
  scale: RiskScale;                   // wording of the gravity and likelihood levels
}

// ---- business continuity (tool 1.2)
export type Scale = 1 | 2 | 3 | 4;
export type ParadeFamily = 'relais' | 'stock' | 'doublure' | 'degrade';
export type RiskState = 'unrated' | 'accepted' | 'uncovered' | 'preparing' | 'ready' | 'tested' | 'expired' | 'failed';

export type DurationUnit = 'h' | 'j' | 'sem' | 'mois';
export interface Duration { value: number; unit: DurationUnit }

export interface RiskTest {
  date: string;           // ISO date
  ok: boolean;            // success criterion met
  note: string;
  by: string;
  delay?: Duration | null;      // activation delay measured during the test
  contactsChecked?: boolean;    // the numbers of the card were called during the test
}

export type ContactCategory = 'secours' | 'interne' | 'prestataire' | 'fournisseur' | 'client' | 'finance' | 'autre';

// Crisis directory (tool 1.3), used by the reflex cards of the Plans B
export interface Contact {
  id: string;
  category: ContactCategory;
  name: string;
  role: string;           // function
  company: string;
  phone: string;
  email: string;
  always: boolean;        // reachable 24 h a day
  verifiedAt: string;     // ISO date of the last check of the number
}

export interface RiskScale { gravity: string[]; likelihood: string[] }  // 4 texts each



// Money figures, stored in the "direction" folder (never shown in team view)
export interface RiskCost {
  perDay: number | null;      // margin lost + penalties per day of outage (€)
  daysWithout: number | null; // outage duration without Plan B (days)
  daysWith: number | null;    // outage duration with Plan B (days)
  planBCost: number | null;   // one-off cost to set the Plan B up (€)
}

export interface Risk {
  id: string;
  processId: string;
  createdAt: string;
  // 1. what stops
  title: string;          // "Casse broche CNC"
  resource: string;       // vital resource: machine, person, supplier, software
  signal: string;         // how we notice it
  maxOutage: Duration | null;  // tolerable outage
  owner: string;          // responsible for the risk (mandatory)
  // 2. why, how serious (null = not rated yet)
  whys: string[];
  cause: string;          // root cause
  gravity: Scale | null;
  likelihood: Scale | null;
  ratedBy?: string;
  ratedAt?: string;
  // 3. Plan B
  family: ParadeFamily | '';
  planB: string;
  relay: string;          // who or what takes over
  activation: Duration | null;  // time to get the Plan B working
  // 4. lock and test (the reflex card)
  firstHour: string;      // actions of the first hour, one per line
  contactIds: string[];   // who to call (crisis directory)
  notifyIds: string[];    // who to inform: customers, insurer…
  access: string;         // where keys, codes, documents are
  sacrifice: string;      // what is dropped first
  deputy: string;
  testMethod: string;
  testCriterion: string;
  tests: RiskTest[];
  cost?: RiskCost;
}

export type Level = 'ok' | 'warn' | 'alert' | 'pending';

export interface Status {
  level: Level;
  text: string;
  gapPct: number | null;
}
