// The acceptance report (PV) of a delivery of tool 3.4: `PvView` reads it on the screen of a phone (375 px, no horizontal scroll) and `PvPrint` is the A4 page the browser
// prints (usePrintOne) with the photos drawn and the signatures redrawn from their strokes. The same sentences as the PDF (receptionsPdf.ts). Facts only: no amount, nothing
// about invoicing. A status is a written label as well as a colour, so that the black and white copy reads the same. Nothing is said that the tool does not know (no legal word):
// the seal of the content (SHA-256) is told with its state, the names are "typed, not verified", the hours are the device's, what was lifted after the signature is told apart.
// On paper (`PvPrint`) the PV is the one handed to the customer: no note meant for the company (they are in a band of the screen, never printed), the clause of retention only for a
// reception with reservations, every page carries "PV · order · customer" on top and "Édité le …" at the bottom (`Paged`), "page n sur N" in the margin, the signatures stay together
// with the seal, and a PV not signed yet is printed with empty boxes to sign ("À signer") and the boxes of the result to tick.
import { Fragment, type ReactNode } from 'react';
import { FileDown, Lock, Printer, ShieldAlert } from 'lucide-react';
import type { Delivery, Level, State, Strokes } from '../../domain/types';
import { de, isLocked, milestoneStatus, noSignWords, pvSigned, reserveDue, reservesOf, type MilestoneStatus } from '../../domain/receptions';
import {
  pvPdf, CLAUSE_NOTE, CLIENT_TITLE, LOCK_NOTE, NO_NAME, SEAL_NOTE, SEVERITY_LABEL, SIGNER_NOTE, UNLOCKED_NOTE, atFr, clauseLine, clientSignAt, clientSigner, clockText, companySigner, corrections, deliveryAt, editedAt,
  instrumentName, liftLine, liftsAfterSign, milestoneFacts, msLabel, noSignText, orderRows, orderTitle, postponed, pvHead, pvPhotoText, refusalLines, releaseLines, reserveName, reserveText, resultText, retentionText, sealView,
  shipChecksDone, shipLabel, valueText,
} from '../../domain/receptionsPdf';
import { coordsOf } from '../../domain/docPdf';
import { frDate } from '../../domain/periods';
import { Pic } from '../../photo/Pic';
import { Button, StatusBadge } from '../common';
import { cap } from './RcBits';
import { downloadFile, fileSlug } from '../download';
import { usePrintOne } from '../PrintOne';

interface PvProps { d: Delivery; state: State; no?: number }   // `no`: a closed delivery of the order (its number), the one under way when absent

const MS_TONE: Record<MilestoneStatus, Level> = { todo: 'pending', ok: 'ok', reworked: 'warn', ko: 'alert', na: 'pending' };
const small = 'text-xs text-slate-600 print:text-[0.85em]';   // 12 px on the screen; on paper the size of the page text

// ---- what every printed page carries
// "page n sur N" in the bottom margin (Chrome 131 and later; the other browsers print the pages without the number)
export const PAGE_NO = '@page { @bottom-right { content: "page " counter(page) " sur " counter(pages); font: 9pt ui-sans-serif, system-ui, Helvetica, Arial, sans-serif; color: #475569; vertical-align: middle; } }';
// A document printed page by page: a table, so that the browser repeats its head (what the page is) and its foot (the date and hour of the copy) on every sheet
export function Paged({ head, foot, children }: { head: string; foot: string; children: ReactNode }) {
  return (
    <>
      <style>{PAGE_NO}</style>
      <table className="w-full table-fixed border-collapse">
        <thead><tr><td className="break-words border-b border-slate-300 pb-1 text-[9pt] font-semibold text-slate-700">{head}</td></tr></thead>
        <tbody><tr><td className="pt-2">{children}</td></tr></tbody>
        <tfoot><tr><td className="pt-2 text-[9pt] text-slate-600">{foot}</td></tr></tfoot>
      </table>
    </>
  );
}

// A signature drawn with the finger (the box of 300 x 100 of the pad), redrawn from its strokes; nothing when there is none
function Sig({ strokes, label, className = '' }: { strokes?: Strokes; label: string; className?: string }) {
  const ink = (strokes || []).filter(s => s.length > 1);
  if (!ink.length) return null;
  return (
    <svg viewBox="0 0 300 100" role="img" aria-label={label} className={className}>
      {ink.map((s, i) => <polyline key={i} points={s.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}
// a signature is drawn (the name of the signer is then written, or said missing)
const inkedBy = (s?: Strokes) => !!s?.some(x => x.length > 1);

// A photo of the PV. On paper 38 mm wide, and 80 mm wide for the finding of a reservation and the refusal (`wide`: the proof of the PV); never cropped, the height follows the picture.
// The thumbnail (160 px on the screen, 38 mm on paper) reads the small copy of 480 px (340 dpi at 36 mm); the proof photo, 80 mm wide, keeps the one of 1 600 px
const Fig = ({ v, label, wide = false }: { v: string; label: string; wide?: boolean }) => (
  <figure className={`m-0 w-40 max-w-full ${wide ? 'print:w-[80mm]' : 'print:w-[38mm]'}`}>
    <Pic value={v} alt={label} fit="contain" size={wide ? 'v' : 't'} className={`h-28 w-full rounded border border-slate-200 bg-slate-50 print:h-auto print:min-h-[16mm] ${wide ? 'print:max-h-[90mm]' : 'print:max-h-[50mm]'}`} />
    <figcaption className={small}>{label}</figcaption>
  </figure>
);
const Figs = ({ items, side = false }: { items: [string | undefined, string, boolean?][]; side?: boolean }) => {
  const shown = items.filter((x): x is [string, string, boolean?] => !!x[0]);
  return shown.length ? <div className={`mt-1 flex flex-wrap gap-2 ${side ? 'print:mt-0 print:shrink-0 print:flex-nowrap' : ''}`}>{shown.map(([v, l, w], i) => <Fig key={i} v={v} label={l} wide={w} />)}</div> : null;
};
// On paper the text and its photos are side by side (the photo on the right), on the screen the photos are under the text
const Beside = ({ children, figs }: { children: ReactNode; figs: ReactNode }) => <div className="print:flex print:items-start print:justify-between print:gap-3"><div className="min-w-0 flex-1">{children}</div>{figs}</div>;
// The title of the document is the only h1 of a printed page; on the screen the PV sits under the title of its dialog or of its step (one h1 only), so its own title and sections go one level down
type Head = 'h1' | 'h2' | 'h3';
const Sec = ({ title, children, className = '', h: H = 'h2' }: { title: string; children: ReactNode; className?: string; h?: Head }) => (
  <section className={`space-y-1.5 ${className}`}>
    <H className="break-after-avoid border-b-2 border-delacour-primary pb-0.5 text-[0.9em] font-bold text-delacour-dark">{title}</H>
    {children}
  </section>
);
const Block = ({ children }: { children: ReactNode }) => <li className="break-inside-avoid list-none rounded-lg border border-slate-300 p-2">{children}</li>;
// A box to tick by hand (6 mm) and a line to write on (7 mm high)
const Tick = () => <span aria-hidden className="mr-2 inline-block h-[6mm] w-[6mm] shrink-0 border-2 border-slate-900 align-middle" />;
const Rule = ({ k, children = '' }: { k: string; children?: ReactNode }) => (
  <div className="mt-1 flex items-end gap-1.5"><span className="whitespace-nowrap">{k}</span><span className="min-h-[7mm] min-w-0 flex-1 break-words border-b border-slate-500 font-medium">{children}</span></div>
);
// The result of a reception not chosen yet, on a PV to sign: three boxes to tick (the words of the PDF)
const RESULT_BOXES = ['Réception prononcée sans réserve', 'Réception prononcée avec réserve\u202f: ', 'Réception refusée. Motif\u202f: '];

function PvDoc({ d: d0, state, no, print = false }: PvProps & { print?: boolean }) {
  const { d, no: n, total } = deliveryAt(d0, no), p = state.params, r = d.reception, rs = reservesOf(d), ships = shipChecksDone(d);
  const company = state.settings.companyName, coords = print ? coordsOf(p) : '', fixes = n === total ? corrections(d) : [], res = resultText(d);
  const clause = clauseLine(d, p);   // the clause of the contract concerns a reception with reservations, nothing else ('' otherwise)
  const seal = sealView(d), lifts = liftsAfterSign(d), late = new Set(lifts.map(e => e.x.id)), inst = instrumentName(state.equipments), clientAt = clientSignAt(d);
  const Title: Head = print ? 'h1' : 'h2', Sub: Head = print ? 'h2' : 'h3';
  const toTick = print && !r.result;   // a PV to sign, the result not chosen yet: the boxes to tick
  const tone = r.noSign && (r.result === 'sans' || r.result === 'reserve') && !postponed(d) ? 'border-slate-500 bg-slate-50 text-slate-900' : r.result === 'sans' ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : r.result === 'refus' || postponed(d) ? 'border-red-700 bg-red-50 text-red-900' : r.result === 'reserve' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-400 bg-slate-50 text-slate-800';
  const rows = orderRows(d, { no: n, total }).filter(x => x[1].trim());   // the same lines as the file (receptionsPdf.ts), the empty ones left out
  // `dated`: the date is told elsewhere (the witness line of a customer who did not sign), so the box does not say it is missing; `miss`: what stands in the place of the drawing.
  // On paper a box with nothing in it is a box to sign: name and date to write, the place of the signature, "À signer".
  const sign = (title: string, name: string, at: string | undefined, strokes: Strokes | undefined, miss?: string, dated = false) => (
    <div className="break-inside-avoid rounded-lg border border-slate-300 p-2">
      <div className="text-[0.9em] font-bold">{title}</div>
      {print && !inkedBy(strokes) && !miss ? (
        <>
          <Rule k="Nom">{name}</Rule>
          <Rule k="Date et heure">{at ? atFr(at) : ''}</Rule>
          <div className="relative mt-1.5 flex h-24 items-center justify-center rounded border border-dashed border-slate-400 text-slate-600"><span className="absolute left-1.5 top-0.5">Signature</span>À signer</div>
        </>
      ) : (
        <>
          <div className="break-words">{name || '—'}</div>
          {(at || !dated) && <div className={small}>{at ? `Le ${atFr(at)}` : 'Date et heure non renseignées'}</div>}
          {inkedBy(strokes) ? <Sig strokes={strokes} label={`Signature\u202f: ${name || title}`} className="mt-1 h-24 w-full max-w-[300px] rounded border border-slate-200" /> : <div className="mt-1 flex h-24 items-center justify-center rounded border border-dashed border-slate-400 px-2 text-center text-slate-600">{miss || 'Pas de signature'}</div>}
        </>
      )}
    </div>
  );
  return (
    <article className={`space-y-4 text-sm text-slate-900 [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:space-y-3 print:text-[10pt] print:[&_.rounded-full]:text-[9pt] ${print ? '' : 'mx-auto w-full max-w-2xl'}`}>
      <header className="space-y-2 border-b-2 border-delacour-primary pb-2">
        {(company || coords) && <div className={`${small} font-semibold`}>{[company, coords].filter(Boolean).join(' · ')}</div>}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <div className="text-[0.85em] font-semibold text-slate-600">Procès-verbal de réception</div>
            <Title className="break-words text-[1.35em] font-bold leading-tight text-delacour-dark">{orderTitle(d)}</Title>
          </div>
          <div className="text-right">
            {r.pvNo && <div className="whitespace-nowrap font-mono text-[1.1em] font-bold">{r.pvNo}</div>}
            {total > 1 && <div className={small}>Livraison {n} sur {total}</div>}
          </div>
        </div>
        <div className={`rounded-lg border-2 px-3 py-2 font-bold ${tone}`}>{res}</div>
        {seal.state === 'modified' && <div role="alert" className="flex items-start gap-1.5 rounded-lg border-2 border-red-700 bg-red-50 px-3 py-2 font-bold text-red-900"><ShieldAlert size={16} aria-hidden className="mt-0.5 shrink-0" /><span>{seal.lines.at(-1)}</span></div>}
      </header>

      <Sec h={Sub} title="Commande et livraison">
        <Beside figs={<Figs side items={(r.photos || []).map((v, i) => [v, `État à la livraison ${i + 1}`])} />}>
          <dl className="grid grid-cols-[minmax(6rem,38%)_minmax(0,1fr)] gap-x-3 gap-y-1">
            {rows.map(([k, v]) => <Fragment key={k}><dt className="text-slate-600">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd></Fragment>)}
          </dl>
        </Beside>
      </Sec>

      {d.milestones.length > 0 && (
        <Sec h={Sub} title="Autocontrôle aux jalons">
          <ol className="space-y-2 p-0 print:space-y-1.5">
            {d.milestones.map((m, i) => (
              <Block key={m.id ?? i}>
                <Beside figs={<Figs side items={[[m.photo, `Contrôle · jalon ${i + 1}`], [m.gapPhoto, `Écart constaté · jalon ${i + 1}`]]} />}>
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                    <div className="min-w-0 break-words font-semibold">{i + 1}. {m.label}</div>
                    <StatusBadge level={MS_TONE[milestoneStatus(m)]} text={msLabel(m)} />
                  </div>
                  <div className="break-words">{m.point}{m.requirement && <> · Exigence&#8239;: {m.requirement}</>}</div>
                  {valueText(m) && <div>Valeur relevée&#8239;: <span className="font-mono font-semibold">{valueText(m)}</span></div>}
                  {m.ok != null && <div className={small}>{m.by}, le {atFr(m.at || m.date)}</div>}
                  {milestoneFacts(m, inst).map((f, j) => <div key={j} className={`${small} break-words`}>{f}</div>)}
                </Beside>
              </Block>
            ))}
          </ol>
        </Sec>
      )}

      {ships.length > 0 && (
        <Sec h={Sub} title="Contrôle de départ" className="break-inside-avoid">
          <ul className="space-y-1.5 p-0 print:space-y-1">{ships.map(c => <li key={c.id} className="list-none break-inside-avoid print:flex print:flex-wrap print:items-baseline print:gap-x-3"><div className="break-words">{c.label}</div><div className="font-semibold">{shipLabel(c)}{c.ok != null && <span className={`${small} font-normal`}> · {c.by}, le {atFr(c.at)}</span>}</div></li>)}</ul>
        </Sec>
      )}

      <Sec h={Sub} title="Libération avant départ" className="break-inside-avoid">
        {releaseLines(d, p).map((l, i) => <p key={i} className="m-0 break-words">{l}</p>)}
        <Sig strokes={d.releaseSign} label={`Signature ${de(d.releasedBy)}`} className="h-16 w-48 max-w-full rounded border border-slate-200" />
      </Sec>

      {(rs.length > 0 || r.refusal || clause || toTick) && <Sec h={Sub} title="Résultat de la réception">
        {toTick && <ul className="m-0 space-y-2 p-0">{RESULT_BOXES.map(t => <li key={t} className="list-none break-inside-avoid"><Tick />{t}{t.endsWith(': ') && <span className="inline-block w-[85mm] max-w-full border-b border-slate-500 align-bottom">&nbsp;</span>}</li>)}</ul>}
        {rs.length > 0 && (
          <ol className="space-y-2 p-0">
            {rs.map((x, i) => { const lifted = !!x.liftedAt && !late.has(x.id); return (   // a lift made after the signature is told in its own block, the list reads as signed
              <Block key={x.id}>
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <div className="min-w-0 break-words font-semibold">{reserveName(x, i)}</div>
                  <StatusBadge level={lifted ? 'ok' : x.severity === 'blocking' ? 'alert' : 'warn'} text={lifted ? 'Levée' : late.has(x.id) ? 'Non levée à la signature' : 'Non levée'} />
                </div>
                <div className="break-words">{reserveText(x, true)}</div>
                <div className={small}>Gravité&#8239;: {SEVERITY_LABEL[x.severity ?? 'minor']} · {lifted ? `levée le ${frDate(x.liftedAt!)}${x.liftedBy ? `, enregistrée par ${x.liftedBy}` : ''}` : `à lever avant le ${frDate(reserveDue(x, d, p))}`}</div>
                {x.repairedAt && <div className={small}>Reprise faite le {frDate(x.repairedAt)}{x.handler ? `, par ${x.handler}` : ''}</div>}
                {lifted && x.liftNote && <div className={`${small} break-words`}>{x.liftNote}</div>}
                <Figs items={[[x.photo, `Constat · réserve ${i + 1}`, true], [x.repairPhoto, `Reprise · réserve ${i + 1}`], ...(lifted ? [[x.liftPhoto, `Levée · réserve ${i + 1}`] as [string | undefined, string]] : [])]} />
                {lifted && <Sig strokes={x.liftSign} label="Signature de levée" className="mt-1 h-14 w-44 max-w-full rounded border border-slate-200" />}
              </Block>
            ); })}
          </ol>
        )}
        {refusalLines(d).map((l, i) => <p key={i} className="m-0 break-words">{l}</p>)}
        <Figs items={[[r.refusal?.photo, 'Constat du refus', true]]} />
        {clause && <p className="m-0 break-words">{clause}</p>}
      </Sec>}

      <Sec h={Sub} title="Signatures" className="break-inside-avoid">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 print:grid-cols-2">
          {sign(`Pour ${company || "l'entreprise"} (qui remet)`, companySigner(d) || (r.companySignedAt || inkedBy(d.signCompany) ? NO_NAME : ''), r.companySignedAt, d.signCompany)}
          {sign(CLIENT_TITLE, clientSigner(d), clientAt, d.signClient, r.noSign ? cap(noSignWords(r.noSign)) : d.pvPhoto ? 'PV papier signé, photo jointe' : undefined, !!r.noSign?.at)}
        </div>
        <Beside figs={<Figs side items={[[d.pvPhoto, 'PV papier signé']]} />}>
          <div className="space-y-1.5">
            {noSignText(d) && <p className="m-0 break-words font-semibold">{noSignText(d)}</p>}
            {pvPhotoText(d) && <p className={`m-0 break-words ${small}`}>{pvPhotoText(d)}</p>}
            <p className={`m-0 break-words ${small}`}>{[clockText(d), SIGNER_NOTE].filter(Boolean).join(' ')}</p>
          </div>
        </Beside>
      </Sec>

      {lifts.length > 0 && (
        <Sec h={Sub} title="Levées après la signature">
          <ol className="space-y-2 p-0">
            {lifts.map(({ x, i }) => (
              <Block key={x.id}>
                <div className="break-words font-semibold">{liftLine(x, i)}</div>
                <Figs items={[[x.liftPhoto, `Levée · réserve ${i + 1}`]]} />
                <Sig strokes={x.liftSign} label="Signature de levée" className="mt-1 h-14 w-44 max-w-full rounded border border-slate-200" />
              </Block>
            ))}
          </ol>
        </Sec>
      )}

      <footer className={`space-y-1 ${small} print:break-before-avoid print:break-inside-avoid`}>
        {isLocked(d) && <p className="m-0 flex items-start gap-1.5"><Lock size={14} aria-hidden className="mt-0.5 shrink-0" /><span>{LOCK_NOTE}</span></p>}
        {fixes.map((l, i) => <p key={i} className="m-0 break-words">Correction après signature, le {l}</p>)}
        <div className={`space-y-0.5 ${seal.state === 'modified' ? 'font-bold text-red-800' : ''}`}>
          {seal.lines.map((l, i) => <p key={i} className={`m-0 break-words ${l.startsWith('Scellé SHA-256') ? 'font-semibold' : ''}`}>{l}</p>)}
          <p className="m-0 font-normal">{SEAL_NOTE}</p>
        </div>
        {!print && (!isLocked(d) || retentionText(p)) && (
          // notes for the company, told on the screen only: they are not on the PV that is handed over
          <aside className="space-y-0.5 rounded-lg border border-slate-300 bg-slate-50 p-2 print:hidden">
            <p className="m-0 font-semibold">Notes pour l'entreprise, non imprimées sur le PV remis au client</p>
            {!isLocked(d) && <p className="m-0">{UNLOCKED_NOTE}</p>}
            {retentionText(p) && <p className="m-0">{CLAUSE_NOTE}</p>}
          </aside>
        )}
      </footer>
    </article>
  );
}

export const PvView = (props: PvProps) => <PvDoc {...props} />;
// The entry of the menu of an order that prints its PV, '' when there is nothing to print yet: as soon as the order is released or delivered (even before any result) the PV can be
// printed; signed it is "le PV", not signed yet it is "le PV à signer" (empty boxes to sign, the result to tick)
export const pvPrintLabel = (d: Delivery): string => (d.reception.result || d.releasedAt || d.reception.date ? (pvSigned(d) ? 'Imprimer le PV' : 'Imprimer le PV à signer') : '');
// The PV that is printed: on every page "PV · order · customer" on top, "Édité le …" at the bottom
export const PvPrint = (props: PvProps) => (
  <Paged head={pvHead(deliveryAt(props.d, props.no).d)} foot={`${editedAt(new Date())}.`}><PvDoc {...props} print /></Paged>
);

// The PV as a PDF file (the one document of tool 3.4 that is a file); `no`: a closed delivery of the order
export const pvPdfFile = ({ d, state, no }: PvProps) => downloadFile(`PV-reception-${fileSlug(d.reception.pvNo || d.ref || d.client)}.pdf`, pvPdf(d, { company: state.settings.companyName, date: new Date(), coords: coordsOf(state.params), params: state.params, equipments: state.equipments, no }), 'application/pdf');
export const PvPdfButton = (props: PvProps) => <Button onClick={() => pvPdfFile(props)}><FileDown size={14} aria-hidden />PV en PDF</Button>;
// The PV window of the sheet prints it too, as the last step of the reception does (the page is A4 portrait: the default of `usePrintOne`; the print node is a portal to the page, not part of the window)
export function PvPrintButton(props: PvProps) {
  const [node, print] = usePrintOne();
  return <><Button onClick={() => print(<PvPrint {...props} />)}><Printer size={14} aria-hidden />Imprimer le PV</Button>{node}</>;
}
