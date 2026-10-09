// Tool 2.3 "Réclamations": written in the register within the hour, acknowledged, customer contacted again within 48 working hours
// (by the means the company prefers), investigation (justified: origin, cause, measure, cost counted in the cost of non-quality 5.2;
// unjustified: arguments to contest), the management approves what exceeds its limit, courtesy call at day 15
// (closed when the file is complete and the customer satisfied or unreachable, or by the management with a written reason).
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, ListPlus, Mail, Plus, Printer, RotateCcw, SearchCheck, Trash2 } from 'lucide-react';
import type { Complaint, State } from '../../domain/types';
import {
  ACK_HOURS, anonymize, clientFiles, closeBlockers, COMPLAINT_STATE, complaintChoices, complaintCost, complaintDelivery, complaintDirect, complaintInsights, complaintLetter, complaintState, complaintStats,
  CONTACT_HOURS, CONTACT_VIA, contactDeadline, contactDelay, courtesyDue, deliveriesCounted, deliveriesOf, directorName, dueForAnonymizing, escalationOf, hasChecks, investigationOf, isBlocked, isClosed, LOG_HOURS,
  motifLabel, motifsOf, needsApproval, newComplaint, OTHER_MOTIF, ownerToday, pvFact, receivedOn, RETENTION_DEFAULT, safeUrl, setMonthDeliveries, similarComplaints, toolEmpty, VERDICTS,
} from '../../domain/commercial';
import { PhotoBox } from '../PhotoBox';
import { applyCommercialExample } from '../../domain/commercialExamples';
import { newAnalysis, newNc } from '../../domain/quality';
import { businessOf, formatHours, frStamp, hoursCost, defaultProcess, nowLocal, PROCESS_IDS, processLabel, workHoursBetween, type Business } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate, periodLabel, periodOfDate } from '../../domain/periods';
import { pref } from '../../store/local';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NewTab, NumInput, Row, StatusBadge, Summary, Tile, ToolHeader } from '../common';
import { ComplaintSettings } from './ComplaintSettings';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';
import { TOOLS, toolUrl, type Nav } from '../tools';
import { clientsOf } from './Devis';
import { BAD_EMAIL, mailtoOf, plainEmail } from './BilanClients';
import { ComplaintTrend } from './ComplaintTrend';

type Filter = 'call' | 'open' | 'closed' | 'all';
const TYPICAL: Record<string, string> = {
  P1: 'Erreur de facturation ou de conditions de paiement, promesse non relayée aux équipes',
  P2: 'Devis flou, avenant non signé contesté à la facturation',
  P3: 'Retard non prévenu, pièce non conforme au plan',
  P4: 'Recrue pas formée, comportement ou propreté sur le site du client',
  P5: 'Défaut d\'aspect non vu au contrôle final, emballage insuffisant',
};

// Time left before 48 h, or late by
function clock(c: Complaint, now: Date, business: Business = false) {
  const h = workHoursBetween(c.at, now, business) ?? 0;
  return h < CONTACT_HOURS ? { late: false, text: `reste ${formatHours(CONTACT_HOURS - h)}` } : { late: true, text: `en retard de ${formatHours(h - CONTACT_HOURS)}` };
}

export function Reclamations({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, author, teamView, folder } = useStore();
  const [open, setOpen] = useState<Complaint | null>(null);
  const [filter, setFilter] = useState<Filter>('call');
  useEffect(() => { if (focus && state && Object.hasOwn(state.complaints, focus)) { setOpen(state.complaints[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const biz = businessOf(state.params);
  const all = Object.values(state.complaints).sort((a, b) => (a.at < b.at ? 1 : -1)).map(c => ({ c, st: complaintState(c, now, biz) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Réclamations : recontacter le client sous 48 h" text="Toute personne qui reçoit une plainte l'inscrit dans l'heure. Le responsable recontacte le client sous 48 h, écoute sans se justifier et propose une solution. Il enquête ensuite : si la réclamation est justifiée, il supprime la cause ; sinon, il répond au client avec les preuves.">
          <Button kind="primary" onClick={() => setOpen(newComplaint(state, author))}><Plus size={14} />Enregistrer une réclamation</Button>
          <Button onClick={() => update(d => applyCommercialExample(d))}>Voir un exemple traité</Button>
        </Empty>
        <ComplaintSettings nav={nav} />
        {open && <ComplaintSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const month = periodOfDate(now);
  const previous = periodOfDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const s = complaintStats(state, month, now);
  const before = complaintStats(state, previous, now);
  const unit = state.params.rateUnit?.trim() || 'livraisons';
  const typed = state.params.monthDeliveries?.[month] !== undefined;   // a number typed for the month, kept until "Revenir au calcul"
  const groups: Record<Filter, string[]> = { call: ['to_contact', 'late'], open: ['in_progress', 'resolved', 'unsatisfied'], closed: ['closed'], all: Object.keys(COMPLAINT_STATE) };
  const shown = all.filter(x => groups[filter].includes(x.st));
  const toAnonymize = dueForAnonymizing(state, now);
  const lastBackup = pref.get('lastBackup');
  const backupDays = lastBackup ? Math.floor((now.getTime() - new Date(lastBackup).getTime()) / 86400000) : null;
  const backupStale = folder.status !== 'connected' && (backupDays === null || backupDays > 30);
  return (
    <div className="space-y-4">
      <Summary title="Les clients mécontents sont-ils recontactés sous 48 h ?" insights={complaintInsights(state, now)} max={2} tiles={<>
        <Tile title={`Reçues en ${periodLabel(month)}`} value={String(s.count)}
          sub={s.count === 0 && before.count > 0 && now.getDate() <= 7 ? `${periodLabel(previous)} : ${before.count}` : s.ratePct !== null ? `${s.ratePct.toFixed(1).replace('.', ',')} % des ${s.deliveries} ${unit}` : s.top ? `surtout ${processLabel(s.top.p)}` : 'processus à qualifier'} />
        <Tile title="Recontactées sous 48 h" value={s.within48Pct === null ? '—' : `${s.within48Pct} %`} sub={biz ? 'objectif : toutes (48 h ouvrées)' : 'objectif : toutes'} tone={s.within48Pct === null ? undefined : s.within48Pct === 100 ? 'ok' : 'alert'} />
        <Tile title="Factures bloquées" value={formatValue(s.blocked, '€')} sub="retenues par des clients mécontents" tone={s.blocked ? 'alert' : undefined} />
        <Tile title="Coût des litiges du mois" value={formatValue(s.cost, '€')} sub="avoirs, transport, reprise, heures (5.2)" />
      </>} />
      <Card className="p-3 sm:p-4"><ComplaintTrend /></Card>
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Registre des réclamations" text="Une ligne par plainte, quel que soit le canal. Elle est close après l'appel de courtoisie.">
          <Button kind="primary" onClick={() => setOpen(newComplaint(state, author))}><Plus size={14} />Enregistrer une réclamation</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={(['call', 'open', 'closed', 'all'] as Filter[]).map(f => [f, { call: 'À recontacter', open: 'En traitement', closed: 'Closes', all: 'Toutes' }[f], all.filter(x => groups[f].includes(x.st)).length])} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{filter === 'call' ? 'Aucun client à recontacter.' : 'Aucune réclamation dans ce filtre.'}</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ c, st }) => {
              const k = clock(c, now, biz);
              return (
                <Row key={c.id} onClick={() => setOpen(c)}
                  lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{c.ref}</span>}
                  title={`${c.client || 'Client à saisir'} · ${c.description || 'Motif à décrire'}`}
                  sub={[c.affaire, c.processId ? processLabel(c.processId) : c.verdict === 'non_fondee' ? '' : 'Processus à qualifier', c.severity === 'majeure' ? 'majeure' : '', c.verdict === 'non_fondee' ? 'non justifiée' : '', complaintCost(c, state.params) ? formatValue(complaintCost(c, state.params), '€') : '', isBlocked(c) ? 'facture bloquée' : ''].filter(Boolean).join(' · ')}
                  right={<><span className="block font-semibold text-slate-800">{c.pilot || c.receivedBy}</span>{st === 'resolved' ? `courtoisie le ${frDate(courtesyDue(c))}` : st === 'unsatisfied' ? 'à reprendre' : `reçue le ${frDate(c.at.slice(0, 10))}`}</>}
                  badge={<StatusBadge level={COMPLAINT_STATE[st].tone} text={st === 'to_contact' || st === 'late' ? `${COMPLAINT_STATE[st].label} · ${k.text}` : COMPLAINT_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
        {toAnonymize.length > 0 && !teamView && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            {toAnonymize.length} fiche(s) close(s) depuis plus de {state.params.retentionYears ?? RETENTION_DEFAULT} ans : les données du client peuvent être effacées.
            <Button className="!px-2 !py-1" onClick={() => { if (window.confirm(`Effacer les données personnelles de ${toAnonymize.length} fiche(s) ? Les dates, processus, motifs et coûts sont conservés pour les statistiques.`)) update(d => { dueForAnonymizing(d).forEach(c => { d.complaints[c.id] = anonymize(c); }); }); }}>Effacer les données</Button>
          </div>
        )}
        {backupStale && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
            {backupDays === null ? 'Aucune sauvegarde faite sur ce poste.' : `Dernière sauvegarde il y a ${backupDays} jours.`} Les réclamations contiennent des données de clients : exportez une sauvegarde (Réglages, onglet Données, « Exporter une sauvegarde ») ou connectez un dossier partagé.
          </p>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Motifs de {periodLabel(month)}</h2>
          {s.byCategory.length ? <ul className="space-y-0.5 text-[11px] text-slate-700">{s.byCategory.map(x => <li key={x.key}><strong>{x.label}</strong> : {x.n}</li>)}</ul> : <p className="text-[11px] text-slate-500">Classez le motif de chaque réclamation pour voir ce qui revient.</p>}
          {s.count > 0 && <p className="text-[11px] text-slate-700">Enquête : {s.grounded.yes} justifiée(s), {s.grounded.no} non justifiée(s), {s.grounded.open} à vérifier.</p>}
        </Card>
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">Taux de réclamation</h2>
          <label className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">{unit.charAt(0).toUpperCase() + unit.slice(1)} en {periodLabel(month)}
            <NumInput className="!w-20 !py-1 text-right" value={deliveriesOf(state, month)} aria-label={`Nombre de ${unit} du mois`} onChange={v => update(d => setMonthDeliveries(d, month, v))} />
            {unit === 'livraisons' && typed && <Button kind="ghost" className="!px-2 !py-1" onClick={() => update(d => setMonthDeliveries(d, month, null))}><RotateCcw size={13} />Revenir au calcul</Button>}
            <span className="text-slate-500">{unit !== 'livraisons' ? '(à saisir ; l\'unité se règle dans les réglages de cet outil)' : typed ? `(nombre saisi ; l'outil 3.4 en compte ${deliveriesCounted(state, month)})` : '(compté depuis les livraisons de l\'outil 3.4 tant qu\'aucun nombre n\'est saisi)'}</span>
          </label>
          <p className="text-[11px] text-slate-700">{s.ratePct === null ? `Saisissez le nombre de ${unit}.` : `${s.count} réclamation(s) pour ${s.deliveries} ${unit} : ${s.ratePct.toFixed(1).replace('.', ',')} %.`}</p>
        </Card>
        <Card className="space-y-2 p-3 sm:p-4">
          <h2 className="text-xs font-bold text-slate-900">La méthode est-elle tenue en {periodLabel(month)} ?</h2>
          <ul className="space-y-0.5 text-[11px] text-slate-700">
            <li>Délai moyen avant recontact : <strong>{s.avgDelay === null ? '—' : formatHours(s.avgDelay)}</strong></li>
            <li>Inscrites dans l'heure : <strong>{s.loggedPct === null ? '—' : `${s.loggedPct} %`}</strong></li>
            <li>Accusé de réception envoyé : <strong>{s.ackPct === null ? '—' : `${s.ackPct} %`}</strong></li>
            <li>Clients satisfaits à J+15 : <strong>{s.satisfiedPct === null ? '—' : `${s.satisfiedPct} %`}</strong>{s.reopened ? ` (${s.reopened} rouverte${s.reopened > 1 ? 's' : ''})` : ''}{s.unreachable ? ` · ${s.unreachable} sans réponse` : ''}</li>
            {s.forced > 0 && <li>Closes avec un dossier incomplet : <strong>{s.forced}</strong></li>}
            {s.edited > 0 && <li>Heures de réception corrigées après coup : <strong>{s.edited}</strong></li>}
          </ul>
        </Card>
      </div>
      <FeedBox tool="2.3" period={month} />
      <ComplaintSettings nav={nav} />
      <Method rule="Un client mécontent recontacté sous 48 h est un client gardé ; un client ignoré bloque la facture. Une enquête sérieuse dit si la réclamation est justifiée : on supprime la cause, ou on conteste avec les preuves. On mesure l'organisation, pas les personnes."
        steps={[['Prendre en compte', 'Toute personne qui reçoit une plainte (téléphone, e-mail, chantier) l\'inscrit ici dans l\'heure.'], ['Notifier le traitement', 'Accusé de réception, puis recontact sous 48 h par le moyen qui convient au client : écouter sans se justifier, proposer une solution de dépannage.'], ['Enquêter', 'Vérifier les points qui peuvent expliquer la réclamation : promesse, livraison, poste, fournisseur, personne, contrôle.'], ['Conclure', 'Justifiée : cause, mesure, solution, coût. Non justifiée : les arguments et les pièces.'], ['Notifier le résultat', 'Dire au client ce que l\'enquête a conclu et ce qui va se passer.'], ['Clore', 'Problème réglé, puis appel de courtoisie à J+15 : le client est-il satisfait ?']]} />
      {open && <ComplaintSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

const STEPS = ['Prise en compte', 'Traitement notifié', 'Enquête', 'Résultat', 'Résultat notifié', 'Clôture'];
const CHECK_STATE = [['ok', 'Rien à signaler', 'border-emerald-300 bg-emerald-50 text-emerald-800'], ['ko', 'Problème trouvé', 'border-red-300 bg-red-50 text-red-800'], ['na', 'Sans objet', 'border-slate-300 bg-slate-100 text-slate-800']] as const;
export const touch = 'max-sm:min-h-[44px] [@media(pointer:coarse)]:min-h-[44px]';
const linkCls = `inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${touch}`;

function StepTitle({ n, done, sub, children }: { n: number; done: boolean; sub?: string; children: string }) {
  return (
    <div id={`cp-step-${n}`} className="scroll-mt-14">
      <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ${done ? 'bg-emerald-600' : 'bg-delacour-primary'}`}>{n}</span>{children}
        {done && <Check size={14} className="text-emerald-600" aria-label="Étape terminée" />}
      </h3>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

// A block hidden in the short view; it opens by itself when it holds something or in the complete view
export function Fold({ title, full, filled, children }: { title: string; full: boolean; filled: boolean; children: React.ReactNode }) {
  const [o, setO] = useState<boolean | undefined>(undefined);
  const open = o ?? (full || filled);
  return (
    <div className="rounded-lg border border-slate-200">
      <button type="button" aria-expanded={open} onClick={() => setO(!open)} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 ${touch}`}>
        <span>{title}{filled && <span className="ml-1.5 font-normal text-emerald-700">· renseigné</span>}</span>
        <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
      </button>
      {open && <div className="space-y-3 border-t border-slate-100 p-3">{children}</div>}
    </div>
  );
}

// How the customer is told something (each company has its habits): a choice, "other" asks to specify
function Via({ label, via, note, onVia, onNote }: { label: string; via: Complaint['contactVia']; note?: string; onVia(v: Complaint['contactVia']): void; onNote(v: string): void }) {
  return (
    <>
      <Field label={label}>
        <select className={inputCls} value={via || ''} onChange={e => onVia(e.target.value as Complaint['contactVia'])}>
          <option value="">À préciser</option>{Object.entries(CONTACT_VIA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Field>
      {via === 'autre' && <Field label="Précisez le moyen"><input className={inputCls} value={note || ''} onChange={e => onNote(e.target.value)} /></Field>}
    </>
  );
}

// A letter ready to send: the model can be edited (it is kept as edited), the mail as sent can be linked to the file,
// and coming back from the mail program asks whether it left
function Letter({ title, model, edited, onEdit, to, subject, link, onLink, onSent, locked, onError }: {
  title: string; model: string; edited?: string; onEdit(v: string | undefined): void; to: string; subject: string; link?: string; onLink?(v: string): void; onSent?(): void; locked?: string; onError(m: string): void;
}) {
  const [pending, setPending] = useState(false);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const back = () => { setAsk(true); setPending(false); };
    window.addEventListener('focus', back);
    return () => window.removeEventListener('focus', back);
  }, [pending]);
  const text = edited ?? model, url = safeUrl(link);
  const href = mailtoOf(to, `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`);
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-2">
      <div className="text-[11px] font-semibold text-slate-700">{title}{edited !== undefined && <span className="font-normal text-amber-800"> · texte modifié</span>}</div>
      <textarea className={inputCls} rows={5} aria-label={title} value={text} onChange={e => onEdit(e.target.value === model ? undefined : e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button className="!px-2 !py-1" onClick={() => navigator.clipboard?.writeText(text).catch(() => onError('Copie impossible : sélectionnez le texte à la main.'))}><Copy size={13} />Copier</Button>
        {locked
          ? <span aria-disabled="true" title={locked} className={`${linkCls} cursor-not-allowed opacity-50`}><Mail size={13} />E-mail</span>
          : <a href={href} onClick={() => onSent && setPending(true)} className={linkCls}><Mail size={13} />E-mail{to && ` à ${to}`}</a>}
        {edited !== undefined && <Button kind="ghost" className="!px-2 !py-1" onClick={() => onEdit(undefined)}><RotateCcw size={13} />Rétablir le modèle</Button>}
      </div>
      {locked && <p className="text-[11px] font-semibold text-amber-800">{locked}</p>}
      {!locked && href.length > 1800 && <p className="text-[11px] text-amber-800">Courrier long : si votre messagerie le coupe, utilisez « Copier ».</p>}
      {ask && onSent && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-900">
          Le mail est-il parti ?
          <Button className="!px-2 !py-1" onClick={() => { onSent(); setAsk(false); }}>Oui, noter l'heure</Button>
          <Button kind="ghost" className="!px-2 !py-1" onClick={() => setAsk(false)}>Pas encore</Button>
        </div>
      )}
      {onLink && (
        <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
          <Field label="Lien vers le mail envoyé" hint="Après l'envoi, coller l'adresse du message depuis votre dossier « Éléments envoyés » : il reste joint à la fiche.">
            <input type="url" className={inputCls} value={link || ''} placeholder="https://" onChange={e => onLink(e.target.value)} />
          </Field>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" className={`${linkCls} mb-5`}><ExternalLink size={13} />Ouvrir le mail envoyé</a>}
        </div>
      )}
    </div>
  );
}

export function ComplaintSheet({ initial, onClose, nav }: { initial: Complaint; onClose(): void; nav: Nav }) {
  const { state, update, author, teamView } = useStore();
  const [c, setC] = useState<Complaint>(() => structuredClone(initial));
  const [error, setError] = useState('');
  const [mode, setModeState] = useState<'essentiel' | 'complet'>(() => (pref.get('cpMode') === 'complet' ? 'complet' : 'essentiel'));
  const [forcing, setForcing] = useState(false);
  const [reason, setReason] = useState('');
  const saved = useRef(initial);   // what is written: the sheet stays open after a button to another tool wrote the complaint, closing must not warn about it
  if (!state) return null;
  const setMode = (m: 'essentiel' | 'complet') => { setModeState(m); pref.set('cpMode', m); };
  const full = mode === 'complet';
  const now = new Date();
  const today = isoDate(now);
  const isNew = !state.complaints[c.id];
  const set = (x: Partial<Complaint>) => setC(y => ({ ...y, ...x }));
  const biz = businessOf(state.params);
  const st = complaintState(c, now, biz);
  const k = clock(c, now, biz);
  const delay = contactDelay(c, biz);
  const loggedAfter = c.loggedAt ? workHoursBetween(c.at, c.loggedAt, biz) : null;
  const esc = escalationOf(state, c);
  const owner = ownerToday(state, c, today);
  const unfounded = c.verdict === 'non_fondee';
  const justified = c.verdict === 'fondee' || c.verdict === 'partielle';
  const files = clientFiles(state, c);
  const orders = complaintChoices(state, c), chosen = complaintDelivery(state, c);   // the order the complaint is about is the one chosen in the list: none chosen, none cited
  const points = investigationOf(state);
  const removedPoints = Object.keys(c.checks || {}).filter(key => !points.some(p => p.key === key));
  const mailUrl = safeUrl(c.mailLink);
  const addr = plainEmail(c.email), badAddr = !!(c.email || '').trim() && !addr;
  const known = [...new Set(Object.values(state.contacts).filter(x => x.email && c.client.trim() && x.company.trim().toLowerCase() === c.client.trim().toLowerCase()).map(x => x.email))];
  const actions = Object.values(state.actions).filter(a => a.ref?.kind === 'complaint' && a.ref.id === c.id).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const approval = needsApproval(c, state.params);
  const blockers = closeBlockers(c, actions.length > 0, state.params);
  const todo = blockers.filter(b => !b.startsWith('recontacter'));
  const similar = !unfounded ? similarComplaints(state, c, now) : [];
  const resultOk = unfounded ? !!c.defense?.trim() : justified && !!c.processId && !!(c.cause?.trim() || c.analysisId) && !!(c.correction?.trim() || c.ncId || c.analysisId || actions.length);
  const done = [!!(c.client.trim() && c.description.trim() && c.category && (c.category !== 'autre' || c.categoryOther?.trim())), !!c.contactedAt, !!(c.findings?.trim() || hasChecks(c)), resultOk, !!c.resultSentAt, isClosed(c)];
  const current = done.includes(false) ? done.indexOf(false) : 5;
  const valid = () => { if (!c.client.trim() || !c.description.trim()) { setError('Indiquez le client et le motif.'); return false; } setError(''); return true; };
  const close = () => { if (JSON.stringify(c) === JSON.stringify(saved.current) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!valid()) return;
    if (c.resolvedAt && !c.contactedAt) { setError('Recontactez le client avant de noter le problème réglé.'); return; }
    // closing is the moment the method is checked: the file is complete and the customer satisfied
    if (isClosed(c) && !c.forcedClose && (!isClosed(initial) || initial.satisfied !== c.satisfied) && blockers.length) { setError(`Pour clore : ${blockers.join(' ; ')}.`); return; }
    update(d => { d.complaints[c.id] = !isNew && c.at !== initial.at ? { ...c, atEdited: true } : c; });
    onClose();
  };
  const remove = () => { if (window.confirm(`Supprimer la réclamation ${c.ref} ?`)) { update(d => { delete d.complaints[c.id]; }); onClose(); } };
  // a window over this one (an action): the draft is kept first, and this sheet closes
  const leave = (go: () => void) => { if (!valid()) return; update(d => { d.complaints[c.id] = c; }); onClose(); go(); };
  const toNc = () => {
    if (!valid()) return;
    if (c.ncId && state.ncs[c.ncId]) { update(d => { d.complaints[c.id] = c; }); saved.current = c; nav.open('5.1', c.ncId); return; }
    const n = { ...newNc(state, author), origin: 'client' as const, item: [c.affaire, c.client].filter(Boolean).join(', '), description: c.description, processId: c.processId, complaintId: c.id };
    update(d => { d.complaints[c.id] = { ...c, ncId: n.id }; d.ncs[n.id] = n; });
    set({ ncId: n.id }); saved.current = { ...c, ncId: n.id };   // the sheet stays open: it must know the red-bin sheet, or a second click makes another one and "Enregistrer" erases the link
    nav.open('5.1', n.id);
  };
  const toAnalysis = () => {
    if (!valid()) return;
    if (c.analysisId && state.analyses[c.analysisId]) { update(d => { d.complaints[c.id] = c; }); saved.current = c; nav.open('5.3', c.analysisId); return; }
    const a = { ...newAnalysis(state, { kind: 'complaint', id: c.id }, `${c.client} : ${c.description}`, c.processId || defaultProcess('P2')), pilot: c.pilot };
    update(d => { d.complaints[c.id] = { ...c, analysisId: a.id }; d.analyses[a.id] = a; });
    set({ analysisId: a.id }); saved.current = { ...c, analysisId: a.id };   // same: the sheet must know the workshop
    nav.open('5.3', a.id);
  };
  const toAction = () => leave(() => nav.newAction({ ref: { kind: 'complaint', id: c.id }, constat: `${c.ref} ${c.client} : ${c.description}${c.cause ? ` · cause : ${c.cause}` : ''}` }));
  // the customer refused the solution: keep it in the history and start a new round
  const reopen = () => set({
    rounds: [...(c.rounds || []), { resolvedAt: c.resolvedAt, courtesyAt: c.courtesyAt, solution: c.solution || c.immediate, note: c.courtesyNote || '' }],
    resolvedAt: '', courtesyAt: '', satisfied: '', courtesyNote: '', solution: '', resultSentAt: '', resultVia: '', resultViaNote: '', resultLink: '', letters: { ack: c.letters?.ack },
  });
  // a point marked "problem found" proposes the process it puts in cause, unless one is already chosen
  const setCheck = (key: string, process: string | undefined, patch: Partial<NonNullable<Complaint['checks']>[string]>) => {
    const cur = c.checks?.[key] || { state: '' as const, note: '' };
    set({ checks: { ...c.checks, [key]: { ...cur, ...patch } }, ...(patch.state === 'ko' && process && !c.processId && !unfounded ? { processId: process } : {}) });
  };
  const recordFor = (tool: string) => { const xs = files.filter(f => f.tool === tool), a = c.affaire.trim().toLowerCase(); return (a ? xs.find(f => f.label.toLowerCase().includes(a)) : undefined) || xs[0]; };
  const forceClose = () => {
    if (reason.trim().length < 10) { setError('Écrivez le motif de la clôture (10 caractères au moins).'); return; }
    set({ forcedClose: { by: author || 'Direction', at: nowLocal(), reason: reason.trim() } });
    setForcing(false); setReason(''); setError('');
  };
  const linkedNc = c.ncId ? state.ncs[c.ncId] : undefined;
  const linkedAn = c.analysisId ? state.analyses[c.analysisId] : undefined;
  const subject = `Votre réclamation ${c.ref}`;
  const company = state.settings.companyName;
  const resultKind = unfounded ? 'contest' : 'close';
  const resultTitle = unfounded ? 'Réponse au client : réclamation non justifiée' : 'Résultat de l\'enquête et solution';
  const redBin = state.settings.profile !== 'services';
  const approvalWhy = state.params.creditLimit && complaintDirect(c) > state.params.creditLimit ? `avoir et frais de ${formatValue(complaintDirect(c), '€')}, au-dessus de ${formatValue(state.params.creditLimit, '€')}` : 'réponse « non justifiée »';
  const locked = approval && !c.approval?.by ? 'En attente de la validation de la direction (étape 4) : le client ne peut pas être informé avant.' : undefined;
  const canErase = isClosed(c) && !c.anonymizedAt && !teamView && (full || dueForAnonymizing({ complaints: { x: c }, params: state.params }, now).length > 0);

  return (
    <Modal full onClose={close} title={isNew ? 'Nouvelle réclamation' : `Réclamation ${c.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">Reçue le {frStamp(c.at)} <StatusBadge level={COMPLAINT_STATE[st].tone} text={COMPLAINT_STATE[st].label} />{loggedAfter !== null && loggedAfter > LOG_HOURS && <span className="font-semibold text-amber-800">inscrite {formatHours(loggedAfter)} après la réception</span>}{(c.atEdited || (!isNew && c.at !== initial.at)) && <span className="font-semibold text-amber-800">heure de réception modifiée</span>}{c.anonymizedAt && <span className="font-semibold text-slate-600">données du client effacées le {frDate(c.anonymizedAt)}</span>}</span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-6">
        <nav aria-label="Étapes de la réclamation" className="sticky top-0 z-10 -mx-4 -mt-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 sm:-mx-5 sm:flex-wrap sm:px-5">
          {STEPS.map((t, i) => (
            <button key={t} type="button" aria-current={i === current ? 'step' : undefined} onClick={() => document.getElementById(`cp-step-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${touch} ${i === current ? 'border-delacour-primary bg-delacour-primary text-white' : done[i] ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {done[i] ? <Check size={12} /> : <span>{i + 1}</span>}{t}
            </button>
          ))}
          <span role="group" aria-label="Affichage" className="ml-auto flex shrink-0 overflow-hidden rounded-full border border-slate-300 text-[11px] font-semibold">
            {(['essentiel', 'complet'] as const).map(m => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`px-2.5 py-1 ${touch} ${mode === m ? 'bg-delacour-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{m === 'essentiel' ? 'Essentiel' : 'Complet'}</button>
            ))}
          </span>
        </nav>

        <section className="space-y-3">
          <StepTitle n={1} done={done[0]} sub="Ce que le client reproche, tel qu'il l'exprime, et comment c'est arrivé jusqu'à nous.">Prise en compte de la réclamation</StepTitle>
          {(() => { const fb = Object.values(state.feedbacks).find(x => x.complaintId === c.id); return fb ? <p className="text-[11px] text-slate-700">Née du bilan de fin d'affaire de {fb.client}{fb.affaire ? ` (${fb.affaire})` : ''} : {fb.verbatim ? `« ${fb.verbatim} » · ` : ''}<button type="button" className="inline-flex items-center gap-1 font-semibold text-delacour-primary underline" onClick={() => { update(d => { d.complaints[c.id] = c; }); saved.current = c; nav.open('2.4', fb.id); }}>ouvrir le bilan (2.4)<NewTab /></button></p> : null; })()}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client"><input className={inputCls} value={c.client} list="clients-cp" onChange={e => set({ client: e.target.value })} /></Field>
            <Field label="Reçue le" hint={c.atEdited || (!isNew && c.at !== initial.at) ? 'Heure modifiée après la première saisie.' : undefined}><input type="datetime-local" className={inputCls} value={c.at} onChange={e => set({ at: e.target.value })} /></Field>
            <Field label="Canal">
              <select className={inputCls} value={c.channel} onChange={e => set({ channel: e.target.value as Complaint['channel'] })}>
                <option value="">—</option><option value="tel">Téléphone</option><option value="mail">E-mail</option><option value="site">Sur place</option><option value="courrier">Courrier</option>
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3"><Field label="Motif factuel"><input className={inputCls} value={c.description} onChange={e => set({ description: e.target.value })} /></Field></div>
            <Field label="Gravité">
              <select className={inputCls} value={c.severity} onChange={e => set({ severity: e.target.value as Complaint['severity'] })}>
                <option value="mineure">Mineure</option><option value="majeure">Majeure</option>
              </select>
            </Field>
            <Field label="Pilote de la résolution"><input className={inputCls} value={c.pilot} list="people" onChange={e => set({ pilot: e.target.value })} /></Field>
            <Field label="Motif de la réclamation">
              <select className={inputCls} value={c.category || ''} onChange={e => set({ category: e.target.value })}>
                <option value="">À classer</option>
                {motifsOf(state.params).filter(m => !m.retired || m.key === c.category).map(m => <option key={m.key} value={m.key}>{m.label}{m.retired ? ' (retiré)' : ''}</option>)}
                <option value={OTHER_MOTIF}>Autre (à préciser)</option>
              </select>
            </Field>
            {c.category === OTHER_MOTIF && <Field label="Précisez le motif"><input className={inputCls} value={c.categoryOther || ''} onChange={e => set({ categoryOther: e.target.value })} /></Field>}
            {c.channel === 'mail' && <>
              <Field label="Adresse e-mail du client" hint={badAddr ? <span className="font-semibold text-amber-800">{BAD_EMAIL}</span> : 'Destinataire des courriers des étapes 2 et 5.'}>
                <span className="flex gap-1.5"><input type="email" className={inputCls} value={c.email || ''} list="emails-cp" onChange={e => set({ email: e.target.value })} />
                  {addr && <a href={mailtoOf(addr)} className={linkCls}><Mail size={13} />Écrire</a>}</span>
              </Field>
              <div className="lg:col-span-2"><Field label="Lien vers l'e-mail reçu" hint="Coller l'adresse du message depuis votre messagerie.">
                <span className="flex gap-1.5"><input type="url" className={inputCls} value={c.mailLink || ''} placeholder="https://" onChange={e => set({ mailLink: e.target.value })} />
                  {mailUrl && <a href={mailUrl} target="_blank" rel="noopener noreferrer" className={linkCls}><ExternalLink size={13} />Ouvrir</a>}</span>
              </Field></div>
            </>}
          </div>
          <Fold key={`d1${mode}`} title="Plus de détails : affaire, mots du client, photo, reçue par, historique du client" full={full} filled={!!(c.affaire || c.message || c.photo)}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Affaire ou commande"><input className={inputCls} value={c.affaire} onChange={e => set({ affaire: e.target.value })} /></Field>
              <Field label="Reçue par"><input className={inputCls} value={c.receivedBy} list="people" onChange={e => set({ receivedBy: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Les mots du client" hint="Coller l'e-mail ou noter la phrase exacte."><textarea className={inputCls} rows={4} value={c.message || ''} onChange={e => set({ message: e.target.value })} /></Field></div>
              <div className="max-w-xs"><PhotoBox value={c.photo || ''} label="Photo du problème signalé" onChange={v => set({ photo: v || undefined })} /></div>
            </div>
            <p className="text-[11px] text-slate-500">Données du client (nom, e-mail, messages, photo) : conservées {state.params.retentionYears ?? RETENTION_DEFAULT} ans après la clôture, puis proposées à l'effacement.</p>
            {(() => { const others = Object.values(state.complaints).filter(x => x.id !== c.id && c.client.trim() && x.client.trim().toLowerCase() === c.client.trim().toLowerCase()).sort((a, b) => (a.at < b.at ? 1 : -1)); return others.length > 0 && (
              <div className="space-y-1 rounded-lg bg-slate-50 p-2">
                <div className="text-[11px] font-semibold text-slate-700">Historique de ce client ({others.length})</div>
                <ul className="space-y-0.5 text-[11px] text-slate-700">{others.slice(0, 6).map(x => <li key={x.id}><span className="font-mono">{frDate(x.at.slice(0, 10))}</span> · {x.ref} · {x.description}</li>)}</ul>
              </div>
            ); })()}
          </Fold>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <StepTitle n={2} done={done[1]} sub={`Dire au client que sa réclamation est prise en charge, puis le recontacter avec une première solution${biz ? ' : les 48 h comptent du lundi au vendredi, hors jours non travaillés' : ''}.`}>Notification au client du traitement de la réclamation</StepTitle>
            {!c.contactedAt ? <span className={`text-[11px] font-semibold ${k.late ? 'text-red-700' : 'text-amber-800'}`}>Recontact : {k.text} (avant le {frStamp(contactDeadline(c, biz))})</span>
              : <span className={`text-[11px] font-semibold ${(delay ?? 0) <= CONTACT_HOURS ? 'text-emerald-700' : 'text-red-700'}`}>Recontacté en {formatHours(delay ?? 0)}</span>}
          </div>
          {st === 'late' && <p role="status" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-900">Prévenir {esc || 'la direction'} : le client n'a pas été recontacté à temps.{esc && ' La tâche apparaît chez cette personne.'}</p>}
          {owner.absent && !isClosed(c) && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">Le pilote est absent aujourd'hui{owner.who && owner.who !== (c.pilot || c.receivedBy) ? ` : les tâches de cette fiche vont à ${owner.who}` : ''}{owner.who.endsWith('.') ? '' : '.'}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client recontacté le">
              <span className="flex gap-1.5"><input type="datetime-local" className={inputCls} value={c.contactedAt} onChange={e => set({ contactedAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ contactedAt: nowLocal(), contactVia: c.contactVia || (c.channel as Complaint['contactVia']) })}>Maintenant</Button></span>
            </Field>
            <Via label="Recontacté par" via={c.contactVia} note={c.contactViaNote} onVia={v => set({ contactVia: v })} onNote={v => set({ contactViaNote: v })} />
            <div className="sm:col-span-2 lg:col-span-3"><Field label="Solution immédiate proposée au client"><input className={inputCls} value={c.immediate} placeholder="Ex. : remplacement sous 24 h, avoir, passage d'un technicien" onChange={e => set({ immediate: e.target.value })} /></Field></div>
          </div>
          {!c.ackAt && !c.contactedAt && (workHoursBetween(c.at, now, biz) ?? 0) >= ACK_HOURS && <p className="text-[11px] font-semibold text-amber-800">Accusé pas encore envoyé : plus de {ACK_HOURS} h sans accusé ni contact.</p>}
          <Fold key={`a2${mode}`} title="Accusé de réception : courrier et date d'envoi" full={full} filled={!!(c.ackAt || c.letters?.ack || c.ackLink)}>
            <Field label="Accusé de réception envoyé le">
              <span className="flex gap-1.5"><input type="datetime-local" className={inputCls} value={c.ackAt || ''} onChange={e => set({ ackAt: e.target.value })} /><Button className="shrink-0 !px-2" onClick={() => set({ ackAt: nowLocal() })}>Maintenant</Button></span>
            </Field>
            <Letter title="Accusé de réception (dès la réception)" model={complaintLetter(c, 'ack', company, !!biz)} edited={c.letters?.ack} onEdit={v => set({ letters: { ...c.letters, ack: v } })}
              to={addr} subject={subject} link={c.ackLink} onLink={v => set({ ackLink: v })} onSent={() => set({ ackAt: nowLocal() })} locked={badAddr ? BAD_EMAIL : undefined} onError={setError} />
          </Fold>
        </section>

        <section className="space-y-3">
          <StepTitle n={3} done={done[2]} sub="Vérifier les points qui peuvent expliquer la réclamation. Les liens ouvrent l'outil qui contient la preuve dans un nouvel onglet : la fiche reste ouverte ici.">Enquête</StepTitle>
          <Field label="Constats" hint="Les faits relevés au cours de la vérification, avec les dates et les références des pièces.">
            <textarea className={inputCls} rows={3} value={c.findings || ''} onChange={e => set({ findings: e.target.value })} />
          </Field>
          <Fold key={`e3${mode}`} title={`Passer les ${points.length} points en revue`} full={full} filled={hasChecks(c)}>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {points.map(chk => {
                const v = c.checks?.[chk.key] || { state: '' as const, note: '' };
                const def = chk.tool ? TOOLS.find(t => t.id === chk.tool) : undefined;
                const is34 = def?.id === '3.4';
                const rec = is34 ? (chosen ? { id: chosen.id, label: `Réception ${chosen.ref} · ${chosen.item}` } : undefined) : def ? recordFor(def.id) : undefined;
                const empty = def ? toolEmpty(state, def.id) : false;
                const pv = is34 && chosen ? `Commande ${chosen.ref || chosen.item || 'sans numéro'} : ${pvFact(chosen) || 'aucun PV pour le moment'}` : '';   // the acceptance report of the chosen order, as a fact
                return (
                  <div key={chk.key} className="grid items-center gap-2 p-2 lg:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1.6fr)_auto]">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{chk.label || 'Point sans nom'} <span className="font-mono text-[11px] font-normal text-slate-400">{chk.process}</span></div>
                      <div className="text-[11px] text-slate-500">{chk.hint}</div>
                      {pv && <div className="text-[11px] font-semibold text-slate-700">{pv}</div>}
                      {is34 && c.deliveryId && !chosen && <div className="text-[11px] font-semibold text-amber-800">La commande choisie n'existe plus dans l'outil 3.4.</div>}
                      {is34 && orders.length > 0 && (
                        <label className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">Commande en cause
                          <select className={`${inputCls} !w-auto min-w-0 max-w-full`} value={chosen?.id ?? ''} onChange={e => set({ deliveryId: e.target.value || undefined })}>
                            <option value="">Aucune choisie</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.ref || 'sans numéro'} · {o.item}{receivedOn(o) ? ` · reçue le ${frDate(receivedOn(o))}` : ' · pas encore reçue'}{o.archivedAt ? ' · archivée' : ''}</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1" role="group" aria-label={chk.label}>
                      {CHECK_STATE.map(([key, l, cls]) => (
                        <button key={key} type="button" aria-pressed={v.state === key} onClick={() => setCheck(chk.key, chk.process, { state: v.state === key ? '' : key })}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${touch} ${v.state === key ? cls : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{l}</button>
                      ))}
                    </div>
                    <input className={inputCls} aria-label={`Ce qu'on constate : ${chk.label}`} placeholder="Ce qu'on constate" value={v.note} onChange={e => setCheck(chk.key, chk.process, { note: e.target.value })} />
                    <div className="flex flex-wrap gap-1.5">
                      {chk.key === 'exchange' && mailUrl && <a href={mailUrl} target="_blank" rel="noopener noreferrer" className={linkCls}><ExternalLink size={13} />E-mail reçu</a>}
                      {def && <a href={toolUrl(def.id, rec?.id ?? (is34 && c.client.trim() ? `client:${c.client.trim()}` : undefined))} target="_blank" rel="noopener noreferrer" className={linkCls} title={empty ? `L'outil ${def.id} ne contient encore rien. Ouvrir dans un nouvel onglet.` : rec ? `Ouvrir dans un nouvel onglet : ${rec.label}` : `Ouvrir l'outil ${def.id} dans un nouvel onglet`}>
                        {def.label} ({def.id}){empty ? ' · vide' : ''}<NewTab size={13} /></a>}
                    </div>
                  </div>
                );
              })}
              {removedPoints.map(key => {
                const v = c.checks![key];
                return <div key={key} className="p-2 text-[11px] text-slate-500">Point retiré de la liste · {CHECK_STATE.find(x => x[0] === v.state)?.[1] || 'non renseigné'}{v.note ? ` · ${v.note}` : ''}</div>;
              })}
            </div>
          </Fold>
        </section>

        <section className="space-y-3">
          <StepTitle n={4} done={done[3]} sub="Dire si la réclamation est justifiée. Justifiée : trouver la cause, décider de la solution et de la mesure. Non justifiée : préparer la réponse.">Résultat de l'enquête et ce qui en découle</StepTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Après vérification, la réclamation est…">
              <select className={inputCls} value={c.verdict || ''} onChange={e => set({ verdict: e.target.value as Complaint['verdict'] })}>
                <option value="">À vérifier</option>{Object.entries(VERDICTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            {!unfounded && (
              <Field label="D'où vient le problème (processus)" hint={c.processId ? `Typique : ${TYPICAL[c.processId]}.` : 'Le processus qui a rendu le problème possible, pas la personne. Un problème trouvé à l\'étape 3 le propose.'}>
                <select className={inputCls} value={c.processId} onChange={e => set({ processId: e.target.value })}>
                  <option value="">À qualifier</option>
                  {PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}
                </select>
              </Field>
            )}
          </div>
          {unfounded && (
            <Field label="Arguments pour contester" hint="Les faits et les pièces qui montrent que la réclamation n'est pas justifiée : contrat signé, bon de livraison, réception sans réserve, photo. La réponse au client se prépare à l'étape 5.">
              <textarea className={inputCls} rows={3} value={c.defense || ''} onChange={e => set({ defense: e.target.value })} />
            </Field>
          )}
          {justified && (
            <>
              <div className="grid gap-3 lg:grid-cols-3">
                <Field label="Cause trouvée" hint="Pourquoi cela s'est produit, en une phrase. Pour aller plus loin : atelier 5 Pourquoi.">
                  <textarea className={inputCls} rows={3} value={c.cause || ''} onChange={e => set({ cause: e.target.value })} />
                </Field>
                <Field label="Mesure pour que cela ne se reproduise pas" hint="La consigne corrigée, le contrôle ajouté, la personne formée.">
                  <textarea className={inputCls} rows={3} value={c.correction || ''} onChange={e => set({ correction: e.target.value })} />
                </Field>
                <Field label="Solution définitive pour le client" hint="Avoir, remplacement, reprise, geste commercial. Elle figure dans le courrier de l'étape 5.">
                  <textarea className={inputCls} rows={3} value={c.solution || ''} onChange={e => set({ solution: e.target.value })} />
                </Field>
              </div>
              {similar.length > 0 && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
                  <strong>Déjà vu :</strong> {similar.length} autre(s) réclamation(s) « {motifLabel(state.params, c.category)} » dans {processLabel(c.processId)} en 12 mois :{' '}
                  {similar.slice(0, 5).map((x, i) => <span key={x.id}>{i > 0 && ', '}<a href={toolUrl('2.3', x.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono underline">{x.ref}<NewTab size={11} /></a></span>)}. Si la cause est la même, l'atelier 5 Pourquoi la traite une fois pour toutes.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {redBin && <Button onClick={toNc}>{linkedNc ? `Fiche du bac rouge ${linkedNc.ref}` : 'Isoler les pièces défectueuses (bac rouge 5.1)'}<NewTab /></Button>}
                <Button onClick={toAnalysis}><SearchCheck size={14} />{linkedAn ? `Atelier ${linkedAn.ref}` : 'Chercher la cause (atelier 5 Pourquoi)'}<NewTab /></Button>
                <Button onClick={toAction}><ListPlus size={14} />Créer l'action corrective</Button>
                {actions.map(a => <Button key={a.id} kind="ghost" className="!px-2 !py-1" onClick={() => leave(() => nav.openAction(a.id))}>Action : {a.plan[0]?.text || a.constat} (avant le {frDate(a.deadline)})</Button>)}
              </div>
            </>
          )}
          {!!c.verdict && (
            <Fold key={`c4${mode}`} title="Coût du litige et facture bloquée" full={full} filled={!!(complaintDirect(c) || c.hours || c.blockedInvoice)}>
              {!unfounded && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Field label="Avoir accordé (€ HT)"><NumInput value={c.credit} onChange={v => set({ credit: v })} /></Field>
                    <Field label="Transport, déplacement (€ HT)"><NumInput value={c.logistics} onChange={v => set({ logistics: v })} /></Field>
                    <Field label="Reprise, matière (€ HT)"><NumInput value={c.rework} onChange={v => set({ rework: v })} /></Field>
                    <Field label="Autres frais (€ HT)"><NumInput value={c.cost} onChange={v => set({ cost: v })} /></Field>
                    <Field label="Heures passées à traiter" hint={`Valorisées à ${formatValue(state.params.hourlyRate, '€')}/h (réglé dans 5.2).`}><NumInput value={c.hours} onChange={v => set({ hours: v })} /></Field>
                  </div>
                  <p className="text-[11px] text-slate-700">Coût du litige : <strong>{formatValue(complaintCost(c, state.params), '€')}</strong>{c.hours ? ` dont ${formatValue(hoursCost(c.hours, state.params), '€')} d'heures` : ''}{complaintDirect(c) || c.hours ? ', compté dans la non-qualité (5.2).' : '. Laissez vide s\'il n\'y a pas eu de frais.'}</p>
                </>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Facture bloquée par le client (€ HT)" hint="Montant qu'il ne paie pas tant que le litige dure."><NumInput value={c.blockedInvoice ?? null} onChange={v => set({ blockedInvoice: v })} /></Field>
                <Field label="Facture débloquée ou payée le" hint={c.blockedInvoice && !c.unblockedAt ? 'Elle reste comptée comme bloquée tant que cette date manque.' : undefined}>
                  <input type="date" className={inputCls} value={c.unblockedAt || ''} disabled={!c.blockedInvoice} onChange={e => set({ unblockedAt: e.target.value })} />
                </Field>
              </div>
            </Fold>
          )}
          {approval && (
            <div className={`space-y-2 rounded-lg border p-3 ${c.approval?.by ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="text-[11px] font-semibold text-slate-900">Validation de la direction : {approvalWhy}</div>
              {c.approval?.by ? (
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-900">Validé par {c.approval.by} le {frDate(c.approval.at.slice(0, 10))}{c.approval.note ? ` · ${c.approval.note}` : ''}
                  {!teamView && <Button kind="ghost" className="!px-2 !py-1" onClick={() => set({ approval: undefined })}>Retirer la validation</Button>}</p>
              ) : teamView ? (
                <p className="text-[11px] text-amber-950">En attente de {directorName(state) || 'la direction'}. Le client sera informé après sa validation.</p>
              ) : (
                <div className="grid items-end gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Field label="Validé par"><input className={inputCls} defaultValue={author} list="people" id="cp-approver" /></Field>
                  <Field label="Remarque"><input className={inputCls} id="cp-approval-note" /></Field>
                  <Button kind="primary" onClick={() => set({ approval: { by: (document.getElementById('cp-approver') as HTMLInputElement).value.trim() || author || 'Direction', at: nowLocal(), note: (document.getElementById('cp-approval-note') as HTMLInputElement).value.trim() } })}>Valider</Button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <StepTitle n={5} done={done[4]} sub="Dire au client ce que l'enquête a conclu et ce qui va se passer.">Notification au client du résultat et de ce qui en découle</StepTitle>
          {locked && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-950">{locked}</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client informé le">
              <span className="flex gap-1.5"><input type="datetime-local" className={inputCls} value={c.resultSentAt || ''} disabled={!c.verdict || !!locked} onChange={e => set({ resultSentAt: e.target.value })} /><Button className="shrink-0 !px-2" disabled={!c.verdict || !!locked} onClick={() => set({ resultSentAt: nowLocal(), resultVia: c.resultVia || c.contactVia })}>Maintenant</Button></span>
            </Field>
            <Via label="Informé par" via={c.resultVia} note={c.resultViaNote} onVia={v => set({ resultVia: v })} onNote={v => set({ resultViaNote: v })} />
          </div>
          {c.verdict
            ? <Fold key={`l5${mode}`} title="Courrier au client : texte, envoi et mail envoyé" full={full} filled={!!(c.letters?.[resultKind] || c.resultLink)}>
                <Letter title={resultTitle} model={complaintLetter(c, resultKind, company, !!biz)} edited={c.letters?.[resultKind]} onEdit={v => set({ letters: { ...c.letters, [resultKind]: v } })}
                  to={addr} subject={subject} link={c.resultLink} onLink={!c.resultVia || c.resultVia === 'mail' ? (v => set({ resultLink: v })) : undefined}
                  onSent={() => set({ resultSentAt: nowLocal(), resultVia: c.resultVia || 'mail' })} locked={locked || (badAddr ? BAD_EMAIL : undefined)} onError={setError} />
              </Fold>
            : <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">Le courrier se prépare dès que l'enquête est conclue (étape 4).</p>}
        </section>

        <section className="space-y-3">
          <StepTitle n={6} done={done[5]} sub="Le problème est réglé, puis un appel de courtoisie à J+15 vérifie que le client est satisfait.">Clôture</StepTitle>
          {!!c.rounds?.length && (
            <ul className="space-y-0.5 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
              {c.rounds.map((r, i) => <li key={i}><strong>Solution {i + 1}, refusée</strong> : {r.solution || 'non notée'}{r.note ? ` · « ${r.note} »` : ''} (réglée le {frDate(r.resolvedAt)}, appel le {frDate(r.courtesyAt)})</li>)}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Problème réglé le" hint={!c.contactedAt ? 'Recontactez d\'abord le client (étape 2).' : undefined}><input type="date" className={inputCls} value={c.resolvedAt} disabled={!c.contactedAt} onChange={e => set({ resolvedAt: e.target.value })} /></Field>
            <Field label="Appel de courtoisie le" hint={c.resolvedAt ? `Prévu vers le ${frDate(courtesyDue(c))}` : undefined}>
              <span className="flex gap-1.5"><input type="date" className={inputCls} value={c.courtesyAt} disabled={!c.resolvedAt} onChange={e => set({ courtesyAt: e.target.value })} /><Button className="shrink-0 !px-2" disabled={!c.resolvedAt} onClick={() => set({ courtesyAt: isoDate(new Date()) })}>Aujourd'hui</Button></span>
            </Field>
            <Field label="Le client est-il satisfait ?">
              <select className={inputCls} value={c.satisfied || ''} disabled={!c.courtesyAt} onChange={e => set({ satisfied: e.target.value as Complaint['satisfied'] })}>
                <option value="">À noter</option><option value="oui">Oui</option><option value="non">Non</option><option value="injoignable">Injoignable</option>
              </select>
            </Field>
            <Field label={c.satisfied === 'injoignable' ? 'Tentatives faites (appels, mails)' : 'Ce que dit le client'}><input className={inputCls} value={c.courtesyNote || ''} disabled={!c.courtesyAt} onChange={e => set({ courtesyNote: e.target.value })} /></Field>
          </div>
          {st === 'unsatisfied' && (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-900">
              Le client n'est pas satisfait : la réclamation reste ouverte.
              <Button className="!px-2 !py-1" onClick={reopen}><RotateCcw size={13} />Rouvrir avec une autre solution</Button>
            </div>
          )}
          {c.forcedClose ? (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-[11px] text-slate-800">
              <strong>Close par la direction</strong> ({c.forcedClose.by}, le {frDate(c.forcedClose.at.slice(0, 10))}) : {c.forcedClose.reason}
              {!teamView && <Button kind="ghost" className="!px-2 !py-1" onClick={() => set({ forcedClose: undefined })}>Rouvrir</Button>}
            </div>
          ) : (
            c.resolvedAt && st !== 'unsatisfied' && (todo.length
              ? <p className="text-[11px] font-semibold text-amber-800">{isClosed(c) ? 'Dossier de clôture incomplet' : 'Pour clore, il reste'} : {todo.join(' ; ')}.</p>
              : !isClosed(c) && <p className="text-[11px] font-semibold text-emerald-700">Tout est en place pour clore.</p>)
          )}
          {!c.forcedClose && !isClosed(c) && !teamView && (forcing ? (
            <div className="space-y-2 rounded-lg border border-slate-300 p-3">
              <Field label="Pourquoi clore sans le dossier complet ?" hint="Ce motif reste écrit dans la fiche et le compteur « closes avec un dossier incomplet » le montre à la direction."><textarea className={inputCls} rows={2} value={reason} onChange={e => setReason(e.target.value)} /></Field>
              <div className="flex gap-2"><Button kind="primary" onClick={forceClose}>Clore avec ce motif</Button><Button kind="ghost" onClick={() => { setForcing(false); setReason(''); }}>Annuler</Button></div>
            </div>
          ) : (
            <Button kind="ghost" onClick={() => setForcing(true)}>Clore sans le dossier complet</Button>
          ))}
          {canErase && <Button kind="ghost" onClick={() => { if (window.confirm('Effacer les données personnelles du client dans cette fiche ? Les dates, processus, motifs et coûts sont conservés.')) { update(d => { d.complaints[c.id] = anonymize(c); }); onClose(); } }}>Effacer les données personnelles du client</Button>}
        </section>
      </div>
      <datalist id="emails-cp">{known.map(x => <option key={x} value={x} />)}</datalist>
      <datalist id="clients-cp">{clientsOf(state as State).map(x => <option key={x} value={x} />)}</datalist>
    </Modal>
  );
}
