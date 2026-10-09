// Records typed in the previous version of tools 2.1 to 5.3 (tool_page.html, one table of text cells per tool, saved in the
// browser as DELACOUR_DATA_<tool>) converted into the new records. Offered once, from the settings; nothing is converted silently.
import type { Action, Analysis, Complaint, Debit, Delivery, Nc, NcCause, Person, Power, Quote, Skill, SkillLevel, State, Supplier } from './types';
import { LEGACY_MILESTONES } from './receptions';
import { linkSuppliers } from './suppliers';
import { LOCKS } from './commercial';
import { parseNumber } from './numbers';
import { isoDate, periodOf } from './periods';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Legacy = any;
export const LEGACY_TOOL_IDS = ['2.1', '2.3', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '5.3'];

const clean = (x: unknown) => String(x ?? '').replace(/[\u{1F300}-\u{1FAFF}☀-➿⭐]️?/gu, '').replace(/\s+/g, ' ').trim();
const num = (x: unknown) => parseNumber(clean(x).replace(/^[+~]\s*/, '').replace(/\(.*$/, ''));
// "14/01/2026", "14/01" (year given) -> ISO date, '' when absent
function date(x: unknown, year: number): string {
  const m = clean(x).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  return m ? isoDate(new Date(m[3] ? +m[3] : year, +m[2] - 1, +m[1])) : '';
}
const split2 = (x: unknown) => { const [a, ...b] = clean(x).split(/\s+[-–]\s+/); return [a || '', b.join(' - ')]; };
// Template lines of the old tables ("Seuil de rentabilité cible", "Plafond toléré / mois"…) are not records
const isTemplateRow = (r: unknown[]) => /seuil|exigence|tol[ée]rance|plafond|r[èe]gle stricte/i.test(clean(r[0])) || r.slice(1).filter(c => clean(c) === '---').length >= 2;
const rowsOf = (t: Legacy): string[][] => (Array.isArray(t?.rows) ? t.rows : []).filter((r: unknown) => Array.isArray(r) && clean((r as unknown[])[0]) && !isTemplateRow(r as unknown[]));
const id = (p: string, i: number, t: string) => `${p}_old_${i}_${t.length}`;
const processOf = (x: string) => /commerc|devis|vente|factur/i.test(x) ? 'P2' : /qualit|finition|contr[ôo]le|aspect/i.test(x) ? 'P5' : /rh|recrue|formation/i.test(x) ? 'P4' : /direction|tarif/i.test(x) ? 'P1' : x ? 'P3' : '';
const causeOf = (x: string): NcCause | '' => /outil|usure|casse/i.test(x) ? 'outillage' : /plan|lecture/i.test(x) ? 'plan' : /r[ée]glage/i.test(x) ? 'reglage' : /mati[èe]re|fournisseur/i.test(x) ? 'matiere' : /choc|manut|emball/i.test(x) ? 'manipulation' : x ? 'autre' : '';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// `apply` returns what it left alone as a sentence of facts ('' when it left nothing alone)
export interface LegacyImport { counts: Record<string, number>; apply(d: State): string }

export function legacyToolRecords(raw: Record<string, Legacy>, s: State, today = new Date()): LegacyImport {
  const y = today.getFullYear();
  const rate = s.params.hourlyRate || 55;
  const quotes: Quote[] = [], complaints: Complaint[] = [], suppliers: Supplier[] = [], debits: Debit[] = [];
  const deliveries: Delivery[] = [], powers: Power[] = [], people: Person[] = [], skills: Skill[] = [], ncs: Nc[] = [], analyses: Analysis[] = [], actions: Action[] = [];
  const cnq: Record<string, number> = {};

  rowsOf(raw['2.1']).forEach((r, i) => {
    const [ref, client] = split2(r[0]);
    const amount = num(r[4]);
    quotes.push({
      id: id('qt', i, ref), ref: ref || `DEV-ancien-${i + 1}`, client: client || ref, object: '', date: isoDate(today), amount, weeks: null,
      locks: LOCKS.map(() => ({ state: '' as const, note: '' })), visas: { commercial: { by: '', date: '' }, technical: { by: /valid/i.test(clean(r[8])) ? 'Ancienne version' : '', date: '' }, direction: { by: '', date: '' } },
      derogation: /d[ée]rogation/i.test(clean(r[7])) ? 'Dérogation accordée (ancienne version)' : '', depositReceived: /encaiss/i.test(clean(r[7])), status: 'draft',
      sentAt: '', followedAt: '', decidedAt: '', lostReason: '',
      cost: { material: num(r[1]), hours: num(r[2]) === null ? null : Math.round(num(r[2])! / rate * 10) / 10, subcontract: num(r[3]), other: null },
    });
  });
  rowsOf(raw['2.3']).forEach((r, i) => {
    const d = date(r[0], y) || isoDate(today);
    const [client, affaire] = split2(r[1]);
    const h = clean(r[6]).match(/sous\s*(\d+)\s*h/i);
    const closed = /cl[ôo]tur|sold/i.test(clean(r[7]));
    const at = `${d}T09:00`;
    const contacted = h ? new Date(new Date(`${d}T09:00`).getTime() + +h[1] * 3600000) : null;
    complaints.push({
      id: id('cp', i, client), ref: `R-ancien-${i + 1}`, at, client, affaire, channel: '', receivedBy: '', description: clean(r[2]), severity: 'mineure',
      processId: processOf(clean(r[3])), contactedAt: contacted ? `${isoDate(contacted)}T${String(contacted.getHours()).padStart(2, '0')}:00` : '',
      immediate: clean(r[7]).replace(/^.*\(/, '').replace(/\)$/, ''), pilot: clean(r[5]).replace(/\s*\(.*$/, ''), cost: num(r[4]),
      resolvedAt: closed ? d : '', courtesyAt: closed ? d : '',
    });
  });
  rowsOf(raw['3.1']).forEach((r, i) => {
    const name = clean(r[0]);
    const sup: Supplier = { id: id('sup', i, name), name, category: 'matiere', supplies: '', strategic: /strat|monopole/i.test(clean(r[1])), contact: '', ratings: [] };
    const note = num(r[5]);
    if (note !== null) sup.ratings.push({ date: isoDate(today), quality: Math.round(note * 4), delay: Math.round(note * 4), service: Math.round(note * 2), by: '', note: `Note de ${clean(r[5])} reprise de l'ancienne version` });
    suppliers.push(sup);
    const hours = num(r[3]) || 0, amount = num(r[4]) || 0;
    if (hours || amount) {
      const recovered = /avoir re[çc]u|r[ée]gularis/i.test(clean(r[6]));
      debits.push({
        id: id('deb', i, name), ref: `DEB-ancien-${i + 1}`, supplierId: sup.id, date: isoDate(today), bl: (clean(r[2]).match(/BL\s*N°?\s*\w+/i) || [''])[0],
        reserveOnBl: /r[ée]serve/i.test(clean(r[2])), defect: clean(r[2]), reworkHours: hours || null, otherCost: Math.max(0, amount - hours * rate) || null,
        sentAt: /d[ée]bit [ée]mise|n[ée]gociation/i.test(clean(r[6])) ? isoDate(today) : '', answer: recovered ? 'accepted' : '', recovered: recovered ? amount : null, recoveredAt: recovered ? isoDate(today) : '',
      });
    }
  });
  rowsOf(raw['3.2']).forEach((r, i) => {
    const qty = clean(r[1]).match(/Qt[ée]\s*:?\s*(\d+)/i);
    const released = /lib[ée]r[ée]/i.test(clean(r[7]));
    deliveries.push({
      id: id('dl', i, clean(r[0])), ref: clean(r[0]), client: '', item: clean(r[1]).replace(/\s*\(.*\)$/, ''), qty: qty ? +qty[1] : null,
      milestones: [
        { label: 'Première pièce', point: 'Contrôle bloquant de la première pièce', requirement: '', measured: clean(r[4]), ok: /valid/i.test(clean(r[4])) ? true : null, by: '', date: '' },
        { label: 'Cote critique 1', point: clean(r[2]), requirement: '', measured: '', ok: /mesur|conforme/i.test(clean(r[2])) ? true : null, by: '', date: '' },
        { label: 'Cote critique 2', point: clean(r[3]), requirement: '', measured: '', ok: /mesur|conforme/i.test(clean(r[3])) ? true : null, by: '', date: '' },
        { ...LEGACY_MILESTONES[3], measured: clean(r[6]), ok: released ? true : null, by: '', date: '' },
      ],
      // the old table says "released", not by whom nor when: no release is invented (the order is imported not released: no person, no day, no task to deliver), the line of the journal says what the old table said
      releasedBy: '', releasedAt: '',
      ...(released ? { journal: [{ at: `${isoDate(today)}T${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`, by: 'Ancienne version', text: 'Libérée dans l\'ancien classeur (date inconnue)' }] } : {}),
      reception: { date: '', name: '', role: '', result: '', reserve: '', retentionPct: null, amount: null, liftedAt: '' },
    });
  });
  rowsOf(raw['4.1']).forEach((r, i) => {
    const d2 = clean(r[5]) === '---' ? '' : clean(r[5]);
    powers.push({
      id: id('pw', i, clean(r[0])), processId: 'P3', power: clean(r[0]), holder: clean(r[1]), deputies: [clean(r[2]), d2], practiced: [date(r[3], y), ''],
      access: [clean(r[6]) && `Autorise : ${clean(r[6])}`, clean(r[7]) && `prise de poste ${clean(r[7])}`].filter(Boolean).join(' · '),
    });
  });
  const t42 = raw['4.2'];
  if (Array.isArray(t42?.skills) && Array.isArray(t42?.employees)) {
    const byName: Record<string, string> = Object.fromEntries(Object.values(s.people).map(p => [p.name.toLowerCase(), p.id]));
    const ids = t42.employees.map((n: unknown, i: number) => {
      const name = clean(n);
      if (Object.hasOwn(byName, name.toLowerCase())) return byName[name.toLowerCase()];
      const p: Person = { id: id('pp', i, name), name, role: '', active: true };
      people.push(p);
      return p.id;
    });
    t42.skills.forEach((k: Legacy, i: number) => {
      const levels: Record<string, SkillLevel> = {};
      (k.employees || []).forEach((l: unknown, j: number) => { const v = Math.max(0, Math.min(4, Math.round(Number(l) || 0))); if (ids[j] && v) levels[ids[j]] = v as SkillLevel; });
      skills.push({ id: id('sk', i, clean(k.name)), name: clean(k.name), processId: 'P3', levels, plan: null });
    });
  }
  rowsOf(raw['5.1']).forEach((r, i) => {
    const ref = (clean(r[0]).match(/^[\w-]+/) || [`NC-ancien-${i + 1}`])[0];
    const yr = +((ref.match(/(20\d\d)/) || [])[1] || y);
    const d = date(r[0], yr) || isoDate(today);
    const hm = clean(r[0]).match(/(\d{1,2})h(\d{2})/);
    const decision = /rebut/i.test(clean(r[4])) ? 'rebut' : /retouche/i.test(clean(r[4])) ? 'retouche' : /d[ée]rogation/i.test(clean(r[4])) ? 'derogation' : '';
    const cost = num(r[5]) || 0;
    ncs.push({
      id: id('nc', i, ref), ref, at: `${d}T${hm ? `${hm[1].padStart(2, '0')}:${hm[2]}` : '08:00'}`, by: '', where: '', item: clean(r[1]), qty: null, description: clean(r[3]),
      cause: causeOf(clean(r[2])), origin: 'interne', decision, decidedAt: decision ? `${d}T17:00` : '', decidedBy: clean(r[6]).replace(/\s*\(.*$/, ''), decisionNote: clean(r[4]).replace(/^[^(]*\(|\)$/g, ''),
      processId: '', cost: { scrap: decision === 'rebut' ? cost || null : null, lostHours: null, reworkHours: decision === 'retouche' && cost ? Math.round(cost / rate * 10) / 10 : null, logistics: decision !== 'rebut' && decision !== 'retouche' ? cost || null : null },
    });
  });
  rowsOf(raw['5.2']).forEach(r => {
    const m = clean(r[0]).toLowerCase().match(/([a-zéû]+)\s+(\d{4})/);
    const mi = m ? MONTHS.indexOf(m[1]) : -1;
    const total = num(r[4]);
    if (mi >= 0 && total !== null) cnq[periodOf(+m![2], mi)] = total;
  });
  (Array.isArray(raw['5.3']?.sessions) ? raw['5.3'].sessions : []).forEach((x: Legacy, i: number) => {
    const aid = id('an', i, clean(x.id || x.problem));
    analyses.push({
      id: aid, ref: `5P-ancien-${i + 1}`, date: clean(x.date).slice(0, 10) || isoDate(today), problem: clean(x.problem) || clean(x.constat), source: { kind: 'free', id: '' },
      processId: 'P3', participants: clean(x.participants), whys: [x.why1, x.why2, x.why3, x.why4, ''].map(clean), rootCause: clean(x.why5), backCheck: !!x.reverseTestValid, pilot: clean(x.pilot),
    });
    if (clean(x.countermeasure)) {
      actions.push({
        id: `act_${aid}`, kpiId: '', ref: { kind: 'analysis', id: aid }, period: (clean(x.date) || isoDate(today)).slice(0, 7), createdAt: clean(x.date).slice(0, 10) || isoDate(today),
        constat: clean(x.problem), whys: ['', '', '', '', ''], plan: [{ dim: 'materiel', text: clean(x.countermeasure), pilot: '' }], pilot: clean(x.pilot) || 'À désigner',
        deadline: clean(x.deadline).slice(0, 10), cost: typeof x.cost === 'number' ? x.cost : null,
        status: x.status === 'effective' ? 'effective' : x.status === 'done' ? 'done' : 'in_progress', closedAt: x.status === 'effective' || x.status === 'done' ? clean(x.deadline).slice(0, 10) : '',
      });
    }
  });

  const kpi = s.kpis.kpi_cnq || Object.values(s.kpis).find(k => k.role === 'cnq');
  const cnqNew = kpi ? Object.keys(cnq).filter(p => s.values[kpi.id]?.[p] === undefined) : [];
  const counts: Record<string, number> = {
    '2.1': quotes.length, '2.3': complaints.length, '3.1': suppliers.length + debits.length, '3.4': deliveries.length,
    '4.1': powers.length, '4.2': skills.length, '5.1': ncs.length, '5.2': cnqNew.length, '5.3': analyses.length,
  };
  return {
    counts,
    apply(d: State) {
      // a record already there (taken by a first import and worked on since: its id is the same each time) is never written again
      let kept = 0;
      const put = <T extends { id: string }>(into: Record<string, T>, xs: T[]) => xs.forEach(x => { if (Object.hasOwn(into, x.id)) kept++; else into[x.id] = x; });
      put(d.quotes, quotes); put(d.complaints, complaints); put(d.suppliers, suppliers); put(d.debits, debits);
      put(d.deliveries, deliveries); put(d.powers, powers); put(d.people, people); put(d.skills, skills); put(d.ncs, ncs); put(d.analyses, analyses); put(d.actions, actions);
      if (kpi) cnqNew.forEach(p => { const v = (d.values[kpi.id] ||= {}); if (v[p] === undefined) v[p] = cnq[p]; else kept++; });
      // the imported suppliers join the directory (1.3) like the others
      const l = linkSuppliers(d);
      d.suppliers = l.suppliers; d.orgs = l.orgs; d.contacts = l.contacts; d.debits = l.debits;
      return kept ? `${kept} ${kept > 1 ? 'éléments déjà repris sont gardés tels quels' : 'élément déjà repris est gardé tel quel'}.` : '';
    },
  };
}
