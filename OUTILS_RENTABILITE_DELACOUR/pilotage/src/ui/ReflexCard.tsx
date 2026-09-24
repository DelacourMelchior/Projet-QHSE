// On-screen reflex card of a risk (same content as the printed card of the crisis binder).
import { Phone } from 'lucide-react';
import type { Contact, Risk, State } from '../domain/types';
import { familyLabel } from '../domain/riskTemplates';
import { formatDuration } from '../domain/duration';
import { noDot } from '../domain/binderPdf';

const lines = (t: string) => t.split('\n').map(x => x.trim()).filter(Boolean);

export function ReflexCard({ r, s }: { r: Risk; s: State }) {
  const first = lines(r.firstHour);
  const who = (ids: string[]) => ids.map(id => s.contacts[id]).filter(Boolean);
  return (
    <article className="overflow-hidden rounded-xl border-2 border-red-200 bg-white">
      <header className="bg-red-700 px-3 py-2 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-red-100">Fiche réflexe{s.settings.companyName ? ` · ${s.settings.companyName}` : ''}</div>
        <h3 className="text-sm font-bold">{r.title || 'Risque sans titre'}</h3>
      </header>
      <div className="space-y-2.5 px-3 py-3 text-xs text-slate-800">
        <p className="text-[11px] text-slate-600">
          Responsable : <strong className="text-slate-800">{r.owner || 'à désigner'}</strong>{r.deputy ? <> · suppléant : <strong className="text-slate-800">{r.deputy}</strong></> : ''}
          {r.maxOutage ? ` · arrêt tolérable : ${formatDuration(r.maxOutage)}` : ''}{r.activation ? ` · activation : ${formatDuration(r.activation)}` : ''}
        </p>
        {r.signal && <p><strong>Signal :</strong> {r.signal}</p>}
        {!r.planB.trim() ? (
          <p className="rounded-lg bg-red-50 px-2.5 py-2 font-semibold text-red-800">Pas de Plan B prévu. Appelez {noDot(r.owner) || 'le dirigeant'}{r.deputy ? `, ou ${noDot(r.deputy)}` : ''}.</p>
        ) : <>
          <Block title="Première heure">
            {first.length ? <ol className="list-decimal space-y-0.5 pl-4">{first.map((l, i) => <li key={i}>{l}</li>)}</ol> : <p className="text-slate-500">Gestes à écrire ci-dessus.</p>}
          </Block>
          <Block title={`Plan B${r.family ? ` · ${familyLabel(r.family)}` : ''}`}>
            <p>{r.planB}</p>
            {r.relay && <p className="text-slate-600">Relais : {r.relay}</p>}
          </Block>
        </>}
        {r.contactIds.length > 0 && <Block title="Qui appeler"><ContactList list={who(r.contactIds)} /></Block>}
        {r.notifyIds.length > 0 && <Block title="Qui prévenir"><ContactList list={who(r.notifyIds)} /></Block>}
        {r.access && <p><strong>Clés, codes, documents :</strong> {r.access}</p>}
        {r.sacrifice && <p><strong>On laisse tomber d'abord :</strong> {r.sacrifice}</p>}
      </div>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h4 className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800">{title}</h4>{children}</section>;
}

// Phone numbers are links: one tap to call from a phone
export function ContactList({ list }: { list: Contact[] }) {
  return (
    <ul className="space-y-1">
      {list.map(c => (
        <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span><strong>{[c.company, c.name].filter(Boolean).join(' · ')}</strong>{c.role ? <span className="text-slate-600"> · {c.role}</span> : ''}{c.always ? <span className="text-slate-600"> · 24 h/24</span> : ''}</span>
          {c.phone && <a href={`tel:${c.phone.replace(/[ .]/g, '')}`} className="inline-flex items-center gap-1 font-mono font-semibold text-delacour-primary hover:underline"><Phone size={12} />{c.phone}</a>}
        </li>
      ))}
    </ul>
  );
}
