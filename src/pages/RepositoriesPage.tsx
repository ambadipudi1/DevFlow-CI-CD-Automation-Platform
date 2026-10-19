import React, { useState } from 'react';
import { GitFork, ExternalLink, RefreshCw, Plus, Code, CheckCircle, ShieldAlert } from 'lucide-react';
import { Repository } from '../types/client.js';

interface RepositoriesPageProps {
  repositories: Repository[];
  onSyncGithub: () => Promise<void>;
  onCreateRepo: (data: {
    owner: string;
    name: string;
    full_name: string;
    default_branch: string;
    html_url?: string;
    primary_language?: string;
  }) => Promise<void>;
  onNavigate: (tab: string) => void;
  hasGithubToken: boolean;
}

export const RepositoriesPage: React.FC<RepositoriesPageProps> = ({
  repositories,
  onSyncGithub,
  onCreateRepo,
  onNavigate,
  hasGithubToken,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [language, setLanguage] = useState('TypeScript');
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      await onSyncGithub();
    } catch (err: any) {
      setError(err.message || 'Failed to sync repositories');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !name.trim()) return;
    try {
      setError(null);
      const fullName = `${owner.trim()}/${name.trim()}`;
      await onCreateRepo({
        owner: owner.trim(),
        name: name.trim(),
        full_name: fullName,
        default_branch: defaultBranch.trim() || 'main',
        html_url: `https://github.com/${fullName}`,
        primary_language: language,
      });
      setShowModal(false);
      setOwner('');
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to register repository');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">GitHub Repositories</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {repositories.length} registered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Repositories monitored by DevFlow. Synchronize directly via GitHub OAuth/PAT or register custom projects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              hasGithubToken
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/40'
            }`}
            title={hasGithubToken ? 'Sync repos from GitHub API' : 'Configure GitHub Token to sync live repos'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{hasGithubToken ? 'Sync from GitHub' : 'GitHub Sync (Needs Token)'}</span>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Repository</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => onNavigate('integrations')}
            className="text-[11px] underline font-semibold text-rose-200 hover:text-white"
          >
            Configure Token in Integrations
          </button>
        </div>
      )}

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repositories.map((repo) => {
          const isDemo = repo.full_name.startsWith('[DEMO]');
          return (
            <div
              key={repo.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate" title={repo.full_name}>
                        {repo.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono truncate">{repo.owner}</p>
                    </div>
                  </div>

                  {isDemo ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      SYNCED
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                  <div className="flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-slate-500" />
                    <span>{repo.primary_language || 'Polyglot'}</span>
                  </div>
                  <span>•</span>
                  <span>Branch: {repo.default_branch}</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                {repo.html_url ? (
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-400 flex items-center gap-1 transition"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500">Internal</span>
                )}

                <button
                  onClick={() => onNavigate('pipelines')}
                  className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  View Pipelines →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Add Repo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Register GitHub Repository</h2>
            <p className="text-xs text-slate-400">
              DevFlow will track commits and automated GitHub Actions workflows for this repository.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Owner / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme-corp"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Repository Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. backend-api"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Default Branch</label>
                  <input
                    type="text"
                    value={defaultBranch}
                    onChange={(e) => setDefaultBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="TypeScript">TypeScript</option>
                    <option value="JavaScript">JavaScript</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="Go">Go</option>
                    <option value="Docker">Docker</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  Save Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
