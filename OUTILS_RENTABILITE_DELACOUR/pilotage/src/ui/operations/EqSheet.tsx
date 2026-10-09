// The sheet of a piece of equipment (tool 3.3), in five tabs: Routine, Anomalies et pannes, Armoire, Contrôles, Fiche. What is typed (identity, points, checks, people, safety)
// is written as a draft while it is typed (also when the window closes, the page is left or the tab goes to the background); what lives (routines, anomalies, breakdowns,
// checks done, stop, retirement: see takeLife) is written at once by `act`, never through the typed copy, so that a stale sheet never erases a routine made meanwhile.
// A new piece of equipment is written as soon as it has a name. Anything removed can be brought back for a few seconds. Closing never loses what was typed.
// Writing puts on the saved record only the keys typed here (what another person changed on the other keys stays), and an undo brings back only what its gesture did.
// A sheet opened on a record that was deleted elsewhere never writes it back: it says so and offers "Remettre la fiche" (what is typed, without the stale life).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Archive, Copy, FileDown, Printer, RotateCcw, Trash2 } from 'lucide-react';
import type { Equipment, Level } from '../../domain/types';
import {
  canDelete, citedBy, completeness, deleteEquipment, duplicateEquipment, eqLevel, eqStatus, INSPECTION_STATE, inspectionState, kindLabel, kindOf, LIFE_KEYS, lostByDeleting, openAnomalies, reinstateEquipment, retireEquipment, takeLife, txt,
} from '../../domain/maintenance';
import { maintTodos } from '../../domain/maintenanceAll';
import { revertEquipment } from '../../domain/maintenanceMerge';
import { formatHours, hoursBetween, nowLocal } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { norm } from '../../domain/instructions';
import { Button, DeleteButton, Field, inputCls, Modal, StatusBadge } from '../common';
import { routinePdf } from '../../domain/maintenancePdf';
import { sparesOf } from '../../domain/maintenanceSpares';
import { downloadFile, fileSlug } from '../download';
import { usePrintOne } from '../PrintOne';
import type { Nav } from '../tools';
import { StorageNote, useUndo, type EqSet } from './EqBits';
import { FlowUses } from '../map/FlowUses';
import { CabinetTab } from './EqCabinetTab';
import { ChecksTab } from './EqChecksTab';
import { IssuesTab } from './EqIssuesTab';
import type { EqTab, EqTabProps } from './EqProps';
import { EQ_PAGE, EqPrint } from './EqPrint';
import { EqRoutine } from './EqRoutine';
import { RoutineTab } from './EqRoutineTab';
import { Sec, SheetTab } from './EqSheetTab';
import { ReportDialog } from './EqReport';
import { Ring } from './SopBits';

const TABS: { k: EqTab; label: string }[] = [{ k: 'routine', label: 'Routine' }, { k: 'issues', label: 'Anomalies et pannes' }, { k: 'cabinet', label: 'Armoire' }, { k: 'checks', label: 'Contrôles' }, { k: 'sheet', label: 'Fiche' }];
// the box of the banner follows the level of the card (eqLevel): red for a danger or a stop, amber for the rest that is to do, green only for "En ordre"
const BANNER_BOX: Record<Level, string> = { alert: 'border-red-300 bg-red-50', warn: 'border-amber-300 bg-amber-50', ok: 'border-emerald-200 bg-emerald-50', pending: 'border-slate-200 bg-slate-50' };
type Key = keyof Equipment;

// What can be taken away from the typed copy (a point, a photo, a check, a document, a person to call, a safety note, the pin): "Annuler" is offered when it goes down.
// (The maintenance contract is not counted: the checks tab offers its own "Annuler" for it.)
const mass = (e: Equipment) => e.checkpoints.length + e.checkpoints.filter(c => c.photo).length + (e.tasks?.length ?? 0) + (e.docs?.length ?? 0) + (e.docs ?? []).filter(d => d.photo).length
  + (e.contacts?.length ?? 0) + (e.contactId ? 1 : 0) + (e.safety?.length ?? 0) + (e.photo ? 1 : 0) + (e.plate ? 1 : 0) + (e.pin ? 1 : 0);
// Same for the life: a breakdown, an anomaly, a routine, a line of the history of a check
const lifeMass = (e: Equipment) => e.inspections.length + (e.anomalies?.length ?? 0) + (e.breakdowns?.length ?? 0) + Object.values(e.checkLife ?? {}).reduce((n, l) => n + l.history.length + (l.reserves?.length ?? 0), 0);
// What a removal took away, and only that, comes back: the removed items of a list return to their place in the list as it is now (what was typed since stays),
// a removed value returns if nothing replaced it since. `patch` is what the removal wrote.
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const idOf = (x: unknown) => (x && typeof x === 'object' && 'id' in x ? String((x as { id: unknown }).id) : JSON.stringify(x));
function putBack(cur: Equipment, before: Equipment, patch: Partial<Equipment>): Equipment {
  const out = { ...cur } as Record<string, unknown>;
  (Object.keys(patch) as Key[]).forEach(k => {
    const was = before[k] as unknown, now = cur[k] as unknown, kept = patch[k] as unknown;
    if (Array.isArray(was) && Array.isArray(now) && Array.isArray(kept)) {
      const list: unknown[] = [...now];
      was.filter(x => !kept.some(y => idOf(y) === idOf(x))).forEach(x => { if (!list.some(y => idOf(y) === idOf(x))) list.splice(Math.min(was.indexOf(x), list.length), 0, x); });
      out[k] = list;
    } else if (same(now, kept)) { if (was === undefined) delete out[k]; else out[k] = was; }
  });
  return out as unknown as Equipment;
}
// What deleting the sheet throws away besides the life: the work typed on it
function typedLost(e: Equipment): string {
  const photos = e.checkpoints.filter(c => c.photo).length + (e.docs ?? []).filter(d => d.photo).length + (e.photo ? 1 : 0) + (e.plate ? 1 : 0);
  const parts: [number, string, string][] = [
    [e.checkpoints.length, 'point', 'points'], [photos, 'photo', 'photos'], [e.tasks?.length ?? 0, 'contrôle', 'contrôles'], [e.contract ? 1 : 0, 'contrat', 'contrats'],
    [e.docs?.length ?? 0, 'document', 'documents'], [e.contacts?.length ?? 0, 'intervenant', 'intervenants'], [e.safety?.length ?? 0, 'consigne de sécurité', 'consignes de sécurité'], [e.routineDraft ? 1 : 0, 'routine commencée', 'routines commencées'],
  ];
  return parts.filter(x => x[0]).map(x => `${x[0]} ${x[0] > 1 ? x[2] : x[1]}`).join(', ');
}

// `offerBack` shows "Annuler" after the sheet is closed (a deleted equipment): the bar of the sheet leaves with it
export function EqSheet({ initial, tab: tab0, nav, onClose, onCopy, offerBack }: { initial: Equipment; tab?: EqTab; nav: Nav; onClose(): void; onCopy?(e: Equipment): void; offerBack?(what: string, back: () => void): void }) {
  const { state, update, author, storageFull } = useStore();
  const by = author || 'anonyme';
  const [e, setE] = useState<Equipment>(() => { const c = structuredClone(initial); return takeLife(c, state?.equipments[c.id]); });
  const first = tab0 || (!state?.equipments[initial.id] && !initial.name.trim() ? 'sheet' : 'routine');   // a new piece of equipment opens on the identity, to be named
  const [tab, setTabNow] = useState<EqTab>(first);
  const [seen, setSeen] = useState<EqTab[]>([first]);   // a tab stays drawn once opened: what was typed in it (a note, a date) is not lost by changing tab
  const setTab = (k: EqTab) => { setSeen(v => (v.includes(k) ? v : [...v, k])); setTabNow(k); };
  const [rev, setRev] = useState(() => (state?.equipments[initial.id] || !initial.name.trim() ? 0 : 1));   // edits since the last write; a copy that already has a name is still to write
  const [error, setError] = useState(''), [leaving, setLeaving] = useState(false);
  const [station, setStation] = useState(false), [reporting, setReporting] = useState(false), [retiring, setRetiring] = useState<{ date: string; note: string } | null>(null);
  const [printNode, print] = usePrintOne();
  const { bar, offer } = useUndo();
  const uid = useId();
  const latest = useRef(e);
  latest.current = e;
  const live = useRef({ rev, e });
  live.current = { rev, e };
  const dirty = useRef(new Set<Key>());   // the keys typed here since the last write
  const gone = useRef(false);   // the equipment was deleted: nothing writes it back
  const saved = state?.equipments[e.id];
  const isNew = !saved;
  // The record is, or was, in the store: when it is missing later it was deleted elsewhere (another device, another tab). Typing never brings it back: the sheet says
  // so and offers "Remettre la fiche". An equipment never written (a new one) is written as soon as it has a name, as before.
  const everSaved = useRef(!!saved);
  if (saved) everSaved.current = true;
  const away = everSaved.current && !saved && !gone.current;
  const awayNow = useRef(away);
  awayNow.current = away;
  // writes what is typed: only the keys typed here go on the saved record, whose life stays (a new equipment is written whole)
  const persist = (x: Equipment) => {
    if (awayNow.current) return;
    const keys = [...dirty.current].filter(k => !(LIFE_KEYS as readonly string[]).includes(k));
    dirty.current.clear();
    update(d => {
      const rec = d.equipments[x.id];
      if (!rec) {
        if (everSaved.current) { keys.forEach(k => dirty.current.add(k as Key)); return; }   // deleted since the last render: not written back
        everSaved.current = true; d.equipments[x.id] = x; return;
      }
      const next = { ...rec } as Record<string, unknown>;
      keys.forEach(k => { if (x[k] === undefined) delete next[k]; else next[k] = x[k]; });
      d.equipments[x.id] = takeLife(next as unknown as Equipment, rec);
    });
  };
  // the life of the saved equipment (a routine made at the machine, a stop) follows into the one being edited
  useEffect(() => { if (saved) setE(y => takeLife(y, saved)); }, [saved]);
  // what was typed is written when the window closes, the page is left (tool change, back gesture, closing the tab) or the tab goes to the background
  useEffect(() => {
    const flush = () => { if (!gone.current && live.current.rev && latest.current.name.trim()) persist(latest.current); };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hide);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (e.name.trim()) { setError(''); setLeaving(false); } }, [e.name]);   // named: the remarks about the missing name are over
  // written as it is typed, once it has a name
  useEffect(() => {
    if (!rev || !latest.current.name.trim()) return;
    const t = window.setTimeout(() => { if (awayNow.current) return; persist(latest.current); setRev(0); }, 1200);
    return () => window.clearTimeout(t);
  }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const todos = useMemo(() => (state ? maintTodos(state, new Date()) : []), [state]);   // the tasks of the tool: the banner says what the card says
  if (!state) return null;
  const now = new Date(), name = e.name.trim(), st = eqStatus(e);
  // what deleting would lose is what can be seen: the history of a check that is no longer in the list (removed by an older version) is not counted
  const shown: Equipment = { ...e, checkLife: Object.fromEntries(Object.entries(e.checkLife ?? {}).filter(([id]) => (e.tasks ?? []).some(t => t?.id === id))) };

  // A move of the life, applied once to the saved equipment (to the one being written while it is not saved yet). Returns its undo, the inverse of the move on the
  // record as it is then, when the move took something away (or whatever it changed, with `always`).
  const lifeMove = (f: (x: Equipment, by: string) => Equipment, always = false): (() => void) | undefined => {
    if (away) return;   // the record is gone: a move would only be written on the copy of this screen
    if (!state.equipments[e.id]) {
      const before = latest.current, after = f(before, by);
      setE(y => f(y, by)); setRev(r => r + 1);
      return always && !same(before, after) ? () => { setE(y => revertEquipment(y, before, after)); setRev(r => r + 1); } : undefined;
    }
    const was: { before?: Equipment; after?: Equipment } = {};
    update(d => { const x = d.equipments[e.id]; if (x) { was.before = x; was.after = f(x, by); d.equipments[e.id] = was.after; } });
    const { before, after } = was;
    if (!before || !after || !(always ? !same(before, after) : lifeMass(after) < lifeMass(before))) return;
    return () => update(d => { if (d.equipments[e.id]) d.equipments[e.id] = revertEquipment(d.equipments[e.id], before, after); });
  };
  // typed content: a patch, or a function of the copy as it is now (a photo that comes back late must not put back the list as it was); a removal, or a pin put or
  // moved on the plan, can be brought back; `life` is a move of the life done at the same time (the history of a removed check), undone with the same "Annuler"
  const set: EqSet = (x, life) => {
    const before = latest.current, patch = typeof x === 'function' ? x(before) : x, next = { ...before, ...patch };
    latest.current = next;
    (Object.keys(patch) as Key[]).forEach(k => dirty.current.add(k));
    setE(y => ({ ...y, ...patch })); setRev(r => r + 1);
    const restore = (back: Equipment, keys: Key[]) => { latest.current = back; keys.forEach(k => dirty.current.add(k)); setE(back); setRev(r => r + 1); };
    const backs: (() => void)[] = [];
    let what = 'Retiré';
    if (mass(next) < mass(before)) backs.push(() => restore(putBack(latest.current, before, patch), Object.keys(patch) as Key[]));
    else if (next.pin && !same(before.pin, next.pin)) { what = before.pin ? 'Épingle déplacée' : 'Épingle placée'; backs.push(() => restore(putBack(latest.current, before, { pin: next.pin }), ['pin'])); }
    const undoLife = life && lifeMove(life, true);
    if (undoLife) backs.push(undoLife);
    if (backs.length) offer(what, () => backs.forEach(b => b()));
  };
  // a move of the life; a removal can be brought back by the inverse
  const act: EqTabProps['act'] = f => { const back = lifeMove(f); if (back) offer('Retiré', back); };
  const flush = () => { if (rev && name) persist(latest.current); };
  // the equipment must have a name before it is written, shown full screen or printed (the QR code leads to it)
  const valid = () => { if (name) { flush(); return true; } setError("Nommez l'équipement."); setTab('sheet'); return false; };
  const close = () => {
    if (name) { flush(); onClose(); return; }
    if (rev && !leaving) { setLeaving(true); return; }   // typed, but nothing is written without a name: a second touch abandons it
    onClose();
  };
  // says what goes with it and, once done, offers "Annuler" for 8 seconds: the record and its place in the parts it served come back
  const remove = () => {
    const rec = state.equipments[e.id];
    if (!rec) return;
    const gives = [typedLost(e), lostByDeleting(shown, cited)].filter(Boolean).join(' ; ');
    if (!window.confirm(`Supprimer l'équipement ${name || 'sans nom'} ? Sont effacés : ${gives || 'la fiche vide'}. « Annuler » le remet pendant 8 secondes.`)) return;
    const served = Object.values(state.spares || {}).filter(sp => sp.equipmentIds.includes(rec.id)).map(sp => sp.id);
    gone.current = true;
    const listed = state.processes.filter(p => p.equipmentIds?.includes(rec.id)).map(p => p.id);
    update(d => { deleteEquipment(d, rec.id); });
    (offerBack ?? offer)(`Équipement supprimé : ${name || 'sans nom'}`, () => update(d => {
      d.equipments[rec.id] = rec;
      served.forEach(id => { const sp = d.spares[id]; if (sp && !sp.equipmentIds.includes(rec.id)) sp.equipmentIds = [...sp.equipmentIds, rec.id]; });
      d.processes.forEach(p => { if (listed.includes(p.id) && !p.equipmentIds?.includes(rec.id)) p.equipmentIds = [...(p.equipmentIds || []), rec.id]; });
    }));
    onClose();
  };
  // "Remettre la fiche": the sheet was deleted elsewhere; what is typed here is written again, without the life this copy holds (it is older than the deletion)
  const putFile = () => {
    const x = { ...latest.current } as Record<string, unknown>;
    [...LIFE_KEYS, 'gone', 'touched'].forEach(k => { delete x[k]; });
    const fresh = { ...x, inspections: [] } as unknown as Equipment;
    update(d => { if (!d.equipments[fresh.id]) d.equipments[fresh.id] = fresh; });
    dirty.current.clear(); latest.current = fresh; setE(fresh);
  };
  // Back in service: the reason of the retirement stays on the sheet, with its date ("Retiré le 05/10/2026 : vendu"), instead of going with the retirement
  const reinstate = (x: Equipment): Equipment => {
    const out = reinstateEquipment(x), why = x.retiredNote?.trim();
    return x.retiredAt ? { ...out, retiredNote: `Retiré le ${frDate(x.retiredAt.slice(0, 10))}${why ? ` : ${why}` : ''}` } : out;
  };
  const copy = () => { if (!valid()) return; const c = duplicateEquipment(e); update(d => { d.equipments[c.id] = c; }); onCopy?.(c); };
  const openStation = () => { if (valid()) setStation(true); };
  const openRetire = () => { if (valid()) setRetiring({ date: isoDate(now), note: '' }); };
  const onKey = (ev: React.KeyboardEvent) => {
    const i = TABS.findIndex(t => t.k === tab), n = TABS.length;
    const to = ev.key === 'ArrowRight' ? (i + 1) % n : ev.key === 'ArrowLeft' ? (i + n - 1) % n : ev.key === 'Home' ? 0 : ev.key === 'End' ? n - 1 : -1;
    if (to < 0) return;
    ev.preventDefault(); setTab(TABS[to].k); document.getElementById(`${uid}-tab-${TABS[to].k}`)?.focus();
  };

  // the holder and the deputy are told in the routine tab but typed in the "Fiche" tab: that is where a missing one leads
  const { pct, missing: gaps } = completeness(e), open = openAnomalies(e).length, missing = gaps.map(m => (m.key === 'holder' || m.key === 'deputy' ? { ...m, tab: 'sheet' as EqTab } : m));
  const props: EqTabProps = { e, saved, state, by, set, act, nav, openStation };
  const since = txt(e.stoppedSince), stopped = since ? `${frDate(since.slice(0, 10))} à ${since.slice(11, 16)}` : '';
  const lv = eqLevel(e, todos), routine = INSPECTION_STATE[inspectionState(e, now, state.params)].label, note = e.retiredNote?.trim();
  const banner = st === 'stopped' ? { text: lv.label, detail: `${lv.label === "À l'arrêt" ? '' : "à l'arrêt "}depuis ${formatHours(Math.max(0, hoursBetween(since, now) ?? 0))} (${stopped})` }
    : st === 'retired' ? { text: 'Retiré du service', detail: `le ${frDate(e.retiredAt!.slice(0, 10))}${note ? ` : ${note}` : ''}` }
      : { text: lv.label, detail: `En service${routine === lv.label ? '' : ` · ${routine}`}${note ? ` · ${note}` : ''}` };
  const cited = citedBy(state, e.id), deletable = canDelete(shown, cited), lost = lostByDeleting(shown);

  return (
    <Modal xwide onClose={close} title={isNew && !name ? 'Nouvel équipement' : `Équipement · ${name || 'à nommer'}`}
      subtitle={[kindLabel(kindOf(e)), e.group?.trim(), norm(e.location) === norm(e.group) ? '' : e.location.trim()].filter(Boolean).join(' · ')}
      footer={<>
        {error && <span role="alert" className="text-[11px] font-semibold text-red-700">{error}</span>}
        {away ? <span className="mr-auto text-[11px] font-semibold text-red-700">Non enregistré</span>
          : storageFull && name ? <span role="alert" className="mr-auto text-[11px] font-semibold text-red-700">Non enregistré : le navigateur est plein</span>
          : <span className="mr-auto text-[11px] text-slate-500">{name ? (rev ? 'Enregistrement…' : 'Enregistré automatiquement') : "Nommez l'équipement pour l'enregistrer"}</span>}
        <Button kind="primary" onClick={close}>Fermer</Button>
      </>}>
      <div className="space-y-4">
        <StorageNote />
        {!isNew && <FlowUses quiet tool="3.3" id={e.id} />}
        <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${BANNER_BOX[lv.level]}`}>
          <StatusBadge level={lv.level} text={banner.text} /><span className="min-w-0 flex-1 text-slate-800">{banner.detail}</span>
          {!isNew && st !== 'retired' && <Button aria-label={`Signaler un problème : ${name}`} onClick={() => setReporting(true)}>Signaler</Button>}
        </div>
        {away && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
            <span className="min-w-0 flex-1 font-semibold">Cet équipement a été supprimé ailleurs : ce que vous avez tapé n'est pas enregistré.</span>
            <Button onClick={putFile}>Remettre la fiche</Button><Button onClick={onClose}>Fermer</Button>
          </div>
        )}
        {leaving && !name && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">Rien n'est enregistré tant que l'équipement n'a pas de nom. Nommez-le dans l'onglet Fiche, ou touchez de nouveau « Fermer » pour abandonner ce qui a été saisi.</p>}
        {st !== 'retired' && pct < 100 && !!name && (
          <div className="flex flex-wrap items-center gap-3">
            <Ring pct={pct} size={44} />
            <div className="min-w-0 flex-1 text-[11px]">
              <div className="font-semibold text-slate-800">Fiche complète à {pct} %</div>
              {missing.length > 0 && <div className="mt-0.5 flex flex-wrap gap-1">{missing.map(m => <button key={m.key} type="button" onClick={() => setTab(m.tab)} aria-label={`À compléter : ${m.label}`} className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-950 hover:bg-amber-100 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">{m.label}</button>)}</div>}
            </div>
          </div>
        )}
        <div role="tablist" aria-label="Sections de la fiche" onKeyDown={onKey} className="sticky top-[-1rem] z-10 -mx-4 grid grid-cols-5 gap-0.5 border-b border-slate-200 bg-white px-1 pt-1 sm:-mx-5 sm:flex sm:px-5">
          {TABS.map(t => {
            const n = t.k === 'issues' ? open : st === 'retired' ? 0 : missing.filter(m => m.tab === t.k).length, on = tab === t.k;
            return (
              <button key={t.k} id={`${uid}-tab-${t.k}`} type="button" role="tab" aria-selected={on} aria-controls={`${uid}-panel-${t.k}`} tabIndex={on ? 0 : -1} onClick={() => setTab(t.k)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 border-b-2 px-0.5 py-1 text-center text-[11px] font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold sm:flex-row sm:gap-1.5 sm:px-3 sm:text-xs ${on ? 'border-delacour-primary text-delacour-primary' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
                <span>{t.k === 'issues' ? <>Anomalies<span className="max-sm:sr-only"> et pannes</span></> : t.label}</span>
                {n > 0 && <span className={`rounded-full px-1.5 text-[11px] font-bold text-white ${t.k === 'issues' ? 'bg-red-700' : 'bg-amber-700'}`}>{n}<span className="sr-only">{t.k === 'issues' ? ` ${n > 1 ? 'anomalies ouvertes' : 'anomalie ouverte'}` : ' à compléter'}</span></span>}
              </button>
            );
          })}
        </div>
        {TABS.map(t => (
          <div key={t.k} id={`${uid}-panel-${t.k}`} role="tabpanel" aria-labelledby={`${uid}-tab-${t.k}`} hidden={tab !== t.k}>
            {seen.includes(t.k) && (t.k === 'routine' ? <RoutineTab {...props} /> : t.k === 'issues' ? <IssuesTab {...props} /> : t.k === 'cabinet' ? <CabinetTab {...props} />
              : t.k === 'checks' ? <ChecksTab {...props} /> : <SheetTab {...props} undo={offer} />)}
          </div>
        ))}
        <Sec title="Autres actions" open={st === 'retired'}>
          <div className="flex flex-wrap gap-2">
            {!isNew && (st === 'retired'
              ? <Button onClick={() => act(reinstate)}><RotateCcw size={14} />Remettre en service</Button>
              : <Button onClick={openRetire}><Archive size={14} />Retirer du service</Button>)}
            {!isNew && deletable && <DeleteButton onClick={remove}><Trash2 size={14} />Supprimer</DeleteButton>}
            {!isNew && <Button onClick={copy}><Copy size={14} />Dupliquer</Button>}
            <Button onClick={() => valid() && print(<EqPrint e={e} company={state.settings.companyName} state={state} />, EQ_PAGE)}><Printer size={14} />Affiche à imprimer</Button>
            <Button onClick={() => valid() && downloadFile(`Routine-${fileSlug(e.name)}.pdf`, routinePdf(e, sparesOf(state, e.id), { company: state.settings.companyName, date: new Date() }), 'application/pdf')}><FileDown size={14} />Feuille papier (PDF)</Button>
          </div>
          {!isNew && !deletable && <p role="note" className="text-[11px] text-slate-600">Pas de suppression : {lostByDeleting(shown, cited)}. « Retirer du service » garde l'historique.</p>}
        </Sec>
      </div>
      {retiring && (
        <Modal onClose={() => setRetiring(null)} title={`Retirer du service : ${name}`} subtitle="Vendu, mis au rebut, remplacé : l'historique est gardé"
          footer={<><Button onClick={() => setRetiring(null)}>Annuler</Button><Button kind="primary" onClick={() => { act(x => { const day = retiring.date || isoDate(now); return retireEquipment(x, day, retiring.note.trim(), day === isoDate(now) ? nowLocal(now) : `${day}T23:59`); }); setRetiring(null); }}>Retirer du service</Button></>}>
          <div className="space-y-3">
            <p className="text-xs text-slate-700">L'équipement n'a plus de routine ni de contrôle à faire ; ses routines, anomalies, pannes et contrôles restent consultables.{lost ? ` Le supprimer effacerait : ${lost}.` : ''}</p>
            {st === 'stopped' && since && <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900">L'équipement est à l'arrêt depuis {formatHours(Math.max(0, hoursBetween(since, now) ?? 0))} ({stopped}) : l'arrêt est clos à la date du retrait, et ses heures comptées jusqu'à cette date.</p>}
            <Field label="Date du retrait"><input type="date" className={`${inputCls} max-w-[12rem]`} value={retiring.date} max={isoDate(now)} onChange={x => setRetiring({ ...retiring, date: x.target.value })} /></Field>
            <Field label="Pourquoi (facultatif)"><input className={inputCls} value={retiring.note} placeholder="Ex. : vendu, mis au rebut, remplacé par le nouveau" onChange={x => setRetiring({ ...retiring, note: x.target.value })} /></Field>
          </div>
        </Modal>
      )}
      {reporting && saved && <ReportDialog eq={saved} nav={nav} onClose={() => setReporting(false)} />}
      {station && <EqRoutine eq={e} nav={nav} onClose={() => setStation(false)} />}
      {bar}
      {printNode}
    </Modal>
  );
}
