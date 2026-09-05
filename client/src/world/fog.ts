// Fog of War & Minimap Radar Subsystem with Organic Directional Sight Projection
// Projects a continuous, smooth teardrop vision envelope extending forward in the direction the hero is watching.

import { TileType } from './tiles';

export class FogOfWar {
  public explored: boolean[][];
  public visible: boolean[][];
  public revealAlpha: Float32Array; // Smooth reveal transition [0.0 -> 1.0] per tile
  public width: number;
  public height: number;

  // Continuous Organic Vision Parameters (Expanded for wider hallway & corridor awareness)
  public baseRadius: number = 9.5; // Ambient rear/side sight reach (was 6.0)
  public forwardRadius: number = 28.0; // Extended forward sight reach (was 22.0)
  public facingAngle: number = 0;
  public smoothFacingAngle: number = 0;

  // Real-time Vision Polygon in world coordinates for seamless lighting mask
  public visionPolygon: { x: number; y: number }[] = [];

  // Performance optimizations
  private fadingTiles: number[] = []; // Indices of tiles currently fading in reveal
  private activeVisibleCoords: number[] = []; // Packed [x1, y1, x2, y2, ...]
  private visitedFrameBuffer: Uint8Array; // Rapid frame check buffer to avoid duplicate cell raycast steps
  private frameId: number = 1;
  private offscreenMinimap: HTMLCanvasElement | null = null;
  private offscreenMinimapCtx: CanvasRenderingContext2D | null = null;
  private lastMinimapDrawTime: number = 0;
  public isDirtyMinimap: boolean = true;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.explored = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
    this.visible = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
    this.revealAlpha = new Float32Array(width * height);
    this.visitedFrameBuffer = new Uint8Array(width * height);
    // Pre-allocated pool of 96 vision polygon points for zero GC
    this.visionPolygon = Array.from({ length: 96 }, () => ({ x: 0, y: 0 }));
  }

  // Directional Sight Raycasting: Projects hero vision forward with natural wall occlusion and smooth transitions
  update(
    playerX: number,
    playerY: number,
    facingAngle: number = 0,
    dt: number = 0.016,
    isWall?: (x: number, y: number) => boolean
  ) {
    this.facingAngle = facingAngle;

    // Smooth angle interpolation for fluid vision cone rotation
    const angleDiff = Math.atan2(
      Math.sin(facingAngle - this.smoothFacingAngle),
      Math.cos(facingAngle - this.smoothFacingAngle)
    );
    this.smoothFacingAngle += angleDiff * Math.min(1.0, 14.0 * dt);

    // 1. Fast reset of only currently visible cells from previous frame
    for (let i = 0; i < this.activeVisibleCoords.length; i += 2) {
      const vx = this.activeVisibleCoords[i];
      const vy = this.activeVisibleCoords[i + 1];
      this.visible[vy][vx] = false;
    }
    this.activeVisibleCoords.length = 0;

    // Advance frame check ID (wraps safely)
    this.frameId = (this.frameId + 1) & 0xff;
    if (this.frameId === 0) {
      this.visitedFrameBuffer.fill(0);
      this.frameId = 1;
    }
    const currentFrame = this.frameId;

    let newlyExplored = false;
    const px = playerX;
    const py = playerY;

    // 2. Cast Continuous Organic Vision Rays (96 rays across 360° with smooth teardrop reach)
    const numRays = 96;
    const angleStep = (Math.PI * 2) / numRays;
    const baseR = this.baseRadius;
    const forwardR = this.forwardRadius;
    const stepDist = 0.5; // Optimized Ray step size in tiles

    for (let i = 0; i < numRays; i++) {
      const rayAngle = -Math.PI + i * angleStep;
      // Absolute angular delta from smoothed hero sightline
      const delta = Math.abs(
        Math.atan2(Math.sin(rayAngle - this.smoothFacingAngle), Math.cos(rayAngle - this.smoothFacingAngle))
      );

      // Single continuous organic teardrop envelope across all 360 degrees (broad cone spread)
      const w = (1 + Math.cos(delta)) / 2; // [0.0 to 1.0]
      const organicWeight = Math.pow(w, 1.10);
      const maxReach = baseR + (forwardR - baseR) * organicWeight;

      const cosA = Math.cos(rayAngle);
      const sinA = Math.sin(rayAngle);
      const maxSteps = Math.ceil(maxReach / stepDist);
      let endDist = maxReach;

      for (let s = 1; s <= maxSteps; s++) {
        const curDist = s * stepDist;
        if (curDist > maxReach) break;

        const rx = px + cosA * curDist;
        const ry = py + sinA * curDist;
        const tx = Math.floor(rx);
        const ty = Math.floor(ry);

        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
          endDist = curDist;
          break;
        }

        const idx = ty * this.width + tx;

        // Process cell if not yet visited this frame
        if (this.visitedFrameBuffer[idx] !== currentFrame) {
          this.visitedFrameBuffer[idx] = currentFrame;
          this.visible[ty][tx] = true;
          this.activeVisibleCoords.push(tx, ty);

          if (!this.explored[ty][tx]) {
            this.explored[ty][tx] = true;
            this.fadingTiles.push(idx);
            newlyExplored = true;
          }
        }

        // Check wall occlusion: wall is fully revealed and illuminated, but ray stops past the wall face
        if (isWall && isWall(tx, ty)) {
          endDist = curDist + 0.95;
          break;
        }

      }

      if (i >= this.visionPolygon.length) {
        this.visionPolygon.push({ x: px + cosA * endDist, y: py + sinA * endDist });
      } else {
        this.visionPolygon[i].x = px + cosA * endDist;
        this.visionPolygon[i].y = py + sinA * endDist;
      }
    }
    this.visionPolygon.length = numRays;

    // Always keep player's immediate tile visible
    const centerTx = Math.floor(px);
    const centerTy = Math.floor(py);
    if (centerTx >= 0 && centerTx < this.width && centerTy >= 0 && centerTy < this.height) {
      this.visible[centerTy][centerTx] = true;
      this.explored[centerTy][centerTx] = true;
    }

    // 3. Step smooth reveal alpha transitions (~0.28s smooth fade for new tiles)
    if (this.fadingTiles.length > 0) {
      const fadeSpeed = 3.8;
      let writeIdx = 0;
      for (let i = 0; i < this.fadingTiles.length; i++) {
        const idx = this.fadingTiles[i];
        this.revealAlpha[idx] += dt * fadeSpeed;
        if (this.revealAlpha[idx] >= 1.0) {
          this.revealAlpha[idx] = 1.0;
        } else {
          this.fadingTiles[writeIdx++] = idx;
        }
      }
      this.fadingTiles.length = writeIdx;
    }

    if (newlyExplored) {
      this.isDirtyMinimap = true;
    }
  }

  // Get current reveal opacity [0.0 to 1.0] for smooth map blending
  getRevealAlpha(x: number, y: number): number {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return 0;
    return this.revealAlpha[ty * this.width + tx];
  }

  isExplored(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return this.explored[ty][tx];
  }

  isVisible(x: number, y: number): boolean {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return false;
    return this.visible[ty][tx];
  }

  revealArea(centerX: number, centerY: number, radius: number = 4, instant: boolean = false) {
    const cx = Math.floor(centerX);
    const cy = Math.floor(centerY);
    const r2 = radius * radius;
    for (let y = Math.max(0, cy - radius); y <= Math.min(this.height - 1, cy + radius); y++) {
      const dy = y - cy;
      for (let x = Math.max(0, cx - radius); x <= Math.min(this.width - 1, cx + radius); x++) {
        const dx = x - cx;
        if (dx * dx + dy * dy <= r2) {
          const idx = y * this.width + x;
          if (!this.explored[y][x]) {
            this.explored[y][x] = true;
            if (instant) {
              this.revealAlpha[idx] = 1.0;
            } else {
              this.fadingTiles.push(idx);
            }
          } else if (instant) {
            this.revealAlpha[idx] = 1.0;
          }
          this.visible[y][x] = true;
          this.activeVisibleCoords.push(x, y);
        }
      }
    }
    this.isDirtyMinimap = true;
  }

  // Transform world coordinates (wx, wy) into Screen-Aligned Isometric Minimap coordinates
  // Ensures W moves UP, S moves DOWN, A moves LEFT, D moves RIGHT on the radar!
  public worldToRadar(wx: number, wy: number, cw: number, ch: number, padding: number = 8): { x: number; y: number } {
    const minIsoX = -this.height;
    const maxIsoX = this.width;
    const rangeX = maxIsoX - minIsoX; // width + height

    const minIsoY = 0;
    const maxIsoY = this.width + this.height;
    const rangeY = maxIsoY - minIsoY; // width + height

    const isoX = wx - wy;
    const isoY = wx + wy;

    const normX = (isoX - minIsoX) / rangeX;
    const normY = (isoY - minIsoY) / rangeY;

    const usableW = cw - padding * 2;
    const usableH = ch - padding * 2;

    return {
      x: padding + normX * usableW,
      y: padding + normY * usableH
    };
  }

  // Render high-tech mini radar map with screen-aligned isometric projection and organic sightline envelope
  renderMinimap(
    canvas: HTMLCanvasElement,
    tiles: TileType[][],
    player: { x: number; y: number; angle?: number },
    enemies: { x: number; y: number; isBoss?: boolean; hasRuneShard?: boolean; isDead?: boolean }[],
    chests: { x: number; y: number; isOpened?: boolean }[],
    puzzles: { x: number; y: number; isSolved?: boolean; isAllShardsCollected?: () => boolean; isAllCollected?: boolean }[],
    gateways: { x: number; y: number; isDestroyed?: boolean; isActive?: boolean }[] = [],
    escapePortal?: { x: number; y: number } | null
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Initialize offscreen cached minimap
    if (!this.offscreenMinimap || this.offscreenMinimap.width !== cw || this.offscreenMinimap.height !== ch) {
      this.offscreenMinimap = document.createElement('canvas');
      this.offscreenMinimap.width = cw;
      this.offscreenMinimap.height = ch;
      this.offscreenMinimapCtx = this.offscreenMinimap.getContext('2d');
      this.isDirtyMinimap = true;
    }

    const now = performance.now();

    // Redraw offscreen background only when explored tiles change or periodically (every 150ms)
    if (this.isDirtyMinimap || (now - this.lastMinimapDrawTime > 150)) {
      this.lastMinimapDrawTime = now;
      this.isDirtyMinimap = false;

      const bgCtx = this.offscreenMinimapCtx!;
      bgCtx.clearRect(0, 0, cw, ch);

      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (!this.explored[y][x]) continue;

          const tile = tiles[y][x];
          if (tile === TileType.WALL) {
            bgCtx.fillStyle = '#1e293b';
          } else if (tile === TileType.FLOOR || tile === TileType.CONDUIT) {
            bgCtx.fillStyle = this.visible[y][x] ? '#334155' : '#0f172a';
          } else if (tile === TileType.HAZARD) {
            bgCtx.fillStyle = '#ef4444';
          } else if (tile === TileType.GATE) {
            bgCtx.fillStyle = '#38bdf8';
          } else {
            bgCtx.fillStyle = '#090e17';
          }

          // Screen-aligned isometric diamond polygon for each tile
          const p0 = this.worldToRadar(x, y, cw, ch);
          const p1 = this.worldToRadar(x + 1, y, cw, ch);
          const p2 = this.worldToRadar(x + 1, y + 1, cw, ch);
          const p3 = this.worldToRadar(x, y + 1, cw, ch);

          bgCtx.beginPath();
          bgCtx.moveTo(p0.x, p0.y);
          bgCtx.lineTo(p1.x, p1.y);
          bgCtx.lineTo(p2.x, p2.y);
          bgCtx.lineTo(p3.x, p3.y);
          bgCtx.closePath();
          bgCtx.fill();
        }
      }
    }

    // Blit cached background in 1 GPU texture draw
    if (this.offscreenMinimap) {
      ctx.drawImage(this.offscreenMinimap, 0, 0);
    }

    // Draw Subtle Tactical Radar Range Circles
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cw * 0.22, 0, Math.PI * 2);
    ctx.arc(cw / 2, ch / 2, cw * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw Chests
    for (const c of chests) {
      if (this.isExplored(c.x, c.y) && !c.isOpened) {
        const cp = this.worldToRadar(c.x, c.y, cw, ch);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cp.x - 2, cp.y - 2, 4, 4);
      }
    }

    // Draw Puzzles (Runic Monoliths & Cipher Decoders)
    for (const p of puzzles) {
      const isAll = p.isAllShardsCollected ? p.isAllShardsCollected() : (p.isAllCollected || false);
      if (this.isExplored(p.x, p.y) || (isAll && !p.isSolved)) {
        const ppz = this.worldToRadar(p.x, p.y, cw, ch);

        if (isAll && !p.isSolved) {
          // Animated Expanding Sonar Radar Ping Ring
          const sonarPulse = (now * 0.003) % 1;
          const sonarRadius = 4 + sonarPulse * 14;
          const sonarAlpha = Math.max(0, 1 - sonarPulse);

          ctx.save();
          ctx.strokeStyle = `rgba(245, 158, 11, ${sonarAlpha.toFixed(2)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(ppz.x, ppz.y, sonarRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Outer rotating golden diamond beacon
          const pulse = 4.5 + Math.sin(now * 0.01) * 1.5;
          ctx.translate(ppz.x, ppz.y);
          ctx.rotate(now * 0.0015);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(0, -pulse);
          ctx.lineTo(pulse, 0);
          ctx.lineTo(0, pulse);
          ctx.lineTo(-pulse, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();

          // Inner glowing core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ppz.x, ppz.y, 2, 0, Math.PI * 2);
          ctx.fill();

          // Label
          ctx.save();
          ctx.font = 'bold 8px "Cinzel", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fde047';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 3;
          ctx.fillText('✦ MONOLITH', ppz.x, ppz.y - pulse - 3);
          ctx.restore();
        } else {
          ctx.fillStyle = p.isSolved ? '#10b981' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(ppz.x, ppz.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Draw Void Gateways
    for (const gw of gateways) {
      if (this.isExplored(gw.x, gw.y) && !gw.isDestroyed) {
        const gp = this.worldToRadar(gw.x, gw.y, cw, ch);
        ctx.fillStyle = gw.isActive ? '#ef4444' : '#c084fc';
        ctx.beginPath();
        ctx.arc(gp.x, gp.y, gw.isActive ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (gw.isActive) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Draw Escape Portal (Mythical Kalevala Gateway Star & Diamond on Radar)
    if (escapePortal) {
      const pulse = 5 + Math.sin(performance.now() * 0.01) * 2;
      const ep = this.worldToRadar(escapePortal.x, escapePortal.y, cw, ch);

      ctx.save();
      // Outer Rotating Golden Diamond
      ctx.translate(ep.x, ep.y);
      ctx.rotate(now * 0.001);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, -pulse * 1.3);
      ctx.lineTo(pulse * 1.3, 0);
      ctx.lineTo(0, pulse * 1.3);
      ctx.lineTo(-pulse * 1.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner Glowing Cyan Core Star
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, pulse * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Label
      ctx.font = 'bold 8px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText('✦ GATE', ep.x, ep.y - pulse * 1.6);
    }

    // Draw Enemies in visible range (with special Rune-Carrier Beacon)
    for (const e of enemies) {
      if (!e.isDead && (this.isVisible(e.x, e.y) || (e.hasRuneShard && this.isExplored(e.x, e.y)))) {
        const ep = this.worldToRadar(e.x, e.y, cw, ch);
        if (e.hasRuneShard) {
          const pulse = 4 + Math.sin(now * 0.008) * 1.5;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else if (e.isBoss) {
          const bPulse = 7.5 + Math.sin(now * 0.006) * 1.8;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, bPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Hero's Organic Sight Projection on Radar (Screen-Aligned Orientation)
    if (this.visionPolygon.length > 2) {
      ctx.save();
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < this.visionPolygon.length; i++) {
        pts.push(this.worldToRadar(this.visionPolygon[i].x, this.visionPolygon[i].y, cw, ch));
      }

      ctx.beginPath();
      const len = pts.length;
      const firstMidX = (pts[len - 1].x + pts[0].x) / 2;
      const firstMidY = (pts[len - 1].y + pts[0].y) / 2;
      ctx.moveTo(firstMidX, firstMidY);

      for (let i = 0; i < len; i++) {
        const next = pts[(i + 1) % len];
        const midX = (pts[i].x + next.x) / 2;
        const midY = (pts[i].y + next.y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      ctx.closePath();

      const playerPos = this.worldToRadar(player.x, player.y, cw, ch);
      const coneRadius = 38;
      const coneGrad = ctx.createRadialGradient(playerPos.x, playerPos.y, 0, playerPos.x, playerPos.y, coneRadius);
      coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.32)');
      coneGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.12)');
      coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = coneGrad;
      ctx.fill();

      // Directional sightline laser matching screen orientation
      const sightDist = 32;
      const forwardTarget = this.worldToRadar(
        player.x + Math.cos(this.smoothFacingAngle) * 5.0,
        player.y + Math.sin(this.smoothFacingAngle) * 5.0,
        cw, ch
      );
      const angleOnRadar = Math.atan2(forwardTarget.y - playerPos.y, forwardTarget.x - playerPos.x);

      ctx.beginPath();
      ctx.moveTo(playerPos.x, playerPos.y);
      ctx.lineTo(
        playerPos.x + Math.cos(angleOnRadar) * sightDist,
        playerPos.y + Math.sin(angleOnRadar) * sightDist
      );
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // Draw Player Blip
    const playerPos = this.worldToRadar(player.x, player.y, cw, ch);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(playerPos.x, playerPos.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Radar scan sweep line
    const sweepTime = performance.now() * 0.0015;
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(sweepTime);
    const grad = ctx.createLinearGradient(0, 0, cw / 2, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, cw, 0, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
