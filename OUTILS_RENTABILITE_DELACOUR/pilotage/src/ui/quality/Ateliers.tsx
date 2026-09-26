// Tool 5.3 "Ateliers 5 Pourquoi": 15 minutes standing at the machine, the chain of whys checked backwards,
// a root cause that names a flaw of the process (never a person), countermeasures within 7 working days.
import { useEffect, useState } from 'react';
import { ArrowDown, FileDown, Plus, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import type { Analysis, State } from '../../domain/types';
import {
  actionsOfAnalysis, ANALYSIS_STATE, analysisInsights, analysisState, blamesPerson, newAnalysis, newPoka, pokasOfAnalysis, POKA_STATE, pokaState, slowActions,
} from '../../domain/quality';
import { applyQualityExample } from '../../domain/qualityExamples';
import { analysisPdf } from '../../domain/qualityPdf';
import { addDays, PROCESS_IDS, processLabel } from '../../domain/base';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { STATUS_LABEL } from '../ActionSheet';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

type Filter = 'open' | 'done' | 'all';
// lower case at the start of a clause, except an acronym or a name in capitals ("CNC", "BE")
const lc = (x: string) => { const y = x.trim().replace(/\.$/, ''); return /^[A-ZÀ-Ý]{2}/.test(y) ? y : y.charAt(0).toLowerCase() + y.slice(1); };

function sourceText(s: State, a: Analysis) {
  if (a.source.kind === 'nc') return s.ncs[a.source.id] ? `Bac rouge ${s.ncs[a.source.id].ref}` : 'Fiche du bac rouge';
  if (a.source.kind === 'complaint') return s.complaints[a.source.id] ? `Réclamation ${s.complaints[a.source.id].ref}` : 'Réclamation';
  if (a.source.kind === 'kpi') return s.kpis[a.source.id] ? `Indicateur ${s.kpis[a.source.id].name}` : 'Indicateur';
  return 'Problème constaté';
}

export function Ateliers({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Analysis | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.analyses[focus]) { setOpen(state.analyses[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.analyses).sort((a, b) => (a.date < b.date ? 1 : -1));
  const start = () => setOpen(newAnalysis(state, { kind: 'free', id: '' }, '', 'P3'));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Ateliers 5 Pourquoi : la cause racine, sans chercher de coupable" text="Dans les 2 heures qui suivent un défaut, 15 minutes debout devant la machine avec l'opérateur. On demande pourquoi jusqu'à trouver ce qui, dans le processus, a rendu l'erreur possible. Un atelier s'ouvre aussi depuis une fiche du bac rouge (5.1) ou une réclamation (2.3).">
          <Button kind="primary" onClick={start}><Plus size={14} />Nouvel atelier</Button>
          <Button onClick={() => update(d => applyQualityExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <AnalysisSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const st = all.map(a => ({ a, st: analysisState(state, a, now) }));
  const count = (k: string) => st.filter(x => x.st === k).length;
  const openOnes = st.filter(x => !['effective'].includes(x.st));
  const shown = filter === 'open' ? openOnes : filter === 'done' ? st.filter(x => x.st === 'effective') : st;
  return (
    <div className="space-y-4">
      <Summary title="Les causes racines sont-elles traitées ?" insights={analysisInsights(state, now)} tiles={<>
        <Tile title="Ateliers en cours" value={String(openOnes.length)} sub={`${count('draft')} cause(s) à trouver`} />
        <Tile title="Contre-mesure à décider" value={String(count('to_act'))} sub="cause trouvée, aucune action" tone={count('to_act') ? 'alert' : undefined} />
        <Tile title="Efficacité à vérifier" value={String(count('to_check'))} sub="actions faites, contrôle J+30 (5.4)" tone={count('to_check') ? 'warn' : undefined} />
        <Tile title="Efficaces" value={String(count('effective'))} sub={count('failed') ? `${count('failed')} récidive(s)` : 'défaut disparu'} tone={count('failed') ? 'alert' : count('effective') ? 'ok' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Ateliers" text="Un atelier par problème récurrent ou coûteux. Il est clos quand le défaut ne revient plus.">
          <Button kind="primary" onClick={start}><Plus size={14} />Nouvel atelier</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En cours', openOnes.length], ['done', 'Efficaces', count('effective')], ['all', 'Tous', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun atelier dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ a, st: x }) => (
              <Row key={a.id} onClick={() => setOpen(a)}
                lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{a.ref}</span>}
                title={a.problem || 'Problème à décrire'}
                sub={a.rootCause ? `Cause racine : ${a.rootCause}` : `${sourceText(state, a)} · ${processLabel(a.processId)}`}
                right={<><span className="block font-semibold text-slate-800">{a.pilot || <span className="text-red-700">Pilote à désigner</span>}</span>{frDate(a.date)}</>}
                badge={<StatusBadge level={ANALYSIS_STATE[x].tone} text={ANALYSIS_STATE[x].label} />} />
            ))}
          </ul>
        )}
      </Card>
      <Method rule="Ne blâmez jamais la personne. Si quelqu'un a pu se tromper, c'est que le processus a rendu l'erreur possible : c'est lui qu'on corrige."
        steps={[['15 minutes debout, sous 2 h', "Réunir l'opérateur, le régleur et le responsable devant la machine, tant que les faits sont frais."], ['Demander pourquoi', "Interdire « il n'a pas fait attention ». Chercher pourquoi le mauvais geste était possible."], ['Une action physique sous 7 jours', "Une butée, un gabarit, un blocage. Jamais seulement « on lui a redit »."]]}
        tips={['Test à rebours : lire de la cause racine vers le problème avec « donc ». Si chaque lien tient, la cause est la bonne.', "L'efficacité se vérifie sur le terrain 30 jours plus tard (outil 5.4)."]} />
      {open && <AnalysisSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

export function AnalysisSheet({ initial, onClose, nav }: { initial: Analysis; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [a, setA] = useState<Analysis>(() => structuredClone(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.analyses[a.id];
  const set = (p: Partial<Analysis>) => setA(x => ({ ...x, ...p }));
  const withA: State = { ...state, analyses: { ...state.analyses, [a.id]: a } };
  const st = analysisState(withA, a);
  const acts = actionsOfAnalysis(state, a.id);
  const pokas = pokasOfAnalysis(state, a.id);
  const whys = a.whys.map((w, i) => ({ w, i })).filter(x => x.w.trim());
  const valid = () => { if (!a.problem.trim()) { setError('Décrivez le problème : l\'écart constaté, factuel.'); return false; } setError(''); return true; };
  const commit = (x: Analysis) => { update(d => { d.analyses[x.id] = x; }); setSaved(JSON.stringify(x)); };
  const close = () => { if (JSON.stringify(a) === saved || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { commit(a); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer l'atelier ${a.ref} ? Ses actions restent dans le plan d'actions.`)) { update(d => { delete d.analyses[a.id]; }); onClose(); } };
  const addAction = () => { if (!valid()) return; commit(a); nav.newAction({ ref: { kind: 'analysis', id: a.id }, constat: `${a.problem}${a.rootCause ? ` · cause : ${a.rootCause}` : ''}` }); };
  const addPoka = () => {
    if (!valid()) return;
    commit(a);
    const p = { ...newPoka(a), owner: a.pilot || author };
    update(d => { d.pokas[p.id] = p; });
    onClose();
    nav.tool('5.4', p.id);
  };
  const pdf = () => downloadFile(`Atelier-5P-${fileSlug(a.ref)}.pdf`, analysisPdf(withA, a, { company: state.settings.companyName, date: new Date() }), 'application/pdf');
  const srcTool = a.source.kind === 'nc' && state.ncs[a.source.id] ? '5.1' : a.source.kind === 'complaint' && state.complaints[a.source.id] ? '2.3' : null;

  return (
    <Modal xwide onClose={close} title={isNew ? 'Nouvel atelier 5 Pourquoi' : `Atelier ${a.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{sourceText(state, a)} · {frDate(a.date)} <StatusBadge level={ANALYSIS_STATE[st].tone} text={ANALYSIS_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />Trame (PDF)</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-2">
            <SubTitle>1. Le problème</SubTitle>
            <Field label="Écart constaté, factuel (quoi, où, combien)"><input className={inputCls} value={a.problem} onChange={e => set({ problem: e.target.value })} /></Field>
            <div className="grid gap-2 sm:grid-cols-4">
              <Field label="Date"><input type="date" className={inputCls} value={a.date} onChange={e => set({ date: e.target.value })} /></Field>
              <Field label="Processus concerné">
                <select className={inputCls} value={a.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}</select>
              </Field>
              <Field label="Participants"><input className={inputCls} value={a.participants} placeholder="Opérateur, régleur, responsable" onChange={e => set({ participants: e.target.value })} /></Field>
              <Field label="Pilote"><input className={inputCls} value={a.pilot} list="people" onChange={e => set({ pilot: e.target.value })} /></Field>
            </div>
            {srcTool && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => { if (valid()) { commit(a); onClose(); nav.tool(srcTool, a.source.id); } }}>Ouvrir la fiche d'origine ({sourceText(state, a)})</button>}
          </section>

          <section className="space-y-2">
            <SubTitle>2. Pourquoi ? Pourquoi ? Pourquoi ?</SubTitle>
            <p className="text-[11px] text-slate-500">Chaque réponse est vérifiée sur place. On s'arrête quand on trouve ce qui, dans la méthode, le poste ou la conception, a rendu le problème possible.</p>
            <ol className="space-y-1">
              {[0, 1, 2, 3, 4].map(i => (
                <li key={i} className="space-y-1">
                  {i > 0 && <ArrowDown size={14} className="ml-3 text-slate-300" />}
                  <label className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[11px] font-semibold text-slate-700">Pourquoi {i + 1} ?</span>
                    <input className={inputCls} value={a.whys[i] || ''} placeholder={i === 0 ? 'Parce que…' : ''} onChange={e => { const w = [...a.whys]; w[i] = e.target.value; set({ whys: w }); }} />
                  </label>
                </li>
              ))}
            </ol>
            <Field label="Cause racine : la faille du processus">
              <input className={`${inputCls} font-semibold`} value={a.rootCause} onChange={e => set({ rootCause: e.target.value, backCheck: false })} />
            </Field>
            {blamesPerson(a.rootCause) && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">Cette cause désigne une personne. Demandez encore pourquoi : qu'est-ce qui a rendu l'erreur possible ?</p>}
          </section>

          {a.rootCause.trim() && (
            <section className="space-y-2 rounded-lg border border-slate-200 p-2.5">
              <SubTitle>Test à rebours</SubTitle>
              <p className="text-[11px] leading-relaxed text-slate-700">
                Puisque <strong>{lc(a.rootCause)}</strong>,{[...whys].reverse().filter(x => x.w.trim() !== a.rootCause.trim()).map(x => <span key={x.i}> donc {lc(x.w.replace(/^parce qu(e |')\s*/i, ''))},</span>)} donc <strong>{lc(a.problem) || 'le problème'}</strong>.
              </p>
              <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={a.backCheck} onChange={e => set({ backCheck: e.target.checked })} />Chaque « donc » tient : la cause racine est la bonne.</label>
            </section>
          )}
        </div>

        <aside className="space-y-3 lg:border-l lg:border-slate-100 lg:pl-4">
          <SubTitle>3. Contre-mesures</SubTitle>
          {acts.length === 0 && pokas.length === 0 && <p className="text-[11px] text-slate-500">Aucune pour l'instant. Une action physique, installée sous 7 jours ouvrés.</p>}
          <ul className="space-y-1.5">
            {acts.map(x => {
              const slow = slowActions(withA, a).includes(x);
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => nav.openAction(x.id)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50">
                    <span className="block text-slate-800">{x.plan.map(p => p.text).join(' · ') || x.constat}</span>
                    <span className="text-slate-500">{x.pilot} · <span className={slow ? 'font-semibold text-amber-800' : ''}>{frDate(x.deadline)}</span> · <strong className="text-slate-700">{STATUS_LABEL[x.status]}</strong></span>
                  </button>
                </li>
              );
            })}
            {pokas.map(p => {
              const ps = pokaState(p);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => { commit(a); onClose(); nav.tool('5.4', p.id); }} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50">
                    <span className="flex items-center gap-1 text-slate-800"><ShieldCheck size={13} className="text-delacour-primary" />Détrompeur : {p.description || p.defect}</span>
                    <StatusBadge level={POKA_STATE[ps].tone} text={POKA_STATE[ps].label} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            <Button className="!px-2 !py-1" onClick={addAction}><Plus size={13} />Action</Button>
            <Button className="!px-2 !py-1" onClick={addPoka}><ShieldCheck size={13} />Détrompeur (5.4)</Button>
          </div>
          <p className="text-[11px] text-slate-500">Les actions apparaissent aussi dans l'onglet Actions. Échéance conseillée : avant le {frDate(addDays(a.date, 9))}.</p>
        </aside>
      </div>
    </Modal>
  );
}
