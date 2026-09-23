import { fetchNasaSolarEvents, fetchNasaNeoEvents } from './lib/nasa.js';
import { fetchIssPosition } from './lib/iss.js';
import { generateBriefingOfficerSummary } from './agents/briefingOfficer.js';
import { insertEvent, saveIssPosition, getLatestEvents } from './db.js';

let isPollingEvents = false;

export async function pollNasaEvents() {
  if (isPollingEvents) return;
  isPollingEvents = true;

  try {
    const [solarEvents, neoEvents] = await Promise.all([
      fetchNasaSolarEvents(),
      fetchNasaNeoEvents()
    ]);

    const allEvents = [...solarEvents, ...neoEvents];
    let insertedCount = 0;
    allEvents.forEach(evt => {
      insertEvent(evt);
      insertedCount++;
    });

    console.log(`[Poller] Successfully processed ${insertedCount} space events into SQLite.`);
  } catch (err) {
    console.error(`[Poller] Error in pollNasaEvents: ${err.message}`);
  } finally {
    isPollingEvents = false;
  }
}

export async function pollIssPosition() {
  try {
    const position = await fetchIssPosition();
    if (position) {
      saveIssPosition(position);
    }
  } catch (err) {
    console.error(`[Poller] Error in pollIssPosition: ${err.message}`);
  }
}

export function startPoller() {
  console.log('[Poller] Initializing background polling routines...');

  // Initial immediate fetch
  pollIssPosition();
  pollNasaEvents().then(() => {
    // Generate initial briefing after events populated
    generateBriefingOfficerSummary().catch(err => {
      console.error('[Poller] Initial briefing generation failed:', err.message);
    });
  });

  // Schedule intervals
  // ISS every 30 seconds
  setInterval(pollIssPosition, 30 * 1000);

  // NASA solar & NEO events every 5 minutes
  setInterval(pollNasaEvents, 5 * 60 * 1000);

  // Briefing Officer agent every 1 hour
  setInterval(() => {
    generateBriefingOfficerSummary().catch(err => {
      console.error('[Poller] Hourly briefing generation failed:', err.message);
    });
  }, 60 * 60 * 1000);
}
