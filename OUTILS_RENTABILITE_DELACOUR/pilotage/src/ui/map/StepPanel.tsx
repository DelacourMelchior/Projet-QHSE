// The panel of one step (tool 1.4), opened over the flowchart page: what the step is and where it goes, what it takes to do it (instruction and skill in view, the rest under "Plus"),
// notes and options. The list of steps stays light: all that was once stacked under each row is here.
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { Flow, FlowBranch, FlowLink, FlowStep, Skill, StepKind } from '../../domain/types';
import { branchesOf, REQ_KINDS, STEP_KINDS } from '../../domain/cartography';
import { isWork, linksOfTool, otherLinks, richLinks, SUPPORTS } from '../../domain/mapSupport';
import { useStore } from '../../store/StoreContext';
import type { Nav } from '../tools';
import { Button, Field, inputCls, Modal } from '../common';
import { Fold, KIND_SHORT, kindLabel, RoleCell, stepPlaceholder } from './FlowBits';
import { LinksEditor } from './LinksEditor';
import { SupportCell } from './Support';

export function StepPanel({ f, rf, i, can, nav, skills, people, roles, others, patch, setLinks, setBranches, changeKind, remove, openFlow, onGo, onClose }: {
  f: Flow; rf: Flow; i: number; can: boolean; nav: Nav; skills: Skill[]; people: { id: string; name: string }[]; roles: string[]; others: Flow[];
  patch(sid: string, v: Partial<FlowStep>): void; setLinks(sid: string, links: FlowLink[]): void; setBranches(sid: string, b: FlowBranch[]): void; changeKind(st: FlowStep, kind: StepKind): void;
  remove(sid: string): void; openFlow(fid: string): void; onGo(i: number): void; onClose(): void;
}) {
  const { state } = useStore();
  const st = f.steps[i];
  if (!state || !st) return null;
  const targets = <>{f.steps.map((s, j) => j !== i && <option key={s.id} value={s.id}>{j + 1}. {s.label || kindLabel(s.kind)}</option>)}</>;
  const main = SUPPORTS.filter(d => d.required), more = SUPPORTS.filter(d => !d.required), moreFilled = more.some(d => linksOfTool(st, d.tool).length > 0);
  const row = (def: (typeof SUPPORTS)[number]) => (
    <div key={def.kind} className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)]"><span className="pt-1 text-xs font-semibold text-slate-700">{def.column} <span className="font-normal text-slate-500">({def.tool})</span></span>
      <SupportCell def={def} links={st.links || []} onLinks={v => setLinks(st.id, v)} flow={f} step={st} nav={nav} readOnly={!can} /></div>
  );
  return (
    <Modal wide onClose={onClose} title={`Étape ${i + 1} · ${kindLabel(st.kind)}`} subtitle={st.label.trim() || 'Sans intitulé'}
      footer={<>
        <Button disabled={i === 0} onClick={() => onGo(i - 1)}><ChevronLeft size={14} />Étape précédente</Button>
        <Button disabled={i === f.steps.length - 1} onClick={() => onGo(i + 1)}>Étape suivante<ChevronRight size={14} /></Button>
        <Button kind="primary" onClick={onClose}>Fermer</Button>
      </>}>
      <div className="space-y-5">
        <section aria-label="Faire" className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900">Faire</h3>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"><strong className="text-slate-900">{kindLabel(st.kind)} : </strong>{KIND_SHORT[st.kind]}</p>
          <fieldset disabled={!can} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
            <Field label="Type"><select className={inputCls} value={st.kind} onChange={e => changeKind(st, e.target.value as StepKind)}>{STEP_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
            <Field label="Intitulé"><input className={inputCls} value={st.label} placeholder={stepPlaceholder(st.kind)} onChange={e => patch(st.id, { label: e.target.value })} /></Field>
            {st.kind !== 'start' && st.kind !== 'end' && <Field label="Qui la fait"><RoleCell value={rf.steps[i].role} refKey={st.roleRef ? `${st.roleRef.kind === 'skill' ? '__sk:' : '__pp:'}${st.roleRef.id}` : ''} roles={roles} skills={skills} people={people} label={`Qui fait l'étape ${i + 1}`} onPick={(role, ref) => patch(st.id, { role, roleRef: ref })} /></Field>}
            {st.kind === 'decision' ? (() => {
              const br = branchesOf(st);
              return <div className="space-y-1.5 sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-700">Les réponses de la décision</span>
                <p className="text-xs text-slate-500">Oui et non, ou autant de réponses que nécessaire, avec les mots que l'on veut. Chaque réponse dit où l'on va ensuite. La première peut aller à « l'étape suivante » ; les autres demandent une étape.</p>
                {br.map((b, k) => (
                  <div key={k} className="grid gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
                    <input className={inputCls} aria-label={`Nom de la réponse ${k + 1}`} value={b.label} placeholder="Réponse (Oui, Retenu…)" onChange={e => setBranches(st.id, br.map((x, j) => (j === k ? { ...x, label: e.target.value } : x)))} />
                    <select className={inputCls} aria-label={`Où va la réponse ${b.label || k + 1}`} value={b.to} onChange={e => setBranches(st.id, br.map((x, j) => (j === k ? { ...x, to: e.target.value } : x)))}><option value="">{k === 0 ? "L'étape suivante" : 'Choisir une étape'}</option>{targets}</select>
                    <Button kind="ghost" aria-label={`Retirer la réponse ${b.label || k + 1}`} disabled={br.length <= 2} onClick={() => setBranches(st.id, br.filter((_, j) => j !== k))}><Trash2 size={14} /></Button>
                  </div>
                ))}
                <Button onClick={() => setBranches(st.id, [...br, { label: '', to: '' }])}><Plus size={13} />Ajouter une réponse</Button>
              </div>;
            })() : st.kind !== 'end' && <div className="sm:col-span-2"><Field label="Puis aller à" hint="Laisser « L'étape suivante » (celle du dessous) dans le cas normal ; choisir une étape pour un retour ou un saut."><select className={inputCls} value={st.goto || ''} onChange={e => patch(st.id, { goto: e.target.value || undefined })}><option value="">L'étape suivante</option>{targets}</select></Field></div>}
            {st.kind === 'subprocess' && <div className="sm:col-span-2"><Field label="Logigramme appelé"><span className="flex gap-1.5"><select className={inputCls} value={st.flowId || ''} onChange={e => patch(st.id, { flowId: e.target.value || undefined })}><option value="">Choisir</option>{others.map(o => <option key={o.id} value={o.id}>{o.processId} · {o.name || 'Sans nom'}</option>)}</select>{st.flowId && state.flows[st.flowId] && <Button onClick={() => openFlow(st.flowId!)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>}</span></Field></div>}
          </fieldset>
        </section>

        {isWork(st) && <section aria-label="Ce qu'il faut pour la faire" className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Ce qu'il faut pour la faire</h3>
          <p className="text-xs text-slate-500">Comment (instruction) et par qui (compétence) : rattacher une fiche qui existe ou en créer une depuis l'étape. « × » détache sans supprimer. Tout est facultatif.</p>
          {main.map(row)}
          <Fold key={`more${st.id}`} open={moreFilled} className="rounded-lg border border-slate-200 bg-slate-50" summary="Plus : fonction clé, équipement, risque, indicateur">
            <div className="space-y-2 border-t border-slate-200 px-3 py-3">{more.map(row)}</div>
          </Fold>
        </section>}


        {st.kind !== 'start' && st.kind !== 'end' && (f.requirements || []).some(r => r.text.trim() && r.id) && <Fold key={`req${st.id}`} className="rounded-lg border border-slate-200" summary={`Exigences que cette étape respecte${st.reqs?.length ? ` · ${st.reqs.length}` : ''}`}><section aria-label="Exigences respectées" className="space-y-2 border-t border-slate-200 p-3">
          <p className="text-xs text-slate-500">Cocher ce que cette étape garantit, parmi les exigences de la fiche du logigramme. Une exigence qu'aucune étape ne respecte est signalée sur la fiche.</p>
          <fieldset disabled={!can} className="space-y-1 border-0 p-0">
            {(f.requirements || []).filter(r => r.text.trim() && r.id).map(r => (
              <label key={r.id} className="flex min-h-[44px] items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 sm:min-h-0">
                <input type="checkbox" className="mt-0.5" checked={(st.reqs || []).includes(r.id!)} onChange={e => { const k = e.target.checked ? [...(st.reqs || []), r.id!] : (st.reqs || []).filter(x => x !== r.id); patch(st.id, { reqs: k.length ? k : undefined }); }} />
                <span><span className="font-semibold text-slate-700">{REQ_KINDS.find(k => k.key === r.kind)?.label} · </span>{r.text}</span>
              </label>
            ))}
          </fieldset>
        </section></Fold>}


        <Fold key={`notes${st.id}`} className="rounded-lg border border-slate-200" summary={`Notes et options${[st.doc && 'document', st.note && 'remarque', st.control && 'contrôle'].filter(Boolean).length ? ` · ${[st.doc && 'document', st.note && 'remarque', st.control && 'contrôle'].filter(Boolean).join(', ')}` : ''}`}><section aria-label="Notes et options" className="space-y-3 border-t border-slate-200 p-3">
          <fieldset disabled={!can} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
            <Field label="Document produit ou lu"><input className={inputCls} value={st.doc || ''} onChange={e => patch(st.id, { doc: e.target.value || undefined })} /></Field>
            <Field label="Remarque"><input className={inputCls} value={st.note || ''} onChange={e => patch(st.id, { note: e.target.value || undefined })} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={!!st.control} onChange={e => patch(st.id, { control: e.target.checked || undefined })} />Point de contrôle : on vérifie ici avant de continuer</label>
          </fieldset>
          <Fold key={`links${st.id}`} open={otherLinks(st).length > 0} className="rounded-lg border border-slate-200" summary={`Autres liens vers les outils${otherLinks(st).length ? ` · ${otherLinks(st).length}` : ''}`}>
            <div className="border-t border-slate-200 px-3 py-3"><LinksEditor disabled={!can} processId={f.processId} links={otherLinks(st)} onChange={v => setLinks(st.id, [...richLinks(st), ...v])} nav={nav} hint="Un autre outil, ou une fiche d'un autre outil (fournisseur, contact…). Un lien s'ouvre dans un nouvel onglet." /></div>
          </Fold>
        </section></Fold>
        {can && <div><Button kind="danger" onClick={() => { remove(st.id); onClose(); }}><Trash2 size={13} />Supprimer l'étape</Button></div>}
      </div>
    </Modal>
  );
}
