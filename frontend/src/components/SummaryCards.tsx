import type { AnalysisResponse } from "../types/analysis";

export function SummaryCards({ analysis }: { analysis: AnalysisResponse }) {
  const { dataset_profile } = analysis;
  const pass = analysis.conformance_results.filter(
    (r) => r.status === "pass",
  ).length;
  const warnings = analysis.conformance_results.filter(
    (r) => r.status === "warning",
  ).length;
  const features = dataset_profile.field_specs.filter(
    (f) => f.role === "feature" && f.include_in_model,
  ).length;
  const targets = dataset_profile.field_specs.filter(
    (f) => f.role === "target" && f.include_in_model,
  ).length;
  return (
    <div className="metric-row">
      <span>
        <strong>{features}</strong>
        <small>Features in model</small>
      </span>
      <span>
        <strong>{targets}</strong>
        <small>Targets assured</small>
      </span>
      <span>
        <strong>{pass}</strong>
        <small>Rules passed</small>
      </span>
      <span>
        <strong>{warnings}</strong>
        <small>Warnings</small>
      </span>
    </div>
  );
}
