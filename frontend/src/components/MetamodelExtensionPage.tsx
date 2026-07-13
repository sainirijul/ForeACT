import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { addEdge, applyEdgeChanges, applyNodeChanges, ReactFlowProvider, useEdgesState, useNodesState } from '@xyflow/react';
import type { Connection, EdgeChange, NodeChange } from '@xyflow/react';
import type { CustomConcept, ForeACTProjectSpec, MetaEdge } from '../types/analysis';
import { MetamodelGraphView } from './GraphViews';

const baseNodes: Node[] = [
  { id: 'DatasetVersion', type: 'foreact', position: { x: 20, y: 120 }, data: { label: 'DatasetVersion', subtitle: 'forecast-cycle CSV', kind: 'core' } },
  { id: 'SemanticFieldModel', type: 'foreact', position: { x: 300, y: 120 }, data: { label: 'SemanticFieldModel', subtitle: 'field roles + semantics', kind: 'core' } },
  { id: 'ScenarioAssumptionModel', type: 'foreact', position: { x: 300, y: 320 }, data: { label: 'ScenarioAssumptionModel', subtitle: 'scenario assumptions', kind: 'core' } },
  { id: 'MethodModel', type: 'foreact', position: { x: 590, y: 40 }, data: { label: 'MethodModel', subtitle: 'variance/volatility', kind: 'core' } },
  { id: 'AlignedForecastModel', type: 'foreact', position: { x: 590, y: 220 }, data: { label: 'AlignedForecastModel', subtitle: 'versions aligned by horizon', kind: 'derived' } },
  { id: 'SignalModel', type: 'foreact', position: { x: 900, y: 220 }, data: { label: 'SignalModel', subtitle: 'signals + confidence', kind: 'derived' } },
  { id: 'DecisionCardModel', type: 'foreact', position: { x: 1210, y: 220 }, data: { label: 'DecisionCardModel', subtitle: 'actionability recommendation', kind: 'decision' } }
];

const baseEdges: Edge[] = [
  { id: 'b1', source: 'DatasetVersion', target: 'SemanticFieldModel', label: 'profiles into' },
  { id: 'b2', source: 'SemanticFieldModel', target: 'AlignedForecastModel', label: 'binds fields' },
  { id: 'b3', source: 'ScenarioAssumptionModel', target: 'AlignedForecastModel', label: 'scopes' },
  { id: 'b4', source: 'AlignedForecastModel', target: 'SignalModel', label: 'feeds' },
  { id: 'b5', source: 'MethodModel', target: 'SignalModel', label: 'computes' },
  { id: 'b6', source: 'SignalModel', target: 'DecisionCardModel', label: 'classifies' }
];

function EditorInner({ spec, setSpec }: { spec: ForeACTProjectSpec; setSpec: (spec: ForeACTProjectSpec) => void }) {
  const customNodes: Node[] = useMemo(() => (spec.metamodel_extension.concepts || []).map((concept, idx) => ({
    id: concept.name,
    type: 'foreact',
    position: { x: concept.x ?? 600 + idx * 80, y: concept.y ?? 440 + idx * 80 },
    data: { label: concept.name, subtitle: concept.description, kind: concept.kind || 'extension' }
  })), [spec.metamodel_extension.concepts]);
  const customEdges: Edge[] = useMemo(() => (spec.metamodel_extension.edges || []).map((edge, idx) => ({ id: `custom-${idx}-${edge.source}-${edge.target}`, source: edge.source, target: edge.target, label: edge.label || 'relates' })), [spec.metamodel_extension.edges]);
  const [nodes, setNodes] = useNodesState([...baseNodes, ...customNodes]);
  const [edges, setEdges] = useEdgesState([...baseEdges, ...customEdges]);

  function sync(nextNodes: Node[] = nodes, nextEdges: Edge[] = edges) {
    const concepts: CustomConcept[] = nextNodes.filter((n) => !baseNodes.find((b) => b.id === n.id)).map((n) => ({
      name: n.id,
      kind: String(n.data?.kind || 'domain'),
      description: String(n.data?.subtitle || ''),
      connects_to: nextEdges.find((e) => e.target === n.id)?.source || 'ForecastRun',
      x: n.position.x,
      y: n.position.y
    }));
    const metaEdges: MetaEdge[] = nextEdges.filter((e) => !baseEdges.find((b) => b.id === e.id)).map((e) => ({ source: e.source, target: e.target, label: String(e.label || 'relates') }));
    setSpec({ ...spec, metamodel_extension: { concepts, edges: metaEdges } });
  }

  function onNodesChange(changes: NodeChange[]) {
    const next = applyNodeChanges(changes, nodes);
    setNodes(next);
    sync(next, edges);
  }
  function onEdgesChange(changes: EdgeChange[]) {
    const next = applyEdgeChanges(changes, edges);
    setEdges(next);
    sync(nodes, next);
  }
  function onConnect(connection: Connection) {
    const next = addEdge({ ...connection, label: 'relates' }, edges);
    setEdges(next);
    sync(nodes, next);
  }
  function addConcept(kind: string) {
    const id = `${kind[0].toUpperCase()}${kind.slice(1)}Concept${Date.now().toString().slice(-4)}`;
    const next = [...nodes, { id, type: 'foreact', position: { x: 700, y: 500 }, data: { label: id, subtitle: 'New metamodel extension concept. Edit in the palette.', kind } }];
    setNodes(next);
    sync(next, edges);
  }
  function updateConcept(index: number, patch: Partial<CustomConcept>) {
    const concepts = [...spec.metamodel_extension.concepts];
    concepts[index] = { ...concepts[index], ...patch };
    setSpec({ ...spec, metamodel_extension: { ...spec.metamodel_extension, concepts } });
  }

  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 4</p>
        <h2>Graphical Metamodel Extension</h2>
        <p>Inspect the existing ForeACT forecast assurance metamodel, then extend it with use-case-specific concepts without changing backend code.</p>
      </article>
      <article className="panel palette-panel">
        <p className="eyebrow">Tool palette</p>
        <h2>Add concept</h2>
        <button className="secondary" onClick={() => addConcept('domain')}>Domain concept</button>
        <button className="secondary" onClick={() => addConcept('constraint')}>Constraint concept</button>
        <button className="secondary" onClick={() => addConcept('decision')}>Decision concept</button>
        <button className="secondary" onClick={() => addConcept('evidence')}>Evidence concept</button>
        <div className="extension-list">
          {spec.metamodel_extension.concepts.map((concept, idx) => (
            <div className="extension-editor" key={`${concept.name}-${idx}`}>
              <input value={concept.name} onChange={(e) => updateConcept(idx, { name: e.target.value })} />
              <select value={concept.kind} onChange={(e) => updateConcept(idx, { kind: e.target.value })}>
                <option value="domain">domain</option><option value="constraint">constraint</option><option value="decision">decision</option><option value="evidence">evidence</option>
              </select>
              <input value={concept.connects_to} onChange={(e) => updateConcept(idx, { connects_to: e.target.value })} />
              <textarea value={concept.description} onChange={(e) => updateConcept(idx, { description: e.target.value })} />
            </div>
          ))}
        </div>
      </article>
      <article className="panel graph-panel-large">
        <div className="graph-caption"><strong>Editable metamodel canvas</strong><span>Drag nodes and connect extensions to existing concepts.</span></div>
        <MetamodelGraphView nodes={nodes} edges={edges} height={680} />
      </article>
    </section>
  );
}

export function MetamodelExtensionPage(props: { spec: ForeACTProjectSpec; setSpec: (spec: ForeACTProjectSpec) => void }) {
  return <ReactFlowProvider><EditorInner {...props} /></ReactFlowProvider>;
}
