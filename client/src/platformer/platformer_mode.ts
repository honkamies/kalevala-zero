// Master Platformer Side-Scroller Coordinator & Action Combat Loop with Colossal R-Type Boss

import { PlatformerCamera } from './platformer_camera';
import { PlatformerRenderer } from './platformer_renderer';
import { PlatformerGenerator } from './platformer_generator';
import { PlatformerLevel, PlatformTileType } from './platformer_types';
import { PlatformerPlayerController } from './platformer_player';
import { PlatformerEnemy } from './platformer_enemy';
import { ColossalRTypeBoss } from './platformer_boss';
import { Player } from '../entities/player';
import { projectileManager } from '../entities/projectile';
import { particleSystem } from '../engine/particles';
import { combatEngine } from '../systems/combat';
import { soundEngine } from '../engine/audio';
import { inputManager } from '../engine/input';
import { HUD } from '../ui/hud';
import { BIOMES } from '../world/biomes';

export class PlatformerMode {
  private canvas: HTMLCanvasElement;
  private lightCanvas: HTMLCanvasElement;
  private hud: HUD;

  public camera: PlatformerCamera;
  public renderer: PlatformerRenderer;
  public level: PlatformerLevel | null = null;
  public playerCtrl: PlatformerPlayerController | null = null;
  public enemies: PlatformerEnemy[] = [];
  public boss: PlatformerEnemy | null = null;
  public colossalBoss: ColossalRTypeBoss | null = null;

  public isActive: boolean = false;
  public isCompleted: boolean = false;
  public isDefeated: boolean = false;
  public deathTimer: number = 0;
  private onExitCallback: (won?: boolean) => void;

  // Swarm Collapse Horde Surge (Wall of Enemies Left to Right)
  public isHordeSurging: boolean = false;
  public hordeWallX: number = 0;
  public hordeSpawnTimer: number = 0;
  public hordeShotTimer: number = 0;

  // Shooting & Combat Timers
  private shootCooldownTimer: number = 0;
  private readonly SHOOT_RATE: number = 0.13; // Fast, responsive plasma fire
  private meleeCooldownTimer: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    lightCanvas: HTMLCanvasElement,
    hud: HUD,
    onExit: (won?: boolean) => void
  ) {
    this.canvas = canvas;
    this.lightCanvas = lightCanvas;
    this.hud = hud;
    this.onExitCallback = onExit;

    this.camera = new PlatformerCamera(canvas);
    this.renderer = new PlatformerRenderer(canvas, lightCanvas, this.camera);
  }

  start(
    player: Player,
    themeId: 'tuonela_chasm' | 'vainola_canopy' | 'pohjola_vault' | 'alinen_trench' = 'tuonela_chasm'
  ) {
    this.isActive = true;
    this.isCompleted = false;
    this.isDefeated = false;
    this.deathTimer = 0;
    this.isHordeSurging = false;
    this.hordeWallX = 0;
    this.hordeSpawnTimer = 0;
    this.hordeShotTimer = 0;

    // Reset runtime combat buffers
    projectileManager.clear();
    particleSystem.clear();
    combatEngine.clear();

    // Ensure camera viewport dimensions match the active canvas
    this.camera.handleResize(this.canvas.width, this.canvas.height);
    this.camera.zoom = 0.75;
    this.camera.targetZoom = 0.75;

    // 1. Generate Platformer Level
    const seed = Math.floor(Math.random() * 100000);
    this.level = PlatformerGenerator.generate(seed, themeId);
    this.camera.setBounds(0, this.level.width, 0, this.level.height);
    this.renderer.loadBackgrounds(themeId);

    // 2. Initialize Player Controller
    player.resetCombatAndDeathState();
    this.playerCtrl = new PlatformerPlayerController(player, this.level.spawnX, this.level.spawnY);
    this.camera.snapTo(this.playerCtrl.x, this.playerCtrl.y);

    // 3. Initialize Ground & Flying Enemies (Filtered non-boss)
    this.enemies = this.level.enemySpawns
      .filter(esp => esp.type !== 'boss')
      .map((esp, idx) => {
        let hp = 120;
        let spd = 2.8;
        let dmg = 35;
        let col = '#ef4444';

        if (esp.type === 'hound') {
          hp = 95;
          spd = 4.8;
          dmg = 38;
          col = '#10b981';
        } else if (esp.type === 'wisp') {
          hp = 75;
          spd = 3.4;
          dmg = 34;
          col = '#67e8f9';
        } else if (esp.type === 'seeker') {
          hp = 110;
          spd = 3.2;
          dmg = 44;
          col = '#c084fc';
        } else if (esp.type === 'broodmother') {
          hp = 420;
          spd = 2.2;
          dmg = 55;
          col = '#ea580c';
        }

        return new PlatformerEnemy(
          `enemy_${idx}`,
          `Corrupted ${esp.type.toUpperCase()}`,
          esp.type,
          esp.x,
          esp.y,
          hp,
          spd,
          dmg,
          col,
          false,
          esp.isElite
        );
      });

    // 4. Initialize Colossal R-Type Boss at the far right arena anchor (x: 148, y: 14)
    this.colossalBoss = new ColossalRTypeBoss(148, 14);

    // 5. Update HUD & Start Background Music
    this.hud.show();
    const biome = BIOMES.tuonela;
    this.hud.setSector(biome, 0, 1.0);
    this.hud.addLog(`★ ENTERED 2D R-TYPE ACTION SECTOR: [${this.level.title}]`, 'level');
    this.hud.addLog(`🔫 CONTROLS: [A/D] Move, [SPACE/W] Double Jump, [LEFT-CLICK] Rapid Plasma Fire, [RIGHT-CLICK] Melee Swing, [SHIFT] Dash`, 'system');

    const themeToBiomeMap: Record<string, string> = {
      tuonela_chasm: 'tuonela',
      vainola_canopy: 'vainola',
      pohjola_vault: 'pohjola',
      alinen_trench: 'alinen'
    };
    const biomeKey = themeToBiomeMap[themeId] || 'tuonela';
    soundEngine.startBackgroundMusic(biomeKey);
    soundEngine.playPlatformerWorldEnter();
  }

  respawn() {
    if (!this.playerCtrl || !this.level) return;
    this.isDefeated = false;
    this.deathTimer = 0;
    this.playerCtrl.player.resetCombatAndDeathState();
    this.playerCtrl.x = this.level.spawnX;
    this.playerCtrl.y = this.level.spawnY;
    this.playerCtrl.vx = 0;
    this.playerCtrl.vy = 0;
    this.playerCtrl.hurtTimer = 1.0;
    this.camera.zoom = 0.75;
    this.camera.targetZoom = 0.75;
    this.camera.snapTo(this.playerCtrl.x, this.playerCtrl.y);
    soundEngine.playPlatformerWorldEnter();
    particleSystem.emitBeacon(this.playerCtrl.x, this.playerCtrl.y, '#38bdf8');
    combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 1.0, '★ VESSEL RECONSTRUCTED ★', 'heal');
    this.hud.addLog('Operative reconstructed at sector entry beacon.', 'heal');
  }

  update(dt: number) {
    if (!this.isActive || !this.level || !this.playerCtrl) return;

    this.camera.handleResize(this.canvas.width, this.canvas.height);

    if (this.shootCooldownTimer > 0) this.shootCooldownTimer -= dt;
    if (this.meleeCooldownTimer > 0) this.meleeCooldownTimer -= dt;

    const player = this.playerCtrl.player;

    // Check Death & Defeat State
    if (player.isDead) {
      if (!this.isDefeated) {
        this.isDefeated = true;
        this.deathTimer = 0;
      }
      this.deathTimer += dt;

      if (this.deathTimer > 0.6 && (inputManager.justPressedKeys.has(' ') || inputManager.justPressedKeys.has('r') || inputManager.justPressedKeys.has('enter'))) {
        this.respawn();
      }

      particleSystem.update(dt);
      combatEngine.update(dt);
      this.camera.update(dt);
      return;
    }

    // 1. Gather User Inputs
    const left = inputManager.keys['a'] || inputManager.keys['arrowleft'];
    const right = inputManager.keys['d'] || inputManager.keys['arrowright'];
    const up = inputManager.keys['w'] || inputManager.keys['arrowup'];
    const down = inputManager.keys['s'] || inputManager.keys['arrowdown'];
    const jump = inputManager.keys[' '] || inputManager.keys['w'] || inputManager.keys['arrowup'];
    const justJump = inputManager.justPressedKeys.has(' ') || inputManager.justPressedKeys.has('w') || inputManager.justPressedKeys.has('arrowup');
    const dash = inputManager.keys['shift'];

    // Aim calculation towards mouse position in world coordinates
    const mouseWorld = this.camera.screenToWorld(inputManager.mouseScreen.x, inputManager.mouseScreen.y);
    const toMouseX = mouseWorld.x - this.playerCtrl.x;
    const toMouseY = mouseWorld.y - this.playerCtrl.y;
    this.playerCtrl.aimAngle = Math.atan2(toMouseY, toMouseX);

    if (Math.abs(toMouseX) > 0.4) {
      this.playerCtrl.facingDir = toMouseX > 0 ? 1 : -1;
    }

    // 2. Step Player Physics & Controller (with solid boss barrier collision)
    this.playerCtrl.update(dt, this.level, { left, right, up, down, jump, justJump, dash }, this.colossalBoss);

    // 3. Ranged Shooting (Hold Left Mouse Button to rapid fire!)
    if (inputManager.isMouseDownLeft && this.shootCooldownTimer <= 0) {
      this.handlePlayerShoot(mouseWorld.x, mouseWorld.y);
    }

    // 4. Aegis Energy Shield Barrier & Melee Deflection (Right Mouse Button)
    if (inputManager.isMouseDownRight) {
      if (player.activateEnergyShield()) {
        this.camera.addShake(0.8, 0.08);
        this.hud.addLog('🛡️ Aegis Energy Barrier Active: 5.0s invulnerable barrier!', 'heal');
      } else if (this.meleeCooldownTimer <= 0) {
        this.handlePlayerMelee();
      }
    }

    // 5. Abilities (1, 2, 3, 4)
    if (inputManager.justPressedKeys.has('1')) this.handleAbility1();
    if (inputManager.justPressedKeys.has('2')) this.handleAbility2();
    if (inputManager.justPressedKeys.has('3')) this.handleAbility3();
    if (inputManager.justPressedKeys.has('4')) this.handleAbility4();
    if (inputManager.justPressedKeys.has('q')) {
      const used = player.usePotion();
      if (used) this.hud.addLog('Injected Nano-Repair (+60 HP)', 'heal');
    }
    if (inputManager.justPressedKeys.has('e')) this.handleInteract();

    // 6. Update Ground & Flying Enemies (Distance culled: only active within 24 tiles of player)
    this.enemies.forEach(e => {
      const dx = this.playerCtrl!.x - e.x;
      const dy = this.playerCtrl!.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 24.0) {
        e.update(dt, this.playerCtrl!.x, this.playerCtrl!.y, this.level!);

        if (!e.isDead && dist < 1.1 && this.playerCtrl!.hurtTimer <= 0 && !this.playerCtrl!.isDashing) {
          this.playerCtrl!.takeHazardDamage(e.damage, e.name);
        }
      }
    });

    // 7. Update Colossal R-Type Boss
    if (this.colossalBoss && !this.colossalBoss.isDead) {
      this.colossalBoss.update(dt, this.playerCtrl.x, this.playerCtrl.y);
    }

    // 8. Check Projectiles hit detection & Wall collisions
    projectileManager.update(
      dt,
      { x: this.playerCtrl.x, y: this.playerCtrl.y },
      (x: number, y: number) => {
        const tx = Math.floor(x);
        const ty = Math.floor(y);
        if (tx < 0 || tx >= this.level!.width || ty < 0 || ty >= this.level!.height) return true;
        return this.level!.tiles[ty][tx] === PlatformTileType.SOLID_GROUND;
      }
    );

    this.checkProjectileCollisions();

    // Spawn trailing pixel spark particles behind flying player blaster bolts
    projectileManager.projectiles.forEach(p => {
      if (p.life > 0 && p.fromPlayer && Math.random() < 0.4) {
        particleSystem.emitSparks(p.x, p.y, 0.18, '#38bdf8', 1);
      }
    });

    // 9. Update Particles & Combat Text
    particleSystem.update(dt);
    combatEngine.update(dt);

    // 10. Update Camera Tracking
    this.camera.setTarget(this.playerCtrl.x, this.playerCtrl.y, this.playerCtrl.facingDir, this.playerCtrl.vx);
    this.camera.update(dt);

    // 11. Check Colossal Boss Defeat & Initiate Swarm Surge
    if (this.colossalBoss && this.colossalBoss.isDead && !this.isCompleted) {
      this.isCompleted = true;
      this.isHordeSurging = true;
      this.hordeWallX = Math.max(0, this.playerCtrl.x - 22);
      this.hordeSpawnTimer = 0;
      this.hordeShotTimer = 0;
      this.level.exitPortal.isActive = true;

      soundEngine.playPlatformerWorldEnter();
      soundEngine.startCollapseSoundscape();
      this.camera.addShake(4.0, 0.35);
      particleSystem.emitShockwave(this.level.exitPortal.x, this.level.exitPortal.y, 14.0, '#38bdf8');
      particleSystem.emitBeacon(this.level.exitPortal.x, this.level.exitPortal.y, '#38bdf8');
      
      this.hud.addLog('🚨 CRITICAL COLLAPSE: A wall of endless hostile enemies is surging from the left! GET TO THE PORTAL! [E]', 'alert');
      combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 1.5, '🚨 UNSTOPPABLE ENEMY WALL // SPRINT TO PORTAL! 🚨', 'crit');
    }

    // 11.5 Step Swarm Collapse Horde Surge (Wall of Enemies Left to Right)
    if (this.isHordeSurging) {
      // The death wall rushes continuously to the right
      this.hordeWallX += 7.2 * dt;

      // 1. Continuous Wave Spawning along the Wall of Death
      this.hordeSpawnTimer -= dt;
      if (this.hordeSpawnTimer <= 0) {
        this.hordeSpawnTimer = 0.12;
        const types: ('hound' | 'marauder' | 'wisp' | 'seeker')[] = ['hound', 'marauder', 'wisp', 'seeker'];
        const randType = types[Math.floor(Math.random() * types.length)];
        const spawnY = 4 + Math.random() * (this.level.height - 8);
        const hordeMob = new PlatformerEnemy(
          `horde_${Date.now()}_${Math.random()}`,
          `Void Surger [${randType.toUpperCase()}]`,
          randType,
          this.hordeWallX - Math.random() * 2,
          spawnY,
          90,
          8.5 + Math.random() * 3.5,
          32,
          '#ef4444',
          false,
          true
        );
        hordeMob.vx = 8.5 + Math.random() * 3.5;
        hordeMob.facingDir = 1;
        this.enemies.push(hordeMob);
      }

      // 2. Heavy Overwhelming Firepower Barrage from Left to Right
      this.hordeShotTimer -= dt;
      if (this.hordeShotTimer <= 0) {
        this.hordeShotTimer = 0.08;
        soundEngine.playEnemyPlasmaFire();
        for (let k = 0; k < 2; k++) {
          const by = 2 + Math.random() * (this.level.height - 4);
          projectileManager.spawn(
            this.hordeWallX,
            by,
            this.hordeWallX + 35,
            by + (Math.random() - 0.5) * 5,
            38,
            'void',
            false,
            14.5 + Math.random() * 4.0,
            '#ef4444',
            'plasma_bolt'
          );
        }
      }

      // 3. Spacetime Glitch & Particle Displacement along the Wall
      if (Math.random() < 0.6) {
        particleSystem.emitParticleDisplacementTear(this.hordeWallX, Math.random() * this.level.height, 0.4);
      }

      // 4. Overwhelming Damage if Player gets caught behind the Surge Wall
      if (this.playerCtrl.x <= this.hordeWallX + 0.6 && this.playerCtrl.hurtTimer <= 0) {
        this.playerCtrl.takeHazardDamage(45, 'VOID SWARM COLLAPSE WALL');
        this.camera.addShake(1.2, 0.1);
      }

      // 5. Automatic Portal Proximity Extraction
      const portal = this.level.exitPortal;
      const pdx = portal.x - this.playerCtrl.x;
      const pdy = portal.y - this.playerCtrl.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (portal.isActive && pdist < 1.6) {
        this.handleExtractionSuccess();
        return;
      }
    }

    // 12. Update HUD Vitals
    const activeBoss = this.colossalBoss && !this.colossalBoss.isDead ? (this.colossalBoss as any) : undefined;
    this.hud.update(player, activeBoss);
  }

  private handlePlayerShoot(targetX: number, targetY: number) {
    if (!this.playerCtrl) return;
    const player = this.playerCtrl.player;
    this.shootCooldownTimer = this.SHOOT_RATE;

    this.playerCtrl.muzzleFlashTimer = 0.08;
    soundEngine.playRailgunShot();
    this.camera.addShake(0.4, 0.04);

    const spawnX = this.playerCtrl.x + this.playerCtrl.facingDir * 0.45;
    const spawnY = this.playerCtrl.y - 0.15;

    projectileManager.spawn(
      spawnX,
      spawnY,
      targetX,
      targetY,
      42 + Math.floor(player.stats.vaki * 1.5),
      'plasma',
      true,
      16.5,
      '#38bdf8',
      'plasma_bolt',
      false,
      1
    );

    particleSystem.emitSparks(spawnX, spawnY, 0.3, '#38bdf8', 3);
  }

  private handlePlayerMelee() {
    if (!this.playerCtrl) return;
    const player = this.playerCtrl.player;
    this.meleeCooldownTimer = 0.32;

    player.meleeSwingTimer = 0.22;
    soundEngine.playMeleeSwing();

    const attackX = this.playerCtrl.x + this.playerCtrl.facingDir * 1.35;
    const attackY = this.playerCtrl.y;

    let hitAny = false;

    // Hit standard enemies
    this.enemies.forEach(e => {
      if (e.isDead) return;
      const dx = e.x - attackX;
      const dy = e.y - attackY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 1.5) {
        hitAny = true;
        const res = combatEngine.calculateDamage(
          { damage: 75, damageType: 'physical', critChance: 30, vaki: player.stats.vaki, nokkela: player.stats.nokkela },
          { armor: 5, shield: 0 }
        );

        const died = e.takeDamage(res.finalDamage, res.damageType);
        this.camera.addShake(0.7, 0.06);
        particleSystem.emitDamageExplosion(e.x, e.y, '#38bdf8', res.isCrit);

        if (died) {
          this.onEnemyKilled(e);
        }
      }
    });

    // Hit Colossal Boss
    if (this.colossalBoss && !this.colossalBoss.isDead) {
      const hitRes = this.colossalBoss.hitTest(attackX, attackY, 0.8, 85, 'physical');
      if (hitRes.hit) {
        hitAny = true;
        this.camera.addShake(0.8, 0.06);
        particleSystem.emitDamageExplosion(attackX, attackY, '#38bdf8', hitRes.isCrit);
      }
    }

    if (hitAny) {
      soundEngine.playHitImpact(true);
    }
  }

  private handleAbility1() {
    // Ukonvasara Ground Smash
    if (!this.playerCtrl) return;
    soundEngine.playRunicCast();
    soundEngine.playHitImpact(true);
    this.camera.addShake(1.8, 0.12);
    particleSystem.emitShockwave(this.playerCtrl.x, this.playerCtrl.y, 5.0, '#facc15');
    combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 0.8, '⚡ UKONVASARA SLAM!', 'shock');

    this.enemies.forEach(e => {
      if (e.isDead) return;
      const dx = e.x - this.playerCtrl!.x;
      const dy = e.y - this.playerCtrl!.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5.0) {
        e.takeDamage(150, 'shock');
      }
    });

    if (this.colossalBoss && !this.colossalBoss.isDead) {
      this.colossalBoss.hitTest(this.playerCtrl.x + 3.0, this.playerCtrl.y, 3.0, 160, 'shock');
    }
  }

  private handleAbility2() {
    // Kipinä Air/Ground Dash
    if (!this.playerCtrl) return;
    this.playerCtrl.vx = this.playerCtrl.facingDir * 20.0;
    this.playerCtrl.isDashing = true;
    this.playerCtrl.dashTimer = 0.25;
    soundEngine.playDodge();
    particleSystem.emitShockwave(this.playerCtrl.x, this.playerCtrl.y, 2.2, '#38bdf8');
    combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 0.5, '⚡ KIPINÄ DASH', 'shock');
  }

  private handleAbility3() {
    // Tuoni Void Energy Barrier
    if (!this.playerCtrl) return;
    this.playerCtrl.player.shield = this.playerCtrl.player.maxShield;
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.playerCtrl.x, this.playerCtrl.y, 2.8, '#c084fc');
    combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 0.5, '★ VOID BARRIER (+SHIELD)', 'void');
  }

  private handleAbility4() {
    // Overclock Frenzy
    if (!this.playerCtrl) return;
    soundEngine.playLevelUp();
    this.camera.addShake(1.4, 0.12);
    particleSystem.emitBeacon(this.playerCtrl.x, this.playerCtrl.y, '#f59e0b');
    combatEngine.addFloatingText(this.playerCtrl.x, this.playerCtrl.y - 0.8, '★ OVERCLOCK ENGAGED! ★', 'crit');
  }

  private handleInteract() {
    if (!this.playerCtrl || !this.level) return;

    const px = this.playerCtrl.x;
    const py = this.playerCtrl.y;

    // 1. Shrines
    this.level.shrines.forEach(sh => {
      if (!sh.isActivated) {
        const dx = sh.x - px;
        const dy = sh.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < 2.2) {
          sh.isActivated = true;
          this.playerCtrl!.player.health = this.playerCtrl!.player.maxHealth;
          this.playerCtrl!.player.shield = this.playerCtrl!.player.maxShield;
          soundEngine.playLevelUp();
          particleSystem.emitShockwave(sh.x, sh.y, 3.0, '#10b981');
          combatEngine.addFloatingText(sh.x, sh.y - 1.0, `★ ACTIVATED: ${sh.title}`, 'heal');
          this.hud.addLog(`★ Shrines Activated: Restored 100% Health and Shields!`, 'level');
        }
      }
    });

    // 2. Chests
    this.level.chests.forEach(c => {
      if (!c.isOpen) {
        const dx = c.x - px;
        const dy = c.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < 2.2) {
          c.isOpen = true;
          const scrapFound = 75 + Math.floor(Math.random() * 90);
          this.playerCtrl!.player.naniteScrap += scrapFound;
          soundEngine.playLootDrop(true);
          particleSystem.emitBeacon(c.x, c.y, '#facc15');
          combatEngine.addFloatingText(c.x, c.y - 1.0, `+${scrapFound} Nanite Scrap`, 'crit');
          this.hud.addLog(`Opened Chest: Looted +${scrapFound} Nanite Scrap!`, 'level');
        }
      }
    });

    // 3. Exit Extraction Portal
    const portal = this.level.exitPortal;
    const pdist = Math.sqrt((portal.x - px) * (portal.x - px) + (portal.y - py) * (portal.y - py));
    if (portal.isActive && pdist < 3.0) {
      this.handleExtractionSuccess();
    }
  }

  public handleExtractionSuccess() {
    if (!this.isActive || !this.level) return;
    const portal = this.level.exitPortal;
    soundEngine.stopCollapseSoundscape(true);
    soundEngine.playSuccessfulExtractionWarp();
    particleSystem.emitShockwave(portal.x, portal.y, 16.0, '#38bdf8');
    particleSystem.emitBeacon(portal.x, portal.y, '#38bdf8');
    for (let k = 0; k < 20; k++) {
      particleSystem.emitSparks(portal.x + (Math.random() - 0.5) * 3, portal.y + (Math.random() - 0.5) * 3, 0.4, '#38bdf8', 4);
    }
    this.hud.addLog('👑 EXTRACTION COMPLETE: Transcended 2D Cosmic Trial!', 'level');
    combatEngine.addFloatingText(portal.x, portal.y - 1.5, '👑 REALM CONQUERED // EXTRACTION COMPLETE!', 'crit');
    
    // Smooth fade out into victory return
    setTimeout(() => {
      this.exit(true);
    }, 450);
  }

  private checkProjectileCollisions() {
    if (!this.playerCtrl) return;

    projectileManager.projectiles.forEach(p => {
      if (p.life <= 0) return;

      if (p.fromPlayer) {
        // 1. Player Projectile vs Standard Enemies
        this.enemies.forEach(e => {
          if (e.isDead || p.life <= 0) return;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < (e.width * 0.5 + p.radius)) {
            p.life = 0;
            const res = combatEngine.calculateDamage(
              { damage: p.damage, damageType: p.damageType, critChance: 20, vaki: this.playerCtrl!.player.stats.vaki, nokkela: this.playerCtrl!.player.stats.nokkela },
              { armor: 4, shield: 0 }
            );
            const died = e.takeDamage(res.finalDamage, res.damageType);
            particleSystem.emitDamageExplosion(p.x, p.y, p.color, res.isCrit);
            this.camera.addShake(res.isCrit ? 0.7 : 0.4, 0.06);

            if (died) {
              this.onEnemyKilled(e);
            }
          }
        });

        // 2. Player Projectile vs Colossal R-Type Boss (Sub-targets, Drones & Iris Core)
        if (p.life > 0 && this.colossalBoss && !this.colossalBoss.isDead) {
          const hitRes = this.colossalBoss.hitTest(p.x, p.y, p.radius, p.damage, p.damageType);
          if (hitRes.hit) {
            p.life = 0;
            particleSystem.emitDamageExplosion(p.x, p.y, p.color, hitRes.isCrit);
            this.camera.addShake(hitRes.isCrit ? 0.8 : 0.45, 0.06);
          }
        }
      } else {
        // Hostile Enemy projectile vs player
        const dx = p.x - this.playerCtrl!.x;
        const dy = p.y - this.playerCtrl!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Right-Click Aegis Shield Barrier Block (5s barrier)
        if (this.playerCtrl!.player.energyShieldActive && dist < 1.4 + p.radius) {
          p.life = 0;
          soundEngine.playHitImpact(true);
          particleSystem.emitSparks(p.x, p.y, 0.45, '#38bdf8', 6);
          combatEngine.addFloatingText(p.x, p.y - 0.5, '🛡️ BLOCKED!', 'heal');
          this.camera.addShake(0.4, 0.05);
          return;
        }

        // 2. Direct Hit on Player
        if (dist < 0.75 && this.playerCtrl!.hurtTimer <= 0 && !this.playerCtrl!.isDashing) {
          p.life = 0;
          this.playerCtrl!.takeHazardDamage(p.damage, 'ENEMY PLASMA BURST');
        }
      }
    });
  }

  private onEnemyKilled(e: PlatformerEnemy) {
    particleSystem.emitEnemyDeathExplosion(e.x, e.y, e.color, e.isBoss, e.isElite);
    this.camera.addShake(e.isBoss ? 2.0 : (e.isElite ? 0.9 : 0.5), 0.08);
    this.playerCtrl!.player.gainXP(e.type === 'broodmother' ? 140 : 65);
    this.playerCtrl!.player.naniteScrap += e.type === 'broodmother' ? 50 : 25;
    this.hud.addLog(`Slew ${e.name} (+${e.type === 'broodmother' ? 140 : 65} XP)`, 'level');

    // Broodmother On-Death Spawning: Releases 4 small flying wisps that scatter into the air!
    if (e.type === 'broodmother') {
      soundEngine.playExplosion();
      particleSystem.emitShockwave(e.x, e.y, 3.5, '#ea580c');
      this.camera.addShake(0.7, 0.08);

      for (let w = 0; w < 4; w++) {
        const offsetAng = (w / 4) * Math.PI * 2;
        const wx = e.x + Math.cos(offsetAng) * 0.8;
        const wy = e.y - 0.6 + Math.sin(offsetAng) * 0.5;
        const hatchling = new PlatformerEnemy(
          `brood_wisp_${Date.now()}_${w}`,
          'Tulikipinä Hatchling',
          'wisp',
          wx,
          wy,
          45,
          2.6,
          18,
          '#f97316',
          false,
          false
        );
        hatchling.vx = (Math.random() - 0.5) * 6.0;
        hatchling.vy = -4.5 - Math.random() * 3.5; // Launches upward out of the dying colossus
        this.enemies.push(hatchling);
      }
    }
  }

  render() {
    if (!this.isActive || !this.level || !this.playerCtrl) return;

    this.camera.handleResize(this.canvas.width, this.canvas.height);

    this.renderer.render(
      this.level,
      this.playerCtrl,
      this.enemies,
      this.colossalBoss,
      this.level.chests,
      this.level.shrines,
      this.level.exitPortal,
      projectileManager,
      particleSystem,
      combatEngine,
      this.isDefeated,
      this.isHordeSurging ? this.hordeWallX : null
    );
  }

  exit(won: boolean = false) {
    this.isActive = false;
    soundEngine.stopCollapseSoundscape(won);
    this.onExitCallback(won);
  }
}
