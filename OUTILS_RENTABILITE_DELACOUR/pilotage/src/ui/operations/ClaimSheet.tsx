// The sheet of one claim of the company to a supplier (tool 3.1): the finding at reception, the costed damage (optional), the sending,
// the answer and the reminders, the cause and the corrective action of the supplier, the credit and the closing, and the journal.
// The people to write to are those of the supplier's organisation in the directory (1.3).
import { useState } from 'react';
import { Copy, FileDown, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import type { ClaimSeverity, Debit } from '../../domain/types';
import {
  ANSWERS, CLAIM_CHANNELS, CLAIM_SOLUTIONS, CLOSE_REASONS, claimContact, claimMail, claimSupplierName, DEBIT_STATE, debitAmount, debitState, followOrg, isFollowed, motifsOfClaims,
  OTHER_CLAIM_MOTIF, SEVERITY, SEVERITY_ORDER, severityOf, supplierCfg, supplierContacts, supplierTimeline,
} from '../../domain/suppliers';
import { debitPdf } from '../../domain/operationsPdf';
import { newId } from '../../domain/base';
import { telOf, toCheck } from '../../domain/contacts';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { PhotoBox } from '../PhotoBox';
import { Button, DeleteButton, Field, inputCls, Modal, NewTab, NumInput, StatusBadge, SubTitle, YesNo } from '../common';
import { downloadFile, fileSlug } from '../download';
import { mailtoOf, plainEmail } from '../commercial/BilanClients';   // an address typed in the directory is checked and encoded before it ends up in the link
import type { Nav } from '../tools';

// A date with its "today" button
export function DateField({ value, onChange }: { value: string; onChange(v: string): void }) {
  return <span className="flex gap-1.5"><input type="date" className={inputCls} value={value} onChange={e => onChange(e.target.value)} /><Button className="shrink-0 !px-2" onClick={() => onChange(isoDate(new Date()))}>Auj.</Button></span>;
}

export function ClaimSheet({ initial, onClose, nav }: { initial: Debit; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [d, setD] = useState<Debit>(() => structuredClone(initial));
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  const now = new Date(), today = isoDate(now), cfg = supplierCfg(state.params);
  const isNew = !state.debits[d.id];
  const set = (x: Partial<Debit>) => setD(y => ({ ...y, ...x }));
  const sup = state.suppliers[d.supplierId];
  const people = sup ? supplierContacts(state, sup) : [];
  const contact = claimContact(state, d);
  const st = debitState(d, now, state.params);
  const nc = d.ncId ? state.ncs[d.ncId] : undefined;
  const motifs = motifsOfClaims(state.params).filter(m => !m.retired || m.key === d.motif);
  const close = () => { if (JSON.stringify(d) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!d.defect.trim()) return setError('Décrivez le défaut constaté.');
    if (!d.supplierId && !newName.trim()) return setError('Choisissez le fournisseur.');
    const sid = newId('sup');
    update(x => {
      const supplierId = d.supplierId || followOrg(x, newName, 'fournisseur', 'listed', sid).id;
      const lastChase = (d.chases || []).map(c => c.date).filter(Boolean).sort().at(-1);
      x.debits[d.id] = { ...d, supplierId, supplierName: x.suppliers[supplierId]?.name || d.supplierName, followAt: lastChase || d.followAt };
    });
    onClose();
  };
  const remove = () => { if (window.confirm(`Supprimer la réclamation ${d.ref} ?`)) { update(x => { delete x.debits[d.id]; }); onClose(); } };
  const pdf = () => downloadFile(`Fiche-debit-${fileSlug(d.ref)}.pdf`, debitPdf(state, d, { company: state.settings.companyName, date: new Date() }), 'application/pdf');
  const mail = claimMail(state, d);
  const copy = () => { navigator.clipboard?.writeText(`${mail.subject}\n\n${mail.body}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => undefined); };
  const sendHint = d.sentAt ? '' : st === 'late' ? `Reçu le ${frDate(d.date)} : le délai de ${cfg.sendDays} jours ouvrés est dépassé` : `À envoyer sous ${cfg.sendDays} jours ouvrés`;
  const journal = sup && !isNew ? supplierTimeline(state, sup).filter(e => e.claimId === d.id) : [];
  const chases = d.chases || [], notes = d.notes || [];
  const radio = (on: boolean) => `rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`;

  return (
    <Modal wide onClose={close} title={isNew ? 'Réclamer à un fournisseur' : `Réclamation ${d.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{claimSupplierName(state, d.supplierId ? d : { supplierId: '', supplierName: newName.trim() || undefined })} <StatusBadge level={DEBIT_STATE[st].tone} text={DEBIT_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf} disabled={!d.supplierId}><FileDown size={14} />Fiche à envoyer</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. Constat</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fournisseur" hint={d.supplierId ? undefined : "Un fournisseur de l'annuaire (1.3), ou un nouveau nom : il est ajouté à l'annuaire."}>
              <select className={inputCls} value={d.supplierId} onChange={e => set({ supplierId: e.target.value, contactId: '' })}>
                <option value="">Autre fournisseur…</option>
                {Object.values(state.suppliers).filter(x => isFollowed(x) || x.id === d.supplierId).sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            {!d.supplierId ? <Field label="Nom du fournisseur"><input className={inputCls} value={newName} onChange={e => setNewName(e.target.value)} /></Field>
              : <Field label="Bon de livraison ou référence"><input className={inputCls} value={d.bl} onChange={e => set({ bl: e.target.value })} /></Field>}
            {!d.supplierId && <Field label="Bon de livraison ou référence"><input className={inputCls} value={d.bl} onChange={e => set({ bl: e.target.value })} /></Field>}
            <Field label="Commande n°"><input className={inputCls} value={d.orderRef || ''} onChange={e => set({ orderRef: e.target.value })} /></Field>
            <Field label="Reçu ou constaté le"><input type="date" className={inputCls} value={d.date} onChange={e => set({ date: e.target.value })} /></Field>
            <Field label="Lot, quantité ou article concerné"><input className={inputCls} value={d.lot || ''} onChange={e => set({ lot: e.target.value })} /></Field>
            <Field label="Motif">
              <select className={inputCls} value={d.motif || ''} onChange={e => set({ motif: e.target.value })}>
                <option value="">Choisir…</option>
                {motifs.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                <option value={OTHER_CLAIM_MOTIF}>Autre (précisez)</option>
              </select>
            </Field>
            {d.motif === OTHER_CLAIM_MOTIF && <Field label="Précisez le motif"><input className={inputCls} value={d.motifNote || ''} onChange={e => set({ motifNote: e.target.value })} /></Field>}
            <div className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-700">Gravité</span>
              <div role="radiogroup" aria-label="Gravité" className="flex flex-wrap gap-1.5">
                {SEVERITY_ORDER.map((k: ClaimSeverity) => <button key={k} type="button" role="radio" aria-checked={severityOf(d) === k} className={radio(severityOf(d) === k)} onClick={() => set({ severity: k })}>{SEVERITY[k].label}</button>)}
              </div>
              <span className="block text-[11px] text-slate-500">{SEVERITY[severityOf(d)].label} : {SEVERITY[severityOf(d)].hint}. Elle pèse sur la note de qualité.</span>
            </div>
            <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700"><input type="checkbox" checked={d.reserveOnBl} onChange={e => set({ reserveOnBl: e.target.checked })} />Réserve précise écrite à la réception (bon de livraison, procès-verbal…)</label>
            <div className="sm:col-span-2"><Field label="Défaut constaté"><input className={inputCls} value={d.defect} onChange={e => set({ defect: e.target.value })} /></Field></div>
            <div className="max-w-xs"><PhotoBox value={d.photo || ''} label="Photo du défaut" onChange={v => set({ photo: v })} /></div>
          </div>
          {!d.reserveOnBl && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Sans réserve écrite à la réception, le recours contre le fournisseur ou le transporteur est fragile.</p>}
          {nc && <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => { update(x => { x.debits[d.id] = d; }); nav.open('5.1', nc.id); }}>Fiche du bac rouge {nc.ref}<NewTab /></button>}
        </section>

        <section className="space-y-2">
          <SubTitle>2. Le préjudice chiffré (facultatif)</SubTitle>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <Field label="Heures perdues à reprendre ou à corriger" hint={`à ${formatValue(state.params.hourlyRate, '€')} de l'heure (réglé dans 5.2)`}><NumInput value={d.reworkHours} onChange={v => set({ reworkHours: v })} /></Field>
            <Field label="Autres coûts : pièces, déplacement, remplacement (€ HT)"><NumInput value={d.otherCost} onChange={v => set({ otherCost: v })} /></Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">Montant réclamé : <strong className="font-mono">{formatValue(debitAmount(d, state.params), '€')} HT</strong></p>
          </div>
          <p className="text-[11px] text-slate-500">Une réclamation de retard ou de service peut rester sans montant.</p>
        </section>

        <details open={!isNew || !!d.sentAt} className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-delacour-primary hover:bg-slate-50">Suivi de la réclamation : envoi, réponse, relances, cause, avoir, clôture <span className="font-normal text-slate-500">(à remplir au fil de l'eau)</span></summary>
          <div className="space-y-5 border-t border-slate-100 p-3">
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubTitle>3. Envoi au fournisseur</SubTitle>
            {sendHint && <span className={`text-[11px] font-semibold ${st === 'late' ? 'text-red-700' : 'text-amber-800'}`}>{sendHint}</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Personne à qui l'on écrit" hint={people.length ? undefined : "Aucune personne dans l'annuaire pour ce fournisseur."}>
              <select className={inputCls} value={d.contactId || ''} disabled={!sup} onChange={e => set({ contactId: e.target.value })}>
                <option value="">{contact ? `Contact principal : ${contact.name || contact.company}` : 'Aucune'}</option>
                {people.map(c => <option key={c.id} value={c.id}>{c.name || 'Sans nom'}{c.role ? ` · ${c.role}` : ''}</option>)}
              </select>
            </Field>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 self-end pb-1 text-[11px] text-slate-700">
              {contact?.phone && <a href={`tel:${telOf(contact.phone)}`} className="inline-flex items-center gap-1 font-mono font-semibold text-delacour-primary hover:underline"><Phone size={12} />{contact.phone}</a>}
              {contact?.email && <span>{contact.email}</span>}
              {contact && toCheck(contact, now) && <span className="font-semibold text-amber-800">numéro pas vérifié depuis plus d'un an</span>}
              {sup && <button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline" onClick={() => { update(x => { x.debits[d.id] = d; }); nav.open('1.3', `org:${sup.name}`); }}>Annuaire<NewTab /></button>}
            </div>
            <Field label="Envoyée par">
              <select className={inputCls} value={d.sentVia || ''} onChange={e => set({ sentVia: e.target.value })}>
                <option value="">Choisir…</option>
                {Object.entries(CLAIM_CHANNELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            {d.sentVia === 'autre' ? <Field label="Précisez"><input className={inputCls} value={d.sentViaNote || ''} onChange={e => set({ sentViaNote: e.target.value })} /></Field> : <span />}
            <Field label="Envoyée le"><DateField value={d.sentAt} onChange={v => set({ sentAt: v })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={mailtoOf(contact?.email, `?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Mail size={13} />E-mail{plainEmail(contact?.email) ? ` à ${plainEmail(contact?.email)}` : ''}</a>
            <Button onClick={copy}><Copy size={13} />{copied ? 'Message copié' : 'Copier le message'}</Button>
            <span className="text-[11px] text-slate-500">La fiche PDF et les photos se joignent à l'e-mail. Le texte se règle dans les réglages de l'outil.</span>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>4. Réponse du fournisseur et relances</SubTitle>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Réponse">
              <select className={inputCls} value={d.answer} disabled={!d.sentAt} onChange={e => { const v = e.target.value as Debit['answer']; set({ answer: v, answeredAt: v ? d.answeredAt || today : '' }); }}>
                {Object.entries(ANSWERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Réponse reçue le"><DateField value={d.answeredAt || ''} onChange={v => set({ answeredAt: v })} /></Field>
            <Field label="Solution proposée">
              <select className={inputCls} value={d.solution || ''} onChange={e => set({ solution: e.target.value })}>
                <option value="">Aucune encore</option>
                {Object.entries(CLAIM_SOLUTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            {d.solution === 'autre' ? <Field label="Précisez"><input className={inputCls} value={d.solutionNote || ''} onChange={e => set({ solutionNote: e.target.value })} /></Field> : <span />}
            <div className="sm:col-span-4"><Field label="Ce que dit le fournisseur"><input className={inputCls} value={d.answerNote || ''} onChange={e => set({ answerNote: e.target.value })} /></Field></div>
          </div>
          {d.answer === 'contested' && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Le fournisseur conteste la réclamation.</p>}
          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-slate-700">Relances</span>
            {chases.map((c, i) => (
              <div key={i} className="grid items-center gap-1.5 sm:grid-cols-[9rem_10rem_1fr_auto]">
                <input type="date" className={inputCls} value={c.date} aria-label="Date de la relance" onChange={e => set({ chases: chases.map((y, j) => (j === i ? { ...y, date: e.target.value } : y)) })} />
                <select className={inputCls} value={c.via} aria-label="Moyen de la relance" onChange={e => set({ chases: chases.map((y, j) => (j === i ? { ...y, via: e.target.value } : y)) })}>
                  {Object.entries(CLAIM_CHANNELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input className={inputCls} value={c.note} placeholder="Remarque" aria-label="Remarque" onChange={e => set({ chases: chases.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)) })} />
                <button type="button" aria-label="Retirer la relance" onClick={() => set({ chases: chases.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600">×</button>
              </div>
            ))}
            <Button className="!px-2 !py-1" disabled={!d.sentAt} onClick={() => set({ chases: [...chases, { date: today, via: d.sentVia || 'mail', note: '' }] })}><Plus size={13} />Relance</Button>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>5. Cause et action corrective du fournisseur</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cause donnée par le fournisseur"><input className={inputCls} value={d.cause || ''} onChange={e => set({ cause: e.target.value })} /></Field>
            <Field label="Action corrective promise"><input className={inputCls} value={d.supplierAction || ''} onChange={e => set({ supplierAction: e.target.value })} /></Field>
            {d.supplierAction?.trim() && <>
              <Field label="Vérifiée à une livraison suivante le"><DateField value={d.actionCheckedAt || ''} onChange={v => set({ actionCheckedAt: v })} /></Field>
              <Field label="Résultat"><YesNo label="Résultat de la vérification" labels={['Tient', 'Ne tient pas']} value={d.actionOk ?? null} onChange={v => set({ actionOk: v })} /></Field>
            </>}
          </div>
          <p className="text-[11px] text-slate-500">Un défaut qui revient (même motif sur 12 mois) est signalé comme défaut répété ; la vérification indique si l'action du fournisseur tient.</p>
        </section>

        <section className="space-y-2">
          <SubTitle>6. Avoir et clôture</SubTitle>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Montant récupéré (€ HT)"><NumInput value={d.recovered} onChange={v => set({ recovered: v, recoveredAt: v ? d.recoveredAt || today : '' })} /></Field>
            <Field label="Reçu le"><input type="date" className={inputCls} value={d.recoveredAt} onChange={e => set({ recoveredAt: e.target.value })} /></Field>
            <Field label="Clôturée le"><DateField value={d.closedAt || ''} onChange={v => set({ closedAt: v, closedReason: d.closedReason || 'resolved' })} /></Field>
            <Field label="Motif de clôture">
              <select className={inputCls} value={d.closedReason || ''} disabled={!d.closedAt} onChange={e => set({ closedReason: e.target.value })}>
                <option value="">Choisir…</option>
                {Object.entries(CLOSE_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            {d.closedAt && d.closedReason === 'autre' && <div className="sm:col-span-4"><Field label="Précisez"><input className={inputCls} value={d.closedNote || ''} onChange={e => set({ closedNote: e.target.value })} /></Field></div>}
          </div>
          {d.closedAt && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => set({ closedAt: '', closedReason: '', closedNote: '' })}>Rouvrir la réclamation</button>}
        </section>

        <section className="space-y-2">
          <SubTitle>Journal</SubTitle>
          {journal.length > 0 && <ul className="space-y-0.5 text-[11px] text-slate-700">{[...journal].reverse().map((e, i) => <li key={i}><span className="font-mono text-slate-500">{frDate(e.date)}</span> {e.text}</li>)}</ul>}
          {notes.map((n, i) => (
            <div key={i} className="grid items-center gap-1.5 sm:grid-cols-[9rem_1fr_auto]">
              <input type="date" className={inputCls} value={n.date} aria-label="Date de la note" onChange={e => set({ notes: notes.map((y, j) => (j === i ? { ...y, date: e.target.value } : y)) })} />
              <input className={inputCls} value={n.text} placeholder="Note : appel, échange, décision" aria-label="Note" onChange={e => set({ notes: notes.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)) })} />
              <button type="button" aria-label="Retirer la note" onClick={() => set({ notes: notes.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600">×</button>
            </div>
          ))}
          <Button className="!px-2 !py-1" onClick={() => set({ notes: [...notes, { date: today, text: '', by: author }] })}><Plus size={13} />Note</Button>
        </section>
          </div>
        </details>
      </div>
    </Modal>
  );
}
