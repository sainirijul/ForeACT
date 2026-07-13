import type { AnalysisScope, FieldSpec, ProfileResponse } from '../types/analysis';

type Props = {
  profile: ProfileResponse;
  fieldSpecs: FieldSpec[];
  scope: AnalysisScope;
  setScope: (next: AnalysisScope) => void;
};

export function AnalysisScopePanel({ profile, fieldSpecs, scope, setScope }: Props) {
  const patch = (p: Partial<AnalysisScope>) => setScope({ ...scope, ...p });
  const versionFields = fieldSpecs.filter((f) => f.role === 'forecast_version').map((f) => f.name);
  const horizonFields = fieldSpecs.filter((f) => f.role === 'forecast_horizon').map((f) => f.name);
  const versions = profile.forecast_versions || [];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">DSL step 2</p>
          <h2>Analysis Scope Model</h2>
          <p className="muted">Bind forecast versions to the same forecast horizon before computing variance and volatility.</p>
        </div>
      </div>
      <div className="threshold-grid">
        <label>Version field
          <select value={scope.version_field} onChange={(e) => patch({ version_field: e.target.value })}>
            {[scope.version_field, ...versionFields].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Forecast horizon field
          <select value={scope.horizon_field} onChange={(e) => patch({ horizon_field: e.target.value })}>
            {[scope.horizon_field, ...horizonFields].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Baseline version
          <select value={scope.baseline_version} onChange={(e) => patch({ baseline_version: e.target.value })}>
            {[scope.baseline_version, ...versions].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Current version
          <select value={scope.current_version} onChange={(e) => patch({ current_version: e.target.value })}>
            {[scope.current_version, ...versions].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Period start<input value={scope.period_start} onChange={(e) => patch({ period_start: e.target.value })} placeholder={profile.period_min || '2027-01'} /></label>
        <label>Period end<input value={scope.period_end} onChange={(e) => patch({ period_end: e.target.value })} placeholder={profile.period_max || '2028-12'} /></label>
      </div>
    </section>
  );
}
