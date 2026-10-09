// Yearly review of tool 1.4: every sheet in turn, the oldest first; "nothing to change" in one click, or open the sheet to change it.
import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { canEditProcess, flowsOf, personGone, personName, processIssues, readOnlyReason, reviewAge, reviewBlockers, reviewMonths, reviewOld, reviewProcess, sortedProcesses, plainName } from '../../domain/cartography';
import { frDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips } from '../common';
import type { Nav } from '../tools';
import { CodeBadge, ColHead, colStyle, ROW } from './MapBits';

const COLS = '20rem minmax(0,1fr) 25rem';
export function MapReview({ onBack, onOpen, nav }: { onBack(): void; onOpen(id: string): void; nav?: Nav }) {
  const { state, update, author } = useStore();
  const [all, setAll] = useState<'old' | 'all'>('old'), [said, setSaid] = useState(''), [next, setNext] = useState('');
  // after a review the focus goes to the next row (its button, or the one that opens the sheet when that one cannot be used)
  useEffect(() => {
    if (!next) return;
    const el = document.getElementById(`rev-ok-${next}`) as HTMLButtonElement | null;
    (el && !el.disabled ? el : document.getElementById(`rev-open-${next}`))?.focus(); setNext('');
  }, [next]);
  if (!state) return null;
  const now = new Date(), age = (id: string) => reviewAge(state.processes.find(p => p.id === id)!, now), months = reviewMonths(state), named = !!author.trim();
  const ps = sortedProcesses(state).sort((a, b) => (age(b.id) ?? 99999) - (age(a.id) ?? 99999)), old = ps.filter(p => reviewOld(state, p, now)), list = all === 'old' ? old : ps;
  return (
    <div className="space-y-4">
      <div className="sticky top-[88px] z-30 -mt-1 border-b border-slate-200 bg-slate-100 py-2 flex flex-wrap items-center gap-2 print:hidden"><Button onClick={onBack}><ArrowLeft size={14} />La carte</Button><h2 className="text-sm font-bold text-delacour-primary">Revue des fiches</h2></div>
      <p className="max-w-3xl text-xs text-slate-600">Chaque pilote relit sa fiche et ses logigrammes. Une fiche est à relire si elle ne l'a pas été depuis {months} mois. S'il n'y a rien à changer, un clic suffit, à condition que la fiche n'ait aucun point en rouge.</p>
      {!named && <p role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">Renseignez votre nom dans les réglages : une revue est enregistrée à votre nom.{nav && <Button onClick={() => nav.settings()}>Ouvrir les réglages</Button>}</p>}
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
      <Chips value={all} onChange={setAll} items={[['old', 'À relire', old.length], ['all', 'Toutes', ps.length]]} />
      {!list.length && <Card className="p-4 text-xs font-semibold text-emerald-900">{ps.length ? 'Toutes les fiches ont été relues à temps.' : 'Aucun processus dans la carte.'}</Card>}
      {list.length > 0 && <ColHead edge="px-[13px]" cols={COLS} labels={['Processus', 'Où en est la fiche', '']} />}
      <ul className="-mt-1 space-y-2">{list.map(p => {
        const k = list.indexOf(p), a = reviewAge(p, now), issues = processIssues(state, p, now).filter(i => i.key !== 'review'), blockers = reviewBlockers(state, p, now), can = canEditProcess(state, p, author);
        const why = !can ? readOnlyReason(state, author) : !named ? '' : blockers.length ? `Bloque la relecture : ${blockers.map(b => b.text).join(' · ')}.` : '';
        return (
          <li key={p.id}><Card className="p-3"><div style={colStyle(COLS)} className={ROW}>
            <span className="flex min-w-0 items-center gap-2"><CodeBadge p={p} /><span className="min-w-0 text-xs font-bold text-slate-900">{plainName(p.name)}</span></span>
            <span className="min-w-0">
              <span className="block text-xs text-slate-600">{a === null ? 'Jamais relue' : `Relue le ${frDate(p.reviewedAt!)}${p.reviewedBy ? ` par ${p.reviewedBy}` : ''}`} · {personGone(state, p.pilotId) ? <span className="font-semibold text-red-800">pilote parti : {personName(state, p.pilotId)}</span> : `pilote : ${personName(state, p.pilotId) || 'aucun'}`} · {plural(flowsOf(state, p.id).length, 'logigramme')}</span>
              {issues.length > 0 && <span className="block text-xs">{issues.map((i, k) => <span key={i.key} className={i.tone === 'bad' ? 'font-semibold text-red-800' : 'text-amber-900'}>{k ? ' · ' : ''}{i.text}</span>)}</span>}
              {why && <span className="mt-0.5 block text-xs font-semibold text-slate-700">{why}</span>}
            </span>
            <span className="flex flex-wrap items-center justify-end gap-2"><Button id={`rev-open-${p.id}`} onClick={() => onOpen(p.id)}>Ouvrir la fiche</Button>
            <Button id={`rev-ok-${p.id}`} kind="primary" disabled={!!why || !named} onClick={() => { update(d => { const x = d.processes.find(q => q.id === p.id); if (x) reviewProcess(x, author.trim(), 'Rien à changer', now); }); setSaid(`Relue : ${p.id}`); setNext((list[k + 1] ?? list[k - 1])?.id || ''); }}><Check size={14} />Marquer comme relue, rien à changer</Button></span>
          </div></Card></li>
        );
      })}</ul>
    </div>
  );
}
