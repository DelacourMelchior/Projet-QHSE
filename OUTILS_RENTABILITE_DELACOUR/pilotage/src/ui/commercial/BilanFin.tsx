// Tool 2.4 "Bilan de fin d'affaire": 3 questions to the customer at the end of a job (on the day, or by text or e-mail the next morning)
// to measure his satisfaction and whether he recommends us. A "no" or a low note is detailed and settled with the customer, or becomes a
// complaint (2.3). The tool also lists the deliveries received (3.4) without a review, and draws the satisfaction of the last twelve
// months; the list of reviews is read month by month or by customer (with the directory 1.3 behind each customer). Nothing about
// invoicing or money here.
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Mail, MessageSquare, Plus, Printer, Trash2 } from 'lucide-react';
import type { Delivery, Feedback, FollowUp, Period } from '../../domain/types';
import {
  addSatisfactionKpi, COMPLAINT_STATE, complaintState, deliveriesToAsk, detailsOf, FEEDBACK_STATE, feedbackMail, FOLLOW_UP, followOf, feedbackInsights, feedbackState, feedbackSummary, importFeedbacks,
  feedbackOfDelivery, isClosed, isNegative, isSatisfactionKpi, newComplaint, newFeedback, QUESTIONS, questionsOf, promiseFact, receivedOn, reviewAskMessage, reviewMessage, SATISFACTION_TARGET_DEFAULT, satisfactionTargetOf, setSatisfactionTarget, UNHAPPY_MAX_DEFAULT, unhappyMaxOf, MAIL_BODY_MODEL, MAIL_SUBJECT_MODEL, monthSummary,
} from '../../domain/commercial';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { canAskFeedback, remainingQty } from '../../domain/receptions';
import { businessOf } from '../../domain/base';
import { addClientToDirectory, directoryOfClient, feedbackForClient } from '../../domain/clients';
import { frDate, isoDate, periodLabel } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NewTab, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader, ToolSettings, YesNo } from '../common';
import type { ScreenProps } from '../screens';
import { PasteImport } from '../PasteImport';
import { toolUrl, type Nav } from '../tools';
import { clientsOf } from './Devis';
import { BAD_EMAIL, ClientList, ClientSheet, mailtoOf, plainEmail } from './BilanClients';
import { FeedbackTrend } from './FeedbackTrend';

type Filter = 'todo' | 'done' | 'all';
const answer = (v: boolean | null) => (v === null ? '?' : v ? 'oui' : 'non');
const fr = (n: number) => String(n).replace('.', ',');
const CHANNELS: [Feedback['channel'], string][] = [['site', 'Sur place'], ['sms', 'Par SMS'], ['tel', 'Par téléphone'], ['mail', 'Par e-mail'], ['autre', 'Autre']];
const monthOf = (f: Feedback): Period => f.date.slice(0, 7);

export function BilanFin({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Feedback | null>(null);
  const [filter, setFilter] = useState<Filter>('todo');
  const [month, setMonth] = useState<Period | 'all'>('all');
  const [view, setView] = useState<'month' | 'client'>('month');
  const [client, setClient] = useState<string | null>(null);   // the customer whose sheet is open
  const listRef = useRef<HTMLSpanElement>(null);
  // one review per order: the one that exists is opened, a new one is written only when there is none
  const create = (d: Delivery) => { const out: { f?: Feedback } = {}; update(x => { const r = feedbackOfDelivery(x, d); if (r.isNew) x.feedbacks[r.f.id] = r.f; out.f = r.f; }); if (out.f) setOpen(out.f); };   // read on the current state: a second device's review is the one opened
  // the focus is a review, or a delivery received without one (task "3 questions à…"): the review is created from it, an order not received yet gets none
  useEffect(() => {
    if (!focus || !state) return;
    if (focus.startsWith('client:')) { setView('client'); setClient(focus.slice(7)); clearFocus(); }   // from the directory
    else if (Object.hasOwn(state.feedbacks, focus)) { setOpen(state.feedbacks[focus]); clearFocus(); }
    else if (Object.hasOwn(state.deliveries, focus)) { const d = state.deliveries[focus]; if (!feedbackOfDelivery(state, d).isNew || canAskFeedback(d)) create(d); clearFocus(); }
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const all = Object.values(state.feedbacks).sort((a, b) => (a.date < b.date ? 1 : -1)).map(f => ({ f, st: feedbackState(f, state) }));
  const toAsk = deliveriesToAsk(state);
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Bilan de fin d'affaire : 3 questions pour mesurer la satisfaction" text="Le jour de la livraison, ou par SMS ou e-mail le lendemain à 9 h : 3 questions en 45 secondes. Un « non » se précise et se règle avec le client dans la journée. Le résultat alimente le tableau de pilotage.">
          <Button kind="primary" onClick={() => setOpen(newFeedback())}><Plus size={14} />Nouveau bilan</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        <ToAsk list={toAsk} onCreate={create} />
        <ReviewSettings />
        {open && <FeedbackSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const s = feedbackSummary(state);
  const todo = all.filter(x => x.st === 'to_ask' || x.st === 'unhappy');
  const shown = filter === 'todo' ? todo : filter === 'done' ? all.filter(x => x.st === 'settled' || x.st === 'satisfied') : all;
  const hasKpi = Object.values(state.kpis).some(isSatisfactionKpi);
  // the list month by month: the months that have reviews (newest first), a month picked on the chart or in the selector
  const months = [...new Set(all.map(x => monthOf(x.f)))];
  const opts = month !== 'all' && !months.includes(month) ? [month, ...months].sort().reverse() : months;
  const at = month === 'all' ? -1 : opts.indexOf(month);
  const groups = (month === 'all' ? months : [month]).map(m => ({ m, rows: shown.filter(x => monthOf(x.f) === m), sum: monthSummary(all.filter(x => monthOf(x.f) === m).map(x => x.f), state.params) })).filter(g => g.rows.length);
  const pick = (m: Period) => { setView('month'); setMonth(m); setFilter('all'); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const pending = s.toAsk + s.noReview;
  const target = satisfactionTargetOf(state.params), max = unhappyMaxOf(state.params);
  return (
    <div className="space-y-4">
      <Summary title="Les clients sont-ils satisfaits à la livraison ?" insights={feedbackInsights(state)} tiles={<>
        <Tile title="Bilans sur 12 mois" value={String(s.count)} sub={pending ? `${pending} questionnaire(s) à poser` : 'tous les bilans sont complets'} tone={pending ? 'warn' : undefined} />
        <Tile title="Satisfaits" value={s.satisfiedPct === null ? '—' : `${s.satisfiedPct} %`} sub={s.satisfiedPct === null ? `objectif : ${target} % ou plus` : `objectif ${target} % · ${s.unhappy} mécontent(s) (« non » ou note de ${max} ou moins)`} tone={s.satisfiedPct === null ? undefined : s.satisfiedPct >= target ? 'ok' : 'warn'} />
        <Tile title="Note de satisfaction" value={s.avgScore === null ? '—' : `${fr(s.avgScore)} / 10`}
          sub={s.avgScore === null ? 'pas encore de note' : `${s.answers} réponse(s) · 9-10 : ${s.mix.top}${max < 8 ? ` · ${max + 1}-8 : ${s.mix.mid}` : ''} · 0-${max} : ${s.mix.low}`}
          tone={s.avgScore === null ? undefined : s.avgScore >= 8 ? 'ok' : s.avgScore < 7 ? 'warn' : undefined} />
        <Tile title="Insatisfactions réglées" value={s.unhappy ? `${s.settled} / ${s.unhappy}` : '—'}
          sub={s.unhappy ? (s.open ? `${s.open} à traiter avec le client` : 'tous les points sont réglés') : 'aucun client mécontent'} tone={s.unhappy ? (s.open ? 'warn' : 'ok') : undefined} />
      </>} />
      <ToAsk list={toAsk} onCreate={create} />
      <Card className="space-y-3 p-3 sm:p-4">
        <FeedbackTrend selected={month} onPick={pick} />
        <p className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-600">
          {hasKpi
            ? 'Le chiffre du mois (clients satisfaits) est proposé à la saisie du tableau de pilotage (1.1).'
            : <>Suivre ce chiffre chaque mois dans le tableau de pilotage (1.1) : <Button className="!px-2 !py-1" onClick={() => update(d => { addSatisfactionKpi(d, target); })}>Ajouter l'indicateur</Button></>}
        </p>
      </Card>
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Bilans de fin d'affaire" text="Un bilan par livraison ou réception. Pas de questionnaire de 15 questions : 3 suffisent.">
          <Button kind="primary" onClick={() => setOpen(newFeedback())}><Plus size={14} />Nouveau bilan</Button>
          <PasteImport title="Importer des réponses (export Microsoft Forms ou Excel)" label="Importer des réponses"
            cols={[{ key: 'client', label: 'Client', aliases: ['societe', 'entreprise'] }, { key: 'contact', label: 'Nom', aliases: ['contact', 'repondant'] }, { key: 'date', label: 'Date', aliases: ['livre le', 'date de livraison', 'horodateur'] }, { key: 'q1', label: 'Q1', aliases: ['cahier des charges', 'conforme'] }, { key: 'q2', label: 'Q2', aliases: ['delai', 'livraison'] }, { key: 'q3', label: 'Q3', aliases: ['satisfaction', 'note', 'recommand'] }, { key: 'verbatim', label: 'Commentaire', aliases: ['remarque', 'avis'] }]}
            check={rows => { const { added, duplicates } = importFeedbacks(rows, Object.values(state.feedbacks)); return duplicates ? `${duplicates} ligne(s) déjà dans le registre (même client, même date, mêmes réponses) : ${added.length ? 'elles seront ignorées' : 'rien de nouveau à importer'}.` : ''; }}
            onImport={rows => { const { added } = importFeedbacks(rows, Object.values(state.feedbacks)); update(d => { added.forEach(f => { d.feedbacks[f.id] = f; }); }); return added.length; }} />
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <span ref={listRef} role="group" aria-label="Présentation de la liste" className="flex w-fit scroll-mt-16 overflow-hidden rounded-full border border-slate-300 text-[11px] font-semibold">
          {([['month', 'Par mois'], ['client', 'Par client']] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={`px-3 py-1 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${view === k ? 'bg-delacour-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{l}</button>
          ))}
        </span>
        {view === 'client' ? <ClientList onOpen={setClient} /> : <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chips value={filter} onChange={setFilter} items={[['todo', 'À traiter', todo.length], ['done', 'Terminés', all.length - todo.length], ['all', 'Tous', all.length]]} />
          <span className="flex items-center gap-1" role="group" aria-label="Mois affiché">
            <Button kind="ghost" className="!px-1.5" aria-label="Mois plus ancien" disabled={at < 0 || at >= opts.length - 1} onClick={() => setMonth(opts[at + 1])}><ChevronLeft size={14} /></Button>
            <select className={`${inputCls} !w-auto`} aria-label="Choisir un mois" value={month} onChange={e => setMonth(e.target.value as Period | 'all')}>
              <option value="all">Tous les mois ({all.length})</option>
              {opts.map(m => <option key={m} value={m}>{periodLabel(m)} ({all.filter(x => monthOf(x.f) === m).length})</option>)}
            </select>
            <Button kind="ghost" className="!px-1.5" aria-label="Mois plus récent" disabled={at <= 0} onClick={() => setMonth(opts[at - 1])}><ChevronRight size={14} /></Button>
          </span>
        </div>
        {groups.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{month === 'all' ? 'Aucun bilan dans ce filtre.' : `Aucun bilan dans ce filtre pour ${periodLabel(month).toLowerCase()}.`}</p> : groups.map(g => (
          <div key={g.m}>
            <h4 className="mt-1 flex flex-wrap items-baseline gap-x-2 border-b border-slate-200 pb-1 text-xs font-bold text-slate-900">{periodLabel(g.m)}
              <span className="text-[11px] font-normal text-slate-500">{g.sum.count} bilan(s){g.sum.satisfiedPct !== null ? ` · ${g.sum.satisfiedPct} % satisfaits` : ''}{g.sum.avg !== null ? ` · note moyenne ${fr(g.sum.avg)}` : ''}</span></h4>
            <ul className="divide-y divide-slate-100">
              {g.rows.map(({ f, st }) => (
                <Row key={f.id} onClick={() => setOpen(f)}
                  title={`${f.client || 'Client à saisir'}${f.affaire ? ` · ${f.affaire}` : ''}`}
                  sub={(st === 'unhappy' || st === 'settled') && detailsOf(f, state.params).length ? `${st === 'unhappy' ? 'À régler' : 'Réglé'} : ${detailsOf(f, state.params).join(' ; ')}` : `Cahier des charges : ${answer(f.q1)} · délai : ${answer(f.q2)} · satisfaction : ${f.q3 ?? '?'}/10${f.verbatim ? ` · « ${f.verbatim} »` : ''}`}
                  right={<><span className="block font-semibold text-slate-800">{f.contact}</span>terminé le {frDate(f.date)}</>}
                  badge={<StatusBadge level={FEEDBACK_STATE[st].tone} text={FEEDBACK_STATE[st].label} />} />
              ))}
            </ul>
          </div>
        ))}
        </>}
      </Card>
      <ReviewSettings />
      <Method rule="Prendre l'avis du client à la fin de chaque affaire permet de corriger tout de suite ce qui ne va pas, et de mesurer sa satisfaction."
        steps={[['Poser les 3 questions', 'Le jour même par la personne qui livre ou pose, ou par SMS ou e-mail le lendemain matin.'], ['Régler ce qui n\'allait pas', 'Un « non » ou une note basse : noter ce qui n\'allait pas et le régler avec le client dans la journée. Sinon, une réclamation.'], ['Suivre la satisfaction', 'Le chiffre du mois alimente le tableau de pilotage ; la courbe montre si les clients sont de plus en plus satisfaits.']]}
        tips={['Note de 9 ou 10 : demander tout de suite un avis, une mise en relation ou un témoignage.']} />
      {client && <ClientSheet name={client} nav={nav} onClose={() => setClient(null)} onOpenFeedback={f => { setClient(null); setOpen(f); }} onNew={name => { const f = feedbackForClient(state, name); setClient(null); setOpen(f); }} />}
      {open && <FeedbackSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

// Deliveries received (3.4) in the last two weeks without a review: the order opens in a new tab, one click creates the review, pre-filled
function ToAsk({ list, onCreate }: { list: Delivery[]; onCreate(d: Delivery): void }) {
  if (!list.length) return null;
  return (
    <Card className="space-y-2 border-amber-200 p-3 sm:p-4">
      <h3 className="text-xs font-bold text-slate-900">Livraisons sans bilan</h3>
      <p className="text-[11px] text-slate-600">Reçues ces 14 derniers jours sans que les 3 questions aient été posées.</p>
      <ul className="divide-y divide-slate-100">
        {list.map(d => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <span className="text-xs text-slate-800"><strong>{d.client || 'Client à saisir'}</strong>
              {' · '}<a href={toolUrl('3.4', d.id)} target="_blank" rel="noopener noreferrer" title="Ouvrir la commande dans un nouvel onglet" className="inline-flex items-center gap-1 font-semibold text-delacour-primary underline">{d.ref || d.item || 'commande'}<NewTab size={11} /></a>
              {d.ref && d.item ? <span className="text-slate-500"> · {d.item}</span> : null} <span className="text-slate-500">· reçue le {frDate(receivedOn(d))}{(remainingQty(d) ?? 0) > 0 ? `, en partie (${remainingQty(d)} à livrer)` : ''}</span></span>
            <Button className="!px-2 !py-1" onClick={() => onCreate(d)}><Plus size={13} />Créer le bilan</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Aim of the company, from which note a customer is unhappy, online review page, wording of the 3 questions, e-mail model: filled once
function ReviewSettings() {
  const { state, update } = useStore();
  if (!state) return null;
  const p = state.params;
  return (
    <ToolSettings>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objectif : part de clients satisfaits à atteindre (%)" hint={`Repris dans le résumé en haut de l'outil et comme cible de l'indicateur du tableau de pilotage (1.1). ${SATISFACTION_TARGET_DEFAULT} % par défaut.`}>
          <NumInput min={1} max={100} value={satisfactionTargetOf(p)} onChange={v => update(d => { setSatisfactionTarget(d, v); })} />
        </Field>
        <Field label="Client mécontent à partir d'une note de" hint={`Une note de ce niveau ou moins, ou une réponse « non », compte comme un client mécontent : à régler avec lui, ou à enregistrer comme réclamation (${UNHAPPY_MAX_DEFAULT} par défaut).`}>
          <NumInput min={0} max={9} value={unhappyMaxOf(p)} onChange={v => update(d => { d.params.unhappyMax = v === null ? undefined : Math.max(0, Math.min(9, Math.round(v))); })} />
        </Field>
      </div>
      <Field label="Page d'avis en ligne (Google…)" hint="Proposée aux clients très satisfaits (note de 9 ou 10)."><input className={inputCls} value={p.reviewLink || ''} onChange={e => update(d => { d.params.reviewLink = e.target.value; })} /></Field>
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold text-slate-700">Les 3 questions du bilan de fin d'affaire (vide = questions d'origine)</span>
        {[0, 1, 2].map(i => <input key={i} className={inputCls} value={p.questions?.[i] || ''} placeholder={QUESTIONS[i]} aria-label={`Question ${i + 1}`} onChange={e => update(d => { const q = [...(d.params.questions || ['', '', ''])]; q[i] = e.target.value; d.params.questions = q; })} />)}
      </div>
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold text-slate-700">E-mail envoyé au client pour poser les 3 questions (vide = texte d'origine)</span>
        <input className={inputCls} value={p.mailSubject || ''} placeholder={MAIL_SUBJECT_MODEL} aria-label="Objet du mail" onChange={e => update(d => { d.params.mailSubject = e.target.value; })} />
        <textarea className={`${inputCls} min-h-[150px] font-sans`} value={p.mailBody || ''} placeholder={MAIL_BODY_MODEL} aria-label="Texte du mail" onChange={e => update(d => { d.params.mailBody = e.target.value; })} />
        <p className="text-[11px] text-slate-500">À placer dans le texte : {'{contact}'} {'{affaire}'} {'{entreprise}'} {'{questions}'} (les 3 questions ci-dessus).</p>
        {(p.mailSubject || p.mailBody) && <Button className="!px-2 !py-1" onClick={() => update(d => { delete d.params.mailSubject; delete d.params.mailBody; })}>Revenir au texte d'origine</Button>}
      </div>
    </ToolSettings>
  );
}

export function FeedbackSheet({ initial, onClose, nav }: { initial: Feedback; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [f, setF] = useState<Feedback>(() => structuredClone(initial));
  const [error, setError] = useState('');
  const saved = useRef(initial);   // what is written: the sheet stays open after a button to another tool wrote the review, closing must not warn about it
  if (!state) return null;
  const isNew = !state.feedbacks[f.id];
  const set = (x: Partial<Feedback>) => setF(y => ({ ...y, ...x }));
  const st = feedbackState(f, state);
  const msg = reviewMessage(f, state.settings.companyName, state.params);
  const today = isoDate(new Date());
  const cp = f.complaintId ? state.complaints[f.complaintId] : undefined;
  const follow = followOf(f);
  const dir = directoryOfClient(state, f.client, f.orgId);
  const needsFix = isNegative(f, state.params) || !!f.doubt.trim() || !!f.doubtSolvedAt;
  const mail = feedbackMail(f, state.settings.companyName, state.params);
  const mailBad = !!mail.to && !plainEmail(mail.to);   // an address that is not a single plain one gets no link (2.3 and the customer list share the check)
  const valid = () => { if (!f.client.trim()) { setError('Indiquez le client.'); return false; } setError(''); return true; };
  const close = () => { if (JSON.stringify(f) === JSON.stringify(saved.current) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.feedbacks[f.id] = f; }); onClose(); } };
  const remove = () => { if (window.confirm('Supprimer ce bilan ?')) { update(d => { delete d.feedbacks[f.id]; }); onClose(); } };
  const complain = () => {
    if (!valid()) return;
    if (cp) { update(d => { d.feedbacks[f.id] = f; }); saved.current = f; nav.open('2.3', cp.id); return; }
    const reasons = [f.q1 === false ? `livrable non conforme au cahier des charges${f.q1Detail?.trim() ? ` (${f.q1Detail.trim()})` : ''}` : '', f.q2 === false ? `délai non respecté${f.q2Detail?.trim() ? ` (${f.q2Detail.trim()})` : ''}` : '', f.q3Detail?.trim() || '', f.verbatim].filter(Boolean).join(' ; ');
    const c = { ...newComplaint(state, author), client: f.client, affaire: f.affaire, description: reasons || 'Insatisfaction au bilan de fin d\'affaire', channel: (f.channel === 'site' ? 'site' : f.channel === 'mail' ? 'mail' : f.channel === 'autre' ? '' : 'tel') as 'site' | 'mail' | 'tel' | '' };
    update(d => { d.feedbacks[f.id] = { ...f, complaintId: c.id }; d.complaints[c.id] = c; });
    set({ complaintId: c.id }); saved.current = { ...f, complaintId: c.id };   // the sheet stays open: it must know the complaint, or a second click makes another one and "Enregistrer" erases the link
    nav.open('2.3', c.id);
  };

  return (
    <Modal wide onClose={close} title={isNew ? "Nouveau bilan de fin d'affaire" : `Bilan · ${f.client}`}
      subtitle={<StatusBadge level={FEEDBACK_STATE[st].tone} text={FEEDBACK_STATE[st].label} />}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. La livraison</SubTitle>
          {f.deliveryId && state.deliveries[f.deliveryId] && <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => { update(d => { d.feedbacks[f.id] = f; }); saved.current = f; nav.open('3.4', f.deliveryId); }}>PV de réception {state.deliveries[f.deliveryId].ref} (3.4)<NewTab /></button>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client"><input className={inputCls} value={f.client} list="clients-fb" onChange={e => set({ client: e.target.value })} /></Field>
            <Field label="Affaire"><input className={inputCls} value={f.affaire} onChange={e => set({ affaire: e.target.value })} /></Field>
            <Field label="Personne interrogée" hint={dir.contacts.length ? 'Les personnes de l\'annuaire sont proposées.' : undefined}>
              <input className={inputCls} value={f.contact} list="contacts-fb" onChange={e => { const v = e.target.value, card = dir.contacts.find(c => c.name.trim().toLowerCase() === v.trim().toLowerCase()); set({ contact: v, ...(card?.email && !f.email ? { email: card.email } : {}) }); }} />
            </Field>
            <Field label="Devis d'origine (2.1)">
              <select className={inputCls} value={f.quoteId || ''} onChange={e => set({ quoteId: e.target.value || undefined })}>
                <option value="">Aucun</option>{Object.values(state.quotes).filter(q => q.status === 'won').map(q => <option key={q.id} value={q.id}>{q.ref} · {q.client}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Terminé le"><input type="date" className={inputCls} value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
              <Field label="Questions posées">
                <select className={inputCls} value={f.channel} onChange={e => set({ channel: e.target.value as Feedback['channel'] })}>
                  {CHANNELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
            </div>
            {f.channel === 'autre' && <Field label="Précisez comment"><input className={inputCls} value={f.channelNote || ''} onChange={e => set({ channelNote: e.target.value })} /></Field>}
            {f.channel === 'mail' && <Field label="E-mail du client"><input type="email" className={inputCls} value={f.email || ''} onChange={e => set({ email: e.target.value })} /></Field>}
          </div>
          {f.client.trim() && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
              {dir.org || dir.contacts.length ? <>Annuaire (1.3) : {dir.org?.name || f.client}{dir.org?.phone ? ` · standard ${dir.org.phone}` : ''}
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary underline" onClick={() => { update(d => { d.feedbacks[f.id] = f; }); saved.current = f; nav.open('1.3', dir.contacts[0]?.id || `org:${dir.org?.name || f.client}`); }}>Ouvrir<NewTab /></button></>
                : <>Ce client n'est pas dans l'annuaire (1.3).
                <button type="button" className="font-semibold text-delacour-primary underline" onClick={() => { update(d => { d.feedbacks[f.id] = f; addClientToDirectory(d, f.client); }); onClose(); }}>L'ajouter avec ce bilan</button></>}
            </p>
          )}
          {f.channel === 'mail' && (
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
              <p className="text-[11px] font-semibold text-slate-700">Objet : <span className="font-normal">{mail.subject}</span></p>
              <p className="whitespace-pre-line text-[11px] text-slate-700">{mail.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button className="!px-2 !py-1" onClick={() => navigator.clipboard?.writeText(`${mail.subject}\n\n${mail.body}`).catch(() => setError('Copie impossible : sélectionnez le texte à la main.'))}><Copy size={13} />Copier le mail</Button>
                {mailBad
                  ? <span aria-disabled="true" className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 opacity-50"><Mail size={13} />Ouvrir dans ma messagerie</span>
                  : <a href={mailtoOf(mail.to, `?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Mail size={13} />Ouvrir dans ma messagerie</a>}
              </div>
              {mailBad && <p className="text-[11px] font-semibold text-amber-800">{BAD_EMAIL}</p>}
              <p className="text-[11px] text-slate-500">Texte modifiable une fois pour toutes dans les réglages de cet outil, en bas de l'écran.</p>
            </div>
          )}
          {f.channel !== 'site' && f.channel !== 'mail' && (
            <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
              <p className="text-[11px] text-slate-700">{msg}</p>
              <div className="flex gap-2">
                <Button className="!px-2 !py-1" onClick={() => navigator.clipboard?.writeText(msg).catch(() => setError('Copie impossible : sélectionnez le texte à la main.'))}><Copy size={13} />Copier</Button>
                <a href={`sms:?&body=${encodeURIComponent(msg)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><MessageSquare size={13} />SMS</a>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <SubTitle>2. Les 3 questions</SubTitle>
          <ol className="space-y-2">
            {[0, 1].map(i => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
                <span className="text-xs text-slate-800"><strong>Q{i + 1}.</strong> {questionsOf(state.params)[i]}</span>
                <YesNo label={`Question ${i + 1}`} value={i === 0 ? f.q1 : f.q2} onChange={v => set(i === 0 ? { q1: v } : { q2: v })} />
                {(i === 0 ? f.q1 : f.q2) === false && <input className={`${inputCls} basis-full`} aria-label={`Ce qui n'allait pas à la question ${i + 1}`} placeholder="Qu'est-ce qui n'allait pas ?" value={(i === 0 ? f.q1Detail : f.q2Detail) || ''} onChange={e => set(i === 0 ? { q1Detail: e.target.value } : { q2Detail: e.target.value })} />}
              </li>
            ))}
            <li className="space-y-1.5 rounded-lg border border-slate-200 px-2.5 py-2">
              <span className="text-xs text-slate-800"><strong>Q3.</strong> {questionsOf(state.params)[2]}</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Note de satisfaction">
                {Array.from({ length: 11 }, (_, n) => (
                  <button key={n} type="button" role="radio" aria-checked={f.q3 === n} onClick={() => set({ q3: f.q3 === n ? null : n })}
                    className={`h-7 w-7 rounded-md border font-mono text-[11px] font-bold ${f.q3 === n ? (n >= 9 ? 'border-emerald-700 bg-emerald-600 text-white' : n > unhappyMaxOf(state.params) ? 'border-amber-600 bg-amber-400 text-amber-950' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{n}</button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">0 : très bas · 10 : très haut</p>
              {f.q3 !== null && f.q3 <= unhappyMaxOf(state.params) && <input className={inputCls} aria-label="Pourquoi cette note" placeholder="Pourquoi cette note ?" value={f.q3Detail || ''} onChange={e => set({ q3Detail: e.target.value })} />}
            </li>
          </ol>
          <Field label="Mots du client"><input className={inputCls} value={f.verbatim} onChange={e => set({ verbatim: e.target.value })} /></Field>
          {isNegative(f, state.params) && (st === 'unhappy' || !!cp) && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
              Client insatisfait : régler le point avec lui (ci-dessous) ou, si ce n'est pas réglable sur place,
              <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={complain}>{cp ? `voir la réclamation ${cp.ref}` : 'enregistrer une réclamation (2.3)'}<NewTab /></button>
            </p>
          )}
          {cp && <p className="text-[11px] text-slate-700">Réclamation {cp.ref} : {COMPLAINT_STATE[complaintState(cp, new Date(), businessOf(state.params))].label}. {isClosed(cp) ? 'Elle est clôturée : le point est réglé.' : 'Tant qu\'elle n\'est pas clôturée, le bilan reste à traiter.'}</p>}
          {(f.q3 ?? 0) >= 9 && (
            <div className="space-y-1 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-900">
              <p>{reviewAskMessage(f, state.settings.companyName, state.params.reviewLink)}</p>
              <div className="flex gap-2"><Button className="!px-2 !py-1" onClick={() => { navigator.clipboard?.writeText(reviewAskMessage(f, state.settings.companyName, state.params.reviewLink)).catch(() => undefined); if (!follow) set({ followUp: 'avis', reviewAsked: true }); }}><Copy size={13} />Copier la demande d'avis</Button>{!state.params.reviewLink && <span className="self-center">Lien de votre page d'avis : réglages de cet outil, en bas de l'écran.</span>}</div>
            </div>
          )}
          {(f.q3 ?? 0) >= 9 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Suite demandée à ce client">
                <select className={inputCls} value={follow} onChange={e => { const v = e.target.value as FollowUp | ''; set({ followUp: v || undefined, reviewAsked: v !== '' }); }}>
                  <option value="">Rien pour l'instant</option>{(Object.keys(FOLLOW_UP) as FollowUp[]).map(k => <option key={k} value={k}>{FOLLOW_UP[k]}</option>)}
                </select>
              </Field>
              {follow === 'autre' && <Field label="Précisez"><input className={inputCls} value={f.followNote || ''} onChange={e => set({ followNote: e.target.value })} /></Field>}
            </div>
          )}
        </section>

        {needsFix && (
          <section className="space-y-2">
            <SubTitle>3. Réglé avec le client</SubTitle>
            {f.doubt.trim() && <Field label="Réserve notée avant les précisions par question"><input className={inputCls} value={f.doubt} onChange={e => set({ doubt: e.target.value })} /></Field>}
            <Field label="Point réglé avec le client le" hint="Le jour où ce qui n'allait pas est réglé (corrigé, expliqué, accord du client). Sans réglage, le bilan reste à traiter, ou ouvrir une réclamation.">
              <span className="flex gap-1.5"><input type="date" className={inputCls} value={f.doubtSolvedAt} onChange={e => set({ doubtSolvedAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ doubtSolvedAt: today })}>Aujourd'hui</Button></span>
            </Field>
          </section>
        )}

        {(() => {
          const q = f.quoteId && Object.hasOwn(state.quotes, f.quoteId) ? state.quotes[f.quoteId] : undefined, p = promiseFact(state, f);   // the same reading as the trend and the indicators of 3.4
          if (!q && !p) return null;
          return (
            <section className="space-y-1">
              <SubTitle>Promis et réalisé</SubTitle>
              <p className="text-[11px] text-slate-700">{p ? `Date promise : le ${frDate(p.promised)}` : 'Date promise : non renseignée'}{q?.weeks ? ` (devis : ${q.weeks} ${q.weeks > 1 ? 'semaines' : 'semaine'})` : ''} · {p?.done ? `${f.deliveryId ? 'livraison reçue' : 'terminé'} le ${frDate(p.done)}` : f.deliveryId ? 'livraison pas encore reçue' : 'fin non datée'}{p?.late ? <strong className="text-red-700"> (en retard)</strong> : ''}.</p>
            </section>
          );
        })()}
      </div>
      <datalist id="clients-fb">{clientsOf(state).map(x => <option key={x} value={x} />)}</datalist>
      <datalist id="contacts-fb">{dir.contacts.map(c => <option key={c.id} value={c.name} />)}</datalist>
    </Modal>
  );
}
