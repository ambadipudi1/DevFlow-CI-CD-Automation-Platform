import {
  IntegrationStatus,
  Repository,
  Pipeline,
  WorkflowRun,
  FailureDiagnosis,
  Deployment,
  DockerBuild,
  AuditLog,
  AnalyticsSummary,
} from '../types/client.js';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `HTTP error ${res.status}`);
  }
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Integrations & Status
  getIntegrationStatus: () => fetchJson<IntegrationStatus>('/api/integrations/status'),
  configureToken: (data: { github_token?: string; webhook_secret?: string }) =>
    fetchJson<any>('/api/integrations/configure-token', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Repositories
  getRepositories: () => fetchJson<Repository[]>('/api/repositories'),
  syncGithubRepositories: () =>
    fetchJson<{ count: number; repositories: Repository[] }>('/api/repositories/sync-github', {
      method: 'POST',
    }),
  createRepository: (data: {
    owner: string;
    name: string;
    full_name: string;
    default_branch?: string;
    html_url?: string;
    primary_language?: string;
  }) =>
    fetchJson<Repository>('/api/repositories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Pipelines
  getPipelines: () => fetchJson<Pipeline[]>('/api/pipelines'),
  createPipeline: (data: Partial<Pipeline>) =>
    fetchJson<Pipeline>('/api/pipelines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePipeline: (id: string, data: Partial<Pipeline>) =>
    fetchJson<Pipeline>(`/api/pipelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePipeline: (id: string) =>
    fetchJson<{ deleted: boolean }>(`/api/pipelines/${id}`, {
      method: 'DELETE',
    }),
  getWorkflowYaml: (pipelineId: string) =>
    fetchJson<{ yaml: string; filename: string }>(`/api/pipelines/${pipelineId}/workflow-yaml`),

  // Workflow Runs
  getWorkflowRuns: (params?: {
    repository_id?: string;
    pipeline_id?: string;
    status?: string;
    conclusion?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.repository_id) query.set('repository_id', params.repository_id);
    if (params?.pipeline_id) query.set('pipeline_id', params.pipeline_id);
    if (params?.status) query.set('status', params.status);
    if (params?.conclusion) query.set('conclusion', params.conclusion);
    return fetchJson<{ runs: WorkflowRun[]; total: number }>(`/api/workflow-runs?${query.toString()}`);
  },
  getWorkflowRunDetails: (id: string) =>
    fetchJson<{
      run: WorkflowRun;
      logs: { raw_log: string; sanitized_log: string } | null;
      diagnosis: FailureDiagnosis | null;
      docker_builds: DockerBuild[];
    }>(`/api/workflow-runs/${id}`),
  triggerWorkflowRun: (data: {
    pipeline_id: string;
    branch?: string;
    simulated_outcome?: 'success' | 'failure' | 'real_github';
    failure_type?: 'missing_deps' | 'typescript' | 'test_assertion' | 'missing_env' | 'docker';
  }) =>
    fetchJson<WorkflowRun>('/api/workflow-runs/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Failure Diagnosis & Remediation
  getDiagnosis: (runId: string) => fetchJson<FailureDiagnosis>(`/api/diagnoses/${runId}`),
  triggerAiDiagnosis: (runId: string) =>
    fetchJson<{ diagnosis: FailureDiagnosis; aiAssisted: boolean; note?: string }>(
      `/api/diagnoses/${runId}/ai-analyze`,
      { method: 'POST' }
    ),
  applyRemediationAndRerun: (data: {
    workflow_run_id: string;
    file_path: string;
    suggested_code: string;
    commit_message?: string;
    create_pull_request?: boolean;
  }) =>
    fetchJson<{
      remediated: boolean;
      original_run_id: string;
      verified_run: WorkflowRun;
      message: string;
    }>('/api/remediation/apply-and-rerun', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Deployments
  getDeployments: (pipelineId?: string) => {
    const url = pipelineId ? `/api/deployments?pipeline_id=${pipelineId}` : '/api/deployments';
    return fetchJson<Deployment[]>(url);
  },
  triggerHealthCheck: (deploymentId: string) =>
    fetchJson<Deployment>(`/api/deployments/${deploymentId}/health-check`, {
      method: 'POST',
    }),

  // Docker Builds
  getDockerBuilds: (runId?: string) => {
    const url = runId ? `/api/docker-builds?run_id=${runId}` : '/api/docker-builds';
    return fetchJson<DockerBuild[]>(url);
  },

  // Reports
  getAnalytics: () => fetchJson<AnalyticsSummary>('/api/reports/analytics'),

  // Audit Logs
  getAuditLogs: () => fetchJson<AuditLog[]>('/api/audit-logs'),

  // Demo Sandbox Management
  seedDemo: () => fetchJson<{ message: string; seeded: boolean }>('/api/demo/seed', { method: 'POST' }),
  purgeDemo: () => fetchJson<{ message: string; deletedRuns: number }>('/api/demo/purge', { method: 'POST' }),

  // Database Info
  getDatabaseInfo: () =>
    fetchJson<{
      path: string;
      tables: Record<string, number>;
      migrations: { id: number; name: string; applied_at: string }[];
      pragmas: any;
    }>('/api/database/info'),
};
