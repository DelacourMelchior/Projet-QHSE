// Crisis directory: the numbers printed on the reflex cards and on the first page of the crisis binder.
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { Contact } from '../domain/types';
import { frDate, isoDate, parseDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, inputCls, Modal } from './common';

const old = (iso: string) => { const d = parseDate(iso); return !d || Date.now() - d.getTime() > 365 * 86400000; };

export function Annuaire({ onClose }: { onClose(): void }) {
  const { state, update } = useStore();
  if (!state) return null;
  const contacts = Object.values(state.contacts).sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
  const usedBy = (id: string) => Object.values(state.risks).filter(r => r.contactIds.includes(id) || r.notifyIds.includes(id));
  const set = (id: string, patch: Partial<Contact>) => update(d => { d.contacts[id] = { ...d.contacts[id], ...patch }; });
  const add = () => {
    const c: Contact = { id: `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: '', role: '', company: '', phone: '', always: false, verifiedAt: '' };
    update(d => { d.contacts[c.id] = c; });
  };
  const remove = (c: Contact) => {
    const n = usedBy(c.id).length;
    if (!window.confirm(n ? `${c.name || 'Ce contact'} figure sur ${n} fiche(s) réflexe(s). Le supprimer de l'annuaire et de ces fiches ?` : `Supprimer ${c.name || 'ce contact'} ?`)) return;
    update(d => {
      delete d.contacts[c.id];
      Object.values(d.risks).forEach(r => { r.contactIds = r.contactIds.filter(x => x !== c.id); r.notifyIds = r.notifyIds.filter(x => x !== c.id); });
    });
  };

  return (
    <Modal wide title="Annuaire de crise" subtitle="Un numéro modifié ici est à jour sur toutes les fiches réflexes." onClose={onClose}
      footer={<><Button onClick={add} className="mr-auto"><Plus size={14} />Ajouter un contact</Button><Button kind="primary" onClick={onClose}>Terminer</Button></>}>
      <div className="space-y-3">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          Préférez les numéros professionnels et prévenez les personnes que leur numéro figure dans le classeur de crise (RGPD).
          Un numéro se vérifie en l'appelant, par exemple pendant le test du Plan B.
        </p>
        {contacts.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun contact. Ajoutez le prestataire informatique, la banque, l'assureur, les confrères et les clients à prévenir.</p> : (
          <>
          <div className="hidden grid-cols-4 gap-1.5 px-2.5 text-[11px] font-semibold text-slate-500 sm:grid"><span>Société</span><span>Nom</span><span>Fonction</span><span>Téléphone</span></div>
          <ul className="space-y-2">
            {contacts.map(c => {
              const uses = usedBy(c.id);
              return (
                <li key={c.id} className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
                  <div className="grid gap-1.5 sm:grid-cols-4">
                    <input className={inputCls} value={c.company} placeholder="Société" aria-label="Société" onChange={e => set(c.id, { company: e.target.value })} />
                    <input className={inputCls} value={c.name} placeholder="Nom" aria-label="Nom" onChange={e => set(c.id, { name: e.target.value })} />
                    <input className={inputCls} value={c.role} placeholder="Fonction" aria-label="Fonction" onChange={e => set(c.id, { role: e.target.value })} />
                    <input className={`${inputCls} font-mono`} value={c.phone} placeholder="Téléphone" inputMode="tel" aria-label="Téléphone" onChange={e => set(c.id, { phone: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={c.always} onChange={e => set(c.id, { always: e.target.checked })} />Joignable 24 h/24</label>
                    <span className={old(c.verifiedAt) ? 'font-semibold text-amber-800' : ''}>{c.verifiedAt ? `Vérifié le ${frDate(c.verifiedAt)}` : 'Jamais vérifié'}</span>
                    <button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline" onClick={() => set(c.id, { verifiedAt: isoDate(new Date()) })}><CheckCircle2 size={13} />Vérifié aujourd'hui</button>
                    <span className="min-w-0 flex-1 truncate">{uses.length ? `Sur : ${uses.map(r => r.title).join(', ')}` : 'Sur aucune fiche'}</span>
                    <button type="button" aria-label={`Supprimer ${c.name}`} onClick={() => remove(c)} className="rounded p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </div>
    </Modal>
  );
}
