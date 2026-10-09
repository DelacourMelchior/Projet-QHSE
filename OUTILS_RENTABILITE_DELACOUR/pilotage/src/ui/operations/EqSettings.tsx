// Settings of tool 3.3, saved as typed: the day of the weekly routine, the notice before a check falls due, the days between two counts of the cabinet, the lists
// of the company (what an anomaly is about, causes of a breakdown, checks offered at the start) and who holds the key of the cabinet.
// An empty field, or a list back to the neutral one, goes back to the default of the tool. "Autre" always closes a list: the default one is shown without it, and
// the tool ignores a typed "Autre" row when it reads the list (maintCfg), so nothing is filtered while a person types: "Autre chose" is typed through "Autre".
import { Plus, RotateCcw, X } from 'lucide-react';
import type { MaintSettings } from '../../domain/types';
import { DEFAULT_CAUSES, DEFAULT_NATURES } from '../../domain/maintenance';
import { CHECK_KIND, DEFAULT_CATALOGUE, EVERY_UNITS } from '../../domain/maintenanceChecks';
import { norm } from '../../domain/instructions';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, NumInput, ToolSettings } from '../common';
import { useUndo } from './EqBits';

type Row = NonNullable<MaintSettings['catalogue']>[number];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const noOther = <T extends string | { label: string }>(xs: T[]) => xs.filter(x => norm(typeof x === 'string' ? x : x.label) !== 'autre');
const WORDS = { causes: noOther(DEFAULT_CAUSES), natures: noOther(DEFAULT_NATURES) };
const START = noOther(DEFAULT_CATALOGUE);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function EqSettings() {
  const { state, update } = useStore();
  const { bar, offer } = useUndo();
  if (!state) return null;
  const saved = state.params.maint || {};
  // merges into the saved settings; a key set to undefined goes back to the default of the tool
  const setS = (patch: Partial<MaintSettings>) => update(d => { const next = { ...(d.params.maint || {}), ...patch } as Record<string, unknown>; Object.keys(next).forEach(k => { if (next[k] === undefined) delete next[k]; }); d.params.maint = next as MaintSettings; });
  const num = (k: 'soonDays' | 'countDays') => (v: number | null) => setS({ [k]: v && v > 0 ? Math.round(v) : undefined });
  const words = (k: 'causes' | 'natures') => saved[k] ?? WORDS[k];
  const setWords = (k: 'causes' | 'natures', xs: string[]) => setS({ [k]: same(xs, WORDS[k]) ? undefined : xs });
  const cat = saved.catalogue ?? START;
  const setCat = (xs: Row[]) => setS({ catalogue: same(xs, START) ? undefined : xs });
  const patchRow = (i: number, x: Partial<Row>) => setCat(cat.map((r, j) => (j === i ? { ...r, ...x } : r)));
  const drop = <T,>(xs: T[], i: number, back: (xs: T[]) => void) => { back(xs.filter((_, j) => j !== i)); offer('Retiré', () => back(xs)); };
  const LISTS = [
    { k: 'causes', title: "Causes d'une panne", hint: 'La liste proposée quand une panne est close. « Autre, précisez » reste toujours en dernier.', add: 'Ajouter une cause', one: 'Cause' },
    { k: 'natures', title: "Ce qu'est une anomalie", hint: 'La liste proposée au signalement d\'un problème (bruit, fuite, chaleur…). « Autre, précisez » reste toujours en dernier.', add: 'Ajouter une nature', one: 'Nature' },
  ] as const;
  return (
    <div id="reglages-3-3" className="scroll-mt-4">
      <ToolSettings title="Réglages de cet outil : routine, préavis, comptage, listes, clé de l'armoire">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Jour de la routine" hint="Début de la période d'une routine hebdomadaire. Chaque équipement peut choisir le sien dans son onglet Routine.">
              <select className={inputCls} value={saved.routineDay ?? 1} onChange={e => setS({ routineDay: Number(e.target.value) === 1 ? undefined : Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>
            </Field>
            <Field label="Préavis des contrôles (jours)" hint="Un contrôle apparaît « à planifier » ce nombre de jours avant son échéance."><NumInput value={saved.soonDays ?? 30} onChange={num('soonDays')} /></Field>
            <Field label="Jours entre deux comptages de l'armoire" hint="Au-delà, un comptage figure dans la file « À faire »."><NumInput value={saved.countDays ?? 30} onChange={num('countDays')} /></Field>
          </div>
          {LISTS.map(l => (
            <div key={l.k} className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-700">{l.title}</span>
              <p className="text-[11px] text-slate-500">{l.hint}</p>
              {words(l.k).map((w, i) => (
                <div key={i} className="flex max-w-md gap-1.5">
                  <input className={inputCls} value={w} aria-label={l.one} onChange={e => setWords(l.k, words(l.k).map((x, j) => (j === i ? e.target.value : x)))} />
                  <Button kind="ghost" className="!px-2" aria-label={`Retirer ${w || l.one.toLowerCase()}`} onClick={() => drop(words(l.k), i, xs => setWords(l.k, xs))}><X size={14} /></Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button className="!py-1" onClick={() => setWords(l.k, [...words(l.k), ''])}><Plus size={13} />{l.add}</Button>
                {saved[l.k] && <Button kind="ghost" className="!py-1" onClick={() => setS({ [l.k]: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
              </div>
            </div>
          ))}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-700">Contrôles proposés à l'ajout</span>
            <p className="text-[11px] text-slate-500">Libellé, fréquence et case « obligatoire » : ce que l'entreprise choisit, l'outil n'affirme pas la loi. « Autre, précisez » reste toujours en dernier.</p>
            {cat.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 p-1.5">
                <input className={`${inputCls} min-w-[11rem] flex-[2_1_11rem]`} value={r.label} aria-label="Libellé du contrôle" placeholder="Nom du contrôle" onChange={e => patchRow(i, { label: e.target.value })} />
                <NumInput className="!w-[72px]" value={r.every.value} aria-label="Fréquence : nombre" onChange={v => patchRow(i, { every: { ...r.every, value: v && v > 0 ? Math.round(v) : 1 } })} />
                <select className={`${inputCls} !w-[104px]`} value={r.every.unit} aria-label="Fréquence : unité" onChange={e => patchRow(i, { every: { ...r.every, unit: e.target.value as Row['every']['unit'] } })}>{EVERY_UNITS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}</select>
                <select className={`${inputCls} min-w-[10rem] flex-[1_1_10rem]`} value={r.kind ?? ''} aria-label="Nature du contrôle" onChange={e => patchRow(i, { kind: (e.target.value || undefined) as Row['kind'] })}>
                  <option value="">{CHECK_KIND.periodic}</option><option value="instrument">{CHECK_KIND.instrument}</option><option value="preventive">{CHECK_KIND.preventive}</option>
                </select>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-700 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]"><input type="checkbox" checked={!!r.legal} onChange={e => patchRow(i, { legal: e.target.checked || undefined })} />Obligatoire</label>
                <Button kind="ghost" className="ml-auto !px-2" aria-label={`Retirer ${r.label || 'ce contrôle'}`} onClick={() => drop(cat, i, setCat)}><X size={14} /></Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button className="!py-1" onClick={() => setCat([...cat, { label: '', every: { value: 1, unit: 'an' } }])}><Plus size={13} />Ajouter un contrôle</Button>
              {saved.catalogue && <Button kind="ghost" className="!py-1" onClick={() => setS({ catalogue: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-700">Clé de l'armoire de survie</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Porteur de la clé"><input className={inputCls} list="people" value={saved.keyHolder ?? ''} onChange={e => setS({ keyHolder: e.target.value || undefined })} /></Field>
              <Field label="Suppléant"><input className={inputCls} list="people" value={saved.keyDeputy ?? ''} onChange={e => setS({ keyDeputy: e.target.value || undefined })} /></Field>
              <Field label="Emplacement de la clé"><input className={inputCls} value={saved.keyPlace ?? ''} placeholder="Ex. : armoire à clés de l'accueil" onChange={e => setS({ keyPlace: e.target.value || undefined })} /></Field>
            </div>
          </div>
        </div>
      </ToolSettings>
      {bar}
    </div>
  );
}
