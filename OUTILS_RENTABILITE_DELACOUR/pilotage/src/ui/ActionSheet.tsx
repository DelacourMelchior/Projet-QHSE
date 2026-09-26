// Action of the shared register: corrective (KPI in deviation, tool 1.1) or preparation of a Plan B (risk, tool 1.2).
// 5 whys (root cause) + 5M action plan, main pilot, deadline, status, effectiveness.
import { useState } from 'react';
import { Lightbulb, Plus, Trash2, X } from 'lucide-react';
import type { Action, ActionStatus, Dim5M, PlanItem, Ref } from '../domain/types';
import { effectiveness, statusAt, valueOf } from '../domain/engine';
import { riskActionEffectiveness, riskState, STATE_INFO } from '../domain/risk';
import { PREP_IDEAS } from '../domain/riskTemplates';
import { formatValue } from '../domain/numbers';
import { frDate, isoDate, periodLabel } from '../domain/periods';
import { KIND_LABEL, refLabel } from '../domain/refs';
import { analysisActionEffectiveness } from '../domain/quality';
import { useStore } from '../store/StoreContext';
import { Button, Field, inputCls, Modal, StatusBadge } from './common';

export const DIMS: { key: Dim5M; label: string; hint: string; ideas: string[] }[] = [
  { key: 'main_oeuvre', label: "Main-d'œuvre", hint: 'compétences, charge, relais', ideas: ['Former la personne concernée (tutorat de 2 h)', 'Nommer un binôme de relais sur le poste', "Rééquilibrer la charge de l'équipe sur 2 semaines", 'Point hebdo de 10 min avec le pilote'] },
  { key: 'methode', label: 'Méthode', hint: 'standard, contrôle, règle', ideas: ['Écrire le standard ou la checklist du poste', 'Ajouter un contrôle avant envoi ou livraison', 'Revoir la règle de relance ou de validation', 'Afficher le suivi du KPI chaque semaine'] },
  { key: 'materiel', label: 'Matériel', hint: 'machine, outil, logiciel', ideas: ["Maintenance préventive de l'équipement en cause", 'Paramétrer une alerte dans le logiciel (ERP, CRM)', "Doubler ou remplacer l'outillage critique", 'Détrompeur ou gabarit sur le poste'] },
  { key: 'matiere', label: 'Matière', hint: 'achats, fournisseurs, stocks', ideas: ['Contrôle à réception des lots fournisseur', 'Réclamation ou fiche débit au fournisseur', 'Référencer un second fournisseur', 'Ajuster le stock de sécurité'] },
  { key: 'milieu', label: 'Milieu', hint: 'organisation, clients, planning', ideas: ["Revoir le planning et les congés de l'équipe", 'Clarifier les délais avec le client dès le devis', 'Ranger et organiser le poste (5S)', 'Sous-traiter le pic de charge'] },
];
export const STATUS_LABEL: Record<ActionStatus, string> = { to_start: 'À lancer', in_progress: 'En cours', done: 'Réalisée', effective: 'Efficace' };
export const dimLabel = (d: Dim5M) => DIMS.find(x => x.key === d)?.label || d;

// kpiId for a corrective action; '' and riskId for the preparation of a Plan B; '' and ref for a record of tools 2.1 to 5.4
export function newAction(kpiId: string, period: string, riskId?: string, ref?: Ref, constat = ''): Action {
  const d = new Date();
  return {
    id: `act_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kpiId, ...(riskId ? { riskId } : {}), ...(ref ? { ref } : {}), period, createdAt: isoDate(d),
    constat, whys: ['', '', '', '', ''], plan: [], pilot: '', deadline: isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)),
    cost: null, status: 'to_start', closedAt: '',
  };
}

export function ActionSheet({ initial, onClose }: { initial: Action; onClose(): void }) {
  const { state, update } = useStore();
  const [a, setA] = useState<Action>(() => structuredClone(initial));
  const [ideas, setIdeas] = useState<Dim5M | null>(null);
  const [error, setError] = useState('');
  if (!state) return null;
  const k = state.kpis[a.kpiId];
  const r = a.riskId ? state.risks[a.riskId] : undefined;
  const isNew = !state.actions[a.id];
  const v = valueOf(state, a.kpiId, a.period);
  const st = k ? statusAt(state, k, a.period) : null;
  const eff = effectiveness(state, a);
  const reff = riskActionEffectiveness(state, a);
  const rst = r && STATE_INFO[riskState(state, r)];
  const an = a.ref?.kind === 'analysis' ? state.analyses[a.ref.id] : undefined;
  const refEff = analysisActionEffectiveness(state, a);
  const set = (patch: Partial<Action>) => setA(x => ({ ...x, ...patch }));
  const setPlan = (plan: PlanItem[]) => set({ plan });
  const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); set({ deadline: isoDate(d) }); };
  const endOfMonth = () => { const d = new Date(); set({ deadline: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }); };

  const close = () => { if (JSON.stringify(a) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    const plan = a.plan.filter(p => p.text.trim());
    if (!plan.length) return setError('Ajoutez au moins une action dans le plan 5M.');
    if (!a.pilot.trim()) return setError("Désignez un pilote principal : chaque plan d'action doit avoir un responsable nommé.");
    const closed = a.status === 'done' || a.status === 'effective';
    const final: Action = { ...a, plan, closedAt: closed ? (a.closedAt || isoDate(new Date())) : '' };
    update(d => { d.actions[final.id] = final; });
    onClose();
  };
  const remove = () => {
    if (!window.confirm('Supprimer cette action ?')) return;
    update(d => { delete d.actions[a.id]; });
    onClose();
  };

  return (
    <Modal wide onClose={close}
      title={r ? (isNew ? 'Nouvelle action de préparation' : 'Action de préparation du Plan B') : isNew ? 'Nouvelle action corrective' : 'Action corrective'}
      subtitle={a.ref ? <span>{KIND_LABEL[a.ref.kind]} : {refLabel(state, a.ref)}</span> : r ? <span>Risque : {r.title || 'sans titre'} {rst && <StatusBadge level={rst.tone} text={rst.label} />}</span> : k && <span>{k.name} · {periodLabel(a.period)} : <strong className="font-mono">{formatValue(v, k.unit)}</strong> (cible {k.target}) {st && <StatusBadge level={st.level} text={st.text} />}</span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">{r ? '1. Objectif' : a.ref ? '1. Constat' : '1. Constat et cause racine'}</h3>
          <Field label={r ? 'Ce que cette action doit rendre possible' : 'Constat factuel'}>
            <input className={inputCls} value={a.constat} placeholder={r ? `Plan B opérationnel : ${r.planB || 'à définir'}` : k ? `${k.name} : ${formatValue(v, k.unit)} en ${periodLabel(a.period)} (cible ${k.target})` : ''}
              onChange={e => set({ constat: e.target.value })} />
          </Field>
          {a.ref ? (an ? <p className="text-[11px] text-slate-500">Cause racine trouvée en atelier : {an.rootCause || 'à trouver dans l\'atelier 5 Pourquoi'}.</p> : null)
          : r ? <p className="text-[11px] text-slate-500">Cause racine du risque : {r.cause || 'à analyser dans la fiche du risque'}.</p> : <details className="rounded-lg border border-slate-200 bg-slate-50 p-2.5" open={a.whys.some(w => w.trim())}>
            <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Analyse des 5 pourquoi (facultative, recommandée pour une récidive)</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3, 4].map(i => (
                <Field key={i} label={i === 4 ? 'Pourquoi 5 : cause racine' : `Pourquoi ${i + 1}`}>
                  <input className={inputCls} value={a.whys[i] || ''} onChange={e => { const w = [...a.whys]; w[i] = e.target.value; set({ whys: w }); }} />
                </Field>
              ))}
            </div>
          </details>}
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-bold text-slate-900">2. Plan d'action par dimension (5M)</h3>
            <span className="text-[11px] text-slate-500">Pilote d'une action : facultatif (sinon le pilote principal)</span>
          </div>
          {DIMS.map(d => {
            const rows = a.plan.map((p, i) => ({ p, i })).filter(x => x.p.dim === d.key);
            return (
              <div key={d.key} className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><span className="text-xs font-bold text-slate-900">{d.label}</span> <span className="text-[11px] text-slate-500">{d.hint}</span></div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button kind="ghost" onClick={() => setIdeas(ideas === d.key ? null : d.key)} aria-expanded={ideas === d.key} className="!px-2 !py-1"><Lightbulb size={13} />Idées</Button>
                    <Button onClick={() => setPlan([...a.plan, { dim: d.key, text: '', pilot: '' }])} className="!px-2 !py-1"><Plus size={13} />Action</Button>
                  </div>
                </div>
                {ideas === d.key && (
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {(r ? PREP_IDEAS[d.key] : d.ideas).map(t => <button key={t} type="button" onClick={() => setPlan([...a.plan, { dim: d.key, text: t, pilot: '' }])}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950">{t}</button>)}
                  </div>
                )}
                {rows.map(({ p, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                    <input className={`${inputCls} basis-full sm:basis-auto sm:flex-1`} value={p.text} placeholder="Action concrète…" aria-label={`Action ${d.label}`}
                      onChange={e => setPlan(a.plan.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                    <input className={`${inputCls} flex-1 sm:w-36 sm:flex-none`} value={p.pilot} placeholder="Pilote" list="pilots" aria-label="Pilote de l'action"
                      onChange={e => setPlan(a.plan.map((x, j) => j === i ? { ...x, pilot: e.target.value } : x))} />
                    <button type="button" aria-label="Retirer cette action" onClick={() => setPlan(a.plan.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-600"><X size={16} /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          <Field label="Pilote principal (obligatoire)">
            <input className={inputCls} value={a.pilot} list="pilots" onChange={e => set({ pilot: e.target.value })} />
          </Field>
          <Field label="Échéance">
            <input type="date" className={inputCls} value={a.deadline} onChange={e => set({ deadline: e.target.value })} />
            <span className="flex gap-2 text-[11px]">
              <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => addDays(7)}>J+7</button>
              <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => addDays(15)}>J+15</button>
              <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={endOfMonth}>Fin de mois</button>
            </span>
          </Field>
          <Field label="Coût estimé (€ HT)">
            <input inputMode="decimal" className={inputCls} value={a.cost ?? ''} onChange={e => set({ cost: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) || 0 })} />
          </Field>
          <Field label="Statut">
            <select className={inputCls} value={a.status} onChange={e => set({ status: e.target.value as ActionStatus })}>
              {Object.entries(STATUS_LABEL).map(([key, l]) => <option key={key} value={key}>{l}</option>)}
            </select>
          </Field>
        </section>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <strong>Efficacité :</strong>{' '}
          {a.ref ? (refEff.state === 'pending' ? (an ? 'démontrée par le contrôle à J+30 du détrompeur (outil 5.4), ou constatée par le pilote (statut Efficace).' : 'constatée par le pilote une fois l\'action réalisée (statut Efficace).')
            : refEff.state === 'waiting' ? (an ? 'en attente du contrôle à J+30 (outil 5.4).' : 'à constater par le pilote (statut Efficace).')
            : `${refEff.state === 'effective' ? 'démontrée' : 'récidive constatée'} le ${frDate(refEff.date)}.`)
          : r ? (reff.state === 'pending' ? 'démontrée par le premier test réussi du Plan B après la réalisation de l\'action.'
            : reff.state === 'waiting' ? 'en attente du prochain test du Plan B.'
            : `${reff.state === 'effective' ? 'démontrée par le test' : 'test raté'} du ${frDate(reff.date)}.`)
          : eff.state === 'pending' ? 'mesurée une fois l\'action réalisée, sur le mois qui suit la clôture.'
            : eff.state === 'waiting' ? `à mesurer sur ${periodLabel(eff.period)} (valeur pas encore saisie).`
            : `${eff.state === 'effective' ? 'démontrée' : 'récidive'} en ${periodLabel(eff.period)} (${k ? formatValue(eff.value, k.unit) : eff.value}).`}
        </p>
      </div>
      <datalist id="pilots">{[...new Set(Object.values(state.actions).flatMap(x => [x.pilot, ...x.plan.map(p => p.pilot)]).filter(Boolean))].map(p => <option key={p} value={p} />)}</datalist>
    </Modal>
  );
}
