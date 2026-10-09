// What replacing the data takes away of the proof (restore a backup, load the example, start from zero): the signed PV, counted as facts for the question that is asked first.
// A PV is signed when the customer has signed, the paper PV is attached, or the mention absent / refused is written (`pvSigned`): one per delivery of an order, the closed ones and the one under way.
// Pure: no storage, no clock.
import type { Presentation, State } from './types';
import { frDate } from './periods';
import { lotsOf, plural, pvSigned } from './receptions';

export interface SignedPv { key: string; at: string }   // key: the order and the moment of the signature; at: that moment ('' when the data do not say)
const stampOf = (p: Presentation): string => p.reception.signedAt || p.reception.noSign?.at || p.reception.pvPhotoAt || '';

export function signedPvs(s: Pick<State, 'deliveries'> | null | undefined): SignedPv[] {
  const out: SignedPv[] = [];
  for (const d of Object.values(s?.deliveries ?? {})) {
    try {
      for (const p of [...lotsOf(d), d] as (Presentation & { id?: string })[])
        if (pvSigned(p)) { const at = stampOf(p); out.push({ key: `${d.id}|${at || p.reception.pvNo || p.id || ''}`, at }); }
    } catch { /* a record that cannot be read holds nothing that can be counted */ }
  }
  return out;
}

// The signed PV that `from` holds and `to` does not (the same order signed at the same moment is the same PV)
export function pvLost(from: Pick<State, 'deliveries'> | null | undefined, to: Pick<State, 'deliveries'> | null | undefined): SignedPv[] {
  const there = new Set(signedPvs(to).map(x => x.key));
  return signedPvs(from).filter(x => !there.has(x.key));
}

// "3 PV signés (dernier le 12/09/2026) seront perdus": the number and the day of the last one. `kept`: the data are kept elsewhere (a copy in this browser), so the PV are no longer in the data
// rather than lost.
export function lostText(from: Pick<State, 'deliveries'> | null | undefined, to: Pick<State, 'deliveries'> | null | undefined, kept = false): string {
  const lost = pvLost(from, to), n = lost.length;
  if (!n) return signedPvs(from).length ? 'Aucun PV signé ne disparaît : ceux des données actuelles se retrouvent tous après.' : 'Aucun PV signé dans les données actuelles.';
  const last = lost.map(x => x.at).filter(Boolean).sort().at(-1);
  return `${plural(n, 'PV signé', 'PV signés')}${last ? ` (dernier le ${frDate(last.slice(0, 10))})` : ''} ${n > 1 ? (kept ? 'ne seront plus dans les données' : 'seront perdus') : (kept ? 'ne sera plus dans les données' : 'sera perdu')}.`;
}
