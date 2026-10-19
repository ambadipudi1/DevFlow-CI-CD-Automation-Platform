import { SQLiteConnection } from './connection.js';

export interface Migration {
  name: string;
  up: (conn: SQLiteConnection) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    up: async (conn: SQLiteConnection) => {
      // 1. users
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          github_user_id INTEGER UNIQUE,
          username TEXT NOT NULL,
          email TEXT,
          avatar_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. repositories
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS repositories (
          id TEXT PRIMARY KEY,
          owner TEXT NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT NOT NULL UNIQUE,
          github_repository_id INTEGER UNIQUE,
          default_branch TEXT NOT NULL DEFAULT 'main',
          html_url TEXT,
          primary_language TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);
        CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner);
      `);

      // 3. pipelines
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS pipelines (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
          branch TEXT NOT NULL DEFAULT 'main',
          runtime TEXT NOT NULL,
          test_command TEXT,
          build_command TEXT,
          docker_enabled INTEGER NOT NULL DEFAULT 0,
          deployment_enabled INTEGER NOT NULL DEFAULT 0,
          deployment_target TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pipelines_repository_id ON pipelines(repository_id);
      `);

      // 4. workflow_runs (Foreign key to pipelines uses ON DELETE RESTRICT to avoid accidental cascading deletion of history)
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS workflow_runs (
          id TEXT PRIMARY KEY,
          pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
          repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE RESTRICT,
          github_run_id INTEGER UNIQUE,
          workflow_name TEXT NOT NULL,
          branch TEXT NOT NULL,
          commit_sha TEXT NOT NULL,
          status TEXT NOT NULL,
          conclusion TEXT,
          run_url TEXT,
          started_at TEXT,
          completed_at TEXT,
          duration_seconds INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_pipeline_id ON workflow_runs(pipeline_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_repository_id ON workflow_runs(repository_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_conclusion ON workflow_runs(conclusion);
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at);
      `);

      // 5. failure_diagnoses
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS failure_diagnoses (
          id TEXT PRIMARY KEY,
          workflow_run_id TEXT NOT NULL UNIQUE REFERENCES workflow_runs(id) ON DELETE CASCADE,
          failure_category TEXT NOT NULL,
          error_summary TEXT NOT NULL,
          sanitized_log_excerpt TEXT NOT NULL,
          evidence_json TEXT NOT NULL,
          likely_causes_json TEXT NOT NULL,
          recommended_actions_json TEXT NOT NULL,
          proposed_fixes_json TEXT,
          confidence REAL NOT NULL,
          ai_assisted INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_failure_diagnoses_workflow_run_id ON failure_diagnoses(workflow_run_id);
        CREATE INDEX IF NOT EXISTS idx_failure_diagnoses_category ON failure_diagnoses(failure_category);
      `);

      // 6. deployments
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS deployments (
          id TEXT PRIMARY KEY,
          pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE RESTRICT,
          workflow_run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
          environment TEXT NOT NULL,
          deployment_target TEXT NOT NULL,
          deployment_url TEXT,
          revision TEXT,
          status TEXT NOT NULL,
          health_check_status TEXT NOT NULL DEFAULT 'unknown',
          started_at TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_deployments_pipeline_id ON deployments(pipeline_id);
        CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
        CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at);
      `);

      // 7. docker_builds
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS docker_builds (
          id TEXT PRIMARY KEY,
          workflow_run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
          image_name TEXT NOT NULL,
          image_tag TEXT NOT NULL,
          image_digest TEXT,
          registry_url TEXT,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_docker_builds_workflow_run_id ON docker_builds(workflow_run_id);
      `);

      // 8. webhook_events
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS webhook_events (
          id TEXT PRIMARY KEY,
          github_delivery_id TEXT NOT NULL UNIQUE,
          event_type TEXT NOT NULL,
          processing_status TEXT NOT NULL,
          received_at TEXT NOT NULL,
          processed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(github_delivery_id);
        CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processing_status);
      `);

      // 9. audit_logs
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT,
          result TEXT NOT NULL,
          metadata_json TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      `);
    },
  },
  {
    name: '002_add_raw_logs_storage',
    up: async (conn: SQLiteConnection) => {
      // Create separate table for full sanitized logs to keep workflow_runs lightweight
      await conn.exec(`
        CREATE TABLE IF NOT EXISTS workflow_logs (
          workflow_run_id TEXT PRIMARY KEY REFERENCES workflow_runs(id) ON DELETE CASCADE,
          raw_log TEXT NOT NULL,
          sanitized_log TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    },
  },
];

export async function runMigrations(conn: SQLiteConnection): Promise<{ applied: string[]; skipped: string[] }> {
  await conn.connect();

  // Create migration tracking table if not exists
  await conn.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await conn.all<{ name: string }>('SELECT name FROM _migrations ORDER BY id ASC');
  const appliedSet = new Set(appliedRows.map((r) => r.name));

  const newlyApplied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (appliedSet.has(migration.name)) {
      skipped.push(migration.name);
      continue;
    }

    // Execute migration inside a transaction
    await conn.transaction(async (tx) => {
      await migration.up(tx);
      await tx.run(
        'INSERT INTO _migrations (name, applied_at) VALUES (?, ?)',
        [migration.name, new Date().toISOString()]
      );
    });

    newlyApplied.push(migration.name);
  }

  return { applied: newlyApplied, skipped };
}
