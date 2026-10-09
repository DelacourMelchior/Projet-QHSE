// @vitest-environment happy-dom
// The reception at the customer's full screen (RcReception), PLAYED in a DOM (happy-dom; the store is the reactive stand-in of testDom.tsx, the clock is stopped at 25 Sept. 2026 10:00): the
// first step writes once, the quantity read in French, the result and the refusal, the signatures (the customer's drawn with a finger, the company's after it), the PV locked and numbered, a signed PV
// that opens on the last step, what is typed and not added. What the screen draws without a gesture is read by the static tests (RcField*, RcLot*).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { isLocked, pvSigned, reservesOf } from '../../domain/receptions';
import { RcReception } from './RcReception';
import { all, button, cleanup, click, dot, fake, field, leave, mount, plain, radio, seed, sign, stateNow, stubCanvas, text, tick, type as typeIn, write } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const nav = { tool: vi.fn() } as never;
const order = (id: string) => stateNow().deliveries[id];
const last = (id: string) => plain(order(id).journal!.at(-1)!.text);
const next = () => click(button(/^Suivant/));
const has = (re: RegExp) => !!button(re);
// the screen on an order, the person who hands over picked
async function open(id: string, who: string, onClose = () => {}) {
  const m = await mount(<RcReception id={id} onClose={onClose} nav={nav} />);
  if (who) await click(radio(who));
  return m;
}
// from the first step to the step asked (the first "Suivant" starts the delivery)
async function to(step: number) { for (let i = 1; i < step; i++) await next(); }

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); stubCanvas(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the first step', () => {
  it('"Suivant" is shut until the person who hands over is picked, and says why', SLOW, async () => {
    const m = await open('dl_demo_9', '');
    expect(text()).toContain('Étape 1 sur 5');
    expect(button(/^Suivant/).disabled).toBe(true);
    expect(text()).toContain('Aucune personne choisie : « Suivant » reste fermé.');
    await click(radio('Nicolas R.'));
    expect(button(/^Suivant/).disabled).toBe(false);
    expect(fake.writes).toBe(0);                          // looking, picking a person: nothing is written
    await m.unmount();
  });
  it('the first "Suivant" writes the moment of the delivery, the place, the delivery note and the name typed in ONE write of the company (not one per field)', SLOW, async () => {
    write(s => { s.deliveries.dl_demo_9.reception.name = 'M. Perrin'; });   // a name is known: its field is drawn on the first step
    const m = await open('dl_demo_9', 'Nicolas R.');
    await typeIn(field('#rcr-place'), 'Atelier du client, quai 2');
    await typeIn(field('#rcr-bl'), 'BL-8841');
    await typeIn(field('input[aria-label="Nom de la personne qui réceptionne"]'), 'M. Dupuis');
    expect(fake.writes).toBe(0);                          // typing writes after a pause, not at every key
    await next();
    expect(text()).toContain('Étape 2 sur 5');
    expect(fake.writes).toBe(1);
    expect(order('dl_demo_9').reception).toMatchObject({ date: '2026-09-25', time: '10:00', place: 'Atelier du client, quai 2', bl: 'BL-8841', name: 'M. Dupuis' });
    await m.unmount();
  });
  it('the first "Suivant" starts the delivery even when nothing is typed (the moment, the person, one line of the journal), and only the first one does', SLOW, async () => {
    const m = await open('dl_demo_9', 'Nicolas R.');
    expect(order('dl_demo_9').reception.date).toBe('');
    await next();
    expect(fake.writes).toBe(1);
    expect(order('dl_demo_9').reception).toMatchObject({ date: '2026-09-25', time: '10:00' });
    expect(order('dl_demo_9').journal!.at(-1)).toMatchObject({ by: 'Nicolas R.', at: '2026-09-25T10:00' });
    const lines = order('dl_demo_9').journal!.length;
    await click(button(/^Précédent/));
    await next();
    expect(fake.writes).toBe(1);                            // going back and on again starts nothing a second time
    expect(order('dl_demo_9').journal).toHaveLength(lines);
    await m.unmount();
  });
  it('a field typed and left is written once, and only after the pause when it is not left (1.2 s after the last key)', SLOW, async () => {
    const m = await open('dl_demo_9', 'Nicolas R.');
    const bl = field('#rcr-bl');
    await typeIn(bl, 'BL-1');
    await typeIn(bl, 'BL-12');
    await tick(1100);
    expect(fake.writes).toBe(0);
    await tick(200);
    expect(fake.writes).toBe(1);
    expect(order('dl_demo_9').reception.bl).toBe('BL-12');
    await typeIn(bl, 'BL-123');
    await leave(bl);
    expect(order('dl_demo_9').reception.bl).toBe('BL-123');
    expect(fake.writes).toBe(2);
    await m.unmount();
  });
});

describe('the quantity', () => {
  const qtyStep = async () => { const m = await open('dl_demo_13', 'Karim T.'); await to(3); await click(button(/^Sans réserve/)); return m; };
  it('is read in French: "1 250" is 1250 (never erased), a comma is a decimal point, an empty field is "all the rest"', SLOW, async () => {
    const m = await qtyStep();
    const qty = field('#rcr-qty');
    await typeIn(qty, '4'); await leave(qty);
    expect(order('dl_demo_13').reception.qty).toBe(4);
    await typeIn(qty, '1 250'); await leave(qty);
    expect(order('dl_demo_13').reception.qty).toBe(1250);
    await typeIn(qty, '2,5'); await leave(qty);
    expect(order('dl_demo_13').reception.qty).toBe(2.5);
    await typeIn(qty, ''); await leave(qty);
    expect(order('dl_demo_13').reception.qty).toBeNull();
    await m.unmount();
  });
  it('a text that is not a quantity is said and writes nothing: the field keeps what was typed', SLOW, async () => {
    const m = await qtyStep();
    const qty = field('#rcr-qty');
    await typeIn(qty, '12'); await leave(qty);
    const writes = fake.writes;
    await typeIn(qty, '12 pièces'); await leave(qty);
    expect(text()).toContain('Nombre attendu : « 12 pièces » n\'est pas une quantité, rien n\'est enregistré.');
    expect(order('dl_demo_13').reception.qty).toBe(12);
    expect(qty.value).toBe('12 pièces');
    await typeIn(qty, '-3'); await leave(qty);
    expect(text()).toContain('Une quantité n\'est pas négative : « -3 » n\'est pas enregistré.');
    expect(order('dl_demo_13').reception.qty).toBe(12);
    expect(fake.writes).toBe(writes);
    await m.unmount();
  });
});

describe('the result', () => {
  it('"Sans réserve" is refused while a reservation is open: the fact is said, nothing is written; "Avec réserve" takes it', SLOW, async () => {
    const m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    expect(has(/^Ajouter la réserve$/)).toBe(false);                       // the form is closed until it is asked for
    expect(button(/^Sans réserve/).getAttribute('aria-pressed')).toBe('true');   // no reservation: "sans réserve" is the proposal (not written yet)
    expect(order('dl_demo_13').reception.result).toBe('');
    await click(button(/^\+ Ajouter une réserve/));
    await typeIn(field('#rcr-rv-text'), 'Rayure sur un portillon');
    await click(button(/^Ajouter la réserve$/));
    expect(order('dl_demo_13').reception.result).toBe('');
    expect(has(/^Ajouter la réserve$/)).toBe(false);                       // the form closes after the reservation is added
    expect(has(/^\+ Ajouter une autre réserve/)).toBe(true);
    expect(button(/^Avec réserve/).getAttribute('aria-pressed')).toBe('true');    // a reservation is noted: "avec réserve" is the proposal
    await click(button(/^Sans réserve/));
    expect(text()).toContain('Réserve ouverte : le résultat « sans réserve » n\'est pas possible.');
    expect(order('dl_demo_13').reception.result).toBe('');
    await click(button(/^Avec réserve/));
    expect(order('dl_demo_13').reception.result).toBe('reserve');
    await m.unmount();
  });
  it('"Refusée" asks its motive: nothing is written before a motive is chosen, "Suivant" stays shut until the motive and the follow-up are given', SLOW, async () => {
    const m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    await click(button(/^Refusée/));
    expect(text()).toContain('Motif du refus');
    expect(order('dl_demo_13').reception.result).toBe('');
    expect(button(/^Suivant/).disabled).toBe(true);
    expect(text()).toContain('Aucun motif choisi.');
    const motive = all('[role=group][aria-label="Motif du refus"] button').find(b => b.textContent !== 'Autre, précisez')!;
    await click(motive);
    expect(order('dl_demo_13').reception.result).toBe('refus');
    expect(order('dl_demo_13').reception.refusal?.reason).toBe(motive.textContent);
    expect(button(/^Suivant/).disabled).toBe(false);
    await m.unmount();
  });
  it('"Autre, précisez" for a motive writes nothing until its words are typed', SLOW, async () => {
    const m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    await click(button(/^Refusée/));
    await click(all('[role=group][aria-label="Motif du refus"] button').find(b => b.textContent === 'Autre, précisez')!);
    expect(order('dl_demo_13').reception.result).toBe('');
    expect(text()).toContain('Précisez le motif (obligatoire)');
    expect(button(/^Suivant/).disabled).toBe(true);
    await typeIn(field('#rcr-other'), 'Teinte non conforme'); await leave(field('#rcr-other'));
    expect(order('dl_demo_13').reception.refusal).toMatchObject({ reason: 'Autre', other: 'Teinte non conforme' });
    expect(button(/^Suivant/).disabled).toBe(false);
    await m.unmount();
  });
});

describe('the signatures', () => {
  // dl_demo_13: delivered, released, the customer's name is known: the result chosen, the step of the signatures
  const signing = async (name = '') => {
    const m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    await next();                                           // "Suivant" writes the proposed result (no reservation: sans réserve)
    if (name !== '') { await typeIn(field('#rcr-name'), name); }
    return m;
  };
  it('the PV is summed up before it is signed and what is signed is said above the button; until it is signed "Voir le PV" is the white secondary button and says on the next step that the PV is not signed', SLOW, async () => {
    const m = await signing();
    expect(text()).toContain('Contenu du PV avant la signature');
    expect(text()).toContain('Vous signez : Réception prononcée sans réserve · quantité reçue 40.');
    expect(button(/^Valider la signature du client/).disabled).toBe(true);   // no trace yet
    expect(button(/^Voir le PV/).className).toContain('bg-white');           // the main gesture is the signature, not the way on
    expect(button(/^Voir le PV/).disabled).toBe(false);
    await click(button(/^Voir le PV/));
    expect(all('h1').map(h => h.textContent)).toEqual(['PV pas encore signé']);
    expect(text()).toContain('PV pas encore signé : il est affiché tel qu\'il est écrit.');
    expect(isLocked(order('dl_demo_13'))).toBe(false);
    await m.unmount();
  });
  it('a customer name is required to sign, and a trace too short is said and not kept', SLOW, async () => {
    const m = await signing('');
    await typeIn(field('#rcr-name'), '');
    await sign('Signature du client');
    expect(button(/^Valider la signature du client/).disabled).toBe(true);   // a trace, no name
    expect(text()).toContain('Nom du client pas encore écrit');
    await typeIn(field('#rcr-name'), 'M. Durand');
    expect(button(/^Valider la signature du client/).disabled).toBe(false);
    await click(button(/^Effacer/));
    await dot('Signature du client');
    expect(text()).toContain('Tracé trop court');
    expect(button(/^Valider la signature du client/).disabled).toBe(true);
    expect(isLocked(order('dl_demo_13'))).toBe(false);
    await m.unmount();
  });
  it('the signature of the customer locks the PV, gives it its number and a seal, and writes the journal in the name of the person who collects it, in ONE write', SLOW, async () => {
    const m = await signing('M. Durand');
    const others = Object.values(stateNow().deliveries).flatMap(d => [d.reception.pvNo, ...(d.lots ?? []).map(l => l.reception.pvNo)]).filter(Boolean);
    await sign('Signature du client');
    await leave(field('#rcr-name'));                        // the name typed is written when its field is left: the gesture below is the signature alone
    const before = fake.writes;
    await click(button(/^Valider la signature du client/));
    expect(fake.writes - before).toBe(1);
    const d = order('dl_demo_13');
    expect(isLocked(d)).toBe(true);
    expect(pvSigned(d)).toBe(true);
    expect(d.reception.pvNo).toMatch(/^PV-2026-\d{3}$/);
    expect(others).not.toContain(d.reception.pvNo);
    expect(d.reception).toMatchObject({ name: 'M. Durand', result: 'sans', signedAt: '2026-09-25T10:00' });
    expect(d.reception.seals).toHaveLength(1);
    expect(d.signClient?.length).toBeGreaterThan(0);
    expect(d.journal!.find(e => e.text === 'PV signé par le client (M. Durand)')).toMatchObject({ by: 'Karim T.', proof: true });
    expect(last('dl_demo_13')).toMatch(/^Scellé SHA-256 posé : /);
    await m.unmount();
  });
  it('once the customer has signed the PV is said signed, with its number, who signed and when; the step is called "PV signé" and "Voir le PV" is open', SLOW, async () => {
    const m = await signing('M. Durand');
    await sign('Signature du client');
    await click(button(/^Valider la signature du client/));
    expect(text()).toContain(`${order('dl_demo_13').reception.pvNo} signé par M. Durand, 25 sept. à 10 h 00. Contenu verrouillé.`);
    expect(all('h1').map(h => h.textContent)).toEqual(['PV signé']);
    expect(button(/^Voir le PV/).disabled).toBe(false);
    expect(text()).toContain('Le client a signé : le PV est verrouillé. La signature de l\'entreprise s\'ajoute avec un nouveau scellé.');
    await click(button(/^Voir le PV/));
    expect(text()).toContain('PV terminé');
    await m.unmount();
  });
  it('the company signs AFTER the customer: its pad stays open on a locked PV, the signature is added with a new seal and its own line of the journal', SLOW, async () => {
    const m = await signing('M. Durand');
    await sign('Signature du client');
    await click(button(/^Valider la signature du client/));
    expect(button(/^Valider la signature de l'entreprise/).disabled).toBe(true);   // no trace yet, but the way is not closed by the lock
    await sign('Signature de la personne qui remet pour l\'entreprise', 5);
    expect(button(/^Valider la signature de l'entreprise/).disabled).toBe(false);
    await click(button(/^Valider la signature de l'entreprise/));
    const d = order('dl_demo_13');
    expect(d.signCompany?.length).toBeGreaterThan(0);
    expect(d.reception.companySignedAt).toBe('2026-09-25T10:00');
    expect(d.reception.seals).toHaveLength(2);
    expect(d.signClient?.length).toBeGreaterThan(0);        // the customer's signature is untouched
    expect(d.journal!.filter(e => e.text === "PV signé pour l'entreprise").at(-1)).toMatchObject({ by: 'Karim T.', at: '2026-09-25T10:00' });
    expect(last('dl_demo_13')).toContain("(signature de l'entreprise)");
    expect(button(/^Valider la signature de l'entreprise/)).toBeUndefined();
    await m.unmount();
  });
  it('the same drawing is not accepted twice: the signature of another PV is said and not written', SLOW, async () => {
    write(s => { s.deliveries.dl_demo_9.signCompany = [[[20, 30], [60, 70], [100, 30], [140, 70], [180, 30], [220, 60]]]; });
    const m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    await click(button(/^Sans réserve/));
    await next();
    await typeIn(field('#rcr-name'), 'M. Durand');
    await sign('Signature du client');                      // the very trace of the signature of the company on another order
    expect(text()).toContain('elle n\'est pas enregistrée');
    expect(button(/^Valider la signature du client/).disabled).toBe(true);
    await m.unmount();
  });
});

describe('a signature that something stands in the way of', () => {
  it('is shut while a fact stands (nothing released), and opens with a waiver: who allows and why are written, in the journal too', SLOW, async () => {
    const m = await open('dl_demo_9', 'Nicolas R.');
    await to(3);
    await click(button(/^Sans réserve/));
    await next();
    expect(text()).toContain('Signature impossible sans dérogation');
    expect(text()).toContain('Rien n\'est libéré');
    await typeIn(field('#rcr-name'), 'M. Perrin');
    await sign('Signature du client');
    expect(button(/^Valider la signature du client/).disabled).toBe(true);
    await click(button(/^Signer malgré ces faits/));
    expect(button(/^Enregistrer la dérogation/).disabled).toBe(true);
    await click(radio('David K.', document.querySelector('[role=dialog][aria-labelledby]:last-of-type')!));
    await typeIn(field('#rcr-wvwhy'), 'Départ urgent, libération à poser ce soir');
    await click(button(/^Enregistrer la dérogation/));
    expect(order('dl_demo_9').reception.signWaiver).toMatchObject({ by: 'David K.', why: 'Départ urgent, libération à poser ce soir' });
    expect(last('dl_demo_9')).toBe('Signature autorisée par David K. malgré ce qui s\'y oppose : Départ urgent, libération à poser ce soir');
    expect(text()).toContain('Signature autorisée par dérogation');
    expect(button(/^Valider la signature du client/).disabled).toBe(false);
    expect(isLocked(order('dl_demo_9'))).toBe(false);       // allowed, not signed
    await m.unmount();
  });
});

describe('a signed PV', () => {
  it('opens on the last step, says it is locked, and offers no gesture of proof on the way back: the result is a fact, nothing is written', SLOW, async () => {
    const m = await open('dl_demo_1', '');
    expect(text()).toContain('Étape 5 sur 5');
    expect(all('h1').map(h => h.textContent)).toEqual(['PV terminé']);
    expect(text()).toMatch(/PV signé le .* scellé /);
    await click(button(/^Précédent/));                      // step 5: the signatures, laid
    expect(text()).toContain('Signé par');
    expect(has(/^Valider la signature du client/)).toBe(false);
    for (let i = 0; i < 3; i++) await click(button(/^Précédent/));
    await click(radio('Nicolas R.'));                       // a person picked does not open what a signed PV closed
    await to(3);
    expect(text()).toContain('Étape 3 sur 5');
    expect(all('[role=group][aria-label="Résultat de la réception"] button')).toHaveLength(0);   // a pill, not three buttons
    expect(all('[role=group][aria-label="Résultat de la réception"]')[0].textContent).toContain('Sans réserve');
    expect(all<HTMLFieldSetElement>('fieldset').every(f => f.disabled)).toBe(true);
    expect(fake.writes).toBe(0);
    await m.unmount();
  });
});

describe('what is typed and not added', () => {
  it('a reservation written and not added is asked about when going back or closing; "Ajouter la réserve et quitter" adds it, "Quitter sans enregistrer" drops it', SLOW, async () => {
    const closed = vi.fn(), m = await open('dl_demo_13', 'Karim T.', closed);
    await to(3);
    await click(button(/^\+ Ajouter une réserve/));
    await typeIn(field('#rcr-rv-text'), 'Poignée cassée');
    await click(button(/^Fermer l'écran/));
    expect(text()).toContain('Saisie pas encore enregistrée');
    expect(text()).toContain('la réserve écrite, pas encore ajoutée');
    await click(button(/^Revenir à l'écran/));
    expect(closed).not.toHaveBeenCalled();
    expect(reservesOf(order('dl_demo_13'))).toHaveLength(0);
    await click(button(/^Fermer l'écran/));
    await click(button(/^Ajouter la réserve et quitter/));
    expect(closed).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(order('dl_demo_13'))).toContain('Poignée cassée');
    await m.unmount();
  });
  it('a reservation written is kept in the tab over a reload', SLOW, async () => {
    let m = await open('dl_demo_13', 'Karim T.');
    await to(3);
    await click(button(/^\+ Ajouter une réserve/));
    await typeIn(field('#rcr-rv-text'), 'Poignée cassée');
    await m.unmount();
    m = await open('dl_demo_13', 'Karim T.');
    expect(text()).toContain('Pas encore enregistré : réserve écrite (étape 3).');
    await to(3);
    expect(field('#rcr-rv-text').value).toBe('Poignée cassée');
    await m.unmount();
  });
});

describe('an order that does not exist', () => {
  it('opens "Commande introuvable" for an address that is a key of the prototype, never a screen', SLOW, async () => {
    for (const id of ['__proto__', 'constructor', 'dl_inconnue']) {
      const m = await open(id, '');
      expect(text(), id).toContain('Commande introuvable');
      expect(has(/^Suivant/), id).toBe(false);
      await m.unmount();
    }
  });
});

