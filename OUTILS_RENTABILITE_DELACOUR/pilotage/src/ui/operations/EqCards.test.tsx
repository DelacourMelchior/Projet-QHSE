// The cards and the lines of the list say facts: the first task of the equipment as a statement, never the infinitive of the queue.
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Anomaly, Equipment, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { maintTodos } from '../../domain/maintenanceAll';
import { completeness, eqLevel, eqTasks, newEquipment, stopEquipment } from '../../domain/maintenance';
import { norm } from '../../domain/instructions';
import { EqCard, EqLine, cardText } from './EqCards';
import { Ring } from './SopBits';

vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ update: vi.fn(), author: 'Test' }) }));
const now = new Date(2026, 8, 25, 10, 0);
const noop = () => {};
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');
// infinitives the queue starts its tasks with (audit M7-01) and the other verbs of orders
const VERBS = ['faire', 'prendre', 'reparer', 'suivre', 'verifier', 'lever', 'planifier', 'revoir', 'commander', 'compter', 'renseigner', 'relancer', 'traiter', 'signaler', 'controler', 'remplacer'];
const an = (over: Partial<Anomaly>): Anomaly => ({ id: 'a1', label: 'Fuite', date: '2026-09-20', note: '', closedAt: '', ...over });
const eq = (over: Partial<Equipment>): Equipment => ({ ...newEquipment(), id: 'e1', name: 'Presse', operator: 'Alice', manager: 'Marc', inspections: [{ date: '2026-09-22', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }], ...over });
const stateOf = (...es: Equipment[]): State => ({ ...demoState(now), equipments: Object.fromEntries(es.map(e => [e.id, e])) });

describe('3.3 the sentence of a card', () => {
  it('begins with no infinitive, for any equipment of the example, on a card and on a line', () => {
    const s = demoState(now), todos = maintTodos(s, now), eqs = Object.values(s.equipments);
    expect(eqs.length).toBeGreaterThanOrEqual(8);
    eqs.forEach(e => {
      const text = cardText(e, todos, s, now);
      expect(text.length, e.id).toBeGreaterThan(0);
      expect(VERBS, e.id).not.toContain(norm(text).split(/[\s']/)[0]);
      const props = { e, state: s, todos, now, onOpen: noop, onRoutine: noop, onPrint: noop };
      const html = renderToStaticMarkup(<EqCard {...props} />) + renderToStaticMarkup(<EqLine {...props} />);
      expect(html, e.id).toContain(esc(text));
      eqTasks(todos, e.id).forEach(t => expect(html.includes(esc(t.text)), `${e.id} ${t.id}`).toBe(false));   // the text of a task is nowhere on the card
    });
  });
  it('says the fact of the most serious task first, then how many others, the plural right', () => {
    const e = eq({ stoppedSince: '2026-09-25T05:00', inspections: [], anomalies: [an({ id: 'd', label: 'Câble', severity: 'danger', date: '2026-09-23' }), an({ id: 'x', label: 'Jeu' })] });
    const s = stateOf(e), todos = maintTodos(s, now);
    expect(eqTasks(todos, 'e1').map(t => t.kind)).toEqual(['danger', 'stopped', 'anomaly']);
    expect(cardText(e, todos, s, now)).toBe('Danger signalé le 23/09/2026 : Câble · et 2 autres points');
    expect(eqLevel(e, todos)).toEqual({ level: 'alert', label: 'Danger' });   // the status names the same task
    const one = eq({ stoppedSince: '2026-09-25T05:00' }), s1 = stateOf(one);
    expect(cardText(one, maintTodos(s1, now), s1, now)).toBe("À l'arrêt depuis 5 h");
    const two = eq({ anomalies: [an({ id: 'x', label: 'Jeu' })], inspections: [] }), s2 = stateOf(two);
    expect(cardText(two, maintTodos(s2, now), s2, now)).toBe('Anomalie ouverte : Jeu, depuis le 20/09/2026 · et 1 autre point');
  });
  it('keeps the card and the status in step on a routine to do and a check: the status and the sentence name the same thing', () => {
    const e = eq({ inspections: [], tasks: [{ id: 'k', label: 'Extincteurs', everyDays: 365, lastDone: '2025-01-01', legal: false }] });
    const s = stateOf(e), todos = maintTodos(s, now);
    expect(eqTasks(todos, 'e1').map(t => t.kind)).toEqual(['check', 'routine']);   // the check ranks above the routine, as in the status
    expect(eqLevel(e, todos).label).toBe('Contrôle');
    expect(cardText(e, todos, s, now)).toBe('Contrôle « Extincteurs » échu depuis 267 jours · et 1 autre point');
  });
  it('says, without a task, the next due date, and for a retired equipment its retirement', () => {
    const e = eq({}), s = stateOf(e);
    expect(cardText(e, [], s, now)).toBe('Prochaine échéance : Routine, le 28/09/2026');
    expect(cardText(eq({ retiredAt: '2026-09-01', retiredNote: 'Vendue' }), [], s, now)).toBe('Retiré du service le 01/09/2026 : Vendue');
  });
  it('says a holder away without deputy next to his name', () => {
    const e = eq({ inspections: [] }), s = { ...stateOf(e), people: { a: { id: 'a', name: 'Alice', role: '', active: true, absences: [{ from: '2026-09-24', to: '2026-09-26' }] } } };
    const html = renderToStaticMarkup(<EqCard e={e} state={s} todos={[]} now={now} onOpen={noop} onRoutine={noop} onPrint={noop} />);
    expect(html).toContain('Routine : Alice (absent, sans suppléant)');
    const withDeputy = { ...e, deputy: 'Bruno' };
    expect(renderToStaticMarkup(<EqCard e={withDeputy} state={{ ...s, equipments: { e1: withDeputy } }} todos={[]} now={now} onOpen={noop} onRoutine={noop} onPrint={noop} />)).toContain('Routine : Bruno (suppléant)');
    expect(stopEquipment(e, 'A').stoppedSince).toBeTruthy();
  });
});

const props = (e: Equipment, state: State, todos = maintTodos(state, now)) => ({ e, state, todos, now, onOpen: noop, onRoutine: noop, onPrint: noop });

describe('3.3 one action, one label: "Faire la routine" in words on a card and on a line', () => {
  const e = eq({ inspections: [] }), s = stateOf(e);
  it('writes "Faire la routine" on the card and on the line, with the name of the equipment, and keeps the printer alone and quiet', () => {
    for (const html of [renderToStaticMarkup(<EqCard {...props(e, s)} />), renderToStaticMarkup(<EqLine {...props(e, s)} />)]) {
      expect(html).toContain('aria-label="Faire la routine : Presse"');
      expect(html).toMatch(/<button[^>]*aria-label="Faire la routine : Presse"[^>]*>Faire la routine<\/button>/);
      expect(html).not.toContain('Routine en plein écran');   // the icon alone is gone
      expect(html).toMatch(/aria-label="Imprimer l&#x27;affiche : Presse"[^>]*class="[^"]*text-slate-500/);
      expect(html).not.toMatch(/Imprimer[^<]*<\/button>/);   // no word next to the printer
    }
    expect(renderToStaticMarkup(<EqCard {...props(e, s)} />)).toMatch(/aria-label="Faire la routine : Presse" class="[^"]*max-sm:min-h-\[44px\][^"]*!py-1"/);   // 44 px on a phone
  });
  it('draws the button only where a routine can be made: not on a stopped equipment, not on a retired one', () => {
    for (const x of [eq({ stoppedSince: '2026-09-25T05:00' }), eq({ retiredAt: '2026-09-01' })]) {
      const st = stateOf(x);
      for (const html of [renderToStaticMarkup(<EqCard {...props(x, st)} />), renderToStaticMarkup(<EqLine {...props(x, st)} />)]) {
        expect(html).not.toContain('Faire la routine');
        expect(html).toContain('Imprimer l&#x27;affiche');
      }
    }
  });
  it('hides "Faire la routine" when the routine of the period is made, and offers "Signaler" where a problem can be reported', () => {
    const done = eq({}), st = stateOf(done);
    expect(done.inspections.length).toBe(1);
    for (const html of [renderToStaticMarkup(<EqCard {...props(done, st)} onReport={noop} />), renderToStaticMarkup(<EqLine {...props(done, st)} onReport={noop} />)]) {
      expect(html).not.toContain('Faire la routine');
      expect(html).toContain('aria-label="Signaler un problème : Presse"');
    }
    expect(renderToStaticMarkup(<EqCard {...props(e, s)} onReport={noop} />)).toContain('Faire la routine');
    expect(renderToStaticMarkup(<EqCard {...props(eq({ retiredAt: '2026-09-01' }), stateOf(eq({ retiredAt: '2026-09-01' })))} onReport={noop} />)).not.toContain('Signaler');
  });
  it('wraps the line of a list under the text on a phone (the button on its own line, 44 px), in the row from 640 px', () => {
    const html = renderToStaticMarkup(<EqLine {...props(e, s)} />);
    expect(html).toMatch(/<li class="flex flex-wrap [^"]*sm:flex-nowrap/);
    expect(html).toContain('max-sm:basis-full');
    expect(html).toContain('max-sm:pl-[4.5rem]');
  });
});

describe('3.3 a date is never cut: the words give way, not the day', () => {
  it('keeps the date of the next step in its own span that does not shrink, on the card and on the line', () => {
    const e = eq({ anomalies: [an({})] }), s = stateOf(e);   // a task, so that the card draws its next step
    const date = /<span class="min-w-0 truncate">Prochaine échéance : Routine<\/span><span class="shrink-0 whitespace-nowrap">, le 28\/09\/2026<\/span>/;
    expect(renderToStaticMarkup(<EqCard {...props(e, s)} />)).toMatch(date);
    expect(renderToStaticMarkup(<EqLine {...props(e, s)} />)).toMatch(date);
    expect(renderToStaticMarkup(<EqCard {...props(e, s)} />)).not.toMatch(/<span class="min-w-0 truncate text-\[11px\] text-slate-500">Prochaine/);
  });
  it('says a date passed the same way, with the whole sentence in the tooltip', () => {
    const e = eq({ inspections: [{ date: '2026-09-01', by: 'A', note: '', results: ['ok', 'ok', 'ok', 'ok', 'ok'] }], anomalies: [an({})] }), s = stateOf(e), html = renderToStaticMarkup(<EqCard {...props(e, s)} />);
    expect(html).toContain('title="Échéance dépassée : Routine à faire, le 20/09/2026"');
    expect(html).toContain('<span class="min-w-0 truncate">Échéance dépassée : Routine à faire</span><span class="shrink-0 whitespace-nowrap">, le 20/09/2026</span>');
  });
  it('does not clamp the description of a line to one line from 640 px: it keeps its two lines', () => {
    expect(renderToStaticMarkup(<EqLine {...props(eq({ anomalies: [an({})] }), stateOf(eq({ anomalies: [an({})] })))} />)).not.toMatch(/line-clamp-2 block text-\[11px\] text-slate-500 sm:truncate/);
  });
});

describe('3.3 the ring of completeness: nothing at 100 %, a figure of 11 px at least', () => {
  it('draws nothing at 100 %, on the cards and on the lines (7 equipment out of 8 of the example are complete)', () => {
    const s = demoState(now), todos = maintTodos(s, now), eqs = Object.values(s.equipments);
    expect(eqs.some(x => completeness(x).pct === 100)).toBe(true);
    eqs.forEach(x => {
      const html = renderToStaticMarkup(<EqCard {...props(x, s, todos)} />) + renderToStaticMarkup(<EqLine {...props(x, s, todos)} />);
      expect(html.includes('Fiche complète à'), x.id).toBe(completeness(x).pct < 100);
    });
    expect(renderToStaticMarkup(<Ring pct={100} size={38} />)).toBe('');
  });
  it('never sets the figure under 11 px once drawn, whatever the size of the ring', () => {
    for (const size of [24, 30, 36, 38, 44, 60]) {
      const html = renderToStaticMarkup(<Ring pct={67} size={size} />), fs = Number(html.match(/font-size="([\d.]+)"/)![1]);
      expect(fs * size / 36, `ring of ${size}`).toBeGreaterThanOrEqual(10.999);
    }
    expect(renderToStaticMarkup(<Ring pct={67} size={38} />)).toContain('Fiche complète à 67 %');
  });
});
