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
import { toolDef, type ToolId } from './tools';
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
          <Button kind="primary" onClick={() => { if (params.hourlyRate <= 0) return setMsg('Le coût horaire doit être positif.'); update(d => { d.params = params; }); setMsg('Hypothèses des outils enregistrées.'); }}>Enregistrer les hypothèses des outils</Button>
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
