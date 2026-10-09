// S-17: an address typed by someone (a customer, on the company tablet) never adds a header or a recipient to the mail that opens.
import { describe, expect, it } from 'vitest';
import { mailtoOf, plainEmail } from './BilanClients';

describe('plainEmail / mailtoOf', () => {
  it('lets one plain address through, trimmed', () => {
    expect(plainEmail('  jean.dupont+qhse@client.fr ')).toBe('jean.dupont+qhse@client.fr');
    expect(mailtoOf('jean.dupont+qhse@client.fr', '?subject=A')).toBe('mailto:jean.dupont%2Bqhse@client.fr?subject=A');
    expect(mailtoOf(undefined)).toBe('mailto:');   // no address: the mail opens without a recipient, nothing hidden
  });
  it('refuses what would add a header or a recipient', () => {
    for (const bad of ['a@b.fr?bcc=x@y.fr', 'a@b.fr?bcc=x%40y.fr', 'a@b.fr&cc=x', 'a@b.fr,x@y.fr', 'a@b.fr;x@y.fr', 'a@b.fr x@y.fr', 'a@b.fr\nbcc: x@y.fr', '<a@b.fr>', 'a.fr', '@b.fr', 'a@']) expect(plainEmail(bad)).toBe('');
    expect(mailtoOf('a@b.fr?bcc=x@y.fr', '?subject=A')).toBe('mailto:?subject=A');   // never a link carrying the typed text
  });
  it('encodes what is left, so the address stays the address', () => {
    expect(mailtoOf("o'brien@client.fr")).toBe("mailto:o'brien@client.fr");
    expect(mailtoOf('é@client.fr')).toBe('mailto:%C3%A9@client.fr');
  });
});
