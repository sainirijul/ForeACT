import type { MetaModelGraph } from '../types/analysis';

export function ModelGraph({ graph }: { graph: MetaModelGraph }) {
  return (
    <section className="panel">
      <p className="eyebrow">Compiled graphical model</p>
      <h2>Forecast Assurance Model Graph</h2>
      <div className="graph-canvas">
        {graph.nodes.map((node) => (
          <div key={node.id} className={`graph-node ${node.kind}`}>
            <small>{node.kind}</small>
            <strong>{node.label}</strong>
            <span>{node.count} instance(s)</span>
          </div>
        ))}
      </div>
      <div className="edge-list">
        {graph.edges.map((edge) => <span key={`${edge.source}-${edge.target}`}>{edge.source} → {edge.target} <b>{edge.label}</b></span>)}
      </div>
    </section>
  );
}
