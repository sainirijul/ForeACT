import { Upload, Sparkles, Workflow } from "lucide-react";
import { useState } from "react";

type Props = {
  loading: boolean;
  onDemoProfile: () => void;
  onUploadData: (file: File) => Promise<void> | void;
};

export function UploadPanel({ loading, onDemoProfile, onUploadData }: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      setUploadError(null);
      await onUploadData(file);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="panel hero-panel">
      <div>
        <p className="eyebrow">Model-driven forecast assurance</p>
        <h1>ForeACT Studio</h1>
        <p className="hero-copy">
          A graphical DSL-style workbench for modelers: profile a forecast
          dataset, enrich field semantics, declare revision/volatility methods,
          inspect the compiled assurance model, and produce traceable decision
          cards for high-impact forecast changes.
        </p>
        <div className="process-strip">
          <span>
            <Workflow size={15} /> 1. Profile data
          </span>
          <span>2. Build field model</span>
          <span>3. Select methods</span>
          <span>4. Inspect model</span>
          <span>5. Generate assurance insights</span>
        </div>

        {uploadError && <p className="helper-text error-text">{uploadError}</p>}
      </div>

      <div className="hero-actions">
        <button
          disabled={loading}
          onClick={onDemoProfile}
          className="primary-btn"
        >
          <Sparkles size={18} /> Load AI data-center case study
        </button>

        <label className="secondary-btn">
          <Upload size={18} /> Upload CSV
          <input
            type="file"
            accept=".csv"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
                event.target.value = "";
              }
            }}
            hidden
          />
        </label>
      </div>
    </section>
  );
}
