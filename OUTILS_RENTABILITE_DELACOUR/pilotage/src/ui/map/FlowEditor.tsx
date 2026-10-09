// One flowchart of tool 1.4: the steps are typed as a list (or in quick entry, one line per step), the diagram is drawn from the list (a column per role) and stays in view while the list scrolls.
// The list is also the text version of the diagram. On a phone the flowchart is read, not edited (the editing rows are shown from the width of a tablet).
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, ExternalLink, GripVertical, History, ListPlus, Lock, Plus, Save, Trash2 } from 'lucide-react';
import type { Flow, FlowBranch, FlowLink, FlowStep, StepKind } from '../../domain/types';
import { arrowsInto, branchesOf, callersOf, canEditProcess, exitsOf, flowIssues, layoutFlow, moveStep, newStep, parseQuickSteps, plainName, removeStep, sortedProcesses, canSee, linkLabel, stepsMeeting, pruneStepReqs, withRoles, restoreVersion, saveVersion, STEP_KINDS } from '../../domain/cartography';
import { frDate } from '../../domain/periods';
import { flowRisks, stepCover } from '../../domain/mapCover';
import { activePeople } from '../../domain/team';
import { useStore } from '../../store/StoreContext';
import type { Nav } from '../tools';
import { Button, Card, Field, inputCls, Modal } from '../common';
import { PersonSelect } from './MapBits';
import { IoEditor, ReqEditor } from './Editors';
import { LinksEditor, linkText, openLink } from './LinksEditor';
import { StepPanel } from './StepPanel';
import { SupportGap } from './Support';
import { branchColor, branchTone, Chip, ChipButton, Fold, kindLabel, KIND_HELP, RoleCell, stepPlaceholder } from './FlowBits';
import { plural } from '../../domain/receptions';
import { createdFrom, deleteCreated, keepCreated, isWork, SUPPORTS, linksOfTool, type Created } from '../../domain/mapSupport';
import { SupportCell } from './Support';

// The links of the whole flowchart that have their own place in the sheet of the flowchart (indicators, risks) are not edited in the options: they are kept as they are when the options save
const ownCell = (l: FlowLink) => !!l.id && (l.tool === '1.1' || l.tool === '1.2');
const optLinks = (f: Pick<Flow, 'links'>) => (f.links || []).filter(l => !ownCell(l));
const KIND_STYLE: Record<StepKind, { fill: string; stroke: string }> = {
  start: { fill: '#ecfdf5', stroke: '#047857' }, end: { fill: '#ecfdf5', stroke: '#047857' }, action: { fill: '#ffffff', stroke: '#334155' },
  decision: { fill: '#fffbeb', stroke: '#b45309' }, document: { fill: '#f0f9ff', stroke: '#0369a1' }, subprocess: { fill: '#f5f3ff', stroke: '#6d28d9' },
};
const wrap = (t: string, n = 22, max = 3): string[] => {
  const out: string[] = [];
  let line = '';
  t.trim().split(/\s+/).filter(Boolean).forEach(w => { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; });
  if (line) out.push(line);
  return out.length > max ? [...out.slice(0, max - 1), out[max - 1].slice(0, n - 1) + '…'] : out;
};
const COLS = 'md:grid-cols-[1.5rem_7.5rem_minmax(0,1fr)_8rem_12rem]';
const GRID = `grid grid-cols-[1.5rem_minmax(0,1fr)] ${COLS}`;

const SHAPE: Record<StepKind, React.ReactNode> = {
  start: <rect x="1" y="1" width="26" height="12" rx="6" fill="#ecfdf5" stroke="#047857" />, end: <rect x="1" y="1" width="26" height="12" rx="6" fill="#ecfdf5" stroke="#047857" />,
  action: <rect x="1" y="1" width="26" height="12" rx="2" fill="#fff" stroke="#334155" />, decision: <polygon points="14,0 27,7 14,14 1,7" fill="#fffbeb" stroke="#b45309" />,
  document: <path d="M1 1 H27 V10 Q20 5 14 10 T1 10 Z" fill="#f0f9ff" stroke="#0369a1" />,
  subprocess: <><rect x="1" y="1" width="26" height="12" rx="2" fill="#f5f3ff" stroke="#6d28d9" /><line x1="5" x2="5" y1="1" y2="13" stroke="#6d28d9" /><line x1="23" x2="23" y1="1" y2="13" stroke="#6d28d9" /></>,
};
const LEGEND: StepKind[] = ['start', 'action', 'decision', 'subprocess', 'document'];



// The records a step or a flowchart created, with what deleting each would lose
function CreatedList({ items }: { items: Created[] }) {
  return <ul className="list-disc space-y-0.5 pl-4">{items.map(c => <li key={`${c.kind}${c.id}`}>{c.tool} · {c.label}{c.lost ? ` (perdu si supprimée : ${c.lost})` : ''}{c.signed && <strong className="text-red-800"> Instruction déjà lue ou signée.</strong>}{c.other && <em> Encore utilisée ailleurs : elle reste.</em>}</li>)}</ul>;
}

export function FlowEditor({ id, nav, onBack, onOpenFlow }: { id: string; nav: Nav; onBack(): void; onOpenFlow(id: string): void }) {
  const { state, update, author, teamView } = useStore();
  const [saving, setSaving] = useState(false), [history, setHistory] = useState(false), [removing, setRemoving] = useState(false), [alsoDelete, setAlsoDelete] = useState(false), [askStep, setAskStep] = useState<{ stepId: string; items: Created[] } | null>(null), [quick, setQuick] = useState(false), [note, setNote] = useState(''), [text, setText] = useState('');
  const [open, setOpen] = useState(''), [hot, setHot] = useState(''), [focusId, setFocusId] = useState(''), [hotLink, setHotLink] = useState(''), [drag, setDrag] = useState<number | null>(null), [over, setOver] = useState<number | null>(null), [said, setSaid] = useState(''), [refocus, setRefocus] = useState<{ id: string; dir: 'up' | 'down' } | null>(null);
  const f = state?.flows[id], proc = state?.processes.find(p => p.id === f?.processId), count = f?.steps.length ?? 0;
  // after a step is added with Enter, the cursor goes to its label
  useEffect(() => { if (focusId) { (document.getElementById(`lbl-${focusId}`) as HTMLInputElement | null)?.focus(); setFocusId(''); } }, [focusId, count]);
  // after a step is moved, the focus goes back to the button that was used (to the other one when it can no longer be used: the step is at the top or at the bottom)
  useEffect(() => {
    if (!refocus) return;
    const get = (d: string) => document.getElementById(`mv-${refocus.id}-${d}`) as HTMLButtonElement | null;
    let el = get(refocus.dir);
    if (!el || el.disabled) el = get(refocus.dir === 'up' ? 'down' : 'up');
    el?.focus(); setRefocus(null);
  }, [refocus, f?.steps]);
  if (!state || !f) return <Card className="p-4 text-xs text-slate-700">Ce logigramme n'existe plus. <Button onClick={onBack}>Retour</Button></Card>;

  const can = !!proc && canEditProcess(state, proc, author), issues = flowIssues(f, state), rf = withRoles(f, state), laid = layoutFlow(rf), risks = flowRisks(f, state), riskyIds = new Map(risks.map(r => [r.stepId, r.tone])), skillList = Object.values(state.skills).sort((x, y) => x.name.localeCompare(y.name, 'fr')), personList = activePeople(state), idx = (sid: string) => f.steps.findIndex(s => s.id === sid);
  const issuesOf = (sid: string) => issues.filter(i => i.stepId === sid);
  const edit = (fn: (x: Flow) => void) => update(d => { const x = d.flows[id]; if (x) fn(x); });
  const patch = (sid: string, v: Partial<FlowStep>) => edit(x => { x.steps = x.steps.map(s => (s.id === sid ? { ...s, ...v } : s)); });
  const move = (i: number, by: number) => {
    const j = i + by; if (j < 0 || j >= count) return;
    edit(x => { const a = [...x.steps]; [a[i], a[j]] = [a[j], a[i]]; x.steps = a; });
    setRefocus({ id: f.steps[i].id, dir: by < 0 ? 'up' : 'down' }); setSaid(`Étape déplacée en position ${j + 1}`);
  };
  const add = (after: number, kind: StepKind = 'action', where: 'details' | 'label' = 'details') => {
    const role = f.steps[after]?.role || '', st = newStep(kind, kind === 'start' || kind === 'end' ? '' : role);
    edit(x => { const a = [...x.steps]; a.splice(after + 1, 0, st); x.steps = a; });
    if (where === 'details') setOpen(st.id); else setFocusId(st.id);
  };
  // a decision made an action keeps its first answer as the arrow that follows (the other answers are dropped, said in the row); an action made a decision gets Oui (its arrow) and Non
  const changeKind = (st: FlowStep, kind: StepKind) => {
    if (kind === st.kind) return;
    if (st.kind === 'decision') {
      // the answers after the first are dropped: asked when they carry a target or a name of their own
      const lost = branchesOf(st).slice(1).filter(b => b.to || !['oui', 'non'].includes(b.label.trim().toLowerCase()));
      if (lost.length && !window.confirm(`Cette décision a ${lost.length + 1} réponses. En faire ${{ start: 'un début', end: 'une fin', document: 'un document', subprocess: 'un sous-processus' }[kind as string] || 'une action'} garde la première et supprime les autres (${lost.map(b => `« ${b.label.trim() || 'sans nom'} »`).join(', ')}) avec leurs flèches. Continuer ?`)) return;
      patch(st.id, { kind, goto: branchesOf(st)[0]?.to || undefined, branches: undefined, yes: undefined, no: undefined });
    } else if (kind === 'decision') patch(st.id, { kind, branches: [{ label: 'Oui', to: st.goto || '' }, { label: 'Non', to: '' }], goto: undefined });
    else patch(st.id, { kind });
  };
  // the records of the step that are deleted are those asked for that nothing else uses; the others stay, and forget where they came from
  const removeNow = (sid: string, items: Created[] = [], del = false) => update(d => { deleteCreated(d, del ? items.filter(c => !c.other) : []); keepCreated(d, del ? items.filter(c => c.other) : items); const x = d.flows[id]; if (x) x.steps = removeStep(x.steps, sid); });
  const closeRemoving = () => { setRemoving(false); setAlsoDelete(false); };
  // a step that created records (an instruction, a skill…) asks what becomes of them: by default they stay, they have their own life in their tool
  const remove = (sid: string) => {
    // the arrows that led to it are not kept silently: said before, they fall back on the next step (a decision answer stays without a target, flagged in the points to correct)
    const into = arrowsInto(f.steps, sid);
    if (into.length && !window.confirm(`Des flèches mènent à cette étape (depuis ${into.length > 1 ? 'les étapes' : 'l’étape'} ${into.join(', ')}). Elles seront retirées : ${into.length > 1 ? 'ces étapes passent' : 'cette étape passe'} à la suivante de la liste (une réponse de décision reste à relier). Supprimer l’étape ?`)) return;
    const items = createdFrom(state, id, sid); if (items.length) setAskStep({ stepId: sid, items }); else removeNow(sid); };
  const createdAll = createdFrom(state, id);
  const roleList = [...new Map([...f.steps.map(x => x.role), ...Object.values(state.flows).flatMap(x => x.steps.map(y => y.role)), ...Object.values(state.people).map(x => x.role)].map(r => r.trim().replace(/\s+/g, ' ')).filter(Boolean).map(r => [r.toLowerCase(), r] as const)).values()].sort((x, y) => x.localeCompare(y, 'fr'));   // a role is written once, whatever its case
  const jump = (sid: string) => { setOpen(sid); window.setTimeout(() => document.getElementById(`step-${sid}`)?.scrollIntoView?.({ block: 'nearest' }), 0); };
  const others = Object.values(state.flows).filter(x => x.id !== id).sort((a, b) => a.processId.localeCompare(b.processId) || a.name.localeCompare(b.name, 'fr'));
  const blank = f.steps.every(s => !s.label.trim());
  const callers = callersOf(state, id);
  // what the sheet of the flowchart holds, said on its folded line
  const linked = (tool: string) => new Set([...(f.links || []), ...f.steps.flatMap(x => x.links || [])].filter(l => l.tool === tool && l.id).map(l => l.id)).size;
  const sheetN = [[(f.inputs?.length || 0) + (f.outputs?.length || 0), 'entrée ou sortie', 'entrées et sorties'], [f.requirements?.length || 0, 'exigence', 'exigences'], [linked('1.1'), 'indicateur', 'indicateurs'], [linked('1.2'), 'risque', 'risques']] as const;
  const summary = sheetN.some(x => x[0]) ? sheetN.filter(x => x[0]).map(x => plural(x[0], x[1], x[2])).join(', ') : 'à quoi il sert, ce qui entre et sort, les exigences, les indicateurs et les risques : rien de renseigné';
  // a sub-process opens the flowchart it calls in a new tab (the page and the sheet stay as they are, like every jump to another page of the application); the callers are reached on this page
  const openFlow = (fid: string) => nav.open('1.4', `flow:${fid}`);
  const openLinkHere = (l: FlowLink) => openLink(nav, l), linkTextHere = (l: FlowLink) => linkText(state, l);
  const setLinks = (sid: string, links: FlowLink[]) => patch(sid, { links: links.length ? links : undefined });
  const setBranches = (sid: string, b: FlowBranch[]) => patch(sid, { branches: b, yes: undefined, no: undefined });
  const lit = (sid: string) => sid === hot || sid === open;
  const beforeEnd = f.steps.length - 1 - (f.steps.at(-1)?.kind === 'end' ? 1 : 0);
  const applyQuick = () => { const steps = parseQuickSteps(text, f.trigger); if (!steps.length) return; edit(x => { if (!blank) saveVersion(x, author, 'Avant la saisie rapide'); x.steps = steps; }); setQuick(false); setText(''); setOpen(''); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={onBack}><ArrowLeft size={14} />La fiche {f.processId}</Button>
        <span className="text-xs text-slate-600">{proc ? plainName(proc.name) : ''} · version {f.version}{f.updatedAt ? ` du ${frDate(f.updatedAt)}` : ''}{f.updatedBy ? ` par ${f.updatedBy}` : ''}{can ? ' · modifications enregistrées aussitôt' : ''}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {f.history.length > 0 && <Button onClick={() => setHistory(true)}><History size={14} />Versions ({f.history.length})</Button>}
          {can && <Button onClick={() => setSaving(true)} title="Les modifications sont déjà enregistrées. Une version est un repère auquel on pourra revenir."><Save size={14} />Marquer une version</Button>}
        </span>
      </div>
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
      {callers.length > 0 && <p className="flex flex-wrap items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">Ce logigramme est un sous-processus, appelé depuis : {callers.map(c => <button key={c.id} type="button" onClick={() => onOpenFlow(c.id)} className="rounded font-bold underline underline-offset-2 hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{c.name || 'Sans nom'}<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></button>)}</p>}
      {!can && <p role="status" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"><Lock size={14} />Lecture seule : seuls le pilote de {f.processId}, son suppléant et les administrateurs modifient ce logigramme.</p>}

      <Card className="p-4">
        <fieldset disabled={!can} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-3">
          <legend className="sr-only">Logigramme</legend>
          <Field label="Nom du logigramme" hint="Le cas décrit : le devis, la réclamation…"><input className={inputCls} value={f.name} onChange={e => edit(x => { x.name = e.target.value; })} /></Field>
          <Field label="Ce qui le déclenche"><input className={inputCls} value={f.trigger} onChange={e => edit(x => { x.trigger = e.target.value; })} /></Field>
          <Field label="Responsable de ce logigramme"><PersonSelect s={state} value={f.ownerId} onChange={v => edit(x => { x.ownerId = v || undefined; })} label="Responsable du logigramme" /></Field>
        </fieldset>
      </Card>

      {!can && (f.links || []).length > 0 && <div className="flex flex-wrap items-center gap-1.5" aria-label="Liens du logigramme"><span className="text-xs font-semibold text-slate-700">Ce logigramme s'appuie sur :</span>{(f.links || []).map((l, k) => <ChipButton key={k} title="Ouvrir dans un nouvel onglet" onClick={() => openLinkHere(l)}><ExternalLink size={10} aria-hidden />{linkTextHere(l)}</ChipButton>)}</div>}
      {can && blank && <Card className="hidden items-center gap-3 border-delacour-golddark/60 bg-amber-50/50 p-4 md:flex">
        <ListPlus size={20} className="shrink-0 text-delacour-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-xs text-slate-800"><strong>Le plus rapide :</strong> écrire les étapes d'un seul coup, une par ligne, puis affiner ensuite.</p>
        <Button kind="primary" onClick={() => setQuick(true)}>Saisie rapide</Button>
      </Card>}

      {risks.length > 0 && <details aria-label="Étapes à risque" className="rounded-lg border border-red-200 bg-red-50 text-xs text-red-950">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 px-3 py-2 font-bold sm:min-h-0">{risks.length} étape{risks.length > 1 ? 's' : ''} à risque si une personne manque (voir)</summary>
        <div className="space-y-1 border-t border-red-200 px-3 py-2">
          <h3 className="sr-only">À risque si une personne manque ({risks.length})</h3>
          <ul className="list-disc space-y-0.5 pl-4">{risks.map((r, k) => <li key={k}><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => jump(r.stepId)}>{r.text}</button></li>)}</ul>
          <p className="text-red-900">La pastille « ! » marque ces étapes sur le schéma.</p>
        </div>
      </details>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-28 xl:self-start">
          <Card className="min-w-0 overflow-auto p-3 xl:max-h-[calc(100vh-8rem)]">
            <svg role="group" aria-label={`Logigramme ${f.name || 'sans nom'} : ${plural(f.steps.length, 'étape')}, lues aussi dans la liste`} viewBox={`0 0 ${laid.width} ${laid.height}`} width={laid.width} height={laid.height} className="max-w-none text-slate-800">
              <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#334155" /></marker></defs>
              {laid.lanes.map((l, i) => (
                <g key={l}><rect x={laid.left + i * 210} y={0} width={210} height={laid.height} fill={i % 2 ? '#f8fafc' : '#f1f5f9'} stroke="#cbd5e1" /><text x={laid.left + i * 210 + 105} y={21} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">{l.length > 26 ? `${l.slice(0, 25)}…` : l}<title>{l}</title></text></g>
              ))}
              {laid.edges.map((e, k) => {
                const on = lit(e.from);
                return <g key={k}><path d={e.d} fill="none" stroke={on ? '#0f172a' : '#475569'} strokeWidth={on ? 2.5 : 1.5} markerEnd="url(#arrow)" strokeDasharray={e.back ? '5 3' : undefined} />
                  {e.label && <text x={e.lx} y={e.ly} fontSize="13" fontWeight="700" fill={branchColor(e.label)} stroke="#fff" strokeWidth="4" paintOrder="stroke">{e.label}</text>}</g>;
              })}
              {laid.nodes.map(n => {
                const st = f.steps[n.i], c = KIND_STYLE[st.kind], sub = st.kind === 'subprocess', called = sub && st.flowId ? state.flows[st.flowId] : undefined, link = st.kind !== 'decision' && !sub ? st.links?.[0] : undefined, lines = st.kind === 'decision' ? wrap(st.label || kindLabel(st.kind), 16, 2) : wrap(st.label || kindLabel(st.kind), 22, sub || link ? 2 : 3), cx = n.x + n.w / 2, cy = n.y + n.h / 2, on = lit(n.id), sw = on ? 3 : 1.5, stroke = on ? '#8a6a14' : c.stroke;
                const shape = st.kind === 'decision' ? <polygon points={`${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}`} fill={c.fill} stroke={stroke} strokeWidth={sw} />
                  : st.kind === 'start' || st.kind === 'end' ? <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.h / 2} fill={c.fill} stroke={stroke} strokeWidth={sw} />
                  : st.kind === 'document' ? <path d={`M${n.x} ${n.y} H${n.x + n.w} V${n.y + n.h - 8} Q${n.x + n.w * 0.75} ${n.y + n.h - 18} ${cx} ${n.y + n.h - 8} T${n.x} ${n.y + n.h - 8} Z`} fill={c.fill} stroke={stroke} strokeWidth={sw} />
                  : <><rect x={n.x} y={n.y} width={n.w} height={n.h} rx={4} fill={c.fill} stroke={stroke} strokeWidth={sw} />{st.kind === 'subprocess' && <><line x1={n.x + 8} x2={n.x + 8} y1={n.y} y2={n.y + n.h} stroke={stroke} /><line x1={n.x + n.w - 8} x2={n.x + n.w - 8} y1={n.y} y2={n.y + n.h} stroke={stroke} /></>}</>;
                const toolDef = link ? SUPPORTS.find(d => d.tool === link.tool) : undefined, nTool = link ? linksOfTool(st, link.tool).length : 0;
                const toolWord = !link ? '' : toolDef ? (nTool > 1 ? toolDef.column.toLowerCase().split(' ').map(w => `${w}s`).join(' ') : toolDef.column.toLowerCase()) : nTool > 1 ? 'liens' : 'lien';
                const toolText = link ? (nTool ? `${link.tool} · ${nTool} ${toolWord}` : `${link.tool} · outil entier`) : '';
                return (
                  <g key={n.id}>
                    <g role="button" tabIndex={0} aria-label={`Étape ${n.i + 1}, ${kindLabel(st.kind)} : ${st.label || 'sans intitulé'}${rf.steps[n.i].role ? `, ${rf.steps[n.i].role}` : ''}${riskyIds.has(n.id) ? ', à risque si une personne manque' : ''}`} className="cursor-pointer outline-none"
                      onClick={() => jump(n.id)} onMouseEnter={() => setHot(n.id)} onMouseLeave={() => setHot('')} onFocus={() => setHot(n.id)} onBlur={() => setHot('')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(n.id); } }}>
                      {shape}
                      {lines.map((ln, k) => <text key={k} x={cx} y={cy + (k - (lines.length - 1) / 2) * 13 + 4 - (sub ? 8 : link ? 5 : 0)} textAnchor="middle" fontSize="11" fill="#0f172a">{ln}</text>)}
                      {sub && !called && <text x={cx} y={n.y + n.h - 6} textAnchor="middle" fontSize="11" fontStyle="italic" fill="#5b21b6">↳ logigramme à choisir</text>}
                      <circle cx={n.x - 3} cy={n.y - 3} r={9} fill="#fff" stroke="#64748b" /><text x={n.x - 3} y={n.y + 1} textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">{n.i + 1}</text>
                      {riskyIds.has(n.id) && <g><circle cx={n.x + n.w + 3} cy={n.y + n.h + 3} r={9} fill={riskyIds.get(n.id) === 'alert' ? '#b91c1c' : '#b45309'} /><text x={n.x + n.w + 3} y={n.y + n.h + 7} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">!</text></g>}
                      {st.control && <g><circle cx={n.x + n.w + 3} cy={n.y - 3} r={9} fill="#b91c1c" /><text x={n.x + n.w + 3} y={n.y + 1} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">C</text></g>}
                    </g>
                    {/* the links are beside the step, not inside it: a link inside a button cannot be reached by a screen reader */}
                    {sub && called && <g role="link" tabIndex={0} aria-label={`Ouvrir le logigramme ${called.name || 'sans nom'} dans un nouvel onglet`} className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-delacour-golddark"
                      onClick={() => openFlow(called.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFlow(called.id); } }}
                      onMouseEnter={() => setHotLink(n.id)} onMouseLeave={() => setHotLink('')} onFocus={() => setHotLink(n.id)} onBlur={() => setHotLink('')}>
                      <rect x={n.x + 8} y={n.y + n.h - 19} width={n.w - 16} height={16} rx={4} fill={hotLink === n.id ? '#6d28d9' : '#ede9fe'} stroke="#6d28d9" strokeWidth={hotLink === n.id ? 2 : 1} />
                      <text x={cx} y={n.y + n.h - 7} textAnchor="middle" fontSize="11" fontWeight="700" fill={hotLink === n.id ? '#ffffff' : '#4c1d95'}>{`↳ ${(called.name || 'Sans nom').length > 17 ? `${(called.name || 'Sans nom').slice(0, 16)}…` : called.name || 'Sans nom'} ↗`}</text></g>}
                    {link && <g role="link" tabIndex={0} aria-label={`Ouvrir ${toolText} dans un nouvel onglet`} className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-delacour-golddark" onClick={() => openLinkHere(link)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLinkHere(link); } }}>
                      <text x={n.x + n.w - 6} y={n.y + n.h - 5} textAnchor="end" fontSize="11" fontWeight="700" fill="#0c4a6e" textDecoration="underline">↗ {toolText}</text></g>}
                  </g>
                );
              })}
            </svg>
            <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800">
              <summary className="cursor-pointer px-3 py-2 font-semibold text-delacour-primary">Comment lire ce schéma</summary>
              <dl className="space-y-2.5 border-t border-slate-200 px-3 py-3" aria-label="Légende">
                {LEGEND.map(k => (
                  <div key={k} className="grid grid-cols-[2rem_1fr] gap-x-2">
                    <svg width="28" height="14" aria-hidden className="mt-0.5">{SHAPE[k]}</svg>
                    <div><dt className="font-bold text-slate-900">{k === 'start' ? 'Début et fin' : kindLabel(k)}</dt><dd className="mt-0.5 text-slate-700">{k === 'start' ? `${KIND_HELP.start} ${KIND_HELP.end}` : KIND_HELP[k]}</dd></div>
                  </div>
                ))}
                <div className="grid grid-cols-[2rem_1fr] gap-x-2"><span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-700 text-[11px] font-bold text-white">C</span>
                  <div><dt className="font-bold text-slate-900">Point de contrôle</dt><dd className="mt-0.5 text-slate-700">Un moment où l'on vérifie avant de continuer (la marge, la conformité). À cocher sur n'importe quelle étape, dans ses détails.</dd></div></div>
                <div className="grid grid-cols-[2rem_1fr] gap-x-2"><span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-700 text-[11px] font-bold text-white">!</span>
                  <div><dt className="font-bold text-slate-900">Étape à risque</dt><dd className="mt-0.5 text-slate-700">Une étape liée à une compétence (4.2) ou à une fonction clé (4.1) qui s'arrêterait si une personne manquait : une seule personne autonome, pas de suppléant prêt, un titulaire absent. Rouge : urgent ; orange : fragile.</dd></div></div>
                <div className="grid grid-cols-[2rem_1fr] gap-x-2"><svg width="28" height="8" aria-hidden className="mt-1"><line x1="1" x2="27" y1="4" y2="4" stroke="#334155" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
                  <div><dt className="font-bold text-slate-900">Flèche en pointillés</dt><dd className="mt-0.5 text-slate-700">Un retour en arrière : la flèche revient à une étape déjà faite, on la refait.</dd></div></div>
                <p className="border-t border-slate-200 pt-2 text-slate-600">Les mots sur les flèches sont les réponses d'une décision (vert : Oui, rouge : Non, bleu : les autres). Un « ↗ 4.2 · 1 compétence » en bas d'une étape ouvre l'outil lié, dans un nouvel onglet. Les colonnes sont les rôles : chaque étape est dans la colonne de celui qui la fait. Les chiffres renvoient à la liste des étapes ; un clic sur une étape ouvre ses détails.</p>
              </dl>
            </details>
          </Card>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-900">Les étapes, dans l'ordre</h3>
            {can && !blank && <Button className="hidden md:inline-flex" onClick={() => setQuick(true)} title="Remplace toutes les étapes par un texte, une étape par ligne"><ListPlus size={13} />Saisie rapide</Button>}</div>
          <p className="hidden text-xs text-slate-600 md:block">L'ordre de la liste compte : sans indication contraire, on passe à l'étape du dessous. Pour revenir en arrière, sauter une étape ou voir ce qu'il faut pour la faire, ouvrir l'étape (flèche à droite). Une étape de travail sans instruction ou sans compétence est signalée en orange.</p>
          {issues.some(i => !i.stepId) && <ul className="hidden space-y-1 md:block" aria-label="Points à corriger pour tout le logigramme">{issues.filter(i => !i.stepId).map((i, k) => <li key={k} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950">{i.text}</li>)}</ul>}
          {issues.length > 0 && <ul className="space-y-1 md:hidden" aria-label="Points à corriger">{issues.map((i, k) => <li key={k} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-950">{i.text}</li>)}</ul>}
          <div className={`hidden gap-2 px-[11px] md:grid ${COLS} text-[11px] font-bold uppercase tracking-wide text-slate-600`} aria-hidden>
            <span title="Numéro de l'étape, repris dans le schéma">N°</span><span>Type</span><span>Intitulé de l'étape</span><span>Qui la fait</span><span className="text-right">Ouvrir</span>
          </div>
          {can && <p className="text-xs text-slate-600 md:hidden">Pour modifier les étapes, utilisez une tablette ou un ordinateur : ici, le logigramme se lit.</p>}
          <ol className="space-y-2">
            {f.steps.map((st, i) => {
              const ex = exitsOf(f, i), isOpen = open === st.id, bad = issuesOf(st.id);
              return (
                <li key={st.id} id={`step-${st.id}`} onMouseEnter={() => setHot(st.id)} onMouseLeave={() => setHot('')}
                  onDragOver={e => { if (drag !== null) { e.preventDefault(); setOver(i); } }} onDrop={e => { e.preventDefault(); if (drag !== null) edit(x => { x.steps = moveStep(x.steps, drag, i); }); setDrag(null); setOver(null); }}
                  className={`rounded-lg border bg-white ${drag !== null && over === i && drag !== i ? 'outline outline-2 outline-offset-2 outline-delacour-primary' : ''} ${drag === i ? 'opacity-50' : ''} ${isOpen ? 'border-delacour-golddark ring-2 ring-delacour-golddark/30' : hot === st.id ? 'border-delacour-golddark' : 'border-slate-300'}`}>
                  <div className={`${GRID} items-center gap-2 px-2.5 py-2`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-400 bg-white text-[11px] font-bold text-slate-700">{i + 1}</span>
                    <button type="button" onClick={() => setOpen(st.id)} className="min-w-0 text-left md:hidden" aria-label={`Ouvrir l'étape ${i + 1}`}>
                      <span className="block text-[11px] font-semibold text-slate-500">{kindLabel(st.kind)}{rf.steps[i].role ? ` · ${rf.steps[i].role}` : ''}</span><span className="block text-xs font-semibold text-slate-900">{st.label || 'Sans intitulé'}</span>
                    </button>
                    <select className={`${inputCls} hidden md:block`} disabled={!can} aria-label={`Type de l'étape ${i + 1}`} value={st.kind} onChange={e => changeKind(st, e.target.value as StepKind)}>{STEP_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
                    <input id={`lbl-${st.id}`} className={`${inputCls} hidden md:block`} disabled={!can} aria-label={`Intitulé de l'étape ${i + 1}`} value={st.label} placeholder={stepPlaceholder(st.kind) + (st.kind === 'end' ? '' : ' · Entrée : étape suivante')}
                      onChange={e => patch(st.id, { label: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && st.kind !== 'end') { e.preventDefault(); add(i, 'action', 'label'); } }} />
                    <span className="hidden min-w-0 md:block">{st.kind !== 'start' && st.kind !== 'end' && (can ? <RoleCell value={rf.steps[i].role} refKey={st.roleRef ? `${st.roleRef.kind === 'skill' ? '__sk:' : '__pp:'}${st.roleRef.id}` : ''} roles={roleList} skills={skillList} people={personList} label={`Qui fait l'étape ${i + 1}`} onPick={(role, ref) => patch(st.id, { role, roleRef: ref })} /> : <span className="text-xs text-slate-800">{rf.steps[i].role || '—'}</span>)}</span>
                    <span className="hidden items-center justify-end gap-0.5 md:flex">
                      {st.kind !== 'start' && st.kind !== 'end' && <SupportGap links={st.links || []} roleRef={st.roleRef} work={isWork(st)} label={`Étape ${i + 1}`} onOpen={() => setOpen(st.id)} />}
                      {can && <span draggable onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', st.id); const row = document.getElementById(`step-${st.id}`); if (row) e.dataTransfer.setDragImage(row, 16, 16); }} onDragEnd={() => { setDrag(null); setOver(null); }}
                        title="Glisser pour déplacer l'étape" aria-hidden className="cursor-grab rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:cursor-grabbing"><GripVertical size={15} /></span>}
                      {can && <Button kind="ghost" id={`mv-${st.id}-up`} className="!px-1" aria-label={`Monter l'étape ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></Button>}
                      {can && <Button kind="ghost" id={`mv-${st.id}-down`} className="!px-1" aria-label={`Descendre l'étape ${i + 1}`} disabled={i === f.steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></Button>}
                      <Button kind="ghost" className="!px-1" aria-label={`Ouvrir l'étape ${i + 1}`} title="Ouvrir l'étape : ce qu'il faut pour la faire, où elle mène, notes" onClick={() => setOpen(st.id)}><ChevronRight size={15} /></Button>
                    </span>
                  </div>
                  {(st.kind === 'decision' || st.control || st.doc || !!st.reqs?.length || st.kind === 'subprocess' || (ex[0]?.to && st.goto) || stepCover(state, st).some(c => c.tone !== 'ok')) && <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2 pl-11">
                    {st.kind === 'decision' ? ex.map((e, k) => <Chip key={k} tone={branchTone(e.label)}>{e.label || '?'} → {e.to ? idx(e.to) + 1 : '?'}</Chip>) : ex[0]?.to && st.goto && <Chip>Puis → {idx(ex[0].to) + 1}</Chip>}
                    {st.control && <Chip tone="ctl">Contrôle</Chip>}
                    {!!st.reqs?.length && <Chip>{st.reqs.length} exigence{st.reqs.length > 1 ? 's' : ''}</Chip>}
                    {st.doc && <Chip>{st.doc}</Chip>}
                    {st.kind === 'subprocess' && (st.flowId && state.flows[st.flowId] ? <ChipButton title="Ouvrir ce logigramme dans un nouvel onglet" onClick={() => openFlow(st.flowId!)}>↳ {state.flows[st.flowId].name || 'Sans nom'} <ExternalLink size={10} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></ChipButton> : <Chip>Logigramme à choisir</Chip>)}
                    {stepCover(state, st).some(c => c.tone !== 'ok') && <button type="button" onClick={() => setOpen(st.id)} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stepCover(state, st).some(c => c.tone === 'alert') ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>À risque si une personne manque</button>}
                  </div>}
                  {bad.length > 0 && <p className="hidden px-2.5 pb-2 pl-11 text-[11px] font-semibold text-amber-900 md:block">{bad.map(b => b.text.replace(/^[^:]+ : /, '')).join(' · ')}</p>}
                  {can && i < f.steps.length - 1 && <div className="hidden justify-center md:flex"><button type="button" onClick={() => add(i, 'action', 'label')} aria-label={`Insérer une étape après l'étape ${i + 1}`} title="Insérer une étape ici"
                    className="-mb-3 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 opacity-0 hover:border-delacour-primary hover:text-delacour-primary focus:opacity-100 [li:hover_&]:opacity-100"><Plus size={12} /></button></div>}
                </li>
              );
            })}
          </ol>
          {can && <div className="hidden flex-wrap gap-2 md:flex"><Button onClick={() => add(beforeEnd, 'action', 'label')}><Plus size={13} />Ajouter une étape</Button><Button onClick={() => add(beforeEnd, 'decision', 'label')}><Plus size={13} />Ajouter une décision</Button></div>}
          {can && <div className="pt-2"><Button kind="danger" onClick={() => setRemoving(true)}><Trash2 size={13} />Supprimer ce logigramme</Button></div>}
        </div>
      </div>

      <Fold className="rounded-xl border border-slate-200 bg-white" summaryClass="px-1 text-xs font-semibold text-delacour-primary" summary={<>Fiche du logigramme <span className="font-normal text-slate-600">· {summary}</span></>}>
        <fieldset disabled={!can} className="min-w-0 space-y-3 border-0 border-t border-slate-100 p-4">
          <legend className="sr-only">Fiche du logigramme</legend>
          <p className="text-xs text-slate-600">C'est ici que c'est précis. La fiche du processus rassemble ce qui est écrit dans ses logigrammes.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="À quoi sert ce logigramme" hint="En une phrase."><input className={inputCls} value={f.purpose || ''} onChange={e => edit(x => { x.purpose = e.target.value || undefined; })} /></Field>
            <Field label="Livrable ou résultat attendu" hint="Ce qui existe quand le logigramme est terminé."><input className={inputCls} value={f.result || ''} onChange={e => edit(x => { x.result = e.target.value || undefined; })} /></Field>
          </div>
          <Field label="Ce qui entre dans ce logigramme"><IoEditor kind="inputs" rows={f.inputs || []} others={sortedProcesses(state).filter(o => o.id !== f.processId)} disabled={!can} onChange={v => edit(x => { x.inputs = v.length ? v : undefined; })} /></Field>
          <Field label="Ce qui sort de ce logigramme"><IoEditor kind="outputs" rows={f.outputs || []} others={sortedProcesses(state).filter(o => o.id !== f.processId)} disabled={!can} onChange={v => edit(x => { x.outputs = v.length ? v : undefined; })} /></Field>
          <Field label="Exigences applicables à ce logigramme" hint="Un client, la loi, une norme, une règle interne."><ReqEditor processId={f.processId} rows={f.requirements || []} disabled={!can} meets={r => stepsMeeting(f, r.id).length} onChange={v => edit(x => { x.requirements = v.length ? v : undefined; pruneStepReqs(x); })} /></Field>
          {([['1.1', 'Indicateurs qui mesurent ce logigramme', 'Ce que l\'on suit pour savoir si ce logigramme se déroule bien.'], ['1.2', 'Risques de ce logigramme', 'Ce qui peut mal tourner dans ce logigramme, avec son Plan B.']] as const).filter(([tool]) => tool === '1.1' || canSee(state, author, 'risks', { team: teamView })).map(([tool, label, hint]) => {
            const def = SUPPORTS.find(d => d.tool === tool)!, byStep = new Map<string, number[]>();
            f.steps.forEach((s2, k) => (s2.links || []).forEach(l => { if (l.tool === tool && l.id && !(f.links || []).some(m => m.tool === tool && m.id === l.id)) byStep.set(l.id, [...(byStep.get(l.id) || []), k + 1]); }));
            return (
              <Field key={tool} label={label} hint={hint}>
                <SupportCell def={def} links={f.links || []} onLinks={v => edit(x => { x.links = v.length ? v : undefined; })} flow={f} nav={nav} readOnly={!can} />
                {byStep.size > 0 && <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">Liés par une étape :{[...byStep].map(([id, ns]) => <button key={id} type="button" onClick={() => nav.open(def.tool, id)} className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{linkLabel(state, { tool, id }) ?? 'introuvable'} · {ns.length > 1 ? 'étapes' : 'étape'} {ns.join(', ')}<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></button>)}</p>}
              </Field>
            );
          })}
        </fieldset>
      </Fold>

      {can && <Fold className="rounded-xl border border-slate-200 bg-white" summaryClass="px-1 text-xs font-semibold text-delacour-primary" summary={<>Options du logigramme : lier le logigramme entier à d'autres outils (facultatif){optLinks(f).length > 0 ? ` · ${optLinks(f).length}` : ''}</>}>
        <div className="space-y-2 border-t border-slate-100 px-4 py-3">
          {optLinks(f).length > 0 && <p className="text-xs font-semibold text-slate-700">Ce logigramme s'appuie sur : {optLinks(f).map(l => linkTextHere(l)).join(' · ')}</p>}
          <LinksEditor processId={f.processId} links={optLinks(f)} onChange={v => edit(x => { const all = [...(x.links || []).filter(ownCell), ...v]; x.links = all.length ? all : undefined; })} nav={nav} add="Lier le logigramme à un outil"
            hint="Ce sur quoi le logigramme entier s'appuie ou ce qu'il concerne : un équipement, une instruction de poste, une fonction clé, une compétence, un outil. Les indicateurs et les risques se lient dans la fiche du logigramme. Rien n'est obligatoire. Les fiches de ce processus sont proposées en premier ; chaque étape a aussi ses propres liens (dans les détails de l'étape)." />
        </div>
      </Fold>}

      {open && idx(open) >= 0 && <StepPanel f={f} rf={rf} i={idx(open)} can={can} nav={nav} skills={skillList} people={personList} roles={roleList} others={others} patch={patch} setLinks={setLinks} setBranches={setBranches} changeKind={changeKind}
        remove={remove} openFlow={openFlow} onGo={j => setOpen(f.steps[j].id)} onClose={() => setOpen('')} />}
      {quick && <Modal onClose={() => setQuick(false)} title="Saisie rapide" subtitle="Une étape par ligne. Tout se corrige ensuite dans la liste."
        footer={<><Button onClick={() => setQuick(false)}>Annuler</Button><Button kind={blank ? 'primary' : 'danger'} disabled={!text.trim()} onClick={applyQuick}>{blank ? 'Créer les étapes' : 'Remplacer toutes les étapes'}</Button></>}>
        <div className="space-y-3">
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-700">
            <li><strong>Rôle : intitulé</strong> pour dire qui fait l'étape (Commercial : Qualifier la demande). Sans rôle, l'étape sera signalée « qui la fait ? ».</li>
            <li>Une ligne qui finit par <strong>?</strong> est une décision, oui ou non (Marge suffisante ?).</li>
            <li>Pour d'autres réponses, les mettre entre crochets : Que décider ? [Retenu / À revoir / Refusé]. La première réponse va à la ligne suivante, les autres se relient ensuite dans la liste.</li>
            <li>Le début et la fin sont ajoutés tout seuls. Pour les nommer : « Début : … », « Fin : … ».</li>
          </ul>
          <p className="text-xs text-slate-600">Disponible sur ordinateur.</p>
          <textarea className={`${inputCls} font-mono`} rows={10} autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={'Commercial : Qualifier la demande\nCommercial : Chiffrer le devis\nDirection : Marge suffisante ?\nCommercial : Envoyer le devis\nFin : Commande signée'} aria-label="Les étapes, une par ligne" />
          {!blank && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">Les étapes actuelles sont remplacées, avec toutes leurs flèches (réponses, retours), leurs liens vers les outils, leurs documents et leurs remarques. Une version est gardée automatiquement : on pourra revenir en arrière dans « Versions ».</p>}
        </div>
      </Modal>}
      {saving && <Modal onClose={() => setSaving(false)} title="Marquer une version" subtitle="La version actuelle est gardée : on pourra y revenir."
        footer={<><Button onClick={() => setSaving(false)}>Annuler</Button><Button kind="primary" onClick={() => { edit(x => saveVersion(x, author, note.trim())); setSaving(false); setNote(''); }}>Marquer la version</Button></>}>
        <Field label="Ce qui a changé" hint="Quelques mots pour s'en souvenir dans un an."><input className={inputCls} autoFocus value={note} onChange={e => setNote(e.target.value)} /></Field>
      </Modal>}
      {history && <Modal onClose={() => setHistory(false)} title="Versions de ce logigramme" subtitle="Revenir à une version garde le contenu actuel comme version."
        footer={<Button onClick={() => setHistory(false)}>Fermer</Button>}>
        <ul className="divide-y divide-slate-100">{[...f.history].reverse().map(v => (
          <li key={v.version} className="flex items-center gap-3 py-2 text-xs"><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">Version {v.version} · {v.at ? frDate(v.at) : 'date inconnue'}{v.by ? ` · ${v.by}` : ''}</span><span className="block text-slate-600">{v.note || 'Sans commentaire'} · {plural(v.steps.length, 'étape')}</span></span>
            {can && <Button onClick={() => { edit(x => { restoreVersion(x, v.version, author); }); setHistory(false); }}>Revenir à cette version</Button>}</li>
        ))}</ul>
      </Modal>}
      {removing && <Modal onClose={closeRemoving} title="Supprimer ce logigramme" subtitle={f.name || 'Sans nom'}
        footer={<><Button onClick={closeRemoving}>Annuler</Button><Button kind="danger" onClick={() => { update(d => { deleteCreated(d, alsoDelete ? createdAll.filter(c => !c.other) : []); keepCreated(d, alsoDelete ? createdAll.filter(c => c.other) : createdAll); delete d.flows[id]; Object.values(d.flows).forEach(o => o.steps.forEach(s => { if (s.flowId === id) s.flowId = undefined; })); }); setAlsoDelete(false); onBack(); }}>Supprimer</Button></>}>
        <div className="space-y-3 text-xs text-slate-800">
          <p>La suppression est définitive, avec ses {f.history.length} versions. Les étapes d'autres logigrammes qui l'appellent perdent leur lien.</p>
          {createdAll.length > 0 && <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            <p className="font-semibold">Ce logigramme a créé {createdAll.length} fiche{createdAll.length > 1 ? 's' : ''} dans les autres outils :</p>
            <CreatedList items={createdAll} />
            {createdAll.some(c => !c.other) && <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={alsoDelete} onChange={e => setAlsoDelete(e.target.checked)} />Supprimer aussi {createdAll.some(c => c.other) ? 'celles que rien d’autre n’utilise' : 'ces fiches'} (sinon elles restent dans leur outil)</label>}
          </div>}
        </div>
      </Modal>}
      {askStep && <Modal onClose={() => setAskStep(null)} title="Cette étape a créé des fiches" subtitle="Que deviennent-elles ?"
        footer={<><Button onClick={() => setAskStep(null)}>Annuler</Button><Button kind="primary" onClick={() => { removeNow(askStep.stepId, askStep.items); setAskStep(null); }}>Retirer l'étape, garder les fiches</Button>{askStep.items.some(c => !c.other) && <Button kind="danger" onClick={() => { removeNow(askStep.stepId, askStep.items, true); setAskStep(null); }}>Retirer l'étape et supprimer {askStep.items.some(c => c.other) ? 'les fiches non utilisées ailleurs' : 'les fiches'}</Button>}</>}>
        <div className="space-y-2 text-xs text-slate-800">
          <CreatedList items={askStep.items} />
          <p>Par défaut elles restent dans leur outil, sans lien avec un logigramme : elles apparaissent alors dans « Fiches non reliées » de la matrice du processus.</p>
        </div>
      </Modal>}
    </div>
  );
}
