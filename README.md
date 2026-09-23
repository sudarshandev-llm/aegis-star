<div align="center">

# 🛡️ AEGIS

### **Orbital-Threat & Space Weather Mission Control**

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r186-000000?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org)
[![NASA API](https://img.shields.io/badge/NASA_API-Live_Feed-E03C31?style=for-the-badge&logo=nasa&logoColor=white)](https://api.nasa.gov)

<br/>

> *A real-time planetary defense dashboard that monitors near-Earth asteroids, solar weather events, and ISS orbital telemetry — featuring an interactive 3D Solar System built entirely with Three.js.*

<br/>

</div>

---

## 🌌 Overview

**AEGIS** (Advanced Earth Guard & Intelligence System) is a full-stack mission control platform that provides real-time situational awareness for space threats and orbital operations. It ingests live telemetry from NASA, NOAA, and ISS tracking services, processes events through a background intelligence pipeline, and renders everything in a tactical glassmorphic HUD interface — including a fully interactive 3D Solar System viewport.

This is not a mock dashboard. **Every data point is sourced from official space agency APIs in real time.**

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔴 Near-Earth Object Tracking
- Live asteroid close-approach feeds via **NASA NeoWs**
- Miss distance in **Lunar Distances (LD)**
- Relative velocity in km/s and km/h
- Absolute magnitude (H) classification
- **POTENTIALLY HAZARDOUS** asteroid flagging
- Severity-based color coding (🔴 High / 🟡 Medium / 🔵 Low)

</td>
<td width="50%">

### ☀️ Solar Weather Surveillance
- Solar Flare classification (Class X/M/C) via **NASA DONKI**
- Coronal Mass Ejection (CME) speed & half-angle tracking
- Geomagnetic Storm Kp Index (0–9 scale)
- NOAA Radio Blackout Scale (R1–R5)
- Real-time solar wind plasma speed from **NOAA SWPC**

</td>
</tr>
<tr>
<td width="50%">

### 🛰️ ISS Orbital Telemetry
- Live latitude, longitude, altitude & velocity
- Keplerian orbital period (92.68 min)
- Orbital inclination (51.64°)
- Spherical trigonometric compass bearing
- Smooth gliding animation with fading path trail
- Dual-source redundancy (Open Notify + WhereTheISS.at)

</td>
<td width="50%">

### 🌍 Interactive 3D Solar System
- Custom GLSL Earth day/night shader with terminator line
- Procedural textures for all 8 planets + Moon
- Saturn's 3D ring mesh with Cassini division
- Real physical rotation periods per planet
- Independent atmospheric cloud layer
- Click-to-focus camera tracking with 3D reticles
- 3D orbit trajectory lines for all bodies

</td>
</tr>
</table>

### Additional Capabilities

| Feature | Description |
|:---|:---|
| 🤖 **AI Flight Briefings** | Automated shift briefings synthesized from aggregated telemetry logs |
| 🚨 **DEFCON Auto-Assessment** | Dynamic threat level (5→1) computed from active event severity |
| 🎨 **HUD Theme Switcher** | 4 tactical color themes: Cyan, Matrix Green, Solar Amber, Crimson Emergency |
| 🔊 **Ambient Audio** | Optional mission control ambient hum toggle |
| 🧭 **Camera Compass Rose** | Real-time azimuth heading display in 3D view |
| 📡 **Off-Screen Indicators** | Edge-clamped directional arrows pointing to off-screen targets |

---

## 🏗️ Architecture

```
aegis/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # System clock, DEFCON, theme switcher
│   │   │   ├── BriefingBanner.jsx  # AI Flight Officer shift briefing
│   │   │   ├── SolarPanel.jsx      # Solar weather telemetry panel
│   │   │   ├── NeoPanel.jsx        # Near-Earth Object tracking panel
│   │   │   ├── IssPanel.jsx        # ISS orbital position panel
│   │   │   ├── OrbitalView.jsx     # Full 3D Solar System (Three.js)
│   │   │   └── EventLog.jsx        # Historical event timeline
│   │   ├── lib/
│   │   │   ├── earthTexture.js     # Procedural texture generators
│   │   │   └── audio.js            # Ambient audio & alert sounds
│   │   ├── App.jsx                 # Root application component
│   │   └── index.css               # Glassmorphic HUD styling + themes
│   └── vite.config.js
│
├── server/                     # Express.js Backend
│   ├── src/
│   │   ├── agents/
│   │   │   └── briefingOfficer.js  # AI briefing synthesis agent
│   │   ├── lib/
│   │   │   ├── nasa.js             # NASA DONKI + NeoWs API client
│   │   │   └── iss.js              # ISS telemetry API client
│   │   ├── db.js                   # SQLite schema & queries
│   │   ├── poller.js               # Background data polling scheduler
│   │   └── index.js                # Express server & REST API routes
│   └── package.json
│
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A free **NASA API Key** from [https://api.nasa.gov](https://api.nasa.gov)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sudarshandev-llm/aegis-star.git
cd aegis-star

# 2. Configure environment variables
cp .env.example .env
# Edit .env and add your NASA API key:
#   NASA_API_KEY=your_key_here
#   PORT=3001

# 3. Install backend dependencies
cd server
npm install

# 4. Install frontend dependencies
cd ../client
npm install
```

### Running the Application

```bash
# Terminal 1 — Start the backend API server
cd server
npm start
# 🛡️ AEGIS Backend listening on http://localhost:3001

# Terminal 2 — Start the frontend dev server
cd client
npm run dev
# 🚀 Frontend ready at http://localhost:5173
```

### Production Build

```bash
cd client
npm run build    # Outputs optimized bundle to client/dist/
```

---

## 📡 Data Sources & API Integrations

| Source | Endpoint | Data Provided | Auth Required |
|:---|:---|:---|:---|
| **NASA NeoWs** | `api.nasa.gov/neo/rest/v1/feed` | Near-Earth asteroid close approaches | API Key |
| **NASA DONKI** | `api.nasa.gov/DONKI/FLR, CME, GST` | Solar flares, CMEs, geomagnetic storms | API Key |
| **NOAA SWPC** | `services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json` | Real-time solar wind plasma speed | None |
| **WhereTheISS.at** | `api.wheretheiss.at/v1/satellites/25544` | ISS latitude, longitude, altitude, velocity | None |

---

## 🎨 HUD Themes

AEGIS includes 4 tactical color themes that can be switched from the header:

| Theme | Accent Color | Best For |
|:---|:---|:---|
| **Tactical Cyan** | `#00f3ff` | Default operational monitoring |
| **Cyber Matrix Green** | `#00ff66` | Low-light / stealth operations |
| **Solar Amber** | `#ffb703` | Solar weather focus sessions |
| **Deep Crimson Emergency** | `#ff2a6d` | Active threat / high-alert scenarios |

---

## 🧰 Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend** | React 18, Vite 5, Three.js r186, Tailwind CSS 3.4, Lucide Icons |
| **3D Rendering** | Custom GLSL Shaders, Procedural Canvas Textures, OrbitControls, LineLoop Trajectories |
| **Backend** | Node.js (ESM), Express 4, SQLite3 (better-sqlite3), node-fetch |
| **APIs** | NASA NeoWs, NASA DONKI, NOAA SWPC, WhereTheISS.at |
| **AI Agent** | Anthropic Claude SDK (optional, for enhanced briefings) |

---

## 🛣️ Roadmap

- [ ] Deep-space probe tracking (JWST, Hubble, Voyager)
- [ ] Historical space threat timeline with event replays
- [ ] NEO search & filter toolbar
- [ ] Interactive DEFCON emergency level controls
- [ ] Starlink orbital shell visualization
- [ ] Mobile-responsive layout

---

## 📜 License

This project is for educational and research purposes.

---

<div align="center">

**Built with 🛡️ by [sudarshandev-llm](https://github.com/sudarshandev-llm)**

*Defending Earth, one API call at a time.*

</div>
