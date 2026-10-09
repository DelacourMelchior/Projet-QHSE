// Starting a piece of equipment: from a model of routine (by kind of equipment), from a copy of another one, or empty. The sheet opens with no name:
// the name of a model is only a hint in the field.
import { useState } from 'react';
import { Copy, FilePlus, LayoutTemplate } from 'lucide-react';
import type { Equipment } from '../../domain/types';
import { duplicateEquipment, EQ_KINDS, EQ_TEMPLATES, equipmentFromTemplate, eqStatus, kindLabel, kindOf, newEquipment } from '../../domain/maintenance';
import { useStore } from '../../store/StoreContext';
import { Button, Modal } from '../common';
import { KindIcon } from './EqBits';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export function EqNew({ onClose, onStart }: { onClose(): void; onStart(e: Equipment): void }) {
  const { state } = useStore();
  const [mode, setMode] = useState<'menu' | 'template' | 'copy'>('menu');
  if (!state) return null;
  const eqs = Object.values(state.equipments).sort((a, b) => a.name.localeCompare(b.name));
  const card = 'flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-3 text-left hover:border-delacour-gold hover:bg-amber-50/40 disabled:opacity-50 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
  return (
    <Modal wide onClose={onClose} title="Nouvel équipement" subtitle="Comment voulez-vous commencer ?">
      {mode === 'menu' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" className={card} onClick={() => setMode('template')}><LayoutTemplate size={20} className="text-delacour-primary" /><strong className="text-sm">À partir d'un modèle</strong><span className="text-[11px] text-slate-600">Machine, véhicule, installation, informatique, instrument de mesure : des points de routine déjà écrits, à adapter.</span></button>
          <button type="button" className={card} disabled={!eqs.length} onClick={() => setMode('copy')}><Copy size={20} className="text-delacour-primary" /><strong className="text-sm">Copier un équipement</strong><span className="text-[11px] text-slate-600">Même type, même poste : on garde les points, les contrôles et les intervenants, jamais l'historique.</span></button>
          <button type="button" className={card} onClick={() => onStart(newEquipment())}><FilePlus size={20} className="text-delacour-primary" /><strong className="text-sm">Fiche vide</strong><span className="text-[11px] text-slate-600">Cinq points de routine neutres, tout le reste à remplir soi-même.</span></button>
        </div>
      )}
      {mode === 'template' && (
        <div className="space-y-4">
          {EQ_KINDS.map(k => {
            const ts = EQ_TEMPLATES.filter(t => t.kind === k.key);
            return ts.length > 0 && (
              <section key={k.key} className="space-y-1.5">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><KindIcon kind={k.key} size={14} className="text-delacour-primary" />{k.label}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {ts.map(t => (
                    <li key={t.name}>
                      <button type="button" className={`${card} w-full`} onClick={() => onStart({ ...equipmentFromTemplate(t), name: '' })}>
                        <strong className="text-sm">{t.name}</strong>
                        <span className="line-clamp-2 text-[11px] text-slate-600">{plural(t.points.length, 'point')} : {t.points.map(p => p.label).join(' · ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {mode === 'copy' && (
        <ul className="space-y-1.5">
          {eqs.map(x => (
            <li key={x.id}>
              <button type="button" className={`${card} w-full`} onClick={() => onStart(duplicateEquipment(x))}>
                <strong className="text-sm">{x.name.trim() || 'Équipement sans nom'}</strong>
                <span className="text-[11px] text-slate-600">{kindLabel(kindOf(x))}{x.location.trim() ? ` · ${x.location.trim()}` : ''} · {plural(x.checkpoints.length, 'point')}{x.tasks?.length ? `, ${plural(x.tasks.length, 'contrôle')}` : ''}{eqStatus(x) === 'retired' ? ' · retiré du service' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {mode !== 'menu' && <div className="mt-3"><Button kind="ghost" onClick={() => setMode('menu')}>Retour</Button></div>}
    </Modal>
  );
}
