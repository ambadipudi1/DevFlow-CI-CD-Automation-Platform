import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Box,
  CloudUpload,
  Play,
} from 'lucide-react';
import { WorkflowRun, FailureDiagnosis, DockerBuild } from '../types/client.js';

interface WorkflowRunDetailsPageProps {
  run: WorkflowRun;
  logs: { raw_log: string; sanitized_log: string } | null;
  diagnosis: FailureDiagnosis | null;
  dockerBuilds: DockerBuild[];
  onBack: () => void;
  onNavigateToAnalyzer: (runId: string) => void;
  onRerun: (pipelineId: string) => void;
}

export const WorkflowRunDetailsPage: React.FC<WorkflowRunDetailsPageProps> = ({
  run,
  logs,
  diagnosis,
  dockerBuilds,
  onBack,
  onNavigateToAnalyzer,
  onRerun,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const isSuccess = run.conclusion === 'success';
  const isFailure = run.conclusion === 'failure';
  const logContent = logs?.sanitized_log || logs?.raw_log || 'No logs recorded for this workflow run.';

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLines = logContent.split('\n').filter((line) => {
    if (!searchTerm.trim()) return true;
    return line.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{run.workflow_name}</h1>
              {run.repository_full_name?.startsWith('[DEMO]') && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DEMO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {run.repository_full_name} • Branch: {run.branch} • SHA: {run.commit_sha}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFailure && (
            <button
              onClick={() => onNavigateToAnalyzer(run.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Analyze Failure & Propose Fix</span>
            </button>
          )}

          <button
            onClick={() => onRerun(run.pipeline_id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Rerun Workflow</span>
          </button>
        </div>
      </div>

      {/* Meta Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-500 block mb-1">Conclusion</span>
          <div className="flex items-center gap-1.5">
            {isSuccess && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Success</span>
              </>
            )}
            {isFailure && (
              <>
                <XCircle className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-bold text-rose-400">Failed</span>
              </>
            )}
            {!isSuccess && !isFailure && (
              <>
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-blue-400 capitalize">{run.status}</span>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-500 block mb-1">Duration</span>
          <span className="text-sm font-bold text-white font-mono">
            {run.duration_seconds !== null ? `${run.duration_seconds}s` : '--'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-500 block mb-1">Started At</span>
          <span className="text-xs text-slate-300 font-mono">
            {run.started_at ? new Date(run.started_at).toLocaleTimeString() : '--'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] text-slate-500 block mb-1">GitHub Execution Link</span>
          {run.run_url ? (
            <a
              href={run.run_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 truncate font-mono"
            >
              <span>GitHub Actions</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-slate-500">Local Sandbox</span>
          )}
        </div>
      </div>

      {/* Failure Diagnostic Card if failed */}
      {isFailure && diagnosis && (
        <div className="p-5 rounded-xl bg-rose-950/40 border border-rose-800/80 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-sm font-bold text-rose-200">
                Deterministic Failure Analysis Recorded
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-900/60 text-rose-300 border border-rose-700/60 uppercase">
                {diagnosis.failure_category.replace(/_/g, ' ')}
              </span>
            </div>
            <button
              onClick={() => onNavigateToAnalyzer(run.id)}
              className="text-xs text-rose-300 hover:text-white underline font-medium cursor-pointer"
            >
              Open Fix Proposal →
            </button>
          </div>

          <p className="text-xs text-rose-100 font-mono bg-rose-950/60 p-3 rounded-lg border border-rose-800/40">
            {diagnosis.error_summary}
          </p>

          <div className="text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Likely Cause:</span>{' '}
            {diagnosis.likely_causes[0]}
          </div>
        </div>
      )}

      {/* Docker Build Output if present */}
      {dockerBuilds.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Box className="w-4 h-4 text-cyan-400" />
            <span>Associated Docker Build</span>
          </h3>
          {dockerBuilds.map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs font-mono"
            >
              <div>
                <span className="text-cyan-300 font-semibold">{d.image_name}:{d.image_tag}</span>
                <p className="text-[10px] text-slate-400">{d.registry_url}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sanitized Log Console */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 shadow-xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Sanitized Runner Output (Credentials Redacted)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 w-36 sm:w-48"
              />
            </div>

            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto space-y-1">
          {filteredLines.map((line, idx) => {
            const isErr = line.includes('ERR!') || line.includes('FAIL') || line.includes('Error:') || line.includes('error TS');
            const isSuccessLine = line.includes('PASS') || line.includes('OK') || line.includes('success');
            const isRedacted = line.includes('[REDACTED');

            return (
              <div
                key={idx}
                className={`flex gap-3 leading-relaxed hover:bg-slate-900/60 px-1 rounded ${
                  isErr ? 'text-rose-400 bg-rose-950/20' : isSuccessLine ? 'text-emerald-400' : ''
                }`}
              >
                <span className="text-slate-600 select-none text-[11px] w-8 text-right shrink-0">
                  {idx + 1}
                </span>
                <span className="whitespace-pre-wrap break-all">
                  {line}
                  {isRedacted && (
                    <span className="ml-2 px-1 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      SECRET REDACTED
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
