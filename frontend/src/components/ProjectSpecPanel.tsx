import { useState } from 'react';
import type { ForeACTProjectSpec, ProfileResponse } from '../types/analysis';

export function ProjectSpecPanel({
  spec,
  profile,
  workspaceFile,
  onSpecChange,
  onUploadData,
}: {
  spec: ForeACTProjectSpec;
  profile: ProfileResponse | null;
  workspaceFile: string;
  onSpecChange: (next: ForeACTProjectSpec) => void;
  onUploadData: (file: File) => Promise<void> | void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const text = JSON.stringify(spec, null, 2);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      setUploadMessage(null);
      setUploadError(null);

      await onUploadData(file);

      setUploadMessage(
        'CSV uploaded. The workspace JSON, field model, methodology scope, and profile were refreshed.',
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="page-grid">
      <article className="panel hero-panel">
        <p className="eyebrow">Central use-case specification</p>
        <h2>{spec.project?.name ?? 'ForeACT Project'}</h2>
        <p>{spec.project?.description ?? 'Forecast actionability project specification.'}</p>

        <div className="metric-row">
          <span>
            <strong title={workspaceFile}>{workspaceFile || 'Not saved yet'}</strong>
            <small>Workspace file</small>
          </span>
          <span>
            <strong title={spec.dataset?.format ?? 'csv'}>
              {spec.dataset?.format ?? 'csv'}
            </strong>
            <small>Dataset format</small>
          </span>
          <span>
            <strong>{profile?.rows ?? 0}</strong>
            <small>Rows</small>
          </span>
          <span>
            <strong>{profile?.columns ?? 0}</strong>
            <small>Columns</small>
          </span>
        </div>

        <label className="upload-inline">
          {uploading ? 'Uploading CSV...' : 'Upload CSV for this use case'}
          <input
            type="file"
            accept=".csv"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
                event.target.value = '';
              }
            }}
          />
        </label>

        {uploadMessage && (
          <p className="helper-text success-text">
            {uploadMessage}
          </p>
        )}

        {uploadError && (
          <p className="helper-text error-text">
            {uploadError}
          </p>
        )}
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
          <div>
            <strong>Dataset-specific model memory</strong>
            <p>
              All pages read and write the same use-case file, so field semantics, methods,
              metamodel extensions, and analysis scope stay connected.
            </p>
          </div>
          <div>
            <strong>Reusable modeling artifact</strong>
            <p>
              The file is a compact JSON representation of the DSL instance and can be versioned with the dataset.
            </p>
          </div>
          <div>
            <strong>Transformation input</strong>
            <p>
              The compiled model and decision cards are generated from this specification instead of hidden UI state.
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}