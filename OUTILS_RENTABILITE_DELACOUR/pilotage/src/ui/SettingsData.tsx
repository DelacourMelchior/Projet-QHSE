// Réglages, tab "Données": shared folder, backups, records from another device, journal, data of the old versions, example.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FolderSync, Upload } from 'lucide-react';
import type { State } from '../domain/types';
import { demoState } from '../domain/templates';
import { legacyToolRecords } from '../domain/legacyTools';
import { copies, copyFile, copyText, legacyLocalTools, LOCAL_KEY, pref, stateOfFile, storagePct } from '../store/local';
import { useStore } from '../store/StoreContext';
import { toolDef, type ToolId } from './tools';
import { applyFile, flatten, mergeFile, type FlatMap } from '../store/flat';
import { LOCAL_LIMIT } from '../store/local';
import { frStamp, nowLocal } from '../domain/base';
import { lostText } from '../domain/signedLoss';
import { Button, Field, inputCls, Modal } from './common';
import { BATCH, backupFile, batches, planPhotos, unpackPhotos, type Held } from '../photo/backup';
import { downloadFile } from './download';
import { plainName } from '../domain/cartography';

const H = ({ children }: { children: string }) => <h3 className="text-xs font-bold text-slate-900">{children}</h3>;

// Room used on this computer: the data kept by the browser (about 5 million characters, what makes the application stop saving) and the room of the photos
const mo = (n: number) => (n / 1048576 >= 10 ? Math.round(n / 1048576) : Math.round(n / 104857.6) / 10).toLocaleString('fr-FR');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const bar = (pct: number) => `h-full rounded-full ${pct >= 80 ? 'bg-red-600' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-600'}`;

// The data that a restoration replaces are kept in this browser, apart, and put back by "Reprendre" in the list below (the copies of unreadable data work the same way, and use the same room)
const BEFORE = `${LOCAL_KEY}.before-restore-`;
export interface Before { key: string; on: string; chars: number }   // on: "07/10 à 15 h 40"
export const beforeCopies = (): Before[] => {
  try {
    const out: Before[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), m = k?.startsWith(BEFORE) ? k.slice(BEFORE.length).match(/^\d{4}-(\d{2})-(\d{2})-(\d{2})(\d{2})/) : null;
      if (k && m) out.push({ key: k, on: `${m[2]}/${m[1]} à ${+m[3]} h ${m[4]}`, chars: localStorage.getItem(k)?.length ?? 0 });
    }
    return out.sort((a, b) => (a.key < b.key ? 1 : -1));
  } catch { return []; }
};
// True when the copy is written and reads back; false when the browser has no room, or when the copy would take the browser past 80 % of what it leaves: nothing is left half written
export const keepBeforeRestore = (s: State, used: number, now = new Date()): boolean => {
  const p = (n: number) => String(n).padStart(2, '0'), key = `${BEFORE}${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  try {
    const t = JSON.stringify(s);
    if (used + t.length > LOCAL_LIMIT * 0.8) return false;
    localStorage.setItem(key, t);
    if (localStorage.getItem(key) === t) return true;
    localStorage.removeItem(key);
  } catch { /* refused: the browser is full */ }
  return false;
};
export const dropBefore = (key: string) => { if (key.startsWith(BEFORE)) try { localStorage.removeItem(key); } catch { /* nothing to remove */ } };

// What a file of another device brings, as facts: the orders merged and added, the other records added, the equipment and the parts completed, the records not taken
export function mergeSummary(mine: FlatMap, theirs: FlatMap, r: { put: FlatMap; added: number; merged: number; kept: number }) {
  const orders = Object.keys(theirs).filter(k => k.startsWith('delivery|') && k in r.put), oAdded = orders.filter(k => !(k in mine)).length, oMerged = orders.length - oAdded;
  const text = [
    ...(orders.length ? [`${plural(oMerged, 'commande fusionnée', 'commandes fusionnées')}, ${plural(oAdded, 'ajoutée', 'ajoutées')}`] : []),
    ...(r.added - oAdded > 0 ? [plural(r.added - oAdded, 'autre fiche ajoutée', 'autres fiches ajoutées')] : []),
    ...(r.merged - oMerged > 0 ? [plural(r.merged - oMerged, 'équipement ou pièce complété', 'équipements ou pièces complétés')] : []),
  ].join(' ; ');
  const left = r.kept ? `${plural(r.kept, 'fiche non reprise', 'fiches non reprises')} car déjà ${r.kept > 1 ? 'présentes et différentes' : 'présente et différente'}` : '';
  return { text, left, count: r.added + r.merged };
}

function Room({ onTake, again }: { onTake(key: string): void; again: number }) {   // again: changes when a restoration has just kept or taken a copy
  const { storageChars, unreadable, dropCopy } = useStore();
  const kept = useMemo(() => copies(), [storageChars, unreadable]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [tick, setTick] = useState(0);
  const before = useMemo(() => beforeCopies(), [storageChars, unreadable, tick, again]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [r, setR] = useState<{ used: number; quota: number; kept: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const e = await navigator.storage.estimate(), kept = (await navigator.storage.persisted?.()) ?? false;
        if (live) setR({ used: e.usage || 0, quota: e.quota || 0, kept });
      } catch { /* not available: nothing to show */ }
    })();
    return () => { live = false; };
  }, []);
  const total = storageChars + before.reduce((n, c) => n + c.chars, 0), chars = storagePct(total);   // the copies of the data before a restoration use the same room
  const pct = r?.quota ? Math.min(100, Math.round(r.used / r.quota * 100)) : 0;
  return (
    <section className="space-y-1.5">
      <H>Espace sur cet ordinateur</H>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${chars} % de l'espace des données du navigateur utilisé`}><div className={bar(chars)} style={{ width: `${Math.max(chars, 1)}%` }} /></div>
      <p className={`text-[11px] ${chars >= 80 ? 'font-semibold text-red-700' : 'text-slate-600'}`}>Données de l'application : {total.toLocaleString('fr-FR')} caractères sur {LOCAL_LIMIT.toLocaleString('fr-FR')} que le navigateur laisse aux données ({chars} %){chars >= 80 ? ' : le navigateur va refuser d\'enregistrer' : ''}.</p>
      {before.map(c => (
        <div key={c.key} className="space-y-1">
          <p className="text-xs text-slate-700">Données d'avant la restauration du {c.on} ({c.chars.toLocaleString('fr-FR')} caractères, comptés ci-dessus).</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { try { downloadFile(`${c.key}.json`, copyFile(localStorage.getItem(c.key) || ''), 'application/json'); } catch { /* unreadable */ } }}>Télécharger</Button>
            <Button onClick={() => onTake(c.key)}>Reprendre</Button>
            <Button kind="danger" onClick={() => { if (window.confirm(`Supprimer les données d'avant la restauration du ${c.on} ? Elles ne pourront plus être retrouvées.`)) { dropBefore(c.key); setTick(t => t + 1); } }}>Supprimer</Button>
          </div>
        </div>
      ))}
      {kept.map(c => (
        <p key={c.key} className="text-[11px] text-slate-700">Copie de données illisibles du {c.on} ({c.chars.toLocaleString('fr-FR')} caractères, comptés ci-dessus) :{' '}
          <button type="button" className="font-semibold underline" onClick={() => downloadFile(`${c.key}.json`, copyText(c.key) || '', 'application/json')}>Télécharger</button>{' · '}
          <button type="button" className="font-semibold text-red-700 underline" onClick={() => { if (window.confirm(`Supprimer la copie de données illisibles du ${c.on} ? Elle ne pourra plus être retrouvée.`)) dropCopy(c.key); }}>Supprimer</button>
        </p>
      ))}
      {r?.quota ? (<>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${pct} % de l'espace du navigateur utilisé`}><div className={bar(pct)} style={{ width: `${Math.max(pct, 1)}%` }} /></div>
        <p className="text-[11px] text-slate-600">Photos comprises : {mo(r.used)} Mo utilisés sur {mo(r.quota)} Mo disponibles pour ce navigateur{r.kept ? ' · espace protégé : le navigateur ne le vide pas de lui-même' : ' · le navigateur peut vider cet espace si le disque manque : garder une sauvegarde'}.</p>
      </>) : null}
    </section>
  );
}

interface Confirm { title: string; lines: string[]; yes: string; danger?: boolean; run(): void | Promise<void> }

export function SettingsData({ onClose }: { onClose(): void }) {
  const { state, update, replace, folder, author, setAuthor, connectFolder, reconnectFolder, disconnectFolder, refresh, storageChars } = useStore();
  const [msg, setMsg] = useState('');
  const [ask, setAsk] = useState<{ text: string; held: number; files: number } | null>(null);   // a backup that cannot be made as it is: what happened, and what can be done
  const [again, setAgain] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null);   // the question asked before the data are replaced: what goes (the signed PV, counted), then Annuler or the replacement
  const latest = useRef(state);
  latest.current = state;   // the question stays open while the data may change (another tab): the copy that is kept is the data as they are when it is answered
  // data of the old versions still on this computer: unreadable data must not stop the settings from opening
  const legacy = useMemo(() => { try { return legacyToolRecords(legacyLocalTools(), state!); } catch { return { counts: {}, apply: () => undefined }; } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const legacyTotal = Object.values(legacy.counts).reduce((a, b) => a + b, 0);
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  if (!state) return null;

  // One file, as always. When the pictures are too many for one file (the browser stops a text at ~540 million characters, and could not read such a file back),
  // the backup is asked: several files, or without the pictures. Whatever fails is said, with how many files were given.
  const exportJson = async (mode: 'auto' | 'split' | 'none' = 'auto') => {
    setAsk(null);
    setMsg('Préparation de la sauvegarde (photos comprises)…');
    let held: Held[] = [], refs = 0, parts: Held[][] = [], given = 0;
    try {
      ({ held, refs } = await planPhotos(state));   // the data hold references: the pictures travel next to them
      parts = mode === 'none' ? [] : batches(held);
      const bytes = held.reduce((a, h) => a + h.size, 0);
      if (mode === 'auto' && parts.length > 1) {
        setMsg('');
        return setAsk({ held: held.length, files: parts.length, text: `Photos de cet ordinateur : ${held.length} (${mo(bytes)} Mo). Un seul fichier de sauvegarde n'en porte pas plus d'environ ${mo(BATCH)} Mo : au-delà, le navigateur ne sait plus ni l'écrire ni le relire.` });
      }
      const n = Math.max(parts.length, 1), day = new Date().toISOString().slice(0, 10), company = (state.settings.companyName || 'entreprise').replace(/[^a-z0-9]+/gi, '-');
      for (let i = 0; i < n; i++) {
        downloadFile(`pilotage-${company}-${day}${i ? `-photos-${i + 1}` : ''}.json`, await backupFile(state, parts, i), 'application/json');
        given++;
        if (i < n - 1) await new Promise(r => setTimeout(r, 600));   // one download after the other
      }
      pref.set('lastBackup', new Date().toISOString());
      const lost = refs - held.length;
      setMsg(mode === 'none' ? `Sauvegarde exportée sans les photos. Photos non comprises dans le fichier : ${held.length} (${mo(bytes)} Mo), seulement sur cet ordinateur.`
        : `Sauvegarde exportée${n > 1 ? ` en ${n} fichiers` : ''}${refs ? ` avec ${held.length} photo${held.length > 1 ? 's' : ''} sur ${refs}` : ''}${lost ? ` (${plural(lost, 'photo absente', 'photos absentes')} de cet ordinateur)` : ''}.${n > 1 ? " Le premier fichier porte les données, chacun des autres des photos ; le navigateur peut demander d'autoriser plusieurs téléchargements." : ''}`);
    } catch (e) {
      const why = e instanceof RangeError ? 'trop de données pour le navigateur' : (e as Error)?.message || 'erreur inconnue';
      setMsg('');
      setAsk({ held: mode === 'none' ? 0 : held.length, files: parts.length, text: `La sauvegarde n'a pas pu être terminée (${why}) : ${given ? `${given} sur ${Math.max(parts.length, 1)} fichiers téléchargés` : 'aucun fichier téléchargé'}.` });
    }
  };

  const lastBackup = () => { const t = pref.get('lastBackup'), d = t ? new Date(t) : null; return d && !Number.isNaN(d.getTime()) ? `Dernière sauvegarde exportée depuis ce poste : le ${frStamp(nowLocal(d))}.` : 'Aucune sauvegarde exportée depuis ce poste.'; };

  // A restoration replaces everything: the data as they are then are kept in this browser first (S-18), and when there is no room for that, the question comes again, saying so.
  const restore = async (next: State, photos: unknown, done: string) => {
    const was = latest.current;
    const put = async (said: string) => { await unpackPhotos(photos); replace(next); setAgain(n => n + 1); setMsg(said); };
    if (!was || keepBeforeRestore(was, storageChars + beforeCopies().reduce((n, c) => n + c.chars, 0))) return put(`${done} Les données remplacées sont gardées dans ce navigateur : « Reprendre » dans « Espace sur cet ordinateur » les remet.`);
    setConfirm({ title: 'Pas de place pour garder les données actuelles', yes: 'Restaurer sans copie', danger: true, run: () => put(done),
      lines: ["Le navigateur n'a pas la place de garder une copie des données actuelles avant de les remplacer.", lostText(was, next), lastBackup()] });
  };

  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j?.app === 'delacour-pilotage' && !j.state && j.photos) return setMsg(`Photos remises dans ce navigateur : ${await unpackPhotos(j.photos)}${j.part ? ` (fichier ${j.part} sur ${j.of})` : ''}.`);   // a file of a backup made in several files holding only pictures
      const next = stateOfFile(j);   // a backup, or the copy of data that could not be read
      if (!next) return setMsg("Ce fichier n'est pas une sauvegarde du tableau de pilotage.");
      setConfirm({
        title: 'Restaurer cette sauvegarde', yes: 'Restaurer', danger: true,
        lines: ['Le fichier remplace les données actuelles.', lostText(state, next, true), lastBackup(), 'Les données actuelles sont gardées dans ce navigateur : « Reprendre » dans « Espace sur cet ordinateur » les remet.'],
        run: () => restore(next, j.photos, `Sauvegarde restaurée.${j.of > 1 ? ` Fichier ${j.part} sur ${j.of} : les photos des autres fichiers ne sont pas remises.` : ''}`),
      });
    } catch { setMsg('Fichier illisible.'); }
  };
  // The data kept before an earlier restoration, put back (the data replaced by that are kept in their turn)
  const take = (key: string) => {
    try {
      const next = stateOfFile(JSON.parse(localStorage.getItem(key) || 'null'));
      if (!next) return setMsg("Cette copie des données d'avant n'est pas lisible.");
      setConfirm({
        title: "Reprendre les données d'avant la restauration", yes: 'Reprendre', danger: true,
        lines: ['Ces données remplacent les données actuelles.', lostText(state, next, true), lastBackup(), 'Les données actuelles sont gardées dans ce navigateur à leur tour.'],
        run: () => restore(next, undefined, "Données d'avant la restauration reprises."),
      });
    } catch { setMsg("Cette copie des données d'avant n'est pas lisible."); }
  };

  // Records of another device added to this one: new records are added; an order, an equipment or a part present on both sides gets what both sides hold (nothing is lost);
  // any other record present on both sides and different stays as it is here (nothing says which one is the latest), and the message says how many
  const mergeJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'delacour-pilotage' || !j.state) return setMsg("Ce fichier n'est pas une sauvegarde des outils.");
      const mine = flatten(state), theirs = flatten(j.state as State), first = mergeSummary(mine, theirs, mergeFile(mine, theirs));   // for the question only: the merge itself is made on the current data
      if (!first.count) return setMsg(first.left ? `Rien de repris : ${first.left}.` : 'Rien de nouveau dans ce fichier.');
      if (!window.confirm(`Fusionner ce fichier ? ${first.text}.${first.left ? `\n\n${first.left}.` : ''}`)) return;
      await unpackPhotos(j.photos);
      await new Promise(r => setTimeout(r, 100));   // the question froze the page: let what another tab wrote meanwhile be delivered (and taken) before the merge
      let done = first;
      update(d => { const now = flatten(d); done = mergeSummary(now, theirs, applyFile(d, theirs)); });   // computed on the data as they are now: what was written elsewhere while the question was open stays
      setMsg(done.count ? `Fusion faite : ${done.text}${done.left ? ` ; ${done.left}` : ''}.` : `Rien de repris${done.left ? ` : ${done.left}` : ''}.`);
    } catch { setMsg('Fichier illisible.'); }
  };

  const folderText = {
    unsupported: "Ce navigateur ne peut pas écrire dans un dossier. Ouvrez l'application dans Microsoft Edge ou Google Chrome pour partager les données.",
    local: "Les données sont enregistrées dans ce navigateur uniquement.",
    'needs-permission': `Dossier « ${folder.name || 'données'} » : le navigateur redemande l'accès à chaque session.`,
    connected: `Connecté à « ${folder.name} » · ${plural(folder.contributors.length, 'contributeur')}${folder.hasDirection ? '' : ' · sans accès au dossier direction : montants masqués'}.`,
    error: folder.error,
  }[folder.status];

  return (
    <div className="space-y-6">
      {msg && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{msg}</p>}

      <section className="space-y-2">
        <H>Partage des données (OneDrive, SharePoint…)</H>
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

      <Room onTake={take} again={again} />

      <section className="space-y-2">
        <H>Sauvegarde</H>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportJson()}><Download size={14} />Exporter une sauvegarde (.json)</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={14} />Restaurer une sauvegarde</Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>
        {ask && (
          <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-950">
            <p className="font-semibold">{ask.text}</p>
            {ask.held > 0 && (<>
              <div className="flex flex-wrap gap-2">
                {ask.files > 1 && <Button onClick={() => exportJson('split')}>Sauvegarder en {ask.files} fichiers</Button>}
                <Button onClick={() => exportJson('none')}>Sauvegarder sans les photos</Button>
              </div>
              <p>Sans les photos, le fichier garde toutes les données mais aucune des {ask.held} photos : elles restent seulement dans ce navigateur.{ask.files > 1 ? ` En ${ask.files} fichiers, le premier porte les données, chacun des autres des photos ; le navigateur peut demander d'autoriser plusieurs téléchargements.` : ''}</p>
            </>)}
          </div>
        )}
        <p className="text-[11px] text-slate-500">Les sauvegardes de l'ancienne version de l'outil sont acceptées.</p>
      </section>

      <section className="space-y-2">
        <H>Saisies faites sur un téléphone ou un autre poste</H>
        <p className="text-xs text-slate-600">Sur un téléphone, les saisies restent sur l'appareil : exportez-les (Sauvegarde ci-dessus), déposez le fichier dans OneDrive, puis fusionnez-le ici depuis un poste connecté au dossier partagé. Les fiches nouvelles s'ajoutent. Pour une commande présente des deux côtés, les jalons, les réserves, les lots et les lignes du journal des deux côtés se réunissent, et la première signature est gardée. Pour un équipement ou une pièce déjà présents ici, les routines, signalements, pannes et mouvements de stock du fichier s'ajoutent à ceux d'ici. Toute autre fiche présente ici et différente dans le fichier reste telle qu'elle est ici : le message de fin dit combien. Rien n'est effacé.</p>
        <Button onClick={() => mergeRef.current?.click()}><Upload size={14} />Fusionner un fichier de saisies</Button>
        <input ref={mergeRef} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) mergeJson(f); e.target.value = ''; }} />
      </section>

      <section className="space-y-2">
        <H>Journal des modifications</H>
        <p className="text-[11px] text-slate-600">Qui a créé, modifié ou supprimé quoi (400 dernières opérations).</p>
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 text-[11px]">
          {Object.values(state.logs || {}).sort((a, b) => (a.at < b.at ? 1 : -1)).map(l => (
            <li key={l.id} className="flex gap-2 px-2 py-1"><span className="w-32 shrink-0 font-mono text-slate-500">{frStamp(`${l.at.slice(0, 10)}T${new Date(l.at).toTimeString().slice(0, 5)}`)}</span><span className="w-24 shrink-0 font-semibold text-slate-800">{l.by}</span><span className="min-w-0 flex-1 truncate text-slate-700">{l.what} · {KIND_NAMES[l.kind] || l.kind} {recordName(state, l.kind, l.ref)}</span></li>
          ))}
          {!Object.keys(state.logs || {}).length && <li className="px-2 py-2 text-slate-500">Aucune modification enregistrée.</li>}
        </ul>
      </section>

      {legacyTotal > 0 && (
        <section className="space-y-2">
          <H>Ancienne version des outils 2 à 5</H>
          <p className="text-[11px] text-slate-600">Données trouvées sur ce poste : {Object.entries(legacy.counts).filter(([, n]) => n).map(([id, n]) => `${toolDef(id as ToolId).label} (${n})`).join(', ')}. Elles s'ajoutent aux données actuelles ; rien n'est effacé.</p>
          <Button onClick={() => { if (window.confirm(`Reprendre ${plural(legacyTotal, 'élément')} de l'ancienne version ?`)) { let kept: string | undefined = ''; update(d => { kept = legacy.apply(d); }); setMsg(`Données de l'ancienne version reprises : vérifiez-les outil par outil.${kept ? ` ${kept}` : ''}`); } }}>Reprendre ces données</Button>
        </section>
      )}

      <section className="space-y-2">
        <H>Exemple et remise à zéro</H>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { const demo = demoState(); setConfirm({ title: "Charger l'exemple de démonstration", yes: "Charger l'exemple", danger: true, lines: ["L'exemple fictif remplace les données actuelles.", lostText(state, demo), lastBackup()], run: () => { replace(demo); onClose(); } }); }}>Charger l'exemple de démonstration</Button>
          <Button kind="danger" onClick={() => {
            const old = copies().length, kept = beforeCopies().length;
            setConfirm({
              title: 'Repartir de zéro', yes: 'Tout effacer', danger: true,
              lines: [`Les données de ce poste sont effacées${old ? `, ainsi que ${plural(old, 'copie de données illisibles', 'copies de données illisibles')}` : ''}${kept ? `, ainsi que ${plural(kept, "copie des données d'avant une restauration", "copies des données d'avant une restauration")}` : ''}.`, lostText(state, null), lastBackup()],
              run: () => { beforeCopies().forEach(c => dropBefore(c.key)); replace(null); onClose(); },
            });
          }}>Repartir de zéro</Button>
        </div>
      </section>

      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)} footer={<>
          <Button onClick={() => setConfirm(null)}>Annuler</Button>
          <Button kind={confirm.danger ? 'danger' : 'primary'} onClick={() => { const c = confirm; setConfirm(null); void Promise.resolve(c.run()).catch(() => setMsg('Fichier illisible.')); }}>{confirm.yes}</Button>
        </>}>
          <div className="space-y-2 text-sm text-slate-800">{confirm.lines.map(l => <p key={l}>{l}</p>)}</div>
        </Modal>
      )}
    </div>
  );
}

const KIND_NAMES: Record<string, string> = {
  action: 'action', risk: 'risque', contact: 'contact', quote: 'devis', complaint: 'réclamation', feedback: 'bilan', supplier: 'fournisseur',
  debit: 'fiche de débit', sector: 'secteur', sop: 'instruction', equipment: 'équipement', spare: 'pièce de survie', delivery: 'réception', power: 'fonction', practice: 'pratique de suppléant', cover: 'absence couverte', vault: 'enveloppe des accès', person: 'personne', skill: 'compétence',
  newcomer: 'arrivant', chrono: 'test 30 s', nc: 'fiche bac rouge', analysis: 'atelier 5P', poka: 'détrompeur', kpi: 'indicateur', process: 'processus', flow: 'logigramme',
};
function recordName(s: State, kind: string, id: string): string {
  const col: Record<string, Record<string, unknown> | undefined> = { action: s.actions, risk: s.risks, contact: s.contacts, quote: s.quotes, complaint: s.complaints, feedback: s.feedbacks, supplier: s.suppliers, debit: s.debits, sector: s.sectors, sop: s.sops, equipment: s.equipments, spare: s.spares, delivery: s.deliveries, power: s.powers, practice: s.practices, cover: s.covers, vault: s.vaults, person: s.people, skill: s.skills, newcomer: s.newcomers, nc: s.ncs, analysis: s.analyses, poka: s.pokas, kpi: s.kpis, flow: s.flows, process: Object.fromEntries((s.processes || []).map(p => [p.id, p])) };
  const x = col[kind]?.[id] as Record<string, string> | undefined;
  return x ? (kind === 'process' ? plainName(x.name || '') : x.ref || x.title || x.name || x.power || x.client || x.poste || x.defect || x.who || '') : '(supprimé)';
}
