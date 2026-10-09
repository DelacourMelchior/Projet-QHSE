// Fourth tab of the sheet of an order (tool 3.4): the reception at the customer's, in the order of the work. The delivery (moment, place), who receives (suggested by the
// directory, added to it in one tap), the result in three big buttons (a refusal asks its motive and what follows), the quantities, the photos of the state at delivery, the
// reservations, then the signatures (customer with a legible name, company, or a witness, or the photo of the paper PV), the number of the PV and the PV itself.
// What is typed (the receptionist, the place) goes through `set`; every other gesture is a move of the life written at once by `act`, by a person picked (never a blank).
// A signed PV is frozen and sealed: it is corrected only with a person and a reason, the journal says what changed and a new seal is laid. A signature is blocked by facts
// (`signBlockers`) unless a waiver names who allows it and why.
import { useRef, useState } from 'react';
import { Check, Lock, Monitor, Play, TriangleAlert, UserPlus, X } from 'lucide-react';
import type { Contact, Delivery, Org, Reception, State, Strokes } from '../../domain/types';
import {
  allReservesOf, clockFact, correctLocked, isLocked, noSignWords, OTHER, parseQty, photoReuse, presentationNo, pvSigned, qtyReceived, receptionCfg, receptionsOf, refuse, remainingQty, reservesOf, releasedAfterDelivery, retentionFact, setNoSign, setPvPhoto,
  setQuantities, setReceptionist, setResult, setStatePhotos, signatureOk, signatureReuse, signBlockers, signClient, signCompany, signWaiver, startReception, takeLife,
} from '../../domain/receptions';
import { norm } from '../../domain/text';
import { retentionText } from '../../domain/receptionsPdf';
import { addClientToDirectory, directoryOfClient, sameClient } from '../../domain/clients';
import { feedbackFromDelivery } from '../../domain/commercial';
import { contactLabel, orgOf } from '../../domain/contacts';
import { nb, nowLocal } from '../../domain/base';
import { isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal, NewTab, NumInput, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import { Pic } from '../../photo/Pic';
import { SignaturePad } from '../SignaturePad';
import { BIG, Choose, TOUCH, Typed } from './rcShared';
import { cap, cut, de, fmtMoment, type Hold, own, PeoplePick, peopleOf, plural, TOUCH16, useHold, useUndo, sentence } from './RcBits';
import { qtyFr, qtyPlural } from './RcCards';
import { PvPdfButton, PvPrintButton, PvView } from './RcPv';
import { Ink, OFF, RcReserves } from './RcReserves';
export { OFF };
import type { RcTabProps } from './RcSheet';

interface Ctx extends RcTabProps { who: string; setWho(v: string): void; people: ReturnType<typeof peopleOf>; locked: boolean; offer(what: string, back: () => void): void }
const RESULTS: [Reception['result'], string, string][] = [
  ['sans', 'Sans réserve', 'border-emerald-900 bg-emerald-700 text-white'], ['reserve', 'Avec réserve', 'border-amber-900 bg-amber-700 text-white'], ['refus', 'Refusée', 'border-red-900 bg-red-700 text-white'],
];
// What a signed PV says of its result: a fact in colour, icon and word, at full strength (a locked fact is never drawn as a switched-off button)
const RESULT_FACT: Record<'sans' | 'reserve' | 'refus', { icon: typeof Check; cls: string }> = {
  sans: { icon: Check, cls: 'border-emerald-700 bg-emerald-50 text-emerald-900' }, reserve: { icon: TriangleAlert, cls: 'border-amber-700 bg-amber-50 text-amber-950' }, refus: { icon: X, cls: 'border-red-700 bg-red-50 text-red-900' },
};
// A field of a signed PV reads as read only
const ic = `${inputCls} disabled:bg-slate-100 disabled:text-slate-600`;
// What a signed PV says of itself, as a fact: the content is frozen in the application; a correction is a gesture with a person and a reason, a line of the journal and a new seal
export const SHEET_LOCK_NOTE = 'PV signé\u202f: le contenu est verrouillé. Une correction passe par «\u202fCorriger\u202f», laisse une ligne au journal et un nouveau scellé.';
// A move of the life that says whether the domain applied it (the order comes back as it was when it refuses): `act` writes synchronously
export const applied = (act: RcTabProps['act'], f: (x: Delivery, by: string, s: State) => Delivery): boolean => {
  let done = false;
  act((x, by, s) => { const y = f(x, by, s); done = y !== x; return y; });
  return done;
};
// "2026-10-04T14:05" -> "4 oct. à 14 h 05" (the caller writes "le" or "du")
export const when = (at: string) => fmtMoment(at);
const WITNESS = ['Entreprise', 'Client', 'Tiers', OTHER];
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-semibold ${TOUCH} ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`;
// What the refusal form shows for a saved refusal (the motive and the follow-up are the chosen words, or what was written under "Autre")
const reasonOf = (rf: Reception['refusal']) => (!rf ? '' : rf.reason === OTHER ? rf.other?.trim() || OTHER : rf.reason);
const nextOf = (rf: Reception['refusal']) => (!rf?.next ? '' : rf.next === OTHER ? rf.nextOther?.trim() || OTHER : rf.next);
// A quantity typed that is not written: said as a fact, with the reason (a negative one is not a quantity)
const Bad = ({ text }: { text: string }) => <span role="status" className="block text-xs font-semibold text-red-700">«&#8239;{text} »&#8239;: {/^[-−–]/.test(text) ? "une quantité n'est pas négative" : 'un nombre est attendu'}, rien n'est enregistré.</span>;
// What the domain does not allow, said in facts by the screen (it refuses the move too): a result "sans réserve" while a reservation of this delivery is open
export const NO_SANS = "Réserve ouverte\u202f: le résultat «\u202fsans réserve\u202f» n'est pas possible.";

export function RcTabReception(p: RcTabProps) {
  const { d, act, state } = p;
  const [mine, setMine] = useState(''), [view, setView] = useState(false), [fix, setFix] = useState(false);
  const who = p.who ?? mine, setWho = p.setWho ?? setMine;   // the sheet gives the person for all its tabs; alone, the tab asks
  const { bar, offer } = useUndo();
  const re = d.reception, locked = isLocked(d), people = peopleOf(state, d, isoDate(new Date())), clock = clockFact(state);
  const c: Ctx = { ...p, who, setWho, people, locked, offer };
  return (
    <div className="space-y-6">
      {locked && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          <Lock size={14} aria-hidden className="shrink-0" /><span className="min-w-[12rem] flex-1">Le résultat, les quantités et la réception ne se modifient plus. «&#8239;Corriger&#8239;» laisse une ligne au journal et un nouveau scellé.</span>
          <Button onClick={() => setFix(true)}>Corriger</Button>
        </div>
      )}
      {clock && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900"><TriangleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />{clock}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
        {presentationNo(d) > 1 && <span className="font-semibold">Livraison n° {presentationNo(d)} de cette commande</span>}
        {re.pvNo ? <span>PV n° <strong className="font-mono">{re.pvNo}</strong></span> : <span>Le numéro du PV est donné à la signature.</span>}
      </div>
      {!p.setWho && <PeoplePick value={who} onChange={setWho} names={people.names} absent={people.absent} label="Qui remet pour l'entreprise&#8239;?" />}
      <Start c={c} />
      <Receptionist c={c} />
      <Result c={c} />
      <Quantities c={c} />
      <StatePhotos c={c} />
      {(re.result === 'reserve' || allReservesOf(d).length > 0) && <section><RcReserves d={d} act={act} state={state} nav={p.nav} who={who} setWho={setWho} focus={p.focusReserve} hold={p.hold} /></section>}
      <Signatures c={c} />
      <div><Button onClick={() => setView(true)}>Voir le PV</Button></div>
      {view && <Modal wide onClose={() => setView(false)} title={`Procès-verbal de réception${re.pvNo ? ` ${re.pvNo}` : ''}`} subtitle={d.client.trim() || undefined} footer={<><PvPrintButton d={d} state={state} /><PvPdfButton d={d} state={state} /><Button onClick={() => setView(false)}>Fermer</Button></>}><PvView d={d} state={state} /></Modal>}
      {fix && <Fix c={c} onClose={() => setFix(false)} />}
      {bar}
    </div>
  );
}

function Start({ c }: { c: Ctx }) {
  const { d, set, act, nav, full, who, locked } = c, re = d.reception;
  return (
    <section className="space-y-3">
      <SubTitle>1. Livraison chez le client</SubTitle>
      {re.date
        ? <div className="space-y-1">
          <p role="status" className="text-xs font-semibold text-slate-900">{sentence(`Livrée le ${fmtMoment(re.time ? `${re.date}T${re.time}` : re.date)}`)}</p>
          {!d.releasedAt && <p role="status" className="text-xs font-semibold text-amber-900">Livrée sans libération enregistrée.</p>}
          {releasedAfterDelivery(d) && <p role="status" className="text-xs font-semibold text-amber-900">Libération enregistrée après la livraison.</p>}
        </div>
        : <>
          <button type="button" disabled={!who} className={`${BIG} ${OFF} w-full border-delacour-dark bg-delacour-primary text-white sm:w-auto`} onClick={() => act(x => startReception(x, { at: nowLocal(), place: re.place, by: who }))}><Play size={22} aria-hidden />Commencer la réception</button>
          {!who && <p role="status" className="text-xs text-slate-600">Personne qui remet pas encore choisie.</p>}
          {!d.releasedAt && <p className="text-xs text-slate-600">La commande n'est pas encore libérée.</p>}
        </>}
      <Field label="Lieu de la réception (adresse ou site)"><input className={ic} disabled={locked} value={re.place ?? ''} onChange={e => set({ reception: { ...re, place: e.target.value } })} /></Field>
      <Field label="Bon de livraison n°" hint="Celui de cette livraison&#8239;: chaque livraison a le sien.">
        {locked
          ? <span className="block font-mono text-xs text-slate-900">{re.bl?.trim() || 'Non renseigné'}</span>
          : <Typed key={`${d.id}-bl-${presentationNo(d)}`} value={re.bl ?? ''} onSave={v => act(x => setReceptionist(x, { bl: v.trim() }))} aria-label="Bon de livraison n°" className={`${inputCls} font-mono`} />}
      </Field>
      <Button onClick={() => (full ? full('reception') : nav.tool('3.4', `reception:${d.id}`))}><Monitor size={14} aria-hidden />Réception chez le client en grand écran</Button>
    </section>
  );
}

// Who receives, on the customer side: the people of the directory for this customer are offered, the name is written otherwise, and one tap adds the person to the directory
function Receptionist({ c }: { c: Ctx }) {
  const { d, set, state, nav, locked } = c, { update } = useStore(), re = d.reception;
  const oid = d.orgId || re.orgId, dir = directoryOfClient(state, d.client, oid), card = own(state.contacts, re.contactId), name = re.name.trim();   // the organisation the order holds (renamed in 1.3 or not) comes before the name typed
  const link = (x: Partial<Reception>) => set({ reception: { ...re, ...x } });
  const orgId = (k: Contact) => orgOf(state, k.company)?.id ?? '';
  const typed = (v: string) => { const k = dir.contacts.find(x => x.name.trim().toLowerCase() === v.trim().toLowerCase()); link({ name: v, ...(k ? { contactId: k.id, orgId: orgId(k), role: re.role || k.role, email: re.email || k.email } : { contactId: '' }) }); };
  const add = () => {
    const out: { org?: Org; card?: Contact } = {};
    update(x => {
      out.org = addClientToDirectory(x, d.client, [{ ...feedbackFromDelivery(d), contact: name, email: re.email ?? '' }], oid).org;
      out.card = Object.values(x.contacts).find(k => sameClient(k.company, out.org?.name ?? d.client) && k.name.trim().toLowerCase() === name.toLowerCase());
      if (out.card && re.role.trim() && !out.card.role) out.card.role = re.role.trim();
    });
    if (out.card) link({ contactId: out.card.id, orgId: out.org?.id ?? '' });
  };
  return (
    <section className="space-y-3">
      <SubTitle>2. Qui réceptionne chez le client</SubTitle>
      {dir.contacts.length > 0 && !locked && (
        <div className="space-y-1">
          <span className="block text-xs font-semibold text-slate-700">Personnes de l'annuaire pour {d.client.trim()}</span>
          <div className="flex flex-wrap gap-2">
            {dir.contacts.slice(0, 8).map(k => <button key={k.id} type="button" aria-pressed={re.contactId === k.id} className={chip(re.contactId === k.id)} onClick={() => link({ name: k.name, role: k.role, email: k.email, contactId: k.id, orgId: orgId(k) })}>{k.name}{k.role ? ` · ${k.role}` : ''}</button>)}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nom lisible"><input className={ic} disabled={locked} value={re.name} autoComplete="off" onChange={e => typed(e.target.value)} /></Field>
        <Field label="Fonction ou qualité pour recevoir"><input className={ic} disabled={locked} value={re.role} onChange={e => link({ role: e.target.value })} /></Field>
        <Field label="E-mail"><input type="email" className={ic} disabled={locked} value={re.email ?? ''} onChange={e => link({ email: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        {card ? <><span>Dans l'annuaire&#8239;: {contactLabel(card)}.</span><Button className="!py-1" onClick={() => nav.open('1.3', card.id)}>Ouvrir dans l'annuaire<NewTab /></Button></>
          : name && !d.client.trim() ? <span>Client pas encore écrit&#8239;: l'ajout à l'annuaire se fait avec le client.</span>
            : name ? <><span>Cette personne n'est pas dans l'annuaire (outil 1.3).</span>{!locked && <Button className="!py-1" onClick={add}><UserPlus size={13} aria-hidden />Ajouter à l'annuaire</Button>}</>
              : d.client.trim() && !dir.org && !dir.contacts.length ? <span>Ce client n'est pas dans l'annuaire (outil 1.3).</span> : null}
      </div>
    </section>
  );
}

function Result({ c }: { c: Ctx }) {
  const { d, act, state, who, locked } = c, re = d.reception, open = reservesOf(d).filter(r => !r.liftedAt).length, fact = retentionFact(d, state.params);
  const [refusing, setRefusing] = useState(false), [said, setSaid] = useState(false);
  const pick = (k: Reception['result']) => {
    if (k === 'refus' && re.result !== 'refus') { setRefusing(!refusing); return; }
    setRefusing(false);
    if (k === 'sans' && re.result !== 'sans' && open > 0) { setSaid(true); return; }   // refused by the domain as well: the fact is said, nothing is written
    setSaid(false);
    const at = nowLocal();
    act((x, _by, s) => setResult(x, re.result === k ? '' : k, at, who, s));   // the domain gives the number of the PV when this result locks it
  };
  return (
    <section className="space-y-3">
      <SubTitle>3. Résultat de la réception</SubTitle>
      {locked && re.result
        ? (() => { const F = RESULT_FACT[re.result], I = F.icon; return <p className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-bold ${F.cls}`}><I size={20} aria-hidden /><span className="sr-only">Résultat de la réception&#8239;: </span>{RESULTS.find(r => r[0] === re.result)![1]}</p>; })()
        : <div role="group" aria-label="Résultat de la réception" className="grid gap-2 sm:grid-cols-3">
          {RESULTS.map(([k, l, on]) => {
            const sel = re.result === k || (k === 'refus' && refusing);
            return <button key={k} type="button" aria-pressed={sel} disabled={!who} onClick={() => pick(k)} className={`${BIG} disabled:!opacity-100 ${sel ? on : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-600'}`}>{l}</button>;
          })}
        </div>}
      {!who && !locked && <p role="status" className="text-xs text-slate-600">Personne qui remet pas encore choisie&#8239;: le résultat est inactif.</p>}
      {re.result === 'sans' && open > 0 && <p role="status" className="text-xs font-semibold text-amber-900">Résultat «&#8239;sans réserve&#8239;» avec {plural(open, 'réserve ouverte', 'réserves ouvertes')}.</p>}
      {said && open > 0 && <p role="status" className="text-xs font-semibold text-red-700">{NO_SANS}</p>}
      {retentionText(state.params) && <p className="text-xs text-slate-700">{retentionText(state.params)}</p>}
      {fact && <p role="status" className="text-xs font-semibold text-amber-900">{fact[0].toUpperCase()}{fact.slice(1)}.</p>}
      {locked && re.result === 'refus' && re.refusal && <div className="space-y-1 text-xs text-slate-800"><p>Motif&#8239;: {reasonOf(re.refusal)}</p><p>Suite&#8239;: {nextOf(re.refusal)}</p>{re.refusal.photo && <Pic value={re.refusal.photo} alt="Photo de ce qui est refusé" size="t" className="h-28 w-40 rounded-lg border border-slate-200" />}</div>}
      {!locked && (refusing || re.result === 'refus') && <Refusal c={c} done={() => setRefusing(false)} />}
    </section>
  );
}

// The motive of a refusal (a list that ends with "Autre", then what is written is the motive) and what follows; the photo of what is refused
function Refusal({ c, done }: { c: Ctx; done(): void }) {
  const { d, act, state, who, locked } = c, rf = d.reception.refusal, cfg = receptionCfg(state.params);
  const [reason, setReason] = useState(() => reasonOf(rf));
  const [next, setNext] = useState(() => nextOf(rf));
  const [photo, setPhoto] = useState(rf?.photo ?? '');
  // a motive, a follow-up or a photo chosen and not saved yet: the sheet names it before it closes
  useHold(c.hold, 'refusal', reason !== reasonOf(rf) || next !== nextOf(rf) || photo !== (rf?.photo ?? '') ? `Refus en cours de saisie${reason ? `\u202f: motif «\u202f${cut(reason)}\u202f»` : ''}, pas encore enregistré` : '');
  const r1: { reason: string; other?: string } = cfg.refusals.includes(reason) && reason !== OTHER ? { reason } : { reason: OTHER, other: reason === OTHER ? '' : reason };
  const n1: { next: string; nextOther?: string } = cfg.nexts.includes(next) && next !== OTHER ? { next } : { next: next ? OTHER : '', nextOther: next === OTHER ? '' : next };
  const why = !who ? 'Personne qui remet pas encore choisie.' : !reason ? 'Motif pas encore choisi.' : r1.reason === OTHER && !r1.other?.trim() ? '«\u202fAutre\u202f» demande une précision pour le motif.' : n1.next === OTHER && !n1.nextOther?.trim() ? '«\u202fAutre\u202f» demande une précision pour la suite.' : '';
  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-3">
      <div className="space-y-1.5"><span className="block text-xs font-semibold text-slate-800">Motif du refus</span><Choose chips list={cfg.refusals} value={reason} onChange={setReason} label="Motif du refus" /></div>
      <div className="space-y-1.5"><span className="block text-xs font-semibold text-slate-800">Suite</span><Choose chips list={cfg.nexts} value={next} onChange={setNext} label="Suite du refus" /></div>
      <div className="max-w-[14rem]"><PhotoBox value={photo} label="Photo de ce qui est refusé" onChange={setPhoto} /></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button kind="primary" className={OFF} disabled={locked || !!why} onClick={() => { const at = nowLocal(); act((x, _by, s) => refuse(x, { ...r1, ...n1, ...(photo ? { photo } : {}) }, at, who, s)); done(); }}>{rf ? 'Mettre à jour le refus' : 'Enregistrer le refus'}</Button>
        {why && <span role="status" className="text-xs text-slate-700">{why}</span>}
      </div>
    </div>
  );
}

function Quantities({ c }: { c: Ctx }) {
  const { d, act, who, locked } = c, re = d.reception, all = receptionsOf(d), cur = all[all.length - 1], got = qtyReceived(d), rest = remainingQty(d), gap = re.count != null && cur.qty != null ? Math.round((re.count - cur.qty) * 1e6) / 1e6 : 0;
  // a text that is not a number writes nothing and stays in the field, with the fact under it (an empty field is "not given")
  const [bad, setBad] = useState<{ qty?: string; count?: string }>({});
  const write = (k: 'qty' | 'count') => (v: string) => { const n = parseQty(v); setBad(b => ({ ...b, [k]: n === undefined ? v.trim() : undefined })); if (n !== undefined) act(x => setQuantities(x, { [k]: n }, who, nowLocal())); };
  useHold(c.hold, 'qty-bad', bad.qty || bad.count ? `Quantité «\u202f${cut(bad.qty || bad.count || '')}\u202f» pas enregistrée\u202f: un nombre positif ou nul est attendu` : '');
  const text = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));
  const ok = re.partialOk;
  return (
    <section className="space-y-3">
      <SubTitle>4. Quantités</SubTitle>
      {!who && !locked && <p role="status" className="text-xs text-slate-600">Personne qui remet pas encore choisie&#8239;: les quantités sont inactives.</p>}
      <fieldset disabled={!who} className="m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
        <Field label="Quantité livrée dans cette livraison" hint="Vide&#8239;: tout le reste de la commande.">
          {locked ? <span className="block font-mono text-xs text-slate-900">{text(re.qty) || 'Tout le reste'}</span> : <><Typed key={`${d.id}-q`} value={text(re.qty)} onSave={write('qty')} aria-label="Quantité livrée dans cette livraison" className={`${inputCls} font-mono`} />{bad.qty && <Bad text={bad.qty} />}</>}
        </Field>
        <Field label="Quantité comptée sur place">
          {locked ? <span className="block font-mono text-xs text-slate-900">{text(re.count) || 'Non comptée'}</span> : <><Typed key={`${d.id}-c`} value={text(re.count)} onSave={write('count')} aria-label="Quantité comptée sur place" className={`${inputCls} font-mono`} />{bad.count && <Bad text={bad.count} />}</>}
        </Field>
      </fieldset>
      {locked && <p className="text-xs text-slate-600">PV signé&#8239;: les quantités se corrigent avec «&#8239;Corriger&#8239;».</p>}
      {d.qty != null && <p className="text-xs text-slate-800">Quantité commandée&#8239;: {qtyFr(d.qty)} · reçue&#8239;: {qtyFr(got)} · reste à livrer&#8239;: {qtyFr(rest ?? 0)}.</p>}
      {d.qty != null && got > d.qty && <p role="status" className="text-xs font-semibold text-amber-900">{qtyPlural(got, 'reçue')} pour {qtyPlural(d.qty, 'commandée')}.</p>}
      {gap !== 0 && <p role="status" className="text-xs font-semibold text-amber-900">Quantité comptée&#8239;: {qtyFr(re.count!)}, soit un écart de {gap > 0 ? '+' : '−'}{qtyFr(Math.abs(gap))} sur la quantité livrée ({qtyFr(cur.qty!)}).</p>}
      {re.qty != null && d.qty != null && re.qty < d.qty && (
        <label className={`flex items-center gap-2 text-xs text-slate-800 ${TOUCH}`}>
          <input type="checkbox" className="h-5 w-5 accent-delacour-primary" disabled={locked || !who} checked={!!ok} onChange={e => act(x => setQuantities(x, { partialOk: e.target.checked }, who, nowLocal()))} />
          Le client a accepté une livraison en plusieurs fois{ok ? ` (enregistré par ${[ok.by, fmtMoment(ok.at)].filter(Boolean).join(', ')})` : ''}{!who && ' (personne qui remet pas encore choisie)'}
        </label>
      )}
    </section>
  );
}

// The state of what is delivered, shown by the customer's side: photos kept with the PV
function StatePhotos({ c }: { c: Ctx }) {
  const { d, act, who, locked, offer } = c, photos = d.reception.photos ?? [];
  const write = (next: string[]) => act(x => setStatePhotos(x, next, who, nowLocal()));
  const remove = (i: number) => { const before = d; write(photos.filter((_, j) => j !== i)); offer('Photo retirée', () => act(x => takeLife(x, before))); };
  return (
    <section className="space-y-2">
      <SubTitle>5. Photos de l'état à la livraison</SubTitle>
      {locked && photos.length === 0 && <p className="text-xs text-slate-500">Aucune photo.</p>}
      {!who && !locked && <p role="status" className="text-xs text-slate-600">Personne qui remet pas encore choisie&#8239;: les photos sont inactives.</p>}
      <fieldset disabled={!who && !locked} className="m-0 grid min-w-0 grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4">
        {photos.map((ph, i) => locked
          ? <Pic key={`${i}-${ph}`} value={ph} alt={`Photo ${i + 1} de l'état à la livraison`} size="t" className="h-28 w-full rounded-lg border border-slate-200" />
          : <PhotoBox key={`${i}-${ph}`} value={ph} label={`Photo ${i + 1} de l'état à la livraison`} onChange={v => (v ? write(photos.map((x, j) => (j === i ? v : x))) : remove(i))} />)}
        {!locked && <PhotoBox key={`add-${photos.length}`} value="" label="Ajouter une photo de l'état à la livraison" onChange={v => v && write([...photos, v])} />}
      </fieldset>
    </section>
  );
}

function Signatures({ c }: { c: Ctx }) {
  const { d, act, state, who, locked, offer, people } = c, re = d.reception;
  const [cs, setCs] = useState<Strokes>(), [os, setOs] = useState<Strokes>(), [again, setAgain] = useState(false), [kind, setKind] = useState<'absent' | 'refused' | 'other' | null>(null), [other, setOther] = useState(''), [witness, setWitness] = useState(''), [org, setOrg] = useState('');
  const [waiving, setWaiving] = useState(false), [wby, setWby] = useState(''), [wwhy, setWwhy] = useState(''), [dup, setDup] = useState(''), [fail, setFail] = useState('');
  // after a validation the focus goes to the line that says it (a button that vanishes leaves the focus on the page): the line mounts, then takes it
  const focusOn = useRef('');
  const take = (k: string) => (el: HTMLElement | null) => { if (el && focusOn.current === k) { focusOn.current = ''; el.focus(); } };
  useHold(c.hold, 'sig-client', cs?.length ? 'Signature du client dessinée, pas encore enregistrée' : '');
  useHold(c.hold, 'sig-company', os?.length ? "Signature de l'entreprise dessinée, pas encore enregistrée" : '');
  useHold(c.hold, 'witness', kind && (witness.trim() || other.trim()) ? `Témoin «\u202f${cut(witness)}\u202f» pas encore enregistré` : '');
  useHold(c.hold, 'sig-waiver', waiving && wwhy.trim() ? 'Dérogation de signature en cours de saisie, pas encore enregistrée' : '');
  const client = !!d.signClient?.some(s => s.length), company = !!d.signCompany?.some(s => s.length), name = re.name.trim();
  // what stands in the way of a signature, as facts (the clock is told on top of the tab); a waiver (who allows it, why) lets the signature through
  const clock = clockFact(state), facts = signBlockers(state, d).filter(f => f !== clock), blocked = !re.signWaiver && (facts.length > 0 || !!clock), shown = facts.length || !clock ? facts : [clock];
  // the gestures that lock the PV get `s`: the domain gives the number, writes the deadlines and lays the seal; one it refuses (the order comes back as it was) writes nothing and says so
  const numbered = (f: (x: Delivery, at: string, s: State) => Delivery, refused: string): boolean => {
    const at = nowLocal(), done = applied(act, (x, _by, s) => f(x, at, s));
    setFail(done ? '' : refused);
    return done;
  };
  // a drawing that is already the signature of another PV is told as a fact and not recorded (the domain refuses it too)
  const clientSame = cs?.length ? signatureReuse(state, cs, d.id) : '', companySame = os?.length ? signatureReuse(state, os, d.id) : '';
  const clientWhy = !name ? 'Nom du client pas encore écrit.' : !re.result ? 'Résultat pas encore choisi.' : !who ? 'Personne qui remet pas encore choisie.' : !cs?.length ? 'Signature pas encore dessinée.' : !signatureOk(cs) ? 'Tracé trop court pour compter comme une signature.' : clientSame ? `${clientSame}\u202f: elle n'est pas enregistrée.` : blocked ? 'Signature impossible sans dérogation\u202f: voir les faits ci-dessus.' : '';
  const companyWhy = !who ? 'Personne qui remet pas encore choisie.' : !os?.length ? 'Signature pas encore dessinée.' : !signatureOk(os) ? 'Tracé trop court pour compter comme une signature.' : companySame ? `${companySame}\u202f: elle n'est pas enregistrée.` : '';
  const witnessWhy = !who ? 'Personne qui remet pas encore choisie.' : kind === 'other' && !other.trim() ? 'Raison pas encore écrite.' : !witness.trim() ? 'Nom du témoin pas encore écrit.' : norm(witness) === norm(who) ? "Le témoin est la personne qui remet pour l'entreprise\u202f: il ne peut pas l'être." : !org ? 'Organisation du témoin pas encore choisie.' : org === OTHER ? "«\u202fAutre\u202f» demande une précision pour l'organisation du témoin." : blocked ? 'Signature impossible sans dérogation\u202f: voir les faits ci-dessus.' : '';
  const photo = (v: string) => {
    const clash = v ? photoReuse(state, v, d.id) : '';
    setDup(clash);
    if (clash) return;
    const before = d;
    if (numbered((x, at, s) => setPvPhoto(x, v, at, who, s), 'La photo du PV papier n\'est pas enregistrée.') && !v) offer('Photo du PV papier retirée', () => act(x => takeLife(x, before)));
  };
  return (
    <section className="space-y-4">
      <SubTitle>6. Signatures et preuve</SubTitle>
      {(blocked || re.signWaiver) && (
        <div role="status" className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          {re.signWaiver
            ? <p className="text-xs font-semibold">Signature autorisée par dérogation {de(re.signWaiver.by)}, le {when(re.signWaiver.at)} : «&#8239;{re.signWaiver.why} ».</p>
            : <p className="flex items-center gap-2 text-xs font-bold"><TriangleAlert size={16} aria-hidden />Signature impossible sans dérogation</p>}
          {shown.length > 0 && <>{re.signWaiver && <p className="font-semibold">Faits constatés&#8239;:</p>}<ul className="list-disc space-y-0.5 pl-5">{shown.map(f => <li key={f}>{f}</li>)}</ul></>}
          {!re.signWaiver && !waiving && <Button onClick={() => setWaiving(true)}>Signer malgré ces faits</Button>}
          {!re.signWaiver && waiving && (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-white p-2.5 text-slate-800">
              <PeoplePick value={wby} onChange={setWby} names={people.names} absent={people.absent} label="Qui autorise la signature malgré ces faits&#8239;?" />
              <Field label="Pourquoi (obligatoire)"><textarea className={inputCls} rows={2} value={wwhy} onChange={e => setWwhy(e.target.value)} /></Field>
              <div className="flex flex-wrap items-center gap-2">
                <Button kind="primary" className={OFF} disabled={!wby.trim() || !wwhy.trim()} onClick={() => { act(x => signWaiver(x, wby.trim(), wwhy.trim(), nowLocal())); setWaiving(false); setWwhy(''); }}>Enregistrer la dérogation de signature</Button>
                <Button onClick={() => setWaiving(false)}>Fermer</Button>
                {(!wby.trim() || !wwhy.trim()) && <span role="status" className="text-xs text-slate-600">{!wby.trim() ? 'Personne pas encore choisie.' : 'Motif pas encore écrit.'}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      {fail && <p role="alert" className="text-xs font-semibold text-red-700">{fail}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-800">Signature du client</span>
          {client && !again ? (
            <>
              <Ink s={d.signClient!} label={`Signature ${de(name || 'client')}`} />
              <p ref={take('client')} role="status" tabIndex={-1} className="text-xs text-slate-700 focus:outline-none">{nb(`Signé par ${name || 'le client'} · ${fmtMoment(re.signedAt || '')}`)}</p>
              {!locked && <Button onClick={() => setAgain(true)}>Signer à nouveau</Button>}
            </>
          ) : (
            <>
              <SignaturePad value={cs} onChange={setCs} label="Signature du client" wide />
              <div className="flex flex-wrap items-center gap-2">
                <Button kind="primary" className={OFF} disabled={!!clientWhy} onClick={() => { const before = d, redone = client; if (!numbered((x, at, s) => signClient(x, cs!, at, who, s), "La signature du client n'est pas enregistrée.")) return; focusOn.current = 'client'; if (redone) offer('Signature du client refaite', () => act(x => takeLife(x, before))); setCs(undefined); setAgain(false); }}>Enregistrer la signature du client</Button>
                {client && <Button onClick={() => { setCs(undefined); setAgain(false); }}>Garder la signature</Button>}
                {clientWhy && <span role="status" className="text-xs text-slate-600">{clientWhy}</span>}
              </div>
            </>
          )}
        </div>
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-800">Signature de l'entreprise</span>
          {company ? (
            <>
              <Ink s={d.signCompany!} label="Signature de l'entreprise" />
              <p ref={take('company')} role="status" tabIndex={-1} className="text-xs text-slate-700 focus:outline-none">Signé pour l'entreprise · {fmtMoment(re.companySignedAt || '')}</p>
            </>
          ) : (
            <>
              <SignaturePad value={os} onChange={setOs} label="Signature de l'entreprise" wide />
              <div className="flex flex-wrap items-center gap-2">
                <Button kind="primary" className={OFF} disabled={!!companyWhy} onClick={() => { if (numbered((x, at, s) => signCompany(x, os!, at, who, s), "La signature de l'entreprise n'est pas enregistrée.")) { focusOn.current = 'company'; setOs(undefined); } }}>Enregistrer la signature de l'entreprise</Button>
                {companyWhy && <span role="status" className="text-xs text-slate-600">{companyWhy}</span>}
              </div>
            </>
          )}
        </div>
      </div>
      {!pvSigned(d) && <p className="text-xs text-slate-600">Sans tracé possible (gants, main abîmée)&#8239;: la photo du PV papier signé, plus bas, remplace le tracé.</p>}
      {re.noSign && <p ref={take('nosign')} role="status" tabIndex={-1} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none">{cap(noSignWords(re.noSign))} · témoin&#8239;: {re.noSign.witness}{re.noSign.witnessOrg ? (norm(re.noSign.witnessOrg) === 'entreprise' ? ", témoin de l'entreprise" : `, organisation\u202f: ${re.noSign.witnessOrg}`) : ", organisation non indiquée"} · {fmtMoment(re.noSign.at)}</p>}
      {!pvSigned(d) && (
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-800">Si le client ne signe pas</span>
          <div className="flex flex-wrap gap-2"><Button onClick={() => setKind('absent')}>Client absent</Button><Button onClick={() => setKind('refused')}>Signature refusée</Button><Button onClick={() => setKind('other')}>Autre, précisez</Button></div>
          {kind && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              {kind === 'other' && <Field label="Précisez la raison (obligatoire)"><input className={inputCls} value={other} autoComplete="off" onChange={e => setOther(e.target.value)} /></Field>}
              <Field label={`${kind === 'absent' ? 'Client absent' : kind === 'refused' ? 'Signature refusée' : 'Signature non obtenue'}\u202f: nom du témoin`}><input className={inputCls} list="people" value={witness} onChange={e => setWitness(e.target.value)} /></Field>
              <div className="space-y-1.5"><span className="block text-xs font-semibold text-slate-700">Organisation du témoin</span><Choose list={WITNESS} value={org} onChange={setOrg} label="Organisation du témoin" /></div>
              <div className="flex flex-wrap items-center gap-2">
                <Button kind="primary" className={OFF} disabled={!!witnessWhy} onClick={() => { if (numbered((x, at, s) => setNoSign(x, kind, witness, at, who, org, s, other), "Le témoin n'est pas enregistré\u202f: il ne peut être ni la personne qui remet, ni celle qui a signé pour l'entreprise.")) { focusOn.current = 'nosign'; setKind(null); setOther(''); setWitness(''); setOrg(''); } }}>Enregistrer</Button>
                <Button onClick={() => setKind(null)}>Fermer</Button>
                {witnessWhy && <span role="status" className="text-xs text-slate-600">{witnessWhy}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="max-w-[16rem] space-y-1">
        <span className="block text-xs font-semibold text-slate-800">Photo du PV papier signé</span>
        {locked && d.pvPhoto
          ? <Pic value={d.pvPhoto} alt="PV papier signé" size="t" className="h-28 w-full rounded-lg border border-slate-200" />
          : <fieldset disabled={!who || (blocked && !d.pvPhoto)} className="m-0 min-w-0 border-0 p-0"><PhotoBox value={d.pvPhoto ?? ''} label="Photo du PV papier signé" onChange={photo} /></fieldset>}
        {re.pvPhotoAt && <p className="text-xs text-slate-700">Photo ajoutée le {when(re.pvPhotoAt)}.</p>}
        {locked && !d.pvPhoto && <p className="text-xs text-slate-600">Une photo ajoutée maintenant est inscrite au journal comme ajoutée après la signature.</p>}
        {dup && <p role="alert" className="text-xs font-semibold text-red-700">{dup} : elle n'est pas enregistrée.</p>}
        {!d.pvPhoto && !who && <p role="status" className="text-xs text-slate-600">Personne qui remet pas encore choisie.</p>}
      </div>
    </section>
  );
}

// A signed PV is changed one way: who corrects, why, and what becomes what (the journal keeps the old and the new value, a new seal is laid). One dialog for the reception, the order and a milestone.
export interface CorrectField { k: string; label: string; type?: 'text' | 'email' | 'date' | 'time' | 'num'; options?: [string, string][]; list?: string; mono?: boolean }
type CVal = string | number | null;
export function Correct({ title, subtitle, was, fields, people, who: w0 = '', hold, holdKey, check, onSave, onClose }: {
  title: string; subtitle: string; was: Record<string, CVal>; fields: CorrectField[]; people: ReturnType<typeof peopleOf>; who?: string; hold?: Hold; holdKey: string;   // `who`: the person the sheet already knows, offered as the one who corrects
  check?(patch: Record<string, CVal>): string; onSave(patch: Record<string, CVal>, why: string, who: string): boolean; onClose(): void;   // `check`: a fact that stands in the way; `onSave`: false when the domain refuses
}) {
  const [f, setF] = useState(was), [why, setWhy] = useState(''), [who, setWho] = useState(w0), [fail, setFail] = useState('');
  const patch = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== was[k]));
  const show = (v: CVal | undefined, x: CorrectField) => (v == null || v === '' ? '—' : x.options?.find(o => o[0] === v)?.[1] ?? String(v).replace('.', ','));
  const changes = fields.filter(x => x.k in patch).map(x => `${x.label}\u202f: ${show(was[x.k], x)} → ${show(f[x.k], x)}`);
  useHold(hold, holdKey, why.trim() || changes.length ? 'Correction en cours de saisie, pas encore enregistrée' : '');
  const neg = fields.find(x => x.type === 'num' && typeof f[x.k] === 'number' && (f[x.k] as number) < 0);   // a quantity is never negative (the domain refuses it too)
  const blocker = !who.trim() ? 'Personne pas encore choisie.' : !why.trim() ? 'Motif pas encore écrit.' : !changes.length ? 'Aucun champ modifié.' : neg ? `${neg.label}\u202f: une quantité n'est pas négative.` : check?.(patch) ?? '';
  const up = (k: string, v: CVal) => setF(x => ({ ...x, [k]: v }));
  return (
    <Modal wide onClose={onClose} title={title} subtitle={subtitle}
      footer={<>
        {blocker && <span role="status" className="mr-auto text-xs text-slate-600">{blocker}</span>}
        <Button onClick={onClose}>Annuler</Button><Button kind="primary" className={OFF} disabled={!!blocker} onClick={() => { if (onSave(patch, why.trim(), who.trim())) onClose(); else setFail("La correction n'est pas enregistrée\u202f: l'outil la refuse (un résultat qui ne cadre pas avec les réserves, un nombre attendu, un jalon qui n'existe plus)."); }}>Enregistrer la correction</Button>
      </>}>
      <div className="space-y-4">
        <PeoplePick value={who} onChange={setWho} names={people.names} absent={people.absent} label="Qui corrige ?" />
        <Field label="Motif de la correction (obligatoire)"><input className={`${inputCls} ${TOUCH16}`} value={why} autoFocus onChange={e => setWhy(e.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          {fields.map(x => (
            <Field key={x.k} label={x.label}>
              {x.options ? <select className={`${inputCls} ${TOUCH16}`} value={String(f[x.k] ?? '')} onChange={e => up(x.k, e.target.value)}>{x.options.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
                : x.type === 'num' ? <NumInput value={f[x.k] as number | null} className={TOUCH16} onChange={v => up(x.k, v)} />
                  : <input type={x.type ?? 'text'} className={`${inputCls} ${TOUCH16}${x.mono ? ' font-mono' : ''}`} list={x.list} value={String(f[x.k] ?? '')} onChange={e => up(x.k, e.target.value)} />}
            </Field>
          ))}
        </div>
        {fail && <p role="alert" className="text-xs font-semibold text-red-700">{fail}</p>}
        {changes.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-700">{changes.map(x => <li key={x}>{x}</li>)}</ul>}
      </div>
    </Modal>
  );
}

function Fix({ c, onClose }: { c: Ctx; onClose(): void }) {
  const { d, act, people } = c, re = d.reception;
  const was = { result: re.result, name: re.name, role: re.role, email: re.email ?? '', place: re.place ?? '', date: re.date, time: re.time ?? '', qty: re.qty ?? null, count: re.count ?? null };
  const fields: CorrectField[] = [
    { k: 'result', label: 'Résultat', options: [...(re.result === 'refus' ? [['refus', 'Refusée'] as [string, string]] : []), ['sans', 'Sans réserve'], ['reserve', 'Avec réserve']] },
    { k: 'name', label: 'Nom lisible' }, { k: 'role', label: 'Fonction' }, { k: 'email', label: 'E-mail', type: 'email' }, { k: 'place', label: 'Lieu' },
    { k: 'date', label: 'Date de réception', type: 'date' }, { k: 'time', label: 'Heure', type: 'time' }, { k: 'qty', label: 'Quantité livrée', type: 'num' }, { k: 'count', label: 'Quantité comptée', type: 'num' },
  ];
  return <Correct who={c.who} title="Corriger le PV signé" subtitle="Chaque correction s'inscrit au journal&#8239;: qui, quand, pourquoi, ancienne et nouvelle valeur&#8239;; un nouveau scellé est posé" was={was} fields={fields} people={people} hold={c.hold} holdKey="fix" onClose={onClose}
    check={p => (p.result === 'sans' && reservesOf(d).some(r => !r.liftedAt) ? 'Résultat «\u202fsans réserve\u202f» impossible\u202f: une réserve est ouverte.' : '')}
    onSave={(patch, why, who) => applied(act, x => correctLocked(x, { ...patch, _why: why } as Partial<Reception> & { _why: string }, who, nowLocal()))} />;
}
