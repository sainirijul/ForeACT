import type {
  AnalysisScope,
  DecisionPolicy,
  ForeACTProjectSpec,
  MethodConfig,
  ProfileResponse,
} from '../types/analysis';

type Props = {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  setSpec: (spec: ForeACTProjectSpec) => void;
};

export function MethodologyReviewPage({
  spec,
  profile,
  setSpec,
}: Props) {
  const fields = spec.field_model.fields;
  const scope = spec.methodology_model.scope;
  const methods = spec.methodology_model.methods;
  const policy = spec.decision_policy;

  function setScope(changes: Partial<AnalysisScope>) {
    setSpec({
      ...spec,
      methodology_model: {
        ...spec.methodology_model,
        scope: {
          ...scope,
          ...changes,
        },
      },
    });
  }

  function setMethods(changes: Partial<MethodConfig>) {
    setSpec({
      ...spec,
      methodology_model: {
        ...spec.methodology_model,
        methods: {
          ...methods,
          ...changes,
        },
      },
    });
  }

  function setPolicy(next: DecisionPolicy) {
    setSpec({
      ...spec,
      decision_policy: next,
    });
  }

  const versionCandidates = fields
    .filter(
      (field) =>
        field.role === 'forecast_version' &&
        field.include_in_model,
    )
    .map((field) => field.name);

  const horizonCandidates = fields
    .filter(
      (field) =>
        field.role === 'forecast_horizon' &&
        field.include_in_model,
    )
    .map((field) => field.name);

  const targetFields = fields
    .filter(
      (field) =>
        field.role === 'target' &&
        field.include_in_model,
    )
    .map((field) => field.name);

  const featureFields = fields
    .filter(
      (field) =>
        field.role === 'feature' &&
        field.include_in_model,
    )
    .map((field) => field.name);

  const forecastVersions = profile?.forecast_versions ?? [];

  return (
    <section className="page-grid">
      <article className="panel full-span">
        <p className="eyebrow">Methodology review</p>
        <h1>Configure forecast comparison and actionability</h1>

        <p>
          All selections on this page update the same central ForeACT
          project specification used by semantic modeling,
          transformation analysis, and decision-card generation.
        </p>
      </article>

      <article className="panel">
        <p className="eyebrow">Analysis scope</p>
        <h2>Forecast versions and period</h2>

        <div className="form-grid">
          <label>
            Version field

            <select
              value={scope.version_field}
              onChange={(event) =>
                setScope({
                  version_field: event.target.value,
                })
              }
            >
              <option value="">Select version field</option>

              {versionCandidates.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>

          <label>
            Horizon field

            <select
              value={scope.horizon_field}
              onChange={(event) =>
                setScope({
                  horizon_field: event.target.value,
                })
              }
            >
              <option value="">Select horizon field</option>

              {horizonCandidates.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>

          <label>
            Baseline version

            <select
              value={scope.baseline_version}
              onChange={(event) =>
                setScope({
                  baseline_version: event.target.value,
                })
              }
            >
              <option value="">Select baseline</option>

              {forecastVersions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </label>

          <label>
            Current version

            <select
              value={scope.current_version}
              onChange={(event) =>
                setScope({
                  current_version: event.target.value,
                })
              }
            >
              <option value="">Select current version</option>

              {forecastVersions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </label>

          <label>
            Period start

            <input
              value={scope.period_start}
              placeholder={profile?.period_min || 'YYYY-MM-DD'}
              onChange={(event) =>
                setScope({
                  period_start: event.target.value,
                })
              }
            />
          </label>

          <label>
            Period end

            <input
              value={scope.period_end}
              placeholder={profile?.period_max || 'YYYY-MM-DD'}
              onChange={(event) =>
                setScope({
                  period_end: event.target.value,
                })
              }
            />
          </label>
        </div>

        <div className="summary-grid">
          <div>
            <span>Targets</span>
            <strong>{targetFields.length}</strong>
          </div>

          <div>
            <span>Features</span>
            <strong>{featureFields.length}</strong>
          </div>

          <div>
            <span>Versions</span>
            <strong>{forecastVersions.length}</strong>
          </div>
        </div>

        <p className="muted">
          Baseline and current observations are aligned using the
          selected target variable and forecast period.
        </p>
      </article>

      <article className="panel">
        <p className="eyebrow">Method model</p>
        <h2>Variance and volatility methods</h2>

        <div className="form-grid">
          <label>
            Variance method

            <select
              value={methods.variance_method}
              onChange={(event) =>
                setMethods({
                  variance_method: event.target.value,
                })
              }
            >
              {profile?.method_catalog.variance_methods.map(
                (method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            Volatility method

            <select
              value={methods.volatility_method}
              onChange={(event) =>
                setMethods({
                  volatility_method: event.target.value,
                })
              }
            >
              {profile?.method_catalog.volatility_methods.map(
                (method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            Large variance threshold

            <input
              type="number"
              value={methods.variance_threshold_large}
              onChange={(event) =>
                setMethods({
                  variance_threshold_large: Number(
                    event.target.value,
                  ),
                })
              }
            />
          </label>

          <label>
            Moderate variance threshold

            <input
              type="number"
              value={methods.variance_threshold_moderate}
              onChange={(event) =>
                setMethods({
                  variance_threshold_moderate: Number(
                    event.target.value,
                  ),
                })
              }
            />
          </label>

          <label>
            High volatility threshold

            <input
              type="number"
              value={methods.volatility_threshold_high}
              onChange={(event) =>
                setMethods({
                  volatility_threshold_high: Number(
                    event.target.value,
                  ),
                })
              }
            />
          </label>

          <label>
            Medium volatility threshold

            <input
              type="number"
              value={methods.volatility_threshold_medium}
              onChange={(event) =>
                setMethods({
                  volatility_threshold_medium: Number(
                    event.target.value,
                  ),
                })
              }
            />
          </label>
        </div>

        <details className="formula-box">
          <summary>Custom method formulas</summary>

          <textarea
            value={methods.custom_variance_formula}
            placeholder="Example: ((current - baseline) / baseline) * 100"
            onChange={(event) =>
              setMethods({
                custom_variance_formula: event.target.value,
              })
            }
          />

          <textarea
            value={methods.custom_volatility_formula}
            placeholder="Example: (all_versions_std / all_versions_mean) * 100"
            onChange={(event) =>
              setMethods({
                custom_volatility_formula: event.target.value,
              })
            }
          />
        </details>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Decision policy model</p>
        <h2>{policy.name}</h2>

        <div className="policy-grid">
          {policy.rules.map((rule, index) => (
            <div className="policy-card" key={rule.id}>
              <strong>{rule.id}</strong>

              <input
                value={rule.when}
                onChange={(event) => {
                  const rules = [...policy.rules];

                  rules[index] = {
                    ...rule,
                    when: event.target.value,
                  };

                  setPolicy({
                    ...policy,
                    rules,
                  });
                }}
              />

              <input
                value={rule.then}
                onChange={(event) => {
                  const rules = [...policy.rules];

                  rules[index] = {
                    ...rule,
                    then: event.target.value,
                  };

                  setPolicy({
                    ...policy,
                    rules,
                  });
                }}
              />

              <textarea
                value={rule.rationale}
                onChange={(event) => {
                  const rules = [...policy.rules];

                  rules[index] = {
                    ...rule,
                    rationale: event.target.value,
                  };

                  setPolicy({
                    ...policy,
                    rules,
                  });
                }}
              />
            </div>
          ))}
        </div>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Method catalog</p>

        <div className="catalog-grid">
          {profile
            ? [
                ...profile.method_catalog.variance_methods,
                ...profile.method_catalog.volatility_methods,
              ].map((method) => (
                <div key={method.id} className="catalog-card">
                  <strong>{method.name}</strong>
                  <code>{method.formula}</code>
                  <p>{method.interpretation}</p>
                </div>
              ))
            : null}
        </div>
      </article>
    </section>
  );
}