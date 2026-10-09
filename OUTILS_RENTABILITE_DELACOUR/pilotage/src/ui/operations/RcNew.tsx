// Starting an order in three taps: the customer (suggestions from the directory 1.3 and from the customers already known), the deliverable, then the model of milestones in one
// list (the first one is chosen; "Autre, précisez" starts with a single blank milestone and the name of the model, as typed). The rest (number, quantity, promised day, people) is completed in the sheet.
// From a won quote the customer, the deliverable and the promised day are taken from it.
import { useState } from 'react';
import type { Delivery, MilestoneTemplate, State } from '../../domain/types';
import { nb } from '../../domain/base';
import { orgKey, orgOf } from '../../domain/contacts';
import { deliveryFromQuote, deliveryFromTemplate, OTHER, plural, templatesOf } from '../../domain/receptions';
import { Button, Field, inputCls, Modal } from '../common';
import { clientsOf } from '../commercial/Devis';
import { TOUCH16, rcDay } from './RcBits';

const FIELD = `${inputCls} ${TOUCH16}`;
const OTHER_TPL: MilestoneTemplate = { name: OTHER, milestones: [{ label: '', point: '', requirement: '' }] };
const CHIP = 'rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';

export function RcNew({ onClose, onCreate, state, quoteId }: { onClose(): void; onCreate(d: Delivery): void; state: State; quoteId?: string }) {
  const tpls = templatesOf(state.params), q = quoteId && Object.hasOwn(state.quotes, quoteId) ? state.quotes[quoteId] : undefined, from = q ? deliveryFromQuote(state, q.id, state.params) : undefined;
  const [tpl, setTpl] = useState(0), [spec, setSpec] = useState(''), [client, setClient] = useState(q?.client ?? ''), [item, setItem] = useState(q?.object ?? '');
  const key = orgKey(client), org = client.trim() ? orgOf(state, client) : undefined;
  // the customers that contain what is typed (all of them while nothing is typed), the one already typed left out
  const sugg = clientsOf(state).filter(c => orgKey(c) !== key && orgKey(c).includes(key)).slice(0, 6);
  const create = () => {
    const m = tpl === tpls.length ? OTHER_TPL : tpls[tpl] ?? tpls[0], t = deliveryFromTemplate({ ...m, shipChecks: m.shipChecks?.filter(c => c.trim()) });   // a check left blank in the settings is not created
    onCreate({ ...t, ...(m === OTHER_TPL && spec.trim() ? { template: spec.trim() } : {}), client: client.trim(), item: item.trim(), ...(org ? { orgId: org.id } : {}), ...(from?.quoteId ? { quoteId: from.quoteId } : {}), ...(from?.promisedAt ? { promisedAt: from.promisedAt } : {}) });
  };
  const enter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') create(); };
  return (
    <Modal onClose={onClose} title={q ? `Nouvelle commande depuis le devis ${q.ref}` : 'Nouvelle commande'}
      subtitle={q ? `Client, livrable${from?.promisedAt ? ' et date de livraison promise' : ''} repris du devis.` : 'Un client, un livrable, un modèle de jalons\u202f: le reste se complète ensuite dans la fiche.'}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" onClick={create}>Créer la commande</Button></>}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Field label="Client" hint={client.trim() ? (org ? `Dans l'annuaire\u202f: ${org.name}` : "Pas encore dans l'annuaire") : undefined}>
            <input className={FIELD} value={client} onChange={e => setClient(e.target.value)} onKeyDown={enter} autoComplete="off" />
          </Field>
          {sugg.length > 0 && <div className="flex flex-wrap gap-1.5" role="group" aria-label="Clients connus">{sugg.map(c => <button key={c} type="button" className={CHIP} onClick={() => setClient(c)}>{c}</button>)}</div>}
        </div>
        <Field label="Livrable" hint={from?.promisedAt ? `Livraison promise le ${rcDay(from.promisedAt)}, reprise du devis` : undefined}>
          <input className={FIELD} value={item} onChange={e => setItem(e.target.value)} onKeyDown={enter} autoComplete="off" />
        </Field>
        <Field label="Modèle de jalons" hint={tpl === tpls.length ? 'Un seul jalon vide, précisé ensuite dans la fiche.' : nb(`${plural(tpls[tpl].milestones.length, 'jalon')}\u202f: ${tpls[tpl].milestones.map(m => m.label).join(' · ')}`)}>
          <select className={FIELD} value={tpl} onChange={e => setTpl(+e.target.value)}>
            {tpls.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}
            <option value={tpls.length}>Autre, précisez</option>
          </select>
        </Field>
        {tpl === tpls.length && <Field label="Précisez le modèle"><input className={FIELD} value={spec} onChange={e => setSpec(e.target.value)} onKeyDown={enter} autoComplete="off" /></Field>}
      </div>
    </Modal>
  );
}
