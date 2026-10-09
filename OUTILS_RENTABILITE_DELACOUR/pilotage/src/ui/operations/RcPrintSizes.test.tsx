// @vitest-environment happy-dom
// The size of the characters of the documents of tool 3.4 AS PRINTED: the follow-up sheet is no smaller than 9 pt, the PV and the file of proof no smaller than 8.5 pt (a status pill of the PV 9 pt, P-17),
// for the 14 orders of the example. The size of every text element is read from its classes by `printedSizes` (testPrintSizes.ts), the way the browser applies them in print: the old test read only
// the classes written in points and let the pill of 8,25 pt through. That reading was compared with Chrome (print media emulated) on these 42 documents: the same size on all 4 233 text elements.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { demoState } from '../../domain/templates';
import { PvPrint } from './RcPv';
import { ProofPrint, TravellerPrint } from './RcPrint';
import { printedSizes } from './testPrintSizes';

const state = demoState(new Date(2026, 8, 25, 10, 0)), orders = Object.values(state.deliveries);
const sizes = (el: ReactElement) => { const host = document.createElement('div'); host.innerHTML = renderToStaticMarkup(el); return printedSizes(host); };
const smallest = (el: ReactElement) => { const s = sizes(el).sort((a, b) => a.pt - b.pt)[0]; return s ? `${s.pt} pt "${s.text}"` : 'none'; };
const min = (el: ReactElement) => Math.min(...sizes(el).map(s => s.pt));

describe('the size of the characters as printed', { timeout: 30000 }, () => {
  (window as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL('https://outils.example.fr/pilotage.html');
  it('is read the way the browser prints it: points, pixels, a share of the parent, the named sizes, the variant of print, the pills of a PV', () => {
    const at = (cls: string, inner = '') => { const h = document.createElement('div'); h.innerHTML = `<div class="${cls}">x${inner}</div>`; return printedSizes(h).map(s => s.pt); };
    expect(at('text-[9pt]')).toEqual([9]);
    expect(at('text-[11px]')).toEqual([8.25]);
    expect(at('text-xs')).toEqual([9]);
    expect(at('text-xs print:text-[10pt]')).toEqual([10]);
    expect(at('text-[10pt]', '<span class="text-[0.85em]">y</span>')).toEqual([10, 8.5]);
    expect(at('print:[&_.rounded-full]:text-[9pt] text-[10pt]', '<span class="rounded-full text-[11px]">y</span>')).toEqual([10, 9]);
    expect(at('text-slate-700')).toEqual([12]);
    expect(() => at('text-[7vw]')).toThrow('size of text-[7vw]');   // a size the table does not know fails loudly instead of being ignored
  });
  it('is 9 pt at least on the follow-up sheet, for the 14 orders', () => {
    orders.forEach(d => expect(min(<TravellerPrint d={d} state={state} />), `${d.id}: ${smallest(<TravellerPrint d={d} state={state} />)}`).toBeGreaterThanOrEqual(9));
  });
  it('is 8.5 pt at least on the file of proof and on the PV, for the 14 orders', () => {
    orders.forEach(d => {
      expect(min(<ProofPrint d={d} state={state} />), `${d.id} file of proof: ${smallest(<ProofPrint d={d} state={state} />)}`).toBeGreaterThanOrEqual(8.5);
      expect(min(<PvPrint d={d} state={state} />), `${d.id} PV: ${smallest(<PvPrint d={d} state={state} />)}`).toBeGreaterThanOrEqual(8.5);
    });
  });
  it('is 9 pt at least in the pill of a status of the PV (the screen draws it at 8.25 pt: P-17)', () => {
    const pills = orders.flatMap(d => sizes(<PvPrint d={d} state={state} />).filter(s => s.cls.includes('rounded-full')));
    expect(pills.length).toBeGreaterThan(10);
    pills.forEach(p => expect(p.pt, p.text).toBeGreaterThanOrEqual(9));
  });
});
