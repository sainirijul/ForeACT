import type { AnalysisScope, DecisionPolicy, ForeACTProjectSpec, MethodConfig, ProfileResponse } from '../types/analysis';

export function MethodologyReviewPage({ spec, profile, setSpec }: { spec: ForeACTProjectSpec; profile: ProfileResponse | null; setSpec: (spec: ForeACTProjectSpec) => void }) {
  const methods = spec.methodology_model.methods;
  const scope = spec.methodology_model.scope;
  const policy = spec.decision_policy;
  const fields = spec.field_model.fields;

  function setMethods(patch: Partial<MethodConfig>) {
    setSpec({ ...spec, methodology_model: { ...spec.methodology_model, methods: { ...methods, ...patch } } });
  }

  function setScope(patch: Partial<AnalysisScope>) {
    setSpec({ ...spec, methodology_model: { ...spec.methodology_model, scope: { ...scope, ...patch } } });
  }

  function setPolicy(next: DecisionPolicy) {
    setSpec({ ...spec, decision_policy: next });
  }

  const versionCandidates = fields.filter((f) => ['forecast_version', 'forecast_horizon'].includes(f.role)).map((f) => f.name);

  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Steps 2–3</p>
        <h2>Methodology Review and Analysis Scope</h2>
        <p>Declare the analysis horizon, aligned forecast versions, variance method, volatility method, thresholds, and policy rules before any signal is produced.</p>
      </article>

      <article className="panel">
        <p className="eyebrow">Scope binding</p>
        <h2>Forecast versions and period</h2>
        <div className="form-grid">
          <label>Version field<select value={scope.version_field} onChange={(e) => setScope({ version_field: e.target.value })}>{versionCandidates.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>Horizon field<select value={scope.horizon_field} onChange={(e) => setScope({ horizon_field: e.target.value })}>{versionCandidates.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>Baseline version<select value={scope.baseline_version} onChange={(e) => setScope({ baseline_version: e.target.value })}>{profile?.forecast_versions.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>Current version<select value={scope.current_version} onChange={(e) => setScope({ current_version: e.target.value })}>{profile?.forecast_versions.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>Period start<input value={scope.period_start} onChange={(e) => setScope({ period_start: e.target.value })} /></label>
          <label>Period end<input value={scope.period_end} onChange={(e) => setScope({ period_end: e.target.value })} /></label>
        </div>
        <p className="helper-text">Variance is computed only after baseline and current forecast versions are aligned for the same target variable and future period.</p>
      </article>

      <article className="panel">
        <p className="eyebrow">Method model</p>
        <h2>Variance and volatility methods</h2>
        <div className="form-grid">
          <label>Variance method<select value={methods.variance_method} onChange={(e) => setMethods({ variance_method: e.target.value })}>{profile?.method_catalog.variance_methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label>Volatility method<select value={methods.volatility_method} onChange={(e) => setMethods({ volatility_method: e.target.value })}>{profile?.method_catalog.volatility_methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label>Large variance threshold<input type="number" value={methods.variance_threshold_large} onChange={(e) => setMethods({ variance_threshold_large: Number(e.target.value) })} /></label>
          <label>Moderate variance threshold<input type="number" value={methods.variance_threshold_moderate} onChange={(e) => setMethods({ variance_threshold_moderate: Number(e.target.value) })} /></label>
          <label>High volatility threshold<input type="number" value={methods.volatility_threshold_high} onChange={(e) => setMethods({ volatility_threshold_high: Number(e.target.value) })} /></label>
          <label>Medium volatility threshold<input type="number" value={methods.volatility_threshold_medium} onChange={(e) => setMethods({ volatility_threshold_medium: Number(e.target.value) })} /></label>
        </div>
        <details className="formula-box"><summary>Custom method formulas</summary>
          <textarea value={methods.custom_variance_formula} placeholder="Example: ((current - baseline) / baseline) * 100" onChange={(e) => setMethods({ custom_variance_formula: e.target.value })} />
          <textarea value={methods.custom_volatility_formula} placeholder="Example: (all_versions_std / all_versions_mean) * 100" onChange={(e) => setMethods({ custom_volatility_formula: e.target.value })} />
        </details>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Decision policy model</p>
        <h2>{policy.name}</h2>
        <div className="policy-grid">
          {policy.rules.map((rule, idx) => (
            <div className="policy-card" key={rule.id}>
              <strong>{rule.id}</strong>
              <input value={rule.when} onChange={(e) => { const rules = [...policy.rules]; rules[idx] = { ...rule, when: e.target.value }; setPolicy({ ...policy, rules }); }} />
              <input value={rule.then} onChange={(e) => { const rules = [...policy.rules]; rules[idx] = { ...rule, then: e.target.value }; setPolicy({ ...policy, rules }); }} />
              <textarea value={rule.rationale} onChange={(e) => { const rules = [...policy.rules]; rules[idx] = { ...rule, rationale: e.target.value }; setPolicy({ ...policy, rules }); }} />
            </div>
          ))}
        </div>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Method catalog</p>
        <div className="catalog-grid">
          {profile ? profile.method_catalog.variance_methods.concat(profile.method_catalog.volatility_methods).map((m) => <div key={m.id} className="catalog-card"><strong>{m.name}</strong><code>{m.formula}</code><p>{m.interpretation}</p></div>) : null}
        </div>
      </article>
    </section>
  );
}
