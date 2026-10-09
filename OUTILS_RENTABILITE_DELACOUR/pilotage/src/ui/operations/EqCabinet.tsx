// The cabinet of tool 3.3 (survival cabinet): one common list of spare parts for the whole company, each part saying which equipment it serves.
// "CabinetView" is the view with all the parts; the same rows, more compact, fill the "Armoire" tab of an equipment (EqCabinetTab) and the sheet of a part
// (EqSpareSheet) reuses the stock, order and dialog pieces. Every move (part taken, put back, ordered, received, counted) is written to the store at once and
// offers "Annuler" for 8 seconds; nothing here goes through a typed copy. Messages are facts; only the buttons are verbs.
import { useState } from 'react';
import { Key, Minus, Package, Plus, Search } from 'lucide-react';
import type { Equipment, Level, Spare, State } from '../../domain/types';
import { daysBetween, frStamp, nowLocal } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { isAbsent } from '../../domain/commercial';
import { norm } from '../../domain/instructions';
import { maintCfg, openAnomalies, openBreakdown, txt } from '../../domain/maintenance';
import {
  activeSpares, cancelOrder, countSpare, expiresIn, isCritical, leadLabel, newSpare, orderLateDays, orderOf, orderSpare, putBack, receiveSpare, SPARE_LEVEL,
  spareLevel, stockWeeks, takeOut, type SpareLevel,
} from '../../domain/maintenanceSpares';
import { Pic } from '../../photo/Pic';
import { Button, Card, Chips, Empty, Field, inputCls, Modal, NumInput, StatusBadge } from '../common';
import { num, useCountCabinet, useSpareAct, useSpareMove, useUndo } from './EqBits';

export type Offer = (what: string, back: () => void) => void;
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
export const spareName = (sp: Spare) => sp.name.trim() || sp.ref.trim() || 'Pièce sans nom';
export const weeksText = (w: number) => `${w < 10 ? w.toLocaleString('fr-FR') : Math.round(w)} semaine${w >= 2 ? 's' : ''}`;
const listOf = (xs: string[]) => xs.slice(0, 3).join(', ') + (xs.length > 3 ? ` et ${xs.length - 3} autre${xs.length > 4 ? 's' : ''}` : '');
const touch = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';

// A move on one part, written now; "Annuler" does the inverse of the move on the part as it is then (the stock never goes back to an absolute value, a
// movement or an order made meanwhile stays)
function useMove(offer: Offer) {
  const move = useSpareMove(offer);
  return (sp: Spare, what: string, f: (x: Spare, by: string) => Spare) => move(sp.id, what, f);
}

// ---- "Pièce prise : pour quel équipement ?"
export function TakeDialog({ sp, state, eqId, onClose, onConfirm }: {
  sp: Spare; state: State; eqId?: string; onClose(): void; onConfirm(link: { equipmentId?: string; anomalyId?: string; breakdownId?: string; note?: string }): void;
}) {
  const eqs = sp.equipmentIds.map(id => state.equipments[id]).filter((e): e is Equipment => !!e);
  const OTHER = '__other';
  const [eq, setEq] = useState(eqId && eqs.some(e => e.id === eqId) ? eqId : eqs.length === 1 ? eqs[0].id : eqs.length ? '' : OTHER);
  const [why, setWhy] = useState('');   // 'an:<id>' or 'bd:<id>', empty = none in particular
  const [precise, setPrecise] = useState(''), [note, setNote] = useState('');
  const e = state.equipments[eq];
  const anomalies = e ? openAnomalies(e) : [], bd = e ? openBreakdown(e) : undefined;
  const radio = (on: boolean) => `flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`;
  const done = () => {
    const text = [eq === OTHER && precise.trim() ? `Autre équipement : ${precise.trim()}` : '', note.trim()].filter(Boolean).join(' · ');
    onConfirm({ ...(e ? { equipmentId: e.id } : {}), ...(why.startsWith('an:') ? { anomalyId: why.slice(3) } : why.startsWith('bd:') ? { breakdownId: why.slice(3) } : {}), ...(text ? { note: text } : {}) });
  };
  return (
    <Modal title="Pièce prise : pour quel équipement ?" subtitle={`${spareName(sp)} · stock ${num(sp.stock)}, mini ${num(sp.min)}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={!eq} onClick={done} className="!min-h-[48px] px-5">Pièce prise</Button></>}>
      <div className="space-y-4">
        {num(sp.stock) <= 0 && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-950">Le stock est déjà à 0 : la sortie est notée dans l'historique, le stock reste à 0.</p>}
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-[11px] font-semibold text-slate-700">Équipement</legend>
          <div className="space-y-1.5">
            {eqs.map((x, i) => <button key={x.id} type="button" aria-pressed={eq === x.id} autoFocus={i === 0 && !eq} className={radio(eq === x.id)} onClick={() => { setEq(x.id); setWhy(''); }}>{x.name || 'Équipement sans nom'}</button>)}
            <button type="button" aria-pressed={eq === OTHER} className={radio(eq === OTHER)} onClick={() => { setEq(OTHER); setWhy(''); }}>Autre, précisez</button>
          </div>
          {eq === OTHER && <input className={inputCls} value={precise} placeholder="Équipement ou usage" aria-label="Autre équipement, précisez" onChange={x => setPrecise(x.target.value)} />}
        </fieldset>
        {(anomalies.length > 0 || bd) && (
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-[11px] font-semibold text-slate-700">Anomalie ou panne en cours (facultatif)</legend>
            <div className="space-y-1.5">
              <button type="button" aria-pressed={why === ''} className={radio(why === '')} onClick={() => setWhy('')}>Aucune en particulier</button>
              {anomalies.map(a => <button key={a.id} type="button" aria-pressed={why === `an:${a.id}`} className={radio(why === `an:${a.id}`)} onClick={() => setWhy(`an:${a.id}`)}>Anomalie : {a.label || 'sans titre'}{a.date ? ` (${frDate(a.date)})` : ''}</button>)}
              {bd && <button type="button" aria-pressed={why === `bd:${bd.id}`} className={radio(why === `bd:${bd.id}`)} onClick={() => setWhy(`bd:${bd.id}`)}>Panne en cours depuis le {frStamp(bd.startedAt || bd.date)}</button>}
            </div>
          </fieldset>
        )}
        <Field label="Un mot (facultatif)"><input className={inputCls} value={note} placeholder="Ce qui a été remplacé, par exemple" onChange={x => setNote(x.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// ---- count of one part: the real stock; a gap becomes a movement of the history
export function CountDialog({ sp, onClose, onConfirm }: { sp: Spare; onClose(): void; onConfirm(real: number): void }) {
  const [real, setReal] = useState<number | null>(num(sp.stock));
  const gap = real === null ? null : Math.max(0, Math.round(real)) - num(sp.stock);
  return (
    <Modal title={`Compter : ${spareName(sp)}`} subtitle={`Stock enregistré : ${num(sp.stock)}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={real === null} onClick={() => onConfirm(real ?? num(sp.stock))}>Compté</Button></>}>
      <div className="space-y-3">
        <Field label="Nombre de pièces comptées dans l'armoire"><NumInput value={real} autoFocus aria-label="Stock réel" className="max-w-[8rem] !text-base" onChange={setReal} /></Field>
        <p role="status" className="text-[11px] text-slate-600">
          {gap === null ? 'Saisir le nombre de pièces trouvées.' : gap === 0 ? 'Le comptage confirme le stock enregistré.' : `Écart de ${gap > 0 ? '+' : '−'}${Math.abs(gap)} : un mouvement de correction est écrit dans l'historique.`}
        </p>
      </div>
    </Modal>
  );
}

// ---- − stock + (64 px: a gesture of the field), and "Compter"
export function StockBlock({ sp, state, offer, eqId, compact = false }: { sp: Spare; state: State; offer: Offer; eqId?: string; compact?: boolean }) {
  const move = useMove(offer);
  const [dlg, setDlg] = useState<'take' | 'count' | null>(null);
  const name = spareName(sp);
  const size = compact ? 'h-11 w-11 max-sm:h-16 max-sm:w-16 [@media(pointer:coarse)]:h-16 [@media(pointer:coarse)]:w-16' : 'h-16 w-16';
  const btn = `${size} flex shrink-0 items-center justify-center rounded-xl border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold`;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setDlg('take')} aria-label={`Pièce prise : ${name}`} title="Pièce prise" className={`${btn} border-slate-400 bg-white text-slate-900 hover:bg-slate-50`}><Minus size={compact ? 20 : 28} aria-hidden /></button>
        <span className="min-w-[3.25rem] text-center">
          <span aria-live="polite" className="block font-mono text-xl font-bold text-slate-900"><span className="sr-only">Stock : </span>{num(sp.stock)}</span>
          <span className="block text-[11px] text-slate-500">mini {num(sp.min)}</span>
        </span>
        <button type="button" onClick={() => move(sp, `Pièce rangée : ${name}`, (x, by) => putBack(x, by))} aria-label={`Pièce rangée : ${name}`} title="Pièce rangée" className={`${btn} border-delacour-primary bg-delacour-primary text-white hover:bg-delacour-dark`}><Plus size={compact ? 20 : 28} aria-hidden /></button>
      </div>
      <button type="button" onClick={() => setDlg('count')} aria-label={`Compter : ${name}`} className={`rounded px-2 text-[11px] font-semibold text-delacour-primary underline ${touch}`}>Compter</button>
      {dlg === 'take' && <TakeDialog sp={sp} state={state} eqId={eqId} onClose={() => setDlg(null)} onConfirm={link => { move(sp, `Pièce prise : ${name}`, (x, by) => takeOut(x, by, link)); setDlg(null); }} />}
      {dlg === 'count' && <CountDialog sp={sp} onClose={() => setDlg(null)} onConfirm={n => { move(sp, `Compté : ${name}`, (x, by) => countSpare(x, by, nowLocal(), n)); setDlg(null); }} />}
    </div>
  );
}

// ---- the order: "Commandée aujourd'hui", the quantity and the expected day, "Reçue" (the stock goes up by the quantity), a late delivery said as a fact.
// A part above its mini shows nothing unless `always` (the sheet of the part).
export function OrderBlock({ sp, offer, now, always = false }: { sp: Spare; offer: Offer; now: Date; always?: boolean }) {
  const move = useMove(offer), act = useSpareAct();
  const order = orderOf(sp), late = orderLateDays(sp, now), name = spareName(sp);
  if (!order) {
    if (!always && spareLevel(sp) === 'ok') return null;
    const qty = Math.max(1, num(sp.min) - num(sp.stock));
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button onClick={() => move(sp, `Commande notée : ${name}`, x => orderSpare(x, qty, isoDate(new Date())))} aria-label={`Commandée aujourd'hui : ${name}, ${plural(qty, 'pièce')}`}>Commandée aujourd'hui</Button>
        <span className="text-[11px] text-slate-500">{plural(qty, 'pièce')} proposée{qty > 1 ? 's' : ''}{typeof sp.leadDays === 'number' ? `, livraison en ${leadLabel(sp)}` : ''}</span>
      </div>
    );
  }
  const patch = (o: Partial<typeof order>) => act(sp.id, x => (x.order ? { ...x, order: { ...x.order, ...o } } : x));
  return (
    <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2 rounded-lg bg-slate-50 p-2">
      <p className="min-w-0 flex-1 basis-48 text-[11px] text-slate-700">
        <strong className="text-slate-900">Commandée le {frDate(order.at)}</strong> : {plural(order.qty, 'pièce')}.{' '}
        {late > 0 ? <strong className="text-red-700">Livraison attendue depuis {plural(late, 'jour')}.</strong> : order.expectedAt ? `Livraison attendue le ${frDate(order.expectedAt)}.` : "Date d'arrivée non renseignée."}
      </p>
      <label className="text-[11px] font-semibold text-slate-700">Quantité<NumInput value={order.qty} aria-label={`Quantité commandée : ${name}`} className="mt-0.5 !w-20 text-right" onChange={v => v !== null && patch({ qty: Math.max(1, Math.round(v)) })} /></label>
      <label className="text-[11px] font-semibold text-slate-700">Livraison prévue le<input type="date" className={`${inputCls} mt-0.5`} value={order.expectedAt} aria-label={`Livraison prévue : ${name}`} onChange={e => patch({ expectedAt: e.target.value })} /></label>
      <Button kind="primary" aria-label={`Commande reçue : ${name}, le stock monte de ${order.qty}`} onClick={() => move(sp, `Reçue : ${name}`, (x, by) => receiveSpare(x, by, nowLocal()))}>Reçue : +{order.qty}</Button>
      <Button kind="ghost" aria-label={`Retirer la commande de ${name}`} onClick={() => move(sp, `Commande retirée : ${name}`, x => cancelOrder(x))}>Retirer la commande</Button>
    </div>
  );
}

// ---- one part: photo, name, reference, what it serves, level (colour and label), stock, order
export function SpareRow({ sp, state, offer, now, onOpen, eqId, compact = false, onUnlink }: {
  sp: Spare; state: State; offer: Offer; now: Date; onOpen(): void; eqId?: string; compact?: boolean; onUnlink?(): void;
}) {
  const lv = spareLevel(sp), name = spareName(sp);
  const eqs = sp.equipmentIds.map(id => state.equipments[id]).filter((e): e is Equipment => !!e);
  const others = eqs.filter(e => e.id !== eqId).map(e => e.name || 'Équipement sans nom');
  const serves = compact ? (others.length ? `Sert aussi : ${listOf(others)}` : '') : eqs.length ? `Sert : ${listOf(others)}` : 'Aucun équipement indiqué';
  const w = stockWeeks(sp, now), exp = expiresIn(sp, now);
  const facts: { t: string; bad?: boolean }[] = [
    ...(sp.place ? [{ t: `Rangée : ${sp.place}` }] : []),
    { t: typeof sp.leadDays === 'number' ? `livraison en ${leadLabel(sp)}` : 'délai inconnu' },
    ...(w !== null && num(sp.stock) > 0 ? [{ t: `stock pour ${weeksText(w)}` }] : []),
    ...(exp !== null && exp <= 60 ? [{ t: `date limite ${exp < 0 ? `dépassée depuis ${plural(-exp, 'jour')}` : exp === 0 ? "aujourd'hui" : `dans ${plural(exp, 'jour')}`}`, bad: exp < 0 }] : []),
  ];
  const border = lv === 'out' || lv === 'low' ? (isCritical(sp) ? 'border-red-300' : 'border-amber-300') : lv === 'min' ? 'border-amber-300' : 'border-slate-200';
  return (
    <li className={`rounded-xl border bg-white p-3 ${border}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onOpen} aria-label={`Ouvrir la fiche de la pièce ${name}`} className="flex min-w-0 flex-1 basis-56 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold">
          {sp.photo ? <Pic value={sp.photo} alt="" size="t" className={`${compact ? 'h-10 w-10' : 'h-14 w-14'} shrink-0 rounded-lg bg-slate-100`} />
            : <span className={`${compact ? 'h-10 w-10' : 'h-14 w-14'} flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400`}><Package size={compact ? 16 : 22} aria-hidden /></span>}
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex flex-wrap items-baseline gap-x-2"><span className="text-xs font-bold text-slate-900">{name}</span>{sp.ref.trim() && sp.name.trim() && <span className="font-mono text-[11px] text-slate-500">{sp.ref}</span>}</span>
            {serves && <span className="block text-[11px] text-slate-600">{serves}</span>}
            <span className="block text-[11px] text-slate-500">{facts.map((f, i) => <span key={i} className={f.bad ? 'font-semibold text-red-700' : ''}>{i ? ' · ' : ''}{f.t}</span>)}</span>
          </span>
        </button>
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge level={SPARE_LEVEL[lv].tone} text={SPARE_LEVEL[lv].label} />
          {!isCritical(sp) && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Consommable</span>}
        </span>
        <StockBlock sp={sp} state={state} offer={offer} eqId={eqId} compact={compact} />
        {onUnlink && <button type="button" onClick={onUnlink} aria-label={`Retirer de cet équipement : ${name}`} title="La pièce reste dans l'armoire" className={`rounded-lg p-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-700 sm:p-2 ${touch}`}>Retirer de cet équipement</button>}
      </div>
      <OrderBlock sp={sp} offer={offer} now={now} />
    </li>
  );
}

// ---- the view with all the parts
type Filter = 'crit' | 'all' | 'low' | 'ordered' | 'count';
const RANK: Record<SpareLevel, number> = { out: 0, low: 1, min: 2, ok: 3 };
const toSettings = () => {
  const el = document.getElementById('reglages-3-3');
  if (!el) return;
  const d = el instanceof HTMLDetailsElement ? el : el.closest('details') ?? el.querySelector('details');
  if (d) d.open = true;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

// `onNew` opens the sheet of a part that is not written yet: it is written once it has a name or a reference
export function CabinetView({ state, onOpen, onNew }: { state: State; onOpen(spareId: string): void; onNew(sp: Spare): void }) {
  const { bar, offer } = useUndo();
  const countAll = useCountCabinet(offer);
  const [filter, setFilter] = useState<Filter>('crit');
  const [q, setQ] = useState('');
  const now = new Date(), day = isoDate(now), cfg = maintCfg(state.params);
  const all = activeSpares(state), crit = all.filter(isCritical);
  const toCount = (sp: Spare) => { const d = txt(sp.countedAt) ? daysBetween(txt(sp.countedAt), now) : null; return d === null || d >= cfg.countDays; };
  const TEST: Record<Filter, (sp: Spare) => boolean> = { crit: isCritical, all: () => true, low: sp => ['low', 'out'].includes(spareLevel(sp)), ordered: sp => !!orderOf(sp), count: toCount };
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hay = (sp: Spare) => norm([sp.name, sp.ref, sp.refs2, sp.place, sp.supplier, ...sp.equipmentIds.map(id => state.equipments[id]?.name)].join(' '));
  const shown = all.filter(TEST[filter]).filter(sp => words.every(w => hay(sp).includes(w))).sort((a, b) => RANK[spareLevel(a)] - RANK[spareLevel(b)]);

  // level of the cabinet: only critical parts weigh
  const lvOf = (xs: Spare[], l: SpareLevel[]) => xs.filter(x => l.includes(spareLevel(x)));
  const short = lvOf(crit, ['low', 'out']), outs = lvOf(crit, ['out']), mins = lvOf(crit, ['min']), oks = lvOf(crit, ['ok']);
  const orders = all.filter(x => orderOf(x)), late = all.filter(x => orderLateDays(x, now) > 0);
  const level: Level = !all.length ? 'pending' : short.length ? 'alert' : mins.length || late.length ? 'warn' : 'ok';
  const label = !all.length ? 'Armoire vide' : short.length ? `${plural(short.length, 'pièce')} sous le mini` : mins.length ? `${plural(mins.length, 'pièce')} au mini` : late.length ? `${plural(late.length, 'livraison')} en retard` : 'Toutes au-dessus du mini';
  const facts = [
    plural(crit.length, 'pièce critique', 'pièces critiques'), outs.length ? `${outs.length} en rupture` : '', short.length - outs.length ? `${short.length - outs.length} sous le mini` : '', mins.length ? `${mins.length} au mini` : '', `${oks.length} au-dessus du mini`,
    orders.length ? plural(orders.length, 'commande en cours', 'commandes en cours') : '', late.length ? `${late.length} en retard` : '', all.length > crit.length ? plural(all.length - crit.length, 'consommable') : '',
  ].filter(Boolean).join(' · ');

  // "Armoire comptée, rien à signaler": date and person on every part (countAll); Annuler puts back the previous count of each part, and only that
  const last = all.filter(x => txt(x.countedAt)).sort((a, b) => txt(b.countedAt).localeCompare(txt(a.countedAt)))[0];
  const lastDays = last ? daysBetween(txt(last.countedAt), now) : null;
  const m = state.params.maint || {}, holder = (m.keyHolder || '').trim(), deputy = (m.keyDeputy || '').trim();

  if (!all.length) {
    return (
      <Empty title="L'armoire de survie est vide" text="Une seule liste de pièces pour toute l'entreprise : chaque pièce dit quels équipements elle sert, son stock mini, son délai de livraison et où la trouver.">
        <Button kind="primary" onClick={() => onNew(newSpare())}><Plus size={14} />Nouvelle pièce</Button>
      </Empty>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">   {/* a title of level 3: the view sits under the "Équipements" title */}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-delacour-primary">L'armoire de survie</h3>
          <p className="max-w-3xl text-[11px] text-slate-500">Une seule liste de pièces pour toute l'entreprise : chaque pièce dit quels équipements elle sert.</p>
        </div>
        <Button kind="primary" onClick={() => onNew(newSpare())}><Plus size={14} />Nouvelle pièce</Button>
      </div>
      <Card className={`flex flex-wrap items-center gap-3 p-3 ${level === 'alert' ? 'border-red-300 bg-red-50/60' : level === 'warn' ? 'border-amber-300 bg-amber-50/60' : ''}`}>
        <StatusBadge level={level} text={label} />
        <p className="min-w-0 flex-1 basis-56 text-[11px] text-slate-700">{facts}</p>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Chips<Filter> value={filter} onChange={setFilter} items={[['crit', 'Critiques', crit.length], ['all', 'Toutes', all.length], ['low', 'Sous le mini', all.filter(TEST.low).length], ['ordered', 'Commandées', orders.length], ['count', 'À compter', all.filter(toCount).length]]} />
        <label className="relative ml-auto block min-w-[10rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Chercher une pièce</span>
          <Search size={13} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} !pl-8`} value={q} placeholder="Nom, référence, équipement, rangement" onChange={e => setQ(e.target.value)} />
        </label>
      </div>
      {shown.length ? (
        <ul className="space-y-2">{shown.map(sp => <SpareRow key={sp.id} sp={sp} state={state} offer={offer} now={now} onOpen={() => onOpen(sp.id)} />)}</ul>
      ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-[11px] text-slate-500">{words.length ? 'Aucune pièce ne correspond à cette recherche.' : filter === 'crit' ? 'Aucune pièce critique : les consommables sont dans « Toutes ».' : 'Aucune pièce dans ce filtre.'}</p>}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Button onClick={countAll}>Armoire comptée, rien à signaler</Button>
        <p className="min-w-0 flex-1 basis-56 text-[11px] text-slate-600">
          {last ? `Dernier comptage le ${frDate(txt(last.countedAt).slice(0, 10))}${last.countedBy ? ` · par ${last.countedBy}` : ''}${lastDays !== null ? ` · il y a ${plural(lastDays, 'jour')}` : ''}` : "L'armoire n'a jamais été comptée."}
          {(lastDays === null || lastDays >= cfg.countDays) && <strong className="text-amber-800"> · intervalle prévu : {plural(cfg.countDays, 'jour')}</strong>}
        </p>
      </Card>
      <Card className="flex flex-wrap items-center gap-2 p-3 text-[11px] text-slate-700">
        <Key size={16} aria-hidden className="shrink-0 text-slate-500" />
        <p className="min-w-0 flex-1 basis-56">
          <strong className="text-slate-900">Clé de l'armoire :</strong> {holder ? `porteur ${holder}` : 'porteur non indiqué'} · {deputy ? `suppléant ${deputy}` : 'suppléant non indiqué'} · {m.keyPlace?.trim() ? `emplacement : ${m.keyPlace.trim()}` : 'emplacement non indiqué'}.
          {holder && isAbsent(state, holder, day) && <strong className="text-amber-800"> {holder} est absent aujourd'hui{deputy ? (isAbsent(state, deputy, day) ? `, ${deputy} aussi.` : `, ${deputy} a la clé.`) : ', sans suppléant.'}</strong>}
        </p>
        <Button kind="ghost" onClick={toSettings}>Modifier dans les réglages</Button>
      </Card>
      {bar}
    </div>
  );
}
