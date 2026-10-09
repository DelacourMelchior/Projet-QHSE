// Public holidays of mainland France: the days that do not count in the 48 h and 24 h rules (settings, "Jours non travaillés").
import { addDays } from './base';
import { isoDate } from './periods';

// Easter Sunday (Gregorian calendar, anonymous algorithm)
export function easter(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(new Date(year, month - 1, day));
}

export function frenchHolidays(year: number): { date: string; label: string }[] {
  const e = easter(year), fixed = (m: number, d: number) => isoDate(new Date(year, m - 1, d));
  return [
    { date: fixed(1, 1), label: "Jour de l'an" }, { date: addDays(e, 1), label: 'Lundi de Pâques' }, { date: fixed(5, 1), label: 'Fête du Travail' },
    { date: fixed(5, 8), label: 'Victoire 1945' }, { date: addDays(e, 39), label: 'Ascension' }, { date: addDays(e, 50), label: 'Lundi de Pentecôte' },
    { date: fixed(7, 14), label: 'Fête nationale' }, { date: fixed(8, 15), label: 'Assomption' }, { date: fixed(11, 1), label: 'Toussaint' },
    { date: fixed(11, 11), label: 'Armistice' }, { date: fixed(12, 25), label: 'Noël' },
  ];
}
