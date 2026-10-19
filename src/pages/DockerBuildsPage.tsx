import React from 'react';
import { Box, ExternalLink, ShieldCheck, CheckCircle2, Clock, Layers } from 'lucide-react';
import { DockerBuild } from '../types/client.js';

interface DockerBuildsPageProps {
  dockerBuilds: DockerBuild[];
  onSelectRun: (runId: string) => void;
}

export const DockerBuildsPage: React.FC<DockerBuildsPageProps> = ({ dockerBuilds, onSelectRun }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Docker Builds & Registries</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {dockerBuilds.length} images
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          OCI-compliant container images built by DevFlow pipelines, pushed to container registries (GHCR / Docker Hub) with cryptographic digests.
        </p>
      </div>

      <div className="rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Image Name & Tag</th>
                <th className="py-3 px-4">Registry URL</th>
                <th className="py-3 px-4">Digest / Checksum</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Workflow Run</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {dockerBuilds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No container images built yet. Enable Docker on any pipeline to start building images.
                  </td>
                </tr>
              ) : (
                dockerBuilds.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white">{d.image_name}</span>
                          <span className="text-cyan-400 font-semibold">:{d.image_tag}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {d.registry_url || 'local/docker-daemon'}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={d.image_digest || ''}>
                      {d.image_digest ? d.image_digest.slice(0, 19) + '...' : 'pending'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        {d.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectRun(d.workflow_run_id)}
                        className="text-blue-400 hover:text-blue-300 font-mono text-xs underline cursor-pointer"
                      >
                        {d.workflow_name || d.workflow_run_id}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(d.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
