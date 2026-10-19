import { SQLiteConnection } from '../db/connection.js';
import { WebhookEvent } from '../types/domain.js';
import crypto from 'crypto';

export class WebhookRepository {
  constructor(private conn: SQLiteConnection) {}

  async findByDeliveryId(deliveryId: string): Promise<WebhookEvent | undefined> {
    return this.conn.get<WebhookEvent>(
      'SELECT * FROM webhook_events WHERE github_delivery_id = ?',
      [deliveryId]
    );
  }

  async list(limit = 50): Promise<WebhookEvent[]> {
    return this.conn.all<WebhookEvent>(
      'SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT ?',
      [limit]
    );
  }

  /**
   * Attempts to register a webhook event. Returns null if deliveryId was already recorded (duplicate event).
   */
  async registerEvent(data: {
    github_delivery_id: string;
    event_type: string;
    processing_status: WebhookEvent['processing_status'];
  }): Promise<WebhookEvent | null> {
    const existing = await this.findByDeliveryId(data.github_delivery_id);
    if (existing) {
      return null; // Duplicate prevented
    }

    const id = 'wh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const now = new Date().toISOString();

    try {
      await this.conn.run(
        `INSERT INTO webhook_events (id, github_delivery_id, event_type, processing_status, received_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, data.github_delivery_id, data.event_type, data.processing_status, now]
      );
      return (await this.conn.get<WebhookEvent>('SELECT * FROM webhook_events WHERE id = ?', [id]))!;
    } catch (err: any) {
      // If unique constraint triggers concurrently
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return null;
      }
      throw err;
    }
  }

  async markProcessed(
    id: string,
    status: WebhookEvent['processing_status'] = 'processed'
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.conn.run(
      'UPDATE webhook_events SET processing_status = ?, processed_at = ? WHERE id = ?',
      [status, now, id]
    );
  }
}
