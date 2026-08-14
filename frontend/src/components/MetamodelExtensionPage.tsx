import { useState, useEffect } from "react";
import type { ForeACTProjectSpec, CustomConcept } from "../types/analysis";
import type { ApiMetamodel } from "../utils/metamodelFlow";

export function MetamodelExtensionPage({
  spec,
  setSpec,
  metamodel,
  setMetamodel
}: {
  spec: ForeACTProjectSpec;
  setSpec: (spec: ForeACTProjectSpec) => void;
  metamodel?: ApiMetamodel | null;
  setMetamodel?: (m: any) => void;
}) {
  const [name, setName] = useState("DomainAssumption");
  const [kind, setKind] = useState("business_concept");
  const [description, setDescription] = useState(
    "Domain-specific assumption used by this workspace.",
  );
  const [connectsTo, setConnectsTo] = useState("AssumptionElement");
  const [message, setMessage] = useState("");

  const concepts = spec.metamodel_extension?.concepts ?? [];
  const [localUrl, setLocalUrl] = useState<string | undefined>(undefined);

  // Sync with the parent's metamodel prop when the page first loads
  useEffect(() => {
    if (metamodel?.plantuml?.url) {
      setLocalUrl(metamodel.plantuml.url);
    }
  }, [metamodel]);

  // Instantly save to the backend to get the updated SVG
  async function saveAndUpdateDiagram(updatedSpec: ForeACTProjectSpec) {
    setMessage("Saving to backend and generating new diagram...");
    try {
      const response = await fetch("/api/workspace/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: updatedSpec }),
      });
      const data = await response.json();

      if (data.metamodel?.plantuml?.url) {
        setLocalUrl(data.metamodel.plantuml.url);
        if (setMetamodel) {
          setMetamodel(data.metamodel);
        }
        setMessage("Diagram updated successfully!");
      } else {
        setMessage("Saved, but no diagram URL was returned.");
      }
    } catch (error) {
      setMessage("Error saving to backend.");
    }
  }

  function addConcept() {
    const cleanName = name.trim().replace(/[^A-Za-z0-9_]/g, "");
    if (!cleanName || !description.trim() || !connectsTo.trim()) {
      setMessage("Name, description, and connection are required.");
      return;
    }
    if (concepts.some((item) => item.name === cleanName)) {
      setMessage(`Extension concept '${cleanName}' already exists.`);
      return;
    }

    const nextSpec = {
      ...spec,
      metamodel_extension: {
        ...(spec.metamodel_extension ?? { edges: [] }),
        concepts: [
          ...concepts,
          {
            name: cleanName,
            kind,
            description: description.trim(),
            connects_to: connectsTo.trim(),
            attributes: [],
            references: [],
          },
        ],
        edges: spec.metamodel_extension?.edges ?? [],
      },
    };

    setSpec(nextSpec);
    saveAndUpdateDiagram(nextSpec);
  }

  function removeConcept(conceptName: string) {
    const nextSpec = {
      ...spec,
      metamodel_extension: {
        ...(spec.metamodel_extension ?? { edges: [] }),
        concepts: concepts.filter((item) => item.name !== conceptName),
        edges: spec.metamodel_extension?.edges ?? [],
      },
    };

    setSpec(nextSpec);
    saveAndUpdateDiagram(nextSpec);
  }

  return (
    <section className="page-grid metamodel-page">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 4</p>
        <h2>ForeACT Metamodel and Domain Extensions</h2>
        <p>
          The core language is loaded from{" "}
          <code>backend/metamodel/foreact.ecore</code> and remains the shared
          source of truth. Use-case-specific concepts are stored only in the
          active workspace extension model; they do not modify the core Ecore
          package.
        </p>
        {message && <p className="muted">{message}</p>}
      </article>

      <article className="panel full-span metamodel-canvas-panel">
        <div
          style={{
            minHeight: 400,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            overflow: "auto",
          }}
        >
          {localUrl ? (
            <img
              src={localUrl}
              alt="ForeACT PlantUML Diagram"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          ) : (
            <p className="muted">Loading PlantUML diagram...</p>
          )}
        </div>
      </article>

      <article className="panel">
        <h3>Add domain extension</h3>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Kind
          <input
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Connects to
          <input
            value={connectsTo}
            onChange={(event) => setConnectsTo(event.target.value)}
          />
        </label>
        <button onClick={addConcept}>Add to workspace extension</button>
      </article>

      <article className="panel">
        <h3>Workspace extension concepts</h3>
        {concepts.length === 0 ? (
          <p className="muted">
            No domain-specific extension concepts are defined.
          </p>
        ) : (
          <ul>
            {concepts.map((concept) => (
              <li key={concept.name}>
                <strong>{concept.name}</strong>: {concept.description} →{" "}
                {concept.connects_to}{" "}
                <button onClick={() => removeConcept(concept.name)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
