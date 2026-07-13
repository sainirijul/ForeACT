import type { FieldSpec, ProfileResponse } from '../types/analysis';

const roleOptions = ['forecast_version', 'forecast_horizon', 'scenario', 'feature', 'target', 'previous_forecast', 'current_forecast', 'ignore'];
const semanticOptions = ['forecast_issue_time', 'forecast_target_time', 'planning_scenario', 'external_driver', 'forecast_target', 'forecast_cycle_output', 'control_variable', 'scenario', 'unknown'];
const directionOptions = ['higher_is_riskier', 'lower_is_riskier', 'neutral'];

type Props = {
  profile: ProfileResponse;
  fieldSpecs: FieldSpec[];
  setFieldSpecs: (next: FieldSpec[]) => void;
};

export function SemanticFieldModeler({ profile, fieldSpecs, setFieldSpecs }: Props) {
  function update(index: number, patch: Partial<FieldSpec>) {
    setFieldSpecs(fieldSpecs.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  return (
    <section className="panel">
      <div className="panel-header split">
        <div>
          <p className="eyebrow">DSL step 1</p>
          <h2>Semantic Field Model</h2>
          <p className="muted">
            Auto-discovered fields are only a starting point. Modelers make the dataset interpretable by assigning roles,
            units, semantic types, and business meaning.
          </p>
        </div>
        <div className="mini-stats">
          <strong>{profile.rows}</strong><span>rows</span>
          <strong>{profile.columns}</strong><span>columns</span>
        </div>
      </div>
      <div className="table-scroll">
        <table className="field-table">
          <thead>
            <tr>
              <th>Use</th><th>Column</th><th>Role</th><th>Business name</th><th>Unit</th><th>Semantic type</th><th>Direction</th><th>Description</th>
            </tr>
          </thead>
          <tbody>
            {fieldSpecs.map((field, index) => (
              <tr key={field.name}>
                <td><input type="checkbox" checked={field.include_in_model} onChange={(e) => update(index, { include_in_model: e.target.checked })} /></td>
                <td><strong>{field.name}</strong><small>{field.data_type}</small></td>
                <td><select value={field.role} onChange={(e) => update(index, { role: e.target.value })}>{roleOptions.map((role) => <option key={role}>{role}</option>)}</select></td>
                <td><input value={field.business_name} onChange={(e) => update(index, { business_name: e.target.value })} /></td>
                <td><input className="unit-input" value={field.unit} onChange={(e) => update(index, { unit: e.target.value })} /></td>
                <td><select value={field.semantic_type} onChange={(e) => update(index, { semantic_type: e.target.value })}>{semanticOptions.map((s) => <option key={s}>{s}</option>)}</select></td>
                <td><select value={field.direction} onChange={(e) => update(index, { direction: e.target.value })}>{directionOptions.map((d) => <option key={d}>{d}</option>)}</select></td>
                <td><input value={field.description} onChange={(e) => update(index, { description: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
