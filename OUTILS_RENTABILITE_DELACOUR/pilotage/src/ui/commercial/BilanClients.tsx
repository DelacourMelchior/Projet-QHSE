// Tool 2.4, view by customer: every customer with its satisfaction (reviews, share satisfied, average note, points still to settle),
// and the sheet of one customer: its figures, its chart, its reviews, what the directory (1.3) holds for it and what the other tools hold.
import { useState } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import type { Feedback } from '../../domain/types';
import { detailsOf, FEEDBACK_STATE, feedbackState, satisfactionTargetOf } from '../../domain/commercial';
import { addClientToDirectory, clientReceptions, clientRecords, clientSummaries, clientSummary, directoryOfClient, peopleToAdd, receptionsLabel, sameClient, sortClients, type ClientSort } from '../../domain/clients';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, inputCls, Modal, NewTab, Row, StatusBadge, SubTitle, Tile } from '../common';
import { toolUrl, type Nav } from '../tools';
import { FeedbackTrend } from './FeedbackTrend';

const fr = (n: number) => String(n).replace('.', ',');
const answer = (v: boolean | null) => (v === null ? '?' : v ? 'oui' : 'non');
const out = 'inline-flex items-center gap-1 font-semibold text-delacour-primary underline';

// An address someone typed ends up in a mailto: link: a "?" or "&" in it would add a header (a hidden copy to another address), a comma a second recipient.
// Only one plain address goes through ('' otherwise); shared with 2.3 and the review sheet of 2.4.
export const plainEmail = (v?: string): string => { const a = (v || '').trim(); return /^[^\s@?&,;<>"#]+@[^\s@?&,;<>"#]+$/.test(a) ? a : ''; };
export const mailtoOf = (to: string | undefined, query = ''): string => `mailto:${encodeURIComponent(plainEmail(to)).replace(/%40/g, '@')}${query}`;
export const BAD_EMAIL = "Adresse e-mail non valide (x@y, sans espace, virgule, « ? » ni « & ») : aucun lien.";

export function ClientList({ onOpen }: { onOpen(name: string): void }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [by, setBy] = useState<ClientSort>('watch');
  if (!state) return null;
  const target = satisfactionTargetOf(state.params);
  const shown = sortClients(clientSummaries(state).filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase())), by);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className={`${inputCls} pl-8`} placeholder="Chercher un client" aria-label="Chercher un client" value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <select className={`${inputCls} !w-auto`} aria-label="Trier les clients" value={by} onChange={e => setBy(e.target.value as ClientSort)}>
          <option value="watch">À surveiller d'abord</option><option value="name">Par nom</option>
        </select>
      </div>
      {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{q ? 'Aucun client pour cette recherche.' : 'Aucun client : saisissez un bilan.'}</p> : (
        <ul className="divide-y divide-slate-100">
          {shown.map(c => {
            const dir = directoryOfClient(state, c.name, c.orgId);
            return (
              <Row key={c.key} onClick={() => onOpen(c.name)} title={c.name}
                sub={`${c.count} bilan(s)${c.avg !== null ? ` · note moyenne ${fr(c.avg)}` : ''} · dernier bilan le ${frDate(c.last)} · ${dir.org || dir.contacts.length ? 'dans l\'annuaire' : 'pas dans l\'annuaire'}`}
                right={<><span className="block font-semibold text-slate-800">{c.satisfiedPct === null ? '—' : `${c.satisfiedPct} %`}</span>satisfaits</>}
                badge={c.open ? <StatusBadge level="alert" text={`${c.open} à traiter`} /> : c.satisfiedPct === null ? <StatusBadge level="pending" text="Sans réponse" /> : <StatusBadge level={c.satisfiedPct >= target ? 'ok' : 'warn'} text={c.satisfiedPct >= target ? 'Objectif atteint' : `Sous l'objectif (${target} %)`} />} />
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ClientSheet({ name, onClose, onOpenFeedback, onNew, nav }: { name: string; onClose(): void; onOpenFeedback(f: Feedback): void; onNew(name: string): void; nav: Nav }) {
  const { state, update } = useStore();
  if (!state) return null;
  const sum = clientSummary(name, Object.values(state.feedbacks).filter(f => sameClient(f.client, name)), state);
  const dir = directoryOfClient(state, name, sum.orgId), rec = clientRecords(state, name, sum.orgId), toAdd = peopleToAdd(state, name, [], sum.orgId), target = satisfactionTargetOf(state.params);
  const inDirectory = !!dir.org || dir.contacts.length > 0;
  const add = () => update(d => { addClientToDirectory(d, name, [], sum.orgId); });
  return (
    <Modal wide onClose={onClose} title={`Client · ${name}`}
      subtitle={`${sum.count} bilan(s)${sum.satisfiedPct !== null ? ` · ${sum.satisfiedPct} % satisfaits` : ''}${sum.avg !== null ? ` · note moyenne ${fr(sum.avg)} / 10` : ''}`}
      footer={<><Button onClick={onClose}>Fermer</Button><Button kind="primary" onClick={() => onNew(name)}><Plus size={14} />Nouveau bilan</Button></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile title="Bilans" value={String(sum.count)} sub={`${sum.answers} complet(s)`} />
          <Tile title="Satisfaits" value={sum.satisfiedPct === null ? '—' : `${sum.satisfiedPct} %`} sub={`objectif ${target} %`} tone={sum.satisfiedPct === null ? undefined : sum.satisfiedPct >= target ? 'ok' : 'warn'} />
          <Tile title="Note moyenne" value={sum.avg === null ? '—' : `${fr(sum.avg)} / 10`} sub={sum.lastScore === null ? 'pas de note' : `dernière note : ${sum.lastScore}`} />
          <Tile title="Insatisfactions réglées" value={sum.unhappy ? `${sum.settled} / ${sum.unhappy}` : '—'} sub={sum.unhappy ? (sum.open ? `${sum.open} à traiter` : 'tout est réglé') : 'aucun mécontent'} tone={sum.unhappy ? (sum.open ? 'warn' : 'ok') : undefined} />
        </div>

        {sum.answers > 0 && <div className="rounded-lg border border-slate-200 p-3"><FeedbackTrend client={name} compact /></div>}

        <section className="space-y-1">
          <SubTitle>Ses bilans</SubTitle>
          <ul className="divide-y divide-slate-100">
            {sum.feedbacks.map(f => {
              const st = feedbackState(f, state);
              return (
                <Row key={f.id} onClick={() => onOpenFeedback(f)} title={f.affaire || 'Bilan'}
                  sub={(st === 'unhappy' || st === 'settled') && detailsOf(f, state.params).length ? `${st === 'unhappy' ? 'À régler' : 'Réglé'} : ${detailsOf(f, state.params).join(' ; ')}` : `Cahier des charges : ${answer(f.q1)} · délai : ${answer(f.q2)} · satisfaction : ${f.q3 ?? '?'}/10${f.verbatim ? ` · « ${f.verbatim} »` : ''}`}
                  right={<><span className="block font-semibold text-slate-800">{f.contact}</span>terminé le {frDate(f.date)}</>}
                  badge={<StatusBadge level={FEEDBACK_STATE[st].tone} text={FEEDBACK_STATE[st].label} />} />
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <SubTitle>Annuaire (1.3)</SubTitle>
          {inDirectory ? (
            <>
              {dir.org && <p className="text-[11px] text-slate-700"><strong>{dir.org.name}</strong>{dir.org.phone ? ` · standard ${dir.org.phone}` : ''}{dir.org.address ? ` · ${dir.org.address}` : ''}{dir.org.reference ? ` · ${dir.org.reference}` : ''}</p>}
              {dir.contacts.length > 0 && (
                <ul className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {dir.contacts.map(c => (
                    <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 py-1">
                      <strong className="text-xs text-slate-900">{c.name || 'Sans nom'}</strong>{c.role && <span>{c.role}</span>}
                      {c.phone && <a className={out} href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>}
                      {c.email && (plainEmail(c.email) ? <a className={out} href={mailtoOf(c.email)}>{c.email}</a> : <span className="font-semibold text-amber-800">{c.email} : {BAD_EMAIL}</span>)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Button className="!px-2 !py-1" onClick={() => nav.open('1.3', dir.contacts[0]?.id || `org:${dir.org?.name || name}`)}>Ouvrir dans l'annuaire<NewTab /></Button>
                {toAdd.length > 0 && <Button className="!px-2 !py-1" onClick={add}><UserPlus size={13} />Ajouter {toAdd.length} personne{toAdd.length > 1 ? 's' : ''} interrogée{toAdd.length > 1 ? 's' : ''} ({toAdd.map(p => p.name).join(', ')})</Button>}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              Ce client n'est pas encore dans l'annuaire.
              <Button className="!px-2 !py-1" onClick={add}><UserPlus size={13} />Ajouter à l'annuaire{toAdd.length ? ` (organisation et ${toAdd.length} personne${toAdd.length > 1 ? 's' : ''} interrogée${toAdd.length > 1 ? 's' : ''})` : ''}</Button>
            </div>
          )}
        </section>

        {(rec.quotes.length > 0 || rec.complaints.length > 0 || rec.deliveries.length > 0) && (
          <section className="space-y-1">
            <SubTitle>Dans les autres outils</SubTitle>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {rec.quotes.length > 0 && <a className={out} href={toolUrl('2.1', rec.quotes[0].id)} target="_blank" rel="noopener noreferrer">{rec.quotes.length} devis (2.1)<NewTab size={11} /></a>}
              {rec.complaints.length > 0 && <a className={out} href={toolUrl('2.3', rec.complaints[0].id)} target="_blank" rel="noopener noreferrer">{rec.complaints.length} réclamation{rec.complaints.length > 1 ? 's' : ''} (2.3)<NewTab size={11} /></a>}
              {rec.deliveries.length > 0 && <a className={out} href={toolUrl('3.4', `client:${dir.org?.name || name}`)} target="_blank" rel="noopener noreferrer">{receptionsLabel(clientReceptions(state, name, sum.orgId)) || `${rec.deliveries.length} commande${rec.deliveries.length > 1 ? 's' : ''} (3.4)`}<NewTab size={11} /></a>}
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
}
