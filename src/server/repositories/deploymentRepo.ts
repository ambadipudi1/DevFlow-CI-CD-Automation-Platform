import { SQLiteConnection } from '../db/connection.js';
import { Deployment } from '../types/domain.js';
import crypto from 'crypto';

export class DeploymentRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<Deployment | undefined> {
    return this.conn.get<Deployment>(
      `SELECT d.*, p.name as pipeline_name 
       FROM deployments d 
       JOIN pipelines p ON d.pipeline_id = p.id 
       WHERE d.id = ?`,
      [id]
    );
  }

  async list(pipelineId?: string): Promise<Deployment[]> {
    if (pipelineId) {
      return this.conn.all<Deployment>(
        `SELECT d.*, p.name as pipeline_name 
         FROM deployments d 
         JOIN pipelines p ON d.pipeline_id = p.id 
         WHERE d.pipeline_id = ? 
         ORDER BY d.created_at DESC`,
        [pipelineId]
      );
    }
    return this.conn.all<Deployment>(
      `SELECT d.*, p.name as pipeline_name 
       FROM deployments d 
       JOIN pipelines p ON d.pipeline_id = p.id 
       ORDER BY d.created_at DESC`
    );
  }

  async create(data: {
    pipeline_id: string;
    workflow_run_id?: string | null;
    environment: Deployment['environment'];
    deployment_target: string;
    deployment_url?: string | null;
    revision?: string | null;
    status: Deployment['status'];
    health_check_status?: Deployment['health_check_status'];
    started_at?: string | null;
    completed_at?: string | null;
  }): Promise<Deployment> {
    const id = 'dep_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    await this.conn.run(
      `INSERT INTO deployments (
        id, pipeline_id, workflow_run_id, environment, deployment_target, deployment_url,
        revision, status, health_check_status, started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.pipeline_id,
        data.workflow_run_id || null,
        data.environment,
        data.deployment_target,
        data.deployment_url || null,
        data.revision || null,
        data.status,
        data.health_check_status || 'unknown',
        data.started_at || null,
        data.completed_at || null,
        now,
      ]
    );

    return (await this.findById(id))!;
  }

  async updateStatus(
    id: string,
    status: Deployment['status'],
    healthCheckStatus?: Deployment['health_check_status'],
    completedAt?: string
  ): Promise<Deployment | undefined> {
    await this.conn.run(
      `UPDATE deployments 
       SET status = ?, health_check_status = COALESCE(?, health_check_status),
           completed_at = COALESCE(?, completed_at)
       WHERE id = ?`,
      [status, healthCheckStatus || null, completedAt || null, id]
    );
    return this.findById(id);
  }
}
