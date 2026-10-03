// Master Game Coordinator & Authoritative Loop for Project Sampo-Zero
// Features linear Kalevala Saga adventure path, extraction portals, and victory progression modals

import { IsometricCamera } from './engine/camera';
import { IsometricRenderer } from './engine/renderer';
import { inputManager } from './engine/input';
import { soundEngine } from './engine/audio';
import { particleSystem } from './engine/particles';
import { lightingEngine } from './engine/lighting';
import { projectileManager } from './entities/projectile';
import { combatEngine } from './systems/combat';

import { DungeonGenerator, GeneratedWorld } from './world/generator';
import { FogOfWar } from './world/fog';
import { TileType, TileRenderer } from './world/tiles';
import { BIOMES, SAGA_PATH, BiomeDefinition } from './world/biomes';
import { Item } from './systems/items';

import { Player, FatalDamageInfo } from './entities/player';
import { Enemy } from './entities/enemy';
import { LootChest } from './entities/chest';
import { RunicPuzzlePillar } from './entities/puzzle';
import { VoidGateway } from './entities/gateway';

import { HUD } from './ui/hud';
import { InventoryUI } from './ui/inventory';
import { CharacterSheetUI } from './ui/character_sheet';
import { PuzzleUI } from './ui/puzzle_ui';
import { ShopCraftUI } from './ui/shop_craft';
import { MainMenuUI } from './ui/menu';
import { CharacterCreationUI } from './ui/creation';
import { PauseMenuUI } from './ui/pause_menu';
import { ProfileModalUI } from './ui/profile_modal';
import { ChestLockUI } from './ui/chest_lock';
import { LoadingScreenUI } from './ui/loading_screen';
import { SoundSettingsModalUI } from './ui/sound_settings_modal';
import { GraphicsSettingsModalUI } from './ui/graphics_settings_modal';
import { graphicsEngine, PixelResolutionMode } from './engine/graphics';
import { profileManager, GameProfile, playerFromProfileData } from './systems/profiles';
import { HeroRenderer } from './engine/hero_renderer';
import { AssetLoader } from './engine/asset_loader';
import { PlatformerMode } from './platformer/platformer_mode';

export class SampoGame {
  private canvas: HTMLCanvasElement;
  private lightCanvas: HTMLCanvasElement;
  private uiRoot: HTMLElement;

  private camera: IsometricCamera;
  private renderer: IsometricRenderer;
  private fog: FogOfWar | null = null;
  private world: GeneratedWorld | null = null;

  // Entities
  public player: Player | null = null;
  public enemies: Enemy[] = [];
  public chests: LootChest[] = [];
  public puzzles: RunicPuzzlePillar[] = [];
  public gateways: VoidGateway[] = [];
  public boss: Enemy | null = null;

  // UI Components
  private hud: HUD;
  private inventoryUI: InventoryUI;
  private characterSheetUI: CharacterSheetUI;
  private puzzleUI: PuzzleUI;
  private shopCraftUI: ShopCraftUI;
  private mainMenuUI: MainMenuUI;
  private creationUI: CharacterCreationUI;
  private pauseMenuUI: PauseMenuUI;
  private profileModalUI: ProfileModalUI;
  private soundSettingsModalUI: SoundSettingsModalUI;
  private graphicsSettingsModalUI: GraphicsSettingsModalUI;
  private chestLockUI: ChestLockUI;
  private loadingScreen: LoadingScreenUI;
  private victoryModalEl: HTMLElement | null = null;
  public platformerMode: PlatformerMode;

  // Sector Objectives & Swarm Wave Director
  public kills: number = 0;
  public targetKills: number = 10;
  public puzzleDone: boolean = false;
  public bossDone: boolean = false;
  public clearedSectors: string[] = [];
  public sectorClears: Record<string, number> = {};
  public vaultGreedCount: number = 0;

  public sectorRunTime: number = 0; // Elapsed run duration in seconds for current sector

  public getSectorLoop(sectorId: string): number {
    return this.sectorClears[sectorId] || 0;
  }

  public getVaultGreedThreatPercent(): number {
    return this.vaultGreedCount * 5;
  }

  public getDifficultyMultiplier(sectorId: string, runTimeSeconds?: number): number {
    const loop = this.getSectorLoop(sectorId);
    const rt = runTimeSeconds !== undefined ? runTimeSeconds : this.sectorRunTime;
    const timeFactor = 1.0 + (rt / 60) * 0.05; // +5% hardness per minute elapsed in run
    return (1.0 + (loop * 0.40)) * timeFactor * (1.0 + (this.vaultGreedCount * 0.05));
  }

  // Dynamic Random Swarm Incursions
  private swarmTimer: number = 30;
  private activeSwarmEnemies: Enemy[] = [];
  private swarmWaveCount: number = 0;

  // Post-Boss Realm Collapse & Dimensional Evacuation Sequence
  public escapeSequenceActive: boolean = false;
  public escapeTimer: number = 20.0;
  public maxEscapeTime: number = 20.0;
  public escapePortal: { x: number; y: number } | null = null;
  public collapseIntensity: number = 0;
  public bossArenaBreached: boolean = false;

  // Stage 6 Singularity Climax & Boss-Rush State
  public isStage6SingularityEscape: boolean = false;
  public isStage6BossRushActive: boolean = false;
  public omegaBossIndex: number = 0;
  public gateDisplacementCooldown: number = 0;
  public voidMistAuraTimer: number = 0;
  public escapeGlitchTimer: number = 0;

  public readonly OMEGA_BOSS_DEFINITIONS = [
    {
      id: 'boss_sotka_omega',
      name: 'Sotka Cyber-Harbinger (Genesis Core)',
      subtitle: 'Cosmic Genesis Avatar // Incarnation I',
      level: 24,
      health: 16000,
      damage: 80,
      speed: 2.8,
      color: '#facc15',
      ranged: true
    },
    {
      id: 'boss_surma_omega',
      name: 'Surma Cyber-Hound (Flesh-Metal Apex)',
      subtitle: 'Berserk Void Stalker // Incarnation II',
      level: 27,
      health: 22000,
      damage: 95,
      speed: 3.1,
      color: '#f59e0b',
      ranged: false
    },
    {
      id: 'boss_louhi_omega',
      name: 'Louhi Frost Guardian (Cryo Matrix Zero)',
      subtitle: 'Matriarch of the North // Incarnation III',
      level: 30,
      health: 30000,
      damage: 112,
      speed: 2.6,
      color: '#38bdf8',
      ranged: true
    },
    {
      id: 'boss_tuoni_omega',
      name: 'Tuoni Skeleton King (Kalman-Kuningas)',
      subtitle: 'Underworld High Lich // Incarnation IV',
      level: 34,
      health: 40000,
      damage: 130,
      speed: 2.4,
      color: '#c084fc',
      ranged: true
    },
    {
      id: 'boss_turso_omega',
      name: 'Iku-Turso Leviathan (Abyssal Magma Trench)',
      subtitle: 'Primordial Abyssal Construct // Incarnation V',
      level: 38,
      health: 54000,
      damage: 150,
      speed: 2.1,
      color: '#ef4444',
      ranged: false
    },
    {
      id: 'boss_sampo_omega',
      name: 'The Restored Cosmic Sampo (Overclocked)',
      subtitle: 'Supreme Autonomous Forge // Incarnation VI',
      level: 44,
      health: 72000,
      damage: 175,
      speed: 2.8,
      color: '#fbbf24',
      ranged: true
    },
    {
      id: 'boss_void_mist',
      name: 'SURMA-MUSTA // THE VOID MIST OVERLORD',
      subtitle: 'Musta Sumu - The Primordial Entropy & Cosmic Singularity // FINAL FORM',
      level: 50,
      health: 98000,
      damage: 220,
      speed: 3.6,
      color: '#c084fc',
      ranged: true
    }
  ];

  public extractionSequenceState = {
    active: false,
    phase: 'idle' as 'idle' | 'teleporting_hero' | 'hero_vanished' | 'portal_closing' | 'completed',
    timer: 0,
    heroTeleportDuration: 0.75,
    portalCloseDelay: 0.55,
    portalClosingDuration: 0.45,
    totalDuration: 1.75,
    portalX: 0,
    portalY: 0,
    heroStartX: 0,
    heroStartY: 0
  };

  private lastTime: number = performance.now();
  public currentSectorId: string = 'ilman_luominen';
  public inGame: boolean = false;
  private deathTimeout: any = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.lightCanvas = document.getElementById('lighting-canvas') as HTMLCanvasElement;
    this.uiRoot = document.getElementById('ui-root') as HTMLElement;

    // Init Engine Subsystems
    this.camera = new IsometricCamera();
    this.renderer = new IsometricRenderer(this.canvas, this.lightCanvas, this.camera);
    inputManager.init(this.canvas);
    soundEngine.init();
    window.addEventListener('pointerdown', () => soundEngine.resume(), { once: true });
    window.addEventListener('keydown', () => soundEngine.resume(), { once: true });
    AssetLoader.preloadAll();
    HeroRenderer.preloadAll();

    // Init UI Systems
    this.loadingScreen = new LoadingScreenUI();
    this.hud = new HUD(this.uiRoot);
    this.inventoryUI = new InventoryUI(this.uiRoot, () => this.onPlayerStateChanged());
    this.characterSheetUI = new CharacterSheetUI(this.uiRoot, () => this.onPlayerStateChanged());
    this.puzzleUI = new PuzzleUI(this.uiRoot);
    this.shopCraftUI = new ShopCraftUI(this.uiRoot, () => this.onPlayerStateChanged(), () => this.currentSectorId);
    this.chestLockUI = new ChestLockUI(this.uiRoot);

    this.platformerMode = new PlatformerMode(
      this.canvas,
      this.lightCanvas,
      this.hud,
      (won) => this.onExitSideScroller(won)
    );

    this.mainMenuUI = new MainMenuUI(
      this.uiRoot,
      (sectorId) => this.startSector(sectorId),
      () => this.openCharacterSelection(),
      () => this.openProfileManager(),
      (themeId) => this.startSideScroller(themeId)
    );
    this.creationUI = new CharacterCreationUI(this.uiRoot, (player, isNewProfile) => this.onCharacterCreated(player, isNewProfile));
    this.pauseMenuUI = new PauseMenuUI(
      this.uiRoot,
      () => this.onResume(),
      () => this.onOpenSagaMap(),
      () => this.onReturnMainMenu(),
      () => this.openProfileManager()
    );
    this.profileModalUI = new ProfileModalUI(this.uiRoot);
    this.soundSettingsModalUI = new SoundSettingsModalUI(this.uiRoot);
    this.graphicsSettingsModalUI = new GraphicsSettingsModalUI(this.uiRoot);

    // Bind Hotkeys
    this.bindGlobalHotkeys();

    // Check for saved character in profiles
    this.loadInitialState();

    // Start Animation Loop
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private loadInitialState() {
    profileManager.loadFromStorage();
    const activeProfile = profileManager.getActiveProfile();

    if (activeProfile && activeProfile.playerData) {
      try {
        this.player = playerFromProfileData(activeProfile.playerData);
        this.clearedSectors = [...(activeProfile.clearedSectors || [])];
        this.sectorClears = { ...(activeProfile.sectorClears || {}) };
        this.mainMenuUI.show(this.clearedSectors, this.player, this.sectorClears);
        return;
      } catch (e) {
        console.warn('Could not load active profile:', e);
      }
    }

    // If no active profile, show new character creation
    this.player = null as any;
    this.clearedSectors = [];
    this.sectorClears = {};
    this.mainMenuUI.hide();
    this.creationUI.show(undefined, undefined, true);
  }

  private openProfileManager() {
    this.profileModalUI.show(
      (selectedProfile) => this.onProfileSelected(selectedProfile),
      () => this.openNewCharacterCreation(),
      () => this.onTotalResetPerformed(),
      (resetProfile) => this.onProfileResetPerformed(resetProfile),
      (newActiveProfile) => this.onProfileDeleted(newActiveProfile)
    );
  }

  private onProfileDeleted(newActiveProfile: GameProfile | null) {
    if (newActiveProfile && newActiveProfile.playerData) {
      this.player = playerFromProfileData(newActiveProfile.playerData);
      this.clearedSectors = [...(newActiveProfile.clearedSectors || [])];
      this.sectorClears = { ...(newActiveProfile.sectorClears || {}) };
      this.savePlayer();
      this.mainMenuUI.show(this.clearedSectors, this.player, this.sectorClears);
    } else {
      this.inGame = false;
      if (this.deathTimeout) {
        clearTimeout(this.deathTimeout);
        this.deathTimeout = null;
      }
      this.enemies = [];
      this.chests = [];
      this.puzzles = [];
      this.gateways = [];
      this.boss = null;
      this.escapePortal = null;
      this.escapeSequenceActive = false;
      this.hud.hide();
      this.pauseMenuUI.hide();
      this.chestLockUI.close();
      this.puzzleUI.close();
      this.inventoryUI.close();
      this.characterSheetUI.close();
      this.shopCraftUI.close();
      this.closeVictoryModal();
      this.closeDefeatModal();
      this.closeCollapseDefeatModal();

      this.player = null as any;
      this.clearedSectors = [];
      this.sectorClears = {};
      this.mainMenuUI.hide();
      this.profileModalUI.close();
      this.creationUI.show(undefined, undefined, true);
    }
  }

  private onProfileSelected(profile: GameProfile) {
    this.player = playerFromProfileData(profile.playerData);
    this.clearedSectors = [...(profile.clearedSectors || [])];
    this.sectorClears = { ...(profile.sectorClears || {}) };
    this.mainMenuUI.show(this.clearedSectors, this.player, this.sectorClears);
  }

  private onProfileResetPerformed(profile: GameProfile) {
    this.player = playerFromProfileData(profile.playerData);
    this.clearedSectors = [...(profile.clearedSectors || [])];
    this.sectorClears = { ...(profile.sectorClears || {}) };
    this.mainMenuUI.show(this.clearedSectors, this.player, this.sectorClears);
  }

  private openNewCharacterCreation() {
    this.mainMenuUI.hide();
    const hasProfiles = profileManager.getAllProfiles().length > 0;
    const onCancel = hasProfiles && this.player ? () => {
      this.mainMenuUI.show(this.clearedSectors, this.player || undefined, this.sectorClears);
    } : undefined;
    this.creationUI.show(undefined, onCancel, true);
  }

  private openCharacterSelection() {
    this.mainMenuUI.hide();
    this.creationUI.show(this.player || undefined, () => {
      this.mainMenuUI.show(this.clearedSectors, this.player || undefined, this.sectorClears);
    }, false);
  }

  private onCharacterCreated(player: Player, isNewProfile: boolean) {
    if (isNewProfile) {
      const newProf = profileManager.createProfile(player.name, player.appearance);
      this.player = playerFromProfileData(newProf.playerData);
      this.clearedSectors = [];
      this.sectorClears = {};
    } else {
      const activeProf = profileManager.getActiveProfile();
      if (activeProf) {
        profileManager.updateProfileAppearance(activeProf.id, player.name, player.appearance);
      }
      this.player = player;
    }
    this.savePlayer();
    this.mainMenuUI.show(this.clearedSectors, this.player, this.sectorClears);
  }

  private onTotalResetPerformed() {
    this.inGame = false;
    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    this.enemies = [];
    this.chests = [];
    this.puzzles = [];
    this.gateways = [];
    this.boss = null;
    this.escapePortal = null;
    this.escapeSequenceActive = false;
    this.hud.hide();
    this.pauseMenuUI.hide();
    this.chestLockUI.close();
    this.puzzleUI.close();
    this.inventoryUI.close();
    this.characterSheetUI.close();
    this.shopCraftUI.close();
    this.closeVictoryModal();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();

    this.player = null as any;
    this.clearedSectors = [];
    this.sectorClears = {};
    this.mainMenuUI.hide();
    this.profileModalUI.close();
    this.creationUI.show(undefined, undefined, true);
  }

  private savePlayer() {
    if (!this.player) return;
    profileManager.saveActiveProfileState(this.player, this.clearedSectors, this.sectorClears);
  }

  private onPlayerStateChanged() {
    this.savePlayer();
  }

  private onResume() {
    this.pauseMenuUI.hide();
  }

  private onOpenSagaMap() {
    this.inGame = false;
    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    this.pauseMenuUI.hide();
    this.closeVictoryModal();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();
    this.chestLockUI.close();
    this.puzzleUI.close();
    this.inventoryUI.close();
    this.characterSheetUI.close();
    this.shopCraftUI.close();
    this.hud.hide();

    // Clear active runtime entities so background combat stops completely
    this.enemies = [];
    this.chests = [];
    this.puzzles = [];
    this.gateways = [];
    this.boss = null;
    this.escapePortal = null;
    this.escapeSequenceActive = false;
    this.extractionSequenceState = {
      active: false,
      phase: 'idle',
      timer: 0,
      heroTeleportDuration: 0.75,
      portalCloseDelay: 0.55,
      portalClosingDuration: 0.45,
      totalDuration: 1.75,
      portalX: 0,
      portalY: 0,
      heroStartX: 0,
      heroStartY: 0
    };

    this.isDefeated = false;
    this.deathSequenceState = {
      active: false,
      phase: 'idle',
      timer: 0,
      pauseDuration: 0.42,
      totalDuration: 3.2,
      fatalInfo: null
    };
    if (this.player) {
      this.player.resetCombatAndDeathState();
    }
    projectileManager.clear();
    particleSystem.clear();
    combatEngine.clear();
    lightingEngine.clearTransientLights();

    this.savePlayer();
    this.mainMenuUI.show(this.clearedSectors, this.player || undefined, this.sectorClears);
  }

  private onReturnMainMenu() {
    this.onOpenSagaMap();
  }

  private isAnyModalOpen(): boolean {
    return (
      this.mainMenuUI.isOpen() ||
      this.pauseMenuUI.isOpen() ||
      this.profileModalUI.isOpen() ||
      this.soundSettingsModalUI.isOpen() ||
      this.graphicsSettingsModalUI.isOpen() ||
      this.chestLockUI.isOpen() ||
      this.puzzleUI.isOpen() ||
      this.inventoryUI.getIsOpen() ||
      this.characterSheetUI.getIsOpen() ||
      this.shopCraftUI.getIsOpen() ||
      this.hud.isNotificationOpen() ||
      this.victoryModalEl !== null ||
      this.defeatModalEl !== null ||
      this.collapseModalEl !== null
    );
  }

  private handleEscapePress() {
    if (this.platformerMode && this.platformerMode.isActive) {
      this.platformerMode.exit();
      return;
    }

    if (this.graphicsSettingsModalUI.isOpen()) {
      this.graphicsSettingsModalUI.close();
      return;
    }

    if (this.soundSettingsModalUI.isOpen()) {
      this.soundSettingsModalUI.close();
      return;
    }

    if (this.profileModalUI.isOpen()) {
      this.profileModalUI.close();
      return;
    }

    if (this.hud.isNotificationOpen()) {
      this.hud.closeRunicCompleteBanner();
      return;
    }

    if (!this.inGame || this.mainMenuUI.isOpen()) return;

    if (this.victoryModalEl) {
      this.closeVictoryModal();
      this.onReturnMainMenu();
      return;
    }
    if (this.defeatModalEl) {
      this.closeDefeatModal();
      return;
    }
    if (this.collapseModalEl) {
      this.closeCollapseDefeatModal();
      return;
    }
    if (this.chestLockUI.isOpen()) {
      this.chestLockUI.close();
      return;
    }
    if (this.puzzleUI.isOpen()) {
      this.puzzleUI.close();
      return;
    }
    if (this.inventoryUI.getIsOpen()) {
      this.inventoryUI.close();
      return;
    }
    if (this.characterSheetUI.getIsOpen()) {
      this.characterSheetUI.close();
      return;
    }
    if (this.shopCraftUI.getIsOpen()) {
      this.shopCraftUI.close();
      return;
    }
    this.pauseMenuUI.toggle(this.world ? this.world.biome : undefined);
  }

  private bindGlobalHotkeys() {
    // Global unbreakable Escape listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        this.handleEscapePress();
      }
    }, true);

    // Inventory: I / Tab
    inputManager.onAction('i', () => { if (this.player && !this.pauseMenuUI.isOpen()) this.inventoryUI.toggle(this.player); });
    inputManager.onAction('tab', () => { if (this.player && !this.pauseMenuUI.isOpen()) this.inventoryUI.toggle(this.player); });

    // Character: C
    inputManager.onAction('c', () => { if (this.player && !this.pauseMenuUI.isOpen()) this.characterSheetUI.toggle(this.player); });

    // Nanite Forge: F
    inputManager.onAction('f', () => { if (this.player && !this.pauseMenuUI.isOpen()) this.shopCraftUI.toggle(this.player); });

    // Potion: Q or 5
    inputManager.onAction('q', () => {
      if (this.player && !this.isAnyModalOpen()) {
        const used = this.player.usePotion();
        if (used) this.hud.addLog('Injected Nano-Repair (+60 HP)', 'heal');
      }
    });
    inputManager.onAction('5', () => {
      if (this.player && !this.isAnyModalOpen()) {
        const used = this.player.usePotion();
        if (used) this.hud.addLog('Injected Nano-Repair (+60 HP)', 'heal');
      }
    });

    // Mute: M
    inputManager.onAction('m', () => {
      const muted = soundEngine.toggleMute();
      const muteBtn = document.getElementById('btn-toggle-mute');
      if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
      this.hud.addLog(`Master Audio ${muted ? 'Muted' : 'Unmuted'}`, 'system');
    });

    // Dodge Roll: Space
    inputManager.onAction(' ', () => {
      if (this.player && !this.isAnyModalOpen()) {
        let move = inputManager.getMovementVector();
        if (inputManager.isMouseDownMiddle) {
          const mouseWorld = this.camera.screenToWorld(inputManager.mouseScreen.x, inputManager.mouseScreen.y);
          const toMouseX = mouseWorld.x - this.player.x;
          const toMouseY = mouseWorld.y - this.player.y;
          const dist = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
          if (dist > 0.35) {
            move = { dx: toMouseX / dist, dy: toMouseY / dist };
          }
        }
        const rolled = this.player.dodge(move.dx, move.dy);
        if (rolled) this.hud.addLog('Executed Active Dodge Roll (I-Frames)', 'skill');
      }
    });

    // Abilities: 1, 2, 3, 4 / R
    inputManager.onAction('1', () => {
      if (this.player && !this.isAnyModalOpen() && this.player.castAbility1()) {
        this.triggerUkonvasaraAoE();
      }
    });
    inputManager.onAction('2', () => {
      if (this.player && !this.isAnyModalOpen()) {
        let move = inputManager.getMovementVector();
        if (inputManager.isMouseDownMiddle) {
          const mouseWorld = this.camera.screenToWorld(inputManager.mouseScreen.x, inputManager.mouseScreen.y);
          const toMouseX = mouseWorld.x - this.player.x;
          const toMouseY = mouseWorld.y - this.player.y;
          const dist = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
          if (dist > 0.35) {
            move = { dx: toMouseX / dist, dy: toMouseY / dist };
          }
        }
        const cast = this.player.castAbility2(move.dx, move.dy);
        if (cast) this.hud.addLog('Cast [2] Kipinä Dash: Plasma Jet Roll', 'skill');
      }
    });
    inputManager.onAction('3', () => {
      if (this.player && !this.isAnyModalOpen()) {
        const cast = this.player.castAbility3();
        if (cast) this.hud.addLog('Cast [3] Tuoni Siphon: Void Energy Barrier', 'skill');
      }
    });
    inputManager.onAction('4', () => {
      if (this.player && !this.isAnyModalOpen()) {
        const cast = this.player.castAbility4();
        if (cast) this.hud.addLog('OVERCLOCK ENGAGED! +80% Attack Speed Frenzy', 'skill');
      }
    });
    inputManager.onAction('r', () => {
      if (this.player && !this.isAnyModalOpen()) {
        const cast = this.player.castAbility4();
        if (cast) this.hud.addLog('OVERCLOCK ENGAGED! +80% Attack Speed Frenzy', 'skill');
      }
    });

    // Environmental Interaction: E
    inputManager.onAction('e', () => {
      if (!this.isAnyModalOpen()) {
        this.handleInteract();
      }
    });

    // Camera Zoom Controls (Wheel & Keys)
    const adjustZoom = (delta: number) => {
      if (this.platformerMode && this.platformerMode.isActive) {
        this.platformerMode.camera.changeZoom(delta);
      } else {
        this.camera.changeZoom(delta);
      }
    };

    inputManager.onWheel((delta) => {
      if (this.platformerMode && this.platformerMode.isActive) {
        // Disabled mouse scroll zoom in platformer mode per user request
        return;
      }
      adjustZoom(delta);
    });

    inputManager.onAction('=', () => adjustZoom(0.15));
    inputManager.onAction('+', () => adjustZoom(0.15));
    inputManager.onAction(']', () => adjustZoom(0.15));
    inputManager.onAction('-', () => adjustZoom(-0.15));
    inputManager.onAction('_', () => adjustZoom(-0.15));
    inputManager.onAction('[', () => adjustZoom(-0.15));

    // HUD button bindings
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
      this.pauseMenuUI.toggle(this.world ? this.world.biome : undefined);
    });
    document.getElementById('btn-toggle-saga')?.addEventListener('click', () => {
      this.pauseMenuUI.hide();
      this.closeVictoryModal();
      this.mainMenuUI.show(this.clearedSectors, this.player || undefined);
    });
    document.getElementById('btn-toggle-inv')?.addEventListener('click', () => {
      if (this.player && !this.pauseMenuUI.isOpen()) this.inventoryUI.toggle(this.player);
    });
    document.getElementById('btn-toggle-char')?.addEventListener('click', () => {
      if (this.player && !this.pauseMenuUI.isOpen()) this.characterSheetUI.toggle(this.player);
    });
    document.getElementById('btn-toggle-forge')?.addEventListener('click', () => {
      if (this.player && !this.pauseMenuUI.isOpen()) this.shopCraftUI.toggle(this.player);
    });
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      adjustZoom(0.2);
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      adjustZoom(-0.2);
    });
    const muteBtn = document.getElementById('btn-toggle-mute');
    if (muteBtn) {
      muteBtn.title = "Audio Controls & Jukebox (Click to open, Right-Click to Mute)";
      muteBtn.addEventListener('click', () => {
        if (this.soundSettingsModalUI.isOpen()) {
          this.soundSettingsModalUI.close();
        } else {
          this.soundSettingsModalUI.show();
        }
      });
      muteBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const muted = soundEngine.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
        this.hud.addLog(`Master Audio ${muted ? 'Muted' : 'Unmuted'}`, 'system');
      });
    }

    // Retro Graphics Cycle Hotkey: F8
    inputManager.onAction('f8', () => {
      const modes: PixelResolutionMode[] = ['retro-16bit', 'retro-8bit', 'retro-crisp', 'hd-native'];
      const cur = graphicsEngine.getSettings().resolutionMode;
      const nextIdx = (modes.indexOf(cur) + 1) % modes.length;
      const nextMode = modes[nextIdx];
      graphicsEngine.updateSettings({ resolutionMode: nextMode, pixelScaleOverride: 0 });
      soundEngine.playRuneClick();
      const labels: Record<PixelResolutionMode, string> = {
        'retro-16bit': '🕹️ Retro 16-Bit (~480p SNES/Amiga)',
        'retro-8bit': '👾 Retro 8-Bit (~320p Lo-Fi Arcade)',
        'retro-crisp': '🖥️ Crisp 32-Bit (~640p Pixel Art)',
        'hd-native': '✨ HD Native (Smooth Vector)'
      };
      this.hud.addLog(`Graphics Preset: ${labels[nextMode]}`, 'system');
    });

    // Side-Scroller Prototype Hotkey: 'P'
    inputManager.onAction('p', () => {
      if (this.player && !this.isAnyModalOpen() && !this.platformerMode.isActive) {
        this.hud.addLog('⚡ REALITY FRACTURE INITIATED...', 'alert');
        this.triggerRealityFractureTransition(this.player.x, this.player.y, 'tuonela_chasm');
      }
    });
  }

  // Reality Fracture Boss Phase 2 Transition Sequence
  // Triggers bone-shattering sound DSP, chaotic particle displacement, screen tear slices, and warps into 2D side-scroller
  public triggerRealityFractureTransition(bossX: number, bossY: number, themeId: string = 'tuonela_chasm') {
    if (!this.player) return;

    // 1. Trigger Reality-Tear Sound DSP (WaveShaper distortion, FM screams, granular crack, sub-bass implosion)
    soundEngine.playRealityTearDimensionalRift();

    // 2. Accelerating Particle Displacement & Spacetime Chaos (NO CIRCLES, NO BUBBLES!)
    particleSystem.emitParticleDisplacementTear(bossX, bossY, 2.5);

    // Continuous chaotic bursts over the transition with escalating velocity
    for (let k = 1; k <= 5; k++) {
      setTimeout(() => {
        if (!this.player) return;
        const px = bossX + (Math.random() - 0.5) * (k * 1.5);
        const py = bossY + (Math.random() - 0.5) * (k * 1.5);
        particleSystem.emitParticleDisplacementTear(px, py, 1.2 + k * 0.4);
        this.camera.addShake(2.0 + k * 0.4, 0.12);
      }, k * 260);
    }

    combatEngine.addFloatingText(bossX, bossY - 1.5, '⚡ REALITY FRACTURE // PHASE 2 COLLAPSE! ⚡', 'crit');
    this.hud.addLog('🚨 REALITY FRACTURE: Dimensional fabric collapsing into the Cosmic Horror Chasm!', 'alert');

    // 3. Screen Glitch & Camera Violent Accelerating Tremor
    this.camera.addShake(4.5, 0.35);

    // 4. Warp into 2D Platformer Mode after the reality tear climax
    setTimeout(() => {
      if (!this.player) return;
      this.startSideScroller(themeId);
    }, 1600);
  }

  startSideScroller(themeId: string = 'tuonela_chasm') {
    if (!this.player) return;
    this.inGame = false;
    this.mainMenuUI.hide();
    this.pauseMenuUI.hide();
    this.closeVictoryModal();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();
    this.hud.hideEscapeTimer();
    this.escapeSequenceActive = false;

    // Reset player combat state for clean platformer start
    this.player.resetCombatAndDeathState();

    const validTheme = (['tuonela_chasm', 'vainola_canopy', 'pohjola_vault', 'alinen_trench'].includes(themeId)
      ? themeId
      : 'tuonela_chasm') as 'tuonela_chasm' | 'vainola_canopy' | 'pohjola_vault' | 'alinen_trench';

    // Synchronize canvas dimensions and camera viewport for platformer mode
    this.renderer.resize();
    this.platformerMode.camera.handleResize(this.canvas.width, this.canvas.height);
    this.platformerMode.start(this.player, validTheme);
  }

  onExitSideScroller(won: boolean = false) {
    this.savePlayer();
    if (won) {
      this.bossDone = true;
      // Complete the 2D side-scroller trial -> Warp directly into the Final Void Dimension!
      this.triggerStage6SingularityClimax();
    } else {
      soundEngine.startBackgroundMusic('title');
      this.mainMenuUI.show(this.clearedSectors, this.player || undefined, this.sectorClears);
    }
  }

  async startSector(sectorId: string) {
    if (!this.player) return;

    // 1. Show cinematic Cyber-Kalevala loading screen
    this.loadingScreen.show(sectorId, 'REALM SYNCHRONIZATION // SECTOR INITIALIZATION');
    this.inGame = false;
    this.hud.hide();

    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    this.pauseMenuUI.hide();
    this.mainMenuUI.hide();
    this.closeVictoryModal();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();

    this.isDefeated = false;
    this.deathSequenceState = {
      active: false,
      phase: 'idle',
      timer: 0,
      pauseDuration: 0.42,
      totalDuration: 3.2,
      fatalInfo: null
    };
    if (this.player) {
      this.player.resetCombatAndDeathState();
    }
    this.currentSectorId = sectorId;

    projectileManager.clear();
    particleSystem.clear();
    combatEngine.clear();
    lightingEngine.clearTransientLights();
    this.camera.targetZoom = 0.85;
    this.camera.zoom = 0.85;

    // 2. Ensure all assets, character sprites, and transparent textures are fully loaded
    this.loadingScreen.updateProgress(0.20, 'DECODING RUNIC CHROMA-KEY SPRITES...');
    await AssetLoader.preloadAll((progress) => {
      this.loadingScreen.updateProgress(0.20 + progress * 0.45);
    });

    // 3. Procedurally generate dungeon world
    // 3. Procedurally generate dungeon world with loop/round scaling
    this.loadingScreen.updateProgress(0.75, 'SYNTHESIZING ISOMETRIC VOXELS...');
    this.sectorRunTime = 0; // Reset run timer for fresh expedition
    const loop = this.getSectorLoop(sectorId);
    const diffMult = this.getDifficultyMultiplier(sectorId, 0);
    const dmgMult = (1.0 + (loop * 0.28)) * (1.0 + (this.vaultGreedCount * 0.05));
    const speedMult = 1.0 + Math.min(0.45, loop * 0.07);
    const eliteBonus = Math.min(0.55, loop * 0.08);

    const seed = Math.floor(Math.random() * 1000000);
    this.world = DungeonGenerator.generate(seed, sectorId, 84, loop);
    this.fog = new FogOfWar(this.world.width, this.world.height);
    this.fog.revealArea(this.world.spawnPoint.x, this.world.spawnPoint.y, 16, true);

    // Immediately compute initial visibility so vision polygon is populated from frame 0
    const isWallInit = (x: number, y: number) => {
      if (!this.world) return true;
      if (x < 0 || x >= this.world.width || y < 0 || y >= this.world.height) return true;
      return this.world.tiles[y][x] === TileType.WALL;
    };
    this.fog.update(this.world.spawnPoint.x, this.world.spawnPoint.y, 0, 0.016, isWallInit);

    lightingEngine.setBiomeAmbient(sectorId);
    TileRenderer.clearObstacleCache();

    // Place Player at spawn point
    this.player.x = this.world.spawnPoint.x;
    this.player.y = this.world.spawnPoint.y;
    this.camera.snapTo(this.player.x, this.player.y);

    // Reset Sector-Specific Greed Hardness Tracking
    this.vaultGreedCount = 0;

    if (sectorId === 'void_dimension') {
      this.chests = [];
      this.puzzles = [];
      this.gateways = [];
      this.enemies = [];
      this.boss = null;
      this.isStage6BossRushActive = true;
      this.omegaBossIndex = 0;
      this.fog.revealArea(this.world.spawnPoint.x, this.world.spawnPoint.y, 75, true);
      this.spawnOmegaBoss(0);
    } else {
      this.isStage6BossRushActive = false;
      this.omegaBossIndex = 0;

      // Initialize Chests (loot level scales with loop mastery)
      const effectiveLootLevel = this.player!.level + Math.floor(loop * 1.5);
      this.chests = this.world.chestPoints.map(cp => new LootChest(cp.x, cp.y, cp.isLocked, effectiveLootLevel));

      // Initialize Puzzle Pillars with realm-specific incantations
      this.puzzles = this.world.puzzlePoints.map(pp => new RunicPuzzlePillar(pp.x, pp.y, sectorId));

      // Initialize Void Spawner Gateways (scaled durability and minion rate with loop)
      this.gateways = this.world.gatewayPoints.map(gp => {
        const gw = new VoidGateway(gp.x, gp.y, sectorId, effectiveLootLevel, loop);
        return gw;
      });

      // Initialize Enemies with Overdrive Loop Hardness Scaling (filtered to guarantee safe starting radius)
      const safeEnemySpawns = this.world.enemySpawns.filter(esp => 
        Math.hypot(esp.x - this.world!.spawnPoint.x, esp.y - this.world!.spawnPoint.y) > 15.0
      );

      const baseEnemyLevel = Math.max(1, (this.world!.biome.recommendedLevel || 1) + loop * 3);

      this.enemies = safeEnemySpawns.map(esp => {
        const ep = this.world!.biome.enemyPool[esp.enemyTypeIndex] || this.world!.biome.enemyPool[0];
        const isElite = esp.isElite || Math.random() < (0.12 + eliteBonus);
        const enemyHealth = Math.round(ep.health * diffMult * (isElite ? 1.45 : 1.0));
        const enemyDamage = Math.round(ep.damage * dmgMult * (isElite ? 1.25 : 1.0));
        const enemySpeed = ep.speed * speedMult * (isElite ? 1.10 : 1.0);
        const enemyLevel = baseEnemyLevel + (isElite ? 2 : 0);

        const enemy = new Enemy(
          ep.type,
          isElite ? (loop > 0 ? `Overdrive Elite ${ep.name}` : `Elite ${ep.name}`) : ep.name,
          esp.x,
          esp.y,
          enemyHealth,
          enemySpeed,
          enemyDamage,
          isElite ? '#f59e0b' : ep.color,
          ep.ranged,
          ep.isMech,
          false,
          isElite,
          enemyLevel
        );

        // Later sectors, loops, and elites possess energy barrier shielding:
        const sectorOrder = this.world?.biome?.order || 1;
        const isAegisType = ep.type.includes('aegis') || ep.type.includes('overclock');
        const hasShield = isAegisType || isElite || (loop > 0 && Math.random() < 0.50) || (sectorOrder >= 2 && Math.random() < 0.40);
        if (hasShield) {
          enemy.isShielded = true;
          enemy.hadShield = true;
          // Fortified energy barrier: requires 3-5 sustained shots to collapse
          const baseShieldValue = Math.max(200, Math.round(enemyHealth * (isElite ? 1.85 : 1.45)));
          enemy.maxShield = Math.round(baseShieldValue * (1.0 + (enemyLevel - 1) * 0.08));
          enemy.shield = enemy.maxShield;
        }

        return enemy;
      });

      // On next rounds (loop > 0), spawn additional roaming patrols and ambush packs
      if (loop > 0) {
        const extraPacks = loop * 3;
        const eligibleRooms = this.world.rooms.filter(r => r.type !== 'spawn' && r.type !== 'boss');
        for (let p = 0; p < extraPacks; p++) {
          if (eligibleRooms.length === 0) break;
          const targetRoom = eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)];
          const packSize = 2 + Math.floor(Math.random() * (2 + loop));
          for (let pe = 0; pe < packSize; pe++) {
            const rx = targetRoom.x + 1 + Math.floor(Math.random() * Math.max(1, targetRoom.w - 2));
            const ry = targetRoom.y + 1 + Math.floor(Math.random() * Math.max(1, targetRoom.h - 2));
            if (
              rx >= 1 && rx < this.world.width - 1 &&
              ry >= 1 && ry < this.world.height - 1 &&
              this.world.tiles[ry][rx] === TileType.FLOOR &&
              Math.hypot(rx - this.world.spawnPoint.x, ry - this.world.spawnPoint.y) > 15.0
            ) {
              const ep = this.world.biome.enemyPool[Math.floor(Math.random() * this.world.biome.enemyPool.length)];
              const isElite = Math.random() < (0.16 + eliteBonus);
              const roamerHealth = Math.round(ep.health * diffMult * (isElite ? 1.45 : 1.0));
              const roamerDamage = Math.round(ep.damage * dmgMult * (isElite ? 1.25 : 1.0));
              const roamerSpeed = ep.speed * speedMult * (isElite ? 1.10 : 1.0);
              const enemy = new Enemy(
                `roamer_${p}_${pe}_${ep.type}`,
                isElite ? `Vanguard Patrol ${ep.name}` : `Patrol ${ep.name}`,
                rx,
                ry,
                roamerHealth,
                roamerSpeed,
                roamerDamage,
                isElite ? '#f59e0b' : ep.color,
                ep.ranged,
                ep.isMech,
                false,
                isElite,
                baseEnemyLevel + (isElite ? 2 : 0)
              );
              const isAegisRoamer = ep.type.includes('aegis') || ep.type.includes('overclock');
              if (isAegisRoamer || isElite || Math.random() < 0.40) {
                enemy.isShielded = true;
                enemy.hadShield = true;
                const baseShieldValue = Math.max(200, Math.round(roamerHealth * (isElite ? 1.85 : 1.45)));
                enemy.maxShield = Math.round(baseShieldValue * (1.0 + (enemy.level - 1) * 0.08));
                enemy.shield = enemy.maxShield;
              }
              this.enemies.push(enemy);
            }
          }
        }
      }

      // Boss is NOT spawned at start — Player must hunt Symbol-Carriers and decipher the Ancient Monolith to awaken the Boss!
      this.boss = null;
      this.bossDone = false;
      this.bossArenaBreached = false;

      // Distribute 4 Magic Symbol Cipher Shards among distinct non-boss enemies across the map
      if (this.puzzles.length > 0) {
        const primaryPuzzle = this.puzzles[0];
        const shards = primaryPuzzle.puzzleData.shards;
        const nonBossEnemies = this.enemies.filter(e => !e.isBoss);

        // Distribute 4 Magic Symbol Cipher Shards across diverse enemies around the map
        const candidates = nonBossEnemies.length > 0 ? nonBossEnemies : this.enemies;

        shards.forEach((shard, idx) => {
          const step = Math.max(1, Math.floor(candidates.length / shards.length));
          const targetEnemy = candidates[(idx * step) % candidates.length];
          if (targetEnemy) {
            targetEnemy.runeShard = shard;
            targetEnemy.hasRuneShard = true;
            targetEnemy.isRanged = false; // Symbol carriers are melee rush fighters
            targetEnemy.speed = targetEnemy.speed * 1.08; // Mild +8% speed increase (balanced for run 1)
            targetEnemy.damage = Math.round(targetEnemy.damage * 1.05); // Modest damage tuning
            targetEnemy.damageType = 'shock'; // Electrified / magic shock damage
            targetEnemy.runAttackCooldown = 3.5 + Math.random() * 2.0; // Fair initial delay before first rush
            shard.carrierName = targetEnemy.name;
          }
        });

        const bDef = this.world.biome.boss;
        this.hud.addLog(`🔮 DIRECTIVE: Hunt the 4 Symbol-Carriers and decipher the Ancient Monolith to summon ${bDef.name}!`, 'alert');
      }
    }

    // Reset Objectives, Swarm Director & Escape State
    this.kills = 0;
    this.targetKills = Math.min(35, Math.max(8, Math.floor(this.enemies.length * 0.45) + loop * 2));
    this.puzzleDone = false;
    this.bossDone = false;

    this.swarmTimer = Math.max(14, 28 + Math.random() * 10 - loop * 3.5);
    this.activeSwarmEnemies = [];
    this.swarmWaveCount = 0;

    this.escapeSequenceActive = false;
    this.escapeTimer = 20.0;
    this.escapePortal = null;
    this.collapseIntensity = 0;
    this.bossArenaBreached = sectorId === 'void_dimension';
    this.hud.hideEscapeTimer();
    this.extractionSequenceState = {
      active: false,
      phase: 'idle',
      timer: 0,
      heroTeleportDuration: 0.75,
      portalCloseDelay: 0.55,
      portalClosingDuration: 0.45,
      totalDuration: 1.75,
      portalX: 0,
      portalY: 0,
      heroStartX: 0,
      heroStartY: 0
    };

    this.hud.setSector(this.world.biome, loop, diffMult, this.enemies.length);
    soundEngine.startBackgroundMusic(sectorId);

    // Tactical Event Log
    this.hud.addLog(`🗺️ Sector Topology: ${this.world.layoutDisplayName}`, 'system');
    if (sectorId === 'void_dimension') {
      this.hud.addLog(`✦ ENTERED THE EMPTY VOID: Wall-free arena! Slay the 6 Boss Incarnations and the Final Void Overlord!`, 'level');
    } else if (loop > 0) {
      this.hud.addLog(`🔥 OVERDRIVE ROUND ${loop + 1}: ${this.world.biome.name} [Hardness x${diffMult.toFixed(2)} • +${Math.round(loop * 35)}% Enemies]`, 'rune');
      this.hud.addLog(`Bounties: +${Math.round(loop * 30)}% Scrap, +${Math.round(loop * 25)}% XP per kill`, 'loot');
    } else {
      this.hud.addLog(`Deployed into ${this.world.biome.name} (Stage 0${this.world.biome.order})`, 'system');
      this.hud.addLog(`Protocols: Slay ${this.world.biome.boss.name} & Neutralize Void Rifts`, 'system');
    }

    // 4. Smoothly finalize loading transition and reveal HUD
    this.loadingScreen.updateProgress(1.0, 'WARP COMPLETE // ENTERING REALM');
    this.hud.show();
    this.inGame = true;
    await this.loadingScreen.hide(350);
  }

  // Ukonvasara AoE Damage & Stun Wave
  private triggerUkonvasaraAoE() {
    if (!this.player) return;
    this.camera.addShake(1.8, 0.12);
    this.hud.addLog('Cast [1] Ukonvasara: Lightning EMP Shockwave', 'skill');

    this.enemies.forEach(e => {
      if (e.isDead) return;
      const dx = e.x - this.player!.x;
      const dy = e.y - this.player!.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 4.5) {
        const res = combatEngine.calculateDamage(
          {
            damage: 45 + this.player!.level * 10,
            damageType: 'shock',
            critChance: 25,
            vaki: this.player!.stats.vaki,
            nokkela: this.player!.stats.nokkela
          },
          { armor: e.armor, shield: 0 }
        );

        const died = e.takeDamage(res.finalDamage, 'shock');
        if (died) this.handleEnemyDeath(e);
      }
    });

    this.gateways.forEach(gw => {
      if (gw.isDestroyed) return;
      const dx = gw.x - this.player!.x;
      const dy = gw.y - this.player!.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 4.5) {
        const destroyed = gw.takeDamage(55 + this.player!.level * 10);
        if (destroyed) this.handleGatewayDestruction(gw);
      }
    });
  }

  private handleGatewayDestruction(gw: VoidGateway) {
    if (!this.player) return;
    const loop = this.getSectorLoop(this.currentSectorId);
    const xpMult = 1.0 + (loop * 0.25);
    const scrapMult = (1.0 + (loop * 0.30)) * (this.player.appearance.archetype === 'runoseppä' ? 1.35 : 1.0);
    const xpGained = Math.round((60 + this.player.level * 10) * xpMult);
    const scrapGained = Math.round(8 * scrapMult);
    const prevLvl = this.player.level;
    this.player.gainXP(xpGained);
    if (this.player.level > prevLvl) {
      this.hud.addLog(`★ LEVEL UP! Advanced to Level ${this.player.level} (+1 Stat Point)`, 'level');
    }
    this.player.naniteScrap += scrapGained;
    this.hud.addLog(`★ VOID RIFT DESTROYED: ${gw.name}! (+${xpGained} XP, +${scrapGained} Scrap)`, 'level');
    this.savePlayer();
  }


  private handleEnemyDeath(e: Enemy) {
    if (!this.player || !this.world) return;
    this.kills++;

    // Visceral Biomechanical Rupture / Bone Crunch Death SFX & Tiny tactile death shake
    soundEngine.playEnemyDeath(e.isBoss, e.isElite);
    this.camera.addShake(e.isBoss ? 2.5 : (e.isElite ? 0.9 : 0.45), 0.08);

    const loop = this.getSectorLoop(this.currentSectorId);
    const xpMult = 1.0 + (loop * 0.25);
    const scrapMult = (1.0 + (loop * 0.30)) * (this.player.appearance.archetype === 'runoseppä' ? 1.35 : 1.0);

    // XP Reward scaled with Loop Multiplier - tuned down progression
    const baseXP = e.isBoss ? 350 : e.isElite ? 75 : 20;
    const xpGained = Math.round(baseXP * xpMult);
    const prevLevel = this.player.level;
    this.player.gainXP(xpGained);

    if (this.player.level > prevLevel) {
      this.hud.addLog(`★ LEVEL UP! Advanced to Level ${this.player.level} (+1 Stat Point)`, 'level');
    }

    // Nanite Scrap scaled with Loop Multiplier & Runoseppä Transmutation - tuned down to make upgrades rare
    const baseScrap = e.isBoss ? 45 : e.isElite ? 10 : 3;
    const scrapGained = Math.round(baseScrap * scrapMult);
    this.player.naniteScrap += scrapGained;

    if (e.isBoss) {
      this.hud.addLog(`★ REALM GUARDIAN VANQUISHED: ${e.name}! (+${xpGained} XP, +${scrapGained} Scrap)`, 'level');
    } else if (e.isElite) {
      this.hud.addLog(`Eliminated Elite ${e.name} (+${xpGained} XP, +${scrapGained} Scrap)`, 'kill');
    } else {
      this.hud.addLog(`Neutralized ${e.name} (+${xpGained} XP, +${scrapGained} Scrap)`, 'kill');
    }

    // Broodmother On-Death Spawning: Releases 3 flying hatchling sparks upon rupture (Giant Colossus only, NOT hatchlings!)
    const isGiantBroodmother = !e.name.includes('Wisp') && !e.name.includes('Hatchling') && !e.type.includes('wisp') && (e.type.includes('broodmother') || e.type.includes('matriarch') || e.type.includes('tulipesä'));
    if (isGiantBroodmother && this.enemies.length < 75) {
      const wispCount = 3;
      soundEngine.playExplosion();
      particleSystem.emitShockwave(e.x, e.y, 3.5, '#ea580c');
      this.camera.addShake(0.8, 0.08);

      for (let w = 0; w < wispCount; w++) {
        const ang = (w / wispCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 0.8 + Math.random() * 0.6;
        const wx = e.x + Math.cos(ang) * dist;
        const wy = e.y + Math.sin(ang) * dist;
        const greedMult = 1.0 + (this.vaultGreedCount * 0.05);
        const wispEnemy = new Enemy(
          `hatchling_spark_${Date.now()}_${w}`,
          'Tulikipinä Spark Wisp',
          wx,
          wy,
          Math.round((35 + this.player.level * 3) * greedMult),
          2.6,
          Math.round((16 + this.player.level * 2) * greedMult),
          '#f97316',
          true,
          false,
          false,
          false
        );
        wispEnemy.isRanged = true;
        wispEnemy.damageType = 'fire';
        this.enemies.push(wispEnemy);
      }
    }

    // Check if Enemy was carrying an Ancient Magic Symbol Cipher Shard!
    if (e.hasRuneShard && e.runeShard && !e.runeShard.isCollected) {
      e.runeShard.isCollected = true;
      const shard = e.runeShard;
      const primaryPuzzle = this.puzzles[0];
      const collectedCount = primaryPuzzle ? primaryPuzzle.getCollectedShardsCount() : 1;
      const posRoman = ['I', 'II', 'III', 'IV'][shard.positionIndex];

      soundEngine.playRunicShardAcquired();
      particleSystem.emitShockwave(e.x, e.y, 3.5, '#f59e0b');
      particleSystem.emitShockwave(e.x, e.y, 5.0, '#38bdf8');
      for (let k = 0; k < 16; k++) {
        particleSystem.emitRunicGlyph(e.x, e.y, '#f59e0b');
        particleSystem.emitRunicGlyph(e.x, e.y, '#38bdf8');
      }

      this.hud.addLog(`🔮 CIPHER SHARD RECOVERED: [Pos ${posRoman}] = ${shard.glyph} (${shard.name})! [${collectedCount}/4 Decrypted]`, 'rune');

      if (primaryPuzzle && primaryPuzzle.isAllShardsCollected()) {
        const bDef = this.world.biome.boss;
        const isFinalStage = this.currentSectorId === 'ylinen' || this.currentSectorId === 'void_dimension' || this.world.biome.order >= 6;

        soundEngine.playRunicCipherComplete();
        this.camera.addShake(2.5, 0.2);

        // Huge shockwaves and golden particle burst at player & puzzle location
        particleSystem.emitShockwave(this.player.x, this.player.y, 8.0, '#f59e0b');
        particleSystem.emitShockwave(this.player.x, this.player.y, 14.0, '#38bdf8');
        particleSystem.emitShockwave(primaryPuzzle.x, primaryPuzzle.y, 12.0, '#f59e0b');
        particleSystem.emitBeacon(primaryPuzzle.x, primaryPuzzle.y, '#f59e0b');

        for (let k = 0; k < 32; k++) {
          particleSystem.emitRunicGlyph(this.player.x, this.player.y, '#f59e0b');
          particleSystem.emitRunicGlyph(this.player.x, this.player.y, '#38bdf8');
          particleSystem.emitRunicGlyph(primaryPuzzle.x, primaryPuzzle.y, '#f59e0b');
        }

        combatEngine.addFloatingText(this.player.x, this.player.y, '⚡ ALL MAGIC SYMBOLS ASSEMBLED! MONOLITH UNSEALED ⚡', 'crit');
        this.hud.addLog(`👑 SUPREME CIPHER HARMONY: All 4 ancient magic symbols connected!`, 'rune');
        this.hud.addLog(`🎯 DIRECTIVE: Track the Ancient Monolith on your Radar / Waypoint to decipher protocol and awaken ${bDef.name}!`, 'alert');

        // Show Fullscreen Cinematic Banner Notification
        this.hud.showRunicCompleteBanner(
          primaryPuzzle.puzzleData.shards,
          bDef.name,
          isFinalStage,
          () => {
            if (this.player) {
              combatEngine.addFloatingText(this.player.x, this.player.y, '🔮 TRACKING ANCIENT MONOLITH ➔', 'crit');
            }
          }
        );
      }
    }

    // Drop loot
    const drops = e.generateDrop(this.player.level);
    drops.forEach(item => {
      this.givePlayerLoot(item, e.x, e.y);
    });

    if (e.isBoss) {
      if (this.isStage6BossRushActive) {
        if (this.omegaBossIndex < this.OMEGA_BOSS_DEFINITIONS.length - 1) {
          this.omegaBossIndex++;
          soundEngine.playExplosion();
          soundEngine.playSyntysanatAnvil();
          this.camera.addShake(3.0, 0.25);
          particleSystem.emitShockwave(e.x, e.y, 12.0, '#c084fc');
          this.spawnOmegaBoss(this.omegaBossIndex);
          return;
        } else {
          // Final Form (Surma-Musta Void Mist Overlord) vanquished!
          this.isStage6BossRushActive = false;
          this.bossDone = true;
          this.hud.hideBossBar();

          this.camera.addShake(4.0, 0.35);
          soundEngine.playLevelUp();
          soundEngine.playSyntysanatAnvil();
          particleSystem.emitShockwave(e.x, e.y, 22.0, '#c084fc');
          particleSystem.emitShockwave(e.x, e.y, 30.0, '#fbbf24');
          for (let i = 0; i < 40; i++) {
            particleSystem.emitPixelGlitch(e.x + (Math.random() - 0.5) * 16, e.y + (Math.random() - 0.5) * 16, '#fde047');
          }

          this.hud.addLog(`👑 SUPREME CONQUEST: You have vanquished Surma-Musta and reconstructed the Eternal Cosmic Sampo!`, 'level');

          // Drop Supreme Mythic Relic
          const mythicSampo: Item = {
            id: 'relic_true_sampo_omega',
            name: 'The True Shattered Sampo Matrix',
            slot: 'relic',
            type: 'armor',
            rarity: 'relic',
            level: this.player.level + 5,
            icon: 'sampo_matrix',
            armor: 35,
            healthMax: 150,
            shieldMax: 250,
            affixes: [
              '+50% Omnipotent Elemental Damage',
              '+40 Sisu & Väki Supreme Keystones',
              '+30% Cooldown Reduction & Quantum Shield Regen',
              'The Eternal Forge of Universal Abundance'
            ],
            sockets: [
              { type: 'fire', filled: true },
              { type: 'frost', filled: true },
              { type: 'shock', filled: true },
              { type: 'void', filled: true }
            ],
            description: 'The shattered pieces of the mythic Sampo reconstituted into an eternal infinite fusion matrix.',
            naniteValue: 1000
          };
          this.givePlayerLoot(mythicSampo, e.x, e.y);

          this.checkSectorCompletion();
          return;
        }
      }

      // Eradicate and disintegrate all remaining non-boss minions across the map!
      let removedMinions = 0;
      for (const mob of this.enemies) {
        if (!mob.isBoss && !mob.isDead) {
          mob.isDead = true;
          mob.health = 0;
          removedMinions++;
          particleSystem.emitPixelGlitch(mob.x, mob.y, '#9333ea');
          particleSystem.emitShockwave(mob.x, mob.y, 1.4, '#c084fc');
        }
      }
      this.enemies = this.enemies.filter(enemy => enemy.isBoss && !enemy.isDead);
      if (removedMinions > 0) {
        this.hud.addLog(`⚡ SATELLITE NETWORK OVERLOAD: All hostile minions dematerialized across the sector!`, 'system');
      }

      this.bossDone = true;

      // Only Map 6 ('ylinen' Celestial Forge) triggers the Reality Fracture into the 2D Side-Scroller!
      // Maps 1, 2, 3, 4, 5 (ilman_luominen, vainola, pohjola, tuonela, alinen) proceed with standard extraction.
      if (this.currentSectorId === 'ylinen') {
        this.triggerRealityFractureTransition(e.x, e.y, 'tuonela_chasm');
      } else {
        this.startEscapeSequence(e.x, e.y);
      }
    }
  }

  // Gives loot to player with automatic salvage recycling on overflow (30/30)
  public givePlayerLoot(item: Item, sourceX: number, sourceY: number) {
    if (!this.player) return;

    if (this.player.inventory.length < 30) {
      this.player.inventory.push(item);
      soundEngine.playLootDrop(item.rarity === 'masterwork' || item.rarity === 'relic');
      this.hud.addLog(`Acquired: ${item.name} [${item.rarity.toUpperCase()}]`, 'loot');
    } else {
      // Auto-Salvage Recycling Overflow
      let scrapValue = item.naniteValue || (6 * (item.level || 1));
      if (this.player.appearance.archetype === 'runoseppä') {
        scrapValue = Math.round(scrapValue * 1.35);
      }
      this.player.naniteScrap += scrapValue;
      soundEngine.playScrapPickup();
      this.hud.addLog(`🎒 Backpack Full: ${item.name} auto-recycled into +${scrapValue} Nanite Scrap!`, 'loot');
    }
  }

  // Awakens & Materializes the Sector Sovereign Boss upon Deciphering the Runic Monolith
  public spawnSectorBoss(sourceX?: number, sourceY?: number) {
    if (!this.world || !this.player || this.boss || this.bossDone) return;

    const loop = this.getSectorLoop(this.currentSectorId);
    const diffMult = this.getDifficultyMultiplier(this.currentSectorId, this.sectorRunTime);
    const greedMult = 1.0 + (this.vaultGreedCount * 0.05);
    const timeFactor = 1.0 + (this.sectorRunTime / 60) * 0.05;
    const dmgMult = (1.0 + loop * 0.35) * greedMult * timeFactor;

    const bDef = this.world.biome.boss;
    // Calculate boss start level (boosted start levels for final bosses)
    const baseBossLevel = this.world.biome.recommendedLevel ? (this.world.biome.recommendedLevel + 4) : 12;
    const bossLevel = baseBossLevel + loop * 5 + Math.floor(this.sectorRunTime / 90);

    const bossHealth = Math.round(bDef.maxHealth * diffMult);
    
    // Scale boss damage appropriately so final bosses hit with devastating cosmic force
    let baseBossDmg = 18 + bossLevel * 2.8;
    if (this.world.biome.order >= 4) baseBossDmg += 14;
    if (this.world.biome.order >= 5) baseBossDmg += 24;
    if (this.world.biome.order >= 6) baseBossDmg += 38;
    if (this.currentSectorId === 'void_dimension') baseBossDmg += 55;

    const bossDamage = Math.round(baseBossDmg * dmgMult);
    const bossSpeed = 1.60 * (1.0 + Math.min(0.30, loop * 0.05 + (this.sectorRunTime / 300) * 0.04));

    // Spawn point: Safe 7-8 tile offset from monolith so player has room to maneuver
    let spawnX = sourceX !== undefined ? sourceX + (Math.random() > 0.5 ? 7.0 : -7.0) : (this.world.bossPoint ? this.world.bossPoint.x : this.player.x + 7.0);
    let spawnY = sourceY !== undefined ? sourceY - 7.0 : (this.world.bossPoint ? this.world.bossPoint.y : this.player.y - 7.0);

    spawnX = Math.max(3, Math.min(this.world.width - 4, spawnX));
    spawnY = Math.max(3, Math.min(this.world.height - 4, spawnY));

    this.boss = new Enemy(
      bDef.id,
      loop > 0 ? `Overdrive ${bDef.name} (Loop ${loop + 1})` : bDef.name,
      spawnX,
      spawnY,
      bossHealth,
      bossSpeed,
      bossDamage,
      this.world.biome.palette.hazardColor,
      true,
      true,
      true,
      false,
      bossLevel
    );
    const sectorOrder = this.world?.biome?.order || 1;
    if (loop > 0 || sectorOrder >= 2) {
      this.boss.isShielded = true;
      const shieldRatio = sectorOrder >= 5 ? (loop > 0 ? 0.60 : 0.45) : (loop > 0 ? 0.45 : 0.30);
      this.boss.maxShield = Math.round(bossHealth * shieldRatio);
      this.boss.shield = this.boss.maxShield;
    }
    // Initial telegraph / breathing room for player when boss awakens
    this.boss.attackCooldown = 2.4;
    this.boss.specialAttackTimer = 5.0;

    this.enemies.push(this.boss);
    this.bossDone = false;

    // Cataclysmic Boss Awakening SFX & Screen Effects
    this.camera.addShake(4.5, 0.35);
    soundEngine.playBossRoar();
    soundEngine.playSyntysanatAnvil();
    soundEngine.playExplosion();
    soundEngine.playRunicCast();

    particleSystem.emitShockwave(spawnX, spawnY, 14.0, this.world.biome.palette.hazardColor);
    particleSystem.emitShockwave(spawnX, spawnY, 22.0, '#ef4444');
    particleSystem.emitBeacon(spawnX, spawnY, this.world.biome.palette.hazardColor);

    if (sourceX !== undefined && sourceY !== undefined) {
      particleSystem.emitShockwave(sourceX, sourceY, 12.0, '#f59e0b');
      particleSystem.emitBeacon(sourceX, sourceY, '#f59e0b');
    }

    for (let k = 0; k < 40; k++) {
      const rx = spawnX + (Math.random() - 0.5) * 16;
      const ry = spawnY + (Math.random() - 0.5) * 16;
      particleSystem.emitPixelGlitch(rx, ry, this.world.biome.palette.hazardColor);
      particleSystem.emitSparks(rx, ry, 0.45, '#facc15', 3);
    }

    // Reveal boss & monolith arena in Fog of War
    const arenaCenterX = sourceX !== undefined ? sourceX : spawnX;
    const arenaCenterY = sourceY !== undefined ? sourceY : spawnY;
    if (this.fog) {
      this.fog.revealArea(arenaCenterX, arenaCenterY, 18);
    }

    combatEngine.addFloatingText(spawnX, spawnY, `👑 ${bDef.name.toUpperCase()} AWAKENED! 👑`, 'crit');
    this.hud.addLog(`🚨 REALM GUARDIAN AWAKENED: ${this.boss.name}! Monolith containment shattered into open Colosseum!`, 'alert');
    this.hud.showBossBar(this.boss.name, bDef.title, bossLevel);
    this.hud.updateBossHealth(bossHealth, bossHealth);
    this.hud.hideMonolithNavigation();

    const isFinalStage = this.currentSectorId === 'ylinen' || this.currentSectorId === 'void_dimension' || this.world.biome.order >= 6;
    this.hud.showBossAwakeningBanner(this.boss.name, bDef.title, isFinalStage);

    // Shatter containment barriers into open Colosseum around the Runic Monolith
    this.triggerBossArenaBreach(arenaCenterX, arenaCenterY);
  }

  // Dynamic Arena Breach: Demolishes perimeter walls into open Colosseum around center
  public triggerBossArenaBreach(centerX?: number, centerY?: number) {
    if (!this.world) return;
    this.bossArenaBreached = true;

    const bx = Math.round(centerX !== undefined ? centerX : (this.boss ? this.boss.x : this.player!.x));
    const by = Math.round(centerY !== undefined ? centerY : (this.boss ? this.boss.y : this.player!.y));
    const breachRadius = 16;

    let shatteredCount = 0;
    for (let y = Math.max(1, by - breachRadius); y <= Math.min(this.world.height - 2, by + breachRadius); y++) {
      for (let x = Math.max(1, bx - breachRadius); x <= Math.min(this.world.width - 2, bx + breachRadius); x++) {
        const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
        if (dist <= breachRadius) {
          if (this.world.tiles[y][x] === TileType.WALL || this.world.tiles[y][x] === TileType.HAZARD) {
            this.world.tiles[y][x] = TileType.FLOOR;
            shatteredCount++;
          }
        }
      }
    }

    // Invalidate obstacle render cache so demolished walls disappear
    TileRenderer.clearObstacleCache();

    // Reveal fog in the entire arena
    this.fog?.revealArea(bx, by, breachRadius + 2);

    // Audio & Screen FX
    soundEngine.playExplosion();
    soundEngine.playSyntysanatAnvil();
    this.camera.addShake(2.5, 0.2);

    // Massive demolition debris particles
    particleSystem.emitShockwave(bx, by, 10.0, this.world.biome.palette.hazardColor);
    particleSystem.emitShockwave(bx, by, 15.0, '#f59e0b');
    for (let i = 0; i < 40; i++) {
      const rx = bx + (Math.random() - 0.5) * 22;
      const ry = by + (Math.random() - 0.5) * 22;
      particleSystem.emitPixelGlitch(rx, ry, this.world.biome.palette.hazardColor);
      particleSystem.emitSparks(rx, ry, 0.45, '#facc15', 3);
    }

    combatEngine.addFloatingText(bx, by, '⚔️ ARENA BREACH // BARRIERS SHATTERED! ⚔️', 'crit');
  }

  // Post-Boss Realm Collapse & Dimensional Evacuation Sequence
  private startEscapeSequence(bossX: number, bossY: number) {
    if (!this.world || !this.player) return;

    this.escapeSequenceActive = true;
    this.collapseIntensity = 0;

    if (this.currentSectorId === 'ylinen') {
      this.isStage6SingularityEscape = true;
      this.escapeTimer = 22.0;
      this.maxEscapeTime = 22.0;
      this.gateDisplacementCooldown = 0;
    } else {
      this.isStage6SingularityEscape = false;
      this.escapeTimer = 45.0;
      this.maxEscapeTime = 45.0;
    }

    // Pick designated escape point from world generator, or calculate distant room
    let bestPoint = this.world.escapePoint ? { ...this.world.escapePoint } : { x: this.world.spawnPoint.x, y: this.world.spawnPoint.y };
    if (!this.world.escapePoint) {
      let maxDist = 0;
      for (const room of this.world.rooms) {
        const dx = room.centerX - bossX;
        const dy = room.centerY - bossY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxDist) {
          maxDist = d;
          bestPoint = { x: room.centerX, y: room.centerY };
        }
      }
    }

    this.escapePortal = bestPoint;
    this.fog!.revealArea(bestPoint.x, bestPoint.y, 6);

    // Audio & Screen Effects
    soundEngine.startCollapseSoundscape();
    this.camera.addShake(2.2, 0.18);

    particleSystem.emitBeacon(this.escapePortal.x, this.escapePortal.y, this.isStage6SingularityEscape ? '#c084fc' : '#38bdf8');
    particleSystem.emitShockwave(this.escapePortal.x, this.escapePortal.y, 6.0, this.isStage6SingularityEscape ? '#c084fc' : '#38bdf8');

    this.hud.showEscapeTimer();
    if (this.isStage6SingularityEscape) {
      this.hud.addLog(`🚨 REALITY MATRIX SHATTERING: Singularity anomaly detected! Extraction Gate is unstable and fleeing!`, 'alert');
    } else {
      this.hud.addLog(`🚨 REALM COLLAPSE IMMINENT! Singularity forming in 35.0s! Follow the Radar Beacon to Extraction Portal!`, 'alert');
    }
  }

  // Triggered when Stage 6 Reality Collapse occurs or after surviving the 2D Side-Scroller
  public triggerStage6SingularityClimax() {
    this.inGame = true;
    this.hud.show();
    this.mainMenuUI.hide();
    this.pauseMenuUI.hide();
    if (this.platformerMode && this.platformerMode.isActive) {
      this.platformerMode.isActive = false;
    }
    this.escapeSequenceActive = false;
    this.escapePortal = null;
    this.collapseIntensity = 0;
    this.hud.hideEscapeTimer();
    soundEngine.stopCollapseSoundscape(false);

    // 1. Cataclysmic screen explosion & reality shatter
    this.camera.addShake(4.5, 0.35);
    soundEngine.playExplosion();
    soundEngine.playSyntysanatAnvil();
    soundEngine.playLevelUp();
    soundEngine.playRunicCast();

    if (this.player) {
      for (let i = 0; i < 60; i++) {
        const rx = this.player.x + (Math.random() - 0.5) * 26;
        const ry = this.player.y + (Math.random() - 0.5) * 26;
        particleSystem.emitPixelGlitch(rx, ry, Math.random() > 0.5 ? '#c084fc' : '#38bdf8');
      }
      particleSystem.emitShockwave(this.player.x, this.player.y, 20.0, '#c084fc');
      particleSystem.emitShockwave(this.player.x, this.player.y, 32.0, '#ef4444');
      combatEngine.addFloatingText(this.player.x, this.player.y, '🌌 REALITY SHATTERED // ENTERING THE EMPTY VOID 🌌', 'crit');
    }

    this.hud.addLog(`💀 THE REALM HAS COLLAPSED: Spacetime disintegrates into the Boundless Primordial Void!`, 'alert');

    // 2. Generate Empty Void Map (70x70, all floor, NO internal walls, NO normal enemies)
    const seed = Math.floor(Math.random() * 1000000);
    this.currentSectorId = 'void_dimension';
    this.world = DungeonGenerator.generate(seed, 'void_dimension', 70);

    // Clear all previous world elements
    projectileManager.clear();
    this.chests = [];
    this.puzzles = [];
    this.gateways = [];
    this.enemies = [];
    this.boss = null;
    this.bossDone = false;
    this.bossArenaBreached = true;
    TileRenderer.clearObstacleCache();

    // Fog of War: full reveal across the whole void arena
    this.fog = new FogOfWar(this.world.width, this.world.height);
    this.fog.revealArea(this.world.spawnPoint.x, this.world.spawnPoint.y, 75, true);
    const isWallInit = (x: number, y: number) => {
      if (!this.world) return true;
      if (x < 0 || x >= this.world.width || y < 0 || y >= this.world.height) return true;
      return this.world.tiles[y][x] === TileType.WALL;
    };
    this.fog.update(this.world.spawnPoint.x, this.world.spawnPoint.y, 0, 0.016, isWallInit);

    // Reposition player in the center of the void arena with refreshed shield
    if (this.player) {
      this.player.x = this.world.spawnPoint.x;
      this.player.y = this.world.spawnPoint.y;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.setMovement(0, 0);
      this.player.health = Math.max(this.player.health, Math.round(this.player.maxHealth * 0.85));
      this.player.shield = this.player.maxShield;
      this.camera.snapTo(this.player.x, this.player.y);
    }

    // Set void atmospheric lighting and music
    lightingEngine.setBiomeAmbient('void_dimension');
    soundEngine.startBackgroundMusic('void_dimension');

    const loop = this.getSectorLoop('void_dimension');
    const diffMult = this.getDifficultyMultiplier('void_dimension');
    this.hud.setSector(this.world.biome, loop, diffMult);
    this.hud.showSwarmAlert(7, 'THE EMPTY VOID // BOSS OMEGA CLIMAX');
    this.hud.addLog(`✦ ENTERED THE EMPTY VOID: Wall-free arena! Slay the 6 Boss Incarnations and the Final Void Overlord!`, 'level');

    // 3. Initiate the Boss Rush
    this.isStage6BossRushActive = true;
    this.omegaBossIndex = 0;
    this.spawnOmegaBoss(0);
  }

  public spawnOmegaBoss(index: number) {
    if (!this.player || !this.world) return;
    const def = this.OMEGA_BOSS_DEFINITIONS[index];
    if (!def) return;

    const loop = this.getSectorLoop('void_dimension');
    const diffMult = this.getDifficultyMultiplier(this.currentSectorId, this.sectorRunTime);
    const hp = Math.round(def.health * diffMult);
    const dmg = Math.round(def.damage * diffMult);
    const bossLevel = def.level + loop * 5 + Math.floor(this.sectorRunTime / 90);

    const spawnAng = Math.random() * Math.PI * 2;
    let bx = this.player.x + Math.cos(spawnAng) * 7.5;
    let by = this.player.y + Math.sin(spawnAng) * 7.5;
    bx = Math.max(5, Math.min(this.world.width - 6, bx));
    by = Math.max(5, Math.min(this.world.height - 6, by));

    const newBoss = new Enemy(
      def.id,
      def.name,
      bx,
      by,
      hp,
      def.speed,
      dmg,
      def.color,
      def.ranged,
      true,
      true,
      false,
      bossLevel
    );

    if (index >= 2 || loop > 0) {
      newBoss.isShielded = true;
      newBoss.maxShield = Math.round(hp * (index >= 5 ? 0.50 : 0.35));
      newBoss.shield = newBoss.maxShield;
    }

    this.boss = newBoss;
    this.enemies = [newBoss];
    this.bossDone = false;

    // Metamorphosis FX
    this.camera.addShake(2.5, 0.2);
    soundEngine.playRunicCast();
    soundEngine.playLevelUp();
    particleSystem.emitShockwave(bx, by, 12.0, def.color);
    for (let i = 0; i < 35; i++) {
      particleSystem.emitPixelGlitch(bx + (Math.random() - 0.5) * 8, by + (Math.random() - 0.5) * 8, def.color);
    }

    combatEngine.addFloatingText(bx, by, `★ INCARNATION ${index + 1}/7 [LVL ${bossLevel}]: ${def.name} ★`, 'crit');
    this.hud.addLog(`⚔️ VOID AWAKENING: [${index + 1}/7 - LVL ${bossLevel}] ${def.name} materialized in the Void!`, 'alert');
    this.hud.showBossBar(def.name, def.subtitle, bossLevel);
    this.hud.updateBossHealth(hp, hp);
  }

  private startExtractionSequence() {
    if (!this.escapeSequenceActive || !this.escapePortal || !this.player || this.extractionSequenceState.active) return;

    this.escapeSequenceActive = false;
    this.collapseIntensity = 0;
    this.hud.hideEscapeTimer();
    soundEngine.stopCollapseSoundscape(true);

    const portalX = this.escapePortal.x;
    const portalY = this.escapePortal.y;

    this.player.isInvulnerable = true;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.setMovement(0, 0);

    this.extractionSequenceState = {
      active: true,
      phase: 'teleporting_hero',
      timer: 0,
      heroTeleportDuration: 0.75,
      portalCloseDelay: 0.55,
      portalClosingDuration: 0.45,
      totalDuration: 1.75,
      portalX: portalX,
      portalY: portalY,
      heroStartX: this.player.x,
      heroStartY: this.player.y
    };

    soundEngine.playLevelUp();
    this.camera.addShake(1.8, 0.15);
    combatEngine.addFloatingText(this.player.x, this.player.y, '★ TRANSCENDING REALM... ★', 'crit');
    particleSystem.emitBeacon(portalX, portalY, '#38bdf8');
    particleSystem.emitShockwave(portalX, portalY, 6.0, '#38bdf8');
    this.hud.addLog(`★ ENTERING THE ASTRAL GATEWAY: Dematerializing vessel for dimensional jump...`, 'level');
  }

  private handleEscapeFailure() {
    if (!this.escapeSequenceActive) return;

    this.escapeSequenceActive = false;
    this.escapePortal = null;
    this.collapseIntensity = 0;
    this.hud.hideEscapeTimer();

    soundEngine.stopCollapseSoundscape(false);
    this.camera.addShake(3.0, 0.25);
    this.hud.addLog(`💥 REALM COLLAPSED! Singularity imploded before extraction! Vessel lost in the void.`, 'alert');
    combatEngine.addFloatingText(this.player!.x, this.player!.y, '💥 REALM COLLAPSED!', 'crit');

    this.isDefeated = true;
    if (this.player) {
      this.player.isDead = true;
      this.player.health = 0;
      this.player.shield = 0;
      for (let i = 0; i < 20; i++) {
        particleSystem.emitPixelGlitch(this.player.x, this.player.y, '#ef4444');
      }
    }

    setTimeout(() => {
      this.showCollapseDefeatModal();
    }, 1000);
  }

  private checkSectorCompletion() {
    if (this.bossDone) {
      const isFirstClear = !this.clearedSectors.includes(this.currentSectorId);
      if (isFirstClear) {
        this.clearedSectors.push(this.currentSectorId);
      }

      // Increment sector mastery clear count & save to persistent storage
      this.sectorClears[this.currentSectorId] = (this.sectorClears[this.currentSectorId] || 0) + 1;

      this.savePlayer();
      soundEngine.playLevelUp();
      this.hud.addLog(`★ REALM CONQUERED! Vector secured, advancing to next saga realm.`, 'level');

      // Show Saga Victory & Realm Progression Modal after a short delay
      setTimeout(() => {
        this.showVictoryModal();
      }, 350);
    }
  }

  // Dynamic Random Swarm Incursion Spawner (Spawns swift horde charging from just beyond screen)
  private triggerRandomSwarmWave() {
    if (!this.player || !this.world || this.bossDone || this.escapeSequenceActive || this.isStage6BossRushActive || this.currentSectorId === 'void_dimension') return;

    const loop = this.getSectorLoop(this.currentSectorId);
    const timeFactor = 1.0 + (this.sectorRunTime / 60) * 0.05;
    const diffMult = this.getDifficultyMultiplier(this.currentSectorId, this.sectorRunTime);
    const dmgMult = (1.0 + (loop * 0.28)) * timeFactor * (1.0 + (this.vaultGreedCount * 0.05));
    const speedMult = 1.0 + Math.min(0.45, loop * 0.07 + (this.sectorRunTime / 300) * 0.04);

    const timeSwarmBonus = Math.floor(this.sectorRunTime / 45); // +1 hostiles per 45s run time
    const roundSwarmBonus = loop * 3; // +3 hostiles per round
    const waveSize = 5 + Math.floor(Math.random() * 4) + Math.min(4, this.world.biome.order) + roundSwarmBonus + timeSwarmBonus;
    const px = this.player.x;
    const py = this.player.y;
    const baseAngle = Math.random() * Math.PI * 2;
    const spawned: Enemy[] = [];

    const isWall = (x: number, y: number) => {
      const gx = Math.floor(x);
      const gy = Math.floor(y);
      if (gx < 0 || gx >= this.world!.width || gy < 0 || gy >= this.world!.height) return true;
      return this.world!.tiles[gy][gx] === TileType.WALL;
    };

    const baseEnemyLevel = Math.max(1, (this.world.biome.recommendedLevel || 1) + loop * 3);

    for (let i = 0; i < waveSize; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.2;
      const dist = 9.0 + Math.random() * 4.0; // 9 to 13 tiles away (just beyond viewport)
      let sx = Math.round(px + Math.cos(angle) * dist);
      let sy = Math.round(py + Math.sin(angle) * dist);

      sx = Math.max(3, Math.min(this.world.width - 4, sx));
      sy = Math.max(3, Math.min(this.world.height - 4, sy));

      if (isWall(sx, sy)) {
        let found = false;
        for (let r = 1; r <= 6 && !found; r++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            for (let dy = -r; dy <= r && !found; dy++) {
              const nx = sx + dx;
              const ny = sy + dy;
              if (!isWall(nx, ny)) {
                sx = nx;
                sy = ny;
                found = true;
              }
            }
          }
        }
      }

      const enemyPool = this.world.biome.enemyPool;
      const ep = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const isElite = Math.random() < (0.25 + Math.min(0.35, loop * 0.06));
      const swarmEnemyLevel = baseEnemyLevel + 1 + (isElite ? 2 : 0) + Math.floor(this.sectorRunTime / 60);

      const swarmEnemy = new Enemy(
        `swarm_${this.swarmWaveCount}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        isElite ? (loop > 0 ? `Overdrive Vanguard Elite ${ep.name}` : `Vanguard Elite ${ep.name}`) : `Vanguard ${ep.name}`,
        sx,
        sy,
        Math.round(ep.health * diffMult * (isElite ? 1.45 : 0.95)),
        ep.speed * 1.4 * speedMult, // Faster rush speed!
        Math.round(ep.damage * 1.25 * dmgMult),
        isElite ? '#f59e0b' : ep.color,
        ep.ranged,
        ep.isMech,
        false,
        isElite,
        swarmEnemyLevel
      );

      swarmEnemy.isSwarm = true; // Persistent hunter aggro!
      swarmEnemy.state = 'aggro';
      this.enemies.push(swarmEnemy);
      spawned.push(swarmEnemy);

      // Visual warp distortion at spawn point
      particleSystem.emitBeacon(sx, sy, '#ef4444');
      particleSystem.emitShockwave(sx, sy, 3.0, '#ef4444');
      combatEngine.addFloatingText(sx, sy, '⚡ WARP INVASION', 'shock');
    }

    this.activeSwarmEnemies = spawned;
    this.swarmWaveCount++;

    // Audio & HUD Announcements
    soundEngine.playExplosion();
    soundEngine.playRunicCast();
    this.camera.addShake(1.5, 0.12);
    this.hud.showSwarmAlert(waveSize, this.world.biome.name);
    this.hud.addLog(`🚨 SWARM INVASION: ${waveSize} Vanguard hostiles surged through warp perimeter!`, 'alert');
  }

  // Player Defeat, Collapse & Victory Handling
  private defeatModalEl: HTMLElement | null = null;
  private collapseModalEl: HTMLElement | null = null;
  private isDefeated: boolean = false;
  private deathSequenceState = {
    active: false,
    phase: 'idle' as 'idle' | 'hitstop' | 'exploding' | 'defeated',
    timer: 0,
    pauseDuration: 0.42, // dramatic freeze/pause on fatal hit
    totalDuration: 3.2,  // total slow-mo explosion animation before modal
    fatalInfo: null as FatalDamageInfo | null
  };

  private handlePlayerDeath(fatalInfo?: FatalDamageInfo) {
    if (!this.inGame || !this.player || this.isDefeated || this.deathSequenceState.active) return;
    this.isDefeated = true;
    this.player.isDying = true;
    this.player.health = 0;
    this.player.shield = 0;

    // Immediately terminate all background music, ambient drones, loops, and gameplay audio
    soundEngine.stopAllSounds(0.02);

    const resolvedFatal: FatalDamageInfo = fatalInfo || this.player.lastFatalDamage || {
      killerName: 'Corrupted Hostile Entity',
      damageType: 'physical',
      amount: 0
    };

    this.player.lastFatalDamage = resolvedFatal;
    this.deathSequenceState = {
      active: true,
      phase: 'hitstop',
      timer: 0,
      pauseDuration: 0.42,
      totalDuration: 3.2,
      fatalInfo: resolvedFatal
    };

    // Phase 1: Fatal Hit-Stop & Time Freeze Sound (cuts through pure silence)
    soundEngine.playHeroDeathHitStop();
    this.camera.targetZoom = 0.85;
    this.camera.addShake(1.5, 0.15);
    this.hud.addLog(`💀 VESSEL DESTROYED: Breached by ${resolvedFatal.killerName} (-${resolvedFatal.amount} HP [${String(resolvedFatal.damageType).toUpperCase()}])!`, 'alert');
  }

  private showDefeatModal() {
    soundEngine.stopAllSounds();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();
    this.closeVictoryModal();

    this.defeatModalEl = document.createElement('div');
    this.defeatModalEl.id = 'defeat-modal';
    this.defeatModalEl.className = 'interactive';
    this.defeatModalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(6, 2, 4, 0.72);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #ffffff;
      font-family: var(--font-rune);
      pointer-events: auto;
    `;

    const currentBiome = BIOMES[this.currentSectorId] || BIOMES['ilman_luominen'];
    const fatal = this.deathSequenceState.fatalInfo || this.player?.lastFatalDamage || {
      killerName: 'Corrupted Hostile Entity',
      damageType: 'physical',
      amount: 0
    };

    const dmgTypeStr = String(fatal.damageType || 'physical').toUpperCase();
    const typeColor = {
      FIRE: '#f97316',
      FROST: '#67e8f9',
      SHOCK: '#facc15',
      VOID: '#c084fc',
      PLASMA: '#38bdf8',
      PHYSICAL: '#e2e8f0'
    }[dmgTypeStr] || '#f87171';

    this.defeatModalEl.innerHTML = `
      <div style="
        background: linear-gradient(180deg, rgba(22, 6, 10, 0.97) 0%, rgba(12, 3, 5, 0.98) 100%);
        border: 1.5px solid rgba(239, 68, 68, 0.7);
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(239, 68, 68, 0.3);
        max-width: 290px;
        width: 88%;
        padding: 14px 16px;
        text-align: center;
        position: relative;
        animation: fadeIn 0.25s ease-out;
        pointer-events: auto;
      ">
        <!-- Close [X] Button -->
        <button id="btn-defeat-close-x" title="Close Window (ESC)" style="
          position: absolute;
          top: 8px;
          right: 10px;
          background: none;
          border: none;
          color: #f87171;
          font-size: 18px;
          font-weight: 300;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
          transition: color 0.15s;
        ">&times;</button>

        <div style="font-size: 9px; font-family: var(--font-mono); letter-spacing: 1.5px; color: #f87171; margin-bottom: 2px;">
          ⚠️ VESSEL COLLAPSED
        </div>
        <div style="font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); margin-bottom: 8px;">
          ${this.player ? this.player.name.toUpperCase() : 'OPERATIVE'} FALLEN
        </div>

        <!-- Combat Autopsy Line -->
        <div style="
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          border-radius: 5px;
          padding: 6px 10px;
          margin-bottom: 8px;
          text-align: left;
          font-size: 11px;
        ">
          <div style="color: #f1f5f9; font-weight: 700;">
            Slain by <span style="color: #fca5a5;">${fatal.killerName}</span>
          </div>
          <div style="font-size: 10px; font-family: var(--font-mono); color: #94a3b8; margin-top: 2px;">
            Fatal Hit: <strong style="color: #ffffff;">-${fatal.amount}</strong> <span style="color: ${typeColor}; font-weight: 700;">[${dmgTypeStr}]</span> &bull; ${currentBiome.name}
          </div>
        </div>

        <!-- Compact Stats Bar -->
        <div style="
          display: flex;
          justify-content: space-around;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          padding: 5px 8px;
          margin-bottom: 12px;
          font-family: var(--font-mono);
          font-size: 10px;
        ">
          <div><span style="color: #94a3b8;">LVL </span><strong style="color: #f59e0b; font-size: 11px;">${this.player ? this.player.level : 1}</strong></div>
          <div><span style="color: #94a3b8;">KILLS </span><strong style="color: #ef4444; font-size: 11px;">${this.kills}</strong></div>
          <div><span style="color: #94a3b8;">SCRAP </span><strong style="color: #38bdf8; font-size: 11px;">+${this.player ? this.player.naniteScrap : 0}</strong></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 6px; justify-content: center;">
          <button id="btn-defeat-retry" class="sampo-btn primary" style="background: linear-gradient(135deg, #ef4444, #b91c1c); border-color: #f87171; box-shadow: 0 0 10px rgba(239, 68, 68, 0.35); padding: 7px 12px; font-size: 11px; cursor: pointer; pointer-events: auto; flex: 1;">
            🔄 RETRY
          </button>
          <button id="btn-defeat-menu" class="sampo-btn" style="padding: 7px 12px; font-size: 11px; cursor: pointer; pointer-events: auto; flex: 1;">
            🚀 SAGA COMMAND
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.defeatModalEl);

    const handleReturnToMenu = () => {
      this.closeDefeatModal();
      this.isDefeated = false;
      this.deathSequenceState = {
        active: false,
        phase: 'idle',
        timer: 0,
        pauseDuration: 0.42,
        totalDuration: 3.2,
        fatalInfo: null
      };
      if (this.player) {
        this.player.resetCombatAndDeathState();
      }
      this.onReturnMainMenu();
    };

    document.getElementById('btn-defeat-retry')?.addEventListener('click', () => {
      this.closeDefeatModal();
      this.isDefeated = false;
      this.deathSequenceState = {
        active: false,
        phase: 'idle',
        timer: 0,
        pauseDuration: 0.42,
        totalDuration: 3.2,
        fatalInfo: null
      };
      if (this.player) {
        this.player.resetCombatAndDeathState();
      }
      this.startSector(this.currentSectorId);
    });

    document.getElementById('btn-defeat-menu')?.addEventListener('click', handleReturnToMenu);
    document.getElementById('btn-defeat-close-x')?.addEventListener('click', handleReturnToMenu);
  }

  private closeDefeatModal() {
    if (this.deathTimeout) {
      clearTimeout(this.deathTimeout);
      this.deathTimeout = null;
    }
    if (this.defeatModalEl) {
      this.defeatModalEl.remove();
      this.defeatModalEl = null;
    }
    this.camera.targetZoom = 0.85;
  }

  // Post-Boss Realm Collapse Evacuation Failure Modal
  private showCollapseDefeatModal() {
    soundEngine.stopAllSounds();
    this.closeCollapseDefeatModal();
    this.closeDefeatModal();
    this.closeVictoryModal();

    this.collapseModalEl = document.createElement('div');
    this.collapseModalEl.id = 'collapse-defeat-modal';
    this.collapseModalEl.className = 'interactive';
    this.collapseModalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(6, 2, 4, 0.72);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #ffffff;
      font-family: var(--font-rune);
      pointer-events: auto;
    `;

    const currentBiome = BIOMES[this.currentSectorId] || BIOMES['ilman_luominen'];

    this.collapseModalEl.innerHTML = `
      <div style="
        background: linear-gradient(180deg, rgba(24, 8, 12, 0.97) 0%, rgba(12, 3, 5, 0.98) 100%);
        border: 1.5px solid rgba(239, 68, 68, 0.7);
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8), 0 0 16px rgba(239, 68, 68, 0.3);
        max-width: 290px;
        width: 88%;
        padding: 14px 16px;
        text-align: center;
        position: relative;
        animation: fadeIn 0.25s ease-out;
        pointer-events: auto;
      ">
        <!-- Close [X] Button -->
        <button id="btn-collapse-close-x" title="Close Window (ESC)" style="
          position: absolute;
          top: 8px;
          right: 10px;
          background: none;
          border: none;
          color: #f87171;
          font-size: 18px;
          font-weight: 300;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
          transition: color 0.15s;
        ">&times;</button>

        <div style="font-size: 9px; font-family: var(--font-mono); letter-spacing: 1.5px; color: #f87171; margin-bottom: 2px;">
          ⚠️ TIME EXPIRED
        </div>
        <div style="font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); margin-bottom: 6px;">
          REALM COLLAPSED
        </div>
        <div style="font-size: 10.5px; color: #cbd5e1; line-height: 1.35; margin-bottom: 8px;">
          Extraction portal unreachable in time. Dimensional fabric disintegrated.
        </div>

        <!-- Compact Stats Bar -->
        <div style="
          display: flex;
          justify-content: space-around;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          padding: 5px 8px;
          margin-bottom: 12px;
          font-family: var(--font-mono);
          font-size: 10px;
        ">
          <div><span style="color: #94a3b8;">LVL </span><strong style="color: #f59e0b; font-size: 11px;">${this.player ? this.player.level : 1}</strong></div>
          <div><span style="color: #94a3b8;">KILLS </span><strong style="color: #ef4444; font-size: 11px;">${this.kills}</strong></div>
          <div><span style="color: #94a3b8;">SCRAP </span><strong style="color: #38bdf8; font-size: 11px;">+${this.player ? this.player.naniteScrap : 0}</strong></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 6px; justify-content: center;">
          <button id="btn-collapse-retry" class="sampo-btn primary" style="background: linear-gradient(135deg, #ef4444, #b91c1c); border-color: #f87171; box-shadow: 0 0 10px rgba(239, 68, 68, 0.35); padding: 7px 12px; font-size: 11px; cursor: pointer; pointer-events: auto; flex: 1;">
            🔄 RESTART REALM
          </button>
          <button id="btn-collapse-menu" class="sampo-btn" style="padding: 7px 12px; font-size: 11px; cursor: pointer; pointer-events: auto; flex: 1;">
            🚀 SAGA MENU
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.collapseModalEl);

    const handleReturnCollapse = () => {
      this.closeCollapseDefeatModal();
      this.isDefeated = false;
      this.deathSequenceState = {
        active: false,
        phase: 'idle',
        timer: 0,
        pauseDuration: 0.42,
        totalDuration: 3.2,
        fatalInfo: null
      };
      if (this.player) {
        this.player.resetCombatAndDeathState();
      }
      this.onReturnMainMenu();
    };

    document.getElementById('btn-collapse-retry')?.addEventListener('click', () => {
      this.closeCollapseDefeatModal();
      this.isDefeated = false;
      this.deathSequenceState = {
        active: false,
        phase: 'idle',
        timer: 0,
        pauseDuration: 0.42,
        totalDuration: 3.2,
        fatalInfo: null
      };
      if (this.player) {
        this.player.resetCombatAndDeathState();
      }
      this.startSector(this.currentSectorId);
    });

    document.getElementById('btn-collapse-menu')?.addEventListener('click', handleReturnCollapse);
    document.getElementById('btn-collapse-close-x')?.addEventListener('click', handleReturnCollapse);
  }

  private closeCollapseDefeatModal() {
    if (this.collapseModalEl) {
      this.collapseModalEl.remove();
      this.collapseModalEl = null;
    }
    this.camera.targetZoom = 0.85;
  }

  private showVictoryModal() {
    this.closeVictoryModal();
    this.closeDefeatModal();
    this.closeCollapseDefeatModal();

    const currentBiome = BIOMES[this.currentSectorId] || BIOMES['ilman_luominen'];
    const currentIndex = SAGA_PATH.findIndex(b => b.id === this.currentSectorId);
    const nextBiome = SAGA_PATH[currentIndex + 1];
    const totalClears = this.sectorClears[this.currentSectorId] || 1;
    const nextLoopTier = totalClears + 1;
    const nextDiffMult = 1.0 + (totalClears * 0.40);
    const nextEnemyBonus = Math.round(totalClears * 35);
    const runMins = Math.floor(this.sectorRunTime / 60);
    const runSecs = Math.floor(this.sectorRunTime % 60);
    const runTimeFormatted = `${runMins}m ${runSecs.toString().padStart(2, '0')}s`;

    this.victoryModalEl = document.createElement('div');
    this.victoryModalEl.id = 'victory-modal';
    this.victoryModalEl.className = 'interactive';
    this.victoryModalEl.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(4, 7, 14, 0.90);
      backdrop-filter: blur(12px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.4s ease;
      pointer-events: auto;
    `;

    this.victoryModalEl.innerHTML = `
      <div style="
        position: relative;
        width: 700px; 
        max-width: 92vw; 
        background: rgba(13, 18, 29, 0.98); 
        border: 2px solid var(--gold-runic); 
        border-radius: 10px; 
        padding: 28px; 
        box-shadow: 0 0 40px rgba(245, 158, 11, 0.4), 0 25px 50px rgba(0,0,0,0.9);
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 14px;
        pointer-events: auto;
      ">
        <!-- Close [X] Button -->
        <button id="btn-victory-close-x" title="Close Window (ESC)" style="
          position: absolute;
          top: 14px;
          right: 18px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 26px;
          font-weight: 300;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
          transition: color 0.15s;
        ">&times;</button>

        <div style="font-family:var(--font-mono); font-size:12px; color:var(--cyan-core); letter-spacing:2px; padding-right:20px;">
          ✦ KALEVALA SAGA REALM CONQUERED ✦
        </div>

        <div style="font-family:var(--font-rune); font-size:28px; color:#ffffff; text-shadow:0 0 15px rgba(245, 158, 11, 0.6);">
          ${currentBiome.name}
        </div>

        <div style="font-family:var(--font-mono); font-size:13px; color:var(--gold-runic);">
          ${currentBiome.finnishTitle}
        </div>

        <!-- Lore Quote from Kanteletar / Kalevala -->
        <div style="
          font-size:13px; 
          font-style:italic; 
          color:rgba(255,255,255,0.9); 
          background: rgba(0,0,0,0.6); 
          border-left: 3px solid var(--gold-runic); 
          padding: 12px 16px; 
          border-radius: 4px;
          text-align: left;
          line-height: 1.5;
        ">
          ${currentBiome.kanteletarVerse}
          <div style="font-size:11px; color:var(--text-dim); margin-top:6px; font-style:normal;">
            Boss Defeated: <strong>${currentBiome.boss.name}</strong> — ${currentBiome.boss.quote}
          </div>
        </div>

        <!-- Overdrive Difficulty Scaling Progression Banner -->
        <div style="
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.20) 0%, rgba(239, 68, 68, 0.15) 100%);
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 10px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
        ">
          <div>
            <div style="font-family:var(--font-mono); font-size:11px; color:#fde047; font-weight:700; letter-spacing:1px;">
              🔥 REALM ROUND ${totalClears} CONQUERED (EXPEDITION TIME: ${runTimeFormatted})
            </div>
            <div style="font-family:var(--font-rune); font-size:14px; color:#ffffff; margin-top:2px;">
              Round ${nextLoopTier} Escalation: Hardness <span style="color:#f87171; font-weight:700;">x${nextDiffMult.toFixed(2)}</span> • Hostiles <span style="color:#f87171; font-weight:700;">+${nextEnemyBonus}%</span>
            </div>
          </div>
          <div style="font-family:var(--font-mono); font-size:11px; color:#67e8f9; text-align:right;">
            💰 +${Math.round(totalClears * 30)}% Scrap<br/>⚡ +${Math.round(totalClears * 25)}% XP
          </div>
        </div>

        <!-- Next Realm Unlocked Status & Iron Covenant -->
        <div style="
          background: ${this.currentSectorId === 'void_dimension' ? 'linear-gradient(135deg, rgba(88, 28, 135, 0.35) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(245, 158, 11, 0.25) 100%)' : (nextBiome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.2)')}; 
          border: ${this.currentSectorId === 'void_dimension' ? '2px solid var(--gold-runic)' : (nextBiome ? '1px solid #10b981' : '1px solid #f59e0b')}; 
          border-radius: 8px; 
          padding: 14px 18px;
          ${this.currentSectorId === 'void_dimension' ? 'box-shadow: 0 0 30px rgba(192, 132, 252, 0.35);' : ''}
        ">
          ${
            this.currentSectorId === 'void_dimension'
              ? `<div>
                  <div style="font-family:var(--font-rune); font-size:22px; color:var(--gold-runic); text-shadow:0 0 14px rgba(245, 158, 11, 0.6); letter-spacing:1px;">
                    ⚔️ THE IRON COVENANT OF THE FORGE ⚔️
                  </div>
                  <div style="font-family:var(--font-mono); font-size:11px; color:#38bdf8; letter-spacing:2px; margin-top:2px;">
                    PRIMORDIAL VOID TRANSCENDED // OMEGA TRANSMISSION
                  </div>
                  <div style="
                    font-size:13px;
                    line-height:1.65;
                    color:#e2e8f0;
                    margin-top:12px;
                    text-align:left;
                    background:rgba(0,0,0,0.6);
                    border-left:4px solid var(--gold-runic);
                    padding:12px 16px;
                    border-radius:4px;
                  ">
                    "Operative, you stood against the cold abyss, shattered the six cosmic horrors, and banished Surma-Musta into the void. In your hands, the True Shattered Sampo Matrix hums with eternal, limitless creation.
                    <br/><br/>
                    <strong>The Ancient Blacksmiths offer you the Iron Pact:</strong>
                    <br/>
                    The cycle never sleeps. Beyond the rim of spacetime, darker horrors awaken and the Void Hungers for your marrow. Take your forged arsenal into the <strong>Overdrive Loops</strong> — where swarms are ruthless, bosses strike with lethal overclock, and only true masters of Väki survive.
                    <br/><br/>
                    <span style="color:#fde047; font-weight:bold;">Do you accept the covenant to test your mettle in the harder rounds?</span>"
                  </div>
                 </div>`
              : (nextBiome
                  ? `<div style="font-family:var(--font-mono); font-size:12px; color:#10b981; font-weight:700;">
                      🔓 SAGA ADVANCEMENT UNLOCKED:
                     </div>
                     <div style="font-family:var(--font-rune); font-size:15px; color:#fff; margin-top:2px;">
                       Stage 0${nextBiome.order}: ${nextBiome.name} (<span style="color:var(--gold-runic);">${nextBiome.finnishTitle}</span>)
                     </div>`
                  : `<div style="font-family:var(--font-rune); font-size:18px; color:var(--gold-runic); font-weight:700;">
                      👑 ALL 6 SAGA REALMS CONQUERED!
                     </div>
                     <div style="font-size:12px; color:#ffffff; margin-top:2px;">
                       The celestial Sampo has been fully restored, bathing the cosmos in eternal abundance.
                     </div>`)
          }
        </div>

        <!-- Action Buttons -->
        <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:12px; margin-top:6px;">
          ${
            nextBiome
              ? `<button id="btn-next-realm" class="sampo-btn primary" style="padding:10px 22px; font-size:13px; box-shadow:0 0 20px rgba(56, 189, 248, 0.6); cursor: pointer; pointer-events: auto;">
                  ⚔️ ASCEND TO NEXT REALM (STAGE 0${nextBiome.order})
                 </button>`
              : `<button id="btn-saga-loop" class="sampo-btn primary" style="padding:10px 22px; font-size:13px; box-shadow:0 0 20px rgba(245, 158, 11, 0.8); cursor: pointer; pointer-events: auto;">
                  ${this.currentSectorId === 'void_dimension' ? '⚔️ SIGN THE IRON PACT (START OVERDRIVE LOOP)' : '🌟 LOOP SAGA TO STAGE 01 (OVERDRIVE)'}
                 </button>`
          }
          <button id="btn-replay-overdrive" class="sampo-btn" style="padding:10px 20px; font-size:13px; border-color:#f59e0b; color:#fde047; cursor: pointer; pointer-events: auto;">
            ${this.currentSectorId === 'void_dimension' ? `🔥 REPLAY VOID CLIMAX (ROUND ${nextLoopTier}: x${nextDiffMult.toFixed(2)})` : `🔥 ADVANCE TO ROUND ${nextLoopTier} (x${nextDiffMult.toFixed(2)} • +${nextEnemyBonus}% HOSTILES)`}
          </button>
          <button id="btn-return-map" class="sampo-btn" style="padding:10px 18px; font-size:13px; cursor: pointer; pointer-events: auto;">
            🗺️ SAGA MAP
          </button>
          <button id="btn-victory-close" class="sampo-btn" style="padding:10px 18px; font-size:13px; border-color:#64748b; color:#cbd5e1; cursor: pointer; pointer-events: auto;">
            ✖ CLOSE
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.victoryModalEl);

    // Bind modal actions
    if (nextBiome) {
      document.getElementById('btn-next-realm')?.addEventListener('click', () => {
        this.closeVictoryModal();
        this.startSector(nextBiome.id);
      });
    } else {
      document.getElementById('btn-saga-loop')?.addEventListener('click', () => {
        this.closeVictoryModal();
        this.startSector(SAGA_PATH[0].id);
      });
    }

    document.getElementById('btn-replay-overdrive')?.addEventListener('click', () => {
      this.closeVictoryModal();
      this.startSector(this.currentSectorId);
    });

    const handleCloseModal = () => {
      this.closeVictoryModal();
      this.onReturnMainMenu();
    };

    document.getElementById('btn-return-map')?.addEventListener('click', handleCloseModal);
    document.getElementById('btn-victory-close')?.addEventListener('click', handleCloseModal);
    document.getElementById('btn-victory-close-x')?.addEventListener('click', handleCloseModal);
  }

  private closeVictoryModal() {
    if (this.victoryModalEl) {
      this.victoryModalEl.remove();
      this.victoryModalEl = null;
    }
  }

  // Handle [E] Keyboard Key Environmental Interaction
  private handleInteract() {
    if (!this.player || !this.world) return;

    // 1. Check nearby Loot Chests (Requires WASD Key Sequence Decryption)
    for (const chest of this.chests) {
      if (!chest.isOpened) {
        const dx = this.player.x - chest.x;
        const dy = this.player.y - chest.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 2.2) {
          this.chestLockUI.open(
            chest,
            (decryptedChest) => {
              this.handleChestDecrypted(decryptedChest);
            },
            (blownChest, damage) => {
              // Self-Destruction Detonation Effect
              soundEngine.playExplosion();
              particleSystem.emitShockwave(blownChest.x, blownChest.y, 4.5, '#ef4444');
              for (let i = 0; i < 16; i++) {
                particleSystem.emitSparks(blownChest.x, blownChest.y, 0.6, '#f97316', 3);
              }
              this.camera.addShake(1.8, 0.15);

              // Deal explosive damage to hero
              const res = combatEngine.calculateDamage(
                { damage, damageType: 'fire', critChance: 0, vaki: 0, nokkela: 0 },
                { armor: this.player!.armor, shield: this.player!.shield, isInvulnerable: this.player!.isInvulnerable }
              );
              const died = this.player!.takeDamage(res.finalDamage, 'fire', `${blownChest.displayName} Overload`);
              combatEngine.addFloatingText(this.player!.x, this.player!.y, `-${res.finalDamage} HP 💥 OVERLOAD`, 'physical');
              this.hud.addLog(`💥 VAULT OVERLOAD: ${blownChest.displayName} [${blownChest.chestColor.toUpperCase()} - ${blownChest.hardness.toUpperCase()} HARDNESS] self-destructed! Suffered ${res.finalDamage} explosive damage!`, 'alert');
              this.savePlayer();
              if (died) {
                this.handlePlayerDeath({
                  killerName: `${blownChest.displayName} Overload`,
                  damageType: 'fire',
                  amount: res.finalDamage
                });
              }
            },
            {
              count: this.vaultGreedCount,
              threatBonusPercent: 5
            }
          );
          return;
        }
      }
    }

    // 2. Check nearby Runic Puzzle Pillars
    for (const puzzle of this.puzzles) {
      if (!puzzle.isSolved) {
        const dx = this.player.x - puzzle.x;
        const dy = this.player.y - puzzle.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 2.5) {
          const bDef = this.world.biome.boss;
          this.puzzleUI.open(puzzle, () => {
            this.puzzleDone = true;
            this.hud.hideMonolithNavigation();
            this.hud.addLog(`★ MAGIC PROTOCOL SYNCHRONIZED: ${puzzle.verseTitle} (+150 XP, +25 Scrap)!`, 'rune');
            const prevLvl = this.player!.level;
            this.player!.gainXP(150);
            this.player!.naniteScrap += 25;
            combatEngine.addFloatingText(puzzle.x, puzzle.y, '👑 ALL SECTOR VAULTS UNSEALED!', 'crit');
            if (this.player!.level > prevLvl) {
              this.hud.addLog(`★ LEVEL UP! Advanced to Level ${this.player!.level} (+1 Stat Point)`, 'level');
            }
            this.chests.forEach(c => { if (c.isLocked) c.unlock(); });
            this.hud.addLog('Unlocked all sealed cache vaults in sector!', 'loot');

            // AWAKEN AND MATERIALIZE THE SECTOR BOSS!
            this.spawnSectorBoss(puzzle.x, puzzle.y);

            this.savePlayer();
          }, bDef.name);
          return;
        }
      }
    }
  }

  // Handle successful cyber-vault decryption and trigger the Greed Hardness escalation
  private handleChestDecrypted(decryptedChest: LootChest) {
    const loot = decryptedChest.open();
    this.vaultGreedCount++;
    const totalThreat = this.getVaultGreedThreatPercent();

    this.hud.addLog(`Decrypted ${decryptedChest.displayName} [${decryptedChest.chestColor.toUpperCase()} - ${decryptedChest.hardness.toUpperCase()} HARDNESS] (${decryptedChest.keySequence.length}-Key Sequence)!`, 'loot');
    combatEngine.addFloatingText(decryptedChest.x, decryptedChest.y, `🔓 ${decryptedChest.chestColor.toUpperCase()} CHEST OPENED (${decryptedChest.hardness.toUpperCase()})`, 'crit');
    loot.forEach(item => {
      this.givePlayerLoot(item, decryptedChest.x, decryptedChest.y);
    });

    // Greed Penalty: Permanently harden all active hostiles in the current realm (+5% HP & Damage)
    const statMultiplier = 1.05;
    for (const enemy of this.enemies) {
      if (!enemy.isDead) {
        enemy.maxHealth = Math.round(enemy.maxHealth * statMultiplier);
        enemy.health = Math.min(enemy.maxHealth, Math.round(enemy.health * statMultiplier));
        enemy.damage = Math.round(enemy.damage * statMultiplier);

        // Visual alert and glitch on enemies near the player
        if (this.player && Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y) < 16) {
          particleSystem.emitPixelGlitch(enemy.x, enemy.y, '#ef4444');
        }
      }
    }

    // Audio cue, subtle screen shockwave, and HUD alert for realm threat escalation
    soundEngine.playSpecialCharge();
    this.camera.addShake(1.0, 0.1);
    this.hud.addLog(`⚠️ GREED PENALTY: Realm defenses hardened! Hostiles gained +5% Health & Damage (Total Threat: +${totalThreat}%).`, 'alert');
    if (this.player) {
      combatEngine.addFloatingText(this.player.x, this.player.y - 1.2, `⚠️ ENEMY THREAT ESCALATED (+${totalThreat}%)`, 'crit');
    }

    this.savePlayer();
  }

  private gameLoop(time: number) {
    const rawDt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;

    let dt = rawDt;

    // Manage Death Sequence Progression & Slow-Mo Time Dilation
    if (this.deathSequenceState.active && this.player) {
      this.deathSequenceState.timer += rawDt;

      if (this.deathSequenceState.phase === 'hitstop') {
        // Hit-stop freeze frame time scale
        dt = rawDt * 0.04;

        if (this.deathSequenceState.timer >= this.deathSequenceState.pauseDuration) {
          // Transition to Cataclysmic Detonation
          this.deathSequenceState.phase = 'exploding';
          this.player.isDead = true;
          soundEngine.playHeroExplosionCataclysm();
          particleSystem.emitHeroExplosion(this.player.x, this.player.y, this.player.appearance.archetype);
          this.camera.addShake(2.0, 0.2);
          this.camera.targetZoom = 0.85;
          this.hud.addLog(`💥 VESSEL DETONATED: Cybernetic shell vaporized. Matrix connection collapsing...`, 'alert');
        }
      } else if (this.deathSequenceState.phase === 'exploding') {
        // Cinematic slow-motion for particle & shard scatter
        dt = rawDt * 0.38;

        if (this.deathSequenceState.timer >= this.deathSequenceState.totalDuration) {
          this.deathSequenceState.active = false;
          this.deathSequenceState.phase = 'defeated';
          this.showDefeatModal();
        }
      }
    }

    if (this.platformerMode && this.platformerMode.isActive) {
      if (!this.isAnyModalOpen()) {
        this.platformerMode.update(rawDt);
      }
      this.platformerMode.render();
    } else if (this.inGame && this.world && this.player && this.fog && !this.mainMenuUI.isOpen()) {
      this.update(dt);
      this.render();
    }

    inputManager.postUpdate();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  public holdAttackTimer: number = 0;

  private update(dt: number) {
    if (!this.inGame || !this.player || !this.world || !this.fog) return;
    if (this.isAnyModalOpen()) {
      this.player.setMovement(0, 0);
      return;
    }

    // During active death sequence, freeze player inputs and only update visual fx & camera
    if (this.deathSequenceState.active || this.player.isDying || this.player.isDead) {
      this.player.setMovement(0, 0);
      particleSystem.update(dt);
      combatEngine.update(dt);
      this.camera.setTarget(this.player.x, this.player.y, 0, 0);
      this.camera.update(dt / 0.38);
      return;
    }

    // During active extraction / teleport ascension sequence or after completion:
    if (this.extractionSequenceState.phase !== 'idle' && this.player) {
      this.player.setMovement(0, 0);
      this.player.vx = 0;
      this.player.vy = 0;

      const portalX = this.extractionSequenceState.portalX;
      const portalY = this.extractionSequenceState.portalY;

      if (this.extractionSequenceState.active) {
        this.extractionSequenceState.timer += dt;
        const t = this.extractionSequenceState.timer;
        const heroDuration = this.extractionSequenceState.heroTeleportDuration;
        const closeDelay = this.extractionSequenceState.portalCloseDelay;
        const closeDuration = this.extractionSequenceState.portalClosingDuration;

        if (this.extractionSequenceState.phase === 'teleporting_hero') {
          // Smoothly gravitate player directly towards center of the portal
          const pullProgress = Math.min(1.0, t / (heroDuration * 0.7));
          this.player.x = this.extractionSequenceState.heroStartX + (portalX - this.extractionSequenceState.heroStartX) * pullProgress;
          this.player.y = this.extractionSequenceState.heroStartY + (portalY - this.extractionSequenceState.heroStartY) * pullProgress;

          // Ascending rune sparks and celestial light stream
          if (Math.random() < 0.75) {
            particleSystem.emitSparks(this.player.x + (Math.random() - 0.5) * 0.6, this.player.y + (Math.random() - 0.5) * 0.6, 0.4, '#38bdf8', 3);
            particleSystem.emitPixelGlitch(this.player.x, this.player.y, '#facc15');
          }

          if (t >= heroDuration) {
            // STEP 1: Hero has completely vanished into the gate! The gate stays open.
            this.extractionSequenceState.phase = 'hero_vanished';
            soundEngine.playLevelUp();
            this.camera.addShake(1.0, 0.1);
            particleSystem.emitShockwave(portalX, portalY, 6.0, '#38bdf8');
            particleSystem.emitBeacon(portalX, portalY, '#10b981');
            combatEngine.addFloatingText(portalX, portalY, '★ EXTRACTION SUCCESSFUL! ★', 'crit');
            this.hud.addLog(`★ VESSEL TRANSCENDED! Hero dematerialized into the astral slipstream.`, 'level');
          }
        } else if (this.extractionSequenceState.phase === 'hero_vanished') {
          // STEP 2: Hero is GONE. Gate remains open, humming and swirling with celestial runes.
          if (Math.random() < 0.4) {
            particleSystem.emitSparks(portalX + (Math.random() - 0.5) * 0.8, portalY + (Math.random() - 0.5) * 0.8, 0.5, '#f59e0b', 2);
          }

          if (t >= heroDuration + closeDelay) {
            // STEP 3: Gate begins closing/imploding AFTER the hero is already gone
            this.extractionSequenceState.phase = 'portal_closing';
            soundEngine.playExplosion();
            this.camera.addShake(1.5, 0.15);
            particleSystem.emitShockwave(portalX, portalY, 7.5, '#f59e0b');
          }
        } else if (this.extractionSequenceState.phase === 'portal_closing') {
          // Gate shrinking and sealing shut
          if (t >= heroDuration + closeDelay + closeDuration) {
            // STEP 4: Gate is now completely closed
            this.extractionSequenceState.phase = 'completed';
            this.extractionSequenceState.active = false;
            this.escapePortal = null;
            particleSystem.emitShockwave(portalX, portalY, 4.0, '#38bdf8');

            // Present Victory Progression Modal
            this.checkSectorCompletion();
          }
        }
      }

      particleSystem.update(dt);
      combatEngine.update(dt);
      this.camera.setTarget(portalX, portalY, 0, 0);
      this.camera.update(dt);
      return;
    }

    // Accumulate elapsed expedition run time
    this.sectorRunTime += dt;

    // 1. Player Input & Aiming
    const mouseWorld = this.camera.screenToWorld(inputManager.mouseScreen.x, inputManager.mouseScreen.y);
    this.player.angle = Math.atan2(mouseWorld.y - this.player.y, mouseWorld.x - this.player.x);

    // Special Attack on Right Click
    if (inputManager.justClickedRight && !this.isAnyModalOpen()) {
      const cast = this.player.triggerSpecialAttack(mouseWorld.x, mouseWorld.y);
      if (cast) {
        this.camera.addShake(1.0, 0.08);
      }
    }

    // Primary Attack & Hold-to-Charge Special on Left Click
    if (inputManager.isMouseDownLeft && !this.isAnyModalOpen()) {
      this.holdAttackTimer += dt;

      // When held down for >= 0.45s and special is ready, charge the special!
      if (this.holdAttackTimer >= 0.45 && this.player.specialCooldown <= 0) {
        if (!this.player.isChargingSpecial) {
          this.player.startChargingSpecial();
        }
        if (this.player.specialChargeTime >= this.player.maxSpecialChargeTime) {
          const cast = this.player.triggerSpecialAttack(mouseWorld.x, mouseWorld.y);
          if (cast) {
            this.camera.addShake(1.2, 0.10);
            this.holdAttackTimer = 0;
          }
        }
      } else if (!this.player.isChargingSpecial) {
        const attackResults = this.player.attack(mouseWorld.x, mouseWorld.y);
        if (attackResults && attackResults.length > 0) {
          let maxShake = 0;
          let maxShakeDur = 0;

          for (const attackRes of attackResults) {
            if (!attackRes || !attackRes.performed) continue;
            const px = this.player.x;
            const py = this.player.y;

            if (attackRes.style === 'heavy_hammer_slam' || attackRes.style === 'area_slag_slam') {
              // HEAVY HAMMER / SLAG SLAM: Full 360° Seismic Ground Quake & Proximity Pulverization
              const slamRadius = attackRes.radius || 3.6;
              const dmgType = attackRes.damageType || 'fire';
              const slamColors: Record<string, { shockwave: string; decal: string; particles: string }> = {
                fire: { shockwave: '#f97316', decal: 'rgba(234, 88, 12, 0.45)', particles: '#ea580c' },
                frost: { shockwave: '#38bdf8', decal: 'rgba(2, 132, 199, 0.45)', particles: '#38bdf8' },
                shock: { shockwave: '#facc15', decal: 'rgba(202, 138, 4, 0.45)', particles: '#facc15' },
                void: { shockwave: '#c084fc', decal: 'rgba(147, 51, 234, 0.45)', particles: '#a855f7' },
                plasma: { shockwave: '#38bdf8', decal: 'rgba(56, 189, 248, 0.45)', particles: '#38bdf8' },
                physical: { shockwave: '#94a3b8', decal: 'rgba(71, 85, 105, 0.45)', particles: '#64748b' }
              };
              const fx = slamColors[dmgType] || slamColors.fire;

              maxShake = Math.max(maxShake, 1.2);
              maxShakeDur = Math.max(maxShakeDur, 0.10);
              particleSystem.spawnShockwave(px, py, slamRadius, fx.shockwave);
              particleSystem.spawnDecal(px, py, slamRadius * 0.9, fx.decal, 4.0);
              particleSystem.spawn(px, py, 18, fx.particles);

              // Hit ALL enemies in radius with distance-based knockback & close-quarters bonus
              this.enemies.forEach(e => {
                if (e.isDead) return;
                const dx = e.x - px;
                const dy = e.y - py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= slamRadius) {
                  const res = combatEngine.calculateDamage(
                    {
                      damage: attackRes.damage,
                      damageType: dmgType,
                      critChance: dist <= 2.0 ? 25 : 15,
                      vaki: this.player!.stats.vaki,
                      nokkela: this.player!.stats.nokkela,
                      attackerArchetype: this.player!.appearance.archetype,
                      isCloseQuarters: dist <= 2.0,
                      distanceFromAttacker: dist
                    },
                    { armor: e.armor, shield: 0 }
                  );

                  particleSystem.spawn(e.x, e.y, 8, fx.shockwave);

                  // Heavy knockback away from center
                  const knockAngle = Math.atan2(e.y - py, e.x - px);
                  const knockDist = dist <= 2.0 ? 0.65 : 0.35;
                  e.x += Math.cos(knockAngle) * knockDist;
                  e.y += Math.sin(knockAngle) * knockDist;

                  const died = e.takeDamage(res.finalDamage, dmgType, attackRes.shieldDamageBonus || 0);
                  if (e.isBoss && !this.bossArenaBreached) {
                    this.triggerBossArenaBreach();
                  }
                  if (died) this.handleEnemyDeath(e);
                }
              });

              // Gateways in area
              this.gateways.forEach(gw => {
                if (gw.isDestroyed) return;
                const dx = gw.x - px;
                const dy = gw.y - py;
                if (Math.sqrt(dx * dx + dy * dy) <= slamRadius) {
                  const res = combatEngine.calculateDamage(
                    {
                      damage: attackRes.damage,
                      damageType: dmgType,
                      critChance: 15,
                      vaki: this.player!.stats.vaki,
                      nokkela: this.player!.stats.nokkela,
                      attackerArchetype: this.player!.appearance.archetype,
                      isCloseQuarters: true
                    },
                    { armor: gw.armor, shield: 0 }
                  );
                  const destroyed = gw.takeDamage(res.finalDamage);
                  if (destroyed) this.handleGatewayDestruction(gw);
                }
              });

            } else if (attackRes.style === 'vibro_blade_slash') {
              maxShake = Math.max(maxShake, 0.3);
              maxShakeDur = Math.max(maxShakeDur, 0.04);
            } else if (attackRes.style === 'plasma_sword_cleave' || attackRes.style === 'lightning_cleave') {
              maxShake = Math.max(maxShake, 0.5);
              maxShakeDur = Math.max(maxShakeDur, 0.05);
            } else if (attackRes.style === 'rail_rifle_shot') {
              maxShake = Math.max(maxShake, 0.6);
              maxShakeDur = Math.max(maxShakeDur, 0.05);
            } else if (attackRes.style === 'scatter_shot_blast') {
              maxShake = Math.max(maxShake, 0.7);
              maxShakeDur = Math.max(maxShakeDur, 0.06);
            } else if (attackRes.style === 'lyric_rune_chime') {
              maxShake = Math.max(maxShake, 0.35);
              maxShakeDur = Math.max(maxShakeDur, 0.04);
            } else if (attackRes.style === 'death_ray' && attackRes.targetX !== undefined && attackRes.targetY !== undefined) {
              // Concentrated Tuoni Death Ray Beam & Life Siphon
              const tx = attackRes.targetX;
              const ty = attackRes.targetY;
              const bdx = tx - px;
              const bdy = ty - py;
              const blen = Math.sqrt(bdx * bdx + bdy * bdy);
              const maxRayDist = 8.5;
              const ndx = blen > 0 ? bdx / blen : 1;
              const ndy = blen > 0 ? bdy / blen : 0;

              let totalSiphoned = 0;
              this.enemies.forEach(e => {
                if (e.isDead) return;
                const ex = e.x - px;
                const ey = e.y - py;
                const proj = ex * ndx + ey * ndy;
                if (proj >= 0 && proj <= maxRayDist) {
                  const perpDist = Math.abs(ex * (-ndy) + ey * ndx);
                  if (perpDist <= 0.85) {
                    const res = combatEngine.calculateDamage(
                      {
                        damage: attackRes.damage,
                        damageType: 'void',
                        critChance: 18,
                        vaki: this.player!.stats.vaki,
                        nokkela: this.player!.stats.nokkela,
                        attackerArchetype: this.player!.appearance.archetype
                      },
                      { armor: e.armor, shield: 0 }
                    );
                    particleSystem.spawn(e.x, e.y, 6, '#c084fc');

                    // Life & Shield Siphon
                    const siphon = Math.max(1, Math.floor(res.finalDamage * (attackRes.siphonPercent || 0.25)));
                    totalSiphoned += siphon;

                    const died = e.takeDamage(res.finalDamage, 'void', attackRes.shieldDamageBonus || 0);
                    if (e.isBoss && !this.bossArenaBreached) {
                      this.triggerBossArenaBreach();
                    }
                    if (died) this.handleEnemyDeath(e);
                  }
                }
              });

              // Siphon life back to player
              if (totalSiphoned > 0) {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + totalSiphoned);
                this.player.shield = Math.min(this.player.maxShield, this.player.shield + Math.floor(totalSiphoned * 0.5));
                combatEngine.addFloatingText(px, py - 0.5, `+${totalSiphoned} HP`, 'heal');
                particleSystem.spawn(px, py, 6, '#10b981');
              }

              // Gateways hit by death ray
              this.gateways.forEach(gw => {
                if (gw.isDestroyed) return;
                const gx = gw.x - px;
                const gy = gw.y - py;
                const proj = gx * ndx + gy * ndy;
                if (proj >= 0 && proj <= maxRayDist) {
                  const perpDist = Math.abs(gx * (-ndy) + gy * ndx);
                  if (perpDist <= 1.0) {
                    const res = combatEngine.calculateDamage(
                      {
                        damage: attackRes.damage,
                        damageType: 'void',
                        critChance: 15,
                        vaki: this.player!.stats.vaki,
                        nokkela: this.player!.stats.nokkela,
                        attackerArchetype: this.player!.appearance.archetype
                      },
                      { armor: gw.armor, shield: 0 }
                    );
                    const destroyed = gw.takeDamage(res.finalDamage);
                    if (destroyed) this.handleGatewayDestruction(gw);
                  }
                }
              });

              maxShake = Math.max(maxShake, 0.35);
              maxShakeDur = Math.max(maxShakeDur, 0.05);
            }
          }

          if (maxShake > 0) {
            this.camera.addShake(maxShake, maxShakeDur);
          }
        }
      }
    } else {
      // Mouse released: check if releasing charged special attack
      if (this.player && this.player.isChargingSpecial) {
        const cast = this.player.releaseSpecial(mouseWorld.x, mouseWorld.y);
        if (cast) {
          this.camera.addShake(1.2, 0.10);
        }
      }
      this.holdAttackTimer = 0;
    }

    // Player movement (WASD / Arrow Keys or Middle Mouse Button Navigation)
    const isWall = (x: number, y: number) => {
      const gx = Math.floor(x);
      const gy = Math.floor(y);
      if (gx < 0 || gx >= this.world!.width || gy < 0 || gy >= this.world!.height) return true;
      return this.world!.tiles[gy][gx] === TileType.WALL;
    };

    let move = inputManager.getMovementVector();

    // Middle Mouse Button Navigation: Move towards mouse pointer
    if (inputManager.isMouseDownMiddle) {
      const toMouseX = mouseWorld.x - this.player.x;
      const toMouseY = mouseWorld.y - this.player.y;
      const dist = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);

      if (dist > 0.35) {
        move = { dx: toMouseX / dist, dy: toMouseY / dist };
      } else {
        move = { dx: 0, dy: 0 };
      }

      if (inputManager.justClickedMiddle) {
        particleSystem.emitShockwave(mouseWorld.x, mouseWorld.y, 0.7, '#38bdf8');
      }
    }

    this.player.setMovement(move.dx, move.dy);
    this.player.update(dt, isWall);

    if (this.player.health <= 0 && !this.isDefeated) {
      this.handlePlayerDeath(this.player.lastFatalDamage || undefined);
    }

    // Camera follow
    this.camera.setTarget(this.player.x, this.player.y, mouseWorld.x - this.player.x, mouseWorld.y - this.player.y);
    this.camera.update(dt);

    // Update Fog of War with directional sight projection & wall occlusion
    this.fog.update(this.player.x, this.player.y, this.player.angle, dt, (x, y) => isWall(x, y));

    // Update Random Swarm Wave Director
    if (!this.bossDone) {
      this.swarmTimer -= dt;
      if (this.swarmTimer <= 0) {
        this.triggerRandomSwarmWave();
        this.swarmTimer = 35 + Math.random() * 20; // Next swarm wave in 35-55s
      }
    }

    // Check if Active Swarm Wave Was Decimated
    if (this.activeSwarmEnemies.length > 0) {
      const remaining = this.activeSwarmEnemies.filter(e => !e.isDead);
      if (remaining.length === 0) {
        this.activeSwarmEnemies = [];
        const bonusXp = 50 + this.world!.biome.order * 15;
        const bonusScrap = 12 + this.world!.biome.order * 4;
        const prevLvl = this.player.level;
        this.player.gainXP(bonusXp);
        this.player.naniteScrap += bonusScrap;
        soundEngine.playLevelUp();
        this.hud.addLog(`★ SWARM DECIMATED! Awarded +${bonusXp} XP & +${bonusScrap} Scrap!`, 'level');
        combatEngine.addFloatingText(this.player.x, this.player.y, `★ SWARM CLEARED (+${bonusXp} XP) ★`, 'heal');
        if (this.player.level > prevLvl) {
          this.hud.addLog(`★ LEVEL UP! Advanced to Level ${this.player.level} (+1 Stat Point)`, 'level');
        }
        this.savePlayer();
      } else {
        this.activeSwarmEnemies = remaining;
      }
    }

    // Update Void Spawner Gateways & Check Vision Triggers
    this.gateways.forEach(gw => {
      if (!gw.isDestroyed) {
        const dx = this.player!.x - gw.x;
        const dy = this.player!.y - gw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isVisibleInFog = this.fog!.isVisible(gw.x, gw.y);

        const justActivated = gw.checkVisionTrigger(isVisibleInFog, dist);
        if (justActivated) {
          this.camera.addShake(1.0, 0.1);
          this.hud.addLog(`⚠️ ALERT: ${gw.name} ACTIVATED! Swarm Spawner Online!`, 'alert');
        }

        // Gateway Spawning loop
        gw.update(dt, (sx, sy) => {
          if (this.escapeSequenceActive || this.isStage6BossRushActive || this.currentSectorId === 'void_dimension' || this.bossDone) return;
          const ep = this.world!.biome.enemyPool[0] || {
            type: 'hound_scout',
            name: 'Void Swarm Minion',
            health: 35,
            speed: 2.2,
            damage: 12,
            color: '#ef4444',
            ranged: false,
            isMech: false
          };

          const greedMult = 1.0 + (this.vaultGreedCount * 0.05);
          const minion = new Enemy(
            'minion_' + ep.type + '_' + Math.random().toString(36).substring(2, 6),
            `Swarm ${ep.name}`,
            sx,
            sy,
            Math.round(ep.health * 0.6 * greedMult),
            ep.speed * 1.25,
            Math.round(ep.damage * 0.75 * greedMult),
            '#f87171',
            ep.ranged,
            ep.isMech,
            false,
            false
          );

          this.enemies.push(minion);
          combatEngine.addFloatingText(sx, sy, '⚡ SWARM SPAWN', 'shock');
        });
      }
    });

    // Update Enemies
    this.enemies.forEach(e => {
      e.update(dt, this.player!.x, this.player!.y, isWall);

      const dx = this.player!.x - e.x;
      const dy = this.player!.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Trigger dynamic arena wall demolition when player approaches the boss
      if (e.isBoss && !e.isDead && !this.bossArenaBreached && dist <= 16.0) {
        this.triggerBossArenaBreach();
      }

      // Boss Supersonic Dash Impact on Player
      if (e.isBoss && !e.isDead && e.isDashing && dist <= (e.radius + this.player!.radius + 0.45)) {
        const res = combatEngine.calculateDamage(
          { damage: Math.round(e.damage * 1.35), damageType: e.damageType, critChance: 15, vaki: 8, nokkela: 8 },
          { armor: this.player!.armor, shield: this.player!.shield, isInvulnerable: this.player!.isInvulnerable }
        );
        soundEngine.playHitImpact(true);
        this.camera.addShake(2.2, 0.15);
        particleSystem.emitShockwave(this.player!.x, this.player!.y, 3.0, e.color);

        // Safe directional knockback away from boss charge
        const dashAng = Math.atan2(e.vy || dy, e.vx || dx);
        const kbDist = 0.85;
        const pad = this.player!.radius * 0.55;
        const targetPx = this.player!.x + Math.cos(dashAng) * kbDist;
        const targetPy = this.player!.y + Math.sin(dashAng) * kbDist;
        if (!isWall(targetPx - pad, this.player!.y) && !isWall(targetPx + pad, this.player!.y)) {
          this.player!.x = targetPx;
        }
        if (!isWall(this.player!.x, targetPy - pad) && !isWall(this.player!.x, targetPy + pad)) {
          this.player!.y = targetPy;
        }

        const died = this.player!.takeDamage(res.finalDamage, res.damageType, `${e.name} [Supersonic Rush]`);
        if (died) {
          this.handlePlayerDeath({
            killerName: `${e.name} [Supersonic Rush]`,
            damageType: res.damageType,
            amount: res.finalDamage,
            isCrit: res.isCrit
          });
        }
      }

      // Rune Holder Run Attack Impact on Player (Tuned damage & fair recovery window)
      if (!e.isDead && e.hasRuneShard && e.isRunAttacking && dist <= (e.radius + this.player!.radius + 0.45)) {
        const res = combatEngine.calculateDamage(
          { damage: Math.round(e.damage * 1.08), damageType: e.damageType || 'shock', critChance: 8, vaki: 4, nokkela: 4 },
          { armor: this.player!.armor, shield: this.player!.shield, isInvulnerable: this.player!.isInvulnerable }
        );
        soundEngine.playHitImpact(true);
        this.camera.addShake(0.9, 0.08);
        particleSystem.emitShockwave(this.player!.x, this.player!.y, 2.0, '#f59e0b');
        particleSystem.emitSparks(this.player!.x, this.player!.y, 0.35, '#facc15', 4);

        // Safe directional knockback away from the run attacker
        const kbDist = 0.45;
        const pad = this.player!.radius * 0.55;
        const targetPx = this.player!.x + Math.cos(e.angle) * kbDist;
        const targetPy = this.player!.y + Math.sin(e.angle) * kbDist;
        if (!isWall(targetPx - pad, this.player!.y) && !isWall(targetPx + pad, this.player!.y)) {
          this.player!.x = targetPx;
        }
        if (!isWall(this.player!.x, targetPy - pad) && !isWall(this.player!.x, targetPy + pad)) {
          this.player!.y = targetPy;
        }

        const died = this.player!.takeDamage(res.finalDamage, res.damageType, `${e.name} [Run Attack]`);
        if (died) {
          this.handlePlayerDeath({
            killerName: `${e.name} [Run Attack]`,
            damageType: res.damageType,
            amount: res.finalDamage,
            isCrit: res.isCrit
          });
        }
        e.isRunAttacking = false;
        e.attackCooldown = 1.2; // Grace period to prevent immediate melee double-hit
        e.runAttackCooldown = 4.5 + Math.random() * 1.5;
      }

      // Melee enemy attack on player (accurate reach, crisp single-hit per swing)
      if (!e.isDead && !e.isRanged && (e.lungeTimer > 0 || e.isPouncing || (e.hasRuneShard && e.state === 'attack'))) {
        const meleeReach = e.isBoss ? 2.5 : (e.hasRuneShard ? 1.85 : (e.type.includes('hound') || e.type.includes('wolf') ? 2.8 : 1.75));
        if (dist <= meleeReach && !e.meleeHitDone && e.lungeTimer > 0.04) {
          e.meleeHitDone = true;
          const meleeDamage = e.shield > 0 ? Math.round(e.damage * 1.30) : e.damage;
          const res = combatEngine.calculateDamage(
            { damage: meleeDamage, damageType: e.damageType, critChance: (e.shield > 0 ? 14 : 8), vaki: 6, nokkela: 6 },
            { armor: this.player!.armor, shield: this.player!.shield, isInvulnerable: this.player!.isInvulnerable }
          );
          soundEngine.playHitImpact(true);
          this.camera.addShake(1.0, 0.08);
          particleSystem.emitSplatter(this.player!.x, this.player!.y, e.color, false);
          particleSystem.emitSparks(this.player!.x, this.player!.y, 0.3, '#f87171', 4);

          // Safe impact pushback
          const hitAng = Math.atan2(this.player!.y - e.y, this.player!.x - e.x);
          const kbDist = 0.18;
          const pad = this.player!.radius * 0.55;
          const targetPx = this.player!.x + Math.cos(hitAng) * kbDist;
          const targetPy = this.player!.y + Math.sin(hitAng) * kbDist;
          if (!isWall(targetPx - pad, this.player!.y) && !isWall(targetPx + pad, this.player!.y)) {
            this.player!.x = targetPx;
          }
          if (!isWall(this.player!.x, targetPy - pad) && !isWall(this.player!.x, targetPy + pad)) {
            this.player!.y = targetPy;
          }

          const died = this.player!.takeDamage(res.finalDamage, res.damageType, e.name);
          if (died) {
            this.handlePlayerDeath({
              killerName: e.name,
              damageType: res.damageType,
              amount: res.finalDamage,
              isCrit: res.isCrit
            });
          }
        }
      }
    });

    // Only acquire targets if player has active homing projectiles
    let livingTargets: { x: number; y: number }[] | undefined = undefined;
    const hasHoming = projectileManager.projectiles.some(p => p.homing && p.fromPlayer);
    if (hasHoming) {
      livingTargets = [];
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (!e.isDead && (!this.fog || this.fog.isVisible(e.x, e.y))) {
          livingTargets.push(e);
        }
      }
      for (let i = 0; i < this.gateways.length; i++) {
        const gw = this.gateways[i];
        if (!gw.isDestroyed && (!this.fog || this.fog.isVisible(gw.x, gw.y))) {
          livingTargets.push(gw);
        }
      }
    }

    // Update Projectiles & Check Hits
    projectileManager.update(
      dt,
      this.player ? { x: this.player.x, y: this.player.y } : undefined,
      isWall,
      (p) => {
        if (p.style === 'homing_missile') {
          soundEngine.playExplosion();
          particleSystem.emitShockwave(p.x, p.y, 2.0, '#f97316');
          particleSystem.emitSparks(p.x, p.y, 0.4, '#facc15', 8);
        } else {
          particleSystem.emitSparks(p.x, p.y, 0.3, p.color, 4);
        }
      },
      livingTargets
    );

    // Check Projectile Collisions (Optimized O(1) swap-and-pop, squared distance)
    const projs = projectileManager.projectiles;
    for (let pi = projs.length - 1; pi >= 0; pi--) {
      const p = projs[pi];
      let projectileRemoved = false;

      if (p.fromPlayer) {
        // Hits on enemies
        for (let ei = 0; ei < this.enemies.length; ei++) {
          const e = this.enemies[ei];
          if (e.isDead) continue;
          if (p.hitEntityIds && p.hitEntityIds.has(e.id)) continue;

          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const maxReach = e.radius + p.radius;

          if (dx * dx + dy * dy <= maxReach * maxReach) {
            if (p.hitEntityIds) {
              p.hitEntityIds.add(e.id);
            }

            let baseDamage = p.damage;
            let isPointBlank = false;

            // Distance-based proximity damage calculation for Aegis Shield Wave & falloff attacks
            if (p.damageFalloff && p.startX !== undefined && p.startY !== undefined) {
              const distFromOrigin = Math.hypot(e.x - p.startX, e.y - p.startY);
              let distMult = 1.0;

              if (distFromOrigin <= 1.4) {
                // Point-Blank Melee Strike (Up to 220% massive kinetic smash!)
                distMult = 2.2;
                isPointBlank = true;
              } else if (distFromOrigin <= 2.8) {
                // Close Range (150% down to 100%)
                distMult = 1.5 - ((distFromOrigin - 1.4) / 1.4) * 0.5;
              } else if (distFromOrigin <= 4.5) {
                // Mid Range (100% down to 55%)
                distMult = 1.0 - ((distFromOrigin - 2.8) / 1.7) * 0.45;
              } else {
                // Extended / Dispersal Range (55% down to 35%)
                distMult = Math.max(0.35, 0.55 - ((distFromOrigin - 4.5) / 2.0) * 0.2);
              }

              baseDamage = Math.round(p.damage * distMult);
            }

            const distFromPlayer = Math.hypot(e.x - this.player!.x, e.y - this.player!.y);
            const res = combatEngine.calculateDamage(
              {
                damage: baseDamage,
                damageType: p.damageType,
                critChance: isPointBlank ? 35 : (p.style === 'homing_missile' ? 25 : 10),
                vaki: this.player!.stats.vaki,
                nokkela: this.player!.stats.nokkela,
                attackerArchetype: this.player!.appearance.archetype,
                isCloseQuarters: isPointBlank,
                distanceFromAttacker: distFromPlayer
              },
              { armor: e.armor, shield: 0 }
            );

            if (isPointBlank) {
              soundEngine.playHitImpact(true);
              this.camera.addShake(0.7, 0.06);
              particleSystem.emitShockwave(e.x, e.y, 2.0, '#facc15');
              for (let k = 0; k < 10; k++) {
                particleSystem.emitSparks(e.x, e.y, 0.4, '#facc15', 2);
              }
              // Strong Point-Blank Knockback (Shielded enemies resist knockback)
              if (!e.shield || e.shield <= 0) {
                const knockAngle = Math.atan2(p.vy, p.vx);
                e.x += Math.cos(knockAngle) * 0.55;
                e.y += Math.sin(knockAngle) * 0.55;
              }
            } else if (p.style === 'aegis_shield_wave') {
              soundEngine.playHitImpact(false);
              particleSystem.emitSparks(e.x, e.y, 0.25, '#38bdf8', 4);
              if (!e.shield || e.shield <= 0) {
                const knockAngle = Math.atan2(p.vy, p.vx);
                e.x += Math.cos(knockAngle) * 0.25;
                e.y += Math.sin(knockAngle) * 0.25;
              }
            } else {
              this.camera.addShake(p.style === 'homing_missile' ? 0.75 : 0.35, 0.05);

              if (p.style === 'homing_missile') {
                soundEngine.playExplosion();
                particleSystem.emitShockwave(e.x, e.y, 2.2, '#f97316');
                for (let k = 0; k < 12; k++) {
                  particleSystem.emitSparks(e.x, e.y, 0.45, '#facc15', 2);
                }
              }
            }

            p.pierceCount--;
            if (p.pierceCount <= 0) {
              projectileManager.recycle(p);
              projs[pi] = projs[projs.length - 1];
              projs.pop();
              projectileRemoved = true;
            }

            const died = e.takeDamage(res.finalDamage, res.damageType, p.shieldDamageBonus || 0);

            // Areal damage shockwave explosion on impact (upgraded weapon AoE)
            if (p.areaRadius && p.areaRadius > 0) {
              particleSystem.emitShockwave(p.x, p.y, p.areaRadius, p.color || '#38bdf8');
              particleSystem.emitSparks(p.x, p.y, 0.35, p.color || '#38bdf8', 4);
              const areaRadSq = p.areaRadius * p.areaRadius;
              for (let oi = 0; oi < this.enemies.length; oi++) {
                const otherE = this.enemies[oi];
                if (otherE.isDead || otherE.id === e.id) continue;
                const adx = otherE.x - p.x;
                const ady = otherE.y - p.y;
                const aDistSq = adx * adx + ady * ady;
                if (aDistSq <= areaRadSq) {
                  const aDist = Math.sqrt(aDistSq);
                  const splashDmg = Math.max(1, Math.round(res.finalDamage * (1.0 - (aDist / p.areaRadius!) * 0.45)));
                  const otherDied = otherE.takeDamage(splashDmg, res.damageType, p.shieldDamageBonus || 0);
                  if (otherDied) this.handleEnemyDeath(otherE);
                }
              }
            }

            if (e.isBoss && !this.bossArenaBreached) {
              this.triggerBossArenaBreach();
            }
            if (died) this.handleEnemyDeath(e);

            if (projectileRemoved) break;
          }
        }

        if (projectileRemoved) continue;

        // Hits on Gateways
        for (let gi = 0; gi < this.gateways.length; gi++) {
          const gw = this.gateways[gi];
          if (gw.isDestroyed) continue;
          if (p.hitEntityIds && p.hitEntityIds.has(gw.id)) continue;

          const dx = gw.x - p.x;
          const dy = gw.y - p.y;
          const maxGwReach = gw.radius + p.radius;
          if (dx * dx + dy * dy <= maxGwReach * maxGwReach) {
            if (p.hitEntityIds) {
              p.hitEntityIds.add(gw.id);
            }

            let baseDamage = p.damage;
            if (p.damageFalloff && p.startX !== undefined && p.startY !== undefined) {
              const distFromOrigin = Math.hypot(gw.x - p.startX, gw.y - p.startY);
              if (distFromOrigin <= 1.4) baseDamage = Math.round(p.damage * 1.8);
              else if (distFromOrigin <= 2.8) baseDamage = p.damage;
              else baseDamage = Math.round(p.damage * 0.65);
            }

            const res = combatEngine.calculateDamage(
              {
                damage: baseDamage,
                damageType: p.damageType,
                critChance: 10,
                vaki: this.player!.stats.vaki,
                nokkela: this.player!.stats.nokkela
              },
              { armor: gw.armor, shield: 0 }
            );

            this.camera.addShake(0.4, 0.05);

            if (p.style === 'homing_missile') {
              soundEngine.playExplosion();
              particleSystem.emitShockwave(gw.x, gw.y, 2.2, '#f97316');
            }

            p.pierceCount--;
            if (p.pierceCount <= 0) {
              projectileManager.recycle(p);
              projs[pi] = projs[projs.length - 1];
              projs.pop();
              projectileRemoved = true;
            }

            const destroyed = gw.takeDamage(res.finalDamage);
            if (destroyed) this.handleGatewayDestruction(gw);

            if (projectileRemoved) break;
          }
        }
      } else {
        // Enemy projectile hits player
        const dx = this.player!.x - p.x;
        const dy = this.player!.y - p.y;
        const maxPlReach = this.player!.radius + p.radius;

        // Direct Hit on Player Body (squared distance check)
        if (dx * dx + dy * dy <= maxPlReach * maxPlReach) {
          const res = combatEngine.calculateDamage(
            { damage: p.damage, damageType: p.damageType, critChance: 8, vaki: 6, nokkela: 6 },
            { armor: this.player!.armor, shield: this.player!.shield, isInvulnerable: this.player!.isInvulnerable }
          );
          const attackerName = p.sourceName || 'Hostile Artillery';
          projectileManager.recycle(p);
          projs[pi] = projs[projs.length - 1];
          projs.pop();
          const died = this.player!.takeDamage(res.finalDamage, res.damageType, attackerName);
          this.camera.addShake(1.0, 0.08);
          if (died) {
            this.handlePlayerDeath({
              killerName: attackerName,
              damageType: res.damageType,
              amount: res.finalDamage,
              isCrit: res.isCrit
            });
          }
        }
      }
    }


    // Update Particles & Floaters
    particleSystem.update(dt);
    combatEngine.update(dt);

    // Update HUD
    const primaryPuzzle = this.puzzles[0];
    this.hud.update(
      this.player,
      this.world.biome,
      this.boss ? {
        name: this.boss.name,
        title: this.world.biome.boss.title,
        health: this.boss.health,
        maxHealth: this.boss.maxHealth,
        isDead: this.boss.isDead,
        level: this.boss.level
      } : undefined,
      {
        puzzleDone: this.puzzleDone,
        kills: this.kills,
        targetKills: this.targetKills,
        bossDone: this.bossDone,
        shardsCollected: primaryPuzzle ? primaryPuzzle.getCollectedShardsCount() : 0,
        totalShards: 4,
        runTime: this.sectorRunTime,
        loop: this.getSectorLoop(this.currentSectorId),
        diffMult: this.getDifficultyMultiplier(this.currentSectorId, this.sectorRunTime),
        activeEnemies: this.enemies.filter(e => !e.isDead).length
      }
    );

    // Update Runic Monolith Waypoint Navigation Beacon (when all 4 runes are gathered and waiting to decipher)
    if (primaryPuzzle && primaryPuzzle.isAllShardsCollected() && !this.puzzleDone && !this.boss && !this.escapeSequenceActive) {
      const mDx = primaryPuzzle.x - this.player.x;
      const mDy = primaryPuzzle.y - this.player.y;
      const mDist = Math.sqrt(mDx * mDx + mDy * mDy);
      const isNearby = mDist <= 2.5;
      const bDef = this.world.biome.boss;
      this.hud.updateMonolithNavigation(mDist, mDx, mDy, isNearby, bDef.name);
    } else {
      this.hud.hideMonolithNavigation();
    }

    if (this.gateDisplacementCooldown > 0) {
      this.gateDisplacementCooldown -= dt;
    }

    // Void Mist Primordial Radiation Aura (Surma-Musta continuous area damage)
    if (this.boss && this.boss.id.includes('void_mist') && !this.boss.isDead && this.player && !this.player.isDead) {
      const vdx = this.player.x - this.boss.x;
      const vdy = this.player.y - this.boss.y;
      const vDist = Math.sqrt(vdx * vdx + vdy * vdy);
      if (vDist <= 5.2) {
        this.voidMistAuraTimer += dt;
        if (this.voidMistAuraTimer >= 0.35) {
          this.voidMistAuraTimer = 0;
          this.player.takeDamage(12, 'void', this.boss.name);
          soundEngine.playDeathRayBeam();
          particleSystem.emitPixelGlitch(this.player.x, this.player.y, '#c084fc');
          combatEngine.addFloatingText(this.player.x, this.player.y, '-12 Void Radiation', 'void');
        }
      }
    }

    // Update Escape Sequence & Realm Collapse Director
    if (this.escapeSequenceActive) {
      this.escapeTimer -= dt;
      this.collapseIntensity = Math.max(0, Math.min(1.0, 1.0 - (this.escapeTimer / this.maxEscapeTime)));

      // Dynamic World-Collapse Audio Director (accelerating singularity heartbeat, screaming alarm filter, glitch static)
      soundEngine.updateCollapseAudio(this.collapseIntensity, this.escapeTimer);

      // Increasing earthquake camera shake as time runs out (calm subtle tremor)
      this.camera.addShake(0.4 + this.collapseIntensity * 1.0, 0.06);

      // Disintegrating simulation reality-tear & digital glitch FX tearing into the void (throttled)
      this.escapeGlitchTimer += dt;
      if (this.escapeGlitchTimer >= 0.05) {
        this.escapeGlitchTimer = 0;
        const glitchCount = Math.floor(1 + this.collapseIntensity * 5);
        for (let i = 0; i < glitchCount; i++) {
          const rx = this.player.x + (Math.random() - 0.5) * 22;
          const ry = this.player.y + (Math.random() - 0.5) * 22;
          particleSystem.emitPixelGlitch(rx, ry);
        }
      }

      // Check Proximity to Escape Portal & Update Navigation Beacon
      let pDist = 0;
      let pDx = 0;
      let pDy = 0;
      if (this.escapePortal) {
        pDx = this.escapePortal.x - this.player.x;
        pDy = this.escapePortal.y - this.player.y;
        pDist = Math.sqrt(pDx * pDx + pDy * pDy);

        // Stage 6 Elusive / Evading Gate Phenomenon (Gate teleports away as player approaches)
        if (this.isStage6SingularityEscape && pDist <= 8.5 && this.gateDisplacementCooldown <= 0) {
          let bestDist = 0;
          let newPoint = { x: this.escapePortal.x, y: this.escapePortal.y };
          for (const room of this.world.rooms) {
            const d = Math.sqrt((room.centerX - this.player.x) ** 2 + (room.centerY - this.player.y) ** 2);
            if (d > bestDist && d > 12) {
              bestDist = d;
              newPoint = { x: room.centerX, y: room.centerY };
            }
          }
          const oldX = this.escapePortal.x;
          const oldY = this.escapePortal.y;
          this.escapePortal = newPoint;
          this.gateDisplacementCooldown = 1.6;

          soundEngine.playRailgunShot();
          soundEngine.playSpecialRelease();
          this.camera.addShake(1.8, 0.15);
          particleSystem.emitShockwave(oldX, oldY, 7.0, '#c084fc');
          particleSystem.emitBeacon(newPoint.x, newPoint.y, '#ef4444');
          combatEngine.addFloatingText(this.player.x, this.player.y, '⚠️ GATE WARPED AWAY! VECTOR DESTABILIZED! ⚠️', 'crit');
          this.hud.addLog(`🚨 DIMENSIONAL ANOMALY: Extraction gate fled across spacetime!`, 'alert');
        } else if (!this.isStage6SingularityEscape && pDist <= 2.2 && !this.extractionSequenceState.active) {
          this.startExtractionSequence();
        }
      }

      this.hud.updateEscapeTimer(this.escapeTimer, this.maxEscapeTime, pDist, pDx, pDy);

      if (this.escapeTimer <= 0 && !this.extractionSequenceState.active) {
        if (this.isStage6SingularityEscape) {
          this.triggerStage6SingularityClimax();
        } else {
          this.handleEscapeFailure();
        }
      }
    }

    // Render Minimap Radar
    const minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (minimapCanvas) {
      this.fog.renderMinimap(
        minimapCanvas,
        this.world.tiles,
        this.player,
        this.enemies,
        this.chests,
        this.puzzles,
        this.gateways,
        this.escapePortal
      );
    }
  }

  private render() {
    if (!this.world || !this.fog || !this.player) return;

    this.renderer.render(
      this.world,
      this.fog,
      this.player,
      this.enemies,
      this.chests,
      this.puzzles,
      this.gateways,
      projectileManager,
      particleSystem,
      combatEngine,
      lightingEngine,
      this.escapePortal,
      this.collapseIntensity,
      this.escapeTimer,
      this.deathSequenceState,
      this.extractionSequenceState
    );
  }
}

// Boot game on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new SampoGame();
});
