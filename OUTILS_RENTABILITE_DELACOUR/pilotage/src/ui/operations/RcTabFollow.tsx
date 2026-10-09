// Fifth tab of the sheet of an order (tool 3.4): what follows. The end-of-job review of 2.4 (its state, or the three questions to ask), the defects of 5.1 linked to the
// milestones and the reservations, the deliveries (quantity ordered, received, left, result and PV of each closed one), the next delivery after a refusal or a partial one,
// the customer (2.4 and the directory), the journal of the order and the archive. Every gesture is a move of the life (`act`); what changes much can be undone for a few seconds.
import { useMemo, useState } from 'react';
import { ShieldAlert, UserPlus } from 'lucide-react';
import type { Delivery, Org, Reception } from '../../domain/types';
import { archiveDelivery, breakdownsTouching, canAskFeedback, deletable, deliveryState, isLocked, isPostponed, isSettled, lostByDeleting, lotSealState, lotsOf, ncLinkState, ncOf, nextPresentation, noSignWords, openReserves, pvSigned, qtyReceived, receptionsOf, remainingQty, reservesOf, restoreDelivery, takeLife } from '../../domain/receptions';
import { feedbackFromDelivery, FEEDBACK_STATE, feedbackState } from '../../domain/commercial';
import { addClientToDirectory, directoryOfClient, peopleToAdd } from '../../domain/clients';
import { decisionLabel, NC_STATE, ncState } from '../../domain/quality';
import { nb, nowLocal } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal, NewTab, NumInput, StatusBadge, SubTitle } from '../common';
import { de, fmtMoment, followedText, plural, reserveWords, StateBadge, TOUCH16, useUndo, sentence, rcDay } from './RcBits';
import { qtyFr, qtyPlural } from './RcCards';
import { PvPdfButton, PvPrintButton, PvView } from './RcPv';
import type { RcTabProps } from './RcSheet';
import { applied, OFF } from './RcTabReception';

const RESULT: Record<Reception['result'], string> = { '': 'Pas de résultat', sans: 'Reçue sans réserve', reserve: 'Reçue avec réserve', refus: 'Réception refusée' };
const SHOWN = 15;
// What the domain does not allow, said in facts: the next delivery of a received one is opened once its PV is signed (or a signature waiver is written)
const NO_NEXT = "PV non signé\u202f: la livraison suivante n'est pas ouverte.";

export function RcTabFollow({ d, saved, set, act, state, nav }: RcTabProps) {
  const { update } = useStore();
  const { bar, offer } = useUndo();
  const [qty, setQty] = useState<number | null | undefined>(), [view, setView] = useState<Delivery | null>(null), [arch, setArch] = useState<string | null>(null), [all, setAll] = useState(false), [neg, setNeg] = useState(''), [fail, setFail] = useState(false);
  const now = new Date(), re = d.reception, lots = lotsOf(d), list = receptionsOf(d), rest = remainingQty(d), name = d.client.trim(), oid = d.orgId || re.orgId;   // oid: the organisation the order holds comes before the name typed (an organisation renamed in 1.3 stays linked)
  const dir = directoryOfClient(state, name, oid), toAdd = peopleToAdd(state, name, [], oid).length, breakdowns = breakdownsTouching(state, d);
  const seals = useMemo(() => lotsOf(d).map(l => lotSealState(d, l.no)), [d]);   // what the seal of each closed delivery says now (a hash of its content, not computed at every key)
  const fb = Object.values(state.feedbacks).find(f => f.deliveryId === d.id), refused = re.result === 'refus', partial = (re.result === 'sans' || re.result === 'reserve') && !isSettled(d);
  const nq = qty === undefined ? (refused ? re.qty ?? d.qty : rest) : qty;
  // the reservations of every delivery stay followed (listed, repaired and lifted in the tab Réception) whether or not the next delivery is opened
  const openRv = openReserves(d), postponed = isPostponed(d), noNext = partial && !pvSigned(d) && !re.signWaiver;
  // the defects of 5.1 declared from a milestone or a reservation (of the delivery under way and of the closed ones), then any other that names this order
  const links = [
    ...d.milestones.flatMap((m, i) => (m.ncId ? [[m.ncId, `Jalon ${i + 1}${m.label.trim() ? ` «\u202f${m.label.trim()}\u202f»` : ''}`] as const] : [])),
    ...reservesOf(d).flatMap(r => (r.ncId ? [[r.ncId, `Réserve ${reserveWords(r.text)}`] as const] : [])),
    ...lots.flatMap(l => [...l.milestones.flatMap((m, i) => (m.ncId ? [[m.ncId, `Livraison ${l.no}, jalon ${i + 1}`] as const] : [])), ...(l.reception.reserves ?? []).flatMap(r => (r.ncId ? [[r.ncId, `Livraison ${l.no}, réserve ${reserveWords(r.text)}`] as const] : []))]),
  ];
  const from = new Map(links), ncs = [...new Set([...links.map(x => x[0]), ...Object.values(state.ncs).filter(n => n.deliveryId === d.id).map(n => n.id)])].flatMap(id => { const n = ncOf(state, id); return n ? [n] : []; });
  const gone = links.filter(([id]) => ncLinkState(state, id) === 'missing');   // a defect deleted in 5.1: its link stays on the milestone or the reservation, the sheet says it
  // 3.3 (read only): the breakdowns that touched this order; the link opens the equipment in another tab
  const eqOfBreakdown = (id: string) => Object.values(state.equipments ?? {}).find(e => e.breakdowns?.some(b => b.id === id));
  const log = [...(d.journal ?? [])].reverse(), shown = all ? log : log.slice(0, SHOWN);
  // a closed delivery read as an order, to show its PV (its number is the one it had)
  const asOrder = (i: number): Delivery => { const l = lots[i]; return l ? ({ ...d, ...l, id: d.id, lots: lots.slice(0, i) } as Delivery) : d; };
  const next = () => {
    const before = d;
    if (!applied(act, (x, by) => nextPresentation(x, by, nowLocal(), nq))) { setFail(true); return; }   // the domain refused: nothing is opened, nothing is announced
    setFail(false); setQty(undefined); offer('Livraison suivante ouverte', () => act(x => takeLife(x, before)));
  };
  const archive = () => { const before = d, note = (arch ?? '').trim(); act((x, by) => archiveDelivery(x, nowLocal(), note, by)); setArch(null); offer('Commande archivée', () => act(x => takeLife(x, before))); };
  const restore = () => { const before = d; act((x, by) => restoreDelivery(x, by)); offer('Commande restaurée', () => act(x => takeLife(x, before))); };
  const addOrg = () => { const out: { org?: Org } = {}; update(x => { out.org = addClientToDirectory(x, name, [], oid).org; }); if (out.org) set({ orgId: out.org.id }); };
  const ask = () => { const f = feedbackFromDelivery(d); update(x => { x.feedbacks[f.id] = f; }); nav.open('2.4', f.id); };   // offered only while the order has no review (`fb`) and once it was received
  const lost = lostByDeleting(d), follow = followedText(d), why = deletable(state, d), barred = why !== lost ? why : '';   // barred: a review of the end (2.4) is linked to the order, said as a fact

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-700">Commande&#8239;: <StateBadge st={deliveryState(d, now, state.params)} /></p>

      <section className="space-y-2">
        <SubTitle>Bilan de fin de commande (outil 2.4)</SubTitle>
        {fb ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-800">
            <span className="inline-flex flex-wrap items-center gap-2">Bilan {de(fb.client)} <StatusBadge level={FEEDBACK_STATE[feedbackState(fb, state)].tone} text={FEEDBACK_STATE[feedbackState(fb, state)].label} /></span>
            <Button onClick={() => nav.open('2.4', fb.id)}>Ouvrir le bilan<NewTab /></Button>
          </div>
        ) : canAskFeedback(d) ? <div className="flex flex-wrap items-center gap-2"><Button className={OFF} disabled={!saved} onClick={ask}>Poser les 3 questions au client<NewTab /></Button>{!saved && <span className="text-xs text-slate-600">Commande pas encore enregistrée.</span>}</div>
          : <p role="status" className="text-xs text-slate-700">Les 3 questions se posent une fois la commande reçue&#8239;: aucune livraison n'est encore enregistrée.</p>}
        <p className="text-xs text-slate-500">Le bilan se pose depuis l'onglet Suites.</p>
      </section>

      <section className="space-y-2">
        <SubTitle>Défauts du bac rouge liés (outil 5.1)</SubTitle>
        {ncs.length === 0 && gone.length === 0 ? <p className="text-xs text-slate-500">Aucun défaut déclaré pour cette commande.</p> : (
          <ul className="space-y-2">
            {ncs.map(n => (
              <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700">
                <span className="font-mono text-xs font-semibold text-slate-900">{n.ref}</span>
                <span className="min-w-[10rem] flex-1 break-words">{from.get(n.id) ?? 'Commande'} · {n.description}</span>
                <StatusBadge level={NC_STATE[ncState(n, now)].tone} text={`${NC_STATE[ncState(n, now)].label}${n.decision ? ` · ${decisionLabel(n.decision)}` : ''}`} />
                <Button className="!py-1" onClick={() => nav.open('5.1', n.id)}>Ouvrir le défaut<span className="sr-only"> {n.ref}</span><NewTab /></Button>
              </li>
            ))}
            {gone.map(([id, label]) => <li key={`gone-${id}`} role="status" className="rounded-lg border border-slate-200 p-2.5 text-xs font-semibold text-red-900">{label} : défaut lié introuvable dans 5.1.</li>)}
          </ul>
        )}
      </section>

      {breakdowns.length > 0 && (
        <section className="space-y-2">
          <SubTitle>Pannes de la maintenance liées (outil 3.3)</SubTitle>
          <ul className="space-y-2">
            {breakdowns.map(b => {
              const e = eqOfBreakdown(b.id);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800">
                  <span className="min-w-[10rem] flex-1 break-words">Panne {de(b.equipmentName)} le {fmtMoment(b.at)} qui a touché cette commande.</span>
                  {e && <Button className="!py-1" onClick={() => nav.open('3.3', `${e.id}:issues`)}>Ouvrir dans 3.3<span className="sr-only"> la panne {de(b.equipmentName)}</span><NewTab /></Button>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <SubTitle>Livraisons</SubTitle>
        {d.qty != null && <p className="text-xs text-slate-800">Quantité commandée&#8239;: {qtyFr(d.qty)} · reçue&#8239;: {qtyFr(qtyReceived(d))} · reste à livrer&#8239;: {qtyFr(rest ?? 0)}.</p>}
        <ul className="space-y-2">
          {list.map((x, i) => {
            const r = x.reception, closed = i < lots.length, rv = openRv.filter(y => y.lotNo === i + 1).length;
            return (
              <li key={closed ? lots[i].id : 'now'} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-2.5 text-xs text-slate-700 ${closed && seals[i] === 'modified' ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
                <span className="text-xs font-semibold text-slate-900">Livraison n° {i + 1}{closed || isLocked(d) ? '' : ' (en cours)'}</span>
                <span className="min-w-[10rem] flex-1 break-words">
                  {RESULT[r.result]}{r.noSign ? `, ${noSignWords(r.noSign)}` : ''}{r.result === 'refus' && r.refusal ? `\u202f: ${r.refusal.reason === 'Autre' ? r.refusal.other || 'Autre' : r.refusal.reason}` : ''}{x.qty != null ? ` · quantité ${qtyFr(x.qty)}` : ''}{r.date ? ` · ${rcDay(r.date)}` : ''}{r.pvNo ? ` · ${r.pvNo}` : ''}{closed && (r.result === 'sans' || r.result === 'reserve') && !pvSigned(lots[i]) ? ' · PV non signé' : ''}{rv ? ` · ${plural(rv, 'réserve ouverte', 'réserves ouvertes')}` : ''}
                </span>
                {(closed || r.result || r.date) && <Button className="!py-1" onClick={() => setView(asOrder(i))}>Voir le PV<span className="sr-only"> de la livraison n° {i + 1}</span></Button>}
                {closed && seals[i] === 'modified' && <p role="alert" className="flex basis-full items-start gap-1.5 font-semibold text-red-900"><ShieldAlert size={14} aria-hidden className="mt-0.5 shrink-0" />Le contenu du {r.pvNo || `PV de la livraison n° ${i + 1}`} ne correspond plus à son scellé.</p>}
              </li>
            );
          })}
        </ul>
        {(refused || partial) && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-800">{refused ? 'Réception refusée\u202f: une nouvelle livraison peut avoir lieu, avec son propre PV.' : postponed ? "Réception reportée\u202f: une réserve bloquante est ouverte, la quantité de cette livraison n'est pas comptée reçue." : rest != null ? `Livrée en partie\u202f: ${qtyPlural(rest, 'restant')} à livrer.` : "Livrée en partie\u202f: la quantité restante n'est pas connue."}</p>
            <div className="max-w-[14rem]">
              <Field label="Quantité de la livraison suivante">
                <>
                  <NumInput value={nq} onChange={v => { if (v != null && v < 0) setNeg(qtyFr(v)); else { setNeg(''); setQty(v); } }} aria-label="Quantité de la livraison suivante" />
                  {neg && <span role="status" className="block text-xs font-semibold text-red-700">Une quantité n'est pas négative&#8239;: «&#8239;{neg} » n'est pas enregistré.</span>}
                </>
              </Field>
            </div>
            {openRv.length > 0 && <p role="status" className="text-xs text-slate-700">{plural(openRv.length, 'réserve ouverte', 'réserves ouvertes')} {openRv.length > 1 ? 'restent suivies' : 'reste suivie'} après l'ouverture de la livraison suivante&#8239;: levée, reprise et défaut restent dans l'onglet Réception, les échéances dans la file «&#8239;À faire&#8239;».</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button kind="primary" className={OFF} disabled={noNext} onClick={next}>Ouvrir la livraison suivante</Button>
              {noNext && <span role="status" className="text-xs font-semibold text-amber-900">{NO_NEXT}</span>}
              {fail && !noNext && <span role="status" className="text-xs font-semibold text-red-700">La livraison suivante n'est pas ouverte&#8239;: l'outil la refuse dans l'état actuel de la commande.</span>}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SubTitle>Client</SubTitle>
        {!name ? <p className="text-xs text-slate-500">Pas encore de client.</p> : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-900">{name}</span>
            <Button onClick={() => nav.open('2.4', `client:${name}`)}>Ouvrir la fiche client (2.4)<NewTab /></Button>
            {dir.org || dir.contacts.length > 0
              ? <Button onClick={() => nav.open('1.3', dir.org ? `org:${dir.org.name}` : dir.contacts[0].id)}>Ouvrir dans l'annuaire<NewTab /></Button>
              : <><Button onClick={addOrg}><UserPlus size={14} aria-hidden />Ajouter à l'annuaire&#8239;: l'organisation{toAdd ? ` et ${plural(toAdd, 'personne interrogée', 'personnes interrogées')}` : ''}</Button><span className="text-xs text-slate-600">Ce client n'est pas dans l'annuaire (outil 1.3).</span></>}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <SubTitle>Journal de la commande</SubTitle>
        {log.length === 0 ? <p className="text-xs text-slate-500">Rien n'est encore inscrit.</p> : (
          <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {shown.map((l, i) => <li key={`${l.at}-${i}`} className="flex flex-wrap gap-x-2 px-2.5 py-1.5 text-xs text-slate-700"><span className="shrink-0 font-semibold text-slate-900">{fmtMoment(l.at)}</span><span className="shrink-0">{l.by || 'sans nom'}</span><span className="min-w-[12rem] flex-1 break-words">{l.text}</span></li>)}
          </ol>
        )}
        {log.length > SHOWN && <Button onClick={() => setAll(!all)}>{all ? 'Réduire le journal' : `Tout voir (${plural(log.length, 'ligne')})`}</Button>}
      </section>

      <section className="space-y-2">
        <SubTitle>Archive</SubTitle>
        {d.archivedAt ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-800">{sentence(nb(`Commande archivée le ${rcDay(d.archivedAt.slice(0, 10))}${d.archivedNote?.trim() ? `\u202f: ${d.archivedNote.trim()}` : ''}`))}</p>
            <Button onClick={restore}>Restaurer</Button>
          </div>
        ) : <Button onClick={() => setArch('')}>Archiver</Button>}
        {barred && <p role="status" className="text-xs text-slate-700">{barred}.</p>}
      </section>

      {arch !== null && (
        <Modal onClose={() => setArch(null)} title="Archiver la commande" subtitle="Le contrôle, la libération, le PV et le journal sont gardés"
          footer={<><Button onClick={() => setArch(null)}>Annuler</Button><Button kind="primary" onClick={archive}>Archiver</Button></>}>
          <div className="space-y-3">
            <p className="text-xs text-slate-700">La commande sort des listes en cours et se restaure à tout moment.{lost ? ` Elle garde\u202f: ${lost}.` : ''}{barred ? ` ${barred}.` : ''}{follow ? ` ${follow}` : ''}</p>
            <Field label="Pourquoi (facultatif)"><input className={`${inputCls} ${TOUCH16}`} value={arch} autoFocus onChange={e => setArch(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
      {view && <Modal wide onClose={() => setView(null)} title={`Procès-verbal de réception${view.reception.pvNo ? ` ${view.reception.pvNo}` : ''}`} subtitle={`Livraison n° ${(view.lots?.length ?? 0) + 1}`} footer={<><PvPrintButton d={view} state={state} /><PvPdfButton d={view} state={state} /><Button onClick={() => setView(null)}>Fermer</Button></>}><PvView d={view} state={state} /></Modal>}
      {bar}
    </div>
  );
}
