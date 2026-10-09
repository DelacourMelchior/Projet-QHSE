// Sheet of one process (tool 1.4): identity, inputs and outputs, resources and documents, flowcharts, indicators and risks, review. Read only without the right to edit it.
import { ArrowLeft, ExternalLink, GitBranch, Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Flow, MapReq, Process } from '../../domain/types';
import { bandOf, BANDS, canAdmin, effectiveIo, effectiveRequirements, flowResources, flowDuplicates, dropFlowDuplicates, stepCountFor, sharedFlows, borrowedFlows, type Sourced, canEditProcess, canSee, flowIssues, flowsOf, moveKpi, moveRisk, plainName, bareName, processIssues, processName, readOnlyReason, REQ_KINDS, reviewBlockers, reviewMonths, reviewProcess, sortedProcesses } from '../../domain/cartography';
import { frDate } from '../../domain/periods';
import { processPeople } from '../../domain/team';
import { flowPowerIssues, flowRisks, processCover, usedByFlow } from '../../domain/mapCover';
import { useStore } from '../../store/StoreContext';
import type { Nav } from '../tools';
import { Button, Card, Chips, Field, inputCls, Modal } from '../common';
import { CodeBadge, ColHead, colStyle, Completeness, PersonSelect, ROW, Section, StrList, Todo } from './MapBits';
import { Fold } from './FlowBits';
import { plural } from '../../domain/receptions';
import { linkText } from './LinksEditor';
import { ChevronRight } from 'lucide-react';
import { LinksEditor } from './LinksEditor';
import { IoEditor, ReqEditor } from './Editors';
import { MapMatrix } from './Matrix';
import { supportGaps } from '../../domain/mapSupport';

export type SheetTab = 'identity' | 'io' | 'resources' | 'cover' | 'flows' | 'matrix' | 'indicators' | 'review';
const TABS: [SheetTab, string][] = [['identity', 'Identité'], ['io', 'Entrées et sorties'], ['resources', 'Ressources et remplaçants'], ['flows', 'Logigrammes'], ['indicators', 'Indicateurs et risques'], ['review', 'Revue']];
// The matrix and the key functions and skills used to be tabs of their own: an old address still opens them, in the tab they now belong to
const SHOWN: Record<SheetTab, SheetTab> = { identity: 'identity', io: 'io', resources: 'resources', cover: 'resources', flows: 'flows', matrix: 'flows', indicators: 'indicators', review: 'review' };

function DupNotice({ n, onDrop }: { n: number; onDrop(): void }) {
  return <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{n === 1 ? 'Une ligne ci-dessous est déjà écrite' : `${n} lignes ci-dessous sont déjà écrites`} dans les logigrammes : {n === 1 ? 'elle apparaît' : 'elles apparaissent'} en double.<Button onClick={onDrop}>Retirer {n === 1 ? 'le doublon' : 'les doublons'}</Button></p>;
}
const TONE_CHIP = { ok: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-950', alert: 'border-red-200 bg-red-50 text-red-900' };

export function ProcessSheet({ id, tab, onTab, onBack, nav, onOpenFlow, onNewFlow, onDelete }: {
  id: string; tab: SheetTab; onTab(t: SheetTab): void; onBack(): void; nav: Nav; onOpenFlow(flowId: string): void; onNewFlow(processId: string): void; onDelete(id: string): void;
}) {
  const { state, update, author, teamView } = useStore();
  const [note, setNote] = useState(''), [confirmReview, setConfirmReview] = useState(false), [fview, setFview] = useState<'list' | 'matrix'>(tab === 'matrix' ? 'matrix' : 'list'), [dupName, setDupName] = useState(false);
  useEffect(() => { if (tab === 'matrix') setFview('matrix'); }, [tab]);
  const p = state?.processes.find(x => x.id === id);
  if (!state || !p) return <Card className="p-4 text-xs text-slate-700">Ce processus n'existe plus. <Button onClick={onBack}>Retour à la carte</Button></Card>;

  const now = new Date(), can = canEditProcess(state, p, author), admin = canAdmin(state, author), months = reviewMonths(state), named = !!author.trim();
  const cover = processCover(state, id, now), blockers = reviewBlockers(state, p, now), shown = SHOWN[tab];
  // what is left to fill in each tab, shown on the tab itself
  const keys = processIssues(state, p, now).map(i => i.key), left = (...ks: string[]) => ks.filter(k => keys.includes(k)).length || undefined;
  const tabCount: Record<SheetTab, number | undefined> = { identity: left('name', 'pilot', 'deputy', 'purpose', 'trigger'), io: left('io'), resources: cover.keyPerson + cover.uncovered + cover.powerGaps || undefined, cover: undefined, flows: left('flow', 'flowissues'), matrix: undefined, indicators: left('kpi', 'target'), review: left('review') };
  const set = (fn: (x: Process) => void) => update(d => { const x = d.processes.find(q => q.id === id); if (x) fn(x); });
  const flows = flowsOf(state, id), others = sortedProcesses(state).filter(x => x.id !== id);
  const kpis = p.kpiIds.map(k => state.kpis[k]).filter(Boolean), risks = Object.values(state.risks).filter(r => r.processId === id);
  const otherKpis = Object.values(state.kpis).filter(k => k.processId !== id).sort((a, b) => a.name.localeCompare(b.name, 'fr')), otherRisks = Object.values(state.risks).filter(r => r.processId !== id).sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr'));
  const team = processPeople(state, id), mine = (p.equipmentIds || []).map(i => state.equipments[i]).filter(Boolean);
  const others_eq = Object.values(state.equipments).filter(e => !e.retiredAt && !(p.equipmentIds || []).includes(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const shared = sharedFlows(state, id), borrowed = borrowedFlows(state, id), effReq = effectiveRequirements(state, p).filter(x => x.flows.length > 0 || x.via), res = flowResources(state, p), eio = effectiveIo(state, p), fromFlows = <T,>(xs: Sourced<T>[]) => xs.filter(x => x.flows.length > 0);
  const chips = (flows: Flow[]) => flows.map(f => <button key={f.id} type="button" onClick={() => onOpenFlow(f.id)} className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{f.name || 'Sans nom'}</button>);
  const dups = flowDuplicates(state, p);
  // where a record is used: the flowcharts that rely on it, with the numbers of their steps (a click opens the flowchart here); nothing is alarming when none does
  const uses = (tool: string, rid: string) => { const u = usedByFlow(state, tool, rid); return u.length ? <span className="flex flex-wrap gap-1">{u.map(x => <button key={x.flow.id} type="button" onClick={() => onOpenFlow(x.flow.id)} className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{x.flow.name || 'Sans nom'}{x.steps.length ? ` · ${x.steps.length > 1 ? 'étapes' : 'étape'} ${x.steps.join(', ')}` : ''}</button>)}</span> : <span className="text-slate-500">Aucun logigramme ne l'utilise</span>; };
  const IO_COLS = 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1.2fr)', REQ_COLS = '11rem minmax(0,1.5fr) minmax(0,1.2fr)', EQ_COLS = 'minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr) 12rem', PW_COLS = 'minmax(0,1.2fr) minmax(0,1.2fr) 11rem minmax(0,1.3fr) 6rem', KPI_TARGET = canSee(state, author, 'targets', { team: teamView });
  const KPI_COLS = `minmax(0,1.4fr) ${KPI_TARGET ? '10rem ' : ''}minmax(0,1.3fr) 6rem`, REV_COLS = '7rem 12rem minmax(0,1fr)', RISK_COLS = 'minmax(0,1.4fr) minmax(0,1.3fr) 10rem', FLOW_COLS = '1.25rem minmax(0,1.3fr) minmax(0,1.3fr) minmax(0,1.2fr) minmax(0,1fr) 9rem 1rem';
  const io = (key: 'inputs' | 'outputs') => {
    const inn = key === 'inputs', derived = fromFlows(eio[key]);
    return (
      <>
        <Section title={inn ? 'Ce qui entre dans ce processus' : 'Ce qui sort de ce processus'} hint={inn ? `Rassemblé depuis ses logigrammes : on le saisit dans chaque logigramme (section « Fiche du logigramme »), c'est là qu'il est précis.` : 'Rassemblé de la même façon depuis ses logigrammes.'}>
          {derived.length ? <div><ColHead cols={IO_COLS} labels={[inn ? 'Ce qui entre' : 'Ce qui sort', inn ? 'De qui' : 'Pour qui', 'Écrit dans le logigramme']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{derived.map((x, i) => (
            <li key={i} style={colStyle(IO_COLS)} className={`${ROW} px-3 py-2 text-xs`}><span className="min-w-0 font-semibold text-slate-900">{x.item.what}</span><span className="min-w-0 text-slate-600">{x.item.processId ? `${x.item.processId} · ${processName(state, x.item.processId)}` : x.item.party || '…'}</span><span className="flex flex-wrap gap-1">{chips(x.flows)}</span></li>
          ))}</ul></div> : <p className="text-xs text-slate-500">Aucun logigramme ne le dit encore. Ouvrir un logigramme et renseigner sa fiche.</p>}
        </Section>
        <Fold key={key} open={(p[key] || []).length > 0} summaryClass="text-xs font-bold text-slate-900" summary={`${inn ? 'Autres entrées (hors logigramme)' : 'Autres sorties (hors logigramme)'}${(p[key] || []).length > 0 ? ` · ${(p[key] || []).length}` : ''}`}>
          <div className="space-y-2 border-t border-slate-100 p-3">
            <p className="text-xs text-slate-500">{`Seulement ce qui n'est dans aucun logigramme : ${inn ? 'une entrée générale' : 'une sortie générale'} du processus, par exemple.`}</p>
            {dups[key].length > 0 && can && <DupNotice n={dups[key].length} onDrop={() => set(x => dropFlowDuplicates(state, x))} />}
            <IoEditor kind={key} rows={p[key] || []} others={others} disabled={!can} onChange={v => set(x => { x[key] = v.length ? v : undefined; })} />
          </div>
        </Fold>
      </>
    );
  };
  const reqs: MapReq[] = p.requirements || [];
  const saveReview = () => { set(x => reviewProcess(x, author.trim(), note.trim())); setConfirmReview(false); setNote(''); };

  return (
    <div className="space-y-4">
      <div data-sticky-head className="sticky top-[88px] z-30 -mt-1 space-y-2 border-b border-slate-200 bg-slate-100 py-2 print:static">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button onClick={onBack}><ArrowLeft size={14} />La carte</Button>
          <span className="flex items-center gap-2"><CodeBadge p={p} /><h2 className="text-sm font-bold text-delacour-primary">{plainName(p.name) || '(sans nom)'}</h2></span>
          <span className="ml-auto"><Completeness s={state} p={p} now={now} /></span>
        </div>
        <Chips tabs label="Parties de la fiche" panelId="sheet-panel" value={shown} onChange={onTab} items={TABS.map(([k, l]) => [k, l, tabCount[k]] as [SheetTab, string, number | undefined])} />
      </div>
      {!can && <p role="status" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"><Lock size={14} aria-hidden />{readOnlyReason(state, author)}</p>}
      <Todo s={state} p={p} now={now} go={onTab} />

      <Card className="space-y-5 p-4"><div role="tabpanel" id="sheet-panel" aria-labelledby={`sheet-panel-tab-${shown}`} className="space-y-5">
        {shown === 'resources' && <div>
          <Section empty={!team.length} title="Personnes" hint="Les personnes rattachées à ce processus dans l'annuaire. Elles se choisissent sur leur fiche (outil 1.3).">
            {team.length ? <p className="text-xs text-slate-800">{team.map(t => t.name).join(', ')}</p> : <p className="text-xs text-slate-500">Personne n'est rattaché à ce processus.</p>}
            <Button onClick={() => nav.open('1.3')}>Ouvrir l'annuaire <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
          </Section>
        </div>}
        <fieldset className="min-w-0 space-y-5 border-0 p-0">
          <legend className="sr-only">Fiche du processus {plainName(p.name) || '(sans nom)'}</legend>
          {shown === 'identity' && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom du processus" hint={dupName ? 'Un autre processus porte déjà ce nom.' : 'Obligatoire.'}><input className={inputCls} disabled={!can} value={bareName(p.name)} placeholder="Ce que l'entreprise fait, par exemple Achats" onChange={e => { setDupName(false); set(x => { x.name = e.target.value; }); }} onBlur={() => { set(x => { x.name = x.name.trim(); }); setDupName(state.processes.some(q => q.id !== id && plainName(q.name).toLowerCase() === plainName(p.name).toLowerCase())); }} /></Field>
              <Field label="Bande de la carte" hint={BANDS.find(b => b.key === bandOf(p))?.hint}>
                <select className={inputCls} disabled={!can} value={bandOf(p)} onChange={e => set(x => { x.band = e.target.value as Process['band']; })}>{BANDS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}</select>
              </Field>
              <div className="sm:col-span-2"><Field label="À quoi il sert" hint="Une phrase : pourquoi ce processus existe."><input className={inputCls} disabled={!can} value={p.purpose || ''} placeholder="Par exemple : livrer au client ce qu'on lui a promis, dans les délais" onChange={e => set(x => { x.purpose = e.target.value; })} /></Field></div>
              <Field label="Pilote" hint="Obligatoire. La personne qui répond du processus, prise dans la liste du personnel (annuaire 1.3)."><PersonSelect disabled={!can} s={state} value={p.pilotId} onChange={v => set(x => { x.pilotId = v || undefined; })} label="Pilote" none="Aucun pilote" /></Field>
              <Field label="Suppléant du pilote" hint="Remplace le pilote en son absence et peut, comme lui, modifier la fiche."><PersonSelect disabled={!can} s={state} value={p.deputyId} onChange={v => set(x => { x.deputyId = v || undefined; })} label="Suppléant" none="Aucun suppléant" exclude={p.pilotId} /></Field>
              <Field label="Ce qui le déclenche"><input className={inputCls} disabled={!can} value={p.trigger || ''} placeholder="Le premier événement (une demande de prix reçue…)" onChange={e => set(x => { x.trigger = e.target.value; })} /></Field>
              <Field label="Ce qu'il livre à la fin"><input className={inputCls} disabled={!can} value={p.result || ''} placeholder="Le dernier résultat (produit livré et reçu…)" onChange={e => set(x => { x.result = e.target.value; })} /></Field>
            </div>
            <Section title="Exigences applicables" hint="Ce que le processus doit respecter. Les exigences précises se saisissent dans chaque logigramme ; ici, les exigences générales. « Tous les processus » = valable pour toute l'entreprise.">
              {effReq.length > 0 && <div><ColHead cols={REQ_COLS} labels={['Nature', 'Exigence', 'Étapes et logigrammes']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{effReq.map((x, i) => (
                <li key={i} style={colStyle(REQ_COLS)} className={`${ROW} px-3 py-2 text-xs`}><span className="min-w-0 font-semibold text-slate-700">{REQ_KINDS.find(k => k.key === x.item.kind)?.label}</span><span className="min-w-0 text-slate-900">{x.item.text}</span><span className="flex flex-wrap gap-1">{x.via ? <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-800">Tous les processus · écrit dans {x.via.id}</span> : <>{(n => <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${n ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>{n ? `${n} étape${n > 1 ? 's' : ''}` : 'Aucune étape'}</span>)(stepCountFor(x.flows, x.item))}{chips(x.flows)}</>}</span></li>
              ))}</ul></div>}
              {dups.requirements.length > 0 && can && <DupNotice n={dups.requirements.length} onDrop={() => set(x => dropFlowDuplicates(state, x))} />}
              <ReqEditor allowAll processId={id} rows={reqs} disabled={!can} onChange={v => set(x => { x.requirements = v; })} />
            </Section>
            {canSee(state, author, 'notes', { team: teamView, process: p }) && <Field label="Notes de la direction" hint="Réservé aux administrateurs et au pilote de ce processus et à son suppléant, sauf si l'entreprise les montre à l'équipe."><textarea className={inputCls} disabled={!can} rows={3} value={p.notes || ''} onChange={e => set(x => { x.notes = e.target.value; })} /></Field>}
            {admin && <section aria-label="Zone sensible" className="space-y-2 rounded-lg border border-red-200 bg-red-50/40 p-3">
              <h3 className="text-xs font-bold text-red-900">Zone sensible</h3>
              <p className="text-xs text-slate-700">Supprimer le processus est impossible tant que d'autres outils l'utilisent : il faut alors les réaffecter à un autre processus.</p>
              <Button kind="danger" onClick={() => onDelete(id)}><Trash2 size={14} />Supprimer le processus « {plainName(p.name) || p.id} »</Button>
            </section>}
          </>}

          {shown === 'io' && <>{io('inputs')}{io('outputs')}</>}

          {shown === 'resources' && <>
            <Section empty={!mine.length && !res.equipments.length} title="Équipements de ce processus" hint="Les équipements de l'outil 3.3 dont ce processus a besoin. Pour modifier un équipement lui-même, l'ouvrir dans l'outil 3.3.">
              {mine.length ? <div><ColHead cols={EQ_COLS} labels={['Équipement', 'Lieu et utilisateur', 'Utilisé dans les logigrammes', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{mine.map(e => (
                <li key={e.id} style={colStyle(EQ_COLS)} className={`${ROW} px-3 py-2 text-xs`}>
                  <span className="min-w-0 font-semibold text-slate-900">{e.name}</span><span className="min-w-0 text-slate-600">{[e.location, e.operator && `utilisé par ${e.operator}`].filter(Boolean).join(' · ') || '—'}</span>{uses('3.3', e.id)}
                  <span className="flex items-center justify-end gap-1"><Button onClick={() => nav.open('3.3', e.id)}>Ouvrir et modifier <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
                  <Button kind="ghost" disabled={!can} aria-label={`Retirer l'équipement ${e.name} de ce processus`} title={`Retirer ${e.name} de ce processus (l'équipement reste dans l'outil 3.3)`} onClick={() => set(x => { x.equipmentIds = (x.equipmentIds || []).filter(i => i !== e.id); })}><Trash2 size={14} /></Button></span>
                </li>))}</ul></div> : <p className="text-xs text-slate-500">Aucun équipement n'est rattaché à ce processus. Choisir ceux dont il a besoin pour fonctionner.</p>}
              {res.equipments.filter(r => !(p.equipmentIds || []).includes(r.id)).map(r => (
                <p key={r.id} className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-slate-900">{state.equipments[r.id].name}</span><span className="text-slate-600">via</span>{chips(r.flows)}<Button onClick={() => nav.open('3.3', r.id)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button></p>
              ))}
              {(p.equipmentIds || []).filter(i => !state.equipments[i]).map(i => <p key={i} className="flex items-center gap-2 text-xs text-amber-900">Un équipement rattaché n'existe plus dans l'outil 3.3.<Button kind="ghost" disabled={!can} aria-label="Retirer l'équipement supprimé" title="Retirer ce lien vers un équipement qui n'existe plus" onClick={() => set(x => { x.equipmentIds = (x.equipmentIds || []).filter(q => q !== i); })}><Trash2 size={14} /></Button></p>)}
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inputCls} !w-auto min-w-[16rem]`} disabled={!can || !others_eq.length} aria-label="Ajouter un équipement à ce processus" value="" onChange={e => { const v = e.target.value; if (v) set(x => { x.equipmentIds = [...(x.equipmentIds || []), v]; }); }}>
                  <option value="">{others_eq.length ? 'Ajouter un équipement…' : 'Aucun autre équipement dans l\'outil 3.3'}</option>{others_eq.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <Button onClick={() => nav.open('3.3')}>Créer ou gérer les équipements (3.3) <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
              </div>
            </Section>
            <Section empty={!(p.software || []).length} title="Logiciels"><StrList disabled={!can} value={p.software || []} onChange={v => set(x => { x.software = v; })} label="Logiciel" add="Ajouter un logiciel" placeholder="Nom du logiciel" /></Section>
            <Section empty={!(p.docs || []).length && !p.docLinks?.length && !res.docs.length} title="Documents et traces" hint="Les documents qui servent ou que le processus produit, nommés comme dans le plan de classement (outil 4.4), et les outils de l'application qui en gardent la trace.">
              {res.docs.filter(r => !(p.docs || []).includes(r.text)).map(r => <p key={r.text} className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-slate-900">{r.text}</span><span className="text-slate-600">via</span>{chips(r.flows)}</p>)}
              <StrList disabled={!can} value={p.docs || []} onChange={v => set(x => { x.docs = v; })} label="Document" add="Ajouter un document" placeholder="Nom du document ou du dossier" list="map-ged" />
              <datalist id="map-ged">{state.ged.folders.flatMap(f => [f.code, ...f.subfolders.map(s => `${f.code}/${s}`)]).map(c => <option key={c} value={c} />)}</datalist>
              <LinksEditor disabled={!can} links={p.docLinks || []} onChange={v => set(x => { x.docLinks = v.length ? v : undefined; })} nav={nav} title="Outils de l'application qui gardent des documents ou des traces" add="Ajouter un outil de l'application"
                hint="Par exemple les devis (2.1), les procès-verbaux de réception (3.4), les instructions de poste (3.2), les bilans de fin d'affaire (2.4), le plan de classement (4.4). Un outil entier, ou une de ses fiches." />
            </Section>
          </>}

          {shown === 'resources' && <>
            <Section empty={!cover.powers.length} title="Fonctions clés (outil 4.1)" hint="Les actes sans lesquels ce processus s'arrête, avec leur titulaire et leurs suppléants.">
              {cover.powers.length ? <div><ColHead cols={PW_COLS} labels={['Fonction clé', 'Titulaire et suppléants', 'État', 'Utilisée dans les logigrammes', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{cover.powers.map(c => (
                <li key={c.power.id} style={colStyle(PW_COLS)} className={`${ROW} px-3 py-2 text-xs`}>
                  <span className="min-w-0 font-semibold text-slate-900">{c.power.power.trim() || 'Fonction à décrire'}</span><span className="min-w-0 text-slate-600">Titulaire : {c.holder || 'aucun'} · Suppléants : {c.deputies.join(', ') || 'aucun'}</span>
                  <span><span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CHIP[c.tone]}`}>{c.label}</span></span>{uses('4.1', c.power.id)}
                  <span className="flex justify-end"><Button onClick={() => nav.open('4.1', c.power.id)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button></span>
                </li>))}</ul></div> : <p className="text-xs text-slate-500">Aucune fonction clé n'est rattachée à ce processus dans l'outil 4.1.</p>}
              <Button onClick={() => nav.open('4.1')}>Ouvrir les suppléances (4.1) <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
            </Section>
            <Section empty={!cover.skills.length} title="Compétences (outil 4.2)" hint="Qui sait faire quoi dans ce processus. Une compétence tenue par une seule personne est un risque : si elle manque, le travail s'arrête.">
              {cover.skills.length ? <div><ColHead cols={PW_COLS} labels={['Compétence', 'Personnes autonomes', 'État', 'Utilisée dans les logigrammes', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{cover.skills.map(c => (
                <li key={c.skill.id} style={colStyle(PW_COLS)} className={`${ROW} px-3 py-2 text-xs`}>
                  <span className="min-w-0 font-semibold text-slate-900">{c.skill.name}</span><span className="min-w-0 text-slate-600">{c.people.join(', ') || 'personne'}</span>
                  <span><span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CHIP[c.tone]}`}>{c.label}</span></span>{uses('4.2', c.skill.id)}
                  <span className="flex justify-end"><Button onClick={() => nav.open('4.2', c.skill.id)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button></span>
                </li>))}</ul></div> : <p className="text-xs text-slate-500">Aucune compétence n'est rattachée à ce processus dans l'outil 4.2.</p>}
              <Button onClick={() => nav.open('4.2')}>Ouvrir la polyvalence (4.2) <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
            </Section>
          </>}

          {shown === 'flows' && <div className="space-y-3"><Chips value={fview} onChange={setFview} items={[['list', 'Liste des logigrammes'], ['matrix', 'Matrice : ce qu\'il faut pour chaque étape', supportGaps(state, id) || undefined]]} />{fview === 'matrix' ? <MapMatrix processId={id} nav={nav} can={can} /> : <Section title="Logigrammes" hint="Un logigramme dessine les étapes d'un cas, de bout en bout, avec qui fait quoi. Commencer par le cas le plus courant (le devis, la réclamation…).">
            {flows.length ? <div><ColHead cols={FLOW_COLS} labels={['', 'Logigramme', 'Étapes · version · déclencheur', "S'appuie sur", 'À surveiller', 'État', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{flows.map(f => {
              const n = flowIssues(f, state).length, rk = flowRisks(f, state, now), risky = rk.length, pw = flowPowerIssues(f, state, now), worst = rk.some(r => r.tone === 'alert') ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950';
              return <li key={f.id}><button type="button" onClick={() => onOpenFlow(f.id)} style={colStyle(FLOW_COLS)} className={`${ROW} w-full min-w-0 px-3 py-2.5 text-left text-xs hover:bg-slate-50 max-sm:min-h-[44px]`}>
                <GitBranch size={15} className="shrink-0 text-slate-500" aria-hidden />
                <span className="min-w-0 truncate font-semibold text-slate-900">{f.name || 'Sans nom'}</span>
                <span className="min-w-0 truncate text-slate-600">{plural(f.steps.length, 'étape')} · version {f.version}{f.trigger ? ` · ${f.trigger}` : ''}</span>
                <span className="min-w-0 truncate text-slate-600" title={f.links?.map(l => linkText(state, l)).join(' · ')}>{f.links?.length ? f.links.map(l => linkText(state, l)).join(' · ') : '—'}</span>
                <span className="min-w-0 space-y-0.5">
                  {risky > 0 && <span className={`block w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${worst}`}>{risky} étape{risky > 1 ? 's' : ''} à risque</span>}
                  {pw.length > 0 && <span className="block"><span className={`block w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pw.some(x => x.tone === 'alert') ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>{pw.length} fonction{pw.length > 1 ? 's' : ''} clé{pw.length > 1 ? 's' : ''} à compléter</span><span className="line-clamp-2 text-[11px] text-slate-600" title={pw.map(x => `${x.name} : ${x.why}`).join(' · ')}>{pw.map(x => `${x.name} : ${x.why}`).join(' · ')}</span></span>}
                </span>
                <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${n ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{n ? `${n} point${n > 1 ? 's' : ''} à corriger` : 'Complet'}</span>
                <ChevronRight size={16} className="shrink-0 text-slate-500" aria-hidden /><span className="sr-only"> (ouvre le logigramme)</span>
              </button></li>;
            })}</ul></div> : <p className="text-xs text-slate-500">Aucun logigramme pour ce processus.</p>}
            {can && <Button kind="primary" onClick={() => onNewFlow(id)}><Plus size={14} />Nouveau logigramme</Button>}
            {(shared.length > 0 || borrowed.length > 0) && <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950">
              <p className="font-semibold">Ce processus travaille avec d'autres, par ses logigrammes</p>
              {shared.map(x => <p key={x.flow.id} className="flex flex-wrap items-center gap-1.5">Utilisé par d'autres processus : {chips([x.flow])}<span>appelé depuis</span>{x.callers.map(c => <button key={c.id} type="button" onClick={() => onOpenFlow(c.id)} className="rounded-full border border-violet-300 bg-white px-2 py-0.5 text-[11px] font-semibold hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{c.processId} · {c.name || 'Sans nom'}<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></button>)}</p>)}
              {borrowed.map(x => <p key={x.flow.id} className="flex flex-wrap items-center gap-1.5">Fait appel à un logigramme d'un autre processus : <button type="button" onClick={() => onOpenFlow(x.flow.id)} className="rounded-full border border-violet-300 bg-white px-2 py-0.5 text-[11px] font-semibold hover:bg-violet-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{x.flow.processId} · {x.flow.name || 'Sans nom'}</button><span>depuis</span>{chips(x.callers)}</p>)}
            </div>}
          </Section>}</div>}

          {shown === 'indicators' && <>
            <Section title="Indicateurs de ce processus" hint="Les indicateurs de l'outil 1.1 qui mesurent ce processus. On peut en rattacher un qui existe déjà ; on les crée et on les règle dans l'outil 1.1.">
              {kpis.length ? <div><ColHead cols={KPI_COLS} labels={['Indicateur', ...(KPI_TARGET ? ['Cible'] : []), 'Utilisé dans les logigrammes', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{kpis.map(k => (
                <li key={k.id} style={colStyle(KPI_COLS)} className={`${ROW} px-3 py-2 text-xs`}>
                  <span className="min-w-0 font-semibold text-slate-900">{k.name}</span>
                  {KPI_TARGET && <span className="min-w-0 text-slate-600">{k.confidential && (teamView || !can) ? 'Réservée' : k.targetValue === null || k.targetValue === undefined ? 'Non fixée' : k.target}</span>}
                  {uses('1.1', k.id)}
                  <span className="flex justify-end"><Button onClick={() => nav.open('1.1', k.id)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button></span>
                </li>))}</ul></div> : <p className="text-xs text-slate-500">Aucun indicateur n'est rattaché à ce processus.</p>}
              <select className={`${inputCls} !w-auto min-w-[16rem]`} disabled={!can || !otherKpis.length} aria-label="Rattacher un indicateur existant à ce processus" value="" onChange={e => { const v = e.target.value; if (v) update(d => { moveKpi(d, v, id); }); }}>
                <option value="">{otherKpis.length ? 'Rattacher un indicateur existant…' : 'Aucun autre indicateur'}</option>{otherKpis.map(k => <option key={k.id} value={k.id}>{k.name} (actuellement dans {k.processId})</option>)}
              </select>
            </Section>
            {canSee(state, author, 'risks', { team: teamView }) && <Section title="Risques et Plans B de ce processus" hint="Les risques de l'outil 1.2 qui touchent ce processus. Même principe : rattacher un risque existant ; on les décrit dans l'outil 1.2.">
              {risks.length ? <div><ColHead cols={RISK_COLS} labels={['Risque', 'Utilisé dans les logigrammes', '']} /><ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{risks.map(r => (
                <li key={r.id} style={colStyle(RISK_COLS)} className={`${ROW} px-3 py-2 text-xs`}>
                  <span className="min-w-0 font-semibold text-slate-900">{r.title || 'Sans titre'}</span>{uses('1.2', r.id)}
                  <span className="flex justify-end"><Button onClick={() => nav.openRisk(r.id)} title="La fiche du risque s'ouvre dans une fenêtre, par-dessus cette page">Ouvrir en fenêtre</Button></span>
                </li>))}</ul></div> : <p className="text-xs text-slate-500">Aucun risque n'est rattaché à ce processus.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inputCls} !w-auto min-w-[16rem]`} disabled={!can || !otherRisks.length} aria-label="Rattacher un risque existant à ce processus" value="" onChange={e => { const v = e.target.value; if (v) update(d => { moveRisk(d, v, id); }); }}>
                  <option value="">{otherRisks.length ? 'Rattacher un risque existant…' : 'Aucun autre risque'}</option>{otherRisks.map(r => <option key={r.id} value={r.id}>{r.title || 'Sans titre'} (actuellement dans {r.processId})</option>)}
                </select>
                <Button onClick={() => nav.open('1.2')}>Créer ou gérer les risques (1.2) <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
              </div>
            </Section>}
          </>}

          {shown === 'review' && <>
            <Section title="Dernière revue" hint={`Tous les ${months} mois au plus, le pilote relit la fiche et ses logigrammes et le dit ici.`}>
              <p className="text-xs text-slate-800">{p.reviewedAt ? `Relue le ${frDate(p.reviewedAt)} par ${p.reviewedBy || 'un auteur inconnu'}.` : 'Cette fiche n\'a jamais été relue.'}</p>
              <Button kind="primary" disabled={!can || !named || blockers.length > 0} onClick={() => setConfirmReview(true)}>Marquer comme relue, rien à changer</Button>
              {can && !named && <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-900">Renseignez votre nom dans les réglages : la revue est enregistrée à votre nom.<Button onClick={() => nav.settings()}>Ouvrir les réglages</Button></p>}
              {can && blockers.length > 0 && <p className="text-xs font-semibold text-red-800">Bloque la relecture : {blockers.map(b => b.text).join(' · ')}.</p>}
              {!can && <p className="text-xs text-slate-600">{readOnlyReason(state, author)}</p>}
            </Section>
            {!!p.reviews?.length && <Section title="Les revues passées"><div><ColHead edge="px-0" cols={REV_COLS} labels={['Date', 'Par', 'Ce qui a été vérifié']} /><ul className="space-y-1">{[...p.reviews].reverse().map((r, i) => <li key={i} style={colStyle(REV_COLS)} className={`${ROW} text-xs text-slate-700`}><span>{frDate(r.at)}</span><span className="min-w-0">{r.by || 'Non nommé'}</span><span className="min-w-0">{r.note || '—'}</span></li>)}</ul></div></Section>}
          </>}
        </fieldset>
      </div></Card>
      {can && <p className="text-[11px] text-slate-600 print:hidden">Chaque modification est enregistrée aussitôt : il n'y a pas de bouton « Enregistrer ».</p>}

      {confirmReview && <Modal onClose={() => setConfirmReview(false)} title="Fiche relue" subtitle={`${p.id} · ${plainName(p.name)}`}
        footer={<><Button onClick={() => setConfirmReview(false)}>Annuler</Button><Button kind="primary" onClick={saveReview}>Enregistrer la revue</Button></>}>
        <Field label="Ce qui a été vérifié (facultatif)"><input className={inputCls} autoFocus value={note} placeholder="Pilote, logigrammes, indicateurs" onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveReview(); } }} /></Field>
        <p className="mt-2 text-xs text-slate-500">Nom enregistré : {author}. {processName(state, id)} sera à relire dans {months} mois.</p>
      </Modal>}
    </div>
  );
}
