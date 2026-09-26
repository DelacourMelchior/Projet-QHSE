// Tool 3.3 "Maintenance": 10 minutes of sensory inspection every Monday on each bottleneck machine (look, listen, smell, levels),
// anomalies written at the first leak, and the survival cabinet: the critical wear parts kept under lock, reordered the day one is used.
import { useEffect, useState } from 'react';
import { FileDown, Minus, Plus, Trash2, Wrench, X } from 'lucide-react';
import type { Equipment, Inspection } from '../../domain/types';
import {
  anomalies, equipmentInsights, INSPECTION_STATE, inspectionState, lastInspection, lowParts, newEquipment, routineRate,
} from '../../domain/operations';
import { applyOperationsExample } from '../../domain/operationsExamples';
import { routinePdf } from '../../domain/operationsPdf';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Empty, Field, inputCls, Method, Modal, NumInput, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

export function Maintenance({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Equipment | null>(null);
  useEffect(() => { if (focus && state?.equipments[focus]) { setOpen(state.equipments[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.equipments).sort((a, b) => a.name.localeCompare(b.name));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Maintenance : 10 minutes le lundi pour ne pas perdre 3 jours en plein pic" text="Pour chaque machine goulet : 5 points à regarder, écouter, sentir chaque lundi avant le lancement, et une armoire de survie avec les 3 pièces d'usure critiques sous clé.">
          <Button kind="primary" onClick={() => setOpen(newEquipment())}><Plus size={14} />Ajouter une machine</Button>
          <Button onClick={() => update(d => applyOperationsExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <EquipmentSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const upToDate = all.filter(e => inspectionState(e, now) === 'ok').length;
  const ano = all.reduce((n, e) => n + anomalies(e).length, 0);
  const low = all.reduce((n, e) => n + lowParts(e).length, 0);
  return (
    <div className="space-y-4">
      <Summary title="Les machines goulets sont-elles surveillées ?" insights={equipmentInsights(state, now)} tiles={<>
        <Tile title="Machines suivies" value={String(all.length)} sub={`${all.filter(e => e.riskId).length} reliée(s) à un Plan B (1.2)`} />
        <Tile title="Inspectées cette semaine" value={`${upToDate} / ${all.length}`} sub="routine du lundi" tone={upToDate === all.length ? 'ok' : 'warn'} />
        <Tile title="Anomalies ouvertes" value={String(ano)} sub="relevées à la dernière inspection" tone={ano ? 'alert' : undefined} />
        <Tile title="Pièces sous le stock mini" value={String(low)} sub="armoire de survie" tone={low ? 'alert' : 'ok'} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Machines goulets" text="Celles dont l'arrêt bloque l'atelier. L'opérateur nettoie, surveille, graisse ; la maintenance spécialisée fait les révisions lourdes.">
          <Button kind="primary" onClick={() => setOpen(newEquipment())}><Plus size={14} />Ajouter une machine</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les fournisseurs, fiches de débit, instructions, équipements et réceptions par des exemples ?')) update(d => applyOperationsExample(d)); }}>Remplir avec des exemples</Button>
        </ToolHeader>
        <ul className="divide-y divide-slate-100">
          {all.map(e => {
            const st = inspectionState(e, now);
            const a = anomalies(e), l = lowParts(e), last = lastInspection(e);
            return (
              <Row key={e.id} onClick={() => setOpen(e)}
                title={`${e.name || 'Machine à nommer'}${e.location ? ` · ${e.location}` : ''}`}
                sub={a.length ? <span className="font-semibold text-red-700">Anomalie : {a.map(c => c.label.toLowerCase()).join(', ')}</span> : l.length ? <span className="font-semibold text-red-700">À commander : {l.map(p => p.name).join(', ')}</span> : `Routine suivie ${routineRate(e, now)} % des semaines sur 12 · ${e.parts.length} pièce(s) de survie`}
                right={<><span className="block font-semibold text-slate-800">{e.operator || 'Opérateur à nommer'}</span>{last ? `inspectée le ${frDate(last.date)}` : 'jamais inspectée'}</>}
                badge={<StatusBadge level={a.length || l.length ? 'alert' : INSPECTION_STATE[st].tone} text={a.length ? 'Anomalie' : l.length ? 'Pièce à commander' : INSPECTION_STATE[st].label} />} />
            );
          })}
        </ul>
      </Card>
      <Method rule="10 minutes d'inspection le lundi évitent 3 jours d'arrêt en plein pic de commandes."
        steps={[['Routine du lundi', "L'opérateur consacre les 10 premières minutes de sa semaine à regarder, écouter, sentir et vérifier les niveaux."], ['Alerte au premier suintement', "Une anomalie s'écrit tout de suite, sans attendre la casse."], ['Armoire de survie', "Les pièces d'usure critiques sont sous clé ; la commande part le jour où l'une d'elles sort."]]}
        tips={['Ne jamais « emprunter » une pièce de survie pour une autre machine.']} />
      {open && <EquipmentSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function EquipmentSheet({ initial, onClose, nav }: { initial: Equipment; onClose(): void; nav: Nav }) {
  const { state, update, author } = useStore();
  const [e, setE] = useState<Equipment>(() => structuredClone(initial));
  const [insp, setInsp] = useState<Inspection>(() => ({ date: isoDate(new Date()), by: initial.operator || author, results: initial.checkpoints.map(() => 'ok'), note: '' }));
  const [doing, setDoing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  if (!state) return null;
  const isNew = !state.equipments[e.id];
  const set = (x: Partial<Equipment>) => { setE(y => ({ ...y, ...x })); setInfo(''); };
  const valid = () => { if (!e.name.trim()) { setError('Nommez la machine.'); return false; } return true; };
  const commit = (x: Equipment) => update(d => { d.equipments[x.id] = x; });
  const close = () => { if (JSON.stringify(e) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { commit(e); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer ${e.name} ?`)) { update(d => { delete d.equipments[e.id]; }); onClose(); } };
  const addInspection = () => {
    if (!valid()) return;
    const x = { ...e, inspections: [...e.inspections, { ...insp, results: e.checkpoints.map((_, i) => insp.results[i] || 'ok') }] };
    setE(x); commit(x); setDoing(false);
    setInfo(insp.results.includes('ko') ? 'Inspection enregistrée avec anomalie : ouvrez une action.' : 'Inspection enregistrée.');
  };
  const action = () => { if (!valid()) return; commit(e); nav.newAction({ ref: { kind: 'equipment', id: e.id }, constat: `${e.name} : ${anomalies(e).map(c => c.label.toLowerCase()).join(', ') || 'anomalie relevée'}` }); };
  const setPart = (i: number, x: Partial<Equipment['parts'][number]>) => set({ parts: e.parts.map((p, j) => (j === i ? { ...p, ...x } : p)) });
  const last8 = [...e.inspections].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).reverse();
  const pdf = () => downloadFile(`Routine-${fileSlug(e.name)}.pdf`, routinePdf(e, { company: state.settings.companyName, date: new Date() }), 'application/pdf');
  const ano = anomalies(e);

  return (
    <Modal xwide onClose={close} title={isNew ? 'Nouvelle machine goulet' : e.name}
      subtitle={<StatusBadge level={INSPECTION_STATE[inspectionState(e)].tone} text={INSPECTION_STATE[inspectionState(e)].label} />}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        {info && !error && <span role="status" className="mr-2 text-[11px] font-semibold text-emerald-700">{info}</span>}
        <Button onClick={pdf}><FileDown size={14} />Feuille à afficher</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Field label="Machine"><input className={inputCls} value={e.name} onChange={x => set({ name: x.target.value })} /></Field></div>
          <Field label="Emplacement"><input className={inputCls} value={e.location} onChange={x => set({ location: x.target.value })} /></Field>
          <Field label="Plan B (outil 1.2)">
            <select className={inputCls} value={e.riskId} onChange={x => set({ riskId: x.target.value })}>
              <option value="">Aucun</option>
              {Object.values(state.risks).sort((a, b) => a.title.localeCompare(b.title)).map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </Field>
          <Field label="Opérateur titulaire"><input className={inputCls} value={e.operator} list="people" onChange={x => set({ operator: x.target.value })} /></Field>
          <Field label="Responsable"><input className={inputCls} value={e.manager} list="people" onChange={x => set({ manager: x.target.value })} /></Field>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SubTitle>Routine du lundi</SubTitle>
            {!doing && <Button kind="primary" className="!px-2 !py-1" onClick={() => { setInsp({ date: isoDate(new Date()), by: e.operator || author, results: e.checkpoints.map(() => 'ok'), note: '' }); setDoing(true); }}>Faire l'inspection</Button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-[11px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="border-b border-slate-200 px-1.5 py-1 font-semibold">Point</th>
                  <th className="border-b border-slate-200 px-1.5 py-1 font-semibold">Bon fonctionnement</th>
                  {last8.map((x, i) => <th key={i} className="border-b border-slate-200 px-1 py-1 text-center font-mono font-normal">{frDate(x.date).slice(0, 5)}</th>)}
                  {doing && <th className="border-b border-slate-200 px-1.5 py-1 font-semibold text-delacour-primary">Aujourd'hui</th>}
                  <th className="border-b border-slate-200" />
                </tr>
              </thead>
              <tbody>
                {e.checkpoints.map((c, i) => (
                  <tr key={i}>
                    <td className="border-b border-slate-100 px-1.5 py-1"><input className={`${inputCls} !py-1`} value={c.label} aria-label={`Point ${i + 1}`} onChange={x => set({ checkpoints: e.checkpoints.map((y, j) => (j === i ? { ...y, label: x.target.value } : y)) })} /></td>
                    <td className="border-b border-slate-100 px-1.5 py-1"><input className={`${inputCls} !py-1`} value={c.criterion} aria-label={`Critère ${i + 1}`} onChange={x => set({ checkpoints: e.checkpoints.map((y, j) => (j === i ? { ...y, criterion: x.target.value } : y)) })} /></td>
                    {last8.map((x, k) => <td key={k} className="border-b border-slate-100 text-center"><span title={x.results[i] === 'ko' ? 'Anomalie' : 'OK'} className={`inline-block h-2.5 w-2.5 rounded-full ${x.results[i] === 'ko' ? 'bg-red-600' : x.results[i] === 'ok' ? 'bg-emerald-600' : 'bg-slate-200'}`} /></td>)}
                    {doing && (
                      <td className="border-b border-slate-100 px-1.5 py-1">
                        <div className="flex gap-1" role="radiogroup" aria-label={`Aujourd'hui : ${c.label}`}>
                          {(['ok', 'ko'] as const).map(v => (
                            <button key={v} type="button" role="radio" aria-checked={insp.results[i] === v} onClick={() => setInsp({ ...insp, results: e.checkpoints.map((_, j) => (j === i ? v : insp.results[j] || 'ok')) })}
                              className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${insp.results[i] === v ? (v === 'ok' ? 'border-emerald-700 bg-emerald-600 text-white' : 'border-red-700 bg-red-600 text-white') : 'border-slate-300 bg-white text-slate-700'}`}>{v === 'ok' ? 'OK' : 'Anomalie'}</button>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="border-b border-slate-100"><button type="button" aria-label={`Retirer le point ${c.label}`} onClick={() => set({ checkpoints: e.checkpoints.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600"><X size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button kind="ghost" className="!px-2 !py-1" onClick={() => set({ checkpoints: [...e.checkpoints, { label: '', criterion: '' }] })}><Plus size={13} />Ajouter un point</Button>
          {doing && (
            <div className="grid items-end gap-2 rounded-lg bg-slate-50 p-2.5 sm:grid-cols-[auto_1fr_2fr_auto]">
              <Field label="Date"><input type="date" className={inputCls} value={insp.date} onChange={x => setInsp({ ...insp, date: x.target.value })} /></Field>
              <Field label="Par"><input className={inputCls} value={insp.by} list="people" onChange={x => setInsp({ ...insp, by: x.target.value })} /></Field>
              <Field label="Anomalie constatée, action"><input className={inputCls} value={insp.note} onChange={x => setInsp({ ...insp, note: x.target.value })} /></Field>
              <div className="flex gap-1.5"><Button onClick={() => setDoing(false)}>Annuler</Button><Button kind="primary" onClick={addInspection}>Enregistrer</Button></div>
            </div>
          )}
          {ano.length > 0 && !doing && (
            <p className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800">
              Anomalie à la dernière inspection : {ano.map(c => c.label.toLowerCase()).join(', ')}{lastInspection(e)?.note ? ` (${lastInspection(e)!.note})` : ''}.
              <button type="button" className="inline-flex items-center gap-1 font-semibold underline" onClick={action}><Wrench size={12} />Ouvrir une action</button>
            </p>
          )}
        </section>

        <section className="space-y-2">
          <SubTitle>Armoire de survie : pièces d'usure critiques sous clé</SubTitle>
          {e.parts.length === 0 && <p className="text-[11px] text-slate-500">Les 3 pièces dont la casse arrête la machine plus d'un jour, faute de stock chez le fournisseur.</p>}
          <ul className="space-y-1.5">
            {e.parts.map((p, i) => {
              const lowNow = p.stock < p.min;
              return (
                <li key={i} className={`grid items-center gap-1.5 rounded-lg border p-1.5 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto_auto] ${lowNow ? 'border-red-200 bg-red-50/50' : 'border-slate-200'}`}>
                  <input className={inputCls} value={p.name} placeholder="Pièce" aria-label="Pièce" onChange={x => setPart(i, { name: x.target.value })} />
                  <input className={inputCls} value={p.ref} placeholder="Référence" aria-label="Référence" onChange={x => setPart(i, { ref: x.target.value })} />
                  <input className={inputCls} value={p.supplier} placeholder="Fournisseur" aria-label="Fournisseur" onChange={x => setPart(i, { supplier: x.target.value })} />
                  <input className={inputCls} value={p.leadTime} placeholder="Délai" aria-label="Délai de réapprovisionnement" onChange={x => setPart(i, { leadTime: x.target.value })} />
                  <span className="flex items-center gap-1 text-[11px] text-slate-600">
                    mini <NumInput className="!w-12 !px-1.5 !py-1 text-right" value={p.min} aria-label="Stock minimum" onChange={v => setPart(i, { min: v ?? 0 })} />
                    stock
                    <button type="button" aria-label="Une pièce sortie de l'armoire" onClick={() => setPart(i, { stock: Math.max(0, p.stock - 1) })} className="rounded border border-slate-300 p-0.5 hover:bg-slate-50"><Minus size={12} /></button>
                    <strong className={`w-5 text-center font-mono ${lowNow ? 'text-red-700' : 'text-slate-900'}`}>{p.stock}</strong>
                    <button type="button" aria-label="Une pièce rangée dans l'armoire" onClick={() => setPart(i, { stock: p.stock + 1 })} className="rounded border border-slate-300 p-0.5 hover:bg-slate-50"><Plus size={12} /></button>
                  </span>
                  <button type="button" aria-label="Retirer cette pièce" onClick={() => set({ parts: e.parts.filter((_, j) => j !== i) })} className="rounded p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
                  {lowNow && <span className="text-[11px] font-semibold text-red-700 sm:col-span-6">Sous le stock mini : commander aujourd'hui ({p.leadTime || 'délai à connaître'}).</span>}
                </li>
              );
            })}
          </ul>
          <Button className="!px-2 !py-1" onClick={() => set({ parts: [...e.parts, { name: '', ref: '', supplier: '', leadTime: '', min: 1, stock: 1 }] })}><Plus size={13} />Ajouter une pièce</Button>
        </section>
      </div>
    </Modal>
  );
}
