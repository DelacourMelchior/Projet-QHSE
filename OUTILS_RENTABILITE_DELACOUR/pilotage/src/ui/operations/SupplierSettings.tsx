// Settings of tool 3.1, filled once and saved as typed, in two closed panels: the ones of the evaluation (purchasing sectors, the grid of criteria
// and their weights, the classes, the rhythm) and the ones of the claims (motives, delays, e-mail). What is left empty takes the default of the tool.
// The days that do not count in the delay to send a claim are a general setting (Réglages, Entreprise).
import type { ReactNode } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Criterion, CriterionItem, SupplierSettings as Settings } from '../../domain/types';
import { freeSlot, GREY, MAX_MOTIFS, SERIES_COLORS, withoutMotif } from '../../domain/commercial';
import { COVER_LABEL, newSector, proposeSectors, sectorCover, type SectorCover } from '../../domain/sectors';
import { DEFAULT_ITEMS, MAIL_BODY, MAIL_SUBJECT, motifsOfClaims, newCriterion, resetClaimMotifs, SCALES, SUPPLIER_DEFAULTS, SUPPLIER_MOTIFS, supplierCfg, weightShares } from '../../domain/suppliers';
import { newId } from '../../domain/base';
import { useStore } from '../../store/StoreContext';
import type { Nav } from '../tools';
import { Button, Field, inputCls, NumInput, ToolSettings } from '../common';

// An empty field goes back to the default of the tool
function useSettings() {
  const { state, update } = useStore();
  const setS = (patch: Partial<Settings>) => update(d => { const next = { ...(d.params.supplier || {}), ...patch } as Record<string, unknown>; Object.keys(next).forEach(k => { if (next[k] === undefined) delete next[k]; }); d.params.supplier = next as Settings; });
  return { state, update, setS };
}
type NumKey = 'sendDays' | 'followDays' | 'classA' | 'classB' | 'reviewMonths' | 'criticalMonths' | 'repeat';

export function EvaluationSettings() {
  const { state, update, setS } = useSettings();
  if (!state) return null;
  const cfg = supplierCfg(state.params), saved = state.params.supplier || {};
  const num = (k: NumKey) => (v: number | null) => setS({ [k]: v === null ? undefined : v });

  // the grid of criteria: renamed, weighted, added, removed; quality, delays and service are calculated, the others given by hand
  const criteria = cfg.criteria, total = criteria.reduce((a, c) => a + (c.weight || 0), 0), shares = weightShares(criteria), custom = !!saved.criteria?.length || !!saved.max;
  const setCriteria = (xs: Criterion[]) => setS({ criteria: xs, max: undefined });
  const edit = (key: string, patch: Partial<Criterion>) => setCriteria(criteria.map(c => (c.key === key ? { ...c, ...patch } : c)));
  const usedRatings = Object.values(state.suppliers).reduce((a, x) => a + x.ratings.length, 0);

  // purchasing sectors: the company's own list (empty at first), what is bought and how many suppliers are wanted for it
  const sectors = Object.values(state.sectors || {}).sort((a, b) => a.name.localeCompare(b.name));
  const proposals = proposeSectors(state);
  const members = (id: string) => Object.values(state.suppliers).filter(x => x.sectorIds?.includes(id)).length;
  const setSector = (id: string, patch: Partial<(typeof sectors)[number]>) => update(d => { if (d.sectors[id]) d.sectors[id] = { ...d.sectors[id], ...patch }; });
  const dropSector = (id: string, name: string) => {
    const n = members(id);
    if (!window.confirm(n ? `Retirer le secteur ${name || ''} ? Ses ${n} fournisseur(s) ne sont plus rangés dans aucun secteur, leur historique reste.` : `Retirer le secteur ${name || ''} ?`)) return;
    update(d => { delete d.sectors[id]; Object.values(d.suppliers).forEach(x => { if (x.sectorIds?.includes(id)) x.sectorIds = x.sectorIds.filter(i => i !== id); }); });
  };
  const propose = () => {
    if (!window.confirm(`Créer ${proposals.length} secteur(s) d'après ce que fournissent vos fournisseurs : ${proposals.map(p => p.name).join(' ; ')} ?`)) return;
    update(d => proposals.forEach(p => { const sc = newSector(p.name); d.sectors[sc.id] = sc; p.supplierIds.forEach(id => { const x = d.suppliers[id]; if (x) x.sectorIds = [...(x.sectorIds || []), sc.id]; }); }));
  };
  const pct = (i: number) => (v: number | null) => { const cur = [...cfg.penaltyPct] as [number, number, number]; cur[i] = Math.max(0, Math.min(100, v ?? SUPPLIER_DEFAULTS.penaltyPct[i])); setS({ penaltyPct: cur.every((x, j) => x === SUPPLIER_DEFAULTS.penaltyPct[j]) ? undefined : cur }); };

  return (
    <ToolSettings title="Réglages de l'évaluation : critères, classes, rythme, secteurs">
      <div className="space-y-6">
        <Block title="Critères et poids" text="Ce que vous notez chez un fournisseur, et ce que chaque critère pèse dans la note finale sur 100."
          action={custom && <Button kind="ghost" onClick={() => setS({ criteria: undefined, max: undefined })}><RotateCcw size={13} />Remettre la grille de départ</Button>}>
          <div aria-hidden className={`hidden px-[calc(0.5rem+1px)] gap-x-3 text-[11px] font-semibold text-slate-600 md:grid ${CRITERIA_COLS}`}>
            <span>Critère</span><span>Noté sur</span><span>Poids</span><span>Comment il est noté</span><span />
          </div>
          <ul className="space-y-2">
            {criteria.map((c, n) => {
              const items = c.items || [], setItems = (xs: CriterionItem[]) => edit(c.key, { items: xs });
              return (
                <li key={c.key} className="space-y-2 rounded-lg border border-slate-200 p-2">
                  <div className={`grid grid-cols-2 gap-x-3 gap-y-2 md:items-center ${CRITERIA_COLS}`}>
                    <div className="col-span-2 md:col-span-1"><input className={inputCls} value={c.label} aria-label="Nom du critère" placeholder="Nom du critère" onChange={e => edit(c.key, { label: e.target.value })} /></div>
                    <label className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-700 md:sr-only">Noté sur</span>
                      <select className={inputCls} value={c.scale} onChange={e => edit(c.key, { scale: Number(e.target.value) })}>{SCALES.map(sc => <option key={sc} value={sc}>sur {sc}</option>)}</select></label>
                    <label className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-700 md:sr-only">Poids</span>
                      <NumInput value={c.weight} onChange={v => edit(c.key, { weight: Math.max(0, v ?? 0) })} />
                      {(c.weight === 0 || total !== 100) && <span className="mt-0.5 block text-[11px] text-slate-600">{c.weight > 0 ? `soit ${shares[n]} % de la note` : 'hors de la note'}</span>}</label>
                    <span className="col-span-2 text-[11px] text-slate-600 md:col-span-1" title={c.auto ? 'Réclamations et livraisons suivies des 12 derniers mois' : undefined}>{c.auto ? "Calculé d'après les faits, à ajuster" : 'Saisi à la main'}</span>
                    <Button kind="ghost" className="col-span-2 !px-2 justify-self-end md:col-span-1" aria-label={`Retirer le critère ${c.label}`} disabled={criteria.length <= 1} onClick={() => setCriteria(criteria.filter(x => x.key !== c.key))}><Trash2 size={14} /></Button>
                  </div>
                  <details className="text-[11px] text-slate-700">
                    <summary className="cursor-pointer font-semibold text-delacour-primary">Points à observer : {items.length}</summary>
                    <div className="mt-2 space-y-1.5">
                      <p className="text-slate-600">Les points précis à regarder pour ce critère. Chacun se note sur l'échelle du critère, et la note du critère est la moyenne des points notés. Sans point, le critère se note d'un seul coup.</p>
                      {items.map((it, i) => (
                        <div key={it.key} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <input className={inputCls} value={it.label} aria-label="Point à observer" placeholder="Ex. délais tenus" onChange={e => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                          <input className={inputCls} value={it.hint || ''} aria-label="Précision du point" placeholder="Précision (facultatif)" onChange={e => setItems(items.map((x, j) => (j === i ? { ...x, hint: e.target.value || undefined } : x)))} />
                          <Button kind="ghost" className="!px-2 justify-self-end" aria-label={`Retirer le point ${it.label}`} onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button className="!py-1" onClick={() => setItems([...items, { key: newId('it'), label: '' }])}><Plus size={13} />Ajouter un point</Button>
                        {DEFAULT_ITEMS[c.key] && <Button kind="ghost" className="!py-1" onClick={() => setItems(DEFAULT_ITEMS[c.key].map(x => ({ ...x })))}><RotateCcw size={13} />Remettre les points de départ</Button>}
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Button onClick={() => setCriteria([...criteria, newCriterion()])}><Plus size={14} />Ajouter un critère</Button>
            <span className="text-[11px] text-slate-600">{total === 100 ? 'Total des poids : 100.' : `Total des poids : ${total}, soit chaque poids ramené à 100 dans la note.`} Un poids à 0 sort le critère de la note.</span>
          </div>
          <details className="text-[11px] text-slate-700">
            <summary className="cursor-pointer font-semibold text-delacour-primary">Comment la note est calculée</summary>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600">
              <li>Chaque critère est noté sur son échelle (sur 10, sur 20 ou sur 100). Le poids ramène ensuite toutes les notes à une seule note sur 100.</li>
              <li>Un critère qu'on ne peut pas noter, faute de données, reste « non évalué » : la note finale se calcule sur les autres critères.</li>
              <li>Le prix se juge par comparaison avec les autres fournisseurs du même secteur, sans saisir de montant.</li>
              <li>Une évaluation déjà faite garde la grille de son jour{usedRatings ? ` (${usedRatings} enregistrée${usedRatings > 1 ? 's' : ''})` : ''} : modifier les critères ne change jamais le passé.</li>
            </ul>
          </details>
        </Block>

        <Block title="Classes A, B et C" text="La note finale sur 100 donne la classe du fournisseur. En dessous du seuil de la classe B, c'est la classe C.">
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <Field label="Classe A à partir de (sur 100)"><NumInput value={cfg.classA} onChange={num('classA')} /></Field>
            <Field label="Classe B à partir de (sur 100)"><NumInput value={cfg.classB} onChange={num('classB')} /></Field>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-800"><input type="checkbox" className="mt-0.5" checked={!!cfg.qualityFloor} onChange={e => setS({ qualityFloor: e.target.checked ? 50 : undefined })} />
            <span><strong className="font-semibold">Plafonner à la classe B quand la qualité est faible.</strong> <span className="text-[11px] text-slate-600">Un fournisseur dont la note de qualité est sous le seuil ne dépasse pas la classe B, même s'il est très bien noté sur les autres critères.</span></span></label>
          {cfg.qualityFloor ? <div className="max-w-xs"><Field label="Seuil de qualité (% de la note maximale)"><NumInput value={cfg.qualityFloor} onChange={v => setS({ qualityFloor: v && v > 0 ? Math.min(100, v) : undefined })} /></Field></div> : null}
        </Block>

        <Block title="Rythme des évaluations" text="Au bout de ce délai, le fournisseur apparaît dans les évaluations à faire.">
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <Field label="Fournisseur courant : tous les (mois)"><NumInput value={cfg.reviewMonths} onChange={num('reviewMonths')} /></Field>
            <Field label="Fournisseur critique : tous les (mois)"><NumInput value={cfg.criticalMonths} onChange={num('criticalMonths')} /></Field>
          </div>
        </Block>

        <Block title="Effet des réclamations sur la qualité" text="Quand la note de qualité est calculée d'après les faits, chaque réclamation des 12 derniers mois lui retire une part de ses points : plus elle est grave, plus la part est grande. Les retraits s'additionnent, jusqu'à 100 %.">
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <Field label="Réclamation mineure (% retiré)"><NumInput value={cfg.penaltyPct[0]} onChange={pct(0)} /></Field>
            <Field label="Réclamation majeure (% retiré)"><NumInput value={cfg.penaltyPct[1]} onChange={pct(1)} /></Field>
            <Field label="Réclamation critique (% retiré)"><NumInput value={cfg.penaltyPct[2]} onChange={pct(2)} /></Field>
          </div>
        </Block>

        <Block title="Secteurs d'achat" text="Ce que vous achetez, par grands domaines. Les fournisseurs d'un même secteur sont comparés entre eux, avec un principal et un secours. Ils se rangent dans un secteur depuis leur fiche.">
          {sectors.length > 0 && (
            <div aria-hidden className={`hidden px-[calc(0.5rem+1px)] gap-x-3 text-[11px] font-semibold text-slate-600 md:grid ${SECTOR_COLS}`}>
              <span>Secteur</span><span>Secours</span><span>Nombre de fournisseurs voulus</span><span>Rangés ici</span><span />
            </div>
          )}
          <ul className="space-y-1.5">
            {sectors.map(sc => {
              const mode = sectorCover(sc);
              return (
                <li key={sc.id} className="space-y-2 rounded-lg border border-slate-200 p-2">
                  <div className={`grid grid-cols-2 gap-x-3 gap-y-2 md:items-center ${SECTOR_COLS}`}>
                    <div className="col-span-2 md:col-span-1"><input className={inputCls} value={sc.name} aria-label="Nom du secteur" placeholder="Ex. fournitures de bureau" onChange={e => setSector(sc.id, { name: e.target.value })} /></div>
                    <label className="col-span-2 block md:col-span-1"><span className="mb-0.5 block text-[11px] font-semibold text-slate-700 md:sr-only">Secours</span>
                      <select className={inputCls} value={mode}
                        onChange={e => { const m = e.target.value as SectorCover; setSector(sc.id, { cover: m === 'backup' ? undefined : m, target: m === 'backup' ? sc.target : undefined, coverNote: m === 'unique' ? sc.coverNote : undefined }); }}>
                        <option value="backup">{COVER_LABEL.backup}</option><option value="none">{COVER_LABEL.none}</option><option value="unique">Fournisseur unique</option>
                      </select></label>
                    <div>{mode === 'backup' && <label className="block"><span className="mb-0.5 block text-[11px] font-semibold text-slate-700 md:sr-only">Nombre voulu</span>
                      <NumInput className="md:!w-20" value={sc.target ?? null} placeholder="2" onChange={v => setSector(sc.id, { target: v === null ? undefined : Math.max(2, Math.round(v)) })} /></label>}</div>
                    <span className="text-[11px] text-slate-600">{members(sc.id)} fournisseur{members(sc.id) > 1 ? 's' : ''}</span>
                    <Button kind="ghost" className="col-span-2 !px-2 justify-self-end md:col-span-1" aria-label={`Retirer le secteur ${sc.name}`} onClick={() => dropSector(sc.id, sc.name)}><Trash2 size={14} /></Button>
                  </div>
                  {mode === 'unique' && <input className={inputCls} value={sc.coverNote || ''} aria-label={`Ce que vous faites si le fournisseur du secteur ${sc.name} s'arrête`} placeholder="Si ce fournisseur s'arrête, nous… (stock, contrat, documents gardés chez nous, autre solution : précisez)" onChange={e => setSector(sc.id, { coverNote: e.target.value })} />}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => update(d => { const sc = newSector(''); d.sectors[sc.id] = sc; })}><Plus size={14} />Ajouter un secteur</Button>
            {proposals.length > 0 && <Button onClick={propose}>Proposer des secteurs d'après ce que vous achetez ({proposals.length})</Button>}
          </div>
          <p className="text-[11px] text-slate-600">« Secours souhaité » : le meilleur fournisseur est le principal, le suivant est le secours. « Pas de secours nécessaire » : un seul fournisseur suffit. « Fournisseur unique » : personne ne peut le remplacer, vous écrivez ce que vous faites s'il s'arrête.</p>
        </Block>
      </div>
    </ToolSettings>
  );
}

// Column templates of the grids of the panel (from md up; below, the fields stack in two columns)
const CRITERIA_COLS = 'md:grid-cols-[minmax(0,1fr)_6.5rem_8rem_minmax(0,13rem)_2.25rem]';
const SECTOR_COLS = 'md:grid-cols-[minmax(0,1fr)_13rem_9rem_6rem_2.25rem]';

// A block of the settings: its title, one sentence that says what it is for, then its fields
function Block({ title, text, action, children }: { title: string; text: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-3xl">
          <h3 className="text-xs font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-600">{text}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ClaimSettings({ nav }: { nav: Nav }) {
  const { state, setS } = useSettings();
  if (!state) return null;
  const params = state.params, saved = params.supplier || {};
  const num = (k: NumKey) => (v: number | null) => setS({ [k]: v === null ? undefined : v });
  const motifs = motifsOfClaims(params), custom = !!saved.motifs?.length;
  const usedBy = (key: string) => Object.values(state.debits).filter(d => d.motif === key).length;
  const setMotifs = (xs: typeof motifs) => setS({ motifs: xs });
  const active = motifs.filter(m => !m.retired).length;
  const add = () => { const slot = freeSlot(motifs); if (slot >= 0) setMotifs([...motifs, { key: `mt_${Date.now().toString(36)}`, label: '', slot }]); };
  const back = () => {
    const usedCustom = motifs.filter(m => !SUPPLIER_MOTIFS.some(d => d.key === m.key) && usedBy(m.key) > 0).map(m => m.key);
    if (usedCustom.length && !window.confirm('Des réclamations utilisent des motifs ajoutés par l\'entreprise : ils restent dans l\'historique, comme motifs retirés. Revenir à la liste de départ ?')) return;
    const next = resetClaimMotifs(motifs, usedCustom);
    setS({ motifs: next.length === SUPPLIER_MOTIFS.length ? undefined : next });
  };

  return (
    <ToolSettings title="Réglages des réclamations : motifs, délais, e-mail">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="block text-[11px] font-semibold text-slate-700">Motifs de réclamation {custom ? '(liste de l\'entreprise)' : '(liste de départ, valable pour tout métier)'}</span>
          {custom && <Button kind="ghost" onClick={back}><RotateCcw size={13} />Revenir à la liste de départ</Button>}
        </div>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {motifs.map((m, i) => {
            const used = usedBy(m.key);
            return (
              <li key={m.key} className={`flex items-center gap-2 rounded-lg border p-1.5 ${m.retired ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200'}`}>
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SERIES_COLORS[m.slot ?? i] || GREY.other }} />
                <input className={inputCls} value={m.label} disabled={m.retired} aria-label="Motif" placeholder="Nom du motif" onChange={e => setMotifs(motifs.map(x => (x.key === m.key ? { ...x, label: e.target.value } : x)))} />
                {used > 0 && <span className="shrink-0 text-[11px] text-slate-500">{used} réclamation{used > 1 ? 's' : ''}</span>}
                {m.retired
                  ? <Button kind="ghost" className="!px-2" onClick={() => setMotifs(motifs.map(x => (x.key === m.key ? { ...x, retired: undefined } : x)))}>Remettre</Button>
                  : <Button kind="ghost" className="!px-2" aria-label={`Retirer le motif ${m.label}`} disabled={active <= 1} onClick={() => setMotifs(withoutMotif(motifs, m.key, used > 0))}><Trash2 size={14} /></Button>}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={add} disabled={freeSlot(motifs) < 0}><Plus size={14} />Ajouter un motif</Button>
          {freeSlot(motifs) < 0 && <span className="text-[11px] text-amber-800">{MAX_MOTIFS} motifs au plus : retirez-en un pour en ajouter.</span>}
        </div>
        <p className="text-[11px] text-slate-500">Renommer un motif met à jour toutes les réclamations et le graphique. Un motif retiré qui sert déjà reste dans l'historique mais n'est plus proposé. « Autre » existe toujours et demande de préciser.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Délai d'envoi de la réclamation (jours ouvrés)" hint={`Après la réception. ${SUPPLIER_DEFAULTS.sendDays} si vide.`}><NumInput value={saved.sendDays ?? null} onChange={num('sendDays')} placeholder={String(SUPPLIER_DEFAULTS.sendDays)} /></Field>
        <Field label="Réponse attendue sous (jours)" hint={`Compte aussi comme service lent dans la note. ${SUPPLIER_DEFAULTS.followDays} si vide.`}><NumInput value={saved.followDays ?? null} onChange={num('followDays')} placeholder={String(SUPPLIER_DEFAULTS.followDays)} /></Field>
        <Field label="Défaut répété dès (réclamations)" hint={`Même motif sur 12 mois : signalé comme défaut répété. ${SUPPLIER_DEFAULTS.repeat} si vide.`}><NumInput value={saved.repeat ?? null} onChange={num('repeat')} placeholder={String(SUPPLIER_DEFAULTS.repeat)} /></Field>
        <p className="self-end text-[11px] text-slate-500">Jours fériés et fermetures : <button type="button" className="font-semibold text-delacour-primary hover:underline" onClick={() => nav.settings()}>Réglages, jours ouvrés</button>.</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="block text-[11px] font-semibold text-slate-700">E-mail d'une réclamation {saved.mailSubject || saved.mailBody ? '(texte de l\'entreprise)' : '(texte de départ)'}</span>
          {(saved.mailSubject || saved.mailBody) && <Button kind="ghost" onClick={() => setS({ mailSubject: undefined, mailBody: undefined })}><RotateCcw size={13} />Revenir au texte de départ</Button>}
        </div>
        <Field label="Objet"><input className={inputCls} value={saved.mailSubject ?? MAIL_SUBJECT} onChange={e => setS({ mailSubject: e.target.value })} /></Field>
        <Field label="Texte" hint="Mots remplacés par la fiche : {contact} {ref} {date} {bl} {commande} {defaut} {montant} {entreprise}">
          <textarea className={`${inputCls} min-h-[120px]`} value={saved.mailBody ?? MAIL_BODY} onChange={e => setS({ mailBody: e.target.value })} />
        </Field>
      </div>
    </ToolSettings>
  );
}

