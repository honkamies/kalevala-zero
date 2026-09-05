// Graphics & Retro Pixel Art Settings Modal UI for Sampo-Zero
// Allows live configuration of Pixel Resolution Presets, Bayer Dithering, Nordic Palettes, and CRT Scanlines.

import { graphicsEngine, GraphicsSettings, PixelResolutionMode, DitherMode, CRTMode } from '../engine/graphics';

export class GraphicsSettingsModalUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private onCloseCallback?: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.modalEl !== null;
  }

  show(onClose?: () => void) {
    this.close();
    this.onCloseCallback = onClose;
    this.render();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  private render() {
    const settings = graphicsEngine.getSettings();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'graphics-settings-modal';
    this.modalEl.className = 'interactive';
    this.modalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 8, 16, 0.88);
      backdrop-filter: blur(14px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 11000;
      animation: fadeIn 0.2s ease;
      pointer-events: auto;
    `;

    this.modalEl.innerHTML = `
      <div style="
        width: 720px; 
        max-width: 95vw; 
        max-height: 90vh;
        overflow-y: auto;
        background: rgba(13, 18, 29, 0.98); 
        border: 2px solid var(--border-glow); 
        border-radius: 10px; 
        padding: 24px 28px; 
        box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(56, 189, 248, 0.25);
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">🎨</span>
            <div>
              <div style="font-family:var(--font-rune); font-size:20px; color:var(--gold-runic); letter-spacing:2px;">
                GRAPHICS & RETRO PIXEL PROTOCOLS
              </div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                Virtual Low-Res Framebuffer, Bayer Dithering, Nordic Palette & CRT Simulation
              </div>
            </div>
          </div>

          <button id="btn-gfx-modal-close" style="
            background: transparent; 
            border: 1px solid var(--border-dim); 
            color: var(--text-muted); 
            font-size: 16px; 
            width: 32px; 
            height: 32px; 
            border-radius: 4px; 
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
          ">✕</button>
        </div>

        <!-- 1. RESOLUTION & PIXEL SCALING MODES -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 18px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>🕹️</span> PIXEL RESOLUTION & VIRTUAL FRAMEBUFFER
            </div>
            <span style="font-size:10px; color:var(--text-muted);">Affects entire game world & environment</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
            <button class="sampo-btn gfx-mode-btn ${settings.resolutionMode === 'retro-16bit' ? 'primary' : ''}" data-mode="retro-16bit" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🕹️ RETRO 16-BIT</span>
              <span style="font-size:9.5px; opacity:0.75;">~480p (SNES / Amiga)</span>
            </button>

            <button class="sampo-btn gfx-mode-btn ${settings.resolutionMode === 'retro-8bit' ? 'primary' : ''}" data-mode="retro-8bit" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">👾 RETRO 8-BIT</span>
              <span style="font-size:9.5px; opacity:0.75;">~320p (Lo-Fi Arcade)</span>
            </button>

            <button class="sampo-btn gfx-mode-btn ${settings.resolutionMode === 'retro-crisp' ? 'primary' : ''}" data-mode="retro-crisp" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🖥️ CRISP 32-BIT</span>
              <span style="font-size:9.5px; opacity:0.75;">~640p (High-Res Pixel)</span>
            </button>

            <button class="sampo-btn gfx-mode-btn ${settings.resolutionMode === 'hd-native' ? 'primary' : ''}" data-mode="hd-native" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">✨ HD NATIVE</span>
              <span style="font-size:9.5px; opacity:0.75;">Smooth Vector Mode</span>
            </button>
          </div>
        </div>

        <!-- 2. RETRO DITHERING & PALETTE QUANTIZATION -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 18px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--gold-runic); font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>🌲</span> COLOR DITHERING & PALETTE QUANTIZATION
            </div>
            <span style="font-size:10px; color:var(--text-muted);">Bayer 4x4 matrix ordered stippling</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px;">
            <button class="sampo-btn gfx-dither-btn ${settings.dithering === 'none' ? 'primary' : ''}" data-dither="none" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🚫 OFF (24-BIT)</span>
              <span style="font-size:9.5px; opacity:0.75;">True Color Pixels</span>
            </button>

            <button class="sampo-btn gfx-dither-btn ${settings.dithering === 'nordic32' ? 'primary' : ''}" data-dither="nordic32" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🌲 KALEVALA 32</span>
              <span style="font-size:9.5px; opacity:0.75;">Nordic 32-Color Palette</span>
            </button>

            <button class="sampo-btn gfx-dither-btn ${settings.dithering === 'amiga64' ? 'primary' : ''}" data-dither="amiga64" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🎨 AMIGA 64</span>
              <span style="font-size:9.5px; opacity:0.75;">64-Color VGA Dither</span>
            </button>

            <button class="sampo-btn gfx-dither-btn ${settings.dithering === 'subtle' ? 'primary' : ''}" data-dither="subtle" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">⚡ SUBTLE DITHER</span>
              <span style="font-size:9.5px; opacity:0.75;">Light Edge Stippling</span>
            </button>
          </div>
        </div>

        <!-- 3. CRT SCANLINES & MONITOR SIMULATION -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 18px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>📺</span> CRT SCANLINES & MONITOR SIMULATION
            </div>
            <span style="font-size:10px; color:var(--text-muted);">Hardware-accelerated raster overlay</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(3, 1fr)); gap:10px;">
            <button class="sampo-btn gfx-crt-btn ${settings.crtEffect === 'none' ? 'primary' : ''}" data-crt="none" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">🚫 OFF</span>
              <span style="font-size:9.5px; opacity:0.75;">Crisp Flat Glass</span>
            </button>

            <button class="sampo-btn gfx-crt-btn ${settings.crtEffect === 'subtle' ? 'primary' : ''}" data-crt="subtle" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">📏 SUBTLE SCANLINES</span>
              <span style="font-size:9.5px; opacity:0.75;">Light Phosphor Lines</span>
            </button>

            <button class="sampo-btn gfx-crt-btn ${settings.crtEffect === 'arcade' ? 'primary' : ''}" data-crt="arcade" style="font-size:11px; padding:10px 8px; flex-direction:column; gap:4px;">
              <span style="font-size:13px; font-weight:700;">📺 ARCADE CRT</span>
              <span style="font-size:9.5px; opacity:0.75;">Scanlines + Vignette</span>
            </button>
          </div>
        </div>

        <!-- 4. PIXEL SNAP & MISC -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 14px 18px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-family:var(--font-mono); font-size:12px; color:#fff; font-weight:700;">
              🔒 INTEGER PIXEL GRID SNAPPING
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              Locks camera & entity coordinates to integer virtual pixels (eliminates sub-pixel shimmering)
            </div>
          </div>

          <button id="btn-gfx-pixelsnap-toggle" class="sampo-btn ${settings.pixelSnap ? 'gold' : ''}" style="padding:6px 16px; font-size:11px;">
            ${settings.pixelSnap ? '✅ ENABLED' : '❌ DISABLED'}
          </button>
        </div>

        <!-- 5. SCREEN SHAKE & ACCESSIBILITY -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 14px 18px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-family:var(--font-mono); font-size:12px; color:#fff; font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>📳</span> SCREEN SHAKE & IMPACT TREMORS
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              Subtle camera rumble on firing, hits, explosions, and enemy deaths (toggle off for zero shaking)
            </div>
          </div>

          <button id="btn-gfx-screenshake-toggle" class="sampo-btn ${settings.screenShake ? 'primary' : ''}" style="padding:6px 16px; font-size:11px;">
            ${settings.screenShake ? '🔔 ENABLED' : '🔕 DISABLED'}
          </button>
        </div>

        <!-- FOOTER / LIVE STATUS -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-dim); padding-top:14px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-muted);">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--emerald-bio); box-shadow:0 0 8px var(--emerald-bio);"></span>
            <span>Live changes applied in real-time. Hotkey <strong style="color:var(--gold-runic); font-family:var(--font-mono);">[F8]</strong> cycles retro presets during gameplay.</span>
          </div>

          <button id="btn-gfx-modal-done" class="sampo-btn primary" style="padding:8px 24px;">
            DONE
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);
    this.bindEvents();
  }

  private bindEvents() {
    if (!this.modalEl) return;

    // Close buttons
    this.modalEl.querySelector('#btn-gfx-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-gfx-modal-done')?.addEventListener('click', () => this.close());

    // Resolution mode buttons
    this.modalEl.querySelectorAll('.gfx-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as PixelResolutionMode;
        if (mode) {
          graphicsEngine.updateSettings({ resolutionMode: mode, pixelScaleOverride: 0 });
          this.refreshButtons();
        }
      });
    });

    // Dither mode buttons
    this.modalEl.querySelectorAll('.gfx-dither-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dither = (e.currentTarget as HTMLElement).dataset.dither as DitherMode;
        if (dither) {
          graphicsEngine.updateSettings({ dithering: dither });
          this.refreshButtons();
        }
      });
    });

    // CRT mode buttons
    this.modalEl.querySelectorAll('.gfx-crt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crt = (e.currentTarget as HTMLElement).dataset.crt as CRTMode;
        if (crt) {
          graphicsEngine.updateSettings({ crtEffect: crt });
          this.refreshButtons();
        }
      });
    });

    // Pixel Snap toggle
    this.modalEl.querySelector('#btn-gfx-pixelsnap-toggle')?.addEventListener('click', () => {
      const cur = graphicsEngine.getSettings().pixelSnap;
      graphicsEngine.updateSettings({ pixelSnap: !cur });
      this.refreshButtons();
    });

    // Screen Shake toggle
    this.modalEl.querySelector('#btn-gfx-screenshake-toggle')?.addEventListener('click', () => {
      graphicsEngine.toggleScreenShake();
      this.refreshButtons();
    });
  }

  private refreshButtons() {
    if (!this.modalEl) return;
    const settings = graphicsEngine.getSettings();

    // Mode buttons
    this.modalEl.querySelectorAll('.gfx-mode-btn').forEach(btn => {
      const mode = (btn as HTMLElement).dataset.mode;
      if (mode === settings.resolutionMode) {
        btn.classList.add('primary');
      } else {
        btn.classList.remove('primary');
      }
    });

    // Dither buttons
    this.modalEl.querySelectorAll('.gfx-dither-btn').forEach(btn => {
      const dither = (btn as HTMLElement).dataset.dither;
      if (dither === settings.dithering) {
        btn.classList.add('primary');
      } else {
        btn.classList.remove('primary');
      }
    });

    // CRT buttons
    this.modalEl.querySelectorAll('.gfx-crt-btn').forEach(btn => {
      const crt = (btn as HTMLElement).dataset.crt;
      if (crt === settings.crtEffect) {
        btn.classList.add('primary');
      } else {
        btn.classList.remove('primary');
      }
    });

    // Pixel snap
    const snapBtn = this.modalEl.querySelector('#btn-gfx-pixelsnap-toggle') as HTMLElement | null;
    if (snapBtn) {
      if (settings.pixelSnap) {
        snapBtn.className = 'sampo-btn gold';
        snapBtn.textContent = '✅ ENABLED';
      } else {
        snapBtn.className = 'sampo-btn';
        snapBtn.textContent = '❌ DISABLED';
      }
    }

    // Screen shake
    const shakeBtn = this.modalEl.querySelector('#btn-gfx-screenshake-toggle') as HTMLElement | null;
    if (shakeBtn) {
      if (settings.screenShake) {
        shakeBtn.className = 'sampo-btn primary';
        shakeBtn.textContent = '🔔 ENABLED';
      } else {
        shakeBtn.className = 'sampo-btn';
        shakeBtn.textContent = '🔕 DISABLED';
      }
    }
  }
}
