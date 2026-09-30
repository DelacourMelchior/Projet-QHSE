// Tool 1.6: the price charter (a few decisions taken once) and the light that says when the company works just to work.
// Everything else is derived from 1.4 (accounts), 1.5 (workstations, hours), 2.1 (quotes) and 5.x (non-quality). Pure functions, covered by charter.test.ts.
// A "coefficient" is a price over a direct cost; the direct costs are the materials, the subcontracting, and the hours of the
// workstations with their machines. The hours carry what the two other families do not: the charter is one price policy, not three.
import type { Accounts, IssuedCharter, PricePolicy, Settings, State } from './types';
import { sum } from './base';
import { breakEven, priceVolume } from './breakeven';
import { hourlyCosts, overheadOf, variableRate } from './hourly';
import { quoteHourMargin } from './commercial';
import { cnqMonth } from './quality';
import { formatPct, formatValue } from './numbers';
import { frDate, isoDate } from './periods';

export const blankPolicy = (): PricePolicy => ({
  marginPct: null, coefMaterials: null, coefSubcontracting: null, discountSales: null, discountDirection: null,
  loadCeilingPct: 85, surchargePct: 10, lowLoadPct: 70, billed: {},
});
// Decisions of the demo company: a bit more margin than today, little margin on the purchases, and the hours carry the rest
export const examplePolicy = (): PricePolicy => ({
  ...blankPolicy(), marginPct: 5.5, coefMaterials: 1.3, coefSubcontracting: 1.15, discountSales: 4, discountDirection: 10,
  billed: { ws_demo_1: 60, ws_demo_2: 70, ws_demo_3: 48, ws_demo_4: 50 },
});

export interface RateRow {
  id: string; name: string;
  direct: number;        // €/h, from 1.5
  complete: number;      // direct plus overheads: the hour only pays its share of the structure
  target: number;        // rate of the charter
  salesMin: number;      // target less the discount the sales person may give alone
  directionMin: number;  // target less the discount with the visa of the management
  surcharge: number;     // target with the premium asked over the load ceiling
  billed: number | null; // rate billed today, typed once
}
export interface Model {
  revenue: number; variable: number; fixed: number;
  mat: number; sub: number; labour: number; direct: number;      // direct costs by family
  overheadPct: number; overheadComputed: boolean;
  kReal: number;            // revenue over direct costs: what is really obtained
  kBreak: number;           // 1 plus the overheads: the coefficient at which the job earns nothing
  marginPct: number; marginDerived: boolean;   // margin aimed at, and whether it is the one of the accounts
  actualPct: number;        // result before tax over revenue, as the accounts give it
  kTarget: number;          // (1 + overheads) / (1 - margin)
  kMat: number; kSub: number; kLabour: number | null;   // the hours carry the rest (null: no production staff)
  priceChangePct: number;   // change of the average price the target asks for, against what is really obtained
  volumePct: number | null; // volume that can be lost when the price rises, or must be won when it falls, to keep the result
  discountSales: number; discountDirection: number;    // %
  rates: RateRow[];
  target: number;           // revenue the target would give on the same activity
}

export function chartModel(s: State, policy: PricePolicy = s.settings.policy ?? blankPolicy()): Model | null {
  const a = s.settings.accounts, b = breakEven(a);
  if (!a || !b || !b.complete) return null;
  const c = hourlyCosts(s.settings.hourly);
  const carried = c?.carried ?? 0;
  const ov = overheadOf(a, carried, s.params);
  const mat = sum([a.purchases, a.otherVariable]), sub = a.subcontracting || 0, labour = (a.labourProduction || 0) + carried;
  const direct = mat + sub + labour;
  if (direct <= 0) return null;
  const actualPct = b.result / b.revenue * 100;
  const marginPct = policy.marginPct ?? (actualPct > 0 ? actualPct : s.settings.netMarginPct);
  if (marginPct >= 100) return null;
  const kBreak = 1 + ov.pct / 100, kTarget = kBreak / (1 - marginPct / 100), kReal = b.revenue / direct;
  const kMat = policy.coefMaterials ?? kTarget, kSub = policy.coefSubcontracting ?? kTarget;
  const kLabour = labour > 0 ? (kTarget * direct - kMat * mat - kSub * sub) / labour : null;
  const priceChangePct = (kTarget / kReal - 1) * 100;
  const pv = priceVolume(b.ratePct, Math.abs(priceChangePct));
  const discountSales = policy.discountSales ?? marginPct, discountDirection = policy.discountDirection ?? discountSales;
  const rates: RateRow[] = kLabour === null || !c ? [] : c.stations.map(r => {
    const target = r.direct * kLabour;
    return {
      id: r.id, name: r.name, direct: r.direct, complete: r.direct * kBreak, target, billed: policy.billed[r.id] ?? null,
      salesMin: target * (1 - discountSales / 100), directionMin: target * (1 - discountDirection / 100), surcharge: target * (1 + policy.surchargePct / 100),
    };
  });
  return {
    revenue: b.revenue, variable: b.variable, fixed: b.fixed, mat, sub, labour, direct, overheadPct: ov.pct, overheadComputed: ov.computed,
    kReal, kBreak, marginPct, marginDerived: policy.marginPct === null, actualPct, kTarget, kMat, kSub, kLabour, priceChangePct,
    volumePct: Math.abs(priceChangePct) < 0.05 ? null : priceChangePct > 0 ? pv.rise : pv.cut,
    discountSales, discountDirection, rates, target: kTarget * direct,
  };
}

// What an hour sold must leave (price less materials, subcontracting and other variable costs) to pay the structure, and the load it is sold at
export interface HourValues {
  sold: number;
  breakEven: number;          // €/h at which the hours only pay the structure
  value: number;              // €/h that pay the structure and the margin aimed at: under it, an offer dilutes the result
  atCeiling: number | null;   // the same, if the hours sold went up to the load ceiling
  capacity: number | null; usedPct: number | null; ceilingPct: number;
  freeHours: number | null;   // hours before the ceiling
  room: number | null;        // % the margin per hour may fall before the volume can no longer make it up without passing the ceiling
}
export function hourValues(s: State, m: Model | null, policy: PricePolicy = s.settings.policy ?? blankPolicy()): HourValues | null {
  const sold = s.settings.hourly?.soldHours;
  if (!m || !sold || sold <= 0) return null;
  const c = hourlyCosts(s.settings.hourly), cap = c && c.capacity > 0 ? c.capacity : null;
  const wanted = m.marginPct / 100 * m.target, ceiling = policy.loadCeilingPct, used = cap ? sold / cap * 100 : null;
  return {
    sold, breakEven: m.fixed / sold, value: (m.fixed + wanted) / sold, atCeiling: cap ? (m.fixed + wanted) / (ceiling / 100 * cap) : null,
    capacity: cap, usedPct: used, ceilingPct: ceiling, freeHours: cap ? ceiling / 100 * cap - sold : null,
    room: used === null ? null : Math.max(0, (1 - used / ceiling) * 100),
  };
}
export type HourState = 'loses' | 'dilutes' | 'ok';
export const hourState = (perHour: number, hv: HourValues): HourState => (perHour < hv.breakEven ? 'loses' : perHour < hv.value ? 'dilutes' : 'ok');

// ---- the light: five signals, grey while their data is missing
export interface Signal { key: string; tone: 'ok' | 'warn' | 'alert' | 'pending'; title: string; text: string }
const signed = (v: number) => `${v > 0 ? '+' : ''}${formatValue(v, '€')}`;
export const hrs = (x: number) => `${Math.round(x).toLocaleString('fr-FR')} h`;
export const perH = (x: number) => `${formatValue(x, '€')}/h`;
export const cnqYear = (s: State, year: number) => sum(Array.from({ length: 12 }, (_, i) => cnqMonth(s, `${year}-${String(i + 1).padStart(2, '0')}`).total));

export function signals(s: State, hv: HourValues | null, now = new Date()): Signal[] {
  const a = s.settings.accounts, prev = s.settings.previous, b = breakEven(a), pb = breakEven(prev);
  const out: Signal[] = [];
  const add = (key: string, tone: Signal['tone'], title: string, text: string) => out.push({ key, tone, title, text });

  const t1 = 'La croissance a-t-elle payé ?';
  if (!b || !pb || !b.complete || !pb.complete) add('growth', 'pending', t1, "Exercice précédent à saisir (outil 1.4) pour comparer.");
  else {
    const dR = b.revenue - pb.revenue, dM = b.contribution - pb.contribution, dRes = b.result - pb.result, pct = dR / pb.revenue * 100;
    if (dR <= 0) add('growth', dRes < 0 ? 'warn' : 'ok', t1, `Le chiffre d'affaires ${dR < 0 ? 'baisse' : 'stagne'} (${formatPct(pct)}) : pas de croissance à juger. Résultat avant impôt : ${signed(dRes)}.`);
    else {
      const marginal = dM / dR * 100;
      if (dRes < 0) add('growth', 'alert', t1, `Le chiffre d'affaires a augmenté de ${formatValue(pct, '%')} (+${formatValue(dR, '€')}) et le résultat avant impôt a baissé de ${formatValue(-dRes, '€')} : la croissance a coûté de l'argent.`);
      else if (marginal < pb.ratePct * 0.8) add('growth', 'warn', t1, `Sur 100 € de chiffre d'affaires en plus, ${Math.round(marginal)} € de marge sur coûts variables seulement (${Math.round(pb.ratePct)} € avant) : croissance à faible marge.`);
      else add('growth', 'ok', t1, `La croissance a payé : 100 € de chiffre d'affaires en plus ont apporté ${Math.round(marginal)} € de marge (${Math.round(pb.ratePct)} € avant).`);
    }
  }

  const t2 = "Plus d'heures pour moins de marge par heure ?", h0 = prev?.soldHours, h1 = s.settings.hourly?.soldHours;
  if (!b || !pb || !h0 || !h1) add('hours', 'pending', t2, "Heures vendues des deux exercices à saisir (outil 1.5 pour l'exercice en cours, outil 1.4 pour le précédent).");
  else {
    const m0 = pb.contribution / h0, m1 = b.contribution / h1, dH = (h1 / h0 - 1) * 100, dm = (m1 / m0 - 1) * 100;
    const what = `Heures vendues ${formatPct(dH)} (${hrs(h0)} à ${hrs(h1)}), marge par heure ${formatPct(dm)} (${perH(m0)} à ${perH(m1)})`;
    if (dH > 0 && dm < -3) add('hours', b.result < pb.result ? 'alert' : 'warn', t2, `${what} : plus de travail pour moins de marge par heure.`);
    else add('hours', 'ok', t2, `${what} : le travail en plus n'a pas dilué la marge.`);
  }

  const t3 = 'La charge est-elle saine ?';
  if (!hv || hv.usedPct === null || hv.freeHours === null || hv.room === null) add('load', 'pending', t3, 'Postes et heures vendues à saisir (outil 1.5).');
  else {
    const used = Math.round(hv.usedPct), ceil = hv.ceilingPct;
    if (hv.usedPct > ceil) add('load', 'alert', t3, `${used} % des heures productives sont vendues, au-dessus du plafond de ${ceil} % : ${hrs(-hv.freeHours)} de trop. Risque d'heures supplémentaires, d'intérim, de retards et de défauts.`);
    else if (hv.usedPct >= ceil - 5) add('load', 'warn', t3, `${used} % vendus pour un plafond de ${ceil} % : ${hrs(hv.freeHours)} avant le plafond. Si la marge par heure baisse de plus de ${Math.round(hv.room)} %, le volume ne suffit plus à compenser.`);
    else add('load', 'ok', t3, `${used} % vendus, ${hrs(hv.freeHours)} libres avant le plafond de ${ceil} %. La marge par heure peut baisser de ${Math.round(hv.room)} % avant que le volume ne suffise plus à compenser.`);
  }

  const t4 = 'Les affaires en cours rapportent-elles assez ?';
  if (!hv) add('thin', 'pending', t4, "Heures vendues à saisir pour fixer la valeur de l'heure (outil 1.5).");
  else {
    const since = isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const rows = Object.values(s.quotes).filter(q => q.status === 'draft' || q.status === 'sent' || (q.status === 'won' && q.decidedAt >= since))
      .flatMap(q => { const mh = quoteHourMargin(q, variableRate(s.settings.hourly, q.cost?.rate || '')); return mh === null ? [] : [{ q, mh }]; });
    if (!rows.length) add('thin', 'pending', t4, 'Coûts et heures des devis à saisir (outil 2.1) pour repérer les affaires creuses.');
    else {
      const below = rows.filter(r => r.mh < hv.value).sort((x, y) => x.mh - y.mh), loses = rows.filter(r => r.mh < hv.breakEven).length;
      const share = sum(below.map(r => r.q.amount)) / sum(rows.map(r => r.q.amount)) * 100;
      if (!below.length) add('thin', 'ok', t4, `Aucune des ${rows.length} affaires mesurées ne rapporte moins de ${perH(hv.value)} de marge.`);
      else add('thin', share >= 30 ? 'alert' : share >= 5 ? 'warn' : 'ok', t4,
        `${below.length} affaire${below.length > 1 ? 's' : ''} sur ${rows.length} (${Math.round(share)} % du montant) rapporte${below.length > 1 ? 'nt' : ''} moins de ${perH(hv.value)} de marge : ${below.slice(0, 3).map(r => `${r.q.ref} (${perH(r.mh)})`).join(', ')}${below.length > 3 ? ` et ${below.length - 3} autre(s)` : ''}.${loses ? ` ${loses} sous le point mort de ${perH(hv.breakEven)} : elle${loses > 1 ? 's perdent' : ' perd'} de l'argent.` : ''}`);
    }
  }

  const t5 = 'La qualité suit-elle la charge ?', cap = hv?.capacity;
  const used0 = cap && prev?.soldHours ? prev.soldHours / cap * 100 : null;
  if (!a || !prev || !b || !pb || !hv || hv.usedPct === null || used0 === null) add('quality', 'pending', t5, 'Deux exercices avec leurs heures vendues (outils 1.4 et 1.5) et des défauts chiffrés (outils 5.1 et 5.2).');
  else {
    const c1 = cnqYear(s, a.year), c0 = cnqYear(s, prev.year);
    if (!c1 && !c0) add('quality', 'pending', t5, `Aucun défaut chiffré sur ${prev.year} ni sur ${a.year} (outils 5.1 et 5.2).`);
    else {
      const p1 = c1 / b.revenue * 100, p0 = c0 / pb.revenue * 100;
      const what = `charge de ${Math.round(used0)} à ${Math.round(hv.usedPct)} %, coût de non-qualité de ${formatValue(p0, '%')} à ${formatValue(p1, '%')} du chiffre d'affaires`;
      if (hv.usedPct - used0 >= 3 && p1 > p0 * 1.2) add('quality', p1 >= p0 * 2 ? 'alert' : 'warn', t5, `${what[0].toUpperCase()}${what.slice(1)} : la charge coûte de la qualité.`);
      else add('quality', 'ok', t5, `${what[0].toUpperCase()}${what.slice(1)} : pas de dérive liée à la charge.`);
    }
  }
  return out;
}

// ---- keeping the charter up to date
export function issueCharter(m: Model, today = new Date()): IssuedCharter {
  return { at: isoDate(today), marginPct: m.marginPct, kMaterials: m.kMat, kSubcontracting: m.kSub, kLabour: m.kLabour, rates: m.rates.map(r => ({ name: r.name, target: r.target })) };
}
const one = (x: number) => (Math.round(x * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const coef = (x: number) => x.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// What moved since the charter was validated (beyond 1 %): the rates, the coefficients, the margin
export function charterChanges(issued: IssuedCharter | undefined, m: Model | null): string[] {
  if (!issued || !m) return [];
  const moved = (x: number, y: number) => Math.abs(y - x) > Math.abs(x) * 0.01;
  const out: string[] = [];
  m.rates.forEach(r => {
    const old = issued.rates.find(x => x.name === r.name);
    if (!old) out.push(`${r.name} : nouveau poste, ${one(r.target)} €/h`);
    else if (moved(old.target, r.target)) out.push(`${r.name} : de ${one(old.target)} à ${one(r.target)} €/h`);
  });
  issued.rates.filter(o => !m.rates.some(r => r.name === o.name)).forEach(o => out.push(`${o.name} : poste retiré`));
  if (moved(issued.kMaterials, m.kMat)) out.push(`Coefficient sur la matière : de ×${coef(issued.kMaterials)} à ×${coef(m.kMat)}`);
  if (moved(issued.kSubcontracting, m.kSub)) out.push(`Coefficient sur la sous-traitance : de ×${coef(issued.kSubcontracting)} à ×${coef(m.kSub)}`);
  if (issued.kLabour !== null && m.kLabour !== null && moved(issued.kLabour, m.kLabour)) out.push(`Coefficient de l'heure : de ×${coef(issued.kLabour)} à ×${coef(m.kLabour)}`);
  if (Math.abs(issued.marginPct - m.marginPct) > 0.05) out.push(`Marge visée : de ${one(issued.marginPct)} % à ${one(m.marginPct)} %`);
  return out;
}
export const issuedText = (i: IssuedCharter) => `validée le ${frDate(i.at)}`;

// The accounts are older than the exercise just closed (closed in December, entered by May): time to start a new exercise
export const isStale = (a: Accounts | undefined, now = new Date()) => !!a && (now.getFullYear() - a.year) * 12 + now.getMonth() - 11 > 16;

// New exercise: the closed one becomes the previous one; the fixed costs stay as a starting point, what follows the activity is emptied
export function nextExercise(st: Settings): Settings {
  const a = st.accounts;
  if (!a) return st;
  const fresh: Accounts = {
    year: a.year + 1, revenue: null, purchases: null, subcontracting: null, otherVariable: null, labourProduction: a.labourProduction,
    labourOverhead: a.labourOverhead, otherFixed: a.otherFixed, depreciation: a.depreciation, interest: a.interest, result: null,
  };
  return { ...st, previous: { ...a, soldHours: st.hourly?.soldHours ?? null }, accounts: fresh, hourly: st.hourly ? { ...st.hourly, soldHours: null } : st.hourly };
}
