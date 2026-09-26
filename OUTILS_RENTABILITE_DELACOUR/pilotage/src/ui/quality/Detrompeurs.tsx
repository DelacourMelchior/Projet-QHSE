// Tool 5.4 "Détrompeurs": make the error physically impossible, try to fool the device on purpose,
// then check on the ground 30 days later that the defect does not come back (no closing without this check).
import { useEffect, useState } from 'react';
import { FileDown, Lightbulb, Plus, Printer, SearchCheck, Trash2 } from 'lucide-react';
import type { Poka, PokaCheck } from '../../domain/types';
import { checkDate, levelLabel, ncsSince, newPoka, POKA_IDEAS, POKA_LEVELS, POKA_STATE, pokaState } from '../../domain/quality';
import { applyQualityExample } from '../../domain/qualityExamples';
import { pokaPdf } from '../../domain/qualityPdf';
import { daysBetween, PROCESS_IDS, processLabel, sum, type Insight } from '../../domain/base';
import { formatValue } from '../../domain/numbers';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader, YesNo } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

type Filter = 'todo' | 'effective' | 'all';

export function Detrompeurs({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Poka | null>(null);
  const [filter, setFilter] = useState<Filter>('todo');
  useEffect(() => { if (focus && state?.pokas[focus]) { setOpen(state.pokas[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.pokas).map(p => ({ p, st: pokaState(p, now) })).sort((a, b) => (checkDate(a.p) || '9') < (checkDate(b.p) || '9') ? -1 : 1);
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Détrompeurs : rendre l'erreur impossible, puis vérifier à J+30" text="Une butée, un téton, un gabarit, un blocage logiciel : le mauvais geste ne passe plus. 30 jours après la mise en service, on vérifie sur le terrain que le défaut a disparu. Un détrompeur se crée aussi depuis un atelier 5 Pourquoi (5.3).">
          <Button kind="primary" onClick={() => setOpen(newPoka(null))}><Plus size={14} />Nouveau détrompeur</Button>
          <Button onClick={() => update(d => applyQualityExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <PokaSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const c = (k: string) => all.filter(x => x.st === k).length;
  const insights: Insight[] = [];
  const due = all.filter(x => x.st === 'due');
  if (due.length) insights.push({ key: 'due', tone: 'warn', title: 'Contrôle J+30 à faire', text: `${due.map(x => x.p.poste || x.p.defect).join(', ')} : aller constater sur le terrain, compter les pièces et les défauts.` });
  const failed = all.filter(x => x.st === 'failed');
  if (failed.length) insights.push({ key: 'failed', tone: 'bad', title: 'Récidive', text: `${failed.map(x => x.p.poste || x.p.defect).join(', ')} : le défaut revient. Reprendre l'atelier 5 Pourquoi.` });
  const weak = all.filter(x => x.p.level === 'consigne' && x.st !== 'effective');
  if (weak.length) insights.push({ key: 'weak', tone: 'warn', title: 'Simple consigne', text: `${weak.map(x => x.p.poste || x.p.defect).join(', ')} : une consigne laisse l'erreur possible. Chercher un détrompeur physique.` });
  const bypass = all.filter(x => x.p.installedAt && !x.p.bypassTested);
  if (bypass.length) insights.push({ key: 'bypass', tone: 'warn', title: 'Test de contournement à faire', text: `${bypass.map(x => x.p.poste || x.p.defect).join(', ')} : essayer volontairement de tromper le dispositif.` });
  const shown = filter === 'todo' ? all.filter(x => x.st !== 'effective') : filter === 'effective' ? all.filter(x => x.st === 'effective') : all;
  return (
    <div className="space-y-4">
      <Summary title="Les détrompeurs tiennent-ils ?" insights={insights} tiles={<>
        <Tile title="À installer" value={String(c('to_install'))} sub="dispositif décidé, pas encore en place" />
        <Tile title="Contrôles J+30 à faire" value={String(c('due'))} sub={`${c('running')} en service, contrôle à venir`} tone={c('due') ? 'warn' : undefined} />
        <Tile title="Efficaces" value={String(c('effective'))} sub={`pour ${formatValue(sum(all.filter(x => x.st === 'effective').map(x => x.p.cost)), '€')} investis`} tone={c('effective') ? 'ok' : undefined} />
        <Tile title="Récidives" value={String(c('failed'))} sub="défaut revenu au contrôle" tone={c('failed') ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Détrompeurs" text="Aucun dossier d'amélioration n'est clos sans le constat signé à J+30.">
          <Button kind="primary" onClick={() => setOpen(newPoka(null))}><Plus size={14} />Nouveau détrompeur</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les fiches du bac rouge, les ateliers 5 Pourquoi et les détrompeurs par des exemples ?')) update(d => applyQualityExample(d)); }}>Remplir avec des exemples</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['todo', 'À suivre', all.length - c('effective')], ['effective', 'Efficaces', c('effective')], ['all', 'Tous', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun détrompeur dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ p, st }) => (
              <Row key={p.id} onClick={() => setOpen(p)}
                title={`${p.poste ? `${p.poste} : ` : ''}${p.defect || 'Défaut à décrire'}`}
                sub={[levelLabel(p.level), p.description, p.cost !== null ? formatValue(p.cost, '€') : ''].filter(Boolean).join(' · ')}
                right={<><span className="block font-semibold text-slate-800">{p.owner || <span className="text-red-700">À désigner</span>}</span>{p.installedAt ? `J+30 le ${frDate(checkDate(p))}` : 'Pas encore en service'}</>}
                badge={<StatusBadge level={POKA_STATE[st].tone} text={POKA_STATE[st].label} />} />
            ))}
          </ul>
        )}
      </Card>
      <Method rule="L'amélioration n'existe que si l'erreur devient physiquement ou logiquement impossible, et si l'on vérifie sur le terrain 30 jours plus tard."
        steps={[['Simple et robuste', 'Butée asymétrique, couleur distincte, gabarit, blocage dans le logiciel.'], ['Essayer de le tromper', 'Tenter volontairement le mauvais geste : le dispositif doit résister.'], ['Contrôle à J+30', "Bloquer la date dans l'agenda. Pas de clôture sans ce constat signé."]]} />
      {open && <PokaSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

const emptyCheck = (by: string): PokaCheck => ({ date: isoDate(new Date()), produced: null, defects: null, inPlace: true, cadenceOk: true, note: '', by });

export function PokaSheet({ initial, onClose, nav }: { initial: Poka; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [p, setP] = useState<Poka>(() => structuredClone(initial));
  const [ideas, setIdeas] = useState(false);
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.pokas[p.id];
  const set = (x: Partial<Poka>) => setP(y => ({ ...y, ...x }));
  const check = p.check;
  const setCheck = (x: Partial<PokaCheck>) => set({ check: { ...(check || emptyCheck(author)), ...x } });
  const st = pokaState(p);
  const since = ncsSince(state, p);
  const days = p.installedAt ? daysBetween(p.installedAt, new Date()) ?? 0 : null;
  const an = p.analysisId ? state.analyses[p.analysisId] : undefined;
  const close = () => { if (JSON.stringify(p) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    if (!p.defect.trim()) return setError('Décrivez le défaut à éliminer.');
    if (p.check && (p.check.produced === null || p.check.defects === null)) return setError('Contrôle J+30 : indiquez les pièces produites et le nombre de défauts.');
    update(d => { d.pokas[p.id] = p; });
    onClose();
  };
  const remove = () => { if (window.confirm('Supprimer ce détrompeur ?')) { update(d => { delete d.pokas[p.id]; }); onClose(); } };
  const pdf = () => downloadFile(`Detrompeur-${fileSlug(p.poste || p.defect)}.pdf`, pokaPdf(state, p, { company: state.settings.companyName, date: new Date() }), 'application/pdf');

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouveau détrompeur' : p.poste ? `Détrompeur · ${p.poste}` : 'Détrompeur'}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{processLabel(p.processId)} <StatusBadge level={POKA_STATE[st].tone} text={POKA_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />Fiche (PDF)</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. Le défaut à éliminer</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Défaut historique"><input className={inputCls} value={p.defect} onChange={e => set({ defect: e.target.value })} /></Field>
            <Field label="Poste ou étape"><input className={inputCls} value={p.poste} list="nc-where-all" onChange={e => set({ poste: e.target.value })} /></Field>
            <Field label="Processus sécurisé">
              <select className={inputCls} value={p.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(x => <option key={x} value={x}>{processLabel(x)}</option>)}</select>
            </Field>
            <Field label="Atelier 5 Pourquoi d'origine">
              <select className={inputCls} value={p.analysisId} onChange={e => set({ analysisId: e.target.value })}>
                <option value="">Aucun</option>
                {Object.values(state.analyses).sort((a, b) => (a.ref < b.ref ? 1 : -1)).map(a => <option key={a.id} value={a.id}>{a.ref} · {a.problem.slice(0, 60)}</option>)}
              </select>
            </Field>
          </div>
          {an && <p className="text-[11px] text-slate-500">Cause racine : {an.rootCause || 'à trouver'}. <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => { update(d => { d.pokas[p.id] = p; }); onClose(); nav.tool('5.3', an.id); }}>Ouvrir l'atelier {an.ref}</button></p>}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <SubTitle>2. Le dispositif</SubTitle>
            <Button kind="ghost" className="!px-2 !py-1" onClick={() => setIdeas(!ideas)} aria-expanded={ideas}><Lightbulb size={13} />Idées</Button>
          </div>
          {ideas && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(POKA_IDEAS[p.processId] || []).concat(p.processId !== 'P3' ? POKA_IDEAS.P3 : []).map(t => (
                <button key={t} type="button" onClick={() => set({ description: t })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950">{t}</button>
              ))}
            </div>
          )}
          <div className="grid gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Niveau du dispositif">
            {POKA_LEVELS.map(l => (
              <button key={l.key} type="button" role="radio" aria-checked={p.level === l.key} onClick={() => set({ level: l.key })}
                className={`rounded-lg border p-2 text-left ${p.level === l.key ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className="block text-xs font-bold text-slate-900">{l.rank}. {l.label}</span>
                <span className="block text-[11px] text-slate-600">{l.text}</span>
              </button>
            ))}
          </div>
          {p.level === 'consigne' && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900">Une consigne laisse l'erreur possible : gardez-la en attendant un dispositif qui bloque le mauvais geste.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Description du dispositif"><input className={inputCls} value={p.description} onChange={e => set({ description: e.target.value })} /></Field>
            <Field label="Comment il bloque le mauvais geste"><input className={inputCls} value={p.howItBlocks} onChange={e => set({ howItBlocks: e.target.value })} /></Field>
            <Field label="Coût (€ HT)"><NumInput value={p.cost} onChange={v => set({ cost: v })} /></Field>
            <Field label="Responsable"><input className={inputCls} value={p.owner} list="people" onChange={e => set({ owner: e.target.value })} /></Field>
            <Field label="Mis en service le" hint={p.installedAt ? `Contrôle à J+30 le ${frDate(checkDate(p))}.` : 'Vide tant que le dispositif n\'est pas en place.'}>
              <input type="date" className={inputCls} value={p.installedAt} onChange={e => set({ installedAt: e.target.value })} />
            </Field>
            <div className="space-y-1.5 pt-4">
              <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={p.trained} onChange={e => set({ trained: e.target.checked })} />Tous les opérateurs du poste formés au dispositif</label>
              <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={p.bypassTested} onChange={e => set({ bypassTested: e.target.checked })} />Test de contournement fait : le dispositif résiste</label>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>3. Contrôle sur le terrain à J+30</SubTitle>
          {!p.installedAt ? <p className="text-[11px] text-slate-500">Le contrôle s'ouvre une fois le dispositif en service.</p> : (
            <>
              <p className="text-[11px] text-slate-600">
                En service depuis {days} jour(s){days !== null && days < 30 ? `, contrôle dans ${30 - days} jour(s)` : ''}.
                {p.poste && <> Fiches du bac rouge au poste « {p.poste} » depuis : <strong className={since.length ? 'text-red-700' : 'text-emerald-700'}>{since.length}</strong>{since.length ? ` (${since.map(n => n.ref).join(', ')})` : ''}.</>}
              </p>
              {!check ? <Button onClick={() => setCheck({})}><SearchCheck size={14} />Saisir le contrôle</Button> : (
                <div className="grid gap-2 rounded-lg border border-slate-200 p-2.5 sm:grid-cols-4">
                  <Field label="Date du contrôle"><input type="date" className={inputCls} value={check.date} onChange={e => setCheck({ date: e.target.value })} /></Field>
                  <Field label="Pièces produites"><NumInput value={check.produced} onChange={v => setCheck({ produced: v })} /></Field>
                  <Field label="Défauts constatés"><NumInput value={check.defects} onChange={v => setCheck({ defects: v })} /></Field>
                  <Field label="Contrôlé par"><input className={inputCls} value={check.by} list="people" onChange={e => setCheck({ by: e.target.value })} /></Field>
                  <div className="space-y-1"><span className="block text-[11px] font-semibold text-slate-700">Dispositif en place, non contourné</span><YesNo label="Dispositif en place" value={check.inPlace} onChange={v => setCheck({ inPlace: v !== false })} /></div>
                  <div className="space-y-1"><span className="block text-[11px] font-semibold text-slate-700">Cadence normale</span><YesNo label="Cadence normale" value={check.cadenceOk} onChange={v => setCheck({ cadenceOk: v !== false })} /></div>
                  <div className="sm:col-span-2"><Field label="Constat"><input className={inputCls} value={check.note} onChange={e => setCheck({ note: e.target.value })} /></Field></div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
                    {check.produced !== null && check.defects !== null && <StatusBadge level={check.inPlace && check.defects === 0 ? 'ok' : 'alert'} text={check.inPlace && check.defects === 0 ? 'Efficace : dossier clos' : 'Récidive : reprendre l\'analyse'} />}
                    <button type="button" className="text-[11px] font-semibold text-slate-500 hover:underline" onClick={() => set({ check: null })}>Effacer le contrôle</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <datalist id="nc-where-all">{[...new Set(Object.values(state.ncs).map(x => x.where).filter(Boolean))].map(w => <option key={w} value={w} />)}</datalist>
    </Modal>
  );
}
