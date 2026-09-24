// Demo company and job templates (KPI lists), taken from the previous version.
import type { State } from './types';
import { fromLegacyTool, DEFAULT_SETTINGS } from './migrate';
import { addMonths, periodOfDate } from './periods';
import legacy from './legacy-templates.json';
import { demoRisks } from './riskTemplates';

export const PROFILES = {
  industrie: 'Industrie, usinage & atelier',
  btp: 'BTP, chantiers & second-œuvre',
  services: 'Services, conseil & ingénierie',
} as const;
export type ProfileKey = keyof typeof PROFILES;

// Fictitious company, full year 2026 with 13 actions, and 7 risks with their Plan B (tool 1.2)
export function demoState(today = new Date()): State {
  const s = fromLegacyTool(JSON.parse(JSON.stringify(legacy.demo)));
  s.settings = { ...DEFAULT_SETTINGS, companyName: 'Entreprise exemple (fictive)', profile: 'industrie' };
  const d = demoRisks(today);
  s.risks = d.risks;
  Object.assign(s.actions, d.actions);
  return s;
}

// Empty dashboard for a job: KPI list and targets, no value, 12 months starting this year
export function blankState(profile: ProfileKey, today = new Date()): State {
  const tpl = (legacy.profiles as Record<string, { processes: unknown[] }>)[profile] || legacy.profiles.industrie;
  const s = fromLegacyTool(JSON.parse(JSON.stringify({ processes: tpl.processes })));
  const start = `${today.getFullYear()}-01`;
  const end = addMonths(start, 11) < periodOfDate(today) ? periodOfDate(today) : addMonths(start, 11);
  return { ...s, settings: { ...DEFAULT_SETTINGS, profile }, timeline: { start, end }, values: {}, actions: {}, risks: {} };
}
