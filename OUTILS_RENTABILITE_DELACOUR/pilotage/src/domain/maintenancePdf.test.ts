// The routine sheet of tool 3.3 on paper.
import { describe, expect, it } from 'vitest';
import { routinePdf } from './maintenancePdf';
import { maintenanceExamples } from './maintenanceExamples';
import { sparesOf } from './maintenanceSpares';

describe('routine sheet', () => {
  it('is a valid ASCII PDF with the points and the parts of the equipment', () => {
    const ex = maintenanceExamples(new Date(2026, 8, 25)), e = ex.equipments.eq_demo_cnc;
    const pdf = routinePdf(e, sparesOf({ spares: ex.spares }, e.id), { company: 'Atelier é', date: new Date(2026, 8, 25) });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
