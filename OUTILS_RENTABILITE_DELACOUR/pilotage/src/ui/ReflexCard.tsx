// On-screen reflex card of a risk (same content and order as the printed PDF card):
// trigger, steps, how long it holds, who to call and inform, access, back to normal.
import { Mail, Phone } from 'lucide-react';
import type { Contact, Risk, State } from '../domain/types';
import { familyLabel } from '../domain/riskTemplates';
import { formatDuration } from '../domain/duration';
import { noDot, sentence } from '../domain/reflexPdf';
import { contactLabel } from '../domain/contacts';

export function ReflexCard({ r, s }: { r: Risk; s: State }) {
  const who = (ids: string[]) => ids.map(id => s.contacts[id]).filter(Boolean);
  const steps = r.steps.filter(x => x.what.trim());
  const covered = r.planB.trim() || steps.length;
  return (
    <article className="overflow-hidden rounded-xl border-2 border-red-200 bg-white">
      <header className="bg-red-700 px-3 py-2 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-red-100">Fiche réflexe{s.settings.companyName ? ` · ${s.settings.companyName}` : ''}</div>
        <h3 className="text-sm font-bold">{r.title || 'Risque sans titre'}</h3>
      </header>
      <div className="space-y-2.5 px-3 py-3 text-xs text-slate-800">
        <p className="text-[11px] text-slate-600">
          Responsable : <strong className="text-slate-800">{r.owner || 'à désigner'}</strong>{r.deputy ? <> · suppléant : <strong className="text-slate-800">{r.deputy}</strong></> : ''}
          {r.maxOutage ? ` · arrêt tolérable : ${formatDuration(r.maxOutage)}` : ''}
        </p>
        {!covered ? (
          <p className="rounded-lg bg-red-50 px-2.5 py-2 font-semibold text-red-800">Pas de Plan B prévu. Appelez {noDot(r.owner) || 'le dirigeant'}{r.deputy ? `, ou ${noDot(r.deputy)}` : ''}.</p>
        ) : <>
          {r.planB.trim() && <p className="rounded-lg bg-slate-50 px-2.5 py-1.5"><strong>Plan B{r.family ? ` (${familyLabel(r.family).toLowerCase()})` : ''} :</strong> {sentence(r.planB)}{r.relay ? ` Relais : ${r.relay}.` : ''}</p>}
          {(r.signal || r.trigger) && (
            <Block title="1. Déclencher">
              {r.signal && <p>Signal : {r.signal}</p>}
              {r.trigger && <p>Décide du déclenchement : <strong>{r.trigger}</strong></p>}
            </Block>
          )}
          <Block title={`2. Dérouler${r.activation ? ` (Plan B opérationnel en ${formatDuration(r.activation)})` : ''}`}>
            {steps.length ? (
              <ol className="space-y-1">
                {steps.map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-4 shrink-0 font-bold text-red-700">{i + 1}.</span>
                    <span className="min-w-0 flex-1">{x.when && <strong className="text-red-800">{x.when} : </strong>}{x.what}{x.who && <span className="text-slate-600"> ({x.who})</span>}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-slate-500">Étapes à écrire dans la fiche du risque.</p>}
          </Block>
          {(r.holdFor || r.sacrifice) && (
            <Block title="3. Tenir">
              {r.holdFor && <p>Le Plan B tient <strong>{formatDuration(r.holdFor)}</strong> au maximum.</p>}
              {r.sacrifice && <p>On laisse tomber d'abord : {r.sacrifice}</p>}
            </Block>
          )}
        </>}
        {(r.contactIds.length > 0 || r.notifyIds.length > 0 || r.clientMessage) && (
          <Block title="4. Prévenir">
            {r.contactIds.length > 0 && <><p className="font-semibold">Qui appeler</p><ContactList list={who(r.contactIds)} /></>}
            {r.notifyIds.length > 0 && <><p className="mt-1 font-semibold">Qui informer</p><ContactList list={who(r.notifyIds)} /></>}
            {r.clientMessage && <p className="mt-1 rounded-lg border border-slate-200 px-2.5 py-1.5 italic text-slate-700">« {r.clientMessage} »</p>}
          </Block>
        )}
        {r.access && <Block title="5. Accès"><p>{r.access}</p></Block>}
        {r.recovery && <Block title="6. Revenir à la normale"><p>{r.recovery}</p></Block>}
      </div>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h4 className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800">{title}</h4>{children}</section>;
}

// Phone numbers and e-mails are links: one tap to call or write
export function ContactList({ list }: { list: Contact[] }) {
  return (
    <ul className="space-y-1">
      {list.map(c => (
        <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span><strong>{contactLabel(c)}</strong>{c.role ? <span className="text-slate-600"> · {c.role}</span> : ''}{c.always ? <span className="text-slate-600"> · 24 h/24</span> : ''}</span>
          <span className="flex flex-wrap items-baseline gap-x-3">
            {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-delacour-primary hover:underline"><Mail size={12} />{c.email}</a>}
            {c.phone && <a href={`tel:${c.phone.replace(/[ .]/g, '')}`} className="inline-flex items-center gap-1 font-mono font-semibold text-delacour-primary hover:underline"><Phone size={12} />{c.phone}</a>}
          </span>
        </li>
      ))}
    </ul>
  );
}
