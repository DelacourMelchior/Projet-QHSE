// Small pieces shared by the screens of tool 3.4: the addresses of the QR codes (a milestone, a reception), the move that writes to the store at once,
// the big buttons that pick a person (and who may be picked), the badge of the state of an order, a moment written for people.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Delivery, State } from '../../domain/types';
import { nb, type Insight } from '../../domain/base';
import { de, DELIVERY_STATE, openReserves, plural, rcDay as dayOf, rcMoment, reserveWords, type DeliveryState } from '../../domain/receptions';
import { isAbsent } from '../../domain/commercial';
import { activePeople } from '../../domain/team';
import { useStore } from '../../store/StoreContext';
import { StatusBadge, Tile } from '../common';
import { toolUrl } from '../tools';
export { de, plural, reserveWords };   // the words of agreement of 3.4 (domain/receptions.ts): "2 jours", "d'Antoine", "« Poignée »" or "sans texte (photo seule)"

// Addresses that open the checks of an order (jalon:) or its reception (reception:) full screen: the QR codes of the printed sheet
export const rcJalonUrl = (id: string) => toolUrl('3.4', `jalon:${id}`);
export const rcReceptionUrl = (id: string) => toolUrl('3.4', `reception:${id}`);
export { isLocalAddress, useUndo } from './rcShared';

// A move of the life of one order (a check, a release, a reserve, a signature), written to the store at once, author in hand. `s` is the state of the store at that
// moment (number of the PV, release, defect): never the one of the last drawing. Several moves given together (`act(id, [f, g])`) are applied one after the other in ONE write of the company.
// `act.soon` is for what a gesture leaves behind (the fields of a step that closes, flushed one after the other, the first moment of the delivery): everything asked within the same tick is
// applied in ONE write too, a moment later (nothing waits for its result). `act` itself never changes from one drawing to the next, and reads the author at the moment of the gesture.
export type RcMove = (d: Delivery, by: string, s: State) => Delivery;
export function useRcAct() {
  const { update, author } = useStore();
  const by = useRef(author || 'anonyme'), queue = useRef<{ id: string; f: RcMove }[]>([]);
  by.current = author || 'anonyme';
  return useMemo(() => {
    const act = (id: string, f: RcMove | RcMove[]) => update(s => { for (const g of Array.isArray(f) ? f : [f]) if (Object.hasOwn(s.deliveries, id)) s.deliveries[id] = g(s.deliveries[id], by.current, s); });
    const soon = (id: string, f: RcMove) => {
      if (!queue.current.length) queueMicrotask(() => { const q = queue.current; queue.current = []; update(s => { q.forEach(x => { if (Object.hasOwn(s.deliveries, x.id)) s.deliveries[x.id] = x.f(s.deliveries[x.id], by.current, s); }); }); });
      queue.current.push({ id, f });
    };
    return Object.assign(act, { soon });
  }, [update]);
}

// The people one can pick for an order that day: those of the order when it names some, else the active people of 4.2; the ones on leave are told apart
export function peopleOf(s: State, d: Delivery, day: string): { names: string[]; absent: string[] } {
  const pool = d.team?.length ? d.team : activePeople(s).map(p => p.name), names: string[] = [], absent: string[] = [];
  [...new Set(pool.map(n => n.trim()).filter(Boolean))].forEach(n => (isAbsent(s, n, day) ? absent : names).push(n));
  return { names, absent };
}

// The person picked stays for the session of the browser (never the name of the device: a shared post has no owner)
const KEY = 'rc-who';
export const remembered = () => { try { return window.sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
const remember = (v: string) => { try { if (v.trim()) window.sessionStorage.setItem(KEY, v); } catch { /* storage not available: nothing is kept */ } };

// A group of radios: one tab stop (the one ticked, else the first), the arrows move to the next one round the group and tick it, as a native group of radios does
export const radioKeys = (e: React.KeyboardEvent<HTMLElement>) => {
  const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number | undefined>)[e.key];
  const rs = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=radio]')], i = rs.indexOf(e.target as HTMLElement);
  if (!step || i < 0) return;
  e.preventDefault();
  const n = rs[(i + step + rs.length) % rs.length];
  n.focus(); n.click();
};

// Who: one big button per person (44 px, 64 px with `big`), the absent ones named in text, then "Autre, précisez" which opens a field. Nobody is picked for the user:
// the person of the session is only offered, in the first button, "Même personne : X (dernier choix)", to be touched. The buttons are one group of radios: one tab stop, the arrows.
export function PeoplePick({ value, onChange, names, absent = [], label, big = false }: { value: string; onChange(v: string): void; names: string[]; absent?: string[]; label: string; big?: boolean }) {
  const [other, setOther] = useState(() => (!!value.trim() && !names.includes(value)) || names.length === 0);
  const id = useId(), last = remembered();
  const size = big ? 'min-h-[64px] text-lg' : 'min-h-[44px] text-sm', stop = other ? names.length : Math.max(0, names.indexOf(value));
  const btn = (on: boolean) => `flex ${size} min-w-[7rem] flex-1 items-center justify-center rounded-xl border-2 px-3 font-bold ${on ? 'border-delacour-dark bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`;
  const pick = (v: string) => { remember(v); onChange(v); };
  return (
    <div className="space-y-2">
      <div id={id} className={`${big ? 'text-base' : 'text-xs'} font-semibold text-slate-700`}>{label}</div>
      {!other && last && value !== last && names.includes(last) && (
        <button type="button" className={`${size} w-full rounded-xl border-2 border-dashed border-delacour-primary bg-white px-3 font-bold text-delacour-primary hover:bg-slate-50`} onClick={() => pick(last)}>Même personne&#8239;: {last} (dernier choix)</button>
      )}
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2" onKeyDown={radioKeys}>
        {names.map((n, i) => <button key={n} type="button" role="radio" aria-checked={!other && value === n} tabIndex={i === stop ? 0 : -1} className={btn(!other && value === n)} onClick={() => { setOther(false); pick(n); }}>{n}</button>)}
        <button type="button" role="radio" aria-checked={other} tabIndex={names.length === stop ? 0 : -1} className={btn(other)} onClick={() => { setOther(true); if (names.includes(value)) onChange(''); }}>Autre, précisez</button>
      </div>
      {absent.length > 0 && <p className="text-xs text-slate-600">Absent ce jour&#8239;: {absent.join(', ')}</p>}
      {other && <input className={`w-full rounded-xl border-2 border-slate-300 bg-white px-3 ${big ? 'py-3 text-lg' : 'min-h-[44px] py-2 text-base'} outline-none focus:border-delacour-golddark`} value={value} list="people" placeholder="Nom de la personne" aria-label={`${label}\u202f: autre personne`} onChange={e => { onChange(e.target.value); remember(e.target.value); }} />}
    </div>
  );
}

// What a form of a tab holds that is not applied yet (a reservation being typed, a refusal motive, a drawn signature): the tab tells the sheet (`hold`, an empty text lets go),
// and the sheet asks before it closes. `cut` shortens a typed text to name it.
export type Hold = (key: string, what: string) => void;
export function useHold(hold: Hold | undefined, key: string, what: string) {
  useEffect(() => { hold?.(key, what); return () => hold?.(key, ''); }, [hold, key, what]);
}
export const cut = (t: string, n = 40) => { const s = t.trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
// An id that came from data or an address is never a key of the prototype
export const own = <T,>(o: Record<string, T> | undefined, k?: string): T | undefined => (k && o && Object.hasOwn(o, k) ? o[k] : undefined);
// Archiving an order never stops the follow-up of its reservations that are still open: the dialogs of archiving say it
export function followedText(d: Delivery): string {
  const n = openReserves(d).length;
  return n ? `${plural(n, 'réserve non levée', 'réserves non levées')} ${n > 1 ? 'restent suivies' : 'reste suivie'} après l'archivage (file «\u202fÀ faire\u202f», tuile «\u202fRéserves à lever\u202f»).` : '';
}

// State of an order: colour and words
export const StateBadge = ({ st }: { st: DeliveryState }) => <StatusBadge level={DELIVERY_STATE[st].tone} text={DELIVERY_STATE[st].label} />;
// A signed PV whose content no longer matches its seal: red, in words, next to the state of the order (the fact the sheet, the queue and the badge of the tool say too)
export const SealBadge = () => <StatusBadge level="alert" text="Scellé modifié" />;

// 16 px on a touch screen (under it a phone zooms in when a field is touched); the fields of the register and of the settings add it to the shared look
export const TOUCH16 = '[@media(pointer:coarse)]:!text-base';

// "2026-10-04" -> "4 oct." (the domain's rcDay, the day and the month never on two lines)
export const rcDay = (iso: string | undefined, now?: Date): string => dayOf(iso, now).replace(/^(\d+) /, '$1\u00a0');
// "2026-10-04T14:05" -> "4 oct. à 14 h 05", the day alone ("4 oct.", with the year when it is not this one) when there is no hour: the words of the domain (rcDay, rcMoment), the same
// everywhere on the screens of 3.4 (the documents keep "04/10/2026 à 14 h 05")
export const fmtMoment = (at: string): string => { const t = String(at || ''); return !t ? '' : t.length > 10 ? rcMoment(t) : rcDay(t); };
// The days the domain writes "04/10/2026" in the text of a task or of a message, read as everywhere else on the screen ("4 oct."); the spaces before : ; ? ! % » are not broken
export const dayWords = (t: string) => nb(t.replace(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g, (_, d, m, y) => rcDay(`${y}-${m}-${d}`)));
// The first letter in capital: a mention that the domain writes in lower case ("client absent") at the head of a line
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// A sentence ends with one full stop: a name that ends with an initial ("Karim T.") is not given a second one
export const sentence = (t: string) => (/[.!?…]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
// "2 jalons sur 4 conformes", "1 jalon sur 1 conforme": the word agrees with the number it follows
export const jalonsOk = (done: number, total: number) => `${plural(done, 'jalon')} sur ${total} ${total > 1 ? 'conformes' : 'conforme'}`;
// "levée sous 1 jour ouvré", "sous 7 jours": the delay of a lift in the words of the PV
export const liftDelay = (n: number, business: boolean) => (business ? plural(n, 'jour ouvré', 'jours ouvrés') : plural(n, 'jour'));

// A key figure of the summary: the same tile as every other tool (title, figure, facts under it), a button when it filters the list; only the French non-breaking spaces of the figure are added
export function RcTile({ title, value, sub, tone, onClick, active }: { title: string; short?: string; value: string; sub: string; tone?: 'ok' | 'warn' | 'alert'; onClick?(): void; active?: boolean }) {
  return <Tile title={title} value={nb(value)} sub={nb(sub)} tone={tone} onClick={onClick} active={active} />;
}

// The messages of the summary (facts): from 640 px the first three are told and the others folded, on a phone all of them are folded behind "N constats"
export function RcFindings({ items }: { items: Insight[] }) {
  const [open, setOpen] = useState(false), link = 'text-xs font-semibold text-delacour-primary hover:underline max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
  if (!items.length) return null;
  return (
    <div className="col-span-full w-full border-t border-slate-100">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`${link} sm:hidden`}>{open ? 'Masquer les constats' : plural(items.length, 'constat')}</button>
      <ul className="divide-y divide-slate-100">
        {items.map((i, k) => (
          <li key={i.key} className={`flex items-start gap-2.5 py-2 text-xs text-slate-700 ${open ? '' : k < 3 ? 'max-sm:hidden' : 'hidden'}`}>
            <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.tone === 'bad' ? 'bg-red-600' : i.tone === 'warn' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
            <span><span className="sr-only">{i.tone === 'bad' ? 'Important : ' : i.tone === 'warn' ? 'À noter : ' : 'Bon point : '}</span><strong className="font-semibold text-slate-900">{i.title}</strong> · {dayWords(i.text)}</span>
          </li>
        ))}
      </ul>
      {items.length > 3 && <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={`${link} max-sm:hidden`}>{open ? 'Afficher moins de constats' : items.length - 3 === 1 ? 'Voir 1 autre constat' : `Voir les ${items.length - 3} autres constats`}</button>}
    </div>
  );
}
