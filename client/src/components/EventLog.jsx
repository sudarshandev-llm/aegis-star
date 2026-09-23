import React, { useState } from 'react';
import { History, Search, ShieldAlert, Filter, AlertTriangle } from 'lucide-react';

export default function EventLog({ events = [] }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = events.filter(evt => {
    const matchesSeverity = filterSeverity === 'ALL' || evt.severity === filterSeverity.toLowerCase();
    const matchesSearch = 
      evt.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="hud-card p-4 rounded-lg flex flex-col h-[380px] mt-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            MISSION TELEMETRY EVENT LOG ({filteredEvents.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search log..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-40 font-mono"
            />
          </div>

          {/* Severity Filters */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded border border-slate-800 font-mono text-[10px]">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  filterSeverity === sev 
                    ? sev === 'HIGH' ? 'bg-rose-500 text-slate-950' : sev === 'MEDIUM' ? 'bg-amber-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            No telemetry logs match current filters
          </div>
        ) : (
          filteredEvents.map(evt => {
            const isHigh = evt.severity === 'high';
            const isMed = evt.severity === 'medium';
            
            return (
              <div
                key={evt.id}
                className={`p-2.5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs transition duration-150 ${
                  isHigh 
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-100' 
                    : isMed 
                      ? 'bg-amber-950/15 border-amber-500/30 text-amber-100' 
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-start md:items-center gap-3 flex-1">
                  {/* Timestamp */}
                  <span className="text-[10px] text-slate-400 whitespace-nowrap pt-0.5 md:pt-0">
                    {new Date(evt.timestamp).toISOString().replace('T', ' ').substring(0, 19)} UTC
                  </span>

                  {/* Severity Badge */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                    isHigh ? 'bg-rose-500 text-slate-950' : isMed ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {evt.severity}
                  </span>

                  {/* Type */}
                  <span className="text-[11px] text-cyan-300 font-bold whitespace-nowrap">
                    [{evt.source}]
                  </span>

                  {/* Summary */}
                  <p className="text-xs leading-snug flex-1">
                    {evt.summary}
                  </p>
                </div>

                {/* Simulation indicator if applicable */}
                {evt.is_simulated && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded whitespace-nowrap bg-amber-950/30">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    SIMULATED
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
