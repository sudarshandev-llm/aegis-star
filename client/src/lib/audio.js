// Web Audio API Synthesizer for Ambient Space Drone & Alert Pings

let audioCtx = null;
let ambientOsc = null;
let lfoOsc = null;
let masterGain = null;
let isHumRunning = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function startAmbientHum() {
  const ctx = getAudioContext();
  if (!ctx || isHumRunning) return;

  try {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 1.5);

    // Deep Sub-Drone Oscillator (55Hz / A1)
    ambientOsc = ctx.createOscillator();
    ambientOsc.type = 'sawtooth';
    ambientOsc.frequency.setValueAtTime(55, ctx.currentTime);

    // Lowpass filter for smooth deep rumble
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);

    // LFO to create breathing pulse in ambient drone
    lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.setValueAtTime(0.25, ctx.currentTime); // 0.25 Hz pulse

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(30, ctx.currentTime);

    lfoOsc.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    ambientOsc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    ambientOsc.start();
    lfoOsc.start();
    isHumRunning = true;
  } catch (err) {
    console.warn('[Web Audio] Failed to start ambient hum:', err);
  }
}

export function stopAmbientHum() {
  if (!audioCtx || !isHumRunning) return;

  try {
    if (masterGain) {
      masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      setTimeout(() => {
        if (ambientOsc) {
          ambientOsc.stop();
          ambientOsc.disconnect();
          ambientOsc = null;
        }
        if (lfoOsc) {
          lfoOsc.stop();
          lfoOsc.disconnect();
          lfoOsc = null;
        }
        isHumRunning = false;
      }, 550);
    }
  } catch (err) {
    console.warn('[Web Audio] Error stopping hum:', err);
  }
}

export function playAlertBlip() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6 ping

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn('[Web Audio] Alert blip error:', err);
  }
}
