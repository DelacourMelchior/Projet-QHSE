// Lists of inputs, outputs and requirements, written on a flowchart (what is precise) and on the sheet of a process (what is in no flowchart).
import { Plus, Trash2 } from 'lucide-react';
import type { MapIo, MapReq, Process } from '../../domain/types';
import { plainName, REQ_KINDS, requirementSuggestions } from '../../domain/cartography';
import { newId } from '../../domain/base';
import { Button, inputCls } from '../common';

export function IoEditor({ kind, rows, onChange, others, disabled }: { kind: 'inputs' | 'outputs'; rows: MapIo[]; onChange(v: MapIo[]): void; others: Process[]; disabled?: boolean }) {
  const inn = kind === 'inputs', party = inn ? 'De qui' : 'Pour qui', upd = (i: number, v: Partial<MapIo>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...v } : r)));
  return (
    <div className="space-y-1.5">
      {rows.length > 0 && <div className="hidden gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 sm:grid sm:grid-cols-[2fr_1.5fr_1.5fr_auto]" aria-hidden><span>{inn ? 'Ce qui entre' : 'Ce qui sort'}</span><span>{party}</span><span>Processus concerné</span><span className="w-9" /></div>}
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1.5 sm:grid-cols-[2fr_1.5fr_1.5fr_auto]">
          <input className={inputCls} disabled={disabled} aria-label={`${inn ? 'Entrée' : 'Sortie'} ${i + 1}`} value={r.what} placeholder={inn ? 'Quoi (une demande de prix, des plans…)' : 'Quoi (un produit livré, un devis signé…)'} onChange={e => upd(i, { what: e.target.value })} />
          <input className={inputCls} disabled={disabled} aria-label={`${party}, ligne ${i + 1}`} value={r.party} placeholder={party} onChange={e => upd(i, { party: e.target.value })} />
          <select className={inputCls} disabled={disabled} aria-label={`Processus lié à la ligne ${i + 1}`} value={r.processId || ''} onChange={e => upd(i, { processId: e.target.value || undefined })}>
            <option value="">Aucun processus (extérieur à l'entreprise ou autre : précisez dans « {party} »)</option>
            {others.map(o => <option key={o.id} value={o.id}>{o.id} · {plainName(o.name)}</option>)}
          </select>
          <Button kind="ghost" disabled={disabled} aria-label={`Retirer la ligne ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
        </div>
      ))}
      <Button disabled={disabled} onClick={() => onChange([...rows, { what: '', party: '' }])}><Plus size={13} />{inn ? 'Ajouter une entrée' : 'Ajouter une sortie'}</Button>
    </div>
  );
}

export function ReqEditor({ rows, onChange, disabled, processId, meets, allowAll }: { rows: MapReq[]; onChange(v: MapReq[]): void; disabled?: boolean; processId: string; meets?: (r: MapReq) => number; allowAll?: boolean }) {
  const sugg = requirementSuggestions(processId, rows);
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1.5 sm:items-center sm:[grid-template-columns:var(--cols)]" style={{ '--cols': `10rem 1fr${meets ? ' auto' : ''}${allowAll ? ' auto' : ''} auto` } as React.CSSProperties}>
          <select className={inputCls} disabled={disabled} aria-label={`Nature de l'exigence ${i + 1}`} value={r.kind} onChange={e => onChange(rows.map((q, j) => (j === i ? { ...q, kind: e.target.value as MapReq['kind'] } : q)))}>{REQ_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}</select>
          <input className={inputCls} disabled={disabled} aria-label={`Exigence ${i + 1}`} value={r.text} placeholder={r.kind === 'other' ? 'Précisez' : r.kind === 'client' ? 'Par exemple : livraison sous 5 jours promise au client' : r.kind === 'legal' ? 'Par exemple : conservation des factures pendant la durée légale' : r.kind === 'standard' ? 'Par exemple : ISO 9001, point 8.5' : 'Par exemple : visa de la direction au-dessus de 10 000 €'} onChange={e => onChange(rows.map((q, j) => (j === i ? { ...q, text: e.target.value } : q)))} />
          {meets && (() => { const n = r.text.trim() ? meets(r) : -1; return n < 0 ? <span className="hidden sm:block" /> : <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${n ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`} title={n ? 'Étapes de ce logigramme qui respectent cette exigence (à cocher dans l\'étape)' : 'Aucune étape ne dit encore comment elle respecte cette exigence : ouvrir une étape et la cocher'}>{n ? `${n} étape${n > 1 ? 's' : ''}` : 'Aucune étape'}</span>; })()}
          {allowAll && <label className="flex min-h-[44px] items-center gap-1.5 text-xs text-slate-700 sm:min-h-0" title="L'exigence s'applique à tous les processus : elle est écrite ici une seule fois et apparaît sur la fiche de chacun."><input type="checkbox" disabled={disabled} checked={!!r.all} aria-label={`L'exigence ${i + 1} s'applique à tous les processus`} onChange={e => onChange(rows.map((q, j) => (j === i ? { ...q, all: e.target.checked || undefined } : q)))} />Tous les processus</label>}
          <Button kind="ghost" disabled={disabled} aria-label={`Retirer l'exigence ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} !w-auto min-w-[16rem] max-w-full`} disabled={disabled || !sugg.length} aria-label="Ajouter une exigence courante" value="" onChange={e => { const x = sugg[Number(e.target.value)]; if (x) onChange([...rows, { ...x, id: newId('rq') }]); }}>
          <option value="">{sugg.length ? 'Ajouter une exigence courante…' : 'Toutes les exigences courantes sont ajoutées'}</option>
          {REQ_KINDS.filter(k => sugg.some(x => x.kind === k.key)).map(k => <optgroup key={k.key} label={k.label}>{sugg.map((x, i) => x.kind === k.key ? <option key={i} value={i}>{x.text}</option> : null)}</optgroup>)}
        </select>
        <Button disabled={disabled} onClick={() => onChange([...rows, { kind: 'client', text: '', id: newId('rq') }])}><Plus size={13} />Écrire une autre exigence</Button>
      </div>
      {!disabled && <p className="text-[11px] text-slate-600">Liste indicative, à adapter à l'activité et à la taille de l'entreprise ; elle ne remplace pas une veille réglementaire.</p>}
    </div>
  );
}
