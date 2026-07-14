import type { AnalysisResponse } from '../types/analysis';

export function TransformationTrace({ analysis }: { analysis: AnalysisResponse }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Model transformations</p>
          <h2>Compiled Transformation Chain</h2>
          <p className="muted">These transformations are the main model-driven mechanism: raw data is transformed into semantic models, forecast comparison models, signal models, and decision models.</p>
        </div>
      </div>
      <div className="rules-list">
        {analysis.transformations.map((t) => (
          <div className="rule-row" key={t.id}>
            <b>{t.id}: {t.name}</b>
            <span>{t.input} → {t.output}</span>
            <small>{t.purpose}</small>
            <em>{t.status}</em>
          </div>
        ))}
      </div>
      <h3>ForecastComparisonModel preview</h3>
      <div className="table-wrap">
        <table>
          <thead><tr>{Object.keys((analysis.forecast_comparison_preview || analysis.aligned_forecast_preview || [])[0] || {}).map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(analysis.forecast_comparison_preview || analysis.aligned_forecast_preview || []).map((row, i) => (
              <tr key={i}>{Object.keys((analysis.forecast_comparison_preview || analysis.aligned_forecast_preview || [])[0] || {}).map((h) => <td key={h}>{String(row[h] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {(analysis.warnings || []).length > 0 && <p className="muted"><b>Warnings:</b> {(analysis.warnings || []).join('; ')}</p>}
    </section>
  );
}
