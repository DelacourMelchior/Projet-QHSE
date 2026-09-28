// Tool 1.3 "Annuaire": the numbers to call when something breaks.
// Two views: "Organigramme" (the company and each outside organisation, as trees, edited by drag and drop) and "Liste".
// The reflex cards of the Plans B (tool 1.2) take their contacts and chains from here.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Contact2, CreditCard, Download, Mail, Phone, Pin, Plus, Printer, Search, Trash2, UserRound } from 'lucide-react';
import type { Contact, ContactCategory, State } from '../domain/types';
import { CATEGORIES, CONTRACTS, candidates, managersOf, orgKey, staffInfo, syncStaff, categoryLabel, chainIssues, chainOf, contactLabel, deputiesFromPowers, duplicates, isUnder, orgGroups, orgTree, pendingOf, telOf, toCallThisMonth, toCheck, vcardOf, vitalContacts, type OrgNode } from '../domain/contacts';
import { pocketCardPdf } from '../domain/directoryPdf';
import { exampleContacts } from '../domain/riskTemplates';
import { frDate, isoDate } from '../domain/periods';
import { useStore } from '../store/StoreContext';
import { Button, Card, Field, Modal, inputCls } from './common';
import { PasteImport, type Column } from './PasteImport';
import { downloadFile, fileSlug } from './download';
import type { Nav } from './tools';

type Filter = 'all' | 'vital' | 'always' | 'check' | 'dup';
type View = 'org' | 'liste';
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

export function Annuaire({ focus = '', nav }: { focus?: string; nav?: Nav }) {
  const { state, update, author, teamView } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>(() => (focus || !Object.keys(state?.contacts || {}).length ? 'liste' : 'org'));
  const [cat, setCat] = useState<ContactCategory>('interne');
  const [edit, setEdit] = useState('');
  const [move, setMove] = useState(false);
  const [pick, setPick] = useState(false);
  // order fixed when the screen opens, so a row does not move while it is being typed
  const [order, setOrder] = useState<string[]>(() => sortIds(Object.values(state?.contacts || {})));
  useEffect(() => { if (focus) setTimeout(() => document.getElementById(`ct-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }, [focus]);
  // one staff list with tools 4.1 to 4.3: people known there appear in the org chart, and the other way round
  useEffect(() => { if (state && syncStaff(structuredClone(state))) update(d => { syncStaff(d); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const all = [...order.filter(id => state.contacts[id]), ...Object.keys(state.contacts).filter(id => !order.includes(id))].map(id => state.contacts[id]);
  const usedBy = (id: string) => Object.values(state.risks).filter(r => r.contactIds.includes(id) || r.notifyIds.includes(id));
  const set = (id: string, patch: Partial<Contact>) => update(d => {
    const c = d.contacts[id] = { ...d.contacts[id], ...patch };
    // the same person in the staff list (4.2) keeps the same name and function
    const p = c.personId ? d.people[c.personId] : undefined;
    if (p && c.category === 'interne') { if (patch.name !== undefined && patch.name.trim()) p.name = patch.name.trim(); if (patch.role !== undefined) p.role = patch.role; }
    if (c.category === 'interne' && !c.personId && c.name.trim() && !c.vacant) syncStaff(d);
  });
  const openSheet = (id: string, moving = false) => { setMove(moving); setEdit(id); };
  const verify = (id: string) => set(id, { verifiedAt: isoDate(new Date()), verifiedBy: author });
  const add = (p: Partial<Contact> = {}) => {
    if (view === 'org') return addInChart({ category: cat, company: cat === 'interne' ? 'Interne' : '', ...p });
    const c = blank(p);
    update(d => { d.contacts[c.id] = c; });
    setOrder([c.id, ...order]);
    setQ(''); setFilter('all'); openSheet(c.id);
  };
  // from the org chart: the new card appears at its place and its sheet opens
  const addInChart = (p: Partial<Contact>) => {
    const c = blank(p);
    update(d => { d.contacts[c.id] = c; });
    setOrder([c.id, ...order]);
    openSheet(c.id);
  };
  // drop of a card onto its manager (or onto the top zone): the person follows the manager's category and organisation
  const linkTo = (id: string, bossId: string | undefined) => {
    const boss = bossId ? state.contacts[bossId] : undefined;
    if (bossId && isUnder(state, bossId, id)) { window.alert(`${contactLabel(state.contacts[bossId])} est déjà sous ${contactLabel(state.contacts[id])} : impossible de l'en faire le responsable.`); return; }
    update(d => {
      const c = d.contacts[id];
      if (!c) return;
      c.reportsTo = boss?.id;
      if (boss) { c.category = boss.category; if (boss.category !== 'interne' && boss.company) c.company = boss.company; }
    });
  };
  // old example contacts get the links of the new example, the missing people are added; nothing else changes
  const upgradeExample = () => {
    const xs = exampleContacts();
    update(d => xs.forEach(x => {
      const c = d.contacts[x.id];
      if (!c) { d.contacts[x.id] = x; return; }
      d.contacts[x.id] = { ...c, category: x.category, role: x.role, reportsTo: c.reportsTo ?? x.reportsTo, backupId: c.backupId ?? x.backupId, hours: c.hours ?? x.hours, reference: c.reference ?? x.reference, phone2: c.phone2 ?? x.phone2, vital: c.vital ?? x.vital };
    }));
    setOrder(sortIds([...all, ...xs.filter(x => !state.contacts[x.id])]));
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
      // gone from the org chart: gone from the staff list too (kept in the history of the skills)
      if (c.personId && d.people[c.personId]) d.people[c.personId].active = false;
    });
    setEdit('');
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
      {view === 'org' && <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>}
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
          <Button onClick={() => window.print()}><Printer size={14} />{view === 'org' ? 'Imprimer l\'organigramme (A4 paysage)' : 'Imprimer la liste'}</Button>
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
            {([['org', 'Organigramme'], ['liste', 'Liste']] as [View, string][]).map(([v, l]) => (
              <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)}
                className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-semibold ${view === v ? 'border-delacour-primary text-delacour-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
            ))}
          </div>
          {view === 'org' ? <OrgView state={state} cat={cat} setCat={setCat} onEdit={id => openSheet(id)} onMove={id => openSheet(id, true)} onAdd={addInChart} onLink={linkTo} nav={nav}
            setDirector={id => update(d => { d.params.directorId = id || undefined; })} upgrade={upgradeExample} /> : <>
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
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">{rows.map(c => (
                        <Line key={c.id} c={c} focused={focus === c.id} dup={dupIds.has(c.id)} uses={usedBy(c.id).length} onOpen={() => openSheet(c.id)} verify={() => verify(c.id)} />
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
      {edit && state.contacts[edit] && (
        <ContactSheet c={state.contacts[edit]} state={state} teamView={teamView} move={move} nav={nav} onClose={() => setEdit('')}
          set={p => set(edit, p)} verify={() => verify(edit)} remove={() => remove(state.contacts[edit])} />
      )}
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

// One line per contact: who, what for, the number to tap, the checks; the sheet opens on a click (light with 100 contacts)
function Line({ c, focused, dup, uses, onOpen, verify }: { c: Contact; focused: boolean; dup: boolean; uses: number; onOpen(): void; verify(): void }) {
  const stale = toCheck(c);
  return (
    <li id={`ct-${c.id}`} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-2 text-[11px] ${focused ? 'bg-amber-50' : ''}`}>
      <button type="button" onClick={onOpen} className="min-w-[12rem] flex-1 text-left">
        <span className="block text-xs font-semibold text-slate-900 hover:underline">{c.vacant ? `Poste à pourvoir${c.role ? ` : ${c.role}` : ''}` : contactLabel(c)}</span>
        <span className="block text-slate-600">{[c.role, c.always ? '24 h/24' : c.hours, c.reference && `donner : ${c.reference}`].filter(Boolean).join(' · ')}</span>
      </button>
      <span className="flex flex-wrap items-center gap-1">
        {c.vital && <span className="rounded bg-red-700 px-1 font-semibold leading-4 text-white">Vital</span>}
        {dup && <span className="rounded bg-amber-100 px-1 font-semibold leading-4 text-amber-900">Doublon</span>}
        {uses > 0 && <span className="rounded bg-slate-100 px-1 leading-4 text-slate-700">{uses} Plan{uses > 1 ? 's' : ''} B</span>}
      </span>
      {c.phone ? <a href={`tel:${telOf(c.phone)}`} className="whitespace-nowrap font-mono text-xs font-bold text-delacour-primary hover:underline">{c.phone}</a> : <span className="text-slate-400">sans numéro</span>}
      {c.email && <a href={`mailto:${c.email}`} className="text-delacour-primary hover:underline" aria-label={`Écrire à ${contactLabel(c)}`}><Mail size={13} /></a>}
      <button type="button" onClick={verify} className={`inline-flex items-center gap-1 ${stale ? 'font-semibold text-amber-800' : 'text-slate-500'} hover:underline`} title="Le numéro répond : vérifié aujourd'hui">
        <CheckCircle2 size={13} />{c.verifiedAt ? frDate(c.verifiedAt) : 'jamais vérifié'}
      </button>
    </li>
  );
}

// "Organigramme": one tree per category. Inside the company, one tree; outside, one tree per organisation
// (Client A: director, then buyer, then assistant). Links are made by dragging a card onto its manager,
// by the + of a card (adds someone under it), or in the card sheet ("Rattaché à", also reached by "Déplacer").
// Branches fold, a search centres the person found, and "Chemin d'appel" lights who to call and who is above.
function OrgView({ state, cat, setCat, onEdit, onMove, onAdd, onLink, setDirector, upgrade, nav }: {
  state: State; cat: ContactCategory; setCat(c: ContactCategory): void; onEdit(id: string): void; onMove(id: string): void;
  onAdd(p: Partial<Contact>): void; onLink(id: string, bossId: string | undefined): void;
  setDirector(id: string): void; upgrade(): void; nav?: Nav;
}) {
  const [drag, setDrag] = useState('');
  const [q, setQ] = useState('');
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [pathMode, setPathMode] = useState(false);
  const [pathOf, setPathOf] = useState('');
  const count = (k: ContactCategory) => Object.values(state.contacts).filter(c => c.category === k).length;
  const inside = cat === 'interne';
  const groups = inside ? [{ company: state.settings.companyName || 'Interne', roots: orgTree(state, 'interne', state.params.directorId) }] : orgGroups(state, cat);
  const pending = groups.flatMap(g => pendingOf(g.roots));
  const internal = Object.values(state.contacts).filter(c => c.category === 'interne');
  const noTop = inside && groups[0].roots.length > 1;
  // an annuaire filled with the first example: offer the org charts of the new one, without touching anything else
  const oldExample = !!state.contacts.ct_demo_dirigeant && !state.contacts.ct_demo_prod;
  // search: the people found, and their managers unfolded so that they are visible
  const words = norm(q).split(/\s+/).filter(Boolean);
  const found = words.length ? Object.values(state.contacts).filter(c => c.category === cat && words.every(w => norm([c.name, c.role, c.company, c.phone].join(' ')).includes(w))) : [];
  const open = new Set(found.flatMap(c => managersOf(state, c).map(m => m.id)));
  const fold = new Set([...folded].filter(id => !open.has(id)));
  // once the typing stops, the first person found is brought to the middle of the screen
  useEffect(() => {
    if (!found[0]) return;
    const id = found[0].id;
    const timer = setTimeout(() => document.getElementById(`org-${id}`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }), 400);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = pathMode && pathOf ? state.contacts[pathOf] : undefined;
  const calls = target ? chainOf(state, target).chain : [];
  const bosses = target ? managersOf(state, target) : [];
  const lit = target ? new Set([...calls, ...bosses].map(c => c.id)) : null;
  const teams = groups.flatMap(g => g.roots.flatMap(r => r.children)).filter(n => n.children.length).map(n => n.c.id);
  const ctx: TreeCtx = {
    state, drag, setDrag, onAdd, onLink, onMove, fold, found: new Set(found.map(c => c.id)), lit,
    onOpen: id => (pathMode ? setPathOf(id) : onEdit(id)),
    toggle: id => { const f = new Set(folded); if (f.has(id)) f.delete(id); else f.add(id); setFolded(f); },
  };
  const addOrg = () => {
    const company = window.prompt(`Nom de l'organisation (${categoryLabel(cat).toLowerCase()}) :`)?.trim();
    if (company) onAdd({ category: cat, company });
  };
  const last = Object.values(state.logs || {}).filter(l => l.kind === 'contact').sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5 print:hidden">
        {CATEGORIES.map(k => (
          <button key={k.key} type="button" onClick={() => { setCat(k.key); setPathOf(''); }} aria-pressed={cat === k.key}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cat === k.key ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {k.label} <span className="opacity-75">{count(k.key)}</span>
          </button>
        ))}
      </div>
      <p className="hidden text-xs font-bold print:block">{state.settings.companyName ? `${state.settings.companyName} · ` : ''}Organigramme : {categoryLabel(cat)}, imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-8`} value={q} placeholder="Chercher une personne, une fonction, un numéro…" aria-label="Chercher dans l'organigramme" onChange={e => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setFolded(new Set(teams))} disabled={!teams.length}>Replier les équipes</Button>
        <Button onClick={() => setFolded(new Set())} disabled={!folded.size}>Tout déplier</Button>
        <Button kind={pathMode ? 'primary' : 'secondary'} aria-pressed={pathMode} onClick={() => { setPathMode(!pathMode); setPathOf(''); }}>Chemin d'appel</Button>
        {inside
          ? <Button onClick={() => onAdd({ category: 'interne', company: 'Interne' })}><Plus size={14} />Ajouter une personne</Button>
          : <Button onClick={addOrg}><Plus size={14} />Ajouter une organisation</Button>}
      </div>
      <p className="text-[11px] text-slate-500 print:hidden">
        {pathMode ? 'Chemin d\'appel : cliquez sur une personne pour voir qui appeler et dans quel ordre, et qui est au-dessus d\'elle.'
          : 'Pour rattacher une personne, glissez sa carte sur celle de son responsable, ou utilisez « Déplacer » sur la carte. Le + ajoute quelqu\'un en dessous ; un clic sur la carte ouvre sa fiche.'}
        {last && <> Mis à jour le {frDate(last.at.slice(0, 10))}{last.by ? ` par ${last.by}` : ''}.</>}
      </p>
      {words.length > 0 && <p className="text-[11px] font-semibold text-slate-700 print:hidden">{found.length ? `${found.length} personne(s) trouvée(s), surlignée(s) dans l'organigramme.` : 'Personne ne correspond dans cette catégorie.'}</p>}
      {target && (
        <div className="rounded-lg border border-delacour-gold bg-amber-50/40 px-3 py-2 text-[11px] text-slate-800">
          <p><strong>Appeler {short(target)}</strong>{target.phone && <> au <a href={`tel:${telOf(target.phone)}`} className="font-mono font-bold">{target.phone}</a></>}
            {calls.slice(1).map(c => <span key={c.id}>, sinon <strong>{short(c)}</strong>{c.phone && <> au <a href={`tel:${telOf(c.phone)}`} className="font-mono font-bold">{c.phone}</a></>}</span>)}.</p>
          {bosses.length > 0 && <p>Au-dessus : {bosses.map(short).join(', puis ')}.</p>}
        </div>
      )}
      {oldExample && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 print:hidden">
          <span>Votre annuaire contient l'exemple de la première version, sans organigramme. Le nouvel exemple compte 34 salariés et des organisations extérieures en cascade.</span>
          <Button kind="primary" onClick={upgrade}>Compléter avec le nouvel exemple</Button>
        </div>
      )}
      {noTop && (
        <label className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 print:hidden">
          Qui est le dirigeant, en haut de l'organigramme ?
          <select className={`${inputCls} w-auto`} value={state.params.directorId || ''} onChange={e => setDirector(e.target.value)}>
            <option value="">Choisir…</option>
            {internal.sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))).map(c => <option key={c.id} value={c.id}>{c.name || contactLabel(c)}{c.role ? ` (${c.role})` : ''}</option>)}
          </select>
        </label>
      )}
      {pending.length > 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 print:hidden">
          <strong>{pending.length > 1 ? `${pending.length} personnes à rattacher` : '1 personne à rattacher'}</strong> (trait en pointillé) : glissez chaque carte sur celle de son responsable, ou « Déplacer ».{' '}
          {pending.map((c, i) => <span key={c.id}>{i ? ', ' : ''}<button type="button" className="font-semibold underline decoration-dotted" onClick={() => onMove(c.id)}>{c.name || contactLabel(c)}</button></span>)}
        </p>
      )}
      {drag && (
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onLink(drag, undefined); setDrag(''); }}
          className="rounded-lg border-2 border-dashed border-delacour-gold bg-amber-50/50 px-3 py-2 text-center text-[11px] font-semibold text-slate-700 print:hidden">
          Déposer ici pour mettre la personne en haut, sans responsable
        </div>
      )}
      {!groups.some(g => g.roots.length) && <p className="py-6 text-center text-[11px] text-slate-500">Personne dans cette catégorie pour l'instant.</p>}
      {groups.filter(g => g.roots.length).map(g => (
        <section key={g.company} className="break-inside-avoid rounded-lg border border-slate-200 p-2">
          {!inside && (
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900">{g.company}</h4>
              <span className="flex flex-wrap items-center gap-3 print:hidden">
                <OrgLinks state={state} company={g.company} nav={nav} />
                <button type="button" className={`${link} text-[11px]`} onClick={() => onAdd({ category: cat, company: g.company === 'Sans société' ? '' : g.company })}><Plus size={13} />Personne chez {g.company}</button>
              </span>
            </div>
          )}
          <FitTree roots={g.roots} ctx={ctx} />
        </section>
      ))}
    </div>
  );
}

// An outside organisation opens its record in the other tools: supplier sheet (3.1), quotes (2.1), complaints (2.3)
function OrgLinks({ state, company, nav }: { state: State; company: string; nav?: Nav }) {
  if (!nav) return null;
  const k = orgKey(company);
  const supplier = Object.values(state.suppliers).find(x => orgKey(x.name) === k);
  const quotes = Object.values(state.quotes).filter(x => orgKey(x.client) === k).sort((a, b) => (a.date < b.date ? 1 : -1));
  const complaints = Object.values(state.complaints).filter(x => orgKey(x.client) === k).sort((a, b) => (a.at < b.at ? 1 : -1));
  const btn = `${link} text-[11px]`;
  return <>
    {supplier && <button type="button" className={btn} onClick={() => nav.tool('3.1', supplier.id)}>Fiche fournisseur (3.1)</button>}
    {quotes.length > 0 && <button type="button" className={btn} onClick={() => nav.tool('2.1', quotes[0].id)}>{quotes.length} devis (2.1)</button>}
    {complaints.length > 0 && <button type="button" className={btn} onClick={() => nav.tool('2.3', complaints[0].id)}>{complaints.length > 1 ? `${complaints.length} réclamations` : '1 réclamation'} (2.3)</button>}
  </>;
}

interface TreeCtx {
  state: State; drag: string; setDrag(id: string): void; onOpen(id: string): void; onMove(id: string): void;
  onAdd(p: Partial<Contact>): void; onLink(id: string, bossId: string | undefined): void;
  fold: Set<string>; toggle(id: string): void; found: Set<string>; lit: Set<string> | null;
}

// The tree is drawn at real size (text readable, 11 px); when wider than the screen, "Voir tout l'organigramme" shrinks it to the width
function FitTree({ roots, ctx }: { roots: OrgNode[]; ctx: TreeCtx }) {
  const box = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLUListElement>(null);
  const [fit, setFit] = useState(false);
  const [scale, setScale] = useState(1);
  const applied = useRef(1);
  useLayoutEffect(() => {
    // natural width = drawn width / zoom in use, so that the measure does not depend on itself
    const measure = () => {
      if (!box.current || !tree.current) return;
      const natural = tree.current.getBoundingClientRect().width / applied.current;
      setScale(Math.min(1, box.current.clientWidth / Math.max(1, natural)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (tree.current) ro.observe(tree.current);
    return () => ro.disconnect();
  }, [roots]);
  const z = fit ? Math.max(0.25, scale) : 1;
  applied.current = z;
  // the top person is in the middle of a wide tree: open the scroll there
  useLayoutEffect(() => { const b = box.current; if (b) b.scrollLeft = (b.scrollWidth - b.clientWidth) / 2; }, [z]);
  return (
    <div className="space-y-1">
      {scale < 0.98 && (
        <div className="flex justify-end print:hidden">
          <button type="button" className={`${link} text-[11px]`} onClick={() => setFit(!fit)}>{fit ? 'Taille réelle' : 'Voir tout l\'organigramme'}</button>
        </div>
      )}
      <div ref={box} className="overflow-x-auto pb-2">
        <ul ref={tree} className="org mx-auto w-max" style={{ zoom: z }}>{roots.map(n => <Node key={n.c.id} n={n} ctx={ctx} />)}</ul>
      </div>
    </div>
  );
}

const headcount = (n: OrgNode): number => n.children.reduce((a, k) => a + 1 + headcount(k), 0);

// A person, then the people under them, in cascade: every link to the manager is drawn. A folded branch shows its headcount.
function Node({ n, ctx }: { n: OrgNode; ctx: TreeCtx }) {
  const folded = ctx.fold.has(n.c.id);
  return (
    <li className={n.pending ? 'pending' : undefined}>
      <OrgCard c={n.c} ctx={ctx} pending={n.pending} team={n.children.length ? headcount(n) : 0} folded={folded} />
      {n.children.length > 0 && !folded && <ul>{n.children.map(k => <Node key={k.c.id} n={k} ctx={ctx} />)}</ul>}
    </li>
  );
}

// Every card has the same frame and shows its texts in full: name, function, number, who replaces, and the badges
function OrgCard({ c, ctx, pending, team, folded }: { c: Contact; ctx: TreeCtx; pending?: boolean; team: number; folded: boolean }) {
  const [over, setOver] = useState(false);
  const backup = c.backupId ? ctx.state.contacts[c.backupId] : undefined;
  // same organisation: the name is enough
  const absent = backup ? (backup.company === c.company && backup.name ? backup.name : short(backup)) : deputiesFromPowers(ctx.state, c)[0];
  const info = staffInfo(ctx.state, c);
  const keyOf = [...info.skills, ...info.powers];
  const contract = CONTRACTS.find(x => x.key && x.key === c.contract)?.label;
  const dim = ctx.lit && !ctx.lit.has(c.id);
  const hit = ctx.found.has(c.id) || (ctx.lit?.has(c.id) ?? false);
  const badge = 'rounded px-1 text-[11px] font-semibold leading-4';
  return (
    <div id={`org-${c.id}`} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; ctx.setDrag(c.id); }} onDragEnd={() => { ctx.setDrag(''); setOver(false); }}
      onDragOver={e => { if (ctx.drag && ctx.drag !== c.id) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (ctx.drag && ctx.drag !== c.id) ctx.onLink(ctx.drag, c.id); ctx.setDrag(''); }}
      className={`relative flex min-h-[13rem] w-44 cursor-grab flex-col items-center gap-0.5 rounded-md border px-2 pb-1.5 pt-1.5 text-center text-[11px] shadow-sm active:cursor-grabbing ${c.vacant ? 'border-dashed border-slate-400 bg-slate-50' : info.absentUntil ? 'border-slate-300 bg-slate-100' : 'border-slate-300 bg-white'} ${over || hit ? 'ring-2 ring-delacour-gold' : ''} ${ctx.drag === c.id || dim ? 'opacity-40' : ''}`}>
      <div className="flex min-h-[1rem] w-full flex-wrap justify-center gap-1 pr-4">
        {c.vital && <span className={`${badge} bg-red-700 text-white`}>Vital</span>}
        {pending && <span className={`${badge} border border-dashed border-slate-500 text-slate-700`}>À rattacher</span>}
        {contract && <span className={`${badge} bg-slate-200 text-slate-800`}>{contract}</span>}
        {keyOf.length > 0 && <span className={`${badge} bg-slate-800 text-white`} title={`Seul à tenir : ${keyOf.join(', ')}`}>Personne clé</span>}
      </div>
      <button type="button" title="Ajouter une personne sous elle" aria-label={`Ajouter une personne sous ${contactLabel(c)}`}
        onClick={() => ctx.onAdd({ category: c.category, company: c.company, reportsTo: c.id })}
        className="absolute right-0.5 top-0.5 rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-delacour-primary print:hidden"><Plus size={14} /></button>
      <button type="button" onClick={() => ctx.onOpen(c.id)} className="flex w-full flex-col items-center gap-1" aria-label={`Ouvrir la fiche de ${contactLabel(c)}`}>
        <UserRound size={28} strokeWidth={1.6} className={c.vacant ? 'text-slate-400' : 'text-slate-500'} aria-hidden />
        <span className={`w-full break-words rounded-xl px-2 py-0.5 font-bold leading-tight ${c.vacant ? 'border border-dashed border-slate-500 bg-white text-slate-700' : 'bg-delacour-primary text-white'}`}>{c.vacant ? 'Poste à pourvoir' : c.name || c.company || 'Sans nom'}</span>
        {c.role && <span className="w-full break-words leading-tight text-slate-700">{c.role}</span>}
      </button>
      {c.phone && <a href={`tel:${telOf(c.phone)}`} className="whitespace-nowrap font-mono font-bold text-slate-900 hover:underline">{c.phone}</a>}
      {info.absentUntil && <span className="w-full break-words font-semibold leading-tight text-amber-800">Absent jusqu'au {frDate(info.absentUntil)}</span>}
      {!c.vacant && <span className={`w-full break-words leading-tight ${info.absentUntil ? 'font-semibold text-slate-900' : absent ? 'text-slate-600' : 'font-semibold text-amber-800'}`}>{info.absentUntil ? 'Remplacé par' : 'Si absent'} : {absent || 'personne'}</span>}
      {toCheck(c) && !c.vacant && <span className="font-semibold leading-tight text-amber-800">Numéro à vérifier</span>}
      <div className="mt-auto flex w-full flex-wrap justify-center gap-x-3 pt-0.5 print:hidden">
        <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => ctx.onMove(c.id)}>Déplacer</button>
        {team > 0 && <button type="button" className="font-semibold text-delacour-primary hover:underline" aria-expanded={!folded} onClick={() => ctx.toggle(c.id)}>{folded ? `Déplier (${team})` : 'Replier'}</button>}
      </div>
    </div>
  );
}

// The sheet of one contact, opened from the org chart and from the list
function ContactSheet({ c, state, teamView, move, nav, onClose, set, verify, remove }: {
  c: Contact; state: State; teamView: boolean; move: boolean; nav?: Nav; onClose(): void; set(p: Partial<Contact>): void; verify(): void; remove(): void;
}) {
  const others = Object.values(state.contacts).filter(x => x.id !== c.id).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b)));
  const bosses = others.filter(x => x.category === c.category && !isUnder(state, x.id, c.id));
  const canDelete = !teamView || state.params.teamCanDelete;
  const inside = c.category === 'interne';
  const info = staffInfo(state, c);
  return (
    <Modal title={c.vacant ? `Poste à pourvoir${c.role ? ` : ${c.role}` : ''}` : contactLabel(c)} subtitle={categoryLabel(c.category)} onClose={onClose}
      footer={<>{canDelete && <Button kind="danger" className="mr-auto" onClick={remove}><Trash2 size={14} />Supprimer</Button>}<Button kind="primary" onClick={onClose}>Fermer</Button></>}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Rattaché à (son responsable)">
            <select className={`${inputCls} ${move ? 'ring-2 ring-delacour-gold' : ''}`} autoFocus={move} value={c.reportsTo || ''} onChange={e => set({ reportsTo: e.target.value || undefined })}>
              <option value="">Personne : en haut de l'organigramme</option>
              {bosses.map(x => <option key={x.id} value={x.id}>{contactLabel(x)}{x.role ? ` (${x.role})` : ''}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Nom"><input className={inputCls} autoFocus={!move && !c.name && !c.vacant} disabled={c.vacant} value={c.vacant ? '' : c.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Fonction"><input className={inputCls} value={c.role} onChange={e => set({ role: e.target.value })} /></Field>
        <Field label="Société ou organisation"><input className={inputCls} value={c.company} onChange={e => set({ company: e.target.value })} /></Field>
        <Field label="Catégorie">
          <select className={inputCls} value={c.category} onChange={e => set({ category: e.target.value as ContactCategory, reportsTo: undefined })}>{CATEGORIES.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        </Field>
        {inside && <Field label="Contrat">
          <select className={inputCls} value={c.contract || ''} onChange={e => set({ contract: e.target.value as Contact['contract'] })}>{CONTRACTS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        </Field>}
        <Field label="Si absent ou sans réponse, appeler">
          <select className={inputCls} value={c.backupId || ''} onChange={e => set({ backupId: e.target.value || undefined })}>
            <option value="">Personne</option>
            {others.map(x => <option key={x.id} value={x.id}>{contactLabel(x)}</option>)}
          </select>
        </Field>
        <Field label="Téléphone"><input className={`${inputCls} font-mono`} inputMode="tel" value={c.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Autre numéro (standard, astreinte)"><input className={`${inputCls} font-mono`} inputMode="tel" value={c.phone2 || ''} onChange={e => set({ phone2: e.target.value })} /></Field>
        <Field label="E-mail"><input className={inputCls} type="email" inputMode="email" value={c.email} onChange={e => set({ email: e.target.value })} /></Field>
        <Field label="Horaires"><input className={inputCls} disabled={c.always} placeholder="lun-ven 8 h-18 h" value={c.always ? '24 h/24' : c.hours || ''} onChange={e => set({ hours: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Référence à donner à l'appel"><input className={inputCls} placeholder="N° de contrat, n° client" value={c.reference || ''} onChange={e => set({ reference: e.target.value })} /></Field></div>
        {!teamView && <div className="sm:col-span-2"><Field label="Mot de passe ou consigne à dire (réservé à la direction)"><input className={inputCls} value={c.secret || ''} onChange={e => set({ secret: e.target.value })} /></Field></div>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-700 sm:col-span-2">
          <label className="flex items-center gap-1.5 font-semibold text-red-800"><input type="checkbox" checked={!!c.vital} onChange={e => set({ vital: e.target.checked })} /><Pin size={12} />Vital</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={c.always} onChange={e => set({ always: e.target.checked })} />Joignable 24 h/24</label>
          {inside && <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!c.vacant} onChange={e => set({ vacant: e.target.checked })} />Poste à pourvoir</label>}
          <span>{c.verifiedAt ? `Vérifié le ${frDate(c.verifiedAt)}${c.verifiedBy ? ` par ${c.verifiedBy}` : ''}` : 'Jamais vérifié'}</span>
          <button type="button" className={link} onClick={verify}><CheckCircle2 size={13} />Vérifié aujourd'hui</button>
          {c.phone && <a href={`tel:${telOf(c.phone)}`} className={link}><Phone size={13} />Appeler</a>}
          {c.email && <a href={`mailto:${c.email}`} className={link}><Mail size={13} />Écrire</a>}
        </div>
        {inside && !c.vacant && (
          <div className="space-y-0.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700 sm:col-span-2">
            <p>{info.absentUntil ? <strong className="text-amber-800">Absent jusqu'au {frDate(info.absentUntil)}.</strong> : 'Présent aujourd\'hui.'} Les congés se saisissent dans la polyvalence (4.2).</p>
            {info.skills.length > 0 && <p><strong>Seul autonome sur :</strong> {info.skills.join(', ')}.</p>}
            {info.powers.length > 0 && <p><strong>Pouvoir sans suppléant :</strong> {info.powers.join(', ')}.</p>}
            {nav && <p className="flex flex-wrap gap-3"><button type="button" className={link} onClick={() => nav.tool('4.2')}>Polyvalence (4.2)</button><button type="button" className={link} onClick={() => nav.tool('4.1')}>Suppléances (4.1)</button></p>}
          </div>
        )}
      </div>
    </Modal>
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
