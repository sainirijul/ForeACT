import Plot from 'react-plotly.js';
import type { MatrixPoint } from '../types/analysis';

export function MatrixPlot({ points }: { points: MatrixPoint[] }) {
  const xMax = Math.max(10, ...points.map((p) => p.x_variance_abs_pct + 2));
  const yMax = Math.max(6, ...points.map((p) => p.y_volatility_score + 2));
  return (
    <section className="panel">
      <div className="panel-header">
        <div><p className="eyebrow">Decision policy view</p><h2>Variance × Volatility Matrix</h2></div>
      </div>
      <Plot
        data={[{ x: points.map((p) => p.x_variance_abs_pct), y: points.map((p) => p.y_volatility_score), text: points.map((p) => `${p.target}<br>${p.recommended_action}`), mode: 'markers+text', type: 'scatter', textposition: 'top center', marker: { size: 18 } }]}
        layout={{
          autosize: true,
          height: 420,
          margin: { l: 60, r: 20, t: 20, b: 60 },
          xaxis: { title: { text: 'Absolute latest variance (%)' }, range: [0, xMax] },
          yaxis: { title: { text: 'Volatility score' }, range: [0, yMax] },
          shapes: [
            { type: 'rect', x0: 0, x1: 5, y0: 0, y1: 4, fillcolor: 'rgba(220,240,255,0.35)', line: { width: 0 } },
            { type: 'rect', x0: 5, x1: xMax, y0: 0, y1: 4, fillcolor: 'rgba(210,255,220,0.35)', line: { width: 0 } },
            { type: 'rect', x0: 0, x1: 5, y0: 4, y1: yMax, fillcolor: 'rgba(255,245,210,0.45)', line: { width: 0 } },
            { type: 'rect', x0: 5, x1: xMax, y0: 4, y1: yMax, fillcolor: 'rgba(255,225,210,0.45)', line: { width: 0 } },
            { type: 'line', x0: 5, x1: 5, y0: 0, y1: yMax, line: { dash: 'dash', width: 1 } },
            { type: 'line', x0: 0, x1: xMax, y0: 4, y1: 4, line: { dash: 'dash', width: 1 } }
          ],
          annotations: [
            { x: xMax * 0.72, y: 1, text: 'Act / review strategy', showarrow: false },
            { x: xMax * 0.72, y: yMax * 0.78, text: 'Monitor closely', showarrow: false },
            { x: xMax * 0.22, y: 1, text: 'Stable / no action', showarrow: false },
            { x: xMax * 0.22, y: yMax * 0.78, text: 'Watch uncertainty', showarrow: false }
          ]
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </section>
  );
}
