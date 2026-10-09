// The steps of a sheet: one card per step with its pictures, a short sentence, the point of vigilance, the self-check, the figures to respect and a
// critical mark. Steps are moved with the arrows or dragged, copied, inserted and removed.
import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, TextCursorInput, X } from 'lucide-react';
import type { Sop, SopStep } from '../../domain/types';
import { newStep, SHORT_SENTENCE, stepPhotos, visualRate, wordCount } from '../../domain/instructions';
import { Button, inputCls } from '../common';
import { PhotoBox } from '../PhotoBox';
import { CriticalBadge } from './SopBits';

const VALUE_LABELS = ['Couple', 'Température', 'Pression', 'Durée', 'Réglage', 'Dimension', 'Épaisseur', 'Vitesse', 'Débit'];
const MAX_PHOTOS = 4;

export function SopSteps({ s, set, px, ncCount }: { s: Sop; set(x: Partial<Sop>): void; px: number; ncCount: Record<number, number> }) {
  const [from, setFrom] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);   // the row drags by its grip only: elsewhere a mouse drag edits text and moves sliders
  const setStep = (i: number, x: Partial<SopStep>) => set({ steps: s.steps.map((st, j) => (j === i ? { ...st, ...x } : st)) });
  const move = (a: number, b: number) => { if (a === b || b < 0 || b >= s.steps.length) return; const n = [...s.steps]; const [x] = n.splice(a, 1); n.splice(b, 0, x); set({ steps: n }); };
  const insert = (at: number, st: SopStep) => { const n = [...s.steps]; n.splice(at, 0, st); set({ steps: n }); };
  const rate = visualRate(s), described = s.steps.filter(x => x.op.trim() || x.how.trim()).length, withPhoto = s.steps.filter(x => (x.op.trim() || x.how.trim()) && stepPhotos(x).length).length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[10rem] flex-1">
          <div className="flex items-baseline justify-between text-[11px]"><span className="font-semibold text-slate-700">Part visuelle : {withPhoto} étape(s) sur {described} avec photo</span><span className={`font-mono font-bold ${rate >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>{rate} %</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${rate} % des étapes ont une photo`}><div className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${rate}%` }} /></div>
        </div>
        <span className="text-[11px] text-slate-500">Objectif : 80 % d'images, des phrases de {SHORT_SENTENCE} mots au plus.</span>
      </div>
      <ol className="space-y-2">
        {s.steps.map((st, i) => {
          const pics = stepPhotos(st), words = wordCount(st.how), edge = from !== null && from !== i;
          return (
            <li key={i} draggable={armed === i} onDragStart={() => setFrom(i)} onDragEnd={() => { setFrom(null); setArmed(null); }} onDragOver={e => { if (edge) e.preventDefault(); }} onDrop={() => { if (from !== null) move(from, i); setFrom(null); }}
              className={`space-y-2 rounded-lg border p-2 ${from === i ? 'opacity-50' : ''} ${st.critical === 'safety' ? 'border-red-300' : st.critical === 'quality' ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span title="Glisser pour déplacer" className="hidden shrink-0 cursor-grab text-slate-400 sm:block" onMouseDown={() => { setArmed(i); window.addEventListener('mouseup', () => setArmed(null), { once: true }); }}><GripVertical size={14} /></span>
                <span className="w-5 shrink-0 text-xs font-bold text-delacour-primary">{i + 1}.</span>
                <input className={`${inputCls} min-w-[8rem] flex-1`} value={st.op} placeholder="Opération clé" aria-label={`Étape ${i + 1} : opération`} onChange={e => setStep(i, { op: e.target.value })} />
                {st.critical && <CriticalBadge kind={st.critical} />}
                {([['Monter cette étape', <ArrowUp key="u" size={14} />, () => move(i, i - 1), i === 0], ['Descendre cette étape', <ArrowDown key="d" size={14} />, () => move(i, i + 1), i === s.steps.length - 1],
                  ['Copier cette étape', <Copy key="c" size={14} />, () => insert(i + 1, structuredClone(st)), false], ['Insérer une étape dessous', <TextCursorInput key="t" size={14} />, () => insert(i + 1, newStep()), false],
                  ['Retirer cette étape', <X key="x" size={14} />, () => set({ steps: s.steps.length > 1 ? s.steps.filter((_, j) => j !== i) : [newStep()] }), false]] as const).map(([l, ic, f, off]) => (
                  <button key={l} type="button" aria-label={l} title={l} disabled={off} onClick={f} className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 max-sm:p-2 [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:justify-center">{ic}</button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,220px)]">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input className={inputCls} value={st.how} placeholder="Comment faire (phrase courte)" aria-label={`Étape ${i + 1} : comment`} onChange={e => setStep(i, { how: e.target.value })} />
                    {words > SHORT_SENTENCE && <span className="text-[11px] text-amber-800">{words} mots : une phrase courte se lit mieux au poste ({SHORT_SENTENCE} mots au plus).</span>}
                  </div>
                  <input className={inputCls} value={st.watch} placeholder="Point de vigilance" aria-label={`Étape ${i + 1} : vigilance`} onChange={e => setStep(i, { watch: e.target.value })} />
                  <input className={inputCls} value={st.check} placeholder="Autocontrôle" aria-label={`Étape ${i + 1} : autocontrôle`} onChange={e => setStep(i, { check: e.target.value })} />
                  <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2" role="radiogroup" aria-label={`Étape ${i + 1} : point critique`}>
                    <span className="text-[11px] font-semibold text-slate-700">Point critique :</span>
                    {([[undefined, 'Non'], ['quality', 'Qualité'], ['safety', 'Sécurité']] as const).map(([k, l]) => (
                      <button key={l} type="button" role="radio" aria-checked={st.critical === k} onClick={() => setStep(i, { critical: k })}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold max-sm:min-h-[36px] ${st.critical === k ? (k === 'safety' ? 'border-red-700 bg-red-700 text-white' : k === 'quality' ? 'border-amber-700 bg-amber-600 text-white' : 'border-slate-700 bg-slate-700 text-white') : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
                    ))}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    {(st.values || []).map((v, j) => (
                      <div key={j} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                        <input className={inputCls} value={v.label} list="sop-value-labels" placeholder="Valeur (couple, température…)" aria-label={`Étape ${i + 1} : nom de la valeur`} onChange={e => setStep(i, { values: st.values!.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} />
                        <input className={inputCls} value={v.value} placeholder="2,5 Nm ± 0,2" aria-label={`Étape ${i + 1} : valeur à respecter`} onChange={e => setStep(i, { values: st.values!.map((x, k) => (k === j ? { ...x, value: e.target.value } : x)) })} />
                        <button type="button" aria-label="Retirer cette valeur" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => setStep(i, { values: st.values!.filter((_, k) => k !== j) })}><X size={14} /></button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button className="!px-2 !py-1" onClick={() => setStep(i, { values: [...(st.values || []), { label: '', value: '' }] })}><Plus size={13} />Valeur à respecter</Button>
                      <input className={`${inputCls} max-w-xs`} value={st.video || ''} placeholder="Lien d'une vidéo courte (facultatif)" aria-label={`Étape ${i + 1} : lien de la vidéo`} onChange={e => setStep(i, { video: e.target.value || undefined })} />
                      {ncCount[i] ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">{ncCount[i]} défaut(s) déclaré(s) sur cette étape en 12 mois</span> : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <PhotoBox value={st.photo} label={`Étape ${i + 1}`} px={px} onChange={v => setStep(i, { photo: v })} />
                  {(st.photos || []).map((p, j) => <PhotoBox key={j} value={p} label={`Étape ${i + 1}, photo ${j + 2}`} px={px} onChange={v => setStep(i, { photos: v ? st.photos!.map((x, k) => (k === j ? v : x)) : st.photos!.filter((_, k) => k !== j) })} />)}
                  {st.photo && pics.length < MAX_PHOTOS && <Button className="w-full !py-1" onClick={() => setStep(i, { photos: [...(st.photos || []), ''] })}><Plus size={13} />Autre photo</Button>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Button className="!px-2 !py-1" onClick={() => set({ steps: [...s.steps, newStep()] })}><Plus size={13} />Ajouter une étape</Button>
      <datalist id="sop-value-labels">{VALUE_LABELS.map(l => <option key={l} value={l} />)}</datalist>
    </div>
  );
}
