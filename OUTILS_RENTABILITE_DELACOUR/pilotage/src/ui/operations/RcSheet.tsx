// The sheet of an order (tool 3.4), in five tabs: Commande, Jalons, Libération, Réception, Suites. What is typed (customer, definitions of the milestones, receptionist)
// is written as a draft while it is typed (also when the window closes, the page is left or the tab goes to the background). What lives (checks, release, reservations,
// signatures, journal, lots: see takeLife) is written at once by `act` through the functions of the domain, never through the typed copy, so that a stale sheet never
// erases a check made meanwhile at the post. An order that has neither number, customer nor item is not written; a move of the life writes it first.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Archive, Lock, MoreHorizontal, Printer, RotateCcw, Trash2 } from 'lucide-react';
import type { Delivery, State } from '../../domain/types';
import { allReservesOf, archiveDelivery, completeness, deletable, deliveryState, isLocked, lostByDeleting, milestoneProgress, openReserves, presentationNo, restoreDelivery, sealState, shortSeal, takeLife, type RcTab } from '../../domain/receptions';
import { nb, nowLocal } from '../../domain/base';
import { receptionTodos } from '../../domain/receptionsAll';
import { isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal } from '../common';
import type { Nav } from '../tools';
import { followedText, PeoplePick, peopleOf, plural, StateBadge, TOUCH16, type Hold, sentence, rcDay } from './RcBits';
import { RcTabFollow } from './RcTabFollow';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabOrder } from './RcTabOrder';
import { RcReserves } from './RcReserves';
import { RcTabRelease } from './RcTabRelease';
import { SHEET_LOCK_NOTE, RcTabReception, when } from './RcTabReception';

// The tab of the next move of a saved order (the first one when nothing is to do)
const nextTab = (d: Delivery, s: State): RcTab => {
  const st = deliveryState(d, new Date(), s.params);
  return st === 'to_release' ? 'release' : st === 'delivered' || st === 'reserve' || st === 'reserve_late' ? 'reception' : 'order';
};

// What the tabs of the sheet receive from the sheet. The sheet owns the saving.
export interface RcTabProps {
  d: Delivery;                        // typed content of the sheet, with the life of the saved order merged in
  saved: Delivery | undefined;        // the saved order; undefined while the order is new
  set(x: Partial<Delivery>): void;    // typed content (customer, definitions of the milestones, receptionist): the sheet writes the draft
  act(f: (d: Delivery, by: string, s: State) => Delivery): void;   // a move of the life (or of the structure): written at once to the store, author in hand, `s` = the CURRENT state of the store (the copy being written: a number of PV or a defect taken from it is never stale); an order not saved yet is written first
  hold?: Hold;                        // a form that holds typed text not applied yet says it (`useHold`): the sheet asks before it closes
  focusReserve?: string;              // the reservation a task opened the sheet on: the tab Réception brings it under the tabs and rings it
  who?: string; setWho?(v: string): void;   // the person who writes the gestures of the sheet, chosen once on top of the tabs (the tabs keep their own choice when rendered alone)
  full?(kind: 'jalon' | 'reception'): void;   // opens the full screen: the draft is written and the sheet is closed first, so that no sheet stays open under it
  state: State;
  nav: Nav;
  close(): void;
}

const TABS: { k: RcTab; label: string }[] = [{ k: 'order', label: 'Commande' }, { k: 'milestones', label: 'Jalons' }, { k: 'release', label: 'Libération' }, { k: 'reception', label: 'Réception' }, { k: 'follow', label: 'Suites' }];
const BADGE = { red: 'bg-red-700', amber: 'bg-amber-700', green: 'bg-emerald-700', slate: 'bg-slate-600' };
const NOTHING = "Rien n'est enregistré tant que la commande n'a ni numéro, ni client, ni livrable\u202f: fermer abandonne ce qui a été saisi.";
const FULL = "Le navigateur n'a plus de place\u202f: ce qui a été saisi depuis ne sera pas retrouvé à la prochaine ouverture. Fermer garde la saisie jusqu'à la fermeture de la page seulement.";
const hasContent = (x: Delivery) => !!(x.ref.trim() || x.client.trim() || x.item.trim());
const touch = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
// every field of the tabs is 16 px on a touch screen (under it a phone zooms in when a field is touched)
const FIELDS16 = '[@media(pointer:coarse)]:[&_input]:!text-base [@media(pointer:coarse)]:[&_select]:!text-base [@media(pointer:coarse)]:[&_textarea]:!text-base';
// What stands in the way of a complete sheet NOW (data of the order to write, a reservation to lift); the steps still to come (checks, release, result, PV) are the counters of the tabs
const BLOCKS = ['client', 'item', 'promisedAt', 'reserves'];

// The share of the sheet that is complete: a small ring and the figure in words (the figure is never drawn inside the ring); grey until it is complete, green when it is (a new order is 0 %, not an alarm)
const Pct = ({ pct }: { pct: number }) => (
  <span role="img" aria-label={`Fiche complète à ${pct}\u202f%`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-700">
    <svg width="14" height="14" viewBox="0 0 36 36" aria-hidden className="shrink-0">
      <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle cx="18" cy="18" r="15" fill="none" stroke={pct >= 100 ? '#059669' : '#94a3b8'} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${94.2 * pct / 100} 94.2`} transform="rotate(-90 18 18)" />
    </svg>
    {pct} %<span className="max-sm:hidden"> complète</span>
  </span>
);

// The person who writes the gestures of the sheet (checks, release, reception, corrections): picked once here and taken by every tab, never a blank, never chosen for the user.
// Once picked from the list it is a line "Vous : X · changer"; a name typed under "Autre…" keeps the field.
function WhoBar({ who, setWho, people }: { who: string; setWho(v: string): void; people: ReturnType<typeof peopleOf> }) {
  const [edit, setEdit] = useState(false), listed = !!who && [...people.names, ...people.absent].includes(who);
  if (listed && !edit) return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-700">
      <span>Vous&#8239;: <strong className="font-semibold text-slate-900">{who}</strong></span><span aria-hidden>·</span>
      <button type="button" onClick={() => setEdit(true)} className={`font-semibold text-delacour-primary underline focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${touch}`}>changer<span className="sr-only"> la personne qui enregistre</span></button>
    </p>
  );
  return <PeoplePick value={who} onChange={v => { setWho(v); if (people.names.includes(v)) setEdit(false); }} names={people.names} absent={people.absent} label="Qui enregistre sur cette fiche&#8239;?" />;
}

// The other moves of the order (archive, print, delete) behind one button, so that the foot of the sheet stays on one line on a phone; a tap outside closes it, Escape too (the sheet stays)
function More({ items }: { items: { label: string; icon: ReactNode; run(): void; danger?: boolean }[] }) {
  const [on, setOn] = useState(false), ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!on) return;
    const out = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOn(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOn(false); } };
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [on]);
  return (
    <span ref={ref} className="relative mr-auto">
      <Button aria-expanded={on} aria-label="Autres actions de la commande" title="Autres actions" className="max-sm:min-w-[44px] [@media(pointer:coarse)]:min-w-[44px]" onClick={() => setOn(!on)}><MoreHorizontal size={16} aria-hidden /></Button>
      {on && (
        <ul className="absolute bottom-full left-0 z-30 mb-1 min-w-[15rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map(x => (
            <li key={x.label}>
              <button type="button" onClick={() => { setOn(false); x.run(); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${touch} ${x.danger ? 'text-red-700' : 'text-slate-800'}`}>{x.icon}{x.label}</button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export function RcSheet({ initial, onClose, nav, tab: tab0, focusReserve, onPrint }: { initial: Delivery; onClose(): void; nav: Nav; tab?: RcTab; focusReserve?: string; onPrint?(d: Delivery): void }) {
  const { state, update, author, storageFull } = useStore();
  const by = author || 'anonyme';
  const [d, setD] = useState<Delivery>(() => takeLife(structuredClone(initial), state?.deliveries[initial.id], initial));
  const base = useRef(d);                                  // the typed copy as it was at the last synchronisation with the store: takeLife writes only what the typing changed since
  const holds = useRef(new Map<string, string>());         // what the forms of the tabs hold, not applied yet
  const hold = useCallback<Hold>((k, what) => { if (what) holds.current.set(k, what); else holds.current.delete(k); }, []);
  // opened without a tab (a card, a link), the sheet opens where the next move is: the release when it is to release, the reception when the PV is to sign or a reservation is open; a new order on the order
  const [tab, setTab] = useState<RcTab>(() => tab0 || (state?.deliveries[initial.id] ? nextTab(initial, state) : 'order'));
  const seen = useRef(new Set<RcTab>());                   // the tabs opened so far: a tab is drawn when it is first opened and kept (what is typed in it stays), the ones never opened cost nothing
  seen.current.add(tab);
  const fresh = !state?.deliveries[initial.id] && hasContent(initial);   // an order that comes with its customer or item (from a quote, a model) is written even if nothing is typed
  const [rev, setRev] = useState(fresh ? 1 : 0);              // edits since the last write (restarts the minute of the draft)
  const [pend, setPend] = useState<{ what: string[]; go(): void; full: boolean } | null>(null);
  const [lose, setLose] = useState(''), [asking, setAsking] = useState<'archive' | 'delete' | null>(null), [note, setNote] = useState(''), [error, setError] = useState('');
  // a task that lifts a reservation opens the sheet on that reservation alone (`alone`), the person of the task being the one who writes (when she is not on leave that day, and a person of the task who is not in the list of the sheet is added to it)
  const [alone, setAlone] = useState(!!focusReserve);
  const [owner] = useState(() => (focusReserve && state ? receptionTodos(state, new Date()).find(t => t.reserveId === focusReserve && t.kind.startsWith('reserve'))?.who?.trim() ?? '' : ''));
  const [who, setWho] = useState(() => (owner && state && !peopleOf(state, initial, isoDate(new Date())).absent.includes(owner) ? owner : ''));
  useEffect(() => { setAlone(!!focusReserve); }, [focusReserve]);
  const uid = useId();
  const cur = useRef(d);                                   // the sheet as typed, always the latest (between two renders too)
  const dirty = useRef(fresh), edited = useRef(false), gone = useRef(false);   // typed and not written; touched in this session; deleted: nothing writes it back
  const saved = state?.deliveries[d.id], savedRef = useRef(saved);
  savedRef.current = saved;
  const apply = (x: Delivery) => { cur.current = x; setD(x); };
  // writes what is typed; the life of the saved order is taken from the saved one, whatever the screen holds
  const persist = () => {
    const x = cur.current;
    if (gone.current || !dirty.current || (!savedRef.current && !hasContent(x))) return;
    dirty.current = false;
    update(s => { s.deliveries[x.id] = takeLife(x, s.deliveries[x.id], base.current); });
    base.current = x;
  };
  // the life of the saved order (a check made full screen, a release) follows into the one being edited
  useEffect(() => { if (saved) { apply(takeLife(cur.current, saved, base.current)); base.current = saved; } }, [saved]);   // eslint-disable-line react-hooks/exhaustive-deps
  // what was typed is written when the window closes, the page is left (tool change, back gesture, closing the tab) or the tab goes to the background
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist); document.addEventListener('visibilitychange', hide);
    return () => { persist(); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', hide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // written as it is typed, once it has a number, a customer or an item
  useEffect(() => {
    if (!rev) return;
    const t = window.setTimeout(() => { persist(); setRev(0); }, 1200);
    return () => window.clearTimeout(t);
  }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps
  // the active tab stays in view when the tabs scroll (a narrow phone)
  useEffect(() => { document.getElementById(`${uid}-tab-${tab}`)?.scrollIntoView?.({ block: 'nearest', inline: 'center' }); }, [tab, uid]);
  useEffect(() => { if (tab0) setTab(tab0); }, [tab0]);
  // a task that lifts a reservation opens the tab Réception on it: the card is brought under the tabs once (no animation) and takes the focus; the ring stays (RcReserves)
  const brought = useRef('');
  useEffect(() => {
    if (!focusReserve || tab !== 'reception' || brought.current === focusReserve) return;
    const t = window.setTimeout(() => {
      const el = [...document.querySelectorAll<HTMLElement>('[data-reserve]')].find(x => x.dataset.reserve === focusReserve);
      if (!el) return;
      brought.current = focusReserve;
      el.scrollIntoView?.({ block: 'start' }); el.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [focusReserve, tab]);
  // the content of a signed PV against the seal laid at the signature (computed when the sheet changes, never at every key: a signed PV has nothing to type)
  const sealed = useMemo(() => (isLocked(d) ? sealState(d) : 'none'), [d]);
  if (!state) return null;

  const now = new Date(), isNew = !saved, writable = !isNew || hasContent(d), st = deliveryState(d, now, state.params), locked = isLocked(d), seal = d.reception.seals?.at(-1);
  const title = [d.ref.trim(), d.client.trim()].filter(Boolean).join(' · ') || (isNew ? 'Nouvelle commande' : 'Commande sans numéro');
  const set: RcTabProps['set'] = x => { apply({ ...cur.current, ...x }); dirty.current = true; edited.current = true; setRev(r => r + 1); };
  // a move of the life: applied at once on the typed content with the life of the store, then written (the order not saved yet is written first)
  const act: RcTabProps['act'] = f => {
    let after = cur.current;
    update(s => { after = f(takeLife(cur.current, s.deliveries[cur.current.id], base.current), by, s); s.deliveries[after.id] = after; });
    apply(after); base.current = after; dirty.current = false; edited.current = true; setRev(0);
  };
  // leaving the sheet (closing it, or opening a full screen over it) asks first when a form holds typed text that is not applied yet: the dialog names what would be lost
  const leave = (go: () => void, full = false) => { const what = [...holds.current.values()]; if (what.length) setPend({ what, go, full }); else go(); };
  const closeNow = () => {
    if (!saved && !hasContent(d)) { if (dirty.current && !lose) { setLose(NOTHING); return; } onClose(); return; }
    persist();
    if (storageFull && edited.current && !lose) { setLose(FULL); return; }
    onClose();
  };
  const close = () => leave(closeNow);
  // a full screen never opens under the sheet: the order is written (the draft too), the sheet closes, then the address opens the full screen
  const full = (kind: 'jalon' | 'reception') => leave(() => { if (!saved) act(x => x); else persist(); onClose(); nav.tool('3.4', `${kind}:${d.id}`); }, true);
  const remove = () => { gone.current = true; update(s => { delete s.deliveries[d.id]; }); onClose(); };
  const print = () => {
    if (!hasContent(d)) { setError('Pas de numéro, de client ni de livrable\u202f: le QR code mène à la commande enregistrée.'); setTab('order'); return; }
    setError(''); persist(); onPrint?.(cur.current);
  };
  const onKey = (ev: React.KeyboardEvent) => {
    const i = TABS.findIndex(t => t.k === tab), n = TABS.length;
    const to = ev.key === 'ArrowRight' ? (i + 1) % n : ev.key === 'ArrowLeft' ? (i + n - 1) % n : ev.key === 'Home' ? 0 : ev.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    ev.preventDefault(); setTab(TABS[to].k); document.getElementById(`${uid}-tab-${TABS[to].k}`)?.focus();
  };

  const { pct, missing } = completeness(d), pr = milestoneProgress(d), open = openReserves(d).length;
  const gaps = missing.filter(m => BLOCKS.includes(m.key)), orderGaps = missing.filter(m => m.tab === 'order').length;
  const counters: Partial<Record<RcTab, { text: string; sr: string; tone: keyof typeof BADGE }>> = {
    ...(orderGaps ? { order: { text: String(orderGaps), sr: `${orderGaps} à compléter`, tone: 'amber' as const } } : {}),
    ...(pr.total ? { milestones: { text: `${pr.done}/${pr.total}`, sr: `${pr.done} sur ${pr.total} conformes`, tone: pr.ko ? 'red' as const : pr.done === pr.total ? 'green' as const : 'slate' as const } } : {}),
    ...(open ? { follow: { text: String(open), sr: plural(open, 'réserve non levée', 'réserves non levées'), tone: 'red' as const } } : {}),
  };
  const lost = lostByDeleting(d), why = deletable(state, d), barred = why !== lost ? why : '', props: RcTabProps = { d, saved, set, act, hold, focusReserve, full, state, nav, close, who, setWho }, follow = followedText(d);
  const people0 = peopleOf(state, d, isoDate(now)), people = owner && ![...people0.names, ...people0.absent].includes(owner) ? { ...people0, names: [...people0.names, owner] } : people0;
  const lone = alone && focusReserve ? allReservesOf(d).find(r => r.id === focusReserve && !r.liftedAt && !r.refused) : undefined;   // the reservation of the task, while it is open
  // the tabs that write a gesture of proof ask who writes it, once, on top; a signed PV needs nobody in the checks and the release, only in the reservations still to lift and the photo of the paper PV still to add
  const needsWho = (k: RcTab) => (k === 'milestones' || k === 'release' ? !locked : k === 'reception' ? !locked || open > 0 || !d.pvPhoto : false);
  const lot = (d.lots?.length ?? 0) > 0 ? `Livraison n° ${presentationNo(d)}` : '';
  const failing = writable && storageFull;   // the write was refused: the foot says so in red, whatever else it said
  const moves = [
    ...(!isNew ? [d.archivedAt ? { label: 'Restaurer', icon: <RotateCcw size={14} aria-hidden />, run: () => act(x => restoreDelivery(x, by)) } : { label: 'Archiver', icon: <Archive size={14} aria-hidden />, run: () => { setNote(''); setAsking('archive'); } }] : []),
    ...(onPrint ? [{ label: 'Imprimer la fiche suiveuse', icon: <Printer size={14} aria-hidden />, run: print }] : []),
    ...(!isNew && !why ? [{ label: 'Supprimer', icon: <Trash2 size={14} aria-hidden />, run: () => setAsking('delete'), danger: true }] : []),
  ];
  const status = !writable ? "Rien n'est enregistré tant que la commande n'a ni numéro, ni client, ni livrable" : failing ? 'Non enregistré\u202f: espace du navigateur plein' : rev ? 'Enregistrement…' : 'Enregistré automatiquement';

  return (
    <Modal xwide onClose={close} title={title}
      subtitle={<span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><StateBadge st={st} /><Pct pct={pct} />{lot && <span className="shrink-0">{lot}</span>}{d.item.trim() && <span className={`line-clamp-2 min-w-0 break-words ${lot ? 'basis-full sm:basis-auto' : ''}`}>{d.item.trim()}</span>}</span>}
      footer={<>
        {moves.length > 0 && <More items={moves} />}
        {error && <span role="alert" className="text-xs font-semibold text-red-700">{error}</span>}
        <span role={failing ? 'alert' : undefined} className={`text-xs ${failing ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{status}</span>
        <Button kind="primary" onClick={close}>Fermer</Button>
      </>}>
      <div className={`space-y-4 ${FIELDS16}`}>
        {(storageFull || locked || !!d.archivedAt || gaps.length > 0) && (
          <div className="space-y-2">
            {storageFull && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">Le navigateur n'a plus de place&#8239;: ce qui est saisi n'est pas gardé après la fermeture de la page.</p>}
            {locked && (
              <div role={sealed === 'modified' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${sealed === 'modified' ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-300 bg-slate-50 text-slate-800'}`}>
                <Lock size={14} aria-hidden className="mt-0.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold">{d.reception.pvNo ? `${d.reception.pvNo} · ` : ''}{sealed === 'intact' ? `Scellé intact\u202f: ${shortSeal(seal!.hash)}` : sealed === 'modified' ? nb(`Modifié depuis la signature\u202f: le contenu ne correspond plus au scellé du ${when(seal!.at)}.`) : 'Aucun scellé enregistré pour ce PV.'}</p>
                  <p className="max-sm:sr-only">{SHEET_LOCK_NOTE}</p>
                </div>
              </div>
            )}
            {d.archivedAt && <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{sentence(nb(`Commande archivée le ${rcDay(d.archivedAt.slice(0, 10))}${d.archivedNote?.trim() ? `\u202f: ${d.archivedNote.trim()}` : ''}`))}</p>}
            {gaps.length > 0 && <p className="text-xs text-slate-700"><span className="font-semibold text-slate-600">Manque&#8239;: </span>{gaps.map(m => m.label).join(' · ')}.</p>}
          </div>
        )}
        {lone ? (
          <div className="space-y-4">
            <WhoBar who={who} setWho={setWho} people={people} />
            <RcReserves d={d} act={act} state={state} nav={nav} hold={hold} who={who} setWho={setWho} focus={focusReserve} only={focusReserve} />
            <div><Button onClick={() => setAlone(false)}>Voir toute la fiche de la commande</Button></div>
          </div>
        ) : <>
        <div role="tablist" aria-label="Sections de la commande" onKeyDown={onKey} className="sticky top-[-1rem] z-10 -mx-4 flex overflow-x-auto border-b border-slate-200 bg-white px-1 pt-1 sm:-mx-5 sm:px-5">
          {TABS.map(t => {
            const c = counters[t.k], on = tab === t.k;
            return (
              <button key={t.k} id={`${uid}-tab-${t.k}`} type="button" role="tab" aria-selected={on} aria-controls={`${uid}-panel-${t.k}`} tabIndex={on ? 0 : -1} onClick={() => setTab(t.k)}
                className={`flex min-h-[44px] shrink-0 flex-auto flex-col items-center justify-start gap-0.5 whitespace-nowrap border-b-2 px-1 pb-1 pt-1.5 text-center text-xs font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark sm:flex-none sm:flex-row sm:justify-center sm:gap-1.5 sm:px-3 sm:py-1 ${on ? 'border-delacour-primary text-delacour-primary' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                <span>{t.label}</span>
                {c && <span className={`rounded-full px-1.5 text-xs font-bold text-white ${BADGE[c.tone]}`}><span aria-hidden>{c.text}</span><span className="sr-only"> {c.sr}</span></span>}
              </button>
            );
          })}
        </div>
        {TABS.map(t => (
          <div key={t.k} id={`${uid}-panel-${t.k}`} role="tabpanel" aria-labelledby={`${uid}-tab-${t.k}`} hidden={tab !== t.k} className={tab === t.k && needsWho(t.k) ? 'space-y-4' : undefined}>
            {tab === t.k && needsWho(t.k) && <WhoBar who={who} setWho={setWho} people={people} />}
            {seen.current.has(t.k) && (t.k === 'order' ? <RcTabOrder {...props} print={onPrint ? print : undefined} /> : t.k === 'milestones' ? <RcTabMilestones {...props} /> : t.k === 'release' ? <RcTabRelease {...props} />
              : t.k === 'reception' ? <RcTabReception {...props} /> : <RcTabFollow {...props} />)}
          </div>
        ))}
        </>}
      </div>
      {asking === 'archive' && (
        <Modal onClose={() => setAsking(null)} title={`Archiver la commande ${title}`} subtitle="Le contrôle, la libération, le PV et le journal sont gardés"
          footer={<><Button onClick={() => setAsking(null)}>Annuler</Button><Button kind="primary" onClick={() => { act(x => archiveDelivery(x, nowLocal(), note.trim(), by)); setAsking(null); }}>Archiver</Button></>}>
          <div className="space-y-3">
            <p className="text-xs text-slate-700">La commande sort des listes en cours et reste consultable dans les archives.{lost ? ` La supprimer effacerait\u202f: ${lost}.` : ''}{barred ? ` ${barred}.` : ''}{follow ? ` ${follow}` : ''}</p>
            <Field label="Pourquoi (facultatif)"><input className={`${inputCls} ${TOUCH16}`} value={note} placeholder="Ex.&#8239;: commande soldée, annulée" onChange={x => setNote(x.target.value)} /></Field>
          </div>
        </Modal>
      )}
      {asking === 'delete' && (
        <Modal onClose={() => setAsking(null)} title={`Supprimer la commande ${title}`}
          footer={<><Button onClick={() => setAsking(null)}>Annuler</Button><Button kind="danger" onClick={remove}><Trash2 size={14} aria-hidden />Supprimer</Button></>}>
          <p className="text-xs text-slate-700">{lost ? `La suppression efface\u202f: ${lost}.` : "Aucun jalon n'est contrôlé, rien n'est libéré, livré ni signé\u202f: la suppression ne perd rien d'autre que la commande."}</p>
        </Modal>
      )}
      {pend && (
        <Modal onClose={() => setPend(null)} title="Saisie non enregistrée"
          footer={<><Button kind="primary" onClick={() => setPend(null)}>Revenir à la fiche</Button><Button onClick={() => { const go = pend.go; setPend(null); go(); }}>{pend.full ? 'Ouvrir quand même' : 'Fermer quand même'}</Button></>}>
          <div role="alert" className="space-y-2 text-xs text-slate-700">
            <p>{pend.full ? "Ouvrir en grand écran ferme la fiche\u202f: ce qui suit est perdu." : 'Fermer la fiche perd ce qui suit.'}</p>
            <ul className="list-disc space-y-0.5 pl-5">{pend.what.map(w => <li key={w}>{w}</li>)}</ul>
          </div>
        </Modal>
      )}
      {lose && (
        <Modal onClose={() => setLose('')} title="Fermer sans enregistrer&#8239;?"
          footer={<><Button kind="primary" onClick={() => setLose('')}>Revenir à la fiche</Button><Button onClick={onClose}>Fermer quand même</Button></>}>
          <p role="alert" className="text-xs text-slate-700">{lose}</p>
        </Modal>
      )}
    </Modal>
  );
}
