// @vitest-environment happy-dom
// F-6, played in a DOM: a stroke drawn with one point per movement of the finger reaches the screen as about 40 whole points, and a signature drawn before (many points) is still shown as it is.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import type { Strokes } from '../domain/types';
import { signatureOk } from '../domain/receptions';
import { cleanup, mount, stubCanvas } from './operations/testDom';
import { SignaturePad } from './SignaturePad';

beforeAll(() => stubCanvas());
afterEach(async () => { await cleanup(); });

const draw = (pts: [number, number][]) => act(async () => {
  const cv = document.querySelector('canvas')!;
  const ev = (n: string, [x, y]: [number, number]) => cv.dispatchEvent(new PointerEvent(n, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
  ev('pointerdown', pts[0]); pts.slice(1).forEach(p => ev('pointermove', p)); ev('pointerup', pts.at(-1)!);
});
// the pad is 300 x 100 in the test (getBoundingClientRect), so a client point is a unit
const hand = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => { const x = 10 + 280 * i / (n - 1); return [x, 50 + 28 * Math.sin(x / 9) * Math.cos(x / 31)] as [number, number]; });

describe('SignaturePad keeps about 40 points a stroke', () => {
  it('two strokes of 110 movements each are given as strokes of 40 points or fewer, first and last kept, still a signature', async () => {
    const onChange = vi.fn();
    await mount(<SignaturePad value={undefined} onChange={onChange} label="Signature du client" />);
    const a = hand(110), b = hand(110).map(([x, y]) => [x, y + 15] as [number, number]);
    await draw(a); await draw(b);
    const out = onChange.mock.calls.at(-1)![0] as Strokes;
    expect(out).toHaveLength(2);
    out.forEach(s => { expect(s.length).toBeLessThanOrEqual(40); expect(s.length).toBeGreaterThan(8); });
    expect(out[0][0]).toEqual([Math.round(a[0][0]), Math.round(a[0][1])]);
    expect(out[0].at(-1)).toEqual([Math.round(a.at(-1)![0]), Math.round(a.at(-1)![1])]);
    expect(signatureOk(out)).toBe(true);
    expect(JSON.stringify(out).length).toBeLessThan(1000);   // 2 x 110 movements weighed about 2 000 characters and more
  });
  it('a stroke already laid (many points) stays as it is, until it is erased', async () => {
    const laid: Strokes = [hand(200).map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number])], onChange = vi.fn();
    await mount(<SignaturePad value={laid} onChange={onChange} label="Signature du client" />);
    expect(onChange).not.toHaveBeenCalled();
    expect(laid[0]).toHaveLength(200);
  });
});
