// Tool 5.1 "Bac rouge": isolate any doubtful part within 5 minutes, label it, decide within 24 h.
// The record carries its cost (tool 5.2) and opens a five whys workshop (5.3) or a debit note (3.1).
import { useEffect, useState } from 'react';
import { FileDown, Plus, Printer, SearchCheck, Trash2 } from 'lucide-react';
import type { Nc, State } from '../../domain/types';
import {
  causeLabel, compensatingRevenue, cnqMonth, DECISION_HOURS, DECISIONS, NC_CAUSES, NC_STATE, ncCost, ncState, newAnalysis, newNc, qualityInsights,
} from '../../domain/quality';
import { applyQualityExample } from '../../domain/qualityExamples';
import { labelsPdf } from '../../domain/qualityPdf';
import { formatHours, frStamp, hoursBetween, nowLocal, PROCESS_IDS, processLabel } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { periodOfDate } from '../../domain/periods';
import { newDebit } from '../../domain/operations';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { downloadFile } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

type Filter = 'open' | 'decided' | 'all';

export function BacRouge({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, author } = useStore();
  const [open, setOpen] = useState<Nc | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.ncs[focus]) { setOpen(state.ncs[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.ncs).sort((a, b) => (a.at < b.at ? 1 : -1));
  const declare = () => setOpen(newNc(state, author));
  const labels = (xs: Nc[]) => downloadFile('Etiquettes-bac-rouge.pdf', labelsPdf(xs, { company: state.settings.companyName, date: now }), 'application/pdf');

  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Bac rouge : toute pièce douteuse isolée sous 5 minutes" text="Déclarez chaque défaut dès qu'il est vu, étiquetez la pièce, puis décidez sous 24 h : rebut, retouche, dérogation ou retour fournisseur. Chaque fiche est chiffrée dans le coût de non-qualité (outil 5.2).">
          <Button kind="primary" onClick={declare}><Plus size={14} />Déclarer un défaut</Button>
          <Button onClick={() => update(d => applyQualityExample(d))}>Voir un exemple traité</Button>
        </Empty>
        <Impunity />
        {open && <NcSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }

  const inBin = all.filter(n => ncState(n, now) !== 'decided');
  const late = inBin.filter(n => ncState(n, now) === 'late');
  const month = cnqMonth(state, periodOfDate(now));
  const monthCount = all.filter(n => n.at.slice(0, 7) === periodOfDate(now)).length;
  const shown = filter === 'open' ? inBin : filter === 'decided' ? all.filter(n => n.decision) : all;
  const insights = qualityInsights(state, periodOfDate(now), now).filter(i => ['late', '5p', 'unq'].includes(i.key));

  return (
    <div className="space-y-4">
      <Summary title="Qu'y a-t-il dans le bac rouge ?" insights={insights} tiles={<>
        <Tile title="En quarantaine" value={String(inBin.length)} sub={inBin.length ? `la plus ancienne depuis ${formatHours(Math.max(...inBin.map(n => hoursBetween(n.at, now) || 0)))}` : 'bac rouge vide'} tone={inBin.length ? 'warn' : 'ok'} />
        <Tile title="Décisions en retard" value={String(late.length)} sub={`plus de ${DECISION_HOURS} h sans décision`} tone={late.length ? 'alert' : undefined} />
        <Tile title="Déclarés ce mois" value={String(monthCount)} sub="un défaut déclaré est un défaut qui ne part pas chez le client" />
        <Tile title="Coût du mois" value={formatValue(month.total, '€')} sub="détail dans l'outil 5.2" />
      </>} />
      <Impunity />

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Fiches de non-conformité" text="Une fiche par défaut. La quarantaine se termine par une décision datée et visée.">
          <Button kind="primary" onClick={declare}><Plus size={14} />Déclarer un défaut</Button>
          <Button onClick={() => labels(inBin.length ? inBin : all.slice(0, 2))} title="Étiquettes des pièces en quarantaine, deux par page"><FileDown size={14} />Étiquettes (PDF)</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En quarantaine', inBin.length], ['decided', 'Décidées', all.length - inBin.length], ['all', 'Toutes', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">{filter === 'open' ? 'Bac rouge vide : aucune pièce en attente de décision.' : 'Aucune fiche.'}</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(n => <NcRow key={n.id} s={state} n={n} now={now} open={() => setOpen(n)} />)}
          </ul>
        )}
      </Card>
      <Method rule="Une non-conformité qui n'est pas isolée dans les 5 minutes finit tôt ou tard chez le client."
        steps={[['Stop et étiquette sous 5 min', "Dès qu'un défaut est vu ou soupçonné, l'opérateur étiquette la pièce, sans hésiter."], ['Bac rouge fermé', "La pièce part dans le bac rouge sous clé. Jamais sur l'établi."], ['Décision chaque matin', "Le responsable inspecte le bac à heure fixe et décide : rebut, retouche, dérogation ou retour."]]}
        tips={["Remercier la personne qui déclare : elle vient d'éviter une réclamation.", 'Seul le responsable désigné peut sortir une pièce du bac rouge.']} />
      {open && <NcSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function Impunity() {
  return <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700"><strong className="text-slate-900">Déclarer n'expose à aucune sanction.</strong> Celui qui dépose une pièce au bac rouge protège le client et l'entreprise. Une pièce cachée finit en réclamation.</p>;
}

function NcRow({ s, n, now, open }: { s: State; n: Nc; now: Date; open(): void }) {
  const st = ncState(n, now);
  const cost = ncCost(n, s.params);
  const age = hoursBetween(n.at, now);
  return (
    <Row onClick={open}
      lead={<span className="w-[92px] shrink-0 font-mono text-[11px] font-semibold text-slate-700">{n.ref}</span>}
      title={n.description || 'Défaut à décrire'}
      sub={[n.item, n.where, n.cause ? causeLabel(n.cause) : '', n.processId ? n.processId : ''].filter(Boolean).join(' · ')}
      right={<><span className="block font-semibold text-slate-800">{n.by}</span>{st === 'decided'
        ? <span>{DECISIONS.find(d => d.key === n.decision)?.label}{cost ? ` · ${formatValue(cost, '€')}` : ''}</span>
        : <span className={st === 'late' ? 'font-semibold text-red-700' : ''}>depuis {formatHours(age || 0)}</span>}</>}
      badge={<StatusBadge level={NC_STATE[st].tone} text={NC_STATE[st].label} />} />
  );
}

export function NcSheet({ initial, onClose, nav }: { initial: Nc; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [n, setN] = useState<Nc>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.ncs[n.id];
  const set = (p: Partial<Nc>) => setN(x => ({ ...x, ...p }));
  const setCost = (p: Partial<Nc['cost']>) => set({ cost: { ...n.cost, ...p } });
  const cost = ncCost(n, state.params);
  const st = ncState(n);
  const valid = () => {
    if (!n.description.trim()) { setError('Décrivez le défaut constaté.'); return false; }
    if (!n.item.trim() && !n.where.trim()) { setError('Indiquez la pièce ou le poste.'); return false; }
    return true;
  };
  const commit = (x: Nc) => update(d => { d.ncs[x.id] = x; });
  const close = () => { if (JSON.stringify(n) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { commit(n); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer la fiche ${n.ref} ?`)) { update(d => { delete d.ncs[n.id]; }); onClose(); } };
  const decide = (key: Nc['decision']) => set(n.decision === key ? { decision: '', decidedAt: '', decidedBy: '' } : { decision: key, decidedAt: n.decidedAt || nowLocal(), decidedBy: n.decidedBy || author });
  const workshop = () => {
    if (!valid()) return;
    if (n.analysisId && state.analyses[n.analysisId]) { commit(n); onClose(); nav.tool('5.3', n.analysisId); return; }
    const a = newAnalysis(state, { kind: 'nc', id: n.id }, n.description, n.processId || 'P3');
    const x = { ...n, analysisId: a.id };
    update(d => { d.ncs[x.id] = x; d.analyses[a.id] = { ...a, participants: [n.by, n.decidedBy].filter(Boolean).join(', ') }; });
    onClose();
    nav.tool('5.3', a.id);
  };
  const debit = () => {
    if (!valid()) return;
    const linked = Object.values(state.debits).find(x => x.ncId === n.id);
    if (linked) { commit(n); onClose(); nav.tool('3.1', linked.id); return; }
    const dbt = { ...newDebit(state, n.supplierId || ''), date: n.at.slice(0, 10), defect: `${n.description}${n.item ? ` (${n.item})` : ''}`, reworkHours: n.cost.reworkHours, otherCost: n.cost.scrap, ncId: n.id };
    update(d => { d.ncs[n.id] = n; d.debits[dbt.id] = dbt; });
    onClose();
    nav.tool('3.1', dbt.id);
  };
  const label = () => downloadFile(`Etiquette-${n.ref}.pdf`, labelsPdf([n], { company: state.settings.companyName, date: new Date() }), 'application/pdf');

  return (
    <Modal wide onClose={close} title={isNew ? 'Déclarer un défaut' : `Fiche ${n.ref}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{n.ref} · isolé le {frStamp(n.at)} <StatusBadge level={NC_STATE[st].tone} text={NC_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={label}><FileDown size={14} />Étiquette</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. Constat, à remplir tout de suite</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Défaut constaté (factuel)"><input className={inputCls} value={n.description} placeholder="Ex. : perçage décalé de 2 mm" onChange={e => set({ description: e.target.value })} /></Field>
            <Field label="Pièce, lot ou affaire"><input className={inputCls} value={n.item} onChange={e => set({ item: e.target.value })} /></Field>
            <Field label="Poste, machine ou chantier"><input className={inputCls} value={n.where} list="nc-where" onChange={e => set({ where: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Quantité isolée"><NumInput value={n.qty} onChange={v => set({ qty: v })} /></Field>
              <Field label="Isolé le"><input type="datetime-local" className={inputCls} value={n.at} onChange={e => set({ at: e.target.value })} /></Field>
            </div>
            <Field label="Déclaré par"><input className={inputCls} value={n.by} list="people" onChange={e => set({ by: e.target.value })} /></Field>
            <Field label="Cause immédiate">
              <select className={inputCls} value={n.cause} onChange={e => set({ cause: e.target.value as Nc['cause'] })}>
                <option value="">À préciser</option>
                {NC_CAUSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Origine">
              <select className={inputCls} value={n.origin} onChange={e => set({ origin: e.target.value as Nc['origin'] })}>
                <option value="interne">Détecté chez nous</option>
                <option value="fournisseur">Défaut fournisseur</option>
                <option value="client">Retour ou réclamation client</option>
              </select>
            </Field>
            {n.origin === 'fournisseur' && (
              <Field label="Fournisseur (outil 3.1)">
                <select className={inputCls} value={n.supplierId || ''} onChange={e => set({ supplierId: e.target.value || undefined })}>
                  <option value="">À choisir…</option>
                  {Object.values(state.suppliers).sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubTitle>2. Décision sous {DECISION_HOURS} h</SubTitle>
            {st !== 'decided' && <span className={`text-[11px] font-semibold ${st === 'late' ? 'text-red-700' : 'text-amber-800'}`}>En quarantaine depuis {formatHours(hoursBetween(n.at, new Date()) || 0)}</span>}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Décision">
            {DECISIONS.map(d => (
              <button key={d.key} type="button" role="radio" aria-checked={n.decision === d.key} onClick={() => decide(d.key)}
                className={`rounded-lg border p-2 text-left ${n.decision === d.key ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className="block text-xs font-bold text-slate-900">{d.label}</span>
                <span className="block text-[11px] text-slate-600">{d.text}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">Visa : {d.visa.toLowerCase()}</span>
              </button>
            ))}
          </div>
          {n.decision && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Décidé par (visa)"><input className={inputCls} value={n.decidedBy} list="people" onChange={e => set({ decidedBy: e.target.value })} /></Field>
              <Field label="Le"><input type="datetime-local" className={inputCls} value={n.decidedAt} onChange={e => set({ decidedAt: e.target.value })} /></Field>
              <Field label="Justification"><input className={inputCls} value={n.decisionNote} onChange={e => set({ decisionNote: e.target.value })} /></Field>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <SubTitle>3. Coût et processus en cause (outil 5.2)</SubTitle>
          <div className="grid gap-2 sm:grid-cols-4">
            <Field label="Matière jetée (€ HT)"><NumInput value={n.cost.scrap} onChange={v => setCost({ scrap: v })} /></Field>
            <Field label="Heures perdues" hint="Temps passé sur la pièce jetée"><NumInput value={n.cost.lostHours} onChange={v => setCost({ lostHours: v })} /></Field>
            <Field label="Heures de retouche"><NumInput value={n.cost.reworkHours} onChange={v => setCost({ reworkHours: v })} /></Field>
            <Field label="Transport, urgence (€ HT)"><NumInput value={n.cost.logistics} onChange={v => setCost({ logistics: v })} /></Field>
          </div>
          <div className="grid items-end gap-2 sm:grid-cols-[1fr_2fr]">
            <Field label="Processus à l'origine du défaut" hint="Sans chercher de coupable : quel maillon a rendu le défaut possible ?">
              <select className={inputCls} value={n.processId} onChange={e => set({ processId: e.target.value })}>
                <option value="">À qualifier</option>
                {PROCESS_IDS.map(p => <option key={p} value={p}>{processLabel(p)}</option>)}
              </select>
            </Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              Coût direct : <strong className="font-mono">{formatValue(cost, '€')}</strong> (heures à {formatValue(state.params.hourlyRate, '€')}/h).
              {cost > 0 && <> Pour le compenser, il faut vendre <strong className="font-mono">{formatValue(compensatingRevenue(cost, state.settings.netMarginPct), '€')}</strong> de plus, sur la base d'une marge nette de {state.settings.netMarginPct} %.</>}
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>4. Et ensuite</SubTitle>
          <div className="flex flex-wrap gap-2">
            <Button onClick={workshop}><SearchCheck size={14} />{n.analysisId && state.analyses[n.analysisId] ? `Voir l'atelier ${state.analyses[n.analysisId].ref}` : 'Ouvrir un atelier 5 Pourquoi'}</Button>
            {n.origin === 'fournisseur' && <Button onClick={debit}>{Object.values(state.debits).some(x => x.ncId === n.id) ? 'Voir la fiche de débit' : 'Réclamer au fournisseur (fiche de débit)'}</Button>}
            {n.complaintId && state.complaints[n.complaintId] && <Button kind="ghost" onClick={() => { commit(n); onClose(); nav.tool('2.3', n.complaintId); }}>Réclamation {state.complaints[n.complaintId].ref}</Button>}
          </div>
          <p className="text-[11px] text-slate-500">Un défaut coûteux ou qui revient mérite un atelier 5 Pourquoi de 15 minutes devant la machine, dans les 2 heures.</p>
        </section>
      </div>
      <datalist id="nc-where">{[...new Set(Object.values(state.ncs).map(x => x.where).filter(Boolean))].map(w => <option key={w} value={w} />)}</datalist>
    </Modal>
  );
}
