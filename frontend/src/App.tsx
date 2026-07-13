import { useEffect, useState } from 'react';
import '@xyflow/react/dist/style.css';
import { analyzeWorkspace, loadDefaultWorkspace, saveWorkspace, uploadWorkspaceData } from './api/client';
import type { AnalysisResponse, ForeACTProjectSpec, ProfileResponse } from './types/analysis';
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
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    run(async () => {
      const workspace = await loadDefaultWorkspace();
      setSpec(workspace.spec);
      setProfile(workspace.profile);
      setWorkspaceFile(workspace.workspace_file);
    }, 'Loaded ForeACT project specification.');
  }, []);

  async function run(action: () => Promise<void>, successMessage?: string) {
    setLoading(true);
    setError(null);
    try {
      await action();
      setStatus(successMessage || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function updateSpec(next: ForeACTProjectSpec) {
    setSpec(next);
    setStatus('Unsaved project changes. Save the central specification when ready.');
  }

  function saveCurrentSpec() {
    if (!spec) return;
    run(async () => {
      const saved = await saveWorkspace(spec);
      setSpec(saved.spec);
      setWorkspaceFile(saved.workspace_file);
    }, 'Saved central ForeACT project specification.');
  }

  function compileAndAnalyze() {
    if (!spec) return;
    run(async () => {
      const result = await analyzeWorkspace(spec);
      setAnalysis(result);
      if (result.project_spec) setSpec(result.project_spec);
      if (result.workspace_file) setWorkspaceFile(result.workspace_file);
      setActive('transformations');
    }, 'Compiled model transformations and generated forecast assurance analysis.');
  }

  function uploadData(file: File) {
    if (!spec) return;
    run(async () => {
      const uploaded = await uploadWorkspaceData(file, spec);
      setSpec(uploaded.spec);
      setProfile(uploaded.profile);
      setWorkspaceFile(uploaded.workspace_file);
      setAnalysis(null);
      setActive('semantic');
    }, 'Uploaded dataset and updated the dataset-specific project specification.');
  }

  if (!spec) {
    return <main className="loading-screen"><div className="panel">Loading ForeACT workspace...</div></main>;
  }

  return (
    <AppShell active={active} setActive={setActive} projectName={spec.project.name} centralFile={workspaceFile || spec.project.central_file} onSave={saveCurrentSpec} onAnalyze={compileAndAnalyze} loading={loading}>
      {status && <div className="status-panel">{status}</div>}
      {error && <div className="error-panel">{error}</div>}
      {loading && <div className="status-panel">Working on the current ForeACT model...</div>}
      {active === 'semantic' && <SemanticFieldModelingPage spec={spec} profile={profile} setSpec={updateSpec} />}
      {active === 'methodology' && <MethodologyReviewPage spec={spec} profile={profile} setSpec={updateSpec} />}
      {active === 'metamodel' && <MetamodelExtensionPage spec={spec} setSpec={updateSpec} />}
      {active === 'transformations' && <TransformationAnalysisPage spec={spec} profile={profile} analysis={analysis} onAnalyze={compileAndAnalyze} />}
      {active === 'decisions' && <DecisionAnalysisPage spec={spec} analysis={analysis} onAnalyze={compileAndAnalyze} />}
      {active === 'spec' && <ProjectSpecPanel spec={spec} profile={profile} workspaceFile={workspaceFile || spec.project.central_file} onSpecChange={updateSpec} onUploadData={uploadData} />}
    </AppShell>
  );
}
