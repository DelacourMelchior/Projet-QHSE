// Crisis directory (tool 1.3): categories, labels, numbers to check.
import type { Contact, ContactCategory } from './types';
import { parseDate } from './periods';

export const CATEGORIES: { key: ContactCategory; label: string }[] = [
  { key: 'secours', label: 'Secours et sécurité' },
  { key: 'interne', label: 'Interne' },
  { key: 'prestataire', label: 'Prestataires, confrères et maintenance' },
  { key: 'fournisseur', label: 'Fournisseurs' },
  { key: 'client', label: 'Clients' },
  { key: 'finance', label: 'Banque et assurance' },
  { key: 'autre', label: 'Autres' },
];

// "Banque B · Conseiller entreprises": the company first, it is what people look for
export const contactLabel = (c: Contact) => [c.company, c.name].filter(Boolean).join(' · ') || 'Sans nom';

// Never checked, or checked more than a year ago
export function toCheck(c: Contact, today = new Date()): boolean {
  const d = parseDate(c.verifiedAt);
  return !d || (today.getTime() - d.getTime()) / 86400000 > 365;
}
