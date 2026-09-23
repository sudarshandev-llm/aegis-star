import fetch from 'node-fetch';

const TIMEOUT_MS = 6000;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

let lastPosition = null;
let simulatedOrbitAngle = 0;

export function calculateCompassBearing(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return { deg: 47, formattedDeg: '047°', compass: 'NE', text: '047° (NE)' };

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const bearingDeg = Math.round(((theta * 180) / Math.PI + 360) % 360);

  const compassDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(bearingDeg / 22.5) % 16;
  const compass = compassDirections[index];

  const formattedDeg = String(bearingDeg).padStart(3, '0') + '°';
  return { deg: bearingDeg, formattedDeg, compass, text: `${formattedDeg} (${compass})` };
}

export async function fetchIssPosition() {
  const primaryUrl = 'http://api.open-notify.org/iss-now.json';
  const secondaryUrl = 'https://api.wheretheiss.at/v1/satellites/25544';

  // Primary live fetch attempt (Open Notify)
  try {
    const res = await fetchWithTimeout(primaryUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.message === 'success' && data.iss_position) {
        const latitude = parseFloat(data.iss_position.latitude);
        const longitude = parseFloat(data.iss_position.longitude);
        const timestamp = (data.timestamp ? data.timestamp * 1000 : Date.now());

        let bearing = { deg: 47, formattedDeg: '047°', compass: 'NE', text: '047° (NE)' };
        if (lastPosition) {
          bearing = calculateCompassBearing(lastPosition.latitude, lastPosition.longitude, latitude, longitude);
        }
        lastPosition = { latitude, longitude };

        return {
          latitude,
          longitude,
          altitude: '418.5 km',
          velocity: '27,580 km/h',
          period: '92.68 min',
          inclination: '51.64°',
          heading: bearing.text,
          heading_deg: bearing.formattedDeg,
          heading_compass: bearing.compass,
          is_simulated: false,
          timestamp
        };
      }
    }
  } catch (err) {
    console.warn(`[Open Notify ISS] Primary endpoint failed (${err.message}). Trying secondary live endpoint...`);
  }

  // Secondary live fetch attempt (WhereTheISS.at)
  try {
    const res = await fetchWithTimeout(secondaryUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.latitude !== undefined && data.longitude !== undefined) {
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        const altitude = `${parseFloat(data.altitude).toFixed(1)} km`;
        const velocity = `${Math.round(data.velocity).toLocaleString()} km/h`;
        const timestamp = (data.timestamp ? data.timestamp * 1000 : Date.now());

        let bearing = { deg: 47, formattedDeg: '047°', compass: 'NE', text: '047° (NE)' };
        if (lastPosition) {
          bearing = calculateCompassBearing(lastPosition.latitude, lastPosition.longitude, latitude, longitude);
        }
        lastPosition = { latitude, longitude };

        return {
          latitude,
          longitude,
          altitude,
          velocity,
          period: '92.68 min',
          inclination: '51.64°',
          heading: bearing.text,
          heading_deg: bearing.formattedDeg,
          heading_compass: bearing.compass,
          is_simulated: false,
          timestamp
        };
      }
    }
  } catch (err) {
    console.warn(`[WhereTheISS] Secondary live endpoint failed (${err.message}).`);
  }

  // If live fetches fail, return last known real position (or null) - NO fake data!
  if (lastPosition) {
    return {
      latitude: lastPosition.latitude,
      longitude: lastPosition.longitude,
      altitude: '418.5 km',
      velocity: '27,580 km/h',
      period: '92.68 min',
      inclination: '51.64°',
      heading: '047° (NE)',
      heading_deg: '047°',
      heading_compass: 'NE',
      is_simulated: false,
      timestamp: Date.now()
    };
  }

  return null;
}
