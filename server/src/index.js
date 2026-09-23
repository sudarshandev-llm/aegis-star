import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { getLatestEvents, getLatestIssPosition, getLatestBriefing } from './db.js';
import { startPoller } from './poller.js';
import { generateBriefingOfficerSummary } from './agents/briefingOfficer.js';

// Load root .env file if available, or local .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// REST Routes

// GET /api/health — Basic status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'AEGIS Space-Weather & Orbital Threat Engine',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: Date.now()
  });
});

// GET /api/events — last 50 stored events, newest first
app.get('/api/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const events = getLatestEvents(limit);
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (err) {
    console.error('Error fetching /api/events:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve telemetry events' });
  }
});

// GET /api/iss — latest ISS position
app.get('/api/iss', (req, res) => {
  try {
    const position = getLatestIssPosition();
    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'ISS position telemetry not yet available'
      });
    }
    res.json({
      success: true,
      position
    });
  } catch (err) {
    console.error('Error fetching /api/iss:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve ISS telemetry' });
  }
});

// GET /api/briefing — latest briefing officer summary
app.get('/api/briefing', (req, res) => {
  try {
    const briefing = getLatestBriefing();
    if (!briefing) {
      return res.status(404).json({
        success: false,
        error: 'No shift briefing generated yet'
      });
    }
    res.json({
      success: true,
      briefing
    });
  } catch (err) {
    console.error('Error fetching /api/briefing:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve shift briefing' });
  }
});

// POST /api/briefing/generate — manual briefing trigger
app.post('/api/briefing/generate', async (req, res) => {
  try {
    const briefing = await generateBriefingOfficerSummary();
    res.json({
      success: true,
      briefing
    });
  } catch (err) {
    console.error('Error generating briefing:', err);
    res.status(500).json({ success: false, error: 'Failed to generate briefing' });
  }
});

// GET /api/solar-wind — NOAA SWPC Solar Wind Plasma Feed
app.get('/api/solar-wind', async (req, res) => {
  try {
    const { fetchSolarWindSpeed } = await import('./lib/nasa.js');
    const data = await fetchSolarWindSpeed();
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.json({
      success: false,
      data: { speed_kms: 420, is_simulated: true }
    });
  }
});


// GET /api/debug/nasa-test — direct diagnostic test for NASA DONKI API
app.get('/api/debug/nasa-test', async (req, res) => {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const targetUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=${apiKey}`;

  try {
    const fetchModule = await import('node-fetch');
    const fetch = fetchModule.default;
    const response = await fetch(targetUrl);
    const status = response.status;
    const rawText = await response.text();

    let jsonBody = null;
    try {
      jsonBody = JSON.parse(rawText);
    } catch (e) {
      jsonBody = null;
    }

    res.json({
      success: response.ok,
      http_status: status,
      target_url: targetUrl.replace(apiKey, apiKey.length > 4 ? `${apiKey.substring(0, 4)}...` : apiKey),
      raw_body: jsonBody || rawText
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      target_url: targetUrl.replace(apiKey, apiKey.length > 4 ? `${apiKey.substring(0, 4)}...` : apiKey)
    });
  }
});


// Start Express Server & Poller
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` 🛡️  AEGIS MISSION CONTROL BACKEND STARTED`);
  console.log(` 🚀 Listening on http://localhost:${PORT}`);
  console.log(`=================================================`);
  
  startPoller();
});
