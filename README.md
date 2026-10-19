# DevFlow — CI/CD Automation Platform Using SQLite

DevFlow is a full-stack, production-grade CI/CD automation platform built with React, TypeScript, Node.js, Express, pure SQLite, GitHub Actions, Docker, and optional Google Gemini AI.

DevFlow runs with **SQLite as its only database**, requiring zero external database services or complex ORMs.

---

## 1. Architecture & Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** bundler
- **Tailwind CSS v4** responsive dark DevOps UI
- **Lucide Icons**
- Modular dashboard with 10 dedicated sections:
  1. Overview Dashboard
  2. GitHub Repositories
  3. CI/CD Pipelines
  4. Workflow Runs & Real-time Sanitized Log Viewer
  5. Deterministic Failure Analyzer & Gemini AI Patch Proposal
  6. Docker Container Builds & Digest Tracking
  7. Deployments & Automated Health Check Probes
  8. CI/CD Reports & Analytics (Pass rate, Duration, MTTR)
  9. Integrations (GitHub PAT/OAuth, Gemini AI, Webhooks)
  10. Settings & SQLite Database Maintenance

### Backend
- **Node.js** + **Express**
- **SQLite Engine (`sql.js`)**: Pure WebAssembly SQLite compiling directly from SQLite C source with 100% standard SQL syntax, prepared statements, foreign key enforcement (`PRAGMA foreign_keys = ON`), WAL-style disk persistence, and transactions.
- **Octokit**: GitHub Actions workflow dispatch, runs status synchronization, and repository API.
- **Official Google Gen AI SDK (`@google/genai`)**: Model `gemini-3.8-flash` with `User-Agent: 'aistudio-build'` header.
- **Zod**: Runtime schema validation for AI responses and REST API payloads.
- **HMAC SHA-256 Webhook Verification**: Signature validation with duplicate delivery ID prevention (`github_delivery_id` unique constraint).

---

## 2. SQLite Database Schema & Migrations

All migrations are tracked in `_migrations` and executed inside transactional migrations:

1. **`users`**:
   - `id`, `github_user_id` (UNIQUE), `username`, `email`, `avatar_url`, `created_at`, `updated_at`
2. **`repositories`**:
   - `id`, `owner`, `name`, `full_name` (UNIQUE), `github_repository_id`, `default_branch`, `html_url`, `primary_language`, `created_at`, `updated_at`
3. **`pipelines`**:
   - `id`, `name`, `repository_id` (`REFERENCES repositories(id) ON DELETE RESTRICT`), `branch`, `runtime`, `test_command`, `build_command`, `docker_enabled`, `deployment_enabled`, `deployment_target`, `created_at`, `updated_at`
4. **`workflow_runs`**:
   - `id`, `pipeline_id` (`REFERENCES pipelines(id) ON DELETE RESTRICT`), `repository_id` (`REFERENCES repositories(id) ON DELETE RESTRICT`), `github_run_id` (UNIQUE), `workflow_name`, `branch`, `commit_sha`, `status`, `conclusion`, `run_url`, `started_at`, `completed_at`, `duration_seconds`, `created_at`, `updated_at`
5. **`failure_diagnoses`**:
   - `id`, `workflow_run_id` (UNIQUE `REFERENCES workflow_runs(id) ON DELETE CASCADE`), `failure_category`, `error_summary`, `sanitized_log_excerpt`, `evidence_json`, `likely_causes_json`, `recommended_actions_json`, `proposed_fixes_json`, `confidence`, `ai_assisted`, `created_at`
6. **`deployments`**:
   - `id`, `pipeline_id` (`REFERENCES pipelines(id) ON DELETE RESTRICT`), `workflow_run_id` (`REFERENCES workflow_runs(id) ON DELETE SET NULL`), `environment`, `deployment_target`, `deployment_url`, `revision`, `status`, `health_check_status`, `started_at`, `completed_at`, `created_at`
7. **`docker_builds`**:
   - `id`, `workflow_run_id` (`REFERENCES workflow_runs(id) ON DELETE CASCADE`), `image_name`, `image_tag`, `image_digest`, `registry_url`, `status`, `created_at`
8. **`webhook_events`**:
   - `id`, `github_delivery_id` (UNIQUE), `event_type`, `processing_status`, `received_at`, `processed_at`
9. **`audit_logs`**:
   - `id`, `user_id`, `action`, `resource_type`, `resource_id`, `result`, `metadata_json`, `created_at`
10. **`workflow_logs`**:
    - `workflow_run_id` (PRIMARY KEY), `raw_log`, `sanitized_log`, `created_at`

---

## 3. Getting Started & Setup Commands

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run the automated test suite
npm test

# 3. Start development server on port 3000
npm run dev
```

### Production Build & Launch
```bash
# Build frontend assets
npm run build

# Start production server
npm start
```

### Environment Variables
Configure your `.env` file based on `.env.example`:
```ini
DATABASE_PATH="./data/devflow.db"
GEMINI_API_KEY="your-gemini-api-key"
GITHUB_TOKEN="ghp_your_github_token"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
PORT=3000
```

---

## 4. GitHub Configuration

1. **Personal Access Token (PAT)**:
   - Provide via `GITHUB_TOKEN` or enter dynamically under **Integrations** in the UI.
   - Recommended scopes: `repo` (Full repository control) and `workflow` (Update GitHub Action workflows).
2. **Webhooks Setup**:
   - In GitHub: **Repo Settings > Webhooks > Add webhook**
   - Payload URL: `https://<YOUR_DEVFLOW_URL>/api/webhooks/github`
   - Content type: `application/json`
   - Secret: Matches `GITHUB_WEBHOOK_SECRET`
   - Events: Select `Pushes` and `Workflow runs`

---

## 5. Failure Diagnosis & Safe Remediation

1. **Deterministic Rule Engine**:
   - Pre-classifies errors without AI into:
     - `missing_dependencies`
     - `typescript_error`
     - `failed_tests`
     - `missing_env_vars`
     - `docker_build_failure`
     - `registry_auth_error`
     - `health_check_failure`
     - `compilation_error`
     - `timeout_permission_error`
     - `build_failure`
   - Strips sensitive tokens and secrets before generating reports.
2. **Optional Gemini AI**:
   - Analyzes sanitized excerpts using `gemini-3.8-flash`.
   - Produces simple explanations, root causes, and structured code diff proposals.
   - Validated at runtime with Zod schemas.
3. **Safe Remediation Flow**:
   - Developers inspect the code diff between Current Code and Proposed Fix.
   - Requires explicit approval checkbox before touching code.
   - Applies commit/PR to branch and triggers an automated verification rerun.
   - Rerun result (SUCCESS or FAILURE) is recorded in SQLite.

---

## 6. Testing Procedure

DevFlow includes a dedicated automated test suite that runs on an isolated temporary SQLite database:
```bash
npm test
```
The test suite validates:
1. Database migrations run cleanly and track applied state.
2. Foreign key constraints are enforced (`PRAGMA foreign_keys = ON`).
3. Duplicate workflow prevention using unique constraint on `github_run_id`.
4. Workflow status updates and duration calculation.
5. SQL injection resistance with parameterized prepared statements.
6. Log sanitization stripping GitHub PATs, Bearer tokens, and AWS secrets.
7. Failure diagnosis persistence, JSON parsing, and deterministic classification.
8. Webhook duplicate delivery ID protection via unique constraint.
9. Gemini AI response validation enforcing strict Zod schemas.
10. End-to-end verified rerun execution.

---

## 7. SQLite Persistence & Backups

- SQLite data is saved to `DATABASE_PATH` (default `./data/devflow.db`).
- For Docker deployment, mount a persistent volume at `/data` as configured in `docker-compose.yml`.
- **Backup**:
  - Hot backup: Copy `devflow.db` when idle or use the Settings page to export.
- **Restore**:
  - Place `devflow.db` into the data directory prior to starting the service.
