import { Background, Controls, Handle, MiniMap, Position, ReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { MetaModelGraph } from '../types/analysis';

function ForeACTNode({ data }: { data: { label: string; subtitle?: string; kind?: string } }) {
  return (
    <div className={`flow-node ${data.kind || 'model'}`}>
      <Handle type="target" position={Position.Left} />
      <small>{data.kind || 'model element'}</small>
      <strong>{data.label}</strong>
      {data.subtitle && <span>{data.subtitle}</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { foreact: ForeACTNode };

export function MetamodelGraphView({ nodes, edges, height = 520 }: { nodes: Node[]; edges: Edge[]; height?: number }) {
  return (
    <div className="flow-shell" style={{ height }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export function graphToFlow(graph: MetaModelGraph): { nodes: Node[]; edges: Edge[] } {
  const columns = 4;
  const nodes = graph.nodes.map((node, idx) => ({
    id: node.id,
    type: 'foreact',
    position: { x: (idx % columns) * 260, y: Math.floor(idx / columns) * 150 },
    data: { label: node.label, subtitle: `${node.count} instance(s)`, kind: node.kind }
  }));
  const edges = graph.edges.map((edge, idx) => ({ id: `e-${idx}-${edge.source}-${edge.target}`, source: edge.source, target: edge.target, label: edge.label, animated: edge.label.includes('transforms') }));
  return { nodes, edges };
}

export function modelInstanceToFlow(analysis: { transformations?: { id: string; input: string; output: string; name: string }[]; decision_cards?: { target: string; headline: string }[]; target_results?: { target: string; variance_class: string; volatility_class: string }[] }) {
  const nodes: Node[] = [
    { id: 'DatasetVersion', type: 'foreact', position: { x: 0, y: 150 }, data: { label: 'DatasetVersion', subtitle: 'loaded CSV', kind: 'instance' } },
    { id: 'SemanticFieldModel', type: 'foreact', position: { x: 270, y: 150 }, data: { label: 'SemanticFieldModel', subtitle: 'typed fields', kind: 'model' } },
    { id: 'MethodModel', type: 'foreact', position: { x: 540, y: 60 }, data: { label: 'MethodModel', subtitle: 'declared methods', kind: 'model' } },
    { id: 'AnalysisScope', type: 'foreact', position: { x: 540, y: 240 }, data: { label: 'AnalysisScope', subtitle: 'versions + horizon', kind: 'model' } },
    { id: 'AlignedForecastModel', type: 'foreact', position: { x: 810, y: 150 }, data: { label: 'AlignedForecastModel', subtitle: 'baseline/current pairs', kind: 'derived' } },
    { id: 'SignalModel', type: 'foreact', position: { x: 1080, y: 150 }, data: { label: 'SignalModel', subtitle: 'variance + volatility', kind: 'derived' } },
    { id: 'DecisionCardModel', type: 'foreact', position: { x: 1350, y: 150 }, data: { label: 'DecisionCardModel', subtitle: `${analysis.decision_cards?.length || 0} cards`, kind: 'decision' } }
  ];
  (analysis.target_results || []).forEach((target, idx) => nodes.push({ id: `target-${idx}`, type: 'foreact', position: { x: 1080, y: 360 + idx * 120 }, data: { label: target.target, subtitle: `${target.variance_class} variance / ${target.volatility_class} volatility`, kind: 'signal' } }));
  const edges: Edge[] = [
    { id: 'e1', source: 'DatasetVersion', target: 'SemanticFieldModel', label: 'T1 profiles' },
    { id: 'e2', source: 'SemanticFieldModel', target: 'AlignedForecastModel', label: 'T2 aligns' },
    { id: 'e3', source: 'AnalysisScope', target: 'AlignedForecastModel', label: 'binds' },
    { id: 'e4', source: 'MethodModel', target: 'SignalModel', label: 'T3 applies' },
    { id: 'e5', source: 'AlignedForecastModel', target: 'SignalModel', label: 'computes' },
    { id: 'e6', source: 'SignalModel', target: 'DecisionCardModel', label: 'T4 classifies' }
  ];
  (analysis.target_results || []).forEach((_, idx) => edges.push({ id: `et-${idx}`, source: 'SignalModel', target: `target-${idx}`, label: 'contains' }));
  return { nodes, edges };
}
