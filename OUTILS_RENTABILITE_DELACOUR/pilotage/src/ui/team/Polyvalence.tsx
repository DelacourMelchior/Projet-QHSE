// Tool 4.2 "Polyvalence": who can do what, from 0 to 4, on the key skills; a skill held by one autonomous person (level 3 or 4)
// is a key-person risk; the double is trained 2 hours a week with a tutor, then 2 days alone validate level 3.
import { syncStaff } from '../../domain/contacts';
import { useEffect, useState } from 'react';
import { Plus, ShieldAlert, Trash2, UserPlus, X } from 'lucide-react';
import type { Skill, SkillLevel } from '../../domain/types';
import {
  activePeople, autonomous, bestTutor, LEVEL_CRITERIA, keyPersonRisk, LEVELS, newSkill, PLAN_SESSIONS, PROCESS_SHORT, processesOf, processPeople, SKILL_RISK, skillInsights, skillRisk,
} from '../../domain/team';
import { applyTeamExample } from '../../domain/teamExamples';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { FlowUses } from '../map/FlowUses';
import { frDate, isoDate, periodOfDate } from '../../domain/periods';
import { formatValue } from '../../domain/numbers';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Empty, Field, inputCls, Method, Modal, NumInput, StatusBadge, SubTitle, ToolHeader } from '../common';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

const LEVEL_CLS = ['bg-slate-100 text-slate-500', 'bg-amber-50 text-amber-900', 'bg-sky-100 text-sky-900', 'bg-emerald-700 text-white', 'bg-emerald-900 text-white'];
const RISK_ORDER: Record<string, number> = { none: 0, single: 1, short: 2, ok: 3 };
const CELL = 'inline-flex h-9 w-12 items-center justify-center rounded-lg font-mono text-sm font-bold hover:ring-2 hover:ring-delacour-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-delacour-primary';

export function Polyvalence({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Skill | null>(null);
  const [pick, setPick] = useState<{ k: string; p: string } | null>(null);
  const [tab, setTab] = useState('');
  const [all, setAll] = useState(false);
  useEffect(() => { if (focus && state?.skills[focus]) { setOpen(state.skills[focus]); setTab(state.skills[focus].processId); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  // one staff list with the directory (1.3): the people of the org chart are here too
  useEffect(() => { if (state && syncStaff(structuredClone(state))) update(d => { syncStaff(d); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const setLevel = (kid: string, pid: string, l: SkillLevel) => update(d => { d.skills[kid].levels[pid] = l; d.skills[kid].levelDates = { ...(d.skills[kid].levelDates || {}), [pid]: isoDate(new Date()) }; });
  const everyone = activePeople(state);
  if (!Object.keys(state.skills).length || !everyone.length) {
    return (
      <div className="space-y-4">
        <Empty title="Qui sait faire quoi ?" text="Notez pour chaque compétence le niveau de chacun, de 0 à 4. Une compétence tenue par une seule personne devient une urgence : l'outil vous aide à former une doublure.">
          <Button kind="primary" onClick={() => update(d => applyTeamExample(d))}>Voir un exemple</Button>
          {everyone.length > 0 ? <Button onClick={() => setOpen(newSkill())}><Plus size={14} />Ajouter une compétence</Button> : <Button onClick={() => nav.open('1.3')}><UserPlus size={14} />Saisir l'équipe dans l'annuaire</Button>}
        </Empty>
          {open && <SkillSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  // one matrix per process: its skills in rows, its people in columns; the urgent lines first
  const stats = PROCESS_IDS.map(id => {
    const rows = Object.values(state.skills).filter(k => k.processId === id).map(k => ({ k, r: skillRisk(state, k) }))
      .sort((a, b) => RISK_ORDER[a.r] - RISK_ORDER[b.r] || a.k.name.localeCompare(b.k.name));
    return { id, rows, urgent: rows.filter(x => x.r === 'none' || x.r === 'single').length, short: rows.filter(x => x.r === 'short').length };
  });
  const cur = stats.find(x => x.id === tab) || stats.find(x => x.urgent) || stats.find(x => x.rows.length) || stats[0];
  // a company without any process (all deleted in the map 1.4) has no matrix to draw
  if (!cur) return <Card className="p-4 text-xs text-slate-700">Aucun processus dans la carte (outil 1.4) : la matrice se dessine par processus. Ajouter un processus dans la cartographie.</Card>;
  const people = processPeople(state, cur.id);
  const unassigned = everyone.filter(p => !processesOf(state, p).length);
  const insights = skillInsights(state);
  const shown = all ? insights : insights.slice(0, 3);
  const picked = pick ? { k: state.skills[pick.k], p: state.people[pick.p] } : null;
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <div>
          <h2 className="text-sm font-bold text-delacour-primary">Qui sait faire quoi ?</h2>
          <p className="max-w-3xl text-xs text-slate-600">Chaque compétence doit être maîtrisée seule (niveau 3 ou 4) par au moins 2 personnes. Sinon, l'absence d'une seule personne peut la bloquer. Choisissez un processus pour voir sa matrice.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 " style={{ gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }} role="tablist" aria-label="Processus">
          {stats.map(x => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === cur.id} onClick={() => setTab(x.id)}
              className={`min-h-[44px] rounded-lg border p-2 text-left hover:shadow-sm ${x.id === cur.id ? 'border-delacour-primary ring-2 ring-delacour-primary' : 'border-slate-200'} ${x.urgent ? 'bg-red-50/60' : 'bg-white'}`}>
              <span className="block text-xs font-bold text-slate-900">{PROCESS_SHORT[x.id]}</span>
              <span className={`block text-[11px] ${x.urgent ? 'font-semibold text-red-800' : x.short ? 'text-amber-800' : 'text-slate-600'}`}>
                {!x.rows.length ? 'Aucune compétence' : x.urgent ? `${x.urgent} à risque sur ${x.rows.length}` : x.short ? `${x.short} à renforcer` : `${x.rows.length} compétence${x.rows.length > 1 ? 's' : ''}, toutes doublées`}
              </span>
            </button>
          ))}
        </div>
        {insights.length > 0 && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {shown.map(i => (
              <li key={i.key} className="flex items-start gap-2.5 py-2 text-xs text-slate-700">
                <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.tone === 'bad' ? 'bg-red-600' : 'bg-amber-500'}`} />
                <span><strong className="font-semibold text-slate-900">{i.title}</strong> · {i.text}</span>
              </li>
            ))}
          </ul>
        )}
        {insights.length > 3 && <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="min-h-[44px] text-xs font-semibold text-delacour-primary hover:underline sm:min-h-0">{all ? 'Afficher moins de messages' : `Voir les ${insights.length - 3} autres messages`}</button>}
      </Card>
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title={`Matrice · ${PROCESS_SHORT[cur.id]}`} text="Touchez une case pour changer le niveau, une compétence pour organiser sa doublure.">
          <Button kind="primary" onClick={() => setOpen(newSkill(cur.id))}><Plus size={14} />Ajouter une compétence</Button>
        </ToolHeader>
        {!cur.rows.length ? <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-600">Aucune compétence pour ce processus. Ajoutez celles dont l'absence d'une personne arrêterait le travail.</p> : (<>
          <div className="hidden overflow-x-auto sm:block">
            <table className="border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-500">Compétence</th>
                  {people.map(p => <th key={p.id} className="border-b border-slate-200 px-1 py-2 align-bottom"><span className="mx-auto block w-12 text-center text-[10px] font-semibold leading-tight text-slate-700" title={`${p.name}${p.role ? ` · ${p.role}` : ''}`}>{p.name}</span></th>)}
                  <th className="border-b border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-500">Situation</th>
                </tr>
              </thead>
              <tbody>
                {cur.rows.map(({ k, r }) => (
                  <tr key={k.id} className={r === 'none' || r === 'single' ? 'bg-red-50/40' : ''}>
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-2 py-1.5">
                      <button type="button" onClick={() => setOpen(k)} className="text-left hover:underline">
                        <span className="font-semibold text-slate-900">{k.name}</span>
                        {k.plan && <span className="block text-[11px] text-slate-500">Doublure : {state.people[k.plan.learner]?.name || 'à désigner'} ({k.plan.sessions}/{PLAN_SESSIONS})</span>}
                      </button>
                    </td>
                    {people.map(p => {
                      const l = (k.levels[p.id] ?? 0) as SkillLevel;
                      return (
                        <td key={p.id} className="border-b border-slate-100 px-px py-0.5 text-center">
                          <button type="button" onClick={() => setPick({ k: k.id, p: p.id })} className={`${CELL} ${LEVEL_CLS[l]}`}
                            aria-label={`${k.name}, ${p.name} : niveau ${l}, ${LEVELS[l].label}. Changer le niveau.`} title={`${p.name} : ${LEVELS[l].label}`}>{l || '·'}</button>
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-100 px-2 py-1.5"><StatusBadge level={SKILL_RISK[r].tone} text={SKILL_RISK[r].label} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 sm:hidden">
            {cur.rows.map(({ k, r }) => (
              <li key={k.id}>
                <button type="button" onClick={() => setOpen(k)} className="flex min-h-[44px] w-full items-center justify-between gap-2 py-2 text-left">
                  <span className="min-w-0 text-xs font-semibold text-slate-900">{k.name}<span className="block font-normal text-slate-500">{autonomous(state, k).length} autonome(s)</span></span>
                  <StatusBadge level={SKILL_RISK[r].tone} text={SKILL_RISK[r].label} />
                </button>
              </li>
            ))}
          </ul>
          <ul className="hidden flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 sm:flex">
            {LEVELS.map(l => <li key={l.level} className="flex items-center gap-1.5" title={LEVEL_CRITERIA[l.level]}><span className={`inline-flex h-5 w-6 items-center justify-center rounded font-mono font-bold ${LEVEL_CLS[l.level]}`}>{l.level || '·'}</span>{l.label}</li>)}
          </ul>
        </>)}
        <p className="text-[11px] text-slate-500">
          Les personnes de chaque processus se choisissent dans l'annuaire, sur la fiche de la personne.
          {unassigned.length > 0 && <> {unassigned.length} personne{unassigned.length > 1 ? 's' : ''} sans processus : {unassigned.slice(0, 4).map(p => p.name).join(', ')}{unassigned.length > 4 ? '…' : ''}. </>}
          <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => nav.open('1.3')}>Ouvrir l'annuaire</button>
        </p>
      </Card>
      <FeedBox tool="4.2" period={periodOfDate(new Date())} />
      <Method rule="Une compétence tenue par une seule personne n'est pas un atout, c'est une fragilité pour l'entreprise."
        steps={[['Repérer les lignes rouges', 'Les compétences où une seule personne est au niveau 3 ou 4 : ce sont les urgences.'], ['Un créneau fixe', 'Deux heures par semaine, non négociables, pour le tutorat au poste.'], ['Épreuve pratique', `Après ${PLAN_SESSIONS} séances, 2 jours seul au poste valident le niveau 3.`]]}
        tips={['La matrice sert à organiser les doublures, pas à noter les personnes : évaluez avec la personne et présentez l\'outil au CSE.', 'Reconnaître le rôle du tuteur (niveau 4) : il garantit la continuité de l\'entreprise.']} />
      {picked?.k && picked.p && (
        <Modal title={`${picked.p.name} · ${picked.k.name}`} subtitle="Où en est la personne sur cette compétence ?" onClose={() => setPick(null)}>
          <ul className="space-y-1.5">
            {LEVELS.map(l => {
              const on = (picked.k.levels[picked.p.id] ?? 0) === l.level;
              return (
                <li key={l.level}>
                  <button type="button" aria-pressed={on} onClick={() => { setLevel(picked.k.id, picked.p.id, l.level); setPick(null); }}
                    className={`flex min-h-[48px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left hover:bg-slate-50 ${on ? 'border-delacour-primary ring-1 ring-delacour-primary' : 'border-slate-200'}`}>
                    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-sm font-bold ${LEVEL_CLS[l.level]}`}>{l.level || '·'}</span>
                    <span className="min-w-0 text-xs"><strong className="block text-slate-900">{l.label}</strong><span className="text-slate-600">{LEVEL_CRITERIA[l.level]}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
      {open && <SkillSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

export function SkillSheet({ initial, onClose, nav }: { initial: Skill; onClose(): void; nav: Nav }) {
  const { state, update } = useStore();
  const [k, setK] = useState<Skill>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.skills[k.id];
  const set = (x: Partial<Skill>) => setK(y => ({ ...y, ...x }));
  const people = processPeople(state, k.processId);   // the skill belongs to a process: only the people of that process hold it
  const withK = { ...state, skills: { ...state.skills, [k.id]: k } };
  const risk = skillRisk(withK, k);
  const plan = k.plan;
  const setPlan = (x: Partial<NonNullable<Skill['plan']>>) => set({ plan: { ...(plan || { tutor: bestTutor(withK, k)?.id || '', learner: '', slot: '', target: '', sessions: 0 }), ...x } });
  const tutorLevel = plan?.tutor ? k.levels[plan.tutor] ?? 0 : null;
  const valid = () => { if (!k.name.trim()) { setError('Nommez la compétence.'); return false; } return true; };
  const close = () => { if (JSON.stringify(k) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.skills[k.id] = k; }); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer la compétence ${k.name} ?`)) { update(d => { delete d.skills[k.id]; }); onClose(); } };
  const pass = () => { if (!plan?.learner) return; set({ levels: { ...k.levels, [plan.learner]: Math.max(3, k.levels[plan.learner] ?? 0) as SkillLevel }, plan: null }); };
  const toRisk = () => { if (!valid()) return; const r = keyPersonRisk(withK, k); update(d => { d.skills[k.id] = k; d.risks[r.id] = r; }); onClose(); nav.openRisk(r.id); };
  const existingRisk = Object.values(state.risks).find(r => r.resource.includes(k.name));

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouvelle compétence clé' : k.name} subtitle={<StatusBadge level={SKILL_RISK[risk].tone} text={`${SKILL_RISK[risk].label} · ${autonomous(withK, k).length} autonome(s)`} />}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <Field label="Compétence ou poste clé"><input className={inputCls} value={k.name} placeholder="Ex. : Soudure TIG" autoFocus={isNew} onChange={e => set({ name: e.target.value })} /></Field>
        <section className="space-y-2">
          <SubTitle>Qui sait faire ?</SubTitle>
          {(() => {
            const setLv = (id: string, l: number) => set({ levels: { ...k.levels, [id]: l as SkillLevel }, levelDates: { ...(k.levelDates || {}), [id]: isoDate(new Date()) } });
            const known = people.filter(p => (k.levels[p.id] ?? 0) > 0).sort((x, y) => (k.levels[y.id] ?? 0) - (k.levels[x.id] ?? 0) || x.name.localeCompare(y.name, 'fr'));
            const others = people.filter(p => !(k.levels[p.id] ?? 0));
            return (<>
              {known.length === 0 && <p className="text-[11px] text-slate-500">Personne pour l'instant : ajoutez une personne ci-dessous.</p>}
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {known.map(p => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1">
                    <span className="min-w-0 truncate text-xs text-slate-800">{p.name}{k.levelDates?.[p.id] ? <span className="text-[11px] text-slate-500"> · évalué le {frDate(k.levelDates[p.id])}</span> : ''}</span>
                    <select className="min-h-[36px] rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]" value={k.levels[p.id] ?? 0} aria-label={`Niveau de ${p.name}`} title={LEVEL_CRITERIA[k.levels[p.id] ?? 0]} onChange={e => setLv(p.id, Number(e.target.value))}>
                      {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level} · {l.label}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
              {others.length > 0 && (
                <select className={`${inputCls} sm:!w-64`} value="" aria-label="Ajouter une personne" onChange={e => e.target.value && setLv(e.target.value, 1)}>
                  <option value="">+ Ajouter une personne</option>{others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </>);
          })()}
        </section>
        <section className="space-y-2">
          <SubTitle>Doublure</SubTitle>
          {!plan ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setPlan({})}><Plus size={14} />Organiser une doublure</Button>
              {risk !== 'ok' && <span className="text-[11px] text-slate-600">Un tuteur de niveau 4, un apprenant, un créneau fixe de 2 heures par semaine.</span>}
            </div>
          ) : (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 sm:grid-cols-2">
              <Field label="Tuteur">
                <select className={inputCls} value={plan.tutor} onChange={e => setPlan({ tutor: e.target.value })}>
                  <option value="">À choisir</option>{people.map(p => <option key={p.id} value={p.id}>{p.name} (niveau {k.levels[p.id] ?? 0})</option>)}
                </select>
              </Field>
              <Field label="Apprenant">
                <select className={inputCls} value={plan.learner} onChange={e => setPlan({ learner: e.target.value })}>
                  <option value="">À choisir</option>{people.filter(p => p.id !== plan.tutor).map(p => <option key={p.id} value={p.id}>{p.name} (niveau {k.levels[p.id] ?? 0})</option>)}
                </select>
              </Field>
              <Field label="Créneau fixe (2 h par semaine)"><input className={inputCls} value={plan.slot} placeholder="Vendredi 14 h - 16 h" onChange={e => setPlan({ slot: e.target.value })} /></Field>
              <Field label="Niveau 3 visé le"><input type="date" className={inputCls} value={plan.target} onChange={e => setPlan({ target: e.target.value })} /></Field>
              <div className="flex items-center gap-2 sm:col-span-2">
                <span className="text-[11px] text-slate-700">Séances faites</span>
                <NumInput className="!w-16 text-right" value={plan.sessions} onChange={v => setPlan({ sessions: Math.max(0, v ?? 0) })} aria-label="Séances de tutorat faites" />
                <span className="text-[11px] text-slate-500">sur {PLAN_SESSIONS} avant l'épreuve pratique{plan.target ? ` · objectif le ${frDate(plan.target)}` : ''}</span>
                <button type="button" aria-label="Arrêter la doublure" onClick={() => set({ plan: null })} className="ml-auto rounded p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
              </div>
              {tutorLevel !== null && tutorLevel < 4 && plan.tutor && <p className="text-[11px] font-semibold text-amber-800 sm:col-span-2">Le tuteur n'est pas au niveau 4 : il transmet ce qu'il sait, pas tout le métier.</p>}
              {plan.learner && plan.sessions >= PLAN_SESSIONS && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-900 sm:col-span-2">
                  {PLAN_SESSIONS} séances faites : 2 jours seul au poste pour l'épreuve pratique.
                  <button type="button" className="font-semibold underline" onClick={pass}>Épreuve réussie : {state.people[plan.learner]?.name} passe au niveau 3</button>
                </p>
              )}
            </div>
          )}
        </section>
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-delacour-primary">Options</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field label="Processus"><select className={inputCls} value={k.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(x => <option key={x} value={x}>{processLabel(x)}</option>)}</select></Field>
            <Field label="Personnes autonomes exigées"><NumInput value={k.required ?? 2} onChange={v => set({ required: v && v > 0 ? Math.round(v) : undefined })} /></Field>
            {plan && <Field label="Heures par séance"><NumInput value={plan.hoursPerSession ?? 2} onChange={v => setPlan({ hoursPerSession: v ?? 2 })} /></Field>}
            {plan && <Field label="Coût de la doublure (€)" hint={`Temps tuteur + apprenant : ${(plan.hoursPerSession ?? 2) * PLAN_SESSIONS * 2} h, soit ${formatValue((plan.hoursPerSession ?? 2) * PLAN_SESSIONS * 2 * state.params.hourlyRate, '€')} au coût horaire.`}><NumInput value={plan.cost ?? null} onChange={v => setPlan({ cost: v })} /></Field>}
            <label className="flex items-center gap-2 text-[11px] text-slate-700 sm:col-span-2"><input type="checkbox" checked={!!k.critical} onChange={e => set({ critical: e.target.checked })} />Compétence critique (compte dans le taux de doublure)</label>
          </div>
        </details>
        {!isNew && <FlowUses tool="4.2" id={k.id} />}
        {risk === 'single' && (
          <section className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-800">
            <ShieldAlert size={14} />L'absence de {autonomous(withK, k)[0]?.name} arrêterait cette compétence.
            {existingRisk ? <button type="button" className="font-semibold underline" onClick={() => { onClose(); nav.openRisk(existingRisk.id); }}>Voir le risque dans les Plans B</button>
              : <button type="button" className="font-semibold underline" onClick={toRisk}>Inscrire ce risque dans les Plans B (1.2)</button>}
          </section>
        )}
      </div>
    </Modal>
  );
}
