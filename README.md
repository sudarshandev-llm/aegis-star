# AEGIS

Space-weather and orbital-threat mission control dashboard.

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys
2. `npm install` in both `/server` and `/client`
3. `npm start` in `/server` to start the backend
4. `npm run dev` in `/client` to start the frontend

## Architecture

- `/server` — Express backend, SQLite DB, agent orchestration, API polling
- `/server/agents` — 4 specialized agents (Solar Watch, NEO Watch, Orbital Traffic, Briefing Officer)
- `/server/lib` — API client wrappers for NASA, NOAA, Open Notify
- `/client` — React + Tailwind frontend HUD

## Data Sources

- NASA DONKI (flares, CMEs, geomagnetic storms)
- NASA NeoWs (near-Earth objects)
- Open Notify (ISS position)
- NOAA SWPC (optional cross-check)
