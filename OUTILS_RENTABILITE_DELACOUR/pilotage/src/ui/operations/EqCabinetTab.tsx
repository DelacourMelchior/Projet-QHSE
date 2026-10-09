// The "Armoire" tab of the sheet of an equipment (tool 3.3): the parts of the common cabinet that serve this equipment, the same rows as the cabinet view but
// compact, "add a part that already exists" and "new part" (created with this equipment). Parts are written to the store at once (state.spares), never through
// the typed copy of the sheet; a part taken out of this equipment's list can be brought back with "Annuler".
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Spare } from '../../domain/types';
import { activeSpares, lowSpares, newSpare, sparesOf } from '../../domain/maintenanceSpares';
import { useStore } from '../../store/StoreContext';
import { Button, inputCls } from '../common';
import { useUndo } from './EqBits';
import type { EqTabProps } from './EqProps';
import { plural, SpareRow, spareName } from './EqCabinet';
import { SpareSheet } from './EqSpareSheet';

export function CabinetTab({ e, state, nav }: EqTabProps) {
  const { update } = useStore();
  const { bar, offer } = useUndo();
  const [open, setOpen] = useState(''), [fresh, setFresh] = useState<Spare | null>(null);   // a new part lives in its window until it has a name or a reference
  const now = new Date();
  const mine = sparesOf(state, e.id), low = lowSpares(state).filter(s => s.equipmentIds.includes(e.id));
  const others = activeSpares(state).filter(s => !s.equipmentIds.includes(e.id));
  // the equipment of a part, written at once; the part itself stays in the cabinet
  const link = (id: string, on: boolean) => update(d => { const s = d.spares[id]; if (s) s.equipmentIds = on ? [...s.equipmentIds.filter(i => i !== e.id), e.id] : s.equipmentIds.filter(i => i !== e.id); });
  const spare = (open && Object.hasOwn(state.spares, open) ? state.spares[open] : undefined) ?? fresh ?? undefined;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-900">{mine.length ? `${plural(mine.length, 'pièce')} pour cet équipement${low.length ? `, dont ${low.length} sous le mini` : ''}` : "Aucune pièce de l'armoire ne sert cet équipement"}</p>
        <p className="text-[11px] text-slate-500">L'armoire est commune à toute l'entreprise : une pièce qui sert plusieurs équipements a un seul stock.</p>
      </div>
      {mine.length > 0 && (
        <ul className="space-y-2">
          {mine.map(sp => <SpareRow key={sp.id} sp={sp} state={state} offer={offer} now={now} eqId={e.id} compact onOpen={() => setOpen(sp.id)}
            onUnlink={() => { link(sp.id, false); offer(`${spareName(sp)} : retirée de cet équipement`, () => link(sp.id, true)); }} />)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {others.length > 0 && (
          <label className="min-w-[12rem] flex-1 sm:max-w-sm">
            <span className="sr-only">Ajouter une pièce existante</span>
            <select className={inputCls} value="" onChange={ev => { const id = ev.target.value; if (!id) return; link(id, true); offer(`${spareName(state.spares[id])} : ajoutée à cet équipement`, () => link(id, false)); }}>
              <option value="">Ajouter une pièce existante</option>
              {others.map(s => <option key={s.id} value={s.id}>{spareName(s)}{s.name.trim() && s.ref.trim() ? ` (${s.ref})` : ''}</option>)}
            </select>
          </label>
        )}
        <Button onClick={() => { const sp = newSpare([e.id]); setFresh(sp); setOpen(sp.id); }}><Plus size={14} />Nouvelle pièce</Button>
      </div>
      {bar}
      {spare && <SpareSheet key={spare.id} initial={spare} nav={nav} offerBack={offer} onClose={() => { setOpen(''); setFresh(null); }} />}
    </div>
  );
}
