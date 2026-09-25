// Tool 1.3 "Annuaire": the numbers to call when something breaks, by category.
// The reflex cards of the Plans B (tool 1.2) take their contacts from here.
import { useState } from 'react';
import { CheckCircle2, Phone, Plus, Printer, Search, Trash2 } from 'lucide-react';
import type { Contact, ContactCategory } from '../domain/types';
import { CATEGORIES, contactLabel, toCheck } from '../domain/contacts';
import { frDate, isoDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, inputCls } from './common';

type Filter = 'all' | 'always' | 'check';
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Annuaire() {
  const { state, update } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // order fixed when the screen opens, so a row does not move while it is being typed
  const [order, setOrder] = useState<string[]>(() => Object.values(state?.contacts || {}).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))).map(c => c.id));
  if (!state) return null;
  const all = [...order.filter(id => state.contacts[id]), ...Object.keys(state.contacts).filter(id => !order.includes(id))].map(id => state.contacts[id]);
  const usedBy = (id: string) => Object.values(state.risks).filter(r => r.contactIds.includes(id) || r.notifyIds.includes(id));
  const set = (id: string, patch: Partial<Contact>) => update(d => { d.contacts[id] = { ...d.contacts[id], ...patch }; });
  const add = () => {
    const c: Contact = { id: `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, category: 'autre', name: '', role: '', company: '', phone: '', always: false, verifiedAt: '' };
    update(d => { d.contacts[c.id] = c; });
    setOrder([c.id, ...order]);
    setQ(''); setFilter('all');
  };
  const remove = (c: Contact) => {
    const n = usedBy(c.id).length;
    if (!window.confirm(n ? `${contactLabel(c)} figure sur ${n} fiche(s) réflexe(s). Le supprimer de l'annuaire et de ces fiches ?` : `Supprimer ${contactLabel(c)} ?`)) return;
    update(d => {
      delete d.contacts[c.id];
      Object.values(d.risks).forEach(r => { r.contactIds = r.contactIds.filter(x => x !== c.id); r.notifyIds = r.notifyIds.filter(x => x !== c.id); });
    });
  };
  const words = norm(q).split(/\s+/).filter(Boolean);
  const shown = all.filter(c => (filter === 'all' || (filter === 'always' ? c.always : toCheck(c)))
    && words.every(w => norm([c.company, c.name, c.role, c.phone].join(' ')).includes(w)));
  const count = { all: all.length, always: all.filter(c => c.always).length, check: all.filter(c => toCheck(c)).length };
  const FILTERS: [Filter, string][] = [['all', 'Tous'], ['always', 'Joignables 24 h/24'], ['check', 'À vérifier']];

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-delacour-primary">Annuaire</h2>
            <p className="text-[11px] text-slate-500">Les numéros à appeler quand ça casse. Les fiches réflexes des Plans B les reprennent.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button kind="primary" onClick={add}><Plus size={14} />Ajouter un contact</Button>
            <Button onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-8`} value={q} placeholder="Rechercher un nom, une société, un numéro…" aria-label="Rechercher" onChange={e => setQ(e.target.value)} />
          </div>
          {FILTERS.map(([f, l]) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${filter === f ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {l} <span className="opacity-75">{count[f]}</span>
            </button>
          ))}
        </div>

        {all.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun contact. Ajoutez le prestataire informatique, la banque, l'assureur, les confrères et les clients à prévenir.</p>
          : shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun contact ne correspond.</p> : (
            <div className="space-y-4 print:hidden">
              {CATEGORIES.map(cat => {
                const rows = shown.filter(c => c.category === cat.key);
                if (!rows.length) return null;
                return (
                  <section key={cat.key} className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-900">{cat.label} <span className="font-normal text-slate-500">{rows.length}</span></h3>
                    <ul className="space-y-2">{rows.map(c => <Row key={c.id} c={c} uses={usedBy(c.id).map(r => r.title)} set={p => set(c.id, p)} remove={() => remove(c)} />)}</ul>
                  </section>
                );
              })}
            </div>
          )}
        <p className="text-[11px] text-slate-500 print:hidden">Préférez les numéros professionnels et prévenez les personnes concernées (RGPD). Un numéro se vérifie en l'appelant, par exemple pendant le test d'un Plan B.</p>
        <PrintList contacts={shown} company={state.settings.companyName} />
      </Card>
    </div>
  );
}

function Row({ c, uses, set, remove }: { c: Contact; uses: string[]; set(p: Partial<Contact>): void; remove(): void }) {
  const stale = toCheck(c);
  return (
    <li className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
      <div className="grid gap-1.5 sm:grid-cols-[1fr_1fr_1fr_150px]">
        <input className={inputCls} value={c.company} placeholder="Société" aria-label="Société" onChange={e => set({ company: e.target.value })} />
        <input className={inputCls} value={c.name} placeholder="Nom" aria-label="Nom" onChange={e => set({ name: e.target.value })} />
        <input className={inputCls} value={c.role} placeholder="Fonction" aria-label="Fonction" onChange={e => set({ role: e.target.value })} />
        <input className={`${inputCls} font-mono`} value={c.phone} placeholder="Téléphone" inputMode="tel" aria-label="Téléphone" onChange={e => set({ phone: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <select className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]" value={c.category} aria-label="Catégorie" onChange={e => set({ category: e.target.value as ContactCategory })}>
          {CATEGORIES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={c.always} onChange={e => set({ always: e.target.checked })} />Joignable 24 h/24</label>
        <span className={stale ? 'font-semibold text-amber-800' : ''}>{c.verifiedAt ? `Vérifié le ${frDate(c.verifiedAt)}` : 'Jamais vérifié'}</span>
        <button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline" onClick={() => set({ verifiedAt: isoDate(new Date()) })}><CheckCircle2 size={13} />Vérifié aujourd'hui</button>
        {c.phone && <a href={`tel:${c.phone.replace(/[ .]/g, '')}`} className="inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline sm:hidden"><Phone size={13} />Appeler</a>}
        <span className="min-w-0 flex-1 truncate">{uses.length ? `Fiches : ${uses.join(', ')}` : 'Sur aucune fiche réflexe'}</span>
        <button type="button" aria-label={`Supprimer ${contactLabel(c)}`} onClick={remove} className="rounded p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
      </div>
    </li>
  );
}

// Printed version: a plain list by category, to post at the reception or keep in a binder
function PrintList({ contacts, company }: { contacts: Contact[]; company: string }) {
  return (
    <div className="hidden space-y-3 print:block">
      <p className="text-[11px] text-slate-600">{company ? `${company} · ` : ''}Annuaire imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      {CATEGORIES.map(cat => {
        const rows = contacts.filter(c => c.category === cat.key);
        if (!rows.length) return null;
        return (
          <table key={cat.key} className="w-full break-inside-avoid border-collapse text-left text-xs">
            <caption className="pb-1 text-left text-xs font-bold text-slate-900">{cat.label}</caption>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} className="border-b border-slate-200">
                  <td className="py-1 pr-2 font-semibold">{contactLabel(c)}</td>
                  <td className="py-1 pr-2 text-slate-600">{[c.role, c.always ? '24 h/24' : ''].filter(Boolean).join(' · ')}</td>
                  <td className="py-1 text-right font-mono font-bold">{c.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
