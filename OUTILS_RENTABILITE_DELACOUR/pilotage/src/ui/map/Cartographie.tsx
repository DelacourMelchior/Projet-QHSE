// Tool 1.4 "Cartographie": the map of the processes in three bands (management, realisation, support), one sheet per process, one or several flowcharts per process, the yearly review.
// Addresses (`#1.4~…`): `<processId>[:tab]` a sheet, `flow:<flowId>` a flowchart, `review`, `new`.
import { useEffect, useState } from 'react';
import { ClipboardCheck, Lock, Plus, Eye } from 'lucide-react';
import type { MapBand, Process, State } from '../../domain/types';
import { BANDS, bandOf, exchanges, lostFlows, reqGaps, reviewBlockers, canAdmin, canDeleteProcess, deleteProcess, flowsOf, mapSummary, newFlow, newProcess, partnersOf, personGone, personName, plainName, processIssues, processUsage, reassignProcess, reviewMonths, rightOf, sortedProcesses } from '../../domain/cartography';
import { plural } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Modal, Summary, Tile, ToolHeader } from '../common';
import type { ScreenProps } from '../screens';
import { processCover } from '../../domain/mapCover';
import { loadMapExample } from '../../domain/mapExamples';
import { supportGaps } from '../../domain/mapSupport';
import { CodeBadge, Completeness } from './MapBits';
import { FlowEditor } from './FlowEditor';
import { MapReview } from './MapReview';
import { MapSettings } from './MapSettings';
import { ProcessSheet, type SheetTab } from './ProcessSheet';

type View = { v: 'map' } | { v: 'sheet'; id: string; tab: SheetTab } | { v: 'flow'; id: string } | { v: 'review' };
const TABS: SheetTab[] = ['identity', 'io', 'resources', 'cover', 'flows', 'matrix', 'indicators', 'review'];

// where a focus string leads inside this tool: 'review', 'flow:<id>', '<process>' or '<process>:<tab>'; undefined when the target no longer exists
function viewOf(state: State, focus: string): View | undefined {
  const [a, b = ''] = focus.split(':');
  if (focus === 'review') return { v: 'review' };
  if (a === 'flow') return state.flows[b] ? { v: 'flow', id: b } : undefined;
  return state.processes.some(p => p.id === a) ? { v: 'sheet', id: a, tab: TABS.includes(b as SheetTab) ? b as SheetTab : 'identity' } : undefined;
}

export function Cartographie({ focus, clearFocus, nav }: ScreenProps) {
  const { state, update, author } = useStore();
  const [view, setView] = useState<View>({ v: 'map' }), [adding, setAdding] = useState(false), [removing, setRemoving] = useState<string | null>(null), [naming, setNaming] = useState<string | null>(null), [gone, setGone] = useState(false), [hist, setHist] = useState<View[]>([]);

  useEffect(() => {
    if (!focus || !state) return;
    if (focus === 'new') { setView({ v: 'map' }); setAdding(canAdmin(state, author)); }
    else { const v = viewOf(state, focus); if (v) { setGone(false); setView(v); } else setGone(true); }   // else: an address kept from before, to something deleted
    setHist([]);
    clearFocus();
  }, [focus, !!state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;

  const hasTransverse = state.processes.some(p => bandOf(p) === 'transverse');
  const flows2 = exchanges(state);
  const now = new Date(), me = author, right = rightOf(state, me), admin = canAdmin(state, me), sm = mapSummary(state, now);
  if (right === 'none') return <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-600"><Lock size={16} />Vous n'avez pas accès à la cartographie des processus.</p>;
  // moving inside this tool changes the screen in place (back returns to where the person came from); only a jump to ANOTHER tool opens a new tab
  const open = (focus: string) => { const v = viewOf(state, focus); if (v) { setHist(h => [...h, view]); setView(v); window.scrollTo(0, 0); } else setGone(true); };
  const back = () => { const prev = hist[hist.length - 1]; setHist(h => h.slice(0, -1)); setView(prev || { v: 'map' }); window.scrollTo(0, 0); };
  // nothing is saved before the name is given: a flowchart with no name and no step typed would stay behind if the person changed their mind
  const newFlowFor = (processId: string, name: string) => { const f = newFlow(processId, name.trim(), now); f.updatedBy = me; update(d => { d.flows[f.id] = f; }); setNaming(null); setHist(h => [...h, view]); setView({ v: 'flow', id: f.id }); window.scrollTo(0, 0); };
  const nameDialog = naming && <FlowNameDialog onClose={() => setNaming(null)} onCreate={name => newFlowFor(naming, name)} />;

  if (view.v === 'flow') return <FlowEditor key={view.id} id={view.id} nav={nav} onBack={() => { const f = state.flows[view.id]; if (hist.length) back(); else setView(f ? { v: 'sheet', id: f.processId, tab: 'flows' } : { v: 'map' }); }} onOpenFlow={id => open(`flow:${id}`)} />;
  if (view.v === 'review') return <MapReview onBack={back} onOpen={id => open(`${id}:review`)} nav={nav} />;
  if (view.v === 'sheet') return <>
    <ProcessSheet id={view.id} tab={view.tab} onTab={tab => setView({ v: 'sheet', id: view.id, tab })} onBack={back} nav={nav} onOpenFlow={id => open(`flow:${id}`)} onNewFlow={setNaming} onDelete={setRemoving} />
    {nameDialog}
    {removing && <RemoveDialog id={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); setHist([]); setView({ v: 'map' }); }} />}
  </>;

  const ps = sortedProcesses(state), months = reviewMonths(state), firstWith = (key: string) => ps.find(p => processIssues(state, p, now).some(i => i.key === key));
  const goTo = (key: string) => { const p = firstWith(key); if (p) open(key === 'flow' ? `${p.id}:flows` : p.id); };
  const goneNote = gone && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">Ce logigramme (ou processus) n'existe plus.</p>;
  if (!ps.length) return (
    <div className="space-y-4">
      <ToolHeader title="Cartographie des processus" text="Les processus de l'entreprise, qui en répond et avec quels autres ils échangent." />
      {goneNote}
      <Empty title="Aucun processus" text="La carte est vide. Ajoutez les processus de l'entreprise : ce qu'elle fait de bout en bout, de la demande du client à la réalisation."
        children={admin ? <><Button kind="primary" onClick={() => setAdding(true)}><Plus size={14} />Ajouter un processus</Button><Button onClick={() => update(d => { loadMapExample(d, now); })}>Voir un exemple traité</Button></> : <p className="text-xs text-slate-700">Demandez à un administrateur de créer les processus.</p>} />
      {adding && <AddDialog state={state} onClose={() => setAdding(false)} onAdd={(name, band) => { if (!admin) return; const p = newProcess(state, name, band); update(d => { d.processes.push(p); }); setAdding(false); open(p.id); }} />}
    </div>
  );
  const lost = lostFlows(state);
  return (
    <div className="space-y-4">
      <ToolHeader title="Cartographie des processus" text="Les processus de l'entreprise, qui en répond et avec quels autres ils échangent. On la remplit une fois, on la relit chaque année. Les onglets P1 à P5 de l'en-tête classent les outils ; les processus de cette carte sont ceux de l'entreprise (les codes P1 à P5, s'ils existent encore, sont les mêmes).">
        {admin && <Button kind="primary" onClick={() => setAdding(true)}><Plus size={14} />Ajouter un processus</Button>}
        <Button onClick={() => open('review')}><ClipboardCheck size={14} />Revue des fiches{sm.old ? ` (${sm.old})` : ''}</Button>
      </ToolHeader>

      {goneNote}
      {lost.length > 0 && <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">{plural(lost.length, 'logigramme')} {lost.length > 1 ? 'ne sont rattachés' : 'n’est rattaché'} à aucun processus de la carte :{lost.map(f => <button key={f.id} type="button" onClick={() => open(`flow:${f.id}`)} className="rounded font-bold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{f.name || 'Sans nom'}</button>)}</p>}
      {right === 'view' && <p role="status" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"><Eye size={14} aria-hidden />Vous consultez la carte : votre droit est « Consulter ». Pour la modifier, demandez le droit « Modifier ses processus » ou « Administrer » à un administrateur.</p>}
      {!Object.keys(state.flows).length && right !== 'view' && <details className="rounded-xl border border-delacour-golddark/60 bg-amber-50/50 text-xs text-slate-800" open>
        <summary className="cursor-pointer px-4 py-3 font-bold text-delacour-primary">Par où commencer ?</summary>
        <ol className="list-decimal space-y-1 border-t border-amber-200 px-8 py-3">
          <li>Ouvrir un processus et nommer son <strong>pilote</strong> : la personne qui répond de ce travail.</li>
          <li>Écrire en une phrase <strong>à quoi il sert</strong>, ce qui le <strong>déclenche</strong> et ce qu'il <strong>livre</strong>.</li>
          <li>Décrire <strong>un seul cas courant</strong> (par exemple du devis à la commande) : onglet Logigrammes, Nouveau logigramme, puis Saisie rapide, une étape par ligne.</li>
          <li>Une fois par an, <strong>relire</strong> chaque fiche (Revue des fiches). Inutile de tout remplir d'un coup.</li>
        </ol>
      </details>}

      <Summary title="Où en est la carte"
        tiles={<>
          <Tile title="Processus" value={String(sm.count)} sub={sm.pct === null ? '' : `fiches remplies à ${sm.pct} % en moyenne`} />
          <Tile title="Sans pilote" value={String(sm.noPilot)} sub={sm.noPilot ? 'un clic ouvre le premier concerné' : 'tous ont un pilote'} tone={sm.noPilot ? 'alert' : 'ok'} onClick={sm.noPilot ? () => goTo('pilot') : undefined} />
          <Tile title="Sans logigramme" value={String(sm.noFlow)} sub={sm.noFlow ? 'un clic ouvre le premier concerné' : 'tous décrits'} tone={sm.noFlow ? 'warn' : 'ok'} onClick={sm.noFlow ? () => goTo('flow') : undefined} />
          <Tile title="À relire" value={String(sm.old)} sub={sm.old ? `plus de ${months} mois ou jamais` : 'revues à jour'} tone={sm.old ? 'warn' : 'ok'} onClick={() => open('review')} />
        </>}
        insights={[]} />
      <p className="-mt-2 text-xs text-slate-600">Chaque fiche est notée sur 9 points : pilote, à quoi il sert, ce qui le déclenche et ce qu'il livre, entrées et sorties, au moins un logigramme, logigrammes sans erreur, indicateur, cible de l'indicateur, relecture à jour. La barre est verte à partir de 80 %, orange à partir de 50 %.</p>

      <Card className="p-3 sm:p-4">
        <div>
          <div>
            <div className="grid min-w-0 gap-3 lg:[grid-template-columns:repeat(2,minmax(0,1fr))]">
              <div className={`min-w-0 space-y-3 ${hasTransverse ? '' : 'lg:col-span-2'}`}>
                {BANDS.filter(b => b.key !== 'transverse').map(b => {
                  const inBand = ps.filter(p => bandOf(p) === b.key);
                  return (
                    <section key={b.key} aria-label={b.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2.5"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">{b.label}</h3><p className="text-xs text-slate-600">{b.hint}</p></div>
                      {inBand.length ? <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">{inBand.map(p => <li key={p.id} className="min-w-0"><ProcessCard s={state} p={p} now={now} links={partnersOf(state, p)} onOpen={() => open(p.id)} /></li>)}</ul>
                        : <p className="text-xs text-slate-600">Aucun processus dans cette bande.</p>}
                    </section>
                  );
                })}
              </div>
              {hasTransverse && (() => {
                const b = BANDS.find(x => x.key === 'transverse')!;
                return (
                  <section aria-label={b.label} className="min-w-0 rounded-lg border-2 border-dashed border-slate-400 bg-white p-3">
                    <div className="mb-2.5"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">{b.label}</h3><p className="text-xs text-slate-600">{b.hint}</p></div>
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">{ps.filter(p => bandOf(p) === b.key).map(p => <li key={p.id} className="min-w-0"><ProcessCard s={state} p={p} now={now} links={partnersOf(state, p)} onOpen={() => open(p.id)} /></li>)}</ul>
                  </section>
                );
              })()}
            </div>
          </div>
        </div>
        {flows2.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <details className="min-w-0 flex-1 text-xs text-slate-700"><summary className="cursor-pointer font-semibold text-delacour-primary">Échanges entre processus ({flows2.length})</summary>
            <ul className="mt-2 space-y-1">{flows2.map(x => <li key={`${x.from}>${x.to}`}><strong>{x.from} vers {x.to}</strong> : {x.what.join(', ')}</li>)}</ul>
          </details>
        </div>}
      </Card>

      {admin && <MapSettings />}
      {adding && <AddDialog state={state} onClose={() => setAdding(false)} onAdd={(name, band) => { if (!admin) return; const p = newProcess(state, name, band); update(d => { d.processes.push(p); }); setAdding(false); open(p.id); }} />}
      {nameDialog}
    </div>
  );
}

// A card reads in three beats: what the process is (name, purpose), who answers for it (pilot, flowcharts, how complete), then what needs attention (amber marks only).
// Every card has the same size and the same places (name, purpose, pilot, marks, exchanges, completeness): a missing item leaves its place empty, long text is cut.
function ProcessCard({ s, p, now, links, onOpen }: { s: State; p: Process; now: Date; links: Process[]; onOpen(): void }) {
  const issues = processIssues(s, p, now), pilot = personName(s, p.pilotId), flows = flowsOf(s, p.id).length, cover = processCover(s, p.id, now), gaps = supportGaps(s, p.id), reqGap = reqGaps(s, p.id);
  const mark = 'rounded-full border px-2 py-0.5 text-[11px] font-semibold';
  // everything left to treat on a card is said once, in one line; the detail is on the sheet. Red only when something blocks (a red point of the sheet other than the review), amber otherwise.
  const parts = [
    cover.keyPerson > 0 && plural(cover.keyPerson, 'homme-clé', 'hommes-clés'),
    cover.uncovered > 0 && `${plural(cover.uncovered, 'compétence', 'compétences')} sans personne autonome`,
    cover.powerGaps > 0 && `${plural(cover.powerGaps, 'fonction clé', 'fonctions clés')} sans suppléant prêt`,
    gaps > 0 && `${plural(gaps, 'case vide', 'cases vides')} dans la matrice`,
    reqGap > 0 && `${plural(reqGap, 'exigence')} sans étape`,
    ...issues.filter(i => i.key !== 'pilot').map(i => i.text),
  ].filter(Boolean) as string[], blocked = reviewBlockers(s, p, now).length > 0;
  return (
    <button type="button" onClick={onOpen} className="flex w-full flex-col gap-2.5 overflow-hidden rounded-lg border border-slate-300 bg-white p-3 text-left hover:border-delacour-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark max-sm:min-h-[44px] lg:h-60">
      <span className="flex items-start gap-2"><span className="mt-px"><CodeBadge p={p} /></span><span className="min-w-0 flex-1 truncate text-sm font-bold leading-snug text-slate-900" title={plainName(p.name)}>{plainName(p.name) || '(sans nom)'}</span></span>
      <span className="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-600">{p.purpose || ''}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {pilot && personGone(s, p.pilotId) ? <span className={`${mark} border-red-200 bg-red-50 text-red-800`}>Pilote parti : {pilot}</span> : pilot ? <span className="font-semibold text-slate-800">Pilote : {pilot}</span> : <span className={`${mark} border-red-200 bg-red-50 text-red-800`}>Sans pilote</span>}
        <span aria-hidden className="text-slate-400">·</span><span className="text-slate-600">{plural(flows, 'logigramme')}</span>
      </span>
      <span className="flex min-h-[1.75rem] items-start"><span className={`${mark} ${parts.length ? (blocked ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950') : 'hidden'}`} title={parts.join(' · ')}>{plural(parts.length, 'point')} à traiter<span className="sr-only"> : {parts.join(', ')}</span></span></span>
      <span className="mt-auto flex flex-col gap-1.5">
        <span className="line-clamp-1 min-h-4 text-[11px] text-slate-600">{links.length > 0 ? `Échange avec : ${links.map(l => plainName(l.name).split(/\s*[&,]\s*/)[0]).join(', ')}` : ''}</span>
        <Completeness s={s} p={p} now={now} />
      </span>
    </button>
  );
}

// The name comes first: the flowchart is saved when it has one
function FlowNameDialog({ onClose, onCreate }: { onClose(): void; onCreate(name: string): void }) {
  const [name, setName] = useState('');
  return (
    <Modal onClose={onClose} title="Nouveau logigramme" subtitle="Le cas que vous allez décrire."
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={!name.trim()} onClick={() => onCreate(name)}>Créer</Button></>}>
      <Field label="Nom du logigramme" hint="Par exemple : le devis, la réclamation."><input className={inputCls} autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name); }} /></Field>
    </Modal>
  );
}

function AddDialog({ state, onClose, onAdd }: { state: State; onClose(): void; onAdd(name: string, band: MapBand): void }) {
  const [name, setName] = useState(''), [band, setBand] = useState<MapBand>('realisation');
  const dup = state.processes.some(p => plainName(p.name).trim().toLowerCase() === name.trim().toLowerCase());
  return (
    <Modal onClose={onClose} title="Ajouter un processus" subtitle="Il reçoit le prochain code libre. Ce code ne change plus, même si le nom change."
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={!name.trim() || dup} onClick={() => onAdd(name, band)}>Ajouter</Button></>}>
      <div className="space-y-3">
        <Field label="Nom" hint={dup ? 'Un processus porte déjà ce nom.' : "Ce que l'entreprise fait, par exemple Achats ou Livraison."}><input className={inputCls} autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && name.trim() && !dup) onAdd(name, band); }} /></Field>
        <div className="space-y-1"><span className="block text-xs font-semibold text-slate-700">Bande de la carte</span>
          <Chips value={band} onChange={setBand} items={BANDS.map(b => [b.key, b.label] as [MapBand, string])} /><span className="block text-xs text-slate-500">{BANDS.find(b => b.key === band)?.hint}</span></div>
      </div>
    </Modal>
  );
}

// Deleting a process: free, it goes with its flowcharts; used by other tools, it says by what and offers to move those records to another process first
function RemoveDialog({ id, onClose, onDone }: { id: string; onClose(): void; onDone(): void }) {
  const { state, update } = useStore();
  const [to, setTo] = useState('');
  if (!state) return null;
  const p = state.processes.find(x => x.id === id), usage = processUsage(state, id), flows = flowsOf(state, id), others = state.processes.filter(x => x.id !== id);
  if (!p) return null;
  const blockedByCall = usage.some(u => u.key === 'called'), last = state.processes.length <= 1, free = canDeleteProcess(state, id);
  return (
    <Modal onClose={onClose} title={`Supprimer ${p.id} · ${plainName(p.name)}`}
      footer={<>
        <Button onClick={onClose}>Annuler</Button>
        {usage.length > 0 && !last && <Button disabled={!to} onClick={() => update(d => { reassignProcess(d, id, to); })}>Réaffecter à {to || 'un autre processus'}</Button>}
        <Button kind="danger" disabled={!free} onClick={() => { update(d => { deleteProcess(d, id); }); onDone(); }}>Supprimer</Button>
      </>}>
      <div className="space-y-3 text-xs text-slate-800">
        {last ? <p className="font-semibold">C'est le dernier processus : il ne peut pas être supprimé. Une entreprise garde au moins un processus.</p> : usage.length ? <>
          <p className="font-semibold">Ce processus est encore utilisé. Il ne peut pas être supprimé tant que d'autres outils s'en servent. D'abord : réaffecter ce qui l'utilise. Ensuite : le supprimer.</p>
          <ul className="list-disc space-y-0.5 pl-4">{usage.map(u => <li key={u.key}>{plural(u.n, u.label, u.many)} (outil {u.tool})</li>)}</ul>
          {flows.length > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">Les {plural(flows.length, 'logigramme')} propres à ce processus ne sont pas déplacés : ils seront supprimés avec lui, définitivement.</p>}
          <Field label="Réaffecter la liste ci-dessus à" hint={blockedByCall ? "Les logigrammes appelés depuis d'autres processus changent aussi de processus." : undefined}>
            <select className={inputCls} value={to} onChange={e => setTo(e.target.value)}><option value="">Choisir un processus</option>{others.map(o => <option key={o.id} value={o.id}>{o.id} · {plainName(o.name)}</option>)}</select>
          </Field>
        </> : <p>La suppression est définitive.{flows.length ? ` ${plural(flows.length, 'logigramme')} de ce processus ${flows.length > 1 ? 'seront supprimés' : 'sera supprimé'} avec lui.` : ''}</p>}
      </div>
    </Modal>
  );
}
