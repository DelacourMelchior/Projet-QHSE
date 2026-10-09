// Settings of tool 3.2, saved as typed: the delay to update a sheet after a defect, the months between two reviews, the number of people allowed per
// workstation and the level of the versatility matrix that allows them, the sharpness of the photos, the protections and reasons of the company, the plan.
// An empty field goes back to the default of the tool.
import { Plus, RotateCcw, X } from 'lucide-react';
import type { SopSettings as Settings } from '../../domain/types';
import { DEFAULT_REASONS, OTHER_REASON, PHOTO_SIZES, sopCfg } from '../../domain/instructions';
import { LEVELS } from '../../domain/team';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, NumInput, ToolSettings } from '../common';
import { addPhoto } from '../../photo/store';
import { Pic } from '../../photo/Pic';

export function SopSettings() {
  const { state, update } = useStore();
  if (!state) return null;
  const cfg = sopCfg(state.params), saved = state.params.sop || {};
  const setS = (patch: Partial<Settings>) => update(d => { const next = { ...(d.params.sop || {}), ...patch } as Record<string, unknown>; Object.keys(next).forEach(k => { if (next[k] === undefined) delete next[k]; }); d.params.sop = next as Settings; });
  const num = (k: 'updateHours' | 'reviewMonths' | 'minPeople') => (v: number | null) => setS({ [k]: v && v > 0 ? Math.round(v) : undefined });
  const reasons = cfg.reasons.filter(r => r !== OTHER_REASON), ppe = saved.ppe || [];
  const setReasons = (xs: string[]) => setS({ reasons: xs.length === DEFAULT_REASONS.length - 1 && xs.every((x, i) => x === DEFAULT_REASONS[i]) ? undefined : xs });
  return (
    <ToolSettings title="Réglages de cet outil : délais, habilitation, photos, protections, motifs, plan">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Mise à jour après un défaut (heures)" hint="Délai pour passer à la version suivante."><NumInput value={cfg.updateHours} onChange={num('updateHours')} /></Field>
          <Field label="Relecture de chaque fiche (mois)" hint="Au-delà, la fiche apparaît dans « à faire »."><NumInput value={cfg.reviewMonths} onChange={num('reviewMonths')} /></Field>
          <Field label="Personnes habilitées par poste, au moins" hint="En dessous, un message le signale."><NumInput value={cfg.minPeople} onChange={num('minPeople')} /></Field>
          <Field label="Niveau de polyvalence (4.2) qui habilite" hint="Les personnes à ce niveau ou plus sont habilitées d'office.">
            <select className={inputCls} value={cfg.habLevel} onChange={e => setS({ habLevel: Number(e.target.value) === 2 ? undefined : Number(e.target.value) })}>{LEVELS.filter(l => l.level > 0).map(l => <option key={l.level} value={l.level}>{l.level} : {l.label}</option>)}</select>
          </Field>
        </div>
        <Field label="Netteté des photos" hint="Une photo plus nette pèse plus lourd dans les données partagées.">
          <select className={`${inputCls} max-w-sm`} value={cfg.photoPx} onChange={e => setS({ photoPx: Number(e.target.value) === 2560 ? undefined : Number(e.target.value) })}>{PHOTO_SIZES.map(([px, l]) => <option key={px} value={px}>{l}</option>)}</select>
        </Field>
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-700">Protections propres à l'entreprise</span>
          <p className="text-[11px] text-slate-500">Ajoutées à la liste de départ (lunettes, chaussures, gants, protections auditives, masque, blouse) dans toutes les fiches.</p>
          {ppe.map((p, i) => (
            <div key={i} className="flex max-w-md gap-1.5"><input className={inputCls} value={p} aria-label="Protection" onChange={e => setS({ ppe: ppe.map((x, j) => (j === i ? e.target.value : x)) })} /><Button kind="ghost" className="!px-2" aria-label={`Retirer ${p}`} onClick={() => setS({ ppe: ppe.filter((_, j) => j !== i).length ? ppe.filter((_, j) => j !== i) : undefined })}><X size={14} /></Button></div>
          ))}
          <Button className="!py-1" onClick={() => setS({ ppe: [...ppe, ''] })}><Plus size={13} />Ajouter une protection</Button>
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-700">Motifs d'une nouvelle version</span>
          <p className="text-[11px] text-slate-500">La liste proposée quand une fiche change de version. « Autre, précisez » reste toujours en dernier.</p>
          {reasons.map((r, i) => (
            <div key={i} className="flex max-w-md gap-1.5"><input className={inputCls} value={r} aria-label="Motif" onChange={e => setReasons(reasons.map((x, j) => (j === i ? e.target.value : x)))} /><Button kind="ghost" className="!px-2" aria-label={`Retirer ${r}`} onClick={() => setReasons(reasons.filter((_, j) => j !== i))}><X size={14} /></Button></div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button className="!py-1" onClick={() => setReasons([...reasons, 'Nouveau motif'])}><Plus size={13} />Ajouter un motif</Button>
            {saved.reasons && <Button kind="ghost" className="!py-1" onClick={() => setS({ reasons: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-700">Plan de l'atelier</span>
          <p className="text-[11px] text-slate-500">Une image du plan (photo ou dessin). Les postes s'y placent ensuite d'un tap, dans la vue « Plan ».</p>
          {cfg.plan && <Pic value={cfg.plan} alt="Plan de l'atelier" fit="contain" size="t" className="max-h-48 w-auto rounded-lg border border-slate-200" />}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 max-sm:min-h-[44px]">
              {cfg.plan ? 'Remplacer le plan' : 'Ajouter le plan'}
              <input type="file" accept="image/*" className="sr-only" aria-label="Image du plan de l'atelier" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setS({ plan: await addPhoto(f, 2560) }); }} />
            </label>
            {cfg.plan && <Button kind="ghost" onClick={() => setS({ plan: undefined })}>Retirer le plan</Button>}
          </div>
        </div>
      </div>
    </ToolSettings>
  );
}
