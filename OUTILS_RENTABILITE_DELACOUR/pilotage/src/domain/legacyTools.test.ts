// Rows of the previous version (text cells with emojis) converted into the new records.
import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { legacyToolRecords } from './legacyTools';
import { canRelease, checkMilestone, deliveryState, upgradeDelivery } from './receptions';
import { receptionTodos } from './receptionsAll';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5 },
  timeline: { start: '2026-01', end: '2026-12' }, processes: [], values: {}, actions: {}, risks: {}, contacts: {}, scale: DEFAULT_SCALE,
  kpis: { kpi_cnq: { id: 'kpi_cnq', role: 'cnq', name: 'CNQ', processId: 'P5', type: 'Garde-fou', unit: '€', direction: 'lower', aggregation: 'sum', target: '< 500 €', targetValue: 500, confidential: false, source: '' } },
  ...emptyTools(), ...over,
});

// Rows as the previous version stored them
const OLD = {
  '2.1': { rows: [
    ['Devis N°101 - Client A', '12 500 €', '8 000 €', '2 500 €', '35 000 €', '12 000 €', '34,3 %', '✅ Encaissé (10 500 €)', '✅ Validé BE & Atelier'],
    ['Seuil de Rentabilité Cible', '---', '---', '---', '---', '---', '30,0 %', 'Règle Stricte', 'Visa obligatoire avant émission'],
  ] },
  '2.3': { rows: [['14/01/2026', 'Client Dupuis - Affaire 88', 'Rayure profonde sur face laquée livrée', 'Atelier / Finition', '450 €', 'Marc Martin (Chef Atelier)', '✅ Envoyé sous 18h', '🟢 Clôturé (Pièce refaite express)']] },
  '3.1': { rows: [
    ['Fournisseur Alpha Tôlerie', 'Standard / Interchangeable', '✅ Réserves précises notées sur BL N°884', '4,5 h', '225 €', '4,0 / 10', '✅ Lettre Débit émise - Avoir reçu'],
    ['Exigence Qualité Seuil', '---', 'Règle Obligatoire', '0,0 h', '0 €', '8,0 / 10', 'Débit automatique dès 1ère défaillance'],
  ] },
  '4.1': { rows: [['Programmation Laser CNC', 'Jean Dupont', 'Marc Martin', '15/01/2026', '🟢 Conforme (< 90j)', '---', 'Directeur de Production', '< 1 heure']] },
  '4.2': { employees: ['Jean Dupont', 'Thomas Vincent'], skills: [{ name: 'Programmation Laser & FAO CNC', employees: [4, 2] }] },
  '5.1': { rows: [['BR-2026-08 (14/01 09h30)', 'Pièce Châssis N°405', 'Usure / Casse outillage', 'Filetage arraché au taraudage M12', '🔴 Rebut définitif (Destruction immédiate)', '380 €', 'Chef Atelier (14/01 15h00 - Traité en 5h30)']] },
  '5.2': { rows: [['Janvier 2026', '6,0 h (270 €)', '450 €', '0 €', '720 €', '14 400 €', '18 500 €', '🔴 Dépassement Plafond'], ['Plafond Toléré / Mois', '2,0 h / m', '100 € / m', '0 €', '300 €', '6 000 €', '0 € bloqué', 'Seuil']] },
  '5.3': { sessions: [{ id: '5p-2026-001', date: '2026-01-14', problem: 'Inversion connecteurs', participants: 'Opérateur', pilot: 'Resp. Méthodes', why1: 'a', why2: 'b', why3: 'c', why4: 'd', why5: 'Absence de détrompeur', reverseTestValid: true, countermeasure: 'Ergot asymétrique', deadline: '2026-01-21', cost: 150, status: 'effective' }] },
};

describe('previous version of tools 2 to 5', () => {
  it('converts every register, skips the template lines, strips the emojis', () => {
    const imp = legacyToolRecords(OLD, st(), now);
    expect(imp.counts).toMatchObject({ '2.1': 1, '2.3': 1, '3.1': 2, '4.1': 1, '4.2': 1, '5.1': 1, '5.2': 1, '5.3': 1 });
    const s = st();
    imp.apply(s);
    const q = Object.values(s.quotes)[0];
    expect(q).toMatchObject({ ref: 'Devis N°101', client: 'Client A', amount: 35000, depositReceived: true });
    expect(q.cost).toMatchObject({ material: 12500, subcontract: 2500, hours: 145.5 });
    const cp = Object.values(s.complaints)[0];
    expect(cp).toMatchObject({ at: '2026-01-14T09:00', contactedAt: '2026-01-15T03:00', client: 'Client Dupuis', processId: 'P5', cost: 450, pilot: 'Marc Martin', courtesyAt: '2026-01-14' });
    const d = Object.values(s.debits)[0];
    expect(d).toMatchObject({ reserveOnBl: true, reworkHours: 4.5, recovered: 225, answer: 'accepted' });
    expect(Object.values(s.suppliers)[0].ratings[0]).toMatchObject({ quality: 16, delay: 16, service: 8 });
    expect(Object.values(s.powers)[0]).toMatchObject({ holder: 'Jean Dupont', deputies: ['Marc Martin', ''], practiced: ['2026-01-15', ''] });
    const k = Object.values(s.skills)[0];
    expect(Object.values(k.levels)).toEqual([4, 2]);
    expect(Object.values(s.people).map(p => p.name)).toEqual(['Jean Dupont', 'Thomas Vincent']);
    const n = Object.values(s.ncs)[0];
    expect(n).toMatchObject({ ref: 'BR-2026-08', at: '2026-01-14T09:30', cause: 'outillage', decision: 'rebut', description: 'Filetage arraché au taraudage M12' });
    expect(n.cost.scrap).toBe(380);
    expect(s.values.kpi_cnq['2026-01']).toBe(720);
    const a = Object.values(s.analyses)[0];
    expect(a).toMatchObject({ rootCause: 'Absence de détrompeur', backCheck: true });
    expect(Object.values(s.actions)[0]).toMatchObject({ ref: { kind: 'analysis', id: a.id }, status: 'effective', cost: 150 });
  });
  it('turns the old release rows into orders of 3.4: the milestones of the first version (metalwork), no amount, an id each once upgraded', () => {
    const rows = [['OF-12', 'Portail (Qté : 4)', 'Cote mesurée conforme', 'Reste à vérifier', 'Première pièce validée', '', 'Notice jointe', 'Libéré']];
    const imp = legacyToolRecords({ '3.2': { rows } }, st(), now), s = st();
    expect(imp.counts['3.4']).toBe(1);
    imp.apply(s);
    const d = Object.values(s.deliveries)[0];
    expect(d).toMatchObject({ ref: 'OF-12', item: 'Portail', qty: 4, releasedBy: '', releasedAt: '' });
    expect(d.milestones.map(m => [m.label, m.ok])).toEqual([['Première pièce', true], ['Cote critique 1', true], ['Cote critique 2', null], ['Libération finale', true]]);
    expect(d.milestones[3]).toMatchObject({ point: 'Propreté, accessoires, emballage', requirement: 'Notice jointe, aucune rayure', measured: 'Notice jointe' });
    expect(d.reception).toMatchObject({ result: '', amount: null });
    expect(upgradeDelivery(d).milestones.map(m => m.id)).toEqual(['ms_legacy_0', 'ms_legacy_1', 'ms_legacy_2', 'ms_legacy_3']);
  });
  it('a row "Libéré" invents no release: no person, no day, the order is not released, no task to deliver, one line of the journal says what the old table said (X-16)', () => {
    const rows = [['OF-12', 'Portail (Qté : 4)', 'Cote mesurée conforme', 'Reste à vérifier', 'Première pièce validée', '', 'Notice jointe', 'Libéré'], ['OF-13', 'Garde-corps', 'À mesurer', '---', '', '', '', '']];
    const s = st();
    legacyToolRecords({ '3.2': { rows } }, s, now).apply(s);
    const [released, other] = Object.values(s.deliveries).map(d => upgradeDelivery(d));
    expect([released.releasedBy, released.releasedAt, released.releasedMoment]).toEqual(['', '', undefined]);
    expect(released.journal).toEqual([{ at: '2026-09-25T00:00', by: 'Ancienne version', text: "Libérée dans l'ancien classeur (date inconnue)" }]);
    expect(other.journal).toBeUndefined();   // a row that is not released writes nothing
    expect(deliveryState(released, now, s.params)).toBe('in_progress');
    expect(canRelease(s, released).ok).toBe(false);
    expect(receptionTodos(s, now).filter(t => /Livrer/.test(t.text) || t.kind === 'ship')).toEqual([]);   // no "Livrer OF-12" without a date
  });
  it('never overwrites a monthly value already entered, and reads nothing from an empty browser', () => {
    const s = st({ values: { kpi_cnq: { '2026-01': 500 } } });
    expect(legacyToolRecords(OLD, s, now).counts['5.2']).toBe(0);
    expect(Object.values(legacyToolRecords({}, st(), now).counts).every(n => n === 0)).toBe(true);
  });
  it('never writes again a record already taken from the old tables, so a second import keeps the work done on it, and says how many were left alone (X-3)', () => {
    const rows = [['OF-12', 'Portail (Qté : 4)', 'Cote mesurée conforme', 'Reste à vérifier', 'Première pièce validée', '', 'Notice jointe', 'Libéré'], ['OF-13', 'Garde-corps', 'À mesurer', '---', '', '', '', '']];
    const imp = legacyToolRecords({ ...OLD, '3.2': { rows } }, st(), now), s = st();
    expect(imp.apply(s)).toBe('');   // nothing was there: nothing is left alone
    const id = Object.keys(s.deliveries)[1];
    s.deliveries[id] = checkMilestone(upgradeDelivery(s.deliveries[id]), 'ms_legacy_0', { ok: true, by: 'Zoé', at: '2026-09-25T09:00', measured: '12' });
    const q = Object.keys(s.quotes)[0], n = Object.keys(s.ncs)[0];
    s.quotes[q] = { ...s.quotes[q], client: 'Client renommé' };
    s.ncs[n] = { ...s.ncs[n], decisionNote: 'Ma note' };
    s.values.kpi_cnq['2026-01'] = 999;
    const worked = structuredClone(s);
    const said = imp.apply(s);
    expect(said).toMatch(/^\d+ éléments déjà repris sont gardés tels quels\.$/);
    expect(Number(said.split(' ')[0])).toBe(14);   // quote, complaint, supplier, debit, 2 orders, power, 2 people, skill, defect, analysis, action, and the monthly value
    expect(s).toEqual(worked);   // the checked milestone, the renamed quote, the note, the typed value: all stay
    expect(s.deliveries[id].milestones[0]).toMatchObject({ ok: true, by: 'Zoé' });
    // a row added to the old tables since comes in; one record left alone is said in the singular
    const more = legacyToolRecords({ '3.2': { rows: [...rows, ['OF-14', 'Rampe (Qté : 2)', 'Cote conforme', 'Cote conforme', 'Validée', '', 'ok', 'En attente']] } }, s, now);
    expect(more.apply(s)).toBe('2 éléments déjà repris sont gardés tels quels.');
    expect(Object.values(s.deliveries).map(d => d.ref).sort()).toEqual(['OF-12', 'OF-13', 'OF-14']);
    expect(legacyToolRecords({ '3.2': { rows: [rows[0]] } }, s, now).apply(s)).toBe('1 élément déjà repris est gardé tel quel.');
  });
  it('reads a name of Object.prototype among the employees as a person, not as an existing one (S-12)', () => {
    const s = st();
    legacyToolRecords({ '4.2': { employees: ['constructor', 'toString'], skills: [{ name: 'Soudure', employees: [3, 2] }] } }, s, now).apply(s);
    expect(Object.values(s.people).map(p => p.name)).toEqual(['constructor', 'toString']);
    expect(Object.values(Object.values(s.skills)[0].levels)).toEqual([3, 2]);
  });
});
