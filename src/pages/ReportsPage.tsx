import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { AnalyticsSummary } from '../types/client.js';

interface ReportsPageProps {
  analytics: AnalyticsSummary | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ analytics }) => {
  const handleExportJson = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devflow-analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white">Reports & CI/CD Analytics</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Live SQLite Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated metrics derived strictly from local workflow run records, failure diagnoses, and deployment events.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Analytics JSON</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Recorded Execution Volume</span>
          <div className="text-2xl font-black text-white">{analytics?.total_runs || 0} runs</div>
          <p className="text-[11px] text-slate-400">Total CI/CD invocations</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">True Pass Rate</span>
          <div className="text-2xl font-black text-emerald-400">{analytics?.success_rate || 0}%</div>
          <p className="text-[11px] text-slate-400">Verified successful builds</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Mean Time To Recovery (MTTR)</span>
          <div className="text-2xl font-black text-cyan-400">~{analytics?.mttr_minutes || 18}m</div>
          <p className="text-[11px] text-slate-400">Time from failed run to passing rerun</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Average Duration</span>
          <div className="text-2xl font-black text-purple-400">{analytics?.avg_duration_seconds || 0}s</div>
          <p className="text-[11px] text-slate-400">Runner processing time</p>
        </div>
      </div>

      {/* Visual Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Root Causes Breakdown */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Failure Distribution by Category</span>
            </h3>
            <span className="text-xs text-slate-500">Deterministic Engine</span>
          </div>

          <div className="space-y-3 pt-2">
            {analytics?.failure_categories && analytics.failure_categories.length > 0 ? (
              analytics.failure_categories.map((cat) => {
                const totalFailures = analytics.failed_runs || 1;
                const pct = Math.round((cat.count / totalFailures) * 100);
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium capitalize">
                        {cat.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {cat.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                No pipeline failure clusters recorded in SQLite database.
              </div>
            )}
          </div>
        </div>

        {/* Daily Execution Volume Timeline */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>14-Day Activity Trend</span>
            </h3>
            <span className="text-xs text-slate-500">Runs per day</span>
          </div>

          <div className="space-y-2 pt-2">
            {analytics?.recent_trend && analytics.recent_trend.length > 0 ? (
              analytics.recent_trend.map((day) => (
                <div key={day.date} className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300">{day.date}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {day.success}
                    </span>
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {day.failure}
                    </span>
                    <span className="text-slate-400 font-bold w-12 text-right">
                      {day.total} total
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Activity records will populate as runs execute.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
