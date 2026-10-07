// The designation in a key function, signed on screen under the name of each person: the holder signs and the direction signs for her (two signatures); a deputy signs, the holder and the
// direction validate (three). One short text per signature, frozen with it; the signature is drawn with a finger or a mouse (or the name typed, for whoever cannot draw). Simple electronic
// signature: the jurist confirms its legal value.
import { useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';
import type { Power } from '../../domain/types';
import { sameName, signLabel, signOf, signText, type SignNeed } from '../../domain/powers';
import { frDate, isoDate } from '../../domain/periods';
import { Button, Modal } from '../common';
import { FIELD, TOUCH } from './PwBits';

export const stamp = (at: string) => `${frDate(at.slice(0, 10))}${at.length > 10 ? ` à ${at.slice(11, 13)} h ${at.slice(14, 16)}` : ''}`;
const W = 600, H = 180;

// A pad to draw on: pointer events (finger, pen, mouse); the picture is given when a stroke ends
function SignPad({ onChange }: { onChange(png: string): void }) {
  const cv = useRef<HTMLCanvasElement>(null), down = useRef(false);
  const at = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)] as const; };
  const ctx = () => { const c = cv.current!.getContext('2d')!; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#11352A'; return c; };
  const start = (e: React.PointerEvent) => { e.preventDefault(); cv.current!.setPointerCapture(e.pointerId); down.current = true; const [x, y] = at(e), c = ctx(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 0.1, y + 0.1); c.stroke(); };
  const move = (e: React.PointerEvent) => { if (!down.current) return; const [x, y] = at(e), c = ctx(); c.lineTo(x, y); c.stroke(); };
  const end = () => { if (!down.current) return; down.current = false; onChange(cv.current!.toDataURL('image/png')); };
  const clear = () => { cv.current!.getContext('2d')!.clearRect(0, 0, W, H); onChange(''); };
  return (
    <div className="space-y-1.5">
      <canvas ref={cv} width={W} height={H} role="img" aria-label="Zone de signature : dessiner avec le doigt ou la souris" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        className="aspect-[10/3] w-full touch-none rounded-lg border border-dashed border-slate-400 bg-white" />
      <Button kind="ghost" className="!py-1" onClick={clear}><Eraser size={13} aria-hidden />Effacer</Button>
    </div>
  );
}

const what = (n: SignNeed) => `${signLabel(n)} : ${n.who}`;

function SignDialog({ p, need, onSign, onClose }: { p: Power; need: SignNeed; onSign(img: string): void; onClose(): void }) {
  const [png, setPng] = useState(''), [typed, setTyped] = useState('');
  const ready = !!png || sameName(typed, need.who);
  return (
    <Modal onClose={onClose} title={`Signature de ${need.who}`} subtitle={`${what(need)} · ${p.power.trim()}`}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={!ready} onClick={() => { onSign(png); onClose(); }}>Signer</Button></>}>
      <div className="space-y-3">
        <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">{signText(p, need, isoDate(new Date()))}</p>
        <p className="text-xs text-slate-700">{need.who} signe ici, en personne.</p>
        <SignPad onChange={setPng} />
        <label className="block space-y-1 text-xs"><span className="font-semibold text-slate-700">Ou taper son nom complet, pour qui ne peut pas dessiner</span>
          <input className={FIELD} value={typed} placeholder={need.who} autoComplete="off" onChange={e => setTyped(e.target.value)} /></label>
        <p className="text-xs text-slate-600">Signature électronique simple : le nom, le jour, l'heure et le dessin sont gardés avec le texte. Sa valeur juridique est à faire confirmer par votre juriste.</p>
      </div>
    </Modal>
  );
}

// Under the name of a person: one line per signature expected (hers, then the validations), each « Signé le … » or « Signature manquante » with the button that opens the pad
export function SignSlots({ p, needs, onSign, onUnsign }: { p: Power; needs: SignNeed[]; onSign(n: SignNeed, img: string): void; onUnsign(n: SignNeed): void }) {
  const [open, setOpen] = useState<SignNeed | null>(null);
  if (!needs.length) return null;
  return (
    <ul className="space-y-1">
      {needs.map(n => {
        const g = signOf(p, n);
        return (
          <li key={n.slot} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${g ? 'bg-emerald-600' : 'bg-amber-500'}`} />
            <span className="min-w-0 font-semibold text-slate-800">{signLabel(n)}<span className="font-normal text-slate-600"> · {n.who}</span></span>
            {g ? (
              <>
                <span className="text-slate-600">{stamp(g.at)}{g.img ? '' : ' (nom saisi)'}</span>
                {g.img && <img src={g.img} alt={`Signature de ${g.who}`} className="h-7 rounded border border-slate-200 bg-white" />}
                <button type="button" className={`font-semibold text-delacour-primary hover:underline ${TOUCH}`} aria-label={`Retirer la signature de ${n.who} pour ${n.subject}`} onClick={() => onUnsign(n)}>Retirer</button>
              </>
            ) : (
              <>
                <span role="status" className="font-semibold text-amber-800">manquante</span>
                <Button className="!py-1" aria-label={`Signer pour ${n.who} : ${signLabel(n).toLowerCase()} de ${n.subject}`} onClick={() => setOpen(n)}><PenLine size={13} aria-hidden />Signer</Button>
              </>
            )}
          </li>
        );
      })}
      {open && <SignDialog p={p} need={open} onSign={img => onSign(open, img)} onClose={() => setOpen(null)} />}
    </ul>
  );
}
