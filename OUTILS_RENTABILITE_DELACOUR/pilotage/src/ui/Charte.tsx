// Tool 1.6 "Charte de prix": four decisions taken once (margin aimed at, where to put it, how far to go down, which load is healthy),
// each shown with its consequences, and the light that tells when the company works just to work. Nothing is typed twice: the figures
// come from 1.4, 1.5, 2.1 and 5.x. Reserved to management: nothing is drawn in team view.
import { Lock, Printer } from 'lucide-react';
import type { PricePolicy } from '../domain/types';
import { blankPolicy, charterChanges, chartModel, coef, hourState, hourValues, hrs, isStale, issueCharter, issuedText, perH, signals, type Signal } from '../domain/charter';
import { applyCostExample } from '../domain/costExamples';
import { formatValue } from '../domain/numbers';
import { useStore } from '../store/StoreContext';
import { Button, Card, Empty, Field, Method, NumInput, StatusBadge, SubTitle, Tile, ToolHeader } from './common';
import { useDraft } from './useDraft';
import type { ScreenProps } from './screens';
import type { Nav } from './tools';

const pct = (x: number) => formatValue(x, '%');
const decisions = (p: PricePolicy) => ({
  marginPct: p.marginPct, coefMaterials: p.coefMaterials, coefSubcontracting: p.coefSubcontracting, discountSales: p.discountSales,
  discountDirection: p.discountDirection, loadCeilingPct: p.loadCeilingPct, surchargePct: p.surchargePct, lowLoadPct: p.lowLoadPct, billed: p.billed,
});
type Decisions = ReturnType<typeof decisions>;
const LABEL: Record<Signal['tone'], string> = { ok: 'Correct', warn: 'À surveiller', alert: 'Alerte', pending: 'Donnée manquante' };
const CARD: Record<Signal['tone'], string> = { ok: 'border-emerald-200 bg-emerald-50/60', warn: 'border-amber-200 bg-amber-50/70', alert: 'border-red-200 bg-red-50/70', pending: 'border-slate-200 bg-slate-50' };

export function Charte({ nav }: ScreenProps) {
  const { state, update, teamView } = useStore();
  if (!state) return null;
  if (teamView) return <Card className="flex items-center gap-2 p-6 text-xs text-slate-600"><Lock size={16} />La charte de prix est réservée à la direction : la vue équipe ne montre aucun chiffre de l'entreprise.</Card>;
  if (!state.settings.accounts) {
    return (
      <Empty title="Charte de prix : décider une fois, voir quand on travaille pour travailler" text="La charte part du compte de résultat (1.4) et des postes (1.5) : quelle marge viser, où la mettre, jusqu'où descendre, quelle charge est saine. Un voyant dit ensuite quand la croissance ne paie pas : plus d'heures pour moins de marge, charge au-dessus du plafond, affaires creuses.">
        <Button kind="primary" onClick={() => nav.tool('1.4')}>Saisir le compte de résultat (1.4)</Button>
        <Button onClick={() => update(d => applyCostExample(d))}>Voir un exemple traité</Button>
      </Empty>
    );
  }
  return <Board nav={nav} />;
}

function Board({ nav }: { nav: Nav }) {
  const { state, update } = useStore();
  const saved = state?.settings.policy ?? blankPolicy();
  const [d, setD, commit] = useDraft<Decisions>(decisions(saved), decisions(saved), x => update(st => { st.settings.policy = { ...(st.settings.policy ?? blankPolicy()), ...x }; }));
  if (!state) return null;
  const policy: PricePolicy = { ...saved, ...d };      // what is typed counts at once
  const m = chartModel(state, policy), hv = hourValues(state, m, policy), sg = signals(state, hv);
  const set = (x: Partial<Decisions>) => setD(y => ({ ...y, ...x }));
  const load = sg.find(x => x.key === 'load');
  const issued = state.settings.policy?.issued;
  const changes = charterChanges(issued, m);
  if (!m) {
    return (
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-bold text-delacour-primary">Compte de résultat à compléter</h2>
        <p className="text-xs text-slate-600">La charte part du chiffre d'affaires, des charges variables et des charges fixes de l'exercice (outil 1.4).</p>
        <div><Button kind="primary" onClick={() => nav.tool('1.4')}>Ouvrir l'outil 1.4</Button></div>
      </Card>
    );
  }
  const validate = () => update(st => { st.settings.policy = { ...(st.settings.policy ?? blankPolicy()), ...d, issued: issueCharter(m) }; });
  const discountLine = (label: string, dPct: number) => {
    if (!hv) return null;
    const mh = (m.target * (1 - dPct / 100) - m.variable) / hv.sold, st = hourState(mh, hv);
    return (
      <li key={label}>{label} : à −{pct(dPct)}, la marge par heure tombe à <strong className="font-mono">{perH(mh)}</strong> (valeur de l'heure {perH(hv.value)}, point mort {perH(hv.breakEven)}) : {st === 'ok' ? 'la marge visée est tenue' : st === 'dilutes' ? 'la structure est payée, la marge visée est entamée' : "l'affaire perd de l'argent une fois la structure payée"}.</li>
    );
  };
  const priceLine = Math.abs(m.priceChangePct) < 0.05 ? "Le prix moyen ne change pas : c'est la marge d'aujourd'hui."
    : m.priceChangePct > 0 ? `Le prix moyen doit monter de ${pct(m.priceChangePct)}. Vous pouvez perdre jusqu'à ${m.volumePct === null ? '—' : pct(m.volumePct)} de volume sans perdre de résultat.`
    : `Le prix moyen baisse de ${pct(-m.priceChangePct)} : ${m.volumePct === null ? 'aucun volume ne compense' : `il faut ${pct(m.volumePct)} de volume en plus pour garder le résultat`}.`;
  const tip = 'text-[11px] italic text-slate-500';
  const list = 'list-disc space-y-0.5 pl-4 text-[11px] text-slate-700';

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <h2 className="text-sm font-bold text-delacour-primary">L'entreprise travaille-t-elle pour travailler ?</h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Tile title="Valeur de l'heure" value={hv ? perH(hv.value) : '—'} sub={hv ? `marge minimale par heure vendue ; point mort ${perH(hv.breakEven)}` : 'Heures vendues à saisir (1.5)'} />
          <Tile title="Marge de manœuvre" value={hv?.room != null ? `${Math.round(hv.room)} %` : '—'}
            sub={hv?.room != null ? `dont la marge par heure peut baisser avant de dépasser le plafond de ${hv.ceilingPct} %` : 'Postes et heures vendues à saisir (1.5)'}
            tone={hv?.room == null ? undefined : hv.room <= 0 ? 'alert' : hv.room < 5 ? 'warn' : 'ok'} />
          <Tile title="Charge" value={hv?.usedPct != null ? `${Math.round(hv.usedPct)} %` : '—'}
            sub={hv?.usedPct != null && hv.freeHours !== null ? `des heures productives ; plafond ${hv.ceilingPct} %, ${hrs(Math.max(0, hv.freeHours))} libres` : 'Postes à saisir (1.5)'}
            tone={load && load.tone !== 'pending' ? load.tone : undefined} />
          <Tile title="Coefficient de vente" value={`×${coef(m.kReal)}`} sub={`réel ; au seuil ×${coef(m.kBreak)} ; visé ×${coef(m.kTarget)}`} />
        </div>
      </Card>
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Le voyant" text="Cinq questions posées aux chiffres déjà saisis. Grisé : il manque une donnée, indiquée dans le texte." />
        <ul className="grid gap-2 md:grid-cols-2">
          {sg.map(x => (
            <li key={x.key} className={`rounded-lg border px-3 py-2 text-[11px] text-slate-800 ${CARD[x.tone]}`}>
              <span className="mb-1 flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-900">{x.title}</strong><StatusBadge level={x.tone} text={LABEL[x.tone]} /></span>
              {x.text}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-5 p-3 sm:p-4">
        <ToolHeader title="Les 4 décisions" text="Décidées une fois, avec leurs conséquences chiffrées. Une case vide prend la valeur déduite des chiffres de l'entreprise.">
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <div onBlur={commit} className="space-y-5">
          <section className="space-y-2">
            <SubTitle>1. Quelle marge viser ?</SubTitle>
            <p className={tip}>À se demander : quelle part du prix l'entreprise doit-elle garder, tous frais payés, pour investir et résister à une mauvaise année ?</p>
            <div className="max-w-xs"><Field label="Marge visée avant impôt (%)" hint={`Vide : la marge actuelle, ${pct(m.actualPct)}.`}><NumInput value={d.marginPct} onChange={v => set({ marginPct: v })} /></Field></div>
            <ul className={list}>
              <li>Coefficient de vente moyen : <strong className="font-mono">×{coef(m.kTarget)}</strong> (réel aujourd'hui ×{coef(m.kReal)}, au seuil ×{coef(m.kBreak)}).</li>
              <li>{priceLine}</li>
              <li>Une remise de plus de {pct(m.marginPct)} fait perdre de l'argent sur l'affaire, à mix constant.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <SubTitle>2. Où mettre la marge ?</SubTitle>
            <p className={tip}>À se demander : vos clients peuvent-ils comparer ces prix ailleurs ? Ce que la matière et la sous-traitance ne portent pas, l'heure doit le porter.</p>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <Field label="Coefficient sur la matière (×)" hint={`Vide : le coefficient visé, ×${coef(m.kTarget)}.`}><NumInput value={d.coefMaterials} onChange={v => set({ coefMaterials: v })} /></Field>
              <Field label="Coefficient sur la sous-traitance (×)" hint={`Vide : le coefficient visé, ×${coef(m.kTarget)}.`}><NumInput value={d.coefSubcontracting} onChange={v => set({ coefSubcontracting: v })} /></Field>
            </div>
            {m.kLabour === null ? <p className="text-[11px] text-slate-600">Pas de personnel de production dans le compte de résultat : l'heure ne porte rien.</p>
              : <p className={`rounded-lg px-3 py-2 text-[11px] ${m.kLabour < 1 ? 'bg-red-50 text-red-900' : 'bg-slate-50 text-slate-700'}`}>L'heure porte le solde : <strong className="font-mono">×{coef(m.kLabour)}</strong> son coût direct.{m.kLabour < 1 ? " Elle serait vendue sous son coût direct : la matière et la sous-traitance couvrent déjà tout." : ''}</p>}
            {m.rates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-xs">
                  <thead><tr className="text-[11px] text-slate-500">{['Poste', 'Coût direct', 'Coût complet', 'Taux visé', 'Minimum commercial', 'Minimum direction', "Facturé aujourd'hui", 'Écart'].map((t, i) => <th key={t} className={`border-b border-slate-200 px-2 py-2 font-semibold ${i ? 'text-right' : ''}`}>{t}</th>)}</tr></thead>
                  <tbody>
                    {m.rates.map(r => {
                      const gap = r.billed ? (r.target / r.billed - 1) * 100 : null;
                      return (
                        <tr key={r.id}>
                          <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-900">{r.name}</td>
                          <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-600">{perH(r.direct)}</td>
                          <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-600">{perH(r.complete)}</td>
                          <td className="border-b border-slate-100 px-2 py-2 text-right font-mono font-semibold text-slate-900">{perH(r.target)}</td>
                          <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{perH(r.salesMin)}</td>
                          <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{perH(r.directionMin)}</td>
                          <td className="border-b border-slate-100 px-2 py-1.5 text-right"><NumInput className="!w-20 !py-1 text-right" value={d.billed[r.id] ?? null} aria-label={`Taux facturé aujourd'hui, ${r.name}`} onChange={v => set({ billed: { ...d.billed, [r.id]: v } })} /></td>
                          <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono ${gap !== null && gap > 0.5 ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>{gap === null ? '—' : `${gap > 0 ? '+' : ''}${Math.round(gap)} %`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : m.kLabour !== null && <p className="text-[11px] text-slate-600">Saisir les postes (outil 1.5) pour voir le taux de vente de chaque poste. <Button className="ml-1 !px-2 !py-1" onClick={() => nav.tool('1.5')}>Ouvrir 1.5</Button></p>}
            {m.rates.length > 0 && <p className="text-[11px] text-slate-500">Écart : de combien relever le taux facturé pour atteindre le taux visé. À comparer à ce que le marché paie.</p>}
          </section>

          <section className="space-y-2">
            <SubTitle>3. Jusqu'où descendre ?</SubTitle>
            <p className={tip}>À se demander : qui peut accorder quoi, et à partir de quand une remise fait-elle travailler pour rien ?</p>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <Field label="Remise maximale du commercial (%)" hint={`Vide : la marge visée, ${pct(m.marginPct)}.`}><NumInput value={d.discountSales} onChange={v => set({ discountSales: v })} /></Field>
              <Field label="Remise maximale avec visa de la direction (%)" hint="Vide : la même. À réserver aux périodes de charge faible."><NumInput value={d.discountDirection} onChange={v => set({ discountDirection: v })} /></Field>
            </div>
            {hv ? <ul className={list}>{discountLine('Commercial', m.discountSales)}{m.discountDirection !== m.discountSales && discountLine('Direction', m.discountDirection)}</ul>
              : <p className="text-[11px] text-slate-600">Heures vendues à saisir (outil 1.5) pour voir ce que chaque remise fait à la marge par heure.</p>}
          </section>

          <section className="space-y-2">
            <SubTitle>4. Quelle charge est saine ?</SubTitle>
            <p className={tip}>À se demander : à partir de quelle charge les retards, les heures supplémentaires et les défauts apparaissent-ils chez nous ?</p>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              <Field label="Plafond de charge (%)" hint="Part des heures productives vendues. Proposé : 85 %."><NumInput value={d.loadCeilingPct} onChange={v => set({ loadCeilingPct: Math.max(1, Math.min(100, v ?? 85)) })} /></Field>
              <Field label="Prime au-delà du plafond (%)" hint="Majoration des commandes qui le dépassent."><NumInput value={d.surchargePct} onChange={v => set({ surchargePct: Math.max(0, v ?? 0) })} /></Field>
              <Field label="Seuil de charge faible (%)" hint="En dessous, la direction peut appliquer sa remise maximale."><NumInput value={d.lowLoadPct} onChange={v => set({ lowLoadPct: Math.max(0, Math.min(100, v ?? 0)) })} /></Field>
            </div>
            <ul className={list}>
              {hv && hv.usedPct !== null && hv.freeHours !== null && <li>Charge actuelle {Math.round(hv.usedPct)} % : {hrs(Math.max(0, hv.freeHours))} avant le plafond{hv.atCeiling !== null ? `. À ce plafond, l'heure peut rapporter ${perH(hv.atCeiling)} au lieu de ${perH(hv.value)}` : ''}.</li>}
              {m.rates.length > 0 && <li>Au-delà du plafond, les taux montent de {pct(policy.surchargePct)} : {m.rates.slice(0, 2).map(r => `${r.name} ${perH(r.surcharge)}`).join(', ')}{m.rates.length > 2 ? '…' : ''}.</li>}
              <li>Sous {Math.round(policy.lowLoadPct)} % de charge, la direction peut descendre à −{pct(m.discountDirection)}.</li>
            </ul>
          </section>
        </div>
      </Card>

      <Card className="space-y-2 p-3 sm:p-4 print:hidden">
        <h2 className="text-xs font-bold text-slate-900">Charte {issued ? issuedText(issued) : 'à valider'}</h2>
        {changes.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950"><strong className="block text-xs">À rééditer : les coûts ont changé depuis la validation</strong><ul className="list-disc pl-4">{changes.map(c => <li key={c}>{c}</li>)}</ul></div>}
        {isStale(state.settings.accounts) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">Les chiffres sont ceux de {state.settings.accounts?.year} : au prochain exercice clos, ouvrir l'outil 1.4 et cliquer « Nouvel exercice ».</p>}
        <p className="text-[11px] text-slate-600">Mise à jour, une fois par an : après la clôture, « Nouvel exercice » dans 1.4 (les charges fixes restent, le reste se ressaisit), les heures vendues dans 1.5, puis relire le voyant et rééditer la charte ici.</p>
        <div className="flex flex-wrap gap-2">
          {(!issued || changes.length > 0) && <Button kind="primary" onClick={validate}>{issued ? 'Rééditer la charte' : 'Valider la charte'}</Button>}
          <Button onClick={() => nav.tool('1.4')}>Ouvrir 1.4</Button>
          <Button onClick={() => nav.tool('1.5')}>Ouvrir 1.5</Button>
        </div>
      </Card>

      <Method rule="Une heure vendue doit rapporter plus qu'elle ne coûte, et la charge a un plafond : sous la valeur de l'heure ou au-dessus du plafond, on travaille pour travailler."
        steps={[
          ['Décider la marge et où la mettre', "La marge visée, puis les coefficients sur la matière et la sous-traitance : l'heure porte le solde."],
          ['Fixer les limites', 'La remise maximale du commercial et de la direction, le plafond de charge, le seuil de charge faible.'],
          ['Laisser le voyant surveiller', 'À chaque clôture, « Nouvel exercice » met le voyant à jour ; la charte se recalcule et se réédite.'],
        ]}
        tips={[
          "Une remise plus grande que la marge visée fait perdre de l'argent sur l'affaire, à mix constant.",
          "Un chiffre d'affaires qui monte avec une marge par heure qui baisse, c'est du travail pour rien : plus de charge, plus de risques, moins de résultat.",
          'Au-dessus du plafond de charge, une commande de plus doit payer les heures supplémentaires, les retards et les défauts qu\'elle provoque.',
        ]} />
    </div>
  );
}
