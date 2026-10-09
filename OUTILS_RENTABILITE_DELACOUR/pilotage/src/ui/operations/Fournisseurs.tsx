// Tool 3.1 "Fournisseurs": evaluation of the suppliers, first. Each supplier is rated once a year on the company's own grid of criteria (quality,
// delays, service, price…), compared with the other supplier of its purchasing sector, and kept ready with a backup. Claims to suppliers come
// second: they are kept in the history of each supplier and feed its rating. A supplier is an organisation of the directory (1.3).
import { useEffect, useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import type { Debit, Sector, Supplier } from '../../domain/types';
import {
  CLAIM_INSIGHT_KEYS, classOfSupplier, followOrg, isFollowed, lastRating, linkSuppliers, newDebit, newSupplier, nextReview,
  ratingDue, statusOf, supplierFacts, supplierInsights, supplierSummary,
} from '../../domain/suppliers';
import { newSector, proposeSectors, reordered, sectorInsights, sectorRanking, sectorsOf, sectorState, sectorSummary, type Ranked } from '../../domain/sectors';
import { applySupplierExample } from '../../domain/supplierExamples';
import { orgKey } from '../../domain/contacts';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { PasteImport } from '../PasteImport';
import { Button, Card, Chips, Empty, Method, Summary, Tile, ToolHeader } from '../common';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';
import { ClaimSheet } from './ClaimSheet';
import { ClaimsView } from './ClaimsView';
import { EvaluationSettings } from './SupplierSettings';
import { SupplierSheet } from './SupplierSheet';
import { ColumnsHeader, FlatTable, FreeGroup, SectorGroup, type LineInfo } from './SupplierTable';

type View = 'suppliers' | 'claims';

export function Fournisseurs({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [view, setView] = useState<View>('suppliers');
  const [debit, setDebit] = useState<Debit | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [rate, setRate] = useState(false);   // the sheet opens already on an empty evaluation
  const openSupplier = (x: Supplier, rating = false) => { setRate(rating); setSupplier(x); };
  // a link from another tool opens a claim, a supplier, a new claim to a supplier ("new:" and its id), or the sectors
  useEffect(() => {
    if (!focus || !state) return;
    if (state.debits[focus]) { setView('claims'); setDebit(state.debits[focus]); }
    else if (state.suppliers[focus]) { setView('suppliers'); setSupplier(state.suppliers[focus]); }
    else if (focus.startsWith('new:') && state.suppliers[focus.slice(4)]) { setView('claims'); setDebit(newDebit(state, focus.slice(4))); }
    else if (focus.startsWith('sector:')) setView('suppliers');
    clearFocus();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const claims = Object.values(state.debits), suppliers = Object.values(state.suppliers);
  const sheets = <>
    {debit && <ClaimSheet initial={debit} onClose={() => setDebit(null)} nav={nav} />}
    {supplier && <SupplierSheet key={`${supplier.id}${rate}`} initial={supplier} rateOnOpen={rate} onClose={() => { setSupplier(null); setRate(false); }} nav={nav} onClaim={d => { setView('claims'); setDebit(d); }} />}
  </>;
  if (!claims.length && !suppliers.length) {
    return (
      <div className="space-y-4">
        <Empty title="Fournisseurs : évaluation, comparaison et secours" text="Chaque fournisseur est noté une fois par an sur les critères de l'entreprise (qualité, délais, service, prix…), rangé par secteur d'achat pour voir qui est le meilleur et qui est le secours, et ses réclamations sont gardées dans son historique. Les fournisseurs et leurs contacts sont ceux de l'annuaire.">
          <Button kind="primary" onClick={() => setSupplier(newSupplier())}><Plus size={14} />Ajouter un fournisseur</Button>
          <Button onClick={() => setDebit(newDebit(state))}>Réclamer à un fournisseur</Button>
          <Button onClick={() => update(d => applySupplierExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {sheets}
      </div>
    );
  }
  const openClaims = supplierSummary(state, new Date()).open;
  return (
    <div className="space-y-4">
      <Chips value={view} onChange={setView} items={[['suppliers', 'Fournisseurs et évaluation', suppliers.length], ['claims', 'Réclamations', openClaims || undefined]]} />
      {view === 'suppliers'
        ? <SuppliersView nav={nav} onOpen={openSupplier} onNew={() => openSupplier(newSupplier())} />
        : <ClaimsView nav={nav} onOpen={setDebit} onNew={() => setDebit(newDebit(state))} />}
      {sheets}
    </div>
  );
}

type Filter = 'all' | 'watch' | 'critical' | 'due' | 'gap';

function SuppliersView({ nav, onOpen, onNew }: { nav: Nav; onOpen(x: Supplier, rate?: boolean): void; onNew(): void }) {
  const { state, update } = useStore();
  const [mode, setMode] = useState<'sector' | 'flat'>('sector');
  const [filter, setFilter] = useState<Filter>('all');
  if (!state) return null;
  const now = new Date();
  const suppliers = Object.values(state.suppliers);
  const sectors = Object.values(state.sectors || {}).sort((a, b) => a.name.localeCompare(b.name));
  const followed = suppliers.filter(isFollowed);
  const rows = new Map<string, LineInfo>(suppliers.map(x => [x.id, { x, cls: classOfSupplier(x, state.params), f: supplierFacts(state, x, now), due: ratingDue(x, now, state.params), r: lastRating(x) }]));
  const weak = (x: Supplier) => { const y = rows.get(x.id)!; return isFollowed(x) && (y.cls === 'C' || statusOf(x) === 'watch' || y.f.repeats.length > 0); };
  // a sector without a ready backup: the one that is main alone, empty, or whose backup was never tried (a sector already served by its backup is not one)
  const gaps = sectors.filter(sec => ['empty', 'short', 'unproven'].includes(sectorState(state, sec, now)));
  const inGap = new Set(gaps.flatMap(sec => sectorRanking(state, sec, now).map(y => y.x.id)));
  const keep = (x: Supplier) => (filter === 'all' ? true : filter === 'watch' ? weak(x) : filter === 'critical' ? x.strategic : filter === 'gap' ? inGap.has(x.id) : rows.get(x.id)!.due);
  const pick = (f: Filter) => setFilter(filter === f ? 'all' : f);
  const dueList = followed.filter(x => rows.get(x.id)!.due);
  const sm = supplierSummary(state, now), ss = sectorSummary(state, now);
  const effective = sectors.length ? mode : 'flat';
  // what the tiles and the table already say (class C, evaluations due, sectors without backup) is not repeated; the weightiest messages come first
  const ALREADY_SHOWN = ['c', 'due', 'sector_alone'], weight = { bad: 0, warn: 1, good: 2 } as const;
  const insights = [...supplierInsights(state, now).filter(i => !CLAIM_INSIGHT_KEYS.includes(i.key)), ...sectorInsights(state, now)].filter(i => !ALREADY_SHOWN.includes(i.key)).sort((a, b) => weight[a.tone] - weight[b.tone]);
  const proposals = proposeSectors(state);
  const noBackup = ss.short + ss.empty + ss.unproven;
  const counts = (c: 'A' | 'B') => followed.filter(x => classOfSupplier(x, state.params) === c).length;
  const propose = () => {
    if (!window.confirm(`Créer ${proposals.length} secteur(s) d'après ce que fournissent vos fournisseurs : ${proposals.map(p => p.name).join(' ; ')} ? Vous pourrez les renommer ou les regrouper dans les réglages de l'évaluation.`)) return;
    update(d => proposals.forEach(p => { const sc = newSector(p.name); d.sectors[sc.id] = sc; p.supplierIds.forEach(id => { const x = d.suppliers[id]; if (x) x.sectorIds = [...(x.sectorIds || []), sc.id]; }); }));
  };
  const move = (sec: Sector, ranking: Ranked[], id: string, dir: -1 | 1) => update(d => { const sc = d.sectors[sec.id]; sc.order = reordered(ranking, id, dir); sc.manual = true; });
  const order = { C: 0, B: 1, A: 2 } as const;
  const flat = [...suppliers].filter(keep).sort((a, b) => { const ca = rows.get(a.id)!.cls, cb = rows.get(b.id)!.cls; return (ca ? order[ca] : 3) - (cb ? order[cb] : 3) || a.name.localeCompare(b.name); });
  const free = suppliers.filter(x => !(x.sectorIds || []).some(id => state.sectors?.[id])).filter(keep).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <Summary title="Vos fournisseurs sont-ils fiables ?" insights={insights} max={3} list tiles={<>
        <Tile title="Fournisseurs suivis" value={String(followed.length)} sub={`${followed.filter(x => x.strategic).length} critique(s), ${followed.filter(x => statusOf(x) === 'qualify').length} à qualifier`} />
        <Tile title="Évaluations à jour" value={`${followed.length - dueList.length} / ${followed.length}`} sub={dueList.length ? `${dueList.length} à faire` : 'tout est à jour'} tone={dueList.length ? 'warn' : 'ok'} onClick={dueList.length ? () => pick('due') : undefined} active={filter === 'due'} />
        <Tile title="Fournisseurs en classe C" value={String(sm.inC)} sub={`classe A : ${counts('A')} · classe B : ${counts('B')}`} tone={sm.inC ? 'alert' : undefined} onClick={sm.inC ? () => pick('watch') : undefined} active={filter === 'watch'} />
        <Tile title="Secteurs sans secours prêt" value={sectors.length ? String(noBackup) : '—'} sub={sectors.length ? `sur ${sectors.length} secteur${sectors.length > 1 ? 's' : ''}${ss.switched ? `, ${ss.switched} secours en service` : ''}` : 'aucun secteur défini'} tone={ss.short + ss.empty ? 'alert' : ss.unproven ? 'warn' : undefined} onClick={gaps.length ? () => pick('gap') : undefined} active={filter === 'gap'} />
      </>} />

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Évaluation des fournisseurs" text="Chaque fournisseur est noté sur la grille de critères de l'entreprise, comparé aux autres fournisseurs de son secteur, avec un secours prêt si le principal ne peut pas répondre.">
          <Button kind="primary" onClick={onNew}><Plus size={14} />Ajouter un fournisseur</Button>
          <PasteImport title="Importer des fournisseurs (Excel ou logiciel de gestion)" cols={[{ key: 'name', label: 'Nom', aliases: ['fournisseur', 'raison sociale', 'societe'] }, { key: 'supplies', label: 'Fournit', aliases: ['famille', 'produit', 'activite'] }, { key: 'contact', label: 'Contact', aliases: ['telephone', 'tel', 'email'] }]}
            onImport={list => {
              let n = 0;
              update(d => {
                list.filter(r => r.name && !Object.values(d.suppliers).some(s => orgKey(s.name) === orgKey(r.name))).forEach(r => { const s = followOrg(d, r.name, 'fournisseur', 'listed'); s.supplies = r.supplies; s.contact = r.contact; n++; });
                const l = linkSuppliers(d);
                d.suppliers = l.suppliers; d.orgs = l.orgs; d.contacts = l.contacts; d.debits = l.debits;
              });
              return n;
            }} />
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>

        {dueList.length > 0 && (
          <details className="rounded-xl border border-amber-200 bg-amber-50/40">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-amber-950">{dueList.length} évaluation{dueList.length > 1 ? 's' : ''} à faire <span className="font-semibold text-delacour-primary underline">Voir la liste</span></summary>
            <ul className="divide-y divide-amber-100 border-t border-amber-100 px-2">{dueList.map(x => <ReviewRow key={x.id} x={x} onRate={() => onOpen(x, true)} />)}</ul>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Chips value={filter} onChange={setFilter} items={[['all', 'Tous', suppliers.length], ['watch', 'À surveiller', suppliers.filter(weak).length], ['critical', 'Critiques', suppliers.filter(x => x.strategic).length], ['due', 'À évaluer', dueList.length], ...(gaps.length ? [['gap', 'Sans secours', gaps.length] as [Filter, string, number]] : [])]} />
          <span className="flex flex-wrap items-center gap-2">
            {sectors.length > 0 && <Chips value={mode} onChange={setMode} items={[['sector', 'Par secteur'], ['flat', 'Liste à plat']]} />}
          </span>
        </div>
        {sectors.length === 0 && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-700">Les fournisseurs se rangent par secteur d'achat (ce que vous achetez), de préférence deux par secteur : l'outil indique alors le meilleur et si le secours est prêt. Les secteurs se créent dans les réglages de l'évaluation, en bas de cette page.
            {proposals.length > 0 && <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={propose}>Proposer les secteurs d'après ce que fournissent vos fournisseurs ({proposals.length})</button>}</p>
        )}

        {effective === 'sector' ? (
          <div role="table" aria-label="Fournisseurs par secteur d'achat" className="border-b border-slate-300 [&>[role=row]+[role=rowgroup]>[role=row]:first-child]:border-t-0">
            <ColumnsHeader />
            {sectors.map(sec => {
              const ranking = sectorRanking(state, sec, now), shown = ranking.filter(y => keep(y.x));
              if (!shown.length && filter !== 'all') return null;
              // closed by default; a filter opens them, since it is the suppliers it picked that the person wants to see
              return <SectorGroup key={sec.id} sec={sec} nav={nav} ranking={ranking} shown={shown} rows={rows} forceOpen={filter !== 'all'} onOpen={x => onOpen(x)} move={(id, dir) => move(sec, ranking, id, dir)} />;
            })}
            {free.length > 0 && <FreeGroup list={free} rows={rows} onOpen={x => onOpen(x)} />}
          </div>
        ) : (
          flat.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun fournisseur dans cette liste.</p> : (
            <FlatTable list={flat} rows={rows} sectorsOf={x => sectorsOf(state, x).map(sc => sc.name).join(', ')} onOpen={x => onOpen(x)} />
          )
        )}
      </Card>
      <Method rule="Un fournisseur se juge sur des faits, comparés à ceux d'un autre fournisseur."
        steps={[['Les critères', 'Qualité, délais, service, prix, ou ce qui compte pour l\'entreprise : la grille et les poids se règlent une fois, dans les réglages.'], ['La note', "Une note est proposée d'après les faits ; l'entreprise la valide ou l'ajuste, puis note sa décision : maintenir, surveiller, remplacer."], ['Le secours', "Deux fournisseurs par secteur : le meilleur est le principal, l'autre est le secours, éprouvé par une vraie commande."]]}
        tips={['Un fournisseur critique sans secours peut être repéré comme un risque dans les Plans B (outil 1.2).', 'Les réclamations sont facultatives : elles nourrissent la note, mais un fournisseur peut être évalué sans.']} />
      <EvaluationSettings />
    </div>
  );
}

// One supplier due for its evaluation: only the reason and a button that opens the sheet on an empty evaluation.
function ReviewRow({ x, onRate }: { x: Supplier; onRate(): void }) {
  const { state } = useStore();
  if (!state) return null;
  const next = nextReview(x, state.params);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-1 py-2 text-[11px]">
      <div><strong className="text-xs text-slate-900">{x.name}{x.strategic ? ' · critique' : ''}</strong> <span className="text-slate-500">{lastRating(x) ? `à refaire depuis le ${frDate(next)}` : 'jamais évalué'}</span></div>
      <Button kind="primary" onClick={onRate}>Évaluer</Button>
    </li>
  );
}
