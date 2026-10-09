// Tool 3.3, view "Contrôles": the checks of all the equipment, the ones past first, then the next 12 months month by month. One tap opens the sheet on its "Contrôles" tab;
// a check that is simple (done by the company itself) is noted done today in one tap, with "Annuler".
import { Check, ChevronRight } from 'lucide-react';
import type { State } from '../../domain/types';
import { daysBetween } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { maintCfg, txt } from '../../domain/maintenance';
import { calibrationsDue, CHECK_STATE, checkState, contractFact, countsAsLate, contractState, markDone, nextDue, upcoming, type UpcomingItem } from '../../domain/maintenanceChecks';
import { Button, Card, Row, StatusBadge, SubTitle } from '../common';
import { useEqMove, useUndo } from './EqBits';
import type { EqTab } from './EqProps';
import { CONTRACT_BADGE, dueText, nameOf, plural, TOUCH } from './EqChecksTab';

const eqNameOf = (n: string) => n.trim() || 'Équipement sans nom';
// "2026-11" -> "Novembre 2026"
const monthLabel = (m: string) => { const t = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return t[0].toUpperCase() + t.slice(1); };

export function ChecksView({ state, onOpen }: { state: State; onOpen(eqId: string, tab: EqTab): void }) {
  const { bar, offer } = useUndo();
  const move = useEqMove(offer);
  const now = new Date(), today = isoDate(now), soon = maintCfg(state.params).soonDays;
  const months = upcoming(state, now), all = months.flatMap(m => m.items);
  const late = all.filter(i => countsAsLate(i.state));   // past due, or done but not in order
  const rest = months.map(m => ({ month: m.month, items: m.items.filter(i => !countsAsLate(i.state)) })).filter(m => m.items.length);
  const calibs = calibrationsDue(state, now);
  const live = Object.values(state.equipments).filter(e => !e.retiredAt);
  const ends = live.filter(e => ['soon', 'ended'].includes(contractState(e, now))).sort((a, b) => txt(a.contract!.until).localeCompare(txt(b.contract!.until)));
  const undated = live.flatMap(e => (e.tasks || []).map(c => ({ e, c }))).filter(x => checkState(x.e, x.c, now, soon) === 'nodate');
  const count = (s: string) => all.filter(i => i.state === s).length;
  const facts = [`${plural(all.length, 'contrôle daté', 'contrôles datés')} sur les 12 prochains mois`, (count('late') + count('ko')) && `${plural(count('late') + count('ko'), 'échu ou non conforme', 'échus ou non conformes')}`, count('soon') && `${count('soon')} à planifier`, count('planned') && plural(count('planned'), 'planifié'), undated.length && `${undated.length} sans date d'échéance`].filter(Boolean);

  // A simple check (done by the company itself) is noted done today at once; the one done by an outside body keeps its report: its sheet opens
  const simple = (i: UpcomingItem) => (state.equipments[i.eqId]?.tasks?.find(t => t.id === i.checkId)?.by ?? 'internal') === 'internal';
  const done = (i: UpcomingItem) => { move(i.eqId, `« ${nameOf(i)} » fait aujourd'hui`, (x, by) => markDone(x, i.checkId, { date: today, by, result: 'ok', note: '' })); };
  const line = (i: UpcomingItem) => {
    const st = CHECK_STATE[i.state], d = daysBetween(today, i.due), eq = eqNameOf(i.eqName);
    return (
      <li key={`${i.eqId}-${i.checkId}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
        <button type="button" onClick={() => onOpen(i.eqId, 'checks')} aria-label={`${nameOf(i)}, ${eq}, ${frDate(i.due)}, ${st.label}${d !== null ? `, ${dueText(d)}` : ''}${i.legal ? ', marqué obligatoire' : ''}. Ouvrir les contrôles de cet équipement`}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-slate-50 ${TOUCH}`}>
          <span className="w-[76px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{frDate(i.due)}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-900">{nameOf(i)}{i.legal && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">Obligatoire</span>}</span>
            <span className="line-clamp-2 block text-[11px] text-slate-500">{eq}{d !== null ? ` · ${dueText(d)}` : ''}</span>
          </span>
          <StatusBadge level={st.tone} text={st.label} />
        </button>
        {simple(i)
          ? <Button aria-label={`Fait aujourd'hui : ${nameOf(i)}, ${eq}`} onClick={() => done(i)}><Check size={14} />Fait aujourd'hui</Button>
          : <Button aria-label={`Ouvrir les contrôles : ${nameOf(i)}, ${eq}`} onClick={() => onOpen(i.eqId, 'checks')}>Ouvrir<ChevronRight size={14} aria-hidden /></Button>}   {/* a check done by an outside body keeps its report: its sheet opens, and the line says so with a button */}
      </li>
    );
  };

  if (!all.length && !calibs.length && !ends.length && !undated.length) {
    return <Card className="p-4 sm:p-6"><p className="text-xs text-slate-600">Aucun contrôle n'a de date d'échéance. Les contrôles se créent dans la fiche de chaque équipement, onglet Contrôles.</p></Card>;
  }
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-600">{facts.join(', ')}.</p>
      {late.length > 0 && (
        <Card className="space-y-1 p-3 sm:p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold text-red-800"><span aria-hidden className="h-2.5 w-2.5 rounded-full bg-red-600" />Échus : {late.length}</h3>
          <ul className="divide-y divide-slate-100">{late.map(line)}</ul>
        </Card>
      )}
      {calibs.length > 0 && (
        <Card className="space-y-1 p-3 sm:p-4">
          <SubTitle>Instruments à étalonner : {calibs.length}</SubTitle>
          <ul className="divide-y divide-slate-100">
            {calibs.map(({ e, c, days }) => {
              const st = CHECK_STATE[checkState(e, c, now, soon)];
              return <Row key={`${e.id}-${c.id}`} onClick={() => onOpen(e.id, 'checks')} lead={<span className="w-[76px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{frDate(nextDue(e, c))}</span>}
                title={`${eqNameOf(e.name)} · ${nameOf(c)}`} sub={`N° d'identification : ${e.serial?.trim() || 'non renseigné'} · ${days < 0 ? dueText(days) : days === 0 ? "à étalonner aujourd'hui" : `à étalonner dans ${plural(days, 'jour')}`}`}
                badge={<StatusBadge level={st.tone} text={st.label} />} />;
            })}
          </ul>
        </Card>
      )}
      {ends.length > 0 && (
        <Card className="space-y-1 p-3 sm:p-4">
          <SubTitle>Contrats qui expirent : {ends.length}</SubTitle>
          <ul className="divide-y divide-slate-100">
            {ends.map(e => {
              const b = CONTRACT_BADGE[contractState(e, now) as 'soon' | 'ended'];
              return <Row key={e.id} onClick={() => onOpen(e.id, 'checks')} lead={<span className="w-[76px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{frDate(e.contract!.until)}</span>}
                title={eqNameOf(e.name)} sub={contractFact(e, now)} badge={<StatusBadge level={b.level} text={b.label} />} />;
            })}
          </ul>
        </Card>
      )}
      {undated.length > 0 && (
        <Card className="space-y-1 p-3 sm:p-4">
          <SubTitle>Sans date d'échéance : {undated.length}</SubTitle>
          <ul className="divide-y divide-slate-100">
            {undated.map(({ e, c }) => <Row key={`${e.id}-${c.id}`} onClick={() => onOpen(e.id, 'checks')} title={nameOf(c)} sub={`${eqNameOf(e.name)} · jamais fait, pas de première échéance`} badge={<StatusBadge level={CHECK_STATE.nodate.tone} text={CHECK_STATE.nodate.label} />} />)}
          </ul>
        </Card>
      )}
      {rest.map(m => (
        <Card key={m.month} className="space-y-1 p-3 sm:p-4">
          <h3 className="text-xs font-bold text-slate-900">{monthLabel(m.month)} <span className="font-normal text-slate-500">· {plural(m.items.length, 'contrôle')}</span></h3>
          <ul className="divide-y divide-slate-100">{m.items.map(line)}</ul>
        </Card>
      ))}
      {bar}
    </div>
  );
}
