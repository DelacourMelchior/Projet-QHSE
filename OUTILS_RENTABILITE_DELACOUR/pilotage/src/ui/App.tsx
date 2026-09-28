// Shell: header (company, process, tools of the process, month, team/management view, storage, settings) + screens.
// 19 tools in 5 processes (see tools.ts). Actions is the single action register, filtered on the current process.
// Tool 1.1 has two screens (Indicateurs, Saisie); every other tool is one screen with its own sheets.
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, FolderSync, House, ListChecks, ListTodo, Lock, SlidersHorizontal } from 'lucide-react';
import type { Action, Risk } from '../domain/types';
import { newRisk } from '../domain/risk';
import { isoDate } from '../domain/periods';
import { knownPeople } from '../domain/base';
import { isOverdue, timelinePeriods } from '../domain/engine';
import { addMonths, periodLong } from '../domain/periods';
import { toolBadge } from '../domain/status';
import { useStore } from '../store/StoreContext';
import { Onboarding } from './Onboarding';
import { Piloter } from './Piloter';
import { Saisir } from './Saisir';
import { Agir } from './Agir';
import { ActionSheet, newAction } from './ActionSheet';
import { KpiDetail } from './KpiDetail';
import { Settings } from './Settings';
import { Risques } from './Risques';
import { RiskSheet } from './RiskSheet';
import { Annuaire } from './Annuaire';
import { ErrorBoundary } from './ErrorBoundary';
import { Home } from './Home';
import { MesTaches } from './MesTaches';
import { allTasks } from '../domain/tasks';
import { daysBetween } from '../domain/base';
import { SCREENS } from './screens';
import { actionTool, hashOf, PROCESSES, toolDef, toolOfHash, toolsOf, type Nav, type NewActionInit, type ProcessKey, type ToolId } from './tools';

type View = ToolId | 'home' | 'saisir' | 'actions' | 'taches';
const MONTHLY: View[] = ['1.1', '5.2'];

export function App() {
  const store = useStore();
  const { state, period, setPeriod, teamView, setTeamView, folder } = store;
  const [view, setViewState] = useState<View>(() => toolOfHash(window.location.hash));
  const [proc, setProc] = useState<ProcessKey>(() => { const t = toolOfHash(window.location.hash); return t === 'home' ? 'P1' : toolDef(t).process; });
  const [risk, setRisk] = useState<{ r: Risk; step: number } | null>(null);
  const [kpiOpen, setKpiOpen] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [settings, setSettings] = useState(false);
  const [focus, setFocus] = useState('');

  const title = view === 'home' ? 'Outils' : view === 'saisir' ? 'Saisie du mois' : view === 'actions' ? 'Actions' : view === 'taches' ? 'Mes tâches' : toolDef(view).title;
  useEffect(() => { document.title = `Delacour · ${title}`; }, [title]);
  // back and forward buttons of the browser, links between tools
  useEffect(() => {
    const onHash = () => { const t = toolOfHash(window.location.hash); setViewState(t); if (t !== 'home') setProc(toolDef(t).process); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (!state) return <Onboarding />;

  const ps = timelinePeriods(state);
  const go = (v: View, p = proc) => {
    setViewState(v);
    setProc(p);
    const hash = v === 'home' ? '#accueil' : v === 'saisir' || v === 'actions' || v === 'taches' ? '' : hashOf(v);
    if (v !== 'saisir' && v !== 'actions' && v !== 'taches') window.history.pushState(null, '', hash || window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
  };
  const openAction = (id: string) => { setKpiOpen(null); setRisk(null); setAction(state.actions[id]); };
  const startAction = (init: NewActionInit) => {
    setKpiOpen(null); setRisk(null);
    setAction(newAction(init.kpiId || '', init.kpiId ? period : isoDate(new Date()).slice(0, 7), init.riskId, init.ref, init.constat));
  };
  const openRisk = (id: string, step = 0) => setRisk({ r: state.risks[id], step });
  const nav: Nav = { tool: (id, f = '') => { setFocus(f); go(id, toolDef(id).process); }, openAction, newAction: startAction, openRisk };
  const forcedTeam = folder.status === 'connected' && !folder.hasDirection;
  const late = Object.values(state.actions).filter(a => isOverdue(a) && toolDef(actionTool(a)).process === proc).length;

  const myLate = allTasks(state).filter(t => t.who.toLowerCase() === store.author.trim().toLowerCase() && t.due && (daysBetween(t.due, new Date()) ?? 0) > 0).length;
  const restricted = (id: string) => teamView && (state.params.restricted || []).includes(id);
  const tabs: { id: View; label: string; badge?: { n: number; tone: string } }[] = view === 'home' || view === 'taches' ? [] : [
    ...toolsOf(proc).flatMap(t => {
      const b = toolBadge(state, t.id, period);
      const tab = { id: t.id as View, label: t.label, badge: b.n ? { n: b.n, tone: b.tone === 'alert' ? 'bg-red-600' : b.tone === 'warn' ? 'bg-amber-500' : 'bg-slate-500' } : undefined };
      if (t.id !== '1.1') return [tab];
      const b2 = toolBadge(state, 'saisie', period);
      return [tab, { id: 'saisir' as View, label: 'Saisie', badge: b2.n ? { n: b2.n, tone: 'bg-slate-500' } : undefined }];
    }),
    { id: 'actions', label: 'Actions', badge: late ? { n: late, tone: 'bg-red-600' } : undefined },
  ];
  const Screen = view !== 'home' && view !== 'saisir' && view !== 'actions' && view !== 'taches' && !restricted(view) ? SCREENS[view] : undefined;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-delacour-primary text-white shadow-sm print:static print:bg-white print:text-slate-900 print:shadow-none">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => go('home')} title="Tous les outils" aria-label="Tous les outils" className="flex shrink-0 items-center gap-1 rounded-md py-1 pr-1.5 text-emerald-100 hover:bg-white/10 hover:text-white print:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-delacour-gold text-sm font-black text-delacour-dark">D</span>
              <House size={15} className="hidden sm:block" />
            </button>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold">{state.settings.companyName || 'Mon entreprise'}</div>
              <div className="mt-0.5 flex max-w-full overflow-x-auto rounded-md bg-delacour-dark/60 p-0.5 print:hidden" role="group" aria-label="Processus">
                {PROCESSES.map(p => (
                  <button key={p.key} type="button" onClick={() => go(toolsOf(p.key)[0].id, p.key)} aria-pressed={view !== 'home' && proc === p.key} title={`${p.key} · ${p.name}`}
                    className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${view !== 'home' && proc === p.key ? 'bg-white text-delacour-primary' : 'text-emerald-50 hover:bg-white/10'}`}>
                    <span className="hidden sm:inline">{p.label}</span><span className="sm:hidden">{p.key}</span>
                  </button>
                ))}
              </div>
              <div className="hidden text-[11px] text-slate-500 print:block">{title}</div>
            </div>
          </div>

          <div className={`ml-auto flex items-center gap-1 print:hidden ${MONTHLY.includes(view) ? '' : '!hidden'}`}>
            <button type="button" aria-label="Mois précédent" disabled={period <= ps[0]} onClick={() => setPeriod(addMonths(period, -1))}
              className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Mois affiché"
              className="rounded-md border border-white/20 bg-delacour-dark px-2 py-1 text-xs font-semibold text-white">
              {ps.map(p => <option key={p} value={p}>{periodLong(p)}</option>)}
            </select>
            <button type="button" aria-label="Mois suivant" disabled={period >= ps[ps.length - 1]} onClick={() => setPeriod(addMonths(period, 1))}
              className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>

          <div className={`flex items-center gap-1.5 print:hidden ${MONTHLY.includes(view) ? '' : 'ml-auto'}`}>
            <button type="button" onClick={() => go('taches')} aria-pressed={view === 'taches'} title="Mes tâches : tout ce qu'il y a à faire, par échéance"
              className={`relative flex items-center gap-1.5 rounded-md border border-white/20 px-2 py-1.5 text-xs font-semibold hover:bg-white/10 ${view === 'taches' ? 'bg-white/15' : ''}`}>
              <ListTodo size={15} /><span className="hidden md:inline">Mes tâches</span>
              {myLate > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">{myLate}</span>}
            </button>
            <button type="button" disabled={forcedTeam} onClick={() => setTeamView(!teamView)} aria-pressed={teamView}
              title={forcedTeam ? "Vous n'avez pas accès au dossier direction" : teamView ? 'Vue équipe : montants confidentiels masqués' : 'Vue direction : tout est visible'}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-2 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-60">
              {teamView ? <EyeOff size={15} /> : <Eye size={15} />}<span className="hidden md:inline">{teamView ? 'Vue équipe' : 'Vue direction'}</span>
            </button>
            {folder.status !== 'unsupported' && folder.status !== 'local' && (
              <button type="button" onClick={() => folder.status === 'needs-permission' ? store.reconnectFolder() : setSettings(true)}
                title={folder.status === 'connected' ? `Dossier partagé · ${folder.contributors.join(', ')}` : folder.error || 'Stockage des données'}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold ${folder.status === 'connected' ? 'border-emerald-300/40 text-emerald-100' : 'border-amber-300/60 bg-amber-500/20 text-amber-100'} hover:bg-white/10`}>
                <FolderSync size={15} />
                <span className="hidden lg:inline">{{ connected: `Partagé${folder.lastSync ? ' · ' + folder.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`, 'needs-permission': 'Reconnecter le dossier', error: 'Dossier : erreur' }[folder.status]}</span>
              </button>
            )}
            <button type="button" onClick={() => setSettings(true)} aria-label="Réglages" className="rounded-md border border-white/20 p-1.5 hover:bg-white/10"><SlidersHorizontal size={15} /></button>
          </div>
        </div>

        <nav className={`mx-auto flex max-w-7xl gap-0.5 overflow-x-auto px-3 sm:gap-1 sm:px-6 print:hidden ${tabs.length ? '' : '!hidden'}`} aria-label="Outils du processus">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={view === t.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-2 py-2 text-xs font-semibold transition sm:px-3 ${view === t.id ? 'bg-slate-100 text-delacour-primary' : 'text-emerald-50 hover:bg-white/10'}`}>
              {t.id === 'actions' && <ListChecks size={15} className="hidden sm:block" />}
              {t.id !== 'actions' && t.id !== 'saisir' && <span className={`font-mono text-[11px] ${view === t.id ? 'text-delacour-gold' : 'text-emerald-200/80'}`}>{t.id}</span>}
              {t.label}
              {t.badge ? <span className={`rounded-full px-1.5 text-[11px] font-bold text-white ${t.badge.tone}`}>{t.badge.n}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        {teamView && view !== 'home' && view !== 'taches' && view !== '1.3' && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 print:hidden">Vue équipe : les montants confidentiels (chiffre d'affaires, marge, trésorerie, coûts des devis et des arrêts…) sont masqués.</p>}
        <ErrorBoundary key={view} label="Cet outil" onBack={() => go('home')}>
        {view === 'home' && <Home nav={nav} />}
        {view === 'taches' && <MesTaches nav={nav} />}
        {view !== 'home' && view !== 'taches' && restricted(view) && <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-600"><Lock size={16} />Outil réservé à la direction (Réglages, droits des outils).</p>}
        {view === '1.1' && !restricted('1.1') && <Piloter onOpenKpi={setKpiOpen} onNewAction={kpiId => startAction({ kpiId })} onOpenAction={openAction} goSaisir={() => go('saisir')} />}
        {view === 'saisir' && <Saisir done={() => go('1.1')} />}
        {view === 'actions' && <Agir key={proc} onOpenAction={openAction} onNewAction={startAction} onOpenRisk={id => openRisk(id, 2)} defaultScope={proc} />}
        {view === '1.2' && !restricted('1.2') && <Risques onOpenRisk={openRisk} onNewRisk={() => setRisk({ r: newRisk(state.processes[0]?.id || 'P1'), step: 0 })} onOpenDirectory={() => go('1.3')} />}
        {view === '1.3' && !restricted('1.3') && <Annuaire key={focus} focus={focus} nav={nav} />}
        {Screen && <Screen key={view} nav={nav} focus={focus} clearFocus={() => setFocus('')} />}
        </ErrorBoundary>
      </main>

      {kpiOpen && <KpiDetail kpiId={kpiOpen} onClose={() => setKpiOpen(null)} onOpenAction={openAction} onNewAction={kpiId => startAction({ kpiId })} />}
      {action && <ActionSheet key={action.id} initial={action} onClose={() => setAction(null)} />}
      {risk && <RiskSheet key={risk.r.id} initial={risk.r} startStep={risk.step} onClose={() => setRisk(null)} onNewAction={id => startAction({ riskId: id })} onOpenAction={openAction} />}
      {settings && <ErrorBoundary label="Les réglages" onBack={() => setSettings(false)}><Settings onClose={() => setSettings(false)} /></ErrorBoundary>}
      <datalist id="people">{knownPeople(state).map(p => <option key={p} value={p} />)}</datalist>
    </div>
  );
}
