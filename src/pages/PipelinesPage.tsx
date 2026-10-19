import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Play,
  FileCode2,
  Trash2,
  Box,
  CloudUpload,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Pipeline, Repository } from '../types/client.js';

interface PipelinesPageProps {
  pipelines: Pipeline[];
  repositories: Repository[];
  onCreatePipeline: (data: Partial<Pipeline>) => Promise<void>;
  onDeletePipeline: (id: string) => Promise<{ success: boolean; error?: string }>;
  onViewYaml: (pipelineId: string) => void;
  onTriggerRun: (pipelineId: string) => void;
}

export const PipelinesPage: React.FC<PipelinesPageProps> = ({
  pipelines,
  repositories,
  onCreatePipeline,
  onDeletePipeline,
  onViewYaml,
  onTriggerRun,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [repoId, setRepoId] = useState(repositories[0]?.id || '');
  const [branch, setBranch] = useState('main');
  const [runtime, setRuntime] = useState<Pipeline['runtime']>('nodejs');
  const [testCmd, setTestCmd] = useState('npm test');
  const [buildCmd, setBuildCmd] = useState('npm run build');
  const [dockerEnabled, setDockerEnabled] = useState(false);
  const [deploymentEnabled, setDeploymentEnabled] = useState(false);
  const [deploymentTarget, setDeploymentTarget] = useState('production-cluster.internal');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoId) return;

    try {
      await onCreatePipeline({
        name: name.trim(),
        repository_id: repoId,
        branch: branch.trim() || 'main',
        runtime,
        test_command: testCmd.trim(),
        build_command: buildCmd.trim(),
        docker_enabled: dockerEnabled ? 1 : 0,
        deployment_enabled: deploymentEnabled ? 1 : 0,
        deployment_target: deploymentEnabled ? deploymentTarget.trim() : null,
      });
      setShowCreateModal(false);
      setName('');
      setFeedback({ message: 'Pipeline created and registered in SQLite!', type: 'success' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to create pipeline', type: 'error' });
    }
  };

  const handleDelete = async (id: string, pipeName: string) => {
    if (!confirm(`Are you sure you want to delete pipeline "${pipeName}"?`)) return;
    const res = await onDeletePipeline(id);
    if (!res.success) {
      setFeedback({ message: res.error || 'Failed to delete pipeline', type: 'error' });
    } else {
      setFeedback({ message: 'Pipeline deleted successfully.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">CI/CD Pipelines</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {pipelines.length} active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Declarative workflows executed on GitHub Actions runners, recorded locally in SQLite with strict foreign key safeguards.
          </p>
        </div>

        <button
          onClick={() => {
            if (repositories.length > 0 && !repoId) setRepoId(repositories[0].id);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Pipeline</span>
        </button>
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

      {/* Pipelines List */}
      <div className="space-y-4">
        {pipelines.map((pipeline) => {
          const isDemo = pipeline.name.startsWith('[DEMO]');
          return (
            <div
              key={pipeline.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white truncate">{pipeline.name}</h3>
                  {isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {pipeline.runtime}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-4 flex-wrap font-mono">
                  <span>Repo: {pipeline.repository_full_name}</span>
                  <span>•</span>
                  <span>Branch: {pipeline.branch}</span>
                  {pipeline.test_command && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">Test: {pipeline.test_command}</span>
                    </>
                  )}
                </div>

                {/* Badges for Docker & Deployment */}
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  {pipeline.docker_enabled === 1 ? (
                    <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-950/40 border border-cyan-800 px-2 py-0.5 rounded">
                      <Box className="w-3 h-3" />
                      Docker Build Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded">
                      Docker Disabled
                    </span>
                  )}

                  {pipeline.deployment_enabled === 1 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
                      <CloudUpload className="w-3 h-3" />
                      Deploy: {pipeline.deployment_target || 'Production'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded">
                      Deployment Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onViewYaml(pipeline.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                  title="View GitHub Actions YAML"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Workflow YAML</span>
                </button>

                <button
                  onClick={() => onTriggerRun(pipeline.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                </button>

                <button
                  onClick={() => handleDelete(pipeline.id, pipeline.name)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                  title="Delete pipeline (prevented if runs exist)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Pipeline Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white">Create CI/CD Pipeline</h2>
            <p className="text-xs text-slate-400">
              Configure build, test, docker packaging, and deployment stages for your repository.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Pipeline Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Release CI/CD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Repository</label>
                  <select
                    value={repoId}
                    onChange={(e) => setRepoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  >
                    {repositories.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Application Runtime</label>
                <select
                  value={runtime}
                  onChange={(e) => {
                    const r = e.target.value as Pipeline['runtime'];
                    setRuntime(r);
                    if (r === 'python') {
                      setTestCmd('pytest');
                      setBuildCmd('python -m build');
                    } else if (r === 'java-maven') {
                      setTestCmd('mvn test');
                      setBuildCmd('mvn clean package');
                    } else if (r === 'docker') {
                      setTestCmd('docker build -t test-app .');
                      setBuildCmd('docker build -t prod-app .');
                    } else {
                      setTestCmd('npm test');
                      setBuildCmd('npm run build');
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
                >
                  <option value="nodejs">Node.js (npm / yarn)</option>
                  <option value="react-vite">React & Vite</option>
                  <option value="python">Python 3.11</option>
                  <option value="java-maven">Java (Maven JDK 17)</option>
                  <option value="docker">Docker Containerized</option>
                  <option value="custom">Custom Pipeline</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Test Command</label>
                  <input
                    type="text"
                    value={testCmd}
                    onChange={(e) => setTestCmd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Build Command</label>
                  <input
                    type="text"
                    value={buildCmd}
                    onChange={(e) => setBuildCmd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={dockerEnabled}
                    onChange={(e) => setDockerEnabled(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Enable Docker Image Build & Container Registry Push</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={deploymentEnabled}
                    onChange={(e) => setDeploymentEnabled(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Enable Automated Deployment & Endpoint Health Checking</span>
                </label>

                {deploymentEnabled && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Deployment Target URL / Host</label>
                    <input
                      type="text"
                      value={deploymentTarget}
                      onChange={(e) => setDeploymentTarget(e.target.value)}
                      placeholder="e.g. api.production.internal"
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
                >
                  Create Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
