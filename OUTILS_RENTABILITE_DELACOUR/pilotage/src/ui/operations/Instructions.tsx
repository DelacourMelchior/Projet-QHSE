// Tool 3.2 "Instructions visuelles au poste": the 4 standard steps of a workstation, the right gesture and the trap in pictures,
// protective equipment, the people allowed to work alone (3-question test), a version that follows every defect (living standard).
import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, Plus, Printer, Trash2, X } from 'lucide-react';
import type { Sop, SopStep } from '../../domain/types';
import { DEFAULT_PPE, ncsSinceVersion, newSop, photoCount, sopInsights, sopVersion } from '../../domain/operations';
import { applyOperationsExample } from '../../domain/operationsExamples';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Empty, Field, inputCls, Method, Modal, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { readPhoto } from '../photo';
import { usePrintOne } from '../PrintOne';
import type { ScreenProps } from '../screens';

const sopStatus = (stale: number, s: Sop) => (stale ? { tone: 'alert' as const, label: 'À mettre à jour' } : !s.validatedBy.trim() ? { tone: 'warn' as const, label: 'À valider' } : { tone: 'ok' as const, label: 'À jour' });

export function Instructions({ focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Sop | null>(null);
  const [printNode, print] = usePrintOne();
  useEffect(() => { if (focus && state?.sops[focus]) { setOpen(state.sops[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const all = Object.values(state.sops).sort((a, b) => a.poste.localeCompare(b.poste));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Instructions visuelles : le bon geste affiché au poste" text="Photographier les gestes du meilleur opérateur, écrire avec lui des phrases courtes, afficher la fiche A4 face au poste. Avant qu'une recrue travaille seule, elle passe le test en 3 questions.">
          <Button kind="primary" onClick={() => setOpen(newSop())}><Plus size={14} />Nouvelle instruction</Button>
          <Button onClick={() => update(d => applyOperationsExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <SopSheet initial={open} onClose={() => setOpen(null)} onPrint={s => print(<SopPrint s={s} company={state.settings.companyName} />)} />}
        {printNode}
      </div>
    );
  }
  const stale = all.filter(x => ncsSinceVersion(state, x).length);
  const habil = all.reduce((n, x) => n + x.habilitations.length, 0);
  return (
    <div className="space-y-4">
      <Summary title="Les bons gestes sont-ils affichés au poste ?" insights={sopInsights(state)} tiles={<>
        <Tile title="Postes avec instruction" value={String(all.length)} sub={`${all.filter(x => x.validatedBy.trim()).length} validée(s)`} />
        <Tile title="À mettre à jour" value={String(stale.length)} sub="défaut déclaré au poste depuis la version" tone={stale.length ? 'alert' : 'ok'} />
        <Tile title="Personnes habilitées" value={String(habil)} sub="test en 3 questions réussi" />
        <Tile title="Photos" value={String(all.reduce((n, x) => n + photoCount(x), 0))} sub={`${all.filter(x => !photoCount(x)).length} instruction(s) sans photo`} tone={all.some(x => !photoCount(x)) ? 'warn' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Instructions de poste" text="Une fiche A4 par poste sensible, plastifiée face à l'opérateur. Elle change dans les 48 h qui suivent un défaut au poste.">
          <Button kind="primary" onClick={() => setOpen(newSop())}><Plus size={14} />Nouvelle instruction</Button>
        </ToolHeader>
        <ul className="divide-y divide-slate-100">
          {all.map(x => {
            const n = ncsSinceVersion(state, x).length;
            const st = sopStatus(n, x);
            return (
              <Row key={x.id} onClick={() => setOpen(x)}
                lead={<span className="w-12 shrink-0 font-mono text-[11px] font-semibold text-slate-700">{sopVersion(x)}</span>}
                title={`${x.poste || 'Poste à nommer'} · ${x.operation || 'Opération à décrire'}`}
                sub={n ? `${n} défaut(s) déclaré(s) au poste depuis le ${frDate(x.versionDate)}` : `${x.steps.length} étape(s) · ${photoCount(x)} photo(s) · ${x.habilitations.length} habilité(s)`}
                right={<><span className="block font-semibold text-slate-800">{x.author || 'Rédacteur à nommer'}</span>version du {frDate(x.versionDate)}</>}
                badge={<StatusBadge level={st.tone} text={st.label} />} />
            );
          })}
        </ul>
      </Card>
      <Method rule="Sans standard affiché, la qualité dépend de l'humeur et de la mémoire de chacun."
        steps={[['Observer le meilleur', 'Photographier les gestes du meilleur opérateur : le bon geste, et le piège classique.'], ['Une fiche A4 au poste', 'Des phrases courtes, 80 % d\'images, plastifiée face aux yeux de l\'opérateur.'], ['Habiliter en 3 questions', 'Montre-moi le standard, explique-moi le piège, fais la pièce devant moi (outil 4.3).']]}
        tips={['Une photo avec une flèche verte et une croix rouge vaut mieux qu\'un paragraphe.', 'Standard vivant : un défaut au poste, la fiche change sous 48 h.']} />
      {open && <SopSheet initial={open} onClose={() => setOpen(null)} onPrint={s => print(<SopPrint s={s} company={state.settings.companyName} />)} />}
      {printNode}
    </div>
  );
}

function PhotoBox({ value, onChange, label }: { value: string; onChange(v: string): void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <div className="space-y-1">
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className="h-28 w-full rounded-lg border border-slate-200 object-cover" />
          <button type="button" aria-label={`Retirer la photo : ${label}`} onClick={() => onChange('')} className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-600 hover:text-red-600"><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-delacour-gold hover:text-delacour-primary">
          <Camera size={18} />Photo
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" aria-label={label}
        onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { onChange(await readPhoto(f)); setError(''); } catch { setError('Image illisible.'); } }} />
      {error && <span className="text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

function SopSheet({ initial, onClose, onPrint }: { initial: Sop; onClose(): void; onPrint(s: Sop): void }) {
  const { state, update } = useStore();
  const [s, setS] = useState<Sop>(() => structuredClone(initial));
  const [reason, setReason] = useState('');
  const [hab, setHab] = useState({ person: '', tutor: '', date: isoDate(new Date()) });
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.sops[s.id];
  const set = (x: Partial<Sop>) => setS(y => ({ ...y, ...x }));
  const setStep = (i: number, x: Partial<SopStep>) => set({ steps: s.steps.map((st, j) => (j === i ? { ...st, ...x } : st)) });
  const up = (i: number) => { const n = [...s.steps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set({ steps: n }); };
  const stale = ncsSinceVersion(state, s);
  const valid = () => { if (!s.poste.trim()) { setError('Nommez le poste.'); return false; } return true; };
  const close = () => { if (JSON.stringify(s) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.sops[s.id] = s; }); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer l'instruction du poste ${s.poste} ?`)) { update(d => { delete d.sops[s.id]; }); onClose(); } };
  const bump = () => {
    if (!reason.trim()) return setError('Indiquez ce qui change dans la nouvelle version.');
    const today = isoDate(new Date());
    set({ version: s.version + 1, versionDate: today, history: [...(s.history.length ? s.history : [{ v: s.version, date: s.versionDate, reason: 'Création' }]), { v: s.version + 1, date: today, reason: reason.trim() }] });
    setReason(''); setError('');
  };
  const togglePpe = (p: string) => set({ ppe: s.ppe.includes(p) ? s.ppe.filter(x => x !== p) : [...s.ppe, p] });

  return (
    <Modal xwide onClose={close} title={isNew ? 'Nouvelle instruction de poste' : `Instruction · ${s.poste}`}
      subtitle={`${sopVersion(s)} du ${frDate(s.versionDate)} · ${processLabel(s.processId)}`}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={() => valid() && onPrint(s)}><Printer size={14} />Fiche A4</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        {stale.length > 0 && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-800"><strong>Standard à mettre à jour :</strong> {stale.map(n => `${n.ref} (${n.description})`).join(', ')} déclaré(s) au poste depuis cette version. Ajoutez la parade et passez à la version suivante.</p>
        )}
        <section className="grid gap-3 sm:grid-cols-4">
          <Field label="Poste"><input className={inputCls} value={s.poste} onChange={e => set({ poste: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Opération"><input className={inputCls} value={s.operation} onChange={e => set({ operation: e.target.value })} /></Field></div>
          <Field label="Processus"><select className={inputCls} value={s.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}</select></Field>
          <Field label="Rédigée avec (meilleur opérateur)"><input className={inputCls} value={s.author} list="people" onChange={e => set({ author: e.target.value })} /></Field>
          <Field label="Validée par"><input className={inputCls} value={s.validatedBy} list="people" onChange={e => set({ validatedBy: e.target.value })} /></Field>
        </section>

        <section className="space-y-2">
          <SubTitle>Les étapes du poste</SubTitle>
          <ol className="space-y-2">
            {s.steps.map((st, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_140px]">
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <span className="w-5 shrink-0 text-xs font-bold text-delacour-primary">{i + 1}.</span>
                    <input className={inputCls} value={st.op} placeholder="Opération clé" aria-label={`Étape ${i + 1} : opération`} onChange={e => setStep(i, { op: e.target.value })} />
                    <button type="button" aria-label="Monter cette étape" disabled={i === 0} onClick={() => up(i)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Retirer cette étape" onClick={() => set({ steps: s.steps.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                  <input className={inputCls} value={st.how} placeholder="Comment faire (phrase courte)" aria-label={`Étape ${i + 1} : comment`} onChange={e => setStep(i, { how: e.target.value })} />
                  <input className={inputCls} value={st.watch} placeholder="Point de vigilance" aria-label={`Étape ${i + 1} : vigilance`} onChange={e => setStep(i, { watch: e.target.value })} />
                  <input className={`${inputCls} sm:col-span-2`} value={st.check} placeholder="Autocontrôle" aria-label={`Étape ${i + 1} : autocontrôle`} onChange={e => setStep(i, { check: e.target.value })} />
                </div>
                <PhotoBox value={st.photo} label={`Étape ${i + 1}`} onChange={v => setStep(i, { photo: v })} />
              </li>
            ))}
          </ol>
          <Button className="!px-2 !py-1" onClick={() => set({ steps: [...s.steps, { op: '', how: '', watch: '', check: '', photo: '' }] })}><Plus size={13} />Ajouter une étape</Button>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border-2 border-emerald-200 p-2">
            <span className="text-xs font-bold text-emerald-800">Le bon geste</span>
            <textarea className={`${inputCls} min-h-[56px]`} value={s.good} onChange={e => set({ good: e.target.value })} aria-label="Le bon geste" />
            <PhotoBox value={s.goodPhoto} label="Le bon geste" onChange={v => set({ goodPhoto: v })} />
          </div>
          <div className="space-y-1.5 rounded-lg border-2 border-red-200 p-2">
            <span className="text-xs font-bold text-red-800">Le piège à éviter</span>
            <textarea className={`${inputCls} min-h-[56px]`} value={s.trap} onChange={e => set({ trap: e.target.value })} aria-label="Le piège à éviter" />
            <PhotoBox value={s.trapPhoto} label="Le piège à éviter" onChange={v => set({ trapPhoto: v })} />
          </div>
        </section>

        <section className="space-y-1.5">
          <SubTitle>Équipements de protection obligatoires</SubTitle>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...DEFAULT_PPE, 'Protections auditives', 'Masque', 'Blouse ou tablier', ...s.ppe])].map(p => (
              <button key={p} type="button" aria-pressed={s.ppe.includes(p)} onClick={() => togglePpe(p)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.ppe.includes(p) ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{p}</button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <SubTitle>Personnes habilitées au poste</SubTitle>
            {s.habilitations.length === 0 && <p className="text-[11px] text-slate-500">Personne pour l'instant.</p>}
            <ul className="space-y-1">
              {s.habilitations.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-slate-700">
                  <span className="min-w-0 flex-1"><strong>{h.person}</strong>, tuteur {h.tutor || '—'}, le {frDate(h.date)}</span>
                  <button type="button" aria-label={`Retirer ${h.person}`} onClick={() => set({ habilitations: s.habilitations.filter((_, j) => j !== i) })} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X size={13} /></button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <input className={inputCls} value={hab.person} placeholder="Personne" list="people" aria-label="Personne habilitée" onChange={e => setHab({ ...hab, person: e.target.value })} />
              <input className={inputCls} value={hab.tutor} placeholder="Tuteur" list="people" aria-label="Tuteur" onChange={e => setHab({ ...hab, tutor: e.target.value })} />
              <Button className="!px-2" disabled={!hab.person.trim()} onClick={() => { set({ habilitations: [...s.habilitations, { ...hab, person: hab.person.trim() }] }); setHab({ person: '', tutor: '', date: isoDate(new Date()) }); }}><Plus size={13} /></Button>
            </div>
            <p className="text-[11px] text-slate-500">Habilitée = test en 3 questions réussi au poste (outil 4.3).</p>
          </div>
          <div className="space-y-1.5">
            <SubTitle>Versions</SubTitle>
            <ul className="space-y-0.5 text-[11px] text-slate-700">
              {(s.history.length ? s.history : [{ v: s.version, date: s.versionDate, reason: 'Création' }]).map(h => <li key={h.v}><span className="font-mono font-semibold">{sopVersion({ version: h.v })}</span> · {frDate(h.date)} · {h.reason}</li>)}
            </ul>
            <div className="flex gap-1.5">
              <input className={inputCls} value={reason} placeholder="Ce qui change (ex. : parade après la NC-2026-007)" aria-label="Motif de la nouvelle version" onChange={e => setReason(e.target.value)} />
              <Button className="shrink-0 !px-2" onClick={bump}>Nouvelle version</Button>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}

// The A4 sheet posted at the workstation
function SopPrint({ s, company }: { s: Sop; company: string }) {
  return (
    <div className="space-y-3 p-2 text-[10pt]">
      <header className="flex items-end justify-between border-b-2 border-delacour-primary pb-1.5">
        <div>
          <div className="text-[8pt] font-semibold text-slate-500">{company ? `${company} · ` : ''}Instruction de poste</div>
          <h1 className="text-[16pt] font-bold text-delacour-primary">{s.poste} · {s.operation}</h1>
        </div>
        <div className="text-right text-[8pt] text-slate-600">{sopVersion(s)} du {frDate(s.versionDate)}<br />Rédigée avec {s.author || '—'} · validée par {s.validatedBy || '—'}</div>
      </header>
      <ol className="grid grid-cols-2 gap-2">
        {s.steps.map((st, i) => (
          <li key={i} className="break-inside-avoid rounded border border-slate-300 p-1.5">
            {st.photo && <img src={st.photo} alt="" className="mb-1 h-32 w-full rounded object-cover" />}
            <div className="text-[11pt] font-bold"><span className="text-delacour-primary">{i + 1}.</span> {st.op}</div>
            <div>{st.how}</div>
            {st.watch && <div className="text-[9pt] font-semibold text-amber-800">Attention : {st.watch}</div>}
            {st.check && <div className="text-[9pt] text-slate-600">Autocontrôle : {st.check}</div>}
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        <div className="break-inside-avoid rounded border-2 border-emerald-600 p-1.5">
          <div className="font-bold text-emerald-800">Le bon geste</div>
          {s.goodPhoto && <img src={s.goodPhoto} alt="" className="my-1 h-28 w-full rounded object-cover" />}
          <div>{s.good}</div>
        </div>
        <div className="break-inside-avoid rounded border-2 border-red-600 p-1.5">
          <div className="font-bold text-red-800">Le piège à éviter</div>
          {s.trapPhoto && <img src={s.trapPhoto} alt="" className="my-1 h-28 w-full rounded object-cover" />}
          <div>{s.trap}</div>
        </div>
      </div>
      <footer className="flex justify-between border-t border-slate-300 pt-1 text-[9pt]">
        <span><strong>Protections obligatoires :</strong> {s.ppe.join(', ') || '—'}</span>
        <span>Habilités : {s.habilitations.map(h => h.person).join(', ') || '—'}</span>
      </footer>
    </div>
  );
}
