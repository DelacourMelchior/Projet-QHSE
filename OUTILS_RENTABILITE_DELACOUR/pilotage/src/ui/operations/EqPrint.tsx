// The poster stuck on a piece of equipment: A4 portrait, the QR code that opens its routine full screen, the points of the routine with the photo of what
// "in order" looks like, the safety notes. Printed by the browser (usePrintOne), alone on the page.
import type { Checkpoint, Equipment, State } from '../../domain/types';
import { kindLabel, kindOf, RHYTHMS, routineOf, txt } from '../../domain/maintenance';
import { PpeIcon } from '../Ppe';
import { Qr } from '../Qr';
import { Pic, PicLegend } from '../../photo/Pic';
import { eqStationUrl, isLocalAddress } from './EqBits';

export const EQ_PAGE = 'A4 portrait';
// A safety note that talks about a protection gets its pictogram (see Ppe.tsx)
export const PPE_WORDS = /lunette|chaussure|gant|audit|masque|blouse|tablier/i;
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const num = (n: number) => String(n).replace('.', ',');
// The bounds of a measured point, in words: "entre 5,5 et 7 bar", "au plus 90 °C"
export function boundsText(p: Pick<Checkpoint, 'min' | 'max' | 'unit'>): string {
  const u = p.unit ? ` ${p.unit}` : '', lo = p.min ?? null, hi = p.max ?? null;
  return lo !== null && hi !== null ? `entre ${num(lo)} et ${num(hi)}${u}` : hi !== null ? `au plus ${num(hi)}${u}` : lo !== null ? `au moins ${num(lo)}${u}` : '';
}

export function EqPrint({ e, company, state }: { e: Equipment; company: string; state: State }) {
  const r = routineOf(e, state.params), rhythm = RHYTHMS.find(x => x.key === r.every)!.label.toLowerCase() + (r.every === 'week' || r.every === 'fortnight' ? `, le ${DAYS[(r.day - 1 + 7) % 7]}` : '');
  const points = e.checkpoints.filter(p => p.label.trim()), safety = (e.safety || []).filter(x => x.trim());
  return (
    <div className="text-[10pt]">
      <div className="space-y-3 p-2" style={{ border: '4px solid #1B4D3E' }}>
        <header className="flex items-start justify-between gap-4 border-b-2 pb-2" style={{ borderColor: '#1B4D3E' }}>
          <div className="min-w-0">
            <div className="text-[8pt] font-semibold text-slate-500">{company ? `${company} · ` : ''}Routine de l'équipement{e.group ? ` · ${e.group}` : ''}</div>
            <h1 className="text-[24pt] font-bold leading-tight" style={{ color: '#1B4D3E' }}>{e.name.trim() || 'Équipement'}</h1>
            <div className="text-[11pt] text-slate-700">{kindLabel(kindOf(e))}{e.location.trim() ? ` · ${e.location.trim()}` : ''}</div>
            <div className="mt-1 text-[10pt] font-semibold">Routine : {rhythm}</div>
          </div>
          <div className="shrink-0 text-center text-[8pt] text-slate-700">
            <Qr text={eqStationUrl(e.id)} size={150} label={`QR code de la routine de ${e.name}`} />
            <div className="font-semibold">Scanner avec le téléphone</div>
            <div>routine, signaler un problème</div>
          </div>
        </header>
        {safety.length > 0 && (
          <div className="break-inside-avoid rounded bg-blue-50 px-2 py-1.5">
            <strong className="text-[9pt]">Avant toute intervention</strong>
            <ul className="mt-0.5 space-y-0.5">{safety.map((x, i) => <li key={i} className="flex items-center gap-1.5 text-[9pt]">{PPE_WORDS.test(x) && <PpeIcon label={x} size={22} />}{x}</li>)}</ul>
          </div>
        )}
        <ol className="grid grid-cols-2 gap-2">
          {points.map((p, i) => (
            <li key={p.id ?? i} className="break-inside-avoid rounded border border-slate-300 p-1.5">
              {p.photo && <Pic value={p.photo} alt="" size="v" className="mb-1 h-28 w-full rounded" />}
              {p.photo && <PicLegend value={p.photo} className="mb-1 text-[8pt] leading-tight" />}
              <div className="text-[11pt] font-bold"><span style={{ color: '#1B4D3E' }}>{i + 1}.</span> {p.label}</div>
              {p.criterion.trim() && <div>{p.criterion}</div>}
              {boundsText(p) && <div className="text-[9pt] font-semibold text-slate-700">Valeur : {boundsText(p)}</div>}
            </li>
          ))}
        </ol>
        {isLocalAddress() && <p className="break-inside-avoid rounded border border-amber-500 bg-amber-50 px-2 py-1 text-[9pt]">L'adresse du QR code de cette affiche ne marche que sur cet ordinateur : une affiche imprimée une fois l'application en ligne s'ouvrira sur tous les téléphones.</p>}
        <footer className="border-t border-slate-300 pt-1 text-[8pt] text-slate-600">
          {e.operator.trim() && <div>Titulaire : <strong>{e.operator.trim()}</strong>{txt(e.deputy).trim() ? ` · suppléant : ${txt(e.deputy).trim()}` : ''}</div>}
          <div>Copie papier imprimée le {new Date().toLocaleDateString('fr-FR')}. En cas de doute, la fiche de l'écran fait foi : scanner le QR code.</div>
        </footer>
      </div>
    </div>
  );
}
