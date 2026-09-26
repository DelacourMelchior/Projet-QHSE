// Shared by tools 2.1 to 5.4: defaults, identifiers, record numbers, dates and hours, process names.
import type { Ged, Params, State } from './types';
import { isoDate, parseDate } from './periods';

// Message of a summary card
export interface Insight { key: string; tone: 'good' | 'warn' | 'bad'; title: string; text: string }

export const DEFAULT_PARAMS: Params = { hourlyRate: 55, marginFloorPct: 30, depositPct: 30, visaThreshold: 10000 };

export const PROCESS_NAMES: Record<string, string> = {
  P1: 'Direction et pilotage',
  P2: 'Commercial et clients',
  P3: 'Réalisation et opérations',
  P4: 'Ressources humaines et organisation',
  P5: 'Qualité et amélioration',
};
export const PROCESS_IDS = Object.keys(PROCESS_NAMES);
export const processLabel = (id: string) => (PROCESS_NAMES[id] ? `${id} · ${PROCESS_NAMES[id]}` : id || 'À qualifier');

// The collections added by tools 2.1 to 5.4, empty
export const emptyTools = (): Pick<State, 'params' | 'quotes' | 'changes' | 'complaints' | 'feedbacks' | 'suppliers' | 'debits' | 'sops'
  | 'equipments' | 'deliveries' | 'powers' | 'envelope' | 'people' | 'skills' | 'newcomers' | 'ged' | 'chronos' | 'ncs' | 'analyses' | 'pokas'> => ({
  params: { ...DEFAULT_PARAMS },
  quotes: {}, changes: {}, complaints: {}, feedbacks: {}, suppliers: {}, debits: {}, sops: {}, equipments: {}, deliveries: {},
  powers: {}, envelope: { location: '', checkedAt: '', by: '' }, people: {}, skills: {}, newcomers: {}, ged: defaultGed(), chronos: {},
  ncs: {}, analyses: {}, pokas: {},
});

// Filing plan in 5 processes (tool 4.4)
export function defaultGed(): Ged {
  return {
    owner: '',
    archive: '_ARCHIVES_NE_PAS_UTILISER',
    folders: [
      { code: '01_DIRECTION_STRATEGIE', processId: 'P1', subfolders: ['01_Objectifs', '02_Revues_Direction', '03_Indicateurs', '04_Finances'], rights: 'Direction et cadres' },
      { code: '02_COMMERCIAL_CLIENTS', processId: 'P2', subfolders: ['01_Marketing', '02_Devis_Offres', '03_Avenants_Signes', '04_Reclamations'], rights: 'Commercial, ADV et direction' },
      { code: '03_ETUDES_OPERATIONS', processId: 'P3', subfolders: ['01_Plans_BE', '02_Fabrication_Chantiers', '03_Maintenance', '04_Achats_Fournisseurs'], rights: "Bureau d'études et opérations" },
      { code: '04_RH_ORGANISATION', processId: 'P4', subfolders: ['01_Suppleances', '02_Polyvalence', '03_Accueil_Recrues'], rights: 'RH et encadrement' },
      { code: '05_QUALITE_AMELIORATION', processId: 'P5', subfolders: ['01_Non_Conformites', '02_Cout_Non_Qualite', '03_Ateliers_5P', '04_Detrompeurs'], rights: 'Tous les collaborateurs' },
    ],
    procCodes: [
      { code: 'DIR', label: 'Direction' }, { code: 'COM', label: 'Commercial' }, { code: 'BE', label: "Bureau d'études" },
      { code: 'OPS', label: 'Opérations' }, { code: 'RH', label: 'Ressources humaines' }, { code: 'QUA', label: 'Qualité' },
    ],
    typeCodes: [
      { code: 'DEV', label: 'Devis' }, { code: 'PLN', label: 'Plan' }, { code: 'SOP', label: 'Instruction de poste' },
      { code: 'NC', label: 'Non-conformité' }, { code: 'CR', label: 'Compte rendu' }, { code: 'CTR', label: 'Contrat' },
      { code: 'FAC', label: 'Facture' }, { code: 'TAB', label: 'Tableau' },
    ],
  };
}

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Next record number of the year: "NC-2026-007" (numbers already used in the collection are skipped)
export function nextRef(prefix: string, used: { ref: string }[], today = new Date()): string {
  const y = today.getFullYear();
  const re = new RegExp(`^${prefix}-${y}-(\\d+)$`);
  const max = used.reduce((m, x) => { const n = x.ref.match(re); return n ? Math.max(m, Number(n[1])) : m; }, 0);
  return `${prefix}-${y}-${String(max + 1).padStart(3, '0')}`;
}

// ---- dates and hours ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM", local time)
export const nowLocal = (d = new Date()) => `${isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export function parseStamp(s: string | undefined | null): Date | null {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
}
export const hoursBetween = (a: string, b: Date | string): number | null => {
  const x = parseStamp(a), y = typeof b === 'string' ? parseStamp(b) : b;
  return x && y ? (y.getTime() - x.getTime()) / 3600000 : null;
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// Whole days from a to b (rounded: a day across a daylight saving change lasts 23 or 25 hours)
export const daysBetween = (a: string, b: Date | string): number | null => {
  const x = parseDate(a), y = typeof b === 'string' ? parseDate(b) : startOfDay(b);
  return x && y ? Math.round((y.getTime() - x.getTime()) / 86400000) : null;
};
export const addDays = (iso: string, n: number): string => {
  const d = parseDate(iso);
  return d ? isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)) : '';
};
export const frStamp = (s: string) => {
  const d = parseStamp(s);
  if (!d) return '';
  return s.length > 10 ? `${d.toLocaleDateString('fr-FR')} ${String(d.getHours()).padStart(2, '0')} h ${String(d.getMinutes()).padStart(2, '0')}` : d.toLocaleDateString('fr-FR');
};
export const formatHours = (h: number) => (h < 1 ? `${Math.max(0, Math.round(h * 60))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} jours`);

// Money figure of a count of hours at the loaded hourly cost
export const hoursCost = (h: number | null | undefined, p: Params) => (h ? h * p.hourlyRate : 0);
export const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((a, b) => a + (b || 0), 0);

// Names typed in the tools (pilots, owners, deputies, team), for the suggestion lists
export function knownPeople(s: State): string[] {
  const names = [
    ...Object.values(s.people || {}).filter(p => p.active).map(p => p.name),
    ...Object.values(s.actions).flatMap(a => [a.pilot, ...a.plan.map(p => p.pilot)]),
    ...Object.values(s.risks).flatMap(r => [r.owner, r.deputy]),
    ...Object.values(s.powers || {}).flatMap(p => [p.holder, ...p.deputies]),
  ];
  return [...new Set(names.map(n => (n || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
