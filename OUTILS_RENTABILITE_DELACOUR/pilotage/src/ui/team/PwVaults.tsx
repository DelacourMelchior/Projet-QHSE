// The emergency accesses (direction only): where each one is kept, what it holds (never the secrets) and who can get to it. The light list stops there. With the complete follow-up on
// (setting of the tool) an access is a sealed envelope: the check of every six months with its four controls, and the journal of the openings with the day it was sealed again and the
// codes changed. Each check and each opening is one line, written once.
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Vault, VaultLog } from '../../domain/types';
import type { Nav } from '../tools';
import { nowLocal } from '../../domain/base';
import { activeVaults, lastCheck, powerCfg, monthsSince, newVault, newVaultLog, openUnsealed, VAULT_CHECKS, VAULT_STATE, vaultLogs, vaultState, whoIs } from '../../domain/powers';
import { frDate, isoDate } from '../../domain/periods';
import { plural } from '../../domain/receptions';
import { useStore } from '../../store/StoreContext';
import { Button, Card, Field, Modal, StatusBadge, ToolHeader } from '../common';
import { FIELD, Facts, LINK, PersonField, TOUCH } from './PwBits';

type Offer = (what: string, back: () => void) => void;
const stamp = (at: string) => `${frDate(at.slice(0, 10))}${at.length > 10 ? ` à ${at.slice(11, 13)} h ${at.slice(14, 16)}` : ''}`;

export function PwVaults({ focusId, nav, offer }: { focusId: string; nav: Nav; offer: Offer }) {
  const { state, update, author } = useStore();
  const [edit, setEdit] = useState<Vault | null>(null), [check, setCheck] = useState<Vault | null>(null), [opening, setOpening] = useState<Vault | null>(null);
  const done = useRef('');
  useEffect(() => {
    if (!state || !focusId || done.current === focusId) return;
    done.current = focusId;
    const v = state.vaults[focusId];
    if (!v) return;
    if (['never', 'due'].includes(vaultState(state, v))) setCheck(v);
    else requestAnimationFrame(() => document.getElementById(`vault-${focusId}`)?.scrollIntoView({ block: 'start', behavior: 'auto' }));
  }, [focusId, state]);
  if (!state) return null;
  const now = new Date(), today = isoDate(now), full = powerCfg(state.params).vaultFull, vaults = activeVaults(state), archived = Object.values(state.vaults).filter(v => v.archivedAt);
  // a line of an opening that is closed step by step: sealed again, codes changed
  const close = (l: VaultLog, k: 'resealedAt' | 'codesChangedAt') => {
    update(d => { if (d.vlogs[l.id]) d.vlogs[l.id] = { ...d.vlogs[l.id], [k]: today }; });
    offer(k === 'resealedAt' ? 'Enveloppe remise sous pli' : 'Codes changés', () => update(d => { if (d.vlogs[l.id]) { const x = { ...d.vlogs[l.id] }; delete x[k]; d.vlogs[l.id] = x; } }));
  };
  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-3 sm:p-4">
        <ToolHeader title="Accès de secours" text={full ? "Une enveloppe scellée par coffre ou par site : ce qu'elle contient (jamais les mots de passe eux-mêmes), les deux personnes qui l'ouvrent ensemble, et la vérification tous les six mois." : "Ce dont quelqu'un a besoin si le titulaire manque : la banque, l'alarme, la messagerie. Où c'est rangé et qui peut y accéder. Jamais les mots de passe eux-mêmes."}><Button kind="primary" onClick={() => setEdit(newVault())}><Plus size={14} />{full ? 'Nouvelle enveloppe' : 'Nouvel accès'}</Button></ToolHeader>
        {vaults.length === 0 && <p className="py-3 text-xs text-slate-600">{full ? "Aucune enveloppe n'est décrite. Les accès de secours sont sous pli scellé, au coffre, signés sur la languette : décrire ici où elle est et qui l'ouvre." : "Aucun accès décrit. Par exemple : l'accès à la banque, la clé de l'alarme, le compte de messagerie. Noter où c'est rangé et qui peut y accéder."}</p>}
        <ul className="grid gap-3 lg:grid-cols-2">
          {vaults.map(v => {
            const logs = vaultLogs(state, v.id), st = vaultState(state, v, now), c = lastCheck(v, logs), pending = openUnsealed(logs), mo = c ? monthsSince(c.at.slice(0, 10), now) : null;
            return (
              <li key={v.id} id={`vault-${v.id}`} className="scroll-mt-36 space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex items-start justify-between gap-2"><strong className="text-sm font-semibold text-slate-900">{v.name || (full ? 'Enveloppe sans nom' : 'Accès sans nom')}</strong>{full && <StatusBadge level={VAULT_STATE[st].tone} text={VAULT_STATE[st].label} />}</div>
                <dl className="space-y-1.5 text-slate-700">
                  <div><dt className="inline font-semibold text-slate-900">Où : </dt><dd className="inline">{v.location || 'à préciser'}</dd></div>
                  <div><dt className="inline font-semibold text-slate-900">Elle contient : </dt><dd className="inline">{v.contents.length ? v.contents.join(' · ') : 'à lister'}</dd></div>
                  <div className="flex flex-wrap items-start gap-x-1.5"><dt className="font-semibold text-slate-900">{full ? 'Double visa : ' : 'Peut y accéder : '}</dt>{v.visa.some(x => x.trim()) ? v.visa.filter(x => x.trim()).map((x, i) => <dd key={x} className="flex flex-wrap items-center gap-x-1.5">{i ? 'et ' : ''}{x}<Facts who={whoIs(state, x, today)} /></dd>) : <dd>à nommer</dd>}</div>
                  {v.keyHolder?.trim() && <div className="flex flex-wrap items-center gap-x-1.5"><dt className="font-semibold text-slate-900">Clé du coffre : </dt><dd>{v.keyHolder}</dd><Facts who={whoIs(state, v.keyHolder, today)} /></div>}
                  {full && <div><dt className="inline font-semibold text-slate-900">Dernière vérification : </dt><dd className="inline">{c ? `${frDate(c.at.slice(0, 10))}${mo !== null && mo >= 1 ? `, il y a ${plural(mo, 'mois', 'mois')}` : ''}${c.by ? `, par ${c.by}` : ''}` : 'jamais'}</dd></div>}
                </dl>
                {full && pending.map(l => (
                  <div key={l.id} className="space-y-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
                    <p className="font-semibold text-red-900">Ouverte le {stamp(l.at)}{l.reason ? ` : ${l.reason}` : ''}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {l.resealedAt ? <span className="text-slate-800">Remise sous pli le {frDate(l.resealedAt)}.</span> : <Button className="!py-1" onClick={() => close(l, 'resealedAt')}>Remise sous pli aujourd'hui</Button>}
                      {l.codesChangedAt ? <span className="text-slate-800">Codes changés le {frDate(l.codesChangedAt)}.</span> : <Button className="!py-1" onClick={() => close(l, 'codesChangedAt')}>Codes changés aujourd'hui</Button>}
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {full && <Button kind={st === 'ok' || st === 'open' ? 'secondary' : 'primary'} className="!py-1" onClick={() => setCheck(v)}>Vérifier l'enveloppe</Button>}
                  <Button kind="ghost" className="!py-1" onClick={() => setEdit(v)}>Modifier</Button>
                  {full && <Button kind="ghost" className="!py-1 !text-red-700" onClick={() => setOpening(v)}>Enveloppe ouverte</Button>}
                </div>
                {full && logs.length > 0 && (
                  <details className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <summary className={`flex cursor-pointer list-none items-center font-semibold text-delacour-primary ${TOUCH}`}>Journal : {plural(logs.length, 'ligne')}</summary>
                    <ul className="divide-y divide-slate-200 pb-1">
                      {logs.slice(0, 8).map(l => (
                        <li key={l.id} className="space-y-0.5 py-1.5">
                          <strong className="text-slate-900">{l.kind === 'check' ? 'Vérification' : 'Ouverture'}</strong> · {stamp(l.at)} · {l.kind === 'check' ? l.by : `ouverte par ${l.openedBy || l.by}, visa de ${l.visaBy || 'à préciser'}`}
                          {l.kind === 'check' && l.ticks && <span className="block text-slate-700">{plural(l.ticks.filter(Boolean).length, 'contrôle')} sur {l.ticks.length}{l.ticks.some(t => !t) ? ` : ${VAULT_CHECKS.filter((_, i) => !l.ticks![i]).join(', ').toLowerCase()} à revoir` : ''}</span>}
                          {l.kind === 'open' && <span className="block text-slate-700">{[l.absent ? `absent : ${l.absent}` : '', l.note ? `utilisé : ${l.note}` : '', l.resealedAt ? `remise sous pli le ${frDate(l.resealedAt)}` : '', l.codesChangedAt ? `codes changés le ${frDate(l.codesChangedAt)}` : ''].filter(Boolean).join(' · ')}</span>}
                          {l.kind === 'check' && l.note && <span className="block text-slate-700">{l.note}</span>}
                        </li>
                      ))}
                    </ul>
                    {logs.length > 8 && <p className="pb-1 text-slate-600">et {plural(logs.length - 8, 'ligne plus ancienne', 'lignes plus anciennes')}.</p>}
                  </details>
                )}
              </li>
            );
          })}
        </ul>
        {archived.length > 0 && <p className="text-xs text-slate-600">{plural(archived.length, full ? 'enveloppe archivée' : 'accès archivé', full ? 'enveloppes archivées' : 'accès archivés')} : {archived.map(v => v.name || 'sans nom').join(', ')}. <button type="button" className={LINK} onClick={() => setEdit(archived[0])}>Ouvrir</button></p>}
      </Card>
      {check && <CheckDialog v={check} author={author || 'anonyme'} nav={nav} offer={offer} onClose={() => setCheck(null)} />}
      {opening && <OpenDialog v={opening} author={author || 'anonyme'} offer={offer} onClose={() => setOpening(null)} />}
      {edit && <VaultSheet id={edit.id} draft={edit} offer={offer} onClose={() => setEdit(null)} />}
    </div>
  );
}

// The four controls of the check; "Tout est en ordre" writes the line with the four ticks at once
function CheckDialog({ v, author, nav, offer, onClose }: { v: Vault; author: string; nav: Nav; offer: Offer; onClose(): void }) {
  const { update } = useStore();
  const [ticks, setTicks] = useState<boolean[]>(VAULT_CHECKS.map(() => false)), [note, setNote] = useState('');
  const save = (all: boolean, action = false) => {
    const line = newVaultLog(v.id, 'check', author, nowLocal(), { ticks: all ? VAULT_CHECKS.map(() => true) : ticks, ...(note.trim() ? { note: note.trim() } : {}) });
    update(d => { d.vlogs[line.id] = line; });
    offer(`Vérification inscrite : ${v.name || 'enveloppe'}`, () => update(d => { delete d.vlogs[line.id]; }));
    onClose();
    if (action) nav.newAction({ constat: `Vérification de l'enveloppe « ${v.name} » : ${note.trim() || VAULT_CHECKS.filter((_, i) => !ticks[i]).join(', ').toLowerCase()}` });
  };
  const wrong = ticks.some(t => !t);
  return (
    <Modal onClose={onClose} title={`Vérifier : ${v.name || 'enveloppe'}`} subtitle="Quatre contrôles, à faire avec l'enveloppe devant soi. La ligne est écrite une fois."
      footer={<>
        <Button onClick={onClose}>Annuler</Button>
        {wrong && (note.trim() || ticks.some(Boolean)) && <Button onClick={() => save(false, true)}>Inscrire et ouvrir une action</Button>}
        {(note.trim() || ticks.some(Boolean)) && <Button onClick={() => save(false)}>Inscrire avec ces cases</Button>}
        <Button kind="primary" onClick={() => save(true)}>Tout est en ordre</Button>
      </>}>
      <div className="space-y-3">
        <ul className="space-y-1">
          {VAULT_CHECKS.map((c, i) => (
            <li key={c}><label className={`flex items-center gap-2.5 text-xs text-slate-800 ${TOUCH}`}><input type="checkbox" className="h-5 w-5 shrink-0 accent-delacour-primary" checked={ticks[i]} onChange={e => setTicks(ticks.map((t, j) => (j === i ? e.target.checked : t)))} />{c}</label></li>
          ))}
        </ul>
        <Field label="Ce qui a été trouvé (facultatif)"><textarea className={`${FIELD} min-h-[72px]`} value={note} onChange={e => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

// An opening: who was away, why, who opened it and who gave the second visa (two different people), what was used
function OpenDialog({ v, author, offer, onClose }: { v: Vault; author: string; offer: Offer; onClose(): void }) {
  const { update } = useStore();
  const [x, setX] = useState({ absent: '', reason: '', openedBy: v.visa[0] || '', visaBy: v.visa[1] || '', note: '' });
  const set = (p: Partial<typeof x>) => setX(c => ({ ...c, ...p }));
  const same = !!x.openedBy.trim() && x.openedBy.trim().toLowerCase() === x.visaBy.trim().toLowerCase();
  const ready = !!x.openedBy.trim() && !!x.visaBy.trim() && !same;
  const save = () => {
    const line = newVaultLog(v.id, 'open', author, nowLocal(), { absent: x.absent.trim(), reason: x.reason.trim(), openedBy: x.openedBy.trim(), visaBy: x.visaBy.trim(), ...(x.note.trim() ? { note: x.note.trim() } : {}) });
    update(d => { d.vlogs[line.id] = line; });
    offer(`Ouverture inscrite : ${v.name || 'enveloppe'}`, () => update(d => { delete d.vlogs[line.id]; }));
    onClose();
  };
  return (
    <Modal wide onClose={onClose} title={`Enveloppe ouverte : ${v.name || 'enveloppe'}`} subtitle="Une enveloppe s'ouvre sous double visa. Une fois ouverte, elle est à remettre sous pli et ses codes sont à changer : l'outil le garde en vue."
      footer={<><Button onClick={onClose}>Annuler</Button><Button kind="primary" disabled={!ready} onClick={save}>Inscrire l'ouverture</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <PersonField label="Personne absente" value={x.absent} onCommit={n => set({ absent: n })} />
        <Field label="Motif"><input className={FIELD} value={x.reason} onChange={e => set({ reason: e.target.value })} /></Field>
        <PersonField label="Ouverte par" value={x.openedBy} onCommit={n => set({ openedBy: n })} />
        <PersonField label="Second visa de" value={x.visaBy} onCommit={n => set({ visaBy: n })} />
        <div className="sm:col-span-2"><Field label="Ce qui a été utilisé"><textarea className={`${FIELD} min-h-[72px]`} value={x.note} onChange={e => set({ note: e.target.value })} /></Field></div>
        {same && <p role="alert" className="text-xs font-semibold text-red-700 sm:col-span-2">Les deux visas sont la même personne : il en faut deux.</p>}
      </div>
    </Modal>
  );
}

// The description of an envelope, written as it is typed (a new one exists as soon as it has a name)
function VaultSheet({ id, draft, offer, onClose }: { id: string; draft: Vault; offer: Offer; onClose(): void }) {
  const { state, update, teamView } = useStore();
  const copy = useRef(draft), [, tick] = useState(0), [text, setText] = useState(draft.contents.join('\n'));
  if (!state) return null;
  const stored = state.vaults[id], v = stored ?? copy.current, isNew = !stored, today = isoDate(new Date());
  const change = (f: (x: Vault) => Vault) => { update(d => { const next = f(d.vaults[id] ?? copy.current); copy.current = next; if (d.vaults[id] || next.name.trim()) d.vaults[id] = next; }); tick(n => n + 1); };
  const set = (x: Partial<Vault>) => change(c => ({ ...c, ...x }));
  const hasLogs = vaultLogs(state, id).length > 0, full = powerCfg(state.params).vaultFull;
  return (
    <Modal wide onClose={onClose} title={v.name.trim() || (full ? 'Nouvelle enveloppe' : 'Nouvel accès')} subtitle={v.archivedAt ? `archivé le ${frDate(v.archivedAt)}` : 'Aucun mot de passe ici : seulement où c\'est rangé et ce que c\'est.'}
      footer={<>
        {!isNew && (
          <details className="mr-auto max-sm:order-last max-sm:w-full">
            <summary className={`flex cursor-pointer list-none items-center text-xs font-semibold text-delacour-primary hover:underline ${TOUCH}`}>Autres actions</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {v.archivedAt ? <Button onClick={() => set({ archivedAt: undefined })}>Restaurer</Button> : <Button onClick={() => { set({ archivedAt: today }); offer(`Accès archivé : ${v.name}`, () => set({ archivedAt: undefined })); onClose(); }}>Archiver</Button>}
              {!hasLogs && (!teamView) && <Button kind="danger" onClick={() => { const was = v; update(d => { delete d.vaults[id]; }); offer(`Accès retiré : ${was.name}`, () => update(d => { d.vaults[id] = was; })); onClose(); }}>Supprimer</Button>}
              {hasLogs && <span className="max-w-xs text-xs text-slate-600">Elle a un journal : archivée, elle le garde.</span>}
            </div>
          </details>
        )}
        <Button kind="primary" onClick={onClose}>Fermer</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom" hint={isNew ? "L'accès est enregistré dès que son nom est écrit." : undefined}><input className={FIELD} value={v.name} onChange={e => set({ name: e.target.value })} autoFocus={isNew} /></Field>
          {full && <Field label="Mise sous pli le"><input type="date" className={FIELD} value={v.sealedAt || ''} max={today} onChange={e => set({ sealedAt: e.target.value || undefined })} /></Field>}
          <div className="sm:col-span-2"><Field label="Où c'est rangé"><input className={FIELD} value={v.location} onChange={e => set({ location: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Ce que c'est, un point par ligne" hint="Par exemple « Accès à la banque » : le titre, pas le secret."><textarea className={`${FIELD} min-h-[96px]`} value={text} onChange={e => { setText(e.target.value); set({ contents: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) }); }} /></Field></div>
          <PersonField label={full ? 'Premier visa' : 'Personne qui peut y accéder'} value={v.visa[0]} onCommit={n => change(c => ({ ...c, visa: [n, c.visa[1]] }))} />
          <PersonField label={full ? 'Second visa' : 'Une deuxième personne (facultatif)'} value={v.visa[1]} check={n => (n && n.trim().toLowerCase() === v.visa[0].trim().toLowerCase() ? `${n} est déjà le premier visa.` : '')} onCommit={n => change(c => ({ ...c, visa: [c.visa[0], n] }))} />
          {full && <PersonField label="Qui détient la clé du coffre" value={v.keyHolder || ''} onCommit={n => set({ keyHolder: n || undefined })} />}
        </div>
      </div>
    </Modal>
  );
}
