// HUD Interface Component (Vitals, Boss Bar, Hotbar, Objectives & Tactical Event Log)

import { Player } from '../entities/player';
import { BiomeDefinition } from '../world/biomes';
import { soundEngine } from '../engine/audio';
import { HeroRenderer } from '../engine/hero_renderer';

export type LogType = 'loot' | 'kill' | 'heal' | 'skill' | 'rune' | 'level' | 'system' | 'alert';

export class HUD {
  private root: HTMLElement;
  private topBarEl!: HTMLElement;
  private bottomBarEl!: HTMLElement;
  private bossBarEl!: HTMLElement;
  private bossHpFillEl!: HTMLElement;
  private bossNameEl!: HTMLElement;
  private bossSubEl!: HTMLElement;
  private objectiveTrackerEl!: HTMLElement;
  private logFeedEl!: HTMLElement;
  private maxLogs: number = 8;
  private runicBannerEl: HTMLElement | null = null;

  // Vitals elements
  private hpFillEl!: HTMLElement;
  private hpTextEl!: HTMLElement;
  private shieldFillEl!: HTMLElement;
  private shieldTextEl!: HTMLElement;
  private vakiFillEl!: HTMLElement;
  private vakiTextEl!: HTMLElement;
  private xpFillEl!: HTMLElement;
  private xpTextEl!: HTMLElement;
  private levelBadgeEl!: HTMLElement;

  // Ability Cooldown overlays
  private cdShieldEl!: HTMLElement;
  private shieldDurationFillEl!: HTMLElement;
  private cdSpecialEl!: HTMLElement;
  private specialChargeFillEl!: HTMLElement;
  private cd1El!: HTMLElement;
  private cd2El!: HTMLElement;
  private cd3El!: HTMLElement;
  private cd4El!: HTMLElement;
  private cdPotEl!: HTMLElement;
  private potCountEl!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.build();
  }

  private build() {
    const hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    hudContainer.style.display = 'none';

    hudContainer.innerHTML = `
      <!-- TOP HUD -->
      <div id="hud-top">
        <!-- Top Left: Sector Info, Quest Tracker & Tactical Event Log -->
        <div id="hud-top-left" style="display:flex; flex-direction:column; gap:10px; pointer-events:none; max-width:330px;">
          <div class="sector-badge">
            <div class="sector-name" id="hud-sector-name">ILMAN LUOMINEN</div>
            <div class="sector-sub" id="hud-sector-sub">Ilmattaren Aallot & Sotkan Muna</div>
          </div>

          <div id="objective-tracker">
            <div class="objective-header">
              <span class="obj-icon">🎯</span>
              <span>SECTOR PROTOCOLS</span>
            </div>
            <div class="objective-item" id="obj-puzzle">
              <span class="obj-check" id="chk-puzzle"></span>
              <span>Decode Monolith to Awaken Guardian (<span id="puzzle-shard-tracker" style="color:var(--gold-runic); font-weight:700;">0/4 Symbols</span>)</span>
            </div>
            <div class="objective-item" id="obj-enemies">
              <span class="obj-check" id="chk-enemies"></span>
              <span>Purge Corrupted Hostiles (<span id="enemy-kill-count">0</span>/<span id="enemy-kill-target">10</span>)</span>
            </div>
            <div class="objective-item" id="obj-boss">
              <span class="obj-check" id="chk-boss"></span>
              <span>Neutralize Awakened Guardian</span>
            </div>
          </div>

          <!-- Tactical Live Log -->
          <div id="tactical-log-container">
            <div class="tactical-log-header">
              <span class="log-radar-dot"></span>
              <span>TACTICAL TELEMETRY</span>
            </div>
            <div id="tactical-log-feed"></div>
          </div>
        </div>

        <!-- Boss Bar (Center Top) -->
        <div id="boss-bar-container" style="display:none;">
          <div class="boss-title-row">
            <span class="boss-skull">💀</span>
            <div class="boss-info">
              <div id="boss-display-name" class="boss-name">GUARDIAN ENTITY</div>
              <div id="boss-display-sub" class="boss-sub">CORRUPTED SENTINEL</div>
            </div>
          </div>
          <div class="boss-hp-track">
            <div class="boss-hp-fill" id="boss-hp-fill" style="width:100%;"></div>
          </div>
        </div>

        <!-- Ancient Monolith Waypoint Navigation HUD (Center Top, activated when all 4 magic symbols are gathered) -->
        <div id="monolith-nav-container" style="display:none; pointer-events:none; width: 460px; max-width: 90vw; background: rgba(15, 23, 42, 0.96); border: 2px solid var(--gold-runic); border-radius: 8px; padding: 8px 16px; box-shadow: 0 0 30px rgba(245, 158, 11, 0.55); text-align: center;">
          <div style="font-family:var(--font-mono); font-size:10.5px; letter-spacing:2px; color:#fef08a; font-weight:700; display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <span>⚡ ALL 4 MAGIC SYMBOLS ASSEMBLED // CIPHER READY</span>
            <span id="monolith-nav-status" style="color:var(--gold-runic); font-size:11px; font-weight:800;">DECODER UNLOCKED</span>
          </div>
          <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; margin-bottom:5px;">
            <div id="monolith-nav-progress" style="width:100%; height:100%; background:linear-gradient(90deg, #f59e0b, #38bdf8);"></div>
          </div>
          <div style="font-family:var(--font-rune); font-size:12.5px; color:#ffffff; letter-spacing:1px; display:flex; justify-content:center; align-items:center; gap:8px;">
            <span>ANCIENT MONOLITH:</span>
            <span id="monolith-nav-dist" style="font-family:var(--font-mono); font-size:13.5px; color:#38bdf8; font-weight:700;">--</span>
          </div>
        </div>

        <!-- Escape Sequence Emergency HUD (Center Top, activated after Boss Defeat) -->
        <div id="escape-bar-container" style="display:none; pointer-events:none; width: 440px; max-width: 90vw; background: rgba(15, 23, 42, 0.96); border: 2px solid #ef4444; border-radius: 8px; padding: 10px 18px; box-shadow: 0 0 35px rgba(239, 68, 68, 0.7); text-align: center;">
          <div style="font-family:var(--font-mono); font-size:11px; letter-spacing:2.5px; color:#fef08a; font-weight:700; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span>⚠️ REALM COLLAPSE IN PROGRESS</span>
            <span id="escape-timer-text" style="color:#ef4444; font-size:16px; font-weight:900;">35.0s</span>
          </div>
          <div style="height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-bottom:6px;">
            <div id="escape-timer-fill" style="width:100%; height:100%; background:linear-gradient(90deg, #ef4444, #f59e0b); transition:width 0.05s linear;"></div>
          </div>
          <div style="font-family:var(--font-rune); font-size:12px; color:#ffffff; letter-spacing:1px; display:flex; justify-content:center; align-items:center; gap:8px;">
            <span>PORTAL BEACON:</span>
            <span id="escape-nav-dist" style="font-family:var(--font-mono); font-size:13px; color:#38bdf8; font-weight:700;">--</span>
          </div>
        </div>

        <!-- Top Right: Tactical Minimap Radar & Nanite Scrap Counter -->
        <div id="hud-top-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; pointer-events:none;">
          <!-- Tactical Minimap Radar -->
          <div id="minimap-wrapper">
            <canvas id="minimap-canvas" width="160" height="160"></canvas>
            <div style="position:absolute; top:4px; left:6px; font-family:var(--font-mono); font-size:9px; color:var(--cyan-core); letter-spacing:1.2px; font-weight:700; pointer-events:none; text-shadow:0 1px 3px #000; display:flex; align-items:center; gap:4px;">
              <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#38bdf8; box-shadow:0 0 6px #38bdf8;"></span>
              RADAR // 360°
            </div>
          </div>

          <!-- Nanite Scrap Counter -->
          <div id="nanite-counter">
            <span class="nanite-icon">🧬</span>
            <span id="hud-scrap-val">0</span>
            <span class="nanite-lbl">SCRAP</span>
          </div>
        </div>
      </div>

      <!-- BOTTOM HUD (Vitals, Ability Bar & Quick Controls) -->
      <div id="hud-bottom">
        <!-- Vitals Plate -->
        <div class="vitals-plate">
          <!-- Level / Phenotype Avatar -->
          <div class="hero-avatar-box" style="position:relative; overflow:hidden; border: 2px solid var(--cyan-core); background:#060a12;">
            <canvas id="hud-avatar-canvas" width="48" height="48" style="width:100%; height:100%; display:block;"></canvas>
            <div class="hero-level-badge" id="hud-lvl-badge">1</div>
          </div>

          <div class="vitals-bars">
            <!-- Health -->
            <div class="bar-row">
              <div class="bar-label-group">
                <span class="bar-title">HEALTH</span>
                <span class="bar-value" id="hud-hp-val">100 / 100</span>
              </div>
              <div class="hud-progress">
                <div class="hud-progress-fill hp" id="hud-hp-fill"></div>
              </div>
            </div>

            <!-- Shield -->
            <div class="bar-row">
              <div class="bar-label-group">
                <span class="bar-title">ENERGY SHIELD</span>
                <span class="bar-value" id="hud-shield-val">50 / 50</span>
              </div>
              <div class="hud-progress">
                <div class="hud-progress-fill shield" id="hud-shield-fill"></div>
              </div>
            </div>

            <!-- Väki / Energy & XP -->
            <div class="bar-row">
              <div class="bar-label-group">
                <span class="bar-title">VÄKI (WILL)</span>
                <span class="bar-value" id="hud-vaki-val">100 / 100</span>
              </div>
              <div class="hud-progress">
                <div class="hud-progress-fill vaki" id="hud-vaki-fill"></div>
              </div>
            </div>
            <div class="hud-progress" style="height:3px;">
              <div class="hud-progress-fill xp" id="hud-xp-fill" style="width:0%;"></div>
            </div>
          </div>
        </div>

        <!-- Ability Hotbar (with Right-Click Aegis Shield & Archetype Special Attack) -->
        <div class="action-bar">
          <div class="ability-slot special" id="slot-ability-shield" title="[RIGHT CLICK] Aegis Energy Shield: 5s Invulnerable Barrier against Enemy Fire" style="border-color: #38bdf8; box-shadow: 0 0 14px rgba(56, 189, 248, 0.45); position: relative; overflow: hidden;">
            <span class="ability-key" style="background:#38bdf8; color:#0f172a; font-weight:800; font-size: 9px; padding: 1px 3px;">RMB</span>
            <span class="ability-icon" id="shield-ability-icon">🛡️</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-shield"></div>
            <div class="special-charge-bar" id="shield-duration-fill" style="position: absolute; bottom: 0; left: 0; height: 4px; background: #38bdf8; width: 0%; box-shadow: 0 0 8px #7dd3fc;"></div>
          </div>
          <div class="ability-slot special" id="slot-ability-special" title="[HOLD LMB / SPACE] Archetype Special Attack" style="border-color: #facc15; box-shadow: 0 0 14px rgba(250, 204, 21, 0.45); position: relative; overflow: hidden;">
            <span class="ability-key" style="background:#facc15; color:#0f172a; font-weight:800; font-size: 9px; padding: 1px 3px;">HOLD</span>
            <span class="ability-icon" id="special-ability-icon">⚡</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-special"></div>
            <div class="special-charge-bar" id="special-charge-fill" style="position: absolute; bottom: 0; left: 0; height: 4px; background: #facc15; width: 0%; box-shadow: 0 0 8px #fef08a;"></div>
          </div>
          <div class="ability-slot" id="slot-ability-1" title="[1] Ukonvasara: Lightning EMP Slam">
            <span class="ability-key">1</span>
            <span class="ability-icon">⚡</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-1"></div>
          </div>
          <div class="ability-slot" id="slot-ability-2" title="[2] Kipinä Dash: Plasma Jet Roll">
            <span class="ability-key">2</span>
            <span class="ability-icon">🔥</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-2"></div>
          </div>
          <div class="ability-slot" id="slot-ability-3" title="[3] Tuoni Siphon: Shield Barrier">
            <span class="ability-key">3</span>
            <span class="ability-icon">🛡️</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-3"></div>
          </div>
          <div class="ability-slot" id="slot-ability-4" title="[4 / R] Sampo Overclock: Runic Frenzy">
            <span class="ability-key">4</span>
            <span class="ability-icon">⚙️</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-4"></div>
          </div>
          <div class="ability-slot" id="slot-potion" title="[Q / 5] Nano-Repair Injector">
            <span class="ability-key">Q</span>
            <span class="ability-icon">💉</span>
            <span class="item-count" id="potion-count-badge">x3</span>
            <div class="ability-cooldown-overlay" id="cd-overlay-pot"></div>
          </div>
        </div>

        <!-- HUD Action Buttons -->
        <div class="hud-btn-bar">
          <button class="hud-icon-btn" id="btn-pause-menu" title="Pause Menu & Instructions (ESC)">⏸️<span style="font-size:9px;">MENU</span></button>
          <button class="hud-icon-btn" id="btn-toggle-saga" title="Kalevala Saga Map">🗺️<span style="font-size:9px;">SAGA</span></button>
          <button class="hud-icon-btn" id="btn-toggle-inv" title="Toggle Inventory (I)">🎒<span style="font-size:9px;">INV</span></button>
          <button class="hud-icon-btn" id="btn-toggle-char" title="Toggle Character (C)">👤<span style="font-size:9px;">STAT</span></button>
          <button class="hud-icon-btn" id="btn-toggle-forge" title="Nanite Forge (F)">🔨<span style="font-size:9px;">FORGE</span></button>
          <button class="hud-icon-btn" id="btn-zoom-in" title="Zoom In (+ / Wheel Up)">🔍<span style="font-size:9px;">+</span></button>
          <button class="hud-icon-btn" id="btn-zoom-out" title="Zoom Out (- / Wheel Down)">🔍<span style="font-size:9px;">-</span></button>
          <button class="hud-icon-btn" id="btn-toggle-mute" title="Mute Audio">🔊</button>
        </div>
      </div>
    `;

    this.root.appendChild(hudContainer);

    // Cache elements
    this.bossBarEl = document.getElementById('boss-bar-container')!;
    this.bossHpFillEl = document.getElementById('boss-hp-fill')!;
    this.bossNameEl = document.getElementById('boss-display-name')!;
    this.bossSubEl = document.getElementById('boss-display-sub')!;
    this.logFeedEl = document.getElementById('tactical-log-feed')!;

    this.hpFillEl = document.getElementById('hud-hp-fill')!;
    this.hpTextEl = document.getElementById('hud-hp-val')!;
    this.shieldFillEl = document.getElementById('hud-shield-fill')!;
    this.shieldTextEl = document.getElementById('hud-shield-val')!;
    this.vakiFillEl = document.getElementById('hud-vaki-fill')!;
    this.vakiTextEl = document.getElementById('hud-vaki-val')!;
    this.xpFillEl = document.getElementById('hud-xp-fill')!;
    this.levelBadgeEl = document.getElementById('hud-lvl-badge')!;

    this.cdShieldEl = document.getElementById('cd-overlay-shield')!;
    this.shieldDurationFillEl = document.getElementById('shield-duration-fill')!;
    this.cdSpecialEl = document.getElementById('cd-overlay-special')!;
    this.specialChargeFillEl = document.getElementById('special-charge-fill')!;
    this.cd1El = document.getElementById('cd-overlay-1')!;
    this.cd2El = document.getElementById('cd-overlay-2')!;
    this.cd3El = document.getElementById('cd-overlay-3')!;
    this.cd4El = document.getElementById('cd-overlay-4')!;
    this.cdPotEl = document.getElementById('cd-overlay-pot')!;
    this.potCountEl = document.getElementById('potion-count-badge')!;
  }

  addLog(text: string, type: LogType = 'system') {
    if (!this.logFeedEl) {
      this.logFeedEl = document.getElementById('tactical-log-feed')!;
    }
    if (!this.logFeedEl) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const badgeMap: Record<LogType, { label: string; color: string; icon: string }> = {
      loot: { label: 'LOOT', color: '#f59e0b', icon: '💎' },
      kill: { label: 'KILL', color: '#ef4444', icon: '⚔️' },
      heal: { label: 'HEAL', color: '#10b981', icon: '💉' },
      skill: { label: 'SKILL', color: '#38bdf8', icon: '⚡' },
      rune: { label: 'RUNE', color: '#c084fc', icon: '🔮' },
      level: { label: 'LEVEL', color: '#fbbf24', icon: '⭐' },
      system: { label: 'SYS', color: '#94a3b8', icon: '📡' },
      alert: { label: 'WARN', color: '#f87171', icon: '⚠️' }
    };

    const b = badgeMap[type] || badgeMap.system;

    entry.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-badge" style="color:${b.color}; border-color:${b.color}55; background:${b.color}15;">${b.icon} ${b.label}</span>
      <span class="log-text">${text}</span>
    `;

    this.logFeedEl.appendChild(entry);

    // Keep only the latest maxLogs
    while (this.logFeedEl.children.length > this.maxLogs) {
      this.logFeedEl.removeChild(this.logFeedEl.children[0]);
    }

    // Scroll to bottom smoothly
    this.logFeedEl.scrollTop = this.logFeedEl.scrollHeight;
  }

  update(
    player: Player,
    biome: BiomeDefinition,
    boss?: { name: string; title: string; health: number; maxHealth: number; isDead: boolean },
    objectives?: { puzzleDone: boolean; kills: number; targetKills: number; bossDone: boolean; shardsCollected?: number; totalShards?: number }
  ) {
    // Vitals
    const hpPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
    this.hpFillEl.style.width = `${hpPct}%`;
    this.hpTextEl.textContent = `${Math.round(player.health)} / ${player.maxHealth}`;

    const shieldPct = Math.max(0, Math.min(100, (player.shield / player.maxShield) * 100));
    this.shieldFillEl.style.width = `${shieldPct}%`;
    this.shieldTextEl.textContent = `${Math.round(player.shield)} / ${player.maxShield}`;

    const vakiPct = Math.max(0, Math.min(100, (player.energy / player.maxEnergy) * 100));
    this.vakiFillEl.style.width = `${vakiPct}%`;
    this.vakiTextEl.textContent = `${Math.round(player.energy)} / ${player.maxEnergy}`;

    const xpToNext = player.getXPToNextLevel();
    const xpPct = Math.max(0, Math.min(100, (player.xp / xpToNext) * 100));
    this.xpFillEl.style.width = `${xpPct}%`;
    this.levelBadgeEl.textContent = player.level.toString();

    // Nanite Scrap Counter
    const scrapValEl = document.getElementById('hud-scrap-val');
    if (scrapValEl) {
      scrapValEl.textContent = (player.naniteScrap || 0).toLocaleString();
    }

    // Draw HUD Hero Avatar
    const avatarCanvas = document.getElementById('hud-avatar-canvas') as HTMLCanvasElement;
    if (avatarCanvas) {
      const ctx = avatarCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 48, 48);
        HeroRenderer.drawPortrait(ctx, 24, 24, 46, player.appearance);
      }
    }

    // Special Attack Icon & Cooldown & Charge update
    const iconEl = document.getElementById('special-ability-icon');
    if (iconEl) {
      iconEl.textContent = player.appearance.archetype === 'soturi' ? '⚡' : (player.appearance.archetype === 'runoseppä' ? '🎵' : (player.appearance.archetype === 'tietäjä' ? '🌌' : '🎯'));
    }

    this.updateCD(this.cdSpecialEl, player.specialCooldown, player.maxSpecialCooldown);

    if (this.specialChargeFillEl) {
      if (player.isChargingSpecial) {
        const chargePct = Math.min(100, (player.specialChargeTime / player.maxSpecialChargeTime) * 100);
        this.specialChargeFillEl.style.width = `${chargePct}%`;
      } else {
        this.specialChargeFillEl.style.width = '0%';
      }
    }

    // Ability cooldown wipes
    this.updateCD(this.cd1El, player.cooldowns.ability1, player.maxCooldowns.ability1);
    this.updateCD(this.cd2El, player.cooldowns.ability2, player.maxCooldowns.ability2);
    this.updateCD(this.cd3El, player.cooldowns.ability3, player.maxCooldowns.ability3);
    this.updateCD(this.cd4El, player.cooldowns.ability4, player.maxCooldowns.ability4);
    this.updateCD(this.cdPotEl, player.cooldowns.potion, player.maxCooldowns.potion);

    // Potions count
    const potItem = player.inventory.find(i => i.type === 'consumable');
    const count = potItem ? (potItem.quantity ?? 1) : 0;
    this.potCountEl.textContent = `x${count}`;

    // Boss Bar
    if (boss && !boss.isDead) {
      this.bossBarEl.style.display = 'block';
      this.bossNameEl.textContent = boss.name.toUpperCase();
      this.bossSubEl.textContent = boss.title.toUpperCase();
      const bossHpPct = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
      this.bossHpFillEl.style.width = `${bossHpPct}%`;
    } else {
      this.bossBarEl.style.display = 'none';
    }

    // Objectives
    if (objectives) {
      const chkPuz = document.getElementById('chk-puzzle');
      const shardTrackerEl = document.getElementById('puzzle-shard-tracker');
      if (shardTrackerEl && objectives.shardsCollected !== undefined) {
        if (objectives.puzzleDone) {
          shardTrackerEl.textContent = 'DECRYPTED ✓';
          shardTrackerEl.style.color = '#10b981';
        } else if (objectives.shardsCollected >= 4) {
          shardTrackerEl.textContent = 'READY TO SYNC ⚡';
          shardTrackerEl.style.color = '#f59e0b';
        } else {
          shardTrackerEl.textContent = `${objectives.shardsCollected}/4 Symbols`;
          shardTrackerEl.style.color = 'var(--gold-runic)';
        }
      }
      if (chkPuz) {
        if (objectives.puzzleDone) chkPuz.classList.add('checked');
        else chkPuz.classList.remove('checked');
      }

      const chkEnm = document.getElementById('chk-enemies');
      const killCountEl = document.getElementById('enemy-kill-count');
      const killTargetEl = document.getElementById('enemy-kill-target');
      if (killCountEl) killCountEl.textContent = objectives.kills.toString();
      if (killTargetEl) killTargetEl.textContent = objectives.targetKills.toString();
      if (chkEnm) {
        if (objectives.kills >= objectives.targetKills) chkEnm.classList.add('checked');
        else chkEnm.classList.remove('checked');
      }

      const chkBoss = document.getElementById('chk-boss');
      if (chkBoss) {
        if (objectives.bossDone) chkBoss.classList.add('checked');
        else chkBoss.classList.remove('checked');
      }
    }
  }

  showBossBar(name: string, sub: string) {
    if (!this.bossBarEl) this.bossBarEl = document.getElementById('boss-bar-container')!;
    if (!this.bossNameEl) this.bossNameEl = document.getElementById('boss-display-name')!;
    if (!this.bossSubEl) this.bossSubEl = document.getElementById('boss-display-sub')!;
    if (this.bossBarEl) this.bossBarEl.style.display = 'block';
    if (this.bossNameEl) this.bossNameEl.textContent = name.toUpperCase();
    if (this.bossSubEl) this.bossSubEl.textContent = sub.toUpperCase();
  }

  hideBossBar() {
    if (!this.bossBarEl) this.bossBarEl = document.getElementById('boss-bar-container')!;
    if (this.bossBarEl) this.bossBarEl.style.display = 'none';
  }

  updateBossHealth(health: number, maxHealth: number) {
    if (!this.bossHpFillEl) this.bossHpFillEl = document.getElementById('boss-hp-fill')!;
    if (this.bossHpFillEl) {
      const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
      this.bossHpFillEl.style.width = `${pct}%`;
    }
  }

  private updateCD(el: HTMLElement, current: number, max: number) {
    if (current > 0) {
      const pct = (current / max) * 100;
      el.style.height = `${pct}%`;
    } else {
      el.style.height = '0%';
    }
  }

  setSector(biome: BiomeDefinition, loopCount: number = 0, diffMult: number = 1.0) {
    const nameEl = document.getElementById('hud-sector-name');
    const subEl = document.getElementById('hud-sector-sub');
    if (nameEl) {
      if (loopCount > 0) {
        nameEl.innerHTML = `${biome.name.toUpperCase()} <span style="display:inline-block; font-size:11px; font-weight:700; color:#f59e0b; background:rgba(245,158,11,0.15); border:1px solid #f59e0b; border-radius:4px; padding:1px 6px; margin-left:6px; letter-spacing:1px; vertical-align:middle; text-shadow:0 0 8px rgba(245,158,11,0.8);">🔥 LOOP ${loopCount + 1} (x${diffMult.toFixed(2)})</span>`;
      } else {
        nameEl.textContent = biome.name.toUpperCase();
      }
    }
    if (subEl) {
      if (loopCount > 0) {
        subEl.textContent = `${biome.subtitle} • Hardness x${diffMult.toFixed(2)} (+${Math.round(loopCount * 30)}% Scrap, +${Math.round(loopCount * 25)}% XP)`;
      } else {
        subEl.textContent = `${biome.subtitle}`;
      }
    }
  }

  showSwarmAlert(count: number, biomeName: string) {
    const existing = document.getElementById('hud-swarm-alert');
    if (existing) existing.remove();

    const alertEl = document.createElement('div');
    alertEl.id = 'hud-swarm-alert';
    alertEl.style.cssText = `
      position: fixed;
      top: 18%;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(90deg, rgba(239,68,68,0) 0%, rgba(220,38,38,0.94) 20%, rgba(220,38,38,0.94) 80%, rgba(239,68,68,0) 100%);
      border-top: 2px solid #fca5a5;
      border-bottom: 2px solid #fca5a5;
      color: #ffffff;
      padding: 14px 60px;
      font-family: var(--font-rune);
      font-size: 20px;
      letter-spacing: 2.5px;
      text-shadow: 0 0 15px rgba(255,255,255,0.9), 0 0 25px rgba(239,68,68,0.9);
      box-shadow: 0 0 45px rgba(239,68,68,0.7);
      text-align: center;
      z-index: 9000;
      pointer-events: auto;
      animation: pulseGlow 0.4s infinite alternate;
    `;
    alertEl.innerHTML = `
      <button id="btn-close-swarm-x" title="Close Alert" style="
        position: absolute;
        top: 6px;
        right: 18px;
        background: none;
        border: none;
        color: #fca5a5;
        font-size: 22px;
        font-weight: 300;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
      ">&times;</button>
      <div style="font-size:12px; font-family:var(--font-mono); letter-spacing:4px; color:#fef08a; margin-bottom:3px;">
        ⚠️ SENSOR ANOMALY // INCOMING HOSTILE HORDE ⚠️
      </div>
      <div>
        WARP BREACH: ${count} HOSTILES SURGING BEYOND VISIBILITY RANGE
      </div>
    `;

    this.root.appendChild(alertEl);

    const closeAlert = () => {
      alertEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alertEl.style.opacity = '0';
      alertEl.style.transform = 'translateX(-50%) translateY(-25px)';
      setTimeout(() => alertEl.remove(), 500);
    };

    document.getElementById('btn-close-swarm-x')?.addEventListener('click', closeAlert);

    setTimeout(() => {
      if (document.body.contains(alertEl)) {
        closeAlert();
      }
    }, 3800);
  }

  showEscapeTimer() {
    const el = document.getElementById('escape-bar-container');
    const bossEl = document.getElementById('boss-bar-container');
    if (bossEl) bossEl.style.display = 'none';
    if (el) el.style.display = 'block';
  }

  updateEscapeTimer(remaining: number, maxTime: number, dist?: number, dx?: number, dy?: number) {
    const el = document.getElementById('escape-bar-container');
    const bossEl = document.getElementById('boss-bar-container');
    if (bossEl) bossEl.style.display = 'none'; // Hide boss bar during escape
    if (el) el.style.display = 'block';

    const textEl = document.getElementById('escape-timer-text');
    const fillEl = document.getElementById('escape-timer-fill');
    const navDistEl = document.getElementById('escape-nav-dist');

    if (textEl) textEl.textContent = `${Math.max(0, remaining).toFixed(1)}s`;
    if (fillEl) {
      const pct = Math.max(0, (remaining / maxTime) * 100);
      fillEl.style.width = `${pct}%`;
      if (pct < 35) {
        fillEl.style.background = '#ef4444';
      } else {
        fillEl.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';
      }
    }

    if (navDistEl && dist !== undefined && dx !== undefined && dy !== undefined) {
      // Calculate compass direction arrow towards portal (dx = portal.x - player.x, dy = portal.y - player.y)
      const angle = Math.atan2(dy, dx);
      let arrow = '➡️';
      const deg = (angle * 180 / Math.PI + 360) % 360;
      if (deg >= 337.5 || deg < 22.5) arrow = '➡️ [EAST]';
      else if (deg >= 22.5 && deg < 67.5) arrow = '↘️ [SE]';
      else if (deg >= 67.5 && deg < 112.5) arrow = '⬇️ [SOUTH]';
      else if (deg >= 112.5 && deg < 157.5) arrow = '↙️ [SW]';
      else if (deg >= 157.5 && deg < 202.5) arrow = '⬅️ [WEST]';
      else if (deg >= 202.5 && deg < 247.5) arrow = '↖️ [NW]';
      else if (deg >= 247.5 && deg < 292.5) arrow = '⬆️ [NORTH]';
      else if (deg >= 292.5 && deg < 337.5) arrow = '↗️ [NE]';

      navDistEl.innerHTML = `<span style="color:#38bdf8; font-size:14px;">${arrow}</span> <span style="color:#ffffff; font-weight:700;">${Math.round(dist * 2)}m AWAY</span>`;
    }
  }

  hideEscapeTimer() {
    const el = document.getElementById('escape-bar-container');
    if (el) el.style.display = 'none';
  }

  // Monolith Waypoint Navigation Methods
  showMonolithNavigation() {
    const el = document.getElementById('monolith-nav-container');
    const bossEl = document.getElementById('boss-bar-container');
    const escapeEl = document.getElementById('escape-bar-container');
    if (escapeEl && escapeEl.style.display === 'block') return;
    if (bossEl && bossEl.style.display === 'block') return;
    if (el) el.style.display = 'block';
  }

  updateMonolithNavigation(dist: number, dx: number, dy: number, isNearby: boolean, bossName: string) {
    const el = document.getElementById('monolith-nav-container');
    const bossEl = document.getElementById('boss-bar-container');
    const escapeEl = document.getElementById('escape-bar-container');
    if ((escapeEl && escapeEl.style.display === 'block') || (bossEl && bossEl.style.display === 'block')) {
      if (el) el.style.display = 'none';
      return;
    }
    if (el) el.style.display = 'block';

    const distEl = document.getElementById('monolith-nav-dist');
    const statusEl = document.getElementById('monolith-nav-status');

    if (distEl) {
      if (isNearby) {
        distEl.innerHTML = `<span style="color:#10b981; font-weight:800; font-size:13.5px; text-shadow:0 0 10px #10b981;">⚡ [E] PRESS E TO DECIPHER CIPHER & AWAKEN GUARDIAN!</span>`;
      } else {
        const angle = Math.atan2(dy, dx);
        let arrow = '➡️';
        const deg = (angle * 180 / Math.PI + 360) % 360;
        if (deg >= 337.5 || deg < 22.5) arrow = '➡️ [EAST]';
        else if (deg >= 22.5 && deg < 67.5) arrow = '↘️ [SE]';
        else if (deg >= 67.5 && deg < 112.5) arrow = '⬇️ [SOUTH]';
        else if (deg >= 112.5 && deg < 157.5) arrow = '↙️ [SW]';
        else if (deg >= 157.5 && deg < 202.5) arrow = '⬅️ [WEST]';
        else if (deg >= 202.5 && deg < 247.5) arrow = '↖️ [NW]';
        else if (deg >= 247.5 && deg < 292.5) arrow = '⬆️ [NORTH]';
        else if (deg >= 292.5 && deg < 337.5) arrow = '↗️ [NE]';

        distEl.innerHTML = `<span style="color:#f59e0b; font-size:14px;">${arrow}</span> <span style="color:#ffffff; font-weight:700;">${Math.round(dist * 2)}m AWAY</span>`;
      }
    }

    if (statusEl) {
      statusEl.textContent = isNearby ? 'INTERACTION READY' : 'HARMONIC PROTOCOL UNLOCKED';
      statusEl.style.color = isNearby ? '#10b981' : '#f59e0b';
    }
  }

  hideMonolithNavigation() {
    const el = document.getElementById('monolith-nav-container');
    if (el) el.style.display = 'none';
  }

  // Notification State Methods
  isNotificationOpen(): boolean {
    return this.runicBannerEl !== null;
  }

  closeRunicCompleteBanner() {
    if (this.runicBannerEl) {
      const el = this.runicBannerEl;
      this.runicBannerEl = null;
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => el.remove(), 350);
    }
  }

  // Cinematic All-Magic-Symbols-Collected Modal Banner (Pauses Game until dismissed)
  showRunicCompleteBanner(
    shards: { glyph: string; name: string; finnishTitle: string }[],
    bossName: string,
    isFinalBoss: boolean = false,
    onProceed?: () => void
  ) {
    this.closeRunicCompleteBanner();

    this.runicBannerEl = document.createElement('div');
    this.runicBannerEl.id = 'runic-complete-banner-modal';
    this.runicBannerEl.className = 'sampo-modal interactive';
    this.runicBannerEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 640px;
      max-width: 95vw;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 14, 23, 0.98) 100%);
      border: 2px solid ${isFinalBoss ? '#fbbf24' : '#f59e0b'};
      border-radius: 12px;
      padding: 26px 30px;
      box-shadow: 0 0 60px rgba(245, 158, 11, 0.6), 0 20px 80px rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      z-index: 10000;
      pointer-events: auto;
      backdrop-filter: blur(16px);
      box-sizing: border-box;
      opacity: 0;
      transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    const titleText = isFinalBoss
      ? '👑 FINAL HARMONIC RESONANCE ACHIEVED 👑'
      : '⚡ ALL 4 MAGIC SYMBOLS ASSEMBLED! ⚡';

    const subTitleText = isFinalBoss
      ? 'THE SUPREME FORGE IS READY TO SYNCHRONIZE // UNSEAL THE APEX MATRIX'
      : 'HARMONIC RESONANCE PROTOCOL ONLINE // CIPHER DECRYPTION UNLOCKED';

    const romanNums = ['I', 'II', 'III', 'IV'];

    this.runicBannerEl.innerHTML = `
      <!-- Top Right Close [X] Button -->
      <button id="btn-close-runic-banner-x" title="Close Notification" style="
        position: absolute;
        top: 12px;
        right: 16px;
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 26px;
        font-weight: 300;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.15s;
        line-height: 1;
      ">&times;</button>

      <div style="font-family:var(--font-mono); font-size:11px; letter-spacing:3px; color:#fde68a; font-weight:700; padding-right:20px;">
        ${subTitleText}
      </div>

      <div style="font-family:var(--font-rune); font-size:24px; color:${isFinalBoss ? '#fde047' : '#f59e0b'}; font-weight:900; letter-spacing:2px; text-shadow:0 0 25px rgba(245, 158, 11, 0.8);">
        ${titleText}
      </div>

      <!-- 4 Magic Symbol Glyph Cards (Guaranteed 4 Columns) -->
      <div style="display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; width:100%; max-width:540px; box-sizing:border-box; margin:4px auto;">
        ${shards.map((s, idx) => `
          <div style="
            min-width: 0;
            width: 100%;
            box-sizing: border-box;
            background: rgba(30, 41, 59, 0.8);
            border: 1.5px solid var(--gold-runic);
            border-radius: 8px;
            padding: 8px 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
            overflow: hidden;
          ">
            <div style="font-family:var(--font-mono); font-size:9px; color:#94a3b8; font-weight:700;">
              POS ${romanNums[idx] || idx + 1}
            </div>
            <div style="font-size:26px; color:#ffffff; text-shadow:0 0 12px #f59e0b; line-height:1.2;">
              ${s.glyph}
            </div>
            <div style="font-family:var(--font-rune); font-size:10.5px; color:#fde047; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; width:100%; text-align:center;">
              ${s.name}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="font-family:var(--font-body); font-size:13.5px; color:#e2e8f0; line-height:1.6; max-width:540px; background:rgba(0,0,0,0.3); padding:10px 16px; border-radius:6px; border:1px solid rgba(245,158,11,0.2);">
        All cryptographic magic symbol fragments (<em>loitsumerkit</em>) have been recovered! Locate the <strong>Ancient Monolith</strong> in this sector to decipher the harmonic verse, unseal all treasure vaults, and awaken <strong>${bossName.toUpperCase()}</strong>!
      </div>

      <!-- Action Buttons Row with Proceed and Explicit Close -->
      <div style="display:flex; gap:12px; width:100%; justify-content:center; margin-top:4px; flex-wrap:wrap;">
        <button id="btn-proceed-monolith" class="sampo-btn gold" style="
          padding: 10px 24px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 1.5px;
          box-shadow: 0 0 25px rgba(245, 158, 11, 0.6);
          cursor: pointer;
        ">
          🔮 LOCATE ANCIENT MONOLITH & FACE GUARDIAN
        </button>
        <button id="btn-close-runic-banner" class="sampo-btn" style="
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          border-color: #94a3b8;
          color: #cbd5e1;
          cursor: pointer;
        ">
          ✖ CLOSE
        </button>
      </div>
    `;

    this.root.appendChild(this.runicBannerEl);

    // Trigger enter animation
    requestAnimationFrame(() => {
      if (this.runicBannerEl) {
        this.runicBannerEl.style.opacity = '1';
        this.runicBannerEl.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });

    const handleDismiss = (proceed: boolean = false) => {
      this.closeRunicCompleteBanner();
      if (proceed && onProceed) onProceed();
    };

    document.getElementById('btn-close-runic-banner-x')?.addEventListener('click', () => handleDismiss(false));
    document.getElementById('btn-close-runic-banner')?.addEventListener('click', () => handleDismiss(false));
    document.getElementById('btn-proceed-monolith')?.addEventListener('click', () => handleDismiss(true));
  }

  // Dramatic Realm Guardian Awakening Screen Announcement Banner
  showBossAwakeningBanner(bossName: string, bossTitle: string, isFinalBoss: boolean = false) {
    const existing = document.getElementById('hud-boss-awakening-banner');
    if (existing) existing.remove();

    const bannerEl = document.createElement('div');
    bannerEl.id = 'hud-boss-awakening-banner';
    bannerEl.style.cssText = `
      position: absolute;
      top: 18%;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(90deg, rgba(220, 38, 38, 0) 0%, rgba(220, 38, 38, 0.95) 20%, rgba(15, 23, 42, 0.98) 50%, rgba(220, 38, 38, 0.95) 80%, rgba(220, 38, 38, 0) 100%);
      border-top: 2px solid ${isFinalBoss ? '#fbbf24' : '#ef4444'};
      border-bottom: 2px solid ${isFinalBoss ? '#fbbf24' : '#ef4444'};
      color: #ffffff;
      padding: 16px 70px;
      font-family: var(--font-rune);
      font-size: 22px;
      letter-spacing: 2.5px;
      text-shadow: 0 0 20px rgba(239,68,68,0.9), 0 0 40px rgba(245,158,11,0.8);
      box-shadow: 0 0 50px rgba(239,68,68,0.8);
      text-align: center;
      z-index: 9000;
      pointer-events: auto;
      animation: pulseGlow 0.4s infinite alternate;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    `;

    bannerEl.innerHTML = `
      <button id="btn-close-boss-banner-x" title="Close Notification" style="
        position: absolute;
        top: 6px;
        right: 18px;
        background: none;
        border: none;
        color: #fca5a5;
        font-size: 22px;
        font-weight: 300;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
      ">&times;</button>
      <div style="font-size:11px; font-family:var(--font-mono); letter-spacing:4px; color:#fef08a; margin-bottom:2px;">
        ⚠️ REALM CONTAINMENT SHATTERED // APEX THREAT MATERIALIZED ⚠️
      </div>
      <div style="font-weight:900; font-size:26px; color:#fef2f2; text-transform:uppercase;">
        💀 ${bossName} 💀
      </div>
      <div style="font-size:12.5px; font-family:var(--font-mono); color:#fca5a5; letter-spacing:2px; margin-top:2px;">
        ${bossTitle.toUpperCase()}
      </div>
    `;

    this.root.appendChild(bannerEl);

    const closeBanner = () => {
      bannerEl.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      bannerEl.style.opacity = '0';
      bannerEl.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => bannerEl.remove(), 500);
    };

    document.getElementById('btn-close-boss-banner-x')?.addEventListener('click', closeBanner);

    setTimeout(() => {
      if (document.body.contains(bannerEl)) {
        closeBanner();
      }
    }, 4500);
  }

  show() {
    const el = document.getElementById('hud-container');
    if (el) el.style.display = 'block';
  }

  hide() {
    const el = document.getElementById('hud-container');
    if (el) el.style.display = 'none';
  }
}
