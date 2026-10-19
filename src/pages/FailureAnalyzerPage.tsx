import React, { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Play,
  RotateCw,
  GitPullRequest,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { WorkflowRun, FailureDiagnosis } from '../types/client.js';

interface FailureAnalyzerPageProps {
  failedRuns: WorkflowRun[];
  selectedRunId: string | null;
  onSelectRunId: (id: string) => void;
  diagnosis: FailureDiagnosis | null;
  onRequestAiDiagnosis: (runId: string) => Promise<void>;
  onApplyRemediation: (data: {
    workflow_run_id: string;
    file_path: string;
    suggested_code: string;
    commit_message?: string;
    create_pull_request?: boolean;
  }) => Promise<{ verified_run: WorkflowRun; message: string }>;
  isAiAvailable: boolean;
}

export const FailureAnalyzerPage: React.FC<FailureAnalyzerPageProps> = ({
  failedRuns,
  selectedRunId,
  onSelectRunId,
  diagnosis,
  onRequestAiDiagnosis,
  onApplyRemediation,
  isAiAvailable,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userApproved, setUserApproved] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [remediationResult, setRemediationResult] = useState<{
    verified_run: WorkflowRun;
    message: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeRun = failedRuns.find((r) => r.id === selectedRunId) || failedRuns[0];

  const handleAiAnalyze = async () => {
    if (!activeRun) return;
    try {
      setIsAiLoading(true);
      setErrorMsg(null);
      await onRequestAiDiagnosis(activeRun.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI diagnosis failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyFix = async () => {
    if (!activeRun || !diagnosis || !userApproved) return;
    const fix = diagnosis.proposed_fixes?.[0];
    if (!fix) return;

    try {
      setIsApplying(true);
      setErrorMsg(null);
      const res = await onApplyRemediation({
        workflow_run_id: activeRun.id,
        file_path: fix.file_path,
        suggested_code: fix.suggested_code,
        commit_message: `fix(${diagnosis.failure_category}): ${fix.explanation}`,
        create_pull_request: false,
      });
      setRemediationResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply remediation');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Failure Analyzer & Safe Remediation</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
            {failedRuns.length} failed runs
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Deterministic root-cause classification paired with Gemini AI code proposals, diff inspection, and verified rerun execution.
        </p>
      </div>

      {failedRuns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Zero Failing Runs Recorded</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All pipelines are currently healthy and passing. You can trigger a simulated failure run from the top bar to test the deterministic diagnosis engine and Gemini remediation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Failed Runs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Failed Run
            </h3>

            <div className="space-y-2">
              {failedRuns.map((run) => {
                const isSelected = activeRun?.id === run.id;
                return (
                  <div
                    key={run.id}
                    onClick={() => {
                      onSelectRunId(run.id);
                      setRemediationResult(null);
                      setUserApproved(false);
                    }}
                    className={`p-3.5 rounded-xl border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-rose-500/50 shadow-md shadow-rose-950/20'
                        : 'bg-slate-900/80 hover:bg-slate-800/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span className="truncate">{run.workflow_name}</span>
                      <span className="text-[10px] text-rose-400 font-mono">Failed</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                      <span>{run.branch}</span>
                      <span>{run.commit_sha}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (2 Spans): Diagnostic Detail & Remediation Flow */}
          <div className="lg:col-span-2 space-y-6">
            {activeRun && (
              <>
                {/* Diagnostic Overview Card */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {diagnosis?.failure_category.replace(/_/g, ' ') || 'Build Failure'}
                        </span>
                        {diagnosis?.ai_assisted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Gemini Enhanced
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          Confidence: {Math.round((diagnosis?.confidence || 0.85) * 100)}%
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">
                        {diagnosis?.error_summary || 'Analyzing pipeline execution failure...'}
                      </h2>
                    </div>

                    {/* Gemini Analyze Trigger */}
                    <button
                      onClick={handleAiAnalyze}
                      disabled={isAiLoading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                      <span>{isAiLoading ? 'Analyzing with Gemini...' : 'Deep Gemini AI Analysis'}</span>
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
                      {errorMsg}
                    </div>
                  )}

                  {/* Sanitized Log Excerpt (Fact vs Cause) */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      <span>Evidence Extracted From Logs (Facts)</span>
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-rose-300/90 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {diagnosis?.sanitized_log_excerpt || 'No log evidence available.'}
                    </div>
                  </div>

                  {/* Likely Root Causes */}
                  {diagnosis?.likely_causes && diagnosis.likely_causes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Probable Root Causes
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {diagnosis.likely_causes.map((cause, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold shrink-0">•</span>
                            <span>{cause}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {diagnosis?.recommended_actions && diagnosis.recommended_actions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Recommended Resolution Steps
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {diagnosis.recommended_actions.map((act, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Proposed Code Remediation & Diff Inspection */}
                {diagnosis?.proposed_fixes && diagnosis.proposed_fixes.length > 0 ? (
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">
                          Proposed Patch: {diagnosis.proposed_fixes[0].file_path}
                        </h3>
                      </div>
                      <span className="text-xs text-cyan-400 font-medium">
                        Verification Ready
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {diagnosis.proposed_fixes[0].explanation}
                    </p>

                    {/* Diff Inspector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      {/* Original Code */}
                      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="bg-slate-900/80 px-3 py-1.5 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                          Current / Broken Code
                        </div>
                        <pre className="p-3 text-rose-300/80 overflow-x-auto whitespace-pre-wrap">
                          {diagnosis.proposed_fixes[0].original_code}
                        </pre>
                      </div>

                      {/* Suggested Code */}
                      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                        <div className="bg-emerald-950/40 px-3 py-1.5 border-b border-emerald-900/60 text-emerald-400 text-[11px] font-semibold">
                          Proposed Fix (DevFlow Patch)
                        </div>
                        <pre className="p-3 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                          {diagnosis.proposed_fixes[0].suggested_code}
                        </pre>
                      </div>
                    </div>

                    {/* Verification Checklist */}
                    {diagnosis.proposed_fixes[0].verification_steps && (
                      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1">
                        <span className="font-semibold text-slate-200">Pre-verification checks:</span>
                        {diagnosis.proposed_fixes[0].verification_steps.map((step, idx) => (
                          <div key={idx} className="text-slate-400 font-mono text-[11px]">
                            • {step}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Explicit User Approval & Execution */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-slate-200">
                          Explicit Developer Approval Required
                        </span>
                      </div>

                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={userApproved}
                          onChange={(e) => setUserApproved(e.target.checked)}
                          className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                        />
                        <span>
                          I have reviewed the code diff above and approve applying this remediation commit to branch{' '}
                          <code className="text-cyan-400">{activeRun.branch}</code> and running an automated verification rerun.
                        </span>
                      </label>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          onClick={handleApplyFix}
                          disabled={!userApproved || isApplying}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                        >
                          <Play className={`w-3.5 h-3.5 fill-current ${isApplying ? 'animate-spin' : ''}`} />
                          <span>{isApplying ? 'Applying & Running CI...' : 'Apply Fix & Verify Rerun'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Verified Remediation Outcome */}
                    {remediationResult && (
                      <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs space-y-2 animate-fadeIn">
                        <div className="flex items-center gap-2 font-bold text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Remediation Verified Successfully!</span>
                        </div>
                        <p>{remediationResult.message}</p>
                        <div className="text-[11px] font-mono text-emerald-300/80 pt-1">
                          Verified Workflow Run ID:{' '}
                          <span className="text-white font-bold">{remediationResult.verified_run.id}</span> •
                          Conclusion: SUCCESS • Duration: {remediationResult.verified_run.duration_seconds}s
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
                    No automated code patch suggested for this category. Follow recommended steps above or click "Deep Gemini AI Analysis".
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
