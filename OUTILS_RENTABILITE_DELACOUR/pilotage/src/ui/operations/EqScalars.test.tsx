// A field of the saved data of the wrong type (a hand edit, a newer version) must not stop a screen of tool 3.3: it reads as an empty one (audit N-06).
// Every screen that can be drawn without a window is drawn for each of the 23 shapes the audit tried on the example.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Equipment, Spare, State } from '../../domain/types';
import { demoState } from '../../domain/templates';
import { maintTodos } from '../../domain/maintenanceAll';
import { normalize } from '../../domain/migrate';
import { CabinetView, SpareRow } from './EqCabinet';
import { CabinetTab } from './EqCabinetTab';
import { EqCard, EqLine } from './EqCards';
import { ChecksTab } from './EqChecksTab';
import { ChecksView } from './EqChecksView';
import { IssuesTab } from './EqIssuesTab';
import { EqPrint } from './EqPrint';
import { EqQueue } from './EqQueue';
import { RoutineTab } from './EqRoutineTab';
import { SheetTab } from './EqSheetTab';
import { Maintenance } from './Maintenance';

const held = vi.hoisted(() => ({ state: undefined as unknown }));
vi.mock('../../store/StoreContext', () => ({ useStore: () => ({ state: held.state, update: vi.fn(), author: 'Test' }) }));
const noop = () => {};
const nav = { tool: noop, open: noop, openAction: noop, newAction: noop, openRisk: noop, settings: noop };
const CNC = 'eq_demo_cnc', SRV = 'eq_demo_serveur', VALVE = 'sp_demo_electrovanne', BELT = 'sp_demo_courroie';

type Loose = Record<string, unknown>;
const eq = (s: State, id: string) => s.equipments[id] as unknown as Loose;
const sp = (s: State, id: string) => s.spares[id] as unknown as Loose;
// the 23 shapes of the audit (V1/c_scalar.mjs), each applied to a copy of the example
const SHAPES: Record<string, (s: State) => void> = {
  'contract.until = {}': s => { (eq(s, CNC).contract as Loose).until = {}; },
  'contract.provider = 0': s => { (eq(s, CNC).contract as Loose).provider = 0; },
  'anomaly.dueAt = []': s => { (eq(s, SRV).anomalies as Loose[])[0].dueAt = []; },
  'anomaly.date = {}': s => { (eq(s, SRV).anomalies as Loose[])[0].date = {}; },
  'stoppedSince = []': s => { eq(s, SRV).stoppedSince = []; },
  'spare.order = "x"': s => { sp(s, VALVE).order = 'x'; },
  'spare.order.at = 5': s => { sp(s, VALVE).order = { qty: 1, at: 5, expectedAt: '' }; },
  'spare.moves[].at = {}': s => { (sp(s, BELT).moves as Loose[])[0].at = {}; },
  'spare.expiresAt = {}': s => { sp(s, BELT).expiresAt = {}; },
  'deputy = []': s => { eq(s, CNC).deputy = []; },
  'anomaly.handler = {}': s => { (eq(s, SRV).anomalies as Loose[])[0].handler = {}; },
  'breakdown.cause = []': s => { (eq(s, CNC).breakdowns as Loose[])[0].cause = []; },
  'breakdown.date = true': s => { (eq(s, CNC).breakdowns as Loose[])[0].date = true; },
  'check.every.unit = "x"': s => { (eq(s, CNC).tasks as Loose[])[0].every = { value: 2, unit: 'x' }; },
  'check.every = "x"': s => { (eq(s, CNC).tasks as Loose[])[0].every = 'x'; },
  'routine.every = 5': s => { eq(s, CNC).routine = { every: 5, day: 'a' }; },
  'inspection.date = 5': s => { (eq(s, CNC).inspections as Loose[])[0].date = 5; },
  'inspection.by = {}': s => { (eq(s, CNC).inspections as Loose[])[0].by = {}; },
  'name = 5': s => { eq(s, CNC).name = 5; },
  'location = []': s => { eq(s, CNC).location = []; },
  'kind = "zzz"': s => { eq(s, CNC).kind = 'zzz'; },
  'spare.min = "a"': s => { sp(s, BELT).min = 'a'; },
  'spare.name = 5': s => { sp(s, BELT).name = 5; },
  // the figures of the cabinet, and the date of the last count, as an object
  'spare.stock = {}': s => { sp(s, BELT).stock = {}; },
  'spare.leadDays = {}': s => { sp(s, BELT).leadDays = {}; },
  'spare.countedAt = {}': s => { sp(s, BELT).countedAt = {}; },
};

// every screen of the tool that is drawn without a window, on this state
function drawAll(s: State) {
  held.state = s;
  const now = new Date(), todos = maintTodos(s, now), parts: string[] = [];
  parts.push(renderToStaticMarkup(<Maintenance nav={nav} focus="" clearFocus={noop} />));
  parts.push(renderToStaticMarkup(<EqQueue state={s} todos={todos} nav={nav} offer={noop} onEq={noop} onRoutine={noop} onSpare={noop} onSettings={noop} />));
  parts.push(renderToStaticMarkup(<CabinetView state={s} onOpen={noop} onNew={noop} />));
  parts.push(renderToStaticMarkup(<ChecksView state={s} onOpen={noop} />));
  Object.values(s.spares).forEach((x: Spare) => parts.push(renderToStaticMarkup(<><SpareRow sp={x} state={s} offer={noop} now={now} onOpen={noop} /><SpareRow sp={x} state={s} offer={noop} now={now} onOpen={noop} compact /></>)));
  Object.values(s.equipments).forEach((e: Equipment) => {
    const p = { e, saved: e, state: s, by: 'Test', set: noop, act: noop, nav, openStation: noop }, c = { e, state: s, todos, now, onOpen: noop, onRoutine: noop, onPrint: noop };
    parts.push(renderToStaticMarkup(<><EqCard {...c} /><EqLine {...c} /><RoutineTab {...p} /><IssuesTab {...p} /><CabinetTab {...p} /><ChecksTab {...p} /><SheetTab {...p} undo={noop} /><EqPrint e={e} company="Entreprise" state={s} /></>));
  });
  return parts.join('');
}

// the fields the domain reads as empty whatever they hold (a screen can meet them without the load having cleaned them: another device, a merge)
const READ_AS_EMPTY = ['contract.until', 'contract.provider', 'anomaly.dueAt', 'stoppedSince', 'spare.order', 'spare.moves', 'spare.expiresAt', 'deputy', 'anomaly.handler', 'breakdown.cause', 'spare.min', 'spare.stock', 'spare.leadDays', 'spare.countedAt'];

describe('3.3 data of the wrong type do not stop a screen', () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' }, matchMedia: () => ({ matches: false }) }); });
  const example = demoState(new Date());
  it('draws the example', () => {
    const html = drawAll(structuredClone(example));
    expect(html).toContain('Contrôles échus');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('NaN');
  });
  it.each(Object.keys(SHAPES))('draws every screen with %s, after the load', name => {
    const s = structuredClone(example);
    SHAPES[name](s);
    expect(() => drawAll(normalize(s))).not.toThrow();
  });
  it.each(Object.keys(SHAPES).filter(k => READ_AS_EMPTY.some(f => k.startsWith(f))))('draws every screen with %s, as it arrives in memory', name => {
    const s = structuredClone(example);
    SHAPES[name](s);
    expect(() => drawAll(s)).not.toThrow();
  });
  it('shows the field that is wrong as empty, never as text of an object', () => {
    const s = structuredClone(example);
    ['anomaly.handler = {}', 'contract.provider = 0', 'deputy = []', 'spare.stock = {}', 'spare.countedAt = {}', 'spare.expiresAt = {}'].forEach(k => SHAPES[k](s));
    const html = drawAll(s);
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('NaN');
  });
});
