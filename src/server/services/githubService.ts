import { Octokit } from 'octokit';
import crypto from 'crypto';

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name?: string;
  email?: string;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
  html_url: string;
  language: string | null;
  private: boolean;
  description: string | null;
}

export interface GitHubRunSummary {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null;
  html_url: string;
  run_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export class GitHubService {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private webhookSecret: string | null = null;

  constructor() {
    this.token = process.env.GITHUB_TOKEN || null;
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || null;
    if (this.token && this.token.trim().length > 0) {
      this.octokit = new Octokit({ auth: this.token });
    }
  }

  public setRuntimeToken(token: string) {
    this.token = token.trim();
    this.octokit = this.token ? new Octokit({ auth: this.token }) : null;
  }

  public setWebhookSecret(secret: string) {
    this.webhookSecret = secret.trim();
  }

  public getStatus(): { isConnected: boolean; hasToken: boolean; hasWebhookSecret: boolean } {
    return {
      isConnected: !!this.octokit,
      hasToken: !!this.token,
      hasWebhookSecret: !!this.webhookSecret,
    };
  }

  public async getAuthenticatedUser(): Promise<GitHubUser | null> {
    if (!this.octokit) return null;
    try {
      const res = await this.octokit.rest.users.getAuthenticated();
      return {
        id: res.data.id,
        login: res.data.login,
        avatar_url: res.data.avatar_url,
        name: res.data.name || undefined,
        email: res.data.email || undefined,
      };
    } catch (err: any) {
      console.error('GitHub getAuthenticatedUser error:', err.message);
      return null;
    }
  }

  public async listUserRepositories(): Promise<GitHubRepoSummary[]> {
    if (!this.octokit) {
      return [];
    }
    try {
      const res = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 50,
      });
      return res.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: { login: r.owner.login },
        default_branch: r.default_branch || 'main',
        html_url: r.html_url,
        language: r.language,
        private: r.private,
        description: r.description,
      }));
    } catch (err: any) {
      console.error('GitHub listUserRepositories error:', err.message);
      throw new Error(`Failed to list repositories: ${err.message}`);
    }
  }

  public async listWorkflows(owner: string, repo: string) {
    if (!this.octokit) return [];
    try {
      const res = await this.octokit.rest.actions.listRepoWorkflows({
        owner,
        repo,
      });
      return res.data.workflows;
    } catch (err: any) {
      console.warn(`Failed to list workflows for ${owner}/${repo}:`, err.message);
      return [];
    }
  }

  public async listWorkflowRuns(owner: string, repo: string, limit = 20): Promise<GitHubRunSummary[]> {
    if (!this.octokit) return [];
    try {
      const res = await this.octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: limit,
      });
      return res.data.workflow_runs.map((r: any) => ({
        id: r.id,
        name: r.name || 'CI',
        head_branch: r.head_branch || 'main',
        head_sha: r.head_sha,
        status: r.status,
        conclusion: r.conclusion,
        html_url: r.html_url,
        run_started_at: r.run_started_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    } catch (err: any) {
      console.warn(`Failed to list runs for ${owner}/${repo}:`, err.message);
      return [];
    }
  }

  public async getWorkflowRun(owner: string, repo: string, runId: number): Promise<GitHubRunSummary | null> {
    if (!this.octokit) return null;
    try {
      const res = await this.octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      const r = res.data;
      return {
        id: r.id,
        name: r.name || 'CI',
        head_branch: r.head_branch || 'main',
        head_sha: r.head_sha,
        status: r.status as any,
        conclusion: r.conclusion as any,
        html_url: r.html_url,
        run_started_at: r.run_started_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    } catch (err: any) {
      console.error(`Failed to get run #${runId} for ${owner}/${repo}:`, err.message);
      return null;
    }
  }

  public async triggerWorkflow(
    owner: string,
    repo: string,
    workflowIdOrFileName: string | number,
    ref: string = 'main',
    inputs: Record<string, any> = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!this.octokit) {
      throw new Error('GitHub token is not configured.');
    }
    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowIdOrFileName,
        ref,
        inputs,
      });
      return { success: true, message: `Dispatched workflow '${workflowIdOrFileName}' on ref '${ref}'` };
    } catch (err: any) {
      console.error('Trigger workflow failed:', err.message);
      throw new Error(`Failed to trigger workflow: ${err.message}`);
    }
  }

  public async getWorkflowRunLogs(owner: string, repo: string, runId: number): Promise<string> {
    if (!this.octokit) {
      return '';
    }
    try {
      // First try jobs for detailed failure logs
      const jobsRes = await this.octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });

      const failedJob = jobsRes.data.jobs.find((j: any) => j.conclusion === 'failure') || jobsRes.data.jobs[0];
      if (failedJob) {
        try {
          const logRes = await this.octokit.rest.actions.downloadJobLogsForWorkflowRun({
            owner,
            repo,
            job_id: failedJob.id,
          });
          return String(logRes.data);
        } catch {
          // If individual job log is unavailable, try fallback
        }
      }

      return `Job status: ${failedJob?.conclusion || 'unknown'}. Step logs could not be retrieved directly via API.`;
    } catch (err: any) {
      console.warn('Failed to download workflow logs:', err.message);
      return `Logs temporarily unavailable from GitHub API: ${err.message}`;
    }
  }

  public async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string,
    branch: string = 'main'
  ): Promise<{ commitSha: string }> {
    if (!this.octokit) {
      throw new Error('GitHub integration not configured.');
    }

    let sha: string | undefined;
    try {
      const existing = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });
      if (!Array.isArray(existing.data) && 'sha' in existing.data) {
        sha = existing.data.sha;
      }
    } catch {
      // File does not exist yet
    }

    const res = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha,
    });

    return { commitSha: res.data.commit.sha || 'sha' };
  }

  public verifyWebhookSignature(payload: string | Buffer, signatureHeader?: string): boolean {
    if (!this.webhookSecret) {
      return true; // No secret configured, allow bypass or log warning
    }
    if (!signatureHeader) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }
}

export const githubService = new GitHubService();
