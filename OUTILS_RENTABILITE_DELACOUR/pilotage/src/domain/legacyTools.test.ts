// Rows of the previous version (text cells with emojis) converted into the new records.
import { describe, expect, it } from 'vitest';
import type { State } from './types';
import { legacyToolRecords } from './legacyTools';
import { emptyTools } from './base';
import { DEFAULT_SCALE } from './risk';

const now = new Date(2026, 8, 25);
const st = (over: Partial<State> = {}): State => ({
  settings: { companyName: '', profile: 'industrie', annualBudget: 600000, netMarginPct: 5, avgQuoteValue: 4500 },
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
  '2.2': { rows: [['Affaire 2026-04 - Client Durand', 'Ajout finition peinture thermolaquée RAL 7016', '+ 1 450 €', '+ 3 Jours', '✅ Accord SMS reçu 14/01', '📱 SMS Flash Envoyé', 'Facture N° 2026-89 (15/02/2026)']] },
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
    expect(imp.counts).toMatchObject({ '2.1': 1, '2.2': 1, '2.3': 1, '3.1': 2, '4.1': 1, '4.2': 1, '5.1': 1, '5.2': 1, '5.3': 1 });
    const s = st();
    imp.apply(s);
    const q = Object.values(s.quotes)[0];
    expect(q).toMatchObject({ ref: 'Devis N°101', client: 'Client A', amount: 35000, depositReceived: true });
    expect(q.cost).toMatchObject({ material: 12500, subcontract: 2500, hours: 145.5 });
    const c = Object.values(s.changes)[0];
    expect(c).toMatchObject({ client: 'Client Durand', price: 1450, delayDays: 3, answer: 'accepted', invoiceRef: '2026-89', invoicedAt: '2026-02-15' });
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
  it('never overwrites a monthly value already entered, and reads nothing from an empty browser', () => {
    const s = st({ values: { kpi_cnq: { '2026-01': 500 } } });
    expect(legacyToolRecords(OLD, s, now).counts['5.2']).toBe(0);
    expect(Object.values(legacyToolRecords({}, st(), now).counts).every(n => n === 0)).toBe(true);
  });
});
