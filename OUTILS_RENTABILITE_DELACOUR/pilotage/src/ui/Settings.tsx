// Company settings, KPI list, shared folder, backups, demo.
import { useRef, useState } from 'react';
import { Download, FolderSync, Plus, Upload } from 'lucide-react';
import type { Kpi, State } from '../domain/types';
import { fromLegacyTool } from '../domain/migrate';
import { parseNumber } from '../domain/numbers';
import { demoState } from '../domain/templates';
import { useStore } from '../store/StoreContext';
import { Button, Field, inputCls, Modal } from './common';

export function Settings({ onClose }: { onClose(): void }) {
  const { state, update, replace, folder, author, setAuthor, connectFolder, reconnectFolder, disconnectFolder, refresh } = useStore();
  const [s, setS] = useState(state!.settings);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!state) return null;

  const saveSettings = () => { update(d => { d.settings = s; }); setMsg('Hypothèses enregistrées.'); };

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
