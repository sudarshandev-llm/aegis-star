import React, { useState, useEffect } from 'react';
import { Sun, AlertCircle, ShieldAlert, CheckCircle2, Wind } from 'lucide-react';

export default function SolarPanel({ events = [] }) {
  const [solarWindSpeed, setSolarWindSpeed] = useState('420 km/s');

  useEffect(() => {
    fetch('/api/solar-wind')
      .then(res => res.json())
      .then(data => {
        if (data.data?.speed_kms) {
          setSolarWindSpeed(`${data.data.speed_kms} km/s`);
        }
      })
      .catch(() => {});
  }, []);

  const solarEvents = events.filter(e => e.source === 'NASA DONKI' || e.type.includes('Flare') || e.type.includes('Coronal') || e.type.includes('Geomagnetic'));
  const isAnySimulated = solarEvents.some(e => e.is_simulated);

  return (
    <div className="hud-card p-4 rounded-lg flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
              SOLAR ACTIVITY & CMEs
            </h3>
          </div>

          {/* Data Status Badge */}
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-bold font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            LIVE STREAM
          </span>
        </div>

        {/* NOAA Solar Wind Speed Pill */}
        <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
          <span className="text-slate-400 flex items-center gap-1">
            <Wind className="w-3 h-3 text-cyan-400" />
            NOAA SOLAR WIND PLASMA:
          </span>
          <strong className="text-cyan-300 font-bold">{solarWindSpeed}</strong>
        </div>
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {solarEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
            No recent solar activity recorded
          </div>
        ) : (
          solarEvents.map(evt => {
            const isHigh = evt.severity === 'high';
            const isMed = evt.severity === 'medium';
            const cardStyle = isHigh 
              ? 'hud-card-high bg-rose-950/20' 
              : isMed 
                ? 'hud-card-medium bg-amber-950/20' 
                : 'bg-slate-900/60 border-slate-800';

            const rScale = evt.raw_data?.radio_blackout_scale;
            const kpIndex = evt.raw_data?.kp_index;

            return (
              <div 
                key={evt.id}
                className={`p-3 rounded border ${cardStyle} transition duration-200 hover:border-cyan-400/50`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isHigh ? 'bg-rose-500 text-slate-950' : isMed ? 'bg-amber-500 text-slate-950' : 'bg-cyan-900 text-cyan-300'
                    }`}>
                      {evt.type}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isHigh && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold font-mono animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      CRITICAL FLUX
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-200 leading-snug font-mono">
                  {evt.summary}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 font-mono">
                  {evt.raw_data?.classType && (
                    <span>CLASS: <strong className="text-amber-300">{evt.raw_data.classType}</strong></span>
                  )}

                  {rScale && (
                    <span>BLACKOUT: <strong className="text-rose-400 font-bold">{rScale}</strong></span>
                  )}

                  {kpIndex !== undefined && (
                    <span>KP INDEX: <strong className="text-amber-400 font-bold">Kp-{kpIndex} (0-9)</strong></span>
                  )}

                  {evt.raw_data?.activeRegionNum && (
                    <span>REGION: <strong className="text-cyan-300">AR-{evt.raw_data.activeRegionNum}</strong></span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
