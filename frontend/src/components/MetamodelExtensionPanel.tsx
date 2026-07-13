import type { CustomConcept } from '../types/analysis';

type Props = {
  concepts: CustomConcept[];
  setConcepts: (next: CustomConcept[]) => void;
};

const connectionOptions = ['DatasetVersion', 'SemanticFieldModel', 'AnalysisScope', 'ScenarioAssumptionModel', 'MethodModel', 'AlignedForecastModel', 'SignalModel', 'DecisionCardModel'];

export function MetamodelExtensionPanel({ concepts, setConcepts }: Props) {
  function patch(index: number, update: Partial<CustomConcept>) {
    setConcepts(concepts.map((c, i) => i === index ? { ...c, ...update } : c));
  }
  function addConcept() {
    setConcepts([...concepts, { name: 'DataCenterCommitment', kind: 'domain', description: 'Domain concept added by the modeler.', connects_to: 'ScenarioAssumptionModel' }]);
  }
  function removeConcept(index: number) {
    setConcepts(concepts.filter((_, i) => i !== index));
  }

  return (
    <section className="panel">
      <div className="panel-header split">
        <div>
          <p className="eyebrow">DSL step 4</p>
          <h2>Metamodel Extension</h2>
          <p className="muted">Add project-specific concepts without changing backend code. These appear in the compiled model graph and conformance checks.</p>
        </div>
        <button className="secondary-btn" onClick={addConcept}>Add concept</button>
      </div>
      {concepts.length === 0 && <p className="muted">No custom concepts yet. Add concepts such as DataCenterCommitment, RegulatoryConstraint, or PlanningDecision.</p>}
      <div className="method-grid">
        {concepts.map((concept, index) => (
          <div className="method-card" key={`${concept.name}-${index}`}>
            <label>Concept name<input value={concept.name} onChange={(e) => patch(index, { name: e.target.value })} /></label>
            <label>Kind<input value={concept.kind} onChange={(e) => patch(index, { kind: e.target.value })} /></label>
            <label>Connects to
              <select value={concept.connects_to} onChange={(e) => patch(index, { connects_to: e.target.value })}>
                {connectionOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Description<textarea value={concept.description} onChange={(e) => patch(index, { description: e.target.value })} /></label>
            <button className="secondary-btn" onClick={() => removeConcept(index)}>Remove</button>
          </div>
        ))}
      </div>
    </section>
  );
}
