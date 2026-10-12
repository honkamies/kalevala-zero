import { BiomeDefinition } from '../world/biomes';
import { soundEngine } from '../engine/audio';
import { graphicsEngine, PixelResolutionMode } from '../engine/graphics';
import { SoundSettingsModalUI } from './sound_settings_modal';
import { GraphicsSettingsModalUI } from './graphics_settings_modal';
import { inputManager } from '../engine/input';

export class PauseMenuUI {
  private root: HTMLElement;
  private menuEl: HTMLElement | null = null;
  private onResumeCallback: () => void;
  private onOpenSagaMapCallback: () => void;
  private onReturnMainMenuCallback: () => void;
  private onOpenProfilesCallback?: () => void;
  private soundModal: SoundSettingsModalUI;
  private graphicsModal: GraphicsSettingsModalUI;

  constructor(
    root: HTMLElement,
    onResume: () => void,
    onOpenSagaMap: () => void,
    onReturnMainMenu: () => void,
    onOpenProfiles?: () => void
  ) {
    this.root = root;
    this.onResumeCallback = onResume;
    this.onOpenSagaMapCallback = onOpenSagaMap;
    this.onReturnMainMenuCallback = onReturnMainMenu;
    this.onOpenProfilesCallback = onOpenProfiles;
    this.soundModal = new SoundSettingsModalUI(root);
    this.graphicsModal = new GraphicsSettingsModalUI(root);
  }

  isOpen(): boolean {
    return this.menuEl !== null;
  }

  show(biome?: BiomeDefinition) {
    if (this.menuEl) return;

    this.menuEl = document.createElement('div');
    this.menuEl.id = 'esc-pause-menu';
    this.menuEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 8, 16, 0.88);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
      pointer-events: auto;
    `;

    const settings = soundEngine.getSettings();
    const currentTrack = soundEngine.getCurrentTrack();
    const gfxSettings = graphicsEngine.getSettings();

    this.menuEl.innerHTML = `
      <div style="
        width: 860px; 
        max-width: 95vw; 
        max-height: 90vh; 
        overflow-y: auto;
        background: rgba(13, 18, 29, 0.98); 
        border: 2px solid var(--border-glow); 
        border-radius: 10px; 
        padding: 24px 30px; 
        box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(56, 189, 248, 0.2);
        display: flex;
        flex-direction: column;
        gap: 18px;
      ">
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:20px;">⏸️</span>
              <span style="font-family:var(--font-rune); font-size:22px; color:var(--gold-runic); letter-spacing:2px;">
                TACTICAL PAUSE & MISSION MANUAL
              </span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              ${biome ? `Current Sector: <strong style="color:#fff;">${biome.name}</strong> (${biome.finnishTitle})` : 'Kalevala-Zero: Cyber-Kalevala ARPG'}
            </div>
          </div>

          <button id="btn-esc-close-x" style="
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

        <!-- MAIN CONTENT: 2-COLUMN MANUAL & AUDIO -->
        <div style="display:grid; grid-template-columns: 1.1fr 0.9fr; gap: 20px;">
          
          <!-- LEFT COLUMN: CONTROLS & COMBAT SCHEME (DUAL KEYBOARD & XBOX GAMEPAD) -->
          <div style="background: rgba(9, 14, 23, 0.7); border: 1px solid var(--border-dim); border-radius: 6px; padding: 16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
              <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
                <span>🎮</span> TACTICAL CONTROLS
              </div>
              <div style="display:flex; gap:6px;">
                <button id="tab-controls-kb" style="
                  font-family:var(--font-mono); font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:4px; cursor:pointer;
                  border: 1px solid ${inputManager.lastInputDevice === 'keyboard' ? '#38bdf8' : 'rgba(255,255,255,0.15)'};
                  background: ${inputManager.lastInputDevice === 'keyboard' ? 'rgba(56,189,248,0.2)' : 'transparent'};
                  color: ${inputManager.lastInputDevice === 'keyboard' ? '#38bdf8' : '#94a3b8'};
                ">⌨️ Keyboard</button>
                <button id="tab-controls-pad" style="
                  font-family:var(--font-mono); font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:4px; cursor:pointer;
                  border: 1px solid ${inputManager.lastInputDevice === 'gamepad' ? '#22c55e' : 'rgba(255,255,255,0.15)'};
                  background: ${inputManager.lastInputDevice === 'gamepad' ? 'rgba(34,197,94,0.2)' : 'transparent'};
                  color: ${inputManager.lastInputDevice === 'gamepad' ? '#22c55e' : '#94a3b8'};
                ">🎮 Xbox Pad</button>
              </div>
            </div>

            <!-- CONTROLLER HARDWARE STATUS BADGE -->
            <div id="esc-controller-status-banner" style="
              font-family:var(--font-mono); font-size:10px; padding:4px 8px; border-radius:4px;
              background: ${inputManager.gamepadConnected ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.08)'};
              border: 1px solid ${inputManager.gamepadConnected ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.18)'};
              color: ${inputManager.gamepadConnected ? '#4ade80' : '#94a3b8'};
              display:flex; justify-content:space-between; align-items:center;
            ">
              <span>${inputManager.gamepadConnected ? `● Xbox / Gamepad Active: ${inputManager.gamepadName.split('(')[0].trim() || 'Connected'}` : '○ No Gamepad Detected (Hot-plug any Xbox controller anytime)'}</span>
              <span>${inputManager.gamepadConnected ? '⚡ Haptics Ready' : '⌨️ Keyboard Ready'}</span>
            </div>

            <!-- KEYBOARD SCHEME -->
            <div id="controls-view-keyboard" style="display:${inputManager.lastInputDevice === 'keyboard' ? 'flex' : 'none'}; flex-direction:column; gap:7px; font-size:11.5px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Movement / Navigation</span>
                <span class="esc-key-badge">WASD / MMB Hold</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Aim & Primary Attack</span>
                <span class="esc-key-badge">Mouse + Left Click</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Special Attack / Aegis Shield</span>
                <span class="esc-key-badge">Right Click (RMB)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Active Dodge Roll (I-Frames)</span>
                <span class="esc-key-badge">Spacebar</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 1 (Ukonvasara EMP Slam)</span>
                <span class="esc-key-badge">1</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 2 (Kipinä Plasma Dash)</span>
                <span class="esc-key-badge">2</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 3 (Tuoni Void Shield)</span>
                <span class="esc-key-badge">3</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 4 (Sampo Overclock Frenzy)</span>
                <span class="esc-key-badge">4 / R</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Nano-Repair Potion (+60 HP)</span>
                <span class="esc-key-badge">Q / 5</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Interact (Vaults, Pillars)</span>
                <span class="esc-key-badge">E</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Inventory / Gear Paperdoll</span>
                <span class="esc-key-badge">I / Tab</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted);">Character Stats & Attributes</span>
                <span class="esc-key-badge">C</span>
              </div>
            </div>

            <!-- XBOX GAMEPAD SCHEME -->
            <div id="controls-view-gamepad" style="display:${inputManager.lastInputDevice === 'gamepad' ? 'flex' : 'none'}; flex-direction:column; gap:7px; font-size:11.5px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Analog Movement (2:1 Isometric)</span>
                <span class="esc-key-badge" style="background:rgba(34,197,94,0.15); border-color:#22c55e; color:#4ade80;">Left Stick / D-Pad</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">360° Twin-Stick Aiming</span>
                <span class="esc-key-badge" style="background:rgba(34,197,94,0.15); border-color:#22c55e; color:#4ade80;">Right Stick</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Primary Attack / Rapid Strike</span>
                <span class="esc-key-badge" style="background:rgba(250,204,21,0.15); border-color:#facc15; color:#fde047;">Right Trigger (RT)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Special Attack / Aegis Shield</span>
                <span class="esc-key-badge" style="background:rgba(56,189,248,0.15); border-color:#38bdf8; color:#7dd3fc;">Left Trigger (LT)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Active Dodge Roll / Dash</span>
                <span class="esc-key-badge" style="background:rgba(239,68,68,0.15); border-color:#ef4444; color:#fca5a5;">Button B</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Interact / Decrypt Vaults</span>
                <span class="esc-key-badge" style="background:rgba(34,197,94,0.25); border-color:#22c55e; color:#ffffff;">Button A</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 1 (Ukonvasara EMP Slam)</span>
                <span class="esc-key-badge" style="background:rgba(56,189,248,0.15); border-color:#38bdf8; color:#7dd3fc;">Button X</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 2 (Kipinä Plasma Dash)</span>
                <span class="esc-key-badge">Right Bumper (RB)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 3 (Tuoni Void Shield)</span>
                <span class="esc-key-badge">Left Bumper (LB)</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Skill 4 (Sampo Overclock)</span>
                <span class="esc-key-badge" style="background:rgba(250,204,21,0.15); border-color:#facc15; color:#fde047;">Button Y</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                <span style="color:var(--text-muted);">Nano-Repair Potion (+60 HP)</span>
                <span class="esc-key-badge">D-Pad Up / LS Click</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted);">Tactical Inventory / Stats</span>
                <span class="esc-key-badge">View (Back) / D-Pad Left</span>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: AUDIO SUITE, GRAPHICS & SAGA RULES -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            
            <!-- GRAPHICS & RETRO PIXEL CONTROLS -->
            <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-glow); border-radius: 6px; padding: 14px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
                  <span>🎨</span> RETRO GRAPHICS & PIXELS
                </div>
                <button id="btn-esc-open-graphics-suite" class="sampo-btn" style="padding:3px 8px; font-size:10px;">
                  SETTINGS ⚙️
                </button>
              </div>

              <!-- Quick Resolution Mode Switcher -->
              <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
                <button class="sampo-btn esc-gfx-quick-btn ${gfxSettings.resolutionMode === 'retro-16bit' ? 'primary' : ''}" data-mode="retro-16bit" style="padding:5px 4px; font-size:10px;" title="16-Bit SNES/Amiga (~480p)">
                  16-BIT
                </button>
                <button class="sampo-btn esc-gfx-quick-btn ${gfxSettings.resolutionMode === 'retro-8bit' ? 'primary' : ''}" data-mode="retro-8bit" style="padding:5px 4px; font-size:10px;" title="8-Bit Lo-Fi (~320p)">
                  8-BIT
                </button>
                <button class="sampo-btn esc-gfx-quick-btn ${gfxSettings.resolutionMode === 'retro-crisp' ? 'primary' : ''}" data-mode="retro-crisp" style="padding:5px 4px; font-size:10px;" title="32-Bit Crisp Pixel (~640p)">
                  CRISP
                </button>
                <button class="sampo-btn esc-gfx-quick-btn ${gfxSettings.resolutionMode === 'hd-native' ? 'primary' : ''}" data-mode="hd-native" style="padding:5px 4px; font-size:10px;" title="Native Smooth Vector">
                  HD
                </button>
              </div>

              <!-- Screen Shake Quick Toggle -->
              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:8px; margin-top:2px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:13px;">📳</span>
                  <span style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">Screen Shake FX</span>
                </div>
                <button id="btn-esc-toggle-shake" class="sampo-btn ${gfxSettings.screenShake ? 'primary' : ''}" style="padding:4px 12px; font-size:10px;" title="Toggle Camera Screen Shake (Enable/Disable)">
                  ${gfxSettings.screenShake ? '🔔 ENABLED' : '🔕 DISABLED'}
                </button>
              </div>
            </div>

            <!-- SOUND & VOLUME CONTROLS -->
            <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-glow); border-radius: 6px; padding: 14px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
                  <span>🎚️</span> SOUND & VOLUME CONTROLS
                </div>
                <button id="btn-esc-open-sound-suite" class="sampo-btn" style="padding:3px 8px; font-size:10px;">
                  JUKEBOX 📻
                </button>
              </div>

              <!-- Master Slider -->
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono);">
                  <span style="color:var(--text-muted);">Master Volume</span>
                  <span id="esc-val-master" style="color:#fff; font-weight:700;">${Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input type="range" id="esc-slider-master" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" style="width:100%; cursor:pointer;" />
              </div>

              <!-- Music Slider -->
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono);">
                  <span style="color:var(--text-muted);">Music Volume</span>
                  <span id="esc-val-music" style="color:#fff; font-weight:700;">${Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input type="range" id="esc-slider-music" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" style="width:100%; cursor:pointer;" />
              </div>

              <!-- SFX Slider -->
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono);">
                  <span style="color:var(--text-muted);">SFX Volume <span style="font-size:9.5px; color:#f59e0b;">(Silenced / BGM Only)</span></span>
                  <span id="esc-val-sfx" style="color:#94a3b8; font-weight:700;">MUTED (0%)</span>
                </div>
                <input type="range" id="esc-slider-sfx" min="0" max="100" value="0" disabled style="width:100%; cursor:not-allowed; opacity:0.5;" title="Sound effects silenced until customized SFX are designed" />
              </div>

              <!-- Quick Buttons & Track Display -->
              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px; margin-top:2px;">
                <button id="btn-esc-toggle-audio" class="sampo-btn ${settings.muted ? 'gold' : ''}" style="padding:4px 10px; font-size:10px;">
                  ${settings.muted ? '🔇 UNMUTE' : '🔊 MUTE ALL'}
                </button>

                <div style="display:flex; align-items:center; gap:6px;">
                  <button id="btn-esc-prev-track" class="sampo-btn" style="padding:4px 8px; font-size:10px;" title="Previous Track">⏮️</button>
                  <button id="btn-esc-next-track" class="sampo-btn" style="padding:4px 8px; font-size:10px;" title="Next Track">⏭️</button>
                </div>
              </div>

              <div id="esc-now-playing-text" style="font-size:10.5px; color:var(--cyan-core); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                🎵 ${currentTrack ? currentTrack.title : 'Atmospheric Ambience'}
              </div>
            </div>

            <!-- SAGA PROTOCOLS -->
            <div style="background: rgba(9, 14, 23, 0.7); border: 1px solid var(--border-dim); border-radius: 6px; padding: 14px;">
              <div style="font-family:var(--font-mono); font-size:11.5px; color:var(--gold-runic); font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                <span>📜</span> KALEVALA PROTOCOLS
              </div>
              <ul style="font-size:11px; color:var(--text-main); margin:0; padding-left:14px; line-height:1.45;">
                <li><strong>Cosmic Path</strong>: Slay sector guardians to open ascension portals.</li>
                <li><strong>Runic Pillars</strong>: Solve Kanteletar verses for legendary loot.</li>
                <li><strong>Nanite Scrap</strong>: Forge and socket weaponry in the Forge.</li>
              </ul>
            </div>

          </div>
        </div>

        <!-- ACTION BUTTONS / NAVIGATION FOOTER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-dim); padding-top:16px; margin-top:4px;">
          <button id="btn-esc-resume" class="sampo-btn primary" style="padding:10px 24px; font-size:13px; box-shadow:0 0 16px rgba(56, 189, 248, 0.5);">
            ▶ RESUME GAME (ESC)
          </button>

          <div style="display:flex; gap:10px;">
            <button id="btn-esc-graphics" class="sampo-btn" style="padding:10px 16px; font-size:12px;">
              🎨 GRAPHICS
            </button>
            <button id="btn-esc-saga-map" class="sampo-btn" style="padding:10px 16px; font-size:12px;">
              🗺️ SAGA MAP
            </button>
            <button id="btn-esc-profiles" class="sampo-btn" style="padding:10px 16px; font-size:12px; border-color:var(--cyan-core); color:var(--cyan-core);">
              👥 PROFILES / RESET
            </button>
            <button id="btn-esc-main-menu" class="sampo-btn" style="padding:10px 16px; font-size:12px; border-color:#ef4444; color:#fca5a5;">
              🏠 MAIN MENU
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.menuEl);

    // Bind Controls View Tabs
    const tabKb = document.getElementById('tab-controls-kb');
    const tabPad = document.getElementById('tab-controls-pad');
    const viewKb = document.getElementById('controls-view-keyboard');
    const viewPad = document.getElementById('controls-view-gamepad');

    tabKb?.addEventListener('click', () => {
      if (viewKb) viewKb.style.display = 'flex';
      if (viewPad) viewPad.style.display = 'none';
      if (tabKb) {
        tabKb.style.borderColor = '#38bdf8';
        tabKb.style.background = 'rgba(56,189,248,0.2)';
        tabKb.style.color = '#38bdf8';
      }
      if (tabPad) {
        tabPad.style.borderColor = 'rgba(255,255,255,0.15)';
        tabPad.style.background = 'transparent';
        tabPad.style.color = '#94a3b8';
      }
    });

    tabPad?.addEventListener('click', () => {
      if (viewKb) viewKb.style.display = 'none';
      if (viewPad) viewPad.style.display = 'flex';
      if (tabPad) {
        tabPad.style.borderColor = '#22c55e';
        tabPad.style.background = 'rgba(34,197,94,0.2)';
        tabPad.style.color = '#22c55e';
      }
      if (tabKb) {
        tabKb.style.borderColor = 'rgba(255,255,255,0.15)';
        tabKb.style.background = 'transparent';
        tabKb.style.color = '#94a3b8';
      }
    });

    // Bind Close (X) button
    document.getElementById('btn-esc-close-x')?.addEventListener('click', () => {
      this.hide();
      this.onResumeCallback();
    });

    // Bind Resume button
    document.getElementById('btn-esc-resume')?.addEventListener('click', () => {
      this.hide();
      this.onResumeCallback();
    });

    // Bind Saga Map button
    document.getElementById('btn-esc-saga-map')?.addEventListener('click', () => {
      this.hide();
      this.onOpenSagaMapCallback();
    });

    // Bind Profiles button
    document.getElementById('btn-esc-profiles')?.addEventListener('click', () => {
      this.hide();
      if (this.onOpenProfilesCallback) {
        this.onOpenProfilesCallback();
      } else {
        this.onReturnMainMenuCallback();
      }
    });

    // Bind Return to Main Menu button
    document.getElementById('btn-esc-main-menu')?.addEventListener('click', () => {
      this.hide();
      this.onReturnMainMenuCallback();
    });

    // Open Full Sound Suite Modal
    document.getElementById('btn-esc-open-sound-suite')?.addEventListener('click', () => {
      this.soundModal.show();
    });

    // Open Graphics Suite Modal
    document.getElementById('btn-esc-graphics')?.addEventListener('click', () => {
      this.graphicsModal.show();
    });
    document.getElementById('btn-esc-open-graphics-suite')?.addEventListener('click', () => {
      this.graphicsModal.show();
    });

    // Quick Resolution Preset Buttons
    document.querySelectorAll('.esc-gfx-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as PixelResolutionMode;
        if (mode) {
          graphicsEngine.updateSettings({ resolutionMode: mode, pixelScaleOverride: 0 });
          soundEngine.playRuneClick();
          document.querySelectorAll('.esc-gfx-quick-btn').forEach(b => {
            if ((b as HTMLElement).dataset.mode === mode) b.classList.add('primary');
            else b.classList.remove('primary');
          });
        }
      });
    });

    // Screen Shake Quick Toggle Button
    const shakeBtn = document.getElementById('btn-esc-toggle-shake');
    if (shakeBtn) {
      shakeBtn.addEventListener('click', () => {
        const enabled = graphicsEngine.toggleScreenShake();
        shakeBtn.textContent = enabled ? '🔔 ENABLED' : '🔕 DISABLED';
        if (enabled) shakeBtn.classList.add('primary');
        else shakeBtn.classList.remove('primary');
        soundEngine.playRuneClick();
      });
    }

    // Sliders
    const sMaster = document.getElementById('esc-slider-master') as HTMLInputElement;
    const txtMaster = document.getElementById('esc-val-master');
    sMaster?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setMasterVolume(val);
      if (txtMaster) txtMaster.textContent = `${Math.round(val * 100)}%`;
    });

    const sMusic = document.getElementById('esc-slider-music') as HTMLInputElement;
    const txtMusic = document.getElementById('esc-val-music');
    sMusic?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setMusicVolume(val);
      if (txtMusic) txtMusic.textContent = `${Math.round(val * 100)}%`;
    });

    const sSfx = document.getElementById('esc-slider-sfx') as HTMLInputElement;
    const txtSfx = document.getElementById('esc-val-sfx');
    sSfx?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setSfxVolume(val);
      if (txtSfx) txtSfx.textContent = `${Math.round(val * 100)}%`;
    });
    sSfx?.addEventListener('change', () => {
      soundEngine.playRuneClick();
    });

    // Bind Audio Toggle
    const audioBtn = document.getElementById('btn-esc-toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const muted = soundEngine.toggleMute();
        audioBtn.textContent = muted ? '🔇 UNMUTE' : '🔊 MUTE ALL';
        if (muted) audioBtn.classList.add('gold');
        else audioBtn.classList.remove('gold');
        const hudMuteBtn = document.getElementById('btn-toggle-mute');
        if (hudMuteBtn) hudMuteBtn.textContent = muted ? '🔇' : '🔊';
      });
    }

    // Next / Prev track
    const nowPlayingText = document.getElementById('esc-now-playing-text');
    document.getElementById('btn-esc-next-track')?.addEventListener('click', () => {
      soundEngine.playNextTrack();
      const track = soundEngine.getCurrentTrack();
      if (nowPlayingText && track) nowPlayingText.textContent = `🎵 ${track.title}`;
    });
    document.getElementById('btn-esc-prev-track')?.addEventListener('click', () => {
      soundEngine.playPreviousTrack();
      const track = soundEngine.getCurrentTrack();
      if (nowPlayingText && track) nowPlayingText.textContent = `🎵 ${track.title}`;
    });
  }

  hide() {
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
  }

  toggle(biome?: BiomeDefinition) {
    if (this.isOpen()) {
      this.hide();
      this.onResumeCallback();
    } else {
      this.show(biome);
    }
  }
}
