// Shell: header (company, tool, month, team/management view, storage, settings) + screens.
// Tool 1.1 "Indicateurs": Piloter, Saisir, Agir. Tool 1.2 "Plans B" (#continuite): Cartographie, Tests, Agir.
// Tool 1.3 "Annuaire" (#annuaire): the crisis directory, one screen. Agir is the single action register of 1.1 and 1.2.
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Eye, EyeOff, FolderSync, Grid3x3, LayoutDashboard, ListChecks, PenLine, SlidersHorizontal } from 'lucide-react';
import type { Action, Risk } from '../domain/types';
import { newRisk, riskSummary } from '../domain/risk';
import { isoDate } from '../domain/periods';
import { isOverdue, synthesis, timelinePeriods } from '../domain/engine';
import { addMonths, periodLong } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Onboarding } from './Onboarding';
import { Piloter } from './Piloter';
import { Saisir } from './Saisir';
import { Agir } from './Agir';
import { ActionSheet, newAction } from './ActionSheet';
import { KpiDetail } from './KpiDetail';
import { Settings } from './Settings';
import { Risques } from './Risques';
import { Tests } from './Tests';
import { RiskSheet } from './RiskSheet';
import { Annuaire } from './Annuaire';

type Screen = 'piloter' | 'saisir' | 'agir' | 'risques' | 'tests' | 'annuaire';
type Tool = 'kpi' | 'risk' | 'dir';
const TOOLS: Record<Tool, { label: string; hash: string; first: Screen; title: string }> = {
  kpi: { label: 'Indicateurs', hash: '', first: 'piloter', title: 'Tableau de pilotage mensuel' },
  risk: { label: 'Plans B', hash: '#continuite', first: 'risques', title: "Continuité d'activité : Plans B" },
  dir: { label: 'Annuaire', hash: '#annuaire', first: 'annuaire', title: 'Annuaire' },
};
const toolOfHash = (): Tool => (Object.keys(TOOLS) as Tool[]).find(t => TOOLS[t].hash && TOOLS[t].hash === window.location.hash) || 'kpi';

export function App() {
  const store = useStore();
  const { state, period, setPeriod, teamView, setTeamView, folder } = store;
  const [tool, setToolState] = useState<Tool>(toolOfHash);
  const [screen, setScreen] = useState<Screen>(() => TOOLS[toolOfHash()].first);
  const [risk, setRisk] = useState<{ r: Risk; step: number } | null>(null);
  const [kpiOpen, setKpiOpen] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => { document.title = `Pilotage Delacour · ${TOOLS[tool].title}`; }, [tool]);
  if (!state) return <Onboarding />;

  const ps = timelinePeriods(state);
  const syn = synthesis(state, period);
  const late = Object.values(state.actions).filter(a => isOverdue(a)).length;
  const openAction = (id: string) => { setKpiOpen(null); setRisk(null); setAction(state.actions[id]); };
  const startAction = (kpiId: string, riskId?: string) => {
    setKpiOpen(null); setRisk(null);
    setAction(newAction(kpiId, riskId ? isoDate(new Date()).slice(0, 7) : period, riskId));
  };
  const openRisk = (id: string, step = 0) => setRisk({ r: state.risks[id], step });
  const setTool = (t: Tool) => {
    setToolState(t);
    setScreen(TOOLS[t].first);
    window.history.replaceState(null, '', TOOLS[t].hash || window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
  };
  const rsum = riskSummary(state);
  const forcedTeam = folder.status === 'connected' && !folder.hasDirection;

  const agir = { id: 'agir' as Screen, label: 'Agir', icon: ListChecks, badge: late || undefined, badgeTone: 'bg-red-600' };
  const TABS: { id: Screen; label: string; icon: typeof LayoutDashboard; badge?: number; badgeTone?: string }[] = tool === 'kpi' ? [
    { id: 'piloter', label: 'Piloter', icon: LayoutDashboard, badge: syn.alerts.length || undefined, badgeTone: 'bg-red-600' },
    { id: 'saisir', label: 'Saisir', icon: PenLine, badge: syn.total - syn.filled || undefined, badgeTone: 'bg-slate-500' },
    agir,
  ] : tool === 'risk' ? [
    { id: 'risques', label: 'Cartographie', icon: Grid3x3, badge: rsum.byState.uncovered || undefined, badgeTone: 'bg-red-600' },
    { id: 'tests', label: 'Tests', icon: CalendarCheck, badge: rsum.toTest || undefined, badgeTone: 'bg-amber-600' },
    agir,
  ] : [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-delacour-primary text-white shadow-sm print:static print:bg-white print:text-slate-900 print:shadow-none">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <a href="index.html" title="Retour à la liste des outils" className="flex shrink-0 items-center gap-1 rounded-md py-1 pr-1.5 text-emerald-100 hover:bg-white/10 hover:text-white print:hidden">
              <ArrowLeft size={15} />
              <span className="flex h-7 w-7 items-center justify-center rounded bg-delacour-gold text-sm font-black text-delacour-dark">D</span>
              <span className="hidden text-[11px] font-semibold sm:inline">Outils</span>
            </a>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold">{state.settings.companyName || 'Mon entreprise'}</div>
              <div className="mt-0.5 inline-flex rounded-md bg-delacour-dark/60 p-0.5 print:hidden" role="group" aria-label="Outil">
                {(Object.keys(TOOLS) as Tool[]).map(t => (
                  <button key={t} type="button" onClick={() => setTool(t)} aria-pressed={tool === t}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${tool === t ? 'bg-white text-delacour-primary' : 'text-emerald-50 hover:bg-white/10'}`}>{TOOLS[t].label}</button>
                ))}
              </div>
              <div className="hidden text-[11px] text-slate-500 print:block">{TOOLS[tool].title}</div>
            </div>
          </div>

          <div className={`ml-auto flex items-center gap-1 print:hidden ${tool !== 'kpi' ? '!hidden' : ''}`}>
            <button type="button" aria-label="Mois précédent" disabled={period <= ps[0]} onClick={() => setPeriod(addMonths(period, -1))}
              className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Mois affiché"
              className="rounded-md border border-white/20 bg-delacour-dark px-2 py-1 text-xs font-semibold text-white">
              {ps.map(p => <option key={p} value={p}>{periodLong(p)}</option>)}
            </select>
            <button type="button" aria-label="Mois suivant" disabled={period >= ps[ps.length - 1]} onClick={() => setPeriod(addMonths(period, 1))}
              className="rounded-md p-1.5 hover:bg-white/10 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>

          <div className={`flex items-center gap-1.5 print:hidden ${tool !== 'kpi' ? 'ml-auto' : ''}`}>
            <button type="button" disabled={forcedTeam} onClick={() => setTeamView(!teamView)} aria-pressed={teamView}
              title={forcedTeam ? "Vous n'avez pas accès au dossier direction" : teamView ? 'Vue équipe : montants confidentiels masqués' : 'Vue direction : tout est visible'}
              className="flex items-center gap-1.5 rounded-md border border-white/20 px-2 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-60">
              {teamView ? <EyeOff size={15} /> : <Eye size={15} />}<span className="hidden md:inline">{teamView ? 'Vue équipe' : 'Vue direction'}</span>
            </button>
            {folder.status !== 'unsupported' && (
              <button type="button" onClick={() => folder.status === 'needs-permission' ? store.reconnectFolder() : setSettings(true)}
                title={folder.status === 'connected' ? `Dossier partagé · ${folder.contributors.join(', ')}` : folder.error || 'Stockage des données'}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold ${folder.status === 'connected' ? 'border-emerald-300/40 text-emerald-100' : folder.status === 'local' ? 'border-white/20 text-white/80' : 'border-amber-300/60 bg-amber-500/20 text-amber-100'} hover:bg-white/10`}>
                <FolderSync size={15} />
                <span className="hidden lg:inline">{{ local: 'Sur ce poste', connected: `Partagé${folder.lastSync ? ' · ' + folder.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`, 'needs-permission': 'Reconnecter le dossier', error: 'Dossier : erreur', unsupported: '' }[folder.status]}</span>
              </button>
            )}
            <button type="button" onClick={() => setSettings(true)} aria-label="Réglages" className="rounded-md border border-white/20 p-1.5 hover:bg-white/10"><SlidersHorizontal size={15} /></button>
          </div>
        </div>

        <nav className={`mx-auto flex max-w-7xl gap-0.5 overflow-x-auto px-3 sm:gap-1 sm:px-6 print:hidden ${TABS.length ? '' : '!hidden'}`} aria-label="Écrans">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setScreen(t.id)} aria-current={screen === t.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg px-2 py-2 text-xs font-semibold transition sm:px-3 ${screen === t.id ? 'bg-slate-100 text-delacour-primary' : 'text-emerald-50 hover:bg-white/10'}`}>
              <t.icon size={15} className="hidden sm:block" />{t.label}
              {t.badge ? <span className={`rounded-full px-1.5 text-[11px] font-bold text-white ${t.badgeTone}`}>{t.badge}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6">
        {teamView && tool !== 'dir' && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 print:hidden">Vue équipe : les montants confidentiels (chiffre d'affaires, marge, trésorerie, coût des arrêts…) sont masqués.</p>}
        {screen === 'piloter' && <Piloter onOpenKpi={setKpiOpen} onNewAction={startAction} onOpenAction={openAction} goSaisir={() => setScreen('saisir')} />}
        {screen === 'saisir' && <Saisir done={() => setScreen('piloter')} />}
        {screen === 'agir' && <Agir onOpenAction={openAction} onNewAction={startAction} />}
        {screen === 'risques' && <Risques onOpenRisk={openRisk} onNewRisk={() => setRisk({ r: newRisk(state.processes[0]?.id || 'P1'), step: 0 })} onOpenDirectory={() => setTool('dir')} />}
        {screen === 'annuaire' && <Annuaire />}
        {screen === 'tests' && <Tests onOpenRisk={openRisk} />}
      </main>

      {kpiOpen && <KpiDetail kpiId={kpiOpen} onClose={() => setKpiOpen(null)} onOpenAction={openAction} onNewAction={startAction} />}
      {action && <ActionSheet key={action.id} initial={action} onClose={() => setAction(null)} />}
      {risk && <RiskSheet key={risk.r.id} initial={risk.r} startStep={risk.step} onClose={() => setRisk(null)} onNewAction={id => startAction('', id)} onOpenAction={openAction} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
