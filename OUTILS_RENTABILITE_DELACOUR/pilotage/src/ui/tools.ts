// The 18 tools of the application, one per question of the process audit (1.3 Annuaire added), grouped by process.
// 2.4 keeps its number (the cabinet's paper tool) but sits in the quality process P5, after 5.4: it measures the satisfaction of the customers.
// Address of a tool: pilotage.html#2.1 (the tool 1.1 has no hash; #continuite and #annuaire are kept for 1.2 and 1.3).
import type { Action, Ref } from '../domain/types';

export type ProcessKey = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type ToolId = '1.1' | '1.2' | '1.3' | '2.1' | '2.3' | '2.4' | '3.1' | '3.2' | '3.3' | '3.4' | '4.1' | '4.2' | '4.3' | '4.4' | '5.1' | '5.2' | '5.3' | '5.4';

export type SettingsTab = 'entreprise' | 'donnees';

export interface ToolDef { id: ToolId; process: ProcessKey; label: string; title: string; desc: string }

export const PROCESSES: { key: ProcessKey; label: string; name: string }[] = [
  { key: 'P1', label: 'Pilotage', name: 'Direction et pilotage' },
  { key: 'P2', label: 'Commercial', name: 'Commercial et clients' },
  { key: 'P3', label: 'Opérations', name: 'Réalisation et opérations' },
  { key: 'P4', label: 'RH', name: 'Ressources humaines et organisation' },
  { key: 'P5', label: 'Qualité', name: 'Qualité et amélioration' },
];

export const TOOLS: ToolDef[] = [
  { id: '1.1', process: 'P1', label: 'Indicateurs', title: 'Tableau de pilotage mensuel', desc: 'Les indicateurs du mois, une synthèse pour décider et un plan d\'actions pour corriger.' },
  { id: '1.2', process: 'P1', label: 'Plans B', title: "Continuité d'activité : Plans B", desc: 'Les risques vitaux, un Plan B testé pour chacun et les fiches réflexes du jour de la panne.' },
  { id: '1.3', process: 'P1', label: 'Annuaire', title: 'Annuaire', desc: 'Les numéros à appeler quand ça casse, vérifiés au moins une fois par an.' },
  { id: '2.1', process: 'P2', label: 'Devis', title: 'Faisabilité et marge des devis', desc: '5 verrous à cocher et une marge vérifiée avant d\'envoyer une offre.' },
  { id: '2.3', process: 'P2', label: 'Réclamations', title: 'Réclamations clients sous 48 h', desc: 'Recontacter le client sous 48 h, enquêter sur l\'origine, résoudre ou contester, chiffrer le litige.' },
  { id: '3.1', process: 'P3', label: 'Fournisseurs', title: 'Évaluation et suivi des fournisseurs', desc: 'Chaque fournisseur est noté chaque année sur les critères de l\'entreprise, rangé par secteur avec un principal et un secours ; ses réclamations sont suivies de l\'envoi à la clôture et gardées dans son historique.' },
  { id: '3.2', process: 'P3', label: 'Instructions', title: 'Instructions visuelles au poste', desc: 'Le bon geste et le piège en photos, affichés au poste, et les personnes habilitées.' },
  { id: '3.3', process: 'P3', label: 'Maintenance', title: 'Routine, armoire de survie et contrôles', desc: 'La routine de chaque équipement (le lundi par défaut), les anomalies et pannes, les pièces critiques en stock et les contrôles à échéance.' },
  { id: '3.4', process: 'P3', label: 'Réceptions', title: 'Autocontrôle et PV de réception', desc: 'Un contrôle à chaque jalon, une libération nommée, puis un PV signé sur place et ses réserves levées.' },
  { id: '4.1', process: 'P4', label: 'Suppléances', title: "Suppléances d'urgence", desc: "Pour chaque fonction clé, 2 suppléants qui ont fait l'acte dans l'année, et qui remplace qui quand quelqu'un manque." },
  { id: '4.2', process: 'P4', label: 'Polyvalence', title: 'Polyvalence et homme-clé', desc: 'Qui sait faire quoi, de 0 à 4, et les compétences tenues par une seule personne.' },
  { id: '4.3', process: 'P4', label: 'Accueil', title: "Accueil et test d'autonomie", desc: 'Un parcours de 15 jours et un test en 3 questions avant de travailler seul.' },
  { id: '4.4', process: 'P4', label: 'Classement', title: 'Nommage et classement des documents', desc: 'Un plan de classement en 5 processus, un nom de fichier normé, un test des 30 secondes.' },
  { id: '5.1', process: 'P5', label: 'Bac rouge', title: 'Bac rouge : quarantaine sous 5 minutes', desc: 'Isoler tout défaut, l\'étiqueter et décider sous 24 h : rebut, retouche ou dérogation.' },
  { id: '5.2', process: 'P5', label: 'Non-qualité', title: 'Coût de non-qualité par processus', desc: 'Chaque défaut chiffré en euros et imputé au processus qui l\'a causé.' },
  { id: '5.3', process: 'P5', label: '5 Pourquoi', title: 'Ateliers 5 Pourquoi', desc: 'Trouver la cause racine sans chercher de coupable, et une contre-mesure sous 7 jours.' },
  { id: '5.4', process: 'P5', label: 'Détrompeurs', title: 'Détrompeurs et contrôle à J+30', desc: 'Rendre l\'erreur impossible, puis vérifier sur le terrain 30 jours plus tard.' },
  { id: '2.4', process: 'P5', label: 'Bilan de fin', title: "Bilan flash de fin d'affaire", desc: '3 questions au client à la fin de l\'affaire pour mesurer sa satisfaction, de 0 à 10.' },
];

export const toolDef = (id: ToolId) => TOOLS.find(t => t.id === id)!;
export const toolsOf = (p: ProcessKey) => TOOLS.filter(t => t.process === p);

const LEGACY_HASH: Record<string, ToolId> = { '#continuite': '1.2', '#annuaire': '1.3' };
export const hashOf = (id: ToolId) => (id === '1.1' ? '' : id === '1.2' ? '#continuite' : id === '1.3' ? '#annuaire' : `#${id}`);
// An address can carry the record to open: pilotage.html#2.1~qt_abc (links that open in a new tab)
export function toolOfHash(raw: string): ToolId | 'home' {
  const hash = raw.split('~')[0];
  if (hash === '#accueil') return 'home';
  if (LEGACY_HASH[hash]) return LEGACY_HASH[hash];
  const t = TOOLS.find(x => `#${x.id}` === hash);
  return t ? t.id : '1.1';
}
export const focusOfHash = (hash: string) => { try { return decodeURIComponent(hash.split('~')[1] || ''); } catch { return ''; } };
// The address of a page of the application as it is printed in a QR code: where the application is (origin and path) and the record, never the query string (a session or a share
// token of the hosting would end up on paper) nor a login typed in the address
export const toolUrl = (id: ToolId, focus = '') => {
  const u = new URL(window.location.href);
  u.username = u.password = u.search = u.hash = '';
  return `${u.href}${hashOf(id) || '#1.1'}${focus ? `~${encodeURIComponent(focus)}` : ''}`;
};
// An address that stops serving the day the application is hosted: this computer, a file on the disk, the local network of the company (192.168…, 10…, 172.16…), a test name (.local, .test).
// A QR code printed from it is dead after the move: said where it is printed.
export const isLocalAddress = (loc: Pick<Location, 'hostname' | 'protocol'> = window.location): boolean =>
  loc.protocol === 'file:' || /^(|localhost|\[::1\]|(127|10)(\.\d+){3}|192\.168(\.\d+){2}|172\.(1[6-9]|2\d|3[01])(\.\d+){2}|169\.254(\.\d+){2}|.+\.(local|localhost|test|lan|home|internal))$/i.test(loc.hostname);

// The tool an action was created from (its register shows it in that tool's process)
const REF_TOOL: Record<NonNullable<Action['ref']>['kind'], ToolId> = {
  analysis: '5.3', equipment: '3.3', supplier: '3.1', feedback: '2.4', complaint: '2.3', skill: '4.2', power: '4.1',
};
export const actionTool = (a: Action): ToolId => (a.riskId ? '1.2' : a.ref ? REF_TOOL[a.ref.kind] : '1.1');

// What a tool screen can ask the shell: open another tool, an action, a risk
export interface NewActionInit { kpiId?: string; riskId?: string; ref?: Ref; constat?: string }
export interface Nav {
  tool(id: ToolId, focus?: string): void;   // focus: id of a record to open in that tool (replaces the page: the hub and the jumps inside one tool)
  open(id: ToolId, focus?: string): void;   // a button to ANOTHER tool: opens it in a new browser tab, the page and the sheet stay as they are; the record it concerns is already written
  openAction(id: string): void;
  newAction(init: NewActionInit): void;
  openRisk(id: string, step?: number): void;
  settings(tab?: SettingsTab): void;   // general Réglages (company, hourly cost, rights) or Données (shared folder, backups)
}
