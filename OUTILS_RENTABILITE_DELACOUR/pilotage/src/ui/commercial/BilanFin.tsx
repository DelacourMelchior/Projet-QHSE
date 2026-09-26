// Tool 2.4 "Bilan de fin d'affaire": 3 questions to the customer on delivery day (or by text the next morning),
// the small doubt settled the same day, the final invoice sent within 24 h. A dissatisfied answer opens a complaint (2.3).
import { useEffect, useState } from 'react';
import { Copy, MessageSquare, Plus, Printer, Trash2 } from 'lucide-react';
import type { Feedback } from '../../domain/types';
import { FEEDBACK_STATE, feedbackInsights, feedbackState, feedbackSummary, invoiceDelay, isNegative, newComplaint, newFeedback, NPS_MIN, paymentDelay, questionsOf, quoteMargin, reviewAskMessage, reviewMessage } from '../../domain/commercial';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader, YesNo } from '../common';
import type { ScreenProps } from '../screens';
import { addDays } from '../../domain/base';
import { PasteImport } from '../PasteImport';
import type { Nav } from '../tools';
import { clientsOf } from './Devis';

type Filter = 'todo' | 'done' | 'all';
const answer = (v: boolean | null) => (v === null ? '?' : v ? 'oui' : 'non');

export function BilanFin({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Feedback | null>(null);
  const [filter, setFilter] = useState<Filter>('todo');
  useEffect(() => { if (focus && state?.feedbacks[focus]) { setOpen(state.feedbacks[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const all = Object.values(state.feedbacks).sort((a, b) => (a.date < b.date ? 1 : -1)).map(f => ({ f, st: feedbackState(f, state) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Bilan de fin d'affaire : 3 questions, puis la facture" text="Le jour de la livraison, ou par SMS le lendemain à 9 h : 3 questions en 45 secondes. Une petite réserve se règle dans la journée, avant qu'elle ne devienne un motif d'impayé. Puis la facture de solde part sous 24 h.">
          <Button kind="primary" onClick={() => setOpen(newFeedback())}><Plus size={14} />Nouveau bilan</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <FeedbackSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const s = feedbackSummary(state);
  const todo = all.filter(x => x.st !== 'done');
  const shown = filter === 'todo' ? todo : filter === 'done' ? all.filter(x => x.st === 'done') : all;
  return (
    <div className="space-y-4">
      <Summary title="Les clients sont-ils satisfaits à la livraison ?" insights={feedbackInsights(state)} tiles={<>
        <Tile title="Bilans sur 12 mois" value={String(s.count)} sub={`${s.toInvoice} facture(s) de solde à émettre`} tone={s.toInvoice ? 'warn' : undefined} />
        <Tile title="Satisfaits" value={s.satisfiedPct === null ? '—' : `${s.satisfiedPct} %`} sub="oui au cahier des charges et au délai" tone={s.satisfiedPct === null ? undefined : s.satisfiedPct >= 90 ? 'ok' : 'warn'} />
        <Tile title="Recommandation" value={s.nps === null ? '—' : `${s.nps > 0 ? '+' : ''}${s.nps}`} sub={s.nps === null ? `${s.answers} réponse(s) : score affiché à partir de ${NPS_MIN}` : 'notes 9-10 moins notes 0 à 6, en points'} tone={s.nps === null ? undefined : s.nps >= 30 ? 'ok' : s.nps < 0 ? 'alert' : 'warn'} />
        <Tile title="Livraison → facture → paiement" value={s.avgInvoiceDays === null ? '—' : `${Math.round(s.avgInvoiceDays * 10) / 10} j`} sub={s.avgPayDays === null ? 'objectif : facture en 1 jour' : `puis ${Math.round(s.avgPayDays)} j pour être payé`} tone={s.avgInvoiceDays === null ? undefined : s.avgInvoiceDays <= 1 ? 'ok' : 'warn'} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Bilans de fin d'affaire" text="Un bilan par livraison ou réception. Pas de questionnaire de 15 questions : 3 suffisent.">
          <Button kind="primary" onClick={() => setOpen(newFeedback())}><Plus size={14} />Nouveau bilan</Button>
          <PasteImport title="Importer des réponses (export Microsoft Forms ou Excel)" label="Importer des réponses"
            cols={[{ key: 'client', label: 'Client', aliases: ['societe', 'entreprise'] }, { key: 'contact', label: 'Nom', aliases: ['contact', 'repondant'] }, { key: 'q1', label: 'Q1', aliases: ['cahier des charges', 'conforme'] }, { key: 'q2', label: 'Q2', aliases: ['delai', 'livraison'] }, { key: 'q3', label: 'Q3', aliases: ['recommand', 'note'] }, { key: 'verbatim', label: 'Commentaire', aliases: ['remarque', 'avis'] }]}
            onImport={rows => { let n = 0; const yes = (x: string) => (/^(oui|yes|o|1|vrai)/i.test(x.trim()) ? true : /^(non|no|n|0|faux)/i.test(x.trim()) ? false : null); update(d => { rows.filter(r => r.client).forEach(r => { const f = newFeedback(); const q3 = parseInt(r.q3, 10); d.feedbacks[f.id] = { ...f, client: r.client, contact: r.contact, channel: 'mail', q1: yes(r.q1), q2: yes(r.q2), q3: Number.isFinite(q3) ? Math.max(0, Math.min(10, q3)) : null, verbatim: r.verbatim }; n++; }); }); return n; }} />
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['todo', 'À traiter', todo.length], ['done', 'Facturés', all.length - todo.length], ['all', 'Tous', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun bilan dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ f, st }) => (
              <Row key={f.id} onClick={() => setOpen(f)}
                title={`${f.client || 'Client à saisir'}${f.affaire ? ` · ${f.affaire}` : ''}`}
                sub={st === 'doubt' ? `Réserve : ${f.doubt}` : `Cahier des charges : ${answer(f.q1)} · délai : ${answer(f.q2)} · recommandation : ${f.q3 ?? '?'}/10${f.verbatim ? ` · « ${f.verbatim} »` : ''}`}
                right={<><span className="block font-semibold text-slate-800">{f.contact}</span>livré le {frDate(f.date)}</>}
                badge={<StatusBadge level={FEEDBACK_STATE[st].tone} text={FEEDBACK_STATE[st].label} />} />
            ))}
          </ul>
        )}
      </Card>
      <Method rule="Prendre l'avis du client le jour de la livraison supprime les contestations tardives de facture."
        steps={[['Poser les 3 questions', 'Le jour même par la personne qui livre ou pose, ou par SMS le lendemain matin.'], ['Régler le petit doute', 'Une réserve mineure se règle dans la journée, avant de devenir un prétexte à ne pas payer.'], ['Facture sous 24 h', 'Bilan validé : la facture de solde part sans attendre la fin du mois.']]}
        tips={['Note de 9 ou 10 : demander tout de suite un avis ou une mise en relation.']} />
      {open && <FeedbackSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function FeedbackSheet({ initial, onClose, nav }: { initial: Feedback; onClose(): void; nav: Nav }) {
  const { state, update, author, teamView } = useStore();
  const [f, setF] = useState<Feedback>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.feedbacks[f.id];
  const set = (x: Partial<Feedback>) => setF(y => ({ ...y, ...x }));
  const st = feedbackState(f, state);
  const msg = reviewMessage(f, state.settings.companyName, state.params);
  const today = isoDate(new Date());
  const delay = invoiceDelay(f);
  const valid = () => { if (!f.client.trim()) { setError('Indiquez le client.'); return false; } return true; };
  const close = () => { if (JSON.stringify(f) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.feedbacks[f.id] = f; }); onClose(); } };
  const remove = () => { if (window.confirm('Supprimer ce bilan ?')) { update(d => { delete d.feedbacks[f.id]; }); onClose(); } };
  const complain = () => {
    if (!valid()) return;
    if (f.complaintId && state.complaints[f.complaintId]) { update(d => { d.feedbacks[f.id] = f; }); onClose(); nav.tool('2.3', f.complaintId); return; }
    const reasons = [f.q1 === false ? 'livrable non conforme au cahier des charges' : '', f.q2 === false ? 'délai non respecté' : '', f.verbatim].filter(Boolean).join(' ; ');
    const c = { ...newComplaint(state, author), client: f.client, affaire: f.affaire, description: reasons || 'Insatisfaction au bilan de fin d\'affaire', channel: (f.channel === 'site' ? 'site' : f.channel === 'mail' ? 'mail' : 'tel') as 'site' | 'mail' | 'tel' };
    update(d => { d.feedbacks[f.id] = { ...f, complaintId: c.id }; d.complaints[c.id] = c; });
    onClose();
    nav.tool('2.3', c.id);
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client"><input className={inputCls} value={f.client} list="clients-fb" onChange={e => set({ client: e.target.value })} /></Field>
            <Field label="Affaire"><input className={inputCls} value={f.affaire} onChange={e => set({ affaire: e.target.value })} /></Field>
            <Field label="Personne interrogée"><input className={inputCls} value={f.contact} onChange={e => set({ contact: e.target.value })} /></Field>
            <Field label="Devis d'origine (2.1)">
              <select className={inputCls} value={f.quoteId || ''} onChange={e => set({ quoteId: e.target.value || undefined })}>
                <option value="">Aucun</option>{Object.values(state.quotes).filter(q => q.status === 'won').map(q => <option key={q.id} value={q.id}>{q.ref} · {q.client}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Livré le"><input type="date" className={inputCls} value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
              <Field label="Questions posées">
                <select className={inputCls} value={f.channel} onChange={e => set({ channel: e.target.value as Feedback['channel'] })}>
                  <option value="site">Sur place</option><option value="sms">Par SMS</option><option value="tel">Par téléphone</option><option value="mail">Par e-mail</option>
                </select>
              </Field>
            </div>
          </div>
          {f.channel !== 'site' && (
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
              </li>
            ))}
            <li className="space-y-1.5 rounded-lg border border-slate-200 px-2.5 py-2">
              <span className="text-xs text-slate-800"><strong>Q3.</strong> {questionsOf(state.params)[2]}</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Note de recommandation">
                {Array.from({ length: 11 }, (_, n) => (
                  <button key={n} type="button" role="radio" aria-checked={f.q3 === n} onClick={() => set({ q3: f.q3 === n ? null : n })}
                    className={`h-7 w-7 rounded-md border font-mono text-[11px] font-bold ${f.q3 === n ? (n >= 9 ? 'border-emerald-700 bg-emerald-600 text-white' : n >= 7 ? 'border-amber-600 bg-amber-400 text-amber-950' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{n}</button>
                ))}
              </div>
            </li>
          </ol>
          <Field label="Mots du client"><input className={inputCls} value={f.verbatim} onChange={e => set({ verbatim: e.target.value })} /></Field>
          {isNegative(f) && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
              Client insatisfait : traiter la cause comme une réclamation.
              <button type="button" className="font-semibold underline" onClick={complain}>{f.complaintId && state.complaints[f.complaintId] ? `Voir la réclamation ${state.complaints[f.complaintId].ref}` : 'Enregistrer une réclamation (2.3)'}</button>
            </p>
          )}
          {(f.q3 ?? 0) >= 9 && (
            <div className="space-y-1 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-900">
              <p>{reviewAskMessage(f, state.settings.companyName, state.params.reviewLink)}</p>
              <div className="flex gap-2"><Button className="!px-2 !py-1" onClick={() => { navigator.clipboard?.writeText(reviewAskMessage(f, state.settings.companyName, state.params.reviewLink)).catch(() => undefined); set({ reviewAsked: true }); }}><Copy size={13} />Copier la demande d'avis</Button>{!state.params.reviewLink && <span className="self-center">Lien de votre page d'avis : Réglages.</span>}</div>
            </div>
          )}
          {(f.q3 ?? 0) >= 9 && <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={f.reviewAsked} onChange={e => set({ reviewAsked: e.target.checked })} />Avis en ligne ou mise en relation demandé au client</label>}
        </section>

        <section className="space-y-2">
          <SubTitle>3. Le petit doute, réglé dans la journée</SubTitle>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Réserve exprimée par le client"><input className={inputCls} value={f.doubt} placeholder="Ex. : une poignée mal vissée" onChange={e => set({ doubt: e.target.value })} /></Field>
            <Field label="Réglée le"><input type="date" className={inputCls} value={f.doubtSolvedAt} disabled={!f.doubt.trim()} onChange={e => set({ doubtSolvedAt: e.target.value })} /></Field>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>4. Facture de solde sous 24 h</SubTitle>
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Facture envoyée le">
              <span className="flex gap-1.5"><input type="date" className={inputCls} value={f.invoicedAt} onChange={e => set({ invoicedAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ invoicedAt: today })}>Aujourd'hui</Button></span>
            </Field>
            <Field label="Payée le"><input type="date" className={inputCls} value={f.paidAt || ''} disabled={!f.invoicedAt} onChange={e => set({ paidAt: e.target.value })} /></Field>
            <p className="text-[11px] text-slate-600 sm:col-span-2">{paymentDelay(f) !== null ? `Payée ${paymentDelay(f)} jours après la facture. ` : ''}{delay === null ? (st === 'doubt' ? 'Régler d\'abord la réserve.' : st === 'unhappy' ? 'Traiter d\'abord l\'insatisfaction (réclamation).' : 'Bilan validé : émettre la facture sans attendre la fin du mois.') : `Facturée ${delay <= 1 ? 'dans les 24 h' : `${delay} jours après la livraison`}.`}</p>
          </div>
        </section>
        {f.quoteId && state.quotes[f.quoteId] && (() => { const q = state.quotes[f.quoteId!]; const promised = q.weeks && q.decidedAt ? addDays(q.decidedAt, Math.round(q.weeks * 7)) : ''; const m = !teamView ? quoteMargin(q, state.params) : null; return (
          <section className="space-y-1">
            <SubTitle>Promis et réalisé</SubTitle>
            <p className="text-[11px] text-slate-700">Délai promis : {q.weeks ? `${q.weeks} semaine(s)${promised ? `, soit le ${frDate(promised)}` : ''}` : 'non renseigné'} · livré le {frDate(f.date)}{promised && f.date > promised ? <strong className="text-red-700"> (en retard)</strong> : ''}.{m ? ` Marge prévue au devis : ${Math.round(m.pct)} %.` : ''}</p>
          </section>
        ); })()}
      </div>
      <datalist id="clients-fb">{clientsOf(state).map(x => <option key={x} value={x} />)}</datalist>
    </Modal>
  );
}
