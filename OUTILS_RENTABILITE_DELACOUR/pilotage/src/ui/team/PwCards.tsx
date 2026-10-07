// The register of tool 4.1: one line per vital power. Under 1024 px a card (the act and its state, then the holder and the deputies one under the other, each with his phone and the
// day he did the act), from 1024 px the matrix the paper tool is known for (the act, the holder, two deputies, the state). A deputy has his own button "A fait l'acte": the
// practice is written from here, in two taps. Nothing is written by a tap on the row: it opens the sheet.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isoDate } from '../../domain/periods';
import { processLabel } from '../../domain/base';
import { depViews, formsOf, powerCfg, powerState, waitText, wantedOf, whoIs, type DepView, type PowerCfg } from '../../domain/powers';
import type { Power, State } from '../../domain/types';
import { Button } from '../common';
import { onPhone } from '../operations/EqBits';
import { Facts, SignState, StateBadge, TOUCH } from './PwBits';

export interface PwRow { p: Power; st: ReturnType<typeof powerState>; deps: DepView[]; cfg: PowerCfg; forms: ReturnType<typeof formsOf> }
export const rowOf = (p: Power, s: State, now: Date, cfg = powerCfg(s.params)): PwRow => ({ p, st: powerState(p, now, s, cfg), deps: depViews(p, s, now, cfg), cfg, forms: formsOf(p, cfg) });

interface Acts { state: State; onOpen(p: Power, tab?: 'people'): void }
const title = (p: Power) => p.power.trim() || 'Fonction à décrire';

// The place of a deputy: his name, what is known of him and where his signature stands; "À nommer" when the place is empty
function Place({ r, slot, label, acts, stack }: { r: PwRow; slot: number; label?: string; acts: Acts; stack?: boolean }) {   // in the table (stack) the phone is left out: it is on the cards and on « Qui remplace qui ? »
  const d = r.deps.find(x => x.slot === slot), typed = slot < 2 ? r.p.deputies[slot]?.trim() : r.p.extra?.[slot - 2]?.trim();
  if (!d) {
    return (
      <div className="min-w-0 space-y-0.5">
        {label && <div className="text-slate-600">{label}</div>}
        {typed ? <><strong className="block font-semibold text-slate-900">{typed}</strong><span className="block text-amber-800">même personne qu'une autre place : elle ne compte qu'une fois</span></>
          : slot >= wantedOf(r.p) ? <span className="text-slate-400" title="Pas de suppléant attendu à cette place">—</span>
          : <button type="button" onClick={e => { e.stopPropagation(); acts.onOpen(r.p, 'people'); }} className={`font-semibold text-red-700 hover:underline ${TOUCH}`}>À nommer</button>}
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-0.5">
      {label && <div className="text-slate-600">{label}</div>}
      <strong className="block font-semibold text-slate-900">{d.name}</strong>
      <Facts who={d.who} phone={!stack} />
      <div><SignState p={r.p} who={d.name} /></div>
    </div>
  );
}
function Holder({ r, acts, label, stack }: { r: PwRow; acts: Acts; label?: string; stack?: boolean }) {
  const who = whoIs(acts.state, r.p.holder, isoDate(new Date()));
  return (
    <div className="min-w-0 space-y-0.5">
      {label && <div className="text-slate-600">{label}</div>}
      {who.name ? <><strong className="block font-semibold text-slate-900">{who.name}</strong><Facts who={who} phone={!stack} /><div><SignState p={r.p} who={who.name} /></div></>
        : <button type="button" onClick={e => { e.stopPropagation(); acts.onOpen(r.p, 'people'); }} className={`font-semibold text-red-700 hover:underline ${TOUCH}`}>À désigner</button>}
    </div>
  );
}
const extras = (r: PwRow) => r.deps.filter(d => d.slot >= 2);
// "Formalités 2 sur 3 · peut attendre : le jour même"
const foot = (r: PwRow) => [r.forms.total ? `Formalités : ${r.forms.done} sur ${r.forms.total}` : '', waitText(r.p) ? `Peut attendre : ${waitText(r.p).toLowerCase()}` : ''].filter(Boolean).join(' · ');

// On a phone a card is its title, its state and who is on it in one line; a tap opens the people, their phones and their buttons (another tap on "Ouvrir la fiche" opens the sheet)
function PwCard({ r, acts }: { r: PwRow; acts: Acts }) {
  const { p } = r, phone = onPhone(), [open, setOpen] = useState(false), full = !phone || open, shown = r.deps.filter(d => !d.who.gone).map(d => d.name);
  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => (phone ? setOpen(!open) : acts.onOpen(p))} aria-expanded={phone ? open : undefined} aria-label={phone ? `${title(p)} : ${open ? 'masquer' : 'voir'} les personnes` : `Ouvrir : ${title(p)}`}
        className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-delacour-golddark ${full ? 'rounded-t-xl' : 'rounded-xl'}`}>
        <span className="min-w-0"><span className="block text-xs text-slate-600">{processLabel(p.processId)}</span><span className="block text-sm font-semibold text-slate-900">{title(p)}</span>
          {phone && !open && <span className="mt-0.5 block text-xs text-slate-700">{p.holder.trim() || 'Titulaire à désigner'} · {shown.length ? `suppléant${shown.length > 1 ? 's' : ''} : ${shown.join(', ')}` : 'aucun suppléant'}</span>}</span>
        <span className="flex shrink-0 flex-col items-end gap-1.5"><StateBadge st={r.st} />{phone && <ChevronDown size={16} aria-hidden className={`text-slate-500 transition ${open ? 'rotate-180' : ''}`} />}</span>
      </button>
      {full && (
        <>
          <div className="divide-y divide-slate-100 border-t border-slate-100 px-3 text-xs">
            <div className="py-2"><Holder r={r} acts={acts} label="Titulaire" /></div>
            {[0, 1].filter(k => k < wantedOf(p) || !!p.deputies[k]?.trim()).map(k => <div key={k} className="py-2"><Place r={r} slot={k} label={`Suppléant ${k + 1}`} acts={acts} /></div>)}
            {wantedOf(p) === 0 && !p.deputies.some(x => x?.trim()) && !extras(r).length && <p className="py-2 text-slate-600">Pas de suppléant prévu.</p>}
            {extras(r).map((d, i) => <div key={d.slot} className="py-2"><Place r={r} slot={d.slot} label={`Autre suppléant${extras(r).length > 1 ? ` ${i + 1}` : ''}`} acts={acts} /></div>)}
          </div>
          {foot(r) && <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">{foot(r)}</p>}
          {phone && <div className="border-t border-slate-100 px-3 py-2"><Button className="!py-1" aria-label={`Ouvrir la fiche : ${title(p)}`} onClick={() => acts.onOpen(p)}>Ouvrir la fiche</Button></div>}
        </>
      )}
    </li>
  );
}

export function PwList({ rows, state, onOpen }: { rows: PwRow[] } & Acts) {
  const acts: Acts = { state, onOpen }, more = rows.some(r => extras(r).length);
  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2 lg:hidden">{rows.map(r => <PwCard key={r.p.id} r={r} acts={acts} />)}</ul>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-separate border-spacing-0 text-left text-xs">
          <caption className="sr-only">Les fonctions clés, leur titulaire, leurs suppléants et leur état</caption>
          <thead><tr className="text-slate-600">{['Fonction clé', 'Titulaire', 'Suppléant 1', 'Suppléant 2', ...(more ? ['Autres suppléants'] : []), 'État'].map(h => <th key={h} scope="col" className="border-b border-slate-200 px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.p.id} onClick={() => onOpen(r.p)} className="cursor-pointer align-top hover:bg-slate-50">
                <td className="w-[28%] min-w-[200px] border-b border-slate-100 px-2 py-2.5">
                  <button type="button" onClick={e => { e.stopPropagation(); onOpen(r.p); }} title={processLabel(r.p.processId)} className="block text-left text-sm font-semibold leading-snug text-slate-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark">{title(r.p)}</button>
                  <span className="mt-0.5 block text-slate-500">{r.p.processId}</span>
                </td>
                <td className="border-b border-slate-100 px-2 py-2.5"><Holder r={r} acts={acts} stack /></td>
                <td className="border-b border-slate-100 px-2 py-2.5"><Place r={r} slot={0} acts={acts} stack /></td>
                <td className="border-b border-slate-100 px-2 py-2.5"><Place r={r} slot={1} acts={acts} stack /></td>
                {more && <td className="border-b border-slate-100 px-2 py-2.5"><div className="space-y-2">{extras(r).map(d => <Place key={d.slot} r={r} slot={d.slot} acts={acts} stack />)}</div></td>}
                <td className="border-b border-slate-100 px-2 py-2.5"><StateBadge st={r.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

