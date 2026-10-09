// The claim of tool 3.1 on paper (debit note), from the example of 3.1: a valid PDF 1.4 in pure ASCII. The acceptance report of 3.4 is tested in receptionsPdf.test.ts.
import { describe, expect, it } from 'vitest';
import { debitPdf } from './operationsPdf';
import { supplierExamples } from './supplierExamples';
import { demoState } from './templates';

describe('debit note', () => {
  it('writes a valid PDF file for every debit of the example', () => {
    const now = new Date(2026, 8, 25, 10, 0), s = demoState(now), debits = Object.values(supplierExamples(now).debits);
    expect(debits.length).toBeGreaterThan(0);
    for (const d of debits) {
      const pdf = debitPdf(s, d, { company: 'Atelier é', date: now });
      expect(pdf.startsWith('%PDF-1.4')).toBe(true);
      expect(/[^\x00-\x7F]/.test(pdf)).toBe(false);
    }
  });
});
