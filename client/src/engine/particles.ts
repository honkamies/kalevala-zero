export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: string;
  glowColor?: string;
  alpha: number;
  life: number;
  maxLife: number;
  decay: number;
  glyph?: string;
  trail?: { x: number; y: number }[];
  shape?: 'circle' | 'pixel' | 'glitch_line' | 'matrix_hex' | 'shard' | 'lightning_streak';
  gravity?: number;
  text?: string;
  width?: number;
  height?: number;
}

export interface HeroShard {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  glowColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'armor_shard' | 'rune_plate' | 'cyber_gear' | 'plasma_core' | 'spark_cluster';
  glyph?: string;
  points?: { x: number; y: number }[];
  trail: { x: number; y: number; z: number }[];
}

export interface GoreGib {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  bloodColor: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'meat_chunk' | 'rib_bone' | 'eyeball' | 'jaw_fang' | 'cyber_gear' | 'torso_shrapnel';
  trailTimer: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public heroShards: HeroShard[] = [];
  public gibs: GoreGib[] = [];
  public shockwaves: { x: number; y: number; radius: number; maxRadius: number; color: string; alpha: number }[] = [];
  public groundDecals: { x: number; y: number; size: number; color: string; alpha: number; type: 'oil' | 'blood' | 'scorch' }[] = [];

  public static readonly MAX_PARTICLES = 1200;
  public static readonly MAX_HERO_SHARDS = 80;
  public static readonly MAX_GIBS = 140;
  public static readonly MAX_SHOCKWAVES = 40;
  public static readonly MAX_DECALS = 150;

  private runicGlyphs = ['⌘', '⚡', '☼', '☽', '★', '᯽', '✦', '⎈', '⚒', '۞', '𝄞', '❄', '≋', '▲', '⸙', '❦'];

  clear() {
    this.particles.length = 0;
    this.heroShards.length = 0;
    this.gibs.length = 0;
    this.shockwaves.length = 0;
    this.groundDecals.length = 0;
  }

  update(dt: number) {
    // Fast O(1) swap-and-pop Particle Update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (p.gravity !== undefined) {
        p.vy += p.gravity * dt;
      } else if (p.shape === 'pixel' || p.shape === 'glitch_line' || p.shape === 'matrix_hex' || p.shape === 'shard' || p.shape === 'lightning_streak') {
        // High-Speed Acceleration: Chaos gets fast and faster!
        p.vx *= (1.0 + 2.4 * dt);
        p.vy *= (1.0 + 2.4 * dt);
        // Digital glitch displacement: erratic lateral jitter and micro pixel snaps
        if (Math.random() < 0.4) {
          p.x += (Math.random() - 0.5) * 0.45;
          p.y += (Math.random() - 0.5) * 0.45;
        }
      } else {
        // Gravity on vertical axis for physical sparks
        p.vz -= 9.8 * dt * 0.4;
        if (p.z < 0) {
          p.z = 0;
          p.vx *= 0.7;
          p.vy *= 0.7;
        }
      }

      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    // Fast O(1) swap-and-pop Hero Explosion Shards
    for (let i = this.heroShards.length - 1; i >= 0; i--) {
      const s = this.heroShards[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.rot += s.vRot * dt;

      // Gravity and air drag
      s.vz -= 9.8 * dt * 0.75;
      s.vx *= Math.pow(0.92, dt * 60);
      s.vy *= Math.pow(0.92, dt * 60);

      // Bounce off ground
      if (s.z <= 0) {
        s.z = 0;
        s.vz = -s.vz * 0.45;
        s.vx *= 0.72;
        s.vy *= 0.72;
        s.vRot *= 0.8;
      }

      // Record trail point
      s.trail.push({ x: s.x, y: s.y, z: s.z });
      if (s.trail.length > 6) {
        s.trail.shift();
      }

      s.life -= dt;
      s.alpha = Math.max(0, s.life / s.maxLife);

      if (s.life <= 0) {
        this.heroShards[i] = this.heroShards[this.heroShards.length - 1];
        this.heroShards.pop();
      }
    }

    // Fast O(1) swap-and-pop Gore Gibs & Severed Organs
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i];
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vy += 28.0 * dt; // Strong gravity
      g.vx *= Math.pow(0.94, dt * 60);
      g.rot += g.vRot * dt;

      // Blood droplet spray trail in flight
      g.trailTimer += dt;
      if (g.trailTimer >= 0.04 && this.particles.length < ParticleSystem.MAX_PARTICLES) {
        g.trailTimer = 0;
        this.particles.push({
          x: g.x + (Math.random() - 0.5) * 0.1,
          y: g.y + (Math.random() - 0.5) * 0.1,
          z: 0.5,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2.0,
          vz: 0,
          gravity: 24.0,
          size: 2.0 + Math.random() * 2.5,
          color: g.bloodColor,
          glowColor: g.bloodColor,
          alpha: 0.9,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9,
          decay: 1.4,
          shape: 'circle'
        });
      }

      g.life -= dt;
      g.alpha = Math.max(0, g.life / g.maxLife);

      if (g.life <= 0) {
        this.gibs[i] = this.gibs[this.gibs.length - 1];
        this.gibs.pop();
      }
    }

    // Fast O(1) swap-and-pop Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 12.0 * dt;
      sw.alpha -= 2.0 * dt;
      if (sw.alpha <= 0) {
        this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
        this.shockwaves.pop();
      }
    }

    // Enforce max bounds on decals with fast single splice
    if (this.groundDecals.length > ParticleSystem.MAX_DECALS) {
      this.groundDecals.splice(0, this.groundDecals.length - ParticleSystem.MAX_DECALS);
    }
  }

  // Combat Hit Sparks
  emitSparks(x: number, y: number, z: number, color: string = '#f59e0b', count: number = 8) {
    if (this.particles.length >= ParticleSystem.MAX_PARTICLES) return;
    const actualCount = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 2 + Math.random() * 4,
        size: 2 + Math.random() * 3,
        color,
        glowColor: color,
        alpha: 1,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        decay: 2.5
      });
    }
  }

  // Blood / Oil Splatter on hit
  emitSplatter(x: number, y: number, color: string = '#7f1d1d', isMech: boolean = false) {
    const splashColor = isMech ? '#0f172a' : color;
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.2 + Math.random() * 0.6;
      this.particles.push({
        x,
        y,
        z: 0.5,
        vx: Math.cos(angle) * (1 + Math.random() * 3),
        vy: Math.sin(angle) * (1 + Math.random() * 3),
        vz: 1 + Math.random() * 2,
        size: 3 + Math.random() * 2,
        color: splashColor,
        alpha: 1,
        life: 0.3,
        maxLife: 0.3,
        decay: 3
      });
    }

    // Leave ground decal
    this.groundDecals.push({
      x: x + (Math.random() - 0.5) * 0.4,
      y: y + (Math.random() - 0.5) * 0.4,
      size: 8 + Math.random() * 10,
      color: splashColor,
      alpha: 0.7,
      type: isMech ? 'oil' : 'blood'
    });
  }

  // Realistic high-impact blood droplets with gravity, varied shades, and visceral splatter
  emitBlood(x: number, y: number, count: number = 20, customColor?: string) {
    if (this.particles.length >= ParticleSystem.MAX_PARTICLES) return;
    const actualCount = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    const bloodShades = customColor ? [customColor, '#7f1d1d', '#991b1b', '#dc2626'] : ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444'];

    for (let i = 0; i < actualCount; i++) {
      const shade = bloodShades[Math.floor(Math.random() * bloodShades.length)];
      const speedX = (Math.random() - 0.5) * 7.5;
      const speedY = -1.8 - Math.random() * 5.2; // Upward spray
      
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.25,
        y: y + (Math.random() - 0.5) * 0.35,
        z: 0.5,
        vx: speedX,
        vy: speedY,
        vz: 0,
        gravity: 24.0, // Natural gravitational pull downwards
        size: 1.5 + Math.random() * 2.5, // Variable blood droplets
        color: shade,
        glowColor: shade,
        alpha: 1,
        life: 0.4 + Math.random() * 0.35,
        maxLife: 0.75,
        decay: 1.6,
        shape: 'circle'
      });
    }
  }

  // Massive blood fountain / gore eruption on enemy death / boss organ rupture
  emitBloodExplosion(x: number, y: number, count: number = 38, customColor?: string) {
    if (this.particles.length >= ParticleSystem.MAX_PARTICLES) return;
    const actualCount = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    const bloodShades = customColor ? [customColor, '#7f1d1d', '#991b1b', '#dc2626'] : ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171'];

    for (let i = 0; i < actualCount; i++) {
      const shade = bloodShades[Math.floor(Math.random() * bloodShades.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 7.0;
      
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5, // Strong upward eruption
        vz: 0,
        gravity: 26.0,
        size: 1.6 + Math.random() * 3.2,
        color: shade,
        glowColor: shade,
        alpha: 1,
        life: 0.45 + Math.random() * 0.4,
        maxLife: 0.85,
        decay: 1.4,
        shape: 'circle'
      });
    }
  }

  // Visceral Damage Particle Burst when enemy / boss gets shot (Blood + sparks, NO rings)
  emitDamageExplosion(x: number, y: number, color: string = '#ef4444', isCrit: boolean = false) {
    // 1. Spurt of crimson blood droplets
    this.emitBlood(x, y, isCrit ? 22 : 14);

    // 2. High-speed directional spark flecks
    const sparkCount = isCrit ? 10 : 6;
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        z: 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        gravity: 14.0,
        size: isCrit ? 2.2 : 1.5,
        color: Math.random() < 0.35 ? '#ffffff' : color,
        glowColor: color,
        alpha: 1,
        life: 0.14 + Math.random() * 0.14,
        maxLife: 0.28,
        decay: 3.5,
        shape: 'circle'
      });
    }
  }

  // High-Pressure Arterial Blood Fountain with Gravity Arc & Rapid Ground Fall
  emitBloodFountain(x: number, y: number, count: number = 85, customColor?: string) {
    if (this.particles.length >= ParticleSystem.MAX_PARTICLES) return;
    const actualCount = Math.min(count, ParticleSystem.MAX_PARTICLES - this.particles.length);
    const bloodShades = customColor && customColor !== '#ef4444'
      ? [customColor, '#450a0a', '#7f1d1d', '#991b1b', '#dc2626', '#ef4444']
      : ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#881337', '#9f1239'];

    for (let i = 0; i < actualCount; i++) {
      const shade = bloodShades[Math.floor(Math.random() * bloodShades.length)];
      const spreadX = (Math.random() - 0.5) * 10.0;
      const speedY = -2.5 - Math.random() * 8.5; // Upward initial burst
      const dropletSize = Math.random() < 0.28 ? 3.0 + Math.random() * 2.5 : 1.5 + Math.random() * 1.8;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.5,
        vx: spreadX,
        vy: speedY,
        vz: 0,
        gravity: 36.0, // Strong downward gravitational pull to ground
        size: dropletSize,
        color: shade,
        glowColor: shade,
        alpha: 1,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        decay: 1.8,
        shape: 'circle'
      });
    }
  }

  // Grand Visual Platformer Enemy Gore Detonation (Massive Blood Fountain, Flying Gibs, Flesh Chunks)
  emitPlatformerGoreDeath(x: number, y: number, color: string = '#ef4444', isBoss: boolean = false, isElite: boolean = false) {
    const bloodMultiplier = isBoss ? 3.8 : isElite ? 1.9 : 1.0;
    const bloodCount = Math.round(80 * bloodMultiplier);
    const gibCount = isBoss ? 28 : isElite ? 16 : 8;

    // 1. Massive Arterial Blood Fountain (Falls rapidly to ground)
    this.emitBloodFountain(x, y, bloodCount, color);

    // 2. High-Velocity Flying Visceral Gibs & Bones (Falls rapidly to ground)
    const gibShapes: GoreGib['shape'][] = ['meat_chunk', 'rib_bone', 'eyeball', 'jaw_fang', 'cyber_gear', 'torso_shrapnel'];
    const bloodShades = ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#881337'];

    for (let i = 0; i < gibCount; i++) {
      if (this.gibs.length >= ParticleSystem.MAX_GIBS) break;
      const angle = (i / gibCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 3.5 + Math.random() * (isBoss ? 12.0 : 7.5);
      const chosenShape = gibShapes[Math.floor(Math.random() * gibShapes.length)];
      const chosenBlood = bloodShades[Math.floor(Math.random() * bloodShades.length)];

      this.gibs.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (2.5 + Math.random() * 4.5), // Upward burst
        vz: 0,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        size: (isBoss ? 8.0 : isElite ? 6.0 : 4.2) + Math.random() * (isBoss ? 6.0 : 3.5),
        color: Math.random() < 0.35 ? '#ffffff' : color,
        bloodColor: chosenBlood,
        alpha: 1.0,
        life: 1.2 + Math.random() * 0.8,
        maxLife: 2.0,
        shape: chosenShape,
        trailTimer: 0
      });
    }

    // 3. Fiery / Mech Cyber Sparks & Shrapnel
    const sparkCount = isBoss ? 30 : isElite ? 16 : 8;
    for (let k = 0; k < sparkCount; k++) {
      const spAng = Math.random() * Math.PI * 2;
      const spSpd = 3.5 + Math.random() * 7.5;
      this.particles.push({
        x,
        y,
        z: 0.5,
        vx: Math.cos(spAng) * spSpd,
        vy: Math.sin(spAng) * spSpd - 2.5,
        vz: 0,
        gravity: 22.0,
        size: 2.0 + Math.random() * 3.2,
        color: Math.random() < 0.3 ? '#ffffff' : (Math.random() < 0.5 ? color : '#facc15'),
        glowColor: '#ef4444',
        alpha: 1,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        decay: 1.8,
        shape: 'circle'
      });
    }

    // 6. Ground & Wall Blood Decals (Lingering pools and splatters)
    const decalCount = isBoss ? 7 : isElite ? 4 : 2;
    for (let d = 0; d < decalCount; d++) {
      this.spawnDecal(
        x + (Math.random() - 0.5) * (isBoss ? 3.2 : 1.6),
        y + (Math.random() - 0.5) * 0.8 + 0.5,
        (isBoss ? 26 : isElite ? 18 : 12) + Math.random() * (isBoss ? 18 : 9),
        '#7f1d1d',
        0.88,
        'blood'
      );
    }
  }

  // Catastrophic blood fountain detonation when an enemy dies
  emitEnemyDeathExplosion(x: number, y: number, color: string = '#ef4444', isBoss: boolean = false, isElite: boolean = false) {
    this.emitPlatformerGoreDeath(x, y, color, isBoss, isElite);
  }

  // Dodge Thruster Trail
  emitDodgeTrail(x: number, y: number, z: number, color: string = '#38bdf8') {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        z,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: 0.5,
        size: 4 + Math.random() * 4,
        color,
        glowColor: color,
        alpha: 0.8,
        life: 0.25,
        maxLife: 0.25,
        decay: 3.5
      });
    }
  }

  // Runic Floating Glyphs
  emitRunicGlyph(x: number, y: number, color: string = '#f59e0b') {
    const glyph = this.runicGlyphs[Math.floor(Math.random() * this.runicGlyphs.length)];
    this.particles.push({
      x: x + (Math.random() - 0.5) * 0.4,
      y: y + (Math.random() - 0.5) * 0.4,
      z: 0.6,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      vz: 1.2 + Math.random() * 0.8,
      size: 14,
      color,
      glowColor: color,
      alpha: 1,
      life: 0.8,
      maxLife: 0.8,
      decay: 1.2,
      glyph
    });
  }

  // Shockwave ring (Ukonvasara / Boss Slam / Explosion)
  emitShockwave(x: number, y: number, maxRadius: number = 3.5, color: string = '#38bdf8') {
    this.shockwaves.push({
      x,
      y,
      radius: 0.2,
      maxRadius,
      color,
      alpha: 1.0
    });
  }

  // Level Up / Beacon Shimmer
  emitBeacon(x: number, y: number, color: string = '#f59e0b') {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.6,
        y: y + (Math.random() - 0.5) * 0.6,
        z: 0.2,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: 3 + Math.random() * 3,
        size: 3 + Math.random() * 3,
        color,
        glowColor: color,
        alpha: 1,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        decay: 1.0
      });
    }
  }

  // Glitch Pixel Dissolution / Simulation Reality Tearing Particles
  emitPixelGlitch(x: number, y: number, color: string = '#ef4444') {
    const isLine = Math.random() < 0.38;
    const isText = Math.random() < 0.22;
    const glitchTexts = ['0xFA', 'NULL', 'ERR', '0101', '⌘', '⚡', '404', 'NaN', '0x00', 'CORRUPT', '0xFF', '۞', '★', 'DE_SYNC'];

    const colors = ['#00f0ff', '#ff0055', '#fcee0a', '#c084fc', '#ffffff', color];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    if (isText) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.6,
        y: y + (Math.random() - 0.5) * 1.6,
        z: 0.1 + Math.random() * 0.8,
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0,
        vz: 0,
        size: 11 + Math.random() * 5,
        color: chosenColor,
        glowColor: chosenColor,
        alpha: 1,
        life: 0.18 + Math.random() * 0.28,
        maxLife: 0.46,
        decay: 2.2,
        shape: 'matrix_hex',
        text: glitchTexts[Math.floor(Math.random() * glitchTexts.length)]
      });
    } else if (isLine) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.4,
        y: y + (Math.random() - 0.5) * 1.4,
        z: 0.05 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 7.0,
        vy: (Math.random() - 0.5) * 1.5,
        vz: 0,
        size: 2,
        width: 16 + Math.random() * 32,
        height: 1.5 + Math.random() * 1.5,
        color: chosenColor,
        glowColor: chosenColor,
        alpha: 0.95,
        life: 0.12 + Math.random() * 0.22,
        maxLife: 0.34,
        decay: 3.0,
        shape: 'glitch_line'
      });
    } else {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.2,
        y: y + (Math.random() - 0.5) * 1.2,
        z: 0.05 + Math.random() * 0.9,
        vx: (Math.random() - 0.5) * 4.5,
        vy: (Math.random() - 0.5) * 4.5,
        vz: (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 5,
        color: chosenColor,
        glowColor: chosenColor,
        alpha: 1,
        life: 0.15 + Math.random() * 0.25,
        maxLife: 0.4,
        decay: 2.5,
        shape: 'pixel'
      });
    }
  }

  // Universal Particle Spawn Shortcut
  spawn(x: number, y: number, count: number = 8, color: string = '#f59e0b', z: number = 0.3) {
    this.emitSparks(x, y, z, color, count);
  }

  // Universal Shockwave Spawn Shortcut
  spawnShockwave(x: number, y: number, maxRadius: number = 3.5, color: string = '#38bdf8') {
    this.emitShockwave(x, y, maxRadius, color);
  }

  // Universal Ground Decal Spawn
  spawnDecal(x: number, y: number, size: number = 8, color: string = '#7f1d1d', alpha: number = 0.7, type: 'oil' | 'blood' | 'scorch' = 'scorch') {
    this.groundDecals.push({
      x,
      y,
      size,
      color,
      alpha,
      type
    });
  }

  // Cataclysmic Hero Vessel Explosion & Debris Scatter
  emitHeroExplosion(x: number, y: number, archetype: string = 'soturi') {
    const theme = {
      soturi: { primary: '#38bdf8', secondary: '#facc15', tertiary: '#ffffff', glow: '#0284c7' },
      runoseppä: { primary: '#f97316', secondary: '#f59e0b', tertiary: '#ef4444', glow: '#ea580c' },
      tietäjä: { primary: '#c084fc', secondary: '#ec4899', tertiary: '#38bdf8', glow: '#a855f7' },
      korvenraivaaja: { primary: '#10b981', secondary: '#84cc16', tertiary: '#38bdf8', glow: '#059669' }
    }[archetype] || { primary: '#38bdf8', secondary: '#facc15', tertiary: '#ffffff', glow: '#0284c7' };

    // 1. Shattered Armor, Runes, and Cyber Core Shards (36 to 48 flying debris pieces)
    const shardCount = 42;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 4.5 + Math.random() * 9.5;
      const vz = 3.5 + Math.random() * 8.5;
      const shapeRand = Math.random();
      const shape: HeroShard['shape'] = shapeRand < 0.35
        ? 'armor_shard'
        : (shapeRand < 0.65 ? 'rune_plate' : (shapeRand < 0.85 ? 'cyber_gear' : 'plasma_core'));

      const colors = [theme.primary, theme.secondary, theme.tertiary, '#ffffff', '#0f172a'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const glyph = this.runicGlyphs[Math.floor(Math.random() * this.runicGlyphs.length)];

      // Random polygon vertices for irregular armor shard edges
      const pts: { x: number; y: number }[] = [];
      const numPts = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < numPts; p++) {
        const pAng = (p / numPts) * Math.PI * 2;
        const pDist = 0.4 + Math.random() * 0.6;
        pts.push({ x: Math.cos(pAng) * pDist, y: Math.sin(pAng) * pDist });
      }

      this.heroShards.push({
        x: x + (Math.random() - 0.5) * 0.3,
        y: y + (Math.random() - 0.5) * 0.3,
        z: 0.6 + Math.random() * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        size: 5 + Math.random() * 10,
        color,
        glowColor: theme.glow,
        alpha: 1.0,
        life: 2.2 + Math.random() * 1.0,
        maxLife: 3.2,
        shape,
        glyph,
        points: pts,
        trail: []
      });
    }

    // 2. Multi-Ring Concentric Shockwaves
    this.emitShockwave(x, y, 7.5, theme.primary);
    this.emitShockwave(x, y, 5.5, '#ef4444');
    this.emitShockwave(x, y, 3.5, '#ffffff');
    this.emitShockwave(x, y, 9.0, theme.secondary);

    // 3. Pixel Glitch Disintegration Cloud (45 voxel blocks)
    for (let k = 0; k < 45; k++) {
      this.emitPixelGlitch(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, theme.primary);
      if (k % 2 === 0) {
        this.emitPixelGlitch(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, '#ef4444');
      }
    }

    // 4. Floating Ancient Runic Glyphs (18 floating glyphs)
    for (let r = 0; r < 18; r++) {
      this.emitRunicGlyph(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 0.8, theme.secondary);
    }

    // 5. Blazing Plasma Sparks (40 high-velocity sparks)
    this.emitSparks(x, y, 0.5, theme.tertiary, 25);
    this.emitSparks(x, y, 0.8, '#f59e0b', 20);

    // 6. Permanent Charred & Runic Explosion Crater Ground Decal
    this.spawnDecal(x, y, 22, '#0f172a', 0.85, 'scorch');
    this.spawnDecal(x, y, 14, '#ef4444', 0.6, 'scorch');
  }

  // High-Energy Reality-Tearing Particle Displacement & Spacetime Chaos
  // ABSOLUTELY NO CIRCLES OR BUBBLES. PURE PIXEL DISPLACEMENT, GEOMETRIC SHARDS & LIGHTNING FRACTURES.
  emitParticleDisplacementTear(x: number, y: number, intensity: number = 1.0) {
    const colors = ['#00f0ff', '#ff0055', '#facc15', '#a855f7', '#ffffff', '#38bdf8', '#fb7185'];

    // 1. Chaotic Slicing Glitch Lines (Horizontal & diagonal reality tears)
    const lineCount = Math.floor(28 * intensity);
    for (let i = 0; i < lineCount; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const ang = (Math.random() - 0.5) * Math.PI * 2;
      const spd = 14.0 + Math.random() * 28.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 2.0,
        y: y + (Math.random() - 0.5) * 2.0,
        z: 0.2 + Math.random() * 0.8,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: (Math.random() - 0.5) * 4.0,
        size: 16 + Math.random() * 32,
        width: 35 + Math.random() * 75,
        height: 2.5 + Math.random() * 3.5,
        color: col,
        glowColor: col,
        alpha: 1.0,
        life: 0.4 + Math.random() * 0.45,
        maxLife: 0.85,
        decay: 1.6,
        shape: 'glitch_line'
      });
    }

    // 2. High-Speed Accelerating Square Pixel Voxels (Hundreds of chaotic pixels)
    const pixelCount = Math.floor(75 * intensity);
    for (let i = 0; i < pixelCount; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const ang = Math.random() * Math.PI * 2;
      const spd = 9.0 + Math.random() * 24.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 1.2,
        y: y + (Math.random() - 0.5) * 1.2,
        z: 0.1 + Math.random() * 0.9,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 2.0 + Math.random() * 6.0,
        size: 4.0 + Math.random() * 7.0,
        color: col,
        glowColor: col,
        alpha: 1.0,
        life: 0.35 + Math.random() * 0.5,
        maxLife: 0.85,
        decay: 1.8,
        shape: 'pixel'
      });
    }

    // 3. Sharp Geometric Polygon Shards (Angular reality fragments)
    const shardCount = Math.floor(22 * intensity);
    for (let i = 0; i < shardCount; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const ang = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = 12.0 + Math.random() * 22.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.6,
        y: y + (Math.random() - 0.5) * 0.6,
        z: 0.4 + Math.random() * 0.6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: 3.0 + Math.random() * 8.0,
        size: 9 + Math.random() * 14,
        color: col,
        glowColor: col,
        alpha: 1.0,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9,
        decay: 1.5,
        shape: 'shard'
      });
    }

    // 4. Electric Spacetime Lightning Fracture Streaks
    const boltCount = Math.floor(18 * intensity);
    for (let i = 0; i < boltCount; i++) {
      const col = Math.random() < 0.5 ? '#00f0ff' : '#ffffff';
      const ang = Math.random() * Math.PI * 2;
      const spd = 16.0 + Math.random() * 26.0;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.8,
        y: y + (Math.random() - 0.5) * 0.8,
        z: 0.5,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        vz: (Math.random() - 0.5) * 3.0,
        size: 18 + Math.random() * 24,
        color: col,
        glowColor: '#38bdf8',
        alpha: 1.0,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        decay: 2.5,
        shape: 'lightning_streak'
      });
    }
  }
}

export const particleSystem = new ParticleSystem();
