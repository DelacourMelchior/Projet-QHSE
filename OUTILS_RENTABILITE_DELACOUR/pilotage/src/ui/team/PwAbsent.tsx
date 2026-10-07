// "Qui remplace qui ?": someone is away, who takes each of the powers she holds? A page of the tool, not a window: the person, the period and the verdict at the top (with the button that
// writes the absence), then one answer per power in the order of the call, the phone of the first deputy who is there as the main button, where the accesses are, how to do it, what is not
// covered said first and a next step for it. "Enregistrer l'absence" writes the leave in the staff list (4.2 and the directory show it) and notes the episode with who takes each power;
// without that tap it is only a simulation.
import { useEffect, useState } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import type { Nav } from '../tools';
import type { Person } from '../../domain/types';
import { addDays, nb, processLabel } from '../../domain/base';
import { activeVaults, coverFor, declareAbsence, formsOf, headOf, powerCfg, sameName, waitRank, waitText, wantedOf, whoIs, type CoverStatus, type PowerCover } from '../../domain/powers';
import { frDate, isoDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { telOf } from '../../domain/contacts';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Field, NewTab, StatusBadge } from '../common';
import { sentence } from '../operations/RcBits';
import { FIELD, Facts, LINK, PhoneLink, SignState, TOUCH, useUndo } from './PwBits';
import type { PwTab } from './PwSheet';

type Span = 'today' | 'week' | 'two' | 'other';
const SPANS: [Span, string][] = [['today', "Aujourd'hui"], ['week', '1 semaine'], ['two', '2 semaines'], ['other', 'Autre date']];
const STATUS: Record<CoverStatus, { level: 'ok' | 'warn' | 'alert' | 'pending'; text: string }> = {
  covered: { level: 'ok', text: 'Couvert' }, weak: { level: 'warn', text: 'Suppléant disponible' }, uncovered: { level: 'alert', text: 'Aucun suppléant disponible' }, none: { level: 'pending', text: 'Aucun suppléant prévu' },
};
const RANK: Record<CoverStatus, number> = { uncovered: 0, weak: 1, covered: 2, none: 3 };

export function PwAbsent({ initial, nav, onOpenPower, onCover, onClose }: { initial: { name: string; from: string; to: string }; nav: Nav; onOpenPower(id: string, tab?: PwTab): void; onCover(id: string): void; onClose(): void }) {
  const { state, update, author, teamView } = useStore();
  const today = isoDate(new Date()), [name, setName] = useState(initial.name);
  const start = initial.from || today, to0 = initial.to;
  const [span, setSpan] = useState<Span>(!to0 ? 'week' : to0 === start && start === today ? 'today' : to0 === addDays(today, 6) ? 'week' : to0 === addDays(today, 13) ? 'two' : 'other'), [until, setUntil] = useState(to0 || addDays(today, 6));
  const { bar, offer } = useUndo();
  const from = start < today ? today : start, to = span === 'today' ? today : span === 'week' ? addDays(from, 6) : span === 'two' ? addDays(from, 13) : until < from ? from : until;
  useEffect(() => {
    try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${window.location.hash.split('~')[0]}~${encodeURIComponent(`absent:${encodeURIComponent(name)}:${from}:${to}`)}`); } catch { /* the address stays as it is */ }
  }, [name, from, to]);
  if (!state) return null;
  const now = new Date(), people = Object.values(state.people).filter(p => p.active && p.name.trim());
  const absentNow = people.filter(p => (p.absences || []).some(a => a.from <= today && today <= a.to)), holders = new Set(Object.values(state.powers).filter(p => !p.archivedAt).map(p => p.holder.trim()).filter(Boolean));
  const group = (xs: Person[]) => [...new Set(xs.map(p => p.name.trim()))].sort((a, b) => a.localeCompare(b, 'fr'));
  const first = group(absentNow), second = group(people.filter(p => holders.has(p.name.trim()) && !absentNow.includes(p))), third = group(people.filter(p => !holders.has(p.name.trim()) && !absentNow.includes(p)));
  const c = name ? coverFor(state, name, from, to, now) : { holds: [], deputyOf: [], long: false };
  const holds = [...c.holds].sort((a, b) => RANK[a.status] - RANK[b.status] || waitRank(a.power) - waitRank(b.power) || a.power.power.localeCompare(b.power.power, 'fr'));
  const count = (s: CoverStatus) => holds.filter(h => h.status === s).length;
  const existing = Object.values(state.covers).find(x => sameName(x.who, name) && !x.closedAt && x.from <= to && (x.to || '9999') >= from);   // an absence already noted that overlaps the days shown
  const save = () => {
    const who = Object.values(state.people).find(x => x.active && sameName(x.name, name)), before = who?.absences;
    let id = '';
    update(d => { id = declareAbsence(d, name, from, to, author || 'anonyme').id; });
    offer(`Absence enregistrée : ${name}`, () => update(d => { delete d.covers[id]; if (who && d.people[who.id]) { if (before) d.people[who.id].absences = before; else delete d.people[who.id].absences; } }));
  };
  const full = powerCfg(state.params).vaultFull, vaults = activeVaults(state), head = headOf(state), boss = head && !sameName(head.name, name) ? head : undefined;   // the head of the company is not called for his own absence

  return (
    <div className="space-y-3">
      <button type="button" onClick={onClose} className={`inline-flex items-center gap-1.5 text-xs font-semibold text-delacour-primary hover:underline max-sm:hidden ${TOUCH}`}><ArrowLeft size={14} aria-hidden />Retour aux fonctions</button>
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div><h2 className="text-sm font-bold text-delacour-primary">{nb('Qui remplace qui ?')}</h2><p className="text-xs text-slate-600 max-sm:hidden">Choisir la personne absente et la durée : chaque fonction qu'elle détient dit qui le prend, et comment l'appeler.</p></div>
          <button type="button" onClick={onClose} className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-delacour-primary hover:underline sm:hidden ${TOUCH}`}><ArrowLeft size={14} aria-hidden />Retour</button>
        </div>
        <div className="grid grid-cols-2 items-start gap-x-2 gap-y-3 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-x-3">
          <Field label="La personne absente">
            <select className={FIELD} value={name} onChange={e => setName(e.target.value)}>
              <option value="">Choisir une personne…</option>
              {name && ![...first, ...second, ...third].some(n => sameName(n, name)) && <option value={name}>{name}</option>}
              {first.length > 0 && <optgroup label="Absents aujourd'hui">{first.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>}
              {second.length > 0 && <optgroup label="Titulaires d'une fonction">{second.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>}
              {third.length > 0 && <optgroup label="Autres personnes du personnel">{third.map(n => <option key={n} value={n}>{n}</option>)}</optgroup>}
            </select>
          </Field>
          <div className="space-y-1.5">
            <label id="pw-span" htmlFor="pw-span-select" className="block text-xs font-semibold text-slate-700">Jusqu'à quand</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="max-sm:hidden"><Chips value={span} onChange={setSpan} items={SPANS} /></div>
              <select id="pw-span-select" className={`${FIELD} min-w-0 flex-1 sm:hidden`} value={span} onChange={e => setSpan(e.target.value as Span)}>{SPANS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {span === 'other' && <input type="date" aria-labelledby="pw-span" className={`${FIELD} !w-auto max-sm:!w-full`} min={from} value={until} onChange={e => setUntil(e.target.value)} />}
            </div>
          </div>
        </div>
        {name && (
          <div className="space-y-2 border-t border-slate-100 pt-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-800">
                {holds.length === 0 ? <span>{name} ne détient aucune fonction clé.</span> : (
                  <>
                    {count('covered') > 0 && <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-emerald-600" />{plural(count('covered'), 'fonction couverte', 'fonctions couvertes')}</span>}
                    {count('weak') > 0 && <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />{plural(count('weak'), 'fonction', 'fonctions')} avec un suppléant à remettre à niveau</span>}
                    {count('none') > 0 && <span className="inline-flex items-center gap-1.5 font-normal text-slate-600"><span aria-hidden className="h-2 w-2 rounded-full bg-slate-300" />{plural(count('none'), 'fonction', 'fonctions')} sans suppléant prévu</span>}
                    {count('uncovered') > 0 && <span className="inline-flex items-center gap-1.5 text-red-700"><span aria-hidden className="h-2 w-2 rounded-full bg-red-600" />{plural(count('uncovered'), 'fonction', 'fonctions')} sans suppléant disponible</span>}
                  </>
                )}
              </p>
            </div>
            <p className="text-xs text-slate-600">{from === to ? `Le ${frDate(from)}.` : `Du ${frDate(from)} au ${frDate(to)}.`} {c.long ? 'Plus de 24 h : accès de secours possibles.' : 'Une journée : accès propres aux suppléants.'}</p>
          </div>
        )}
      </Card>

      {holds.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {holds.map(h => <PowerAnswer key={h.power.id} h={h} onOpen={tab => onOpenPower(h.power.id, tab)} nav={nav} from={from} to={to} boss={boss} />)}
        </ul>
      )}

      {name && c.long && (
        <Card className="space-y-1.5 p-3 text-xs sm:p-4">
          <h3 className="text-xs font-bold text-slate-900">Les accès de secours</h3>
          {teamView ? <p className="text-slate-700">Les accès de secours sont confiés à la direction.</p> : vaults.length === 0
            ? <p className="text-slate-700">{full ? "Aucune enveloppe n'est décrite dans l'outil. Elle s'ouvre sous double visa de la direction et d'un suppléant." : "Aucun accès de secours n'est décrit dans l'outil : à demander à la direction."}</p>
            : <ul className="divide-y divide-slate-100">{vaults.map(v => (
              <li key={v.id} className="space-y-0.5 py-1.5"><strong className="text-slate-900">{v.name || (full ? 'Enveloppe' : 'Accès')}</strong> · {v.location || 'lieu à préciser'}
                <span className="block text-slate-700">{full ? 'Double visa : ' : 'Peut y accéder : '}{v.visa.filter(x => x.trim()).length ? v.visa.filter(x => x.trim()).map((x, i) => <span key={x}>{i ? ' et ' : ''}<Named name={x} /></span>) : 'à nommer'}</span></li>
            ))}</ul>}
        </Card>
      )}

      {c.deputyOf.length > 0 && (
        <Card className="space-y-1.5 p-3 sm:p-4">
          <h3 className="text-xs font-bold text-slate-900">{name} est aussi suppléant</h3>
          <ul className="divide-y divide-slate-100">
            {c.deputyOf.map(d => {
              const free = d.others.filter(o => !o.clash && !o.who.gone);
              return (
                <li key={d.power.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-xs">
                  <span className="min-w-0"><strong className="text-slate-900">{d.power.power.trim() || 'Fonction à décrire'}</strong> · titulaire : {d.power.holder.trim() || 'à désigner'}
                    <span className={`block ${free.length || wantedOf(d.power) < 2 ? 'text-slate-700' : 'font-semibold text-red-700'}`}>{free.length ? sentence(`Il reste : ${free.map(o => o.name).join(', ')}`) : wantedOf(d.power) < 2 ? 'Seul suppléant prévu pour cette fonction.' : "Personne d'autre n'est disponible pour cette fonction."}</span></span>
                  <button type="button" className={LINK} onClick={() => onOpenPower(d.power.id)}>Ouvrir</button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {name && (
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
          <span className="text-xs text-slate-600">{existing ? "Visible en polyvalence (4.2) et dans l'annuaire (1.3)." : "Rien n'est écrit sans le bouton : c'est une simulation."}</span>
          {existing
            ? <span className="flex flex-wrap items-center gap-2"><span role="status" className="text-xs font-semibold text-emerald-800">Absence enregistrée.</span><Button onClick={() => onCover(existing.id)}>Clore l'absence</Button></span>
            : <Button kind="primary" className="max-sm:w-full" onClick={save}>Enregistrer l'absence</Button>}
        </div>
      )}
      {bar}
    </div>
  );
}

// A person with her phone when the lists know it
function Named({ name }: { name: string }) {
  const { state } = useStore();
  const w = state ? whoIs(state, name, isoDate(new Date())) : null;
  return <>{name}{w?.phone ? <> (<a className="font-mono font-semibold text-delacour-primary hover:underline" href={`tel:${telOf(w.phone)}`}>{w.phone}</a>)</> : null}</>;
}

// One power of the absent person: who takes it, in the order of the call (the ones who are there first), and what the person who takes it needs
function PowerAnswer({ h, onOpen, nav, from, to, boss }: { h: PowerCover; onOpen(tab?: PwTab): void; nav: Nav; from: string; to: string; boss?: { name: string; phone: string } }) {
  const { state, teamView } = useStore();
  if (!state) return null;
  const p = h.power, cfg = powerCfg(state.params), forms = formsOf(p, cfg), here = h.deps.filter(d => !d.clash && !d.who.gone), first = h.deps.find(d => d.name === h.pick), known = (p.contactIds || []).map(id => state.contacts[id]).filter(Boolean);
  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0"><span className="block text-xs text-slate-600">{processLabel(p.processId)}</span><strong className="block text-sm font-semibold text-slate-900">{p.power.trim() || 'Fonction à décrire'}</strong>{waitText(p) && <span className="block text-xs text-slate-600">Peut attendre : {waitText(p).toLowerCase()}</span>}</div>
        <StatusBadge level={STATUS[h.status].level} text={STATUS[h.status].text} />
      </div>
      <div className="space-y-2 border-t border-slate-100 px-3 py-2.5 text-xs">
        {first?.who.phone && (
          <a href={`tel:${telOf(first.who.phone)}`} className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-delacour-primary px-3 py-2 text-xs font-bold text-white hover:bg-delacour-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark focus-visible:ring-offset-2 sm:w-auto ${TOUCH}`}>
            <Phone size={14} aria-hidden />Appeler {first.name} · {first.who.phone}
          </a>
        )}
        {h.status === 'none' && <p className="text-slate-600">Cette fonction n'a pas de suppléant prévu : elle attend le retour de {p.holder.trim() || 'son titulaire'}.</p>}
        {h.status === 'uncovered' && (
          <div className="space-y-2 rounded-lg bg-red-50 p-2.5">
            <p className="font-semibold text-red-800">{h.deps.length ? "Aucun des suppléants n'est là pendant toute cette période." : 'Aucun suppléant nommé.'}</p>
            {boss && <p className="text-slate-800">Direction à joindre : <strong>{boss.name}</strong>{boss.phone ? <> <PhoneLink phone={boss.phone} who={boss.name} /></> : ' : numéro manquant dans l\'annuaire (1.3)'}</p>}
            <Button className="!py-1" onClick={() => onOpen('people')}>{h.deps.length ? 'Voir les suppléants' : 'Nommer un suppléant'}</Button>
          </div>
        )}
        <details open={h.status === 'uncovered' && h.deps.length > 0} className="rounded-lg border border-slate-200 px-2.5">
          <summary className={`flex cursor-pointer list-none items-center font-semibold text-delacour-primary ${TOUCH}`}>Suppléants et détails</summary>
        <div className="space-y-2 pb-2">
        <ul className="divide-y divide-slate-100">
          {h.deps.map(d => {
            const at = here.indexOf(d);
            return (
              <li key={d.slot} className="space-y-0.5 py-1.5">
                <div className="flex flex-wrap items-center gap-x-2"><strong className="font-semibold text-slate-900">{d.name}</strong>{at >= 0 && <span className="text-slate-600">{at === 0 ? 'à appeler en premier' : 'à appeler ensuite'}</span>}</div>
                <Facts who={d.who} phone={d !== first} />
                <div className={d.clash ? 'font-semibold text-red-700' : 'text-slate-700'}>{d.clash ? `absent du ${frDate(d.clash.from)} au ${frDate(d.clash.to)}` : d.who.gone ? '' : `disponible du ${frDate(from)} au ${frDate(to)}`}</div>
                <div><SignState p={p} who={d.name} /></div>
              </li>
            );
          })}
        </ul>
        {(p.howTo || p.sopId || p.limits) && (
          <details className="rounded-lg bg-slate-50 px-2.5 py-1.5">
            <summary className={`cursor-pointer list-none font-semibold text-delacour-primary ${TOUCH} flex items-center`}>Comment faire</summary>
            <div className="space-y-1.5 pb-1">
              {p.howTo && <p className="whitespace-pre-line text-slate-800">{p.howTo}</p>}
              {p.limits && <p className="text-slate-700"><strong>Limites :</strong> {p.limits}</p>}
              {p.sopId && state.sops[p.sopId] && <button type="button" className={`inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline ${TOUCH}`} onClick={() => nav.open('3.2', p.sopId)}>Ouvrir l'instruction (3.2)<NewTab /></button>}
            </div>
          </details>
        )}
        {!teamView && p.access.trim() && <p className="text-slate-700"><strong>Accès :</strong> {p.access}</p>}
        {forms.missing.length > 0 && <p className="text-amber-800">Formalités manquantes : {forms.missing.join(', ')}.</p>}
        {known.length > 0 && <p className="text-slate-700"><strong>À connaître :</strong> {known.map((c, i) => <span key={c.id}>{i ? ' · ' : ''}{c.name}{c.company && c.company !== 'Interne' ? ` (${c.company})` : ''}{c.phone ? <> <a className="font-mono font-semibold text-delacour-primary hover:underline" href={`tel:${telOf(c.phone)}`}>{c.phone}</a></> : null}</span>)}</p>}
        <Button className="!py-1" aria-label={`Ouvrir la fonction : ${p.power.trim() || 'à décrire'}`} onClick={() => onOpen()}>Ouvrir la fonction</Button>
        </div>
        </details>
      </div>
    </li>
  );
}
