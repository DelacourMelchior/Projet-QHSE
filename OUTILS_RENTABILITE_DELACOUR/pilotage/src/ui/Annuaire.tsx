// Tool 1.3 "Annuaire": the numbers to call when something breaks.
// Two views: "Organigramme" (the company and each outside organisation, as trees, edited by drag and drop) and "Liste".
// The reflex cards of the Plans B (tool 1.2) take their contacts and chains from here.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Contact2, CreditCard, Download, Mail, Phone, Pin, Plus, Printer, Search, Trash2, UserRound, MoreHorizontal } from 'lucide-react';
import type { Contact, ContactCategory, Org, State } from '../domain/types';
import { CATEGORIES, CONTRACTS, orgNames, orgOf, candidates, managersOf, orgKey, staffInfo, syncStaff, categoryLabel, chainIssues, chainOf, contactLabel, deputiesFromPowers, duplicates, isUnder, orgGroups, orgTree, pendingOf, telOf,  toCheck, vcardOf, vitalContacts, type OrgNode } from '../domain/contacts';
import { pocketCardPdf } from '../domain/directoryPdf';
import { exampleContacts, exampleOrgs } from '../domain/riskTemplates';
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
  const [orgEdit, setOrgEdit] = useState('');
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
  // "Ajouter" offers three clear choices, whatever the screen shows
  const addPerson = () => { setView('org'); setCat('interne'); addInChart({ category: 'interne', company: 'Interne' }); };
  const outside = cat === 'interne' ? 'client' as ContactCategory : cat;
  const addOrg = () => { setView('org'); setCat(outside); newOrg(outside); };
  const addOutsideContact = () => { setView('org'); setCat(outside); addInChart({ category: outside, company: '' }); };
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
    update(d => { exampleOrgs().forEach(o => { if (!orgOf(d, o.name)) d.orgs[o.id] = o; }); });
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
  // an organisation opened by its name gets its record (switchboard, address…) the first time
  const openOrg = (name: string, category: ContactCategory) => {
    const found = orgOf(state, name);
    if (found) return setOrgEdit(found.id);
    const o: Org = { id: `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: name === 'Sans société' ? '' : name, category, phone: '', email: '', address: '', reference: '' };
    update(d => { d.orgs[o.id] = o; });
    setOrgEdit(o.id);
  };
  // renaming an organisation renames it on the cards of its people
  const setOrg = (id: string, patch: Partial<Org>) => update(d => {
    const before = d.orgs[id];
    if (!before) return;
    const after = d.orgs[id] = { ...before, ...patch };
    if (patch.name !== undefined && before.name.trim()) Object.values(d.contacts).forEach(c => { if (c.category === before.category && orgKey(c.company) === orgKey(before.name)) c.company = after.name; });
    if (patch.category) Object.values(d.contacts).forEach(c => { if (c.category === before.category && orgKey(c.company) === orgKey(after.name)) { c.category = patch.category!; c.reportsTo = c.reportsTo && d.contacts[c.reportsTo]?.company === c.company ? c.reportsTo : undefined; } });
  });
  const removeOrg = (o: Org) => {
    const people = Object.values(state.contacts).filter(c => c.category === o.category && o.name.trim() && orgKey(c.company) === orgKey(o.name));
    if (!window.confirm(people.length ? `Supprimer ${o.name || 'cette organisation'} et ses ${people.length} personne(s) de l'annuaire ?` : `Supprimer ${o.name || 'cette organisation'} ?`)) return;
    const ids = new Set(people.map(c => c.id));
    update(d => {
      delete d.orgs[o.id];
      ids.forEach(id => delete d.contacts[id]);
      Object.values(d.risks).forEach(r => { r.contactIds = r.contactIds.filter(x => !ids.has(x)); r.notifyIds = r.notifyIds.filter(x => !ids.has(x)); });
      Object.values(d.contacts).forEach(x => { if (x.backupId && ids.has(x.backupId)) x.backupId = undefined; if (x.reportsTo && ids.has(x.reportsTo)) x.reportsTo = undefined; });
      Object.values(d.suppliers).forEach(x => { if (x.contactId && ids.has(x.contactId)) x.contactId = undefined; });
      Object.values(d.equipments).forEach(x => { if (x.contactId && ids.has(x.contactId)) x.contactId = undefined; });
    });
    setOrgEdit('');
  };
  const newOrg = (category: ContactCategory) => {
    const o: Org = { id: `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: '', category, phone: '', email: '', address: '', reference: '' };
    update(d => { d.orgs[o.id] = o; });
    setOrgEdit(o.id);
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
  const FILTERS: [Filter, string][] = [['all', 'Tous'], ['vital', 'Vitaux'], ['always', 'Joignables 24 h/24'], ['check', 'Numéros à vérifier'], ['dup', 'Doublons']];
  const vcf = () => downloadFile(`Annuaire-${fileSlug(state.settings.companyName || 'crise')}.vcf`, vcardOf(all.filter(c => c.phone || c.email), state.settings.companyName), 'text/vcard');
  const pocket = () => downloadFile('Carte-de-poche.pdf', pocketCardPdf(vitalContacts(state), { company: state.settings.companyName, address: state.params.company?.address || '', access: state.params.siteAccess || '', date: new Date() }), 'application/pdf');
  const cands = candidates(state);

  return (
    <div className="space-y-4">
      {view === 'org' && <style>{'@media print { @page { size: A4 landscape; margin: 10mm; } }'}</style>}
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-sm font-bold text-delacour-primary">Annuaire</h2>
          {all.length > 0 && (
            <div role="tablist" className="flex gap-1 print:hidden">
              {([['org', 'Organigramme'], ['liste', 'Liste']] as [View, string][]).map(([v, l]) => (
                <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${view === v ? 'bg-delacour-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 print:hidden">
            <Checks state={state} dups={dups} onShow={id => openSheet(id)} />
            <More label={<><Plus size={14} />Ajouter</>} primary>
              <Button kind="ghost" onClick={addPerson}>Une personne de l'entreprise</Button>
              <Button kind="ghost" onClick={addOrg}>Une organisation (client, fournisseur, médecine du travail…)</Button>
              <Button kind="ghost" onClick={addOutsideContact}>Un contact dans une organisation</Button>
            </More>
            <More>
              <PasteImport title="Importer des contacts (Outlook, Excel, logiciel)" cols={IMPORT_COLS} onImport={importRows} label="Importer" />
              {cands.length > 0 && <Button kind="ghost" onClick={() => setPick(true)}><Contact2 size={14} />Reprendre des autres outils ({cands.length})</Button>}
              <Button kind="ghost" onClick={vcf} disabled={!all.length}><Download size={14} />Vers les contacts du téléphone</Button>
              <Button kind="ghost" onClick={pocket} disabled={!all.length}><CreditCard size={14} />Carte de poche (PDF)</Button>
              <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
              <p className="max-w-[16rem] px-2 pt-1 text-[11px] leading-snug text-slate-500">Préférez les numéros professionnels et prévenez les personnes concernées (RGPD). Chaque mois, 4 numéros à vérifier arrivent dans « Mes tâches ».</p>
            </More>
          </div>
        </div>

        <SiteLine state={state} update={update} />

        {all.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <p className="text-xs text-slate-500">Aucun contact. Ajoutez le prestataire informatique, la banque, l'assureur, les confrères et les clients à prévenir.</p>
            <Button kind="primary" onClick={fillExamples}>Remplir avec des exemples</Button>
          </div>
        ) : view === 'org' ? (
          <OrgView key={cat} state={state} cat={cat} setCat={setCat} onEdit={id => openSheet(id)} onMove={id => openSheet(id, true)} onAdd={addInChart} onLink={linkTo} nav={nav} onOpenOrg={name => openOrg(name, cat)}
            setDirector={id => update(d => { d.params.directorId = id || undefined; })} upgrade={upgradeExample} />
        ) : <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-8`} value={q} placeholder="Rechercher un nom, une société, un numéro…" aria-label="Rechercher" onChange={e => setQ(e.target.value)} />
            </div>
            <select className={`${inputCls} !w-auto`} value={filter} aria-label="Filtrer" onChange={e => setFilter(e.target.value as Filter)}>
              {FILTERS.map(([f, l]) => { const n = all.filter(pass[f]).length; return (f === 'dup' && !n) ? null : <option key={f} value={f}>{l} ({n})</option>; })}
            </select>
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
      </Card>
      {edit && state.contacts[edit] && (
        <ContactSheet c={state.contacts[edit]} state={state} teamView={teamView} move={move} nav={nav} onClose={() => setEdit('')}
          set={p => set(edit, p)} verify={() => verify(edit)} remove={() => remove(state.contacts[edit])}
          newOrg={name => update(d => { if (!orgOf(d, name)) { const id = `org_${Date.now().toString(36)}`; d.orgs[id] = { id, name, category: d.contacts[edit].category, phone: '', email: '', address: '', reference: '' }; } d.contacts[edit].company = name; })} />
      )}
      {orgEdit && state.orgs[orgEdit] && (
        <OrgSheet o={state.orgs[orgEdit]} state={state} teamView={teamView} nav={nav}
          onClose={() => { const id = orgEdit; const o = state.orgs[id]; if (!o?.name.trim()) update(d => { delete d.orgs[id]; }); else { setView('org'); setCat(o.category); } setOrgEdit(''); }} set={p => setOrg(orgEdit, p)} remove={() => removeOrg(state.orgs[orgEdit])}
          onPerson={id => { setOrgEdit(''); openSheet(id); }}
          onAdd={() => { const o = state.orgs[orgEdit]; setOrgEdit(''); addInChart({ category: o.category, company: o.name }); }} />
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

// The rarely used actions, behind one button
function More({ children, label, primary }: { children: React.ReactNode; label?: React.ReactNode; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[role=dialog]')) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <Button kind={primary ? 'primary' : 'secondary'} aria-expanded={open} aria-label={label ? undefined : 'Plus d\'actions'} onClick={() => setOpen(!open)}>{label || <MoreHorizontal size={16} />}</Button>
      {open && <div onClick={e => { if (primary && (e.target as HTMLElement).closest('button')) setOpen(false); }} className="absolute right-0 z-30 mt-1 flex w-max max-w-[90vw] flex-col items-stretch rounded-lg border border-slate-200 bg-white p-1 shadow-lg [&>button]:justify-start">{children}</div>}
    </div>
  );
}

// Address of the site and how the emergency services get in, on one line (printed on the pocket card and the list)
function SiteLine({ state, update }: { state: State; update(f: (d: State) => void): void }) {
  const address = state.params.company?.address || '';
  const access = state.params.siteAccess || '';
  const [editing, setEditing] = useState(!address);
  if (!editing) return (
    <p className="text-[11px] text-slate-600">
      <span className="font-semibold text-slate-800">Secours :</span> {address}{access ? ` · accès : ${access}` : ''}{' '}
      <button type="button" className="font-semibold text-delacour-primary hover:underline print:hidden" onClick={() => setEditing(true)}>modifier</button>
    </p>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <input className={`${inputCls} min-w-[200px] flex-1`} value={address} placeholder="Adresse du site à donner aux secours" aria-label="Adresse du site pour les secours" onChange={e => update(d => { d.params.company = { siret: '', phone: '', email: '', ...d.params.company, address: e.target.value }; })} />
      <input className={`${inputCls} min-w-[200px] flex-1`} value={access} placeholder="Accès : portail, code, bâtiment" aria-label="Accès pour les secours" onChange={e => update(d => { d.params.siteAccess = e.target.value; })} />
      {address && <Button onClick={() => setEditing(false)}>OK</Button>}
    </div>
  );
}

// What to fix (loops, numbers never checked in a chain, duplicates, vital contacts without backup): one button, the detail on demand
function Checks({ state, dups, onShow }: { state: State; dups: Contact[][]; onShow(id: string): void }) {
  const [open, setOpen] = useState(false);
  const { loops, unchecked } = chainIssues(state);
  const lonely = Object.values(state.contacts).filter(c => c.vital && !c.backupId && c.category !== 'secours');
  const n = loops.length + (unchecked.length ? 1 : 0) + dups.length + (lonely.length ? 1 : 0);
  if (!n) return null;
  const Name = ({ c }: { c: Contact }) => <button type="button" className="font-semibold underline decoration-dotted hover:text-slate-900" onClick={() => onShow(c.id)}>{short(c)}</button>;
  const join = (xs: Contact[], sep = ', ') => xs.map((c, i) => <span key={c.id}>{i ? sep : ''}<Name c={c} /></span>);
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100">
        <AlertTriangle size={13} />{n > 1 ? `${n} points à vérifier` : '1 point à vérifier'}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[min(22rem,90vw)] space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-800 shadow-lg">
          {loops.map((l, i) => <p key={i}>Chaîne d'appel qui boucle : {join(l, ' puis ')}. Changez un relais.</p>)}
          {unchecked.length > 0 && <p>Numéros à vérifier dans une chaîne d'appel : {join(unchecked)}.</p>}
          {dups.map((g, i) => <p key={i}>Même numéro ou même e-mail : {join(g, ' et ')}.</p>)}
          {lonely.length > 0 && <p>Contacts vitaux sans relais : {join(lonely)}.</p>}
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
function OrgView({ state, cat, setCat, onEdit, onMove, onAdd, onLink, setDirector, upgrade, nav, onOpenOrg }: {
  onOpenOrg(name: string): void;
  state: State; cat: ContactCategory; setCat(c: ContactCategory): void; onEdit(id: string): void; onMove(id: string): void;
  onAdd(p: Partial<Contact>): void; onLink(id: string, bossId: string | undefined): void;
  setDirector(id: string): void; upgrade(): void; nav?: Nav;
}) {
  const [drag, setDrag] = useState('');
  const [q, setQ] = useState('');
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
  // once the typing stops, the first person found is brought to the middle of the screen
  useEffect(() => {
    if (!found[0]) return;
    const id = found[0].id;
    const timer = setTimeout(() => document.getElementById(`org-${id}`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }), 400);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const teams = groups.flatMap(g => g.roots.flatMap(r => r.children)).filter(n => n.children.length).map(n => n.c.id);
  // the chart opens with the teams folded: the top of the company fits the screen, each team opens with its button
  const [folded, setFolded] = useState<Set<string>>(() => new Set(teams));
  const fold = new Set([...folded].filter(id => !open.has(id)));
  const ctx: TreeCtx = {
    state, drag, setDrag, onAdd, onLink, fold, found: new Set(found.map(c => c.id)), onOpen: onEdit,
    toggle: id => { const f = new Set(folded); if (f.has(id)) f.delete(id); else f.add(id); setFolded(f); },
  };
  const last = Object.values(state.logs || {}).filter(l => l.kind === 'contact').sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const cats = CATEGORIES;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select className={`${inputCls} !w-auto font-semibold`} value={cat} aria-label="Catégorie" onChange={e => setCat(e.target.value as ContactCategory)}>
          {cats.map(k => <option key={k.key} value={k.key}>{k.label} ({count(k.key)})</option>)}
        </select>
        <div className="relative min-w-[160px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-8`} value={q} placeholder="Chercher…" aria-label="Chercher dans l'organigramme" onChange={e => setQ(e.target.value)} />
        </div>
        {(teams.length > 0 || folded.size > 0) && <Button onClick={() => setFolded(folded.size ? new Set() : new Set(teams))}>{folded.size ? 'Tout déplier' : 'Replier'}</Button>}
        <span className="cursor-help text-slate-400" title={`Glissez une carte sur son responsable pour la rattacher. Le + d'une carte ajoute quelqu'un en dessous ; un clic ouvre la fiche (rattachement, remplaçant, chemin d'appel).${last ? ` Mis à jour le ${frDate(last.at.slice(0, 10))}${last.by ? ` par ${last.by}` : ''}.` : ''}`} aria-label="Aide"><HelpCircle size={16} /></span>
      </div>
      <p className="hidden text-xs font-bold print:block">{state.settings.companyName ? `${state.settings.companyName} · ` : ''}Organigramme : {categoryLabel(cat)}, imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      {words.length > 0 && !found.length && <p className="text-[11px] text-slate-500">Personne ne correspond.</p>}
      {oldExample && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 print:hidden">
          <span>Votre annuaire contient l'exemple de la première version, sans organigramme. Le nouvel exemple compte 34 salariés et des organisations extérieures en cascade.</span>
          <Button kind="primary" onClick={upgrade}>Compléter avec le nouvel exemple</Button>
        </div>
      )}
      {noTop && (
        <label className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 print:hidden">
          Qui est le dirigeant, en haut de l'organigramme ?
          <select className={`${inputCls} !w-auto`} value={state.params.directorId || ''} onChange={e => setDirector(e.target.value)}>
            <option value="">Choisir…</option>
            {internal.sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))).map(c => <option key={c.id} value={c.id}>{c.name || contactLabel(c)}{c.role ? ` (${c.role})` : ''}</option>)}
          </select>
        </label>
      )}
      {pending.length > 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 print:hidden">
          <strong>À rattacher :</strong>{' '}
          {pending.map((c, i) => <span key={c.id}>{i ? ', ' : ''}<button type="button" className="font-semibold underline decoration-dotted" onClick={() => onMove(c.id)}>{c.name || contactLabel(c)}</button></span>)}
        </p>
      )}
      {drag && (
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onLink(drag, undefined); setDrag(''); }}
          className="rounded-lg border-2 border-dashed border-delacour-gold bg-amber-50/50 px-3 py-2 text-center text-[11px] font-semibold text-slate-700 print:hidden">
          Déposer ici pour mettre la personne en haut, sans responsable
        </div>
      )}
      {!groups.length && <p className="py-6 text-center text-[11px] text-slate-500">{inside ? 'Personne pour l\'instant.' : 'Aucune organisation pour l\'instant : « Ajouter une organisation ».'}</p>}
      {groups.filter(g => inside ? g.roots.length : true).map(g => (
        <section key={g.company} className="break-inside-avoid rounded-lg border border-slate-200 p-2">
          {!inside && (
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <button type="button" className="text-xs font-bold text-slate-900 hover:underline" onClick={() => onOpenOrg(g.company)} title="Ouvrir la fiche de l'organisation">{g.company}</button>
              {g.org?.phone && <a href={`tel:${telOf(g.org.phone)}`} className="font-mono text-[11px] font-bold text-slate-700 hover:underline">{g.org.phone}</a>}
              {g.org?.reference && <span className="text-[11px] text-slate-500">donner : {g.org.reference}</span>}
              <span className="ml-auto flex flex-wrap items-center gap-3 print:hidden">
                <OrgLinks state={state} company={g.company} nav={nav} />
                <button type="button" className={`${link} text-[11px]`} onClick={() => onAdd({ category: cat, company: g.company === 'Sans société' ? '' : g.company })}><Plus size={13} />Personne</button>
              </span>
            </div>
          )}
          {g.roots.length ? <FitTree roots={g.roots} ctx={ctx} /> : <p className="py-3 text-center text-[11px] text-slate-500">Aucune personne encore dans cette organisation.</p>}
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
  state: State; drag: string; setDrag(id: string): void; onOpen(id: string): void;
  onAdd(p: Partial<Contact>): void; onLink(id: string, bossId: string | undefined): void;
  fold: Set<string>; toggle(id: string): void; found: Set<string>;
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
      <div ref={box} className="overflow-x-auto overflow-y-hidden pb-4">
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

// Every card has the same frame and shows its texts in full: name, function, number, and who replaces.
// Badges: vital, to attach, absent. The rest is in the sheet.
function OrgCard({ c, ctx, pending, team, folded }: { c: Contact; ctx: TreeCtx; pending?: boolean; team: number; folded: boolean }) {
  const [over, setOver] = useState(false);
  const backup = c.backupId ? ctx.state.contacts[c.backupId] : undefined;
  // same organisation: the name is enough
  const absent = backup ? (backup.company === c.company && backup.name ? backup.name : short(backup)) : deputiesFromPowers(ctx.state, c)[0];
  const away = staffInfo(ctx.state, c).absentUntil;
  const badge = 'rounded px-1 text-[11px] font-semibold leading-4';
  return (
    <div id={`org-${c.id}`} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; ctx.setDrag(c.id); }} onDragEnd={() => { ctx.setDrag(''); setOver(false); }}
      onDragOver={e => { if (ctx.drag && ctx.drag !== c.id) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (ctx.drag && ctx.drag !== c.id) ctx.onLink(ctx.drag, c.id); ctx.setDrag(''); }}
      className={`group relative flex min-h-[10rem] w-44 cursor-grab flex-col items-center gap-0.5 rounded-md border px-2 pb-3 pt-1.5 text-center text-[11px] shadow-sm active:cursor-grabbing ${c.vacant ? 'border-dashed border-slate-400 bg-slate-50' : away ? 'border-slate-300 bg-slate-100' : 'border-slate-300 bg-white'} ${over || ctx.found.has(c.id) ? 'ring-2 ring-delacour-gold' : ''} ${ctx.drag === c.id ? 'opacity-40' : ''}`}>
      <div className="flex min-h-[1rem] w-full flex-wrap justify-center gap-1 px-4">
        {c.vital && <span className={`${badge} bg-red-700 text-white`}>Vital</span>}
        {pending && <span className={`${badge} border border-dashed border-slate-500 text-slate-700`}>À rattacher</span>}
        {away && <span className={`${badge} bg-amber-100 text-amber-900`}>Absent jusqu'au {frDate(away).slice(0, 5)}</span>}
      </div>
      <button type="button" title="Ajouter une personne en dessous" aria-label={`Ajouter une personne sous ${contactLabel(c)}`}
        onClick={() => ctx.onAdd({ category: c.category, company: c.company, reportsTo: c.id })}
        className="absolute right-0.5 top-0.5 rounded p-0.5 text-slate-500 opacity-0 hover:bg-slate-100 hover:text-delacour-primary focus:opacity-100 group-hover:opacity-100 print:hidden [@media(hover:none)]:opacity-100"><Plus size={14} /></button>
      <button type="button" onClick={() => ctx.onOpen(c.id)} className="flex w-full flex-col items-center gap-1" aria-label={`Ouvrir la fiche de ${contactLabel(c)}`}>
        <UserRound size={26} strokeWidth={1.6} className={c.vacant ? 'text-slate-400' : 'text-slate-500'} aria-hidden />
        <span className={`w-full break-words rounded-xl px-2 py-0.5 font-bold leading-tight ${c.vacant ? 'border border-dashed border-slate-500 bg-white text-slate-700' : 'bg-delacour-primary text-white'}`}>{c.vacant ? 'Poste à pourvoir' : c.name || c.company || 'Sans nom'}</span>
        {c.role && <span className="w-full break-words leading-tight text-slate-700">{c.role}</span>}
      </button>
      {c.phone && (
        <span className="inline-flex items-center gap-1">
          <a href={`tel:${telOf(c.phone)}`} className="whitespace-nowrap font-mono font-bold text-slate-900 hover:underline">{c.phone}</a>
          {toCheck(c) && <span className="h-2 w-2 rounded-full bg-amber-500" title="Numéro à vérifier" aria-label="Numéro à vérifier" />}
        </span>
      )}
      {!c.vacant && <span className={`w-full break-words leading-tight ${away ? 'font-semibold text-slate-900' : absent ? 'text-slate-600' : 'text-amber-800'}`}>{away ? 'Remplacé par' : 'Si absent'} : {absent || 'personne'}</span>}
      {team > 0 && (
        <button type="button" aria-expanded={!folded} aria-label={folded ? `Déplier l'équipe (${team})` : 'Replier l\'équipe'} title={folded ? 'Déplier l\'équipe' : 'Replier l\'équipe'} onClick={() => ctx.toggle(c.id)}
          className="absolute -bottom-2.5 left-1/2 z-10 min-w-[1.5rem] -translate-x-1/2 rounded-full border border-slate-400 bg-white px-1.5 text-[11px] font-bold leading-4 text-slate-700 hover:border-delacour-primary hover:text-delacour-primary print:hidden">
          {folded ? `+${team}` : '−'}
        </button>
      )}
    </div>
  );
}

// The sheet of an outside organisation: its switchboard and details, then its people
function OrgSheet({ o, state, teamView, nav, onClose, set, remove, onPerson, onAdd }: {
  o: Org; state: State; teamView: boolean; nav?: Nav; onClose(): void; set(p: Partial<Org>): void; remove(): void; onPerson(id: string): void; onAdd(): void;
}) {
  const people = o.name.trim() ? Object.values(state.contacts).filter(c => c.category === o.category && orgKey(c.company) === orgKey(o.name)).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b))) : [];
  const canDelete = !teamView || state.params.teamCanDelete;
  return (
    <Modal title={o.name || 'Nouvelle organisation'} subtitle={categoryLabel(o.category)} onClose={onClose}
      footer={<>{canDelete && <Button kind="danger" className="mr-auto" onClick={remove}><Trash2 size={14} />Supprimer</Button>}<Button kind="primary" onClick={onClose}>Fermer</Button></>}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field label="Nom"><input className={inputCls} autoFocus={!o.name} value={o.name} placeholder="Client A, Aciers du Rhône…" onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Catégorie">
          <select className={inputCls} value={o.category} onChange={e => set({ category: e.target.value as ContactCategory })}>{CATEGORIES.filter(x => x.key !== 'interne').map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        </Field>
        <Field label="Standard"><input className={`${inputCls} font-mono`} inputMode="tel" value={o.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="E-mail"><input className={inputCls} type="email" inputMode="email" value={o.email} onChange={e => set({ email: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Adresse"><input className={inputCls} value={o.address} onChange={e => set({ address: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Référence à donner à l'appel"><input className={inputCls} placeholder="Notre n° client, n° de contrat" value={o.reference} onChange={e => set({ reference: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Note"><input className={inputCls} value={o.note || ''} onChange={e => set({ note: e.target.value })} /></Field></div>
        <div className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">Personnes ({people.length})</span>
            <button type="button" className={`${link} text-[11px]`} disabled={!o.name.trim()} onClick={onAdd}><Plus size={13} />Ajouter une personne</button>
          </div>
          {people.length ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[11px]">
              {people.map(c => (
                <li key={c.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <button type="button" className="flex-1 text-left font-semibold hover:underline" onClick={() => onPerson(c.id)}>{c.name || 'Sans nom'}{c.role ? <span className="font-normal text-slate-600"> · {c.role}</span> : ''}</button>
                  {c.phone && <a href={`tel:${telOf(c.phone)}`} className="font-mono font-bold text-delacour-primary hover:underline">{c.phone}</a>}
                </li>
              ))}
            </ul>
          ) : <p className="text-[11px] text-slate-500">{o.name.trim() ? 'Aucune personne encore.' : 'Donnez un nom à l\'organisation, puis ajoutez ses personnes.'}</p>}
        </div>
        {nav && o.name.trim() && <p className="flex flex-wrap gap-3 sm:col-span-2"><OrgLinks state={state} company={o.name} nav={nav} /></p>}
      </div>
    </Modal>
  );
}

// The sheet of one contact, opened from the org chart and from the list
function ContactSheet({ c, state, teamView, move, nav, onClose, set, verify, remove, newOrg }: {
  c: Contact; state: State; teamView: boolean; move: boolean; nav?: Nav; onClose(): void; set(p: Partial<Contact>): void; verify(): void; remove(): void; newOrg(name: string): void;
}) {
  const orgs = orgNames(state, c.category);
  const inside = c.category === 'interne';
  const others = Object.values(state.contacts).filter(x => x.id !== c.id).sort((a, b) => contactLabel(a).localeCompare(contactLabel(b)));
  const bosses = others.filter(x => x.category === c.category && !isUnder(state, x.id, c.id));
  const canDelete = !teamView || state.params.teamCanDelete;
  const info = staffInfo(state, c);
  const calls = chainOf(state, c).chain;
  const above = managersOf(state, c);
  return (
    <Modal title={c.vacant ? `Poste à pourvoir${c.role ? ` : ${c.role}` : ''}` : contactLabel(c)} subtitle={categoryLabel(c.category)} onClose={onClose}
      footer={<>{canDelete && <Button kind="danger" className="mr-auto" onClick={remove}><Trash2 size={14} />Supprimer</Button>}<Button kind="primary" onClick={onClose}>Fermer</Button></>}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {!c.vacant && (calls.length > 1 || above.length > 0) && (
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-800 sm:col-span-2">
            {calls.length > 1 && <p><strong>Chemin d'appel :</strong> {calls.map((x, i) => <span key={x.id}>{i ? ', sinon ' : ''}{short(x)}{x.phone && <> <a href={`tel:${telOf(x.phone)}`} className="font-mono font-semibold text-delacour-primary">{x.phone}</a></>}</span>)}.</p>}
            {above.length > 0 && <p><strong>Au-dessus :</strong> {above.map(short).join(', puis ')}.</p>}
          </div>
        )}
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
        {!inside && (
          <Field label="Organisation">
            <select className={inputCls} value={orgs.find(n => orgKey(n) === orgKey(c.company)) || ''} onChange={e => {
              if (e.target.value === '__new') { const name = window.prompt('Nom de la nouvelle organisation :')?.trim(); if (name) newOrg(name); return; }
              set({ company: e.target.value, reportsTo: undefined });
            }}>
              <option value="">Aucune</option>
              {orgs.map(n => <option key={n} value={n}>{n}</option>)}
              <option value="__new">Nouvelle organisation…</option>
            </select>
          </Field>
        )}
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
