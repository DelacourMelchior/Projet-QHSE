// The sheet of one part of the survival cabinet (tool 3.3). What is typed (name, reference, equipment served, supplier, mini, place, photos, date limit) is written
// as it is typed once the part has a name, also when the window closes, the page is left or the tab goes to the background. What lives apart (stock, movements,
// order, count: see takeSpareLife) is written at once by its own move, so a stale sheet never erases a part taken meanwhile.
// A part with a history is never deleted, only taken out of the cabinet; a part left empty is removed when the sheet closes. A new part lives in this window
// until it has a name or a reference. Writing puts on the saved part only the keys typed here (what another person changed on the other keys stays).
// A sheet opened on a part that was deleted elsewhere never writes it back: it says so and offers "Remettre la fiche".
import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Spare, SpareMove } from '../../domain/types';
import { frStamp } from '../../domain/base';
import { txt } from '../../domain/maintenance';
import { frDate } from '../../domain/periods';
import { norm, sopCfg } from '../../domain/instructions';
import {
  expiresIn, isCritical, leadDaysOf, moveSpare, orderLateDays, orderOf, SPARE_LEVEL, SPARE_LIFE, spareLevel, stockWeeks, supplierFacts, takeSpareLife, usedLast12m,
} from '../../domain/maintenanceSpares';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Field, inputCls, Modal, NewTab, NumInput, StatusBadge, SubTitle } from '../common';
import { PhotoBox } from '../PhotoBox';
import type { Nav } from '../tools';
import { OrderBlock, plural, spareName, StockBlock, weeksText } from './EqCabinet';
import { num, StorageNote, useSpareAct, useUndo } from './EqBits';

const WHY_LABEL: Record<SpareMove['why'], string> = { use: 'Pièce prise', return: 'Pièce rangée', received: 'Livraison reçue', count: 'Correction au comptage', start: 'Stock de départ' };
const CRITICAL_WHY: { key: NonNullable<Spare['why']>[number]; label: string }[] = [
  { key: 'stops', label: "Arrête l'équipement si elle casse" }, { key: 'hard', label: 'Introuvable vite chez un fournisseur' }, { key: 'single', label: 'Source unique' },
];
const OTHER = '__other';
const parseLead = (t: string) => (/^\s*\d+\s*$/.test(t) ? Number(t) : t.trim() ? leadDaysOf(t) : null);
// nothing typed, no history: a part created by "Nouvelle pièce" and left as it was
const isBlank = (y: Spare) => !`${y.name}${y.ref}${y.refs2 || ''}${y.place || ''}${y.supplier}${y.photo || ''}${y.placePhoto || ''}${txt(y.expiresAt)}`.trim()
  && !y.moves?.length && !y.order && !y.countedAt && y.stock === 1 && y.min === 1 && y.leadDays === null;
const identified = (y: Spare) => !!(y.name.trim() || y.ref.trim());
const Sec = ({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) => <section className="space-y-2"><SubTitle>{title}</SubTitle>{hint && <p className="-mt-1 text-[11px] text-slate-500">{hint}</p>}{children}</section>;

// `offerBack` shows "Annuler" after the sheet is closed (a deleted part): the bar of the sheet leaves with it
export function SpareSheet({ initial, onClose, nav, offerBack }: { initial: Spare; onClose(): void; nav: Nav; offerBack?(what: string, back: () => void): void }) {
  const { state, update, storageFull } = useStore();
  const act = useSpareAct();
  const { bar, offer } = useUndo();
  const [x, setX] = useState<Spare>(() => structuredClone(initial));
  const [rev, setRev] = useState(0);   // edits since the last write
  const [leadText, setLeadText] = useState(() => (typeof initial.leadDays === 'number' ? String(initial.leadDays) : ''));
  const [otherSupplier, setOtherSupplier] = useState(false);
  const [startText, setStartText] = useState(() => String(num(initial.stock)));
  const [allMoves, setAllMoves] = useState(false);
  const saved = state?.spares[x.id];
  const cur = saved ? takeSpareLife(x, saved) : x;   // typed content with the life of the saved part
  const latest = useRef(x), gone = useRef(false), dirty = useRef(new Set<keyof Spare>());   // dirty: the keys typed here since the last write
  latest.current = x;
  // The part is, or was, in the store: when it is missing later it was deleted elsewhere (another device, another tab). Typing never brings it back: the sheet says so
  // and offers "Remettre la fiche". A part never written (a new one) is written as soon as it has a name or a reference, as before.
  const everSaved = useRef(!!saved);
  if (saved) everSaved.current = true;
  const away = everSaved.current && !saved && !gone.current;
  const live = useRef({ rev, saved: !!saved, away });
  live.current = { rev, saved: !!saved, away };
  // a part is written once it has a name or a reference, or when it was already written; only the keys typed here go on the stored part, whose life stays
  const persist = (y: Spare) => {
    if (live.current.away) return;
    const keys = [...dirty.current].filter(k => !(SPARE_LIFE as readonly string[]).includes(k));
    dirty.current.clear();
    update(d => {
      const rec = d.spares[y.id];
      if (!rec) {
        if (everSaved.current) { keys.forEach(k => dirty.current.add(k as keyof Spare)); return; }   // deleted since the last render: not written back
        everSaved.current = true; d.spares[y.id] = y; return;
      }
      const next = { ...rec } as Record<string, unknown>;
      keys.forEach(k => { if (y[k] === undefined) delete next[k]; else next[k] = y[k]; });
      d.spares[y.id] = takeSpareLife(next as unknown as Spare, rec);
    });
  };
  const flush = () => { const y = latest.current; if (!gone.current && live.current.rev && (live.current.saved || identified(y))) persist(y); };
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hide);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!rev || !(live.current.saved || identified(latest.current))) return;
    const t = window.setTimeout(() => { if (live.current.away) return; persist(latest.current); setRev(0); }, 1000);
    return () => window.clearTimeout(t);
  }, [rev]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const set = (p: Partial<Spare>) => { (Object.keys(p) as (keyof Spare)[]).forEach(k => dirty.current.add(k)); setX(y => ({ ...y, ...p })); setRev(r => r + 1); };
  // taken out of the cabinet, or put back: written at once (a gesture, not typed content), the copy on screen follows without being written again
  const setRetired = (next: boolean) => {
    const to = (sp: Spare) => { const o = { ...sp }; if (next) o.retired = true; else delete o.retired; return o; };
    act(x.id, to); setX(to);
    offer(next ? "Retirée de l'armoire" : "Remise dans l'armoire", () => { const back = (sp: Spare) => { const o = { ...sp }; if (next) delete o.retired; else o.retired = true; return o; }; act(x.id, back); setX(back); });
  };
  const now = new Date(), px = sopCfg(state.params).photoPx;
  const close = () => {
    if (saved && isBlank(cur)) { gone.current = true; update(d => { delete d.spares[x.id]; }); } else flush();
    onClose();
  };
  // "Remettre la fiche": the part was deleted elsewhere; what is typed here is written again, without the life this copy holds (it is older than the deletion): the
  // stock stays as the screen shows it, the movements, the order and the count are not brought back
  const putFile = () => {
    const y = { ...latest.current, moves: [] } as Spare & Record<string, unknown>;
    [...SPARE_LIFE.filter(k => k !== 'stock' && k !== 'moves'), 'gone', 'touched'].forEach(k => { delete y[k]; });
    update(d => { if (!d.spares[y.id]) d.spares[y.id] = y; });
    dirty.current.clear(); latest.current = y; setX(y);
  };
  const setPhoto = (k: 'photo' | 'placePhoto', label: string) => (v: string) => { const was = x[k]; set({ [k]: v || undefined }); if (was && !v) offer(`Photo retirée : ${label}`, () => set({ [k]: was })); };

  const lv = spareLevel(cur), crit = isCritical(cur), name = spareName(cur);
  const eqs = Object.values(state.equipments).filter(e => !e.retiredAt || x.equipmentIds.includes(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const sups = Object.values(state.suppliers || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const supOf = (id?: string) => (id ? state.suppliers?.[id] : undefined);
  // the supplier picked in the list, else the one the written name matches (supplierFacts reads it the same way), else "Autre"
  const byName = x.supplier.trim() ? sups.find(s => norm(s.name) === norm(x.supplier)) : undefined;
  const supSel = supOf(x.supplierId) ? x.supplierId! : byName && !otherSupplier ? byName.id : x.supplier.trim() || otherSupplier ? OTHER : '';
  const facts = supplierFacts(state, cur);
  const moves = [...(cur.moves || [])].reverse(), w = stockWeeks(cur, now), exp = expiresIn(cur, now);
  // the starting stock can be corrected while nothing but a start was written; afterwards the stock moves by its own gestures
  const startable = !cur.order && !cur.countedAt && (cur.moves || []).every(m => m.why === 'start');
  const commitStart = () => {
    const n = Number(startText || 0);
    if (n === num(cur.stock)) return;
    if (saved) act(cur.id, (sp, by) => (n ? moveSpare({ ...sp, stock: 0, moves: [] }, { delta: n, why: 'start', by, note: 'Stock de départ' }) : { ...sp, stock: 0, moves: [] }));
    else set({ stock: n });
  };
  const used = usedLast12m(cur, now);
  const referenced = Object.values(state.equipments).some(e => (e.anomalies || []).some(a => a.spareId === x.id));
  const deletable = !!saved && !cur.moves?.length && !cur.order && !cur.countedAt && !referenced;
  // says what goes with it and, once done, offers "Annuler" for 8 seconds: the part comes back as it was
  const remove = () => {
    const rec = state.spares[x.id];
    if (!rec) return;
    const gives = [[+!!rec.photo + +!!rec.placePhoto, 'photo', 'photos'], [rec.place?.trim() ? 1 : 0, 'emplacement', 'emplacements'], [rec.supplier.trim() || rec.supplierId ? 1 : 0, 'fournisseur', 'fournisseurs'], [rec.equipmentIds.length, 'équipement servi', 'équipements servis']] as const;
    const what = gives.filter(g => g[0]).map(g => `${g[0]} ${g[0] > 1 ? g[2] : g[1]}`).join(', ');
    if (!window.confirm(`Supprimer définitivement la pièce ${name} ? Sont effacés : ${what || 'la fiche vide'} ; aucun mouvement n'est enregistré. « Annuler » la remet pendant 8 secondes.`)) return;
    gone.current = true; update(d => { delete d.spares[rec.id]; });
    (offerBack ?? offer)(`Pièce supprimée : ${name}`, () => update(d => { d.spares[rec.id] = rec; }));
    onClose();
  };
  const toggle = (id: string) => set({ equipmentIds: x.equipmentIds.includes(id) ? x.equipmentIds.filter(i => i !== id) : [...x.equipmentIds, id] });
  // In the middle of a breakdown: where it is, how many are left, where the order stands, then (once, when the part is entered) what it is. A new part, which has no
  // name yet, opens on its name: the field has the focus.
  const fresh = !identified(initial), order = orderOf(cur), late = orderLateDays(cur, now);
  const line = [`Stock ${num(cur.stock)}, mini ${num(cur.min)}`,
    order ? `Commandée le ${frDate(order.at)}, ${late > 0 ? `livraison attendue depuis ${plural(late, 'jour')}` : order.expectedAt ? `livraison attendue le ${frDate(order.expectedAt)}` : "date d'arrivée non renseignée"}` : lv === 'out' || lv === 'low' ? 'Aucune commande en cours' : '',
    txt(cur.place).trim() ? `Rangée : ${txt(cur.place).trim()}` : ''].filter(Boolean).join(' · ');
  const piece = (
    <Sec title={`${fresh ? 1 : 3}. La pièce`}>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom"><input className={inputCls} value={x.name} autoFocus={!initial.name && !initial.ref} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Référence"><input className={`${inputCls} font-mono`} value={x.ref} onChange={e => set({ ref: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Références équivalentes" hint="Référence du constructeur, pièces compatibles."><input className={`${inputCls} font-mono`} value={x.refs2 || ''} onChange={e => set({ refs2: e.target.value || undefined })} /></Field></div>
        </div>
        <PhotoBox value={x.photo || ''} label="Photo de la pièce" px={px} onChange={setPhoto('photo', 'photo de la pièce')} />
      </div>
    </Sec>
  );
  const place = (
    <Sec title={`${fresh ? 2 : 1}. Où la trouver`} hint="La retrouver en 30 secondes en pleine panne : l'emplacement écrit et la photo du rangement.">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Field label="Emplacement"><input className={inputCls} value={x.place || ''} placeholder="Armoire, tiroir, étagère" onChange={e => set({ place: e.target.value || undefined })} /></Field>
        <PhotoBox value={x.placePhoto || ''} label="Photo du rangement" px={px} onChange={setPhoto('placePhoto', 'photo du rangement')} />
      </div>
    </Sec>
  );
  const stock = (
    <Sec title={`${fresh ? 3 : 2}. Stock et commande`}>
      {saved ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-4"><StockBlock sp={cur} state={state} offer={offer} />
            <p className="min-w-0 flex-1 basis-56 text-[11px] text-slate-600">
              {!used ? 'Aucune sortie sur les 12 derniers mois : pas de calcul de durée du stock.' : w === null || !num(cur.stock) ? `${plural(used, 'pièce prise', 'pièces prises')} sur les 12 derniers mois ; le stock est à 0.` : `Stock pour ${weeksText(w)} au rythme des 12 derniers mois (${plural(used, 'pièce prise', 'pièces prises')}).`}
              {w !== null && num(cur.stock) > 0 && typeof cur.leadDays === 'number' && w * 7 < cur.leadDays && <strong className="text-amber-800"> Le stock dure moins que le délai de livraison de {plural(cur.leadDays, 'jour')}.</strong>}
            </p>
          </div>
          <OrderBlock sp={cur} offer={offer} now={now} always />
        </div>
      ) : <p className="text-[11px] text-slate-500">Le stock, les commandes et les comptages s'écrivent dès que la pièce est enregistrée : un nom ou une référence suffit.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Stock mini" hint="En dessous, la pièce est signalée.">
          <NumInput value={x.min} aria-label="Stock mini" onChange={v => set({ min: Math.max(0, Math.round(v ?? 0)) })} />
        </Field>
        {startable
          ? <Field label="Stock de départ" hint="Modifiable tant qu'aucune pièce n'a bougé.">
              <input className={`${inputCls} font-mono`} inputMode="numeric" value={startText} onChange={e => setStartText(e.target.value.replace(/\D/g, ''))} onBlur={commitStart} onKeyDown={e => { if (e.key === 'Enter') commitStart(); }} />
            </Field>
          : <p className="self-end text-[11px] text-slate-500">Le stock change par les sorties, les rangements, les livraisons et les comptages.</p>}
        <Field label="Délai de livraison" hint={typeof x.leadDays === 'number' ? `Soit ${plural(x.leadDays, 'jour')}.` : leadText.trim() ? 'Durée non comprise : écrire par exemple 21 ou 3 semaines.' : 'En jours, ou par exemple « 3 semaines ».'}>
          <input className={inputCls} value={leadText} onChange={e => { setLeadText(e.target.value); set({ leadDays: parseLead(e.target.value) }); }} />
        </Field>
      </div>
    </Sec>
  );
  const radio = (on: boolean) => `rounded-lg border px-3 py-2 text-xs font-semibold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`;

  return (
    <Modal wide onClose={close} title={`Pièce · ${x.name.trim() || x.ref.trim() || 'à nommer'}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{x.ref.trim() && x.name.trim() ? <span className="font-mono">{x.ref}</span> : null}<StatusBadge level={SPARE_LEVEL[lv].tone} text={SPARE_LEVEL[lv].label} />{!crit && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">Consommable</span>}</span>}
      footer={<>
        {deletable && !x.retired ? <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>
          : saved && <Button className="mr-auto" onClick={() => setRetired(!x.retired)}>{x.retired ? "Remettre dans l'armoire" : "Retirer de l'armoire"}</Button>}
        {away ? <span className="text-[11px] font-semibold text-red-700">Non enregistrée</span>
          : storageFull && (identified(x) || saved) ? <span role="alert" className="text-[11px] font-semibold text-red-700">Non enregistrée : le navigateur est plein</span>
          : <span className="text-[11px] text-slate-500">{identified(x) || saved ? (rev ? 'Enregistrement…' : 'Enregistrée automatiquement') : 'Nommez la pièce pour l’enregistrer'}</span>}
        <Button kind="primary" onClick={close}>Fermer</Button>
      </>}>
      <div className="space-y-5">
        <StorageNote />
        {away && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
            <span className="min-w-0 flex-1 font-semibold">Cette pièce a été supprimée ailleurs : ce que vous avez tapé n'est pas enregistré.</span>
            <Button onClick={putFile}>Remettre la fiche</Button><Button onClick={onClose}>Fermer</Button>
          </div>
        )}
        {x.retired && <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-700">Pièce retirée de l'armoire : elle ne figure plus dans les listes ni dans les messages. Son historique est gardé.</p>}
        {saved && <p className="text-xs font-semibold text-slate-900">{line}</p>}
        {fresh ? <>{piece}{place}{stock}</> : <>{place}{stock}{piece}</>}
        <Sec title="4. Les équipements qu'elle sert" hint="Une pièce commune à plusieurs équipements a un seul stock.">
          {eqs.length ? (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {eqs.map(e => (
                <li key={e.id}><label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50">
                  <input type="checkbox" className="h-4 w-4" checked={x.equipmentIds.includes(e.id)} onChange={() => toggle(e.id)} />{e.name || 'Équipement sans nom'}{e.retiredAt ? ' (retiré)' : ''}
                </label></li>
              ))}
            </ul>
          ) : <p className="text-[11px] text-slate-500">Aucun équipement n'est enregistré.</p>}
        </Sec>
        <Sec title="5. Le fournisseur">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Fournisseur" hint="La liste est celle des fournisseurs suivis dans l'outil 3.1.">
              <select className={inputCls} value={supSel} onChange={e => {
                const v = e.target.value;
                if (v === OTHER) { setOtherSupplier(true); set({ supplierId: undefined, supplier: x.supplierId ? '' : x.supplier }); }
                else { setOtherSupplier(false); set({ supplierId: v || undefined, supplier: supOf(v)?.name || '' }); }
              }}>
                <option value="">Aucun fournisseur choisi</option>
                {sups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value={OTHER}>Autre, précisez</option>
              </select>
            </Field>
            {supSel === OTHER && <Field label="Autre fournisseur, précisez"><input className={inputCls} value={x.supplier} onChange={e => set({ supplier: e.target.value })} /></Field>}
          </div>
          {facts.length > 0 && <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-amber-900">{facts.map(f => <li key={f}>{f[0].toUpperCase() + f.slice(1)}.</li>)}</ul>}
          {supOf(x.supplierId) && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px]" onClick={() => nav.open('3.1', x.supplierId)}>Ouvrir la fiche du fournisseur (3.1)<NewTab /></button>}
        </Sec>
        <Sec title="6. Critique ou consommable">
          <div role="group" aria-label="Nature de la pièce" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={crit} className={radio(crit)} onClick={() => set({ critical: true })}>Pièce critique</button>
            <button type="button" aria-pressed={!crit} className={radio(!crit)} onClick={() => set({ critical: false })}>Consommable</button>
          </div>
          {crit && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-700">Pourquoi elle est critique</span>
              <div className="flex flex-wrap gap-1.5">
                {CRITICAL_WHY.map(c => { const on = (x.why || []).includes(c.key); return (
                  <button key={c.key} type="button" aria-pressed={on} onClick={() => set({ why: on ? (x.why || []).filter(k => k !== c.key) : [...(x.why || []), c.key] })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px] ${on ? 'border-amber-600 bg-amber-100 text-amber-950' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{c.label}</button>
                ); })}
              </div>
            </div>
          )}
          <div className="max-w-xs"><Field label="Date limite" hint={exp !== null ? (exp < 0 ? `Dépassée depuis ${plural(-exp, 'jour')}.` : exp === 0 ? "Date limite aujourd'hui." : `Dans ${plural(exp, 'jour')}.`) : 'Joints, batteries, graisses : facultatif.'}>
            <input type="date" className={inputCls} value={txt(x.expiresAt)} onChange={e => set({ expiresAt: e.target.value || undefined })} />
          </Field></div>
        </Sec>
        <Sec title="7. Historique des mouvements" hint="Qui, quand, pourquoi : chaque sortie, chaque rangement, chaque livraison et chaque comptage.">
          {moves.length ? (
            <>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {(allMoves ? moves : moves.slice(0, 10)).map(m => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 text-[11px] text-slate-700">
                    <span className="font-mono text-slate-500">{frStamp(m.at)}</span>
                    <strong className="text-slate-900">{WHY_LABEL[m.why]}</strong>
                    <span className={`font-mono font-bold ${m.delta > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{m.delta > 0 ? '+' : m.delta < 0 ? '−' : ''}{Math.abs(m.delta)}</span>
                    <span>{m.by || 'auteur inconnu'}</span>
                    {m.equipmentId && <span>pour {state.equipments[m.equipmentId]?.name || 'un équipement supprimé'}</span>}
                    {m.note && <span className="text-slate-500">{m.note}</span>}
                  </li>
                ))}
              </ul>
              {moves.length > 10 && <button type="button" aria-expanded={allMoves} className="text-[11px] font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px]" onClick={() => setAllMoves(v => !v)}>{allMoves ? 'Afficher moins' : `Voir les ${moves.length - 10} autres`}</button>}
            </>
          ) : <p className="text-[11px] text-slate-500">Aucun mouvement pour l'instant.</p>}
          {txt(cur.countedAt) && <p className="text-[11px] text-slate-500">Dernier comptage le {frDate(txt(cur.countedAt).slice(0, 10))}{cur.countedBy ? ` · par ${cur.countedBy}` : ''}</p>}
        </Sec>
      </div>
      {bar}
    </Modal>
  );
}
