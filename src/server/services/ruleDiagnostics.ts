import { sanitizeLog } from './sanitizer.js';

export interface RuleDiagnosisResult {
  failure_category: string;
  error_summary: string;
  sanitized_log_excerpt: string;
  evidence: string[];
  likely_causes: string[];
  recommended_actions: string[];
  proposed_fixes?: {
    file_path: string;
    original_code: string;
    suggested_code: string;
    explanation: string;
    verification_steps: string[];
  }[];
  confidence: number;
}

export function diagnoseWorkflowFailure(rawLog: string): RuleDiagnosisResult {
  const cleanLog = sanitizeLog(rawLog);
  const lines = cleanLog.split('\n');

  // 1. Missing Dependencies
  if (
    /Cannot find module ['"]([^'"]+)['"]/i.test(cleanLog) ||
    /Module not found: Can't resolve ['"]([^'"]+)['"]/i.test(cleanLog) ||
    /npm ERR! code (?:ENOENT|MODULE_NOT_FOUND|E404)/i.test(cleanLog) ||
    /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/i.test(cleanLog) ||
    /pip.*No matching distribution found/i.test(cleanLog)
  ) {
    const modMatch = cleanLog.match(/(?:Cannot find module|Can't resolve|No module named)\s*['"]?([a-zA-Z0-9_\-@\/]+)['"]?/i);
    const missingPkg = modMatch ? modMatch[1] : 'unresolved package';
    const evidenceLines = lines.filter((l) =>
      /(?:Cannot find module|Module not found|No module named|npm ERR!|yarn error)/i.test(l)
    ).slice(0, 5);

    return {
      failure_category: 'missing_dependencies',
      error_summary: `Missing dependency detected: ${missingPkg}`,
      sanitized_log_excerpt: evidenceLines.join('\n') || lines.slice(-10).join('\n'),
      evidence: evidenceLines.length ? evidenceLines : [`Dependency resolution failed for ${missingPkg}`],
      likely_causes: [
        `Package '${missingPkg}' was imported in code but is not listed in dependencies in package.json/requirements.txt.`,
        'Lockfile is out of sync with manifests, or a newly added import was not committed with updated package.json.',
        'Dependency installation step failed or was skipped in the CI pipeline.',
      ],
      recommended_actions: [
        `Run 'npm install ${missingPkg}' (or equivalent package manager) locally and commit package.json and lockfile.`,
        'Verify that CI workflow runs the install step (e.g., `npm ci` or `pip install -r requirements.txt`) before build/test steps.',
        'Check for typos in import statement.',
      ],
      proposed_fixes: [
        {
          file_path: 'package.json',
          original_code: '  "dependencies": {\n  }',
          suggested_code: `  "dependencies": {\n    "${missingPkg}": "^latest"\n  }`,
          explanation: `Add missing package '${missingPkg}' to project dependencies.`,
          verification_steps: [
            `Run 'npm install' locally to generate an updated package-lock.json`,
            'Verify that `npm run test` or `npm run build` succeeds without module errors',
          ],
        },
      ],
      confidence: 0.94,
    };
  }

  // 2. TypeScript Errors
  if (
    /error TS\d{4}:/i.test(cleanLog) ||
    /TypeScript error in /i.test(cleanLog) ||
    /tsc\s+--noEmit.*failed/i.test(cleanLog)
  ) {
    const tsLines = lines.filter((l) => /TS\d{4}:/.test(l) || /error TS/i.test(l)).slice(0, 5);
    const tsError = tsLines[0] || 'TypeScript compiler encountered typecheck errors';

    return {
      failure_category: 'typescript_error',
      error_summary: `TypeScript compilation error: ${tsError.trim()}`,
      sanitized_log_excerpt: tsLines.join('\n'),
      evidence: tsLines,
      likely_causes: [
        'Type mismatch or property access on an undefined/incompatible interface.',
        'Missing type definitions or outdated @types package.',
        'tsconfig.json strict null checks or noImplicitAny triggered in CI.',
      ],
      recommended_actions: [
        'Run `npx tsc --noEmit` locally to inspect and fix type errors in source files.',
        'Check if an optional property needs nullish coalescing or optional chaining (?.).',
        'Ensure all required interface properties are properly supplied in mock data or payloads.',
      ],
      proposed_fixes: [
        {
          file_path: 'src/types.ts',
          original_code: '// Potential missing type definition',
          suggested_code: '// Ensure exported interfaces match component prop expectations',
          explanation: 'Align TypeScript types with payload structures and run tsc --noEmit.',
          verification_steps: ['Run `npm run lint` or `npx tsc --noEmit` locally'],
        },
      ],
      confidence: 0.92,
    };
  }

  // 3. Test Failures
  if (
    /(?:FAIL|failed)\s+.*(?:\.test\.|\.spec\.|Test Suites:)/i.test(cleanLog) ||
    /AssertionError/i.test(cleanLog) ||
    /Expected:.*Received:/is.test(cleanLog) ||
    /pytest.*failed/i.test(cleanLog)
  ) {
    const testLines = lines.filter((l) =>
      /(?:FAIL|●|AssertionError|Expected:|Received:|Tests:.*failed)/i.test(l)
    ).slice(0, 6);

    return {
      failure_category: 'failed_tests',
      error_summary: 'Automated test suite failed with assertion or snapshot errors',
      sanitized_log_excerpt: testLines.join('\n') || cleanLog.slice(-500),
      evidence: testLines.length ? testLines : ['Test execution exited with non-zero code'],
      likely_causes: [
        'One or more unit/integration test assertions failed against expected outcomes.',
        'Recent code changes modified response shapes or behavior without updating test fixtures.',
        'Flaky test due to asynchronous timing or unmocked external network/API call.',
      ],
      recommended_actions: [
        'Run test command locally (e.g. `npm test` or `pytest`) to isolate the failing suite.',
        'Review recent commits for behavioral changes affecting expected assertions.',
        'Ensure async tests properly await promises and unmount components cleanly.',
      ],
      confidence: 0.95,
    };
  }

  // 4. Missing Environment Variables / Secrets
  if (
    /(?:missing|undefined).*env(?:ironment)?\s*var/i.test(cleanLog) ||
    /process\.env\.[A-Z0-9_]+\s+is\s+(?:undefined|not set)/i.test(cleanLog) ||
    /(?:API_KEY|SECRET|TOKEN|DATABASE_URL).*required/i.test(cleanLog)
  ) {
    const envMatch = cleanLog.match(/([A-Z0-9_]{3,})\s*(?:is not set|is undefined|required)/);
    const envVar = envMatch ? envMatch[1] : 'REQUIRED_ENV_VAR';
    const envLines = lines.filter((l) => /(?:env|secret|token|undefined|required)/i.test(l)).slice(0, 4);

    return {
      failure_category: 'missing_env_vars',
      error_summary: `Environment variable or secret not configured: ${envVar}`,
      sanitized_log_excerpt: envLines.join('\n'),
      evidence: envLines,
      likely_causes: [
        `The application expects '${envVar}' to be injected from repository secrets or CI environment.`,
        'GitHub Actions workflow YAML lacks `env:` binding for repository secret.',
      ],
      recommended_actions: [
        `Add '${envVar}' to GitHub repository secrets under Settings > Secrets and variables > Actions.`,
        `Pass the secret into the workflow step in .github/workflows/*.yml using \`env: ${envVar}: \${{ secrets.${envVar} }}\`.`,
      ],
      confidence: 0.93,
    };
  }

  // 5. Docker Build Failures
  if (
    /docker build.*failed/i.test(cleanLog) ||
    /executor failed running \[(.*)\]/i.test(cleanLog) ||
    /failed to solve with frontend dockerfile/i.test(cleanLog) ||
    /COPY failed: file not found/i.test(cleanLog)
  ) {
    const dockerLines = lines.filter((l) => /(?:docker|executor failed|Dockerfile|COPY failed)/i.test(l)).slice(0, 5);

    return {
      failure_category: 'docker_build_failure',
      error_summary: 'Docker image build step failed inside container build context',
      sanitized_log_excerpt: dockerLines.join('\n') || lines.slice(-8).join('\n'),
      evidence: dockerLines,
      likely_causes: [
        'A command inside Dockerfile (e.g. `RUN npm run build`) failed during image layer creation.',
        'A file referenced in `COPY` does not exist in the Docker build context or is excluded by .dockerignore.',
        'Base image architecture mismatch or network timeout during package installation inside container.',
      ],
      recommended_actions: [
        'Test Docker build locally with `docker build -t test-app .` to view exact build stage logs.',
        'Check that .dockerignore does not exclude files needed during the build.',
        'Verify package manager dependencies compile cleanly in a fresh Linux container.',
      ],
      confidence: 0.90,
    };
  }

  // 6. Registry Auth Errors
  if (
    /(?:unauthorized|authentication required|denied: access forbidden|401 Unauthorized|403 Forbidden)/i.test(cleanLog) &&
    /(?:registry|docker\.io|ghcr\.io|ecr|docker login)/i.test(cleanLog)
  ) {
    return {
      failure_category: 'registry_auth_error',
      error_summary: 'Docker container registry authentication failed during image push',
      sanitized_log_excerpt: lines.filter((l) => /(?:unauthorized|denied|registry|login)/i.test(l)).slice(0, 4).join('\n'),
      evidence: ['Registry returned 401 Unauthorized or 403 Access Forbidden during push'],
      likely_causes: [
        'GitHub Container Registry (GHCR) or Docker Hub token has expired or lacks write:packages permission.',
        'The workflow step `docker/login-action` was not executed or supplied with invalid credentials.',
      ],
      recommended_actions: [
        'Ensure the GitHub Actions job has `permissions: packages: write` enabled in workflow YAML.',
        'Check credentials provided to docker login step in .github/workflows/*.yml.',
      ],
      confidence: 0.92,
    };
  }

  // 7. Health Check / Deployment Failures
  if (
    /(?:health[- ]?check.*failed|connection refused|HTTP (?:500|502|503|504))/i.test(cleanLog) ||
    /failed to respond within.*timeout/i.test(cleanLog)
  ) {
    return {
      failure_category: 'health_check_failure',
      error_summary: 'Application deployment failed health check validation endpoint',
      sanitized_log_excerpt: lines.filter((l) => /(?:health|refused|HTTP 5|timeout)/i.test(l)).slice(0, 5).join('\n'),
      evidence: ['Target endpoint did not return HTTP 200 within expected timeout window'],
      likely_causes: [
        'The newly deployed service crashed on startup due to missing runtime config or uncaught exception.',
        'Port configuration mismatch (e.g. app listening on port 3000 but health check probing port 8080).',
        'Database connection timeout during server initialization.',
      ],
      recommended_actions: [
        'Check application server logs on the deployment target for fatal startup errors.',
        'Ensure health check URL path (e.g., `/api/health`) is exposed without authentication requirements.',
        'Verify host and port bindings (`0.0.0.0` rather than `localhost`).',
      ],
      confidence: 0.88,
    };
  }

  // 8. Syntax & Compilation Error
  if (
    /SyntaxError:/i.test(cleanLog) ||
    /Unexpected token/i.test(cleanLog) ||
    /Parse error/i.test(cleanLog)
  ) {
    const synLines = lines.filter((l) => /(?:SyntaxError|Unexpected token|Parse error)/i.test(l)).slice(0, 4);
    return {
      failure_category: 'compilation_error',
      error_summary: 'Syntax or parse error encountered during compilation',
      sanitized_log_excerpt: synLines.join('\n'),
      evidence: synLines,
      likely_causes: [
        'Unclosed bracket, missing semicolon, or invalid JavaScript/JSX/Python syntax in a recent commit.',
        'Unsupported ECMAScript feature in targeted build environment without appropriate Babel/esbuild transform.',
      ],
      recommended_actions: [
        'Inspect file and line mentioned in the syntax error message.',
        'Run linter locally (`npm run lint`) to catch syntax anomalies before pushing.',
      ],
      confidence: 0.94,
    };
  }

  // 9. Timeouts / Permission Errors
  if (
    /ETIMEDOUT/i.test(cleanLog) ||
    /Process completed with exit code 143/i.test(cleanLog) ||
    /The operation was canceled./i.test(cleanLog) ||
    /EACCES: permission denied/i.test(cleanLog)
  ) {
    return {
      failure_category: 'timeout_permission_error',
      error_summary: 'Workflow step terminated due to execution timeout or filesystem permission denied',
      sanitized_log_excerpt: lines.slice(-8).join('\n'),
      evidence: ['Process exited with timeout or permission denied error'],
      likely_causes: [
        'A test, build command, or background server hung indefinitely without terminating.',
        'Runner execution time exceeded default workflow timeout limit.',
        'File or executable lacks execute permissions (`chmod +x`).',
      ],
      recommended_actions: [
        'Add explicit `timeout-minutes: 10` on long-running workflow jobs.',
        'Ensure scripts have executable permissions committed (`git update-index --chmod=+x script.sh`).',
        'Verify test runners do not run in interactive watch mode (`--watch` or `--watchAll`).',
      ],
      confidence: 0.86,
    };
  }

  // Fallback: Generic Build Failure
  return {
    failure_category: 'build_failure',
    error_summary: 'Build command exited with non-zero status',
    sanitized_log_excerpt: lines.slice(-10).join('\n'),
    evidence: lines.slice(-5).filter((l) => l.trim().length > 0),
    likely_causes: [
      'The build script encountered an unhandled error or bundler failure.',
      'A required asset or configuration file is missing from git tracking.',
    ],
    recommended_actions: [
      'Inspect detailed build output logs above for the primary error cause.',
      'Reproduce the build locally in a clean checkout to verify parity.',
    ],
    confidence: 0.72,
  };
}
