// A new defect (red bin 5.1), with no dependency on another tool: the order checks of 3.4 declare defects, the cost of 5.2 reads the complaints of 2.3, and none of them must import
// the others to get here (quality.ts keeps exporting `newNc` as before).
import type { Nc, State } from './types';
import { nextRef, nowLocal } from './base';

export function newNc(s: State, by: string, now = new Date()): Nc {
  return {
    id: `nc_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ref: nextRef('NC', Object.values(s.ncs), now),
    at: nowLocal(now), by, where: '', item: '', qty: null, description: '', cause: '', origin: 'interne',
    decision: '', decidedAt: '', decidedBy: '', decisionNote: '', processId: '',
    cost: { scrap: null, lostHours: null, reworkHours: null, logistics: null },
  };
}
