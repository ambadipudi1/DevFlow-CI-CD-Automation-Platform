import React, { useState } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Play,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { WorkflowRun, Pipeline, Repository } from '../types/client.js';

interface WorkflowRunsPageProps {
  runs: WorkflowRun[];
  pipelines: Pipeline[];
  repositories: Repository[];
  onSelectRun: (runId: string) => void;
  onOpenTriggerModal: () => void;
  onNavigate: (tab: string) => void;
  onFilterChange: (filters: { repository_id?: string; pipeline_id?: string; conclusion?: string }) => void;
}

export const WorkflowRunsPage: React.FC<WorkflowRunsPageProps> = ({
  runs,
  pipelines,
  repositories,
  onSelectRun,
  onOpenTriggerModal,
  onNavigate,
  onFilterChange,
}) => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedConclusion, setSelectedConclusion] = useState('');

  const handleFilterUpdate = (repo: string, pipe: string, conc: string) => {
    setSelectedRepo(repo);
    setSelectedPipeline(pipe);
    setSelectedConclusion(conc);
    onFilterChange({
      repository_id: repo || undefined,
      pipeline_id: pipe || undefined,
      conclusion: conc || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">Workflow Execution Runs</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {runs.length} runs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical workflow runs stored in SQLite, backed by sanitized logs, ANSI output, and deterministic failure reports.
          </p>
        </div>

        <button
          onClick={onOpenTriggerModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer self-start sm:self-auto"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Trigger Workflow</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Filter:</span>
        </div>

        <select
          value={selectedRepo}
          onChange={(e) => handleFilterUpdate(e.target.value, selectedPipeline, selectedConclusion)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:outline-hidden focus:border-blue-500"
        >
          <option value="">All Repositories</option>
          {repositories.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>

        <select
          value={selectedPipeline}
          onChange={(e) => handleFilterUpdate(selectedRepo, e.target.value, selectedConclusion)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:outline-hidden focus:border-blue-500"
        >
          <option value="">All Pipelines</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedConclusion}
          onChange={(e) => handleFilterUpdate(selectedRepo, selectedPipeline, e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:outline-hidden focus:border-blue-500"
        >
          <option value="">All Outcomes</option>
          <option value="success">Successful</option>
          <option value="failure">Failed</option>
        </select>

        {(selectedRepo || selectedPipeline || selectedConclusion) && (
          <button
            onClick={() => handleFilterUpdate('', '', '')}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Runs Table */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Workflow / Pipeline</th>
                <th className="py-3 px-4">Commit / Branch</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching workflow execution records found in SQLite.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const isSuccess = run.conclusion === 'success';
                  const isFailure = run.conclusion === 'failure';
                  const isRunning = run.status === 'in_progress' || run.status === 'queued';

                  return (
                    <tr
                      key={run.id}
                      onClick={() => onSelectRun(run.id)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Success
                            </span>
                          )}
                          {isFailure && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5" />
                              Failure
                            </span>
                          )}
                          {isRunning && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              Running
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{run.workflow_name}</span>
                          {run.repository_full_name?.startsWith('[DEMO]') && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {run.repository_full_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <div>{run.branch}</div>
                        <div className="text-[11px] text-slate-500">{run.commit_sha}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {run.duration_seconds !== null ? `${run.duration_seconds}s` : '--'}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {new Date(run.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {isFailure && (
                            <button
                              onClick={() => {
                                onSelectRun(run.id);
                                onNavigate('analyzer');
                              }}
                              className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Diagnose</span>
                            </button>
                          )}

                          <button
                            onClick={() => onSelectRun(run.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition cursor-pointer"
                          >
                            View Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
