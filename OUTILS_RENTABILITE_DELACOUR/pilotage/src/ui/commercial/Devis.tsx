// Tool 2.1 "Devis": 5 locks checked with the technical manager, a margin checked against the floor and a price ladder (target price,
// floor, complete cost, variable cost, largest discount), 3 visas above the threshold, then the follow-up until won or lost.
// Costs and margins are reserved to management: the team only sees the largest discount it may give.
import { useEffect, useState } from 'react';
import { Check, FileDown, Lightbulb, Plus, Printer, Send, Trash2 } from 'lucide-react';
import type { Quote, QuoteCost, State } from '../../domain/types';
import {
  FOLLOW_DAYS, forecast, LOCK_STATE, LOCKS, LOST_CATEGORIES, lostStats, needsVisas, newQuote, priceLadder, QUOTE_STATE, quoteCost, quoteFullCost, quoteInsights, quoteHourMargin, quoteIssues, quoteMargin, quoteState, quoteStats,
} from '../../domain/commercial';
import { variableRate } from '../../domain/hourly';
import { chartModel, hourValues } from '../../domain/charter';
import { PriceLadder } from './PriceLadder';
import { parseNumber } from '../../domain/numbers';
import { PasteImport } from '../PasteImport';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { quotePdf } from '../../domain/commercialPdf';
import { daysBetween } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate, periodLabel, periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
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
          <PasteImport title="Importer des devis depuis Excel ou le logiciel de devis" label="Importer"
            cols={[{ key: 'ref', label: 'Numéro', aliases: ['devis', 'ref', 'n°'] }, { key: 'client', label: 'Client', aliases: ['societe', 'raison sociale'] }, { key: 'object', label: 'Objet', aliases: ['designation', 'libelle'] },
              { key: 'date', label: 'Date', aliases: [] }, { key: 'amount', label: 'Montant HT', aliases: ['montant', 'total ht', 'prix'] }, { key: 'cost', label: 'Coût', aliases: ['cout de revient', 'debourse', 'prix de revient'] }]}
            onImport={rows => { let n = 0; update(d => { rows.forEach(r => { if (!r.client && !r.ref) return; const q = newQuote(d); const date = (r.date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || []); d.quotes[q.id] = { ...q, ref: r.ref || q.ref, client: r.client, object: r.object, date: date.length ? `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}` : q.date, amount: parseNumber(r.amount), cost: r.cost ? { material: null, hours: null, subcontract: null, other: parseNumber(r.cost) } : undefined }; n++; }); }); return n; }} />
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
                  sub={st === 'draft' ? quoteIssues(q, state.params, money)[0] : st === 'lost' ? [q.lostCategory ? LOST_CATEGORIES[q.lostCategory] : '', q.lostReason].filter(Boolean).join(' : ') : [q.weeks ? `${q.weeks} semaine(s)` : '', q.sentAt ? `envoyé le ${frDate(q.sentAt)}` : '', st === 'won' && !q.depositReceived ? 'acompte non encaissé' : ''].filter(Boolean).join(' · ')}
                  right={<><span className="block font-mono font-semibold text-slate-800">{formatValue(q.amount, '€')}</span>{m ? <span className={m.pct < state.params.marginFloorPct ? 'font-semibold text-red-700' : ''}>marge {Math.round(m.pct)} %</span> : q.maxDiscountPct != null ? `remise max ${formatValue(q.maxDiscountPct, '%')}` : frDate(q.date)}</>}
                  badge={<StatusBadge level={QUOTE_STATE[st].tone} text={QUOTE_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Carnet de commandes à venir</h2>
          {(() => { const f = forecast(state); return money ? (
            <p className="text-[11px] text-slate-700">Devis en cours : <strong className="font-mono">{formatValue(f.pending, '€')}</strong>, dont <strong className="font-mono">{formatValue(f.weighted, '€')}</strong> probables (chance de gagner saisie dans chaque devis, 50 % sinon), pour un objectif de CA de <strong className="font-mono">{formatValue(f.objective3m, '€')}</strong> par trimestre{f.weighted < f.objective3m ? ' : le portefeuille ne couvre pas le prochain trimestre, prospecter.' : '.'}</p>
          ) : <p className="text-[11px] text-slate-500">Réservé à la direction.</p>; })()}
        </Card>
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Pourquoi on perd (12 mois)</h2>
          {lostStats(state).length ? <ul className="space-y-0.5 text-[11px] text-slate-700">{lostStats(state).map(x => <li key={x.key}><strong>{x.label}</strong> : {x.n} devis{money ? `, ${formatValue(x.amount, '€')}` : ''}</li>)}</ul> : <p className="text-[11px] text-slate-500">Aucun devis perdu classé.</p>}
        </Card>
      </div>
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
  const [express, setExpress] = useState(() => !!initial.cost && initial.cost.material === null && initial.cost.hours === null && initial.cost.subcontract === null && initial.cost.other !== null);
  const [note, setNote] = useState('');
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
  // the margin aimed at is the decision of the charter (1.6), else the margin of the accounts
  const model = money ? chartModel(state) : null, variableHourly = variableRate(state.settings.hourly, cost.rate || '');
  const ladder = money ? priceLadder(q, p, model?.marginPct ?? state.settings.netMarginPct, variableHourly) : null;
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
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
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
            <div className="sm:col-span-4"><Field label="Interlocuteur client (nom, téléphone)"><input className={inputCls} value={q.contact || ''} onChange={e => set({ contact: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Chance de gagner (%)" hint="Sert à la prévision du carnet."><NumInput value={q.probability ?? null} onChange={v => set({ probability: v === null ? null : Math.max(0, Math.min(100, v)) })} /></Field></div>
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
                  {lk.state && <input className={`${inputCls} ml-10 !w-[calc(100%-2.5rem)]`} value={lk.by || ''} list="people" placeholder={i === 2 || i === 4 ? 'Vérifié avec (obligatoire)' : 'Vérifié avec'} aria-label={`Verrou ${l.process} vérifié avec`} onChange={e => setLock(i, { by: e.target.value })} />}
                  {(lk.state === 'reserve' || lk.state === 'ko' || lk.note) && <input className={`${inputCls} ml-10 !w-[calc(100%-2.5rem)]`} value={lk.note} placeholder={lk.state === 'ko' ? 'Ce qui bloque' : 'La réserve, écrite'} aria-label={`Réserve ${l.process}`} onChange={e => setLock(i, { note: e.target.value })} />}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-2">
          <SubTitle>3. Marge</SubTitle>
          {!money ? (
            <>
              <p className="text-[11px] text-slate-500">Coûts et marge réservés à la direction.</p>
              {q.maxDiscountPct != null && !!q.amount && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">Remise maximale accordée par la direction : <strong>{formatValue(q.maxDiscountPct, '%')}</strong>, soit un prix minimum de <strong className="font-mono">{formatValue(q.amount * (1 - q.maxDiscountPct / 100), '€')}</strong>.</p>}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={express} onChange={e => { setExpress(e.target.checked); if (e.target.checked) setCost({ material: null, hours: null, subcontract: null, other: total }); }} />Contrôle express : je saisis seulement le coût de revient total calculé par mon logiciel de devis</label>
              {express ? (
                <div className="grid gap-2 sm:grid-cols-4"><Field label="Coût de revient total (€ HT)"><NumInput value={cost.other} onChange={v => setCost({ other: v })} /></Field></div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-5">
                  <Field label="Matière et fournitures (€)"><NumInput value={cost.material} onChange={v => setCost({ material: v })} /></Field>
                  <Field label="Heures de main-d'œuvre"><NumInput value={cost.hours} onChange={v => setCost({ hours: v })} /></Field>
                  <Field label="Au taux de">
                    <select className={inputCls} value={cost.rate || ''} onChange={e => setCost({ rate: e.target.value })}>
                      <option value="">Général ({formatValue(p.hourlyRate, '€')}/h)</option>
                      {(p.rates || []).map(r => <option key={r.name} value={r.name}>{r.name} ({formatValue(r.rate, '€')}/h)</option>)}
                    </select>
                  </Field>
                  <Field label="Sous-traitance (€)" hint="Peinture, galvanisation, transport dédié…"><NumInput value={cost.subcontract} onChange={v => setCost({ subcontract: v })} /></Field>
                  <Field label="Autres frais directs (€)"><NumInput value={cost.other} onChange={v => setCost({ other: v })} /></Field>
                </div>
              )}
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {total === null || !m ? 'Saisissez le prix et les coûts pour calculer la marge.'
                  : <>Coût direct <strong className="font-mono">{formatValue(total, '€')}</strong>, marge brute <strong className={`font-mono ${m.pct < p.marginFloorPct ? 'text-red-700' : 'text-emerald-800'}`}>{formatValue(m.value, '€')} ({Math.round(m.pct)} %)</strong> pour un plancher de {p.marginFloorPct} % (marge brute = prix moins coûts directs : matière, heures, sous-traitance).{p.overheadPct ? <> Après {p.overheadPct} % de frais généraux : <strong className="font-mono">{formatValue((q.amount || 0) - (quoteFullCost(q, p) || 0), '€')}</strong>.</> : ''}</>}
              </p>
              {m && m.pct < p.marginFloorPct && (
                <Field label="Dérogation de la direction (qui, pourquoi)"><input className={inputCls} value={q.derogation} placeholder="Ex. : Jean-Marc, client stratégique, première commande" onChange={e => set({ derogation: e.target.value })} /></Field>
              )}
              {ladder && <PriceLadder q={q} ladder={ladder} p={p} targetPct={model?.marginPct ?? state.settings.netMarginPct} machines={!!state.settings.hourly?.stations.length}
                hourMargin={quoteHourMargin(q, variableHourly)} hv={hourValues(state, model)}
                onPrice={v => set({ amount: v })} onDiscount={v => set({ maxDiscountPct: v === null ? null : Math.max(0, Math.min(100, v)) })} />}
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

        {money && !isNew && (
          <section className="space-y-1.5">
            <SubTitle>Révisions du devis</SubTitle>
            {(q.revisions || []).length > 0 && <ul className="space-y-0.5 text-[11px] text-slate-700">{q.revisions!.map(r => <li key={r.v}><span className="font-mono">V{r.v}</span> · {frDate(r.date)} · {formatValue(r.amount, '€')}{r.marginPct !== null ? ` · marge ${Math.round(r.marginPct)} %` : ''}{r.note ? ` · ${r.note}` : ''}</li>)}</ul>}
            <div className="flex gap-1.5">
              <input className={inputCls} value={note} placeholder="Ce qui change (ex. : remise de 5 % demandée par l'acheteur)" aria-label="Motif de la révision" onChange={e => setNote(e.target.value)} />
              <Button className="shrink-0" onClick={() => { const prev = state.quotes[q.id]; const pm = quoteMargin(prev, p); set({ revisions: [...(q.revisions || []), { v: (q.revisions || []).length + 1, date: today, amount: prev.amount, marginPct: pm ? pm.pct : null, note: note.trim() }], status: q.status === 'sent' ? 'draft' : q.status }); setNote(''); }}>Garder la version actuelle et réviser</Button>
            </div>
            <p className="text-[11px] text-slate-500">Une remise ou une modification repasse le devis en préparation : la marge et les verrous sont revus avant le nouvel envoi.</p>
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
              <div className="space-y-1.5 sm:col-span-4">
                <span className="block text-[11px] font-semibold text-slate-700">Relances {q.followedAt || q.sentAt ? `(sans nouvelle depuis ${daysBetween([q.followedAt, ...(q.followUps || []).map(f => f.date)].filter(Boolean).sort().pop() || q.sentAt, new Date())} jour(s))` : ''}</span>
                {(q.followUps || []).length > 0 && <ul className="space-y-0.5 text-[11px] text-slate-700">{q.followUps!.map((f, i) => <li key={i}><span className="font-mono">{frDate(f.date)}</span> · {f.note || 'relance'} ({f.by})</li>)}</ul>}
                <div className="flex flex-wrap gap-1.5">
                  <input className={`${inputCls} min-w-[200px] flex-1`} value={note} placeholder="Ce que dit le client" aria-label="Compte rendu de la relance" onChange={e => setNote(e.target.value)} />
                  <Button className="shrink-0" onClick={() => { set({ followUps: [...(q.followUps || []), { date: today, note: note.trim(), by: author }], followedAt: today }); setNote(''); }}>Relancé aujourd'hui</Button>
                </div>
                <Field label="Prochaine relance le"><input type="date" className={`${inputCls} sm:w-48`} value={q.nextFollowAt || ''} onChange={e => set({ nextFollowAt: e.target.value })} /></Field>
              </div>
            )}
            {['won', 'lost', 'dropped'].includes(q.status) && <Field label="Décidé le"><input type="date" className={inputCls} value={q.decidedAt} onChange={e => set({ decidedAt: e.target.value })} /></Field>}
            {q.status === 'lost' && <Field label="Raison principale"><select className={inputCls} value={q.lostCategory || ''} onChange={e => set({ lostCategory: e.target.value as Quote['lostCategory'] })}><option value="">À choisir</option>{Object.entries(LOST_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>}
            {q.status === 'lost' && <div className="sm:col-span-2"><Field label="Précision"><input className={inputCls} value={q.lostReason} placeholder="Ex. : concurrent 12 % moins cher" onChange={e => set({ lostReason: e.target.value })} /></Field></div>}
            {q.status === 'won' && (
              <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={q.depositReceived} onChange={e => set({ depositReceived: e.target.checked, depositAt: e.target.checked ? q.depositAt || today : '' })} />Acompte de {p.depositPct} % encaissé (sinon : ni matière ni fabrication)
              </label>
            )}
            {q.status === 'won' && <Field label="Acompte (€)"><NumInput value={q.depositAmount ?? (q.amount ? Math.round(q.amount * p.depositPct / 100) : null)} onChange={v => set({ depositAmount: v })} /></Field>}
            {q.status === 'won' && <Field label="Encaissé le"><input type="date" className={inputCls} value={q.depositAt || ''} onChange={e => set({ depositAt: e.target.value, depositReceived: !!e.target.value })} /></Field>}
            {q.status === 'won' && <Field label="Fabrication lancée le"><input type="date" className={inputCls} value={q.startedAt || ''} onChange={e => set({ startedAt: e.target.value })} /></Field>}
            {q.status === 'won' && q.startedAt && !q.depositReceived && <p className="text-[11px] font-semibold text-red-700 sm:col-span-4">Fabrication lancée sans acompte encaissé.</p>}
          </div>
        </section>
      </div>
      <datalist id="clients">{clientsOf(state).map(c => <option key={c} value={c} />)}</datalist>
    </Modal>
  );
}

// Clients already typed in tools 2.1 to 2.4
export const clientsOf = (s: State) => [...new Set([...Object.values(s.quotes), ...Object.values(s.changes), ...Object.values(s.complaints), ...Object.values(s.feedbacks), ...Object.values(s.deliveries)].map(x => x.client).filter(Boolean))].sort();
