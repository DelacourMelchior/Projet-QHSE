// Tool 3.2 "Instructions visuelles au poste": the right gesture and the trap in pictures, posted at the workstation, read and signed by the people allowed
// to work alone. A living standard: it changes after a defect at the workstation, a remark of the people who work there or a periodic review.
// Screen: summary, what is left to do, then the sheets as cards, a list, a "who can work where" grid or the plan of the workshop.
import { useEffect, useState } from 'react';
import { Plus, Printer, Search } from 'lucide-react';
import type { Sop } from '../../domain/types';
import { norm, sopInsights, sopPhase, sopSummary, urgency, type SopTab } from '../../domain/instructions';
import { applySopExample } from '../../domain/instructionsExamples';
import { sopCfg } from '../../domain/instructions';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, inputCls, Method, Modal, Summary, Tile, ToolHeader } from '../common';
import { usePrintOne } from '../PrintOne';
import type { ScreenProps } from '../screens';
import { SopCard, SopLine } from './SopCards';
import { SopMatrix } from './SopMatrix';
import { SopNew } from './SopNew';
import { SopPlan } from './SopPlan';
import { pageOf, SopPrint, SopPrintBatch, type PrintFormat } from './SopPrint';
import { SopQueue } from './SopQueue';
import { SopSettings } from './SopSettings';
import { SopSheet } from './SopSheet';
import { SopStation } from './SopStation';

type View = 'cards' | 'list' | 'matrix' | 'plan';
type Filter = 'all' | 'todo' | 'draft' | 'review' | 'archived';
const A4: PrintFormat = { size: 'A4', landscape: false };

export function Instructions({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<{ sop: Sop; tab?: SopTab } | null>(null);
  const [creating, setCreating] = useState<string | null>(null);   // the poste to start from, '' for none
  const [station, setStation] = useState('');
  const [view, setView] = useState<View>('cards'), [filter, setFilter] = useState<Filter>('all'), [group, setGroup] = useState(''), [q, setQ] = useState('');
  const [printNode, print] = usePrintOne();
  // a link opens a sheet, or the sheet full screen at the workstation (the QR code of the printed sheet: "station:" and its id)
  useEffect(() => {
    if (!focus || !state) return;
    if (focus.startsWith('station:')) setStation(focus.slice(8));
    else if (Object.hasOwn(state.sops, focus)) setOpen({ sop: state.sops[focus] });
    clearFocus();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const company = state.settings.companyName, all = Object.values(state.sops);
  const stationSop = station && Object.hasOwn(state.sops, station) ? state.sops[station] : undefined;
  const overlays = <>
    {open && <SopSheet key={open.sop.id} initial={open.sop} tab={open.tab} nav={nav} onClose={() => setOpen(null)} onCopy={c => setOpen({ sop: c })} />}
    {creating !== null && <SopNew firstPoste={creating} onClose={() => setCreating(null)} onStart={s => { setCreating(null); setOpen({ sop: s }); }} />}
    {stationSop && <SopStation sop={stationSop} nav={nav} onClose={() => setStation('')} />}
    {station && !stationSop && <Modal onClose={() => setStation('')} title="Instruction introuvable" footer={<Button onClick={() => setStation('')}>Fermer</Button>}><p className="text-xs text-slate-700">Cette instruction n'existe pas sur cet appareil. Elle a peut-être été supprimée, ou les données de l'entreprise ne sont pas encore chargées ici.</p></Modal>}
    {printNode}
  </>;
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Instructions visuelles : le bon geste affiché au poste" text="Photographier les gestes du meilleur opérateur, écrire avec lui des phrases courtes, afficher la fiche au poste avec son QR code. Chaque personne lit la fiche, et avant de travailler seule, passe le test en 3 questions.">
          <Button kind="primary" onClick={() => setCreating('')}><Plus size={14} />Nouvelle instruction</Button>
          <Button onClick={() => update(d => applySopExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {overlays}
      </div>
    );
  }
  const now = new Date(), sm = sopSummary(state, now), todos = sm.todos, min = sopCfg(state.params).minPeople, cfg = sopCfg(state.params);
  const withTodo = new Set(todos.map(t => t.sopId));
  const groups = [...new Set(all.map(x => x.group).filter(Boolean))].sort() as string[];
  const phase = (x: Sop) => sopPhase(x);
  const count = (f: Filter) => all.filter(x => (f === 'all' ? phase(x) !== 'archived' : f === 'todo' ? withTodo.has(x.id) : phase(x) === f)).length;
  const hay = (x: Sop) => norm([x.poste, x.operation, x.group, x.author, x.owner].join(' '));
  const shown = all.filter(x => (filter === 'all' ? phase(x) !== 'archived' : filter === 'todo' ? withTodo.has(x.id) : phase(x) === filter) && (!group || x.group === group) && (!q.trim() || hay(x).includes(norm(q))))
    .sort((a, b) => urgency(todos, b.id) - urgency(todos, a.id) || a.poste.localeCompare(b.poste));
  const toPost = todos.filter(t => t.kind === 'display').map(t => state.sops[t.sopId]).filter(Boolean);
  const inGroup = group ? all.filter(x => x.group === group && phase(x) === 'active') : [];
  const printMany = (xs: Sop[]) => print(<SopPrintBatch items={xs} company={company} state={state} format={A4} />, pageOf(A4));
  const openSheet = (sop: Sop, tab?: SopTab) => setOpen({ sop, tab });
  const insights = sopInsights(state, now);
  const card = (x: Sop) => <SopCard key={x.id} s={x} state={state} todos={todos} now={now} onOpen={() => openSheet(x)} onStation={() => setStation(x.id)} onPrint={() => print(<SopPrint s={x} company={company} state={state} format={A4} />, pageOf(A4))} />;

  return (
    <div className="space-y-4">
      <Summary title="Les bons gestes sont-ils affichés, lus et connus au poste ?" insights={insights} max={3} list tiles={<>
        <Tile title="Postes couverts" value={`${sm.live} / ${sm.live + sm.uncovered.length}`} sub={sm.uncovered.length ? `${sm.uncovered.length} cité(s) ailleurs sans instruction` : 'tous les postes cités ont une instruction'} tone={sm.uncovered.length ? 'warn' : sm.live ? 'ok' : undefined} />
        <Tile title="Fiches à jour" value={`${sm.upToDate} / ${sm.active}`} sub={sm.stale ? `${sm.stale} à mettre à jour` : sm.avgMonths !== null ? `âge moyen : ${sm.avgMonths} mois` : 'aucune en vigueur'} tone={sm.stale ? 'alert' : sm.upToDate < sm.active ? 'warn' : sm.active ? 'ok' : undefined} onClick={todos.length ? () => { setView('cards'); setFilter('todo'); } : undefined} active={filter === 'todo'} />
        <Tile title="Lecture de la version en vigueur" value={sm.readRate === null ? '—' : `${sm.readRate} %`} sub="« lu et compris » des personnes concernées" tone={sm.readRate !== null && sm.readRate < 100 ? 'warn' : sm.readRate === 100 ? 'ok' : undefined} />
        <Tile title={`Postes avec ${min} habilités ou plus`} value={`${sm.covered} / ${sm.active}`} sub="personnes autorisées à travailler seules" tone={sm.active && sm.covered < sm.active ? 'warn' : sm.active ? 'ok' : undefined} />
      </>} />

      <SopQueue state={state} todos={todos} onOpen={openSheet} />

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Instructions de poste" text="Une fiche par poste sensible, posée face à l'opérateur avec son QR code. Elle change dans les heures qui suivent un défaut au poste.">
          {toPost.length > 0 && <Button onClick={() => printMany(toPost)}><Printer size={14} />Imprimer les fiches à remplacer ({toPost.length})</Button>}
          {inGroup.length > 0 && <Button onClick={() => printMany(inGroup)}><Printer size={14} />Imprimer « {group} » ({inGroup.length})</Button>}
          <Button kind="primary" onClick={() => setCreating('')}><Plus size={14} />Nouvelle instruction</Button>
        </ToolHeader>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Chips value={view} onChange={setView} items={[['cards', 'Cartes'], ['list', 'Liste'], ['matrix', 'Qui sait quoi'], ...(cfg.plan ? [['plan', 'Plan'] as ['plan', string]] : [])]} />
          {(view === 'cards' || view === 'list') && (
            <>
              <Chips value={filter} onChange={setFilter} items={[['all', 'En cours', count('all')], ['todo', 'À traiter', count('todo')], ['draft', 'Brouillons', count('draft')], ['review', 'À valider', count('review')], ['archived', 'Archivées', count('archived')]]} />
              {groups.length > 0 && <select className={`${inputCls} !w-auto`} value={group} aria-label="Atelier, ligne ou zone" onChange={e => setGroup(e.target.value)}><option value="">Tous les ateliers</option>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select>}
              <label className="relative"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputCls} !w-48 !pl-7`} value={q} placeholder="Chercher un poste" aria-label="Chercher un poste" onChange={e => setQ(e.target.value)} /></label>
            </>
          )}
        </div>
        {sm.uncovered.length > 0 && (view === 'cards' || view === 'list') && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-700">Postes cités ailleurs, sans instruction</span>
            <div className="flex flex-wrap gap-1.5">
              {sm.uncovered.slice(0, 8).map(u => (
                <button key={u.name} type="button" onClick={() => setCreating(u.name)} title="Écrire l'instruction de ce poste" className="rounded-full border border-dashed border-slate-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-delacour-gold hover:bg-amber-50 max-sm:min-h-[44px]">
                  {u.name}<span className="font-normal text-slate-600"> · {u.ncs ? `${u.ncs} défaut(s)` : u.machine ? 'machine' : 'compétence'}</span>
                </button>
              ))}
              {sm.uncovered.length > 8 && <span className="self-center text-[11px] text-slate-500">et {sm.uncovered.length - 8} autre(s)</span>}
            </div>
          </div>
        )}
        {view === 'cards' && (shown.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{shown.map(card)}</div> : <p className="py-6 text-center text-xs text-slate-500">Aucune instruction pour ce filtre.</p>)}
        {view === 'list' && (shown.length ? <ul className="divide-y divide-slate-100">{shown.map(x => <SopLine key={x.id} s={x} state={state} todos={todos} now={now} onOpen={() => openSheet(x)} />)}</ul> : <p className="py-6 text-center text-xs text-slate-500">Aucune instruction pour ce filtre.</p>)}
        {view === 'matrix' && <SopMatrix state={state} />}
        {view === 'plan' && <SopPlan state={state} onOpen={x => openSheet(x)} />}
      </Card>

      <Method rule="Sans standard affiché, la qualité dépend de l'humeur et de la mémoire de chacun."
        steps={[['Observer le meilleur', 'Photographier les gestes du meilleur opérateur : le bon geste, le piège, la pièce bonne et la pièce à rebuter.'], ['Une fiche au poste, avec son QR code', 'Des phrases courtes, 80 % d\'images, un cadre de couleur différente à chaque version. Le QR code ouvre la dernière version en plein écran.'], ['Lire, habiliter, faire vivre', 'Chaque personne signe « lu et compris », passe le test en 3 questions avant de travailler seule, et la fiche change dès qu\'un défaut ou une remarque le demande.']]}
        tips={['Une photo avec une flèche verte et une croix rouge vaut mieux qu\'un paragraphe.', 'Standard vivant : un défaut au poste, un motif, une nouvelle version. La relecture annuelle vaut aussi version.', 'Une fiche peut se faire en quelques minutes avec le téléphone : « pas à pas avec des photos ».']} />
      <SopSettings />
      {overlays}
    </div>
  );
}
