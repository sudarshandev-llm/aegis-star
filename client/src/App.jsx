import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import BriefingBanner from './components/BriefingBanner';
import SolarPanel from './components/SolarPanel';
import NeoPanel from './components/NeoPanel';
import IssPanel from './components/IssPanel';
import EventLog from './components/EventLog';
import OrbitalView from './components/OrbitalView';
import { playAlertBlip } from './lib/audio';

export default function App() {
  const [events, setEvents] = useState([]);
  const [issPosition, setIssPosition] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);
  const [isOrbitalViewOpen, setIsOrbitalViewOpen] = useState(false);
  const [focusedTarget, setFocusedTarget] = useState(null);

  const handleOpen3DFocus = (target) => {
    setFocusedTarget(target);
    setIsOrbitalViewOpen(true);
  };

  const prevHighEventIdsRef = useRef(new Set());

  // Fetch telemetry events
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);
          setIsConnected(true);

          // Check if any new high severity events arrived
          const currentHighEvents = data.events.filter(e => e.severity === 'high');
          let hasNewHigh = false;
          currentHighEvents.forEach(e => {
            if (!prevHighEventIdsRef.current.has(e.id)) {
              hasNewHigh = true;
              prevHighEventIdsRef.current.add(e.id);
            }
          });

          if (hasNewHigh && prevHighEventIdsRef.current.size > currentHighEvents.length) {
            playAlertBlip();
          }
        }
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setIsConnected(false);
    }
  }, []);

  // Fetch ISS position
  const fetchIss = useCallback(async () => {
    try {
      const res = await fetch('/api/iss');
      if (res.ok) {
        const data = await res.json();
        if (data.position) {
          setIssPosition(data.position);
          setIsConnected(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ISS telemetry:', err);
    }
  }, []);

  // Fetch latest briefing
  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          setBriefing(data.briefing);
        }
      }
    } catch (err) {
      console.error('Failed to fetch shift briefing:', err);
    }
  }, []);

  // Trigger manual briefing generation
  const handleRefreshBriefing = async () => {
    setIsRefreshingBriefing(true);
    try {
      const res = await fetch('/api/briefing/generate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          setBriefing(data.briefing);
        }
      }
    } catch (err) {
      console.error('Failed to generate new briefing:', err);
    } finally {
      setIsRefreshingBriefing(false);
    }
  };

  // Initial load and periodic polling
  useEffect(() => {
    fetchEvents();
    fetchIss();
    fetchBriefing();

    // 30 second interval for live telemetry feeds
    const telemetryTimer = setInterval(() => {
      fetchEvents();
      fetchIss();
    }, 30000);

    // 60 second interval for briefing check
    const briefingTimer = setInterval(() => {
      fetchBriefing();
    }, 60000);

    return () => {
      clearInterval(telemetryTimer);
      clearInterval(briefingTimer);
    };
  }, [fetchEvents, fetchIss, fetchBriefing]);

  // Compute DEFCON level based on active events severity
  const defconLevel = React.useMemo(() => {
    const hasHigh = events.some(e => e.severity === 'high');
    const hasMedium = events.some(e => e.severity === 'medium');
    if (hasHigh) return '3';
    if (hasMedium) return '4';
    return '5';
  }, [events]);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 relative">
      {/* Background CRT Scanlines Effect */}
      <div className="fixed inset-0 scanlines pointer-events-none z-50 opacity-20" />

      {/* 3D Full-Screen Orbital View Modal */}
      {isOrbitalViewOpen && (
        <OrbitalView
          issPosition={issPosition}
          events={events}
          defconLevel={defconLevel}
          focusedTarget={focusedTarget}
          onClearFocus={() => setFocusedTarget(null)}
          onClose={() => {
            setIsOrbitalViewOpen(false);
            setFocusedTarget(null);
          }}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header with System Clock, DEFCON, and 3D View Trigger */}
        <Header 
          isConnected={isConnected} 
          defconLevel={defconLevel} 
          onOpenOrbitalView={() => {
            setFocusedTarget(null);
            setIsOrbitalViewOpen(true);
          }}
        />

        {/* Top: Briefing Officer Summary Banner */}
        <BriefingBanner 
          briefing={briefing} 
          onRefresh={handleRefreshBriefing}
          isRefreshing={isRefreshingBriefing}
        />

        {/* Middle: Three Live Telemetry Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SolarPanel events={events} />
          <NeoPanel events={events} onFocusTarget={handleOpen3DFocus} />
          <IssPanel position={issPosition} onFocusTarget={handleOpen3DFocus} />
        </div>

        {/* Bottom: Event History Log */}
        <EventLog events={events} />
      </div>
    </div>
  );
}
