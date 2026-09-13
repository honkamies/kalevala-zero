// Master 2.5D Isometric Engine with Seamless Akseli Gallen-Kallela Worlds, Real Chroma-Key Alpha Sprites (NO BLACK BACKGROUND BOXES!), and Distinct Enemy Visuals

import { IsometricCamera } from './camera';
import { TileRenderer, TileType } from '../world/tiles';
import { GeneratedWorld } from '../world/generator';
import { Player } from '../entities/player';
import { Enemy } from '../entities/enemy';
import { LootChest } from '../entities/chest';
import { RunicPuzzlePillar } from '../entities/puzzle';
import { VoidGateway } from '../entities/gateway';
import { ProjectileManager, Projectile } from '../entities/projectile';
import { ParticleSystem } from './particles';
import { CombatEngine } from '../systems/combat';
import { FogOfWar } from '../world/fog';
import { LightingEngine } from './lighting';
import { inputManager } from './input';
import { HeroRenderer } from './hero_renderer';
import { BiomeDefinition } from '../world/biomes';
import { AssetLoader } from './asset_loader';
import { graphicsEngine } from './graphics';

interface DynamicRenderItem {
  type: 'gateway' | 'chest' | 'puzzle' | 'portal' | 'enemy' | 'player';
  ySort: number;
  entity?: any;
  alpha?: number;
  isVisible?: boolean;
  isNearby?: boolean;
  portalTime?: number;
  deathState?: any;
  extractionState?: any;
}

const FLOATING_TEXT_COLORS: Record<string, string> = {
  physical: '#ffffff',
  plasma: '#38bdf8',
  frost: '#67e8f9',
  shock: '#facc15',
  void: '#c084fc',
  fire: '#f97316',
  crit: '#ef4444',
  heal: '#10b981',
  status: '#f59e0b'
};

export class IsometricRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  public camera: IsometricCamera;

  // Cached Source Images & Chroma-Keyed Transparent Sprites
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private transparentSprites: Map<string, HTMLCanvasElement> = new Map();

  // Reusable zero-allocation render array for dynamic entities (NO per-frame closures!)
  private dynamicRenderList: DynamicRenderItem[] = [];

  constructor(canvas: HTMLCanvasElement, lightCanvas: HTMLCanvasElement, camera: IsometricCamera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.lightCanvas = lightCanvas;
    this.lightCtx = lightCanvas.getContext('2d')!;
    this.camera = camera;

    this.preloadAssets();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    graphicsEngine.onSettingsChange(() => this.resize());
  }

  private preloadAssets() {
    AssetLoader.preloadAll();
  }

  // Automatic Chroma-Key background extraction: removes solid black/dark background and feathers edges
  private processTransparency(img: HTMLImageElement): HTMLCanvasElement {
    const offscreen = document.createElement('canvas');
    const w = img.naturalWidth || img.width || 512;
    const h = img.naturalHeight || img.height || 512;
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

        // Dark background removal threshold
        if (maxVal < 26) {
          data[i + 3] = 0; // Pure transparent
        } else if (maxVal < 60) {
          // Soft feathered alpha edge
          const factor = (maxVal - 26) / 34;
          data[i + 3] = Math.floor(factor * 255);
        }
      }
      octx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Canvas pixel extraction fallback:', e);
    }

    return offscreen;
  }

  resize() {
    const dims = graphicsEngine.getVirtualDimensions(window.innerWidth, window.innerHeight);
    this.canvas.width = dims.width;
    this.canvas.height = dims.height;
    this.lightCanvas.width = dims.width;
    this.lightCanvas.height = dims.height;

    // Nearest-neighbor sampling for authentic pixel art edges
    this.ctx.imageSmoothingEnabled = false;
    this.lightCtx.imageSmoothingEnabled = false;

    this.camera.handleResize(dims.width, dims.height);
    this.camera.pixelSnap = graphicsEngine.getSettings().pixelSnap;
  }

  render(
    world: GeneratedWorld,
    fog: FogOfWar,
    player: Player,
    enemies: Enemy[],
    chests: LootChest[],
    puzzles: RunicPuzzlePillar[],
    gateways: VoidGateway[],
    projectiles: ProjectileManager,
    particles: ParticleSystem,
    combat: CombatEngine,
    lighting: LightingEngine,
    escapePortal?: { x: number; y: number } | null,
    collapseIntensity: number = 0,
    escapeTimeRemaining: number = 0,
    deathSequenceState?: any,
    extractionSequenceState?: any
  ) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // 1. DYNAMIC THEMATIC ATMOSPHERIC BACKGROUND (Clouds, Mountain Tops, Aurora, Magma Glow, Star-Forge)
    this.drawBiomeAtmosphericBackground(ctx, cw, ch, world.biome);

    const zoom = this.camera.zoom;
    const halfW = (this.camera.tileWidth / 2) * zoom;
    const halfH = (this.camera.tileHeight / 2) * zoom;
    const camX = this.camera.x;
    const camY = this.camera.y;
    const vpCenterX = this.camera.viewportWidth / 2 + this.camera.shakeOffsetX;
    const vpCenterY = this.camera.viewportHeight / 2 + this.camera.shakeOffsetY;

    // Fast Frustum Bounding Box in Tile Coordinates (Zero out-of-screen waste)
    const bounds = this.camera.getVisibleTileBounds(world.width, world.height, 4);

    // 2. RENDER ORGANIC BLENDED FLOOR TRAILS (Revealed tiles with smooth reveal alpha)
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      const relY = y - camY;
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const revealAlpha = fog.getRevealAlpha(x, y);
        if (revealAlpha <= 0.01) continue;

        const tile = world.tiles[y][x];
        if (tile !== TileType.WALL) {
          const relX = x - camX;
          const sx = vpCenterX + (relX - relY) * halfW;
          const sy = vpCenterY + (relX + relY) * halfH;

          if (revealAlpha < 0.99) {
            ctx.globalAlpha = revealAlpha;
            TileRenderer.drawFloorTile(ctx, sx, sy, halfW, halfH, tile, world.biome, x, y);
            ctx.globalAlpha = 1.0;
          } else {
            TileRenderer.drawFloorTile(ctx, sx, sy, halfW, halfH, tile, world.biome, x, y);
          }
        }
      }
    }

    // 3. RENDER ENVIRONMENT DECALS / BLOOD / SCORCH
    for (const decal of particles.groundDecals) {
      if (decal.x < bounds.minX - 1 || decal.x > bounds.maxX + 1 ||
          decal.y < bounds.minY - 1 || decal.y > bounds.maxY + 1) continue;
      const alpha = fog.getRevealAlpha(decal.x, decal.y);
      if (alpha <= 0.01) continue;

      const relX = decal.x - camX;
      const relY = decal.y - camY;
      const sx = vpCenterX + (relX - relY) * halfW;
      const sy = vpCenterY + (relX + relY) * halfH;

      ctx.beginPath();
      ctx.ellipse(sx, sy, (decal.size * zoom) / 2, (decal.size * zoom) / 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = decal.color;
      ctx.globalAlpha = decal.alpha * alpha;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // 4. ASSEMBLE DYNAMIC ENTITIES (Zero GC: Reused array, typed descriptor dispatch)
    this.dynamicRenderList.length = 0;

    // Destructible Void Gateways / Spawner Rifts
    for (let i = 0; i < gateways.length; i++) {
      const gw = gateways[i];
      if (gw.x < bounds.minX - 2 || gw.x > bounds.maxX + 2 || gw.y < bounds.minY - 2 || gw.y > bounds.maxY + 2) continue;
      const alpha = fog.getRevealAlpha(gw.x, gw.y);
      const isVisible = fog.isVisible(gw.x, gw.y);
      if (alpha <= 0.01 && !isVisible) continue;
      this.dynamicRenderList.push({
        type: 'gateway',
        ySort: gw.x + gw.y + 0.2,
        entity: gw,
        alpha,
        isVisible
      });
    }

    // Loot Chests with [E] prompt on proximity
    for (let i = 0; i < chests.length; i++) {
      const chest = chests[i];
      if (chest.x < bounds.minX - 1 || chest.x > bounds.maxX + 1 || chest.y < bounds.minY - 1 || chest.y > bounds.maxY + 1) continue;
      const alpha = fog.getRevealAlpha(chest.x, chest.y);
      if (alpha <= 0.01) continue;
      const dx = player.x - chest.x;
      const dy = player.y - chest.y;
      const isNearby = !chest.isOpened && dx * dx + dy * dy <= 4.84;

      this.dynamicRenderList.push({
        type: 'chest',
        ySort: chest.x + chest.y + 0.1,
        entity: chest,
        alpha,
        isNearby
      });
    }

    // Runic Puzzle Pillars with [E] prompt on proximity
    for (let i = 0; i < puzzles.length; i++) {
      const puzzle = puzzles[i];
      if (puzzle.x < bounds.minX - 1 || puzzle.x > bounds.maxX + 1 || puzzle.y < bounds.minY - 1 || puzzle.y > bounds.maxY + 1) continue;
      const alpha = fog.getRevealAlpha(puzzle.x, puzzle.y);
      if (alpha <= 0.01) continue;
      const dx = player.x - puzzle.x;
      const dy = player.y - puzzle.y;
      const isNearby = !puzzle.isSolved && dx * dx + dy * dy <= 6.25;

      this.dynamicRenderList.push({
        type: 'puzzle',
        ySort: puzzle.x + puzzle.y + 0.15,
        entity: puzzle,
        alpha,
        isNearby
      });
    }

    // Emergency Evacuation Escape Portal
    if (escapePortal &&
        escapePortal.x >= bounds.minX - 2 && escapePortal.x <= bounds.maxX + 2 &&
        escapePortal.y >= bounds.minY - 2 && escapePortal.y <= bounds.maxY + 2) {
      this.dynamicRenderList.push({
        type: 'portal',
        ySort: escapePortal.x + escapePortal.y + 0.1,
        entity: escapePortal,
        portalTime: escapeTimeRemaining,
        extractionState: extractionSequenceState
      });
    }

    // Animated Enemies & Bosses (Transparent Cutouts, NO BOXES!)
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (enemy.isDead || !fog.isVisible(enemy.x, enemy.y)) continue;
      if (enemy.x < bounds.minX - 2 || enemy.x > bounds.maxX + 2 || enemy.y < bounds.minY - 2 || enemy.y > bounds.maxY + 2) continue;
      this.dynamicRenderList.push({
        type: 'enemy',
        ySort: enemy.x + enemy.y + 0.3,
        entity: enemy
      });
    }

    // Animated Player Hero (Transparent Cutout, NO BOXES!)
    this.dynamicRenderList.push({
      type: 'player',
      ySort: player.x + player.y + 0.35,
      entity: player,
      deathState: deathSequenceState,
      extractionState: extractionSequenceState
    });

    // Sort only dynamic entities (~15-30 items, microseconds)
    this.dynamicRenderList.sort((a, b) => a.ySort - b.ySort);

    // Natural Diagonal Depth Traversal with Smooth Alpha Reveal on Wall Obstacles
    const minDiag = bounds.minX + bounds.minY;
    const maxDiag = bounds.maxX + bounds.maxY;
    let dynIdx = 0;
    const dynCount = this.dynamicRenderList.length;

    for (let d = minDiag; d <= maxDiag; d++) {
      while (dynIdx < dynCount && this.dynamicRenderList[dynIdx].ySort <= d + 0.5) {
        this.renderDynamicItem(ctx, this.dynamicRenderList[dynIdx]);
        dynIdx++;
      }

      const startX = Math.max(bounds.minX, d - bounds.maxY);
      const endX = Math.min(bounds.maxX, d - bounds.minY);

      for (let x = startX; x <= endX; x++) {
        const y = d - x;
        if (world.tiles[y][x] === TileType.WALL) {
          const revealAlpha = fog.getRevealAlpha(x, y);
          if (revealAlpha <= 0.01) continue;

          const relX = x - camX;
          const relY = y - camY;
          const sx = vpCenterX + (relX - relY) * halfW;
          const sy = vpCenterY + (relX + relY) * halfH;

          if (revealAlpha < 0.99) {
            ctx.globalAlpha = revealAlpha;
            TileRenderer.drawNaturalObstacle(ctx, sx, sy, halfW, halfH, zoom, world.biome, x, y);
            ctx.globalAlpha = 1.0;
          } else {
            TileRenderer.drawNaturalObstacle(ctx, sx, sy, halfW, halfH, zoom, world.biome, x, y);
          }
        }
      }
    }

    while (dynIdx < dynCount) {
      this.renderDynamicItem(ctx, this.dynamicRenderList[dynIdx++]);
    }

    // 5. RENDER MULTI-STYLE CUSTOM PROJECTILES
    projectiles.projectiles.forEach(p => {
      if (p.x >= bounds.minX - 1 && p.x <= bounds.maxX + 1 &&
          p.y >= bounds.minY - 1 && p.y <= bounds.maxY + 1) {
        this.drawCustomProjectile(ctx, p);
      }
    });

    // 6. RENDER SHOCKWAVES & PARTICLES
    particles.shockwaves.forEach(sw => {
      if (sw.x < bounds.minX - 4 || sw.x > bounds.maxX + 4 ||
          sw.y < bounds.minY - 4 || sw.y > bounds.maxY + 4) return;
      const relX = sw.x - camX;
      const relY = sw.y - camY;
      const sx = vpCenterX + (relX - relY) * halfW;
      const sy = vpCenterY + (relX + relY) * halfH;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw.radius * 32 * zoom, sw.radius * 16 * zoom, 0, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3.5 * zoom;
      ctx.globalAlpha = sw.alpha;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Hero Explosion Shards & Shrapnel Debris
    particles.heroShards.forEach(s => {
      const relX = s.x - camX;
      const relY = s.y - camY;
      const sx = vpCenterX + (relX - relY) * halfW;
      const sy = vpCenterY + (relX + relY) * halfH - (s.z || 0) * 28 * zoom;

      // Motion Trail
      if (s.trail.length > 1) {
        ctx.beginPath();
        for (let t = 0; t < s.trail.length; t++) {
          const pt = s.trail[t];
          const prX = pt.x - camX;
          const prY = pt.y - camY;
          const px = vpCenterX + (prX - prY) * halfW;
          const py = vpCenterY + (prX + prY) * halfH - (pt.z || 0) * 28 * zoom;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = s.glowColor;
        ctx.lineWidth = 2 * zoom;
        ctx.globalAlpha = s.alpha * 0.45;
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha;

      if (s.shape === 'rune_plate' && s.glyph) {
        ctx.font = `bold ${Math.floor((s.size + 8) * zoom)}px serif`;
        ctx.fillStyle = s.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.glyph, 0, 0);
      } else if (s.shape === 'cyber_gear') {
        const sz = s.size * zoom;
        ctx.beginPath();
        ctx.arc(0, 0, sz, 0, Math.PI * 2);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2 * zoom;
        ctx.stroke();
        for (let g = 0; g < 4; g++) {
          const ga = (Math.PI / 2) * g;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ga) * (sz * 0.5), Math.sin(ga) * (sz * 0.5));
          ctx.lineTo(Math.cos(ga) * (sz * 1.3), Math.sin(ga) * (sz * 1.3));
          ctx.stroke();
        }
      } else if (s.points && s.points.length >= 3) {
        ctx.beginPath();
        const sz = s.size * zoom;
        for (let p = 0; p < s.points.length; p++) {
          const px = s.points[p].x * sz;
          const py = s.points[p].y * sz;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 * zoom;
        ctx.stroke();
      } else {
        const sz = s.size * zoom;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1.0;
    });

    particles.particles.forEach(p => {
      if (p.x < bounds.minX - 1 || p.x > bounds.maxX + 1 ||
          p.y < bounds.minY - 1 || p.y > bounds.maxY + 1) return;
      const relX = p.x - camX;
      const relY = p.y - camY;
      const sx = vpCenterX + (relX - relY) * halfW;
      const sy = vpCenterY + (relX + relY) * halfH - (p.z || 0) * 20 * zoom;
      if (p.shape === 'matrix_hex' && p.text) {
        ctx.font = `bold ${Math.floor(p.size * zoom)}px "Share Tech Mono", monospace`;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillText(p.text, sx, sy);
      } else if (p.shape === 'glitch_line') {
        const lineW = (p.width || p.size * 6) * zoom;
        const lineH = Math.max(1.5, (p.height || 2) * zoom);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(sx - lineW / 2, sy - lineH / 2, lineW, lineH);
        // Chromatic offset ghost
        ctx.fillStyle = '#00f0ff';
        ctx.globalAlpha = p.alpha * 0.45;
        ctx.fillRect(sx - lineW / 2 + 2 * zoom, sy - lineH / 2, lineW, lineH);
      } else if (p.shape === 'pixel') {
        const sqSize = p.size * zoom;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(sx - sqSize / 2, sy - sqSize / 2, sqSize, sqSize);
        // Micro highlight pixel
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.fillRect(sx - sqSize / 2 + 1, sy - sqSize / 2 + 1, Math.max(1, sqSize * 0.35), Math.max(1, sqSize * 0.35));
      } else if (p.shape === 'shard') {
        ctx.save();
        ctx.translate(sx, sy);
        const rot = (performance.now() * 0.008 + (p.size * 2)) % (Math.PI * 2);
        ctx.rotate(rot);
        const sSize = p.size * zoom;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.moveTo(0, -sSize);
        ctx.lineTo(sSize * 0.7, sSize * 0.7);
        ctx.lineTo(-sSize * 0.7, sSize * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'lightning_streak') {
        const len = (p.size || 20) * zoom;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.moveTo(sx - len * 0.5, sy + (Math.random() - 0.5) * 4);
        ctx.lineTo(sx - len * 0.15, sy + (Math.random() - 0.5) * 8);
        ctx.lineTo(sx + len * 0.2, sy - (Math.random() - 0.5) * 8);
        ctx.lineTo(sx + len * 0.5, sy + (Math.random() - 0.5) * 4);
        ctx.stroke();
      } else if (p.glyph) {
        ctx.font = `${Math.floor(16 * zoom)}px serif`;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillText(p.glyph, sx, sy);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * zoom, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;

    // 7. RENDER FLOATING COMBAT TEXT (Zero GC, strokeText outline instead of shadowBlur)
    if (combat.floatingTexts.length > 0) {
      const critFont = `bold ${Math.floor(20 * zoom)}px Share Tech Mono, monospace`;
      const normalFont = `bold ${Math.floor(15 * zoom)}px Share Tech Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = Math.max(1, 2 * zoom);
      ctx.strokeStyle = '#000000';

      for (let fi = 0; fi < combat.floatingTexts.length; fi++) {
        const ft = combat.floatingTexts[fi];
        if (ft.x < bounds.minX - 1 || ft.x > bounds.maxX + 1 ||
            ft.y < bounds.minY - 1 || ft.y > bounds.maxY + 1) continue;
        const relX = ft.x - camX;
        const relY = ft.y - camY;
        const sx = vpCenterX + (relX - relY) * halfW;
        const sy = vpCenterY + (relX + relY) * halfH - 25 * zoom;

        ctx.font = ft.type === 'crit' ? critFont : normalFont;
        ctx.fillStyle = FLOATING_TEXT_COLORS[ft.type] || '#ffffff';
        if (zoom >= 0.85) {
          ctx.strokeText(ft.text, sx, sy);
        }
        ctx.fillText(ft.text, sx, sy);
      }
      ctx.textAlign = 'left';
    }

    // 8. RENDER DYNAMIC LIGHTING PASS (Directional Hero Sight Masking)
    lighting.clearTransientLights();

    if (escapePortal &&
        escapePortal.x >= bounds.minX - 3 && escapePortal.x <= bounds.maxX + 3 &&
        escapePortal.y >= bounds.minY - 3 && escapePortal.y <= bounds.maxY + 3) {
      lighting.addLight({
        x: escapePortal.x,
        y: escapePortal.y,
        radius: 9.5,
        color: '#38bdf8',
        intensity: 1.0,
        flicker: true
      });
    }

    let projLightCount = 0;
    for (let i = 0; i < projectiles.projectiles.length; i++) {
      if (projLightCount >= 8) break;
      const p = projectiles.projectiles[i];
      if (p.x >= bounds.minX - 1 && p.x <= bounds.maxX + 1 &&
          p.y >= bounds.minY - 1 && p.y <= bounds.maxY + 1) {
        lighting.addLight({
          x: p.x,
          y: p.y,
          radius: p.style === 'magma_bomb' ? 3.0 : 2.0,
          color: p.color,
          intensity: 0.8
        });
        projLightCount++;
      }
    }

    enemies.forEach(e => {
      if (e.isBoss && !e.isDead &&
          e.x >= bounds.minX - 6 && e.x <= bounds.maxX + 6 &&
          e.y >= bounds.minY - 6 && e.y <= bounds.maxY + 6) {
        lighting.addLight({
          x: e.x,
          y: e.y,
          radius: 16.0,
          color: e.color,
          intensity: 1.15,
          flicker: true
        });
      }
    });

    lighting.render(
      this.lightCtx,
      this.lightCanvas.width,
      this.lightCanvas.height,
      (wx, wy, wz) => this.camera.worldToScreen(wx, wy, wz),
      this.camera.zoom,
      fog.visionPolygon,
      player
    );

    // 9. FOREGROUND BIOME ATMOSPHERE
    this.drawBiomeForegroundAtmosphere(ctx, cw, ch, world.biome);

    // 10. REALM COLLAPSE & MOVIE-GRADE SIMULATION TEARING POST-PROCESSING FX
    if (collapseIntensity > 0) {
      const now = performance.now() * 0.001;

      // A. Fullscreen CRT Interlaced Scanlines (Simulation Matrix Grid)
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      const scanlineStep = Math.max(3, Math.floor(4 * this.camera.zoom));
      const scanlineAlpha = Math.min(0.28, collapseIntensity * 0.35);
      ctx.globalAlpha = scanlineAlpha;
      for (let y = 0; y < ch; y += scanlineStep) {
        ctx.fillRect(0, y, cw, 1.2);
      }
      ctx.restore();

      // B. Multi-Layer RGB Chromatic Aberration Screen Split
      if (collapseIntensity > 0.06) {
        const shift = Math.floor(collapseIntensity * 12 + Math.sin(now * 30) * 3);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = collapseIntensity * 0.35;
        // Cyan Channel Left Shift
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-shift, 0, cw, ch);
        // Magenta / Crimson Channel Right Shift
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(shift, 0, cw, ch);
        ctx.restore();
      }

      // C. Cinema-Grade Horizontal Screen Tearing & Sliced Video Buffer Displacements
      if (collapseIntensity > 0.1) {
        const glitchCount = Math.floor(2 + collapseIntensity * 14);
        for (let g = 0; g < glitchCount; g++) {
          const stripY = Math.random() * ch;
          const stripH = 2 + Math.random() * (20 * collapseIntensity);
          const shiftX = (Math.random() - 0.5) * (70 * collapseIntensity);

          try {
            // Main shifted slice
            ctx.drawImage(this.canvas, 0, stripY, cw, stripH, shiftX, stripY, cw, stripH);

            // Colored RGB Ghost Tears along slice edge
            if (Math.random() < 0.6) {
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.globalAlpha = collapseIntensity * 0.5;
              ctx.fillStyle = Math.random() > 0.5 ? '#00f0ff' : '#ff0055';
              ctx.fillRect(shiftX > 0 ? shiftX : 0, stripY, Math.abs(shiftX) + 6, stripH);
              ctx.restore();
            }
          } catch (e) {}
        }
      }

      // D. Digital Static Noise Bands & Raster Artifacts
      if (collapseIntensity > 0.08) {
        const staticBars = Math.floor(1 + collapseIntensity * 6);
        ctx.save();
        for (let b = 0; b < staticBars; b++) {
          const by = Math.random() * ch;
          const bh = 1.5 + Math.random() * 4;
          const barColors = ['#ffffff', '#00f0ff', '#ff0055', '#fcee0a', '#000000'];
          ctx.fillStyle = barColors[Math.floor(Math.random() * barColors.length)];
          ctx.globalAlpha = 0.4 + Math.random() * 0.5;
          ctx.fillRect(0, by, cw, bh);
        }
        ctx.restore();
      }

      // E. Pixel Voxel Shatter Blocks (Map Dissolving into Raw Matrix Pixels)
      if (collapseIntensity > 0.05) {
        ctx.save();
        const pixelBlocks = Math.floor(collapseIntensity * 65);
        const blockSize = Math.floor(6 * this.camera.zoom);
        const colors = ['#00f0ff', '#ff0055', '#fcee0a', '#c084fc', '#020617', '#ffffff'];
        for (let p = 0; p < pixelBlocks; p++) {
          const px = Math.random() * cw;
          const py = Math.random() * ch;
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.globalAlpha = 0.35 + Math.random() * 0.55;
          ctx.fillRect(
            Math.floor(px / blockSize) * blockSize,
            Math.floor(py / blockSize) * blockSize,
            blockSize * (Math.random() > 0.7 ? 2 : 1),
            blockSize
          );
        }
        ctx.restore();
      }

      // F. Corrupted Simulation Matrix Telemetry & System Error Warnings
      if (collapseIntensity > 0.15 && Math.random() < 0.85) {
        ctx.save();
        ctx.font = 'bold 11px "Share Tech Mono", monospace';
        const errMessages = [
          '⚠️ SIMULATION_DE_SYNC: REALITY_MEM_FAULT',
          'FATAL_EXCEPTION // 0xDEADBEEF // CORE_DUMP',
          'SECTOR_GEOMETRY_NULL_POINTER // ESCAPE_NOW',
          'MATRIX_COLLAPSE_IMMINENT: 99.4% CORRUPTED',
          '01001101 01000001 01010100 01010010 01001001 01011000'
        ];
        const msg = errMessages[Math.floor(Math.random() * errMessages.length)];
        const textX = 24 + (Math.random() - 0.5) * 12;
        const textY = ch - 28 - Math.random() * 40;

        ctx.fillStyle = Math.random() > 0.5 ? '#ff0055' : '#00f0ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = Math.min(0.85, collapseIntensity * 0.9);
        ctx.fillText(msg, textX, textY);
        ctx.restore();
      }

      // G. Occasional Micro-Inversion Strobe Flash (Movie Reality Glitch Impact)
      if (collapseIntensity > 0.35 && Math.random() < 0.06) {
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }

      // H. Pulsing Red / Crimson Emergency Singularity Perimeter Vignette
      const vigPulse = 1.0 + Math.sin(now * 8) * 0.08;
      const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, (cw * 0.22) * vigPulse, cw / 2, ch / 2, cw * 0.75);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.7, `rgba(239, 68, 68, ${Math.min(0.45, collapseIntensity * 0.5)})`);
      vigGrad.addColorStop(1, `rgba(15, 2, 4, ${Math.min(0.85, collapseIntensity * 0.9)})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 11. HERO DEATH HIT-STOP & CATACLYSM DETONATION OVERLAY
    if (deathSequenceState && deathSequenceState.active) {
      this.drawDeathSequenceOverlay(ctx, cw, ch, deathSequenceState, player);
    }

    // 12. RUNIC MONOLITH OFF-SCREEN HUD EDGE POINTER (When all runes are assembled)
    this.drawRunicMonolithEdgePointer(ctx, cw, ch, puzzles, player);

    // 13. RETRO COLOR QUANTIZATION & BAYER DITHERING POST-PROCESSING PASS
    graphicsEngine.applyRetroDithering(ctx, cw, ch);
  }

  // Direct Dispatch Dynamic Entity Rendering (Zero Closures, Zero GC Overhead)
  private renderDynamicItem(ctx: CanvasRenderingContext2D, item: DynamicRenderItem) {
    switch (item.type) {
      case 'gateway':
        if (item.alpha !== undefined && item.alpha < 0.99 && !item.isVisible) {
          ctx.globalAlpha = item.alpha;
          this.drawGateway(ctx, item.entity, item.isVisible || false);
          ctx.globalAlpha = 1.0;
        } else {
          this.drawGateway(ctx, item.entity, item.isVisible || false);
        }
        break;
      case 'chest':
        if (item.alpha !== undefined && item.alpha < 0.99) {
          ctx.globalAlpha = item.alpha;
          this.drawChest(ctx, item.entity, item.isNearby);
          ctx.globalAlpha = 1.0;
        } else {
          this.drawChest(ctx, item.entity, item.isNearby);
        }
        break;
      case 'puzzle':
        if (item.alpha !== undefined && item.alpha < 0.99) {
          ctx.globalAlpha = item.alpha;
          this.drawPuzzlePillar(ctx, item.entity, item.isNearby);
          ctx.globalAlpha = 1.0;
        } else {
          this.drawPuzzlePillar(ctx, item.entity, item.isNearby);
        }
        break;
      case 'portal':
        this.drawEscapePortal(ctx, item.entity, item.portalTime || 0, item.extractionState);
        break;
      case 'enemy':
        this.drawEnemy(ctx, item.entity);
        break;
      case 'player':
        this.drawPlayer(ctx, item.entity, item.deathState, item.extractionState);
        break;
    }
  }

  // Off-screen Waypoint Indicator pointing to the Runic Monolith when all runes are assembled
  private drawRunicMonolithEdgePointer(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    puzzles: RunicPuzzlePillar[],
    player: Player
  ) {
    if (!puzzles || puzzles.length === 0 || !player) return;
    const puzzle = puzzles[0];
    if (!puzzle || puzzle.isSolved || !puzzle.isAllShardsCollected()) return;

    const sp = this.camera.worldToScreen(puzzle.x, puzzle.y, 0);
    const margin = 55;
    const isOffscreen = sp.x < margin || sp.x > cw - margin || sp.y < margin || sp.y > ch - margin;

    if (!isOffscreen) return;

    const centerX = cw / 2;
    const centerY = ch / 2;
    const angle = Math.atan2(sp.y - centerY, sp.x - centerX);

    // Clamp to screen perimeter
    const boundW = (cw / 2) - margin;
    const boundH = (ch / 2) - margin;

    let edgeX = centerX;
    let edgeY = centerY;

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    if (Math.abs(sinA * boundW) > Math.abs(cosA * boundH)) {
      edgeY = sinA > 0 ? centerY + boundH : centerY - boundH;
      edgeX = centerX + (edgeY - centerY) * (cosA / sinA);
    } else {
      edgeX = cosA > 0 ? centerX + boundW : centerX - boundW;
      edgeY = centerY + (edgeX - centerX) * (sinA / cosA);
    }

    const dist = Math.sqrt((puzzle.x - player.x) ** 2 + (puzzle.y - player.y) ** 2);
    const now = performance.now() * 0.005;
    const pulse = 1.0 + Math.sin(now * 2) * 0.15;

    ctx.save();
    ctx.translate(edgeX, edgeY);

    // Glowing golden shadow
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;

    // Arrow pointer pointing towards target
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(14 * pulse, 0);
    ctx.lineTo(-8 * pulse, -9 * pulse);
    ctx.lineTo(-4 * pulse, 0);
    ctx.lineTo(-8 * pulse, 9 * pulse);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Beacon Badge with Rune Icon and Distance
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-65, 14, 130, 22, [4]);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 10px "Cinzel", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`🔮 MONOLITH (${Math.round(dist * 2)}m)`, 0, 29);

    ctx.restore();
  }

  // Cinematic Hero Death Sequence Overlay (Hit-Stop Freeze, Screen Tearing, Dramatic Killer Banner)
  private drawDeathSequenceOverlay(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    deathState: {
      active: boolean;
      phase: 'idle' | 'hitstop' | 'exploding' | 'defeated';
      timer: number;
      pauseDuration: number;
      totalDuration: number;
      fatalInfo: any;
    },
    player: Player
  ) {
    if (!deathState || !deathState.active) return;

    ctx.save();
    const isHitStop = deathState.phase === 'hitstop';
    const isExploding = deathState.phase === 'exploding';
    const fatal = deathState.fatalInfo || { killerName: 'Hostile Threat', damageType: 'physical', amount: 0 };

    // 1. Fullscreen Hit-Stop / Shellshock Red & Cyan Chromatic Split
    if (isHitStop) {
      const flashIntensity = 1.0 - (deathState.timer / (deathState.pauseDuration || 0.42));
      
      // High-contrast screen flash
      ctx.save();
      ctx.globalAlpha = Math.min(0.65, Math.max(0, flashIntensity * 0.8));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();

      // Horizontal digital scanline tear
      const tearCount = 6;
      for (let i = 0; i < tearCount; i++) {
        const ty = Math.random() * ch;
        const th = 3 + Math.random() * 8;
        const shiftX = (Math.random() - 0.5) * 35;
        try {
          ctx.drawImage(this.canvas, 0, ty, cw, th, shiftX, ty, cw, th);
        } catch (e) {}
      }
    }

    // 2. Heavy Pulsing Dark Crimson & Amber Perimeter Vignette
    const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.2, cw / 2, ch / 2, cw * 0.75);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.7, isHitStop ? 'rgba(127, 29, 29, 0.5)' : 'rgba(239, 68, 68, 0.55)');
    vigGrad.addColorStop(1, 'rgba(15, 3, 5, 0.94)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, cw, ch);

    // 3. Cinematic Slow-Motion Death Banner (Center-Top) - Compact, sleek tactical ribbon
    const bannerW = Math.min(cw * 0.65, 330);
    const bannerH = 54;
    const bannerY = Math.min(ch * 0.08, 45);
    const bannerX = (cw - bannerW) / 2;

    ctx.save();
    // Glassmorphic dark backdrop
    ctx.fillStyle = 'rgba(15, 3, 5, 0.92)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, [8]);
    ctx.fill();

    // Glowing Crimson / Gold Runic Border
    ctx.strokeStyle = isHitStop ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = isHitStop ? '#ef4444' : '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.stroke();

    // Subtle corner brackets
    const bracketSize = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 3;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(bannerX + bracketSize, bannerY);
    ctx.lineTo(bannerX, bannerY);
    ctx.lineTo(bannerX, bannerY + bracketSize);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - bracketSize, bannerY);
    ctx.lineTo(bannerX + bannerW, bannerY);
    ctx.lineTo(bannerX + bannerW, bannerY + bracketSize);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(bannerX, bannerY + bannerH - bracketSize);
    ctx.lineTo(bannerX, bannerY + bannerH);
    ctx.lineTo(bannerX + bracketSize, bannerY + bannerH);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - bracketSize, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH - bracketSize);
    ctx.stroke();

    // Header Tag
    ctx.font = 'bold 9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isHitStop ? '#fca5a5' : '#fde047';
    ctx.shadowBlur = 0;
    const headerText = isHitStop
      ? '⚠️ CRITICAL IMPACT'
      : '💥 VESSEL COLLAPSED';
    ctx.fillText(headerText, cw / 2, bannerY + 16);

    // Lethal Strike Details: Killer Name
    ctx.font = 'bold 13px "Rajdhani", "Cinzel", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 6;
    ctx.fillText(`SLAIN BY: ${fatal.killerName.toUpperCase()}`, cw / 2, bannerY + 32);

    // Damage & Type Breakdown
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.shadowBlur = 0;
    const dmgTypeStr = String(fatal.damageType || 'physical').toUpperCase();
    const typeColor = {
      FIRE: '#f97316',
      FROST: '#67e8f9',
      SHOCK: '#facc15',
      VOID: '#c084fc',
      PLASMA: '#38bdf8',
      PHYSICAL: '#e2e8f0'
    }[dmgTypeStr] || '#f87171';

    ctx.fillStyle = typeColor;
    ctx.fillText(`-${fatal.amount} [${dmgTypeStr}]`, cw / 2, bannerY + 46);

    ctx.restore();
    ctx.restore();
  }

  // Render Dynamic Thematic Sky & Atmospheric Parallax Backdrops for all 6 Biomes
  // Render Minimalist Theme-Fitting Animated Atmospheric Background
  private drawBiomeAtmosphericBackground(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    biome: BiomeDefinition
  ) {
    ctx.save();
    const now = performance.now() * 0.001;

    if (biome.id === 'ilman_luominen') {
      // --- 1. ILMAN LUOMINEN: Minimalist Ethereal Clouds & Cosmic Sky ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
      skyGrad.addColorStop(0, '#050b18');
      skyGrad.addColorStop(0.45, '#0b1b36');
      skyGrad.addColorStop(0.85, '#172554');
      skyGrad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Subtle celestial stars twinkling in upper space
      for (let s = 0; s < 30; s++) {
        const sx = (s * 137.5 + (s * 31) % 40) % cw;
        const sy = (s * 73.1) % (ch * 0.55);
        const twinkle = Math.sin(now * 2 + s * 1.7) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2 * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = s % 2 === 0 ? 'rgba(224, 242, 254, 0.75)' : 'rgba(186, 230, 253, 0.6)';
        ctx.fill();
      }

      // Minimalist drifting translucent cloud layers
      const cloudLayers = 6;
      for (let c = 0; c < cloudLayers; c++) {
        const speed = 8 + c * 5;
        const cx = ((now * speed + c * 240) % (cw + 450)) - 225;
        const cy = 40 + c * (ch / 7) + Math.sin(now * 0.6 + c) * 15;
        const cr = 60 + (c % 3) * 25;
        const alpha = 0.06 + (c % 3) * 0.035;

        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.arc(cx + cr * 0.7, cy - cr * 0.15, cr * 0.85, 0, Math.PI * 2);
        ctx.arc(cx - cr * 0.7, cy - cr * 0.1, cr * 0.8, 0, Math.PI * 2);
        ctx.arc(cx + cr * 1.3, cy + cr * 0.1, cr * 0.65, 0, Math.PI * 2);
        ctx.arc(cx - cr * 1.3, cy + cr * 0.1, cr * 0.6, 0, Math.PI * 2);

        const cloudGrad = ctx.createRadialGradient(cx, cy, cr * 0.2, cx, cy, cr * 2.0);
        cloudGrad.addColorStop(0, `rgba(240, 249, 255, ${alpha * 1.3})`);
        cloudGrad.addColorStop(0.6, `rgba(186, 230, 253, ${alpha * 0.8})`);
        cloudGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        ctx.fillStyle = cloudGrad;
        ctx.fill();
      }

    } else if (biome.id === 'tuonela') {
      // --- 2. TUONELA: Minimalist Flowing Black River of Death (Tuonelan Joki) ---
      const riverBase = ctx.createLinearGradient(0, 0, 0, ch);
      riverBase.addColorStop(0, '#010307');
      riverBase.addColorStop(0.35, '#030a14');
      riverBase.addColorStop(0.7, '#061320');
      riverBase.addColorStop(1, '#010408');
      ctx.fillStyle = riverBase;
      ctx.fillRect(0, 0, cw, ch);

      // Flowing horizontal river currents & undulating wave ribbons
      const riverStreams = 7;
      for (let r = 0; r < riverStreams; r++) {
        const streamY = (r * (ch / (riverStreams - 1)));
        const flowSpeed = 22 + (r % 3) * 12;
        const waveOffset = now * flowSpeed;

        ctx.beginPath();
        ctx.moveTo(0, streamY);
        for (let x = 0; x <= cw; x += 45) {
          const wave = Math.sin((x + waveOffset) * 0.008 + r * 1.4) * (18 + (r % 3) * 8) +
                       Math.cos((x - waveOffset * 0.5) * 0.015) * 6;
          ctx.lineTo(x, streamY + wave);
        }
        ctx.lineTo(cw, streamY + 60);
        ctx.lineTo(0, streamY + 60);
        ctx.closePath();

        const streamAlpha = 0.04 + (r % 2) * 0.035;
        const streamGrad = ctx.createLinearGradient(0, streamY - 20, 0, streamY + 60);
        streamGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        streamGrad.addColorStop(0.4, r % 2 === 0 ? `rgba(34, 211, 238, ${streamAlpha})` : `rgba(6, 182, 212, ${streamAlpha})`);
        streamGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = streamGrad;
        ctx.fill();
      }

      // Ethereal glowing soul-reflection ripples drifting on the river
      for (let p = 0; p < 14; p++) {
        const rx = ((p * 95 + now * (30 + (p % 3) * 15)) % (cw + 120)) - 60;
        const ry = (p * (ch / 13) + Math.sin(now * 1.5 + p) * 12) % ch;
        const rLen = 28 + (p % 4) * 18;

        ctx.beginPath();
        ctx.ellipse(rx, ry, rLen, 2.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = p % 2 === 0 ? 'rgba(34, 211, 238, 0.12)' : 'rgba(103, 232, 249, 0.09)';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fill();
      }

    } else if (biome.id === 'vainola') {
      // --- 3. VÄINÖLÄ: Minimalist Lush Forest Twilight & Drifting Emerald Canopy Mist ---
      const forestGrad = ctx.createLinearGradient(0, 0, 0, ch);
      forestGrad.addColorStop(0, '#01150e');
      forestGrad.addColorStop(0.5, '#04281b');
      forestGrad.addColorStop(1, '#02120b');
      ctx.fillStyle = forestGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Subtle vertical sunbeam / canopy light shafts
      for (let s = 0; s < 4; s++) {
        const sx = s * (cw / 3.5) + Math.sin(now * 0.4 + s) * 25;
        const beamAlpha = 0.035 + Math.sin(now * 0.8 + s) * 0.015;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 90, 0);
        ctx.lineTo(sx - 40, ch);
        ctx.lineTo(sx - 130, ch);
        ctx.closePath();
        ctx.fillStyle = `rgba(167, 243, 208, ${beamAlpha})`;
        ctx.fill();
      }

      // Drifting soft emerald mist waves
      for (let m = 0; m < 4; m++) {
        const my = m * (ch / 3.5);
        const mx = ((now * (12 + m * 6) + m * 200) % (cw + 300)) - 150;
        ctx.beginPath();
        ctx.ellipse(mx, my, 180, 40, 0, 0, Math.PI * 2);
        const mistGrad = ctx.createRadialGradient(mx, my, 20, mx, my, 180);
        mistGrad.addColorStop(0, 'rgba(52, 211, 153, 0.06)');
        mistGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
        ctx.fillStyle = mistGrad;
        ctx.fill();
      }

    } else if (biome.id === 'pohjola') {
      // --- 4. POHJOLA: Minimalist Arctic Night with Undulating Aurora Borealis ---
      const polarGrad = ctx.createLinearGradient(0, 0, 0, ch);
      polarGrad.addColorStop(0, '#01050e');
      polarGrad.addColorStop(0.5, '#051224');
      polarGrad.addColorStop(1, '#020712');
      ctx.fillStyle = polarGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Waving Aurora Borealis ribbons (Revontulet)
      for (let r = 0; r < 3; r++) {
        const aY = ch * (0.2 + r * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, aY);
        for (let x = 0; x <= cw; x += 40) {
          const wave = Math.sin(now * 1.2 + x * 0.006 + r * 1.6) * 35 +
                       Math.cos(now * 0.7 + x * 0.01) * 18;
          ctx.lineTo(x, aY + wave);
        }
        ctx.lineTo(cw, aY + 90);
        ctx.lineTo(0, aY + 90);
        ctx.closePath();

        const aurGrad = ctx.createLinearGradient(0, aY - 20, 0, aY + 90);
        aurGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        aurGrad.addColorStop(0.5, r === 0 ? 'rgba(52, 211, 153, 0.09)' : (r === 1 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(167, 139, 250, 0.06)'));
        aurGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = aurGrad;
        ctx.fill();
      }

    } else if (biome.id === 'alinen') {
      // --- 5. ALINEN: Minimalist Subterranean Heat Shimmer & Magma Glow ---
      const volcanicGrad = ctx.createLinearGradient(0, 0, 0, ch);
      volcanicGrad.addColorStop(0, '#080101');
      volcanicGrad.addColorStop(0.55, '#180402');
      volcanicGrad.addColorStop(1, '#240603');
      ctx.fillStyle = volcanicGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Soft ambient magma horizon glow
      const lavaGlow = ctx.createRadialGradient(cw / 2, ch, 20, cw / 2, ch, cw * 0.65);
      lavaGlow.addColorStop(0, 'rgba(249, 115, 22, 0.18)');
      lavaGlow.addColorStop(0.5, 'rgba(239, 68, 68, 0.09)');
      lavaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lavaGlow;
      ctx.fillRect(0, ch * 0.4, cw, ch * 0.6);

      // Undulating heat haze ripples
      for (let h = 0; h < 3; h++) {
        const hy = ch * (0.6 + h * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, hy);
        for (let x = 0; x <= cw; x += 50) {
          const haze = Math.sin(now * 2.5 + x * 0.01 + h) * 12;
          ctx.lineTo(x, hy + haze);
        }
        ctx.lineTo(cw, ch);
        ctx.lineTo(0, ch);
        ctx.closePath();
        ctx.fillStyle = 'rgba(251, 146, 60, 0.03)';
        ctx.fill();
      }

    } else if (biome.id === 'ylinen') {
      // --- 6. YLINEN: Minimalist Celestial Void & Star Constellations ---
      const celestialGrad = ctx.createLinearGradient(0, 0, 0, ch);
      celestialGrad.addColorStop(0, '#030108');
      celestialGrad.addColorStop(0.5, '#0c0618');
      celestialGrad.addColorStop(1, '#05020a');
      ctx.fillStyle = celestialGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Soft cosmic nebula clouds
      const neb = ctx.createRadialGradient(cw * 0.4, ch * 0.45, 20, cw * 0.4, ch * 0.45, cw * 0.4);
      neb.addColorStop(0, 'rgba(168, 85, 247, 0.08)');
      neb.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
      neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, cw, ch);

      // Twinkling celestial stars
      for (let s = 0; s < 40; s++) {
        const sx = (s * 137.5 + (s * 31) % 50) % cw;
        const sy = (s * 97.3 + (s * 47) % 70) % ch;
        const twinkle = Math.sin(now * 2.5 + s * 1.5) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4 * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = s % 3 === 0 ? '#38bdf8' : (s % 2 === 0 ? '#facc15' : '#e0e7ff');
        ctx.fill();
      }

    } else {
      // --- 7. VOID DIMENSION: Grand Cosmic Singularity & Interstellar Abyss ---
      const voidGrad = ctx.createLinearGradient(0, 0, 0, ch);
      voidGrad.addColorStop(0, '#020005');
      voidGrad.addColorStop(0.4, '#080112');
      voidGrad.addColorStop(0.7, '#120324');
      voidGrad.addColorStop(1, '#030008');
      ctx.fillStyle = voidGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Swirling Singularity Black Hole Vortex in Background Center
      const vortexX = cw * 0.5;
      const vortexY = ch * 0.48;
      const vSpin = now * 0.8;

      // Dark Event Horizon core
      const vCore = ctx.createRadialGradient(vortexX, vortexY, 10, vortexX, vortexY, Math.min(cw, ch) * 0.45);
      vCore.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
      vCore.addColorStop(0.25, 'rgba(147, 51, 234, 0.28)');
      vCore.addColorStop(0.55, 'rgba(192, 132, 252, 0.14)');
      vCore.addColorStop(0.85, 'rgba(244, 63, 94, 0.06)');
      vCore.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vCore;
      ctx.fillRect(0, 0, cw, ch);

      // Swirling Accretion Spiral Arms
      for (let a = 0; a < 4; a++) {
        const armAng = vSpin + (Math.PI * 2 / 4) * a;
        ctx.save();
        ctx.translate(vortexX, vortexY);
        ctx.rotate(armAng);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          Math.min(cw, ch) * 0.2, Math.min(cw, ch) * 0.1,
          Math.min(cw, ch) * 0.35, -Math.min(cw, ch) * 0.2,
          Math.min(cw, ch) * 0.5, Math.min(cw, ch) * 0.05
        );
        ctx.strokeStyle = a % 2 === 0 ? 'rgba(192, 132, 252, 0.22)' : 'rgba(244, 63, 94, 0.18)';
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.restore();
      }

      // Gravitational Lensing Halo Ring
      ctx.beginPath();
      ctx.arc(vortexX, vortexY, Math.min(cw, ch) * 0.18 + Math.sin(now * 2) * 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(233, 213, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Deep Interstellar Galaxy Stars
      for (let s = 0; s < 45; s++) {
        const sx = (s * 179.3 + (s * 41) % 60) % cw;
        const sy = (s * 113.7 + (s * 29) % 80) % ch;
        const twinkle = Math.sin(now * 3 + s * 1.8) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, (1.2 + (s % 3) * 0.6) * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = s % 4 === 0 ? '#c084fc' : (s % 3 === 0 ? '#f43f5e' : (s % 2 === 0 ? '#38bdf8' : '#ffffff'));
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Render Foreground Atmospheric Particles (Cloud Wisps, Spores, Snow, Embers, Star Motes)
  private drawBiomeForegroundAtmosphere(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    biome: BiomeDefinition
  ) {
    ctx.save();
    const now = performance.now() * 0.001;

    if (biome.id === 'ilman_luominen') {
      // Drifting soft cloud puffs in foreground
      for (let i = 0; i < 3; i++) {
        const cx = ((now * 20 + i * 380) % (cw + 300)) - 150;
        const cy = (i * 220 + Math.sin(now + i) * 20) % ch;
        const cr = 60 + (i % 2) * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.04)';
        ctx.fill();
      }

    } else if (biome.id === 'vainola') {
      // Subtle forest pollen
      for (let i = 0; i < 6; i++) {
        const fx = (i * 180 + Math.sin(now * 1.5 + i) * 25) % cw;
        const fy = (i * 120 + now * 10 + Math.cos(now + i) * 18) % ch;
        ctx.beginPath();
        ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.35)';
        ctx.fill();
      }

    } else if (biome.id === 'pohjola') {
      // Soft gentle snow flurries
      for (let s = 0; s < 12; s++) {
        const sx = ((s * 95 - now * 60 + Math.sin(s + now) * 15) % (cw + 100) + cw + 100) % (cw + 100) - 50;
        const sy = (s * 55 + now * 35) % ch;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
        ctx.fill();
      }

    } else if (biome.id === 'tuonela') {
      // 1. Soft Faint Dark Ash
      for (let a = 0; a < 10; a++) {
        const ax = ((a * 120 + Math.sin(now * 0.6 + a) * 25 + now * 10) % (cw + 80) + cw + 80) % (cw + 80) - 40;
        const ay = (a * 60 + now * 25) % ch;
        ctx.beginPath();
        ctx.arc(ax, ay, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.fill();
      }

      // 2. Soft Wandering Soul Apparition
      for (let s = 0; s < 3; s++) {
        const sx = (s * (cw / 3) + Math.sin(now * 0.8 + s * 2.0) * 35) % cw;
        const sy = ((s * 150 - now * 16 + Math.cos(now * 0.7 + s) * 15) % ch + ch) % ch;

        ctx.beginPath();
        ctx.arc(sx, sy, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 3. Oppressive Stygian Despair Vignette at Screen Edges
      const vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
      vigGrad.addColorStop(0, 'rgba(2, 1, 4, 0)');
      vigGrad.addColorStop(0.7, 'rgba(3, 2, 6, 0.35)');
      vigGrad.addColorStop(1, 'rgba(2, 1, 4, 0.75)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, cw, ch);

    } else if (biome.id === 'alinen') {
      // Rising volcanic embers
      for (let e = 0; e < 8; e++) {
        const ex = (e * 130 + Math.sin(now * 2 + e) * 20) % cw;
        const ey = ((e * 80 - now * 35) % ch + ch) % ch;
        ctx.beginPath();
        ctx.arc(ex, ey, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(234, 88, 12, 0.45)';
        ctx.fill();
      }

    } else if (biome.id === 'ylinen') {
      // Soft drifting star motes
      for (let s = 0; s < 8; s++) {
        const sx = (s * 140 + Math.sin(now * 1.5 + s) * 25) % cw;
        const sy = (s * 90 + Math.cos(now * 1.2 + s) * 20) % ch;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
        ctx.fill();
      }

    } else {
      // --- 7. VOID DIMENSION: Floating Soft Void Motes ---
      for (let v = 0; v < 10; v++) {
        const vx = (v * 110 + Math.sin(now * 1.5 + v) * 30) % cw;
        const vy = ((v * 75 - now * 20) % ch + ch) % ch;
        ctx.beginPath();
        ctx.arc(vx, vy, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Draw Animated Player Hero (100% Transparent Silhouette, No Black Boxes!)
  private drawPlayer(ctx: CanvasRenderingContext2D, player: Player, deathState?: any, extractionState?: any) {
    const sp = this.camera.worldToScreen(player.x, player.y, 0);
    const z = this.camera.zoom;

    ctx.save();
    ctx.translate(sp.x, sp.y);

    const isDyingExploded = player.isDead || (deathState && deathState.phase === 'exploding');
    const isDyingHitStop = player.isDying && deathState && deathState.phase === 'hitstop';

    // If hero has already exploded, render expanding/dissipating core remnant and return
    if (isDyingExploded) {
      const flashProgress = deathState ? Math.min(1.0, (deathState.timer - deathState.pauseDuration) / 1.6) : 1.0;
      if (flashProgress < 1.0) {
        const coreAlpha = Math.max(0, 1.0 - flashProgress);
        const coreRadius = (20 + flashProgress * 54) * z;
        ctx.beginPath();
        ctx.arc(0, -20 * z, coreRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${coreAlpha * 0.35})`;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -20 * z, coreRadius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.75})`;
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // EXTRACTION & TELEPORT ASCENSION SEQUENCE:
    // If the hero has already vanished, gate is closing, or extraction is completed, the hero is 100% GONE from screen!
    if (extractionState && extractionState.phase && extractionState.phase !== 'idle') {
      if (extractionState.phase === 'hero_vanished' || extractionState.phase === 'portal_closing' || extractionState.phase === 'completed') {
        ctx.restore();
        return;
      }

      if (extractionState.phase === 'teleporting_hero') {
        const progress = Math.min(1.0, extractionState.timer / (extractionState.heroTeleportDuration || 0.75));
        const dissolveAlpha = Math.max(0, 1.0 - Math.pow(progress, 1.35));
        const ascensionLift = -progress * 70 * z;
        const stretchY = 1.0 + progress * 0.75;
        const stretchX = Math.max(0.04, 1.0 - progress * 0.88);

        // Ground shadow fading out rapidly
        const shadowScale = (1.0 - progress) * 1.0;
        if (shadowScale > 0.05) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 16 * z * shadowScale, 8 * z * shadowScale, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${0.55 * (1 - progress)})`;
          ctx.fill();
        }

        // Radiant Celestial Light Beam & Ascension Energy Stream
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -24 * z + ascensionLift, 18 * z * stretchX, 42 * z * stretchY, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${dissolveAlpha * 0.55})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = (20 + progress * 25) * z;
        ctx.fill();
        ctx.restore();

        // Dematerializing Hero Sprite ascending into the vortex
        ctx.save();
        ctx.globalAlpha = dissolveAlpha;
        ctx.translate(0, -24 * z + ascensionLift + 8 * z);
        ctx.scale(stretchX, stretchY);
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = (16 + progress * 30) * z;
        HeroRenderer.drawInGameHero(ctx, 0, 0, 0.95 * z, player.appearance, {
          isMoving: false,
          walkTimer: 0,
          isHurt: false,
          isFacingLeft: false,
          isCharging: true,
          isDying: false
        });
        ctx.restore();

        ctx.restore();
        return;
      }
    }

    // 1. Dynamic Ground Shadow with Step Expansion
    const shadowScale = player.isMoving ? 1.0 + Math.sin(player.walkTimer) * 0.15 : 1.0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * z * shadowScale, 8 * z * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // 2. Step Oscillation & Breathing Bob
    const walkBob = player.isMoving ? Math.abs(Math.sin(player.walkTimer)) * 4.5 * z : 0;
    const breatheBob = Math.sin(player.idleTimer * 3.0) * 1.5 * z;
    const totalBob = walkBob + breatheBob;
    const heightOffset = -24 * z + totalBob;
    const spriteSize = 42 * z;

    // 3. Pixel-Perfect Screen Aiming Laser Line (Only when alive & not dying)
    const playerScreenCenterY = heightOffset * 0.45;
    const screenDx = inputManager.mouseScreen.x - sp.x;
    const screenDy = inputManager.mouseScreen.y - (sp.y + playerScreenCenterY);
    const screenDist = Math.hypot(screenDx, screenDy);
    const screenAngle = Math.atan2(screenDy, screenDx);

    if (screenDist > 10 && !player.isDying && !player.isDead) {
      const aimLength = Math.min(screenDist, 400 * z);
      const startDist = 14 * z;

      const startX = Math.cos(screenAngle) * startDist;
      const startY = playerScreenCenterY + Math.sin(screenAngle) * startDist;
      const endX = Math.cos(screenAngle) * aimLength;
      const endY = playerScreenCenterY + Math.sin(screenAngle) * aimLength;

      const effectiveWpnDmgType = player.equipment.mainHand?.damageType || player.baseWeapon?.damageType;
      const laserColor = player.overclockTimer > 0
        ? '#f59e0b'
        : (effectiveWpnDmgType === 'void'
          ? '#c084fc'
          : (effectiveWpnDmgType === 'frost'
            ? '#67e8f9'
            : '#38bdf8'));

      // Outer soft glow line
      const glowGrad = ctx.createLinearGradient(startX, startY, endX, endY);
      glowGrad.addColorStop(0, `${laserColor}99`);
      glowGrad.addColorStop(0.7, `${laserColor}44`);
      glowGrad.addColorStop(1, `${laserColor}00`);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = glowGrad;
      ctx.lineWidth = 3.5 * z;
      ctx.stroke();

      // Sharp core laser line
      const coreGrad = ctx.createLinearGradient(startX, startY, endX, endY);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.15, laserColor);
      coreGrad.addColorStop(0.85, `${laserColor}cc`);
      coreGrad.addColorStop(1, `${laserColor}00`);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = 1.3 * z;
      ctx.stroke();

      // Dotted trajectory sight pulses
      const numDots = 4;
      for (let i = 1; i <= numDots; i++) {
        const dotPct = (i / (numDots + 1)) * (aimLength / screenDist);
        if (dotPct <= 1.0) {
          const dotX = startX + (endX - startX) * dotPct;
          const dotY = startY + (endY - startY) * dotPct;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 1.2 * z, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // Precision Sighting Reticle at aim end
      if (screenDist <= 400 * z) {
        ctx.beginPath();
        ctx.arc(endX, endY, 4 * z, 0, Math.PI * 2);
        ctx.strokeStyle = laserColor;
        ctx.lineWidth = 1.2 * z;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(endX, endY, 1.5 * z, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // 4. Dodge Roll 360-degree rotation
    if (player.isDodging) {
      ctx.globalAlpha = 0.65;
      ctx.translate(0, heightOffset);
      ctx.rotate(player.dodgeSpinAngle);
      ctx.translate(0, -heightOffset);
    }

    // 5. Stepping Feet Indicators
    if (player.isMoving && !player.isDodging && !player.isDying && !player.isDead) {
      const leftFootX = -8 * z + Math.sin(player.walkTimer) * 6 * z;
      const rightFootX = 8 * z - Math.sin(player.walkTimer) * 6 * z;

      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(leftFootX, -2 * z, 4 * z, 2.5 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rightFootX, -2 * z, 4 * z, 2.5 * z, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Authentic Hand-Drawn Hero Sprite with War Paint & Implant Overlays
    const isFacingLeft = screenDx < 0;
    HeroRenderer.drawInGameHero(ctx, 0, heightOffset + 8 * z, 0.95 * z, player.appearance, {
      isMoving: player.isMoving,
      walkTimer: player.walkTimer,
      isHurt: player.hurtFlashTimer > 0,
      isFacingLeft: isFacingLeft,
      isCharging: player.isChargingSpecial,
      isDying: isDyingHitStop
    });

    // 7. Dynamic Fluid Weapon Effects (Distinct Visual Effect per Archetype)
    if (player.meleeSwingTimer > 0 && !player.isDying && !player.isDead) {
      // 1. Melee Swing & Energy Blade Launch Arc
      const progress = 1 - (player.meleeSwingTimer / player.meleeSwingDuration);
      const startAngle = screenAngle - 1.1 + progress * 2.2;
      const endAngle = startAngle + 0.6;
      const swingR = (28 + progress * 14) * z;

      const weaponDmgType = player.equipment.mainHand?.damageType || player.baseWeapon?.damageType || 'shock';
      const swingColor = player.overclockTimer > 0
        ? '#f59e0b'
        : (weaponDmgType === 'fire' ? '#f97316' : (weaponDmgType === 'frost' ? '#38bdf8' : (weaponDmgType === 'void' ? '#c084fc' : (weaponDmgType === 'shock' ? '#facc15' : '#38bdf8'))));

      ctx.save();
      // Sweeping energetic slash arc
      ctx.beginPath();
      ctx.arc(0, heightOffset, swingR, startAngle, endAngle);
      ctx.strokeStyle = swingColor;
      ctx.lineWidth = Math.max(2, (6 - progress * 3)) * z;
      ctx.stroke();

      // Bright weapon blade edge
      ctx.beginPath();
      ctx.arc(0, heightOffset, swingR, endAngle - 0.25, endAngle);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3 * z;
      ctx.stroke();

      // Blade tip electric energy sparks
      const tipX = Math.cos(endAngle) * swingR;
      const tipY = heightOffset + Math.sin(endAngle) * swingR;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      ctx.restore();
    }

    if (player.hammerSlamTimer > 0) {
      // 2. Colossal Seismic Hammer Ground Slam (Elemental Quake Shockwave)
      const progress = 1 - (player.hammerSlamTimer / player.hammerSlamDuration);
      const radius = (14 + progress * 52) * z;
      const alpha = Math.max(0, 1 - progress);

      const weaponDmgType = (player.baseWeapon?.weaponCategory === 'heavy_hammer' ? player.baseWeapon?.damageType : null) || player.equipment.mainHand?.damageType || player.baseWeapon?.damageType || 'fire';
      const slamBaseRgb = weaponDmgType === 'frost' ? '56, 189, 248' : (weaponDmgType === 'void' ? '192, 132, 252' : (weaponDmgType === 'shock' ? '250, 204, 21' : '249, 115, 22'));
      const slamGlow = weaponDmgType === 'frost' ? '#0284c7' : (weaponDmgType === 'void' ? '#9333ea' : (weaponDmgType === 'shock' ? '#ca8a04' : '#ea580c'));

      ctx.save();
      // Expanding isometric elemental shockwave ring
      ctx.beginPath();
      ctx.ellipse(0, 10 * z, radius, radius * 0.55, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${slamBaseRgb}, ${alpha * 0.9})`;
      ctx.lineWidth = 6 * z;
      ctx.stroke();

      // Inner bright core
      ctx.beginPath();
      ctx.ellipse(0, 10 * z, radius * 0.7, radius * 0.38, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.lineWidth = 3 * z;
      ctx.stroke();

      // Radiant elemental ground fracture lines
      for (let f = 0; f < 6; f++) {
        const fracAng = (Math.PI * 2 / 6) * f + (f % 2 === 0 ? 0.2 : -0.2);
        const fx = Math.cos(fracAng) * radius * 0.9;
        const fy = 10 * z + Math.sin(fracAng) * radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 10 * z);
        ctx.lineTo(fx, fy);
        ctx.strokeStyle = `rgba(${slamBaseRgb}, ${alpha * 0.85})`;
        ctx.lineWidth = 2.5 * z;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (player.deathRayActive && player.deathRayTimer > 0 && player.deathRayTarget) {
      // 3. TIETÄJÄ: Concentrated Tuoni Death Ray Laser & Void Siphon Helix
      const targetScreen = this.camera.worldToScreen(player.deathRayTarget.x, player.deathRayTarget.y, 0);
      const dx = targetScreen.x - sp.x;
      const dy = (targetScreen.y - 12 * z) - (sp.y + heightOffset);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxPixelDist = 280 * z;
      const actualDist = Math.min(dist, maxPixelDist);
      const rayAngle = Math.atan2(dy, dx);
      const endX = Math.cos(rayAngle) * actualDist;
      const endY = heightOffset + Math.sin(rayAngle) * actualDist;

      ctx.save();
      // Outer violet aura
      ctx.beginPath();
      ctx.moveTo(0, heightOffset);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
      ctx.lineWidth = 14 * z;
      ctx.stroke();

      // Mid magenta laser core
      ctx.beginPath();
      ctx.moveTo(0, heightOffset);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 6 * z;
      ctx.stroke();

      // Core blazing white beam
      ctx.beginPath();
      ctx.moveTo(0, heightOffset);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 * z;
      ctx.stroke();

      // Orbiting energy helix wave
      const now = performance.now() * 0.015;
      ctx.beginPath();
      const segments = 12;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const bx = t * endX;
        const by = heightOffset + t * (endY - heightOffset);
        const offset = Math.sin(now + t * Math.PI * 4) * (8 * z);
        const hx = bx - Math.sin(rayAngle) * offset;
        const hy = by + Math.cos(rayAngle) * offset;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * z;
      ctx.stroke();

      // Target impact burn flare
      ctx.beginPath();
      ctx.arc(endX, endY, 8 * z, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2 * z;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, 3.5 * z, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Multi-Style Custom Projectiles
  private drawCustomProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
    const sp = this.camera.worldToScreen(p.x, p.y, 14);
    const z = this.camera.zoom;
    const moveAngle = Math.atan2(p.vy, p.vx);

    ctx.save();
    ctx.translate(sp.x, sp.y);

    switch (p.style) {
      case 'frost_shard':
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.moveTo(14 * z, 0);
        ctx.lineTo(-6 * z, -4 * z);
        ctx.lineTo(-10 * z, 0);
        ctx.lineTo(-6 * z, 4 * z);
        ctx.closePath();
        ctx.fillStyle = '#e0f2fe';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2 * z;
        ctx.stroke();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1 * z;
        ctx.stroke();
        break;

      case 'scrap_buzzsaw':
        ctx.rotate(p.spinAngle);
        const bladeR = 10 * z;
        const teeth = 8;
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const ang = (Math.PI / teeth) * i;
          const r = i % 2 === 0 ? bladeR : bladeR * 0.6;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#b45309';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2 * z;
        ctx.stroke();
        break;

      case 'void_skull':
        ctx.rotate(p.spinAngle * 0.2);
        ctx.beginPath();
        ctx.arc(0, -2 * z, 8 * z, 0, Math.PI * 2);
        ctx.fillStyle = '#581c87';
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2 * z;
        ctx.stroke();

        ctx.fillStyle = '#f3e8ff';
        ctx.beginPath();
        ctx.arc(-3 * z, -3 * z, 2 * z, 0, Math.PI * 2);
        ctx.arc(3 * z, -3 * z, 2 * z, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'magma_bomb':
        ctx.beginPath();
        ctx.arc(0, 0, 10 * z, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, 2 * z, 0, 0, 10 * z);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.5, '#ea580c');
        grad.addColorStop(1, '#7c2d12');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2 * z;
        ctx.stroke();
        break;

      case 'mega_plasma_orb':
        // Giant Piercing Runic Plasmasphere with Rotating Rings
        ctx.rotate(p.spinAngle);
        const megaR = 18 * z;

        // Outer Runic Halo
        ctx.beginPath();
        ctx.arc(0, 0, megaR, 0, Math.PI * 2);
        const megaGrad = ctx.createRadialGradient(0, 0, 4 * z, 0, 0, megaR);
        megaGrad.addColorStop(0, '#ffffff');
        megaGrad.addColorStop(0.3, '#38bdf8');
        megaGrad.addColorStop(0.7, '#818cf8');
        megaGrad.addColorStop(1, 'rgba(192, 132, 252, 0.2)');
        ctx.fillStyle = megaGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2.5 * z;
        ctx.stroke();

        // Orbiting lightning nodes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * z;
        ctx.beginPath();
        ctx.ellipse(0, 0, megaR * 1.2, megaR * 0.45, p.spinAngle * 2, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'lightning_arc':
        // Electric Branching Lightning Bolt
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.moveTo(-16 * z, 0);
        ctx.lineTo(-8 * z, (Math.random() - 0.5) * 6 * z);
        ctx.lineTo(0, (Math.random() - 0.5) * 6 * z);
        ctx.lineTo(8 * z, (Math.random() - 0.5) * 4 * z);
        ctx.lineTo(18 * z, 0);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3.5 * z;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();
        break;

      case 'homing_missile':
        // High-Tech Cyber Micro-Missile with Dynamic Thruster Plume & Fins
        ctx.rotate(moveAngle);

        // 1. Rocket Thruster Exhaust Plume (Flashing glow behind missile)
        const flameLength = (10 + Math.sin(Date.now() * 0.04) * 4) * z;
        ctx.beginPath();
        ctx.moveTo(-7 * z, -2.5 * z);
        ctx.lineTo(-7 * z - flameLength, 0);
        ctx.lineTo(-7 * z, 2.5 * z);
        ctx.closePath();
        ctx.fillStyle = '#f97316';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-7 * z, -1.2 * z);
        ctx.lineTo(-7 * z - flameLength * 0.6, 0);
        ctx.lineTo(-7 * z, 1.2 * z);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 2. Stabilizer Fins
        ctx.beginPath();
        ctx.moveTo(-4 * z, -6 * z);
        ctx.lineTo(-7 * z, -2 * z);
        ctx.lineTo(-7 * z, 2 * z);
        ctx.lineTo(-4 * z, 6 * z);
        ctx.lineTo(-2 * z, 2 * z);
        ctx.lineTo(-2 * z, -2 * z);
        ctx.closePath();
        ctx.fillStyle = '#475569';
        ctx.fill();

        // 3. Missile Body & Aerodynamic Nose Cone
        ctx.beginPath();
        ctx.moveTo(11 * z, 0); // Nose tip
        ctx.lineTo(5 * z, -3 * z);
        ctx.lineTo(-7 * z, -3 * z);
        ctx.lineTo(-7 * z, 3 * z);
        ctx.lineTo(5 * z, 3 * z);
        ctx.closePath();
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();

        // 4. Warhead Neon Runic Stripe
        ctx.beginPath();
        ctx.moveTo(3 * z, -2.5 * z);
        ctx.lineTo(5 * z, 0);
        ctx.lineTo(3 * z, 2.5 * z);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();
        break;

      case 'golden_rune_shard':
        // Singing Kalevala Lyric Rune Shard (Acoustic Chime Pulse)
        ctx.rotate(moveAngle);
        ctx.font = `bold ${Math.floor(14 * z)}px "Cinzel", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fde047';
        ctx.fillText('ᛋ', 0, 0);

        // Acoustic Shockwave Rings
        ctx.beginPath();
        ctx.arc(0, 0, 8 * z, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.8 * z;
        ctx.stroke();
        break;

      case 'aegis_shield_wave':
        // SOTURI: Surging Kinetic Aegis Wave / Runic Shield Blast (Wide Crescent Barrier)
        ctx.rotate(moveAngle);
        const waveProgress = Math.max(0, Math.min(1, 1 - (p.life / p.maxLife)));
        const waveSpan = (18 + waveProgress * 22) * z; // Arc radius expands as wave travels
        const waveAngle = Math.PI * 0.44; // ~80 degree crescent barrier
        const waveAlpha = Math.max(0.28, 1 - waveProgress * 0.6);

        ctx.save();
        ctx.globalAlpha = waveAlpha;

        // 1. Aerodynamic Propulsion Wake Lines (trailing behind shield)
        for (let w = -2; w <= 2; w++) {
          const offY = w * (waveSpan * 0.28);
          const trailLen = (12 + Math.abs(w) * 6) * (1 - waveProgress * 0.4) * z;
          ctx.beginPath();
          ctx.moveTo(-3 * z, offY);
          ctx.lineTo(-3 * z - trailLen, offY);
          ctx.strokeStyle = w % 2 === 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(250, 204, 21, 0.4)';
          ctx.lineWidth = 1.5 * z;
          ctx.stroke();
        }

        // 2. Outer Hard-Light Aegis Shield Barrier (Glowing Crescent Arc)
        ctx.beginPath();
        ctx.arc(0, 0, waveSpan, -waveAngle, waveAngle);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5 * z;
        ctx.stroke();

        // 3. Inner Blinding Golden/White Kinetic Core Arc
        ctx.beginPath();
        ctx.arc(2 * z, 0, waveSpan * 0.88, -waveAngle * 0.85, waveAngle * 0.85);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5 * z;
        ctx.stroke();

        // 4. Kinetic Shield Chevron / Runic Weave in center
        ctx.beginPath();
        ctx.moveTo(waveSpan * 0.95, 0);
        ctx.lineTo(waveSpan * 0.6, -7 * z);
        ctx.moveTo(waveSpan * 0.95, 0);
        ctx.lineTo(waveSpan * 0.6, 7 * z);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * z;
        ctx.stroke();

        // 5. Electric crackles on shield tips
        for (const tip of [-waveAngle, waveAngle]) {
          const tipX = Math.cos(tip) * waveSpan;
          const tipY = Math.sin(tip) * waveSpan;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + (Math.random() - 0.5) * 10 * z, tipY + (Math.random() - 0.5) * 10 * z);
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5 * z;
          ctx.stroke();
        }

        ctx.restore();
        break;

      case 'rail_slug':
        // High-velocity hyper-dense energized slug with ion wake
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.moveTo(18 * z, 0);
        ctx.lineTo(-12 * z, -2.5 * z);
        ctx.lineTo(-16 * z, 0);
        ctx.lineTo(-12 * z, 2.5 * z);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = p.color || '#38bdf8';
        ctx.lineWidth = 2.2 * z;
        ctx.stroke();

        // Ion propulsion trail
        ctx.beginPath();
        ctx.moveTo(-16 * z, 0);
        ctx.lineTo(-30 * z, 0);
        ctx.strokeStyle = p.color || '#38bdf8';
        ctx.lineWidth = 2.5 * z;
        ctx.stroke();
        break;

      case 'scatter_pellet':
        // High-density energetic shotgun pellet with kinetic trail
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6 * z, 2.5 * z, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.strokeStyle = p.color || '#f97316';
        ctx.lineWidth = 1.6 * z;
        ctx.stroke();
        break;

      case 'plasma_bolt':
      default:
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.moveTo(12 * z, 0);
        ctx.lineTo(-8 * z, -3 * z);
        ctx.lineTo(-4 * z, 0);
        ctx.lineTo(-8 * z, 3 * z);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = p.glowColor || '#ffffff';
        ctx.lineWidth = 1.2 * z;
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  // Draw Loot Chest with Proximity [E] Indicator & Dedicated Sprite Art
  private drawChest(ctx: CanvasRenderingContext2D, chest: LootChest, isNearby: boolean = false) {
    const sp = this.camera.worldToScreen(chest.x, chest.y, 0);
    const z = this.camera.zoom;

    ctx.save();
    ctx.translate(sp.x, sp.y);

    const rarityColor = {
      common: '#94a3b8',
      augmented: '#38bdf8',
      runic: '#c084fc',
      masterwork: '#f59e0b',
      relic: '#ef4444'
    }[chest.rarity] || '#38bdf8';

    if (chest.isDestroyed) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * z, 8 * z, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5 * z;
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(-10 * z, -8 * z, 20 * z, 8 * z);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      ctx.restore();
      return;
    }


    const now = performance.now() * 0.003;
    const pulse = 1.0 + Math.sin(now * 2.2) * 0.16;
    const bob = isNearby && !chest.isOpened ? Math.sin(now * 3.2) * 2.2 * z : (!chest.isOpened ? Math.sin(now * 2.0) * 1.2 * z : 0);
    const spriteSize = 46 * z;
    const spriteY = -19 * z + bob;

    // 1. Ground Contact Shadow
    ctx.beginPath();
    ctx.ellipse(0, 2 * z, 18 * z, 8 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();

    // 2. Luminous Pop-up Radial Halo Glow behind and around the chest
    if (!chest.isOpened) {
      const haloRadius = 26 * z * pulse;
      const haloGrad = ctx.createRadialGradient(0, spriteY, 2 * z, 0, spriteY, haloRadius);
      haloGrad.addColorStop(0, `${rarityColor}55`);
      haloGrad.addColorStop(0.45, `${rarityColor}25`);
      haloGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, spriteY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Soft ground ambient color ring
      ctx.beginPath();
      ctx.ellipse(0, 1 * z, 22 * z * pulse, 11 * z * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = `${rarityColor}1a`;
      ctx.fill();

      // Vertical beacon shimmer
      const grad = ctx.createLinearGradient(0, 0, 0, -75 * z);
      grad.addColorStop(0, `${rarityColor}33`);
      grad.addColorStop(0.6, `${rarityColor}11`);
      grad.addColorStop(1, `${rarityColor}00`);
      ctx.beginPath();
      ctx.moveTo(-11 * z, 0);
      ctx.lineTo(11 * z, 0);
      ctx.lineTo(18 * z, -75 * z);
      ctx.lineTo(-18 * z, -75 * z);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 3. Orbiting magical glint particles / sparkles
      for (let p = 0; p < 3; p++) {
        const pAng = now * 1.6 + p * (Math.PI * 2 / 3);
        const px = Math.cos(pAng) * 20 * z;
        const py = spriteY + Math.sin(pAng) * 11 * z + Math.sin(now * 3 + p) * 3 * z;
        const pSize = (1.2 + Math.sin(now * 3.5 + p) * 0.6) * z;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.5, pSize), 0, Math.PI * 2);
        ctx.fillStyle = p % 2 === 0 ? '#ffffff' : rarityColor;
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 8 * z;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 4. Render Dedicated Custom Sprite Graphic with Glowing Outer Shadow
    const sprite = AssetLoader.getChestSprite(chest.rarity, chest.isOpened);
    if (sprite) {
      if (!chest.isOpened) {
        ctx.shadowColor = rarityColor;
        ctx.shadowBlur = 10 * z;
      }
      ctx.drawImage(sprite, -spriteSize / 2, spriteY - spriteSize / 2, spriteSize, spriteSize);
      ctx.shadowBlur = 0;
    } else {
      // Fallback geometric rendering
      ctx.beginPath();
      ctx.rect(-12 * z, -14 * z + bob, 24 * z, 14 * z);
      ctx.fillStyle = chest.isOpened ? '#334155' : (chest.rarity === 'masterwork' ? '#78350f' : (chest.rarity === 'runic' ? '#581c87' : '#0369a1'));
      ctx.fill();
      ctx.strokeStyle = chest.isOpened ? '#1e293b' : rarityColor;
      ctx.lineWidth = 2 * z;
      ctx.stroke();
    }

    // 5. Floating [E] DECRYPT / OPEN Prompt Badge
    if (isNearby) {
      const promptY = spriteY - 26 * z + Math.sin(now * 3.5) * 3 * z;
      const promptText = chest.isLocked ? '🔒 [SEALED]' : `[E] DECRYPT (${chest.keySequence.length} KEYS)`;
      const boxW = chest.isLocked ? 76 * z : 98 * z;

      ctx.fillStyle = 'rgba(11, 17, 28, 0.95)';
      ctx.strokeStyle = chest.isLocked ? '#ef4444' : rarityColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-boxW / 2, promptY - 10 * z, boxW, 20 * z);
      ctx.fill();
      ctx.stroke();


      ctx.font = `bold ${Math.floor(10 * z)}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = chest.isLocked ? '#ef4444' : rarityColor;
      ctx.fillText(promptText, 0, promptY + 4 * z);
    }

    ctx.restore();
  }

  // Draw Runic Puzzle Pillar with Proximity [E] Indicator & Orbiting Cipher Shards
  private drawPuzzlePillar(ctx: CanvasRenderingContext2D, puzzle: RunicPuzzlePillar, isNearby: boolean = false) {
    const sp = this.camera.worldToScreen(puzzle.x, puzzle.y, 0);
    const z = this.camera.zoom;
    const collectedCount = puzzle.getCollectedShardsCount();
    const isAllCollected = puzzle.isAllShardsCollected();

    ctx.save();
    ctx.translate(sp.x, sp.y);

    // 1. Ground Runic Base
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * z, 9 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // 2. Main Ancient Stone Monolith Obelisk
    ctx.beginPath();
    ctx.moveTo(-10 * z, 0);
    ctx.lineTo(-7 * z, -42 * z);
    ctx.lineTo(0, -50 * z);
    ctx.lineTo(7 * z, -42 * z);
    ctx.lineTo(10 * z, 0);
    ctx.closePath();
    ctx.fillStyle = puzzle.isSolved ? '#064e3b' : (isAllCollected ? '#451a03' : '#0f172a');
    ctx.fill();
    ctx.strokeStyle = puzzle.isSolved ? '#10b981' : (isAllCollected ? '#f59e0b' : '#38bdf8');
    ctx.lineWidth = 2 * z;
    ctx.stroke();

    // 3. Glowing Inscribed Matrix Conduits
    const glowColor = puzzle.isSolved ? '#10b981' : (isAllCollected ? '#f59e0b' : '#38bdf8');
    ctx.beginPath();
    ctx.moveTo(0, -48 * z);
    ctx.lineTo(0, -4 * z);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5 * z;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = puzzle.isSolved || isAllCollected ? 14 : 6;
    ctx.stroke();

    // 4. Upward Celestial Light Beacon (When 4/4 gathered or solved)
    if (puzzle.isSolved || isAllCollected) {
      const beamHeight = isAllCollected && !puzzle.isSolved ? 420 * z : 180 * z;
      const beaconGrad = ctx.createLinearGradient(0, -48 * z, 0, -beamHeight);
      beaconGrad.addColorStop(0, puzzle.isSolved ? 'rgba(16, 185, 129, 0.55)' : 'rgba(245, 158, 11, 0.65)');
      beaconGrad.addColorStop(0.5, puzzle.isSolved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.35)');
      beaconGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = beaconGrad;
      ctx.beginPath();
      ctx.moveTo(-16 * z, -48 * z);
      ctx.lineTo(16 * z, -48 * z);
      ctx.lineTo(36 * z, -beamHeight);
      ctx.lineTo(-36 * z, -beamHeight);
      ctx.closePath();
      ctx.fill();

      // Swirling ascension rings when unlocked & waiting for decipher
      if (isAllCollected && !puzzle.isSolved) {
        const ringTime = performance.now() * 0.002;
        for (let r = 0; r < 3; r++) {
          const ringFrac = (ringTime + r * 0.33) % 1;
          const ringY = -55 * z - ringFrac * 220 * z;
          const ringRadius = (16 + ringFrac * 16) * z;
          const ringAlpha = Math.max(0, 1 - ringFrac);
          ctx.save();
          ctx.strokeStyle = `rgba(254, 240, 138, ${ringAlpha * 0.65})`;
          ctx.lineWidth = 1.5 * z;
          ctx.beginPath();
          ctx.ellipse(0, ringY, ringRadius, ringRadius * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 5. Orbiting Holographic Rune Shards (Displays gathered shards 0-4)
    const shards = puzzle.puzzleData.shards;
    const now = performance.now() * 0.002;
    shards.forEach((shard, idx) => {
      if (shard.isCollected || puzzle.isSolved) {
        const orbitAngle = now + (idx * (Math.PI * 2 / 4));
        const orbitRadiusX = 22 * z;
        const orbitRadiusY = 10 * z;
        const ox = Math.cos(orbitAngle) * orbitRadiusX;
        const oy = -30 * z + Math.sin(orbitAngle) * orbitRadiusY;

        ctx.save();
        ctx.font = `bold ${Math.floor(14 * z)}px "Cinzel", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = puzzle.isSolved ? '#6ee7b7' : '#fde047';
        ctx.shadowColor = puzzle.isSolved ? '#10b981' : '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fillText(shard.glyph, ox, oy);
        ctx.restore();
      }
    });

    // 6. Floating [E] DECODE / SYNCHRONIZE Prompt Badge
    if (isNearby) {
      const promptY = -66 * z + Math.sin(performance.now() * 0.005) * 3 * z;
      const promptText = puzzle.isSolved
        ? '✓ PROTOCOL SYNCHRONIZED'
        : (isAllCollected
          ? '⚡ [E] SYNCHRONIZE (4/4)'
          : `[E] RUNIC DECODER (${collectedCount}/4)`);
      const badgeBorder = puzzle.isSolved ? '#10b981' : (isAllCollected ? '#f59e0b' : '#38bdf8');

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = badgeBorder;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = badgeBorder;
      ctx.shadowBlur = isAllCollected ? 14 : 4;

      const badgeW = (isAllCollected ? 150 : 130) * z;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, promptY - 10 * z, badgeW, 20 * z, [4]);
      ctx.fill();
      ctx.stroke();

      ctx.font = `bold ${Math.floor(11 * z)}px Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = puzzle.isSolved ? '#10b981' : (isAllCollected ? '#fef08a' : '#38bdf8');
      ctx.shadowBlur = 0;
      ctx.fillText(promptText, 0, promptY + 4 * z);
    }

    ctx.restore();
  }

  // Draw Animated Enemies & Bosses (100% Transparent Cutouts, Real 3D Art, NO BUBBLES!)
  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const sp = this.camera.worldToScreen(enemy.x, enemy.y, 0);
    const z = this.camera.zoom;
    const isBoss = enemy.isBoss;
    const isElite = enemy.isElite;

    let bossScale = 48;
    if (isBoss) {
      if (enemy.id.includes('void_mist')) bossScale = 58;
      else if (enemy.id.includes('sampo') || enemy.id.includes('ukko')) bossScale = 54;
      else if (enemy.id.includes('turso') || enemy.id.includes('ikuturso')) bossScale = 52;
      else if (enemy.id.includes('tuoni')) bossScale = 50;
      else if (enemy.id.includes('louhi')) bossScale = 48;
      else if (enemy.id.includes('surma')) bossScale = 46;
      else if (enemy.id.includes('sotka')) bossScale = 44;
    }

    const baseSize = (isBoss ? bossScale : isElite ? 30 : 22) * z;
    const spriteSize = baseSize * 2.2;

    ctx.save();
    ctx.translate(sp.x, sp.y);

    // 1. Attack Lunge Offset
    let lungeX = 0;
    let lungeY = 0;
    if (enemy.lungeTimer > 0) {
      const lungeDist = (isBoss ? 20 : 14) * z;
      lungeX = Math.cos(enemy.angle) * lungeDist;
      lungeY = Math.sin(enemy.angle) * lungeDist * 0.5;
    }

    // 2. Flying / Walking Bob
    const isFlying = enemy.isRanged || enemy.type.includes('drone') || enemy.type.includes('turret') || enemy.type.includes('wisp') || enemy.type.includes('wraith') || enemy.type.includes('sotka');
    const hoverBob = isFlying ? Math.sin(enemy.hoverTimer) * (isBoss ? 7 : 5) * z : Math.abs(Math.sin(enemy.walkTimer)) * 3.5 * z;
    const heightOffset = -baseSize * 1.05 + hoverBob + lungeY;

    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(lungeX, 0, baseSize * 0.95, baseSize * 0.48, 0, 0, Math.PI * 2);
    ctx.fillStyle = isBoss ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fill();

    // 3. Resolve Enemy Transparent Sprite Key
    let spriteKey = 'enemy_marauder';
    if (isBoss) {
      if (enemy.id.includes('void_mist') || enemy.type.includes('void_mist')) spriteKey = 'boss_cosmic_horror';
      else if (enemy.id.includes('sotka')) spriteKey = 'boss_sotka';
      else if (enemy.id.includes('surma')) spriteKey = 'boss_surma';
      else if (enemy.id.includes('louhi')) spriteKey = 'boss_louhi';
      else if (enemy.id.includes('tuoni')) spriteKey = 'boss_tuoni';
      else if (enemy.id.includes('turso') || enemy.id.includes('ikuturso')) spriteKey = 'boss_ikuturso';
      else if (enemy.id.includes('ukko') || enemy.id.includes('sampo')) spriteKey = 'boss_ukko';
      else spriteKey = 'boss_louhi';
    } else {
      const type = enemy.type.toLowerCase();
      if (type.includes('wisp') || type.includes('spark') || type.includes('kipinä') || type.includes('glider') || type.includes('seraph') || type.includes('drone') || type.includes('turret') || type.includes('cluster') || type.includes('scout') || type.includes('sniper') || type.includes('seeker') || type.includes('skimmer') || type.includes('torpedo') || type.includes('archon')) {
        spriteKey = 'enemy_wisp';
      } else if (type.includes('hound') || type.includes('wolf') || type.includes('prowler') || type.includes('stalker') || type.includes('minion') || type.includes('tracker')) {
        spriteKey = 'enemy_hound';
      } else if (type.includes('brood') || type.includes('matriarch') || type.includes('tulipesä') || type.includes('colossus')) {
        spriteKey = 'boss_ikuturso';
      } else if (type.includes('tuoni') || type.includes('wraith') || type.includes('death') || type.includes('necro') || type.includes('skullcaster') || type.includes('shaman') || type.includes('trapper')) {
        spriteKey = 'enemy_wisp';
      } else if (type.includes('abyss') || type.includes('magma') || type.includes('tentacle') || type.includes('angler') || type.includes('cultist') || type.includes('pyro')) {
        spriteKey = 'boss_ikuturso';
      } else if (type.includes('lightning') || type.includes('celestial') || type.includes('storm') || type.includes('herald') || type.includes('smith')) {
        spriteKey = 'enemy_marauder';
      } else {
        spriteKey = 'enemy_marauder';
      }
    }

    const spriteCanvas = this.transparentSprites.get(spriteKey) || AssetLoader.getTransparent(spriteKey) || this.imageCache.get(spriteKey) || AssetLoader.getImage(spriteKey) || AssetLoader.getTransparent('enemy_marauder');

    // 4. Render Special Boss / Underworld Auras
    if (isBoss && (enemy.id.includes('void_mist') || enemy.type.includes('void_mist'))) {
      // Swirling singularity black hole accretion disk & cosmic event horizon aura beneath Surma-Musta
      const vTime = performance.now() * 0.003;

      // Accretion disk
      const voidGrad = ctx.createRadialGradient(lungeX, heightOffset * 0.3, baseSize * 0.3, lungeX, heightOffset * 0.3, baseSize * 2.2);
      voidGrad.addColorStop(0, 'rgba(15, 5, 29, 0.95)');
      voidGrad.addColorStop(0.35, 'rgba(88, 28, 135, 0.65)');
      voidGrad.addColorStop(0.7, 'rgba(225, 29, 72, 0.3)');
      voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.ellipse(lungeX, 0, baseSize * 2.2, baseSize * 1.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = voidGrad;
      ctx.fill();

      // Cosmic event horizon rotating rings
      ctx.beginPath();
      ctx.ellipse(lungeX, 0, baseSize * 1.65, baseSize * 0.82, vTime, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3.5 * z;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(lungeX, 0, baseSize * 1.35, baseSize * 0.68, -vTime * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2 * z;
      ctx.stroke();

      // Void reality-tearing tentacles
      for (let t = 0; t < 6; t++) {
        const ang = vTime * 2 + (t * Math.PI / 3);
        const tLen = baseSize * (1.35 + Math.sin(vTime * 3 + t) * 0.35);
        ctx.beginPath();
        ctx.moveTo(lungeX, heightOffset);
        ctx.quadraticCurveTo(
          lungeX + Math.cos(ang) * tLen * 0.6,
          heightOffset + Math.sin(ang) * tLen * 0.6 - 12 * z,
          lungeX + Math.cos(ang) * tLen,
          heightOffset + Math.sin(ang) * tLen
        );
        ctx.strokeStyle = t % 2 === 0 ? 'rgba(192, 132, 252, 0.85)' : 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 2.5 * z;
        ctx.stroke();
      }
    } else if (isBoss && enemy.id.includes('tuoni')) {
      // Swirling shadow vortex & ghostly Swan mist beneath Tuoni (Clean, no black wing artifacts)
      ctx.beginPath();
      ctx.ellipse(0, 0, baseSize * 1.6, baseSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.fill();

      // Outer Stygian Mist Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, baseSize * 1.2, baseSize * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
      ctx.lineWidth = 2 * z;
      ctx.stroke();
    } else if (isBoss && (enemy.id.includes('ukko') || enemy.id.includes('sampo'))) {
      // Radiant Celestial Solar Corona & Orbiting Kirjokansi Light Rings
      const uTime = performance.now() * 0.003;
      ctx.beginPath();
      ctx.ellipse(0, 0, baseSize * 1.8, baseSize * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.fill();

      // Spinning Solar Arc Halo Ring
      ctx.beginPath();
      ctx.ellipse(0, heightOffset - 18 * z, baseSize * 1.35, baseSize * 0.45, uTime * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.0 * z;
      ctx.stroke();

      // 4 Orbiting Celestial Kirjokansi Prism Shards
      for (let p = 0; p < 4; p++) {
        const pAng = uTime * 1.8 + (Math.PI / 2) * p;
        const px = Math.cos(pAng) * baseSize * 1.45;
        const py = heightOffset + Math.sin(pAng) * baseSize * 0.65;
        ctx.beginPath();
        ctx.arc(px, py, 7.0 * z, 0, Math.PI * 2);
        ctx.fillStyle = p % 2 === 0 ? '#38bdf8' : '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * z;
        ctx.stroke();
      }
    } else if (enemy.type.includes('brood') || enemy.type.includes('matriarch') || enemy.type.includes('tulipesä')) {
      // Fiery volcanic magma aura beneath Broodmother Colossus
      ctx.beginPath();
      ctx.ellipse(0, heightOffset, baseSize * 1.3, baseSize * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5 * z;
      ctx.stroke();
    } else if (enemy.type.includes('tuoni') || enemy.type.includes('wraith') || enemy.type.includes('necro')) {
      // Ghostly corpse aura for Tuonela enemies
      ctx.beginPath();
      ctx.ellipse(0, heightOffset, baseSize * 0.8, baseSize * 1.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.2 * z;
      ctx.stroke();
    }

    // 5. Render Transparent Cutout Sprite (NO BUBBLES, NO BLACK BOXES!)
    if (spriteCanvas) {
      const isFacingLeft = Math.cos(enemy.angle) < 0;
      ctx.save();
      if (isFacingLeft) {
        ctx.scale(-1, 1);
      }

      const sx = (isFacingLeft ? -lungeX : lungeX) - spriteSize / 2;
      const sy = heightOffset - spriteSize / 2;

      if (enemy.hasRuneShard && enemy.isRunAttacking) {
        // High-Speed Golden Motion Blur Afterimages during Run Attack
        for (let a = 1; a <= 2; a++) {
          const trailDist = a * 10 * z;
          const trailX = (isFacingLeft ? -lungeX : lungeX) - spriteSize / 2 - (isFacingLeft ? -1 : 1) * Math.cos(enemy.angle) * trailDist;
          const trailY = heightOffset - spriteSize / 2 - Math.sin(enemy.angle) * (trailDist * 0.5);
          ctx.save();
          ctx.globalAlpha = 0.35 / a;
          ctx.drawImage(spriteCanvas, trailX, trailY, spriteSize, spriteSize);
          ctx.restore();
        }
      }

      if (enemy.hurtFlashTimer > 0) {
        ctx.save();
        ctx.filter = 'brightness(2.6) contrast(1.3)';
        ctx.drawImage(spriteCanvas, sx, sy, spriteSize, spriteSize);
        ctx.restore();
      } else {
        ctx.drawImage(spriteCanvas, sx, sy, spriteSize, spriteSize);
      }
      ctx.restore();
    }

    // 5.5. Energy Shield Barrier Dome (Visual shield aura)
    if (enemy.isShielded || (enemy.shield && enemy.shield > 0)) {
      const shieldTime = performance.now() * 0.004;
      const shieldPulse = 1.0 + Math.sin(shieldTime) * 0.06;
      const sRadius = (baseSize * 1.15) * shieldPulse;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lungeX, heightOffset, sRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 2.0 * z;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }

    // 6. Overhead Health Bar & Shield Bar
    if (!isBoss && (enemy.health < enemy.maxHealth || enemy.shield > 0 || isElite)) {
      const barW = (isElite ? 46 : 36) * z;
      const barH = 4.5 * z;
      const barY = heightOffset - spriteSize / 2 - 6 * z;

      // Health Bar Background & Fill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(lungeX - barW / 2, barY, barW, barH);
      ctx.fillStyle = isElite ? '#f59e0b' : '#ef4444';
      ctx.fillRect(lungeX - barW / 2, barY, barW * Math.max(0, Math.min(1, enemy.health / enemy.maxHealth)), barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lungeX - barW / 2, barY, barW, barH);

      // Overhead Shield Bar (Cyan)
      if (enemy.shield > 0 && enemy.maxShield > 0) {
        const sBarH = 3.5 * z;
        const sBarY = barY - sBarH - 2 * z;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(lungeX - barW / 2, sBarY, barW, sBarH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(lungeX - barW / 2, sBarY, barW * Math.max(0, Math.min(1, enemy.shield / enemy.maxShield)), sBarH);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(lungeX - barW / 2, sBarY, barW, sBarH);
      }
    }

    // 7. Runic Cipher Carrier Overhead Aura & Floating Glyph Crown (Only for shard carriers!)
    if (enemy.hasRuneShard && enemy.runeShard && !enemy.isDead && !enemy.runeShard.isCollected) {
      const runeTime = performance.now() * 0.003;
      const runeGlyph = enemy.runeShard.glyph;
      const crownY = heightOffset - spriteSize / 2 - 16 * z + Math.sin(runeTime * 2.5) * 3 * z;


      // Pulsing gold runic orbital aura
      ctx.beginPath();
      ctx.arc(lungeX, crownY, (enemy.isRunAttacking ? 16 : 13) * z, 0, Math.PI * 2);
      ctx.fillStyle = enemy.isRunAttacking ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.25)';
      ctx.shadowColor = enemy.isRunAttacking ? '#ef4444' : '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.fill();

      ctx.strokeStyle = enemy.isRunAttacking ? '#fca5a5' : '#fef08a';
      ctx.lineWidth = 1.5 * z;
      ctx.stroke();

      // Floating Rune Glyph
      ctx.font = `bold ${Math.floor(15 * z)}px "Cinzel", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fillText(runeGlyph, lungeX, crownY);

      // Label: "🔮 RUNE-CARRIER [POS I]" or "⚡ RUN ATTACK!"
      const posLabels = ['I', 'II', 'III', 'IV'];
      ctx.font = `bold ${Math.floor(9 * z)}px "Share Tech Mono", monospace`;
      ctx.fillStyle = enemy.isRunAttacking ? '#fca5a5' : '#fde047';
      ctx.shadowBlur = 4;
      const labelText = enemy.isRunAttacking
        ? '⚡ RUSH CHARGE ⚡'
        : `🔮 RUNE CARRIER [${posLabels[enemy.runeShard.positionIndex]}]`;
      ctx.fillText(labelText, lungeX, crownY - 12 * z);
    }

    ctx.restore();
  }

  // Draw Destructible Void Gateway / Spawner Rift (Real Transparent 3D Sci-Fi Element)
  private drawGateway(ctx: CanvasRenderingContext2D, gw: VoidGateway, isVisible: boolean) {
    const sp = this.camera.worldToScreen(gw.x, gw.y, 0);
    const z = this.camera.zoom;
    const portalSprite = this.transparentSprites.get('portal_rift') || AssetLoader.getTransparent('portal_rift') || this.imageCache.get('portal_rift') || AssetLoader.getImage('portal_rift');

    ctx.save();
    ctx.translate(sp.x, sp.y);

    if (gw.isDestroyed) {
      // Shattered ground crater
      ctx.beginPath();
      ctx.ellipse(0, 0, 24 * z, 12 * z, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5 * z;
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Dynamic ground shadow
    ctx.beginPath();
    ctx.ellipse(0, 4 * z, 30 * z, 14 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();

    // Pulse scale
    const pulseScale = gw.isActive ? (1.0 + Math.sin(gw.pulseTimer * 3.0) * 0.08) : 1.0;
    const spriteSize = 74 * z * pulseScale;
    const sx = -spriteSize / 2;
    const sy = -spriteSize * 0.85;

    // Draw real transparent 3D portal element
    if (portalSprite) {
      if (gw.hurtFlashTimer > 0) {
        ctx.save();
        ctx.filter = 'brightness(2.6) contrast(1.3)';
        ctx.drawImage(portalSprite, sx, sy, spriteSize, spriteSize);
        ctx.restore();
      } else {
        ctx.drawImage(portalSprite, sx, sy, spriteSize, spriteSize);
      }
    }

    // Active Plasma Light Pulse & Aura
    if (gw.isActive) {
      const auraColor = gw.biomeId === 'tuonela' ? 'rgba(34, 211, 238, 0.45)' : (gw.biomeId === 'alinen' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)');
      ctx.beginPath();
      ctx.ellipse(0, -spriteSize * 0.45, 26 * z * pulseScale, 26 * z * pulseScale, 0, 0, Math.PI * 2);
      ctx.fillStyle = auraColor;
      ctx.fill();
    }

    // Clean Health Bar (only shown when damaged / active)
    if (gw.isActive || gw.health < gw.maxHealth) {
      const hpBarW = 64 * z;
      const hpBarH = 5 * z;
      const hpY = sy - 6 * z;

      // HP Bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(-hpBarW / 2, hpY, hpBarW, hpBarH);

      // HP Bar fill
      const hpPct = Math.max(0, gw.health / gw.maxHealth);
      ctx.fillStyle = hpPct > 0.4 ? '#ef4444' : '#f59e0b';
      ctx.fillRect(-hpBarW / 2, hpY, hpBarW * hpPct, hpBarH);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-hpBarW / 2, hpY, hpBarW, hpBarH);
    }

    ctx.restore();
  }

  // Draw Grand Kalevala Sampo-Portti (The Great Astral Gateway of Ascension)
  private drawEscapePortal(
    ctx: CanvasRenderingContext2D,
    portal: { x: number; y: number },
    remainingTime: number,
    extractionState?: any
  ) {
    const sp = this.camera.worldToScreen(portal.x, portal.y, 0);
    const z = this.camera.zoom;
    let now = performance.now() * 0.0025;

    let portalScale = 1.0;
    let portalAlpha = 1.0;

    if (extractionState && extractionState.active) {
      if (extractionState.phase === 'teleporting_hero' || extractionState.phase === 'hero_vanished') {
        // Accelerate vortex spin and intensify radiance while hero ascends & while portal lingers
        now = performance.now() * 0.0065;
      } else if (extractionState.phase === 'portal_closing') {
        const closeStart = extractionState.heroTeleportDuration + extractionState.portalCloseDelay;
        const closeT = (extractionState.timer - closeStart) / extractionState.portalClosingDuration;
        const p = Math.max(0, Math.min(1.0, closeT));
        portalScale = Math.max(0, 1.0 - p);
        portalAlpha = Math.max(0, 1.0 - Math.pow(p, 1.5));
      } else if (extractionState.phase === 'completed') {
        return;
      }
    }

    if (portalScale <= 0.001 || portalAlpha <= 0.001) return;

    const pulseScale = (1.0 + Math.sin(now * 3.5) * 0.06) * portalScale;

    ctx.save();
    ctx.translate(sp.x, sp.y);
    if (portalScale !== 1.0) {
      ctx.scale(portalScale, portalScale);
    }
    if (portalAlpha !== 1.0) {
      ctx.globalAlpha = portalAlpha;
    }

    // 1. Deep Ground Shadow & Octagonal Runic Dais
    ctx.beginPath();
    ctx.ellipse(0, 4 * z, 44 * z, 22 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();

    // Stepped Octagonal Dais Base
    ctx.beginPath();
    ctx.ellipse(0, 0, 38 * z, 19 * z, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a101d';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2 * z;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 14;
    ctx.stroke();

    // Ground Inscribed Radiant Runic Spokes
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#38bdf8';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.5 * z;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + now * 0.2;
      const gx = Math.cos(angle) * 32 * z;
      const gy = Math.sin(angle) * 16 * z;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gx, gy);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Ascending Celestial Aurora Light Column
    const beamW = 34 * z + Math.sin(now * 4) * 6 * z;
    const beamGrad = ctx.createLinearGradient(0, 0, 0, -220 * z);
    beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    beamGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.35)');
    beamGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.20)');
    beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-beamW * 0.6, 0);
    ctx.lineTo(beamW * 0.6, 0);
    ctx.lineTo(beamW * 1.8, -220 * z);
    ctx.lineTo(-beamW * 1.8, -220 * z);
    ctx.closePath();
    ctx.fill();

    // 3. Swirling Kirjokansi Astral Vortex Core (The Celestial Mill of Sampo)
    const vortexY = -48 * z;
    const vortexRadius = 30 * z * pulseScale;

    // Background Void Glow
    const voidGrad = ctx.createRadialGradient(0, vortexY, 0, 0, vortexY, vortexRadius * 1.4);
    voidGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    voidGrad.addColorStop(0.25, 'rgba(56, 189, 248, 0.85)');
    voidGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.45)');
    voidGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
    ctx.fillStyle = voidGrad;
    ctx.beginPath();
    ctx.arc(0, vortexY, vortexRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Swirling Spiral Arms (The Grinding Millstones of Creation)
    ctx.save();
    ctx.translate(0, vortexY);
    ctx.rotate(now * 2.2);
    for (let arm = 0; arm < 4; arm++) {
      const armAngle = (arm * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let step = 0; step < 12; step++) {
        const rad = (step / 12) * vortexRadius;
        const theta = armAngle + (step * 0.35);
        ctx.lineTo(Math.cos(theta) * rad, Math.sin(theta) * rad);
      }
      ctx.strokeStyle = arm % 2 === 0 ? 'rgba(254, 240, 138, 0.8)' : 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2.5 * z;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Orbiting Celestial Kalevala Magic Symbols Ring
    const runes = ['⌘', '⚡', '☼', '☽', '★', '᯽', '✦', '۞'];
    ctx.save();
    ctx.translate(0, vortexY);
    ctx.font = `bold ${Math.floor(13 * z)}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runeOrbitR = 34 * z;

    runes.forEach((glyph, idx) => {
      const rAngle = -now * 1.2 + (idx * (Math.PI * 2 / runes.length));
      const rx = Math.cos(rAngle) * runeOrbitR;
      const ry = Math.sin(rAngle) * (runeOrbitR * 0.65); // Angled perspective ellipse

      ctx.fillStyle = idx % 2 === 0 ? '#fde047' : '#67e8f9';
      ctx.shadowColor = idx % 2 === 0 ? '#f59e0b' : '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillText(glyph, rx, ry);
    });
    ctx.restore();

    // 5. Twin Monolithic Kalevala Stone Pillars (Ilmarisen Takomat Paadet)
    const pillarW = 12 * z;
    const pillarH = 92 * z;
    const pillarDist = 32 * z;

    const drawPillar = (px: number, isRight: boolean) => {
      ctx.save();
      // Pillar Body
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px - pillarW / 2, -pillarH, pillarW, pillarH);

      // Pillar Outer Border & Carved Bevel
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8 * z;
      ctx.strokeRect(px - pillarW / 2, -pillarH, pillarW, pillarH);

      // Carved Glowing Runic Channel Down Spine
      ctx.beginPath();
      ctx.moveTo(px, -pillarH + 6 * z);
      ctx.lineTo(px, -6 * z);
      ctx.strokeStyle = isRight ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2 * z;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Carved Magic Glyphs on Pillar Face
      const pillarRunes = isRight ? ['⌘', '⚡', '۞', '★'] : ['☼', '☽', '᯽', '✦'];
      ctx.font = `bold ${Math.floor(10 * z)}px "Cinzel", Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isRight ? '#93c5fd' : '#fde047';
      pillarRunes.forEach((r, rIdx) => {
        const ry = -pillarH + (rIdx + 1) * 18 * z;
        ctx.fillText(r, px, ry);
      });

      // Copper / Gold Pillar Cap & Base Trim
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(px - (pillarW * 1.3) / 2, -pillarH - 4 * z, pillarW * 1.3, 5 * z);
      ctx.fillRect(px - (pillarW * 1.3) / 2, -5 * z, pillarW * 1.3, 5 * z);

      ctx.restore();
    };

    drawPillar(-pillarDist, false);
    drawPillar(pillarDist, true);

    // 6. Grand Kirjokansi Arched Lintel & Apex Crown (The Many-Colored Lid Arch)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-pillarDist - pillarW / 2, -pillarH);
    ctx.quadraticCurveTo(0, -pillarH - 32 * z, pillarDist + pillarW / 2, -pillarH);
    ctx.lineTo(pillarDist + pillarW / 2, -pillarH + 8 * z);
    ctx.quadraticCurveTo(0, -pillarH - 24 * z, -pillarDist - pillarW / 2, -pillarH + 8 * z);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2 * z;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Apex Keystone Sampo Millstone Emblem (Triskele Sun Wheel)
    const crownY = -pillarH - 24 * z;
    ctx.beginPath();
    ctx.arc(0, crownY, 12 * z, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 16;
    ctx.fill();

    // Rotating Sun Wheel Rays
    ctx.save();
    ctx.translate(0, crownY);
    ctx.rotate(now * 1.5);
    for (let r = 0; r < 6; r++) {
      const rayAngle = (r * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(rayAngle) * 9 * z, Math.sin(rayAngle) * 9 * z);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * z;
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    // 7. Ascending Golden Stardust Embers
    ctx.save();
    for (let e = 0; e < 9; e++) {
      const eSeed = e * 1.73;
      const eT = (now * 1.4 + eSeed) % 3.0; // 0 to 3s cycle
      const ey = 0 - (eT / 3.0) * 110 * z;
      const ex = Math.sin(now * 2 + eSeed) * (18 * z) * (1 - eT / 3.0);
      const eAlpha = Math.sin((eT / 3.0) * Math.PI);

      ctx.beginPath();
      ctx.arc(ex, ey, (1.8 + (e % 3) * 0.6) * z, 0, Math.PI * 2);
      ctx.fillStyle = e % 2 === 0 ? `rgba(254, 240, 138, ${eAlpha})` : `rgba(56, 189, 248, ${eAlpha})`;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();

    // 8. Floating Mythological Extraction HUD Banner
    const badgeY = -pillarH - 46 * z;
    const badgeW = 190 * z;
    const badgeH = 32 * z;

    ctx.save();
    // Glassmorphism Banner Container
    ctx.fillStyle = 'rgba(8, 14, 26, 0.94)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5 * z;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-badgeW / 2, badgeY, badgeW, badgeH, 6 * z);
    ctx.fill();
    ctx.stroke();

    // Top Title
    ctx.font = `bold ${Math.floor(10.5 * z)}px "Cinzel", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;
    ctx.fillText(`✦ SAMPO-PORTTI // ASTRAL GATEWAY ✦`, 0, badgeY + 11 * z);

    // Extraction Timer & Instruction
    ctx.font = `bold ${Math.floor(9 * z)}px "Share Tech Mono", monospace`;
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    let instructionText = `⚡ EXTRACTION: ${remainingTime.toFixed(1)}s • STEP INSIDE TO CONQUER`;
    if (extractionState && extractionState.active) {
      if (extractionState.phase === 'teleporting_hero') {
        instructionText = `✨ VESSEL ASCENDING // DEMATERIALIZING...`;
      } else if (extractionState.phase === 'hero_vanished') {
        instructionText = `★ EXTRACTION COMPLETE // CLOSING GATEWAY ★`;
      } else {
        instructionText = `✦ DIMENSIONAL JUMP SECURED ✦`;
      }
    }
    ctx.fillText(instructionText, 0, badgeY + 23 * z);
    ctx.restore();

    ctx.restore();
  }
}
