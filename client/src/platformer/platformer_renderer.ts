// Master 2D Side-Scroller Renderer with Colossal R-Type Boss, Chroma-Key Sprites, Solid Runic Tiles, Aim Reticle & Zero Square Outlines

import { PlatformerCamera } from './platformer_camera';
import { PlatformTileType, PlatformerLevel, PlatformerChest, PlatformerShrine, PlatformerPortal } from './platformer_types';
import { PlatformerPlayerController } from './platformer_player';
import { PlatformerEnemy } from './platformer_enemy';
import { ColossalRTypeBoss, BossSubTarget } from './platformer_boss';
import { ProjectileManager } from '../entities/projectile';
import { ParticleSystem } from '../engine/particles';
import { CombatEngine } from '../systems/combat';
import { HeroRenderer } from '../engine/hero_renderer';
import { AssetLoader } from '../engine/asset_loader';
import { inputManager } from '../engine/input';

export class PlatformerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  public camera: PlatformerCamera;

  private bgSkyImage: HTMLImageElement | null = null;
  private bgMidImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement, lightCanvas: HTMLCanvasElement, camera: PlatformerCamera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.lightCanvas = lightCanvas;
    this.lightCtx = lightCanvas.getContext('2d')!;
    this.camera = camera;

    this.loadBackgrounds('tuonela_chasm');
  }

  loadBackgrounds(themeId: string) {
    const bgMap: Record<string, { sky: string; mid: string }> = {
      tuonela_chasm: { sky: './assets/carousel_tuonela.jpg', mid: './assets/gallen_tuonela.jpg' },
      vainola_canopy: { sky: './assets/carousel_vainola.jpg', mid: './assets/gallen_vainola.jpg' },
      pohjola_vault: { sky: './assets/carousel_pohjola.jpg', mid: './assets/gallen_pohjola.jpg' },
      alinen_trench: { sky: './assets/carousel_alinen.jpg', mid: './assets/carousel_alinen.jpg' }
    };

    const config = bgMap[themeId] || bgMap.tuonela_chasm;

    const sky = new Image();
    sky.src = config.sky;
    sky.onload = () => { this.bgSkyImage = sky; };

    const mid = new Image();
    mid.src = config.mid;
    mid.onload = () => { this.bgMidImage = mid; };
  }

  render(
    level: PlatformerLevel,
    playerCtrl: PlatformerPlayerController,
    enemies: PlatformerEnemy[],
    colossalBoss: ColossalRTypeBoss | null,
    chests: PlatformerChest[],
    shrines: PlatformerShrine[],
    exitPortal: PlatformerPortal,
    projectiles: ProjectileManager,
    particles: ParticleSystem,
    combat: CombatEngine,
    isDefeated: boolean = false,
    hordeWallX: number | null = null
  ) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const cam = this.camera;
    cam.handleResize(w, h);

    // 1. Clear Main & Light Canvases
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, w, h);

    this.lightCtx.clearRect(0, 0, w, h);
    this.lightCtx.fillStyle = 'rgba(8, 6, 14, 0.65)';
    this.lightCtx.fillRect(0, 0, w, h);

    // 2. Render Multi-Layer Parallax Backgrounds
    this.renderParallax(level);

    // 3. Render Level Platform Tilemap
    this.renderTilemap(level);

    // 4. Render Interactive Shrines & Chests
    this.renderInteractiveObjects(shrines, chests, exitPortal);

    // 4.5 Render Lingering Blood & Scorch Decals
    this.renderDecals(particles);

    // 5. Render Standard Enemies
    this.renderEnemies(enemies);

    // 6. Render Colossal R-Type Boss
    if (colossalBoss && !colossalBoss.isDead) {
      this.renderColossalBoss(colossalBoss);
    }

    // 7. Render Player Hero
    if (!playerCtrl.player.isDead) {
      this.renderPlayer(playerCtrl);
    }

    // 7.5 Render Surging Horde Death Wall
    if (hordeWallX !== null) {
      this.renderHordeSurgeWall(hordeWallX);
    }

    // 8. Render Projectiles
    this.renderProjectiles(projectiles);

    // 9. Render Particles & Floating Combat Text
    this.renderFX(particles, combat);

    // 10. Composite Lighting Canvas Overlay
    this.compositeLighting();

    // 11. Render Aim Crosshair
    this.renderCrosshair();

    // 12. Render Defeat / Respawn Overlay
    if (isDefeated) {
      this.renderDefeatOverlay();
    }
  }

  private renderParallax(level: PlatformerLevel) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Layer 1: Far Sky
    if (this.bgSkyImage && this.bgSkyImage.complete) {
      const par1 = this.camera.getParallaxOffset(0.08);
      const imgW = w * 1.35;
      const imgH = h * 1.2;
      const modX = (((par1.offsetX % imgW) + imgW) % imgW) - imgW;
      const posY = par1.offsetY - (imgH * 0.1);

      ctx.save();
      ctx.globalAlpha = 0.58;
      ctx.drawImage(this.bgSkyImage, modX, posY, imgW, imgH);
      ctx.drawImage(this.bgSkyImage, modX + imgW, posY, imgW, imgH);
      ctx.drawImage(this.bgSkyImage, modX + imgW * 2, posY, imgW, imgH);
      ctx.restore();
    }

    // Layer 2: Midground Pines & Mountain Silhouettes
    if (this.bgMidImage && this.bgMidImage.complete) {
      const par2 = this.camera.getParallaxOffset(0.22);
      const imgW = w * 1.25;
      const imgH = h * 0.9;
      const modX = (((par2.offsetX % imgW) + imgW) % imgW) - imgW;
      const posY = h - imgH + par2.offsetY * 0.5;

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(this.bgMidImage, modX, posY, imgW, imgH);
      ctx.drawImage(this.bgMidImage, modX + imgW, posY, imgW, imgH);
      ctx.drawImage(this.bgMidImage, modX + imgW * 2, posY, imgW, imgH);
      ctx.restore();
    }

    // Layer 3: Dark Vignette Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(4, 2, 8, 0.35)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.0)');
    grad.addColorStop(1, 'rgba(2, 1, 5, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private renderTilemap(level: PlatformerLevel) {
    const ctx = this.ctx;
    const cam = this.camera;
    const ts = cam.tileSize * cam.zoom;
    const bounds = cam.getVisibleTileBounds(level.width, level.height, 2);

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const type = level.tiles[ty][tx];
        if (type === PlatformTileType.AIR) continue;

        const screenPos = cam.worldToScreen(tx, ty);
        const px = screenPos.x;
        const py = screenPos.y;

        if (type === PlatformTileType.SOLID_GROUND) {
          this.drawSolidGroundTile(ctx, px, py, ts, tx, ty, level);
        } else if (type === PlatformTileType.BOUNCE_PAD) {
          this.drawBouncePadTile(ctx, px, py, ts);
        }
      }
    }
  }

  private drawSolidGroundTile(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number, tx: number, ty: number, level: PlatformerLevel) {
    const isTopEdge = ty === 0 || level.tiles[ty - 1][tx] !== PlatformTileType.SOLID_GROUND;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px, py, ts + 0.5, ts + 0.5);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);

    if (isTopEdge) {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(px, py, ts + 0.5, 4 * this.camera.zoom);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px + 2, py, ts - 4, 2 * this.camera.zoom);

      this.addPointLight(px + ts * 0.5, py + 2, 40, 'rgba(56, 189, 248, 0.3)');
    }
  }

  private drawBouncePadTile(ctx: CanvasRenderingContext2D, px: number, py: number, ts: number) {
    const ph = 12 * this.camera.zoom;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px, py + ts - ph, ts, ph);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(px + 4, py + ts - ph + 2, ts - 8, ph - 4);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px + ts * 0.5, py + ts - ph - 8);
    ctx.lineTo(px + ts * 0.25, py + ts - ph);
    ctx.lineTo(px + ts * 0.75, py + ts - ph);
    ctx.closePath();
    ctx.fill();

    this.addPointLight(px + ts * 0.5, py + ts - ph, 65, 'rgba(250, 204, 21, 0.55)');
  }

  private renderInteractiveObjects(shrines: PlatformerShrine[], chests: PlatformerChest[], exitPortal: PlatformerPortal) {
    const ctx = this.ctx;
    const cam = this.camera;

    // 1. Shrines
    shrines.forEach(sh => {
      const pos = cam.worldToScreen(sh.x, sh.y);
      const sw = 36 * cam.zoom;
      const shH = 54 * cam.zoom;

      ctx.fillStyle = sh.isActivated ? '#334155' : '#0284c7';
      ctx.fillRect(pos.x - sw * 0.5, pos.y - shH * 0.5, sw, shH);

      ctx.strokeStyle = sh.isActivated ? '#64748b' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x - sw * 0.5, pos.y - shH * 0.5, sw, shH);

      ctx.fillStyle = sh.isActivated ? '#94a3b8' : '#ffffff';
      ctx.font = `bold ${14 * cam.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ᛋ', pos.x, pos.y + 4);

      if (!sh.isActivated) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${11 * cam.zoom}px sans-serif`;
        ctx.fillText('[E] ACTIVATE', pos.x, pos.y - shH * 0.6);
        this.addPointLight(pos.x, pos.y, 65, 'rgba(56, 189, 248, 0.4)');
      }
    });

    // 2. Chests
    chests.forEach(c => {
      const pos = cam.worldToScreen(c.x, c.y);
      const sprite = AssetLoader.getChestSprite('common', c.isOpen);
      const cw = 34 * cam.zoom;
      const ch = 34 * cam.zoom;

      if (sprite) {
        ctx.drawImage(sprite, pos.x - cw * 0.5, pos.y - ch * 0.5, cw, ch);
      } else {
        ctx.fillStyle = c.isOpen ? '#475569' : '#d97706';
        ctx.fillRect(pos.x - cw * 0.5, pos.y - ch * 0.5, cw, ch);
        ctx.strokeStyle = c.isOpen ? '#94a3b8' : '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - cw * 0.5, pos.y - ch * 0.5, cw, ch);
      }

      if (!c.isOpen) {
        ctx.fillStyle = '#fef08a';
        ctx.font = `bold ${10 * cam.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('[E] OPEN', pos.x, pos.y - ch * 0.6);
        this.addPointLight(pos.x, pos.y, 50, 'rgba(251, 191, 36, 0.35)');
      }
    });


    // 3. Exit Extraction Portal
    const portalPos = cam.worldToScreen(exitPortal.x, exitPortal.y);
    const pw = 48 * cam.zoom;
    const ph = 72 * cam.zoom;

    ctx.save();
    ctx.translate(portalPos.x, portalPos.y);

    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, pw);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, exitPortal.isActive ? '#38bdf8' : '#475569');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, pw * 0.8, ph * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (exitPortal.isActive) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${12 * cam.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('★ TRANSCEND REALM [E] ★', portalPos.x, portalPos.y - ph * 0.65);
      this.addPointLight(portalPos.x, portalPos.y, 110, 'rgba(56, 189, 248, 0.6)');
    }
  }

  private renderHordeSurgeWall(hordeWallX: number) {
    const ctx = this.ctx;
    const cam = this.camera;
    const screenX = cam.worldToScreen(hordeWallX, 0).x;
    const h = this.canvas.height;
    const w = this.canvas.width;

    ctx.save();

    // 1. Dark Apocalyptic Red/Void Fog covering everything to the left of the surging wall
    if (screenX > 0) {
      const fogGrad = ctx.createLinearGradient(Math.max(0, screenX - 280), 0, screenX, 0);
      fogGrad.addColorStop(0, 'rgba(15, 3, 10, 0.95)');
      fogGrad.addColorStop(0.7, 'rgba(153, 27, 27, 0.85)');
      fogGrad.addColorStop(1, 'rgba(239, 68, 68, 0.95)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, screenX, h);
    }

    // 2. Towering Spacetime Fracture Wall Line (dual stroke for glow without shadowBlur overhead)
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
    ctx.lineWidth = 10 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, h);
    ctx.stroke();

    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 3.5 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, h);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Secondary jagged lightning crack along the wall
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    for (let y = 0; y < h; y += 25) {
      ctx.lineTo(screenX + (Math.random() - 0.5) * 16, y);
    }
    ctx.lineTo(screenX, h);
    ctx.stroke();

    // 3. Flashing Emergency Evacuation Header Banner
    const bannerY = 32;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(w * 0.5 - 280, bannerY - 20, 560, 42);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.5 - 280, bannerY - 20, 560, 42);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🚨 CRITICAL COLLAPSE: UNSTOPPABLE VOID SWARM SURGING! 🚨', w * 0.5, bannerY);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SPRINT RIGHT & ENTER DIMENSIONAL EXTRACTION PORTAL [E]', w * 0.5, bannerY + 16);

    ctx.restore();

    this.addPointLight(screenX, h * 0.5, 300, 'rgba(239, 68, 68, 0.7)');
  }

  // Render Standard Enemies (With Zero Square Outlines / Clean Mask Flash)
  private renderEnemies(enemies: PlatformerEnemy[]) {
    const ctx = this.ctx;
    const cam = this.camera;

    enemies.forEach(e => {
      if (e.isDead) return;

      const pos = cam.worldToScreen(e.x, e.y);
      const ew = e.width * cam.tileSize * cam.zoom;
      const eh = e.height * cam.tileSize * cam.zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (e.facingDir < 0) {
        ctx.scale(-1, 1);
      }

      let sprite: HTMLCanvasElement | HTMLImageElement | null = null;
      if (e.type === 'hound') {
        sprite = AssetLoader.getTransparent('enemy_hound') || AssetLoader.getImage('enemy_hound');
      } else if (e.type === 'wisp') {
        sprite = AssetLoader.getTransparent('enemy_wisp') || AssetLoader.getImage('enemy_wisp');
      } else if (e.type === 'seeker') {
        sprite = AssetLoader.getTransparent('enemy_wisp') || AssetLoader.getImage('enemy_wisp') || AssetLoader.getTransparent('boss_tuoni') || AssetLoader.getImage('boss_tuoni');
      } else if (e.type === 'broodmother') {
        sprite = AssetLoader.getTransparent('boss_ikuturso') || AssetLoader.getImage('boss_ikuturso') || AssetLoader.getTransparent('enemy_marauder');
      } else {
        sprite = AssetLoader.getTransparent('enemy_marauder') || AssetLoader.getImage('enemy_marauder');
      }

      if (!sprite) {
        sprite = AssetLoader.getImage('enemy_marauder') || AssetLoader.getImage('enemy_hound') || AssetLoader.getImage('enemy_wisp');
      }

      if (sprite) {
        if (e.hurtFlashTimer > 0) {
          ctx.save();
          ctx.filter = 'brightness(2.2) contrast(1.2)';
          ctx.drawImage(sprite, -ew * 0.5, -eh * 0.5, ew, eh);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, -ew * 0.5, -eh * 0.5, ew, eh);
        }
      }

      ctx.restore();

      // Clean slim health bar
      const barW = ew * 0.85;
      const barH = 4 * cam.zoom;
      const barY = pos.y - eh * 0.6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(pos.x - barW * 0.5, barY, barW, barH);
      ctx.fillStyle = e.color;
      ctx.fillRect(pos.x - barW * 0.5, barY, barW * (e.health / e.maxHealth), barH);

      const lightColor = e.type === 'broodmother' ? 'rgba(249, 115, 22, 0.55)' : (e.type === 'seeker' ? 'rgba(192, 132, 252, 0.4)' : (e.type === 'wisp' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.2)'));
      this.addPointLight(pos.x, pos.y, e.type === 'broodmother' ? 85 : (e.type === 'seeker' ? 60 : 45), lightColor);
    });
  }

  // Render Colossal Cosmic Horror Living Wall of Flesh, Blisters, Gaping Maws, Fangs & Tracking Eyes
  private renderColossalBoss(boss: ColossalRTypeBoss) {
    const ctx = this.ctx;
    const cam = this.camera;
    const ts = cam.tileSize * cam.zoom;

    const rootPos = cam.worldToScreen(boss.anchorX, boss.anchorY);

    const bw = boss.width * ts;
    const bh = boss.height * ts;

    // 1. Render Generated Full-Screen Cosmic Horror Artwork
    const sprite = AssetLoader.getTransparent('boss_cosmic_horror');
    const breathScale = 1.0 + Math.sin(boss.pulseTimer * 2.0) * 0.018;
    const dw = bw * breathScale;
    const dh = bh * breathScale;
    const spriteX = rootPos.x - dw * 0.75;
    const spriteY = rootPos.y - dh * 0.5;

    ctx.save();
    if (sprite) {
      ctx.drawImage(sprite, spriteX, spriteY, dw, dh);
    } else {
      // Fallback fleshy backdrop
      ctx.fillStyle = '#2e0a26';
      ctx.fillRect(spriteX, spriteY, dw, dh);
    }
    ctx.restore();

    // 2. Render Real-Time Glow & Dynamic Light Overlays on the Exposed Heart Core
    const heartTarget = boss.targets.find(t => t.type === 'exposed_heart');
    if (heartTarget && !heartTarget.isDestroyed) {
      const heartPos = cam.worldToScreen(boss.anchorX + heartTarget.relX, boss.anchorY + heartTarget.relY);
      this.addPointLight(heartPos.x, heartPos.y, 170, boss.heartOpen ? 'rgba(250, 204, 21, 0.75)' : 'rgba(220, 38, 38, 0.55)');

      // Pulsing Heart Reticle
      ctx.save();
      ctx.strokeStyle = boss.heartOpen ? '#facc15' : '#ef4444';
      ctx.lineWidth = 2.5 * cam.zoom;
      ctx.beginPath();
      ctx.arc(heartPos.x, heartPos.y, (18 + Math.sin(boss.pulseTimer * 3.0) * 4) * cam.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render Destructible Organ Target Reticles, Health Bars & Hit Markers
    boss.targets.forEach(t => {
      const pos = cam.worldToScreen(boss.anchorX + t.relX, boss.anchorY + t.relY);
      const tw = t.width * ts;
      const th = t.height * ts;

      if (t.isDestroyed) {
        this.renderDestroyedBossPart(pos, t, ts, boss.pulseTimer);
        return;
      }

      this.addPointLight(pos.x, pos.y, 80, t.color);

      // High-Visibility Arcade Target Reticle & Brackets
      const rSize = (16 + Math.sin(boss.pulseTimer * 3.0 + t.relY) * 3) * cam.zoom;
      const bLen = 6 * cam.zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2 * cam.zoom;

      // 4 Target Corner Brackets
      // Top-Left
      ctx.beginPath(); ctx.moveTo(-rSize, -rSize + bLen); ctx.lineTo(-rSize, -rSize); ctx.lineTo(-rSize + bLen, -rSize); ctx.stroke();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(rSize - bLen, -rSize); ctx.lineTo(rSize, -rSize); ctx.lineTo(rSize, -rSize + bLen); ctx.stroke();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(-rSize, rSize - bLen); ctx.lineTo(-rSize, rSize); ctx.lineTo(-rSize + bLen, rSize); ctx.stroke();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(rSize - bLen, rSize); ctx.lineTo(rSize, rSize); ctx.lineTo(rSize, rSize - bLen); ctx.stroke();

      // Glowing Center Weakpoint Node
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(0, 0, 4 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();

      // Special Callout for Exposed Heart Core (Shielded until all 4 peripheral organs severed!)
      if (t.type === 'exposed_heart') {
        const remainingOrgans = boss.getRemainingOrgansCount();
        const isShielded = remainingOrgans > 0;

        if (isShielded) {
          // Impenetrable Eldritch Bone Barrier & Forcefield (dual stroke for glow)
          const barrierRad = (26 + Math.sin(boss.pulseTimer * 3.0) * 3) * cam.zoom;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 6.0 * cam.zoom;
          ctx.beginPath();
          ctx.arc(0, 0, barrierRad, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.0 * cam.zoom;
          ctx.beginPath();
          ctx.arc(0, 0, barrierRad, 0, Math.PI * 2);
          ctx.stroke();

          // 6 Rotating Eldritch Bone Nodes
          for (let b = 0; b < 6; b++) {
            const bAng = (b * Math.PI / 3) + boss.pulseTimer * 1.5;
            const bx = Math.cos(bAng) * barrierRad;
            const by = Math.sin(bAng) * barrierRad;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx, by, 3.5 * cam.zoom, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${10 * cam.zoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(`🔒 SHIELDED [${remainingOrgans} Organs Left]`, 0, -rSize - 12 * cam.zoom);
        } else {
          // Vulnerable Heart Core (dual stroke for glow)
          const pulseCore = (22 + Math.sin(boss.pulseTimer * 5.0) * 5) * cam.zoom;
          const outerGlowColor = boss.heartOpen ? 'rgba(250, 204, 21, 0.45)' : 'rgba(239, 68, 68, 0.45)';
          ctx.strokeStyle = outerGlowColor;
          ctx.lineWidth = 7.0 * cam.zoom;
          ctx.beginPath();
          ctx.arc(0, 0, pulseCore, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = boss.heartOpen ? '#facc15' : '#ef4444';
          ctx.lineWidth = 2.5 * cam.zoom;
          ctx.beginPath();
          ctx.arc(0, 0, pulseCore, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = boss.heartOpen ? '#fde047' : '#f87171';
          ctx.font = `bold ${10 * cam.zoom}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('⚡ WEAKPOINT VULNERABLE [2.5X] ⚡', 0, -rSize - 12 * cam.zoom);
        }
      }

      // Localized Small Hit Flash on the exact struck organ (NEVER full sprite!)
      if (t.hurtFlashTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Sub-Target Mini Health Bar
      const barW = tw * 0.75;
      const barH = 5 * cam.zoom;
      const barY = pos.y - th * 0.45;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(pos.x - barW * 0.5, barY, barW, barH);
      ctx.fillStyle = t.type === 'exposed_heart' && boss.getRemainingOrgansCount() > 0 ? '#0284c7' : t.color;
      ctx.fillRect(pos.x - barW * 0.5, barY, barW * (t.health / t.maxHealth), barH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(pos.x - barW * 0.5, barY, barW, barH);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${9 * cam.zoom}px monospace`;
      ctx.textAlign = 'center';
      if (t.type === 'exposed_heart' && boss.getRemainingOrgansCount() > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`🛡️ HEART CORE: SEVER 4 ORGANS FIRST (${boss.getRemainingOrgansCount()} Left)`, pos.x, barY - 4);
      } else {
        ctx.fillText(`🎯 ${t.name.toUpperCase()}`, pos.x, barY - 4);
      }
    });

    // 4. Render 4 Orbiting Parasitic Eyeball Minions with Trailing Optic Nerves
    boss.drones.forEach(d => {
      if (d.isDestroyed) return;

      const droneWorldX = boss.anchorX - 2.0 + Math.cos(d.angle) * d.radius;
      const droneWorldY = boss.anchorY + Math.sin(d.angle) * (d.radius * 0.75);
      const pos = cam.worldToScreen(droneWorldX, droneWorldY);
      const dr = 14 * cam.zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Trailing Optic Nerve Cord
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dr * 1.2, -dr * 0.8, dr * 2.2, -dr * 0.4);
      ctx.stroke();

      // Bloodshot Sclera
      ctx.fillStyle = '#fef2f2';
      ctx.beginPath();
      ctx.arc(0, 0, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 1.5 * cam.zoom;
      ctx.stroke();

      // Pupil staring at player
      const pdx = boss.playerLookX - droneWorldX;
      const pdy = boss.playerLookY - droneWorldY;
      const pAngle = Math.atan2(pdy, pdx);
      const pOffset = dr * 0.35;

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(Math.cos(pAngle) * pOffset, Math.sin(pAngle) * pOffset, dr * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(Math.cos(pAngle) * pOffset, Math.sin(pAngle) * pOffset, dr * 0.25, 0, Math.PI * 2);
      ctx.fill();

      if (d.hurtFlashTimer > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.restore();

      this.addPointLight(pos.x, pos.y, 60, 'rgba(220, 38, 38, 0.5)');
    });
  }

  // Realistic Severed / Destroyed Flesh & Bone Gore Graphic for Defeated Boss Organs
  private renderDestroyedBossPart(
    pos: { x: number; y: number },
    t: BossSubTarget,
    ts: number,
    pulseTimer: number
  ) {
    const ctx = this.ctx;
    const cam = this.camera;
    const tw = t.width * ts;
    const th = t.height * ts;
    const rx = tw * 0.46;
    const ry = th * 0.42;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // 1. Render Generated 16-Bit Cosmic Horror Damaged Flesh / Severed Organ Asset
    const goreSprite = AssetLoader.getImage('boss_severed_gore') || AssetLoader.getTransparent('boss_severed_gore');
    if (goreSprite) {
      const breath = 1.0 + Math.sin(pulseTimer * 2.2 + t.relY) * 0.03;
      const gw = rx * 2.4 * breath;
      const gh = ry * 2.4 * breath;
      ctx.drawImage(goreSprite, -gw * 0.5, -gh * 0.5, gw, gh);
    } else {
      // 1. Necrotic Deep Black Wound Base Crater with Jagged Ragged Edges
      ctx.fillStyle = '#0a0307';
      ctx.beginPath();
      const points = 16;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const seed = Math.sin(angle * 5 + t.relY * 3);
        const r = 1.0 + seed * 0.18;
        const px = Math.cos(angle) * (rx * r);
        const py = Math.sin(angle) * (ry * r);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // 2. Ruptured Fleshy Rim (Layered bruised crimson, dark purple, and necrotic gore)
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 5 * cam.zoom;
      ctx.stroke();

      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2.5 * cam.zoom;
      ctx.stroke();

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.0 * cam.zoom;
      ctx.stroke();
    }

    // 3. Exposed Broken Ribs / Splintered Bone Spikes Protruding from the Wound
    const ribCount = 6;
    for (let i = 0; i < ribCount; i++) {
      const angle = ((i + 0.5) / ribCount) * Math.PI * 2;
      const boneLen = (12 + (i % 3) * 6) * cam.zoom;
      const bx1 = Math.cos(angle) * (rx * 0.65);
      const by1 = Math.sin(angle) * (ry * 0.65);
      const bx2 = bx1 + Math.cos(angle + 0.3) * boneLen;
      const by2 = by1 + Math.sin(angle + 0.3) * boneLen;

      // Ivory bone base
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3.2 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.stroke();

      // Blood-dipped bone root
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 3.2 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx1 + (bx2 - bx1) * 0.45, by1 + (by2 - by1) * 0.45);
      ctx.stroke();

      // Sharp white highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.0 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
    }

    // 4. Stretched Bloody Sinews & Tendon Webs Bridging Across the Crater
    const sinewCount = 5;
    for (let i = 0; i < sinewCount; i++) {
      const a1 = (i / sinewCount) * Math.PI * 2;
      const a2 = a1 + Math.PI * 0.75;
      const sx1 = Math.cos(a1) * (rx * 0.82);
      const sy1 = Math.sin(a1) * (ry * 0.82);
      const sx2 = Math.cos(a2) * (rx * 0.82);
      const sy2 = Math.sin(a2) * (ry * 0.82);
      const cpx = (sx1 + sx2) * 0.5 + Math.sin(pulseTimer * 2 + i) * (3.5 * cam.zoom);
      const cpy = (sy1 + sy2) * 0.5 + Math.cos(pulseTimer * 2 + i) * (3.5 * cam.zoom);

      ctx.strokeStyle = i % 2 === 0 ? '#991b1b' : '#450a0a';
      ctx.lineWidth = (2.2 - (i % 2) * 0.8) * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(cpx, cpy, sx2, sy2);
      ctx.stroke();
    }

    // 5. Hanging Gore Drips Beneath the Wound
    const dripCount = 4;
    for (let i = 0; i < dripCount; i++) {
      const dx = (-rx * 0.5) + (i / (dripCount - 1)) * (rx * 1.0);
      const dy = ry * 0.72;
      const dLen = (8 + Math.sin(i * 3.7 + t.relY) * 5) * cam.zoom;

      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2.0 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx, dy + dLen);
      ctx.stroke();

      // Blood droplet bead at bottom
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(dx, dy + dLen, 2.0 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Organ-Specific Rupture Graphics
    if (t.type === 'vertical_maw') {
      // Shattered Broken Fangs
      ctx.fillStyle = '#fef08a';
      [-0.35, 0.35].forEach(fx => {
        ctx.beginPath();
        ctx.moveTo(fx * rx, -ry * 0.5);
        ctx.lineTo(fx * rx - 4 * cam.zoom, -ry * 0.1);
        ctx.lineTo(fx * rx + 4 * cam.zoom, -ry * 0.1);
        ctx.closePath();
        ctx.fill();
      });
    } else if (t.type === 'eyestalk_cluster' || t.type === 'weeping_eyes') {
      // Sunken Black Slime Tears & Deflated Eye Husks
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, rx * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'exposed_heart') {
      // Dead Cauterized Black Void Core
      ctx.fillStyle = '#180208';
      ctx.beginPath();
      ctx.arc(0, 0, rx * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2 * cam.zoom;
      ctx.stroke();
    }

    // 7. Severed Status Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(-34 * cam.zoom, -8 * cam.zoom, 68 * cam.zoom, 16 * cam.zoom);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.2 * cam.zoom;
    ctx.strokeRect(-34 * cam.zoom, -8 * cam.zoom, 68 * cam.zoom, 16 * cam.zoom);

    ctx.fillStyle = '#fca5a5';
    ctx.font = `bold ${8.5 * cam.zoom}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('💀 SEVERED', 0, 3.5 * cam.zoom);

    ctx.restore();
  }

  private renderPlayer(ctrl: PlatformerPlayerController) {
    const ctx = this.ctx;
    const cam = this.camera;
    const player = ctrl.player;
    const pos = cam.worldToScreen(ctrl.x, ctrl.y);

    const pw = ctrl.width * cam.tileSize * cam.zoom * 1.35;
    const ph = ctrl.height * cam.tileSize * cam.zoom * 1.15;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    if (ctrl.facingDir < 0) {
      ctx.scale(-1, 1);
    }

    // Smooth invulnerability flicker when recovering from a hit (NO bounding box)
    if (ctrl.hurtTimer > 0) {
      ctx.globalAlpha = Math.sin(ctrl.hurtTimer * 40) > 0 ? 0.35 : 0.85;
    }

    const heroSprite = HeroRenderer.getTransparentSprite(player.appearance.archetype) || HeroRenderer.getHeroImage(player.appearance.archetype) || AssetLoader.getHeroSprite(player.appearance.archetype) || AssetLoader.getImage('hero_soturi') || AssetLoader.getImage('hero_runoseppa');
    if (heroSprite) {
      ctx.drawImage(heroSprite, -pw * 0.5, -ph * 0.5, pw, ph);
    }

    if (ctrl.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pw * 0.4, -ph * 0.1, 8 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.meleeSwingTimer > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3 * cam.zoom;
      ctx.beginPath();
      ctx.arc(pw * 0.2, 0, pw * 0.7, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }

    ctx.restore();

    // Active Aegis Energy Shield Barrier Dome (5s Invulnerable Barrier)
    if (player.energyShieldActive) {
      const shieldRad = 1.45 * cam.tileSize * cam.zoom;
      const sTime = performance.now() * 0.005;

      ctx.save();
      // Outer luminous barrier glow
      const grad = ctx.createRadialGradient(pos.x, pos.y, shieldRad * 0.35, pos.x, pos.y, shieldRad);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.0)');
      grad.addColorStop(0.65, 'rgba(56, 189, 248, 0.22)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.7)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, shieldRad, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing barrier perimeter ring (dual stroke for glow)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = (6.0 + Math.sin(sTime * 4.0) * 1.5) * cam.zoom;
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.0 * cam.zoom;
      ctx.stroke();

      // 6 Rotating Hexagonal Energy Lattice Nodes
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI / 3) + sTime * 0.75;
        const nx = pos.x + Math.cos(ang) * shieldRad;
        const ny = pos.y + Math.sin(ang) * shieldRad;
        ctx.beginPath();
        ctx.arc(nx, ny, 3.5 * cam.zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 * cam.zoom;
        ctx.stroke();
      }

      // Remaining shield duration badge
      ctx.font = `bold ${10 * cam.zoom}px monospace`;
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ BARRIER: ${player.energyShieldTimer.toFixed(1)}s`, pos.x, pos.y - shieldRad * 0.95);

      ctx.restore();

      this.addPointLight(pos.x, pos.y, 140, 'rgba(56, 189, 248, 0.7)');
    }

    // Overhead Player Vitals
    const barW = 44 * cam.zoom;
    const barH = 5 * cam.zoom;
    const barY = pos.y - ph * 0.65;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(pos.x - barW * 0.5, barY, barW, barH);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(pos.x - barW * 0.5, barY, barW * (player.health / player.maxHealth), barH);

    if (player.shield > 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(pos.x - barW * 0.5, barY - 4 * cam.zoom, barW * (player.shield / player.maxShield), 3 * cam.zoom);
    }

    this.addPointLight(pos.x, pos.y, 110, 'rgba(56, 189, 248, 0.45)');
  }

  private renderProjectiles(projectiles: ProjectileManager) {
    const ctx = this.ctx;
    const cam = this.camera;

    projectiles.projectiles.forEach(p => {
      if (p.life <= 0) return;
      const pos = cam.worldToScreen(p.x, p.y);
      const angle = Math.atan2(p.vy, p.vx);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      if (p.fromPlayer) {
        // === 16-BIT RETRO HERO PIXEL PLASMA BLASTER ===
        // Outer Cyan Energy Aura
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-11 * cam.zoom, -3.5 * cam.zoom, 22 * cam.zoom, 7 * cam.zoom);

        // Neon Blue Pixel Core
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-9 * cam.zoom, -2 * cam.zoom, 18 * cam.zoom, 4 * cam.zoom);

        // White-Hot Plasma Filament
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4 * cam.zoom, -1 * cam.zoom, 12 * cam.zoom, 2 * cam.zoom);

        // Stepped Pixel Trail Particles behind the bullet
        ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.fillRect(-15 * cam.zoom, -2 * cam.zoom, 3 * cam.zoom, 4 * cam.zoom);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.fillRect(-19 * cam.zoom, -1.5 * cam.zoom, 3 * cam.zoom, 3 * cam.zoom);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-23 * cam.zoom, -1 * cam.zoom, 2 * cam.zoom, 2 * cam.zoom);

        ctx.restore();
        this.addPointLight(pos.x, pos.y, 50, 'rgba(56, 189, 248, 0.55)');
      } else {
        // === HOSTILE ELDRITCH / VOID PIXEL PROJECTILES ===
        const col = p.color || '#ef4444';

        // Outer Dark Void Glow
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(-10 * cam.zoom, -4 * cam.zoom, 20 * cam.zoom, 8 * cam.zoom);

        // Glowing Crimson/Purple Core
        ctx.fillStyle = col;
        ctx.fillRect(-8 * cam.zoom, -2.5 * cam.zoom, 16 * cam.zoom, 5 * cam.zoom);

        // Yellow/White Center Spark
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-3 * cam.zoom, -1 * cam.zoom, 8 * cam.zoom, 2 * cam.zoom);

        // Fading Dark Mist Pixel Trail
        ctx.fillStyle = col;
        ctx.fillRect(-14 * cam.zoom, -2 * cam.zoom, 3 * cam.zoom, 4 * cam.zoom);
        ctx.fillRect(-18 * cam.zoom, -1 * cam.zoom, 2 * cam.zoom, 2 * cam.zoom);

        ctx.restore();
        this.addPointLight(pos.x, pos.y, 45, col);
      }
    });
  }

  private renderDecals(particles: ParticleSystem) {
    const ctx = this.ctx;
    const cam = this.camera;

    particles.groundDecals.forEach(d => {
      const pos = cam.worldToScreen(d.x, d.y);
      const sz = d.size * cam.zoom;

      ctx.save();
      ctx.globalAlpha = d.alpha * 0.85;

      if (d.type === 'blood') {
        // Deep burgundy / arterial pool base
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, sz * 0.65, sz * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fresh glossy crimson blood core
        ctx.fillStyle = '#881337';
        ctx.beginPath();
        ctx.ellipse(pos.x - sz * 0.1, pos.y - sz * 0.05, sz * 0.45, sz * 0.22, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Splatter droplets around perimeter
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(pos.x + sz * 0.45, pos.y - sz * 0.2, sz * 0.12, 0, Math.PI * 2);
        ctx.arc(pos.x - sz * 0.5, pos.y + sz * 0.15, sz * 0.14, 0, Math.PI * 2);
        ctx.arc(pos.x + sz * 0.2, pos.y + sz * 0.3, sz * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Scorch / Oil decal
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, sz * 0.6, sz * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private renderFX(particles: ParticleSystem, combat: CombatEngine) {
    const ctx = this.ctx;
    const cam = this.camera;

    // 1. Shockwaves
    particles.shockwaves.forEach(sw => {
      const pos = cam.worldToScreen(sw.x, sw.y);
      const rad = sw.radius * cam.tileSize * cam.zoom;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(1, rad), 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(2.0, 5.0 * sw.alpha * cam.zoom);
      ctx.globalAlpha = Math.max(0, sw.alpha * 0.85);
      ctx.stroke();
      ctx.restore();
      this.addPointLight(pos.x, pos.y, rad * 1.5, sw.color);
    });

    // 2. Flying Gore Gibs & Severed Organs
    particles.gibs.forEach(g => {
      const pos = cam.worldToScreen(g.x, g.y);
      const sz = g.size * cam.zoom;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(g.rot);
      ctx.globalAlpha = Math.max(0, g.alpha);

      if (g.shape === 'meat_chunk') {
        // Dark crimson meat blob with bright blood sheen
        ctx.fillStyle = g.bloodColor;
        ctx.beginPath();
        ctx.moveTo(-sz * 0.5, -sz * 0.3);
        ctx.lineTo(sz * 0.4, -sz * 0.6);
        ctx.lineTo(sz * 0.6, sz * 0.2);
        ctx.lineTo(sz * 0.1, sz * 0.6);
        ctx.lineTo(-sz * 0.6, sz * 0.3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (g.shape === 'rib_bone') {
        // Curved ivory bone fragment with bloody tips
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = Math.max(1.5, sz * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.5, 0.4, Math.PI * 0.9);
        ctx.stroke();

        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(sz * 0.4, sz * 0.2, sz * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (g.shape === 'eyeball') {
        // Severed eyeball with optic nerve
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(sz * 0.1, 0, sz * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(sz * 0.15, 0, sz * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Trailing bloody optic nerve
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5 * cam.zoom;
        ctx.beginPath();
        ctx.moveTo(-sz * 0.4, 0);
        ctx.quadraticCurveTo(-sz * 0.7, sz * 0.3, -sz * 1.1, sz * 0.1);
        ctx.stroke();
      } else if (g.shape === 'jaw_fang') {
        // Jagged fanged jawbone
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-sz * 0.6, sz * 0.4);
        ctx.lineTo(sz * 0.6, sz * 0.3);
        ctx.lineTo(sz * 0.3, -sz * 0.5);
        ctx.lineTo(0, -sz * 0.2);
        ctx.lineTo(-sz * 0.3, -sz * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(-sz * 0.2, sz * 0.2, sz * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cyber Gear / Armor Shrapnel
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.rect(-sz * 0.4, -sz * 0.4, sz * 0.8, sz * 0.8);
        ctx.fill();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      this.addPointLight(pos.x, pos.y, 35, 'rgba(220, 38, 38, 0.4)');
    });

    // 3. Particles & Blood Droplets & Blood Mists (Zero ctx.save/restore overhead)
    particles.particles.forEach(pt => {
      const pos = cam.worldToScreen(pt.x, pt.y);
      const sz = pt.size * cam.zoom;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);

      if (pt.size >= 12.0) {
        // Blood Mist / Cloud Puff
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, sz * 0.6);
        grad.addColorStop(0, pt.color);
        grad.addColorStop(0.6, 'rgba(153, 27, 27, 0.45)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sz * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.shape === 'circle' || pt.gravity !== undefined) {
        // Blood Droplet / Spark
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(0.85, sz * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // Glistening specular highlight on large blood drops
        if (sz > 3.2 && (pt.color === '#dc2626' || pt.color === '#ef4444' || pt.color === '#991b1b')) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pos.x - sz * 0.15, pos.y - sz * 0.15, sz * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pos.x - sz * 0.5, pos.y - sz * 0.5, sz, sz);
      }
    });
    ctx.globalAlpha = 1.0;

    // 4. Floating Combat Text
    combat.floatingTexts.forEach(ft => {
      const pos = cam.worldToScreen(ft.x, ft.y);
      const isGore = ft.text.includes('🩸') || ft.text.includes('💥') || ft.text.includes('GORE') || ft.text.includes('DECIMATED') || ft.text.includes('SLAIN');
      ctx.fillStyle = isGore ? '#f43f5e' : (ft.type === 'crit' ? '#facc15' : (ft.type === 'shock' ? '#38bdf8' : (ft.type === 'heal' ? '#10b981' : '#f87171')));
      ctx.font = `bold ${isGore ? 15 * cam.zoom : 13 * cam.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = isGore ? '#991b1b' : '#000000';
      ctx.shadowBlur = isGore ? 8 : 4;
      ctx.fillText(ft.text, pos.x, pos.y);
      ctx.shadowBlur = 0;
    });
  }

  private renderCrosshair() {
    const ctx = this.ctx;
    const mx = inputManager.mouseScreen.x;
    const my = inputManager.mouseScreen.y;

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(mx, my, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(mx - 12, my); ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 12, my);
    ctx.moveTo(mx, my - 12); ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 12);
    ctx.stroke();

    ctx.restore();
  }

  private renderDefeatOverlay() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 4, 10, 0.78)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px var(--font-rune, Georgia)';
    ctx.textAlign = 'center';
    ctx.fillText('💥 VESSEL DESTROYED', w / 2, h / 2 - 30);

    ctx.fillStyle = '#f87171';
    ctx.font = '16px var(--font-mono, monospace)';
    ctx.fillText('Fatal Damage Incurred // Neural Connection Suspended', w / 2, h / 2 + 5);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px var(--font-mono, monospace)';
    ctx.fillText('[SPACE / ENTER] RESPAWN AT ENTRY BEACON', w / 2, h / 2 + 55);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px var(--font-mono, monospace)';
    ctx.fillText('[ESCAPE] RETURN TO SAGA CAROUSEL', w / 2, h / 2 + 85);

    ctx.restore();
  }

  private addPointLight(screenX: number, screenY: number, radius: number, color: string) {
    const lightCtx = this.lightCtx;
    const rad = radius * this.camera.zoom;

    lightCtx.save();
    lightCtx.globalCompositeOperation = 'destination-out';
    const grad = lightCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, rad);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    lightCtx.fillStyle = grad;
    lightCtx.beginPath();
    lightCtx.arc(screenX, screenY, rad, 0, Math.PI * 2);
    lightCtx.fill();
    lightCtx.restore();
  }

  private compositeLighting() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.drawImage(this.lightCanvas, 0, 0);
    this.ctx.restore();
  }
}
