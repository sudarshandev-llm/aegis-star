import React from 'react';
import { Compass, AlertCircle, ShieldAlert, CheckCircle2, Globe, AlertTriangle, Target } from 'lucide-react';

export default function NeoPanel({ events = [], onFocusTarget }) {
  const neoEvents = events.filter(e => e.source === 'NASA NeoWs' || e.type.includes('Near-Earth'));
  const isAnySimulated = neoEvents.some(e => e.is_simulated);

  return (
    <div className="hud-card p-4 rounded-lg flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            NEAR-EARTH OBJECTS (NEO)
          </h3>
        </div>

        {/* Data Status Badge */}
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-bold font-mono">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          LIVE STREAM
        </span>
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {neoEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs font-mono">
            No close-approach asteroids reported today
          </div>
        ) : (
          neoEvents.map(evt => {
            const isHigh = evt.severity === 'high';
            const isMed = evt.severity === 'medium';
            const cardStyle = isHigh 
              ? 'hud-card-high bg-rose-950/20' 
              : isMed 
                ? 'hud-card-medium bg-amber-950/20' 
                : 'bg-slate-900/60 border-slate-800';

            const missDist = evt.raw_data?.miss_distance_lunar || 'N/A';
            const velKmh = evt.raw_data?.velocity_kmh || 'N/A';
            const velKms = evt.raw_data?.velocity_kms || (typeof evt.raw_data?.velocity_kmh === 'string' ? (parseFloat(evt.raw_data.velocity_kmh.replace(/,/g, '')) / 3600).toFixed(2) : 'N/A');
            const diameter = evt.raw_data?.diameter_max_m || 'N/A';
            const magH = evt.raw_data?.absolute_magnitude_h || 'N/A';
            const isHazardous = Boolean(evt.raw_data?.is_potentially_hazardous);

            const vectorColor = isHigh ? '#ff2a6d' : isMed ? '#ffb703' : '#00f3ff';

            return (
              <div 
                key={evt.id}
                className={`p-3 rounded border ${cardStyle} transition duration-200 hover:border-cyan-400/50`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      isHigh ? 'bg-rose-500 text-slate-950' : isMed ? 'bg-amber-500 text-slate-950' : 'bg-cyan-900 text-cyan-300'
                    }`}>
                      {evt.raw_data?.name || 'ASTEROID'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {missDist !== 'N/A' ? `${typeof missDist === 'number' ? missDist.toFixed(1) : missDist} LD` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onFocusTarget && (
                      <button
                        onClick={() => onFocusTarget({ type: 'neo', id: evt.id, name: evt.raw_data?.name || 'ASTEROID', data: evt })}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 transition font-bold font-mono"
                        title="Focus camera on this asteroid in 3D Orbital View"
                      >
                        <Target className="w-3 h-3 text-cyan-400" />
                        <span>TRACK IN 3D</span>
                      </button>
                    )}

                    {isHazardous && (
                      <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-rose-950 border border-rose-500/80 text-rose-300 font-bold font-mono animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        POTENTIALLY HAZARDOUS
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-snug font-mono mb-2">
                  {evt.summary}
                </p>

                {/* Animated Trajectory Approach Vector to Earth */}
                <div className="my-2 p-1.5 bg-slate-950/90 rounded border border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                    APPROACH VECTOR
                  </div>

                  <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                    <svg viewBox="0 0 100 12" className="w-full h-3 overflow-visible">
                      <line
                        x1="5"
                        y1="6"
                        x2="85"
                        y2="6"
                        stroke={vectorColor}
                        strokeWidth="1.5"
                        className="vector-dash-animate"
                      />
                      <polygon points="85,2 93,6 85,10" fill={vectorColor} />
                    </svg>

                    <Globe className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 font-mono">
                  <div>VELOCITY: <strong className="text-cyan-300">{velKms} km/s</strong> <span className="text-slate-500">({velKmh} km/h)</span></div>
                  <div>MAX DIA: <strong className="text-amber-300">{diameter}m</strong></div>
                  <div>ABS MAG: <strong className="text-cyan-300">{magH} H</strong></div>
                  <div>HAZARD: <strong className={isHazardous ? 'text-rose-400' : 'text-emerald-400'}>{isHazardous ? 'YES' : 'NO'}</strong></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
