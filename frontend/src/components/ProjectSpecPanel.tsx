import { useState, useEffect } from 'react';
import type { ForeACTProjectSpec, ProfileResponse } from '../types/analysis';

function AccordionRow({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-row">
      <button className="accordion-trigger" onClick={() => setOpen((p) => !p)}>
        <strong>{title}</strong>
        <span className="toggle-icon">{open ? '▲' : '▼'}</span>
      </button>
      {open && <p className="accordion-body">{body}</p>}
    </div>
  );
}

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

  useEffect(() => {
    if (!uploadMessage) return;
    const timer = setTimeout(() => setUploadMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [uploadMessage]);

  const text = JSON.stringify(spec, null, 2);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      setUploadMessage(null);
      setUploadError(null);

      await onUploadData(file);

      /*setUploadMessage(
        'CSV uploaded. The workspace JSON, field model, methodology scope, and profile were refreshed.',
      );*/
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="page-stack">
      <article className="panel hero-panel">
        <p className="eyebrow">Use-case specification</p>
        <h2>{spec.project?.name ?? 'ForeACT Project'}</h2>
        <p>{spec.project?.description ?? 'Please select the dataset with which you want to compute variance and volatilty.'}</p>

        <div className="metric-row">
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
      
    {/* ── Why this file matters (accordion) ── */}

    <article>
      <p className="eyebrow">Why this file matters</p>

      {[
        {
          title: 'Dataset-specific model memory',
          body: 'All pages read and write the same use-case file, so field semantics, methods, metamodel extensions, and analysis scope stay connected.',
        },
        {
          title: 'Reusable modeling artifact',
          body: 'The file is a compact JSON representation of the DSL instance and can be versioned with the dataset.',
        },
        {
          title: 'Transformation input',
          body: 'The compiled model and decision cards are generated from this specification instead of hidden UI state.',
       },
      ].map((item) => (
    <AccordionRow key={item.title} title={item.title} body={item.body} />
  ))}
    </article>
   </section>
  );
}