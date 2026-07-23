import type { AnalysisResponse } from "../types/analysis";

export function ModelAndRules({ analysis }: { analysis: AnalysisResponse }) {
  return (
    <section className="grid two">
      <div className="panel">
        <p className="eyebrow">Model introspection</p>
        <h2>Compiled metamodel instance</h2>
        <pre className="json-view">
          {JSON.stringify(analysis.metamodel.concepts, null, 2)}
        </pre>
      </div>
      <div className="panel">
        <p className="eyebrow">Model-driven rigor</p>
        <h2>Conformance checks</h2>
        <div className="rule-list">
          {analysis.conformance_results.map((rule) => (
            <div key={rule.rule_id} className="rule-item">
              <span
                className={`badge ${rule.status === "pass" ? "pass" : rule.status === "warning" ? "warn" : "fail"}`}
              >
                {rule.status}
              </span>
              <strong>{rule.rule_id}</strong>
              <p>{rule.message}</p>
            </div>
          ))}
        </div>
        <h2>Model fit sanity check</h2>
        <table>
          <thead>
            <tr>
              <th>Target</th>
              <th>Model</th>
              <th>MAE</th>
              <th>RMSE</th>
              <th>R²</th>
            </tr>
          </thead>
          <tbody>
            {analysis.model_fit_summary.map((row) => (
              <tr key={`${row.target}-${row.model}`}>
                <td>{row.target}</td>
                <td>{row.model}</td>
                <td>{row.mae}</td>
                <td>{row.rmse}</td>
                <td>{row.r2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
