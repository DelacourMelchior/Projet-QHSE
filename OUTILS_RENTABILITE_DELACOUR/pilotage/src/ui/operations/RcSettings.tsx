// Settings of tool 3.4, saved as typed: the delay to lift a reservation (working or calendar days), the clause of retention of the contract (a mention for the PV, never an
// amount), the motives of a refusal and what follows it, the models of milestones of the company, who may release, the checks before departure and the days before
// "PV non signé". An empty field, or a list back to the neutral one, goes back to the default of the tool (the field says it). "Autre" always closes a list: `receptionCfg` drops
// a word that is "Autre" when it uses the list, so the rows are never filtered while they are typed ("Autre site" starts with the letters of "Autre"); a row left as "Autre" goes when the field is left.
// A model of milestones carries, for each milestone, its reference photo and the instruction of 3.2 that goes with it, and its own checks before departure.
// One closed section per subject (a phone never scrolls through all of them); the buttons "Retirer" are 44 px wide and high on a touch screen.
// Every text and number field keeps what is typed and writes it 1,2 s after the last key and when it is left (`Typed`, `TypedNum`): one write of the company per pause, not one per key.
import { memo, useState, type ReactNode } from 'react';
import { ChevronDown, Plus, RotateCcw, X } from 'lucide-react';
import type { MilestoneTemplate, ReceptionSettings } from '../../domain/types';
import { knownPeople } from '../../domain/base';
import { norm } from '../../domain/text';
import { sopCfg, sopPhase } from '../../domain/instructions';
import { DEFAULT_NEXTS, DEFAULT_REFUSALS, DEFAULT_SHIP_CHECKS, OTHER, plural, templatesOf } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Field, inputCls, ToolSettings } from '../common';
import { PhotoBox } from '../PhotoBox';
import { own, TOUCH16 } from './RcBits';
import { TOUCH, Typed, TypedNum, useUndo } from './rcShared';

type Def = MilestoneTemplate['milestones'][number];
type ListKey = 'refusals' | 'nexts' | 'shipChecks';
const noOther = (xs: string[]) => xs.filter(x => norm(x) !== norm(OTHER));
const START: Record<ListKey, string[]> = { refusals: noOther(DEFAULT_REFUSALS), nexts: noOther(DEFAULT_NEXTS), shipChecks: DEFAULT_SHIP_CHECKS };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// a number inside its floor and ceiling; an empty field is no value (the default of the tool)
const clamp = (v: number | null, lo: number, hi: number) => (v === null ? undefined : Math.min(hi, Math.max(lo, Math.round(v))));
const CHECK = `flex items-center gap-2 text-xs text-slate-700 ${TOUCH}`;
const BOX = 'h-5 w-5 shrink-0 accent-delacour-primary';   // a box of 20 px (the native one is 13 px)
const FIELD = `${inputCls} ${TOUCH16}`;
const ICON = '!px-2 max-sm:min-w-[44px] [@media(pointer:coarse)]:min-w-[44px]';   // "Retirer" with a cross only: a target of 44 by 44 px on a touch screen

// A subject of the settings: closed until it is touched
function Sec({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group/sec rounded-lg border border-slate-200">
      <summary className={`flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 ${TOUCH}`}><span>{title}</span><ChevronDown size={14} aria-hidden className="shrink-0 text-slate-400 transition group-open/sec:rotate-180" /></summary>
      <div className="space-y-1.5 border-t border-slate-100 p-2.5">{children}</div>
    </details>
  );
}

export const RcSettings = memo(function RcSettings() {
  const { state, update } = useStore();
  const { bar, offer } = useUndo();
  const [person, setPerson] = useState('');
  if (!state) return null;
  const saved = state.params.reception || {};
  // merges into the saved settings (a function reads them as they are in the store at that moment: a field written a moment after the last key never puts back an older list); a key set to undefined goes back to the default of the tool
  const setS = (patch: Partial<ReceptionSettings> | ((r: ReceptionSettings) => Partial<ReceptionSettings>)) => update(d => { const cur = d.params.reception || {}, next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) } as Record<string, unknown>; Object.keys(next).forEach(k => { if (next[k] === undefined) delete next[k]; }); d.params.reception = next as ReceptionSettings; });
  const drop = <T,>(xs: T[], i: number, back: (xs: T[]) => void) => { back(xs.filter((_, j) => j !== i)); offer('Retiré', () => back(xs)); };
  const words = (k: ListKey) => saved[k] ?? START[k];
  const editWords = (k: ListKey, f: (xs: string[]) => string[]) => setS(r => { const xs = f(r[k] ?? START[k]); return { [k]: !xs.length || same(xs, START[k]) ? undefined : xs }; });
  const setWords = (k: ListKey, xs: string[]) => editWords(k, () => xs);
  const LISTS: { k: ListKey; title: string; hint: string; add: string; one: string; other: boolean }[] = [
    { k: 'refusals', title: "Motifs d'un refus", hint: "La liste proposée quand une réception est refusée. «\u202fAutre, précisez\u202f» reste toujours en dernier.", add: 'Ajouter un motif', one: 'Motif', other: true },
    { k: 'nexts', title: "Suites d'un refus", hint: "La liste proposée pour dire ce qui suit un refus. «\u202fAutre, précisez\u202f» reste toujours en dernier.", add: 'Ajouter une suite', one: 'Suite', other: true },
    { k: 'shipChecks', title: 'Contrôles de départ', hint: "Les points vérifiés au chargement, après les jalons. Un modèle de jalons peut avoir les siens.", add: 'Ajouter un contrôle', one: 'Contrôle de départ', other: false },
  ];
  // retention clause: a mention of the contract, copied on the PV when it is ticked
  const ret = saved.retention ?? { on: false, maxPct: 5 };
  const setRet = (f: (r: { on: boolean; maxPct: number }) => { on: boolean; maxPct: number }) => setS(r => { const x = f(r.retention ?? { on: false, maxPct: 5 }); return { retention: !x.on && x.maxPct === 5 ? undefined : x }; });
  // the models of the company (a name that is a built-in one replaces it)
  const tpls = saved.templates ?? [];
  const setTpls = (xs: MilestoneTemplate[]) => setS({ templates: xs.length ? xs : undefined });
  // written on the model as it is in the store at that moment (a photo that comes back a few seconds later never puts back an older list)
  const patchT = (i: number, x: Partial<MilestoneTemplate> | ((t: MilestoneTemplate) => Partial<MilestoneTemplate>)) => update(d => { const ts = d.params.reception?.templates; if (ts?.[i]) ts[i] = { ...ts[i], ...(typeof x === 'function' ? x(ts[i]) : x) }; });
  const patchM = (i: number, k: number, x: Partial<Def>) => update(d => { const ms = d.params.reception?.templates?.[i]?.milestones; if (ms?.[k]) ms[k] = { ...ms[k], ...x }; });
  const sops = Object.values(state.sops).sort((a, b) => a.poste.localeCompare(b.poste, 'fr')), px = sopCfg(state.params).photoPx;
  const copyOf = (name: string) => { const t = templatesOf(state.params).find(x => x.name === name); if (t) setTpls([...tpls, { ...t, name: `${t.name} (copie)`, milestones: t.milestones.map(m => ({ ...m })), ...(t.shipChecks ? { shipChecks: [...t.shipChecks] } : {}) }]); };
  // who may release: nobody ticked = everyone
  const rel = saved.releasers ?? [];
  const people = [...new Set([...knownPeople(state), ...rel])];
  const setRel = (xs: string[]) => setS({ releasers: xs.length ? xs : undefined });
  const addPerson = () => { const n = person.trim(); if (n && !rel.some(x => norm(x) === norm(n))) setRel([...rel, n]); setPerson(''); };
  return (
    <div id="reglages-3-4" className="scroll-mt-4">
      <ToolSettings title="Réglages de cet outil&#8239;: délai de levée, clause de retenue, refus, modèles de jalons, personnes qui libèrent">
        <div className="space-y-2">
          <Sec title="Délais&#8239;: levée d'une réserve, PV non signé">
            <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Délai de levée d'une réserve (jours)" hint="Compté depuis le jour de la réception. Défaut&#8239;: 7.">
              <TypedNum className={TOUCH16} value={saved.liftDays} placeholder="7 (défaut)" onChange={v => setS({ liftDays: clamp(v, 1, 60) })} />
            </Field>
            <Field label="Jours comptés" hint="Jours ouvrés&#8239;: sans samedi, dimanche ni jours fermés des réglages de l'entreprise.">
              <select className={FIELD} value={saved.liftBusiness === undefined ? '' : saved.liftBusiness ? 'open' : 'cal'} onChange={e => setS({ liftBusiness: e.target.value === '' ? undefined : e.target.value === 'open' })}>
                <option value="">Selon les réglages de l'entreprise</option><option value="open">Jours ouvrés</option><option value="cal">Jours calendaires</option>
              </select>
            </Field>
            <Field label="Jours avant «&#8239;PV non signé&#8239;»" hint="Après la livraison, un PV sans signature est dit à partir de ce nombre de jours. Défaut&#8239;: 2.">
              <TypedNum className={TOUCH16} value={saved.unsignedDays} placeholder="2 (défaut)" onChange={v => setS({ unsignedDays: clamp(v, 0, 30) })} />
            </Field>
            </div>
          </Sec>

          <Sec title="Clause de retenue">
            <p className="text-xs text-slate-500">Une mention&#8239;: si le contrat prévoit une retenue pour une réserve mineure, la clause est recopiée sur le PV et un pourcentage saisi au-dessus du maximum est dit en fait. Aucun montant n'est calculé.</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className={CHECK}><input type="checkbox" className={BOX} checked={ret.on} onChange={e => setRet(r => ({ ...r, on: e.target.checked }))} />Le contrat prévoit une retenue</label>
              <div className="w-44"><Field label="Pourcentage maximum (%)"><TypedNum className={TOUCH16} value={saved.retention?.maxPct} placeholder="5 (défaut)" disabled={!ret.on} onChange={v => setRet(r => ({ ...r, maxPct: clamp(v, 1, 100) ?? 5 }))} /></Field></div>
            </div>
          </Sec>

          {LISTS.map(l => (
            <Sec key={l.k} title={l.title}>
              <p className="text-xs text-slate-500">{l.hint}</p>
              {words(l.k).map((w, i) => (
                <div key={i} className="flex max-w-md gap-1.5">
                  <Typed className={FIELD} value={w} aria-label={`${l.one} ${i + 1}`} onSave={v => editWords(l.k, xs => xs.map((x, j) => (j === i ? v : x)))}
                    onLeave={v => { if (l.other && norm(v) === norm(OTHER)) editWords(l.k, xs => xs.filter((_, j) => j !== i)); }} />
                  <Button kind="ghost" className={ICON} aria-label={`Retirer ${l.one.toLowerCase()} ${i + 1}${w.trim() ? `\u202f: ${w.trim()}` : ''}`} onClick={() => drop(words(l.k), i, xs => setWords(l.k, xs))}><X size={14} /></Button>
                </div>
              ))}
              {l.other && <p className="max-w-md rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500">Autre, précisez (toujours en dernier)</p>}
              <div className="flex flex-wrap gap-2">
                <Button className="!py-1" onClick={() => setWords(l.k, [...words(l.k), ''])}><Plus size={13} />{l.add}</Button>
                {saved[l.k] && <Button kind="ghost" className="!py-1" onClick={() => setS({ [l.k]: undefined })}><RotateCcw size={13} />Remettre la liste de départ</Button>}
              </div>
            </Sec>
          ))}

          <Sec title="Personnes qui libèrent">
            <p className="text-xs text-slate-500">Aucune case cochée&#8239;: tout le monde peut libérer. Une libération par une personne absente de la liste est dite en fait dans le résumé.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {people.map(p => <label key={p} className={CHECK}><input type="checkbox" className={BOX} checked={rel.some(x => norm(x) === norm(p))} onChange={e => setRel(e.target.checked ? [...rel, p] : rel.filter(x => norm(x) !== norm(p)))} />{p}</label>)}
            </div>
            <div className="flex max-w-md gap-1.5">
              <input className={FIELD} value={person} placeholder="Autre personne&#8239;: précisez" aria-label="Autre personne qui libère" onChange={e => setPerson(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerson(); }} />
              <Button className="shrink-0 disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600 disabled:!opacity-100" disabled={!person.trim()} onClick={addPerson}>Ajouter</Button>
            </div>
          </Sec>

          <Sec title="Modèles de jalons">
            <p className="text-xs text-slate-500">Les modèles proposés à la création d'une commande&#8239;: {templatesOf(state.params).map(t => t.name).join(', ')}. Un modèle de l'entreprise qui porte le nom d'un modèle proposé le remplace. Un modèle sans nom n'est pas proposé. Chaque jalon peut avoir sa photo de référence et son instruction du poste (outil 3.2), et chaque modèle ses propres contrôles de départ.</p>
            {tpls.map((t, i) => (
              <details key={i} className="rounded-lg border border-slate-200">
                <summary className={`flex cursor-pointer items-center px-2.5 py-2 text-xs font-semibold text-slate-800 ${TOUCH}`}>{t.name.trim() || 'Modèle sans nom'}&nbsp;<span className="font-normal text-slate-500">· {plural(t.milestones.length, 'jalon')}</span></summary>
                <div className="space-y-2 border-t border-slate-100 p-2.5">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[12rem] flex-1"><Field label="Nom du modèle"><Typed className={FIELD} value={t.name} onSave={v => patchT(i, { name: v })} /></Field></div>
                    <Button kind="ghost" onClick={() => drop(tpls, i, setTpls)}><X size={14} />Retirer le modèle</Button>
                  </div>
                  {t.milestones.map((m, k) => (
                    <div key={k} className="space-y-2 rounded-lg border border-slate-200 p-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Typed className={`${FIELD} min-w-[9rem] flex-[1_1_9rem]`} value={m.label} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: libellé`} placeholder="Jalon" onSave={v => patchM(i, k, { label: v })} />
                        <Typed className={`${FIELD} min-w-[10rem] flex-[2_1_12rem]`} value={m.point} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: point contrôlé`} placeholder="Point contrôlé" onSave={v => patchM(i, k, { point: v })} />
                        <Typed className={`${FIELD} min-w-[10rem] flex-[2_1_12rem]`} value={m.requirement} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: exigence`} placeholder="Exigence" onSave={v => patchM(i, k, { requirement: v })} />
                        <Typed className={`${FIELD}\u202f!w-[72px]`} value={m.unit ?? ''} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: unité`} placeholder="Unité" onSave={v => patchM(i, k, { unit: v || undefined })} />
                        <TypedNum className={`!w-[80px] ${TOUCH16}`} value={m.min} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: mini`} placeholder="Mini" onChange={v => patchM(i, k, { min: v ?? undefined })} />
                        <TypedNum className={`!w-[80px] ${TOUCH16}`} value={m.max} aria-label={`Jalon ${k + 1} du modèle ${t.name.trim() || i + 1}\u202f: maxi`} placeholder="Maxi" onChange={v => patchM(i, k, { max: v ?? undefined })} />
                        <label className={CHECK}><input type="checkbox" className={BOX} checked={!!m.critical} onChange={e => patchM(i, k, { critical: e.target.checked || undefined })} />Critique</label>
                        <Button kind="ghost" className={`ml-auto ${ICON}`} aria-label={`Retirer le jalon ${m.label || k + 1} du modèle ${t.name.trim() || i + 1}`} onClick={() => drop(t.milestones, k, ms => patchT(i, { milestones: ms }))}><X size={14} /></Button>
                      </div>
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-[14rem] flex-1">
                          <Field label="Instruction du poste (outil 3.2)">
                            <select className={FIELD} value={m.sopId ?? ''} onChange={e => patchM(i, k, { sopId: e.target.value || undefined })}>
                              <option value="">Aucune instruction</option>
                              {m.sopId && !own(state.sops, m.sopId) && <option value={m.sopId}>Instruction supprimée</option>}
                              {sops.filter(x => x.id === m.sopId || sopPhase(x) !== 'archived').map(x => <option key={x.id} value={x.id}>{x.poste}{x.operation ? ` · ${x.operation}` : ''}</option>)}
                            </select>
                          </Field>
                        </div>
                        <div className="w-44 max-w-full space-y-1">
                          <span className="block text-xs font-semibold text-slate-700">Photo de référence&#8239;: à quoi ressemble un bon jalon</span>
                          <PhotoBox value={m.refPhoto ?? ''} label={`Photo de référence\u202f: jalon ${k + 1} du modèle ${t.name.trim() || i + 1}`} px={px}
                            onChange={v => { const was = m.refPhoto; patchM(i, k, { refPhoto: v || undefined }); if (!v && was) offer('Photo retirée', () => patchM(i, k, { refPhoto: was })); }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button className="!py-1" onClick={() => patchT(i, { milestones: [...t.milestones, { label: '', point: '', requirement: '' }] })}><Plus size={13} />Ajouter un jalon</Button>
                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                    <span className="text-xs font-semibold text-slate-700">Contrôles de départ de ce modèle</span>
                    <p className="text-xs text-slate-500">{t.shipChecks?.length ? "Ces contrôles remplacent ceux des réglages pour les commandes de ce modèle." : `Aucun contrôle propre à ce modèle\u202f: ceux des réglages s'appliquent (${words('shipChecks').join(', ') || 'aucun'}).`}</p>
                    {(t.shipChecks ?? []).map((w, j) => (
                      <div key={j} className="flex max-w-md gap-1.5">
                        <Typed className={FIELD} value={w} aria-label={`Contrôle de départ ${j + 1} du modèle ${t.name.trim() || i + 1}`} onSave={v => patchT(i, x => ({ shipChecks: (x.shipChecks ?? []).map((c, h) => (h === j ? v : c)) }))} />
                        <Button kind="ghost" className={ICON} aria-label={`Retirer le contrôle ${w || j + 1}`} onClick={() => drop(t.shipChecks ?? [], j, xs => patchT(i, { shipChecks: xs.length ? xs : undefined }))}><X size={14} /></Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button className="!py-1" onClick={() => patchT(i, { shipChecks: [...(t.shipChecks ?? []), ''] })}><Plus size={13} />Ajouter un contrôle à ce modèle</Button>
                      {t.shipChecks && <Button kind="ghost" className="!py-1" onClick={() => patchT(i, { shipChecks: undefined })}><RotateCcw size={13} />Reprendre ceux des réglages</Button>}
                    </div>
                  </div>
                </div>
              </details>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button className="!py-1" onClick={() => setTpls([...tpls, { name: '', milestones: [{ label: '', point: '', requirement: '' }] }])}><Plus size={13} />Nouveau modèle</Button>
              <select className={`${FIELD}\u202f!w-auto`} value="" aria-label="Copier un modèle existant" onChange={e => { if (e.target.value) copyOf(e.target.value); }}>
                <option value="">Copier un modèle…</option>{templatesOf(state.params).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </Sec>
        </div>
      </ToolSettings>
      {bar}
    </div>
  );
});
