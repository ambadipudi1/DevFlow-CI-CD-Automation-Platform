import { SQLiteConnection } from '../db/connection.js';
import { Pipeline } from '../types/domain.js';
import crypto from 'crypto';

export class PipelineRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<Pipeline | undefined> {
    return this.conn.get<Pipeline>(
      `SELECT p.*, r.full_name as repository_full_name 
       FROM pipelines p 
       JOIN repositories r ON p.repository_id = r.id 
       WHERE p.id = ?`,
      [id]
    );
  }

  async listByRepositoryId(repositoryId: string): Promise<Pipeline[]> {
    return this.conn.all<Pipeline>(
      `SELECT p.*, r.full_name as repository_full_name 
       FROM pipelines p 
       JOIN repositories r ON p.repository_id = r.id 
       WHERE p.repository_id = ? 
       ORDER BY p.name ASC`,
      [repositoryId]
    );
  }

  async list(): Promise<Pipeline[]> {
    return this.conn.all<Pipeline>(
      `SELECT p.*, r.full_name as repository_full_name 
       FROM pipelines p 
       JOIN repositories r ON p.repository_id = r.id 
       ORDER BY p.created_at DESC`
    );
  }

  async create(data: {
    name: string;
    repository_id: string;
    branch?: string;
    runtime: Pipeline['runtime'];
    test_command?: string | null;
    build_command?: string | null;
    docker_enabled?: boolean;
    deployment_enabled?: boolean;
    deployment_target?: string | null;
  }): Promise<Pipeline> {
    const id = 'pip_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    await this.conn.run(
      `INSERT INTO pipelines (
        id, name, repository_id, branch, runtime, test_command, build_command,
        docker_enabled, deployment_enabled, deployment_target, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.repository_id,
        data.branch || 'main',
        data.runtime,
        data.test_command || null,
        data.build_command || null,
        data.docker_enabled ? 1 : 0,
        data.deployment_enabled ? 1 : 0,
        data.deployment_target || null,
        now,
        now,
      ]
    );

    return (await this.findById(id))!;
  }

  async update(
    id: string,
    data: Partial<Omit<Pipeline, 'id' | 'created_at' | 'updated_at' | 'repository_full_name'>>
  ): Promise<Pipeline | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const name = data.name !== undefined ? data.name : existing.name;
    const branch = data.branch !== undefined ? data.branch : existing.branch;
    const runtime = data.runtime !== undefined ? data.runtime : existing.runtime;
    const test_command = data.test_command !== undefined ? data.test_command : existing.test_command;
    const build_command = data.build_command !== undefined ? data.build_command : existing.build_command;
    const docker_enabled = data.docker_enabled !== undefined ? (data.docker_enabled ? 1 : 0) : existing.docker_enabled;
    const deployment_enabled = data.deployment_enabled !== undefined ? (data.deployment_enabled ? 1 : 0) : existing.deployment_enabled;
    const deployment_target = data.deployment_target !== undefined ? data.deployment_target : existing.deployment_target;

    await this.conn.run(
      `UPDATE pipelines 
       SET name = ?, branch = ?, runtime = ?, test_command = ?, build_command = ?,
           docker_enabled = ?, deployment_enabled = ?, deployment_target = ?, updated_at = ?
       WHERE id = ?`,
      [
        name,
        branch,
        runtime,
        test_command,
        build_command,
        docker_enabled,
        deployment_enabled,
        deployment_target,
        now,
        id,
      ]
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    // Check if there are dependent workflow runs
    const runsCount = await this.conn.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM workflow_runs WHERE pipeline_id = ?',
      [id]
    );

    if (runsCount && runsCount.count > 0) {
      return {
        success: false,
        error: `Cannot delete pipeline because it has ${runsCount.count} recorded workflow run(s). To protect audit history, pipelines with runs cannot be removed.`,
      };
    }

    const res = await this.conn.run('DELETE FROM pipelines WHERE id = ?', [id]);
    return { success: res.changes > 0 };
  }
}
