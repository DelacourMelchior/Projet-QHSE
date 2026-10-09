// The sheet of one supplier (tool 3.1), in three tabs. "Fiche": who it is, its purchasing sectors, the people to call in the directory.
// "Évaluations": the figures of the last 12 months, the evaluation grid filled criterion by criterion (calculated ones proposed from the facts,
// the others, price included, given by hand), its decision, the history of the ratings, the deliveries followed.
// "Historique et réclamations": the claims linked to this supplier and everything that happened with it, in one list built from the records.
import { useEffect, useRef, useState } from 'react';
import { Phone, Plus, Star, Trash2 } from 'lucide-react';
import type { Debit, RatingScore, Supplier, SupplierRating, SupplierStatus } from '../../domain/types';
import {
  assessed, blankScores, itemsAverage, levelNote, weightShares, CLASS_INFO, claimMotifLabel, DEBIT_STATE, debitAmount, debitState, DECISIONS, followableOrgs, isGoods, lastRating, lateReceipts, levelsOf, newDebit, nextReview, orgCategoryOf, orgOfSupplier,
  proposedRating, ratingClass, ratingParts, ratingScore, reviewEvery, SEVERITY, severityOf, statusAfter, statusOf, supplierCfg, supplierContacts, supplierFacts, SUPPLIER_STATUS,
  ensureSupplierOrg, SUPPLIER_ORG_CATEGORIES, toScores,
} from '../../domain/suppliers';
import { defaultProcess } from '../../domain/base';
import { fullTimeline, hasPlanB, newSector, sectorRanking } from '../../domain/sectors';
import { orgKey, orgOf, telOf, toCheck } from '../../domain/contacts';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { newRisk } from '../../domain/risk';
import { useStore } from '../../store/StoreContext';
import { Button, Chips, DeleteButton, Field, inputCls, Modal, NewTab, NumInput, Row, StatusBadge, SubTitle, Tile } from '../common';
import { DateField } from './ClaimSheet';
import { SupplierTrend } from './SupplierTrend';
import type { Nav } from '../tools';
import { FlowUses } from '../map/FlowUses';

type Tab = 'fiche' | 'eval' | 'history';
const KIND: Record<string, string> = {
  claim: 'Réclamation', sent: 'Envoi', chase: 'Relance', answer: 'Réponse', credit: 'Avoir', closed: 'Clôture', action: 'Vérification', late: 'Retard', rating: 'Évaluation', note: 'Note', switch: 'Secteur',
};

export function SupplierSheet({ initial, onClose, nav, onClaim, rateOnOpen = false }: { initial: Supplier; onClose(): void; nav: Nav; onClaim(d: Debit): void; rateOnOpen?: boolean }) {
  const { state, update, author } = useStore();
  const [x, setX] = useState<Supplier>(() => structuredClone(initial));
  const [tab, setTab] = useState<Tab>(() => (initial.name ? 'eval' : 'fiche'));
  const [rating, setRating] = useState<SupplierRating | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [orgName, setOrgName] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgRef, setOrgRef] = useState('');
  const [person, setPerson] = useState({ name: '', role: '', phone: '', email: '' });   // the person to call, created in the directory with the organisation
  const [year, setYear] = useState('all');
  const [sectorName, setSectorName] = useState('');
  const [error, setError] = useState('');
  const start = useRef<((mode: 'blank' | 'facts') => void) | undefined>(undefined);
  // « Noter à la main » from the list opens the sheet already on an empty grid
  useEffect(() => { if (rateOnOpen) start.current?.('blank'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date(), cfg = supplierCfg(state.params);
  const isNew = !state.suppliers[x.id];
  const set = (p: Partial<Supplier>) => setX(y => ({ ...y, ...p }));
  const org = orgOfSupplier(state, x), people = supplierContacts(state, x);
  const facts = supplierFacts(state, x, now), r = lastRating(x);
  const cls = r ? ratingClass(r, state.params) : null;
  const dirty = JSON.stringify(x) !== JSON.stringify(initial) || !!rating || !!orgName;   // a new supplier without a name is not worth a question
  const close = () => { if (!dirty || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const known = followableOrgs(state);
  const typed = isNew ? orgName.trim() : x.name;
  // an organisation already in the directory is shown as it is; otherwise its card is filled here and created with the supplier
  const foundOrg = isNew && typed ? orgOf(state, typed) : undefined;
  const foundPeople = isNew && typed ? Object.values(state.contacts).filter(c => c.company.trim() && SUPPLIER_ORG_CATEGORIES.includes(c.category) && orgKey(c.company) === orgKey(typed)) : [];
  const personGiven = !!(person.name.trim() || person.phone.trim() || person.email.trim() || person.role.trim());

  const save = () => {
    const name = isNew ? orgName.trim() : x.name.trim();
    if (!name) return setError("Choisissez une organisation de l'annuaire ou indiquez un nom.");
    if (isNew && Object.values(state.suppliers).some(s => s.name.trim().toLowerCase() === name.toLowerCase())) return setError(`${name} est déjà suivi comme fournisseur.`);
    if (rating && !assessed(rating.scores || [])) { setTab('eval'); return setError("Notez au moins un critère, ou abandonnez l'évaluation."); }
    if (isNew && !foundPeople.length && personGiven && !person.name.trim()) return setError("Indiquez le nom de l'interlocuteur, ou videz ses champs.");
    update(d => {
      const { org: o, contactId } = ensureSupplierOrg(d, { orgId: x.orgId, name, category: orgCategoryOf(x.category), phone: orgPhone, email: orgEmail, address: orgAddress, reference: orgRef, person: isNew ? person : undefined }, author, now);
      let final: Supplier = { ...x, name: o.name, orgId: o.id, contactId: x.contactId || contactId || undefined };
      if (rating) final = { ...final, ratings: [...final.ratings, rating], status: x.status === initial.status ? statusAfter(rating.decision, statusOf(final)) : x.status };
      if (!final.contactId) { const first = supplierContacts(d, final)[0]; if (first) final.contactId = first.id; }
      d.suppliers[final.id] = final;
    });
    onClose();
  };
  const remove = () => {
    const n = Object.values(state.debits).filter(d => d.supplierId === x.id).length;
    if (window.confirm(n ? `${x.name} a ${n} réclamation(s), qui garderont son nom. Le retirer du suivi ? Son organisation reste dans l'annuaire.` : `Retirer ${x.name} du suivi ? Son organisation reste dans l'annuaire.`)) { update(d => { delete d.suppliers[x.id]; Object.values(d.sectors).forEach(sc => { sc.order = sc.order.filter(i => i !== x.id); }); }); onClose(); }
  };
  // leaving for another window (an action, a claim) keeps what was typed here
  const leave = (go: () => void) => { update(d => { d.suppliers[x.id] = x; }); onClose(); go(); };
  // a link to the directory: what was typed is written, the directory opens in a new tab, the sheet stays open
  const toDirectory = () => { update(d => { d.suppliers[x.id] = x; }); nav.open('1.3', `org:${x.name}`); };
  const plan = () => leave(() => nav.newAction({ ref: { kind: 'supplier', id: x.id }, constat: `Plan de progrès ${x.name}${r ? ` : ${ratingScore(r)}/100 (classe ${cls})` : ''}` }));
  const claim = (d: Debit) => leave(() => onClaim(d));
  const claims = Object.values(state.debits).filter(d => d.supplierId === x.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const events = isNew ? [] : fullTimeline(state, x);
  const years = [...new Set(events.map(e => e.date.slice(0, 4)))].sort().reverse();
  const shown = year === 'all' ? events : events.filter(e => e.date.startsWith(year));
  // An evaluation starts empty, to be filled by hand; the facts are offered criterion by criterion, or all at once
  const proposal = proposedRating(state, x, now);
  const startRating = (mode: 'blank' | 'facts') => {
    const pr = proposedRating(state, x, now);
    setRating({ date: isoDate(now), by: author, note: mode === 'facts' ? `Proposée d'après : ${pr.basis}` : '', scores: mode === 'facts' ? toScores(pr.parts) : blankScores(pr.parts), decision: '' });
    setHints(Object.fromEntries(pr.parts.map(p => [p.key, p.hint])));
    setTab('eval');
  };
  start.current = startRating;
  // an item changes the note of its criterion (the mean of the items given)
  const setItem = (i: number, j: number, v: number | null) => setRating(g => {
    if (!g) return g;
    return { ...g, scores: g.scores!.map((q, k) => {
      if (k !== i) return q;
      const items = (q.items || []).map((it, m) => (m === j ? { ...it, points: v === null ? null : Math.max(0, Math.min(q.max, v)) } : it));
      const avg = itemsAverage(items, q.max);
      return { ...q, items, points: avg !== null ? avg : q.points };
    }) };
  });
  const setScore = (i: number, patch: Partial<RatingScore>) => setRating(g => (g ? { ...g, scores: g.scores!.map((q, j) => (j === i ? { ...q, ...patch } : q)) } : g));
  const setComment = (i: number, comment: string) => setRating(g => (g ? { ...g, scores: g.scores!.map((q, j) => (j === i ? { ...q, comment } : q)) } : g));
  const setPoints = (i: number, v: number | null) => setRating(g => (g ? { ...g, scores: g.scores!.map((q, j) => (j === i ? { ...q, points: v === null ? null : Math.max(0, Math.min(q.max, v)) } : q)) } : g));
  const delta = (() => { const rs = [...x.ratings].sort((a, b) => (a.date < b.date ? 1 : -1)); return rs.length > 1 ? ratingScore(rs[0]) - ratingScore(rs[1]) : null; })();
  const ratingScoreNow = rating ? ratingScore(rating) : 0, ratingClassNow = rating ? ratingClass(rating, state.params) : 'C';

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouveau fournisseur' : x.name}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">
        {r ? <StatusBadge level={CLASS_INFO[cls!].tone} text={`${ratingScore(r)} / 100 · ${CLASS_INFO[cls!].label}`} /> : isNew ? "Seul le nom de l'entreprise est obligatoire." : 'Pas encore noté'}
        {delta !== null && <span className={delta < 0 ? 'font-semibold text-red-700' : 'text-slate-600'}>{delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '= '}{delta} point{Math.abs(delta) > 1 ? 's' : ''} depuis la note précédente</span>}
        {statusOf(x) !== 'listed' && <StatusBadge level={SUPPLIER_STATUS[statusOf(x)].tone} text={SUPPLIER_STATUS[statusOf(x)].label} />}
      </span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Retirer du suivi</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-4">
        {!isNew && <FlowUses quiet tool="3.1" id={x.id} />}
        {!isNew && <Chips value={tab} onChange={setTab} items={[['fiche', 'Fiche'], ['eval', 'Évaluations', x.ratings.length], ['history', 'Historique et réclamations', claims.length]]} />}

        {tab === 'fiche' && <div className="space-y-5 [&>section+section]:border-t [&>section+section]:border-slate-100 [&>section+section]:pt-5">
          <section className="space-y-3">
            <SubTitle>Entreprise</SubTitle>
            {isNew ? <>
              <Field label="Nom de l'entreprise (obligatoire)" hint="Tapez son nom, ou choisissez une entreprise déjà dans l'annuaire (1.3). Une nouvelle entreprise y est ajoutée avec ce qui suit.">
                <input className={inputCls} list="followable-orgs" value={orgName} autoFocus required aria-required placeholder="Ex. Papeterie du Parc" onChange={e => setOrgName(e.target.value)} />
              </Field>
              <datalist id="followable-orgs">{known.map(n => <option key={n} value={n} />)}</datalist>
              {foundOrg ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">Déjà dans l'annuaire : {[foundOrg.phone, foundOrg.email, foundOrg.address].filter(Boolean).join(' · ') || 'sans coordonnées'}{foundPeople.length ? ` · ${foundPeople.length} personne${foundPeople.length > 1 ? 's' : ''} à contacter` : ''}.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Téléphone (standard)"><input className={`${inputCls} font-mono`} inputMode="tel" autoComplete="off" value={orgPhone} onChange={e => setOrgPhone(e.target.value)} /></Field>
                  <Field label="E-mail général"><input className={inputCls} type="email" autoComplete="off" placeholder="contact@…" value={orgEmail} onChange={e => setOrgEmail(e.target.value)} /></Field>
                  <Field label="Adresse"><input className={inputCls} autoComplete="off" value={orgAddress} onChange={e => setOrgAddress(e.target.value)} /></Field>
                  <Field label="Votre numéro de client" hint="À donner quand vous l'appelez ou lui écrivez."><input className={`${inputCls} font-mono`} autoComplete="off" value={orgRef} onChange={e => setOrgRef(e.target.value)} /></Field>
                </div>
              )}
            </> : (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                <span>Dans l'annuaire : <strong>{x.name}</strong>{org?.phone ? <> · <a href={`tel:${telOf(org.phone)}`} className="font-mono font-semibold text-delacour-primary hover:underline">{org.phone}</a></> : ''}{org?.reference ? ` · votre numéro de client : ${org.reference}` : ''}</span>
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary hover:underline" onClick={toDirectory}>Modifier dans l'annuaire<NewTab /></button>
              </div>
            )}
          </section>

          {isNew && !foundPeople.length && (
            <section className="space-y-3">
              <SubTitle>Votre interlocuteur</SubTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom et prénom"><input className={inputCls} autoComplete="off" value={person.name} onChange={e => setPerson({ ...person, name: e.target.value })} /></Field>
                <Field label="Fonction"><input className={inputCls} autoComplete="off" placeholder="Ex. commercial, comptabilité" value={person.role} onChange={e => setPerson({ ...person, role: e.target.value })} /></Field>
                <Field label="Téléphone direct ou mobile"><input className={`${inputCls} font-mono`} inputMode="tel" autoComplete="off" value={person.phone} onChange={e => setPerson({ ...person, phone: e.target.value })} /></Field>
                <Field label="E-mail"><input className={inputCls} type="email" autoComplete="off" value={person.email} onChange={e => setPerson({ ...person, email: e.target.value })} /></Field>
              </div>
              <p className="text-[11px] text-slate-500">La personne est ajoutée à l'annuaire avec l'entreprise, numéro vérifié aujourd'hui. Les autres s'ajoutent ensuite dans l'annuaire.</p>
            </section>
          )}

          <section className="space-y-3">
            <SubTitle>Ce que vous lui achetez</SubTitle>
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-700">Secteur d'achat</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.values(state.sectors || {}).sort((a, b) => a.name.localeCompare(b.name)).map(sc => {
                  const on = !!x.sectorIds?.includes(sc.id), role = on && !isNew ? sectorRanking(state, sc, now).find(y => y.x.id === x.id)?.role : undefined;
                  return <button key={sc.id} type="button" aria-pressed={on} onClick={() => set({ sectorIds: on ? (x.sectorIds || []).filter(i => i !== sc.id) : [...(x.sectorIds || []), sc.id] })}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{sc.name}{role === 'main' ? ' · principal' : role === 'backup' ? ' · secours' : ''}</button>;
                })}
                <span className="flex items-center gap-1">
                  <input className={`${inputCls} !w-44`} value={sectorName} placeholder="Autre secteur" aria-label="Nom d'un nouveau secteur" onChange={e => setSectorName(e.target.value)} />
                  <Button className="!px-2" disabled={!sectorName.trim()} onClick={() => { const sc = newSector(sectorName.trim()); update(d => { d.sectors[sc.id] = sc; }); set({ sectorIds: [...(x.sectorIds || []), sc.id] }); setSectorName(''); }}><Plus size={13} />Créer</Button>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Les fournisseurs d'un même secteur sont comparés entre eux, avec un principal et un secours.</p>
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Précision (facultatif)"><input className={inputCls} value={x.supplies} placeholder="Ex. papier, enveloppes, toners" onChange={e => set({ supplies: e.target.value })} /></Field>
              <div className="space-y-1">
                <span className="block text-[11px] font-semibold text-slate-700">Vous lui achetez</span>
                <div role="group" aria-label="Vous lui achetez" className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]">
                  {([['matiere', 'Des produits'], ['service', 'Des services']] as const).map(([k, label]) => {
                    const on = isGoods(x.category) === (k === 'matiere');
                    return <button key={k} type="button" aria-pressed={on} onClick={() => { if (!on) set({ category: k }); }} className={`px-3 py-1.5 ${on ? 'bg-delacour-primary text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>;
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <SubTitle>Suivi</SubTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Statut" hint="Un fournisseur suspendu ou déréférencé n'est plus évalué ; son historique reste.">
                <select className={inputCls} value={statusOf(x)} onChange={e => set({ status: e.target.value as SupplierStatus })}>{Object.entries(SUPPLIER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
              </Field>
            </div>
            <label className="flex items-start gap-2 text-[11px] text-slate-700"><input type="checkbox" className="mt-0.5" checked={x.strategic} onChange={e => set({ strategic: e.target.checked })} /><span><strong className="font-semibold">Fournisseur critique</strong> : indispensable et difficile à remplacer, son arrêt bloquerait l'activité. Il est évalué tous les {cfg.criticalMonths} mois et repéré dans les Plans B (outil 1.2).</span></label>
            {!isNew && x.strategic && !hasPlanB(state, x) && (
              <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">Pas encore de Plan B pour ce fournisseur.
                <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => { const rk = { ...newRisk(defaultProcess('P3')), title: `Rupture du fournisseur ${x.name}`, resource: `Fournisseur critique : ${x.name}${x.supplies ? ` (${x.supplies})` : ''}`, family: 'relais' as const, cause: 'Fournisseur unique, sans second fournisseur référencé' }; update(d => { d.suppliers[x.id] = x; d.risks[rk.id] = rk; }); onClose(); nav.openRisk(rk.id); }}>Créer le risque dans les Plans B (1.2)</button>
              </p>
            )}
          </section>

          {!isNew && <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SubTitle>Personnes à contacter (annuaire)</SubTitle>
              <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-delacour-primary hover:underline" onClick={toDirectory}>Ajouter une personne dans l'annuaire<NewTab /></button>
            </div>
            {people.length ? (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[11px]">
                {people.map(c => (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2.5 py-1.5">
                    <span className="font-semibold">{c.name || 'Sans nom'}{c.role ? <span className="font-normal text-slate-600"> · {c.role}</span> : ''}</span>
                    {x.contactId === c.id && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-700">contact principal</span>}
                    {c.phone && <a href={`tel:${telOf(c.phone)}`} className="inline-flex items-center gap-1 font-mono font-bold text-delacour-primary hover:underline"><Phone size={11} />{c.phone}</a>}
                    {c.email && <span className="text-slate-600">{c.email}</span>}
                    {toCheck(c, now) && <span className="font-semibold text-amber-800">numéro pas vérifié depuis plus d'un an</span>}
                    {x.contactId !== c.id && <button type="button" className="ml-auto font-semibold text-delacour-primary hover:underline" onClick={() => set({ contactId: c.id })}>Contact principal</button>}
                  </li>
                ))}
              </ul>
            ) : <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Aucune personne à contacter dans l'annuaire pour ce fournisseur.</p>}
          </section>}
        </div>}

        {tab === 'eval' && <div className="space-y-5">
          <section className="space-y-2">
            <SubTitle>Évaluation</SubTitle>
            <p className="text-[11px] text-slate-600">Prochaine évaluation : {nextReview(x, state.params) ? frDate(nextReview(x, state.params)) : 'dès que possible'} (tous les {reviewEvery(x, state.params)} mois). Les critères et leurs poids se règlent dans « Réglages de l'évaluation », en bas de la liste des fournisseurs.</p>
            {x.ratings.length > 0 && (
              <ul className="space-y-1.5">
                {[...x.ratings].sort((a, b) => (a.date < b.date ? 1 : -1)).map((rt, i) => {
                  const sc = ratingScore(rt), c = ratingClass(rt, state.params);
                  return (
                    <li key={`${rt.date}${i}`} className="space-y-0.5 text-[11px] text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-[68px] font-mono">{frDate(rt.date)}</span>
                        <strong className="w-[64px] font-mono">{sc} / 100</strong>
                        <StatusBadge level={CLASS_INFO[c].tone} text={c} />
                        <span className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" aria-hidden><span className="block h-full rounded-full" style={{ width: `${sc}%`, background: c === 'A' ? '#059669' : c === 'B' ? '#D97706' : '#DC2626' }} /></span>
                        <span className="text-slate-500">{ratingParts(rt).map(p => `${p.label.toLowerCase()} ${p.points ?? 'non évalué'}/${p.max}`).join(' · ')}{rt.by ? ` (${rt.by})` : ''}</span>
                      </div>
                      {(ratingParts(rt).some(p => p.comment || p.items?.some(it => it.points !== null)) || rt.strengths || rt.improvements) && (
                        <details className="text-slate-600 sm:pl-[76px]">
                          <summary className="cursor-pointer font-semibold text-delacour-primary">Détail de cette évaluation</summary>
                          <ul className="mt-1 space-y-0.5">
                            {rt.strengths && <li><strong>Points forts :</strong> {rt.strengths}</li>}
                            {rt.improvements && <li><strong>À améliorer :</strong> {rt.improvements}</li>}
                            {ratingParts(rt).map(p => (
                              <li key={p.key}><strong>{p.label}</strong> {p.points ?? 'non évalué'}/{p.max}{p.comment ? ` : ${p.comment}` : ''}{p.items?.some(it => it.points !== null) ? <span className="text-slate-500"> ({p.items!.filter(it => it.points !== null).map(it => `${it.label.toLowerCase()} ${it.points}`).join(', ')})</span> : null}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {(rt.decision || rt.note) && <p className="text-slate-600 sm:pl-[76px]">{rt.decision ? `Décision : ${rt.decision === 'other' && rt.decisionNote ? rt.decisionNote : DECISIONS[rt.decision]}. ` : ''}{rt.note}{rt.decision && rt.decision !== 'other' && rt.decisionNote ? ` ${rt.decisionNote}` : ''}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            {!rating ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button kind="primary" onClick={() => startRating('blank')}><Star size={14} />Évaluer ce fournisseur</Button>
                <Button onClick={() => startRating('facts')}>Évaluer avec les notes proposées d'après les faits</Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">Chaque critère se note : un nombre de points, ou un niveau en un clic</span>
                  {assessed(rating.scores!) ? <StatusBadge level={CLASS_INFO[ratingClassNow].tone} text={`${ratingScoreNow} / 100 · ${ratingClassNow}`} /> : <span className="rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-[11px] font-semibold text-slate-600">à noter</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {rating.scores!.map((p, i) => {
                    const prop = proposal.parts.find(q => q.key === p.key), share = weightShares(rating.scores!.map(q => ({ weight: q.weight ?? q.max })))[i], items = p.items || [];
                    const level = (l: { pct: number }) => levelNote(l.pct, p.max);
                    return (
                      <div key={p.key} className="space-y-1.5 rounded-lg border border-slate-100 p-2">
                        <Field label={`${p.label || 'Critère'} · note sur ${p.max} · ${share} % de la note`} hint={hints[p.key]}><NumInput value={p.points} placeholder="non évalué" onChange={v => setPoints(i, v)} /></Field>
                        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Niveau du critère ${p.label}`}>
                          {levelsOf(p.key).map(l => <button key={l.label} type="button" className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${p.points === level(l) ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} onClick={() => setPoints(i, level(l))}>{l.label}</button>)}
                          {prop?.grounded && prop.points !== null && <button type="button" className="rounded-full border border-dashed border-slate-400 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setPoints(i, prop.points)}>D'après les faits : {prop.points}/{prop.max}</button>}
                          {p.points !== null && <button type="button" className="text-[11px] font-semibold text-slate-500 hover:underline" onClick={() => setScore(i, { points: null, items: items.map(it => ({ ...it, points: null })) })}>Effacer</button>}
                        </div>
                        {items.length > 0 && (
                          <details open={items.some(it => it.points !== null)} className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]">
                            <summary className="cursor-pointer font-semibold text-delacour-primary">Noter point par point ({items.filter(it => it.points !== null).length} sur {items.length}) : la note du critère devient leur moyenne</summary>
                            <ul className="mt-1.5 space-y-1.5">
                              {items.map((it, j) => {
                                const def = prop?.itemDefs.find(d => d.key === it.key);
                                return (
                                  <li key={it.key} className="grid items-center gap-1.5 sm:grid-cols-[1fr_5rem_9rem]">
                                    <span className="text-slate-800">{it.label}{def?.hint ? <span className="block text-[10px] text-slate-500">{def.hint}</span> : null}</span>
                                    <NumInput value={it.points} placeholder="—" aria-label={`${it.label} (sur ${p.max})`} onChange={v => setItem(i, j, v)} />
                                    <select className="rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 text-[11px]" aria-label={`Niveau : ${it.label}`} value={levelsOf(p.key).find(l => level(l) === it.points) ? String(it.points) : ''} onChange={e => setItem(i, j, e.target.value === '' ? null : Number(e.target.value))}>
                                      <option value="">Niveau…</option>
                                      {levelsOf(p.key).map(l => <option key={l.label} value={level(l)}>{l.label}</option>)}
                                    </select>
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        )}
                        <input className={inputCls} value={p.comment || ''} aria-label={`Constat sur ${p.label}`} placeholder="Constat, exemple, preuve (facultatif)" onChange={e => setComment(i, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Date"><input type="date" className={inputCls} value={rating.date} onChange={e => setRating({ ...rating, date: e.target.value })} /></Field>
                  <Field label="Décision">
                    <select className={inputCls} value={rating.decision || ''} onChange={e => setRating({ ...rating, decision: e.target.value as SupplierRating['decision'] })}>
                      <option value="">À décider</option>
                      {Object.entries(DECISIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </Field>
                  {rating.decision === 'other' ? <Field label="Précisez la décision"><input className={inputCls} value={rating.decisionNote || ''} onChange={e => setRating({ ...rating, decisionNote: e.target.value })} /></Field> : <span />}
                  <Field label="Prochaine évaluation" hint={`Sans date : dans ${reviewEvery(x, state.params)} mois`}><DateField value={rating.nextReview || ''} onChange={v => setRating({ ...rating, nextReview: v })} /></Field>
                  <div className="sm:col-span-2"><Field label="Points forts du fournisseur"><input className={inputCls} value={rating.strengths || ''} onChange={e => setRating({ ...rating, strengths: e.target.value })} /></Field></div>
                  <div className="sm:col-span-2"><Field label="À améliorer (ce qu'on lui demande)"><input className={inputCls} value={rating.improvements || ''} onChange={e => setRating({ ...rating, improvements: e.target.value })} /></Field></div>
                  <div className="sm:col-span-4"><Field label="Commentaire général"><input className={inputCls} value={rating.note} onChange={e => setRating({ ...rating, note: e.target.value })} /></Field></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => startRating('facts')}>Remplir avec les notes proposées d'après les faits</Button>
                  <Button kind="ghost" onClick={() => setRating(null)}>Abandonner cette évaluation</Button>
                </div>
                <p className="text-[11px] text-slate-500">Un critère laissé vide est « non évalué » : la note se calcule sur les autres. Les notes d'après les faits ne sont proposées que s'il existe des réclamations ou des livraisons suivies. Le statut du fournisseur suit la décision (à l'enregistrement), vous pouvez le changer ensuite.</p>
              </div>
            )}
            {r && cls === 'C' && (
              <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
                Classe C : note sous le seuil de la classe B{x.strategic ? ' (fournisseur critique, voir les Plans B, outil 1.2)' : ''}.
                {!isNew && <button type="button" className="font-semibold underline" onClick={plan}>Ouvrir un plan de progrès</button>}
              </p>
            )}
          </section>

          <section className="space-y-2">
            <SubTitle>12 derniers mois</SubTitle>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Tile title="Réclamations" value={String(facts.count)} sub={facts.open ? `${facts.open} ouverte(s)` : 'aucune ouverte'} tone={facts.open ? 'warn' : undefined} />
              <Tile title="Reconnues par lui" value={facts.recognisedPct === null ? '—' : `${facts.recognisedPct} %`} sub={`${facts.answered} réponse(s)`} />
              <Tile title="Délai de réponse" value={facts.avgResponseDays === null ? '—' : `${String(facts.avgResponseDays).replace('.', ',')} j`} sub="moyenne, envoi à réponse" tone={facts.avgResponseDays !== null && facts.avgResponseDays > cfg.followDays ? 'alert' : undefined} />
              <Tile title="En retard" value={facts.receipts ? `${facts.late} / ${facts.receipts}` : '—'} sub={facts.receipts ? 'livraisons ou prestations suivies' : 'aucune livraison suivie'} tone={facts.late ? 'warn' : undefined} />
            </div>
            <p className="text-[11px] text-slate-600">{formatValue(facts.claimed, '€')} réclamés, {formatValue(facts.recovered, '€')} récupérés{facts.noReserve ? `, ${facts.noReserve} sans réserve écrite à la réception` : ''}.</p>
            {facts.repeats.length > 0 && <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">Défaut répété : {facts.repeats.map(rp => `${claimMotifLabel(state.params, { motif: rp.key }).toLowerCase()} (${rp.n} fois)`).join(', ')}.</p>}
          </section>

          <section className="space-y-2">
            <SubTitle>Livraisons ou prestations suivies (délais et documents)</SubTitle>
            <p className="text-[11px] text-slate-600">Livraisons ou prestations importantes : date promise et date réelle. Le critère de délais se calcule dessus ; sans suivi, il n'est pas noté. {lateReceipts(x).length ? <strong className="text-red-700">{lateReceipts(x).length} en retard.</strong> : ''}</p>
            <ul className="space-y-1">
              {(x.receipts || []).map((rc, i) => (
                <li key={rc.id} className="grid items-center gap-1.5 sm:grid-cols-[1fr_1fr_auto_2fr_auto]">
                  <input type="date" className={inputCls} value={rc.date} aria-label="Reçu le" onChange={e => set({ receipts: x.receipts!.map((y, j) => (j === i ? { ...y, date: e.target.value, received: e.target.value } : y)) })} />
                  <input type="date" className={inputCls} value={rc.promised} aria-label="Promis pour le" title="Promis pour le" onChange={e => set({ receipts: x.receipts!.map((y, j) => (j === i ? { ...y, promised: e.target.value } : y)) })} />
                  <span className={`text-[11px] ${rc.promised && rc.received > rc.promised ? 'font-semibold text-red-700' : 'text-slate-600'}`}>{rc.promised ? (rc.received > rc.promised ? 'en retard' : 'à l\'heure') : 'date promise ?'}</span>
                  <input className={inputCls} value={rc.note} placeholder="Remarque" aria-label="Remarque" onChange={e => set({ receipts: x.receipts!.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)) })} />
                  <button type="button" aria-label="Retirer" onClick={() => set({ receipts: x.receipts!.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600">×</button>
                </li>
              ))}
            </ul>
            <Button className="!px-2 !py-1" onClick={() => set({ receipts: [...(x.receipts || []), { id: `rc_${Date.now().toString(36)}`, date: isoDate(new Date()), promised: '', received: isoDate(new Date()), note: '' }] })}><Plus size={13} />Livraison ou prestation</Button>
          </section>
        </div>}

        {tab === 'history' && <div className="space-y-5">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SubTitle>Réclamations liées à ce fournisseur ({claims.length})</SubTitle>
              <Button kind="primary" onClick={() => claim(newDebit(state, x.id))}><Plus size={14} />Ajouter une réclamation</Button>
            </div>
            <p className="text-[11px] text-slate-600">Facultatif : les réclamations nourrissent la note de qualité et de service, mais on peut évaluer un fournisseur sans en saisir aucune.</p>
            {claims.length === 0 ? <p className="py-3 text-center text-xs text-slate-500">Aucune réclamation.</p> : (
              <ul className="divide-y divide-slate-100">
                {claims.map(d => {
                  const s = debitState(d, now, state.params), amount = debitAmount(d, state.params);
                  return <Row key={d.id} onClick={() => claim(d)} lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{d.ref}</span>}
                    title={`${claimMotifLabel(state.params, d)} · ${d.defect || 'Défaut à décrire'}`}
                    sub={[`reçu le ${frDate(d.date)}`, d.bl, SEVERITY[severityOf(d)].label.toLowerCase()].filter(Boolean).join(' · ')}
                    right={<><span className="block font-mono font-semibold text-slate-800">{amount ? formatValue(amount, '€') : '—'}</span>{d.recovered ? `récupéré ${formatValue(d.recovered, '€')}` : d.sentAt ? `envoyée le ${frDate(d.sentAt)}` : 'à envoyer'}</>}
                    badge={<StatusBadge level={DEBIT_STATE[s].tone} text={DEBIT_STATE[s].label} />} />;
                })}
              </ul>
            )}
            {claims.length > 0 && <SupplierTrend supplierId={x.id} compact />}
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SubTitle>Chronologie</SubTitle>
              <Chips value={year} onChange={setYear} items={[['all', 'Tout'], ...years.map(y => [y, y] as [string, string])]} />
            </div>
            <p className="text-[11px] text-slate-600">Tout ce qui s'est passé avec ce fournisseur, du plus récent au plus ancien. Rien à saisir : la liste se construit avec les réclamations, les livraisons suivies, les évaluations et les changements de secteur.</p>
            {shown.length === 0 ? <p className="py-3 text-center text-xs text-slate-500">Rien pour l'instant.</p> : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {shown.map((e, i) => (
                  <li key={i} className="flex items-start gap-2.5 px-2.5 py-1.5 text-[11px]">
                    <span className="w-[68px] shrink-0 font-mono text-slate-500">{frDate(e.date)}</span>
                    <span className="w-[78px] shrink-0 font-semibold text-slate-700">{KIND[e.kind]}</span>
                    <span className="min-w-0 flex-1 text-slate-800">{e.text}</span>
                    {e.claimId && state.debits[e.claimId] && <button type="button" className="shrink-0 font-semibold text-delacour-primary hover:underline" onClick={() => claim(state.debits[e.claimId!])}>Ouvrir</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>}
      </div>
    </Modal>
  );
}
