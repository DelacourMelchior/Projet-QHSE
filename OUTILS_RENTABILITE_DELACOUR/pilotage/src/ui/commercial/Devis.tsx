// Tool 2.1 "Devis": 5 locks checked with the technical manager, a margin checked against the floor,
// 3 visas above the threshold, then the follow-up until won or lost. Costs and margins are reserved to management.
import { useEffect, useState } from 'react';
import { Check, FileDown, Lightbulb, Plus, Printer, Send, Trash2 } from 'lucide-react';
import type { Quote, QuoteCost, State } from '../../domain/types';
import {
  FOLLOW_DAYS, LOCK_STATE, LOCKS, needsVisas, newQuote, QUOTE_STATE, quoteCost, quoteInsights, quoteIssues, quoteMargin, quoteState, quoteStats,
} from '../../domain/commercial';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { quotePdf } from '../../domain/commercialPdf';
import { daysBetween } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate, periodLabel, periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { FeedBox } from '../Feed';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';

type Filter = 'open' | 'won' | 'lost' | 'all';
const OPEN = ['draft', 'ready', 'sent', 'to_follow'];

export function Devis({ focus, clearFocus }: ScreenProps) {
  const { state, update, teamView } = useStore();
  const [open, setOpen] = useState<Quote | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.quotes[focus]) { setOpen(state.quotes[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const money = !teamView;
  const all = Object.values(state.quotes).sort((a, b) => (a.date < b.date ? 1 : -1)).map(q => ({ q, st: quoteState(q, state.params, now, money) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Devis : vérifier la faisabilité et la marge avant d'envoyer l'offre" text="5 verrous cochés en 3 minutes avec le responsable technique, une marge comparée au plancher, les visas au-dessus du seuil. Puis le suivi : relance à 7 jours, gagné ou perdu, acompte encaissé avant de lancer.">
          <Button kind="primary" onClick={() => setOpen(newQuote(state))}><Plus size={14} />Nouveau devis</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <QuoteSheet initial={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }
  const month = periodOfDate(now);
  const stats = quoteStats(state, month, now);
  const shown = all.filter(x => filter === 'all' || (filter === 'open' ? OPEN.includes(x.st) : filter === 'won' ? x.st === 'won' : x.st === 'lost' || x.st === 'dropped'));
  const count = (f: Filter) => all.filter(x => f === 'all' || (f === 'open' ? OPEN.includes(x.st) : f === 'won' ? x.st === 'won' : x.st === 'lost' || x.st === 'dropped')).length;
  return (
    <div className="space-y-4">
      <Summary title="Nos devis protègent-ils la marge ?" insights={quoteInsights(state, now, money)} tiles={<>
        <Tile title={`Envoyés en ${periodLabel(month)}`} value={String(stats.sentCount)} sub={formatValue(stats.sentAmount, '€')} />
        <Tile title="Taux de transformation" value={stats.conversionPct === null ? '—' : `${stats.conversionPct} %`} sub="gagnés sur décidés, 12 mois" />
        {money ? <Tile title="Marge des devis gagnés" value={stats.avgMarginPct === null ? '—' : `${Math.round(stats.avgMarginPct)} %`} sub={`plancher ${state.params.marginFloorPct} %, 12 mois`} tone={stats.avgMarginPct === null ? undefined : stats.avgMarginPct >= state.params.marginFloorPct ? 'ok' : 'alert'} />
          : <Tile title="Marge des devis gagnés" value="Masqué" sub="Réservé à la direction" />}
        <Tile title="À relancer" value={String(stats.toFollow)} sub={`sans nouvelle depuis ${FOLLOW_DAYS} jours · ${formatValue(stats.pendingAmount, '€')} en attente`} tone={stats.toFollow ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Devis" text="Un devis ne part pas tant que les verrous ne sont pas vérifiés et que la marge n'est pas au-dessus du plancher (ou validée par la direction).">
          <Button kind="primary" onClick={() => setOpen(newQuote(state))}><Plus size={14} />Nouveau devis</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les devis, avenants, réclamations et bilans par des exemples ?')) update(d => applyCommercialExample(d)); }}>Remplir avec des exemples</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En cours', count('open')], ['won', 'Gagnés', count('won')], ['lost', 'Perdus', count('lost')], ['all', 'Tous', count('all')]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun devis dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ q, st }) => {
              const m = money ? quoteMargin(q, state.params) : null;
              return (
                <Row key={q.id} onClick={() => setOpen(q)}
                  lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{q.ref}</span>}
                  title={`${q.client || 'Client à saisir'}${q.object ? ` · ${q.object}` : ''}`}
                  sub={st === 'draft' ? quoteIssues(q, state.params, money)[0] : st === 'lost' ? q.lostReason : [q.weeks ? `${q.weeks} semaine(s)` : '', q.sentAt ? `envoyé le ${frDate(q.sentAt)}` : '', st === 'won' && !q.depositReceived ? 'acompte non encaissé' : ''].filter(Boolean).join(' · ')}
                  right={<><span className="block font-mono font-semibold text-slate-800">{formatValue(q.amount, '€')}</span>{m ? <span className={m.pct < state.params.marginFloorPct ? 'font-semibold text-red-700' : ''}>marge {Math.round(m.pct)} %</span> : frDate(q.date)}</>}
                  badge={<StatusBadge level={QUOTE_STATE[st].tone} text={QUOTE_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
      </Card>
      <FeedBox tool="2.1" period={month} />
      <Method rule="Mieux vaut perdre un devis que signer une affaire qui détruit la marge. 5 verrous cochés en 3 minutes protègent l'entreprise."
        steps={[['5 verrous en 3 minutes', "Avant d'envoyer, le commercial vérifie les 5 points avec le responsable technique."], ['Marge au-dessus du plancher', 'En dessous, le devis ne part qu\'avec une dérogation écrite de la direction.'], ['Acompte avant de lancer', `Ni matière commandée ni fabrication lancée avant l'acompte de ${state.params.depositPct} % encaissé.`]]}
        tips={['La sous-traitance oubliée dans le chiffrage (peinture, galvanisation, transport) mange la marge.', 'Relancer à 7 jours : un devis non relancé est un devis à moitié perdu.']} />
      {open && <QuoteSheet initial={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

const emptyCost: QuoteCost = { material: null, hours: null, subcontract: null, other: null };

function QuoteSheet({ initial, onClose }: { initial: Quote; onClose(): void }) {
  const { state, update, teamView, author } = useStore();
  const [q, setQ] = useState<Quote>(() => structuredClone(initial));
  const [ideas, setIdeas] = useState<number | null>(null);
  const [error, setError] = useState('');
  if (!state) return null;
  const money = !teamView;
  const p = state.params;
  const isNew = !state.quotes[q.id];
  const set = (x: Partial<Quote>) => setQ(y => ({ ...y, ...x }));
  const cost = q.cost || emptyCost;
  const setCost = (x: Partial<QuoteCost>) => set({ cost: { ...cost, ...x } });
  const setLock = (i: number, x: Partial<Quote['locks'][number]>) => set({ locks: q.locks.map((l, j) => (j === i ? { ...l, ...x } : l)) });
  const sign = (k: keyof Quote['visas']) => set({ visas: { ...q.visas, [k]: q.visas[k].by ? { by: '', date: '' } : { by: author || 'Signé', date: isoDate(new Date()) } } });
  const issues = quoteIssues(q, p, money);
  const st = quoteState(q, p, new Date(), money);
  const m = quoteMargin(q, p);
  const total = quoteCost(q, p);
  const today = isoDate(new Date());
  // in team view the costs are neither shown nor overwritten
  const commit = (x: Quote) => update(d => { d.quotes[x.id] = money ? x : { ...x, cost: d.quotes[x.id]?.cost }; });
  const close = () => { if (JSON.stringify(q) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = (x = q) => { if (!x.client.trim()) return setError('Indiquez le client.'); commit(x); onClose(); };
  const remove = () => { if (window.confirm(`Supprimer le devis ${q.ref} ?`)) { update(d => { delete d.quotes[q.id]; }); onClose(); } };
  const send = () => {
    if (issues.length && !window.confirm(`Envoyer malgré ${issues.length} point(s) ouvert(s) ?\n\n- ${issues.join('\n- ')}`)) return;
    save({ ...q, status: 'sent', sentAt: q.sentAt || today });
  };
  const decide = (status: Quote['status']) => set({ status, decidedAt: status === 'won' || status === 'lost' || status === 'dropped' ? (q.decidedAt || today) : '' });
  const pdf = () => downloadFile(`Validation-${fileSlug(q.ref)}.pdf`, quotePdf(state, q, { company: state.settings.companyName, date: new Date(), money }), 'application/pdf');

  return (
    <Modal xwide onClose={close} title={isNew ? 'Nouveau devis' : `Devis ${q.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{q.client || 'Client à saisir'} <StatusBadge level={QUOTE_STATE[st].tone} text={QUOTE_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />Fiche de validation</Button>
        <Button onClick={close}>Annuler</Button>
        {q.status === 'draft' && <Button onClick={send}><Send size={14} />Marquer envoyé</Button>}
        <Button kind="primary" onClick={() => save()}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        {q.status === 'draft' && (
          <p className={`rounded-lg px-3 py-2 text-[11px] ${issues.length ? 'bg-amber-50 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}>
            {issues.length ? <><strong>Avant d'envoyer :</strong> {issues.join(' · ')}.</> : <strong>Prêt à envoyer : verrous vérifiés, marge et visas en ordre.</strong>}
          </p>
        )}
        <section className="space-y-2">
          <SubTitle>1. L'offre</SubTitle>
          <div className="grid gap-3 sm:grid-cols-6">
            <div className="sm:col-span-2"><Field label="Client"><input className={inputCls} value={q.client} list="clients" onChange={e => set({ client: e.target.value })} /></Field></div>
            <div className="sm:col-span-4"><Field label="Objet"><input className={inputCls} value={q.object} onChange={e => set({ object: e.target.value })} /></Field></div>
            <Field label="Numéro"><input className={`${inputCls} font-mono`} value={q.ref} onChange={e => set({ ref: e.target.value })} /></Field>
            <Field label="Date"><input type="date" className={inputCls} value={q.date} onChange={e => set({ date: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Prix de vente (€ HT)"><NumInput value={q.amount} onChange={v => set({ amount: v })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Délai promis (semaines)"><NumInput value={q.weeks} onChange={v => set({ weeks: v })} /></Field></div>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>2. Les 5 verrous, avec le responsable technique</SubTitle>
          <ul className="space-y-1.5">
            {LOCKS.map((l, i) => {
              const lk = q.locks[i] || { state: '', note: '' };
              return (
                <li key={l.process} className="space-y-1.5 rounded-lg border border-slate-200 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-8 shrink-0 font-mono text-[11px] font-bold text-delacour-primary">{l.process}</span>
                    <span className="min-w-0 flex-1 text-xs"><strong className="text-slate-900">{l.label}</strong> <span className="text-slate-600">· {l.point}</span></span>
                    <button type="button" aria-label="Idées" aria-expanded={ideas === i} onClick={() => setIdeas(ideas === i ? null : i)} className="rounded p-1 text-slate-400 hover:text-amber-700"><Lightbulb size={14} /></button>
                    <div className="flex gap-1" role="radiogroup" aria-label={`Verrou ${l.process}`}>
                      {(['ok', 'reserve', 'ko'] as const).map(k => (
                        <button key={k} type="button" role="radio" aria-checked={lk.state === k} onClick={() => setLock(i, { state: lk.state === k ? '' : k })}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${lk.state === k ? (k === 'ok' ? 'border-emerald-700 bg-emerald-600 text-white' : k === 'reserve' ? 'border-amber-600 bg-amber-400 text-amber-950' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                          {LOCK_STATE[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ideas === i && <p className="pl-10 text-[11px] text-slate-600">À vérifier : {l.ideas.join(' · ')}.</p>}
                  {(lk.state === 'reserve' || lk.state === 'ko' || lk.note) && <input className={`${inputCls} ml-10 !w-[calc(100%-2.5rem)]`} value={lk.note} placeholder={lk.state === 'ko' ? 'Ce qui bloque' : 'La réserve, écrite'} aria-label={`Réserve ${l.process}`} onChange={e => setLock(i, { note: e.target.value })} />}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <SubTitle>3. Marge</SubTitle>
          {!money ? <p className="text-[11px] text-slate-500">Coûts et marge réservés à la direction.</p> : (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <Field label="Matière et fournitures (€)"><NumInput value={cost.material} onChange={v => setCost({ material: v })} /></Field>
                <Field label="Heures de main-d'œuvre" hint={`à ${formatValue(p.hourlyRate, '€')} de l'heure`}><NumInput value={cost.hours} onChange={v => setCost({ hours: v })} /></Field>
                <Field label="Sous-traitance (€)" hint="Peinture, galvanisation, transport dédié…"><NumInput value={cost.subcontract} onChange={v => setCost({ subcontract: v })} /></Field>
                <Field label="Autres frais directs (€)"><NumInput value={cost.other} onChange={v => setCost({ other: v })} /></Field>
              </div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {total === null || !m ? 'Saisissez le prix et les coûts pour calculer la marge.'
                  : <>Coût de revient <strong className="font-mono">{formatValue(total, '€')}</strong>, marge brute <strong className={`font-mono ${m.pct < p.marginFloorPct ? 'text-red-700' : 'text-emerald-800'}`}>{formatValue(m.value, '€')} ({Math.round(m.pct)} %)</strong> pour un plancher de {p.marginFloorPct} %.</>}
              </p>
              {m && m.pct < p.marginFloorPct && (
                <Field label="Dérogation de la direction (qui, pourquoi)"><input className={inputCls} value={q.derogation} placeholder="Ex. : Jean-Marc, client stratégique, première commande" onChange={e => set({ derogation: e.target.value })} /></Field>
              )}
            </>
          )}
        </section>

        {needsVisas(q, p) && (
          <section className="space-y-2">
            <SubTitle>4. Visas (offre de {formatValue(p.visaThreshold, '€')} ou plus)</SubTitle>
            <div className="grid gap-2 sm:grid-cols-3">
              {([['commercial', 'Commercial'], ['technical', 'Responsable technique'], ['direction', 'Direction']] as const).map(([k, l]) => (
                <div key={k} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
                  <span className="text-[11px]"><strong className="block text-xs text-slate-900">{l}</strong>{q.visas[k].by ? `${q.visas[k].by}, le ${frDate(q.visas[k].date)}` : 'À signer'}</span>
                  <Button className="!px-2 !py-1" onClick={() => sign(k)}>{q.visas[k].by ? 'Retirer' : <><Check size={13} />Signer</>}</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <SubTitle>{needsVisas(q, p) ? '5' : '4'}. Suivi</SubTitle>
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Issue du devis">
            {([['draft', 'En préparation'], ['sent', 'Envoyé'], ['won', 'Gagné'], ['lost', 'Perdu'], ['dropped', 'Abandonné']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={q.status === k} onClick={() => k === 'sent' ? set({ status: 'sent', sentAt: q.sentAt || today, decidedAt: '' }) : decide(k)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${q.status === k ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {q.status !== 'draft' && <Field label="Envoyé le"><input type="date" className={inputCls} value={q.sentAt} onChange={e => set({ sentAt: e.target.value })} /></Field>}
            {q.status === 'sent' && (
              <Field label="Dernière relance" hint={q.followedAt || q.sentAt ? `Sans nouvelle depuis ${daysBetween(q.followedAt || q.sentAt, new Date())} jour(s).` : undefined}>
                <span className="flex gap-1.5"><input type="date" className={inputCls} value={q.followedAt} onChange={e => set({ followedAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ followedAt: today })}>Aujourd'hui</Button></span>
              </Field>
            )}
            {['won', 'lost', 'dropped'].includes(q.status) && <Field label="Décidé le"><input type="date" className={inputCls} value={q.decidedAt} onChange={e => set({ decidedAt: e.target.value })} /></Field>}
            {q.status === 'lost' && <div className="sm:col-span-2"><Field label="Pourquoi perdu"><input className={inputCls} value={q.lostReason} placeholder="Prix, délai, technique, relation…" onChange={e => set({ lostReason: e.target.value })} /></Field></div>}
            {q.status === 'won' && (
              <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={q.depositReceived} onChange={e => set({ depositReceived: e.target.checked })} />Acompte de {p.depositPct} % encaissé (sinon : ni matière ni fabrication)
              </label>
            )}
          </div>
        </section>
      </div>
      <datalist id="clients">{clientsOf(state).map(c => <option key={c} value={c} />)}</datalist>
    </Modal>
  );
}

// Clients already typed in tools 2.1 to 2.4
export const clientsOf = (s: State) => [...new Set([...Object.values(s.quotes), ...Object.values(s.changes), ...Object.values(s.complaints), ...Object.values(s.feedbacks), ...Object.values(s.deliveries)].map(x => x.client).filter(Boolean))].sort();
