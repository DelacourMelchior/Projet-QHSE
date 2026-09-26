// First launch: start from a job template (choose 8 to 10 KPIs and their targets), open the example,
// take over the previous version's data, or join a shared folder that already holds data.
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, FolderSync } from 'lucide-react';
import { toolDef, toolOfHash } from './tools';
import type { State } from '../domain/types';
import { blankState, demoState, PROFILES, type ProfileKey } from '../domain/templates';
import { parseNumber } from '../domain/numbers';
import { legacyLocal } from '../store/local';
import { useStore } from '../store/StoreContext';
import { Button, Card, Field, inputCls } from './common';

export function Onboarding() {
  const { replace, folder, author, setAuthor, connectFolder, reconnectFolder } = useStore();
  const legacy = useMemo(() => legacyLocal(), []);
  const asked = toolOfHash(window.location.hash);
  const tool = asked === 'home' || asked === '1.1' ? null : toolDef(asked);
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('');
  const [profile, setProfile] = useState<ProfileKey>('industrie');
  const [draft, setDraft] = useState<State | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [money, setMoney] = useState({ annualBudget: '600 000', netMarginPct: '5', avgQuoteValue: '4 500' });

  const chooseProfile = (p: ProfileKey) => {
    setProfile(p);
    const b = blankState(p);
    setDraft(b);
    setPicked(Object.fromEntries(Object.keys(b.kpis).map(id => [id, true])));
    setTargets(Object.fromEntries(Object.values(b.kpis).map(k => [k.id, k.target])));
  };
  const count = Object.values(picked).filter(Boolean).length;

  const finish = () => {
    if (!draft) return;
    const s = structuredClone(draft);
    Object.keys(s.kpis).forEach(id => {
      if (!picked[id]) { delete s.kpis[id]; return; }
      s.kpis[id].target = targets[id] ?? s.kpis[id].target;
      s.kpis[id].targetValue = parseNumber(s.kpis[id].target);
    });
    s.processes.forEach(p => { p.kpiIds = p.kpiIds.filter(id => s.kpis[id]); });
    s.settings = {
      ...s.settings, companyName: company.trim(), profile,
      annualBudget: parseNumber(money.annualBudget) ?? 600000,
      netMarginPct: parseNumber(money.netMarginPct) ?? 5,
      avgQuoteValue: parseNumber(money.avgQuoteValue) ?? 4500,
    };
    replace(s);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 sm:py-10">
      <div>
        <h1 className="text-xl font-bold text-delacour-primary">{tool ? `${tool.id} · ${tool.title}` : 'Outils Delacour : mise en route'}</h1>
        <p className="mt-1 text-xs text-slate-600">{tool
          ? `${tool.desc} La mise en route prépare l'entreprise pour les 19 outils, dont le tableau d'indicateurs (outil 1.1) qui partage le même plan d'actions.`
          : "Vos indicateurs clés, vos Plans B, vos devis, vos réclamations, votre bac rouge : 19 outils qui partagent un seul plan d'actions."} Vos données restent sur ce poste ou dans le dossier partagé de votre entreprise.</p>
      </div>

      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice title="Démarrer mon tableau" text="Choisir mon métier, 8 à 10 indicateurs et leurs cibles. Environ 5 minutes." onClick={() => { chooseProfile(profile); setStep(1); }} primary />
          <Choice title="Voir un exemple" text="Une entreprise fictive avec une année complète de chiffres et d'actions." onClick={() => replace(demoState())} />
          {legacy && <Choice title="Reprendre mes données" text="Des données de l'ancienne version de l'outil ont été trouvées sur ce poste." onClick={() => replace(legacy)} />}
          {folder.status !== 'unsupported' && (
            <Card className="space-y-2 p-4">
              <h2 className="text-sm font-bold text-slate-900">Rejoindre le dossier partagé</h2>
              <p className="text-[11px] text-slate-600">Votre entreprise utilise déjà le tableau dans OneDrive ou SharePoint : sélectionnez le dossier « donnees ».</p>
              <input className={inputCls} value={author} placeholder="Votre nom (signe vos saisies)" onChange={e => setAuthor(e.target.value)} />
              <Button kind="primary" disabled={!author.trim()} onClick={folder.status === 'needs-permission' ? reconnectFolder : connectFolder}><FolderSync size={14} />Choisir le dossier</Button>
            </Card>
          )}
        </div>
      )}

      {step === 1 && (
        <Card className="space-y-4 p-4">
          <h2 className="text-sm font-bold text-slate-900">1. Votre entreprise</h2>
          <Field label="Nom de l'entreprise"><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} /></Field>
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">Métier (propose une liste d'indicateurs adaptée)</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(PROFILES) as ProfileKey[]).map(p => (
                <button key={p} type="button" onClick={() => chooseProfile(p)} aria-pressed={profile === p}
                  className={`rounded-lg border p-3 text-left text-xs font-semibold transition ${profile === p ? 'border-delacour-primary bg-emerald-50 text-delacour-dark ring-1 ring-delacour-primary' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {PROFILES[p]}
                </button>
              ))}
            </div>
          </div>
          <Nav back={() => setStep(0)} next={() => setStep(2)} />
        </Card>
      )}

      {step === 2 && draft && (
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">2. Vos indicateurs et leurs cibles</h2>
            <span className={`text-[11px] font-semibold ${count > 10 ? 'text-amber-800' : 'text-slate-600'}`}>{count} sélectionné(s){count > 10 ? ' · conseil : 8 à 10 pour rester lisible' : ''}</span>
          </div>
          {draft.processes.map(p => (
            <div key={p.id} className="space-y-1.5">
              <h3 className="text-[11px] font-bold text-slate-700">{p.name}</h3>
              {p.kpiIds.map(id => draft.kpis[id]).map(k => (
                <div key={k.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 sm:flex-nowrap">
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-slate-800">
                    <input type="checkbox" checked={!!picked[k.id]} onChange={e => setPicked({ ...picked, [k.id]: e.target.checked })} />
                    <span className="truncate">{k.name}</span>
                  </label>
                  <input className={`${inputCls} sm:w-40`} disabled={!picked[k.id]} value={targets[k.id] ?? ''} aria-label={`Cible de ${k.name}`}
                    onChange={e => setTargets({ ...targets, [k.id]: e.target.value })} />
                </div>
              ))}
            </div>
          ))}
          <Nav back={() => setStep(1)} next={() => setStep(3)} disabled={count === 0} />
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4 p-4">
          <h2 className="text-sm font-bold text-slate-900">3. Vos hypothèses</h2>
          <p className="text-[11px] text-slate-600">Elles servent aux messages d'analyse ; vous pourrez les modifier dans Réglages.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Objectif de CA annuel (€ HT)"><input className={inputCls} value={money.annualBudget} onChange={e => setMoney({ ...money, annualBudget: e.target.value })} /></Field>
            <Field label="Marge nette habituelle (%)"><input className={inputCls} value={money.netMarginPct} onChange={e => setMoney({ ...money, netMarginPct: e.target.value })} /></Field>
            <Field label="Montant moyen d'un devis (€ HT)"><input className={inputCls} value={money.avgQuoteValue} onChange={e => setMoney({ ...money, avgQuoteValue: e.target.value })} /></Field>
          </div>
          <Nav back={() => setStep(2)} next={finish} nextLabel="Créer mon tableau" />
        </Card>
      )}
    </div>
  );
}

function Choice({ title, text, onClick, primary }: { title: string; text: string; onClick(): void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`space-y-1 rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-gold ${primary ? 'border-delacour-primary bg-delacour-primary text-white hover:bg-delacour-dark' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
      <div className="text-sm font-bold">{title}</div>
      <div className={`text-[11px] ${primary ? 'text-emerald-50' : 'text-slate-600'}`}>{text}</div>
    </button>
  );
}

function Nav({ back, next, nextLabel = 'Continuer', disabled }: { back(): void; next(): void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex justify-between pt-1">
      <Button kind="ghost" onClick={back}><ArrowLeft size={14} />Retour</Button>
      <Button kind="primary" onClick={next} disabled={disabled}>{nextLabel}<ArrowRight size={14} /></Button>
    </div>
  );
}
