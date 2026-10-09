// Third tab of the sheet of an order (tool 3.4): the release before departure, a named act (a person picked with big buttons, the moment written by the tool, a finger
// signature if the person wishes) that is refused while a milestone is not conform or a defect has no decision, unless a derogation is written (who, why); the release can be
// cancelled with a reason. Then the checks before departure (done, does not apply, not done), written by the person picked. Every gesture is a move of the life (`act`).
// The facts of a derogation (who, why, whether the person checked or passed over the gap, whether the person is on the list of those who release) are told, and so is a clock
// of the device that is behind the last recorded act (the moment of the release would not be credible).
import { useRef, useState } from 'react';
import { Check, Lock, TriangleAlert, X } from 'lucide-react';
import type { ShipCheck, Strokes } from '../../domain/types';
import { canRelease, clockFact, derogationFacts, isLocked, mayRelease, milestoneProgress, ncOf, promisedOn, releaseDelivery, releasedAfterDelivery, setShipCheck, shipChecksOf, signatureOk, unreleaseDelivery } from '../../domain/receptions';
import { daysBetween, nb, nowLocal } from '../../domain/base';
import { isoDate } from '../../domain/periods';
import { Button, Field, inputCls, NewTab, SubTitle } from '../common';
import { SignaturePad } from '../SignaturePad';
import { BIG } from './rcShared';
import { de, fmtMoment, jalonsOk, PeoplePick, peopleOf, plural, useHold, sentence, rcDay } from './RcBits';
import { Ink } from './RcReserves';
import type { RcTabProps } from './RcSheet';
import { applied, OFF } from './RcTabReception';
import { releaseLines } from '../../domain/receptionsPdf';

type Mark = 'ok' | 'na' | 'ko';
const MARKS: [Mark, string, string][] = [['ok', 'Fait', 'border-emerald-800 bg-emerald-700 text-white'], ['na', 'Sans objet', 'border-slate-700 bg-slate-600 text-white'], ['ko', 'Pas fait', 'border-red-800 bg-red-700 text-white']];
// What a signed PV says of a check before departure: colour, icon and word at full strength, never three switched-off buttons
const FACT: Record<Mark, { icon: typeof Check; cls: string }> = {
  ok: { icon: Check, cls: 'border-emerald-700 bg-emerald-50 text-emerald-900' },
  na: { icon: Lock, cls: 'border-slate-400 bg-slate-50 text-slate-800' },
  ko: { icon: X, cls: 'border-red-700 bg-red-50 text-red-900' },
};
const markOf = (c: ShipCheck): Mark | '' => (c.na ? 'na' : c.ok === true ? 'ok' : c.ok === false ? 'ko' : '');

export function RcTabRelease({ d, act, hold, state, nav, who: given, setWho: setGiven }: RcTabProps) {
  const [detail, setDetail] = useState(false), [mine, setMine] = useState(''), [sign, setSign] = useState<Strokes>(), [why, setWhy] = useState(''), [cancel, setCancel] = useState<string | null>(null);
  const who = given ?? mine, setWho = setGiven ?? setMine;   // the sheet gives the person for all its tabs; alone, the tab asks
  // a motive or a signature typed and not applied yet: the sheet names it before it closes
  useHold(hold, 'rel-why', why.trim() ? 'Motif de dérogation en cours de saisie, libération pas encore faite' : '');
  useHold(hold, 'rel-sign', sign?.length ? 'Signature de la libération dessinée, pas encore enregistrée' : '');
  useHold(hold, 'rel-cancel', cancel?.trim() ? "Motif d'annulation de la libération en cours de saisie, pas encore enregistré" : '');
  const now = new Date(), p = state.params, cr = canRelease(state, d), pr = milestoneProgress(d), people = peopleOf(state, d, isoDate(now)), locked = isLocked(d);
  const waived = d.milestones.flatMap((m, i) => (m.waivedBy ? [`Jalon ${i + 1}${m.label.trim() ? ` «\u202f${m.label.trim()}\u202f»` : ''}\u202f: dérogation ${de(m.waivedBy)}${m.waivedWhy ? ` (${m.waivedWhy})` : ''}`] : []));
  const ships = shipChecksOf(d, p), shipDone = ships.filter(c => c.ok === true || c.na).length, shipKo = ships.filter(c => c.ok === false).length;
  const noDecision = d.milestones.flatMap(m => { const n = ncOf(state, m.ncId); return n && (!n.decision || n.decision === 'attente') ? [n] : []; });
  const promised = promisedOn(state, d), left = promised && !d.reception.date ? daysBetween(isoDate(now), promised) : null;
  const clock = clockFact(state), short = !!sign?.length && !signatureOk(sign), dfacts = derogationFacts(d, p);
  const blocker = clock ? 'Horloge de l\'appareil en retard sur le dernier acte enregistré\u202f: voir ci-dessus.' : !who ? 'Personne pas encore choisie.' : !cr.ok && !why.trim() ? 'Motif de la dérogation pas encore écrit.' : '';
  // the button that vanishes leaves the focus on the page: the block that says "Libérée par" mounts, then takes it
  const after = useRef(false);
  const said = (el: HTMLElement | null) => { if (el && after.current) { after.current = false; el.focus(); } };
  // what stands in the way is read on the CURRENT state of the store (a defect decided meanwhile counts), at the moment of the tap
  const release = () => {
    if (applied(act, (x, _by, s) => releaseDelivery(x, { by: who, at: nowLocal(), ...(sign?.length && signatureOk(sign) ? { sign } : {}), ...(!canRelease(s, x).ok ? { derogation: { why: why.trim() } } : {}) }, s))) after.current = true;
    setSign(undefined); setWhy('');
  };
  // every check not yet answered is done, in one write, by the person picked
  const allOk = () => { const at = nowLocal(); act(x => ships.filter(c => !c.na && c.ok == null).reduce((y, c) => setShipCheck(y, c.id, true, who, at, false, p), x)); };
  const ship = (c: ShipCheck, k: Mark) => {
    const at = nowLocal(), same = markOf(c) === k;
    act(x => setShipCheck(x, c.id, same || k === 'na' ? null : k === 'ok', who, at, !same && k === 'na', p));
  };

  return (
    <div className="space-y-6">
      {promised && !d.reception.date && (
        <p className={`text-xs ${left !== null && left < 0 ? 'font-semibold text-red-700' : 'text-slate-700'}`}>
          {sentence(nb(`Livraison promise le ${rcDay(promised)}${left === null ? '' : left < 0 ? `\u202f: dépassée de ${plural(-left, 'jour')}` : left === 0 ? " : aujourd'hui" : `\u202f: dans ${plural(left, 'jour')}`}`))}
        </p>
      )}
      {locked && <p role="status" className="flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800"><Lock size={14} aria-hidden className="mt-0.5 shrink-0" />PV signé&#8239;: la libération et le contrôle de départ ne se modifient plus.</p>}
      {clock && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900"><TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />{clock}</p>}
      {!locked && !setGiven && <PeoplePick value={who} onChange={setWho} names={people.names} absent={people.absent} label="Qui libère ou contrôle le départ&#8239;?" />}

      <section className="space-y-3">
        <SubTitle>Contrôle de départ</SubTitle>
        {(() => {
          const allDone = ships.length > 0 && shipDone === ships.length, partial = (shipDone > 0 && !allDone) || shipKo > 0, listed = locked || detail || partial;
          const line = `${plural(ships.length, 'contrôle')} de départ\u202f: ${allDone ? 'tous faits ou sans objet' : shipDone ? `${shipDone} sur ${ships.length} faits ou sans objet${shipKo ? `, ${shipKo} pas fait${shipKo > 1 ? 's' : ''}` : ''}` : 'rien de fait pour le moment'}.`;
          return <>
            <p className="text-xs text-slate-600">{nb(line)}{!who && !locked && ' Personne pas encore choisie\u202f: les contrôles sont inactifs.'}</p>
            {!listed && ships.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {!allDone && <Button kind="primary" className={OFF} disabled={!who} onClick={allOk}><Check size={14} aria-hidden />Tout fait<span className="sr-only"> : les {plural(ships.length, 'contrôle')} de départ</span></Button>}
                <Button onClick={() => setDetail(true)}>Signaler un seul<span className="sr-only"> contrôle de départ</span></Button>
              </div>
            )}
            {listed && <ul className="space-y-2">
          {ships.map(c => {
            const cur = markOf(c);
            return (
              <li key={c.id} className="space-y-1 rounded-lg border border-slate-200 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-[9rem] flex-1 break-words text-xs font-semibold text-slate-900">{c.label}</span>
                  {locked
                    ? (() => { const F = FACT[cur || 'na'], I = cur ? F.icon : Lock; return <p className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border-2 px-3 text-xs font-bold ${cur ? F.cls : 'border-slate-300 bg-slate-50 text-slate-700'}`}><I size={14} aria-hidden /><span className="sr-only">Contrôle de départ&#8239;: {c.label} : </span>{cur ? MARKS.find(m => m[0] === cur)![1] : 'Non renseigné'}</p>; })()
                    : <div role="group" aria-label={`Contrôle de départ\u202f: ${c.label}`} className="flex gap-1.5">
                      {MARKS.map(([k, l, on]) => (
                        <button key={k} type="button" aria-pressed={cur === k} disabled={!who} onClick={() => ship(c, k)}
                          className={`min-h-[44px] rounded-lg border-2 px-3 text-xs font-bold disabled:!opacity-100 ${cur === k ? on : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-600'}`}>{l}<span className="sr-only"> : {c.label}</span></button>
                      ))}
                    </div>}
                </div>
                {cur && <p className="text-xs text-slate-600">{MARKS.find(m => m[0] === cur)![1]} · {c.by} · {fmtMoment(c.at)}</p>}
              </li>
            );
          })}
            </ul>}
          </>;
        })()}
      </section>

      <section className="space-y-3">
        <SubTitle>Libération avant départ</SubTitle>
        {waived.length > 0 && !d.releasedAt && <ul role="status" className="list-disc space-y-0.5 rounded-lg bg-amber-50 py-2 pl-7 pr-3 text-xs text-amber-950">{waived.map(w => <li key={w}>{w}</li>)}</ul>}
        {cr.notes && !d.releasedAt && <ul role="status" className="list-disc space-y-0.5 rounded-lg bg-slate-50 py-2 pl-7 pr-3 text-xs text-slate-800">{cr.notes.map(w => <li key={w}>{w}.</li>)}</ul>}
        {who && !locked && !mayRelease(p, who) && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">{who} ne figure pas dans la liste des personnes qui libèrent (réglages de l'outil). La libération reste possible et se lit comme faite hors de cette liste.</p>}
        {d.releasedAt ? (
          <>
            <div ref={said} role="status" tabIndex={-1} className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 focus:outline-none">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><Check size={18} aria-hidden />Libérée par {d.releasedBy} · {fmtMoment(d.releasedMoment || d.releasedAt)}</p>
              {d.derogation && <p className="text-xs text-amber-950">Par dérogation, autorisée par {d.derogation.by} : «&#8239;{d.derogation.why} ».</p>}
              {dfacts.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-950">{dfacts.map(f => <li key={f}>{f}</li>)}</ul>}
              {releasedAfterDelivery(d) && d.reception.date && <p className="text-xs text-amber-950">{sentence(`Libération du ${rcDay(d.releasedAt)}, après la livraison du ${rcDay(d.reception.date)}`)}</p>}
              {d.releaseSign && <Ink s={d.releaseSign} label={`Signature ${de(d.releasedBy)}`} />}
            </div>
            {locked ? null : cancel === null ? <div><Button onClick={() => setCancel('')}>Annuler la libération</Button></div> : (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <Field label="Motif de l'annulation (obligatoire)"><input className={inputCls} value={cancel} autoFocus onChange={e => setCancel(e.target.value)} /></Field>
                <div className="flex flex-wrap items-center gap-2">
                  <Button kind="danger" className={OFF} disabled={!who || !cancel.trim()} onClick={() => { act(x => unreleaseDelivery(x, who, cancel, nowLocal())); setCancel(null); }}>Confirmer l'annulation</Button>
                  <Button onClick={() => setCancel(null)}>Garder la libération</Button>
                  {!who && <span role="status" className="text-xs text-slate-600">Personne pas encore choisie.</span>}
                </div>
              </div>
            )}
          </>
        ) : locked ? releaseLines(d, p).map((l, i) => <p key={i} className="text-xs text-slate-800">{l}</p>) : (
          <>
            {cr.ok ? (
              <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                <Check size={16} aria-hidden />Toutes les conditions sont remplies&#8239;: {pr.total ? jalonsOk(pr.done, pr.total) : 'aucun jalon à contrôler'}{pr.na ? `, ${plural(pr.na, 'sans objet', 'sans objet')}` : ''}.
              </p>
            ) : (
              <div role="status" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-amber-950"><TriangleAlert size={16} aria-hidden />Libération impossible sans dérogation</p>
                <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-950">{cr.why.map(w => <li key={w}>{w}</li>)}</ul>
                {noDecision.length > 0 && <div className="flex flex-wrap gap-2">{noDecision.map(n => <Button key={n.id} className="!py-1" onClick={() => nav.open('5.1', n.id)}>Ouvrir le défaut {n.ref}<NewTab /></Button>)}</div>}
              </div>
            )}
            {!cr.ok && (
              <div className="space-y-1">
                <Field label="Dérogation&#8239;: pourquoi libérer malgré tout (obligatoire)"><textarea className={inputCls} rows={2} value={why} onChange={e => setWhy(e.target.value)} /></Field>
                {who && <p className="text-xs text-slate-600">Dérogation autorisée par {who.replace(/\.$/, '')}.</p>}
              </div>
            )}
            <SignaturePad value={sign} onChange={setSign} label="Signature de la personne qui libère (facultative)" wide />
            {short && <p role="status" className="text-xs font-semibold text-amber-900">Tracé trop court pour compter comme une signature&#8239;: la libération se fait sans signature.</p>}
            {d.reception.date && <p role="status" className="text-xs font-semibold text-amber-900">Livraison enregistrée le {rcDay(d.reception.date)} sans libération&#8239;: la libération serait enregistrée après la livraison.</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={`${BIG} ${OFF} w-full border-emerald-900 bg-emerald-700 text-white sm:w-auto`} disabled={!!blocker} onClick={release}><Check size={22} aria-hidden />{cr.ok ? 'Libérer' : 'Libérer par dérogation'}</button>
              {blocker && <span role="status" className="text-xs text-slate-600">{blocker}</span>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
