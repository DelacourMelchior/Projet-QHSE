// Small pieces of tool 1.4: list of lines, pilot select, issue list, completeness bar.
import { Plus, Trash2 } from 'lucide-react';
import { Fold } from './FlowBits';
import type { ReactNode } from 'react';
import type { Process, State } from '../../domain/types';
import { completeness, processIssues, reqGaps } from '../../domain/cartography';
import { supportGaps } from '../../domain/mapSupport';
import { plural } from '../../domain/receptions';
import { processCover } from '../../domain/mapCover';
import { activePeople } from '../../domain/team';
import { Button, inputCls } from '../common';

// A list of short texts (software, documents): one line each, a button to add one
export function StrList({ value, onChange, label, add, placeholder, list, disabled }: { value: string[]; onChange(v: string[]): void; label: string; add: string; placeholder?: string; list?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      {value.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <input className={inputCls} disabled={disabled} aria-label={`${label} ${i + 1}`} value={v} placeholder={placeholder} list={list} onChange={e => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button kind="ghost" disabled={disabled} aria-label={`Retirer : ${v || label}`} title={`Retirer cette ligne (${label.toLowerCase()})`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
        </div>
      ))}
      <Button disabled={disabled} onClick={() => onChange([...value, ''])}><Plus size={13} />{add}</Button>
    </div>
  );
}

export function PersonSelect({ s, value, onChange, label, none = 'Personne', exclude, disabled }: { disabled?: boolean; s: State; value?: string; onChange(v: string): void; label: string; none?: string; exclude?: string }) {
  const people = activePeople(s).filter(p => p.id !== exclude), known = value ? s.people[value] : undefined;
  return (
    <>
      <select className={inputCls} disabled={disabled} aria-label={label} value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">{none}</option>
        {value && !people.some(p => p.id === value) && <option value={value}>{known ? `${known.name} (n'est plus dans l'entreprise)` : 'Personne introuvable dans la liste du personnel'}</option>}
        {people.map(p => <option key={p.id} value={p.id}>{p.name}{p.role ? ` · ${p.role}` : ''}</option>)}
      </select>
      {!activePeople(s).length && <span className="mt-1 block text-xs text-amber-900">Aucune personne dans la liste du personnel : en ajouter dans l'annuaire (outil 1.3).</span>}
    </>
  );
}

// Colour of a process badge (white text): the colour of the process, darkened until the white text reads at 4,5:1
const lin = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
export function badgeBg(color: string): string {
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!h) return '#334155';
  let rgb = (h.length === 3 ? [...h].map(c => c + c) : h.match(/../g)!).map(x => parseInt(x, 16));
  for (let k = 0; k < 30 && 1.05 / (lum(rgb) + 0.05) < 4.5; k++) rgb = rgb.map(v => Math.round(v * 0.92));
  return `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
export const CodeBadge = ({ p }: { p: Pick<Process, 'id' | 'color'> }) => <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-white" style={{ background: badgeBg(p.color) }}>{p.id}</span>;

// The cells of the matrix and the requirements without a step are part of what is left to fill, as the nine checks are
const holesOf = (s: State, p: Process) => supportGaps(s, p.id) + reqGaps(s, p.id);

// Share of the checks of a sheet that are met, drawn and written (the number is never the only sign). Full only while the matrix and the requirements have no hole.
export function Completeness({ s, p, now }: { s: State; p: Process; now: Date }) {
  const pct = completeness(s, p, now), holes = pct >= 80 && holesOf(s, p) > 0;
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600" title={holes ? 'Les 9 points de la fiche sont en règle, mais la matrice ou les exigences ont des cases vides' : 'Part des 9 points de la fiche qui sont en règle (le détail est dans « points à compléter »)'}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200" aria-hidden><span className={`block h-full ${pct >= 80 && !holes ? 'bg-emerald-600' : pct >= 50 || holes ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${pct}%` }} /></span>
      {holes ? `Points de base à ${pct} %` : `Fiche complète à ${pct} %`}
    </span>
  );
}

const TAB_OF: Record<string, TodoTab> = { name: 'identity', pilot: 'identity', deputy: 'identity', purpose: 'identity', trigger: 'identity', io: 'io', flow: 'flows', flowissues: 'flows', kpi: 'indicators', target: 'indicators', review: 'review' };
const TAB_NAME: Record<TodoTab, string> = { identity: 'Identité', io: 'Entrées et sorties', resources: 'Ressources et remplaçants', flows: 'Logigrammes', matrix: 'Matrice : ce qu\'il faut pour chaque étape', indicators: 'Indicateurs et risques', review: 'Revue' };
export type TodoTab = 'identity' | 'io' | 'resources' | 'flows' | 'matrix' | 'indicators' | 'review';

// One folded block for everything left to fill in a sheet; each line leads to the tab where it is done
export function Todo({ s, p, now, go }: { s: State; p: Process; now: Date; go(tab: TodoTab): void }) {
  const gaps = supportGaps(s, p.id), rg = reqGaps(s, p.id), cover = processCover(s, p.id, now);
  const rows: { key: string; text: string; bad: boolean; tab: TodoTab }[] = [
    ...processIssues(s, p, now).map(i => ({ key: i.key, text: i.text, bad: i.tone === 'bad', tab: TAB_OF[i.key] ?? 'identity' })),
    ...(cover.keyPerson ? [{ key: 'key', text: `${plural(cover.keyPerson, 'homme-clé', 'hommes-clés')} (compétence tenue par une seule personne)`, bad: false, tab: 'resources' as TodoTab }] : []),
    ...(cover.uncovered ? [{ key: 'unc', text: `${plural(cover.uncovered, 'compétence', 'compétences')} sans personne autonome`, bad: false, tab: 'resources' as TodoTab }] : []),
    ...(cover.powerGaps ? [{ key: 'pw', text: `${plural(cover.powerGaps, 'fonction clé', 'fonctions clés')} sans suppléant prêt`, bad: false, tab: 'resources' as TodoTab }] : []),
    ...(gaps ? [{ key: 'matrix', text: `${plural(gaps, 'case vide', 'cases vides')} dans la matrice`, bad: false, tab: 'matrix' as TodoTab }] : []),
    ...(rg ? [{ key: 'reqs', text: `${plural(rg, 'exigence')} sans étape`, bad: false, tab: 'flows' as TodoTab }] : []),
  ];
  if (!rows.length) return <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">Rien à signaler sur cette fiche.</p>;
  const bad = rows.filter(r => r.bad).length;
  return (
    <Fold summary={`${rows.length} point${rows.length > 1 ? 's' : ''} à compléter${bad ? ` · dont ${bad} à corriger` : ''}`} className="rounded-lg border border-amber-200 bg-amber-50" summaryClass="text-xs font-bold text-amber-950">
      <ul className="divide-y divide-amber-200 border-t border-amber-200" aria-label="Points à compléter">
        {rows.map(r => <li key={r.key}><button type="button" onClick={() => go(r.tab)} className="flex w-full flex-wrap items-center gap-x-2 px-3 py-1.5 text-left text-xs text-amber-950 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-delacour-golddark">
          <span className={`min-w-0 flex-1 ${r.bad ? 'font-semibold text-red-800' : ''}`}>{r.bad ? 'À corriger : ' : ''}{r.text}</span><span className="text-slate-600">Onglet {TAB_NAME[r.tab]} →</span></button></li>)}
      </ul>
    </Fold>
  );
}

// `empty` given: the section is a fold, shut when it holds nothing (decided once, when it appears)
export const Section = ({ title, hint, children, empty }: { title: string; hint?: string; children: ReactNode; empty?: boolean }) => empty === undefined
  ? <section className="space-y-2"><div><h3 className="text-xs font-bold text-slate-900">{title}</h3>{hint && <p className="text-xs text-slate-600">{hint}</p>}</div>{children}</section>
  : <Fold open={!empty} summary={<>{title}{empty && <span className="font-normal text-slate-600"> · rien pour l'instant</span>}</>} summaryClass="text-xs font-bold text-slate-900"><section aria-label={title} className="space-y-2 border-t border-slate-100 p-3">{hint && <p className="text-xs text-slate-600">{hint}</p>}{children}</section></Fold>;
