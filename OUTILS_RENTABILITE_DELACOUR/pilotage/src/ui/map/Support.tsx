// What carries a step of a flowchart, from the flowchart: an instruction (3.2), a skill (4.2), a key function (4.1), an equipment (3.3), a risk (1.2), an indicator (1.1). For each, attach one
// that exists or create one from the step: the real sheet of the tool opens over the flowchart, prefilled, and the link is written when the sheet leaves a record behind.
import { useRef, useState } from 'react';
import { CircleAlert, Plus } from 'lucide-react';
import type { Flow, FlowLink, FlowStep } from '../../domain/types';
import { linkItems, linkLabel } from '../../domain/cartography';
import { usedInFlows } from '../../domain/mapCover';
import { createKpi, deleteCreated, draftFor, filled, linksOfTool, recordExists, SUPPORTS, withLink, type SupportDef, type SupportRecord } from '../../domain/mapSupport';
import { useStore } from '../../store/StoreContext';
import type { Nav, ToolId } from '../tools';
import { Button, inputCls } from '../common';
import { KpiDetail } from '../KpiDetail';
import { RiskSheet } from '../RiskSheet';
import { EqSheet } from '../operations/EqSheet';
import { SopSheet } from '../operations/SopSheet';
import { PwSheet } from '../team/PwSheet';
import { SkillSheet } from '../team/Polyvalence';

interface Open { tool: string; id: string; record?: SupportRecord; isNew: boolean }

// The real sheet of the tool, over the page
function Sheet({ open, nav, onClose }: { open: Open; nav: Nav; onClose(): void }) {
  const { state } = useStore();
  if (!state) return null;
  const { tool, id, record } = open;
  switch (tool) {
    case '3.2': { const r = (record || state.sops[id]) as SupportRecord | undefined; return r ? <SopSheet initial={r as never} nav={nav} onClose={onClose} /> : null; }
    case '4.2': { const r = record || state.skills[id]; return r ? <SkillSheet initial={r as never} nav={nav} onClose={onClose} /> : null; }
    case '4.1': { const r = record || state.powers[id]; return r ? <PwSheet id={id} draft={r as never} nav={nav} onClose={onClose} /> : null; }
    case '3.3': { const r = record || state.equipments[id]; return r ? <EqSheet initial={r as never} nav={nav} onClose={onClose} /> : null; }
    case '1.2': { const r = record || state.risks[id]; return r ? <RiskSheet initial={r as never} onClose={onClose} onNewAction={rid => nav.newAction({ riskId: rid })} onOpenAction={nav.openAction} /> : null; }
    case '1.1': return state.kpis[id] ? <KpiDetail kpiId={id} onClose={onClose} onOpenAction={nav.openAction} onNewAction={kpiId => nav.newAction({ kpiId })} /> : null;
    default: return null;
  }
}

export function SupportCell({ def, links, onLinks, flow, step, nav, readOnly, compact }: {
  def: SupportDef; links: FlowLink[]; onLinks(v: FlowLink[]): void; flow: Flow; step?: FlowStep; nav: Nav; readOnly?: boolean; compact?: boolean;   // no step: the link is made for the whole flowchart
}) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Open | null>(null), [more, setMore] = useState(false);
  const linksRef = useRef(links), stateRef = useRef(state);
  linksRef.current = links; stateRef.current = state;
  if (!state) return null;
  const st: FlowStep = step ?? { id: '', kind: 'action', label: flow.name, role: '' };
  const mine = linksOfTool({ links }, def.tool), n = flow.steps.findIndex(x => x.id === st.id) + 1, where = step ? `l'étape ${n}` : 'ce logigramme';
  const items = linkItems(state, def.tool, flow.processId).filter(x => !mine.some(l => l.id === x.id)), near = items.filter(x => x.mine), rest = items.filter(x => !x.mine);
  const opt = (x: { id: string; label: string }) => <option key={x.id} value={x.id}>{x.label}</option>;
  const attach = (id: string) => { if (id) onLinks(withLink(linksRef.current, { tool: def.tool, id })); };
  const detach = (id: string) => {
    onLinks(linksRef.current.filter(l => !(l.tool === def.tool && l.id === id)));
    // an indicator is created before anything is typed in it: detached from where it was created and used by nothing else, it can be deleted at once
    const own = def.kind === 'kpi' && (state.kpis[id] as { origin?: { flowId: string } } | undefined)?.origin?.flowId === flow.id, elsewhere = usedInFlows(state, def.tool, id).some(u => u.flow.id !== flow.id || (u.step?.id ?? '') !== (step?.id ?? ''));
    if (own && !elsewhere && window.confirm(`Cet indicateur a été créé depuis ${where}. Le supprimer aussi de l'outil 1.1 ? (OK : le supprimer, Annuler : le garder dans l'outil 1.1)`)) update(d => { deleteCreated(d, [{ kind: 'kpi', id }]); });
  };
  const create = () => {
    const origin = { flowId: flow.id, stepId: st.id };
    if (def.kind === 'kpi') {
      let id = '';
      update(d => { id = createKpi(d, flow.processId, st.label, origin); });
      onLinks(withLink(linksRef.current, { tool: '1.1', id }));
      setOpen({ tool: '1.1', id, isNew: false });
      return;
    }
    const record = draftFor(def.kind, state, flow, st);
    setOpen({ tool: def.tool, id: record.id, record, isNew: true });
  };
  // the sheet that was open on a new record leaves it behind when it was saved: then, and only then, the step is linked to it
  const closed = () => {
    const o = open;
    setOpen(null);
    if (o?.isNew) window.setTimeout(() => { if (stateRef.current && recordExists(stateRef.current, o.tool, o.id)) onLinks(withLink(linksRef.current, { tool: o.tool, id: o.id })); }, 80);
  };
  const controls = !readOnly && (
    <div className="flex flex-wrap items-center gap-1.5">
      <select className={`${inputCls} !w-auto max-w-full`} disabled={!items.length} aria-label={`Rattacher ${def.existing} à ${where}`} value="" onChange={e => attach(e.target.value)}>
        <option value="">{items.length ? `Rattacher ${def.existing}…` : `Aucune autre fiche à rattacher`}</option>
        {near.length > 0 ? <><optgroup label="De ce processus">{near.map(opt)}</optgroup>{rest.length > 0 && <optgroup label="Des autres processus">{rest.map(opt)}</optgroup>}</> : items.map(opt)}
      </select>
      <Button aria-label={`Créer ${def.a} depuis ${where}`} onClick={create}><Plus size={13} />{step ? "Créer depuis l'étape" : 'Créer depuis le logigramme'}</Button>
    </div>
  );
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        {mine.map(l => (
          <span key={l.id} className="inline-flex items-stretch overflow-hidden rounded-full border border-sky-300 bg-sky-50 text-[11px] font-semibold text-sky-900">
            <button type="button" className="px-2 py-0.5 text-left hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark" title={readOnly ? 'Ouvrir dans un nouvel onglet' : 'Ouvrir et modifier cette fiche'}
              onClick={() => (readOnly ? nav.open(def.tool as ToolId, l.id) : setOpen({ tool: def.tool, id: l.id!, isNew: false }))}>{linkLabel(state, l) ?? 'introuvable'}</button>
            {!readOnly && <button type="button" className="border-l border-sky-300 px-1.5 hover:bg-red-50 hover:text-red-800 max-sm:min-w-[44px]" aria-label={`Détacher ${linkLabel(state, l) ?? 'ce lien'} de ${where}`} title={step ? 'Détacher de cette étape (la fiche reste dans son outil)' : 'Détacher de ce logigramme (la fiche reste dans son outil)'} onClick={() => detach(l.id!)}>×</button>}
          </span>
        ))}
        {!mine.length && <span className="text-[11px] text-slate-500">{compact ? '—' : 'Rien pour l\'instant'}</span>}
        {compact && !readOnly && <button type="button" aria-expanded={more} aria-label={`Ajouter ${def.a} à ${where}`} onClick={() => setMore(!more)} className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-400 text-slate-600 hover:border-delacour-primary hover:text-delacour-primary"><Plus size={12} /></button>}
      </div>
      {(!compact || more) && controls}
      {open && <Sheet open={open} nav={nav} onClose={closed} />}
    </div>
  );
}

// A single amber mark on a step of work that lacks something expected of it (an instruction, a skill); nothing on a step that is covered.
// The detail of what is attached is in the panel of the step and in the matrix.
export function SupportGap({ links, roleRef, work, onOpen, label }: { links: FlowLink[]; roleRef?: FlowStep['roleRef']; work: boolean; onOpen(): void; label: string }) {
  const missing = work ? SUPPORTS.filter(d => d.required && !filled({ links, roleRef }, d)).map(d => d.column.toLowerCase()) : [];
  if (!missing.length) return null;
  const said = `il manque : ${missing.join(', ')}`;
  return (
    <button type="button" onClick={onOpen} title={`Étape sans ${missing.join(' ni ')}. Ouvrir l'étape pour en ajouter`} aria-label={`${label} : ${said}. Ouvrir l'étape`} className="inline-flex min-h-[24px] max-w-full items-center gap-1 whitespace-nowrap rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">
      <CircleAlert size={12} aria-hidden className="shrink-0" /><span className="truncate">Sans {missing.join(' ni ')}</span>
    </button>
  );
}
