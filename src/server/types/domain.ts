export interface User {
  id: string;
  github_user_id?: number | null;
  username: string;
  email?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
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
  docker_enabled: number; // 0 or 1
  deployment_enabled: number; // 0 or 1
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
  // Joins
  pipeline_name?: string;
  repository_full_name?: string;
  is_demo?: boolean;
}

export interface FailureDiagnosis {
  id: string;
  workflow_run_id: string;
  failure_category: string;
  error_summary: string;
  sanitized_log_excerpt: string;
  evidence_json: string; // stringified JSON
  likely_causes_json: string;
  recommended_actions_json: string;
  proposed_fixes_json?: string | null;
  confidence: number;
  ai_assisted: number; // 0 or 1
  created_at: string;
}

export interface ParsedDiagnosis {
  id: string;
  workflow_run_id: string;
  failure_category: string;
  error_summary: string;
  sanitized_log_excerpt: string;
  evidence: string[];
  likely_causes: string[];
  recommended_actions: string[];
  proposed_fixes?: {
    file_path: string;
    original_code: string;
    suggested_code: string;
    explanation: string;
    verification_steps: string[];
  }[];
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

export interface WebhookEvent {
  id: string;
  github_delivery_id: string;
  event_type: string;
  processing_status: 'received' | 'processed' | 'ignored' | 'failed';
  received_at: string;
  processed_at?: string | null;
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
