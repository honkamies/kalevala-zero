// Inventory & Equipment Paperdoll Modal UI with Live Comparison Matrix & Side-by-Side Dual Tooltips

import { Player, CUMULATIVE_WEAPON_SLOTS, WEAPON_SLOT_UNLOCK_CONFIGS } from '../entities/player';
import { Item, ItemSlot, getWeaponCategory, getWeaponCategoryMeta } from '../systems/items';
import { soundEngine } from '../engine/audio';

export interface StatDiff {
  label: string;
  candidateVal: number | string;
  equippedVal: number | string;
  diff: number | null;
  diffFormatted: string;
  isPositive: boolean | null;
}

export interface ComparisonResult {
  candidate: Item;
  equipped: Item | null;
  slotName: string;
  verdictText: string;
  verdictClass: 'verdict-upgrade' | 'verdict-downgrade' | 'verdict-sidegrade';
  statDiffs: StatDiff[];
  affixesGained: string[];
  affixesLost: string[];
  socketDiff: number;
}

export class InventoryUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onPlayerUpdate: () => void;
  private selectedComparisonItem: { item: Item; index: number } | null = null;

  constructor(root: HTMLElement, onPlayerUpdate: () => void) {
    this.root = root;
    this.onPlayerUpdate = onPlayerUpdate;
    if (typeof document !== 'undefined') {
      this.createTooltip();
    }
  }

  private createTooltip() {
    if (typeof document === 'undefined') return;
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'item-tooltip';
    this.tooltipEl.style.display = 'none';
    document.body.appendChild(this.tooltipEl);
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
    this.modalEl.style.cssText = `
      width: 780px;
      max-width: 95vw;
      height: 710px;
      max-height: 94vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    `;
    const arch = player.appearance.archetype || 'soturi';
    const heroImgSrc = `./assets/thumb_hero_${arch === 'runoseppä' ? 'runoseppa' : arch}.jpg`;

    this.modalEl.innerHTML = `
      <div class="sampo-modal-header">
        <div class="sampo-modal-title" style="display:flex; align-items:center; gap:8px;">
          <span>🎒</span> TACTICAL STORAGE & BIO-EQUIPMENT
          <span style="background:rgba(56,189,248,0.15); border:1px solid var(--cyan-core); color:var(--cyan-core); font-size:10px; font-family:var(--font-mono); font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:1px; margin-left:6px;">⏸️ PAUSED</span>
        </div>
        <button class="sampo-modal-close" id="inv-close-btn">&times;</button>
      </div>

      <div class="sampo-modal-body" style="padding: 16px 20px; overflow-y: auto; overflow-x: hidden; flex: 1; display: flex; flex-direction: column; box-sizing: border-box;">
        <div class="inventory-layout" style="display:flex; flex-direction:column; gap:12px; height:100%; justify-content:space-between; box-sizing:border-box;">
          <!-- Top Row: Paperdoll & Backpack Grid -->
          <div style="display:grid; grid-template-columns: 300px 420px; gap: 16px; align-items: stretch;">
            <!-- Paperdoll Slots -->
            <div class="equipment-paperdoll" style="position:relative; overflow:hidden;">
              <div style="font-family:var(--font-rune); font-size:14px; color:var(--cyan-core); z-index:2;">OPERATIVE EQUIPMENT</div>
              
              <div style="position:relative; width:100%; display:flex; justify-content:center; align-items:center;">
                <!-- Hero Silhouette / Art Backdrop -->
                <div style="position:absolute; width:150px; height:170px; opacity:0.25; border-radius:6px; overflow:hidden; pointer-events:none; z-index:1;">
                  <img src="${heroImgSrc}" alt="Hero" style="width:100%; height:100%; object-fit:cover;" />
                </div>

                <div class="equipment-grid" style="z-index:2;">
                  <div class="equip-slot" data-slot="head">
                    <span class="equip-slot-label">HEAD</span>
                  </div>
                  <div class="equip-slot" data-slot="relic">
                    <span class="equip-slot-label">RELIC</span>
                  </div>
                  <div class="equip-slot" data-slot="chest">
                    <span class="equip-slot-label">CHEST</span>
                  </div>
                  <div class="equip-slot" data-slot="offHand">
                    <span class="equip-slot-label">OFF-HAND</span>
                  </div>
                  <div class="equip-slot" data-slot="legs" style="grid-column: span 2; width: 64px; justify-self: center;">
                    <span class="equip-slot-label">LEGS</span>
                  </div>
                </div>
              </div>

              <!-- CUMULATIVE ARSENAL (CONCURRENT FIRING WEAPONS) -->
              <div style="width:100%; border-top:1px solid var(--border-dim); padding-top:6px; margin-top:4px; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-family:var(--font-rune); font-size:11px; color:var(--gold-runic); letter-spacing:0.5px;">⚔️ CUMULATIVE ARSENAL</span>
                  <span style="font-family:var(--font-mono); font-size:10px; color:var(--cyan-core);">${player.getActiveWeapons().length} CONCURRENT FIRING</span>
                </div>
                <div class="arsenal-slots-row" style="display:flex; gap:4px; justify-content:space-between; align-items:center;">
                  <div class="equip-slot arsenal-slot arsenal-base-slot" data-slot="baseWeapon" style="width:43px; height:43px; border-color:#f59e0b; box-shadow:0 0 6px rgba(245,158,11,0.4);" title="Archetype Innate Weapon (Permanent concurrent firing)">
                    <span class="equip-slot-label" style="font-size:7.5px; color:#f59e0b;">⭐BASE</span>
                  </div>
                  <div class="equip-slot arsenal-slot" data-slot="mainHand" style="width:43px; height:43px;" title="Weapon Slot 1">
                    <span class="equip-slot-label" style="font-size:7.5px;">WPN 1</span>
                  </div>
                  <div class="equip-slot arsenal-slot" data-slot="weapon2" style="width:43px; height:43px;" title="Weapon Slot 2">
                    <span class="equip-slot-label" style="font-size:7.5px;">WPN 2</span>
                  </div>
                  <div class="equip-slot arsenal-slot" data-slot="weapon3" style="width:43px; height:43px;" title="Weapon Slot 3">
                    <span class="equip-slot-label" style="font-size:7.5px;">WPN 3</span>
                  </div>
                  <div class="equip-slot arsenal-slot" data-slot="weapon4" style="width:43px; height:43px;" title="Weapon Slot 4">
                    <span class="equip-slot-label" style="font-size:7.5px;">WPN 4</span>
                  </div>
                  <div class="equip-slot arsenal-slot" data-slot="weapon5" style="width:43px; height:43px;" title="Weapon Slot 5">
                    <span class="equip-slot-label" style="font-size:7.5px;">WPN 5</span>
                  </div>
                </div>
              </div>

              <div style="width:100%; border-top:1px solid var(--border-dim); padding-top:6px; margin-top:6px; font-family:var(--font-mono); font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                  <span style="color:var(--text-muted);">TOTAL ARMOR:</span>
                  <span style="color:var(--cyan-core); font-weight:700;">${player.armor}</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:var(--text-muted);">NANITE SCRAP:</span>
                  <span style="color:var(--gold-runic); font-weight:700;">${player.naniteScrap} 🔩</span>
                </div>
              </div>
            </div>

            <!-- Backpack Grid -->
            <div class="backpack-container">
              <div class="backpack-header">
                <span>BACKPACK STORAGE (${player.inventory.length}/30)</span>
                <div style="display:flex; gap:8px; align-items:center;">
                  <button id="btn-salvage-commons" class="sampo-btn small" style="padding:2px 8px; font-size:10px; border-color:#f59e0b; color:#fde047;" title="Recycle all Common & Augmented non-equipped gear for Scrap">
                    ♻️ SALVAGE LOW-TIER
                  </button>
                  <span style="color:var(--cyan-core); font-size:11px;">[L-Click Equip / R-Click Salvage]</span>
                </div>
              </div>
              <div class="backpack-grid" id="backpack-grid-slots" style="min-height:240px;"></div>
            </div>
          </div>

          <!-- Bottom Row: Dedicated Live Comparison Matrix Panel (Fixed Height) -->
          <div id="inventory-comparison-panel-container" style="min-height:235px; height:235px; max-height:235px; box-sizing:border-box; overflow-y:auto; overflow-x:hidden;"></div>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Bind Close
    document.getElementById('inv-close-btn')?.addEventListener('click', () => this.close());

    // Bind Salvage Low-Tier Commons
    document.getElementById('btn-salvage-commons')?.addEventListener('click', () => {
      let totalScrap = 0;
      let salvagedCount = 0;
      for (let i = player.inventory.length - 1; i >= 0; i--) {
        const it = player.inventory[i];
        if (it.rarity === 'common' || it.rarity === 'augmented') {
          let val = it.naniteValue || (20 * it.level);
          if (player.appearance.archetype === 'runoseppä') {
            val = Math.round(val * 1.35);
          }
          totalScrap += val;
          salvagedCount++;
          player.inventory.splice(i, 1);
        }
      }
      if (salvagedCount > 0) {
        player.naniteScrap += totalScrap;
        soundEngine.playScrapPickup();
        this.clearHighlight();
        this.hideTooltip();
        this.selectedComparisonItem = null;
        this.onPlayerUpdate();
        this.open(player);
      }
    });

    // Populate Equipment
    this.renderEquipment(player);

    // Populate Backpack
    this.renderBackpack(player);

    // Render Initial Comparison Matrix
    this.renderComparisonPanel(player, this.selectedComparisonItem?.item, this.selectedComparisonItem?.index);
  }

  private highlightSlot(slot?: ItemSlot) {
    if (!this.modalEl || !slot) return;
    this.clearHighlight();
    const targetSlotEl = this.modalEl.querySelector(`.equip-slot[data-slot="${slot}"]`) as HTMLElement;
    if (targetSlotEl) {
      targetSlotEl.classList.add('slot-highlight-target');
    }
  }

  private clearHighlight() {
    if (!this.modalEl) return;
    const highlighted = this.modalEl.querySelectorAll('.equip-slot.slot-highlight-target');
    highlighted.forEach(el => el.classList.remove('slot-highlight-target'));
  }

  private positionTooltip(e: MouseEvent, width: number = 340, height: number = 180) {
    if (!this.tooltipEl) return;
    let left = e.clientX + 16;
    if (left + width > window.innerWidth - 15) {
      left = Math.max(10, e.clientX - width - 16);
    }
    let top = e.clientY - 20;
    if (top + height > window.innerHeight - 15) {
      top = Math.max(10, window.innerHeight - height - 15);
    }
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  public getSlotDisplayName(slot: ItemSlot): string {
    const slotNames: Record<ItemSlot, string> = {
      head: 'HEAD',
      relic: 'RELIC',
      mainHand: 'WPN 1',
      weapon2: 'WPN 2',
      weapon3: 'WPN 3',
      weapon4: 'WPN 4',
      weapon5: 'WPN 5',
      offHand: 'OFF-HAND',
      chest: 'CHEST',
      legs: 'LEGS'
    };
    return slotNames[slot] || slot.toUpperCase();
  }

  private renderEquipment(player: Player) {
    if (!this.modalEl) return;

    // 1. Render Innate Archetype Base Weapon
    const baseSlotEl = this.modalEl.querySelector('[data-slot="baseWeapon"]') as HTMLElement;
    if (baseSlotEl && player.baseWeapon) {
      const item = player.baseWeapon;
      baseSlotEl.innerHTML = `<span class="equip-slot-label" style="font-size:7.5px; color:#f59e0b; font-weight:800;">⭐BASE</span>`;
      baseSlotEl.classList.remove('rarity-common', 'rarity-augmented', 'rarity-runic', 'rarity-masterwork', 'rarity-relic');
      baseSlotEl.classList.add('filled', `rarity-${item.rarity}`);

      const iconSpan = document.createElement('span');
      iconSpan.style.fontSize = '22px';
      iconSpan.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';
      iconSpan.textContent = this.getItemEmoji(item);
      baseSlotEl.appendChild(iconSpan);

      const elemBadge = this.getElementBadge(item);
      if (elemBadge) baseSlotEl.insertAdjacentHTML('beforeend', elemBadge);

      if (item.upgradeLevel && item.upgradeLevel > 0) {
        baseSlotEl.insertAdjacentHTML(
          'beforeend',
          `<span class="item-upgrade-badge" style="position:absolute; top:2px; right:3px; font-family:var(--font-mono); font-size:9px; font-weight:800; color:#38bdf8; text-shadow:0 0 5px rgba(56,189,248,0.9); z-index:4;">+${item.upgradeLevel}</span>`
        );
      }

      baseSlotEl.onmouseenter = (e) => {
        this.showTooltip(item, e, player, false);
      };
      baseSlotEl.onmouseleave = () => {
        this.hideTooltip();
      };
      baseSlotEl.onclick = () => {
        soundEngine.playRuneClick();
      };
    }

    // 2. Render Defensive Gear Slots
    const defensiveSlots: ItemSlot[] = ['head', 'relic', 'chest', 'offHand', 'legs'];
    defensiveSlots.forEach(slot => {
      const slotEl = this.modalEl!.querySelector(`.equipment-grid [data-slot="${slot}"]`) as HTMLElement;
      if (!slotEl) return;

      const item = player.equipment[slot];
      const slotLabel = this.getSlotDisplayName(slot);
      slotEl.innerHTML = `<span class="equip-slot-label">${slotLabel}</span>`;
      slotEl.classList.remove('filled', 'rarity-common', 'rarity-augmented', 'rarity-runic', 'rarity-masterwork', 'rarity-relic');

      if (item) {
        slotEl.classList.add('filled', `rarity-${item.rarity}`);
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '26px';
        iconSpan.style.filter = 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))';
        iconSpan.textContent = this.getItemEmoji(item);
        slotEl.appendChild(iconSpan);

        const elemBadge = this.getElementBadge(item);
        if (elemBadge) {
          slotEl.insertAdjacentHTML('beforeend', elemBadge);
        }

        if (item.upgradeLevel && item.upgradeLevel > 0) {
          slotEl.insertAdjacentHTML(
            'beforeend',
            `<span class="item-upgrade-badge" style="position:absolute; top:2px; right:4px; font-family:var(--font-mono); font-size:10px; font-weight:800; color:#38bdf8; text-shadow:0 0 5px rgba(56,189,248,0.9); z-index:4;">+${item.upgradeLevel}</span>`
          );
        }

        slotEl.onmouseenter = (e) => {
          this.highlightSlot(slot);
          this.showTooltip(item, e, player, false);
        };
        slotEl.onmouseleave = () => {
          this.clearHighlight();
          this.hideTooltip();
        };

        slotEl.onclick = () => {
          this.clearHighlight();
          this.hideTooltip();
          if (player.inventory.length >= 30) {
            alert('Inventory full! Salvage items to free space.');
            return;
          }
          player.inventory.push(item);
          delete player.equipment[slot];
          player.recalculateDerivedStats();
          soundEngine.playRuneClick();
          this.selectedComparisonItem = null;
          this.onPlayerUpdate();
          this.open(player);
        };
      } else {
        slotEl.onmouseenter = null;
        slotEl.onmouseleave = null;
        slotEl.onclick = null;
      }
    });

    // 3. Render Arsenal Weapon Slots (WPN 1 to WPN 5)
    CUMULATIVE_WEAPON_SLOTS.forEach(slot => {
      const slotEl = this.modalEl!.querySelector(`.arsenal-slots-row [data-slot="${slot}"]`) as HTMLElement;
      if (!slotEl) return;

      const conf = WEAPON_SLOT_UNLOCK_CONFIGS.find(u => u.slot === slot);
      const isUnlocked = player.isWeaponSlotUnlocked(slot);
      const item = player.equipment[slot];

      slotEl.classList.remove('filled', 'slot-locked', 'rarity-common', 'rarity-augmented', 'rarity-runic', 'rarity-masterwork', 'rarity-relic');

      if (!isUnlocked) {
        slotEl.classList.add('slot-locked');
        slotEl.style.opacity = '0.45';
        slotEl.style.border = '1px dashed #64748b';
        slotEl.innerHTML = `<span style="font-size:15px;">🔒</span><span class="equip-slot-label" style="font-size:7px; color:#94a3b8;">LVL ${conf?.reqLevel}</span>`;
        slotEl.onmouseenter = (e) => {
          if (!this.tooltipEl) return;
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.innerHTML = `
            <div style="padding:10px; font-family:var(--font-mono); font-size:12px; color:#e2e8f0; background:rgba(15,23,42,0.95); border:1px solid #64748b; border-radius:6px; box-shadow:0 0 16px rgba(0,0,0,0.8);">
              <div style="color:#f59e0b; font-weight:700; margin-bottom:4px;">🔒 LOCKED ARSENAL WEAPON SLOT</div>
              <div style="color:var(--text-muted); font-size:11px;">Unlocks at <strong style="color:var(--cyan-core);">Level ${conf?.reqLevel}</strong> (or ${conf?.reqClears} Sector Clears).</div>
              <div style="margin-top:6px; font-size:11px; color:#94a3b8;">When unlocked, equipping a weapon adds simultaneous concurrent firing with your entire arsenal!</div>
            </div>
          `;
          this.positionTooltip(e);
        };
        slotEl.onmouseleave = () => this.hideTooltip();
        slotEl.onclick = () => soundEngine.playRuneClick();
        return;
      }

      slotEl.style.opacity = '1';
      slotEl.style.border = '1px solid var(--border-dim)';

      if (item) {
        slotEl.classList.add('filled', `rarity-${item.rarity}`);
        slotEl.innerHTML = `<span class="equip-slot-label" style="font-size:7.5px;">${conf?.label || 'WPN'}</span>`;
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '22px';
        iconSpan.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';
        iconSpan.textContent = this.getItemEmoji(item);
        slotEl.appendChild(iconSpan);

        const elemBadge = this.getElementBadge(item);
        if (elemBadge) slotEl.insertAdjacentHTML('beforeend', elemBadge);

        if (item.upgradeLevel && item.upgradeLevel > 0) {
          slotEl.insertAdjacentHTML(
            'beforeend',
            `<span class="item-upgrade-badge" style="position:absolute; top:2px; right:3px; font-family:var(--font-mono); font-size:9px; font-weight:800; color:#38bdf8; text-shadow:0 0 5px rgba(56,189,248,0.9); z-index:4;">+${item.upgradeLevel}</span>`
          );
        }

        slotEl.onmouseenter = (e) => {
          this.highlightSlot(slot);
          this.showTooltip(item, e, player, false);
        };
        slotEl.onmouseleave = () => {
          this.clearHighlight();
          this.hideTooltip();
        };

        slotEl.onclick = () => {
          this.clearHighlight();
          this.hideTooltip();
          if (player.inventory.length >= 30) {
            alert('Inventory full! Salvage items to free space.');
            return;
          }
          player.inventory.push(item);
          delete player.equipment[slot];
          player.recalculateDerivedStats();
          soundEngine.playRuneClick();
          this.selectedComparisonItem = null;
          this.onPlayerUpdate();
          this.open(player);
        };
      } else {
        slotEl.style.border = '1px dashed rgba(56, 189, 248, 0.4)';
        slotEl.innerHTML = `<span class="equip-slot-label" style="font-size:7.5px; color:var(--cyan-core);">${conf?.label || 'WPN'}</span><span style="font-size:15px; color:rgba(56,189,248,0.6); font-weight:700;">+</span>`;
        slotEl.onmouseenter = (e) => {
          if (!this.tooltipEl) return;
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.innerHTML = `
            <div style="padding:10px; font-family:var(--font-mono); font-size:12px; color:#e2e8f0; background:rgba(15,23,42,0.95); border:1px solid var(--cyan-core); border-radius:6px; box-shadow:0 0 16px rgba(0,0,0,0.8);">
              <div style="color:var(--cyan-core); font-weight:700; margin-bottom:4px;">⚡ UNLOCKED ARSENAL SLOT (${conf?.label})</div>
              <div style="color:var(--text-muted); font-size:11px;">Click any weapon in your backpack to equip it here.</div>
              <div style="margin-top:6px; font-size:11px; color:#10b981;">Equipped weapons fire simultaneously alongside your base weapon and all other weapons!</div>
            </div>
          `;
          this.positionTooltip(e);
        };
        slotEl.onmouseleave = () => this.hideTooltip();
        slotEl.onclick = null;
      }
    });
  }

  private renderBackpack(player: Player) {
    if (!this.modalEl) return;
    const gridEl = this.modalEl.querySelector('#backpack-grid-slots') as HTMLElement;
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (let i = 0; i < 30; i++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'item-slot';

      const item = player.inventory[i];
      if (item) {
        slotEl.classList.add(`rarity-${item.rarity}`);
        slotEl.innerHTML = `<span style="font-size:24px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">${this.getItemEmoji(item)}</span>`;

        // Elemental indicator pip
        const elemBadge = this.getElementBadge(item);
        if (elemBadge) {
          slotEl.insertAdjacentHTML('beforeend', elemBadge);
        }

        // Upgrade Level Badge (+N)
        if (item.upgradeLevel && item.upgradeLevel > 0) {
          slotEl.insertAdjacentHTML(
            'beforeend',
            `<span class="item-upgrade-badge" style="position:absolute; top:2px; right:4px; font-family:var(--font-mono); font-size:9.5px; font-weight:800; color:#38bdf8; text-shadow:0 0 5px rgba(56,189,248,0.9); z-index:4;">+${item.upgradeLevel}</span>`
          );
        }

        if (item.quantity && item.quantity > 1) {
          slotEl.innerHTML += `<span class="item-count">${item.quantity}</span>`;
        }

        // Socket pip
        if (item.sockets && item.sockets.length > 0) {
          slotEl.innerHTML += `<span class="item-socket-pip" style="background:${item.sockets.some(s => s.filled) ? '#38bdf8' : '#64748b'};"></span>`;
        }

        // Tooltip & Dynamic Comparison Update on Hover
        slotEl.onmouseenter = (e) => {
          if (item.type === 'weapon') {
            const unlockedSlots = CUMULATIVE_WEAPON_SLOTS.filter(s => player.isWeaponSlotUnlocked(s));
            const emptySlot = unlockedSlots.find(s => !player.equipment[s]);
            this.highlightSlot(emptySlot || 'mainHand');
          } else if (item.slot) {
            this.highlightSlot(item.slot);
          } else {
            this.clearHighlight();
          }
          this.renderComparisonPanel(player, item, i);
          this.showTooltip(item, e, player, true);
        };

        slotEl.onmouseleave = () => {
          this.clearHighlight();
          this.hideTooltip();
        };

        // Right-click to dismantle/salvage
        slotEl.oncontextmenu = (e) => {
          e.preventDefault();
          this.salvageItem(player, i, item);
        };

        // Click action: Equip, Use, or Shift-Click to Salvage
        slotEl.onclick = (e) => {
          this.clearHighlight();
          this.hideTooltip();
          if (e.shiftKey) {
            this.salvageItem(player, i, item);
            return;
          }
          if (item.type === 'consumable') {
            player.usePotion();
            this.open(player);
          } else if (item.type === 'weapon') {
            // Check for first available empty unlocked weapon slot
            const unlockedSlots = CUMULATIVE_WEAPON_SLOTS.filter(s => player.isWeaponSlotUnlocked(s));
            const emptySlot = unlockedSlots.find(s => !player.equipment[s]);
            if (emptySlot) {
              player.equipment[emptySlot] = item;
              player.inventory.splice(i, 1);
            } else {
              // All unlocked weapon slots are occupied: swap with the primary weapon slot (mainHand)
              const targetSlot = unlockedSlots[0] || 'mainHand';
              const oldWpn = player.equipment[targetSlot];
              player.equipment[targetSlot] = item;
              player.inventory.splice(i, 1);
              if (oldWpn) {
                player.inventory.push(oldWpn);
              }
            }
            player.recalculateDerivedStats();
            soundEngine.playRuneClick();
            this.selectedComparisonItem = null;
            this.onPlayerUpdate();
            this.open(player);
          } else if (item.slot) {
            // Swap gear
            const current = player.equipment[item.slot];
            player.equipment[item.slot] = item;
            player.inventory.splice(i, 1);
            if (current) {
              player.inventory.push(current);
            }
            player.recalculateDerivedStats();
            soundEngine.playRuneClick();
            this.selectedComparisonItem = null;
            this.onPlayerUpdate();
            this.open(player);
          }
        };
      }

      gridEl.appendChild(slotEl);
    }
  }

  // =========================================================================
  // STAT & COMPARISON COMPUTATION ENGINE
  // =========================================================================
  public computeComparison(candidate: Item, equipped: Item | null): ComparisonResult {
    const slotName = candidate.type === 'weapon' ? 'WEAPON ARSENAL' : (candidate.slot ? this.getSlotDisplayName(candidate.slot) : candidate.type.toUpperCase());
    const statDiffs: StatDiff[] = [];

    let score = 0;

    // 1. Damage Comparison
    const candDmg = candidate.damage || 0;
    const eqDmg = equipped?.damage || 0;
    if (candDmg > 0 || eqDmg > 0) {
      const diff = candDmg - eqDmg;
      const isPos = diff > 0;
      score += diff * 2.0;
      const candElem = candidate.damageType ? ` (${candidate.damageType.toUpperCase()})` : '';
      const eqElem = equipped?.damageType ? ` (${equipped.damageType.toUpperCase()})` : '';
      statDiffs.push({
        label: 'Damage Output',
        candidateVal: `${candDmg}${candElem}`,
        equippedVal: eqDmg > 0 ? `${eqDmg}${eqElem}` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 2. Armor Comparison
    const candArmor = candidate.armor || 0;
    const eqArmor = equipped?.armor || 0;
    if (candArmor > 0 || eqArmor > 0) {
      const diff = candArmor - eqArmor;
      score += diff * 1.5;
      statDiffs.push({
        label: 'Armor Mitigation',
        candidateVal: candArmor > 0 ? `+${candArmor}` : '—',
        equippedVal: eqArmor > 0 ? `+${eqArmor}` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 3. Max Health
    const candHp = candidate.healthMax || 0;
    const eqHp = equipped?.healthMax || 0;
    if (candHp > 0 || eqHp > 0) {
      const diff = candHp - eqHp;
      score += diff * 0.8;
      statDiffs.push({
        label: 'Max Vitality (HP)',
        candidateVal: candHp > 0 ? `+${candHp}` : '—',
        equippedVal: eqHp > 0 ? `+${eqHp}` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 4. Max Shield
    const candShield = candidate.shieldMax || 0;
    const eqShield = equipped?.shieldMax || 0;
    if (candShield > 0 || eqShield > 0) {
      const diff = candShield - eqShield;
      score += diff * 0.9;
      statDiffs.push({
        label: 'Max Shield Capacity',
        candidateVal: candShield > 0 ? `+${candShield}` : '—',
        equippedVal: eqShield > 0 ? `+${eqShield}` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 5. Item Level
    const candLvl = candidate.level || 1;
    const eqLvl = equipped?.level || 1;
    const lvlDiff = equipped ? candLvl - eqLvl : 0;
    statDiffs.push({
      label: 'Item Level Tier',
      candidateVal: `LVL ${candLvl}`,
      equippedVal: equipped ? `LVL ${eqLvl}` : '—',
      diff: lvlDiff,
      diffFormatted: lvlDiff > 0 ? `+${lvlDiff} ⬆️` : lvlDiff < 0 ? `${lvlDiff} 🔻` : '(=)',
      isPositive: lvlDiff > 0 ? true : lvlDiff < 0 ? false : null
    });

    // 6. Sockets Count
    const candSockets = candidate.sockets?.length || 0;
    const eqSockets = equipped?.sockets?.length || 0;
    const socketDiff = candSockets - eqSockets;
    if (candSockets > 0 || eqSockets > 0) {
      score += socketDiff * 5.0;
      statDiffs.push({
        label: 'Runic Sockets',
        candidateVal: `${candSockets} Slots`,
        equippedVal: equipped ? `${eqSockets} Slots` : '—',
        diff: socketDiff,
        diffFormatted: socketDiff > 0 ? `+${socketDiff} Sockets ⬆️` : socketDiff < 0 ? `${socketDiff} Sockets 🔻` : '(=)',
        isPositive: socketDiff > 0 ? true : socketDiff < 0 ? false : null
      });
    }

    // 7. Weapon Upgrade Rank (+N)
    const candUpLvl = candidate.upgradeLevel || 0;
    const eqUpLvl = equipped?.upgradeLevel || 0;
    if (candUpLvl > 0 || eqUpLvl > 0) {
      const diff = candUpLvl - eqUpLvl;
      score += diff * 3.5;
      statDiffs.push({
        label: 'Overclock Rank',
        candidateVal: candUpLvl > 0 ? `+${candUpLvl} ★` : '—',
        equippedVal: eqUpLvl > 0 ? `+${eqUpLvl} ★` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 8. Weapon Bonus Projectiles
    const candProj = candidate.bonusProjectiles || 0;
    const eqProj = equipped?.bonusProjectiles || 0;
    if (candProj > 0 || eqProj > 0) {
      const diff = candProj - eqProj;
      score += diff * 4.0;
      statDiffs.push({
        label: 'Bonus Bullets',
        candidateVal: candProj > 0 ? `+${candProj} Shot${candProj > 1 ? 's' : ''}` : 'Standard',
        equippedVal: eqProj > 0 ? `+${eqProj} Shot${eqProj > 1 ? 's' : ''}` : 'Standard',
        diff,
        diffFormatted: diff > 0 ? `+${diff} ⬆️` : diff < 0 ? `${diff} 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 9. Shield Penetration / Barrier Shred
    const candShieldDmg = candidate.shieldDamageBonus ? Math.round(candidate.shieldDamageBonus * 100) : 0;
    const eqShieldDmg = equipped?.shieldDamageBonus ? Math.round(equipped.shieldDamageBonus * 100) : 0;
    if (candShieldDmg > 0 || eqShieldDmg > 0) {
      const diff = candShieldDmg - eqShieldDmg;
      score += (diff / 10) * 1.5;
      statDiffs.push({
        label: 'Barrier Shred',
        candidateVal: candShieldDmg > 0 ? `+${candShieldDmg}%` : '—',
        equippedVal: eqShieldDmg > 0 ? `+${eqShieldDmg}%` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff}% ⬆️` : diff < 0 ? `${diff}% 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 10. Areal Shockwave Explosion Radius
    const candArea = candidate.areaRadiusBonus || 0;
    const eqArea = equipped?.areaRadiusBonus || 0;
    if (candArea > 0 || eqArea > 0) {
      const diff = Number((candArea - eqArea).toFixed(1));
      score += diff * 3.0;
      statDiffs.push({
        label: 'AoE Shockwave',
        candidateVal: candArea > 0 ? `+${candArea.toFixed(1)}m` : '—',
        equippedVal: eqArea > 0 ? `+${eqArea.toFixed(1)}m` : '—',
        diff,
        diffFormatted: diff > 0 ? `+${diff}m ⬆️` : diff < 0 ? `${diff}m 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 11. Range & Projectile Velocity Multiplier
    const candRange = candidate.rangeMultiplier || 1.0;
    const eqRange = equipped?.rangeMultiplier || 1.0;
    if (candRange !== 1.0 || eqRange !== 1.0) {
      const diff = Math.round((candRange - eqRange) * 100);
      score += (diff / 10) * 1.0;
      statDiffs.push({
        label: 'Range & Speed',
        candidateVal: `${Math.round(candRange * 100)}%`,
        equippedVal: `${Math.round(eqRange * 100)}%`,
        diff,
        diffFormatted: diff > 0 ? `+${diff}% ⬆️` : diff < 0 ? `${diff}% 🔻` : '(=)',
        isPositive: diff > 0 ? true : diff < 0 ? false : null
      });
    }

    // 12. Nanite Scrap Value
    const candScrap = candidate.naniteValue || 20;
    const eqScrap = equipped?.naniteValue || 0;
    const scrapDiff = candScrap - eqScrap;
    statDiffs.push({
      label: 'Nanite Scrap Worth',
      candidateVal: `${candScrap} 🔩`,
      equippedVal: equipped ? `${eqScrap} 🔩` : '—',
      diff: scrapDiff,
      diffFormatted: scrapDiff > 0 ? `+${scrapDiff} 🔩` : `${scrapDiff} 🔩`,
      isPositive: scrapDiff > 0 ? true : scrapDiff < 0 ? false : null
    });

    // Affixes Delta
    const candAffixes = candidate.affixes || [];
    const eqAffixes = equipped?.affixes || [];
    const affixesGained = candAffixes.filter(a => !eqAffixes.includes(a));
    const affixesLost = eqAffixes.filter(a => !candAffixes.includes(a));

    // Decision Verdict
    let verdictText = '▲ DIRECT UPGRADE';
    let verdictClass: 'verdict-upgrade' | 'verdict-downgrade' | 'verdict-sidegrade' = 'verdict-upgrade';

    if (!equipped) {
      verdictText = (candidate.type === 'weapon' || candidate.slot === 'mainHand' || candidate.slot?.startsWith('weapon'))
        ? '✨ EMPTY ARSENAL SLOT // ADDS CONCURRENT FIRING'
        : '✨ EMPTY SLOT // NEW COMBAT BENEFIT';
      verdictClass = 'verdict-upgrade';
    } else if (score > 4) {
      verdictText = '▲ DIRECT STAT UPGRADE';
      verdictClass = 'verdict-upgrade';
    } else if (score < -4) {
      verdictText = '▼ DOWNGRADE (Lower Stats)';
      verdictClass = 'verdict-downgrade';
    } else {
      verdictText = '⚖️ TACTICAL SIDEGRADE (Elemental / Affix Variation)';
      verdictClass = 'verdict-sidegrade';
    }

    return {
      candidate,
      equipped,
      slotName,
      verdictText,
      verdictClass,
      statDiffs,
      affixesGained,
      affixesLost,
      socketDiff
    };
  }

  // =========================================================================
  // DEDICATED IN-MODAL COMPARISON MATRIX PANEL
  // =========================================================================
  private renderComparisonPanel(player: Player, candidateItem?: Item | null, candidateIndex?: number) {
    if (!this.modalEl) return;
    const container = this.modalEl.querySelector('#inventory-comparison-panel-container') as HTMLElement;
    if (!container) return;

    if (!candidateItem || (!candidateItem.slot && candidateItem.type !== 'weapon')) {
      container.innerHTML = `
        <div class="inventory-comparison-panel" style="min-height:230px; height:230px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; margin-top:0;">
          <div class="inv-comp-header">
            <span>⚡ REAL-TIME BIO-TELEMETRY // ITEM COMPARISON MATRIX</span>
            <span style="color:var(--text-muted); font-size:10px;">ONE-VIEW GEAR ANALYSIS</span>
          </div>
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:12px 20px; color:var(--text-muted); font-family:var(--font-mono); font-size:12px;">
            <span style="font-size:26px; display:block; margin-bottom:6px; opacity:0.85;">🔍</span>
            Hover or click any equippable weapon/armor in your backpack to compare stats side-by-side with your currently equipped gear.
          </div>
        </div>
      `;
      return;
    }

    const isWeapon = candidateItem.type === 'weapon' || candidateItem.slot === 'mainHand' || candidateItem.slot?.startsWith('weapon');
    let equipped: Item | null = null;
    if (isWeapon) {
      const unlockedSlots = CUMULATIVE_WEAPON_SLOTS.filter(s => player.isWeaponSlotUnlocked(s));
      const emptySlot = unlockedSlots.find(s => !player.equipment[s]);
      if (emptySlot) {
        equipped = null;
      } else {
        const targetSlot = unlockedSlots[0] || 'mainHand';
        equipped = player.equipment[targetSlot] || player.baseWeapon || null;
      }
    } else if (candidateItem.slot) {
      equipped = player.equipment[candidateItem.slot] || null;
    }
    const comp = this.computeComparison(candidateItem, equipped);

    let rowsHtml = '';
    const activeDiffs = comp.statDiffs.filter(sd => sd.diff !== 0 && sd.diff !== null);
    const nonActiveDiffs = comp.statDiffs.filter(sd => sd.diff === 0 || sd.diff === null);
    const diffsToShow = [...activeDiffs, ...nonActiveDiffs].slice(0, 5);
    diffsToShow.forEach(sd => {
      const deltaClass = sd.isPositive === true ? 'stat-delta-positive' : sd.isPositive === false ? 'stat-delta-negative' : 'stat-delta-neutral';
      rowsHtml += `
        <tr>
          <td style="color:var(--text-main); font-weight:600; padding:2px 4px;">${sd.label}</td>
          <td style="color:var(--cyan-core); font-weight:700; padding:2px 4px;">${sd.candidateVal}</td>
          <td style="color:var(--gold-runic); padding:2px 4px;">${sd.equippedVal}</td>
          <td style="padding:2px 4px;"><span class="stat-delta-pill ${deltaClass}">${sd.diffFormatted}</span></td>
        </tr>
      `;
    });

    const candElemBadge = this.getElementBadge(candidateItem);
    const eqElemBadge = equipped ? this.getElementBadge(equipped) : '';
    const candUpBadge = (candidateItem.upgradeLevel && candidateItem.upgradeLevel > 0) ? `<span style="color:#38bdf8; font-weight:800; margin-left:4px;">(+${candidateItem.upgradeLevel})</span>` : '';
    const eqUpBadge = (equipped?.upgradeLevel && equipped.upgradeLevel > 0) ? `<span style="color:#38bdf8; font-weight:800; margin-left:4px;">(+${equipped.upgradeLevel})</span>` : '';

    container.innerHTML = `
      <div class="inventory-comparison-panel" style="min-height:230px; height:230px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; margin-top:0; padding:10px 14px; overflow:hidden;">
        <div class="inv-comp-header" style="padding-bottom:4px;">
          <span>⚡ [${comp.slotName}] COMPARISON MATRIX</span>
          <div class="comparison-verdict-banner ${comp.verdictClass}" style="padding:2px 8px; font-size:9.5px;">
            ${comp.verdictText}
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:2px;">
          <!-- Left: Candidate Card -->
          <div class="tooltip-card candidate-card" style="border-radius:4px; padding:6px 10px;">
            <div class="tooltip-card-header" style="margin-bottom:2px;">
              <span class="tooltip-badge candidate-badge">🎒 BACKPACK</span>
              <span style="font-family:var(--font-mono); font-size:9.5px; color:var(--text-muted);">LVL ${candidateItem.level}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:18px;">${this.getItemEmoji(candidateItem)}</span>
              <div style="overflow:hidden;">
                <div style="font-family:var(--font-rune); font-size:12px; color:var(--rarity-${candidateItem.rarity}); font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                  ${candidateItem.name} ${candUpBadge} ${candElemBadge}
                </div>
                <div style="font-family:var(--font-mono); font-size:9px; color:var(--text-muted); text-transform:uppercase;">
                  ${candidateItem.rarity} ${candidateItem.type}
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Equipped Card -->
          <div class="tooltip-card equipped-card" style="border-radius:4px; padding:6px 10px;">
            <div class="tooltip-card-header" style="margin-bottom:2px;">
              <span class="tooltip-badge equipped-badge">🛡️ EQUIPPED</span>
              ${equipped ? `<span style="font-family:var(--font-mono); font-size:9.5px; color:var(--text-muted);">LVL ${equipped.level}</span>` : ''}
            </div>
            ${equipped ? `
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:18px;">${this.getItemEmoji(equipped)}</span>
                <div style="overflow:hidden;">
                  <div style="font-family:var(--font-rune); font-size:12px; color:var(--rarity-${equipped.rarity}); font-weight:700; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                    ${equipped.name} ${eqUpBadge} ${eqElemBadge}
                  </div>
                  <div style="font-family:var(--font-mono); font-size:9px; color:var(--text-muted); text-transform:uppercase;">
                    ${equipped.rarity} ${equipped.type}
                  </div>
                </div>
              </div>
            ` : `
              <div style="display:flex; align-items:center; justify-content:center; height:32px; color:var(--text-muted); font-family:var(--font-mono); font-size:10px; font-style:italic;">
                [ Empty Slot — Instant Upgrade ]
              </div>
            `}
          </div>
        </div>

        <!-- Stat Diff Table -->
        <table class="inv-comp-table" style="margin-top:2px; font-size:11px;">
          <thead>
            <tr>
              <th style="width:32%; padding:2px 4px;">STATISTIC</th>
              <th style="width:24%; color:var(--cyan-core); padding:2px 4px;">CANDIDATE</th>
              <th style="width:24%; color:var(--gold-runic); padding:2px 4px;">EQUIPPED</th>
              <th style="width:20%; padding:2px 4px;">DIFF</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Action Quick-Bar -->
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:2px;">
          <button id="btn-comp-equip-now" class="sampo-btn small" style="background:var(--cyan-core); color:#030712; font-weight:800; padding:4px 12px; font-size:11px;">
            ⚡ EQUIP NOW
          </button>
        </div>
      </div>
    `;

    // Bind Quick-Equip Button in Comparison Matrix
    document.getElementById('btn-comp-equip-now')?.addEventListener('click', () => {
      if (candidateIndex === undefined) return;
      if (candidateItem.type === 'weapon') {
        const unlockedSlots = CUMULATIVE_WEAPON_SLOTS.filter(s => player.isWeaponSlotUnlocked(s));
        const emptySlot = unlockedSlots.find(s => !player.equipment[s]);
        if (emptySlot) {
          player.equipment[emptySlot] = candidateItem;
          player.inventory.splice(candidateIndex, 1);
        } else {
          const targetSlot = unlockedSlots[0] || 'mainHand';
          const oldWpn = player.equipment[targetSlot];
          player.equipment[targetSlot] = candidateItem;
          player.inventory.splice(candidateIndex, 1);
          if (oldWpn) {
            player.inventory.push(oldWpn);
          }
        }
        player.recalculateDerivedStats();
        soundEngine.playRuneClick();
        this.selectedComparisonItem = null;
        this.clearHighlight();
        this.hideTooltip();
        this.onPlayerUpdate();
        this.open(player);
      } else if (candidateItem.slot) {
        const current = player.equipment[candidateItem.slot];
        player.equipment[candidateItem.slot] = candidateItem;
        player.inventory.splice(candidateIndex, 1);
        if (current) {
          player.inventory.push(current);
        }
        player.recalculateDerivedStats();
        soundEngine.playRuneClick();
        this.selectedComparisonItem = null;
        this.clearHighlight();
        this.hideTooltip();
        this.onPlayerUpdate();
        this.open(player);
      }
    });
  }

  // =========================================================================
  // SIDE-BY-SIDE DUAL COMPARISON TOOLTIP (Immediate Hover View)
  // =========================================================================
  private showTooltip(item: Item, e: MouseEvent, player?: Player, isFromBackpack: boolean = true) {
    if (!this.tooltipEl) return;

    // Check if we should render Side-by-Side Dual Comparison Tooltip
    if (isFromBackpack && (item.slot || item.type === 'weapon') && player) {
      this.tooltipEl.classList.add('comparison-mode');
      const isWeapon = item.type === 'weapon' || item.slot === 'mainHand' || item.slot?.startsWith('weapon');
      let equipped: Item | null = null;
      if (isWeapon) {
        const unlockedSlots = CUMULATIVE_WEAPON_SLOTS.filter(s => player.isWeaponSlotUnlocked(s));
        const emptySlot = unlockedSlots.find(s => !player.equipment[s]);
        if (emptySlot) {
          equipped = null;
        } else {
          const targetSlot = unlockedSlots[0] || 'mainHand';
          equipped = player.equipment[targetSlot] || player.baseWeapon || null;
        }
      } else if (item.slot) {
        equipped = player.equipment[item.slot] || null;
      }
      const comp = this.computeComparison(item, equipped);

      let candidateStats = '';
      if (item.damage) {
        const diff = (item.damage || 0) - (equipped?.damage || 0);
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Damage: <strong style="color:var(--cyan-core);">${item.damage} (${item.damageType?.toUpperCase()})</strong>${delta}</div>`;
      }
      if (item.upgradeLevel || equipped?.upgradeLevel) {
        const cUp = item.upgradeLevel || 0;
        const eUp = equipped?.upgradeLevel || 0;
        const diff = cUp - eUp;
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Overclock Rank: <strong style="color:#38bdf8;">+${cUp} ★</strong>${delta}</div>`;
      }
      if (item.bonusProjectiles || equipped?.bonusProjectiles) {
        const cP = item.bonusProjectiles || 0;
        const eP = equipped?.bonusProjectiles || 0;
        const diff = cP - eP;
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Volley Bullets: <strong style="color:var(--cyan-core);">+${cP}</strong>${delta}</div>`;
      }
      if (item.shieldDamageBonus || equipped?.shieldDamageBonus) {
        const cS = Math.round((item.shieldDamageBonus || 0) * 100);
        const eS = Math.round((equipped?.shieldDamageBonus || 0) * 100);
        const diff = cS - eS;
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff}% ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff}% 🔻</span>` : '';
        candidateStats += `<div>Barrier Shred: <strong style="color:#38bdf8;">+${cS}%</strong>${delta}</div>`;
      }
      if (item.areaRadiusBonus || equipped?.areaRadiusBonus) {
        const cA = item.areaRadiusBonus || 0;
        const eA = equipped?.areaRadiusBonus || 0;
        const diff = Number((cA - eA).toFixed(1));
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff}m ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff}m 🔻</span>` : '';
        candidateStats += `<div>Shockwave AoE: <strong style="color:#f59e0b;">+${cA.toFixed(1)}m</strong>${delta}</div>`;
      }
      if ((item.rangeMultiplier && item.rangeMultiplier !== 1.0) || (equipped?.rangeMultiplier && equipped.rangeMultiplier !== 1.0)) {
        const cR = Math.round((item.rangeMultiplier || 1.0) * 100);
        const eR = Math.round((equipped?.rangeMultiplier || 1.0) * 100);
        const diff = cR - eR;
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff}% ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff}% 🔻</span>` : '';
        candidateStats += `<div>Range & Speed: <strong style="color:#a855f7;">${cR}%</strong>${delta}</div>`;
      }
      if (item.armor) {
        const diff = (item.armor || 0) - (equipped?.armor || 0);
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Armor: <strong style="color:var(--cyan-core);">+${item.armor}</strong>${delta}</div>`;
      }
      if (item.healthMax) {
        const diff = (item.healthMax || 0) - (equipped?.healthMax || 0);
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Max HP: <strong style="color:#ef4444;">+${item.healthMax}</strong>${delta}</div>`;
      }
      if (item.shieldMax) {
        const diff = (item.shieldMax || 0) - (equipped?.shieldMax || 0);
        const delta = diff > 0 ? `<span class="stat-delta-pill stat-delta-positive">+${diff} ⬆️</span>` : diff < 0 ? `<span class="stat-delta-pill stat-delta-negative">${diff} 🔻</span>` : '';
        candidateStats += `<div>Max Shield: <strong style="color:#38bdf8;">+${item.shieldMax}</strong>${delta}</div>`;
      }

      let equippedStats = '';
      if (equipped) {
        if (equipped.damage) equippedStats += `<div>Damage: <strong style="color:var(--gold-runic);">${equipped.damage} (${equipped.damageType?.toUpperCase()})</strong></div>`;
        if (equipped.upgradeLevel) equippedStats += `<div>Overclock Rank: <strong style="color:#38bdf8;">+${equipped.upgradeLevel} ★</strong></div>`;
        if (equipped.bonusProjectiles) equippedStats += `<div>Volley Bullets: <strong style="color:var(--cyan-core);">+${equipped.bonusProjectiles}</strong></div>`;
        if (equipped.shieldDamageBonus) equippedStats += `<div>Barrier Shred: <strong style="color:#38bdf8;">+${Math.round(equipped.shieldDamageBonus * 100)}%</strong></div>`;
        if (equipped.areaRadiusBonus) equippedStats += `<div>Shockwave AoE: <strong style="color:#f59e0b;">+${equipped.areaRadiusBonus.toFixed(1)}m</strong></div>`;
        if (equipped.rangeMultiplier && equipped.rangeMultiplier !== 1.0) equippedStats += `<div>Range & Speed: <strong style="color:#a855f7;">${Math.round(equipped.rangeMultiplier * 100)}%</strong></div>`;
        if (equipped.armor) equippedStats += `<div>Armor: <strong style="color:var(--gold-runic);">+${equipped.armor}</strong></div>`;
        if (equipped.healthMax) equippedStats += `<div>Max HP: <strong style="color:#ef4444;">+${equipped.healthMax}</strong></div>`;
        if (equipped.shieldMax) equippedStats += `<div>Max Shield: <strong style="color:#38bdf8;">+${equipped.shieldMax}</strong></div>`;
      }

      this.tooltipEl.innerHTML = `
        <div class="comparison-verdict-banner ${comp.verdictClass}">
          <span>${comp.verdictText}</span>
          <span style="font-size:10px; color:#ffffff;">FITS IN [${comp.slotName}]</span>
        </div>

        <div class="comparison-tooltip-grid">
          <!-- Left: Candidate Tooltip Card -->
          <div class="tooltip-card candidate-card">
            <div class="tooltip-card-header">
              <span class="tooltip-badge candidate-badge">🎒 NEW CANDIDATE</span>
              <span style="font-family:var(--font-mono); font-size:10px; color:var(--cyan-core);">LVL ${item.level}</span>
            </div>
            <div class="tooltip-name" style="color:var(--rarity-${item.rarity}); font-size:14px;">
              ${this.getItemEmoji(item)} ${item.name}
            </div>
            <div class="tooltip-type-slot">${item.rarity.toUpperCase()} ${comp.slotName}</div>
            ${candidateStats ? `<div class="tooltip-stats" style="margin-bottom:4px;">${candidateStats}</div>` : ''}
            ${item.affixes && item.affixes.length > 0 ? `<div class="tooltip-affixes" style="font-size:11px;">${item.affixes.map(a => `<div>• ${a}</div>`).join('')}</div>` : ''}
            ${item.sockets && item.sockets.length > 0 ? `<div style="font-family:var(--font-mono); font-size:10px; color:var(--gold-runic);">Sockets: ${item.sockets.map(s => s.filled ? '[●]' : '[○]').join(' ')}</div>` : ''}
            <div style="margin-top:auto; padding-top:6px; border-top:1px solid var(--border-dim); font-family:var(--font-mono); font-size:10px; color:var(--cyan-core);">
              ${isWeapon ? (!equipped ? '[L-Click to Add to Simultaneous Arsenal]' : '[L-Click to Swap Primary Weapon]') : '[L-Click to Equip Now]'}
            </div>
          </div>

          <!-- Right: Equipped Tooltip Card -->
          <div class="tooltip-card equipped-card">
            <div class="tooltip-card-header">
              <span class="tooltip-badge equipped-badge">${isWeapon && !equipped ? '⚔️ ARSENAL' : '🛡️ EQUIPPED'}</span>
              ${equipped ? `<span style="font-family:var(--font-mono); font-size:10px; color:var(--gold-runic);">LVL ${equipped.level}</span>` : ''}
            </div>
            ${equipped ? `
              <div class="tooltip-name" style="color:var(--rarity-${equipped.rarity}); font-size:14px;">
                ${this.getItemEmoji(equipped)} ${equipped.name}
              </div>
              <div class="tooltip-type-slot">${equipped.rarity.toUpperCase()} ${comp.slotName}</div>
              ${equippedStats ? `<div class="tooltip-stats" style="margin-bottom:4px;">${equippedStats}</div>` : ''}
              ${equipped.affixes && equipped.affixes.length > 0 ? `<div class="tooltip-affixes" style="font-size:11px; color:var(--gold-runic);">${equipped.affixes.map(a => `<div>• ${a}</div>`).join('')}</div>` : ''}
              ${equipped.sockets && equipped.sockets.length > 0 ? `<div style="font-family:var(--font-mono); font-size:10px; color:var(--gold-runic);">Sockets: ${equipped.sockets.map(s => s.filled ? '[●]' : '[○]').join(' ')}</div>` : ''}
              <div style="margin-top:auto; padding-top:6px; border-top:1px solid var(--border-dim); font-family:var(--font-mono); font-size:10px; color:var(--gold-runic);">
                [Currently Active Gear]
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:120px; color:var(--text-muted); font-family:var(--font-mono); font-size:11px; text-align:center;">
                <span style="font-size:24px; margin-bottom:4px;">✨</span>
                <span>EMPTY ${isWeapon ? 'ARSENAL' : 'EQUIPMENT'} SLOT</span>
                <span style="color:var(--cyan-core); margin-top:4px;">${isWeapon ? 'Fires simultaneously alongside all weapons!' : 'Direct raw boost!'}</span>
              </div>
            `}
          </div>
        </div>
      `;

      this.tooltipEl.style.display = 'block';
      const tooltipW = 560;
      const tooltipH = 340;
      let left = e.clientX + 16;
      if (left + tooltipW > window.innerWidth - 15) {
        left = Math.max(10, e.clientX - tooltipW - 16);
      }
      let top = e.clientY - 40;
      if (top + tooltipH > window.innerHeight - 15) {
        top = Math.max(10, window.innerHeight - tooltipH - 15);
      }
      this.tooltipEl.style.left = `${left}px`;
      this.tooltipEl.style.top = `${top}px`;
      return;
    }

    // Standard Single Tooltip Mode (e.g. for consumables, materials, or already-equipped items)
    this.tooltipEl.classList.remove('comparison-mode');

    let statsHtml = '';
    if (item.damage) statsHtml += `<div>Damage: <strong style="color:var(--cyan-core);">${item.damage} (${item.damageType?.toUpperCase()})</strong></div>`;
    if (item.upgradeLevel) statsHtml += `<div>Overclock Rank: <strong style="color:#38bdf8;">+${item.upgradeLevel} / 10 ★</strong></div>`;
    if (item.bonusProjectiles) statsHtml += `<div>Volley Bullets: <strong style="color:var(--cyan-core);">+${item.bonusProjectiles}</strong></div>`;
    if (item.shieldDamageBonus) statsHtml += `<div>Barrier Shred: <strong style="color:#38bdf8;">+${Math.round(item.shieldDamageBonus * 100)}% Shield Dmg</strong></div>`;
    if (item.areaRadiusBonus) statsHtml += `<div>Shockwave AoE: <strong style="color:#f59e0b;">+${item.areaRadiusBonus.toFixed(1)}m Radius</strong></div>`;
    if (item.rangeMultiplier && item.rangeMultiplier !== 1.0) statsHtml += `<div>Range & Speed: <strong style="color:#a855f7;">${Math.round(item.rangeMultiplier * 100)}%</strong></div>`;
    if (item.spreadAngleBonus) statsHtml += `<div>Spread Arc: <strong style="color:#94a3b8;">+${Math.round((item.spreadAngleBonus * 180) / Math.PI)}°</strong></div>`;
    if (item.armor) statsHtml += `<div>Armor: <strong style="color:var(--cyan-core);">+${item.armor}</strong></div>`;
    if (item.healthMax) statsHtml += `<div>Max HP: <strong style="color:#ef4444;">+${item.healthMax}</strong></div>`;
    if (item.shieldMax) statsHtml += `<div>Max Shield: <strong style="color:#38bdf8;">+${item.shieldMax}</strong></div>`;
    if (item.healAmount) statsHtml += `<div>Restores: <strong style="color:#10b981;">+${item.healAmount} Health</strong></div>`;

    let affixesHtml = '';
    if (item.affixes && item.affixes.length > 0) {
      affixesHtml = `<div class="tooltip-affixes">${item.affixes.map(a => `<div>• ${a}</div>`).join('')}</div>`;
    }

    let socketsHtml = '';
    if (item.sockets && item.sockets.length > 0) {
      socketsHtml = `<div style="font-family:var(--font-mono); font-size:11px; color:var(--gold-runic); margin-bottom:6px;">Sockets: ${item.sockets.map(s => s.filled ? '[● Infused]' : '[○ Empty]').join(' ')}</div>`;
    }

    const isBaseWeapon = player?.baseWeapon && (player.baseWeapon.id === item.id || player.baseWeapon.name === item.name);
    const slotDisplay = isBaseWeapon
      ? '⭐ INNATE ARSENAL WEAPON'
      : (item.slot ? this.getSlotDisplayName(item.slot) : item.type.toUpperCase());
    const fitSlotBadge = isBaseWeapon
      ? `<div style="margin-top:4px; font-family:var(--font-mono); font-size:10px; color:#f59e0b; display:flex; align-items:center; gap:4px; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:3px; border:1px solid rgba(245,158,11,0.35);">
          <span>⭐ INNATE ARCHETYPE WEAPON:</span> <strong style="color:#fbbf24; letter-spacing:0.5px;">PERMANENT ARSENAL CORE</strong>
        </div>`
      : (item.slot
        ? `<div style="margin-top:4px; font-family:var(--font-mono); font-size:10px; color:var(--cyan-core); display:flex; align-items:center; gap:4px; background:rgba(56,189,248,0.12); padding:2px 6px; border-radius:3px; border:1px solid rgba(56,189,248,0.25);">
            <span>🎯 Slot:</span> <strong style="color:#7dd3fc; letter-spacing:0.5px;">${this.getSlotDisplayName(item.slot)}</strong>
          </div>`
        : '');

    const footerHtml = isBaseWeapon
      ? `<div style="margin-top:6px; font-family:var(--font-mono); font-size:10px; color:#f59e0b; text-align:center;">
          🔒 PERMANENT ARCHETYPE CORE (ALWAYS ACTIVE & SIMULTANEOUSLY FIRED)
        </div>`
      : `<div style="margin-top:6px; font-family:var(--font-mono); font-size:10.5px; color:var(--gold-runic); display:flex; justify-content:space-between; align-items:center;">
          <span>♻️ Salvage: +${item.naniteValue || 20} Scrap</span>
          <span style="color:#94a3b8; font-size:9.5px;">[R-Click / Shift-Click]</span>
        </div>`;

    this.tooltipEl.innerHTML = `
      <div class="tooltip-name" style="color:var(--rarity-${item.rarity});">${this.getItemEmoji(item)} ${item.name}</div>
      <div class="tooltip-type-slot">${item.rarity.toUpperCase()} ${slotDisplay} (LVL ${item.level})</div>
      ${fitSlotBadge}
      ${statsHtml ? `<div class="tooltip-stats">${statsHtml}</div>` : ''}
      ${affixesHtml}
      ${socketsHtml}
      <div class="tooltip-desc">${item.description}</div>
      ${footerHtml}
    `;

    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = `${Math.min(window.innerWidth - 330, e.clientX + 15)}px`;
    this.tooltipEl.style.top = `${Math.min(window.innerHeight - 250, e.clientY + 15)}px`;
  }

  private hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
      this.tooltipEl.classList.remove('comparison-mode');
    }
  }

  private salvageItem(player: Player, index: number, item: Item) {
    let scrapValue = item.naniteValue || (20 * (item.level || 1));
    if (player.appearance.archetype === 'runoseppä') {
      scrapValue = Math.round(scrapValue * 1.35);
    }
    player.naniteScrap += scrapValue;
    player.inventory.splice(index, 1);
    soundEngine.playScrapPickup();
    this.clearHighlight();
    this.hideTooltip();
    this.selectedComparisonItem = null;
    this.onPlayerUpdate();
    this.open(player);
  }

  private getElementBadge(item: Item): string {
    const elem = item.damageType || item.element;
    if (!elem || elem === 'physical') return '';
    const badgeMap: Record<string, { icon: string, color: string }> = {
      fire: { icon: '🔥', color: '#f97316' },
      frost: { icon: '❄️', color: '#38bdf8' },
      shock: { icon: '⚡', color: '#facc15' },
      void: { icon: '🟣', color: '#c084fc' },
      plasma: { icon: '💠', color: '#06b6d4' }
    };
    const b = badgeMap[elem];
    if (!b) return '';
    return `<span class="item-element-pip" style="color:${b.color};" title="${elem.toUpperCase()}">${b.icon}</span>`;
  }

  private getItemEmoji(item: Item): string {
    const iconMap: Record<string, string> = {
      // Weapons
      sword: '🗡️',
      plasma_sword: '🗡️',
      thunder_blade: '⚡',
      vibro_dagger: '🔪',
      frost_saber: '🧊',
      void_scythe: '🪓',
      slag_hammer: '🔨',
      runic_sledge: '⚒️',
      kinetic_breaker: '🪨',
      crosshair: '🎯',
      rail_rifle: '🔫',
      cryo_cannon: '🔬',
      sonic_blaster: '📻',
      void_mortar: '💣',
      wand: '🪄',
      arc_scepter: '🪄',
      kantele_resonator: '🪕',
      magma_staff: '🔱',
      star_spire: '✨',
      plasma_axe: '🪓',
      runic_halberd: '⛏️',
      hammer: '🔨',

      // Helmets & Head
      eye: '🥽',
      cyber_visor: '🥽',
      smelt_helm: '🪖',
      neural_crown: '👑',
      stalker_hood: '🥷',
      death_mask: '👺',
      sensor_array: '📡',

      // Chest & Body
      shield: '🛡️',
      ballistic_carapace: '🦺',
      power_exoskeleton: '🥋',
      lyric_coat: '🧥',
      frost_cuirass: '🛡️',
      volcanic_plate: '🎽',
      kirjokansi_mantle: '🥻',

      // Legs & Boots
      footprints: '🥾',
      stalker_greaves: '🥾',
      maglev_treads: '👟',
      iron_boots: '👢',
      warp_strats: '🩴',
      ghost_walkers: '👣',

      // Off-Hand & Shields
      'shield-alert': '🛡️',
      deflector_aegis: '🛡️',
      shock_buckler: '⚡',
      nanite_dynamo: '🔋',
      bone_totem: '🪬',
      lyric_chime: '🔔',
      plasma_emitter: '🔆',

      // Relics & Cores
      cpu: '⚙️',
      sampo_matrix: '⚙️',
      heart_of_louhi: '💎',
      primordial_spark: '🔥',
      kantele_core: '🪩',
      eye_of_void: '👁️',
      karhu_totem: '🐻',
      celestial_compass: '🧭',
      abyssal_pearl: '🔮',

      // Gems & Consumables
      gem: '💎',
      activity: '💉',
      potion_heal: '💉',
      potion_overclock: '🧪',
      potion_coolant: '🧊',
      potion_scrap: '🏺',
      potion_lyric: '🧃'
    };

    if (item.icon && iconMap[item.icon]) {
      return iconMap[item.icon];
    }

    // Dynamic resolution by name, slot, type & element
    const n = item.name.toLowerCase();

    if (item.type === 'consumable') {
      if (n.includes('stimulant') || n.includes('overclock')) return '🧪';
      if (n.includes('elixir') || n.includes('flux')) return '🏺';
      if (n.includes('brew') || n.includes('tonic')) return '🧃';
      if (n.includes('coolant') || n.includes('cryo')) return '🧊';
      return '💉';
    }

    if (item.type === 'socket_gem') {
      if (item.element === 'fire') return '🔥';
      if (item.element === 'frost') return '❄️';
      if (item.element === 'shock') return '⚡';
      if (item.element === 'void') return '🟣';
      return '💎';
    }

    if (item.type === 'weapon' || item.slot === 'mainHand' || item.slot?.startsWith('weapon')) {
      if (n.includes('katana') || n.includes('saber')) return '🗡️';
      if (n.includes('dagger')) return '🔪';
      if (n.includes('scythe')) return '🪓';
      if (n.includes('hammer') || n.includes('sledge')) return '🔨';
      if (n.includes('breaker')) return '🪨';
      if (n.includes('rifle') || n.includes('cannon') || n.includes('blaster')) return '🔫';
      if (n.includes('mortar')) return '💣';
      if (n.includes('staff') || n.includes('scepter') || n.includes('spire')) return '🪄';
      if (n.includes('harp') || n.includes('kantele') || n.includes('resonator')) return '🪕';
      if (n.includes('axe')) return '🪓';
      if (n.includes('halberd')) return '⛏️';
      if (item.damageType === 'fire') return '🔨';
      if (item.damageType === 'frost') return '🧊';
      if (item.damageType === 'shock') return '⚡';
      if (item.damageType === 'void') return '🪓';
      return '🗡️';
    }

    if (item.slot === 'offHand') {
      if (n.includes('buckler')) return '⚡';
      if (n.includes('dynamo') || n.includes('battery')) return '🔋';
      if (n.includes('totem')) return '🪬';
      if (n.includes('chime') || n.includes('bell')) return '🔔';
      if (n.includes('emitter')) return '🔆';
      return '🛡️';
    }

    if (item.slot === 'head') {
      if (n.includes('crown')) return '👑';
      if (n.includes('hood')) return '🥷';
      if (n.includes('mask')) return '👺';
      if (n.includes('sensor') || n.includes('array')) return '📡';
      if (n.includes('helm')) return '🪖';
      return '🥽';
    }

    if (item.slot === 'chest') {
      if (n.includes('exoskeleton')) return '🥋';
      if (n.includes('coat') || n.includes('trench')) return '🧥';
      if (n.includes('mantle')) return '🥻';
      if (n.includes('plate') || n.includes('volcanic')) return '🎽';
      if (n.includes('carapace')) return '🦺';
      return '🛡️';
    }

    if (item.slot === 'legs') {
      if (n.includes('treads')) return '👟';
      if (n.includes('boots')) return '👢';
      if (n.includes('strats') || n.includes('sandals')) return '🩴';
      if (n.includes('walkers') || n.includes('ghost')) return '👣';
      return '🥾';
    }

    if (item.slot === 'relic') {
      if (n.includes('spark') || n.includes('flame')) return '🔥';
      if (n.includes('heart')) return '💎';
      if (n.includes('core') || n.includes('singularity')) return '🪩';
      if (n.includes('eye')) return '👁️';
      if (n.includes('totem') || n.includes('karhu')) return '🐻';
      if (n.includes('compass')) return '🧭';
      if (n.includes('pearl')) return '🔮';
      return '⚙️';
    }

    return '📦';
  }

  close() {
    this.clearHighlight();
    this.hideTooltip();
    this.selectedComparisonItem = null;
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
