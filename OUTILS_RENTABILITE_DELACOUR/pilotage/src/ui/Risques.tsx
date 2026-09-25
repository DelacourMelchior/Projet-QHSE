// Tool 1.2, screen "Cartographie": are we ready? Summary, messages, criticality matrix with its rules,
// risks to rate, rating session for the whole team, reflex cards in PDF, link to the crisis directory (tool 1.3).
import { useMemo, useState } from 'react';
import { BookUser, CalendarCheck, ChevronRight, FileDown, Plus, Printer, SlidersVertical } from 'lucide-react';
import type { Risk, Scale, State } from '../domain/types';
import {
  gravityScale, lastTest, likelihoodScale, testDueDate, riskInsights, riskState, riskSummary, risksInOrder, STATE_INFO, ZONE_RULES, zoneOf,
} from '../domain/risk';
import { applyPlansBExample, typicalRisks } from '../domain/riskTemplates';
import { PROFILES, type ProfileKey } from '../domain/templates';
import { formatValue } from '../domain/numbers';
import { frDate, isoDate } from '../domain/periods';
import { legacyLocalRisks } from '../store/local';
import { useStore } from '../store/StoreContext';
import { Button, Card, StatusBadge } from './common';
import { ScalePicker, ScoreBadge, ZONE_STYLE } from './RiskSheet';
import { reflexCardsPdf } from '../domain/reflexPdf';
import { downloadFile } from './download';

const TO_TEST = ['failed', 'expired', 'ready'];
const TONE = { good: 'border-emerald-200 bg-emerald-50 text-emerald-900', warn: 'border-amber-200 bg-amber-50 text-amber-950', bad: 'border-red-200 bg-red-50 text-red-900' };

export function Risques({ onOpenRisk, onNewRisk, onOpenDirectory }: { onOpenRisk(id: string, step?: number): void; onNewRisk(): void; onOpenDirectory(): void }) {
  const { state, update, teamView, author } = useStore();
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [rating, setRating] = useState<string[] | null>(null);   // frozen order while rating, so rows do not jump
  const [toTest, setToTest] = useState(false);
  const legacy = useMemo(() => legacyLocalRisks(), []);
  if (!state) return null;
  const risks = risksInOrder(state);
  const addAll = (rs: Risk[]) => update(d => { rs.forEach(r => { d.risks[r.id] = r; }); });
  const profile = (state.settings.profile in PROFILES ? state.settings.profile : 'industrie') as ProfileKey;
  const unrated = risks.filter(r => !r.gravity || !r.likelihood);
  const startRating = () => { setCell(null); setRating(risks.map(r => r.id)); };
  const rate = (id: string, patch: Partial<Pick<Risk, 'gravity' | 'likelihood'>>) =>
    update(d => { Object.assign(d.risks[id], patch, { ratedBy: author, ratedAt: isoDate(new Date()) }); });
  const cardsPdf = () => downloadFile('Fiches-reflexes.pdf', reflexCardsPdf(state, { company: state.settings.companyName, by: author, date: new Date() }), 'application/pdf');

  if (!risks.length) {
    return (
      <Card className="space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-sm font-bold text-delacour-primary">Plans B : de quoi l'entreprise ne peut-elle pas se passer ?</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">Recensez les machines, personnes, fournisseurs, clients et logiciels dont l'arrêt bloque l'activité.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button kind="primary" onClick={() => addAll(typicalRisks(profile))}>Partir des 8 risques fréquents ({PROFILES[profile]})</Button>
          <Button onClick={onNewRisk}><Plus size={14} />Ajouter un risque</Button>
          {legacy.length > 0 && <Button onClick={() => addAll(legacy)}>Reprendre les {legacy.length} risques de l'ancienne version</Button>}
          <Button onClick={() => update(d => applyPlansBExample(d))}>Voir un exemple traité</Button>
        </div>
      </Card>
    );
  }

  const needsTest = (r: Risk) => TO_TEST.includes(riskState(state, r));
  const testCount = risks.filter(needsTest).length;
  const shown = rating ? rating.map(id => state.risks[id]).filter(Boolean)
    : cell ? risks.filter(r => r.gravity === cell[0] && r.likelihood === cell[1])
    : toTest ? risks.filter(needsTest) : risks;
  return (
    <div className="space-y-4">
      <Summary s={state} team={teamView} />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button kind="primary" onClick={onNewRisk}><Plus size={14} />Ajouter un risque</Button>
        {rating ? <Button kind="primary" onClick={() => setRating(null)}>Terminer la cotation</Button>
          : <Button onClick={startRating}><SlidersVertical size={14} />Coter les risques</Button>}
        <span className="mx-1 hidden h-5 w-px bg-slate-300 sm:block" />
        <Button onClick={onOpenDirectory}><BookUser size={14} />Annuaire</Button>
        <Button onClick={cardsPdf}><FileDown size={14} />Fiches réflexes (PDF)</Button>
        <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer vos risques par 9 risques d\'exemple entièrement traités ? Vos indicateurs ne changent pas.')) update(d => applyPlansBExample(d)); }} className="sm:ml-auto">Remplir avec des exemples</Button>
        <Button kind="ghost" onClick={() => window.print()} aria-label="Imprimer la cartographie"><Printer size={14} />Imprimer</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="space-y-3 p-3 sm:p-4 print:break-inside-avoid">
            <h2 className="text-xs font-bold text-slate-900">Matrice de criticité</h2>
            <Matrix risks={risks} cell={cell} setCell={c => { setRating(null); setCell(c); }} />
            {cell && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={() => setCell(null)}>Afficher tous les risques</button>}
            <ZoneRules />
          </Card>
          {unrated.length > 0 && !rating && (
            <Card className="space-y-2 border-dashed border-slate-300 p-3 sm:p-4 print:hidden">
              <h2 className="text-xs font-bold text-slate-900">À coter <span className="font-normal text-slate-500">{unrated.length}</span></h2>
              <ul className="space-y-0.5 text-[11px] text-slate-800">{unrated.slice(0, 5).map(r => <li key={r.id} className="truncate">{r.title || 'Sans titre'}</li>)}</ul>
              {unrated.length > 5 && <p className="text-[11px] text-slate-500">et {unrated.length - 5} autre(s)</p>}
              <Button kind="primary" onClick={startRating}>Coter maintenant</Button>
            </Card>
          )}
        </div>

        <Card className="min-w-0 space-y-2 p-3 sm:p-4">
          {rating ? (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-900">Cotation des risques</h2>
              <ScaleLegend s={state} money={!teamView} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-900">Risques par criticité <span className="font-normal text-slate-500">{shown.length}</span></h2>
              <div className="flex gap-1.5 print:hidden">
                {([[false, 'Tous', risks.length], [true, 'À tester', testCount]] as const).map(([v, l, n]) => (
                  <button key={l} type="button" onClick={() => { setCell(null); setToTest(v); }} aria-pressed={toTest === v && !cell}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toTest === v && !cell ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    {l} <span className="opacity-75">{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{toTest ? 'Aucun Plan B à tester : tout est à jour.' : 'Aucun risque dans cette case.'}</p> : (
            <ul className="divide-y divide-slate-100">
              {shown.map(r => rating
                ? <RateRow key={r.id} s={state} r={r} money={!teamView} rate={p => rate(r.id, p)} />
                : <RiskRow key={r.id} s={state} r={r} open={() => onOpenRisk(r.id)} test={() => onOpenRisk(r.id, 3)} />)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Summary({ s, team }: { s: State; team: boolean }) {
  const [all, setAll] = useState(false);
  const sum = riskSummary(s);
  const list = riskInsights(s);
  const MAX = 4;
  const cov = sum.coveragePct;
  const covTone = cov === null ? undefined : cov >= 70 ? 'border-emerald-200 bg-emerald-50/60' : cov >= 40 ? 'border-amber-300 bg-amber-50/70' : 'border-red-300 bg-red-50/70';
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <h2 className="text-sm font-bold text-delacour-primary">Sommes-nous prêts ?</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile title="Couverture" value={cov === null ? '—' : `${cov} %`} sub="Plans B testés à jour" cls={covTone} />
        <Tile title="Risques recensés" value={String(sum.count)} sub={`dont ${sum.critical} critique(s)${sum.byState.unrated ? `, ${sum.byState.unrated} à coter` : ''}`} />
        <Tile title="Sans Plan B" value={String(sum.byState.uncovered)} sub="risque(s) non couvert(s)" cls={sum.byState.uncovered ? 'border-red-300 bg-red-50/70' : undefined} />
        {team ? <Tile title="Exposition annuelle" value="Masqué" sub="Réservé à la direction" />
          : <Tile title="Exposition annuelle" value={sum.exposure === null ? '—' : formatValue(sum.exposure, '€')}
            sub={sum.exposure === null ? 'Renseignez le coût d\'un arrêt dans les fiches' : `perte moyenne par an, sur ${sum.exposureCount} risque(s) chiffré(s)`} />}
      </div>
      {list.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {(all ? list : list.slice(0, MAX)).map(i => <li key={i.key} className={`rounded-lg border px-3 py-2 text-[11px] ${TONE[i.tone]}`}><strong className="block text-xs">{i.title}</strong>{i.text}</li>)}
        </ul>
      )}
      {list.length > MAX && (
        <button type="button" onClick={() => setAll(!all)} aria-expanded={all} className="text-[11px] font-semibold text-delacour-primary hover:underline print:hidden">
          {all ? 'Afficher moins de messages' : `Voir les ${list.length - MAX} autres messages`}
        </button>
      )}
    </Card>
  );
}

function Tile({ title, value, sub, cls = 'border-slate-200 bg-white' }: { title: string; value: string; sub: string; cls?: string }) {
  return (
    <div className={`rounded-lg border p-2.5 ${cls}`}>
      <div className="text-[11px] font-semibold text-slate-600">{title}</div>
      <div className="font-mono text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-600">{sub}</div>
    </div>
  );
}

// Gravity from 4 (top) to 1, likelihood from 1 (left) to 4; each cell shows the number of risks
function Matrix({ risks, cell, setCell }: { risks: Risk[]; cell: [number, number] | null; setCell(c: [number, number] | null): void }) {
  return (
    <div className="mx-auto flex max-w-[300px] gap-1.5">
      <div className="flex w-3 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold text-slate-500">Gravité</span></div>
      <div className="flex-1 space-y-1">
        {[4, 3, 2, 1].map(g => (
          <div key={g} className="grid grid-cols-[14px_repeat(4,1fr)] gap-1">
            <span className="self-center text-center font-mono text-[11px] text-slate-500">{g}</span>
            {[1, 2, 3, 4].map(l => {
              const n = risks.filter(r => r.gravity === g && r.likelihood === l).length;
              const sel = cell?.[0] === g && cell?.[1] === l;
              return (
                <button key={l} type="button" disabled={!n} onClick={() => setCell(sel ? null : [g, l])} aria-pressed={sel}
                  title={`Gravité ${g} × probabilité ${l} = ${g * l}`} aria-label={`Gravité ${g}, probabilité ${l} : ${n} risque(s)`}
                  className={`flex aspect-square items-center justify-center rounded-md font-mono text-sm font-bold transition ${n ? ZONE_STYLE[zoneOf(g * l)] : `${ZONE_STYLE[zoneOf(g * l)]} opacity-20`} ${sel ? 'ring-2 ring-slate-900 ring-offset-1' : ''} ${n ? 'hover:opacity-90' : ''}`}>
                  {n || ''}
                </button>
              );
            })}
          </div>
        ))}
        <div className="grid grid-cols-[14px_repeat(4,1fr)] gap-1 text-center font-mono text-[11px] text-slate-500"><span />{[1, 2, 3, 4].map(l => <span key={l}>{l}</span>)}</div>
        <div className="text-center text-[11px] font-semibold text-slate-500">Probabilité</div>
      </div>
    </div>
  );
}

// The one place that explains the matrix: the score and what each zone requires
function ZoneRules() {
  return (
    <div className="space-y-1 border-t border-slate-100 pt-2">
      <p className="text-[11px] text-slate-600">Criticité = gravité × probabilité</p>
      <ul className="space-y-1">
        {ZONE_RULES.map(z => (
          <li key={z.zone} className="flex items-start gap-2 text-[11px] text-slate-700">
            <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm ${ZONE_STYLE[z.zone].split(' ')[0]}`} />
            <span><strong>{z.range}</strong> : {z.rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Definitions of the 4 levels of each scale, shown only while rating
function ScaleLegend({ s, money }: { s: State; money: boolean }) {
  const col = (title: string, items: ReturnType<typeof gravityScale>) => (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-slate-800">{title}</div>
      <ul className="space-y-0.5">
        {items.map(x => <li key={x.level} className="text-[11px] text-slate-600"><strong className="text-slate-800">{x.level} · {x.label}</strong> : {[x.money, x.text].filter(Boolean).join(' · ')}</li>)}
      </ul>
    </div>
  );
  return (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-2">
      {col('Gravité (G) : si le risque survient', gravityScale(s, money))}
      {col('Probabilité (P) : à quelle fréquence', likelihoodScale(s))}
    </div>
  );
}

// Next test of a Plan B, in words ('' when no test is required)
function testLine(s: State, r: Risk): { text: string; late: boolean } {
  const state = riskState(s, r);
  const t = lastTest(r);
  if (state === 'failed') return { text: `Test raté le ${frDate(t!.date)}`, late: true };
  if (state === 'expired') return { text: `Test en retard (dû le ${frDate(testDueDate(r))})`, late: true };
  if (state === 'tested') return { text: `Prochain test avant le ${frDate(testDueDate(r))}`, late: false };
  if (state === 'ready' || state === 'preparing') return { text: 'Jamais testé', late: state === 'ready' };
  return { text: '', late: false };
}

function RiskRow({ s, r, open, test }: { s: State; r: Risk; open(): void; test(): void }) {
  const state = riskState(s, r);
  const st = STATE_INFO[state];
  const tl = testLine(s, r);
  const proc = s.processes.find(p => p.id === r.processId);
  return (
    <li className="flex items-center gap-1">
      <button type="button" onClick={open} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2.5 text-left hover:bg-slate-50">
        <ScoreBadge r={r} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-xs font-semibold text-slate-900 sm:truncate">{r.title || 'Sans titre'}</span>
          <span className="block truncate text-[11px] text-slate-500">{[proc?.name.split(' · ')[0] || r.processId, r.planB ? `Plan B : ${r.planB}` : r.resource].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="hidden shrink-0 text-right text-[11px] text-slate-600 sm:block">
          <span className="block font-semibold text-slate-800">{r.owner || <span className="text-red-700">À désigner</span>}</span>
          <span className={tl.late ? 'font-semibold text-red-700' : ''}>{tl.text}</span>
        </span>
        <span className="shrink-0"><StatusBadge level={st.tone} text={st.label} /></span>
        <ChevronRight size={16} className="shrink-0 text-slate-400 print:hidden" />
      </button>
      {tl.text && <Button kind="ghost" onClick={test} title="Enregistrer le résultat d'un test du Plan B" className="shrink-0 !px-2 print:hidden"><CalendarCheck size={14} /><span className="hidden lg:inline">Test</span></Button>}
    </li>
  );
}

// One line of the rating session: G and P in 1 click each
function RateRow({ s, r, money, rate }: { s: State; r: Risk; money: boolean; rate(p: Partial<Pick<Risk, 'gravity' | 'likelihood'>>): void }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <ScoreBadge r={r} />
      <div className="min-w-0 flex-1 basis-40">
        <div className="line-clamp-2 text-xs font-semibold text-slate-900">{r.title || 'Sans titre'}</div>
        <div className="truncate text-[11px] text-slate-500">{r.ratedAt ? `Coté${r.ratedBy ? ` par ${r.ratedBy}` : ''} le ${frDate(r.ratedAt)}` : r.resource || 'Pas encore coté'}</div>
      </div>
      <div className="w-36"><ScalePicker compact title="G" value={r.gravity} items={gravityScale(s, money)} onChange={(g: Scale) => rate({ gravity: g })} /></div>
      <div className="w-36"><ScalePicker compact title="P" value={r.likelihood} items={likelihoodScale(s)} onChange={(l: Scale) => rate({ likelihood: l })} /></div>
    </li>
  );
}
