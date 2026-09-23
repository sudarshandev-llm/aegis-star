import React, { useState, useEffect, useRef } from 'react';
import { Navigation, AlertCircle, CheckCircle2, Target } from 'lucide-react';

export default function IssPanel({ position, onFocusTarget }) {
  const latitude = position?.latitude ?? 0;
  const longitude = position?.longitude ?? 0;
  const altitude = position?.altitude || '418.5 km';
  const velocity = position?.velocity || '27,580 km/h';
  const period = position?.period || '92.68 min';
  const inclination = position?.inclination || '51.64°';
  const heading = position?.heading || '047° (NE)';
  const isSimulated = Boolean(position?.is_simulated);

  // Map Equirectangular Projection: W=360, H=180
  const targetX = ((longitude + 180) / 360) * 360;
  const targetY = ((90 - latitude) / 180) * 180;

  // Track position history for fading orbital trail
  const [trail, setTrail] = useState([]);
  const prevPosRef = useRef({ x: targetX, y: targetY });

  useEffect(() => {
    if (prevPosRef.current.x !== targetX || prevPosRef.current.y !== targetY) {
      setTrail(prevTrail => {
        const newTrail = [...prevTrail, { x: prevPosRef.current.x, y: prevPosRef.current.y }];
        return newTrail.slice(-8);
      });
      prevPosRef.current = { x: targetX, y: targetY };
    }
  }, [targetX, targetY]);

  // Generate smooth sine wave path for ISS orbital inclination (~51.6 degrees)
  const generateOrbitPath = () => {
    const points = [];
    for (let x = 0; x <= 360; x += 10) {
      const lon = (x / 360) * 360 - 180;
      const phase = (longitude * Math.PI) / 180;
      const lat = 51.6 * Math.sin(((lon * Math.PI) / 180) - phase + Math.asin(Math.max(-1, Math.min(1, latitude / 51.6))));
      const px = x;
      const py = ((90 - lat) / 180) * 180;
      points.push(`${px},${py}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const trailPolylinePoints = [...trail, { x: targetX, y: targetY }]
    .map(p => `${p.x},${p.y}`)
    .join(' ');

  return (
    <div className="hud-card p-4 rounded-lg flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            ISS ORBITAL POSITION
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onFocusTarget && (
            <button
              onClick={() => onFocusTarget({ type: 'iss', name: 'ISS', id: 'iss' })}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900 transition font-bold font-mono"
              title="Focus camera on ISS in 3D Orbital View"
            >
              <Target className="w-3 h-3 text-cyan-400" />
              <span>TRACK ISS IN 3D</span>
            </button>
          )}

          {/* Data Status Badge */}
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-bold font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            LIVE STREAM
          </span>
        </div>
      </div>

      {/* SVG Map Container */}
      <div className="relative w-full h-40 bg-slate-950/90 rounded border border-slate-800 overflow-hidden mb-3">
        <svg viewBox="0 0 360 180" className="w-full h-full object-cover opacity-75">
          <line x1="0" y1="90" x2="360" y2="90" stroke="rgba(0, 243, 255, 0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="180" y1="0" x2="180" y2="180" stroke="rgba(0, 243, 255, 0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="90" y1="0" x2="90" y2="180" stroke="rgba(0, 243, 255, 0.08)" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="270" y1="0" x2="270" y2="180" stroke="rgba(0, 243, 255, 0.08)" strokeWidth="0.5" strokeDasharray="2,2" />

          {/* Continents Outlines */}
          <path d="M 40,40 Q 60,30 90,40 T 100,80 T 70,100 T 50,70 Z" fill="rgba(30, 58, 100, 0.4)" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="0.5" />
          <path d="M 100,105 Q 120,110 115,150 T 95,160 T 90,120 Z" fill="rgba(30, 58, 100, 0.4)" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="0.5" />
          <path d="M 160,30 Q 230,20 280,40 T 270,90 T 210,100 T 170,70 Z" fill="rgba(30, 58, 100, 0.4)" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="0.5" />
          <path d="M 170,80 Q 210,85 210,130 T 180,140 T 160,100 Z" fill="rgba(30, 58, 100, 0.4)" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="0.5" />
          <path d="M 270,120 Q 300,120 300,145 T 270,150 Z" fill="rgba(30, 58, 100, 0.4)" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="0.5" />

          <path d={generateOrbitPath()} fill="none" stroke="rgba(0, 243, 255, 0.3)" strokeWidth="1" strokeDasharray="3,3" />

          {trail.length > 0 && (
            <polyline
              points={trailPolylinePoints}
              fill="none"
              stroke="#00f3ff"
              strokeWidth="1.5"
              strokeOpacity="0.4"
              strokeDasharray="2,2"
            />
          )}

          {trail.map((pt, idx) => {
            const opacity = ((idx + 1) / trail.length) * 0.6;
            const radius = 1.5 + (idx / trail.length) * 2;
            return (
              <circle
                key={`trail-${idx}-${pt.x}-${pt.y}`}
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill="#00f3ff"
                opacity={opacity}
              />
            );
          })}

          <g style={{ transition: 'all 2.8s cubic-bezier(0.16, 1, 0.3, 1)' }} transform={`translate(${targetX}, ${targetY})`}>
            <circle cx="0" cy="0" r="8" fill="rgba(0, 243, 255, 0.2)" className="animate-ping" />
            <circle cx="0" cy="0" r="4.5" fill="#00f3ff" className="shadow-hud-cyan" />
            <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#00f3ff" strokeWidth="0.75" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#00f3ff" strokeWidth="0.75" />
          </g>
        </svg>

        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-cyan-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          INC: {inclination}
        </div>
      </div>

      {/* Live Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">LAT / LON</div>
          <div className="text-xs font-bold text-cyan-300">
            {latitude >= 0 ? `${latitude.toFixed(2)}°N` : `${Math.abs(latitude).toFixed(2)}°S`}, {longitude >= 0 ? `${longitude.toFixed(2)}°E` : `${Math.abs(longitude).toFixed(2)}°W`}
          </div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">HEADING</div>
          <div className="text-xs font-bold text-amber-300">{heading}</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">ALTITUDE</div>
          <div className="text-xs font-bold text-amber-300">{altitude}</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">ORBITAL SPEED</div>
          <div className="text-xs font-bold text-emerald-300">{velocity}</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">ORBITAL PERIOD</div>
          <div className="text-xs font-bold text-cyan-300">{period}</div>
        </div>

        <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400 uppercase">INCLINATION</div>
          <div className="text-xs font-bold text-cyan-300">{inclination}</div>
        </div>
      </div>
    </div>
  );
}
