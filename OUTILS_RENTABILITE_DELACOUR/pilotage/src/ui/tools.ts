// The 19 tools of the application, one per question of the process audit (1.3 Annuaire added), grouped by process.
// Address of a tool: pilotage.html#2.1 (the tool 1.1 has no hash; #continuite and #annuaire are kept for 1.2 and 1.3).
import type { Action, Ref } from '../domain/types';

export type ProcessKey = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type ToolId = '1.1' | '1.2' | '1.3' | '2.1' | '2.2' | '2.3' | '2.4' | '3.1' | '3.2' | '3.3' | '3.4' | '4.1' | '4.2' | '4.3' | '4.4' | '5.1' | '5.2' | '5.3' | '5.4';

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
  { id: '2.2', process: 'P2', label: 'Avenants', title: 'Avenants et accord client', desc: 'Chiffrer le supplément, obtenir l\'accord avant de le faire, puis le facturer.' },
  { id: '2.3', process: 'P2', label: 'Réclamations', title: 'Réclamations clients sous 48 h', desc: 'Rappeler le client sous 48 h, trouver le processus en cause, chiffrer le litige.' },
  { id: '2.4', process: 'P2', label: 'Bilan de fin', title: "Bilan flash de fin d'affaire", desc: '3 questions au client le jour de la livraison, puis la facture de solde sous 24 h.' },
  { id: '3.1', process: 'P3', label: 'Fournisseurs', title: 'Notation fournisseurs et fiches de débit', desc: 'Réclamer sous 48 h chaque défaut fournisseur et noter chaque fournisseur une fois par an.' },
  { id: '3.2', process: 'P3', label: 'Instructions', title: 'Instructions visuelles au poste', desc: 'Le bon geste et le piège en photos, affichés au poste, et les personnes habilitées.' },
  { id: '3.3', process: 'P3', label: 'Maintenance', title: 'Routine sensorielle et armoire de survie', desc: '10 minutes d\'inspection chaque lundi et les pièces d\'usure critiques en stock.' },
  { id: '3.4', process: 'P3', label: 'Réceptions', title: 'Autocontrôle et PV de réception', desc: 'Un contrôle à chaque jalon, puis un PV signé le jour de la livraison (règle 95/5).' },
  { id: '4.1', process: 'P4', label: 'Suppléances', title: "Suppléances d'urgence", desc: 'Pour chaque pouvoir vital, 2 suppléants qui ont pratiqué dans l\'année.' },
  { id: '4.2', process: 'P4', label: 'Polyvalence', title: 'Polyvalence et homme-clé', desc: 'Qui sait faire quoi, de 0 à 4, et les compétences tenues par une seule personne.' },
  { id: '4.3', process: 'P4', label: 'Accueil', title: "Accueil et test d'autonomie", desc: 'Un parcours de 15 jours et un test en 3 questions avant de travailler seul.' },
  { id: '4.4', process: 'P4', label: 'Classement', title: 'Nommage et classement des documents', desc: 'Un plan de classement en 5 processus, un nom de fichier normé, un test des 30 secondes.' },
  { id: '5.1', process: 'P5', label: 'Bac rouge', title: 'Bac rouge : quarantaine sous 5 minutes', desc: 'Isoler tout défaut, l\'étiqueter et décider sous 24 h : rebut, retouche ou dérogation.' },
  { id: '5.2', process: 'P5', label: 'Non-qualité', title: 'Coût de non-qualité par processus', desc: 'Chaque défaut chiffré en euros et imputé au processus qui l\'a causé.' },
  { id: '5.3', process: 'P5', label: '5 Pourquoi', title: 'Ateliers 5 Pourquoi', desc: 'Trouver la cause racine sans chercher de coupable, et une contre-mesure sous 7 jours.' },
  { id: '5.4', process: 'P5', label: 'Détrompeurs', title: 'Détrompeurs et contrôle à J+30', desc: 'Rendre l\'erreur impossible, puis vérifier sur le terrain 30 jours plus tard.' },
];

export const toolDef = (id: ToolId) => TOOLS.find(t => t.id === id)!;
export const toolsOf = (p: ProcessKey) => TOOLS.filter(t => t.process === p);

const LEGACY_HASH: Record<string, ToolId> = { '#continuite': '1.2', '#annuaire': '1.3' };
export const hashOf = (id: ToolId) => (id === '1.1' ? '' : id === '1.2' ? '#continuite' : id === '1.3' ? '#annuaire' : `#${id}`);
export function toolOfHash(hash: string): ToolId | 'home' {
  if (hash === '#accueil') return 'home';
  if (LEGACY_HASH[hash]) return LEGACY_HASH[hash];
  const t = TOOLS.find(x => `#${x.id}` === hash);
  return t ? t.id : '1.1';
}

// The tool an action was created from (its register shows it in that tool's process)
const REF_TOOL: Record<NonNullable<Action['ref']>['kind'], ToolId> = {
  analysis: '5.3', equipment: '3.3', supplier: '3.1', feedback: '2.4', complaint: '2.3', skill: '4.2', power: '4.1',
};
export const actionTool = (a: Action): ToolId => (a.riskId ? '1.2' : a.ref ? REF_TOOL[a.ref.kind] : '1.1');

// What a tool screen can ask the shell: open another tool, an action, a risk
export interface NewActionInit { kpiId?: string; riskId?: string; ref?: Ref; constat?: string }
export interface Nav {
  tool(id: ToolId, focus?: string): void;   // focus: id of a record to open in that tool
  openAction(id: string): void;
  newAction(init: NewActionInit): void;
  openRisk(id: string, step?: number): void;
}
