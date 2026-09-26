// Company settings, KPI list, risk rating scale, shared folder, backups, demo.
import { useMemo, useRef, useState } from 'react';
import { Download, FolderSync, Plus, Upload } from 'lucide-react';
import type { Kpi, State } from '../domain/types';
import { fromLegacyTool } from '../domain/migrate';
import { parseNumber } from '../domain/numbers';
import { demoState } from '../domain/templates';
import { autoThresholds, DEFAULT_SCALE } from '../domain/risk';
import { formatValue } from '../domain/numbers';
import { legacyToolRecords } from '../domain/legacyTools';
import { legacyLocalTools } from '../store/local';
import { useStore } from '../store/StoreContext';
import { TOOLS, toolDef, type ToolId } from './tools';
import { QUESTIONS } from '../domain/commercial';
import { flatten, unflatten } from '../store/flat';
import { frStamp } from '../domain/base';
import { Button, Field, inputCls, Modal } from './common';

export function Settings({ onClose }: { onClose(): void }) {
  const { state, update, replace, folder, author, setAuthor, connectFolder, reconnectFolder, disconnectFolder, refresh, teamView } = useStore();
  const [s, setS] = useState(state!.settings);
  const [scale, setScale] = useState(state!.scale);
  const [th, setTh] = useState<string[]>(() => (state!.settings.gravityThresholds || ['', '', '']).map(String));
  const [msg, setMsg] = useState('');
  const [params, setParams] = useState(state!.params);
  const legacy = useMemo(() => legacyToolRecords(legacyLocalTools(), state!), []); // eslint-disable-line react-hooks/exhaustive-deps
  const legacyTotal = Object.values(legacy.counts).reduce((a, b) => a + b, 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  if (!state) return null;

  const saveSettings = () => { update(d => { d.settings = { ...s, gravityThresholds: d.settings.gravityThresholds }; }); setMsg('Hypothèses enregistrées.'); };

  // Rating scale of the risks: bounds in € (direction) and wording of the levels (everyone)
  const auto = autoThresholds(s);
  const saveScale = () => {
    const nums = th.map(v => (v.trim() === '' ? null : parseNumber(v)));
    const custom = nums.every(v => v === null) ? null : nums.map((v, i) => v ?? auto[i]) as [number, number, number];
    if (custom && !(custom[0] < custom[1] && custom[1] < custom[2])) return setMsg('Les seuils de gravité doivent être croissants.');
    update(d => {
      if (!teamView) d.settings.gravityThresholds = custom;
      d.scale = { gravity: scale.gravity.map((t, i) => t.trim() || DEFAULT_SCALE.gravity[i]), likelihood: scale.likelihood.map((t, i) => t.trim() || DEFAULT_SCALE.likelihood[i]) };
    });
    setMsg('Échelle de cotation enregistrée.');
  };
  const setText = (k: 'gravity' | 'likelihood', i: number, v: string) => setScale({ ...scale, [k]: scale[k].map((t, j) => (j === i ? v : t)) });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'delacour-pilotage', version: 2, exportedAt: new Date().toISOString(), state }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pilotage-${(state.settings.companyName || 'entreprise').replace(/[^a-z0-9]+/gi, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      const next: State | null = j?.app === 'delacour-pilotage' && j.state?.kpis ? j.state
        : j?.tool_1_1?.processes ? fromLegacyTool(j.tool_1_1)     // backup of the previous version
        : null;
      if (!next) return setMsg("Ce fichier n'est pas une sauvegarde du tableau de pilotage.");
      if (!window.confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) return;
      replace(next);
      setMsg('Sauvegarde restaurée.');
    } catch { setMsg('Fichier illisible.'); }
  };

  // Records of another device added to this one: new or changed records win, nothing is removed
  const mergeJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'delacour-pilotage' || !j.state) return setMsg("Ce fichier n'est pas une sauvegarde des outils.");
      const mine = flatten(state), theirs = flatten(j.state as State);
      const keys = Object.keys(theirs).filter(k => k !== 'settings' && k !== 'timeline' && k !== 'params' && JSON.stringify(mine[k]) !== JSON.stringify(theirs[k]));
      if (!keys.length) return setMsg('Rien de nouveau dans ce fichier.');
      if (!window.confirm(`Ajouter ou mettre à jour ${keys.length} élément(s) venant de ce fichier ?`)) return;
      const merged = unflatten({ ...mine, ...Object.fromEntries(keys.map(k => [k, theirs[k]])) });
      update(d => { Object.assign(d, merged, { settings: d.settings, timeline: d.timeline, params: d.params }); });
      setMsg(`${keys.length} élément(s) fusionné(s).`);
    } catch { setMsg('Fichier illisible.'); }
  };

  const addKpi = (processId: string) => {
    const id = `kpi_${Date.now().toString(36)}`;
    const k: Kpi = { id, name: 'Nouvel indicateur', processId, type: 'Moteur', unit: '', direction: 'higher', aggregation: 'avg', target: '', targetValue: null, confidential: false, source: '' };
    update(d => { d.kpis[id] = k; d.processes.find(p => p.id === processId)?.kpiIds.push(id); });
    setMsg('Indicateur ajouté : cliquez sur son nom dans le tableau pour le définir.');
  };

  const folderText = {
    unsupported: "Ce navigateur ne peut pas écrire dans un dossier. Ouvrez l'application dans Microsoft Edge ou Google Chrome pour partager les données.",
    local: "Les données sont enregistrées dans ce navigateur uniquement.",
    'needs-permission': `Dossier « ${folder.name || 'données'} » : le navigateur redemande l'accès à chaque session.`,
    connected: `Connecté à « ${folder.name} » · ${folder.contributors.length} contributeur(s)${folder.hasDirection ? '' : ' · sans accès au dossier direction : montants masqués'}.`,
    error: folder.error,
  }[folder.status];

  return (
    <Modal wide title="Réglages" onClose={onClose}>
      <div className="space-y-6">
        {msg && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">{msg}</p>}

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900">Entreprise et hypothèses</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom de l'entreprise"><input className={inputCls} value={s.companyName} onChange={e => setS({ ...s, companyName: e.target.value })} /></Field>
            <Field label="Objectif de CA annuel (€ HT)" hint="Sert au CA cumulé comparé à l'objectif à date et à la projection de fin d'année.">
              <input className={inputCls} inputMode="decimal" value={s.annualBudget} onChange={e => setS({ ...s, annualBudget: parseNumber(e.target.value) ?? 0 })} />
            </Field>
            <Field label="Marge nette habituelle (%)" hint="CA à refaire pour compenser 1 € perdu = 100 / marge nette.">
              <input className={inputCls} inputMode="decimal" value={s.netMarginPct} onChange={e => setS({ ...s, netMarginPct: parseNumber(e.target.value) ?? 5 })} />
            </Field>
            <Field label="Montant moyen d'un devis (€ HT)" hint="Sert à chiffrer les devis en attente de relance.">
              <input className={inputCls} inputMode="decimal" value={s.avgQuoteValue} onChange={e => setS({ ...s, avgQuoteValue: parseNumber(e.target.value) ?? 0 })} />
            </Field>
          </div>
          <Button kind="primary" onClick={saveSettings}>Enregistrer les hypothèses</Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900">Hypothèses des outils 2 à 5</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Coût horaire chargé (€/h)" hint="Valorise les heures perdues, de retouche et de reprise (5.1, 5.2, 3.1, 2.1)."><input className={inputCls} inputMode="decimal" value={params.hourlyRate} onChange={e => setParams({ ...params, hourlyRate: parseNumber(e.target.value) ?? 0 })} /></Field>
            <Field label="Marge brute plancher (%)" hint="En dessous, un devis ne part qu'avec une dérogation (2.1)."><input className={inputCls} inputMode="decimal" value={params.marginFloorPct} onChange={e => setParams({ ...params, marginFloorPct: parseNumber(e.target.value) ?? 0 })} /></Field>
            <Field label="Acompte à la commande (%)"><input className={inputCls} inputMode="decimal" value={params.depositPct} onChange={e => setParams({ ...params, depositPct: parseNumber(e.target.value) ?? 0 })} /></Field>
            <Field label="Visas obligatoires dès (€ HT)" hint="Commercial, technique et direction (2.1)."><input className={inputCls} inputMode="decimal" value={params.visaThreshold} onChange={e => setParams({ ...params, visaThreshold: parseNumber(e.target.value) ?? 0 })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Frais généraux (%)" hint="Ajoutés au coût direct d'un devis pour le résultat après frais (2.1)."><input className={inputCls} inputMode="decimal" value={params.overheadPct ?? 0} onChange={e => setParams({ ...params, overheadPct: parseNumber(e.target.value) ?? 0 })} /></Field>
            <Field label="Marge sur coûts variables (%)" hint="Seconde lecture du CA à refaire (5.2)."><input className={inputCls} inputMode="decimal" value={params.variableMarginPct ?? ''} onChange={e => setParams({ ...params, variableMarginPct: parseNumber(e.target.value) ?? undefined })} /></Field>
            <Field label="Atelier 5 Pourquoi dès (€)" hint="Coût d'un défaut qui déclenche un atelier (5.3)."><input className={inputCls} inputMode="decimal" value={params.cnqTrigger ?? 500} onChange={e => setParams({ ...params, cnqTrigger: parseNumber(e.target.value) ?? 500 })} /></Field>
            <label className="flex items-center gap-2 pt-5 text-[11px] text-slate-700"><input type="checkbox" checked={!!params.businessHours} onChange={e => setParams({ ...params, businessHours: e.target.checked })} />Délais de 24 h et 48 h comptés du lundi au vendredi</label>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">Coût horaire par poste ou machine (sinon le coût horaire général)</span>
            {(params.rates || []).map((r, i) => (
              <div key={i} className="flex gap-1.5">
                <input className={inputCls} value={r.name} placeholder="Poste ou machine (ex. : CNC 5 axes)" aria-label="Poste" onChange={e => setParams({ ...params, rates: params.rates!.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className={`${inputCls} w-28`} inputMode="decimal" value={r.rate} aria-label="Coût horaire" onChange={e => setParams({ ...params, rates: params.rates!.map((x, j) => (j === i ? { ...x, rate: parseNumber(e.target.value) ?? 0 } : x)) })} />
                <Button kind="ghost" onClick={() => setParams({ ...params, rates: params.rates!.filter((_, j) => j !== i) })} aria-label="Retirer ce poste">Retirer</Button>
              </div>
            ))}
            <Button onClick={() => setParams({ ...params, rates: [...(params.rates || []), { name: '', rate: params.hourlyRate }] })}><Plus size={14} />Ajouter un poste</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Page d'avis en ligne (Google…)" hint="Proposée aux clients qui vous recommandent (2.4)."><input className={inputCls} value={params.reviewLink || ''} onChange={e => setParams({ ...params, reviewLink: e.target.value })} /></Field>
            <Field label="Coordonnées imprimées sur les documents" hint="Adresse, SIRET, téléphone, e-mail (fiches de débit, PV, avenants).">
              <input className={inputCls} value={params.company?.address || ''} placeholder="Adresse" onChange={e => setParams({ ...params, company: { address: e.target.value, siret: params.company?.siret || '', phone: params.company?.phone || '', email: params.company?.email || '' } })} />
            </Field>
            <Field label="SIRET"><input className={inputCls} value={params.company?.siret || ''} onChange={e => setParams({ ...params, company: { address: params.company?.address || '', siret: e.target.value, phone: params.company?.phone || '', email: params.company?.email || '' } })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Téléphone"><input className={inputCls} value={params.company?.phone || ''} onChange={e => setParams({ ...params, company: { address: params.company?.address || '', siret: params.company?.siret || '', phone: e.target.value, email: params.company?.email || '' } })} /></Field>
              <Field label="E-mail"><input className={inputCls} value={params.company?.email || ''} onChange={e => setParams({ ...params, company: { address: params.company?.address || '', siret: params.company?.siret || '', phone: params.company?.phone || '', email: e.target.value } })} /></Field>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">Les 3 questions du bilan de fin d'affaire (vide = questions d'origine)</span>
            {[0, 1, 2].map(i => <input key={i} className={inputCls} value={params.questions?.[i] || ''} placeholder={QUESTIONS[i]} aria-label={`Question ${i + 1}`} onChange={e => { const q = [...(params.questions || ['', '', ''])]; q[i] = e.target.value; setParams({ ...params, questions: q }); }} />)}
          </div>
          <Button kind="primary" onClick={() => { if (params.hourlyRate <= 0) return setMsg('Le coût horaire doit être positif.'); update(d => { d.params = params; }); setMsg('Hypothèses des outils enregistrées.'); }}>Enregistrer les hypothèses des outils</Button>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Droits dans les outils</h3>
          <label className="flex items-center gap-2 text-[11px] text-slate-700"><input type="checkbox" checked={!!params.teamCanDelete} onChange={e => setParams({ ...params, teamCanDelete: e.target.checked })} />En vue équipe, autoriser la suppression des fiches (sinon réservée à la direction)</label>
          <span className="block text-[11px] font-semibold text-slate-700">Outils réservés à la direction (masqués en vue équipe)</span>
          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map(x => {
              const on = (params.restricted || []).includes(x.id);
              return <button key={x.id} type="button" aria-pressed={on} onClick={() => setParams({ ...params, restricted: on ? params.restricted!.filter(y => y !== x.id) : [...(params.restricted || []), x.id] })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? 'border-delacour-primary bg-delacour-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{x.id} {x.label}</button>;
            })}
          </div>
          <p className="text-[11px] text-slate-500">Données personnelles (RGPD) : noms, niveaux de compétence, résultats des tests d'autonomie et réclamations nominatives sont des données personnelles. Réservez 4.2 et 4.3 à la direction si besoin, informez les salariés de l'usage de ces outils (présentation au CSE), et supprimez les fiches des personnes parties après la durée utile. La protection réelle vient des droits du dossier partagé (dossier direction).</p>
          <Button kind="primary" onClick={() => { update(d => { d.params = params; }); setMsg('Droits enregistrés.'); }}>Enregistrer les droits</Button>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900">Cotation des risques (Plans B)</h3>
          {!teamView && (
            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-700">Seuils de gravité (€ par incident)</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {['Mineure : moins de', 'Sérieuse : moins de', 'Grave : moins de'].map((l, i) => (
                  <Field key={l} label={l}><input inputMode="decimal" className={inputCls} value={th[i]} placeholder={formatValue(auto[i], '€')} onChange={e => setTh(th.map((x, j) => (j === i ? e.target.value : x)))} /></Field>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">Au-delà du dernier seuil : critique. Vide = calcul automatique d'après l'objectif de CA (0,2 %, 2 % et 8 %).</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(['gravity', 'likelihood'] as const).map(k => (
              <div key={k} className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-700">{k === 'gravity' ? 'Gravité : conséquences de chaque niveau' : 'Probabilité : fréquence de chaque niveau'}</span>
                {scale[k].map((t, i) => (
                  <input key={i} className={inputCls} value={t} aria-label={`${k === 'gravity' ? 'Gravité' : 'Probabilité'} ${i + 1}`} onChange={e => setText(k, i, e.target.value)} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button kind="primary" onClick={saveScale}>Enregistrer l'échelle</Button>
            <Button kind="ghost" onClick={() => { setScale(DEFAULT_SCALE); setTh(['', '', '']); }}>Revenir à l'échelle d'origine</Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Partage des données (OneDrive, SharePoint…)</h3>
          <p className="text-[11px] text-slate-600">{folderText}</p>
          {folder.status !== 'unsupported' && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Votre nom (signe vos saisies)"><input className={`${inputCls} w-56`} value={author} onChange={e => setAuthor(e.target.value)} /></Field>
              {folder.status === 'local' && <Button kind="primary" disabled={!author.trim()} onClick={connectFolder}><FolderSync size={14} />Choisir le dossier de données</Button>}
              {folder.status === 'needs-permission' && <Button kind="primary" onClick={reconnectFolder}><FolderSync size={14} />Reconnecter le dossier</Button>}
              {folder.status === 'connected' && <Button onClick={refresh}>Actualiser</Button>}
              {folder.status !== 'local' && <Button onClick={disconnectFolder}>Déconnecter</Button>}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Indicateurs</h3>
          <p className="text-[11px] text-slate-600">Pour modifier ou supprimer un indicateur, cliquez sur son nom dans le tableau. Pour en ajouter :</p>
          <div className="flex flex-wrap gap-2">
            {state.processes.map(p => <Button key={p.id} onClick={() => addKpi(p.id)}><Plus size={14} />{p.name.split(' · ')[0]}</Button>)}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Sauvegarde</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportJson}><Download size={14} />Exporter une sauvegarde (.json)</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload size={14} />Restaurer une sauvegarde</Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
          </div>
          <p className="text-[11px] text-slate-500">Les sauvegardes de l'ancienne version de l'outil sont acceptées.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Saisies faites sur un téléphone ou un autre poste</h3>
          <p className="text-[11px] text-slate-600">Sur un téléphone, les saisies restent sur l'appareil : exportez-les (Sauvegarde ci-dessus), déposez le fichier dans OneDrive, puis fusionnez-le ici depuis un poste connecté au dossier partagé. Les fiches nouvelles ou modifiées s'ajoutent ; rien n'est effacé.</p>
          <Button onClick={() => mergeRef.current?.click()}><Upload size={14} />Fusionner un fichier de saisies</Button>
          <input ref={mergeRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) mergeJson(f); e.target.value = ''; }} />
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Journal des modifications</h3>
          <p className="text-[11px] text-slate-600">Qui a créé, modifié ou supprimé quoi (400 dernières opérations).</p>
          <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-[11px]">
            {Object.values(state.logs || {}).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 150).map(l => (
              <li key={l.id} className="flex gap-2 px-2 py-1"><span className="w-32 shrink-0 font-mono text-slate-500">{frStamp(`${l.at.slice(0, 10)}T${new Date(l.at).toTimeString().slice(0, 5)}`)}</span><span className="w-24 shrink-0 font-semibold text-slate-800">{l.by}</span><span className="min-w-0 flex-1 truncate text-slate-700">{l.what} · {KIND_NAMES[l.kind] || l.kind} {recordName(state, l.kind, l.ref)}</span></li>
            ))}
            {!Object.keys(state.logs || {}).length && <li className="px-2 py-2 text-slate-500">Aucune modification enregistrée.</li>}
          </ul>
        </section>

        {legacyTotal > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Ancienne version des outils 2 à 5</h3>
            <p className="text-[11px] text-slate-600">Données trouvées sur ce poste : {Object.entries(legacy.counts).filter(([, n]) => n).map(([id, n]) => `${toolDef(id as ToolId).label} (${n})`).join(', ')}. Elles s'ajoutent aux données actuelles ; rien n'est effacé.</p>
            <Button onClick={() => { if (window.confirm(`Reprendre ${legacyTotal} élément(s) de l'ancienne version ?`)) { update(d => legacy.apply(d)); setMsg('Données de l\'ancienne version reprises : vérifiez-les outil par outil.'); } }}>Reprendre ces données</Button>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Données</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { if (window.confirm('Charger l\'exemple fictif ? Vos données actuelles seront remplacées.')) { replace(demoState()); onClose(); } }}>Charger l'exemple de démonstration</Button>
            <Button kind="danger" onClick={() => { if (window.confirm('Repartir de zéro ? Vos données de ce poste seront effacées (exportez une sauvegarde avant).')) { replace(null); onClose(); } }}>Repartir de zéro</Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

const KIND_NAMES: Record<string, string> = {
  action: 'action', risk: 'risque', contact: 'contact', quote: 'devis', change: 'avenant', complaint: 'réclamation', feedback: 'bilan', supplier: 'fournisseur',
  debit: 'fiche de débit', sop: 'instruction', equipment: 'machine', delivery: 'réception', power: 'pouvoir', person: 'personne', skill: 'compétence',
  newcomer: 'arrivant', chrono: 'test 30 s', nc: 'fiche bac rouge', analysis: 'atelier 5P', poka: 'détrompeur', kpi: 'indicateur', process: 'processus',
};
function recordName(s: State, kind: string, id: string): string {
  const col: Record<string, Record<string, unknown> | undefined> = { action: s.actions, risk: s.risks, contact: s.contacts, quote: s.quotes, change: s.changes, complaint: s.complaints, feedback: s.feedbacks, supplier: s.suppliers, debit: s.debits, sop: s.sops, equipment: s.equipments, delivery: s.deliveries, power: s.powers, person: s.people, skill: s.skills, newcomer: s.newcomers, nc: s.ncs, analysis: s.analyses, poka: s.pokas, kpi: s.kpis };
  const x = col[kind]?.[id] as Record<string, string> | undefined;
  return x ? (x.ref || x.title || x.name || x.power || x.client || x.poste || x.defect || '') : '(supprimé)';
}
