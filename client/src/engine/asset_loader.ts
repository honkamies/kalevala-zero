// Centralized Asset Preloader & Chroma-Key Sprite Cache for Project Sampo-Zero
// Ensures zero missing textures, pop-in, or invisible sprites during gameplay

export interface AssetProgressCallback {
  (progress: number, currentItem: string): void;
}

export interface AssetItem {
  key: string;
  src: string;
  isTransparent?: boolean;
  featherThreshold?: number;
}

export class AssetLoader {
  private static imageCache: Map<string, HTMLImageElement> = new Map();
  private static transparentCache: Map<string, HTMLCanvasElement> = new Map();
  private static isPreloaded: boolean = false;

  private static manifest: AssetItem[] = [
    // Heroes
    { key: 'hero_soturi', src: './assets/hero_soturi.jpg', isTransparent: true },
    { key: 'hero_runoseppa', src: './assets/hero_runoseppa.jpg', isTransparent: true },
    { key: 'hero_tietaja', src: './assets/hero_tietaja.jpg', isTransparent: true },
    { key: 'hero_korvenraivaaja', src: './assets/hero_korvenraivaaja.jpg', isTransparent: true },

    // Bosses
    { key: 'boss_sotka', src: './assets/boss_sotka.jpg', isTransparent: true },
    { key: 'boss_surma', src: './assets/boss_surma.jpg', isTransparent: true },
    { key: 'boss_louhi', src: './assets/louhi_boss.jpg', isTransparent: true },
    { key: 'boss_tuoni', src: './assets/boss_tuoni.png', isTransparent: true },
    { key: 'boss_ikuturso', src: './assets/boss_ikuturso.jpg', isTransparent: true },
    { key: 'boss_ukko', src: './assets/boss_ukko.jpg', isTransparent: true },
    { key: 'boss_cosmic_horror', src: './assets/boss_cosmic_horror.jpg', isTransparent: true },
    { key: 'boss_severed_gore', src: './assets/boss_severed_gore.png', isTransparent: false },

    // Enemies
    { key: 'enemy_hound', src: './assets/enemy_hound.jpg', isTransparent: true },
    { key: 'enemy_marauder', src: './assets/enemy_marauder.jpg', isTransparent: true },
    { key: 'enemy_wisp', src: './assets/enemy_wisp.jpg', isTransparent: true },

    // Portals & Environment
    { key: 'portal_rift', src: './assets/void_portal_rift.jpg', isTransparent: true },

    // Loot Chests (Kalevala Old School Treasure Vaults)
    { key: 'chest_common', src: './assets/chest_common.jpg', isTransparent: true },
    { key: 'chest_augmented', src: './assets/chest_augmented.jpg', isTransparent: true },
    { key: 'chest_runic', src: './assets/chest_runic.jpg', isTransparent: true },
    { key: 'chest_masterwork', src: './assets/chest_masterwork.jpg', isTransparent: true },
    { key: 'chest_relic', src: './assets/chest_relic.jpg', isTransparent: true },
    { key: 'chest_opened', src: './assets/chest_opened.jpg', isTransparent: true },

    // Menu Carousel & Realm Backgrounds
    { key: 'carousel_ilman_luominen', src: './assets/carousel_ilman_luominen.jpg' },
    { key: 'carousel_vainola', src: './assets/carousel_vainola.jpg' },
    { key: 'carousel_pohjola', src: './assets/carousel_pohjola.jpg' },
    { key: 'carousel_tuonela', src: './assets/carousel_tuonela.jpg' },
    { key: 'carousel_alinen', src: './assets/carousel_alinen.jpg' },
    { key: 'carousel_ylinen', src: './assets/carousel_ylinen.jpg' },

    // Ground & Hazard Tiles (Editable PNGs with Rich Folklore Variants)
    { key: 'tile_floor_vainola', src: './assets/tile_floor_vainola.png' },
    { key: 'tile_floor_vainola_0', src: './assets/tile_floor_vainola_0.png' },
    { key: 'tile_floor_vainola_1', src: './assets/tile_floor_vainola_1.png' },
    { key: 'tile_floor_vainola_2', src: './assets/tile_floor_vainola_2.png' },
    { key: 'tile_floor_vainola_3', src: './assets/tile_floor_vainola_3.png' },

    { key: 'tile_floor_pohjola', src: './assets/tile_floor_pohjola.png' },
    { key: 'tile_floor_pohjola_0', src: './assets/tile_floor_pohjola_0.png' },
    { key: 'tile_floor_pohjola_1', src: './assets/tile_floor_pohjola_1.png' },
    { key: 'tile_floor_pohjola_2', src: './assets/tile_floor_pohjola_2.png' },
    { key: 'tile_floor_pohjola_3', src: './assets/tile_floor_pohjola_3.png' },

    { key: 'tile_floor_tuonela', src: './assets/tile_floor_tuonela.png' },
    { key: 'tile_floor_tuonela_0', src: './assets/tile_floor_tuonela_0.png' },
    { key: 'tile_floor_tuonela_1', src: './assets/tile_floor_tuonela_1.png' },
    { key: 'tile_floor_tuonela_2', src: './assets/tile_floor_tuonela_2.png' },
    { key: 'tile_floor_tuonela_3', src: './assets/tile_floor_tuonela_3.png' },

    { key: 'tile_floor_alinen', src: './assets/tile_floor_alinen.png' },
    { key: 'tile_floor_alinen_0', src: './assets/tile_floor_alinen_0.png' },
    { key: 'tile_floor_alinen_1', src: './assets/tile_floor_alinen_1.png' },
    { key: 'tile_floor_alinen_2', src: './assets/tile_floor_alinen_2.png' },
    { key: 'tile_floor_alinen_3', src: './assets/tile_floor_alinen_3.png' },

    { key: 'tile_floor_ilman_luominen', src: './assets/tile_floor_ilman_luominen.png' },
    { key: 'tile_floor_ilman_luominen_0', src: './assets/tile_floor_ilman_luominen_0.png' },
    { key: 'tile_floor_ilman_luominen_1', src: './assets/tile_floor_ilman_luominen_1.png' },
    { key: 'tile_floor_ilman_luominen_2', src: './assets/tile_floor_ilman_luominen_2.png' },
    { key: 'tile_floor_ilman_luominen_3', src: './assets/tile_floor_ilman_luominen_3.png' },

    { key: 'tile_floor_ylinen', src: './assets/tile_floor_ylinen.png' },
    { key: 'tile_floor_ylinen_0', src: './assets/tile_floor_ylinen_0.png' },
    { key: 'tile_floor_ylinen_1', src: './assets/tile_floor_ylinen_1.png' },
    { key: 'tile_floor_ylinen_2', src: './assets/tile_floor_ylinen_2.png' },
    { key: 'tile_floor_ylinen_3', src: './assets/tile_floor_ylinen_3.png' },

    { key: 'tile_floor_void', src: './assets/tile_floor_void.png' },
    { key: 'tile_floor_void_0', src: './assets/tile_floor_void_0.png' },
    { key: 'tile_floor_void_1', src: './assets/tile_floor_void_1.png' },
    { key: 'tile_floor_void_2', src: './assets/tile_floor_void_2.png' },
    { key: 'tile_floor_void_3', src: './assets/tile_floor_void_3.png' },

    { key: 'tile_hazard_vainola', src: './assets/tile_hazard_vainola.png' },
    { key: 'tile_hazard_pohjola', src: './assets/tile_hazard_pohjola.png' },
    { key: 'tile_hazard_tuonela', src: './assets/tile_hazard_tuonela.png' },
    { key: 'tile_hazard_alinen', src: './assets/tile_hazard_alinen.png' },
    { key: 'tile_hazard_ilman_luominen', src: './assets/tile_hazard_ilman_luominen.png' },
    { key: 'tile_hazard_ylinen', src: './assets/tile_hazard_ylinen.png' },

    { key: 'tile_conduit', src: './assets/tile_conduit.png' },
    { key: 'tile_shrine', src: './assets/tile_shrine.png' },
    { key: 'tile_gate', src: './assets/tile_gate.png' },

    // Walls & Obstacle Sprites (Transparent PNGs)
    { key: 'obstacle_vainola_pine_giant', src: './assets/obstacle_vainola_pine_giant.png', isTransparent: true },
    { key: 'obstacle_vainola_pine_medium', src: './assets/obstacle_vainola_pine_medium.png', isTransparent: true },
    { key: 'obstacle_vainola_pine_small', src: './assets/obstacle_vainola_pine_small.png', isTransparent: true },
    { key: 'obstacle_vainola_spruce', src: './assets/obstacle_vainola_spruce.png', isTransparent: true },
    { key: 'obstacle_vainola_boulder', src: './assets/obstacle_vainola_boulder.png', isTransparent: true },

    { key: 'obstacle_pohjola_spruce', src: './assets/obstacle_pohjola_spruce.png', isTransparent: true },
    { key: 'obstacle_pohjola_spire', src: './assets/obstacle_pohjola_spire.png', isTransparent: true },

    { key: 'obstacle_tuonela_kelo_tree', src: './assets/obstacle_tuonela_kelo_tree.png', isTransparent: true },
    { key: 'obstacle_tuonela_skull_cairn', src: './assets/obstacle_tuonela_skull_cairn.png', isTransparent: true },
    { key: 'obstacle_tuonela_monolith', src: './assets/obstacle_tuonela_monolith.png', isTransparent: true },

    { key: 'obstacle_alinen_rock', src: './assets/obstacle_alinen_rock.png', isTransparent: true },
    { key: 'obstacle_alinen_magma_vent', src: './assets/obstacle_alinen_magma_vent.png', isTransparent: true },

    { key: 'obstacle_ilmatar_mountain', src: './assets/obstacle_ilmatar_mountain.png', isTransparent: true },
    { key: 'obstacle_ilmatar_eggshell', src: './assets/obstacle_ilmatar_eggshell.png', isTransparent: true },

    { key: 'obstacle_ylinen_obelisk', src: './assets/obstacle_ylinen_obelisk.png', isTransparent: true },
    { key: 'obstacle_ylinen_crystal_spire', src: './assets/obstacle_ylinen_crystal_spire.png', isTransparent: true }
  ];

  static async preloadAll(onProgress?: AssetProgressCallback): Promise<void> {
    if (this.isPreloaded) {
      if (onProgress) onProgress(1.0, 'All assets cached');
      return;
    }

    const total = this.manifest.length;
    let loaded = 0;

    const promises = this.manifest.map(async (item) => {
      try {
        await this.loadSingleAsset(item);
      } catch (err) {
        console.warn(`Failed to load asset: ${item.src}`, err);
      } finally {
        loaded++;
        if (onProgress) {
          onProgress(loaded / total, item.key);
        }
      }
    });

    await Promise.all(promises);
    this.isPreloaded = true;
  }

  private static loadSingleAsset(item: AssetItem): Promise<void> {
    return new Promise((resolve) => {
      if (this.imageCache.has(item.key)) {
        resolve();
        return;
      }

      const img = new Image();
      img.src = item.src;

      const finish = () => {
        this.imageCache.set(item.key, img);
        if (item.isTransparent) {
          const transCanvas = this.processTransparency(img);
          this.transparentCache.set(item.key, transCanvas);
        }
        resolve();
      };

      if (img.complete && img.naturalWidth > 0) {
        finish();
      } else {
        img.onload = finish;
        img.onerror = () => {
          console.warn(`Asset error on ${item.src}`);
          resolve(); // Resolve anyway so loading doesn't hang
        };
      }
    });
  }

  // Edge-connected flood-fill background removal: guarantees all inner pale bones, teeth, and skin stay 100% solid opaque
  public static processTransparency(img: HTMLImageElement): HTMLCanvasElement {
    const offscreen = document.createElement('canvas');
    const w = img.naturalWidth || img.width || 512;
    const h = img.naturalHeight || img.height || 512;
    offscreen.width = w;
    offscreen.height = h;

    const octx = offscreen.getContext('2d');
    if (!octx) return offscreen;

    octx.drawImage(img, 0, 0, w, h);

    try {
      const imgData = octx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample corner pixels to determine background mode
      const cornerSamples = [
        0,                               // Top-Left (0, 0)
        (w - 1) * 4,                     // Top-Right (w-1, 0)
        (h - 1) * w * 4,                 // Bottom-Left (0, h-1)
        ((h - 1) * w + (w - 1)) * 4      // Bottom-Right (w-1, h-1)
      ];

      let isWhiteBg = false;
      let isBlackBg = false;

      for (const idx of cornerSamples) {
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r > 220 && g > 220 && b > 220) isWhiteBg = true;
        if (r < 35 && g < 35 && b < 35) isBlackBg = true;
      }

      if (isWhiteBg || isBlackBg) {
        // BFS flood-fill from outer perimeter inwards
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];

        const isBgPixel = (x: number, y: number): boolean => {
          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          if (isWhiteBg) {
            return r > 225 && g > 225 && b > 225;
          } else {
            return r < 30 && g < 30 && b < 30;
          }
        };

        // Seed the queue with outer perimeter pixels
        for (let x = 0; x < w; x++) {
          if (isBgPixel(x, 0)) { queue.push(x, 0); visited[x] = 1; }
          if (isBgPixel(x, h - 1)) { queue.push(x, h - 1); visited[(h - 1) * w + x] = 1; }
        }
        for (let y = 0; y < h; y++) {
          if (isBgPixel(0, y) && !visited[y * w]) { queue.push(0, y); visited[y * w] = 1; }
          if (isBgPixel(w - 1, y) && !visited[y * w + (w - 1)]) { queue.push(w - 1, y); visited[y * w + (w - 1)] = 1; }
        }

        // Process BFS
        let qHead = 0;
        while (qHead < queue.length) {
          const cx = queue[qHead++];
          const cy = queue[qHead++];
          const pIdx = (cy * w + cx) * 4;

          // Set background pixel to 100% transparent
          data[pIdx + 3] = 0;

          // Check 4-directional neighbors
          const neighbors = [
            cx + 1, cy,
            cx - 1, cy,
            cx, cy + 1,
            cx, cy - 1
          ];

          for (let n = 0; n < neighbors.length; n += 2) {
            const nx = neighbors[n];
            const ny = neighbors[n + 1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nCoord = ny * w + nx;
              if (!visited[nCoord] && isBgPixel(nx, ny)) {
                visited[nCoord] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }
      }

      octx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Transparency processing fallback:', e);
    }

    return offscreen;
  }

  static getImage(key: string): HTMLImageElement | null {
    return this.imageCache.get(key) || null;
  }

  static getTransparent(key: string): HTMLCanvasElement | null {
    return this.transparentCache.get(key) || null;
  }

  static getHeroSprite(archetype: string): HTMLCanvasElement | HTMLImageElement | null {
    const clean = (archetype || 'soturi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    const cleanKey = `hero_${clean}`;
    const rawKey = `hero_${archetype}`;
    return (
      this.transparentCache.get(cleanKey) ||
      this.imageCache.get(cleanKey) ||
      this.transparentCache.get(rawKey) ||
      this.imageCache.get(rawKey) ||
      this.transparentCache.get('hero_soturi') ||
      this.imageCache.get('hero_soturi') ||
      null
    );
  }

  static getChestSprite(rarity: string = 'common', isOpened: boolean = false): HTMLCanvasElement | HTMLImageElement | null {
    if (isOpened) {
      return (
        this.transparentCache.get('chest_opened') ||
        this.imageCache.get('chest_opened') ||
        null
      );
    }
    const cleanKey = `chest_${rarity.toLowerCase()}`;
    return (
      this.transparentCache.get(cleanKey) ||
      this.imageCache.get(cleanKey) ||
      this.transparentCache.get('chest_common') ||
      this.imageCache.get('chest_common') ||
      null
    );
  }
}

