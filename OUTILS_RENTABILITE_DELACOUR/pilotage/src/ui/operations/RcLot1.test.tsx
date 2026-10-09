// Lot 1 of tool 3.4 on the sheet side (static render; the store is a stub, the dialogs and the effects are checked in the browser): a signed PV locks the fields of the order and the
// definitions of the milestones, the seal is told (intact, modified, none), a signature is stopped by facts unless a waiver is written, a gesture of proof asks for a person, the clock
// of the device behind the last act is told. Built on a blank state: the example of the tool is not needed.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import type { Delivery, State, Strokes } from '../../domain/types';
import { blankState } from '../../domain/templates';
import {
  addReserve, checkMilestone, clockFact, derogationFacts, isLocked, logDelivery, newDelivery, releaseDelivery, sealOf, setMilestoneNa, setNoSign, setReceptionist, setResult, shortSeal, signBlockers, signClient, signWaiver, startReception,
  rcMoment,
} from '../../domain/receptions';
import { RcReserves } from './RcReserves';
import { RcSheet } from './RcSheet';
import { RcTabMilestones } from './RcTabMilestones';
import { RcTabOrder } from './RcTabOrder';
import { Correct, SHEET_LOCK_NOTE, RcTabReception } from './RcTabReception';
import { RcTabFollow } from './RcTabFollow';
import { RcTabRelease } from './RcTabRelease';

const store = vi.hoisted(() => ({ state: null as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: store.state, update: vi.fn(), author: 'Test', storageFull: false }) }));
// the dialogs are drawn in a portal of the page, which a static render has not: the sheet is rendered with its body in place
vi.mock('../common', async importOriginal => {
  const h = (await import('react')).createElement;
  return { ...(await importOriginal<typeof import('../common')>()), Modal: ({ title, subtitle, children, footer }: { title: unknown; subtitle?: unknown; children: unknown; footer?: unknown }) => h('section', null, h('h2', null, title as string), subtitle as string, children as string, footer as string) };
});

const noop = () => {}, nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const at = '2026-09-10T10:00', pad: Strokes = [[[10, 20], [60, 70], [110, 30], [160, 80], [210, 40], [260, 70]]];
const fresh = (): State => blankState('industrie', new Date(2026, 8, 25, 10, 0));
const props = (d: Delivery, s: State) => ({ d, saved: s.deliveries[d.id], set: noop, act: noop, state: s, nav, close: noop });
// an order that was checked, released, delivered, received without reservation and signed by the customer: locked and sealed
function signed(s: State): Delivery {
  let d: Delivery = { ...newDelivery(s.params), ref: 'CMD-77', client: 'Client Test', item: 'Portail', qty: 2, promisedAt: '2026-09-12' };
  d.milestones.forEach(m => { d = checkMilestone(d, m.id!, { ok: true, by: 'Paul', at }); });
  d = releaseDelivery(d, { by: 'Paul', at }, s);
  d = startReception(d, { at, by: 'Paul' });
  d = setReceptionist(d, { name: 'Martin' });
  d = setResult(d, 'sans', at, 'Paul');
  s.deliveries[d.id] = d;   // the number of the PV is counted over the store
  d = signClient(d, pad, at, 'Paul', s);
  s.deliveries[d.id] = d;
  return d;
}
// an order not released, nothing checked, a result written: what stands in the way of a signature
const unripe = (s: State): Delivery => { const d = setResult(setReceptionist(newDelivery(s.params), { name: 'Martin' }), 'sans', at, 'Paul'); s.deliveries[d.id] = d; return d; };
const btn = (text: string) => new RegExp(`<button[^>]*disabled=""[^>]*>(?:<svg[^>]*>.*?</svg>)?${text}`, 's');

beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });

describe('lot 1, the lock of a signed PV (D-1, G-1, G-4)', { timeout: 30000 }, () => {
  it('reads the order as read only: every field is disabled and "Corriger la commande" is the way', () => {
    const s = fresh(), d = signed(s);
    expect(isLocked(d)).toBe(true);
    const html = renderToStaticMarkup(<RcTabOrder {...props(d, s)} />);
    ['Numéro de commande', 'Client', 'Livrable', 'Quantité commandée', 'Date de livraison promise', 'Numéro de lot', 'Numéro de série', 'Matière ou version'].forEach(l => expect(html, l).toMatch(new RegExp(`<span[^>]*>${l}</span><(?:input|select)[^>]*disabled=""`)));
    expect(html).toContain(plain('Corriger la commande'));
    expect(html).toContain(plain('Les champs de la commande ne se modifient plus'));
    expect(html).not.toMatch(/aucune modification n.est possible/i);
    const open = renderToStaticMarkup(<RcTabOrder {...props(newDelivery(s.params), s)} />);
    expect(open).not.toContain(plain('Corriger la commande'));
    expect(open).not.toContain(plain('disabled=""'));
  });
  it('reads the definitions of the milestones as read only, with "Corriger la définition"', () => {
    const s = fresh(), d = signed(s), html = renderToStaticMarkup(<RcTabMilestones {...props(d, s)} />);
    expect(html).toContain(plain('<fieldset disabled=""'));
    expect(html).toContain(plain('Corriger la définition'));
    expect(html).toContain(plain('Les contrôles et les définitions des jalons ne se modifient plus'));
    const open = renderToStaticMarkup(<RcTabMilestones {...props(newDelivery(s.params), s)} />);
    expect(open).not.toContain(plain('<fieldset disabled'));
    expect(open).not.toContain(plain('Corriger la définition'));
  });
  it('says the lock as a fact in the reception tab, with "Corriger"', () => {
    const s = fresh(), d = signed(s), html = renderToStaticMarkup(<RcTabReception {...props(d, s)} />);
    expect(html).toContain(plain('Le résultat, les quantités et la réception ne se modifient plus'));
    expect(html).toContain(plain('>Corriger<'));
  });
});

describe('lot 1, the seal on the sheet (G-2)', { timeout: 30000 }, () => {
  const sheet = (initial: Delivery, s: State) => { store.state = { ...s, deliveries: { ...s.deliveries, [initial.id]: initial } }; return renderToStaticMarkup(<RcSheet initial={initial} onClose={noop} nav={nav} />); };
  it('tells the seal intact, by groups of four', () => {
    const s = fresh(), d = signed(s), hash = d.reception.seals!.at(-1)!.hash, html = sheet(d, s);
    expect(hash).toBe(sealOf(d));
    expect(html).toContain(plain(`Scellé intact : ${shortSeal(hash)}`));
    expect(html).toContain(plain(esc(SHEET_LOCK_NOTE)));
    expect(html).not.toContain(plain('Modifié depuis la signature'));
    expect(html).not.toContain(plain('contenu de la réception est figé'));
  });
  it('tells in red that the content no longer matches the seal of the day', () => {
    const s = fresh(), d = signed(s), html = sheet({ ...d, client: 'Autre client' }, s);
    expect(html).toContain(plain(`Modifié depuis la signature : le contenu ne correspond plus au scellé du ${rcMoment('2026-09-10T10:00')}.`));
    expect(html).toContain(plain('role="alert"'));
    expect(html).not.toContain(plain('Scellé intact'));
  });
  it('tells that no seal is kept for a PV signed before the seals, and says nothing of a seal on an open order', () => {
    const s = fresh(), d = signed(s);
    const old = sheet({ ...d, reception: { ...d.reception, seals: undefined } }, s);
    expect(old).toContain(plain('Aucun scellé enregistré pour ce PV.'));
    expect(old).not.toContain(plain('Scellé intact'));
    expect(sheet(newDelivery(s.params), s)).not.toMatch(/Scellé|scellé/);
  });
});

describe('lot 1, signing stopped by facts (D-7, G-5)', { timeout: 30000 }, () => {
  it('lists the facts that stand in the way and offers a waiver (who allows it, why)', () => {
    const s = fresh(), d = unripe(s), facts = signBlockers(s, d);
    expect(facts).toContain(plain("Rien n'est libéré"));
    const html = renderToStaticMarkup(<RcTabReception {...props(d, s)} />);
    expect(html).toContain(plain('Signature impossible sans dérogation'));
    facts.forEach(f => expect(html, f).toContain(plain(esc(f))));
    expect(html).toContain(plain('Signer malgré ces faits'));
    expect(html).toMatch(btn('Enregistrer la signature du client'));
  });
  it('tells the waiver once it is written, with who and why', () => {
    const s = fresh(), d = signWaiver(unripe(s), 'Anne', 'Client pressé', at), html = renderToStaticMarkup(<RcTabReception {...props(d, s)} />);
    expect(html).toContain(plain(esc(`Signature autorisée par dérogation d'Anne, le ${rcMoment('2026-09-10T10:00')} : « Client pressé ».`)));
    expect(html).not.toContain(plain('Signature impossible sans dérogation'));
    expect(html).not.toContain(plain('Signer malgré ces faits'));
  });
  it('tells the clock of the device behind the last act, in the reception tab and the release tab, and stops the release', () => {
    const s = fresh(), d = logDelivery(newDelivery(s.params), 'Paul', '2099-01-01T08:00', 'Acte');
    s.deliveries[d.id] = d;
    const fact = clockFact(s);
    expect(fact).toContain(plain("L'horloge de cet appareil"));
    const rec = renderToStaticMarkup(<RcTabReception {...props(d, s)} />), rel = renderToStaticMarkup(<RcTabRelease {...props(d, s)} />);
    expect(rec).toContain(plain(esc(fact)));
    expect(rel).toContain(plain(esc(fact)));
    expect(rel).toMatch(btn('Libérer'));
    expect(renderToStaticMarkup(<RcTabRelease {...props(newDelivery(fresh().params), fresh())} />)).not.toContain(plain("L&#x27;horloge"));
  });
});

describe('lot 1, a gesture of proof asks for a person (G-6, G-8)', { timeout: 30000 }, () => {
  it('leaves the start, the result and the signatures inactive until a person is picked', () => {
    const s = fresh(), d = newDelivery(s.params), html = renderToStaticMarkup(<RcTabReception {...props(d, s)} />);
    expect(html).toMatch(btn('Commencer la réception'));
    expect(html).toMatch(btn('Sans réserve'));
    expect(html).toMatch(btn('Enregistrer la signature de l&#x27;entreprise'));
    expect(html).toContain(plain('Personne qui remet pas encore choisie.'));
    expect(html).toContain(plain('les quantités sont inactives'));
    expect(html).toContain(plain('les photos sont inactives'));
    expect((html.match(/<fieldset disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(3);   // quantities, photos of the state, photo of the paper PV
  });
  it('leaves the reservation, its deadline, its lift and the addition inactive until a person is picked', () => {
    const s = fresh();
    let d = startReception(newDelivery(s.params), { at, by: 'Paul' });
    d = setResult(d, 'reserve', at, 'Paul');
    d = addReserve(d, { text: 'Rayure sur le panneau', by: 'Paul', at }, s.params);
    const none = renderToStaticMarkup(<RcReserves d={d} act={noop} state={s} nav={nav} who="" />), some = renderToStaticMarkup(<RcReserves d={d} act={noop} state={s} nav={nav} who="Paul" />);
    expect(none).toContain(plain('<fieldset disabled=""'));
    expect(none).toMatch(btn("Changer l&#x27;échéance"));
    expect(none).toContain(plain('Personne pas encore choisie'));
    expect(some).not.toContain(plain('<fieldset disabled'));
    expect(some).toContain(plain("Changer l&#x27;échéance"));
    expect(some).not.toMatch(/<input[^>]*type="date"/);   // the deadline is no longer a field that changes at will: it asks a reason
    expect(some).toContain(plain('Lever la réserve'));
  });
});

describe('lot 1, the facts of a derogation and of a milestone set aside (G-14, D-2)', { timeout: 30000 }, () => {
  it('tells who allowed the release, and that the person is outside the list of those who release', () => {
    const s = fresh();
    s.params = { ...s.params, reception: { releasers: ['Anne'] } };
    const d = releaseDelivery(newDelivery(s.params), { by: 'Paul', at, derogation: { why: 'Livraison urgente' } }, s);
    expect(d.derogation).toBeTruthy();
    const html = renderToStaticMarkup(<RcTabRelease {...props(d, s)} />), facts = derogationFacts(d, s.params);
    expect(facts.length).toBeGreaterThan(0);
    expect(html).toContain(plain('Par dérogation, autorisée par Paul'));
    facts.forEach(f => expect(html, f).toContain(plain(esc(f))));
  });
  it('tells a milestone set aside with its reason, and offers to put it back', () => {
    const s = fresh();
    let d = newDelivery(s.params);
    d = setMilestoneNa(d, d.milestones[1].id!, 'Hors périmètre', 'Paul', at);
    const html = renderToStaticMarkup(<RcTabMilestones {...props(d, s)} />);
    expect(html).toContain(plain('Sans objet pour cette commande : Hors périmètre.'));
    expect(html).toContain(plain('Remettre à contrôler'));
    expect(d.journal?.some(l => l.text.includes('Hors périmètre'))).toBe(true);
  });
});

describe('lot 1, the dialog of a correction and the follow-up (D-1, D-12, G-5)', { timeout: 30000 }, () => {
  it('asks who corrects and why before it saves, and shows the fields of the milestone', () => {
    const people = { names: ['Paul', 'Anne'], absent: [] };
    const html = renderToStaticMarkup(<Correct title="Corriger la définition du jalon" subtitle="x" holdKey="t" people={people} onClose={noop} onSave={() => true}
      was={{ label: 'Contrôle', point: 'Cotes', requirement: '10 à 11 mm', unit: 'mm', min: 10, max: 11 }}
      fields={[{ k: 'label', label: 'Libellé' }, { k: 'requirement', label: 'Exigence' }, { k: 'min', label: 'Mini', type: 'num' }, { k: 'max', label: 'Maxi', type: 'num' }]} />);
    ['Qui corrige ?', 'Motif de la correction (obligatoire)', 'Libellé', 'Exigence', 'Mini', 'Maxi', 'Paul', 'Anne'].forEach(t => expect(html, t).toContain(plain(t)));
    expect(html).toContain(plain('Personne pas encore choisie.'));
    expect(html).toMatch(btn('Enregistrer la correction'));
  });
  it('says a delivery noted without the customer as such, not as "Reçue sans réserve" alone', () => {
    const s = fresh();
    let d = startReception(newDelivery(s.params), { at, by: 'Paul' });
    d = setResult(d, 'sans', at, 'Paul');
    d = setNoSign(d, 'absent', 'Anne', at, 'Paul', 'Entreprise');
    expect(d.reception.noSign?.witnessOrg).toBe('Entreprise');
    expect(renderToStaticMarkup(<RcTabFollow {...props(d, s)} />)).toContain(plain('Reçue sans réserve, client absent'));
    expect(renderToStaticMarkup(<RcTabReception {...props(d, s)} />)).toContain(plain("témoin : Anne, témoin de l&#x27;entreprise"));
  });
});
