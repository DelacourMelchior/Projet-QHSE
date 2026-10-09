// Tool 3.3 "Maintenance": each piece of equipment looked at on a short routine, a problem reported by anyone in seconds, stops and breakdowns noted with a touch,
// ONE common cabinet of critical spare parts, and the calendar of the periodic checks.
// Screen: summary (4 figures that say what the cards and the queue say), what is left to do, then the equipment as cards, a list, the cabinet, the checks or the plan.
import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Equipment, Spare } from '../../domain/types';
import { eqStatus, kindLabel, kindOf, txt, urgency } from '../../domain/maintenance';
import { maintInsights, maintMatcher, maintSummary, type MaintFilter } from '../../domain/maintenanceAll';
import { applyMaintenanceExample } from '../../domain/maintenanceExamples';
import { followedSpares } from '../../domain/maintenanceSpares';
import { norm } from '../../domain/instructions';
import { addMaintKpis, isMaintKpi } from '../../domain/maintenanceFeeds';
import { periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, inputCls, Method, Summary, Tile, ToolHeader, Modal } from '../common';
import { FeedBox } from '../Feed';
import { usePrintOne } from '../PrintOne';
import type { ScreenProps } from '../screens';
import { CabinetView } from './EqCabinet';
import { ChecksView } from './EqChecksView';
import { EqCard, EqLine, eqName, plural } from './EqCards';
import { onPhone, useUndo } from './EqBits';
import { EqNew } from './EqNew';
import { EqPlan } from './EqPlan';
import { EQ_PAGE, EqPrint } from './EqPrint';
import type { EqTab } from './EqProps';
import { EqQueue } from './EqQueue';
import { EqRoutine } from './EqRoutine';
import { ReportDialog } from './EqReport';
import { EqSettings } from './EqSettings';
import { EqSheet } from './EqSheet';
import { SpareSheet } from './EqSpareSheet';

type View = 'cards' | 'list' | 'cabinet' | 'checks' | 'plan';
type Filter = MaintFilter;
const PAGE = 24;
const TABS: EqTab[] = ['routine', 'issues', 'cabinet', 'checks', 'sheet'];

export function Maintenance({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<{ eq: Equipment; tab?: EqTab } | null>(null);
  const [creating, setCreating] = useState(false);
  const [station, setStation] = useState(''), [report, setReport] = useState(''), [spareId, setSpareId] = useState('');
  const [fresh, setFresh] = useState<Spare | null>(null);   // a new part lives in its window until it has a name or a reference
  const seen = useRef<Spare>(undefined);   // the part as last seen: a window opened on it stays when the record is deleted elsewhere (it says so, see SpareSheet)
  const [missing, setMissing] = useState<'' | 'equipment' | 'spare'>('');   // an address that names nothing (an old link, a deleted record, a trapped id)
  // under 640 px the list is the default view (a card is too tall for a phone), and the messages and the queue are folded: the equipment comes first
  const [view, setView] = useState<View>(() => (onPhone() ? 'list' : 'cards'));
  const [filter, setFilter] = useState<Filter>('service'), [group, setGroup] = useState(''), [q, setQ] = useState(''), [limit, setLimit] = useState(PAGE);
  const [printNode, print] = usePrintOne();
  const { bar, offer } = useUndo();
  // "Réglages de cet outil" is a closed panel at the bottom of the screen: open it and bring it into view
  function openSettings() {
    const el = document.getElementById('reglages-3-3'), d = el instanceof HTMLDetailsElement ? el : el?.querySelector('details');
    if (d) d.open = true;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // a link opens a sheet (on a tab), the routine full screen (the QR code stuck on the equipment), the report of a problem or a part, the cabinet, the settings of the
  // tool, the Plan B of a stop; the id comes from the address: only an id the data really holds is used (never "__proto__", "constructor", "toString"), any other opens
  // one window that says so
  useEffect(() => {
    if (!focus || !state) return;
    const eqs = state.equipments, has = (id: string) => Object.hasOwn(eqs, id);
    if (focus === 'cabinet') setView('cabinet');
    else if (focus === 'settings') openSettings();
    else if (focus.startsWith('risk:')) { const id = focus.slice(5); if (Object.hasOwn(state.risks, id)) nav.openRisk(id, 2); }
    else if (focus.startsWith('station:')) { const id = focus.slice(8); if (has(id)) setStation(id); else setMissing('equipment'); }
    else if (focus.startsWith('report:')) { const id = focus.slice(7); if (has(id)) setReport(id); else setMissing('equipment'); }
    else if (focus.startsWith('spare:')) { const id = focus.slice(6); if (Object.hasOwn(state.spares, id)) setSpareId(id); else setMissing('spare'); }
    else {
      const [id, tab] = focus.split(':');
      if (has(id)) setOpen({ eq: eqs[id], tab: TABS.find(t => t === tab) }); else setMissing('equipment');
    }
    clearFocus();
  }, [focus, !!state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const company = state.settings.companyName, all = Object.values(state.equipments);
  const eqOf = (id: string) => (id && Object.hasOwn(state.equipments, id) ? state.equipments[id] : undefined);
  const stationEq = eqOf(station), reportEq = eqOf(report);
  const found = spareId && Object.hasOwn(state.spares, spareId) ? state.spares[spareId] : undefined;
  if (found) seen.current = found;
  const spare = found ?? (spareId && seen.current?.id === spareId ? seen.current : undefined) ?? fresh ?? undefined;
  const lost = !!missing || (station && !stationEq) || (report && !reportEq);
  const closeLost = () => { setStation(''); setReport(''); setMissing(''); };
  const printEq = (e: Equipment) => print(<EqPrint e={e} company={company} state={state} />, EQ_PAGE);
  const openEq = (id: string, tab?: EqTab) => { const eq = eqOf(id); if (eq) setOpen({ eq, tab }); };
  const overlays = <>
    {open && <EqSheet key={open.eq.id} initial={open.eq} tab={open.tab} nav={nav} onClose={() => setOpen(null)} onCopy={(c: Equipment) => setOpen({ eq: c })} offerBack={offer} />}
    {creating && <EqNew onClose={() => setCreating(false)} onStart={(e: Equipment) => { setCreating(false); setOpen({ eq: e }); }} />}
    {stationEq && <EqRoutine eq={stationEq} nav={nav} onClose={() => setStation('')} />}
    {reportEq && <ReportDialog eq={reportEq} nav={nav} onClose={() => setReport('')} />}
    {lost && <Modal onClose={closeLost} title={missing === 'spare' ? 'Pièce introuvable' : 'Équipement introuvable'} footer={<Button onClick={closeLost}>Fermer</Button>}><p className="text-xs text-slate-700">{missing === 'spare' ? 'Cette pièce' : 'Cet équipement'} n'existe pas sur cet appareil. {missing === 'spare' ? 'Elle a' : 'Il a'} peut-être été supprimé{missing === 'spare' ? 'e' : ''}, ou les données de l'entreprise ne sont pas encore chargées ici.</p></Modal>}
    {spare && <SpareSheet key={spare.id} initial={spare} nav={nav} offerBack={offer} onClose={() => { setSpareId(''); setFresh(null); }} />}
    {printNode}{bar}
  </>;
  if (!all.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="sr-only">Maintenance</h1>
          <Empty title="Maintenance : une routine courte au pied de chaque équipement, et des pièces prêtes quand il en faut" text="Pour chaque équipement important : quelques points à regarder à chaque routine, avec la photo de ce qui est normal, un QR code collé dessus, les pannes notées d'un toucher, une armoire commune des pièces critiques et le calendrier des contrôles.">
            <Button kind="primary" onClick={() => setCreating(true)}><Plus size={14} />Nouvel équipement</Button>
            <Button onClick={() => update(d => applyMaintenanceExample(d))}>Voir un exemple traité</Button>
          </Empty>
        </div>
        {overlays}
      </div>
    );
  }

  const now = new Date(), sm = maintSummary(state, now), todos = sm.todos, insights = maintInsights(state, now, todos);
  const toDo = sm.routineTotal - sm.routineDone, cabinet = followedSpares(state).length, hasChecks = all.some(e => e.tasks?.length);
  const match = maintMatcher(state, todos);   // the same definition counts the chips and fills the list
  const count = (f: Filter) => all.filter(e => match(f, e)).length;
  const groups = [...new Set(all.map(e => e.group?.trim()).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'fr')) as string[];
  const hay = (e: Equipment) => norm([e.name, kindLabel(kindOf(e)), e.group, e.location, e.maker, e.model, e.serial, e.operator, txt(e.deputy), e.manager].join(' '));
  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = all.filter(e => match(filter, e) && (!group || e.group?.trim() === group) && words.every(w => hay(e).includes(w)))
    .sort((a, b) => Number(eqStatus(a) === 'retired') - Number(eqStatus(b) === 'retired') || urgency(todos, b.id) - urgency(todos, a.id) || eqName(a).localeCompare(eqName(b), 'fr'));
  const listed = shown.slice(0, limit);
  const pick = (f: Filter) => { setFilter(f); setLimit(PAGE); };
  const go = (f: Filter) => { setView(v => (v === 'list' ? v : 'cards')); pick(f); };
  const filters: [Filter, string, number][] = [['service', 'Suivis', count('service')], ['todo', 'Routine à faire', count('todo')], ['stopped', "À l'arrêt", count('stopped')], ['anomalies', 'Avec anomalie', count('anomalies')], ['spares', 'Avec pièce courte', count('spares')], ['checks', 'Avec contrôle à suivre', count('checks')], ['retired', 'Retirés', count('retired')]];
  const card = (e: Equipment) => <EqCard key={e.id} e={e} state={state} todos={todos} now={now} onOpen={() => openEq(e.id)} onRoutine={() => setStation(e.id)} onPrint={() => printEq(e)} onReport={() => setReport(e.id)} />;
  const line = (e: Equipment) => <EqLine key={e.id} e={e} state={state} todos={todos} now={now} onOpen={() => openEq(e.id)} onRoutine={() => setStation(e.id)} onPrint={() => printEq(e)} onReport={() => setReport(e.id)} />;
  const sheets = view === 'cards' || view === 'list';
  const plan = !!state.params.sop?.plan;

  return (
    <div className="space-y-4">
      <div>
      <h1 className="sr-only">Maintenance</h1>
      <Summary title="Les équipements sont-ils surveillés et l'armoire est-elle prête ?" insights={[]} tiles={<>
        <Tile title="Routines à jour" value={`${sm.routineDone} / ${sm.routineTotal}`} sub={`${toDo ? plural(toDo, 'routine à faire ou en retard', 'routines à faire ou en retard') : sm.routineTotal ? 'toutes faites pour leur période' : 'aucun équipement en service'}${sm.stopped ? ` (${plural(sm.stopped, "équipement à l'arrêt ne compte pas", "équipements à l'arrêt ne comptent pas")})` : ''}`}
          tone={toDo ? 'warn' : sm.routineTotal ? 'ok' : undefined} onClick={toDo ? () => go('todo') : undefined} active={sheets && filter === 'todo'} />
        <Tile title="Anomalies ouvertes" value={String(sm.anomalies)} sub={[sm.dangers ? `dont ${plural(sm.dangers, 'danger')}` : '', sm.stopped ? `${plural(sm.stopped, 'équipement')} à l'arrêt` : 'aucun équipement à l\'arrêt'].filter(Boolean).join(', ')}
          tone={sm.dangers || sm.stopped ? 'alert' : sm.anomalies ? 'warn' : sm.equipments ? 'ok' : undefined} onClick={sm.anomalies ? () => go('anomalies') : sm.stopped ? () => go('stopped') : undefined} active={sheets && (filter === 'anomalies' || filter === 'stopped')} />
        <Tile title="Pièces sous le mini ou en rupture" value={String(sm.sparesLow + sm.sparesOut)} sub={sm.sparesOut ? `dont ${sm.sparesOut} en rupture` : cabinet ? 'pièces critiques, aucune en rupture' : 'armoire sans pièce'}
          tone={sm.sparesOut ? 'alert' : sm.sparesLow ? 'warn' : cabinet ? 'ok' : undefined} onClick={sm.sparesLow + sm.sparesOut ? () => go('spares') : undefined} active={sheets && filter === 'spares'} />
        <Tile title="Contrôles échus" value={String(sm.checksLate)} sub={[sm.checksLateLegal ? `dont ${plural(sm.checksLateLegal, 'obligatoire')}` : '', sm.checksSoon ? `${plural(sm.checksSoon, 'contrôle')} à planifier ou planifié${sm.checksSoon > 1 ? 's' : ''}` : '', sm.checksNoDate ? `${plural(sm.checksNoDate, 'contrôle')} sans date` : ''].filter(Boolean).join(', ') || (hasChecks ? 'aucun à planifier' : 'aucun contrôle suivi')}
          tone={sm.checksLateLegal ? 'alert' : sm.checksLate || sm.checksSoon || sm.checksNoDate ? 'warn' : hasChecks ? 'ok' : undefined} onClick={sm.checksLate || sm.checksSoon ? () => go('checks') : undefined} active={sheets && filter === 'checks'} />
      </>} />
      </div>

      <EqQueue state={state} todos={todos} insights={insights} nav={nav} offer={offer} onEq={(id, tab) => openEq(id, tab)} onRoutine={setStation} onSpare={setSpareId} onSettings={openSettings} />

      <Card className="space-y-3 p-3 sm:p-4">
        {view !== 'cabinet' && (   // the cabinet has its own title: no title inside a title
          <ToolHeader title="Équipements" text="Une fiche par équipement : routine, anomalies et pannes, pièces et contrôles. Le QR code collé sur l'équipement ouvre sa routine en plein écran.">
            <Button kind="primary" onClick={() => setCreating(true)}><Plus size={14} />Nouvel équipement</Button>
          </ToolHeader>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Chips value={view} onChange={setView} items={[['cards', 'Cartes'], ['list', 'Liste'], ['cabinet', 'Armoire'], ['checks', 'Contrôles'], ...(plan ? [['plan', 'Plan'] as ['plan', string]] : [])]} />
          {sheets && (
            <>
              {/* one list for the filter at every width: seven pills made a wall; the tiles above already filter */}
              <select className={`${inputCls} !w-auto`} value={filter} aria-label="Afficher" onChange={e => pick(e.target.value as Filter)}>{filters.map(([k, l, n]) => <option key={k} value={k}>{l} {n}</option>)}</select>
              {groups.length > 0 && <select className={`${inputCls} !w-auto`} value={group} aria-label="Groupe" onChange={e => { setGroup(e.target.value); setLimit(PAGE); }}><option value="">Tous les groupes</option>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select>}
              <label className="relative"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputCls} !w-48 !pl-7`} value={q} placeholder="Chercher un équipement" aria-label="Chercher un équipement" onChange={e => { setQ(e.target.value); setLimit(PAGE); }}
            onKeyDown={e => { if (e.key === 'Enter' && shown.length === 1) { e.preventDefault(); openEq(shown[0].id); } }} /></label>
            </>
          )}
        </div>
        {sheets && (shown.length
          ? <>
            {view === 'cards' ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{listed.map(card)}</div> : <ul className="divide-y divide-slate-100">{listed.map(line)}</ul>}
            {shown.length > limit && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <span className="text-[11px] text-slate-500">{listed.length} équipements affichés sur {shown.length}</span>
                <Button onClick={() => setLimit(limit + PAGE)}>Afficher {Math.min(PAGE, shown.length - limit)} de plus</Button>
              </div>
            )}
          </>
          : <p className="py-6 text-center text-xs text-slate-500">Aucun équipement pour ce filtre.</p>)}
        {view === 'cabinet' && <CabinetView state={state} onOpen={setSpareId} onNew={setFresh} />}
        {view === 'checks' && <ChecksView state={state} onOpen={(id: string, tab: EqTab) => openEq(id, tab)} />}
        {view === 'plan' && <EqPlan state={state} todos={todos} onOpen={e => openEq(e.id)} />}
      </Card>

      {Object.values(state.kpis).some(isMaintKpi)
        ? <FeedBox tool="3.3" period={periodOfDate(new Date())} />
        : <Card className="flex flex-wrap items-center gap-2 p-3 text-[11px] text-slate-700 sm:p-4">Suivre ces chiffres chaque mois dans le tableau de pilotage (1.1) : routines faites, anomalies anciennes, heures d'arrêt, contrôles à jour, pièces au stock mini. Les valeurs sont proposées, jamais écrites sans accord.<Button className="!px-2 !py-1" onClick={() => update(d => { addMaintKpis(d); })}>Ajouter au tableau de pilotage</Button></Card>}

      <Method rule="Un équipement regardé quelques minutes à chaque période tombe moins souvent en panne, et une panne dure moins quand la pièce est déjà là."
        steps={[['Une routine courte, au pied de l\'équipement', 'Quelques points à regarder, écouter, sentir ou mesurer, avec la photo de ce qui est normal. Le QR code collé sur l\'équipement ouvre la routine en plein écran, un point par écran.'], ['Une anomalie notée dès qu\'on la voit', 'Chacun peut signaler un problème en quelques secondes. Un point « à surveiller » deux routines de suite devient une anomalie ; elle se ferme quand le point est de nouveau en ordre.'], ['Une armoire commune et un calendrier', 'Les pièces critiques sont comptées une seule fois pour toute l\'entreprise, avec leur mini et leur délai. Chaque contrôle périodique garde son historique et son rapport.']]}
        tips={['Ce qui est tapé une fois (points, personnes, périodicités) reste ; les gestes du terrain sont enregistrés à l\'instant.', 'Un équipement qui a un historique se retire du service plutôt que de se supprimer.']} />
      <EqSettings />
      {overlays}
    </div>
  );
}
