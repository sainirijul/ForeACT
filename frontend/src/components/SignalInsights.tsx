import Plot from 'react-plotly.js';
import type { TargetResult } from '../types/analysis';

export function SignalInsights({ results }: { results: TargetResult[] }) {
  return (
    <section className="grid two">
      {results.map((result) => (
        <article className="panel" key={result.target} style={{ display: 'flex', flexDirection: 'column' }}>
          <p className="eyebrow">Signal introspection</p>
          <h3>{result.target}</h3>
          <div className="signal-metrics">
            <span><b>{result.latest_revision_pct}%</b> latest revision</span>
            <span><b>{result.volatility_score}</b> volatility score</span>
            <span><b>{result.confidence}</b> confidence</span>
          </div>
          <p className="muted"><b>Revision:</b> {result.revision_basis}</p>
          <p className="muted"><b>Volatility:</b> {result.volatility_basis}</p>
          <div style={{ minHeight: '280px', flexShrink: 0 }}>
            <Plot
              data={[
                { x: result.series.map((p) => p.period), y: result.series.map((p) => p.signed_revision_pct), type: 'scatter', mode: 'lines', name: 'Revision %' },
                { x: result.series.map((p) => p.period), y: result.series.map((p) => p.volatility), type: 'scatter', mode: 'lines', name: 'Volatility' }
              ]}
              layout={{ height: 280, margin: { l: 45, r: 10, t: 10, b: 80 }, legend: { orientation: 'h' } }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>
          <h4>Top driver links</h4>
          <div className="driver-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {result.top_driver_links.map((driver) => (
              <span key={driver.feature} style={{ wordBreak: 'break-all', background: '#f8fbff', border: '1px solid #dfe8f2', padding: '0.4rem 0.7rem', borderRadius: '8px' }}>{driver.feature}: <b>{driver.correlation ?? 'n/a'}</b></span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
