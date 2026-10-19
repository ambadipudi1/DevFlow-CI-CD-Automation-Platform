import { SQLiteConnection } from '../db/connection.js';
import { WorkflowRun, WorkflowStatus, WorkflowConclusion } from '../types/domain.js';
import crypto from 'crypto';

export class WorkflowRunRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<WorkflowRun | undefined> {
    return this.conn.get<WorkflowRun>(
      `SELECT r.*, p.name as pipeline_name, rep.full_name as repository_full_name
       FROM workflow_runs r
       JOIN pipelines p ON r.pipeline_id = p.id
       JOIN repositories rep ON r.repository_id = rep.id
       WHERE r.id = ?`,
      [id]
    );
  }

  async findByGithubRunId(githubRunId: number): Promise<WorkflowRun | undefined> {
    return this.conn.get<WorkflowRun>(
      `SELECT r.*, p.name as pipeline_name, rep.full_name as repository_full_name
       FROM workflow_runs r
       JOIN pipelines p ON r.pipeline_id = p.id
       JOIN repositories rep ON r.repository_id = rep.id
       WHERE r.github_run_id = ?`,
      [githubRunId]
    );
  }

  async list(filters?: {
    repository_id?: string;
    pipeline_id?: string;
    status?: WorkflowStatus;
    conclusion?: WorkflowConclusion;
    limit?: number;
    offset?: number;
  }): Promise<{ runs: WorkflowRun[]; total: number }> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.repository_id) {
      whereClauses.push('r.repository_id = ?');
      params.push(filters.repository_id);
    }
    if (filters?.pipeline_id) {
      whereClauses.push('r.pipeline_id = ?');
      params.push(filters.pipeline_id);
    }
    if (filters?.status) {
      whereClauses.push('r.status = ?');
      params.push(filters.status);
    }
    if (filters?.conclusion) {
      whereClauses.push('r.conclusion = ?');
      params.push(filters.conclusion);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = await this.conn.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflow_runs r ${whereSql}`,
      params
    );

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const queryParams = [...params, limit, offset];
    const runs = await this.conn.all<WorkflowRun>(
      `SELECT r.*, p.name as pipeline_name, rep.full_name as repository_full_name
       FROM workflow_runs r
       JOIN pipelines p ON r.pipeline_id = p.id
       JOIN repositories rep ON r.repository_id = rep.id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return { runs, total: countRow?.count || 0 };
  }

  async create(data: {
    id?: string;
    pipeline_id: string;
    repository_id: string;
    github_run_id?: number | null;
    workflow_name: string;
    branch: string;
    commit_sha: string;
    status: WorkflowStatus;
    conclusion?: WorkflowConclusion;
    run_url?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    duration_seconds?: number | null;
  }): Promise<WorkflowRun> {
    const id = data.id || 'run_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    await this.conn.run(
      `INSERT INTO workflow_runs (
        id, pipeline_id, repository_id, github_run_id, workflow_name, branch, commit_sha,
        status, conclusion, run_url, started_at, completed_at, duration_seconds, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.pipeline_id,
        data.repository_id,
        data.github_run_id || null,
        data.workflow_name,
        data.branch,
        data.commit_sha,
        data.status,
        data.conclusion || null,
        data.run_url || null,
        data.started_at || null,
        data.completed_at || null,
        data.duration_seconds || null,
        now,
        now,
      ]
    );

    return (await this.findById(id))!;
  }

  async upsertByGithubRunId(data: {
    github_run_id: number;
    pipeline_id: string;
    repository_id: string;
    workflow_name: string;
    branch: string;
    commit_sha: string;
    status: WorkflowStatus;
    conclusion?: WorkflowConclusion;
    run_url?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    duration_seconds?: number | null;
  }): Promise<WorkflowRun> {
    const existing = await this.findByGithubRunId(data.github_run_id);
    const now = new Date().toISOString();

    if (existing) {
      await this.conn.run(
        `UPDATE workflow_runs 
         SET status = ?, conclusion = COALESCE(?, conclusion), run_url = COALESCE(?, run_url),
             started_at = COALESCE(?, started_at), completed_at = COALESCE(?, completed_at),
             duration_seconds = COALESCE(?, duration_seconds), updated_at = ?
         WHERE id = ?`,
        [
          data.status,
          data.conclusion || null,
          data.run_url || null,
          data.started_at || null,
          data.completed_at || null,
          data.duration_seconds || null,
          now,
          existing.id,
        ]
      );
      return (await this.findById(existing.id))!;
    } else {
      return this.create(data);
    }
  }

  async updateStatus(
    id: string,
    update: {
      status: WorkflowStatus;
      conclusion?: WorkflowConclusion;
      completed_at?: string | null;
      duration_seconds?: number | null;
      run_url?: string | null;
    }
  ): Promise<WorkflowRun | undefined> {
    const now = new Date().toISOString();
    await this.conn.run(
      `UPDATE workflow_runs 
       SET status = ?, conclusion = COALESCE(?, conclusion), completed_at = COALESCE(?, completed_at),
           duration_seconds = COALESCE(?, duration_seconds), run_url = COALESCE(?, run_url), updated_at = ?
       WHERE id = ?`,
      [
        update.status,
        update.conclusion || null,
        update.completed_at || null,
        update.duration_seconds || null,
        update.run_url || null,
        now,
        id,
      ]
    );
    return this.findById(id);
  }

  async setLogs(workflowRunId: string, rawLog: string, sanitizedLog: string): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      `INSERT INTO workflow_logs (workflow_run_id, raw_log, sanitized_log, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(workflow_run_id) DO UPDATE SET
         raw_log = excluded.raw_log,
         sanitized_log = excluded.sanitized_log`,
      [workflowRunId, rawLog, sanitizedLog, now]
    );
  }

  async getLogs(workflowRunId: string): Promise<{ raw_log: string; sanitized_log: string } | undefined> {
    return this.conn.get<{ raw_log: string; sanitized_log: string }>(
      'SELECT raw_log, sanitized_log FROM workflow_logs WHERE workflow_run_id = ?',
      [workflowRunId]
    );
  }
}
