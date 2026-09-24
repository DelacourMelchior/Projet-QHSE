import type { Period } from './types';

const MONTHS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const periodOf = (year: number, month0: number): Period => {
  const d = new Date(year, month0, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const parsePeriod = (p: Period) => {
  const [y, m] = p.split('-').map(Number);
  return { year: y, month0: m - 1 };
};

export const addMonths = (p: Period, n: number): Period => {
  const { year, month0 } = parsePeriod(p);
  return periodOf(year, month0 + n);
};

export const periodsBetween = (start: Period, end: Period): Period[] => {
  const out: Period[] = [];
  for (let p = start; p <= end && out.length < 240; p = addMonths(p, 1)) out.push(p);
  return out;
};

export const periodLabel = (p: Period) => { const { year, month0 } = parsePeriod(p); return `${MONTHS[month0]} ${year}`; };
export const periodShort = (p: Period) => { const { year, month0 } = parsePeriod(p); return `${MONTHS[month0]} ${String(year).slice(2)}`; };
export const periodLong = (p: Period) => { const { year, month0 } = parsePeriod(p); return `${MONTHS_LONG[month0]} ${year}`; };

export const periodOfDate = (d: Date): Period => periodOf(d.getFullYear(), d.getMonth());

// "14/01/2026", "2026-01-14" -> Date (null when unreadable)
export function parseDate(s: string | undefined | null): Date | null {
  const t = String(s || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const frDate = (iso: string) => { const d = parseDate(iso); return d ? d.toLocaleDateString('fr-FR') : ''; };
