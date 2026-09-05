// Cinematic Cyber-Kalevala Loading & Dimensional Warp Screen for Project Sampo-Zero

import { BIOMES, BiomeDefinition } from '../world/biomes';

export class LoadingScreenUI {
  private containerEl: HTMLElement | null = null;
  private progressFillEl: HTMLElement | null = null;
  private progressTextEl: HTMLElement | null = null;
  private statusTextEl: HTMLElement | null = null;
  private isVisible: boolean = false;

  private quotes: Record<string, string> = {
    ilman_luominen: '"Before the world was forged, the Water-Mother drifted in the cosmic swell, and the Primordial Duck dropped the cosmic egg into the void."',
    vainola: '"Väinölän kankahat kajahti — The iron pine woods resonated with origin spells, where ancient seekers sang iron out of the black mire."',
    pohjola: '"Northward lay Pohjola, shrouded in permafrost and perpetual blizzard, where Louhi guarded the multifaceted mill of fortune."',
    tuonela: '"Beyond the black swans of Tuoni lies the underworld of the unreturning. None step through the river of death without paying the toll."',
    alinen: '"In the subterranean magma forges of Alinen, Ilmarinen hammered the eternal dome of heaven from slag and meteorites."',
    ylinen: '"High above the celestial dome, Ukko the Thunderer commands the Golden Spire and unleashes lightning over the nine worlds."'
  };

  private statusMessages = [
    'CALIBRATING NEURAL LOOM MATRIX...',
    'SYNCHRONIZING VÄKI RESONATOR CONDUITS...',
    'SYNTHESIZING ISOMETRIC DUNGEON VOXELS...',
    'DECODING CHROMA-KEY RUNIC ASSETS...',
    'CONFIGURING MONOLITHIC CIPHER PROTOCOLS...',
    'INITIALIZING SPATIAL AMBIENCE & PARTICLES...'
  ];

  constructor() {
    this.createDom();
  }

  private createDom() {
    if (document.getElementById('sampo-loading-screen')) return;

    this.containerEl = document.createElement('div');
    this.containerEl.id = 'sampo-loading-screen';
    this.containerEl.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.96) 0%, rgba(4, 7, 14, 0.99) 100%);
      backdrop-filter: blur(14px);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #ffffff;
      font-family: var(--font-rune), serif;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
      user-select: none;
    `;

    document.body.appendChild(this.containerEl);
  }

  show(sectorId: string = 'ilman_luominen', customHeader?: string) {
    if (!this.containerEl) this.createDom();
    if (!this.containerEl) return;

    const biome: BiomeDefinition = BIOMES[sectorId] || BIOMES['ilman_luominen'];
    const quote = this.quotes[sectorId] || this.quotes['ilman_luominen'];

    this.containerEl.innerHTML = `
      <div style="
        max-width: 680px;
        width: 90%;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        animation: fadeIn 0.4s ease-out;
      ">
        <!-- Top Tech Subhead -->
        <div style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 4px; color: var(--cyan-core); text-transform: uppercase;">
          ${customHeader || 'REALM SYNCHRONIZATION // DIMENSIONAL WARP'}
        </div>

        <!-- Glowing Spinning Runic Compass -->
        <div style="position: relative; width: 80px; height: 80px; margin: 6px 0;">
          <div style="
            position: absolute; inset: 0;
            border: 2px dashed rgba(56, 189, 248, 0.4);
            border-radius: 50%;
            animation: spinRune 12s linear infinite;
          "></div>
          <div style="
            position: absolute; inset: 6px;
            border: 2px solid rgba(245, 158, 11, 0.6);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spinRuneReverse 4s linear infinite;
          "></div>
          <div style="
            position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-size: 26px; color: var(--gold-runic);
            filter: drop-shadow(0 0 12px var(--gold-runic));
          ">
            ᛋ
          </div>
        </div>

        <!-- Realm Title & Subtitle -->
        <div>
          <div style="
            font-size: 32px; font-weight: 900; letter-spacing: 3px;
            background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 30px rgba(56, 189, 248, 0.3);
            margin-bottom: 6px;
          ">
            ${biome.name}
          </div>
          <div style="font-family: var(--font-mono); font-size: 14px; color: var(--gold-runic); letter-spacing: 1px;">
            ${biome.finnishTitle}
          </div>
        </div>

        <!-- Lore Quote -->
        <div style="
          font-family: var(--font-rune);
          font-size: 13.5px;
          line-height: 1.6;
          color: #94a3b8;
          font-style: italic;
          background: rgba(0, 0, 0, 0.4);
          border-left: 2px solid var(--gold-runic);
          border-right: 2px solid var(--gold-runic);
          padding: 12px 20px;
          border-radius: 4px;
        ">
          ${quote}
        </div>

        <!-- Progress Bar Container -->
        <div style="width: 100%; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; margin-bottom: 6px; color: var(--text-muted);">
            <span id="loading-status-text">CALIBRATING NEURAL LOOM MATRIX...</span>
            <span id="loading-progress-percent" style="color: var(--cyan-core); font-weight: 700;">0%</span>
          </div>

          <div style="
            width: 100%; height: 6px;
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid var(--border-dim);
            border-radius: 3px;
            overflow: hidden;
            position: relative;
          ">
            <div id="loading-progress-fill" style="
              width: 0%; height: 100%;
              background: linear-gradient(90deg, #38bdf8 0%, #06b6d4 50%, #f59e0b 100%);
              box-shadow: 0 0 10px var(--cyan-core);
              transition: width 0.15s ease-out;
            "></div>
          </div>
        </div>
      </div>
    `;

    this.progressFillEl = this.containerEl.querySelector('#loading-progress-fill');
    this.progressTextEl = this.containerEl.querySelector('#loading-progress-percent');
    this.statusTextEl = this.containerEl.querySelector('#loading-status-text');

    this.containerEl.style.opacity = '1';
    this.containerEl.style.pointerEvents = 'auto';
    this.isVisible = true;
  }

  updateProgress(percent: number, message?: string) {
    const clamped = Math.min(100, Math.max(0, Math.round(percent * 100)));
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${clamped}%`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `${clamped}%`;
    }
    if (this.statusTextEl && message) {
      this.statusTextEl.textContent = message.toUpperCase();
    } else if (this.statusTextEl && !message) {
      const idx = Math.min(
        this.statusMessages.length - 1,
        Math.floor((clamped / 100) * this.statusMessages.length)
      );
      this.statusTextEl.textContent = this.statusMessages[idx];
    }
  }

  async hide(fadeDurationMs: number = 350): Promise<void> {
    if (!this.containerEl || !this.isVisible) return;
    this.updateProgress(1.0, 'WARP COMPLETE // ENTERING REALM');
    
    await new Promise(r => setTimeout(r, 120));

    this.containerEl.style.opacity = '0';
    this.containerEl.style.pointerEvents = 'none';

    await new Promise(r => setTimeout(r, fadeDurationMs));
    this.isVisible = false;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
