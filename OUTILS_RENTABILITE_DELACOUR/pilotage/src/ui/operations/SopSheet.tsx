// The sheet of a work instruction, in five tabs: the sheet, the workstation and its safety, the people, the posting, the life of the sheet.
// A draft or a sheet to validate is saved as it is typed (also when the window closes, the page is left or the tab goes to the background); a sheet in force keeps
// "Enregistrer" and "Annuler", and changes version with a reason. What is typed (content) and what lives apart (reading, posting, journal, versions: see takeLife)
// are saved separately, so that a stale screen never erases a reading signed meanwhile. Anything removed can be brought back for a few seconds.
import { useEffect, useRef, useState } from 'react';
import { Archive, Copy, Monitor, Trash2, Undo2 } from 'lucide-react';
import type { Sop } from '../../domain/types';
import {
  archiveSop, canDelete, changes, completeness, duplicateSop, logged, lostByDeleting, ncsSinceVersion, openSuggestions, PHASE_LABEL, setStage, snapOf, sopChecklist, sopCfg, sopPhase, sopVersion,
  structMass, takeLife, type SopTab, updateDue,
} from '../../domain/instructions';
import { processLabel } from '../../domain/base';
import { FlowUses } from '../map/FlowUses';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, DeleteButton, Modal, StatusBadge } from '../common';
import { usePrintOne } from '../PrintOne';
import type { Nav } from '../tools';
import { Ring } from './SopBits';
import { SopPrint, pageOf } from './SopPrint';
import { SopStation } from './SopStation';
import { SopTest } from './SopTest';
import { ContentTab, DisplayTab, LifeTab, PeopleTab, PostTab, type TabProps } from './SopTabs';

const TABS: { k: SopTab; label: string }[] = [{ k: 'content', label: 'La fiche' }, { k: 'post', label: 'Poste et sécurité' }, { k: 'people', label: 'Personnes' }, { k: 'display', label: 'Affichage' }, { k: 'life', label: 'Vie de la fiche' }];
const SCREEN = { draft: 'pending', review: 'warn', active: 'ok', archived: 'pending' } as const;

export function SopSheet({ initial, tab: tab0, onClose, nav, onCopy }: { initial: Sop; tab?: SopTab; onClose(): void; nav: Nav; onCopy?(s: Sop): void }) {
  const { state, update, author } = useStore();
  const by = author || 'anonyme';
  const [s, setS] = useState<Sop>(() => { const c = structuredClone(initial); return state?.sops[c.id] ? c : logged(c, by, 'Créée'); });
  const [tab, setTabNow] = useState<SopTab>(tab0 || 'content');
  const [seen, setSeen] = useState<SopTab[]>([tab0 || 'content']);   // a tab stays drawn once opened: what was typed in it (a reason, a signature, a remark) is not lost by changing tab
  const setTab = (k: SopTab) => { setSeen(v => (v.includes(k) ? v : [...v, k])); setTabNow(k); };
  const [undo, setUndo] = useState<{ what: string; back(): void } | null>(null);   // something was removed: "Annuler" for a few seconds
  const [pending, setPending] = useState<string[] | null>(null);   // changes of a sheet in force, waiting for the choice: correction or new version
  const [rev, setRev] = useState(() => (state?.sops[initial.id] || !initial.poste.trim() ? 0 : 1));   // edits since the last write; a new sheet that already has a name (step by step, template, copy) is still to write
  const [error, setError] = useState('');
  const [station, setStation] = useState(false), [test, setTest] = useState(false);
  const [printNode, print] = usePrintOne();
  const latest = useRef(s);
  latest.current = s;
  const phase = sopPhase(s), auto = phase === 'draft' || phase === 'review';
  const saved = state?.sops[s.id];
  const isNew = !saved;
  const gone = useRef(false);   // the sheet was deleted: nothing writes it back
  const live = useRef({ auto, rev, s });
  live.current = { auto, rev, s };
  // the reading, posting, people and versions of the saved sheet follow into the one being edited (the full-screen view writes them too)
  useEffect(() => { if (saved) setS(y => takeLife(y, saved)); }, [saved]);
  // what was typed in a draft is written when the window closes, the page is left (tool change, back gesture, closing the tab) or the tab goes to the background
  useEffect(() => {
    const flush = () => { const c = live.current; if (!gone.current && c.auto && c.rev && c.s.poste.trim()) persist(c.s); };
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', hide);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hide); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!undo) return; const t = window.setTimeout(() => setUndo(null), 8000); return () => window.clearTimeout(t); }, [undo]);
  // a draft is written as it is typed, once it has a name
  useEffect(() => {
    if (!auto || !rev || !latest.current.poste.trim()) return;
    const t = window.setTimeout(() => { persist(latest.current); setRev(0); }, 1200);
    return () => window.clearTimeout(t);
  }, [rev, auto]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const px = sopCfg(state.params).photoPx;
  // writes what is typed; the life of the sheet is taken from the saved one, whatever the screen holds
  function persist(x: Sop) { update(d => { d.sops[x.id] = takeLife(x, d.sops[x.id]); }); }
  const set = (x: Partial<Sop>) => {
    const before = latest.current;
    setS(y => ({ ...y, ...x })); setRev(r => r + 1);
    if (structMass({ ...before, ...x }) < structMass(before)) setUndo({ what: 'Retiré', back: () => { setS(y => takeLife(before, y)); setRev(r => r + 1); } });
  };
  // a move of the life of the sheet, applied once, to the saved sheet (to the one being written while it is not saved yet)
  const act: TabProps['act'] = f => {
    const was = state.sops[s.id];
    if (!was) { setS(y => f(y, by)); return; }
    let after: Sop | undefined;
    update(d => { after = f(d.sops[s.id], by); d.sops[s.id] = after; });
    if (after && structMass(after) < structMass(was)) setUndo({ what: 'Retiré', back: () => update(d => { d.sops[s.id] = takeLife(d.sops[s.id], was); }) });
  };
  // writes this sheet as it is, life included (a new version, a validation, an archiving)
  const commit = (next: Sop) => { if (!next.poste.trim()) { setError('Nommez le poste.'); return; } update(d => { d.sops[next.id] = next; }); setS(next); setRev(0); setError(''); setPending(null); };
  const valid = () => { if (!s.poste.trim()) { setError('Nommez le poste.'); setTab('content'); return false; } return true; };
  const close = () => {
    if (auto && s.poste.trim()) { if (rev) persist(s); onClose(); return; }
    if (!rev || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose();
  };
  // a sheet in force changes by correction (journalised) or by a new version: asked when what was typed changes the content
  const diffs = saved && sopPhase(saved) === 'active' ? changes(snapOf(saved), takeLife(s, saved)) : [];
  const save = () => {
    if (!valid()) return;
    if (diffs.length) { setPending(diffs); return; }
    persist(s); onClose();
  };
  const correct = () => { if (saved) { commit(logged(takeLife(s, saved), by, `Corrigée sans nouvelle version : ${(pending || []).join(' ; ')}`)); onClose(); } };
  const remove = () => {
    const asked = canDelete(s) ? `Supprimer le brouillon du poste ${s.poste} ? Personne ne l'a lu : rien d'autre n'est perdu.` : `Supprimer définitivement l'instruction du poste ${s.poste} ? Sont perdus : ${lostByDeleting(s)}.`;
    if (window.confirm(asked)) { gone.current = true; update(d => { delete d.sops[s.id]; }); onClose(); }
  };
  const archive = () => { if (window.confirm(`Archiver l'instruction du poste ${s.poste} ? Elle ne sera plus proposée ; ses lectures, son journal et ses versions sont gardés.`)) { commit(archiveSop(takeLife(s, saved), by)); onClose(); } };
  const copy = () => {
    if (auto && rev && s.poste.trim()) persist(s);   // what was typed is written before the copy is made
    const c = logged(duplicateSop(s), by, `Copie de ${s.poste}`); update(d => { d.sops[c.id] = c; }); onCopy?.(c);
  };

  // the defect declared from the full screen opens in a new tab and the full screen stays: a draft is written first, the other tab reads it
  const stationNav: Nav = { ...nav, open: (...a) => { if (auto && rev && s.poste.trim()) persist(s); nav.open(...a); } };
  const checks = sopChecklist(state, s), missing = checks.filter(c => !c.ok), pct = completeness(checks);
  const attention = (k: SopTab) => missing.filter(c => c.tab === k).length + (k === 'life' ? openSuggestions(s).length : 0);
  const stale = ncsSinceVersion(state, s), due = updateDue(state, s);
  const props: TabProps = { s, set, act, commit, state, by, px, saved, print: f => { if (valid() && (!diffs.length || window.confirm(`La fiche a des modifications non enregistrées (${diffs.join(' ; ')}). Le papier les montrera, avec le numéro de la ${sopVersion(s)} en vigueur. Imprimer quand même ?`))) print(<SopPrint s={s} company={state.settings.companyName} state={state} format={f} />, pageOf(f)); }, station: () => setStation(true), test: () => setTest(true) };

  return (
    <Modal xwide onClose={close} title={isNew && !s.poste.trim() ? 'Nouvelle instruction de poste' : `Instruction · ${s.poste || 'poste à nommer'}`}
      subtitle={<span className="flex flex-wrap items-center gap-1.5">{phase === 'draft' ? 'Brouillon' : `${sopVersion(s)} du ${frDate(s.versionDate)}`} · {processLabel(s.processId)}<StatusBadge level={SCREEN[phase]} text={PHASE_LABEL[phase]} /></span>}
      footer={<>
        {undo && <span role="status" className="mr-auto flex items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white">{undo.what}<button type="button" className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 hover:bg-white/25 max-sm:min-h-[36px]" onClick={() => { undo.back(); setUndo(null); }}><Undo2 size={12} />Annuler</button></span>}
        {!isNew && (canDelete(s) || phase === 'archived'
          ? <DeleteButton onClick={remove} className={undo ? '' : 'mr-auto'}><Trash2 size={14} />{canDelete(s) ? 'Supprimer' : 'Supprimer définitivement'}</DeleteButton>
          : <Button onClick={archive} className={undo ? '' : 'mr-auto'}><Archive size={14} />Archiver</Button>)}
        {!isNew && <Button onClick={copy}><Copy size={14} />Dupliquer</Button>}
        <Button onClick={() => valid() && setStation(true)}><Monitor size={14} />Plein écran</Button>
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        {auto ? <><span className="text-[11px] text-slate-500">{s.poste.trim() ? (rev ? 'Enregistrement…' : 'Enregistrée automatiquement') : 'Nommez le poste pour enregistrer'}</span><Button kind="primary" onClick={close}>Fermer</Button></>
          : <><Button onClick={close}>Annuler</Button><Button kind="primary" onClick={save}>Enregistrer</Button></>}
      </>}>
      <div className="space-y-4">
        {!isNew && <FlowUses quiet tool="3.2" id={s.id} />}
        {stale.length > 0 && (
          <p className={`rounded-lg px-3 py-2 text-[11px] ${due?.late(new Date()) ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-950'}`}>
            <strong>Standard à mettre à jour :</strong> {stale.map(n => `${n.ref} (${n.description})`).join(', ')} déclaré(s) au poste depuis cette version. Délai : {sopCfg(state.params).updateHours} h.{' '}
            <button type="button" className="font-semibold underline" onClick={() => setTab('life')}>Passer à la version suivante</button>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Ring pct={pct} size={44} />
          <div className="min-w-0 flex-1 text-[11px]">
            <div className="font-semibold text-slate-800">{pct >= 100 ? 'Fiche complète' : `Fiche complète à ${pct} %`}</div>
            {missing.length > 0 && <div className="mt-0.5 flex flex-wrap gap-1">{missing.map(c => <button key={c.key} type="button" onClick={() => setTab(c.tab)} className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-950 hover:bg-amber-100 max-sm:min-h-[36px]">{c.label}</button>)}</div>}
          </div>
        </div>
        <div role="tablist" aria-label="Sections de la fiche" className="sticky top-[-1rem] z-10 -mx-4 flex gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-4 pt-1 sm:-mx-5 sm:px-5">
          {TABS.map(t => (
            <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold max-sm:min-h-[44px] ${tab === t.k ? 'border-delacour-primary text-delacour-primary' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
              {t.label}{attention(t.k) > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{attention(t.k)}</span>}
            </button>
          ))}
        </div>
        {pending && (
          <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-950">
            <p><strong>Cette fiche est en vigueur et lue sous la {sopVersion(s)}.</strong> Les modifications portent sur : {pending.join(' ; ')}.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={correct}>Correction de forme (notée dans le journal)</Button>
              <Button kind="primary" onClick={() => { setPending(null); setTab('life'); }}>Nouvelle version (motif à donner)</Button>
              <Button kind="ghost" onClick={() => setPending(null)}>Continuer à modifier</Button>
            </div>
          </div>
        )}
        {TABS.map(t => seen.includes(t.k) && (
          <div key={t.k} role="tabpanel" hidden={tab !== t.k}>
            {t.k === 'content' && <ContentTab {...props} />}
            {t.k === 'post' && <PostTab {...props} />}
            {t.k === 'people' && <PeopleTab {...props} />}
            {t.k === 'display' && <DisplayTab {...props} />}
            {t.k === 'life' && <LifeTab {...props} />}
          </div>
        ))}
      </div>
      {station && <SopStation sop={s} onClose={() => setStation(false)} nav={stationNav} />}
      {test && <SopTest s={s} tutor0={by} onClose={() => setTest(false)} onPass={(person, tutor) => act(x => setStage(x, person, 'alone', { tutor, by, date: isoDate(new Date()) }))} />}
      {printNode}
    </Modal>
  );
}
