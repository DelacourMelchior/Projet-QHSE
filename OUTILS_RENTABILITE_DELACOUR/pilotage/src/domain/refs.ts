// Records of tools 2.1 to 5.4 that an action can come from: their name in the action register.
import type { Ref, RefKind, State } from './types';

const LABEL: Record<RefKind, (s: State, id: string) => string | null> = {
  analysis: (s, id) => { const a = s.analyses[id]; return a ? `${a.ref} · ${a.problem || 'Atelier 5 Pourquoi'}` : null; },
  equipment: (s, id) => s.equipments[id]?.name || null,
  supplier: (s, id) => s.suppliers[id]?.name || null,
  feedback: (s, id) => { const f = s.feedbacks[id]; return f ? `Bilan ${f.client}${f.affaire ? ` · ${f.affaire}` : ''}` : null; },
  complaint: (s, id) => { const c = s.complaints[id]; return c ? `${c.ref} · ${c.client}` : null; },
  skill: (s, id) => s.skills[id]?.name || null,
  power: (s, id) => s.powers[id]?.power || null,
};
export const KIND_LABEL: Record<RefKind, string> = {
  analysis: 'Atelier 5 Pourquoi', equipment: 'Équipement', supplier: 'Fournisseur', feedback: "Bilan de fin d'affaire",
  complaint: 'Réclamation', skill: 'Compétence', power: 'Pouvoir vital',
};

export const refLabel = (s: State, r: Ref) => LABEL[r.kind](s, r.id) || `${KIND_LABEL[r.kind]} supprimé(e)`;

// What a new action can be attached to, by kind
export function refOptions(s: State): { kind: RefKind; items: { id: string; label: string }[] }[] {
  const col: Record<RefKind, Record<string, { id: string }>> = {
    analysis: s.analyses, equipment: s.equipments, supplier: s.suppliers, feedback: s.feedbacks, complaint: s.complaints, skill: s.skills, power: s.powers,
  };
  return (Object.keys(col) as RefKind[]).map(kind => ({
    kind, items: Object.values(col[kind]).map(x => ({ id: x.id, label: refLabel(s, { kind, id: x.id }) })).sort((a, b) => a.label.localeCompare(b.label)),
  })).filter(g => g.items.length);
}
