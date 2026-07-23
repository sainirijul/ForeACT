import { useEffect } from "react";
import type {
  AnalysisScope,
  DecisionPolicy,
  ForeACTProjectSpec,
  MethodConfig,
  ProfileResponse,
} from "../types/analysis";

type Props = {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  setSpec: (spec: ForeACTProjectSpec) => void;
};

const MONTH_INDEX: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function normalizePeriod(value: string | null | undefined): string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const canonicalMatch = /^(\d{4})-(\d{2})$/.exec(text);

  if (canonicalMatch) {
    const month = Number(canonicalMatch[2]);

    return month >= 1 && month <= 12 ? text : "";
  }

  const shortMonthMatch = /^([A-Za-z]{3})[-\s](\d{2}|\d{4})$/.exec(text);

  if (shortMonthMatch) {
    const month = MONTH_INDEX[shortMonthMatch[1].toLowerCase()];

    if (!month) {
      return "";
    }

    const rawYear = shortMonthMatch[2];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

    return `${year}-${month}`;
  }

  return text;
}

function formatPeriodLabel(value: string): string {
  const normalized = normalizePeriod(value);
  const match = /^(\d{4})-(\d{2})$/.exec(normalized);

  if (!match) {
    return value;
  }

  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthLabel = date.toLocaleDateString("en-CA", {
    month: "short",
  });

  return `${monthLabel}-${year.slice(-2)}`;
}

function uniqueCanonical(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizePeriod)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
}

export function MethodologyReviewPage({ spec, profile, setSpec }: Props) {
  const fields = spec.field_model.fields;
  const scope = spec.methodology_model.scope;
  const methods = spec.methodology_model.methods;
  const policy = spec.decision_policy;

  const forecastVersions = uniqueCanonical(profile?.forecast_versions ?? []);
  const forecastPeriods = uniqueCanonical(profile?.forecast_periods ?? []);

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
      (field) => field.role === "forecast_version" && field.include_in_model,
    )
    .map((field) => field.name);

  const horizonCandidates = fields
    .filter(
      (field) => field.role === "forecast_horizon" && field.include_in_model,
    )
    .map((field) => field.name);

  const targetFields = fields
    .filter((field) => field.role === "target" && field.include_in_model)
    .map((field) => field.name);

  const featureFields = fields
    .filter((field) => field.role === "feature" && field.include_in_model)
    .map((field) => field.name);

  /*
   * Reconcile stale values retained from a previous dataset.
   * Internal values always use YYYY-MM, while labels are formatted uniformly.
   */
  useEffect(() => {
    if (!profile) {
      return;
    }

    const nextScope: AnalysisScope = {
      ...scope,
      baseline_version: normalizePeriod(scope.baseline_version),
      current_version: normalizePeriod(scope.current_version),
      period_start: normalizePeriod(scope.period_start),
      period_end: normalizePeriod(scope.period_end),
    };

    if (forecastVersions.length > 0) {
      if (!forecastVersions.includes(nextScope.baseline_version)) {
        nextScope.baseline_version =
          forecastVersions.length >= 2
            ? forecastVersions[forecastVersions.length - 2]
            : forecastVersions[0];
      }

      if (!forecastVersions.includes(nextScope.current_version)) {
        nextScope.current_version =
          forecastVersions[forecastVersions.length - 1];
      }

      if (
        forecastVersions.length >= 2 &&
        nextScope.baseline_version >= nextScope.current_version
      ) {
        nextScope.baseline_version =
          forecastVersions[forecastVersions.length - 2];
        nextScope.current_version =
          forecastVersions[forecastVersions.length - 1];
      }
    }

    if (forecastPeriods.length > 0) {
      if (!forecastPeriods.includes(nextScope.period_start)) {
        nextScope.period_start = forecastPeriods[0];
      }

      if (!forecastPeriods.includes(nextScope.period_end)) {
        nextScope.period_end = forecastPeriods[forecastPeriods.length - 1];
      }

      if (nextScope.period_start > nextScope.period_end) {
        nextScope.period_end = nextScope.period_start;
      }
    }

    const changed =
      nextScope.baseline_version !== scope.baseline_version ||
      nextScope.current_version !== scope.current_version ||
      nextScope.period_start !== scope.period_start ||
      nextScope.period_end !== scope.period_end;

    if (changed) {
      setScope(nextScope);
    }
  }, [
    profile,
    forecastVersions.join("|"),
    forecastPeriods.join("|"),
    scope.baseline_version,
    scope.current_version,
    scope.period_start,
    scope.period_end,
  ]);

  const currentVersionOptions = forecastVersions.filter(
    (version) =>
      !scope.baseline_version ||
      version > normalizePeriod(scope.baseline_version),
  );

  const endPeriodOptions = forecastPeriods.filter(
    (period) =>
      !scope.period_start || period >= normalizePeriod(scope.period_start),
  );

  function handleBaselineChange(nextBaseline: string) {
    const normalizedBaseline = normalizePeriod(nextBaseline);
    const currentIsValid =
      scope.current_version &&
      normalizePeriod(scope.current_version) > normalizedBaseline &&
      forecastVersions.includes(normalizePeriod(scope.current_version));

    const nextCurrent = currentIsValid
      ? normalizePeriod(scope.current_version)
      : (forecastVersions.find((version) => version > normalizedBaseline) ??
        "");

    setScope({
      baseline_version: normalizedBaseline,
      current_version: nextCurrent,
    });
  }

  function handleCurrentChange(nextCurrent: string) {
    const normalizedCurrent = normalizePeriod(nextCurrent);

    if (
      scope.baseline_version &&
      normalizedCurrent <= normalizePeriod(scope.baseline_version)
    ) {
      return;
    }

    setScope({ current_version: normalizedCurrent });
  }

  function handlePeriodStartChange(nextStart: string) {
    const normalizedStart = normalizePeriod(nextStart);
    const normalizedEnd = normalizePeriod(scope.period_end);

    setScope({
      period_start: normalizedStart,
      period_end:
        !normalizedEnd || normalizedEnd < normalizedStart
          ? normalizedStart
          : normalizedEnd,
    });
  }

  function handlePeriodEndChange(nextEnd: string) {
    const normalizedEnd = normalizePeriod(nextEnd);

    if (
      scope.period_start &&
      normalizedEnd < normalizePeriod(scope.period_start)
    ) {
      return;
    }

    setScope({ period_end: normalizedEnd });
  }

  return (
    <section className="page-grid">
      <article className="panel full-span">
        <p className="eyebrow">Methodology review</p>
        <h1>Configure forecast comparison and actionability</h1>

        <p>
          All selections on this page update the same central ForeACT project
          specification used by semantic modeling, transformation analysis, and
          decision-card generation.
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
                setScope({ version_field: event.target.value })
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
                setScope({ horizon_field: event.target.value })
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
              value={normalizePeriod(scope.baseline_version)}
              onChange={(event) => handleBaselineChange(event.target.value)}
            >
              <option value="">Select baseline</option>

              {forecastVersions.map((version) => (
                <option key={version} value={version}>
                  {formatPeriodLabel(version)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Current version
            <select
              value={normalizePeriod(scope.current_version)}
              onChange={(event) => handleCurrentChange(event.target.value)}
            >
              <option value="">Select current version</option>

              {currentVersionOptions.map((version) => (
                <option key={version} value={version}>
                  {formatPeriodLabel(version)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Period start
            <select
              value={normalizePeriod(scope.period_start)}
              onChange={(event) => handlePeriodStartChange(event.target.value)}
            >
              {forecastPeriods.map((period) => (
                <option key={period} value={period}>
                  {formatPeriodLabel(period)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Period end
            <select
              value={normalizePeriod(scope.period_end)}
              onChange={(event) => handlePeriodEndChange(event.target.value)}
            >
              {endPeriodOptions.map((period) => (
                <option key={period} value={period}>
                  {formatPeriodLabel(period)}
                </option>
              ))}
            </select>
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
          Baseline and current forecast values are aligned using the selected
          target variable and forecast period.
        </p>
      </article>

      <article className="panel">
        <p className="eyebrow">Method model</p>
        <h2>Revision and volatility methods</h2>

        <div className="form-grid">
          <label>
            Revision method
            <select
              value={methods.revision_method}
              onChange={(event) =>
                setMethods({ revision_method: event.target.value })
              }
            >
              {profile?.method_catalog.revision_methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Volatility method
            <select
              value={methods.volatility_method}
              onChange={(event) =>
                setMethods({ volatility_method: event.target.value })
              }
            >
              {profile?.method_catalog.volatility_methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Large revision magnitude threshold
            <input
              type="number"
              value={methods.revision_magnitude_threshold_large}
              onChange={(event) =>
                setMethods({
                  revision_magnitude_threshold_large: Number(
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
                  volatility_threshold_high: Number(event.target.value),
                })
              }
            />
          </label>
        </div>

        <details className="formula-box">
          <summary>Custom method formulas</summary>

          <textarea
            value={methods.custom_revision_formula}
            placeholder="Example: ((current - baseline) / baseline) * 100"
            onChange={(event) =>
              setMethods({
                custom_revision_formula: event.target.value,
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

                  setPolicy({ ...policy, rules });
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

                  setPolicy({ ...policy, rules });
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

                  setPolicy({ ...policy, rules });
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
                ...profile.method_catalog.revision_methods,
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
