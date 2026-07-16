import { useEffect, useState } from 'react';
import '@xyflow/react/dist/style.css';
import {
  analyzeWorkspace,
  loadDefaultWorkspace,
  loadMetamodel,
  saveWorkspace,
  uploadWorkspaceData,
} from './api/client';
import type {
  AnalysisResponse,
  ForeACTProjectSpec,
  MetaModel,
  ProfileResponse,
} from './types/analysis';
import { AppShell, type PageId } from './components/Shell';
import { ProjectSpecPanel } from './components/ProjectSpecPanel';
import { SemanticFieldModelingPage } from './components/SemanticFieldModelingPage';
import { MethodologyReviewPage } from './components/MethodologyReviewPage';
import { MetamodelExtensionPage } from './components/MetamodelExtensionPage';
import { TransformationAnalysisPage } from './components/TransformationAnalysisPage';
import { DecisionAnalysisPage } from './components/DecisionAnalysisPage';
import './styles/app.css';

export default function App() {
  const [active, setActive] = useState<PageId>('semantic');
  const [spec, setSpec] = useState<ForeACTProjectSpec | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [workspaceFile, setWorkspaceFile] = useState('');
  const [metamodel, setMetamodel] = useState<MetaModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const workspace = await loadDefaultWorkspace();

        setSpec(workspace.spec);
        setProfile(workspace.profile);
        setWorkspaceFile(workspace.workspace_file);

        /*
         * The workspace response also includes the Ecore-projected metamodel.
         * This provides a fallback when the standalone metamodel endpoint
         * cannot be reached during development.
         */
        if (workspace.metamodel) {
          setMetamodel(workspace.metamodel);
        }

        try {
          const loadedMetamodel = await loadMetamodel(
            workspace.spec.project.id,
          );
          setMetamodel(loadedMetamodel);
        } catch (metamodelError) {
          console.warn(
            'Could not load /api/metamodel. Using the workspace metamodel.',
            metamodelError,
          );
        }

        setStatus('Loaded ForeACT project specification.');
      } catch (bootstrapError) {
        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : 'Unable to load the ForeACT workspace.',
        );
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, []);

  async function run(
    action: () => Promise<void>,
    successMessage?: string,
  ): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      await action();
      setStatus(successMessage ?? null);
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : 'The requested operation failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * This is the single update path used by all model-editing pages.
   *
   * Any edit invalidates the previous analysis because that analysis was
   * generated from an older project specification.
   */
  function updateSpec(next: ForeACTProjectSpec) {
    setSpec(next);
    setAnalysis(null);
    setStatus(
      'Project model updated. Recompile to refresh derived analysis artifacts.',
    );
  }

  function saveCurrentSpec() {
    if (!spec) {
      return;
    }

    return run(async () => {
      const saved = await saveWorkspace(spec);

      setSpec(saved.spec);
      setProfile(saved.profile);
      setWorkspaceFile(saved.workspace_file);
    }, 'Saved central ForeACT project specification.');
  }

  function compileAndAnalyze() {
    if (!spec) {
      return;
    }

    return run(async () => {
      /*
       * Send the current in-memory specification rather than only its ID.
       * This guarantees that unsaved semantic mappings, scope selections,
       * method choices, and policies are included in the analysis.
       */
      const result = await analyzeWorkspace(spec);

      setAnalysis(result);

      if (result.project_spec) {
        setSpec(result.project_spec);
      }

      if (result.profile) {
        setProfile(result.profile);
      }

      if (result.workspace_file) {
        setWorkspaceFile(result.workspace_file);
      }

      setActive('transformations');
    }, 'Saved, compiled, and analyzed the current ForeACT project model.');
  }

  async function uploadData(file: File) {
    if (!spec) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uploaded = await uploadWorkspaceData(file, spec);

      /*
       * The backend returns the rebuilt canonical project specification.
       * All pages immediately receive the uploaded dataset's mappings and
       * forecast scope through the shared App state.
       */
      setSpec(uploaded.spec);
      setProfile(uploaded.profile);
      setWorkspaceFile(uploaded.workspace_file);
      setAnalysis(null);
      setActive('semantic');

      setStatus(
        'Uploaded dataset and rebuilt the dataset-specific field and scope models.',
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : 'CSV upload failed.';

      setError(message);

      /*
       * Re-throw so that UploadPanel does not display a false success state.
       */
      throw uploadError;
    } finally {
      setLoading(false);
    }
  }

  if (!spec) {
    return (
      <main className="loading-screen">
        <div className="panel">
          {error ?? 'Loading ForeACT workspace...'}
        </div>
      </main>
    );
  }

  return (
    <AppShell
      active={active}
      setActive={setActive}
      projectName={spec.project.name}
      centralFile={workspaceFile || spec.project.central_file}
      onSave={saveCurrentSpec}
      onAnalyze={compileAndAnalyze}
      loading={loading}
    >
      {status && <div className="status-panel">{status}</div>}

      {error && <div className="error-panel">{error}</div>}

      {loading && (
        <div className="status-panel">
          Working on the current ForeACT model...
        </div>
      )}

      {active === 'semantic' && (
        <SemanticFieldModelingPage
          spec={spec}
          profile={profile}
          setSpec={updateSpec}
        />
      )}

      {active === 'methodology' && (
        <MethodologyReviewPage
          spec={spec}
          profile={profile}
          setSpec={updateSpec}
        />
      )}

      {active === 'metamodel' && (
        <MetamodelExtensionPage
          spec={spec}
          setSpec={updateSpec}
          metamodel={metamodel}
        />
      )}

      {active === 'transformations' && (
        <TransformationAnalysisPage
          spec={spec}
          profile={profile}
          analysis={analysis}
          onAnalyze={compileAndAnalyze}
        />
      )}

      {active === 'decisions' && (
        <DecisionAnalysisPage
          spec={spec}
          analysis={analysis}
          onAnalyze={compileAndAnalyze}
        />
      )}

      {active === 'spec' && (
        <ProjectSpecPanel
          spec={spec}
          profile={profile}
          workspaceFile={workspaceFile || spec.project.central_file}
          onSpecChange={updateSpec}
          onUploadData={uploadData}
        />
      )}
    </AppShell>
  );
}