// "Signaler un problème": any person reports a problem on a piece of equipment in about ten seconds (photo, nature, gravity in three big buttons, a word,
// who). Also holds the few pieces shared by the field screens of tool 3.3 (the full-screen routine and the tab of anomalies): big buttons to pick a person,
// a list that ends with "Autre, précisez", a text field that writes to the store a moment after the last key, small groups of choices.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, OctagonX, Phone, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import type { AnomalySeverity, Equipment, State } from '../../domain/types';
import { maintCfg, reportAnomaly, reportRefusal, routineOwner, txt } from '../../domain/maintenance';
import { telOf } from '../../domain/contacts';
import { isoDate } from '../../domain/periods';
import { norm } from '../../domain/instructions';
import { nowLocal } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import { PhotoBox } from '../PhotoBox';
import { inputCls, NewTab, useDialogFocus } from '../common';
import type { Nav } from '../tools';
import { StorageNote, useEqMove, useUndo } from './EqBits';

const OTHER = 'Autre';
// A big button of the field screens, usable with gloves (same as the full-screen sheet of 3.2). Disabled: a grey slab with its text still readable (4,5:1), never faded
export const BIG = 'inline-flex min-h-[64px] items-center justify-center gap-2 rounded-xl border-2 px-5 text-lg font-bold disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600';
const nameOf = (e: Equipment) => e.name.trim() || 'Équipement sans nom';
// The number of a person in the directory (an internal contact first), empty when it is not known
const phoneOf = (s: State, who: string): string => {
  const w = norm(who), cs = Object.values(s.contacts || {}).filter(c => w && norm(c.name) === w && telOf(c.phone || ''));
  return (cs.find(c => c.category === 'interne') ?? cs[0])?.phone ?? '';
};

// The people one can pick for a piece of equipment: holder, deputy, manager, then the person who owns this device (each name once, roles joined)
export function peopleOf(e: Equipment, author: string): { name: string; role: string }[] {
  const out: { name: string; role: string }[] = [];
  const add = (name: string | undefined, role: string) => {
    const n = txt(name).trim(), x = out.find(o => norm(o.name) === norm(n));
    if (!n) return;
    if (x) x.role += ` · ${role}`; else out.push({ name: n, role });
  };
  add(e.operator, 'Titulaire'); add(e.deputy, 'Suppléant'); add(e.manager, 'Responsable');
  if (author && author !== 'anonyme') add(author, 'Cet appareil');
  return out;
}

// Who: one big button per person, then "Autre" which opens a field
export function PeoplePick({ people, value, onChange, label }: { people: { name: string; role: string }[]; value: string; onChange(v: string): void; label: string }) {
  const [other, setOther] = useState(() => (!!value.trim() && !people.some(p => p.name === value)) || people.length === 0);
  const id = useId();
  const btn = (on: boolean) => `flex min-h-[64px] min-w-[8rem] flex-1 flex-col items-center justify-center rounded-xl border-2 px-3 text-lg font-bold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  return (
    <div role="radiogroup" aria-labelledby={id} className="space-y-2">
      <div id={id} className="text-base font-semibold text-slate-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {people.map(p => (
          <button key={p.name} type="button" role="radio" aria-checked={!other && value === p.name} className={btn(!other && value === p.name)} onClick={() => { setOther(false); onChange(p.name); }}>
            {p.name}<span className="text-[11px] font-semibold">{p.role}</span>
          </button>
        ))}
        <button type="button" role="radio" aria-checked={other} className={btn(other)} onClick={() => { setOther(true); if (people.some(p => p.name === value)) onChange(''); }}>Autre</button>
      </div>
      {other && <input className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-gold" value={value} list="people" placeholder="Autre : écrire le nom" aria-label={`${label} : autre personne`} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

// A choice in a list that ends with "Autre": chips (field screens) or a select (sheets). "Autre" opens a field to specify; the value is the typed text
// ("Autre" while nothing is typed)
export function Pick({ list, value, onChange, label, chips = false }: { list: string[]; value: string; onChange(v: string): void; label: string; chips?: boolean }) {
  const known = list.filter(x => norm(x) !== norm(OTHER));
  const [other, setOther] = useState(() => !!value && !known.includes(value));
  const pickOther = () => { setOther(true); if (!value || known.includes(value)) onChange(OTHER); };
  const field = (
    <input className={chips ? 'w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-gold' : inputCls} value={value === OTHER ? '' : value} placeholder="Autre : précisez" aria-label={`${label} : précisez`}
      onChange={e => onChange(e.target.value.trim() ? e.target.value : OTHER)} />
  );
  if (!chips) {
    return (
      <div className="space-y-1.5">
        <select className={inputCls} value={other ? OTHER : value} aria-label={label} onChange={e => { if (e.target.value === OTHER) pickOther(); else { setOther(false); onChange(e.target.value); } }}>
          <option value="">Choisir…</option>
          {known.map(x => <option key={x} value={x}>{x}</option>)}
          <option value={OTHER}>Autre, précisez</option>
        </select>
        {other && field}
      </div>
    );
  }
  const chip = (on: boolean) => `min-h-[48px] rounded-full border-2 px-4 text-base font-semibold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {known.map(x => <button key={x} type="button" role="radio" aria-checked={!other && value === x} className={chip(!other && value === x)} onClick={() => { setOther(false); onChange(value === x ? '' : x); }}>{x}</button>)}
        <button type="button" role="radio" aria-checked={other} className={chip(other)} onClick={() => (other ? (setOther(false), onChange('')) : pickOther())}>Autre, précisez</button>
      </div>
      {other && field}
    </div>
  );
}

// A small group of choices; a second touch on the chosen one clears it
export function Seg<T extends string>({ value, onChange, items, label }: { value: T | undefined; onChange(v: T | undefined): void; items: [T, string][]; label: string }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
      {items.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(value === k ? undefined : k)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${value === k ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
      ))}
    </div>
  );
}

// A text field that keeps what is typed and writes it a moment after the last key, when it is left and when the screen goes away (also when the page is left or
// goes to the background: a phone may drop the page when the camera opens): nothing typed is lost and the store is not rewritten at every key. Remount it (key) to show another value.
export function Typed({ value, onSave, area = false, className = inputCls, rows = 3, ...p }: {
  value: string; onSave(v: string): void; area?: boolean; className?: string; rows?: number; placeholder?: string; list?: string; id?: string; 'aria-label'?: string;
}) {
  const [v, setV] = useState(value), cur = useRef(value), sent = useRef(value), timer = useRef(0), save = useRef(onSave);
  save.current = onSave;
  const flush = () => { window.clearTimeout(timer.current); if (cur.current !== sent.current) { sent.current = cur.current; save.current(cur.current); } };
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hide);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const common = { value: v, onBlur: flush, className, id: p.id, 'aria-label': p['aria-label'], placeholder: p.placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setV(e.target.value); cur.current = e.target.value; window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 700); } };
  return area ? <textarea {...common} rows={rows} /> : <input {...common} list={p.list} />;
}

const SEV: { k: AnomalySeverity; label: string; fact: string; Icon: typeof Check; on: string; off: string }[] = [
  { k: 'degraded', label: 'Tourne mal', fact: "Marche, mais pas comme d'habitude", Icon: TriangleAlert, on: 'border-amber-800 bg-amber-700 text-white', off: 'border-amber-700 bg-white text-amber-900' },
  { k: 'stopped', label: "À l'arrêt", fact: "Arrêté : l'arrêt est noté", Icon: OctagonX, on: 'border-red-900 bg-red-700 text-white', off: 'border-red-700 bg-white text-red-800' },
  { k: 'danger', label: 'Danger', fact: 'Risque pour une personne', Icon: ShieldAlert, on: 'border-red-950 bg-red-900 text-white', off: 'border-red-900 bg-white text-red-950' },
];

// The report being written (photo, nature, gravity, a word) is kept in this browser while it is typed, under the id of the equipment, and taken back when the window opens
// again (a call, a locked phone, the camera that drops the page): it is not part of the shared data and goes when the report is sent.
export const REPORT_DRAFT = 'DELACOUR_REPORT_DRAFT_';
type Draft = { photo?: string; nature?: string; severity?: AnomalySeverity; note?: string };
const text1 = (x: unknown) => (typeof x === 'string' ? x : '');
function readDraft(id: string): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(REPORT_DRAFT + id) || 'null');
    return d && typeof d === 'object' ? { photo: text1(d.photo), nature: text1(d.nature), note: text1(d.note), severity: SEV.some(s => s.k === d.severity) ? d.severity : undefined } : {};
  } catch { return {}; }
}
function writeDraft(id: string, d: Draft) {
  try {
    if (d.photo || d.nature || d.severity || d.note?.trim()) localStorage.setItem(REPORT_DRAFT + id, JSON.stringify(d)); else localStorage.removeItem(REPORT_DRAFT + id);
  } catch { /* storage unavailable or full: the report stays in this window */ }
}

export function ReportDialog({ eq, onClose, nav }: { eq: Equipment; onClose(): void; nav?: Nav }) {
  const { state, author, storageFull } = useStore();
  const { bar, offer } = useUndo();   // "Annuler ce signalement" lasts 8 seconds, like every other undo
  const move = useEqMove(offer);
  const [draft0] = useState(() => readDraft(eq.id));   // what was begun here before
  const [photo, setPhoto] = useState(draft0.photo ?? ''), [nature, setNature] = useState(draft0.nature ?? ''), [severity, setSeverity] = useState<AnomalySeverity | ''>(draft0.severity ?? ''), [note, setNote] = useState(draft0.note ?? '');
  const [resumed, setResumed] = useState(() => !!(draft0.photo || draft0.nature || draft0.severity || draft0.note?.trim()));
  const [who, setWho] = useState(author && author !== 'anonyme' ? author : '');
  const [sent, setSent] = useState<{ by: string; at: string; label: string; severity: AnomalySeverity; wasStopped: boolean } | null>(null);
  // written at every change, so that nothing depends on a last event (the page can be dropped at any moment); cleared once the report is sent
  useEffect(() => { if (!sent) writeDraft(eq.id, { photo, nature, severity: severity || undefined, note }); }, [photo, nature, severity, note, sent]); // eslint-disable-line react-hooks/exhaustive-deps
  const box = useRef<HTMLDivElement>(null), head = useRef<HTMLHeadingElement>(null), tid = useId(), hid = useId();
  const e = state?.equipments[eq.id] ?? eq, saved = !!state?.equipments[eq.id];
  useDialogFocus(box);   // the page behind is inert, the focus goes back to what opened the window at the closing
  // focus on the title at the opening; Escape closes only the top window
  useEffect(() => {
    head.current?.focus({ preventScroll: true });
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && box.current === [...document.querySelectorAll('[role=dialog]')].at(-1)) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const cfg = maintCfg(state.params), name = nameOf(e), people = peopleOf(e, author);
  const refusal = reportRefusal(e);   // a retired equipment takes no report: it would appear nowhere in the lists
  const noName = severity === 'danger' && !who.trim();   // a report of danger never goes out as "anonyme"
  const ready = !!severity && saved && !refusal && !!(photo || nature || note.trim()) && !noName;
  // why "Signaler" is grey, as a fact under the button
  const why = ready || refusal || !saved ? '' : !severity ? "La gravité n'est pas encore choisie." : !(photo || nature || note.trim()) ? 'Une photo, une nature ou un mot suffit.' : "Un danger ne part pas sans nom : « Qui signale ? » est vide.";
  // who to call for a danger or a stop: the person of the equipment (the deputy when the holder is away), with the number of the directory when it is known
  const boss = routineOwner(state, e, isoDate(new Date())), bossPhone = boss.who ? phoneOf(state, boss.who) : '';
  const bossLine = boss.who ? `Responsable : ${boss.who}${bossPhone ? `, ${bossPhone}` : ''}${boss.absent && !boss.deputy ? ', absent aujourd\'hui' : ''}`.replace(/\.?$/, '.') : "Aucun responsable n'est nommé sur la fiche de l'équipement.";   // (a name that ends with an initial keeps its one full stop)
  const send = () => {
    if (!severity || !ready) return;
    const by = who.trim() || author || 'anonyme', at = nowLocal(), label = (nature && norm(nature) !== norm(OTHER) ? nature : '') || note.trim().slice(0, 60) || 'Problème signalé';
    // the undo removes this anomaly (and the stop it caused, if nothing changed it since), not what others noted meanwhile
    const m = move(eq.id, 'Problème signalé', x => reportAnomaly(x, { label, severity, by, note: note.trim(), ...(nature ? { nature } : {}), ...(photo ? { photo } : {}) }, at), () => { writeDraft(eq.id, { photo, nature, severity, note }); onClose(); });   // taking the report back gives it back to be rewritten
    if (m) { writeDraft(eq.id, {}); setSent({ by, at, label, severity, wasStopped: !!m.before.stoppedSince }); }
  };
  const go = (f: () => void) => () => { onClose(); f(); };
  const text = 'text-lg text-slate-800';
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4 print:hidden">
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className="relative flex max-h-[96vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id={tid} ref={head} tabIndex={-1} className="text-2xl font-black text-slate-900 focus:outline-none">{sent ? (storageFull ? 'Non enregistré' : 'Problème signalé') : 'Signaler un problème'}</h2>
            <p className="truncate text-base text-slate-600">{name}</p>
          </div>
          <button type="button" aria-label="Fermer" className="shrink-0 rounded-lg p-3 text-slate-600 hover:bg-slate-100" onClick={onClose}><X size={24} /></button>
        </div>
        {sent ? (
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-24 pt-4" role={storageFull ? 'alert' : 'status'}>
            {storageFull
              ? <p className={`${text} flex items-start gap-2 font-semibold text-red-800`}><OctagonX size={26} className="mt-0.5 shrink-0" aria-hidden /><span>Non enregistré : le navigateur est plein. Le signalement « {sent.label} » n'est pas conservé sur cet appareil.</span></p>
              : <p className={`${text} flex items-start gap-2 font-semibold`}><Check size={26} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden /><span>{sent.by} a signalé « {sent.label} » à {sent.at.slice(11)}.</span></p>}
            {sent.severity === 'stopped' && <p className={text}>{sent.wasStopped ? "L'équipement était déjà à l'arrêt." : `L'équipement est noté à l'arrêt depuis ${sent.at.slice(11)}.`}</p>}
            {sent.severity === 'danger' && <p className={text}>Le danger apparaît en rouge dans la liste « À faire » de l'outil Maintenance.</p>}
            {(sent.severity === 'danger' || sent.severity === 'stopped') && <p className={`${text} font-semibold`}>{bossLine}</p>}
            {(sent.severity === 'danger' || sent.severity === 'stopped') && bossPhone && <a href={`tel:${telOf(bossPhone)}`} className={`${BIG} w-full border-emerald-900 bg-emerald-700 text-white`}><Phone size={26} aria-hidden />Appeler {boss.who.split(/\s+/)[0]}</a>}
            {nav && (
              <details className="rounded-xl border border-slate-200">
                <summary className="flex min-h-[44px] cursor-pointer items-center px-3 text-base font-semibold text-slate-800">Suite à donner</summary>
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                  <button type="button" className={`${BIG} border-slate-300 bg-white text-base text-slate-800`} onClick={go(() => nav.newAction({ ref: { kind: 'equipment', id: eq.id }, constat: `${name} : ${sent.label}${note.trim() ? ` (${note.trim()})` : ''}` }))}>Ouvrir une action</button>
                  <button type="button" className={`${BIG} border-slate-300 bg-white text-base text-slate-800`} onClick={() => nav.open('5.1', `new:equipment:${eq.id}`)}>Ouvrir un défaut du bac rouge<NewTab size={16} /></button>
                </div>
              </details>
            )}
            <button type="button" className={`${BIG} w-full border-emerald-800 bg-emerald-700 text-white sm:w-auto`} onClick={onClose}>Fermer</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <StorageNote className="!text-base" />
              {resumed && <p role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-base text-amber-950"><span className="min-w-0 flex-1">Signalement commencé sur cet appareil : repris tel qu'il était.</span><button type="button" className="rounded-lg border border-amber-700 px-3 py-1 font-semibold" onClick={() => { setPhoto(''); setNature(''); setSeverity(''); setNote(''); setResumed(false); }}>Effacer</button></p>}
              {refusal && <p role="alert" className="rounded-xl bg-slate-100 p-3 text-base font-semibold text-slate-900">{refusal}</p>}
              {!saved && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-base text-amber-950">Équipement pas encore enregistré : le signalement ne serait pas noté.</p>}
              <div role="radiogroup" aria-label="Gravité" className="space-y-2">
                <div className="text-base font-semibold text-slate-700">Gravité</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SEV.map(s => (
                    <button key={s.k} type="button" role="radio" aria-checked={severity === s.k} onClick={() => setSeverity(s.k)}
                      className={`flex min-h-[64px] flex-row items-center gap-3 rounded-xl border-2 px-3 py-2 text-left sm:flex-col sm:justify-center sm:text-center ${severity === s.k ? s.on : s.off}`}>
                      <s.Icon size={26} className="shrink-0" aria-hidden />
                      <span><span className="block text-xl font-bold">{s.label}</span><span className="block text-[13px] font-semibold">{s.fact}</span></span>
                    </button>
                  ))}
                </div>
                {severity === 'stopped' && <p className="text-base text-slate-700">{e.stoppedSince ? "L'équipement est déjà noté à l'arrêt." : "L'équipement sera noté à l'arrêt depuis maintenant."}</p>}
              </div>
              <div className="space-y-2"><div className="text-base font-semibold text-slate-700">De quoi s'agit-il ?</div><Pick chips list={cfg.natures} value={nature} onChange={setNature} label="Nature du problème" /></div>
              <PhotoBox value={photo} label="Photo du problème" onChange={setPhoto} />
              <textarea value={note} onChange={ev => setNote(ev.target.value)} rows={2} placeholder="Un mot sur ce qui ne va pas" aria-label="Un mot sur le problème" className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-lg outline-none focus:border-delacour-gold" />
              <PeoplePick people={people} value={who} onChange={setWho} label={severity === 'danger' ? 'Qui signale ? (obligatoire pour un danger)' : 'Qui signale ?'} />
            </div>
            <div className="flex flex-col items-stretch gap-1 border-t border-slate-100 px-4 py-3 sm:items-end">
              <button type="button" className={`${BIG} border-red-800 bg-red-700 text-white sm:min-w-[10rem]`} disabled={!ready} onClick={send} aria-describedby={why ? hid : undefined}>Signaler</button>
              {why && <p id={hid} className="text-base text-slate-700">{why}</p>}
            </div>
          </>
        )}
        {/* the bar "Annuler" is drawn in the window, above its bottom edge (the screen "Problème signalé" keeps the room under "Fermer"): never over a button, never far from it */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0 [transform:translateZ(0)] [&>*]:pointer-events-auto">{bar}</div>
      </div>
    </div>, document.body);
}
