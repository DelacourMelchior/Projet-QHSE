// Tool 4.1 "Suppléances d'urgence": for each vital power (the act without which the company stops) a holder and two deputies who did the act within the year, the formalities that let
// a deputy act, and the accesses under sealed envelopes. Screen: the question and its door (« Quelqu'un est absent »), who is away today, one line of verdict, what is left to do; the
// whole list (the powers, the people, the envelopes) opens on « Voir toutes les fonctions »; the rare gestures are in the menu « ⋯ », the method and the settings in a closed foot.
// Addresses (`#4.1~…`): `<id>[:tab]` a power, `contact:<id>` a card of the directory, `absent:<name>:<from>:<to>`, `vault:<id>`, `cover:<id>`, `review`, `setup`, `new`.
import { useEffect, useState } from 'react';
import { MoreHorizontal, Plus, Search, UserX } from 'lucide-react';
import type { Power } from '../../domain/types';
import { nb, processLabel } from '../../domain/base';
import { norm } from '../../domain/instructions';
import { frDate, isoDate, periodOfDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { activePowers, newPower, powerCfg, STATE_RANK, syncPowerPeople, waitRank } from '../../domain/powers';
import { powerSummary } from '../../domain/powersAll';
import { applyPowerExample, hasPowerExample, removePowerExample } from '../../domain/powersExamples';
import { addPowerKpis, isPowerKpi } from '../../domain/powersFeeds';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Chips, Empty, Method, Modal, TONE } from '../common';
import { FeedBox } from '../Feed';
import type { ScreenProps } from '../screens';
import { FIELD, TOUCH, useUndo } from './PwBits';
import { PwAbsent } from './PwAbsent';
import { PwList, rowOf } from './PwCards';
import { PwCover } from './PwCover';
import { PwPeople } from './PwPeople';
import { PwQueue } from './PwQueue';
import { PwReview, PwSetup } from './PwSetup';
import { PwSettings } from './PwSettings';
import { PwSheet, type PwTab } from './PwSheet';
import { PwVaults } from './PwVaults';

type View = 'register' | 'absent' | 'setup' | 'review';
type Section = 'powers' | 'people' | 'vaults';
type Filter = 'all' | 'todo' | 'mine' | 'archived';
const PAGE = 24, enc = encodeURIComponent;
const TABS = ['act', 'people', 'forms'];
const ME = 'pw-me';
const remembered = () => { try { return window.localStorage.getItem(ME) || ''; } catch { return ''; } };

export function Suppleances({ nav, focus, clearFocus }: ScreenProps) {
  const { state, update, teamView } = useStore();
  const [view, setView] = useState<View>('register'), [section, setSection] = useState<Section>('powers'), [filter, setFilter] = useState<Filter>('all'), [q, setQ] = useState(''), [menu, setMenu] = useState(false);
  const [limit, setLimit] = useState(PAGE), [sheet, setSheet] = useState<{ p: Power; tab?: PwTab } | null>(null);
  const [coverId, setCoverId] = useState(''), [vaultFocus, setVaultFocus] = useState(''), [lost, setLost] = useState(false), [dropEx, setDropEx] = useState(false), [absent, setAbsent] = useState({ name: '', from: '', to: '' });
  const [me, setMeState] = useState(remembered);
  const { bar, offer } = useUndo();
  const setMe = (v: string) => { setMeState(v); try { window.localStorage.setItem(ME, v); } catch { /* nothing is kept */ } };
  const back = () => { setView('register'); try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${window.location.hash.split('~')[0]}`); } catch { /* the address stays */ } };

  // a link, a tap of the queue or a task: the right place of the tool
  const go = (f: string) => {
    if (!state) return;
    const [a, b = '', c = '', e = ''] = f.split(':');
    if (f === 'new') { setView('register'); setSheet({ p: newPower() }); }
    else if (f === 'setup' || f === 'review') setView(f);
    else if (a === 'absent') { setAbsent({ name: decodeURIComponent(b), from: c, to: e }); setView('absent'); }
    else if (a === 'vault') { setView('register'); setSection('vaults'); setVaultFocus(b); }
    else if (a === 'cover') { if (state.covers[b]) setCoverId(b); else setLost(true); }
    else if (a === 'practice') { const p = Object.hasOwn(state.powers, b) ? state.powers[b] : undefined; if (p) setSheet({ p, tab: 'people' }); else setLost(true); }
    else if (a === 'contact') { if (state.contacts[b]) nav.open('1.3', b); else setLost(true); }
    else { const p = Object.hasOwn(state.powers, a) ? state.powers[a] : undefined; if (p) setSheet({ p, tab: TABS.includes(b) ? b as PwTab : undefined }); else setLost(true); }
  };
  // the names of the powers follow the directory: a rename there is carried here, a name that is exactly a person of the lists gets its link
  useEffect(() => { if (state && syncPowerPeople(structuredClone(state))) update(d => { syncPowerPeople(d); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [menu]);
  useEffect(() => {
    if (!focus || !state) return;
    go(focus);
    if (!focus.startsWith('absent')) clearFocus();
  }, [focus, !!state]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!state) return null;

  const now = new Date(), today = isoDate(now), cfg = powerCfg(state.params), live = activePowers(state), archived = Object.values(state.powers).filter(p => p.archivedAt);
  const sm = powerSummary(state, now), todos = teamView ? sm.todos.filter(t => t.kind !== 'vault' && t.kind !== 'unsealed') : sm.todos, rows = live.map(p => rowOf(p, state, now, cfg));
  const mine = (r: { p: Power }) => !!me && [r.p.holder, ...r.p.deputies, ...(r.p.extra || [])].some(n => norm(n) === norm(me));
  const FILTERS: [Filter, string, number][] = [['all', 'Tous', rows.length], ['todo', 'À faire', rows.filter(r => r.st !== 'ok').length],
    ...(me ? [['mine', 'Mes fonctions', rows.filter(mine).length] as [Filter, string, number]] : []), ...(archived.length ? [['archived', 'Archivés', archived.length] as [Filter, string, number]] : [])];
  const words = norm(q).split(/\s+/).filter(Boolean);
  const text = (r: { p: Power }) => norm([r.p.power, r.p.holder, ...r.p.deputies, ...(r.p.extra || []), processLabel(r.p.processId)].join(' '));
  const shown = (filter === 'archived' ? archived.map(p => rowOf(p, state, now, cfg)) : rows)
    .filter(r => (filter === 'todo' ? r.st !== 'ok' : filter === 'mine' ? mine(r) : true) && words.every(w => text(r).includes(w)))
    .sort((a, b) => STATE_RANK[a.st] - STATE_RANK[b.st] || waitRank(a.p) - waitRank(b.p) || a.p.processId.localeCompare(b.p.processId) || a.p.power.localeCompare(b.p.power, 'fr'));
  const open = (p: Power, tab?: PwTab) => { setView('register'); setSheet({ p, tab }); };
  const mayDrop = hasPowerExample(state) && (!teamView || !!state.params.teamCanDelete);
  const removeExample = () => {
    const was = { powers: { ...state.powers }, practices: { ...state.practices }, covers: { ...state.covers }, vaults: { ...state.vaults }, vlogs: { ...state.vlogs } };
    update(d => { removePowerExample(d); });
    setDropEx(false);
    offer('Exemple retiré', () => update(d => { Object.assign(d.powers, was.powers); Object.assign(d.practices, was.practices); Object.assign(d.covers, was.covers); Object.assign(d.vaults, was.vaults); Object.assign(d.vlogs, was.vlogs); }));
  };

  const overlays = <>
    {sheet && <PwSheet key={sheet.p.id} id={sheet.p.id} draft={sheet.p} tab={sheet.tab} nav={nav} onClose={() => setSheet(null)} />}
    {coverId && state.covers[coverId] && <PwCover cover={state.covers[coverId]} nav={nav} offer={offer} onClose={() => setCoverId('')} />}
    {dropEx && <ExampleDialog gone={removePowerExample(structuredClone(state))} onClose={() => setDropEx(false)} onRemove={removeExample} />}
    {lost && <Modal onClose={() => setLost(false)} title="Introuvable" footer={<Button onClick={() => setLost(false)}>Fermer</Button>}><p className="text-xs text-slate-700">Cette fonction ou cette absence n'existe pas sur cet appareil. Elle a peut-être été supprimée, ou les données de l'entreprise ne sont pas encore chargées ici.</p></Modal>}
    {bar}
  </>;

  if (view === 'setup') return <div className="space-y-4"><PwSetup onClose={back} onDone={made => { back(); offer(plural(made.length, 'fonction créée', 'fonctions créées'), () => update(d => { made.forEach(id => { delete d.powers[id]; }); })); }} />{overlays}</div>;
  if (view === 'review') return <div className="space-y-4"><PwReview onOpen={id => open(state.powers[id])} onClose={back} />{overlays}</div>;
  if (view === 'absent') return <div className="space-y-4"><PwAbsent key={absent.name + absent.from + absent.to} initial={absent} nav={nav} onOpenPower={(id, tab) => open(state.powers[id], tab)} onCover={setCoverId} onClose={back} />{overlays}</div>;

  if (!Object.keys(state.powers).length && !Object.keys(state.vaults).length) {
    return (
      <div className="space-y-4">
        <Empty title="Suppléances : l'entreprise tourne même si quelqu'un manque" text="Pour chaque processus, l'acte sans lequel tout s'arrête : payer, valider une offre, lancer l'activité, ouvrir les locaux, libérer un produit. Un titulaire, deux suppléants qui le font vraiment une fois par an, les accès sous pli scellé.">
          <Button kind="primary" onClick={() => setView('setup')}>Partir de la bibliothèque</Button>
          <Button onClick={() => setSheet({ p: newPower() })}><Plus size={14} />Ajouter une fonction</Button>
          <Button onClick={() => update(d => applyPowerExample(d))}>Voir un exemple traité</Button>
        </Empty>
        <PwSettings />
        {overlays}
      </div>
    );
  }

  const noneText = !words.length ? 'Aucune fonction pour ce filtre.' : `Aucune fonction ne contient « ${q.trim()} » dans ce filtre.`;
  const hasKpis = Object.values(state.kpis).some(isPowerKpi), vaultsLeft = !teamView ? sm.vaults.toDo : 0;
  const verdictTone = !sm.total ? TONE.warn : sm.ready === sm.total ? TONE.good : sm.counts.no_deputy ? TONE.bad : TONE.warn;
  const pick = (f: () => void) => () => { setMenu(false); f(); };
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="min-w-0 flex-1 basis-56 text-sm font-bold text-delacour-primary">{nb("L'entreprise tourne-t-elle si quelqu'un manque ?")}</h2>
          <div className="relative flex w-full items-center gap-2 sm:w-auto print:hidden">
            <Button kind="primary" className="flex-1 sm:flex-none" onClick={() => go('absent')}><UserX size={14} aria-hidden />Quelqu'un est absent</Button>
            <Button aria-label="Autres actions" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={14} aria-hidden /></Button>
            {menu && <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenu(false)} />}
            {menu && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-1 flex w-64 flex-col gap-0.5 rounded-lg border border-slate-300 bg-white p-1 shadow-lg">
                {[['Ajouter une fonction', () => go('new')], ['Revue de la liste', () => setView('review')], ['Partir de la bibliothèque', () => setView('setup')],
                  ...(!hasKpis ? [['Ajouter au tableau de pilotage (1.1)', () => update(d => { addPowerKpis(d); })] as [string, () => void]] : []),
                  ['Imprimer', () => window.print()], ...(mayDrop ? [["Retirer l'exemple", () => setDropEx(true)] as [string, () => void]] : [])].map(([l, f]) => (
                  <button key={l as string} type="button" role="menuitem" className={`rounded px-2.5 py-1.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${TOUCH}`} onClick={pick(f as () => void)}>{l as string}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        {sm.absent.length > 0 && (
          <ul className="space-y-1.5">
            {sm.absent.map(a => (
              <li key={a.name} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-xs ${a.uncovered ? TONE.bad : TONE.warn}`}>
                <span><strong>{a.name}</strong> est absent jusqu'au {frDate(a.until)} : {plural(a.held - a.uncovered, 'fonction couverte', 'fonctions couvertes')}{a.uncovered ? `, ${plural(a.uncovered, 'fonction')} sans suppléant disponible` : ''}.</span>
                <Button className="!py-1" onClick={() => go(`absent:${enc(a.name)}:${today}:${a.until}`)}>Qui remplace ?</Button>
              </li>
            ))}
          </ul>
        )}
        <p role="status" className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs font-semibold ${verdictTone}`}>
          <span>{sm.total ? `${sm.ready} fonction${sm.ready > 1 ? 's' : ''} clé${sm.ready > 1 ? 's' : ''} sur ${sm.total} ${sm.ready > 1 ? 'sont prêtes' : 'est prête'} (suppléants nommés, signatures faites).` : 'Aucune fonction décrite.'}{vaultsLeft ? ` ${plural(vaultsLeft, 'enveloppe', 'enveloppes')} à vérifier.` : ''}</span>
          {vaultsLeft > 0 && <button type="button" className={`font-semibold underline ${TOUCH}`} onClick={() => setSection('vaults')}>Voir les accès</button>}
        </p>
      </Card>

      <PwQueue todos={todos} me={me} onOpen={go} />

      {(
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div role="tablist" aria-label="Sections de l'outil" className="flex gap-5 print:hidden">
              {([['powers', 'Fonctions', live.length], ['people', 'Personnes', sm.people.length], ...(teamView ? [] : [['vaults', 'Accès de secours', Object.values(state.vaults).filter(v => !v.archivedAt).length]])] as [Section, string, number][]).map(([k, l, n]) => (
                <button key={k} type="button" role="tab" id={`pw-sec-${k}`} aria-selected={section === k} aria-controls="pw-section" onClick={() => setSection(k)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-1.5 pt-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${TOUCH} ${section === k ? 'border-delacour-primary font-bold text-delacour-primary' : 'border-transparent font-semibold text-slate-600 hover:text-slate-900'}`}>
                  {l}<span className="text-xs font-normal text-slate-600">{n}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 print:hidden">
              <label className="flex items-center gap-1.5 text-xs text-slate-700"><span className="font-semibold">Je suis</span>
                <select className={`${FIELD} !w-auto`} aria-label="Je suis : pour retrouver mes fonctions et mes tâches" value={me} onChange={e => { setMe(e.target.value); if (!e.target.value && filter === 'mine') setFilter('all'); }}>
                  <option value="">Choisir ma personne</option>
                  {Object.values(state.people).filter(p => p.active && p.name.trim()).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select></label>
            </div>
          </div>

          <div id="pw-section" role="tabpanel" aria-labelledby={`pw-sec-${section}`} className="space-y-4">
          {section === 'powers' && (
            <div id="pw-list" className="scroll-mt-36"><Card className="space-y-3 p-3 sm:p-4">
              <div className="min-w-0"><h2 className="text-sm font-bold text-delacour-primary">Les fonctions clés</h2><p className="max-w-3xl text-xs text-slate-600">Une fonction clé est l'acte sans lequel l'entreprise s'arrête (payer, signer une offre, ouvrir les locaux). Elle est prête quand elle a deux suppléants et que chacun, le titulaire et la direction ont signé la délégation.</p></div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="min-w-0 max-w-full [@media(pointer:coarse)]:[&_button]:min-h-[44px]"><Chips value={filter} onChange={f => { setFilter(f); setLimit(PAGE); }} items={FILTERS} /></div>
                <label className="relative block w-full sm:w-56"><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden /><input className={`${FIELD} !pl-7`} value={q} placeholder="Fonction, personne, processus" aria-label="Chercher une fonction, une personne ou un processus" onChange={e => { setQ(e.target.value); setLimit(PAGE); }} /></label>
              </div>
              {shown.length
                ? <>
                  <PwList rows={shown.slice(0, limit)} state={state} onOpen={open} />
                  {shown.length > limit && <div className="flex flex-wrap items-center justify-center gap-3 pt-1"><span className="text-xs text-slate-600">{limit} fonctions affichés sur {shown.length}</span><Button onClick={() => setLimit(limit + PAGE)}>Afficher {Math.min(PAGE, shown.length - limit)} de plus</Button></div>}
                </>
                : <p className="py-6 text-center text-xs text-slate-600">{noneText}</p>}
            </Card></div>
          )}
          {section === 'people' && <PwPeople state={state} now={now} onAbsent={n => go(`absent:${enc(n)}`)} onOpen={id => open(state.powers[id])} />}
          {section === 'vaults' && !teamView && <PwVaults focusId={vaultFocus} nav={nav} offer={offer} />}
          </div>
        </>
      )}

      <details className="group print:hidden">
        <summary className={`flex cursor-pointer list-none items-center text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}>Réglages et méthode</summary>
        <div className="mt-2 space-y-4">
          {hasKpis && <FeedBox tool="4.1" period={periodOfDate(now)} />}
          <Method rule="Aucune entreprise ne doit être paralysée par l'absence d'une seule personne : chaque fonction clé a deux suppléants qui ont signé leur délégation, et des accès de secours notés."
            steps={[['Cartographier les fonctions', "Pour chaque processus, l'acte sans lequel tout s'arrête : payer, valider une offre, lancer l'activité, ouvrir les locaux, libérer un produit."], ['Faire signer la délégation', "Le titulaire, chaque suppléant et la direction signent sous leur nom, sur l'écran : une signature manquante est signalée."], ['Accès de secours', "Où sont les accès dont on a besoin si le titulaire manque, et qui peut y accéder : jamais les mots de passe eux-mêmes."]]}
            tips={["Ce qui est tapé une fois (fonctions, personnes, formalités) reste ; les gestes (une signature, une absence) sont enregistrés à l'instant.", "Une absence enregistrée ici est aussi dans la polyvalence (4.2) et l'annuaire (1.3).", "L'outil n'écrit aucun mot de passe : seulement où il est."]} />
          <PwSettings />
        </div>
      </details>
      {overlays}
    </div>
  );
}

// Removing the example says what leaves, what stays, and that "Annuler" brings it back
function ExampleDialog({ onClose, onRemove, gone }: { onClose(): void; onRemove(): void; gone: ReturnType<typeof removePowerExample> }) {
  return (
    <Modal onClose={onClose} title="Retirer l'exemple" footer={<><Button onClick={onClose}>Annuler</Button><Button kind="danger" onClick={onRemove}>Retirer l'exemple</Button></>}>
      <div className="space-y-2 text-xs text-slate-700">
        <p>Quittent l'outil : {[plural(gone.powers, "fonction d'exemple", "fonctions d'exemple"), gone.practices ? plural(gone.practices, 'pratique inscrite', 'pratiques inscrites') : '', gone.covers ? plural(gone.covers, 'absence couverte', 'absences couvertes') : '', gone.vaults ? plural(gone.vaults, "enveloppe d'exemple", "enveloppes d'exemple") : ''].filter(Boolean).join(', ')}.</p>
        <p>Restent : les fonctions que l'entreprise a ajoutés, les personnes du personnel et de l'annuaire, et les réglages. « Annuler » restaure l'exemple pendant 8 secondes après le retrait.</p>
      </div>
    </Modal>
  );
}
