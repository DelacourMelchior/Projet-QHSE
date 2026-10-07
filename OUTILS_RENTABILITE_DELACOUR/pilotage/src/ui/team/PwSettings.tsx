// Settings of tool 4.1, saved as typed: the rhythms (check of an envelope, the hours after which an absence opens the envelope, the review of the list, the number of
// powers after which a deputy is said to carry many), the formalities asked for each power, and the suggestions of vital powers. An empty field, or a list put back to the neutral one,
// goes back to the default of the tool (the field says it). One closed section per subject: a phone never scrolls through all of them.
import type { ReactNode } from 'react';
import { ChevronDown, Plus, RotateCcw, X } from 'lucide-react';
import type { PowerSettings } from '../../domain/types';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { DEFAULT_FORMS, ENVELOPE_DAYS, LONG_HOURS, LOAD_MAX, POWER_LIBRARY, powerCfg, REVIEW_MONTHS } from '../../domain/powers';
import { useStore } from '../../store/StoreContext';
import { Button, Field, NumInput, ToolSettings } from '../common';
import { FIELD, TOUCH, useUndo } from './PwBits';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const clamp = (v: number | null, lo: number, hi: number) => (v === null ? undefined : Math.min(hi, Math.max(lo, Math.round(v))));
const ICON = '!px-2 max-sm:min-w-[44px] [@media(pointer:coarse)]:min-w-[44px]';

function Sec({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group/sec rounded-lg border border-slate-200">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 ${TOUCH}`}><span>{title}</span><ChevronDown size={14} aria-hidden className="shrink-0 text-slate-400 transition group-open/sec:rotate-180" /></summary>
      <div className="space-y-1.5 border-t border-slate-100 p-2.5">{children}</div>
    </details>
  );
}

export function PwSettings() {
  const { state, update } = useStore();
  const { bar, offer } = useUndo();
  if (!state) return null;
  const saved = state.params.power || {}, cfg = powerCfg(state.params);
  // merges into the saved settings; a key set to undefined goes back to the default of the tool
  const setS = (patch: Partial<PowerSettings>) => update(d => { const next = { ...(d.params.power || {}), ...patch } as Record<string, unknown>; Object.keys(next).forEach(k => { if (next[k] === undefined) delete next[k]; }); d.params.power = next as PowerSettings; });
  const forms = saved.forms ?? DEFAULT_FORMS, library = saved.library ?? POWER_LIBRARY;
  const setForms = (xs: { key: string; label: string }[]) => setS({ forms: !xs.length || same(xs, DEFAULT_FORMS) ? undefined : xs });
  const setLib = (xs: { process: string; text: string }[]) => setS({ library: !xs.length || same(xs, POWER_LIBRARY) ? undefined : xs });
  const num = (label: string, hint: string, k: 'practiceDays' | 'envelopeDays' | 'longHours' | 'reviewMonths' | 'loadMax', def: number, lo: number, hi: number) => (
    <Field label={label} hint={hint}><NumInput className="[@media(pointer:coarse)]:!text-base" value={saved[k]} placeholder={`${def} (défaut)`} onChange={v => setS({ [k]: clamp(v, lo, hi) })} /></Field>
  );
  return (
    <div id="reglages-4-1" className="scroll-mt-4">
      <ToolSettings title="Réglages de cet outil : rythmes, formalités, suggestions de fonctions">
        <div className="space-y-2">
          <Sec title="Rythmes">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {num("Vérification d'une enveloppe, tous les (jours)", `${cfg.envelopeDays} jours par défaut : deux fois par an.`, 'envelopeDays', ENVELOPE_DAYS, 30, 730)}
              {num("Absence qui ouvre l'enveloppe, au-delà de (heures)", `Au-delà de ${cfg.longHours} h d'absence, les accès de secours peuvent servir, sous double visa.`, 'longHours', LONG_HOURS, 1, 720)}
              {num('Relecture de la liste, tous les (mois)', `La liste des fonctions est relue tous les ${cfg.reviewMonths} mois.`, 'reviewMonths', REVIEW_MONTHS, 1, 60)}
              {num('Suppléant de beaucoup de fonctions, au-delà de', `Une personne suppléante de plus de ${cfg.loadMax} fonctions est dite.`, 'loadMax', LOAD_MAX, 1, 20)}
            </div>
          </Sec>
          <Sec title="Accès de secours : suivi des enveloppes">
            <label className={`flex items-start gap-2.5 text-xs text-slate-800 ${TOUCH}`}><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-delacour-primary" checked={!!saved.vaultFull} onChange={e => setS({ vaultFull: e.target.checked ? true : undefined })} />
              <span><strong className="font-semibold">Suivi complet des enveloppes scellées</strong><span className="block text-slate-600">Vérification tous les six mois, ouverture sous double visa, journal. Sans cela, la liste des accès de secours reste simple : où c'est rangé et qui peut y accéder.</span></span></label>
          </Sec>
          <Sec title="Formalités demandées pour chaque fonction">
            <p className="text-xs text-slate-600">Ce qui permet à un suppléant d'agir : une délégation signée, des limites écrites, l'organisme concerné prévenu. Chaque entreprise a la sienne ; chaque ligne se coche fonction par fonction, ou se met « sans objet ».</p>
            {forms.map((f, i) => (
              <div key={f.key} className="flex max-w-xl gap-1.5">
                <input className={FIELD} value={f.label} aria-label={`Formalité ${i + 1}`} onChange={e => setForms(forms.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <Button kind="ghost" className={ICON} aria-label={`Retirer la formalité ${i + 1}${f.label.trim() ? ` : ${f.label.trim()}` : ''}`} onClick={() => { setForms(forms.filter((_, j) => j !== i)); offer('Formalité retirée', () => setForms(forms)); }}><X size={14} /></Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button className="!py-1" onClick={() => setForms([...forms, { key: `f${Date.now().toString(36)}`, label: '' }])}><Plus size={13} />Ajouter une formalité</Button>
              {saved.forms && <Button kind="ghost" className="!py-1" onClick={() => setS({ forms: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
            </div>
          </Sec>
          <Sec title="Suggestions de fonctions clés">
            <p className="text-xs text-slate-600">Les actes proposés quand on part de la bibliothèque. Un vocabulaire qui parle à votre métier : l'acte sans lequel le processus s'arrête.</p>
            {library.map((x, i) => (
              <div key={i} className="flex max-w-3xl flex-wrap gap-1.5 sm:flex-nowrap">
                <select className={`${FIELD} sm:!w-56`} aria-label={`Processus de la suggestion ${i + 1}`} value={x.process} onChange={e => setLib(library.map((y, j) => (j === i ? { ...y, process: e.target.value } : y)))}>{PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}</select>
                <input className={FIELD} value={x.text} aria-label={`Suggestion ${i + 1}`} onChange={e => setLib(library.map((y, j) => (j === i ? { ...y, text: e.target.value } : y)))} />
                <Button kind="ghost" className={ICON} aria-label={`Retirer la suggestion ${i + 1}${x.text.trim() ? ` : ${x.text.trim()}` : ''}`} onClick={() => { setLib(library.filter((_, j) => j !== i)); offer('Suggestion retirée', () => setLib(library)); }}><X size={14} /></Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button className="!py-1" onClick={() => setLib([...library, { process: 'P1', text: '' }])}><Plus size={13} />Ajouter une suggestion</Button>
              {saved.library && <Button kind="ghost" className="!py-1" onClick={() => setS({ library: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
            </div>
          </Sec>
        </div>
      </ToolSettings>
      {bar}
    </div>
  );
}
