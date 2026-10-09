// The "Fiche" tab of a piece of equipment (tool 3.3): identity, who looks after it, links with the other tools (Plan B, work instruction, defects of the red bin),
// documents, the people to call, safety notes, the QR code of the routine. Everything here is typed content: it goes through `set`, which writes the draft.
import { useState, type ReactNode } from 'react';
import { ChevronDown, ExternalLink, Phone, Plus, X } from 'lucide-react';
import type { EqDoc, EqHelper } from '../../domain/types';
import { daysBetween, knownPeople, newId } from '../../domain/base';
import { EQ_KINDS, EQ_TEMPLATES, equipmentFromTemplate, helpersOf, kindOf, ncsOfEquipment, sopLine, txt } from '../../domain/maintenance';
import { safeUrl } from '../../domain/commercial';
import { CATEGORIES, contactLabel, telOf, toCheck } from '../../domain/contacts';
import { formatDuration } from '../../domain/duration';
import { norm, sopCfg, sopPhase, sopVersion } from '../../domain/instructions';
import { frDate } from '../../domain/periods';
import { Button, Field, inputCls, NewTab } from '../common';
import { PhotoBox } from '../PhotoBox';
import { PpeIcon } from '../Ppe';
import { Qr } from '../Qr';
import { Pic } from '../../photo/Pic';
import type { EqTabProps } from './EqProps';
import { eqStationUrl, isLocalAddress, type EqSet } from './EqBits';
import { PPE_WORDS } from './EqPrint';

export type SheetTabProps = EqTabProps & { undo(what: string, back: () => void): void };   // undo: the sheet's "Retiré · Annuler" bar, for what `set` cannot tell is a removal

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const touch = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
const PILL_ON = 'border-delacour-primary bg-delacour-primary text-white', PILL_OFF = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-semibold ${touch} ${on ? PILL_ON : PILL_OFF}`;
const cross = 'shrink-0 rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 max-sm:p-3 [@media(pointer:coarse)]:p-3';
const ROLES = ['Service après-vente', 'Constructeur', 'Électricien', 'Dépanneur', 'Organisme de contrôle', 'Fournisseur de pièces'];
const OTHER = 'Autre';
const DOCS = ['Notice', 'Schéma', 'Attestation'];

// A section that can be folded (on a phone the sheet is long); open or closed at the start, then left to the person
export function Sec({ title, open = true, children }: { title: ReactNode; open?: boolean; children: ReactNode }) {
  const [o] = useState(open);
  return (
    <details open={o} className="group rounded-lg border border-slate-200">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-900 ${touch}`}>{title}<ChevronDown size={14} aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-180" /></summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3">{children}</div>
    </details>
  );
}
const Label = ({ children }: { children: ReactNode }) => <span className="block text-[11px] font-semibold text-slate-700">{children}</span>;

// A person among the people of the company, in big buttons ("Autre, précisez" opens a field); from 6 names a list to choose from, ending with "Autre, précisez"
const OTHER_KEY = '__autre';
function PersonPick({ label, value, onChange, names, hint }: { label: string; value: string; onChange(v: string): void; names: string[]; hint?: ReactNode }) {
  const [other, setOther] = useState(false);
  const custom = !!value.trim() && !names.some(n => norm(n) === norm(value)), many = names.length > 5;
  // the list: choosing a name writes it, "Autre, précisez" opens the field (a name chosen before is cleared: the field starts empty)
  const pick = (v: string) => { if (v === OTHER_KEY) { setOther(true); if (!custom && value) onChange(''); } else { setOther(false); onChange(v); } };
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <Label>{label}</Label>
      {many && (
        <select className={inputCls} aria-label={label} value={other || custom ? OTHER_KEY : names.find(n => norm(n) === norm(value)) ?? ''} onChange={x => pick(x.target.value)}>
          <option value="">Choisir…</option>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
          <option value={OTHER_KEY}>Autre, précisez</option>
        </select>
      )}
      {!many && (
        <div className="flex flex-wrap gap-1.5">
          {names.map(n => <button key={n} type="button" aria-pressed={norm(value) === norm(n)} onClick={() => onChange(norm(value) === norm(n) ? '' : n)} className={pill(norm(value) === norm(n))}>{n}</button>)}
          <button type="button" aria-pressed={other || custom} onClick={() => { if (custom) onChange(''); setOther(!(other || custom)); }} className={pill(other || custom)}>Autre, précisez</button>
        </div>
      )}
      {(other || custom) && <input className={inputCls} list="people" value={value} placeholder="Nom de la personne" aria-label={`${label} : nom`} onChange={e => { setOther(true); onChange(e.target.value); }} />}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function SheetTab({ e, saved, state, set: plainSet, nav, openStation, undo }: SheetTabProps) {
  const set = plainSet as EqSet;   // the sheet's `set` also takes a function of the copy being typed: a photo that comes back late keeps what was typed meanwhile
  const now = new Date(), px = sopCfg(state.params).photoPx, plan = sopCfg(state.params).plan;
  const team = Object.values(state.people || {}).filter(x => x.active).map(x => x.name.trim()).filter(Boolean), people = team.length ? team : knownPeople(state), kind = kindOf(e);
  const groups = [...new Set(Object.values(state.equipments).map(x => x.group).filter(Boolean))] as string[];
  const risk = state.risks[e.riskId], line = sopLine(state, e, now), ncs = ncsOfEquipment(state, e, now, 90);
  const sops = Object.values(state.sops).filter(x => x.id === e.sopId || sopPhase(x) !== 'archived').sort((a, b) => a.poste.localeCompare(b.poste));
  const docs = e.docs ?? [], helpers = helpersOf(e), safety = e.safety ?? [];
  // the directory by category, the people one calls for a repair first
  const rank = (k: string) => { const i = ['prestataire', 'fournisseur', 'interne', 'secours'].indexOf(k); return i < 0 ? 9 : i; };
  const byCategory = [...CATEGORIES].sort((a, b) => rank(a.key) - rank(b.key)).map(c => ({ ...c, list: Object.values(state.contacts).filter(k => k.category === c.key).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))) })).filter(c => c.list.length);
  // what the sheet is called while it has no name: the model it was started from, if the points are still those of the model
  const model = EQ_TEMPLATES.find(t => t.points.length === e.checkpoints.length && t.points.every((p, i) => p.label === e.checkpoints[i].label))?.name;
  const noName = !e.name.trim();

  const applyModel = (name: string) => {
    const t = EQ_TEMPLATES.find(x => x.name === name);
    if (!t) return;
    const m = equipmentFromTemplate(t), before = { kind: e.kind, checkpoints: e.checkpoints, safety: e.safety };
    set({ kind: m.kind, checkpoints: m.checkpoints, ...(m.safety ? { safety: m.safety } : {}) });
    undo('Points du modèle posés', () => set(before));
  };
  // lists are changed on the copy as it is now, not on the one this render holds (a photo comes back seconds after the button was touched)
  const setDoc = (i: number, x: Partial<EqDoc>) => set(prev => ({ docs: (prev.docs ?? []).map((d, j) => (j === i ? { ...d, ...x } : d)) }));
  const setSafety = (f: (xs: string[]) => string[]) => set(prev => ({ safety: f(prev.safety ?? []) }));
  // the first versions kept one contact (after-sales service): editing the list takes it into the list
  const setHelpers = (f: (xs: EqHelper[]) => EqHelper[]) => set(prev => ({ contacts: f(helpersOf(prev)), ...(prev.contactId ? { contactId: undefined } : {}) }));
  const setHelper = (id: string, x: Partial<EqHelper>) => setHelpers(xs => xs.map(h => (h.id === id ? { ...h, ...x } : h)));
  const months = (iso: string) => { const d = daysBetween(iso, now); return d === null ? null : Math.max(0, Math.floor(d / 30.44)); };

  return (
    <div className="space-y-3">
      <Sec title="Identité">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Nom de l'équipement"><input className={inputCls} value={e.name} autoFocus={!saved && noName} placeholder={model ? `Ex. : ${model}` : "Le nom que l'équipe utilise"} onChange={x => set({ name: x.target.value })} /></Field></div>
          <Field label="Type d'équipement"><select className={inputCls} value={kind} onChange={x => set({ kind: x.target.value as typeof kind })}>{EQ_KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}</select></Field>
          {e.inspections.length === 0
            ? (!model && (
              <Field label="Partir d'un modèle de routine" hint="Remplace les points de la routine et les consignes ; « Annuler » les rend.">
                <select className={inputCls} value="" onChange={x => applyModel(x.target.value)}>
                  <option value="">Choisir un modèle…</option>
                  {EQ_KINDS.filter(k => EQ_TEMPLATES.some(t => t.kind === k.key)).map(k => <optgroup key={k.key} label={k.label}>{EQ_TEMPLATES.filter(t => t.kind === k.key).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</optgroup>)}
                </select>
              </Field>
            ))
            : <p className="self-end text-[11px] text-slate-500">Des routines sont enregistrées : les points se changent dans l'onglet Routine, sans perdre l'historique.</p>}
        </div>
        {/* a new equipment asks for its name first: the rest is there, folded, to complete later */}
        <Sec title={saved || !noName ? 'Photos et détails' : 'Compléter plus tard'} open={!!saved && !noName}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]">
          <div className="space-y-3">
            <div className="space-y-1"><Label>Photo de l'équipement</Label><PhotoBox value={e.photo || ''} label="Photo de l'équipement" px={px} tall onChange={v => set({ photo: v || undefined })} /></div>
            <div className="space-y-1"><Label>Photo de la plaque signalétique</Label><PhotoBox value={e.plate || ''} label="Plaque signalétique" px={px} onChange={v => set({ plate: v || undefined })} /></div>
          </div>
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <Field label="Fabricant"><input className={inputCls} value={e.maker ?? ''} onChange={x => set({ maker: x.target.value || undefined })} /></Field>
            <Field label="Modèle"><input className={inputCls} value={e.model ?? ''} onChange={x => set({ model: x.target.value || undefined })} /></Field>
            <Field label="Numéro de série"><input className={`${inputCls} font-mono`} value={e.serial ?? ''} onChange={x => set({ serial: x.target.value || undefined })} /></Field>
            <Field label="Année de mise en service"><input className={`${inputCls} font-mono`} inputMode="numeric" value={e.since ?? ''} placeholder="Ex. : 2019" onChange={x => set({ since: x.target.value || undefined })} /></Field>
            <Field label="Emplacement"><input className={inputCls} value={e.location} placeholder="Où il se trouve" onChange={x => set({ location: x.target.value })} /></Field>
            <Field label="Groupe (atelier, ligne, site)"><input className={inputCls} list="eq-groups" value={e.group ?? ''} onChange={x => set({ group: x.target.value || undefined })} /></Field>
            <datalist id="eq-groups">{groups.map(g => <option key={g} value={g} />)}</datalist>
            <div role="radiogroup" aria-label="Goulet" className="space-y-1">
              <Label>Son arrêt bloque l'activité (goulet)</Label>
              <div className="flex gap-1.5">
                {([[true, 'Oui'], [false, 'Non']] as const).map(([v, l]) => <button key={l} type="button" role="radio" aria-checked={(e.bottleneck !== false) === v} onClick={() => set({ bottleneck: v ? undefined : false })} className={`${pill((e.bottleneck !== false) === v)} min-w-[4.5rem]`}>{l}</button>)}
              </div>
              <p className="text-[11px] text-slate-500">Seuls les goulets comptent dans « sans Plan B » ; les autres équipements sont suivis sans alerte.</p>
            </div>
          </div>
        </div>
        {plan && (
          <div className="space-y-1.5">
            <Label>Place sur le plan de l'atelier</Label>
            <button type="button" aria-label="Plan de l'atelier : toucher pour placer l'équipement" className="relative mx-auto block w-full max-w-xl cursor-crosshair"
              onClick={x => { const r = x.currentTarget.getBoundingClientRect(); set({ pin: { x: (x.clientX - r.left) / r.width, y: (x.clientY - r.top) / r.height } }); }}>
              <Pic value={plan} alt="Plan de l'atelier" size="v" className="w-full rounded-lg border border-slate-200" />
              {e.pin && <span aria-hidden className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-delacour-primary shadow" style={{ left: `${e.pin.x * 100}%`, top: `${e.pin.y * 100}%` }} />}
            </button>
            <p className="text-[11px] text-slate-500">{e.pin ? 'Épingle posée. Toucher le plan pour la déplacer.' : 'Toucher le plan pour poser l\'épingle.'} Le plan est celui de l'outil 3.2.</p>
            {e.pin && <Button kind="ghost" onClick={() => set({ pin: undefined })}>Retirer du plan</Button>}
          </div>
        )}
        </Sec>
      </Sec>

      <Sec title="Qui s'en occupe">
        <div className="grid gap-4 lg:grid-cols-3">
          <PersonPick label="Titulaire de la routine" names={people} value={e.operator} onChange={v => set({ operator: v })} hint="Fait la routine ; remplacé par le suppléant quand il est absent (polyvalence, outil 4.2)." />
          <PersonPick label="Suppléant" names={people} value={txt(e.deputy)} onChange={v => set({ deputy: v || undefined })} />
          <PersonPick label="Responsable" names={people} value={e.manager} onChange={v => set({ manager: v })} hint="Reçoit les anomalies et les contrôles à suivre." />
        </div>
      </Sec>

      <Sec title="Liens avec les autres outils">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Field label="Plan B (outil 1.2)" hint={risk ? `Arrêt toléré : ${risk.maxOutage ? formatDuration(risk.maxOutage) : 'non renseigné'}.` : 'Le risque qui s\'arrête avec cet équipement.'}>
              <select className={inputCls} value={e.riskId} onChange={x => set({ riskId: x.target.value })}>
                <option value="">Aucun</option>
                {e.riskId && !risk && <option value={e.riskId}>Risque supprimé</option>}
                {Object.values(state.risks).sort((a, b) => a.title.localeCompare(b.title)).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </Field>
            {risk && <Button onClick={() => nav.openRisk(risk.id)}>Ouvrir le Plan B</Button>}
          </div>
          <div className="space-y-1.5">
            <Field label="Instruction du poste (outil 3.2)" hint={line ? `${sopVersion(line.sop)}, ${line.shown}, ${plural(line.habilitated, 'personne habilitée', 'personnes habilitées')}${line.ownerHabilitated === null ? '' : line.ownerHabilitated ? ', titulaire habilité' : ', titulaire non habilité'}.` : e.sopId && state.sops[e.sopId] ? 'Instruction archivée.' : 'Aucune instruction reliée.'}>
              <select className={inputCls} value={e.sopId ?? ''} onChange={x => set({ sopId: x.target.value || undefined })}>
                <option value="">Aucune</option>
                {e.sopId && !state.sops[e.sopId] && <option value={e.sopId}>Instruction supprimée</option>}
                {sops.map(s => <option key={s.id} value={s.id}>{s.poste}{s.operation ? ` · ${s.operation}` : ''}</option>)}
              </select>
            </Field>
            {e.sopId && state.sops[e.sopId] && <Button onClick={() => nav.open('3.2', e.sopId!)}>Ouvrir l'instruction<NewTab size={13} /></Button>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Défauts du bac rouge (outil 5.1) sur cet équipement</Label>
          <p className="text-[11px] text-slate-600">{ncs.length ? `${plural(ncs.length, 'défaut')} en 90 jours.` : 'Aucun défaut déclaré sur cet équipement depuis 90 jours.'}</p>
          {ncs.length > 0 && <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{ncs.slice(0, 5).map(n => (
            <li key={n.id}><button type="button" onClick={() => nav.open('5.1', n.id)} className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50 ${touch}`}><span className="font-mono font-semibold text-slate-800">{n.ref}</span><span className="text-slate-500">{frDate(n.at.slice(0, 10))}</span><span className="min-w-0 flex-1 truncate text-slate-700">{n.description}</span><NewTab /></button></li>
          ))}</ul>}
          {ncs.length > 5 && <p className="text-[11px] text-slate-500">et {ncs.length - 5} autre(s), dans l'outil 5.1.</p>}
          <Button disabled={!saved} onClick={() => nav.open('5.1', `new:equipment:${e.id}`)}>Déclarer un défaut dans le bac rouge<NewTab size={13} /></Button>
        </div>
      </Sec>

      <Sec title={`Documents${docs.length ? ` : ${docs.length}` : ''}`} open={docs.length > 0 || !!e.manual}>
        <Field label="Où se trouve la notice papier"><input className={inputCls} value={e.manual ?? ''} placeholder="Ex. : classeur du bureau d'étude, étagère 2" onChange={x => set({ manual: x.target.value || undefined })} /></Field>
        {docs.map((d, i) => {
          const url = safeUrl(d.url);
          return (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-2">
              <div className="flex gap-1.5">
                <input className={inputCls} value={d.label} placeholder="Précisez le document" aria-label="Nom du document" onChange={x => setDoc(i, { label: x.target.value })} />
                <button type="button" aria-label={`Retirer le document ${d.label || i + 1}`} className={cross} onClick={() => set(prev => ({ docs: (prev.docs ?? []).filter((_, j) => j !== i) }))}><X size={14} /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                <PhotoBox value={d.photo || ''} label={`Photo : ${d.label || 'document'}`} px={px} onChange={v => setDoc(i, { photo: v || undefined })} />
                <div className="space-y-1.5">
                  <Field label="Ou un lien (http ou https)"><input className={inputCls} inputMode="url" value={d.url ?? ''} placeholder="https://…" onChange={x => setDoc(i, { url: x.target.value || undefined })} /></Field>
                  {d.url?.trim() && !url && <p role="alert" className="text-[11px] font-semibold text-red-700">Adresse refusée : elle doit commencer par http:// ou https://.</p>}
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-delacour-primary hover:bg-slate-50 ${touch}`}><ExternalLink size={13} />Ouvrir le lien</a>}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ajouter un document">
          {[...DOCS, 'Autre, précisez'].map(l => <Button key={l} className="!py-1" onClick={() => set(prev => ({ docs: [...(prev.docs ?? []), { label: DOCS.includes(l) ? l : '' }] }))}><Plus size={13} />{l}</Button>)}
        </div>
      </Sec>

      <Sec title={`Intervenants${helpers.length ? ` : ${helpers.length}` : ''}`}>
        <p className="text-[11px] text-slate-600">Les personnes à appeler pour cet équipement : constructeur, électricien, dépanneur, organisme de contrôle. Le numéro vient de l'annuaire (outil 1.3).</p>
        {helpers.map(h => {
          const c = h.contactId ? state.contacts[h.contactId] : undefined, phone = c ? c.phone : h.phone || '', m = c?.verifiedAt ? months(c.verifiedAt) : null;
          const role = ROLES.includes(h.role) ? h.role : h.role ? OTHER : '';
          return (
            <div key={h.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <div className="space-y-1">
                  <select className={inputCls} value={role} aria-label="Rôle de l'intervenant" onChange={x => setHelper(h.id, { role: x.target.value })}>
                    <option value="">Choisir le rôle…</option>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}<option value={OTHER}>Autre, précisez</option>
                  </select>
                  {role === OTHER && <input className={inputCls} value={h.role === OTHER ? '' : h.role} placeholder="Précisez le rôle" aria-label="Rôle : précisez" onChange={x => setHelper(h.id, { role: x.target.value.trim() ? x.target.value : OTHER })} />}
                </div>
                <select className={inputCls} value={h.contactId ?? ''} aria-label="Contact de l'annuaire" onChange={x => setHelper(h.id, { contactId: x.target.value || undefined })}>
                  <option value="">Écrire le nom et le numéro</option>
                  {h.contactId && !c && <option value={h.contactId}>Contact supprimé de l'annuaire</option>}
                  {byCategory.map(c => <optgroup key={c.key} label={c.label}>{c.list.map(k => <option key={k.id} value={k.id}>{contactLabel(k)}{k.role ? ` (${k.role})` : ''}</option>)}</optgroup>)}
                </select>
                <button type="button" aria-label={`Retirer l'intervenant ${h.role || ''}`.trim()} className={`${cross} justify-self-end`} onClick={() => setHelpers(xs => xs.filter(x => x.id !== h.id))}><X size={14} /></button>
              </div>
              {!c && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={inputCls} value={h.name ?? ''} placeholder="Nom (et société)" aria-label="Nom de l'intervenant" onChange={x => setHelper(h.id, { name: x.target.value || undefined })} />
                  <input className={`${inputCls} font-mono`} inputMode="tel" value={h.phone ?? ''} placeholder="Numéro de téléphone" aria-label="Téléphone de l'intervenant" onChange={x => setHelper(h.id, { phone: x.target.value || undefined })} />
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <input className={inputCls} value={h.hours ?? ''} placeholder={c?.hours ? `Horaires ou astreinte (annuaire : ${c.hours})` : 'Horaires ou astreinte'} aria-label="Horaires ou astreinte" onChange={x => setHelper(h.id, { hours: x.target.value || undefined })} />
                <div className="flex flex-wrap items-center gap-2">
                  {telOf(phone) && <a href={`tel:${telOf(phone)}`} aria-label={`Appeler ${c ? contactLabel(c) : h.name || h.role} au ${phone}`} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-delacour-primary hover:bg-slate-50 ${touch}`}><Phone size={13} />{phone}</a>}
                  {c?.phone2 && telOf(c.phone2) && <a href={`tel:${telOf(c.phone2)}`} aria-label={`Appeler ${contactLabel(c)} au ${c.phone2}`} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-delacour-primary hover:bg-slate-50 ${touch}`}><Phone size={13} />{c.phone2}</a>}
                </div>
              </div>
              {c && <p className={`text-[11px] ${toCheck(c, now) ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>{m === null ? 'Numéro jamais vérifié.' : m === 0 ? `Numéro vérifié ce mois-ci (${frDate(c.verifiedAt)}).` : `Numéro vérifié il y a ${m} mois (${frDate(c.verifiedAt)}).`}</p>}
            </div>
          );
        })}
        <Button className="!py-1" onClick={() => setHelpers(xs => [...xs, { id: newId('hp'), role: '' }])}><Plus size={13} />Ajouter un intervenant</Button>
      </Sec>

      <Sec title={`Consignes de sécurité d'intervention${safety.length ? ` : ${safety.length}` : ''}`} open={safety.length > 0}>
        <p className="text-[11px] text-slate-600">Ce qu'il faut savoir avant de travailler sur cet équipement : consignation, protections, habilitation. Elles sont imprimées sur l'affiche.</p>
        {safety.map((x, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {PPE_WORDS.test(x) && <PpeIcon label={x} size={28} />}
            <input className={inputCls} value={x} aria-label={`Consigne ${i + 1}`} onChange={y => { const v = y.target.value; setSafety(xs => xs.map((z, j) => (j === i ? v : z))); }} />
            <button type="button" aria-label={`Retirer la consigne ${i + 1}`} className={cross} onClick={() => setSafety(xs => xs.filter((_, j) => j !== i))}><X size={14} /></button>
          </div>
        ))}
        <Button className="!py-1" onClick={() => setSafety(xs => [...xs, ''])}><Plus size={13} />Ajouter une consigne</Button>
      </Sec>

      <Sec title="QR code de la routine" open={false}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-lg border border-slate-200 p-2"><Qr text={eqStationUrl(e.id)} size={112} label={`QR code de la routine de ${e.name || 'cet équipement'}`} /></div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] text-slate-600">Collé sur l'équipement, il ouvre la routine en plein écran et le signalement d'un problème. L'affiche A4 s'imprime depuis « Autres actions », en bas de la fiche.</p>
            <p className="break-all font-mono text-[11px] text-slate-600">{eqStationUrl(e.id)}</p>
            {isLocalAddress() && <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">Cette adresse ne marche que sur cet ordinateur : une fois l'application en ligne, le QR code s'ouvrira sur n'importe quel téléphone, sur une affiche imprimée à ce moment-là.</p>}
            <Button onClick={openStation}>Faire la routine en plein écran</Button>
          </div>
        </div>
      </Sec>
    </div>
  );
}
