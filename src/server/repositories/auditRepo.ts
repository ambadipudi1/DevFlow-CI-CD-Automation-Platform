import { SQLiteConnection } from '../db/connection.js';
import { AuditLog } from '../types/domain.js';
import crypto from 'crypto';

export class AuditLogRepository {
  constructor(private conn: SQLiteConnection) {}

  private sanitizeMetadata(metadata?: any): string | null {
    if (!metadata) return null;
    try {
      const cloned = JSON.parse(JSON.stringify(metadata));
      const redact = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
          const lower = key.toLowerCase();
          if (
            lower.includes('token') ||
            lower.includes('secret') ||
            lower.includes('password') ||
            lower.includes('auth') ||
            lower.includes('key')
          ) {
            obj[key] = '[REDACTED_SECRET]';
          } else if (typeof obj[key] === 'object') {
            redact(obj[key]);
          }
        }
      };
      redact(cloned);
      return JSON.stringify(cloned);
    } catch {
      return null;
    }
  }

  async log(data: {
    user_id?: string | null;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    result: AuditLog['result'];
    metadata?: any;
  }): Promise<AuditLog> {
    const id = 'aud_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();
    const metadataJson = this.sanitizeMetadata(data.metadata);

    await this.conn.run(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, result, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.user_id || 'system',
        data.action,
        data.resource_type,
        data.resource_id || null,
        data.result,
        metadataJson,
        now,
      ]
    );

    return (await this.conn.get<AuditLog>('SELECT * FROM audit_logs WHERE id = ?', [id]))!;
  }

  async list(limit = 100): Promise<AuditLog[]> {
    return this.conn.all<AuditLog>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  }
}
