// Master Graphics Engine & Retro Pixel Post-Processing Pipeline for Sampo-Zero
// Supports Low-Res Virtual Framebuffers (16-Bit / 8-Bit / Crisp Pixel Art),
// Bayer 4x4 Ordered Dithering, Nordic 32-Color Palette Quantization, CRT Scanlines, and Integer Pixel Snapping.

export type PixelResolutionMode = 'retro-16bit' | 'retro-8bit' | 'retro-crisp' | 'hd-native';
export type DitherMode = 'none' | 'nordic32' | 'amiga64' | 'subtle';
export type CRTMode = 'none' | 'subtle' | 'arcade';

export interface GraphicsSettings {
  resolutionMode: PixelResolutionMode;
  dithering: DitherMode;
  crtEffect: CRTMode;
  pixelSnap: boolean;
  pixelScaleOverride: number; // 0 = auto from resolutionMode, 1..6 = manual integer scale
  screenShake: boolean; // Screen shake / tremors toggle (true = enabled, false = disabled)
}

const STORAGE_KEY = 'SAMPO_GRAPHICS_SETTINGS';

// 4x4 Bayer Dithering Matrix (Values 0..15)
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Precomputed 32-Color Kalevala Nordic Palette [R, G, B]
const NORDIC_PALETTE_32: [number, number, number][] = [
  // Deep Shadows & Obsidian
  [4, 6, 10],
  [10, 15, 26],
  [17, 24, 39],
  [30, 41, 59],
  // Stone & Steel
  [51, 65, 85],
  [71, 85, 105],
  [100, 116, 139],
  [148, 163, 184],
  [203, 213, 225],
  [248, 250, 252],
  // Pine Needle & Boreal Moss Greens
  [2, 44, 34],
  [6, 78, 59],
  [4, 120, 87],
  [16, 185, 129],
  [52, 211, 153],
  [110, 231, 183],
  // Frost & Cryogenic Runic Cyan
  [8, 47, 73],
  [3, 105, 161],
  [2, 132, 199],
  [56, 189, 248],
  [125, 211, 252],
  [186, 230, 253],
  // Runic Amber & Forge Fire Gold
  [69, 26, 3],
  [120, 53, 15],
  [180, 83, 9],
  [217, 119, 6],
  [245, 158, 11],
  [251, 191, 36],
  [254, 240, 138],
  // Tuoni Void Purple & Blood Crimson
  [46, 16, 101],
  [126, 34, 206],
  [168, 85, 247],
  [69, 10, 10],
  [185, 28, 28],
  [239, 68, 68]
];

export class GraphicsEngine {
  private static instance: GraphicsEngine;
  private settings: GraphicsSettings;
  private listeners: Array<(settings: GraphicsSettings) => void> = [];
  private crtOverlayEl: HTMLElement | null = null;

  private constructor() {
    this.settings = this.loadSettings();
    this.applyCRTEffect(this.settings.crtEffect);
  }

  public static getInstance(): GraphicsEngine {
    if (!GraphicsEngine.instance) {
      GraphicsEngine.instance = new GraphicsEngine();
    }
    return GraphicsEngine.instance;
  }

  public getSettings(): GraphicsSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<GraphicsSettings>) {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    this.applyCRTEffect(this.settings.crtEffect);
    this.notifyListeners();
  }

  public onSettingsChange(callback: (settings: GraphicsSettings) => void) {
    this.listeners.push(callback);
  }

  public isScreenShakeEnabled(): boolean {
    return this.settings.screenShake !== false;
  }

  public setScreenShake(enabled: boolean) {
    this.updateSettings({ screenShake: enabled });
  }

  public toggleScreenShake(): boolean {
    const next = !this.isScreenShakeEnabled();
    this.setScreenShake(next);
    return next;
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.getSettings()));
  }

  // Calculate internal virtual framebuffer dimensions based on active resolution mode
  public getVirtualDimensions(windowWidth: number, windowHeight: number): { width: number; height: number; scale: number } {
    let scale = 1;

    if (this.settings.pixelScaleOverride > 0) {
      scale = this.settings.pixelScaleOverride;
    } else {
      switch (this.settings.resolutionMode) {
        case 'retro-8bit':
          // Target ~180p vertical resolution (Classic Lo-Fi / Arcade / GBA)
          scale = Math.max(3, Math.round(windowHeight / 180));
          break;
        case 'retro-16bit':
          // Target ~270p vertical resolution (SNES / Sega Genesis / Amiga 90s ARPG)
          scale = Math.max(2, Math.round(windowHeight / 270));
          break;
        case 'retro-crisp':
          // Target ~360p vertical resolution (High-detail 32-bit pixel art)
          scale = Math.max(2, Math.round(windowHeight / 360));
          break;
        case 'hd-native':
        default:
          scale = 1;
          break;
      }
    }

    const width = Math.max(160, Math.floor(windowWidth / scale));
    const height = Math.max(90, Math.floor(windowHeight / scale));

    return { width, height, scale };
  }

  // Real-time Bayer Matrix Dithering & Color Quantization Post-Pass
  public applyRetroDithering(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (this.settings.dithering === 'none') return;

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const ditherSpread = this.settings.dithering === 'subtle' ? 14 : 26;
      const isNordic = this.settings.dithering === 'nordic32';

      for (let y = 0; y < height; y++) {
        const rowOffset = y * width * 4;
        const bayerRow = BAYER_4X4[y & 3];

        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x * 4;
          const alpha = data[idx + 3];
          if (alpha < 10) continue;

          const bayerVal = (bayerRow[x & 3] / 16 - 0.5) * ditherSpread;

          let r = Math.min(255, Math.max(0, data[idx] + bayerVal));
          let g = Math.min(255, Math.max(0, data[idx + 1] + bayerVal));
          let b = Math.min(255, Math.max(0, data[idx + 2] + bayerVal));

          if (isNordic) {
            // Find closest color in Nordic 32 Palette
            let closestDist = Infinity;
            let cr = r, cg = g, cb = b;

            for (let i = 0; i < NORDIC_PALETTE_32.length; i++) {
              const pal = NORDIC_PALETTE_32[i];
              const dr = r - pal[0];
              const dg = g - pal[1];
              const db = b - pal[2];
              // Weighted perceptual Euclidean color distance
              const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
              if (dist < closestDist) {
                closestDist = dist;
                cr = pal[0];
                cg = pal[1];
                cb = pal[2];
              }
            }

            data[idx] = cr;
            data[idx + 1] = cg;
            data[idx + 2] = cb;
          } else if (this.settings.dithering === 'amiga64') {
            // Fast 64-color quantization (4 steps per channel: 0, 85, 170, 255)
            data[idx] = Math.round(r / 85) * 85;
            data[idx + 1] = Math.round(g / 85) * 85;
            data[idx + 2] = Math.round(b / 85) * 85;
          } else {
            // Subtle dither (8-step quantization)
            data[idx] = Math.round(r / 32) * 32;
            data[idx + 1] = Math.round(g / 32) * 32;
            data[idx + 2] = Math.round(b / 32) * 32;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Retro dither post-process error:', e);
    }
  }

  // Update or Toggle DOM-based CRT Overlay
  private applyCRTEffect(mode: CRTMode) {
    if (!this.crtOverlayEl) {
      this.crtOverlayEl = document.getElementById('retro-crt-overlay');
      if (!this.crtOverlayEl) {
        this.crtOverlayEl = document.createElement('div');
        this.crtOverlayEl.id = 'retro-crt-overlay';
        document.body.appendChild(this.crtOverlayEl);
      }
    }

    if (mode === 'none') {
      this.crtOverlayEl.style.display = 'none';
      this.crtOverlayEl.className = '';
    } else if (mode === 'subtle') {
      this.crtOverlayEl.style.display = 'block';
      this.crtOverlayEl.className = 'crt-scanlines-subtle';
    } else if (mode === 'arcade') {
      this.crtOverlayEl.style.display = 'block';
      this.crtOverlayEl.className = 'crt-arcade-retro';
    }
  }

  private loadSettings(): GraphicsSettings {
    const defaults: GraphicsSettings = {
      resolutionMode: 'retro-16bit', // Chunky retro pixel resolution
      dithering: 'none',
      crtEffect: 'none',             // Clean display with zero artificial scanlines
      pixelSnap: true,               // Integer pixel snapping for sharp edges
      pixelScaleOverride: 0,
      screenShake: true              // Screen shake enabled by default (calm, subtle tremors)
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Failed to load graphics settings from localStorage:', e);
    }

    return defaults;
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save graphics settings to localStorage:', e);
    }
  }
}

export const graphicsEngine = GraphicsEngine.getInstance();
