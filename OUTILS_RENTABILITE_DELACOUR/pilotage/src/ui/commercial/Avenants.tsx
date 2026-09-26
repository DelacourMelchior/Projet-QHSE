// Tool 2.2 "Avenants": every extra asked by a customer is priced, agreed in writing (a text answered "OK" is enough)
// before the work starts, then invoiced. A customer pays an extra before it is done, rarely after.
import { useEffect, useState } from 'react';
import { Copy, FileDown, Mail, MessageSquare, Plus, Printer, Trash2 } from 'lucide-react';
import type { Change } from '../../domain/types';
import { agreementMessage, CHANGE_STATE, changeInsights, changeState, changeSummary, newChange, startedWithout } from '../../domain/commercial';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { changePdf } from '../../domain/commercialPdf';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import { clientsOf } from './Devis';

type Filter = 'open' | 'invoiced' | 'refused' | 'all';
const OPEN = ['to_price', 'to_send', 'waiting', 'accepted'];

export function Avenants({ focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Change | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.changes[focus]) { setOpen(state.changes[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const all = Object.values(state.changes).sort((a, b) => (a.date < b.date ? 1 : -1)).map(c => ({ c, st: changeState(c) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Avenants : chiffré, accepté, puis fait et facturé" text="Dès qu'un client demande une modification ou un supplément : chiffrer, envoyer un message court à valider par « OK », ne commencer qu'après l'accord, puis facturer. Plus de travail gratuit.">
          <Button kind="primary" onClick={() => setOpen(newChange(state))}><Plus size={14} />Nouvelle demande</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <ChangeSheet initial={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }
  const sum = changeSummary(state);
  const match = (f: Filter, st: string) => f === 'all' || (f === 'open' ? OPEN.includes(st) : f === st);
  const shown = all.filter(x => match(filter, x.st));
  return (
    <div className="space-y-4">
      <Summary title="Les suppléments sont-ils payés ?" insights={changeInsights(state)} tiles={<>
        <Tile title="Facturés cette année" value={formatValue(sum.invoiced, '€')} sub="suppléments qui auraient pu être offerts" tone={sum.invoiced ? 'ok' : undefined} />
        <Tile title="Acceptés, à facturer" value={formatValue(sum.toInvoice, '€')} sub="à mettre sur la prochaine facture" tone={sum.toInvoice ? 'warn' : undefined} />
        <Tile title="Accord attendu" value={String(sum.waiting)} sub={`${formatValue(sum.waitingAmount, '€')} en jeu`} />
        <Tile title="Commencés sans accord" value={String(sum.risky)} sub="supplément difficile à facturer" tone={sum.risky ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Avenants" text="Une ligne par demande du client. Le travail ne commence qu'avec l'accord écrit.">
          <Button kind="primary" onClick={() => setOpen(newChange(state))}><Plus size={14} />Nouvelle demande</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les devis, avenants, réclamations et bilans par des exemples ?')) update(d => applyCommercialExample(d)); }}>Remplir avec des exemples</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En cours', all.filter(x => match('open', x.st)).length], ['invoiced', 'Facturés', all.filter(x => x.st === 'invoiced').length], ['refused', 'Refusés', all.filter(x => x.st === 'refused').length], ['all', 'Tous', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun avenant dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ c, st }) => (
              <Row key={c.id} onClick={() => setOpen(c)}
                lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{c.ref}</span>}
                title={`${c.client || 'Client à saisir'} · ${c.description || 'Demande à décrire'}`}
                sub={startedWithout(c) ? <span className="font-semibold text-red-700">Travaux commencés le {frDate(c.startedAt)} sans accord écrit</span> : [c.affaire, c.sentAt && st === 'waiting' ? `envoyé le ${frDate(c.sentAt)}` : '', c.invoiceRef].filter(Boolean).join(' · ')}
                right={<><span className="block font-mono font-semibold text-slate-800">{c.price === null ? 'À chiffrer' : formatValue(c.price, '€')}</span>{c.delayDays ? `+ ${c.delayDays} jour(s)` : 'sans effet sur le délai'}</>}
                badge={<StatusBadge level={CHANGE_STATE[st].tone} text={CHANGE_STATE[st].label} />} />
            ))}
          </ul>
        )}
      </Card>
      <Method rule="Un client accepte de payer un supplément avant qu'il soit fait, jamais après la réception des travaux."
        steps={[['Chiffrer tout de suite', "Le supplément ferme et l'effet sur le délai, avant de dire oui sur le terrain."], ['Accord en 1 minute', 'Un message court par SMS ou e-mail, validé par « OK » : c\'est un accord écrit.'], ['Faire, puis facturer', 'Ne pas commencer sans l\'accord ; noter le numéro de facture quand il est facturé.']]} />
      {open && <ChangeSheet initial={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ChangeSheet({ initial, onClose }: { initial: Change; onClose(): void }) {
  const { state, update } = useStore();
  const [c, setC] = useState<Change>(() => structuredClone(initial));
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  const isNew = !state.changes[c.id];
  const set = (x: Partial<Change>) => setC(y => ({ ...y, ...x }));
  const st = changeState(c);
  const today = isoDate(new Date());
  const msg = agreementMessage(c, state.settings.companyName);
  const close = () => { if (JSON.stringify(c) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!c.client.trim() || !c.description.trim()) return setError('Indiquez le client et la modification demandée.');
    update(d => { d.changes[c.id] = c; });
    onClose();
  };
  const remove = () => { if (window.confirm(`Supprimer l'avenant ${c.ref} ?`)) { update(d => { delete d.changes[c.id]; }); onClose(); } };
  const sent = (via: Change['via']) => set({ sentAt: c.sentAt || today, via });
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); sent(c.via || 'sms'); } catch { setError('Copie impossible : sélectionnez le texte à la main.'); } };
  const pdf = () => downloadFile(`Avenant-${fileSlug(c.ref)}.pdf`, changePdf(c, { company: state.settings.companyName, date: new Date() }), 'application/pdf');

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouvelle demande du client' : `Avenant ${c.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{c.client || 'Client à saisir'} <StatusBadge level={CHANGE_STATE[st].tone} text={CHANGE_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />Bon pour accord</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. La demande</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client"><input className={inputCls} value={c.client} list="clients-av" onChange={e => set({ client: e.target.value })} /></Field>
            <Field label="Affaire"><input className={inputCls} value={c.affaire} onChange={e => set({ affaire: e.target.value })} /></Field>
            <Field label="Demandé par (côté client)"><input className={inputCls} value={c.askedBy} onChange={e => set({ askedBy: e.target.value })} /></Field>
            <Field label="Le"><input type="date" className={inputCls} value={c.date} onChange={e => set({ date: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Modification ou supplément demandé"><input className={inputCls} value={c.description} onChange={e => set({ description: e.target.value })} /></Field></div>
          </div>
        </section>
        <section className="space-y-2">
          <SubTitle>2. Le chiffrage</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Supplément ferme (€ HT)"><NumInput value={c.price} onChange={v => set({ price: v })} /></Field>
            <Field label="Effet sur le délai (jours)"><NumInput value={c.delayDays} onChange={v => set({ delayDays: v })} /></Field>
          </div>
        </section>
        <section className="space-y-2">
          <SubTitle>3. L'accord écrit, avant de commencer</SubTitle>
          <textarea readOnly className={`${inputCls} min-h-[72px] resize-y bg-slate-50`} value={msg} aria-label="Message à envoyer au client" onFocus={e => e.currentTarget.select()} />
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={c.price === null} onClick={copy}><Copy size={14} />{copied ? 'Copié' : 'Copier le message'}</Button>
            <a href={`sms:?&body=${encodeURIComponent(msg)}`} onClick={() => sent('sms')} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${c.price === null ? 'pointer-events-none opacity-50' : ''}`}><MessageSquare size={14} />SMS</a>
            <a href={`mailto:?subject=${encodeURIComponent(`Supplément ${c.affaire || c.ref}`)}&body=${encodeURIComponent(msg)}`} onClick={() => sent('mail')} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${c.price === null ? 'pointer-events-none opacity-50' : ''}`}><Mail size={14} />E-mail</a>
            {c.price === null && <span className="text-[11px] text-amber-800">Chiffrez d'abord le supplément.</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Demande envoyée le"><input type="date" className={inputCls} value={c.sentAt} onChange={e => set({ sentAt: e.target.value })} /></Field>
            <div className="space-y-1">
              <span className="block text-[11px] font-semibold text-slate-700">Réponse du client</span>
              <div className="flex gap-1" role="radiogroup" aria-label="Réponse du client">
                {([['accepted', 'Accepté'], ['refused', 'Refusé']] as const).map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={c.answer === k} onClick={() => set(c.answer === k ? { answer: '', answeredAt: '' } : { answer: k, answeredAt: c.answeredAt || today })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${c.answer === k ? (k === 'accepted' ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
                ))}
              </div>
            </div>
            {c.answer && <Field label="Réponse reçue le"><input type="date" className={inputCls} value={c.answeredAt} onChange={e => set({ answeredAt: e.target.value })} /></Field>}
          </div>
        </section>
        <section className="space-y-2">
          <SubTitle>4. Travaux et facture</SubTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Travaux commencés le"><input type="date" className={inputCls} value={c.startedAt} onChange={e => set({ startedAt: e.target.value })} /></Field>
            <Field label="Facture n°"><input className={inputCls} value={c.invoiceRef} onChange={e => set({ invoiceRef: e.target.value })} /></Field>
            <Field label="Facturé le"><input type="date" className={inputCls} value={c.invoicedAt} disabled={c.answer !== 'accepted'} onChange={e => set({ invoicedAt: e.target.value })} /></Field>
          </div>
          {startedWithout(c) && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">Travaux commencés sans accord écrit : obtenez le « OK » du client aujourd'hui.</p>}
        </section>
      </div>
      <datalist id="clients-av">{clientsOf(state).map(x => <option key={x} value={x} />)}</datalist>
    </Modal>
  );
}
