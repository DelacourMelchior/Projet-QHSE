// Tool 4.4 "Classement": one shared filing plan in 5 processes, one file name rule PROC_TYPE_OBJET_AAAAMMJJ_Vxx,
// old versions moved to the archive folder, and a monthly test: find the last valid document in 30 seconds.
import { useState } from 'react';
import { Copy, Plus, Printer, Timer, X } from 'lucide-react';
import type { ChronoTest, Ged } from '../../domain/types';
import { CHRONO_SECONDS, checkName, chronoOk, chronoSummary, fileName, gedInsights, newChrono } from '../../domain/team';
import { applyTeamExample } from '../../domain/teamExamples';
import { processLabel } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Field, inputCls, Method, NumInput, StatusBadge, SubTitle, Summary, Tile, ToolHeader, YesNo } from '../common';
import { usePrintOne } from '../PrintOne';
import type { ScreenProps } from '../screens';

export function Classement(_: ScreenProps) {
  const { state, update } = useStore();
  const [printNode, print] = usePrintOne();
  if (!state) return null;
  const now = new Date();
  const g = state.ged;
  const c = chronoSummary(state, now);
  const setG = (x: Partial<Ged>) => update(d => { d.ged = { ...d.ged, ...x }; });
  return (
    <div className="space-y-4">
      <Summary title="Trouve-t-on le bon document en 30 secondes ?" insights={gedInsights(state, now)} tiles={<>
        <Tile title="Tests sur 6 mois" value={String(c.count)} sub="un collaborateur tiré au sort chaque mois" />
        <Tile title="Réussis" value={c.okPct === null ? '—' : `${c.okPct} %`} sub={`bonne version, en ${CHRONO_SECONDS} secondes ou moins`} tone={c.okPct === null ? undefined : c.okPct === 100 ? 'ok' : c.okPct >= 70 ? 'warn' : 'alert'} />
        <Tile title="Version périmée ouverte" value={String(c.obsolete)} sub="document ancien encore dans le dossier actif" tone={c.obsolete ? 'alert' : undefined} />
        <Tile title="Test du mois" value={c.monthDone ? 'Fait' : 'À faire'} sub={c.last ? `dernier le ${frDate(c.last.date)}` : 'aucun test'} tone={c.monthDone ? 'ok' : 'warn'} />
      </>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Namer g={g} />
        <Checker g={g} />
      </div>
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Plan de classement" text="Un seul dossier partagé, 5 dossiers de processus, rien sur les bureaux des ordinateurs.">
          <Button onClick={() => print(<Charter g={g} company={state.settings.companyName} />)}><Printer size={14} />Charte à afficher</Button>
          {!Object.keys(state.chronos).length && <Button kind="ghost" onClick={() => update(d => applyTeamExample(d))}>Voir un exemple traité</Button>}
        </ToolHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Responsable du classement"><input className={inputCls} value={g.owner} list="people" onChange={e => setG({ owner: e.target.value })} /></Field>
          <Field label="Dossier des anciennes versions" hint="Toute ancienne version y part dès qu'une nouvelle est publiée."><input className={`${inputCls} font-mono`} value={g.archive} onChange={e => setG({ archive: e.target.value })} /></Field>
        </div>
        <ul className="space-y-1.5">
          {g.folders.map((f, i) => (
            <li key={i} className="grid items-center gap-1.5 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_2fr_1fr]">
              <input className={`${inputCls} font-mono font-semibold`} value={f.code} aria-label={`Dossier ${i + 1}`} onChange={e => setG({ folders: g.folders.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)) })} />
              <input className={inputCls} value={f.subfolders.join(' · ')} aria-label={`Sous-dossiers de ${f.code}`} title="Sous-dossiers, séparés par ·"
                onChange={e => setG({ folders: g.folders.map((x, j) => (j === i ? { ...x, subfolders: e.target.value.split('·').map(s => s.trim()).filter(Boolean) } : x)) })} />
              <input className={inputCls} value={f.rights} aria-label={`Droits d'accès de ${f.code}`} placeholder="Droits d'accès" onChange={e => setG({ folders: g.folders.map((x, j) => (j === i ? { ...x, rights: e.target.value } : x)) })} />
            </li>
          ))}
        </ul>
      </Card>
      <Chronos />
      <Method rule="Chaque minute passée à chercher un fichier, et chaque pièce faite sur un plan périmé, est une perte évitable."
        steps={[['Grand tri', "2 heures d'équipe : supprimer les doublons, vider les bureaux, classer dans les 5 dossiers."], ['Nommage obligatoire', 'La charte affichée près de chaque poste ; un document mal nommé est renommé tout de suite.'], ['Test des 30 secondes', 'Chaque mois, une personne tirée au sort ouvre le dernier plan ou devis validé.']]}
        tips={["L'atelier ne fabrique que sur un plan PDF validé, avec l'indice de version visible."]} />
      {printNode}
    </div>
  );
}

// Builds a compliant file name
function Namer({ g }: { g: Ged }) {
  const [p, setP] = useState({ proc: g.procCodes[0]?.code || 'DIR', type: g.typeCodes[0]?.code || 'DEV', object: '', date: isoDate(new Date()), version: 1, ext: 'pdf' });
  const [copied, setCopied] = useState(false);
  const name = fileName(p);
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <SubTitle>Nommer un fichier</SubTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Processus"><select className={inputCls} value={p.proc} onChange={e => setP({ ...p, proc: e.target.value })}>{g.procCodes.map(c => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}</select></Field>
        <Field label="Type"><select className={inputCls} value={p.type} onChange={e => setP({ ...p, type: e.target.value })}>{g.typeCodes.map(c => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}</select></Field>
        <Field label="Objet (client, affaire, pièce)"><input className={inputCls} value={p.object} onChange={e => setP({ ...p, object: e.target.value })} /></Field>
        <Field label="Date"><input type="date" className={inputCls} value={p.date} onChange={e => setP({ ...p, date: e.target.value })} /></Field>
        <Field label="Version"><NumInput value={p.version} onChange={v => setP({ ...p, version: Math.max(1, Math.round(v ?? 1)) })} /></Field>
        <Field label="Extension"><input className={inputCls} value={p.ext} onChange={e => setP({ ...p, ext: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-slate-900">{name}</code>
        <Button className="shrink-0 !px-2 !py-1" onClick={() => navigator.clipboard?.writeText(name).then(() => setCopied(true)).catch(() => undefined)}><Copy size={13} />{copied ? 'Copié' : 'Copier'}</Button>
      </div>
    </Card>
  );
}

// Tells why a file name does not follow the charter
function Checker({ g }: { g: Ged }) {
  const [name, setName] = useState('plan_chassis_final_v2_bon.dwg');
  const issues = checkName(name, g);
  return (
    <Card className="space-y-2 p-3 sm:p-4">
      <SubTitle>Vérifier un nom existant</SubTitle>
      <Field label="Nom du fichier"><input className={`${inputCls} font-mono`} value={name} onChange={e => setName(e.target.value)} /></Field>
      {issues.length === 0 ? <StatusBadge level="ok" text="Conforme à la charte" /> : (
        <ul className="space-y-1">{issues.map(i => <li key={i} className="flex items-start gap-1.5 text-[11px] text-red-800"><X size={13} className="mt-0.5 shrink-0" />{i}</li>)}</ul>
      )}
      <p className="text-[11px] text-slate-500">Exemples conformes : BE_PLN_CHASSIS_20260914_V02.pdf · COM_DEV_CLIENT_ALPHA_20260914_V01.pdf</p>
    </Card>
  );
}

function Chronos() {
  const { state, update } = useStore();
  const [t, setT] = useState<ChronoTest | null>(null);
  if (!state) return null;
  const list = Object.values(state.chronos).sort((a, b) => (a.date < b.date ? 1 : -1));
  const save = () => { if (!t || !t.person.trim() || !t.asked.trim()) return; update(d => { d.chronos[t.id] = t; }); setT(null); };
  return (
    <Card className="space-y-3 p-3 sm:p-4">
      <ToolHeader title="Test des 30 secondes" text="Demander d'ouvrir le dernier plan ou devis validé, chronomètre en main.">
        {!t && <Button kind="primary" onClick={() => setT(newChrono())}><Timer size={14} />Faire le test du mois</Button>}
      </ToolHeader>
      {t && (
        <div className="grid items-end gap-2 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-[auto_1fr_1.5fr_auto]">
          <Field label="Date"><input type="date" className={inputCls} value={t.date} onChange={e => setT({ ...t, date: e.target.value })} /></Field>
          <Field label="Personne tirée au sort"><input className={inputCls} value={t.person} list="people" onChange={e => setT({ ...t, person: e.target.value })} /></Field>
          <Field label="Document demandé"><input className={inputCls} value={t.asked} placeholder="Ex. : dernier plan validé du châssis 405" onChange={e => setT({ ...t, asked: e.target.value })} /></Field>
          <Field label="Secondes"><NumInput className="!w-20" value={t.seconds} onChange={v => setT({ ...t, seconds: v })} /></Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-700">Trouvé <YesNo label="Document trouvé" value={t.found} onChange={v => setT({ ...t, found: v !== false })} /></span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-700">Une version périmée a été ouverte <YesNo label="Version périmée ouverte" value={t.obsolete} onChange={v => setT({ ...t, obsolete: v === true })} /></span>
          </div>
          <div className="flex gap-1.5"><Button onClick={() => setT(null)}>Annuler</Button><Button kind="primary" disabled={!t.person.trim() || !t.asked.trim()} onClick={save}><Plus size={14} />Enregistrer</Button></div>
        </div>
      )}
      {list.length === 0 ? <p className="text-[11px] text-slate-500">Aucun test enregistré.</p> : (
        <ul className="divide-y divide-slate-100">
          {list.map(x => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-[11px]">
              <span className="font-mono text-slate-600">{frDate(x.date)}</span>
              <span className="min-w-0 flex-1 text-slate-800"><strong>{x.person}</strong> · {x.asked}</span>
              <span className="font-mono font-semibold">{x.seconds === null ? '—' : `${x.seconds} s`}</span>
              <StatusBadge level={chronoOk(x) ? 'ok' : 'alert'} text={!x.found ? 'Pas trouvé' : x.obsolete ? 'Version périmée' : chronoOk(x) ? 'Réussi' : 'Trop long'} />
              <button type="button" aria-label="Supprimer ce test" onClick={() => update(d => { delete d.chronos[x.id]; })} className="rounded p-0.5 text-slate-400 hover:text-red-600"><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// The A4 charter posted next to each computer
function Charter({ g, company }: { g: Ged; company: string }) {
  return (
    <div className="space-y-3 p-2 text-[10pt]">
      <header className="border-b-2 border-delacour-primary pb-1.5">
        <div className="text-[8pt] font-semibold text-slate-500">{company ? `${company} · ` : ''}Charte de nommage et de classement</div>
        <h1 className="text-[16pt] font-bold text-delacour-primary">Trouver n'importe quel document en 30 secondes</h1>
      </header>
      <section>
        <h2 className="font-bold">Le nom d'un fichier</h2>
        <p className="my-1 rounded bg-slate-100 p-1.5 text-center font-mono text-[13pt] font-bold">PROC_TYPE_OBJET_AAAAMMJJ_Vxx</p>
        <p>Exemple : <span className="font-mono font-semibold">BE_PLN_CHASSIS_20260914_V02.pdf</span>. Interdit : « final », « dernier », « nouveau », « bon », « copie », les espaces et les accents.</p>
        <div className="mt-1 grid grid-cols-2 gap-3 text-[9pt]">
          <div><strong>Processus :</strong> {g.procCodes.map(c => `${c.code} ${c.label.toLowerCase()}`).join(' · ')}</div>
          <div><strong>Types :</strong> {g.typeCodes.map(c => `${c.code} ${c.label.toLowerCase()}`).join(' · ')}</div>
        </div>
      </section>
      <section>
        <h2 className="font-bold">Le plan de classement</h2>
        <table className="mt-1 w-full border-collapse text-[9pt]">
          <tbody>
            {g.folders.map(f => (
              <tr key={f.code} className="border-b border-slate-300">
                <td className="py-1 pr-2 font-mono font-bold">{f.code}</td>
                <td className="py-1 pr-2">{f.subfolders.join(' · ')}</td>
                <td className="py-1 text-slate-600">{f.rights} {f.processId ? `(${processLabel(f.processId).split(' · ')[0]})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="font-bold">Les règles</h2>
        <ul className="list-disc pl-5">
          <li>Aucun fichier sur le bureau de l'ordinateur : tout est dans le dossier partagé.</li>
          <li>Une seule version active : toute nouvelle version fait passer l'ancienne dans <span className="font-mono">{g.archive}</span>.</li>
          <li>L'atelier ne fabrique que sur un plan PDF validé, avec son indice de version.</li>
          <li>Chaque mois, une personne tirée au sort doit ouvrir le bon document en 30 secondes.</li>
        </ul>
        <p className="mt-2 text-[9pt] text-slate-600">Responsable du classement : {g.owner || '—'}</p>
      </section>
    </div>
  );
}
