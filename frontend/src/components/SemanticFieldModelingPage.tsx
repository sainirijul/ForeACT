import { useMemo, useState } from "react";
import type {
  FieldSpec,
  ForeACTProjectSpec,
  ProfileResponse,
} from "../types/analysis";

const roles = [
  "all",
  "forecast_version",
  "forecast_horizon",
  "scenario",
  "feature",
  "target",
  "ignore",
];
const semanticTemplates: Record<string, Partial<FieldSpec>> = {
  feature: {
    role: "feature",
    semantic_type: "external_driver",
    include_in_model: true,
    direction: "higher_is_riskier",
  },
  target: {
    role: "target",
    semantic_type: "forecast_target",
    include_in_model: true,
    direction: "higher_is_riskier",
  },
  scenario: {
    role: "scenario",
    semantic_type: "planning_scenario",
    include_in_model: true,
    direction: "neutral",
  },
  ignore: {
    role: "ignore",
    semantic_type: "not_modeled",
    include_in_model: false,
    direction: "neutral",
  },
};

export function SemanticFieldModelingPage({
  spec,
  profile,
  setSpec,
}: {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  setSpec: (spec: ForeACTProjectSpec) => void;
}) {
  const fields = spec.field_model.fields;
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 18;

  const filtered = useMemo(
    () =>
      fields.filter((field) => {
        const q = query.toLowerCase();
        const matchesQuery =
          !q ||
          [
            field.name,
            field.business_name,
            field.semantic_type,
            field.description,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
        const matchesRole = roleFilter === "all" || field.role === roleFilter;
        return matchesQuery && matchesRole;
      }),
    [fields, query, roleFilter],
  );

  const pageFields = filtered.slice(
    page * pageSize,
    page * pageSize + pageSize,
  );
  const completeness = Math.round(
    (fields.filter(
      (f) =>
        !f.include_in_model ||
        (f.business_name && f.semantic_type && (f.role !== "target" || f.unit)),
    ).length /
      Math.max(1, fields.length)) *
      100,
  );
  const roleCounts = roles.slice(1).map((role) => ({
    role,
    count: fields.filter((f) => f.role === role).length,
  }));

  function updateField(name: string, patch: Partial<FieldSpec>) {
    setSpec({
      ...spec,
      field_model: {
        fields: fields.map((field) =>
          field.name === name ? { ...field, ...patch } : field,
        ),
      },
    });
  }

  function applyTemplate(name: string, templateKey: string) {
    updateField(name, semanticTemplates[templateKey] || {});
  }

  function bulkSet(role: string) {
    const names = new Set(filtered.map((f) => f.name));
    const patch = semanticTemplates[role] || {};
    setSpec({
      ...spec,
      field_model: {
        fields: fields.map((f) => (names.has(f.name) ? { ...f, ...patch } : f)),
      },
    });
  }

  return (
    <section className="page-grid">
      <article className="panel hero-panel full-span">
        <p className="eyebrow">DSL Step 1</p>
        <h2>Semantic Field Modeling</h2>
        <p>
          Convert automatically discovered CSV columns into a dataset-specific
          semantic field model. This is the first explicit model artifact
          consumed by the later transformations.
        </p>
        <div className="metric-row">
          <span>
            <strong>{fields.length}</strong>
            <small>Discovered fields</small>
          </span>
          <span>
            <strong>{fields.filter((f) => f.include_in_model).length}</strong>
            <small>Modeled fields</small>
          </span>
          <span>
            <strong>{completeness}%</strong>
            <small>Metadata completeness</small>
          </span>
          <span>
            <strong>{profile?.forecast_versions?.length ?? 0}</strong>
            <small>Forecast versions</small>
          </span>
        </div>
      </article>

      <article className="panel full-span toolbar-panel">
        <input
          className="search-input"
          placeholder="Search 100+ variables by column, business name, semantic type, or description..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <div className="role-tabs">
          {roles.map((role) => (
            <button
              key={role}
              className={roleFilter === role ? "active small" : "small"}
              onClick={() => {
                setRoleFilter(role);
                setPage(0);
              }}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="bulk-actions">
          <span>Bulk apply to filtered fields:</span>
          <button
            className="secondary small"
            onClick={() => bulkSet("feature")}
          >
            Feature
          </button>
          <button className="secondary small" onClick={() => bulkSet("target")}>
            Target
          </button>
          <button className="secondary small" onClick={() => bulkSet("ignore")}>
            Ignore
          </button>
        </div>
      </article>

      <article className="panel full-span">
        <div className="field-table-header">
          <div>Column semantics</div>
          <div>Role</div>
          <div>Business metadata</div>
          <div>Actions</div>
        </div>
        <div className="field-table">
          {pageFields.map((field) => (
            <div className="field-row" key={field.name}>
              <div>
                <strong>{field.name}</strong>
                <small>
                  {field.data_type} ·{" "}
                  {profile?.quality?.find((q) => q.name === field.name)
                    ?.missing_pct ?? 0}
                  % missing
                </small>
              </div>
              <div>
                <select
                  value={field.role}
                  onChange={(e) =>
                    updateField(field.name, {
                      role: e.target.value,
                      include_in_model: e.target.value !== "ignore",
                    })
                  }
                >
                  {roles.slice(1).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={field.include_in_model}
                    onChange={(e) =>
                      updateField(field.name, {
                        include_in_model: e.target.checked,
                      })
                    }
                  />{" "}
                  include
                </label>
              </div>
              <div className="field-meta-grid">
                <input
                  value={field.business_name}
                  placeholder="Business name"
                  onChange={(e) =>
                    updateField(field.name, { business_name: e.target.value })
                  }
                />
                <input
                  value={field.unit}
                  placeholder="Unit"
                  onChange={(e) =>
                    updateField(field.name, { unit: e.target.value })
                  }
                />
                <input
                  value={field.semantic_type}
                  placeholder="Semantic type"
                  onChange={(e) =>
                    updateField(field.name, { semantic_type: e.target.value })
                  }
                />
                <select
                  value={field.direction}
                  onChange={(e) =>
                    updateField(field.name, { direction: e.target.value })
                  }
                >
                  <option value="higher_is_riskier">higher is riskier</option>
                  <option value="lower_is_riskier">lower is riskier</option>
                  <option value="neutral">neutral</option>
                </select>
                <textarea
                  value={field.description}
                  placeholder="Description"
                  onChange={(e) =>
                    updateField(field.name, { description: e.target.value })
                  }
                />
              </div>
              <div className="row-actions">
                <button
                  className="secondary small"
                  onClick={() => applyTemplate(field.name, "feature")}
                >
                  Feature
                </button>
                <button
                  className="secondary small"
                  onClick={() => applyTemplate(field.name, "target")}
                >
                  Target
                </button>
                <button
                  className="secondary small"
                  onClick={() => applyTemplate(field.name, "ignore")}
                >
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="pagination-row">
          <button
            className="secondary small"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Showing {Math.min(filtered.length, page * pageSize + 1)}–
            {Math.min(filtered.length, page * pageSize + pageSize)} of{" "}
            {filtered.length}
          </span>
          <button
            className="secondary small"
            disabled={(page + 1) * pageSize >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </article>

      <article className="panel full-span">
        <p className="eyebrow">Model coverage</p>
        <div className="role-counts">
          {roleCounts.map((item) => (
            <span key={item.role}>
              <strong>{item.count}</strong>
              {item.role}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
