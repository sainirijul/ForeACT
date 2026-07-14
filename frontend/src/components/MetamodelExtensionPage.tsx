import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import type { ForeACTProjectSpec } from '../types/analysis';
import { nodeTypes } from './GraphViews';
import { metamodelToFlow } from '../utils/metamodelFlow';
import type { ApiMetamodel } from '../utils/metamodelFlow';

async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const urls = [
    `/api${path}`,
    `http://127.0.0.1:5000/api${path}`,
  ];

  let lastError = '';

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers ?? {}),
        },
        ...options,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        lastError = data?.message || response.statusText;
        continue;
      }

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError || `API request failed for ${path}`);
}

async function fetchMetamodel(): Promise<ApiMetamodel> {
  return apiRequest<ApiMetamodel>('/metamodel');
}

type EditMessage = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

function EditorInner({
  spec,
  setSpec,
  metamodel,
}: {
  spec: ForeACTProjectSpec;
  setSpec: (spec: ForeACTProjectSpec) => void;
  metamodel?: ApiMetamodel | null;
}) {
  const [localMetamodel, setLocalMetamodel] = useState<ApiMetamodel | null>(metamodel ?? null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [message, setMessage] = useState<EditMessage | null>(null);
  const [newClassName, setNewClassName] = useState('DataCenterCommitmentExtension');
  const [newClassSuperType, setNewClassSuperType] = useState('AssumptionElement');
  const [newAttributeName, setNewAttributeName] = useState('newAttribute');
  const [newAttributeType, setNewAttributeType] = useState('EString');
  const [newReferenceName, setNewReferenceName] = useState('relatesTo');
  const [newReferenceTarget, setNewReferenceTarget] = useState('EvidenceArtifact');

  async function reloadMetamodel() {
    const loaded = await fetchMetamodel();
    setLocalMetamodel(loaded);
    return loaded;
  }

  useEffect(() => {
    if (metamodel?.graph?.nodes?.length || metamodel?.classes?.length) {
      setLocalMetamodel(metamodel);
      return;
    }

    reloadMetamodel().catch((error) => {
      setMessage({
        kind: 'error',
        text: `Metamodel could not be loaded: ${error.message}`,
      });
    });
  }, [metamodel]);

  const flow = useMemo(() => metamodelToFlow(localMetamodel), [localMetamodel]);

  const nodes = flow.nodes;
  const edges = flow.edges;

  const classOptions = useMemo(
    () => nodes.map((node) => String(node.data.label ?? node.id)).sort(),
    [nodes],
  );

  const selectedClassName = selectedNode ? String(selectedNode.data.label ?? selectedNode.id) : null;
  const selectedIsProtected =
    selectedClassName
      ? [
          'ModelElement',
          'ForecastAssuranceProject',
          'DatasetVersion',
          'RawField',
          'FieldModel',
          'SemanticField',
          'MethodSet',
          'AnalysisMethod',
          'Signal',
          'DecisionModel',
        ].includes(selectedClassName)
      : false;

  async function handleAddClass() {
    try {
      setMessage({ kind: 'info', text: 'Adding class to Ecore metamodel...' });

      await apiRequest('/metamodel/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: newClassName,
          superType: newClassSuperType,
          abstract: false,
          attributes: [
            {
              name: 'name',
              type: 'EString',
              lowerBound: 0,
              upperBound: 1,
            },
          ],
        }),
      });

      await reloadMetamodel();

      setMessage({
        kind: 'success',
        text: `Class '${newClassName}' added to foreact.ecore.`,
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteClass() {
    if (!selectedClassName) return;

    if (selectedIsProtected) {
      setMessage({
        kind: 'error',
        text: `Class '${selectedClassName}' is protected because the ForeACT tool depends on it.`,
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete class '${selectedClassName}' from foreact.ecore? This will also remove references pointing to it.`,
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/metamodel/classes/${selectedClassName}`, {
        method: 'DELETE',
      });

      setSelectedNode(null);
      await reloadMetamodel();

      setMessage({
        kind: 'success',
        text: `Class '${selectedClassName}' deleted from foreact.ecore.`,
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleAddAttribute() {
    if (!selectedClassName) return;

    try {
      await apiRequest(`/metamodel/classes/${selectedClassName}/attributes`, {
        method: 'POST',
        body: JSON.stringify({
          name: newAttributeName,
          type: newAttributeType,
          lowerBound: 0,
          upperBound: 1,
        }),
      });

      await reloadMetamodel();

      setMessage({
        kind: 'success',
        text: `Attribute '${newAttributeName}' added to '${selectedClassName}'.`,
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDeleteAttribute(attributeText: string) {
    if (!selectedClassName) return;

    const attributeName = attributeText.split(':')[0].replace('+', '').trim();
    if (!attributeName) return;

    const confirmed = window.confirm(
      `Delete attribute '${attributeName}' from '${selectedClassName}'?`,
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/metamodel/classes/${selectedClassName}/attributes/${attributeName}`,
        {
          method: 'DELETE',
        },
      );

      await reloadMetamodel();
      setSelectedNode(null);

      setMessage({
        kind: 'success',
        text: `Attribute '${attributeName}' deleted from '${selectedClassName}'.`,
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleAddReference() {
    if (!selectedClassName) return;

    try {
      await apiRequest(`/metamodel/classes/${selectedClassName}/references`, {
        method: 'POST',
        body: JSON.stringify({
          name: newReferenceName,
          target: newReferenceTarget,
          containment: false,
          lowerBound: 0,
          upperBound: '*',
        }),
      });

      await reloadMetamodel();

      setMessage({
        kind: 'success',
        text: `Reference '${newReferenceName}' added to '${selectedClassName}'.`,
      });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <section className="page-grid metamodel-page">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 4</p>
        <h2>ForeACT Metamodel Extension</h2>
        <p>
          The core ForeACT metamodel is loaded from the backend Ecore file. Edits on this page update
          <code> backend/metamodel/foreact.ecore </code>, clear the PyEcore cache, and reload the projected metamodel graph.
        </p>

        <div className="metric-row">
          <span>
            <strong>{nodes.length}</strong>
            <small>Metaclasses</small>
          </span>
          <span>
            <strong>{edges.length}</strong>
            <small>Relationships</small>
          </span>
          <span>
            <strong>{spec.metamodel_extension?.concepts?.length ?? 0}</strong>
            <small>Workspace extensions</small>
          </span>
        </div>

        {message && (
          <div className={`edit-message ${message.kind}`}>
            {message.text}
          </div>
        )}
      </article>

      <article className="panel full-span">
        <div className="graph-caption">
          <strong>ForeACT Ecore metamodel</strong>
          <span>
            Classes and attributes are shown in boxes. References, inheritance, and composition are shown as edges.
          </span>
        </div>

        {nodes.length === 0 ? (
          <div className="empty-state">
            <h3>Metamodel not loaded</h3>
            <p>
              Open <code>http://127.0.0.1:5000/api/metamodel</code> and confirm that
              <code> graph.nodes </code> exists.
            </p>
          </div>
        ) : (
          <div className="flow-shell metamodel-flow">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              panOnDrag
              zoomOnScroll
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              onNodeClick={(_, node) => setSelectedNode(node)}
              proOptions={{ hideAttribution: true }}
            >
              <Controls />
              <Background />
            </ReactFlow>
          </div>
        )}
      </article>

      <article className="panel palette-panel">
        <p className="eyebrow">Add EClass</p>
        <h2>Extend the metamodel</h2>

        <label>
          Class name
          <input
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            placeholder="Example: CapacityConstraint"
          />
        </label>

        <label>
          Extends
          <select
            value={newClassSuperType}
            onChange={(event) => setNewClassSuperType(event.target.value)}
          >
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>

        <button onClick={handleAddClass}>
          Add class to Ecore
        </button>

        <div className="palette-help">
          Recommended extension points: <strong>AssumptionElement</strong>, <strong>ModelElement</strong>,
          <strong>AnalysisMethod</strong>, <strong>Signal</strong>, or <strong>DecisionCard</strong>.
        </div>
      </article>

      <article className="panel metaclass-inspector">
        <p className="eyebrow">Metaclass editor</p>

        {!selectedNode && (
          <>
            <h2>Select a class</h2>
            <p className="helper-text">
              Click a metaclass in the diagram to add attributes, add references, or delete non-protected classes.
            </p>
          </>
        )}

        {selectedNode && (
          <>
            <div className="selected-metaclass-header">
              <div>
                <h2>{selectedClassName}</h2>
                <p className="helper-text">
                  {String(selectedNode.data.stereotype ?? 'EClass')} · {String(selectedNode.data.packageName ?? 'ForeACT')}
                </p>
              </div>

              <button
                className="danger"
                onClick={handleDeleteClass}
                disabled={selectedIsProtected}
              >
                Delete class
              </button>
            </div>

            {selectedIsProtected && (
              <p className="helper-text warning-text">
                This class is protected because the ForeACT runtime depends on it.
              </p>
            )}

            <h3>Attributes</h3>
            <ul className="editable-list">
              {((selectedNode.data.attributes ?? []) as string[]).length > 0 ? (
                ((selectedNode.data.attributes ?? []) as string[]).map((attribute) => (
                  <li key={attribute}>
                    <span>{attribute}</span>
                    <button
                      className="tiny danger"
                      onClick={() => handleDeleteAttribute(attribute)}
                    >
                      Delete
                    </button>
                  </li>
                ))
              ) : (
                <li>No attributes</li>
              )}
            </ul>

            <div className="inline-editor">
              <label>
                Attribute name
                <input
                  value={newAttributeName}
                  onChange={(event) => setNewAttributeName(event.target.value)}
                />
              </label>

              <label>
                Type
                <select
                  value={newAttributeType}
                  onChange={(event) => setNewAttributeType(event.target.value)}
                >
                  <option value="EString">EString</option>
                  <option value="EInt">EInt</option>
                  <option value="EDouble">EDouble</option>
                  <option value="EBoolean">EBoolean</option>
                  <option value="DirectionKind">DirectionKind</option>
                  <option value="ConfidenceKind">ConfidenceKind</option>
                  <option value="SignalClass">SignalClass</option>
                  <option value="ActionKind">ActionKind</option>
                </select>
              </label>

              <button onClick={handleAddAttribute}>
                Add attribute
              </button>
            </div>

            <h3>References</h3>
            <ul>
              {((selectedNode.data.references ?? []) as string[]).length > 0 ? (
                ((selectedNode.data.references ?? []) as string[]).map((reference) => (
                  <li key={reference}>{reference}</li>
                ))
              ) : (
                <li>No references</li>
              )}
            </ul>

            <div className="inline-editor">
              <label>
                Reference name
                <input
                  value={newReferenceName}
                  onChange={(event) => setNewReferenceName(event.target.value)}
                />
              </label>

              <label>
                Target
                <select
                  value={newReferenceTarget}
                  onChange={(event) => setNewReferenceTarget(event.target.value)}
                >
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </label>

              <button onClick={handleAddReference}>
                Add reference
              </button>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

export function MetamodelExtensionPage(props: {
  spec: ForeACTProjectSpec;
  setSpec: (spec: ForeACTProjectSpec) => void;
  metamodel?: ApiMetamodel | null;
}) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}