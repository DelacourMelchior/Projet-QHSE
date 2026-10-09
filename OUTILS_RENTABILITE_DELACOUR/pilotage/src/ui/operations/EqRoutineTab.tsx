// First tab of the sheet of a piece of equipment, in the order of use: the period in progress (state, "Faire la routine", the 12 last periods), the history of the
// routines and the measured values, then, folded, the setting (rhythm, who makes the routine, the points to look at with their reference picture and their bounds).
// The routine itself is made full screen (EqRoutine); an equipment that is retired or stopped cannot start one and says why.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, GripVertical, Monitor, Plus, TriangleAlert, X } from 'lucide-react';
import type { Checkpoint, Rhythm } from '../../domain/types';
import { eqStatus, INSPECTION_STATE, inspectionKey, inspectionState, lastInspection, maintCfg, openAnomalies, periodOf, recordInspection, removeInspection, RHYTHMS, routineOf, routineOwner, routineRate, staleDraft, strip, txt, watchPoints } from '../../domain/maintenance';
import { formatHours, hoursBetween, newId, nowLocal } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { formatValue } from '../../domain/numbers';
import { Button, Field, inputCls, NumInput, StatusBadge, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import type { EqTabProps } from './EqProps';
import { Strip, useEqMove, useUndo, type EqSet } from './EqBits';
import { boundsText, CELL, cellOf, hasBounds, isSummary, outOfBounds, readingsOf } from './EqRoutine';
import { Seg } from './EqReport';

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const Sec = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => <section className="space-y-2"><SubTitle>{title}</SubTitle>{hint && <p className="-mt-1 text-[11px] text-slate-500">{hint}</p>}{children}</section>;
// A block that is folded: open or closed at the start, then left to the person (a list that grows under their hands never closes on them)
export function Fold({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  const [o] = useState(open);
  return (
    <details open={o} className="group rounded-lg border border-slate-200">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-900 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">{title}<ChevronDown size={14} aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-180" /></summary>
      <div className="space-y-5 border-t border-slate-100 p-3">{children}</div>
    </details>
  );
}
const tap = 'shrink-0 rounded p-1 text-slate-600 hover:text-slate-800 disabled:opacity-30 max-sm:p-2 [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:justify-center';

export function RoutineTab(p: EqTabProps) {
  const { e, state, by, act, openStation } = p;
  const set = p.set as EqSet;   // the sheet's `set` also takes a function of the copy being typed: a photo that comes back late keeps what was typed meanwhile
  const { bar, offer } = useUndo();
  const move = useEqMove(offer);
  const [from, setFrom] = useState<number | null>(null);   // point being dragged
  const [armed, setArmed] = useState<number | null>(null);   // a row drags by its grip only: elsewhere a mouse drag edits text
  const [sel, setSel] = useState<{ n: number; i?: number } | null>(null);   // a routine of the table (and a point of it) shown in full
  const now = new Date(), today = isoDate(now);
  const { every } = routineOf(e, state.params), per = periodOf(e, now, state.params), st = inspectionState(e, now, state.params), owner = routineOwner(state, e, today);
  const bars = strip(e, now, state.params), made = bars.filter(b => b.state !== 'none').length;
  const cps = e.checkpoints, last = lastInspection(e), opens = openAnomalies(e), watch = watchPoints(e), service = eqStatus(e) === 'service';
  const draft = e.routineDraft;
  const quickOk = p.saved && service && cps.some(c => c.label.trim()) && opens.every(a => !a.pointId);   // "rien à signaler" would close the anomalies of the points unseen; nothing is noted on an equipment that is not saved

  // why "Faire la routine" is not offered, said as a fact; the rate is not said when nothing was due (an equipment out of service, a first routine)
  const since = txt(e.stoppedSince), rate = routineRate(e, now, state.params), per12 = `${made} période${made > 1 ? 's' : ''} sur 12`;
  const why = !p.saved ? "Équipement pas encore enregistré : la routine se note dès qu'il a un nom."
    : eqStatus(e) === 'retired' ? 'Équipement retiré du service.'
    : !service ? `À l'arrêt depuis ${formatHours(Math.max(0, hoursBetween(since, now) ?? 0))} : la routine reprend quand il tourne.`
    : !quickOk && cps.some(c => c.label.trim()) ? "Une anomalie est ouverte sur un point : « Rien à signaler » n'est pas proposé, chaque point se regarde en plein écran." : '';
  const rateText = made === 0 && (rate === null || !service) ? 'Pas encore assez de recul pour un taux.' : rate === null ? `Routine faite pour ${per12} ; pas encore assez de recul pour un taux.` : `Routine faite pour ${per12} (${rate} % des périodes dues).`;
  const setRhythm = (v: Rhythm | undefined) => { if (v) set({ routine: { every: v, ...(e.routine?.day ? { day: e.routine.day } : {}) } }); };
  const setDay = (d: number) => set({ routine: { every, ...(d ? { day: d } : {}) } });
  // a point is found by its id in the list as it is now (the one this render holds may be old: a photo comes back seconds after the button was touched)
  const setPt = (i: number, x: Partial<Checkpoint>) => { const id = cps[i]?.id; set(prev => ({ checkpoints: prev.checkpoints.map((c, j) => ((id ? c.id === id : j === i) ? { ...c, ...x } : c)) })); };
  const shift = (a: number, b: number) => { if (a === b || b < 0 || b >= cps.length) return; set(prev => { const n = [...prev.checkpoints]; const [x] = n.splice(a, 1); n.splice(b, 0, x); return { checkpoints: n }; }); };
  const dropPt = (i: number) => { const id = cps[i]?.id; set(prev => ({ checkpoints: prev.checkpoints.filter((c, j) => (id ? c.id !== id : j !== i)) })); };
  // "Rien à signaler": every point in order, written at once, with "Annuler" (the inverse of this routine, nothing else)
  const allOk = () => { move(e.id, 'Routine notée : rien à signaler', (x, who) => recordInspection(x, { date: today, at: nowLocal(now), by: who || by, results: x.checkpoints.map(() => 'ok' as const), note: '' })); };

  const insps = [...e.inspections].sort((a, b) => `${a.date}${a.at ?? ''}`.localeCompare(`${b.date}${b.at ?? ''}`)).slice(-8);
  const shown = cps.map((cp, i) => ({ cp, i })).filter(x => x.cp.label.trim());
  const measured = cps.map((cp, i) => ({ cp, i, rs: readingsOf(e, i).slice(-12) })).filter(x => hasBounds(x.cp) || x.rs.length);
  const picked = sel && insps[sel.n];
  const pc = picked && sel.i !== undefined ? { cp: cps[sel.i], c: cellOf(e, picked, sel.i) } : null;

  return (
    <div className="space-y-5">
      <Sec title="Période en cours">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
          <StatusBadge level={INSPECTION_STATE[st].tone} text={INSPECTION_STATE[st].label} />
          <span>Du {frDate(per.from)} au {frDate(per.to)}.</span>
          {last ? <span>Dernière routine le {frDate(last.date)}{last.by ? ` (${last.by})` : ''}.</span> : <span>Aucune routine enregistrée.</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button kind={service ? 'primary' : 'secondary'} onClick={openStation} disabled={!service}><Monitor size={14} />Faire la routine</Button>
          <Button onClick={allOk} disabled={!quickOk}><Check size={14} />Rien à signaler</Button>
          {draft && <span className="text-[11px] text-amber-900">Routine commencée {draft.date.length > 10 ? `le ${frDate(draft.date.slice(0, 10))} à ${draft.date.slice(11, 16)}` : `le ${frDate(draft.date)}`} ({draft.by || 'une personne'}){staleDraft(e, now, state.params) ? ', ancienne' : ''} : elle se reprend ou se recommence en plein écran.</span>}
        </div>
        {why && <p className="text-[11px] text-slate-700">{why}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Strip items={bars} />
          <span className="text-[11px] text-slate-700">{rateText}</span>
        </div>
      </Sec>

      <Sec title="Les 8 dernières routines" hint="Un toucher sur une case ou sur une date donne le détail.">
        {insps.length === 0 ? <p className="text-[11px] text-slate-500">Aucune routine enregistrée.</p> : (
          <>
            <div role="region" aria-label="Historique des routines, tableau à faire défiler" tabIndex={0} className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-max border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-[1] bg-white px-2 py-1 text-left font-semibold text-slate-600">Point</th>
                    {insps.map((ins, n) => <th key={`${ins.date}${ins.at ?? ''}${n}`} scope="col" className="px-0.5 py-0.5"><button type="button" onClick={() => setSel({ n })} aria-label={`Routine du ${frDate(ins.date)}${isSummary(ins) ? ' (résumée)' : ''}`} className="rounded px-1.5 py-1 font-mono font-semibold text-slate-700 hover:bg-slate-100 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">{ins.date.slice(8, 10)}/{ins.date.slice(5, 7)}</button></th>)}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ cp, i }) => (
                    <tr key={cp.id ?? i} className="border-t border-slate-100">
                      <th scope="row" className="sticky left-0 z-[1] max-w-[11rem] truncate bg-white px-2 py-1 text-left font-semibold text-slate-800">{cp.label}</th>
                      {insps.map((ins, n) => {
                        const cell = cellOf(e, ins, i), c = CELL[cell.r ?? 'none'], said = cell.sum ? `routine résumée, pire résultat : ${c.label}` : c.label;
                        return (
                          <td key={n} className="px-0.5 py-0.5 text-center">
                            <button type="button" onClick={() => setSel({ n, i })} aria-label={`${cp.label}, ${frDate(ins.date)} : ${said}`} title={said}
                              className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[11px] font-bold max-sm:h-11 max-sm:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 ${c.cls} ${cell.sum ? 'opacity-60' : ''}`}><span aria-hidden>{c.sym}</span></button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600" aria-hidden>
              {(['ok', 'watch', 'ko', 'none'] as const).map(k => <span key={k} className="inline-flex items-center gap-1"><span className={`flex h-4 w-4 items-center justify-center rounded-sm text-[11px] font-bold ${CELL[k].cls}`}>{CELL[k].sym}</span>{CELL[k].label}</span>)}
            </div>
            {insps.some(isSummary) && <p className="text-[11px] text-slate-600">Une routine résumée (plus de 24 mois) ne garde que le pire résultat de la routine : il est montré en pâle sur chaque point.</p>}
            {picked && (
              <div role="status" className="space-y-0.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-800">
                <p><strong>Routine du {frDate(picked.date)}{picked.at ? ` à ${picked.at.slice(11, 16)}` : ''}</strong> ({picked.by || 'une personne'}).{picked.note ? ` « ${picked.note} »` : ''}{isSummary(picked) ? ` Routine résumée : seul le pire résultat est gardé, « ${CELL[picked.worst ?? 'ok'].label} ».` : ''}</p>
                {(picked === last || picked.date === today) && <Button kind="danger" className="!py-1" onClick={() => { act(x => removeInspection(x, inspectionKey(picked))); setSel(null); }}>Retirer cette routine</Button>}
                {pc && <p>Point « {pc.cp.label} » : {pc.c.sum ? `routine résumée, pire résultat de la routine : ${CELL[pc.c.r ?? 'none'].label} (le détail par point n'est plus gardé)` : CELL[pc.c.r ?? 'none'].label}{pc.c.v !== null ? `, valeur mesurée ${formatValue(pc.c.v, pc.cp.unit || '')}` : ''}{outOfBounds(pc.cp, pc.c.v) ? ` (hors bornes : ${boundsText(pc.cp)})` : ''}.</p>}
              </div>
            )}
          </>
        )}
      </Sec>

      <Sec title="Relevés chiffrés" hint={measured.length ? 'Les 12 dernières valeurs de chaque point mesuré, de la plus ancienne à la plus récente.' : 'Pour suivre une valeur (pression, niveau, température), donner un mini ou un maxi à un point.'}>
        <ul className="space-y-2">
          {measured.map(({ cp, i, rs }) => (
            <li key={cp.id ?? i} className="space-y-1">
              <div className="text-[11px] text-slate-700"><strong className="text-slate-900">{cp.label || `Point ${i + 1}`}</strong>{hasBounds(cp) ? ` · plage : ${boundsText(cp)}` : ''}</div>
              {rs.length === 0 ? <p className="text-[11px] text-slate-500">Aucune valeur relevée pour l'instant.</p> : (
                <ul className="flex flex-wrap gap-1">
                  {rs.map((r, n) => {
                    const out = outOfBounds(cp, r.value), low = cp.min != null && r.value < cp.min;
                    return <li key={n} title={`${frDate(r.date)} : ${formatValue(r.value, cp.unit || '')}${out ? ' (hors bornes)' : ''}`} className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${out ? 'border-red-300 bg-red-50 font-bold text-red-800' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>{out && <span aria-hidden>{low ? '↓ ' : '↑ '}</span>}{formatValue(r.value, '')}{out && <span className="sr-only"> hors bornes</span>}</li>;
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Sec>

      <Fold title="Modifier la routine" open={!cps.some(c => c.label.trim()) && !e.inspections.length}>
        <Sec title="Rythme de la routine">
          <Seg label="Rythme" value={every} onChange={setRhythm} items={RHYTHMS.map(r => [r.key, r.label] as [Rhythm, string])} />
          {(every === 'week' || every === 'fortnight') && (
            <div className="max-w-xs">
              <Field label="Jour de la routine">
                <select className={inputCls} value={e.routine?.day ?? 0} onChange={ev => setDay(Number(ev.target.value))}>
                  <option value={0}>Jour des réglages de l'outil ({DAYS[(maintCfg(state.params).routineDay - 1 + 7) % 7]})</option>
                  {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </Field>
            </div>
          )}
        </Sec>

        <Sec title="Qui fait la routine" hint="Le titulaire et le suppléant se changent dans l'onglet Fiche.">
          <p className="text-[11px] text-slate-700">
            Titulaire : <strong>{e.operator.trim() || 'non désigné'}</strong> · Suppléant : <strong>{txt(e.deputy).trim() || 'non désigné'}</strong>
            {owner.who ? <> · Aujourd'hui : <strong>{owner.who}</strong>{owner.deputy ? ` (${e.operator.trim()} est absent)` : owner.absent ? ' (absent, aucun suppléant désigné)' : ''}</> : ' · Aujourd\'hui : personne désignée'}
          </p>
        </Sec>

        <Sec title={`Points de la routine : ${cps.length}`} hint="Ce qu'on regarde, ce que veut dire OK (en photo), et, pour un point qui se mesure, le mini et le maxi : une valeur hors bornes compte comme une anomalie.">
          <ol className="space-y-2">
            {cps.map((cp, i) => {
              const open = !!cp.id && opens.some(a => a.pointId === cp.id), eye = !!cp.id && watch.includes(cp.id), label = cp.label.trim() || `point ${i + 1}`;
              return (
                <li key={cp.id ?? i} draggable={armed === i} onDragStart={() => setFrom(i)} onDragEnd={() => { setFrom(null); setArmed(null); }} onDragOver={ev => { if (from !== null && from !== i) ev.preventDefault(); }} onDrop={() => { if (from !== null) shift(from, i); setFrom(null); }}
                  className={`space-y-2 rounded-lg border border-slate-200 p-2 ${from === i ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span title="Glisser pour déplacer" className="hidden shrink-0 cursor-grab text-slate-600 sm:block" onMouseDown={() => { setArmed(i); window.addEventListener('mouseup', () => setArmed(null), { once: true }); }}><GripVertical size={14} /></span>
                    <span className="w-5 shrink-0 text-xs font-bold text-delacour-primary">{i + 1}.</span>
                    <input className={`${inputCls} min-w-[8rem] flex-1`} value={cp.label} placeholder="Ce qu'on regarde" aria-label={`Point ${i + 1} : libellé`} onChange={ev => setPt(i, { label: ev.target.value })} />
                    {open && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800"><TriangleAlert size={12} aria-hidden />Anomalie ouverte</span>}
                    {!open && eye && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900"><Eye size={12} aria-hidden />À surveiller</span>}
                    {([['Monter ce point', <ArrowUp key="u" size={14} />, () => shift(i, i - 1), i === 0], ['Descendre ce point', <ArrowDown key="d" size={14} />, () => shift(i, i + 1), i === cps.length - 1],
                      ['Retirer ce point', <X key="x" size={14} />, () => dropPt(i), false]] as const).map(([l, ic, f, off]) => (
                      <button key={l} type="button" aria-label={`${l} : ${label}`} title={l} disabled={off} onClick={f} className={tap}>{ic}</button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,220px)]">
                    <div className="space-y-1.5">
                      <input className={inputCls} value={cp.criterion} placeholder="Ce qui est OK (critère)" aria-label={`Point ${i + 1} : critère`} onChange={ev => setPt(i, { criterion: ev.target.value })} />
                      <div className="grid grid-cols-3 gap-1.5">
                        <Field label="Mini mesuré"><NumInput value={cp.min} onChange={v => setPt(i, { min: v })} aria-label={`Point ${i + 1} : mini`} placeholder="facultatif" /></Field>
                        <Field label="Maxi mesuré"><NumInput value={cp.max} onChange={v => setPt(i, { max: v })} aria-label={`Point ${i + 1} : maxi`} placeholder="facultatif" /></Field>
                        <Field label="Unité"><input className={inputCls} value={cp.unit || ''} placeholder="bar, °C…" aria-label={`Point ${i + 1} : unité`} onChange={ev => setPt(i, { unit: ev.target.value || undefined })} /></Field>
                      </div>
                    </div>
                    <PhotoBox value={cp.photo || ''} label={`Photo de référence : ${label}`} onChange={v => setPt(i, { photo: v || undefined })} />
                  </div>
                </li>
              );
            })}
          </ol>
          <Button className="!px-2 !py-1" onClick={() => set(prev => ({ checkpoints: [...prev.checkpoints, { id: newId('pt'), label: '', criterion: '' }] }))}><Plus size={13} />Ajouter un point</Button>
        </Sec>
      </Fold>
      {bar}
    </div>
  );
}
