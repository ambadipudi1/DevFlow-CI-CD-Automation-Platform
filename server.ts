import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDatabase } from './src/server/db/connection.js';
import { runMigrations } from './src/server/db/migrations.js';
import { createApiRouter } from './src/server/api/router.js';
import { DemoService } from './src/server/services/demoService.js';
import { RepositoryRepository } from './src/server/repositories/repositoryRepo.js';
import { PipelineRepository } from './src/server/repositories/pipelineRepo.js';
import { WorkflowRunRepository } from './src/server/repositories/workflowRunRepo.js';
import { DiagnosisRepository } from './src/server/repositories/diagnosisRepo.js';
import { DeploymentRepository } from './src/server/repositories/deploymentRepo.js';
import { DockerRepository } from './src/server/repositories/dockerRepo.js';
import { AuditLogRepository } from './src/server/repositories/auditRepo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize SQLite database & migrations
  const db = getDatabase();
  console.log(`[DevFlow] Connecting to SQLite database at: ${db.getPath()}`);
  await db.connect();

  const migrationResult = await runMigrations(db);
  console.log(`[DevFlow] Migrations applied: ${migrationResult.applied.length > 0 ? migrationResult.applied.join(', ') : 'None (up to date)'}`);

  // Seed demo data if database is empty so user has an immediately functional platform
  const repoRepo = new RepositoryRepository(db);
  const existingRepos = await repoRepo.list();
  if (existingRepos.length === 0) {
    console.log('[DevFlow] Initializing baseline demonstration workspace...');
    const demoService = new DemoService(
      db,
      repoRepo,
      new PipelineRepository(db),
      new WorkflowRunRepository(db),
      new DiagnosisRepository(db),
      new DeploymentRepository(db),
      new DockerRepository(db),
      new AuditLogRepository(db)
    );
    await demoService.seedDemoEnvironment();
  }

  // Mount API router
  app.use('/api', createApiRouter(db));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'devflow-platform',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  });

  if (!isProduction) {
    // Development mode: Mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[DevFlow] Vite middleware mounted for development.');
  } else {
    // Production mode: Serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[DevFlow] CI/CD Automation Platform listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[DevFlow] Fatal server startup error:', err);
  process.exit(1);
});
