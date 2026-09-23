import * as THREE from 'three';

// 1. Geographically Accurate Equirectangular Earth Day Map Texture (2048x1024)
export function createEarthDayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Vibrant Ocean Blue Base Layer
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#0a2142');
  oceanGrad.addColorStop(0.3, '#124178');
  oceanGrad.addColorStop(0.5, '#1a589e');
  oceanGrad.addColorStop(0.7, '#124178');
  oceanGrad.addColorStop(1, '#0a2142');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle Lat/Long Grid Lines
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw Geographically Accurate Continents & Islands with Shallow Coastal Shelf Glow
  const drawLand = (polygonPoints, color = '#2d5a27', stroke = '#1d421b') => {
    // Coastal Shallow Water Shelf
    ctx.fillStyle = 'rgba(0, 220, 240, 0.22)';
    ctx.beginPath();
    polygonPoints.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0, 220, 240, 0.25)';
    ctx.stroke();

    // Continent Land Mass
    ctx.fillStyle = color;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    polygonPoints.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // North America (US, Canada, Alaska, Mexico)
  drawLand([
    [-168, 66], [-150, 70], [-130, 70], [-115, 74], [-90, 78], [-75, 72], [-60, 60],
    [-55, 47], [-65, 44], [-76, 35], [-80, 25], [-90, 16], [-105, 20], [-115, 30],
    [-124, 48], [-135, 57], [-160, 60], [-168, 66]
  ], '#3a6642', '#22472a');

  // Central America & Caribbean
  drawLand([
    [-90, 16], [-82, 9], [-77, 8], [-83, 14], [-90, 16]
  ], '#326038', '#1f4024');

  // Greenland Ice Sheet
  drawLand([
    [-55, 83], [-20, 81], [-25, 68], [-45, 60], [-55, 72], [-55, 83]
  ], '#edf6f9', '#caf0f8');

  // South America
  drawLand([
    [-77, 8], [-60, 10], [-45, -1], [-35, -7], [-38, -18], [-48, -28],
    [-65, -53], [-75, -50], [-72, -30], [-80, -4], [-77, 8]
  ], '#2d6a4f', '#1b4332');

  // Europe
  drawLand([
    [-10, 36], [0, 43], [10, 45], [15, 58], [28, 62], [40, 66], [60, 66],
    [50, 48], [40, 42], [28, 40], [20, 38], [0, 38], [-10, 36]
  ], '#407a3c', '#295426');

  // British Isles & Scandinavia
  drawLand([[-10, 50], [-2, 58], [2, 52], [-5, 50], [-10, 50]], '#407a3c');
  drawLand([[5, 58], [10, 68], [25, 70], [30, 60], [15, 56], [5, 58]], '#3a7236');

  // Africa & Madagascar
  drawLand([
    [-17, 32], [-5, 36], [12, 37], [32, 31], [43, 12], [51, 11],
    [40, -10], [33, -28], [20, -35], [14, -23], [9, 4], [-15, 12], [-17, 32]
  ], '#9c733f', '#6e4f29');
  drawLand([[43, -12], [50, -14], [47, -25], [43, -20], [43, -12]], '#3d743a');

  // Northern & Central Asia (Russia, China, Mongolia)
  drawLand([
    [60, 66], [100, 74], [140, 72], [170, 66], [180, 64], [170, 52],
    [140, 45], [120, 30], [100, 22], [80, 28], [60, 40], [60, 66]
  ], '#3d6c38', '#274923');

  // Middle East & India
  drawLand([[35, 32], [55, 25], [60, 15], [45, 12], [35, 32]], '#b58a52');
  drawLand([[68, 24], [88, 22], [80, 8], [73, 15], [68, 24]], '#5b823b');

  // Southeast Asia & Japan
  drawLand([[100, 22], [108, 12], [104, 1], [98, 8], [100, 22]], '#295b2b');
  drawLand([[130, 32], [140, 40], [142, 35], [132, 30], [130, 32]], '#346b36');

  // Australia & New Zealand
  drawLand([
    [113, -14], [130, -12], [142, -10], [153, -28], [138, -38], [115, -34], [113, -14]
  ], '#a86f38', '#784c22');
  drawLand([[166, -35], [178, -37], [172, -46], [166, -42], [166, -35]], '#326038');

  // North & South Polar Ice Caps
  ctx.fillStyle = '#f0f8ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.05);
  ctx.fillRect(0, canvas.height * 0.88, canvas.width, canvas.height * 0.12);

  // Cloud Layer Wisps
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let i = 0; i < 50; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
    const rx = 60 + Math.random() * 150;
    const ry = 14 + Math.random() * 40;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 2. Geographically Accurate Night City Lights Map Texture (2048x1024)
export function createEarthNightTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Dark Space Navy Night Background (prevents pitch black void)
  ctx.fillStyle = '#010915';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Helper to paint crisp city light clusters
  const addCityLights = (lon, lat, radius = 22, density = 40) => {
    const cx = ((lon + 180) / 360) * canvas.width;
    const cy = ((90 - lat) / 180) * canvas.height;

    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 1.5) * radius;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const size = 1.4 + Math.random() * 2.2;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2.8);
      grad.addColorStop(0, 'rgba(255, 230, 150, 0.98)');
      grad.addColorStop(0.4, 'rgba(255, 160, 50, 0.7)');
      grad.addColorStop(1, 'rgba(1, 9, 21, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // North America Major Lights
  addCityLights(-74, 40, 38, 80);   // New York / Mid-Atlantic
  addCityLights(-118, 34, 32, 60);  // Los Angeles
  addCityLights(-87, 41, 28, 50);   // Chicago
  addCityLights(-96, 32, 32, 50);   // Dallas / Texas
  addCityLights(-122, 37, 22, 40);  // San Francisco
  addCityLights(-80, 25, 22, 35);   // Miami

  // Europe Major Lights
  addCityLights(0, 51, 32, 70);     // London
  addCityLights(2, 48, 32, 70);     // Paris
  addCityLights(13, 52, 42, 90);    // Germany / Benelux
  addCityLights(12, 41, 28, 50);    // Rome / Italy
  addCityLights(-3, 40, 22, 40);    // Madrid
  addCityLights(37, 55, 30, 55);    // Moscow

  // Asia Major Lights
  addCityLights(139, 35, 42, 95);   // Tokyo / Japan
  addCityLights(121, 31, 48, 90);   // Shanghai
  addCityLights(116, 39, 38, 70);   // Beijing
  addCityLights(114, 22, 32, 60);   // Hong Kong / Guangzhou
  addCityLights(77, 28, 42, 80);    // Delhi / India
  addCityLights(72, 19, 32, 60);    // Mumbai
  addCityLights(106, -6, 28, 45);   // Jakarta

  // Middle East & Africa
  addCityLights(55, 25, 28, 45);    // Dubai / UAE
  addCityLights(31, 30, 25, 40);    // Cairo / Nile Delta

  // South America & Australia
  addCityLights(-46, -23, 32, 60);  // São Paulo / Rio
  addCityLights(-58, -34, 28, 45);  // Buenos Aires
  addCityLights(151, -33, 28, 45);  // Sydney / Melbourne

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 4. Procedural Moon Texture (1024x512)
export function createMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#80848a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Craters & Maria dark patches
  ctx.fillStyle = 'rgba(70, 72, 77, 0.6)';
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = 20 + Math.random() * 80;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright impact crater rings
  ctx.strokeStyle = 'rgba(210, 215, 220, 0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = 5 + Math.random() * 25;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 5. Realistic Earth Cloud Layer Texture (2048x1024)
export function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Atmospheric cloud swirls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let i = 0; i < 120; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const rx = 40 + Math.random() * 180;
    const ry = 10 + Math.random() * 45;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 6. Procedural Solar System Planet Textures
export function createPlanetTexture(type = 'mars') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'mercury') {
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(60, 60, 60, 0.4)';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 10 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'venus') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#e3bb76');
    grad.addColorStop(0.5, '#c99344');
    grad.addColorStop(1, '#e3bb76');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (type === 'mars') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#c1440e');
    grad.addColorStop(0.4, '#e77d11');
    grad.addColorStop(0.7, '#892b03');
    grad.addColorStop(1, '#c1440e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dark volcanic regions (Valles Marineris)
    ctx.fillStyle = 'rgba(70, 20, 5, 0.5)';
    ctx.fillRect(200, 220, 500, 60);
  } else if (type === 'jupiter') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#d8ca9d');
    grad.addColorStop(0.2, '#a57c52');
    grad.addColorStop(0.4, '#d8ca9d');
    grad.addColorStop(0.6, '#b36d39');
    grad.addColorStop(0.8, '#d8ca9d');
    grad.addColorStop(1, '#a57c52');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Great Red Spot
    ctx.fillStyle = '#b3381e';
    ctx.beginPath();
    ctx.ellipse(650, 320, 70, 45, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'saturn') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#e4d5b7');
    grad.addColorStop(0.3, '#cbb58b');
    grad.addColorStop(0.7, '#e4d5b7');
    grad.addColorStop(1, '#a8946e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (type === 'uranus') {
    ctx.fillStyle = '#7de3f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (type === 'neptune') {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#274687');
    grad.addColorStop(0.5, '#4b70dd');
    grad.addColorStop(1, '#274687');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 7. Saturn Ring Texture
export function createSaturnRingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.2, 'rgba(212, 192, 150, 0.8)');
  grad.addColorStop(0.5, 'rgba(180, 160, 120, 0.9)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)'); // Cassini division
  grad.addColorStop(0.85, 'rgba(195, 175, 135, 0.7)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 8. Glow Sprite Texture Generator for asteroid/satellite marker highlights
export function createGlowSpriteTexture(colorHex = '#00f3ff') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, colorHex);
  gradient.addColorStop(0.3, colorHex);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


