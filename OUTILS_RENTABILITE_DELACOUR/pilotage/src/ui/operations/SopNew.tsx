// Starting a sheet: written step by step with the phone (a photo, one sentence, next), from a template, from a copy of another sheet, or empty.
import { useState } from 'react';
import { Camera, Copy, FilePlus, LayoutTemplate } from 'lucide-react';
import type { Sop, SopStep } from '../../domain/types';
import { duplicateSop, newSop, newStep, sopFromTemplate, SOP_TEMPLATES, sopPhase, SHORT_SENTENCE, sopCfg, uncoveredPostes, wordCount } from '../../domain/instructions';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal } from '../common';
import { PhotoBox } from '../PhotoBox';

export function SopNew({ onClose, onStart, firstPoste = '' }: { onClose(): void; onStart(s: Sop): void; firstPoste?: string }) {
  const { state } = useStore();
  const [mode, setMode] = useState<'menu' | 'wizard' | 'template' | 'copy'>(firstPoste ? 'wizard' : 'menu');
  if (!state) return null;
  const sops = Object.values(state.sops).sort((a, b) => a.poste.localeCompare(b.poste));
  const card = 'flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-3 text-left hover:border-delacour-gold hover:bg-amber-50/40 max-sm:min-h-[44px]';
  if (mode === 'wizard') return <SopWizard onClose={onClose} onDone={onStart} px={sopCfg(state.params).photoPx} firstPoste={firstPoste} />;
  return (
    <Modal wide onClose={onClose} title="Nouvelle instruction de poste" subtitle="Comment voulez-vous commencer ?">
      {mode === 'menu' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className={card} onClick={() => setMode('wizard')}><Camera size={20} className="text-delacour-primary" /><strong className="text-sm">Pas à pas avec des photos</strong><span className="text-[11px] text-slate-600">Une photo, une phrase, étape suivante. Fait pour le téléphone, au poste.</span></button>
          <button type="button" className={card} onClick={() => setMode('template')}><LayoutTemplate size={20} className="text-delacour-primary" /><strong className="text-sm">À partir d'un modèle</strong><span className="text-[11px] text-slate-600">Fabrication, chantier, service, cuisine, nettoyage, expédition, contrôle : 4 étapes à adapter.</span></button>
          <button type="button" className={card} disabled={!sops.length} onClick={() => setMode('copy')}><Copy size={20} className="text-delacour-primary" /><strong className="text-sm">Copier une instruction</strong><span className="text-[11px] text-slate-600">Autre machine, autre référence : on garde le contenu, on change ce qui diffère.</span></button>
          <button type="button" className={card} onClick={() => onStart(newSop())}><FilePlus size={20} className="text-delacour-primary" /><strong className="text-sm">Fiche vide</strong><span className="text-[11px] text-slate-600">Tout remplir soi-même dans la fiche.</span></button>
        </div>
      )}
      {mode === 'template' && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {SOP_TEMPLATES.map(t => <li key={t.name}><button type="button" className={`${card} w-full`} onClick={() => onStart(sopFromTemplate(t))}><strong className="text-sm">{t.name}</strong><span className="text-[11px] text-slate-600">{t.steps.map(x => x.op).join(' · ')}</span></button></li>)}
        </ul>
      )}
      {mode === 'copy' && (
        <ul className="space-y-1.5">
          {sops.map(x => <li key={x.id}><button type="button" className={`${card} w-full`} onClick={() => onStart(duplicateSop(x))}><strong className="text-sm">{x.poste} · {x.operation}</strong><span className="text-[11px] text-slate-600">{sopPhase(x) === 'archived' ? 'Archivée · ' : ''}{x.steps.length} étape(s)</span></button></li>)}
        </ul>
      )}
      {mode !== 'menu' && <div className="mt-3"><Button kind="ghost" onClick={() => setMode('menu')}>Retour</Button></div>}
    </Modal>
  );
}

// Step by step: name, then for each step a photo and one short sentence, then the right gesture and the trap
function SopWizard({ onClose, onDone, px, firstPoste }: { onClose(): void; onDone(s: Sop): void; px: number; firstPoste: string }) {
  const { state } = useStore();
  const [stage, setStage] = useState<'name' | 'steps' | 'gesture'>('name');
  const [poste, setPoste] = useState(firstPoste), [operation, setOperation] = useState('');
  const [steps, setSteps] = useState<SopStep[]>([newStep()]), [i, setI] = useState(0);
  const [g, setG] = useState({ good: '', trap: '', goodPhoto: '', trapPhoto: '' });
  if (!state) return null;
  const st = steps[i], words = wordCount(st.how);
  const setStep = (x: Partial<SopStep>) => setSteps(a => a.map((y, j) => (j === i ? { ...y, ...x } : y)));
  // the title of a step is its sentence, shortened: it is completed in the sheet
  const title = (t: string) => { const w = t.trim().split(/\s+/); return w.length > 6 ? `${w.slice(0, 6).join(' ')}…` : t.trim(); };
  const finish = () => onDone({ ...newSop(), poste: poste.trim(), operation: operation.trim(), steps: steps.filter(x => x.op.trim() || x.how.trim() || x.photo).map(x => ({ ...x, op: x.op.trim() || title(x.how) })), ...g });
  const suggestions = uncoveredPostes(state).slice(0, 6);
  // a step, a picture or a word typed is not thrown away by a tap beside the window or the Escape key
  const dirty = steps.some(x => x.op.trim() || x.how.trim() || x.photo || x.watch.trim()) || !!(g.good || g.trap || g.goodPhoto || g.trapPhoto);
  const close = () => { if (dirty && !window.confirm('Abandonner cette instruction ? Les photos et les phrases déjà saisies seront perdues.')) return; onClose(); };
  return (
    <Modal onClose={close} title="Instruction pas à pas" subtitle={stage === 'name' ? 'Quel poste ?' : stage === 'steps' ? `Étape ${i + 1}` : 'Le bon geste et le piège'}
      footer={stage === 'name' ? <><Button onClick={close}>Annuler</Button><Button kind="primary" disabled={!poste.trim()} onClick={() => setStage('steps')}>Commencer les étapes</Button></>
        : stage === 'steps' ? <>
          <Button onClick={() => (i ? setI(i - 1) : setStage('name'))}>Retour</Button>
          <Button onClick={() => setStage('gesture')} disabled={!steps.some(x => x.op.trim() || x.how.trim() || x.photo)}>Terminer les étapes</Button>
          <Button kind="primary" disabled={!st.photo && !st.how.trim() && !st.op.trim()} onClick={() => { if (i === steps.length - 1) setSteps([...steps, newStep()]); setI(i + 1); }}>Étape suivante</Button></>
          : <><Button onClick={() => setStage('steps')}>Retour</Button><Button kind="primary" onClick={finish}>Créer l'instruction</Button></>}>
      {stage === 'name' && (
        <div className="space-y-3">
          <Field label="Poste"><input className={inputCls} value={poste} autoFocus placeholder="Ex. : Presse plieuse" onChange={e => setPoste(e.target.value)} /></Field>
          <Field label="Opération"><input className={inputCls} value={operation} placeholder="Ex. : Pliage des équerres" onChange={e => setOperation(e.target.value)} /></Field>
          {suggestions.length > 0 && <div className="space-y-1"><span className="text-[11px] font-semibold text-slate-700">Postes cités sans instruction</span><div className="flex flex-wrap gap-1.5">{suggestions.map(u => <button key={u.name} type="button" onClick={() => setPoste(u.name)} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 max-sm:min-h-[44px]">{u.name}</button>)}</div></div>}
        </div>
      )}
      {stage === 'steps' && (
        <div className="space-y-3">
          <PhotoBox value={st.photo} label={`Étape ${i + 1}`} px={px} tall onChange={v => setStep({ photo: v })} />
          <Field label="Que faut-il faire ? Une phrase courte"><input className={inputCls} value={st.how} autoFocus placeholder="Ex. : Insérer le connecteur jusqu'au clic" onChange={e => setStep({ how: e.target.value })} /></Field>
          {words > SHORT_SENTENCE && <p className="text-[11px] text-amber-800">{words} mots : une phrase courte se lit mieux au poste.</p>}
          <Field label="Attention à (facultatif)"><input className={inputCls} value={st.watch} onChange={e => setStep({ watch: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={!!st.critical} onChange={e => setStep({ critical: e.target.checked ? 'quality' : undefined })} />Point à ne jamais sauter</label>
          <p className="text-[11px] text-slate-500">{steps.filter(x => x.op.trim() || x.how.trim() || x.photo).length} étape(s) déjà saisie(s). Le titre de l'étape se complète ensuite dans la fiche.</p>
        </div>
      )}
      {stage === 'gesture' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border-2 border-emerald-200 p-2"><span className="text-xs font-bold text-emerald-800">✓ Le bon geste</span><PhotoBox value={g.goodPhoto} label="Le bon geste" px={px} onChange={v => setG({ ...g, goodPhoto: v })} /><textarea className={`${inputCls} min-h-[56px]`} value={g.good} aria-label="Le bon geste" onChange={e => setG({ ...g, good: e.target.value })} /></div>
          <div className="space-y-1.5 rounded-lg border-2 border-red-200 p-2"><span className="text-xs font-bold text-red-800">✗ Le piège à éviter</span><PhotoBox value={g.trapPhoto} label="Le piège à éviter" px={px} onChange={v => setG({ ...g, trapPhoto: v })} /><textarea className={`${inputCls} min-h-[56px]`} value={g.trap} aria-label="Le piège à éviter" onChange={e => setG({ ...g, trap: e.target.value })} /></div>
        </div>
      )}
    </Modal>
  );
}
