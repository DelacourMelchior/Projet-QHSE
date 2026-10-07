// The two passes that keep the list alive. "Partir de la bibliothèque" (once, in five minutes): tick the acts that stop the company, then touch the holder and two deputies of each; the
// powers are written when the button says so. "Revue de la liste" (once a year): each power in turn, "Toujours juste" or "À modifier"; what is read is dated.
import { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Power } from '../../domain/types';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { norm } from '../../domain/instructions';
import { isoDate, frDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { depViews, formsOf, newPower, placeError, powerCfg, powerState, reviewDue, reviewHistory, reviewPower, START_POWERS, whoIs } from '../../domain/powers';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Field } from '../common';
import { FIELD, Facts, LINK, PersonField, StateBadge, TOUCH } from './PwBits';

interface Item { key: string; process: string; text: string; custom?: boolean }
interface Names { holder: string; d1: string; d2: string }

export function PwSetup({ onClose, onDone }: { onClose(): void; onDone(ids: string[]): void }) {
  const { state, update, author } = useStore();
  const cfg = state ? powerCfg(state.params) : powerCfg(undefined), have = new Set(Object.values(state?.powers || {}).map(p => norm(p.power)));
  const [items, setItems] = useState<Item[]>(() => cfg.library.map((x, i) => ({ key: `l${i}`, process: x.process, text: x.text })));
  const [on, setOn] = useState<Set<string>>(() => new Set(have.size ? [] : items.filter(x => START_POWERS.some(s => s.text === x.text)).map(x => x.key)));
  const [step, setStep] = useState<1 | 2>(1), [names, setNames] = useState<Record<string, Names>>({}), [text, setText] = useState(''), [process, setProcess] = useState('P1');
  if (!state) return null;
  const chosen = items.filter(x => on.has(x.key) && !have.has(norm(x.text))), at = (k: string): Names => names[k] || { holder: '', d1: '', d2: '' };
  const put = (k: string, x: Partial<Names>) => setNames(n => ({ ...n, [k]: { ...at(k), ...x } }));
  const toggle = (k: string) => setOn(s => { const n = new Set(s); if (!n.delete(k)) n.add(k); return n; });
  const add = () => { const t = text.trim(); if (!t) return; const key = `c${items.length}`; setItems([...items, { key, process, text: t, custom: true }]); setOn(new Set([...on, key])); setText(''); };
  const temp = (k: string, x: Item): Power => { const n = at(k); return { ...newPower(x.process, x.text), holder: n.holder, deputies: [n.d1, n.d2] }; };
  const create = () => {
    const today = isoDate(new Date()), made = chosen.map(x => { const n = at(x.key); return { ...newPower(x.process, x.text), holder: n.holder, deputies: [n.d1, n.d2] as [string, string], reviewedAt: today, reviewedBy: author || 'anonyme' }; });
    update(d => { made.forEach(p => { d.powers[p.id] = p; }); });
    onDone(made.map(p => p.id));
  };
  const grouped = PROCESS_IDS.map(p => [p, items.filter(x => x.process === p)] as const).filter(([, xs]) => xs.length);
  return (
    <div className="space-y-3">
      <button type="button" onClick={onClose} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}><ArrowLeft size={14} aria-hidden />Retour aux fonctions</button>
      {step === 1 ? (
        <Card className="space-y-4 p-3 sm:p-4">
          <div>
            <h2 className="text-sm font-bold text-delacour-primary">Quels actes arrêtent l'entreprise si personne ne peut les faire ?</h2>
            <p className="max-w-3xl text-xs text-slate-600">Un acte par processus pour commencer : payer, valider une offre, lancer l'activité, ouvrir les locaux, libérer un produit. Cocher ceux qui comptent chez vous, ajouter les vôtres ; la liste se corrige ensuite fonction par fonction.</p>
          </div>
          <div className="space-y-3">
            {grouped.map(([p, xs]) => (
              <fieldset key={p} className="space-y-0.5">
                <legend className="text-xs font-bold text-slate-900">{processLabel(p)}</legend>
                {xs.map(x => {
                  const there = have.has(norm(x.text));
                  return <label key={x.key} className={`flex items-start gap-2.5 text-xs ${there ? 'text-slate-500' : 'text-slate-800'} ${TOUCH}`}><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-delacour-primary" checked={on.has(x.key) && !there} disabled={there} onChange={() => toggle(x.key)} /><span>{x.text}{there ? ' (déjà dans la liste)' : ''}</span></label>;
                })}
              </fieldset>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <Field label="Un autre acte, dans le processus"><select className={FIELD} value={process} onChange={e => setProcess(e.target.value)}>{PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}</select></Field>
            <Field label="Son nom"><input className={FIELD} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /></Field>
            <Button onClick={add} disabled={!text.trim()}><Plus size={14} />Ajouter</Button>
          </div>
          <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-3 py-2 sm:-mx-4 sm:px-4"><Button kind="primary" disabled={!chosen.length} onClick={() => setStep(2)}>Nommer les personnes : {plural(chosen.length, 'fonction', 'fonctions')}</Button><Button onClick={onClose}>Annuler</Button></div>
        </Card>
      ) : (
        <Card className="space-y-4 p-3 sm:p-4">
          <div>
            <h2 className="text-sm font-bold text-delacour-primary">Qui tient chaque fonction, et qui le remplace ?</h2>
            <p className="max-w-3xl text-xs text-slate-600">Un titulaire et deux suppléants par fonction, choisis dans la liste du personnel ou de l'annuaire. Une place laissée vide reste dans « À faire ».</p>
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {chosen.map(x => {
              const n = at(x.key), t = temp(x.key, x);
              return (
                <li key={x.key} className="space-y-3 rounded-xl border border-slate-200 p-3">
                  <div><span className="block text-xs text-slate-600">{processLabel(x.process)}</span><strong className="block text-sm font-semibold text-slate-900">{x.text}</strong></div>
                  <PersonField strict label="Titulaire" value={n.holder} check={v => placeError(t, v, 'holder')} onCommit={v => put(x.key, { holder: v })} />
                  <PersonField strict label="Suppléant 1" value={n.d1} check={v => placeError(t, v, 0)} onCommit={v => put(x.key, { d1: v })} />
                  <PersonField strict label="Suppléant 2" value={n.d2} check={v => placeError(t, v, 1)} onCommit={v => put(x.key, { d2: v })} />
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white px-3 py-2 sm:-mx-4 sm:px-4"><Button kind="primary" onClick={create}>Créer {plural(chosen.length, 'fonction', 'fonctions')}</Button><Button onClick={() => setStep(1)}>Retour</Button></div>
        </Card>
      )}
    </div>
  );
}

// The yearly reading of the list: the powers that are due (all of them when none is), one card each
export function PwReview({ onOpen, onClose }: { onOpen(id: string): void; onClose(): void }) {
  const { state, update, author } = useStore();
  const [now] = useState(() => new Date()), [ids] = useState<string[]>(() => {
    const ps = Object.values(state?.powers || {}).filter(p => !p.archivedAt), cfg = powerCfg(state?.params), due = ps.filter(p => reviewDue(p, new Date(), cfg.reviewMonths));
    return (due.length ? due : ps).sort((a, b) => a.processId.localeCompare(b.processId) || a.power.localeCompare(b.power, 'fr')).map(p => p.id);
  });
  const [read, setRead] = useState<string[]>([]);
  if (!state) return null;
  const cfg = powerCfg(state.params), left = ids.filter(i => !read.includes(i)).length, hist = reviewHistory(state);
  return (
    <div className="space-y-3">
      <button type="button" onClick={onClose} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}><ArrowLeft size={14} aria-hidden />Retour aux fonctions</button>
      <Card className="space-y-1 p-3 sm:p-4">
        <h2 className="text-sm font-bold text-delacour-primary">Revue de la liste</h2>
        <p className="max-w-3xl text-xs text-slate-600">Chaque fonction est-il toujours juste : le bon acte, le bon titulaire, les bons suppléants ? « Toujours juste » date la relecture ; « À modifier » ouvre la fonction.</p>
        <p role="status" className="text-xs font-semibold text-slate-800">{left ? `${read.length} sur ${ids.length} relues.` : `Les ${plural(ids.length, 'fonction', 'fonctions')} sont relues.`}</p>
        {hist.length > 0 && <p className="text-xs text-slate-600">Relectures précédentes : {hist.map(h => `${frDate(h.at)}${h.by ? ` par ${h.by}` : ''} (${plural(h.count, 'fonction', 'fonctions')})`).join(' · ')}.</p>}
      </Card>
      <ul className="grid gap-3 lg:grid-cols-2">
        {ids.map(id => {
          const p = state.powers[id];
          if (!p) return null;
          const deps = depViews(p, state, now, cfg), f = formsOf(p, cfg), done = read.includes(id), st = powerState(p, now, state, cfg);
          return (
            <li key={id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="block text-slate-600">{processLabel(p.processId)}</span><strong className="block text-sm font-semibold text-slate-900">{p.power.trim() || 'Fonction à décrire'}</strong></div><StateBadge st={st} /></div>
              <div className="space-y-1 text-slate-700">
                <div><strong className="text-slate-900">Titulaire : </strong>{p.holder.trim() || 'à désigner'}<Facts who={whoIs(state, p.holder, isoDate(now))} /></div>
                <div><strong className="text-slate-900">Suppléants : </strong>{deps.length ? deps.map(d => d.name).join(', ') : 'aucun'}</div>
                {f.missing.length > 0 && <div className="text-amber-800">Formalités manquantes : {f.missing.join(', ')}.</div>}
                <div className="text-slate-600">{p.reviewedAt ? `Relu le ${frDate(p.reviewedAt)}${p.reviewedBy ? ` par ${p.reviewedBy}` : ''}.` : 'Jamais relu.'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {done ? <span className="font-semibold text-emerald-800">Relu aujourd'hui</span> : <Button kind="primary" className="!py-1" onClick={() => { update(d => { if (d.powers[id]) d.powers[id] = reviewPower(d.powers[id], author || 'anonyme'); }); setRead([...read, id]); }}>Toujours juste</Button>}
                <Button className="!py-1" onClick={() => onOpen(id)}>À modifier</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3"><Button kind={left ? 'secondary' : 'primary'} onClick={onClose}>{left ? 'Terminer plus tard' : 'Terminer'}</Button>{left > 0 && <button type="button" className={LINK} onClick={() => { update(d => { ids.filter(i => !read.includes(i)).forEach(i => { if (d.powers[i]) d.powers[i] = reviewPower(d.powers[i], author || 'anonyme'); }); }); setRead(ids); }}>Marquer les {left} derniers comme relus</button>}</div>
    </div>
  );
}
