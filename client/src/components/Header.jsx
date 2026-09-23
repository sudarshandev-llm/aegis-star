import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Wifi, Radio, Globe } from 'lucide-react';

export default function Header({ isConnected, defconLevel = '5', onOpenOrbitalView }) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const defconColors = {
    '5': 'border-emerald-500 text-emerald-400 bg-emerald-950/40',
    '4': 'border-amber-500 text-amber-400 bg-amber-950/40',
    '3': 'border-rose-500 text-rose-400 bg-rose-950/40 animate-pulse',
    '2': 'border-red-600 text-red-500 bg-red-950/60 animate-bounce',
    '1': 'border-red-700 text-red-600 bg-red-950/80 animate-ping'
  };

  return (
    <header className="hud-card p-4 rounded-lg mb-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-cyan-500/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-cyan-950/60 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-hud-cyan">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-widest text-cyan-400 uppercase font-mono">
              AEGIS <span className="text-xs text-slate-400 tracking-normal font-sans font-normal border border-cyan-500/30 px-2 py-0.5 rounded">v1.0</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Space-Weather & Orbital-Threat Mission Control
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 3D Orbital View Toggle Button */}
        <button
          onClick={onOpenOrbitalView}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-cyan-950/90 border border-cyan-400 text-cyan-300 hover:bg-cyan-900 text-xs font-bold font-mono transition shadow-hud-cyan animate-pulse"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>ORBITAL VIEW 3D</span>
        </button>

        {/* DEFCON Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold font-mono ${defconColors[defconLevel] || defconColors['5']}`}>
          <Radio className="w-4 h-4" />
          <span>DEFCON {defconLevel}</span>
        </div>

        {/* System Time UTC */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded text-xs text-cyan-300 font-mono">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>{utcTime || 'SYS_CLK_SYNCING...'}</span>
        </div>

        {/* Connectivity */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded text-xs font-mono">
          <Wifi className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-rose-500'}`} />
          <span className={isConnected ? 'text-emerald-400' : 'text-rose-500'}>
            {isConnected ? 'LIVE TELEMETRY' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </header>
  );
}
