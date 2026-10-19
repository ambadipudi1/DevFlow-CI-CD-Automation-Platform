import { SQLiteConnection } from '../db/connection.js';
import { DockerBuild } from '../types/domain.js';
import crypto from 'crypto';

export class DockerRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<DockerBuild | undefined> {
    return this.conn.get<DockerBuild>(
      `SELECT db.*, wr.workflow_name 
       FROM docker_builds db 
       JOIN workflow_runs wr ON db.workflow_run_id = wr.id 
       WHERE db.id = ?`,
      [id]
    );
  }

  async list(workflowRunId?: string): Promise<DockerBuild[]> {
    if (workflowRunId) {
      return this.conn.all<DockerBuild>(
        `SELECT db.*, wr.workflow_name 
         FROM docker_builds db 
         JOIN workflow_runs wr ON db.workflow_run_id = wr.id 
         WHERE db.workflow_run_id = ? 
         ORDER BY db.created_at DESC`,
        [workflowRunId]
      );
    }
    return this.conn.all<DockerBuild>(
      `SELECT db.*, wr.workflow_name 
       FROM docker_builds db 
       JOIN workflow_runs wr ON db.workflow_run_id = wr.id 
       ORDER BY db.created_at DESC`
    );
  }

  async create(data: {
    workflow_run_id: string;
    image_name: string;
    image_tag: string;
    image_digest?: string | null;
    registry_url?: string | null;
    status: DockerBuild['status'];
  }): Promise<DockerBuild> {
    const id = 'dock_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    await this.conn.run(
      `INSERT INTO docker_builds (
        id, workflow_run_id, image_name, image_tag, image_digest, registry_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.workflow_run_id,
        data.image_name,
        data.image_tag,
        data.image_digest || null,
        data.registry_url || null,
        data.status,
        now,
      ]
    );

    return (await this.findById(id))!;
  }

  async updateStatus(
    id: string,
    status: DockerBuild['status'],
    imageDigest?: string | null
  ): Promise<DockerBuild | undefined> {
    await this.conn.run(
      `UPDATE docker_builds 
       SET status = ?, image_digest = COALESCE(?, image_digest) 
       WHERE id = ?`,
      [status, imageDigest || null, id]
    );
    return this.findById(id);
  }
}
