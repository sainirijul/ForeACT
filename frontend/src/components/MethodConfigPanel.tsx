import type { MethodCatalog, MethodConfig } from '../types/analysis';

type Props = {
  catalog: MethodCatalog;
  methods: MethodConfig;
  setMethods: (next: MethodConfig) => void;
  onAnalyze: () => void;
  loading: boolean;
};

export function MethodConfigPanel({ catalog, methods, setMethods, onAnalyze, loading }: Props) {
  const variance = catalog.variance_methods.find((m) => m.id === methods.variance_method);
  const volatility = catalog.volatility_methods.find((m) => m.id === methods.volatility_method);
  const patch = (p: Partial<MethodConfig>) => setMethods({ ...methods, ...p });

  return (
    <section className="panel">
      <div className="panel-header split">
        <div>
          <p className="eyebrow">DSL step 3</p>
          <h2>Method Model</h2>
          <p className="muted">Select the declared transformation methods used to compute variance, volatility, thresholds, and decision classes from aligned forecast versions.</p>
        </div>
        <button className="primary-btn" disabled={loading} onClick={onAnalyze}>Compile model and analyze</button>
      </div>
      <div className="method-grid">
        <div className="method-card">
          <label>Variance method</label>
          <select value={methods.variance_method} onChange={(e) => patch({ variance_method: e.target.value })}>
            {catalog.variance_methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select>
          <code>{variance?.formula}</code>
          <p>{variance?.interpretation}</p>
          {methods.variance_method === 'custom' && <input placeholder="Example: ((current - previous) / previous) * 100" value={methods.custom_variance_formula} onChange={(e) => patch({ custom_variance_formula: e.target.value })} />}
        </div>
        <div className="method-card">
          <label>Volatility method</label>
          <select value={methods.volatility_method} onChange={(e) => patch({ volatility_method: e.target.value })}>
            {catalog.volatility_methods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
          </select>
          <code>{volatility?.formula}</code>
          <p>{volatility?.interpretation}</p>
          {methods.volatility_method === 'custom' && <input placeholder="Example: rolling_std or driver_volatility" value={methods.custom_volatility_formula} onChange={(e) => patch({ custom_volatility_formula: e.target.value })} />}
        </div>
      </div>
      <div className="threshold-grid">
        <label>Rolling window<input type="number" min={2} value={methods.rolling_window} onChange={(e) => patch({ rolling_window: Number(e.target.value) })} /></label>
        <label>Large variance ≥<input type="number" value={methods.variance_threshold_large} onChange={(e) => patch({ variance_threshold_large: Number(e.target.value) })} /></label>        <label>High volatility ≥<input type="number" value={methods.volatility_threshold_high} onChange={(e) => patch({ volatility_threshold_high: Number(e.target.value) })} /></label>      </div>
    </section>
  );
}
