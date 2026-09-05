// Profile Management & Total Reset Modal UI for Sampo-Zero
// Allows switching operatives, synthesizing new zero-stat profiles, resetting profiles, or total factory wipe

import { profileManager, GameProfile } from '../systems/profiles';
import { getStarterWeaponForArchetype } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { HeroRenderer } from '../engine/hero_renderer';

export class ProfileModalUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private activeConfirmEl: HTMLElement | null = null;
  private onSelectProfileCallback?: (profile: GameProfile) => void;
  private onCreateNewCallback?: () => void;
  private onTotalResetCallback?: () => void;
  private onProfileResetCallback?: (profile: GameProfile) => void;
  private onProfileDeletedCallback?: (activeProfile: GameProfile | null) => void;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.modalEl !== null;
  }

  show(
    onSelectProfile: (profile: GameProfile) => void,
    onCreateNew: () => void,
    onTotalReset: () => void,
    onProfileReset?: (profile: GameProfile) => void,
    onProfileDeleted?: (activeProfile: GameProfile | null) => void
  ) {
    this.close();

    this.onSelectProfileCallback = onSelectProfile;
    this.onCreateNewCallback = onCreateNew;
    this.onTotalResetCallback = onTotalReset;
    this.onProfileResetCallback = onProfileReset;
    this.onProfileDeletedCallback = onProfileDeleted;

    this.render();
  }

  private render() {
    if (this.activeConfirmEl) {
      this.activeConfirmEl.remove();
      this.activeConfirmEl = null;
    }

    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }

    const profiles = profileManager.getAllProfiles();
    const activeProfile = profileManager.getActiveProfile();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'profile-manager-modal';
    this.modalEl.className = 'interactive';
    this.modalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 8, 16, 0.92);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
      pointer-events: auto;
    `;

    this.modalEl.innerHTML = `
      <div style="
        width: 880px;
        max-width: 95vw;
        max-height: 92vh;
        overflow-y: auto;
        background: rgba(13, 18, 29, 0.98);
        border: 2px solid var(--border-glow);
        border-radius: 10px;
        padding: 24px 28px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.95), 0 0 30px rgba(56, 189, 248, 0.25);
        display: flex;
        flex-direction: column;
        gap: 20px;
        pointer-events: auto;
      ">
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:24px;">👤</span>
              <span style="font-family:var(--font-rune); font-size:22px; color:var(--gold-runic); letter-spacing:2px;">
                OPERATIVE PROFILES & SYSTEM PURGE
              </span>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">
              Select active vessel, synthesize a new operative with zero stats, or perform a total matrix wipe.
            </div>
          </div>

          <div style="display:flex; gap:10px; align-items:center;">
            <button id="btn-modal-create-profile" class="sampo-btn primary" style="padding:8px 16px; font-size:12px;">
              ➕ NEW OPERATIVE (ZERO STATS)
            </button>
            <button id="btn-profile-close-x" style="
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
        </div>

        <!-- PROFILE CARDS CONTAINER -->
        <div id="profile-cards-list" style="display:flex; flex-direction:column; gap:14px;">
          ${profiles.length === 0 ? `
            <div style="text-align:center; padding:40px 20px; background:rgba(9,14,23,0.6); border:1px dashed var(--border-dim); border-radius:8px;">
              <div style="font-size:32px; margin-bottom:10px;">🧬</div>
              <div style="font-size:16px; font-family:var(--font-rune); color:var(--text-main); margin-bottom:6px;">NO BIO-RUNIC VESSELS DETECTED</div>
              <div style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Create a new operative to begin exploring the Kalevala Wasteland.</div>
              <button id="btn-empty-create" class="sampo-btn primary" style="padding:10px 20px;">
                ➕ SYNTHESIZE FIRST OPERATIVE
              </button>
            </div>
          ` : profiles.map((p) => {
            const isActive = activeProfile && activeProfile.id === p.id;
            const clearedCount = p.clearedSectors ? p.clearedSectors.length : 0;
            const totalClears = Object.values(p.sectorClears || {}).reduce((a, b) => a + b, 0);
            const dateStr = new Date(p.lastPlayed || p.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const archTitle = {
              soturi: '⚔️ SOTURI (Berserker)',
              runoseppä: '🎵 RUNOSEPPÄ (Artificer)',
              tietäjä: '🔮 TIETÄJÄ (Cyber-Shaman)',
              korvenraivaaja: '🎯 KORVENRAIVAAJA (Ranger)'
            }[p.archetype] || p.archetype.toUpperCase();

            return `
              <div class="profile-card ${isActive ? 'active' : ''}" data-id="${p.id}" style="
                background: ${isActive ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(9, 14, 23, 0.9) 100%)' : 'rgba(9, 14, 23, 0.75)'};
                border: 1.5px solid ${isActive ? 'var(--cyan-core)' : 'var(--border-dim)'};
                border-radius: 8px;
                padding: 14px 18px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                box-shadow: ${isActive ? '0 0 20px rgba(56, 189, 248, 0.25)' : 'none'};
                transition: all 0.2s ease;
              ">
                <!-- AVATAR & INFO -->
                <div style="display:flex; align-items:center; gap:16px; min-width:0; flex:1;">
                  <div style="
                    width: 58px; height: 58px; 
                    border-radius: 6px; 
                    border: 2px solid ${isActive ? 'var(--cyan-core)' : 'var(--border-glow)'}; 
                    overflow: hidden; 
                    background: #060a12; 
                    flex-shrink: 0;
                    box-shadow: ${isActive ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none'};
                  ">
                    <canvas id="prof-avatar-${p.id}" width="58" height="58" style="width:100%; height:100%; display:block;"></canvas>
                  </div>

                  <div style="display:flex; flex-direction:column; gap:3px; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-family:var(--font-rune); font-size:17px; font-weight:700; color:#fff; letter-spacing:0.5px;">
                        ${p.name}
                      </span>
                      ${isActive ? `
                        <span style="
                          background: rgba(56, 189, 248, 0.2); 
                          border: 1px solid var(--cyan-core); 
                          color: var(--cyan-core); 
                          font-family: var(--font-mono); 
                          font-size: 10px; 
                          font-weight: 700; 
                          padding: 2px 6px; 
                          border-radius: 4px;
                          letter-spacing: 1px;
                        ">ACTIVE</span>
                      ` : ''}
                    </div>

                    <div style="font-family:var(--font-mono); font-size:11.5px; color:var(--gold-runic);">
                      ${archTitle} &bull; <span style="color:#67e8f9;">LVL ${p.playerData?.level || 1}</span> (${p.playerData?.xp || 0} XP)
                    </div>

                    <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                      <span>⚡ ${p.playerData?.naniteScrap !== undefined ? p.playerData.naniteScrap : 150} Scrap</span>
                      <span>•</span>
                      <span style="color:#38bdf8; font-weight:700;">⚔️ ${p.playerData?.baseWeapon?.name || getStarterWeaponForArchetype(p.archetype).name}</span>
                      <span>•</span>
                      <span style="color:${clearedCount > 0 ? '#10b981' : '#94a3b8'};">
                        🌌 ${clearedCount}/6 Realms ${totalClears > 0 ? `(${totalClears} Clears)` : ''}
                      </span>
                      <span>•</span>
                      <span>🕒 ${dateStr}</span>
                    </div>
                  </div>
                </div>

                <!-- ACTIONS -->
                <div style="display:flex; gap:8px; align-items:center; flex-shrink:0;">
                  ${!isActive ? `
                    <button class="sampo-btn primary btn-select-profile" data-id="${p.id}" style="padding:8px 16px; font-size:11.5px;">
                      ▶ SELECT
                    </button>
                  ` : `
                    <button class="sampo-btn gold" style="padding:8px 16px; font-size:11.5px; cursor:default;">
                      ✓ CURRENT
                    </button>
                  `}

                  <button class="sampo-btn btn-reset-single-profile" data-id="${p.id}" data-name="${p.name}" title="Reset this operative to Level 1 and 0 stats" style="padding:8px 12px; font-size:11px; border-color:rgba(245,158,11,0.5); color:#fde047;">
                    🔄 RESET (0 STATS)
                  </button>

                  <button class="sampo-btn btn-delete-profile" data-id="${p.id}" data-name="${p.name}" title="Delete profile" style="padding:8px 10px; font-size:11px; border-color:rgba(239,68,68,0.5); color:#fca5a5;">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- TOTAL RESET & FACTORY PURGE FOOTER -->
        <div style="
          margin-top: 8px;
          padding: 16px 20px;
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        ">
          <div>
            <div style="font-family:var(--font-mono); font-size:12.5px; color:#ef4444; font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>⚠️</span> TOTAL SIMULATION FACTORY RESET
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              Permanently wipe all operative vessels, reset all realm progress, and reboot simulation to absolute zero.
            </div>
          </div>

          <button id="btn-total-factory-reset" class="sampo-btn" style="
            background: linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%);
            border-color: #ef4444;
            color: #ffffff;
            padding: 9px 18px;
            font-size: 11.5px;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
            white-space: nowrap;
          ">
            💥 PURGE ALL DATA (TOTAL RESET)
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Render Canvas Portraits
    profiles.forEach(p => {
      const canvas = document.getElementById(`prof-avatar-${p.id}`) as HTMLCanvasElement;
      if (canvas && p.playerData?.appearance) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          HeroRenderer.drawPortrait(ctx, 29, 29, 52, p.playerData.appearance);
        }
      }
    });

    this.bindEvents();
  }

  private bindEvents() {
    if (!this.modalEl) return;

    // Close Button
    this.modalEl.querySelector('#btn-profile-close-x')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.close();
    });

    // Create New Profile
    this.modalEl.querySelector('#btn-modal-create-profile')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.close();
      if (this.onCreateNewCallback) {
        this.onCreateNewCallback();
      }
    });

    this.modalEl.querySelector('#btn-empty-create')?.addEventListener('click', () => {
      soundEngine.playRuneClick();
      this.close();
      if (this.onCreateNewCallback) {
        this.onCreateNewCallback();
      }
    });

    // Select Profile
    this.modalEl.querySelectorAll('.btn-select-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          profileManager.setActiveProfileId(id);
          soundEngine.playProfileSwitch();
          const p = profileManager.getActiveProfile();
          if (p && this.onSelectProfileCallback) {
            this.close();
            this.onSelectProfileCallback(p);
          }
        }
      });
    });

    // Reset Single Profile
    this.modalEl.querySelectorAll('.btn-reset-single-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const name = (e.currentTarget as HTMLElement).getAttribute('data-name') || 'Operative';
        if (id) {
          this.showResetConfirmation(id, name);
        }
      });
    });

    // Delete Single Profile
    this.modalEl.querySelectorAll('.btn-delete-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const name = (e.currentTarget as HTMLElement).getAttribute('data-name') || 'Operative';
        if (id) {
          this.showDeleteConfirmation(id, name);
        }
      });
    });

    // Total Factory Reset
    this.modalEl.querySelector('#btn-total-factory-reset')?.addEventListener('click', () => {
      this.showTotalResetConfirmation();
    });
  }

  // Confirmation Modal for Resetting a Single Profile
  private showResetConfirmation(profileId: string, name: string) {
    if (this.activeConfirmEl) {
      this.activeConfirmEl.remove();
      this.activeConfirmEl = null;
    }

    const confirmEl = document.createElement('div');
    confirmEl.className = 'interactive';
    confirmEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      z-index: 10010;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.15s ease;
      pointer-events: auto;
    `;

    confirmEl.innerHTML = `
      <div style="
        background: #0d121d;
        border: 2px solid var(--gold-runic);
        border-radius: 8px;
        padding: 24px 28px;
        max-width: 480px;
        width: 90%;
        text-align: center;
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
        pointer-events: auto;
      ">
        <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
        <div style="font-family: var(--font-rune); font-size: 19px; color: var(--gold-runic); margin-bottom: 10px;">
          RESET OPERATIVE STATS TO ZERO?
        </div>
        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
          Are you sure you want to reset <strong>${name}</strong>?<br/>
          This will set the operative back to <strong>Level 1 with 0 XP</strong>, restore default archetype stats, clear inventory, and reset all Kalevala Saga realm progression.
        </div>
        <div style="display:flex; justify-content:center; gap:12px;">
          <button id="btn-cancel-reset" class="sampo-btn" style="padding:9px 20px; font-size:12px;">
            CANCEL
          </button>
          <button id="btn-confirm-reset" class="sampo-btn gold" style="padding:9px 20px; font-size:12px;">
            ⚡ CONFIRM RESET (0 STATS)
          </button>
        </div>
      </div>
    `;

    this.activeConfirmEl = confirmEl;
    this.root.appendChild(confirmEl);

    confirmEl.querySelector('#btn-cancel-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEngine.playRuneClick();
      confirmEl.remove();
      this.activeConfirmEl = null;
    });

    confirmEl.querySelector('#btn-confirm-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmEl.remove();
      this.activeConfirmEl = null;
      const updated = profileManager.resetProfile(profileId);
      soundEngine.playProfileSwitch();
      if (updated && this.onProfileResetCallback) {
        this.close();
        this.onProfileResetCallback(updated);
      } else {
        this.render();
      }
    });
  }

  // Confirmation Modal for Deleting a Single Profile
  private showDeleteConfirmation(profileId: string, name: string) {
    if (this.activeConfirmEl) {
      this.activeConfirmEl.remove();
      this.activeConfirmEl = null;
    }

    const confirmEl = document.createElement('div');
    confirmEl.className = 'interactive';
    confirmEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      z-index: 10010;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.15s ease;
      pointer-events: auto;
    `;

    confirmEl.innerHTML = `
      <div style="
        background: #0d121d;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 24px 28px;
        max-width: 480px;
        width: 90%;
        text-align: center;
        box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
        pointer-events: auto;
      ">
        <div style="font-size: 32px; margin-bottom: 8px;">🗑️</div>
        <div style="font-family: var(--font-rune); font-size: 19px; color: #ef4444; margin-bottom: 10px;">
          PERMANENTLY DELETE OPERATIVE?
        </div>
        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-bottom: 20px;">
          Are you sure you want to permanently delete <strong>${name}</strong>?<br/>
          This slot and all associated vessel data will be permanently destroyed.
        </div>
        <div style="display:flex; justify-content:center; gap:12px;">
          <button id="btn-cancel-del" class="sampo-btn" style="padding:9px 20px; font-size:12px;">
            CANCEL
          </button>
          <button id="btn-confirm-del" class="sampo-btn" style="background:#dc2626; border-color:#ef4444; color:#fff; padding:9px 20px; font-size:12px;">
            🗑️ DELETE VESSEL
          </button>
        </div>
      </div>
    `;

    this.activeConfirmEl = confirmEl;
    this.root.appendChild(confirmEl);

    confirmEl.querySelector('#btn-cancel-del')?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEngine.playRuneClick();
      confirmEl.remove();
      this.activeConfirmEl = null;
    });

    confirmEl.querySelector('#btn-confirm-del')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmEl.remove();
      this.activeConfirmEl = null;
      profileManager.deleteProfile(profileId);
      soundEngine.playResetPurge();

      const remaining = profileManager.getAllProfiles();
      if (remaining.length === 0) {
        this.close();
        if (this.onProfileDeletedCallback) {
          this.onProfileDeletedCallback(null);
        } else if (this.onCreateNewCallback) {
          this.onCreateNewCallback();
        }
      } else {
        const active = profileManager.getActiveProfile();
        if (this.onProfileDeletedCallback) {
          this.onProfileDeletedCallback(active);
        }
        this.render();
      }
    });
  }

  // Confirmation Modal for Total Matrix Factory Reset
  private showTotalResetConfirmation() {
    if (this.activeConfirmEl) {
      this.activeConfirmEl.remove();
      this.activeConfirmEl = null;
    }

    const confirmEl = document.createElement('div');
    confirmEl.className = 'interactive';
    confirmEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 2, 4, 0.9);
      backdrop-filter: blur(10px);
      z-index: 10010;
      display: flex; justify-content: center; align-items: center;
      animation: fadeIn 0.15s ease;
      pointer-events: auto;
    `;

    confirmEl.innerHTML = `
      <div style="
        background: #140508;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 28px 32px;
        max-width: 520px;
        width: 90%;
        text-align: center;
        box-shadow: 0 0 50px rgba(239, 68, 68, 0.6);
        pointer-events: auto;
      ">
        <div style="font-size: 40px; margin-bottom: 8px;">💥</div>
        <div style="font-family: var(--font-rune); font-size: 21px; color: #ef4444; font-weight:700; margin-bottom: 12px; letter-spacing:1px;">
          CRITICAL: TOTAL FACTORY RESET
        </div>
        <div style="font-size: 13.5px; color: #fca5a5; line-height: 1.6; margin-bottom: 24px; background:rgba(239,68,68,0.12); padding:12px 16px; border-radius:6px; border:1px solid rgba(239,68,68,0.3);">
          ⚠️ <strong>WARNING — IRREVERSIBLE ACTION</strong><br/>
          This will wipe <strong>ALL operative profiles</strong>, erase all progress across all 6 Kalevala realms, and reset the simulation to brand-new installation state.
        </div>
        <div style="display:flex; justify-content:center; gap:14px;">
          <button id="btn-cancel-total-reset" class="sampo-btn" style="padding:10px 24px; font-size:13px;">
            CANCEL
          </button>
          <button id="btn-confirm-total-reset" class="sampo-btn" style="
            background: linear-gradient(180deg, #ef4444 0%, #991b1b 100%);
            border-color: #f87171;
            color: #ffffff;
            padding: 10px 24px;
            font-size: 13px;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
          ">
            💥 PURGE ALL DATA & REBOOT
          </button>
        </div>
      </div>
    `;

    this.activeConfirmEl = confirmEl;
    this.root.appendChild(confirmEl);

    confirmEl.querySelector('#btn-cancel-total-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      soundEngine.playRuneClick();
      confirmEl.remove();
      this.activeConfirmEl = null;
    });

    confirmEl.querySelector('#btn-confirm-total-reset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmEl.remove();
      this.activeConfirmEl = null;
      profileManager.totalFactoryReset();
      soundEngine.playResetPurge();
      this.close();
      if (this.onTotalResetCallback) {
        this.onTotalResetCallback();
      }
    });
  }

  close() {
    if (this.activeConfirmEl) {
      this.activeConfirmEl.remove();
      this.activeConfirmEl = null;
    }
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
  }
}
