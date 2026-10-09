// F-6: a stroke is kept in about 40 whole points (one per movement of the finger weighed half of an order), and still reads as a signature.
import { describe, expect, it } from 'vitest';
import type { Strokes } from '../domain/types';
import { signatureOk } from '../domain/receptions';
import { demoState } from '../domain/templates';
import { thin } from './SignaturePad';

type Pt = [number, number];
// a hand: one point per movement of the finger (220 of them, doubles included), whole units on the pad of 300 x 100
const hand = (n = 220, amp = 28): Pt[] => Array.from({ length: n }, (_, i) => { const x = 10 + 280 * i / (n - 1); return [Math.round(x), Math.round(50 + amp * Math.sin(x / 9) * Math.cos(x / 31))] as Pt; });
const doubled = (p: Pt[]): Pt[] => p.flatMap(x => [x, x]);
// the distance of a point to the line drawn through `l`
const near = (p: Pt, l: Pt[]) => Math.min(...l.slice(1).map((b, i) => { const a = l[i], dx = b[0] - a[0], dy = b[1] - a[1], k = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0; return Math.hypot(p[0] - a[0] - k * dx, p[1] - a[1] - k * dy); }));
const size = (s: Strokes | undefined) => JSON.stringify(s ?? null).length;

describe('thin', () => {
  it('keeps about 40 whole points of a hand of 220, the first and the last among them, near the line drawn', () => {
    const raw = hand(), out = thin(raw);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.length).toBeGreaterThan(10);
    expect(out[0]).toEqual(raw[0]);
    expect(out.at(-1)).toEqual(raw.at(-1));
    expect(out.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y))).toBe(true);
    expect(Math.max(...raw.map(p => near(p, out)))).toBeLessThanOrEqual(3);   // 3 units of 300: the eye does not see it
  });
  it('a signature of the pad stays one, and weighs a quarter of what it did', () => {
    const raw: Strokes = [hand(), hand(60, 12).map(([x, y]) => [x, y + 20] as Pt)], out = raw.map(s => thin(s));
    expect(signatureOk(raw)).toBe(true);
    expect(signatureOk(out)).toBe(true);
    expect(size(out)).toBeLessThan(size(raw) / 3);
  });
  it('the doubles of the movements go', () => {
    expect(thin(doubled(hand(30))).length).toBeLessThanOrEqual(30);
    expect(thin([[5, 5], [5, 5], [5, 5]])).toEqual([[5, 5], [5, 5]]);   // a tap in place keeps its two ends: it is still "a stroke that is too short", as before
  });
  it('a straight line keeps enough points to be a signature (5 at least are asked), and a short stroke is kept whole', () => {
    const line: Pt[] = Array.from({ length: 30 }, (_, i) => [10 + 4 * i, 50]);
    expect(thin(line).length).toBeGreaterThanOrEqual(6);
    expect(signatureOk([thin(line)])).toBe(true);
    expect(thin([[10, 10], [60, 40], [120, 20], [160, 60]])).toHaveLength(4);
    expect(thin([[10, 10], [60, 40]])).toEqual([[10, 10], [60, 40]]);
  });
  it('a corner stays a corner', () => {
    const out = thin([[10, 10], [50, 10], [90, 10], [90, 50], [90, 90]]);
    expect(out).toContainEqual([90, 10]);
  });
  it('the signatures of the example are still recognised once thinned, stroke by stroke', () => {
    const s = demoState(new Date(2026, 9, 6, 10, 0)), laid = Object.values(s.deliveries).flatMap(d => [d.signClient, d.signCompany, d.releaseSign]).filter((g): g is Strokes => !!g?.length);
    expect(laid.length).toBeGreaterThan(5);
    for (const g of laid) { expect(signatureOk(g)).toBe(true); expect(signatureOk(g.map(x => thin(x)))).toBe(true); }
  });
});
