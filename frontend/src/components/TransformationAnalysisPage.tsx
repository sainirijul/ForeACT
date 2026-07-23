import type {
  AnalysisResponse,
  ForeACTProjectSpec,
  ProfileResponse,
} from "../types/analysis";
import {
  graphToFlow,
  MetamodelGraphView,
  modelInstanceToFlow,
} from "./GraphViews";

export function TransformationAnalysisPage({
  spec,
  profile,
  analysis,
  onAnalyze,
}: {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  analysis: AnalysisResponse | null;
  onAnalyze: () => void;
}) {
  const metamodelFlow = analysis
    ? graphToFlow(analysis.metamodel.graph)
    : { nodes: [], edges: [] };
  const instanceFlow = analysis
    ? modelInstanceToFlow(analysis)
    : { nodes: [], edges: [] };
  const preview =
    analysis?.forecast_comparison_preview ||
    analysis?.aligned_forecast_preview ||
    [];
  const targetCount = spec.field_model.fields.filter(
    (f) => f.role === "target" && f.include_in_model,
  ).length;
  const featureCount = spec.field_model.fields.filter(
    (f) => f.role === "feature" && f.include_in_model,
  ).length;
  const completeFields = spec.field_model.fields.filter(
    (f) => f.business_name && f.unit && f.semantic_type && f.description,
  ).length;
  const semanticCompleteness = spec.field_model.fields.length
    ? Math.round((completeFields / spec.field_model.fields.length) * 100)
    : 0;

  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">Compiled model</p>
        <h2>Model rigor and assurance view</h2>
        <p>
          ForeACT uses the Ecore metamodel as the single source of truth. The
          backend compiles the current project specification into a forecast
          comparison model, signal model, and decision model. This page shows
          the abstract model-level evidence without exposing internal
          transformation plumbing as the primary UI.
        </p>
        <div className="metric-row">
          <span>
            <strong>{profile?.rows ?? 0}</strong>
            <small>Dataset rows</small>
          </span>
          <span>
            <strong>{targetCount}</strong>
            <small>Target fields</small>
          </span>
          <span>
            <strong>{featureCount}</strong>
            <small>Driver fields</small>
          </span>
          <span>
            <strong>{semanticCompleteness}%</strong>
            <small>Semantic completeness</small>
          </span>
        </div>
        <button onClick={onAnalyze}>Compile current ForeACT model</button>
      </article>

      <article className="panel">
        <p className="eyebrow">Analysis scope</p>
        <h2>Forecast versions and horizon</h2>
        <div className="policy-grid compact">
          <div className="policy-card">
            <span>Baseline version</span>
            <b>{spec.methodology_model.scope.baseline_version}</b>
          </div>
          <div className="policy-card">
            <span>Current version</span>
            <b>{spec.methodology_model.scope.current_version}</b>
          </div>
          <div className="policy-card">
            <span>Forecast period</span>
            <b>
              {spec.methodology_model.scope.period_start} →{" "}
              {spec.methodology_model.scope.period_end}
            </b>
          </div>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">MethodSet</p>
        <h2>Declared analysis methods</h2>
        <div className="policy-grid compact">
          <div className="policy-card">
            <span>Revision method</span>
            <b>{spec.methodology_model.methods.revision_method}</b>
          </div>
          <div className="policy-card">
            <span>Volatility method</span>
            <b>{spec.methodology_model.methods.volatility_method}</b>
          </div>
          <div className="policy-card">
            <span>Decision policy</span>
            <b>{spec.decision_policy.name}</b>
          </div>
        </div>
      </article>

      {analysis && (
        <>
          <article className="panel full-span">
            <p className="eyebrow">Ecore metamodel projection</p>
            <h2>ForeACT forecast assurance metamodel</h2>
            <p className="helper-text">
              This graph is generated from{" "}
              <code>backend/metamodel/foreact.ecore</code> plus the current
              use-case extensions.
            </p>
            <MetamodelGraphView
              nodes={metamodelFlow.nodes}
              edges={metamodelFlow.edges}
              height={650}
            />
          </article>
          <article className="panel full-span">
            <p className="eyebrow">Model instance</p>
            <h2>Compiled assurance model instance</h2>
            <MetamodelGraphView
              nodes={instanceFlow.nodes}
              edges={instanceFlow.edges}
              height={560}
            />
          </article>
          <article className="panel full-span">
            <p className="eyebrow">ForecastComparisonModel preview</p>
            <div className="mini-table wide">
              <table>
                <thead>
                  <tr>
                    {Object.keys(preview[0] || {}).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 12).map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((v, i) => (
                        <td key={i}>{String(v ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <article className="panel full-span">
            <p className="eyebrow">Conformance and traceability checks</p>
            <div className="rule-grid">
              {analysis.conformance_results.map((rule) => (
                <div className={`rule-card ${rule.status}`} key={rule.rule_id}>
                  <strong>{rule.rule_id}</strong>
                  <span>
                    {rule.status.toUpperCase()} · {rule.severity}
                  </span>
                  <p>{rule.message}</p>
                </div>
              ))}
            </div>
          </article>
        </>
      )}

      {!analysis && (
        <article className="panel full-span">
          <p className="eyebrow">No compiled model yet</p>
          <h2>Compile the current project specification</h2>
          <p className="helper-text">
            Compile to generate the ForecastComparisonModel, SignalModel,
            DecisionModel, and conformance checks.
          </p>
        </article>
      )}
    </section>
  );
}
