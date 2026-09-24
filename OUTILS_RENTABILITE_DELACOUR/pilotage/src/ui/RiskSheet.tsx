// Risk sheet (tool 1.2), 4 steps: what stops, why and how serious, Plan B, lock and test.
import { useState } from 'react';
import { Check, Lightbulb, Plus, Trash2, X } from 'lucide-react';
import type { Risk, RiskCost, Scale } from '../domain/types';
import {
  actionsOfRisk, gravityScale, LIKELIHOOD_SCALE, lossPerEvent, planBGain, riskState, score, STATE_INFO, suggestedGravity, testDueDate, zoneOf, ZONE_LABEL,
} from '../domain/risk';
import { FAMILIES } from '../domain/riskTemplates';
import { formatValue, parseNumber } from '../domain/numbers';
import { frDate, isoDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Field, inputCls, Modal, StatusBadge } from './common';
import { STATUS_LABEL } from './ActionSheet';

export const ZONE_STYLE = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-400 text-amber-950',
  low: 'bg-emerald-600 text-white',
} as const;

export function ScoreBadge({ r, className = '' }: { r: Pick<Risk, 'gravity' | 'likelihood'>; className?: string }) {
  const sc = r.gravity * r.likelihood;
  return <span title={`Criticité ${sc} / 16 : ${ZONE_LABEL[zoneOf(sc)]}`} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${ZONE_STYLE[zoneOf(sc)]} ${className}`}>{sc}</span>;
}

const STEPS = ['Ce qui s\'arrête', 'Pourquoi, gravité', 'Plan B', 'Fiche réflexe et test'];
const textArea = `${inputCls} min-h-[96px] resize-y`;

export function RiskSheet({ initial, startStep = 0, onClose, onNewAction, onOpenAction }: {
  initial: Risk; startStep?: number; onClose(): void; onNewAction(riskId: string): void; onOpenAction(id: string): void;
}) {
  const { state, update, teamView } = useStore();
  const [r, setR] = useState<Risk>(() => structuredClone(initial));
  const [step, setStep] = useState(startStep);
  const [ideas, setIdeas] = useState(false);
  const [error, setError] = useState('');
  const [test, setTest] = useState({ date: isoDate(new Date()), ok: true, note: '', by: '' });
  if (!state) return null;
  const isNew = !state.risks[r.id];
  const set = (patch: Partial<Risk>) => setR(x => ({ ...x, ...patch }));
  const cost: RiskCost = r.cost || { perDay: null, daysWithout: null, daysWith: null, planBCost: null };
  const setCost = (patch: Partial<RiskCost>) => set({ cost: { ...cost, ...patch } });
  const money = !teamView;
  const actions = actionsOfRisk(state, r.id);
  const sug = suggestedGravity(r, state.settings);
  const loss = lossPerEvent(r);
  const gain = planBGain(r);
  const st = STATE_INFO[riskState({ ...state, risks: { ...state.risks, [r.id]: r } }, r)];

  const valid = () => {
    if (!r.title.trim()) { setStep(0); setError('Nommez le risque : ce qui s\'arrête.'); return false; }
    if (!r.owner.trim()) { setStep(0); setError('Désignez le responsable du risque.'); return false; }
    return true;
  };
  // in team view the money figures are neither shown nor overwritten
  const commit = () => update(d => { d.risks[r.id] = money ? r : { ...r, cost: d.risks[r.id]?.cost }; });
  const save = () => { if (valid()) { commit(); onClose(); } };
  const remove = () => {
    if (!window.confirm('Supprimer ce risque ? Ses actions de préparation restent dans le plan d\'actions.')) return;
    update(d => { delete d.risks[r.id]; });
    onClose();
  };
  const newPrep = () => { if (valid()) { commit(); onNewAction(r.id); } };
  const addTest = () => {
    if (!test.date) return;
    set({ tests: [...r.tests, { ...test, by: test.by || r.owner }] });
    setTest({ ...test, note: '' });
  };
  const num = (v: string) => (v.trim() === '' ? null : parseNumber(v));

  return (
    <Modal wide onClose={onClose}
      title={isNew ? 'Nouveau risque' : r.title || 'Risque'}
      subtitle={<span className="flex flex-wrap items-center gap-1.5"><ScoreBadge r={r} className="!h-5 !w-5 !text-[11px]" />Criticité {score(r)} / 16 · <StatusBadge level={st.tone} text={st.label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        {step > 0 && <Button kind="ghost" onClick={() => setStep(step - 1)}>Précédent</Button>}
        {step < 3 && <Button onClick={() => setStep(step + 1)}>Suivant</Button>}
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-4">
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="Étapes">
          {STEPS.map((l, i) => (
            <button key={l} type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold ${step === i ? 'border-delacour-primary bg-emerald-50 text-delacour-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[11px] ${step === i ? 'bg-delacour-primary text-white' : 'bg-slate-200 text-slate-700'}`}>{i + 1}</span>{l}
            </button>
          ))}
        </nav>

        {step === 0 && (
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Ce qui s'arrête (le risque)"><input className={inputCls} value={r.title} placeholder="Ex. : casse de la machine goulet" onChange={e => set({ title: e.target.value })} /></Field>
            <Field label="Processus">
              <select className={inputCls} value={r.processId} onChange={e => set({ processId: e.target.value })}>
                {state.processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {!state.processes.some(p => p.id === r.processId) && <option value={r.processId}>{r.processId}</option>}
              </select>
            </Field>
            <Field label="Ressource vitale concernée" hint="Machine, personne, fournisseur, logiciel, client…"><input className={inputCls} value={r.resource} onChange={e => set({ resource: e.target.value })} /></Field>
            <Field label="Comment s'en aperçoit-on ?" hint="Le signal qui déclenche le Plan B."><input className={inputCls} value={r.signal} onChange={e => set({ signal: e.target.value })} /></Field>
            <Field label="Arrêt tolérable au maximum" hint="Au-delà, les clients ou la trésorerie sont touchés."><input className={inputCls} value={r.maxOutage} placeholder="Ex. : 4 h, 2 jours" onChange={e => set({ maxOutage: e.target.value })} /></Field>
            <Field label="Responsable du risque (obligatoire)"><input className={inputCls} value={r.owner} list="risk-people" onChange={e => set({ owner: e.target.value })} /></Field>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-2.5" open={r.whys.some(w => w.trim())}>
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Analyse des 5 pourquoi (facultative)</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <Field key={i} label={`Pourquoi ${i + 1}`}>
                    <input className={inputCls} value={r.whys[i] || ''} onChange={e => { const w = [...r.whys]; w[i] = e.target.value; set({ whys: w }); }} />
                  </Field>
                ))}
              </div>
            </details>
            <Field label="Cause racine" hint="Ce qui rend l'entreprise vulnérable (pas l'incident lui-même)."><input className={inputCls} value={r.cause} onChange={e => set({ cause: e.target.value })} /></Field>

            {money && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                <div className="text-[11px] font-semibold text-slate-700">Coût d'un arrêt (facultatif, réservé à la direction)</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Perte par jour d'arrêt (€)" hint="Marge perdue + pénalités + heures payées à ne rien faire."><input inputMode="decimal" className={inputCls} value={cost.perDay ?? ''} onChange={e => setCost({ perDay: num(e.target.value) })} /></Field>
                  <Field label="Durée d'arrêt sans Plan B (jours)"><input inputMode="decimal" className={inputCls} value={cost.daysWithout ?? ''} onChange={e => setCost({ daysWithout: num(e.target.value) })} /></Field>
                </div>
                {loss !== null && sug && (
                  <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                    Perte par incident : <strong className="font-mono">{formatValue(loss, '€')}</strong>, soit une gravité {sug} ({gravityScale(state.settings)[sug - 1].label.toLowerCase()}).
                    {sug !== r.gravity && <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => set({ gravity: sug })}>Appliquer</button>}
                  </p>
                )}
              </div>
            )}

            <ScalePicker title="Gravité si le risque survient" value={r.gravity} onChange={g => set({ gravity: g })}
              items={gravityScale(state.settings, money).map(x => ({ level: x.level, label: x.label, text: [x.money, x.text].filter(Boolean).join(' · ') }))} />
            <ScalePicker title="Probabilité" value={r.likelihood} onChange={l => set({ likelihood: l })}
              items={LIKELIHOOD_SCALE.map(x => ({ level: x.level, label: x.label, text: x.text }))} />
            <p className="flex items-center gap-2 text-xs text-slate-700"><ScoreBadge r={r} />Criticité {score(r)} / 16 : <strong>{ZONE_LABEL[zoneOf(score(r))]}</strong></p>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700">Famille de parade</span>
                <Button kind="ghost" className="!px-2 !py-1" onClick={() => setIdeas(!ideas)} aria-expanded={ideas}><Lightbulb size={13} />Idées</Button>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-4">
                {FAMILIES.map(f => (
                  <button key={f.key} type="button" aria-pressed={r.family === f.key} onClick={() => set({ family: r.family === f.key ? '' : f.key })}
                    className={`rounded-lg border p-2 text-left ${r.family === f.key ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="block text-xs font-bold text-slate-900">{f.label}</span>
                    <span className="block text-[11px] text-slate-500">{f.hint}</span>
                  </button>
                ))}
              </div>
              {ideas && (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {(r.family ? FAMILIES.filter(f => f.key === r.family) : FAMILIES).flatMap(f => f.ideas.map(t => (
                    <button key={t} type="button" onClick={() => set({ planB: r.planB.trim() ? `${r.planB.trim()} ; ${t}` : t, family: r.family || f.key })}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950">{t}</button>
                  )))}
                </div>
              )}
            </div>
            <Field label="Plan B : ce qu'on fait quand ça arrive" hint="Vide = risque non couvert."><textarea className={textArea} value={r.planB} onChange={e => set({ planB: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Relais (qui ou quoi prend le relais)"><input className={inputCls} value={r.relay} onChange={e => set({ relay: e.target.value })} /></Field>
              <Field label="Délai d'activation"><input className={inputCls} value={r.activation} placeholder="Ex. : sous 4 h" onChange={e => set({ activation: e.target.value })} /></Field>
            </div>
            {money && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Durée d'arrêt avec le Plan B (jours)"><input inputMode="decimal" className={inputCls} value={cost.daysWith ?? ''} onChange={e => setCost({ daysWith: num(e.target.value) })} /></Field>
                  <Field label="Coût de mise en place du Plan B (€)"><input inputMode="decimal" className={inputCls} value={cost.planBCost ?? ''} onChange={e => setCost({ planBCost: num(e.target.value) })} /></Field>
                </div>
                {gain && (
                  <p className="text-[11px] text-slate-700">
                    Le Plan B évite <strong className="font-mono">{formatValue(gain.avoided, '€')}</strong> de perte par incident
                    {gain.paybackYears !== null ? <>, et se rembourse en <strong>{gain.paybackYears <= 1 ? 'moins d\'un an' : `${Math.ceil(gain.paybackYears)} ans`}</strong> en moyenne.</> : '.'}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">Actions de préparation</span>
                <Button className="!px-2 !py-1" onClick={newPrep}><Plus size={13} />Action</Button>
              </div>
              {actions.length === 0 ? <p className="text-[11px] text-slate-500">Aucune. Ajoutez ce qu'il faut faire pour que le Plan B soit prêt (5M) : elles rejoignent le plan d'actions commun.</p>
                : actions.map(a => (
                  <button key={a.id} type="button" onClick={() => { commit(); onOpenAction(a.id); }} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50">
                    <span className="min-w-0 truncate text-slate-800">{a.plan.map(p => p.text).join(' · ') || a.constat}</span>
                    <span className="shrink-0 text-slate-500">{a.pilot} · {frDate(a.deadline)} · <strong className="text-slate-700">{STATUS_LABEL[a.status]}</strong></span>
                  </button>
                ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-3">
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">Ces informations forment la <strong>fiche réflexe</strong> imprimable (écran Crise) : à ranger près du poste concerné, le jour de la panne l'application peut être inaccessible.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Première heure : les gestes, un par ligne"><textarea className={textArea} value={r.firstHour} onChange={e => set({ firstHour: e.target.value })} /></Field>
              <Field label="Qui appeler : nom, rôle, téléphone, un par ligne"><textarea className={textArea} value={r.contacts} onChange={e => set({ contacts: e.target.value })} /></Field>
              <Field label="Où sont les clés, codes, documents"><input className={inputCls} value={r.access} onChange={e => set({ access: e.target.value })} /></Field>
              <Field label="Ce qu'on laisse tomber en premier" hint="Commande, client ou tâche reportée pour tenir l'essentiel."><input className={inputCls} value={r.sacrifice} onChange={e => set({ sacrifice: e.target.value })} /></Field>
              <Field label="Suppléant du responsable"><input className={inputCls} value={r.deputy} list="risk-people" onChange={e => set({ deputy: e.target.value })} /></Field>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
              <div className="text-xs font-bold text-slate-900">Test du Plan B <span className="font-normal text-slate-500">(au moins tous les 6 mois)</span></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Comment on le teste"><input className={inputCls} value={r.testMethod} placeholder="Ex. : envoi réel d'un programme au confrère" onChange={e => set({ testMethod: e.target.value })} /></Field>
                <Field label="Critère de réussite"><input className={inputCls} value={r.testCriterion} placeholder="Ex. : pièce conforme en moins de 48 h" onChange={e => set({ testCriterion: e.target.value })} /></Field>
              </div>
              {r.tests.length > 0 && (
                <ul className="space-y-1">
                  {[...r.tests].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t, i) => (
                    <li key={`${t.date}${i}`} className="flex items-center gap-2 text-[11px]">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${t.ok ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>{t.ok ? <Check size={11} /> : <X size={11} />}</span>
                      <span className="font-mono text-slate-700">{frDate(t.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{t.ok ? 'Réussi' : 'Raté'}{t.note ? ` : ${t.note}` : ''}{t.by ? ` (${t.by})` : ''}</span>
                      <button type="button" aria-label="Retirer ce test" onClick={() => set({ tests: r.tests.filter(x => x !== t) })} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {testDueDate(r) && <p className="text-[11px] text-slate-600">Prochain test avant le <strong>{frDate(testDueDate(r))}</strong>.</p>}
              <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
                <Field label="Date du test"><input type="date" className={inputCls} value={test.date} onChange={e => setTest({ ...test, date: e.target.value })} /></Field>
                <div className="flex gap-1 pb-0.5" role="group" aria-label="Résultat">
                  <Button kind={test.ok ? 'primary' : 'secondary'} aria-pressed={test.ok} onClick={() => setTest({ ...test, ok: true })}>Réussi</Button>
                  <Button kind={!test.ok ? 'danger' : 'secondary'} aria-pressed={!test.ok} className={!test.ok ? '!bg-red-600 !text-white' : ''} onClick={() => setTest({ ...test, ok: false })}>Raté</Button>
                </div>
                <div className="min-w-[160px] flex-1"><Field label="Constat"><input className={inputCls} value={test.note} onChange={e => setTest({ ...test, note: e.target.value })} /></Field></div>
                <Button onClick={addTest}><Plus size={13} />Ajouter le test</Button>
              </div>
              {riskState({ ...state, risks: { ...state.risks, [r.id]: r } }, r) === 'failed' && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
                  Le dernier test a échoué : ouvrez une action corrective, puis testez de nouveau.
                  <button type="button" className="font-semibold underline" onClick={newPrep}>Ouvrir une action</button>
                </p>
              )}
            </div>
          </section>
        )}
      </div>
      <datalist id="risk-people">{[...new Set([...Object.values(state.risks).flatMap(x => [x.owner, x.deputy]), ...Object.values(state.actions).map(a => a.pilot)].filter(Boolean))].map(p => <option key={p} value={p} />)}</datalist>
    </Modal>
  );
}

function ScalePicker({ title, value, items, onChange }: { title: string; value: Scale; items: { level: Scale; label: string; text: string }[]; onChange(v: Scale): void }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold text-slate-700">{title}</span>
      <div className="grid gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label={title}>
        {items.map(x => (
          <button key={x.level} type="button" role="radio" aria-checked={value === x.level} onClick={() => onChange(x.level)}
            className={`rounded-lg border p-2 text-left ${value === x.level ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
            <span className="block text-xs font-bold text-slate-900">{x.level} · {x.label}</span>
            <span className="block text-[11px] text-slate-600">{x.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
