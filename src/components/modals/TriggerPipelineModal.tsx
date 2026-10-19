import React, { useState } from 'react';
import { Play, AlertTriangle, CheckCircle2, GitBranch, Cpu, Sparkles } from 'lucide-react';
import { Pipeline } from '../../types/client.js';

interface TriggerPipelineModalProps {
  pipelines: Pipeline[];
  isOpen: boolean;
  onClose: () => void;
  onTrigger: (data: {
    pipeline_id: string;
    branch?: string;
    simulated_outcome: 'success' | 'failure' | 'real_github';
    failure_type?: 'missing_deps' | 'typescript' | 'test_assertion' | 'missing_env' | 'docker';
  }) => Promise<void>;
  hasGithubToken: boolean;
}

export const TriggerPipelineModal: React.FC<TriggerPipelineModalProps> = ({
  pipelines,
  isOpen,
  onClose,
  onTrigger,
  hasGithubToken,
}) => {
  if (!isOpen) return null;

  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id || '');
  const [branch, setBranch] = useState(pipelines[0]?.branch || 'main');
  const [outcome, setOutcome] = useState<'success' | 'failure' | 'real_github'>(
    hasGithubToken ? 'real_github' : 'success'
  );
  const [failureType, setFailureType] = useState<
    'missing_deps' | 'typescript' | 'test_assertion' | 'missing_env' | 'docker'
  >('missing_deps');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPipeline = pipelines.find((p) => p.id === pipelineId);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineId) return;

    try {
      setIsRunning(true);
      setError(null);
      await onTrigger({
        pipeline_id: pipelineId,
        branch: branch.trim() || undefined,
        simulated_outcome: outcome,
        failure_type: outcome === 'failure' ? failureType : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger workflow run');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Trigger CI/CD Pipeline Run</h2>
            <p className="text-xs text-slate-400">
              Execute on GitHub Actions runners or local sandbox environment
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleRun} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Pipeline</label>
            <select
              value={pipelineId}
              onChange={(e) => {
                setPipelineId(e.target.value);
                const pipe = pipelines.find((p) => p.id === e.target.value);
                if (pipe) setBranch(pipe.branch);
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-blue-500"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.repository_full_name} • {p.branch})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Branch / Git Ref</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Outcome Mode */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300">Execution Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOutcome('success')}
                className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                  outcome === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Success</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Passing tests & clean build</p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('failure')}
                className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                  outcome === 'failure'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Failing Run</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Test diagnostics & AI fix</p>
              </button>

              <button
                type="button"
                onClick={() => setOutcome('real_github')}
                className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer ${
                  outcome === 'real_github'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-blue-400">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Real GitHub</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {hasGithubToken ? 'Dispatch workflow via API' : 'Requires GitHub token'}
                </p>
              </button>
            </div>
          </div>

          {/* If Failing Run selected, choose specific error scenario */}
          {outcome === 'failure' && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-rose-300">
                Choose Specific Failure Scenario to Diagnose:
              </label>
              <select
                value={failureType}
                onChange={(e) => setFailureType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-rose-500"
              >
                <option value="missing_deps">Missing Dependency (Cannot find module 'jsonwebtoken')</option>
                <option value="typescript">TypeScript Compiler Error (TS2345 Type Incompatibility)</option>
                <option value="test_assertion">Automated Test Failure (AssertionError in Tax Calculation)</option>
                <option value="missing_env">Missing Environment Secret (process.env.STRIPE_SECRET_KEY)</option>
              </select>
              <span className="text-[10px] text-slate-400 block">
                This triggers a realistic failing log to verify DevFlow's deterministic classification, evidence extraction, and Gemini AI patch proposal.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Initiating...' : 'Start Execution'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
