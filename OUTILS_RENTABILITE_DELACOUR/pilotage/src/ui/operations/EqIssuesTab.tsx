// Second tab of the sheet of a piece of equipment: the anomalies with their cycle (reported, taken in charge, waiting, repaired, checked), the defects of the
// red bin linked to it, and the stops and breakdowns (when, why, impact, repair, part taken from the cabinet, cost typed by the company, figures over 12 months).
// Every move of the life is written at once (act); what removes something is offered back by the sheet, the other gestures offer "Annuler" here.
import { useState } from 'react';
import { OctagonX, Phone, Play, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { Anomaly, Breakdown, Equipment, Impact } from '../../domain/types';
import {
  ANOMALY_STATUS, anomalyStatus, downtime, eqStatus, helpersOf, maintCfg, ncsOfEquipment, openAnomalies, openBreakdown, patchAnomaly, patchBreakdown, planBExceeded, reopenAnomaly, repairAnomaly,
  removeAnomaly, removeBreakdown, repeatedCauses, repeatedPoints, restartEquipment, SEVERITY_LABEL, stopEquipment, txt, verifyAnomaly,
} from '../../domain/maintenance';
import { SPARE_LEVEL, sparesOf, spareLevel, takeOut } from '../../domain/maintenanceSpares';
import { contactLabel } from '../../domain/contacts';
import { DELIVERY_STATE, deliveryState } from '../../domain/receptions';
import { daysBetween, formatHours, frStamp, hoursBetween, nowLocal } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { formatValue } from '../../domain/numbers';
import { Button, Field, inputCls, NewTab, NumInput, StatusBadge, SubTitle, Tile } from '../common';
import { PhotoBox } from '../PhotoBox';
import { Pic } from '../../photo/Pic';
import type { EqTabProps } from './EqProps';
import { num, useEqMove, useSpareMove, useUndo } from './EqBits';
import { BIG, Pick, ReportDialog, Seg, Typed } from './EqReport';
import { Fold } from './EqRoutineTab';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const dot = (t: string) => (t.endsWith('.') ? t : `${t}.`);   // a name such as "David K." ends the sentence
const Sec = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => <section className="space-y-2"><SubTitle>{title}</SubTitle>{hint && <p className="-mt-1 text-[11px] text-slate-500">{hint}</p>}{children}</section>;
type Life = (what: string, f: (x: Equipment, by: string) => Equipment) => void;
interface Ctx { p: EqTabProps; life: Life; offer(what: string, back: () => void): void }
const SEV_RANK = { danger: 0, stopped: 1, degraded: 2 } as const;
const IMPACT: [Impact, string][] = [['stopped', 'Production arrêtée'], ['slowed', 'Production ralentie'], ['none', 'Aucun impact']];
const REPAIR: [NonNullable<Breakdown['repairBy']>, string][] = [['internal', 'Interne'], ['maker', 'Constructeur ou SAV'], ['provider', 'Prestataire'], ['other', 'Autre, précisez']];
const FIX: [NonNullable<Breakdown['fix']>, string][] = [['temporary', 'Solution provisoire'], ['definitive', 'Solution définitive']];

export function IssuesTab(p: EqTabProps) {
  const { e, state, by, act, nav } = p;
  const { bar, offer } = useUndo();
  const move = useEqMove(offer);
  const [report, setReport] = useState(false), [end, setEnd] = useState('');
  const now = new Date(), name = e.name.trim() || 'Équipement sans nom', st = eqStatus(e), bd = openBreakdown(e), since = txt(e.stoppedSince);
  const open = openAnomalies(e).sort((a, b) => SEV_RANK[a.severity ?? 'degraded'] - SEV_RANK[b.severity ?? 'degraded'] || a.date.localeCompare(b.date));
  const closed = (e.anomalies ?? []).filter(a => a.closedAt).sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  const down = downtime(e, now), causes = repeatedCauses(e, now), points = repeatedPoints(e, now), over = planBExceeded(state, e, now), ncs = ncsOfEquipment(state, e, now);
  const list = [...(e.breakdowns ?? [])].sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date));
  // a gesture of the life, written at once; "Annuler" removes only what the gesture did (straight through the store: the sheet would offer "Annuler" on the undo itself)
  const life: Life = (what, f) => { if (p.saved) move(e.id, what, f); else act(f); };
  const ctx: Ctx = { p, life, offer };
  const action = (constat: string) => nav.newAction({ ref: { kind: 'equipment', id: e.id }, constat });
  const editStart = (v: string) => { if (v) act(x => ({ ...(bd ? patchBreakdown(x, bd.id, { startedAt: v, date: v.slice(0, 10) }) : x), stoppedSince: v })); };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Button kind="primary" onClick={() => setReport(true)} disabled={!p.saved}><TriangleAlert size={14} />Signaler un problème</Button>
        <Fold title="Suite à donner">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => action(name)} disabled={!p.saved}>Ouvrir une action</Button>
            <Button onClick={() => nav.open('5.1', `new:equipment:${e.id}`)} disabled={!p.saved}>Ouvrir un défaut du bac rouge<NewTab /></Button>
          </div>
        </Fold>
      </div>
      {!p.saved && <p className="text-[11px] text-slate-600">Nommer l'équipement pour pouvoir signaler un problème ou noter un arrêt : la fiche s'enregistre dès qu'elle a un nom.</p>}
      {over && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-900">
          <span>À l'arrêt depuis {formatHours(over.hours)} : l'arrêt toléré du Plan B « {over.risk.title} » est de {formatHours(over.limit)}.</span>
          <Button className="!py-1" onClick={() => nav.openRisk(over.risk.id)}>Ouvrir le Plan B</Button>
        </div>
      )}

      <Sec title={`Anomalies ouvertes : ${open.length}`} hint="Une anomalie se ferme quand la routine suivante trouve son point OK, ou quand la réparation est vérifiée.">
        {open.length === 0 && <p className="text-[11px] text-slate-500">Aucune anomalie ouverte.</p>}
        <ul className="space-y-2">{open.map(a => <AnomalyCard key={a.id} a={a} c={ctx} />)}</ul>
      </Sec>

      <Sec title="Défauts du bac rouge liés" hint="Les défauts de l'outil 5.1 déclarés sur cet équipement, sur 90 jours.">
        {ncs.length === 0 ? <p className="text-[11px] text-slate-500">Aucun défaut lié sur 90 jours.</p> : (
          <>
            <p className="text-[11px] font-semibold text-slate-800">{plural(ncs.length, 'défaut')} en 90 jours.</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {ncs.slice(0, 5).map(n => (
                <li key={n.id}><button type="button" onClick={() => nav.open('5.1', n.id)} className="flex w-full items-baseline gap-2 px-2 py-2 text-left text-[11px] hover:bg-slate-50 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]"><span className="shrink-0 font-mono font-semibold text-slate-900">{n.ref}</span><span className="shrink-0 text-slate-500">{frDate(n.at.slice(0, 10))}</span><span className="min-w-0 flex-1 truncate text-slate-700">{n.description}</span><NewTab /></button></li>
              ))}
            </ul>
            {ncs.length > 5 && <p className="text-[11px] text-slate-500">et {plural(ncs.length - 5, 'autre')}.</p>}
          </>
        )}
      </Sec>

      {closed.length > 0 && (
        <details className="rounded-lg border border-slate-200 p-2">
          <summary className="cursor-pointer py-1 text-xs font-bold text-slate-900">Anomalies closes : {closed.length}</summary>
          <ul className="mt-2 divide-y divide-slate-100 text-[11px] text-slate-700">
            {closed.map(a => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1"><strong className="text-slate-900">{a.label}</strong> · du {frDate(a.date)} au {frDate(a.closedAt.slice(0, 10))}{a.by ? ` · ${a.by}` : ''}</span>
                <Button className="!py-1" onClick={() => life('Anomalie rouverte', x => reopenAnomaly(x, a.id))}>Rouvrir</Button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Sec title="Pannes et arrêts" hint="L'heure de début s'écrit au toucher sur « Équipement à l'arrêt » ; la durée se calcule à « Remis en marche ». Le coût en euros est celui que l'entreprise écrit.">
        {st === 'retired' ? <p className="text-[11px] text-slate-600">Équipement retiré du service : aucun arrêt à noter.</p>
          : since ? (
            <div className="space-y-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
              <p className="text-xs font-bold text-red-900">À l'arrêt depuis {formatHours(Math.max(0, hoursBetween(since, now) ?? 0))} ({frStamp(since)}).</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Début de l'arrêt"><input type="datetime-local" className={inputCls} value={since} onChange={ev => editStart(ev.target.value)} /></Field>
                <Field label="Remise en marche à (vide : maintenant)"><input type="datetime-local" className={inputCls} value={end} onChange={ev => setEnd(ev.target.value)} /></Field>
              </div>
              <button type="button" className={`${BIG} w-full border-emerald-900 bg-emerald-700 text-white sm:w-auto`} onClick={() => { life('Équipement remis en marche', x => restartEquipment(x, end || nowLocal())); setEnd(''); }}><Play size={22} />Remis en marche</button>
            </div>
          ) : (
            <button type="button" disabled={!p.saved} className={`${BIG} w-full border-red-700 bg-white text-red-800 sm:w-auto`} onClick={() => life("Équipement noté à l'arrêt", (x, who) => stopEquipment(x, who || by))}><OctagonX size={22} />Équipement à l'arrêt</button>
          )}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Tile title="Pannes" value={String(down.count)} sub="sur 12 mois" />
          <Tile title="Heures d'arrêt" value={formatValue(down.hours, 'h')} sub="sur 12 mois" />
          <Tile title="Coût des pannes" value={down.cost ? formatValue(down.cost, '€') : '—'} sub="écrit par l'entreprise, sur 12 mois" />
          <Tile title="Entre deux pannes" value={down.between ? `${down.between} jours` : '—'} sub="en moyenne" />
        </div>
        {(causes.length > 0 || points.length > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-950">
            <div className="min-w-0 flex-1 space-y-0.5">
              {causes.map(c => <p key={c.cause}>Même cause de panne : « {c.cause} », {c.times} fois en 12 mois.</p>)}
              {points.map(r => <p key={r.pointId}>Le point « {r.label} » est revenu {r.times} fois en 12 semaines.</p>)}
            </div>
            <Button onClick={() => nav.open('5.3')}>Ouvrir un atelier 5 Pourquoi<NewTab /></Button>
          </div>
        )}
        {list.length === 0 && <p className="text-[11px] text-slate-500">Aucune panne enregistrée.</p>}
        <ul className="space-y-2">{list.map(b => <BreakdownCard key={b.id} b={b} c={ctx} />)}</ul>
      </Sec>
      {report && <ReportDialog eq={e} nav={nav} onClose={() => setReport(false)} />}
      {bar}
    </div>
  );
}

function SevBadge({ s }: { s: NonNullable<Anomaly['severity']> }) {
  const cls = s === 'danger' ? 'border-red-800 bg-red-700 text-white' : s === 'stopped' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900';
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>{s === 'danger' && <ShieldAlert size={12} aria-hidden />}{SEVERITY_LABEL[s]}</span>;
}

function AnomalyCard({ a, c }: { a: Anomaly; c: Ctx }) {
  const { p, life } = c, { e, state, nav } = p;
  const now = new Date(), today = isoDate(now), status = anomalyStatus(a), sev = a.severity ?? 'degraded', due = txt(a.dueAt), handler = txt(a.handler), late = due && due < today ? daysBetween(due, now) : null;
  const patch = (x: Partial<Anomaly>) => p.act(y => patchAnomaly(y, a.id, x));
  const spare = a.spareId ? state.spares[a.spareId] : undefined;
  return (
    <li className={`space-y-2 rounded-lg border p-2.5 ${sev === 'danger' ? 'border-red-400 bg-red-50/40' : 'border-slate-200'}`}>
      <div className="flex gap-2">
        {a.photo && <Pic value={a.photo} alt={`Photo : ${a.label}`} size="t" className="h-16 w-16 shrink-0 rounded" />}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5"><strong className="text-xs text-slate-900">{a.label}</strong><SevBadge s={sev} /><StatusBadge level={ANOMALY_STATUS[status].tone} text={ANOMALY_STATUS[status].label} /></div>
          <p className="text-[11px] text-slate-600">{dot(`Signalée le ${frDate(a.date)}${a.by ? ` par ${a.by}` : ''}${a.nature ? `, nature : ${a.nature}` : ''}`)}{a.note ? ` « ${a.note} »` : ''}</p>
          {handler && <p className="text-[11px] text-slate-700">{dot(`Prise en charge par ${handler}${due ? `, pour le ${frDate(due)}` : ''}`)}{late !== null && late > 0 && <span className="font-semibold text-red-700"> En retard de {plural(late, 'jour')}.</span>}</p>}
          {a.waitingFor && <p className="text-[11px] text-slate-700">En attente : {a.waitingFor}.{spare && ` Stock de la pièce : ${num(spare.stock)}, ${SPARE_LEVEL[spareLevel(spare)].label.toLowerCase()}.`}</p>}
          {a.repairedAt && <p className="text-[11px] text-slate-700">Réparée le {frDate(a.repairedAt.slice(0, 10))}, à vérifier.</p>}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Prise en charge par"><Typed value={handler} list="people" onSave={v => patch({ handler: v.trim() || undefined })} aria-label={`Prise en charge de ${a.label}`} /></Field>
        <Field label="Pour le"><input type="date" className={inputCls} value={due} onChange={ev => patch({ dueAt: ev.target.value || undefined })} aria-label={`Date prévue pour ${a.label}`} /></Field>
        <Waiting a={a} p={p} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {status !== 'repaired' ? <Button onClick={() => life('Anomalie notée réparée', x => repairAnomaly(x, a.id, today))}>Réparée</Button>
          : <><Button kind="primary" onClick={() => life('Anomalie vérifiée et fermée', x => verifyAnomaly(x, a.id, today))}>Vérifiée, fermer</Button><Button onClick={() => life('Anomalie rouverte', x => reopenAnomaly(x, a.id))}>Pas réparée</Button></>}
        <Button onClick={() => nav.newAction({ ref: { kind: 'equipment', id: e.id }, constat: `${e.name.trim() || 'Équipement'} : ${a.label}${a.note ? ` (${a.note})` : ''}` })}>Ouvrir une action</Button>
        {!a.id.startsWith('an_legacy_') && <Button kind="danger" aria-label={`Retirer ce signalement : ${a.label}`} onClick={() => p.act(x => removeAnomaly(x, a.id))}>Retirer ce signalement</Button>}
      </div>
    </li>
  );
}

// What an anomaly waits for: a part of the cabinet, a person of the directory, or something else to specify
function Waiting({ a, p }: { a: Anomaly; p: EqTabProps }) {
  const { e, state } = p;
  const spares = sparesOf(state, e.id), cur = a.spareId ? state.spares[a.spareId] : undefined;
  const mates = helpersOf(e).flatMap(h => (h.contactId && state.contacts[h.contactId] ? [state.contacts[h.contactId]] : []));
  const contacts = [...new Map([...mates, ...Object.values(state.contacts).filter(x => x.category === 'prestataire')].map(x => [x.id, x])).values()];
  const mine = contacts.find(x => a.waitingFor === contactLabel(x));
  const kind = a.spareId ? `spare:${a.spareId}` : mine ? `contact:${mine.id}` : a.waitingFor ? 'other' : '';
  const patch = (x: Partial<Anomaly>) => p.act(y => patchAnomaly(y, a.id, x));
  const choose = (v: string) => {
    if (!v) patch({ waitingFor: undefined, spareId: undefined });
    else if (v === 'other') patch({ waitingFor: 'Autre', spareId: undefined });
    else if (v.startsWith('spare:')) { const s = state.spares[v.slice(6)]; patch({ waitingFor: `Pièce : ${s.name.trim() || s.ref}`, spareId: s.id }); }
    else patch({ waitingFor: contactLabel(state.contacts[v.slice(8)]), spareId: undefined });
  };
  return (
    <div className="space-y-1.5">
      <Field label="En attente de">
        <select className={inputCls} value={kind} aria-label={`En attente de, pour ${a.label}`} onChange={ev => choose(ev.target.value)}>
          <option value="">Rien n'est attendu</option>
          {(spares.length > 0 || cur) && <optgroup label="Pièce de l'armoire">{[...spares, ...(cur && !spares.includes(cur) ? [cur] : [])].map(s => <option key={s.id} value={`spare:${s.id}`}>{s.name.trim() || s.ref}</option>)}</optgroup>}
          {contacts.length > 0 && <optgroup label="Prestataire ou intervenant">{contacts.map(x => <option key={x.id} value={`contact:${x.id}`}>{contactLabel(x)}</option>)}</optgroup>}
          <option value="other">Autre, précisez</option>
        </select>
      </Field>
      {kind === 'other' && <Typed value={a.waitingFor === 'Autre' ? '' : a.waitingFor || ''} placeholder="Autre : précisez" aria-label={`Autre attente, pour ${a.label}`} onSave={v => patch({ waitingFor: v.trim() || 'Autre' })} />}
    </div>
  );
}

function BreakdownCard({ b, c }: { b: Breakdown; c: Ctx }) {
  const { p, offer } = c, { e, state, by, nav } = p;
  const spareMove = useSpareMove(offer);
  const [pick, setPick] = useState('');
  const cfg = maintCfg(state.params), running = !!b.startedAt && !b.endedAt, cause = txt(b.cause);
  const patch = (x: Partial<Breakdown>) => p.act(y => patchBreakdown(y, b.id, x));
  // start and end of the stop: the hours follow (and stay editable afterwards); the start of the stop under way is also the start of the equipment's stop
  const time = (k: 'startedAt' | 'endedAt', v: string) => p.act(y => {
    const s = k === 'startedAt' ? v : b.startedAt, en = k === 'endedAt' ? v : b.endedAt, h = s && en ? hoursBetween(s, en) : null;
    const x: Partial<Breakdown> = k === 'startedAt' ? { startedAt: v || undefined, ...(v ? { date: v.slice(0, 10) } : {}) } : { endedAt: v || undefined };
    if (h !== null) x.hours = Math.max(0, Math.round(h * 10) / 10);
    const out = patchBreakdown(y, b.id, x);
    return running && k === 'startedAt' && v ? { ...out, stoppedSince: v } : out;
  });
  const spares = sparesOf(state, e.id), taken = Object.values(state.spares).flatMap(s => (s.moves ?? []).filter(m => m.breakdownId === b.id).map(m => ({ s, m })));
  const take = () => {
    const s = state.spares[pick];
    if (!s) return;
    spareMove(s.id, `Pièce prise : ${s.name.trim() || s.ref}`, (x, who) => takeOut(x, who || by, { equipmentId: e.id, breakdownId: b.id, ...(b.anomalyId ? { anomalyId: b.anomalyId } : {}) }));
    setPick('');
  };
  const dels = Object.values(state.deliveries).sort((x, y) => y.ref.localeCompare(x.ref)), hit = b.deliveryIds ?? [], touched = dels.filter(d => hit.includes(d.id)), now = new Date();
  const mates = helpersOf(e).flatMap(h => (h.contactId && state.contacts[h.contactId] ? [state.contacts[h.contactId]] : []));
  const dir = Object.values(state.contacts).sort((x, y) => contactLabel(x).localeCompare(contactLabel(y), 'fr')), who = b.contactId ? state.contacts[b.contactId] : undefined;
  const risk = e.riskId ? state.risks[e.riskId] : undefined, anomaly = b.anomalyId ? (e.anomalies ?? []).find(x => x.id === b.anomalyId) : undefined;
  const sum = [frDate(b.date), running ? 'en cours' : b.hours != null ? `${formatValue(b.hours, 'h')} d'arrêt` : 'durée non notée', cause.trim(), b.cost ? formatValue(b.cost, '€') : ''].filter(Boolean).join(' · ');
  return (
    <li>
      <details className="rounded-lg border border-slate-200 p-2" open={running}>
        <summary className="cursor-pointer py-1.5 text-xs font-semibold text-slate-900">{sum}</summary>
        <div className="mt-2 space-y-3">
          {anomaly && <p className="text-[11px] text-slate-700">Arrêt noté avec l'anomalie « {anomaly.label} ».</p>}
          <div className="grid gap-2 sm:grid-cols-4">
            <Field label="Début"><input type="datetime-local" className={inputCls} value={b.startedAt || ''} onChange={ev => time('startedAt', ev.target.value)} /></Field>
            {!running && <Field label="Fin"><input type="datetime-local" className={inputCls} value={b.endedAt || ''} onChange={ev => time('endedAt', ev.target.value)} /></Field>}
            <Field label="Heures d'arrêt" hint="Calculées, modifiables"><NumInput value={b.hours} onChange={v => patch({ hours: v })} /></Field>
            <Field label="Coût de la panne (€)" hint="Écrit par l'entreprise"><NumInput value={b.cost} onChange={v => patch({ cost: v })} /></Field>
          </div>
          <Field label="Cause"><Pick list={cfg.causes} value={cause} onChange={v => patch({ cause: v })} label="Cause de la panne" /></Field>
          <div className="space-y-1"><span className="block text-[11px] font-semibold text-slate-700">Impact sur la production</span><Seg label="Impact sur la production" value={b.impact} onChange={v => patch({ impact: v })} items={IMPACT} /></div>
          {touched.length > 0 && (
            <ul className="space-y-1">{touched.map(d => {
              const st = DELIVERY_STATE[deliveryState(d, now, state.params)];
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-800">
                  <span className="min-w-0">Commande {d.ref.trim() || d.item.trim() || 'sans numéro'}{d.client.trim() ? ` · ${d.client.trim()}` : ''} (3.4)</span>
                  <StatusBadge level={st.tone} text={st.label} />
                  <Button className="!py-1" onClick={() => nav.open('3.4', d.id)}>Ouvrir la commande<NewTab /></Button>
                </li>
              );
            })}</ul>
          )}
          <details className="rounded-lg border border-slate-200 p-2">
            <summary className="cursor-pointer py-1.5 text-[11px] font-semibold text-slate-800">Commandes touchées : {hit.length}</summary>
            {dels.length === 0 ? <p className="mt-1 text-[11px] text-slate-500">Aucune commande dans l'outil 3.4.</p> : (
              <ul className="mt-1 max-h-48 overflow-y-auto">
                {dels.map(d => (
                  <li key={d.id}><label className="flex items-center gap-2 py-1 text-[11px] text-slate-800 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">
                    <input type="checkbox" className="h-4 w-4" checked={hit.includes(d.id)} onChange={ev => patch({ deliveryIds: ev.target.checked ? [...hit, d.id] : hit.filter(x => x !== d.id) })} />{d.ref} · {d.client}{d.item ? ` · ${d.item}` : ''}
                  </label></li>
                ))}
              </ul>
            )}
          </details>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-700">Plan B</span>
            <Seg label="Plan B déclenché" value={b.planB === undefined ? undefined : b.planB ? 'yes' : 'no'} onChange={v => patch({ planB: v === undefined ? undefined : v === 'yes' })} items={[['yes', 'Déclenché'], ['no', 'Non déclenché']]} />
            {risk && <Button className="!py-1" onClick={() => nav.openRisk(risk.id)}>Ouvrir la fiche réflexe</Button>}
          </div>
          <div className="space-y-1.5"><span className="block text-[11px] font-semibold text-slate-700">Réparation</span>
            <Seg label="Réparation faite par" value={b.repairBy} onChange={v => patch({ repairBy: v })} items={REPAIR} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={b.repairBy === 'other' ? 'Autre : précisez' : "Nom (si pas dans l'annuaire)"}><Typed value={b.repairWho || ''} list="people" onSave={v => patch({ repairWho: v.trim() || undefined })} /></Field>
              <Field label="Contact de l'annuaire">
                <select className={inputCls} value={b.contactId || ''} onChange={ev => patch({ contactId: ev.target.value || undefined })}>
                  <option value="">Aucun contact choisi</option>
                  {mates.length > 0 && <optgroup label="Intervenants de l'équipement">{mates.map(x => <option key={`m${x.id}`} value={x.id}>{contactLabel(x)}</option>)}</optgroup>}
                  <optgroup label="Annuaire">{dir.map(x => <option key={x.id} value={x.id}>{contactLabel(x)}</option>)}</optgroup>
                </select>
              </Field>
            </div>
            {who?.phone && <a href={`tel:${who.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-delacour-primary hover:bg-slate-50 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]"><Phone size={13} />Appeler {contactLabel(who)} : {who.phone}</a>}
            <Seg label="Solution" value={b.fix} onChange={v => patch({ fix: v })} items={FIX} />
          </div>
          <div className="space-y-1.5"><span className="block text-[11px] font-semibold text-slate-700">Pièce prise dans l'armoire</span>
            {taken.length > 0 && <ul className="space-y-0.5 text-[11px] text-slate-700">{taken.map(({ s, m }) => <li key={m.id}>{dot(`${s.name.trim() || s.ref} : ${m.delta < 0 ? 'prise' : 'rangée'} le ${frDate(txt(m.at).slice(0, 10))} par ${m.by}`)}</li>)}</ul>}
            {spares.length === 0 ? <p className="text-[11px] text-slate-500">Aucune pièce de l'armoire n'est reliée à cet équipement.</p> : (
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inputCls} max-w-xs`} value={pick} aria-label="Pièce prise dans l'armoire" onChange={ev => setPick(ev.target.value)}>
                  <option value="">Choisir une pièce…</option>{spares.map(s => <option key={s.id} value={s.id}>{s.name.trim() || s.ref} (stock {num(s.stock)})</option>)}
                </select>
                <Button disabled={!pick} onClick={take}>Pièce prise</Button>
              </div>
            )}
          </div>
          <Field label="Note"><Typed area rows={2} value={b.note || ''} onSave={v => patch({ note: v.trim() || undefined })} /></Field>
          <div className="max-w-[14rem]"><PhotoBox value={b.photo || ''} label="Photo de la panne" onChange={v => patch({ photo: v || undefined })} /></div>
          {!running && <Button kind="danger" onClick={() => p.act(y => removeBreakdown(y, b.id))}>Retirer cette panne</Button>}
        </div>
      </details>
    </li>
  );
}
