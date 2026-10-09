// Settings of tool 2.3, filled once and saved as typed: who approves, what the rate counts, how long data is kept,
// and the points checked during an investigation (the model of the business profile until the company edits it).
// The days that do not count in the 48 h are a general setting (Réglages, Entreprise).
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Params } from '../../domain/types';
import { DEFAULT_MOTIFS, freeSlot, GREY, investigationOf, MAX_MOTIFS, motifsOf, presetKeyOf, PRESET_LABEL, RETENTION_DEFAULT, resetMotifs, SERIES_COLORS, withoutMotif, type Motif } from '../../domain/commercial';
import { defaultProcess, PROCESS_IDS, processLabel } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import { TOOLS, type Nav } from '../tools';
import { Button, Field, inputCls, NumInput, ToolSettings } from '../common';

type Point = NonNullable<Params['investigation']>[number];

export function ComplaintSettings({ nav }: { nav: Nav }) {
  const { state, update } = useStore();
  if (!state) return null;
  const params = state.params;
  const points = investigationOf({ settings: state.settings, params });
  const custom = !!params.investigation?.length;
  const model = presetKeyOf(state);
  const setP = (f: (p: Params) => void) => update(d => f(d.params));
  const setPoints = (xs: Point[]) => setP(p => { p.investigation = xs; });
  const setPoint = (i: number, patch: Partial<Point>) => setPoints(points.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  // motives of complaint: the company's own list, edited in place (the neutral list until the first change)
  const motifs = motifsOf(params), customMotifs = !!params.motifs?.length;
  const usedBy = (key: string) => Object.values(state.complaints).filter(c => c.category === key).length;
  const setMotifs = (xs: Motif[]) => setP(p => { p.motifs = xs; });
  const activeMotifs = motifs.filter(m => !m.retired).length;
  const addMotif = () => { const slot = freeSlot(motifs); if (slot >= 0) setMotifs([...motifs, { key: `mt_${Date.now().toString(36)}`, label: '', slot }]); };
  const back = () => {
    const usedCustom = motifs.filter(m => !DEFAULT_MOTIFS.some(d => d.key === m.key) && usedBy(m.key) > 0).map(m => m.key);
    if (usedCustom.length && !window.confirm('Des fiches utilisent des motifs ajoutés par l\'entreprise : ils restent dans l\'historique, comme motifs retirés. Revenir à la liste de départ ?')) return;
    const next = resetMotifs(motifs, usedCustom);
    setP(p => { p.motifs = next.length === DEFAULT_MOTIFS.length ? undefined : next; });
  };

  return (
    <ToolSettings>
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="block text-[11px] font-semibold text-slate-700">Motifs de réclamation {customMotifs ? '(liste de l\'entreprise)' : '(liste de départ, valable pour tout métier)'}</span>
          {customMotifs && <Button kind="ghost" onClick={back}><RotateCcw size={13} />Revenir à la liste de départ</Button>}
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {motifs.map((m, i) => {
            const used = usedBy(m.key);
            return (
              <li key={m.key} className={`flex items-center gap-2 rounded-lg border p-1.5 ${m.retired ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200'}`}>
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SERIES_COLORS[m.slot ?? i] || GREY.other }} />
                <input className={inputCls} value={m.label} disabled={m.retired} aria-label="Motif" placeholder="Nom du motif" onChange={e => setMotifs(motifs.map(x => (x.key === m.key ? { ...x, label: e.target.value } : x)))} />
                {used > 0 && <span className="shrink-0 text-[11px] text-slate-500">{used} fiche{used > 1 ? 's' : ''}</span>}
                {m.retired
                  ? <Button kind="ghost" className="!px-2" onClick={() => setMotifs(motifs.map(x => (x.key === m.key ? { ...x, retired: undefined } : x)))}>Remettre</Button>
                  : <Button kind="ghost" className="!px-2" aria-label={`Retirer le motif ${m.label}`} disabled={activeMotifs <= 1} onClick={() => setMotifs(withoutMotif(motifs, m.key, used > 0))}><Trash2 size={14} /></Button>}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={addMotif} disabled={freeSlot(motifs) < 0}><Plus size={14} />Ajouter un motif</Button>
          {freeSlot(motifs) < 0 && <span className="text-[11px] text-amber-800">{MAX_MOTIFS} motifs au plus : retirez-en un pour en ajouter.</span>}
        </div>
        <p className="text-[11px] text-slate-500">Renommer un motif met à jour toutes les fiches et le graphique. Un motif retiré qui sert déjà à des fiches reste dans l'historique, avec sa couleur, mais n'est plus proposé. « Autre » existe toujours et demande de préciser.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="La direction valide dès (€ HT)" hint="Avoir, transport et reprise au-dessus de ce montant. Vide = pas de règle.">
          <NumInput value={params.creditLimit ?? null} onChange={v => setP(p => { p.creditLimit = v ?? undefined; })} />
        </Field>
        <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700"><input type="checkbox" checked={!!params.approveContest} onChange={e => setP(p => { p.approveContest = e.target.checked; })} />La direction valide chaque réponse « non justifiée »</label>
        <Field label="Le taux de réclamation se compte sur" hint="Livraisons, interventions, affaires, clients servis…">
          <input className={inputCls} value={params.rateUnit ?? ''} placeholder="livraisons" onChange={e => setP(p => { p.rateUnit = e.target.value || undefined; })} />
        </Field>
        <Field label="Conservation des fiches closes (années)" hint={`Au-delà, l'outil propose d'effacer les données du client (${RETENTION_DEFAULT} ans si vide).`}>
          <NumInput value={params.retentionYears ?? null} onChange={v => setP(p => { p.retentionYears = v ?? undefined; })} />
        </Field>
      </div>
      <p className="text-[11px] text-slate-500">
        Jours fériés et fermetures qui ne comptent pas dans les 48 h : <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => nav.settings()}>Réglages, jours ouvrés</button>.
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="block text-[11px] font-semibold text-slate-700">Points vérifiés pendant l'enquête {custom ? '(liste de l\'entreprise)' : `(modèle ${PRESET_LABEL[model]})`}</span>
          {custom && <Button kind="ghost" onClick={() => setP(p => { p.investigation = undefined; })}>Revenir au modèle {PRESET_LABEL[model]}</Button>}
        </div>
        {points.map((p, i) => (
          <div key={p.key} className="grid items-center gap-1.5 rounded-lg border border-slate-200 p-2 lg:grid-cols-[1.2fr_1.6fr_9rem_10rem_auto]">
            <input className={inputCls} value={p.label} aria-label="Point à vérifier" placeholder="Point à vérifier" onChange={e => setPoint(i, { label: e.target.value })} />
            <input className={inputCls} value={p.hint} aria-label="Aide" placeholder="Ce qu'on regarde" onChange={e => setPoint(i, { hint: e.target.value })} />
            <select className={inputCls} value={p.process} aria-label="Processus en cause" onChange={e => setPoint(i, { process: e.target.value })}>
              {PROCESS_IDS.map(id => <option key={id} value={id}>{processLabel(id)}</option>)}
            </select>
            <select className={inputCls} value={p.tool || ''} aria-label="Outil qui contient la preuve" onChange={e => setPoint(i, { tool: e.target.value || undefined })}>
              <option value="">Aucun outil lié</option>
              {TOOLS.filter(t => t.id !== '2.3').map(t => <option key={t.id} value={t.id}>{t.id} {t.label}</option>)}
            </select>
            <Button kind="ghost" aria-label={`Retirer le point ${p.label}`} onClick={() => setPoints(points.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
          </div>
        ))}
        <Button onClick={() => setPoints([...points, { key: `pt_${Date.now().toString(36)}`, label: '', hint: '', process: defaultProcess('P3') }])}><Plus size={14} />Ajouter un point</Button>
        <p className="text-[11px] text-slate-500">Un point retiré qui a déjà été renseigné dans une fiche reste visible dans cette fiche.</p>
      </div>
    </ToolSettings>
  );
}
