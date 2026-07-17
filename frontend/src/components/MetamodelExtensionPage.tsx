import { useMemo, useState } from 'react';
import { Background, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { ForeACTProjectSpec, CustomConcept } from '../types/analysis';
import { nodeTypes } from './GraphViews';
import { metamodelToFlow } from '../utils/metamodelFlow';
import type { ApiMetamodel } from '../utils/metamodelFlow';

function EditorInner({ spec, setSpec, metamodel }: {
  spec: ForeACTProjectSpec;
  setSpec: (spec: ForeACTProjectSpec) => void;
  metamodel?: ApiMetamodel | null;
}) {
  const [name, setName] = useState('DomainAssumption');
  const [kind, setKind] = useState('business_concept');
  const [description, setDescription] = useState('Domain-specific assumption used by this workspace.');
  const [connectsTo, setConnectsTo] = useState('AssumptionElement');
  const [message, setMessage] = useState('');
  const flow = useMemo(() => metamodelToFlow(metamodel ?? null), [metamodel]);
  const concepts = spec.metamodel_extension?.concepts ?? [];

  function updateConcepts(next: CustomConcept[]) {
    setSpec({
      ...spec,
      metamodel_extension: {
        ...(spec.metamodel_extension ?? { edges: [] }),
        concepts: next,
        edges: spec.metamodel_extension?.edges ?? [],
      },
    });
  }

  function addConcept() {
    const cleanName = name.trim().replace(/[^A-Za-z0-9_]/g, '');
    if (!cleanName || !description.trim() || !connectsTo.trim()) {
      setMessage('Name, description, and connection are required.');
      return;
    }
    if (concepts.some((item) => item.name === cleanName)) {
      setMessage(`Extension concept '${cleanName}' already exists.`);
      return;
    }
    updateConcepts([...concepts, {
      name: cleanName,
      kind,
      description: description.trim(),
      connects_to: connectsTo.trim(),
      attributes: [],
      references: [],
    }]);
    setMessage(`Added '${cleanName}' to the workspace extension model. Save the workspace to persist it.`);
  }

  function removeConcept(conceptName: string) {
    updateConcepts(concepts.filter((item) => item.name !== conceptName));
    setMessage(`Removed '${conceptName}' from the workspace extension model.`);
  }

  return (
    <section className="page-grid metamodel-page">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 4</p>
        <h2>ForeACT Metamodel and Domain Extensions</h2>
        <p>
          The core language is loaded from <code>backend/metamodel/foreact.ecore</code> and remains the shared source of truth.
          Use-case-specific concepts are stored only in the active workspace extension model; they do not modify the core Ecore package.
        </p>
        {message && <p className="muted">{message}</p>}
      </article>

      <article className="panel full-span metamodel-canvas-panel">
        <div style={{ height: 560 }}>
          <ReactFlow nodes={flow.nodes} edges={flow.edges} nodeTypes={nodeTypes} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </article>

      <article className="panel">
        <h3>Add domain extension</h3>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Kind<input value={kind} onChange={(event) => setKind(event.target.value)} /></label>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label>Connects to<input value={connectsTo} onChange={(event) => setConnectsTo(event.target.value)} /></label>
        <button onClick={addConcept}>Add to workspace extension</button>
      </article>

      <article className="panel">
        <h3>Workspace extension concepts</h3>
        {concepts.length === 0 ? <p className="muted">No domain-specific extension concepts are defined.</p> : (
          <ul>
            {concepts.map((concept) => (
              <li key={concept.name}>
                <strong>{concept.name}</strong>: {concept.description} → {concept.connects_to}{' '}
                <button onClick={() => removeConcept(concept.name)}>Remove</button>
              </li>
            ))}
          </ul>
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
  return <ReactFlowProvider><EditorInner {...props} /></ReactFlowProvider>;
}
