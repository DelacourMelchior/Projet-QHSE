// Price ladder of a quote (2.1, management only): the price to ask, the prices under which the quote stops paying, where the price typed
// stands, and the largest discount the management lets the sales person give (the only figure seen in team view: it shows no cost).
import type { Params, Quote } from '../../domain/types';
import { maxDiscount, type Ladder } from '../../domain/commercial';
import { hourState, perH, type HourValues } from '../../domain/charter';
import { formatValue } from '../../domain/numbers';
import { Button, Field, NumInput } from '../common';

type Kind = 'target' | 'floor' | 'complete' | 'variable' | 'price';
interface Step { key: Kind; label: string; hint: string; value: number }

// hourMargin: what each hour of this job leaves after its variable costs; hv: the value of an hour of the charter (1.6)
export function PriceLadder({ q, ladder: l, p, targetPct, machines, hourMargin, hv, onPrice, onDiscount }: {
  q: Quote; ladder: Ladder; p: Params; targetPct: number; machines: boolean; hourMargin: number | null; hv: HourValues | null; onPrice(v: number): void; onDiscount(v: number | null): void;
}) {
  const hs = hourMargin !== null && hv ? hourState(hourMargin, hv) : null;
  const price = q.amount && q.amount > 0 ? q.amount : null;
  const overhead = p.overheadPct || 0;
  const levels: Step[] = [
    ...(l.target === null ? [] : [{ key: 'target' as const, label: 'Prix cible', hint: `coût complet plus ${formatValue(targetPct, '%')} de marge visée avant impôt`, value: l.target }]),
    ...(l.floor === null ? [] : [{ key: 'floor' as const, label: 'Plancher de marge brute', hint: `marge brute de ${formatValue(p.marginFloorPct, '%')} : en dessous, dérogation de la direction`, value: l.floor }]),
    { key: 'complete' as const, label: 'Coût complet', hint: `coût direct plus ${Math.round(overhead)} % de frais généraux : en dessous, l'affaire perd de l'argent`, value: l.complete },
    ...(l.variable === null ? [] : [{ key: 'variable' as const, label: 'Coût variable', hint: "matière, sous-traitance, autres frais, machines : en dessous, chaque vente coûte de l'argent", value: l.variable }]),
  ];
  const steps: Step[] = [...levels, ...(price ? [{ key: 'price' as const, label: 'Votre prix', hint: 'prix de vente saisi', value: price }] : [])].sort((a, b) => b.value - a.value);
  const signed = (v: number) => `${v > 0 ? '+' : ''}${formatValue(v, '€')}`;
  const note = (s: Step) => {
    if (price === null) return null;
    if (s.key === 'price') return { text: `après frais généraux : ${signed(price - l.complete)}`, cls: price >= l.complete ? 'text-emerald-800' : 'font-semibold text-red-700' };
    return price >= s.value
      ? { text: `remise possible : ${formatValue((1 - s.value / price) * 100, '%')}`, cls: 'text-slate-500' }
      : { text: `votre prix est ${formatValue(s.value - price, '€')} en dessous`, cls: s.key === 'target' ? 'font-semibold text-amber-800' : 'font-semibold text-red-700' };
  };
  const cover = overhead ? overhead / (100 + overhead) * 100 : 0;    // gross margin at which a job only pays its overheads
  const limit = Math.max(l.floor ?? 0, l.complete);
  const suggested = maxDiscount(price, l);
  const typed = q.maxDiscountPct ?? null;
  const minPrice = price !== null && typed !== null ? price * (1 - typed / 100) : null;
  const target10 = l.target === null ? null : Math.ceil(l.target / 10) * 10;

  return (
    <div className="space-y-2 pt-1">
      <h4 className="text-[11px] font-bold text-slate-900">Échelle de prix</h4>
      <ul className="space-y-1">
        {steps.map(s => {
          const n = note(s);
          return (
            <li key={s.key} className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-lg border px-2.5 py-1.5 text-[11px] ${s.key === 'price' ? 'border-delacour-gold bg-amber-50' : 'border-slate-200'}`}>
              <span className="min-w-0"><strong className="block text-xs text-slate-900">{s.label}</strong><span className="text-slate-500">{s.hint}</span></span>
              <span className="text-right"><strong className="block font-mono text-xs text-slate-900">{formatValue(s.value, '€')}</strong>{n && <span className={n.cls}>{n.text}</span>}</span>
            </li>
          );
        })}
      </ul>
      {hs && hourMargin !== null && hv && (
        <p className={`rounded-lg px-3 py-2 text-[11px] ${hs === 'ok' ? 'bg-emerald-50 text-emerald-900' : hs === 'dilutes' ? 'bg-amber-50 text-amber-950' : 'bg-red-50 text-red-900'}`}>
          Marge par heure de cette affaire : <strong className="font-mono">{perH(hourMargin)}</strong> (valeur de l'heure {perH(hv.value)}, point mort {perH(hv.breakEven)}). {hs === 'ok' ? 'Elle tient la marge visée.'
            : hs === 'dilutes' ? "Sous la valeur de l'heure : elle paie la structure mais dilue le résultat, et occupe des heures qui pourraient rapporter plus."
            : "Sous le point mort : chaque heure de cette affaire perd de l'argent une fois la structure payée. C'est du travail pour travailler."}
        </p>
      )}
      {l.floor !== null && l.floor < l.complete && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          Le plancher de marge brute ({formatValue(p.marginFloorPct, '%')}) est sous le coût complet : un devis au plancher perd {formatValue(l.complete - l.floor, '€')} une fois les frais généraux payés. Marge brute plancher qui les couvre : {formatValue(cover, '%')} (proposée dans l'outil 1.4).
        </p>
      )}
      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
        {!overhead && <li>Frais généraux à 0 % : le coût complet est égal au coût direct. Les calculer dans l'outil 1.4.</li>}
        {l.variable !== null && !machines && <li>Le coût variable ne compte pas la consommation des machines : saisir les postes dans l'outil 1.5.</li>}
        {l.variable === null && <li>Coût variable indisponible : seul un coût total a été saisi (contrôle express).</li>}
        <li>Entre le coût variable et le coût complet, ne vendre que des heures qui seraient restées vides (capacité libre, outil 1.5), sans en faire le prix de référence du client.</li>
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        {target10 !== null && (price === null || Math.abs(price - target10) >= 1) && <Button onClick={() => onPrice(target10)}>Appliquer le prix cible ({formatValue(target10, '€')})</Button>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-72"><Field label="Remise maximale accordée au commercial (%)" hint="Vue équipe : seul ce chiffre est montré, sans coût. Repris tel quel de la proposition, il laisse deviner le plancher."><NumInput value={typed} onChange={onDiscount} /></Field></div>
        {price !== null && <Button onClick={() => onDiscount(suggested)}>Proposer {formatValue(suggested, '%')}</Button>}
      </div>
      {minPrice !== null && minPrice < limit && <p className="text-[11px] font-semibold text-amber-800">Prix minimum de {formatValue(minPrice, '€')} : sous le plancher ou le coût complet ({formatValue(limit, '€')}).</p>}
    </div>
  );
}
