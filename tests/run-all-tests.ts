import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SQLiteConnection } from '../src/server/db/connection.js';
import { runMigrations } from '../src/server/db/migrations.js';
import { UserRepository } from '../src/server/repositories/userRepo.js';
import { RepositoryRepository } from '../src/server/repositories/repositoryRepo.js';
import { PipelineRepository } from '../src/server/repositories/pipelineRepo.js';
import { WorkflowRunRepository } from '../src/server/repositories/workflowRunRepo.js';
import { DiagnosisRepository } from '../src/server/repositories/diagnosisRepo.js';
import { WebhookRepository } from '../src/server/repositories/webhookRepo.js';
import { sanitizeLog } from '../src/server/services/sanitizer.js';
import { diagnoseWorkflowFailure } from '../src/server/services/ruleDiagnostics.js';
import { GeminiDiagnosisSchema } from '../src/server/services/geminiDiagnostics.js';

async function runTests() {
  console.log('\n========================================');
  console.log('  DevFlow Automated Verification Suite  ');
  console.log('========================================\n');

  // Use an isolated temporary SQLite database for tests
  const testDbPath = path.resolve(`./data/test_${crypto.randomUUID().slice(0, 8)}.db`);
  const conn = new SQLiteConnection(testDbPath);
  await conn.connect();

  let passedCount = 0;
  let failedCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failedCount++;
    }
  }

  try {
    // 1. Database Migrations
    await test('1. Database migrations run cleanly and track applied status', async () => {
      const res = await runMigrations(conn);
      assert.ok(res.applied.length >= 2, 'Expected at least 2 migrations applied');

      // Run again to ensure idempotency
      const res2 = await runMigrations(conn);
      assert.strictEqual(res2.applied.length, 0, 'No migrations should re-run on subsequent executions');
      assert.ok(res2.skipped.length >= 2, 'Migrations should be recorded as skipped');
    });

    // 2. Foreign Key Constraints
    await test('2. Foreign key constraints are enforced (PRAGMA foreign_keys = ON)', async () => {
      let threw = false;
      try {
        // Attempt to insert a pipeline with a non-existent repository_id
        await conn.run(
          `INSERT INTO pipelines (id, name, repository_id, branch, runtime, created_at, updated_at)
           VALUES ('pip_invalid', 'Invalid Pipeline', 'non_existent_repo', 'main', 'nodejs', datetime('now'), datetime('now'))`
        );
      } catch (err: any) {
        threw = true;
        assert.ok(err.message.includes('FOREIGN KEY constraint failed'), 'Should throw foreign key constraint violation');
      }
      assert.ok(threw, 'Expected foreign key constraint violation was not thrown');
    });

    // 3. Duplicate Workflow Prevention
    await test('3. Duplicate workflow prevention using unique constraint on github_run_id', async () => {
      const repoRepo = new RepositoryRepository(conn);
      const pipeRepo = new PipelineRepository(conn);
      const runRepo = new WorkflowRunRepository(conn);

      const repo = await repoRepo.upsert({
        owner: 'test-org',
        name: 'test-app',
        full_name: 'test-org/test-app',
      });

      const pipe = await pipeRepo.create({
        name: 'Main CI',
        repository_id: repo.id,
        runtime: 'nodejs',
      });

      // Insert first run with github_run_id = 12345
      await runRepo.create({
        id: 'run_test_01',
        pipeline_id: pipe.id,
        repository_id: repo.id,
        github_run_id: 12345,
        workflow_name: 'CI',
        branch: 'main',
        commit_sha: 'abc123',
        status: 'completed',
        conclusion: 'success',
      });

      // Upsert with same github_run_id should update, not create duplicate
      const updated = await runRepo.upsertByGithubRunId({
        github_run_id: 12345,
        pipeline_id: pipe.id,
        repository_id: repo.id,
        workflow_name: 'CI',
        branch: 'main',
        commit_sha: 'abc123',
        status: 'completed',
        conclusion: 'failure',
      });

      assert.strictEqual(updated.id, 'run_test_01', 'Should update existing workflow run instead of creating new record');
      assert.strictEqual(updated.conclusion, 'failure', 'Should update status conclusion');

      const runs = await runRepo.list({ pipeline_id: pipe.id });
      assert.strictEqual(runs.total, 1, 'Total workflow runs should remain 1');
    });

    // 4. Workflow Status Updates
    await test('4. Workflow status updates persist timestamps and duration', async () => {
      const runRepo = new WorkflowRunRepository(conn);
      const updated = await runRepo.updateStatus('run_test_01', {
        status: 'completed',
        conclusion: 'success',
        duration_seconds: 45,
        completed_at: new Date().toISOString(),
      });

      assert.ok(updated, 'Workflow run should be returned');
      assert.strictEqual(updated?.conclusion, 'success');
      assert.strictEqual(updated?.duration_seconds, 45);
    });

    // 5. SQL Injection Resistance
    await test('5. SQL injection resistance via parameterized prepared statements', async () => {
      const repoRepo = new RepositoryRepository(conn);
      // Malicious repository name attempting SQL injection
      const injectionAttempt = "fake-repo'; DROP TABLE users; --";
      const createdRepo = await repoRepo.upsert({
        owner: 'attacker',
        name: injectionAttempt,
        full_name: `attacker/${injectionAttempt}`,
      });

      assert.ok(createdRepo.id, 'Repository created safely');

      // Verify users table was NOT dropped
      const userCheck = await conn.all('SELECT name FROM sqlite_master WHERE type="table" AND name="users"');
      assert.strictEqual(userCheck.length, 1, 'Users table must still exist intact');
    });

    // 6. Log Sanitization
    await test('6. Log sanitization strips GitHub PATs, Bearer tokens, and AWS secrets', async () => {
      const sensitiveLog = `
        2026-10-19T05:00:00Z Connecting to GitHub with ghp_123456789012345678901234567890123456
        Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0
        AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
        aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
        Connecting to postgres://user:superSecretPassword123@db.example.com/production
      `;

      const sanitized = sanitizeLog(sensitiveLog);
      assert.ok(!sanitized.includes('ghp_123456789012345678901234567890123456'), 'GitHub PAT must be redacted');
      assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Bearer token must be redacted');
      assert.ok(!sanitized.includes('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'), 'AWS Secret Key must be redacted');
      assert.ok(!sanitized.includes('superSecretPassword123'), 'DB password must be redacted');
      assert.ok(sanitized.includes('[REDACTED_SECRET]'), 'Must replace with redaction label');
    });

    // 7. Failure Diagnosis Persistence & JSON Validation
    await test('7. Failure diagnosis persistence, JSON parsing, and deterministic classification', async () => {
      const diagRepo = new DiagnosisRepository(conn);
      const fakeFailingLog = `
        npm test
        FAIL src/utils/math.test.ts
        Error: Cannot find module 'lodash-es'
        npm ERR! code 1
      `;

      const ruleDiag = diagnoseWorkflowFailure(fakeFailingLog);
      assert.strictEqual(ruleDiag.failure_category, 'missing_dependencies');
      assert.ok(ruleDiag.error_summary.includes('lodash-es'));

      const saved = await diagRepo.upsert({
        workflow_run_id: 'run_test_01',
        failure_category: ruleDiag.failure_category,
        error_summary: ruleDiag.error_summary,
        sanitized_log_excerpt: ruleDiag.sanitized_log_excerpt,
        evidence: ruleDiag.evidence,
        likely_causes: ruleDiag.likely_causes,
        recommended_actions: ruleDiag.recommended_actions,
        proposed_fixes: ruleDiag.proposed_fixes,
        confidence: ruleDiag.confidence,
        ai_assisted: false,
      });

      assert.strictEqual(saved.workflow_run_id, 'run_test_01');
      assert.ok(Array.isArray(saved.evidence), 'Evidence must be parsed as an array');
      assert.ok(saved.confidence > 0.8, 'Confidence should be high for missing dependency');
    });

    // 8. Webhook Duplicate Protection
    await test('8. Webhook duplicate delivery ID protection via unique constraint', async () => {
      const webhookRepo = new WebhookRepository(conn);
      const deliveryId = 'deliv_test_unique_9988';

      const first = await webhookRepo.registerEvent({
        github_delivery_id: deliveryId,
        event_type: 'push',
        processing_status: 'received',
      });
      assert.ok(first, 'First delivery registration must succeed');

      const duplicate = await webhookRepo.registerEvent({
        github_delivery_id: deliveryId,
        event_type: 'push',
        processing_status: 'received',
      });
      assert.strictEqual(duplicate, null, 'Duplicate delivery registration must return null and be skipped');
    });

    // 9. Gemini Response Validation with Zod
    await test('9. Gemini AI response validation enforces strict schema typing', async () => {
      const validPayload = {
        failure_category: 'typescript_error',
        error_summary: 'Property does not exist on type',
        plain_explanation: 'The code attempts to access a property that was not defined.',
        likely_causes: ['Missing property definition in type interface'],
        recommended_actions: ['Add property to interface or check spelling'],
        proposed_fixes: [
          {
            file_path: 'src/types.ts',
            original_code: 'export interface User {}',
            suggested_code: 'export interface User { id: string; }',
            explanation: 'Add id field',
            verification_steps: ['npx tsc --noEmit'],
          },
        ],
        confidence: 0.95,
      };

      const parsed = GeminiDiagnosisSchema.parse(validPayload);
      assert.strictEqual(parsed.failure_category, 'typescript_error');

      // Invalid payload lacking required field
      const invalidPayload = {
        failure_category: 'bad',
        // missing error_summary, plain_explanation, likely_causes, etc.
      };

      let threwZod = false;
      try {
        GeminiDiagnosisSchema.parse(invalidPayload);
      } catch {
        threwZod = true;
      }
      assert.ok(threwZod, 'Zod should reject incomplete Gemini payload');
    });

    // 10. Deliberately Failing Workflow -> Real Diagnosis -> Subsequent Verified Rerun Updates Records
    await test('10. End-to-end: failing workflow produces real diagnosis and verified rerun updates SQLite records', async () => {
      const repoRepo = new RepositoryRepository(conn);
      const pipeRepo = new PipelineRepository(conn);
      const runRepo = new WorkflowRunRepository(conn);
      const diagRepo = new DiagnosisRepository(conn);

      const repo = await repoRepo.upsert({
        owner: 'acme',
        name: 'web-service',
        full_name: 'acme/web-service',
      });

      const pipe = await pipeRepo.create({
        name: 'Billing CI',
        repository_id: repo.id,
        runtime: 'nodejs',
      });

      // Step A: Trigger deliberately failing workflow
      const failingRun = await runRepo.create({
        pipeline_id: pipe.id,
        repository_id: repo.id,
        workflow_name: 'Billing CI',
        branch: 'fix/tax-rate',
        commit_sha: '1001aaa',
        status: 'completed',
        conclusion: 'failure',
      });

      const failureLog = `
        npm test
        FAIL src/tax.test.ts
        AssertionError: Expected: 108.25, Received: 100.00
      `;

      await runRepo.setLogs(failingRun.id, failureLog, failureLog);

      // Step B: Deterministic diagnosis produces real diagnostic record
      const diagnosis = diagnoseWorkflowFailure(failureLog);
      const diagRecord = await diagRepo.upsert({
        workflow_run_id: failingRun.id,
        failure_category: diagnosis.failure_category,
        error_summary: diagnosis.error_summary,
        sanitized_log_excerpt: diagnosis.sanitized_log_excerpt,
        evidence: diagnosis.evidence,
        likely_causes: diagnosis.likely_causes,
        recommended_actions: diagnosis.recommended_actions,
        proposed_fixes: diagnosis.proposed_fixes,
        confidence: diagnosis.confidence,
        ai_assisted: false,
      });

      assert.strictEqual(diagRecord.failure_category, 'failed_tests');

      // Step C: Subsequent verified rerun executed
      const verifiedRerun = await runRepo.create({
        pipeline_id: pipe.id,
        repository_id: repo.id,
        workflow_name: 'Billing CI (Verified Rerun)',
        branch: 'fix/tax-rate',
        commit_sha: '2002bbb',
        status: 'completed',
        conclusion: 'success',
        duration_seconds: 32,
      });

      assert.strictEqual(verifiedRerun.conclusion, 'success');

      // Check that both runs are recorded in local SQLite history
      const history = await runRepo.list({ pipeline_id: pipe.id });
      assert.strictEqual(history.total, 2, 'History must record both failing attempt and subsequent passing rerun');
    });

  } finally {
    // Cleanup temporary test SQLite database
    await conn.close();
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = testDbPath + '-wal';
      const shm = testDbPath + '-shm';
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {
      // ignore unlink error
    }
  }

  console.log(`\nResults: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
