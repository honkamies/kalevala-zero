// Cryptographic Cyber-Vault Decryption UI (WASD Key Sequence Minigame)
// Features: Pre-Decryption Briefing, Spacebar Trigger, Reaction Countdown Buffer, Stability Tolerance & Self-Destruction Overload

import { LootChest, DecryptionKey } from '../entities/chest';
import { soundEngine } from '../engine/audio';

export interface GreedWarningInfo {
  count: number;
  threatBonusPercent?: number;
}

export class ChestLockUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private currentChest: LootChest | null = null;
  private greedInfo: GreedWarningInfo = { count: 0, threatBonusPercent: 5 };
  private currentIndex: number = 0;
  private timerInterval: any = null;
  private remainingTime: number = 0;
  private totalKeyTime: number = 2.0;
  private isProcessing: boolean = false;
  private isStarted: boolean = false;
  private onDecryptedCallback?: (chest: LootChest) => void;
  private onDetonateCallback?: (chest: LootChest, damage: number) => void;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.modalEl !== null;
  }

  open(
    chest: LootChest,
    onDecrypted: (chest: LootChest) => void,
    onDetonate?: (chest: LootChest, damage: number) => void,
    greedInfo?: GreedWarningInfo
  ) {
    this.close();

    this.currentChest = chest;
    this.greedInfo = greedInfo || { count: 0, threatBonusPercent: 5 };
    this.currentIndex = 0;
    this.onDecryptedCallback = onDecrypted;
    this.onDetonateCallback = onDetonate;
    this.totalKeyTime = chest.timeLimitPerKey;
    this.remainingTime = this.totalKeyTime;
    this.isProcessing = false;
    this.isStarted = false;

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'chest-lock-modal';
    this.modalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 8, 16, 0.88);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9500;
      animation: fadeIn 0.15s ease;
      pointer-events: auto;
    `;

    const rarityColor = {
      common: '#94a3b8',
      augmented: '#38bdf8',
      runic: '#c084fc',
      masterwork: '#f59e0b',
      relic: '#ef4444'
    }[chest.rarity];

    const bonusPerVault = this.greedInfo.threatBonusPercent ?? 5;
    const currentThreatPct = (this.greedInfo.count || 0) * bonusPerVault;
    const nextThreatPct = currentThreatPct + bonusPerVault;
    const openedCount = this.greedInfo.count || 0;
    const threatBadgeColor = currentThreatPct > 0 ? '#ef4444' : '#f59e0b';

    this.modalEl.innerHTML = `
      <div id="chest-lock-card" style="
        width: 640px; 
        max-width: 94vw; 
        background: rgba(13, 18, 29, 0.98); 
        border: 2px solid ${rarityColor}; 
        border-radius: 10px; 
        padding: 24px 30px; 
        box-shadow: 0 0 35px ${rarityColor}44, 0 25px 60px rgba(0,0,0,0.9);
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-align: center;
      ">
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="./assets/chest_${chest.rarity}.jpg" style="
              width: 52px; 
              height: 52px; 
              border-radius: 8px; 
              border: 1.5px solid ${rarityColor}; 
              background: #000000; 
              box-shadow: 0 0 12px ${rarityColor}55; 
              object-fit: cover;
            " alt="${chest.displayName}" />
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-family:var(--font-rune); font-size:20px; color:#ffffff; letter-spacing:1.5px;">
                  ${chest.displayName.toUpperCase()}
                </span>
              </div>
              <div style="font-family:var(--font-mono); font-size:11px; color:${rarityColor}; margin-top:2px; text-align:left;">
                [${chest.rarity.toUpperCase()} TIER] // ${chest.keySequence.length}-STEP DIRECTIONAL CIPHER (${chest.timeLimitPerKey.toFixed(1)}s WINDOW)
              </div>
            </div>
          </div>

          <button id="btn-chest-lock-close" style="
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

        <!-- GREED CORRUPTION PROTOCOL WARNING -->
        <div style="
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(245, 158, 11, 0.09)); 
          border: 1.5px solid rgba(239, 68, 68, 0.45); 
          border-left: 4px solid #ef4444;
          border-radius: 6px; 
          padding: 10px 14px; 
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.15);
        ">
          <div style="font-size: 24px; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));">
            ⚠️
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-family: var(--font-rune); font-size: 11.5px; color: #f87171; letter-spacing: 1px; font-weight: 700;">
                GREED CORRUPTION PROTOCOL
              </span>
              <span style="font-family: var(--font-mono); font-size: 10.5px; color: #facc15; font-weight: 700; background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(245, 158, 11, 0.5); padding: 1px 7px; border-radius: 4px;">
                +${bonusPerVault}% ENEMY THREAT / VAULT
              </span>
            </div>
            <div style="font-size: 11.5px; color: var(--text-main); line-height: 1.35;">
              Opening cyber-vaults permanently <strong style="color: #fca5a5;">hardens all enemies</strong> in this realm (+${bonusPerVault}% Max HP & Damage). If you get greedy, enemies will become increasingly lethal!
            </div>
            <div style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted); display: flex; gap: 12px; margin-top: 1px; flex-wrap: wrap;">
              <span>Current Threat Boost: <strong style="color: ${threatBadgeColor};">+${currentThreatPct}%</strong></span>
              <span>➔ After Decrypt: <strong style="color: #ef4444;">+${nextThreatPct}%</strong></span>
              <span style="color: #94a3b8;">(${openedCount} Vault${openedCount === 1 ? '' : 's'} Opened)</span>
            </div>
          </div>
        </div>

        <!-- BRIEFING & STABILITY TOLERANCE BAR -->
        <div style="
          background: rgba(9, 14, 23, 0.75); 
          border: 1px solid var(--border-dim); 
          border-radius: 6px; 
          padding: 10px 14px; 
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 6px;
        ">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
              <span>💥</span> CORE INTEGRITY TOLERANCE:
            </div>
            <div id="lock-attempts-container" style="display:flex; gap:6px; align-items:center;">
              ${this.renderAttemptsHtml(chest.attemptsLeft, chest.maxAttempts)}
            </div>
          </div>
          <div style="font-size:11px; color:var(--text-main); line-height:1.4;">
            Input directional keys using <strong style="color:#fff;">[W] [A] [S] [D]</strong> or <strong style="color:#fff;">Arrow Keys</strong>. 
            <span style="color:#ef4444; font-weight:600;">Exceeding stability failure tolerance triggers explosive self-destruction!</span>
          </div>
        </div>

        <!-- TIMER PROGRESS BAR -->
        <div style="display:flex; flex-direction:column; gap:4px; text-align:left;">
          <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">
            <span id="lock-timer-label">RESPONSE BUFFER WINDOW</span>
            <span id="lock-timer-text" style="color:${rarityColor}; font-weight:700;">READY</span>
          </div>
          <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
            <div id="lock-timer-fill" style="width:100%; height:100%; background:${rarityColor}; transition:width 0.05s linear;"></div>
          </div>
        </div>

        <!-- WASD KEY SEQUENCE SLOTS -->
        <div id="lock-sequence-container" style="
          display: flex; 
          justify-content: center; 
          gap: 10px; 
          padding: 14px 8px; 
          background: rgba(9, 14, 23, 0.8); 
          border: 1px solid var(--border-dim); 
          border-radius: 8px;
        ">
          ${this.renderKeySlotsHtml(chest.keySequence, -1, rarityColor)}
        </div>

        <!-- START BANNER / ACTIVE STATUS -->
        <div id="lock-action-container">
          <button id="btn-start-decryption" class="sampo-btn primary" style="
            width: 100%; 
            padding: 12px 20px; 
            font-size: 13px; 
            letter-spacing: 1px;
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
            animation: pulseGlow 1.5s infinite alternate;
          ">
            🚀 PRESS [SPACEBAR] OR CLICK TO START DECRYPTION
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Bind Close Button
    document.getElementById('btn-chest-lock-close')?.addEventListener('click', () => this.close());

    // Bind Start Button
    document.getElementById('btn-start-decryption')?.addEventListener('click', () => this.startDecryption());

    // Key listeners (Handles Spacebar to start, Escape to exit, WASD for gameplay)
    this.bindKeyListeners();
  }

  private renderAttemptsHtml(attemptsLeft: number, maxAttempts: number): string {
    let html = '';
    for (let i = 0; i < maxAttempts; i++) {
      const isAvailable = i < attemptsLeft;
      const color = isAvailable ? '#10b981' : '#ef4444';
      const shadow = isAvailable ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none';
      html += `
        <span style="
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          width: 18px; 
          height: 18px; 
          border-radius: 50%; 
          background: ${isAvailable ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.2)'}; 
          border: 1.5px solid ${color}; 
          box-shadow: ${shadow};
          font-size: 10px;
          color: ${color};
          font-weight: bold;
        ">${isAvailable ? '●' : '✕'}</span>
      `;
    }
    return html;
  }

  private startDecryption() {
    if (this.isStarted || !this.currentChest) return;
    this.isStarted = true;
    this.currentIndex = 0;
    this.remainingTime = this.totalKeyTime;

    soundEngine.playRuneClick();

    const actionContainer = document.getElementById('lock-action-container');
    if (actionContainer) {
      actionContainer.innerHTML = `
        <div id="lock-feedback" style="
          min-height: 32px; 
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono); 
          font-size: 13px; 
          font-weight: 700; 
          color: var(--cyan-core);
          letter-spacing: 0.5px;
        ">
          PRESS <strong style="color:#fff; margin:0 5px;">[ ${this.currentChest.keySequence[0]} ]</strong> (1 / ${this.currentChest.keySequence.length})
        </div>
      `;
    }

    const timerLabel = document.getElementById('lock-timer-label');
    if (timerLabel) timerLabel.textContent = 'BUFFER EXPIRING:';

    this.updateSlotsDisplay();
    this.startTimer();
  }

  private renderKeySlotsHtml(sequence: DecryptionKey[], activeIdx: number, rarityColor: string): string {
    const arrowMap: Record<DecryptionKey, string> = {
      W: '⬆️',
      A: '⬅️',
      S: '⬇️',
      D: '➡️'
    };

    return sequence.map((key, idx) => {
      const isCompleted = activeIdx >= 0 && idx < activeIdx;
      const isCurrent = activeIdx >= 0 && idx === activeIdx;
      const isPreview = activeIdx < 0;

      let borderColor = 'rgba(255,255,255,0.12)';
      let bgColor = 'rgba(15, 23, 42, 0.6)';
      let textColor = '#64748b';
      let shadow = 'none';

      if (isCompleted) {
        borderColor = '#10b981';
        bgColor = 'rgba(16, 185, 129, 0.2)';
        textColor = '#10b981';
        shadow = '0 0 10px rgba(16, 185, 129, 0.4)';
      } else if (isCurrent) {
        borderColor = rarityColor;
        bgColor = `${rarityColor}25`;
        textColor = '#ffffff';
        shadow = `0 0 16px ${rarityColor}88`;
      } else if (isPreview) {
        borderColor = 'rgba(56, 189, 248, 0.25)';
        textColor = '#94a3b8';
      }

      return `
        <div class="lock-key-slot ${isCurrent ? 'active' : ''}" style="
          width: 54px; 
          height: 60px; 
          background: ${bgColor}; 
          border: 2px solid ${borderColor}; 
          border-radius: 6px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          gap: 2px; 
          box-shadow: ${shadow};
          transition: all 0.15s ease;
        ">
          <span style="font-size:16px;">${isCompleted ? '✓' : arrowMap[key]}</span>
          <span style="font-family:var(--font-mono); font-size:15px; font-weight:700; color:${textColor};">${key}</span>
        </div>
      `;
    }).join('');
  }

  private bindKeyListeners() {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.currentChest || this.isProcessing) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }

      // Spacebar starts the decryption
      if (!this.isStarted && (e.key === ' ' || e.code === 'Space')) {
        e.preventDefault();
        e.stopPropagation();
        this.startDecryption();
        return;
      }

      if (!this.isStarted) return;

      let inputKey: DecryptionKey | null = null;
      const k = e.key.toLowerCase();

      if (k === 'w' || e.key === 'ArrowUp') inputKey = 'W';
      else if (k === 'a' || e.key === 'ArrowLeft') inputKey = 'A';
      else if (k === 's' || e.key === 'ArrowDown') inputKey = 'S';
      else if (k === 'd' || e.key === 'ArrowRight') inputKey = 'D';

      if (inputKey) {
        e.preventDefault();
        e.stopPropagation();
        this.handleKeyInput(inputKey);
      }
    };

    window.addEventListener('keydown', this.keydownHandler, true);
  }

  private handleKeyInput(key: DecryptionKey) {
    if (!this.currentChest || !this.isStarted) return;

    const expected = this.currentChest.keySequence[this.currentIndex];

    if (key === expected) {
      // Correct key!
      soundEngine.playRuneClick();
      this.currentIndex++;
      this.remainingTime = this.totalKeyTime; // Reset timer for next step
      this.updateSlotsDisplay();

      const feedbackEl = document.getElementById('lock-feedback');
      if (feedbackEl) {
        if (this.currentIndex < this.currentChest.keySequence.length) {
          const nextKey = this.currentChest.keySequence[this.currentIndex];
          feedbackEl.style.color = '#10b981';
          feedbackEl.innerHTML = `CIPHER ALIGNED! NEXT: <strong style="color:#fff; margin:0 5px;">[ ${nextKey} ]</strong> (${this.currentIndex + 1} / ${this.currentChest.keySequence.length})`;
        } else {
          feedbackEl.style.color = '#10b981';
          feedbackEl.textContent = `FULL CIPHER ALIGNED (${this.currentChest.keySequence.length} / ${this.currentChest.keySequence.length})`;
        }
      }

      // Check if full sequence completed
      if (this.currentIndex >= this.currentChest.keySequence.length) {
        this.onSuccess();
      }
    } else {
      // Wrong key!
      this.onFailure('CIPHER MISMATCH');
    }
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const stepMs = 50;
    this.timerInterval = setInterval(() => {
      if (!this.currentChest || this.isProcessing || !this.isStarted) return;

      this.remainingTime -= stepMs / 1000;

      const fillEl = document.getElementById('lock-timer-fill');
      const textEl = document.getElementById('lock-timer-text');

      if (fillEl) {
        const pct = Math.max(0, (this.remainingTime / this.totalKeyTime) * 100);
        fillEl.style.width = `${pct}%`;
      }
      if (textEl) {
        textEl.textContent = `${Math.max(0, this.remainingTime).toFixed(1)}s`;
      }

      if (this.remainingTime <= 0) {
        this.onFailure('BUFFER TIMEOUT EXPIRED');
      }
    }, stepMs);
  }

  private updateSlotsDisplay() {
    if (!this.currentChest) return;

    const rarityColor = {
      common: '#94a3b8',
      augmented: '#38bdf8',
      runic: '#c084fc',
      masterwork: '#f59e0b',
      relic: '#ef4444'
    }[this.currentChest.rarity];

    const container = document.getElementById('lock-sequence-container');
    if (container) {
      container.innerHTML = this.renderKeySlotsHtml(
        this.currentChest.keySequence,
        this.isStarted ? this.currentIndex : -1,
        rarityColor
      );
    }
  }

  private onFailure(reason: string) {
    if (!this.currentChest) return;

    soundEngine.playHitImpact(false);
    this.currentChest.attemptsLeft--;
    this.currentIndex = 0;
    this.remainingTime = this.totalKeyTime;

    // Update attempts indicator
    const attemptsContainer = document.getElementById('lock-attempts-container');
    if (attemptsContainer) {
      attemptsContainer.innerHTML = this.renderAttemptsHtml(
        this.currentChest.attemptsLeft,
        this.currentChest.maxAttempts
      );
    }

    const card = document.getElementById('chest-lock-card');
    if (card) {
      card.style.animation = 'shakeCard 0.3s ease';
      setTimeout(() => { if (card) card.style.animation = ''; }, 300);
    }

    if (this.currentChest.attemptsLeft > 0) {
      const feedbackEl = document.getElementById('lock-feedback');
      if (feedbackEl) {
        feedbackEl.style.color = '#ef4444';
        feedbackEl.textContent = `${reason}! ${this.currentChest.attemptsLeft} ATTEMPT(S) REMAINING BEFORE SELF-DESTRUCT!`;
      }
      this.updateSlotsDisplay();
    } else {
      // Overload Failure -> Trigger Self Destruction Detonation!
      this.onDetonation();
    }
  }

  private onDetonation() {
    this.isProcessing = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    soundEngine.playExplosion();

    const card = document.getElementById('chest-lock-card');
    if (card) {
      card.style.borderColor = '#ef4444';
      card.style.boxShadow = '0 0 50px rgba(239, 68, 68, 0.9)';
      card.style.animation = 'shakeCard 0.4s ease';
    }

    const feedbackEl = document.getElementById('lock-feedback');
    if (feedbackEl) {
      feedbackEl.style.color = '#ef4444';
      feedbackEl.textContent = '💥 CRITICAL CORE OVERLOAD! VAULT SELF-DESTRUCTING...';
    }

    const chest = this.currentChest!;
    const damage = chest.selfDestruct();

    setTimeout(() => {
      if (this.onDetonateCallback) {
        this.onDetonateCallback(chest, damage);
      }
      this.close();
    }, 450);
  }

  private onSuccess() {
    this.isProcessing = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    soundEngine.playLevelUp();

    const feedbackEl = document.getElementById('lock-feedback');
    if (feedbackEl) {
      feedbackEl.style.color = '#f59e0b';
      feedbackEl.textContent = '⚡ VAULT DECRYPTED! DISPENSING LOOT...';
    }

    const chest = this.currentChest!;
    setTimeout(() => {
      if (this.onDecryptedCallback) {
        this.onDecryptedCallback(chest);
      }
      this.close();
    }, 600);
  }

  close() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler, true);
      this.keydownHandler = undefined;
    }
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    this.currentChest = null;
    this.isProcessing = false;
    this.isStarted = false;
  }
}
