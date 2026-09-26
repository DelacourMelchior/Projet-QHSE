// Tool 3.4 "Réceptions": self-inspection at each of the 4 milestones (a doubt stops the job), release signed before loading,
// acceptance report signed with the customer on delivery day: at most 5 % held back for a minor reservation, lifted within 7 days.
import { useEffect, useState } from 'react';
import { Check, FileDown, Plus, Printer, Trash2, X } from 'lucide-react';
import type { Delivery, Milestone, State } from '../../domain/types';
import { newNc } from '../../domain/quality';
import { amountFromQuote, DELIVERY_STATE, deliveryInsights, deliveryState, LIFT_DAYS, liftDue, MAX_RETENTION, newDelivery, split, templatesOf } from '../../domain/operations';
import { feedbackState, FEEDBACK_STATE, newFeedback } from '../../domain/commercial';
import { coordsOf } from '../../domain/docPdf';
import { SignaturePad } from '../SignaturePad';
import { PhotoBox } from '../PhotoBox';
import { applyOperationsExample } from '../../domain/operationsExamples';
import { pvPdf } from '../../domain/operationsPdf';
import { sum } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';
import { clientsOf } from '../commercial/Devis';

type Filter = 'open' | 'done' | 'all';
const DONE = ['accepted', 'lifted'];

export function Receptions({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Delivery | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.deliveries[focus]) { setOpen(state.deliveries[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.deliveries).sort((a, b) => (a.ref < b.ref ? 1 : -1)).map(d => ({ d, st: deliveryState(d, now) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Réceptions : ne pas transmettre de défaut, faire signer le jour même" text="Chaque opérateur valide son travail à chaque jalon avant de passer la pièce. Le responsable libère avant le chargement. Le client signe le PV de réception le jour de la livraison : 95 % payables tout de suite, 5 % au plus retenus pour une réserve mineure levée sous 7 jours.">
          <Button kind="primary" onClick={() => setOpen(newDelivery())}><Plus size={14} />Nouvelle commande à suivre</Button>
          <Button onClick={() => update(d => applyOperationsExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <DeliverySheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const received = all.filter(x => x.d.reception.result);
  const clean = received.filter(x => x.d.reception.result === 'sans').length;
  const reserves = all.filter(x => x.st === 'reserve' || x.st === 'reserve_late');
  const held = sum(all.map(x => split(x.d)?.held));
  const shown = all.filter(x => filter === 'all' || (filter === 'done') === DONE.includes(x.st));
  return (
    <div className="space-y-4">
      <Summary title="Les livraisons sont-elles acceptées et payées ?" insights={deliveryInsights(state, now)} tiles={<>
        <Tile title="Reçues sans réserve" value={received.length ? `${Math.round(clean / received.length * 100)} %` : '—'} sub={`${clean} sur ${received.length} réception(s)`} tone={received.length ? (clean === received.length ? 'ok' : 'warn') : undefined} />
        <Tile title="Réserves à lever" value={String(reserves.length)} sub={`${reserves.filter(x => x.st === 'reserve_late').length} au-delà de ${LIFT_DAYS} jours`} tone={reserves.some(x => x.st === 'reserve_late') ? 'alert' : reserves.length ? 'warn' : undefined} />
        <Tile title="Montant retenu" value={formatValue(held, '€')} sub="en attente de la levée des réserves" tone={held ? 'warn' : undefined} />
        <Tile title="En fabrication" value={String(all.filter(x => ['in_progress', 'blocked', 'to_release'].includes(x.st)).length)} sub={`${all.filter(x => x.st === 'blocked').length} jalon(s) non conforme(s)`} tone={all.some(x => x.st === 'blocked') ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Commandes suivies" text="Un contrôle à chaque jalon, une libération signée, un PV de réception émargé sur place.">
          <Button kind="primary" onClick={() => setOpen(newDelivery())}><Plus size={14} />Nouvelle commande</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En cours', all.filter(x => !DONE.includes(x.st)).length], ['done', 'Réceptionnées', all.filter(x => DONE.includes(x.st)).length], ['all', 'Toutes', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucune commande dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ d, st }) => (
              <Row key={d.id} onClick={() => setOpen(d)}
                lead={<span className="flex w-[92px] shrink-0 gap-0.5">{d.milestones.map((m, i) => <span key={i} title={`${m.label} : ${m.ok === null ? 'à contrôler' : m.ok ? 'conforme' : 'non conforme'}`} className={`h-2 flex-1 rounded-full ${m.ok === null ? 'bg-slate-200' : m.ok ? 'bg-emerald-600' : 'bg-red-600'}`} />)}</span>}
                title={`${d.ref || 'Commande'} · ${d.client || 'Client à saisir'} · ${d.item}`}
                sub={d.reception.result === 'reserve' ? `Réserve : ${d.reception.reserve}${d.reception.liftedAt ? ' (levée)' : ` · à lever avant le ${frDate(liftDue(d))}`}` : d.releasedAt ? `Libéré le ${frDate(d.releasedAt)} par ${d.releasedBy}` : `${d.milestones.filter(m => m.ok).length} jalon(s) sur ${d.milestones.length} contrôlé(s)`}
                right={d.reception.amount !== null ? <><span className="block font-mono font-semibold text-slate-800">{formatValue(d.reception.amount, '€')}</span>{split(d)?.held ? `dont ${formatValue(split(d)!.held, '€')} retenus` : ''}</> : undefined}
                badge={<StatusBadge level={DELIVERY_STATE[st].tone} text={DELIVERY_STATE[st].label} />} />
            ))}
          </ul>
        )}
      </Card>
      <Method rule="Je ne reçois pas un défaut, je ne fabrique pas un défaut, je ne transmets pas un défaut au client."
        steps={[['Autocontrôle à chaque jalon', "Chacun valide son travail avant de passer la pièce ; au moindre doute, arrêt."], ['Libération avant expédition', 'Le responsable signe la libération avant le chargement du véhicule.'], ['PV émargé sur place', 'Date, nom lisible et signature du client ; photo du PV et facture le jour même.']]}
        tips={[`Ne jamais laisser bloquer 100 % d'une facture pour un détail : 95 % payés tout de suite, ${MAX_RETENTION} % au plus levés sous ${LIFT_DAYS} jours.`]} />
      {open && <DeliverySheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function DeliverySheet({ initial, onClose, nav }: { initial: Delivery; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [d, setD] = useState<Delivery>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.deliveries[d.id];
  const set = (x: Partial<Delivery>) => setD(y => ({ ...y, ...x }));
  const setR = (x: Partial<Delivery['reception']>) => set({ reception: { ...d.reception, ...x } });
  const setM = (i: number, x: Partial<Milestone>) => set({ milestones: d.milestones.map((m, j) => (j === i ? { ...m, ...x } : m)) });
  const st = deliveryState(d);
  const today = isoDate(new Date());
  const allOk = d.milestones.every(m => m.ok === true);
  const sp = split(d);
  const close = () => { if (JSON.stringify(d) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (!d.ref.trim() && !d.client.trim()) return setError('Indiquez la commande ou le client.'); update(x => { x.deliveries[d.id] = d; }); onClose(); };
  const remove = () => { if (window.confirm(`Supprimer le suivi de ${d.ref || 'cette commande'} ?`)) { update(x => { delete x.deliveries[d.id]; }); onClose(); } };
  const toBin = (m: Milestone) => {
    const n = newNcFor(d, m, author, state);
    update(x => { x.deliveries[d.id] = d; x.ncs[n.id] = n; });
    onClose();
    nav.tool('5.1', n.id);
  };
  const pdf = () => downloadFile(`PV-reception-${fileSlug(d.ref || d.client)}.pdf`, pvPdf(d, { company: state.settings.companyName, date: new Date(), coords: coordsOf(state.params) }), 'application/pdf');

  return (
    <Modal xwide onClose={close} title={isNew ? 'Nouvelle commande à suivre' : `${d.ref} · ${d.client}`}
      subtitle={<StatusBadge level={DELIVERY_STATE[st].tone} text={DELIVERY_STATE[st].label} />}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />PV de réception</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-4">
          <Field label="Commande n°"><input className={`${inputCls} font-mono`} value={d.ref} onChange={e => set({ ref: e.target.value })} /></Field>
          <Field label="Client"><input className={inputCls} value={d.client} list="clients-dl" onChange={e => set({ client: e.target.value })} /></Field>
          <Field label="Livrable"><input className={inputCls} value={d.item} onChange={e => set({ item: e.target.value })} /></Field>
          <Field label="Quantité"><NumInput value={d.qty} onChange={v => set({ qty: v })} /></Field>
          <Field label="Devis d'origine (2.1)">
            <select className={inputCls} value={d.quoteId || ''} onChange={e => { const id = e.target.value; const q = state.quotes[id]; set({ quoteId: id || undefined, ...(q && !d.client ? { client: q.client } : {}), ...(q && !d.item ? { item: q.object } : {}) }); }}>
              <option value="">Aucun</option>{Object.values(state.quotes).filter(q => q.status === 'won').map(q => <option key={q.id} value={q.id}>{q.ref} · {q.client}</option>)}
            </select>
          </Field>
          <Field label="Type de jalons">
            <select className={inputCls} value={d.template || ''} onChange={e => { const tp = templatesOf(state.params).find(x => x.name === e.target.value); if (!tp) return; if (d.milestones.some(m => m.ok !== null) && !window.confirm('Remplacer les jalons déjà contrôlés ?')) return; set({ template: tp.name, milestones: tp.milestones.map(m => ({ ...m, measured: '', ok: null, by: '', date: '' })) }); }}>
              <option value="">Fabrication (par défaut)</option>{templatesOf(state.params).map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select>
          </Field>
        </section>
        <p className="text-[11px] text-slate-500">Sur le poste ou le chantier : imprimez le PV avant de commencer, il sert de fiche suiveuse à cocher, puis reportez les résultats ici.</p>

        <section className="space-y-2">
          <SubTitle>1. Autocontrôle aux jalons</SubTitle>
          <ol className="space-y-1.5">
            {d.milestones.map((m, i) => (
              <li key={i} className={`grid items-center gap-1.5 rounded-lg border p-1.5 sm:grid-cols-[1fr_1.2fr_1fr_1fr_auto_auto] ${m.ok === false ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
                <input className={`${inputCls} font-semibold`} value={m.label} aria-label={`Jalon ${i + 1}`} onChange={e => setM(i, { label: e.target.value })} />
                <input className={inputCls} value={m.point} placeholder="Point contrôlé" aria-label={`Point contrôlé au jalon ${i + 1}`} onChange={e => setM(i, { point: e.target.value })} />
                <input className={inputCls} value={m.requirement} placeholder="Exigence du plan" aria-label={`Exigence du jalon ${i + 1}`} onChange={e => setM(i, { requirement: e.target.value })} />
                <input className={inputCls} value={m.measured} placeholder="Valeur mesurée" aria-label={`Valeur mesurée au jalon ${i + 1}`} onChange={e => setM(i, { measured: e.target.value })} />
                <div className="flex gap-1" role="radiogroup" aria-label={`Conformité du jalon ${i + 1}`}>
                  <button type="button" role="radio" aria-checked={m.ok === true} title="Conforme" onClick={() => setM(i, m.ok === true ? { ok: null, by: '', date: '' } : { ok: true, by: author, date: today })} className={`rounded-lg border p-1 ${m.ok === true ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-500'}`}><Check size={14} /></button>
                  <button type="button" role="radio" aria-checked={m.ok === false} title="Non conforme" onClick={() => setM(i, m.ok === false ? { ok: null, by: '', date: '' } : { ok: false, by: author, date: today })} className={`rounded-lg border p-1 ${m.ok === false ? 'border-red-700 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-500'}`}><X size={14} /></button>
                </div>
                <span className="text-[11px] text-slate-500">{m.by ? `${m.by}, ${frDate(m.date)}` : ''}</span>
                {m.ok === false && (
                  <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-red-700 sm:col-span-6">Non conforme : ne pas passer au jalon suivant.
                    <button type="button" className="underline" onClick={() => toBin(m)}>Déclarer au bac rouge (5.1)</button>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2">
          <SubTitle>2. Libération avant expédition</SubTitle>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <Field label="Libéré par"><input className={inputCls} value={d.releasedBy} list="people" onChange={e => set({ releasedBy: e.target.value })} /></Field>
            <Field label="Le"><input type="date" className={inputCls} value={d.releasedAt} onChange={e => set({ releasedAt: e.target.value })} /></Field>
            <Button disabled={!allOk || !!d.releasedAt} onClick={() => set({ releasedBy: d.releasedBy || author, releasedAt: today })}><Check size={14} />Libérer aujourd'hui</Button>
          </div>
          {!allOk && !d.releasedAt && <p className="text-[11px] text-slate-500">La libération se fait quand les 4 jalons sont conformes.</p>}
        </section>

        <section className="space-y-2">
          <SubTitle>3. PV de réception, signé sur place</SubTitle>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Réceptionné le"><input type="date" className={inputCls} value={d.reception.date} onChange={e => setR({ date: e.target.value })} /></Field>
            <Field label="Par (nom lisible)"><input className={inputCls} value={d.reception.name} onChange={e => setR({ name: e.target.value })} /></Field>
            <Field label="Fonction"><input className={inputCls} value={d.reception.role} onChange={e => setR({ role: e.target.value })} /></Field>
            <Field label="Montant de la facture (€ HT)" hint={d.quoteId && amountFromQuote(state, d.quoteId) !== null ? `Devis + avenants acceptés : ${formatValue(amountFromQuote(state, d.quoteId), '€')}` : undefined}>
              <span className="flex gap-1.5"><NumInput value={d.reception.amount} onChange={v => setR({ amount: v })} />{d.quoteId && <Button className="shrink-0 !px-2" onClick={() => setR({ amount: amountFromQuote(state, d.quoteId!) })}>Reprendre</Button>}</span>
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Résultat de la réception">
            {([['sans', 'Sans réserve'], ['reserve', 'Avec réserve mineure'], ['refus', 'Refusée']] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={d.reception.result === k} onClick={() => setR(d.reception.result === k ? { result: '' } : { result: k, date: d.reception.date || today, retentionPct: k === 'reserve' ? (d.reception.retentionPct ?? MAX_RETENTION) : d.reception.retentionPct })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${d.reception.result === k ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          {d.reception.result === 'reserve' && (
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <Field label="Réserve, précise"><input className={inputCls} value={d.reception.reserve} onChange={e => setR({ reserve: e.target.value })} /></Field>
              <Field label="Retenue (%)" hint={`${MAX_RETENTION} % au plus`}><NumInput value={d.reception.retentionPct} onChange={v => setR({ retentionPct: v })} /></Field>
              <Field label="Réserve levée le" hint={d.reception.date ? `À lever avant le ${frDate(liftDue(d))}` : undefined}><input type="date" className={inputCls} value={d.reception.liftedAt} onChange={e => setR({ liftedAt: e.target.value })} /></Field>
              {d.reception.liftedAt && <Field label="Levée constatée par (client)"><input className={inputCls} value={d.liftSignedBy || ''} onChange={e => set({ liftSignedBy: e.target.value })} /></Field>}
              {d.reception.liftedAt && <div className="max-w-xs"><PhotoBox value={d.liftPhoto || ''} label="Photo de la reprise" onChange={v => set({ liftPhoto: v })} /></div>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <SignaturePad label="Signature de l'entreprise" value={d.signCompany} onChange={v => set({ signCompany: v })} />
            <SignaturePad label="Signature du client" value={d.signClient} onChange={v => set({ signClient: v })} />
            <div className="space-y-1"><span className="block text-[11px] font-semibold text-slate-700">Ou photo du PV papier signé</span><PhotoBox value={d.pvPhoto || ''} label="PV signé" onChange={v => set({ pvPhoto: v })} /></div>
          </div>
          <p className="text-[11px] text-slate-500">La règle 95/5 ne s'applique que si elle figure dans vos conditions générales ou le devis accepté (verrou P1 du devis).</p>
          {(d.reception.retentionPct ?? 0) > MAX_RETENTION && d.reception.result === 'reserve' && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Retenue supérieure à {MAX_RETENTION} % : une réserve mineure ne justifie pas de bloquer plus.</p>}
          {sp && d.reception.result && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">Payable tout de suite : <strong className="font-mono">{formatValue(sp.now, '€')}</strong>{sp.held ? <> · retenu jusqu'à la levée : <strong className="font-mono">{formatValue(sp.held, '€')}</strong></> : null}</p>}
        </section>

        <section className="space-y-2">
          <SubTitle>4. Bilan de fin d'affaire (outil 2.4)</SubTitle>
          {(() => { const fb = Object.values(state.feedbacks).find(f => f.deliveryId === d.id); if (fb) { const st = feedbackState(fb, state); return <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">Bilan de {fb.client} · {FEEDBACK_STATE[st].label}<button type="button" className="font-semibold text-delacour-primary underline" onClick={() => { update(x => { x.deliveries[d.id] = d; }); onClose(); nav.tool('2.4', fb.id); }}>Ouvrir le bilan</button></p>; }
            return <Button onClick={() => { const f = { ...newFeedback(), deliveryId: d.id, quoteId: d.quoteId, client: d.client, affaire: d.ref || d.item, contact: d.reception.name, date: d.reception.date || isoDate(new Date()) }; update(x => { x.deliveries[d.id] = d; x.feedbacks[f.id] = f; }); onClose(); nav.tool('2.4', f.id); }}>Poser les 3 questions au client</Button>; })()}
          <p className="text-[11px] text-slate-500">Même moment, une seule visite : le bilan se fait à la signature du PV.</p>
        </section>
      </div>
      <datalist id="clients-dl">{clientsOf(state).map(x => <option key={x} value={x} />)}</datalist>
    </Modal>
  );
}

// A red-bin record for a milestone found out of order
function newNcFor(d: Delivery, m: Milestone, by: string, s: State) {
  return { ...newNc(s, by), where: m.label, item: [d.item, d.ref, d.client].filter(Boolean).join(', '), description: `${m.point} : ${m.measured || 'non conforme'} (exigence : ${m.requirement})`, processId: 'P3' };
}
