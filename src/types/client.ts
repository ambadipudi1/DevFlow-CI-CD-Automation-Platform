export interface IntegrationStatus {
  github: {
    isConnected: boolean;
    hasToken: boolean;
    hasWebhookSecret: boolean;
    user?: {
      id: number;
      login: string;
      avatar_url: string;
      name?: string;
      email?: string;
    } | null;
  };
  gemini: {
    isConfigured: boolean;
    model: string;
  };
  sqlite: {
    database_path: string;
    is_connected: boolean;
  };
  demo_mode: {
    is_seeded: boolean;
  };
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  github_repository_id?: number | null;
  default_branch: string;
  html_url?: string | null;
  primary_language?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  repository_id: string;
  branch: string;
  runtime: 'nodejs' | 'react-vite' | 'python' | 'java-maven' | 'docker' | 'custom';
  test_command?: string | null;
  build_command?: string | null;
  docker_enabled: number;
  deployment_enabled: number;
  deployment_target?: string | null;
  created_at: string;
  updated_at: string;
  repository_full_name?: string;
}

export type WorkflowStatus = 'queued' | 'in_progress' | 'completed' | 'waiting';
export type WorkflowConclusion = 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null;

export interface WorkflowRun {
  id: string;
  pipeline_id: string;
  repository_id: string;
  github_run_id?: number | null;
  workflow_name: string;
  branch: string;
  commit_sha: string;
  status: WorkflowStatus;
  conclusion: WorkflowConclusion;
  run_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
  pipeline_name?: string;
  repository_full_name?: string;
}

export interface ProposedFix {
  file_path: string;
  original_code: string;
  suggested_code: string;
  explanation: string;
  verification_steps: string[];
}

export interface FailureDiagnosis {
  id: string;
  workflow_run_id: string;
  failure_category: string;
  error_summary: string;
  sanitized_log_excerpt: string;
  evidence: string[];
  likely_causes: string[];
  recommended_actions: string[];
  proposed_fixes?: ProposedFix[];
  confidence: number;
  ai_assisted: boolean;
  created_at: string;
}

export interface Deployment {
  id: string;
  pipeline_id: string;
  workflow_run_id?: string | null;
  environment: 'production' | 'staging' | 'preview';
  deployment_target: string;
  deployment_url?: string | null;
  revision?: string | null;
  status: 'pending' | 'in_progress' | 'deployed' | 'failed' | 'rolled_back';
  health_check_status: 'healthy' | 'unhealthy' | 'unknown';
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  pipeline_name?: string;
}

export interface DockerBuild {
  id: string;
  workflow_run_id: string;
  image_name: string;
  image_tag: string;
  image_digest?: string | null;
  registry_url?: string | null;
  status: 'queued' | 'building' | 'pushed' | 'failed';
  created_at: string;
  workflow_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  result: 'success' | 'failure' | 'denied';
  metadata_json?: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  avg_duration_seconds: number;
  total_pipelines: number;
  total_repositories: number;
  total_deployments: number;
  healthy_deployments_rate: number;
  failure_categories: { category: string; count: number }[];
  recent_trend: { date: string; total: number; success: number; failure: number }[];
  mttr_minutes: number;
}
