// Tool 4.1 "Suppléances": for each vital power of a process (the act without which the company stops), a holder and two deputies
// who really did it within the year, and the access under a sealed envelope checked every 6 months.
import { useEffect, useState } from 'react';
import { Check, Plus, Printer, Trash2 } from 'lucide-react';
import type { Power } from '../../domain/types';
import { DEFAULT_POWERS, ENVELOPE_DAYS, envelopeState, newPower, POWER_STATE, powerInsights, powerState, practiceLeft, PRACTICE_DAYS } from '../../domain/team';
import { applyTeamExample } from '../../domain/teamExamples';
import { addDays, PROCESS_IDS, processLabel } from '../../domain/base';
import { frDate, isoDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Empty, Field, inputCls, Method, Modal, StatusBadge, SubTitle, Summary, Tile, ToolHeader } from '../common';
import type { ScreenProps } from '../screens';
import type { Nav } from '../tools';

// "Pratiqué le 12/03/2026" in colour: late, soon, or fine
function Practice({ date }: { date: string }) {
  const left = practiceLeft(date);
  if (left === null) return <span className="font-semibold text-amber-800">jamais pratiqué</span>;
  return <span className={left < 0 ? 'font-semibold text-red-700' : left <= 30 ? 'font-semibold text-amber-800' : 'text-slate-500'}>pratiqué le {frDate(date)}</span>;
}

export function Suppleances({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, author } = useStore();
  const [open, setOpen] = useState<Power | null>(null);
  useEffect(() => { if (focus && state?.powers[focus]) { setOpen(state.powers[focus]); clearFocus(); } }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;
  const now = new Date();
  const all = Object.values(state.powers).sort((a, b) => a.processId.localeCompare(b.processId) || a.power.localeCompare(b.power));
  const start = () => update(d => { DEFAULT_POWERS.forEach(([p, w]) => { const x = newPower(p, w); d.powers[x.id] = x; }); });
  if (!all.length) {
    return (
      <div className="space-y-4">
        <Empty title="Suppléances : l'entreprise tourne même si quelqu'un manque" text="Pour chaque processus, l'acte sans lequel tout s'arrête : payer, valider un devis, lancer la fabrication, ouvrir les locaux, libérer un produit. Un titulaire, deux suppléants qui le font vraiment une fois par an, les accès sous pli scellé.">
          <Button kind="primary" onClick={start}>Partir des 5 pouvoirs vitaux</Button>
          <Button onClick={() => setOpen(newPower())}><Plus size={14} />Ajouter un pouvoir</Button>
          <Button onClick={() => update(d => applyTeamExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {open && <PowerSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
      </div>
    );
  }
  const st = all.map(p => powerState(p, now));
  const env = envelopeState(state.envelope, now);
  return (
    <div className="space-y-4">
      <Summary title="L'entreprise tourne-t-elle si quelqu'un manque ?" insights={powerInsights(state, now)} tiles={<>
        <Tile title="Pouvoirs vitaux" value={String(all.length)} sub="un acte sans lequel un processus s'arrête" />
        <Tile title="Suppléance prête" value={`${st.filter(x => x === 'ok').length} / ${all.length}`} sub="2 suppléants entraînés dans l'année" tone={st.every(x => x === 'ok') ? 'ok' : st.includes('no_deputy') ? 'alert' : 'warn'} />
        <Tile title="Suppléants à entraîner" value={String(st.filter(x => x === 'unpracticed' || x === 'soon').length)} sub="une demi-journée par an sur l'acte réel" tone={st.some(x => x === 'unpracticed') ? 'warn' : undefined} />
        <Tile title="Enveloppe des accès" value={state.envelope.checkedAt ? frDate(state.envelope.checkedAt) : '—'} sub={env === 'ok' ? `prochaine vérification avant le ${frDate(addDays(state.envelope.checkedAt, ENVELOPE_DAYS))}` : 'vérification à faire'} tone={env === 'ok' ? 'ok' : 'warn'} />
      </>} />
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Matrice des suppléances" text={`Un suppléant n'est prêt que s'il a fait l'acte lui-même depuis moins de ${Math.round(PRACTICE_DAYS / 30)} mois.`}>
          <Button kind="primary" onClick={() => setOpen(newPower())}><Plus size={14} />Ajouter un pouvoir</Button>
          <Button kind="ghost" onClick={() => { if (window.confirm('Remplacer les suppléances, l\'équipe, la polyvalence, les recrues et les tests de classement par des exemples ?')) update(d => applyTeamExample(d)); }}>Remplir avec des exemples</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-xs">
            <thead><tr className="text-[11px] text-slate-500">{['Pouvoir vital', 'Titulaire', 'Suppléant 1', 'Suppléant 2', 'Accès', 'État'].map(h => <th key={h} className="border-b border-slate-200 px-2 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {all.map((p, i) => (
                <tr key={p.id} onClick={() => setOpen(p)} className="cursor-pointer hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-2 py-2"><span className="block text-[11px] text-slate-500">{processLabel(p.processId)}</span><strong className="text-slate-900">{p.power || 'À décrire'}</strong></td>
                  <td className="border-b border-slate-100 px-2 py-2 font-semibold text-slate-800">{p.holder || <span className="text-red-700">À désigner</span>}</td>
                  {[0, 1].map(k => (
                    <td key={k} className="border-b border-slate-100 px-2 py-2">
                      {p.deputies[k] ? <><span className="block font-semibold text-slate-800">{p.deputies[k]}</span><span className="text-[11px]"><Practice date={p.practiced[k]} /></span></> : <span className="text-[11px] text-red-700">À nommer</span>}
                    </td>
                  ))}
                  <td className="max-w-[200px] border-b border-slate-100 px-2 py-2 text-[11px] text-slate-600">{p.access}</td>
                  <td className="border-b border-slate-100 px-2 py-2"><StatusBadge level={POWER_STATE[st[i]].tone} text={POWER_STATE[st[i]].label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="grid items-end gap-3 p-3 sm:grid-cols-[2fr_1fr_auto] sm:p-4">
        <Field label="Enveloppe scellée des accès : où elle est" hint="Mots de passe maîtres et procédures de secours ; ouverte seulement en cas d'absence imprévue de plus de 24 h, sous double visa.">
          <input className={inputCls} value={state.envelope.location} onChange={e => update(d => { d.envelope.location = e.target.value; })} />
        </Field>
        <p className="text-[11px] text-slate-600">{state.envelope.checkedAt ? `Vérifiée le ${frDate(state.envelope.checkedAt)}${state.envelope.by ? ` par ${state.envelope.by}` : ''}.` : 'Jamais vérifiée.'} Codes à jour, suppléants à l'aise avec les outils : à revoir chaque semestre.</p>
        <Button onClick={() => update(d => { d.envelope.checkedAt = isoDate(new Date()); d.envelope.by = author; })}><Check size={14} />Vérifiée aujourd'hui</Button>
      </Card>
      <Method rule="Aucune entreprise ne doit être paralysée par l'absence d'une seule personne : chaque pouvoir vital a deux suppléants entraînés et des accès sous pli scellé."
        steps={[['Cartographier les pouvoirs', 'Pour chaque processus, l\'acte sans lequel tout s\'arrête : payer, valider un devis, lancer, ouvrir, libérer.'], ['Entraîner les suppléants', 'Une demi-journée par an où le suppléant fait réellement l\'acte, en conditions réelles.'], ['Accès sous pli', 'Codes et mots de passe sous enveloppe scellée au coffre, signée sur la languette.']]} />
      {open && <PowerSheet initial={open} onClose={() => setOpen(null)} nav={nav} />}
    </div>
  );
}

function PowerSheet({ initial, onClose, nav }: { initial: Power; onClose(): void; nav: Nav }) {
  const { state, update } = useStore();
  const [p, setP] = useState<Power>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const isNew = !state.powers[p.id];
  const set = (x: Partial<Power>) => setP(y => ({ ...y, ...x }));
  const setDep = (k: 0 | 1, name: string) => set({ deputies: (k === 0 ? [name, p.deputies[1]] : [p.deputies[0], name]) as [string, string], practiced: (k === 0 ? [name === p.deputies[0] ? p.practiced[0] : '', p.practiced[1]] : [p.practiced[0], name === p.deputies[1] ? p.practiced[1] : '']) as [string, string] });
  const setPrac = (k: 0 | 1, date: string) => set({ practiced: (k === 0 ? [date, p.practiced[1]] : [p.practiced[0], date]) as [string, string] });
  const st = powerState(p);
  const close = () => { if (JSON.stringify(p) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => { if (!p.power.trim()) return setError('Décrivez le pouvoir vital.'); update(d => { d.powers[p.id] = p; }); onClose(); };
  const remove = () => { if (window.confirm('Supprimer ce pouvoir ?')) { update(d => { delete d.powers[p.id]; }); onClose(); } };
  const train = () => { if (!p.power.trim()) return setError('Décrivez le pouvoir vital.'); update(d => { d.powers[p.id] = p; }); nav.newAction({ ref: { kind: 'power', id: p.id }, constat: `Entraîner le suppléant : ${p.power}` }); };
  return (
    <Modal wide onClose={close} title={isNew ? 'Nouveau pouvoir vital' : p.power} subtitle={<StatusBadge level={POWER_STATE[st].tone} text={POWER_STATE[st].label} />}
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Processus"><select className={inputCls} value={p.processId} onChange={e => set({ processId: e.target.value })}>{PROCESS_IDS.map(x => <option key={x} value={x}>{processLabel(x)}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Pouvoir vital (l'acte sans lequel le processus s'arrête)"><input className={inputCls} value={p.power} onChange={e => set({ power: e.target.value })} /></Field></div>
          <Field label="Titulaire"><input className={inputCls} value={p.holder} list="people" onChange={e => set({ holder: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Codes et accès : où ils sont"><input className={inputCls} value={p.access} onChange={e => set({ access: e.target.value })} /></Field></div>
        </section>
        <section className="space-y-2">
          <SubTitle>Deux suppléants, entraînés dans l'année</SubTitle>
          {([0, 1] as const).map(k => (
            <div key={k} className="grid items-end gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_1fr_auto]">
              <Field label={`Suppléant ${k + 1}`}><input className={inputCls} value={p.deputies[k]} list="people" onChange={e => setDep(k, e.target.value)} /></Field>
              <Field label="A fait l'acte lui-même le"><input type="date" className={inputCls} value={p.practiced[k]} disabled={!p.deputies[k].trim()} onChange={e => setPrac(k, e.target.value)} /></Field>
              <Button disabled={!p.deputies[k].trim()} onClick={() => setPrac(k, isoDate(new Date()))}>Aujourd'hui</Button>
              {p.deputies[k] && <span className="text-[11px] sm:col-span-3"><Practice date={p.practiced[k]} />{p.practiced[k] ? ` · à refaire avant le ${frDate(addDays(p.practiced[k], PRACTICE_DAYS))}` : ''}</span>}
            </div>
          ))}
          {st !== 'ok' && <button type="button" className="text-[11px] font-semibold text-delacour-primary hover:underline" onClick={train}>Planifier l'entraînement (action)</button>}
        </section>
      </div>
    </Modal>
  );
}
