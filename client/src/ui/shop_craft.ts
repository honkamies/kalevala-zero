// Nanite Forge & Runic Socketing Terminal UI
// Features Ilmarinen's Weapon Overclock Anvil for scaling bullets, spread, range, and barrier shred

import { Player } from '../entities/player';
import {
  Item,
  ItemGenerator,
  getWeaponUpgradePreview,
  upgradeWeapon,
  MAX_WEAPON_UPGRADE_LEVEL,
  getWeaponCategoryMeta,
  getWeaponCategory
} from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';

export class ShopCraftUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onPlayerUpdate: () => void;
  private selectedWeaponId: string | null = null;

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

    // Collect all upgradeable weapons (equipped main hand + weapons in backpack)
    const allWeapons: { item: Item; isEquipped: boolean }[] = [];
    if (player.equipment.mainHand) {
      allWeapons.push({ item: player.equipment.mainHand, isEquipped: true });
    }
    player.inventory.forEach(item => {
      if (item.type === 'weapon') {
        allWeapons.push({ item, isEquipped: false });
      }
    });

    // Default selection
    if (!this.selectedWeaponId && allWeapons.length > 0) {
      this.selectedWeaponId = allWeapons[0].item.id;
    } else if (this.selectedWeaponId && !allWeapons.some(w => w.item.id === this.selectedWeaponId)) {
      this.selectedWeaponId = allWeapons.length > 0 ? allWeapons[0].item.id : null;
    }

    const activeWpnObj = allWeapons.find(w => w.item.id === this.selectedWeaponId);
    const activeWpn = activeWpnObj ? activeWpnObj.item : player.equipment.mainHand;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'sampo-modal interactive';
    this.modalEl.style.cssText = `
      width: 760px;
      max-width: 95vw;
      max-height: 92vh;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    `;

    // Render Upgrade Preview HTML
    let upgradeHtml = '';
    if (activeWpn) {
      const prev = getWeaponUpgradePreview(activeWpn, player.naniteScrap);
      const cat = getWeaponCategory(activeWpn);
      const catMeta = getWeaponCategoryMeta(cat);
      const isMax = prev.isMaxLevel;
      const currentRank = activeWpn.upgradeLevel || 0;

      // Weapon selector pills if player has multiple weapons
      let selectorPills = '';
      if (allWeapons.length > 1) {
        selectorPills = `
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
            <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">SELECT WEAPON:</span>
            ${allWeapons.map(w => `
              <button class="sampo-btn ${w.item.id === this.selectedWeaponId ? 'primary' : ''}" 
                data-select-wpn="${w.item.id}"
                style="padding:3px 8px; font-size:11px; ${w.item.id === this.selectedWeaponId ? 'border-color:var(--cyan-core);' : ''}">
                ${w.isEquipped ? '🛡️ [Equipped] ' : ''}${w.item.name}
              </button>
            `).join('')}
          </div>
        `;
      }

      upgradeHtml = `
        <div style="background:linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border:1px solid rgba(56, 189, 248, 0.35); border-radius:6px; padding:16px; box-shadow:0 0 20px rgba(0, 0, 0, 0.5);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:10px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px;">⚡</span>
              <div>
                <div style="font-family:var(--font-rune); font-size:16px; color:var(--gold-runic); letter-spacing:1px;">
                  ILMARINEN'S OVERCLOCK ANVIL: WEAPON UPGRADE
                </div>
                <div style="font-size:11px; color:var(--text-muted);">
                  Harness primordial Sampo nanites to increase damage, multiply bullet count, expand spread arcs, and infuse barrier-shredding shockwaves.
                </div>
              </div>
            </div>
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); text-align:right;">
              <span style="background:rgba(56,189,248,0.15); padding:3px 8px; border-radius:4px; border:1px solid var(--cyan-core);">
                RANK: ${currentRank} / ${MAX_WEAPON_UPGRADE_LEVEL}
              </span>
            </div>
          </div>

          ${selectorPills}

          <!-- Current Weapon Header Info -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-slot); padding:10px 14px; border-radius:4px; border:1px solid var(--border-dim); margin-bottom:14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-family:var(--font-rune); font-size:15px; color:var(--rarity-${activeWpn.rarity}); font-weight:700;">
                  ${activeWpn.name}
                </span>
                <span style="background:rgba(245, 158, 11, 0.2); border:1px solid var(--gold-runic); color:var(--gold-runic); font-size:10px; font-family:var(--font-mono); font-weight:700; padding:1px 6px; border-radius:3px;">
                  ${catMeta.badge}
                </span>
                ${currentRank > 0 ? `
                  <span style="background:linear-gradient(135deg, #f59e0b, #e11d48); color:#fff; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:3px;">
                    +${currentRank}
                  </span>
                ` : ''}
              </div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                ${catMeta.description}
              </div>
            </div>
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); text-align:right;">
              Level: <strong style="color:var(--text-main);">${activeWpn.level}</strong>
            </div>
          </div>

          ${!isMax ? `
            <!-- Stat Upgrades Comparison Grid -->
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:14px;">
              <!-- 1. Harder Damage -->
              <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(239, 68, 68, 0.35); border-radius:4px; padding:10px; text-align:center;">
                <div style="font-size:10px; font-family:var(--font-mono); color:#fca5a5; margin-bottom:4px;">⚔️ DAMAGE</div>
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:#ef4444;">
                  ${prev.damageCurrent} <span style="color:#7dd3fc; font-size:11px;">➔</span> <span style="color:#22c55e;">${prev.damageNext}</span>
                </div>
                <div style="font-size:10px; color:#4ade80; margin-top:2px;">+22% Harder</div>
              </div>

              <!-- 2. More Bullets / Volley -->
              <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(56, 189, 248, 0.35); border-radius:4px; padding:10px; text-align:center;">
                <div style="font-size:10px; font-family:var(--font-mono); color:#7dd3fc; margin-bottom:4px;">💥 BULLETS</div>
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:var(--cyan-core);">
                  ${prev.bulletsCurrent} <span style="color:#7dd3fc; font-size:11px;">➔</span> <span style="color:#22c55e;">${prev.bulletsNext}</span>
                </div>
                <div style="font-size:10px; color:#38bdf8; margin-top:2px;">${prev.bulletsNext > prev.bulletsCurrent ? '+1 Extra Bullet!' : 'Solid Volley'}</div>
              </div>

              <!-- 3. Spread Further -->
              <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(245, 158, 11, 0.35); border-radius:4px; padding:10px; text-align:center;">
                <div style="font-size:10px; font-family:var(--font-mono); color:#fde047; margin-bottom:4px;">📐 SPREAD ARC</div>
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:var(--gold-runic);">
                  ${prev.spreadArcDegCurrent}° <span style="color:#7dd3fc; font-size:11px;">➔</span> <span style="color:#22c55e;">${prev.spreadArcDegNext}°</span>
                </div>
                <div style="font-size:10px; color:#facc15; margin-top:2px;">Wider Swath</div>
              </div>

              <!-- 4. Shooting Further -->
              <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(168, 85, 247, 0.35); border-radius:4px; padding:10px; text-align:center;">
                <div style="font-size:10px; font-family:var(--font-mono); color:#d8b4fe; margin-bottom:4px;">🎯 RANGE & SPEED</div>
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:#c084fc;">
                  +${prev.rangeMultPctCurrent}% <span style="color:#7dd3fc; font-size:11px;">➔</span> <span style="color:#22c55e;">+${prev.rangeMultPctNext}%</span>
                </div>
                <div style="font-size:10px; color:#e879f9; margin-top:2px;">Shooting Further</div>
              </div>

              <!-- 5. Areal Shield Damage -->
              <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(16, 185, 129, 0.35); border-radius:4px; padding:10px; text-align:center;">
                <div style="font-size:10px; font-family:var(--font-mono); color:#6ee7b7; margin-bottom:4px;">🛡️ SHIELD & AOE</div>
                <div style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:#10b981;">
                  +${prev.shieldBonusPctCurrent}% <span style="color:#7dd3fc; font-size:11px;">➔</span> <span style="color:#22c55e;">+${prev.shieldBonusPctNext}%</span>
                </div>
                <div style="font-size:10px; color:#34d399; margin-top:2px;">${prev.areaRadiusMNext}m Area Blast</div>
              </div>
            </div>

            <!-- Upgrade Button Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-slot); padding:10px 16px; border-radius:4px; border:1px solid var(--border-dim);">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">OVERCLOCK COST:</span>
                <strong style="color:${prev.canAfford ? 'var(--gold-runic)' : '#ef4444'}; font-size:15px; font-family:var(--font-mono);">
                  ${prev.cost} Nanite Scrap 🔩
                </strong>
                ${!prev.canAfford ? `
                  <span style="font-size:11px; color:#ef4444; margin-left:6px;">(Need ${prev.cost - player.naniteScrap} more)</span>
                ` : ''}
              </div>

              <button class="sampo-btn primary" id="btn-upgrade-wpn" ${!prev.canAfford ? 'disabled' : ''} style="padding:8px 20px; font-size:13px; font-weight:700; letter-spacing:0.5px; box-shadow:0 0 14px rgba(56, 189, 248, 0.4);">
                ⚡ ENHANCE & OVERCLOCK (+${prev.nextLevel})
              </button>
            </div>
          ` : `
            <div style="background:rgba(245, 158, 11, 0.15); border:1px solid var(--gold-runic); border-radius:4px; padding:14px; text-align:center;">
              <span style="font-size:24px;">⭐</span>
              <div style="font-family:var(--font-rune); font-size:16px; color:var(--gold-runic); margin-top:4px;">
                MAXIMUM OVERCLOCK REACHED (+10)
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                This weapon has attained Celestial Sampo Masterwork resonance. Devastating multi-projectile volleys, wide room spread, and barrier-shrendering shockwaves are fully unlocked.
              </div>
            </div>
          `}
        </div>
      `;
    } else {
      upgradeHtml = `
        <div style="background:var(--bg-panel-sub); padding:18px; border:1px solid var(--border-dim); border-radius:4px; text-align:center; color:var(--text-muted);">
          No weapon equipped. Equip a weapon from your backpack to use Ilmarinen's Overclock Anvil.
        </div>
      `;
    }

    this.modalEl.innerHTML = `
      <div class="sampo-modal-header">
        <div class="sampo-modal-title" style="display:flex; align-items:center; gap:8px;">
          <span>🔨</span> ILMARINEN'S NANITE FORGE & WEAPON OVERCLOCK ANVIL
          <span style="background:rgba(56,189,248,0.15); border:1px solid var(--cyan-core); color:var(--cyan-core); font-size:10px; font-family:var(--font-mono); font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:1px; margin-left:6px;">⏸️ PAUSED</span>
        </div>
        <button class="sampo-modal-close" id="forge-close-btn">&times;</button>
      </div>

      <div class="sampo-modal-body">
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- Top Balance -->
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel-sub); padding:10px 16px; border-radius:4px; border:1px solid var(--border-dim);">
            <div style="font-family:var(--font-mono); font-size:13px; color:var(--text-muted);">
              REFINED NANITE SCRAP: <strong style="color:var(--gold-runic); font-size:16px;">${player.naniteScrap} 🔩</strong>
            </div>
            <button class="sampo-btn danger" id="salvage-all-btn" style="padding:5px 12px; font-size:11px;">
              ♻️ Salvage All Common Items
            </button>
          </div>

          <!-- Section 1: Prominent Weapon Upgrade Terminal -->
          ${upgradeHtml}

          <!-- Section 2: Synthesis Actions -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <!-- Forge Weapon -->
            <div style="background:var(--bg-panel-sub); padding:14px; border:1px solid var(--border-dim); border-radius:4px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-family:var(--font-rune); font-size:14px; color:var(--gold-runic);">FORGE CYBER-WEAPON</div>
              <div style="font-size:11px; color:var(--text-muted);">Synthesizes an advanced weapon matched to your character level with procedural elemental affixes.</div>
              <div style="font-family:var(--font-mono); font-size:11px; color:var(--cyan-core);">Cost: 80 Nanite Scrap</div>
              <button class="sampo-btn primary" id="craft-wpn-btn" ${player.naniteScrap < 80 ? 'disabled' : ''}>
                Synthesize Weapon
              </button>
            </div>

            <!-- Forge Armor -->
            <div style="background:var(--bg-panel-sub); padding:14px; border:1px solid var(--border-dim); border-radius:4px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-family:var(--font-rune); font-size:14px; color:var(--gold-runic);">FORGE NANOWEAVE ARMOR</div>
              <div style="font-size:11px; color:var(--text-muted);">Constructs ballistic or hydraulic armor chassis infused with shielding protocols.</div>
              <div style="font-family:var(--font-mono); font-size:11px; color:var(--cyan-core);">Cost: 60 Nanite Scrap</div>
              <button class="sampo-btn primary" id="craft-arm-btn" ${player.naniteScrap < 60 ? 'disabled' : ''}>
                Synthesize Armor
              </button>
            </div>
          </div>

          <!-- Section 3: Socketing Section -->
          <div style="background:var(--bg-panel-sub); padding:14px; border:1px solid var(--border-dim); border-radius:4px;">
            <div style="font-family:var(--font-rune); font-size:14px; color:var(--cyan-core); margin-bottom:4px;">
              💎 RUNIC SHARD INFUSION (*RIIMUKIVET*)
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">
              Select an equipped weapon with an empty socket to infuse with your socketable shards:
            </div>
            <div id="socketing-items-list" style="display:flex; flex-direction:column; gap:6px;"></div>
          </div>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Bind Close
    document.getElementById('forge-close-btn')?.addEventListener('click', () => this.close());

    // Bind Weapon Selection Pills
    this.modalEl.querySelectorAll('[data-select-wpn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-select-wpn');
        if (id) {
          this.selectedWeaponId = id;
          soundEngine.playRuneClick();
          this.open(player);
        }
      });
    });

    // Bind Upgrade Button
    document.getElementById('btn-upgrade-wpn')?.addEventListener('click', () => {
      if (!activeWpn) return;
      const res = upgradeWeapon(activeWpn, player.naniteScrap);
      if (res.success) {
        player.naniteScrap = res.newScrap;
        player.recalculateDerivedStats();
        soundEngine.playSyntysanatAnvil();
        soundEngine.playLevelUp();
        particleSystem.emitShockwave(player.x, player.y, 2.8, '#f59e0b');
        for (let i = 0; i < 12; i++) {
          particleSystem.emitSparks(player.x, player.y, 0.45, '#facc15', 3);
        }
        this.onPlayerUpdate();
        this.open(player);
      }
    });

    // Bind Craft Weapon
    document.getElementById('craft-wpn-btn')?.addEventListener('click', () => {
      if (player.naniteScrap >= 80 && player.inventory.length < 30) {
        player.naniteScrap -= 80;
        const newWpn = ItemGenerator.generateRandomLoot(player.level, Math.random() > 0.4 ? 'runic' : 'augmented');
        player.inventory.push(newWpn);
        soundEngine.playLevelUp();
        this.onPlayerUpdate();
        this.open(player);
      }
    });

    // Bind Craft Armor
    document.getElementById('craft-arm-btn')?.addEventListener('click', () => {
      if (player.naniteScrap >= 60 && player.inventory.length < 30) {
        player.naniteScrap -= 60;
        const newArm = ItemGenerator.generateRandomLoot(player.level, Math.random() > 0.4 ? 'runic' : 'augmented');
        player.inventory.push(newArm);
        soundEngine.playLevelUp();
        this.onPlayerUpdate();
        this.open(player);
      }
    });

    // Bind Salvage All Common
    document.getElementById('salvage-all-btn')?.addEventListener('click', () => {
      let gained = 0;
      for (let i = player.inventory.length - 1; i >= 0; i--) {
        const item = player.inventory[i];
        if (item.rarity === 'common' && item.type !== 'consumable') {
          gained += item.naniteValue || 15;
          player.inventory.splice(i, 1);
        }
      }
      player.naniteScrap += gained;
      soundEngine.playRuneClick();
      this.onPlayerUpdate();
      this.open(player);
    });

    // Render Socketing candidates
    this.renderSocketList(player);
  }

  private renderSocketList(player: Player) {
    const listEl = document.getElementById('socketing-items-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const socketGems = player.inventory.filter(i => i.type === 'socket_gem');
    const equippedWeapon = player.equipment.mainHand;

    if (!equippedWeapon || !equippedWeapon.sockets || equippedWeapon.sockets.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px; color:var(--text-dark);">Equip a Runic or Masterwork weapon with open sockets to perform infusion.</div>';
      return;
    }

    const emptySocketIdx = equippedWeapon.sockets.findIndex(s => !s.filled);
    if (emptySocketIdx === -1) {
      listEl.innerHTML = '<div style="font-size:12px; color:#10b981;">All sockets on equipped weapon are fully infused!</div>';
      return;
    }

    if (socketGems.length === 0) {
      listEl.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">No Runic Shards (*Riimukivet*) in backpack. Explore sectors and chests to find shards.</div>';
      return;
    }

    socketGems.forEach((gem, gIdx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-slot); padding:8px 12px; border:1px solid var(--border-dim); border-radius:4px;';
      row.innerHTML = `
        <div>
          <span style="font-size:16px;">💎</span> <strong style="color:var(--cyan-core);">${gem.name}</strong>
          <span style="font-size:11px; color:var(--gold-runic); margin-left:8px;">${gem.bonus || ''}</span>
        </div>
        <button class="sampo-btn gold" style="padding:4px 10px; font-size:11px;">Infuse</button>
      `;

      row.querySelector('button')?.addEventListener('click', () => {
        equippedWeapon.sockets[emptySocketIdx] = {
          type: (gem.element as any) || 'fire',
          filled: true,
          bonus: gem.bonus,
          element: gem.element
        };
        equippedWeapon.affixes.push(`Socket: ${gem.bonus}`);
        
        // Remove gem from inventory
        const gemRealIdx = player.inventory.findIndex(i => i.id === gem.id);
        if (gemRealIdx !== -1) player.inventory.splice(gemRealIdx, 1);

        player.recalculateDerivedStats();
        soundEngine.playLevelUp();
        this.onPlayerUpdate();
        this.open(player);
      });

      listEl.appendChild(row);
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
