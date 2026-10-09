// @vitest-environment happy-dom
// The settings of tool 3.4 (RcSettings), PLAYED in a DOM (happy-dom; the store is the reactive stand-in of testDom.tsx, the clock is stopped): every text and number field keeps what is typed and
// writes it 1,2 s after the last key and when it is left (one write of the company per pause, never one per key); a number is read in French and kept between its bounds, an empty field goes back to the
// default of the tool; the lists end with "Autre, précisez" and can be taken back to the list of the tool; a row removed comes back with "Annuler"; the people who release; the clause of retention.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoState } from '../../domain/templates';
import { DEFAULT_REFUSALS, templatesOf } from '../../domain/receptions';
import { RcSettings } from './RcSettings';
import { all, button, cleanup, click, enter, fake, field, leave, mount, plain, seed, stateNow, text, tick, type as typeIn } from './testDom';

vi.mock('../../store/StoreContext', async () => (await import('./testDom')).fakeStore());

const NOW = new Date(2026, 8, 25, 10, 0), SLOW = { timeout: 30000 };
const cfg = () => stateNow().params.reception ?? {};
const label = (re: RegExp) => all('input,select').find(e => re.test(e.getAttribute('aria-label') ?? ''))!;
// the field of a `Field` (its label is the text above it)
const fieldOf = (title: RegExp) => [...document.querySelectorAll('label')].find(l => title.test(plain(l.textContent)))!.querySelector('input')!;

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }); vi.setSystemTime(NOW); seed(demoState(NOW)); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('a text field (the motives of a refusal)', () => {
  it('shows the list of the tool, writes nothing while it is typed, and one write 1,2 s after the last key', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const first = label(/^Motif 1$/) as HTMLInputElement, was = first.value;
    expect(cfg().refusals).toBeUndefined();               // the list of the tool is the one in use
    await typeIn(first, `${was} grave`);
    await tick(1100);
    expect(fake.writes).toBe(0);
    await typeIn(first, `${was} très grave`);
    await tick(1100);
    expect(fake.writes).toBe(0);                          // the pause starts again at every key
    await tick(200);
    expect(fake.writes).toBe(1);
    expect(cfg().refusals![0]).toBe(`${was} très grave`);
    expect(cfg().refusals!.slice(1)).toEqual(DEFAULT_REFUSALS.filter(x => x !== 'Autre').slice(1));
    await m.unmount();
  });
  it('is written at once when the field is left', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const first = label(/^Motif 1$/) as HTMLInputElement;
    await typeIn(first, 'Quantité non conforme');
    await leave(first);
    expect(fake.writes).toBe(1);
    expect(cfg().refusals![0]).toBe('Quantité non conforme');
    await tick(2000);
    expect(fake.writes).toBe(1);                          // the pause that was running writes nothing more
    await m.unmount();
  });
  it('a row left as "Autre" goes when the field is left (the list ends with "Autre, précisez" by itself)', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const n = DEFAULT_REFUSALS.filter(x => x !== 'Autre').length;
    await click(button(/^Ajouter un motif/));
    expect(label(new RegExp(`^Motif ${n + 1}$`))).toBeDefined();
    const last = label(new RegExp(`^Motif ${n + 1}$`)) as HTMLInputElement;
    await typeIn(last, 'Autre'); await leave(last);
    expect(label(new RegExp(`^Motif ${n + 1}$`))).toBeUndefined();
    await m.unmount();
  });
  it('"Retirer" takes a row out and "Annuler" brings it back; "Remettre la liste de départ" goes back to the list of the tool', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const rows = DEFAULT_REFUSALS.filter(x => x !== 'Autre');
    await click(button(/^Retirer motif 1/));
    expect(cfg().refusals).toEqual(rows.slice(1));
    expect(text()).toContain('Retiré');
    await click(button(/^Annuler$/));
    expect(cfg().refusals).toBeUndefined();               // back to the list of the tool: nothing to keep
    await click(button(/^Retirer motif 1/));
    await click(button(/^Remettre la liste de départ/).closest('div')!.querySelector('button:last-child')!);
    expect(cfg().refusals).toBeUndefined();
    await m.unmount();
  });
});

describe('a number field', () => {
  it('is read in French and kept between its bounds: "1 2,5" ... "100" becomes 60, "0" becomes 1, a text writes nothing, an empty field goes back to the default', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const lift = fieldOf(/Délai de levée d'une réserve/);
    await enter(lift);
    await typeIn(lift, '10'); await tick(1300);
    expect(cfg().liftDays).toBe(10);
    expect(fake.writes).toBe(1);
    await typeIn(lift, '100'); await leave(lift);
    expect(cfg().liftDays).toBe(60);
    await enter(lift);
    await typeIn(lift, '0'); await leave(lift);
    expect(cfg().liftDays).toBe(1);
    const writes = fake.writes;
    await enter(lift);
    await typeIn(lift, 'abc'); await leave(lift);
    expect(cfg().liftDays).toBe(1);
    expect(fake.writes).toBe(writes);                     // not a number: nothing is written
    await enter(lift);
    await typeIn(lift, ''); await leave(lift);
    expect('liftDays' in cfg()).toBe(false);              // empty: the default of the tool
    await m.unmount();
  });
  it('writes nothing while it is typed', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const unsigned = fieldOf(/Jours avant « ?PV non signé/);
    await enter(unsigned);
    await typeIn(unsigned, '3');
    await tick(1000);
    expect(fake.writes).toBe(0);
    await tick(300);
    expect(cfg().unsignedDays).toBe(3);
    expect(fake.writes).toBe(1);
    await m.unmount();
  });
});

describe('the people who release, the clause of retention, the models', () => {
  it('a person ticked is kept, ticked again she goes; nobody ticked is the default (the key goes)', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const box = all('input[type=checkbox]').find(b => b.closest('label')!.textContent!.includes('Karim T.'))!;
    await click(box);
    expect(cfg().releasers).toEqual(['Karim T.']);
    await click(box);
    expect('releasers' in cfg()).toBe(false);
    await m.unmount();
  });
  it('"Ajouter" an other person is shut until a name is typed, then adds her (once) and empties the field', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const add = button(/^Ajouter$/);
    expect(add.disabled).toBe(true);
    const other = field('input[aria-label="Autre personne qui libère"]');
    await typeIn(other, 'Sophie V.');
    expect(add.disabled).toBe(false);
    await click(add);
    expect(cfg().releasers).toEqual(['Sophie V.']);
    expect(other.value).toBe('');
    await typeIn(other, ' sophie v. ');
    await click(add);
    expect(cfg().releasers).toEqual(['Sophie V.']);       // the same person under another writing is not added twice
    await m.unmount();
  });
  it('the retention clause is a mention: un-ticked with the default maximum it leaves nothing, ticked it keeps a maximum of 5 %', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const on = all('input[type=checkbox]').find(b => b.closest('label')!.textContent!.includes('Le contrat prévoit une retenue')) as HTMLInputElement;
    expect(on.checked).toBe(true);                        // the example holds a clause
    await click(on);
    expect('retention' in cfg()).toBe(false);
    await click(on);
    expect(cfg().retention).toEqual({ on: true, maxPct: 5 });
    await m.unmount();
  });
  it('a new model is added blank, its name is written 1,2 s after the last key, and it is offered to the new orders', SLOW, async () => {
    const m = await mount(<RcSettings />);
    const before = templatesOf(stateNow().params).length;
    await click(button(/^Nouveau modèle/));
    expect(cfg().templates).toHaveLength(1);
    expect(templatesOf(stateNow().params)).toHaveLength(before);   // blank, it is not offered yet
    await typeIn(fieldOf(/Nom du modèle/), 'Modèle maison');
    await tick(1300);
    expect(cfg().templates![0].name).toBe('Modèle maison');
    expect(templatesOf(stateNow().params)).toHaveLength(before + 1);   // a model without a name is not offered: named, it is
    expect(templatesOf(stateNow().params).map(t => t.name)).toContain('Modèle maison');
    await m.unmount();
  });
});

describe('a screen that goes away', () => {
  it('when the page is left or goes to the background, what was typed is written at once', SLOW, async () => {
    const m = await mount(<RcSettings />);
    await typeIn(label(/^Motif 1$/), 'Défaut de peinture');
    window.dispatchEvent(new Event('pagehide'));
    await tick(1);
    expect(cfg().refusals![0]).toBe('Défaut de peinture');
    expect(fake.writes).toBe(1);
    await tick(2000);
    expect(fake.writes).toBe(1);
    await m.unmount();
  });
  it('writes what was typed and not yet written (nothing typed is lost)', SLOW, async () => {
    const m = await mount(<RcSettings />);
    await typeIn(label(/^Motif 1$/), 'Hors délai');
    await m.unmount();
    expect(cfg().refusals![0]).toBe('Hors délai');
  });
});
