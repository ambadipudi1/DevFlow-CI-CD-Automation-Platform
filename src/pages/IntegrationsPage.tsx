import React, { useState } from 'react';
import {
  Plug,
  GitFork,
  Sparkles,
  Webhook,
  Database,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  Send,
} from 'lucide-react';
import { IntegrationStatus } from '../types/client.js';

interface IntegrationsPageProps {
  status: IntegrationStatus | null;
  onConfigureToken: (data: { github_token?: string; webhook_secret?: string }) => Promise<void>;
  onRefresh: () => void;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({
  status,
  onConfigureToken,
  onRefresh,
}) => {
  const [githubToken, setGithubToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedback(null);
      await onConfigureToken({
        github_token: githubToken.trim() || undefined,
        webhook_secret: webhookSecret.trim() || undefined,
      });
      setFeedback({ message: 'Integration credentials updated successfully in memory!', type: 'success' });
      setGithubToken('');
      setWebhookSecret('');
      onRefresh();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to update credentials', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearToken = async () => {
    try {
      setIsSaving(true);
      await onConfigureToken({ github_token: '' });
      setFeedback({ message: 'GitHub token removed. DevFlow switched to local sandbox runner.', type: 'success' });
      onRefresh();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to reset token', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const webhookEndpoint = `${window.location.origin}/api/webhooks/github`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Integrations & Credentials</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Security Hardened
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manage connections to GitHub Actions, Google Gemini AI, SQLite database, and incoming GitHub Webhooks.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GitHub Integration */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-800 text-white">
                  <GitFork className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">GitHub Integration</h3>
                  <p className="text-xs text-slate-400">Octokit API & Workflow Dispatch</p>
                </div>
              </div>

              {status?.github.isConnected ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  CONNECTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  SANDBOX MODE
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">
              When configured with a Personal Access Token (classic with <code className="text-blue-400">repo</code> and <code className="text-blue-400">workflow</code> scopes, or fine-grained Actions token), DevFlow triggers actual GitHub Actions runners and downloads live logs.
            </p>

            {status?.github.user && (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3 text-xs">
                {status.github.user.avatar_url && (
                  <img
                    src={status.github.user.avatar_url}
                    alt={status.github.user.login}
                    className="w-8 h-8 rounded-full border border-slate-600"
                  />
                )}
                <div>
                  <div className="font-bold text-white">@{status.github.user.login}</div>
                  <div className="text-[11px] text-slate-400">{status.github.user.email || 'Authenticated via token'}</div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-3 pt-3 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                placeholder={status?.github.hasToken ? '••••••••••••••••••••••••' : 'ghp_... or github_pat_...'}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Never stored in plaintext SQLite columns. Held in secure server memory.
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {status?.github.hasToken && (
                <button
                  type="button"
                  onClick={handleClearToken}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                >
                  Clear Token
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving || !githubToken}
                className="ml-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
              >
                {isSaving ? 'Connecting...' : 'Connect GitHub'}
              </button>
            </div>
          </form>
        </div>

        {/* Gemini AI Integration */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Gemini AI</h3>
                  <p className="text-xs text-slate-400">Official @google/genai SDK</p>
                </div>
              </div>

              {status?.gemini.isConfigured ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  READY
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  FALLBACK ACTIVE
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Powers deep root cause failure summarization, plain-English explanations, and proposed code remediation diffs.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Model:</span>
                <span className="font-mono text-purple-300 font-semibold">{status?.gemini.model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Telemetry Header:</span>
                <span className="font-mono text-slate-300">User-Agent: aistudio-build</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Log Sanitization:</span>
                <span className="text-emerald-400 font-semibold">Enabled (Secrets Stripped)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <p>
              Note: Key is read automatically from <code className="text-slate-300">GEMINI_API_KEY</code> on the server. If offline or over quota, DevFlow gracefully uses its built-in deterministic rule engine.
            </p>
          </div>
        </div>

        {/* GitHub Webhook Endpoint */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">GitHub Webhooks Listener</h3>
                <p className="text-xs text-slate-400">HMAC-SHA256 signature verification & duplicate protection</p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              LISTENING
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Configure this endpoint in your GitHub Repository under <strong className="text-white">Settings &gt; Webhooks &gt; Add webhook</strong> to automatically capture workflow run completions and push events into SQLite.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between gap-4">
            <div className="truncate">
              <span className="text-slate-500 select-none">POST </span>
              <span className="text-cyan-400">{webhookEndpoint}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(webhookEndpoint);
                alert('Webhook URL copied to clipboard!');
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 underline shrink-0 cursor-pointer"
            >
              Copy URL
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 pt-1">
            <div className="space-y-1">
              <span className="font-semibold text-slate-200">Recommended Events:</span>
              <ul className="text-slate-400 list-disc list-inside space-y-0.5 text-[11px]">
                <li>Workflow runs (<code className="text-slate-300">workflow_run</code>)</li>
                <li>Pushes (<code className="text-slate-300">push</code>)</li>
              </ul>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-slate-200">Duplicate Delivery Protection:</span>
              <p className="text-slate-400 text-[11px]">
                DevFlow enforces a unique SQLite constraint on <code className="text-slate-300">github_delivery_id</code> to guarantee exactly-once processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
