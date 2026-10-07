// Data model of the monthly KPI dashboard.
// Every value is keyed by its period ("2026-12"), never by a column position.

export type Period = string; // "YYYY-MM"

export type Direction = 'higher' | 'lower';
export type Aggregation = 'sum' | 'avg' | 'last';
export type KpiType = 'Moteur' | 'Garde-fou' | 'Vital' | 'Performance';

// Role of a KPI in the executive summary and analysis messages (explicit, not guessed from its name)
export type KpiRole = 'ca' | 'marge' | 'treso' | 'cnq' | 'devis_attente' | 'otif' | 'retouches' | 'reclamations' | 'satisfaction'
  | 'maint_routine' | 'maint_anomalies' | 'maint_down' | 'maint_checks' | 'maint_spares'   // five proposed by tool 3.3
  | 'recep_clean' | 'recep_lifted' | 'recep_first' | 'recep_released' | 'recep_promised'   // five proposed by tool 3.4
  | 'power_ready' | 'power_practised' | 'power_vault';   // three proposed by tool 4.1

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
  complaints: Record<string, Complaint>;  // 2.3
  feedbacks: Record<string, Feedback>;    // 2.4
  suppliers: Record<string, Supplier>;    // 3.1
  debits: Record<string, Debit>;          // 3.1
  sectors: Record<string, Sector>;        // 3.1, purchasing sectors with their order of recourse
  sops: Record<string, Sop>;              // 3.2
  equipments: Record<string, Equipment>;  // 3.3
  spares: Record<string, Spare>;          // 3.3, the common survival cabinet
  deliveries: Record<string, Delivery>;   // 3.4
  powers: Record<string, Power>;          // 4.1
  practices: Record<string, Practice>;    // 4.1, one line of proof per real practice of a deputy
  covers: Record<string, Cover>;          // 4.1, one line per absence that was covered
  vaults: Record<string, Vault>;          // 4.1, sealed envelopes of the accesses (direction folder)
  vlogs: Record<string, VaultLog>;        // 4.1, checks and openings of the envelopes (direction folder)
  envelope: Envelope;                     // 4.1, the single envelope of the first version: moved into a vault once, then empty
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
  teamCanDelete?: boolean; // in team view, delete buttons shown
  restricted?: string[];   // tools reserved to management (hidden in team view)
  businessHours?: boolean; // 48 h and 24 h counted on working days (Monday to Friday); on unless the company turns it off
  closedDays?: string[];   // public holidays and closing days (ISO dates) that do not count either
  creditLimit?: number;    // amount (€ HT) above which a complaint's credit and costs need the management's approval (2.3); empty = no rule
  approveContest?: boolean;   // the management approves every answer "unjustified" (2.3)
  investigation?: { key: string; label: string; hint: string; process: string; tool?: string }[];   // points checked in a complaint investigation (2.3); absent = the model of the business profile
  rateUnit?: string;       // what the complaint rate is counted on: "livraisons", "interventions"… (2.3)
  retentionYears?: number; // years a closed complaint is kept before it is offered for anonymisation (2.3)
  motifs?: { key: string; label: string; slot?: number; retired?: boolean }[];   // motives of complaint of the company (2.3); absent = the neutral list
  exampleLevel?: number;   // generation of the fictitious data already given to this company (internal)
  supplierExampleLevel?: number;   // same, for the suppliers and claims of tool 3.1 (internal)
  supplier?: SupplierSettings;     // settings of tool 3.1
  sop?: SopSettings;               // settings of tool 3.2
  sopExampleLevel?: number;        // same, for the work instructions of tool 3.2 (internal)
  maint?: MaintSettings;           // settings of tool 3.3
  maintExampleLevel?: number;      // same, for the equipment of tool 3.3 (internal)
  reception?: ReceptionSettings;   // settings of tool 3.4
  receptionExampleLevel?: number;  // same, for the orders of tool 3.4 (internal)
  power?: PowerSettings;           // settings of tool 4.1
  powerExampleLevel?: number;      // same, for the powers of tool 4.1 (internal)
  reviewLink?: string;     // online review page of the company (2.4)
  questions?: string[];    // wording of the 3 end-of-job questions (2.4)
  unhappyMax?: number;     // highest recommendation note that counts as an unhappy customer (2.4); absent = 6
  satisfactionTarget?: number;  // share of satisfied customers (%) the company aims for (2.4, and the target of the indicator of 1.1); absent = 90
  mailSubject?: string;    // subject of the e-mail asking the 3 questions (2.4); absent = the model of the tool
  mailBody?: string;       // text of that e-mail with {contact} {affaire} {entreprise} {questions}; absent = the model of the tool
  company?: { address: string; siret: string; phone: string; email: string };   // printed on the documents
  monthDeliveries?: Record<string, number>;     // deliveries per month, for the complaint rate (2.3)
  cnqIndirect?: Record<string, number>;         // indirect non-quality costs per month (5.2)
  welcome?: { key: string; stage: string; label: string; legal?: boolean }[];  // welcome checklist (4.3)
  milestoneTemplates?: { name: string; milestones: { label: string; point: string; requirement: string }[] }[];   // 3.4
  cnqTrigger?: number;     // cost from which a five whys workshop is expected (5.3)
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
export interface QuoteCost { material: number | null; hours: number | null; subcontract: number | null; other: number | null }

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
  deliveryId?: string;     // the order of 3.4 the complaint is about, chosen by the person (never guessed)
  category?: string;       // key of a motive of the company's list (settings of 2.3); '' = to class; 'autre' = see categoryOther
  blockedInvoice?: number | null;   // invoice amount the customer holds
  unblockedAt?: string;    // day the customer released or paid that invoice
  loggedAt?: string;       // moment it was written in the register (never edited): "within the hour" is checked against `at`
  ackAt?: string;          // acknowledgement of receipt sent to the customer
  message?: string;        // the customer's own words (e-mail pasted)
  photo?: string;
  credit?: number | null;     // credit note granted (€ HT)
  logistics?: number | null;  // express transport, travel (€ HT)
  rework?: number | null;     // redo of the work, material (€ HT)
  hours?: number | null;      // hours spent handling it, valued at the hourly cost (5.2)
  correction?: string;     // measure so that it does not happen again (founded complaint)
  satisfied?: '' | 'oui' | 'non' | 'injoignable';   // answer at the courtesy call; unreachable counts as closed
  courtesyNote?: string;   // what the customer said at the courtesy call
  rounds?: { resolvedAt: string; courtesyAt: string; solution: string; note: string }[];   // earlier solutions the customer refused
  email?: string;          // the customer's address, recipient of the letters
  mailLink?: string;       // link to the received e-mail in the mailbox (channel e-mail)
  contactVia?: '' | 'tel' | 'mail' | 'site' | 'courrier' | 'sms' | 'autre';   // how the customer was contacted again
  contactViaNote?: string; // when "autre"
  categoryOther?: string;  // when the motive is "autre"
  // investigation (step 3): what the check shows, then resolve or contest
  findings?: string;       // what the check of the file shows
  verdict?: '' | 'fondee' | 'partielle' | 'non_fondee';   // '' = still to check
  checks?: Record<string, { state: '' | 'ok' | 'ko' | 'na'; note: string }>;   // points checked during the investigation (see INVESTIGATION)
  solution?: string;       // what is finally offered to the customer (founded complaint)
  forcedClose?: { by: string; at: string; reason: string };   // closed by the management although the file is incomplete
  approval?: { by: string; at: string; note: string };         // management approval (credit above the limit, or answer "unjustified")
  atEdited?: boolean;      // the reception time was changed after the first save
  anonymizedAt?: string;   // personal data erased (date)
  letters?: { ack?: string; close?: string; contest?: string };   // letters to the customer as edited (the model is used while absent)
  ackLink?: string;        // link to the acknowledgement as sent (mailbox)
  resultLink?: string;     // link to the result letter as sent (mailbox)
  resultSentAt?: string;   // customer told the result of the investigation and what follows
  resultVia?: '' | 'tel' | 'mail' | 'site' | 'courrier' | 'sms' | 'autre';
  resultViaNote?: string;
  cause?: string;          // cause found (founded complaint)
  defense?: string;        // arguments and documents to contest (unfounded complaint)
}

// ---- 2.4 end-of-job flash review
export type FollowUp = 'avis' | 'contact' | 'temoignage' | 'autre';
export interface Feedback {
  id: string;
  date: string;            // delivery or acceptance date
  client: string;
  affaire: string;
  contact: string;
  channel: 'site' | 'sms' | 'tel' | 'mail' | 'autre';
  channelNote?: string;    // how the questions were asked when the channel is "other"
  q1: boolean | null;      // meets the specification
  q2: boolean | null;      // delivery and delays as agreed
  q3: number | null;       // would recommend, 0 to 10
  verbatim: string;
  doubt: string;           // reservation noted before the details below existed (read only, shown in the sheet)
  doubtSolvedAt: string;   // day the problem was settled with the customer (a "no" or a low note), instead of a complaint
  q1Detail?: string;       // what was wrong, when the answer to question 1 is "no"
  q2Detail?: string;       // same for question 2
  q3Detail?: string;       // why this note, when it is low
  email?: string;          // where the questions are sent, when asked by e-mail
  reviewAsked: boolean;    // something was asked of a customer who recommends (kept for the data saved before the choice below)
  followUp?: FollowUp;     // what was asked: online review, introduction, testimonial, other
  followNote?: string;     // what, when the follow-up is "other"
  complaintId?: string;
  quoteId?: string;
  deliveryId?: string;
  orgId?: string; contactId?: string;   // customer organisation and person in the directory (1.3), from the reception it was made from
  promisedWeeks?: number | null;   // copied from the quote
}

// ---- 3.1 suppliers and debit notes
export type SupplierCategory = 'matiere' | 'soustraitance' | 'logistique' | 'service';
export type SupplierStatus = 'qualify' | 'listed' | 'watch' | 'suspended' | 'delisted';
export type RatingDecision = '' | 'keep' | 'watch' | 'progress' | 'second' | 'delist' | 'other';
// A criterion left null was not assessed (no facts yet): the score is then taken on the other criteria.
// Each criterion is noted on its own scale (`max`: 10, 20 or 100) and the weight, which is a coefficient, is applied afterwards: the score of a rating
// is the weighted mean of the notes brought back to 100. A rating keeps its criteria as they were the day it was made (name, scale, weight, items), so
// changing the grid later never changes the past. `points` is the note of the criterion. A rating made before the weights existed has no `weight`:
// its weight is its scale. The three fields quality, delay, service and `max` are those of the oldest ratings.
export interface RatingItem { key: string; label: string; points: number | null }
export interface RatingScore { key: string; label: string; points: number | null; max: number; weight?: number; items?: RatingItem[]; comment?: string }
export interface SupplierRating {
  date: string; by: string; note: string;
  scores?: RatingScore[];
  strengths?: string; improvements?: string;   // what the supplier does well, what it must improve
  quality?: number | null; delay?: number | null; service?: number | null;
  max?: [number, number, number];
  decision?: RatingDecision; decisionNote?: string;
  nextReview?: string;
}
// A criterion of the evaluation grid: its name, the scale of its note, its weight (coefficient) and, for the three first ones, the fact it is calculated from.
// Its items are the points to look at, each noted too; the note of the criterion is then their mean.
export interface CriterionItem { key: string; label: string; hint?: string }
export interface Criterion { key: string; label: string; weight: number; scale: number; auto?: 'quality' | 'delay' | 'service'; items?: CriterionItem[]; points?: number }
export interface Supplier {
  id: string;
  name: string;            // copy of the name of its organisation in the directory (1.3), which is the only place to change it
  category: SupplierCategory;
  supplies: string;
  strategic: boolean;      // critical: sole source or hard to replace
  contact: string;         // text of the old version; the people are now those of the organisation in the directory
  ratings: SupplierRating[];
  orgId?: string;          // organisation of the directory (1.3)
  contactId?: string;      // main contact, a person of that organisation
  status?: SupplierStatus; // absent = listed
  sectorIds?: string[];    // purchasing sectors it serves (3.1)
  receipts?: { id: string; date: string; promised: string; received: string; note: string }[];
}
// A purchasing sector (what the company buys: sheet metal, painting, express transport…): the suppliers that serve it, in the order they
// are called (the first is the main one, the next ones the backups), and the times the main one could not answer
export interface SectorSwitch { id: string; at: string; fromId: string; toId: string; reason: string; reasonNote: string; expectedBack: string; backAt: string; by: string }
export interface Sector {
  id: string;
  name: string;
  target?: number;         // number of suppliers wanted when a backup is wanted (2 when absent)
  cover?: 'none' | 'unique'; // no backup wanted: not needed, or a single supplier without any possible replacement (a backup is wanted when absent)
  coverNote?: string;      // for a single supplier: what the company does if it stops
  manual?: boolean;        // the order of recourse was set by the company; else it follows the ratings
  order: string[];         // supplier ids in the order of recourse when manual
  switches?: SectorSwitch[];
}
export type ClaimSeverity = 'minor' | 'major' | 'critical';
// A claim of the company to a supplier (the "fiche de débit" is its costed sheet)
export interface Debit {
  id: string;
  ref: string;             // DEB-2026-002
  supplierId: string;
  supplierName?: string;   // name when saved, so the history stays readable if the supplier is removed
  date: string;            // reception date
  bl: string;              // delivery note number
  reserveOnBl: boolean;    // written reservation on the delivery note
  defect: string;
  reworkHours: number | null;
  otherCost: number | null; // scrapped material, transport, sorting (€ HT); the amount is optional
  sentAt: string;          // claim sent to the supplier
  answer: '' | 'accepted' | 'partial' | 'contested' | 'refused';
  recovered: number | null;
  recoveredAt: string;
  ncId?: string;
  orderRef?: string;
  photo?: string;
  followAt?: string;       // last reminder (kept in step with `chases`)
  motif?: string;          // key of the supplier motives (settings of 3.1), 'autre' = see motifNote
  motifNote?: string;
  severity?: ClaimSeverity;   // absent = major
  lot?: string;            // batch, quantity or item concerned
  contactId?: string;      // person of the supplier the claim is addressed to
  sentVia?: string;        // key of CLAIM_CHANNELS
  sentViaNote?: string;
  chases?: { date: string; via: string; note: string }[];
  answeredAt?: string; answerNote?: string;
  solution?: string; solutionNote?: string;   // key of CLAIM_SOLUTIONS
  cause?: string;          // cause given by the supplier
  supplierAction?: string; // corrective action promised
  actionCheckedAt?: string; actionOk?: boolean | null;   // checked on a later delivery
  closedAt?: string; closedReason?: string; closedNote?: string;
  notes?: { date: string; text: string; by: string }[];
}
// Settings of tool 3.1, filled once by the company (the defaults of suppliers.ts apply to what is left empty)
export interface SupplierSettings {
  motifs?: { key: string; label: string; slot?: number; retired?: boolean }[];   // motives of claim; absent = the neutral list
  sendDays?: number;       // working days to send a claim after the reception (2)
  followDays?: number;     // days without answer before a reminder, also counted as slow service in the rating (15)
  criteria?: Criterion[];  // the evaluation grid; absent = quality, delays, service and price
  max?: [number, number, number];   // old settings of the three fixed criteria, read once to build the grid
  classA?: number; classB?: number;   // lowest score of class A and of class B (85, 70)
  penaltyPct?: [number, number, number];   // share of the quality points lost per minor, major, critical claim (5, 12, 30)
  qualityFloor?: number;   // when set: a supplier whose quality is under this share of its points (%) cannot be in class A
  reviewMonths?: number; criticalMonths?: number;   // months between two ratings: standard supplier, critical supplier (12, 6)
  repeat?: number;         // claims of the same motive in 12 months that call for a cause analysis (3)
  mailSubject?: string; mailBody?: string;   // e-mail of a claim, with {contact} {ref} {date} {bl} {commande} {defaut} {montant} {entreprise}
}

// ---- 3.2 visual work instruction
export interface SopValue { label: string; value: string }   // a figure to respect: "Couple" "2,5 Nm ± 0,2"
export interface SopStep {
  op: string; how: string; watch: string; check: string; photo: string;
  photos?: string[];                 // more pictures of the step, after `photo`
  critical?: 'safety' | 'quality';   // a point the operator must never skip
  values?: SopValue[];
  video?: string;                    // link to a short video
}
export type SopPhase = 'draft' | 'review' | 'active' | 'archived';
export type SopStage = 'seen' | 'with' | 'alone' | 'trainer';   // path of a person on the workstation: watched, done with the tutor, alone, can teach
export interface SopHabilitation { person: string; tutor: string; date: string; stage?: SopStage; until?: string }   // no stage = alone (older data)
export interface SopSuggestion { id: string; by: string; date: string; text: string; photo?: string; status: 'new' | 'kept' | 'declined'; answer: string; answeredAt: string }
// Content of a version, kept when the next one replaces it: texts and a fingerprint per picture (the pictures themselves are not copied)
export interface SopSnap {
  poste: string; operation: string; good: string; trap: string; goodFp: string; trapFp: string; ppe: string[];
  steps: { op: string; how: string; watch: string; check: string; critical?: string; values: string; fps: string[] }[];
}
export interface Sop {
  id: string;
  processId: string;
  poste: string;
  operation: string;
  version: number;
  versionDate: string;
  history: { v: number; date: string; reason: string; kind?: string; by?: string; snap?: SopSnap }[];   // snap: content of that version, when a later one replaced it
  author: string;          // written with the best operator
  validatedBy: string;
  steps: SopStep[];
  good: string;            // the right gesture
  trap: string;            // the frequent trap
  goodPhoto: string;
  trapPhoto: string;
  ppe: string[];
  habilitations: SopHabilitation[];
  skillId?: string;        // skill of the versatility matrix (4.2): its people at the chosen level or more are allowed
  displayedAt?: string;    // printed sheet posted at the workstation
  displayedBy?: string;
  oldRemoved?: boolean;    // the previous sheet was taken down when this one was posted
  acks?: { person: string; v: number; date: string; sig?: Strokes }[];   // read and understood, signed with the finger if the person wished
  phase?: SopPhase;        // absent = in force when validated, to validate otherwise
  validatedAt?: string;
  archivedAt?: string;
  group?: string;          // workshop, line, team or site
  owner?: string;          // keeps the sheet up to date
  ppeNone?: boolean;       // no protective equipment is required
  materials?: { label: string; photo: string }[];   // tools and consumables to have before starting
  ifWrong?: { stop: string; who: string; where: string };   // what to do when it does not go well
  limits?: { good: string; limit: string; reject: string; goodPhoto: string; limitPhoto: string; rejectPhoto: string };   // accepted, borderline and rejected part
  riskIds?: string[];      // risks of tool 1.2 that apply at the workstation
  emergency?: string;      // emergency stop, first aid, fire
  variants?: { name: string; diff: string; photo: string }[];   // what changes for a reference, a customer or a machine
  links?: { label: string; url: string }[];   // plan, manual, safety data sheet
  reviewedAt?: string;     // last periodic review ("read again, nothing changes")
  briefed?: { v: number; date: string; by: string };   // the team was told about this version
  suggestions?: SopSuggestion[];   // remarks of the people who work there
  journal?: { at: string; by: string; what: string }[];
  pin?: { x: number; y: number };   // place on the workshop plan, as a share of its width and height
}
// Settings of tool 3.2, empty = default of the tool
export interface SopSettings {
  updateHours?: number;    // delay to update a sheet after a defect at the workstation (48)
  reviewMonths?: number;   // months between two periodic reviews (12)
  minPeople?: number;      // people allowed per workstation (2)
  habLevel?: number;       // level of the versatility matrix (4.2) from which a person is allowed (2)
  photoPx?: number;        // longest side of a picture in pixels (2 560)
  ppe?: string[];          // protective equipment added to the usual list
  reasons?: string[];      // reasons for a new version; absent = the neutral list
  plan?: string;           // picture of the workshop plan
}

// ---- 3.3 Maintenance: the routine of each piece of equipment, its anomalies, its breakdowns, its periodic checks; the survival cabinet is one common list of spare parts (Spare)
// What a person types (identity, points, checks) and what lives apart (readings, anomalies, breakdowns, checks done, stop and retirement: see LIFE in maintenance.ts)
// are saved separately, so that a stale screen never erases a reading made meanwhile.
export type EquipmentKind = 'machine' | 'vehicle' | 'installation' | 'it' | 'instrument' | 'other';
export type PointResult = 'ok' | 'watch' | 'ko';
export type Every = { value: number; unit: 'j' | 'sem' | 'mois' | 'an' };
export type Rhythm = 'day' | 'week' | 'fortnight' | 'month';
export interface Checkpoint { label: string; criterion: string; id?: string; photo?: string; min?: number | null; max?: number | null; unit?: string }   // photo: what a point in order looks like; min, max: bounds of a measured value
export interface Inspection { date: string; by: string; results: PointResult[]; note: string; ids?: string[]; values?: (number | null)[]; at?: string; id?: string; worst?: PointResult }   // id: identifies a routine when two people's records are merged; worst: kept alone once the routine is old and summarised (results is then empty)
export interface SparePart { name: string; ref: string; supplier: string; leadTime: string; min: number; stock: number; orderedAt?: string; expectedAt?: string }   // before 3.3 v2: parts were listed per machine, now Spare
export type AnomalySeverity = 'degraded' | 'stopped' | 'danger';
export interface Anomaly {
  id: string; label: string; date: string; note: string; closedAt: string;   // open while closedAt is empty; closed by the next routine that finds the point in order, or by "vérifiée"
  pointId?: string;        // checkpoint it comes from (renaming the point never opens a second one)
  photo?: string; severity?: AnomalySeverity; nature?: string; by?: string;
  handler?: string; dueAt?: string;        // taken in charge by, for
  waitingFor?: string;     // "pièce", "prestataire"… while it waits
  repairedAt?: string;     // repaired, still to be checked
  spareId?: string;        // the part it waits for
}
export type Impact = 'stopped' | 'slowed' | 'none';
export interface Breakdown {
  id: string; date: string; hours: number | null; cost: number | null; cause: string;   // cost (€) is typed by the company and kept, by decision of the owner
  startedAt?: string; endedAt?: string;   // "YYYY-MM-DDTHH:MM": hours are computed from them
  impact?: Impact; deliveryIds?: string[]; planB?: boolean;   // production stopped, slowed or not; orders touched (3.4); Plan B started
  repairBy?: 'internal' | 'maker' | 'provider' | 'other'; repairWho?: string; contactId?: string; fix?: 'temporary' | 'definitive';
  anomalyId?: string; note?: string; photo?: string;
}
export interface Reserve { id: string; text: string; due: string; liftedAt: string }
export interface CheckDone { id?: string; date: string; by: string; result: 'ok' | 'remarks' | 'ko'; report?: string; note: string }   // report: photo reference or link
export interface CheckLife { plannedAt?: string; plannedWith?: string; history: CheckDone[]; reserves?: Reserve[] }
export interface EqCheck {
  id: string; label: string; everyDays: number; lastDone: string; legal: boolean;   // everyDays and lastDone: the first versions of the tool
  every?: Every;           // wins over everyDays
  kind?: 'periodic' | 'instrument' | 'preventive';   // instrument: calibration of a measuring instrument
  first?: string;          // first due date while it was never done
  by?: 'internal' | 'agreed' | 'provider' | 'other'; who?: string; contactId?: string;
}
export interface EqDoc { label: string; photo?: string; url?: string }
export interface EqHelper { id: string; role: string; contactId?: string; name?: string; phone?: string; hours?: string }
export interface Contract { provider: string; contactId?: string; until: string; response?: string; note?: string }
export interface Equipment {
  id: string;
  name: string;
  location: string;
  operator: string;
  manager: string;
  riskId: string;          // Plan B of tool 1.2, '' if none
  checkpoints: Checkpoint[];
  inspections: Inspection[];
  parts: SparePart[];      // old data only: moved into the common cabinet (spares) when the data is read
  tasks?: EqCheck[];       // periodic and regulatory checks
  breakdowns?: Breakdown[];
  anomalies?: Anomaly[];
  contactId?: string;      // after-sales service (1.3), first versions; see contacts
  manual?: string;         // where the manual is
  lastRevision?: string;
  // identity
  kind?: EquipmentKind; photo?: string; maker?: string; model?: string; serial?: string; since?: string; plate?: string;
  docs?: EqDoc[]; contacts?: EqHelper[]; deputy?: string; group?: string;
  bottleneck?: boolean;    // its stop blocks the activity; absent = yes
  sopId?: string;          // work instruction of the workstation (3.2)
  routine?: { every: Rhythm; day?: number };   // absent = every week, on the day of the settings
  pin?: { x: number; y: number };   // place on the plan of the workshop (3.2)
  safety?: string[];       // what to know before working on it
  contract?: Contract;
  // life
  checkLife?: Record<string, CheckLife>;   // by check id
  stoppedSince?: string;   // "YYYY-MM-DDTHH:MM" while stopped
  retiredAt?: string; retiredNote?: string;
  touched?: string[];      // typed fields this device changed since it loaded the folder: merging two people's records takes each field from the latest record that touched it
  touchedAt?: Record<string, string>;   // for each typed field, when this device last changed it (ISO stamp): the latest stamp wins when two records are merged
  pauses?: { from: string; to: string }[];   // periods spent out of service, closed by a return to service (a retired equipment has no routine due, nor do the months it was away)
  reinstatedAt?: string;   // "YYYY-MM-DDTHH:MM" of a return to service: a retirement older than it does not count when records are merged
  gone?: string[];         // ids of routines, anomalies, breakdowns and check lines removed on purpose, so that merging two people's records does not bring them back (last 300)
  routineDraft?: { date: string; by: string; results: Record<string, PointResult>; values: Record<string, number | null>; note: string; extra?: Record<string, { photo?: string; nature?: string; note?: string }> };   // a routine under way, kept if the phone locks; extra: photo, nature and word of each anomaly
}
// The common survival cabinet: critical wear parts under lock, one stock for the whole company, each part says which equipment it serves
export interface SpareMove { id: string; at: string; by: string; delta: number; why: 'use' | 'return' | 'received' | 'count' | 'start'; equipmentId?: string; anomalyId?: string; breakdownId?: string; note?: string }
export interface Spare {
  id: string; name: string; ref: string; equipmentIds: string[];
  supplier: string; supplierId?: string;   // supplier of tool 3.1 when picked, else free text
  leadDays: number | null; min: number; stock: number;
  critical?: boolean;      // absent = yes; false = consumable
  why?: ('stops' | 'hard' | 'single')[];   // stops the equipment, hard to find, single source
  place?: string; photo?: string; placePhoto?: string; refs2?: string; expiresAt?: string;
  order?: { qty: number; at: string; expectedAt: string };
  countedAt?: string; countedBy?: string; moves?: SpareMove[];
  retired?: boolean;
  touched?: string[];      // typed fields this device changed since it loaded the folder (see Equipment)
  touchedAt?: Record<string, string>;   // see Equipment
  gone?: string[];         // ids of movements removed on purpose (undo), kept so that merging two people's records does not bring them back
}
// Settings of tool 3.3, empty = default of the tool
export interface MaintSettings {
  routineDay?: number;     // weekday of the weekly routine, 1 = Monday (default)
  soonDays?: number;       // days before a check falls due when it shows (30)
  countDays?: number;      // days between two counts of the cabinet (30)
  causes?: string[];       // causes of a breakdown; absent = the neutral list
  natures?: string[];      // what an anomaly is about; absent = the neutral list
  catalogue?: { label: string; every: Every; legal?: boolean; kind?: EqCheck['kind'] }[];   // checks offered at the start; absent = the neutral list
  keyHolder?: string; keyDeputy?: string; keyPlace?: string;   // who holds the key of the cabinet
}

// What is left to do on the equipment, the cabinet and the checks (the queue of tool 3.3 and the tasks of everyone)
export type MaintTodoKind = 'routine' | 'anomaly' | 'danger' | 'stopped' | 'order' | 'order-late' | 'out' | 'count' | 'expiry' | 'key' | 'check' | 'remark' | 'contract' | 'plan-b';
export interface MaintTodo { id: string; kind: MaintTodoKind; text: string; tone: 'bad' | 'warn'; who: string; due: string; eqId?: string; spareId?: string; ref?: string; fact?: string }   // text: the task (infinitive, for the queue); fact: the same thing as a statement (for cards and summaries, never an order)

// ---- 3.4 self-inspection at milestones, release, acceptance report (PV) of each delivery
// Everything added after the first version is optional (old saved data has none); upgradeDelivery (receptions.ts) fills ids and moves the old single reservation into `reserves`.
export interface MilestoneEvent { at: string; by: string; kind: 'check' | 'rework' | 'derogation' | 'reopen'; ok: boolean | null; measured: string; note?: string; requirement?: string; min?: number | null; max?: number | null; instrumentId?: string }   // requirement, bounds and instrument as they were at the moment of the check
export interface Milestone {
  label: string; point: string; requirement: string; measured: string; ok: boolean | null; by: string; date: string;   // `ok`, `by`, `date`, `measured`: the current result
  id?: string;
  unit?: string; min?: number | null; max?: number | null;   // bounds of a measurable milestone: a value out of them is not conform
  na?: boolean; naReason?: string;      // does not apply to this order
  at?: string;                          // moment of the last check, "YYYY-MM-DDTHH:MM"
  photo?: string; gapPhoto?: string; refPhoto?: string;   // proof, gap seen, reference ("a good one looks like this"): photo references
  critical?: boolean; second?: string;  // checked by a second person too
  sopId?: string; instrumentId?: string;   // work instruction (3.2); measuring instrument (3.3, equipment of kind instrument)
  ncId?: string;                        // the defect of 5.1 declared from this milestone (one only)
  history?: MilestoneEvent[];           // every check, failures included: never erased
  waivedBy?: string; waivedWhy?: string; waivedAt?: string;   // went past a non-conform milestone on purpose
}
export interface ReceptionReserve {
  id: string; text: string; photo?: string; where?: string; severity?: 'minor' | 'blocking';
  raisedAt: string;                     // day, "YYYY-MM-DD"
  handler?: string; dueAt?: string;     // who takes charge, day it must be lifted (default: the lift delay of the settings)
  repairedAt?: string; repairPhoto?: string;
  liftedAt?: string; liftedBy?: string; liftNote?: string; liftPhoto?: string; liftSign?: Strokes;   // lifted: day, person on the customer side, proof
  ncId?: string;
}
export interface Reception {
  date: string; name: string; role: string; result: '' | 'sans' | 'reserve' | 'refus';
  reserve: string; retentionPct: number | null; amount: number | null; liftedAt: string;   // reserve and liftedAt: old single reservation (read through reservesOf); amount: no longer read nor shown (no invoicing in the tools)
  time?: string; place?: string;        // moment and place of the reception
  orgId?: string; contactId?: string; email?: string;   // customer and person in the directory (1.3)
  qty?: number | null;                  // quantity presented in this delivery (empty = the whole rest of the order)
  count?: number | null;                // quantity counted on site
  photos?: string[];                    // state at delivery
  reserves?: ReceptionReserve[];
  refusal?: { reason: string; other?: string; next: string; nextOther?: string; photo?: string };
  signedAt?: string; companySignedAt?: string;   // moments of the two signatures
  noSign?: { kind: 'absent' | 'refused' | 'other'; other?: string; witness: string; at: string; witnessOrg?: string };   // other: what the mention is, written when "Autre, précisez" is chosen
  partialOk?: { by: string; at: string };   // the customer agreed to be delivered in several times
  pvNo?: string;                        // PV-2026-014
  bl?: string;                          // delivery note number of this delivery
  seals?: { hash: string; at: string; by: string; why?: string }[];   // SHA-256 of the signed content, one at the signature and one after each correction (the last one is the one that counts)
  signTz?: string;                      // time zone of the device at the signature
  signWaiver?: { by: string; why: string; at: string };   // signed without a release before
  pvPhotoAt?: string;                   // moment the photo of the paper PV was attached
}
export interface ShipCheck { id: string; label: string; ok: boolean | null; na?: boolean; by: string; at: string }
// What belongs to one delivery (a presentation to the customer): the root of the order holds the current one, `lots` the closed ones
export interface Presentation {
  milestones: Milestone[];
  releasedBy: string; releasedAt: string; releasedMoment?: string; releaseSign?: Strokes;
  derogation?: { by: string; why: string; at: string; sameAsControl?: boolean };   // released with a milestone not conform or a defect without decision; sameAsControl: the person had checked or waived it themselves
  shipChecks?: ShipCheck[];
  reception: Reception;
  signCompany?: Strokes; signClient?: Strokes; pvPhoto?: string; liftPhoto?: string; liftSignedBy?: string;
}
export interface Lot extends Presentation { id: string; no: number; closedAt: string }
export interface DeliveryLog { at: string; by: string; text: string; proof?: boolean }   // a proof line (signature, release, derogation, lift, refusal, correction, seal) is never dropped by the cap of the journal
export interface Delivery extends Presentation {
  id: string;
  ref: string;             // order number
  client: string;
  item: string;
  qty: number | null;      // quantity ordered
  quoteId?: string;
  template?: string;
  orgId?: string; contactId?: string;   // customer organisation and person in the directory (1.3)
  promisedAt?: string;     // promised delivery day (from the quote: decision + weeks, or typed)
  team?: string[];         // people of the order, offered as buttons at the checks
  lot?: string; serial?: string; material?: string;   // traceability
  lots?: Lot[];            // closed deliveries (received in part, or refused)
  journal?: DeliveryLog[];
  archivedAt?: string; archivedNote?: string;
  exampleHash?: string;    // an order of the example: SHA-256 of the whole record as the example gave it (receptionsExamples.ts); the order still holds it when nobody has touched it
}
export interface MilestoneTemplate {
  name: string;
  milestones: { label: string; point: string; requirement: string; unit?: string; min?: number | null; max?: number | null; refPhoto?: string; critical?: boolean; sopId?: string }[];
  shipChecks?: string[];
}
export interface ReceptionSettings {
  liftDays?: number;       // days to lift a reservation (7)
  liftBusiness?: boolean;  // counted in working days (default: follows Params.businessHours)
  retention?: { on: boolean; maxPct: number };   // clause of the contract: a minor reservation holds back at most … % until lifted (a mention, never an amount)
  refusals?: string[]; nexts?: string[];   // motives of a refusal, what follows it; absent = the neutral lists
  templates?: MilestoneTemplate[];         // models of milestones of the company
  releasers?: string[];    // people who may release; absent or empty = everyone
  shipChecks?: string[];   // checks before departure; absent = the neutral list
  unsignedDays?: number;   // days after the delivery without a signed PV before it is said (2)
  skippedQuotes?: string[];   // won quotes the company does not follow as an order ("Pas de suivi")
  pvCounter?: Record<string, number>;   // year ("2026") -> last PV number given; never goes down (receptions.ts, pvNumber): a deleted order, an older backup or a start over never gives a number twice
}
// What is left to do on the orders (the queue of tool 3.4 and the tasks of everyone)
export type ReceptionTodoKind = 'milestone' | 'blocked' | 'release' | 'ship' | 'late-delivery' | 'unsigned' | 'reserve' | 'reserve-late' | 'refused' | 'next-lot' | 'feedback' | 'defect' | 'seal';
export interface ReceptionTodo { id: string; kind: ReceptionTodoKind; text: string; tone: 'bad' | 'warn'; who: string; due: string; deliveryId: string; milestoneId?: string; reserveId?: string }

// ---- 4.1 emergency deputies
export type PowerWait = 'day' | 'days3' | 'week' | 'more' | 'other';
export interface Power {
  id: string;
  processId: string;
  power: string;           // the act without which the company stops
  holder: string;
  deputies: [string, string];
  practiced: [string, string]; // date of the last real practice of each deputy (the first version; the lines of `practices` come on top of it)
  access: string;          // codes and access, and where they are (direction folder)
  wanted?: 0 | 1 | 2;     // how many deputies this function expects: none, one or two (absent = two); fewer than that is a gap, as many is not
  extra?: string[];        // more deputies, external included
  extraPracticed?: string[];
  periodDays?: number;     // practice required every … days (365 by default)
  nextPracticeAt?: string;
  delegationSigned?: boolean;   // the first version of the formalities; read as `forms.deleg`
  bankInformed?: boolean;       // read as `forms.informed`
  // the rework of 2026-10, all optional: an older record has none of them
  impact?: string;         // what stops without this act
  wait?: PowerWait;        // how long the company can wait for it
  waitOther?: string;
  howTo?: string;          // a few lines: how the act is done
  sopId?: string;          // instruction of tool 3.2 that says how
  skillId?: string;        // skill of tool 4.2 that a deputy needs
  riskId?: string;         // risk of tool 1.2 that says what happens without a deputy
  limits?: string;         // what a deputy may and may not do
  docRef?: string;         // where the signed delegation is kept (text: a folder, a number; nothing is stored)
  contactIds?: string[];   // cards of the directory to know for this act (bank adviser, alarm company…)
  forms?: Record<string, string>;   // formality key -> day done, "na" = not applicable
  signs?: Record<string, PersonSign>;   // by `<subject (name, normalised)>|<slot>`
  refs?: Record<string, string>;   // the link with the directory, by name (normalised): `p:<person id>` for the staff list, `c:<contact id>` for an outside contact; the names above follow a rename
  dep?: Record<string, { accepted?: string; access?: string }>;   // by deputy (name, normalised): accepted the role on…, access opened in his name on…
  reviewedAt?: string;
  reviewedBy?: string;
  archivedAt?: string;
}
// One real practice of a deputy, a line of proof written once (never rewritten: two people never overwrite each other)
// A signature on the designation of a person in a key function. The holder signs herself and the direction signs for her (two signatures); a deputy signs, the holder validates and the
// direction validates (three). `slot` says which one it is, `subject` whose designation it is, `who` who signed; the text signed is frozen with the signature.
export interface PersonSign { slot: 'self' | 'holder' | 'direction'; subject: string; who: string; at: string; img: string; text: string }   // img: the drawn signature (PNG data URL); '' when the name was typed instead
export interface Practice {
  id: string;
  powerId: string;
  who: string;             // the deputy
  date: string;            // the day the act was done
  checkedBy: string;       // the person who saw it done; empty = declared only
  note: string;            // what blocked
  coverId?: string;        // credited by an absence that was covered
  at: string;              // when the line was written
  by: string;              // who wrote it
}
// An absence that was covered: who was away, which deputy took which power, what was missing
export interface Cover {
  id: string;
  who: string;
  from: string;
  to: string;
  takes: { powerId: string; by: string }[];
  missing: string;
  closedAt: string;
  closedBy: string;
  at: string;
  by: string;
}
// A sealed envelope of the accesses: where, what it holds (never the secrets), the two people of the double visa
export interface Vault {
  id: string;
  name: string;
  location: string;
  contents: string[];
  visa: [string, string];
  keyHolder?: string;
  sealedAt?: string;
  checkedAt?: string;      // the check of the first version, before the lines of `vlogs`
  checkedBy?: string;
  archivedAt?: string;
}
export interface VaultLog {
  id: string;
  vaultId: string;
  kind: 'check' | 'open';
  at: string;              // "YYYY-MM-DDTHH:MM"
  by: string;
  ticks?: boolean[];       // check: the four controls
  note?: string;           // check: what was found; open: what was used
  absent?: string;         // open: the person who was away
  reason?: string;
  openedBy?: string;
  visaBy?: string;
  resealedAt?: string;     // open: put back under seal on…
  codesChangedAt?: string; // open: codes changed on…
}
export interface Envelope { location: string; checkedAt: string; by: string }
export interface PowerSettings {
  practiceDays?: number;   // practice of a deputy every … days (365)
  envelopeDays?: number;   // check of an envelope every … days (183)
  longHours?: number;      // an absence longer than this opens the envelope (24)
  reviewMonths?: number;   // the list of powers is reviewed every … months (12)
  loadMax?: number;        // a person who is deputy of more powers than this is said (3)
  practice?: boolean;      // the follow-up of the practice of the deputies (a line of proof a year); absent = off, the delegation is signed instead
  vaultFull?: boolean;     // the sealed-envelope follow-up (checks, openings, journal); absent = the light list of the emergency accesses
  forms?: { key: string; label: string }[];          // formalities asked for each power; absent = the neutral list
  library?: { process: string; text: string }[];     // suggestions of vital powers; absent = the neutral list
}

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
  sopId?: string;          // work instruction (3.2) of the workstation where it happened, and the step of that sheet
  sopStep?: number;
  equipmentId?: string;    // equipment (3.3) where it happened
  deliveryId?: string;     // order (3.4) it was declared from, with the milestone or the reservation
  milestoneId?: string;
  reserveId?: string;
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
