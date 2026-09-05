// Authentic Hand-Drawn Kalevala Hero & Archetype Painterly Composite Renderer
// Renders the epic Akseli Gallen-Kallela drawn heroes with dynamic War Paint & Neural Implant overlays

import { CharacterAppearance } from '../entities/player';
import { AssetLoader } from './asset_loader';

export class HeroRenderer {
  private static imageCache: Map<string, HTMLImageElement> = new Map();
  private static transparentCache: Map<string, HTMLCanvasElement> = new Map();

  private static normalizeKey(arch: string): string {
    return (arch || 'soturi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
  }

  static getHeroImage(arch: string): HTMLImageElement | null {
    const cleanArch = this.normalizeKey(arch);
    const key = `hero_${cleanArch}`;
    const cached = AssetLoader.getImage(key) || AssetLoader.getImage(`hero_${arch}`) || AssetLoader.getImage('hero_soturi');
    if (cached) return cached;

    const srcMap: Record<string, string> = {
      soturi: './assets/hero_soturi.jpg',
      runoseppa: './assets/hero_runoseppa.jpg',
      runoseppä: './assets/hero_runoseppa.jpg',
      tietaja: './assets/hero_tietaja.jpg',
      tietäjä: './assets/hero_tietaja.jpg',
      korvenraivaaja: './assets/hero_korvenraivaaja.jpg'
    };
    const src = srcMap[cleanArch] || srcMap[arch] || './assets/hero_soturi.jpg';
    if (this.imageCache.has(src)) {
      const img = this.imageCache.get(src)!;
      return img.complete && img.naturalWidth > 0 ? img : null;
    }
    const img = new Image();
    img.src = src;
    this.imageCache.set(src, img);
    img.onload = () => {
      this.processTransparency(src, img);
    };
    return null;
  }

  static preloadAll() {
    AssetLoader.preloadAll();
  }

  static getTransparentSprite(arch: string): HTMLCanvasElement | null {
    const cleanArch = this.normalizeKey(arch);
    const key = `hero_${cleanArch}`;
    const cached = AssetLoader.getTransparent(key) || AssetLoader.getTransparent(`hero_${arch}`) || AssetLoader.getTransparent('hero_soturi');
    if (cached) return cached;

    const srcMap: Record<string, string> = {
      soturi: './assets/hero_soturi.jpg',
      runoseppa: './assets/hero_runoseppa.jpg',
      runoseppä: './assets/hero_runoseppa.jpg',
      tietaja: './assets/hero_tietaja.jpg',
      tietäjä: './assets/hero_tietaja.jpg',
      korvenraivaaja: './assets/hero_korvenraivaaja.jpg'
    };
    const src = srcMap[cleanArch] || srcMap[arch] || './assets/hero_soturi.jpg';
    if (this.transparentCache.has(src)) {
      return this.transparentCache.get(src)!;
    }
    const img = this.getHeroImage(arch);
    if (img && img.complete && img.naturalWidth > 0) {
      return this.processTransparency(src, img);
    }
    return null;
  }

  private static processTransparency(src: string, img: HTMLImageElement): HTMLCanvasElement {
    const offscreen = document.createElement('canvas');
    const w = img.naturalWidth || 512;
    const h = img.naturalHeight || 512;
    offscreen.width = w;
    offscreen.height = h;

    const octx = offscreen.getContext('2d')!;
    octx.drawImage(img, 0, 0, w, h);

    try {
      const imgData = octx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxVal = Math.max(r, g, b);

        if (maxVal < 24) {
          data[i + 3] = 0;
        } else if (maxVal < 55) {
          const factor = (maxVal - 24) / 31;
          data[i + 3] = Math.floor(factor * 255);
        }
      }
      octx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Hero transparency extraction fallback:', e);
    }

    this.transparentCache.set(src, offscreen);
    return offscreen;
  }

  // Draw Hero in Portrait / UI View
  static drawPortrait(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    appearance: CharacterAppearance
  ) {
    ctx.save();
    ctx.translate(cx, cy);

    const arch = appearance.archetype || 'soturi';
    const warPaint = appearance.warPaint || 'ukko_spark';
    const implant = appearance.implant || 'neural_loom';

    const archColors = {
      soturi: { glow: '#38bdf8', aura: 'rgba(56, 189, 248, 0.4)' },
      runoseppä: { glow: '#f97316', aura: 'rgba(249, 115, 22, 0.4)' },
      tietäjä: { glow: '#c084fc', aura: 'rgba(192, 132, 252, 0.4)' },
      korvenraivaaja: { glow: '#10b981', aura: 'rgba(16, 185, 129, 0.4)' }
    }[arch] || { glow: '#38bdf8', aura: 'rgba(56, 189, 248, 0.4)' };

    // 1. Ambient Background Aura
    const half = size / 2;
    const radGrad = ctx.createRadialGradient(0, 0, half * 0.3, 0, 0, half * 0.95);
    radGrad.addColorStop(0, archColors.aura);
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(-half, -half, size, size);

    // 2. Draw Authentic Hand-Drawn Hero Portrait
    const img = this.getHeroImage(arch);
    if (img) {
      ctx.save();
      // Rounded corner clip
      ctx.beginPath();
      ctx.roundRect(-half + 4, -half + 4, size - 8, size - 8, [6]);
      ctx.clip();
      ctx.drawImage(img, -half + 4, -half + 4, size - 8, size - 8);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-half, -half, size, size);
    }

    // 3. War Paint / Cyber-Rune Overlays on Drawn Hero
    this.drawWarPaintOverlays(ctx, 0, -half * 0.15, size * 0.007, warPaint);

    // 4. Neural Implant Overlays on Drawn Hero
    this.drawImplantOverlays(ctx, 0, -half * 0.15, size * 0.007, implant);

    // 5. Heroic Archetype Outer Frame & Runic Corners
    ctx.strokeStyle = archColors.glow;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-half + 4, -half + 4, size - 8, size - 8);

    ctx.restore();
  }

  // Draw Hero in Isometric World Gameplay
  static drawInGameHero(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    appearance: CharacterAppearance,
    options?: {
      isMoving?: boolean;
      walkTimer?: number;
      isHurt?: boolean;
      isFacingLeft?: boolean;
      isCharging?: boolean;
      isDying?: boolean;
    }
  ) {
    ctx.save();
    ctx.translate(cx, cy);

    if (options?.isDying) {
      // Violent containment breach shudder jitter
      const jitterX = (Math.random() - 0.5) * 6 * scale;
      const jitterY = (Math.random() - 0.5) * 6 * scale;
      ctx.translate(jitterX, jitterY);
    }

    if (options?.isFacingLeft) {
      ctx.scale(-1, 1);
    }

    const arch = appearance.archetype || 'soturi';
    const warPaint = appearance.warPaint || 'ukko_spark';
    const implant = appearance.implant || 'neural_loom';

    const sprite = this.getTransparentSprite(arch) || this.getHeroImage(arch);
    const spriteSize = 72 * scale;
    const hx = -spriteSize / 2;
    const hy = -spriteSize * 0.85;

    // 1. Draw Authentic Hand-Drawn Hero Sprite
    if (sprite) {
      if (options?.isDying) {
        ctx.save();
        ctx.filter = 'brightness(3.5) contrast(1.6)';
        ctx.drawImage(sprite, hx, hy, spriteSize, spriteSize);
        ctx.restore();

        // High-voltage containment failure lightning arcs across hero body
        for (let a = 0; a < 3; a++) {
          ctx.beginPath();
          ctx.moveTo(hx + Math.random() * spriteSize, hy + Math.random() * spriteSize);
          ctx.lineTo(hx + Math.random() * spriteSize, hy + Math.random() * spriteSize);
          ctx.strokeStyle = Math.random() > 0.5 ? '#ef4444' : '#38bdf8';
          ctx.lineWidth = 2.5 * scale;
          ctx.stroke();
        }
      } else if (options?.isHurt) {
        ctx.save();
        ctx.filter = 'brightness(2.6) contrast(1.3)';
        ctx.drawImage(sprite, hx, hy, spriteSize, spriteSize);
        ctx.restore();
      } else {
        ctx.drawImage(sprite, hx, hy, spriteSize, spriteSize);
      }
    } else {
      // Fallback
      ctx.beginPath();
      ctx.arc(0, -20 * scale, 14 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
    }

    // 2. War Paint Glow Overlays on In-Game Sprite
    const headY = hy + spriteSize * 0.35;
    this.drawWarPaintOverlays(ctx, 0, headY, scale * 0.65, warPaint);

    // 3. Neural Implant Overlays on In-Game Sprite
    this.drawImplantOverlays(ctx, 0, headY, scale * 0.65, implant);

    // 4. Runoseppä Specific: Orbiting Lyrical Poetry Symbols (Syntysanat Matrix)
    if (arch === 'runoseppä' && !options?.isDying) {
      const now = performance.now() * 0.0025;
      const runes = ['⌘', '⚡', '☼', '☽', '★', '۞'];
      ctx.save();
      ctx.font = `bold ${Math.floor(8.5 * scale)}px "Cinzel", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      runes.forEach((r, idx) => {
        const ang = now * 1.6 + (idx * (Math.PI * 2 / runes.length));
        const rx = Math.cos(ang) * (20 * scale);
        const ry = hy + spriteSize * 0.5 + Math.sin(ang) * (9 * scale);
        ctx.fillStyle = idx % 2 === 0 ? '#fde047' : '#34d399';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fillText(r, rx, ry);
      });
      ctx.restore();
    }

    ctx.restore();
  }

  // Dedicated War Paint Overlay Generator
  private static drawWarPaintOverlays(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    s: number,
    warPaint: string
  ) {
    ctx.save();
    ctx.translate(ox, oy);

    if (warPaint === 'ukko_spark') {
      // Ukko's Spark: Twin Electric-Cyan Lightning Streaks
      ctx.beginPath();
      ctx.moveTo(-9 * s, -12 * s);
      ctx.lineTo(-6 * s, -2 * s);
      ctx.lineTo(-10 * s, 8 * s);

      ctx.moveTo(9 * s, -12 * s);
      ctx.lineTo(6 * s, -2 * s);
      ctx.lineTo(10 * s, 8 * s);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4 * s;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // White hot bolt core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 * s;
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (warPaint === 'otava_constellation') {
      // Otava Seven Stars: 7 Gold Constellation Points
      const stars = [
        { x: -8 * s, y: -10 * s },
        { x: -3 * s, y: -12 * s },
        { x: 3 * s, y: -12 * s },
        { x: 8 * s, y: -9 * s },
        { x: 6 * s, y: -2 * s },
        { x: 0 * s, y: 1 * s },
        { x: -6 * s, y: 3 * s }
      ];

      // Connecting lines
      ctx.beginPath();
      stars.forEach((st, idx) => {
        if (idx === 0) ctx.moveTo(st.x, st.y);
        else ctx.lineTo(st.x, st.y);
      });
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();

      // Glowing star nodes
      stars.forEach(st => {
        ctx.beginPath();
        ctx.arc(st.x, st.y, 2.2 * s, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

    } else if (warPaint === 'tuoni_brand') {
      // Tuoni Brand: Necrotic Purple Eye Sigil
      ctx.beginPath();
      ctx.arc(-6 * s, -2 * s, 6 * s, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.2 * s;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-6 * s, -11 * s);
      ctx.lineTo(-6 * s, 7 * s);
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (warPaint === 'kipina_crest') {
      // Kipinä Crest: Blazing Thermal Forehead Flame
      ctx.beginPath();
      ctx.moveTo(-8 * s, -6 * s);
      ctx.lineTo(0, -16 * s);
      ctx.lineTo(8 * s, -6 * s);
      ctx.lineTo(0, -9 * s);
      ctx.closePath();
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-4 * s, -6 * s);
      ctx.lineTo(0, -13 * s);
      ctx.lineTo(4 * s, -6 * s);
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // Dedicated Neural Implant Overlay Generator
  private static drawImplantOverlays(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    s: number,
    implant: string
  ) {
    ctx.save();
    ctx.translate(ox, oy);

    if (implant === 'optic_hud') {
      // Cybernetic Optic HUD: Laser Monocle with Rotating Reticle
      ctx.beginPath();
      ctx.arc(-6 * s, -2 * s, 6.5 * s, 0, Math.PI * 2);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2 * s;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Crosshair Reticle
      ctx.beginPath();
      ctx.moveTo(-10 * s, -2 * s);
      ctx.lineTo(-2 * s, -2 * s);
      ctx.moveTo(-6 * s, -6 * s);
      ctx.lineTo(-6 * s, 2 * s);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5 * s;
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (implant === 'neural_loom') {
      // Neural Loom: Fiber-optic cyber-conduits pulsing down the neck
      const loomColors = ['#38bdf8', '#818cf8', '#38bdf8'];
      loomColors.forEach((col, idx) => {
        const xOffset = (idx - 1) * 5 * s;
        ctx.beginPath();
        ctx.moveTo(xOffset + 4 * s, 6 * s);
        ctx.quadraticCurveTo(xOffset + 10 * s, 14 * s, xOffset + 6 * s, 22 * s);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2 * s;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

    } else if (implant === 'bionic_chassis') {
      // Titanium Bionic Chassis: Reinforced Jaw Exoskeleton Plate & Status LEDs
      ctx.beginPath();
      ctx.moveTo(-12 * s, 3 * s);
      ctx.lineTo(-8 * s, 13 * s);
      ctx.lineTo(8 * s, 13 * s);
      ctx.lineTo(12 * s, 3 * s);
      ctx.closePath();
      ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.8 * s;
      ctx.stroke();

      // Status LEDs
      ctx.beginPath();
      ctx.arc(-5 * s, 8 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 6;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(5 * s, 8 * s, 1.8 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
