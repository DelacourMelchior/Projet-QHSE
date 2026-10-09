// Marks of the photo editor: styles with their defaults, what a touch hits, how a mark moves (the drawing itself needs a canvas).
import { describe, expect, it } from 'vitest';
import { contrast, DEFAULT_STYLE, hitMark, markBounds, markSvg, moveArrowEnd, moveMark, splitPhoto, styleOf, tapArrow, turnHandle, turnTo, handlesOf, scaleTo, bendTo, dragHandle, turnMark, turnCrop, cleanMark, cleanMarks, selectionSvg, type Mark } from './photo';

const W = 800, H = 600;

describe('style of a mark', () => {
  it('takes the default of its kind, and what the mark overrides', () => {
    expect(styleOf({ k: 'cross', x: 0.5, y: 0.5 })).toEqual(DEFAULT_STYLE.cross);
    expect(styleOf({ k: 'text', x: 0, y: 0, t: 'Ok', color: '#2563eb', size: 2, font: 'serif', angle: 30 })).toMatchObject({ color: '#2563eb', size: 2, font: 'serif', angle: 30, bold: true, bg: 'dark' });
    expect(DEFAULT_STYLE.arrow.color).toBe('#16a34a');
    expect(DEFAULT_STYLE.cross.color).toBe('#dc2626');
  });
  it('writes dark on a light colour and white on a dark one', () => {
    expect(contrast('#ffffff')).toBe('#0f172a');
    expect(contrast('#facc15')).toBe('#0f172a');
    expect(contrast('#16a34a')).toBe('#ffffff');
    expect(contrast('#0f172a')).toBe('#ffffff');
  });
});

describe('arrow drawn by a tap', () => {
  it('points at the finger from the lower left, further away for a bigger size', () => {
    const a = tapArrow(0.5, 0.5, W, H), big = tapArrow(0.5, 0.5, W, H, 2);
    expect([a.x2, a.y2]).toEqual([0.5, 0.5]);
    expect(a.x).toBeLessThan(0.5);
    expect(a.y).toBeGreaterThan(0.5);
    expect(0.5 - big.x).toBeCloseTo((0.5 - a.x) * 2);
  });
});

describe('what a touch hits', () => {
  const cross: Mark = { k: 'cross', x: 0.5, y: 0.5 }, circle: Mark = { k: 'circle', x: 0.52, y: 0.5 };
  it('finds the mark under the finger, and none elsewhere', () => {
    expect(hitMark([cross], 0.5, 0.5, W, H)).toBe(0);
    expect(hitMark([cross], 0.05, 0.05, W, H)).toBe(-1);
    expect(hitMark([], 0.5, 0.5, W, H)).toBe(-1);
  });
  it('prefers the mark drawn last', () => {
    expect(hitMark([cross, circle], 0.51, 0.5, W, H)).toBe(1);
  });
  it('follows the line of an arrow, not its box', () => {
    const arrow: Mark = { k: 'arrow', x: 0.1, y: 0.1, x2: 0.9, y2: 0.9 };
    expect(hitMark([arrow], 0.5, 0.5 * (W / H) * (H / W), W, H)).toBe(0);   // on the line (800 x 600: share 0.5 of each)
    expect(hitMark([arrow], 0.9, 0.1, W, H)).toBe(-1);   // inside the box, far from the line
  });
  it('makes a bigger mark easier to hit', () => {
    const small: Mark = { k: 'circle', x: 0.5, y: 0.5, size: 0.5 }, big: Mark = { k: 'circle', x: 0.5, y: 0.5, size: 3 };
    const a = markBounds(small, W, H), b = markBounds(big, W, H);
    expect(b.x1 - b.x0).toBeGreaterThan((a.x1 - a.x0) * 3);
  });
  it('grows the frame of a word with its size and turns it with its angle', () => {
    const t: Mark = { k: 'text', x: 0.2, y: 0.5, t: 'Bien serré' }, bigger: Mark = { ...t, size: 2 }, turned: Mark = { ...t, angle: 90 };
    const w0 = markBounds(t, W, H), w1 = markBounds(bigger, W, H), w2 = markBounds(turned, W, H);
    expect(w1.x1 - w1.x0).toBeGreaterThan((w0.x1 - w0.x0) * 1.9);
    expect(w2.y1 - w2.y0).toBeGreaterThan(w2.x1 - w2.x0);   // turned a quarter: taller than wide
    expect(w0.x1 - w0.x0).toBeGreaterThan(w0.y1 - w0.y0);
  });
});

describe('moving marks', () => {
  it('moves both ends of an arrow, and keeps a mark in the picture', () => {
    const arrow: Mark = { k: 'arrow', x: 0.1, y: 0.2, x2: 0.4, y2: 0.5 };
    const moved = moveMark(arrow, 0.1, 0.1) as Extract<Mark, { k: 'arrow' }>;
    expect([moved.x, moved.y, moved.x2, moved.y2].map(v => Math.round(v * 100) / 100)).toEqual([0.2, 0.3, 0.5, 0.6]);
    expect(moveMark({ k: 'cross', x: 0.9, y: 0.9 }, 0.5, 0.5)).toMatchObject({ x: 1, y: 1 });
    expect(moveMark({ k: 'number', x: 0.5, y: 0.5, n: 3, color: '#2563eb' }, -0.1, 0)).toMatchObject({ x: 0.4, n: 3, color: '#2563eb' });
  });
  it('moves one end of an arrow to reorient it', () => {
    const arrow: Mark = { k: 'arrow', x: 0.1, y: 0.2, x2: 0.4, y2: 0.5 };
    expect(moveArrowEnd(arrow, 2, 0.8, 0.1)).toMatchObject({ x: 0.1, y: 0.2, x2: 0.8, y2: 0.1 });
    expect(moveArrowEnd(arrow, 1, 2, -1)).toMatchObject({ x: 1, y: 0, x2: 0.4, y2: 0.5 });
    expect(moveArrowEnd({ k: 'cross', x: 0.5, y: 0.5 }, 1, 0.1, 0.1)).toEqual({ k: 'cross', x: 0.5, y: 0.5 });
  });
});

describe('turning by hand', () => {
  const text: Mark = { k: 'text', x: 0.2, y: 0.5, t: 'Serrer' }, cross: Mark = { k: 'cross', x: 0.5, y: 0.5 };
  it('puts the handle past the end of a word and above a cross, and none on the other marks', () => {
    const h = turnHandle(text, W, H)!, c = turnHandle(cross, W, H)!;
    expect(h.x).toBeGreaterThan(0.2 * W + 30);
    expect(h.y).toBeCloseTo(0.5 * H);
    expect(c.x).toBeCloseTo(0.5 * W);
    expect(c.y).toBeLessThan(0.5 * H - 30);
    expect(turnHandle({ k: 'circle', x: 0.5, y: 0.5 }, W, H)).toBeNull();
    expect(turnHandle({ k: 'arrow', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5 }, W, H)).toBeNull();
  });
  it('turns the handle to the pointer', () => {
    expect(turnTo(text, 0.2, 0.9, W, H)).toMatchObject({ angle: 90 });   // pointer straight below the anchor of the word
    expect(turnTo(text, 0.05, 0.5, W, H)).toMatchObject({ angle: -180 });   // behind it: upside down
    expect(turnTo(cross, 0.5, 0.1, W, H)).toMatchObject({ angle: 0 });   // straight above: not turned
    expect(turnTo(cross, 0.9, 0.5, W, H)).toMatchObject({ angle: 90 });
  });
  it('follows its own handle: the handle of the turned mark lies where the pointer was', () => {
    const t = turnTo({ ...text, size: 2 }, 0.6, 0.8, W, H) as Extract<Mark, { k: 'text' }>, h = turnHandle(t, W, H)!;
    expect(Math.atan2(h.y - 0.5 * H, h.x - 0.2 * W)).toBeCloseTo(Math.atan2(0.8 * H - 0.5 * H, 0.6 * W - 0.2 * W), 1);
  });
  it('snaps near a multiple of 15 degrees only', () => {
    const near = turnTo(cross, 0.9, 0.5 - Math.tan(2 * Math.PI / 180) * 0.4 * (W / H), W, H);   // 2 degrees off a quarter turn
    expect(near).toMatchObject({ angle: 90 });
    expect((turnTo(cross, 0.9, 0.3, W, H) as { angle: number }).angle).not.toBe(90);   // far off: no snap
  });
});

describe('thickness', () => {
  it('thickens the line of a mark and the zone that answers to a touch', () => {
    const thin = markSvg({ k: 'cross', x: 0.5, y: 0.5, thick: 0.5 }, W, H), thick = markSvg({ k: 'cross', x: 0.5, y: 0.5, thick: 4 }, W, H);
    const width = (svg: string) => Number(svg.match(/stroke-width="([\d.]+)"/)![1]);
    expect(width(thick)).toBeCloseTo(width(thin) * 8, 0);
    const arrow: Mark = { k: 'arrow', x: 0.1, y: 0.5, x2: 0.9, y2: 0.5 };
    expect(hitMark([arrow], 0.5, 0.5 + 40 / H, W, H)).toBe(-1);
    expect(hitMark([{ ...arrow, thick: 4 }], 0.5, 0.5 + 40 / H, W, H)).toBe(0);
  });
  it('is a default of 1 for every kind', () => {
    (['arrow', 'cross', 'circle', 'number', 'text'] as const).forEach(k => expect(DEFAULT_STYLE[k].thick).toBe(1));
  });
});

describe('vector drawing', () => {
  it('draws each kind of mark as SVG in the pixels of the picture, with its own colour and orientation', () => {
    expect(markSvg({ k: 'arrow', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, color: '#2563eb' }, W, H)).toContain('stroke="#2563eb"');
    expect(markSvg({ k: 'cross', x: 0.5, y: 0.5, angle: 30 }, W, H)).toContain('translate(400 300) rotate(30)');
    expect(markSvg({ k: 'circle', x: 0.5, y: 0.5 }, W, H)).toMatch(/<circle .*cx="400" cy="300"/);
    expect(markSvg({ k: 'number', x: 0.5, y: 0.5, n: 7 }, W, H)).toContain('>7</text>');
  });
  it('writes a word in its font, with a background, and escapes what the person typed', () => {
    const svg = markSvg({ k: 'text', x: 0.2, y: 0.5, t: 'Serrer <a> & "b"', font: 'serif', italic: true, bg: 'light' }, W, H);
    expect(svg).toContain('Serrer &lt;a&gt; &amp; &quot;b&quot;');
    expect(svg).toContain('Georgia');
    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('<rect');
    expect(markSvg({ k: 'text', x: 0.2, y: 0.5, t: 'Ok', bg: 'none' }, W, H)).not.toContain('<rect');
  });
  it('reads a picture saved by the previous version of the editor: photo and marks', () => {
    const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const marks: Mark[] = [{ k: 'arrow', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5, thick: 2 }, { k: 'text', x: 0.2, y: 0.8, t: 'À 12 Nm, « serré » & net', font: 'mono' }];
    const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const bytes = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"><metadata id="dc-marks">${esc(JSON.stringify(marks))}</metadata><image href="${photo}" width="1" height="1"/></svg>`);
    const back = splitPhoto(`data:image/svg+xml;base64,${btoa(String.fromCharCode(...bytes))}`);
    expect(back.photo).toBe(photo);
    expect(back.marks).toHaveLength(2);
    expect(back.marks[1]).toMatchObject({ k: 'text', t: 'À 12 Nm, « serré » & net', font: 'mono' });
    expect(back.marks[0]).toMatchObject({ k: 'arrow', thick: 2 });
  });
  it('leaves any other picture as it is, and refuses marks that are not marks', () => {
    expect(splitPhoto('data:image/jpeg;base64,AAAA')).toEqual({ photo: 'data:image/jpeg;base64,AAAA', marks: [] });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="dc-marks">[{"k":"cross","x":0.5,"y":0.5},{"k":"cross","x":"a","y":1},{"k":"zzz","x":1,"y":1},null]</metadata><image href="data:image/jpeg;base64,AAAA" width="1" height="1"/></svg>';
    const out = splitPhoto(`data:image/svg+xml;base64,${btoa(svg)}`);
    expect(out.marks).toEqual([{ k: 'cross', x: 0.5, y: 0.5 }]);
    expect(splitPhoto('data:image/svg+xml;base64,@@@')).toEqual({ photo: 'data:image/svg+xml;base64,@@@', marks: [] });
  });
});

describe('curved and double arrows', () => {
  const arrow: Mark = { k: 'arrow', x: 0.2, y: 0.5, x2: 0.8, y2: 0.5 };
  it('draws a curve with a quadratic path, and a second head when asked', () => {
    expect(markSvg(arrow, W, H)).not.toContain('Q');
    expect(markSvg({ ...arrow, curve: 0.8 }, W, H)).toContain('Q');
    const heads = (svg: string) => (svg.match(/L/g) || []).length;
    expect(heads(markSvg({ ...arrow, both: true }, W, H))).toBeGreaterThan(heads(markSvg(arrow, W, H)));
  });
  it('bends when its middle handle is pulled, and straightens close to the chord', () => {
    const bent = bendTo(arrow, 0.5, 0.35, W, H) as { curve: number };
    expect(Math.abs(bent.curve)).toBeGreaterThan(0.5);
    expect(bendTo(arrow, 0.5, 0.5 + 1 / H, W, H)).toMatchObject({ curve: 0 });
    const mid = handlesOf({ ...arrow, curve: bent.curve }, W, H).find(h => h.k === 'bend')!;
    expect(Math.abs(mid.y - 0.35 * H)).toBeLessThan(3);   // the handle sits where it was dragged
  });
  it('is found by a touch along its curve', () => {
    const c: Mark = { ...arrow, curve: 1 };
    const mid = handlesOf(c, W, H).find(h => h.k === 'bend')!;
    expect(hitMark([c], mid.x / W, mid.y / H, W, H)).toBe(0);
    expect(hitMark([c], 0.5, 0.5, W, H)).toBe(-1);
  });
});

describe('loupe and blur', () => {
  const loupe: Mark = { k: 'loupe', x: 0.3, y: 0.4, x2: 0.7, y2: 0.3 }, blur: Mark = { k: 'blur', x: 0.2, y: 0.2, x2: 0.4, y2: 0.35 };
  it('draws a loupe that copies the picture, and a blur clipped to its rectangle', () => {
    const l = markSvg(loupe, W, H, { base: '<g id="pic"/>', id: 'u1' }), b = markSvg(blur, W, H, { base: '<g id="pic"/>', id: 'u2' });
    expect(l).toContain('clip-path="url(#lc-u1)"');
    expect(l).toContain('scale(2.5)');
    expect(l).toContain('<g id="pic"/>');
    expect(b).toContain('feGaussianBlur');
    expect(b).toContain('clip-path="url(#bc-u2)"');
    expect(markSvg({ ...blur, solid: true }, W, H, { base: '', id: 'u3' })).not.toContain('feGaussianBlur');
  });
  it('has handles for its two points, and is hit inside the bubble or the rectangle', () => {
    expect(handlesOf(loupe, W, H).map(h => h.k).sort()).toEqual(['end1', 'end2', 'scale']);
    expect(handlesOf(blur, W, H).map(h => h.k).sort()).toEqual(['end1', 'end2']);
    expect(hitMark([loupe], 0.7, 0.3, W, H)).toBe(0);
    expect(hitMark([blur], 0.3, 0.28, W, H)).toBe(0);
    expect(hitMark([blur], 0.6, 0.6, W, H)).toBe(-1);
  });
  it('moves a corner of the blur with its handle', () => {
    expect(dragHandle(blur, 'end2', 0.6, 0.5, W, H)).toMatchObject({ x: 0.2, y: 0.2, x2: 0.6, y2: 0.5 });
  });
});

describe('scale handle', () => {
  it('grows a mark when its handle is pulled away, shrinks it when pushed in, within limits', () => {
    const cross: Mark = { k: 'cross', x: 0.5, y: 0.5 };
    const h = handlesOf(cross, W, H).find(q => q.k === 'scale')!;
    const out = scaleTo(cross, 0.5 + (h.x - 0.5 * W) * 2 / W, 0.5 + (h.y - 0.5 * H) * 2 / H, W, H) as { size: number };
    expect(out.size).toBeCloseTo(2, 1);
    expect((scaleTo(cross, 0.5, 0.5, W, H) as { size: number }).size).toBe(0.5);
    expect((scaleTo(cross, 5, 5, W, H) as { size: number }).size).toBe(3);
    expect(handlesOf({ k: 'blur', x: 0.1, y: 0.1, x2: 0.3, y2: 0.3 }, W, H).some(q => q.k === 'scale')).toBe(false);
  });
});

describe('quarter turns', () => {
  it('moves a mark and a crop with the picture, and turns crosses and words', () => {
    const m = turnMark({ k: 'cross', x: 0.2, y: 0.1, angle: 0 }, 1) as { x: number; y: number; angle: number };
    expect([m.x, m.y, m.angle]).toEqual([0.9, 0.2, 90]);
    const back = turnMark(turnMark({ k: 'arrow', x: 0.1, y: 0.2, x2: 0.7, y2: 0.4 }, 1), -1) as { x: number; y: number; x2: number; y2: number };
    expect([back.x, back.y, back.x2, back.y2].map(v => Math.round(v * 1000) / 1000)).toEqual([0.1, 0.2, 0.7, 0.4]);
    expect(turnMark({ k: 'text', x: 0.5, y: 0.5, t: 'a', angle: 170 }, 1)).toMatchObject({ angle: -100 });
    const c = turnCrop({ x: 0.1, y: 0.2, w: 0.5, h: 0.3 }, 1);
    expect([c.x, c.y, c.w, c.h].map(v => Math.round(v * 1000) / 1000)).toEqual([0.5, 0.1, 0.3, 0.5]);
    const r = turnCrop(c, -1);
    expect([r.x, r.y, r.w, r.h].map(v => Math.round(v * 1000) / 1000)).toEqual([0.1, 0.2, 0.5, 0.3]);
  });
});

describe('marks from data', () => {
  it('keeps what is known and in range, and drops the rest', () => {
    expect(cleanMark({ k: 'cross', x: 2, y: -1, color: '#FF0000', size: 9, font: 'comic', angle: 'a', evil: 'x' })).toEqual({ k: 'cross', x: 1, y: 0, color: '#FF0000', size: 3 });
    expect(cleanMark({ k: 'number', x: 0.5, y: 0.5, n: 3, label: 'Clipser' })).toMatchObject({ n: 3, label: 'Clipser' });
    expect(cleanMark({ k: 'arrow', x: 0.1, y: 0.1 })).toBeNull();
    expect(cleanMark({ k: 'script', x: 0, y: 0 })).toBeNull();
    expect(cleanMarks('nope')).toEqual([]);
    expect(cleanMarks([{ k: 'text', x: 0.1, y: 0.1, t: 'a'.repeat(200) }])[0]).toMatchObject({ t: 'a'.repeat(80) });
  });
  it('shows the handles of the picked mark in the editor overlay', () => {
    expect(selectionSvg({ k: 'arrow', x: 0.1, y: 0.1, x2: 0.5, y2: 0.5 }, W, H, 1)).toContain('rotate(45');   // the bend handle is a diamond
    expect(selectionSvg({ k: 'text', x: 0.1, y: 0.1, t: 'a' }, W, H, 1)).toContain('<circle');
  });
});
