// Tool 2.3 "Réclamations": written in the register within the hour, customer called back within 48 h,
// process at the origin qualified, cost of the dispute counted in the cost of non-quality (5.2), courtesy call at day 15.
import { useEffect, useState } from 'react';
import { PhoneCall, Plus, Printer, SearchCheck, Trash2 } from 'lucide-react';
import type { Complaint, State } from '../../domain/types';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATE, complaintInsights, complaintLetter, complaintState, complaintStats, CONTACT_HOURS, contactDelay, courtesyDue, deliveriesOf, newComplaint } from '../../domain/commercial';
import { QuickButton } from '../QuickForm';
import { Copy, Mail } from 'lucide-react';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { newAnalysis, newNc } from '../../domain/quality';
import { formatHours, frStamp, nowLocal, PROCESS_IDS, processLabel, workHoursBetween } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate, periodLabel, periodOfDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';
import { clientsOf } from './Devis';

type Filter = 'call' | 'open' | 'closed' | 'all';
const TYPICAL: Record<string, string> = {
  P1: 'Erreur de facturation ou de conditions de paiement, promesse non relayée aux équipes',
  P2: 'Devis flou, avenant non signé contesté à la facturation',
  P3: 'Retard non prévenu, pièce non conforme au plan',
  P4: 'Recrue pas formée, comportement ou propreté sur le site du client',
  P5: 'Défaut d\'aspect non vu au contrôle final, emballage insuffisant',
};

// Time left before 48 h, or late by
function clock(c: Complaint, now: Date, business = false) {
  const h = workHoursBetween(c.at, now, business) ?? 0;
  return h < CONTACT_HOURS ? { late: false, text: `reste ${formatHours(CONTACT_HOURS - h)}` } : { late: true, text: `en retard de ${formatHours(h - CONTACT_HOURS)}` };
}

export function Reclamations({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, author } = useStore();
  const [open, setOpen] = useState<Complaint | null>(null);
  const [filter, setFilter] = useState<Filter>('call');
  useEffect(() => { if (focus && state?.complaints[focus]) { setOpen(state.complaints[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.complaints).sort((a, b) => (a.at < b.at ? 1 : -1)).map(c => ({ c, st: complaintState(c, now, !!state.params.businessHours) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Réclamations : rappeler le client sous 48 h" text="Toute personne qui reçoit une plainte l'inscrit dans l'heure. Le responsable rappelle le client sous 48 h, écoute sans se justifier et propose une solution. Le processus en cause est identifié pour supprimer la cause.">
          <Button kind="primary" onClick={() => setOpen(newComplaint(state, author))}><Plus size={14} />Enregistrer une réclamation</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <ComplaintSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const month = periodOfDate(now);
  const s = complaintStats(state, month, now);
  const groups: Record<Filter, string[]> = { call: ['to_contact', 'late'], open: ['in_progress', 'resolved'], closed: ['closed'], all: Object.keys(COMPLAINT_STATE) };
  const shown = all.filter(x => groups[filter].includes(x.st));
  return (
    <div className="space-y-4">
      <Summary title="Les clients mécontents sont-ils rappelés sous 48 h ?" insights={complaintInsights(state, now)} tiles={<>
        <Tile title={`Reçues en ${periodLabel(month)}`} value={String(s.count)} sub={s.ratePct !== null ? `${s.ratePct.toFixed(1).replace('.', ',')} % des ${s.deliveries} livraisons` : s.top ? `surtout ${processLabel(s.top.p)}` : 'processus à qualifier'} />
        <Tile title="Rappelées sous 48 h" value={s.within48Pct === null ? '—' : `${s.within48Pct} %`} sub="objectif : toutes" tone={s.within48Pct === null ? undefined : s.within48Pct === 100 ? 'ok' : 'alert'} />
        <Tile title="Délai moyen de rappel" value={s.avgDelay === null ? '—' : formatHours(s.avgDelay)} sub="entre la réception et l'appel" />
        <Tile title="Coût des litiges du mois" value={formatValue(s.cost, '€')} sub={s.blocked ? `et ${formatValue(s.blocked, '€')} de factures bloquées` : 'avoirs, transport, reprise (5.2)'} tone={s.blocked ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Registre des réclamations" text="Une ligne par plainte, quel que soit le canal. Elle est close après l'appel de courtoisie.">
          <Button kind="primary" onClick={() => setOpen(newComplaint(state, author))}><Plus size={14} />Enregistrer une réclamation</Button>
          <QuickButton label="Saisie rapide" title="Réclamation reçue" fields={[{ key: 'client', label: 'Client', required: true }, { key: 'description', label: 'Ce qu\'il reproche', required: true }, { key: 'channel', label: 'Reçue comment (téléphone, e-mail, chantier)' }]}
            onSave={v => update(d => { const c = newComplaint(d, author); d.complaints[c.id] = { ...c, client: v.client, description: v.description, channel: /mail/i.test(v.channel || '') ? 'mail' : /chantier|site|place/i.test(v.channel || '') ? 'site' : 'tel' }; })} />
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={(['call', 'open', 'closed', 'all'] as Filter[]).map(f => [f, { call: 'À rappeler', open: 'En traitement', closed: 'Closes', all: 'Toutes' }[f], all.filter(x => groups[f].includes(x.st)).length])} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{filter === 'call' ? 'Aucun client à rappeler.' : 'Aucune réclamation dans ce filtre.'}</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ c, st }) => {
              const k = clock(c, now, !!state.params.businessHours);
              return (
                <Row key={c.id} onClick={() => setOpen(c)}
                  lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{c.ref}</span>}
                  title={`${c.client || 'Client à saisir'} · ${c.description || 'Motif à décrire'}`}
                  sub={[c.affaire, c.processId ? processLabel(c.processId) : 'Processus à qualifier', c.severity === 'majeure' ? 'majeure' : '', c.cost ? formatValue(c.cost, '€') : ''].filter(Boolean).join(' · ')}
                  right={<><span className="block font-semibold text-slate-800">{c.pilot || c.receivedBy}</span>{st === 'to_contact' || st === 'late' ? <span className={k.late ? 'font-semibold text-red-700' : 'font-semibold text-amber-800'}>{k.text}</span> : st === 'resolved' ? `courtoisie le ${frDate(courtesyDue(c))}` : `reçue le ${frDate(c.at.slice(0, 10))}`}</>}
                  badge={<StatusBadge level={COMPLAINT_STATE[st].tone} text={COMPLAINT_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Motifs de {periodLabel(month)}</h2>
          {s.byCategory.length ? <ul className="space-y-0.5 text-[11px] text-slate-700">{s.byCategory.map(x => <li key={x.key}><strong>{x.label}</strong> : {x.n}</li>)}</ul> : <p className="text-[11px] text-slate-500">Classez le motif de chaque réclamation pour voir ce qui revient.</p>}
        </Card>
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Taux de réclamation</h2>
          <label className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">Livraisons en {periodLabel(month)}
            <NumInput className="!w-20 !py-1 text-right" value={deliveriesOf(state, month)} aria-label="Nombre de livraisons du mois" onChange={v => update(d => { d.params.monthDeliveries = { ...(d.params.monthDeliveries || {}), [month]: v ?? 0 }; })} />
            <span className="text-slate-500">(compté depuis les PV de réception 3.4 si non saisi)</span>
          </label>
          <p className="text-[11px] text-slate-700">{s.ratePct === null ? 'Saisissez le nombre de livraisons.' : `${s.count} réclamation(s) pour ${s.deliveries} livraison(s) : ${s.ratePct.toFixed(1).replace('.', ',')} %.`}</p>
        </Card>
      </div>
      <FeedBox tool="2.3" period={month} />
      <Method rule="Un client mécontent rappelé sous 48 h est un client gardé ; un client ignoré bloque la facture. Trouver le processus en cause supprime la cause."
        steps={[['Inscrire dans l\'heure', 'Toute personne qui reçoit une plainte (téléphone, e-mail, chantier) l\'inscrit ici.'], ['Rappeler sous 48 h', 'Écouter sans se justifier, s\'excuser, proposer une solution de dépannage.'], ['Qualifier et clore', 'Trouver le processus en cause, lancer la correction, appeler le client 15 jours plus tard.']]} />
      {open && <ComplaintSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

export function ComplaintSheet({ initial, onClose, nav }: { initial: Complaint; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [c, setC] = useState<Complaint>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const now = new Date();
  const isNew = !state.complaints[c.id];
  const set = (x: Partial<Complaint>) => setC(y => ({ ...y, ...x }));
  const biz = !!state.params.businessHours;
  const st = complaintState(c, now, biz);
  const k = clock(c, now, biz);
  const delay = contactDelay(c);
  const valid = () => { if (!c.client.trim() || !c.description.trim()) { setError('Indiquez le client et le motif.'); return false; } return true; };
  const close = () => { if (JSON.stringify(c) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.complaints[c.id] = c; }); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer la réclamation ${c.ref} ?`)) { update(d => { delete d.complaints[c.id]; }); onClose(); } };
  const toNc = () => {
    if (!valid()) return;
    if (c.ncId && state.ncs[c.ncId]) { update(d => { d.complaints[c.id] = c; }); onClose(); nav.tool('5.1', c.ncId); return; }
    const n = { ...newNc(state, author), origin: 'client' as const, item: [c.affaire, c.client].filter(Boolean).join(', '), description: c.description, processId: c.processId, complaintId: c.id };
    update(d => { d.complaints[c.id] = { ...c, ncId: n.id }; d.ncs[n.id] = n; });
    onClose();
    nav.tool('5.1', n.id);
  };
  const toAnalysis = () => {
    if (!valid()) return;
    if (c.analysisId && state.analyses[c.analysisId]) { update(d => { d.complaints[c.id] = c; }); onClose(); nav.tool('5.3', c.analysisId); return; }
    const a = { ...newAnalysis(state, { kind: 'complaint', id: c.id }, `${c.client} : ${c.description}`, c.processId || 'P2'), pilot: c.pilot };
    update(d => { d.complaints[c.id] = { ...c, analysisId: a.id }; d.analyses[a.id] = a; });
    onClose();
    nav.tool('5.3', a.id);
  };
  const linkedNc = c.ncId ? state.ncs[c.ncId] : undefined;
  const linkedAn = c.analysisId ? state.analyses[c.analysisId] : undefined;

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouvelle réclamation' : `Réclamation ${c.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">Reçue le {frStamp(c.at)} <StatusBadge level={COMPLAINT_STATE[st].tone} text={COMPLAINT_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. La plainte, telle que le client l'exprime</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client"><input className={inputCls} value={c.client} list="clients-cp" onChange={e => set({ client: e.target.value })} /></Field>
            <Field label="Affaire ou commande"><input className={inputCls} value={c.affaire} onChange={e => set({ affaire: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Motif factuel"><input className={inputCls} value={c.description} onChange={e => set({ description: e.target.value })} /></Field></div>
            <Field label="Reçue le"><input type="datetime-local" className={inputCls} value={c.at} onChange={e => set({ at: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Canal">
                <select className={inputCls} value={c.channel} onChange={e => set({ channel: e.target.value as Complaint['channel'] })}>
                  <option value="">—</option><option value="tel">Téléphone</option><option value="mail">E-mail</option><option value="site">Sur place</option><option value="courrier">Courrier</option>
                </select>
              </Field>
              <Field label="Gravité">
                <select className={inputCls} value={c.severity} onChange={e => set({ severity: e.target.value as Complaint['severity'] })}>
                  <option value="mineure">Mineure</option><option value="majeure">Majeure</option>
                </select>
              </Field>
            </div>
            <Field label="Reçue par"><input className={inputCls} value={c.receivedBy} list="people" onChange={e => set({ receivedBy: e.target.value })} /></Field>
            <Field label="Pilote de la résolution"><input className={inputCls} value={c.pilot} list="people" onChange={e => set({ pilot: e.target.value })} /></Field>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubTitle>2. Rappeler le client sous {CONTACT_HOURS} h</SubTitle>
            {!c.contactedAt ? <span className={`text-[11px] font-semibold ${k.late ? 'text-red-700' : 'text-amber-800'}`}>{k.text}</span>
              : <span className={`text-[11px] font-semibold ${(delay ?? 0) <= CONTACT_HOURS ? 'text-emerald-700' : 'text-red-700'}`}>Rappelé en {formatHours(delay ?? 0)}</span>}
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_2fr]">
            <Field label="Client rappelé le">
              <span className="flex gap-1.5"><input type="datetime-local" className={inputCls} value={c.contactedAt} onChange={e => set({ contactedAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ contactedAt: nowLocal() })}><PhoneCall size={13} />Maintenant</Button></span>
            </Field>
            <Field label="Solution immédiate proposée au client"><input className={inputCls} value={c.immediate} placeholder="Ex. : remplacement sous 24 h, avoir, passage d'un technicien" onChange={e => set({ immediate: e.target.value })} /></Field>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>3. Processus en cause et coût</SubTitle>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Processus à l'origine" hint={c.processId ? `Typique : ${TYPICAL[c.processId]}.` : 'Qualifier le processus permet de supprimer la cause.'}>
              <select className={inputCls} value={c.processId} onChange={e => set({ processId: e.target.value })}>
                <option value="">À qualifier</option>
                {PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Coût direct du litige (€ HT)" hint="Avoir, transport express, reprise."><NumInput value={c.cost} onChange={v => set({ cost: v })} /></Field>
            <Field label="Motif">
              <select className={inputCls} value={c.category || ''} onChange={e => set({ category: e.target.value as Complaint['category'] })}>
                <option value="">À classer</option>{Object.entries(COMPLAINT_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Facture bloquée par le client (€ HT)" hint="Montant qu'il ne paie pas tant que le litige dure."><NumInput value={c.blockedInvoice ?? null} onChange={v => set({ blockedInvoice: v })} /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={toNc}>{linkedNc ? `Fiche du bac rouge ${linkedNc.ref}` : 'Déclarer au bac rouge (5.1)'}</Button>
            <Button onClick={toAnalysis}><SearchCheck size={14} />{linkedAn ? `Atelier ${linkedAn.ref}` : 'Ouvrir un atelier 5 Pourquoi'}</Button>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>Écrire au client</SubTitle>
          {(['ack', 'close'] as const).map(kind => { const text = complaintLetter(c, kind, state.settings.companyName); return (
            <div key={kind} className="space-y-1 rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] font-semibold text-slate-700">{kind === 'ack' ? 'Accusé de réception (dès la réception)' : 'Clôture (après la solution)'}</div>
              <p className="text-[11px] text-slate-700">{text}</p>
              <div className="flex gap-2">
                <Button className="!px-2 !py-1" onClick={() => navigator.clipboard?.writeText(text).catch(() => setError('Copie impossible : sélectionnez le texte à la main.'))}><Copy size={13} />Copier</Button>
                <a href={`mailto:?subject=${encodeURIComponent(`Votre réclamation ${c.ref}`)}&body=${encodeURIComponent(text)}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Mail size={13} />E-mail</a>
              </div>
            </div>
          ); })}
        </section>

        {(() => { const others = Object.values(state.complaints).filter(x => x.id !== c.id && c.client.trim() && x.client.trim().toLowerCase() === c.client.trim().toLowerCase()).sort((a, b) => (a.at < b.at ? 1 : -1)); return others.length > 0 && (
          <section className="space-y-1">
            <SubTitle>Historique de ce client ({others.length})</SubTitle>
            <ul className="space-y-0.5 text-[11px] text-slate-700">{others.slice(0, 6).map(x => <li key={x.id}><span className="font-mono">{frDate(x.at.slice(0, 10))}</span> · {x.ref} · {x.description}</li>)}</ul>
          </section>
        ); })()}

        <section className="space-y-2">
          <SubTitle>4. Clôture</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Problème réglé le"><input type="date" className={inputCls} value={c.resolvedAt} onChange={e => set({ resolvedAt: e.target.value })} /></Field>
            <Field label="Appel de courtoisie le" hint={c.resolvedAt ? `Prévu vers le ${frDate(courtesyDue(c))} : le client est-il satisfait ?` : undefined}>
              <span className="flex gap-1.5"><input type="date" className={inputCls} value={c.courtesyAt} disabled={!c.resolvedAt} onChange={e => set({ courtesyAt: e.target.value })} /><Button className="shrink-0 !px-2" disabled={!c.resolvedAt} onClick={() => set({ courtesyAt: isoDate(new Date()) })}>Aujourd'hui</Button></span>
            </Field>
          </div>
        </section>
      </div>
      <datalist id="clients-cp">{clientsOf(state as State).map(x => <option key={x} value={x} />)}</datalist>
    </Modal>
  );
}
