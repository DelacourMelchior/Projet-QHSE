// The two full screens of tool 3.4 (RcMilestone, RcReception), lot 1 "the signed PV tells the truth": what the signature carries is summed up in facts ABOVE the pads,
// a signature is closed with the facts of `signBlockers` (and a waiver says who and why), the clock of the device is said at the top, the PV of step 6 gives its seal and
// no longer claims that nothing can be changed. Static render: the portal is stood in for, the store is a stub (no jsdom: the pad, the opening of the waiver window and the
// person picked are checked in the browser, not here: a static render starts with nobody picked, so the pads are always closed).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { rcMoment, signBlockers } from '../../domain/receptions';
import { quantityText, resultText } from '../../domain/receptionsPdf';
import type { Delivery, State } from '../../domain/types';

const h = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('react-dom', async orig => ({ ...(await orig<typeof import('react-dom')>()), createPortal: (c: unknown) => c }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: h.state, update: vi.fn(), author: 'Test', storageFull: false }) }));

const nav = { tool() {}, openAction() {}, newAction() {}, openRisk() {}, settings() {} } as never;
const text = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const rec = async (id: string) => { const { RcReception } = await import('./RcReception'); return text(renderToStaticMarkup(<RcReception id={id} onClose={() => {}} nav={nav} />)); };
const mil = async (id = 'dl_demo_5') => { const { RcMilestone } = await import('./RcMilestone'); return text(renderToStaticMarkup(<RcMilestone id={id} onClose={() => {}} nav={nav} />)); };
const SEAL = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

describe('lot 1, the full screens of the field', { timeout: 30000 }, () => {
  let s: State, d: Delivery;
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} });
    vi.stubGlobal('window', { sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
    s = demoState(new Date(2026, 8, 25, 10, 0));
    d = s.deliveries.dl_demo_9;
    d.reception = { ...d.reception, result: 'sans', name: 'Mme Perrin' };   // result chosen, PV not signed, nothing released: the screen opens on the signatures
    d.releasedAt = ''; d.releasedBy = ''; delete d.releasedMoment;
    h.state = s;
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('G-7: the PV is summed up in facts above the pads (result, reservations, quantity, clause) and "Voir le PV" stays', async () => {
    const html = await rec('dl_demo_9');
    const recap = html.indexOf('Contenu du PV avant la signature');
    expect(recap).toBeGreaterThan(-1);
    expect(recap).toBeLessThan(html.indexOf('<canvas'));
    for (const t of [resultText(d), 'Aucune réserve notée.', quantityText(d).label, 'Clause de retenue', d.client, 'Voir le PV']) expect(html).toContain(plain(t));   // the sentences are the ones the PV prints
    expect(html).not.toMatch(/disabled=""[^>]*>Voir le PV/);   // the footer button is never closed: the PV can be read before the signature
  });
  it('G-7: the reservations are listed with their text and their gravity, the result says how many', async () => {
    d.reception = { ...d.reception, result: 'reserve', reserves: [
      { id: 'r1', text: 'Éclat sur la porte', severity: 'minor', raisedAt: '2026-09-25' },
      { id: 'r2', text: 'Pied manquant', severity: 'blocking', raisedAt: '2026-09-25', where: 'Étagère 3' },
    ] };
    const html = await rec('dl_demo_9');
    for (const t of [resultText(d), 'Réception reportée : 1 réserve bloquante', 'Mineure', 'Éclat sur la porte', 'Bloquante', 'Étagère 3', 'Pied manquant', 'non comptée comme reçue tant que la réserve bloquante est ouverte']) expect(html).toContain(plain(t));
    expect(html).not.toContain(plain('(s)'));
  });
  it('G-7: a refusal says its motive and what follows', async () => {
    d.reception = { ...d.reception, result: 'refus', refusal: { reason: 'Quantité incorrecte', next: 'À remplacer' } };
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain('Réception refusée · Motif : Quantité incorrecte · Suite : À remplacer'));
    expect(html).toContain(plain(quantityText(d).label));
  });

  it('D-7/G-5: the signature is closed with the facts of signBlockers, and the way out is a waiver that asks who and why', async () => {
    const facts = signBlockers(s, d);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts).toContain(plain("Rien n'est libéré"));
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain('Signature impossible sans dérogation'));
    for (const f of facts) expect(html).toContain(plain(f.replace(/&/g, '&amp;')));
    expect(html).toContain(plain('Signer malgré ces faits'));
    expect(html.match(/disabled=""[^>]*><svg[^>]*><path[^>]*><\/path><\/svg>Valider la signature/g) ?? []).toHaveLength(2);
    expect(html).toContain(plain("Aucune personne choisie : les signatures ne sont pas ouvertes."));
  });
  it('D-7/G-5: a waiver written on the PV is said as a fact (who, when, why) and the button to write it is gone', async () => {
    d.reception = { ...d.reception, signWaiver: { by: 'David K.', why: 'Livraison urgente demandée par le client', at: '2026-09-25T09:30' } };
    const html = await rec('dl_demo_9');
    for (const t of ['Signature autorisée par dérogation', 'Dérogation de David K.', 'Livraison urgente demandée par le client']) expect(html).toContain(plain(t));
    expect(html).not.toContain(plain('Signer malgré ces faits'));
  });
  it('G-6: a short trace drawn and kept in the tab is said as a fact; a real trace is not', async () => {
    const draft = (strokes: unknown) => vi.stubGlobal('window', { sessionStorage: { getItem: (k: string) => (k.startsWith('rc-draft:') ? JSON.stringify({ sig: strokes, csig: strokes }) : null), setItem() {}, removeItem() {} } });
    draft([[[150, 50], [150, 50]]]);   // the dot of an immobile tap
    expect((await rec('dl_demo_9')).match(/Tracé trop court : il n'est pas enregistré comme signature\./g) ?? []).toHaveLength(2);
    draft([[[10, 10], [60, 60], [120, 20], [180, 70], [240, 30], [290, 80]]]);
    expect(await rec('dl_demo_9')).not.toContain(plain('Tracé trop court'));
  });

  it('G-9/D-23: the clock of the device behind the last act is said at the top of both full screens', async () => {
    for (const html of [await rec('dl_demo_9'), await mil()]) expect(html).not.toContain(plain("L'horloge de cet appareil"));
    d.journal = [...(d.journal ?? []), { at: '2099-01-01T00:00', by: 'Test', text: 'Un acte daté du futur' }];
    const [r, m] = [await rec('dl_demo_9'), await mil()];
    expect(r).toMatch(/role="status"[^>]*><svg[^]*?<\/svg>L'horloge de cet appareil[^<]*La signature est fermée sans dérogation de signature\./);
    expect(m).toMatch(/role="status"[^>]*><svg[^]*?<\/svg>L'horloge de cet appareil[^<]*La libération est fermée\./);
  });

  it('G-8: with nobody picked the first screen says so, "Suivant" is closed and the place is not typed', async () => {
    d.reception = { ...d.reception, result: '' };   // opens on step 1
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain("Aucune personne choisie : chaque geste enregistré porte le nom de la personne qui remet pour l'entreprise."));
    expect(html).toMatch(/disabled=""[^>]*>Suivant/);
    expect(html).toMatch(/<input[^>]*id="rcr-place"[^>]*disabled=""|<input[^>]*disabled=""[^>]*id="rcr-place"/);
  });

  it('G-4: the PV of step 6 gives its seal in groups of four and no longer claims that nothing can change', async () => {
    const l = s.deliveries.dl_demo_1;
    l.reception = { ...l.reception, signedAt: '2026-08-27T10:55', seals: [{ hash: SEAL, at: '2026-08-27T10:55', by: 'Marc M.' }] };
    const html = await rec('dl_demo_1');
    expect(html).toContain(plain(`PV signé le ${rcMoment('2026-08-27T10:55')} · scellé abcd ef01 2345`));
    expect(html).toContain(plain('Une correction passe par la fiche de la commande'));
    expect(html).not.toContain(plain("aucune modification n'est possible"));
    expect(html).toContain(plain('Modifié depuis la signature'));   // the content of the demo order is not the one of this made-up seal
  });
  it('G-4: a PV without the signature of the customer is stated as such, not said "signé"', async () => {
    const l = s.deliveries.dl_demo_1;
    delete l.signClient; delete l.pvPhoto;
    l.reception = { ...l.reception, signedAt: '', noSign: { kind: 'absent', witness: 'M. Garnier', at: '2026-08-27T10:55', witnessOrg: 'Tiers' }, seals: [{ hash: SEAL, at: '2026-08-27T10:55', by: 'Marc M.' }] };
    const html = await rec('dl_demo_1');
    expect(html).toContain(plain(`Livraison constatée en l'absence du client le ${rcMoment('2026-08-27T10:55')} · scellé abcd ef01 2345`));
    expect(html).not.toContain(plain('PV signé le'));
  });
  it('G-4: a PV signed before the seals existed says that no seal is recorded', async () => {
    const l = s.deliveries.dl_demo_1;
    delete l.reception.seals;
    const html = await rec('dl_demo_1');
    expect(html).toContain(plain('Aucun scellé enregistré pour ce PV.'));
    expect(html).not.toContain(plain('Modifié depuis la signature'));
  });

  // ---- critique fixes (F1): the moment of the signature, the company after the customer, the bar of the field screens
  it('F1: before the signature the screen says what is signed, in the words of the PV, right above the button; the other ways out are folded under the pads', async () => {
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain(`Vous signez : ${resultText(d)} · ${quantityText(d).label.toLowerCase()} `));
    expect(html.indexOf('Vous signez')).toBeLessThan(html.indexOf('Valider la signature du client'));
    expect(html).toMatch(/<h1[^>]*>Signatures<\/h1>/);
    expect(html).not.toContain(plain('Contenu verrouillé'));
    expect(html).toMatch(/<summary[^>]*>Si le client ne peut pas signer<\/summary>/);
    expect(html.indexOf('<summary')).toBeGreaterThan(html.lastIndexOf('<canvas'));   // under both pads
    expect(html.indexOf('Client absent')).toBeGreaterThan(html.indexOf('<summary'));
    expect(html).not.toMatch(/opacity-(30|50)[^"]*"[^>]*><svg[^>]*><path[^>]*><\/path><\/svg>Valider/);   // the main gesture closed is never a faded button
  });
  it('F1: with nobody picked the collector of the signatures is asked; no silent value', async () => {
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain('Qui recueille les signatures ?'));
    expect(html).not.toContain(plain('Même personne :'));
  });
  it('F1: "Voir le PV" is a white button until the PV is signed (the main gesture is the signature), the main green after', async () => {
    const open = await rec('dl_demo_9');
    expect(open).toMatch(/class="[^"]*border-slate-500 bg-white[^"]*"[^>]*>Voir le PV/);
    expect(open).not.toMatch(/class="[^"]*bg-delacour-primary[^"]*"[^>]*>Voir le PV/);
  });
  it('F1: a PV signed by the customer and not yet by the company says it as a fact on the last step, and keeps its seal', async () => {
    const l = s.deliveries.dl_demo_1;
    delete l.signCompany; delete l.reception.companySignedAt;
    const html = await rec('dl_demo_1');
    expect(html).toContain(plain("Signature de l'entreprise : pas encore apposée."));
    expect(html.match(/<div[^>]*data-bar[^>]*>[\s\S]*/)![0]).not.toContain(plain('bg-emerald-700'));   // no emerald on a navigation button
  });
  it('F1: the bar of the full screens: "Suivant" closed says why, the next button is the green of the brand, a closed button is grey at full opacity', async () => {
    d.reception = { ...d.reception, result: '' };
    const html = await rec('dl_demo_9');
    expect(html).toContain(plain('Aucune personne choisie : « Suivant » reste fermé.'));
    const f = html.match(/<div[^>]*data-bar[^>]*>[\s\S]*/)![0];
    expect(f).toContain(plain('bg-delacour-primary'));
    expect(f).not.toContain(plain('bg-emerald-700'));
    expect(f).toContain(plain('disabled:!opacity-100'));
    expect(f).not.toMatch(/disabled:opacity-(30|50)/);
    const m = await mil();
    expect(m).toContain(plain('Aucune personne choisie : « Commencer » reste fermé.'));
    expect(m).toMatch(/<h1[^>]*>Qui contrôle \?<\/h1>/);
    expect(m.match(/Qui contrôle \?/g)).toHaveLength(1);   // the title only: the live region says "Début du contrôle", the list of people has its own label (A-19: the title is not said twice)
    expect(m).toContain(plain('Personne qui contrôle'));
  });
});
