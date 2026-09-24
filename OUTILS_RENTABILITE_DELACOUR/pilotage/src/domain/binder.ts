// Crisis binder freshness: fingerprint of everything printed on the reflex cards and the emergency numbers.
// Settings are left out on purpose (a team member without the direction folder must get the same fingerprint).
import type { State } from './types';

export function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function binderHash(s: Pick<State, 'risks' | 'contacts'>): string {
  const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => (a.id < b.id ? -1 : 1));
  const risks = byId(Object.values(s.risks)).map(r => [
    r.id, r.title, r.signal, r.gravity, r.likelihood, r.maxOutage, r.owner, r.deputy, r.family, r.planB, r.relay, r.activation,
    r.firstHour, r.contactIds, r.notifyIds, r.access, r.sacrifice,
  ]);
  const contacts = byId(Object.values(s.contacts)).map(c => [c.id, c.name, c.role, c.company, c.phone, c.always]);
  return fnv(JSON.stringify([risks, contacts]));
}
