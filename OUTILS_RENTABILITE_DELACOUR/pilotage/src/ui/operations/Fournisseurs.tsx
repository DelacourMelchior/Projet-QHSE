// Tool 3.1 "Fournisseurs": every supplier defect claimed within 48 h with a costed debit note (hours at the hourly cost,
// scrapped material, transport), and a yearly score out of 100 (quality 40, delays 40, service 20) that sorts them in A, B, C.
import { useEffect, useState } from 'react';
import { FileDown, Plus, Printer, Star, Trash2 } from 'lucide-react';
import type { Debit, Supplier, SupplierRating } from '../../domain/types';
import {
  categoryLabel, CLASS_INFO, classOf, DEBIT_STATE, debitAmount, debitState, lastRating, newDebit, newSupplier, ratingDue, ratingScore, SUPPLIER_CATEGORIES,
  supplierInsights, supplierStats, supplierSummary,
} from '../../domain/operations';
import { applyOperationsExample } from '../../domain/operationsExamples';
import { debitPdf } from '../../domain/operationsPdf';
import { daysBetween } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

type View = 'debits' | 'suppliers';

export function Fournisseurs({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [view, setView] = useState<View>('debits');
  const [debit, setDebit] = useState<Debit | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  useEffect(() => {
    if (!focus || !state) return;
    if (state.debits[focus]) setDebit(state.debits[focus]);
    else if (state.suppliers[focus]) { setView('suppliers'); setSupplier(state.suppliers[focus]); }
    clearFocus();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const debits = Object.values(state.debits).sort((a, b) => (a.date < b.date ? 1 : -1));
  const suppliers = Object.values(state.suppliers).sort((a, b) => a.name.localeCompare(b.name));
  if (!debits.length && !suppliers.length) {
    return (
      <div className="space-y-4">
        <Empty title="Fournisseurs : ne plus payer leurs erreurs" text="Chaque défaut à la réception fait l'objet d'une réserve écrite sur le bon de livraison, puis d'une fiche de débit chiffrée envoyée sous 48 h. Une fois par an, chaque fournisseur reçoit une note sur 100 : A, B ou C.">
          <Button kind="primary" onClick={() => setDebit(newDebit(state))}><Plus size={14} />Réclamer à un fournisseur</Button>
          <Button onClick={() => setSupplier(newSupplier())}>Ajouter un fournisseur</Button>
          <Button onClick={() => update(d => applyOperationsExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {debit && <DebitSheet initial={debit} onClose={() => setDebit(null)} nav={nav} />}
        {supplier && <SupplierSheet initial={supplier} onClose={() => setSupplier(null)} nav={nav} />}
      </div>
    );
  }
  const sm = supplierSummary(state, now);
  return (
    <div className="space-y-4">
      <Summary title="Les fournisseurs paient-ils leurs erreurs ?" insights={supplierInsights(state, now)} tiles={<>
        <Tile title={`Réclamé en ${now.getFullYear()}`} value={formatValue(sm.claimed, '€')} sub="heures, matière et transport chiffrés" />
        <Tile title="Récupéré" value={formatValue(sm.recovered, '€')} sub={sm.ratePct === null ? 'avoirs reçus' : `${sm.ratePct} % du montant réclamé`} tone={sm.recovered ? 'ok' : undefined} />
        <Tile title="Fiches en cours" value={String(sm.open)} sub={sm.late ? `${sm.late} non envoyée(s) sous 48 h` : 'envoyées dans les délais'} tone={sm.late ? 'alert' : undefined} />
        <Tile title="Fournisseurs en classe C" value={String(sm.inC)} sub={`${sm.due} notation(s) annuelle(s) à faire`} tone={sm.inC ? 'alert' : sm.due ? 'warn' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title={view === 'debits' ? 'Fiches de débit' : 'Fournisseurs'} text={view === 'debits' ? 'Une fiche par défaut constaté à la réception. Réclamer sous 48 h, suivre jusqu\'à l\'avoir.' : 'Note sur 100 une fois par an : A à partir de 85, B de 70 à 84, C en dessous.'}>
          {view === 'debits' ? <Button kind="primary" onClick={() => setDebit(newDebit(state))}><Plus size={14} />Réclamer</Button> : <Button kind="primary" onClick={() => setSupplier(newSupplier())}><Plus size={14} />Ajouter un fournisseur</Button>}
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les fournisseurs, fiches de débit, instructions, équipements et réceptions par des exemples ?')) update(d => applyOperationsExample(d)); }}>Remplir avec des exemples</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={view} onChange={setView} items={[['debits', 'Fiches de débit', debits.length], ['suppliers', 'Fournisseurs', suppliers.length]]} />
        {view === 'debits' ? (debits.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucune fiche de débit.</p> : (
          <ul className="divide-y divide-slate-100">
            {debits.map(d => {
              const st = debitState(d, now);
              return (
                <Row key={d.id} onClick={() => setDebit(d)}
                  lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{d.ref}</span>}
                  title={`${state.suppliers[d.supplierId]?.name || 'Fournisseur à choisir'} · ${d.defect || 'Défaut à décrire'}`}
                  sub={[`reçu le ${frDate(d.date)}`, d.bl, d.reserveOnBl ? '' : 'sans réserve sur le BL'].filter(Boolean).join(' · ')}
                  right={<><span className="block font-mono font-semibold text-slate-800">{formatValue(debitAmount(d, state.params), '€')}</span>{d.recovered ? `récupéré ${formatValue(d.recovered, '€')}` : d.sentAt ? `envoyée le ${frDate(d.sentAt)}` : 'à envoyer'}</>}
                  badge={<StatusBadge level={DEBIT_STATE[st].tone} text={DEBIT_STATE[st].label} />} />
              );
            })}
          </ul>
        )) : (suppliers.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun fournisseur.</p> : (
          <ul className="divide-y divide-slate-100">
            {suppliers.map(x => {
              const r = lastRating(x);
              const cls = r ? classOf(ratingScore(r)) : null;
              const stt = supplierStats(state, x.id, now);
              return (
                <Row key={x.id} onClick={() => setSupplier(x)}
                  lead={<span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${cls === 'A' ? 'bg-emerald-600 text-white' : cls === 'B' ? 'bg-amber-400 text-amber-950' : cls === 'C' ? 'bg-red-600 text-white' : 'border border-dashed border-slate-400 bg-slate-100 text-slate-600'}`}>{cls || '?'}</span>}
                  title={`${x.name}${x.strategic ? ' · fournisseur unique' : ''}`}
                  sub={[categoryLabel(x.category), x.supplies, stt.count ? `${stt.count} fiche(s) de débit sur 12 mois` : ''].filter(Boolean).join(' · ')}
                  right={<><span className="block font-mono font-semibold text-slate-800">{r ? `${ratingScore(r)} / 100` : 'Non noté'}</span>{r ? `noté le ${frDate(r.date)}` : ''}</>}
                  badge={ratingDue(x, now) ? <StatusBadge level="warn" text="Notation à faire" /> : cls ? <StatusBadge level={CLASS_INFO[cls].tone} text={CLASS_INFO[cls].label} /> : undefined} />
              );
            })}
          </ul>
        ))}
      </Card>
      <Method rule="La qualité de ce que vous livrez ne dépassera jamais la qualité de ce que vos fournisseurs vous livrent."
        steps={[['Contrôle à réception', 'Tout colis vérifié sous 2 heures ; tout défaut écrit sur le bon de livraison, devant le livreur.'], ['Réclamation sous 48 h', 'Fiche de débit chiffrée, avec photos : heures de tri et de reprise, matière, transport.'], ['Bilan annuel', 'La note sert à négocier les prix, et à remplacer les fournisseurs en classe C.']]}
        tips={['Ne jamais accepter une matière critique sans son certificat matière.', 'Ne jamais reprendre en silence le travail d\'un sous-traitant : chaque heure lui est imputée.']} />
      {debit && <DebitSheet initial={debit} onClose={() => setDebit(null)} nav={nav} />}
      {supplier && <SupplierSheet initial={supplier} onClose={() => setSupplier(null)} nav={nav} />}
    </div>
  );
}

function DebitSheet({ initial, onClose, nav }: { initial: Debit; onClose(): void; nav: Nav }) {
  const { state, update } = useStore();
  const [d, setD] = useState<Debit>(() => structuredClone(initial));
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.debits[d.id];
  const set = (x: Partial<Debit>) => setD(y => ({ ...y, ...x }));
  const st = debitState(d);
  const age = daysBetween(d.date, new Date()) ?? 0;
  const today = isoDate(new Date());
  const close = () => { if (JSON.stringify(d) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!d.defect.trim()) return setError('Décrivez le défaut constaté.');
    if (!d.supplierId && !newName.trim()) return setError('Choisissez le fournisseur.');
    update(x => {
      let supplierId = d.supplierId;
      if (!supplierId) { const sp = { ...newSupplier(), name: newName.trim() }; x.suppliers[sp.id] = sp; supplierId = sp.id; }
      x.debits[d.id] = { ...d, supplierId };
    });
    onClose();
  };
  const remove = () => { if (window.confirm(`Supprimer la fiche ${d.ref} ?`)) { update(x => { delete x.debits[d.id]; }); onClose(); } };
  const pdf = () => downloadFile(`Fiche-debit-${fileSlug(d.ref)}.pdf`, debitPdf(state, d, { company: state.settings.companyName, date: new Date() }), 'application/pdf');
  const nc = d.ncId ? state.ncs[d.ncId] : undefined;

  return (
    <Modal wide onClose={close} title={isNew ? 'Réclamer à un fournisseur' : `Fiche de débit ${d.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{state.suppliers[d.supplierId]?.name || 'Fournisseur à choisir'} <StatusBadge level={DEBIT_STATE[st].tone} text={DEBIT_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf} disabled={!d.supplierId}><FileDown size={14} />Fiche à envoyer</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. À la réception</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fournisseur">
              <select className={inputCls} value={d.supplierId} onChange={e => set({ supplierId: e.target.value })}>
                <option value="">Nouveau fournisseur…</option>
                {Object.values(state.suppliers).sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            {!d.supplierId ? <Field label="Nom du nouveau fournisseur"><input className={inputCls} value={newName} onChange={e => setNewName(e.target.value)} /></Field>
              : <Field label="Bon de livraison n°"><input className={inputCls} value={d.bl} onChange={e => set({ bl: e.target.value })} /></Field>}
            <Field label="Reçu le"><input type="date" className={inputCls} value={d.date} onChange={e => set({ date: e.target.value })} /></Field>
            <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700"><input type="checkbox" checked={d.reserveOnBl} onChange={e => set({ reserveOnBl: e.target.checked })} />Réserve précise écrite sur le bon de livraison, devant le livreur</label>
            <div className="sm:col-span-2"><Field label="Défaut constaté"><input className={inputCls} value={d.defect} onChange={e => set({ defect: e.target.value })} /></Field></div>
          </div>
          {!d.reserveOnBl && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Sans réserve écrite sur le bon de livraison, le recours contre le transporteur ou le fournisseur est fragile.</p>}
          {nc && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => { update(x => { x.debits[d.id] = d; }); onClose(); nav.tool('5.1', nc.id); }}>Fiche du bac rouge {nc.ref}</button>}
        </section>
        <section className="space-y-2">
          <SubTitle>2. Le préjudice chiffré</SubTitle>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <Field label="Heures de tri et de reprise" hint={`à ${formatValue(state.params.hourlyRate, '€')} de l'heure`}><NumInput value={d.reworkHours} onChange={v => set({ reworkHours: v })} /></Field>
            <Field label="Matière, transport, tri (€ HT)"><NumInput value={d.otherCost} onChange={v => set({ otherCost: v })} /></Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">Montant réclamé : <strong className="font-mono">{formatValue(debitAmount(d, state.params), '€')} HT</strong></p>
          </div>
        </section>
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubTitle>3. Réclamation sous 48 h et avoir</SubTitle>
            {!d.sentAt && <span className={`text-[11px] font-semibold ${age > 2 ? 'text-red-700' : 'text-amber-800'}`}>{age > 2 ? `Réception il y a ${age} jours : envoyer aujourd'hui` : 'À envoyer sous 48 h'}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Fiche envoyée le"><span className="flex gap-1.5"><input type="date" className={inputCls} value={d.sentAt} onChange={e => set({ sentAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ sentAt: today })}>Auj.</Button></span></Field>
            <Field label="Réponse du fournisseur">
              <select className={inputCls} value={d.answer} disabled={!d.sentAt} onChange={e => set({ answer: e.target.value as Debit['answer'] })}>
                <option value="">En attente</option><option value="accepted">Avoir accepté</option><option value="refused">Refusé</option>
              </select>
            </Field>
            <Field label="Montant récupéré (€ HT)"><NumInput value={d.recovered} onChange={v => set({ recovered: v, recoveredAt: v ? d.recoveredAt || today : '' })} /></Field>
            <Field label="Reçu le"><input type="date" className={inputCls} value={d.recoveredAt} onChange={e => set({ recoveredAt: e.target.value })} /></Field>
          </div>
        </section>
      </div>
    </Modal>
  );
}

const emptyRating = (by: string): SupplierRating => ({ date: isoDate(new Date()), quality: 0, delay: 0, service: 0, by, note: '' });

function SupplierSheet({ initial, onClose, nav }: { initial: Supplier; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [x, setX] = useState<Supplier>(() => structuredClone(initial));
  const [rating, setRating] = useState<SupplierRating | null>(null);
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.suppliers[x.id];
  const set = (p: Partial<Supplier>) => setX(y => ({ ...y, ...p }));
  const stt = supplierStats(state, x.id);
  const r = lastRating(x);
  const close = () => { if ((JSON.stringify(x) === JSON.stringify(initial) && !rating) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!x.name.trim()) return setError('Indiquez le nom du fournisseur.');
    const final = rating ? { ...x, ratings: [...x.ratings, rating] } : x;
    update(d => { d.suppliers[final.id] = final; });
    onClose();
  };
  const remove = () => {
    const n = Object.values(state.debits).filter(d => d.supplierId === x.id).length;
    if (window.confirm(n ? `${x.name} a ${n} fiche(s) de débit, qui resteront sans fournisseur. Supprimer ?` : `Supprimer ${x.name} ?`)) { update(d => { delete d.suppliers[x.id]; }); onClose(); }
  };
  const plan = () => { if (!x.name.trim()) return; update(d => { d.suppliers[x.id] = x; }); nav.newAction({ ref: { kind: 'supplier', id: x.id }, constat: `Plan de progrès ${x.name}${r ? ` : ${ratingScore(r)}/100 (classe ${classOf(ratingScore(r))})` : ''}` }); };
  const cap = (v: number | null, max: number) => Math.max(0, Math.min(max, v ?? 0));

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouveau fournisseur' : x.name}
      subtitle={r ? <StatusBadge level={CLASS_INFO[classOf(ratingScore(r))].tone} text={`${ratingScore(r)} / 100 · ${CLASS_INFO[classOf(ratingScore(r))].label}`} /> : 'Pas encore noté'}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom"><input className={inputCls} value={x.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Catégorie">
            <select className={inputCls} value={x.category} onChange={e => set({ category: e.target.value as Supplier['category'] })}>{SUPPLIER_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
          </Field>
          <Field label="Ce qu'il fournit"><input className={inputCls} value={x.supplies} onChange={e => set({ supplies: e.target.value })} /></Field>
          <Field label="Contact"><input className={inputCls} value={x.contact} onChange={e => set({ contact: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-[11px] text-slate-700 sm:col-span-2"><input type="checkbox" checked={x.strategic} onChange={e => set({ strategic: e.target.checked })} />Fournisseur unique ou difficile à remplacer (son arrêt est un risque de l'outil 1.2)</label>
        </section>
        <section className="space-y-2">
          <SubTitle>Notation annuelle</SubTitle>
          <p className="text-[11px] text-slate-600">12 derniers mois : {stt.count} fiche(s) de débit, {formatValue(stt.claimed, '€')} réclamés, {formatValue(stt.recovered, '€')} récupérés{stt.noReserve ? `, ${stt.noReserve} sans réserve sur le BL` : ''}.</p>
          {x.ratings.length > 0 && (
            <ul className="space-y-1">
              {[...x.ratings].sort((a, b) => (a.date < b.date ? 1 : -1)).map((rt, i) => (
                <li key={`${rt.date}${i}`} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                  <span className="font-mono">{frDate(rt.date)}</span>
                  <strong className="font-mono">{ratingScore(rt)} / 100</strong>
                  <StatusBadge level={CLASS_INFO[classOf(ratingScore(rt))].tone} text={classOf(ratingScore(rt))} />
                  <span className="text-slate-500">qualité {rt.quality}/40 · délais {rt.delay}/40 · service {rt.service}/20{rt.note ? ` · ${rt.note}` : ''}{rt.by ? ` (${rt.by})` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {!rating ? <Button onClick={() => setRating(emptyRating(author))}><Star size={14} />Noter ce fournisseur</Button> : (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 sm:grid-cols-5">
              <Field label="Qualité (sur 40)"><NumInput value={rating.quality} onChange={v => setRating({ ...rating, quality: cap(v, 40) })} /></Field>
              <Field label="Délais (sur 40)"><NumInput value={rating.delay} onChange={v => setRating({ ...rating, delay: cap(v, 40) })} /></Field>
              <Field label="Service (sur 20)"><NumInput value={rating.service} onChange={v => setRating({ ...rating, service: cap(v, 20) })} /></Field>
              <Field label="Date"><input type="date" className={inputCls} value={rating.date} onChange={e => setRating({ ...rating, date: e.target.value })} /></Field>
              <div className="pt-5"><StatusBadge level={CLASS_INFO[classOf(ratingScore(rating))].tone} text={`${ratingScore(rating)} / 100 · ${classOf(ratingScore(rating))}`} /></div>
              <div className="sm:col-span-5"><Field label="Commentaire"><input className={inputCls} value={rating.note} onChange={e => setRating({ ...rating, note: e.target.value })} /></Field></div>
            </div>
          )}
          {r && classOf(ratingScore(r)) === 'C' && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
              Classe C : exiger un plan de progrès, ou référencer un second fournisseur{x.strategic ? ' (fournisseur unique : c\'est aussi un Plan B, outil 1.2)' : ''}.
              <button type="button" className="font-semibold underline" onClick={plan}>Ouvrir une action</button>
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
