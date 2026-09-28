// A screen that fails shows what failed and a way back, instead of a blank page that only a reload clears.
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; onBack?: () => void; label?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  back = () => { this.setState({ error: null }); this.props.onBack?.(); };
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="m-4 space-y-2 rounded-xl border border-red-200 bg-white p-4 text-xs text-slate-800 shadow">
        <p className="text-sm font-bold text-red-800">{this.props.label || 'Cet écran'} n'a pas pu s'afficher.</p>
        <p>Vos données ne sont pas touchées. Revenez en arrière ; si le problème revient, envoyez ce message au Cabinet Delacour :</p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-[11px]">{error.message}{'\n'}{error.stack?.split('\n').slice(0, 4).join('\n')}</pre>
        <button type="button" onClick={this.back} className="rounded-lg bg-delacour-primary px-3 py-1.5 text-xs font-semibold text-white">Revenir</button>
      </div>
    );
  }
}
