import { SQLiteConnection } from '../db/connection.js';
import { Repository } from '../types/domain.js';
import crypto from 'crypto';

export class RepositoryRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<Repository | undefined> {
    return this.conn.get<Repository>('SELECT * FROM repositories WHERE id = ?', [id]);
  }

  async findByFullName(fullName: string): Promise<Repository | undefined> {
    return this.conn.get<Repository>('SELECT * FROM repositories WHERE full_name = ?', [fullName]);
  }

  async findByGithubId(githubRepoId: number): Promise<Repository | undefined> {
    return this.conn.get<Repository>('SELECT * FROM repositories WHERE github_repository_id = ?', [githubRepoId]);
  }

  async list(): Promise<Repository[]> {
    return this.conn.all<Repository>('SELECT * FROM repositories ORDER BY full_name ASC');
  }

  async upsert(data: {
    owner: string;
    name: string;
    full_name: string;
    github_repository_id?: number | null;
    default_branch?: string;
    html_url?: string | null;
    primary_language?: string | null;
  }): Promise<Repository> {
    const now = new Date().toISOString();
    const existing = await this.findByFullName(data.full_name);

    if (existing) {
      await this.conn.run(
        `UPDATE repositories 
         SET owner = ?, name = ?, github_repository_id = COALESCE(?, github_repository_id),
             default_branch = COALESCE(?, default_branch), html_url = COALESCE(?, html_url),
             primary_language = COALESCE(?, primary_language), updated_at = ?
         WHERE id = ?`,
        [
          data.owner,
          data.name,
          data.github_repository_id || null,
          data.default_branch || 'main',
          data.html_url || null,
          data.primary_language || null,
          now,
          existing.id,
        ]
      );
      return (await this.findById(existing.id))!;
    } else {
      const id = 'repo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await this.conn.run(
        `INSERT INTO repositories (
          id, owner, name, full_name, github_repository_id, default_branch, html_url, primary_language, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.owner,
          data.name,
          data.full_name,
          data.github_repository_id || null,
          data.default_branch || 'main',
          data.html_url || null,
          data.primary_language || null,
          now,
          now,
        ]
      );
      return (await this.findById(id))!;
    }
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.conn.run('DELETE FROM repositories WHERE id = ?', [id]);
    return res.changes > 0;
  }
}
