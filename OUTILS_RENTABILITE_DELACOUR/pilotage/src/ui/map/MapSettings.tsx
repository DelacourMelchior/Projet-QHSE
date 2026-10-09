// Settings of tool 1.4 (administrators only): the review delay, who sees and edits what, what the team may see.
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { RIGHTS, HIDEABLE, adminCount, orphanRights, rightKey, setMapRight } from '../../domain/cartography';
import type { MapHideable, MapRight, State } from '../../domain/types';
import { activePeople } from '../../domain/team';
import { useStore } from '../../store/StoreContext';
import { Button, inputCls, ToolSettings, Field } from '../common';

export function MapSettings() {
  const { state, update, author } = useStore();
  const [says, setSays] = useState(''), [months, setMonths] = useState<string | null>(null);
  if (!state) return null;
  const m = state.params.map || {}, rights = m.rights || {}, people = activePeople(state), orphans = orphanRights(state);
  const set = (fn: (x: NonNullable<State['params']['map']>) => void) => update(d => { d.params.map ||= {}; fn(d.params.map); });
  const give = (name: string, r: MapRight | '') => { let why = ''; update(d => { why = setMapRight(d, author, name, r); }); setSays(why); };
  const shown = m.shown || [];
  return (
    <ToolSettings title="Réglages de la cartographie">
      <Field label="Une fiche est à relire après (mois)"><input className={`${inputCls} !w-24`} type="number" min={1} max={60} value={months ?? String(m.reviewMonths ?? 12)} onChange={e => setMonths(e.target.value)}
        onBlur={() => { if (months !== null) set(x => { x.reviewMonths = Math.max(1, Math.min(60, Math.round(Number(months)) || 12)); }); setMonths(null); }} /></Field>
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-900">Droits sur la cartographie</h3>
        <p className="text-xs text-slate-600">Tant qu'aucun droit n'est choisi, tout le monde peut tout modifier. Dès qu'un droit est choisi, toute personne non listée peut seulement consulter ; la personne qui donne le premier droit reçoit d'office le droit « Administrer ».</p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Ces droits règlent ce que chacun voit et peut modifier à l'écran. Ils s'appliquent au nom choisi dans les réglages : ils ne remplacent pas une connexion sécurisée, que le cabinet met en place pour chaque client. Les données de la carte restent lisibles par tous ceux qui ont accès au dossier partagé.</p>
        {!author.trim() && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">Renseignez d'abord votre nom dans les réglages : les droits se donnent à partir de votre nom.</p>}
        <div className="grid gap-2 lg:grid-cols-2">{[...RIGHTS].reverse().map(r => {
          const inLevel = Object.keys(rights).filter(k => rights[k] === r.key), shownName = (k: string) => people.find(p => rightKey(p.name) === k)?.name ?? k;
          const addable = people.filter(p => rights[rightKey(p.name)] !== r.key);
          return (
            <section key={r.key} aria-label={r.label} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
              <div><h4 className="text-xs font-bold text-slate-900">{r.label}</h4><p className="text-xs text-slate-600">{r.hint}</p></div>
              {inLevel.length > 0 && <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{inLevel.map(k => (
                <li key={k} className="flex items-center gap-2 px-3 py-1"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">{shownName(k)}{k === rightKey(author) ? ' (vous)' : ''}{orphans.includes(k) && <span className="font-normal text-amber-900"> · n'est plus dans la liste du personnel</span>}</span>
                  <Button kind="ghost" disabled={!author.trim()} aria-label={`Retirer le droit de ${shownName(k)}`} title="Retirer le droit (la personne repasse à « non précisé »)" onClick={() => give(k, '')}><Trash2 size={14} /></Button></li>
              ))}</ul>}
              <select className={`${inputCls} !w-auto`} aria-label={`Ajouter une personne au niveau ${r.label}`} disabled={!author.trim() || !addable.length} value="" onChange={e => { if (e.target.value) give(e.target.value, r.key); }}>
                <option value="">{addable.length ? 'Ajouter une personne…' : 'Tout le monde est déjà ici'}</option>{addable.map(p => <option key={p.id} value={p.name}>{p.name}{rights[rightKey(p.name)] ? ` (actuellement : ${RIGHTS.find(x => x.key === rights[rightKey(p.name)])?.label})` : ''}</option>)}
              </select>
            </section>
          );
        })}</div>
        {people.some(p => !rights[rightKey(p.name)]) && <p className="text-xs text-slate-600">Non précisé : {people.filter(p => !rights[rightKey(p.name)]).map(p => p.name).join(', ')}.</p>}
        {says && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900">{says}</p>}
        {Object.keys(rights).length > 0 && adminCount(state) < 2 && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">{adminCount(state) ? 'Un seul administrateur : en nommer un deuxième, sinon plus personne ne peut modifier la carte pendant son absence.' : 'Aucun administrateur : personne ne peut créer ni supprimer de processus.'}</p>}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-900">Ce que l'équipe voit (droit « Consulter »)</h3>
        <p className="text-xs text-slate-600">Coché = visible par l'équipe.</p>
        <div className="flex flex-wrap gap-3">{HIDEABLE.map(h => (
          <label key={h.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={shown.includes(h.key)} onChange={e => set(x => { x.shown = e.target.checked ? [...(x.shown || []), h.key as MapHideable] : (x.shown || []).filter(k => k !== h.key); })} />{h.label}</label>
        ))}</div>
      </div>
    </ToolSettings>
  );
}
