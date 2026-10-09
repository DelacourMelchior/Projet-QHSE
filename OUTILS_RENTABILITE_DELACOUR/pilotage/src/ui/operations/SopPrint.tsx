// The sheet posted at the workstation: A5, A4 or A3, portrait or landscape. A frame in the colour of the version, the protections first, the steps
// in pictures, the right gesture and the trap, what to do when it goes wrong, and the QR code that opens the latest version at the workstation.
import type { Sop, State } from '../../domain/types';
import { habilitated, sopVersion, stepPhotos, versionColor } from '../../domain/instructions';
import { frDate } from '../../domain/periods';
import { PpeIcon } from '../Ppe';
import { Qr } from '../Qr';
import { CriticalBadge, stationUrl } from './SopBits';
import { Pic, PicLegend } from '../../photo/Pic';

export interface PrintFormat { size: 'A5' | 'A4' | 'A3'; landscape: boolean }
export const pageOf = (f: PrintFormat) => `${f.size} ${f.landscape ? 'landscape' : 'portrait'}`;
const ZOOM = { A5: 0.72, A4: 1, A3: 1.41 };

export function SopPrint({ s, company, state, format }: { s: Sop; company: string; state: State; format: PrintFormat }) {
  const color = versionColor(s.version), prev = s.version > 1 ? versionColor(s.version - 1) : null;
  const reason = s.history.find(h => h.v === s.version)?.reason;
  const people = habilitated(state, s), risks = (s.riskIds || []).map(id => state.risks[id]?.title).filter(Boolean);
  const cols = format.landscape ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div style={{ zoom: ZOOM[format.size] }} className="text-[10pt]">
      <div className="space-y-2.5 p-2" style={{ border: `4px solid ${color.hex}` }}>
        <header className="flex items-end justify-between gap-3 border-b-2 pb-1.5" style={{ borderColor: color.hex }}>
          <div>
            <div className="text-[8pt] font-semibold text-slate-500">{company ? `${company} · ` : ''}Instruction de poste{s.group ? ` · ${s.group}` : ''}</div>
            <h1 className="text-[16pt] font-bold leading-tight" style={{ color: color.hex }}>{s.poste} · {s.operation}</h1>
          </div>
          <div className="shrink-0 text-right text-[8pt] text-slate-600">
            <span className="block rounded px-2 font-mono text-[20pt] font-black text-white" style={{ backgroundColor: color.hex }}>{sopVersion(s)}</span>
            du {frDate(s.versionDate)} · cadre {color.name}<br />Rédigée avec {s.author || '—'} · validée par {s.validatedBy || '—'}
          </div>
        </header>
        {prev && (
          <div className="break-inside-avoid rounded border-2 px-2 py-1 text-[9pt]" style={{ borderColor: color.hex }}>
            <strong>Nouvelle version {sopVersion(s)}{reason ? ` : ${reason}` : ''}.</strong> Elle remplace la {sopVersion({ version: s.version - 1 })} (cadre {prev.name}) : retirer l'ancienne fiche.
          </div>
        )}
        {(s.ppe.length > 0 || s.ppeNone) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded bg-blue-50 px-2 py-1">
            <strong className="text-[9pt]">Protections obligatoires</strong>
            {s.ppe.length ? s.ppe.map(x => <span key={x} className="inline-flex items-center gap-1.5 text-[9pt] font-semibold"><PpeIcon label={x} size={30} />{x}</span>) : <span className="text-[9pt]">Aucune protection particulière</span>}
          </div>
        )}
        {(s.materials?.length || 0) > 0 && (
          <div className="break-inside-avoid text-[9pt]"><strong>À avoir sous la main : </strong>{s.materials!.map(m => m.label).join(' · ')}</div>
        )}
        <ol className={`grid gap-2 ${cols}`}>
          {s.steps.filter(x => x.op.trim() || x.how.trim() || stepPhotos(x).length).map((st, i) => {
            const pics = stepPhotos(st);
            return (
              <li key={i} className={`break-inside-avoid rounded border border-slate-300 p-1.5 ${st.critical === 'safety' ? '!border-red-600 !border-2' : st.critical === 'quality' ? '!border-amber-500 !border-2' : ''}`}>
                {pics[0] && <Pic value={pics[0]} alt="" size="v" className="mb-1 h-28 w-full rounded" />}
                {pics[0] && <PicLegend value={pics[0]} className="mb-1 text-[8pt] leading-tight" />}
                {pics.length > 1 && <div className="mb-1 flex gap-1">{pics.slice(1, 4).map((p, j) => <Pic key={j} value={p} alt="" size="v" className="h-12 w-1/3 rounded" />)}</div>}
                <div className="flex items-center gap-1.5 text-[11pt] font-bold"><span style={{ color: color.hex }}>{i + 1}.</span>{st.op}{st.critical && <CriticalBadge kind={st.critical} />}</div>
                <div>{st.how}</div>
                {(st.values || []).length > 0 && <div className="mt-0.5 flex flex-wrap gap-1">{st.values!.map((v, j) => <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9pt] font-semibold">{v.label} : <span className="font-mono">{v.value}</span></span>)}</div>}
                {st.watch && <div className="text-[9pt] font-semibold text-amber-800">Attention : {st.watch}</div>}
                {st.check && <div className="text-[9pt] text-slate-600">Autocontrôle : {st.check}</div>}
                {st.video && <div className="text-[8pt] text-slate-500">Vidéo de l'étape : scanner le QR code</div>}
              </li>
            );
          })}
        </ol>
        <div className="grid grid-cols-2 gap-2">
          <div className="break-inside-avoid rounded border-2 border-emerald-600 p-1.5">
            <div className="font-bold text-emerald-800">✓ Le bon geste</div>
            {s.goodPhoto && <Pic value={s.goodPhoto} alt="" size="v" className="my-1 h-24 w-full rounded" />}
            <div>{s.good}</div>
          </div>
          <div className="break-inside-avoid rounded border-2 border-red-600 p-1.5">
            <div className="font-bold text-red-800">✗ Le piège à éviter</div>
            {s.trapPhoto && <Pic value={s.trapPhoto} alt="" size="v" className="my-1 h-24 w-full rounded" />}
            <div>{s.trap}</div>
          </div>
        </div>
        {s.limits && (s.limits.goodPhoto || s.limits.limitPhoto || s.limits.rejectPhoto) && (
          <div className="break-inside-avoid"><strong className="text-[9pt]">Pièce bonne, limite, à rebuter</strong>
            <div className="mt-0.5 grid grid-cols-3 gap-2 text-[8pt]">
              {([['good', 'goodPhoto', 'border-emerald-600'], ['limit', 'limitPhoto', 'border-amber-500'], ['reject', 'rejectPhoto', 'border-red-600']] as const).map(([k, p, b]) => (
                <div key={k} className={`rounded border-2 p-1 ${b}`}>{s.limits![p] && <Pic value={s.limits![p]} alt="" size="v" className="mb-0.5 h-16 w-full rounded" />}{s.limits![k]}</div>
              ))}
            </div>
          </div>
        )}
        {s.ifWrong && (s.ifWrong.stop || s.ifWrong.who || s.ifWrong.where) && (
          <div className="break-inside-avoid rounded border-2 border-red-600 bg-red-50 p-1.5 text-[9pt]">
            <strong className="text-red-800">Si ça ne va pas : </strong>{s.ifWrong.stop}{s.ifWrong.who && <> · <strong>Prévenir :</strong> {s.ifWrong.who}</>}{s.ifWrong.where && <> · <strong>Pièce :</strong> {s.ifWrong.where}</>}
          </div>
        )}
        {(risks.length > 0 || s.emergency) && (
          <div className="break-inside-avoid text-[9pt]">{risks.length > 0 && <><strong>Risques du poste : </strong>{risks.join(' · ')}. </>}{s.emergency && <><strong>Urgence : </strong>{s.emergency}</>}</div>
        )}
        {(s.variants?.length || 0) > 0 && (
          <div className="break-inside-avoid text-[9pt]"><strong>Ce qui change selon la référence : </strong>{s.variants!.map(v => `${v.name} (${v.diff})`).join(' · ')}</div>
        )}
        <footer className="flex items-end justify-between gap-3 border-t border-slate-300 pt-1 text-[8pt]">
          <div className="space-y-0.5">
            <div><strong>Habilités :</strong> {people.join(', ') || '—'}</div>
            <div className="text-slate-500">Copie papier imprimée le {new Date().toLocaleDateString('fr-FR')}. En cas de doute, la version en vigueur est celle de l'écran : scanner le QR code.</div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5"><Qr text={stationUrl(s.id)} size={64} label={`QR code de l'instruction ${s.poste}`} /></div>
        </footer>
      </div>
    </div>
  );
}

// Several sheets, one per page (the tour of the sheets to post)
export function SopPrintBatch({ items, company, state, format }: { items: Sop[]; company: string; state: State; format: PrintFormat }) {
  return <>{items.map((x, i) => <div key={x.id} style={i < items.length - 1 ? { breakAfter: 'page' } : undefined}><SopPrint s={x} company={company} state={state} format={format} /></div>)}</>;
}
