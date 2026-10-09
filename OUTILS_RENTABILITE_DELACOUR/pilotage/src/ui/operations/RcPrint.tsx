// The documents of an order of tool 3.4 that the browser prints (usePrintOne), A4 portrait, alone on the page. Nothing about money on them. Facts, black and white readable.
// - `TravellerPrint`, the follow-up sheet: one page for 4 to 6 milestones, two QR codes (the checks `jalon:`, the reception at the customer's `reception:`, as big as their address
//   asks), the place and the person to call at the delivery, the instruction at the top; each milestone has its boxes to tick (6 mm), the point and the requirement, its reference
//   photo when it has one, a line for the value read, a box for the initials ("Visa") and a column "Remarque" for the gap seen; the name, the date and the hour of a check are the
//   ones the application writes when it is entered (said at the bottom); then the checks before departure and the release. No smaller than 9 pt.
// - `ProofPrint`, the file of proof of the whole order: its header, the seal of each delivery with its state, one PV per delivery (the closed ones of `lots`, then the one under way),
//   the journal (the lines of proof marked), the defects of 5.1 with their decision. Every page says what it is on top ("PV · order · customer") and its number in the margin.
// No smaller than 8.5 pt anywhere.
import type { ReactNode } from 'react';
import type { Delivery, Nc, Reception, State } from '../../domain/types';
import { DELIVERY_STATE, deliveryState, lotsOf, noSignWords, presentationNo, promisedOn, qtyReceived, remainingQty, reservesOf, shipChecksOf, shortSeal } from '../../domain/receptions';
import { NO_CLIENT, NO_ORDER, atFr, deliveredAt, deliveryAt, orderTitle, resultText, sealView } from '../../domain/receptionsPdf';
import { causeLabel, decisionLabel } from '../../domain/quality';
import { coordsOf } from '../../domain/docPdf';
import { frDate } from '../../domain/periods';
import { nowLocal } from '../../domain/base';
import { Pic } from '../../photo/Pic';
import { Qr } from '../Qr';
import { boundsText } from './rcShared';
import { cap, isLocalAddress, rcJalonUrl, rcReceptionUrl } from './RcBits';
import { PAGE_NO, Paged, PvPrint } from './RcPv';

export const RC_PAGE = 'A4 portrait';
const GREEN = '#1B4D3E';

// A box to tick on paper (6 mm, as big as a gloved finger asks); an "X" when it was ticked on the screen (the copy in black and white reads the same)
const Box = ({ on = false }: { on?: boolean }) => <span aria-hidden className="mr-1 inline-flex h-[6mm] w-[6mm] shrink-0 items-center justify-center border-2 border-slate-900 align-middle text-[10pt] font-black leading-none">{on ? 'X' : ''}</span>;
const Line = ({ children = '' }: { children?: string }) => <div className="mt-1.5 min-h-[7mm] border-b border-slate-500 text-[9pt]">{children}</div>;
const cell = 'border border-slate-400 p-1 align-top';
const at = <T,>(o: Record<string, T> | undefined, k?: string) => (k && o && Object.hasOwn(o, k) ? o[k] : undefined);   // an id of the data is read only when the data holds it

export function TravellerPrint({ d, state }: { d: Delivery; state: State }) {
  const company = state.settings.companyName, ships = shipChecksOf(d, state.params), no = presentationNo(d), r = d.reception;
  const facts: [string, string][] = ([
    ['Livrable', d.item], ['Quantité', d.qty != null ? String(d.qty) : ''], ['Date promise', frDate(promisedOn(state, d))], ['Lot', d.lot || ''], ['Numéro de série', d.serial || ''], ['Matière ou version', d.material || ''],
  ] as [string, string][]).filter(x => x[1].trim());
  // where the delivery goes and who to call there: the place of the reception, else the address of the customer in the directory; the person expected, else the one of the directory
  const org = at(state.orgs, d.orgId), ct = at(state.contacts, r.contactId || d.contactId);
  const place = r.place?.trim() || org?.address?.trim() || '', person = [r.name.trim() || ct?.name?.trim() || '', r.name.trim() ? r.role.trim() : ct?.role?.trim() || ''].filter(Boolean).join(', '), phone = ct?.phone?.trim() || org?.phone?.trim() || '';
  const rowH = d.milestones.length > 6 ? '17mm' : '19mm';
  return (
    <div className="text-[10pt]">
      <style>{PAGE_NO}</style>
      <div className="space-y-2 p-2" style={{ border: `4px solid ${GREEN}` }}>
        <header className="space-y-1.5 border-b-2 pb-2" style={{ borderColor: GREEN }}>
          <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9pt] font-semibold text-slate-600">{company ? `${company} · ` : ''}Fiche suiveuse de commande{no > 1 ? ` · livraison ${no}` : ''}</div>
            <h1 className="break-words text-[18pt] font-bold leading-tight" style={{ color: GREEN }}>{orderTitle(d)}</h1>
            <p className="mt-1 text-[9.5pt] leading-snug">{facts.map(([k, v]) => <span key={k} className="mr-3 inline-block"><span className="text-slate-600">{k}</span> <strong>{v}</strong></span>)}</p>
          </div>
          <div className="flex shrink-0 gap-2 text-center text-[9pt] leading-tight text-slate-700">
            <div className="flex flex-col items-center">
              <Qr text={rcJalonUrl(d.id)} size={104} fit label={`QR code des contrôles de la commande ${d.ref}`} />
              <div className="font-bold text-slate-900">Contrôles</div>
            </div>
            <div className="flex flex-col items-center">
              <Qr text={rcReceptionUrl(d.id)} size={104} fit label={`QR code de la réception chez le client de la commande ${d.ref}`} />
              <div className="font-bold text-slate-900">Réception chez le client</div>
            </div>
          </div>
          </div>
          <div className="space-y-0.5 text-[9.5pt] leading-snug">
            {(place || person) && <p className="m-0">
              {place && <span className="mr-4 inline-block"><span className="text-slate-600">Livraison à</span> <strong className="break-words">{place}</strong></span>}
              {person && <span className="inline-block"><span className="text-slate-600">Personne à contacter</span> <strong className="break-words">{person}{phone ? ` · ${phone}` : ''}</strong></span>}
            </p>}
            <p className="m-0 text-[9pt]">Un visa par jalon&#8239;; la valeur relevée et la remarque s'écrivent à la main&#8239;; la date et l'heure sont celles de la saisie dans l'application.</p>
          </div>
        </header>
        {isLocalAddress() && <p className="break-inside-avoid rounded border border-amber-500 bg-amber-50 px-2 py-1 text-[9pt]"><strong>QR d'essai&#8239;: adresse de cet ordinateur.</strong> Sans effet sur les autres téléphones avant la mise en ligne.</p>}
        <table className="w-full table-fixed border-collapse text-[9pt]">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className={`${cell} w-[4%]`}>N°</th><th className={`${cell} w-[38%]`}>Jalon, point à contrôler et exigence</th><th className={`${cell} w-[17%]`}>Résultat</th>
              <th className={`${cell} w-[13%]`}>Valeur relevée</th><th className={`${cell} w-[11%]`}>Visa</th><th className={`${cell} w-[17%]`}>Remarque, écart constaté</th>
            </tr>
          </thead>
          <tbody>
            {d.milestones.map((m, i) => { const bounds = boundsText(m, true); return (
              <tr key={m.id ?? i} className="break-inside-avoid" style={{ height: rowH }}>
                <td className={`${cell} text-[12pt] font-bold`} style={{ color: GREEN }}>{i + 1}</td>
                <td className={cell}>
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1 break-words">
                      <div className="text-[10.5pt] font-bold">{m.label}</div>
                      <div>{m.point}</div>
                      {m.requirement && <div className="font-semibold">Exigence&#8239;: {m.requirement}</div>}
                    </div>
                    {m.refPhoto && <figure className="m-0 w-[20mm] shrink-0 text-center"><Pic value={m.refPhoto} alt={`Photo de référence\u202f: ${m.label}`} fit="contain" size="t" className="h-[16mm] w-full rounded border border-slate-300 bg-slate-50" /><figcaption className="text-[9pt] leading-tight text-slate-700">Référence</figcaption></figure>}
                  </div>
                  {m.critical && <div className="mt-1 flex items-end gap-1"><span className="whitespace-nowrap">Second contrôleur&#8239;:</span><span className="min-h-[5mm] min-w-0 flex-1 break-words border-b border-slate-500">{m.second}</span></div>}
                </td>
                {m.na ? <td className={cell} colSpan={4}>Sans objet{m.naReason ? `\u202f: ${m.naReason}` : ''}</td> : <>
                  <td className={cell}><div className="whitespace-nowrap"><Box on={m.ok === true} />Conforme</div><div className="mt-1 whitespace-nowrap"><Box on={m.ok === false} />Non conforme</div></td>
                  <td className={cell}>{bounds && <div className="text-[9pt] font-semibold">Plage attendue&#8239;: {bounds}</div>}<Line>{m.measured}</Line>{m.unit && !m.measured.trim() && <div className="text-[9pt]">en {m.unit}</div>}</td>
                  <td className={cell}>{m.ok != null && <div className="break-words text-[9pt] leading-tight"><strong>{m.by}</strong><br />{atFr(m.at || m.date)}</div>}</td>
                  <td className={cell}><Line /><Line /></td>
                </>}
              </tr>
            ); })}
          </tbody>
        </table>
        <section className="break-inside-avoid">
          <h2 className="text-[10pt] font-bold" style={{ color: GREEN }}>Contrôle de départ</h2>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 p-0">
            {ships.map(c => <li key={c.id} className="list-none text-[9.5pt]"><Box on={c.ok === true} />{c.label}{c.na ? ' : sans objet' : c.ok === false ? ' : non conforme' : ''}</li>)}
          </ul>
        </section>
        <section className="break-inside-avoid text-[9pt]">
          <h2 className="text-[10pt] font-bold" style={{ color: GREEN }}>Libération avant départ</h2>
          <div className="mt-1 grid grid-cols-3 gap-3">
            {([['Libérée par', d.releasedAt ? d.releasedBy : ''], ['Date et heure', d.releasedAt ? atFr(d.releasedMoment || d.releasedAt) : ''], ['Signature', '']] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-end gap-1"><span className="whitespace-nowrap">{k}</span><span className="min-h-[7mm] min-w-0 flex-1 break-words border-b border-slate-500">{v}</span></div>
            ))}
          </div>
        </section>
        <footer className="space-y-0.5 border-t border-slate-300 pt-1 text-[9pt] text-slate-600">
          <p className="m-0">Le nom, la date et l'heure d'un contrôle sont écrits par l'application à la saisie&#8239;: le visa porte les initiales sur le papier.</p>
          <p className="m-0">Copie papier imprimée le {atFr(nowLocal())}. Les contrôles faits sur l'écran figurent dans la fiche de l'application.</p>
        </footer>
      </div>
    </div>
  );
}

// ---- the file of proof of an order: facts only, no amount
const H = ({ children }: { children: ReactNode }) => <h2 className="break-after-avoid border-b-2 pb-0.5 text-[11pt] font-bold" style={{ borderColor: GREEN, color: GREEN }}>{children}</h2>;
const NEW_PAGE = { breakBefore: 'page' } as const;
// What the customer's signature says on a delivery, in words
const signFact = (r: Reception, x: Delivery) => (r.noSign ? cap(noSignWords(r.noSign)) : x.signClient?.some(s => s.length > 1) ? `Signé le ${atFr(r.signedAt)}` : x.pvPhoto ? 'PV papier signé' : 'Non signé');

// The seal of a delivery in a cell: the last one, and what it says now
const sealCell = (x: Delivery) => {
  const { state, lines } = sealView(x), last = (x.reception.seals ?? []).at(-1);
  return state === 'none' ? lines[0].replace('Scellé SHA-256 : ', '') : <><span className="font-mono">{shortSeal(last!.hash)}</span><br /><span className={state === 'modified' ? 'font-bold text-red-800' : ''}>{state === 'intact' ? 'intact' : 'modifié depuis la signature'}</span></>;
};

export function ProofPrint({ d, state }: { d: Delivery; state: State }) {
  const p = state.params, company = state.settings.companyName, coords = coordsOf(p), views = [...lotsOf(d).map(l => deliveryAt(d, l.no)), deliveryAt(d)], total = views.length;
  const rest = remainingQty(d), st = DELIVERY_STATE[deliveryState(d, new Date(), p)].label, journal = d.journal ?? [];
  const head = `Dossier de preuve · ${d.ref.trim() || NO_ORDER} · ${d.client.trim() || NO_CLIENT}`, foot = `Dossier édité le ${atFr(nowLocal())}.`;   // on top and at the bottom of every page that is not a PV
  const facts: [string, string][] = ([
    ['Livrable', d.item], ['Quantité commandée', d.qty != null ? String(d.qty) : ''], ['Quantité reçue', String(qtyReceived(d))], ['Reste à livrer', rest != null ? String(rest) : ''],
    ['Date promise', frDate(promisedOn(state, d))], ['Lot', d.lot || ''], ['Numéro de série', d.serial || ''], ['Matière ou version', d.material || ''], ['État de la commande', st],
    ['Livraisons', String(total)], ['Archivée', d.archivedAt ? `le ${frDate(d.archivedAt)}${d.archivedNote ? `\u202f: ${d.archivedNote}` : ''}` : ''],
  ] as [string, string][]).filter(x => x[1].trim());
  // the defects of 5.1: declared from this order, or remembered on one of its milestones or reservations
  const ncs = new Map<string, Nc>();
  Object.values(state.ncs).filter(n => n.deliveryId === d.id).forEach(n => ncs.set(n.id, n));
  views.forEach(v => [...v.d.milestones.map(m => m.ncId), ...reservesOf(v.d).map(r => r.ncId)].forEach(id => { if (id && state.ncs[id]) ncs.set(id, state.ncs[id]); }));
  const origin = (n: Nc) => views.flatMap(v => [
    ...v.d.milestones.flatMap((m, i) => (m.id === n.milestoneId || m.ncId === n.id ? [`Jalon ${i + 1} «\u202f${m.label}\u202f»`] : []).map(t => (total > 1 ? `${t}, livraison ${v.no}` : t))),
    ...reservesOf(v.d).flatMap((r, i) => (r.id === n.reserveId || r.ncId === n.id ? [`Réserve ${i + 1}${r.where ? ` «\u202f${r.where}\u202f»` : ''}`] : []).map(t => (total > 1 ? `${t}, livraison ${v.no}` : t))),
  ])[0];
  return (
    <div className="text-[10pt] text-slate-900 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <Paged head={head} foot={foot}>
      <section className="space-y-3">
        <header className="space-y-1 border-b-2 pb-2" style={{ borderColor: GREEN }}>
          {(company || coords) && <div className="text-[8.5pt] font-semibold text-slate-600">{[company, coords].filter(Boolean).join(' · ')}</div>}
          <div className="text-[9pt] font-semibold text-slate-600">Dossier de preuve de la commande</div>
          <h1 className="break-words text-[18pt] font-bold leading-tight" style={{ color: GREEN }}>{orderTitle(d)}</h1>
        </header>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[10pt]">
          {facts.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-600">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
        <H>Livraisons et procès-verbaux</H>
        <table className="w-full border-collapse text-[9pt]">
          <thead><tr className="bg-slate-100 text-left"><th className={cell}>N°</th><th className={cell}>Livrée le</th><th className={cell}>Bon de livraison</th><th className={cell}>Résultat</th><th className={cell}>PV</th><th className={cell}>Signature du client</th><th className={cell}>Scellé SHA-256</th></tr></thead>
          <tbody>
            {views.map(v => <tr key={v.no} className="break-inside-avoid">
              <td className={`${cell} font-bold`}>{v.no}</td><td className={cell}>{deliveredAt(v.d) || '—'}</td><td className={cell}>{v.d.reception.bl || '—'}</td>
              <td className={cell}>{resultText(v.d)}</td><td className={`${cell} whitespace-nowrap font-mono`}>{v.d.reception.pvNo || '—'}</td><td className={cell}>{signFact(v.d.reception, v.d)}</td>
              <td className={cell}>{sealCell(v.d)}</td>
            </tr>)}
          </tbody>
        </table>
      </section>
      </Paged>
      {views.map((v, i) => <div key={v.no} style={NEW_PAGE}><PvPrint d={d} state={state} no={i < total - 1 ? v.no : undefined} /></div>)}
      <div style={NEW_PAGE}><Paged head={head} foot={foot}>
      <section className="space-y-2">
        <H>Journal de la commande</H>
        {journal.length ? (
          <table className="w-full border-collapse text-[9pt]">
            <thead><tr className="bg-slate-100 text-left"><th className={`${cell} w-[22%]`}>Date et heure</th><th className={`${cell} w-[18%]`}>Qui</th><th className={cell}>Fait</th></tr></thead>
            <tbody>{journal.map((e, i) => <tr key={i} className="break-inside-avoid"><td className={cell}>{atFr(e.at)}</td><td className={cell}>{e.by || '—'}</td><td className={`${cell} break-words`}>{e.proof ? <strong>{e.text}</strong> : e.text}</td></tr>)}</tbody>
          </table>
        ) : <p className="text-[9pt]">Aucune ligne au journal de cette commande.</p>}
      </section>
      <section className="mt-4 space-y-2">
        <H>Défauts liés (5.1)</H>
        {ncs.size ? (
          <ol className="space-y-2 p-0">
            {[...ncs.values()].sort((a, b) => a.at.localeCompare(b.at)).map(n => (
              <li key={n.id} className="break-inside-avoid list-none rounded border border-slate-400 p-2 text-[9.5pt]">
                <div className="font-bold">{n.ref} · déclaré le {atFr(n.at)}{n.by ? `, par ${n.by}` : ''}</div>
                {origin(n) && <div>Déclaré depuis&#8239;: {origin(n)}</div>}
                {n.where && <div>Lieu&#8239;: {n.where}</div>}
                <div className="break-words">{n.description}</div>
                {n.cause && <div>Cause&#8239;: {causeLabel(n.cause)}</div>}
                <div className="font-semibold">{n.decision ? `Décision\u202f: ${decisionLabel(n.decision)}, le ${atFr(n.decidedAt)}${n.decidedBy ? ` par ${n.decidedBy}` : ''}${n.decisionNote ? `\u202f: ${n.decisionNote}` : ''}` : 'Décision pas encore prise'}</div>
                {n.photo && <figure className="m-0 mt-1 w-36"><Pic value={n.photo} alt={`Photo du défaut ${n.ref}`} fit="contain" size="v" className="h-24 w-full rounded border border-slate-300 bg-slate-50" /><figcaption className="text-[8.5pt] text-slate-600">Photo du défaut</figcaption></figure>}
              </li>
            ))}
          </ol>
        ) : <p className="text-[9pt]">Aucun défaut lié à cette commande.</p>}
      </section>
      <p className="mt-3 border-t border-slate-300 pt-1 text-[8.5pt] text-slate-600">Les lignes du journal en gras sont des lignes de preuve (signature, libération, dérogation, levée, correction, scellé).</p>
      </Paged></div>
    </div>
  );
}
