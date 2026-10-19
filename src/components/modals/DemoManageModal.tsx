import React, { useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw, X, CheckCircle2 } from 'lucide-react';

interface DemoManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurge: () => Promise<void>;
  onSeed: () => Promise<void>;
}

export const DemoManageModal: React.FC<DemoManageModalProps> = ({
  isOpen,
  onClose,
  onPurge,
  onSeed,
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handlePurge = async () => {
    try {
      setLoading(true);
      await onPurge();
      setMsg('Demo data purged cleanly. Real records preserved.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await onSeed();
      setMsg('Demo data re-seeded cleanly.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Demonstration Sandbox</h2>
              <p className="text-xs text-slate-400">Isolated sample data management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
          <p>
            DevFlow clearly distinguishes real GitHub repository data from sample workflows:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>All demo repositories begin with <code className="text-amber-300">[DEMO]</code></li>
            <li>Sample runs and diagnoses are kept isolated in SQLite</li>
            <li>Purging demo data will NOT touch any of your registered GitHub repositories</li>
          </ul>
        </div>

        {msg && (
          <div className="p-3 rounded-lg bg-slate-800 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{msg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={handlePurge}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-800/80 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Demo Data</span>
          </button>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-seed Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
