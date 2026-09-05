// Natural Organic Finnish Wilderness & Cosmological Landscape Renderer
// Implements detailed thematic environments for all 6 realms:
// 1. Ilman Luominen: Drifting clouds & alpine mountain tops
// 2. Väinölä: Lush green world with diverse Scots Pines (Mänty/Honka) and Spruces (Kuusi) in varied sizes
// 3. Pohjola: Frozen trees and permafrost frozen ground
// 4. Tuonela: Mystic underground cavern surrounded by dark stones, glowing magic mushrooms, luminescent flowers & root-trees
// 5. Alinen: Dark volcanic stones, active lava flows & decaying industrial ruins
// 6. Ylinen: Celestial space forge with psychedelic shifting colors, strange floating geometric shapes & lasers

import { BiomeDefinition } from './biomes';
import { AssetLoader } from '../engine/asset_loader';

export enum TileType {
  EMPTY = 0,
  FLOOR = 1,
  WALL = 2,
  HAZARD = 3,
  CONDUIT = 4,
  SHRINE = 5,
  GATE = 6
}

export class TileRenderer {
  // Render solid opaque, rich isometric walkable floor tiles with painterly textures
  static drawFloorTile(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    type: TileType,
    biome: BiomeDefinition,
    gridX: number,
    gridY: number
  ) {
    // 0. High-Performance Multi-Variant PNG Texture Fast-Path
    let tileKey: string | null = null;
    if (type === TileType.FLOOR) {
      const variant = Math.abs((gridX * 73 + gridY * 37)) % 4;
      const variantKey = `tile_floor_${biome.id}_${variant}`;
      const img = AssetLoader.getImage(variantKey);
      if (img && img.complete && img.naturalWidth > 0) {
        tileKey = variantKey;
      } else {
        tileKey = `tile_floor_${biome.id}`;
      }
    } else if (type === TileType.HAZARD) {
      tileKey = `tile_hazard_${biome.id}`;
    } else if (type === TileType.CONDUIT) {
      tileKey = 'tile_conduit';
    } else if (type === TileType.SHRINE) {
      tileKey = 'tile_shrine';
    } else if (type === TileType.GATE) {
      tileKey = 'tile_gate';
    }

    if (tileKey) {
      const tileImg = AssetLoader.getImage(tileKey);
      if (tileImg && tileImg.complete && tileImg.naturalWidth > 0) {
        // Draw with 0.5px subpixel bleed to prevent 1px camera scroll jitter/gaps
        ctx.drawImage(
          tileImg,
          sx - halfW - 0.5,
          sy - halfH - 0.5,
          halfW * 2 + 1.0,
          halfH * 2 + 1.0
        );
        return;
      }
    }

    const seed = (gridX * 37 + gridY * 73) % 100;
    const zoom = halfW / 32;

    // 1. SOLID OPAQUE ISOMETRIC DIAMOND BASE (Zero see-through bleeding)
    ctx.beginPath();
    ctx.moveTo(Math.round(sx), Math.round(sy - halfH));
    ctx.lineTo(Math.round(sx + halfW), Math.round(sy));
    ctx.lineTo(Math.round(sx), Math.round(sy + halfH));
    ctx.lineTo(Math.round(sx - halfW), Math.round(sy));
    ctx.closePath();

    switch (type) {
      case TileType.FLOOR:
        ctx.fillStyle = biome.palette.floorPrimary;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // High-Performance Clean & Dim Floor Texture Patterns
        if (biome.id === 'ilman_luominen') {
          // --- 1. ILMAN LUOMINEN: Floating Cloud-Stone & Primordial Sky Flagstones ---
          if (seed < 60) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(Math.round(sx - 5), Math.round(sy - 3), 10, 6);
          }
          if (seed > 70) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.fillRect(Math.round(sx + (seed % 12 - 6)), Math.round(sy + (seed % 8 - 4)), 3, 2);
          }

        } else if (biome.id === 'vainola') {
          // --- 2. VÄINÖLÄ: Lush Dark Forest Earth & Moss Carpets ---
          if (seed < 65) {
            ctx.fillStyle = '#062818';
            ctx.fillRect(Math.round(sx - 6), Math.round(sy - 3), 12, 6);
          }
          if (seed > 50 && seed < 75) {
            ctx.fillStyle = '#2d1808';
            ctx.fillRect(Math.round(sx - 3), Math.round(sy - 2), 6, 2);
          }
          if (seed > 80) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.fillRect(Math.round(sx + (seed % 12 - 6)), Math.round(sy + (seed % 6 - 3)), 3, 2);
          }

        } else if (biome.id === 'pohjola') {
          // --- 3. POHJOLA: Dark Permafrost & Subdued Ice Slate ---
          if (seed < 60) {
            ctx.beginPath();
            ctx.ellipse(sx + (seed % 10 - 5), sy + (seed % 6 - 3), halfW * 0.8, halfH * 0.8, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
          }
          if (seed > 60) {
            ctx.beginPath();
            ctx.moveTo(sx - halfW * 0.4, sy - 2);
            ctx.lineTo(sx, sy + 3);
            ctx.lineTo(sx + halfW * 0.45, sy - 1);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.30)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }

        } else if (biome.id === 'tuonela') {
          // --- 4. TUONELA: Ash-Strewn Basalt Flagstones & Ancient Muted Inlays ---
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.78, halfH * 0.78, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#06040a';
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.65, halfH * 0.65, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#0c0814';
          ctx.fill();

          const detailType = seed % 3;
          if (detailType === 0) {
            // Ethereal Subdued Runic Glyph Inlay
            ctx.beginPath();
            ctx.moveTo(sx - 3 * zoom, sy - 4 * zoom);
            ctx.lineTo(sx + 3 * zoom, sy + 4 * zoom);
            ctx.moveTo(sx + 3 * zoom, sy - 4 * zoom);
            ctx.lineTo(sx - 3 * zoom, sy + 4 * zoom);
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else if (detailType === 1) {
            // Dark Stagnant Soot Puddle
            const px = sx + (seed % 6 - 3);
            const py = sy + (seed % 4 - 2);
            ctx.beginPath();
            ctx.ellipse(px, py, 6 * zoom, 3.5 * zoom, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#020104';
            ctx.fill();
          }

        } else if (biome.id === 'alinen') {
          // --- 5. ALINEN: Dark Volcanic Obsidian & Subdued Magma Seams ---
          if (seed < 60) {
            ctx.beginPath();
            ctx.ellipse(sx + (seed % 10 - 5), sy + (seed % 6 - 3), halfW * 0.7, halfH * 0.7, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#1c0804';
            ctx.fill();
          }
          if (seed > 70) {
            ctx.beginPath();
            ctx.moveTo(sx - halfW * 0.4, sy + (seed % 4 - 2));
            ctx.lineTo(sx + (seed % 6 - 3), sy);
            ctx.lineTo(sx + halfW * 0.4, sy + (seed % 4 - 2));
            ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

        } else if (biome.id === 'ylinen') {
          // --- 6. YLINEN: Celestial Space-Forge Plating & Muted Circuitry ---
          if (seed < 60) {
            ctx.beginPath();
            ctx.ellipse(sx + (seed % 10 - 5), sy + (seed % 6 - 3), halfW * 0.75, halfH * 0.75, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#18122c';
            ctx.fill();
          }
          if (seed > 65) {
            ctx.beginPath();
            ctx.moveTo(sx - halfW * 0.45, sy - 2);
            ctx.lineTo(sx, sy);
            ctx.lineTo(sx + halfW * 0.45, sy + 2);
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.40)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        } else {
          // --- 7. VOID DIMENSION: Boundless Cosmic Starlight Void Floor ---
          if (seed < 65) {
            ctx.beginPath();
            ctx.ellipse(sx + (seed % 8 - 4), sy + (seed % 6 - 3), halfW * 0.85, halfH * 0.85, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#110426';
            ctx.fill();
          }
          if (seed > 45) {
            ctx.beginPath();
            ctx.moveTo(sx - halfW * 0.5, sy - 1);
            ctx.lineTo(sx, sy + 1);
            ctx.lineTo(sx + halfW * 0.5, sy - 1);
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(sx, sy + 1, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = seed % 2 === 0 ? '#e9d5ff' : '#38bdf8';
            ctx.fill();
          }
        }

        // Isometric tile seam line
        ctx.beginPath();
        ctx.moveTo(sx - halfW, sy);
        ctx.lineTo(sx, sy + halfH);
        ctx.lineTo(sx + halfW, sy);
        ctx.strokeStyle = biome.palette.floorSecondary + '55';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;

      case TileType.HAZARD:
        if (biome.id === 'tuonela') {
          // River Tuoni Stygian Waters
          ctx.fillStyle = '#020104';
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.94, halfH * 0.88, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#06030a';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(sx, sy, halfW * 0.45, 0, Math.PI * 1.5);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

        } else if (biome.id === 'alinen') {
          // Flowing Lava Pool
          ctx.fillStyle = '#1c0502';
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.94, halfH * 0.88, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#b91c1c';
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.65, halfH * 0.55, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ea580c';
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(sx - halfW * 0.6, sy);
          ctx.quadraticCurveTo(sx, sy - 4, sx + halfW * 0.6, sy);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2.5;
          ctx.stroke();

        } else if (biome.id === 'pohjola') {
          ctx.fillStyle = '#081326';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.9, halfH * 0.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#0284c7';
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.stroke();

        } else if (biome.id === 'ilman_luominen') {
          ctx.fillStyle = '#070f20';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.88, halfH * 0.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.fill();

        } else if (biome.id === 'ylinen') {
          ctx.fillStyle = '#0a0614';
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.92, halfH * 0.86, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2.0;
          ctx.stroke();

        } else {
          ctx.fillStyle = biome.palette.wallBase;
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(sx, sy, halfW * 0.9, halfH * 0.8, 0, 0, Math.PI * 2);
          ctx.fillStyle = biome.palette.hazardColor + 'cc';
          ctx.fill();
        }
        break;

      case TileType.CONDUIT:
        ctx.fillStyle = biome.palette.floorPrimary;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx, sy, halfW * 0.85, halfH * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = biome.palette.floorSecondary;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(sx - halfW * 0.6, sy);
        ctx.lineTo(sx + halfW * 0.6, sy);
        ctx.strokeStyle = biome.palette.lightTint;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;

      case TileType.SHRINE:
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case TileType.GATE:
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;
    }
  }

  // Render Natural Finnish Environmental Obstacles & Biome-Specific Architecture
  private static obstacleCache: Map<string, { canvas: HTMLCanvasElement; anchorX: number; anchorY: number }> = new Map();

  public static clearObstacleCache() {
    this.obstacleCache.clear();
  }

  private static getObstacleKey(biomeId: string, seed: number): string {
    switch (biomeId) {
      case 'ilman_luominen': {
        const v = seed % 3;
        return v === 0 ? 'obstacle_ilmatar_mountain' : (v === 1 ? 'obstacle_ilmatar_eggshell' : 'obstacle_ilmatar_mountain');
      }
      case 'vainola': {
        const t = seed % 5;
        if (t === 0) return 'obstacle_vainola_pine_giant';
        if (t === 1) return 'obstacle_vainola_pine_medium';
        if (t === 2) return 'obstacle_vainola_pine_small';
        if (t === 3) return 'obstacle_vainola_spruce';
        return 'obstacle_vainola_boulder';
      }
      case 'pohjola': {
        const f = seed % 3;
        if (f === 0 || f === 1) return 'obstacle_pohjola_spruce';
        return 'obstacle_pohjola_spire';
      }
      case 'tuonela': {
        const d = seed % 4;
        if (d === 0) return 'obstacle_tuonela_kelo_tree';
        if (d === 1) return 'obstacle_tuonela_skull_cairn';
        return 'obstacle_tuonela_monolith';
      }
      case 'alinen': {
        const a = seed % 3;
        if (a === 1) return 'obstacle_alinen_magma_vent';
        return 'obstacle_alinen_rock';
      }
      case 'ylinen': {
        const y = seed % 2;
        return y === 0 ? 'obstacle_ylinen_obelisk' : 'obstacle_ylinen_crystal_spire';
      }
      default:
        return 'obstacle_vainola_boulder';
    }
  }

  // Render Natural Finnish Environmental Obstacles & Biome-Specific Architecture (High-Speed GPU Sprite Cache)
  static drawNaturalObstacle(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    halfW: number,
    halfH: number,
    zoom: number,
    biome: BiomeDefinition,
    gridX: number,
    gridY: number
  ) {
    const seed = (gridX * 43 + gridY * 89) % 100;
    const scaleSeed = (gridX * 137 + gridY * 269) % 1000;
    // Organic deterministic scale variation: 0.82x to 1.22x (±20% size variety)
    const scaleFactor = 0.82 + (scaleSeed / 1000) * 0.40;
    // 50% horizontal mirroring for natural asymmetric landscape variety
    const flipH = ((gridX * 31 + gridY * 97) % 2 === 0);
    // Subtle vertical position jitter to break grid uniformity
    const yOffset = (((gridX * 17 + gridY * 71) % 7) - 3) * 0.5 * zoom;

    // 0. High-Speed PNG Sprite Fast-Path
    const obsKey = this.getObstacleKey(biome.id, seed);
    const sprite = AssetLoader.getTransparent(obsKey) || AssetLoader.getImage(obsKey);
    if (sprite && (sprite instanceof HTMLCanvasElement || (sprite.complete && sprite.naturalWidth > 0))) {
      const sprSize = Math.round(96 * zoom * scaleFactor);
      const drawY = Math.round(sy - sprSize + 14 * zoom * scaleFactor + yOffset);

      if (flipH) {
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy + yOffset));
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -Math.round(sprSize / 2), -sprSize + Math.round(14 * zoom * scaleFactor), sprSize, sprSize);
        ctx.restore();
      } else {
        const drawX = Math.round(sx - sprSize / 2);
        ctx.drawImage(sprite, drawX, drawY, sprSize, sprSize);
      }
      return;
    }

    const zoomBucket = Math.round(zoom * 10) / 10;
    const cacheKey = `${biome.id}_${seed}_${zoomBucket}`;

    let cached = this.obstacleCache.get(cacheKey);
    if (!cached) {
      if (this.obstacleCache.size > 1200) {
        this.obstacleCache.clear();
      }

      const offCanvas = document.createElement('canvas');
      const cw = Math.max(64, Math.ceil(110 * zoom));
      const ch = Math.max(64, Math.ceil(130 * zoom));
      offCanvas.width = cw;
      offCanvas.height = ch;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        const anchorX = Math.floor(cw / 2);
        const anchorY = Math.floor(ch - 14 * zoom);

        // Ground Shadow / Compact Starlight Base for Celestial realm
        if (biome.id === 'ylinen') {
          offCtx.beginPath();
          offCtx.ellipse(anchorX, anchorY + 2 * zoom, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
          const starGrad = offCtx.createRadialGradient(anchorX, anchorY + 2 * zoom, 2 * zoom, anchorX, anchorY + 2 * zoom, 14 * zoom);
          starGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          starGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.15)');
          starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          offCtx.fillStyle = starGrad;
          offCtx.fill();
        } else {
          offCtx.beginPath();
          offCtx.ellipse(anchorX, anchorY + 2 * zoom, 20 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
          offCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          offCtx.fill();
        }

        // Render Geometry onto offscreen canvas
        this.renderObstacleGeometry(offCtx, anchorX, anchorY, zoom, biome, seed);

        cached = { canvas: offCanvas, anchorX, anchorY };
        this.obstacleCache.set(cacheKey, cached);
      }
    }

    if (cached) {
      const drawW = Math.round(cached.canvas.width * scaleFactor);
      const drawH = Math.round(cached.canvas.height * scaleFactor);
      const drawAnchorX = Math.round(cached.anchorX * scaleFactor);
      const drawAnchorY = Math.round(cached.anchorY * scaleFactor);

      if (flipH) {
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy + yOffset));
        ctx.scale(-1, 1);
        ctx.drawImage(cached.canvas, -drawAnchorX, -drawAnchorY, drawW, drawH);
        ctx.restore();
      } else {
        ctx.drawImage(
          cached.canvas,
          Math.round(sx - drawAnchorX),
          Math.round(sy - drawAnchorY + yOffset),
          drawW,
          drawH
        );
      }
    } else {
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy + yOffset));
      if (flipH) ctx.scale(-1, 1);
      ctx.scale(scaleFactor, scaleFactor);

      if (biome.id === 'ylinen') {
        ctx.beginPath();
        ctx.ellipse(0, 2 * zoom, 14 * zoom, 7 * zoom, 0, 0, Math.PI * 2);
        const starGrad = ctx.createRadialGradient(0, 2 * zoom, 2 * zoom, 0, 2 * zoom, 14 * zoom);
        starGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        starGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.15)');
        starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = starGrad;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 2 * zoom, 20 * zoom, 10 * zoom, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
      }
      this.renderObstacleGeometry(ctx, 0, 0, zoom, biome, seed);
      ctx.restore();
    }
  }

  private static renderObstacleGeometry(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    biome: BiomeDefinition,
    seed: number
  ) {
    // Biome-specific architectural routing
    if (biome.id === 'ilman_luominen') {
      // 1. ILMAN LUOMINEN: Clouds, Mountain Tops & Cosmic Eggshell Shards
      const variant = seed % 3;
      if (variant === 0) {
        this.drawMountainPeakCrag(ctx, sx, sy, zoom, seed);
      } else if (variant === 1) {
        this.drawCosmicEggshellShard(ctx, sx, sy, zoom, seed);
      } else {
        this.drawGenesisSkyCrystal(ctx, sx, sy, zoom, seed);
      }

    } else if (biome.id === 'vainola') {
      // 2. VÄINÖLÄ: Lush Green World with Varied Finnish Pines & Spruces in Different Sizes
      const treeType = seed % 5;
      if (treeType === 0) {
        // Giant Towering Scots Pine (Honka)
        this.drawScotsPine(ctx, sx, sy, zoom, seed, false, 'giant');
      } else if (treeType === 1) {
        // Medium Scots Pine (Mänty)
        this.drawScotsPine(ctx, sx, sy, zoom, seed, false, 'medium');
      } else if (treeType === 2) {
        // Slender Pine Sapling
        this.drawScotsPine(ctx, sx, sy, zoom, seed, false, 'small');
      } else if (treeType === 3) {
        // Dense Cascading Norway Spruce (Kuusi)
        this.drawNorwaySpruce(ctx, sx, sy, zoom, seed, false);
      } else {
        // Mossy Granite Boulder (Gallen-Kallela Bedrock)
        this.drawGraniteBoulder(ctx, sx, sy, zoom, seed, biome);
      }

    } else if (biome.id === 'pohjola') {
      // 3. POHJOLA: Frozen Trees and Frozen Spire Formations
      const frostType = seed % 3;
      if (frostType === 0) {
        this.drawFrozenSpruce(ctx, sx, sy, zoom, seed);
      } else if (frostType === 1) {
        this.drawFrozenPine(ctx, sx, sy, zoom, seed);
      } else {
        this.drawGlacialIceSpire(ctx, sx, sy, zoom, seed);
      }

    } else if (biome.id === 'tuonela') {
      // 4. TUONELA: Underworld of Despair — Iron Nets, Bone Cairns, Skeletal Kelo Trees & Death Monoliths
      const despairType = seed % 10;
      switch (despairType) {
        case 0:
          this.drawTuonelaIronNetSpikes(ctx, sx, sy, zoom, seed);
          break;
        case 1:
          this.drawTuonelaGnarledDeathTree(ctx, sx, sy, zoom, seed);
          break;
        case 2:
          this.drawTuonelaWeepingTombstones(ctx, sx, sy, zoom, seed);
          break;
        case 3:
          this.drawTuonelaSkullCairn(ctx, sx, sy, zoom, seed);
          break;
        case 4:
          this.drawTuonelaScytheRack(ctx, sx, sy, zoom, seed);
          break;
        case 5:
          this.drawTuonelaFerryMooringPost(ctx, sx, sy, zoom, seed);
          break;
        case 6:
          this.drawTuonelaDespairMonolith(ctx, sx, sy, zoom, seed);
          break;
        case 7:
          this.drawTuonelaSoulUrnAltar(ctx, sx, sy, zoom, seed);
          break;
        case 8:
          this.drawTuonelaIronCageGallows(ctx, sx, sy, zoom, seed);
          break;
        case 9:
        default:
          this.drawTuonelaPetrifiedBoneSpire(ctx, sx, sy, zoom, seed);
          break;
      }

    } else if (biome.id === 'alinen') {
      // 5. ALINEN: Dark Volcanic Stones, Decaying World Ruins & Magma Vents
      const abyssType = seed % 3;
      if (abyssType === 0) {
        this.drawSubterraneanRock(ctx, sx, sy, zoom, seed, biome);
      } else if (abyssType === 1) {
        this.drawDecayingRuinPillar(ctx, sx, sy, zoom, seed);
      } else {
        this.drawMagmaVent(ctx, sx, sy, zoom, seed);
      }

    } else {
      // 6. YLINEN: Celestial Crystal Light Pillars (Valopylväät) & Astral Starlight Obelisks
      const crystalType = seed % 4;
      switch (crystalType) {
        case 0:
          this.drawGrandCelestialObeliskLightPillar(ctx, sx, sy, zoom, seed);
          break;
        case 1:
          this.drawTwinStarCrystalHelixPillar(ctx, sx, sy, zoom, seed);
          break;
        case 2:
          this.drawAstralKirjokansiPrismPillar(ctx, sx, sy, zoom, seed);
          break;
        case 3:
        default:
          this.drawCelestialClusteredCrystalSpire(ctx, sx, sy, zoom, seed);
          break;
      }
    }
  }

  // ==========================================
  // --- 1. ILMAN LUOMINEN: MOUNTAIN PEAKS & CLOUDS ---
  // ==========================================

  private static drawMountainPeakCrag(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const peakH = (52 + (seed % 16)) * zoom;
    const peakW = (28 + (seed % 10)) * zoom;

    // Jagged mountain peak silhouette
    ctx.beginPath();
    ctx.moveTo(sx - peakW * 0.5, sy);
    ctx.lineTo(sx - peakW * 0.4, sy - peakH * 0.4);
    ctx.lineTo(sx - peakW * 0.1, sy - peakH * 0.85);
    ctx.lineTo(sx, sy - peakH); // Summit
    ctx.lineTo(sx + peakW * 0.2, sy - peakH * 0.7);
    ctx.lineTo(sx + peakW * 0.5, sy - peakH * 0.35);
    ctx.lineTo(sx + peakW * 0.45, sy);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Snow-capped peak highlight facet
    ctx.beginPath();
    ctx.moveTo(sx - peakW * 0.1, sy - peakH * 0.85);
    ctx.lineTo(sx, sy - peakH);
    ctx.lineTo(sx + peakW * 0.2, sy - peakH * 0.7);
    ctx.lineTo(sx + 2 * zoom, sy - peakH * 0.6);
    ctx.lineTo(sx - 3 * zoom, sy - peakH * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#e0f2fe';
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 8;
    ctx.fill();

    // Base cloud ring around mountain
    ctx.beginPath();
    ctx.ellipse(sx, sy - 6 * zoom, peakW * 0.6, 8 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
    ctx.fill();
  }

  private static drawCosmicEggshellShard(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const shardH = (42 + (seed % 14)) * zoom;
    const shardW = 24 * zoom;

    ctx.beginPath();
    ctx.moveTo(sx - shardW * 0.5, sy);
    ctx.quadraticCurveTo(sx - shardW * 0.7, sy - shardH * 0.6, sx, sy - shardH);
    ctx.quadraticCurveTo(sx + shardW * 0.6, sy - shardH * 0.5, sx + shardW * 0.5, sy);
    ctx.closePath();

    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glowing golden eggshell lining
    ctx.beginPath();
    ctx.moveTo(sx - shardW * 0.3, sy - 4 * zoom);
    ctx.quadraticCurveTo(sx - shardW * 0.4, sy - shardH * 0.5, sx, sy - shardH * 0.8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.8;
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  private static drawGenesisSkyCrystal(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const crysH = 46 * zoom;
    const crysW = 18 * zoom;

    ctx.beginPath();
    ctx.moveTo(sx - crysW * 0.5, sy);
    ctx.lineTo(sx - crysW * 0.4, sy - crysH * 0.8);
    ctx.lineTo(sx, sy - crysH);
    ctx.lineTo(sx + crysW * 0.4, sy - crysH * 0.8);
    ctx.lineTo(sx + crysW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular star glint
    ctx.beginPath();
    ctx.arc(sx, sy - crysH * 0.5, 3 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 10;
    ctx.fill();
  }

  // ==========================================
  // --- 2. VÄINÖLÄ: GREEN WORLD WITH PINE TREES IN COMPACT PROPORTIONS ---
  // ==========================================

  private static drawScotsPine(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number,
    isSnowy: boolean,
    sizeVariant: 'giant' | 'medium' | 'small' = 'medium'
  ) {
    const scale = sizeVariant === 'giant' ? 0.85 : (sizeVariant === 'small' ? 0.55 : 0.7);
    const trunkH = Math.round(36 * zoom * scale);
    const trunkW = Math.round((sizeVariant === 'giant' ? 6 : (sizeVariant === 'small' ? 3 : 4)) * zoom);
    const lean = Math.round(((seed % 10) - 5) * 0.5 * zoom);

    // Pixel trunk segments with blocky bark facets
    const segH = Math.max(3, Math.round(trunkH / 4));
    for (let i = 0; i < 4; i++) {
      const segY = sy - i * segH;
      const segX = sx + Math.round(lean * (i / 4));
      const w = Math.max(2, trunkW - i);
      ctx.fillStyle = i % 2 === 0 ? '#78350f' : '#9a3412';
      ctx.fillRect(Math.round(segX - w / 2), Math.round(segY - segH), w, segH);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(segX - w / 2), Math.round(segY - segH), w, segH);
    }

    // Faceted Pixel Art Pine Needle Crowns
    const crowns = [
      { cx: sx + lean * 0.5 - 11 * zoom * scale, cy: sy - trunkH * 0.64, rw: 9 * zoom * scale, rh: 6 * zoom * scale },
      { cx: sx + lean * 0.7 + 12 * zoom * scale, cy: sy - trunkH * 0.78, rw: 10 * zoom * scale, rh: 7 * zoom * scale },
      { cx: sx + lean - 6 * zoom * scale, cy: sy - trunkH * 0.95, rw: 12 * zoom * scale, rh: 8 * zoom * scale },
      { cx: sx + lean + 6 * zoom * scale, cy: sy - trunkH * 0.98, rw: 13 * zoom * scale, rh: 9 * zoom * scale },
      { cx: sx + lean, cy: sy - trunkH * 1.12, rw: 15 * zoom * scale, rh: 10 * zoom * scale } // Apex
    ];

    crowns.forEach(c => {
      const cx = Math.round(c.cx);
      const cy = Math.round(c.cy);
      const rw = Math.round(c.rw);
      const rh = Math.round(c.rh);

      // Base shadow diamond
      ctx.beginPath();
      ctx.moveTo(cx, cy - rh);
      ctx.lineTo(cx + rw, cy);
      ctx.lineTo(cx, cy + rh);
      ctx.lineTo(cx - rw, cy);
      ctx.closePath();
      ctx.fillStyle = '#022c22';
      ctx.fill();
      ctx.strokeStyle = '#011c15';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Mid-tone cluster
      ctx.beginPath();
      ctx.moveTo(cx, cy - rh + 2);
      ctx.lineTo(cx + rw - 2, cy);
      ctx.lineTo(cx, cy + rh - 2);
      ctx.lineTo(cx - rw + 2, cy);
      ctx.closePath();
      ctx.fillStyle = isSnowy ? '#1e3a8a' : '#064e3b';
      ctx.fill();

      // Top highlight cluster
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - rh + 3);
      ctx.lineTo(cx + rw * 0.4, cy - rh * 0.3);
      ctx.lineTo(cx - 2, cy);
      ctx.lineTo(cx - rw * 0.4, cy - rh * 0.3);
      ctx.closePath();
      ctx.fillStyle = isSnowy ? '#e0f2fe' : '#10b981';
      ctx.fill();
    });
  }

  private static drawNorwaySpruce(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number,
    isSnowy: boolean
  ) {
    const sizeMult = 0.65 + (seed % 20) * 0.01;
    const treeH = Math.round(36 * zoom * sizeMult);
    const trunkW = Math.max(3, Math.round(4 * zoom));

    // Trunk
    ctx.fillStyle = '#271b14';
    ctx.fillRect(Math.round(sx - trunkW / 2), Math.round(sy - 8 * zoom), trunkW, Math.round(8 * zoom));
    ctx.strokeStyle = '#140c08';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(sx - trunkW / 2), Math.round(sy - 8 * zoom), trunkW, Math.round(8 * zoom));

    const tiers = [
      { y: sy - treeH * 0.22, span: 16 * zoom * sizeMult, depth: 8 * zoom },
      { y: sy - treeH * 0.46, span: 13 * zoom * sizeMult, depth: 7 * zoom },
      { y: sy - treeH * 0.70, span: 10 * zoom * sizeMult, depth: 6 * zoom },
      { y: sy - treeH * 0.95, span: 6 * zoom * sizeMult, depth: 5 * zoom }
    ];

    tiers.forEach((t, idx) => {
      const ty = Math.round(t.y);
      const span = Math.round(t.span);
      const depth = Math.round(t.depth);

      // Pixel triangle frond
      ctx.beginPath();
      ctx.moveTo(Math.round(sx), ty - depth);
      ctx.lineTo(Math.round(sx + span), ty);
      ctx.lineTo(Math.round(sx + span * 0.5), ty + 2);
      ctx.lineTo(Math.round(sx), ty + 3);
      ctx.lineTo(Math.round(sx - span * 0.5), ty + 2);
      ctx.lineTo(Math.round(sx - span), ty);
      ctx.closePath();

      ctx.fillStyle = isSnowy
        ? (idx === 3 ? '#e0f2fe' : (idx === 2 ? '#38bdf8' : '#0369a1'))
        : (idx === 3 ? '#10b981' : (idx === 2 ? '#047857' : '#064e3b'));
      ctx.fill();
      ctx.strokeStyle = isSnowy ? '#082f49' : '#022c22';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Top stepped light highlights
      ctx.fillStyle = isSnowy ? '#ffffff' : '#34d399';
      ctx.fillRect(Math.round(sx - span * 0.3), ty - Math.round(depth * 0.5), Math.round(span * 0.6), 2);
    });
  }

  private static drawGraniteBoulder(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number,
    biome: BiomeDefinition
  ) {
    const rockH = Math.round((18 + (seed % 8)) * zoom);
    const rockW = Math.round((18 + (seed % 6)) * zoom);

    // Faceted Pixel Rock Polygon
    ctx.beginPath();
    ctx.moveTo(Math.round(sx - rockW * 0.5), Math.round(sy));
    ctx.lineTo(Math.round(sx - rockW * 0.6), Math.round(sy - rockH * 0.45));
    ctx.lineTo(Math.round(sx - rockW * 0.25), Math.round(sy - rockH));
    ctx.lineTo(Math.round(sx + rockW * 0.35), Math.round(sy - rockH * 0.9));
    ctx.lineTo(Math.round(sx + rockW * 0.55), Math.round(sy - rockH * 0.3));
    ctx.lineTo(Math.round(sx + rockW * 0.45), Math.round(sy));
    ctx.closePath();

    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Top light facet
    ctx.beginPath();
    ctx.moveTo(Math.round(sx - rockW * 0.25), Math.round(sy - rockH));
    ctx.lineTo(Math.round(sx + rockW * 0.35), Math.round(sy - rockH * 0.9));
    ctx.lineTo(Math.round(sx + rockW * 0.1), Math.round(sy - rockH * 0.5));
    ctx.lineTo(Math.round(sx - rockW * 0.3), Math.round(sy - rockH * 0.55));
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();

    // Moss / Lichen pixel stipple
    ctx.fillStyle = '#10b981';
    ctx.fillRect(Math.round(sx - rockW * 0.15), Math.round(sy - rockH * 0.4), 3, 2);
    ctx.fillRect(Math.round(sx + rockW * 0.1), Math.round(sy - rockH * 0.35), 4, 2);
  }

  // ==========================================
  // --- 3. POHJOLA: FROZEN TREES & FROZEN GROUND ---
  // ==========================================

  private static drawFrozenSpruce(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const treeH = 36 * zoom;
    const trunkW = 3.5 * zoom;

    ctx.beginPath();
    ctx.rect(sx - trunkW / 2, sy - 6 * zoom, trunkW, 6 * zoom);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    const tiers = [
      { y: sy - treeH * 0.25, span: 16 * zoom, depth: 9 * zoom },
      { y: sy - treeH * 0.50, span: 13 * zoom, depth: 8 * zoom },
      { y: sy - treeH * 0.75, span: 10 * zoom, depth: 7 * zoom },
      { y: sy - treeH * 0.98, span: 6 * zoom, depth: 6 * zoom }
    ];

    tiers.forEach(t => {
      // Ice-glazed dark spruce base
      ctx.beginPath();
      ctx.moveTo(sx, t.y - t.depth);
      ctx.lineTo(sx + t.span, t.y);
      ctx.lineTo(sx, t.y + 1.5 * zoom);
      ctx.lineTo(sx - t.span, t.y);
      ctx.closePath();
      ctx.fillStyle = '#0f2942';
      ctx.fill();

      // Thick heavy snow blanket mounds on boughs
      ctx.beginPath();
      ctx.moveTo(sx, t.y - t.depth);
      ctx.quadraticCurveTo(sx + t.span * 0.5, t.y - t.depth * 0.3, sx + t.span * 0.9, t.y - 1 * zoom);
      ctx.quadraticCurveTo(sx + t.span * 0.4, t.y - t.depth * 0.05, sx, t.y - t.depth * 0.15);
      ctx.quadraticCurveTo(sx - t.span * 0.4, t.y - t.depth * 0.05, sx - t.span * 0.9, t.y - 1 * zoom);
      ctx.quadraticCurveTo(sx - t.span * 0.5, t.y - t.depth * 0.3, sx, t.y - t.depth);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 4;
      ctx.fill();

      // Dripping icicles
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        const ix = sx + (i / 2) * t.span * 0.7;
        const iy = t.y;
        ctx.beginPath();
        ctx.moveTo(ix - 1 * zoom, iy);
        ctx.lineTo(ix, iy + 4 * zoom);
        ctx.lineTo(ix + 1 * zoom, iy);
        ctx.closePath();
        ctx.fillStyle = '#bae6fd';
        ctx.fill();
      }
    });
  }

  private static drawFrozenPine(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const trunkH = 34 * zoom;
    const trunkW = 4 * zoom;

    // Dark frosty bark
    ctx.beginPath();
    ctx.rect(sx - trunkW / 2, sy - trunkH, trunkW, trunkH);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // Snow capped frozen crowns
    const crowns = [
      { cx: sx - 8 * zoom, cy: sy - trunkH * 0.7, r: 9 * zoom },
      { cx: sx + 9 * zoom, cy: sy - trunkH * 0.8, r: 10 * zoom },
      { cx: sx, cy: sy - trunkH * 1.05, r: 12 * zoom }
    ];

    crowns.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.fillStyle = '#0c4a6e';
      ctx.fill();

      // Thick dome of snow
      ctx.beginPath();
      ctx.arc(c.cx, c.cy - c.r * 0.4, c.r * 0.75, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#f0f9ff';
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 4;
      ctx.fill();
    });
  }

  private static drawGlacialIceSpire(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const spireH = (50 + (seed % 14)) * zoom;
    const spireW = 20 * zoom;

    ctx.beginPath();
    ctx.moveTo(sx - spireW * 0.5, sy);
    ctx.lineTo(sx - spireW * 0.35, sy - spireH * 0.7);
    ctx.lineTo(sx, sy - spireH);
    ctx.lineTo(sx + spireW * 0.35, sy - spireH * 0.7);
    ctx.lineTo(sx + spireW * 0.5, sy);
    ctx.closePath();

    ctx.fillStyle = '#0284c7';
    ctx.fill();
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glacial crystalline facets with specular glimmer
    ctx.beginPath();
    ctx.moveTo(sx, sy - spireH);
    ctx.lineTo(sx + spireW * 0.35, sy - spireH * 0.7);
    ctx.lineTo(sx, sy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
    ctx.fill();
  }

  // ==========================================
  // --- 4. TUONELA: UNDERWORLD OF DESPAIR (IRON NETS, BONE CAIRNS, KELO TREES, GRAVES) ---
  // ==========================================

  // Palette Helper for Tuonela Grim Underworld Colors
  private static getTuonelaPalette(seed: number) {
    const palettes = [
      { stone: '#0e0b16', accent: '#22d3ee', glow: '#06b6d4', bone: '#e2e8f0', rust: '#78350f', name: 'corpse_cyan' },
      { stone: '#090d0b', accent: '#34d399', glow: '#059669', bone: '#cbd5e1', rust: '#9a3412', name: 'phantom_emerald' },
      { stone: '#12091c', accent: '#a855f7', glow: '#7e22ce', bone: '#f1f5f9', rust: '#b45309', name: 'necro_violet' },
      { stone: '#0a0d14', accent: '#38bdf8', glow: '#0284c7', bone: '#cbd5e1', rust: '#7c2d12', name: 'stygian_frost' },
      { stone: '#160808', accent: '#ef4444', glow: '#991b1b', bone: '#fca5a5', rust: '#450a0a', name: 'blood_rust' },
      { stone: '#0b0912', accent: '#94a3b8', glow: '#64748b', bone: '#f8fafc', rust: '#78350f', name: 'ash_slate' }
    ];
    return palettes[Math.abs(seed) % palettes.length];
  }

  // 1. TUONI'S IRON NETS & SCYTHE PALISADE (Tuonen Rautaverkot & Rysät)
  // Forged by Tuonen tytöt with thousands of iron needles, barbed copper chains & trapped skulls
  private static drawTuonelaIronNetSpikes(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const postH = (48 + (seed % 12)) * zoom;
    const postW = (6 + (seed % 3)) * zoom;
    const span = 22 * zoom;

    // Dark rusted iron corner posts
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1.5;

    // Left post
    ctx.fillRect(sx - span, sy - postH * 0.9, postW, postH * 0.9);
    ctx.strokeRect(sx - span, sy - postH * 0.9, postW, postH * 0.9);

    // Right post
    ctx.fillRect(sx + span - postW, sy - postH, postW, postH);
    ctx.strokeRect(sx + span - postW, sy - postH, postW, postH);

    // Razor-sharp barbed iron spikes atop posts
    ctx.beginPath();
    ctx.moveTo(sx - span, sy - postH * 0.9);
    ctx.lineTo(sx - span + postW / 2, sy - postH * 0.9 - 10 * zoom);
    ctx.lineTo(sx - span + postW, sy - postH * 0.9);
    ctx.fillStyle = '#78716c';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sx + span - postW, sy - postH);
    ctx.lineTo(sx + span - postW / 2, sy - postH - 12 * zoom);
    ctx.lineTo(sx + span, sy - postH);
    ctx.fillStyle = '#78716c';
    ctx.fill();

    // Woven Iron Net Grid (Rautaiset Verkot)
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.75)';
    ctx.lineWidth = 1.2 * zoom;

    for (let r = 0; r < 5; r++) {
      const ny = sy - postH * 0.2 - r * (postH * 0.14);
      ctx.beginPath();
      ctx.moveTo(sx - span + postW, ny);
      ctx.lineTo(sx + span - postW, ny + ((seed % 4) - 2) * zoom);
      ctx.stroke();
    }

    for (let c = 0; c < 6; c++) {
      const nx = sx - span + postW + c * ((span * 2 - postW * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(nx, sy - postH * 0.8);
      ctx.lineTo(nx + ((seed % 4) - 2) * zoom, sy);
      ctx.stroke();
    }

    // Trapped Skull caught in the iron net
    const skX = sx + ((seed % 6) - 3) * zoom;
    const skY = sy - postH * 0.45;
    ctx.beginPath();
    ctx.arc(skX, skY, 4.5 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = pal.bone;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 6;
    ctx.fill();

    // Skull Eye Sockets
    ctx.fillStyle = '#020104';
    ctx.fillRect(skX - 2 * zoom, skY - 1 * zoom, 1.4 * zoom, 1.8 * zoom);
    ctx.fillRect(skX + 0.6 * zoom, skY - 1 * zoom, 1.4 * zoom, 1.8 * zoom);

    // Upright scythe blade in center
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 3 * zoom, sy - postH * 0.7);
    ctx.quadraticCurveTo(sx - 16 * zoom, sy - postH * 0.85, sx - 12 * zoom, sy - postH * 0.6);
    ctx.lineTo(sx, sy - postH * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 2. GNARLED SKELETAL DEATH PINE (Surukuusi / Kalman Kelopuu)
  // Twisted dead petrified tree with barren branches, weeping dark sap & hanging burial shrouds
  private static drawTuonelaGnarledDeathTree(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const treeH = (56 + (seed % 16)) * zoom;
    const trunkW = (9 + (seed % 4)) * zoom;
    const lean = ((seed % 10) - 5) * 1.8 * zoom;

    // Twisted, gnarled dead trunk (Bone-slate & charcoal)
    ctx.beginPath();
    ctx.moveTo(sx - trunkW * 0.7, sy);
    ctx.bezierCurveTo(
      sx - 12 * zoom + lean, sy - treeH * 0.35,
      sx + 10 * zoom + lean, sy - treeH * 0.65,
      sx + lean, sy - treeH
    );
    ctx.bezierCurveTo(
      sx + 12 * zoom + lean, sy - treeH * 0.6,
      sx + trunkW * 0.7, sy - treeH * 0.3,
      sx + trunkW * 0.7, sy
    );
    ctx.closePath();
    ctx.fillStyle = '#0f0e17';
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Clawing subterranean root grips
    ctx.beginPath();
    ctx.moveTo(sx - trunkW * 0.7, sy - 3 * zoom);
    ctx.quadraticCurveTo(sx - trunkW - 10 * zoom, sy - 1 * zoom, sx - trunkW - 16 * zoom, sy + 3 * zoom);
    ctx.moveTo(sx + trunkW * 0.7, sy - 3 * zoom);
    ctx.quadraticCurveTo(sx + trunkW + 8 * zoom, sy - 1 * zoom, sx + trunkW + 14 * zoom, sy + 3 * zoom);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.5 * zoom;
    ctx.stroke();

    // Barren, jagged dead branches
    const branches = [
      { x: sx + lean * 0.4, y: sy - treeH * 0.5, bx: sx + lean - 20 * zoom, by: sy - treeH * 0.65 },
      { x: sx + lean * 0.6, y: sy - treeH * 0.65, bx: sx + lean + 22 * zoom, by: sy - treeH * 0.8 },
      { x: sx + lean * 0.8, y: sy - treeH * 0.8, bx: sx + lean - 14 * zoom, by: sy - treeH * 0.95 },
      { x: sx + lean, y: sy - treeH, bx: sx + lean + 10 * zoom, by: sy - treeH * 1.08 }
    ];

    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2.2 * zoom;
    branches.forEach(b => {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.quadraticCurveTo((b.x + b.bx) / 2 + ((seed % 4) - 2) * zoom, (b.y + b.by) / 2 - 4 * zoom, b.bx, b.by);
      ctx.stroke();

      // Hanging tattered burial shroud / weeping moss
      ctx.beginPath();
      ctx.moveTo(b.bx, b.by);
      ctx.quadraticCurveTo(b.bx + ((seed % 6) - 3) * zoom, b.by + 10 * zoom, b.bx, b.by + 18 * zoom);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.2 * zoom;
      ctx.stroke();

      // Weeping black ichor droplet
      ctx.beginPath();
      ctx.arc(b.bx, b.by + 18 * zoom, 1.8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = pal.glow;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 6;
      ctx.fill();
    });

    // Impaled Skull on the trunk
    const impX = sx + lean * 0.5;
    const impY = sy - treeH * 0.55;
    ctx.beginPath();
    ctx.arc(impX, impY, 3.8 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = pal.bone;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.fillStyle = '#020104';
    ctx.fillRect(impX - 1.5 * zoom, impY - 0.8 * zoom, 1.2 * zoom, 1.5 * zoom);
    ctx.fillRect(impX + 0.5 * zoom, impY - 0.8 * zoom, 1.2 * zoom, 1.5 * zoom);
  }

  // 3. WEEPING DESPAIR GRAVESTONES & BASALT TOMB (Tuonelan Kalmanpaasi)
  // Weathered ancient basalt tombstones carved with weeping death-runes & bone cairn base
  private static drawTuonelaWeepingTombstones(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const tombH = (44 + (seed % 10)) * zoom;
    const tombW = (22 + (seed % 6)) * zoom;

    // Bedrock base of dark ash stone
    ctx.beginPath();
    ctx.ellipse(sx, sy, tombW * 0.9, tombW * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#09070f';
    ctx.fill();

    // Main Cracked Basalt Headstone (Arched top)
    ctx.beginPath();
    ctx.moveTo(sx - tombW * 0.5, sy);
    ctx.lineTo(sx - tombW * 0.48, sy - tombH * 0.7);
    ctx.quadraticCurveTo(sx, sy - tombH * 1.05, sx + tombW * 0.48, sy - tombH * 0.7);
    ctx.lineTo(sx + tombW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#181324';
    ctx.fill();
    ctx.strokeStyle = '#382f4d';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Deep fracture / crack in the tombstone
    ctx.beginPath();
    ctx.moveTo(sx - tombW * 0.2, sy - tombH * 0.85);
    ctx.lineTo(sx + 2 * zoom, sy - tombH * 0.6);
    ctx.lineTo(sx - 3 * zoom, sy - tombH * 0.35);
    ctx.lineTo(sx + tombW * 0.3, sy);
    ctx.strokeStyle = '#030206';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Etched Weeping Kalevala Magic Symbol (Surun Merkki)
    const runes = ['⌘', '⚡', '☼', '☽', '★', '᯽', '✦', '⎈', '⚒', '۞', '𝄞', '❄', '≋', '▲', '⸙', '❦'];
    const rChar = runes[(seed + 3) % runes.length];
    ctx.font = `bold ${Math.floor(14 * zoom)}px "Cinzel", "Rajdhani", serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 10;
    ctx.fillText(rChar, sx, sy - tombH * 0.55);

    // Small secondary leaning gravestone beside it
    const sH = tombH * 0.55;
    const sW = tombW * 0.45;
    const sX = sx + tombW * 0.65;
    ctx.beginPath();
    ctx.moveTo(sX - sW * 0.5, sy);
    ctx.lineTo(sX - sW * 0.4, sy - sH);
    ctx.lineTo(sX + sW * 0.4, sy - sH * 0.85);
    ctx.lineTo(sX + sW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#110d1a';
    ctx.fill();
    ctx.strokeStyle = '#272036';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Bone fragments at tomb base
    for (let b = 0; b < 3; b++) {
      const bx = sx - tombW * 0.4 + b * (8 * zoom);
      const by = sy - 2 * zoom + (b % 2) * (3 * zoom);
      ctx.beginPath();
      ctx.arc(bx, by, 2.0 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = pal.bone;
      ctx.fill();
    }
  }

  // 4. SKULL CAIRN & BONE MOUND (Tuonen Kallokeko & Luuröykkiö)
  // Stacked skulls and ribcages of departed souls with glowing phantom corpse-flames in eye sockets
  private static drawTuonelaSkullCairn(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const moundW = (24 + (seed % 6)) * zoom;
    const moundH = (38 + (seed % 8)) * zoom;

    // Dark ash mound foundation
    ctx.beginPath();
    ctx.ellipse(sx, sy, moundW, moundW * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#08050e';
    ctx.fill();

    // Stacked Skulls forming the Cairn pyramid
    const skullPositions = [
      // Base layer
      { x: sx - 11 * zoom, y: sy - 4 * zoom, r: 4.5 * zoom },
      { x: sx - 4 * zoom, y: sy - 6 * zoom, r: 4.8 * zoom },
      { x: sx + 4 * zoom, y: sy - 5 * zoom, r: 4.6 * zoom },
      { x: sx + 11 * zoom, y: sy - 3 * zoom, r: 4.2 * zoom },
      // Mid layer
      { x: sx - 7 * zoom, y: sy - 14 * zoom, r: 4.4 * zoom },
      { x: sx, y: sy - 16 * zoom, r: 4.8 * zoom },
      { x: sx + 7 * zoom, y: sy - 13 * zoom, r: 4.3 * zoom },
      // Upper layer
      { x: sx - 3.5 * zoom, y: sy - 23 * zoom, r: 4.2 * zoom },
      { x: sx + 3.5 * zoom, y: sy - 22 * zoom, r: 4.1 * zoom },
      // Crown skull
      { x: sx, y: sy - 31 * zoom, r: 5.0 * zoom }
    ];

    skullPositions.forEach((sk, idx) => {
      // Skull dome
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, sk.r, 0, Math.PI * 2);
      ctx.fillStyle = pal.bone;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Eye sockets
      const eyeR = sk.r * 0.28;
      const eyeOff = sk.r * 0.35;
      ctx.fillStyle = '#020104';
      ctx.fillRect(sk.x - eyeOff - eyeR / 2, sk.y - eyeR / 2, eyeR, eyeR * 1.3);
      ctx.fillRect(sk.x + eyeOff - eyeR / 2, sk.y - eyeR / 2, eyeR, eyeR * 1.3);

      // Flickering Ghostly Corpse-Flame in top and center skull eyes
      if (idx === 9 || idx === 5) {
        ctx.beginPath();
        ctx.arc(sk.x - eyeOff, sk.y, eyeR * 0.7, 0, Math.PI * 2);
        ctx.arc(sk.x + eyeOff, sk.y, eyeR * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = pal.accent;
        ctx.shadowColor = pal.glow;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
    });

    // Ribcage bone spikes flanking the mound
    ctx.beginPath();
    ctx.moveTo(sx - moundW * 0.8, sy);
    ctx.quadraticCurveTo(sx - moundW - 6 * zoom, sy - moundH * 0.4, sx - moundW * 0.6, sy - moundH * 0.6);
    ctx.moveTo(sx + moundW * 0.8, sy);
    ctx.quadraticCurveTo(sx + moundW + 6 * zoom, sy - moundH * 0.4, sx + moundW * 0.6, sy - moundH * 0.6);
    ctx.strokeStyle = pal.bone;
    ctx.lineWidth = 1.8 * zoom;
    ctx.stroke();
  }

  // 5. UPRIGHT REAPER SCYTHES & SWORDS OF TUONI (Tuonen Viikatepaalu & Teräteline)
  // Razor scythes and executioner blades planted upright in dark stone to slice escaping souls
  private static drawTuonelaScytheRack(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const bladeH = (52 + (seed % 10)) * zoom;

    // Dark cracked obsidian boulder base
    ctx.beginPath();
    ctx.moveTo(sx - 16 * zoom, sy);
    ctx.lineTo(sx - 18 * zoom, sy - 14 * zoom);
    ctx.lineTo(sx, sy - 20 * zoom);
    ctx.lineTo(sx + 18 * zoom, sy - 12 * zoom);
    ctx.lineTo(sx + 16 * zoom, sy);
    ctx.closePath();
    ctx.fillStyle = '#0e0b16';
    ctx.fill();
    ctx.strokeStyle = '#272036';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 1. Massive Center Scythe of Tuoni (Viikate)
    const scytheX = sx;
    const scytheY = sy - bladeH;

    // Shaft
    ctx.beginPath();
    ctx.moveTo(sx, sy - 16 * zoom);
    ctx.lineTo(scytheX, scytheY);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3.5 * zoom;
    ctx.stroke();

    // Curved razor reaper scythe blade
    ctx.beginPath();
    ctx.moveTo(scytheX, scytheY);
    ctx.quadraticCurveTo(scytheX - 26 * zoom, scytheY - 8 * zoom, scytheX - 32 * zoom, scytheY + 12 * zoom);
    ctx.quadraticCurveTo(scytheX - 22 * zoom, scytheY + 2 * zoom, scytheX, scytheY + 6 * zoom);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Dried blood & poison on scythe tip
    ctx.beginPath();
    ctx.moveTo(scytheX - 26 * zoom, scytheY + 4 * zoom);
    ctx.lineTo(scytheX - 32 * zoom, scytheY + 12 * zoom);
    ctx.lineTo(scytheX - 28 * zoom, scytheY + 10 * zoom);
    ctx.fillStyle = '#991b1b';
    ctx.fill();

    // 2. Upright Executioner Swords planted on sides
    [-1, 1].forEach((side) => {
      const swX = sx + side * 12 * zoom;
      const swH = bladeH * 0.65;
      ctx.beginPath();
      ctx.moveTo(swX - 2 * zoom, sy - 12 * zoom);
      ctx.lineTo(swX, sy - swH);
      ctx.lineTo(swX + 2 * zoom, sy - 12 * zoom);
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crossguard
      ctx.beginPath();
      ctx.moveTo(swX - 5 * zoom, sy - swH + 8 * zoom);
      ctx.lineTo(swX + 5 * zoom, sy - swH + 8 * zoom);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2 * zoom;
      ctx.stroke();
    });
  }

  // 6. FERRY MOORING POST OF TUONEN TYTTI (Manalan Ruuhikelo & Kalmanlyhty)
  // Rotted ferry pier post, rusted mooring chains & swinging corpse-lantern with pulsing soul flame
  private static drawTuonelaFerryMooringPost(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const postH = (46 + (seed % 8)) * zoom;
    const postW = 10 * zoom;

    // Rotted black oak pier post
    ctx.beginPath();
    ctx.moveTo(sx - postW * 0.5, sy);
    ctx.lineTo(sx - postW * 0.45, sy - postH);
    ctx.lineTo(sx + postW * 0.45, sy - postH);
    ctx.lineTo(sx + postW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#14101d';
    ctx.fill();
    ctx.strokeStyle = '#2e253e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rusted iron mooring rings and wrapped chains
    for (let c = 0; c < 3; c++) {
      const cy = sy - postH * 0.3 - c * (8 * zoom);
      ctx.beginPath();
      ctx.ellipse(sx, cy, postW * 0.7, 2.5 * zoom, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.8 * zoom;
      ctx.stroke();
    }

    // Heavy iron mooring chain draping to the ground
    ctx.beginPath();
    ctx.moveTo(sx + postW * 0.4, sy - postH * 0.5);
    ctx.quadraticCurveTo(sx + 14 * zoom, sy - postH * 0.25, sx + 18 * zoom, sy);
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2 * zoom;
    ctx.stroke();

    // Horizontal lantern bracket
    const bracketX = sx - 16 * zoom;
    const bracketY = sy - postH * 0.85;
    ctx.beginPath();
    ctx.moveTo(sx - postW * 0.4, sy - postH * 0.85);
    ctx.lineTo(bracketX, bracketY);
    ctx.lineTo(bracketX, bracketY + 4 * zoom);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2 * zoom;
    ctx.stroke();

    // Hanging Corpse-Lantern
    const lanternY = bracketY + 12 * zoom;
    ctx.beginPath();
    ctx.moveTo(bracketX, bracketY);
    ctx.lineTo(bracketX, lanternY - 6 * zoom);
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Lantern Cage
    ctx.beginPath();
    ctx.rect(bracketX - 4 * zoom, lanternY - 6 * zoom, 8 * zoom, 12 * zoom);
    ctx.fillStyle = '#0c0a09';
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Pulsing Ghostly Soul Flame inside lantern
    ctx.beginPath();
    ctx.arc(bracketX, lanternY, 3.5 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bracketX, lanternY, 1.5 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 7. CHAINED OBSIDIAN MONOLITH OF DESPAIR (Kirottu Surumonoliitti)
  // Jagged pitch-black obsidian spire wrapped in barbed iron chains & glowing with stygian runes
  private static drawTuonelaDespairMonolith(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const spireH = (52 + (seed % 12)) * zoom;
    const spireW = 20 * zoom;

    // Jagged pitch-black obsidian spire
    ctx.beginPath();
    ctx.moveTo(sx - spireW * 0.5, sy);
    ctx.lineTo(sx - spireW * 0.45, sy - spireH * 0.75);
    ctx.lineTo(sx, sy - spireH);
    ctx.lineTo(sx + spireW * 0.45, sy - spireH * 0.75);
    ctx.lineTo(sx + spireW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#06040a';
    ctx.fill();
    ctx.strokeStyle = '#1e162a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center sharp obsidian facet ridge
    ctx.beginPath();
    ctx.moveTo(sx, sy - spireH);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = '#2e1c48';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Spiked Barbed Iron Chains wrapping the spire
    for (let c = 0; c < 3; c++) {
      const cy = sy - spireH * (0.28 + c * 0.24);
      ctx.beginPath();
      ctx.moveTo(sx - spireW * 0.42, cy - 3 * zoom);
      ctx.lineTo(sx + spireW * 0.42, cy + 3 * zoom);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.0 * zoom;
      ctx.stroke();

      // Barbed chain spikes
      ctx.beginPath();
      ctx.moveTo(sx - 4 * zoom, cy);
      ctx.lineTo(sx - 8 * zoom, cy - 4 * zoom);
      ctx.moveTo(sx + 4 * zoom, cy);
      ctx.lineTo(sx + 8 * zoom, cy + 4 * zoom);
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1.2 * zoom;
      ctx.stroke();
    }

    // Glowing Stygian Magic Symbol (Tuonen Loitsumerkki)
    const runes = ['⌘', '⚡', '☼', '☽', '★', '᯽', '✦', '⎈', '⚒', '۞', '𝄞', '❄', '≋', '▲', '⸙', '❦'];
    const rChar = runes[seed % runes.length];
    ctx.font = `bold ${Math.floor(15 * zoom)}px "Cinzel", "Rajdhani", serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 14;
    ctx.fillText(rChar, sx, sy - spireH * 0.65);
  }

  // 8. SOUL ALTAR & URN OF TRAPPED WEEPING SOULS (Tuonen Sielunalttari & Suru-uurna)
  // Stepped sacrificial altar holding an urn of trapped wailing soul-flames emitting ghost tendrils
  private static drawTuonelaSoulUrnAltar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const altarW = 26 * zoom;

    // Stepped stone base
    ctx.fillStyle = '#09070f';
    ctx.fillRect(sx - altarW * 0.6, sy - 4 * zoom, altarW * 1.2, 4 * zoom);
    ctx.fillStyle = '#120d1c';
    ctx.fillRect(sx - altarW * 0.45, sy - 12 * zoom, altarW * 0.9, 8 * zoom);
    ctx.fillStyle = '#1c152b';
    ctx.fillRect(sx - altarW * 0.35, sy - 20 * zoom, altarW * 0.7, 8 * zoom);

    ctx.strokeStyle = '#382f4d';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(sx - altarW * 0.6, sy - 4 * zoom, altarW * 1.2, 4 * zoom);
    ctx.strokeRect(sx - altarW * 0.45, sy - 12 * zoom, altarW * 0.9, 8 * zoom);
    ctx.strokeRect(sx - altarW * 0.35, sy - 20 * zoom, altarW * 0.7, 8 * zoom);

    // Stone Urn on top of altar
    const urnY = sy - 20 * zoom;
    ctx.beginPath();
    ctx.moveTo(sx - 7 * zoom, urnY);
    ctx.lineTo(sx - 9 * zoom, urnY - 14 * zoom);
    ctx.lineTo(sx + 9 * zoom, urnY - 14 * zoom);
    ctx.lineTo(sx + 7 * zoom, urnY);
    ctx.closePath();
    ctx.fillStyle = '#0b0814';
    ctx.fill();
    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Urn Rim
    ctx.beginPath();
    ctx.ellipse(sx, urnY - 14 * zoom, 10 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#181226';
    ctx.fill();
    ctx.stroke();

    // Trapped Wailing Soul Energy rising from the Urn
    ctx.beginPath();
    ctx.arc(sx, urnY - 16 * zoom, 6 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 18;
    ctx.fill();

    // Rising ghostly soul tendrils
    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.moveTo(sx + t * 4 * zoom, urnY - 16 * zoom);
      ctx.quadraticCurveTo(sx + t * 8 * zoom + ((seed % 4) - 2) * zoom, urnY - 26 * zoom, sx + t * 3 * zoom, urnY - 34 * zoom);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.lineWidth = 1.5 * zoom;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx + t * 3 * zoom, urnY - 34 * zoom, 1.8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = pal.bone;
      ctx.fill();
    }
  }

  // 9. HANGING IRON GIBBET CAGE (Manalan Rautahäkki & Kalmanpuomi)
  // Rusted iron gibbet post with hanging cage containing trapped skeleton & chains
  private static drawTuonelaIronCageGallows(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const postH = (52 + (seed % 8)) * zoom;

    // Upright wooden/iron gallows timber
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(sx - 4 * zoom, sy - postH, 8 * zoom, postH);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 4 * zoom, sy - postH, 8 * zoom, postH);

    // Overhanging horizontal beam
    const beamLen = 22 * zoom;
    ctx.fillRect(sx - 4 * zoom, sy - postH, beamLen, 6 * zoom);
    ctx.strokeRect(sx - 4 * zoom, sy - postH, beamLen, 6 * zoom);

    // Diagonal support strut
    ctx.beginPath();
    ctx.moveTo(sx + 4 * zoom, sy - postH + 16 * zoom);
    ctx.lineTo(sx + 14 * zoom, sy - postH + 6 * zoom);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3 * zoom;
    ctx.stroke();

    // Suspension chain
    const cageX = sx + beamLen - 4 * zoom;
    const chainTopY = sy - postH + 6 * zoom;
    const cageTopY = chainTopY + 12 * zoom;

    ctx.beginPath();
    ctx.moveTo(cageX, chainTopY);
    ctx.lineTo(cageX, cageTopY);
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Iron Gibbet Cage (Cylindrical cage)
    const cageW = 14 * zoom;
    const cageH = 22 * zoom;

    ctx.fillStyle = 'rgba(10, 8, 15, 0.85)';
    ctx.fillRect(cageX - cageW / 2, cageTopY, cageW, cageH);

    // Cage vertical bars
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.4 * zoom;
    for (let b = 0; b <= 4; b++) {
      const bx = cageX - cageW / 2 + b * (cageW / 4);
      ctx.beginPath();
      ctx.moveTo(bx, cageTopY);
      ctx.lineTo(bx, cageTopY + cageH);
      ctx.stroke();
    }

    // Cage horizontal iron bands
    ctx.strokeRect(cageX - cageW / 2, cageTopY, cageW, cageH);
    ctx.beginPath();
    ctx.moveTo(cageX - cageW / 2, cageTopY + cageH / 2);
    ctx.lineTo(cageX + cageW / 2, cageTopY + cageH / 2);
    ctx.stroke();

    // Trapped Skeleton inside cage
    ctx.beginPath();
    ctx.arc(cageX, cageTopY + 6 * zoom, 3.2 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = pal.bone;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.fillStyle = '#020104';
    ctx.fillRect(cageX - 1.2 * zoom, cageTopY + 5.2 * zoom, 1 * zoom, 1.2 * zoom);
    ctx.fillRect(cageX + 0.3 * zoom, cageTopY + 5.2 * zoom, 1 * zoom, 1.2 * zoom);
  }

  // 10. PETRIFIED ABYSSAL BONE SPIRE (Maanalainen Luupiikki)
  // Massive petrified ribcage & skeletal vertebrae arching upward like a gateway of despair
  private static drawTuonelaPetrifiedBoneSpire(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pal = this.getTuonelaPalette(seed);
    const archH = (48 + (seed % 10)) * zoom;
    const archSpan = (22 + (seed % 6)) * zoom;

    // Dark ash bedrock
    ctx.beginPath();
    ctx.ellipse(sx, sy, archSpan * 1.1, archSpan * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0812';
    ctx.fill();

    // Massive petrified bone rib arches
    for (let r = 0; r < 4; r++) {
      const curSpan = archSpan * (0.55 + r * 0.15);
      const curH = archH * (0.6 + r * 0.14);
      const yOff = r * (3 * zoom);

      ctx.beginPath();
      ctx.moveTo(sx - curSpan, sy - yOff);
      ctx.quadraticCurveTo(sx, sy - curH - yOff, sx + curSpan, sy - yOff);
      ctx.strokeStyle = pal.bone;
      ctx.lineWidth = 3.2 * zoom;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 6;
      ctx.stroke();

      // Vertebra joint notch
      ctx.beginPath();
      ctx.arc(sx, sy - curH - yOff, 2.5 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
    }

    // Center sharp bone needle spike
    ctx.beginPath();
    ctx.moveTo(sx - 3 * zoom, sy);
    ctx.lineTo(sx, sy - archH * 1.15);
    ctx.lineTo(sx + 3 * zoom, sy);
    ctx.closePath();
    ctx.fillStyle = pal.bone;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ==========================================
  // --- 5. ALINEN: DARK STONES, LAVA FLOWS & DECAYING WORLD ---
  // ==========================================

  private static drawSubterraneanRock(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number,
    biome: BiomeDefinition
  ) {
    const rockH = (42 + (seed % 14)) * zoom;
    const rockW = (28 + (seed % 8)) * zoom;

    ctx.beginPath();
    ctx.moveTo(sx - rockW * 0.5, sy);
    ctx.lineTo(sx - rockW * 0.6, sy - rockH * 0.4);
    ctx.lineTo(sx - rockW * 0.2, sy - rockH);
    ctx.lineTo(sx + rockW * 0.4, sy - rockH * 0.85);
    ctx.lineTo(sx + rockW * 0.55, sy - rockH * 0.25);
    ctx.lineTo(sx + rockW * 0.45, sy);
    ctx.closePath();

    ctx.fillStyle = '#1c0904';
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing Magma Fissure Vein
    ctx.beginPath();
    ctx.moveTo(sx - rockW * 0.2, sy - rockH);
    ctx.lineTo(sx, sy - rockH * 0.5);
    ctx.lineTo(sx - 4 * zoom, sy - rockH * 0.25);
    ctx.lineTo(sx + 3 * zoom, sy);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5 * zoom;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  private static drawDecayingRuinPillar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const pillarH = (46 + (seed % 12)) * zoom;
    const pillarW = 16 * zoom;

    // Crumbling decayed concrete pillar
    ctx.beginPath();
    ctx.moveTo(sx - pillarW * 0.5, sy);
    ctx.lineTo(sx - pillarW * 0.4, sy - pillarH * 0.7);
    ctx.lineTo(sx - pillarW * 0.2, sy - pillarH); // Broken cracked top
    ctx.lineTo(sx + pillarW * 0.35, sy - pillarH * 0.85);
    ctx.lineTo(sx + pillarW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#292524';
    ctx.fill();
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Exposed rusted rebar girders poking out
    ctx.beginPath();
    ctx.moveTo(sx - 2 * zoom, sy - pillarH);
    ctx.lineTo(sx - 4 * zoom, sy - pillarH - 8 * zoom);
    ctx.moveTo(sx + 3 * zoom, sy - pillarH * 0.9);
    ctx.lineTo(sx + 6 * zoom, sy - pillarH - 6 * zoom);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2 * zoom;
    ctx.stroke();
  }

  private static drawMagmaVent(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const ventH = 26 * zoom;
    const ventW = 24 * zoom;

    // Volcanic cone
    ctx.beginPath();
    ctx.moveTo(sx - ventW * 0.5, sy);
    ctx.lineTo(sx - ventW * 0.3, sy - ventH);
    ctx.lineTo(sx + ventW * 0.3, sy - ventH);
    ctx.lineTo(sx + ventW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#1c0502';
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing magma vent crater core
    ctx.beginPath();
    ctx.ellipse(sx, sy - ventH, ventW * 0.28, 4 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ea580c';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 14;
    ctx.fill();
  }

  // ==========================================
  // --- 6. YLINEN: CELESTIAL CRYSTAL LIGHT PILLARS (VALOPYLVÄÄT) ---
  // ==========================================

  private static drawGrandCelestialObeliskLightPillar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const h = (38 + (seed % 6)) * zoom;
    const w = (16 + (seed % 4)) * zoom;
    const baseW = w * 1.25;

    // 1. Compact Stepped Astral Gold/Slate Plinth
    ctx.beginPath();
    ctx.moveTo(sx - baseW * 0.5, sy);
    ctx.lineTo(sx - baseW * 0.38, sy - 4 * zoom);
    ctx.lineTo(sx + baseW * 0.38, sy - 4 * zoom);
    ctx.lineTo(sx + baseW * 0.5, sy);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2 * zoom;
    ctx.stroke();

    // 2. Translucent Crystal Obelisk Facets
    // Left Facet (Sapphire starlight)
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.5, sy - 4 * zoom);
    ctx.lineTo(sx - w * 0.32, sy - h * 0.82);
    ctx.lineTo(sx - w * 0.12, sy - h * 0.88);
    ctx.lineTo(sx - w * 0.15, sy - 4 * zoom);
    ctx.closePath();
    const leftGrad = ctx.createLinearGradient(sx - w * 0.5, sy, sx, sy - h);
    leftGrad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
    leftGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.85)');
    leftGrad.addColorStop(1, 'rgba(96, 165, 250, 0.9)');
    ctx.fillStyle = leftGrad;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // Center Facet (Radiant starlight cyan with internal light core)
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.15, sy - 4 * zoom);
    ctx.lineTo(sx - w * 0.12, sy - h * 0.88);
    ctx.lineTo(sx + w * 0.12, sy - h * 0.88);
    ctx.lineTo(sx + w * 0.15, sy - 4 * zoom);
    ctx.closePath();
    const centerGrad = ctx.createLinearGradient(sx, sy, sx, sy - h);
    centerGrad.addColorStop(0, 'rgba(2, 132, 199, 0.85)');
    centerGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.95)');
    centerGrad.addColorStop(0.85, 'rgba(224, 242, 254, 0.98)');
    centerGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // Right Facet (Solar Gold refraction)
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.15, sy - 4 * zoom);
    ctx.lineTo(sx + w * 0.12, sy - h * 0.88);
    ctx.lineTo(sx + w * 0.32, sy - h * 0.82);
    ctx.lineTo(sx + w * 0.5, sy - 4 * zoom);
    ctx.closePath();
    const rightGrad = ctx.createLinearGradient(sx + w * 0.5, sy, sx, sy - h);
    rightGrad.addColorStop(0, 'rgba(120, 53, 15, 0.9)');
    rightGrad.addColorStop(0.5, 'rgba(217, 119, 6, 0.85)');
    rightGrad.addColorStop(1, 'rgba(253, 230, 138, 0.9)');
    ctx.fillStyle = rightGrad;
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // 3. Pyramidion Apex Cap
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.32, sy - h * 0.82);
    ctx.lineTo(sx, sy - h);
    ctx.lineTo(sx + w * 0.32, sy - h * 0.82);
    ctx.lineTo(sx, sy - h * 0.88);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // Subtle Specular Apex Star Glint
    this.drawStarlightCrossFlare(ctx, sx, sy - h, 4 * zoom, '#ffffff', '#38bdf8');
  }

  private static drawTwinStarCrystalHelixPillar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const h = (40 + (seed % 6)) * zoom;
    const w = (18 + (seed % 4)) * zoom;

    // 1. Compact Base Plinth
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2 * zoom, w * 0.55, 3 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.2 * zoom;
    ctx.stroke();

    // 2. Internal Glowing Light Spine (contained inside pillar)
    ctx.beginPath();
    ctx.moveTo(sx, sy - 3 * zoom);
    ctx.lineTo(sx, sy - h * 0.85);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * zoom;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6 * zoom;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Left Slender Crystal Spire
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.45, sy - 3 * zoom);
    ctx.quadraticCurveTo(sx - w * 0.5, sy - h * 0.5, sx - w * 0.1, sy - h);
    ctx.lineTo(sx - w * 0.02, sy - h * 0.85);
    ctx.quadraticCurveTo(sx - w * 0.25, sy - h * 0.45, sx - w * 0.2, sy - 3 * zoom);
    ctx.closePath();
    const lGrad = ctx.createLinearGradient(sx - w * 0.5, sy, sx, sy - h);
    lGrad.addColorStop(0, 'rgba(30, 27, 75, 0.92)');
    lGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.88)');
    lGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = lGrad;
    ctx.fill();
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // 4. Right Slender Amethyst/Gold Spire
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.45, sy - 3 * zoom);
    ctx.quadraticCurveTo(sx + w * 0.5, sy - h * 0.5, sx + w * 0.1, sy - h);
    ctx.lineTo(sx + w * 0.02, sy - h * 0.85);
    ctx.quadraticCurveTo(sx + w * 0.25, sy - h * 0.45, sx + w * 0.2, sy - 3 * zoom);
    ctx.closePath();
    const rGrad = ctx.createLinearGradient(sx + w * 0.5, sy, sx, sy - h);
    rGrad.addColorStop(0, 'rgba(59, 7, 100, 0.92)');
    rGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.88)');
    rGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = rGrad;
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // Floating Starlight Diamond Core at center
    ctx.beginPath();
    ctx.arc(sx, sy - h * 0.5, 2.5 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Small apex sparkle
    this.drawStarlightCrossFlare(ctx, sx, sy - h, 4 * zoom, '#ffffff', '#38bdf8');
  }

  private static drawAstralKirjokansiPrismPillar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const h = (36 + (seed % 6)) * zoom;
    const w = (18 + (seed % 4)) * zoom;

    // 1. Stepped Cosmic Plinth
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.55, sy);
    ctx.lineTo(sx - w * 0.42, sy - 4 * zoom);
    ctx.lineTo(sx + w * 0.42, sy - 4 * zoom);
    ctx.lineTo(sx + w * 0.55, sy);
    ctx.closePath();
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2 * zoom;
    ctx.stroke();

    // 2. Layered Prismatic Crystal Column
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.42, sy - 4 * zoom);
    ctx.lineTo(sx - w * 0.3, sy - h * 0.82);
    ctx.lineTo(sx + w * 0.3, sy - h * 0.82);
    ctx.lineTo(sx + w * 0.42, sy - 4 * zoom);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(sx - w * 0.5, sy, sx + w * 0.5, sy - h);
    bodyGrad.addColorStop(0, 'rgba(30, 27, 75, 0.95)');
    bodyGrad.addColorStop(0.4, 'rgba(217, 119, 6, 0.88)');
    bodyGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.9)');
    bodyGrad.addColorStop(1, 'rgba(240, 249, 255, 0.98)');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    // Internal vertical starlight spine
    ctx.beginPath();
    ctx.moveTo(sx, sy - 4 * zoom);
    ctx.lineTo(sx, sy - h * 0.82);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5 * zoom;
    ctx.stroke();

    // 3. Crystal Crown Capstone
    const crownY = sy - h;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.32, crownY + 4 * zoom);
    ctx.lineTo(sx, crownY);
    ctx.lineTo(sx + w * 0.32, crownY + 4 * zoom);
    ctx.closePath();
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();

    this.drawStarlightCrossFlare(ctx, sx, crownY, 4 * zoom, '#ffffff', '#fbbf24');
  }

  private static drawCelestialClusteredCrystalSpire(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    zoom: number,
    seed: number
  ) {
    const h = (42 + (seed % 6)) * zoom;
    const hLeft = (28 + (seed % 4)) * zoom;
    const hRight = (32 + (seed % 4)) * zoom;
    const w = (20 + (seed % 4)) * zoom;

    // 1. Small Base
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2 * zoom, w * 0.55, 3 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2 * zoom;
    ctx.stroke();

    // 2. Left Side Spire
    this.drawSingleCrystalSpire(ctx, sx - w * 0.28, sy - 3 * zoom, w * 0.28, hLeft, '#1e3a8a', '#3b82f6', '#93c5fd', zoom);

    // 3. Right Side Spire
    this.drawSingleCrystalSpire(ctx, sx + w * 0.28, sy - 3 * zoom, w * 0.28, hRight, '#78350f', '#f59e0b', '#fde68a', zoom);

    // 4. Central Grand Crystal Spire
    this.drawSingleCrystalSpire(ctx, sx, sy - 3 * zoom, w * 0.36, h, '#0284c7', '#38bdf8', '#ffffff', zoom);

    // Subtle apex glints
    this.drawStarlightCrossFlare(ctx, sx, sy - 3 * zoom - h, 4 * zoom, '#ffffff', '#38bdf8');
  }

  private static drawSingleCrystalSpire(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    width: number,
    height: number,
    baseColor: string,
    midColor: string,
    topColor: string,
    zoom: number
  ) {
    // Left facet
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.5, cy);
    ctx.lineTo(cx - width * 0.15, cy - height * 0.85);
    ctx.lineTo(cx, cy - height);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    const lGrad = ctx.createLinearGradient(cx - width * 0.5, cy, cx, cy - height);
    lGrad.addColorStop(0, baseColor);
    lGrad.addColorStop(0.6, midColor);
    lGrad.addColorStop(1, topColor);
    ctx.fillStyle = lGrad;
    ctx.fill();
    ctx.strokeStyle = midColor;
    ctx.lineWidth = 0.8 * zoom;
    ctx.stroke();

    // Right facet
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - height);
    ctx.lineTo(cx + width * 0.15, cy - height * 0.85);
    ctx.lineTo(cx + width * 0.5, cy);
    ctx.closePath();
    const rGrad = ctx.createLinearGradient(cx + width * 0.5, cy, cx, cy - height);
    rGrad.addColorStop(0, baseColor);
    rGrad.addColorStop(0.5, midColor);
    rGrad.addColorStop(1, topColor);
    ctx.fillStyle = rGrad;
    ctx.shadowColor = midColor;
    ctx.shadowBlur = 6 * zoom;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = topColor;
    ctx.lineWidth = 0.8 * zoom;
    ctx.stroke();

    // Center ridge highlight
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.0 * zoom;
    ctx.stroke();
  }

  private static drawStarlightCrossFlare(
    ctx: CanvasRenderingContext2D,
    fx: number,
    fy: number,
    size: number,
    coreColor: string,
    glowColor: string
  ) {
    ctx.save();
    // Central glowing lens orb
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(1, size * 0.35), 0, Math.PI * 2);
    ctx.fillStyle = coreColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = size * 1.5;
    ctx.fill();

    // 4-Point Specular Star Spikes
    ctx.beginPath();
    ctx.moveTo(fx, fy - size);
    ctx.lineTo(fx + size * 0.15, fy);
    ctx.lineTo(fx, fy + size);
    ctx.lineTo(fx - size * 0.15, fy);
    ctx.closePath();
    ctx.moveTo(fx - size * 0.8, fy);
    ctx.lineTo(fx, fy + size * 0.15);
    ctx.lineTo(fx + size * 0.8, fy);
    ctx.lineTo(fx, fy - size * 0.15);
    ctx.closePath();
    ctx.fillStyle = coreColor;
    ctx.fill();
    ctx.restore();
  }
}
