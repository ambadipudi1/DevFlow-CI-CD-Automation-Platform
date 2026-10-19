import React, { useState } from 'react';
import {
  CloudUpload,
  CheckCircle2,
  XCircle,
  Activity,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Server,
} from 'lucide-react';
import { Deployment } from '../types/client.js';

interface DeploymentsPageProps {
  deployments: Deployment[];
  onTriggerHealthCheck: (id: string) => Promise<void>;
  onSelectRun: (runId: string) => void;
}

export const DeploymentsPage: React.FC<DeploymentsPageProps> = ({
  deployments,
  onTriggerHealthCheck,
  onSelectRun,
}) => {
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleHealthCheck = async (id: string) => {
    try {
      setCheckingId(id);
      await onTriggerHealthCheck(id);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Deployments & Service Health</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {deployments.length} releases
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Production and staging deployment records, automated endpoint health check validation, and runtime telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployments.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No deployments recorded yet. Enable deployment on any pipeline to start tracking releases.
          </div>
        ) : (
          deployments.map((dep) => {
            const isHealthy = dep.health_check_status === 'healthy';
            const isUnhealthy = dep.health_check_status === 'unhealthy';
            const isChecking = checkingId === dep.id;

            return (
              <div
                key={dep.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {dep.environment}
                    </span>

                    {/* Health Pill */}
                    <div className="flex items-center gap-1.5">
                      {isHealthy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          HEALTHY
                        </span>
                      )}
                      {isUnhealthy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          UNHEALTHY
                        </span>
                      )}
                      {!isHealthy && !isUnhealthy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                          UNKNOWN
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">{dep.pipeline_name || 'Production Pipeline'}</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                      Target: {dep.deployment_target}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Revision SHA:</span>
                      <span className="text-slate-300">{dep.revision || 'main-latest'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="text-emerald-400 font-semibold uppercase">{dep.status}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  {dep.deployment_url ? (
                    <a
                      href={dep.deployment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-blue-400 flex items-center gap-1 transition"
                    >
                      <span>Endpoint</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500">Internal IP</span>
                  )}

                  <button
                    onClick={() => handleHealthCheck(dep.id)}
                    disabled={isChecking}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 text-emerald-400 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Probing...' : 'Probe Health'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
