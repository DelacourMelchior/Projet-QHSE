// Second tab of the sheet of an order (tool 3.4): one card per milestone, readable at 375 px. The big buttons Conforme / Non conforme open a panel in place (who, value
// with its bounds, proof and gap photos, remark, second person when the milestone is critical); the check is written at once by `act` (checkMilestone), its history is
// shown under the milestone, nothing is erased by checking again. Reopen, "sans objet" and waiver have their panel too; a non-conform milestone opens ONE defect in
// the red bin (5.1), remembered on the milestone. The definition of a milestone (typed content, folded) goes through `set`; adding, removing and moving are moves of the
// structure and go through `act`. "Sans objet", removing and putting back ask a person and, for the first two, a reason or a look at what goes with the milestone; what the domain
// refuses is told as a fact. On a signed PV the definitions are read only and "Corriger" is the one way to change one (person, reason, journal line, new seal).
import { useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Lock, Monitor, Plus, RotateCcw, ShieldAlert, Trash2, TriangleAlert, X } from 'lucide-react';
import type { Delivery, Level, Milestone, MilestoneEvent, Nc, State } from '../../domain/types';
import { businessOf, nb, nowLocal } from '../../domain/base';
import { sopCfg, sopPhase } from '../../domain/instructions';
import { calibrationsDue } from '../../domain/maintenanceChecks';
import { kindOf } from '../../domain/maintenance';
import { formatValue } from '../../domain/numbers';
import { isoDate } from '../../domain/periods';
import { decisionLabel, NC_STATE, ncState } from '../../domain/quality';
import { idOf, addMilestone, blockedAt, checkMilestone, correctLocked, isLocked, linkMilestoneNc, logDelivery, milestoneProgress, milestoneStatus, moveMilestone, ncFromMilestone, ncLinkState, ncOf, outOfBounds, removeMilestone, reopenMilestone, setMilestoneNa, waiveMilestone, type MilestoneStatus } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal, NewTab, NumInput, StatusBadge, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import { Pic } from '../../photo/Pic';
import { de, fmtMoment, type Hold, jalonsOk, own, PeoplePick, peopleOf, plural, useHold, useUndo, sentence, rcDay } from './RcBits';
import type { RcTabProps } from './RcSheet';
import { applied, Correct, type CorrectField, OFF } from './RcTabReception';

const STATUS: Record<MilestoneStatus, { label: string; level: Level; box: string }> = {
  todo: { label: 'À contrôler', level: 'pending', box: 'border-slate-200 bg-white' },
  ok: { label: 'Conforme', level: 'ok', box: 'border-emerald-200 bg-emerald-50/40' },
  reworked: { label: 'Conforme après reprise', level: 'ok', box: 'border-emerald-200 bg-emerald-50/40' },
  ko: { label: 'Non conforme', level: 'alert', box: 'border-red-300 bg-red-50/50' },
  na: { label: 'Sans objet', level: 'pending', box: 'border-slate-200 bg-slate-50' },
};
const eventText = (e: MilestoneEvent) => (e.kind === 'rework' ? 'Conforme après reprise' : e.kind === 'reopen' ? 'Rouvert' : e.kind === 'derogation' ? 'Dérogation' : e.ok ? 'Conforme' : 'Non conforme');
const eventTone = (e: MilestoneEvent) => (e.kind === 'derogation' ? 'text-amber-900' : e.kind === 'reopen' ? 'text-slate-600' : e.ok ? 'text-emerald-800' : 'text-red-800');
const withUnit = (m: Milestone, v: string) => (v.trim() ? `${v.trim()}${m.unit && !v.includes(m.unit) ? ` ${m.unit}` : ''}` : '');
const bounds = (m: Milestone): string => {
  const f = (x: number) => formatValue(x, ''), u = m.unit ? ` ${m.unit}` : '';
  return m.min != null && m.max != null ? `entre ${f(m.min)} et ${f(m.max)}${u}` : m.min != null ? `au moins ${f(m.min)}${u}` : m.max != null ? `au plus ${f(m.max)}${u}` : '';
};
const MS_FIELDS: CorrectField[] = [
  { k: 'label', label: 'Libellé' }, { k: 'point', label: 'Point à contrôler' }, { k: 'requirement', label: 'Exigence' }, { k: 'min', label: 'Mini', type: 'num' }, { k: 'max', label: 'Maxi', type: 'num' }, { k: 'unit', label: 'Unité' },
];
const ACT = 'flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark';

type Mode = 'ok' | 'ko' | 'reopen' | 'na' | 'waive' | 'back';
const TITLE: Record<Mode, string> = { ok: 'Contrôle : conforme', ko: 'Contrôle : non conforme', reopen: 'Rouvrir le jalon', na: 'Jalon sans objet', waive: 'Dérogation\u202f: passer outre un jalon non conforme', back: 'Remettre le jalon à contrôler' };
const WHO: Record<Mode, string> = { ok: 'Qui contrôle', ko: 'Qui contrôle', reopen: 'Qui rouvre', na: 'Qui écarte le jalon', waive: 'Qui passe outre', back: 'Qui remet le jalon à contrôler' };
// What stands in the way of "sans objet" (a milestone not conform that nobody passed over) and of a removal (also a defect of 5.1 without decision), read from the data as facts
const kept = (m: Milestone, nc?: Nc): string[] => [m.ok === false && !m.waivedBy ? 'jalon non conforme sans dérogation' : '', nc && (!nc.decision || nc.decision === 'attente') ? `défaut ${nc.ref} sans décision` : ''].filter(Boolean);
// What a removal takes with it, said before it is done
const carried = (m: Milestone, nc?: Nc): string => {
  const photos = [m.photo, m.gapPhoto, m.refPhoto].filter(Boolean).length, n = m.history?.length ?? 0;
  const parts = [m.ok != null ? `le résultat «\u202f${m.ok ? 'conforme' : 'non conforme'}\u202f»${m.by ? ` ${de(m.by)}` : ''}` : '', n ? plural(n, "ligne d'historique", "lignes d'historique") : '', photos ? plural(photos, 'photo') : '', m.waivedBy ? `la dérogation ${de(m.waivedBy)}` : '', m.ncId ? `le lien avec le défaut ${nc ? nc.ref : 'lié'}` : ''].filter(Boolean);
  return parts.length ? `Ce retrait emporte\u202f: ${parts.join(', ')}.` : "Le jalon n'a ni résultat, ni photo, ni défaut lié\u202f: le retrait ne perd que sa définition.";
};

// The panel opened in place under a milestone; it keeps what is typed until it is validated, then the move is written at once
const BY: Record<Mode, string> = { ok: 'Contrôle par', ko: 'Contrôle par', reopen: 'Rouvert par', na: 'Écarté par', waive: '', back: 'Remis à contrôler par' };
interface PanelProps { d: Delivery; m: Milestone; mid: string; n: number; mode: Mode; stuck: string; releasedAt: string; who: string; setWho(v: string): void; shared: boolean; names: string[]; absent: string[]; px: number; act: RcTabProps['act']; hold?: Hold; onDone(text: string): void; onRefused(text: string): void; onCancel(): void }
function Panel({ d, m, mid, n, mode, stuck, releasedAt, who, setWho, shared, names, absent, px, act, hold, onDone, onRefused, onCancel }: PanelProps) {
  const [measured, setMeasured] = useState(''), [photo, setPhoto] = useState(''), [gap, setGap] = useState(''), [text, setText] = useState(''), [second, setSecond] = useState('');
  const check = mode === 'ok' || mode === 'ko', out = check && outOfBounds(m, measured), fails = mode === 'ko' || out, b = bounds(m);
  const needText = mode === 'na' || mode === 'waive';
  // typed in the panel and not validated yet: the sheet names it before it closes
  useHold(hold, `ms-${mid}`, measured.trim() || photo || gap || text.trim() || second.trim() ? `Jalon ${n}\u202f: ${check ? 'contrôle' : 'motif'} en cours de saisie, pas encore enregistré` : '');
  const ready = !!who.trim() && (!needText || !!text.trim()) && !stuck;
  // a move the domain refuses (the order comes back as it was) writes nothing and is told as a fact
  const run = (f: (x: Delivery) => Delivery, said: string) => { if (f(d) === d) onRefused(`Jalon ${n}\u202f: rien n'est enregistré, l'outil refuse ce geste.`); else { act(f); onDone(said); } };
  const go = () => {
    const by = who.trim(), at = nowLocal(), name = `Jalon ${n}`;
    if (check) {
      act(x => checkMilestone(x, mid, {
        ok: mode === 'ok', by, at, ...(measured.trim() ? { measured: measured.trim() } : {}), ...(text.trim() ? { note: text.trim() } : {}), ...(photo ? { photo } : {}), ...(gap ? { gapPhoto: gap } : {}),
        ...(second.trim() && second.trim() !== by ? { second: second.trim() } : {}), ...(m.instrumentId ? { instrumentId: m.instrumentId } : {}),
      }));
      onDone(`${name} enregistré ${fails ? 'non conforme' : 'conforme'}${out && mode === 'ok' ? '\u202f: mesure hors de la plage attendue' : ''}.`);
    } else if (mode === 'reopen') run(x => reopenMilestone(x, mid, by, at), `${name} rouvert.`);
    else if (mode === 'na') run(x => setMilestoneNa(x, mid, text.trim(), by, at), `${name} sans objet.`);
    else if (mode === 'back') run(x => setMilestoneNa(x, mid, null, by, at), `${name} remis à contrôler.`);
    else run(x => waiveMilestone(x, mid, by, text.trim(), at), `${name}\u202f: dérogation enregistrée.`);
  };
  return (
    <div role="group" aria-label={`${TITLE[mode]}, jalon ${n}`} className="space-y-3 rounded-lg border border-slate-300 bg-white p-3">
      <p className="text-xs font-bold text-slate-900">{TITLE[mode]}</p>
      {shared && who.trim() && mode !== 'waive'   // the person of the sheet writes the gesture (a derogation names who passes over: asked each time)
        ? <p className="text-xs text-slate-700">{BY[mode]} <strong className="font-semibold text-slate-900">{who}</strong></p>
        : <PeoplePick label={WHO[mode]} value={who} onChange={setWho} names={names} absent={absent} />}
      {check && (
        <>
          <Field label={`Valeur mesurée${m.unit ? ` (${m.unit})` : ''}, facultative`} hint={b ? `Plage attendue\u202f: ${b}.` : undefined}>
            <input className={inputCls} value={measured} inputMode={b ? 'decimal' : 'text'} onChange={e => setMeasured(e.target.value)} />
          </Field>
          {out && <p role="status" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-900">{nb(`Valeur hors de la plage attendue (${b})${mode === 'ok' ? '\u202f: le jalon est enregistré non conforme' : ''}.`)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><span className="block text-xs font-semibold text-slate-700">Photo de preuve</span><PhotoBox value={photo} label={`Photo de preuve\u202f: jalon ${n}`} px={px} onChange={setPhoto} /></div>
            {fails && <div className="space-y-1"><span className="block text-xs font-semibold text-slate-700">Photo de l'écart</span><PhotoBox value={gap} label={`Photo de l'écart\u202f: jalon ${n}`} px={px} onChange={setGap} /></div>}
          </div>
          <Field label="Remarque, facultative"><input className={inputCls} value={text} onChange={e => setText(e.target.value)} /></Field>
          {m.critical && who.trim() && <PeoplePick label="Second contrôleur (jalon critique)" value={second} onChange={setSecond} names={names.filter(x => x !== who)} />}
        </>
      )}
      {mode === 'reopen' && <p className="text-xs text-slate-700">Le résultat actuel est effacé, l'historique reste.{releasedAt ? ` La libération du ${rcDay(releasedAt)} est défaite\u202f: la commande repasse à libérer.` : ''}</p>}
      {mode === 'na' && <><Field label="Motif (obligatoire)"><input className={inputCls} value={text} autoFocus placeholder="Pourquoi ce jalon ne s'applique pas à cette commande" onChange={e => setText(e.target.value)} /></Field><p className="text-xs text-slate-700">Le motif et la personne sont inscrits au journal&#8239;; le jalon reste dans le dossier.</p></>}
      {mode === 'back' && <p className="text-xs text-slate-700">Le jalon repasse à contrôler.{m.naReason?.trim() ? ` Le motif «\u202f${m.naReason.trim()}\u202f» reste inscrit au journal.` : ''}</p>}
      {stuck && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-900">{stuck}</p>}
      {mode === 'waive' && (
        <>
          <Field label="Pourquoi"><input className={inputCls} value={text} autoFocus placeholder="Raison de passer outre" onChange={e => setText(e.target.value)} /></Field>
          <p className="text-xs text-slate-700">Le jalon reste non conforme dans le dossier&#8239;; la dérogation ne retire que le blocage des jalons suivants, et la libération le dit.</p>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button kind="primary" className={OFF} disabled={!ready} onClick={go}>{check ? `Enregistrer\u202f: ${fails ? 'non conforme' : 'conforme'}` : mode === 'reopen' ? 'Rouvrir le jalon' : mode === 'na' ? 'Marquer sans objet' : mode === 'back' ? 'Remettre à contrôler' : 'Enregistrer la dérogation'}</Button>
        <Button onClick={onCancel}>Annuler</Button>
        {!ready && !stuck && <span className="text-xs text-slate-600">{!who.trim() ? 'Personne pas encore choisie.' : 'Motif pas encore écrit.'}</span>}
      </div>
    </div>
  );
}

export function RcTabMilestones({ d, set, act, hold, full, state, nav, who: given, setWho: setGiven }: RcTabProps) {
  const { author } = useStore();
  const { bar, offer } = useUndo();
  const uid = useId();
  const [mine, setMine] = useState(''), [panel, setPanel] = useState<{ id: string; mode: Mode } | null>(null), [openDefs, setOpenDefs] = useState<string[]>([]), [focusId, setFocusId] = useState(''), [said, setSaid] = useState('');
  const [fact, setFact] = useState(''), [rm, setRm] = useState<{ m: Milestone; mid: string; i: number; label: string } | null>(null), [fix, setFix] = useState<{ m: Milestone; mid: string } | null>(null);
  const who = given ?? mine, setWho = setGiven ?? setMine;   // the sheet gives the person for all its tabs; alone, the panels ask
  const declared = useRef(new Set<string>()), latest = useRef(d);   // milestones being declared to the red bin; the sheet as it is now (a removal is brought back on it)
  latest.current = d;
  const locked = isLocked(d);   // a signed PV freezes the checks: the domain refuses them, the buttons say so
  const now = new Date(), today = isoDate(now), ms = d.milestones, pr = milestoneProgress(d), block = blockedAt(d), blockAt = block ? ms.indexOf(block) : -1;
  const todo = ms.filter(m => milestoneStatus(m) === 'todo').length, px = sopCfg(state.params).photoPx, { names, absent } = peopleOf(state, d, today);
  const sops = Object.values(state.sops).sort((a, b) => a.poste.localeCompare(b.poste)), instruments = Object.values(state.equipments).filter(e => kindOf(e) === 'instrument').sort((a, b) => a.name.localeCompare(b.name));
  const overdue = new Map<string, number>();
  calibrationsDue(state, now, 0).filter(x => x.days < 0).forEach(x => { if (!overdue.has(x.e.id)) overdue.set(x.e.id, -x.days); });

  const setM = (mid: string, x: Partial<Milestone>) => set({ milestones: latest.current.milestones.map((y, j) => (idOf(y, j) === mid ? { ...y, ...x } : y)) });
  const done = (mid: string, text: string) => { setPanel(null); setFact(''); setSaid(text); window.setTimeout(() => document.getElementById(`${uid}-${mid}`)?.focus(), 0); };
  const toggleDef = (mid: string, on: boolean) => setOpenDefs(v => (on ? (v.includes(mid) ? v : [...v, mid]) : v.filter(x => x !== mid)));
  const fullscreen = () => { if (full) full('jalon'); else nav.tool('3.4', `jalon:${d.id}`); };   // the sheet writes the order, closes, then the full screen opens
  // the structure (add, move) is journaled with the person last picked here, else the author of the device
  const add = () => {
    let id = '';
    act((x, by) => { const out = addMilestone(x, {}, who.trim() || by, nowLocal()); id = idOf(out.milestones[out.milestones.length - 1], out.milestones.length - 1); return out; });
    toggleDef(id, true); setFocusId(id);
  };
  const move = (mid: string, dir: -1 | 1) => act((x, by) => moveMilestone(x, mid, dir, who.trim() || by, nowLocal()));
  // a removal says what it takes with it, asks who, and writes a line with the last state of the milestone (the domain refuses a milestone not conform that nobody passed over
  // and one linked to a defect without decision); the undo puts it back and says so in the journal
  const remove = (m: Milestone, mid: string, i: number, label: string) => {
    const by = who.trim(), at = nowLocal(), f = (x: Delivery, s: State) => removeMilestone(x, mid, by, at, s);
    if (f(d, state) === d) { setFact(`Jalon «\u202f${label}\u202f»\u202f: rien n'est enregistré, le retrait est refusé.`); return; }
    act((x, _by, s) => f(x, s)); setFact('');
    if (panel?.id === mid) setPanel(null);
    offer(`Jalon «\u202f${label}\u202f» retiré`, () => act(x => (x.milestones.some((y, j) => idOf(y, j) === mid) ? x : logDelivery({ ...x, milestones: [...x.milestones.slice(0, i), m, ...x.milestones.slice(i)] }, by, nowLocal(), `Jalon «\u202f${label}\u202f» restauré après retrait`, true))));
  };
  // one defect per milestone: asked twice, the same one stays. The defect is numbered from the CURRENT state of the store and written with the link, in one move. A link to a defect that is no longer
  // in 5.1 (deleted there) is no link: the milestone is declared again, the journal says it.
  const declare = (m: Milestone, mid: string, n: number) => {
    if (ncLinkState(state, m.ncId) === 'ok' || declared.current.has(mid)) return;
    declared.current.add(mid);
    const by = who.trim() || m.by || author || 'anonyme';
    act((x, _by, s) => {
      const cur = x.milestones.find((y, j) => idOf(y, j) === mid);
      if (!cur || ncLinkState(s, cur.ncId) === 'ok') return x;
      const at = new Date(), nc = ncFromMilestone(s, x, cur, by, at);   // the number of the defect and the line of the journal are those of the gesture
      s.ncs[nc.id] = nc;
      return linkMilestoneNc(x, mid, nc.id, by, nowLocal(at), s);
    });
    declared.current.delete(mid);
    setSaid(`Jalon ${n}\u202f: défaut ${m.ncId ? 'déclaré à nouveau' : 'déclaré'} au bac rouge.`);
  };

  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">{said}</p>
      {locked && <p className="flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800"><Lock size={14} aria-hidden className="mt-0.5 shrink-0" />Les contrôles et les définitions des jalons ne se modifient plus. «&#8239;Corriger la définition&#8239;», sous chaque jalon, laisse une ligne au journal et un nouveau scellé.</p>}
      {fact && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900"><TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />{fact}</p>}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <SubTitle>{pr.total ? jalonsOk(pr.done, pr.total) : 'Aucun jalon à contrôler'}</SubTitle>
            <p className="text-xs text-slate-600">{[pr.ko ? plural(pr.ko, 'jalon non conforme', 'jalons non conformes') : '', todo ? plural(todo, 'jalon à contrôler', 'jalons à contrôler') : '', pr.na ? `${pr.na} sans objet` : ''].filter(Boolean).join(', ') || 'Tous les jalons sont contrôlés.'}</p>
          </div>
          <Button kind="primary" onClick={fullscreen}><Monitor size={14} aria-hidden />Contrôler en grand écran</Button>
        </div>
        {ms.length > 0 && <div aria-hidden className="flex gap-0.5">{ms.map((m, i) => { const s = milestoneStatus(m); return <span key={idOf(m, i)} className={`h-2 flex-1 rounded-full ${s === 'ko' ? 'bg-red-600' : s === 'ok' || s === 'reworked' ? 'bg-emerald-600' : s === 'na' ? 'bg-slate-400' : 'bg-slate-200'}`} />; })}</div>}
        {block && <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-900">{sentence(`Jalon ${blockAt + 1}${block.label.trim() ? ` «\u202f${block.label.trim()}\u202f»` : ''} non conforme${block.date ? ` depuis le ${rcDay(block.date)}` : ''}`)}</p>}
      </section>

      <ol className="space-y-3">
        {ms.map((m, i) => {
          const mid = idOf(m, i), st = milestoneStatus(m), S = STATUS[st], label = m.label.trim() || `Jalon ${i + 1}`, mode = panel?.id === mid ? panel.mode : null;
          const nc = ncOf(state, m.ncId), ns = nc ? ncState(nc, now, businessOf(state.params)) : null, sop = own(state.sops, m.sopId), inst = own(state.equipments, m.instrumentId);
          const open = (md: Mode) => setPanel(mode === md ? null : { id: mid, mode: md }), b = bounds(m), after = block && blockAt >= 0 && i > blockAt && st === 'todo';
          const photos = [['Référence', m.refPhoto], ['Preuve', m.photo], ['Écart', m.gapPhoto]].filter(x => x[1]) as [string, string][];
          return (
            <li key={mid} id={`${uid}-${mid}`} tabIndex={-1} className={`space-y-2.5 rounded-xl border p-3 focus:outline-none ${S.box}`}>
              <div className="flex items-start gap-2">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-delacour-primary text-xs font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="min-w-0 break-words text-sm font-bold text-slate-900"><span className="sr-only">Jalon {i + 1} : </span>{label}</h4>
                    <StatusBadge level={S.level} text={S.label} />
                    {m.waivedBy && <StatusBadge level="warn" text="Dérogation" />}
                    {m.critical && <StatusBadge level="warn" text="Critique" />}
                  </div>
                  {m.point.trim() && <p className="text-xs text-slate-800">{m.point}</p>}
                  {(m.requirement.trim() || b) && <p className="text-xs text-slate-600">{nb(`${m.requirement.trim() ? `Exigence\u202f: ${m.requirement.trim()}` : ''}${m.requirement.trim() && b ? ' · ' : ''}${b ? `Plage attendue\u202f: ${b}` : ''}`)}</p>}
                </div>
              </div>

              {st === 'na' && <p className="text-xs text-slate-700">Sans objet pour cette commande{m.naReason?.trim() ? `\u202f: ${m.naReason.trim()}` : ''}.</p>}
              {m.ok != null && <p className="text-xs text-slate-700">{[m.history?.length ? '' : `${fmtMoment(m.at || m.date)} · ${m.by}`, m.second ? `Second contrôleur\u202f: ${m.second}` : m.critical ? 'Pas de second contrôleur indiqué' : ''].filter(Boolean).join(' · ')}</p>}
              {m.waivedBy && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">Dérogation {de(m.waivedBy)}{m.waivedAt ? `, ${fmtMoment(m.waivedAt)}` : ''} : {m.waivedWhy}</p>}
              {after && <p className="text-xs text-amber-900">Le jalon {blockAt + 1} est non conforme&#8239;: ce jalon vient après lui.</p>}
              {inst && <p className="text-xs text-slate-700">{sentence(`Instrument\u202f: ${inst.name}${inst.retiredAt ? `, retiré du service${inst.retiredAt.length >= 10 ? ` le ${rcDay(inst.retiredAt.slice(0, 10))}` : ''}` : ''}${overdue.has(inst.id) ? `, étalonnage échu depuis ${plural(overdue.get(inst.id)!, 'jour')}` : ''}`)}</p>}
              {sop && <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Button onClick={() => nav.open('3.2', `station:${sop.id}`)}>Ouvrir l'instruction du poste&#8239;: {sop.poste}<NewTab /></Button>{sopPhase(sop) === 'archived' && <span className="text-xs font-semibold text-slate-700">Instruction archivée.</span>}</div>}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map(([l, v]) => <figure key={l} className="w-28"><Pic value={v} alt={`${l}\u202f: ${label}`} size="t" className="h-20 w-28 rounded-lg border border-slate-200 bg-slate-50" /><figcaption className="text-xs text-slate-600">{l}</figcaption></figure>)}
                </div>
              )}

              {(st === 'ko' || m.ncId) && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs text-slate-800">
                  {nc ? (
                    <>
                      <span className="font-semibold">Défaut {nc.ref} au bac rouge</span>
                      {ns && <StatusBadge level={NC_STATE[ns].tone} text={NC_STATE[ns].label} />}
                      {decisionLabel(nc.decision) && <span>Décision&#8239;: {decisionLabel(nc.decision)}</span>}
                      <Button onClick={() => nav.open('5.1', nc.id)}>Ouvrir le défaut<span className="sr-only"> {nc.ref} du jalon {i + 1}</span><NewTab /></Button>
                    </>
                  ) : m.ncId ? (
                    <>
                      <span role="status" className="font-semibold text-red-900">Défaut lié introuvable dans 5.1.</span>
                      <Button onClick={() => declare(m, mid, i + 1)}>Déclarer à nouveau<span className="sr-only"> le défaut du jalon {i + 1}</span></Button>
                    </>
                  ) : (
                    <>
                      <span>Aucun défaut déclaré pour ce jalon.</span>
                      <Button onClick={() => declare(m, mid, i + 1)}>Déclarer au bac rouge<span className="sr-only"> le défaut du jalon {i + 1}</span></Button>
                    </>
                  )}
                </div>
              )}

              {!locked && (st !== 'na' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" aria-pressed={mode === 'ok'} onClick={() => open('ok')} className={`${ACT} ${mode === 'ok' ? 'border-emerald-800 bg-emerald-700 text-white' : 'border-emerald-600 bg-white text-emerald-900 hover:bg-emerald-50'}`}><Check size={18} aria-hidden />Conforme<span className="sr-only"> pour le jalon {i + 1}</span></button>
                    <button type="button" aria-pressed={mode === 'ko'} onClick={() => open('ko')} className={`${ACT} ${mode === 'ko' ? 'border-red-800 bg-red-700 text-white' : 'border-red-600 bg-white text-red-900 hover:bg-red-50'}`}><X size={18} aria-hidden />Non conforme<span className="sr-only"> pour le jalon {i + 1}</span></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(m.ok != null || m.waivedBy) && <Button onClick={() => open('reopen')} aria-pressed={mode === 'reopen'}><RotateCcw size={13} aria-hidden />Rouvrir<span className="sr-only"> le jalon {i + 1}</span></Button>}
                    {st === 'ko' && !m.waivedBy && <Button onClick={() => open('waive')} aria-pressed={mode === 'waive'}><ShieldAlert size={13} aria-hidden />Passer outre (dérogation)<span className="sr-only"> au jalon {i + 1}</span></Button>}
                    <Button onClick={() => open('na')} aria-pressed={mode === 'na'}>Sans objet<span className="sr-only"> pour le jalon {i + 1}</span></Button>
                  </div>
                </div>
              ) : <Button onClick={() => open('back')} aria-pressed={mode === 'back'}><RotateCcw size={13} aria-hidden />Remettre à contrôler<span className="sr-only"> le jalon {i + 1}</span></Button>)}
              {mode && <Panel key={`${mid}:${mode}`} d={d} m={m} mid={mid} n={i + 1} mode={mode} stuck={mode === 'na' && kept(m).length ? `Jalon non conforme sans dérogation\u202f: «\u202fsans objet\u202f» n'est pas enregistré.` : ''} releasedAt={d.releasedAt} who={who} setWho={setWho} shared={!!setGiven} names={names} absent={absent} px={px} act={act} hold={hold} onDone={t => done(mid, t)} onRefused={setFact} onCancel={() => setPanel(null)} />}

              {(m.history?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-slate-800">Historique du jalon</h5>
                  <ul className="space-y-0.5">
                    {m.history!.map((e, j) => (
                      <li key={j} className={`flex items-start gap-1.5 text-xs ${eventTone(e)}`}>
                        {e.kind === 'derogation' ? <ShieldAlert size={12} aria-hidden className="mt-0.5 shrink-0" /> : e.kind === 'reopen' ? <RotateCcw size={12} aria-hidden className="mt-0.5 shrink-0" /> : e.ok ? <Check size={12} aria-hidden className="mt-0.5 shrink-0" /> : <X size={12} aria-hidden className="mt-0.5 shrink-0" />}
                        <span className="min-w-0 break-words"><strong>{eventText(e)}</strong> · {fmtMoment(e.at)} · {e.by || 'une personne'}{e.measured?.trim() ? ` · ${withUnit(m, e.measured)}` : ''}{e.note ? ` · ${e.note}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details open={openDefs.includes(mid)} onToggle={e => toggleDef(mid, e.currentTarget.open)} className="rounded-lg border border-slate-200 bg-white">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-3 py-2 text-xs font-semibold text-delacour-primary max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">Définition du jalon</summary>
                <div className="space-y-3 border-t border-slate-100 p-3">
                  <fieldset disabled={locked} className="m-0 min-w-0 space-y-3 border-0 p-0 [&_input:disabled]:bg-slate-100 [&_input:disabled]:text-slate-600 [&_select:disabled]:bg-slate-100 [&_select:disabled]:text-slate-600">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Libellé"><input className={inputCls} value={m.label} autoFocus={focusId === mid} placeholder="Le nom du jalon" onChange={e => setM(mid, { label: e.target.value })} /></Field>
                    <Field label="Point à contrôler"><input className={inputCls} value={m.point} onChange={e => setM(mid, { point: e.target.value })} /></Field>
                    <Field label="Exigence"><input className={inputCls} value={m.requirement} placeholder="Ce qui est attendu" onChange={e => setM(mid, { requirement: e.target.value })} /></Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Mini"><NumInput value={m.min} onChange={v => setM(mid, { min: v })} aria-label={`Jalon ${i + 1}\u202f: mini`} placeholder="facultatif" /></Field>
                      <Field label="Maxi"><NumInput value={m.max} onChange={v => setM(mid, { max: v })} aria-label={`Jalon ${i + 1}\u202f: maxi`} placeholder="facultatif" /></Field>
                      <Field label="Unité"><input className={inputCls} value={m.unit ?? ''} placeholder="Ex. : mm, kg, %" onChange={e => setM(mid, { unit: e.target.value || undefined })} /></Field>
                    </div>
                    <Field label="Instruction du poste (outil 3.2)">
                      <select className={inputCls} value={m.sopId ?? ''} onChange={e => setM(mid, { sopId: e.target.value || undefined })}>
                        <option value="">Aucune instruction</option>
                        {m.sopId && !own(state.sops, m.sopId) && <option value={m.sopId}>Instruction supprimée</option>}
                        {sops.filter(s => s.id === m.sopId || sopPhase(s) !== 'archived').map(s => <option key={s.id} value={s.id}>{s.poste}{s.operation ? ` · ${s.operation}` : ''}</option>)}
                      </select>
                    </Field>
                    <Field label="Instrument de mesure (outil 3.3)" hint={instruments.length ? undefined : "Aucun instrument de mesure dans l'outil 3.3."}>
                      <select className={inputCls} value={m.instrumentId ?? ''} onChange={e => setM(mid, { instrumentId: e.target.value || undefined })}>
                        <option value="">Aucun instrument</option>
                        {m.instrumentId && !own(state.equipments, m.instrumentId) && <option value={m.instrumentId}>Instrument supprimé</option>}
                        {instruments.filter(x => x.id === m.instrumentId || !x.retiredAt).map(x => <option key={x.id} value={x.id}>{x.name}{overdue.has(x.id) ? ' (étalonnage échu)' : ''}</option>)}
                      </select>
                    </Field>
                  </div>
                  <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-slate-800">
                    <input type="checkbox" className="h-5 w-5 accent-delacour-primary" checked={!!m.critical} onChange={e => setM(mid, { critical: e.target.checked || undefined })} />Jalon critique&#8239;: contrôlé aussi par un second
                  </label>
                  <div className="max-w-xs space-y-1">
                    <span className="block text-xs font-semibold text-slate-700">Photo de référence&#8239;: à quoi ressemble un bon jalon</span>
                    <PhotoBox value={m.refPhoto ?? ''} label={`Photo de référence\u202f: ${label}`} px={px} onChange={v => { const was = m.refPhoto; setM(mid, { refPhoto: v || undefined }); if (!v && was) offer('Photo retirée', () => setM(mid, { refPhoto: was })); }} />
                  </div>
                  </fieldset>
                  <div className="flex flex-wrap gap-2">
                    {locked && <Button onClick={() => setFix({ m, mid })}>Corriger la définition<span className="sr-only"> du jalon {i + 1}</span></Button>}
                    {!locked && <>
                      {i > 0 && <Button onClick={() => move(mid, -1)}><ArrowUp size={14} aria-hidden />Monter<span className="sr-only"> le jalon {i + 1}</span></Button>}
                      {i < ms.length - 1 && <Button onClick={() => move(mid, 1)}><ArrowDown size={14} aria-hidden />Descendre<span className="sr-only"> le jalon {i + 1}</span></Button>}
                      <Button kind="danger" onClick={() => { setFact(''); setRm({ m, mid, i, label }); }}><Trash2 size={14} aria-hidden />Retirer<span className="sr-only"> le jalon {i + 1}</span></Button>
                    </>}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {!locked && <Button onClick={add}><Plus size={14} aria-hidden />Ajouter un jalon</Button>}
      {rm && (() => {
        const nc = ncOf(state, rm.m.ncId), stuck = kept(rm.m, nc), why = stuck.length ? `Retrait impossible\u202f: ${stuck.join(' ; ')}.` : !who.trim() ? 'Personne pas encore choisie.' : '';
        return (
          <Modal onClose={() => setRm(null)} title={`Retirer le jalon «\u202f${rm.label}\u202f»`} subtitle="Une ligne du journal garde le dernier état du jalon retiré"
            footer={<>{why && <span role="status" className="mr-auto text-xs text-slate-600">{why}</span>}<Button onClick={() => setRm(null)}>Annuler</Button><Button kind="danger" className={OFF} disabled={!!why} onClick={() => { const r = rm; setRm(null); remove(r.m, r.mid, r.i, r.label); }}><Trash2 size={14} aria-hidden />Retirer le jalon</Button></>}>
            <div className="space-y-3">
              <p className="text-xs text-slate-700">{carried(rm.m, nc)}</p>
              <PeoplePick value={who} onChange={setWho} names={names} absent={absent} label="Qui retire le jalon ?" />
            </div>
          </Modal>
        );
      })()}
      {fix && (
        <Correct who={who} title={`Corriger la définition du jalon «\u202f${fix.m.label.trim() || 'sans nom'}\u202f»`} subtitle="Chaque correction s'inscrit au journal&#8239;: qui, quand, pourquoi, ancienne et nouvelle valeur&#8239;; un nouveau scellé est posé" holdKey={`fix-${fix.mid}`} hold={hold}
          people={{ names, absent }} fields={MS_FIELDS} onClose={() => setFix(null)}
          was={{ label: fix.m.label, point: fix.m.point, requirement: fix.m.requirement, unit: fix.m.unit ?? '', min: fix.m.min ?? null, max: fix.m.max ?? null }}
          onSave={(fields, why, by) => applied(act, x => correctLocked(x, { milestone: { id: fix.mid, fields }, _why: why } as never, by, nowLocal()))} />
      )}
      {bar}
    </div>
  );
}
