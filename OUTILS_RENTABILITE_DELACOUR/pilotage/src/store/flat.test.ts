import { describe, expect, it } from 'vitest';
import { bucketOf, diffKeys, flatten, unflatten } from './flat';
import { demoState } from '../domain/templates';

describe('shared storage keys', () => {
  const d = demoState();
  it('flatten then unflatten keeps everything', () => {
    const back = unflatten(JSON.parse(JSON.stringify(flatten(d))));
    expect(back.values).toEqual(d.values);
    expect(Object.keys(back.actions).sort()).toEqual(Object.keys(d.actions).sort());
    expect(back.processes.map(p => p.kpiIds)).toEqual(d.processes.map(p => p.kpiIds));
    expect(back.settings).toEqual(d.settings);
  });
  it('confidential values and settings go to the direction folder', () => {
    expect(bucketOf('value|kpi_ca|2026-01', d)).toBe('direction');
    expect(bucketOf('value|kpi_otif|2026-01', d)).toBe('equipe');
    expect(bucketOf('settings', d)).toBe('direction');
    expect(bucketOf('kpi|kpi_ca', d)).toBe('equipe');
  });
  it('diff only lists changed keys', () => {
    const a = flatten(d);
    const b = { ...a, 'value|kpi_ca|2026-01': 1 };
    delete (b as Record<string, unknown>)['value|kpi_ca|2026-02'];
    expect(diffKeys(b, a).sort()).toEqual(['value|kpi_ca|2026-01', 'value|kpi_ca|2026-02']);
  });
});
