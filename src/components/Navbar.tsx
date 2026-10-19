import React from 'react';
import { Database, GitBranch, Sparkles, Play, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { IntegrationStatus } from '../types/client.js';

interface NavbarProps {
  status: IntegrationStatus | null;
  onRefresh: () => void;
  onOpenTriggerModal: () => void;
  onToggleDemoModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  onRefresh,
  onOpenTriggerModal,
  onToggleDemoModal,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">DevFlow</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              CI/CD Platform
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
            SQLite Powered • GitHub Actions • Docker • Gemini AI
          </p>
        </div>
      </div>

      {/* Integration Badges & Quick Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SQLite Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 hidden md:inline">SQLite:</span>
          <span className="text-emerald-400 font-mono font-medium">WAL Mode</span>
        </div>

        {/* GitHub Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs">
          {status?.github.isConnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 hidden md:inline">GitHub:</span>
              <span className="text-slate-200 font-mono">@{status.github.user?.login || 'Connected'}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">GitHub:</span>
              <span className="text-slate-400">Sandbox</span>
            </>
          )}
        </div>

        {/* Gemini AI Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs">
          <Sparkles className={`w-3.5 h-3.5 ${status?.gemini.isConfigured ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="text-slate-300 hidden lg:inline">Gemini AI:</span>
          <span className={status?.gemini.isConfigured ? 'text-purple-300 font-medium' : 'text-slate-400'}>
            {status?.gemini.isConfigured ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Demo Mode Badge */}
        {status?.demo_mode.is_seeded && (
          <button
            onClick={onToggleDemoModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-300 border border-amber-800/80 text-xs hover:bg-amber-900/60 transition cursor-pointer"
            title="Click to manage or reset demo sandbox"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-semibold">DEMO MODE</span>
          </button>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Refresh real-time data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Quick Trigger Button */}
        <button
          onClick={onOpenTriggerModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run Pipeline</span>
        </button>
      </div>
    </header>
  );
};
