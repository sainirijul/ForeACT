import Plot from 'react-plotly.js';
import type { MatrixPoint, MethodConfig, DecisionPolicy } from '../types/analysis';

export function MatrixPlot({ points, methods, policy }: { points: MatrixPoint[]; methods: MethodConfig; policy: DecisionPolicy }) {
  const vThresh = methods.revision_magnitude_threshold_large;
  const volThresh = methods.volatility_threshold_high;
  const xMax = Math.max(vThresh * 2, ...points.map((p) => p.x_revision_magnitude_pct + 2));
  const yMax = Math.max(volThresh * 1.5, ...points.map((p) => p.y_volatility_score + 2));

  const getAction = (varClass: string, volClass: string) => {
    const rule = policy?.rules?.find((r) => r.when.includes(varClass) && r.when.includes(volClass));
    return rule ? rule.then : `${varClass} / ${volClass}`;
  };

  const labelLargeLow = getAction('Large', 'Low');
  const labelLargeHigh = getAction('Large', 'High');
  const labelSmallLow = getAction('Small', 'Low');
  const labelSmallHigh = getAction('Small', 'High');

  return (
    <section className="panel">
      <div className="panel-header">
        <div><p className="eyebrow">Decision policy view</p><h2>Revision × Volatility Matrix</h2></div>
      </div>
      <Plot
        data={[{
  x: points.map((p) => p.x_revision_magnitude_pct),
  y: points.map((p) => p.y_volatility_score),
  text: points.map((p) => `${p.target}<br>`),
  mode: 'markers+text',
  type: 'scatter',
  textposition: points.map((_, i) => [
    'top center',
    'bottom center',
    'middle left',
    'middle right',
    'top left',
    'top right',
    'bottom left',
    'bottom right'
  ][i % 8]),
  marker: { size: 18 }
}]}
        layout={{
          autosize: true,
          height: 420,
          margin: { l: 60, r: 20, t: 20, b: 60 },
          xaxis: { title: { text: 'Absolute latest revision (%)' }, range: [0, xMax], dtick: 1},
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
            { x: vThresh + (xMax - vThresh) / 2, y: volThresh / 2, text: labelLargeLow, showarrow: false },
            { x: vThresh + (xMax - vThresh) / 2, y: volThresh + (yMax - volThresh) / 2, text: labelLargeHigh, showarrow: false },
            { x: vThresh / 2, y: volThresh / 2, text: labelSmallLow, showarrow: false },
            { x: vThresh / 2, y: volThresh + (yMax - volThresh) / 2, text: labelSmallHigh, showarrow: false }
          ]
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />
    </section>
  );
}
