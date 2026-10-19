import { SQLiteConnection } from '../db/connection.js';
import { RepositoryRepository } from '../repositories/repositoryRepo.js';
import { PipelineRepository } from '../repositories/pipelineRepo.js';
import { WorkflowRunRepository } from '../repositories/workflowRunRepo.js';
import { DiagnosisRepository } from '../repositories/diagnosisRepo.js';
import { DeploymentRepository } from '../repositories/deploymentRepo.js';
import { DockerRepository } from '../repositories/dockerRepo.js';
import { AuditLogRepository } from '../repositories/auditRepo.js';
import { diagnoseWorkflowFailure } from './ruleDiagnostics.js';

export class DemoService {
  constructor(
    private conn: SQLiteConnection,
    private repoRepo: RepositoryRepository,
    private pipeRepo: PipelineRepository,
    private runRepo: WorkflowRunRepository,
    private diagRepo: DiagnosisRepository,
    private depRepo: DeploymentRepository,
    private dockRepo: DockerRepository,
    private auditRepo: AuditLogRepository
  ) {}

  public async isDemoSeeded(): Promise<boolean> {
    const row = await this.conn.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM repositories WHERE full_name LIKE '[DEMO]%'"
    );
    return (row?.count || 0) > 0;
  }

  public async seedDemoEnvironment(): Promise<{ message: string; seeded: boolean }> {
    if (await this.isDemoSeeded()) {
      return { message: 'Demo environment is already seeded.', seeded: false };
    }

    // 1. Create Demo Repository
    const demoRepo = await this.repoRepo.upsert({
      owner: 'devflow-demo',
      name: 'ecommerce-api',
      full_name: '[DEMO] devflow-demo/ecommerce-api',
      default_branch: 'main',
      html_url: 'https://github.com/example/ecommerce-api',
      primary_language: 'TypeScript',
    });

    const demoFrontend = await this.repoRepo.upsert({
      owner: 'devflow-demo',
      name: 'customer-portal',
      full_name: '[DEMO] devflow-demo/customer-portal',
      default_branch: 'main',
      html_url: 'https://github.com/example/customer-portal',
      primary_language: 'React & Vite',
    });

    // 2. Create Demo Pipelines
    const apiPipeline = await this.pipeRepo.create({
      name: '[DEMO] Backend Microservice CI/CD',
      repository_id: demoRepo.id,
      branch: 'main',
      runtime: 'nodejs',
      test_command: 'npm run test:ci',
      build_command: 'npm run build',
      docker_enabled: true,
      deployment_enabled: true,
      deployment_target: 'api.demo.devflow.internal',
    });

    const frontendPipeline = await this.pipeRepo.create({
      name: '[DEMO] Frontend Web App CI',
      repository_id: demoFrontend.id,
      branch: 'main',
      runtime: 'react-vite',
      test_command: 'npm test -- --run',
      build_command: 'npm run build',
      docker_enabled: true,
      deployment_enabled: false,
    });

    // 3. Create Sample Successful Run
    const successRun = await this.runRepo.create({
      id: 'run_demo_success_01',
      pipeline_id: apiPipeline.id,
      repository_id: demoRepo.id,
      github_run_id: 99101,
      workflow_name: 'Production Release Pipeline',
      branch: 'main',
      commit_sha: 'e4a1b89',
      status: 'completed',
      conclusion: 'success',
      run_url: 'https://github.com/example/ecommerce-api/actions/runs/99101',
      started_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 4 + 74000).toISOString(),
      duration_seconds: 74,
    });

    const successLog = `[DEVFLOW CI RUNNER v2.4.0] Initializing environment...
Step 1: Check out repository
Fetching origin main at commit e4a1b89... OK (0.8s)
Step 2: Set up Node.js 20.x
Node version v20.18.0 detected with npm v10.8.2.
Step 3: Install dependencies
npm ci
added 482 packages in 12s
Step 4: Lint & Code Style
npm run lint
> tsc --noEmit
All 68 source files verified. Zero type errors.
Step 5: Run Automated Tests
npm run test:ci
PASS src/services/order.test.ts (1.2s)
PASS src/controllers/auth.test.ts (0.9s)
Test Suites: 2 passed, 2 total
Tests: 18 passed, 18 total
Snapshots: 0 total
Time: 3.41s
Step 6: Build Application
npm run build
dist/server.js built successfully.
Step 7: Build Docker image
docker build -t devflow-demo/ecommerce-api:e4a1b89 .
Successfully tagged devflow-demo/ecommerce-api:e4a1b89
Step 8: Deploy application
Deploying revision e4a1b89 to api.demo.devflow.internal
Container started on port 3000.
Step 9: Health Check
GET http://api.demo.devflow.internal/health -> 200 OK (latency: 18ms)
Workflow finished with conclusion: success.`;

    await this.runRepo.setLogs(successRun.id, successLog, successLog);

    await this.depRepo.create({
      pipeline_id: apiPipeline.id,
      workflow_run_id: successRun.id,
      environment: 'production',
      deployment_target: 'api.demo.devflow.internal',
      deployment_url: 'https://api.demo.devflow.internal',
      revision: 'e4a1b89',
      status: 'deployed',
      health_check_status: 'healthy',
      started_at: successRun.started_at,
      completed_at: successRun.completed_at,
    });

    await this.dockRepo.create({
      workflow_run_id: successRun.id,
      image_name: 'devflow-demo/ecommerce-api',
      image_tag: 'e4a1b89',
      image_digest: 'sha256:7b2fa189c4501ba12a87c1f80d72023d',
      registry_url: 'ghcr.io/devflow-demo/ecommerce-api',
      status: 'pushed',
    });

    // 4. Create Sample Failing Run (with realistic Missing Dependency error for diagnosis testing)
    const failRun1 = await this.runRepo.create({
      id: 'run_demo_fail_dep',
      pipeline_id: apiPipeline.id,
      repository_id: demoRepo.id,
      github_run_id: 99102,
      workflow_name: 'Pull Request Verification',
      branch: 'feat/stripe-checkout',
      commit_sha: 'c7d901a',
      status: 'completed',
      conclusion: 'failure',
      run_url: 'https://github.com/example/ecommerce-api/actions/runs/99102',
      started_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 2 + 42000).toISOString(),
      duration_seconds: 42,
    });

    const failingLog1 = `[DEVFLOW CI RUNNER v2.4.0]
Step 1: Check out repository
Checked out commit c7d901a on branch feat/stripe-checkout.
Step 2: Set up Node.js 20.x
Environment ready.
Step 3: Install dependencies
npm ci
npm WARN deprecated package-name
Step 4: Automated Tests
npm test
> vitest run
FAIL src/payments/stripe.test.ts
Error: Cannot find module 'stripe'
Require stack:
- /home/runner/work/ecommerce-api/src/payments/stripeService.ts
- /home/runner/work/ecommerce-api/src/payments/stripe.test.ts
    at Module._resolveFilename (node:internal/modules/cjs/loader:1145:15)
    at Function.resolve (node:internal/modules/cjs/helpers:190:19)
    at Object.<anonymous> (/home/runner/work/ecommerce-api/src/payments/stripeService.ts:4:1)

Test Suites: 1 failed, 1 total
Tests: 0 passed, 1 failed
npm ERR! Lifecycle script failed with exit code 1.
Error: Process completed with exit code 1.`;

    await this.runRepo.setLogs(failRun1.id, failingLog1, failingLog1);

    // Run deterministic diagnosis
    const diagnosis1 = diagnoseWorkflowFailure(failingLog1);
    await this.diagRepo.upsert({
      workflow_run_id: failRun1.id,
      failure_category: diagnosis1.failure_category,
      error_summary: diagnosis1.error_summary,
      sanitized_log_excerpt: diagnosis1.sanitized_log_excerpt,
      evidence: diagnosis1.evidence,
      likely_causes: diagnosis1.likely_causes,
      recommended_actions: diagnosis1.recommended_actions,
      proposed_fixes: diagnosis1.proposed_fixes,
      confidence: diagnosis1.confidence,
      ai_assisted: false,
    });

    // 5. Create Failing Run with TypeScript error
    const failRun2 = await this.runRepo.create({
      id: 'run_demo_fail_ts',
      pipeline_id: frontendPipeline.id,
      repository_id: demoFrontend.id,
      github_run_id: 99103,
      workflow_name: 'Frontend CI Validation',
      branch: 'fix/navbar-theme',
      commit_sha: 'a1299df',
      status: 'completed',
      conclusion: 'failure',
      run_url: 'https://github.com/example/customer-portal/actions/runs/99103',
      started_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      completed_at: new Date(Date.now() - 3600000 * 1 + 28000).toISOString(),
      duration_seconds: 28,
    });

    const failingLog2 = `[DEVFLOW CI RUNNER v2.4.0]
Step 1: Check out repository
Checked out commit a1299df on branch fix/navbar-theme.
Step 2: Set up Node.js 20.x
Step 3: Install dependencies
npm ci
Step 4: Typecheck
npm run lint
> tsc --noEmit
src/components/Navbar.tsx:42:15 - error TS2339: Property 'userProfile' does not exist on type 'UserSession'. Did you mean 'profile'?
  42 |   const { userProfile } = session;
     |           ~~~~~~~~~~~
src/components/Navbar.tsx:88:21 - error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
  88 |     avatarUrl={session.avatarUrl}
     |     ~~~~~~~~~
Found 2 errors in src/components/Navbar.tsx.
npm ERR! code 2`;

    await this.runRepo.setLogs(failRun2.id, failingLog2, failingLog2);

    const diagnosis2 = diagnoseWorkflowFailure(failingLog2);
    await this.diagRepo.upsert({
      workflow_run_id: failRun2.id,
      failure_category: diagnosis2.failure_category,
      error_summary: diagnosis2.error_summary,
      sanitized_log_excerpt: diagnosis2.sanitized_log_excerpt,
      evidence: diagnosis2.evidence,
      likely_causes: diagnosis2.likely_causes,
      recommended_actions: diagnosis2.recommended_actions,
      proposed_fixes: diagnosis2.proposed_fixes,
      confidence: diagnosis2.confidence,
      ai_assisted: false,
    });

    // 6. Audit log
    await this.auditRepo.log({
      action: 'DEMO_ENVIRONMENT_SEEDED',
      resource_type: 'environment',
      resource_id: 'demo-system',
      result: 'success',
      metadata: { reason: 'Initial onboarding demo workspace setup' },
    });

    return { message: 'Demo environment successfully seeded with isolated test records.', seeded: true };
  }

  public async purgeDemoData(): Promise<{ message: string; deletedRuns: number }> {
    // Delete failure diagnoses of demo runs
    await this.conn.run(`
      DELETE FROM failure_diagnoses 
      WHERE workflow_run_id IN (
        SELECT id FROM workflow_runs WHERE pipeline_id IN (
          SELECT id FROM pipelines WHERE name LIKE '[DEMO]%'
        )
      )
    `);

    // Delete deployments of demo pipelines
    await this.conn.run(`
      DELETE FROM deployments 
      WHERE pipeline_id IN (
        SELECT id FROM pipelines WHERE name LIKE '[DEMO]%'
      )
    `);

    // Delete docker builds
    await this.conn.run(`
      DELETE FROM docker_builds 
      WHERE workflow_run_id IN (
        SELECT id FROM workflow_runs WHERE pipeline_id IN (
          SELECT id FROM pipelines WHERE name LIKE '[DEMO]%'
        )
      )
    `);

    // Delete logs
    await this.conn.run(`
      DELETE FROM workflow_logs 
      WHERE workflow_run_id IN (
        SELECT id FROM workflow_runs WHERE pipeline_id IN (
          SELECT id FROM pipelines WHERE name LIKE '[DEMO]%'
        )
      )
    `);

    // Delete workflow runs
    const runRes = await this.conn.run(`
      DELETE FROM workflow_runs 
      WHERE pipeline_id IN (
        SELECT id FROM pipelines WHERE name LIKE '[DEMO]%'
      )
    `);

    // Delete demo pipelines
    await this.conn.run("DELETE FROM pipelines WHERE name LIKE '[DEMO]%'");

    // Delete demo repositories
    await this.conn.run("DELETE FROM repositories WHERE full_name LIKE '[DEMO]%'");

    await this.auditRepo.log({
      action: 'DEMO_DATA_PURGED',
      resource_type: 'environment',
      result: 'success',
    });

    return { message: 'Demo records successfully cleaned up.', deletedRuns: runRes.changes };
  }
}
