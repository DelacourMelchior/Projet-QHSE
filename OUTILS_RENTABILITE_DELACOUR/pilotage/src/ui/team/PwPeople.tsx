// The people of the powers, seen from the person: for each one who holds a power or is a deputy, what stops if she is away for two weeks (the leave of the others is counted), and the
// leave to come that leaves a power with nobody. A tap on a person opens "Qui remplace qui ?" for her.
import type { State } from '../../domain/types';
import { addDays, daysBetween } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { futureGaps, whatIf, whoIs } from '../../domain/powers';
import { plural } from '../../domain/receptions';
import { Card, Row, StatusBadge, ToolHeader } from '../common';
import { Facts } from './PwBits';

export function PwPeople({ state, now, onAbsent, onOpen }: { state: State; now: Date; onAbsent(name: string): void; onOpen(id: string): void }) {
  const list = whatIf(state, now), gaps = futureGaps(state, now, 90), t = isoDate(now);
  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-3 sm:p-4">
        <ToolHeader title="Si une personne est absente" text={`Pour chaque personne qui détient une fonction ou en est suppléante : ce qui s'arrête si elle manque du ${frDate(t)} au ${frDate(addDays(t, 13))}, compte tenu des absences des autres.`} />
        {list.length === 0 ? <p className="py-3 text-xs text-slate-600">Aucune personne n'est encore nommée sur une fonction.</p> : (
          <ul className="divide-y divide-slate-100">
            {list.map(x => (
              <Row key={x.name} onClick={() => onAbsent(x.name)} title={x.name}
                sub={<>{[x.holds ? `titulaire de ${plural(x.holds, 'fonction')}` : '', x.deputyOf ? `suppléant de ${plural(x.deputyOf, 'fonction')}` : ''].filter(Boolean).join(' · ')}</>}
                right={<Facts who={whoIs(state, x.name, t)} phone={false} />}
                badge={x.uncovered ? <StatusBadge level="alert" text={`${plural(x.uncovered, 'fonction')} sans suppléant disponible`} />
                  : x.weak ? <StatusBadge level="warn" text={`${plural(x.weak, 'suppléant')} à remettre à niveau`} />
                    : x.lost ? <StatusBadge level="warn" text={`${plural(x.lost, 'fonction')} sans second suppléant`} /> : <StatusBadge level="ok" text="Tout est couvert" />} />
            ))}
          </ul>
        )}
      </Card>
      <Card className="space-y-2 p-3 sm:p-4">
        <ToolHeader title="Absences à venir" text="Dans les 90 jours : le titulaire est absent et aucun de ses suppléants n'est là pendant toute son absence." />
        {gaps.length === 0 ? <p className="py-3 text-xs text-slate-600">Aucune absence prévue ne laisse une fonction sans suppléant disponible.</p> : (
          <ul className="divide-y divide-slate-100">
            {gaps.map((g, i) => (
              <Row key={`${g.power.id}${i}`} onClick={() => onOpen(g.power.id)} title={g.power.power.trim() || 'Fonction à décrire'} sub={`${g.who} est absent du ${frDate(g.from)} au ${frDate(g.to)} : aucun suppléant disponible.`}
                badge={<StatusBadge level={g.from <= addDays(t, 14) ? 'alert' : 'warn'} text={g.from <= t ? 'En cours' : `Dans ${plural(daysBetween(t, g.from) ?? 0, 'jour')}`} />} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
