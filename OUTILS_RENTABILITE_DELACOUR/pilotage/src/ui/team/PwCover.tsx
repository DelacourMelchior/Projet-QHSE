// An absence that is over: what was missing (the line is written for each one that is ticked, seen by the person who
// closes). The weekly work is done by the queue: the absence stays in "À faire" until it is closed.
import { useState } from 'react';
import type { Cover } from '../../domain/types';
import type { Nav } from '../tools';
import { closeCover, openUnsealed, vaultLogs, activeVaults, powerCfg } from '../../domain/powers';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Field, Modal } from '../common';
import { FIELD } from './PwBits';

export function PwCover({ cover, nav, offer, onClose }: { cover: Cover; nav: Nav; offer(what: string, back: () => void): void; onClose(): void }) {
  const { state, update, author } = useStore();
  const [missing, setMissing] = useState(cover.missing);
  if (!state) return null;
  const full = powerCfg(state.params).vaultFull, open = !full ? [] : activeVaults(state).filter(v => openUnsealed(vaultLogs(state, v.id)).length);
  const save = (action: boolean) => {
    const before = state.covers[cover.id];
    update(d => { closeCover(d, cover.id, missing, author || 'anonyme', []); });
    offer(`Absence clôturée : ${cover.who}`, () => update(d => { d.covers[cover.id] = before; }));
    onClose();
    if (action && missing.trim()) nav.newAction({ constat: `Absence de ${cover.who} : ${missing.trim()}` });
  };
  return (
    <Modal onClose={onClose} title={`Clore l'absence de ${cover.who}`} subtitle={`${cover.to && cover.to !== cover.from ? `Du ${frDate(cover.from)} au ${frDate(cover.to)}` : `Le ${frDate(cover.from)}`}. Ce qui a manqué reste avec l'absence.`}
      footer={<><Button onClick={onClose}>Annuler</Button>{missing.trim() && <Button onClick={() => save(true)}>Clore et ouvrir une action</Button>}<Button kind="primary" onClick={() => save(false)}>Clore l'absence</Button></>}>
      <div className="space-y-4">
        <Field label="Ce qui a manqué (facultatif)" hint="Un accès, une consigne, un numéro : ce qui n'a pas pu servir pendant l'absence."><textarea className={`${FIELD} min-h-[88px]`} value={missing} onChange={e => setMissing(e.target.value)} /></Field>
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <strong className="text-slate-900">Au retour</strong>
          <ul className="list-disc space-y-0.5 pl-4"><li>Le titulaire reprend ses fonctions.</li><li>Les accès donnés pour l'absence sont retirés.</li>{full && <li>Si l'enveloppe a été ouverte, elle est remise sous pli et ses codes sont changés.</li>}</ul>
          {open.length > 0 && <p className="font-semibold text-red-700">{open.map(v => v.name || 'Une enveloppe').join(', ')} : ouverte, pas encore refermée.</p>}
        </div>
      </div>
    </Modal>
  );
}
