// Tool 3.4 "Réceptions": a check at each milestone of an order, a release by a named person, the acceptance report (PV) signed on the spot, the reservations lifted
// within the agreed delay, deliveries in several times. Screen: summary (4 facts), what is left to do, the won quotes that no order follows, then the orders as cards,
// a list or by customer, the proposals for the dashboard (1.1), the method and the settings. A link opens a sheet (on a tab), the checks or the reception full screen
// (the two QR codes of the traveller sheet, `jalon:` and `reception:`: the token stays in the address while it is open), or a new order. No amount is read or shown anywhere.
// On a phone the screen is short: the figures on one line, the queue before the list, no message that a task already says, the settings closed at the bottom.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import type { Delivery, Quote, ReceptionTodoKind, State } from '../../domain/types';
import { nb, nowLocal } from '../../domain/base';
import { orgKey } from '../../domain/contacts';
import { norm } from '../../domain/text';
import { archiveDelivery, deletable, duplicateDelivery, lostByDeleting, plural, receptionsOf, restoreDelivery, type RcTab } from '../../domain/receptions';
import { quotesWithoutOrder } from '../../domain/receptionsAll';
import { clientsOf, countBy, FILTER_KEYS, listOf, matching, parseFocus, registerOf, type Filter } from '../../domain/rcLogic';
import { applyReceptionExample, modifiedReceptionExamples, removeReceptionExample } from '../../domain/receptionsExamples';
import { addReceptionKpis, isReceptionKpi } from '../../domain/receptionsFeeds';
import { isoDate, periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, NewTab, ToolHeader } from '../common';
import { FeedBox } from '../Feed';
import { usePrintOne } from '../PrintOne';
import type { ScreenProps } from '../screens';
import { orderName, RcOrder, type RcAct, type RcCtl } from './RcCards';
import { fmtMoment, followedText, RcFindings, RcTile, TOUCH16, useRcAct } from './RcBits';
import { TOUCH, useUndo } from './rcShared';
import { RcMilestone } from './RcMilestone';
import { RcNew } from './RcNew';
import { ProofPrint, RC_PAGE, TravellerPrint } from './RcPrint';
import { PvPrint, pvPrintLabel } from './RcPv';
import { RcQueue } from './RcQueue';
import { RcReception } from './RcReception';
import { RcSettings } from './RcSettings';
import { RcSheet } from './RcSheet';

type View = 'cards' | 'list' | 'clients';
const PAGE = 24, NONE: never[] = [];
const FIELD = `${inputCls} ${TOUCH16}`;
// the pills are 44 px high on a touch screen; the filters go on to the next line when they do not fit (a row that scrolls hides two of the five)
const PILLS = '[@media(pointer:coarse)]:[&_button]:min-h-[44px]';
const VIEW_LABEL: Record<View, string> = { cards: 'Cartes', list: 'Liste', clients: 'Par client' };
// "À libérer ou à livrer" is said the same way by the tile and by the filter (the filter holds the orders to release, released and delivered in part)
const FILTER_LABEL: Record<Filter, string> = { running: 'En cours', toship: 'À libérer ou à livrer', reserves: 'Réserves', received: 'Réceptionnées', archived: 'Archivées' };
// A message of the summary that the queue already says as tasks (the same facts, the same orders) is left out: the queue is the one place where it is told
const IN_QUEUE: Record<string, ReceptionTodoKind> = { 'seal-modified': 'seal', blocked: 'blocked', 'late-delivery': 'late-delivery', 'reserve-late': 'reserve-late', refused: 'refused', unsigned: 'unsigned', rest: 'next-lot' };
// under 640 px the list is the default view: a card is too tall for a phone
const defaultView = (): View => { try { return window.matchMedia('(max-width: 639px)').matches ? 'list' : 'cards'; } catch { return 'cards'; } };

export function Receptions({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, teamView } = useStore();
  const [open, setOpen] = useState<{ d: Delivery; tab?: RcTab; reserve?: string } | null>(null);
  const [creating, setCreating] = useState<{ quoteId?: string } | null>(null);
  const [full, setFull] = useState<{ kind: 'jalon' | 'reception'; id: string } | null>(null);
  const [lost, setLost] = useState(false), [archiving, setArchiving] = useState<Delivery | null>(null), [moreQuotes, setMoreQuotes] = useState(false), [dropEx, setDropEx] = useState(false), [viewOpen, setViewOpen] = useState(false);
  const [view, setView] = useState<View>(defaultView), [filter, setFilter] = useState<Filter>('running');
  const [client, setClient] = useState<{ key: string; name: string } | null>(null), [q, setQ] = useState(''), [limit, setLimit] = useState(PAGE);
  const [printNode, print] = usePrintOne();
  const { bar, offer } = useUndo();
  const act = useRcAct();
  // What the register shows is computed ONCE per state and per day (`registerOf`): a key of the search, a click on a filter or a page more only read it. While a full screen covers the register it
  // keeps the state it showed (nothing behind it is drawn again at each gesture), and is drawn again from the state at the closing.
  const day = isoDate(new Date()), now = useMemo(() => new Date(), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const held = useRef(state);
  if (!full) held.current = state;
  const rs = held.current, reg = useMemo(() => (rs ? registerOf(rs, now) : null), [rs, now]);
  const words = norm(q).split(/\s+/).filter(Boolean), wkey = words.join(' ');
  const total = useMemo(() => (reg ? countBy(reg) : null), [reg]), count = useMemo(() => (reg ? countBy(reg, client?.key) : null), [reg, client]);
  const shown = useMemo(() => (reg ? listOf(reg, filter, client?.key, words) : []), [reg, filter, client, wkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const clients = useMemo(() => (reg && view === 'clients' ? clientsOf(reg) : []), [reg, view]);
  const qs = useMemo(() => (rs ? quotesWithoutOrder(rs, now) : []), [rs, now]);   // won quotes that no order follows (the last 12 months, the ones set aside left out)
  const findings = useMemo(() => (reg ? reg.sm.insights.filter(i => !reg.sm.todos.some(t => t.kind === IN_QUEUE[i.key])) : []), [reg]);
  const live = useRef({} as RcCtl), ctl = useMemo<RcCtl>(() => ({ go: f => live.current.go(f), open: d => live.current.open(d), print: d => live.current.print(d), menu: d => live.current.menu(d) }), []);

  // a link, a QR code or a tap of the queue: `jalon:<id>` the checks full screen, `reception:<id>` the reception full screen, `<id>[:tab[:reservation]]` the sheet (on a reservation
  // when it is given), a new order (from a quote or not): what the address asks is read by `parseFocus`
  const go = (f: string) => {
    const t = parseFocus(f);
    if (t.kind === 'new') setCreating({});
    else if (t.kind === 'client') openClient(orgKey(t.name), t.name);   // the filter that holds the orders of this customer, never an empty "En cours"
    else if (t.kind === 'quote') {
      // an address kept or used twice never makes a second order for the same quote: the order that exists opens
      const have = state && Object.values(state.deliveries).find(x => x.quoteId === t.quoteId);
      if (have) { setFull(null); setOpen({ d: have }); } else setCreating({ quoteId: t.quoteId });
    } else if (t.kind === 'field') {
      setOpen(null);   // a sheet never stays open under a full screen (it would hide it, and its typed copy would overwrite what the full screen writes)
      setFull({ kind: t.field, id: t.id });
      // the token stays in the address while the screen is open, so a refresh opens it again
      try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${window.location.hash.split('~')[0]}~${encodeURIComponent(f)}`); } catch { /* the address stays as it is */ }
    } else {
      const d = state && Object.hasOwn(state.deliveries, t.id) ? state.deliveries[t.id] : undefined;   // an address is never a key without hasOwn
      if (d) { setFull(null); setOpen({ d, tab: t.tab, reserve: t.reserve }); } else setLost(true);
    }
  };
  useEffect(() => {
    if (!focus || !state) return;
    go(focus);
    if (!/^(jalon|reception):/.test(focus)) clearFocus();
  }, [focus, !!state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state || !reg || !total || !count) return null;

  const sm = reg.sm, todos = sm.todos, all = reg.all, runBlocked = [...reg.st.values()].filter(x => x === 'blocked').length;   // the sub-line counts what the filter holds
  const listed = shown.slice(0, limit), sheets = view !== 'clients', p = state.params;
  // nothing found: the fact, and where else the search finds something (an order is in several filters: the number of a PV is often in "Réceptionnées" while "En cours" is open)
  const noneText = () => {
    if (!words.length) return 'Aucune commande pour ce filtre.';
    const elsewhere = FILTER_KEYS.filter(f => f !== filter).map(f => [f, matching(reg, f, client?.key, words).length] as const).filter(([, n]) => n);
    return nb(`Aucune commande ne contient «\u202f${q.trim()}\u202f» dans ce filtre.${elsewhere.length ? ` ${elsewhere.map(([f, n]) => `${n} dans «\u202f${FILTER_LABEL[f]}\u202f»`).join(', ')}.` : ''}`);
  };
  const go2 = (f: Filter) => { setView(v => (v === 'clients' ? defaultView() : v)); setFilter(f); setClient(null); setLimit(PAGE); };
  // a tile that filters the list: when the list sits low on the screen the page goes to it (under the sticky header: `scroll-mt` of the card)
  const tile = (f: Filter) => () => {
    go2(f);
    requestAnimationFrame(() => {
      const el = document.getElementById('rc-list');
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  };
  function openClient(key: string, name: string) {
    setClient({ key, name }); setView(v => (v === 'clients' ? defaultView() : v)); setLimit(PAGE); setQ('');
    const n = reg ? countBy(reg, key) : null;
    setFilter(n ? FILTER_KEYS.find(f => n[f] > 0) ?? 'running' : 'running');
  }

  // the moves of one order: print the traveller sheet, copy, archive, restore, delete (only when nothing is lost, with "Annuler")
  const printOrder = (d: Delivery) => print(<TravellerPrint d={d} state={state} />, RC_PAGE);
  const remove = (d: Delivery) => { update(s => { delete s.deliveries[d.id]; }); offer(`Commande retirée\u202f: ${orderName(d)}`, () => update(s => { s.deliveries[d.id] = d; })); };
  const archive = (d: Delivery, note: string) => {
    act(d.id, (x, by) => archiveDelivery(x, nowLocal(), note, by)); setArchiving(null);
    offer(`Commande archivée\u202f: ${orderName(d)}`, () => act(d.id, (x, by) => restoreDelivery(x, by)));
  };
  // the example: its orders and the defects of the example linked to them leave; "Annuler" brings back exactly what left
  const removeExample = () => {
    let gone: ReturnType<typeof takeExample> | undefined;
    update(s => { gone = takeExample(s); });
    setDropEx(false);
    offer('Exemple retiré', () => update(s => { const g = gone!; Object.assign(s.deliveries, g.d); Object.assign(s.ncs, g.n); s.orgs = { ...s.orgs, ...g.o }; s.contacts = { ...s.contacts, ...g.c }; if (g.r) s.params.reception = g.r; }));
  };
  const menuOf = (d: Delivery): RcAct[] => [
    ...(pvPrintLabel(d) ? [{ label: pvPrintLabel(d), run: () => print(<PvPrint d={d} state={state} />, RC_PAGE) }] : []),
    ...(receptionsOf(d).some(x => x.reception.result) ? [{ label: 'Imprimer le dossier de preuve', run: () => print(<ProofPrint d={d} state={state} />, RC_PAGE) }] : []),
    { label: 'Dupliquer la commande', run: () => setOpen({ d: duplicateDelivery(d) }) },
    d.archivedAt ? { label: 'Restaurer la commande', run: () => act(d.id, (x, by) => restoreDelivery(x, by)) } : { label: 'Archiver', run: () => setArchiving(d) },
    ...(!deletable(state, d) && (!teamView || p.teamCanDelete) ? [{ label: 'Supprimer', danger: true, run: () => remove(d) }] : []),
  ];
  // the cards act through ONE object that never changes and always reaches the latest drawing of the register (so that a card is not drawn again for a closure)
  live.current = { go, open: d => { setFull(null); setOpen({ d }); }, print: printOrder, menu: menuOf };

  const fullD = full && Object.hasOwn(state.deliveries, full.id) ? state.deliveries[full.id] : undefined;
  const closeFull = () => { setFull(null); clearFocus(); };
  const closeLost = () => { setLost(false); closeFull(); };
  // the dialogs sit at the same place whether the register is empty or not: the sheet of the very first order is not drawn again when that order is saved
  const overlays = <>
    {open && <RcSheet key={open.d.id} initial={open.d} tab={open.tab} nav={nav} focusReserve={open.reserve} onClose={() => setOpen(null)} onPrint={() => printOrder(state.deliveries[open.d.id] ?? open.d)} />}
    {creating && <RcNew state={state} quoteId={creating.quoteId} onClose={() => setCreating(null)} onCreate={d => { setCreating(null); setOpen({ d }); }} />}
    {full && fullD && (full.kind === 'jalon' ? <RcMilestone id={full.id} nav={nav} onClose={closeFull} /> : <RcReception id={full.id} nav={nav} onClose={closeFull} />)}
    {(lost || (full && !fullD)) && <Modal onClose={closeLost} title="Commande introuvable" footer={<Button onClick={closeLost}>Fermer</Button>}><p className="text-xs text-slate-700">Cette commande n'existe pas sur cet appareil. Elle a peut-être été supprimée, ou les données de l'entreprise ne sont pas encore chargées ici.</p></Modal>}
    {archiving && <ArchiveDialog d={archiving} state={state} onClose={() => setArchiving(null)} onArchive={n => archive(archiving, n)} />}
    {dropEx && <ExampleDialog state={state} onClose={() => setDropEx(false)} onRemove={removeExample} />}
    {printNode}{bar}
  </>;

  // won quotes that no order follows (`qs`): one tap creates the order from the quote, "Pas de suivi" sets one aside (taken back by "Annuler")
  const skip = (x: Quote) => {
    update(s => { s.params.reception = { ...s.params.reception, skippedQuotes: [...new Set([...(s.params.reception?.skippedQuotes ?? []), x.id])] }; });
    offer(`Retiré du suivi\u202f: ${x.ref}`, () => update(s => { s.params.reception = { ...s.params.reception, skippedQuotes: (s.params.reception?.skippedQuotes ?? []).filter(i => i !== x.id) }; }));
  };
  const quotes = qs.length > 0 && (
    <Card className="space-y-2 p-3 sm:p-4">
      <ToolHeader title={`Devis gagnés sans commande suivie\u202f: ${qs.length}`} text="Un appui crée la commande avec le client, le livrable et la date de livraison promise du devis." />
      <ul className="divide-y divide-slate-100">
        {(moreQuotes ? qs : qs.slice(0, 3)).map(x => (
          <li key={x.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
            <span className="min-w-0 flex-1 text-slate-800"><strong>{x.ref}</strong> · {x.client.trim() || 'Client à saisir'} · {x.object.trim() || 'Objet à préciser'}{x.decidedAt ? <span className="text-slate-500"> · gagné le {fmtMoment(x.decidedAt)}</span> : null}</span>
            <span className="flex shrink-0 flex-wrap items-center gap-2">
              <Button className="!py-1" aria-label={`Créer la commande du devis ${x.ref}`} onClick={() => setCreating({ quoteId: x.id })}>Créer la commande</Button>
              <Button className="!py-1" aria-label={`Pas de suivi pour le devis ${x.ref}`} onClick={() => skip(x)}>Pas de suivi</Button>
            </span>
          </li>
        ))}
      </ul>
      {qs.length > 3 && <button type="button" className={`text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => setMoreQuotes(!moreQuotes)} aria-expanded={moreQuotes}>{moreQuotes ? 'Afficher moins' : qs.length - 3 === 1 ? 'Voir 1 autre' : `Voir les ${qs.length - 3} autres`}</button>}
    </Card>
  );

  if (!all.length) {
    return (
      <div className="space-y-4">
        <>
        <Empty title="Réceptions&#8239;: des commandes contrôlées à chaque jalon, libérées et reçues avec preuve" text="Contrôle à chaque jalon, libération nommée, procès-verbal signé sur place, réserves levées dans le délai convenu.">
          <Button kind="primary" onClick={() => setCreating({})}><Plus size={14} />Nouvelle commande</Button>
          <Button onClick={() => update(d => applyReceptionExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {quotes}
        <RcSettings />
        </>
        {overlays}
      </div>
    );
  }

  const hasExample = all.some(d => d.id.startsWith('dl_demo_')), mayDrop = hasExample && (!teamView || !!p.teamCanDelete), sans = sm.sansReservePct;   // removing the example is deleting: the same right as "Supprimer"; the count comes from the whole numbers of the summary (never rebuilt from a rounded percentage)
  return (
    <div className="space-y-4">
      <>
      {/* the first action of the tool sits next to its question, in the first screen of a phone (it wraps under the question when the two do not fit) */}
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="min-w-0 flex-1 basis-56 text-sm font-bold text-delacour-primary">Les commandes sont-elles contrôlées, libérées et reçues&#8239;?</h2>
          <Button kind="primary" className="print:hidden" onClick={() => setCreating({})}><Plus size={14} />Nouvelle commande</Button>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {/* a colour says a fact: green when it is good, amber when it asks for a move, red when it is serious; nothing else is coloured */}
          <RcTile title="Reçues sans réserve" value={sans === null ? '—' : `${sans}\u202f%`} sub={sm.receivedCount ? `${sm.cleanCount} sur ${plural(sm.receivedCount, 'réception')}, 12 derniers mois` : 'aucune réception sur 12 mois'}
            tone={sans === 100 ? 'ok' : undefined} onClick={total.received ? tile('received') : undefined} active={sheets && filter === 'received' && !client} />
          <RcTile title="Réserves à lever" value={String(sm.openReserves)} sub={sm.lateReserves ? `dont ${sm.lateReserves} en retard` : sm.openReserves ? 'aucune en retard' : 'aucune réserve ouverte'}
            tone={sm.lateReserves ? 'alert' : sm.openReserves ? undefined : 'ok'} onClick={total.reserves ? tile('reserves') : undefined} active={sheets && filter === 'reserves' && !client} />
          <RcTile title="En cours" value={String(total.running)} sub={runBlocked ? `${plural(runBlocked, 'commande')} avec un jalon non conforme` : 'aucun jalon non conforme'}
            tone={runBlocked ? 'alert' : undefined} onClick={total.running ? tile('running') : undefined} active={sheets && filter === 'running' && !client} />
          <RcTile title={FILTER_LABEL.toship} value={String(total.toship)} sub={`${sm.counts.to_release} à libérer, ${sm.counts.released + sm.counts.partial} à livrer`}
            tone={sm.counts.to_release ? 'warn' : undefined} onClick={total.toship ? tile('toship') : undefined} active={sheets && filter === 'toship' && !client} />
          <RcFindings items={findings} />
        </div>
      </Card>

      <RcQueue todos={todos} state={rs!} onOpen={ctl.go} />
      {quotes}

      <div id="rc-list" className="scroll-mt-36"><Card className="space-y-2 p-3 sm:space-y-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-delacour-primary">Commandes suivies</h2>
            <p className="hidden max-w-3xl text-xs text-slate-500 sm:block">Une fiche par commande&#8239;: jalons, libération, réception et suites. Le QR code de la fiche suiveuse ouvre les contrôles de la commande.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {mayDrop && <Button className="max-sm:hidden" onClick={() => setDropEx(true)}>Retirer l'exemple</Button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* on a phone the three views sit under one button (the register keeps its six controls: the view, the five filters, the search) */}
          <button type="button" aria-expanded={viewOpen} onClick={() => setViewOpen(!viewOpen)} className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:hidden ${TOUCH}`}>Affichage&#8239;: {VIEW_LABEL[view].toLowerCase()}<ChevronDown size={13} aria-hidden className={viewOpen ? 'rotate-180' : ''} /></button>
          <div className={`${PILLS} ${viewOpen ? '' : 'max-sm:hidden'}`}><Chips value={view} onChange={v => { setView(v); setViewOpen(false); }} items={(Object.keys(VIEW_LABEL) as View[]).map(v => [v, VIEW_LABEL[v]] as [View, string])} /></div>
          {sheets && (
            <>
              {/* one list for the five filters at every width: the tiles above already filter, five more pills made a wall */}
              <select className={`${FIELD} !w-auto`} value={filter} aria-label="Afficher" onChange={e => { setFilter(e.target.value as Filter); setLimit(PAGE); }}>{FILTER_KEYS.map(f => <option key={f} value={f}>{FILTER_LABEL[f]} {count[f]}</option>)}</select>
              <label className="relative block w-full sm:w-56"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden /><input className={`${FIELD}\u202f!pl-7`} value={q} placeholder="Commande, client, n° de PV" aria-label="Chercher une commande, un client, un livrable, un numéro de PV ou de bon de livraison" onChange={e => { setQ(e.target.value); setLimit(PAGE); }} /></label>
              {client && <Button className="!py-1" aria-label={`Retirer le filtre du client ${client.name}`} onClick={() => setClient(null)}>Client&#8239;: {client.name}<X size={12} aria-hidden /></Button>}
            </>
          )}
        </div>
        {sheets && (shown.length
          ? <>
            {view === 'cards' ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{listed.map(d => <RcOrder key={d.id} d={d} state={rs!} todos={reg.mine.get(d.id) ?? NONE} now={now} ctl={ctl} team={teamView} />)}</div>
              : <ul className="divide-y divide-slate-100">{listed.map(d => <RcOrder key={d.id} line d={d} state={rs!} todos={reg.mine.get(d.id) ?? NONE} now={now} ctl={ctl} team={teamView} />)}</ul>}
            {shown.length > limit && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <span className="text-xs text-slate-500">{listed.length} commandes affichées sur {shown.length}</span>
                <Button onClick={() => setLimit(limit + PAGE)}>Afficher {Math.min(PAGE, shown.length - limit)} de plus</Button>
              </div>
            )}
          </>
          : <p className="py-6 text-center text-xs text-slate-500">{noneText()}</p>)}
        {view === 'clients' && (clients.length
          ? (
            <ul className="divide-y divide-slate-100">
              {clients.map(c => (
                <li key={c.key} className="flex items-center gap-1">
                  <button type="button" onClick={() => openClient(c.key, c.name)} className="min-w-0 flex-1 px-1 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">
                    <span className="block truncate text-xs font-semibold text-slate-900">{c.name}</span>
                    <span className="line-clamp-2 block text-xs text-slate-500">{plural(c.orders, 'commande')} · {plural(c.got, 'réception')}{c.got ? ` · ${Math.round(c.clean / c.got * 100)}\u202f% sans réserve` : ''}{c.org ? '' : " · pas dans l'annuaire"}</span>
                  </button>
                  {c.org && <button type="button" className={`inline-flex shrink-0 items-center gap-1 px-2 text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`} aria-label={`Ouvrir ${c.name} dans l'annuaire (nouvel onglet)`} onClick={() => nav.open('1.3', `org:${c.name}`)}>Annuaire<NewTab /></button>}
                </li>
              ))}
            </ul>
          )
          : <p className="py-6 text-center text-xs text-slate-500">Aucun client&#8239;: les commandes n'ont pas encore de client.</p>)}
      </Card></div>


      <Method rule="Un défaut s'arrête au jalon où il apparaît&#8239;: il n'est ni transmis, ni livré."
        steps={[['Un contrôle à chaque jalon', "La personne qui contrôle est nommée, avec la date et l'heure. Les photos et les mesures restent dans la commande\u202f; un échec reste dans l'historique du jalon, même après la reprise."], ['Une libération nommée avant le départ', "Une personne libère la commande quand les jalons applicables sont conformes. Une libération malgré un écart se fait par dérogation, avec son motif."], ['Un PV signé sur place, des réserves levées', "Le client signe par un tracé, ou une photo du PV papier, ou une mention d'absence avec témoin, est ajoutée. Chaque réserve a sa photo, son échéance et sa levée constatée."]]}
        tips={["Ce qui est tapé une fois (modèles de jalons, personnes qui libèrent, listes) reste\u202f; les gestes du terrain sont enregistrés à l'instant.", "Si le contrat prévoit une retenue pour une réserve mineure, la clause se règle dans l'outil et se recopie sur le PV.", "Une commande qui a un historique s'archive plutôt que de se supprimer\u202f; un PV signé ne se modifie que par une correction journalisée."]} />
      {Object.values(state.kpis).some(isReceptionKpi)
        ? <FeedBox tool="3.4" period={periodOfDate(now)} />
        : <Card className="flex flex-wrap items-center gap-2 p-3 text-xs text-slate-700 sm:p-4">Chiffres proposés au tableau de pilotage (1.1)&#8239;: réceptions sans réserve, réserves levées dans le délai, jalons conformes du premier coup, commandes libérées sans dérogation, livraisons à la date promise. Les valeurs sont proposées, jamais écrites sans accord.<Button className="!px-2 !py-1" onClick={() => update(d => { addReceptionKpis(d); })}>Ajouter au tableau de pilotage</Button></Card>}
      {mayDrop && <div className="sm:hidden"><Button onClick={() => setDropEx(true)}>Retirer l'exemple</Button></div>}
      <RcSettings />
      </>
      {overlays}
    </div>
  );
}

// Archiving keeps the order, its journal and its proofs; what deleting would lose is told
function ArchiveDialog({ d, state, onClose, onArchive }: { d: Delivery; state: State; onClose(): void; onArchive(note: string): void }) {
  const [note, setNote] = useState(''), lost = lostByDeleting(d), why = deletable(state, d), barred = why !== lost ? why : '', follow = followedText(d);   // barred: a review of the end (2.4) is linked to the order
  return (
    <Modal onClose={onClose} title={`Archiver ${orderName(d)}`} footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" onClick={() => onArchive(note.trim())}>Archiver</Button></>}>
      <div className="space-y-3">
        <p className="text-xs text-slate-700">L'archivage garde la commande, son journal et ses preuves. Elle n'apparaît plus que dans «&#8239;Archivées&#8239;» et se restaure d'un appui.{lost ? ` Supprimer ferait perdre\u202f: ${lost}.` : ''}{barred ? ` ${barred}.` : ''}{follow ? ` ${follow}` : ''}</p>
        <Field label="Motif (facultatif)"><input className={FIELD} value={note} onChange={e => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// What removing the example takes out of a state: the orders and the defects of the example, the organisations and people of the directory that only the example cited, and the clause
// of retention of the settings while it is still the example's (`r`, the settings that left); the state itself is changed, so give it the draft of the store or a copy
const lost = <T,>(was: Record<string, T>, now: Record<string, T>) => Object.fromEntries(Object.entries(was).filter(([id]) => !Object.hasOwn(now, id)));
const takeExample = (s: State) => {
  const d0 = { ...s.deliveries }, n0 = { ...s.ncs }, o0 = { ...s.orgs }, c0 = { ...s.contacts }, r0 = s.params.reception;
  removeReceptionExample(s);
  return { d: lost(d0, s.deliveries), n: lost(n0, s.ncs), o: lost(o0, s.orgs ?? {}), c: lost(c0, s.contacts ?? {}), r: s.params.reception === r0 ? undefined : r0 };
};

// Removing the example says what leaves (counted on a copy), what stays, and that "Annuler" brings it back
function ExampleDialog({ state, onClose, onRemove }: { state: State; onClose(): void; onRemove(): void }) {
  const gone = useMemo(() => { const g = takeExample(structuredClone(state)); return { d: Object.keys(g.d).length, n: Object.keys(g.n).length, o: Object.keys(g.o).length, c: Object.keys(g.c).length, r: !!g.r }; }, [state]);
  const kept = useMemo(() => modifiedReceptionExamples(state), [state]);   // what the company changed in the example stays: its orders and its defects
  return (
    <Modal onClose={onClose} title="Retirer l'exemple" footer={<><Button onClick={onClose}>Annuler</Button><Button kind="danger" onClick={onRemove}>Retirer l'exemple</Button></>}>
      <div className="space-y-2 text-xs text-slate-700">
        <p>Quittent l'outil&#8239;: {[plural(gone.d, "commande d'exemple", "commandes d'exemple") + ' (avec leurs contrôles, réserves, photos et signatures)', gone.n ? plural(gone.n, "défaut d'exemple lié", "défauts d'exemple liés") : '',
          gone.o ? plural(gone.o, "organisation de l'annuaire", "organisations de l'annuaire") : '', gone.c ? plural(gone.c, "personne de l'annuaire", "personnes de l'annuaire") : '', gone.r ? 'la clause de retenue des réglages, qui est celle de l\'exemple' : ''].filter(Boolean).join(', ')}.</p>
        {(kept.orders.length > 0 || kept.ncs.length > 0) && <p role="status" className="font-semibold">{[kept.orders.length ? plural(kept.orders.length, "commande d'exemple modifiée sera gardée", "commandes d'exemple modifiées seront gardées") : '', kept.ncs.length ? plural(kept.ncs.length, "défaut d'exemple modifié sera gardé", "défauts d'exemple modifiés seront gardés") : ''].filter(Boolean).join(', ')}.</p>}
        <p>Restent&#8239;: les commandes, les défauts, les organisations, les personnes et les réglages de l'entreprise. «&#8239;Annuler&#8239;» restaure l'exemple pendant 8 secondes après le retrait.</p>
      </div>
    </Modal>
  );
}
