// Tool 1.5 "Coûts horaires": what one hour costs at each workstation (people and machine over the hours really spent on orders),
// the hours to sell to pay the structure of 1.4, and the rates offered to the settings (never written without a click).
// Reserved to management: nothing is drawn in team view.
import { useState } from 'react';
import { Lock, Plus, Printer, Trash2 } from 'lucide-react';
import type { Accounts, HourlyCosts, State, Workstation } from '../domain/types';
import { blankHourly, blankStation, capacity, hourlyCosts, hourlyInsights, mergeRates, overheadOf, productiveHours, roundRate, stationRate } from '../domain/hourly';
import { proposedSettings } from '../domain/breakeven';
import { applyCostExample } from '../domain/costExamples';
import { formatValue } from '../domain/numbers';
import { useStore } from '../store/StoreContext';
import { Button, Card, Empty, Field, inputCls, Method, Modal, NumInput, Summary, SubTitle, Tile, ToolHeader } from './common';
import { Proposals, type Proposal } from './Proposals';
import { useDraft } from './useDraft';
import type { ScreenProps } from './screens';
import type { Nav } from './tools';

const hours = (x: number) => `${Math.round(x).toLocaleString('fr-FR')} h`;
const eur = (x: number) => formatValue(x, '€/h');
const hoursOf = (h: HourlyCosts) => ({ contractHours: h.contractHours, absencePct: h.absencePct, idlePct: h.idlePct, soldHours: h.soldHours });
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function CoutsHoraires({ nav }: ScreenProps) {
  const { state, update, teamView } = useStore();
  const [open, setOpen] = useState<Workstation | null>(null);
  if (!state) return null;
  if (teamView) return <Card className="flex items-center gap-2 p-6 text-xs text-slate-600"><Lock size={16} />Les coûts horaires sont réservés à la direction : la vue équipe ne montre ni les salaires ni les coûts des machines.</Card>;
  const saved = state.settings.hourly;
  const sheet = open && <StationSheet key={open.id} initial={open} onClose={() => setOpen(null)} />;
  if (!saved || !saved.stations.length) {
    return (
      <div className="space-y-4">
        <Empty title="Coûts horaires : ce que coûte vraiment une heure de chaque poste" text="Le personnel chargé, l'amortissement, la maintenance et l'énergie de la machine, divisés par les heures réellement passées sur les commandes (pas les 1 607 heures payées). Chaque poste reçoit un coût direct, un coût complet avec les frais généraux et un coût variable, que les devis, la non-qualité et le seuil de rentabilité utilisent.">
          <Button kind="primary" onClick={() => setOpen(blankStation())}><Plus size={14} />Ajouter un poste</Button>
          <Button onClick={() => update(d => applyCostExample(d))}>Voir un exemple traité</Button>
        </Empty>
        {sheet}
      </div>
    );
  }
  return <div className="space-y-4"><Costs h={saved} accounts={state.settings.accounts} onEdit={setOpen} nav={nav} />{sheet}</div>;
}

function Costs({ h, accounts, onEdit, nav }: { h: HourlyCosts; accounts?: Accounts; onEdit(w: Workstation): void; nav: Nav }) {
  const { state, update } = useStore();
  const [d, setD, commit] = useDraft(hoursOf(h), state?.settings.hourly && hoursOf(state.settings.hourly), x => update(s => { s.settings.hourly = { ...(s.settings.hourly ?? blankHourly()), ...x }; }));
  if (!state) return null;
  const hh: HourlyCosts = { ...h, ...d };      // the hours being typed count at once
  const c = hourlyCosts(hh)!;
  const k = capacity(hh, accounts);
  const ov = overheadOf(accounts, c.carried, state.params);
  const setHour = (key: 'contractHours' | 'absencePct' | 'idlePct', max: number) => (v: number | null) => setD(x => ({ ...x, [key]: Math.max(0, Math.min(max, v ?? 0)) }));
  const missing = accounts ? '' : 'Compte de résultat à saisir (1.4)';

  return (
    <div className="space-y-4">
      <Summary title="Combien coûte une heure de chaque poste ?" insights={hourlyInsights(hh, accounts)} tiles={<>
        <Tile title="Coût horaire moyen" value={c.average === null ? '—' : eur(c.average)} sub={c.average === null ? 'Postes à compléter' : `${eur(c.average * (1 + ov.pct / 100))} avec ${Math.round(ov.pct)} % de frais généraux`} />
        <Tile title="Heures productives" value={c.capacity ? hours(c.capacity) : '—'} sub={c.people ? `${formatValue(c.people, '')} ${c.people > 1 ? 'personnes' : 'personne'} × ${hours(c.perPerson)} sur commandes` : ''} />
        <Tile title="Heures à vendre pour le seuil" value={k ? hours(k.needed) : '—'} sub={k ? `au chiffre d'affaires moyen de ${formatValue(k.revenuePerHour, '€')} par heure vendue` : missing || 'Heures vendues à saisir ci-dessous'} />
        <Tile title="Capacité à remplir" value={k ? `${Math.round(k.neededPct)} %` : '—'} sub={k ? `aujourd'hui ${Math.round(k.usedPct)} % de la capacité est vendue` : ''}
          tone={k ? (k.neededPct > 100 || k.sold < k.needed ? 'alert' : k.neededPct > 90 ? 'warn' : 'ok') : undefined} />
      </>} />

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Postes de travail" text="Un poste : une machine et son opérateur, ou un poste sans machine (bureau d'études). Le nom est celui que les devis choisissent (2.1).">
          <Button kind="primary" onClick={() => onEdit(blankStation())}><Plus size={14} />Ajouter un poste</Button>
          <Button kind="ghost" onClick={() => window.print()}><Printer size={14} />Imprimer</Button>
        </ToolHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[11px] text-slate-500">
                {['Poste', 'Personnes', 'Coût direct', 'Coût complet', 'Coût variable', 'Dans les réglages'].map((t, i) => <th key={t} className={`border-b border-slate-200 px-2 py-2 font-semibold ${i ? 'text-right' : ''}`}>{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {hh.stations.map(s => {
                const r = stationRate(s, c.perPerson);
                const cur = (state.params.rates || []).find(x => same(x.name, s.name));
                return (
                  <tr key={s.id}>
                    <td className="border-b border-slate-100 px-2 py-2">
                      <button type="button" onClick={() => onEdit(s)} className="font-semibold text-delacour-primary hover:underline">{s.name || 'Poste sans nom'}</button>
                    </td>
                    <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{s.people === null ? '—' : formatValue(s.people, '')}</td>
                    {r ? <>
                      <td className="border-b border-slate-100 px-2 py-2 text-right font-mono font-semibold text-slate-900">{eur(r.direct)}</td>
                      <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{eur(r.direct * (1 + ov.pct / 100))}</td>
                      <td className="border-b border-slate-100 px-2 py-2 text-right font-mono text-slate-700">{eur(r.variable)}</td>
                    </> : <td colSpan={3} className="border-b border-slate-100 px-2 py-2 text-right text-[11px] font-semibold text-amber-800">à compléter</td>}
                    <td className={`border-b border-slate-100 px-2 py-2 text-right font-mono ${r && cur && cur.rate !== roundRate(r.direct) ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>{cur ? eur(cur.rate) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          Coût direct : personnel et machine sur les heures productives, à utiliser dans les devis. Coût complet : plus {Math.round(ov.pct)} % de frais généraux ({ov.computed ? 'calculés sur le compte de résultat de 1.4' : 'des réglages'}), le prix plancher moyen d'une heure. Coût variable : ce qu'une heure de plus consomme quand la machine tourne (maintenance, énergie) ; les salaires sont payés de toute façon.
        </p>
      </Card>

      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Heures productives et heures vendues" text="Une personne payée 1 607 heures n'en passe pas autant sur des commandes : les absences et le temps hors commandes réduisent les heures qui paient le poste.">
          {!accounts && <Button onClick={() => nav.tool('1.4')}>Saisir le compte de résultat (1.4)</Button>}
        </ToolHeader>
        <div onBlur={commit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Heures payées par personne et par an" hint="1 607 h : durée légale, congés payés et jours fériés déjà déduits."><NumInput value={d.contractHours} onChange={setHour('contractHours', 3000)} /></Field>
          <Field label="Absences et formation (%)" hint="Maladie, formation, congés en plus du légal, en % des heures payées."><NumInput value={d.absencePct} onChange={setHour('absencePct', 100)} /></Field>
          <Field label="Temps hors commandes (%)" hint="Attente de matière ou de plan, réglages, rangement, réunions, en % des heures de présence."><NumInput value={d.idlePct} onChange={setHour('idlePct', 100)} /></Field>
          <Field label="Heures vendues sur l'exercice" hint="Heures pointées sur les commandes ou facturées, personnel de production. Sert à lire la capacité."><NumInput value={d.soldHours} onChange={v => setD(x => ({ ...x, soldHours: v }))} /></Field>
        </div>
        <p className="text-[11px] text-slate-600">
          Heures productives par personne : <strong className="font-mono text-slate-900">{hours(c.perPerson)}</strong> ({hours(d.contractHours)} payées, moins {formatValue(d.absencePct, '%')} d'absences et de formation, moins {formatValue(d.idlePct, '%')} de temps hors commandes). Valeurs de départ à ajuster avec vos pointages.
        </p>
      </Card>

      <Offer h={hh} accounts={accounts} />

      <Method rule="Une heure vendue sous son coût complet ne paie pas la structure. Sous son coût variable, elle fait perdre de l'argent."
        steps={[
          ['Décrire chaque poste', 'Une machine et son opérateur, ou un poste sans machine. Compter les personnes en équivalent temps plein.'],
          ['Chiffrer sur l\'année', "Coût chargé des personnes, amortissement, maintenance, énergie. Les chiffres viennent de la paie et du tableau des immobilisations."],
          ['Diviser par les heures productives', 'Pas par les 1 607 heures payées : par les heures réellement passées sur des commandes.'],
        ]}
        tips={[
          "Le coût direct va dans les devis (2.1), les frais généraux s'ajoutent à part. Le coût complet donne le prix plancher moyen d'une heure.",
          "Entre le coût variable et le coût complet, ne vendre que des heures qui seraient restées vides, et sans en faire le prix de référence du client.",
          "Un poste peu utilisé coûte cher l'heure : sa machine se paie sur peu d'heures.",
          "Refaire le calcul à chaque clôture, et quand une machine arrive ou part.",
        ]} />
    </div>
  );
}

// Values of the settings that the stations allow to compute
function Offer({ h, accounts }: { h: HourlyCosts; accounts?: Accounts }) {
  const { state } = useStore();
  const c = hourlyCosts(h);
  if (!state || !c || !c.stations.length || c.average === null) return null;
  const p = state.params;
  const avg = roundRate(c.average);
  const merge = mergeRates(p.rates, c.stations);
  const prop = proposedSettings(accounts, c.carried);
  const rows: Proposal[] = [
    {
      label: 'Coût horaire chargé général', now: eur(p.hourlyRate), next: eur(avg), same: p.hourlyRate === avg, save: d => { d.params.hourlyRate = avg; },
      use: "Valorise les heures perdues (5.1, 5.2, 3.1) et les heures d'un devis sans poste choisi (2.1). Les frais généraux s'ajoutent à part.",
    },
    {
      label: 'Coûts horaires des postes', now: `${merge.same} à jour sur ${c.stations.length}`, next: `${merge.added} à ajouter, ${merge.changed} à modifier`, same: !merge.added && !merge.changed,
      save: d => { d.params.rates = mergeRates(d.params.rates, c.stations).rates; },
      use: 'Coût direct de chaque poste, choisi dans un devis (2.1). Les postes des réglages qui ne sont pas ici restent tels quels.',
    },
    ...(prop && prop.overheadPct !== null ? [{
      label: 'Frais généraux', now: formatValue(p.overheadPct ?? 0, '%'), next: formatValue(prop.overheadPct, '%'), same: (p.overheadPct ?? 0) === prop.overheadPct, save: (d: State) => { d.params.overheadPct = prop.overheadPct!; },
      use: "Charges fixes hors personnel de production, hors amortissement et maintenance des machines (portés par les coûts horaires ci-dessus), en % des coûts directs : résultat après frais des devis (2.1).",
    }] : []),
  ];
  return <Proposals rows={rows} note="Calculées sur les postes saisis. Rien n'est modifié sans votre clic." />;
}

// One workstation: the people, the machine, and what an hour costs at once
function StationSheet({ initial, onClose }: { initial: Workstation; onClose(): void }) {
  const { state, update } = useStore();
  const [w, setW] = useState<Workstation>(() => structuredClone(initial));
  const [error, setError] = useState('');
  if (!state) return null;
  const h = state.settings.hourly ?? blankHourly();
  const isNew = !h.stations.some(s => s.id === w.id);
  const perPerson = productiveHours(h);
  const r = stationRate(w, perPerson);
  const ov = overheadOf(state.settings.accounts, hourlyCosts(h)?.carried ?? 0, state.params);
  const set = (x: Partial<Workstation>) => setW(y => ({ ...y, ...x }));
  const close = () => { if (JSON.stringify(w) === JSON.stringify(initial) || window.confirm('Fermer sans enregistrer ? Vos modifications seront perdues.')) onClose(); };
  const save = () => {
    const name = w.name.trim();
    if (!name) return setError('Indiquez le nom du poste.');
    if (h.stations.some(s => s.id !== w.id && same(s.name, name))) return setError('Ce poste existe déjà.');
    update(d => {
      const x = d.settings.hourly ||= blankHourly();
      const i = x.stations.findIndex(s => s.id === w.id);
      if (i >= 0) x.stations[i] = { ...w, name }; else x.stations.push({ ...w, name });
    });
    onClose();
  };
  const remove = () => {
    if (!window.confirm(`Supprimer le poste ${w.name.trim() || 'sans nom'} ?`)) return;
    update(d => { if (d.settings.hourly) d.settings.hourly.stations = d.settings.hourly.stations.filter(s => s.id !== w.id); });
    onClose();
  };
  const names = [...new Set([...Object.values(state.equipments).map(e => e.name), ...(state.params.rates || []).map(x => x.name), ...h.stations.map(s => s.name)].map(n => n.trim()).filter(Boolean))].sort();

  return (
    <Modal onClose={close} title={isNew ? 'Nouveau poste' : `Poste ${initial.name || 'sans nom'}`} subtitle="Personnel et machine, sur les heures réellement passées sur des commandes"
      footer={<>
        {!isNew && <Button kind="danger" onClick={remove} className="mr-auto"><Trash2 size={14} />Supprimer</Button>}
        {error && <span role="alert" className="mr-2 text-[11px] font-semibold text-red-700">{error}</span>}
        <Button onClick={close}>Annuler</Button>
        <Button kind="primary" onClick={save}>Enregistrer</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-2">
          <SubTitle>1. Le poste</SubTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Poste ou machine" hint="Le nom que les devis choisissent (2.1)."><input className={inputCls} list="stations" value={w.name} onChange={e => set({ name: e.target.value })} /></Field></div>
            <Field label="Personnes" hint="En équivalent temps plein : 0,5 pour un poste partagé."><NumInput value={w.people} onChange={v => set({ people: v })} /></Field>
          </div>
        </section>
        <section className="space-y-2">
          <SubTitle>2. Coûts sur l'année</SubTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Coût chargé d'une personne (€)" hint="Salaire brut annuel plus charges patronales : demander le coût employeur au cabinet de paie."><NumInput value={w.labourCost} onChange={v => set({ labourCost: v })} /></Field>
            <Field label="Amortissement de la machine (€)" hint="Prix d'achat divisé par la durée d'amortissement."><NumInput value={w.depreciation} onChange={v => set({ depreciation: v })} /></Field>
            <Field label="Maintenance (€)" hint="Contrat et pièces d'usure sur l'année."><NumInput value={w.maintenance} onChange={v => set({ maintenance: v })} /></Field>
            <Field label="Énergie (€)" hint="Électricité, gaz, air comprimé consommés par la machine."><NumInput value={w.energy} onChange={v => set({ energy: v })} /></Field>
          </div>
        </section>
        <section className="space-y-2">
          <SubTitle>3. Coût de l'heure</SubTitle>
          {r ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Tile title="Coût direct" value={eur(r.direct)} sub="personnel et machine" />
                <Tile title="Coût complet" value={eur(r.direct * (1 + ov.pct / 100))} sub={`avec ${Math.round(ov.pct)} % de frais généraux`} />
                <Tile title="Coût variable" value={eur(r.variable)} sub="maintenance et énergie" />
              </div>
              <p className="text-[11px] text-slate-500">{hours(r.hours)} sur commandes par an ({formatValue(r.people, '')} × {hours(perPerson)}), pour {formatValue(r.cost, '€')} de coût annuel.</p>
            </>
          ) : <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">Saisissez le nom, les personnes et au moins un coût pour calculer l'heure.</p>}
        </section>
      </div>
      <datalist id="stations">{names.map(n => <option key={n} value={n} />)}</datalist>
    </Modal>
  );
}
