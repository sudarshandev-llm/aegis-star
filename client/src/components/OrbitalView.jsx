import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Volume2, VolumeX, X, Radio, ShieldAlert, Compass, Activity, Clock, Zap, ArrowRight, Target, RotateCcw, Crosshair, Globe } from 'lucide-react';
import {
  createEarthDayTexture,
  createEarthNightTexture,
  createGlowSpriteTexture,
  createMoonTexture,
  createCloudTexture,
  createPlanetTexture,
  createSaturnRingTexture
} from '../lib/earthTexture';
import { startAmbientHum, stopAmbientHum } from '../lib/audio';

// Custom Fresnel Atmosphere Edge Glow Shader
const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
      gl_FragColor = vec4(0.0, 0.95, 1.0, 1.0) * intensity;
    }
  `
};

// Custom Earth Day / Night City Lights Shader
// Custom Earth Day / Night City Lights Shader
const EarthDayNightShader = {
  uniforms: {
    dayTexture: { value: null },
    nightTexture: { value: null },
    sunDirection: { value: new THREE.Vector3(1, 0.4, 0.8).normalize() }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
      vUv = uv;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform vec3 sunDirection;
    varying vec2 vUv;
    varying vec3 vWorldNormal;

    void main() {
      vec3 dayColor = texture2D(dayTexture, vUv).rgb;
      vec3 nightColor = texture2D(nightTexture, vUv).rgb;

      float dProd = dot(vWorldNormal, sunDirection);
      float dayFactor = smoothstep(-0.25, 0.25, dProd);

      // Deep space navy ambient night tint with vibrant golden city lights
      vec3 nightSide = nightColor * 2.2 + vec3(0.04, 0.09, 0.18) * (1.0 - length(nightColor));
      vec3 daySide = dayColor * max(0.4, dProd * 1.35);

      vec3 finalColor = mix(nightSide, daySide, dayFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Solar System Planets Configuration with Real-time Rotational Periods (in Hours)
const PLANET_CONFIGS = [
  { name: 'MERCURY', key: 'mercury', radius: 0.7, dist: 38, speed: 0.0018, rotationPeriodHours: 1406.4, color: '#9e9e9e', symbol: '☿' },
  { name: 'VENUS', key: 'venus', radius: 1.2, dist: 52, speed: 0.0012, rotationPeriodHours: -5832.0, color: '#e3bb76', symbol: '♀' },
  { name: 'MARS', key: 'mars', radius: 0.9, dist: 78, speed: 0.0008, rotationPeriodHours: 24.62, color: '#c1440e', symbol: '♂' },
  { name: 'JUPITER', key: 'jupiter', radius: 2.8, dist: 112, speed: 0.0005, rotationPeriodHours: 9.93, color: '#d8ca9d', symbol: '♃' },
  { name: 'SATURN', key: 'saturn', radius: 2.2, dist: 148, speed: 0.0003, rotationPeriodHours: 10.7, hasRing: true, symbol: '♄' },
  { name: 'URANUS', key: 'uranus', radius: 1.6, dist: 184, speed: 0.0002, rotationPeriodHours: -17.2, color: '#7de3f4', symbol: '♅' },
  { name: 'NEPTUNE', key: 'neptune', radius: 1.5, dist: 220, speed: 0.00015, rotationPeriodHours: 16.1, color: '#4b70dd', symbol: '♆' }
];

export default function OrbitalView({ issPosition, events = [], defconLevel = '5', focusedTarget = null, onClearFocus, onClose }) {
  const mountRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [rotationMode, setRotationMode] = useState('realtime');
  const [hoveredNeo, setHoveredNeo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: -1000, y: -1000 });

  // Camera Target Lock State
  const [activeTarget, setActiveTarget] = useState(focusedTarget);
  const activeTargetRef = useRef(activeTarget);

  useEffect(() => {
    setActiveTarget(focusedTarget);
  }, [focusedTarget]);

  useEffect(() => {
    activeTargetRef.current = activeTarget;
  }, [activeTarget]);

  // 2D Screen Projected Label Coordinates State
  const [earthLabelPos, setEarthLabelPos] = useState({ x: -1000, y: -1000, visible: false });
  const [moonLabelPos, setMoonLabelPos] = useState({ x: -1000, y: -1000, visible: false });
  const [issLabelPos, setIssLabelPos] = useState({ x: -1000, y: -1000, visible: false });
  const [neoLabelPositions, setNeoLabelPositions] = useState([]);
  const [planetLabelPositions, setPlanetLabelPositions] = useState([]);
  
  // Off-screen Directional Indicators State
  const [edgeIndicators, setEdgeIndicators] = useState([]);
  
  // Camera Azimuth Orientation State for Compass Rose
  const [cameraAzimuth, setCameraAzimuth] = useState(0);

  const latitude = issPosition?.latitude ?? 0;
  const longitude = issPosition?.longitude ?? 0;
  const altitude = issPosition?.altitude || '418.5 km';
  const velocity = issPosition?.velocity || '27,580 km/h';

  const rotationModeRef = useRef(rotationMode);
  useEffect(() => {
    rotationModeRef.current = rotationMode;
  }, [rotationMode]);

  const handleToggleAudio = () => {
    if (isAudioEnabled) {
      stopAmbientHum();
      setIsAudioEnabled(false);
    } else {
      startAmbientHum();
      setIsAudioEnabled(true);
    }
  };

  useEffect(() => {
    return () => {
      stopAmbientHum();
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040a');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    camera.position.set(0, 8.5, 24.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // OrbitControls Setup (Scroll zoom with limits, click-drag rotation around Earth)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 7.5; // Prevent zooming inside Earth (radius 5 + atmosphere)
    controls.maxDistance = 320.0; // Expansive free space zoom range for solar system
    controls.enablePan = false;
    controls.rotateSpeed = 0.75;
    controls.zoomSpeed = 0.95;

    const clock = new THREE.Clock();

    // Ambient & Directional Lighting for realistic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(100, 30, 80);
    scene.add(sunLight);

    // 2. Deep Space Starfield Background
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2800;
    const starPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 600;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xc8e6ff, size: 0.9, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // 3. Custom Earth Day & Night Shader Mesh
    const EARTH_RADIUS = 5;
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const dayTexture = createEarthDayTexture();
    const nightTexture = createEarthNightTexture();

    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3(1, 0.4, 0.8).normalize() }
      },
      vertexShader: EarthDayNightShader.vertexShader,
      fragmentShader: EarthDayNightShader.fragmentShader
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat);
    scene.add(earthMesh);

    // Realistic Atmospheric Cloud Layer Sphere
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.018, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: createCloudTexture(),
      transparent: true,
      opacity: 0.4,
      blending: THREE.NormalBlending
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    // 4. Atmosphere Glow
    const atmosphereGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // Realistic Moon Mesh & Orbit Trajectory Ring
    const MOON_ORBIT_RADIUS = 26.0;
    const moonGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      map: createMoonTexture(),
      roughness: 0.85
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(moonMesh);

    // Moon Orbit Trajectory Ring
    const moonOrbitPts = [];
    for (let i = 0; i <= 360; i += 3) {
      const rad = (i * Math.PI) / 180;
      const x = MOON_ORBIT_RADIUS * Math.cos(rad);
      const y = MOON_ORBIT_RADIUS * Math.sin(rad) * Math.sin((5.14 * Math.PI) / 180);
      const z = MOON_ORBIT_RADIUS * Math.sin(rad) * Math.cos((5.14 * Math.PI) / 180);
      moonOrbitPts.push(new THREE.Vector3(x, y, z));
    }
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineDashedMaterial({ color: 0x90a4ae, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.35 });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    moonOrbitLine.computeLineDistances();
    scene.add(moonOrbitLine);

    // 3D Target Reticle Mesh for Camera Tracking
    const reticleGeo = new THREE.RingGeometry(0.65, 0.85, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.visible = false;
    scene.add(reticleMesh);

    // ISS Orbit Ring Reference
    const orbitRingGeo = new THREE.BufferGeometry();
    const ringPts = [];
    const ORBIT_ALTITUDE = EARTH_RADIUS + 0.6;
    for (let i = 0; i <= 360; i += 4) {
      const rad = (i * Math.PI) / 180;
      const x = ORBIT_ALTITUDE * Math.cos(rad);
      const y = ORBIT_ALTITUDE * Math.sin(rad) * Math.sin((51.6 * Math.PI) / 180);
      const z = ORBIT_ALTITUDE * Math.sin(rad) * Math.cos((51.6 * Math.PI) / 180);
      ringPts.push(new THREE.Vector3(x, y, z));
    }
    orbitRingGeo.setFromPoints(ringPts);
    const orbitRingMat = new THREE.LineDashedMaterial({ color: 0x00f3ff, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.4 });
    const orbitRingLine = new THREE.Line(orbitRingGeo, orbitRingMat);
    orbitRingLine.computeLineDistances();
    scene.add(orbitRingLine);

    // 5. ISS Marker & Interpolation
    const issGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const issMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const issMesh = new THREE.Mesh(issGeo, issMat);
    scene.add(issMesh);

    const issGlowGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const issGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    const issGlowMesh = new THREE.Mesh(issGlowGeo, issGlowMat);
    issMesh.add(issGlowMesh);

    // ISS Fading Trail
    const MAX_TRAIL_PTS = 25;
    const trailPositions = [];
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    const currentIssPos = new THREE.Vector3(0, 0, ORBIT_ALTITUDE);
    const targetIssPos = new THREE.Vector3(0, 0, ORBIT_ALTITUDE);

    // 6. Solar System Planets Setup with 3D Orbit Trajectories
    const planetMeshes = [];
    PLANET_CONFIGS.forEach(cfg => {
      // Planet Orbit Trajectory Ring Line
      const orbitPts = [];
      for (let i = 0; i <= 360; i += 4) {
        const rad = (i * Math.PI) / 180;
        orbitPts.push(new THREE.Vector3(cfg.dist * Math.cos(rad), 0, cfg.dist * Math.sin(rad)));
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
      const orbitMat = new THREE.LineBasicMaterial({ color: new THREE.Color(cfg.color), transparent: true, opacity: 0.25 });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);

      // Planet Sphere Mesh
      const pGeo = new THREE.SphereGeometry(cfg.radius, 32, 32);
      const pMat = new THREE.MeshStandardMaterial({ map: createPlanetTexture(cfg.key), roughness: 0.7 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.userData = { config: cfg, id: `planet-${cfg.key}` };
      scene.add(pMesh);

      // Saturn Ring Mesh
      if (cfg.hasRing) {
        const ringGeo = new THREE.RingGeometry(cfg.radius * 1.3, cfg.radius * 2.3, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          map: createSaturnRingTexture(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.5;
        pMesh.add(ringMesh);
      }

      planetMeshes.push(pMesh);
    });

    // 7. NEO Glowing Sprites with 3D Orbit Trajectory Arcs
    const glowSpriteTexture = createGlowSpriteTexture();
    const neoGroup = new THREE.Group();
    scene.add(neoGroup);
    const neoSprites = [];

    const neoEvents = events.filter(e => e.source === 'NASA NeoWs' || e.type.includes('Near-Earth'));
    neoEvents.forEach((neo, idx) => {
      const missLunar = parseFloat(neo.raw_data?.miss_distance_lunar || 15);
      const isHigh = neo.severity === 'high';
      const isMed = neo.severity === 'medium';
      const color = isHigh ? 0xff2a6d : isMed ? 0xffb703 : 0x00f3ff;

      const dist = EARTH_RADIUS + 2.5 + Math.log2(Math.max(1, missLunar)) * 1.8;
      const phi = (idx / Math.max(1, neoEvents.length)) * Math.PI * 2;
      const theta = ((idx * 53) % 180 - 90) * (Math.PI / 180);

      const nx = dist * Math.cos(theta) * Math.sin(phi);
      const ny = dist * Math.sin(theta);
      const nz = dist * Math.cos(theta) * Math.cos(phi);

      // Asteroid 3D Orbit Trajectory Line
      const neoOrbitPts = [];
      for (let i = 0; i <= 360; i += 6) {
        const rad = (i * Math.PI) / 180;
        const ox = dist * Math.cos(theta) * Math.sin(rad);
        const oy = dist * Math.sin(theta) * Math.cos(rad);
        const oz = dist * Math.cos(theta) * Math.cos(rad);
        neoOrbitPts.push(new THREE.Vector3(ox, oy, oz));
      }
      const neoOrbitGeo = new THREE.BufferGeometry().setFromPoints(neoOrbitPts);
      const neoOrbitMat = new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0.25 });
      const neoOrbitLine = new THREE.LineLoop(neoOrbitGeo, neoOrbitMat);
      neoOrbitLine.computeLineDistances();
      scene.add(neoOrbitLine);

      const spriteMat = new THREE.SpriteMaterial({
        map: glowSpriteTexture,
        color: new THREE.Color(color),
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.95
      });
      const sprite = new THREE.Sprite(spriteMat);
      const scale = isHigh ? 1.0 : isMed ? 0.8 : 0.6;
      sprite.scale.set(scale, scale, scale);
      sprite.position.set(nx, ny, nz);
      sprite.userData = { neoData: neo, missLunar, baseScale: scale, id: neo.id };

      neoGroup.add(sprite);
      neoSprites.push(sprite);
    });

    // Raycasting for object hover tooltips & click-to-focus
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(neoSprites);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        setHoveredNeo(hit.userData.neoData);
        setTooltipPos({ x: e.clientX + 12, y: e.clientY - 12 });
      } else {
        setHoveredNeo(null);
      }
    };

    const onClickScene = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([...neoSprites, ...planetMeshes, issMesh, moonMesh]);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit === issMesh) {
          setActiveTarget({ type: 'iss', name: 'ISS', id: 'iss' });
        } else if (hit === moonMesh) {
          setActiveTarget({ type: 'moon', name: 'MOON', id: 'moon' });
        } else if (hit.userData?.config) {
          const pCfg = hit.userData.config;
          setActiveTarget({ type: 'planet', name: pCfg.name, id: `planet-${pCfg.key}`, config: pCfg });
        } else if (hit.userData?.neoData) {
          const neoObj = hit.userData.neoData;
          setActiveTarget({ type: 'neo', id: neoObj.id, name: neoObj.raw_data?.name || 'ASTEROID', data: neoObj });
        }
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onClickScene);

    // 3D to 2D Screen Projection Helper
    const projectToScreen = (vec) => {
      const p = vec.clone();
      p.applyMatrix4(scene.matrixWorld);
      p.project(camera);
      const x = (p.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-(p.y * 0.5) + 0.5) * container.clientHeight;
      const isInside = p.z > -1 && p.z < 1 && x >= 40 && x <= container.clientWidth - 40 && y >= 40 && y <= container.clientHeight - 40;
      return { x, y, visible: isInside };
    };

    // Edge Clamped Directional Arrow Helper
    const getEdgeClampedIndicator = (vec3, id, name, label, severity) => {
      const margin = 28;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const cx = w / 2;
      const cy = h / 2;

      const p = vec3.clone();
      p.applyMatrix4(scene.matrixWorld);
      p.project(camera);

      let dx = p.x;
      let dy = p.y;
      if (p.z > 1) {
        dx = -dx;
        dy = -dy;
      }

      const rawX = (dx * 0.5 + 0.5) * w;
      const rawY = (-(dy * 0.5) + 0.5) * h;

      const isOffscreen = p.z >= 1 || rawX < margin || rawX > w - margin || rawY < margin || rawY > h - margin;

      if (!isOffscreen) {
        return null;
      }

      const dirX = rawX - cx;
      const dirY = rawY - cy;
      const angleRad = Math.atan2(dirY, dirX);
      const angleDeg = (angleRad * 180) / Math.PI;

      const minX = margin;
      const maxX = w - margin;
      const minY = margin;
      const maxY = h - margin;

      let clampedX = cx;
      let clampedY = cy;

      if (dirX !== 0) {
        const tx = dirX > 0 ? (maxX - cx) / dirX : (minX - cx) / dirX;
        clampedX = cx + dirX * tx;
        clampedY = cy + dirY * tx;
      }

      if (clampedY < minY || clampedY > maxY) {
        if (dirY !== 0) {
          const ty = dirY > 0 ? (maxY - cy) / dirY : (minY - cy) / dirY;
          clampedX = cx + dirX * ty;
          clampedY = cy + dirY * ty;
        }
      }

      clampedX = Math.max(minX, Math.min(maxX, clampedX));
      clampedY = Math.max(minY, Math.min(maxY, clampedY));

      return {
        id,
        name,
        label,
        severity,
        angleDeg,
        x: clampedX,
        y: clampedY
      };
    };

    // 8. Animation Loop
    const DEMO_ROTATION_SPEED = (Math.PI * 2) / 150;

    let animationFrameId;
    let planetOrbitAngle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      planetOrbitAngle += delta * 0.1;

      // Rotate Clouds Independently for Atmospheric Realism
      cloudMesh.rotation.y += 0.0004;

      // Update Moon Position & Real-Time Tidal Locked Rotation
      const isRealtime = rotationModeRef.current === 'realtime';
      const elapsedHours = (Date.now() % (86400 * 1000 * 365)) / (3600 * 1000);

      const moonOrbitSpeed = isRealtime ? 0.000005 : 0.00005;
      const moonAngle = Date.now() * moonOrbitSpeed;
      const moonX = MOON_ORBIT_RADIUS * Math.cos(moonAngle);
      const moonY = MOON_ORBIT_RADIUS * Math.sin(moonAngle) * Math.sin((5.14 * Math.PI) / 180);
      const moonZ = MOON_ORBIT_RADIUS * Math.sin(moonAngle) * Math.cos((5.14 * Math.PI) / 180);
      moonMesh.position.set(moonX, moonY, moonZ);

      if (isRealtime) {
        moonMesh.rotation.y = (elapsedHours / 655.2) * Math.PI * 2;
      } else {
        moonMesh.rotation.y += 0.0005;
      }

      // Update Solar System Planets Orbiting Positions & Real-Time Planetary Rotations
      const planetOrbitSpeedMult = isRealtime ? 0.000015 : 0.0004;

      planetMeshes.forEach(pMesh => {
        const cfg = pMesh.userData.config;
        const pAngle = Date.now() * cfg.speed * planetOrbitSpeedMult;
        const px = cfg.dist * Math.cos(pAngle);
        const pz = cfg.dist * Math.sin(pAngle);
        pMesh.position.set(px, 0, pz);

        // Real-Time Rotation based on physical rotation period (in hours)
        const rotHours = cfg.rotationPeriodHours || 24;
        if (isRealtime) {
          pMesh.rotation.y = (elapsedHours / rotHours) * Math.PI * 2;
        } else {
          const demoSpin = (0.1 / Math.abs(rotHours)) * (rotHours < 0 ? -1 : 1);
          pMesh.rotation.y += demoSpin * delta;
        }
      });

      // Camera Focus & Target Tracking Interpolation
      const targetObj = activeTargetRef.current;
      const desiredPivot = new THREE.Vector3(0, 0, 0);

      if (targetObj) {
        if (targetObj.type === 'iss' || targetObj.id === 'iss') {
          desiredPivot.copy(currentIssPos);
        } else if (targetObj.type === 'moon' || targetObj.id === 'moon') {
          desiredPivot.copy(moonMesh.position);
        } else if (targetObj.type === 'planet' || String(targetObj.id).startsWith('planet-')) {
          const matchPlanet = planetMeshes.find(p => p.userData.id === targetObj.id || p.userData.config?.name === targetObj.name);
          if (matchPlanet) {
            desiredPivot.copy(matchPlanet.position);
          }
        } else if (targetObj.type === 'neo' || targetObj.id) {
          const matchSprite = neoSprites.find(s => s.userData.id === targetObj.id);
          if (matchSprite) {
            desiredPivot.copy(matchSprite.position);
          }
        }
        
        // Show 3D reticle around target
        reticleMesh.visible = true;
        reticleMesh.position.copy(desiredPivot);
        reticleMesh.rotation.z += 0.02;
        reticleMesh.lookAt(camera.position);
      } else {
        reticleMesh.visible = false;
      }

      // Smoothly lerp OrbitControls target to pivot
      controls.target.lerp(desiredPivot, 0.08);

      // Update OrbitControls damping & camera position
      controls.update();

      const now = new Date();
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
      
      const solarAngle = ((12 - utcHours) / 24) * Math.PI * 2;
      const sunDir = new THREE.Vector3(Math.cos(solarAngle), 0.35, Math.sin(solarAngle)).normalize();
      
      // Synchronize 3D scene directional lighting with real UTC sun direction
      sunLight.position.copy(sunDir.clone().multiplyScalar(150));
      earthShaderMat.uniforms.sunDirection.value.copy(sunDir);

      if (rotationModeRef.current === 'realtime') {
        earthMesh.rotation.y = -solarAngle;
      } else {
        earthMesh.rotation.y += DEMO_ROTATION_SPEED * delta;
      }

      // Convert ISS lat/long to 3D Cartesian target
      const latRad = (latitude * Math.PI) / 180;
      const lonRad = (longitude * Math.PI) / 180;
      const r = ORBIT_ALTITUDE;

      targetIssPos.set(
        r * Math.cos(latRad) * Math.sin(lonRad),
        r * Math.sin(latRad),
        r * Math.cos(latRad) * Math.cos(lonRad)
      );

      // Smooth ISS marker glide
      currentIssPos.lerp(targetIssPos, 0.04);
      issMesh.position.copy(currentIssPos);

      // Update trail positions
      trailPositions.push(currentIssPos.clone());
      if (trailPositions.length > MAX_TRAIL_PTS) {
        trailPositions.shift();
      }
      trailGeo.setFromPoints(trailPositions);

      // Update Screen projected 2D label coordinates
      scene.updateMatrixWorld();

      // Earth & Moon Labels
      const eTop = new THREE.Vector3(0, EARTH_RADIUS + 0.6, 0);
      setEarthLabelPos(projectToScreen(eTop));
      setMoonLabelPos(projectToScreen(moonMesh.position));

      // ISS Label & Off-Screen Edge Indicator
      setIssLabelPos(projectToScreen(currentIssPos));

      // Collect Off-Screen Edge Indicators for ISS & NEOs
      const offscreenList = [];

      const issOffscreen = getEdgeClampedIndicator(currentIssPos, 'iss', 'ISS', `ISS (${altitude})`, 'low');
      if (issOffscreen) offscreenList.push(issOffscreen);

      // Zoom distance factor & density scaling for label collision avoidance
      const camDist = camera.position.length();
      const zoomOpacityFactor = Math.min(1, Math.max(0.45, 1 - (camDist - 25) * 0.008));
      const zoomFontSize = camDist > 50 ? '8px' : '9px';

      // Collect All Active Screen Labels for Global Collision Avoidance (Planets + NEOs)
      const allScreenLabels = [];

      // Planet Screen Labels
      planetMeshes.forEach(pMesh => {
        const pCoords = projectToScreen(pMesh.position);
        const pCfg = pMesh.userData.config;
        if (pCoords.visible) {
          allScreenLabels.push({
            id: pMesh.userData.id,
            name: `${pCfg.symbol} ${pCfg.name}`,
            type: 'planet',
            config: pCfg,
            x: pCoords.x,
            y: pCoords.y,
            offsetY: 0,
            opacity: zoomOpacityFactor * 0.9,
            fontSize: zoomFontSize,
            colorClass: 'border-cyan-500/60 text-cyan-300 bg-slate-950/85'
          });
        }
      });

      // NEO Asteroid Labels
      neoSprites.forEach(sprite => {
        const sPos = sprite.position.clone();
        const coords = projectToScreen(sPos);
        const neoObj = sprite.userData.neoData;
        const missLunarStr = typeof sprite.userData.missLunar === 'number' ? `${sprite.userData.missLunar.toFixed(1)} LD` : '';

        const neoOffscreen = getEdgeClampedIndicator(
          sPos,
          sprite.userData.id,
          neoObj.raw_data?.name || 'ASTEROID',
          `${neoObj.raw_data?.name || 'ASTEROID'} (${missLunarStr})`,
          neoObj.severity
        );

        if (neoOffscreen) {
          offscreenList.push(neoOffscreen);
        }

        if (coords.visible) {
          const isHigh = neoObj.severity === 'high';
          const isMed = neoObj.severity === 'medium';
          const colorClass = isHigh ? 'border-rose-500 text-rose-300 bg-rose-950/90' : isMed ? 'border-amber-500 text-amber-300 bg-amber-950/90' : 'border-cyan-500/50 text-cyan-300 bg-slate-950/80';

          allScreenLabels.push({
            id: sprite.userData.id,
            name: `${neoObj.raw_data?.name || 'ASTEROID'} (${missLunarStr})`,
            type: 'neo',
            severity: neoObj.severity,
            x: coords.x,
            y: coords.y,
            offsetY: 0,
            opacity: zoomOpacityFactor * (isHigh ? 1.0 : 0.85),
            fontSize: zoomFontSize,
            colorClass
          });
        }
      });

      // Simple 2D Screen Space Collision Avoidance Offset & Opacity Adjustment Across All Labels
      allScreenLabels.sort((a, b) => a.y - b.y);

      for (let i = 0; i < allScreenLabels.length; i++) {
        const lblA = allScreenLabels[i];
        let stackedOffsetY = 0;

        for (let j = 0; j < i; j++) {
          const lblB = allScreenLabels[j];
          const xDiff = Math.abs(lblA.x - lblB.x);
          const currentY_A = lblA.y + stackedOffsetY;
          const currentY_B = lblB.y + lblB.offsetY;
          const yDiff = currentY_A - currentY_B;

          if (xDiff < 90 && yDiff >= -4 && yDiff < 18) {
            stackedOffsetY += (currentY_B + 18) - currentY_A;
            lblA.opacity *= 0.82;
          }
        }
        lblA.offsetY = stackedOffsetY;
      }

      setPlanetLabelPositions(allScreenLabels.filter(l => l.type === 'planet'));
      setNeoLabelPositions(allScreenLabels.filter(l => l.type === 'neo'));
      setEdgeIndicators(offscreenList);

      // Calculate Camera Azimuth Orientation for Compass Rose
      const camAz = Math.round(((Math.atan2(camera.position.x, camera.position.z) * 180) / Math.PI + scene.rotation.y * (180 / Math.PI) + 360) % 360);
      setCameraAzimuth(camAz);

      // Pulsing pulse animation for high severity NEO sprites
      neoSprites.forEach(sprite => {
        if (sprite.userData.neoData?.severity === 'high') {
          const s = sprite.userData.baseScale * (1 + Math.sin(Date.now() * 0.008) * 0.3);
          sprite.scale.set(s, s, s);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('click', onClickScene);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [latitude, longitude, events]);

  const handleResetCameraTarget = () => {
    setActiveTarget(null);
    if (onClearFocus) onClearFocus();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#02040a] text-slate-100 font-mono select-none overflow-hidden">
      {/* Three.js Render Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Critical Simulation Error Alert Banner (For Screenshot Capture) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[125] hud-card px-5 py-3 rounded-lg border-2 border-rose-500 bg-rose-950/95 backdrop-blur-md flex items-center gap-4 shadow-[0_0_30px_rgba(255,42,109,0.6)] animate-pulse">
        <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
        <div>
          <div className="text-xs font-bold text-rose-300 uppercase tracking-widest flex items-center gap-2">
            <span>[CRITICAL SIMULATION ERROR]</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-900/90 border border-rose-400 text-[9px] text-rose-100 font-mono">ERR_ORBIT_DESYNC_0x88F</span>
          </div>
          <div className="text-[11px] text-slate-200 mt-0.5 font-mono">
            Simulated trajectory anomaly detected: <strong className="text-rose-400">Orbital drift deviation &gt; 14.2%</strong>. Telemetry sync compromised.
          </div>
        </div>
      </div>

      {/* Target Locked HUD Telemetry Card (Top Center) */}
      {activeTarget && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[115] hud-card px-4 py-2.5 rounded-lg border border-cyan-400 bg-slate-950/90 backdrop-blur-md flex items-center gap-4 shadow-hud-cyan animate-pulse-subtle">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
            <Crosshair className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>TARGET LOCKED: {activeTarget.name || (activeTarget.type === 'iss' ? 'ISS' : 'OBJECT')}</span>
          </div>

          {activeTarget.type === 'iss' || activeTarget.id === 'iss' ? (
            <div className="text-[11px] text-slate-300 flex items-center gap-3">
              <span>ALT: <strong className="text-amber-300">{altitude}</strong></span>
              <span>SPEED: <strong className="text-emerald-300">{velocity}</strong></span>
            </div>
          ) : activeTarget.type === 'planet' || activeTarget.config ? (
            <div className="text-[11px] text-slate-300 flex items-center gap-3">
              <span>ORBIT DIST: <strong className="text-amber-300">{activeTarget.config?.dist || 100} AU</strong></span>
              <span>CLASS: <strong className="text-cyan-300">SOLAR PLANET</strong></span>
            </div>
          ) : activeTarget.data ? (
            <div className="text-[11px] text-slate-300 flex items-center gap-3">
              <span>MISS: <strong className="text-amber-300">{activeTarget.data.raw_data?.miss_distance_lunar || 'N/A'} LD</strong></span>
              <span>MAG: <strong className="text-cyan-300">{activeTarget.data.raw_data?.absolute_magnitude_h || 'N/A'} H</strong></span>
              {activeTarget.data.raw_data?.is_potentially_hazardous && (
                <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300 text-[9px] font-bold">HAZARD</span>
              )}
            </div>
          ) : null}

          <button
            onClick={handleResetCameraTarget}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 text-[10px] font-bold transition"
            title="Reset camera focus back to Earth"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>RESET CAMERA</span>
          </button>
        </div>
      )}

      {/* Off-screen Viewport Edge-Clamped Directional Indicators */}
      {edgeIndicators.map(ind => {
        const isHigh = ind.severity === 'high';
        const isMed = ind.severity === 'medium';
        const colorClass = isHigh ? 'border-rose-500 text-rose-300 bg-rose-950/90' : isMed ? 'border-amber-500 text-amber-300 bg-amber-950/90' : 'border-cyan-400 text-cyan-300 bg-slate-950/90';

        return (
          <button
            key={`edge-${ind.id}`}
            onClick={() => setActiveTarget({ type: ind.id === 'iss' ? 'iss' : 'neo', id: ind.id, name: ind.name })}
            style={{ left: ind.x, top: ind.y }}
            className={`fixed z-[108] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded border ${colorClass} text-[10px] font-bold cursor-pointer hover:scale-105 shadow-hud-cyan whitespace-nowrap transition-transform`}
          >
            {/* Arrow Icon rotated towards true off-screen object direction */}
            <div style={{ transform: `rotate(${ind.angleDeg}deg)` }} className="shrink-0">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <span>{ind.label}</span>
          </button>
        );
      })}

      {/* 3D-to-2D Screen HTML Overlay Labels (Shown ONLY when an object is clicked/targeted) */}
      {/* 1. EARTH Label */}
      {earthLabelPos.visible && (activeTarget?.type === 'earth' || activeTarget?.id === 'earth') && (
        <button
          onClick={handleResetCameraTarget}
          style={{ left: earthLabelPos.x, top: earthLabelPos.y }}
          className="fixed z-[105] -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded bg-slate-950/90 border border-cyan-400 text-xs font-bold text-cyan-300 pointer-events-auto shadow-hud-cyan tracking-wider animate-pulse-subtle"
        >
          🌐 EARTH
        </button>
      )}

      {/* 2. MOON Label */}
      {moonLabelPos.visible && (activeTarget?.type === 'moon' || activeTarget?.id === 'moon') && (
        <button
          onClick={() => setActiveTarget({ type: 'moon', name: 'MOON', id: 'moon' })}
          style={{ left: moonLabelPos.x, top: moonLabelPos.y }}
          className="fixed z-[105] -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded bg-slate-950/90 border border-slate-300 text-xs font-bold text-slate-100 pointer-events-auto shadow-hud-cyan tracking-wider animate-pulse-subtle"
        >
          🌕 MOON
        </button>
      )}

      {/* 3. ISS Label */}
      {issLabelPos.visible && (activeTarget?.type === 'iss' || activeTarget?.id === 'iss') && (
        <button
          onClick={() => setActiveTarget({ type: 'iss', name: 'ISS', id: 'iss' })}
          style={{ left: issLabelPos.x + 12, top: issLabelPos.y - 12 }}
          className="fixed z-[105] px-2.5 py-1 rounded bg-slate-950/90 border border-cyan-400 text-xs font-bold text-cyan-300 pointer-events-auto shadow-hud-cyan whitespace-nowrap flex items-center gap-1.5 animate-pulse-subtle"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>ISS | {altitude} | {velocity}</span>
        </button>
      )}

      {/* 4. Solar System Planet Labels (Only visible when targeted) */}
      {planetLabelPositions.map(lbl => {
        const isTargeted = activeTarget && (activeTarget.id === lbl.id || activeTarget.name === lbl.config?.name);
        if (!isTargeted) return null;

        return (
          <button
            key={lbl.id}
            onClick={() => setActiveTarget({ type: 'planet', name: lbl.config?.name || 'PLANET', id: lbl.id, config: lbl.config })}
            style={{
              left: lbl.x + 10,
              top: lbl.y - 10,
              fontSize: '11px'
            }}
            className={`fixed z-[105] px-2.5 py-1 rounded border ${lbl.colorClass} font-bold pointer-events-auto whitespace-nowrap shadow-hud-cyan animate-pulse-subtle`}
          >
            {lbl.name}
          </button>
        );
      })}

      {/* 5. NEO Asteroid Labels (Only visible when targeted) */}
      {neoLabelPositions.map(lbl => {
        const isTargeted = activeTarget && (activeTarget.id === lbl.id || activeTarget.name === lbl.name);
        if (!isTargeted) return null;

        return (
          <button
            key={lbl.id}
            onClick={() => setActiveTarget({ type: 'neo', id: lbl.id, name: lbl.name })}
            style={{
              left: lbl.x + 10,
              top: lbl.y - 10,
              fontSize: '11px'
            }}
            className={`fixed z-[105] px-2.5 py-1 rounded border ${lbl.colorClass} font-bold pointer-events-auto whitespace-nowrap shadow-hud-cyan animate-pulse-subtle`}
          >
            {lbl.name}
          </button>
        );
      })}

      {/* Camera Orientation HUD Compass Rose (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[105] hud-card p-3 rounded-lg border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md flex items-center gap-3 pointer-events-auto">
        <div className="relative w-10 h-10 flex items-center justify-center border border-cyan-500/30 rounded-full bg-slate-900/80">
          {/* Rotating Compass Ring */}
          <div
            style={{ transform: `rotate(${-cameraAzimuth}deg)` }}
            className="absolute inset-0 transition-transform duration-100 flex items-center justify-center text-[9px] font-bold text-cyan-400"
          >
            <span className="absolute top-0.5 text-amber-400 font-bold">N</span>
            <span className="absolute right-1 text-slate-400">E</span>
            <span className="absolute bottom-0.5 text-slate-400">S</span>
            <span className="absolute left-1 text-slate-400">W</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        </div>

        <div className="text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase">CAMERA AZIMUTH</div>
          <div className="text-sm font-bold text-cyan-300">
            {String(cameraAzimuth).padStart(3, '0')}° BEARING
          </div>
        </div>
      </div>

      {/* Top Left Telemetry Overlay */}
      <div className="absolute top-4 left-4 hud-card p-4 rounded-lg border border-cyan-500/40 bg-slate-950/80 backdrop-blur-md max-w-sm pointer-events-auto">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/30">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-bold tracking-widest text-cyan-300 uppercase">
            SOLAR SYSTEM & ORBITAL VIEW
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-slate-400">LATITUDE</div>
            <div className="font-bold text-cyan-300">{latitude >= 0 ? `${latitude.toFixed(2)}° N` : `${Math.abs(latitude).toFixed(2)}° S`}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">LONGITUDE</div>
            <div className="font-bold text-cyan-300">{longitude >= 0 ? `${longitude.toFixed(2)}° E` : `${Math.abs(longitude).toFixed(2)}° W`}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">ALTITUDE</div>
            <div className="font-bold text-amber-300">{altitude}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">ORBITAL SPEED</div>
            <div className="font-bold text-emerald-300">{velocity}</div>
          </div>
        </div>
      </div>

      {/* Top Right Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2.5 pointer-events-auto">
        {/* Rotation Mode Toggle (REAL-TIME vs DEMO SPEED) */}
        <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded p-1 text-xs">
          <button
            onClick={() => setRotationMode('realtime')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition ${
              rotationMode === 'realtime'
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-hud-cyan'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>REAL-TIME ROTATION</span>
          </button>

          <button
            onClick={() => setRotationMode('demo')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold transition ${
              rotationMode === 'demo'
                ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-hud-amber'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>DEMO SPEED</span>
          </button>
        </div>

        {/* DEFCON Status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-950/80 border border-amber-500/50 text-amber-400 text-xs font-bold font-mono">
          <Radio className="w-4 h-4" />
          <span>DEFCON {defconLevel}</span>
        </div>

        {/* Audio Ambient Hum Toggle */}
        <button
          onClick={handleToggleAudio}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold transition ${
            isAudioEnabled 
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan' 
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAudioEnabled ? <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          <span>{isAudioEnabled ? 'AUDIO ON' : 'AUDIO MUTED'}</span>
        </button>

        {/* Exit 3D View Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-500/60 text-rose-300 hover:bg-rose-900 text-xs font-bold transition shadow-hud-red"
        >
          <X className="w-4 h-4" />
          <span>EXIT 3D VIEW</span>
        </button>
      </div>

      {/* Bottom Center Instructions Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 border border-slate-800 px-4 py-1.5 rounded-full text-xs text-slate-400 font-mono flex items-center gap-2 pointer-events-none">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <span>CLICK PLANETS / ASTEROIDS / ISS TO TRACK | SCROLL TO ZOOM (MAX 320 AU)</span>
      </div>

      {/* Hovered NEO Tooltip Overlay */}
      {hoveredNeo && tooltipPos.x > 0 && (
        <div
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
          className="fixed z-[110] hud-card p-3 rounded border border-cyan-400 bg-slate-950/95 text-xs font-mono pointer-events-none shadow-hud-cyan"
        >
          <div className="text-cyan-300 font-bold mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            {hoveredNeo.raw_data?.name || 'ASTEROID'}
          </div>
          <div className="text-slate-300">
            DISTANCE: <strong className="text-amber-300">{hoveredNeo.raw_data?.miss_distance_lunar || 'N/A'} LD</strong>
          </div>
          <div className="text-slate-400 text-[10px]">
            VELOCITY: {hoveredNeo.raw_data?.velocity_kmh || 'N/A'} km/h
          </div>
        </div>
      )}
    </div>
  );
}

