// Rating scale of the Plans B (1.2): wording of the levels (everyone, a blank level keeps the original wording)
// and gravity bounds in € (direction only). The wording is saved as typed, the bounds when a field is left (they must increase).
import { useState } from 'react';
import { formatValue, parseNumber } from '../domain/numbers';
import { autoThresholds, DEFAULT_SCALE } from '../domain/risk';
import { useStore } from '../store/StoreContext';
import { Button, Field, inputCls, ToolSettings } from './common';

export function RiskScaleSettings() {
  const { state, update, teamView } = useStore();
  const [th, setTh] = useState<string[]>(() => (state?.settings.gravityThresholds || ['', '', '']).map(String));
  const [msg, setMsg] = useState('');
  if (!state) return null;
  const auto = autoThresholds(state.settings);

  const saveBounds = (next: string[]) => {
    const nums = next.map(v => (v.trim() === '' ? null : parseNumber(v)));
    const custom = nums.every(v => v === null) ? null : nums.map((v, i) => v ?? auto[i]) as [number, number, number];
    if (custom && !(custom[0] < custom[1] && custom[1] < custom[2])) return setMsg('Les seuils de gravité doivent être croissants.');
    setMsg('');
    update(d => { d.settings.gravityThresholds = custom; });
  };
  const reset = () => { setTh(['', '', '']); setMsg(''); update(d => { d.scale = structuredClone(DEFAULT_SCALE); d.settings.gravityThresholds = null; }); };

  return (
    <ToolSettings title="Réglages de cet outil : échelle de cotation">
      {msg && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">{msg}</p>}
      {!teamView && (
        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold text-slate-700">Seuils de gravité (€ par incident)</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {['Mineure : moins de', 'Sérieuse : moins de', 'Grave : moins de'].map((l, i) => (
              <Field key={l} label={l}><input inputMode="decimal" className={inputCls} value={th[i]} placeholder={formatValue(auto[i], '€')} onChange={e => setTh(th.map((x, j) => (j === i ? e.target.value : x)))} onBlur={() => saveBounds(th)} /></Field>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Au-delà du dernier seuil : critique. Vide = calcul automatique d'après l'objectif de CA de l'outil 1.1 (0,2 %, 2 % et 8 %).</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(['gravity', 'likelihood'] as const).map(k => (
          <div key={k} className="space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700">{k === 'gravity' ? 'Gravité : conséquences de chaque niveau' : 'Probabilité : fréquence de chaque niveau'}</span>
            {DEFAULT_SCALE[k].map((_, i) => (
              <input key={i} className={inputCls} value={state.scale[k][i] ?? ''} placeholder={DEFAULT_SCALE[k][i]} aria-label={`${k === 'gravity' ? 'Gravité' : 'Probabilité'} ${i + 1}`}
                onChange={e => update(d => { d.scale[k][i] = e.target.value; })} />
            ))}
          </div>
        ))}
      </div>
      <Button kind="ghost" onClick={reset}>Revenir à l'échelle d'origine</Button>
    </ToolSettings>
  );
}
