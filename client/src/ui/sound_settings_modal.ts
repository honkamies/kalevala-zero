// Sound & Music Settings Modal UI for Sampo-Zero
// Master, Music & SFX volume sliders, Mute toggle, Jukebox & Track Browser

import { soundEngine, MUSIC_PLAYLIST, MusicTrackInfo, AudioSettings } from '../engine/audio';

export class SoundSettingsModalUI {
  private root: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private onCloseCallback?: () => void;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  isOpen(): boolean {
    return this.modalEl !== null;
  }

  show(onClose?: () => void) {
    this.close();
    this.onCloseCallback = onClose;
    this.render();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
      this.modalEl = null;
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  private render() {
    const settings = soundEngine.getSettings();
    const currentTrack = soundEngine.getCurrentTrack();
    const isPlaying = soundEngine.isMusicPlaying();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'sound-settings-modal';
    this.modalEl.className = 'interactive';
    this.modalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 8, 16, 0.88);
      backdrop-filter: blur(14px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 11000;
      animation: fadeIn 0.2s ease;
      pointer-events: auto;
    `;

    this.modalEl.innerHTML = `
      <div style="
        width: 680px; 
        max-width: 95vw; 
        max-height: 90vh;
        overflow-y: auto;
        background: rgba(13, 18, 29, 0.98); 
        border: 2px solid var(--border-glow); 
        border-radius: 10px; 
        padding: 24px 28px; 
        box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(56, 189, 248, 0.25);
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- HEADER -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">🎚️</span>
            <div>
              <div style="font-family:var(--font-rune); font-size:20px; color:var(--gold-runic); letter-spacing:2px;">
                AUDIO PROTOCOLS & VOLUME
              </div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                Master Acoustics, Music Jukebox & Sampled SFX Channels
              </div>
            </div>
          </div>

          <button id="btn-sound-modal-close" style="
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

        <!-- VOLUME SLIDERS GRID -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 18px; display:flex; flex-direction:column; gap:16px;">
          
          <!-- Master Volume -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-family:var(--font-mono);">
              <span style="color:#fff; font-weight:700;">🔊 MASTER VOLUME</span>
              <span id="txt-val-master" style="color:var(--cyan-core); font-weight:700;">${Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input type="range" id="slider-vol-master" min="0" max="100" value="${Math.round(settings.masterVolume * 100)}" class="sampo-volume-slider" style="width:100%; cursor:pointer;" />
          </div>

          <!-- Music Volume -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-family:var(--font-mono);">
              <span style="color:#fff; font-weight:700;">🎵 BACKGROUND MUSIC</span>
              <span id="txt-val-music" style="color:var(--cyan-core); font-weight:700;">${Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input type="range" id="slider-vol-music" min="0" max="100" value="${Math.round(settings.musicVolume * 100)}" class="sampo-volume-slider" style="width:100%; cursor:pointer;" />
          </div>

          <!-- SFX Volume -->
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-family:var(--font-mono);">
              <span style="color:#fff; font-weight:700;">💥 SOUND EFFECTS (SFX)</span>
              <span id="txt-val-sfx" style="color:var(--cyan-core); font-weight:700;">${Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input type="range" id="slider-vol-sfx" min="0" max="100" value="${Math.round(settings.sfxVolume * 100)}" class="sampo-volume-slider" style="width:100%; cursor:pointer;" />
          </div>

          <!-- Quick Actions: Mute & Shuffle Toggle -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:12px; margin-top:2px;">
            <button id="btn-sound-mute-toggle" class="sampo-btn ${settings.muted ? 'gold' : ''}" style="padding:6px 16px; font-size:11px;">
              ${settings.muted ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL'}
            </button>

            <button id="btn-sound-shuffle-toggle" class="sampo-btn ${settings.shuffleMode ? 'primary' : ''}" style="padding:6px 16px; font-size:11px;">
              ${settings.shuffleMode ? '🔀 SHUFFLE: RANDOM ALL' : '🗺️ SHUFFLE: BIOME CONTEXT'}
            </button>
          </div>
        </div>

        <!-- JUKEBOX & CURRENT TRACK PLAYER -->
        <div style="background: rgba(9, 14, 23, 0.75); border: 1px solid var(--border-dim); border-radius: 8px; padding: 18px; display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); font-weight:700; display:flex; align-items:center; gap:6px;">
              <span>📻</span> LIVE AMBIENT JUKEBOX
            </div>
            <span style="font-size:10px; color:var(--text-muted);">${MUSIC_PLAYLIST.length} Production Tracks</span>
          </div>

          <!-- Active Track Banner -->
          <div style="background:rgba(15, 23, 42, 0.85); border:1px solid var(--border-glow); border-radius:6px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px; overflow:hidden;">
              <div style="width:36px; height:36px; border-radius:6px; background:linear-gradient(135deg, #0284c7, #1e1b4b); display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 0 10px rgba(56, 189, 248, 0.3);">
                ${isPlaying ? '🎵' : '⏸️'}
              </div>
              <div style="overflow:hidden;">
                <div id="sound-track-title" style="font-family:var(--font-cyber); font-size:14px; font-weight:700; color:#fff; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                  ${currentTrack ? currentTrack.title : 'Atmospheric Silence'}
                </div>
                <div id="sound-track-artist" style="font-size:11px; color:var(--text-muted);">
                  ${currentTrack ? `${currentTrack.artist} • [${currentTrack.tags.join(', ')}]` : 'Select or start a track below'}
                </div>
              </div>
            </div>

            <!-- Playback controls -->
            <div style="display:flex; gap:6px;">
              <button id="btn-sound-prev" class="sampo-btn" style="padding:6px 10px; font-size:11px;" title="Previous Track">⏮️</button>
              <button id="btn-sound-play-pause" class="sampo-btn primary" style="padding:6px 12px; font-size:11px;" title="Play / Pause">
                ${isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
              </button>
              <button id="btn-sound-next" class="sampo-btn" style="padding:6px 10px; font-size:11px;" title="Next Track">⏭️</button>
            </div>
          </div>

          <!-- Track Selector Dropdown / Quick Switch -->
          <div style="display:flex; gap:10px; align-items:center; margin-top:2px;">
            <span style="font-size:11px; font-family:var(--font-mono); color:var(--text-muted); white-space:nowrap;">SELECT TRACK:</span>
            <select id="select-sound-track" style="
              flex: 1; 
              background: #0f172a; 
              color: var(--text-main); 
              border: 1px solid var(--border-glow); 
              border-radius: 4px; 
              padding: 6px 10px; 
              font-family: var(--font-cyber); 
              font-size: 12px;
              cursor: pointer;
            ">
              ${MUSIC_PLAYLIST.map(track => `
                <option value="${track.id}" ${currentTrack?.id === track.id ? 'selected' : ''}>
                  ${track.title} - ${track.artist} (${track.tags[0]})
                </option>
              `).join('')}
            </select>
            <button id="btn-sound-load-selected" class="sampo-btn" style="padding:6px 12px; font-size:11px;">
              ▶ PLAY
            </button>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="display:flex; justify-content:flex-end; border-top:1px solid var(--border-dim); padding-top:12px;">
          <button id="btn-sound-modal-done" class="sampo-btn primary" style="padding:8px 24px; font-size:12px;">
            ✓ DONE
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(this.modalEl);
    this.bindEvents();
  }

  private bindEvents() {
    if (!this.modalEl) return;

    // Close
    this.modalEl.querySelector('#btn-sound-modal-close')?.addEventListener('click', () => this.close());
    this.modalEl.querySelector('#btn-sound-modal-done')?.addEventListener('click', () => this.close());

    // Volume Sliders
    const sliderMaster = this.modalEl.querySelector('#slider-vol-master') as HTMLInputElement;
    const txtMaster = this.modalEl.querySelector('#txt-val-master');
    sliderMaster?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setMasterVolume(val);
      if (txtMaster) txtMaster.textContent = `${Math.round(val * 100)}%`;
    });

    const sliderMusic = this.modalEl.querySelector('#slider-vol-music') as HTMLInputElement;
    const txtMusic = this.modalEl.querySelector('#txt-val-music');
    sliderMusic?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setMusicVolume(val);
      if (txtMusic) txtMusic.textContent = `${Math.round(val * 100)}%`;
    });

    const sliderSfx = this.modalEl.querySelector('#slider-vol-sfx') as HTMLInputElement;
    const txtSfx = this.modalEl.querySelector('#txt-val-sfx');
    sliderSfx?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) / 100;
      soundEngine.setSfxVolume(val);
      if (txtSfx) txtSfx.textContent = `${Math.round(val * 100)}%`;
    });
    sliderSfx?.addEventListener('change', () => {
      // Play a short click SFX to test volume
      soundEngine.playRuneClick();
    });

    // Mute Toggle
    const btnMute = this.modalEl.querySelector('#btn-sound-mute-toggle');
    btnMute?.addEventListener('click', () => {
      const muted = soundEngine.toggleMute();
      btnMute.textContent = muted ? '🔇 UNMUTE ALL' : '🔊 MUTE ALL';
      if (muted) btnMute.classList.add('gold');
      else btnMute.classList.remove('gold');
      const hudMute = document.getElementById('btn-toggle-mute');
      if (hudMute) hudMute.textContent = muted ? '🔇' : '🔊';
    });

    // Shuffle Toggle
    const btnShuffle = this.modalEl.querySelector('#btn-sound-shuffle-toggle');
    btnShuffle?.addEventListener('click', () => {
      const isShuffle = soundEngine.toggleShuffle();
      btnShuffle.textContent = isShuffle ? '🔀 SHUFFLE: RANDOM ALL' : '🗺️ SHUFFLE: BIOME CONTEXT';
      if (isShuffle) btnShuffle.classList.add('primary');
      else btnShuffle.classList.remove('primary');
    });

    // Playback buttons
    const btnPlayPause = this.modalEl.querySelector('#btn-sound-play-pause');
    btnPlayPause?.addEventListener('click', () => {
      const playing = soundEngine.togglePauseMusic();
      btnPlayPause.textContent = playing ? '⏸️ PAUSE' : '▶️ PLAY';
      this.updateTrackDisplay();
    });

    this.modalEl.querySelector('#btn-sound-next')?.addEventListener('click', () => {
      soundEngine.playNextTrack();
      this.updateTrackDisplay();
    });

    this.modalEl.querySelector('#btn-sound-prev')?.addEventListener('click', () => {
      soundEngine.playPreviousTrack();
      this.updateTrackDisplay();
    });

    // Track selection
    const selectTrack = this.modalEl.querySelector('#select-sound-track') as HTMLSelectElement;
    this.modalEl.querySelector('#btn-sound-load-selected')?.addEventListener('click', () => {
      if (selectTrack && selectTrack.value) {
        soundEngine.playTrackById(selectTrack.value);
        this.updateTrackDisplay();
      }
    });

    // Listen to live track changes while modal is open
    soundEngine.addTrackChangeListener(() => {
      if (this.isOpen()) {
        this.updateTrackDisplay();
      }
    });
  }

  private updateTrackDisplay() {
    if (!this.modalEl) return;
    const currentTrack = soundEngine.getCurrentTrack();
    const isPlaying = soundEngine.isMusicPlaying();

    const titleEl = this.modalEl.querySelector('#sound-track-title');
    const artistEl = this.modalEl.querySelector('#sound-track-artist');
    const playPauseBtn = this.modalEl.querySelector('#btn-sound-play-pause');
    const selectEl = this.modalEl.querySelector('#select-sound-track') as HTMLSelectElement;

    if (titleEl && currentTrack) titleEl.textContent = currentTrack.title;
    if (artistEl && currentTrack) artistEl.textContent = `${currentTrack.artist} • [${currentTrack.tags.join(', ')}]`;
    if (playPauseBtn) playPauseBtn.textContent = isPlaying ? '⏸️ PAUSE' : '▶️ PLAY';
    if (selectEl && currentTrack) selectEl.value = currentTrack.id;
  }
}
