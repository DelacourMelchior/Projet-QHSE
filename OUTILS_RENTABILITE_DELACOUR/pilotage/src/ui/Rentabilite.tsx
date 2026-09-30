// Tool 1.4 "Seuil de rentabilité": the 10 figures of the last profit and loss account (direction folder), the revenue needed to pay
// the structure and when it is reached, the margin of safety, price against volume, and the values offered to the other tools
// (never written without a click). Reserved to management: nothing is drawn in team view.
import { useState } from 'react';
import { Lock, Printer, Trash2 } from 'lucide-react';
import type { Accounts } from '../domain/types';
import {
  ACCOUNT_LINES, blankAccounts, breakEven, breakEvenDate, breakEvenInsights, LINE_GROUPS, priceVolume, proposedSettings, type BreakEven,
} from '../domain/breakeven';
import { applyCostExample } from '../domain/costExamples';
import { hourlyCosts } from '../domain/hourly';
import { nextExercise } from '../domain/charter';
import { formatCompact, formatValue } from '../domain/numbers';
import { useStore } from '../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, NumInput, Summary, SubTitle, Tile, ToolHeader } from './common';
import { useWidth } from './KpiChart';
import { Proposals, type Proposal } from './Proposals';
import { useDraft } from './useDraft';

type Which = 'accounts' | 'previous';

export function Rentabilite() {
  const { state, update, teamView } = useStore();
  const [which, setWhich] = useState<Which>('accounts');
  if (!state) return null;
  if (teamView) return <Card className="flex items-center gap-2 p-6 text-xs text-slate-600"><Lock size={16} />Le seuil de rentabilité est réservé à la direction : la vue équipe ne montre aucun chiffre de l'entreprise.</Card>;
  const current = state.settings.accounts, previous = state.settings.previous;
  if (!current) {
    return (
      <Empty title="Seuil de rentabilité : combien faut-il vendre pour couvrir la structure ?" text="10 chiffres à recopier du dernier compte de résultat, en 5 minutes : le chiffre d'affaires en dessous duquel l'entreprise perd de l'argent, le jour où il est atteint, et la marge de sécurité qui reste.">
        <Button kind="primary" onClick={() => update(d => { d.settings.accounts ||= blankAccounts(); })}>Saisir mes chiffres</Button>
        <Button onClick={() => update(d => applyCostExample(d))}>Voir un exemple traité</Button>
      </Empty>
    );
  }
  return (
    <div className="space-y-4">
      <Chips value={which} onChange={setWhich} items={[['accounts', `Exercice ${current.year}`], ['previous', previous ? `Exercice précédent ${previous.year}` : 'Exercice précédent']]} />
      {which === 'accounts' ? <Calculator key={current.year} target="accounts" accounts={current} />
        : previous ? <Calculator key={`previous-${previous.year}`} target="previous" accounts={previous} />
        : (
          <Empty title="Exercice précédent : la croissance a-t-elle payé ?" text="Facultatif. Avec le compte de résultat de l'exercice d'avant, l'outil 1.6 compare le chiffre d'affaires, la marge et le résultat, et dit si l'entreprise vend plus d'heures pour moins de marge par heure. À la prochaine clôture, le bouton « Nouvel exercice » le remplira tout seul.">
            <Button kind="primary" onClick={() => update(d => { d.settings.previous ||= { ...blankAccounts(), year: current.year - 1, soldHours: null }; })}>Saisir l'exercice précédent</Button>
          </Empty>
        )}
    </div>
  );
}

// target: the exercise in progress, or the one before (kept to compare, with its hours sold)
function Calculator({ accounts, target }: { accounts: Accounts; target: Which }) {
  const { state, update } = useStore();
  const [a, setA, commit] = useDraft(accounts, state?.settings[target], d => update(s => { s.settings[target] = d; }));
  if (!state) return null;
  const b = breakEven(a);
  const set = (x: Partial<Accounts>) => setA(y => ({ ...y, ...x }));
  const clear = () => { if (window.confirm(target === 'accounts' ? 'Effacer les chiffres du compte de résultat ?' : "Effacer l'exercice précédent ?")) update(d => { delete d.settings[target]; }); };
  // the closed exercise becomes the previous one; what is typed is saved first
  const newYear = () => {
    if (!window.confirm(`Passer à l'exercice ${a.year + 1} ?\n\nL'exercice ${a.year} devient l'exercice précédent, gardé pour comparer. Les charges fixes restent comme point de départ ; chiffre d'affaires, charges variables, résultat et heures vendues sont à ressaisir.`)) return;
    commit();
    update(d => { d.settings = nextExercise(d.settings); });
  };
  const day = b && b.months !== null ? breakEvenDate(a.year, b.months) : null;
  const missing = !b ? "Chiffre d'affaires à saisir" : !b.complete ? 'Charges fixes à saisir' : b.ratePct <= 0 ? 'Marge sur coûts variables négative' : '';
  const years = [...new Set([a.year, ...Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)])].sort((x, y) => y - x);

  return (
    <div className="space-y-4">
      <Summary title="Combien faut-il vendre pour couvrir la structure ?" insights={breakEvenInsights(a)} tiles={<>
        <Tile title="Seuil de rentabilité" value={b?.threshold != null ? formatValue(b.threshold, '€') : '—'} sub={b?.thresholdPct != null ? `${Math.round(b.thresholdPct)} % du chiffre d'affaires de ${a.year}` : missing} />
        <Tile title="Point mort" value={b?.months != null ? formatValue(b.months, 'mois') : '—'}
          sub={day ? `vers le ${day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}, pour un exercice civil de 12 mois` : b?.months != null ? "après la fin de l'exercice" : ''} />
        <Tile title="Marge de sécurité" value={b?.safety != null ? formatValue(b.safety, '€') : '—'}
          sub={b?.safetyPct == null ? '' : b.safetyPct < 0 ? `${formatValue(-b.safetyPct, '%')} sous le seuil` : `le chiffre d'affaires peut baisser de ${formatValue(b.safetyPct, '%')} avant la perte`}
          tone={b?.safetyPct == null ? undefined : b.safetyPct < 0 ? 'alert' : b.safetyPct < 10 ? 'warn' : 'ok'} />
        <Tile title="Marge sur coûts variables" value={b ? formatValue(b.ratePct, '%') : '—'} sub={b ? `100 € vendus laissent ${Math.round(b.ratePct)} € pour payer la structure` : ''} tone={b && b.ratePct <= 0 ? 'alert' : undefined} />
      </>} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="space-y-4 p-3 sm:p-4">
          <ToolHeader title="Les 10 chiffres du compte de résultat" text="Un exercice de 12 mois, en € HT. Une case vide compte pour zéro.">
            {target === 'accounts' && <Button onClick={newYear}>Nouvel exercice</Button>}
            <Button kind="ghost" onClick={clear}><Trash2 size={14} />Effacer</Button>
            <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
          </ToolHeader>
          <div onBlur={commit} className="space-y-4">
            <Field label="Exercice clos en">
              <select className={`${inputCls} sm:w-32`} value={a.year} onChange={e => set({ year: Number(e.target.value) })}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </Field>
            {(Object.keys(LINE_GROUPS) as (keyof typeof LINE_GROUPS)[]).map(g => (
              <section key={g} className="space-y-2">
                <SubTitle>{LINE_GROUPS[g]}</SubTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ACCOUNT_LINES.filter(l => l.group === g).map(l => (
                    <Field key={l.key} label={l.label} hint={l.hint}><NumInput value={a[l.key]} onChange={v => set({ [l.key]: v })} /></Field>
                  ))}
                </div>
              </section>
            ))}
            {target === 'previous' && (
              <section className="space-y-2">
                <SubTitle>Activité</SubTitle>
                <div className="max-w-xs"><Field label="Heures vendues sur l'exercice (facultatif)" hint="Pour comparer la marge par heure dans l'outil 1.6. Celles de l'exercice en cours sont dans l'outil 1.5."><NumInput value={a.soldHours ?? null} onChange={v => set({ soldHours: v })} /></Field></div>
              </section>
            )}
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="space-y-2 p-3 sm:p-4">
            <h2 className="text-xs font-bold text-slate-900">Où se situe le seuil</h2>
            {b && b.threshold !== null ? <BreakEvenChart b={b} /> : <p className="py-8 text-center text-xs text-slate-500">Saisissez le chiffre d'affaires, les charges variables et les charges fixes pour voir le seuil.</p>}
          </Card>
          {b && b.ratePct > 0 && <PriceVolume ratePct={b.ratePct} />}
        </div>
      </div>

      {target === 'accounts' && <Proposed accounts={a} />}

      <Method rule="Vendre ne suffit pas : il faut vendre assez pour payer la structure avant de gagner un euro. Le seuil de rentabilité dit combien, et à quel moment de l'année."
        steps={[
          ['Recopier 10 lignes', "Les 10 chiffres du dernier compte de résultat, ou des soldes intermédiaires de gestion de l'expert-comptable. Compter 5 minutes."],
          ['Classer : variable ou fixe', 'Variable : disparaît si la commande disparaît (matières, sous-traitance). Fixe : reste payé sans commande (salaires, loyers, amortissements).'],
          ['Agir sur les deux leviers', 'Vendre mieux (prix, choix des commandes) relève la marge sur coûts variables. Alléger la structure baisse les charges fixes. Dans les deux cas le seuil baisse.'],
        ]}
        tips={[
          "Les salaires sont en charges fixes : ils sont payés même quand l'activité baisse. Pour l'intérim et les heures supplémentaires, mettre la part variable en « autres charges variables ».",
          "Un seuil au-dessus de 90 % du chiffre d'affaires laisse peu de marge : une baisse de 10 % des ventes fait passer l'exercice en perte.",
          'Refaire le calcul à chaque clôture. Sur une situation intermédiaire, ramener les charges à 12 mois.',
        ]} />
    </div>
  );
}

// Round axis: about 4 steps of 1, 2 or 5 x 10^n, up to the value
function niceTicks(v: number): number[] {
  const raw = v / 4, p = 10 ** Math.floor(Math.log10(raw)), n = raw / p, step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  return Array.from({ length: Math.ceil(v / step) + 1 }, (_, i) => i * step);
}

// Sales against total costs: below the crossing the company loses money, above it earns
function BreakEvenChart({ b }: { b: BreakEven }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const T = b.threshold!;
  const w = Math.max(280, width), h = width < 480 ? 210 : 250, left = 52, right = 14, top = 36, bottom = 24;
  const cost = (x: number) => b.fixed + x * (1 - b.ratePct / 100);
  const xt = niceTicks(Math.max(b.revenue, T) * 1.1), xmax = xt[xt.length - 1];
  const yt = niceTicks(Math.max(xmax, cost(xmax)) * 1.02), ymax = yt[yt.length - 1];
  const X = (v: number) => left + (w - left - right) * v / xmax;
  const Y = (v: number) => top + (h - top - bottom) * (1 - v / ymax);
  const poly = (...p: [number, number][]) => p.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
  // one label per vertical line, the left one on the first row: they never overlap
  const marks = [{ x: T, text: `Seuil ${formatCompact(T, '€')}`, fill: '#7A5C28' }, { x: b.revenue, text: `Ventes ${formatCompact(b.revenue, '€')}`, fill: '#047857' }].sort((p, q) => p.x - q.x);
  return (
    <div ref={ref}>
      <svg width={w} height={h} role="img" aria-label={`Seuil de rentabilité à ${formatValue(T, '€')} pour un chiffre d'affaires de ${formatValue(b.revenue, '€')}`} className="block">
        {yt.map(t => (
          <g key={t}>
            <line x1={left} x2={w - right} y1={Y(t)} y2={Y(t)} stroke="#E2E8F0" />
            <text x={left - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">{formatCompact(t, '€')}</text>
          </g>
        ))}
        {xt.map((t, i) => <text key={t} x={X(t)} y={h - 6} textAnchor={i === 0 ? 'start' : i === xt.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#64748B">{formatCompact(t, '€')}</text>)}
        <polygon points={poly([0, 0], [T, T], [0, b.fixed])} fill="#FEE2E2" />
        <polygon points={poly([T, T], [xmax, xmax], [xmax, cost(xmax)])} fill="#D1FAE5" />
        <line x1={X(0)} y1={Y(0)} x2={X(xmax)} y2={Y(xmax)} stroke="#1B4D3E" strokeWidth={2} />
        <line x1={X(0)} y1={Y(b.fixed)} x2={X(xmax)} y2={Y(cost(xmax))} stroke="#334155" strokeWidth={2} />
        <line x1={X(T)} x2={X(T)} y1={top - 6} y2={Y(0)} stroke="#C5A065" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={X(b.revenue)} x2={X(b.revenue)} y1={top - 6} y2={Y(0)} stroke="#059669" strokeWidth={1.5} strokeDasharray="4 3" />
        <circle cx={X(T)} cy={Y(T)} r={4} fill="#C5A065" />
        {marks.map((m, i) => { const near = X(m.x) < left + 90; return <text key={m.text} x={X(m.x) + (near ? 4 : -4)} y={12 + i * 13} textAnchor={near ? 'start' : 'end'} fontSize="11" fontWeight={700} fill={m.fill}>{m.text}</text>; })}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-delacour-primary" />Ventes</li>
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-slate-700" />Coûts totaux (charges fixes plus charges variables)</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-red-100" />Perte</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-emerald-100" />Bénéfice</li>
      </ul>
    </div>
  );
}

// What a price change costs or allows in volume, at the margin on variable costs of the accounts
function PriceVolume({ ratePct }: { ratePct: number }) {
  const [pct, setPct] = useState<number | null>(5);
  const d = Math.max(0, Math.min(50, pct ?? 0));
  const pv = priceVolume(ratePct, d);
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-slate-900">Prix contre volume</h2>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600">Variation de prix <NumInput className="!w-16 !py-1 text-right" value={pct} onChange={setPct} aria-label="Variation de prix en pourcentage" />%</label>
      </div>
      {d > 0 ? (
        <ul className="space-y-1 text-[11px] text-slate-700">
          <li>Baisse de <strong>{formatValue(d, '%')}</strong> : {pv.cut === null ? "le prix tombe au niveau des coûts variables, aucun volume ne compense." : <>il faut vendre <strong className="font-mono">{formatValue(pv.cut, '%')}</strong> de volume en plus pour garder le même résultat.</>}</li>
          <li>Hausse de <strong>{formatValue(d, '%')}</strong> : jusqu'à <strong className="font-mono">{formatValue(pv.rise, '%')}</strong> de volume perdu sans perdre de résultat.</li>
        </ul>
      ) : <p className="text-[11px] text-slate-500">Saisissez une variation de prix.</p>}
      <p className="text-[11px] text-slate-500">Sur la base d'une marge sur coûts variables de {Math.round(ratePct)} %, les coûts variables suivant le volume vendu.</p>
    </Card>
  );
}

// The values of the settings this tool can compute: shown next to the current ones, written on click only
function Proposed({ accounts }: { accounts: Accounts }) {
  const { state } = useStore();
  const carried = hourlyCosts(state?.settings.hourly)?.carried ?? 0;   // machines whose depreciation and maintenance the hourly costs of 1.5 carry
  const p = proposedSettings(accounts, carried);
  if (!state || !p) return null;
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : formatValue(v, '%'));
  const rows: Proposal[] = [
    { label: 'Marge sur coûts variables', use: 'CA à refaire pour compenser un défaut, seconde lecture (5.2).', now: pct(state.params.variableMarginPct), next: pct(p.variableMarginPct), same: state.params.variableMarginPct === p.variableMarginPct, save: d => { d.params.variableMarginPct = p.variableMarginPct; } },
    { label: 'Marge nette', use: 'CA à refaire pour compenser un défaut, lecture stricte (5.2).', none: 'Exercice déficitaire : valeur habituelle conservée', now: pct(state.settings.netMarginPct), next: p.netMarginPct === null ? null : pct(p.netMarginPct), same: state.settings.netMarginPct === p.netMarginPct, save: d => { d.settings.netMarginPct = p.netMarginPct!; } },
    {
      label: 'Frais généraux', now: pct(state.params.overheadPct ?? 0), next: p.overheadPct === null ? null : pct(p.overheadPct), same: (state.params.overheadPct ?? 0) === p.overheadPct, save: d => { d.params.overheadPct = p.overheadPct!; },
      use: `Charges fixes hors personnel de production${carried ? ', hors amortissement et maintenance des machines (portés par les coûts horaires de 1.5)' : ''}, en % des coûts directs (matières, sous-traitance, personnel de production${carried ? ', machines' : ''}) : résultat après frais des devis (2.1).`,
    },
    {
      label: 'Marge brute plancher des devis', now: pct(state.params.marginFloorPct), next: p.floorPct === null ? null : pct(p.floorPct), same: p.floorPct !== null && state.params.marginFloorPct >= p.floorPct, save: d => { d.params.marginFloorPct = p.floorPct!; },
      use: "Marge brute à laquelle une affaire ne fait que payer ses frais généraux. Le plancher des devis (2.1) devrait être au moins à ce niveau : en dessous, un devis au plancher perd de l'argent une fois la structure payée.",
    },
  ];
  return <Proposals rows={rows} note="Calculées sur cet exercice. Rien n'est modifié sans votre clic." />;
}
