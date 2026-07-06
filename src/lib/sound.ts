"use client";

/**
 * Synthesises a realistic "paper page turn" using the Web Audio API — a soft
 * noise swish (paper sliding) plus a faint low thump (page settling). No audio
 * asset needed. The first call must come from a user gesture so the browser
 * lets the AudioContext start.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(ac: AudioContext, duration: number): AudioBuffer {
  const size = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, size, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) {
    const t = i / size;
    // fast attack, smooth decay — the shape of a paper swish
    const env = Math.pow(1 - t, 1.6) * Math.min(1, t * 12);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  return buffer;
}

export function playFlipSound(): void {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const duration = 0.3;

    // --- layer 1: paper swish (band-limited noise with a rising sweep) ---
    const swish = ac.createBufferSource();
    swish.buffer = noiseBuffer(ac, duration);

    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(900, now);
    band.frequency.linearRampToValueAtTime(2600, now + duration);
    band.Q.value = 0.9;

    const swishGain = ac.createGain();
    swishGain.gain.setValueAtTime(0.0001, now);
    swishGain.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    swishGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    swish.connect(band);
    band.connect(swishGain);
    swishGain.connect(ac.destination);
    swish.start(now);
    swish.stop(now + duration);

    // --- layer 2: soft low thump as the page lands ---
    const thump = ac.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(180, now + 0.12);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.26);

    const thumpGain = ac.createGain();
    thumpGain.gain.setValueAtTime(0.0001, now + 0.12);
    thumpGain.gain.exponentialRampToValueAtTime(0.14, now + 0.16);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    thump.connect(thumpGain);
    thumpGain.connect(ac.destination);
    thump.start(now + 0.12);
    thump.stop(now + 0.3);
  } catch {
    /* ignore audio failures */
  }
}
