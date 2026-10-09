// Tool 3.1, purchasing sectors: the menu of a sector in the table of suppliers (backup wanted or not, comparison side by side, Plan B of 1.2, switch to the
// backup), the notes under its band (backup in service, history of the switches) and the sheets they open.
import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Sector } from '../../domain/types';
import { newRisk } from '../../domain/risk';
import { frDate, isoDate } from '../../domain/periods';
import { claimsOf, debitState, lastRating, OPEN_STATES, proposedRating, ratingParts, ratingScore, severityOf, statusOf, supplierCfg, supplierFacts, SUPPLIER_STATUS } from '../../domain/suppliers';
import {
  activeSwitch, COVER_LABEL, endSwitch, sectorCover, sectorHasRisk, sectorRanking, sectorRiskText, sectorState, startSwitch, switchReason, SWITCH_REASONS, type Ranked,
} from '../../domain/sectors';
import { defaultProcess } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, Modal, NumInput } from '../common';
import { DateField } from './ClaimSheet';
import type { Nav } from '../tools';

// The menu of a sector (in the last column of its band) and the sheets it opens: the choice of backup, the comparison, the switch to the backup.
export function SectorMenu({ sec, nav }: { sec: Sector; nav: Nav }) {
  const { state, update, author } = useStore();
  const [switching, setSwitching] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [covering, setCovering] = useState(false);
  const [menu, setMenu] = useState(false);
  if (!state) return null;
  const now = new Date();
  const live = sectorRanking(state, sec, now).filter(y => y.role !== 'out');
  const st = sectorState(state, sec, now), sw = activeSwitch(sec), hasRisk = sectorHasRisk(state, sec), cover = sectorCover(sec);
  const auto = () => update(d => { const sc = d.sectors[sec.id]; sc.manual = false; sc.order = []; });
  const risk = () => { const r = { ...newRisk(defaultProcess('P3')), ...sectorRiskText(state, sec), family: 'relais' as const }; update(d => { d.risks[r.id] = r; }); nav.openRisk(r.id); };
  const actions: [string, () => void][] = [
    ['Secours du secteur…', () => setCovering(true)],
    ...(live.length > 1 ? [['Comparer les fournisseurs', () => setComparing(true)] as [string, () => void]] : []),
    ...(live.length > 1 && !sw ? [['Principal indisponible', () => setSwitching(true)] as [string, () => void]] : []),
    ...(sec.manual ? [["Reprendre l'ordre de la note", auto] as [string, () => void]] : []),
    ...(live.length > 0 && !hasRisk && (st !== 'ok' || cover === 'unique') ? [['Créer le risque (Plans B, 1.2)', risk] as [string, () => void]] : []),
  ];
  return (
    <span className="relative flex h-7 w-7 items-center justify-center" onKeyDown={e => { if (e.key === 'Escape') setMenu(false); }}>
      <button type="button" aria-label={`Actions du secteur ${sec.name}`} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="rounded p-1 text-slate-600 hover:bg-slate-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-delacour-primary"><MoreHorizontal size={16} /></button>
      {menu && <>
        <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 text-[11px] shadow-lg">
          {actions.map(([label, run]) => <button key={label} type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left text-slate-800 hover:bg-slate-50" onClick={() => { setMenu(false); run(); }}>{label}</button>)}
        </div>
      </>}
      {covering && <CoverSheet sec={sec} onClose={() => setCovering(false)} />}
      {comparing && <CompareSheet sec={sec} ranking={live} onClose={() => setComparing(false)} />}
      {switching && live.length > 1 && <SwitchSheet sec={sec} ranking={live} author={author} onClose={() => setSwitching(false)} />}
    </span>
  );
}

// Under the band of a sector: the backup in service and its return (always), what is done if the single supplier stops, the history of the switches (open sector)
export function SectorNotes({ sec, open }: { sec: Sector; open: boolean }) {
  const { state, update } = useStore();
  if (!state) return null;
  const sw = activeSwitch(sec), note = open && sectorCover(sec) === 'unique' ? sec.coverNote?.trim() : '', history = open ? sec.switches || [] : [];
  if (!sw && !note && !history.length) return null;
  const back = () => update(d => { d.sectors[sec.id] = endSwitch(d.sectors[sec.id]); });
  return (
    <div role="row" className="space-y-1.5 border-t border-slate-100 px-3 py-2 text-[11px]">
      <div role="cell" className="space-y-1.5">
        {note && <p className="text-slate-700"><strong>S'il s'arrête :</strong> {note}</p>}
        {sw && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-amber-950">
            <span><strong>{state.suppliers[sw.toId]?.name || 'Le secours'}</strong> remplace <strong>{state.suppliers[sw.fromId]?.name || 'le principal'}</strong> depuis le {frDate(sw.at)} ({switchReason(sw).toLowerCase()}){sw.expectedBack ? `, retour prévu le ${frDate(sw.expectedBack)}` : ''}.</span>
            <Button className="!py-1" onClick={back}>Le principal est de retour</Button>
          </div>
        )}
        {history.length > 0 && (
          <details className="text-slate-700">
            <summary className="cursor-pointer font-semibold text-delacour-primary">Historique des bascules ({history.length})</summary>
            <ul className="mt-1 space-y-0.5">
              {[...history].sort((a, b) => (a.at < b.at ? 1 : -1)).map(w => (
                <li key={w.id}><span className="font-mono text-slate-600">{frDate(w.at)}</span> {state.suppliers[w.toId]?.name || 'Le secours'} remplace {state.suppliers[w.fromId]?.name || 'le principal'} ({switchReason(w).toLowerCase()}) · {w.backAt ? `principal de retour le ${frDate(w.backAt)}` : 'en cours'}{w.by ? ` · ${w.by}` : ''}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

// What the company wants for the sector: a backup, none because it is not needed, or a single supplier nobody can replace (and what is done if it stops)
const COVER_TEXT = {
  backup: 'Deux fournisseurs ou plus : le meilleur est le principal, l’autre est prêt à le remplacer.',
  none: 'Un seul fournisseur suffit : si besoin, on en cherche un autre dans les délais normaux (achat occasionnel, prestation qui peut attendre…).',
  unique: 'Rien d’équivalent sur le marché, ou trop spécifique. L’entreprise écrit ce qu’elle fait si ce fournisseur s’arrête.',
} as const;
function CoverSheet({ sec, onClose }: { sec: Sector; onClose(): void }) {
  const { update } = useStore();
  const [mode, setMode] = useState(sectorCover(sec));
  const [target, setTarget] = useState<number | null>(sectorCover(sec) === 'backup' ? (sec.target ?? 2) : 2);
  const [note, setNote] = useState(sec.coverNote || '');
  const save = () => { update(d => { const sc = d.sectors[sec.id]; if (!sc) return; sc.cover = mode === 'backup' ? undefined : mode; sc.target = mode === 'backup' && target && target > 2 ? Math.round(target) : undefined; sc.coverNote = mode === 'unique' ? note.trim() : undefined; }); onClose(); };
  return (
    <Modal title={`Secours du secteur : ${sec.name}`} subtitle="Dites ce que l'entreprise veut pour ce secteur" onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" onClick={save}>Enregistrer</Button></>}>
      <fieldset className="space-y-2">
        <legend className="sr-only">Secours du secteur</legend>
        {(Object.keys(COVER_LABEL) as (keyof typeof COVER_LABEL)[]).map(k => (
          <label key={k} className={`block cursor-pointer rounded-lg border p-2.5 text-xs ${mode === k ? 'border-delacour-primary bg-delacour-primary/5' : 'border-slate-200'}`}>
            <span className="flex items-start gap-2"><input type="radio" name="cover" className="mt-0.5" checked={mode === k} onChange={() => setMode(k)} />
              <span><strong className="block text-slate-900">{COVER_LABEL[k]}</strong><span className="text-[11px] text-slate-600">{COVER_TEXT[k]}</span></span></span>
            {mode === k && k === 'backup' && <span className="mt-2 flex items-center gap-2 pl-6 text-[11px] text-slate-700">Nombre de fournisseurs souhaités <NumInput className="!w-16" value={target} placeholder="2" onChange={v => setTarget(v === null ? null : Math.max(2, v))} /></span>}
            {mode === k && k === 'unique' && (
              <span className="mt-2 block pl-6"><textarea className={`${inputCls} min-h-[4.5rem]`} value={note} aria-label="Ce qui est fait si le fournisseur s'arrête" placeholder="Si ce fournisseur s'arrête, nous… (stock de sécurité, contrat avec délai de reprise, documents et accès gardés chez nous, autre solution : précisez)" onChange={e => setNote(e.target.value)} />
                <span className="mt-1 block text-[11px] text-slate-500">Tant que rien n'est écrit, le secteur reste signalé. Le texte peut devenir le Plan B du risque (outil 1.2) depuis le menu du secteur.</span></span>
            )}
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}

// The suppliers of a sector side by side, criterion by criterion as they were rated (price included)
function CompareSheet({ sec, ranking, onClose }: { sec: Sector; ranking: Ranked[]; onClose(): void }) {
  const { state } = useStore();
  if (!state) return null;
  const now = new Date(), cfg = supplierCfg(state.params);
  const cols = ranking.map(y => {
    const f = supplierFacts(state, y.x, now), pr = proposedRating(state, y.x, now), last = lastRating(y.x), claims = claimsOf(state, y.x.id);
    const parts = last ? ratingParts(last) : [], heavy = f.claims.filter(d => severityOf(d) !== 'minor').length;
    return [
      y.role === 'main' ? 'Principal' : `Secours ${y.rank}`, y.cls ? `${y.cls} · ${y.score} / 100` : 'non noté',
      ...cfg.criteria.map(c => { const p = parts.find(q => q.key === c.key); return p ? (p.points === null ? 'non évalué' : `${p.points} / ${p.max}`) : '—'; }),
      `${ratingScore({ scores: pr.parts })} / 100`, String(f.count), String(heavy), f.recognisedPct === null ? '—' : `${f.recognisedPct} %`, f.avgResponseDays === null ? '—' : `${String(f.avgResponseDays).replace('.', ',')} j`,
      f.receipts ? `${f.late} sur ${f.receipts}` : 'non suivies', claims[0] ? frDate(claims[0].date) : '—', String(f.claims.filter(d => OPEN_STATES.includes(debitState(d, now, state.params))).length), SUPPLIER_STATUS[statusOf(y.x)].label, y.ready.ok ? 'Oui' : 'Non',
    ];
  });
  const rows = ['Rôle', 'Dernière note', ...cfg.criteria.map(c => `${c.label || 'Critère'} (dernière note)`), "Note d'après les faits d'aujourd'hui", 'Réclamations sur 12 mois', 'dont majeures ou critiques', 'Reconnues par le fournisseur', 'Délai de réponse', 'Livraisons ou prestations en retard', 'Dernière réclamation', 'Réclamations ouvertes', 'Statut', 'Prêt à prendre le relais'];
  return (
    <Modal wide title={`Comparer les fournisseurs : ${sec.name}`} subtitle="Les notes sont celles de la dernière évaluation de chacun ; la ligne « d'après les faits » est recalculée aujourd'hui." onClose={onClose}
      footer={<Button kind="primary" onClick={onClose}>Fermer</Button>}>
      <div className="overflow-x-auto text-[11px]">
        <table className="w-full min-w-[420px] border-separate border-spacing-0 text-left">
          <caption className="sr-only">Comparaison des fournisseurs du secteur {sec.name}</caption>
          <thead><tr><th scope="col" className="border-b border-slate-200 py-1 pr-2 font-semibold text-slate-500">&nbsp;</th>{ranking.map(y => <th key={y.x.id} scope="col" className="border-b border-slate-200 px-2 py-1 font-semibold text-slate-900">{y.x.name}</th>)}</tr></thead>
          <tbody>{rows.map((l, i) => <tr key={`${l}${i}`}><th scope="row" className="border-b border-slate-100 py-1 pr-2 text-left font-normal text-slate-600">{l}</th>{cols.map((c, j) => <td key={ranking[j].x.id} className="border-b border-slate-100 px-2 py-1 font-mono">{c[i]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Modal>
  );
}

// The main supplier cannot answer: which backup takes over, why, and when the main one should be back
function SwitchSheet({ sec, ranking, author, onClose }: { sec: Sector; ranking: Ranked[]; author: string; onClose(): void }) {
  const { update } = useStore();
  const backups = ranking.slice(1);
  const [toId, setToId] = useState((backups.find(y => y.ready.ok) || backups[0]).x.id);
  const [reason, setReason] = useState<string>('rupture');
  const [note, setNote] = useState('');
  const [back, setBack] = useState('');
  const go = () => { update(d => { d.sectors[sec.id] = startSwitch(d.sectors[sec.id], ranking[0].x.id, toId, { reason, reasonNote: note, expectedBack: back, by: author }); }); onClose(); };
  return (
    <Modal title={`${ranking[0].x.name} ne peut pas répondre`} subtitle={`Secteur ${sec.name}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" onClick={go}>Mettre le secours en service</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Le secours qui prend le relais">
          <select className={inputCls} value={toId} onChange={e => setToId(e.target.value)}>{backups.map(y => <option key={y.x.id} value={y.x.id}>{y.x.name}{y.ready.ok ? '' : ' (non éprouvé)'}</option>)}</select>
        </Field>
        <Field label="Pourquoi le principal ne peut pas répondre">
          <select className={inputCls} value={reason} onChange={e => setReason(e.target.value)}>{Object.entries(SWITCH_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        {reason === 'autre' && <Field label="Précisez"><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></Field>}
        <Field label="Retour prévu du principal" hint="Facultatif : une tâche rappelle cette date."><DateField value={back} onChange={setBack} /></Field>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">La bascule apparaît dans l'historique du secteur et dans celui de chaque fournisseur. Elle se termine avec « Le principal est de retour » (aujourd'hui : {frDate(isoDate(new Date()))}).</p>
    </Modal>
  );
}
