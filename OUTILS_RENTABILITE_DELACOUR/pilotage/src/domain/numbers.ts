// Reading and writing French business figures.

// "1.234,56" / "1 234,5 €" / "45 000 €" / "12k€" / "2.5 h" -> number (null when not a figure)
export function parseNumber(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (!input) return null;
  const t = String(input).trim();
  let mult = 1;
  if (/[0-9]\s*(k|k€|keur)$/i.test(t)) mult = 1000;
  else if (/[0-9]\s*(m|m€|meur)$/i.test(t)) mult = 1000000;
  let clean = t.replace(/[^0-9,.-]/g, '');
  if (clean.includes(',') || /^-?\d{1,3}(\.\d{3}){2,}$/.test(clean)) clean = clean.replace(/\./g, '');
  clean = clean.replace(',', '.');
  const n = parseFloat(clean);
  return Number.isNaN(n) ? null : n * mult;
}

const fr = (n: number, digits: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Full display: "52 400 €", "35,5 %", "2,5 h", "6 devis"
export function formatValue(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (unit === '€') return `${fr(Math.round(v), 0)} €`;
  if (unit === '%' || unit === 'h' || unit === 'j') return `${fr(v, 1)} ${unit}`;
  return `${fr(v, Number.isInteger(v) ? 0 : 1)}${unit ? ' ' + unit : ''}`;
}

// Compact display for charts and cards: "52,4 k€", "1,2 M€", "35 %"
export function formatCompact(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (unit === '€') {
    const a = Math.abs(v);
    if (a >= 1e6) return `${fr(v / 1e6, 1)} M€`;
    if (a >= 1000) return `${fr(v / 1000, v % 1000 === 0 ? 0 : 1)} k€`;
    return `${fr(Math.round(v), 0)} €`;
  }
  return `${fr(v, Number.isInteger(v) ? 0 : 1)}${unit ? ' ' + unit : ''}`;
}

export const formatPct = (p: number) => `${p > 0 ? '+' : ''}${fr(Math.round(p), 0)} %`;
