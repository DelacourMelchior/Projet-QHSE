// The sheet full screen at the workstation (tablet, phone, screen on the wall): one step at a time, big pictures and big buttons usable with gloves.
// It is also where the QR code of the printed sheet leads: "read and understood", a remark, a defect declared in the red bin with the workstation and the step.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Check, ExternalLink, MessageSquarePlus, TriangleAlert, X } from 'lucide-react';
import type { Sop, Strokes } from '../../domain/types';
import { acknowledge, addSuggestion, norm, sopPhase, sopVersion, stepPhotos, versionColor, habilitated } from '../../domain/instructions';
import { isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { PhotoBox } from '../PhotoBox';
import { PpeIcon } from '../Ppe';
import { SignaturePad } from '../SignaturePad';
import { NewTab } from '../common';
import type { Nav } from '../tools';
import { CriticalBadge } from './SopBits';
import { Pic, PicLegend } from '../../photo/Pic';

type Slide = { k: 'cover' } | { k: 'step'; i: number } | { k: 'gesture' } | { k: 'limits' } | { k: 'wrong' } | { k: 'read' };
const big = 'inline-flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 px-5 text-lg font-bold disabled:opacity-30';

export function SopStation({ sop, onClose, nav }: { sop: Sop; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const slides = useMemo<Slide[]>(() => [
    { k: 'cover' }, ...sop.steps.flatMap((x, i): Slide[] => (x.op.trim() || x.how.trim() || stepPhotos(x).length ? [{ k: 'step', i }] : [])),
    ...(sop.good || sop.trap || sop.goodPhoto || sop.trapPhoto ? [{ k: 'gesture' } as Slide] : []),
    ...(sop.limits && (sop.limits.goodPhoto || sop.limits.limitPhoto || sop.limits.rejectPhoto) ? [{ k: 'limits' } as Slide] : []),
    ...(sop.ifWrong && (sop.ifWrong.stop || sop.ifWrong.who || sop.ifWrong.where) ? [{ k: 'wrong' } as Slide] : []),
    { k: 'read' },
  ], [sop]);
  const [n, setN] = useState(0), [pic, setPic] = useState(0);
  const start = useRef<number | null>(null);
  const go = (d: number) => { setN(x => Math.min(slides.length - 1, Math.max(0, x + d))); setPic(0); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const color = versionColor(sop.version), slide = slides[n], saved = !!state?.sops[sop.id];
  // the red bin opens in a new tab: the full screen at the workstation stays where it is
  const declare = (step?: number) => nav.open('5.1', `new:sop:${sop.id}${step !== undefined ? `:${step}` : ''}`);
  const risks = (sop.riskIds || []).map(id => state?.risks[id]?.title).filter(Boolean);

  const body = (() => {
    if (slide.k === 'cover') return (
      <div className="mx-auto max-w-4xl space-y-6 text-center">
        <p className="text-lg font-semibold text-slate-500">{sop.group || 'Instruction de poste'}</p>
        <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">{sop.poste}</h1>
        <p className="text-2xl text-slate-700">{sop.operation}</p>
        {(sop.ppe.length > 0 || sop.ppeNone) && (
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="mb-3 text-lg font-bold text-blue-900">{sop.ppe.length ? 'Protections obligatoires' : 'Aucune protection particulière'}</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">{sop.ppe.map(p => <span key={p} className="flex flex-col items-center gap-1 text-base font-semibold"><PpeIcon label={p} size={64} />{p}</span>)}</div>
          </div>
        )}
        {(sop.materials?.length || 0) > 0 && <div className="flex flex-wrap justify-center gap-3">{sop.materials!.map((m, i) => <span key={i} className="flex flex-col items-center gap-1 text-sm font-semibold text-slate-700">{m.photo && <Pic value={m.photo} alt="" size="t" className="h-24 w-32 rounded-lg" />}{m.label}</span>)}</div>}
        {(risks.length > 0 || sop.emergency) && <p className="rounded-2xl bg-red-50 p-3 text-base text-red-900">{risks.length > 0 && <><strong>Risques : </strong>{risks.join(' · ')}. </>}{sop.emergency && <><strong>Urgence : </strong>{sop.emergency}</>}</p>}
      </div>
    );
    if (slide.k === 'step') {
      const st = sop.steps[slide.i], pics = stepPhotos(st);
      return (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {pics.length ? <Pic value={pics[Math.min(pic, pics.length - 1)]} alt={`Étape ${slide.i + 1}`} fit="contain" size="v" className="max-h-[55vh] w-full rounded-2xl bg-slate-100" /> : <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">Pas de photo</div>}
            {pics.length > 0 && <PicLegend value={pics[Math.min(pic, pics.length - 1)]} className="text-lg text-slate-700" />}
            {pics.length > 1 && <div className="flex gap-2">{pics.map((p, j) => <button key={j} type="button" aria-label={`Photo ${j + 1}`} onClick={() => setPic(j)} className={`overflow-hidden rounded-lg border-4 ${j === pic ? 'border-delacour-gold' : 'border-transparent'}`}><Pic value={p} alt="" size="t" className="h-16 w-24" /></button>)}</div>}
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black text-white" style={{ backgroundColor: color.hex }}>{slide.i + 1}</span>{st.critical && <CriticalBadge kind={st.critical} big />}</div>
            <h2 className="text-3xl font-black text-slate-900">{st.op}</h2>
            <p className="text-2xl text-slate-800">{st.how}</p>
            {(st.values || []).length > 0 && <div className="flex flex-wrap gap-2">{st.values!.map((v, j) => <span key={j} className="rounded-xl bg-slate-100 px-3 py-2 text-xl font-bold">{v.label} : <span className="font-mono">{v.value}</span></span>)}</div>}
            {st.watch && <p className="rounded-xl bg-amber-100 p-3 text-xl font-semibold text-amber-950">Attention : {st.watch}</p>}
            {st.check && <p className="rounded-xl bg-emerald-50 p-3 text-xl text-emerald-950">Autocontrôle : {st.check}</p>}
            <div className="flex flex-wrap gap-2">
              {st.video && <a href={st.video} target="_blank" rel="noreferrer" className={`${big} border-slate-300 bg-white text-slate-800`}><ExternalLink size={22} />Voir la vidéo</a>}
              <button type="button" className={`${big} border-red-300 bg-white text-red-800`} onClick={() => declare(slide.i)}><TriangleAlert size={22} />Défaut sur cette étape<NewTab size={20} /></button>
            </div>
          </div>
        </div>
      );
    }
    if (slide.k === 'gesture') return (
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-3xl border-4 border-emerald-500 p-4"><h2 className="text-3xl font-black text-emerald-800">✓ Le bon geste</h2>{sop.goodPhoto && <Pic value={sop.goodPhoto} alt="Le bon geste" fit="contain" size="v" className="max-h-[45vh] w-full rounded-2xl" />}<p className="text-2xl text-slate-800">{sop.good}</p></div>
        <div className="space-y-3 rounded-3xl border-4 border-red-500 p-4"><h2 className="text-3xl font-black text-red-800">✗ Le piège à éviter</h2>{sop.trapPhoto && <Pic value={sop.trapPhoto} alt="Le piège à éviter" fit="contain" size="v" className="max-h-[45vh] w-full rounded-2xl" />}<p className="text-2xl text-slate-800">{sop.trap}</p></div>
      </div>
    );
    if (slide.k === 'limits') return (
      <div className="mx-auto max-w-6xl space-y-4"><h2 className="text-center text-3xl font-black text-slate-900">Pièce bonne, limite, à rebuter</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {([['good', 'goodPhoto', 'Bonne', 'border-emerald-500'], ['limit', 'limitPhoto', 'Limite', 'border-amber-500'], ['reject', 'rejectPhoto', 'À rebuter', 'border-red-500']] as const).map(([k, p, l, b]) => (
            <div key={k} className={`space-y-2 rounded-3xl border-4 p-3 ${b}`}><h3 className="text-2xl font-black">{l}</h3>{sop.limits![p] && <Pic value={sop.limits![p]} alt={l} fit="contain" size="v" className="max-h-[40vh] w-full rounded-2xl" />}<p className="text-xl">{sop.limits![k]}</p></div>
          ))}
        </div></div>
    );
    if (slide.k === 'wrong') return (
      <div className="mx-auto max-w-3xl space-y-5 rounded-3xl border-4 border-red-500 bg-red-50 p-6">
        <h2 className="text-4xl font-black text-red-800">Si ça ne va pas</h2>
        {sop.ifWrong!.stop && <p className="text-2xl font-semibold text-slate-900">{sop.ifWrong!.stop}</p>}
        {sop.ifWrong!.who && <p className="text-xl"><strong>Prévenir :</strong> {sop.ifWrong!.who}</p>}
        {sop.ifWrong!.where && <p className="text-xl"><strong>Mettre la pièce :</strong> {sop.ifWrong!.where}</p>}
        <button type="button" className={`${big} border-red-700 bg-red-700 text-white`} onClick={() => declare()}><TriangleAlert size={24} />Déclarer un défaut (bac rouge)<NewTab size={22} /></button>
      </div>
    );
    return <ReadSlide sop={sop} saved={saved} author={author} names={state ? [...new Set([...Object.values(state.people).filter(p => p.active).map(p => p.name), ...habilitated(state, sop)])].sort((a, b) => a.localeCompare(b)) : []} onDeclare={() => declare()}
      onRead={(name, sig) => update(d => { if (d.sops[sop.id]) d.sops[sop.id] = acknowledge(d.sops[sop.id], name, isoDate(new Date()), sig); })}
      onRemark={(by, text, photo) => update(d => { if (d.sops[sop.id]) d.sops[sop.id] = addSuggestion(d.sops[sop.id], by, text, photo); })} />;
  })();

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Instruction du poste ${sop.poste}`} className="fixed inset-0 z-[70] flex flex-col bg-white text-slate-900 print:hidden">
      <div className="h-2 shrink-0" style={{ backgroundColor: color.hex }} />
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-2">
        <span className="rounded px-2 py-0.5 font-mono text-base font-black text-white" style={{ backgroundColor: color.hex }}>{sopVersion(sop)}</span>
        <div className="min-w-0 flex-1 truncate text-sm font-bold">{sop.poste} · {sop.operation}</div>
        {sopPhase(sop) !== 'active' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Non validée</span>}
        <span className="font-mono text-sm text-slate-500">{n + 1} / {slides.length}</span>
        <button type="button" onClick={onClose} aria-label="Fermer le plein écran" className="rounded-lg p-3 text-slate-600 hover:bg-slate-100"><X size={26} /></button>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6" onTouchStart={e => { start.current = e.touches[0].clientX; }} onTouchEnd={e => { if (start.current !== null) { const d = e.changedTouches[0].clientX - start.current; if (Math.abs(d) > 70) go(d < 0 ? 1 : -1); start.current = null; } }}>{body}</main>
      <footer className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-slate-200 px-4 py-3">
        <button type="button" className={`${big} justify-self-start border-slate-300 bg-white text-slate-800`} disabled={n === 0} onClick={() => go(-1)}><ChevronLeft size={28} />Précédent</button>
        <div className="hidden gap-1.5 sm:flex" aria-hidden>{slides.map((_, i) => <span key={i} className={`h-2.5 rounded-full ${i === n ? 'w-6' : 'w-2.5 bg-slate-300'}`} style={i === n ? { backgroundColor: color.hex } : undefined} />)}</div>
        <button type="button" className={`${big} col-start-3 justify-self-end text-white`} style={{ backgroundColor: color.hex, borderColor: color.hex }} disabled={n === slides.length - 1} onClick={() => go(1)}>Suivant<ChevronRight size={28} /></button>
      </footer>
    </div>, document.body);
}

function ReadSlide({ sop, saved, author, names, onRead, onRemark, onDeclare }: { sop: Sop; saved: boolean; author: string; names: string[]; onRead(name: string, sig?: Strokes): void; onRemark(by: string, text: string, photo: string): void; onDeclare(): void }) {
  const [who, setWho] = useState(author), [done, setDone] = useState(''), [sign, setSign] = useState(false), [sig, setSig] = useState<Strokes | undefined>();
  const [remark, setRemark] = useState(false), [text, setText] = useState(''), [photo, setPhoto] = useState(''), [sent, setSent] = useState(false);
  const already = !!who.trim() && (sop.acks || []).some(a => a.v === sop.version && norm(a.person) === norm(who));
  const field = 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-gold';
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h2 className="text-center text-3xl font-black text-slate-900">Lu et compris ?</h2>
      {!saved && <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">Instruction pas encore enregistrée : la lecture et les remarques ne sont pas notées.</p>}
      <label className="block space-y-1"><span className="text-base font-semibold text-slate-700">Votre nom</span><input className={field} value={who} list="station-people" onChange={e => { setWho(e.target.value); setDone(''); }} /><datalist id="station-people">{names.map(x => <option key={x} value={x} />)}</datalist></label>
      <label className="flex items-center gap-2 text-base text-slate-700"><input type="checkbox" className="h-5 w-5" checked={sign} onChange={e => { setSign(e.target.checked); setSig(undefined); }} />Signer au doigt</label>
      {sign && <SignaturePad value={sig} onChange={setSig} label="Signature" />}
      {done || already ? <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4 text-xl font-bold text-emerald-800"><Check size={26} />{done || `${who} a déjà lu la ${sopVersion(sop)}`}</p>
        : <button type="button" disabled={!saved || !who.trim() || (sign && !sig?.length)} className={`${big} w-full border-emerald-700 bg-emerald-700 text-white`} onClick={() => { onRead(who.trim(), sig); setDone(`Merci ${who.trim()} : lecture de la ${sopVersion(sop)} notée`); }}><Check size={26} />J'ai lu et compris la {sopVersion(sop)}</button>}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={`${big} border-slate-300 bg-white text-slate-800`} onClick={() => setRemark(!remark)}><MessageSquarePlus size={22} />Une remarque</button>
        <button type="button" className={`${big} border-red-300 bg-white text-red-800`} onClick={onDeclare}><TriangleAlert size={22} />Déclarer un défaut<NewTab size={20} /></button>
      </div>
      {remark && (
        <div className="space-y-2 rounded-2xl border-2 border-slate-200 p-3">
          <textarea className={`${field} min-h-[96px]`} value={text} placeholder="Ce qui pourrait être mieux sur cette fiche" aria-label="Remarque" onChange={e => { setText(e.target.value); setSent(false); }} />
          <div className="max-w-xs"><PhotoBox value={photo} label="Photo de la remarque" onChange={setPhoto} /></div>
          {sent ? <p className="font-bold text-emerald-800">Remarque envoyée, merci.</p> : <button type="button" disabled={!saved || !text.trim()} className={`${big} w-full border-slate-800 bg-slate-800 text-white`} onClick={() => { onRemark(who.trim(), text, photo); setText(''); setPhoto(''); setSent(true); }}>Envoyer la remarque</button>}
        </div>
      )}
    </div>
  );
}
