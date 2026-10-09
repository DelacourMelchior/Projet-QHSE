// The button "Voir un exemple traité" of tools 3.1 to 3.3, for the fictitious company of the demo (same people as the other tools).
// The suppliers and claims of tool 3.1 are in supplierExamples.ts, the work instructions of tool 3.2 in instructionsExamples.ts, the equipment and the cabinet of tool 3.3 in maintenanceExamples.ts;
// the orders of tool 3.4 have their own (receptionsExamples.ts).
import type { State } from './types';
import { fillEmptyCollections } from './base';
import { supplierDirectory, supplierExamples } from './supplierExamples';
import { orgOf } from './contacts';
import { applySopExample, sopExamples } from './instructionsExamples';
import { applyMaintenanceExample } from './maintenanceExamples';

export function operationsExamples(today = new Date()) {
  return { ...supplierExamples(today), sops: Object.fromEntries(sopExamples(today).map(x => [x.id, x])) };
}

export function applyOperationsExample(d: State, today = new Date()) {
  fillEmptyCollections(d, operationsExamples(today));   // only the collections that are empty: a company's own sheets and suppliers are never replaced
  // the sheets above are the current ones: linked to their defects and given the plan
  applySopExample(d, today);
  applyMaintenanceExample(d, today);
  // the organisations and people of the suppliers in the directory, unless the company already has them
  const dir = supplierDirectory(today);
  dir.orgs.forEach(o => { if (!orgOf(d, o.name)) d.orgs[o.id] ||= o; });
  dir.contacts.forEach(c => { d.contacts[c.id] ||= c; });
}
