// The five tabs of a work instruction: the sheet itself, the workstation and its safety, the people, the posting, the life of the sheet.
import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Plus, Printer, ShieldCheck, X } from 'lucide-react';
import type { Sop, SopStage, State, Strokes } from '../../domain/types';
import {
  acknowledge, addSuggestion, answerSuggestion, archiveSop, bumpSop, canValidate, changes, concerned, displayState, fromSkill, habilitated, inform, logged, mustRead,
  ncsByStep, ncsSinceVersion, nextReview, ppeChoices, reopenSop, reviewed, reviewLate, sendToReview, setStage, snapshotOfPrevious, sopCfg, sopPhase, sopVersion, STAGES, validateSop,
  versionColor, PHASE_LABEL, OTHER_REASON, norm, SHORT_SENTENCE, wordCount, postSheet,
} from '../../domain/instructions';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { Button, Field, inputCls, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import { PpeIcon } from '../Ppe';
import { Qr } from '../Qr';
import { SignaturePad } from '../SignaturePad';
import { isLocalAddress, stationUrl, VersionPill } from './SopBits';
import { SopSteps } from './SopSteps';
import { pageOf, type PrintFormat } from './SopPrint';
import { Pic } from '../../photo/Pic';

export interface TabProps {
  s: Sop; set(x: Partial<Sop>): void;
  act(f: (s: Sop, by: string) => Sop): void;   // a move of the life of the sheet: applied to the saved sheet and to the one being edited
  commit(next: Sop): void;                     // writes this sheet now, edits included
  state: State; by: string; px: number; saved: Sop | undefined;
  print(f: PrintFormat): void; station(): void; test(): void;
}
const Sec = ({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) => <section className="space-y-2"><SubTitle>{title}</SubTitle>{hint && <p className="-mt-1 text-[11px] text-slate-500">{hint}</p>}{children}</section>;
const Counter = ({ text }: { text: string }) => { const n = wordCount(text); return n > SHORT_SENTENCE ? <span className="text-[11px] text-amber-800">{n} mots : une phrase courte se lit mieux au poste.</span> : null; };

// ---- 1. the sheet
export function ContentTab({ s, set, state, px }: TabProps) {
  const groups = [...new Set(Object.values(state.sops).map(x => x.group).filter(Boolean))] as string[];
  const lim = { good: '', limit: '', reject: '', goodPhoto: '', limitPhoto: '', rejectPhoto: '', ...s.limits };
  const setLim = (x: Partial<typeof lim>) => set({ limits: { ...lim, ...x } });
  const wrong = { stop: '', who: '', where: '', ...s.ifWrong };
  const setWrong = (x: Partial<typeof wrong>) => set({ ifWrong: { ...wrong, ...x } });
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-4">
        <Field label="Poste"><input className={inputCls} value={s.poste} onChange={e => set({ poste: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Opération"><input className={inputCls} value={s.operation} onChange={e => set({ operation: e.target.value })} /></Field></div>
        <Field label="Atelier, ligne ou zone"><input className={inputCls} value={s.group || ''} list="sop-groups" onChange={e => set({ group: e.target.value || undefined })} /></Field>
        <Field label="Rédigée avec (meilleur opérateur)"><input className={inputCls} value={s.author} list="people" onChange={e => set({ author: e.target.value })} /></Field>
        <Field label="Responsable de la mise à jour"><input className={inputCls} value={s.owner || ''} list="people" onChange={e => set({ owner: e.target.value || undefined })} /></Field>
        <Field label="Processus"><select className={inputCls} value={s.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}</select></Field>
        <datalist id="sop-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
      </section>
      <Sec title="1. Les étapes du poste"><SopSteps s={s} set={set} px={px} ncCount={ncsByStep(state, s)} /></Sec>
      <Sec title="2. Le bon geste et le piège">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border-2 border-emerald-200 p-2">
            <span className="text-xs font-bold text-emerald-800">✓ Le bon geste</span>
            <textarea className={`${inputCls} min-h-[56px]`} value={s.good} onChange={e => set({ good: e.target.value })} aria-label="Le bon geste" /><Counter text={s.good} />
            <PhotoBox value={s.goodPhoto} label="Le bon geste" px={px} onChange={v => set({ goodPhoto: v })} />
          </div>
          <div className="space-y-1.5 rounded-lg border-2 border-red-200 p-2">
            <span className="text-xs font-bold text-red-800">✗ Le piège à éviter</span>
            <textarea className={`${inputCls} min-h-[56px]`} value={s.trap} onChange={e => set({ trap: e.target.value })} aria-label="Le piège à éviter" /><Counter text={s.trap} />
            <PhotoBox value={s.trapPhoto} label="Le piège à éviter" px={px} onChange={v => set({ trapPhoto: v })} />
          </div>
        </div>
      </Sec>
      <details className="rounded-lg border border-slate-200 p-2" open={!!(s.limits && (lim.goodPhoto || lim.limitPhoto || lim.rejectPhoto || lim.good))}>
        <summary className="cursor-pointer text-xs font-bold text-slate-900">3. Pièce bonne, limite, à rebuter (photos de référence)</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([['good', 'goodPhoto', 'Pièce bonne', 'border-emerald-300'], ['limit', 'limitPhoto', 'Pièce limite', 'border-amber-300'], ['reject', 'rejectPhoto', 'Pièce à rebuter', 'border-red-300']] as const).map(([k, p, l, b]) => (
            <div key={k} className={`space-y-1.5 rounded-lg border-2 p-2 ${b}`}>
              <span className="text-xs font-bold text-slate-800">{l}</span>
              <PhotoBox value={lim[p]} label={l} px={px} onChange={v => setLim({ [p]: v })} />
              <input className={inputCls} value={lim[k]} placeholder="Ce qui la distingue" aria-label={`${l} : description`} onChange={e => setLim({ [k]: e.target.value })} />
            </div>
          ))}
        </div>
      </details>
      <details className="rounded-lg border border-slate-200 p-2" open={!!(wrong.stop || wrong.who || wrong.where)}>
        <summary className="cursor-pointer text-xs font-bold text-slate-900">4. Si ça ne va pas</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Field label="Quoi faire"><input className={inputCls} value={wrong.stop} placeholder="Arrêter et isoler la pièce" onChange={e => setWrong({ stop: e.target.value })} /></Field>
          <Field label="Qui prévenir"><input className={inputCls} value={wrong.who} list="people" placeholder="Nom et fonction" onChange={e => setWrong({ who: e.target.value })} /></Field>
          <Field label="Où mettre la pièce"><input className={inputCls} value={wrong.where} placeholder="Bac rouge de l'atelier" onChange={e => setWrong({ where: e.target.value })} /></Field>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">Sur l'écran du poste, un bouton déclare le défaut dans le bac rouge (outil 5.1), avec le poste et l'étape.</p>
      </details>
    </div>
  );
}

// ---- 2. the workstation and its safety
export function PostTab({ s, set, state, px }: TabProps) {
  const [other, setOther] = useState('');
  const togglePpe = (p: string) => set({ ppe: s.ppe.includes(p) ? s.ppe.filter(x => x !== p) : [...s.ppe, p], ppeNone: undefined });
  const risks = Object.values(state.risks).sort((a, b) => a.title.localeCompare(b.title));
  const mats = s.materials || [], vars = s.variants || [], links = s.links || [];
  return (
    <div className="space-y-5">
      <Sec title="Équipements de protection obligatoires">
        <div className="flex flex-wrap gap-1.5">
          {ppeChoices(state.params, s).map(p => (
            <button key={p} type="button" aria-pressed={s.ppe.includes(p)} onClick={() => togglePpe(p)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold max-sm:min-h-[44px] ${s.ppe.includes(p) ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}><PpeIcon label={p} size={16} />{p}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputCls} max-w-xs`} value={other} placeholder="Autre protection : précisez" aria-label="Autre protection" onChange={e => setOther(e.target.value)} />
          <Button className="!px-2" disabled={!other.trim()} onClick={() => { togglePpe(other.trim()); setOther(''); }}><Plus size={13} />Ajouter</Button>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-700"><input type="checkbox" checked={!!s.ppeNone} onChange={e => set({ ppeNone: e.target.checked || undefined, ppe: e.target.checked ? [] : s.ppe })} />Aucune protection requise à ce poste</label>
        </div>
      </Sec>
      <Sec title="Risques du poste et urgence" hint="Les risques sont ceux des Plans B (outil 1.2).">
        {risks.length ? (
          <div className="flex flex-wrap gap-1.5">
            {risks.map(r => { const on = (s.riskIds || []).includes(r.id); return (
              <button key={r.id} type="button" aria-pressed={on} onClick={() => set({ riskIds: on ? (s.riskIds || []).filter(x => x !== r.id) : [...(s.riskIds || []), r.id] })}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold max-sm:min-h-[44px] ${on ? 'border-amber-600 bg-amber-100 text-amber-950' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{on && <Check size={12} />}{r.title}</button>
            ); })}
          </div>
        ) : <p className="text-[11px] text-slate-500">Aucun risque dans l'outil 1.2 pour l'instant.</p>}
        <Field label="Consignes d'urgence" hint="Arrêt d'urgence, premiers secours, extincteur : où et comment."><textarea className={`${inputCls} min-h-[56px]`} value={s.emergency || ''} onChange={e => set({ emergency: e.target.value || undefined })} /></Field>
      </Sec>
      <Sec title="À avoir sous la main avant de commencer" hint="Outillage, matière, consommables, documents.">
        {mats.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_96px_auto] items-start gap-2">
            <input className={inputCls} value={m.label} placeholder="Ex. clé dynamométrique 2,5 Nm" aria-label="Matériel" onChange={e => set({ materials: mats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <PhotoBox value={m.photo} label={`Photo : ${m.label || 'matériel'}`} px={px} onChange={v => set({ materials: mats.map((x, j) => (j === i ? { ...x, photo: v } : x)) })} />
            <button type="button" aria-label="Retirer ce matériel" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => set({ materials: mats.filter((_, j) => j !== i) })}><X size={14} /></button>
          </div>
        ))}
        <Button className="!px-2 !py-1" onClick={() => set({ materials: [...mats, { label: '', photo: '' }] })}><Plus size={13} />Ajouter du matériel</Button>
      </Sec>
      <Sec title="Ce qui change selon la référence, le client ou la machine" hint="Le socle est commun : ne noter que les différences.">
        {vars.map((v, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_96px_auto] sm:items-start">
            <input className={inputCls} value={v.name} placeholder="Référence, client ou machine" aria-label="Variante" onChange={e => set({ variants: vars.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <input className={inputCls} value={v.diff} placeholder="Ce qui change" aria-label="Ce qui change" onChange={e => set({ variants: vars.map((x, j) => (j === i ? { ...x, diff: e.target.value } : x)) })} />
            <PhotoBox value={v.photo} label={`Photo : ${v.name || 'variante'}`} px={px} onChange={x => set({ variants: vars.map((y, j) => (j === i ? { ...y, photo: x } : y)) })} />
            <button type="button" aria-label="Retirer cette variante" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => set({ variants: vars.filter((_, j) => j !== i) })}><X size={14} /></button>
          </div>
        ))}
        <Button className="!px-2 !py-1" onClick={() => set({ variants: [...vars, { name: '', diff: '', photo: '' }] })}><Plus size={13} />Ajouter une variante</Button>
      </Sec>
      <Sec title="Documents liés" hint="Plan, notice, fiche de données de sécurité : un lien suffit.">
        {links.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
            <input className={inputCls} value={l.label} placeholder="Nom du document" aria-label="Nom du document" onChange={e => set({ links: links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <input className={inputCls} value={l.url} placeholder="https://…" aria-label="Lien du document" onChange={e => set({ links: links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
            <button type="button" aria-label="Retirer ce document" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => set({ links: links.filter((_, j) => j !== i) })}><X size={14} /></button>
          </div>
        ))}
        <Button className="!px-2 !py-1" onClick={() => set({ links: [...links, { label: '', url: '' }] })}><Plus size={13} />Ajouter un document</Button>
      </Sec>
    </div>
  );
}

// ---- 3. the people
export function PeopleTab({ s, set, act, state, by, test }: TabProps) {
  const [add, setAdd] = useState({ person: '', tutor: '', stage: 'seen' as SopStage });
  const [sign, setSign] = useState(false);
  const [sig, setSig] = useState<Strokes | undefined>();
  const cfg = sopCfg(state.params), today = isoDate(new Date()), active = sopPhase(s) === 'active';
  const skillNames = fromSkill(state, s), need = mustRead(state, s), names = concerned(state, s);
  const read = (n: string) => (s.acks || []).find(a => a.v === s.version && norm(a.person) === norm(n));
  const setRow = (i: number, x: Partial<Sop['habilitations'][number]>) => set({ habilitations: s.habilitations.map((h, j) => (j === i ? { ...h, ...x } : h)) });
  return (
    <div className="space-y-5">
      <Sec title="Personnes autorisées à travailler seules">
        <Field label="Compétence de la matrice de polyvalence (4.2)" hint={`Les personnes au niveau ${cfg.habLevel} ou plus sur cette compétence sont habilitées d'office.`}>
          <select className={inputCls} value={s.skillId || ''} onChange={e => set({ skillId: e.target.value || undefined })}>
            <option value="">Aucune</option>{Object.values(state.skills).map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </Field>
        {skillNames.length > 0 && <p className="text-[11px] text-slate-700">Depuis la polyvalence : <strong>{skillNames.join(', ')}</strong>.</p>}
        <p className="text-[11px] text-slate-600">{habilitated(state, s).length} personne(s) habilitée(s) sur {cfg.minPeople} souhaitée(s) au minimum.</p>
      </Sec>
      <Sec title="Parcours de chaque personne" hint="A regardé faire, a fait avec le tuteur, fait seul, peut former. Seules les personnes qui font seules ou forment sont habilitées.">
        {s.habilitations.length === 0 && <p className="text-[11px] text-slate-500">Personne pour l'instant.</p>}
        <ul className="space-y-1.5">
          {s.habilitations.map((h, i) => (
            <li key={i} className="grid grid-cols-2 items-end gap-1.5 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr_auto]">
              <strong className="col-span-2 self-center text-xs text-slate-900 sm:col-span-1">{h.person}</strong>
              <label className="block"><span className="block text-[11px] text-slate-500">Étape</span>
                <select className={inputCls} value={h.stage ?? 'alone'} aria-label={`Étape de ${h.person}`} onChange={e => act(x => setStage(x, h.person, e.target.value as SopStage, { by }))}>{STAGES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></label>
              <label className="block"><span className="block text-[11px] text-slate-500">Tuteur</span><input className={inputCls} value={h.tutor} list="people" onChange={e => setRow(i, { tutor: e.target.value })} /></label>
              <label className="block"><span className="block text-[11px] text-slate-500">Depuis le</span><input type="date" className={inputCls} value={h.date} onChange={e => setRow(i, { date: e.target.value })} /></label>
              <label className="block"><span className="block text-[11px] text-slate-500">À renouveler le</span><input type="date" className={inputCls} value={h.until || ''} onChange={e => setRow(i, { until: e.target.value || undefined })} /></label>
              <button type="button" aria-label={`Retirer ${h.person}`} onClick={() => act(x => setStage(x, h.person, null, { by }))} className="justify-self-end rounded p-1.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input className={inputCls} value={add.person} placeholder="Personne" list="people" aria-label="Personne" onChange={e => setAdd({ ...add, person: e.target.value })} />
          <input className={inputCls} value={add.tutor} placeholder="Tuteur" list="people" aria-label="Tuteur" onChange={e => setAdd({ ...add, tutor: e.target.value })} />
          <select className={`${inputCls} col-span-2 sm:col-span-1`} value={add.stage} aria-label="Étape" onChange={e => setAdd({ ...add, stage: e.target.value as SopStage })}>{STAGES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
          <Button className="!px-2" aria-label="Ajouter la personne" disabled={!add.person.trim()} onClick={() => { act(x => setStage(x, add.person, add.stage, { tutor: add.tutor, by, date: today })); setAdd({ person: '', tutor: '', stage: 'seen' }); }}><Plus size={13} /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={test}><ShieldCheck size={14} />Passer le test d'autonomie</Button>
          <span className="text-[11px] text-slate-500">3 questions écrites d'après la fiche, puis des photos « bon ou pas bon ? ». Réussi : la personne est habilitée.</span>
        </div>
      </Sec>
      <Sec title={`Lu et compris : ${sopVersion(s)}`} hint={active ? 'Un tap sur le nom de la personne qui a lu la version en vigueur.' : 'La lecture commence quand l\'instruction est en vigueur.'}>
        {active && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {names.length === 0 && <span className="text-[11px] text-slate-500">Aucune personne concernée : ajoutez des habilités ou une compétence.</span>}
              {names.map(n => { const a = read(n), need1 = need.some(x => norm(x) === norm(n)); return a
                ? <span key={n} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800"><Check size={12} />{n} · {frDate(a.date)}{a.sig ? ' · signé' : ''}</span>
                : <button key={n} type="button" disabled={sign && !sig?.length} title={sign && !sig?.length ? 'Signez d\'abord' : 'Noter la lecture'} onClick={() => { act(x => acknowledge(x, n, today, sig)); setSig(undefined); }}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold max-sm:min-h-[44px] disabled:opacity-50 ${need1 ? 'border-amber-600 bg-amber-50 text-amber-950 hover:bg-amber-100' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{n} : lu et compris</button>; })}
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-700"><input type="checkbox" checked={sign} onChange={e => { setSign(e.target.checked); setSig(undefined); }} />Faire signer au doigt</label>
            {sign && <SignaturePad value={sig} onChange={setSig} label="Signature de la personne qui a lu" />}
            <div className="flex gap-1.5">
              <FreeName onAdd={n => act(x => acknowledge(x, n, today, sig))} />
            </div>
          </>
        )}
      </Sec>
    </div>
  );
}
function FreeName({ onAdd }: { onAdd(n: string): void }) {
  const [n, setN] = useState('');
  return (<><input className={`${inputCls} max-w-xs`} value={n} list="people" placeholder="Autre personne qui a lu" aria-label="Autre personne qui a lu" onChange={e => setN(e.target.value)} /><Button className="shrink-0 !px-2" disabled={!n.trim()} onClick={() => { onAdd(n); setN(''); }}>Lu et compris</Button></>);
}

// ---- 4. posting at the workstation
export function DisplayTab({ s, set, act, state, by, print, station, saved }: TabProps) {
  const [fmt, setFmt] = useState<PrintFormat>({ size: 'A4', landscape: false });
  const [posting, setPosting] = useState(false);
  const [removed, setRemoved] = useState(true);
  const cfg = sopCfg(state.params), d = displayState(s), color = versionColor(s.version), prev = versionColor(Math.max(1, s.version - 1));
  const url = stationUrl(s.id), active = sopPhase(s) === 'active';
  return (
    <div className="space-y-5">
      <Sec title="Fiche affichée au poste">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-2.5 text-xs">
          <VersionPill sop={s} className="!text-sm" />
          <span className="text-slate-800">Fiche à poser : <strong>{sopVersion(s)}</strong>, cadre <strong>{color.name}</strong>.</span>
          {d === 'ok' && <span className="font-semibold text-emerald-800">Posée le {frDate(s.displayedAt!)}{s.displayedBy ? ` · ${s.displayedBy}` : ''}</span>}
          {d === 'old' && <span className="font-semibold text-red-700">Au poste : une fiche du {frDate(s.displayedAt!)}, avant la {sopVersion(s)}. À retirer : cadre {prev.name}.</span>}
          {d === 'never' && <span className="font-semibold text-amber-800">Aucune date d'affichage enregistrée.</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="radiogroup" aria-label="Format">
            {(['A5', 'A4', 'A3'] as const).map(z => <button key={z} type="button" role="radio" aria-checked={fmt.size === z} onClick={() => setFmt({ ...fmt, size: z })} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold max-sm:min-h-[44px] ${fmt.size === z ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{z}</button>)}
          </div>
          <div className="flex gap-1" role="radiogroup" aria-label="Sens">
            {([[false, 'Portrait'], [true, 'Paysage']] as const).map(([v, l]) => <button key={l} type="button" role="radio" aria-checked={fmt.landscape === v} onClick={() => setFmt({ ...fmt, landscape: v })} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold max-sm:min-h-[44px] ${fmt.landscape === v ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>)}
          </div>
          <Button onClick={() => print(fmt)} disabled={!s.poste.trim()}><Printer size={14} />Imprimer ({pageOf(fmt)})</Button>
          <Button kind="primary" onClick={() => setPosting(!posting)} disabled={!saved}><Check size={14} />J'ai posé la fiche</Button>
        </div>
        {posting && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-2.5 text-xs">
            <span>La {sopVersion(s)} est posée au poste aujourd'hui, par <strong>{by}</strong>.</span>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={removed} onChange={e => setRemoved(e.target.checked)} />{s.version > 1 ? `Ancienne fiche (cadre ${prev.name}) retirée` : 'Rien à retirer'}</label>
            <Button kind="primary" onClick={() => { act(x => postSheet(x, by, removed)); setPosting(false); }}>Noter l'affichage</Button>
          </div>
        )}
        <p className="text-[11px] text-slate-500">Le cadre de la fiche change de couleur à chaque version : une fiche qui n'a pas la bonne couleur est l'ancienne.</p>
      </Sec>
      <Sec title="QR code et écran du poste" hint="Le QR code imprimé sur la fiche ouvre la dernière version en plein écran : étapes en grand, lu et compris, remarque, déclaration d'un défaut.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-slate-200 p-2"><Qr text={url} size={112} label={`QR code de l'instruction ${s.poste}`} /></div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="break-all font-mono text-[11px] text-slate-600">{url}</p>
            {isLocalAddress() && <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">Cette adresse ne marche que sur cet ordinateur. Une fois l'application en ligne, le QR code s'ouvrira sur n'importe quel téléphone : réimprimer alors les fiches.</p>}
            <Button onClick={station}><Monitor size={14} />Ouvrir en plein écran</Button>
          </div>
        </div>
      </Sec>
      {active && s.version > 1 && (
        <Sec title="Point de 5 minutes avec l'équipe">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {s.briefed?.v === s.version ? <span className="font-semibold text-emerald-800">Équipe informée de la {sopVersion(s)} le {frDate(s.briefed.date)} · {s.briefed.by}</span> : <span className="text-amber-900">Équipe pas encore informée de la {sopVersion(s)}.</span>}
            {s.briefed?.v !== s.version && <Button onClick={() => act(x => inform(x, by))}>Équipe informée aujourd'hui</Button>}
          </div>
        </Sec>
      )}
      {cfg.plan && (
        <Sec title="Place sur le plan de l'atelier" hint="Toucher le plan pour placer le poste.">
          <div className="relative mx-auto max-w-xl cursor-crosshair" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); set({ pin: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height } }); }}>
            <Pic value={cfg.plan} alt="Plan de l'atelier" size="v" className="w-full rounded-lg border border-slate-200" />
            {s.pin && <span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-delacour-primary shadow" style={{ left: `${s.pin.x * 100}%`, top: `${s.pin.y * 100}%` }} />}
          </div>
          {s.pin && <Button kind="ghost" className="!px-2 !py-1" onClick={() => set({ pin: undefined })}>Retirer du plan</Button>}
        </Sec>
      )}
    </div>
  );
}

// ---- 5. the life of the sheet
export function LifeTab({ s, act, commit, state, by, saved }: TabProps) {
  const cfg = sopCfg(state.params), phase = sopPhase(s);
  const [who, setWho] = useState(s.validatedBy || (by === 'anonyme' ? '' : by));
  // no reason is proposed unless a defect was declared since this version: a new version is a decision, not a default
  const [kind, setKind] = useState(() => (ncsSinceVersion(state, s).length ? cfg.reasons[0] : '')), [detail, setDetail] = useState('');
  const sent = useRef(s.version);   // the version a change was sent from: a second tap on the same version does nothing
  const [text, setText] = useState(''), [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const prev = snapshotOfPrevious(s), diff = prev ? changes(prev, s) : [];
  const sugs = s.suggestions || [], journal = [...(s.journal || [])].reverse();
  const fail = canValidate(s);
  const validate = () => { if (fail) return setError(fail); if (!who.trim()) return setError('Indiquez qui valide.'); setError(''); commit(validateSop(s, by, who)); };
  const bump = () => {
    if (!kind) return setError('Choisissez le motif de la nouvelle version.');
    if (kind === OTHER_REASON && !detail.trim()) return setError('« Autre » : précisez ce qui change.');
    if (sent.current !== s.version) return;   // already sent
    sent.current = s.version + 1;
    setError(''); commit(bumpSop(s, saved, { kind, detail, by })); setDetail(''); setKind('');
  };
  useEffect(() => { sent.current = s.version; }, [s.version]);
  return (
    <div className="space-y-5">
      <Sec title={`État : ${PHASE_LABEL[phase]}`} hint="Brouillon, à valider, en vigueur, archivée. Un brouillon s'enregistre tout seul.">
        <div className="flex flex-wrap items-end gap-2">
          {(phase === 'draft' || phase === 'review') && (
            <>
              <Field label="Validée par"><input className={`${inputCls} w-48`} value={who} list="people" onChange={e => setWho(e.target.value)} /></Field>
              <Button kind="primary" onClick={validate}><Check size={14} />Valider et mettre en vigueur</Button>
              {phase === 'draft' && <Button onClick={() => { if (fail) setError(fail); else { setError(''); commit(sendToReview(s, by)); } }}>Envoyer à validation</Button>}
              {phase === 'review' && <Button onClick={() => commit(logged({ ...s, phase: 'draft' }, by, 'Reprise en brouillon'))}>Reprendre en brouillon</Button>}
            </>
          )}
          {phase === 'active' && <Button onClick={() => { if (window.confirm(`Archiver l'instruction du poste ${s.poste} ? Elle ne sera plus proposée, son historique reste.`)) commit(archiveSop(s, by)); }}>Archiver</Button>}
          {phase === 'archived' && <Button onClick={() => commit(reopenSop(s, by))}>Rouvrir pour validation</Button>}
          {error && <span role="alert" className="text-[11px] font-semibold text-red-700">{error}</span>}
        </div>
        {phase === 'active' && <p className="text-[11px] text-slate-600">En vigueur depuis le {frDate(s.versionDate)}, validée par {s.validatedBy || '—'}{s.validatedAt ? ` le ${frDate(s.validatedAt)}` : ''}. Prochaine relecture : {frDate(nextReview(s, state.params))}.</p>}
      </Sec>
      {phase === 'active' && (
        <Sec title="Nouvelle version" hint="Modifier la fiche, puis donner le motif : le contenu remplacé est gardé pour montrer ce qui change.">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
            <select className={inputCls} value={kind} aria-label="Motif de la nouvelle version" onChange={e => setKind(e.target.value)}><option value="">Choisir le motif…</option>{cfg.reasons.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <input className={inputCls} value={detail} placeholder={kind === OTHER_REASON ? 'Précisez ce qui change' : 'Détail (ex. : parade après la NC-2026-007)'} aria-label="Détail du motif" onChange={e => setDetail(e.target.value)} />
            <Button kind="primary" disabled={!kind} onClick={bump}>Passer à la {sopVersion({ version: s.version + 1 })}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {reviewLate(s, state.params) ? <span className="font-semibold text-amber-800">Pas relue depuis plus de {cfg.reviewMonths} mois.</span> : <span className="text-slate-600">Relue le {frDate(s.reviewedAt && s.reviewedAt > s.versionDate ? s.reviewedAt : s.versionDate)}.</span>}
            <Button className="!py-1" onClick={() => act(x => reviewed(x, by))}>Relue, rien ne change</Button>
          </div>
        </Sec>
      )}
      <Sec title="Versions">
        <ul className="space-y-1 text-[11px] text-slate-700">
          {[...(s.history.length ? s.history : [{ v: s.version, date: s.versionDate, reason: 'Création', by: '' }])].sort((a, b) => b.v - a.v).map(h => (
            <li key={h.v} className="flex flex-wrap items-center gap-1.5"><VersionPill sop={s} v={h.v} />{frDate(h.date)} · {h.reason}{h.by ? ` · ${h.by}` : ''}</li>
          ))}
        </ul>
        {s.version > 1 && (
          <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
            <strong>Ce qui a changé depuis la {sopVersion({ version: s.version - 1 })} :</strong>{' '}
            {prev ? (diff.length ? <ul className="mt-1 list-disc pl-4">{diff.map(x => <li key={x}>{x}</li>)}</ul> : 'rien dans le contenu pour l\'instant (motif seul).') : 'le contenu de la version précédente n\'a pas été gardé.'}
          </div>
        )}
      </Sec>
      <Sec title={`Remarques des personnes du poste : ${sugs.length}`} hint="Une remarque retenue change la fiche ; une remarque refusée reçoit une réponse.">
        <ul className="space-y-2">
          {sugs.map(g => <Remark key={g.id} g={g} onAnswer={(st, a) => act(x => answerSuggestion(x, g.id, st, a, by))} />)}
        </ul>
        <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
          <span className="text-[11px] font-semibold text-slate-700">Noter une remarque (de {by})</span>
          <textarea className={`${inputCls} min-h-[48px]`} value={text} placeholder="Ex. : le gabarit est lourd à tenir toute la journée" aria-label="Remarque" onChange={e => setText(e.target.value)} />
          <div className="max-w-[10rem]"><PhotoBox value={photo} label="Photo de la remarque" onChange={setPhoto} /></div>
          <Button disabled={!text.trim() || !saved} onClick={() => { act(x => addSuggestion(x, by, text, photo)); setText(''); setPhoto(''); }}>Enregistrer la remarque</Button>
        </div>
      </Sec>
      <details className="rounded-lg border border-slate-200 p-2">
        <summary className="cursor-pointer text-xs font-bold text-slate-900">Journal de la fiche : {journal.length}</summary>
        <ul className="mt-2 space-y-0.5 text-[11px] text-slate-700">{journal.length ? journal.map((j, i) => <li key={i}><span className="font-mono text-slate-500">{frDate(j.at.slice(0, 10))}</span> · {j.by} · {j.what}</li>) : <li className="text-slate-500">Rien d'enregistré.</li>}</ul>
      </details>
    </div>
  );
}
function Remark({ g, onAnswer }: { g: NonNullable<Sop['suggestions']>[number]; onAnswer(st: 'kept' | 'declined', answer: string): void }) {
  const [a, setA] = useState('');
  return (
    <li className="flex gap-2 rounded-lg border border-slate-200 p-2 text-[11px]">
      {g.photo && <Pic value={g.photo} alt="" size="t" className="h-14 w-14 shrink-0 rounded" />}
      <div className="min-w-0 flex-1 space-y-1">
        <div><strong>{g.by || 'Un opérateur'}</strong> · {frDate(g.date)} · <span className={g.status === 'new' ? 'font-semibold text-amber-800' : g.status === 'kept' ? 'font-semibold text-emerald-800' : 'font-semibold text-slate-600'}>{{ new: 'Sans réponse', kept: 'Retenue', declined: 'Non retenue' }[g.status]}</span></div>
        <p className="text-slate-800">{g.text}</p>
        {g.status === 'new' ? (
          <div className="flex flex-wrap gap-1.5">
            <input className={`${inputCls} min-w-[10rem] flex-1`} value={a} placeholder="Réponse à la personne" aria-label="Réponse à la remarque" onChange={e => setA(e.target.value)} />
            <Button className="!py-1" onClick={() => onAnswer('kept', a)}>Retenue</Button>
            <Button className="!py-1" onClick={() => onAnswer('declined', a)}>Non retenue</Button>
          </div>
        ) : g.answer ? <p className="text-slate-600">Réponse ({frDate(g.answeredAt)}) : {g.answer}</p> : null}
      </div>
    </li>
  );
}
