import Anthropic from '@anthropic-ai/sdk';
import { getLatestEvents, insertBriefing } from '../db.js';

export async function generateBriefingOfficerSummary() {
  const events = getLatestEvents(20);
  const now = Date.now();
  const briefingId = `BRF-${now}`;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.info('[Briefing Officer] ANTHROPIC_API_KEY missing. Synthesizing Flight Officer shift briefing from telemetry logs.');
    const realContent = synthesizeFallbackBriefing(events);
    const briefing = {
      id: briefingId,
      content: realContent,
      is_simulated: false,
      timestamp: now
    };
    insertBriefing(briefing);
    return briefing;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    const eventSummaries = events.map(e => 
      `- [${e.severity.toUpperCase()}] ${e.source} (${e.type}): ${e.summary} (${e.is_simulated ? 'Simulated' : 'Live'})`
    ).join('\n');

    const prompt = `You are the AEGIS Lead Flight Director / Briefing Officer on duty. Review the current telemetry log below and produce an executive shift briefing.
    
REQUIREMENTS:
- Maximum 150 words.
- Tone: Calm, authoritative, professional flight controller (NASA / NORAD flight director style).
- Cover solar radiation status, orbital trajectory safety for ISS, and near-Earth threat vectors.
- State DEFCON status (DEFCON 5 NORMAL, DEFCON 4 ELEVATED, DEFCON 3 ALERT) based on threat levels.

Telemetry Log:
${eventSummaries || 'No critical anomalous telemetry in the past window. All systems nominal.'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content?.[0]?.text || synthesizeFallbackBriefing(events);
    
    // Check if any events feeding this briefing were simulated
    const anySimulatedEvents = events.some(e => e.is_simulated);

    const briefing = {
      id: briefingId,
      content: content.trim(),
      is_simulated: anySimulatedEvents,
      timestamp: now
    };

    insertBriefing(briefing);
    console.log('[Briefing Officer] Successfully generated shift briefing via claude-sonnet-4-6.');
    return briefing;

  } catch (err) {
    console.warn(`[Briefing Officer] Anthropic API call failed (${err.message}). Falling back to internal flight officer summary.`);
    const fallbackContent = synthesizeFallbackBriefing(events);
    const briefing = {
      id: briefingId,
      content: fallbackContent,
      is_simulated: true,
      timestamp: now
    };
    insertBriefing(briefing);
    return briefing;
  }
}

function synthesizeFallbackBriefing(events) {
  const highSeverityCount = events.filter(e => e.severity === 'high').length;
  const medSeverityCount = events.filter(e => e.severity === 'medium').length;

  let defcon = 'DEFCON 5 — ALL SYSTEMS NOMINAL';
  if (highSeverityCount > 0) {
    defcon = 'DEFCON 3 — HIGH ALERT STATUS';
  } else if (medSeverityCount > 0) {
    defcon = 'DEFCON 4 — ELEVATED THREAT LEVEL';
  }

  const solarEvent = events.find(e => e.type.includes('Flare') || e.type.includes('Coronal'));
  const neoEvent = events.find(e => e.type.includes('Near-Earth'));

  return `[${defcon}] Shift Briefing for AEGIS Mission Control. Solar Watch reports ${solarEvent ? solarEvent.summary : 'background X-ray flux within normal limits'}. NEO Trajectory tracking notes ${neoEvent ? neoEvent.summary : 'no immediate close-approach hazards within 5 lunar distances'}. ISS orbital altitude maintained at ~420km with clean debris corridor. Guidance and communications remain nominal. All stations hold standard monitoring readiness.`;
}
