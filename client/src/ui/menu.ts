// Main Menu & Kalevala Cosmological Realm Carousel
// Streamlined interactive carousel for linear progression across the 6 realms:
// 1. Ilman Luominen -> 2. Väinölä -> 3. Pohjola -> 4. Tuonela -> 5. Alinen -> 6. Ylinen

import { SAGA_PATH } from '../world/biomes';
import { soundEngine } from '../engine/audio';
import { Player } from '../entities/player';
import { HeroRenderer } from '../engine/hero_renderer';
import { SoundSettingsModalUI } from './sound_settings_modal';
import { GraphicsSettingsModalUI } from './graphics_settings_modal';

export class MainMenuUI {
  private root: HTMLElement;
  private menuEl: HTMLElement | null = null;
  private onStartSectorCallback: (sectorId: string) => void;
  private onOpenCharacterSelectionCallback: () => void;
  private onOpenProfileManagerCallback: () => void;
  private onStartSideScrollerCallback?: (themeId: string) => void;
  private soundModal: SoundSettingsModalUI;
  private graphicsModal: GraphicsSettingsModalUI;

  private currentIndex: number = 0;
  private clearedSectors: string[] = [];
  private sectorClears: Record<string, number> = {};
  private player?: Player;
  private unlockedMap: Record<string, boolean> = {};
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  private biomeImages: Record<string, string> = {
    ilman_luominen: './assets/carousel_ilman_luominen.jpg',
    vainola: './assets/carousel_vainola.jpg',
    pohjola: './assets/carousel_pohjola.jpg',
    tuonela: './assets/carousel_tuonela.jpg',
    alinen: './assets/carousel_alinen.jpg',
    ylinen: './assets/carousel_ylinen.jpg'
  };

  private bossImages: Record<string, string> = {
    ilman_luominen: './assets/thumb_boss_sotka.jpg',
    vainola: './assets/thumb_boss_surma.jpg',
    pohjola: './assets/thumb_boss_louhi.jpg',
    tuonela: './assets/thumb_boss_tuoni.png',
    alinen: './assets/thumb_boss_ikuturso.jpg',
    ylinen: './assets/thumb_boss_ukko.jpg'
  };

  constructor(
    root: HTMLElement,
    onStartSector: (sectorId: string) => void,
    onOpenCharacterSelection: () => void,
    onOpenProfileManager: () => void,
    onStartSideScroller?: (themeId: string) => void
  ) {
    this.root = root;
    this.onStartSectorCallback = onStartSector;
    this.onOpenCharacterSelectionCallback = onOpenCharacterSelection;
    this.onOpenProfileManagerCallback = onOpenProfileManager;
    this.onStartSideScrollerCallback = onStartSideScroller;
    this.soundModal = new SoundSettingsModalUI(root);
    this.graphicsModal = new GraphicsSettingsModalUI(root);
    this.preloadImages();
  }

  private preloadImages() {
    Object.values(this.biomeImages).forEach(src => {
      const img = new Image();
      img.src = src;
    });
    Object.values(this.bossImages).forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }

  isOpen(): boolean {
    return this.menuEl !== null;
  }

  show(clearedSectors: string[] = [], player?: Player, sectorClears: Record<string, number> = {}) {
    this.hide();

    this.clearedSectors = clearedSectors;
    this.sectorClears = sectorClears;
    this.player = player;

    // Calculate unlocked map and find highest available realm
    this.unlockedMap = {};
    let initialIndex = 0;

    SAGA_PATH.forEach((biome, idx) => {
      if (idx === 0) {
        this.unlockedMap[biome.id] = true;
      } else {
        const prevBiome = SAGA_PATH[idx - 1];
        this.unlockedMap[biome.id] = this.clearedSectors.includes(prevBiome.id);
      }

      if (this.unlockedMap[biome.id] && !this.clearedSectors.includes(biome.id)) {
        initialIndex = idx;
      }
    });

    this.currentIndex = initialIndex;

    this.buildBaseUI();
    this.renderSlide(this.currentIndex, false);
    this.bindKeyboardNav();
  }

  private buildBaseUI() {
    this.menuEl = document.createElement('div');
    this.menuEl.id = 'main-menu';

    const totalCleared = this.clearedSectors.length;
    const progressPct = Math.round((totalCleared / SAGA_PATH.length) * 100);

    this.menuEl.innerHTML = `
      <!-- TOP GRAND LOGO (Matched width to carousel image) -->
      <div class="carousel-menu-header">
        <div class="carousel-brand centered">
          <h1 class="main-page-grand-logo">KALEVALA-ZERO</h1>
          <div class="main-page-grand-sub">ᚲᚨᛚᛖᚡᚨᛚᚨ // CYBER-KALEVALA REALM ODYSSEY</div>
        </div>
      </div>

      <!-- MAIN CAROUSEL WRAPPER -->
      <div class="realm-carousel-wrapper">
        <!-- LEFT NAV BUTTON -->
        <button id="carousel-btn-prev" class="carousel-nav-btn prev" aria-label="Previous Realm">
          ❮
        </button>

        <!-- CAROUSEL CARD CONTAINER -->
        <div id="carousel-card-mount" class="carousel-card-mount">
          <!-- Slide injected dynamically -->
        </div>

        <!-- RIGHT NAV BUTTON -->
        <button id="carousel-btn-next" class="carousel-nav-btn next" aria-label="Next Realm">
          ❯
        </button>
      </div>

      <!-- CAROUSEL STEPPER / REALM SELECTOR (01 - 06) -->
      <div class="carousel-stepper-container">
        <div class="carousel-progress-track">
          <div class="carousel-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <div class="carousel-dots-list" id="carousel-dots-list">
          ${SAGA_PATH.map((b, idx) => {
            const isUnlocked = this.unlockedMap[b.id];
            const isCleared = this.clearedSectors.includes(b.id);
            let statusIcon = '🔒';
            if (isCleared) statusIcon = '★';
            else if (isUnlocked) statusIcon = '⚡';

            return `
              <button class="carousel-dot-btn ${idx === this.currentIndex ? 'active' : ''} ${isCleared ? 'cleared' : ''} ${isUnlocked ? 'unlocked' : 'locked'}" 
                data-index="${idx}" 
                title="Stage 0${b.order}: ${b.name}">
                <span class="dot-icon">${statusIcon}</span>
                <span class="dot-num">0${b.order}</span>
                <span class="dot-label">${b.name}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- BOTTOM ROW: ACTIVE OPERATIVE SUMMARY & PROFILE SWITCHER -->
      <div class="carousel-operative-row">
        <div class="carousel-operative-chip">
          <div class="operative-avatar-frame">
            <canvas id="menu-hero-avatar-canvas" width="46" height="46"></canvas>
          </div>
          <div class="operative-info">
            <div class="operative-status-label">ACTIVE OPERATIVE // LVL ${this.player ? this.player.level : 1}</div>
            <div class="operative-name">
              ${this.player ? this.player.name : 'Väinämöinen'} 
              <span class="operative-archetype">${this.player ? this.player.appearance.archetype.toUpperCase() : 'SOTURI'}</span>
            </div>
            <div class="operative-resources">
              <span>⚡ ${this.player ? this.player.naniteScrap : 150} SCRAP</span>
              <span>•</span>
              <span>${totalCleared}/6 REALMS</span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button id="btn-menu-profiles" class="sampo-btn small primary" title="Switch operative, create zero-stat character, or reset game">
              👥 PROFILES / RESET
            </button>
            <button id="btn-menu-customize-hero" class="sampo-btn small" title="Customize active operative blueprint">
              👤 CUSTOMIZE
            </button>
            <button id="btn-menu-graphics" class="sampo-btn small" title="Graphics, Pixel Resolution & Retro CRT Settings">
              🎨 GRAPHICS
            </button>
            <button id="btn-menu-audio" class="sampo-btn small" title="Audio & Music Jukebox Controls">
              🎚️ SOUND
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.menuEl);

    // Draw Operative Portrait
    const avatarCanvas = document.getElementById('menu-hero-avatar-canvas') as HTMLCanvasElement;
    if (avatarCanvas && this.player) {
      const ctx = avatarCanvas.getContext('2d');
      if (ctx) {
        HeroRenderer.drawPortrait(ctx, 23, 23, 42, this.player.appearance);
      }
    }

    // Bind Graphics Settings Modal Button
    document.getElementById('btn-menu-graphics')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.graphicsModal.show();
    });

    // Bind Sound Settings Modal Button
    document.getElementById('btn-menu-audio')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.soundModal.show();
    });

    // Bind Profiles / Reset Button
    document.getElementById('btn-menu-profiles')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.onOpenProfileManagerCallback();
    });

    // Bind Customize Hero Button
    document.getElementById('btn-menu-customize-hero')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.hide();
      this.onOpenCharacterSelectionCallback();
    });

    // Bind Nav Buttons
    document.getElementById('carousel-btn-prev')?.addEventListener('click', () => {
      this.prevSlide();
    });

    document.getElementById('carousel-btn-next')?.addEventListener('click', () => {
      this.nextSlide();
    });

    // Bind Dot Clicks
    const dotBtns = this.menuEl.querySelectorAll('.carousel-dot-btn');
    dotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
        if (idx !== this.currentIndex) {
          soundEngine.playRuneClick();
          this.renderSlide(idx, true);
        }
      });
    });
  }

  private renderSlide(index: number, playSound: boolean = false) {
    this.currentIndex = Math.max(0, Math.min(SAGA_PATH.length - 1, index));
    if (playSound) {
      soundEngine.playRuneClick();
    }

    const biome = SAGA_PATH[this.currentIndex];
    const isUnlocked = this.unlockedMap[biome.id];
    const isCleared = this.clearedSectors.includes(biome.id);
    const isCurrent = isUnlocked && !isCleared;
    const clears = this.sectorClears[biome.id] || 0;
    const diffMult = 1.0 + (clears * 0.35);
    const loopLevel = clears + 1;

    const bgImg = this.biomeImages[biome.id] || './assets/carousel_ilman_luominen.jpg';
    const bossImg = this.bossImages[biome.id] || './assets/thumb_boss_sotka.jpg';

    const tierBadge = {
      genesis: '⚡ ALKULUOMINEN (STAGE 01 // GENESIS)',
      middle: '🌲 KESKIMAA (STAGE 02 // LIVING REALM)',
      north: '❄️ POHJOLA (STAGE 03 // FROZEN NORTH)',
      underworld: '💀 TUONELA (STAGE 04 // UNDERWORLD OF DESPAIR)',
      abyss: '🌋 ALINEN (STAGE 05 // ABYSSAL TRENCH)',
      celestial: '✨ YLISMAA (STAGE 06 // CELESTIAL ZENITH)'
    }[biome.tier];

    const prevBiomeName = this.currentIndex > 0 ? SAGA_PATH[this.currentIndex - 1].boss.name : 'Unknown';

    const cardMount = document.getElementById('carousel-card-mount');
    if (!cardMount) return;

    cardMount.innerHTML = `
      <div class="realm-hero-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current-target' : ''}" style="
        background: linear-gradient(180deg, rgba(8, 12, 22, 0.72) 0%, rgba(5, 8, 15, 0.94) 70%, rgba(3, 5, 10, 0.99) 100%),
                    url('${bgImg}') center/cover no-repeat;
        border-color: ${isCurrent ? 'var(--gold-runic)' : isCleared ? '#10b981' : isUnlocked ? 'var(--cyan-core)' : 'rgba(255,255,255,0.1)'};
        box-shadow: ${isCurrent ? '0 0 35px rgba(245, 158, 11, 0.35)' : isCleared ? '0 0 25px rgba(16, 185, 129, 0.25)' : '0 20px 50px rgba(0,0,0,0.85)'};
      ">
        <!-- TOP STATUS CHIPS -->
        <div class="card-top-chips">
          <div class="chip-tier">${tierBadge}</div>
          <div class="chip-status-group">
            <span class="chip-level">REC. LVL ${biome.recommendedLevel}</span>
            ${clears > 0 ? `
              <span style="background:rgba(245,158,11,0.22); border:1px solid #f59e0b; color:#fde047; font-family:var(--font-mono); font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:1px; text-shadow:0 0 8px rgba(245,158,11,0.8);">
                🔥 LOOP ${loopLevel} (x${diffMult.toFixed(2)})
              </span>
            ` : ''}
            <span class="chip-badge ${isCleared ? 'cleared' : isCurrent ? 'current' : isUnlocked ? 'unlocked' : 'locked'}">
              ${isCleared ? `★ CONQUERED (${clears}x)` : isCurrent ? '⚡ CURRENT OBJECTIVE' : isUnlocked ? 'UNLOCKED' : '🔒 SEALED'}
            </span>
          </div>
        </div>

        <!-- REALM TITLE & FINNISH SUBTITLE -->
        <div class="card-title-section">
          <h1 class="realm-title-text">${biome.order}. ${biome.name.toUpperCase()}</h1>
          <div class="realm-finnish-title">${biome.finnishTitle}</div>
          <div class="realm-description">${biome.description}</div>
        </div>

        <!-- OVERDRIVE DIFFICULTY MASTERY CHIP -->
        ${clears > 0 ? `
          <div style="
            background: linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(239, 68, 68, 0.12) 100%);
            border: 1px solid rgba(245, 158, 11, 0.45);
            border-radius: 6px;
            padding: 8px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: var(--font-mono);
            font-size: 11px;
            margin: -6px 0 8px 0;
          ">
            <span style="color:#fcd34d; font-weight:700;">🔥 OVERDRIVE TIER ${clears}: x${diffMult.toFixed(2)} HARDNESS (HP & DMG)</span>
            <span style="color:#67e8f9;">💰 +${Math.round(clears * 30)}% SCRAP • ⚡ +${Math.round(clears * 25)}% XP</span>
          </div>
        ` : ''}

        <!-- KANTELETAR LORE QUOTE -->
        <div class="realm-kanteletar-box">
          <span class="rune-glyph">ᚱ</span>
          <span class="kanteletar-text">${biome.kanteletarVerse}</span>
        </div>

        <!-- TACTICAL BRIEFING (GUARDIAN & HAZARD) -->
        <div class="realm-tactical-grid">
          <!-- GUARDIAN -->
          <div class="tactical-box guardian-box">
            <div class="tactical-thumb">
              <img src="${bossImg}" alt="${biome.boss.name}" />
            </div>
            <div class="tactical-details">
              <div class="tactical-label">REALM GUARDIAN</div>
              <div class="tactical-value-title">${biome.boss.name}</div>
              <div class="tactical-sub">${biome.boss.title}</div>
            </div>
          </div>

          <!-- ENVIRONMENTAL HAZARD -->
          <div class="tactical-box hazard-box">
            <div class="tactical-icon">⚠️</div>
            <div class="tactical-details">
              <div class="tactical-label">ENVIRONMENTAL HAZARD</div>
              <div class="tactical-value-title" style="color: ${biome.palette.hazardColor};">${biome.hazardDescription.split(':')[0]}</div>
              <div class="tactical-sub">${biome.hazardDescription.split(':')[1] || ''}</div>
            </div>
          </div>
        </div>

        <!-- ENEMY POOL TAGS -->
        <div class="realm-enemy-pills">
          <span class="enemy-pills-label">HOSTILES:</span>
          ${biome.enemyPool.map(e => `
            <span class="enemy-pill" style="border-left-color: ${e.color};">
              ${e.name.split('(')[0].trim()}
            </span>
          `).join('')}
        </div>

        <!-- PRIMARY DEPLOY ACTION BUTTONS -->
        <div class="card-action-footer" style="display:flex; gap:12px; align-items:center;">
          ${isUnlocked ? `
            <button id="btn-deploy-realm" class="sampo-btn primary large ${isCurrent || clears > 0 ? 'pulsing-deploy' : ''}" style="flex:1;">
              ${clears > 0 ? `🔥 DEPLOY OVERDRIVE (LOOP ${loopLevel} • x${diffMult.toFixed(2)})` : isCleared ? '🔄 REPLAY EXPEDITION' : '⚔️ DEPLOY EXPEDITION'}
              <span class="btn-subtext">[PRESS ENTER]</span>
            </button>
          ` : `
            <button class="sampo-btn large disabled" style="flex:1;" disabled>
              🔒 SEALED — DEFEAT ${prevBiomeName.toUpperCase()} TO UNLOCK
            </button>
          `}
        </div>
      </div>
    `;

    // Bind Deploy Button
    const deployBtn = document.getElementById('btn-deploy-realm');
    if (deployBtn && isUnlocked) {
      deployBtn.addEventListener('click', () => {
        soundEngine.playLevelUp();
        this.hide();
        this.onStartSectorCallback(biome.id);
      });
    }

    // Update Dots Active State
    const dotBtns = this.menuEl?.querySelectorAll('.carousel-dot-btn');
    dotBtns?.forEach(btn => {
      const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
      if (idx === this.currentIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Nav Buttons State
    const prevBtn = document.getElementById('carousel-btn-prev') as HTMLButtonElement;
    const nextBtn = document.getElementById('carousel-btn-next') as HTMLButtonElement;
    if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentIndex === SAGA_PATH.length - 1;
  }

  private prevSlide() {
    if (this.currentIndex > 0) {
      this.renderSlide(this.currentIndex - 1, true);
    }
  }

  private nextSlide() {
    if (this.currentIndex < SAGA_PATH.length - 1) {
      this.renderSlide(this.currentIndex + 1, true);
    }
  }

  private bindKeyboardNav() {
    this.unbindKeyboardNav();
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.isOpen()) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.prevSlide();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.nextSlide();
      } else if (e.key === 'Enter' || e.key === ' ') {
        const biome = SAGA_PATH[this.currentIndex];
        if (this.unlockedMap[biome.id]) {
          soundEngine.playLevelUp();
          this.hide();
          this.onStartSectorCallback(biome.id);
        }
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }

  private unbindKeyboardNav() {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
  }

  hide() {
    this.unbindKeyboardNav();
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
  }
}
