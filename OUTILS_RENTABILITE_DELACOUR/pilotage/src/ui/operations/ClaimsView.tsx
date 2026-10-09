// Tool 3.1, tab "Réclamations": the claims of the company to its suppliers, a register that comes second to the evaluation. Every claim
// is kept in the history of its supplier; here they are followed from the finding to the answer, the credit and the closing.
import { useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import type { Debit } from '../../domain/types';
import { CLAIM_INSIGHT_KEYS, claimMotifLabel, claimSupplierName, DEBIT_STATE, debitAmount, debitState, OPEN_STATES, SEVERITY, severityOf, supplierInsights, supplierSummary } from '../../domain/suppliers';
import { formatValue } from '../../domain/numbers';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Method, Row, StatusBadge, Summary, Tile, ToolHeader } from '../common';
import type { Nav } from '../tools';
import { ClaimSettings } from './SupplierSettings';
import { SupplierTrend } from './SupplierTrend';

type Filter = 'open' | 'all' | 'closed';

export function ClaimsView({ nav, onOpen, onNew }: { nav: Nav; onOpen(d: Debit): void; onNew(): void }) {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('open');
  if (!state) return null;
  const now = new Date();
  const claims = Object.values(state.debits).sort((a, b) => (a.date < b.date ? 1 : -1));
  const sm = supplierSummary(state, now);
  const stateOf = (d: Debit) => debitState(d, now, state.params);
  const isOpen = (d: Debit) => OPEN_STATES.includes(stateOf(d));
  const shown = claims.filter(d => (filter === 'all' ? true : filter === 'open' ? isOpen(d) : !isOpen(d)));
  const insights = supplierInsights(state, now).filter(i => CLAIM_INSIGHT_KEYS.includes(i.key));
  const todo = sm.late + sm.chase + sm.contested;

  return (
    <div className="space-y-4">
      <Summary title="Les réclamations aux fournisseurs sont-elles suivies ?" insights={insights} max={3} tiles={<>
        <Tile title="Réclamations ouvertes" value={String(sm.open)} sub={sm.late ? `${sm.late} pas envoyée(s) dans les délais` : 'dans les délais'} tone={sm.late ? 'alert' : undefined} />
        <Tile title="Sans réponse ou contestées" value={String(sm.chase + sm.contested)} sub={todo ? [sm.chase && `${sm.chase} sans réponse`, sm.contested && `${sm.contested} contestée(s)`].filter(Boolean).join(', ') : 'rien en attente'} tone={sm.chase + sm.contested ? 'warn' : undefined} />
        <Tile title="Reconnues par les fournisseurs" value={sm.recognisedPct === null ? '—' : `${sm.recognisedPct} %`} sub={sm.avgResponseDays === null ? 'sur 12 mois' : `réponse en ${String(sm.avgResponseDays).replace('.', ',')} jours en moyenne`} />
        <Tile title="Récupéré sur 12 mois" value={formatValue(sm.recovered, '€')} sub={sm.claimed ? `${sm.ratePct} % de ${formatValue(sm.claimed, '€')} réclamés` : 'aucun montant réclamé'} tone={sm.recovered ? 'ok' : undefined} />
      </>} />
      {claims.length > 0 && <Card className="p-3 sm:p-4"><SupplierTrend /></Card>}
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Réclamations aux fournisseurs" text="Une réclamation par défaut constaté à la réception d'une livraison ou d'une prestation. Elle est suivie de l'envoi à la réponse, puis à la clôture. Elle reste dans l'historique du fournisseur et nourrit sa note.">
          <Button kind="primary" onClick={onNew}><Plus size={14} />Réclamer</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'Ouvertes', claims.filter(isOpen).length], ['closed', 'Closes', claims.filter(d => !isOpen(d)).length], ['all', 'Toutes', claims.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{claims.length ? 'Aucune réclamation dans cette liste.' : 'Aucune réclamation : rien d\'obligatoire, l\'évaluation des fournisseurs fonctionne sans.'}</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(d => {
              const st = stateOf(d), amount = debitAmount(d, state.params);
              return (
                <Row key={d.id} onClick={() => onOpen(d)}
                  lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{d.ref}</span>}
                  title={`${claimSupplierName(state, d)} · ${claimMotifLabel(state.params, d)}${d.defect ? ` : ${d.defect}` : ''}`}
                  sub={[`reçu le ${frDate(d.date)}`, d.bl, SEVERITY[severityOf(d)].label.toLowerCase(), d.reserveOnBl ? '' : 'sans réserve écrite'].filter(Boolean).join(' · ')}
                  right={<><span className="block font-mono font-semibold text-slate-800">{amount ? formatValue(amount, '€') : '—'}</span>{d.recovered ? `récupéré ${formatValue(d.recovered, '€')}` : d.sentAt ? `envoyée le ${frDate(d.sentAt)}` : 'à envoyer'}</>}
                  badge={<StatusBadge level={DEBIT_STATE[st].tone} text={DEBIT_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
      </Card>
      <Method rule="Une réclamation suit un défaut constaté, du jour de la réception à la clôture."
        steps={[['Le constat', "À la réception, un défaut peut être noté sur le bon de livraison ou le procès-verbal, en présence de la personne qui livre."], ["L'envoi", "La réclamation part dans les jours ouvrés prévus, avec photos, et reste suivie jusqu'à la réponse."], ['La vérification', "Quand le fournisseur promet une action, elle est vérifiée à la livraison suivante, puis la réclamation est close."]]}
        tips={['Un même défaut trois fois (seuil réglable) est signalé comme défaut répété.', "Les heures passées à reprendre en interne le travail d'un fournisseur peuvent être imputées à la réclamation."]} />
      <ClaimSettings nav={nav} />
    </div>
  );
}
