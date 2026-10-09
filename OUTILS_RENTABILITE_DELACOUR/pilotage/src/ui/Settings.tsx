// General settings, two tabs: "Entreprise" (company details, working days, rights) and "Données" (SettingsData.tsx).
// Everything is saved as typed. A setting that only one tool reads lives in that tool ("Réglages de cet outil").
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Params } from '../domain/types';
import { addDays } from '../domain/base';
import { frenchHolidays } from '../domain/calendar';
import { frDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { TOOLS, type SettingsTab } from './tools';
import { Button, Field, inputCls, Modal, NumInput } from './common';
import { SettingsData } from './SettingsData';

export function Settings({ tab: first, onClose }: { tab: SettingsTab; onClose(): void }) {
  const [tab, setTab] = useState(first);
  return (
    <Modal wide title="Réglages" onClose={onClose}>
      <div className="mb-4 flex gap-1.5" role="tablist">
        {([['entreprise', 'Entreprise'], ['donnees', 'Données']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tab === id ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{label}</button>
        ))}
      </div>
      {tab === 'entreprise' ? <Company /> : <SettingsData onClose={onClose} />}
    </Modal>
  );
}

const H = ({ children }: { children: string }) => <h3 className="text-xs font-bold text-slate-900">{children}</h3>;

function Company() {
  const { state, update } = useStore();
  if (!state) return null;
  const { settings: s, params: p } = state;
  const setP = (f: (x: Params) => void) => update(d => f(d.params));
  const setCo = (k: 'address' | 'siret' | 'phone' | 'email', v: string) => setP(x => { x.company = { address: '', siret: '', phone: '', email: '', ...x.company, [k]: v }; });
  const co = { address: '', siret: '', phone: '', email: '', ...p.company };

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-slate-500">Chaque champ est enregistré dès qu'il est modifié. Les chiffres (objectif de CA, coût horaire, marges, seuils) et les règles d'un outil se règlent dans cet outil, sous « Réglages de cet outil ».</p>

      <section className="space-y-3">
        <H>Entreprise et coordonnées imprimées</H>
        <p className="text-[11px] text-slate-500">Le nom figure partout. Les coordonnées s'impriment sur les fiches de débit et les PV de réception ; l'adresse est aussi donnée aux secours (carte de poche, annuaire 1.3).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom de l'entreprise"><input className={inputCls} value={s.companyName} onChange={e => update(d => { d.settings.companyName = e.target.value; })} /></Field>
          <Field label="Adresse du site"><input className={inputCls} value={co.address} onChange={e => setCo('address', e.target.value)} /></Field>
          <Field label="SIRET"><input className={inputCls} value={co.siret} onChange={e => setCo('siret', e.target.value)} /></Field>
          <Field label="Téléphone"><input className={inputCls} value={co.phone} onChange={e => setCo('phone', e.target.value)} /></Field>
          <Field label="E-mail"><input className={inputCls} value={co.email} onChange={e => setCo('email', e.target.value)} /></Field>
        </div>
      </section>

      <WorkingDays />

      <section className="space-y-2">
        <H>Droits dans les outils</H>
        <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={!!p.teamCanDelete} onChange={e => setP(x => { x.teamCanDelete = e.target.checked; })} />En vue équipe, autoriser la suppression des fiches (sinon réservée à la direction)</label>
        <span className="block text-[11px] font-semibold text-slate-700">Outils réservés à la direction (masqués en vue équipe)</span>
        <div className="flex flex-wrap gap-1.5">
          {TOOLS.map(x => {
            const on = (p.restricted || []).includes(x.id);
            return <button key={x.id} type="button" aria-pressed={on} onClick={() => setP(d => { d.restricted = on ? (d.restricted || []).filter(y => y !== x.id) : [...(d.restricted || []), x.id]; })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{x.id} {x.label}</button>;
          })}
        </div>
        <p className="text-[11px] text-slate-500">Données personnelles (RGPD) : noms, niveaux de compétence, résultats des tests d'autonomie et réclamations nominatives sont des données personnelles. Réservez 4.2 et 4.3 à la direction si besoin, informez les salariés de l'usage de ces outils (présentation au CSE), et supprimez les fiches des personnes parties après la durée utile. La protection réelle vient des droits du dossier partagé (dossier direction).</p>
      </section>
    </div>
  );
}

// How the 24 h and 48 h deadlines are counted (complaints 2.3, red bin 5.1): all days, or working days minus public holidays and closures
function WorkingDays() {
  const { state, update } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [one, setOne] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  if (!state) return null;
  const p = state.params;
  const closed = p.closedDays || [];
  const setClosed = (xs: string[]) => update(d => { d.params.closedDays = [...new Set(xs)].sort(); });
  const holidayName = (d: string) => frenchHolidays(+d.slice(0, 4)).find(h => h.date === d)?.label;
  const addRange = () => {
    if (!from || !to || to < from) return;
    const days: string[] = [];
    for (let d = from; d <= to && days.length < 90; d = addDays(d, 1)) days.push(d);
    setClosed([...closed, ...days]); setFrom(''); setTo('');
  };

  return (
    <section className="space-y-3">
      <H>Jours ouvrés</H>
      <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={!!p.businessHours} onChange={e => update(d => { d.params.businessHours = e.target.checked; })} />Délais de 24 h et 48 h comptés en jours ouvrés (du lundi au vendredi) : réclamations 2.3, bac rouge 5.1</label>
      <p className="text-[11px] text-slate-500">Décochez si l'entreprise travaille 7 jours sur 7 : tous les jours comptent alors, samedi et dimanche compris.</p>
      {p.businessHours && (
        <div className="space-y-2">
          <span className="block text-[11px] font-semibold text-slate-700">Jours non travaillés (ne comptent pas dans les 48 h et les 24 h)</span>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Jours fériés de l'année"><NumInput className="!w-24" value={year} onChange={v => v && setYear(v)} /></Field>
            <Button onClick={() => setClosed([...closed, ...frenchHolidays(year).map(h => h.date)])}><Plus size={14} />Ajouter les jours fériés {year} (France)</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Un jour"><input type="date" className={`${inputCls} !w-auto`} value={one} onChange={e => setOne(e.target.value)} /></Field>
            <Button disabled={!one} onClick={() => { setClosed([...closed, one]); setOne(''); }}>Ajouter ce jour</Button>
            <Field label="Fermeture du"><input type="date" className={`${inputCls} !w-auto`} value={from} onChange={e => setFrom(e.target.value)} /></Field>
            <Field label="au"><input type="date" className={`${inputCls} !w-auto`} value={to} min={from} onChange={e => setTo(e.target.value)} /></Field>
            <Button disabled={!from || !to || to < from} onClick={addRange}>Ajouter la fermeture</Button>
          </div>
          {closed.length > 0
            ? <ul className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{closed.map(d => (
                <li key={d}><button type="button" onClick={() => setClosed(closed.filter(x => x !== d))} title="Retirer ce jour" className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50">{frDate(d)}{holidayName(d) ? ` · ${holidayName(d)}` : ''} ×</button></li>
              ))}</ul>
            : <p className="text-[11px] text-slate-500">Aucun jour : seuls les samedis et dimanches ne comptent pas.</p>}
        </div>
      )}
    </section>
  );
}
