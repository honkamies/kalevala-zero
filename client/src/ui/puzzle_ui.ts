// Cryptographic Magic Symbol Protocol Decoder Modal UI
// Reconstructs Ancient Kalevala Cipher Shards (*Loitsumerkit*) collected from Symbol-Carrier enemies

import { MagicSymbolPuzzlePillar } from '../entities/puzzle';
import { soundEngine } from '../engine/audio';

export class PuzzleUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private currentPuzzle: MagicSymbolPuzzlePillar | null = null;
  private selectedSequence: string[] = [];
  private onSolvedCallback?: () => void;
  private isAutoAligning: boolean = false;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.modalEl !== null;
  }

  open(puzzle: MagicSymbolPuzzlePillar, onSolved: () => void, bossName?: string) {
    this.close();
    this.currentPuzzle = puzzle;
    this.onSolvedCallback = onSolved;
    this.selectedSequence = [];
    this.isAutoAligning = false;

    this.modalEl = document.createElement('div');
    this.modalEl.className = 'sampo-modal interactive';
    this.modalEl.style.cssText = `
      width: 720px;
      max-width: 95vw;
      height: 640px;
      max-height: 92vh;
      background: linear-gradient(180deg, rgba(13, 18, 29, 0.98) 0%, rgba(8, 12, 20, 0.98) 100%);
      border: 2px solid var(--cyan-core);
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: fadeIn 0.3s ease-out;
    `;

    const collectedCount = puzzle.getCollectedShardsCount();
    const isAllCollected = puzzle.isAllShardsCollected();
    const shards = puzzle.puzzleData.shards;
    const romanNumerals = ['I', 'II', 'III', 'IV'];
    const targetBossTitle = bossName ? bossName.toUpperCase() : 'GUARDIAN';

    this.modalEl.innerHTML = `
      <div class="sampo-modal-header" style="background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%); border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding: 12px 20px;">
        <div class="sampo-modal-title" style="display:flex; align-items:center; gap:10px; color:var(--gold-runic); font-size:16px;">
          <span>🔮</span>
          <span>MAGIC SYMBOL PROTOCOL DECODER // ${puzzle.verseTitle.toUpperCase()}</span>
        </div>
        <button class="sampo-modal-close" id="puz-close-btn" style="color:#94a3b8; font-size:24px; cursor:pointer;">&times;</button>
      </div>

      <div class="sampo-modal-body" style="padding: 16px 22px; overflow-y: auto; overflow-x: hidden; display:flex; flex-direction:column; gap:12px; flex:1; box-sizing:border-box;">
        <!-- 1. Kalevala Incantation Lore Card -->
        <div style="
          background: rgba(15, 23, 42, 0.7);
          border-left: 4px solid var(--gold-runic);
          border-radius: 6px;
          padding: 10px 16px;
          font-family: var(--font-rune);
          font-size: 12px;
          color: #fef08a;
          line-height: 1.5;
          box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
        ">
          ${puzzle.puzzleData.versePoem.replace(/\n/g, '<br/>')}
        </div>

        <!-- 2. Shard Decryption Progress Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.4); padding:8px 14px; border-radius:6px; border:1px solid rgba(56,189,248,0.2);">
          <div style="font-family:var(--font-mono); font-size:11.5px; letter-spacing:1.2px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:8px;">
            <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${isAllCollected ? '#10b981' : '#f59e0b'}; box-shadow:0 0 8px ${isAllCollected ? '#10b981' : '#f59e0b'};"></span>
            <span>MAGIC SYMBOLS RECOVERED:</span>
            <strong style="color:#ffffff; font-size:13px;">${collectedCount} / 4</strong>
          </div>
          <div style="font-family:var(--font-mono); font-size:10.5px; color:${isAllCollected ? '#10b981' : '#cbd5e1'};">
            ${isAllCollected ? `⚡ CIPHER DECRYPTED // READY TO AWAKEN ${targetBossTitle}` : '⚠️ EXPLORE REALM & SLAY SYMBOL-CARRIERS'}
          </div>
        </div>

        <!-- 3. 4-Slot Holographic Shard Reconstruction Chamber (Guaranteed 4 Columns) -->
        <div style="display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; width:100%; box-sizing:border-box;">
          ${shards.map((shard, idx) => {
            const isKnown = shard.isCollected;
            return `
              <div class="cipher-shard-socket ${isKnown ? 'unlocked' : 'locked'}" style="
                min-width: 0;
                width: 100%;
                box-sizing: border-box;
                background: ${isKnown ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))' : 'rgba(8, 12, 20, 0.8)'};
                border: 1.5px solid ${isKnown ? 'var(--gold-runic)' : 'rgba(255, 255, 255, 0.12)'};
                border-radius: 6px;
                padding: 8px 6px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                box-shadow: ${isKnown ? '0 0 14px rgba(245, 158, 11, 0.25)' : 'none'};
                position: relative;
                transition: all 0.2s ease;
                overflow: hidden;
              ">
                <div style="display:flex; justify-content:space-between; width:100%; font-family:var(--font-mono); font-size:9.5px; font-weight:700; color:${isKnown ? 'var(--gold-runic)' : '#64748b'}; box-sizing:border-box;">
                  <span>POS ${romanNumerals[idx]}</span>
                  <span>${isKnown ? '✓' : '🔒'}</span>
                </div>

                <div style="
                  width: 42px;
                  height: 42px;
                  border-radius: 6px;
                  background: ${isKnown ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.6)'};
                  border: 1px dashed ${isKnown ? '#f59e0b' : '#334155'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: ${isKnown ? '24px' : '18px'};
                  color: ${isKnown ? '#ffffff' : '#475569'};
                  text-shadow: ${isKnown ? '0 0 10px rgba(245, 158, 11, 0.8)' : 'none'};
                  margin: 2px 0;
                  flex-shrink: 0;
                ">
                  ${isKnown ? shard.glyph : '?'}
                </div>

                <div style="font-family:var(--font-rune); font-size:10.5px; font-weight:700; color:${isKnown ? '#ffffff' : '#64748b'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; width:100%; text-align:center;">
                  ${isKnown ? shard.name : 'Unknown'}
                </div>

                <div style="font-size:9px; color:${isKnown ? '#cbd5e1' : '#475569'}; font-style:italic; line-height:1.2; height:24px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; width:100%; word-break:break-word; text-align:center;">
                  ${isKnown ? shard.verseHint : 'Defeat Symbol-Carrier'}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 4. Quick Auto-Sync Overdrive Button Slot (Fixed Height) -->
        <div style="min-height:38px; height:38px; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
          ${isAllCollected ? `
            <button id="btn-auto-align" class="sampo-btn gold" style="
              width: 100%;
              height: 100%;
              padding: 6px 20px;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 1.5px;
              box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
              cursor: pointer;
              pointer-events: auto;
            ">
              ⚡ INITIATE HARMONIC PROTOCOL ➔ AWAKEN ${targetBossTitle}
            </button>
          ` : `
            <div style="font-family:var(--font-mono); font-size:10.5px; color:#64748b; letter-spacing:1px; background:rgba(0,0,0,0.25); border:1px dashed rgba(255,255,255,0.08); border-radius:4px; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
              🔒 RECOVER ALL 4 MAGIC SYMBOLS TO UNLOCK INSTANT HARMONIC OVERDRIVE
            </div>
          `}
        </div>

        <!-- 5. Manual Harmonic Matrix Dials Grid -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:10.5px; color:var(--cyan-core); font-weight:700; letter-spacing:1px;">
              CLICK MAGIC SYMBOLS IN HARMONIC SEQUENCE (POS I ➔ IV):
            </div>
            <div id="puzzle-progress-tracker" style="font-family:var(--font-mono); font-size:10.5px; color:var(--gold-runic); font-weight:700;">
              RESONANCE: 0 / 4
            </div>
          </div>

          <div class="puzzle-matrix-grid" id="puzzle-matrix-slots" style="
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 8px;
            background: rgba(0, 0, 0, 0.4);
            padding: 10px;
            border: 1px solid rgba(56, 189, 248, 0.2);
            border-radius: 6px;
            width: 100%;
            box-sizing: border-box;
          ">
            ${puzzle.puzzleData.gridGlyphs.map((glyph, idx) => {
              const isDiscovered = puzzle.isGlyphCollected(glyph);
              return `
                <div class="rune-tile ${isDiscovered ? 'discovered' : ''}" data-glyph="${glyph}" data-idx="${idx}" style="
                  height: 48px;
                  min-width: 0;
                  box-sizing: border-box;
                  background: ${isDiscovered ? 'rgba(15, 23, 42, 0.9)' : 'rgba(9, 14, 23, 0.8)'};
                  border: 1.5px solid ${isDiscovered ? 'var(--gold-runic)' : 'var(--border-dim)'};
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 22px;
                  color: ${isDiscovered ? '#ffffff' : 'var(--text-muted)'};
                  cursor: pointer;
                  transition: all 0.15s ease;
                  box-shadow: ${isDiscovered ? '0 0 8px rgba(245, 158, 11, 0.25)' : 'none'};
                ">
                  <span>${glyph}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 6. Feedback / Status Display (Fixed Height) -->
        <div id="puzzle-feedback" style="
          height: 24px;
          min-height: 24px;
          max-height: 24px;
          overflow: hidden;
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 700;
          color: var(--gold-runic);
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${isAllCollected ? 'All magic symbol shards assembled. Ready for synchronization.' : 'Decipher the sequence using recovered symbols or intuitive harmonic resonance.'}
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);

    // Bind Close
    document.getElementById('puz-close-btn')?.addEventListener('click', () => this.close());

    // Bind Auto-Align Button
    document.getElementById('btn-auto-align')?.addEventListener('click', () => {
      this.executeAutoAlign();
    });

    // Bind Manual Tile Clicks
    const tiles = this.modalEl.querySelectorAll('.rune-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', (e) => {
        if (this.isAutoAligning) return;
        const glyph = (e.currentTarget as HTMLElement).getAttribute('data-glyph') || '';
        this.handleGlyphClick(glyph, e.currentTarget as HTMLElement);
      });
    });
  }

  private handleGlyphClick(glyph: string, el: HTMLElement) {
    if (!this.currentPuzzle || this.currentPuzzle.isSolved) return;

    const feedbackEl = document.getElementById('puzzle-feedback');
    const trackerEl = document.getElementById('puzzle-progress-tracker');
    const targetIdx = this.selectedSequence.length;
    const expected = this.currentPuzzle.puzzleData.solutionSequence[targetIdx];

    if (glyph === expected) {
      this.selectedSequence.push(glyph);
      soundEngine.playRunicHarmonicChime(targetIdx);
      el.classList.add('matched');
      el.style.borderColor = '#10b981';
      el.style.backgroundColor = 'rgba(16, 185, 129, 0.25)';
      el.style.color = '#10b981';
      el.style.boxShadow = '0 0 16px rgba(16, 185, 129, 0.6)';

      if (trackerEl) {
        trackerEl.textContent = `RESONANCE: ${this.selectedSequence.length} / ${this.currentPuzzle.puzzleData.solutionSequence.length}`;
      }

      if (feedbackEl) {
        feedbackEl.style.color = '#10b981';
        feedbackEl.textContent = `⚡ HARMONIC RESONANCE ALIGNED [POS ${['I', 'II', 'III', 'IV'][targetIdx]}]!`;
      }

      // Check if complete!
      if (this.selectedSequence.length === this.currentPuzzle.puzzleData.solutionSequence.length) {
        this.completeDecryption(feedbackEl);
      }
    } else {
      // Sequence error
      soundEngine.playHitImpact(false);
      this.selectedSequence = [];
      if (feedbackEl) {
        feedbackEl.style.color = '#ef4444';
        feedbackEl.textContent = '❌ SEQUENCE MISMATCH! Harmonic frequency collapsed. Resetting matrix dials.';
      }
      if (trackerEl) {
        trackerEl.textContent = 'RESONANCE: 0 / 4';
      }

      const allTiles = this.modalEl?.querySelectorAll('.rune-tile');
      allTiles?.forEach(t => {
        const hTile = t as HTMLElement;
        hTile.classList.remove('matched');
        hTile.style.borderColor = '';
        hTile.style.backgroundColor = '';
        hTile.style.color = '';
        hTile.style.boxShadow = '';
      });
    }
  }

  // Execute cinematic auto-alignment when all 4 shards are present
  private executeAutoAlign() {
    if (!this.currentPuzzle || this.currentPuzzle.isSolved || this.isAutoAligning) return;
    this.isAutoAligning = true;
    this.selectedSequence = [];

    const feedbackEl = document.getElementById('puzzle-feedback');
    const trackerEl = document.getElementById('puzzle-progress-tracker');
    const solution = this.currentPuzzle.puzzleData.solutionSequence;

    const allTiles = this.modalEl?.querySelectorAll('.rune-tile');
    allTiles?.forEach(t => {
      const hTile = t as HTMLElement;
      hTile.classList.remove('matched');
      hTile.style.borderColor = '';
      hTile.style.backgroundColor = '';
      hTile.style.color = '';
      hTile.style.boxShadow = '';
    });

    solution.forEach((glyph, step) => {
      setTimeout(() => {
        if (!this.modalEl || !this.currentPuzzle) return;
        soundEngine.playRunicHarmonicChime(step);

        const tileEl = this.modalEl.querySelector(`.rune-tile[data-glyph="${glyph}"]`) as HTMLElement;
        if (tileEl) {
          tileEl.classList.add('matched');
          tileEl.style.borderColor = '#10b981';
          tileEl.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
          tileEl.style.color = '#10b981';
          tileEl.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.8)';
        }

        if (trackerEl) {
          trackerEl.textContent = `RESONANCE: ${step + 1} / 4`;
        }
        if (feedbackEl) {
          feedbackEl.style.color = '#10b981';
          feedbackEl.textContent = `⚡ SYNCHRONIZING HARMONIC FREQUENCY [${glyph}] (POS ${['I', 'II', 'III', 'IV'][step]})…`;
        }

        if (step === solution.length - 1) {
          this.selectedSequence = [...solution];
          this.completeDecryption(feedbackEl);
        }
      }, (step + 1) * 320);
    });
  }

  private completeDecryption(feedbackEl: HTMLElement | null) {
    if (!this.currentPuzzle) return;
    this.currentPuzzle.solve();
    soundEngine.playRunicProtocolUnlocked();

    if (feedbackEl) {
      feedbackEl.style.color = '#f59e0b';
      feedbackEl.innerHTML = '👑 <strong>MAGIC SYMBOL MATRIX FULLY SYNCHRONIZED! ALL SECTOR VAULTS UNSEALED.</strong>';
    }

    if (this.onSolvedCallback) {
      this.onSolvedCallback();
    }

    setTimeout(() => this.close(), 1600);
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
    }
    this.currentPuzzle = null;
    this.isAutoAligning = false;
  }
}
