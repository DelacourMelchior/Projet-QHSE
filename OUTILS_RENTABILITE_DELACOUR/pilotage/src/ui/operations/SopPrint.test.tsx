// The printed sheet of a work instruction (tool 3.2, SopPrint), for every example, in every format: it renders, and says what it must (workstation, version frame, protections, QR code, what to do
// when it goes wrong). The documents of tool 3.4 are in RcPrint.test.tsx (they were in the same file).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup as renderRaw } from 'react-dom/server';
import { plain } from './testPlain';
// the texts carry the narrow no-break spaces of nb(): read as plain spaces, on both sides of a comparison
const renderToStaticMarkup = (el: Parameters<typeof renderRaw>[0]) => plain(renderRaw(el));
import { demoState } from '../../domain/templates';
import { SopPrint, SopPrintBatch, pageOf, type PrintFormat } from './SopPrint';
import { stationUrl } from './SopBits';

describe('printed sheet of a work instruction', { timeout: 30000 }, () => {
  beforeAll(() => { vi.stubGlobal('window', { location: { href: 'https://outils.example.fr/pilotage.html', hostname: 'outils.example.fr', protocol: 'https:' } }); });
  const state = demoState(new Date(2026, 8, 25, 10, 0)), sops = Object.values(state.sops);
  const formats: PrintFormat[] = [{ size: 'A4', landscape: false }, { size: 'A3', landscape: true }, { size: 'A5', landscape: false }];
  it('renders every example in every format', () => {
    sops.forEach(s => formats.forEach(f => {
      const html = renderToStaticMarkup(<SopPrint s={s} company="Atelier" state={state} format={f} />);
      expect(html, `${s.id} ${pageOf(f)}`).toContain(plain(s.poste.replace(/'/g, '&#x27;')));
      expect(html).toContain(plain('<svg'));   // the QR code
      expect(html).toContain(plain('Habilités'));
    }));
  });
  it('tells the version frame, the change of version and what to do when it goes wrong', () => {
    const s = state.sops.sop_demo_4, html = renderToStaticMarkup(<SopPrint s={s} company="" state={state} format={formats[0]} />);
    expect(html).toContain(plain('cadre violet'));
    expect(html).toContain(plain('Nouvelle version V03'));
    expect(html).toContain(plain('Elle remplace la V02 (cadre ambre)'));
    expect(html).toContain(plain('Si ça ne va pas'));
    expect(html).toContain(plain('Protections obligatoires'));
    expect(pageOf(formats[1])).toBe('A3 landscape');
    expect(stationUrl(s.id)).toBe('https://outils.example.fr/pilotage.html#3.2~station%3Asop_demo_4');
  });
  it('puts one sheet per page in a batch', () => {
    const html = renderToStaticMarkup(<SopPrintBatch items={sops.slice(0, 3)} company="" state={state} format={formats[0]} />);
    expect(html.match(/break-after:page/g)).toHaveLength(2);
  });
});
