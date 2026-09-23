import React from 'react';
import { Bot, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function BriefingBanner({ briefing, onRefresh, isRefreshing }) {
  const content = briefing?.content || 'Awaiting initial telemetry briefing from Briefing Officer agent...';
  const isSimulated = Boolean(briefing?.is_simulated);
  const timestamp = briefing?.timestamp ? new Date(briefing.timestamp).toLocaleTimeString() : 'N/A';

  return (
    <div className="hud-card p-5 rounded-lg mb-6 border border-cyan-500/40 bg-slate-900/80">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-400 flex items-center justify-center text-amber-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
                BRIEFING OFFICER SHIFT REPORT
              </h2>
              <span className="text-[10px] text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">
                MODEL: claude-sonnet-4-6
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">Lead Flight Director Operational Synthesis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-xs font-bold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>LIVE STREAM</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-300 hover:bg-cyan-900 text-xs font-mono font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'SYNTHESIZING...' : 'REFRESH BRIEFING'}</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-950/60 p-4 rounded border border-slate-800 text-sm leading-relaxed text-slate-200 font-sans">
        <p className="font-mono text-cyan-200">{content}</p>
      </div>

      <div className="mt-2 text-right">
        <span className="text-[10px] text-slate-400 font-mono">
          LAST BRIEFING GENERATED AT {timestamp} UTC
        </span>
      </div>
    </div>
  );
}
