// SHA-256 in plain JavaScript: the known vectors (FIPS 180-2), the UTF-8 reading, the lengths around the padding, and the same result as the platform.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256 } from './sha256';

describe('sha256', () => {
  it('gives the known vectors', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    expect(sha256('The quick brown fox jumps over the lazy dog')).toBe('d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });
  it('reads the text as UTF-8 (accents, symbols and characters beyond the first plane)', () => {
    expect(sha256('é')).toBe('4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
    expect(sha256('Réception prononcée : « sans réserve » \u{1F4E6}')).toBe(createHash('sha256').update('Réception prononcée : « sans réserve » \u{1F4E6}', 'utf8').digest('hex'));
  });
  it('gives the result of the platform at every length around the padding blocks (55, 56, 63, 64, 119, 120 bytes) and for a long text', () => {
    [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 121, 1000].forEach(n => { const t = 'x'.repeat(n); expect(sha256(t)).toBe(createHash('sha256').update(t).digest('hex')); });
    const big = JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ i, t: `ligne ${i} é` })));
    expect(sha256(big)).toBe(createHash('sha256').update(big).digest('hex'));
  });
  it('gives the vector of one million "a"', () => {
    expect(sha256('a'.repeat(1_000_000))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });
});
