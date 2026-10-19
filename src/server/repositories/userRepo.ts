import { SQLiteConnection } from '../db/connection.js';
import { User } from '../types/domain.js';
import crypto from 'crypto';

export class UserRepository {
  constructor(private conn: SQLiteConnection) {}

  async findById(id: string): Promise<User | undefined> {
    return this.conn.get<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findByGithubId(githubUserId: number): Promise<User | undefined> {
    return this.conn.get<User>('SELECT * FROM users WHERE github_user_id = ?', [githubUserId]);
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.conn.get<User>('SELECT * FROM users WHERE username = ?', [username]);
  }

  async upsert(data: {
    github_user_id?: number | null;
    username: string;
    email?: string | null;
    avatar_url?: string | null;
  }): Promise<User> {
    const now = new Date().toISOString();
    let existing: User | undefined;

    if (data.github_user_id) {
      existing = await this.findByGithubId(data.github_user_id);
    }
    if (!existing) {
      existing = await this.findByUsername(data.username);
    }

    if (existing) {
      await this.conn.run(
        `UPDATE users 
         SET username = ?, email = COALESCE(?, email), avatar_url = COALESCE(?, avatar_url), updated_at = ?
         WHERE id = ?`,
        [data.username, data.email || null, data.avatar_url || null, now, existing.id]
      );
      return (await this.findById(existing.id))!;
    } else {
      const id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await this.conn.run(
        `INSERT INTO users (id, github_user_id, username, email, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.github_user_id || null, data.username, data.email || null, data.avatar_url || null, now, now]
      );
      return (await this.findById(id))!;
    }
  }

  async list(): Promise<User[]> {
    return this.conn.all<User>('SELECT * FROM users ORDER BY created_at DESC');
  }
}
