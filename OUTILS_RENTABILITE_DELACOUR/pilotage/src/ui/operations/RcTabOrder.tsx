// First tab of the sheet of an order (tool 3.4): number, customer (suggested by the directory), item, quantity, quote it comes from (never its amount), promised day,
// the people of the order, traceability, model of milestones and the QR code of the order. All of it is typed content: `set` writes the draft. Changing the model replaces
// the milestones, so it is a move of the structure (`act`) and asks first when some are already checked. On a signed PV every field is read only (the content of the PV is
// frozen, `takeLife` keeps the saved order whole): "Corriger" opens the one way to change it, with a person, a reason, a line of the journal and a new seal. A closed delivery whose PV is
// signed seals the identity of the order too (number, customer, item, quantity, promised day, traceability): those fields are read only as soon as one exists, the same way out.
import { useRef, useState } from 'react';
import { Lock, Printer } from 'lucide-react';
import type { Delivery, MilestoneTemplate } from '../../domain/types';
import { daysBetween, nb, nowLocal } from '../../domain/base';
import { correctLocked, deliveryFromQuote, deliveryFromTemplate, isLocked, logDelivery, lotsOf, OTHER, promisedOn, qtyReceived, remainingQty, templatesOf } from '../../domain/receptions';
import { norm } from '../../domain/text';
import { isoDate } from '../../domain/periods';
import { Button, Field, inputCls, Modal, NumInput, SubTitle } from '../common';
import { Qr } from '../Qr';
import { clientsOf } from '../commercial/Devis';
import { cut, isLocalAddress, peopleOf, plural, rcJalonUrl, useHold, useUndo, sentence, rcDay } from './RcBits';
import { qtyFr, qtyPlural } from './RcCards';
import type { RcTabProps } from './RcSheet';
import { applied, Correct, type CorrectField, OFF } from './RcTabReception';

const ic = `${inputCls} disabled:bg-slate-100 disabled:text-slate-600`;   // a read only field (signed PV) looks read only
const own = <T,>(o: Record<string, T> | undefined, k?: string): T | undefined => (k && o && Object.hasOwn(o, k) ? o[k] : undefined);   // an id that came from an address is never a key of the prototype
const big = (on: boolean) => `flex min-h-[44px] items-center justify-center rounded-xl border-2 px-3 text-sm font-bold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`;
// Milestones of the model; the checks before departure follow the model unless one was already done
function swapModel(d: Delivery, t: MilestoneTemplate, lost: number, by: string): Delivery {
  const fresh = deliveryFromTemplate(t), { shipChecks, ...rest } = d, done = (shipChecks ?? []).some(c => c.ok != null || c.na);
  const out: Delivery = { ...rest, template: t.name, milestones: fresh.milestones, ...(done && shipChecks ? { shipChecks } : fresh.shipChecks ? { shipChecks: fresh.shipChecks } : {}) };
  return lost ? logDelivery(out, by, nowLocal(), nb(`Modèle de jalons «\u202f${t.name}\u202f»\u202f: ${plural(lost, 'jalon contrôlé remis', 'jalons contrôlés remis')} à contrôler`)) : out;
}

export function RcTabOrder({ d, saved, set, act, hold, state, print, who }: RcTabProps & { print?(): void }) {
  const { bar, offer } = useUndo();
  const more0 = useRef(!!(d.lot || d.serial || d.material || d.quoteId));   // open at once when one of the details is written
  const [swap, setSwap] = useState<MilestoneTemplate | null>(null), [other, setOther] = useState<string | null>(null), [fix, setFix] = useState(false), [neg, setNeg] = useState('');
  const locked = isLocked(d), sealedLot = lotsOf(d).some(l => isLocked(l)), idLocked = locked || sealedLot;   // idLocked: the identity of the order is part of a PV that is signed
  useHold(hold, 'order-other', other?.trim() ? `Personne «\u202f${cut(other)}\u202f» pas encore ajoutée à la commande` : '');   // a name typed in "Autre, précisez" and not added
  const now = new Date(), today = isoDate(now);
  const orgs = Object.values(state.orgs || {}), tpls = templatesOf(state.params), won = Object.values(state.quotes).filter(q => q.status === 'won').sort((a, b) => b.date.localeCompare(a.date));
  const clients = [...new Set([...orgs.map(o => o.name.trim()), ...clientsOf(state)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const org = own(state.orgs, d.orgId), quote = own(state.quotes, d.quoteId);
  // the pool of people: those of 4.2 (the ones on leave told apart), plus the ones already named on the order
  const pool = peopleOf(state, { ...d, team: undefined }, today), everyone = [...pool.names, ...pool.absent], team = d.team ?? [];
  const extra = team.filter(n => !everyone.some(x => norm(x) === norm(n)));
  const checked = d.milestones.filter(m => m.ok != null || m.history?.length || m.photo || m.gapPhoto || m.waivedBy).length;
  const frozen = locked || !!d.releasedAt || !!d.reception.date, promised = promisedOn(state, d), late = promised && !d.reception.date ? daysBetween(promised, now) ?? 0 : 0;
  // the promised day the quote gives today, when the order keeps another one (a quote whose delay changed never rewrites the day typed on the order)
  const quoteDay = d.quoteId && own(state.quotes, d.quoteId) ? promisedOn(state, { ...d, promisedAt: undefined }) : '', moved = !!d.promisedAt && !!quoteDay && quoteDay !== d.promisedAt;
  const rest = remainingQty(d), got = qtyReceived(d), url = rcJalonUrl(d.id);
  // a name that is not one of the models is "Autre": it is what "Précisez" shows (older orders keep their free name there)
  const known = tpls.some(t => t.name === d.template), free = !!d.template && !known, spec = d.template === OTHER ? '' : d.template ?? '';

  // typing a name that is in the directory links the order to it (and drops the person of another organisation)
  const clientPatch = (v: string): Partial<Delivery> => {
    const o = orgs.find(x => norm(x.name) === norm(v));
    return { client: v, orgId: o?.id, ...(o?.id === d.orgId ? {} : { contactId: undefined }) };
  };
  const pickQuote = (id: string) => {
    if (!own(state.quotes, id)) { set({ quoteId: undefined }); return; }
    const from = deliveryFromQuote(state, id, state.params), before = { quoteId: d.quoteId, client: d.client, item: d.item, promisedAt: d.promisedAt, orgId: d.orgId, contactId: d.contactId };
    set({ ...(from.client.trim() ? clientPatch(from.client) : {}), quoteId: id, ...(from.item.trim() ? { item: from.item } : {}), ...(from.promisedAt ? { promisedAt: from.promisedAt } : {}) });
    offer('Devis repris\u202f: client, objet, date promise', () => set(before));
  };
  const toggle = (n: string) => { const next = team.includes(n) ? team.filter(x => x !== n) : [...team, n]; set({ team: next.length ? next : undefined }); };
  const addOther = () => { const n = (other ?? '').trim(); if (n && !team.includes(n)) set({ team: [...team, n] }); setOther(null); };
  const choose = (name: string) => {
    if (name === (d.template ?? '')) return;
    const t = tpls.find(x => x.name === name);
    if (!t) { set({ template: name || undefined }); return; }   // "" : model not given; OTHER : the model is written in "Précisez"
    if (checked) setSwap(t); else act(x => swapModel(x, t, 0, ''));
  };

  return (
    <div className="space-y-5">
      {locked && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          <Lock size={14} aria-hidden className="shrink-0" /><span className="min-w-[12rem] flex-1">Les champs de la commande ne se modifient plus. «&#8239;Corriger la commande&#8239;» laisse une ligne au journal et un nouveau scellé.</span>
          <Button onClick={() => setFix(true)}>Corriger la commande</Button>
        </div>
      )}
      {sealedLot && !locked && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-800">
          <Lock size={14} aria-hidden className="shrink-0" /><span className="min-w-[12rem] flex-1">Une livraison close a un PV signé&#8239;: le numéro, le client, le livrable, la quantité, la date promise et la traçabilité sont scellés avec elle et ne se modifient plus ici. «&#8239;Corriger la commande&#8239;» laisse une ligne au journal et de nouveaux scellés.</span>
          <Button onClick={() => setFix(true)}>Corriger la commande</Button>
        </div>
      )}
      <section className="space-y-3">
        <SubTitle>La commande</SubTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Numéro de commande"><input className={`${ic} font-mono`} value={d.ref} disabled={idLocked} autoFocus={!saved && !d.ref && !d.client} onChange={e => set({ ref: e.target.value })} /></Field>
          <Field label="Client" hint={org ? `Organisation de l'annuaire\u202f: ${org.name}.` : d.client.trim() ? "Saisie libre\u202f: ce client n'est pas dans l'annuaire (outil 1.3)." : 'Une organisation de l\'annuaire peut être choisie dans la liste\u202f; sinon le nom est écrit à la main.'}>
            <input className={ic} list="rc-clients" value={d.client} disabled={idLocked} autoComplete="off" onChange={e => set(clientPatch(e.target.value))} />
          </Field>
          <datalist id="rc-clients">{clients.map(c => <option key={c} value={c} />)}</datalist>
          <Field label="Livrable"><input className={ic} value={d.item} disabled={idLocked} placeholder="Ce qui est commandé" onChange={e => set({ item: e.target.value })} /></Field>
          <Field label="Quantité commandée" hint={d.qty != null && got > 0 ? `${qtyPlural(got, 'reçue')}${rest != null ? `, ${qtyPlural(rest, 'restant')} à livrer` : ''}.` : undefined}>
            <>
              <NumInput value={d.qty} disabled={idLocked} className="disabled:bg-slate-100 disabled:text-slate-600" onChange={v => { if (v != null && v < 0) setNeg(qtyFr(v)); else { setNeg(''); set({ qty: v }); } }} aria-label="Quantité commandée" />
              {neg && <span role="status" className="block text-xs font-semibold text-red-700">Une quantité n'est pas négative&#8239;: «&#8239;{neg} » n'est pas enregistré.</span>}
            </>
          </Field>
          <Field label="Date de livraison promise" hint={late > 0 ? `Date promise dépassée de ${plural(late, 'jour')}, aucune livraison enregistrée.` : !d.promisedAt && promised ? `Vide\u202f: la date promise du devis, le ${rcDay(promised)}, est lue.` : undefined}>
            <input type="date" className={ic} value={d.promisedAt ?? ''} disabled={idLocked} onChange={e => set({ promisedAt: e.target.value || undefined })} />
          </Field>
          {moved && (
            <p role="status" className="flex flex-wrap items-center gap-2 text-xs text-slate-700 sm:col-span-2">
              <span className="min-w-[12rem] flex-1">{sentence(`La date promise du devis est maintenant le ${rcDay(quoteDay)} ; la commande garde le ${rcDay(d.promisedAt!)}`)}</span>
              {!idLocked && <Button className="!py-1" onClick={() => set({ promisedAt: quoteDay })}>Reprendre la date du devis</Button>}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SubTitle>Personnes de la commande</SubTitle>
        <p className="text-xs text-slate-600">{team.length ? 'Ces personnes sont proposées au contrôle des jalons, à la libération et à la réception.' : "Aucune personne désignée\u202f: toutes les personnes actives de l'outil 4.2 sont proposées."}</p>
        {locked   // a signed PV keeps its people as a fact, not as switched-off buttons
          ? team.length > 0 && <ul aria-label="Personnes de la commande" className="m-0 flex list-none flex-wrap gap-2 p-0">{team.map(n => <li key={n} className="rounded-full border border-slate-400 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-900">{n}</li>)}</ul>
          : <div role="group" aria-label="Personnes de la commande" className="flex flex-wrap gap-2">
            {[...everyone, ...extra].map(n => {
              const on = team.includes(n), away = pool.absent.includes(n);
              return <button key={n} type="button" aria-pressed={on} onClick={() => toggle(n)} className={`${big(on)} min-w-[7rem] flex-col sm:flex-row`}>{n}{away && <span className="ml-1 text-xs font-semibold opacity-80">absent ce jour</span>}</button>;
            })}
            <button type="button" aria-expanded={other !== null} onClick={() => setOther(other === null ? '' : null)} className={`${big(other !== null)} min-w-[7rem]`}>Autre, précisez</button>
          </div>}
        {other !== null && (
          <div className="flex max-w-md gap-2">
            <input className={ic} value={other} autoFocus placeholder="Nom de la personne" aria-label="Autre personne : nom" onChange={e => setOther(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOther(); } }} />
            <Button className={OFF} onClick={addOther} disabled={!other.trim()}>Ajouter</Button>
          </div>
        )}
      </section>


      {/* a short sheet at first: the quote it comes from and the traceability are behind "Plus de détails" (open when one is written) */}
      <details open={more0.current} className="rounded-xl border border-slate-200">
        <summary className="flex min-h-[44px] cursor-pointer items-center px-3 text-xs font-bold text-slate-900">Plus de détails (devis d'origine, traçabilité)</summary>
        <div className="space-y-4 border-t border-slate-200 p-3">
          <div className="max-w-md">
            <Field label="Devis d'origine (outil 2.1)" hint={quote ? sentence(`Devis ${quote.ref}${quote.decidedAt ? `, décision le ${rcDay(quote.decidedAt.slice(0, 10))}` : ''}${quote.weeks ? `, délai de ${plural(quote.weeks, 'semaine')}` : ''}`) : 'Reprend le client, l\'objet et la date promise du devis gagné.'}>
            <select className={ic} value={d.quoteId ?? ''} disabled={idLocked} onChange={e => pickQuote(e.target.value)}>
              <option value="">Aucun devis</option>
              {d.quoteId && !won.some(q => q.id === d.quoteId) && <option value={d.quoteId}>{quote ? `${quote.ref} · ${quote.client}` : 'Devis supprimé'}</option>}
              {won.map(q => <option key={q.id} value={q.id}>{q.ref} · {q.client}</option>)}
            </select>
            </Field>
          </div>
          <section className="space-y-3">
        <SubTitle>Traçabilité</SubTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Numéro de lot"><input className={`${ic} font-mono`} value={d.lot ?? ''} disabled={idLocked} onChange={e => set({ lot: e.target.value || undefined })} /></Field>
          <Field label="Numéro de série"><input className={`${ic} font-mono`} value={d.serial ?? ''} disabled={idLocked} onChange={e => set({ serial: e.target.value || undefined })} /></Field>
          <Field label="Matière ou version"><input className={ic} value={d.material ?? ''} disabled={idLocked} onChange={e => set({ material: e.target.value || undefined })} /></Field>
        </div>
          </section>
        </div>
      </details>

      <section className="space-y-2">
        <SubTitle>Modèle de jalons</SubTitle>
        <div className="max-w-md space-y-3">
          <Field label="Modèle" hint={frozen ? 'Le modèle ne se change plus une fois la commande libérée, livrée ou son PV signé.' : `Les jalons se modifient dans l'onglet Jalons\u202f; les modèles se règlent dans les réglages de l'outil.`}>
            <select className={ic} value={known ? d.template : free ? OTHER : ''} disabled={frozen} onChange={e => choose(e.target.value)}>
              <option value="">Modèle non précisé</option>
              {tpls.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              <option value={OTHER}>Autre, précisez</option>
            </select>
          </Field>
          {free && (
            <Field label="Précisez" hint={spec.trim() ? undefined : "Autre modèle\u202f: le nom n'est pas encore écrit."}>
              <input className={ic} value={spec} disabled={locked} autoComplete="off" onChange={e => set({ template: e.target.value || OTHER })} />
            </Field>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <SubTitle>QR code de la commande</SubTitle>
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-slate-200 p-2"><Qr text={url} size={112} label={`QR code de la commande ${d.ref || ''}`.trim()} /></div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs text-slate-600">Imprimé sur la fiche suiveuse, il ouvre le contrôle des jalons en grand écran, sur un téléphone ou une tablette.</p>
            <p className="break-all font-mono text-xs text-slate-600">{url}</p>
            {!saved && <p className="text-xs text-slate-600">La commande n'est pas encore enregistrée&#8239;: le QR code ne mène à rien tant qu'elle n'a ni numéro, ni client, ni livrable.</p>}
            {isLocalAddress() && <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-950">Cette adresse ne marche que sur cet ordinateur&#8239;: une fois l'application en ligne, le QR code s'ouvrira sur n'importe quel téléphone, sur une fiche imprimée à ce moment-là.</p>}
            {print && <Button onClick={print}><Printer size={14} aria-hidden />Imprimer la fiche suiveuse</Button>}
          </div>
        </div>
      </section>

      {swap && (
        <Modal onClose={() => setSwap(null)} title="Changer le modèle de jalons&#8239;?"
          footer={<><Button onClick={() => setSwap(null)}>Annuler</Button><Button kind="primary" onClick={() => { const t = swap; setSwap(null); act((x, by) => swapModel(x, t, checked, by)); }}>Remplacer les jalons</Button></>}>
          <p className="text-xs text-slate-700">{d.milestones.length === 1 ? 'Le jalon actuel est remplacé' : `Les ${d.milestones.length} jalons actuels sont remplacés`} par ceux du modèle «&#8239;{swap.name} ». Le résultat, les photos et l'historique de {plural(checked, 'jalon contrôlé', 'jalons contrôlés')} sont perdus&#8239;; le journal garde la trace du changement.</p>
        </Modal>
      )}
      {fix && (
        <Correct who={who} title="Corriger la commande" subtitle="Chaque correction s'inscrit au journal&#8239;: qui, quand, pourquoi, ancienne et nouvelle valeur&#8239;; un nouveau scellé est posé" holdKey="fix-order" hold={hold} people={pool}
          was={{ client: d.client, ref: d.ref, item: d.item, qty: d.qty, promisedAt: d.promisedAt ?? '', lot: d.lot ?? '', serial: d.serial ?? '', material: d.material ?? '' }}
          fields={ORDER_FIELDS} onClose={() => setFix(false)}
          onSave={(patch, why, who) => {
            const o = typeof patch.client === 'string' ? orgs.find(x => norm(x.name) === norm(String(patch.client))) : undefined;
            const order = { ...patch, ...(patch.client !== undefined ? { orgId: o?.id ?? '', ...(o?.id === d.orgId ? {} : { contactId: '' }) } : {}) };
            return applied(act, x => correctLocked(x, { order, _why: why } as never, who, nowLocal()));
          }} />
      )}
      {bar}
    </div>
  );
}

const ORDER_FIELDS: CorrectField[] = [
  { k: 'ref', label: 'Numéro de commande', mono: true }, { k: 'client', label: 'Client', list: 'rc-clients' }, { k: 'item', label: 'Livrable' }, { k: 'qty', label: 'Quantité commandée', type: 'num' },
  { k: 'promisedAt', label: 'Date de livraison promise', type: 'date' }, { k: 'lot', label: 'Numéro de lot', mono: true }, { k: 'serial', label: 'Numéro de série', mono: true }, { k: 'material', label: 'Matière ou version' },
];
