// ============================================================================
// Sample-Based Audio Engine & Music Jukebox for Sampo-Zero
// 100% Production Sampled Audio (SFX & Ambient Music Streams)
// Integrated Volume System, Audio Persistence & Seamless Random Shuffle
// ============================================================================

export interface MusicTrackInfo {
  id: string;
  title: string;
  artist: string;
  url: string;
  tags: string[];
}

export interface AudioSettings {
  masterVolume: number; // 0.0 to 1.0
  musicVolume: number;  // 0.0 to 1.0
  sfxVolume: number;    // 0.0 to 1.0
  muted: boolean;
  shuffleMode: boolean; // True: random shuffle across entire library; False: biome contextual
}

const STORAGE_KEY = 'sampo_zero_audio_settings_v2';

export const MUSIC_PLAYLIST: MusicTrackInfo[] = [
  {
    id: 'fantasy_ambient',
    title: 'Fantasy Ambient Odyssey',
    artist: 'Leberch',
    url: './audio/music/leberch-fantasy-ambient-586801.mp3',
    tags: ['ilman_luominen', 'genesis', 'mythic', 'fantasy']
  },
  {
    id: 'ambient_soundscapes',
    title: 'Boreal Ambient Soundscapes',
    artist: 'Atlas Audio',
    url: './audio/music/atlasaudio-ambient-soundscapes-511893.mp3',
    tags: ['vainola', 'exploration', 'nature', 'earth']
  },
  {
    id: 'drone_ambient',
    title: 'Sub-Zero Cryo Drone',
    artist: 'Atlas Audio',
    url: './audio/music/atlasaudio-drone-ambient-518685.mp3',
    tags: ['pohjola', 'frost', 'drone', 'isolation']
  },
  {
    id: 'ambient_horror',
    title: 'River of Kalman Horror',
    artist: 'Leberch',
    url: './audio/music/leberch-ambient-horror-518292.mp3',
    tags: ['tuonela', 'death', 'underworld', 'horror']
  },
  {
    id: 'cyberpunk_drone',
    title: 'Molten Cyberpunk Drone',
    artist: 'Leberch',
    url: './audio/music/leberch-cyberpunk-drone-375259.mp3',
    tags: ['alinen', 'magma', 'cyberpunk', 'industrial']
  },
  {
    id: 'space_ambient',
    title: 'Celestial Stratosphere',
    artist: 'Leberch',
    url: './audio/music/leberch-space-ambient-509783.mp3',
    tags: ['ylinen', 'celestial', 'space', 'ether']
  },
  {
    id: 'dystopian_ambient',
    title: 'Void Dystopian Singularity',
    artist: 'Leberch',
    url: './audio/music/leberch-dystopian-ambient-520165.mp3',
    tags: ['void_dimension', 'dystopian', 'singularity']
  },
  {
    id: 'everything_dead_dark',
    title: 'Everything is Dead (Dark Ambient)',
    artist: 'Everything is Dead',
    url: './audio/music/everything_is_dead-dark-scary-ambient-549981.mp3',
    tags: ['collapse', 'boss', 'tension', 'cataclysm']
  },
  {
    id: 'mirostar_drone',
    title: 'Deep Cosmological Drone',
    artist: 'Mirostar',
    url: './audio/music/mirostar-drone-ambient-561599.mp3',
    tags: ['title', 'menu', 'cosmic', 'drone']
  },
  {
    id: 'quietphase_slow',
    title: 'Slow Ambient Drift',
    artist: 'Quietphase',
    url: './audio/music/quietphase-ambient-slow-music-490873.mp3',
    tags: ['exploration', 'calm', 'meditative']
  },
  {
    id: 'quietphase_deep',
    title: 'Ethereal Slow Atmosphere',
    artist: 'Quietphase',
    url: './audio/music/quietphase-slow-ambient-490875.mp3',
    tags: ['exploration', 'atmospheric', 'drift']
  }
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Settings (Defaults: Master 30%, Background Music 40%, Effects 50%)
  private settings: AudioSettings = {
    masterVolume: 0.30,
    musicVolume: 0.40,
    sfxVolume: 0.50,
    muted: false,
    shuffleMode: true
  };

  // SFX Cache
  private sampleCache: Map<string, AudioBuffer[]> = new Map();
  private isPreloaded: boolean = false;

  // Music Streaming Deck System (HTML5 Dual Deck for Zero-Lag Instant Streaming & Smooth Crossfades)
  private deckA: HTMLAudioElement | null = null;
  private deckB: HTMLAudioElement | null = null;
  private activeDeck: 'A' | 'B' = 'A';
  private currentTrack: MusicTrackInfo | null = null;
  private isMusicPlayingState: boolean = false;
  private currentBiome: string = 'vainola';
  private crossfadeInterval: any = null;
  private playHistory: string[] = [];

  // Callbacks
  private trackChangeListeners: ((track: MusicTrackInfo | null, isPlaying: boolean) => void)[] = [];
  private settingsChangeListeners: ((settings: AudioSettings) => void)[] = [];

  // ==========================================
  // SFX MANIFEST
  // Real recorded .wav and .ogg audio assets
  // ==========================================
  private readonly SAMPLE_MANIFEST: Record<string, string[]> = {
    'weapons/plasma_shot': [
      './audio/sfx/weapons/plasma_shot_1.wav',
      './audio/sfx/weapons/plasma_shot_2.wav',
      './audio/sfx/weapons/plasma_shot_3.wav'
    ],
    'weapons/melee_swing': [
      './audio/sfx/weapons/melee_swing_1.wav',
      './audio/sfx/weapons/melee_swing_2.wav',
      './audio/sfx/weapons/knife_slice_1.ogg',
      './audio/sfx/weapons/knife_slice_2.ogg',
      './audio/sfx/weapons/chop_1.ogg'
    ],
    'weapons/dodge_jet': [
      './audio/sfx/weapons/dodge_jet_1.wav',
      './audio/sfx/weapons/dodge_jet_2.wav',
      './audio/sfx/weapons/dodge_cloth_1.ogg',
      './audio/sfx/weapons/dodge_cloth_2.ogg',
      './audio/sfx/weapons/dodge_cloth_3.ogg'
    ],
    'impacts/flesh_impact': [
      './audio/sfx/impacts/flesh_impact_1.wav',
      './audio/sfx/impacts/flesh_impact_2.wav',
      './audio/sfx/impacts/flesh_impact_3.wav',
      './audio/sfx/impacts/gore_explosion_1.wav'
    ],
    'impacts/shield_deflect': [
      './audio/sfx/impacts/shield_deflect_1.wav',
      './audio/sfx/impacts/shield_deflect_2.wav',
      './audio/sfx/impacts/shield_metal_1.ogg',
      './audio/sfx/impacts/shield_metal_2.ogg',
      './audio/sfx/impacts/metal_click.ogg'
    ],
    'impacts/heavy_explosion': [
      './audio/sfx/impacts/heavy_explosion_1.wav',
      './audio/sfx/impacts/heavy_explosion_2.wav',
      './audio/sfx/impacts/gore_explosion_2.wav'
    ],
    'impacts/gore_explosion': [
      './audio/sfx/impacts/gore_explosion_1.wav',
      './audio/sfx/impacts/gore_explosion_2.wav'
    ],
    'impacts/enemy_death': [
      './audio/sfx/impacts/gore_explosion_1.wav',
      './audio/sfx/impacts/gore_explosion_2.wav',
      './audio/sfx/impacts/heavy_explosion_1.wav',
      './audio/sfx/impacts/flesh_impact_3.wav'
    ],
    'monsters/monster_plasma': [
      './audio/sfx/monsters/monster_plasma_1.wav',
      './audio/sfx/monsters/monster_plasma_2.wav',
      './audio/sfx/weapons/plasma_shot_2.wav'
    ],
    'monsters/void_skull': [
      './audio/sfx/monsters/void_skull_1.wav',
      './audio/sfx/monsters/void_skull_2.wav',
      './audio/sfx/weapons/plasma_shot_1.wav',
      './audio/sfx/weapons/plasma_shot_3.wav'
    ],
    'monsters/boss_roar': [
      './audio/sfx/monsters/boss_roar_1.wav'
    ],
    'monsters/boss_heart_beat': [
      './audio/sfx/monsters/boss_heart_beat_1.wav'
    ],
    'environment/reality_tear': [
      './audio/sfx/environment/reality_tear_1.wav'
    ],
    'environment/portal_warp': [
      './audio/sfx/environment/portal_warp_1.wav'
    ],
    'ui/scrap_pickup': [
      './audio/sfx/ui/scrap_pickup_1.wav',
      './audio/sfx/ui/scrap_pickup_2.wav',
      './audio/sfx/ui/scrap_pickup_3.wav'
    ],
    'ui/loot_legendary': [
      './audio/sfx/ui/loot_legendary_1.wav',
      './audio/sfx/environment/portal_warp_1.wav'
    ],
    'ui/button_click': [
      './audio/sfx/ui/button_click_1.wav',
      './audio/sfx/ui/kenney_click_1.wav',
      './audio/sfx/ui/kenney_click_2.wav',
      './audio/sfx/ui/kenney_click_3.wav',
      './audio/sfx/ui/kenney_switch_1.wav',
      './audio/sfx/ui/kenney_switch_2.wav'
    ]
  };

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.resume();
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
    }
  }

  // ==========================================
  // INITIALIZATION & AUDIO CONTEXT SETUP
  // ==========================================

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      // Master Dynamics Compressor to prevent clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.updateGains();

      this.sfxGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.initMusicDecks();
      this.preloadAllSamples();
    } catch (e) {
      console.warn('Web Audio API failed to initialize:', e);
    }
  }

  private initMusicDecks() {
    if (this.deckA && this.deckB) return;

    this.deckA = new Audio();
    this.deckB = new Audio();

    this.deckA.preload = 'auto';
    this.deckB.preload = 'auto';

    // When a track naturally ends, auto-play next track
    this.deckA.addEventListener('ended', () => this.handleTrackEnded('A'));
    this.deckB.addEventListener('ended', () => this.handleTrackEnded('B'));

    // Handle unexpected playback error
    this.deckA.addEventListener('error', (e) => console.warn('[Music Deck A error]', e));
    this.deckB.addEventListener('error', (e) => console.warn('[Music Deck B error]', e));
  }

  private handleTrackEnded(deck: 'A' | 'B') {
    if (this.activeDeck === deck && this.isMusicPlayingState) {
      this.playNextTrack();
    }
  }

  public async preloadAllSamples(): Promise<void> {
    if (this.isPreloaded) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const promises: Promise<void>[] = [];

    for (const [key, urls] of Object.entries(this.SAMPLE_MANIFEST)) {
      const bufferList: AudioBuffer[] = [];
      this.sampleCache.set(key, bufferList);

      for (const url of urls) {
        promises.push(
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            })
            .then(arrayBuffer => this.ctx!.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
              bufferList.push(audioBuffer);
            })
            .catch(() => {
              // Ignore missing variants
            })
        );
      }
    }

    try {
      await Promise.all(promises);
      this.isPreloaded = true;
    } catch (e) {
      // Preloading done
    }
  }

  resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ==========================================
  // SETTINGS & VOLUME CONTROLS
  // ==========================================

  private loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (e) {}
  }

  private saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      this.notifySettingsChanged();
    } catch (e) {}
  }

  private updateGains() {
    const effectiveMaster = this.settings.muted ? 0 : this.settings.masterVolume;

    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(effectiveMaster, this.ctx.currentTime);
    }
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx.currentTime);
    }

    // Update active music deck volume
    const targetMusicVol = effectiveMaster * this.settings.musicVolume;
    const activeAudio = this.activeDeck === 'A' ? this.deckA : this.deckB;
    if (activeAudio) {
      activeAudio.volume = Math.max(0, Math.min(1, targetMusicVol));
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public setMasterVolume(val: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, val));
    this.updateGains();
    this.saveSettings();
  }

  public setMusicVolume(val: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, val));
    this.updateGains();
    this.saveSettings();
  }

  public setSfxVolume(val: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, val));
    this.updateGains();
    this.saveSettings();
  }

  public setMuted(muted: boolean) {
    this.settings.muted = muted;
    this.updateGains();
    this.saveSettings();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  public getMuted(): boolean {
    return this.settings.muted;
  }

  public toggleShuffle(): boolean {
    this.settings.shuffleMode = !this.settings.shuffleMode;
    this.saveSettings();
    return this.settings.shuffleMode;
  }

  public addSettingsChangeListener(cb: (settings: AudioSettings) => void) {
    this.settingsChangeListeners.push(cb);
  }

  public addTrackChangeListener(cb: (track: MusicTrackInfo | null, isPlaying: boolean) => void) {
    this.trackChangeListeners.push(cb);
  }

  private notifyTrackChanged() {
    this.trackChangeListeners.forEach(cb => {
      try {
        cb(this.currentTrack, this.isMusicPlayingState);
      } catch (e) {}
    });
  }

  private notifySettingsChanged() {
    this.settingsChangeListeners.forEach(cb => {
      try {
        cb(this.getSettings());
      } catch (e) {}
    });
  }

  // ==========================================
  // BACKGROUND MUSIC PLAYLIST & CROSSFADER
  // ==========================================

  public getAllTracks(): MusicTrackInfo[] {
    return [...MUSIC_PLAYLIST];
  }

  public getCurrentTrack(): MusicTrackInfo | null {
    return this.currentTrack;
  }

  public isMusicPlaying(): boolean {
    return this.isMusicPlayingState;
  }

  public startBackgroundMusic(biomeOrTrackId: string = 'vainola', _options?: { loop?: boolean; fadeInDuration?: number }) {
    this.resume();
    this.currentBiome = biomeOrTrackId;

    if (!this.deckA || !this.deckB) {
      this.initMusicDecks();
    }

    // Determine track to play
    let targetTrack: MusicTrackInfo | null = null;

    if (this.settings.shuffleMode) {
      // Pick a random track from the pool, avoiding immediate repetition
      targetTrack = this.pickRandomTrack();
    } else {
      // Biome contextual: Find track tagged with biome or id
      targetTrack = MUSIC_PLAYLIST.find(t => t.id === biomeOrTrackId || t.tags.includes(biomeOrTrackId)) || null;
      if (!targetTrack) {
        targetTrack = this.pickRandomTrack();
      }
    }

    if (targetTrack) {
      this.transitionToTrack(targetTrack, 2.0);
    }
  }

  public playTrackById(trackId: string) {
    const track = MUSIC_PLAYLIST.find(t => t.id === trackId || t.url.includes(trackId));
    if (track) {
      this.transitionToTrack(track, 1.2);
    }
  }

  public playNextTrack() {
    let nextTrack: MusicTrackInfo;
    if (this.settings.shuffleMode) {
      nextTrack = this.pickRandomTrack();
    } else {
      const idx = MUSIC_PLAYLIST.findIndex(t => t.id === this.currentTrack?.id);
      const nextIdx = (idx + 1) % MUSIC_PLAYLIST.length;
      nextTrack = MUSIC_PLAYLIST[nextIdx];
    }
    this.transitionToTrack(nextTrack, 1.5);
  }

  public playPreviousTrack() {
    if (this.playHistory.length > 1) {
      this.playHistory.pop(); // Remove current
      const prevId = this.playHistory.pop();
      const track = MUSIC_PLAYLIST.find(t => t.id === prevId);
      if (track) {
        this.transitionToTrack(track, 1.5);
        return;
      }
    }
    // Fallback: cycle backward in playlist
    const idx = MUSIC_PLAYLIST.findIndex(t => t.id === this.currentTrack?.id);
    const prevIdx = idx <= 0 ? MUSIC_PLAYLIST.length - 1 : idx - 1;
    this.transitionToTrack(MUSIC_PLAYLIST[prevIdx], 1.5);
  }

  public togglePauseMusic(): boolean {
    const activeAudio = this.activeDeck === 'A' ? this.deckA : this.deckB;
    if (!activeAudio) return false;

    if (this.isMusicPlayingState) {
      activeAudio.pause();
      this.isMusicPlayingState = false;
    } else {
      if (!activeAudio.src && this.currentTrack) {
        activeAudio.src = this.currentTrack.url;
      }
      activeAudio.play().then(() => {
        this.isMusicPlayingState = true;
      }).catch(() => {});
    }
    this.notifyTrackChanged();
    return this.isMusicPlayingState;
  }

  private pickRandomTrack(): MusicTrackInfo {
    const available = MUSIC_PLAYLIST.filter(t => t.id !== this.currentTrack?.id);
    const pool = available.length > 0 ? available : MUSIC_PLAYLIST;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private transitionToTrack(track: MusicTrackInfo, crossfadeDuration: number = 2.0) {
    if (!this.deckA || !this.deckB) {
      this.initMusicDecks();
    }

    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const nextDeckLetter = this.activeDeck === 'A' ? 'B' : 'A';
    const outgoingDeck = this.activeDeck === 'A' ? this.deckA! : this.deckB!;
    const incomingDeck = nextDeckLetter === 'A' ? this.deckA! : this.deckB!;

    this.currentTrack = track;
    this.activeDeck = nextDeckLetter;
    this.playHistory.push(track.id);
    if (this.playHistory.length > 30) this.playHistory.shift();

    const maxMusicVolume = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.musicVolume;

    incomingDeck.src = track.url;
    incomingDeck.volume = 0.001;

    const playPromise = incomingDeck.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isMusicPlayingState = true;
        this.notifyTrackChanged();
      }).catch(err => {
        console.warn('[SoundEngine] Autoplay waiting for interaction:', err);
      });
    }

    // Smooth Crossfade volume stepping
    const steps = 25;
    const intervalMs = (crossfadeDuration * 1000) / steps;
    let step = 0;

    const startOutVol = outgoingDeck.volume;

    this.crossfadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;

      try {
        incomingDeck.volume = Math.max(0, Math.min(1, progress * maxMusicVolume));
        outgoingDeck.volume = Math.max(0, Math.min(1, (1 - progress) * startOutVol));
      } catch (e) {}

      if (step >= steps) {
        clearInterval(this.crossfadeInterval);
        this.crossfadeInterval = null;
        outgoingDeck.pause();
        outgoingDeck.currentTime = 0;
        incomingDeck.volume = maxMusicVolume;
      }
    }, intervalMs);
  }

  public stopBackgroundMusic(fadeDuration: number = 1.0) {
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const activeAudio = this.activeDeck === 'A' ? this.deckA : this.deckB;
    if (!activeAudio) return;

    const startVol = activeAudio.volume;
    const steps = 15;
    const intervalMs = (fadeDuration * 1000) / steps;
    let step = 0;

    const fadeOutInt = setInterval(() => {
      step++;
      const progress = step / steps;
      try {
        activeAudio.volume = Math.max(0, (1 - progress) * startVol);
      } catch (e) {}

      if (step >= steps) {
        clearInterval(fadeOutInt);
        activeAudio.pause();
        activeAudio.currentTime = 0;
        this.isMusicPlayingState = false;
        this.notifyTrackChanged();
      }
    }, intervalMs);
  }

  stopAllSounds(fadeDuration: number = 0.04) {
    this.stopBackgroundMusic(fadeDuration);
    this.stopCollapseSoundscape(false);
  }

  restoreAudio() {
    this.updateGains();
  }

  // ==========================================================================
  // ESCALATING WORLD COLLAPSE SOUNDSCAPE
  // ==========================================================================

  startCollapseSoundscape() {
    this.playSample('environment/reality_tear', { volume: 1.0 });
    const collapseTrack = MUSIC_PLAYLIST.find(t => t.id === 'everything_dead_dark') || this.pickRandomTrack();
    this.transitionToTrack(collapseTrack, 0.8);
  }

  updateCollapseAudio(_intensity: number, _timeLeft: number) {
    // Dynamic intensity handler for collapse run
  }

  stopCollapseSoundscape(success: boolean = true) {
    if (success) {
      this.playSuccessfulExtractionWarp();
    } else {
      this.playCollapseFailureImplosion();
    }
    // Return to normal biome track
    this.startBackgroundMusic(this.currentBiome);
  }

  public playSuccessfulExtractionWarp() {
    this.playSample('environment/portal_warp', { volume: 0.95 });
  }

  private playCollapseFailureImplosion() {
    this.playSample('impacts/heavy_explosion', { volume: 1.0 });
  }

  // ==========================================================================
  // REAL-TIME DSP CRUNCH SYNTHESIS & REALISTIC TACTILE AUDIO ENGINE
  // ==========================================================================

  private distortionCurve: Float32Array | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private getDistortionCurve(): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = 40; // Crunchy saturation drive amount
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurve = curve;
    return curve;
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  // Heavy Visceral Sub-Bass Drop Kick
  public triggerSubDrop(
    startFreq: number = 150,
    endFreq: number = 28,
    duration: number = 0.12,
    volume: number = 0.85,
    type: OscillatorType = 'triangle'
  ) {
    if (!this.ctx || this.settings.muted) return;
    this.resume();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);

      const effectiveVol = volume * this.settings.sfxVolume * (this.settings.muted ? 0 : this.settings.masterVolume);
      gain.gain.setValueAtTime(effectiveVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.compressor || this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {}
  }

  // Crunchy Saturated Bandpass Noise Burst (Tactile mechanical clatter & bone crunch)
  public triggerCrunchNoise(
    centerFreq: number = 1400,
    duration: number = 0.06,
    q: number = 2.0,
    volume: number = 0.75
  ) {
    if (!this.ctx || this.settings.muted) return;
    this.resume();
    try {
      const noiseBuf = this.getNoiseBuffer();
      if (!noiseBuf) return;

      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(centerFreq, now);
      filter.Q.setValueAtTime(q, now);

      const shaper = this.ctx.createWaveShaper();
      shaper.curve = this.getDistortionCurve() as any;
      shaper.oversample = '2x';

      const gain = this.ctx.createGain();
      const effectiveVol = volume * this.settings.sfxVolume * (this.settings.muted ? 0 : this.settings.masterVolume);
      gain.gain.setValueAtTime(effectiveVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      src.connect(filter);
      filter.connect(shaper);
      shaper.connect(gain);
      gain.connect(this.compressor || this.masterGain || this.ctx.destination);

      src.start(now);
      src.stop(now + duration + 0.02);
    } catch (e) {}
  }

  // Multi-Stage Biomechanical Rupture & Bone Shatter
  public triggerBoneShatterBurst(duration: number = 0.16, volume: number = 0.85) {
    if (!this.ctx || this.settings.muted) return;
    this.resume();
    try {
      this.triggerCrunchNoise(1200, duration * 0.7, 1.8, volume * 0.9);
      this.triggerCrunchNoise(650, duration, 1.4, volume * 0.85);
      this.triggerSubDrop(120, 24, duration * 1.2, volume * 0.8, 'sine');
    } catch (e) {}
  }

  // ==========================================================================
  // COMBAT & INTERACTION SOUND EFFECTS (LAYERED VISCERAL CRUNCH)
  // ==========================================================================

  public playSample(
    key: string,
    options?: {
      volume?: number;
      pitchVariance?: number;
      playbackRate?: number;
    }
  ): boolean {
    if (!this.ctx || this.settings.muted) return false;
    this.resume();

    const buffers = this.sampleCache.get(key);
    if (!buffers || buffers.length === 0) return false;

    const buffer = buffers[Math.floor(Math.random() * buffers.length)];
    if (!buffer) return false;

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const variance = options?.pitchVariance ?? 0.05;
      const baseRate = options?.playbackRate ?? 1.0;
      const jitter = (Math.random() - 0.5) * 2 * variance;
      source.playbackRate.setValueAtTime(Math.max(0.2, baseRate + jitter), this.ctx.currentTime);

      const gainNode = this.ctx.createGain();
      const vol = options?.volume ?? 1.0;
      gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.sfxGain || this.masterGain || this.ctx.destination);

      source.start(0);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Weapon Fire: Heavy Crunchy Railgun / Plasma Shot
  playRailgunShot() {
    this.playSample('weapons/plasma_shot', { volume: 0.9, pitchVariance: 0.08 });
    this.triggerSubDrop(160, 28, 0.11, 0.85);
    this.triggerCrunchNoise(1750, 0.05, 2.2, 0.7);
  }

  // Weapon Fire: Triple Salvo
  playTripleShot() {
    this.playSample('weapons/plasma_shot', { volume: 0.8, playbackRate: 1.12, pitchVariance: 0.08 });
    this.triggerCrunchNoise(2200, 0.04, 2.0, 0.65);
    this.triggerSubDrop(140, 35, 0.08, 0.65);
  }

  // Weapon Fire: Death Ray Continuous / Pulse Beam
  playDeathRayBeam() {
    this.playSample('weapons/plasma_shot', { volume: 0.85, playbackRate: 0.88, pitchVariance: 0.05 });
    this.triggerSubDrop(110, 32, 0.18, 0.75, 'sawtooth');
    this.triggerCrunchNoise(950, 0.12, 1.5, 0.6);
  }

  // Weapon Fire: Runic Cast
  playRunicCast() {
    this.playSample('weapons/plasma_shot', { volume: 0.82, playbackRate: 0.95, pitchVariance: 0.08 });
    this.triggerSubDrop(150, 30, 0.10, 0.75);
    this.triggerCrunchNoise(1500, 0.06, 2.0, 0.6);
  }

  // Melee: Heavy Blade Cleave
  playMeleeSwing() {
    this.playSample('weapons/melee_swing', { volume: 0.85, pitchVariance: 0.06 });
    this.triggerSubDrop(150, 38, 0.09, 0.55, 'sine');
  }

  // Melee: Ukonvasara Lightning Cleave
  playLightningCleave() {
    this.playSample('weapons/melee_swing', { volume: 0.95, playbackRate: 1.05 });
    this.playSample('weapons/plasma_shot', { volume: 0.75, playbackRate: 0.9 });
    this.triggerSubDrop(190, 26, 0.16, 0.9);
    this.triggerCrunchNoise(2400, 0.08, 1.6, 0.8);
  }

  // Visceral Crunchy Hit Impact (Meat + Bone + Armor Thump)
  playHitImpact(isCrit: boolean = false) {
    this.playSample('impacts/flesh_impact', {
      volume: isCrit ? 1.1 : 0.8,
      playbackRate: isCrit ? 1.05 : 0.95,
      pitchVariance: 0.08
    });
    this.triggerCrunchNoise(isCrit ? 1650 : 1300, isCrit ? 0.07 : 0.05, 2.4, isCrit ? 0.95 : 0.7);
    this.triggerSubDrop(isCrit ? 190 : 140, isCrit ? 35 : 45, 0.07, isCrit ? 0.85 : 0.55);
  }

  // Enemy Defeated / Biomechanical Rupture & Gore Crunch
  playEnemyDeath(isBoss: boolean = false, isElite: boolean = false) {
    this.playSample('impacts/enemy_death', {
      volume: isBoss ? 1.15 : isElite ? 0.98 : 0.82,
      playbackRate: isBoss ? 0.85 : isElite ? 0.95 : 1.05,
      pitchVariance: 0.09
    });
    this.triggerBoneShatterBurst(isBoss ? 0.35 : isElite ? 0.22 : 0.14, isBoss ? 1.0 : isElite ? 0.85 : 0.7);
    this.triggerSubDrop(isBoss ? 85 : 125, 22, isBoss ? 0.45 : 0.20, isBoss ? 1.0 : 0.8);
  }

  // Explosion: Heavy Shockwave & Crumbling Debris
  playExplosion() {
    this.playSample('impacts/heavy_explosion', { volume: 0.95, pitchVariance: 0.05 });
    this.triggerSubDrop(105, 20, 0.36, 0.92);
    this.triggerBoneShatterBurst(0.22, 0.75);
  }

  // Dodge Jet: Pneumatic Thruster
  playDodge() {
    this.playSample('weapons/dodge_jet', { volume: 0.8, pitchVariance: 0.06 });
    this.triggerSubDrop(130, 45, 0.08, 0.5, 'sine');
  }

  // Enemy Attacks: Ominous Void Pulse & Deep Plasma
  playEnemyPlasmaFire() {
    this.playSample('monsters/monster_plasma', { volume: 0.8, playbackRate: 0.92, pitchVariance: 0.08 });
    this.triggerSubDrop(130, 30, 0.12, 0.6);
  }

  playEnemyVoidSkull() {
    this.playSample('monsters/void_skull', { volume: 0.85, playbackRate: 0.90, pitchVariance: 0.06 });
    this.triggerSubDrop(115, 26, 0.15, 0.65);
  }

  playPlatformerWorldEnter() {
    this.playSample('environment/portal_warp', { volume: 0.85 });
  }

  playBossRoar() {
    this.playSample('monsters/boss_roar', { volume: 1.0 });
    this.triggerSubDrop(90, 22, 0.5, 0.9);
  }

  playBossHeartPulse() {
    this.playSample('monsters/boss_heart_beat', { volume: 0.95 });
    this.triggerSubDrop(80, 28, 0.25, 0.85);
  }

  playLootDrop(_isRare: boolean = false) {
    this.playSample('ui/loot_legendary', { volume: 0.85 });
  }

  playLevelUp() {
    this.playSample('ui/loot_legendary', { volume: 0.95 });
    this.triggerSubDrop(140, 45, 0.25, 0.7);
  }

  playRuneClick() {
    this.playSample('ui/button_click', { volume: 0.75 });
  }

  playScrapPickup() {
    this.playSample('ui/scrap_pickup', { volume: 0.7, pitchVariance: 0.08 });
  }

  playRunicHarmonicChime(_stepIndex: number = 0) {
    this.playSample('ui/loot_legendary', { volume: 0.7, pitchVariance: 0.04 });
  }

  playRunicShardAcquired() {
    this.playSample('ui/loot_legendary', { volume: 0.85 });
    this.triggerSubDrop(150, 40, 0.2, 0.7);
  }

  playRunicCipherComplete() {
    this.playSample('ui/loot_legendary', { volume: 1.0, playbackRate: 1.02 });
    this.playSample('environment/portal_warp', { volume: 0.95, playbackRate: 1.15 });
    this.playSample('impacts/shield_deflect', { volume: 0.85, playbackRate: 0.95 });
    this.triggerSubDrop(120, 24, 0.4, 0.9);
  }

  playMonolithAwaken() {
    this.playSample('monsters/boss_roar', { volume: 1.0 });
    this.playSample('impacts/heavy_explosion', { volume: 0.9 });
    this.playSample('impacts/shield_deflect', { volume: 0.85 });
    this.triggerSubDrop(80, 20, 0.6, 1.0);
  }

  playRunicProtocolUnlocked() {
    this.playSample('environment/portal_warp', { volume: 0.9 });
  }

  playSpecialCharge() {
    this.playSample('monsters/void_skull', { volume: 0.75, playbackRate: 1.3 });
  }

  playSpecialRelease() {
    this.playSample('impacts/heavy_explosion', { volume: 1.0 });
    this.triggerSubDrop(110, 22, 0.35, 0.95);
  }

  playRunicLyricChime() {
    this.playSample('weapons/plasma_shot', { volume: 0.85, playbackRate: 1.05, pitchVariance: 0.06 });
    this.triggerCrunchNoise(1600, 0.05, 2.0, 0.6);
  }

  playSyntysanatAnvil() {
    this.playSample('impacts/shield_deflect', { volume: 0.9 });
    this.playSample('impacts/heavy_explosion', { volume: 0.7 });
    this.triggerSubDrop(130, 30, 0.18, 0.8);
  }

  playHeroDeathHitStop() {
    this.playSample('monsters/boss_heart_beat', { volume: 1.0 });
    this.playSample('impacts/heavy_explosion', { volume: 0.85 });
    this.triggerSubDrop(75, 18, 0.5, 1.0);
  }

  playHeroExplosionCataclysm() {
    this.playSample('impacts/heavy_explosion', { volume: 1.1 });
    this.playSample('impacts/gore_explosion', { volume: 0.9 });
    this.triggerBoneShatterBurst(0.4, 1.0);
    this.triggerSubDrop(70, 16, 0.6, 1.0);
  }

  playProfileSwitch() {
    this.playSample('ui/button_click', { volume: 0.8 });
  }

  playResetPurge() {
    this.playSample('environment/reality_tear', { volume: 0.9 });
    this.playSample('impacts/heavy_explosion', { volume: 0.85 });
    this.triggerSubDrop(65, 15, 0.7, 1.0);
  }

  playRealityTearDimensionalRift() {
    this.playSample('environment/reality_tear', { volume: 1.0 });
  }
}

export const soundEngine = new SoundEngine();
