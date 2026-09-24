// Tool 1.2, screen "Crise": "what is down?" -> the reflex card. Printable, one card per page, for the red binder:
// on the day of the outage the application itself may be out of reach.
import { useEffect, useState } from 'react';
import { Phone, Printer, Search } from 'lucide-react';
import type { Risk } from '../domain/types';
import { risksInOrder } from '../domain/risk';
import { familyLabel } from '../domain/riskTemplates';
import { useStore } from '../store/StoreContext';
import { Button, Card, inputCls } from './common';

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const lines = (t: string) => t.split('\n').map(x => x.trim()).filter(Boolean);

export function Crise() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [printOne, setPrintOne] = useState<string | null>(null);
  useEffect(() => {
    if (!printOne) return;
    const done = () => setPrintOne(null);
    window.addEventListener('afterprint', done);
    window.print();
    return () => window.removeEventListener('afterprint', done);
  }, [printOne]);
  if (!state) return null;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const risks = risksInOrder(state).filter(r => {
    const hay = norm([r.title, r.resource, r.signal, r.planB].join(' '));
    return words.every(w => hay.includes(w));
  });

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-3 sm:p-4 print:hidden">
        <label htmlFor="crise-q" className="block text-sm font-bold text-red-800">Qu'est-ce qui est en panne ?</label>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input id="crise-q" className={`${inputCls} !py-2 pl-8 !text-sm`} value={q} placeholder="Machine, logiciel, fournisseur, personne…" onChange={e => setQ(e.target.value)} autoComplete="off" />
          </div>
          <Button onClick={() => window.print()}><Printer size={14} />Imprimer toutes les fiches</Button>
        </div>
        <p className="text-[11px] text-slate-500">Imprimez les fiches et rangez-les dans un classeur rouge à l'accueil et près des postes concernés : le jour de la panne, l'ordinateur peut être inaccessible.</p>
      </Card>
      {risks.length === 0 ? <p className="py-6 text-center text-xs text-slate-500 print:hidden">Aucune fiche ne correspond. Appelez le dirigeant.</p> : (
        <div className="grid gap-4 lg:grid-cols-2 print:block">
          {risks.map(r => <ReflexCard key={r.id} r={r} hidden={!!printOne && printOne !== r.id} print={() => setPrintOne(r.id)} company={state.settings.companyName} />)}
        </div>
      )}
    </div>
  );
}

function ReflexCard({ r, hidden, print, company }: { r: Risk; hidden: boolean; print(): void; company: string }) {
  const first = lines(r.firstHour);
  return (
    <article className={`overflow-hidden rounded-xl border-2 border-red-200 bg-white print:mb-0 print:break-after-page print:break-inside-avoid print:border-red-700 ${hidden ? 'print:hidden' : ''}`}>
      <header className="flex items-start justify-between gap-2 bg-red-700 px-3 py-2 text-white">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-red-100">Fiche réflexe{company ? ` · ${company}` : ''}</div>
          <h3 className="text-sm font-bold">{r.title}</h3>
        </div>
        <button type="button" onClick={print} aria-label={`Imprimer la fiche ${r.title}`} className="shrink-0 rounded-md p-1 text-red-100 hover:bg-white/10 hover:text-white print:hidden"><Printer size={16} /></button>
      </header>
      <div className="space-y-2.5 px-3 py-3 text-xs text-slate-800">
        {r.signal && <p><strong>Signal :</strong> {r.signal}</p>}
        {!r.planB.trim() ? (
          <p className="rounded-lg bg-red-50 px-2.5 py-2 font-semibold text-red-800">Pas de Plan B prévu. Appelez {r.owner || 'le dirigeant'}{r.deputy ? `, ou ${r.deputy}` : ''}.</p>
        ) : <>
          <Block title="Première heure">
            {first.length ? <ol className="list-decimal space-y-0.5 pl-4">{first.map((l, i) => <li key={i}>{l}</li>)}</ol> : <p className="text-slate-500">Gestes à écrire dans la fiche du risque.</p>}
          </Block>
          <Block title={`Plan B${r.family ? ` · ${familyLabel(r.family)}` : ''}`}>
            <p>{r.planB}</p>
            {(r.relay || r.activation) && <p className="text-slate-600">{[r.relay && `Relais : ${r.relay}`, r.activation && `activation ${r.activation}`].filter(Boolean).join(' · ')}</p>}
          </Block>
        </>}
        {lines(r.contacts).length > 0 && (
          <Block title="Qui appeler">
            <ul className="space-y-0.5">{lines(r.contacts).map((l, i) => <li key={i}><Contact line={l} /></li>)}</ul>
          </Block>
        )}
        {r.access && <p><strong>Clés, codes, documents :</strong> {r.access}</p>}
        {r.sacrifice && <p><strong>On laisse tomber d'abord :</strong> {r.sacrifice}</p>}
        <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-600">Responsable : <strong className="text-slate-800">{r.owner || 'à désigner'}</strong>{r.deputy ? <> · suppléant : <strong className="text-slate-800">{r.deputy}</strong></> : ''}{r.maxOutage ? ` · arrêt tolérable : ${r.maxOutage}` : ''}</p>
      </div>
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h4 className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800">{title}</h4>{children}</section>;
}

// Phone numbers become links: one tap to call from a phone
function Contact({ line }: { line: string }) {
  const m = line.match(/(\+?\d[\d .]{7,}\d)/);
  if (!m) return <>{line}</>;
  const [before, after] = [line.slice(0, m.index), line.slice(m.index! + m[0].length)];
  return <>{before}<a href={`tel:${m[0].replace(/[ .]/g, '')}`} className="inline-flex items-center gap-1 font-mono font-semibold text-delacour-primary underline-offset-2 hover:underline"><Phone size={12} className="print:hidden" />{m[0]}</a>{after}</>;
}
