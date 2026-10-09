// Tool 3.1, purchasing sectors: order of recourse, backups ready to take over, backup in service, alerts, tasks, Plans B.
import { describe, expect, it } from 'vitest';
import type { Sector, State, Supplier } from './types';
import { demoState } from './templates';
import { allTasks } from './tasks';
import { toolBadge } from './status';
import { flatten, unflatten } from '../store/flat';
import { completeSupplierExamples } from './supplierExamples';
import {
  activeSwitch, backupReadiness, endSwitch, fullTimeline, hasPlanB, newSector, NO_DELIVERY, proposeSectors, reordered, sectorBadge, sectorCover, sectorCovered, sectorInsights, sectorRanking, sectorRiskText, sectorState,
  sectorSummary, sectorTarget, sectorTasks, startSwitch, switchReason,
} from './sectors';

const now = new Date(2026, 8, 25, 10, 0);   // Friday
const demo = (): State => demoState(now);
const ids = (s: State, sec: Sector) => sectorRanking(s, sec, now).map(y => y.x.id);

describe('3.1 purchasing sectors', () => {
  it('puts the best rated first, unless the company set the order, and the suspended ones last', () => {
    const s = demo();
    expect(ids(s, s.sectors.sec_demo_transport)).toEqual(['sup_demo_messagerie', 'sup_demo_transport']);   // 86 before 71
    expect(ids(s, s.sectors.sec_demo_tole)).toEqual(['sup_demo_acier', 'sup_demo_distrib']);   // the company's order, although Distributeur B is rated 90 against 82
    const auto = { ...s, sectors: { ...s.sectors, sec_demo_tole: { ...s.sectors.sec_demo_tole, manual: false } } };
    expect(ids(auto, auto.sectors.sec_demo_tole)).toEqual(['sup_demo_distrib', 'sup_demo_acier']);
    const out = { ...s, suppliers: { ...s.suppliers, sup_demo_messagerie: { ...s.suppliers.sup_demo_messagerie, status: 'suspended' as const } } };
    const r = sectorRanking(out, out.sectors.sec_demo_transport, now);
    expect(r.map(y => y.role)).toEqual(['main', 'out']);
    expect(r[0].x.id).toBe('sup_demo_transport');
  });
  it('moves a supplier one place, up or down', () => {
    const s = demo(), r = sectorRanking(s, s.sectors.sec_demo_tole, now);
    expect(reordered(r, 'sup_demo_distrib', -1)).toEqual(['sup_demo_distrib', 'sup_demo_acier']);
    expect(reordered(r, 'sup_demo_acier', -1)).toEqual(['sup_demo_acier', 'sup_demo_distrib']);   // already first
    expect(reordered(r, 'sup_demo_distrib', 1)).toEqual(['sup_demo_acier', 'sup_demo_distrib']);   // already last
  });
  it('a backup is ready when it is referenced, rated A or B, followed on a delivery or a service, and somebody can be called on a checked number', () => {
    const s = demo();
    expect(backupReadiness(s, s.suppliers.sup_demo_distrib, now)).toEqual({ ok: true, missing: [] });
    const net = backupReadiness(s, s.suppliers.sup_demo_net, now);
    expect(net).toEqual({ ok: false, missing: [NO_DELIVERY] });
    const reseaux = backupReadiness(s, s.suppliers.sup_demo_reseaux, now);
    expect(reseaux.missing).toEqual(expect.arrayContaining(['à qualifier', NO_DELIVERY]));
    expect(backupReadiness(s, s.suppliers.sup_demo_usinage, now).missing).toEqual(expect.arrayContaining(['sous surveillance', 'classe C']));
    const nobody = { ...s, contacts: {} };
    expect(backupReadiness(nobody, nobody.suppliers.sup_demo_distrib, now).missing).toContain("aucune personne dans l'annuaire");
    const stale = { ...s, contacts: Object.fromEntries(Object.entries(s.contacts).map(([k, c]) => [k, { ...c, verifiedAt: '2024-01-01' }])) };
    expect(backupReadiness(stale, stale.suppliers.sup_demo_distrib, now).missing.join()).toContain('numéro pas vérifié');
  });
  it('says how each sector stands', () => {
    const s = demo();
    expect(['bureau', 'traiteur', 'tole', 'transport', 'conseil'].map(k => sectorState(s, s.sectors[`sec_demo_${k}`], now))).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    expect(sectorState(s, s.sectors.sec_demo_it, now)).toBe('unproven');
    expect(sectorState(s, s.sectors.sec_demo_proprete, now)).toBe('switched');
    expect(sectorState(s, s.sectors.sec_demo_usinage, now)).toBe('short');
    expect(sectorBadge(s, s.sectors.sec_demo_usinage, now)).toEqual({ level: 'alert', text: 'Pas de secours' });
    expect(sectorBadge(s, s.sectors.sec_demo_tole, now).level).toBe('ok');
    expect(sectorSummary(s, now)).toMatchObject({ count: 8, ok: 5, switched: 1, short: 1, unproven: 1, empty: 0, issues: 3 });
    const noBackupWanted = { ...s.sectors.sec_demo_usinage, target: 1 };
    expect(sectorTarget(noBackupWanted)).toBe(1);
    expect(sectorState({ ...s, sectors: { u: noBackupWanted } }, noBackupWanted, now)).toBe('ok');
    expect(sectorState(s, newSector('Vide'), now)).toBe('empty');
  });
  it('a backup that was never tried makes the sector "unproven"', () => {
    const s = demo();
    const sec: Sector = { ...s.sectors.sec_demo_proprete, switches: [] };
    expect(sectorState({ ...s, sectors: { p: sec } }, sec, now)).toBe('unproven');
  });
  it('puts the backup in service, then back to the main supplier, with the history kept', () => {
    const s = demo();
    const sec = s.sectors.sec_demo_tole;
    expect(activeSwitch(sec)).toBeUndefined();
    const started = startSwitch(sec, 'sup_demo_acier', 'sup_demo_distrib', { reason: 'autre', reasonNote: 'Grève des transports', expectedBack: '2026-10-05', by: 'Sophie' }, now);
    expect(activeSwitch(started)).toMatchObject({ fromId: 'sup_demo_acier', toId: 'sup_demo_distrib', at: '2026-09-25' });
    expect(switchReason(activeSwitch(started)!)).toBe('Grève des transports');
    const s2 = { ...s, sectors: { ...s.sectors, [sec.id]: started } };
    expect(sectorState(s2, started, now)).toBe('switched');
    expect(sectorRanking(s2, started, now).find(y => y.serving)?.x.id).toBe('sup_demo_distrib');
    const ended = endSwitch(started, new Date(2026, 9, 2));
    expect(activeSwitch(ended)).toBeUndefined();
    expect(ended.switches).toHaveLength(2);
    expect(ended.switches!.at(-1)!.backAt).toBe('2026-10-02');
    // the history of the two suppliers shows it
    const s3 = { ...s, sectors: { ...s.sectors, [sec.id]: ended } };
    expect(fullTimeline(s3, s3.suppliers.sup_demo_distrib).filter(e => e.kind === 'switch').map(e => e.text).join('|')).toContain('remplace');
    expect(fullTimeline(s3, s3.suppliers.sup_demo_acier).filter(e => e.kind === 'switch').length).toBeGreaterThanOrEqual(4);   // the past one and this one, each with its return
  });
  it('raises the alerts of the sectors, and only the Plan B one when there is no sector', () => {
    const s = demo();
    const keys = sectorInsights(s, now).map(i => i.key);
    expect(keys).toEqual(expect.arrayContaining(['planb', 'sector_alone', 'sector_best', 'sector_switch_sec_demo_proprete', 'sector_unproven', 'sector_weak']));
    expect(keys).not.toContain('sector_free');
    const alone = sectorInsights(s, now).find(i => i.key === 'sector_alone')!;
    expect(alone.text).toContain('Sous-traitance');
    expect(alone.text).not.toContain('Conseil comptable');   // its single supplier is assumed, with a measure written
    expect(sectorInsights({ ...s, sectors: {} }, now).map(i => i.key)).toEqual(['planb']);
    const late = { ...s, sectors: { ...s.sectors, sec_demo_proprete: { ...s.sectors.sec_demo_proprete, switches: [{ ...s.sectors.sec_demo_proprete.switches![0], expectedBack: '2026-09-20' }] } } };
    expect(sectorInsights(late, now).find(i => i.key === 'sector_switch_sec_demo_proprete')).toMatchObject({ tone: 'bad' });
    const free = { ...s, suppliers: { ...s.suppliers, sup_demo_distrib: { ...s.suppliers.sup_demo_distrib, sectorIds: [] } } };
    expect(sectorInsights(free, now).map(i => i.key)).toContain('sector_free');
  });
  it('warns when the main supplier is fragile, and when a backup was never tried', () => {
    const s = demo();
    const weakMain = { ...s, suppliers: { ...s.suppliers, sup_demo_acier: { ...s.suppliers.sup_demo_acier, status: 'watch' as const } } };
    expect(sectorInsights(weakMain, now).find(i => i.key === 'sector_weak')?.text).toContain('Aciers du Rhône');
    expect(sectorInsights(s, now).find(i => i.key === 'sector_weak')?.text).toContain('Prestataire IT');   // a contested claim
    expect(sectorInsights(s, now).find(i => i.key === 'sector_unproven')?.text).toContain('Assistance Réseaux 69');
    const noSwitch = { ...s, sectors: { ...s.sectors, sec_demo_proprete: { ...s.sectors.sec_demo_proprete, switches: [] } } };
    const text = sectorInsights(noSwitch, now).find(i => i.key === 'sector_weak')!.text;
    expect(text).toContain('Propreté Services');   // class C, defect that comes back
    expect(sectorInsights(noSwitch, now).find(i => i.key === 'sector_unproven')!.text).toContain('Net & Co Entretien');
  });
  it('turns the sectors into tasks', () => {
    const s = demo();
    const t = sectorTasks(s, now).map(x => x.text);
    expect(t.some(x => x.startsWith('Fournisseur de secours à référencer : secteur Sous-traitance'))).toBe(true);
    expect(t.some(x => x.startsWith('Fournisseur de secours à référencer : secteur Conseil'))).toBe(false);
    expect(t).toContain("Commande d'essai à passer chez Assistance Réseaux 69 (secours du secteur Informatique et assistance)");
    const back = sectorTasks(s, now).find(x => x.text.startsWith('Retour du principal'))!;
    expect(back.text).toContain('Propreté Services');
    expect(back.due > '2026-09-25').toBe(true);
    expect(allTasks(s, now).filter(x => x.tool === '3.1').some(x => x.text.startsWith('Retour du principal'))).toBe(true);
  });
  it('counts the sectors in the badge of the tool', () => {
    const s = demo();
    expect(toolBadge(s, '3.1', '2026-09', now).tone).toBe('alert');   // a claim not sent in time comes first
    // no claim, no class C: what is left to do is counted, and the sectors in trouble are part of it
    const strong = { date: '2026-09-01', quality: 38, delay: 36, service: 18, by: '', note: '' };
    const calm: State = { ...s, debits: {}, suppliers: { ...s.suppliers, sup_demo_usinage: { ...s.suppliers.sup_demo_usinage, ratings: [strong] }, sup_demo_proprete: { ...s.suppliers.sup_demo_proprete, ratings: [strong] } } };
    expect(toolBadge(calm, '3.1', '2026-09', now).tone).toBe('warn');
    expect(toolBadge(calm, '3.1', '2026-09', now).n - toolBadge({ ...calm, sectors: {} }, '3.1', '2026-09', now).n).toBe(sectorSummary(calm, now).issues);
  });
  it('proposes sectors from what the suppliers say they supply, without those that exist', () => {
    const s = demo();
    const none = { ...s, sectors: {} };
    expect(proposeSectors(none).map(p => p.name)).toEqual(expect.arrayContaining(['Transport express', 'Usinage de précision', 'Nettoyage des locaux', 'Fournitures de bureau et consommables']));
    expect(proposeSectors(s)).toEqual([]);   // every supplier of the example is already in a sector
    const have = { ...s, sectors: { a: { ...newSector('Transport express'), id: 'a' } } };
    expect(proposeSectors(have).map(p => p.name)).not.toContain('Transport express');
    const twins: Supplier[] = [{ id: 'a', name: 'A', category: 'matiere', supplies: 'Tôle', strategic: false, contact: '', ratings: [] }, { id: 'b', name: 'B', category: 'matiere', supplies: ' tole ', strategic: false, contact: '', ratings: [] }];
    expect(proposeSectors({ ...s, sectors: {}, suppliers: Object.fromEntries(twins.map(x => [x.id, x])) })).toEqual([{ name: 'Tôle', supplierIds: ['a', 'b'] }]);
  });
  it('survives the shared folder: sectors are saved one record each', () => {
    const s = demo();
    const flat = flatten(s);
    expect(Object.keys(flat).filter(k => k.startsWith('sector|'))).toHaveLength(8);
    expect(unflatten(flat).sectors.sec_demo_proprete.switches).toEqual(s.sectors.sec_demo_proprete.switches);
    expect(unflatten(flat).suppliers.sup_demo_acier.sectorIds).toEqual(['sec_demo_tole']);
  });
  it('gives the sectors to a fictitious company saved with the previous generation of the example', () => {
    const old = demo();
    old.params = { ...old.params, supplierExampleLevel: 2 };
    old.sectors = {};
    delete old.suppliers.sup_demo_messagerie;
    old.suppliers.sup_demo_acier = { ...old.suppliers.sup_demo_acier, sectorIds: undefined };
    const a = completeSupplierExamples(old, now);
    expect(Object.keys(a.sectors)).toHaveLength(8);
    expect(a.suppliers.sup_demo_messagerie).toBeTruthy();
    expect(a.suppliers.sup_demo_acier.sectorIds).toEqual(['sec_demo_tole']);
    expect(a.params.supplierExampleLevel).toBe(6);
  });
  it('gives a company already at level 4 or 5 only the choice of a sector without backup and the general names, and keeps what it changed', () => {
    const cur = demo();
    cur.params = { ...cur.params, supplierExampleLevel: 4 };
    cur.sectors = { ...cur.sectors, sec_demo_conseil: { id: 'sec_demo_conseil', name: 'Conseil (renommé)', order: [] }, sec_demo_proprete: { ...cur.sectors.sec_demo_proprete, switches: [] },
      sec_demo_tole: { ...cur.sectors.sec_demo_tole, name: 'Tôle (acier, inox)' }, sec_demo_usinage: { ...cur.sectors.sec_demo_usinage, name: 'Mon usinage' } };
    const a = completeSupplierExamples(cur, now);
    expect(a.params.supplierExampleLevel).toBe(6);
    expect(a.sectors.sec_demo_tole.name).toBe('Matières et composants');   // the old name of the example gives way to the general one
    expect(a.sectors.sec_demo_usinage.name).toBe('Mon usinage');   // a name the company chose stays
    expect(a.sectors.sec_demo_conseil).toMatchObject({ name: 'Conseil (renommé)', cover: 'unique' });
    expect(a.sectors.sec_demo_proprete.switches).toEqual([]);   // the sectors were not given again
    expect(completeSupplierExamples(a, now)).toBe(a);
  });
  it('a sector can need no backup, or hold a single supplier nobody replaces, with what is done if it stops', () => {
    const s = demo();
    const conseil = s.sectors.sec_demo_conseil, expert = s.suppliers.sup_demo_expert;
    expect(sectorCover(conseil)).toBe('unique');
    expect(sectorTarget(conseil)).toBe(1);
    expect(sectorBadge(s, conseil, now)).toEqual({ level: 'ok', text: 'Fournisseur unique assumé' });
    expect(hasPlanB(s, expert, now)).toBe(true);   // critical, alone, and the measure is written
    // nothing written: the sector is flagged, the critical supplier is not covered, a task asks for the measure
    const bare = { ...s, sectors: { ...s.sectors, sec_demo_conseil: { ...conseil, coverNote: ' ' } } };
    expect(sectorCovered(bare.sectors.sec_demo_conseil)).toBe(false);
    expect(sectorBadge(bare, bare.sectors.sec_demo_conseil, now)).toEqual({ level: 'warn', text: 'Mesure à écrire' });
    expect(hasPlanB(bare, expert, now)).toBe(false);
    expect(sectorInsights(bare, now).find(i => i.key === 'sector_unique')!.text).toContain('Cabinet Comptable');
    expect(sectorInsights(s, now).map(i => i.key)).not.toContain('sector_unique');
    expect(sectorTasks(bare, now).some(x => x.text.startsWith('Mesure à écrire si le fournisseur unique du secteur Conseil'))).toBe(true);
    expect(sectorTasks(s, now).some(x => x.text.startsWith('Mesure à écrire'))).toBe(false);
    // the measure becomes the Plan B of the risk
    expect(sectorRiskText(s, conseil)).toMatchObject({ cause: 'Fournisseur unique : aucun remplaçant possible sur ce secteur', planB: conseil.coverNote!.trim() });
    // no backup needed: covered, no alert, no task, the critical supplier is not flagged
    const none = { ...s, sectors: { ...s.sectors, sec_demo_conseil: { ...conseil, cover: 'none' as const, coverNote: undefined } } };
    expect(sectorBadge(none, none.sectors.sec_demo_conseil, now)).toEqual({ level: 'ok', text: 'Pas de secours nécessaire' });
    expect(hasPlanB(none, expert, now)).toBe(true);
    // a sector saved with one supplier wanted reads as "not needed"; a backup wanted is never below two
    expect(sectorCover({ target: 1 })).toBe('none');
    expect(sectorTarget({ target: 1, cover: undefined })).toBe(1);
    expect(sectorTarget({ target: 3 })).toBe(3);
    expect(sectorTarget({ target: 0 })).toBe(2);
    expect(unflatten(flatten(s)).sectors.sec_demo_conseil).toMatchObject({ cover: 'unique', coverNote: conseil.coverNote });
  });
});
