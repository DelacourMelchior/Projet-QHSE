// Reservations of an order (tool 3.4), those of EVERY delivery (the one under way and the closed ones, the number of the delivery in the caption): the open ones as cards
// (text, photo, place, gravity, deadline, who takes charge, repair, lift with its proof, defect of 5.1, removal that can be undone), the form that adds one (to the delivery
// under way), the lifted ones folded. A reservation of a closed delivery is still followed, repaired and lifted (against the day of ITS reception). Every gesture is a move of
// the life of the order, written at once by `act` through the functions of the domain, never through the typed copy, by a person picked (never a blank). A lift is stamped with the moment
// it is written (no date to type) and carries a proof: a signature, a photo or a note. A deadline is changed with a reason (the journal keeps the old and the new day).
// Also holds the signature shown as a drawing, shared with the other tabs of the sheet.
import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Delivery, Reception, ReceptionReserve, State, Strokes } from '../../domain/types';
import { addReserve, allReservesOf, isLocked, linkReserveNc, liftReserve, lotsOf, ncFromReserve, ncLinkState, ncOf, patchReserve, presentationNo, removeReserve, reserveWords, repairReserve, reserveDue, reserveLateDays, signatureOk, takeLife } from '../../domain/receptions';
import { reserveBacks } from '../../domain/rcLogic';
import { decisionLabel, NC_STATE, ncState } from '../../domain/quality';
import { nb, nowLocal } from '../../domain/base';
import { isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, NewTab, StatusBadge, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import { SignaturePad } from '../SignaturePad';
import { Pic } from '../../photo/Pic';
import type { Nav } from '../tools';
import { TOUCH, Typed } from './rcShared';
import { cut, type Hold, PeoplePick, peopleOf, plural, radioKeys, sentence, useHold, useUndo, rcDay } from './RcBits';
import type { RcTabProps } from './RcSheet';

// A primary button that cannot be used yet stays legible (6:1), the reason is said next to it
// `!`: Tailwind writes opacity-100 before opacity-30/50 in the sheet, so without it the old opacity wins
export const OFF = 'disabled:!opacity-100 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600';
type Sev = NonNullable<ReceptionReserve['severity']>;
const SEV: [Sev, string][] = [['minor', 'Mineure'], ['blocking', 'Bloquante']];
type Rv = ReceptionReserve & { lotNo: number };   // a reservation with the number of the delivery it was noted on
interface Ctx { backs(r: ReceptionReserve): number; d: Delivery; act: RcTabProps['act']; hold?: Hold; state: State; nav: Nav; who: string; setWho?(v: string): void; people: ReturnType<typeof peopleOf>; focus?: string; liftOpen?: boolean; locked: boolean; now: Date; cur: number; offer(what: string, back: () => void): void }
const sevOf = (r: ReceptionReserve): Sev => r.severity ?? 'minor';
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-semibold ${TOUCH} ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`;

// A signature kept as strokes, drawn without a pad (what is signed cannot be drawn on again)
export function Ink({ s, label }: { s: Strokes; label: string }) {
  return (
    <svg viewBox="0 0 300 100" role="img" aria-label={label} className="h-16 w-full max-w-[200px] rounded-lg border border-slate-200 bg-white">
      <path d={s.map(l => `M${l.map(p => p.join(',')).join('L')}`).join('')} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The reception of the delivery a reservation belongs to (the closed deliveries keep their own day and receptionist)
const receptionOf = (c: Ctx, r: Rv): Reception | undefined => (r.lotNo === c.cur ? c.d.reception : lotsOf(c.d).find(l => l.no === r.lotNo)?.reception);
const SevBadge = ({ s }: { s: Sev }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${s === 'blocking' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{SEV.find(x => x[0] === s)![1]}</span>
);

// `who`: the person that writes the moves, when the tab already asks for it (`setWho` lets the lift ask it on the spot when nobody is picked); without it the block asks (big buttons, never a free name)
// `focus`: the reservation a task opened the sheet on (rung, brought into view by the sheet)
// `only`: the one reservation a task of the queue opens (the sheet shows it alone, its lift form already open, nothing else of the tab)
export function RcReserves({ d, act, state, nav, hold, who: given, setWho, focus, only }: Pick<RcTabProps, 'd' | 'act' | 'state' | 'nav' | 'hold'> & { who?: string; setWho?(v: string): void; focus?: string; only?: string }) {
  const { bar, offer } = useUndo();
  const [mine, setMine] = useState('');
  const now = new Date(), day = isoDate(now), who = given ?? mine, all = allReservesOf(d), open = all.filter(r => !r.liftedAt && !r.refused), done = all.filter(r => r.liftedAt);
  const backs = useMemo(() => reserveBacks(state, now), [state, day]);   // the same reservation text on several orders, asked once per state for every reservation of the tab // eslint-disable-line react-hooks/exhaustive-deps
  const people = peopleOf(state, d, day), c: Ctx = { backs, d, act, hold, state, nav, who, setWho, people, focus, liftOpen: !!only, locked: isLocked(d), now, cur: presentationNo(d), offer }, num = (r: ReceptionReserve) => all.findIndex(x => x.id === r.id) + 1;   // the number of a reservation, as the PV counts them
  if (only) return <div className="space-y-3"><ul className="space-y-3">{open.filter(r => r.id === only).map(r => <ReserveCard key={r.id} r={r} n={num(r)} c={c} />)}</ul>{bar}</div>;
  return (
    <div className="space-y-3">
      <SubTitle>{`Réserves\u202f: ${plural(open.length, 'ouverte')}, ${plural(done.length, 'levée')}`}</SubTitle>
      {given === undefined && <PeoplePick value={mine} onChange={setMine} names={people.names} absent={people.absent} label="Qui note les réserves ?" />}
      {!who && <p role="status" className="text-xs text-slate-600">Personne pas encore choisie&#8239;: la prise en charge, la reprise, l'échéance, la levée et l'ajout sont inactifs.</p>}
      {all.length === 0 && <p className="text-xs text-slate-500">Aucune réserve notée.</p>}
      <ul className="space-y-3">{open.map(r => <ReserveCard key={r.id} r={r} n={num(r)} c={c} />)}</ul>
      {done.length > 0 && (
        <details className="rounded-lg border border-slate-200 p-2">
          <summary className={`cursor-pointer py-1 text-xs font-bold text-slate-900 ${TOUCH}`}>Réserves levées&#8239;: {done.length}</summary>
          <ul className="mt-2 space-y-2">{done.map(r => <DoneCard key={r.id} r={r} c={c} />)}</ul>
        </details>
      )}
      <AddForm c={c} />
      {bar}
    </div>
  );
}

// "Livraison n° 2" in the caption, once the order has several deliveries
const lot = (c: Ctx, r: Rv) => (c.cur > 1 ? ` · Livraison n° ${r.lotNo}` : '');

// The same reservation came back on another order: the fact, and the way to the workshop of the 5 whys (5.3), as 3.3 does for a repeated breakdown
function Again({ r, c }: { r: Rv; c: Ctx }) {
  const n = c.backs(r);
  if (n < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
      <p className="min-w-0 flex-1">Même réserve revenue&#8239;: «&#8239;{r.text} » sur {n} commandes en 12 mois.</p>
      <Button onClick={() => (ncOf(c.state, r.ncId) ? c.nav.open('5.3', `new:nc:${r.ncId}`) : c.nav.open('5.3'))}>Ouvrir un atelier 5 Pourquoi<NewTab /></Button>
    </div>
  );
}

function ReserveCard({ r, c, n }: { r: Rv; c: Ctx; n: number }) {
  const { d, act, state, nav, who, locked, now, cur, offer } = c, { author } = useStore();
  const due = reserveDue(r, d, state.params), late = reserveLateDays(r, d, state.params, now), nc = ncOf(state, r.ncId);
  const patch = (x: Partial<ReceptionReserve>) => act(y => patchReserve(y, r.id, x, who, nowLocal()));
  // the defect is numbered from the CURRENT state of the store and written with its link, in one move (one defect per reservation: asked twice, the same one stays; a link to a defect
  // deleted in 5.1 is no link: the reservation is declared again, the journal says it)
  const declare = () => {
    if (ncLinkState(state, r.ncId) === 'ok') return;
    act((y, by, s) => {
      const rv = allReservesOf(y).find(z => z.id === r.id);
      if (!rv || ncLinkState(s, rv.ncId) === 'ok') return y;
      const at = new Date(), n = ncFromReserve(s, y, rv, who || author || 'anonyme', at);   // the number of the defect and the line of the journal are those of the gesture
      s.ncs[n.id] = n;
      return linkReserveNc(y, r.id, n.id, who || by, nowLocal(at), s);
    });
  };
  const dropRepairPhoto = (v: string) => { const was = r.repairPhoto; patch({ repairPhoto: v }); if (!v && was) offer('Photo de la reprise retirée', () => patch({ repairPhoto: was })); };
  const remove = () => { const before = d; act(y => removeReserve(y, r.id, who, nowLocal())); offer(`Réserve retirée\u202f: ${r.text || `n° ${n}`}`, () => act(y => takeLife(y, before))); };
  return (
    <li data-reserve={r.id} tabIndex={-1} className={`scroll-mt-14 space-y-3 rounded-xl border p-3 focus:outline-none ${c.focus === r.id ? 'ring-2 ring-delacour-primary ring-offset-2' : ''} ${late > 0 ? 'border-red-300 bg-red-50/40' : sevOf(r) === 'blocking' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
      <div className="flex gap-3">
        {r.photo && <Pic value={r.photo} alt={`Photo de la réserve ${reserveWords(r.text)}`} size="t" className="h-20 w-20 shrink-0 rounded-lg" />}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words text-sm font-semibold text-slate-900">{r.text || 'Réserve sans texte (photo seule)'}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <SevBadge s={sevOf(r)} />
            <StatusBadge level={late > 0 ? 'alert' : 'warn'} text={late > 0 ? 'En retard' : r.repairedAt ? 'Reprise faite, à lever' : 'À lever'} />
          </div>
          <p className="text-xs text-slate-600">Émise le {rcDay(r.raisedAt)}{r.where ? ` · ${r.where}` : ''}{lot(c, r)}</p>
          <p className="text-xs text-slate-800">À lever pour le {rcDay(due)}{late > 0 && <span className="font-semibold text-red-700"> · en retard de {plural(late, 'jour')}</span>}</p>
        </div>
      </div>
      <LiftForm r={r} c={c} n={n} />
      <div className="grid gap-2 sm:grid-cols-2">
        <fieldset disabled={!who} className="m-0 min-w-0 border-0 p-0"><Field label="Prise en charge par"><Typed key={`${r.id}-h`} value={r.handler || ''} list="people" onSave={v => patch({ handler: v.trim() })} aria-label={`Prise en charge de la réserve ${reserveWords(r.text)}`} /></Field></fieldset>
        <DueForm r={r} c={c} due={due} n={n} />
      </div>
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-slate-700">Reprise</span>
        {r.repairedAt
          ? <p className="text-xs text-slate-800">{sentence(`Reprise faite le ${rcDay(r.repairedAt)}${r.handler ? ` par ${r.handler}` : ''}`)}</p>
          : <Button disabled={!who} onClick={() => act(y => repairReserve(y, r.id, { at: nowLocal(), by: who }))}>Reprise faite<span className="sr-only"> pour la réserve {n}</span></Button>}
        <fieldset disabled={!who} className="m-0 min-w-0 max-w-[14rem] border-0 p-0"><PhotoBox value={r.repairPhoto || ''} label={`Photo de la reprise\u202f: réserve ${reserveWords(r.text)}`} onChange={dropRepairPhoto} /></fieldset>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {nc
          ? <><span className="text-xs text-slate-800">Défaut <strong className="font-mono">{nc.ref}</strong> · {NC_STATE[ncState(nc, now)].label}{nc.decision ? ` · ${decisionLabel(nc.decision)}` : ''}</span><Button onClick={() => nav.open('5.1', nc.id)}>Ouvrir le défaut<span className="sr-only"> {nc.ref} de la réserve {n}</span><NewTab /></Button></>
          : r.ncId ? <><span role="status" className="text-xs font-semibold text-red-900">Défaut lié introuvable dans 5.1.</span><Button onClick={declare}>Déclarer à nouveau<span className="sr-only"> le défaut de la réserve {n}</span></Button></>
            : <Button onClick={declare}>Déclarer un défaut (5.1)<span className="sr-only"> pour la réserve {n}</span></Button>}
      </div>
      <Again r={r} c={c} />
      {!locked && r.lotNo === cur && <Button kind="danger" disabled={!who} onClick={remove}><Trash2 size={14} aria-hidden />Retirer la réserve<span className="sr-only"> {n}</span></Button>}
    </li>
  );
}

// The deadline: changed with a new day and a reason; the journal says the old and the new day and the reason (the settings never rewrite an existing deadline)
function DueForm({ r, c, due, n }: { r: Rv; c: Ctx; due: string; n: number }) {
  const { act, who } = c, [open, setOpen] = useState(false), [to, setTo] = useState(due), [why, setWhy] = useState('');
  useHold(c.hold, `due-${r.id}`, open && why.trim() ? `Motif du report d'échéance de la réserve ${reserveWords(cut(r.text))} en cours de saisie, pas encore enregistré` : '');
  const blocker = !who ? 'Personne pas encore choisie.' : !to || to === due ? 'Nouveau jour pas encore choisi.' : !why.trim() ? 'Motif pas encore écrit.' : '';
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-slate-700">Échéance</span>
      {!open ? <Button disabled={!who} onClick={() => { setTo(due); setWhy(''); setOpen(true); }}>Changer l'échéance<span className="sr-only"> de la réserve {n}</span></Button> : (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <Field label={`À lever pour le (actuellement le ${rcDay(due)})`}><input type="date" className={inputCls} value={to} aria-label={`Nouvelle échéance de la réserve ${reserveWords(r.text)}`} onChange={e => setTo(e.target.value)} /></Field>
          <Field label="Motif du changement (obligatoire)" hint="L'ancien jour, le nouveau et le motif sont inscrits au journal."><input className={inputCls} value={why} onChange={e => setWhy(e.target.value)} /></Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button kind="primary" className={OFF} disabled={!!blocker} onClick={() => { act(y => patchReserve(y, r.id, { dueAt: to }, who, nowLocal(), why.trim())); setOpen(false); }}>Enregistrer la nouvelle échéance</Button>
            <Button onClick={() => setOpen(false)}>Fermer</Button>
            {blocker && <span role="status" className="text-xs text-slate-600">{blocker}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// The lift: the moment is the one of the writing (no date to type), the person picked above records it ("levée enregistrée par"), and a proof is carried: a finger signature, a photo, a note
// or the name of the person on the customer side who stated it (`pour`, said apart in the journal and kept in the note). A lift the domain refuses writes nothing and is told.
function LiftForm({ r, c, n }: { r: Rv; c: Ctx; n: number }) {
  const { act, who } = c, rec = receptionOf(c, r)?.date ?? '';
  const [open, setOpen] = useState(!!c.liftOpen), [pour, setPour] = useState(''), [note, setNote] = useState(''), [photo, setPhoto] = useState(''), [sign, setSign] = useState<Strokes>(), [fail, setFail] = useState('');
  // a note, a photo, a signature or a name typed and not recorded yet: the sheet names it before it closes
  useHold(c.hold, `lift-${r.id}`, open && (note.trim() || photo || sign?.length || pour.trim()) ? `Levée de la réserve ${reserveWords(cut(r.text))} en cours de saisie, pas encore enregistrée` : '');
  const signed = !!sign?.length && signatureOk(sign), text = pour.trim() || note.trim();
  const why = !rec ? "La livraison n'a pas encore eu lieu\u202f: une réserve se lève après la réception." : nowLocal().slice(0, 10) < rec ? sentence(`Levée impossible avant la réception du ${rcDay(rec)}`) : !who ? 'Personne pas encore choisie.' : !signed && !photo && !text ? 'Une signature, une photo, une note ou le nom de la personne côté client est nécessaire.' : '';
  if (!open) return <div><Button kind="primary" onClick={() => setOpen(true)}>Lever la réserve<span className="sr-only"> {n}</span></Button></div>;
  const lift = () => {
    let done = false;
    act(y => { const z = liftReserve(y, r.id, { at: nowLocal(), by: who, ...(note.trim() ? { note } : {}), ...(pour.trim() ? { pour } : {}), ...(photo ? { photo } : {}), ...(signed ? { sign } : {}) }); done = z !== y; return z; });
    if (done) setOpen(false); else setFail("La levée n'est pas enregistrée.");
  };
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <SubTitle>Levée de la réserve</SubTitle>
      {!who && c.setWho
        ? <PeoplePick value={who} onChange={c.setWho} names={c.people.names} absent={c.people.absent} label="Qui enregistre la levée&#8239;?" />
        : <p className="text-xs text-slate-700">{who ? `Levée enregistrée par ${who}, au moment où elle est écrite.` : "Levée enregistrée par la personne choisie plus haut, au moment où elle est écrite."}</p>}
      <Field label="Personne côté client qui a constaté la levée, facultatif"><input className={inputCls} value={pour} autoComplete="off" aria-label={`Levée de la réserve ${reserveWords(r.text)}\u202f: personne côté client`} onChange={e => setPour(e.target.value)} /></Field>
      <Field label="Note (par exemple&#8239;: client injoignable, levée constatée sur photo)"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoBox value={photo} label="Photo de la levée" onChange={setPhoto} />
        <SignaturePad value={sign} onChange={setSign} label="Signature (facultative)" wide />
      </div>
      {!!sign?.length && !signed && <p role="status" className="text-xs font-semibold text-amber-900">Tracé trop court pour compter comme une signature.</p>}
      {fail && <p role="alert" className="text-xs font-semibold text-red-700">{fail}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button kind="primary" className={OFF} disabled={!!why} onClick={lift}>Enregistrer la levée</Button>
        <Button onClick={() => setOpen(false)}>Fermer</Button>
        {why && <span role="status" className="text-xs font-semibold text-slate-700">{why}</span>}
      </div>
    </div>
  );
}

function DoneCard({ r, c }: { r: Rv; c: Ctx }) {
  const { d, state, now } = c, late = reserveLateDays(r, d, state.params, now);
  return (
    <li className="space-y-1.5 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700">
      <div className="flex items-center gap-2"><p className="min-w-0 flex-1 break-words text-xs font-semibold text-slate-900">{r.text || 'Réserve sans texte (photo seule)'}</p><SevBadge s={sevOf(r)} /></div>
      <p>{sentence(nb(`Levée le ${rcDay(r.liftedAt!)}${r.liftedBy ? ` · enregistrée par ${r.liftedBy}` : ''}${late > 0 ? ` · ${plural(late, 'jour')} de retard` : ''}`))} {sentence(`Émise le ${rcDay(r.raisedAt)}${lot(c, r)}`)}</p>
      {r.repairedAt && <p>{sentence(`Reprise faite le ${rcDay(r.repairedAt)}${r.handler ? ` par ${r.handler}` : ''}`)}</p>}
      {r.liftNote && <p>«&#8239;{r.liftNote} »</p>}
      <div className="flex flex-wrap items-center gap-2">
        {r.photo && <Pic value={r.photo} alt={`Photo de la réserve ${reserveWords(r.text)}`} size="t" className="h-16 w-16 rounded" />}
        {r.repairPhoto && <Pic value={r.repairPhoto} alt={`Photo de la reprise de la réserve ${reserveWords(r.text)}`} size="t" className="h-16 w-16 rounded" />}
        {r.liftPhoto && <Pic value={r.liftPhoto} alt={`Photo de la levée de la réserve ${reserveWords(r.text)}`} size="t" className="h-16 w-16 rounded" />}
        {r.liftSign && <Ink s={r.liftSign} label="Signature de la levée" />}
      </div>
      <Again r={r} c={c} />
    </li>
  );
}

function AddForm({ c }: { c: Ctx }) {
  const { act, who, locked, state } = c;
  const [text, setText] = useState(''), [photo, setPhoto] = useState(''), [where, setWhere] = useState(''), [sev, setSev] = useState<Sev>('minor');
  const busy = useRef(false);   // a double tap writes one reservation, not two
  // a finding typed or photographed and not added yet: the sheet names it before it closes (a closing finger must not wipe what was written at the customer's)
  useHold(c.hold, 'rv-add', text.trim() || photo || where.trim() ? `Réserve en cours de saisie${text.trim() ? `\u202f: «\u202f${cut(text)}\u202f»` : ' (photo)'}, pas encore ajoutée` : '');
  if (locked) return <p className="text-xs text-slate-600">PV signé&#8239;: une réserve ne s'ajoute plus.</p>;
  const why = !who ? 'Personne pas encore choisie.' : !text.trim() && !photo ? 'Un texte ou une photo est nécessaire.' : '';
  const add = () => { if (busy.current) return; busy.current = true; window.setTimeout(() => { busy.current = false; }, 600); act(y => addReserve(y, { text, photo: photo || undefined, where: where.trim() || undefined, severity: sev, by: who, at: nowLocal() }, state.params)); setText(''); setPhoto(''); setWhere(''); setSev('minor'); };
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <SubTitle>Ajouter une réserve</SubTitle>
      <Field label="Constat"><textarea className={inputCls} rows={2} value={text} onChange={e => setText(e.target.value)} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Zone ou jalon concerné"><input className={inputCls} value={where} onChange={e => setWhere(e.target.value)} /></Field>
        <div className="space-y-1">
          <span className="block text-xs font-semibold text-slate-700">Gravité</span>
          <div role="radiogroup" aria-label="Gravité de la réserve" className="flex flex-wrap gap-2" onKeyDown={radioKeys}>
            {SEV.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={sev === k} tabIndex={sev === k ? 0 : -1} className={chip(sev === k)} onClick={() => setSev(k)}>{l}</button>)}
          </div>
        </div>
      </div>
      <div className="max-w-[14rem]"><PhotoBox value={photo} label="Photo de la réserve" onChange={setPhoto} /></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button kind="primary" className={OFF} disabled={!!why} onClick={add}><Plus size={14} aria-hidden />Ajouter la réserve</Button>
        {why && <span role="status" className="text-xs text-slate-600">{why}</span>}
      </div>
    </div>
  );
}
