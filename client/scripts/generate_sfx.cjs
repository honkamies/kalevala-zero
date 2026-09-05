const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function createWavBuffer(samples) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1.0, Math.min(1.0, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intSample), offset);
    offset += 2;
  }

  return buffer;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function noise() {
  return Math.random() * 2 - 1;
}

function softClip(x, drive = 1.5) {
  const driven = x * drive;
  return Math.tanh(driven);
}

// 1. Plasma Gunshots (Punchy kinetic mechanical snap + deep sub body)
function generatePlasmaShot(variant = 1) {
  const duration = 0.22;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const baseFreq = 750 + (variant - 1) * 60;
  const endFreq = 50 + (variant - 1) * 10;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const freq = baseFreq * Math.pow(endFreq / baseFreq, progress * 1.8);
    const phase = 2 * Math.PI * freq * t;

    const saw = (2 * ((t * freq) % 1)) - 1;
    const sq = Math.sin(phase) > 0 ? 0.7 : -0.7;
    const core = saw * 0.6 + sq * 0.4;

    const snapEnv = Math.exp(-t * 180);
    const snap = noise() * snapEnv * 0.8;

    const subFreq = 120 * Math.exp(-t * 25);
    const sub = Math.sin(2 * Math.PI * subFreq * t) * Math.exp(-t * 22) * 0.7;

    const env = Math.exp(-progress * 9.0);

    const raw = (core * 0.5 + snap + sub) * env;
    samples[i] = softClip(raw, 2.2) * 0.85;
  }
  return samples;
}

// 2. Melee Blade Swish (Heavy air displacement)
function generateMeleeSwing(variant = 1) {
  const duration = 0.24;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  let filterState = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const env = Math.sin(progress * Math.PI);

    const cutoff = 2000 * Math.pow(0.12, progress);
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / SAMPLE_RATE;
    const alpha = dt / (rc + dt);

    const n = noise();
    filterState += alpha * (n - filterState);

    const sub = Math.sin(2 * Math.PI * (180 - progress * 100) * t) * 0.4;

    const raw = (filterState * 1.6 + sub) * env;
    samples[i] = softClip(raw, 1.4) * 0.75;
  }
  return samples;
}

// 3. Dodge Thruster Hiss & Jet Blast
function generateDodgeJet(variant = 1) {
  const duration = 0.26;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const env = Math.exp(-progress * 8.0);
    const jetNoise = noise() * (0.8 + 0.2 * Math.sin(t * 1200));
    const subThruster = Math.sin(2 * Math.PI * 65 * t) * Math.exp(-progress * 5.0) * 0.6;

    const raw = (jetNoise * 0.65 + subThruster) * env;
    samples[i] = softClip(raw, 1.8) * 0.8;
  }
  return samples;
}

// 4. Flesh Impact (Visceral wet crunch + bone crack)
function generateFleshImpact(variant = 1) {
  const duration = 0.18;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const crackEnv = Math.exp(-t * 260);
    const crack = noise() * crackEnv * 1.2;

    const squishFreq = (140 + variant * 20) * Math.exp(-t * 30);
    const squish = Math.sin(2 * Math.PI * squishFreq * t) * Math.exp(-progress * 12.0);

    const thud = Math.sin(2 * Math.PI * 45 * t) * Math.exp(-progress * 10.0) * 0.8;

    const raw = (crack * 0.7 + squish * 0.8 + thud * 0.6);
    samples[i] = softClip(raw, 2.5) * 0.9;
  }
  return samples;
}

// 5. Shield Deflection (Resonant energy barrier spark & chime)
function generateShieldDeflect(variant = 1) {
  const duration = 0.22;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const f1 = 1450 + (variant - 1) * 120;
  const f2 = 2180 + (variant - 1) * 160;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 22.0);
    const spark = noise() * Math.exp(-t * 180) * 0.6;
    const chime = (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t) * 0.6) * env;

    const raw = (spark + chime * 0.8);
    samples[i] = softClip(raw, 1.6) * 0.8;
  }
  return samples;
}

// 6. Heavy Explosion (Deep earth-shaking blast with long decay)
function generateHeavyExplosion(variant = 1) {
  const duration = 0.75;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const crack = noise() * Math.exp(-t * 80) * 1.2;
    const sub = Math.sin(2 * Math.PI * 34 * Math.exp(-progress * 1.5) * t) * Math.exp(-progress * 3.5);
    const rumbleNoise = noise() * Math.exp(-progress * 4.5) * 0.5;

    const raw = (crack * 0.8 + sub * 1.1 + rumbleNoise * 0.6);
    samples[i] = softClip(raw, 2.8) * 0.92;
  }
  return samples;
}

// 7. Gore Explosion (Wet splatter burst)
function generateGoreExplosion(variant = 1) {
  const duration = 0.45;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const wetSnap = noise() * Math.exp(-t * 140) * 1.0;
    const squelch = Math.sin(2 * Math.PI * (160 * Math.exp(-t * 15)) * t) * Math.exp(-progress * 8.0);
    const subGore = Math.sin(2 * Math.PI * 50 * t) * Math.exp(-progress * 6.0) * 0.7;

    const raw = (wetSnap * 0.8 + squelch * 0.7 + subGore * 0.6);
    samples[i] = softClip(raw, 2.4) * 0.88;
  }
  return samples;
}

// 8. Hostile Monster Plasma (Menacing distorted zap)
function generateMonsterPlasma(variant = 1) {
  const duration = 0.25;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const freq = 460 * Math.exp(-progress * 2.8);
    const saw = (2 * ((t * freq) % 1)) - 1;
    const mod = Math.sin(2 * Math.PI * 80 * t) * 0.4;
    const env = Math.exp(-progress * 9.0);

    const raw = (saw + mod) * env;
    samples[i] = softClip(raw, 2.6) * 0.8;
  }
  return samples;
}

// 9. Void Skull / Homing Missile (Eerie hollow shrieking void discharge)
function generateVoidSkull(variant = 1) {
  const duration = 0.35;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const mod = Math.sin(2 * Math.PI * 240 * t) * 120;
    const carrier = Math.sin(2 * Math.PI * (380 + mod) * t);
    const sub = Math.sin(2 * Math.PI * 55 * t) * 0.6;
    const env = Math.exp(-progress * 6.0);

    const raw = (carrier * 0.6 + sub * 0.5 + noise() * 0.15) * env;
    samples[i] = softClip(raw, 2.0) * 0.82;
  }
  return samples;
}

// 10. Boss Roar (Guttural subterranean eldritch roar)
function generateBossRoar() {
  const duration = 1.6;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const tremolo = 1.0 + 0.35 * Math.sin(2 * Math.PI * 7.5 * t);
    const growl1 = Math.sin(2 * Math.PI * (58 - progress * 18) * t);
    const growl2 = Math.sin(2 * Math.PI * (82 - progress * 24) * t);
    const scream = Math.sin(2 * Math.PI * (420 * Math.exp(-progress * 1.2)) * t) * 0.35;
    const env = Math.sin(progress * Math.PI * 0.9) * Math.exp(-progress * 1.4);

    const raw = (growl1 * 0.5 + growl2 * 0.4 + scream + noise() * 0.2) * tremolo * env;
    samples[i] = softClip(raw, 2.8) * 0.88;
  }
  return samples;
}

// 11. Boss Heart Pulse (Visceral cardiac thud)
function generateBossHeartBeat() {
  const duration = 0.55;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    const beat1 = Math.sin(2 * Math.PI * 48 * t) * Math.exp(-t * 22.0) * 0.9;
    const t2 = Math.max(0, t - 0.16);
    const beat2 = (t >= 0.16 ? Math.sin(2 * Math.PI * 38 * t2) * Math.exp(-t2 * 20.0) * 0.75 : 0);

    const raw = beat1 + beat2;
    samples[i] = softClip(raw, 2.0) * 0.85;
  }
  return samples;
}

// 12. Reality Tear Dimensional Rift (The Ultimate Reality-Tearing Soundscape)
function generateRealityTear() {
  const duration = 2.8;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const snap = noise() * Math.exp(-t * 35.0) * 1.3;
    const modFreq = 1600 * Math.exp(-progress * 2.0);
    const mod = Math.sin(2 * Math.PI * modFreq * t) * 900;
    const carrierFreq = 1180 * Math.exp(-progress * 2.5) + mod;
    const tear = Math.sin(2 * Math.PI * carrierFreq * t) * Math.exp(-progress * 2.2) * 0.7;

    const sub = Math.sin(2 * Math.PI * 22 * t) * Math.exp(-progress * 1.5) * 0.9;
    const staticBurst = noise() * Math.exp(-progress * 2.0) * (0.2 + 0.1 * Math.sin(t * 40));

    const raw = (snap * 0.9 + tear * 0.8 + sub * 0.85 + staticBurst);
    samples[i] = softClip(raw, 3.2) * 0.92;
  }
  return samples;
}

// 13. Portal Warp Extraction (Triumphant celestial hyperdrive warp)
function generatePortalWarp() {
  const duration = 1.4;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const chord = [523.25, 659.25, 783.99, 1046.50];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    const warpFreq = 110 * Math.pow(16.0, progress);
    const warp = Math.sin(2 * Math.PI * warpFreq * t) * Math.exp(-progress * 2.5) * 0.5;

    let chordSum = 0;
    chord.forEach((f, idx) => {
      const st = Math.max(0, t - idx * 0.05);
      if (t >= idx * 0.05) {
        chordSum += Math.sin(2 * Math.PI * f * st) * Math.exp(-st * 2.2);
      }
    });

    const raw = warp + (chordSum / chord.length) * 0.8;
    samples[i] = softClip(raw, 1.5) * 0.85;
  }
  return samples;
}

// 14. Scrap Pickup (Crisp metallic nanite ratchet clink)
function generateScrapPickup(variant = 1) {
  const duration = 0.15;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const f1 = 2200 + variant * 300;
  const f2 = 3300 + variant * 450;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 40.0);
    const ping = (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t) * 0.7) * env;
    const click = noise() * Math.exp(-t * 220.0) * 0.4;

    const raw = (ping * 0.75 + click);
    samples[i] = softClip(raw, 1.4) * 0.75;
  }
  return samples;
}

// 15. Legendary Loot Chime (Ethereal crystalline chime)
function generateLootLegendary() {
  const duration = 1.0;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  const notes = [659.25, 830.61, 987.77, 1318.51];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    let sum = 0;
    notes.forEach((freq, idx) => {
      const st = t - idx * 0.08;
      if (st >= 0) {
        const env = Math.exp(-st * 4.0);
        sum += (Math.sin(2 * Math.PI * freq * st) + Math.sin(2 * Math.PI * freq * 2.01 * st) * 0.3) * env;
      }
    });
    samples[i] = softClip(sum * 0.35, 1.2) * 0.8;
  }
  return samples;
}

// 16. Button Click (Clean tactile mechanical click)
function generateButtonClick() {
  const duration = 0.06;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const click = noise() * Math.exp(-t * 300.0) * 0.8;
    const thud = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 80.0) * 0.5;
    samples[i] = softClip(click + thud, 1.5) * 0.7;
  }
  return samples;
}

const OUT_BASE = path.join(__dirname, '../public/audio/sfx');

const soundRegistry = [
  // Weapons
  { dir: 'weapons', file: 'plasma_shot_1.wav', fn: () => generatePlasmaShot(1) },
  { dir: 'weapons', file: 'plasma_shot_2.wav', fn: () => generatePlasmaShot(2) },
  { dir: 'weapons', file: 'plasma_shot_3.wav', fn: () => generatePlasmaShot(3) },
  { dir: 'weapons', file: 'melee_swing_1.wav', fn: () => generateMeleeSwing(1) },
  { dir: 'weapons', file: 'melee_swing_2.wav', fn: () => generateMeleeSwing(2) },
  { dir: 'weapons', file: 'dodge_jet_1.wav', fn: () => generateDodgeJet(1) },
  { dir: 'weapons', file: 'dodge_jet_2.wav', fn: () => generateDodgeJet(2) },

  // Impacts & Gore
  { dir: 'impacts', file: 'flesh_impact_1.wav', fn: () => generateFleshImpact(1) },
  { dir: 'impacts', file: 'flesh_impact_2.wav', fn: () => generateFleshImpact(2) },
  { dir: 'impacts', file: 'flesh_impact_3.wav', fn: () => generateFleshImpact(3) },
  { dir: 'impacts', file: 'shield_deflect_1.wav', fn: () => generateShieldDeflect(1) },
  { dir: 'impacts', file: 'shield_deflect_2.wav', fn: () => generateShieldDeflect(2) },
  { dir: 'impacts', file: 'heavy_explosion_1.wav', fn: () => generateHeavyExplosion(1) },
  { dir: 'impacts', file: 'heavy_explosion_2.wav', fn: () => generateHeavyExplosion(2) },
  { dir: 'impacts', file: 'gore_explosion_1.wav', fn: () => generateGoreExplosion(1) },
  { dir: 'impacts', file: 'gore_explosion_2.wav', fn: () => generateGoreExplosion(2) },

  // Monsters
  { dir: 'monsters', file: 'monster_plasma_1.wav', fn: () => generateMonsterPlasma(1) },
  { dir: 'monsters', file: 'monster_plasma_2.wav', fn: () => generateMonsterPlasma(2) },
  { dir: 'monsters', file: 'void_skull_1.wav', fn: () => generateVoidSkull(1) },
  { dir: 'monsters', file: 'void_skull_2.wav', fn: () => generateVoidSkull(2) },
  { dir: 'monsters', file: 'boss_roar_1.wav', fn: () => generateBossRoar() },
  { dir: 'monsters', file: 'boss_heart_beat_1.wav', fn: () => generateBossHeartBeat() },

  // Environment & Atmosphere
  { dir: 'environment', file: 'reality_tear_1.wav', fn: () => generateRealityTear() },
  { dir: 'environment', file: 'portal_warp_1.wav', fn: () => generatePortalWarp() },

  // UI
  { dir: 'ui', file: 'scrap_pickup_1.wav', fn: () => generateScrapPickup(1) },
  { dir: 'ui', file: 'scrap_pickup_2.wav', fn: () => generateScrapPickup(2) },
  { dir: 'ui', file: 'scrap_pickup_3.wav', fn: () => generateScrapPickup(3) },
  { dir: 'ui', file: 'loot_legendary_1.wav', fn: () => generateLootLegendary() },
  { dir: 'ui', file: 'button_click_1.wav', fn: () => generateButtonClick() }
];

console.log('Generating Studio-Grade 44.1kHz 16-bit WAV sound effects...');

soundRegistry.forEach(entry => {
  const targetDir = path.join(OUT_BASE, entry.dir);
  ensureDir(targetDir);
  const targetFile = path.join(targetDir, entry.file);

  const samples = entry.fn();
  const wavBuffer = createWavBuffer(samples);
  fs.writeFileSync(targetFile, wavBuffer);
  console.log(`✓ Generated: ${entry.dir}/${entry.file} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
});

console.log(`\nSuccessfully generated ${soundRegistry.length} studio-grade audio assets in public/audio/sfx/!`);
