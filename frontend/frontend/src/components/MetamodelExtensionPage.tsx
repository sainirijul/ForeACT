import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';
import type { CustomConcept, ForeACTProjectSpec, MetaAttribute, MetaEdge, MetaModel, MetaReference } from '../types/analysis';
import { loadMetamodel } from '../api/client';
import { graphToFlow, nodeTypes } from './GraphViews';

type PaletteTemplate = {
  id: string;
  label: string;
  defaultName: string;
  description: string;
  connectsTo: string;
  attributes: MetaAttribute[];
  references: MetaReference[];
};

const PALETTE: PaletteTemplate[] = [
  {
    id: 'business_concept',
    label: 'Business Concept',
    defaultName: 'DomainConcept',
    description: 'A use-case concept that extends AssumptionElement, such as a future load, customer segment, or operational context.',
    connectsTo: 'AssumptionElement',
    attributes: [{ name: 'name', type: 'EString' }],
    references: [{ name: 'affects', target: 'TargetField', lowerBound: 0, upperBound: '*', containment: false }],
  },
  {
    id: 'planning_constraint',
    label: 'Planning Constraint',
    defaultName: 'PlanningConstraint',
    description: 'A constraint that influences actionability or planning decisions.',
    connectsTo: 'AssumptionElement',
    attributes: [{ name: 'severity', type: 'EString' }],
    references: [{ name: 'supportedBy', target: 'EvidenceArtifact', lowerBound: 0, upperBound: '*', containment: false }],
  },
  {
    id: 'planning_decision',
    label: 'Planning Decision',
    defaultName: 'PlanningDecision',
    description: 'A domain decision informed by generated decision cards.',
    connectsTo: 'ModelElement',
    attributes: [
      { name: 'owner', type: 'EString' },
      { name: 'decisionWindow', type: 'EString' },
    ],
    references: [{ name: 'informedBy', target: 'DecisionCard', lowerBound: 0, upperBound: '*', containment: false }],
  },
  {
    id: 'evidence_source',
    label: 'Evidence Source',
    defaultName: 'ExternalEvidence',
    description: 'A specialized evidence artifact used to support assumptions or confidence.',
    connectsTo: 'EvidenceArtifact',
    attributes: [
      { name: 'sourceType', type: 'EString' },
      { name: 'uri', type: 'EString' },
    ],
    references: [],
  },
];

function conceptId(name: string) {
  return name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '');
}

function normalizeMetaExtension(spec: ForeACTProjectSpec) {
  return {
    concepts: spec.metamodel_extension?.concepts ?? [],
    edges: spec.metamodel_extension?.edges ?? [],
  };
}

function templateToConcept(templateId: string, position: { x: number; y: number }, existingIds: Set<string>): CustomConcept {
  const template = PALETTE.find((item) => item.id === templateId) ?? PALETTE[0];
  let suffix = Date.now().toString().slice(-4);
  let name = `${template.defaultName}${suffix}`;

  while (existingIds.has(conceptId(name))) {
    suffix = (Number(suffix) + 1).toString();
    name = `${template.defaultName}${suffix}`;
  }

  return {
    name,
    kind: template.id,
    stereotype: 'EClass',
    description: template.description,
    connects_to: template.connectsTo,
    attributes: template.attributes,
    references: template.references,
    x: position.x,
    y: position.y,
  };
}

function extensionConceptToNode(concept: CustomConcept): Node {
  const attrs = concept.attributes ?? [];
  const refs = concept.references ?? [];

  return {
    id: conceptId(concept.name),
    type: 'umlClass',
    position: { x: concept.x ?? 80, y: concept.y ?? 1280 },
    data: {
      label: concept.name,
      packageName: 'Use-case Extension',
      stereotype: concept.stereotype ?? 'EClass',
      kind: concept.kind ?? 'extension',
      description: concept.description ?? '',
      attributes: attrs.map((attr) => `${attr.name}: ${attr.type}`),
      references: refs.map((ref) => `${ref.name}: ${ref.target} [${ref.lowerBound ?? 0}..${ref.upperBound ?? '*'}]`),
      rawAttributes: attrs,
      rawReferences: refs,
      isCore: false,
    },
  };
}

function extensionConceptToEdges(concept: CustomConcept): Edge[] {
  const source = conceptId(concept.name);
  const edges: Edge[] = [];
  const connectsTo = conceptId(concept.connects_to || 'AssumptionElement');

  if (connectsTo) {
    edges.push({
      id: `ext-${source}-extends-${connectsTo}`,
      source,
      target: connectsTo,
      label: 'extends',
      type: 'straight',
      style: { strokeDasharray: '6 4' },
    });
  }

  (concept.references ?? []).forEach((ref, idx) => {
    const target = conceptId(ref.target);
    if (!target) return;
    edges.push({
      id: `ext-${source}-${idx}-${target}-${ref.name}`,
      source,
      target,
      label: ref.name,
      type: 'smoothstep',
    });
  });

  return edges;
}

function savedMetaEdgeToFlow(edge: MetaEdge, idx: number): Edge {
  const isInheritance = edge.kind === 'inheritance' || edge.label === 'extends';
  const isComposition = edge.kind === 'composition' || edge.label.startsWith('◆') || edge.containment;

  return {
    id: `saved-ext-edge-${idx}-${conceptId(edge.source)}-${conceptId(edge.target)}-${edge.label}`,
    source: conceptId(edge.source),
    target: conceptId(edge.target),
    label: edge.label,
    type: isInheritance ? 'straight' : 'smoothstep',
    style: {
      strokeWidth: isComposition ? 2.2 : 1.4,
      strokeDasharray: isInheritance ? '6 4' : undefined,
    },
  };
}

function nodeToConcept(node: Node, currentEdges: Edge[]): CustomConcept {
  const data = node.data as {
    label?: string;
    kind?: string;
    stereotype?: string;
    abstract?: boolean;
    description?: string;
    rawAttributes?: MetaAttribute[];
    rawReferences?: MetaReference[];
  };

  const inheritanceEdge = currentEdges.find((edge) => edge.source === node.id && edge.label === 'extends');

  return {
    name: String(data.label || node.id),
    kind: String(data.kind || 'extension'),
    stereotype: String(data.stereotype || 'EClass').replace(/[«»]/g, ''),
    abstract: Boolean(data.abstract),
    description: String(data.description || ''),
    connects_to: inheritanceEdge?.target || 'AssumptionElement',
    attributes: data.rawAttributes ?? [],
    references: data.rawReferences ?? [],
    x: node.position.x,
    y: node.position.y,
  };
}

function EditorInner({
  spec,
  setSpec,
  metamodel,
}: {
  spec: ForeACTProjectSpec;
  setSpec: (spec: ForeACTProjectSpec) => void;
  metamodel: MetaModel | null;
}) {
  const reactFlow = useReactFlow();
  const safeExtension = normalizeMetaExtension(spec);
  const [localMetamodel, setLocalMetamodel] = useState<MetaModel | null>(null);
  const [metamodelLoadError, setMetamodelLoadError] = useState<string | null>(null);

  // Defensive fallback: the page can load the Ecore metamodel itself.
  // This avoids a blank canvas if App.tsx has not populated the metamodel prop yet.
  useEffect(() => {
    if (metamodel?.graph?.nodes?.length || localMetamodel?.graph?.nodes?.length) return;

    let cancelled = false;
    loadMetamodel()
      .then((loaded) => {
        if (!cancelled) {
          setLocalMetamodel(loaded);
          setMetamodelLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMetamodelLoadError(err instanceof Error ? err.message : 'Could not load /api/metamodel');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [metamodel, localMetamodel]);

  const effectiveMetamodel = metamodel ?? localMetamodel;

  const baseFlow = useMemo(() => {
    const graph = effectiveMetamodel?.graph ?? { nodes: effectiveMetamodel?.classes ?? [], edges: [] };
    return graphToFlow(graph);
  }, [effectiveMetamodel]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const baseIds = new Set(baseFlow.nodes.map((node) => node.id));
    const extensionConcepts = safeExtension.concepts.filter((concept) => !baseIds.has(conceptId(concept.name)));
    const extensionNodes = extensionConcepts.map(extensionConceptToNode);
    const extensionEdges = [
      ...extensionConcepts.flatMap(extensionConceptToEdges),
      ...safeExtension.edges.map(savedMetaEdgeToFlow),
    ];

    setNodes([...baseFlow.nodes, ...extensionNodes]);
    setEdges([...baseFlow.edges, ...extensionEdges]);
  }, [baseFlow, spec.metamodel_extension]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedIsCore = Boolean(selectedNode?.data?.isCore);

  function sync(nextNodes: Node[], nextEdges: Edge[]) {
    const extensionNodes = nextNodes.filter((node) => !node.data?.isCore);
    const extensionIds = new Set(extensionNodes.map((node) => node.id));

    const concepts = extensionNodes.map((node) => nodeToConcept(node, nextEdges));
    const metaEdges = nextEdges
      .filter((edge) => extensionIds.has(edge.source) || extensionIds.has(edge.target))
      .filter((edge) => edge.label !== 'extends')
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        label: String(edge.label || 'relatesTo'),
        kind: edge.type === 'straight' ? 'inheritance' : 'association',
      }));

    setSpec({
      ...spec,
      metamodel_extension: {
        concepts,
        edges: metaEdges,
      },
    });
  }

  function onNodesChange(changes: NodeChange[]) {
    const protectedChanges = changes.filter((change) => {
      if (change.type !== 'remove') return true;
      const node = nodes.find((candidate) => candidate.id === change.id);
      return !node?.data?.isCore;
    });

    const nextNodes = applyNodeChanges(protectedChanges, nodes);
    setNodes(nextNodes);
    sync(nextNodes, edges);
  }

  function onEdgesChange(changes: EdgeChange[]) {
    const nextEdges = applyEdgeChanges(changes, edges);
    setEdges(nextEdges);
    sync(nodes, nextEdges);
  }

  function onConnect(connection: Connection) {
    const nextEdges = addEdge(
      {
        ...connection,
        label: 'relatesTo',
        type: 'smoothstep',
      },
      edges,
    );
    setEdges(nextEdges);
    sync(nodes, nextEdges);
  }

  function addConcept(templateId: string, position = { x: 80, y: 1280 + safeExtension.concepts.length * 170 }) {
    const existingIds = new Set(nodes.map((node) => node.id));
    const concept = templateToConcept(templateId, position, existingIds);
    const nextSpec: ForeACTProjectSpec = {
      ...spec,
      metamodel_extension: {
        ...safeExtension,
        concepts: [...safeExtension.concepts, concept],
      },
    };

    setSpec(nextSpec);
    setSelectedNodeId(conceptId(concept.name));
  }

  function onDragStart(event: DragEvent<HTMLButtonElement>, templateId: string) {
    event.dataTransfer.setData('application/foreact-template', templateId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const templateId = event.dataTransfer.getData('application/foreact-template');
    if (!templateId) return;

    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    addConcept(templateId, position);
  }

  function deleteSelectedClass() {
    if (!selectedNodeId) return;
    const nodeToDelete = nodes.find((node) => node.id === selectedNodeId);
    if (!nodeToDelete || nodeToDelete.data?.isCore) return;

    const nextConcepts = safeExtension.concepts.filter((concept) => conceptId(concept.name) !== selectedNodeId);
    const nextEdges = safeExtension.edges.filter(
      (edge) => conceptId(edge.source) !== selectedNodeId && conceptId(edge.target) !== selectedNodeId,
    );

    setSpec({
      ...spec,
      metamodel_extension: {
        concepts: nextConcepts,
        edges: nextEdges,
      },
    });
    setSelectedNodeId(null);
  }

  function updateSelectedNode(patch: Record<string, unknown>) {
    if (!selectedNode || selectedIsCore) return;
    const nextNodes = nodes.map((node) => (node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node));
    setNodes(nextNodes);
    sync(nextNodes, edges);
  }

  const coreNodeCount = effectiveMetamodel?.graph?.nodes?.length ?? effectiveMetamodel?.classes?.length ?? 0;
  const enumCount = effectiveMetamodel?.enums?.length ?? 0;
  const visibleMetamodelMissing = coreNodeCount === 0;

  return (
    <section className="page-grid metamodel-layout">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 4</p>
        <h2>ForeACT Metamodel</h2>
        <p>
          The core metamodel is loaded from <code>backend/metamodel/foreact.ecore</code>. This page displays the generated
          UML/Ecore-style graph and lets you add use-case-specific extension classes to the central project specification.
        </p>
        <div className="metric-row">
          <span><strong>{coreNodeCount}</strong><small>Core metaclasses</small></span>
          <span><strong>{safeExtension.concepts.length}</strong><small>Use-case extensions</small></span>
          <span><strong>{enumCount}</strong><small>EEnums</small></span>
        </div>
      </article>

      <article className="panel graph-panel-large full-span">
        <div className="graph-caption">
          <strong>UML/Ecore-style metamodel</strong>
          <span>Attributes are shown in class boxes. References are shown as associations. Composition uses ◆ and inheritance uses extends.</span>
        </div>

        {visibleMetamodelMissing ? (
          <div className="flow-shell empty-flow" style={{ height: 920 }}>
            <strong>Metamodel is not loaded.</strong>
            <span>Open <code>/api/metamodel</code> and confirm that <code>graph.nodes</code> is present.</span>{metamodelLoadError && <span>{metamodelLoadError}</span>}
          </div>
        ) : (
          <div className="metamodel-drop-zone flow-shell" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
              minZoom={0.12}
              maxZoom={1.8}
              panOnDrag
              zoomOnScroll
              nodesDraggable
              nodesConnectable
              elementsSelectable
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onNodesDelete={(deletedNodes) => {
                const customIds = new Set(deletedNodes.filter((node) => !node.data?.isCore).map((node) => node.id));
                if (!customIds.size) return;
                setSpec({
                  ...spec,
                  metamodel_extension: {
                    concepts: safeExtension.concepts.filter((concept) => !customIds.has(conceptId(concept.name))),
                    edges: safeExtension.edges.filter((edge) => !customIds.has(conceptId(edge.source)) && !customIds.has(conceptId(edge.target))),
                  },
                });
              }}
              deleteKeyCode={['Backspace', 'Delete']}
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        )}
      </article>

      <article className="panel palette-panel full-span">
        <p className="eyebrow">Extension palette</p>
        <h2>Add metaclass</h2>
        {PALETTE.map((template) => (
          <button
            key={template.id}
            draggable
            className="palette-item"
            onDragStart={(event) => onDragStart(event, template.id)}
            onClick={() => addConcept(template.id)}
          >
            {template.label}
            <span>{template.description}</span>
          </button>
        ))}
        <div className="palette-help">
          Drag a class into the canvas or click a palette item. Core Ecore classes are read-only. Extension classes can be
          edited and deleted.
        </div>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Metaclass inspector</p>
        {!selectedNode && <p className="helper-text">Select a class to inspect attributes and references.</p>}
        {selectedNode && (
          <div className="selected-metaclass">
            <div className="selected-metaclass-header">
              <div>
                <h2>{String(selectedNode.data.label)}</h2>
                <p className="helper-text">
                  {selectedIsCore
                    ? 'Core metaclass from foreact.ecore. Edit the Ecore file to change it.'
                    : 'Use-case extension metaclass saved in the central .foreact.json file.'}
                </p>
              </div>
              {!selectedIsCore && <button className="danger" onClick={deleteSelectedClass}>Delete extension class</button>}
            </div>
            <div className="form-grid">
              <label>
                Name
                <input value={String(selectedNode.data.label || '')} disabled={selectedIsCore} onChange={(e) => updateSelectedNode({ label: e.target.value })} />
              </label>
              <label>
                Package
                <input value={String(selectedNode.data.packageName || '')} disabled />
              </label>
              <label>
                Stereotype
                <input value={String(selectedNode.data.stereotype || '')} disabled={selectedIsCore} onChange={(e) => updateSelectedNode({ stereotype: e.target.value })} />
              </label>
              <label>
                Description
                <textarea value={String(selectedNode.data.description || '')} disabled={selectedIsCore} onChange={(e) => updateSelectedNode({ description: e.target.value })} />
              </label>
            </div>
            <div className="metaclass-details-grid">
              <div><h3>Attributes</h3><ul>{((selectedNode.data.attributes || []) as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h3>References</h3><ul>{((selectedNode.data.references || []) as string[]).map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

export function MetamodelExtensionPage(props: { spec: ForeACTProjectSpec; setSpec: (spec: ForeACTProjectSpec) => void; metamodel: MetaModel | null }) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}
