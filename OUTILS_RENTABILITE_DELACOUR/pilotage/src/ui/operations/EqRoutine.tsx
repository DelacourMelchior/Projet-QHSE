// The routine of a piece of equipment, full screen at the machine (tablet, phone, QR code stuck on it): one point per screen, a big reference picture, three
// big buttons OK / À surveiller / Anomalie. Every answer is written at once to the draft of the equipment, so a locked phone, a call or a back gesture loses
// nothing; the routine is recorded (and its anomalies opened) only on the last screen. The equipment is always read from the store, never from the copy received.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronLeft, ChevronRight, Eye, OctagonX, Play, TriangleAlert, X } from 'lucide-react';
import type { Checkpoint, Equipment, Inspection, Level, Params, PointResult } from '../../domain/types';
import {
  clearDraft, eqStatus, INSPECTION_STATE, inspectionState, kindLabel, kindOf, lastInspection, maintCfg, openAnomalies, periodOf, recordInspection, resultOf, restartEquipment,
  ROUTINE_ON_STOP, routineOwner, saveDraft, staleDraft, stopEquipment, txt, watchPoints, WATCH_NOTE,
} from '../../domain/maintenance';
import { formatHours, hoursBetween, nowLocal } from '../../domain/base';
import { frDate, isoDate, parseDate } from '../../domain/periods';
import { formatValue } from '../../domain/numbers';
import { useStore } from '../../store/StoreContext';
import { LEVEL_STYLE, NumInput, useDialogFocus } from '../common';
import { PhotoBox } from '../PhotoBox';
import type { Nav } from '../tools';
import { Pic, PicLegend } from '../../photo/Pic';
import { StorageNote, useEqAct, useEqMove, useUndo } from './EqBits';
import { BIG, peopleOf, PeoplePick, Pick, ReportDialog, Typed } from './EqReport';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
// The answer of one point, as a square with a symbol (colour and symbol and words: never the colour alone)
export const CELL: Record<PointResult | 'none', { cls: string; sym: string; label: string }> = {
  ok: { cls: 'bg-emerald-700 text-white', sym: '✓', label: 'OK' },
  watch: { cls: 'bg-amber-700 text-white', sym: '!', label: 'À surveiller' },
  ko: { cls: 'bg-red-700 text-white', sym: '✕', label: 'Anomalie' },
  none: { cls: 'bg-slate-200 text-slate-700', sym: '–', label: 'Pas de réponse' },
};

// The first day of the routine after the one in progress: the day after its period (the next working day with a daily rhythm), '' when none is found
export function nextRoutineDay(e: Equipment, now: Date, p: Params): string {
  const cur = periodOf(e, now, p);
  for (let i = 1; i <= 40; i++) { const n = periodOf(e, new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), p); if (n.from > cur.to) return n.from; }
  return '';
}
export const longDate = (iso: string) => parseDate(iso)?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) ?? '';

// ---- measured values (also read by the tab of the routine). A value outside [min, max] counts as an anomaly, as in the domain.
export const outOfBounds = (cp: Checkpoint, v: number | null | undefined) => v != null && ((cp.min != null && v < cp.min) || (cp.max != null && v > cp.max));
export const hasBounds = (cp: Checkpoint) => cp.min != null || cp.max != null;
export function boundsText(cp: Checkpoint): string {
  const u = cp.unit ? ` ${cp.unit}` : '', f = (x: number) => formatValue(x, '');
  return cp.min != null && cp.max != null ? `entre ${f(cp.min)} et ${f(cp.max)}${u}` : cp.min != null ? `au moins ${f(cp.min)}${u}` : `au plus ${f(cp.max ?? 0)}${u}`;
}
// A routine kept as a summary (older than 24 months) holds its worst result only, no answer per point
export const isSummary = (insp: Inspection) => !insp.results?.length && !!insp.worst;
// What a past routine says of a point (by its id): the answer, an out-of-bounds value counting as an anomaly, and the value. For a summary the answer is the worst
// result of the whole routine (`sum` says so: it is not the answer of this point).
export function cellOf(e: Equipment, insp: Inspection, i: number): { r: PointResult | undefined; v: number | null; sum: boolean } {
  if (isSummary(insp)) return { r: insp.worst, v: null, sum: true };
  const cp = e.checkpoints[i], j = insp.ids && cp?.id ? insp.ids.indexOf(cp.id) : i, v = j >= 0 ? insp.values?.[j] ?? null : null, r = resultOf(e, insp, i);
  return { r: r && r !== 'ko' && outOfBounds(cp, v) ? 'ko' : r, v, sum: false };
}
// The measured values of a point at the routines already made, oldest first
export function readingsOf(e: Equipment, i: number): { date: string; value: number }[] {
  return [...e.inspections].sort((a, b) => `${a.date}${a.at ?? ''}`.localeCompare(`${b.date}${b.at ?? ''}`)).flatMap(insp => { const v = cellOf(e, insp, i).v; return v === null ? [] : [{ date: insp.date, value: v }]; });
}

// The routine under way: the typed content of the domain, plus what is said about each point in anomaly (photo, nature, a word), kept by point id
type Extra = { photo?: string; nature?: string; note?: string };
type Draft = NonNullable<Equipment['routineDraft']> & { extra?: Record<string, Extra> };
interface Done { by: string; opened: string[]; promoted: string[]; closed: string[]; dangers: string[] }

const Pill = ({ level, text }: { level: Level; text: string }) => (
  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-base font-bold ${LEVEL_STYLE[level].badge}`}><span className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLE[level].dot}`} />{text}</span>
);
const Fact = ({ children }: { children: React.ReactNode }) => <p className="text-lg text-slate-800">{children}</p>;
const ANS: { r: PointResult; Icon: typeof Check; on: string; off: string }[] = [
  { r: 'ok', Icon: Check, on: 'border-emerald-900 bg-emerald-700 text-white', off: 'border-emerald-700 bg-white text-emerald-800' },
  { r: 'watch', Icon: Eye, on: 'border-amber-900 bg-amber-700 text-white', off: 'border-amber-700 bg-white text-amber-900' },
  { r: 'ko', Icon: TriangleAlert, on: 'border-red-900 bg-red-700 text-white', off: 'border-red-700 bg-white text-red-800' },
];
const area = 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-gold';
// the buttons of the foot on a phone: 48 px for the navigation, 44 px for the two alerts, a label that wraps rather than going out of the screen (320 px)
const foot = 'min-w-0 text-center leading-tight max-sm:min-h-[48px] max-sm:w-full max-sm:gap-1 max-sm:px-2 max-sm:text-base';
const alertBtn = 'min-w-0 text-center leading-tight max-sm:min-h-[44px] max-sm:gap-1.5 max-sm:px-2 max-sm:text-sm';

export function EqRoutine({ eq, nav, onClose }: { eq: Equipment; nav: Nav; onClose(): void }) {
  const { state, author, storageFull } = useStore();
  const act = useEqAct();
  const { bar, offer } = useUndo();
  const undoEnd = useRef<() => void>(() => {}), noted = useEqMove((_w, back) => { undoEnd.current = back; });   // the routine just noted: its "Annuler" is drawn on the final screen, no toast
  const move = useEqMove(offer);   // a move of the life with its "Annuler" (the inverse of the move, never a snapshot)
  const e = state?.equipments[eq.id] ?? eq, saved = !!state?.equipments[eq.id];
  const draft = e.routineDraft as Draft | undefined;
  const [who, setWho] = useState(() => draft?.by || (state ? routineOwner(state, e, isoDate(new Date())).who : '') || (author !== 'anonyme' ? author : ''));
  const [raw, setStep] = useState(0);   // 0: who and where we are, 1…n: the points, n + 1: the summary (clamped below: points can be removed meanwhile)
  const [done, setDone] = useState<Done | null>(null), [report, setReport] = useState(false), [arm, setArm] = useState(false);   // arm: "Équipement à l'arrêt" touched once, waiting for the second touch (5 s)
  const root = useRef<HTMLDivElement>(null), head = useRef<HTMLHeadingElement>(null), touch = useRef<number | null>(null), lastGo = useRef(0), live = useRef({ next() {}, prev() {} });
  const pts = useMemo(() => e.checkpoints.flatMap((cp, i) => (cp.label.trim() ? [{ cp, i, k: cp.id ?? `#${i}` }] : [])), [e.checkpoints]);
  type Pt = (typeof pts)[number];

  useDialogFocus(root);   // the page behind is inert, the focus goes back to what opened the screen at the closing
  useEffect(() => { if (!arm) return; const t = window.setTimeout(() => setArm(false), 5000); return () => window.clearTimeout(t); }, [arm]);
  // keys: Escape closes the top window only (the draft is already written), arrows move; the screen stays on, and back on when the page comes back to the front
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest('input,textarea,select') || root.current !== [...document.querySelectorAll('[role=dialog]')].at(-1)) return;
      if (ev.key === 'Escape') onClose();
      else if (ev.key === 'ArrowRight') live.current.next();
      else if (ev.key === 'ArrowLeft') live.current.prev();
    };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    const lock: { v?: WakeLockSentinel } = {};
    let on = true;
    const ask = async () => { try { const l = await navigator.wakeLock?.request('screen'); if (l && on) lock.v = l; else void l?.release(); } catch { /* refused (no https, battery saver): the screen may turn off */ } };
    const seen = () => { if (document.visibilityState === 'visible') void ask(); };
    void ask();
    document.addEventListener('visibilitychange', seen);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; on = false; document.removeEventListener('visibilitychange', seen); void lock.v?.release().catch(() => {}); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { head.current?.focus({ preventScroll: true }); }, [raw, !!done]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;

  const name = e.name.trim() || 'Équipement sans nom', now = new Date(), today = isoDate(now), cfg = maintCfg(state.params);
  const st = eqStatus(e), n = pts.length, END = n + 1, retired = st === 'retired', step = Math.min(raw, END);
  const res = (p: Pt) => draft?.results[p.k], val = (p: Pt) => draft?.values[p.k] ?? null;
  const eff = (p: Pt): PointResult | undefined => { const r = res(p); return r && r !== 'ko' && outOfBounds(p.cp, val(p)) ? 'ko' : r; };
  const complete = n > 0 && pts.every(p => res(p));
  const count = (r: PointResult) => pts.filter(p => eff(p) === r).length;
  const opens = openAnomalies(e);
  const stale = !!draft && staleDraft(e, now, state.params);   // a routine begun long ago: starting again is the main action
  const canStart = !!who.trim() && n > 0 && saved && !retired && st !== 'stopped';   // a stopped equipment takes no routine: it resumes when it runs again
  const insp = inspectionState(e, now, state.params), redo = !draft && insp === 'ok';   // the routine of the period is made: starting another one is a second choice

  // ---- writing: always through the store, on the record as it is now
  const patch = (f: (d: Draft) => Draft) => act(eq.id, x => saveDraft(x, f((x.routineDraft as Draft | undefined) ?? { date: nowLocal(), by: who, results: {}, values: {}, note: '' })));
  const go = (to: number) => { lastGo.current = Date.now(); setArm(false); setStep(Math.min(END, Math.max(0, to))); };
  const first = () => { const i = pts.findIndex(p => !res(p)); return i < 0 ? END : i + 1; };
  const start = () => { if (canStart) go(draft ? first() : 1); };
  const pickWho = (v: string) => { setWho(v); if (draft) patch(d => ({ ...d, by: v })); };
  const answer = (p: Pt, r: PointResult) => {
    if (Date.now() - lastGo.current < 450) return;   // a second touch meant for the previous screen is not an answer
    patch(d => ({ ...d, by: who || d.by, results: { ...d.results, [p.k]: r } }));
    if (r !== 'ko' && !hasBounds(p.cp)) go(step + 1);
    else if (r === 'ko') window.setTimeout(() => document.getElementById('eqr-ko')?.scrollIntoView({ block: 'nearest' }), 80);   // the details of the anomaly open under the answers: they come into view
  };
  const setValue = (p: Pt, v: number | null) => patch(d => ({ ...d, by: who || d.by, values: { ...d.values, [p.k]: v } }));
  const setExtra = (p: Pt, x: Extra) => patch(d => ({ ...d, by: who || d.by, extra: { ...d.extra, [p.k]: { ...d.extra?.[p.k], ...x } } }));
  const discard = () => { move(eq.id, 'Routine commencée retirée', clearDraft); };
  const submit = () => {
    const d = draft, by = (who || d?.by || '').trim();
    if (!d || !complete || !saved) return;
    if (!by) { go(0); return; }
    const at = new Date();
    const extra = Object.fromEntries(pts.filter(p => p.cp.id && eff(p) === 'ko').map(p => [p.cp.id!, d.extra?.[p.k] ?? {}]));
    const insp: Inspection = {
      date: isoDate(at), at: nowLocal(at), by, note: d.note,
      results: e.checkpoints.map((cp, i) => (cp.label.trim() ? d.results[cp.id ?? `#${i}`] ?? 'ok' : 'ok')),
      values: e.checkpoints.map((cp, i) => d.values[cp.id ?? `#${i}`] ?? null),
    };
    const m = noted(eq.id, 'Routine notée', x => {
      const known = new Set([...(x.anomalies ?? []), ...openAnomalies(x)].map(a => a.id)), r = recordInspection(x, insp);
      // what was said about a point in anomaly goes to the anomaly of that point (the one just opened, or the one already open)
      return { ...r, anomalies: (r.anomalies ?? []).map(a => { const k = a.pointId && !a.closedAt ? extra[a.pointId] : undefined; return k ? { ...a, photo: a.photo || k.photo, nature: a.nature || k.nature, note: !known.has(a.id) && k.note ? k.note : a.note } : a; }) };
    }, () => { setDone(null); setStep(END); });
    if (!m) return;
    const was = openAnomalies(m.before), is = openAnomalies(m.after), ok = new Set(pts.filter(p => p.cp.id && eff(p) === 'ok').map(p => p.cp.id!));
    setDone({ by, opened: is.filter(a => !was.some(b => b.id === a.id)).map(a => a.label), promoted: is.filter(a => !was.some(b => b.id === a.id) && a.note === WATCH_NOTE).map(a => a.label), closed: was.filter(a => !is.some(b => b.id === a.id)).map(a => a.label), dangers: is.filter(a => a.severity === 'danger' && a.pointId && was.some(b => b.id === a.id) && ok.has(a.pointId)).map(a => a.label) });
  };
  const stop = () => { move(eq.id, "Équipement noté à l'arrêt", (x, by) => stopEquipment(x, who || by)); };
  const touchStop = () => { if (!arm) setArm(true); else { setArm(false); stop(); } };   // a stop is dated and goes up the queue in red: the first touch asks, the second writes
  const restart = () => { move(eq.id, 'Équipement remis en marche', x => restartEquipment(x, nowLocal())); };

  const stoppedSince = txt(e.stoppedSince), stoppedFor = stoppedSince ? Math.max(0, hoursBetween(stoppedSince, now) ?? 0) : 0;
  const stamp = (s: string) => (s.length > 10 ? `${s.slice(0, 10) === today ? '' : `le ${frDate(s.slice(0, 10))} `}à ${s.slice(11, 16)}` : `le ${frDate(s)}`);

  // ---- the screens
  const ownerFact = (o: ReturnType<typeof routineOwner>, holder: string) => (o.deputy ? `${holder} est absent aujourd'hui : la routine passe à ${o.who}.` : o.absent ? `${holder} est absent aujourd'hui, aucun suppléant n'est désigné.` : '');
  const startBody = (() => {
    const per = periodOf(e, now, state.params), last = lastInspection(e), owner = routineOwner(state, e, today), holder = e.operator.trim();
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-4">
          {e.photo && <Pic value={e.photo} alt="" size="t" className="h-24 w-32 shrink-0 rounded-xl" />}
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-slate-500">{[kindLabel(kindOf(e)), e.location].filter(Boolean).join(' · ') || 'Équipement'}</p>
            <h1 ref={head} tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none sm:text-4xl">{name}</h1>
          </div>
        </div>
        {retired && <p className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-xl font-semibold text-slate-800">Équipement retiré du service le {frDate(e.retiredAt ?? '')}{e.retiredNote ? ` : ${e.retiredNote}` : ''}. Aucune routine n'est demandée.</p>}
        {st === 'stopped' && <p role="status" className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-xl font-semibold text-red-900">À l'arrêt depuis {formatHours(stoppedFor)} ({stamp(stoppedSince)}). {ROUTINE_ON_STOP}</p>}
        {!saved && <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-lg text-amber-950">Équipement pas encore enregistré : la routine ne serait pas notée.</p>}
        {st === 'service' && <div className="space-y-2"><Pill level={INSPECTION_STATE[insp].tone} text={INSPECTION_STATE[insp].label} /><Fact>Période en cours : du {frDate(per.from)} au {frDate(per.to)}.</Fact></div>}
        {!retired && <Fact>{last ? `Dernière routine le ${frDate(last.date)}${last.by ? ` (${last.by})` : ''}.` : 'Aucune routine enregistrée.'}</Fact>}
        {opens.slice(0, 3).map(a => <Fact key={a.id}><strong className={a.severity === 'danger' ? 'text-red-800' : ''}>{a.severity === 'danger' ? 'Danger' : 'Anomalie'} ouvert{a.severity === 'danger' ? '' : 'e'} :</strong> {a.label}, depuis le {frDate(a.date)}.</Fact>)}
        {opens.length > 3 && <Fact>et {plural(opens.length - 3, 'autre anomalie ouverte', 'autres anomalies ouvertes')}.</Fact>}
        {!retired && n === 0 && <p className="rounded-2xl bg-amber-50 p-4 text-lg text-amber-950">Aucun point de routine n'est écrit pour cet équipement.</p>}
        {!retired && n > 0 && (
          <>
            {draft && (
              <div className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
                <p className="text-lg font-semibold text-amber-950">Routine commencée {stamp(draft.date)} par {draft.by || 'une personne'}{stale ? ' : ancienne' : ''} : {plural(pts.filter(p => draft.results[p.k]).length, 'réponse')} sur {n}.</p>
                {stale && <p className="text-lg text-amber-950">Ces réponses datent du {frDate(draft.date.slice(0, 10))}{draft.date.length > 10 ? ` à ${draft.date.slice(11, 16)}` : ''}. « Reprendre » les noterait dans la routine d'aujourd'hui.</p>}
                <button type="button" className={`${BIG} ${stale ? 'border-emerald-900 bg-emerald-700 text-white' : 'border-amber-800 text-amber-950'}`} onClick={discard}>Recommencer</button>
              </div>
            )}
            {ownerFact(owner, holder) && <Fact>{ownerFact(owner, holder)}</Fact>}
            <PeoplePick people={peopleOf(e, author)} value={who} onChange={pickWho} label="Qui fait la routine ?" />
            {!who.trim() && <Fact>Aucune personne choisie pour faire la routine : « Commencer » reste fermé.</Fact>}
          </>
        )}
      </div>
    );
  })();

  const pointBody = (p: Pt) => {
    const { cp } = p, r = res(p), x = eff(p), v = val(p), ex = draft?.extra?.[p.k] ?? {}, open = opens.find(a => a.pointId === cp.id && cp.id), watching = !!cp.id && watchPoints(e).includes(cp.id);
    const reads = readingsOf(e, p.i).slice(-3), bad = hasBounds(cp) && outOfBounds(cp, v);
    return (
      <div className="mx-auto grid max-w-6xl gap-6 max-sm:gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          {cp.photo ? <><Pic value={cp.photo} alt={`Photo de référence : ${cp.label}`} fit="contain" size="v" className="max-h-[32vh] w-full rounded-2xl bg-slate-100 max-sm:max-h-[18vh] lg:max-h-[55vh]" /><PicLegend value={cp.photo} className="text-lg text-slate-700" /></>
            : <div className="flex h-32 items-center justify-center rounded-2xl bg-slate-100 text-base text-slate-500 max-sm:h-14 lg:h-48">Pas de photo de référence</div>}
        </div>
        <div className="space-y-4 max-sm:space-y-2">
          <h1 ref={head} tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none max-sm:text-2xl">{cp.label}</h1>
          {cp.criterion && <p className="text-2xl text-slate-800 max-sm:text-xl">{cp.criterion}</p>}
          {watching && <p className="rounded-xl bg-amber-100 p-3 text-lg font-semibold text-amber-950">À surveiller à la dernière routine : une deuxième fois de suite, il devient une anomalie.</p>}
          {open && <p className="rounded-xl bg-red-50 p-3 text-lg font-semibold text-red-900">{open.severity === 'danger' ? `Danger ouvert depuis le ${frDate(open.date)}. Un point OK ne le ferme pas : il reste ouvert jusqu'à la vérification du responsable.` : `Anomalie ouverte depuis le ${frDate(open.date)}. Un point OK à cette routine la ferme.`}</p>}
          {hasBounds(cp) && (
            <div className="space-y-1">
              <label htmlFor="eqr-value" className="block text-lg font-semibold text-slate-700">Valeur mesurée (facultatif){cp.unit ? `, en ${cp.unit}` : ''}</label>
              <p className="text-base text-slate-600">Plage attendue : {boundsText(cp)}.{reads.length > 0 && ` Dernières valeurs : ${reads.map(x => formatValue(x.value, '')).join(', ')}.`}</p>
              <NumInput key={p.k} id="eqr-value" value={v} onChange={nv => setValue(p, nv)} className="!min-h-[56px] !text-2xl" />
              {bad && <p role="status" className="text-lg font-bold text-red-800">Hors bornes : {formatValue(v, cp.unit || '')}, plage attendue {boundsText(cp)}. Compté comme anomalie.</p>}
            </div>
          )}
          {/* the three answers stay at the bottom of the screen whatever the length of the text above (anomaly, point to watch, range of values): a phone shows them without scrolling */}
          <div role="radiogroup" aria-label={`Résultat : ${cp.label}`} className="sticky bottom-0 z-10 grid grid-cols-3 gap-2 bg-white py-2 max-sm:-mx-4 max-sm:border-t max-sm:border-slate-200 max-sm:px-4">
            {ANS.map(a => (
              <button key={a.r} type="button" role="radio" aria-checked={r === a.r} onClick={() => answer(p, a.r)}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-base font-bold sm:flex-row sm:gap-2 sm:text-lg ${r === a.r ? a.on : a.off}`}><a.Icon size={24} aria-hidden />{CELL[a.r].label}</button>
            ))}
          </div>
          {x === 'ko' && (
            <div key={p.k} id="eqr-ko" className="space-y-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3 max-sm:mb-3">
              <p className="text-lg font-bold text-red-900">Anomalie sur ce point</p>
              <PhotoBox value={ex.photo || ''} label="Photo de l'anomalie" onChange={v => setExtra(p, { photo: v })} />
              <Pick chips list={cfg.natures} value={ex.nature || ''} onChange={v => setExtra(p, { nature: v })} label="Nature de l'anomalie" />
              <Typed area rows={2} value={ex.note || ''} onSave={v => setExtra(p, { note: v })} className={area} placeholder="Un mot sur ce qui ne va pas" aria-label="Un mot sur l'anomalie" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const endBody = (() => {
    const ok = count('ok'), watch = count('watch'), ko = count('ko'), missing = n - ok - watch - ko, allOk = n > 0 && ok === n;
    const list = (
      <ul className="space-y-2">
          {pts.map(p => {
            const x = eff(p), c = CELL[x ?? 'none'], v = val(p);
            return (
              <li key={p.k}>
                <button type="button" onClick={() => go(pts.indexOf(p) + 1)} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border-2 border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
                  <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-black ${c.cls}`}>{c.sym}</span>
                  <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-slate-900">{p.cp.label}</span><span className="block text-base text-slate-600">{c.label}{v !== null ? ` · ${formatValue(v, p.cp.unit || '')}` : ''}{outOfBounds(p.cp, v) ? ` · hors bornes (${boundsText(p.cp)})` : ''}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
    );
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 ref={head} tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Récapitulatif</h1>
        {allOk
          ? <p className="text-2xl font-semibold text-slate-800">{n} sur {n} OK, rien à signaler</p>
          : <p className="text-2xl font-semibold text-slate-800">{plural(n, 'point')} : {[ok && `${ok} OK`, watch && `${watch} à surveiller`, ko && plural(ko, 'anomalie'), missing && `${missing} sans réponse`].filter(Boolean).join(', ')}</p>}
        {allOk ? <details className="rounded-xl border-2 border-slate-200 px-3 py-1"><summary className="flex min-h-[44px] cursor-pointer items-center text-lg font-semibold text-delacour-primary">Voir le détail</summary><div className="pb-2">{list}</div></details> : list}
        {stale && draft && <p role="status" className="rounded-xl bg-amber-50 p-3 text-lg font-semibold text-amber-950">Ces réponses datent du {frDate(draft.date.slice(0, 10))}{draft.date.length > 10 ? ` à ${draft.date.slice(11, 16)}` : ''}, la routine serait notée aujourd'hui.</p>}
        <Typed area rows={2} value={draft?.note ?? ''} onSave={v => patch(d => ({ ...d, by: who || d.by, note: v }))} className={area} placeholder="Un mot pour toute la routine (facultatif)" aria-label="Un mot pour toute la routine" />
        <p className="text-lg text-slate-800">Routine faite par <strong>{(who || draft?.by) || 'personne'}</strong>. <button type="button" className="min-h-[44px] font-semibold text-delacour-primary underline" onClick={() => go(0)}>Changer</button></p>
        {ko > 0 && <p className="text-lg text-slate-800">{plural(ko, 'point en anomalie ajoute', 'points en anomalie ajoutent')} une anomalie ouverte à la fiche de l'équipement.</p>}
      </div>
    );
  })();

  const nextDay = done && !storageFull ? nextRoutineDay(e, now, state.params) : '';
  const doneBody = done && (
    <div className="mx-auto max-w-3xl space-y-4">
      {storageFull
        ? <h1 ref={head} tabIndex={-1} role="alert" className="flex items-center gap-3 text-3xl font-black text-red-800 focus:outline-none"><OctagonX size={36} aria-hidden />Non enregistré : le navigateur est plein</h1>
        : <h1 ref={head} tabIndex={-1} className="flex items-center gap-3 text-3xl font-black text-emerald-800 focus:outline-none"><Check size={36} aria-hidden />Routine notée</h1>}
      {storageFull && <Fact>La routine de {name} n'est pas conservée sur cet appareil.</Fact>}
      {!storageFull && <Fact>Routine de {name} faite par {done.by}, {stamp(nowLocal())}.</Fact>}
      {done.dangers.length > 0 && <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-lg font-bold text-red-900">{plural(done.dangers.length, 'danger reste ouvert', 'dangers restent ouverts')} jusqu'à la vérification du responsable : {done.dangers.join(', ')}.</p>}
      {done.opened.length > 0 && <Fact>{plural(done.opened.length, 'anomalie ouverte', 'anomalies ouvertes')} : {done.opened.join(', ')}.</Fact>}
      {done.promoted.length > 0 && <Fact>À surveiller deux routines de suite : {done.promoted.join(', ')}.</Fact>}
      {done.closed.length > 0 && <Fact>{plural(done.closed.length, 'anomalie fermée', 'anomalies fermées')} par un point OK : {done.closed.join(', ')}.</Fact>}
      {done.opened.length === 0 && done.closed.length === 0 && <Fact>Aucune anomalie ouverte ni fermée.</Fact>}
      {nextDay && <Fact>La prochaine routine commence le {longDate(nextDay)}.</Fact>}
      {!storageFull && <button type="button" className="min-h-[44px] text-base font-semibold text-delacour-primary underline" onClick={() => undoEnd.current()}>Annuler la routine</button>}
    </div>
  );

  const body = done ? doneBody : step === 0 || retired ? startBody : step === END ? endBody : pointBody(pts[step - 1]);
  const said = done ? (storageFull ? 'Non enregistré : le navigateur est plein' : 'Routine notée') : step === 0 || retired ? `Routine de ${name}` : step === END ? 'Récapitulatif' : `Étape ${step} sur ${n} : ${pts[step - 1].cp.label}`;
  const canNext = done ? false : step === 0 ? canStart : step === END ? false : !!res(pts[step - 1]);
  const allDone = complete && count('ok') === n;
  const right = done || retired ? { label: 'Fermer', run: onClose, off: false }
    : step === 0 ? { label: draft ? (stale ? `Reprendre les réponses du ${frDate(draft.date.slice(0, 10))}` : 'Reprendre') : redo ? 'Refaire une routine' : 'Commencer', run: start, off: !canStart }
    : step === END ? { label: allDone ? 'Rien à signaler' : 'Valider la routine', run: submit, off: !complete || !saved }
    : { label: step === n ? 'Terminer' : 'Suivant', run: () => go(step + 1), off: !canNext };
  live.current = { next: () => { if (step === 0) start(); else if (canNext) go(step + 1); }, prev: () => { if (step > 0 && !done) go(step - 1); } };
  const level: Level = retired ? 'pending' : st === 'stopped' ? 'alert' : 'ok';
  const showPrev = step > 0 && !done && !retired, mid = !done && !retired && step > 0 && step < END;   // "Précédent" greyed at the start is not drawn; mid: a point is on screen, its answers are stuck above the foot
  const second = step === 0 && !done && !retired && (stale || redo);   // the routine of the period is made, or the answers are old: starting again is not the main action

  return createPortal(
    <div ref={root} role="dialog" aria-modal="true" aria-label={`Routine de ${name}`} tabIndex={-1} className="fixed inset-0 z-[70] flex flex-col bg-white text-slate-900 outline-none print:hidden">
      <div className="h-2 shrink-0 bg-delacour-primary" />
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-2 max-sm:py-1">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{name}</div>
          <div className="flex flex-wrap items-center gap-x-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${LEVEL_STYLE[level].dot}`} aria-hidden />{retired ? 'Retiré du service' : st === 'stopped' ? "À l'arrêt" : 'En service'}</span>
            {!done && step > 0 && step < END && !retired && <span className="font-mono">Étape {step} sur {n}</span>}
            {!done && step === END && <span>Récapitulatif</span>}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la routine" className="rounded-lg p-3 text-slate-600 hover:bg-slate-100"><X size={26} /></button>
      </header>
      <StorageNote near className="mx-4 mt-2 shrink-0 !text-base" />   {/* the banner of the page is under this screen: the warning from 80 % and the refusal to write are said here */}
      <p className="sr-only" role="status" aria-live="polite">{said}</p>
      <main className={`flex-1 overflow-y-auto px-4 py-6 max-sm:pt-3 ${mid ? 'max-sm:pb-0' : 'max-sm:pb-3'}`}
        onTouchStart={ev => { touch.current = ev.currentTarget.contains(ev.target as Node) && !(ev.target as HTMLElement).closest('input,textarea,select') ? ev.touches[0].clientX : null; }}
        onTouchEnd={ev => { if (touch.current !== null) { const d = ev.changedTouches[0].clientX - touch.current; if (Math.abs(d) > 70) { if (d < 0) live.current.next(); else live.current.prev(); } touch.current = null; } }}>
        {body}
      </main>
      <footer className="shrink-0 border-t border-slate-200 px-4 py-3 max-sm:px-3 max-sm:py-1">
        <div className="grid grid-cols-2 items-center gap-3 max-sm:gap-2 sm:grid-cols-[1fr_auto_1fr]">
          {showPrev && <button type="button" className={`${BIG} ${foot} justify-self-start border-slate-300 bg-white text-slate-800`} onClick={() => go(step - 1)}><ChevronLeft size={26} className="shrink-0" />Précédent</button>}
          <button type="button" className={`${BIG} ${foot} justify-self-end ${showPrev ? 'max-sm:col-start-2' : 'max-sm:col-span-2'} sm:col-start-3 ${second ? 'border-slate-400 bg-white text-slate-800' : 'border-emerald-900 bg-emerald-700 text-white'}`} disabled={right.off} onClick={right.run}>{right.label}{!done && !retired && step < END && <ChevronRight size={26} className="shrink-0" />}</button>
        </div>
        {!retired && !done && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 max-sm:mt-1 max-sm:gap-2 max-sm:pt-1">
            <button type="button" className={`${BIG} ${alertBtn} border-red-700 bg-white text-red-800`} onClick={() => setReport(true)}><TriangleAlert size={22} className="shrink-0" />Signaler un problème</button>
            <button type="button" aria-live="polite" className={`${BIG} ${alertBtn} ${st === 'stopped' ? 'border-emerald-900 bg-emerald-700 text-white' : arm ? 'border-red-900 bg-red-700 text-white' : 'border-red-700 bg-white text-red-800'}`} disabled={!saved} onClick={st === 'stopped' ? restart : touchStop}>
              {st === 'stopped' ? <><Play size={22} className="shrink-0" />Remis en marche</> : arm ? <><OctagonX size={22} className="shrink-0" />Confirmer l'arrêt</> : <><OctagonX size={22} className="shrink-0" />Équipement à l'arrêt</>}
            </button>
          </div>
        )}
      </footer>
      {/* the bar "Annuler" of EqBits is fixed at the bottom of the screen: moved above the foot (on a phone above the answers too, which are stuck over the foot) */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-44 h-14 [transform:translateZ(0)] [&>*]:pointer-events-auto ${mid ? 'max-sm:bottom-52' : 'max-sm:bottom-28'}`}>{bar}</div>
      {report && <ReportDialog eq={e} nav={{ ...nav, newAction: (...a: Parameters<Nav['newAction']>) => { onClose(); nav.newAction(...a); } }} onClose={() => setReport(false)} />}
    </div>, document.body);
}
