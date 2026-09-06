// Character Sheet & Core Attribute Point Allocation UI

import { Player, getDefaultStatsForArchetype } from '../entities/player';
import { soundEngine } from '../engine/audio';
import { HeroRenderer } from '../engine/hero_renderer';

export class CharacterSheetUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onPlayerUpdate: () => void;

  constructor(root: HTMLElement, onPlayerUpdate: () => void) {
    this.root = root;
    this.onPlayerUpdate = onPlayerUpdate;
  }

  toggle(player: Player) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(player);
    }
  }

  open(player: Player) {
    this.close();
    this.isOpen = true;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'sampo-modal interactive';
    this.modalEl.style.width = '560px';

    this.modalEl.innerHTML = `
      <div class="sampo-modal-header">
        <div class="sampo-modal-title" style="display:flex; align-items:center; gap:8px;">
          <span>👤</span> PROTOCOL ATTRIBUTES & BIO-DATA
          <span style="background:rgba(56,189,248,0.15); border:1px solid var(--cyan-core); color:var(--cyan-core); font-size:10px; font-family:var(--font-mono); font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:1px; margin-left:6px;">⏸️ PAUSED</span>
        </div>
        <button class="sampo-modal-close" id="char-close-btn">&times;</button>
      </div>

      <div class="sampo-modal-body">
        <div class="stat-allocation-panel">
          <!-- Summary Header -->
          <div class="stat-header-row" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:60px; height:60px; border-radius:6px; border:2px solid var(--cyan-core); overflow:hidden; background:#060a12; flex-shrink:0; box-shadow:0 0 10px rgba(56,189,248,0.35);">
                <canvas id="char-sheet-avatar-canvas" width="60" height="60" style="width:100%; height:100%; display:block;"></canvas>
              </div>
              <div>
                <div style="font-family:var(--font-rune); font-size:18px; color:var(--text-main); font-weight:700;">${player.name}</div>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--cyan-core); text-transform:uppercase;">
                  LVL ${player.level} ${player.appearance.archetype}
                </div>
                <div style="font-family:var(--font-mono); font-size:10px; color:#94a3b8; text-transform:uppercase;">
                  ${player.appearance.warPaint.replace('_', ' ')} // ${player.appearance.implant.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div class="unspent-points">
              UNSPENT SP: <span style="font-size:18px; color:#38bdf8; font-weight:800;" id="unspent-pts-badge">${player.stats.statPoints}</span>
            </div>
          </div>

          <!-- 4 Core Attributes -->
          <div class="stat-cards-list">
            <!-- Väki -->
            <div class="stat-card">
              <div class="stat-info">
                <div class="stat-title">VÄKI (Power / Runic Will)</div>
                <div class="stat-desc">+8 Energy Shield, +3% Elemental Spell & Weapon Damage</div>
              </div>
              <div class="stat-control">
                <span class="stat-val">${player.stats.vaki}</span>
                <button class="stat-plus-btn" data-attr="vaki" ${player.stats.statPoints <= 0 ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <!-- Sisu -->
            <div class="stat-card">
              <div class="stat-info">
                <div class="stat-title">SISU (Endurance / Resolve)</div>
                <div class="stat-desc">+12 Health Pool, +1.2 Natural Armor Mitigation</div>
              </div>
              <div class="stat-control">
                <span class="stat-val">${player.stats.sisu}</span>
                <button class="stat-plus-btn" data-attr="sisu" ${player.stats.statPoints <= 0 ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <!-- Nokkela -->
            <div class="stat-card">
              <div class="stat-info">
                <div class="stat-title">NOKKELA (Agility / Reflex)</div>
                <div class="stat-desc">+0.4% Critical Strike Chance, +0.08 Move Speed</div>
              </div>
              <div class="stat-control">
                <span class="stat-val">${player.stats.nokkela}</span>
                <button class="stat-plus-btn" data-attr="nokkela" ${player.stats.statPoints <= 0 ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <!-- Tieto -->
            <div class="stat-card">
              <div class="stat-info">
                <div class="stat-title">TIETO (Memory / Processing)</div>
                <div class="stat-desc">-1.5% Cooldown Reduction, +Insight into Runic Cryptographs</div>
              </div>
              <div class="stat-control">
                <span class="stat-val">${player.stats.tieto}</span>
                <button class="stat-plus-btn" data-attr="tieto" ${player.stats.statPoints <= 0 ? 'disabled' : ''}>+</button>
              </div>
            </div>
          </div>

          <!-- Derived Combat Readouts & Respec Action -->
          <div style="background:var(--bg-panel-sub); padding:14px; border:1px solid var(--border-dim); border-radius:4px; font-family:var(--font-mono); font-size:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>MAX HEALTH: <span style="color:#ef4444; font-weight:700;">${player.maxHealth}</span></div>
            <div>MAX SHIELD: <span style="color:#38bdf8; font-weight:700;">${player.maxShield}</span></div>
            <div>TOTAL ARMOR: <span style="color:var(--cyan-core); font-weight:700;">${player.armor}</span></div>
            <div>CRIT CHANCE: <span style="color:var(--gold-runic); font-weight:700;">${Math.round(5 + player.stats.nokkela * 0.4)}%</span></div>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:4px;">
            <button id="btn-respec-stats" class="sampo-btn small" style="padding:6px 14px; font-size:11px; border-color:var(--border-glow); color:var(--text-muted);" title="Refund all allocated attribute points back to unspent pool">
              🔄 RESPEC ATTRIBUTES
            </button>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Draw Hero Avatar Blueprint
    const avatarCanvas = this.modalEl.querySelector('#char-sheet-avatar-canvas') as HTMLCanvasElement;
    if (avatarCanvas) {
      const ctx = avatarCanvas.getContext('2d');
      if (ctx) {
        HeroRenderer.drawPortrait(ctx, 30, 30, 56, player.appearance);
      }
    }

    // Bind Close
    document.getElementById('char-close-btn')?.addEventListener('click', () => this.close());

    // Bind Stat Allocation
    const plusButtons = this.modalEl.querySelectorAll('.stat-plus-btn');
    plusButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const attr = (e.currentTarget as HTMLElement).getAttribute('data-attr') as keyof typeof player.stats;
        if (player.stats.statPoints > 0 && attr) {
          player.stats[attr]++;
          player.stats.statPoints--;
          player.recalculateDerivedStats();
          soundEngine.playRuneClick();
          this.onPlayerUpdate();
          this.open(player); // Re-render
        }
      });
    });

    // Bind Respec button
    document.getElementById('btn-respec-stats')?.addEventListener('click', () => {
      const baseStats = getDefaultStatsForArchetype(player.appearance.archetype);
      const spentVaki = Math.max(0, player.stats.vaki - baseStats.vaki);
      const spentSisu = Math.max(0, player.stats.sisu - baseStats.sisu);
      const spentNokkela = Math.max(0, player.stats.nokkela - baseStats.nokkela);
      const spentTieto = Math.max(0, player.stats.tieto - baseStats.tieto);

      const totalRefund = spentVaki + spentSisu + spentNokkela + spentTieto;
      if (totalRefund > 0) {
        player.stats.vaki = baseStats.vaki;
        player.stats.sisu = baseStats.sisu;
        player.stats.nokkela = baseStats.nokkela;
        player.stats.tieto = baseStats.tieto;
        player.stats.statPoints += totalRefund;
        player.recalculateDerivedStats();
        soundEngine.playLevelUp();
        this.onPlayerUpdate();
        this.open(player);
      } else {
        soundEngine.playRuneClick();
      }
    });
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    this.isOpen = false;
  }

  getIsOpen() {
    return this.isOpen;
  }
}
