// QR code drawn as an inline SVG (no image file), black on white with the quiet zone (4 modules, the norm) around. `size` (pixels) is the size the modules had with the quiet zone of
// 3 modules that this file drew before: the white margin grew, the modules did not shrink (the sheets of 3.2 and 3.3 keep the code they had).
// `fit`: for the paper, `size` is then a minimum and the code grows with its address: a longer address is more modules, so each one stays big enough to be read from arm's length (`qrMm`).
import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

const QUIET = 4;   // modules of white around the code
const MM = 25.4 / 96;   // a CSS pixel in millimetres

// Side of the printed code in mm, quiet zone included, for a code of `n` modules (version = (n - 17) / 4): a module of 0.7 mm up to version 6, 0.6 mm above, and 30 mm at least above version 6
export function qrMm(n: number): number {
  const big = (n - 17) / 4 > 6;
  return Math.round(Math.max(big ? 30 : 0, (n + 2 * QUIET) * (big ? 0.6 : 0.7)) * 10) / 10;
}

export function Qr({ text, size = 96, label, fit = false }: { text: string; size?: number; label: string; fit?: boolean }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n, d };
  }, [text]);
  const base = Math.round(size * (n + 2 * QUIET) / (n + 6)), px = fit ? Math.max(base, Math.round(qrMm(n) / MM)) : base;
  return (
    <svg viewBox={`${-QUIET} ${-QUIET} ${n + 2 * QUIET} ${n + 2 * QUIET}`} width={px} height={px} role="img" aria-label={label} shapeRendering="crispEdges" className="shrink-0 bg-white">
      <path d={d} fill="#000" />
    </svg>
  );
}
