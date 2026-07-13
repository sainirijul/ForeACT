import type { AnalysisResponse } from '../types/analysis';

export function SummaryCards({ analysis }: { analysis: AnalysisResponse }) {
  const { dataset_profile } = analysis;
  const pass = analysis.conformance_results.filter((r) => r.status === 'pass').length;
  const warnings = analysis.conformance_results.filter((r) => r.status === 'warning').length;
  const features = dataset_profile.field_specs.filter((f) => f.role === 'feature' && f.include_in_model).length;
  const targets = dataset_profile.field_specs.filter((f) => f.role === 'target' && f.include_in_model).length;
  return (
    <section className="grid four">
      <div className="metric-card"><span>Features in model</span><strong>{features}</strong></div>
      <div className="metric-card"><span>Targets assured</span><strong>{targets}</strong></div>
      <div className="metric-card"><span>Rules passed</span><strong>{pass}</strong></div>
      <div className="metric-card"><span>Warnings</span><strong>{warnings}</strong></div>
    </section>
  );
}
