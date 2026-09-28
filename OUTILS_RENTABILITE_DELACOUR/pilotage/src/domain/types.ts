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

// Record of another tool an action comes from (tools 2.1 to 5.4)
export type RefKind = 'analysis' | 'equipment' | 'supplier' | 'feedback' | 'skill' | 'power' | 'complaint';
export interface Ref { kind: RefKind; id: string }

export interface Action {
  id: string;
  kpiId: string;          // origin: a KPI in deviation (tool 1.1)…
  riskId?: string;        // …or a risk whose Plan B must be prepared (tool 1.2); then kpiId is ''
  ref?: Ref;              // …or a record of tools 2.1 to 5.4; then kpiId is ''
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
  // tools 2.1 to 5.4
  params: Params;
  quotes: Record<string, Quote>;          // 2.1
  changes: Record<string, Change>;        // 2.2
  complaints: Record<string, Complaint>;  // 2.3
  feedbacks: Record<string, Feedback>;    // 2.4
  suppliers: Record<string, Supplier>;    // 3.1
  debits: Record<string, Debit>;          // 3.1
  sops: Record<string, Sop>;              // 3.2
  equipments: Record<string, Equipment>;  // 3.3
  deliveries: Record<string, Delivery>;   // 3.4
  powers: Record<string, Power>;          // 4.1
  envelope: Envelope;                     // 4.1
  people: Record<string, Person>;         // 4.2 (team), used by 4.1 and 4.3
  skills: Record<string, Skill>;          // 4.2
  newcomers: Record<string, Newcomer>;    // 4.3
  ged: Ged;                               // 4.4
  chronos: Record<string, ChronoTest>;    // 4.4
  ncs: Record<string, Nc>;                // 5.1, costed by 5.2
  analyses: Record<string, Analysis>;     // 5.3
  pokas: Record<string, Poka>;            // 5.4
  logs: Record<string, LogEntry>;         // who created, changed or deleted what
  orgs: Record<string, Org>;              // outside organisations of the directory (1.3)
}

// Operating assumptions of tools 2.1 to 5.4, visible to the whole team (not money of the company)
export interface Params {
  hourlyRate: number;      // loaded hourly cost used to value lost and rework hours (€/h)
  marginFloorPct: number;  // minimum gross margin of a quote (%)
  depositPct: number;      // deposit asked on an order (%)
  visaThreshold: number;   // quote amount above which the 3 visas are required (€ HT)
  rates?: { name: string; rate: number }[];     // hourly cost per workstation or machine (else hourlyRate)
  overheadPct?: number;    // overheads added to the direct cost of a quote (%)
  teamCanDelete?: boolean; // in team view, delete buttons shown
  restricted?: string[];   // tools reserved to management (hidden in team view)
  businessHours?: boolean; // 48 h and 24 h counted on working days (Monday to Friday)
  reviewLink?: string;     // online review page of the company (2.4)
  questions?: string[];    // wording of the 3 end-of-job questions (2.4)
  company?: { address: string; siret: string; phone: string; email: string };   // printed on the documents
  monthDeliveries?: Record<string, number>;     // deliveries per month, for the complaint rate (2.3)
  cnqIndirect?: Record<string, number>;         // indirect non-quality costs per month (5.2)
  welcome?: { key: string; stage: string; label: string; legal?: boolean }[];  // welcome checklist (4.3)
  milestoneTemplates?: { name: string; milestones: { label: string; point: string; requirement: string }[] }[];   // 3.4
  cnqTrigger?: number;     // cost from which a five whys workshop is expected (5.3)
  variableMarginPct?: number;   // margin on variable costs (%), second reading of the revenue to make up (5.2)
  siteAccess?: string;     // how the emergency services find and enter the site (1.3)
  directorId?: string;     // top of the internal org chart when no role says it (1.3)
}

// Signature drawn with the finger: strokes of points in a 300 x 100 box
export type Strokes = [number, number][][];
export interface LogEntry { id: string; at: string; by: string; kind: string; ref: string; what: 'création' | 'modification' | 'suppression' }

// ---- 2.1 feasibility and margin of a quote
export type LockState = '' | 'ok' | 'reserve' | 'ko';
export interface Lock { state: LockState; note: string; by?: string }
export interface Visa { by: string; date: string }
export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost' | 'dropped';
export interface Quote {
  id: string;
  ref: string;             // DEV-2026-012
  client: string;
  object: string;          // what is quoted
  date: string;            // ISO date of the quote
  amount: number | null;   // selling price € HT
  weeks: number | null;    // promised delay (weeks)
  locks: Lock[];           // 5 locks, one per process P1 to P5
  visas: { commercial: Visa; technical: Visa; direction: Visa };
  derogation: string;      // who allowed a margin under the floor, and why
  depositReceived: boolean;
  status: QuoteStatus;
  sentAt: string;
  followedAt: string;      // last follow-up call
  decidedAt: string;
  lostReason: string;
  cost?: QuoteCost;        // direction folder
  contact?: string;        // person and phone on the customer side
  followUps?: { date: string; note: string; by: string }[];
  nextFollowAt?: string;
  lostCategory?: '' | 'prix' | 'delai' | 'technique' | 'relation' | 'concurrent' | 'autre';
  probability?: number | null;   // chance to win (%)
  revisions?: { v: number; date: string; amount: number | null; marginPct: number | null; note: string }[];
  depositAmount?: number | null;
  depositAt?: string;
  startedAt?: string;      // manufacturing launched
}
export interface QuoteCost { material: number | null; hours: number | null; subcontract: number | null; other: number | null; rate?: string }

// ---- 2.2 change order (avenant)
export interface Change {
  id: string;
  ref: string;             // AV-2026-004
  affaire: string;
  client: string;
  askedBy: string;         // person on the customer side
  date: string;            // date of the request
  description: string;
  price: number | null;    // extra cost € HT
  delayDays: number | null;
  sentAt: string;          // date the price was sent for agreement
  via: '' | 'sms' | 'mail' | 'papier';
  answer: '' | 'accepted' | 'refused';
  answeredAt: string;
  startedAt: string;       // date the extra work started
  invoiceRef: string;
  invoicedAt: string;
  quoteId?: string;
  proof?: string;          // photo or screenshot of the written agreement
  offered?: boolean;       // extra offered as a commercial gesture
  newDate?: string;        // new delivery date promised
  hours?: number | null;   // pricing aid
  material?: number | null;
}

// ---- 2.3 customer complaint
export interface Complaint {
  id: string;
  ref: string;             // R-2026-003
  at: string;              // received, "YYYY-MM-DDTHH:MM"
  client: string;
  affaire: string;
  channel: '' | 'tel' | 'mail' | 'site' | 'courrier';
  receivedBy: string;
  description: string;
  severity: 'mineure' | 'majeure';
  processId: string;       // process at the origin ('' = to qualify)
  contactedAt: string;     // customer called back, "YYYY-MM-DDTHH:MM"
  immediate: string;       // immediate action agreed with the customer
  pilot: string;
  cost: number | null;     // credit note, transport, rework (€ HT)
  resolvedAt: string;
  courtesyAt: string;      // courtesy call, closes the complaint
  ncId?: string;
  analysisId?: string;
  category?: '' | 'delai' | 'qualite' | 'facture' | 'comportement' | 'emballage' | 'autre';
  blockedInvoice?: number | null;   // invoice amount the customer holds
}

// ---- 2.4 end-of-job flash review
export interface Feedback {
  id: string;
  date: string;            // delivery or acceptance date
  client: string;
  affaire: string;
  contact: string;
  channel: 'site' | 'sms' | 'tel' | 'mail';
  q1: boolean | null;      // meets the specification
  q2: boolean | null;      // delivery and delays as agreed
  q3: number | null;       // would recommend, 0 to 10
  verbatim: string;
  doubt: string;           // small reservation expressed
  doubtSolvedAt: string;
  invoicedAt: string;      // final invoice sent
  reviewAsked: boolean;
  complaintId?: string;
  paidAt?: string;
  quoteId?: string;
  deliveryId?: string;
  promisedWeeks?: number | null;   // copied from the quote
}

// ---- 3.1 suppliers and debit notes
export type SupplierCategory = 'matiere' | 'soustraitance' | 'logistique' | 'service';
export interface SupplierRating { date: string; quality: number; delay: number; service: number; by: string; note: string }
export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  supplies: string;
  strategic: boolean;      // sole source, hard to replace
  contact: string;
  ratings: SupplierRating[];
  contactId?: string;      // crisis directory (1.3)
  certRequired?: boolean;  // material certificate required at reception
  receipts?: { id: string; date: string; promised: string; received: string; certOk: boolean | null; note: string }[];
}
export interface Debit {
  id: string;
  ref: string;             // DEB-2026-002
  supplierId: string;
  date: string;            // reception date
  bl: string;              // delivery note number
  reserveOnBl: boolean;    // written reservation on the delivery note
  defect: string;
  reworkHours: number | null;
  otherCost: number | null; // scrapped material, transport, sorting (€ HT)
  sentAt: string;          // claim sent to the supplier
  answer: '' | 'accepted' | 'refused';
  recovered: number | null;
  recoveredAt: string;
  ncId?: string;
  orderRef?: string;
  photo?: string;
  followAt?: string;       // reminder sent
}

// ---- 3.2 visual work instruction
export interface SopStep { op: string; how: string; watch: string; check: string; photo: string }
export interface Sop {
  id: string;
  processId: string;
  poste: string;
  operation: string;
  version: number;
  versionDate: string;
  history: { v: number; date: string; reason: string }[];
  author: string;          // written with the best operator
  validatedBy: string;
  steps: SopStep[];
  good: string;            // the right gesture
  trap: string;            // the frequent trap
  goodPhoto: string;
  trapPhoto: string;
  ppe: string[];
  habilitations: { person: string; tutor: string; date: string }[];
  skillId?: string;        // skill of the versatility matrix (4.2): its level 2+ people are allowed
  displayedAt?: string;    // printed sheet posted at the workstation
  acks?: { person: string; v: number; date: string }[];   // read and understood
}

// ---- 3.3 weekly sensory routine and survival cabinet
export interface Checkpoint { label: string; criterion: string; id?: string }
export interface Inspection { date: string; by: string; results: ('ok' | 'ko')[]; note: string; ids?: string[] }
export interface SparePart { name: string; ref: string; supplier: string; leadTime: string; min: number; stock: number; orderedAt?: string; expectedAt?: string }
export interface Equipment {
  id: string;
  name: string;
  location: string;
  operator: string;
  manager: string;
  riskId: string;          // Plan B of tool 1.2, '' if none
  checkpoints: Checkpoint[];
  inspections: Inspection[];
  parts: SparePart[];
  tasks?: { id: string; label: string; everyDays: number; lastDone: string; legal: boolean }[];
  breakdowns?: { id: string; date: string; hours: number | null; cost: number | null; cause: string }[];
  anomalies?: { id: string; label: string; date: string; note: string; closedAt: string }[];
  contactId?: string;      // after-sales service (1.3)
  manual?: string;         // where the manual is
  lastRevision?: string;
}

// ---- 3.4 self-inspection at milestones and acceptance report
export interface Milestone { label: string; point: string; requirement: string; measured: string; ok: boolean | null; by: string; date: string }
export interface Delivery {
  id: string;
  ref: string;             // order number
  client: string;
  item: string;
  qty: number | null;
  milestones: Milestone[];
  releasedBy: string;
  releasedAt: string;
  reception: {
    date: string;
    name: string;
    role: string;
    result: '' | 'sans' | 'reserve' | 'refus';
    reserve: string;
    retentionPct: number | null;
    amount: number | null; // invoice amount € HT
    liftedAt: string;
  };
  quoteId?: string;
  template?: string;
  signCompany?: Strokes;
  signClient?: Strokes;
  pvPhoto?: string;
  liftPhoto?: string;
  liftSignedBy?: string;
}

// ---- 4.1 emergency deputies
export interface Power {
  id: string;
  processId: string;
  power: string;           // the act without which the company stops
  holder: string;
  deputies: [string, string];
  practiced: [string, string]; // date of the last real practice of each deputy
  access: string;          // codes and access, and where they are (direction folder)
  extra?: string[];        // more deputies, external included
  extraPracticed?: string[];
  periodDays?: number;     // practice required every … days (365 by default)
  nextPracticeAt?: string;
  delegationSigned?: boolean;
  bankInformed?: boolean;
}
export interface Envelope { location: string; checkedAt: string; by: string }

// ---- 4.2 versatility matrix
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export interface Person { id: string; name: string; role: string; active: boolean; team?: string; absences?: { from: string; to: string }[] }
export interface Skill {
  id: string;
  name: string;
  processId: string;
  levels: Record<string, SkillLevel>;   // personId -> level
  plan: { tutor: string; learner: string; slot: string; target: string; sessions: number; hoursPerSession?: number; cost?: number | null } | null;   // person ids
  required?: number;       // people autonomous required (2 by default)
  critical?: boolean;
  levelDates?: Record<string, string>;   // personId -> date of the last assessment
}

// ---- 4.3 welcome and autonomy test
export type NewcomerKind = 'cdi' | 'cdd' | 'interim' | 'alternance';
export interface Newcomer {
  id: string;
  name: string;
  poste: string;
  kind: NewcomerKind;
  tutor: string;
  arrival: string;
  done: Record<string, string>;   // checklist item key -> date done
  test: { date: string; answers: (boolean | null)[]; note: string };
  authorizedBy: string;
  authorizedAt: string;
  sopId: string;
  skillId: string;
  testDays?: number;       // length of the path (15 by default)
  testPiece?: string;      // part or task made during the test
  retestAt?: string;
  docs?: Record<string, string>;   // document key -> date given
  feedback?: string;       // what surprised the newcomer (day 30)
}

// ---- 4.4 naming charter and filing plan
export interface GedFolder { code: string; processId: string; subfolders: string[]; rights: string }
export interface Ged {
  owner: string;
  folders: GedFolder[];
  procCodes: { code: string; label: string }[];
  typeCodes: { code: string; label: string }[];
  archive: string;         // name of the archive folder
  migration?: { label: string; done: string }[];
  rightsCheckedAt?: string;
}
export interface ChronoTest { id: string; date: string; person: string; asked: string; seconds: number | null; found: boolean; obsolete: boolean }

// ---- 5.1 quarantine (red bin), costed by 5.2
export type NcDecision = 'rebut' | 'retouche' | 'derogation' | 'retour' | 'tri' | 'declassement' | 'attente';
export type NcCause = 'outillage' | 'reglage' | 'plan' | 'matiere' | 'manipulation' | 'methode' | 'autre';
export interface NcCost { scrap: number | null; lostHours: number | null; reworkHours: number | null; logistics: number | null }
export interface Nc {
  id: string;
  ref: string;             // NC-2026-014
  at: string;              // "YYYY-MM-DDTHH:MM"
  by: string;
  where: string;           // workstation, machine, site
  item: string;            // part, batch, job
  qty: number | null;
  description: string;
  cause: NcCause | '';
  origin: 'interne' | 'fournisseur' | 'client';
  decision: NcDecision | '';
  decidedAt: string;       // "YYYY-MM-DDTHH:MM"
  decidedBy: string;
  decisionNote: string;
  processId: string;       // process at the origin of the defect ('' = to qualify)
  cost: NcCost;
  supplierId?: string;
  complaintId?: string;
  analysisId?: string;
  photo?: string;
  qtyScrapped?: number | null;
}

// ---- 5.3 five whys workshop
export interface Analysis {
  id: string;
  ref: string;             // 5P-2026-003
  date: string;
  problem: string;         // factual gap
  source: { kind: 'nc' | 'complaint' | 'kpi' | 'free'; id: string };
  processId: string;
  participants: string;
  whys: string[];
  rootCause: string;
  backCheck: boolean;      // "since cause 5, therefore cause 4… therefore the problem" holds
  pilot: string;
  branches?: { title: string; whys: string[]; rootCause: string }[];   // other chains of causes
  ishikawa?: Partial<Record<Dim5M, string>>;
}

// ---- 5.4 mistake-proofing and 30-day check
export type PokaLevel = 'supprimer' | 'detromper' | 'detecter' | 'consigne';
export interface PokaCheck { date: string; produced: number | null; defects: number | null; inPlace: boolean; cadenceOk: boolean; note: string; by: string; seen?: boolean | null }
export interface Poka {
  id: string;
  analysisId: string;
  processId: string;
  poste: string;
  defect: string;          // historical defect to eliminate
  level: PokaLevel;
  description: string;
  howItBlocks: string;
  cost: number | null;
  owner: string;
  installedAt: string;
  trained: boolean;        // every operator trained on the device
  bypassTested: boolean;   // someone tried to fool it on purpose
  check: PokaCheck | null;
  operatorOk?: boolean;    // validated by the operators (ergonomics)
  later?: PokaCheck[];     // checks at day 90 and every year
  office?: boolean;        // software or office device: no parts counted
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

export type ContactCategory = 'secours' | 'interne' | 'client' | 'fournisseur' | 'prestataire' | 'finance' | 'conseil' | 'sante' | 'administration' | 'autre';

// Crisis directory (tool 1.3), used by the reflex cards of the Plans B
// One line of the reflex card: when, what, who
export interface ReflexStep { when: string; what: string; who: string }

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
  verifiedBy?: string;
  phone2?: string;        // second number: switchboard, on-call line
  hours?: string;         // when it answers ("lun-ven 8 h-18 h")
  reference?: string;     // what to give when calling: contract, customer number
  secret?: string;        // password or instruction to say (direction folder)
  vital?: boolean;        // pinned at the top and on the pocket card
  reportsTo?: string;     // contact id of the manager, in the same category (org chart of the company or of the organisation)
  backupId?: string;      // contact to call when this one does not answer (call chain)
  personId?: string;      // internal: the same person in the staff list of tools 4.1 to 4.3
  vacant?: boolean;       // post to fill: drawn in the org chart without anybody
  contract?: '' | 'cdd' | 'interim' | 'alternance' | 'stage';
}

// An outside organisation of the directory (customer, supplier, health service…): its people carry its name in "company"
export interface Org {
  id: string;
  name: string;
  category: ContactCategory;
  phone: string;           // switchboard
  email: string;
  address: string;
  reference: string;       // our customer or contract number there
  note?: string;
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
  trigger: string;        // who decides to start the Plan B
  steps: ReflexStep[];    // what is done, in order, by whom
  holdFor: Duration | null;     // how long the Plan B can last
  clientMessage: string;  // message ready to send to the customers
  recovery: string;       // when and how to go back to normal
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
