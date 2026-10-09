// P-14 / S-13: the address printed under a QR code is the application (origin and path) and the record, never the query string of the page; an address that dies at the move online is told.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusOfHash, isLocalAddress, toolUrl } from './tools';

afterEach(() => vi.unstubAllGlobals());
const at = (href: string) => vi.stubGlobal('window', { location: { href } });

describe('toolUrl: what a QR code carries', () => {
  it('keeps the origin, the path and the record, and drops the query string (a session or a share token of the hosting never ends up on paper)', () => {
    at('https://app.exemple.fr/pilotage/index.html?session=SECRET123&user=jean.dupont@client.fr#2.3');
    expect(toolUrl('3.4', 'jalon:dl_demo_9')).toBe('https://app.exemple.fr/pilotage/index.html#3.4~jalon%3Adl_demo_9');
    expect(toolUrl('3.4')).toBe('https://app.exemple.fr/pilotage/index.html#3.4');
    expect(toolUrl('1.1')).toBe('https://app.exemple.fr/pilotage/index.html#1.1');
    expect(toolUrl('1.3')).toBe('https://app.exemple.fr/pilotage/index.html#annuaire');
  });

  it('drops a login typed in the address, keeps the port, and reads back the record', () => {
    at('https://jean:secret@app.exemple.fr:8443/p/?x=1');
    expect(toolUrl('3.2', 'station:sop 1')).toBe('https://app.exemple.fr:8443/p/#3.2~station%3Asop%201');
    expect(focusOfHash(toolUrl('3.2', 'station:sop 1').slice(toolUrl('3.2', 'station:sop 1').indexOf('#')))).toBe('station:sop 1');
  });

  it('a file of the disk keeps its path (the warning that says it dies at the move online is shown by isLocalAddress)', () => {
    at('file:///Users/marie/Documents/pilotage.html?web=1#3.4');
    expect(toolUrl('3.4', 'reception:dl_1')).toBe('file:///Users/marie/Documents/pilotage.html#3.4~reception%3Adl_1');
  });
});

describe('isLocalAddress: an address that stops serving the day the application is hosted', () => {
  const loc = (hostname: string, protocol = 'https:') => ({ hostname, protocol });
  it('is true for this computer, a file, the local network, a test name', () => {
    for (const h of ['localhost', '127.0.0.1', '[::1]', '', '192.168.1.20', '192.168.0.5', '10.0.0.7', '10.12.200.3', '172.16.4.2', '172.31.255.1', '169.254.1.1', 'poste-atelier.local', 'app.test', 'delacour.lan', 'tablette.localhost', 'APP.LOCAL'])
      expect(isLocalAddress(loc(h, 'http:')), h).toBe(true);
    expect(isLocalAddress(loc('', 'file:'))).toBe(true);
    expect(isLocalAddress(loc('anything', 'file:'))).toBe(true);
  });
  it('is false for a public domain and for addresses that only look like a local one', () => {
    for (const h of ['app.delacour-qhse.fr', 'pilotage.exemple.com', '172.32.0.1', '172.15.0.1', '11.0.0.1', '192.169.1.1', '10.example.com', 'localhost.exemple.fr', 'testing.fr'])
      expect(isLocalAddress(loc(h)), h).toBe(false);
  });
});
