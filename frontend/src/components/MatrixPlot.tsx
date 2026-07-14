import Plot from 'react-plotly.js';
import type { MatrixPoint, MethodConfig } from '../types/analysis';

export function MatrixPlot({ points, methods }: { points: MatrixPoint[]; methods: MethodConfig }) {
  const vThresh = methods.variance_threshold_large;
  const volThresh = methods.volatility_threshold_high;
  const xMax = Math.max(vThresh * 2, ...points.map((p) => p.x_variance_abs_pct + 2));
  const yMax = Math.max(volThresh * 1.5, ...points.map((p) => p.y_volatility_score + 2));
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
          xaxis: { title: { text: 'Absolute latest variance (%)' }, range: [0, xMax], dtick: 1},
          yaxis: { title: { text: 'Volatility score' }, range: [0, yMax] },
          shapes: [
            { type: 'rect', x0: 0, x1: vThresh, y0: 0, y1: volThresh, fillcolor: 'rgba(220,240,255,0.35)', line: { width: 0 } },
            { type: 'rect', x0: vThresh, x1: xMax, y0: 0, y1: volThresh, fillcolor: 'rgba(210,255,220,0.35)', line: { width: 0 } },
            { type: 'rect', x0: 0, x1: vThresh, y0: volThresh, y1: yMax, fillcolor: 'rgba(255,245,210,0.45)', line: { width: 0 } },
            { type: 'rect', x0: vThresh, x1: xMax, y0: volThresh, y1: yMax, fillcolor: 'rgba(255,225,210,0.45)', line: { width: 0 } },
            { type: 'line', x0: vThresh, x1: vThresh, y0: 0, y1: yMax, line: { dash: 'dash', width: 1 } },
            { type: 'line', x0: 0, x1: xMax, y0: volThresh, y1: volThresh, line: { dash: 'dash', width: 1 } }
          ],
          annotations: [
            { x: vThresh + (xMax - vThresh) / 2, y: volThresh / 2, text: 'Act / review strategy', showarrow: false },
            { x: vThresh + (xMax - vThresh) / 2, y: volThresh + (yMax - volThresh) / 2, text: 'Monitor closely', showarrow: false },
            { x: vThresh / 2, y: volThresh / 2, text: 'Stable / no action', showarrow: false },
            { x: vThresh / 2, y: volThresh + (yMax - volThresh) / 2, text: 'Watch uncertainty', showarrow: false }
          ]
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </section>
  );
}
