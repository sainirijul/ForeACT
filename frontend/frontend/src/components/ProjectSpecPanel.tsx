import type { ForeACTProjectSpec, ProfileResponse } from '../types/analysis';

export function ProjectSpecPanel({ spec, profile, workspaceFile, onSpecChange, onUploadData }: {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  workspaceFile: string;
  onSpecChange: (next: ForeACTProjectSpec) => void;
  onUploadData: (file: File) => void;
}) {
  const text = JSON.stringify(spec, null, 2);
  return (
    <section className="page-grid">
      <article className="panel hero-panel">
        <p className="eyebrow">Central use-case specification</p>
        <h2>{spec.project.name}</h2>
        <p>{spec.project.description}</p>
        <div className="metric-row">
          <span><strong>{workspaceFile}</strong><small>Workspace file</small></span>
          <span><strong>{spec.dataset.format}</strong><small>Dataset format</small></span>
          <span><strong>{profile?.rows ?? 0}</strong><small>Rows</small></span>
          <span><strong>{profile?.columns ?? 0}</strong><small>Columns</small></span>
        </div>
        <label className="upload-inline">
          Upload CSV for this use case
          <input type="file" accept=".csv" onChange={(event) => event.target.files?.[0] && onUploadData(event.target.files[0])} />
        </label>
      </article>
      <article className="panel">
        <p className="eyebrow">Specification preview</p>
        <h2>.foreact.json</h2>
        <textarea
          className="spec-editor"
          value={text}
          onChange={(event) => {
            try {
              onSpecChange(JSON.parse(event.target.value));
            } catch {
              // keep editor non-blocking; invalid JSON is ignored until user fixes it
            }
          }}
        />
      </article>
      <article className="panel full-span">
        <p className="eyebrow">Why this file matters</p>
        <div className="rigor-list">
          <div><strong>Dataset-specific model memory</strong><p>All pages read and write the same use-case file, so field semantics, methods, metamodel extensions, and analysis scope stay connected.</p></div>
          <div><strong>Reusable modeling artifact</strong><p>The file is a compact JSON representation of the DSL instance and can be versioned with the dataset.</p></div>
          <div><strong>Transformation input</strong><p>The compiled model and decision cards are generated from this specification instead of hidden UI state.</p></div>
        </div>
      </article>
    </section>
  );
}
