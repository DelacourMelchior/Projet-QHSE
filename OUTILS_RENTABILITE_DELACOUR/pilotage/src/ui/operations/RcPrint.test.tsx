// The documents of tool 3.4 (RcPv, RcPrint): the PV on the screen and on paper, the follow-up sheet with the two QR codes of the order, the file of proof of an order, for the 14 orders of the example
// (static render; the sizes of the characters on paper are read by `printedSizes`, below). The printed sheet of a work instruction (3.2) is in SopPrint.test.tsx.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { PvPrint, PvView } from './RcPv';
import { ProofPrint, RC_PAGE, TravellerPrint } from './RcPrint';
import { rcJalonUrl, rcReceptionUrl } from './RcBits';
import { Qr, qrMm } from '../Qr';
import { readFileSync } from 'node:fs';
import qrcode from 'qrcode-generator';
import { CLAUSE_NOTE, LOCK_NOTE, SEAL_NOTE, SIGNER_NOTE, UNLOCKED_NOTE, clauseLine, clockText, orderRows, orderTitle, pvHead, reserveText, liftLine, liftsAfterSign, milestoneFacts, noSignText, pvPdf, pvPhotoText, releaseLines, resultText, sealView } from '../../domain/receptionsPdf';
import { isLocked, qtyReceived, sealOf } from '../../domain/receptions';
import type { Delivery, State } from '../../domain/types';

describe('documents of tool 3.4: the PV and the follow-up sheet', { timeout: 30000 }, () => {
  const at = (hostname: string, protocol = 'https:') => vi.stubGlobal('window', { location: { href: `${protocol}//${hostname}/pilotage.html`, hostname, protocol } });
  const state = demoState(new Date(2026, 8, 25, 10, 0)), orders = Object.values(state.deliveries);
  const html = (el: ReactElement) => renderToStaticMarkup(el);
  // what is read: the tags, the pictures (data) and the comments of React taken out
  const text = (h: string) => h.replace(/src="[^"]*"/g, '').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const withClause = (on: boolean): State => ({ ...state, params: { ...state.params, reception: { ...state.params.reception, retention: { on, maxPct: 5 } } } });
  beforeAll(() => at('outils.example.fr'));

  it('renders the PV on the screen and on paper for the 14 orders, with no amount and no word of invoicing', () => {
    expect(orders).toHaveLength(14);
    orders.forEach(d => [<PvView key="v" d={d} state={state} />, <PvPrint key="p" d={d} state={state} />].forEach(el => {
      const h = html(el), t = text(h);
      expect(t, d.id).toContain(plain('Procès-verbal de réception'));
      expect(t, d.id).toContain(plain(d.ref));
      expect(t, d.id).toContain(plain('Autocontrôle aux jalons'));
      expect(t, d.id).not.toMatch(/€|factur|bon pour|payable|solde/i);
      expect(h).not.toMatch(/overflow-x|min-w-\[[0-9]{3,}/);   // nothing wider than a phone
    }));
  });
  it('shows the signatures drawn, with the date and the hour of each, the number of the PV and what was pronounced', () => {
    const h = html(<PvView d={state.deliveries.dl_demo_1} state={state} />), t = text(h);
    expect(h.match(/<polyline/g)!.length).toBeGreaterThanOrEqual(4);   // company and customer, two strokes each (plus the release)
    expect(t).toMatch(/Le \d\d\/\d\d\/2026 à 10 h 50/);
    expect(t).toMatch(/Le \d\d\/\d\d\/2026 à 10 h 55/);
    expect(t).toContain(plain('PV-2026-002'));
    expect(t).toContain(plain('Réception prononcée sans réserve'));
    expect(t).toContain(plain(LOCK_NOTE));
    expect(t).toContain(plain('Site du client, quai 3'));
    expect(t).toContain(plain('Conforme'));
  });
  it('shows each reservation with its photo, place, gravity and lift, and the refusal with its motive and what follows', () => {
    const two = html(<PvPrint d={state.deliveries.dl_demo_2} state={state} />), t = text(two);
    expect(t).toContain(plain('Réserve 1 · Caisson 7'));
    expect(t).toContain(plain('Réserve 2 · Caissons 3 et 9'));
    expect(t).toContain(plain('Gravité : Mineure'));
    expect(t).toContain(plain('Levée'));
    expect(t).toContain(plain('Non levée'));
    expect(t).toContain(plain('enregistrée par Mme Perret'));   // the person of the company who records the lift, never "constatée par" her (lot 1, G-8)
    expect(two.match(/<img/g)!.length).toBeGreaterThanOrEqual(6);   // the proofs of the milestones and the three of the reservation drawn
    const refused = text(html(<PvView d={state.deliveries.dl_demo_12} state={state} />));
    expect(refused).toContain(plain('Réception refusée'));
    expect(refused).toContain(plain('Motif : Documents manquants'));
    expect(refused).toContain(plain('Suite : À reprendre et livrer à nouveau'));
  });
  it('says the delivery number, a closed delivery, the customer who did not sign and the check before departure', () => {
    const t = text(html(<PvView d={state.deliveries.dl_demo_13} state={state} />)), one = text(html(<PvView d={state.deliveries.dl_demo_13} state={state} no={1} />));
    expect(t).toContain(plain('Livraison 2 sur 2'));
    expect(t).toContain(plain('PV non verrouillé'));
    expect(one).toContain(plain('Livraison 1 sur 2'));
    expect(one).toContain(plain("Motif : Teinte différente de l'échantillon validé"));
    const absent = text(html(<PvPrint d={state.deliveries.dl_demo_14} state={state} />));
    expect(absent).toContain(plain('client absent, témoin : Gardien du site'));
    expect(absent).toContain(plain('Contrôle de départ'));
    expect(text(html(<PvView d={state.deliveries.dl_demo_10} state={state} />))).toContain(plain('reste à livrer : 8'));
  });
  it('prints the clause of retention only when it is ticked and the reception is with reservations, never the note about it, and never an amount (P-6)', () => {
    const d = state.deliveries.dl_demo_3, on = text(html(<PvPrint d={d} state={withClause(true)} />)), off = text(html(<PvPrint d={d} state={withClause(false)} />));
    expect(d.reception.result).toBe('reserve');
    expect(on).toMatch(/Retenue prévue au contrat : 5 % au plus, levée sous 7 jours/);
    expect(on).not.toContain(plain(CLAUSE_NOTE));                                   // a note of the company, not of the PV handed to the customer
    expect(off).not.toMatch(/Retenue|Mention de clause/);
    // a reception without reservation, a refused one, a PV to sign: nothing to say about the retention
    [state.deliveries.dl_demo_1, state.deliveries.dl_demo_12, state.deliveries.dl_demo_13].forEach(x => [text(html(<PvPrint d={x} state={withClause(true)} />)), text(html(<PvView d={x} state={withClause(true)} />))].forEach(t => expect(t, x.id).not.toMatch(/Retenue prévue/)));
    // the screen of the company tells the notes, in a band that is never printed
    const screen = html(<PvView d={d} state={withClause(true)} />);
    expect(text(screen)).toContain(plain(CLAUSE_NOTE));
    expect(screen).toMatch(/<aside[^>]*print:hidden/);
    expect(html(<PvPrint d={d} state={withClause(true)} />)).not.toContain(plain('<aside'));
  });
  it('prints no note meant for the company on the PV handed to the customer: not "PV non verrouillé", not the note of the clause (P-6), the 14 orders; the lock of a signed PV is still told', () => {
    orders.forEach(d => {
      const t = text(html(<PvPrint d={d} state={withClause(true)} />));
      expect(t, d.id).not.toContain(plain(UNLOCKED_NOTE));
      expect(t, d.id).not.toContain(plain(CLAUSE_NOTE));
      expect(t, d.id).not.toMatch(/journal de la commande|Notes pour l'entreprise/);
      if (isLocked(d)) expect(t, d.id).toContain(plain(LOCK_NOTE));
    });
    expect(text(html(<PvView d={state.deliveries.dl_demo_13} state={state} />))).toContain(plain(UNLOCKED_NOTE));   // the screen keeps it, in the band
    expect(html(<PvView d={state.deliveries.dl_demo_13} state={state} />)).toMatch(/<aside[^>]*print:hidden/);
  });
  it('gives the number of the delivery note on the screen and on paper, when there is one (the PDF: receptionsPdf.test.ts)', () => {
    const d = state.deliveries.dl_demo_1, bl = { ...d, reception: { ...d.reception, bl: 'BL-2026-0412' } };
    [<PvView key="v" d={bl} state={state} />, <PvPrint key="p" d={bl} state={state} />].forEach(el => expect(text(html(el))).toMatch(/Bon de livraison n° BL-2026-0412/));
    expect(text(html(<PvView d={d} state={state} />))).not.toContain(plain('Bon de livraison'));
  });
  // E6: the PV and the line of quantity say what `qtyReceived` counts
  const blocking = (open: boolean): Delivery => {
    const d = state.deliveries.dl_demo_2;
    return { ...d, qty: 20, reception: { ...d.reception, result: 'reserve', qty: 5, reserves: d.reception.reserves!.map((r, i) => ({ ...r, liftedAt: undefined, liftedBy: undefined, ...(i === 0 ? { severity: 'blocking' as const, ...(open ? {} : { liftedAt: '2026-09-20', liftedBy: 'M. Durand' }) } : {}) })) } };
  };
  it('says "Réception reportée" and does not count the quantity as received while a blocking reservation is open', () => {
    const d = blocking(true), t = text(html(<PvView d={d} state={state} />));
    expect(qtyReceived(d)).toBe(0);
    expect(t).toContain(plain('Réception reportée : 1 réserve bloquante'));
    expect(t).toContain(plain('Quantité livrée 5 · commandée : 20 · non comptée comme reçue'));
    expect(t).not.toContain(plain('reste à livrer'));
    const lifted = blocking(false), l = text(html(<PvPrint d={lifted} state={state} />));
    expect(qtyReceived(lifted)).toBe(5);
    expect(l).toContain(plain('Quantité reçue 5 · commandée : 20 · reste à livrer : 15'));
    expect(l).not.toContain(plain('Réception reportée'));
  });

  it('renders the follow-up sheet of the 14 orders: one row per milestone, boxes to tick, the checks before departure, the release', () => {
    expect(RC_PAGE).toBe('A4 portrait');
    orders.forEach(d => {
      const h = html(<TravellerPrint d={d} state={state} />), t = text(h);
      expect(t, d.id).toContain(plain(d.ref));
      expect(t, d.id).toContain(plain('Fiche suiveuse de commande'));
      expect(t, d.id).toContain(plain('Contrôle de départ'));
      expect(t, d.id).toContain(plain('Libération avant départ'));
      expect(h.match(/<tr/g), d.id).toHaveLength(d.milestones.length + 1);
      expect(t, d.id).not.toMatch(/€|factur|95 ?%|5 ?%|payable|retenue|solde/i);
    });
    const t = text(html(<TravellerPrint d={state.deliveries.dl_demo_4} state={state} />));
    expect(t).toContain(plain('Largeur du portillon'));
    expect(t).toContain(plain('Plage attendue : entre 999 et 1001 mm'));
    expect(t).toContain(plain('Non conforme'));
  });
  it('carries two QR codes (25 mm at least each), the checks and the reception at the customer\'s, written under each, and warns about a local address', () => {
    const d = state.deliveries.dl_demo_5, jalon = rcJalonUrl(d.id), recep = rcReceptionUrl(d.id), qr = (u: string) => html(<Qr text={u} size={110} label="" />).match(/ d="([^"]+)"/)![1];
    expect(jalon).toBe('https://outils.example.fr/pilotage.html#3.4~jalon%3Adl_demo_5');
    expect(recep).toBe('https://outils.example.fr/pilotage.html#3.4~reception%3Adl_demo_5');
    const h = html(<TravellerPrint d={d} state={state} />), t = text(h);
    expect(h).toContain(plain(qr(jalon)));                                     // the very drawing of the QR code of each address
    expect(h).toContain(plain(qr(recep)));
    expect(qr(jalon)).not.toBe(qr(recep));
    expect(html(<TravellerPrint d={state.deliveries.dl_demo_6} state={state} />)).not.toContain(plain(qr(jalon)));   // another order, another code
    const sizes = [...h.matchAll(/<svg[^>]* width="(\d+)"/g)].map(m => +m[1] * 0.2646);   // pixels of 96 dpi to millimetres
    expect(sizes).toHaveLength(2);
    sizes.forEach(mm => expect(mm).toBeGreaterThanOrEqual(25));
    expect(t).toContain(plain('Contrôles'));                                   // the two legends, written under the two codes
    expect(t).toContain(plain('Réception chez le client'));
    expect(h.indexOf('>Contrôles<')).toBeLessThan(h.indexOf('>Réception chez le client<'));
    expect(t).not.toContain(plain("QR d'essai"));
    at('localhost', 'http:');
    expect(text(html(<TravellerPrint d={d} state={state} />))).toContain(plain("QR d'essai : adresse de cet ordinateur"));
    at('outils.example.fr');
  });
  // the size of the characters on paper (9 pt on the follow-up sheet, 8.5 pt on the file of proof and the PV, the pills of a PV at 9 pt) is read as the browser prints it in RcPrintSizes.test.tsx
  it('prints the file of proof of an order: header, one PV per delivery (closed ones first), journal, defects with their decision, photos included, no amount', () => {
    orders.forEach(d => {
      const h = html(<ProofPrint d={d} state={state} />), t = text(h);
      expect(t, d.id).toContain(plain('Dossier de preuve de la commande'));
      expect(t, d.id).toContain(plain(d.ref));
      expect(t, d.id).toContain(plain('Livraisons et procès-verbaux'));
      expect(t, d.id).toContain(plain('Journal de la commande'));
      expect(t, d.id).toContain(plain('Défauts liés (5.1)'));
      expect(h.match(/Procès-verbal de réception/g), d.id).toHaveLength((d.lots?.length ?? 0) + 1);   // a PV per delivery
      expect(t, d.id).toContain(plain(`Quantité reçue ${qtyReceived(d)}`));
      expect(t, d.id).not.toMatch(/€|factur|bon pour|payable|solde|coût|cout/i);
      expect(h).not.toMatch(/overflow-x|min-w-\[[0-9]{3,}/);
      (d.journal ?? []).slice(0, 3).forEach(e => expect(t, d.id).toContain(plain(e.text.slice(0, 20))));
    });
  });
  it('puts each PV of the file on its own page, the closed deliveries then the one under way, with the number of each', () => {
    const d = state.deliveries.dl_demo_13, h = html(<ProofPrint d={d} state={state} />), t = text(h);
    expect(h.match(/break-before:page/g)).toHaveLength(3);               // two PV and the journal
    expect(t).toContain(plain('Livraison 1 sur 2'));
    expect(t).toContain(plain('Livraison 2 sur 2'));
    expect(t.indexOf('Livraison 1 sur 2')).toBeLessThan(t.indexOf('Livraison 2 sur 2'));
    expect(t).toContain(plain("Motif : Teinte différente de l'échantillon validé"));   // the refusal of the closed delivery
    expect(t).toMatch(/Réception refusée/);
    expect(h.match(/<img/g)!.length).toBeGreaterThanOrEqual(2);         // the photos of the proofs
  });
  it('gives the delivery note of each delivery in the summary of the file of proof', () => {
    const d = state.deliveries.dl_demo_13, lot = d.lots![0], x: Delivery = { ...d, reception: { ...d.reception, bl: 'BL-2026-0099' }, lots: [{ ...lot, reception: { ...lot.reception, bl: 'BL-2026-0077' } }] };
    const t = text(html(<ProofPrint d={x} state={state} />));
    expect(t).toMatch(/1 .* BL-2026-0077/);
    expect(t).toMatch(/2 .* BL-2026-0099/);
    expect(t.match(/Bon de livraison n° BL-2026-0077/)).not.toBeNull();   // and on the PV of the closed delivery
  });
  it('lists the defects of 5.1 of the order with where they come from and their decision, and says when there is none', () => {
    const t = text(html(<ProofPrint d={state.deliveries.dl_demo_4} state={state} />));
    expect(t).toContain(plain('NC-2026-009'));
    expect(t).toMatch(/Déclaré depuis : Jalon 3/);
    expect(t).toContain(plain('Décision : Retouche'));
    expect(t).toContain(plain('Photo du défaut'));
    expect(text(html(<ProofPrint d={state.deliveries.dl_demo_1} state={state} />))).toContain(plain('Aucun défaut lié à cette commande'));
    const open: State = { ...state, ncs: { ...state.ncs, nc_demo_r1: { ...state.ncs.nc_demo_r1, decision: '', decidedAt: '', decidedBy: '', decisionNote: '' } } };
    expect(text(html(<ProofPrint d={state.deliveries.dl_demo_4} state={open} />))).toContain(plain('Décision pas encore prise'));
  });
  // ---- LOT 1: the proof stays whole. The screen, the paper and the file say the same, nothing more than the tool knows
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
  const pdfText = (pdf: string) => norm([...pdf.matchAll(/<([0-9a-f]+)> Tj/g)].map(m => new TextDecoder('windows-1252').decode(Uint8Array.from(m[1].match(/../g)!.map(h => parseInt(h, 16))))).join(' '));
  const withRec = (d: Delivery, patch: Partial<Delivery['reception']>): Delivery => ({ ...d, reception: { ...d.reception, ...patch } });
  const sealed = (d: Delivery, at = '2026-09-25T09:00', by = 'Paul'): Delivery => withRec(d, { seals: [{ hash: sealOf(d), at, by }] });
  const inState = (d: Delivery, st: State = state): State => ({ ...st, deliveries: { ...st.deliveries, [d.id]: d } });
  const pvOpts = { company: state.settings.companyName, date: new Date(2026, 8, 25, 10, 0), params: state.params, equipments: state.equipments };
  it('says the same sentences on the screen, on paper and in the PDF (a result not given yet is empty boxes in the PDF, to tick by hand), for the 14 orders and for an order sealed, signed without a release, with a photo of the paper PV', () => {
    const extra = [sealed(state.deliveries.dl_demo_1), withRec(state.deliveries.dl_demo_5, { signWaiver: { by: 'Paul', why: 'Livraison urgente', at: '2026-09-25T08:00' } }), withRec(state.deliveries.dl_demo_8, { signedAt: undefined, pvPhotoAt: '2026-09-16T14:20', signTz: 'Europe/Paris' })];
    [...orders, ...extra].forEach(d => {
      const sentences = [...sealView(d).lines, ...releaseLines(d, state.params), d.reception.result ? resultText(d) : '', noSignText(d), clockText(d), pvPhotoText(d), SIGNER_NOTE, SEAL_NOTE, ...d.milestones.flatMap(m => milestoneFacts(m)), ...liftsAfterSign(d).map(e => liftLine(e.x, e.i))].filter(Boolean).map(norm);
      const outs = { screen: norm(text(html(<PvView d={d} state={inState(d)} />))), paper: norm(text(html(<PvPrint d={d} state={inState(d)} />))), pdf: pdfText(pvPdf(d, pvOpts)) };
      sentences.forEach(x => Object.entries(outs).forEach(([k, t]) => expect(t, `${d.id} ${k}`).toContain(plain(x))));
    });
  });
  it('says nothing more than the tool knows on any of the three: no legal word, no claim of habilitation, no "(s)"', () => {
    orders.forEach(d => [text(html(<PvView d={d} state={state} />)), text(html(<PvPrint d={d} state={state} />)), pdfText(pvPdf(d, pvOpts))].forEach(t => {
      expect(t, d.id).not.toMatch(/contradictoire|habilit|atteste|opposable|aucune modification|toute correction s'inscrit|\(s\)/i);
      expect(t, d.id).toContain(plain('Pour le client'));
    }));
    const t = text(html(<PvView d={state.deliveries.dl_demo_1} state={state} />));
    expect(t).toContain(plain(SIGNER_NOTE));
    expect(t).toContain(plain(LOCK_NOTE));
  });
  it('does not say that a customer who was absent pronounced the reception, nor an empty date next to the date of the witness', () => {
    const d = state.deliveries.dl_demo_14, v = text(html(<PvView d={d} state={state} />)), p = text(html(<PvPrint d={d} state={state} />));
    [v, p].forEach(t => {
      expect(t).toContain(plain("Livraison constatée en l'absence du client"));
      expect(t).not.toContain(plain('Réception prononcée sans réserve'));
      expect(t).toContain(plain('client absent, témoin : Gardien du site'));
      expect(t).not.toContain(plain('Date et heure non renseignées'));            // the day is on the line of the witness (P-18)
    });
  });

  it('prints the seal of a signed PV on the screen and on paper, with its state; the exact mention', () => {
    const d = sealed(state.deliveries.dl_demo_1), st = inState(d);
    [text(html(<PvView d={d} state={st} />)), text(html(<PvPrint d={d} state={st} />))].forEach(t => {
      expect(t).toMatch(/Scellé SHA-256 : [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} \(calculé à la signature\)/);
      expect(t).toContain(plain('Scellé intact : le contenu de ce PV correspond au dernier scellé.'));
      expect(t).toContain(plain(SEAL_NOTE));
    });
    expect(html(<PvView d={d} state={st} />)).not.toContain(plain('role="alert"'));
    const unsigned = text(html(<PvView d={state.deliveries.dl_demo_13} state={state} />));
    expect(unsigned).toContain(plain('Scellé SHA-256 : aucun (calculé à la signature)'));
  });
  it('says in red, at the top of the PV, that the content is not the one that was sealed (the audit b4 and t24 proofs: changed outside of the screen)', () => {
    const d = sealed(state.deliveries.dl_demo_1), x = { ...d, client: 'Client MODIFIE apres signature' };
    [html(<PvView d={x} state={inState(x)} />), html(<PvPrint d={x} state={inState(x)} />)].forEach(h => {
      const t = text(h);
      expect(h).toContain(plain('role="alert"'));
      expect(t).toContain(plain('Modifié depuis la signature : le contenu de ce PV ne correspond plus au scellé du 25/09/2026 à 9 h 00.'));
      expect(h.indexOf('Modifié depuis la signature')).toBeLessThan(h.indexOf('Commande et livraison'));   // before the content
    });
    const proof = text(html(<ProofPrint d={x} state={inState(x)} />));
    expect(proof).toContain(plain('modifié depuis la signature'));
  });
  it('gives the seal of each delivery, with its state, in the file of proof', () => {
    const d = sealed(state.deliveries.dl_demo_1), t = text(html(<ProofPrint d={d} state={inState(d)} />));
    expect(t).toContain(plain('Scellé SHA-256'));
    expect(t).toMatch(/PV-2026-002 .* [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} intact/);
    expect(t).toMatch(/Scellé SHA-256 : [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} \(calculé à la signature\)/);   // and on the PV itself
    expect(text(html(<ProofPrint d={state.deliveries.dl_demo_13} state={state} />))).toContain(plain('aucun (calculé à la signature)'));
  });
  it('marks the lines of proof of the journal in the file of proof', () => {
    const d = { ...state.deliveries.dl_demo_1, journal: [{ at: '2026-08-16T10:55', by: 'M. Durand', text: 'PV signé par le client', proof: true }, { at: '2026-08-16T10:00', by: 'Paul', text: 'Photo ajoutée' }] };
    const h = html(<ProofPrint d={d} state={inState(d)} />);
    expect(h).toContain(plain('<strong>PV signé par le client</strong>'));
    expect(h).not.toContain(plain('<strong>Photo ajoutée</strong>'));
  });

  it('tells apart what was lifted after the signature, the list reading as signed', () => {
    const d = state.deliveries.dl_demo_2;
    [text(html(<PvView d={d} state={state} />)), text(html(<PvPrint d={d} state={state} />))].forEach(t => {
      expect(t).toContain(plain('Levées après la signature Réserve 1 · Caisson 7 : levée le 24/09/2026, enregistrée par Mme Perret'));
      expect(t).toContain(plain('Non levée à la signature'));
      expect(t).toContain(plain('Non levée'));
      expect(t).toMatch(/Réserve 1 · Caisson 7 Non levée à la signature/);
    });
    const before = withRec(d, { signedAt: '2026-09-25T10:00' }), t = text(html(<PvView d={before} state={state} />));
    expect(t).not.toContain(plain('Levées après la signature'));
    expect(t).toContain(plain('levée le 24/09/2026, enregistrée par Mme Perret'));
    expect(t).not.toContain(plain('constatée par'));
  });
  it('shows the requirement, the bounds and the instrument of a check as they were, and the definition now when it differs', () => {
    const d = state.deliveries.dl_demo_1, ev = { at: '2026-08-17T11:05', by: 'David K.', kind: 'check' as const, ok: true, measured: '1 245,2 mm', requirement: 'Entre 1 244 et 1 246 mm', min: 1244, max: 1246, instrumentId: 'eq_demo_cle' };
    const x = { ...d, milestones: d.milestones.map((m, i) => (i === 2 ? { ...m, unit: 'mm', min: 1240, max: 1250, requirement: 'Entre 1 240 et 1 250 mm', history: [ev] } : m)) };
    [text(html(<PvView d={x} state={state} />)), text(html(<PvPrint d={x} state={state} />))].forEach(t => {
      expect(t).toContain(plain(`Au contrôle du 17/08/2026 à 11 h 05 : exigence « Entre 1 244 et 1 246 mm » ; plage attendue : entre 1244 et 1246 mm ; instrument : ${state.equipments.eq_demo_cle.name}`));
      expect(t).toContain(plain('Définition actuelle du jalon différente : exigence « Entre 1 240 et 1 250 mm » ; plage attendue : entre 1240 et 1250 mm'));
    });
    // the definition has not changed since the check: the line of the milestone already says the requirement, the line of the check does not repeat it (screen and paper alike)
    const same = { ...d, milestones: d.milestones.map((m, i) => (i === 2 ? { ...m, unit: 'mm', min: 1244, max: 1246, requirement: 'Entre 1 244 et 1 246 mm', history: [ev] } : m)) };
    [text(html(<PvView d={same} state={state} />)), text(html(<PvPrint d={same} state={state} />))].forEach(t => {
      expect(t).toContain(plain(`Au contrôle du 17/08/2026 à 11 h 05 : plage attendue : entre 1244 et 1246 mm ; instrument : ${state.equipments.eq_demo_cle.name}`));
      expect(t).not.toContain(plain('exigence « Entre 1 244 et 1 246 mm »'));
      expect(t).not.toContain(plain('Définition actuelle du jalon différente'));
    });
  });
  it('says a signature without a release, the moment of the photo of a paper PV, the time zone, the organisation of the witness', () => {
    const w = withRec(state.deliveries.dl_demo_5, { signWaiver: { by: 'Paul', why: 'Livraison urgente chez le client', at: '2026-09-25T08:00' } }), tw = text(html(<PvView d={w} state={state} />));
    expect(tw).toContain(plain('Pas de libération enregistrée'));
    expect(tw).toContain(plain('Signé sans libération préalable : dérogation de Paul, motif : Livraison urgente chez le client, le 25/09/2026 à 8 h 00'));
    const paper = withRec(state.deliveries.dl_demo_8, { signedAt: undefined, pvPhotoAt: '2026-09-16T14:20', signTz: 'Europe/Paris' }), tp = text(html(<PvPrint d={paper} state={state} />));
    expect(tp).toContain(plain('Photo du PV papier signé, prise le 16/09/2026 à 14 h 20, jointe au dossier de la commande.'));
    expect(tp).toContain(plain('Le 16/09/2026 à 14 h 20'));                      // the box of the customer carries the moment of the photo
    expect(tp).not.toContain(plain('Date et heure non renseignées'));
    expect(tp).toContain(plain("Heures lues sur l'horloge de l'appareil, non certifiées, fuseau Europe/Paris."));
    const n = state.deliveries.dl_demo_14, org = withRec(n, { noSign: { ...n.reception.noSign!, witnessOrg: 'Client' } });
    expect(text(html(<PvView d={org} state={state} />))).toContain(plain('témoin : Gardien du site (Client)'));
  });
  it('says the facts about the authorisation to release: the person outside the list of those who release, the same person who controlled and released by derogation', () => {
    const d = state.deliveries.dl_demo_1, st: State = { ...state, params: { ...state.params, reception: { ...state.params.reception, releasers: ['Nicolas R.'] } } };
    [text(html(<PvView d={d} state={st} />)), text(html(<PvPrint d={d} state={st} />)), pdfText(pvPdf(d, { ...pvOpts, params: st.params }))].forEach(t => expect(t).toContain(plain('Antoine P. : personne hors de la liste des personnes qui libèrent')));
    expect(text(html(<PvView d={d} state={state} />))).not.toContain(plain('hors de la liste'));                       // the list is not set: everyone may release
    const dero = state.deliveries.dl_demo_6, t = text(html(<PvView d={dero} state={state} />));
    expect(t).toContain(plain(`Par dérogation de ${dero.derogation!.by}`));
    expect(t).toContain(plain(dero.derogation!.why));
  });
  it('gives the date AND the hour of every copy printed', () => {
    const stamp = /\d\d\/\d\d\/\d{4} à \d{1,2} h \d\d/;
    expect(text(html(<PvPrint d={state.deliveries.dl_demo_1} state={state} />))).toMatch(new RegExp(`Édité le ${stamp.source}`));
    expect(text(html(<PvView d={state.deliveries.dl_demo_1} state={state} />))).not.toContain(plain('Édité le'));
    expect(text(html(<TravellerPrint d={state.deliveries.dl_demo_1} state={state} />))).toMatch(new RegExp(`Copie papier imprimée le ${stamp.source}`));
    expect(text(html(<ProofPrint d={state.deliveries.dl_demo_1} state={state} />))).toMatch(new RegExp(`Dossier édité le ${stamp.source}`));
  });

  // ---- LOT 3: the PV and the sheet on paper
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  const flat = (h: string) => text(h.replace(/<style>.*?<\/style>/gs, ''));
  it('P-11: the lines of the order, the title, the head of the pages, the clause and the text of a reservation are the same sentences on the screen, on paper and in the PDF, for the 14 orders (and a reservation without text)', () => {
    const pdfTxt = (d: Delivery, st: State) => pdfText(pvPdf(d, { ...pvOpts, params: st.params }));
    const noText = (d: Delivery): Delivery => ({ ...d, reception: { ...d.reception, reserves: (d.reception.reserves ?? []).map((x, i) => (i === 0 ? { ...x, text: '', photo: x.photo || 'data:image/svg+xml;base64,AAAA' } : x)) } });
    [...orders, noText(state.deliveries.dl_demo_2), { ...state.deliveries.dl_demo_1, ref: '', client: '' } as Delivery].forEach(d => {
      [state, withClause(true)].forEach(st => {
        const v = deliveryOf(d, undefined), outs = { screen: norm(text(html(<PvView d={d} state={inState(d, st)} />))), paper: norm(text(html(<PvPrint d={d} state={inState(d, st)} />))), pdf: norm(pdfTxt(d, st)) };
        const sentences = [orderTitle(d), clauseLine(d, st.params), ...orderRows(d, { no: (d.lots?.length ?? 0) + 1, total: (d.lots?.length ?? 0) + 1 }).filter(x => x[1].trim()).flatMap(x => [x[0], x[1]]), ...(d.reception.reserves ?? []).filter(x => x.text).map(x => reserveText(x))].filter(Boolean).map(norm);
        sentences.forEach(x => Object.entries(outs).forEach(([k, t]) => expect(t, `${d.id} ${k}`).toContain(plain(x))));
        expect(outs.paper, d.id).toContain(plain(norm(pvHead(v)))); expect(outs.pdf, d.id).toContain(plain(norm(pvHead(v))));
      });
    });
    const d = noText(state.deliveries.dl_demo_2);
    expect(norm(text(html(<PvPrint d={d} state={inState(d, state)} />)))).toContain(plain('Réserve sans texte (photo ci-dessous)'));      // the photo is drawn next to it
    expect(pdfTxt(d, state)).toContain(plain("Réserve sans texte (photo dans l'application)"));                                           // the file has no picture
  });
  it('P-3, P-8: every page of the PV carries "PV · order · customer" on top (the head of a table, which the browser repeats) and "Édité le …" at the bottom, "page n sur N" in the margin, nothing alone on a last page', () => {
    orders.forEach(d => {
      const h = html(<PvPrint d={d} state={state} />);
      expect(h, d.id).toMatch(/<thead>.*<\/thead>/s);
      expect(h.match(/<thead>(.*?)<\/thead>/s)![1], d.id).toContain(plain(esc(pvHead(d))));
      expect(text(h.match(/<tfoot>(.*?)<\/tfoot>/s)![1]), d.id).toMatch(/Édité le \d\d\/\d\d\/\d{4} à \d{1,2} h \d\d/);
      expect(h, d.id).toContain(plain('@page { @bottom-right { content: "page " counter(page) " sur " counter(pages)'));
      expect(flat(h.replace(/<tfoot>.*?<\/tfoot>/s, '')), d.id).not.toMatch(/Édité le/);   // not a line at the end of the document: it is in the foot of the page
    });
    expect(pvHead(state.deliveries.dl_demo_2)).toBe('PV-2026-009 · CMD-2026-052 · Client C');
    // the file of proof: the same on each of its PV, and its own line on the other pages
    const p = html(<ProofPrint d={state.deliveries.dl_demo_13} state={state} />);
    expect(p.match(/<thead>/g)!.length).toBeGreaterThanOrEqual(4);          // the cover, two PV, the journal
    expect(p).toContain(plain('Dossier de preuve · CMD-2026-045 · Client B'));
    expect(p).toContain(plain('PV sans numéro · CMD-2026-045 · Client B'));
    expect(p).toContain(plain('page " counter(page) " sur " counter(pages)'));
  });
  it('P-9: no colour under the document when "background graphics" is ticked: the body is white on paper, the rule is not beaten by the class of the body', () => {
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
    expect(css).toMatch(/@media print \{\s*body \{ background: #fff !important; \}/);
  });
  it('P-4: a PV not signed yet is printed to be signed: empty boxes with Nom, Date et heure, Signature and "À signer", the three boxes of the result to tick, not "Pas de signature"', () => {
    const d = state.deliveries.dl_demo_13, t = flat(html(<PvPrint d={d} state={state} />)), screen = flat(html(<PvView d={d} state={state} />));
    expect(d.reception.result).toBe('');
    expect(t).toContain(plain('À signer'));
    expect(t.match(/À signer/g)).toHaveLength(2);                           // the company's box and the customer's
    expect(t).toMatch(/Nom\s.*Date et heure\s.*Signature/);
    expect(t).not.toContain(plain('Pas de signature'));
    expect(t).not.toContain(plain('Date et heure non renseignées'));
    ['Réception prononcée sans réserve', 'Réception prononcée avec réserve : ', 'Réception refusée. Motif : '].forEach(x => expect(t).toContain(plain(x)));
    expect(html(<PvPrint d={d} state={state} />).match(/h-\[6mm\] w-\[6mm\]/g)).toHaveLength(3);   // 6 mm boxes
    expect(screen).toContain(plain('Pas de signature'));                           // the screen keeps its words
    expect(screen).not.toContain(plain('À signer'));
    // signed: the boxes of the result and the lines to write are not there
    const signed = flat(html(<PvPrint d={state.deliveries.dl_demo_1} state={state} />));
    expect(signed).not.toContain(plain('À signer'));
    expect(signed).not.toContain(plain('Réception refusée. Motif : '));
  });
  it('P-12, P-19: an order or a customer without a name says it in words; a signer without a name says it too; never a word of function in place of a name', () => {
    const d = state.deliveries.dl_demo_1, blank = { ...d, ref: '', client: '', reception: { ...d.reception, name: '', role: 'Directrice', email: '' } } as Delivery;
    [flat(html(<PvPrint d={blank} state={inState(blank)} />)), flat(html(<PvView d={blank} state={inState(blank)} />))].forEach(t => {
      expect(t).toContain(plain('Commande sans numéro · Client non renseigné'));
      expect(t).toContain(plain('Client Client non renseigné'));
      expect(t).toContain(plain('Commande Commande sans numéro'));
      expect(t).toContain(plain('Personne qui réceptionne Nom non renseigné, Directrice'));
      expect(t).toContain(plain('Réceptionnaire : nom non renseigné, Directrice'));   // the box of the customer's signature
      expect(t).not.toMatch(/Commande · Client|Réceptionnaire(?! :)/);
    });
    expect(pvHead(blank)).toBe('PV-2026-002 · Commande sans numéro · Client non renseigné');
    const nameless = { ...d, client: '' } as Delivery;
    expect(flat(html(<TravellerPrint d={nameless} state={inState(nameless)} />))).toContain(plain('Client non renseigné'));
  });
  it('P-15: 38 mm wide for the photos of a milestone, 80 mm for the finding of a reservation and the photo of a refusal, never cropped (contain)', () => {
    const two = html(<PvPrint d={state.deliveries.dl_demo_2} state={state} />);
    expect(two).toContain(plain('print:w-[80mm]'));
    expect(two).toContain(plain('print:w-[38mm]'));
    const rs = two.slice(two.indexOf('Résultat de la réception'));
    expect(rs).toMatch(/print:w-\[80mm\][^>]*>.*?Constat/s);              // the finding of a reservation
    expect(rs).toMatch(/print:w-\[38mm\][^>]*>.*?Reprise/s);
    const jalons = two.slice(two.indexOf('Autocontrôle aux jalons'), two.indexOf('Résultat de la réception'));
    expect(jalons).not.toContain(plain('print:w-[80mm]'));
    expect(two).not.toMatch(/print:h-24|print:w-36/);                       // the old box of 38 x 25 mm
    const refused = html(<PvPrint d={state.deliveries.dl_demo_12} state={state} />);
    expect(state.deliveries.dl_demo_12.reception.refusal!.photo).toBeTruthy();
    expect(refused).toMatch(/print:w-\[80mm\][^>]*>.*?Constat du refus/s);
  });
  it('P-22: the number of a PV does not break in two, in the file of proof and on the PV', () => {
    const t = html(<ProofPrint d={state.deliveries.dl_demo_1} state={state} />);
    expect(t).toMatch(/whitespace-nowrap font-mono[^>]*>PV-2026-002</);
    expect(html(<PvPrint d={state.deliveries.dl_demo_1} state={state} />)).toMatch(/whitespace-nowrap font-mono[^>]*>PV-2026-002</);
  });
  it('P-7, P-17, P-21: the follow-up sheet has a box for the initials (Visa) and a column for the gap seen (Remarque), not a "Qui" and a "Date et heure" to write; boxes of 6 mm; the place and the person to call; the reference photo; the place of the application written at the foot', () => {
    const d = state.deliveries.dl_demo_1, h = html(<TravellerPrint d={d} state={state} />), t = flat(h), head = h.match(/<thead>(.*?)<\/thead>/s)![1];
    expect(text(head)).toMatch(/Visa/);
    expect(text(head)).toContain(plain('Remarque, écart constaté'));
    expect(text(head)).not.toMatch(/Qui|Date et heure/);
    expect(h.match(/h-\[6mm\] w-\[6mm\]/g)!.length).toBeGreaterThanOrEqual(2 * d.milestones.length);   // two boxes a milestone, and the checks before departure
    expect(h).not.toMatch(/h-\[4\.5mm\]/);
    expect(h.match(/min-h-\[7mm\]/g)!.length).toBeGreaterThanOrEqual(d.milestones.length * 3);       // value + two lines of remark
    expect(t).toContain(plain('Livraison à Site du client, quai 3'));
    expect(t).toContain(plain('Personne à contacter M. Durand, Acheteur · 04 00 00 02 20'));
    expect(t).toContain(plain('Référence'));                                       // the milestone with a reference photo
    expect(t).toContain(plain("Le nom, la date et l'heure d'un contrôle sont écrits par l'application à la saisie"));
    expect(t).toContain(plain('Un visa par jalon ; la valeur relevée et la remarque s\'écrivent à la main ; la date et l\'heure sont celles de la saisie dans l\'application.'));
    expect(t).toMatch(/Nicolas R\.\s+17\/08\/2026 à \d{1,2} h \d\d/);                // what the application wrote is printed in the box of the visa
    // an order that has no place and no person says nothing about them
    const bare = { ...d, orgId: undefined, contactId: undefined, reception: { ...d.reception, place: '', name: '', role: '', contactId: undefined } } as Delivery;
    expect(flat(html(<TravellerPrint d={bare} state={inState(bare)} />))).not.toMatch(/Livraison à|Personne à contacter/);
  });
  it('P-13: the quiet zone of a QR code is 4 modules; a longer address is more modules, so a bigger code on paper (30 mm at least above version 6); the other callers keep their size', () => {
    const q = (text: string) => { const c = qrcode(0, 'M'); c.addData(text); c.make(); return c.getModuleCount(); };
    const short = 'https://app.exemple.fr/#3.4~jalon%3Adl_k3x9a2bq', long = `https://exemple.sharepoint.com/sites/Qualite/Documents%20partages/Outils/Pilotage/pilotage.html?web=1#3.4~jalon%3Adl_k3x9a2bq`, file = `file:///Users/x/Site%20Internet/Projet/OUTILS/livrable/pilotage.html#3.4~reception%3Adl_k3x9a2bq`.padEnd(196, 'x');
    const [ns, nl, nf] = [q(short), q(long), q(file)];
    expect((ns - 17) / 4).toBeLessThanOrEqual(6);
    expect((nl - 17) / 4).toBeGreaterThan(6);
    expect(qrMm(ns)).toBeGreaterThanOrEqual(26);
    expect(qrMm(nl)).toBeGreaterThanOrEqual(30);
    expect(qrMm(nf)).toBeGreaterThan(qrMm(nl));
    const w = (h: string) => +h.match(/<svg[^>]* width="(\d+)"/)![1], mm = (px: number) => px * 0.2646;
    expect(html(<Qr text={short} size={104} label="" />)).toContain(plain(`viewBox="-4 -4 ${ns + 8} ${ns + 8}"`));   // the quiet zone, 4 modules
    expect(w(html(<Qr text={long} size={104} label="" />))).toBe(Math.round(104 * (nl + 8) / (nl + 6)));   // `fit` not asked (3.2, 3.3): the modules keep the size they had, the white margin grew
    expect(mm(w(html(<Qr text={short} size={104} fit label="" />)))).toBeGreaterThanOrEqual(26);
    expect(mm(w(html(<Qr text={long} size={104} fit label="" />)))).toBeGreaterThanOrEqual(30);
    expect(w(html(<Qr text={file} size={104} fit label="" />))).toBeGreaterThan(w(html(<Qr text={long} size={104} fit label="" />)));
    expect(w(html(<Qr text={short} size={150} fit label="" />))).toBeGreaterThanOrEqual(150);            // a minimum, never smaller than asked
    expect(w(html(<Qr text={short} size={64} label="" />))).toBe(Math.round(64 * (ns + 8) / (ns + 6)));
    // the module stays at 0.6 mm at least, whatever the address
    [ns, nl, nf].forEach(n => expect(qrMm(n) / (n + 8)).toBeGreaterThanOrEqual(0.595));
  });
  it('the sheet and the file say their page number in the margin too, and the white of the page is kept for the "À signer" PV of a closed delivery (the same line of head on each of its pages)', () => {
    const d = state.deliveries.dl_demo_13;
    expect(html(<TravellerPrint d={d} state={state} />)).toContain(plain('counter(page)'));
    expect(html(<PvPrint d={d} state={state} no={1} />)).toContain(plain(esc(pvHead(deliveryOf(d, 1)))));
  });
  function deliveryOf(d: Delivery, no?: number): Delivery { return no ? { ...d, reception: d.lots!.find(l => l.no === no)!.reception } : d; }
});
