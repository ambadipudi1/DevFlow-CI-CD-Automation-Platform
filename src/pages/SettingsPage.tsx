import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Shield,
  Download,
  RotateCcw,
  CheckCircle2,
  FileText,
  Lock,
  Layers,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api.js';
import { AuditLog } from '../types/client.js';

interface SettingsPageProps {
  auditLogs: AuditLog[];
  onRefresh: () => void;
  onSeedDemo: () => Promise<void>;
  onPurgeDemo: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  auditLogs,
  onRefresh,
  onSeedDemo,
  onPurgeDemo,
}) => {
  const [dbInfo, setDbInfo] = useState<{
    path: string;
    tables: Record<string, number>;
    migrations: { id: number; name: string; applied_at: string }[];
    pragmas: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    try {
      const info = await api.getDatabaseInfo();
      setDbInfo(info);
    } catch (err: any) {
      console.error('Failed to load db info:', err);
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await onSeedDemo();
      setMsg('Demo workspace initialized successfully.');
      await loadDbInfo();
      onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm('Are you sure you want to remove all DEMO records? Real user repositories will not be affected.')) return;
    try {
      setLoading(true);
      await onPurgeDemo();
      setMsg('Demo records purged successfully.');
      await loadDbInfo();
      onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold text-white">Settings & SQLite Architecture</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Local ACID Storage
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Zero external database dependencies. DevFlow uses SQLite with foreign key enforcement, WAL journal mode, and SQL migration versioning.
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection & Pragmas */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">SQLite Engine Configuration</h3>
              <p className="text-xs text-slate-400">Database location and runtime parameters</p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px]">Database Path (DATABASE_PATH):</div>
              <div className="text-emerald-400 font-bold truncate">
                {dbInfo?.path || './data/devflow.db'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 block">Foreign Keys:</span>
                <span className="text-white font-semibold">PRAGMA foreign_keys = ON</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 block">Journaling:</span>
                <span className="text-white font-semibold">PRAGMA journal_mode = WAL</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 block">Busy Timeout:</span>
                <span className="text-white font-semibold">5000ms</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 block">Query Safety:</span>
                <span className="text-white font-semibold">Prepared Statements</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Manage Demo Sandbox Data:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeed}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
              >
                Seed Demo
              </button>
              <button
                onClick={handlePurge}
                disabled={loading}
                className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 text-xs font-medium border border-rose-800/80 transition cursor-pointer"
              >
                Reset Demo
              </button>
            </div>
          </div>
        </div>

        {/* Tables & Migrations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Schema Tables & Row Counts</h3>
              <p className="text-xs text-slate-400">SQLite live schema inventory</p>
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {dbInfo?.tables &&
              Object.entries(dbInfo.tables).map(([table, count]) => (
                <div
                  key={table}
                  className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-800 text-xs font-mono flex items-center justify-between"
                >
                  <span className="text-slate-300">{table}</span>
                  <span className="text-cyan-400 font-bold">{count} rows</span>
                </div>
              ))}
          </div>

          {/* Applied Migrations List */}
          <div className="pt-2 border-t border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-300 block">Applied Migrations (_migrations):</span>
            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              {dbInfo?.migrations.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-slate-300">✓ {m.name}</span>
                  <span className="text-slate-500">{new Date(m.applied_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table (Secret-Free Guarantee) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Security Audit Log</h3>
              <p className="text-xs text-slate-400">
                Sensitive actions tracked without recording tokens, passwords, or private keys
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">{auditLogs.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Metadata (Redacted)</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono font-semibold text-white">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">
                    {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                        log.result === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={log.metadata_json || ''}>
                    {log.metadata_json || '--'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {new Date(log.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
