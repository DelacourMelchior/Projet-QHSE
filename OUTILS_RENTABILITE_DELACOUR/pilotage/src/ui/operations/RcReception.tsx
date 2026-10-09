// Tool 3.4, the reception at the customer's full screen (phone or tablet, QR code of the order sheet), guided in five steps: reminder, milestones checked, findings with the
// result proposed from them (reservations noted: with reservation, none: without; a refusal only when it is chosen), signatures, the report (PV) as it stands. Every gesture is written to the store at once by the moves of receptions.ts, so a locked phone or a
// change of tab loses nothing; only a reservation written and not yet added, a signature drawn and not validated, a quantity that is not a number live in this screen
// (leaving asks, the browser asks before the page is left, a reload keeps the reservation and the signatures in the tab). A signed PV is locked: the screen then opens on the
// last step and its content is no longer changed from here (a correction goes through the sheet of the order). Before the signatures the PV is summed up in facts (result,
// reservations, quantity, clause); a signature, a mention or a photo is closed while a fact of `signBlockers` stands (unless a motivated waiver is written) and while the clock
// of the device is behind the last act recorded. Every gesture is written in the name of the person picked. No swipe, no global key. The order is always read from the store, never from a copy.
import { useEffect, useRef, useState } from 'react';
import { Check, FileDown, Printer, TriangleAlert, Trash2, X } from 'lucide-react';
import type { Contact, Delivery, Reception, ReceptionReserve, State, Strokes } from '../../domain/types';
import { OTHER, addReserve, canRelease, clockFact, deliveryState, derogationFacts, isLocked, lotsOf, milestoneProgress, milestoneStatus, ncOf, noSignWords, parseQty, photoReuse, presentationNo, promisedOn, pvSigned, qtyReceived, receptionCfg, receptionsOf, refuse, releaseDelivery, remainingQty, removeReserve, reservesOf, retentionFact, sealState, setNoSign, setPvPhoto, setQuantities, setReceptionist, setResult, setShipCheck, setStatePhotos, shipChecksOf, shortSeal, signBlockers, signClient, signCompany, signatureOk, signatureReuse, signWaiver, startReception, takeLife } from '../../domain/receptions';
import { CLAUSE_NOTE, SEVERITY_LABEL, companySigner, noSignHead, quantityText, refusalLines, resultText, retentionText } from '../../domain/receptionsPdf';
import { norm } from '../../domain/text';
import { directoryOfClient } from '../../domain/clients';
import { orgOf } from '../../domain/contacts';
import { nb, nowLocal } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import { PhotoBox } from '../PhotoBox';
import { SignaturePad } from '../SignaturePad';
import { Pic } from '../../photo/Pic';
import type { Nav } from '../tools';
import { PeoplePick, de, fmtMoment, liftDelay, peopleOf, plural, sentence, useRcAct, useUndo, rcDay } from './RcBits';
import { qtyFr, qtyPlural } from './RcCards';
import { PvPrint, PvView, pvPdfFile } from './RcPv';
import { RC_PAGE } from './RcPrint';
import { usePrintOne } from '../PrintOne';
import { NO_SANS } from './RcTabReception';
import { Ask, Box, FIELD, Frame, MAIN, NameChips, ST, Snap, StateText, WhoAsk, WhoBtn, inked, orderLabel, progText, readDraft, useLeaveGuard, writeDraft } from './RcMilestone';
import { BIG, flushTyped, Typed as Kept } from './rcShared';

const STEPS = ['Rappel de la commande', 'Jalons contrôlés', 'Constats et résultat', 'Signatures', 'PV terminé'];
const LAST = STEPS.length;
const RES = [
  { k: 'sans', label: 'Sans réserve', Icon: Check, on: 'border-emerald-900 bg-emerald-700 text-white', off: 'border-emerald-700 bg-white text-emerald-800' },
  { k: 'reserve', label: 'Avec réserve', Icon: TriangleAlert, on: 'border-amber-900 bg-amber-700 text-white', off: 'border-amber-700 bg-white text-amber-950' },
  { k: 'refus', label: 'Refusée', Icon: X, on: 'border-red-900 bg-red-700 text-white', off: 'border-red-700 bg-white text-red-800' },
] as const;
const SHIP = [
  { k: 'ok', label: 'Conforme', on: 'border-emerald-900 bg-emerald-700 text-white', off: 'border-emerald-700 bg-white text-emerald-800' },
  { k: 'ko', label: 'Non conforme', on: 'border-red-900 bg-red-700 text-white', off: 'border-red-700 bg-white text-red-800' },
  { k: 'na', label: 'Sans objet', on: 'border-slate-700 bg-slate-700 text-white', off: 'border-slate-500 bg-white text-slate-800' },
] as const;
const SEV = [
  { k: 'minor', label: 'Mineure', on: 'border-amber-900 bg-amber-700 text-white', off: 'border-amber-700 bg-white text-amber-950' },
  { k: 'blocking', label: 'Bloquante', on: 'border-red-900 bg-red-700 text-white', off: 'border-red-700 bg-white text-red-800' },
] as const;
const chip = (on: boolean) => `min-h-[56px] rounded-xl border-2 px-4 text-lg font-bold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800'}`;
const left = (n: number) => `${qtyPlural(n, 'reste', 'restent')} à livrer`;
// a quantity typed that is not written, said with its reason (a negative one is not a quantity)
const badQty = (t: string) => (/^[-−–]/.test(t) ? `Une quantité n'est pas négative\u202f: «\u202f${t}\u202f» n'est pas enregistré.` : `Nombre attendu\u202f: «\u202f${t}\u202f» n'est pas une quantité, rien n'est enregistré.`);
const KEPT_NOT = "l'espace du navigateur est plein";
const ORGS = ['Entreprise', 'Client', 'Tiers', OTHER] as const;   // organisation of a witness
// A fact of the summary before the signatures: the label then what the PV says, on the same line (`block`: a list, under its label)
const Fact = ({ k, block = false, children }: { k: string; block?: boolean; children: React.ReactNode }) => <div className="text-lg text-slate-900"><dt className={`${block ? 'block' : 'inline'} font-semibold text-slate-600`}>{k}{block ? '' : nb(' : ')}</dt><dd className={block ? 'block' : 'inline'}>{children}</dd></div>;
// The validation just made on the signatures step, said in the words of the PV once the order holds it (the signature, the PV number, the moment it was signed)
type Did = '' | 'client' | 'company' | 'mention' | 'photo';
export function validationNotice(d: Delivery, did: Did): string {
  const re = d.reception, pvT = re.pvNo ? `, ${re.pvNo}` : '', signedT = re.signedAt ? `, PV signé le ${fmtMoment(re.signedAt)}` : '';
  return did === 'client' && inked(d.signClient) ? `Signature du client enregistrée${pvT}${signedT}`
    : did === 'company' && inked(d.signCompany) ? `Signature de l'entreprise enregistrée${pvT}${re.companySignedAt ? `, ${fmtMoment(re.companySignedAt)}` : ''}${pvSigned(d) ? signedT : ''}`
    : did === 'mention' && re.noSign ? `${noSignHead(d)} le ${fmtMoment(re.noSign.at)}${pvT}`
    : did === 'photo' && d.pvPhoto ? `Photo du PV papier enregistrée${pvT}` : '';
}
type Rv = { text: string; where: string; photo: string; severity: 'minor' | 'blocking' };
const blank: Rv = { text: '', where: '', photo: '', severity: 'minor' };

// A text field of the full screen: the shared `Typed` (written a moment after the last key, when it is left, when the page goes to the background and when the screen closes), in the big look
// of the field screens (16 px at least, 64 px high with gloves)
const BigField = (p: Parameters<typeof Kept>[0]) => <Kept className={FIELD} {...p} />;

export function RcReception({ id, onClose, nav }: { id: string; onClose(): void; nav: Nav }) {
  const { state, update, storageFull } = useStore();
  const act = useRcAct();
  const { bar, offer } = useUndo();
  const [printNode, print] = usePrintOne();   // the copy of the PV handed to the customer (step 6)
  const d = state && Object.hasOwn(state.deliveries, id) ? state.deliveries[id] : undefined;   // an id from an address is read only if the data holds it ("__proto__", "constructor"…)
  const dk = `reception:${id}`, [kept] = useState(() => (d && !isLocked(d) && !d.archivedAt ? readDraft<{ rv: Rv; sig: Strokes; csig: Strokes }>(dk) : {}));   // what a reload left
  const [who, setWho] = useState('');   // the person of the company who hands over (PeoplePick gives back the person of this session)
  const [step, setStep] = useState(() => (!d ? 1 : isLocked(d) ? LAST : d.reception.result ? 4 : 1));
  const [rv, setRv] = useState<Rv>({ ...blank, ...kept.rv });
  const [adding, setAdding] = useState(() => !!(kept.rv?.text?.trim() || kept.rv?.photo)), [allPeople, setAllPeople] = useState(false), [more] = useState(() => !!(d?.reception.place || d?.reception.bl));   // adding: the form of a reservation is open (a reservation typed before a reload keeps it open); allPeople: the whole directory of the customer; more: place and delivery note open at once when one is written
  const [ask, setAsk] = useState<{ run(): void; lost: string[]; add: boolean; closing: boolean } | null>(null);
  const [bad, setBad] = useState<{ count?: string; qty?: string }>({});   // a quantity typed that is not a number: the text stays in its field, nothing is written
  const [refusing, setRefusing] = useState(false), [said, setSaid] = useState(false), [other, setOther] = useState(false), [pend, setPend] = useState<{ reason?: boolean; next?: boolean }>({});   // pend: "Autre, précisez" touched, its words not written yet (the domain keeps nothing before them)
  const [name, setName] = useState(d?.reception.name ?? ''), [sig, setSig] = useState<Strokes | undefined>(kept.sig), [csig, setCsig] = useState<Strokes | undefined>(kept.csig);
  const [fallback, setFallback] = useState<'absent' | 'refused' | 'other' | ''>(''), [fbOther, setFbOther] = useState(''), [witness, setWitness] = useState(''), [wOrg, setWOrg] = useState(''), [wOther, setWOther] = useState('');   // wOrg: organisation of the witness
  const [wv, setWv] = useState(false), [wvBy, setWvBy] = useState(''), [wvWhy, setWvWhy] = useState(''), [photoFact, setPhotoFact] = useState(''), [fail, setFail] = useState('');   // wv: the waiver of signature (who allows, why)
  const [did, setDid] = useState<Did>(''), [chg, setChg] = useState(false);   // did: the validation just made (said, then the focus goes to the title); chg: the window "Qui remet" over a step
  const closed = useRef(false), signedHere = useRef(false);   // signedHere: a signature or a mention was made on this screen (what the browser may have refused to keep)
  const rvOn = !!(rv.text.trim() || rv.photo), drawn = inked(sig) || inked(csig), badOn = bad.count !== undefined || bad.qty !== undefined;
  useLeaveGuard(rvOn || drawn || badOn);
  useEffect(() => { if (!closed.current) writeDraft(dk, rvOn || drawn ? { rv, sig, csig } : null); }, [dk, rvOn, drawn, rv, sig, csig]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  if (!d) {
    return (
      <Frame label="Commande introuvable" title="Commande introuvable" said="Commande introuvable" onClose={onClose} next={{ label: 'Retour', run: onClose, end: true }}>
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 data-head tabIndex={-1} className="text-3xl font-black focus:outline-none">Commande introuvable</h1>
          <Box tone="warn" role="alert">Cette commande n'existe pas ou n'est pas encore reçue sur cet appareil.</Box>
        </div>
      </Frame>
    );
  }

  const re = d.reception, cfg = receptionCfg(state.params), today = nowLocal().slice(0, 10), locked = isLocked(d), archived = !!d.archivedAt, ro = locked || archived;
  const { names, absent } = peopleOf(state, d, today), ms = d.milestones, reserves = reservesOf(d), prog = milestoneProgress(d), cr = canRelease(state, d);
  const me = who.trim(), clock = clockFact(state), waiver = re.signWaiver, blockers = signBlockers(state, d), gate = !!waiver || !blockers.length;   // gate: a signature, a mention or a photo may be written (the domain stops them otherwise)
  const shown = blockers.length > 1 || blockers[0] !== clock ? blockers.filter(b => b !== clock) : blockers;   // the clock is told on top of the screen, and here when it is the only fact
  const signer = inked(d.signCompany) ? companySigner(d) : '';   // a witness is neither the person who hands over nor the one who signed for the company
  const s = Math.min(Math.max(step, 1), LAST), pending = s === 3 && !ro && rvOn, lostSign = storageFull && signedHere.current;   // lostSign: the browser may not keep what was signed here
  // what going on would lose is said first: the reserve written, a quantity that is not a number, and at the closing the signatures drawn and not validated
  const leave = (f: () => void, closing = false) => {
    const lost = [...(pending ? ['la réserve écrite, pas encore ajoutée'] : []), ...(badOn ? ["une quantité tapée qui n'est pas un nombre"] : []), ...(closing && drawn ? ['une signature dessinée, pas encore validée'] : [])];
    if (lost.length) setAsk({ run: f, lost, add: pending, closing }); else f();
  };
  const quit = () => { closed.current = true; writeDraft(dk, null); onClose(); };
  const go = (to: number) => { flushTyped(); setDid(''); setStep(Math.min(LAST, Math.max(1, to))); };   // what the fields of the step hold is written with the move, in one write
  // what a move of the life of the order did can be taken back for a few seconds: the life of the order as it was, the content as it is
  const undoTo = (before: Delivery) => update(x => { if (x.deliveries[id]) x.deliveries[id] = takeLife(x.deliveries[id], before); });
  // a quantity: empty clears it, a number is written (a person, a line of the journal), any other text writes nothing (the field keeps it and the screen says so)
  const saveQty = (k: 'count' | 'qty', v: string) => { const q = parseQty(v); if (q !== undefined) act.soon(id, x => setQuantities(x, k === 'count' ? { count: q } : { qty: q }, me, nowLocal())); };
  const typeQty = (k: 'count' | 'qty') => (v: string) => setBad(b => ({ ...b, [k]: parseQty(v) === undefined ? v : undefined }));
  // the moment of the delivery is written once, at the first "Suivant" of the first step (opening the screen to look writes nothing); the place may be given later
  // (written with what the step leaves behind, in one write: `act.soon`)
  const start = () => { if (!ro && !d.reception.date && me) act.soon(id, x => startReception(x, { at: nowLocal(), by: me })); };

  // the release at the moment of the reception: nothing stands in the way (`canRelease`), one tap; what stands in the way goes through the sheet (derogation: who, why)
  const release = () => { if (me) act(id, (x, _by, st) => releaseDelivery(x, { by: me, at: nowLocal() }, st)); };

  // ---- the moves
  const pickContact = (c: Contact) => { const oid = d.orgId || orgOf(state, c.company)?.id; act(id, x => setReceptionist(x, { name: c.name, role: c.role, email: c.email, contactId: c.id, ...(oid ? { orgId: oid } : {}) })); setName(c.name); };
  const ship = (cid: string, to: 'ok' | 'ko' | 'na', cur: string) => act(id, (x, _by, s) => {
    const at = nowLocal(), b = me;
    return cur === to ? setShipCheck(x, cid, null, b, at, false, s.params) : setShipCheck(x, cid, to === 'na' ? null : to === 'ok', b, at, to === 'na', s.params);
  });
  const photos = re.photos ?? [];
  const setPhotos = (f: (l: string[]) => string[]) => act(id, x => setStatePhotos(x, f(x.reception.photos ?? []), me, nowLocal()));
  const dropPhoto = (j: number) => { const old = photos[j]; setPhotos(l => l.filter((_, k) => k !== j)); offer('Photo retirée', () => setPhotos(l => [...l.slice(0, j), old, ...l.slice(j)])); };
  const addRv = () => act(id, x => addReserve(x, { text: rv.text, severity: rv.severity, ...(rv.photo ? { photo: rv.photo } : {}), ...(rv.where.trim() ? { where: rv.where.trim() } : {}), by: me, at: nowLocal() }));
  const dropRv = (r: ReceptionReserve) => { const before = d; act(id, x => removeReserve(x, r.id, me, nowLocal())); offer('Réserve retirée', () => undoTo(before)); };
  const choose = (r: 'sans' | 'reserve' | 'refus') => {
    setRefusing(r === 'refus');
    setPend({});
    if (r === 'sans' && re.result !== 'sans' && reserves.some(x => !x.liftedAt)) { setSaid(true); return; }   // the domain refuses it too: the fact is said, nothing is written
    setSaid(false);
    if (r !== 'refus' || re.refusal) act(id, (x, _by, s) => setResult(x, r, nowLocal(), me, s));   // the domain gives the number of the PV when this result locks it
  };
  const rf = re.refusal;
  // the refusal goes through `refuse` (a person, a line of the journal, nothing on a signed PV, the number of the PV when it locks it). "Autre, précisez" asks its words first: nothing is written until they are.
  const refuseWith = (x: Delivery, s: State, p: Partial<NonNullable<Reception['refusal']>>) => refuse(x, { reason: '', next: cfg.nexts[0], ...x.reception.refusal, ...p }, nowLocal(), me, s);
  const reason = (r: string) => {
    const open = r === OTHER && !rf?.other?.trim();
    setPend(p => ({ ...p, reason: open }));
    if (!open) act(id, (x, _by, s) => refuseWith(x, s, { reason: r, other: r === OTHER ? rf?.other : undefined }));
  };
  const next = (r: string) => {
    const open = r === OTHER && !rf?.nextOther?.trim();
    setPend(p => ({ ...p, next: open }));
    if (!open && rf) act(id, (x, _by, s) => refuseWith(x, s, { next: r, nextOther: r === OTHER ? rf.nextOther : undefined }));
  };
  const words = (k: 'other' | 'nextOther', v: string) => { if (!v.trim()) return; act.soon(id, (x, _by, s) => refuseWith(x, s, k === 'other' ? { reason: OTHER, other: v } : { next: OTHER, nextOther: v })); setPend(p => ({ ...p, [k === 'other' ? 'reason' : 'next']: false })); };
  const patchRefusal = (p: Partial<NonNullable<Reception['refusal']>>) => act(id, (x, _by, s) => (x.reception.refusal ? refuseWith(x, s, p) : x));
  // a gesture of signature (the domain gives the number and lays the seal with `s`); one it refuses writes nothing and is said
  const gesture = (f: (x: Delivery, s: State) => Delivery, what: string, pre?: (x: Delivery) => Delivery, kind?: typeof did): boolean => {
    let done = false;
    act(id, (y, _by, st) => { const x = pre ? pre(y) : y, z = f(x, st); done = z !== x; return z; });
    setFail(done ? '' : `${what} non enregistré\u202f: le PV ne l'accepte pas dans son état actuel.`);
    if (done) { signedHere.current = true; if (kind) setDid(kind); }
    return done;
  };
  // a drawing that is already the signature of another PV: the fact is said and nothing is written (the domain refuses it too)
  const same = (v: Strokes | undefined) => (inked(v) && signatureOk(v) ? signatureReuse(state, v!, id) : '');
  const sign = (kind: 'client' | 'company') => {
    const strokes = kind === 'client' ? sig : csig, at = nowLocal();
    if (!strokes || storageFull || !me || !gate || !signatureOk(strokes) || same(strokes)) return;
    if (kind === 'client') { if (gesture((x, st) => signClient(x, strokes, at, me, st), 'Signature du client', x => setReceptionist(x, { name: name.trim() }), 'client')) setSig(undefined); }
    else if (gesture((x, st) => signCompany(x, strokes, at, me, st), "Signature de l'entreprise", undefined, 'company')) setCsig(undefined);
  };
  const org = wOrg === OTHER ? wOther.trim() : wOrg, witnessSame = !!witness.trim() && [me, signer].some(x => x && norm(x) === norm(witness)), witnessOk = !!witness.trim() && !witnessSame && !!org;   // the witness is never the person who hands over
  const noSign = () => {
    const at = nowLocal();
    if (fallback && (fallback !== 'other' || fbOther.trim()) && !storageFull && me && gate && witnessOk && gesture((x, st) => setNoSign(x, fallback, witness, at, me, org, st, fbOther), 'Témoin', undefined, 'mention')) { setFallback(''); setFbOther(''); setWitness(''); setWOrg(''); setWOther(''); }
  };
  const pvPhoto = (v: string) => {
    const before = d, at = nowLocal(), reuse = v ? photoReuse(state, v, id) : '';
    setPhotoFact(reuse);
    if (reuse || !me || (v && !gate)) return;
    if (v) gesture((x, st) => setPvPhoto(x, v, at, me, st), 'Photo du PV papier', undefined, 'photo');
    else { act(id, (y, _by, st) => setPvPhoto(y, '', at, me, st)); offer('Photo du PV papier retirée', () => undoTo(before)); }
  };
  const allow = () => { act(id, y => signWaiver(y, wvBy.trim(), wvWhy.trim(), nowLocal())); setWv(false); setWvWhy(''); };

  // ---- the steps
  const pickWho = (label: string) => <PeoplePick big value={who} onChange={setWho} names={names} absent={absent} label={label} />;
  const whoPick = pickWho("Qui remet pour l'entreprise\u202f?"), noWho = <Box tone="info" role="status">Aucune personne choisie&#8239;: chaque geste enregistré porte le nom de la personne qui remet pour l'entreprise.</Box>;
  // the people of the customer only (the organisation the order holds under its name today, else the customer typed); no customer, no list: never ten people of other customers
  const list = directoryOfClient(state, d.client, d.orgId || re.orgId).contacts.filter(c => !c.vacant).slice(0, 10);
  // three names at first: the person who received the last delivery of this customer, the buyer of the order, "Autre" (and the person already picked); the whole directory of the customer behind a button
  const known = (cid?: string) => (cid && Object.hasOwn(state.contacts, cid) ? state.contacts[cid] : undefined);
  const lastId = Object.values(state.deliveries).filter(x => x.id !== d.id && norm(x.client) === norm(d.client) && known(x.reception.contactId)).sort((a, b) => (b.reception.date || '').localeCompare(a.reception.date || ''))[0]?.reception.contactId;
  const short3 = [...new Set([re.contactId, lastId, d.contactId].filter((c): c is string => !!known(c)))].map(c => known(c)!).filter(c => !c.vacant);
  const shortList = allPeople || short3.length === 0 ? list : short3, hidden = !allPeople && short3.length > 0 && list.some(c => !short3.some(x => x.id === c.id));
  // the person linked may be gone from the directory (deleted in 1.3): then the name is typed, and "Autre…" stays there
  const custom = other || (re.contactId ? !Object.hasOwn(state.contacts, re.contactId) : !!re.name.trim() || !list.length);
  const before = remainingQty({ ...d, reception: { ...d.reception, result: '' } });
  const step1 = (
    <>
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Rappel de la commande</h1>
      {(rvOn || drawn) && <Box tone="info" role="status">Pas encore enregistré&#8239;: {[...(rvOn ? ['réserve écrite (étape 3)'] : []), ...(inked(sig) ? ['signature du client dessinée (étape 4)'] : []), ...(inked(csig) ? ["signature de l'entreprise dessinée (étape 4)"] : [])].join(', ')}.</Box>}
      <section className="space-y-1 rounded-2xl border-2 border-slate-200 p-4">
        <p className="text-2xl font-black text-slate-900">{d.client || 'Client pas encore renseigné'}</p>
        <p className="text-xl text-slate-900">{d.item || 'Livrable pas encore renseigné'}</p>
        <p className="text-lg text-slate-800">Commande&#8239;: {d.ref || 'sans numéro'}{d.qty != null ? ` · quantité commandée\u202f: ${qtyFr(d.qty)}` : ''}</p>
        {lotsOf(d).length > 0 && <p className="text-lg text-slate-800">Livraison n° {presentationNo(d)}{before != null ? ` · reste à livrer\u202f: ${qtyFr(before)}` : ''}</p>}
        {promisedOn(state, d) && <p className="text-lg text-slate-800">Livraison promise le {rcDay(promisedOn(state, d))}</p>}
      </section>
      {!d.releasedAt && (
        <Box tone="warn" role="status">
          <span className="block font-bold">Commande pas encore libérée.</span>
          {!cr.ok && <ul className="mt-1 list-disc space-y-1 pl-5">{cr.why.map(w => <li key={w}>{w}</li>)}</ul>}
          {!ro && (cr.ok
            ? <button type="button" disabled={!me} className={`${BIG} mt-3 w-full border-emerald-900 bg-emerald-700 text-white disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600`} onClick={release}><Check size={24} aria-hidden />Libérer maintenant</button>
            : <button type="button" className={`${BIG} mt-3 w-full border-slate-500 bg-white text-slate-900`} onClick={() => leave(() => { quit(); nav.tool('3.4', `${id}:release`); }, true)}>Libérer dans la fiche de la commande</button>)}
          {!ro && cr.ok && !me && <span className="mt-1 block">Aucune personne choisie&#8239;: la libération porte le nom de la personne qui remet.</span>}
        </Box>
      )}
      {lotsOf(d).at(-1)?.reception.result === 'refus' && <Box tone="info">Réception refusée à la livraison précédente.</Box>}
      {whoPick}
      {!ro && !me && noWho}
      <details open={more} className="rounded-2xl border-2 border-slate-200">
        <summary className="flex min-h-[56px] cursor-pointer items-center px-3 text-lg font-semibold text-slate-800">Ajouter des détails (lieu, bon de livraison)</summary>
        <div className="space-y-4 border-t-2 border-slate-200 p-3">
          <div className="space-y-1">
            <label htmlFor="rcr-place" className="block text-xl font-bold text-slate-900">Lieu de la réception</label>
            <BigField id="rcr-place" value={re.place ?? ''} disabled={!me} placeholder="Adresse ou site" onSave={v => { if (me) act.soon(id, x => startReception(x, { at: nowLocal(), place: v, by: me })); }} />
          </div>
          <div className="space-y-1">
            <label htmlFor="rcr-bl" className="block text-xl font-bold text-slate-900">Bon de livraison n°</label>
            <BigField id="rcr-bl" autoComplete="off" value={re.bl ?? ''} onSave={v => act.soon(id, x => setReceptionist(x, { bl: v }))} />
          </div>
        </div>
      </details>
      <section aria-labelledby="rcr-cl" className="space-y-3">
        <h2 id="rcr-cl" className="text-xl font-bold text-slate-900">Qui réceptionne côté client&#8239;?</h2>
        {(list.length > 0 || !!re.contactId) && (
          <div className="flex flex-wrap gap-2">
            {shortList.map(c => <button key={c.id} type="button" aria-pressed={!custom && re.contactId === c.id} className={chip(!custom && re.contactId === c.id)} onClick={() => { setOther(false); pickContact(c); }}>{c.name}{c.role && <span className="block text-base font-normal">{c.role}</span>}</button>)}
            <button type="button" aria-pressed={custom} className={chip(custom)} onClick={() => { setOther(true); setName(''); act(id, x => setReceptionist(x, { name: '', role: '', email: '', contactId: '' })); }}>Autre, précisez</button>
            {hidden && <button type="button" className="min-h-[56px] rounded-xl px-3 text-lg font-semibold text-slate-900 underline" onClick={() => setAllPeople(true)}>Voir tout l'annuaire</button>}
          </div>
        )}
        {custom ? (
          <div key={`c-${re.contactId ?? ''}`} className="space-y-3">
            <BigField value={re.name} placeholder="Nom" aria-label="Nom de la personne qui réceptionne" onType={setName} onSave={v => act.soon(id, x => setReceptionist(x, { name: v }))} />
            <BigField value={re.role} placeholder="Fonction" aria-label="Fonction de la personne qui réceptionne" onSave={v => act.soon(id, x => setReceptionist(x, { role: v }))} />
            <BigField value={re.email ?? ''} inputMode="email" autoComplete="off" placeholder="Adresse e-mail (facultatif)" aria-label="Adresse e-mail de la personne qui réceptionne" onSave={v => act.soon(id, x => setReceptionist(x, { email: v }))} />
          </div>
        ) : <p className="text-lg text-slate-800">{re.name}{re.role ? `, ${re.role}` : ''}{re.email ? ` · ${re.email}` : ''}</p>}
      </section>
    </>
  );

  const checks = shipChecksOf(d, state.params);
  const step2 = (
    <>
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Jalons contrôlés</h1>
      <p className="text-xl font-semibold text-slate-900">{ms.length ? progText(prog) : "Aucun jalon n'est défini pour cette commande."}</p>
      {cr.why.length > 0 && <Box tone="warn" role="status"><ul className="list-disc space-y-1 pl-5">{cr.why.map(w => <li key={w}>{w}</li>)}</ul></Box>}
      {d.releasedAt && <p className="text-lg text-slate-800">Libérée par {d.releasedBy} le {fmtMoment(d.releasedMoment ?? d.releasedAt)}{d.derogation ? `, par dérogation\u202f: ${d.derogation.why}` : ''}.</p>}
      {derogationFacts(d, state.params).map(f => <p key={f} className="text-lg text-slate-800">{f}.</p>)}
      <ul className="space-y-3">
        {ms.map((m, i) => {
          const M = ST[milestoneStatus(m)], nc = ncOf(state, m.ncId);
          return (
            <li key={m.id ?? i} className="space-y-2 rounded-2xl border-2 border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${M.cls}`}><M.Icon size={18} aria-hidden />{M.label}</span>
                <h2 className="text-xl font-bold text-slate-900">Jalon {i + 1} : {m.label}</h2>
              </div>
              {m.na ? <p className="text-lg text-slate-800">Sans objet{m.naReason ? `\u202f: ${m.naReason}` : ''}.</p>
                : m.ok == null ? <p className="text-lg text-slate-800">Pas encore contrôlé.</p>
                : <p className="text-lg text-slate-800">{sentence(`Contrôlé par ${m.by}, ${fmtMoment(m.at ?? m.date)}${m.measured ? ` · valeur mesurée\u202f: ${m.measured}${m.unit && !m.measured.includes(m.unit) ? ` ${m.unit}` : ''}` : ''}`)}</p>}
              {m.ok === false && !m.na && <p className="text-lg font-semibold text-red-800">{sentence(nb(`Non conforme${m.date ? ` depuis le ${rcDay(m.date)}` : ''}${nc ? ` · défaut ${nc.ref}` : m.ncId ? ' · défaut lié introuvable dans 5.1' : ''}${m.waivedBy ? ` · dérogation ${de(m.waivedBy)}\u202f: ${m.waivedWhy}` : ''}`))}</p>}
              {(m.photo || m.gapPhoto) && (
                <div className="flex flex-wrap gap-3">
                  {m.photo && <figure><Pic value={m.photo} alt={`Preuve du jalon ${i + 1}`} size="t" className="h-28 w-40 rounded-lg" /><figcaption className="text-base text-slate-700">Preuve</figcaption></figure>}
                  {m.gapPhoto && <figure><Pic value={m.gapPhoto} alt={`Écart du jalon ${i + 1}`} size="t" className="h-28 w-40 rounded-lg" /><figcaption className="text-base text-slate-700">Écart</figcaption></figure>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <section aria-labelledby="rcr-ship" className="space-y-3">
        <h2 id="rcr-ship" className="text-2xl font-black text-slate-900">Contrôle de départ</h2>
        <ul className="space-y-3">
          {checks.map(c => {
            const cur = c.na ? 'na' : c.ok === true ? 'ok' : c.ok === false ? 'ko' : '';
            return (
              <li key={c.id} className="space-y-2 rounded-2xl border-2 border-slate-200 p-3">
                <p className="text-xl font-bold text-slate-900">{c.label}</p>
                <div role="group" aria-label={`Contrôle de départ\u202f: ${c.label}`} className="grid grid-cols-3 gap-2">
                  {SHIP.map(o => <button key={o.k} type="button" aria-pressed={cur === o.k} className={`min-h-[56px] rounded-xl border-2 px-1 text-base font-bold ${cur === o.k ? o.on : o.off}`} onClick={() => ship(c.id, o.k, cur)}>{o.label}</button>)}
                </div>
                {cur && c.by && <p className="text-base text-slate-700">{c.by}, {fmtMoment(c.at)}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );

  const res = RES.find(r => r.k === re.result), proposed = reserves.length ? 'reserve' : 'sans', choice = refusing ? 'refus' : re.result || proposed, refusalOk = !!rf && !pend.reason && !pend.next && (rf.reason !== OTHER || !!rf.other?.trim()) && (rf.next !== OTHER || !!rf.nextOther?.trim());
  const sans = { ...d, reception: { ...d.reception, result: 'sans' as const } }, thisQty = receptionsOf(sans).at(-1)?.qty ?? null, rest = remainingQty(sans);
  const resultSec = (
    <section aria-labelledby="rcr-res" className="space-y-4">
      <h2 id="rcr-res" className="text-2xl font-black text-slate-900">Résultat de la réception</h2>
      {!re.result && !ro && !refusing && <p role="status" className="text-lg text-slate-800">Résultat proposé d'après les constats&#8239;: {RES.find(r => r.k === proposed)!.label.toLowerCase()}. Il est enregistré avec «&#8239;Suivant&#8239;»&#8239;; un autre choix le remplace.</p>}
      {ro && res ? (
        <div role="group" aria-label="Résultat de la réception"><span className={`inline-flex min-h-[56px] items-center gap-2 rounded-full border-2 px-6 text-xl font-bold ${res.on}`}><res.Icon size={26} aria-hidden />{res.label}</span></div>
      ) : (
        <div role="group" aria-label="Résultat de la réception" className="grid gap-3">
          {RES.map(r => <button key={r.k} type="button" aria-pressed={choice === r.k} className={`${BIG} w-full ${choice === r.k ? r.on : r.off}`} onClick={() => choose(r.k)}><r.Icon size={26} aria-hidden />{r.label}</button>)}
        </div>
      )}
      {said && reserves.some(r => !r.liftedAt) && <Box tone="bad" role="status">{NO_SANS}</Box>}
      {choice === 'sans' && reserves.length > 0 && <Box tone="warn" role="status">{nb(`${plural(reserves.length, 'réserve notée', 'réserves notées')} alors que le résultat est «\u202fSans réserve\u202f».`)}</Box>}
      {choice === 'reserve' && reserves.length === 0 && <Box tone="warn" role="status">{nb("Aucune réserve n'est écrite\u202f: le résultat «\u202fAvec réserve\u202f» n'en porte aucune.")}</Box>}
      {choice === 'reserve' && reserves.some(r => r.severity === 'blocking') && <Box tone="bad" role="status">{plural(reserves.filter(r => r.severity === 'blocking').length, 'réserve bloquante notée', 'réserves bloquantes notées')} : la réception est reportée.</Box>}
      {choice === 'refus' && (
        <section aria-labelledby="rcr-ref" className="space-y-4 rounded-2xl border-2 border-red-300 bg-red-50 p-3">
          <h2 id="rcr-ref" className="text-2xl font-black text-red-900">Motif du refus</h2>
          <div role="group" aria-label="Motif du refus" className="flex flex-wrap gap-2">
            {cfg.refusals.map(r => { const on = pend.reason ? r === OTHER : rf?.reason === r; return <button key={r} type="button" aria-pressed={on} className={chip(on)} onClick={() => reason(r)}>{r === OTHER ? 'Autre, précisez' : r}</button>; })}
          </div>
          {(pend.reason || rf?.reason === OTHER) && (
            <div className="space-y-1">
              <label htmlFor="rcr-other" className="block text-lg font-semibold text-slate-900">Précisez le motif (obligatoire)</label>
              <BigField id="rcr-other" value={rf?.other ?? ''} onSave={v => words('other', v)} />
            </div>
          )}
          {rf && (
            <>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-slate-900">Suite</div>
                <div role="group" aria-label="Suite du refus" className="flex flex-wrap gap-2">
                  {cfg.nexts.map(r => { const on = pend.next ? r === OTHER : rf.next === r; return <button key={r} type="button" aria-pressed={on} className={chip(on)} onClick={() => next(r)}>{r === OTHER ? 'Autre, précisez' : r}</button>; })}
                </div>
              </div>
              {(pend.next || rf.next === OTHER) && (
                <div className="space-y-1">
                  <label htmlFor="rcr-next" className="block text-lg font-semibold text-slate-900">Précisez la suite (obligatoire)</label>
                  <BigField id="rcr-next" value={rf.nextOther ?? ''} onSave={v => words('nextOther', v)} />
                </div>
              )}
              <div className="max-w-xs"><div className="mb-1 text-lg font-semibold text-slate-900">Photo du refus (facultatif)</div><Snap><PhotoBox value={rf.photo ?? ''} label="Photo du refus" onChange={v => { if (v) patchRefusal({ photo: v }); else { const old = rf.photo ?? ''; patchRefusal({ photo: undefined }); offer('Photo du refus retirée', () => patchRefusal({ photo: old })); } }} /></Snap></div>
            </>
          )}
          {!refusalOk && <Box tone="warn" role="status">{rf ? 'Motif ou suite pas encore précisé.' : 'Aucun motif choisi.'}</Box>}
        </section>
      )}
      {choice && (choice !== 'refus' || rf) && (
        <section aria-labelledby="rcr-lq" className="space-y-1">
          <label id="rcr-lq" htmlFor="rcr-qty" className="block text-xl font-bold text-slate-900">Quantité livrée dans cette livraison</label>
          <BigField id="rcr-qty" inputMode="decimal" autoComplete="off" placeholder={before != null ? qtyFr(before) : undefined} value={re.qty != null ? String(re.qty).replace('.', ',') : ''} className={`${FIELD}\u202f!min-h-[64px] font-mono\u202f!text-2xl`} onType={typeQty('qty')} onSave={v => saveQty('qty', v)} />
          {bad.qty !== undefined && <p role="status" className="text-lg font-semibold text-red-800">{badQty(bad.qty)}</p>}
          {d.qty != null ? (
            <>
              <p className="text-lg text-slate-800">Commandée&#8239;: {qtyFr(d.qty)} · déjà reçue&#8239;: {qtyFr(qtyReceived({ ...d, reception: { ...d.reception, result: '' } }))}{choice !== 'refus' && thisQty != null ? ` · cette livraison\u202f: ${qtyFr(thisQty)}` : ''}</p>
              {choice === 'refus' ? <p className="text-lg font-semibold text-slate-900">Réception refusée&#8239;: {left(before ?? 0)}.</p>
                : rest ? <Box tone="warn" role="status">Livrée en partie&#8239;: {left(rest)} sur {qtyFr(d.qty)}.</Box> : <p className="text-lg font-semibold text-slate-900">Toute la quantité commandée est livrée.</p>}
              {choice !== 'refus' && qtyReceived(sans) > d.qty && <Box tone="warn" role="status">{qtyPlural(qtyReceived(sans), 'reçue')} pour {qtyPlural(d.qty, 'commandée')}.</Box>}
            </>
          ) : <p className="text-lg text-slate-700">Quantité commandée pas renseignée.</p>}
        </section>
      )}
    </section>
  );

  const expected = receptionsOf(d).at(-1)?.qty ?? null, count = re.count ?? null, gap = count != null && expected != null ? Math.round((count - expected) * 1e6) / 1e6 : 0;
  const step3 = (
    <>
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">Constats et résultat</h1>
      <section aria-labelledby="rcr-ph" className="space-y-2">
        <h2 id="rcr-ph" className="text-2xl font-black text-slate-900">Photos de l'état à la livraison</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, j) => <Snap key={`${j}-${p}`}><PhotoBox value={p} label={`Photo de l'état à la livraison ${j + 1}`} onChange={v => (v ? setPhotos(l => l.map((q, k) => (k === j ? v : q))) : dropPhoto(j))} /></Snap>)}
          <Snap><PhotoBox value="" label="Ajouter une photo de l'état à la livraison" onChange={v => { if (v) setPhotos(l => [...l, v]); }} /></Snap>
        </div>
      </section>
      <section aria-labelledby="rcr-q" className="space-y-1">
        <label id="rcr-q" htmlFor="rcr-count" className="block text-2xl font-black text-slate-900">Quantité comptée sur place</label>
        {expected != null && <p className="text-lg text-slate-700">Quantité attendue&#8239;: {qtyFr(expected)}</p>}
        <BigField id="rcr-count" inputMode="decimal" autoComplete="off" value={count != null ? String(count).replace('.', ',') : ''} className={`${FIELD}\u202f!min-h-[64px] font-mono\u202f!text-2xl`} onType={typeQty('count')} onSave={v => saveQty('count', v)} />
        {bad.count !== undefined && <p role="status" className="text-lg font-semibold text-red-800">{badQty(bad.count)}</p>}
        {count != null && expected != null && <p role="status" className={`text-lg font-semibold ${gap === 0 ? 'text-emerald-800' : 'text-red-800'}`}>{gap === 0 ? `Quantité comptée\u202f: ${qtyFr(count)}, conforme à la quantité attendue.` : `Quantité comptée\u202f: ${qtyFr(count)} pour ${qtyFr(expected)} attendus\u202f: écart de ${qtyFr(Math.abs(gap))} en ${gap < 0 ? 'moins' : 'plus'}.`}</p>}
      </section>
      <section aria-labelledby="rcr-rv" className="space-y-3">
        <h2 id="rcr-rv" className="text-2xl font-black text-slate-900">Réserves</h2>
        {reserves.length === 0 && <p className="text-lg text-slate-700">Aucune réserve notée.</p>}
        <ul className="space-y-3">
          {reserves.map(r => (
            <li key={r.id} className="space-y-2 rounded-2xl border-2 border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${r.severity === 'blocking' ? 'border-red-900 bg-red-700 text-white' : 'border-amber-900 bg-amber-100 text-amber-950'}`}><TriangleAlert size={18} aria-hidden />{r.severity === 'blocking' ? 'Bloquante' : 'Mineure'}</span>
                {r.where && <span className="text-lg font-semibold text-slate-800">{r.where}</span>}
              </div>
              <p className="text-xl text-slate-900">{r.text || 'Réserve sans texte (photo seule)'}</p>
              {r.photo && <Pic value={r.photo} alt="Photo de la réserve" size="t" className="h-28 w-40 rounded-lg" />}
              {!ro && <button type="button" className={`${BIG}\u202f!min-h-[48px] w-full border-slate-500 bg-white text-slate-900`} onClick={() => dropRv(r)}><Trash2 size={20} aria-hidden />Retirer cette réserve</button>}
            </li>
          ))}
        </ul>
        {!ro && !adding && <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => setAdding(true)}>{reserves.length ? '+ Ajouter une autre réserve' : '+ Ajouter une réserve'}</button>}
        {!ro && adding && <div className="space-y-3 rounded-2xl border-2 border-slate-200 p-3">
          <h3 className="text-xl font-bold text-slate-900">{reserves.length ? 'Ajouter une autre réserve' : 'Ajouter une réserve'}</h3>
          <label htmlFor="rcr-rv-text" className="block text-lg font-semibold text-slate-800">Ce qui est constaté</label>
          <textarea id="rcr-rv-text" rows={3} className={FIELD} value={rv.text} onChange={e => setRv(x => ({ ...x, text: e.target.value }))} />
          <label htmlFor="rcr-rv-where" className="block text-lg font-semibold text-slate-800">Zone ou jalon concerné (facultatif)</label>
          <input id="rcr-rv-where" className={FIELD} value={rv.where} onChange={e => setRv(x => ({ ...x, where: e.target.value }))} />
          <Snap><PhotoBox value={rv.photo} label="Photo de la réserve" onChange={v => setRv(x => ({ ...x, photo: v }))} /></Snap>
          <div role="group" aria-label="Gravité de la réserve" className="grid grid-cols-2 gap-3">
            {SEV.map(o => <button key={o.k} type="button" aria-pressed={rv.severity === o.k} className={`${BIG} ${rv.severity === o.k ? o.on : o.off}`} onClick={() => setRv(x => ({ ...x, severity: o.k }))}>{o.label}</button>)}
          </div>
          <p className="text-lg text-slate-700">{rv.severity === 'blocking' ? 'Réserve bloquante\u202f: la réception est reportée.' : `Réserve mineure\u202f: la réception est prononcée, la réserve se lève sous ${liftDelay(cfg.liftDays, cfg.liftBusiness)}.`}</p>
          <button type="button" disabled={!rv.text.trim() && !rv.photo} className={`${BIG} w-full ${MAIN}`} onClick={() => { addRv(); setRv(blank); setAdding(false); }}>Ajouter la réserve</button>
        </div>}
      </section>
      {resultSec}
    </>
  );

  const clientDone = inked(d.signClient), companyDone = inked(d.signCompany), nameOk = !!name.trim(), ready = !ro && !archived && !!me && gate;   // ready: the pads take a trace, the mentions and the photo are written
  const readyCo = !archived && !!me && gate && !storageFull;   // the company signs after the customer too: the PV is locked, its seal is laid again with this signature (signCompany)
  const clause = retentionText(state.params), over = retentionFact(d, state.params), qt = quantityText(d);
  // what the signature carries, in the sentences the PV prints (receptionsPdf.ts), above the pads (the whole PV opens with "Voir le PV")
  const recap = (
    <section aria-labelledby="rcr-recap" className="space-y-2 rounded-2xl border-2 border-slate-900 p-3">
      <h2 id="rcr-recap" className="text-lg font-black text-slate-900">Contenu du PV avant la signature</h2>
      <dl className="space-y-1.5">
        <Fact k="Commande">{[d.ref, d.client].filter(Boolean).join(' · ') || orderLabel(d)}{re.date ? ` · livraison du ${fmtMoment(re.time ? `${re.date}T${re.time}` : re.date)}` : ''}{re.place ? ` · ${re.place}` : ''}</Fact>
        <Fact k="Résultat">{[resultText(d), ...refusalLines(d)].join(' · ')}</Fact>
        <Fact k="Réserves" block={reserves.length > 0}>
          {reserves.length === 0 ? 'Aucune réserve notée.' : (
            <ul className="space-y-1">
              {reserves.map(r => <li key={r.id}><span className="font-bold">{SEVERITY_LABEL[r.severity ?? 'minor']}</span>{r.where ? ` · ${r.where}` : ''} : {r.text || 'sans texte (photo seule)'}{r.photo && r.text ? ' · photo jointe' : ''}</li>)}
            </ul>
          )}
        </Fact>
        <Fact k={qt.label}>{qt.value || 'pas renseignée'}{count != null ? ` · comptée sur place\u202f: ${count}` : ''}</Fact>
        <Fact k="Clause de retenue">
          {clause ? <>{clause}{over ? ` ${over.replace(/^./, c => c.toUpperCase())}.` : ''}<span className="mt-1 block text-sm text-slate-600">{CLAUSE_NOTE}</span></> : "Aucune clause de retenue n'est renseignée dans les réglages."}
        </Fact>
      </dl>
      <p className="text-sm text-slate-700">Le PV complet s'affiche avec «&#8239;Voir le PV&#8239;», en bas de l'écran.</p>
    </section>
  );
  // what the person is about to sign, said in the words of the PV, right above the button (the result and the quantity, not the whole PV)
  const signs = `Vous signez\u202f: ${resultText(d)} · ${qt.value ? `${qt.label.toLowerCase()} ${qt.value.split(' · ')[0]}` : 'quantité pas renseignée'}.`;
  const pad = (v: Strokes | undefined, set: (x: Strokes | undefined) => void, label: string, on: boolean) => <div className={on ? '' : 'pointer-events-none opacity-50'}><SignaturePad value={v} onChange={set} label={label} wide /></div>;
  const short = (v: Strokes | undefined) => inked(v) && !signatureOk(v) && <p role="status" className="text-lg font-semibold text-red-800">Tracé trop court&#8239;: il n'est pas enregistré comme signature.</p>;
  const reuse = (v: Strokes | undefined) => { const f = same(v); return !!f && <p role="alert" className="text-lg font-semibold text-red-800">{f} : elle n'est pas enregistrée.</p>; };
  // the moment the PV is signed, said first: who, when, and that the content is locked
  const signedFact = !pvSigned(d) ? '' : `${re.pvNo || 'PV'} ${clientDone ? `signé par ${re.name || 'le client'}${re.signedAt ? `, ${fmtMoment(re.signedAt)}` : ''}` : re.noSign ? `: ${noSignHead(d).replace(/^L/, 'l')} le ${fmtMoment(re.noSign.at)}` : `: photo du PV papier signé enregistrée${re.pvPhotoAt ? `, ${fmtMoment(re.pvPhotoAt)}` : ''}`}. Contenu verrouillé.`;
  const step4 = (
    <>
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">{pvSigned(d) && !lostSign ? 'PV signé' : 'Signatures'}</h1>
      {signedFact && !lostSign && <Box tone="good" role="status"><span className="flex items-center gap-2 font-bold"><Check size={24} className="shrink-0" aria-hidden />{signedFact}</span></Box>}
      {recap}
      {!ro && (blockers.length > 0 || waiver) && (
        <section aria-labelledby="rcr-bk" className="space-y-3 rounded-2xl border-2 border-amber-700 bg-amber-50 p-3">
          <h2 id="rcr-bk" className="text-xl font-bold text-amber-950">{waiver ? 'Signature autorisée par dérogation' : 'Signature impossible sans dérogation'}</h2>
          {waiver && <p className="text-lg text-amber-950">Dérogation {de(waiver.by)}, {fmtMoment(waiver.at)} : {sentence(waiver.why)}</p>}
          {shown.length > 0 && (
            <>
              <p className="text-lg text-amber-950">Faits constatés&#8239;:</p>
              <ul className="list-disc space-y-1 pl-5 text-lg text-amber-950">{shown.map(b => <li key={b}>{b}</li>)}</ul>
            </>
          )}
          {!waiver && blockers.length > 0 && <button type="button" disabled={archived} className={`${BIG} w-full border-amber-800 bg-white text-amber-950`} onClick={() => setWv(true)}>Signer malgré ces faits</button>}
        </section>
      )}
      {!archived && (!clientDone || !companyDone) && (
        <section aria-labelledby="rcr-wh" className="space-y-1">
          {me ? (
            <>
              <div id="rcr-wh" className="text-base font-semibold text-slate-700">Qui recueille les signatures&#8239;?</div>
              <p className="flex flex-wrap items-center gap-x-2 text-lg text-slate-900">Même personne&#8239;: <span className="font-bold">{me}</span> · <button type="button" className="min-h-[44px] rounded-lg px-2 font-semibold text-slate-900 underline" onClick={() => setChg(true)}>changer</button></p>
              <p className="text-sm text-slate-600">Le nom est choisi à la main sur cet appareil&#8239;: l'outil ne vérifie pas l'identité.</p>
            </>
          ) : (
            <>
              <h2 id="rcr-wh" className="sr-only">Personne qui recueille les signatures</h2>
              {pickWho("Qui recueille les signatures\u202f?")}
              <p className="text-lg text-slate-700">Aucune personne choisie&#8239;: les signatures ne sont pas ouvertes.</p>
            </>
          )}
        </section>
      )}
      <section aria-labelledby="rcr-sc" className="space-y-3 rounded-2xl border-2 border-slate-200 p-3">
        <h2 id="rcr-sc" className="text-2xl font-black text-slate-900">Signature du client</h2>
        {clientDone ? (
          <>
            <div className="pointer-events-none"><SignaturePad value={d.signClient} onChange={() => {}} label="Signature du client" locked wide /></div>
            {lostSign ? <p role="alert" className="text-lg font-semibold text-red-800">Signature {de(re.name)} non enregistrée&#8239;: {KEPT_NOT}.</p>
              : <p className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Check size={20} className="shrink-0" aria-hidden />Signé par {re.name}{re.signedAt ? `, ${fmtMoment(re.signedAt)}` : ''}.</p>}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label htmlFor="rcr-name" className="block text-lg font-semibold text-slate-800">Nom lisible requis pour signer</label>
              <BigField id="rcr-name" value={re.name} disabled={ro} onType={setName} onSave={v => act.soon(id, x => setReceptionist(x, { name: v }))} />
            </div>
            {!ro && !nameOk && <p className="text-lg text-slate-700">Nom du client pas encore écrit&#8239;: la signature n'est pas ouverte.</p>}
            {pad(sig, setSig, 'Signature du client', nameOk && ready)}
            {short(sig)}
            {reuse(sig)}
            {!archived && <p className="text-lg text-slate-700">Le contenu du PV est verrouillé dès la signature du client.</p>}
            {storageFull && <p role="status" className="text-lg font-semibold text-red-800">Validation fermée&#8239;: {KEPT_NOT}, la signature ne serait pas conservée.</p>}
            {!ro && <p className="text-lg font-semibold text-slate-900">{signs}</p>}
            <button type="button" disabled={!nameOk || !signatureOk(sig) || !!same(sig) || !ready || storageFull} className={`${BIG} w-full ${MAIN}`} onClick={() => sign('client')}><Check size={26} aria-hidden />Valider la signature du client</button>
          </>
        )}
        {re.noSign && <Box tone="warn" role="status">{re.noSign.kind === 'absent' ? 'Client absent à la remise' : re.noSign.kind === 'refused' ? 'Signature refusée par le client' : `Signature du client non obtenue\u202f: ${noSignWords(re.noSign)}`}, témoin&#8239;: {re.noSign.witness}{re.noSign.witnessOrg ? ` (organisation\u202f: ${re.noSign.witnessOrg})` : ''}, {fmtMoment(re.noSign.at)}.{lostSign && ` Non enregistré\u202f: ${KEPT_NOT}.`}</Box>}
        {!clientDone && ro && d.pvPhoto && <div className="max-w-xs"><Pic value={d.pvPhoto} alt="Photo du PV papier signé" size="t" className="h-28 w-40 rounded-lg" /></div>}
      </section>
      <section aria-labelledby="rcr-sco" className="space-y-3 rounded-2xl border-2 border-slate-200 p-3">
        <h2 id="rcr-sco" className="text-2xl font-black text-slate-900">Signature de l'entreprise</h2>
        {companyDone ? (
          <>
            <div className="pointer-events-none"><SignaturePad value={d.signCompany} onChange={() => {}} label="Signature de l'entreprise" locked wide /></div>
            {lostSign ? <p role="alert" className="text-lg font-semibold text-red-800">Signature de l'entreprise non enregistrée&#8239;: {KEPT_NOT}.</p>
              : <p className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Check size={20} className="shrink-0" aria-hidden />Signé pour l'entreprise{re.companySignedAt ? `, ${fmtMoment(re.companySignedAt)}` : ''}.</p>}
          </>
        ) : (
          <>
            {pad(csig, setCsig, "Signature de la personne qui remet pour l'entreprise", readyCo)}
            {short(csig)}
            {reuse(csig)}
            {locked && !archived && <p className="text-lg text-slate-700">{clientDone ? 'Le client a signé\u202f: le PV est verrouillé.' : 'Le PV est verrouillé.'} La signature de l'entreprise s'ajoute avec un nouveau scellé.</p>}
            {storageFull && <p role="status" className="text-lg font-semibold text-red-800">Validation fermée&#8239;: {KEPT_NOT}, la signature ne serait pas conservée.</p>}
            <button type="button" disabled={!signatureOk(csig) || !!same(csig) || !readyCo} className={`${BIG} w-full ${MAIN}`} onClick={() => sign('company')}><Check size={26} aria-hidden />Valider la signature de l'entreprise</button>
          </>
        )}
      </section>
      {!clientDone && !pvSigned(d) && !archived && (
        <details className="rounded-2xl border-2 border-slate-200">
          <summary className="flex min-h-[56px] cursor-pointer items-center px-3 text-lg font-semibold text-slate-800">Si le client ne peut pas signer</summary>
          <div className="space-y-4 border-t-2 border-slate-200 p-3">
            <fieldset disabled={!ready} className="min-w-0 space-y-3">
              <legend className="sr-only">Mention&#8239;: client absent, signature refusée ou autre</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" aria-pressed={fallback === 'absent'} className={`${BIG} ${fallback === 'absent' ? 'border-slate-900 bg-slate-800 text-white' : 'border-slate-500 bg-white text-slate-900'}`} onClick={() => setFallback(fallback === 'absent' ? '' : 'absent')}>Client absent</button>
                <button type="button" aria-pressed={fallback === 'refused'} className={`${BIG} ${fallback === 'refused' ? 'border-slate-900 bg-slate-800 text-white' : 'border-slate-500 bg-white text-slate-900'}`} onClick={() => setFallback(fallback === 'refused' ? '' : 'refused')}>Signature refusée</button>
                <button type="button" aria-pressed={fallback === 'other'} className={`${BIG} ${fallback === 'other' ? 'border-slate-900 bg-slate-800 text-white' : 'border-slate-500 bg-white text-slate-900'}`} onClick={() => setFallback(fallback === 'other' ? '' : 'other')}>Autre, précisez</button>
              </div>
              {fallback === 'other' && (
                <div className="space-y-1">
                  <label htmlFor="rcr-nosign-other" className="block text-lg font-semibold text-slate-800">Précisez la raison (obligatoire)</label>
                  <input id="rcr-nosign-other" className={FIELD} value={fbOther} autoComplete="off" onChange={e => setFbOther(e.target.value)} />
                </div>
              )}
              {fallback && (
                <>
                  <NameChips label="Témoin" names={names.filter(q => ![me, signer].some(x => x && norm(x) === norm(q)))} value={witness} onChange={setWitness} />
                  {witnessSame && <p role="status" className="text-lg font-semibold text-red-800">Le témoin est la personne qui remet ou qui signe pour l'entreprise&#8239;: un témoin est une autre personne.</p>}
                  <div role="group" aria-label="Organisation du témoin" className="space-y-2">
                    <div className="text-base font-semibold text-slate-700">Organisation du témoin</div>
                    <div className="flex flex-wrap gap-2">{ORGS.map(o => <button key={o} type="button" aria-pressed={wOrg === o} className={chip(wOrg === o)} onClick={() => setWOrg(wOrg === o ? '' : o)}>{o === OTHER ? 'Autre, précisez' : o}</button>)}</div>
                    {wOrg === OTHER && <><label htmlFor="rcr-worg" className="block text-lg font-semibold text-slate-800">Précisez l'organisation (obligatoire)</label><input id="rcr-worg" className={FIELD} value={wOther} onChange={e => setWOther(e.target.value)} /></>}
                    {wOrg === 'Entreprise' && <p className="text-lg text-slate-800">Témoin de l'entreprise, pas un tiers.</p>}
                  </div>
                  <button type="button" disabled={!witnessOk || storageFull || (fallback === 'other' && !fbOther.trim())} className={`${BIG} w-full border-slate-900 bg-slate-800 text-white`} onClick={noSign}>Noter «&#8239;{fallback === 'absent' ? 'client absent' : fallback === 'refused' ? 'signature refusée' : fbOther.trim() || 'autre'}&#8239;»</button>
                </>
              )}
            </fieldset>
            {!ro && (
              <div className="space-y-1 border-t-2 border-slate-200 pt-3">
                <div className="text-lg font-semibold text-slate-800">Photo du PV papier signé</div>
                <fieldset disabled={!ready} className="min-w-0 max-w-xs"><Snap><PhotoBox value={d.pvPhoto ?? ''} label="Photo du PV papier signé" onChange={pvPhoto} /></Snap></fieldset>
                {!!photoFact && <p role="status" className="text-lg font-semibold text-red-800">{photoFact}. La photo n'est pas retenue pour ce PV.</p>}
              </div>
            )}
          </div>
        </details>
      )}
      {!pvSigned(d) && <Box tone="info" role="status">PV pas encore signé&#8239;: signature du client, photo du PV papier, ou mention «&#8239;client absent&#8239;» ou «&#8239;signature refusée&#8239;» avec témoin.</Box>}
      {!!fail && <Box tone="bad" role="alert">{fail}</Box>}
      {wv && (
        <Ask title="Signer malgré ces faits" onClose={() => setWv(false)}>
          <p className="text-lg text-slate-800">Ces faits sont inscrits au journal avec la personne qui autorise, le motif et l'heure&#8239;:</p>
          <ul className="list-disc space-y-1 pl-5 text-lg text-slate-900">{blockers.map(b => <li key={b}>{b}</li>)}</ul>
          <PeoplePick big value={wvBy} onChange={setWvBy} names={names} absent={absent} label="Qui autorise la signature malgré ces faits&#8239;?" />
          <div className="space-y-1">
            <label htmlFor="rcr-wvwhy" className="block text-lg font-semibold text-slate-800">Motif de la dérogation (obligatoire)</label>
            <textarea id="rcr-wvwhy" rows={3} className={FIELD} value={wvWhy} onChange={e => setWvWhy(e.target.value)} />
          </div>
          <div className="grid gap-3">
            <button type="button" disabled={!wvBy.trim() || !wvWhy.trim()} className={`${BIG} border-amber-800 bg-amber-700 text-white`} onClick={allow}>Enregistrer la dérogation de signature</button>
            <button type="button" className={`${BIG} border-slate-500 bg-white text-slate-900`} onClick={() => setWv(false)}>Revenir aux signatures</button>
          </div>
        </Ask>
      )}
    </>
  );

  const follow = choice === 'refus' || reserves.length > 0 || (remainingQty(d) ?? 0) > 0;
  const seal = re.seals?.at(-1), mod = locked && !!seal && sealState(d) === 'modified';   // the content no longer matches the seal laid at the signature
  const signedText = `${re.signedAt ? `PV signé le ${fmtMoment(re.signedAt)}` : re.noSign ? `${noSignHead(d)} le ${fmtMoment(re.noSign.at)}` : 'PV établi'}${seal ? ` · scellé ${shortSeal(seal.hash)}` : ''}`;   // a PV without the signature of the customer is not said "signed"
  const step5 = (
    <>
      <h1 data-head tabIndex={-1} className="text-3xl font-black text-slate-900 focus:outline-none">{lostSign ? 'PV non enregistré' : pvSigned(d) ? 'PV terminé' : 'PV pas encore signé'}</h1>
      {re.pvNo && <p className="text-2xl font-black text-slate-900">{re.pvNo}{lostSign && <span className="text-lg font-semibold text-red-800"> : numéro non enregistré</span>}</p>}
      {lostSign && <Box tone="bad" role="alert">PV non enregistré&#8239;: {KEPT_NOT}, la signature est perdue à la fermeture de la page.</Box>}
      {locked && !lostSign && <Box tone="good" role="status"><span className="flex items-center gap-2 font-bold"><Check size={24} className="shrink-0" aria-hidden />{signedText}</span><span className="mt-1 block">Le contenu du PV est verrouillé. Une correction passe par la fiche de la commande («&#8239;Corriger&#8239;»)&#8239;: elle laisse une ligne au journal et pose un nouveau scellé.</span>{!seal && <span className="mt-1 block">Aucun scellé enregistré pour ce PV.</span>}</Box>}
      {pvSigned(d) && !lostSign && !companyDone && <Box tone="info" role="status">Signature de l'entreprise&#8239;: pas encore apposée.{!archived && <button type="button" className={`${BIG} mt-3 w-full border-slate-500 bg-white text-slate-900`} onClick={() => go(4)}>Signer pour l'entreprise</button>}</Box>}
      {mod && seal && <Box tone="bad" role="alert">Modifié depuis la signature&#8239;: le contenu ne correspond plus au scellé {shortSeal(seal.hash)} posé le {fmtMoment(seal.at)}.</Box>}
      {!pvSigned(d) && <Box tone="warn" role="status">PV pas encore signé&#8239;: il est affiché tel qu'il est écrit.</Box>}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={`${BIG} border-delacour-dark bg-delacour-primary text-white`} onClick={() => print(<PvPrint d={d} state={state} />, RC_PAGE)}><Printer size={24} aria-hidden />Imprimer le PV</button>
        <button type="button" className={`${BIG} border-slate-500 bg-white text-slate-900`} onClick={() => pvPdfFile({ d, state })}><FileDown size={24} aria-hidden />PV en PDF</button>
      </div>
      <PvView d={d} state={state} />
      {follow && <button type="button" className={`${BIG} w-full border-slate-500 bg-white text-slate-900`} onClick={() => leave(() => { quit(); nav.tool('3.4', `${id}:follow`); }, true)}>Ouvrir les suites dans la fiche de la commande</button>}
    </>
  );

  const steps = [step1, step2, step3, step4, step5];
  // "Suivant" on the findings writes the result that was proposed (none written yet), and takes "sans réserve" back to "avec réserve" when a reservation was added after it; a refusal is written by its own gesture
  const settle = () => {
    if (ro || !me || choice === 'refus') return;
    const want = !re.result ? proposed : re.result === 'sans' && reserves.some(r => !r.liftedAt) ? 'reserve' : re.result;
    if (want !== re.result) act(id, (x, _by, st) => setResult(x, want, nowLocal(), me, st));
  };
  // what closes "Suivant", said next to it
  const why = s === 1 && !ro && !me ? 'Aucune personne choisie\u202f: «\u202fSuivant\u202f» reste fermé.' : s === 3 && choice === 'refus' && !refusalOk ? 'Motif ou suite pas encore précisé\u202f: «\u202fSuivant\u202f» reste fermé.' : '';
  const nextGo = s === LAST ? { label: 'Fermer', run: () => leave(quit, true), end: true }
    : { label: s === 4 ? 'Voir le PV' : 'Suivant', run: () => leave(() => { if (s === 1) start(); if (s === 3) settle(); go(s + 1); }), off: !!why, why, quiet: s === 4 && !pvSigned(d) };   // until the PV is signed "Voir le PV" is white: the main gesture is the signature
  const notice = lostSign ? '' : validationNotice(d, did);   // the focus goes to the title of the step and this is said
  return (
    <>
      <Frame label={`Réception de la commande ${orderLabel(d)}`} title={orderLabel(d)} said={`Étape ${s} sur ${LAST}\u202f: ${s === LAST && lostSign ? 'PV non enregistré' : STEPS[s - 1]}`} notice={notice} top={did === 'client' || did === 'photo' || did === 'mention' ? notice : ''} progress={{ n: s, of: LAST }} bar={bar} closed={ro ? undefined : waiver ? 'Une dérogation de signature est enregistrée.' : 'La signature est fermée sans dérogation de signature.'} onClose={() => leave(quit, true)}
        sub={<><span className="font-bold">Étape {s} sur {LAST}</span>{s > 1 && !!me ? <WhoBtn label="Remet" who={me} onClick={() => setChg(true)} /> : <StateText st={deliveryState(d, new Date(), state.params)} />}</>} back={{ label: 'Précédent', run: () => leave(() => go(s - 1)), off: s === 1 }} next={nextGo}>
        <div className="mx-auto max-w-3xl space-y-5">
          {ro && s < 4 && (lostSign ? <Box tone="bad" role="alert">PV non enregistré&#8239;: {KEPT_NOT}, la signature est perdue à la fermeture de la page.</Box>
            : <Box tone="good" role="status">{archived ? "Commande archivée\u202f: cet écran n'enregistre plus de geste." : `${signedText}\u202f: le contenu est verrouillé. Une correction passe par la fiche de la commande.`}</Box>)}
          {s > 1 && s < 4 && !ro && !me && <>{noWho}{whoPick}</>}
          {s < 4 ? <fieldset disabled={ro || (s > 1 && !me)} className="min-w-0 space-y-5">{steps[s - 1]}</fieldset> : steps[s - 1]}
        </div>
      </Frame>
      {printNode}
      {chg && <WhoAsk title={s === 4 ? 'Qui recueille les signatures\u202f?' : "Qui remet pour l'entreprise\u202f?"} who={who} setWho={setWho} names={names} absent={absent} onClose={() => setChg(false)} />}
      {ask && (
        <Ask title="Saisie pas encore enregistrée" onClose={() => setAsk(null)}>
          <p className="text-lg text-slate-800">Ne sont pas enregistrées&#8239;: {ask.lost.join(', ')}.</p>
          <div className="grid gap-3">
            {ask.add && <button type="button" className={`${BIG} ${MAIN}`} onClick={() => { const f = ask.run; addRv(); setRv(blank); setBad({}); setAsk(null); f(); }}>Ajouter la réserve et {ask.closing ? 'quitter' : 'continuer'}</button>}
            <button type="button" className={`${BIG} border-red-700 bg-white text-red-800`} onClick={() => { const f = ask.run; setRv(blank); setBad({}); setAsk(null); f(); }}>{ask.closing ? 'Quitter' : 'Continuer'} sans enregistrer</button>
            <button type="button" className={`${BIG} border-slate-500 bg-white text-slate-900`} onClick={() => setAsk(null)}>Revenir à l'écran</button>
          </div>
        </Ask>
      )}
    </>
  );
}
