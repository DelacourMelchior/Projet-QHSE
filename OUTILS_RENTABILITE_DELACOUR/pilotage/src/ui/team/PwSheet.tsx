// The sheet of a key function, on one page that scrolls (no tabs): the name, then who takes over (the point of the tool, always open), how to do it, then three folded parts whose
// line already says where they stand (what lets a deputy act, the training, the details). It writes as it is typed: a field is written to the power as it stands in the store, so a
// sheet left open never overwrites what was written elsewhere meanwhile (a practice, a formality) and there is nothing to save. A new power is only a draft until its act is named.
// Each person signs the delegation under her own name (« Signature manquante » until she has). Removing needs no question: "Annuler" brings it back.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { Power } from '../../domain/types';
import type { Nav } from '../tools';
import { PROCESS_IDS, processLabel } from '../../domain/base';
import { newRisk } from '../../domain/risk';
import {
  depInfo, depViews, linkRef, wantedOf, signOf, signPerson, signStatus, unsignPerson, type SignNeed, formDone, formsOf, lostByDeleting, placeError, powerCfg, powerState, removeExtra, reviewPower, setDeputy, swapDeputies, waitText, WAITS, type DepView,
} from '../../domain/powers';
import { norm } from '../../domain/instructions';
import { frDate, isoDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Chips, DeleteButton, Field, Modal, NewTab } from '../common';
import { SignSlots } from './PwDelegation';
import { FIELD, PersonField, PhoneLink, StateBadge, TOUCH, useUndo } from './PwBits';

export type PwTab = 'act' | 'people' | 'forms';
const WAIT_KEYS = Object.keys(WAITS) as (keyof typeof WAITS)[];

export function PwSheet({ id, draft, tab: first = 'act', nav, onClose }: { id: string; draft: Power; tab?: PwTab; nav: Nav; onClose(): void }) {
  const { state, update, teamView, author } = useStore();
  const [, tick] = useState(0), copy = useRef(draft), top = useRef<HTMLDivElement>(null);
  const { bar, offer } = useUndo();
  // an address that names a part (« forms ») scrolls to it once the sheet is drawn
  useEffect(() => { const t = first === 'forms' ? 'pw-forms' : ''; if (t) requestAnimationFrame(() => document.getElementById(t)?.scrollIntoView({ block: 'start' })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date(), cfg = powerCfg(state.params), stored = state.powers[id], p = stored ?? copy.current, isNew = !stored;
  // the power as it stands when the field is written; before its act is named the changes stay in the draft
  const change = (f: (x: Power) => Power) => { update(d => { const next = f(d.powers[id] ?? copy.current); copy.current = next; if (d.powers[id] || next.power.trim()) d.powers[id] = next; }); tick(n => n + 1); };
  const set = (x: Partial<Power>) => change(c => ({ ...c, ...x }));
  const st = powerState(p, now, state, cfg), deps = depViews(p, state, now, cfg), forms = formsOf(p, cfg), today = isoDate(now);
  const lost = lostByDeleting(state, p);
  const remove = () => { const was = p; update(d => { delete d.powers[id]; }); offer(`Fonction retirée : ${was.power.trim() || 'sans nom'}`, () => update(d => { d.powers[id] = was; })); onClose(); };
  const risk = p.riskId ? state.risks[p.riskId] : Object.values(state.risks).find(r => !!p.power.trim() && [`Fonction clé : ${p.power.trim()}`, `Pouvoir vital : ${p.power.trim()}`].includes(r.resource));   // a risk written by the first version is found by its words
  const makeRisk = () => {
    const r = { ...newRisk(p.processId), title: `Absence de ${p.holder.trim() || 'la personne'} : ${p.power.trim()}`, resource: `Fonction clé : ${p.power.trim()}`, family: 'doublure' as const, cause: 'Aucun suppléant (outil 4.1)', owner: p.holder.trim(), deputy: deps[0]?.name || '' };
    update(d => { d.risks[r.id] = r; if (d.powers[id]) d.powers[id] = { ...d.powers[id], riskId: r.id }; });
    nav.openRisk(r.id);
  };
  const level = (d: DepView) => { const k = p.skillId ? state.skills[p.skillId] : undefined, pid = d.who.person?.id; return k && pid ? k.levels[pid] ?? 0 : null; };
  const signs = signStatus(state, p);
  const signIt = (n: SignNeed, img: string) => change(c => signPerson(state, c, n, img, today));
  const unsignIt = (n: SignNeed) => { const was = signOf(p, n); change(c => unsignPerson(c, n)); if (was) offer(`Signature retirée : ${n.who}`, () => change(c => ({ ...c, signs: { ...c.signs, [`${norm(n.subject)}|${n.slot}`]: was } }))); };
  const needsOf = (name: string) => signs.needs.filter(x => norm(x.subject) === norm(name));
  const wanted = wantedOf(p), slots = [0, 1, ...(p.extra || []).map((_, i) => i + 2)].filter(k => k >= 2 || k < wanted || !!p.deputies[k]?.trim());   // a place that is not expected stays hidden until somebody is named there
  const nameOf = (slot: number) => (slot < 2 ? p.deputies[slot] : p.extra?.[slot - 2]) || '';
  const people = Object.values(state.people).filter(x => x.active).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const head = (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
      <Field label="Fonction clé" hint={isNew ? "L'acte sans lequel le processus s'arrête, par exemple « Signer les virements de salaires ». Elle est enregistrée dès que son nom est écrit." : "L'acte sans lequel le processus s'arrête."}><input className={FIELD} value={p.power} onChange={e => set({ power: e.target.value })} autoFocus={isNew} /></Field>
      <Field label="Processus"><select className={FIELD} value={p.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(x => <option key={x} value={x}>{processLabel(x)}</option>)}</select></Field>
    </div>
  );
  const howTo = (
    <div className="space-y-3">
      <Field label="Comment le faire" hint="Quelques lignes : sans ce mode d'emploi, un suppléant ne peut pas faire l'acte pour de vrai."><textarea className={`${FIELD} min-h-[72px]`} rows={3} value={p.howTo || ''} onChange={e => set({ howTo: e.target.value })} /></Field>
      <div className="space-y-1">
        <Field label="Instruction de poste qui la décrit (outil 3.2)"><select className={FIELD} value={p.sopId || ''} onChange={e => set({ sopId: e.target.value || undefined })}><option value="">Aucune</option>{Object.values(state.sops).sort((a, b) => a.poste.localeCompare(b.poste, 'fr')).map(x => <option key={x.id} value={x.id}>{x.poste || x.id}</option>)}</select></Field>
        {p.sopId && state.sops[p.sopId] && <button type="button" className={`inline-flex items-center gap-1 text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => nav.open('3.2', p.sopId)}>Ouvrir l'instruction (3.2)<NewTab /></button>}
      </div>
    </div>
  );
  const more = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ce qui s'arrête sans elle"><textarea className={`${FIELD} min-h-[72px]`} value={p.impact || ''} onChange={e => set({ impact: e.target.value })} /></Field>
        <div className="space-y-3">
          <Field label="Combien de temps l'entreprise peut attendre" hint="Une fonction qui ne peut pas attendre passe en tête de la file « À faire ».">
            <select className={FIELD} value={p.wait || ''} onChange={e => set({ wait: (e.target.value || undefined) as Power['wait'] })}><option value="">Pas précisé</option>{WAIT_KEYS.map(k => <option key={k} value={k}>{WAITS[k]}</option>)}</select>
          </Field>
          {p.wait === 'other' && <Field label="Précisez"><input className={FIELD} value={p.waitOther || ''} onChange={e => set({ waitOther: e.target.value })} /></Field>}
        </div>
      </div>
      <Field label="Compétence liée (outil 4.2)" hint="Le niveau de chaque suppléant sur cette compétence s'affiche dans ses détails."><select className={FIELD} value={p.skillId || ''} onChange={e => set({ skillId: e.target.value || undefined })}><option value="">Aucune</option>{Object.values(state.skills).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
        {risk ? <button type="button" className={`font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => nav.openRisk(risk.id)}>Ouvrir le risque dans les Plans B (1.2)</button>
          : p.power.trim() && <button type="button" className={`font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={makeRisk}>Inscrire le risque dans les Plans B (1.2)</button>}
        {p.riskId && !risk && <span className="text-slate-600">Le risque lié n'existe plus.</span>}
      </div>
    </div>
  );

  // one row per person: who (a picked person of the lists), then where she stands and the one gesture that matters
  const row = 'grid gap-x-4 gap-y-1.5 py-3 sm:grid-cols-2 sm:items-end';
  const peopleTab = (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-slate-700">Suppléants prévus</span>
        <Chips value={String(wanted) as '0' | '1' | '2'} onChange={v => set({ wanted: Number(v) as 0 | 1 | 2 })} items={[['0', 'Aucun'], ['1', 'Un'], ['2', 'Deux']]} />
      </div>
      <div className="divide-y divide-slate-100 border-y border-slate-100">
        <div className={row}>
          <PersonField label="Titulaire" value={p.holder} nav={nav} strict check={n => placeError(p, n, 'holder')} onCommit={(n, r) => change(c => linkRef({ ...c, holder: n }, n, r))} />
          <div className="sm:pb-1"><SignSlots p={p} needs={needsOf(p.holder)} onSign={signIt} onUnsign={unsignIt} /></div>
        </div>
        {slots.map(slot => {
          const name = nameOf(slot), d = deps.find(x => x.slot === slot), n = norm(name), info = depInfo(p, name), lvl = d ? level(d) : null;
          return (
            <div key={slot} className={row}>
              <PersonField label={slot < 2 ? `Suppléant ${slot + 1}` : 'Autre suppléant'} value={name} nav={nav} strict check={x => placeError(p, x, slot)} onCommit={(x, r) => change(c => linkRef(setDeputy(c, slot, x), x, r))} />
              {d ? (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 sm:pb-1">
                  <SignSlots p={p} needs={needsOf(d.name)} onSign={signIt} onUnsign={unsignIt} />
                  <span className="flex flex-wrap items-center gap-1.5">
                    {slot === 1 && <Button kind="ghost" className="!py-1" onClick={() => change(swapDeputies)}>Passer en premier</Button>}
                    {slot >= 2 && <Button kind="ghost" className="!py-1" aria-label={`Retirer ${d.name}`} onClick={() => change(c => removeExtra(c, slot))}><X size={13} />Retirer</Button>}
                  </span>
                </div>
              ) : null}
              {!name.trim() && slot >= 2 && <div className="sm:pb-1"><Button kind="ghost" className="!py-1" onClick={() => change(c => removeExtra(c, slot))}><X size={13} />Retirer cette place</Button></div>}
              {!d && name.trim() && <p className="text-xs text-amber-800 sm:col-span-2">Cette personne est déjà à une autre place de cette fonction : elle ne compte qu'une fois.</p>}
              {d && (
                <details className="sm:col-span-2">
                  <summary className={`inline-flex cursor-pointer list-none items-center text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}>Détails</summary>
                  <div className="space-y-2 pb-1 pt-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DateRow label="A accepté d'être suppléant le" value={info.accepted || ''} onChange={v => change(c => ({ ...c, dep: { ...c.dep, [n]: { ...depInfo(c, name), accepted: v || undefined } } }))} />
                      <DateRow label="Accès ouvert à son nom le" value={info.access || ''} onChange={v => change(c => ({ ...c, dep: { ...c.dep, [n]: { ...depInfo(c, name), access: v || undefined } } }))} />
                    </div>
                    {lvl !== null && <p className="text-xs text-slate-600">{`Niveau ${lvl} sur ${state.skills[p.skillId!]?.name}`}{lvl < 3 ? ' : un suppléant autonome complet est attendu (niveau 3 ou 4)' : ''}</p>}
                    {p.skillId && state.skills[p.skillId] && <button type="button" className={`inline-flex items-center gap-1 text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => nav.open('4.2', p.skillId)}>Voir la compétence dans Polyvalence (4.2)<NewTab /></button>}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
      <Button kind="ghost" className="mt-2 !py-1" onClick={() => change(c => ({ ...c, extra: [...(c.extra || []), ''], extraPracticed: [...(c.extraPracticed || []), ''] }))}><Plus size={13} />Ajouter un autre suppléant</Button>
      {people.length === 0 && <p className="mt-2 text-xs text-slate-600">La liste du personnel est vide : le personnel se saisit dans la polyvalence (4.2).</p>}
    </div>
  );

  const known = (p.contactIds || []).map(cid => state.contacts[cid]).filter(Boolean);
  const formsTab = (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-slate-600">{forms.total ? `${forms.done} sur ${plural(forms.total, 'formalité')} faite${forms.done > 1 ? 's' : ''}.` : 'Aucune formalité demandée pour cette fonction.'} La liste se règle dans les réglages de l'outil.</p>
        <ul className="divide-y divide-slate-100">
          {cfg.forms.map(f => {
            const v = formDone(p, f.key), na = v === 'na', done = v && !na;
            return (
              <li key={f.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 text-xs">
                <span className="min-w-0 flex-1 basis-56"><strong className="font-semibold text-slate-900">{f.label}</strong><span className={`block ${done ? 'text-slate-600' : na ? 'text-slate-600' : 'text-amber-800'}`}>{done ? `faite le ${frDate(/^\d{4}-/.test(v) ? v : today)}` : na ? 'sans objet pour cette fonction' : 'à faire'}</span></span>
                <input type="date" aria-label={`${f.label} : jour`} className={`${FIELD} !w-auto`} disabled={na} value={done && /^\d{4}-/.test(v) ? v : ''} max={today} onChange={e => change(c => ({ ...c, forms: { ...c.forms, [f.key]: e.target.value } }))} />
                {!done && <Button className="!py-1" disabled={na} onClick={() => change(c => ({ ...c, forms: { ...c.forms, [f.key]: today } }))}>Faite aujourd'hui</Button>}
                <label className={`flex items-center gap-1.5 ${TOUCH}`}><input type="checkbox" className="h-5 w-5 accent-delacour-primary" checked={na} onChange={e => change(c => ({ ...c, forms: { ...c.forms, [f.key]: e.target.checked ? 'na' : '' } }))} />Sans objet</label>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Limites : ce que le suppléant peut et ne peut pas faire" hint="Du texte, par exemple « jamais seul pour un nouveau bénéficiaire »."><textarea className={`${FIELD} min-h-[72px]`} value={p.limits || ''} onChange={e => set({ limits: e.target.value })} /></Field>
        <Field label="Original papier de la délégation (facultatif)" hint="Un classeur, un dossier : seulement où il se trouve."><textarea className={`${FIELD} min-h-[72px]`} value={p.docRef || ''} onChange={e => set({ docRef: e.target.value })} /></Field>
      </div>
      {!teamView && <Field label="Où sont les accès (réservé à la direction)" hint="Seulement où ils sont : aucun mot de passe n'est écrit dans l'outil."><input className={FIELD} value={p.access} onChange={e => set({ access: e.target.value })} /></Field>}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-800">Personnes et organismes à connaître pour cet acte</p>
        {known.length === 0 && <p className="text-xs text-slate-600">Par exemple le conseiller de la banque, la société d'alarme, l'expert-comptable : pris dans l'annuaire, avec leur téléphone.</p>}
        <ul className="divide-y divide-slate-100">
          {known.map(c => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs">
              <span className="min-w-0"><strong className="text-slate-900">{c.name}</strong>{c.company && c.company !== 'Interne' ? <span className="text-slate-600"> · {c.company}</span> : null}</span>
              <span className="flex items-center gap-2">{c.phone && <PhoneLink phone={c.phone} who={c.name} />}<Button kind="ghost" className="!py-1" aria-label={`Retirer ${c.name}`} onClick={() => change(x => ({ ...x, contactIds: (x.contactIds || []).filter(i => i !== c.id) }))}><X size={13} /></Button></span>
            </li>
          ))}
        </ul>
        <select className={FIELD} aria-label="Ajouter une personne ou un organisme de l'annuaire" value="" onChange={e => { const v = e.target.value; if (v) change(c => ({ ...c, contactIds: [...new Set([...(c.contactIds || []), v])] })); }}>
          <option value="">Ajouter depuis l'annuaire…</option>
          {Object.values(state.contacts).filter(c => c.name.trim() && !c.vacant && !(p.contactIds || []).includes(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <Modal wide onClose={onClose} title={p.power.trim() || 'Nouvelle fonction clé'} subtitle={<span className="flex flex-wrap items-center gap-2"><StateBadge st={st} />{p.archivedAt ? <span>archivée le {frDate(p.archivedAt)}</span> : p.reviewedAt ? <span>relue le {frDate(p.reviewedAt)}</span> : null}{waitText(p) && <span>peut attendre : {waitText(p).toLowerCase()}</span>}</span>}
      footer={<>
        <details className="group mr-auto max-sm:order-last max-sm:w-full">
          <summary className={`flex cursor-pointer list-none items-center text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}>Autres actions</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {!isNew && !p.archivedAt && <Button onClick={() => set(reviewPower(p, author || 'anonyme'))}>Relue : toujours juste</Button>}
            {!isNew && (p.archivedAt ? <Button onClick={() => change(c => ({ ...c, archivedAt: undefined }))}>Restaurer</Button> : <Button onClick={() => { change(c => ({ ...c, archivedAt: today })); offer(`Fonction archivée : ${p.power.trim()}`, () => change(c => ({ ...c, archivedAt: undefined }))); onClose(); }}>Archiver</Button>)}
            {!isNew && !lost && <DeleteButton onClick={remove}>Supprimer</DeleteButton>}
            {!isNew && lost && <span className="max-w-xs text-xs text-slate-600">Supprimer ferait perdre : {lost}. Archiver garde l'historique.</span>}
          </div>
        </details>
        <Button kind="primary" onClick={onClose}>Fermer</Button>
      </>}>
      <div ref={top} className="space-y-5">
        {head}
        <section aria-labelledby="pw-relay" className="space-y-2">
          <h3 id="pw-relay" className="text-sm font-bold text-delacour-primary">Qui prend le relais</h3>
          {peopleTab}
        </section>
        {howTo}
        <div>
          <Part id="pw-forms" title="Pour agir" tone={forms.missing.length && st !== 'no_deputy' ? 'warn' : ''} summary={forms.total ? `${forms.done} sur ${plural(forms.total, 'formalité')} faite${forms.done > 1 ? 's' : ''}` : 'Aucune formalité demandée'} open={first === 'forms'}>{formsTab}</Part>
          <Part id="pw-more" title="Impact" summary="Ce qui s'arrête, délai d'attente, compétence, risque">{more}</Part>
        </div>
      </div>
      {bar}
    </Modal>
  );
}

// A folded part of the sheet: its line says where it stands (a dot when something is missing), so that nobody has to open it to know
function Part({ id, title, summary, tone, open, children }: { id: string; title: string; summary: string; tone?: 'bad' | 'warn' | ''; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} open={open} className="group border-t border-slate-200 last:border-b">
      <summary className={`flex cursor-pointer list-none items-center gap-2 py-3 hover:bg-slate-50 ${TOUCH}`}>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        {tone && <><span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone === 'bad' ? 'bg-red-500' : 'bg-amber-400'}`} /><span className="sr-only"> : {tone === 'bad' ? 'important' : 'à compléter'}</span></>}
        <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{summary}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-slate-500 transition group-open:rotate-180" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

// A day with its button "Aujourd'hui" (and a way to take it back)
function DateRow({ label, value, onChange, noToday }: { label: string; value: string; onChange(v: string): void; noToday?: boolean }) {
  const today = isoDate(new Date());
  return (
    <div className="space-y-1">
      <Field label={label}><input type="date" className={FIELD} value={value} onChange={e => onChange(e.target.value)} /></Field>
      {!noToday && !value && <button type="button" className={`text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => onChange(today)}>Aujourd'hui</button>}
    </div>
  );
}

