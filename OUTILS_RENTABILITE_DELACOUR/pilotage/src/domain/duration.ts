// Durations of the Plan B (tolerable outage, activation delay, measured delay), comparable in hours.
import type { Duration, DurationUnit } from './types';

const HOURS: Record<DurationUnit, number> = { h: 1, j: 24, sem: 168, mois: 720 };
export const UNITS: { key: DurationUnit; label: string }[] = [
  { key: 'h', label: 'heures' }, { key: 'j', label: 'jours' }, { key: 'sem', label: 'semaines' }, { key: 'mois', label: 'mois' },
];

export const hoursOf = (d: Duration | null | undefined): number | null => (d ? d.value * HOURS[d.unit] : null);

export function formatDuration(d: Duration | null | undefined): string {
  if (!d) return '';
  if (d.value === 0) return 'immédiat';
  const v = d.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const plural = d.value > 1;
  return `${v} ${{ h: 'h', j: plural ? 'jours' : 'jour', sem: plural ? 'semaines' : 'semaine', mois: 'mois' }[d.unit]}`;
}

// Text of the previous version: "sous 4 h", "2 jours", "1 semaine", "3 mois", "immédiat"
export function parseDuration(text: string): Duration | null {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/immediat/.test(t)) return { value: 0, unit: 'h' };
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(h|heure|j|jour|sem|semaine|mois)/);
  if (!m) return null;
  const unit: DurationUnit = m[2].startsWith('h') ? 'h' : m[2].startsWith('j') ? 'j' : m[2].startsWith('s') ? 'sem' : 'mois';
  return { value: parseFloat(m[1].replace(',', '.')), unit };
}
