// Character Creation & Phenotype Customization UI
// Interactive Real-Time Canvas Blueprint Preview for Archetypes, War Paint & Implants

import { CharacterAppearance, Player, getDefaultStatsForArchetype } from '../entities/player';
import { getStarterWeaponForArchetype, isBaseWeaponMatchingArchetype } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { HeroRenderer } from '../engine/hero_renderer';

export class CharacterCreationUI {
  private root: HTMLElement;
  private containerEl: HTMLElement | null = null;
  private onCreatedCallback: (player: Player, isNewProfile: boolean) => void;
  private animFrameId: number | null = null;

  private currentAppearance: CharacterAppearance = {
    phenotype: 'cyber_runic',
    hairStyle: 'cyber_braids',
    hairColor: '#38bdf8',
    skinTone: '#94a3b8',
    warPaint: 'ukko_spark',
    implant: 'neural_loom',
    archetype: 'soturi'
  };

  constructor(root: HTMLElement, onCreated: (player: Player, isNewProfile: boolean) => void) {
    this.root = root;
    this.onCreatedCallback = onCreated;
  }

  show(existingPlayer?: Player, onCancel?: () => void, forceNewProfile: boolean = false) {
    this.hide();

    const isCreatingNew = forceNewProfile || !existingPlayer;

    if (existingPlayer && !forceNewProfile) {
      this.currentAppearance = { ...existingPlayer.appearance };
    } else {
      this.currentAppearance = {
        phenotype: 'cyber_runic',
        hairStyle: 'cyber_braids',
        hairColor: '#38bdf8',
        skinTone: '#94a3b8',
        warPaint: 'ukko_spark',
        implant: 'neural_loom',
        archetype: 'soturi'
      };
    }

    const currentCallsign = isCreatingNew ? '' : (existingPlayer ? existingPlayer.name : '');
    const currentArch = this.currentAppearance.archetype || 'soturi';
    const currentPaint = this.currentAppearance.warPaint || 'ukko_spark';
    const currentImp = this.currentAppearance.implant || 'neural_loom';

    this.containerEl = document.createElement('div');
    this.containerEl.id = 'creation-screen';

    this.containerEl.innerHTML = `
      <div class="creation-box">
        <div class="creation-title-group">
          <div class="creation-title">
            ${isCreatingNew ? 'SYNTHESIZE BIO-RUNIC PROTOCOL (ZERO STATS)' : 'CUSTOMIZE OPERATIVE BLUEPRINT'}
          </div>
          <div class="creation-subtitle">
            ${isCreatingNew 
              ? 'Initialize a fresh operative vessel with base attributes, empty backpack, and pristine saga matrix.' 
              : 'Update your callsign, phenotype war paint, and neural implants without resetting character stats.'}
          </div>
        </div>

        <!-- Left Column: Class Archetype & Phenotype -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="form-group">
            <label class="form-label">OPERATIVE CALLSIGN</label>
            <input type="text" id="char-name-input" class="form-input" placeholder="e.g. Väinämöinen, Lemminki, Louhi, Ilmarinen..." value="${currentCallsign}" maxlength="24" autofocus />
          </div>

          <div class="form-group">
            <label class="form-label">CHOOSE ARCHETYPE PROTOCOL</label>
            <div class="archetype-selector">
              <div class="archetype-btn ${currentArch === 'soturi' ? 'active' : ''}" data-arch="soturi">
                <div>
                  <div class="arch-name">🛡️ SOTURI (Heavy Juggernaut Tank)</div>
                  <div class="arch-role">Starts with <strong>Slag War-Hammer</strong>. Massive close-range seismic quakes, heavy stagger, and devastating barrier pulverization (+35% HP, +15 Armor).</div>
                </div>
              </div>
              <div class="archetype-btn ${currentArch === 'korvenraivaaja' ? 'active' : ''}" data-arch="korvenraivaaja">
                <div>
                  <div class="arch-name">🎯 KORVENRAIVAAJA (Scrap Stalker / Marksman)</div>
                  <div class="arch-role">Starts with <strong>Scrap Rail-Rifle</strong>. High-velocity armor-piercing slugs, extreme sniper range, and rapid dodge rolls (Speed 4.8, +14% Crit).</div>
                </div>
              </div>
              <div class="archetype-btn ${currentArch === 'tietäjä' ? 'active' : ''}" data-arch="tietäjä">
                <div>
                  <div class="arch-name">🔮 TIETÄJÄ (Void Cyber-Shaman)</div>
                  <div class="arch-role">Starts with <strong>Tuonela Void-Spire</strong>. Projects continuous void death-ray beams with life/shield siphon, and rapid energy shield regeneration (+25% Elemental Dmg).</div>
                </div>
              </div>
              <div class="archetype-btn ${currentArch === 'runoseppä' ? 'active' : ''}" data-arch="runoseppä">
                <div>
                  <div class="arch-name">🎵 RUNOSEPPÄ (Poetry-Smith / Shield Artificer)</div>
                  <div class="arch-role">Starts with <strong>Virsikannel Lyric Resonator</strong>. Sings harmonic rune waves that ripple through enemy shields, forging the Celestial Anvil of Creation.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Visual Customization & Preview -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div class="form-group">
            <label class="form-label">WAR PAINT / CYBER-RUNE</label>
            <select id="sel-warpaint" class="form-input">
              <option value="ukko_spark" ${currentPaint === 'ukko_spark' ? 'selected' : ''}>⚡ Ukko's Spark (Lightning Arc Blue)</option>
              <option value="otava_constellation" ${currentPaint === 'otava_constellation' ? 'selected' : ''}>⭐ Otava Seven Stars (Gold Runic)</option>
              <option value="tuoni_brand" ${currentPaint === 'tuoni_brand' ? 'selected' : ''}>💀 Tuoni Mark (Void Purple)</option>
              <option value="kipina_crest" ${currentPaint === 'kipina_crest' ? 'selected' : ''}>🔥 Kipinä Crest (Thermal Orange)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">NEURAL IMPLANT</label>
            <select id="sel-implant" class="form-input">
              <option value="neural_loom" ${currentImp === 'neural_loom' ? 'selected' : ''}>🧬 Neural Loom (Fiber-Optic Data Cables)</option>
              <option value="optic_hud" ${currentImp === 'optic_hud' ? 'selected' : ''}>👁️ Cybernetic Optic HUD (Targeting Vector)</option>
              <option value="bionic_chassis" ${currentImp === 'bionic_chassis' ? 'selected' : ''}>🦾 Titanium Bionic Chassis (Mandible Plate & LEDs)</option>
            </select>
          </div>

          <div style="background:var(--bg-panel-sub); padding:16px; border:1px solid var(--border-dim); border-radius:6px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px;">
            <div style="font-family:var(--font-mono); font-size:12px; letter-spacing: 2px; color:var(--cyan-core);">OPERATIVE AVATAR BLUEPRINT</div>
            <div style="width:160px; height:160px; border-radius:8px; overflow:hidden; border:2px solid var(--cyan-core); box-shadow:0 0 20px rgba(56, 189, 248, 0.4); position:relative; background: #060a12;">
              <canvas id="hero-preview-canvas" width="160" height="160" style="width:100%; height:100%; display:block;"></canvas>
            </div>
            <div id="preview-desc" style="font-size:12px; color:var(--text-muted); line-height:1.5;">
              Armed with a Väki-infused Plasma Blade, tactical runic mantle, and ballistic energy aegis. Masters of brutal wasteland skirmishing.
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-top:auto;">
            ${onCancel ? `
              <button class="sampo-btn" id="btn-cancel-char" style="padding:14px; font-size:14px; flex:1;">
                ↩️ CANCEL
              </button>
            ` : ''}
            <button class="sampo-btn primary" id="btn-submit-char" style="padding:14px; font-size:15px; flex:2;">
              ⚡ ${isCreatingNew ? 'SYNTHESIZE & ENGAGE (0 STATS)' : 'UPDATE BLUEPRINT'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.containerEl);

    // Initial Canvas Render
    this.startCanvasRenderLoop();
    this.updateArchetypePreview(currentArch);

    // Bind Archetype clicks
    const archButtons = this.containerEl.querySelectorAll('.archetype-btn');
    archButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        archButtons.forEach(b => b.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const arch = target.getAttribute('data-arch') as any;
        this.currentAppearance.archetype = arch;
        soundEngine.playRuneClick();
        this.updateArchetypePreview(arch);
      });
    });

    // Bind Selects
    document.getElementById('sel-warpaint')?.addEventListener('change', (e) => {
      this.currentAppearance.warPaint = (e.target as HTMLSelectElement).value;
      soundEngine.playRuneClick();
    });

    document.getElementById('sel-implant')?.addEventListener('change', (e) => {
      this.currentAppearance.implant = (e.target as HTMLSelectElement).value;
      soundEngine.playRuneClick();
    });

    // Bind Cancel
    if (onCancel) {
      document.getElementById('btn-cancel-char')?.addEventListener('click', () => {
        soundEngine.playRuneClick();
        this.hide();
        onCancel();
      });
    }

    // Bind Submit
    document.getElementById('btn-submit-char')?.addEventListener('click', () => {
      const nameInput = document.getElementById('char-name-input') as HTMLInputElement;
      let name = (nameInput?.value || '').trim();
      if (!name) {
        name = isCreatingNew ? 'Operative-Zero' : (existingPlayer ? existingPlayer.name : 'Wanderer-Zero');
      }

      const isArchetypeChanged = !!existingPlayer && existingPlayer.appearance.archetype !== this.currentAppearance.archetype;
      const defaultStats = getDefaultStatsForArchetype(this.currentAppearance.archetype);
      const stats = (!isCreatingNew && existingPlayer && !isArchetypeChanged) ? { ...existingPlayer.stats } : defaultStats;
      const starterWeapon = getStarterWeaponForArchetype(this.currentAppearance.archetype);

      let chosenBaseWeapon = starterWeapon;
      if (!isCreatingNew && existingPlayer && !isArchetypeChanged && existingPlayer.baseWeapon) {
        if (isBaseWeaponMatchingArchetype(existingPlayer.baseWeapon, this.currentAppearance.archetype)) {
          chosenBaseWeapon = existingPlayer.baseWeapon;
        }
      }

      const playerEquipment = (!isCreatingNew && existingPlayer && !isArchetypeChanged) ? { ...existingPlayer.equipment } : {};
      if (playerEquipment.mainHand) {
        if (playerEquipment.mainHand.id?.startsWith('starter_') ||
            playerEquipment.mainHand.id === 'starter_blade' ||
            playerEquipment.mainHand.name === chosenBaseWeapon.name ||
            playerEquipment.mainHand.id === chosenBaseWeapon.id) {
          delete playerEquipment.mainHand;
        }
      }

      const player = new Player(
        (!isCreatingNew && existingPlayer) ? existingPlayer.id : ('chr_' + Math.random().toString(36).substring(2, 9)),
        name,
        this.currentAppearance,
        stats,
        (!isCreatingNew && existingPlayer) ? existingPlayer.inventory : [],
        playerEquipment,
        chosenBaseWeapon
      );

      if (!isCreatingNew && existingPlayer) {
        player.level = existingPlayer.level;
        player.xp = existingPlayer.xp;
        player.naniteScrap = existingPlayer.naniteScrap;
      } else {
        player.level = 1;
        player.xp = 0;
        player.naniteScrap = 0;
      }

      soundEngine.playLevelUp();
      this.hide();
      this.onCreatedCallback(player, isCreatingNew);
    });
  }

  private startCanvasRenderLoop() {
    const canvas = document.getElementById('hero-preview-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!this.containerEl) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Tech Grid Pattern Background
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 160; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 160);
        ctx.stroke();
      }
      for (let y = 0; y < 160; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(160, y);
        ctx.stroke();
      }

      // Draw Authentic Hand-Drawn Hero Portrait with Cybernetic Enhancements
      HeroRenderer.drawPortrait(ctx, 80, 80, 152, this.currentAppearance);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  private updateArchetypePreview(arch: string) {
    const descEl = document.getElementById('preview-desc');
    if (!descEl) return;
    if (arch === 'soturi') {
      descEl.textContent = 'Armed with the Slag War-Hammer & Heavy Titanium Plating. Generates devastating 360° seismic ground quakes. Upgrades into concentric aftershock shockwaves and barrier-shattering areal impacts.';
    } else if (arch === 'runoseppä') {
      descEl.textContent = 'Master of ancient origin words (Syntysanat) and nanite transmutation. Wields the Virsikannel Lyric Resonator, projecting harmonic singing chords that upgrade into wide room-clearing acoustic shock fans.';
    } else if (arch === 'tietäjä') {
      descEl.textContent = 'Wields the Tuonela Void-Spire & Floating Void Focus. Projects continuous void death-ray beams that siphon vitality and shields. Upgrades into multi-beam disruption and barrier siphons.';
    } else if (arch === 'korvenraivaaja') {
      descEl.textContent = 'Armed with the Scrap Rail-Rifle & Targeting Monocle. Extreme sniper range, high-velocity armor penetration, and rapid rolls. Upgrades into multi-slug piercing volleys.';
    }
  }

  hide() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }
  }
}
