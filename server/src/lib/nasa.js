import fetch from 'node-fetch';

const TIMEOUT_MS = 7000;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Calculate NOAA Radio Blackout Scale (R1-R5) based on Solar Flare Class
export function calculateRadioBlackoutScale(classType = '') {
  if (!classType) return 'R0 (None)';
  const match = classType.match(/^([XMC])(\d+(\.\d+)?)/i);
  if (!match) return 'R0 (None)';

  const letter = match[1].toUpperCase();
  const val = parseFloat(match[2]);

  if (letter === 'X') {
    if (val >= 20) return 'R5 (Extreme)';
    if (val >= 10) return 'R4 (Severe)';
    return 'R3 (Strong)';
  } else if (letter === 'M') {
    if (val >= 5) return 'R2 (Moderate)';
    return 'R1 (Minor)';
  }
  return 'R0 (None)';
}

// Fetch NOAA SWPC Solar Wind Plasma Feed (no API key needed)
export async function fetchSolarWindSpeed() {
  // NOAA retired the old /products/solar-wind/plasma-7-day.json product.
  // The summary feed is a tiny one-row payload with the latest reading.
  const url = 'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json';
  try {
    const res = await fetchWithTimeout(url, { timeout: 6000 });
    if (!res.ok) throw new Error(`NOAA SWPC HTTP ${res.status}`);
    const data = await res.json();
    const latest = Array.isArray(data) ? data[data.length - 1] : data;
    const speedVal = parseFloat(latest?.proton_speed);
    if (!isNaN(speedVal) && speedVal > 0) {
      return { speed_kms: Math.round(speedVal), is_simulated: false };
    }
  } catch (err) {
    console.warn(`[NOAA SWPC] Solar wind plasma fetch failed (${err.message}).`);
  }
  return { speed_kms: null, is_simulated: false };
}

// Fetch NASA DONKI Flares, CMEs & Geomagnetic Storms (GST)
export async function fetchNasaSolarEvents() {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Last 30 days window

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  const flrUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=${apiKey}`;
  const cmeUrl = `https://api.nasa.gov/DONKI/CME?startDate=${startStr}&endDate=${endStr}&api_key=${apiKey}`;
  const gstUrl = `https://api.nasa.gov/DONKI/GST?startDate=${startStr}&endDate=${endStr}&api_key=${apiKey}`;

  const events = [];

  try {
    const [flrRes, cmeRes, gstRes] = await Promise.allSettled([
      fetchWithTimeout(flrUrl),
      fetchWithTimeout(cmeUrl),
      fetchWithTimeout(gstUrl)
    ]);

    if (flrRes.status === 'fulfilled' && flrRes.value.ok) {
      const flrData = await flrRes.value.json();
      if (Array.isArray(flrData)) {
        flrData.forEach(flr => {
          const classType = flr.classType || 'C1.0';
          let severity = 'low';
          if (classType.startsWith('X')) severity = 'high';
          else if (classType.startsWith('M')) severity = 'medium';

          const rScale = calculateRadioBlackoutScale(classType);

          events.push({
            id: `FLR-${flr.flrID || flr.beginTime || Date.now()}`,
            source: 'NASA DONKI',
            type: 'Solar Flare',
            severity,
            summary: `Solar Flare Class ${classType} (${rScale}) detected at region ${flr.activeRegionNum || 'N/A'}. Peak time: ${flr.peakTime || flr.beginTime}`,
            raw_data: {
              ...flr,
              classType,
              radio_blackout_scale: rScale
            },
            is_simulated: false,
            timestamp: new Date(flr.peakTime || flr.beginTime || Date.now()).getTime()
          });
        });
      }
    }

    if (cmeRes.status === 'fulfilled' && cmeRes.value.ok) {
      const cmeData = await cmeRes.value.json();
      if (Array.isArray(cmeData)) {
        cmeData.forEach(cme => {
          const analysis = cme.cmeAnalyses?.[0];
          const speed = analysis?.speed || 0;
          let severity = 'low';
          if (speed > 1000) severity = 'high';
          else if (speed > 500) severity = 'medium';

          events.push({
            id: `CME-${cme.activityID || cme.startTime || Date.now()}`,
            source: 'NASA DONKI',
            type: 'Coronal Mass Ejection',
            severity,
            summary: `CME launched with speed ${speed ? speed + ' km/s' : 'unspecified'}. Half-width: ${analysis?.halfAngle ? analysis.halfAngle + '°' : 'N/A'}.`,
            raw_data: cme,
            is_simulated: false,
            timestamp: new Date(cme.startTime || Date.now()).getTime()
          });
        });
      }
    }

    if (gstRes.status === 'fulfilled' && gstRes.value.ok) {
      const gstData = await gstRes.value.json();
      if (Array.isArray(gstData)) {
        gstData.forEach(gst => {
          const kpArray = gst.allKpIndex || [];
          const maxKpObj = kpArray.reduce((prev, curr) => (curr.kpIndex > (prev?.kpIndex || 0) ? curr : prev), null);
          const kpIndex = maxKpObj ? maxKpObj.kpIndex : 5;

          let severity = 'low';
          if (kpIndex >= 7) severity = 'high';
          else if (kpIndex >= 5) severity = 'medium';

          events.push({
            id: `GST-${gst.gstID || gst.startTime || Date.now()}`,
            source: 'NASA DONKI',
            type: 'Geomagnetic Storm',
            severity,
            summary: `Geomagnetic Storm detected. Maximum Kp Index: ${kpIndex} (Scale 0-9). Start time: ${gst.startTime}`,
            raw_data: {
              ...gst,
              kp_index: kpIndex
            },
            is_simulated: false,
            timestamp: new Date(gst.startTime || Date.now()).getTime()
          });
        });
      }
    }
  } catch (err) {
    console.warn(`[NASA DONKI] Live fetch warning (${err.message}). Specify NASA_API_KEY in .env to prevent DEMO_KEY rate limits.`);
  }

  return events;
}

// Fetch NASA NeoWs Asteroids
export async function fetchNasaNeoEvents() {
  const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  const today = formatDate(new Date());
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${apiKey}`;

  const events = [];

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`NASA NeoWs HTTP error ${res.status}`);
    }

    const data = await res.json();
    const nearEarthObjects = data.near_earth_objects?.[today] || [];

    nearEarthObjects.forEach(neo => {
      const closeApproach = neo.close_approach_data?.[0];
      const missLunar = parseFloat(closeApproach?.miss_distance?.lunar || 999);
      const velocityKmS = parseFloat(closeApproach?.relative_velocity?.kilometers_per_second || 0).toFixed(2);
      const velocityKmH = parseFloat(closeApproach?.relative_velocity?.kilometers_per_hour || 0).toLocaleString();
      const diameterMeters = Math.round(neo.estimated_diameter?.meters?.estimated_diameter_max || 0);
      const absMagnitudeH = neo.absolute_magnitude_h || 'N/A';
      const isHazardous = Boolean(neo.is_potentially_hazardous_asteroid);

      let severity = 'low';
      if (missLunar < 5 || isHazardous) severity = 'high';
      else if (missLunar < 20) severity = 'medium';

      events.push({
        id: `NEO-${neo.id}`,
        source: 'NASA NeoWs',
        type: 'Near-Earth Object',
        severity,
        summary: `Asteroid ${neo.name} (Est. ${diameterMeters}m dia, Mag ${absMagnitudeH} H) close approach at ${missLunar.toFixed(2)} Lunar Distances (${velocityKmS} km/s / ${velocityKmH} km/h).${isHazardous ? ' [POTENTIALLY HAZARDOUS]' : ''}`,
        raw_data: {
          name: neo.name,
          is_potentially_hazardous: isHazardous,
          absolute_magnitude_h: absMagnitudeH,
          miss_distance_lunar: missLunar,
          miss_distance_km: closeApproach?.miss_distance?.kilometers,
          velocity_kms: velocityKmS,
          velocity_kmh: velocityKmH,
          diameter_max_m: diameterMeters
        },
        is_simulated: false,
        timestamp: closeApproach?.epoch_date_close_approach || Date.now()
      });
    });
  } catch (err) {
    console.warn(`[NASA NeoWs] Live fetch warning (${err.message}). Specify NASA_API_KEY in .env to prevent DEMO_KEY rate limits.`);
  }

  return events;
}
