// Tool 4.2 "Polyvalence": who can do what, from 0 to 4, on the key skills; a skill held by one autonomous person (level 3 or 4)
// is a key-person risk; the double is trained 2 hours a week with a tutor, then 2 days alone validate level 3.
import { useEffect, useState } from 'react';
import { Plus, Printer, ShieldAlert, Trash2, UserPlus, X } from 'lucide-react';
import type { Person, Skill, SkillLevel } from '../../domain/types';
import {
  activePeople, autonomous, bestTutor, LEVEL_CRITERIA, coveragePct, keyPeople, keyPersonRisk, LEVELS, newPerson, newSkill, PLAN_SESSIONS, SKILL_RISK, skillInsights, skillRisk,
} from '../../domain/team';
import { applyTeamExample } from '../../domain/teamExamples';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { frDate, isoDate, periodOfDate } from '../../domain/periods';
import { formatValue } from '../../domain/numbers';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Empty, Field, inputCls, Method, Modal, NumInput, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

const LEVEL_CLS = ['bg-slate-100 text-slate-600', 'bg-amber-100 text-amber-900', 'bg-sky-100 text-sky-900', 'bg-emerald-700 text-white', 'bg-emerald-900 text-white'];

export function Polyvalence({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Skill | null>(null);
  const [team, setTeam] = useState(false);
  const [edit, setEdit] = useState(false);
  const [undo, setUndo] = useState<{ k: string; p: string; l: SkillLevel | undefined } | null>(null);
  const [group, setGroup] = useState('');
  useEffect(() => { if (focus && state?.skills[focus]) { setOpen(state.skills[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const teams = [...new Set(activePeople(state).map(p => p.team || '').filter(Boolean))].sort();
  const people = activePeople(state).filter(p => !group || p.team === group);
  const skills = Object.values(state.skills).sort((a, b) => Number(!!b.critical) - Number(!!a.critical) || a.processId.localeCompare(b.processId) || a.name.localeCompare(b.name));
  const setLevel = (k: Skill, p: Person, l: SkillLevel) => {
    setUndo({ k: k.id, p: p.id, l: k.levels[p.id] });
    update(d => { d.skills[k.id].levels[p.id] = l; d.skills[k.id].levelDates = { ...(d.skills[k.id].levelDates || {}), [p.id]: isoDate(new Date()) }; });
  };
  if (!skills.length || !people.length) {
    return (
      <div className="space-y-4">
        <Empty title="Polyvalence : pas de compétence tenue par une seule personne" text="La liste des compétences clés, l'équipe, et pour chacun un niveau de 0 à 4. Chaque compétence doit avoir au moins 2 personnes autonomes (niveau 3 ou 4) ; sinon, un tuteur forme une doublure 2 heures par semaine.">
          <Button kind="primary" onClick={() => setTeam(true)}><UserPlus size={14} />Saisir l'équipe</Button>
          <Button onClick={() => setOpen(newSkill())} disabled={!people.length}><Plus size={14} />Ajouter une compétence</Button>
          <Button onClick={() => update(d => applyTeamExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {team && <TeamSheet onClose={() => setTeam(false)} />}
        {open && <SkillSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const risks = skills.map(k => skillRisk(state, k));
  const keys = keyPeople(state);
  const cov = coveragePct(state);
  return (
    <div className="space-y-4">
      <Summary title="Qui sait faire quoi ?" insights={skillInsights(state)} tiles={<>
        <Tile title="Compétences clés" value={String(skills.length)} sub={`pour ${people.length} personne(s)`} />
        <Tile title="Doublées" value={cov === null ? '—' : `${cov} %`} sub="au moins 2 personnes autonomes" tone={cov === null ? undefined : cov === 100 ? 'ok' : cov >= 70 ? 'warn' : 'alert'} />
        <Tile title="Hommes-clés" value={String(keys.length)} sub={keys.length ? keys.map(k => k.person?.name).join(', ') : 'aucun'} tone={keys.length ? 'alert' : 'ok'} />
        <Tile title="Doublures en cours" value={String(skills.filter(k => k.plan).length)} sub="tuteur, apprenant, créneau fixe" />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Matrice de polyvalence" text={edit ? 'Mode modification : un clic fait monter le niveau (clic droit pour descendre).' : 'Cliquez sur « Modifier les niveaux » pour changer une case ; sur une compétence pour organiser sa doublure.'}>
          <Button kind={edit ? 'primary' : 'secondary'} onClick={() => setEdit(!edit)}>{edit ? 'Terminer' : 'Modifier les niveaux'}</Button>
          {undo && <Button kind="ghost" onClick={() => { update(d => { const k = d.skills[undo.k]; if (!k) return; if (undo.l === undefined) delete k.levels[undo.p]; else k.levels[undo.p] = undo.l; }); setUndo(null); }}>Annuler la dernière modification</Button>}
          {teams.length > 0 && <select className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" value={group} aria-label="Équipe" onChange={e => setGroup(e.target.value)}><option value="">Toutes les équipes</option>{teams.map(x => <option key={x}>{x}</option>)}</select>}
          <Button kind="primary" onClick={() => setOpen(newSkill())}><Plus size={14} />Ajouter une compétence</Button>
          <Button onClick={() => setTeam(true)}><UserPlus size={14} />Équipe</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[200px] border-b border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-500">Compétence</th>
                {people.map(p => <th key={p.id} className="border-b border-slate-200 px-1 py-2 align-bottom"><span className="block max-w-[64px] truncate text-center text-[11px] font-semibold text-slate-700" title={`${p.name}${p.role ? ` · ${p.role}` : ''}`}>{p.name}</span></th>)}
                <th className="border-b border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-500">Autonomes</th>
                <th className="border-b border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-500">Risque</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((k, i) => (
                <tr key={k.id} className={risks[i] !== 'ok' ? 'bg-red-50/40' : ''}>
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-2 py-1.5">
                    <button type="button" onClick={() => setOpen(k)} className="text-left hover:underline">
                      <span className="block text-[11px] text-slate-500">{k.processId}</span>
                      <span className="font-semibold text-slate-900">{k.critical ? '★ ' : ''}{k.name}</span>
                      {k.plan && <span className="block text-[11px] text-slate-500">Doublure : {state.people[k.plan.learner]?.name} ({k.plan.sessions}/{PLAN_SESSIONS})</span>}
                    </button>
                  </td>
                  {people.map(p => {
                    const l = (k.levels[p.id] ?? 0) as SkillLevel;
                    return (
                      <td key={p.id} className="border-b border-slate-100 px-1 py-1 text-center">
                        <button type="button" disabled={!edit} onClick={() => setLevel(k, p, ((l + 1) % 5) as SkillLevel)} onContextMenu={e => { if (!edit) return; e.preventDefault(); setLevel(k, p, ((l + 4) % 5) as SkillLevel); }}
                          aria-label={`${k.name}, ${p.name} : niveau ${l} (${LEVELS[l].label}). Cliquer pour passer au niveau suivant.`} title={`${p.name} : ${LEVELS[l].label}`}
                          className={`h-8 w-10 rounded-md font-mono text-sm font-bold ${LEVEL_CLS[l]} ${edit ? 'hover:ring-2 hover:ring-delacour-gold' : 'cursor-default'}`}>{l || '·'}</button>
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 px-2 py-1.5 text-center font-mono font-semibold">{autonomous(state, k).length}</td>
                  <td className="border-b border-slate-100 px-2 py-1.5"><StatusBadge level={SKILL_RISK[risks[i]].tone} text={SKILL_RISK[risks[i]].label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          {LEVELS.map(l => <li key={l.level} className="flex items-center gap-1.5" title={LEVEL_CRITERIA[l.level]}><span className={`inline-flex h-5 w-6 items-center justify-center rounded font-mono font-bold ${LEVEL_CLS[l.level]}`}>{l.level || '·'}</span>{l.label}</li>)}
        </ul>
        <details className="text-[11px] text-slate-600"><summary className="cursor-pointer font-semibold text-delacour-primary">Critères de chaque niveau et bon usage</summary>
          <ul className="mt-1 space-y-0.5">{LEVEL_CRITERIA.map((c, i) => <li key={i}><strong>{i}</strong> : {c}</li>)}</ul>
          <p className="mt-1">La matrice sert à organiser les doublures, pas à noter les personnes. Évaluez avec la personne, datez l'évaluation, présentez l'outil au CSE, et réservez-le à la direction si besoin (Réglages). ★ = compétence critique.</p>
        </details>
      </Card>
      <FeedBox tool="4.2" period={periodOfDate(new Date())} />
      <Method rule="Une compétence tenue par une seule personne n'est pas un atout, c'est une fragilité pour l'entreprise."
        steps={[['Repérer les lignes rouges', 'Les compétences où une seule personne est au niveau 3 ou 4 : ce sont les urgences.'], ['Un créneau fixe', 'Deux heures par semaine, non négociables, pour le tutorat au poste.'], ['Épreuve pratique', `Après ${PLAN_SESSIONS} séances, 2 jours seul au poste valident le niveau 3.`]]}
        tips={['Reconnaître le rôle du tuteur (niveau 4) : il garantit la continuité de l\'entreprise.']} />
      {team && <TeamSheet onClose={() => setTeam(false)} />}
      {open && <SkillSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function TeamSheet({ onClose }: { onClose(): void }) {
  const { state, update } = useStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  if (!state) return null;
  const people = Object.values(state.people).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  const add = () => { if (!name.trim()) return; const p = { ...newPerson(name.trim()), role: role.trim() }; update(d => { d.people[p.id] = p; }); setName(''); setRole(''); };
  const set = (id: string, x: Partial<Person>) => update(d => { d.people[id] = { ...d.people[id], ...x }; });
  return (
    <Modal title="Équipe" subtitle="Les personnes de la matrice de polyvalence ; leurs noms sont proposés dans tous les outils." onClose={onClose} footer={<Button kind="primary" onClick={onClose}>Fermer</Button>}>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <input className={inputCls} value={name} placeholder="Nom" aria-label="Nom" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <input className={inputCls} value={role} placeholder="Fonction" aria-label="Fonction" onChange={e => setRole(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <Button kind="primary" disabled={!name.trim()} onClick={add}><Plus size={14} />Ajouter</Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {people.map(p => (
            <li key={p.id} className="space-y-1 py-1.5">
              <div className="grid grid-cols-[1fr_1fr_0.8fr_auto] items-center gap-1.5">
                <input className={inputCls} value={p.name} aria-label="Nom" onChange={e => set(p.id, { name: e.target.value })} />
                <input className={inputCls} value={p.role} aria-label="Fonction" onChange={e => set(p.id, { role: e.target.value })} />
                <input className={inputCls} value={p.team || ''} placeholder="Équipe" aria-label="Équipe" onChange={e => set(p.id, { team: e.target.value })} />
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600"><input type="checkbox" checked={p.active} onChange={e => set(p.id, { active: e.target.checked })} />Présent</label>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                Absences prévues :
                {(p.absences || []).map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1">
                    <input type="date" className="bg-transparent text-[11px]" value={a.from} aria-label="Du" onChange={e => set(p.id, { absences: p.absences!.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
                    au <input type="date" className="bg-transparent text-[11px]" value={a.to} aria-label="Au" onChange={e => set(p.id, { absences: p.absences!.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} />
                    <button type="button" aria-label="Retirer cette absence" onClick={() => set(p.id, { absences: p.absences!.filter((_, j) => j !== i) })}>×</button>
                  </span>
                ))}
                <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => set(p.id, { absences: [...(p.absences || []), { from: isoDate(new Date()), to: isoDate(new Date()) }] })}>+ congés</button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">Décochez « Présent » pour une personne partie : ses niveaux sont gardés mais ne comptent plus.</p>
      </div>
    </Modal>
  );
}

function SkillSheet({ initial, onClose, nav }: { initial: Skill; onClose(): void; nav: Nav }) {
  const { state, update } = useStore();
  const [k, setK] = useState<Skill>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.skills[k.id];
  const set = (x: Partial<Skill>) => setK(y => ({ ...y, ...x }));
  const people = activePeople(state);
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
        <section className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label="Compétence ou poste clé"><input className={inputCls} value={k.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Processus"><select className={inputCls} value={k.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(x => <option key={x} value={x}>{processLabel(x)}</option>)}</select></Field>
          <Field label="Personnes autonomes exigées"><NumInput value={k.required ?? 2} onChange={v => set({ required: v && v > 0 ? Math.round(v) : undefined })} /></Field>
          <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700"><input type="checkbox" checked={!!k.critical} onChange={e => set({ critical: e.target.checked })} />Compétence critique (compte dans le taux de doublure)</label>
        </section>
        <section className="space-y-2">
          <SubTitle>Niveaux</SubTitle>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {people.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1">
                <span className="min-w-0 truncate text-xs text-slate-800">{p.name}{k.levelDates?.[p.id] ? <span className="text-[11px] text-slate-500"> · évalué le {frDate(k.levelDates[p.id])}</span> : ''}</span>
                <select className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]" value={k.levels[p.id] ?? 0} aria-label={`Niveau de ${p.name}`} title={LEVEL_CRITERIA[k.levels[p.id] ?? 0]} onChange={e => set({ levels: { ...k.levels, [p.id]: Number(e.target.value) as SkillLevel }, levelDates: { ...(k.levelDates || {}), [p.id]: isoDate(new Date()) } })}>
                  {LEVELS.map(l => <option key={l.level} value={l.level}>{l.level} · {l.label}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-2">
          <SubTitle>Doublure</SubTitle>
          {!plan ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setPlan({})}><Plus size={14} />Organiser une doublure</Button>
              {risk !== 'ok' && <span className="text-[11px] text-slate-600">Un tuteur de niveau 4, un apprenant, un créneau fixe de 2 heures par semaine.</span>}
            </div>
          ) : (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 sm:grid-cols-4">
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
              <Field label="Créneau fixe"><input className={inputCls} value={plan.slot} placeholder="Vendredi 14 h - 16 h" onChange={e => setPlan({ slot: e.target.value })} /></Field>
              <Field label="Niveau 3 visé le"><input type="date" className={inputCls} value={plan.target} onChange={e => setPlan({ target: e.target.value })} /></Field>
              <Field label="Heures par séance"><NumInput value={plan.hoursPerSession ?? 2} onChange={v => setPlan({ hoursPerSession: v ?? 2 })} /></Field>
              <Field label="Coût de la doublure (€)" hint={`Temps tuteur + apprenant : ${(plan.hoursPerSession ?? 2) * PLAN_SESSIONS * 2} h, soit ${formatValue((plan.hoursPerSession ?? 2) * PLAN_SESSIONS * 2 * state.params.hourlyRate, '€')} au coût horaire. À déclarer au plan de développement des compétences (OPCO).`}><NumInput value={plan.cost ?? null} onChange={v => setPlan({ cost: v })} /></Field>
              <div className="flex items-center gap-2 sm:col-span-4">
                <span className="text-[11px] text-slate-700">Séances faites</span>
                <NumInput className="!w-16 text-right" value={plan.sessions} onChange={v => setPlan({ sessions: Math.max(0, v ?? 0) })} aria-label="Séances de tutorat faites" />
                <span className="text-[11px] text-slate-500">sur {PLAN_SESSIONS} avant l'épreuve pratique{plan.target ? ` · objectif le ${frDate(plan.target)}` : ''}</span>
                <button type="button" aria-label="Arrêter la doublure" onClick={() => set({ plan: null })} className="ml-auto rounded p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
              </div>
              {tutorLevel !== null && tutorLevel < 4 && plan.tutor && <p className="text-[11px] font-semibold text-amber-800 sm:col-span-4">Le tuteur n'est pas au niveau 4 : il transmet ce qu'il sait, pas tout le métier.</p>}
              {plan.learner && plan.sessions >= PLAN_SESSIONS && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-900 sm:col-span-4">
                  {PLAN_SESSIONS} séances faites : 2 jours seul au poste pour l'épreuve pratique.
                  <button type="button" className="font-semibold underline" onClick={pass}>Épreuve réussie : {state.people[plan.learner]?.name} passe au niveau 3</button>
                </p>
              )}
            </div>
          )}
        </section>
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
