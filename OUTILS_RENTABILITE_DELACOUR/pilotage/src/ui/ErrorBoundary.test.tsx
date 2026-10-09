// The error screen of the whole application offers the data as the browser holds them (audit V-04): the only way out of a blank page that does not empty the site.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ErrorBoundary } from './ErrorBoundary';

// the screen a boundary shows once it caught an error (server rendering does not catch: the state is set as the catch would)
const failed = (props: ConstructorParameters<typeof ErrorBoundary>[0]) => {
  const b = new ErrorBoundary(props);
  b.state = { error: new Error('Cannot read properties of undefined') };
  return renderToStaticMarkup(b.render() as React.ReactElement);
};

describe('ErrorBoundary', () => {
  it('shows the way back and, for the whole application, a download of the raw data', () => {
    const h = failed({ children: null, label: "L'application", raw: () => '{"timeline":null}' });
    expect(h).toContain('Revenir');
    expect(h).toContain('Télécharger les données brutes');
  });
  it('a screen (no raw data given) or an application without data has no such button', () => {
    expect(failed({ children: null })).not.toContain('Télécharger');
    expect(failed({ children: null, raw: () => null })).not.toContain('Télécharger');
  });
  it('without an error it shows its children', () => {
    expect(renderToStaticMarkup(<ErrorBoundary raw={() => 'x'}><p>Écran</p></ErrorBoundary>)).toBe('<p>Écran</p>');
  });
});
