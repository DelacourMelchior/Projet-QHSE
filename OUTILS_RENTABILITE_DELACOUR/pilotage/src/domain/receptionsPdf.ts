// The acceptance report (PV) of tool 3.4 on paper: milestones with their values, who and when, check before departure, release (derogation and signature included), the
// reservations (text, place, gravity, deadline, lift and its signature), the motive and what follows a refusal, the number of the delivery, the quantity, the place, the number of the
// PV, the date AND the hour of both signatures, the mention when the customer did not sign. The clause of retention is a mention of the contract, only when the company has ticked
// it and the reception is "avec réserve". No amount, nothing about invoicing, no note meant for the company (the notes of the screen stay on the screen). The file has no picture: it
// counts the photos that stay in the application. The texts that the screen (RcPv.tsx) says too are exported from here, so that the screen, the paper and the file read the same.
// Nothing is said that the tool does not know: no legal word, the names are "typed, not verified", the hours are those of the device, the seal is a fact.
// Pure: the same data gives the same file (PDF 1.4, ASCII only, see pdf.ts).
import type { Delivery, Milestone, Params, Presentation, Reception, ReceptionReserve, Strokes } from './types';
import { COLORS, DocWriter } from './docPdf';
import type { Rgb } from './pdf';
import { DEFAULT_PARAMS, nb, nowLocal } from './base';
import { frDate } from './periods';
import {
  OTHER, de, derogationFacts, isLocked, lotsOf, milestoneStatus, noSignWords, outOfBounds, plural, receptionCfg, receptionsOf, releasedAfterDelivery, remainingQty, reserveDue, reservesOf, reserveWords, sealState, shortSeal, type MilestoneStatus,
} from './receptions';

const fr = (n: number) => n.toLocaleString('fr-FR');
const COMPANY_SIGNED = "PV signé pour l'entreprise";   // the line the journal gets when the company signs (receptions.ts)
// Notes for the company: the screen says them (a banner), the paper and the file never do
export const CLAUSE_NOTE = nb("Mention de clause recopiée des réglages de l'entreprise ; sa présence dans les conditions générales ou le devis du client n'est pas vérifiée par l'outil.");
export const UNLOCKED_NOTE = nb('PV non verrouillé : le contenu peut encore changer.');
export const LOCK_NOTE = nb("PV signé : contenu verrouillé dans l'application. Une correction passe par la fiche de la commande et laisse une ligne au journal et un nouveau scellé.");
export const CLOCK_NOTE = "Heures lues sur l'horloge de l'appareil, non certifiées";
export const SIGNER_NOTE = "Noms et fonctions saisis dans l'application, non vérifiés.";
export const SEAL_NOTE = nb("Empreinte du contenu de ce PV : un contenu différent donne une empreinte différente. Le scellé se vérifie dans l'application.");
// The same title of the box of the customer on the screen, on the paper and in the file
export const CLIENT_TITLE = 'Pour le client (personne qui réceptionne)';

// "2026-10-04T14:05" -> "04/10/2026 à 14 h 05" (the day alone when there is no hour; the hour is not cut at the end of a line); '' when empty
export function atFr(at?: string): string {
  if (!at) return '';
  const day = frDate(at.slice(0, 10));
  return at.length >= 16 ? `${day} à ${+at.slice(11, 13)}\u00a0h\u00a0${at.slice(14, 16)}` : day;
}
// "Édité le 07/10/2026 à 10 h 15": the date AND the hour of a copy, so that two copies of the same day tell apart
export const editedAt = (date: Date): string => `Édité le ${atFr(nowLocal(date))}`;

// The delivery of the order to print: the one under way, or a closed one (`no`, from `lots`) read as if it were the root of the order
const PRESENTATION: (keyof Presentation)[] = ['milestones', 'releasedBy', 'releasedAt', 'releasedMoment', 'releaseSign', 'derogation', 'shipChecks', 'reception', 'signCompany', 'signClient', 'pvPhoto', 'liftPhoto', 'liftSignedBy'];
export function deliveryAt(d: Delivery, no?: number): { d: Delivery; no: number; total: number } {
  const lots = lotsOf(d), total = lots.length + 1, lot = no ? lots.find(l => l.no === no) : undefined;
  if (!lot) return { d, no: total, total };
  const root = Object.fromEntries(Object.entries(d).filter(([k]) => !PRESENTATION.includes(k as keyof Presentation)));
  const own = Object.fromEntries(PRESENTATION.filter(k => lot[k] !== undefined).map(k => [k, lot[k]]));
  return { d: { ...root, ...own, lots: lots.filter(l => l.no < lot.no) } as Delivery, no: lot.no, total };
}

// ---- the sentences of the report
export const MS_LABEL: Record<MilestoneStatus, string> = { todo: 'À contrôler', ok: 'Conforme', reworked: 'Conforme après reprise', ko: 'Non conforme', na: 'Sans objet' };
export const msLabel = (m: Milestone) => `${MS_LABEL[milestoneStatus(m)]}${milestoneStatus(m) === 'ko' && m.waivedBy ? ', dérogation' : ''}`;
// "1 245,2 mm": the unit of the milestone is added when the value does not say it
export const valueText = (m: Milestone) => { const v = m.measured.trim(); return v && m.unit && !v.includes(m.unit) ? `${v} ${m.unit}` : v; };
// "entre 5,5 et 7 bar", "au plus 90 °C" (the same words as the follow-up sheet)
const num = (n: number) => String(n).replace('.', ',');
export function boundsWords(min?: number | null, max?: number | null, unit?: string): string {
  const u = unit ? ` ${unit}` : '';
  return min != null && max != null ? `entre ${num(min)} et ${num(max)}${u}` : max != null ? `au plus ${num(max)}${u}` : min != null ? `au moins ${num(min)}${u}` : '';
}
// The check of a milestone as it was made: the requirement, the bounds and the instrument written in the event at that moment (a later edit of the definition does not change them).
// The requirement of the check is told only when the definition is not the same any more (otherwise it repeats the line of the milestone, which already says it); the bounds and
// the instrument of the check are told whenever the event kept them, then, when the definition has changed, the definition now. Nothing for an old event that kept no copy of them.
// `inst`: name of an instrument from its id.
export function controlFacts(m: Milestone, inst?: (id: string) => string): string[] {
  const e = m.history && [...m.history].reverse().find(x => x.kind === 'check' || x.kind === 'rework');
  if (!e) return [];
  const kept = e.requirement !== undefined || e.min !== undefined || e.max !== undefined, id = e.instrumentId ?? m.instrumentId;
  const changed = (e.requirement !== undefined && e.requirement !== m.requirement) || (e.min !== undefined && (e.min ?? null) !== (m.min ?? null)) || (e.max !== undefined && (e.max ?? null) !== (m.max ?? null));
  const parts = [changed && kept && e.requirement ? `exigence « ${e.requirement} »` : '', kept && boundsWords(e.min, e.max, m.unit) ? `plage attendue : ${boundsWords(e.min, e.max, m.unit)}` : '', id && inst ? `instrument : ${inst(id)}` : ''].filter(Boolean);
  return [
    parts.length ? `Au contrôle du ${atFr(e.at)} : ${parts.join(' ; ')}` : '',
    changed ? `Définition actuelle du jalon différente : exigence « ${m.requirement} »${boundsWords(m.min, m.max, m.unit) ? ` ; plage attendue : ${boundsWords(m.min, m.max, m.unit)}` : ''}` : '',
  ].filter(Boolean).map(nb);
}
// What happened at a milestone, as facts (the status itself is in `msLabel`)
export function milestoneFacts(m: Milestone, inst?: (id: string) => string): string[] {
  const failed = m.history?.find(e => e.ok === false), st = milestoneStatus(m);
  return [
    st === 'na' && m.naReason ? `Sans objet : ${m.naReason}` : '',
    st === 'reworked' && failed ? `Non conforme le ${atFr(failed.at)}, conforme après reprise le ${atFr(m.at || m.date)}` : '',
    st === 'ko' && outOfBounds(m) ? 'Valeur hors de la plage attendue' : '',
    m.waivedBy ? `Dérogation ${de(m.waivedBy)} le ${atFr(m.waivedAt)} : ${m.waivedWhy || '—'}` : '',
    m.second ? `Contrôle confirmé par un second : ${m.second}` : '',
    ...controlFacts(m, inst),
  ].filter(Boolean).map(nb);
}
// The checks before departure, only once one of them was made
export const shipChecksDone = (d: Delivery) => (d.shipChecks?.some(c => c.ok != null || c.na) ? d.shipChecks : []);
export const shipLabel = (c: NonNullable<Delivery['shipChecks']>[number]) => (c.na ? 'Sans objet' : c.ok === true ? 'Conforme' : c.ok === false ? 'Non conforme' : 'À contrôler');
// The release, the derogation (who, why, then the facts of receptions.ts about the authorisation: `p` gives the list of the people who release), the release made after the delivery,
// the signature without a release before
export function releaseLines(d: Delivery, p?: Params): string[] {
  const w = d.reception.signWaiver, waiver = w ? [`Signé sans libération préalable : dérogation ${de(w.by)}, motif : ${w.why}, le ${atFr(w.at)}`] : [];
  if (!d.releasedAt) return ['Pas de libération enregistrée', ...waiver].map(nb);
  return [
    `Libérée par ${d.releasedBy || '—'} le ${atFr(d.releasedMoment || d.releasedAt)}`,
    ...(releasedAfterDelivery(d) ? [`Libération enregistrée après la livraison du ${atFr(moment(d))}`] : []),
    ...(d.derogation ? [`Par dérogation ${de(d.derogation.by)} le ${atFr(d.derogation.at)} : ${d.derogation.why}`] : []), ...derogationFacts(d, p), ...waiver,
  ].map(nb);
}
export const SEVERITY_LABEL = { minor: 'Mineure', blocking: 'Bloquante' };
// A blocking reservation still open puts the reception off and the delivery is not counted as received (the same rule as `qtyReceived`, receptions.ts); a minor one, or a lifted one, lets it be pronounced
const blockingOpen = (d: Delivery) => reservesOf(d).filter(x => x.severity === 'blocking' && !x.liftedAt).length;
export const postponed = (d: Delivery): boolean => d.reception.result === 'reserve' && blockingOpen(d) > 0;
const minorOnly = (d: Delivery) => !reservesOf(d).some(x => x.severity === 'blocking');
// When the customer did not sign (absent, or refused), nothing is "pronounced": the delivery is stated
export const noSignHead = (d: Delivery): string => { const x = d.reception.noSign; return x ? (x.kind === 'absent' ? "Livraison constatée en l'absence du client" : x.kind === 'refused' ? 'Livraison constatée, signature du client refusée' : `Livraison constatée, signature du client non obtenue (${noSignWords(x)})`) : ''; };
export const resultText = (d: Delivery): string => nb(resultWords(d));
function resultWords(d: Delivery): string {
  const r = d.reception, rs = reservesOf(d), head = noSignHead(d);
  if (r.result === 'refus') return 'Réception refusée';
  if (head && !postponed(d) && (r.result === 'sans' || r.result === 'reserve')) return r.result === 'sans' ? head : `${head}, ${rs.length ? `${plural(rs.length, 'réserve')} ${rs.length > 1 ? 'notées' : 'notée'}` : 'avec réserve'}`;
  if (r.result === 'sans') return 'Réception prononcée sans réserve';
  if (r.result === 'reserve') return postponed(d) ? `Réception reportée : ${plural(blockingOpen(d), 'réserve bloquante', 'réserves bloquantes')}` : rs.length ? `Réception prononcée avec ${minorOnly(d) ? plural(rs.length, 'réserve mineure', 'réserves mineures') : plural(rs.length, 'réserve')}` : 'Réception prononcée avec réserve';
  return 'Résultat de la réception pas encore renseigné';
}
export const refusalLines = (d: Delivery): string[] => {
  const x = d.reception.refusal;
  return x ? [`Motif : ${x.reason === OTHER ? x.other?.trim() || OTHER : x.reason}`, `Suite : ${x.next === OTHER ? x.nextOther?.trim() || OTHER : x.next}`].map(nb) : [];
};
// Quantity of this delivery against the order: "12 · commandée : 20 · reste à livrer : 8"; a delivery put off by a blocking reservation is delivered, not received (as `qtyReceived` counts it)
export function quantityText(d: Delivery): { label: string; value: string } {
  const cur = receptionsOf(d).at(-1)!, off = postponed(d), got = (d.reception.result === 'sans' || d.reception.result === 'reserve') && !off, rest = remainingQty(d);
  return {
    label: got ? 'Quantité reçue' : 'Quantité livrée',
    value: nb([cur.qty != null ? String(cur.qty) : '', d.qty != null ? `commandée : ${d.qty}` : '', got && rest ? `reste à livrer : ${rest}` : '', off ? 'non comptée comme reçue tant que la réserve bloquante est ouverte' : ''].filter(Boolean).join(' · ')),
  };
}
// The clause of the contract, never an amount; '' when the company did not tick it
export function retentionText(p: Params): string {
  const { retention, liftDays, liftBusiness } = receptionCfg(p);
  return retention.on ? nb(`Retenue prévue au contrat : ${fr(retention.maxPct)} % au plus, levée sous ${liftBusiness ? plural(liftDays, 'jour ouvré', 'jours ouvrés') : plural(liftDays, 'jour')}.`) : '';
}
// What the PV says of the clause: the clause itself, only for a reception "avec réserve" (where it has an object), '' otherwise. The percentage noted for an order is not printed: no screen writes it.
export const clauseLine = (d: Delivery, p: Params): string => (d.reception.result === 'reserve' ? retentionText(p) : '');
// Nothing is written in place of a name or a number: the text says it is missing, and a function never stands for a name (the same words on the screen, on the paper and in the file)
export const NO_ORDER = 'Commande sans numéro', NO_CLIENT = 'Client non renseigné', NO_NAME = 'Nom non renseigné', NO_RECEIVER = 'Réceptionnaire : nom non renseigné', NO_PV = 'PV sans numéro';
export const orderTitle = (d: Delivery) => `${d.ref.trim() || NO_ORDER} · ${d.client.trim() || NO_CLIENT}`;
// What the top of every page says: "PV-2026-009 · CMD-2026-052 · Client C"
export const pvHead = (d: Delivery) => [d.reception.pvNo || NO_PV, d.ref.trim() || NO_ORDER, d.client.trim() || NO_CLIENT].join(' · ');
export const receptionistText = (r: Reception): string => [r.name?.trim() || NO_NAME, r.role?.trim()].filter(Boolean).join(', ') + (r.email ? ` · ${r.email}` : '');
const inked = (s?: Strokes) => !!s?.some(x => x.length > 1);
// The name in the box of the customer: what was typed (with the function), "Réceptionnaire : nom non renseigné" when the box is signed without it, nothing when it is still to be signed by hand
export const clientSigner = (d: Delivery): string => {
  const r = d.reception, name = r.name?.trim(), role = r.role?.trim();
  return name || inked(d.signClient) || r.signedAt || r.noSign || d.pvPhoto ? [name || NO_RECEIVER, role].filter(Boolean).join(', ') : '';
};
// The person who signed for the company is read from the journal (receptions.ts writes the line with the signature); nobody is named when it is not there
export const companySigner = (d: Delivery): string => d.journal?.find(e => e.text === COMPANY_SIGNED && e.at === d.reception.companySignedAt)?.by ?? '';
export const noSignText = (d: Delivery): string => {
  const x = d.reception.noSign;
  return x ? nb(`Signature du client non obtenue : ${noSignWords(x)}, témoin : ${x.witness}${x.witnessOrg?.trim() ? ` (${x.witnessOrg.trim()})` : ''}, le ${atFr(x.at)}`) : '';
};
// The moment of the customer's signature; a photo of the paper PV carries the moment it was taken
export const clientSignAt = (d: Delivery): string => d.reception.signedAt || (d.pvPhoto ? d.reception.pvPhotoAt : '') || '';
export const pvPhotoText = (d: Delivery): string => (d.pvPhoto ? `Photo du PV papier signé${d.reception.pvPhotoAt ? `, prise le ${atFr(d.reception.pvPhotoAt)},` : ''} jointe au dossier de la commande.` : '');
// The file has no picture: a photo is told by its count, and the file says it stays in the application (the screen and the paper draw it)
export const photosNote = (n: number) => `${plural(n, 'photo')} ${n > 1 ? 'jointes' : 'jointe'} dans l'application, ${n > 1 ? 'non reprises' : 'non reprise'} dans ce fichier`;
// "2 photos jointes dans l'application, non reprises dans ce fichier (constat, reprise)": the kinds that are there, '' when there is none
export const photosLine = (kinds: [string | undefined, string][]): string => { const k = kinds.filter(x => x[0]).map(x => x[1]); return k.length ? `${photosNote(k.length)} (${k.join(', ')})` : ''; };
// The text of a reservation; one without text says so, and where its photo is (`photoHere`: the photo is drawn next to it, as on the screen and on the paper)
export const reserveText = (x: ReceptionReserve, photoHere = false): string => x.text?.trim() || `Réserve sans texte${x.photo ? ` (photo ${photoHere ? 'ci-dessous' : "dans l'application"})` : ''}`;
// The hours of the signatures come from the clock of the device, with its time zone when it was kept; said once, when there is an hour to read
export const clockText = (d: Delivery): string => {
  const r = d.reception;
  return r.signedAt || r.companySignedAt || r.noSign || r.pvPhotoAt ? `${CLOCK_NOTE}${r.signTz ? `, fuseau ${r.signTz}` : ''}.` : '';
};
// What was changed after the signature, one line each (the arrow of the journal is written in words)
export const corrections = (d: Delivery): string[] => (d.journal ?? []).filter(e => /^Corrig/.test(e.text)).map(e => nb(`${atFr(e.at)}, ${e.by || '—'} : ${e.text.replace(/ → /g, ' devient ')}`));
// A reservation lifted after the signature does not belong to the PV as signed: it is told apart (the day of the lift is compared with the day of the signature; the same day, the journal tells the moment)
const signedMoment = (d: Delivery) => d.reception.signedAt || d.reception.noSign?.at || d.reception.pvPhotoAt || '';
export function liftedAfterSign(d: Delivery, x: ReceptionReserve): boolean {
  const s = signedMoment(d), l = x.liftedAt;
  if (!s || !l) return false;
  if (l.slice(0, 10) !== s.slice(0, 10)) return l.slice(0, 10) > s.slice(0, 10);
  const line = (d.journal ?? []).find(e => e.text.replace(/\s/g, ' ').startsWith(`Réserve ${reserveWords(x.text)} levée`));
  return !!line && line.at > s;
}
export const reserveName = (x: ReceptionReserve, i: number) => `Réserve ${i + 1}${x.where ? ` · ${x.where}` : ''}`;
export const liftsAfterSign = (d: Delivery) => reservesOf(d).map((x, i) => ({ x, i })).filter(e => liftedAfterSign(d, e.x));
// `liftedBy` is the person of the company who records the lift, never the one who stated it: the line says "enregistrée par"; the person of the customer side and the note, when they were
// given, are in `liftNote` ("Constatée côté client par …")
export const liftLine = (x: ReceptionReserve, i: number): string => nb(`${reserveName(x, i)} : levée le ${frDate(x.liftedAt!)}${x.liftedBy ? `, enregistrée par ${x.liftedBy}` : ''}${x.liftNote ? ` : ${x.liftNote}` : ''}`);
// The seal of the PV (SHA-256 of its content, receptions.ts): the one laid at the signature, those laid again (a correction, the company signing, the number given late) with their moment, who and why,
// then what it says now: the content is the same, or it is not
export function sealView(d: Delivery): { state: 'none' | 'intact' | 'modified'; lines: string[] } {
  const seals = d.reception.seals ?? [], state = sealState(d), last = seals.at(-1);
  if (!last || state === 'none') return { state: 'none', lines: [nb(isLocked(d) ? 'Scellé SHA-256 : aucun enregistré pour ce PV signé' : 'Scellé SHA-256 : aucun (calculé à la signature)')] };
  const lines = seals.map((x, i) => nb(`Scellé SHA-256 : ${shortSeal(x.hash)} (${i === 0 ? 'calculé à la signature' : `recalculé le ${atFr(x.at)}${x.by ? `, par ${x.by}` : ''}${x.why ? ` : ${x.why}` : ''}`})`));
  lines.push(nb(state === 'intact' ? 'Scellé intact : le contenu de ce PV correspond au dernier scellé.' : `Modifié depuis la signature : le contenu de ce PV ne correspond plus au scellé du ${atFr(last.at)}.`));
  return { state, lines };
}
const moment = (d: Delivery) => (d.reception.date ? `${d.reception.date}${d.reception.time ? `T${d.reception.time}` : ''}` : '');
export const deliveredAt = (d: Delivery) => atFr(moment(d));
// The lines "Commande et livraison" of the report, the same on the screen, on the paper and in the file (`v`: the number of the delivery among those of the order; `withPv`: the number of the PV too);
// empty ones are given empty, the caller shows them as "—" or leaves them out
export function orderRows(d: Delivery, v?: { no: number; total: number }, withPv = false): [string, string][] {
  const r = d.reception, q = quantityText(d);
  return [
    ['Client', d.client.trim() || NO_CLIENT], ['Personne qui réceptionne', receptionistText(r)], ['Commande', d.ref.trim() || NO_ORDER], ['Livrable', d.item], [q.label, q.value],
    ...(v && v.total > 1 ? [['Livraison', `${v.no} sur ${v.total}`] as [string, string]] : []), ...(r.count != null ? [['Quantité comptée sur place', String(r.count)] as [string, string]] : []),
    ['Lieu', r.place || ''], ['Livrée le', deliveredAt(d)], ['Bon de livraison n°', r.bl || ''], ...(withPv ? [['Numéro de PV', r.pvNo || ''] as [string, string]] : []),
    ...([['Lot', d.lot], ['Numéro de série', d.serial], ['Matière ou version', d.material]] as [string, string | undefined][]).filter(x => x[1]?.trim()).map(x => [x[0], x[1]!] as [string, string]),
  ];
}

interface Opts { company: string; date: Date; coords?: string; params?: Params; no?: number; equipments?: Record<string, { name: string }> }
// The name of an instrument of 3.3 from its id, as the screen says it ("supprimé" when it is not in the tool any more); undefined when the equipments are not given
export const instrumentName = (eq?: Opts['equipments']) => (eq ? (id: string) => (Object.hasOwn(eq, id) ? eq[id].name : 'supprimé') : undefined);

export function pvPdf(dl: Delivery, o: Opts): string {
  const p = o.params ?? DEFAULT_PARAMS, v = deliveryAt(dl, o.no), d = v.d, r = d.reception, rs = reservesOf(d), clause = clauseLine(d, p), inst = instrumentName(o.equipments);
  const w = new DocWriter({ company: o.company, title: `PV de réception ${d.ref.trim() || NO_ORDER}${r.pvNo ? ` · ${r.pvNo}` : ''}`, date: o.date, coords: o.coords, head: pvHead(d) });
  const note = (t: string, gap = 1) => t && w.para(nb(t), 9, { color: COLORS.gray, gap });
  const named = (name: string) => (name.startsWith(NO_NAME) || name.startsWith(NO_RECEIVER) ? { name, label: '' } : { name });   // "Nom : David K.", but "Nom non renseigné" as the screen says it
  w.band('Procès-verbal de réception', orderTitle(d), [r.pvNo, d.item].filter(Boolean).join(' · '));
  const seal = sealView(d), lifts = liftsAfterSign(d), late = new Set(lifts.map(e => e.x.id));
  if (seal.state === 'modified') w.callout(seal.lines.at(-1)!, [254, 226, 226] as Rgb, COLORS.red);

  w.heading('Commande et livraison');
  w.fields(orderRows(d, v, true));
  const shot = (r.photos ?? []).filter(Boolean).length;
  if (shot) note(`État à la livraison : ${photosNote(shot)}.`);

  w.heading('Autocontrôle aux jalons');
  w.table(['Jalon', 'Point contrôlé et exigence', 'Valeur relevée', 'Résultat', 'Qui et quand'],
    d.milestones.map((m, i) => [`${i + 1}. ${m.label}`, [m.point, m.requirement && `Exigence : ${m.requirement}`].filter(Boolean).join('\n'), valueText(m), msLabel(m), m.ok == null ? '' : `${m.by}\n${atFr(m.at || m.date)}`]),
    [0.17, 0.3, 0.13, 0.18, 0.22], { size: 9 });
  d.milestones.forEach((m, i) => [...milestoneFacts(m, inst), photosLine([[m.photo, 'contrôle'], [m.gapPhoto, 'écart constaté']])].filter(Boolean).forEach(f => note(`Jalon ${i + 1} : ${f}`)));

  if (shipChecksDone(d).length) {
    w.heading('Contrôle de départ');
    w.table(['Point', 'Résultat', 'Qui et quand'], shipChecksDone(d).map(c => [c.label, shipLabel(c), c.ok == null && !c.na ? '' : `${c.by} ${atFr(c.at)}`.trim()]), [0.4, 0.2, 0.4], { size: 9 });
  }
  w.heading('Libération avant départ');
  releaseLines(d, p).forEach(l => w.para(l, 10, { gap: 2 }));

  w.heading('Réception');
  // The result that was chosen says the sentence of the screen (resultText); the others stay empty boxes, to tick by hand on a PV that is signed on paper
  const line = (key: typeof r.result, empty: string) => w.para(`${r.result === key ? '[X]' : '[  ]'} ${r.result === key ? resultText(d) : empty}.`, 10.5, { bold: r.result === key });
  line('sans', 'Réception prononcée sans réserve');
  line('reserve', 'Réception prononcée avec réserve : ................................................');
  const liftBox = ({ x, i }: { x: ReceptionReserve; i: number }) => ({ title: `Signature de levée · ${reserveName(x, i)}`, strokes: x.liftSign });   // the list and the line of the lift say who and when
  if (rs.length) {
    w.table(['N°', 'Réserve', 'Zone', 'Gravité', 'À lever avant le', 'Levée'],
      rs.map((x, i) => [String(i + 1), [reserveText(x), x.repairedAt && `Reprise faite le ${frDate(x.repairedAt)}`].filter(Boolean).join('\n'), x.where || '', SEVERITY_LABEL[x.severity ?? 'minor'], frDate(reserveDue(x, d, p)),
        late.has(x.id) ? 'Non levée à la signature' : x.liftedAt ? `Le ${frDate(x.liftedAt)}${x.liftedBy ? `, levée enregistrée par ${x.liftedBy}` : ''}${x.liftNote ? `\n${x.liftNote}` : ''}` : 'Non levée']),
      [0.06, 0.32, 0.14, 0.12, 0.14, 0.22], { size: 9 });
    rs.forEach((x, i) => { const l = photosLine([[x.photo, 'constat'], [x.repairPhoto, 'reprise'], [x.liftedAt && !late.has(x.id) ? x.liftPhoto : undefined, 'levée']]); if (l) note(`${reserveName(x, i)} : ${l}.`); });
    const signed = rs.map((x, i) => ({ x, i })).filter(e => e.x.liftedAt && !late.has(e.x.id) && inked(e.x.liftSign));
    if (signed.length) w.signatures(signed.map(liftBox), 3, true);
  }
  if (clause) w.para(clause, 10);
  w.para(`${r.result === 'refus' ? '[X]' : '[  ]'} Réception refusée.${r.refusal ? '' : ' Motif : ........................................'}`, 10.5, { bold: r.result === 'refus' });
  refusalLines(d).forEach(l => w.para(l, 10, { x: 62, gap: 2 }));
  if (r.refusal?.photo) note(`Constat du refus : ${photosNote(1)}.`);

  w.ensure(150);
  w.heading('Signatures');
  w.signatures([
    { title: `Pour ${o.company || "l'entreprise"} (qui remet)`, ...named(companySigner(d) || (r.companySignedAt || inked(d.signCompany) ? NO_NAME : '')), date: atFr(r.companySignedAt), strokes: d.signCompany },
    { title: CLIENT_TITLE, ...named(clientSigner(d)), date: atFr(clientSignAt(d)), strokes: d.signClient },
    ...(inked(d.releaseSign) ? [{ title: 'Libération avant départ', ...named(d.releasedBy || NO_NAME), date: atFr(d.releasedMoment || d.releasedAt), strokes: d.releaseSign }] : []),   // the signature of the release, as the two others
  ]);
  if (noSignText(d)) w.para(noSignText(d), 10, { bold: true });
  if (d.pvPhoto) { note(pvPhotoText(d), 4); note(`PV papier signé : ${photosNote(1)}.`); }
  [clockText(d), SIGNER_NOTE].filter(Boolean).forEach(l => note(l));
  if (lifts.length) {
    w.heading('Levées après la signature');
    lifts.forEach(e => { w.para(liftLine(e.x, e.i), 10, { gap: 2 }); const l = photosLine([[e.x.liftPhoto, 'levée']]); if (l) note(`${reserveName(e.x, e.i)} : ${l}.`); });
    const signed = lifts.filter(e => inked(e.x.liftSign));
    if (signed.length) w.signatures(signed.map(liftBox), 3, true);
  }
  w.heading('Scellé et corrections');
  if (isLocked(d)) note(LOCK_NOTE, 4);
  if (v.no === v.total) corrections(d).forEach(l => note(`Correction après signature, le ${l}`));
  seal.lines.forEach(l => w.para(l, 9.5, { bold: l.startsWith('Scellé SHA-256') || seal.state === 'modified', color: seal.state === 'modified' ? COLORS.red : undefined, gap: 1 }));
  w.para(SEAL_NOTE, 8.5, { color: COLORS.gray });
  return w.finish();
}
