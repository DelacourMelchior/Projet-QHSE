// Test support: the size of the characters of a document of tool 3.4 AS PRINTED, read from the classes of its markup the way the browser applies them in print (the screen classes, the `print:` ones, the
// sizes in pt, px, em and rem, the named sizes of Tailwind, the arbitrary variant `[&_.rounded-full]` that sets the pills of a PV, the sizes that are a share of the parent's). The result is checked
// against Chrome with the print media emulated (scratchpad of the lot 9: 14 orders x 3 documents, the same size on every text element), so a class that is not in this table makes the test fail
// loudly (`size of …`) instead of passing by being ignored. Needs a DOM (`// @vitest-environment happy-dom`).
const NAMED: Record<string, number> = { xs: 9, sm: 10.5, base: 12, lg: 13.5, xl: 15, '2xl': 18, '3xl': 22.5 };   // pt: Tailwind's 12, 14, 16, 18, 20, 24, 30 px
const PIXEL = 0.75;                                                                                          // 1 px is 0,75 pt

// a size class: "text-[9pt]", "text-[11px]", "text-[0.85em]", "text-xs"; undefined when the class sets no size (a colour, an alignment: "text-slate-700", "text-center")
function sizeOf(cls: string, parent: number): number | undefined {
  const arbitrary = cls.match(/^text-\[(\d+(?:\.\d+)?)(pt|px|em|rem|%)\]$/);
  if (arbitrary) {
    const n = +arbitrary[1], u = arbitrary[2];
    return u === 'pt' ? n : u === 'px' ? n * PIXEL : u === 'em' ? n * parent : u === '%' ? n / 100 * parent : n * 12;
  }
  const named = cls.match(/^text-(\w+)$/);
  return named && named[1] in NAMED ? NAMED[named[1]] : undefined;
}
const WORD = /^text-(?:left|right|center|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|inherit|current|transparent|black|white|slate|gray|zinc|red|amber|emerald|green|blue|orange|delacour|\[#)/;
const PRINT_FONT = /^print:text-/, PILL = 'print:[&_.rounded-full]:';

export interface Printed { pt: number; tag: string; text: string; cls: string }
// Every element that holds text of its own, with its size in pt (document order). `root` is the element that holds the printed document; the characters inherit 12 pt (16 px) from the page.
export function printedSizes(root: Element): Printed[] {
  const out: Printed[] = [];
  const walk = (el: Element, parent: number, pill: number | null) => {
    const classes = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    const unknown = classes.filter(c => /^(print:)?text-/.test(c) && sizeOf(c.replace(/^print:/, ''), parent) === undefined && !WORD.test(c.replace(/^print:/, '')) && !c.startsWith(PILL));
    if (unknown.length) throw new Error(`size of ${unknown.join(' ')} is not in the table of testPrintSizes.ts`);
    const base = classes.map(c => (c.startsWith('text-') ? sizeOf(c, parent) : undefined)).filter((x): x is number => x !== undefined).at(-1);
    const print = classes.map(c => (PRINT_FONT.test(c) ? sizeOf(c.replace(/^print:/, ''), parent) : undefined)).filter((x): x is number => x !== undefined).at(-1);
    const tagSize = el.tagName === 'SUB' || el.tagName === 'SUP' ? parent * 0.75 : el.tagName === 'SMALL' ? parent * 0.8 : parent;
    let size = print ?? base ?? tagSize;
    if (pill !== null && classes.includes('rounded-full')) size = pill;   // the arbitrary variant of an ancestor beats the class of the element itself
    const mine = classes.find(c => c.startsWith(PILL));
    if (mine) pill = sizeOf(mine.slice(PILL.length), size) ?? pill;
    if (!['SCRIPT', 'STYLE'].includes(el.tagName)) {
      const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join('').trim();
      if (txt) out.push({ pt: Math.round(size * 1000) / 1000, tag: el.tagName.toLowerCase(), text: txt.slice(0, 40), cls: classes.join(' ') });
    }
    [...el.children].forEach(c => { if (c.tagName !== 'svg' && c.tagName !== 'SVG') walk(c, size, pill); });
  };
  [...root.children].forEach(c => walk(c, 12, null));
  return out;
}
