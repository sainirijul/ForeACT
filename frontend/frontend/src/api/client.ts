import axios from 'axios';
import type { AnalysisResponse, AnalysisScope, CustomConcept, FieldSpec, ForeACTProjectSpec, MethodConfig, MetaModel, ProfileResponse, WorkspaceResponse } from '../types/analysis';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

export async function loadMetamodel(workspaceId = 'ai_datacenter_capacity'): Promise<MetaModel> {
  const response = await api.get<MetaModel>('/metamodel', { params: { workspace_id: workspaceId } });
  return response.data;
}

export async function loadDefaultWorkspace(): Promise<WorkspaceResponse> {
  const response = await api.get<WorkspaceResponse>('/workspace/default');
  return response.data;
}

export async function saveWorkspace(spec: ForeACTProjectSpec): Promise<{ status: string; workspace_file: string; spec: ForeACTProjectSpec }> {
  const response = await api.post('/workspace/save', { spec });
  return response.data;
}

export async function analyzeWorkspace(spec: ForeACTProjectSpec): Promise<AnalysisResponse> {
  const response = await api.post<AnalysisResponse>('/workspace/analyze', { spec });
  return response.data;
}

export async function uploadWorkspaceData(file: File, spec: ForeACTProjectSpec): Promise<WorkspaceResponse & { status: string }> {
  const form = new FormData();
  form.append('file', file);
  form.append('spec', JSON.stringify(spec));
  const response = await api.post('/workspace/upload-data', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
}

export async function profileDemo(): Promise<ProfileResponse> {
  const response = await api.post<ProfileResponse>('/profile-demo');
  return response.data;
}

export async function profileUpload(file: File): Promise<ProfileResponse> {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ProfileResponse>('/profile-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
}

export async function analyzeDemo(fieldSpecs: FieldSpec[], methods: MethodConfig, scope: AnalysisScope, customConcepts: CustomConcept[]): Promise<AnalysisResponse> {
  const response = await api.post<AnalysisResponse>('/analyze-demo', { field_specs: fieldSpecs, methods, scope, custom_concepts: customConcepts });
  return response.data;
}

export async function uploadCsv(file: File, fieldSpecs: FieldSpec[], methods: MethodConfig, scope: AnalysisScope, customConcepts: CustomConcept[]): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('field_specs', JSON.stringify(fieldSpecs));
  form.append('methods', JSON.stringify(methods));
  form.append('scope', JSON.stringify(scope));
  form.append('custom_concepts', JSON.stringify(customConcepts));
  const response = await api.post<AnalysisResponse>('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data;
}
