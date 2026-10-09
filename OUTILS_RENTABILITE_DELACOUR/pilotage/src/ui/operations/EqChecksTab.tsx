// Tool 3.3, tab "Contrôles" of the sheet of a piece of equipment: its periodic checks (what is typed goes through `set`, what happens to them through `act`),
// the observations still to lift and the maintenance contract. A check done, planned or an observation lifted is written at once and can be undone for 8 seconds.
import { useState } from 'react';
import { Check, CalendarClock, ExternalLink, FileText, Phone, Plus, X } from 'lucide-react';
import type { CheckDone, Contract, ContactCategory, EqCheck, Equipment, Every, Level, State } from '../../domain/types';
import { addDays, daysBetween } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { categoryLabel, contactLabel, telOf } from '../../domain/contacts';
import { safeUrl } from '../../domain/commercial';
import { addGone, kindOf, maintCfg, txt } from '../../domain/maintenance';
import {
  addReserve, catalogue, CHECK_BY, CHECK_KIND, CHECK_STATE, checkState, contractFact, contractState, doneKey, dueIn, EVERY_UNITS, everyOf, formatEvery, historyOf, lifeOf, liftReserve,
  markDone, newCheck, nextDue, observationProblem, openReserves, planCheck, removeDone, reserveLate, unplanCheck, type ContractState,
} from '../../domain/maintenanceChecks';
import { Button, DeleteButton, Field, inputCls, Modal, NumInput, StatusBadge, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import { Pic } from '../../photo/Pic';
import { useEqMove, useUndo } from './EqBits';
import type { EqTabProps } from './EqProps';

// ---- pieces shared with the view of all the checks (EqChecksView)
export const TOUCH = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
export const nameOf = (c: { label: string }) => c.label.trim() || 'Contrôle sans nom';
// "échu depuis 3 jours", "échéance aujourd'hui", "échéance dans 12 jours"
export const dueText = (d: number) => (d < 0 ? `échu depuis ${plural(-d, 'jour')}` : d === 0 ? "échéance aujourd'hui" : `échéance dans ${plural(d, 'jour')}`);
// Result of a check: symbol, colour and label together (the colour never speaks alone)
export const RESULT: Record<CheckDone['result'], { label: string; sym: string; text: string; on: string }> = {
  ok: { label: 'Conforme', sym: '✓', text: 'text-emerald-800', on: 'border-emerald-800 bg-emerald-700 text-white' },
  remarks: { label: 'Avec observations', sym: '!', text: 'text-amber-800', on: 'border-amber-800 bg-amber-700 text-white' },
  ko: { label: 'Non conforme', sym: '✕', text: 'text-red-800', on: 'border-red-800 bg-red-700 text-white' },
};
export const CONTRACT_BADGE: Record<Exclude<ContractState, 'none'>, { label: string; level: Level }> = {
  ok: { label: 'En cours', level: 'ok' }, soon: { label: 'Échéance proche', level: 'warn' }, ended: { label: 'Échu', level: 'alert' },
};
// A calibration of a measuring instrument: a check of an instrument other than a preventive one, or a check of that nature on any equipment (as the domain reads it)
const isCalibration = (e: Equipment, c: EqCheck) => (kindOf(e) === 'instrument' ? c.kind !== 'preventive' : c.kind === 'instrument');
// The check is added to the record first when the draft that holds it was not written yet, so that a move is never lost
const withCheck = (x: Equipment, c: EqCheck): Equipment => ((x.tasks || []).some(t => t.id === c.id) ? x : { ...x, tasks: [...(x.tasks || []), c] });
// Removing a check takes its history and its observations with it: nothing of them stays out of sight (and out of what deleting the equipment would lose). Their ids
// go into `gone`, so that a copy that still holds them does not bring them back; "Annuler" gives them back with the check.
const dropLife = (x: Equipment, id: string): Equipment => {
  const l = x.checkLife?.[id];
  if (!l) return x;
  const { [id]: _drop, ...rest } = x.checkLife!;
  const ids = [...(Array.isArray(l.history) ? l.history : []).filter(Boolean).map(doneKey), ...(Array.isArray(l.reserves) ? l.reserves : []).filter(Boolean).map(r => r.id)];
  return { ...x, checkLife: rest, gone: ids.reduce<string[] | undefined>(addGone, x.gone) };
};
const BY_LABEL = { ...CHECK_BY, other: 'Autre, précisez' };
const chip = (on: boolean) => `rounded-full border px-2.5 py-1 text-[11px] font-semibold ${TOUCH} ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`;

// A person or company: from the directory (1.3), outside organisations first, or written ("Autre, précisez")
const GROUPS: ContactCategory[] = ['prestataire', 'fournisseur', 'administration', 'secours', 'conseil', 'sante', 'finance', 'autre', 'client', 'interne'];
function Who({ state, contactId, name, label, onChange }: { state: State; contactId?: string; name: string; label: string; onChange(x: { contactId?: string; name: string }): void }) {
  const c = contactId ? state.contacts[contactId] : undefined;
  const [other, setOther] = useState(!c && !!name);
  const sel = c ? c.id : other ? '#other' : '';
  const list = Object.values(state.contacts).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b)));
  return (
    <div className="space-y-1.5">
      <Field label={label}>
        <select className={inputCls} value={sel} onChange={ev => {
          const v = ev.target.value;
          setOther(v === '#other');
          const x = v && v !== '#other' ? state.contacts[v] : undefined;
          onChange(x ? { contactId: x.id, name: x.company || x.name } : { contactId: undefined, name: v === '#other' && !c ? name : '' });
        }}>
          <option value="">Choisir dans l'annuaire…</option>
          {GROUPS.map(k => { const xs = list.filter(x => x.category === k); return xs.length ? <optgroup key={k} label={categoryLabel(k)}>{xs.map(x => <option key={x.id} value={x.id}>{contactLabel(x)}</option>)}</optgroup> : null; })}
          <option value="#other">Autre, précisez</option>
        </select>
      </Field>
      {sel === '#other' && <input className={inputCls} value={name} placeholder="Nom de la personne ou de l'entreprise" aria-label={`${label} : précisez`} onChange={ev => onChange({ contactId: undefined, name: ev.target.value })} />}
      {c?.phone && <a href={`tel:${telOf(c.phone)}`} className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-delacour-primary hover:bg-slate-50 ${TOUCH}`}><Phone size={13} />{c.phone}</a>}
    </div>
  );
}

// ---- "Fait": date, who, result, report (photo or link), note; the observations become reserves with a limit date
function DoneDialog({ e, c, by, onSave, onClose }: { e: Equipment; c: EqCheck; by: string; onSave(done: CheckDone, reserves: { text: string; due: string }[]): void; onClose(): void }) {
  const today = isoDate(new Date());
  const ext = c.by && c.by !== 'internal' ? c.who?.trim() || '' : '';
  const [date, setDate] = useState(today), [who, setWho] = useState(ext || (by === 'anonyme' ? '' : by));
  const [result, setResult] = useState<CheckDone['result']>('ok'), [mode, setMode] = useState<'photo' | 'link'>('photo');
  const [photo, setPhoto] = useState(''), [link, setLink] = useState(''), [note, setNote] = useState('');
  const [rows, setRows] = useState([{ text: '', due: addDays(today, 30) }]);
  const [error, setError] = useState('');
  const word = isCalibration(e, c) ? 'Certificat' : 'Rapport';
  const people = [...new Set([by === 'anonyme' ? '' : by, ext, e.operator, txt(e.deputy), e.manager].map(x => x.trim()).filter(Boolean))];
  const badLink = mode === 'link' && !!link.trim() && !safeUrl(link);
  const setRow = (i: number, x: Partial<(typeof rows)[number]>) => setRows(r => r.map((y, j) => (j === i ? { ...y, ...x } : y)));
  const save = () => {
    if (!date) return setError('La date du contrôle manque.');
    if (date > today) return setError('La date du contrôle est dans le futur.');
    if (!who.trim()) return setError('Le nom de la personne qui a fait le contrôle manque.');
    if (badLink) return setError(`Le lien du ${word.toLowerCase()} ne commence pas par http:// ou https://.`);
    // "avec observations" without a single observation would leave the check unfollowed: the domain asks for one (observationProblem)
    const problem = observationProblem(result, rows.map(r => r.text));
    if (problem) return setError(problem);
    const report = mode === 'photo' ? photo : safeUrl(link);
    onSave({ date, by: who.trim(), result, ...(report ? { report } : {}), note: note.trim() }, result === 'ok' ? [] : rows.filter(r => r.text.trim()).map(r => ({ text: r.text, due: r.due })));
  };
  return (
    <Modal onClose={onClose} title={`Contrôle fait : ${nameOf(c)}`} subtitle={e.name.trim() || 'Équipement sans nom'}
      footer={<>
        {error && <span role="alert" className="mr-auto text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={onClose}>Annuler</Button>
        <Button kind="primary" onClick={save}><Check size={14} />Noter le contrôle fait</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date du contrôle"><input type="date" autoFocus className={inputCls} value={date} max={today} onChange={ev => setDate(ev.target.value)} /></Field>
          <Field label="Fait par"><input className={inputCls} value={who} list="people" placeholder="Personne, prestataire ou organisme" onChange={ev => setWho(ev.target.value)} /></Field>
        </div>
        {people.length > 0 && <div className="flex flex-wrap gap-1.5" role="group" aria-label="Personnes proposées">{people.map(n => <button key={n} type="button" aria-pressed={who === n} className={chip(who === n)} onClick={() => setWho(n)}>{n}</button>)}</div>}
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-700">Résultat</span>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Résultat du contrôle">
            {(Object.keys(RESULT) as CheckDone['result'][]).map(k => (
              <button key={k} type="button" role="radio" aria-checked={result === k} onClick={() => setResult(k)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold min-h-[44px] ${result === k ? RESULT[k].on : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                <span aria-hidden>{RESULT[k].sym}</span>{RESULT[k].label}
              </button>
            ))}
          </div>
        </div>
        {result !== 'ok' && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
            <span className="block text-[11px] font-semibold text-amber-950">Observations à lever{result === 'remarks' ? ' (une au moins)' : ''}, chacune avec sa date limite</span>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <input className={`${inputCls} col-span-2 sm:col-span-1`} value={r.text} placeholder="Ce qui est à corriger" aria-label={`Observation ${i + 1}`} aria-required={result === 'remarks' && i === 0} onChange={ev => setRow(i, { text: ev.target.value })} />
                <label className="block"><span className="sr-only">Date limite de l'observation {i + 1}</span><input type="date" className={inputCls} value={r.due} aria-label={`Date limite de l'observation ${i + 1}`} onChange={ev => setRow(i, { due: ev.target.value })} /></label>
                <button type="button" aria-label={`Retirer l'observation ${i + 1}`} className="inline-flex items-center justify-center rounded p-1.5 text-slate-500 hover:text-red-600 max-sm:min-h-[44px] max-sm:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]" onClick={() => setRows(x => (x.length > 1 ? x.filter((_, j) => j !== i) : [{ text: '', due: r.due }]))}><X size={16} /></button>
              </div>
            ))}
            <Button className="!py-1" onClick={() => setRows(x => [...x, { text: '', due: addDays(today, 30) }])}><Plus size={13} />Ajouter une observation</Button>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-700">{word} :</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label={`Forme du ${word.toLowerCase()}`}>
              {([['photo', 'Photo'], ['link', 'Lien']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={mode === k} className={chip(mode === k)} onClick={() => setMode(k)}>{l}</button>)}
            </div>
          </div>
          {mode === 'photo'
            ? <div className="max-w-[12rem]"><PhotoBox value={photo} label={`${word} du contrôle ${nameOf(c)}`} onChange={setPhoto} /></div>
            : <div className="space-y-1"><input className={inputCls} value={link} placeholder="https://…" aria-label={`Lien du ${word.toLowerCase()}`} aria-invalid={badLink} onChange={ev => setLink(ev.target.value)} />{badLink && <span className="block text-[11px] text-red-700">Ce lien ne commence pas par http:// ou https://.</span>}</div>}
        </div>
        <Field label="Note"><input className={inputCls} value={note} placeholder="Facultatif" onChange={ev => setNote(ev.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---- "Planifier": the date planned and with whom
function PlanDialog({ e, c, onSave, onClose }: { e: Equipment; c: EqCheck; onSave(at: string, withWho: string): void; onClose(): void }) {
  const today = isoDate(new Date()), life = lifeOf(e, c), due = nextDue(e, c);
  const [date, setDate] = useState(life.plannedAt || (due && due >= today ? due : today));
  const [who, setWho] = useState(life.plannedWith || (c.by && c.by !== 'internal' ? c.who?.trim() || '' : ''));
  const [error, setError] = useState('');
  return (
    <Modal onClose={onClose} title={`Planifier : ${nameOf(c)}`} subtitle={e.name.trim() || 'Équipement sans nom'}
      footer={<>
        {error && <span role="alert" className="mr-auto text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={onClose}>Annuler</Button>
        <Button kind="primary" onClick={() => (date ? onSave(date, who) : setError('La date prévue manque.'))}><CalendarClock size={14} />{life.plannedAt ? 'Changer la date prévue' : 'Noter la date prévue'}</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date prévue" hint={due ? `Échéance du contrôle : ${frDate(due)}` : undefined}><input type="date" autoFocus className={inputCls} value={date} onChange={ev => setDate(ev.target.value)} /></Field>
        <Field label="Avec qui"><input className={inputCls} value={who} list="people" placeholder="Prestataire, organisme ou personne" onChange={ev => setWho(ev.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// Report of a check kept as a photo: seen full size
function ReportViewer({ title, value, onClose }: { title: string; value: string; onClose(): void }) {
  return <Modal wide onClose={onClose} title={title}><Pic value={value} alt={title} size="v" fit="contain" className="max-h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-50" /></Modal>;
}

// ---- the tab
export function ChecksTab(p: EqTabProps) {
  const { e, state } = p;
  const now = new Date(), today = isoDate(now), soon = maintCfg(state.params).soonDays;
  const tasks = e.tasks || [];
  const { bar, offer } = useUndo();
  const [dialog, setDialog] = useState<{ kind: 'done' | 'plan'; id: string } | null>(null);
  const [viewing, setViewing] = useState<{ title: string; value: string } | null>(null);
  const [fresh, setFresh] = useState('');   // the check just added: its settings are open
  const upd = (id: string, patch: Partial<EqCheck>) => p.set({ tasks: tasks.map(t => (t.id === id ? { ...t, ...patch } : t)) });
  const add = (label?: string, every?: Every, legal?: boolean, kind?: EqCheck['kind']) => { const c = newCheck(label, every, legal, kind); p.set({ tasks: [...tasks, c] }); setFresh(c.id); };
  // A move of the life of one check, written at once; "Annuler" removes only what the move did (the line of history, the date planned, the observation lifted)
  const eqMove = useEqMove(offer);
  const move = (c: EqCheck, what: string, f: (x: Equipment, by: string) => Equipment) => {
    const g = (x: Equipment, who: string) => f(withCheck(x, c), who);
    if (p.saved) eqMove(e.id, what, g); else p.act(g);
  };
  const days = (every: Every) => newCheck('', every).everyDays;   // same rounding as when a check is created
  const rows = tasks.map(c => ({ c, st: checkState(e, c, now, soon), d: dueIn(e, c, now) }));
  const count = (s: string) => rows.filter(r => r.st === s).length;
  const summary = [[count('ko'), plural(count('ko'), 'non conforme')], [count('late'), plural(count('late'), 'échu')], [count('soon'), `${count('soon')} à planifier`], [count('planned'), plural(count('planned'), 'planifié')], [count('ok'), `${count('ok')} à jour`], [count('nodate'), `${count('nodate')} sans date`]]
    .filter(x => x[0]).map(x => x[1]).join(', ');
  const reserves = openReserves(e), ct = e.contract, cst = contractState(e, now);
  const setCt = (x: Partial<Contract>) => p.set({ contract: { provider: '', until: '', ...ct, ...x } });
  const dc = dialog && tasks.find(t => t.id === dialog.id);
  const cat = catalogue(state.params);

  return (
    <div className="space-y-5">
      {reserves.length > 0 && (
        <section className="space-y-2" aria-label="Observations à lever">
          <SubTitle>Observations à lever : {reserves.length}</SubTitle>
          <ul className="space-y-1.5">
            {reserves.map(({ check, reserve }) => {
              const late = reserveLate(reserve, now), n = daysBetween(reserve.due, now) ?? 0;
              return (
                <li key={reserve.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <div className="min-w-0 flex-1 text-xs">
                    <strong className="block text-slate-900">{reserve.text}</strong>
                    <span className="block text-[11px] text-slate-600">{nameOf(check)} · {reserve.due ? (late ? `limite le ${frDate(reserve.due)}, en retard de ${plural(n, 'jour')}` : `à lever avant le ${frDate(reserve.due)}`) : 'sans date limite'}</span>
                  </div>
                  <StatusBadge level={late ? 'alert' : 'warn'} text={late ? 'En retard' : 'À lever'} />
                  <Button aria-label={`Observation levée : ${reserve.text}`} onClick={() => move(check, 'Observation levée', x => liftReserve(x, check.id, reserve.id, today))}><Check size={14} />Levée</Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Contrôles périodiques">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <SubTitle>Contrôles périodiques : {tasks.length}</SubTitle>
            <p className="text-[11px] text-slate-600">{tasks.length ? `${summary}.` : 'Aucun contrôle pour cet équipement.'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Ajouter un contrôle du catalogue">
              <select className={`${inputCls} min-w-[14rem]`} value="" onChange={ev => { const x = cat[Number(ev.target.value)]; if (x) add(x.label.trim().toLowerCase() === 'autre' ? '' : x.label, x.every, !!x.legal, x.kind); }}>
                <option value="">Choisir…</option>
                {cat.map((x, i) => <option key={i} value={i}>{x.label} · {formatEvery(x.every)}</option>)}
              </select>
            </Field>
            <Button onClick={() => add()}><Plus size={14} />Contrôle vide</Button>
          </div>
        </div>
        <ul className="space-y-3">
          {rows.map(({ c, st, d }) => {
            const life = lifeOf(e, c), hist = historyOf(e, c), last = hist[0], due = nextDue(e, c), plan = life.plannedAt, every = everyOf(c), cal = isCalibration(e, c);
            const word = cal ? 'Certificat' : 'Rapport', lifted = (life.reserves || []).filter(r => r.liftedAt);
            return (
              <li key={c.id} className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900">{nameOf(c)}{c.legal && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">Obligatoire</span>}</h4>
                    <p className="text-[11px] text-slate-600">{[CHECK_KIND[c.kind ?? 'periodic'], formatEvery(every), c.by ? `${CHECK_BY[c.by]}${c.who?.trim() ? ` : ${c.who.trim()}` : ''}` : ''].filter(Boolean).join(' · ')}</p>
                  </div>
                  <StatusBadge level={CHECK_STATE[st].tone} text={CHECK_STATE[st].label} />
                </div>
                <p className="text-[11px] text-slate-700">
                  {last ? <>Dernier contrôle le {frDate(last.date)}{last.by ? ` par ${last.by}` : ''}, <span className={`font-semibold ${RESULT[last.result].text}`}>{RESULT[last.result].label.toLowerCase()}</span>.</> : 'Jamais fait.'}{' '}
                  {due && d !== null ? <>Prochaine échéance le {frDate(due)} ({dueText(d)}).</> : "Pas de date d'échéance."}{' '}
                  {plan && <>Planifié le {frDate(plan)}{life.plannedWith ? ` avec ${life.plannedWith}` : ''}.</>}
                </p>
                {cal && <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700">N° d'identification : <strong className="font-mono">{e.serial?.trim() || 'non renseigné (onglet Fiche)'}</strong> · Prochain étalonnage : <strong>{due ? frDate(due) : 'sans date'}</strong></p>}
                <div className="flex flex-wrap gap-2">
                  <Button kind="primary" aria-label={`Noter le contrôle ${nameOf(c)} comme fait`} onClick={() => setDialog({ kind: 'done', id: c.id })}><Check size={14} />Fait</Button>
                  <Button aria-label={`${plan ? 'Changer la date prévue de' : 'Planifier'} ${nameOf(c)}`} onClick={() => setDialog({ kind: 'plan', id: c.id })}><CalendarClock size={14} />{plan ? 'Changer la date prévue' : 'Planifier'}</Button>
                  {plan && <Button kind="ghost" aria-label={`Enlever la date prévue de ${nameOf(c)}`} onClick={() => move(c, 'Date prévue enlevée', x => unplanCheck(x, c.id))}>Enlever la date prévue</Button>}
                </div>

                <details className="rounded-lg border border-slate-200" open={fresh === c.id}>
                  <summary className={`flex cursor-pointer items-center px-2.5 py-2 text-[11px] font-semibold text-delacour-primary ${TOUCH}`}>Réglages du contrôle</summary>
                  <div className="grid gap-3 border-t border-slate-100 p-2.5 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Libellé"><input className={inputCls} value={c.label} autoFocus={fresh === c.id && !c.label} placeholder="Précisez le contrôle" onChange={ev => upd(c.id, { label: ev.target.value })} /></Field></div>
                    <Field label="Nature">
                      <select className={inputCls} value={c.kind ?? 'periodic'} onChange={ev => upd(c.id, { kind: ev.target.value as NonNullable<EqCheck['kind']> })}>
                        {(Object.entries(CHECK_KIND) as [NonNullable<EqCheck['kind']>, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="Fréquence">
                      <span className="flex gap-1.5">
                        <NumInput value={every.value} aria-label="Nombre" className="!w-20 text-right" onChange={v => { const x = { ...every, value: Math.max(1, Math.round(v ?? 1)) }; upd(c.id, { every: x, everyDays: days(x) }); }} />
                        <select className={inputCls} value={every.unit} aria-label="Unité de la fréquence" onChange={ev => { const x = { ...every, unit: ev.target.value as Every['unit'] }; upd(c.id, { every: x, everyDays: days(x) }); }}>
                          {EVERY_UNITS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                        </select>
                      </span>
                    </Field>
                    <label className={`flex items-center gap-2 text-xs text-slate-800 ${TOUCH}`}><input type="checkbox" className="h-4 w-4" checked={c.legal} onChange={ev => upd(c.id, { legal: ev.target.checked })} />Marqué obligatoire par l'entreprise</label>
                    {!last && <Field label="Première échéance" hint="Tant que le contrôle n'a jamais été fait."><input type="date" className={inputCls} value={c.first || ''} onChange={ev => upd(c.id, { first: ev.target.value || undefined })} /></Field>}
                    <Field label="Qui le réalise">
                      <select className={inputCls} value={c.by ?? ''} onChange={ev => {
                        const by = (ev.target.value || undefined) as EqCheck['by'];
                        upd(c.id, { by, ...((c.by === 'internal') !== (by === 'internal') ? { who: undefined, contactId: undefined } : {}) });
                      }}>
                        <option value="">Non précisé</option>
                        {(Object.entries(BY_LABEL) as [NonNullable<EqCheck['by']>, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </Field>
                    {c.by === 'internal' && <Field label="Qui le fait"><input className={inputCls} value={c.who || ''} list="people" onChange={ev => upd(c.id, { who: ev.target.value })} /></Field>}
                    {c.by && c.by !== 'internal' && <Who state={state} contactId={c.contactId} name={c.who || ''} label={c.by === 'other' ? 'Qui, précisez' : c.by === 'agreed' ? 'Organisme' : 'Prestataire'} onChange={x => upd(c.id, { contactId: x.contactId, who: x.name })} />}
                    <div className="sm:col-span-2">
                      <DeleteButton onClick={() => p.set({ tasks: tasks.filter(t => t.id !== c.id) }, x => dropLife(x, c.id))}><X size={14} />Retirer ce contrôle</DeleteButton>
                      {hist.length > 0 && <span className="ml-2 text-[11px] text-slate-500">Son historique ({plural(hist.length, 'ligne')}) part avec lui ; « Annuler » le remet pendant 8 secondes.</span>}
                    </div>
                  </div>
                </details>

                <details className="rounded-lg border border-slate-200">
                  <summary className={`flex cursor-pointer items-center px-2.5 py-2 text-[11px] font-semibold text-delacour-primary ${TOUCH}`}>Historique : {hist.length}</summary>
                  <div className="space-y-2 border-t border-slate-100 p-2.5">
                    {hist.length === 0 ? <p className="text-[11px] text-slate-500">Aucun contrôle noté.</p> : (
                      <ul className="space-y-1.5">
                        {hist.map((h, i) => {
                          const link = safeUrl(h.report);
                          return (
                            <li key={`${h.date}-${i}`} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-700">
                              <span className="font-mono font-semibold">{frDate(h.date)}</span>
                              <span className={`font-semibold ${RESULT[h.result].text}`}><span aria-hidden>{RESULT[h.result].sym}</span> {RESULT[h.result].label}</span>
                              {h.by && <span>{h.by}</span>}
                              {h.note && <span className="text-slate-500">{h.note}</span>}
                              {life.history.includes(h) && <button type="button" aria-label={`Retirer la ligne du ${frDate(h.date)} : ${nameOf(c)}`} className={`rounded-lg border border-slate-300 px-2 py-1 font-semibold text-red-700 hover:bg-red-50 ${TOUCH}`} onClick={() => p.act(x => removeDone(x, c.id, doneKey(h)))}>Retirer cette ligne</button>}
                              {h.report && (link
                                ? <a href={link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 font-semibold text-delacour-primary hover:bg-slate-50 ${TOUCH}`}><ExternalLink size={12} />{word}</a>
                                : <button type="button" className={`inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 font-semibold text-delacour-primary hover:bg-slate-50 ${TOUCH}`} onClick={() => setViewing({ title: `${word} · ${nameOf(c)} · ${frDate(h.date)}`, value: h.report! })}><FileText size={12} />{word}</button>)}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {lifted.length > 0 && <ul className="space-y-0.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-600">{lifted.map(r => <li key={r.id}>Observation « {r.text} » levée le {frDate(r.liftedAt)}.</li>)}</ul>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2" aria-label="Contrat de maintenance">
        <SubTitle>Contrat de maintenance</SubTitle>
        {!ct ? (
          <Button onClick={() => setCt({})}><Plus size={14} />Ajouter un contrat de maintenance</Button>
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            {cst !== 'none' && <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700"><StatusBadge level={CONTRACT_BADGE[cst].level} text={CONTRACT_BADGE[cst].label} />{contractFact(e, now)}</div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Who state={state} contactId={ct.contactId} name={txt(ct.provider)} label="Prestataire" onChange={x => setCt({ contactId: x.contactId, provider: x.name })} />
              <Field label="Échéance du contrat"><input type="date" className={inputCls} value={txt(ct.until)} onChange={ev => setCt({ until: ev.target.value })} /></Field>
              <Field label="Délai d'intervention garanti"><input className={inputCls} value={ct.response || ''} placeholder="Ex. : 4 heures ouvrées" onChange={ev => setCt({ response: ev.target.value || undefined })} /></Field>
              <Field label="Note"><input className={inputCls} value={ct.note || ''} onChange={ev => setCt({ note: ev.target.value || undefined })} /></Field>
            </div>
            <DeleteButton onClick={() => { const before = ct; p.set({ contract: undefined }); offer('Contrat retiré', () => p.set({ contract: before })); }}><X size={14} />Retirer le contrat</DeleteButton>
          </div>
        )}
      </section>

      {dialog?.kind === 'done' && dc && (
        <DoneDialog e={e} c={dc} by={p.by} onClose={() => setDialog(null)}
          onSave={(done, rs) => { move(dc, `Contrôle « ${nameOf(dc)} » noté fait`, x => rs.reduce((acc, r) => addReserve(acc, dc.id, r.text, r.due), markDone(x, dc.id, done))); setDialog(null); }} />
      )}
      {dialog?.kind === 'plan' && dc && (
        <PlanDialog e={e} c={dc} onClose={() => setDialog(null)} onSave={(at, who) => { move(dc, `Contrôle « ${nameOf(dc)} » planifié`, x => planCheck(x, dc.id, at, who)); setDialog(null); }} />
      )}
      {viewing && <ReportViewer title={viewing.title} value={viewing.value} onClose={() => setViewing(null)} />}
      {bar}
    </div>
  );
}
