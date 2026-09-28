// Tool 1.3 "Annuaire": the numbers to call when something breaks.
// Two views: "En cas de crise" (internal org chart and call chains: who next when nobody answers) and "Liste et saisie".
// The reflex cards of the Plans B (tool 1.2) take their contacts and chains from here.
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Contact2, CreditCard, Download, Mail, Phone, Pin, Plus, Printer, Search, Trash2 } from 'lucide-react';
import type { Contact, ContactCategory, State } from '../domain/types';
import { CATEGORIES, badLoop, callChains, candidates, chainIssues, chainOf, contactLabel, deputiesFromPowers, duplicates, orgTree, telOf, toCallThisMonth, toCheck, vcardOf, vitalContacts, type OrgNode } from '../domain/contacts';
import { pocketCardPdf } from '../domain/directoryPdf';
import { exampleContacts } from '../domain/riskTemplates';
import { frDate, isoDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, Modal, inputCls } from './common';
import { PasteImport, type Column } from './PasteImport';
import { downloadFile, fileSlug } from './download';

type Filter = 'all' | 'vital' | 'always' | 'check' | 'dup';
type View = 'crise' | 'liste';
const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const newId = () => `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const blank = (p: Partial<Contact> = {}): Contact => ({ id: newId(), category: 'autre', name: '', role: '', company: '', phone: '', email: '', always: false, verifiedAt: '', ...p });
// inside the company, the name is enough ("Interne · Jean-Marc" says nothing more)
const short = (c: Contact) => (c.category === 'interne' && c.name ? c.name : contactLabel(c));
const link = 'inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline';

const IMPORT_COLS: Column[] = [
  { key: 'company', label: 'Société', aliases: ['entreprise', 'organisation', 'company', 'raison sociale'] },
  { key: 'name', label: 'Nom', aliases: ['nom complet', 'contact', 'prenom nom', 'name'] },
  { key: 'role', label: 'Fonction', aliases: ['poste', 'titre', 'job title', 'title'] },
  { key: 'phone', label: 'Téléphone', aliases: ['tel', 'mobile', 'portable', 'telephone bureau', 'business phone'] },
  { key: 'phone2', label: 'Autre numéro', aliases: ['standard', 'telephone 2', 'fixe', 'autre telephone'] },
  { key: 'email', label: 'E-mail', aliases: ['mail', 'courriel', 'adresse de messagerie', 'e-mail address'] },
  { key: 'category', label: 'Catégorie', aliases: ['type', 'groupe'] },
];
const categoryOf = (t: string): ContactCategory => {
  const n = norm(t);
  return CATEGORIES.find(c => n && (norm(c.label).includes(n) || n.includes(c.key)))?.key || 'autre';
};

export function Annuaire({ focus = '' }: { focus?: string }) {
  const { state, update, author, teamView } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>(() => (focus || !Object.keys(state?.contacts || {}).length ? 'liste' : 'crise'));
  const [pick, setPick] = useState(false);
  // order fixed when the screen opens, so a row does not move while it is being typed
  const [order, setOrder] = useState<string[]>(() => sortIds(Object.values(state?.contacts || {})));
  useEffect(() => { if (focus) setTimeout(() => document.getElementById(`ct-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }, [focus]);
  if (!state) return null;
  const all = [...order.filter(id => state.contacts[id]), ...Object.keys(state.contacts).filter(id => !order.includes(id))].map(id => state.contacts[id]);
  const usedBy = (id: string) => Object.values(state.risks).filter(r => r.contactIds.includes(id) || r.notifyIds.includes(id));
  const set = (id: string, patch: Partial<Contact>) => update(d => { d.contacts[id] = { ...d.contacts[id], ...patch }; });
  const verify = (id: string) => set(id, { verifiedAt: isoDate(new Date()), verifiedBy: author });
  const add = (p: Partial<Contact> = {}) => {
    const c = blank(p);
    update(d => { d.contacts[c.id] = c; });
    setOrder([c.id, ...order]);
    setQ(''); setFilter('all'); setView('liste');
  };
  const remove = (c: Contact) => {
    const uses = usedBy(c.id).length;
    const links = all.filter(x => x.backupId === c.id || x.reportsTo === c.id).length;
    const msg = [uses && `${contactLabel(c)} figure sur ${uses} fiche(s) réflexe(s) des Plans B.`, links && `${links} contact(s) le désignent comme relais ou responsable.`].filter(Boolean).join(' ');
    if (!window.confirm(msg ? `${msg} Le supprimer quand même ? Il sera retiré de ces fiches et de ces chaînes.` : `Supprimer ${contactLabel(c)} ?`)) return;
    update(d => {
      delete d.contacts[c.id];
      Object.values(d.risks).forEach(r => { r.contactIds = r.contactIds.filter(x => x !== c.id); r.notifyIds = r.notifyIds.filter(x => x !== c.id); });
      Object.values(d.contacts).forEach(x => { if (x.backupId === c.id) x.backupId = c.backupId !== x.id ? c.backupId : undefined; if (x.reportsTo === c.id) x.reportsTo = c.reportsTo; });
      Object.values(d.suppliers).forEach(x => { if (x.contactId === c.id) x.contactId = undefined; });
      Object.values(d.equipments).forEach(x => { if (x.contactId === c.id) x.contactId = undefined; });
    });
  };
  const fillExamples = () => {
    const xs = exampleContacts();
    update(d => { xs.forEach(c => { d.contacts[c.id] = c; }); });
    setOrder(sortIds(xs));
  };
  const importRows = (rows: Record<string, string>[]) => {
    const known = new Set(all.map(c => telOf(c.phone)).filter(Boolean));
    const xs = rows.filter(r => (r.company || r.name || r.phone) && !(r.phone && known.has(telOf(r.phone))))
      .map(r => blank({ company: r.company, name: r.name, role: r.role, phone: r.phone, phone2: r.phone2 || undefined, email: r.email, category: categoryOf(r.category) }));
    update(d => { xs.forEach(c => { d.contacts[c.id] = c; }); });
    setOrder([...xs.map(c => c.id), ...order]);
    return xs.length;
  };
  const dups = duplicates(state);
  const dupIds = new Set(dups.flat().map(c => c.id));
  const words = norm(q).split(/\s+/).filter(Boolean);
  const pass: Record<Filter, (c: Contact) => boolean> = { all: () => true, vital: c => !!c.vital, always: c => c.always, check: c => toCheck(c), dup: c => dupIds.has(c.id) };
  const shown = all.filter(c => pass[filter](c) && words.every(w => norm([c.company, c.name, c.role, c.phone, c.phone2, c.email, c.reference].join(' ')).includes(w)));
  const FILTERS: [Filter, string][] = [['all', 'Tous'], ['vital', 'Vitaux'], ['always', 'Joignables 24 h/24'], ['check', 'À vérifier'], ['dup', 'Doublons']];
  const vcf = () => downloadFile(`Annuaire-${fileSlug(state.settings.companyName || 'crise')}.vcf`, vcardOf(all.filter(c => c.phone || c.email), state.settings.companyName), 'text/vcard');
  const pocket = () => downloadFile('Carte-de-poche.pdf', pocketCardPdf(vitalContacts(state), { company: state.settings.companyName, address: state.params.company?.address || '', access: state.params.siteAccess || '', date: new Date() }), 'application/pdf');
  const cands = candidates(state);

  return (
    <div className="space-y-4">
      {view === 'crise' && <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>}
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-delacour-primary">Annuaire</h2>
            <p className="text-[11px] text-slate-500">Qui appeler quand ça casse, et qui appeler ensuite si ça ne répond pas. Les fiches réflexes des Plans B reprennent ces numéros et ces chaînes.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button kind="primary" onClick={() => add()}><Plus size={14} />Ajouter un contact</Button>
            <PasteImport title="Importer des contacts (Outlook, Excel, logiciel)" cols={IMPORT_COLS} onImport={importRows} label="Importer" />
            {cands.length > 0 && <Button kind="ghost" onClick={() => setPick(true)}><Contact2 size={14} />Reprendre des autres outils ({cands.length})</Button>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={vcf} disabled={!all.length} title="Fichier .vcf : ouvrez-le sur le téléphone, tous les numéros entrent dans les contacts"><Download size={14} />Vers les contacts du téléphone</Button>
          <Button onClick={pocket} disabled={!all.length} title="4 cartes A6 sur une page A4 : les numéros épinglés comme vitaux, à découper et plastifier"><CreditCard size={14} />Carte de poche (PDF)</Button>
          <Button onClick={() => window.print()}><Printer size={14} />{view === 'crise' ? 'Imprimer les chaînes (A4 paysage)' : 'Imprimer la liste'}</Button>
        </div>

        <SiteBlock state={state} update={update} />

        {all.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-xs text-slate-500">Aucun contact. Ajoutez le prestataire informatique, la banque, l'assureur, les confrères et les clients à prévenir.</p>
            <Button kind="primary" onClick={fillExamples}>Remplir avec des exemples</Button>
          </div>
        ) : <>
          <Checks state={state} dups={dups} onVerify={verify} onShow={id => { setView('liste'); setFilter('all'); setQ(''); setTimeout(() => document.getElementById(`ct-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }} />
          <div role="tablist" className="flex gap-1 border-b border-slate-200 print:hidden">
            {([['crise', 'En cas de crise'], ['liste', 'Liste et saisie']] as [View, string][]).map(([v, l]) => (
              <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-semibold ${view === v ? 'border-delacour-primary text-delacour-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
            ))}
          </div>
          {view === 'crise' ? <CrisisView state={state} /> : <>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} pl-8`} value={q} placeholder="Rechercher un nom, une société, un numéro, une référence…" aria-label="Rechercher" onChange={e => setQ(e.target.value)} />
              </div>
              {FILTERS.map(([f, l]) => {
                const n = all.filter(pass[f]).length;
                if (f === 'dup' && !n) return null;
                return (
                  <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${filter === f ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    {l} <span className="opacity-75">{n}</span>
                  </button>
                );
              })}
            </div>
            {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun contact ne correspond.</p> : (
              <div className="space-y-4 print:hidden">
                {CATEGORIES.map(cat => {
                  const rows = shown.filter(c => c.category === cat.key).sort((a, b) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0));
                  if (!rows.length) return null;
                  return (
                    <section key={cat.key} className="space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-900">{cat.label} <span className="font-normal text-slate-500">{rows.length}</span></h3>
                      <ul className="space-y-2">{rows.map(c => (
                        <Row key={c.id} c={c} state={state} all={all} focused={focus === c.id} dup={dupIds.has(c.id)} teamView={teamView}
                          uses={usedBy(c.id).map(r => r.title)} set={p => set(c.id, p)} verify={() => verify(c.id)} remove={() => remove(c)} />
                      ))}</ul>
                    </section>
                  );
                })}
              </div>
            )}
            <PrintList contacts={shown} state={state} />
          </>}
        </>}
        <p className="text-[11px] text-slate-500 print:hidden">Préférez les numéros professionnels et prévenez les personnes concernées (RGPD). Un numéro se vérifie en l'appelant : 4 numéros par mois arrivent dans « Mes tâches ».</p>
      </Card>
      {pick && <PickCandidates state={state} onClose={() => setPick(false)} onAdd={xs => {
        const made = xs.map(x => ({ x, c: blank({ category: x.category, company: x.company, name: x.name }) }));
        update(d => made.forEach(({ x, c }) => { d.contacts[c.id] = c; if (x.supplierId && d.suppliers[x.supplierId]) d.suppliers[x.supplierId].contactId = c.id; }));
        setOrder([...made.map(m => m.c.id), ...order]);
        setPick(false); setView('liste'); setFilter('all');
      }} />}
    </div>
  );
}

const sortIds = (xs: Contact[]) => [...xs].sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))).map(c => c.id);

// Address of the site and how the emergency services get in: printed on the pocket card and the list
function SiteBlock({ state, update }: { state: State; update(f: (d: State) => void): void }) {
  const address = state.params.company?.address || '';
  return (
    <div className="grid gap-2 rounded-lg border border-red-200 bg-red-50/50 p-2.5 sm:grid-cols-2 print:border-0 print:bg-transparent print:p-0">
      <label className="block space-y-1">
        <span className="block text-[11px] font-semibold text-red-900">Adresse du site à donner aux secours</span>
        <input className={inputCls} value={address} placeholder="12 rue de l'Industrie, 69000 Lyon" onChange={e => update(d => { d.params.company = { siret: '', phone: '', email: '', ...d.params.company, address: e.target.value }; })} />
      </label>
      <label className="block space-y-1">
        <span className="block text-[11px] font-semibold text-red-900">Accès pour les secours</span>
        <input className={inputCls} value={state.params.siteAccess || ''} placeholder="Portail côté parking, code 1234, bâtiment B au fond" onChange={e => update(d => { d.params.siteAccess = e.target.value; })} />
      </label>
    </div>
  );
}

// What to fix: chains that loop, unchecked numbers in a chain, duplicates, vital contacts without backup, numbers to call this month
function Checks({ state, dups, onVerify, onShow }: { state: State; dups: Contact[][]; onVerify(id: string): void; onShow(id: string): void }) {
  const { loops, unchecked } = chainIssues(state);
  const lonely = Object.values(state.contacts).filter(c => c.vital && !c.backupId && c.category !== 'secours');
  const month = toCallThisMonth(state);
  const Name = ({ c }: { c: Contact }) => <button type="button" className="font-semibold underline decoration-dotted hover:text-slate-900" onClick={() => onShow(c.id)}>{short(c)}</button>;
  const join = (xs: Contact[], sep = ', ') => xs.map((c, i) => <span key={c.id}>{i ? sep : ''}<Name c={c} /></span>);
  if (!loops.length && !unchecked.length && !dups.length && !lonely.length && !month.length) return null;
  return (
    <div className="space-y-1.5 print:hidden">
      {loops.map((l, i) => <p key={i} className="flex gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-900"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Chaîne d'appel qui boucle : {join(l, ' puis ')}, puis retour au début. Changez un relais.</span></p>)}
      {unchecked.length > 0 && <p className="flex gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Numéros jamais vérifiés, ou pas depuis un an, dans une chaîne d'appel : {join(unchecked)}.</span></p>}
      {dups.map((g, i) => <p key={i} className="flex gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Même numéro ou même e-mail : {join(g, ' et ')}. Gardez une seule fiche.</span></p>)}
      {lonely.length > 0 && <p className="flex gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>Contacts vitaux sans relais si ça ne répond pas : {join(lonely)}.</span></p>}
      {month.length > 0 && (
        <div className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] text-slate-700">
          <p className="font-semibold text-slate-900">À appeler ce mois-ci pour vérifier le numéro</p>
          <ul className="mt-1 space-y-1">{month.map(c => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3">
              <Name c={c} /><a href={`tel:${telOf(c.phone)}`} className="font-mono font-semibold text-delacour-primary hover:underline">{c.phone}</a>
              <span className="text-slate-500">{c.verifiedAt ? `vérifié le ${frDate(c.verifiedAt)}` : 'jamais vérifié'}</span>
              <button type="button" className={link} onClick={() => onVerify(c.id)}><CheckCircle2 size={13} />Le numéro répond</button>
            </li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

function Row({ c, state, all, uses, focused, dup, teamView, set, verify, remove }: {
  c: Contact; state: State; all: Contact[]; uses: string[]; focused: boolean; dup: boolean; teamView: boolean; set(p: Partial<Contact>): void; verify(): void; remove(): void;
}) {
  const stale = toCheck(c);
  const others = all.filter(x => x.id !== c.id).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b)));
  const next = chainOf(state, c);
  const deps = c.category === 'interne' ? deputiesFromPowers(state, c) : [];
  const canDelete = !teamView || state.params.teamCanDelete;
  return (
    <li id={`ct-${c.id}`} className={`space-y-1.5 rounded-lg border p-2.5 ${c.vital ? 'border-red-300' : 'border-slate-200'} ${focused ? 'ring-2 ring-delacour-gold' : ''}`}>
      <div className="grid gap-1.5 sm:grid-cols-[1fr_1fr_1fr_140px_1.2fr]">
        <input className={inputCls} value={c.company} placeholder="Société" aria-label="Société" onChange={e => set({ company: e.target.value })} />
        <input className={inputCls} value={c.name} placeholder="Nom" aria-label="Nom" onChange={e => set({ name: e.target.value })} />
        <input className={inputCls} value={c.role} placeholder="Fonction" aria-label="Fonction" onChange={e => set({ role: e.target.value })} />
        <input className={`${inputCls} font-mono`} value={c.phone} placeholder="Téléphone" inputMode="tel" aria-label="Téléphone" onChange={e => set({ phone: e.target.value })} />
        <input className={inputCls} type="email" value={c.email} placeholder="E-mail" inputMode="email" aria-label="E-mail" onChange={e => set({ email: e.target.value })} />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-[140px_1fr_1.4fr]">
        <input className={`${inputCls} font-mono`} value={c.phone2 || ''} placeholder="Autre numéro" inputMode="tel" aria-label="Autre numéro (standard, astreinte)" title="Standard, astreinte, fixe : à appeler si le premier numéro ne répond pas" onChange={e => set({ phone2: e.target.value })} />
        <input className={inputCls} value={c.always ? '24 h/24' : c.hours || ''} disabled={c.always} placeholder="Horaires (lun-ven 8 h-18 h)" aria-label="Horaires" onChange={e => set({ hours: e.target.value })} />
        <input className={inputCls} value={c.reference || ''} placeholder="Référence à donner : n° de contrat, n° client" aria-label="Référence à donner à l'appel" onChange={e => set({ reference: e.target.value })} />
      </div>
      {!teamView && (
        <input className={inputCls} value={c.secret || ''} placeholder="Mot de passe ou consigne à dire à l'appel (réservé à la direction)" aria-label="Mot de passe ou consigne (direction)" onChange={e => set({ secret: e.target.value })} />
      )}
      <div className="grid gap-1.5 text-[11px] sm:grid-cols-3">
        <select className={inputCls} value={c.category} aria-label="Catégorie" onChange={e => set({ category: e.target.value as ContactCategory, reportsTo: e.target.value === 'interne' ? c.reportsTo : undefined })}>
          {CATEGORIES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <select className={inputCls} value={c.backupId || ''} aria-label="Si pas de réponse, appeler" onChange={e => set({ backupId: e.target.value || undefined })}>
          <option value="">Si pas de réponse : personne</option>
          {others.map(x => <option key={x.id} value={x.id}>Si pas de réponse : {contactLabel(x)}</option>)}
        </select>
        {c.category === 'interne' ? (
          <select className={inputCls} value={c.reportsTo || ''} aria-label="Rattaché à" onChange={e => set({ reportsTo: e.target.value || undefined })}>
            <option value="">Rattaché à : personne (en haut de l'organigramme)</option>
            {others.filter(x => x.category === 'interne').map(x => <option key={x.id} value={x.id}>Rattaché à : {contactLabel(x)}</option>)}
          </select>
        ) : <span />}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <label className="flex items-center gap-1.5 font-semibold text-red-800"><input type="checkbox" checked={!!c.vital} onChange={e => set({ vital: e.target.checked })} /><Pin size={12} />Vital</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={c.always} onChange={e => set({ always: e.target.checked })} />Joignable 24 h/24</label>
        <span className={stale ? 'font-semibold text-amber-800' : ''}>{c.verifiedAt ? `Vérifié le ${frDate(c.verifiedAt)}${c.verifiedBy ? ` par ${c.verifiedBy}` : ''}` : 'Jamais vérifié'}</span>
        <button type="button" className={link} onClick={verify}><CheckCircle2 size={13} />Vérifié aujourd'hui</button>
        {c.phone && <a href={`tel:${telOf(c.phone)}`} className={link}><Phone size={13} />Appeler</a>}
        {c.email && <a href={`mailto:${c.email}`} className={link}><Mail size={13} />Écrire</a>}
        {dup && <span className="font-semibold text-amber-800">Doublon</span>}
        {canDelete && <button type="button" aria-label={`Supprimer ${contactLabel(c)}`} onClick={remove} className="ml-auto rounded p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
      </div>
      <div className="space-y-0.5 text-[11px] text-slate-600">
        {next.chain.length > 1 && <p className={badLoop(next) ? 'font-semibold text-red-800' : ''}>Chaîne : {next.chain.map(contactLabel).join(' puis ')}{badLoop(next) ? ', puis retour au début (à corriger)' : ''}</p>}
        {deps.length > 0 && <p>Suppléants désignés dans l'outil 4.1 : {deps.join(', ')}</p>}
        <p>{uses.length ? `Utilisé par les Plans B : ${uses.join(', ')}` : 'Utilisé par aucun Plan B'}</p>
      </div>
    </li>
  );
}

// "En cas de crise": internal org chart with "if absent", then the call chains of the outside contacts
function CrisisView({ state }: { state: State }) {
  const tree = orgTree(state);
  const chains = callChains(state).filter(x => x.chain[0].category !== 'interne' || x.chain.some(c => c.category !== 'interne'));
  const inChain = new Set(chains.flatMap(x => x.chain.map(c => c.id)));
  const alone = Object.values(state.contacts).filter(c => c.category !== 'interne' && !inChain.has(c.id) && c.phone.trim())
    .sort((a, b) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0) || CATEGORIES.findIndex(x => x.key === a.category) - CATEGORIES.findIndex(x => x.key === b.category));
  return (
    <div className="space-y-4">
      <p className="hidden text-xs font-bold print:block">{state.settings.companyName ? `${state.settings.companyName} · ` : ''}Annuaire de crise, imprimé le {new Date().toLocaleDateString('fr-FR')}{state.params.company?.address ? ` · ${state.params.company.address}` : ''}{state.params.siteAccess ? ` · accès secours : ${state.params.siteAccess}` : ''}</p>
      <section className="space-y-2 break-inside-avoid">
        <h3 className="text-xs font-bold text-slate-900">Interne : qui fait quoi, et qui appeler si la personne est absente</h3>
        {tree.length ? (
          <div className="space-y-4">{tree.map(n => <OrgRoot key={n.c.id} n={n} state={state} />)}</div>
        ) : <p className="text-[11px] text-slate-500">Aucun contact interne. Ajoutez le dirigeant, les responsables et les personnes clés (catégorie Interne), puis indiquez à qui chacun est rattaché.</p>}
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-slate-900">Extérieur : dans quel ordre appeler</h3>
        {chains.length ? (
          <div className="grid gap-2 lg:grid-cols-2 print:grid-cols-2">
            {chains.map(x => (
              <div key={x.chain[0].id} className="break-inside-avoid rounded-lg border border-slate-200 p-2">
                <p className="mb-1 text-[11px] font-semibold text-slate-500">{CATEGORIES.find(k => k.key === x.chain[0].category)?.label}</p>
                <ol className="flex flex-wrap items-stretch gap-1">
                  {x.chain.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-1">
                      {i > 0 && <span className="flex flex-col items-center text-[11px] text-slate-500"><ArrowRight size={14} />sinon</span>}
                      <Box c={c} step={i + 1} />
                    </li>
                  ))}
                  {badLoop(x) && <li className="self-center text-[11px] font-semibold text-red-800">puis retour au début : à corriger</li>}
                </ol>
              </div>
            ))}
          </div>
        ) : <p className="text-[11px] text-slate-500">Aucune chaîne. Dans « Liste et saisie », choisissez pour chaque contact qui appeler si ça ne répond pas (le standard, puis l'astreinte, puis le responsable).</p>}
      </section>
      {alone.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Autres numéros, sans relais</h3>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">{alone.map(c => <li key={c.id}><Box c={c} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}

// Top of the chart centred, one column per manager under it, then each team listed below its manager:
// readable with 20 people or more, on a phone and on an A4 landscape page
function OrgRoot({ n, state }: { n: OrgNode; state: State }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-56"><Person c={n.c} state={state} /></div>
      {n.children.length > 0 && <>
        <span className="h-4 w-px bg-slate-300" />
        <ul className={`grid w-full gap-3 border-t border-slate-300 pt-3 sm:grid-cols-2 ${n.children.length >= 4 ? 'lg:grid-cols-4 print:grid-cols-4' : n.children.length === 3 ? 'lg:grid-cols-3 print:grid-cols-3' : 'print:grid-cols-2'}`}>
          {n.children.map(k => (
            <li key={k.c.id} className="break-inside-avoid space-y-1.5 rounded-lg bg-slate-50 p-2">
              <Person c={k.c} state={state} />
              <Team list={k.children} state={state} />
            </li>
          ))}
        </ul>
      </>}
    </div>
  );
}

function Team({ list, state }: { list: OrgNode[]; state: State }) {
  if (!list.length) return null;
  return (
    <ul className="ml-2 space-y-1.5 border-l-2 border-slate-300 pl-2.5">
      {list.map(k => <li key={k.c.id} className="space-y-1.5"><Person c={k.c} state={state} /><Team list={k.children} state={state} /></li>)}
    </ul>
  );
}

// A person of the chart: the card, then who to call if the person is away (backup, else deputy of tool 4.1)
function Person({ c, state }: { c: Contact; state: State }) {
  const backup = c.backupId ? state.contacts[c.backupId] : undefined;
  const absent = backup ? short(backup) : deputiesFromPowers(state, c)[0];
  return (
    <div>
      <Box c={c} full />
      <p className={`mt-0.5 rounded px-1.5 py-0.5 text-[11px] ${absent ? 'text-slate-600' : 'bg-amber-50 font-semibold text-amber-900'}`}>
        Si absent : {absent ? <><strong className="text-slate-800">{absent}</strong>{backup?.phone && <> <a href={`tel:${telOf(backup.phone)}`} className="whitespace-nowrap font-mono font-semibold text-delacour-primary">{backup.phone}</a></>}</> : 'personne'}
      </p>
    </div>
  );
}

// One contact as a card: who, what for, the number to tap, when it answers, what to give
function Box({ c, step, full }: { c: Contact; step?: number; full?: boolean }) {
  return (
    <div className={`${full ? 'w-full' : 'min-w-[150px] max-w-[220px]'} rounded-lg border bg-white px-2 py-1.5 text-[11px] ${c.vital ? 'border-2 border-red-400' : 'border-slate-300'}`}>
      <p className="font-bold leading-tight text-slate-900">{step ? `${step}. ` : ''}{short(c)}</p>
      {c.role && <p className="leading-tight text-slate-600">{c.role}</p>}
      {c.phone && <a href={`tel:${telOf(c.phone)}`} className="block whitespace-nowrap font-mono text-xs font-bold text-delacour-primary hover:underline">{c.phone}</a>}
      {c.phone2 && <a href={`tel:${telOf(c.phone2)}`} className="block font-mono text-delacour-primary hover:underline">{c.phone2}</a>}
      <p className="leading-tight text-slate-600">{[c.always ? '24 h/24' : c.hours, c.reference && `donner : ${c.reference}`].filter(Boolean).join(' · ')}</p>
      {toCheck(c) && <p className="font-semibold text-amber-800">À vérifier</p>}
    </div>
  );
}

// Suppliers and customers the other tools know, not yet in the directory
function PickCandidates({ state, onClose, onAdd }: { state: State; onClose(): void; onAdd(xs: ReturnType<typeof candidates>): void }) {
  const list = candidates(state);
  const [on, setOn] = useState<Set<string>>(() => new Set(list.map(x => x.key)));
  const chosen = list.filter(x => on.has(x.key));
  return (
    <Modal title="Reprendre des autres outils" subtitle="Fournisseurs de l'outil 3.1 et clients des devis gagnés et des réclamations, pas encore dans l'annuaire. Complétez ensuite leur numéro." onClose={onClose}
      footer={<><Button onClick={onClose}>Fermer</Button><Button kind="primary" disabled={!chosen.length} onClick={() => onAdd(chosen)}>Ajouter {chosen.length} contact(s)</Button></>}>
      <ul className="space-y-1 text-xs">
        {list.map(x => (
          <li key={x.key}><label className="flex items-center gap-2">
            <input type="checkbox" checked={on.has(x.key)} onChange={e => { const n = new Set(on); if (e.target.checked) n.add(x.key); else n.delete(x.key); setOn(n); }} />
            <span className="font-semibold">{x.company}</span>{x.name && <span className="text-slate-600">{x.name}</span>}<span className="text-[11px] text-slate-500">{x.from}</span>
          </label></li>
        ))}
      </ul>
    </Modal>
  );
}

// Printed version of the list: by category, to post at the reception or keep in a binder
function PrintList({ contacts, state }: { contacts: Contact[]; state: State }) {
  return (
    <div className="hidden space-y-3 print:block">
      <p className="text-[11px] text-slate-600">{state.settings.companyName ? `${state.settings.companyName} · ` : ''}Annuaire imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      {state.params.company?.address && <p className="text-xs font-semibold">Adresse pour les secours : {state.params.company.address}{state.params.siteAccess ? `. Accès : ${state.params.siteAccess}` : ''}</p>}
      {CATEGORIES.map(cat => {
        const rows = contacts.filter(c => c.category === cat.key).sort((a, b) => (b.vital ? 1 : 0) - (a.vital ? 1 : 0));
        if (!rows.length) return null;
        return (
          <table key={cat.key} className="w-full break-inside-avoid border-collapse text-left text-xs">
            <caption className="pb-1 text-left text-xs font-bold text-slate-900">{cat.label}</caption>
            <tbody>
              {rows.map(c => {
                const next = chainOf(state, c).chain.slice(1);
                return (
                  <tr key={c.id} className="border-b border-slate-200 align-top">
                    <td className="py-1 pr-2 font-semibold">{contactLabel(c)}{c.vital ? ' (vital)' : ''}</td>
                    <td className="py-1 pr-2 text-slate-600">{[c.role, c.always ? '24 h/24' : c.hours, c.reference && `donner : ${c.reference}`, next.length ? `sinon : ${next.map(contactLabel).join(', puis ')}` : ''].filter(Boolean).join(' · ')}</td>
                    <td className="py-1 pr-2 text-slate-600">{c.email}</td>
                    <td className="py-1 text-right font-mono font-bold">{c.phone}{c.phone2 ? <><br />{c.phone2}</> : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
