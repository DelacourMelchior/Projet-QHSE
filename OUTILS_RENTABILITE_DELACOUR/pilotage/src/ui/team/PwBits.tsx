// Small pieces shared by the screens of tool 4.1: the field that picks a person (staff list, directory, or a name typed), what is known of a person (phone, leave, departure),
// the words of the practice of a deputy, the badge of the state of a power. The list of suggestions is drawn under the field, never over it (a window scrolls, an overlay is clipped).
import { useEffect, useId, useRef, useState } from 'react';
import { Mail, Phone, X } from 'lucide-react';
import { norm } from '../../domain/instructions';
import { candidates, POWER_STATE, SOON_DAYS, sameName, signStatus, whoIs, type DepView, type PowerState, type Who } from '../../domain/powers';
import type { Power } from '../../domain/types';
import type { Nav } from '../tools';
import { createContact, telOf } from '../../domain/contacts';
import { frDate, isoDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, inputCls, StatusBadge } from '../common';
import { TOUCH16 } from '../operations/RcBits';
export { useUndo } from '../operations/EqBits';
export { TOUCH16 };

export const FIELD = `${inputCls} ${TOUCH16}`;
export const TOUCH = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
export const LINK = `text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`;

export const StateBadge = ({ st }: { st: PowerState }) => <StatusBadge level={POWER_STATE[st].tone} text={POWER_STATE[st].label} />;

// A phone number that calls when it is touched: 44 px on a touch screen
export function PhoneLink({ phone, who }: { phone: string; who: string }) {
  return (
    <a href={`tel:${telOf(phone)}`} aria-label={`Appeler ${who} : ${phone}`} className={`inline-flex items-center gap-1 whitespace-nowrap rounded font-mono text-xs font-semibold text-delacour-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${TOUCH}`}>
      <Phone size={13} aria-hidden />{phone}
    </a>
  );
}

// An e-mail address that opens the mail program: 44 px on a touch screen
export function MailLink({ email, who }: { email: string; who: string }) {
  return (
    <a href={`mailto:${email}`} aria-label={`Écrire à ${who} : ${email}`} className={`inline-flex min-w-0 max-w-full items-center gap-1 rounded text-xs font-semibold text-delacour-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${TOUCH}`}>
      <Mail size={13} aria-hidden className="shrink-0" /><span className="truncate">{email}</span>
    </a>
  );
}

// What is known of a person, in facts: the phone, a number missing, a leave, a departure, a name that is on no list
export function Facts({ who, phone = true }: { who: Who; phone?: boolean }) {
  if (!who.name) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
      {phone && (who.phone ? <PhoneLink phone={who.phone} who={who.name} /> : who.contact ? <span className="text-slate-600">numéro manquant</span> : null)}
      {phone && (who.email ? <MailLink email={who.email} who={who.name} /> : who.contact ? <span className="text-slate-600">e-mail manquant</span> : null)}
      {who.gone && <span className="font-semibold text-red-700">a quitté le personnel</span>}
      {who.absent && <span className="font-semibold text-amber-800">absent jusqu'au {frDate(who.absent.to)}</span>}
      {!who.absent && who.next && <span className="text-slate-600">absent du {frDate(who.next.from)} au {frDate(who.next.to)}</span>}
      {who.outside && <span className="text-slate-600">pas dans la liste du personnel ni dans l'annuaire</span>}
    </span>
  );
}

// "pratiqué le 12/03/2026 · reste 25 jours": late in red, soon in amber, fine in grey; a practice that nobody saw is said
export function Practice({ d }: { d: DepView }) {
  if (!d.practiced) return <span className="font-semibold text-amber-800">{d.declared ? `pratique du ${frDate(d.declared)} à valider` : 'jamais pratiqué'}</span>;
  const left = d.left ?? 0;
  return <span className={left < 0 ? 'font-semibold text-red-700' : left <= SOON_DAYS ? 'font-semibold text-amber-800' : 'text-slate-600'}>pratiqué le {frDate(d.practiced)}{left < 0 ? ` · en retard de ${plural(-left, 'jour')}` : left <= SOON_DAYS ? ` · reste ${plural(left, 'jour')}` : ''}</span>;
}

// A person: picked in the staff list and the directory (typed, with `strict` off). The change is made when a suggestion is touched, on Enter, or when the field is left (never at each key);
// `check` says why a name cannot take the place (the fact, shown under the field), and nothing is written then. With `strict` only a person of the lists can be written, with her link.
export function PersonField({ label, value, onCommit, check, strict, nav, placeholder = 'Nom de la personne' }: { label: string; value: string; onCommit(name: string, ref?: string): void; check?(name: string): string; strict?: boolean; nav?: Nav; placeholder?: string }) {
  const { state, update } = useStore();
  const [text, setText] = useState(value), [open, setOpen] = useState(false), [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null), uid = useId();
  useEffect(() => { setText(value); setError(''); }, [value]);
  const commit = (t: string): boolean => {
    const n = t.trim();
    if (n === value.trim()) { setError(''); return true; }
    const hit = strict && n ? candidates(state!, '').find(c => norm(c.name) === norm(n)) : undefined;
    const why = (strict && n && !hit ? "Choisir une personne de la liste du personnel ou de l'annuaire." : '') || check?.(hit?.name ?? n) || '';
    setError(why);
    if (!why) onCommit(hit?.name ?? n, hit?.ref);
    return !why;
  };
  const done = () => { setOpen(false); commit(text); };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) done(); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  });
  if (!state) return null;
  const list = candidates(state, text.trim() === value.trim() ? '' : text);   // everybody who matches: the list scrolls, nobody is cut
  // a name that is nowhere: added to the directory from here, in the staff list or as an outside contact, and picked at once
  const create = (internal: boolean) => { const n = text.trim(); let made = { name: n, ref: '' }; update(d => { made = createContact(d, n, internal); }); setText(made.name); setOpen(false); setError(''); onCommit(made.name, made.ref); };
  const unknown = !!strict && !!text.trim() && text.trim() !== value.trim() && !candidates(state, '').some(c => norm(c.name) === norm(text));
  const pick = (n: string) => { setText(n); setOpen(false); commit(n); };
  return (
    <div ref={box} className="space-y-1" onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); setText(value); setError(''); } }}>
      <label htmlFor={uid} className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input id={uid} className={`${FIELD} pr-10`} value={text} placeholder={placeholder} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? `${uid}-e` : undefined}
          onFocus={() => setOpen(true)} onChange={e => { setText(e.target.value); setOpen(true); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); done(); } }} />
        {text && (
          <button type="button" aria-label={`Vider : ${label}`} onClick={() => { setText(''); setOpen(false); setError(''); onCommit(''); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 max-sm:p-3 [@media(pointer:coarse)]:p-3"><X size={14} aria-hidden /></button>
        )}
      </div>
      {open && list.length > 0 && (
        <ul aria-label={`Suggestions : ${label}`} className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-300 bg-white">
          {list.map((c, i) => {
            const why = check?.(c.name) || '', head = i === 0 || list[i - 1].staff !== c.staff;
            return (
              <li key={c.name}>
                {head && <p className="bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{c.staff ? 'Personnel' : "Annuaire : contacts extérieurs"}</p>}
                <button type="button" disabled={!!why} onClick={() => pick(c.name)} aria-label={`${c.name}${why ? ` : ${why}` : ''}`}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-delacour-golddark disabled:bg-slate-50 disabled:text-slate-500 ${TOUCH}`}>
                  <span className="min-w-0"><strong className="block truncate font-semibold text-slate-900">{c.name}</strong><span className="block truncate text-slate-600">{why || c.sub}</span></span>
                  {c.staff && !why && <span className="shrink-0 text-slate-500">personnel</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {unknown && (open || error) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-600">« {text.trim()} » n'est pas dans l'annuaire.</span>
          <Button className="!py-1" onClick={() => create(true)}>Ajouter au personnel</Button>
          <Button className="!py-1" onClick={() => create(false)}>Ajouter comme contact extérieur</Button>
        </div>
      )}
      {error && <p id={`${uid}-e`} role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      {!open && !error && value.trim() && <PersonCard who={whoIs(state, value, isoDate(new Date()))} nav={nav} />}
    </div>
  );
}

// Where the signatures of a person stand, in one line (the register and the page of absence)
export function SignState({ p, who }: { p: Power; who: string }) {
  const { state } = useStore();
  if (!state) return null;
  const miss = signStatus(state, p).needs.filter(x => sameName(x.subject, who) && !x.sign).length;
  return miss ? <span className="font-semibold text-amber-800">{plural(miss, 'signature manquante', 'signatures manquantes')}</span> : <span className="text-slate-600">signatures complètes</span>;
}

// The card of the directory under a person: her function, her phone, her e-mail, and the way to her card (the proof that the link exists)
export function PersonCard({ who, nav }: { who: Who; nav?: Nav }) {
  const c = who.contact, role = c?.role || who.person?.role || '';
  return (
    <div className="space-y-0.5 text-xs">
      {role && <span className="block text-slate-600">{role}{c?.company && c.company !== 'Interne' ? ` · ${c.company}` : ''}</span>}
      <Facts who={who} />
      {c && nav && <button type="button" className={`font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => nav.open('1.3', c.id)}>Ouvrir la fiche dans l'annuaire (1.3)</button>}
    </div>
  );
}
