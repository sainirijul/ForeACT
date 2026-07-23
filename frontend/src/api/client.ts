import axios, { AxiosError } from "axios";
import type {
  AnalysisResponse,
  AnalysisScope,
  CustomConcept,
  FieldSpec,
  ForeACTProjectSpec,
  MethodConfig,
  MetaModel,
  ProfileResponse,
  WorkspaceResponse,
} from "../types/analysis";

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

function getApiErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorResponse | undefined;

    return (
      payload?.error ||
      payload?.message ||
      error.message ||
      "The backend request failed."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The backend request failed.";
}

async function request<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}

function resolveWorkspaceId(
  specOrWorkspaceId?: ForeACTProjectSpec | string | null,
): string {
  if (!specOrWorkspaceId) {
    return "ai_datacenter_capacity";
  }

  if (typeof specOrWorkspaceId === "string") {
    return specOrWorkspaceId || "ai_datacenter_capacity";
  }

  return specOrWorkspaceId.project?.id || "ai_datacenter_capacity";
}

export async function loadMetamodel(
  workspaceId = "ai_datacenter_capacity",
): Promise<MetaModel> {
  return request(async () => {
    const response = await api.get<MetaModel>("/metamodel", {
      params: {
        workspace_id: workspaceId,
      },
    });

    return response.data;
  });
}

export async function loadDefaultWorkspace(
  workspaceId = "ai_datacenter_capacity",
): Promise<WorkspaceResponse> {
  return request(async () => {
    const response = await api.get<WorkspaceResponse>("/workspace/default", {
      params: {
        workspace_id: workspaceId,
      },
    });

    return response.data;
  });
}

export async function saveWorkspace(
  spec: ForeACTProjectSpec,
): Promise<WorkspaceResponse & { status: string }> {
  const workspaceId = resolveWorkspaceId(spec);

  return request(async () => {
    const response = await api.post<WorkspaceResponse & { status: string }>(
      "/workspace/save",
      {
        workspace_id: workspaceId,
        spec,
      },
    );

    return response.data;
  });
}

/*
 * This method is retained for calls that explicitly want the backend's
 * last persisted specification.
 */
export async function analyzeWorkspaceById(
  workspaceId = "ai_datacenter_capacity",
): Promise<AnalysisResponse & Partial<WorkspaceResponse>> {
  return request(async () => {
    const response = await api.post<
      AnalysisResponse & Partial<WorkspaceResponse>
    >("/workspace/analyze", {
      workspace_id: workspaceId,
    });

    return response.data;
  });
}

/*
 * Preferred integrated analysis method.
 *
 * It sends the exact specification currently held by React. Therefore,
 * semantic mapping changes, forecast scope changes, methods, thresholds,
 * policies, and metamodel extensions are not lost between pages.
 */
export async function analyzeWorkspace(
  spec: ForeACTProjectSpec,
): Promise<AnalysisResponse & Partial<WorkspaceResponse>> {
  return request(async () => {
    const response = await api.post<
      AnalysisResponse & Partial<WorkspaceResponse>
    >("/workspace/analyze", {
      workspace_id: resolveWorkspaceId(spec),
      spec,
    });

    return response.data;
  });
}

/*
 * Uploads a CSV into the selected workspace.
 *
 * The backend updates the canonical project specification and returns:
 * - the new dataset path;
 * - inferred field mappings;
 * - inferred forecast scope;
 * - refreshed profile;
 * - cleared dataset-dependent analysis artifacts.
 */
export async function uploadWorkspaceData(
  file: File,
  specOrWorkspaceId: ForeACTProjectSpec | string,
): Promise<WorkspaceResponse & { status: string }> {
  const workspaceId = resolveWorkspaceId(specOrWorkspaceId);

  const form = new FormData();
  form.append("file", file);
  form.append("workspace_id", workspaceId);

  return request(async () => {
    const response = await api.post<WorkspaceResponse & { status: string }>(
      "/workspace/upload-data",
      form,
    );

    return response.data;
  });
}

/*
 * Legacy demo profiling endpoint.
 */
export async function profileDemo(): Promise<ProfileResponse> {
  return request(async () => {
    const response = await api.post<ProfileResponse>("/profile-demo");
    return response.data;
  });
}

/*
 * Legacy endpoint that profiles a file without updating the workspace.
 * Use uploadWorkspaceData for the integrated application.
 */
export async function profileUpload(file: File): Promise<ProfileResponse> {
  const form = new FormData();
  form.append("file", file);

  return request(async () => {
    const response = await api.post<ProfileResponse>("/profile-upload", form);

    return response.data;
  });
}

/*
 * Legacy direct analysis endpoint.
 */
export async function analyzeUploadedData(
  file: File,
  fields: FieldSpec[],
  methods: MethodConfig,
  scope: AnalysisScope,
  customConcepts: CustomConcept[] = [],
): Promise<AnalysisResponse> {
  const form = new FormData();

  form.append("file", file);
  form.append("fields", JSON.stringify(fields));
  form.append("methods", JSON.stringify(methods));
  form.append("scope", JSON.stringify(scope));
  form.append("custom_concepts", JSON.stringify(customConcepts));

  return request(async () => {
    const response = await api.post<AnalysisResponse>("/analyze-upload", form);

    return response.data;
  });
}
