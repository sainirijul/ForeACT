import { Background, Controls, Handle, Position, ReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { AnalysisResponse, MetaModelGraph, MetaModelNode } from '../types/analysis';

type UMLNodeData = {
  label: string;
  packageName?: string;
  stereotype?: string;
  abstract?: boolean;
  description?: string;
  kind?: string;
  attributes?: string[];
  references?: string[];
  isCore?: boolean;
};

function UMLClassNode({ data }: { data: UMLNodeData }) {
  const compactAttributes = (data.attributes || []).slice(0, 4);
  const remainingCount = Math.max((data.attributes || []).length - compactAttributes.length, 0);

  return (
    <div className={`uml-class-node compact-with-attrs ${data.isCore ? 'core' : 'extension'} ${data.kind || ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="uml-class-header compact">
        <small>«{String(data.stereotype || 'EClass').replace(/[«»]/g, '')}»</small>
        <strong>{data.abstract ? <em>{data.label}</em> : data.label}</strong>
        {data.packageName && <span>{data.packageName}</span>}
      </div>
      <div className="uml-attribute-section">
        {compactAttributes.length > 0 ? compactAttributes.map((attr) => <span key={attr}>+ {attr}</span>) : <span className="muted">No attributes</span>}
        {remainingCount > 0 && <span className="muted">+ {remainingCount} more...</span>}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const nodeTypes = { umlClass: UMLClassNode };

export function MetamodelGraphView({
  nodes,
  edges,
  height = 620,
  interactive = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodesDelete,
}: {
  nodes: Node[];
  edges: Edge[];
  height?: number;
  interactive?: boolean;
  onNodesChange?: (changes: any[]) => void;
  onEdgesChange?: (changes: any[]) => void;
  onConnect?: (connection: any) => void;
  onNodeClick?: (event: any, node: Node) => void;
  onNodesDelete?: (nodes: Node[]) => void;
}) {
  if (!nodes.length) {
    return (
      <div className="flow-shell empty-flow" style={{ height }}>
        <strong>Metamodel is not loaded yet.</strong>
        <span>Check that the backend is running and that <code>/api/metamodel</code> returns graph nodes.</span>
      </div>
    );
  }

  return (
    <div className="flow-shell" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
        minZoom={0.15}
        maxZoom={1.8}
        panOnDrag
        zoomOnScroll
        nodesDraggable={interactive}
        nodesConnectable={interactive}
        elementsSelectable
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodesDelete={onNodesDelete}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

function attrsToStrings(node: MetaModelNode) {
  return (node.attributes || []).map((a) => `${a.name}: ${a.type}`);
}

function refsToStrings(node: MetaModelNode) {
  return (node.references || []).map((r) => `${r.name}: ${r.target} [${r.lowerBound ?? 0}..${r.upperBound ?? '*'}]`);
}

export function graphToFlow(graph: MetaModelGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((node, idx) => ({
    id: node.id,
    type: 'umlClass',
    position: node.position || { x: (idx % 4) * 300, y: Math.floor(idx / 4) * 170 },
    data: {
      label: node.label,
      packageName: node.package || node.kind,
      stereotype: node.stereotype || (node.abstract ? 'abstract EClass' : 'EClass'),
      abstract: Boolean(node.abstract),
      kind: node.kind,
      attributes: attrsToStrings(node),
      references: refsToStrings(node),
      isCore: node.isCore !== false,
    }
  }));

  const edges: Edge[] = graph.edges.map((edge, idx) => {
    const isInheritance = edge.kind === 'inheritance' || edge.label === 'extends';
    const isComposition = edge.kind === 'composition' || edge.label.startsWith('◆');
    return {
      id: `e-${idx}-${edge.source}-${edge.target}-${edge.label}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: isInheritance ? 'straight' : 'smoothstep',
      style: {
        strokeWidth: isComposition ? 2.4 : 1.5,
        strokeDasharray: isInheritance ? '6 4' : undefined,
      },
    };
  });

  return { nodes, edges };
}

export function modelInstanceToFlow(analysis: AnalysisResponse): { nodes: Node[]; edges: Edge[] } {
  const targetResults = analysis.target_results || [];
  const decisionCards = analysis.decision_cards || [];
  const selectedScope = analysis.dataset_profile.selected_scope;
  const selectedMethods = analysis.dataset_profile.selected_methods;

  const nodes: Node[] = [
    {
      id: 'ForecastAssuranceProjectInstance', type: 'umlClass', position: { x: 0, y: 160 },
      data: { label: 'ForecastAssuranceProject', packageName: 'Model Instance', stereotype: 'EObject', attributes: [`targets: ${targetResults.length}`, `decisionCards: ${decisionCards.length}`], isCore: true }
    },
    {
      id: 'DatasetVersionInstance', type: 'umlClass', position: { x: 340, y: 20 },
      data: { label: 'DatasetVersion', packageName: 'Model Instance', stereotype: 'EObject', attributes: [`rows: ${analysis.dataset_profile.rows}`, `columns: ${analysis.dataset_profile.columns}`], isCore: true }
    },
    {
      id: 'FieldModelInstance', type: 'umlClass', position: { x: 340, y: 300 },
      data: { label: 'FieldModel', packageName: 'Model Instance', stereotype: 'EObject', attributes: [`fields: ${analysis.dataset_profile.field_specs.length}`, `targets: ${analysis.dataset_profile.field_specs.filter((f) => f.role === 'target').length}`, `drivers: ${analysis.dataset_profile.field_specs.filter((f) => f.role === 'feature').length}`], isCore: true }
    },
    {
      id: 'MethodSetInstance', type: 'umlClass', position: { x: 680, y: 20 },
      data: { label: 'MethodSet', packageName: 'Model Instance', stereotype: 'EObject', attributes: [`variance: ${selectedMethods.variance_method}`, `volatility: ${selectedMethods.volatility_method}`], isCore: true }
    },
    {
      id: 'ForecastComparisonModelInstance', type: 'umlClass', position: { x: 680, y: 300 },
      data: { label: 'ForecastComparisonModel', packageName: 'Derived Model', stereotype: 'EObject', attributes: [`baseline: ${selectedScope.baseline_version}`, `current: ${selectedScope.current_version}`, `period: ${selectedScope.period_start} → ${selectedScope.period_end}`], isCore: true }
    },
    {
      id: 'SignalModelInstance', type: 'umlClass', position: { x: 1020, y: 160 },
      data: { label: 'SignalModel', packageName: 'Derived Model', stereotype: 'EObject', attributes: [`varianceSignals: ${targetResults.length}`, `volatilitySignals: ${targetResults.length}`, `confidenceSignals: ${targetResults.length}`], isCore: true }
    },
    {
      id: 'DecisionModelInstance', type: 'umlClass', position: { x: 1360, y: 160 },
      data: { label: 'DecisionModel', packageName: 'Derived Model', stereotype: 'EObject', attributes: [`cards: ${decisionCards.length}`], isCore: true }
    },
  ];

  targetResults.forEach((target, idx) => {
    nodes.push({
      id: `TargetSignal${idx}`, type: 'umlClass', position: { x: 1020, y: 480 + idx * 170 },
      data: { label: target.target, packageName: 'Signal Instance', stereotype: 'EObject', attributes: [`variance: ${target.latest_variance_pct}%`, `volatility: ${target.volatility_score}`, `action: ${target.recommended_action}`], isCore: true }
    });
  });

  const edges: Edge[] = [
    { id: 'i1', source: 'ForecastAssuranceProjectInstance', target: 'DatasetVersionInstance', label: '◆ dataset', type: 'smoothstep' },
    { id: 'i2', source: 'ForecastAssuranceProjectInstance', target: 'FieldModelInstance', label: '◆ fieldModel', type: 'smoothstep' },
    { id: 'i3', source: 'ForecastAssuranceProjectInstance', target: 'MethodSetInstance', label: '◆ methodSet', type: 'smoothstep' },
    { id: 'i4', source: 'ForecastAssuranceProjectInstance', target: 'ForecastComparisonModelInstance', label: '◆ comparisonModel', type: 'smoothstep' },
    { id: 'i5', source: 'ForecastComparisonModelInstance', target: 'SignalModelInstance', label: 'computes signals', type: 'smoothstep' },
    { id: 'i6', source: 'MethodSetInstance', target: 'SignalModelInstance', label: 'computedBy', type: 'smoothstep' },
    { id: 'i7', source: 'SignalModelInstance', target: 'DecisionModelInstance', label: 'supports', type: 'smoothstep' },
  ];
  targetResults.forEach((_, idx) => edges.push({ id: `it${idx}`, source: 'SignalModelInstance', target: `TargetSignal${idx}`, label: '◆ signal', type: 'smoothstep' }));
  return { nodes, edges };
}
