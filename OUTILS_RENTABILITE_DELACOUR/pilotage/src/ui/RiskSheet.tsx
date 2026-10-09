// Risk sheet (tool 1.2), 4 steps: what stops, why and how serious, Plan B, reflex card and test.
import { useState } from 'react';
import { ArrowUp, Check, FileDown, Lightbulb, Phone, Plus, Trash2, X } from 'lucide-react';
import { plainName } from '../domain/cartography';
import { processLabel } from '../domain/base';
import type { Contact, Duration, DurationUnit, ReflexStep, Risk, RiskCost, Scale, State } from '../domain/types';
import {
  actionsOfRisk, applyCalc, calcLine, COST_LINES, costPerDay, DAY_PARTS, type CostLineKey, gravityScale, likelihoodScale, lossPerEvent, planBGain, riskState, riskZone, score, STATE_INFO, suggestedGravity, testDueDate,
  ZONE_LABEL, zoneOf, type ScaleLevel,
} from '../domain/risk';
import { FAMILIES } from '../domain/riskTemplates';
import { contactLabel } from '../domain/contacts';
import { formatValue, parseNumber } from '../domain/numbers';
import { FlowUses } from './map/FlowUses';
import { frDate, isoDate } from '../domain/periods';
import { formatDuration, hoursOf, UNITS } from '../domain/duration';
import { cardPdf } from '../domain/reflexPdf';
import { useStore } from '../store/StoreContext';
import { Button, DeleteButton, Field, inputCls, Modal, StatusBadge } from './common';
import { STATUS_LABEL } from './ActionSheet';
import { ReflexCard } from './ReflexCard';
import { downloadFile, fileSlug } from './download';

export const ZONE_STYLE = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-400 text-amber-950',
  low: 'bg-emerald-600 text-white',
} as const;

export function ScoreBadge({ r, className = '' }: { r: Pick<Risk, 'gravity' | 'likelihood'>; className?: string }) {
  const sc = score(r);
  const cls = `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold ${className}`;
  if (sc === null) return <span title="À coter : gravité et probabilité à choisir" className={`${cls} border border-dashed border-slate-400 bg-slate-100 text-slate-600`}>?</span>;
  return <span title={`Criticité ${sc} / 16 : ${ZONE_LABEL[zoneOf(sc)]}`} className={`${cls} ${ZONE_STYLE[zoneOf(sc)]}`}>{sc}</span>;
}

const STEPS = ['Ce qui s\'arrête', 'Pourquoi, cotation', 'Plan B et fiche réflexe', 'Test'];
const today = () => isoDate(new Date());
const emptyTest = () => ({ date: today(), ok: null as boolean | null, note: '', delay: null as Duration | null, contactsChecked: false });

export function RiskSheet({ initial, startStep = 0, onClose, onNewAction, onOpenAction }: {
  initial: Risk; startStep?: number; onClose(): void; onNewAction(riskId: string): void; onOpenAction(id: string): void;
}) {
  const { state, update, teamView, author } = useStore();
  const [r, setR] = useState<Risk>(() => structuredClone(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [step, setStep] = useState(startStep);
  const [ideas, setIdeas] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [test, setTest] = useState(emptyTest);
  if (!state) return null;
  const isNew = !state.risks[r.id];
  const set = (patch: Partial<Risk>) => { setR(x => ({ ...x, ...patch })); setInfo(''); };
  const rate = (patch: Partial<Pick<Risk, 'gravity' | 'likelihood'>>) => set({ ...patch, ratedBy: author, ratedAt: today() });
  const cost: RiskCost = r.cost || { perDay: null, daysWithout: null, daysWith: null, planBCost: null };
  // A figure kept from before the detailed lines moves into "autres pertes par jour"; perDay is always the sum
  const setCost = (patch: Partial<RiskCost>) => {
    const next = { ...cost, ...patch };
    if (!DAY_PARTS.some(k => cost[k] != null) && cost.perDay != null && !('otherDay' in patch)) next.otherDay = cost.perDay;
    set({ cost: applyCalc(next) });
  };
  // One cost line: typed directly, or computed from detail factors opened under it
  const costLine = (k: CostLineKey, label: string, hint?: string) => {
    const def = COST_LINES[k], computed = calcLine(cost, k);
    const shown = cost[k] ?? (k === 'otherDay' && !DAY_PARTS.some(d => cost[d] != null) ? cost.perDay : null);
    return (
      <div className="space-y-1">
        <Field label={label} hint={computed !== undefined ? 'Calculé avec le détail ci-dessous. Videz le détail pour saisir directement.' : hint}>
          <input inputMode="decimal" className={`${inputCls} ${computed !== undefined ? 'bg-slate-50 font-mono' : ''}`} readOnly={computed !== undefined} value={shown ?? ''} onChange={e => setCost({ [k]: num(e.target.value) })} />
        </Field>
        <details className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1" open={computed !== undefined}>
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">Détailler le calcul ({def.mode === 'product' ? 'on multiplie' : 'on additionne'})</summary>
          <p className="mt-1 text-[11px] text-slate-500">{def.help}</p>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {def.factors.map(f => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <input inputMode="decimal" className={inputCls} value={cost.calc?.[`${k}.${f.key}`] ?? ''} onChange={e => setCost({ calc: { ...cost.calc, [`${k}.${f.key}`]: num(e.target.value) } })} />
              </Field>
            ))}
          </div>
        </details>
      </div>
    );
  };
  const money = !teamView;
  const withR: State = { ...state, risks: { ...state.risks, [r.id]: r } };
  const st = STATE_INFO[riskState(withR, r)];
  const zone = riskZone(r);
  const sug = suggestedGravity(r, state.settings);
  const loss = lossPerEvent(r);
  const gain = planBGain(r);
  const slow = hoursOf(r.activation) !== null && hoursOf(r.maxOutage) !== null && hoursOf(r.activation)! > hoursOf(r.maxOutage)!;
  const num = (v: string) => (v.trim() === '' ? null : parseNumber(v));

  const dirty = JSON.stringify(r) !== saved || test.ok !== null || test.note.trim() !== '';
  const close = () => { if (!dirty || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const valid = () => {
    if (!r.title.trim()) { setStep(0); setError('Nommez le risque : ce qui s\'arrête.'); return false; }
    if (!r.owner.trim()) { setStep(0); setError('Désignez le responsable du risque.'); return false; }
    setError('');
    return true;
  };
  // in team view the money figures are neither shown nor overwritten
  const commit = (x: Risk) => {
    update(d => { d.risks[x.id] = money ? x : { ...x, cost: d.risks[x.id]?.cost }; });
    setSaved(JSON.stringify(x));
  };
  const save = () => { if (valid()) { commit(r); onClose(); } };
  const remove = () => {
    if (!window.confirm('Supprimer ce risque ? Ses actions de préparation restent dans le plan d\'actions.')) return;
    update(d => { delete d.risks[r.id]; });
    onClose();
  };
  const newPrep = () => { if (valid()) { commit(r); onNewAction(r.id); } };
  // A test is an event: saved at once with the sheet, the called numbers are marked as checked
  const saveTest = () => {
    if (test.ok === null) return setError('Choisissez le résultat du test : réussi ou raté.');
    if (!test.date || !valid()) return;
    const x: Risk = { ...r, tests: [...r.tests, { date: test.date, ok: test.ok, note: test.note.trim(), by: author || r.owner, delay: test.delay, contactsChecked: test.contactsChecked }] };
    setR(x);
    commit(x);
    if (test.contactsChecked) update(d => { [...x.contactIds, ...x.notifyIds].forEach(id => { if (d.contacts[id]) d.contacts[id].verifiedAt = test.date; }); });
    setTest(emptyTest());
    setInfo(`Test du ${frDate(test.date)} enregistré.`);
  };
  const addContact = (c: Contact) => update(d => { d.contacts[c.id] = c; });
  const pdf = () => downloadFile(`Fiche-reflexe-${fileSlug(r.title)}.pdf`, cardPdf(withR, r, { company: state.settings.companyName, by: author, date: new Date() }), 'application/pdf');

  return (
    <Modal xwide onClose={close}
      title={isNew ? 'Nouveau risque' : r.title || 'Risque'}
      subtitle={<span className="flex flex-wrap items-center gap-1.5"><ScoreBadge r={r} className="!h-5 !w-5 !text-[11px]" />{zone ? `Criticité ${score(r)} / 16` : 'À coter'} · <StatusBadge level={st.tone} text={st.label} /></span>}
      footer={<>
        {!isNew && <DeleteButton onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</DeleteButton>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        {info && !error && <span role="status" className="mr-2 text-[11px] font-semibold text-emerald-700">{info}</span>}
        {step > 0 && <Button kind="ghost" onClick={() => setStep(step - 1)}>Précédent</Button>}
        {step < 3 && <Button onClick={() => setStep(step + 1)}>Suivant</Button>}
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-4">
        {!isNew && <FlowUses quiet tool="1.2" id={r.id} />}
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4" aria-label="Étapes">
          {STEPS.map((l, i) => (
            <button key={l} type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold ${step === i ? 'border-delacour-primary bg-emerald-50 text-delacour-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[11px] ${step === i ? 'bg-delacour-primary text-white' : 'bg-slate-200 text-slate-700'}`}>{i + 1}</span>{l}
            </button>
          ))}
        </nav>

        {step === 0 && (
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Ce qui s'arrête (le risque)"><input className={inputCls} value={r.title} placeholder="Ex. : casse de la machine goulet" onChange={e => set({ title: e.target.value })} /></Field>
            <Field label="Processus">
              <select className={inputCls} value={r.processId} onChange={e => set({ processId: e.target.value })}>
                {state.processes.map(p => <option key={p.id} value={p.id}>{plainName(p.name)}</option>)}
                {!state.processes.some(p => p.id === r.processId) && <option value={r.processId}>{processLabel(r.processId)}</option>}
              </select>
            </Field>
            <Field label="Ressource vitale concernée" hint="Machine, personne, fournisseur, logiciel, client…"><input className={inputCls} value={r.resource} onChange={e => set({ resource: e.target.value })} /></Field>
            <DurationInput label="Arrêt tolérable au maximum" hint="Au-delà, les clients ou la trésorerie sont touchés." value={r.maxOutage} onChange={v => set({ maxOutage: v })} />
            <Field label="Responsable du risque (obligatoire)"><input className={inputCls} value={r.owner} list="risk-people" onChange={e => set({ owner: e.target.value })} /></Field>
            <Field label="Suppléant du responsable"><input className={inputCls} value={r.deputy} list="risk-people" onChange={e => set({ deputy: e.target.value })} /></Field>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-2.5" open={r.whys.some(w => w.trim())}>
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Analyse des 5 pourquoi (facultative)</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <Field key={i} label={`Pourquoi ${i + 1}`}>
                    <input className={inputCls} value={r.whys[i] || ''} onChange={e => { const w = [...r.whys]; w[i] = e.target.value; set({ whys: w }); }} />
                  </Field>
                ))}
              </div>
            </details>
            <Field label="Cause racine" hint="Ce qui rend l'entreprise vulnérable (pas l'incident lui-même)."><input className={inputCls} value={r.cause} onChange={e => set({ cause: e.target.value })} /></Field>

            {money && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                <div className="text-[11px] font-semibold text-slate-700">Coût d'un arrêt (facultatif, réservé à la direction)</div>
                <p className="text-[11px] text-slate-500">Pour chaque ligne : tapez un chiffre, ou ouvrez « Détailler le calcul » pour le construire pas à pas. Une ligne qu'on ne sait pas chiffrer reste vide.</p>
                <div className="text-[11px] font-semibold text-slate-600">1. Ce qu'on perd chaque jour d'arrêt</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {costLine('margin', 'Marge perdue (€ / jour)', 'Commandes non livrées ou non facturées.')}
                  {costLine('penalties', 'Pénalités clients (€ / jour)')}
                  {costLine('idle', 'Salaires et charges payés à l\'arrêt (€ / jour)', 'Heures payées à ne rien faire.')}
                  {costLine('otherDay', 'Charges fixes et autres pertes (€ / jour)')}
                </div>
                {costPerDay(cost) != null && <p className="text-[11px] text-slate-700">Perte par jour d'arrêt : <strong className="font-mono">{formatValue(costPerDay(cost)!, '€')}</strong></p>}
                <div className="text-[11px] font-semibold text-slate-600">2. Combien de temps ça dure</div>
                {costLine('daysWithout', 'Durée d\'arrêt sans Plan B (jours)', 'Du jour de la panne au retour à la normale.')}
                <div className="text-[11px] font-semibold text-slate-600">3. Ce qu'on paie une seule fois par incident</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {costLine('repair', 'Réparation ou remplacement (€)')}
                  {costLine('otherOnce', 'Autres frais exceptionnels (€)')}
                </div>
                <details className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                  <summary className="cursor-pointer text-[11px] font-semibold text-amber-900">Avez-vous pensé à… ?</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-900">
                    <li>Un client qui ne revient pas après un retard : combien pèse-t-il sur l'année ?</li>
                    <li>Les commandes qui s'accumulent : peut-on les rattraper, ou sont-elles perdues ?</li>
                    <li>Le personnel redéployé sur autre chose : alors les salaires ne sont pas perdus.</li>
                    <li>Le chômage partiel ou l'assurance (perte d'exploitation) : ce qui est remboursé se retire.</li>
                    <li>Les arrêts en chaîne : une autre machine ou un autre poste s'arrête-t-il aussi ?</li>
                    <li>Les stocks tampons : combien de jours tient-on avant que le client soit touché ?</li>
                  </ul>
                </details>
                {loss !== null && sug && (
                  <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                    Perte par incident : <strong className="font-mono">{formatValue(loss, '€')}</strong>
                    {cost.daysWithout != null && costPerDay(cost) != null && <span className="text-slate-500">({formatValue(costPerDay(cost)!, '€')} × {cost.daysWithout} j{((cost.repair ?? 0) + (cost.otherOnce ?? 0)) > 0 && <> + {formatValue((cost.repair ?? 0) + (cost.otherOnce ?? 0), '€')} de frais</>})</span>}, soit une gravité {sug} ({gravityScale(state)[sug - 1].label.toLowerCase()}).
                    {sug !== r.gravity && <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => rate({ gravity: sug })}>Appliquer</button>}
                  </p>
                )}
              </div>
            )}

            <ScalePicker title="Gravité si le risque survient" value={r.gravity} onChange={g => rate({ gravity: g })} items={gravityScale(state, money)} />
            <ScalePicker title="Probabilité" value={r.likelihood} onChange={l => rate({ likelihood: l })} items={likelihoodScale(state)} />
            {zone && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <ScoreBadge r={r} />Criticité {score(r)} / 16 : <strong>{ZONE_LABEL[zone].toLowerCase()}</strong>
                {r.ratedAt && <span className="text-[11px] text-slate-500">Coté{r.ratedBy ? ` par ${r.ratedBy}` : ''} le {frDate(r.ratedAt)}</span>}
              </p>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
           <div className="min-w-0 space-y-3">
            <PartTitle n="A" title="Le jour J : ce qu'on fait" text="Remplissez dans l'ordre : la fiche réflexe se construit à droite." />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700">Famille de parade</span>
                <Button kind="ghost" className="!px-2 !py-1" onClick={() => setIdeas(!ideas)} aria-expanded={ideas}><Lightbulb size={13} />Idées</Button>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-4">
                {FAMILIES.map(f => (
                  <button key={f.key} type="button" aria-pressed={r.family === f.key} onClick={() => set({ family: r.family === f.key ? '' : f.key })}
                    className={`rounded-lg border p-2 text-left ${r.family === f.key ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="block text-xs font-bold text-slate-900">{f.label}</span>
                    <span className="block text-[11px] text-slate-500">{f.hint}</span>
                  </button>
                ))}
              </div>
              {ideas && (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {(r.family ? FAMILIES.filter(f => f.key === r.family) : FAMILIES).flatMap(f => f.ideas.map(t => (
                    <button key={t} type="button" onClick={() => set({ planB: r.planB.trim() ? `${r.planB.trim()} ; ${t}` : t, family: r.family || f.key })}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-950">{t}</button>
                  )))}
                </div>
              )}
            </div>
            <Field label="Le Plan B en une phrase" hint="Vide = risque non couvert."><input className={inputCls} value={r.planB} placeholder="Ex. : usinage chez le confrère grâce à l'accord de réciprocité" onChange={e => set({ planB: e.target.value })} /></Field>
            <Field label="Relais (qui ou quoi prend le relais)"><input className={inputCls} value={r.relay} onChange={e => set({ relay: e.target.value })} /></Field>

            <Part n="1" title="Déclencher">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Signal : comment s'en aperçoit-on ?"><input className={inputCls} value={r.signal} onChange={e => set({ signal: e.target.value })} /></Field>
                <Field label="Qui décide de lancer le Plan B"><input className={inputCls} value={r.trigger} list="risk-people" onChange={e => set({ trigger: e.target.value })} /></Field>
              </div>
            </Part>
            <Part n="2" title="Dérouler : les étapes, dans l'ordre">
              <StepsEditor steps={r.steps} onChange={steps => set({ steps })} />
              <DurationInput label="Plan B opérationnel en" hint={r.maxOutage ? `Arrêt tolérable : ${formatDuration(r.maxOutage)}.` : 'Renseignez l\'arrêt tolérable (étape 1) pour comparer.'} value={r.activation} onChange={v => set({ activation: v })} />
            </Part>
            {slow && <p role="alert" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">Plan B trop lent : {formatDuration(r.activation)} pour s'activer, alors que l'arrêt tolérable est de {formatDuration(r.maxOutage)}. Raccourcissez le délai ou renforcez la parade.</p>}
            <Part n="3" title="Tenir">
              <div className="grid gap-2 sm:grid-cols-2">
                <DurationInput label="Le Plan B tient au maximum" value={r.holdFor} onChange={v => set({ holdFor: v })} />
                <Field label="Ce qu'on laisse tomber en premier"><input className={inputCls} value={r.sacrifice} onChange={e => set({ sacrifice: e.target.value })} /></Field>
              </div>
            </Part>
            <Part n="4" title="Prévenir">
              <div className="grid gap-3 sm:grid-cols-2">
                <ContactsPicker label="Qui appeler" ids={r.contactIds} onChange={ids => set({ contactIds: ids })} directory={state.contacts} onCreate={addContact} />
                <ContactsPicker label="Qui informer (clients, assureur…)" ids={r.notifyIds} onChange={ids => set({ notifyIds: ids })} directory={state.contacts} onCreate={addContact} />
              </div>
              <Field label="Message type aux clients"><textarea className={`${inputCls} min-h-[64px] resize-y`} value={r.clientMessage} placeholder="Ex. : suite à une panne, votre commande est décalée de 48 h ; qualité et contrôle restent sous notre responsabilité." onChange={e => set({ clientMessage: e.target.value })} /></Field>
            </Part>
            <Part n="5" title="Accès">
              <Field label="Où sont les clés, codes, documents"><input className={inputCls} value={r.access} onChange={e => set({ access: e.target.value })} /></Field>
            </Part>
            <Part n="6" title="Revenir à la normale">
              <Field label="À quelle condition on arrête le Plan B, et ce qu'on vérifie avant de reprendre"><textarea className={`${inputCls} min-h-[64px] resize-y`} value={r.recovery} onChange={e => set({ recovery: e.target.value })} /></Field>
            </Part>

            {money && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  {costLine('daysWith', 'Durée d\'arrêt avec le Plan B (jours)')}
                  {costLine('planBCost', 'Coût de mise en place du Plan B (€)')}
                </div>
                {gain && (
                  <p className="text-[11px] text-slate-700">
                    Le Plan B évite <strong className="font-mono">{formatValue(gain.avoided, '€')}</strong> de perte par incident
                    {gain.paybackYears !== null ? <>, et se rembourse en <strong>{gain.paybackYears <= 1 ? 'moins d\'un an' : `${Math.ceil(gain.paybackYears)} ans`}</strong> en moyenne.</> : '.'}
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 pt-3">
              <PartTitle n="B" title="Avant : ce qu'il reste à faire pour que ce Plan B soit prêt" text="Accord à signer, pièces à acheter, personne à former… Chaque action a un pilote et une échéance ; elle apparaît aussi dans l'onglet Actions." />
            </div>
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-700">{prepProgress(actionsOfRisk(state, r.id))}</span>
                <Button className="!px-2 !py-1" onClick={newPrep}><Plus size={13} />Action à faire</Button>
              </div>
              {actionsOfRisk(state, r.id).length === 0 ? <p className="text-[11px] text-slate-500">Rien à faire ? Le Plan B est alors considéré comme prêt, à tester.</p>
                : actionsOfRisk(state, r.id).map(a => (
                  <button key={a.id} type="button" onClick={() => { if (valid()) { commit(r); onOpenAction(a.id); } }} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left text-[11px] hover:bg-slate-50">
                    <span className="min-w-0 truncate text-slate-800">{a.plan.map(p => p.text).join(' · ') || a.constat}</span>
                    <span className="shrink-0 text-slate-500">{a.pilot} · {frDate(a.deadline)} · <strong className="text-slate-700">{STATUS_LABEL[a.status]}</strong></span>
                  </button>
                ))}
            </div>
           </div>
           <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start">
             <div className="flex items-center justify-between gap-2">
               <h3 className="text-xs font-bold text-slate-900">Fiche réflexe</h3>
               <Button onClick={pdf} className="!px-2 !py-1"><FileDown size={13} />PDF</Button>
             </div>
             <ReflexCard r={r} s={withR} />
           </aside>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-3">
            <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
              <div className="text-xs font-bold text-slate-900">Test du Plan B</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Comment on le teste"><input className={inputCls} value={r.testMethod} placeholder="Ex. : envoi réel d'un programme au confrère" onChange={e => set({ testMethod: e.target.value })} /></Field>
                <Field label="Critère de réussite"><input className={inputCls} value={r.testCriterion} placeholder="Ex. : pièce conforme en moins de 48 h" onChange={e => set({ testCriterion: e.target.value })} /></Field>
              </div>
              {r.tests.length > 0 && (
                <ul className="space-y-1">
                  {[...r.tests].sort((a, b) => (a.date < b.date ? 1 : -1)).map((t, i) => (
                    <li key={`${t.date}${i}`} className="flex items-center gap-2 text-[11px]">
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${t.ok ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>{t.ok ? <Check size={11} /> : <X size={11} />}</span>
                      <span className="font-mono text-slate-700">{frDate(t.date)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {t.ok ? 'Réussi' : 'Raté'}{t.delay ? `, en ${formatDuration(t.delay)}` : ''}{t.note ? ` : ${t.note}` : ''}{t.by ? ` (${t.by})` : ''}
                        {t.contactsChecked && <span className="ml-1 inline-flex items-center gap-0.5 text-slate-500"><Phone size={11} />numéros vérifiés</span>}
                      </span>
                      <button type="button" aria-label="Retirer ce test" onClick={() => set({ tests: r.tests.filter(x => x !== t) })} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {testDueDate(r) && <p className="text-[11px] text-slate-600">Prochain test avant le <strong>{frDate(testDueDate(r))}</strong>.</p>}
              <div className="grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-[auto_auto_1fr]">
                <Field label="Date du test"><input type="date" className={inputCls} value={test.date} onChange={e => setTest({ ...test, date: e.target.value })} /></Field>
                <div className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-700">Résultat</span>
                  <div className="flex gap-1" role="radiogroup" aria-label="Résultat du test">
                    <button type="button" role="radio" aria-checked={test.ok === true} onClick={() => setTest({ ...test, ok: true })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${test.ok === true ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Réussi</button>
                    <button type="button" role="radio" aria-checked={test.ok === false} onClick={() => setTest({ ...test, ok: false })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${test.ok === false ? 'border-red-700 bg-red-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Raté</button>
                  </div>
                </div>
                <DurationInput label="Délai réel mesuré (facultatif)" value={test.delay} onChange={v => setTest({ ...test, delay: v })} />
                <div className="sm:col-span-3"><Field label="Constat"><input className={inputCls} value={test.note} onChange={e => setTest({ ...test, note: e.target.value })} /></Field></div>
                <label className="flex items-center gap-2 text-[11px] text-slate-700 sm:col-span-2">
                  <input type="checkbox" checked={test.contactsChecked} onChange={e => setTest({ ...test, contactsChecked: e.target.checked })} />
                  Contacts vérifiés : les numéros de la fiche ont été appelés et sont à jour
                </label>
                <div className="sm:text-right"><Button kind="primary" onClick={saveTest}><Plus size={13} />Enregistrer le test</Button></div>
              </div>
              {riskState(withR, r) === 'failed' && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
                  Le dernier test a échoué : ouvrez une action corrective, puis testez de nouveau.
                  <button type="button" className="font-semibold underline" onClick={newPrep}>Ouvrir une action</button>
                </p>
              )}
            </div>

          </section>
        )}
      </div>
      <datalist id="risk-people">{[...new Set([...Object.values(state.risks).flatMap(x => [x.owner, x.deputy]), ...Object.values(state.actions).map(a => a.pilot)].filter(Boolean))].map(p => <option key={p} value={p} />)}</datalist>
    </Modal>
  );
}

function Part({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-2.5">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-red-800">{n}. {title}</h4>
      {children}
    </div>
  );
}

// Steps of the reflex card: when, what, who; in the order they are done
const WHEN = ['Immédiat', 'Sous 15 min', 'Sous 1 h', 'Sous 4 h', 'Jour 1', 'Jour 2', 'Semaine 1'];
function StepsEditor({ steps, onChange }: { steps: ReflexStep[]; onChange(s: ReflexStep[]): void }) {
  const set = (i: number, p: Partial<ReflexStep>) => onChange(steps.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const up = (i: number) => { const n = [...steps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); };
  return (
    <div className="space-y-1.5">
      {steps.map((x, i) => (
        <div key={i} className="space-y-1 rounded-lg bg-slate-50 p-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-xs font-bold text-red-700">{i + 1}.</span>
            <input className={`${inputCls} !w-28 shrink-0`} value={x.when} list="step-when" placeholder="Quand" aria-label={`Étape ${i + 1} : quand`} onChange={e => set(i, { when: e.target.value })} />
            <input className={`${inputCls} min-w-0 flex-1`} value={x.who} list="risk-people" placeholder="Qui" aria-label={`Étape ${i + 1} : qui`} onChange={e => set(i, { who: e.target.value })} />
            <button type="button" aria-label="Monter cette étape" disabled={i === 0} onClick={() => up(i)} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" aria-label="Retirer cette étape" onClick={() => onChange(steps.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
          </div>
          <input className={`${inputCls} ml-[22px] !w-[calc(100%-22px)]`} value={x.what} placeholder="Quoi : l'action à faire" aria-label={`Étape ${i + 1} : quoi`} onChange={e => set(i, { what: e.target.value })} />
        </div>
      ))}
      <Button className="!px-2 !py-1" onClick={() => onChange([...steps, { when: steps.length ? '' : 'Immédiat', what: '', who: '' }])}><Plus size={13} />Ajouter une étape</Button>
      <datalist id="step-when">{WHEN.map(w => <option key={w} value={w} />)}</datalist>
    </div>
  );
}

function PartTitle({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-delacour-primary text-[11px] font-bold text-white">{n}</span>
      <div><h3 className="text-xs font-bold text-slate-900">{title}</h3><p className="text-[11px] text-slate-500">{text}</p></div>
    </div>
  );
}

const prepProgress = (xs: { status: string }[]) => {
  if (!xs.length) return 'Aucune action';
  const done = xs.filter(a => a.status === 'done' || a.status === 'effective').length;
  return done === xs.length ? `Plan B prêt : ${xs.length} action(s) terminée(s)` : `${done} action(s) terminée(s) sur ${xs.length}`;
};

export function ScalePicker({ title, value, items, onChange, compact }: { title: string; value: Scale | null; items: ScaleLevel[]; onChange(v: Scale): void; compact?: boolean }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold text-slate-700">{title}</span>
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-4' : 'sm:grid-cols-4'}`} role="radiogroup" aria-label={title}>
        {items.map(x => (
          <button key={x.level} type="button" role="radio" aria-checked={value === x.level} onClick={() => onChange(x.level)}
            title={compact ? `${x.label} : ${[x.money, x.text].filter(Boolean).join(' · ')}` : undefined}
            className={`rounded-lg border text-left ${compact ? 'px-2 py-1 text-center' : 'p-2'} ${value === x.level ? 'border-delacour-primary bg-emerald-50 ring-1 ring-delacour-primary' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
            <span className="block text-xs font-bold text-slate-900">{compact ? x.level : `${x.level} · ${x.label}`}</span>
            {!compact && <span className="block text-[11px] text-slate-600">{[x.money, x.text].filter(Boolean).join(' · ')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function DurationInput({ label, hint, value, onChange }: { label: string; hint?: string; value: Duration | null; onChange(v: Duration | null): void }) {
  const [unit, setUnit] = useState<DurationUnit>(value?.unit || 'h');
  return (
    <Field label={label} hint={hint}>
      <span className="flex gap-1.5">
        <input inputMode="decimal" className={`${inputCls} w-24`} value={value?.value ?? ''} placeholder="0 = immédiat" aria-label={`${label} : valeur`}
          onChange={e => { const v = e.target.value.trim() === '' ? null : parseNumber(e.target.value); onChange(v === null ? null : { value: v, unit }); }} />
        <select className={inputCls} value={unit} aria-label={`${label} : unité`} onChange={e => { const u = e.target.value as DurationUnit; setUnit(u); if (value) onChange({ ...value, unit: u }); }}>
          {UNITS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
        </select>
      </span>
    </Field>
  );
}

// Contacts of a card, taken from the crisis directory (a new one is added to the directory)
function ContactsPicker({ label, ids, onChange, directory, onCreate }: {
  label: string; ids: string[]; onChange(ids: string[]): void; directory: Record<string, Contact>; onCreate(c: Contact): void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', role: '', company: '', phone: '', email: '' });
  const free = Object.values(directory).filter(c => !ids.includes(c.id)).sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name));
  const create = () => {
    if (!draft.name.trim() || !draft.phone.trim()) return;
    const c: Contact = { id: `ct_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, category: 'autre', ...draft, always: false, verifiedAt: isoDate(new Date()) };
    onCreate(c);
    onChange([...ids, c.id]);
    setDraft({ name: '', role: '', company: '', phone: '', email: '' });
    setAdding(false);
  };
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold text-slate-700">{label}</span>
      {ids.map(id => directory[id]).filter(Boolean).map(c => (
        <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-[11px]">
          <span className="min-w-0 flex-1 truncate font-semibold">{contactLabel(c)}</span>
          <span className="shrink-0 font-mono text-slate-700">{c.phone}</span>
          <button type="button" aria-label={`Retirer ${c.name}`} onClick={() => onChange(ids.filter(x => x !== c.id))} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <select className={inputCls} value="" aria-label={`${label} : ajouter depuis l'annuaire`} onChange={e => e.target.value && onChange([...ids, e.target.value])}>
          <option value="">{free.length ? 'Ajouter depuis l\'annuaire…' : 'Annuaire vide'}</option>
          {free.map(c => <option key={c.id} value={c.id}>{contactLabel(c)} ({c.phone})</option>)}
        </select>
        <Button className="shrink-0 !px-2" onClick={() => setAdding(!adding)} aria-expanded={adding}><Plus size={13} />Nouveau</Button>
      </div>
      {adding && (
        <div className="grid gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Société" value={draft.company} onChange={e => setDraft({ ...draft, company: e.target.value })} />
          <input className={inputCls} placeholder="Nom (obligatoire)" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputCls} placeholder="Fonction" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} />
          <input className={inputCls} placeholder="Téléphone (obligatoire)" inputMode="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
          <input className={`${inputCls} sm:col-span-2`} type="email" placeholder="E-mail" inputMode="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
          <div className="sm:col-span-2"><Button kind="primary" disabled={!draft.name.trim() || !draft.phone.trim()} onClick={create}>Ajouter à l'annuaire et à la fiche</Button></div>
        </div>
      )}
    </div>
  );
}
