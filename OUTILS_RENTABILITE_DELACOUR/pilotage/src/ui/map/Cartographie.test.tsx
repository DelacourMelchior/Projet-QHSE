// Tool 1.4, the screens: the map in three bands, the sheet in its six tabs, a flowchart (list and diagram), the review, the settings; read only and no access. Static render, the date fixed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import type { State } from '../../domain/types';
import { demoState, blankState } from '../../domain/templates';
import { plain } from '../operations/testPlain';
import { Cartographie } from './Cartographie';
import { ProcessSheet, type SheetTab } from './ProcessSheet';
import { FlowEditor } from './FlowEditor';
import { MapReview } from './MapReview';
import { MapSettings } from './MapSettings';
import { FlowUses } from './FlowUses';
import { ToolFlows } from './ToolFlows';
import { LinkPicker } from './LinksEditor';
import { SupportCell } from './Support';
import { StepPanel } from './StepPanel';
import { SUPPORTS } from '../../domain/mapSupport';
import { Polyvalence } from '../team/Polyvalence';
import { registerProcesses } from '../../domain/cartography';
import { isWork as isWorkStep } from '../../domain/mapSupport';
import { badgeBg } from './MapBits';

const store = vi.hoisted(() => ({ state: null as unknown, author: 'Test' }));
vi.mock('../../store/StoreContext', () => ({
  useStore: () => ({ state: store.state, update: (f: (d: unknown) => void) => f(store.state), author: store.author, teamView: false, storageFull: false, folder: { status: 'none' } }),
}));
vi.mock('../common', async orig => ({ ...(await orig<typeof import('../common')>()), Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) => <section aria-label={String(title)}>{children}{footer}</section> }));

const now = new Date(2026, 9, 7, 10, 0), noop = () => {};
const nav = { tool: vi.fn(), open: vi.fn(), openAction: vi.fn(), newAction: vi.fn(), openRisk: vi.fn(), settings: vi.fn() };
const draw = (el: React.ReactElement) => plain(renderRaw(el));
const fresh = (s: State = demoState(now)) => { store.state = s; store.author = 'Test'; return s; };
const sheet = (id: string, tab: SheetTab) => draw(<ProcessSheet id={id} tab={tab} onTab={noop} onBack={noop} nav={nav} onOpenFlow={noop} onNewFlow={noop} onDelete={noop} />);
const panel = (flowId: string, stepId: string) => {
  const s = store.state as State, f = s.flows[flowId], i = f.steps.findIndex(x => x.id === stepId);
  return draw(<StepPanel f={f} rf={f} i={i} can nav={nav} skills={Object.values(s.skills)} people={Object.values(s.people)} roles={['Atelier']} others={Object.values(s.flows)} patch={noop} setLinks={noop} setBranches={noop} changeKind={noop} remove={noop} openFlow={noop} onGo={noop} onClose={noop} />);
};
beforeEach(() => { vi.useFakeTimers({ now, toFake: ['Date'] }); });
afterEach(() => { vi.useRealTimers(); });

describe('1.4 the map', () => {
  it('draws the three bands with the five processes, their pilot and their state', () => {
    fresh();
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    ['Management', 'Réalisation', 'Support', 'Ce qui crée la valeur pour le client'].forEach(t => expect(html).toContain(t));
    ['P1', 'P2', 'P3', 'P4', 'P5'].forEach(c => expect(html).toContain(c));
    expect(html).toContain('Pilote : Jean-Marc');
    expect(html).toContain('Ajouter un processus');
    expect(html).toMatch(/Revue des fiches \(\d\)/);
    expect(html).not.toContain('P1 · Direction');           // the code is beside the name, not inside it
    expect(html).not.toMatch(/undefined|NaN|\[object/);
  });
  it('an untouched company sees five empty sheets and the way to start', () => {
    fresh(blankState('industrie', now));
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Sans pilote');
    expect(html).toContain('0 logigramme');
  });
  it('says in words what goes from one process to another, under the map', () => {
    fresh();
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Échanges entre processus');
    expect(html).toContain('P2 vers P3');
    expect(html).toContain('Commande signée');
  });
  it('says so, and shows nothing else, to somebody without access', () => {
    const s = fresh(); s.params.map = { rights: { test: 'none' } };
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).toContain("Vous n&#x27;avez pas accès");
  });
  it('hides the settings from somebody who does not administer', () => {
    const s = fresh(); s.params.map = { rights: { test: 'own' } };
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).not.toContain('Réglages de la cartographie');
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).not.toContain('Ajouter un processus');
  });
});

describe('1.4 the sheet', () => {
  it('draws the six tabs and the identity of a process', () => {
    fresh();
    const html = sheet('P2', 'identity');
    ['Identité', 'Entrées et sorties', 'Ressources et remplaçants', 'Logigrammes', 'Indicateurs et risques', 'Revue'].forEach(t => expect(html).toContain(t));
    expect(html.match(/role="tab"/g)).toHaveLength(6);                                // six tabs, not eight
    expect(html).toContain('Laurent B.');
    expect(html).toContain('Réponse à une demande de prix sous un délai promis');
    expect(html).toContain('Notes de la direction');
  });
  it('draws the inputs, outputs, resources, flowcharts, indicators and review', () => {
    fresh();
    expect(sheet('P2', 'io')).toContain('Demande de prix');
    expect(sheet('P2', 'resources')).toContain('Logiciel de devis');
    const f = sheet('P2', 'flows');
    expect(f).toContain('Du devis à la commande'); expect(f).toContain('Traiter une réclamation client'); expect(f).toContain('Nouveau logigramme');
    expect(sheet('P2', 'indicators')).toContain('Cible');
    expect(sheet('P1', 'review')).toMatch(/Relue le .* par Jean-Marc/);
    expect(sheet('P2', 'review')).not.toContain('Supprimer le processus');
    expect(sheet('P2', 'identity')).toMatch(/Zone sensible.*Supprimer le processus « /);   // the deletion is in the identity tab, in a sensitive zone, named after the process
  });
  it('is read only for a person who is not its pilot, and says why', () => {
    const s = fresh(); s.params.map = { rights: { test: 'own' } };
    const html = sheet('P2', 'identity');
    expect(html).toContain('Seuls le pilote, son suppléant');
    expect(html).not.toContain('<fieldset disabled');                      // the fields are locked one by one: the chips that open the flowcharts stay usable
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*placeholder="Ce que l/);
    expect(sheet('P2', 'io')).toMatch(/<button type="button" class="rounded-full border border-sky-300[^>]*>/);
    expect(sheet('P2', 'io')).not.toMatch(/<button[^>]*disabled=""[^>]*border-sky-300/);
  });
  it('lets a deputy edit, and the team see only what the company shows', () => {
    const s = fresh(); s.params.map = { rights: { 'sophie v.': 'own', test: 'view' } };
    store.author = 'Sophie V.';
    expect(sheet('P2', 'identity')).not.toContain('Lecture seule');
    store.author = 'Test';
    expect(sheet('P2', 'identity')).not.toContain('Notes de la direction');
    expect(sheet('P2', 'indicators')).not.toContain('Cible');
    s.params.map.shown = ['notes', 'targets', 'risks'];
    expect(sheet('P2', 'identity')).toContain('Notes de la direction');
    expect(sheet('P2', 'indicators')).toContain('Cible');
  });
  it('says a process is gone instead of failing', () => { fresh(); expect(sheet('P99', 'identity')).toContain("n&#x27;existe plus"); });
});

describe('1.4 a flowchart', () => {
  it('draws the diagram with its lanes, and the steps as a list', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />);
    ['Commercial', 'Opérations', 'Direction'].forEach(l => expect(html).toContain(`>${l}<title>${l}</title></text>`));
    expect(html).toContain('<svg role="group"');
    expect(html).toContain('Marge suffisante ?');
    expect(html).toContain('Les étapes, dans l&#x27;ordre');
    expect(html).toContain('Marquer une version');
    expect(html).toContain('Légende');
    ['N°', 'Type', "Intitulé de l&#x27;étape", 'Qui la fait'].forEach(h => expect(html).toContain(h));   // the columns of the list are named
    expect(html).toContain('Comment lire ce schéma');
    expect(html).toContain('renvoie vers un autre logigramme');          // the sub-process is explained, with an example
    expect(html).toContain('autant qu&#x27;on veut');                    // so is the decision, with its free outcomes
    expect(html).toContain('Idéalement une seule chose par étape');       // and the action
    expect(html).toContain('Exemple : l&#x27;étape « Isoler la pièce et décider » renvoie vers');   // the sub-process example is a true one
    expect(html).toContain('Un retour en arrière');
    expect(html).toMatch(/Non →\s*(<!-- -->)?4/);   // the exits of a decision are said on its row
    expect(html).not.toContain('Points à corriger');         // this one is sound
  });
  it('draws the flowchart that calls another one: the sub-process says which, the three outcomes are named, the links are chips', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_6" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('↳ Parcours d&#x27;accueil de 15 jours');
    ['Retenu', 'À revoir', 'Refusé'].forEach(t => expect(html).toContain(t));
    expect(html).toMatch(/Étape 6 : il manque : instruction/);       // one amber mark on a step of work that lacks something; the detail is in the panel
    expect(panel('fl_demo_6', 'st_demo_6f')).toContain('Accueil et suivi des nouveaux arrivants');
    expect(html).toContain('role="link"');                                            // the bar of the sub-process block in the diagram is a link…
    expect(html).toContain('Ouvrir le logigramme Parcours d&#x27;accueil de 15 jours dans un nouvel onglet');   // …said as such to a screen reader
    expect(html).toContain('s&#x27;ouvre dans un nouvel onglet');
    expect(html).not.toContain('appelé depuis');
  });
  it('tells a sub-process flowchart which one calls it', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_7" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('appelé depuis');
    expect(html).toContain('Recruter et accueillir une personne');
  });
  it('lists what is wrong with the one that has a point to correct', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_4" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('Points à corriger');
    expect(html).toContain('que se passe-t-il si la réponse est non');
  });
  it('is read only without the right, and a missing flowchart is said', () => {
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    const html = draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('Lecture seule');
    expect(html).not.toContain('Marquer une version');
    expect(draw(<FlowEditor id="nope" nav={nav} onBack={noop} onOpenFlow={noop} />)).toContain("n&#x27;existe plus");
  });
});

describe('1.4 the review and the settings', () => {
  it('lists the sheets to review, the oldest first, and what blocks a one-click review', () => {
    fresh();
    const html = draw(<MapReview onBack={noop} onOpen={noop} />);
    expect(html).toContain('Jamais relue');
    expect(html).toContain('Marquer comme relue, rien à changer');
    expect(html.indexOf('P4')).toBeLessThan(html.indexOf('P5'));   // never reviewed comes before 420 days
  });
  it('draws the rights table and warns when only one person administers', () => {
    const s = fresh(); s.params.map = { rights: { 'jean-marc': 'admin' } };
    const html = draw(<MapSettings />);
    expect(html).toContain('Retirer le droit de Jean-Marc'); expect(html).toContain('Un seul administrateur');
    ['Cibles des indicateurs', 'Risques et Plans B', 'Notes de direction'].forEach(t => expect(html).toContain(t));
  });
});

describe('1.4 the reader, the guide, the tabs, the last process', () => {
  it('lets a reader open a flowchart from the sheet and the tools of its tabs, but gives no way to create one', () => {
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    const flows = sheet('P2', 'flows');
    expect(flows).not.toContain('<fieldset disabled');                      // the tab only reads: its buttons open the flowcharts
    expect(flows).toContain('Du devis à la commande');
    expect(flows).not.toContain('Nouveau logigramme');
    expect(sheet('P2', 'indicators')).not.toContain('<fieldset disabled');
    expect(sheet('P2', 'identity')).toMatch(/<input[^>]*disabled=""[^>]*placeholder="Ce que l/);   // the tabs that write stay locked, field by field
    expect(sheet('P2', 'resources')).toContain('Ouvrir l&#x27;annuaire');   // and the way to the directory is outside the locked part
    expect(sheet('P2', 'resources')).not.toMatch(/<fieldset disabled[^>]*>(?:(?!<\/fieldset>).)*Ouvrir l&#x27;annuaire/s);
  });
  it('draws the tabs as tabs, each with what is left to fill in', () => {
    fresh();
    const html = sheet('P4', 'identity');
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"/);
    expect(html).toMatch(/Entrées et sorties<span[^>]*>1<span class="sr-only"> à compléter/);
    expect(html).toContain('Chaque modification est enregistrée aussitôt');
  });
  it('says the sheet is read only because no name is set, and refuses the review without a name', () => {
    const s = fresh(); s.params.map = { rights: { test: 'own' } };
    store.author = '';
    expect(sheet('P2', 'review')).toContain('Aucun nom n&#x27;est renseigné');
    store.author = 'Test';
    const t = fresh(); t.params.map = undefined;
    store.author = '';
    expect(sheet('P1', 'review')).toContain('Renseignez votre nom dans les réglages');
    store.author = 'Test';
  });
  it('blocks the review of a sheet whose pilot is gone, with the reason written in red', () => {
    const s = fresh(); s.processes[0].pilotId = undefined; s.processes[0].reviewedAt = undefined;   // never reviewed: it is in the list to review
    expect(sheet('P1', 'review')).toMatch(/Bloque la relecture : (<!-- -->)?Pas de pilote/);
    expect(draw(<MapReview onBack={noop} onOpen={noop} />)).toContain('Bloque la relecture : Pas de pilote');
  });
  it('gives a new company a guide, and a reader a banner', () => {
    fresh(blankState('industrie', now));
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Par où commencer ?');
    expect(html).toContain('Chaque fiche est notée sur 9 points');
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).toContain('Vous consultez la carte');
  });
  it('names the processes a process exchanges with, not their codes', () => {
    fresh();
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toMatch(/Échange avec : [^<]*Commercial/);
    expect(html).not.toMatch(/Échange avec : [^<]*\bP\d\b/);
    expect(html).not.toContain('Lié à :');
  });
  it('does not fail for the versatility matrix when the map has no process left', () => {
    fresh(); store.state = { ...(store.state as State), processes: [] };
    registerProcesses([]);
    expect(draw(<Polyvalence nav={nav} focus="" clearFocus={noop} />)).toContain('Aucun processus dans la carte');
    registerProcesses((demoState(now)).processes);
  });
});

describe('1.4 with 4.1 and 4.2', () => {
  it('shows the key functions and the skills of a process on its sheet, with who holds them, and counts what is at risk on the tab', () => {
    fresh();
    const html = sheet('P3', 'cover');
    expect(html).toContain('Ressources et remplaçants');                                   // the key functions and the skills are in Resources now
    expect(html).toContain('Fonctions clés (outil 4.1)');
    expect(html).toContain('Programmation de la CNC 5 axes');
    expect(html).toContain('Programmation CNC 5 axes');
    expect(html).toContain('Homme-clé');
    expect(html).toContain('Autonomes : ');
    expect(html).toMatch(/Ressources et remplaçants<span[^>]*>\d+<span class="sr-only"> à compléter/);
    expect(sheet('P99' as never, 'cover')).toContain('n&#x27;existe plus');
  });
  it('says on the map card that a process has key persons and functions to cover', () => {
    fresh();
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toMatch(/\d+ hommes?-clés?/);
    expect(html).toMatch(/\d+ fonctions? clés? sans suppléant prêt/);
  });
  it('shows who can do a step, the steps at risk if somebody is missing, and the mark on the diagram', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('À risque si une personne manque');
    expect(html).toContain('une seule personne autonome : Marc M.');
    expect(html).toMatch(/étapes? à risque si une personne manque/);                  // one line, the detail is under it
    expect(html).toContain('À risque si une personne manque</button>');               // and the row says it
    const p = panel('fl_demo_3', 'st_demo_3m');
    expect(p).toContain('Programmation CNC 5 axes');                                  // the panel of the step names the skill and the key function
    expect(p).toContain('Programmation de la CNC 5 axes');
    expect(html).toContain('à risque si une personne manque');             // said on the block of the diagram too
    expect(html).toContain('Étape à risque');                                // and in the legend
    expect(draw(<FlowEditor id="fl_demo_8" nav={nav} onBack={noop} onOpenFlow={noop} />)).not.toContain('À risque si une personne manque');
  });
  it('offers skills and people as the role of a step, and names the lane after a person', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_6" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('<optgroup label="Compétences (outil 4.2)">');
    expect(html).toContain('<optgroup label="Personnes">');
    expect(html).toContain('>Jean-Marc<title>Jean-Marc</title></text>');      // the lane of the step whose role is a person
  });
  it('tells a skill or a function where it is used, with a way to open the flowchart', () => {
    fresh();
    const used = draw(<FlowUses tool="4.2" id="sk_demo_1" />);
    expect(used).toContain('Utilisé dans les logigrammes');
    expect(used).toContain('Fabriquer et livrer une commande · étape 3 « Usiner, plier et souder les pièces »');
    expect(draw(<FlowUses tool="4.1" id="pw_demo_2" />)).toContain('Du devis à la commande · étape 5');
    expect(draw(<FlowUses tool="4.2" id="sk_demo_16" />)).toContain('Aucun logigramme ne s&#x27;appuie encore sur cette compétence');
  });
});

describe('1.4 inputs, equipment, documents, indicators', () => {
  it('names the columns of the inputs and outputs', () => {
    fresh();
    const html = sheet('P1', 'io');
    ['Ce qui entre', 'De qui', 'Processus concerné', 'Ce qui sort', 'Pour qui'].forEach(t => expect(html).toContain(t));
    expect(html).toContain('sm:grid-cols-[2fr_1.5fr_1.5fr_auto]');
  });
  it('gathers the inputs and outputs of a process from its flowcharts, each with the flowchart it comes from', () => {
    fresh();
    const html = sheet('P2', 'io');
    ['Demande de prix', 'Du devis à la commande', 'Réclamation traitée', 'Traiter une réclamation client', 'Autres entrées (hors logigramme)', 'Autres sorties (hors logigramme)'].forEach(t => expect(html).toContain(t));
  });
  it('writes the sheet of a flowchart: purpose, result, inputs, outputs and requirements', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />);
    ['Fiche du logigramme', 'À quoi sert ce logigramme', 'Livrable ou résultat attendu', 'Ce qui entre dans ce logigramme', 'Ce qui sort de ce logigramme', 'Exigences applicables à ce logigramme', 'Demande de prix'].forEach(t => expect(html).toContain(t));
  });
  it('helps to fill the requirements: a list of common ones to pick from, on the sheet of the process and of the flowchart', () => {
    fresh();
    const html = sheet('P3', 'identity');
    expect(html).toContain('Ajouter une exigence courante');
    expect(html).toContain('Vérification périodique des équipements de travail');
    expect(draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />)).toContain('Ajouter une exigence courante');
  });
  it('draws the transverse band under the others, the flag on a requirement, and the processes that work together', () => {
    const st = fresh();
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).toContain('Transverse');
    st.processes.find(p => p.id === 'P1')!.requirements = [{ kind: 'legal', text: 'Protection des données personnelles', all: true }];
    expect(sheet('P1', 'identity')).toContain('Tous les processus');
    expect(sheet('P3', 'identity')).toContain('Tous les processus · écrit dans P1');
    st.flows.fl_demo_2.steps.push({ id: 'st_x', kind: 'subprocess', label: 'Analyser le défaut', role: 'Qualité', flowId: 'fl_demo_4' });
    expect(sheet('P5', 'flows')).toContain('Utilisé par d&#x27;autres processus');
    expect(sheet('P2', 'flows')).toContain('Fait appel à un logigramme d&#x27;un autre processus');
  });
  it('shows how many steps meet each requirement, and lets a step tick the requirements it meets', () => {
    fresh();
    expect(draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />)).toMatch(/2 étapes/);
    expect(draw(<FlowEditor id="fl_demo_15" nav={nav} onBack={noop} onOpenFlow={noop} />)).toContain('Aucune étape');
    const p = panel('fl_demo_1', 'st_demo_1d');
    expect(p).toContain('Exigences que cette étape respecte');
    expect(p).toContain('Marge minimale d’un devis');
    expect(sheet('P3', 'identity')).toContain('Aucune étape');
    expect(sheet('P2', 'identity')).toMatch(/\d étapes?/);
  });
  it('counts on the card of a process the requirements no step meets, and offers the all-processes tick only on the sheet of a process', () => {
    const st = fresh();
    const card = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(card).toMatch(/1 exigence sans étape/);
    st.processes.find(p => p.id === 'P1')!.requirements = [{ kind: 'legal', text: 'Protection des données personnelles' }];
    expect(sheet('P1', 'identity')).toContain('Tous les processus');
    expect(draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />)).not.toContain('Tous les processus');
  });
  it('tells when the sheet repeats what the flowcharts say, with a way to remove the repeats', () => {
    const st = fresh();
    expect(sheet('P2', 'io')).not.toContain('en double');
    st.processes.find(p => p.id === 'P2')!.inputs = [{ what: 'Demande de prix', party: 'Client' }];
    expect(sheet('P2', 'io')).toContain('est déjà écrite');
    expect(sheet('P2', 'io')).toContain('Retirer le doublon');
  });
  it('puts the indicators and the risks in the sheet of the flowchart, the ones linked by a step apart, and shows on the process sheet which flowchart uses each', () => {
    const st = fresh();
    const html = draw(<FlowEditor id="fl_demo_1" nav={nav} onBack={noop} onOpenFlow={noop} />);
    ['Indicateurs qui mesurent ce logigramme', 'Risques de ce logigramme', 'Rattacher un indicateur existant…', 'Créer depuis le logigramme', 'Liés par une étape'].forEach(t => expect(html).toContain(t));
    const ind = sheet('P2', 'indicators');
    expect(ind).toContain('Du devis à la commande');
    st.kpis.kpi_marge.processId = 'P2';
    expect(sheet('P2', 'indicators')).toContain('Du devis à la commande');
  });
  it('shows the equipment and documents a process uses through its flowcharts', () => {
    fresh();
    expect(sheet('P3', 'resources')).toContain('via');
  });
  it('lists only the equipment of the process, with a way to open it, remove it or add another', () => {
    fresh();
    const html = sheet('P3', 'resources');
    expect(html).toContain('Équipements de ce processus');
    expect(html).toContain('Centre d&#x27;usinage CNC 5 axes');
    expect(html).toContain('Ouvrir et modifier');
    expect(html).toContain('Ajouter un équipement…');
    expect(html).not.toContain('Compresseur d&#x27;air à vis 7,5 kW</span>');   // not the process's: it is only offered in the list to add
    expect(html).toMatch(/<option value="eq_demo_compresseur">/);
    expect(sheet('P2', 'resources')).toContain('Aucun équipement n&#x27;est rattaché à ce processus');
  });
  it('lets the documents and traces name the tools of the application', () => {
    fresh();
    const html = sheet('P2', 'resources');
    expect(html).toContain('Outils de l&#x27;application qui gardent des documents ou des traces');
    expect(html).toContain('2.1 · ');
    expect(html).toContain('Ajouter un outil de l&#x27;application');
  });
  it('lets a reader read the resources but not change them', () => {
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    const html = sheet('P3', 'resources');
    expect(html).toMatch(/aria-label="Ajouter un équipement à ce processus"[^>]*disabled|disabled=""[^>]*aria-label="Ajouter un équipement à ce processus"/);
    expect(html).toContain('Ouvrir et modifier');                               // the way to the tool stays
  });
  it('attaches indicators and risks that exist, with no menu to send one to another process', () => {
    fresh();
    const html = sheet('P2', 'indicators');
    expect(html).toContain('Rattacher un indicateur existant…');
    expect(html).toContain('(actuellement dans P1)');
    expect(html).not.toContain('Envoyer vers');
    expect(html).not.toContain('Reste dans');
    expect(html).toContain('Rattacher un risque existant…');
    expect(html).toContain('Créer ou gérer les risques (1.2)');
  });
});

describe('1.4 flowcharts linked to the other tools', () => {
  it('shows the links of the whole flowchart as chips, with a way to add some, and none are required', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('Ce logigramme s&#x27;appuie sur :');
    expect(html).toContain('3.3 Maintenance · Centre d&#x27;usinage CNC 5 axes');   // in the options, as text
    expect(html).toContain('Options du logigramme : lier le logigramme entier à d&#x27;autres outils (facultatif)');
    expect(html).toContain('Les fiches de ce processus sont proposées en premier');
    expect(html).not.toContain('+ Lier à un outil');                                  // one way to link only: the panel of the step
    const none = draw(<FlowEditor id="fl_demo_13" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(none).not.toContain('Ce logigramme s&#x27;appuie sur');            // no link: nothing to show, nothing missing
    expect(none).not.toContain('introuvable');
  });
  it('offers the records of the process first when a link is written', () => {
    const s = fresh(); s.flows.fl_demo_3.links = [{ tool: '3.3' }];
    const html = draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);   // the options hold the rows of the links
    expect(html).toContain('<optgroup label="De ce processus">');
    expect(html).toContain('<optgroup label="Des autres processus">');
  });
  it('says on the sheet of a process how many tools each flowchart is linked to', () => {
    fresh();
    expect(sheet('P3', 'flows')).toMatch(/S&#x27;appuie sur : \d\.\d/);   // the tools are named, not counted
    expect(sheet('P2', 'flows')).toMatch(/S&#x27;appuie sur : \d/);
  });
  it('tells an equipment, an instruction, an indicator or a risk which flowcharts rely on it, and stays silent when none does', () => {
    fresh();
    const eq = draw(<FlowUses quiet tool="3.3" id="eq_demo_cnc" />);
    expect(eq).toContain('Utilisé dans les logigrammes');
    expect(eq).toContain('Si cet équipement disparaît ou change');
    expect(eq).toContain('Fabriquer et livrer une commande · le logigramme entier');
    expect(eq).toContain('Surveiller et réparer un équipement · le logigramme entier');
    expect(draw(<FlowUses quiet tool="3.3" id="eq_demo_serveur" />)).toBe('');
    expect(draw(<FlowUses tool="3.3" id="eq_demo_serveur" />)).toContain('Aucun logigramme ne s&#x27;appuie encore sur cet équipement');
    expect(draw(<FlowUses quiet tool="2.1" id="x" />)).toBe('');                   // a tool without records has no sheet to speak of
  });
});

describe('1.4 choosing a link, the reverse links everywhere', () => {
  it('has no second way to link on the row: the six dots and the button that opens the step', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_2" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).not.toContain('+ Lier à un outil');
    expect(html).toContain('Ouvrir l&#x27;étape 2');
    expect(html).not.toContain('Instruction : oui');
    expect(html).toContain('est signalée en orange');
  });
  it('draws the picker: first the tool, then a record of the tool, then Add (nothing before a tool is chosen)', () => {
    fresh();
    const html = draw(<LinkPicker processId="P3" onAdd={noop} onCancel={noop} />);
    expect(html).toContain('1. Vers quel outil ?');
    expect(html).toContain('Choisir un outil…');
    expect(html).toContain('3.3 · Maintenance : Routine, armoire de survie et contrôles');
    expect(html).not.toContain('1.4 · ');                                       // not the map itself
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Ajouter le lien/);
    expect(html).not.toContain('2. Une fiche en particulier');                  // asked once the tool is chosen
  });
  it('says on the screen of a tool which flowcharts pass through it', () => {
    fresh();
    const html = draw(<ToolFlows tool="3.4" />);
    expect(html).toContain('Logigrammes qui passent par cet outil');
    expect(html).toContain('Faire réceptionner une livraison chez le client (entier)');
    expect(html).toMatch(/Fabriquer et livrer une commande \(étape \d\)/);      // by a step of that flowchart
    expect(draw(<ToolFlows tool="9.9" />)).toBe('');
  });
  it('tells a supplier, a contact, an equipment, an instruction, an indicator and a risk what relies on it', () => {
    const s = fresh(); const supId = Object.keys(s.suppliers)[0], ctId = Object.keys(s.contacts)[0];
    s.flows.fl_demo_14.steps[1].links = [...(s.flows.fl_demo_14.steps[1].links || []), { tool: '3.1', id: supId }, { tool: '1.3', id: ctId }];
    expect(draw(<FlowUses quiet tool="3.1" id={supId} />)).toContain('Si ce fournisseur disparaît ou change');
    expect(draw(<FlowUses quiet tool="1.3" id={ctId} />)).toContain('Si ce contact disparaît ou change');
    expect(draw(<FlowUses quiet tool="1.1" id="k_none" />)).toBe('');
  });
  it('shows the skills and key functions at work in the example: payroll, premises, backup with a lane that is a skill', () => {
    fresh();
    const pay = draw(<FlowEditor id="fl_demo_24" nav={nav} onBack={noop} onOpenFlow={noop} />);
    const p = panel('fl_demo_24', 'st_demo_24d');
    expect(p).toContain('Signature bancaire et virement des salaires');             // in the panel of the step, under « Plus »
    expect(panel('fl_demo_24', 'st_demo_24b')).toContain('Paie et virements');
    expect(pay).toContain('Ouvrir l&#x27;étape 4');
    const save = draw(<FlowEditor id="fl_demo_26" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(save).toContain('<title>Sauvegardes et accès informatiques</title></text>');   // the lane carries the name of the skill
    expect(draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />)).toContain('Usiner, plier et souder les pièces');
  });
});

describe('1.4 removing a link where it is shown', () => {
  it('puts a remove button on every link of a step (in its panel) and of the flowchart (in its options), for somebody who can edit', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('aria-label="Retirer le lien 1"');                                // the rows of the links of the flowchart
    expect(panel('fl_demo_3', 'st_demo_3m')).toMatch(/aria-label="Détacher Presse plieuse · Pliage des équerres de fixation de l&#x27;étape 3"/);
  });
  it('shows no remove button to a reader', () => {
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    expect(draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />)).not.toContain('Retirer le lien');
  });
});

describe('1.4 the flowchart as the starting point: support of a step, matrix', () => {
  const cell = (tool: string, links: { tool: string; id?: string }[], over: { readOnly?: boolean; compact?: boolean } = {}) => {
    const s = fresh(), f = s.flows.fl_demo_3, st = f.steps.find(x => x.id === 'st_demo_3m')!;
    return draw(<SupportCell def={SUPPORTS.find(d => d.tool === tool)!} links={links} onLinks={noop} flow={f} step={st} nav={nav} {...over} />);
  };
  it('lets a step attach a record that exists or create one from the step, and detach one without deleting it', () => {
    const html = cell('3.2', [{ tool: '3.2', id: 'sop_demo_2' }]);
    expect(html).toContain('Presse plieuse · Pliage des équerres de fixation');            // the linked instruction, by its name
    expect(html).toContain('Détacher Presse plieuse · Pliage des équerres de fixation de l&#x27;étape 3');
    expect(html).toContain('Rattacher une instruction existante…');
    expect(html).toContain('<optgroup label="De ce processus">');                         // the instructions of the process first
    expect(html).toContain('Créer une instruction depuis l&#x27;étape 3');
    expect(html).not.toContain('<option value="sop_demo_2"');                              // already attached: not offered again
  });
  it('offers the same for a skill, a key function, an equipment, a risk and an indicator', () => {
    ['4.2', '4.1', '3.3', '1.2', '1.1'].forEach(t => expect(cell(t, [])).toContain('depuis l&#x27;étape 3'));
    expect(cell('4.2', [])).toContain('Rattacher une compétence existante…');
    expect(cell('1.1', [])).toContain('Rattacher un indicateur existant…');
  });
  it('gives a reader the records to open and nothing to attach, create or detach', () => {
    const html = cell('3.2', [{ tool: '3.2', id: 'sop_demo_2' }], { readOnly: true });
    expect(html).toContain('Presse plieuse · Pliage des équerres de fixation');
    expect(html).not.toContain('Rattacher');
    expect(html).not.toContain('Créer');
    expect(html).not.toContain('Détacher');
  });
  it('shows, in a compact cell, only a plus to open the choices', () => {
    const html = cell('4.2', [], { compact: true });
    expect(html).toContain('Ajouter une compétence à l&#x27;étape 3');
    expect(html).not.toContain('Rattacher une compétence');
  });
  it('draws the matrix of a process in dots, three columns by default, with its holes and the records no flowchart uses', () => {
    fresh();
    const html = sheet('P3', 'matrix');
    ['Étape', 'Instruction', 'Compétence', 'Fonction clé', '(3.2)', '(4.2)', '(4.1)'].forEach(t => expect(html).toContain(t));
    ['Équipement', 'Risque', 'Indicateur'].forEach(t => expect(html).not.toMatch(new RegExp(`<th[^>]*>${t}`)));   // behind a button
    expect(html).toContain('Afficher équipement, risque, indicateur');
    expect(html).toContain('Fabriquer et livrer une commande');
    expect(html).toContain('Usiner, plier et souder les pièces');
    expect(html).toMatch(/\d+ sans instruction/);
    expect(html).toMatch(/\d+ cases? attendues? à remplir/);
    expect(html).toContain('Fiches non reliées à un logigramme');
    expect(html).toContain('Un point vert = il y a quelque chose');
    expect(html).toMatch(/aria-label="Instruction, étape 3 Usiner, plier et souder les pièces : Presse plieuse/);   // the dot says what is behind it
    expect(html).not.toContain('Ajouter une instruction à l&#x27;étape');                // no plus in every cell any more: the dot opens the cell
  });
  it('says what the matrix is when a process has no flowchart, and shows the tab with its count and the map with the empty cells', () => {
    const s = fresh(); Object.keys(s.flows).filter(k => s.flows[k].processId === 'P3').forEach(k => delete s.flows[k]);
    expect(sheet('P3', 'matrix')).toContain('Pas encore de matrice');
    fresh();
    expect(sheet('P3', 'flows')).toMatch(/Matrice : ce qu&#x27;il faut pour chaque étape<span[^>]*> \d+/);          // the count is on the switch between the list and the matrix
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).toMatch(/\d+ cases? vides? dans la matrice/);
  });
  it('shows a reader the matrix without any way to change it', () => {
    const s = fresh(); s.params.map = { rights: { test: 'view' } };
    const html = sheet('P3', 'matrix');
    expect(html).toContain('(3.2)');
    expect(html).not.toContain('Ajouter une instruction à l&#x27;étape');
    expect(html).not.toContain('Détacher');
  });
});

describe('1.4 the empty map and the lost flowcharts', () => {
  it('shows one empty block with a way to see a worked example, and tells a non-administrator whom to ask', () => {
    const s = fresh(); s.processes = []; s.flows = {};
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toContain('Voir un exemple traité');
    expect(html.match(/Aucun processus/g)).toHaveLength(1);                      // one block, not three "Aucun processus dans cette bande"
    expect(html).not.toContain('Aucun processus dans cette bande');
    s.params.map = { rights: { test: 'view', autre: 'admin' } };
    const ro = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(ro).toContain('Demandez à un administrateur de créer les processus.');
    expect(ro).not.toContain('Voir un exemple traité');
  });
  it('lists on the map the flowcharts whose process is gone', () => {
    const s = fresh(); s.flows.fl_demo_1.processId = 'P99';
    expect(draw(<Cartographie nav={nav} focus="" clearFocus={noop} />)).toMatch(/1 logigramme n.est rattaché à aucun processus de la carte/);
  });
});

describe('1.4 lot 4: desktop accessibility and UX', () => {
  it('folds the sheet of the flowchart with a line of counts, and draws the diagram before it', () => {
    fresh();
    const html = draw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toMatch(/<details[^>]*><summary[^>]*>(?:<svg.*?<\/svg>)?Fiche du logigramme[^<]*<span[^>]*>· [^<]*(exigence|entrée|indicateur|risque)/);
    expect(html).not.toMatch(/<details open=""[^>]*><summary[^>]*>(?:<svg.*?<\/svg>)?Fiche du logigramme/);
    expect(html.indexOf('<svg role="group"')).toBeLessThan(html.indexOf('Fiche du logigramme'));
  });
  it('keeps the texts of the diagram at 11 px and says what a link opens, in words, reachable by the keyboard', () => {
    fresh();
    const html = renderRaw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    const svg = html.slice(html.indexOf('<svg role="group"'), html.indexOf('</svg>', html.indexOf('<svg role="group"')));
    [...svg.matchAll(/font-size="([\d.]+)"/g)].forEach(m => expect(Number(m[1])).toBeGreaterThanOrEqual(11));
    expect(svg).toMatch(/role="link" tabindex="0" aria-label="Ouvrir \d\.\d · \d [^"]+ dans un nouvel onglet"/);
    expect(svg).toMatch(/↗ \d\.\d · \d [^<]+/);
    expect(svg).toMatch(/<\/g><g role="link"/);   // the link follows the button group, it is not inside it
  });
  it('adapts the placeholder to the kind of step, and gives the buttons that move a step an id for the focus', () => {
    fresh();
    const html = renderRaw(<FlowEditor id="fl_demo_3" nav={nav} onBack={noop} onOpenFlow={noop} />);
    expect(html).toContain('placeholder="Ce qui déclenche… · Entrée : étape suivante"');
    expect(html).toContain('placeholder="Résultat obtenu…"');
    expect(html).toMatch(/id="mv-[^"]+-up"/); expect(html).toMatch(/role="status" aria-live="polite" class="sr-only"/);
    expect(html).not.toMatch(/1 étapes/);
  });
  it('puts Faire, then what it takes, then the requirements and the notes folded, in plain-case titles', () => {
    const s = fresh(); const f = s.flows.fl_demo_3, st = f.steps.find(x => isWorkStep(x))!; delete st.doc; delete st.note; delete st.control; delete st.links;
    const html = panel('fl_demo_3', st.id);
    expect(html.indexOf('Faire')).toBeLessThan(html.indexOf('Ce qu&#x27;il faut pour la faire'));
    expect(html.indexOf('Ce qu&#x27;il faut pour la faire')).toBeLessThan(html.indexOf('Notes et options'));
    expect(html).not.toMatch(/uppercase|tracking-wide/);
    expect(html).toMatch(/<details[^>]*><summary[^>]*>(?:<svg.*?<\/svg>)?Notes et options/);
    expect(html).not.toMatch(/<details open=""[^>]*><summary[^>]*>(?:<svg.*?<\/svg>)?Notes et options/);
    expect(html).not.toContain('max-w-[16rem]');
  });
  it('gathers what is left to fill in one folded block whose lines lead to a tab, and never says all is well while cells are empty', () => {
    const s = fresh(); s.processes.find(p => p.id === 'P2')!.purpose = '';
    const html = sheet('P2', 'identity');
    expect(html).toMatch(/<details[^>]*><summary[^>]*>(?:<svg.*?<\/svg>)?\d+ points? à compléter/);
    expect(html).toContain('Onglet Identité →');
    expect(html).not.toContain('À compléter : ');
    expect(sheet('P2', 'identity')).toContain('role="tabpanel"');
    expect(html).toMatch(/aria-controls="sheet-panel"/);
  });
  it('shuts the empty sections of the resources tab, and names the process on its deletion button', () => {
    const s = fresh(); s.processes.find(p => p.id === 'P1')!.software = [];
    const html = sheet('P1', 'resources');
    expect(html).toContain('rien pour l&#x27;instant');
    expect(html).not.toMatch(/Retirer l'équipement[^>]*>.*>Supprimer/);
  });
  it('groups the rights by level with the hint of each level, adds one person at a time, and explains the tick boxes', () => {
    const s = fresh(); s.params.map = { rights: { 'jean-marc': 'admin' } };
    const html = draw(<MapSettings />);
    ['Administrer', 'Modifier ses processus', 'Consulter', 'Aucun accès'].forEach(t => expect(html).toContain(`<h4 class="text-xs font-bold text-slate-900">${t}</h4>`));
    ['Modifie tout, crée et supprime les processus', 'Voit la carte, les fiches', "Ne voit pas l'outil"].forEach(t => expect(html).toContain(t.replace("'", '&#x27;')));
    expect(html).toContain('Ajouter une personne au niveau Consulter'); expect(html).toContain('Coché = visible par l&#x27;équipe.');
    expect(html).not.toContain('Droit de Jean-Marc');
  });
  it('writes the review without opacity, names the settings once, and opens a sheet in a new tab with the words for it', () => {
    fresh(); store.author = '';
    const html = draw(<MapReview onBack={noop} onOpen={noop} nav={nav} />);
    expect(html.match(/Renseignez votre nom dans les réglages/g)?.length).toBe(1);
    expect(html).toContain('Ouvrir les réglages');
    expect(html).toContain('Ouvrir la fiche <svg'); expect(html).toContain('s&#x27;ouvre dans un nouvel onglet');
    expect(html).toMatch(/id="rev-ok-P\d"[^>]*disabled/);
    expect(html).toContain('disabled:bg-slate-200');
    expect(html).not.toMatch(/id="rev-ok-[^"]*"[^>]*disabled:opacity-50/);
  });
  it('says the marks of a card once and keeps the red for what blocks; the code badges read at 4.5:1', () => {
    const s = fresh();
    const html = draw(<Cartographie nav={nav} focus="" clearFocus={noop} />);
    expect(html).toMatch(/\d+ points? à traiter/);
    expect(html).not.toMatch(/dans la matrice<\/span><span/);   // no row of marks
    const white = (hex: string) => { const rgb = hex.match(/../g)!.map(x => parseInt(x, 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05); };
    ['#C5A065', '#047857', '#c2410c', '#F59E0B', '#0f766e'].forEach(c => expect(white(badgeBg(c).slice(1))).toBeGreaterThanOrEqual(4.5));
    expect(s.processes.length).toBeGreaterThan(0);
  });
  it('draws the matrix in the palette (green filled, amber missing), with row groups', () => {
    fresh();
    const html = sheet('P3', 'matrix');
    expect(html).not.toMatch(/sky-(600|700)/); expect(html).toContain('scope="rowgroup"'); expect(html).toContain('bg-delacour-primary');
  });
  it('counts the steps that use records of a tool, on the screen of that tool', () => {
    fresh();
    expect(draw(<ToolFlows tool="3.2" />)).toMatch(/\d+ étapes? utilis(e|ent) des fiches de cet outil/);
  });
  it('lets the tabs be walked with the arrows (panel id on the chips)', () => {
    fresh();
    const html = sheet('P2', 'identity');
    expect(html).toMatch(/role="tab"[^>]*id="sheet-panel-tab-identity"[^>]*tabindex="0"/); expect(html).toMatch(/id="sheet-panel-tab-io"[^>]*tabindex="-1"/);
  });
});
