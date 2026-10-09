// A sheet in the register: a card with its picture, its version in the colour of its frame, how complete it is, what is left to do, who is allowed;
// or a line of the list. Quick buttons open it full screen or print it.
import { ImageOff, Monitor, Printer } from 'lucide-react';
import type { Sop, State } from '../../domain/types';
import { completeness, coverPhoto, habilitated, photoCount, sopChecklist, sopCfg, sopPhase, sopStatus, type SopTodo } from '../../domain/instructions';
import { frDate } from '../../domain/periods';
import { Row, StatusBadge } from '../common';
import { Avatars, Ring, VersionPill } from './SopBits';
import { Pic } from '../../photo/Pic';

interface Props { s: Sop; state: State; todos: SopTodo[]; now: Date; onOpen(): void; onStation(): void; onPrint(): void }

export function SopCard({ s, state, todos, now, onOpen, onStation, onPrint }: Props) {
  const st = sopStatus(state, s, now, todos), people = habilitated(state, s), min = sopCfg(state.params).minPeople, photo = coverPhoto(s);
  const pct = completeness(sopChecklist(state, s)), archived = sopPhase(s) === 'archived';
  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md ${st.level === 'alert' ? 'border-red-300' : st.level === 'warn' ? 'border-amber-300' : 'border-slate-200'} ${archived ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onOpen} className="flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold" aria-label={`Ouvrir l'instruction du poste ${s.poste || 'à nommer'}`}>
        <div className="relative aspect-[16/10] bg-slate-100">
          {photo ? <Pic value={photo} alt="" size="t" className="h-full w-full" /> : <div className="flex h-full flex-col items-center justify-center gap-1 text-[11px] text-slate-400"><ImageOff size={22} />Pas encore de photo</div>}
          <span className="absolute left-2 top-2"><VersionPill sop={s} /></span>
          <span className="absolute right-2 top-2"><Ring pct={pct} size={38} /></span>
        </div>
        <div className="space-y-1.5 p-3">
          <div className="line-clamp-1 text-xs font-bold text-slate-900">{s.poste || 'Poste à nommer'}</div>
          <div className="line-clamp-1 text-[11px] text-slate-500">{s.operation || 'Opération à décrire'}</div>
          <div className="flex flex-wrap items-center gap-1.5"><StatusBadge level={st.level} text={st.label} />{s.group && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{s.group}</span>}</div>
          <div className="line-clamp-2 min-h-[2rem] text-[11px] text-slate-600">
            {st.todos.length ? <>{st.todos[0].text}{st.todos.length > 1 ? ` · ${st.todos.length - 1} autre(s)` : ''}</> : `${s.steps.filter(x => x.op.trim() || x.how.trim()).length} étape(s) · ${photoCount(s)} photo(s) · du ${frDate(s.versionDate)}`}
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <span className="flex items-center gap-1.5"><Avatars names={people} /><span className={`text-[11px] font-semibold ${people.length >= min ? 'text-slate-500' : 'text-amber-800'}`}>{people.length}/{min}</span></span>
        <span className="flex gap-1">
          <button type="button" aria-label={`Plein écran : ${s.poste}`} title="Plein écran au poste" onClick={onStation} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 max-sm:p-2.5"><Monitor size={15} /></button>
          <button type="button" aria-label={`Imprimer : ${s.poste}`} title="Imprimer la fiche (A4)" onClick={onPrint} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 max-sm:p-2.5"><Printer size={15} /></button>
        </span>
      </div>
    </article>
  );
}

export function SopLine({ s, state, todos, now, onOpen }: Pick<Props, 's' | 'state' | 'todos' | 'now' | 'onOpen'>) {
  const st = sopStatus(state, s, now, todos), people = habilitated(state, s), photo = coverPhoto(s);
  return (
    <Row onClick={onOpen}
      lead={<span className="flex shrink-0 items-center gap-2">{photo ? <Pic value={photo} alt="" size="t" className="h-10 w-14 rounded" /> : <span className="flex h-10 w-14 items-center justify-center rounded bg-slate-100 text-slate-400"><ImageOff size={16} /></span>}<VersionPill sop={s} /></span>}
      title={`${s.poste || 'Poste à nommer'} · ${s.operation || 'Opération à décrire'}`}
      sub={st.todos.length ? st.todos.map(t => t.text).join(' · ') : `${s.steps.length} étape(s) · ${photoCount(s)} photo(s) · ${people.length} habilité(s)${s.group ? ` · ${s.group}` : ''}`}
      right={<><span className="block font-semibold text-slate-800">{s.owner || s.author || 'Responsable à nommer'}</span>version du {frDate(s.versionDate)}</>}
      badge={<StatusBadge level={st.level} text={st.label} />} />
  );
}
