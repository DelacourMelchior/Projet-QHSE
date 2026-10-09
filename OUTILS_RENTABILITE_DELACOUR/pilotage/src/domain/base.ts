// Shared by tools 2.1 to 5.4: defaults, identifiers, record numbers, dates and hours, process names.
import type { Ged, Params, State } from './types';
import { isoDate, parseDate } from './periods';

// Message of a summary card
export interface Insight { key: string; tone: 'good' | 'warn' | 'bad'; title: string; text: string }

export const DEFAULT_PARAMS: Params = { hourlyRate: 55, marginFloorPct: 30, depositPct: 30, visaThreshold: 10000, cnqTrigger: 500, businessHours: true };

export const PROCESS_NAMES: Record<string, string> = {
  P1: 'Direction et pilotage',
  P2: 'Commercial et clients',
  P3: 'Réalisation et opérations',
  P4: 'Ressources humaines et organisation',
  P5: 'Qualité et amélioration',
};
export const PROCESS_IDS = Object.keys(PROCESS_NAMES);
// The colour of each process of the map (filled by registerProcesses; none before)
export const PROCESS_COLORS: Record<string, string> = {};
// The process a record falls back on: the wished one when the map still has it, else the first of the map, else none
export const defaultProcess = (prefer = '', ids: string[] = PROCESS_IDS): string => (ids.includes(prefer) ? prefer : ids[0] || '');
export const processLabel = (id: string) => (PROCESS_NAMES[id] ? `${id} · ${PROCESS_NAMES[id]}` : id || 'À qualifier');

// The collections added by tools 2.1 to 5.4, empty
export const emptyTools = (): Pick<State, 'params' | 'quotes' | 'complaints' | 'feedbacks' | 'suppliers' | 'debits' | 'sectors' | 'sops'
  | 'equipments' | 'spares' | 'deliveries' | 'powers' | 'practices' | 'covers' | 'vaults' | 'vlogs' | 'envelope' | 'people' | 'skills' | 'newcomers' | 'ged' | 'chronos' | 'ncs' | 'analyses' | 'pokas' | 'logs' | 'orgs' | 'flows'> => ({
  params: { ...DEFAULT_PARAMS },
  quotes: {}, complaints: {}, feedbacks: {}, suppliers: {}, debits: {}, sectors: {}, sops: {}, equipments: {}, spares: {}, deliveries: {},
  powers: {}, practices: {}, covers: {}, vaults: {}, vlogs: {}, envelope: { location: '', checkedAt: '', by: '' }, people: {}, skills: {}, newcomers: {}, ged: defaultGed(), chronos: {},
  ncs: {}, analyses: {}, pokas: {}, logs: {}, orgs: {}, flows: {},
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

// The name of the fictitious company of the demo: the examples of every tool are topped up only in the company that bears it
export const EXAMPLE_COMPANY = 'Entreprise exemple (fictive)';
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
// French typography for a text written by the code: a narrow no-break space before : ; ? ! % » and after «, and inside "14 h 05" or "48 h", so that a line never begins with a sign
// or ends on an opening quote. Only the ordinary space is replaced: a text that is already set is not changed (nb(nb(s)) is nb(s)).
export const nb = (s: string): string => s.replace(/ (?=[:;?!%»])/g, '\u202f').replace(/« /g, '«\u202f').replace(/(\d) h (?=\d\d\b)/g, '$1\u00a0h\u00a0').replace(/(\d) h\b/g, '$1\u00a0h');
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

// Working calendar of the 48 h and 24 h rules: false = every hour counts; true = Monday to Friday; a list of days = Monday to Friday
// except those days (public holidays, closing of the company), as ISO dates
export type Business = boolean | readonly string[];
export const businessOf = (p: Pick<Params, 'businessHours' | 'closedDays'>): Business => (p.businessHours ? (p.closedDays || []) : false);
const isOffDay = (d: Date, business: Business) => d.getDay() === 0 || d.getDay() === 6 || (Array.isArray(business) && business.includes(isoDate(d)));

// Hours between two moments, counting only working days when business is set (48 h rule of 2.3, 24 h rule of 5.1)
export function workHoursBetween(a: string, b: Date | string, business: Business = false): number | null {
  const x = parseStamp(a), y = typeof b === 'string' ? parseStamp(b) : b;
  if (!x || !y) return null;
  if (!business) return (y.getTime() - x.getTime()) / 3600000;
  let h = 0;
  for (let t = x.getTime(); t < y.getTime();) {
    const d = new Date(t);
    const next = Math.min(y.getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime());
    if (!isOffDay(d, business)) h += (next - t) / 3600000;
    t = next;
  }
  return h;
}

// Moment when `h` hours have gone by since `a`, counting only working days when business is set (the deadline of a 48 h rule)
export function addWorkHours(a: string, h: number, business: Business = false): string {
  const x = parseStamp(a);
  if (!x) return '';
  if (!business) return nowLocal(new Date(x.getTime() + h * 3600000));
  let left = h * 3600000, t = x.getTime();
  while (left > 0) {
    const d = new Date(t), next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    if (isOffDay(d, business)) { t = next; continue; }
    if (left <= next - t) { t += left; break; }
    left -= next - t; t = next;
  }
  return nowLocal(new Date(t));
}

// Words of the tools, explained to the team (glossary of the home screen)
export const GLOSSARY: [string, string][] = [
  ['Processus', "Une famille de travail de bout en bout, de ce qui la déclenche à ce qu'elle livre. Il y en a 5 au départ (P1 à P5) ; l'entreprise peut en ajouter dans la cartographie."],
  ['Bande de la carte', "Où se range un processus sur la carte : management (décider, piloter), réalisation (ce qui crée la valeur pour le client) ou support (ce qui rend la réalisation possible)."],
  ['Pilote de processus', "La personne qui répond d'un processus : elle s'assure qu'il fonctionne, tient sa fiche à jour et la relit chaque année. Son suppléant la remplace."],
  ['Suppléant du pilote', "La personne qui remplace le pilote d'un processus en son absence : elle peut, comme lui, modifier la fiche."],
  ['Logigramme', "Le dessin des étapes d'un cas, de bout en bout : qui fait quoi, dans quel ordre, et où l'on va selon la réponse à chaque question (oui, non, ou d'autres réponses)."],
  ['Entrée et sortie', "Ce dont un processus a besoin pour démarrer (entrée) et ce qu'il livre (sortie), avec de qui ça vient et pour qui ça part."],
  ['Sous-processus', "Une étape qui renvoie vers un autre logigramme, utile quand ce travail est déjà décrit ailleurs : on le suit, puis on reprend ici."],
  ['Point de contrôle', "Un moment du logigramme où l'on vérifie avant de continuer (la marge, la conformité). Il se coche sur l'étape."],
  ['Exigence', "Ce qu'un processus doit respecter : une demande d'un client, la loi, une norme, une règle de l'entreprise."],
  ['Processus en cause', 'La famille de travail qui a rendu le problème possible (pas la personne qui l\'a vu).'],
  ['Non-qualité', 'Ce que coûtent les défauts : matière jetée, heures refaites, transport en urgence, avoirs.'],
  ['5 Pourquoi', 'Demander « pourquoi ? » plusieurs fois pour trouver la vraie cause, sans chercher de coupable.'],
  ['5M', 'Les 5 pistes de solution : main-d\'œuvre, méthode, matériel, matière, milieu.'],
  ['Détrompeur (poka-yoke)', 'Une butée, un gabarit, un blocage qui rend l\'erreur impossible.'],
  ['Bac rouge', 'Le bac fermé où l\'on isole toute pièce douteuse en attendant une décision.'],
  ['Homme-clé', 'La seule personne qui sait faire une tâche : si elle manque, la tâche s\'arrête.'],
  ['Plan B', 'La solution de secours prête et testée quand une ressource vitale s\'arrête.'],
  ['Note de satisfaction', 'Moyenne des notes de 0 (très bas) à 10 (très haut) que les clients donnent à la fin d\'une commande.'],
  ['Jalon', 'Un point de contrôle d\'une commande : le résultat est noté avec la personne, le jour et la preuve.'],
  ['Libération', 'L\'accord d\'une personne nommée, une fois les jalons contrôlés, pour que la commande parte chez le client.'],
  ['Réserve', 'Une remarque écrite sur le PV quand le client reçoit la commande : un défaut constaté, à lever dans un délai.'],
  ['Levée', 'Le constat par le client qu\'une réserve est réglée : le jour et la personne sont notés.'],
  ['PV', 'Le procès-verbal de réception : il garde le jour, le lieu, le résultat, les réserves et les signatures d\'une livraison.'],
  ['Livraison', 'La remise de la commande, ou d\'une partie, au client : un jour, un lieu et une quantité livrée.'],
  ['Réception', 'L\'acte du client qui réceptionne une livraison : son résultat (sans réserve, avec réserve ou refusée), le PV et les signatures.'],
  ['Plage attendue', 'Les valeurs, mini et maxi, entre lesquelles la mesure d\'un jalon est conforme.'],
  ['Fiche', 'La fiche d\'une commande : ses jalons, sa libération, sa réception et ses suites, au même endroit.'],
  ['Fiche suiveuse', 'Le document papier qui suit une commande : un visa par jalon.'],
  ['Fonction clé', "L'acte sans lequel un processus s'arrête : payer, valider une offre, lancer l'activité, ouvrir les locaux, libérer un produit."],
  ['Suppléant', "Une personne qui a fait l'acte elle-même dans l'année, vue par un titulaire ou la direction : elle peut le tenir si le titulaire manque."],
  ['Enveloppe des accès', "Les accès de secours sous pli scellé, au coffre : elle s'ouvre sous double visa, se vérifie tous les six mois, et ses codes changent après chaque ouverture."],
];

// The button "Voir un exemple traité": puts the example records in the collections that are empty, and never touches one that already holds records of the company
export function fillEmptyCollections(d: object, ex: object): void {
  const target = d as Record<string, unknown>;
  for (const [k, v] of Object.entries(ex)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const cur = target[k];
    if (!cur || typeof cur !== 'object' || !Object.keys(cur).length) target[k] = v;
  }
}
