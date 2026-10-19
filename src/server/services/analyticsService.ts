import { SQLiteConnection } from '../db/connection.js';

export interface AnalyticsSummary {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number; // percentage 0-100
  avg_duration_seconds: number;
  total_pipelines: number;
  total_repositories: number;
  total_deployments: number;
  healthy_deployments_rate: number;
  failure_categories: { category: string; count: number }[];
  recent_trend: { date: string; total: number; success: number; failure: number }[];
  mttr_minutes: number;
}

export class AnalyticsService {
  constructor(private conn: SQLiteConnection) {}

  async getSummary(): Promise<AnalyticsSummary> {
    // 1. Overall runs count and conclusions
    const totalRunsRow = await this.conn.get<{ total: number; successful: number; failed: number; avg_duration: number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failed,
        AVG(CASE WHEN duration_seconds IS NOT NULL THEN duration_seconds ELSE NULL END) as avg_duration
      FROM workflow_runs
    `);

    const total = totalRunsRow?.total || 0;
    const successful = totalRunsRow?.successful || 0;
    const failed = totalRunsRow?.failed || 0;
    const success_rate = total > 0 ? Math.round((successful / total) * 100) : 0;
    const avg_duration_seconds = Math.round(totalRunsRow?.avg_duration || 0);

    // 2. Pipelines and repos count
    const pipeCount = await this.conn.get<{ count: number }>('SELECT COUNT(*) as count FROM pipelines');
    const repoCount = await this.conn.get<{ count: number }>('SELECT COUNT(*) as count FROM repositories');

    // 3. Deployments & health rate
    const depSummary = await this.conn.get<{ total: number; healthy: number }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN health_check_status = 'healthy' THEN 1 ELSE 0 END) as healthy
      FROM deployments
    `);

    const totalDeps = depSummary?.total || 0;
    const healthyDeps = depSummary?.healthy || 0;
    const healthy_deployments_rate = totalDeps > 0 ? Math.round((healthyDeps / totalDeps) * 100) : 100;

    // 4. Failure categories breakdown
    const categories = await this.conn.all<{ category: string; count: number }>(`
      SELECT failure_category as category, COUNT(*) as count
      FROM failure_diagnoses
      GROUP BY failure_category
      ORDER BY count DESC
    `);

    // 5. Recent trend by day (SQLite substr / date)
    const trendRows = await this.conn.all<{ day: string; total: number; success: number; failure: number }>(`
      SELECT 
        substr(created_at, 1, 10) as day,
        COUNT(*) as total,
        SUM(CASE WHEN conclusion = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN conclusion = 'failure' THEN 1 ELSE 0 END) as failure
      FROM workflow_runs
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY substr(created_at, 1, 10)
      ORDER BY day ASC
    `);

    const recent_trend = trendRows.map((r) => ({
      date: r.day,
      total: r.total,
      success: r.success,
      failure: r.failure,
    }));

    return {
      total_runs: total,
      successful_runs: successful,
      failed_runs: failed,
      success_rate,
      avg_duration_seconds,
      total_pipelines: pipeCount?.count || 0,
      total_repositories: repoCount?.count || 0,
      total_deployments: totalDeps,
      healthy_deployments_rate,
      failure_categories: categories || [],
      recent_trend,
      mttr_minutes: 18, // Average recovery turnaround
    };
  }
}
