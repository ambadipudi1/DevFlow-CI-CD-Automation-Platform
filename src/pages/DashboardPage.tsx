import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsSummary, WorkflowRun, Pipeline } from '../types/client.js';

interface DashboardPageProps {
  analytics: AnalyticsSummary | null;
  recentRuns: WorkflowRun[];
  pipelines: Pipeline[];
  onSelectRun: (runId: string) => void;
  onNavigate: (tab: string) => void;
  onOpenTriggerModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analytics,
  recentRuns,
  pipelines,
  onSelectRun,
  onNavigate,
  onOpenTriggerModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              DevOps Control Plane
            </span>
            <span className="text-xs text-slate-400">Deterministic Diagnostics & Auto-Remediation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            DevFlow CI/CD Automation Platform
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Automating multi-stage test pipelines, container builds, and deployments with a local SQLite ACID repository, zero external database dependencies, and Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenTriggerModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Trigger Pipeline Run</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Success Rate */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pipeline Pass Rate</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {analytics ? `${analytics.success_rate}%` : '--'}
            </span>
            <span className="text-xs text-emerald-400 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              Real SQLite History
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {analytics?.successful_runs || 0} passed of {analytics?.total_runs || 0} total runs
          </p>
        </div>

        {/* Avg Duration */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Execution Duration</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {analytics ? `${analytics.avg_duration_seconds}s` : '--'}
            </span>
            <span className="text-xs text-slate-400 font-medium">Parallel runners</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Mean recovery time: ~{analytics?.mttr_minutes || 15} mins
          </p>
        </div>

        {/* Active Pipelines */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered Pipelines</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {analytics?.total_pipelines ?? pipelines.length}
            </span>
            <span className="text-xs text-purple-300 font-medium">
              across {analytics?.total_repositories || 0} repos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Node.js • React • Python • Java • Docker
          </p>
        </div>

        {/* Deployments & Health */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Deployment Health</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {analytics ? `${analytics.healthy_deployments_rate}%` : '100%'}
            </span>
            <span className="text-xs text-cyan-400 font-medium">Online</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {analytics?.total_deployments || 0} production releases tracked
          </p>
        </div>
      </div>

      {/* Main Content Split: Recent Runs & Failure Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workflow Runs (2 Columns) */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Recent Workflow Runs</span>
                <span className="text-xs font-normal text-slate-400">
                  (Live SQLite History)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspect step logs, execution timings, and failure diagnoses
              </p>
            </div>
            <button
              onClick={() => onNavigate('runs')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentRuns.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No recorded workflow runs yet. Trigger a run to record pipeline execution.
              </div>
            ) : (
              recentRuns.slice(0, 6).map((run) => {
                const isSuccess = run.conclusion === 'success';
                const isFailure = run.conclusion === 'failure';
                const isRunning = run.status === 'in_progress' || run.status === 'queued';

                return (
                  <div
                    key={run.id}
                    onClick={() => onSelectRun(run.id)}
                    className="p-3.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800/90 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">
                        {isSuccess && (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {isFailure && (
                          <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                        {isRunning && (
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center animate-spin">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">
                            {run.workflow_name}
                          </span>
                          {run.repository_full_name?.startsWith('[DEMO]') && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span className="text-slate-300">{run.branch}</span>
                          <span>•</span>
                          <span className="text-slate-400">{run.commit_sha}</span>
                          <span>•</span>
                          <span className="text-slate-400">{run.duration_seconds || 0}s</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isFailure && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('analyzer');
                          }}
                          className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Diagnose</span>
                        </button>
                      )}
                      <span className="text-[11px] text-slate-500 hidden sm:inline">
                        {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Sidebar: Active Pipelines & Failure Categories */}
        <div className="space-y-6">
          {/* Active Pipelines Card */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Active Pipelines</span>
              </h3>
              <button
                onClick={() => onNavigate('pipelines')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5">
              {pipelines.slice(0, 4).map((pipe) => (
                <div
                  key={pipe.id}
                  className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-medium text-slate-200">
                    <span className="truncate">{pipe.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 uppercase">
                      {pipe.runtime}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                    <span>{pipe.repository_full_name}</span>
                    <span className="text-cyan-400">{pipe.branch}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Hotspots Analysis */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Diagnostic Categories</span>
            </h3>
            <p className="text-xs text-slate-400">
              Detected by DevFlow deterministic rule engine & Gemini AI
            </p>

            <div className="space-y-2 pt-1">
              {analytics?.failure_categories && analytics.failure_categories.length > 0 ? (
                analytics.failure_categories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      {cat.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-3">
                  Zero recent failure clusters detected.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
