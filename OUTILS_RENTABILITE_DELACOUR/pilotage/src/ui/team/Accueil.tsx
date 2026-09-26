// Tool 4.3 "Accueil": 15-day welcome path with a named tutor (day 1 safety, week 1 side by side, week 2 light supervision),
// autonomy test in 3 questions on the ground at day 15, written authorisation before working alone.
import { useEffect, useState } from 'react';
import { Check, FileDown, Plus, Trash2 } from 'lucide-react';
import type { Newcomer, SkillLevel } from '../../domain/types';
import { CHECKLIST, KIND_LABEL, NEWCOMER_STATE, newcomerInsights, newcomerState, newNewcomer, newPerson, TEST, testDate, testPassed } from '../../domain/team';
import { applyTeamExample } from '../../domain/teamExamples';
import { newcomerPdf } from '../../domain/teamPdf';
import { daysBetween } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Field, inputCls, Method, Modal, Row, StatusBadge, SubTitle, Summary, Tile, ToolHeader, YesNo } from '../common';
import { downloadFile, fileSlug } from '../download';
import type { ScreenProps } from '../screens';

type Filter = 'open' | 'done' | 'all';
const STAGES = [...new Set(CHECKLIST.map(c => c.stage))];

export function Accueil({ focus, clearFocus }: ScreenProps) {
  const { state, update } = useStore();
  const [open, setOpen] = useState<Newcomer | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  useEffect(() => { if (focus && state?.newcomers[focus]) { setOpen(state.newcomers[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.newcomers).sort((a, b) => (a.arrival < b.arrival ? 1 : -1)).map(n => ({ n, st: newcomerState(n, now) }));
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Accueil : jamais seul au poste avant le test d'autonomie" text="Chaque recrue ou intérimaire a un tuteur dès le premier jour : sécurité et équipements le jour 1, travail côte à côte la semaine 1, prise en main la semaine 2. À J+15, 3 questions sur le terrain et une autorisation écrite.">
          <Button kind="primary" onClick={() => setOpen(newNewcomer())}><Plus size={14} />Nouvel arrivant</Button>
          <Button onClick={() => update(d => applyTeamExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <NewcomerSheet initial={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }
  const openOnes = all.filter(x => x.st !== 'autonomous');
  const shown = filter === 'open' ? openOnes : filter === 'done' ? all.filter(x => x.st === 'autonomous') : all;
  const since = isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
  return (
    <div className="space-y-4">
      <Summary title="Les recrues sont-elles autonomes avant de travailler seules ?" insights={newcomerInsights(state, now)} tiles={<>
        <Tile title="En intégration" value={String(openOnes.length)} sub="recrues et intérimaires" />
        <Tile title="Tests à faire" value={String(all.filter(x => x.st === 'test_due' || x.st === 'failed').length)} sub="3 questions sur le terrain à J+15" tone={all.some(x => x.st === 'failed') ? 'alert' : all.some(x => x.st === 'test_due') ? 'warn' : undefined} />
        <Tile title="Autonomes sur 12 mois" value={String(all.filter(x => x.st === 'autonomous' && x.n.authorizedAt >= since).length)} sub="autorisation écrite signée" tone="ok" />
        <Tile title="Sans tuteur" value={String(openOnes.filter(x => !x.n.tutor.trim()).length)} sub="le tuteur répond des premières pièces" tone={openOnes.some(x => !x.n.tutor.trim()) ? 'alert' : undefined} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Parcours d'accueil" text="Un parcours par arrivée, du jour 1 à l'autorisation de travailler seul.">
          <Button kind="primary" onClick={() => setOpen(newNewcomer())}><Plus size={14} />Nouvel arrivant</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les suppléances, l\'équipe, la polyvalence, les recrues et les tests de classement par des exemples ?')) update(d => applyTeamExample(d)); }}>Remplir avec des exemples</Button>
        </ToolHeader>
        <Chips value={filter} onChange={setFilter} items={[['open', 'En cours', openOnes.length], ['done', 'Autonomes', all.length - openOnes.length], ['all', 'Tous', all.length]]} />
        {shown.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">Aucun arrivant dans ce filtre.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map(({ n, st }) => {
              const done = CHECKLIST.filter(c => n.done[c.key]).length;
              return (
                <Row key={n.id} onClick={() => setOpen(n)}
                  lead={<span className="w-14 shrink-0 text-center font-mono text-[11px] font-semibold text-slate-700">J+{Math.max(0, daysBetween(n.arrival, now) ?? 0)}</span>}
                  title={`${n.name || 'Nom à saisir'} · ${n.poste || 'poste à préciser'}`}
                  sub={`${KIND_LABEL[n.kind]} · parcours ${done}/${CHECKLIST.length} · test le ${frDate(testDate(n))}`}
                  right={<><span className={`block font-semibold ${n.tutor ? 'text-slate-800' : 'text-red-700'}`}>{n.tutor ? `Tuteur : ${n.tutor}` : 'Tuteur à désigner'}</span>arrivé le {frDate(n.arrival)}</>}
                  badge={<StatusBadge level={NEWCOMER_STATE[st].tone} text={NEWCOMER_STATE[st].label} />} />
              );
            })}
          </ul>
        )}
      </Card>
      <Method rule="Ne jamais laisser une recrue seule au poste sans un test d'autonomie validé par écrit."
        steps={[['Jour 1 : cadrage', 'Le tuteur accueille la recrue : visite, équipements de protection, consignes de sécurité.'], ['Semaine 1 : en binôme', 'La recrue ne fait rien seule : elle observe et pratique sous le regard du tuteur.'], ['J+15 : 3 questions', 'Montre-moi le standard, montre-moi le piège, fais la pièce devant moi. Puis signature.']]}
        tips={['Remplacer le livret de 30 pages que personne ne lit par ce parcours de 15 jours.']} />
      {open && <NewcomerSheet initial={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function NewcomerSheet({ initial, onClose }: { initial: Newcomer; onClose(): void }) {
  const { state, update, author } = useStore();
  const [n, setN] = useState<Newcomer>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.newcomers[n.id];
  const set = (x: Partial<Newcomer>) => setN(y => ({ ...y, ...x }));
  const today = isoDate(new Date());
  const st = newcomerState(n);
  const toggle = (key: string) => { const d = { ...n.done }; if (d[key]) delete d[key]; else d[key] = today; set({ done: d }); };
  const answer = (i: number, v: boolean | null) => set({ test: { ...n.test, date: n.test.date || today, answers: n.test.answers.map((a, j) => (j === i ? v : a)) } });
  const valid = () => { if (!n.name.trim()) { setError('Indiquez le nom.'); return false; } return true; };
  const close = () => { if (JSON.stringify(n) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (valid()) { update(d => { d.newcomers[n.id] = n; }); onClose(); } };
  const remove = () => { if (window.confirm(`Supprimer le parcours de ${n.name} ?`)) { update(d => { delete d.newcomers[n.id]; }); onClose(); } };
  // Authorisation: the newcomer joins the team, level 2 on the skill (4.2), habilitation on the work instruction (3.2)
  const authorize = () => {
    if (!valid()) return;
    const x = { ...n, authorizedBy: n.authorizedBy || author, authorizedAt: today };
    update(d => {
      d.newcomers[x.id] = x;
      let person = Object.values(d.people).find(p => p.name.trim().toLowerCase() === x.name.trim().toLowerCase());
      if (!person) { person = { ...newPerson(x.name.trim()), role: x.poste }; d.people[person.id] = person; }
      const k = x.skillId && d.skills[x.skillId];
      if (k) k.levels[person.id] = Math.max(2, k.levels[person.id] ?? 0) as SkillLevel;
      const sop = x.sopId && d.sops[x.sopId];
      if (sop && !sop.habilitations.some(h => h.person === x.name)) sop.habilitations.push({ person: x.name, tutor: x.tutor, date: x.test.date || today });
    });
    onClose();
  };
  const pdf = () => downloadFile(`Accueil-${fileSlug(n.name)}.pdf`, newcomerPdf(n, { company: state.settings.companyName, date: new Date() }), 'application/pdf');

  return (
    <Modal wide onClose={close} title={isNew ? 'Nouvel arrivant' : n.name} subtitle={<span className="flex flex-wrap items-center gap-1.5">{n.poste} <StatusBadge level={NEWCOMER_STATE[st].tone} text={NEWCOMER_STATE[st].label} /></span>}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={pdf}><FileDown size={14} />Fiche de parcours</Button>
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-4">
          <Field label="Nom"><input className={inputCls} value={n.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label="Poste"><input className={inputCls} value={n.poste} onChange={e => set({ poste: e.target.value })} /></Field>
          <Field label="Contrat"><select className={inputCls} value={n.kind} onChange={e => set({ kind: e.target.value as Newcomer['kind'] })}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Arrivé le"><input type="date" className={inputCls} value={n.arrival} onChange={e => set({ arrival: e.target.value })} /></Field>
          <Field label="Tuteur"><input className={inputCls} value={n.tutor} list="people" onChange={e => set({ tutor: e.target.value })} /></Field>
          <Field label="Instruction du poste (3.2)">
            <select className={inputCls} value={n.sopId} onChange={e => set({ sopId: e.target.value })}>
              <option value="">Aucune</option>{Object.values(state.sops).map(x => <option key={x.id} value={x.id}>{x.poste} · {x.operation}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Compétence visée (4.2)">
              <select className={inputCls} value={n.skillId} onChange={e => set({ skillId: e.target.value })}>
                <option value="">Aucune</option>{Object.values(state.skills).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-2">
          <SubTitle>Parcours sur 15 jours</SubTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            {STAGES.map(stage => (
              <div key={stage} className="space-y-1 rounded-lg border border-slate-200 p-2">
                <div className="text-[11px] font-bold text-slate-900">{stage}</div>
                {CHECKLIST.filter(c => c.stage === stage).map(c => (
                  <label key={c.key} className="flex items-start gap-2 text-[11px] text-slate-700">
                    <input type="checkbox" className="mt-0.5" checked={!!n.done[c.key]} onChange={() => toggle(c.key)} />
                    <span>{c.label}{n.done[c.key] ? <span className="text-slate-500"> · {frDate(n.done[c.key])}</span> : ''}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SubTitle>Test d'autonomie à J+15 ({frDate(testDate(n))})</SubTitle>
            {n.test.date && <span className="text-[11px] text-slate-500">Passé le {frDate(n.test.date)}</span>}
          </div>
          <ol className="space-y-1.5">
            {TEST.map((q, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
                <span className="text-xs text-slate-800"><strong>{i + 1}.</strong> {q}</span>
                <YesNo label={`Question ${i + 1}`} labels={['Validé', 'À revoir']} value={n.test.answers[i] ?? null} onChange={v => answer(i, v)} />
              </li>
            ))}
          </ol>
          <Field label="Constat du tuteur"><input className={inputCls} value={n.test.note} onChange={e => set({ test: { ...n.test, note: e.target.value } })} /></Field>
          {st === 'failed' && <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-800">Test à repasser : prolonger le binôme d'une semaine, puis refaire les 3 questions.</p>}
        </section>

        <section className="space-y-2">
          <SubTitle>Autorisation de travailler seul</SubTitle>
          {n.authorizedAt ? <p className="text-[11px] text-emerald-800"><strong>Autorisé</strong> par {n.authorizedBy} le {frDate(n.authorizedAt)}.</p> : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Autorisé par"><input className={`${inputCls} w-48`} value={n.authorizedBy} list="people" onChange={e => set({ authorizedBy: e.target.value })} /></Field>
              <Button kind="primary" disabled={!testPassed(n)} onClick={authorize}><Check size={14} />Autoriser aujourd'hui</Button>
              <span className="text-[11px] text-slate-500">{testPassed(n) ? `Ajoute ${n.name || 'la personne'} à l'équipe (4.2)${n.skillId ? ' au niveau 2 sur la compétence' : ''}${n.sopId ? ' et aux habilités du poste (3.2)' : ''}.` : 'Possible une fois les 3 questions validées.'}</span>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
