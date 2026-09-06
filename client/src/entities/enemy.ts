// ============================================================================
// Enemy AI State Machine, Tactical Attack Variants & Enhanced Boss Weapons Subsystem
// ============================================================================

import { DamageType, Item, ItemGenerator, ItemRarity } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';
import { projectileManager, ProjectileStyle } from './projectile';
import { combatEngine } from '../systems/combat';
import { RuneCipherShard } from './puzzle';

export type AIState = 'idle' | 'patrol' | 'aggro' | 'attack' | 'retreat' | 'cast' | 'boss_dash' | 'boss_leap';

export class Enemy {
  public id: string;
  public name: string;
  public type: string;
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public radius: number = 0.45;

  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public damageType: DamageType = 'physical';
  public armor: number = 5;

  public isBoss: boolean = false;
  public isElite: boolean = false;
  public isMech: boolean = true;
  public isRanged: boolean = false;
  public isSwarm: boolean = false;
  public color: string = '#ef4444';

  // Runic Cipher Shard Clue Carrier properties
  public runeShard?: RuneCipherShard;
  public hasRuneShard: boolean = false;
  public isRunAttacking: boolean = false;
  public runAttackTimer: number = 0;
  public runAttackCooldown: number = 0;

  public state: AIState = 'idle';
  public stateTimer: number = 0;
  public attackCooldown: number = 0;
  public hurtFlashTimer: number = 0;
  public isDead: boolean = false;

  // Animation & Tactical properties
  public walkTimer: number = 0;
  public hoverTimer: number = 0;
  public lungeTimer: number = 0;
  public meleeHitDone: boolean = false;
  public isPouncing: boolean = false;
  public isShielded: boolean = false;
  public shield: number = 0;
  public maxShield: number = 0;

  // ==========================================
  // ADVANCED BOSS MOVEMENT & WEAPONS STATE
  // ==========================================
  public bossPhase: number = 1;
  public maxBossPhases: number = 3;
  public specialAttackTimer: number = 3.5;
  public isEnraged: boolean = false;

  // Boss High-Speed Dashing & Charging
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashCooldown: number = 4.5;
  public dashTargetX: number = 0;
  public dashTargetY: number = 0;
  public dashVx: number = 0;
  public dashVy: number = 0;

  // Boss Leap Slam
  public isLeaping: boolean = false;
  public leapTimer: number = 0;
  public leapDuration: number = 0.75;
  public leapCooldown: number = 7.0;
  public leapStartX: number = 0;
  public leapStartY: number = 0;
  public leapTargetX: number = 0;
  public leapTargetY: number = 0;

  // Boss Tactical Repositioning & Strafe
  public blinkCooldown: number = 8.0;
  public strafeAngle: number = 0;
  public strafeDirection: number = 1;
  public spiralAngle: number = 0;

  constructor(
    id: string,
    name: string,
    x: number,
    y: number,
    health: number,
    speed: number,
    damage: number,
    color: string = '#ef4444',
    isRanged: boolean = false,
    isMech: boolean = true,
    isBoss: boolean = false,
    isElite: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.isRanged = isRanged;
    this.isMech = isMech;
    this.isBoss = isBoss;
    this.isElite = isElite;

    this.type = name.toLowerCase().replace(/\s+/g, '_');
    this.armor = isBoss ? 38 : isElite ? 18 : 6;

    if (isBoss) {
      if (this.id.includes('void_mist')) this.radius = 2.8;
      else if (this.id.includes('sampo') || this.id.includes('ukko')) this.radius = 2.6;
      else if (this.id.includes('turso') || this.id.includes('ikuturso')) this.radius = 2.5;
      else if (this.id.includes('tuoni')) this.radius = 2.4;
      else if (this.id.includes('louhi')) this.radius = 2.3;
      else if (this.id.includes('surma')) this.radius = 2.3;
      else if (this.id.includes('sotka')) this.radius = 2.1;
      else this.radius = 2.4;
    } else if (this.type.includes('brood') || this.type.includes('matriarch') || this.type.includes('tulipesä') || this.type.includes('colossus')) {
      this.radius = 1.15; // Bigger walking monster
    } else if (isElite) {
      this.radius = 0.65;
    } else {
      this.radius = 0.45;
    }

    // Pick damage type based on enemy archetype
    if (this.type.includes('frost') || this.type.includes('cryo') || this.type.includes('louhi')) {
      this.damageType = 'frost';
    } else if (this.type.includes('shock') || this.type.includes('spark') || this.type.includes('marauder') || this.type.includes('sotka') || this.type.includes('ukko') || this.type.includes('sampo')) {
      this.damageType = 'shock';
    } else if (this.type.includes('necro') || this.type.includes('wraith') || this.type.includes('void') || this.type.includes('tuoni')) {
      this.damageType = 'void';
    } else if (this.type.includes('fire') || this.type.includes('magma') || this.type.includes('golem') || this.type.includes('turso') || this.type.includes('welder')) {
      this.damageType = 'fire';
    } else {
      this.damageType = 'physical';
    }
  }

  update(dt: number, playerX: number, playerY: number, isWall: (x: number, y: number) => boolean) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;
    if (this.specialAttackTimer > 0) this.specialAttackTimer -= dt;
    if (this.lungeTimer > 0) this.lungeTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.leapCooldown > 0) this.leapCooldown -= dt;
    if (this.blinkCooldown > 0) this.blinkCooldown -= dt;
    if (this.runAttackCooldown > 0) this.runAttackCooldown -= dt;

    this.hoverTimer += dt * 3.5;
    this.spiralAngle += dt * 3.2;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    this.angle = Math.atan2(dy, dx);

    // ==========================================
    // BOSS SPECIALIZED AI & ADVANCED MOVEMENTS
    // ==========================================
    if (this.isBoss) {
      this.updateBossLogic(dt, playerX, playerY, distToPlayer, isWall);
      return;
    }

    // ==========================================
    // RUNE CARRIER DEDICATED RUN-ATTACK RUSH LOGIC
    // ==========================================
    if (this.hasRuneShard) {
      this.isRanged = false; // Rune carriers are pure melee rush fighters

      // 1. Active Run Attack Sprint (Tuned to be dodgeable and fair on first run)
      if (this.isRunAttacking) {
        this.runAttackTimer -= dt;
        this.walkTimer += dt * 12.0;

        const chargeSpeed = this.speed * 1.55;
        const currentAng = Math.atan2(dy, dx);
        const moveStep = chargeSpeed * dt;
        const pad = this.radius * 0.4;

        const checkClear = (cx: number, cy: number) => {
          return !isWall(cx - pad, cy) && !isWall(cx + pad, cy) && !isWall(cx, cy - pad) && !isWall(cx, cy + pad);
        };

        const nextX = this.x + Math.cos(currentAng) * moveStep;
        const nextY = this.y + Math.sin(currentAng) * moveStep;

        if (checkClear(nextX, this.y)) this.x = nextX;
        if (checkClear(this.x, nextY)) this.y = nextY;

        // Emit energetic golden rune sparks and dust during rush
        particleSystem.emitSparks(this.x, this.y, 0.25, '#f59e0b', 2);
        if (Math.random() < 0.35) {
          particleSystem.emitPixelGlitch(this.x, this.y, '#facc15');
        }

        if (this.runAttackTimer <= 0) {
          this.isRunAttacking = false;
          this.runAttackCooldown = 4.5 + Math.random() * 1.5;
        }
        return;
      }

      // 2. Initiate Run Attack when player is in pursuit range
      if (this.runAttackCooldown <= 0 && distToPlayer >= 2.5 && distToPlayer <= 7.5) {
        this.isRunAttacking = true;
        this.runAttackTimer = 0.5;
        this.runAttackCooldown = 4.5 + Math.random() * 1.5;
        soundEngine.playMeleeSwing();
        particleSystem.emitShockwave(this.x, this.y, 1.8, '#f59e0b');
        return;
      }
    }

    // ==========================================
    // STANDARD & ELITE ENEMY AI STATE MACHINE
    // ==========================================
    const aggroRange = this.hasRuneShard ? 10.5 : (this.isSwarm ? 999 : (this.isElite ? 14 : 11.5));
    const attackRange = this.isRanged ? 6.8 : (this.hasRuneShard ? 1.65 : (this.type.includes('hound') || this.type.includes('wolf') ? 2.8 : 1.55));

    if (this.isSwarm || distToPlayer <= aggroRange) {
      if (distToPlayer <= attackRange) {
        this.state = 'attack';
      } else {
        this.state = 'aggro';
      }
    } else {
      this.state = 'patrol';
    }

    // State Execution & Smart Wall Sliding Navigation
    if (this.state === 'aggro') {
      this.walkTimer += dt * 8.0;
      const speedMultiplier = this.hasRuneShard ? 1.10 : (this.isSwarm ? 1.35 : (this.isPouncing ? 2.2 : 1.0));
      const currentSpeed = this.speed * speedMultiplier;
      const moveSpeed = currentSpeed * dt;
      const pad = this.radius * 0.5;

      const checkClear = (cx: number, cy: number) => {
        return !isWall(cx - pad, cy) && !isWall(cx + pad, cy) && !isWall(cx, cy - pad) && !isWall(cx, cy + pad);
      };

      const nextX = this.x + Math.cos(this.angle) * moveSpeed;
      const nextY = this.y + Math.sin(this.angle) * moveSpeed;

      if (checkClear(nextX, this.y)) this.x = nextX;
      if (checkClear(this.x, nextY)) this.y = nextY;

      if (!checkClear(nextX, this.y) && !checkClear(this.x, nextY)) {
        const altAng1 = this.angle + 1.2;
        const altAng2 = this.angle - 1.2;
        const ax1 = this.x + Math.cos(altAng1) * moveSpeed;
        const ay1 = this.y + Math.sin(altAng1) * moveSpeed;
        if (checkClear(ax1, ay1)) {
          this.x = ax1;
          this.y = ay1;
        } else {
          const ax2 = this.x + Math.cos(altAng2) * moveSpeed;
          const ay2 = this.y + Math.sin(altAng2) * moveSpeed;
          if (checkClear(ax2, ay2)) {
            this.x = ax2;
            this.y = ay2;
          }
        }
      }
    } else {
      this.walkTimer = 0;
    }

    if (this.state === 'attack') {
      if (this.attackCooldown <= 0) {
        this.lungeTimer = 0.35;
        this.meleeHitDone = false;
        this.performArchetypeAttack(playerX, playerY, distToPlayer);
      }
    }
  }

  // ==========================================================================
  // DYNAMIC BOSS COMBAT CONTROLLER (DASHES, LEAPS, BLINKS, STRAFES & RAGE)
  // ==========================================================================

  private updateBossLogic(
    dt: number,
    playerX: number,
    playerY: number,
    distToPlayer: number,
    isWall: (x: number, y: number) => boolean
  ) {
    // 1. Enrage & Multi-Phase Transitions
    const hpRatio = this.health / this.maxHealth;
    if (hpRatio <= 0.35 && this.bossPhase < 3) {
      this.bossPhase = 3;
      this.isEnraged = true;
      soundEngine.playLevelUp();
      particleSystem.emitShockwave(this.x, this.y, 8.0, '#ef4444');
    } else if (hpRatio <= 0.65 && this.bossPhase === 1) {
      this.bossPhase = 2;
      soundEngine.playLevelUp();
      particleSystem.emitShockwave(this.x, this.y, 6.0, this.color);
    }

    const speedMod = (this.isEnraged ? 1.45 : this.bossPhase === 2 ? 1.25 : 1.0);
    const cooldownMod = (this.isEnraged ? 0.6 : this.bossPhase === 2 ? 0.75 : 1.0);

    // 2. State: Active Supersonic Dash / Rush Attack (Respects Arena Walls)
    if (this.isDashing) {
      this.dashTimer -= dt;
      const moveStepX = this.dashVx * dt;
      const moveStepY = this.dashVy * dt;
      const pad = this.radius * 0.4;

      const checkClear = (cx: number, cy: number) => {
        return !isWall(cx - pad, cy) && !isWall(cx + pad, cy) && !isWall(cx, cy - pad) && !isWall(cx, cy + pad);
      };

      const nextX = this.x + moveStepX;
      const nextY = this.y + moveStepY;

      let hitWall = false;
      if (checkClear(nextX, this.y)) {
        this.x = nextX;
      } else {
        hitWall = true;
      }

      if (checkClear(this.x, nextY)) {
        this.y = nextY;
      } else {
        hitWall = true;
      }

      // Emit hazard trail along dash path
      particleSystem.emitSparks(this.x, this.y, 0.4, this.color, 3);
      if (Math.random() < 0.45) {
        particleSystem.emitPixelGlitch(this.x, this.y, this.color);
      }

      if (this.dashTimer <= 0 || hitWall) {
        this.isDashing = false;
        soundEngine.playExplosion();
        particleSystem.emitShockwave(this.x, this.y, 3.5, this.color);
      }
      return;
    }

    // 3. State: Active Leap Slam / Crater Drop
    if (this.isLeaping) {
      this.leapTimer += dt;
      const progress = Math.min(1.0, this.leapTimer / this.leapDuration);

      // Parabolic flight arc
      this.x = this.leapStartX + (this.leapTargetX - this.leapStartX) * progress;
      this.y = this.leapStartY + (this.leapTargetY - this.leapStartY) * progress;

      // Shadow particles
      particleSystem.emitSparks(this.x, this.y, 0.1, this.color, 1);

      if (progress >= 1.0) {
        this.isLeaping = false;
        // Ensure landing is not stuck inside a solid wall
        if (isWall(this.x, this.y)) {
          const offsets = [
            [0, -0.6], [0, 0.6], [-0.6, 0], [0.6, 0],
            [-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6],
            [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0]
          ];
          for (const [ox, oy] of offsets) {
            if (!isWall(this.x + ox, this.y + oy)) {
              this.x += ox;
              this.y += oy;
              break;
            }
          }
        }
        this.executeLeapSlamImpact(playerX, playerY);
      }
      return;
    }

    // 4. Boss Tactical Decision Matrix
    if (distToPlayer <= 22) {
      // Periodic Special Attack Trigger
      if (this.specialAttackTimer <= 0) {
        this.performBossSpecial(playerX, playerY);
        this.specialAttackTimer = (4.5 + Math.random() * 2.0) * cooldownMod;
      }

      // Tactical Choice: Supersonic Dash / Rush Attack
      if (this.dashCooldown <= 0 && distToPlayer >= 4.5 && distToPlayer <= 16) {
        this.initiateBossDash(playerX, playerY);
        this.dashCooldown = (6.0 + Math.random() * 3.0) * cooldownMod;
        return;
      }

      // Tactical Choice: Leap Slam Attack (for heavy bosses like Surma, Tuoni, Turso)
      if (this.leapCooldown <= 0 && (this.id.includes('surma') || this.id.includes('tuoni') || this.id.includes('turso') || this.id.includes('sampo'))) {
        this.initiateBossLeap(playerX, playerY);
        this.leapCooldown = (9.0 + Math.random() * 4.0) * cooldownMod;
        return;
      }

      // Tactical Choice: Void Mist Random Rapid Teleportation
      if (this.id.includes('void_mist') && this.blinkCooldown <= 0) {
        this.executeVoidMistRandomTeleport(playerX, playerY, isWall);
        this.blinkCooldown = (3.2 + Math.random() * 1.5) * cooldownMod;
      }

      // Tactical Choice: Phase Teleport / Blink (for ranged masters Louhi, Sotka, Tuoni)
      if (this.blinkCooldown <= 0 && distToPlayer <= 3.8 && (this.id.includes('louhi') || this.id.includes('sotka') || this.id.includes('tuoni') || this.id.includes('ukko'))) {
        this.executePhaseBlink(playerX, playerY);
        this.blinkCooldown = (8.0 + Math.random() * 3.0) * cooldownMod;
      }
    }

    // 5. Dynamic Boss Movement Navigation (Combines Strafe-Circling & Gap-Closing)
    this.walkTimer += dt * 9.0;
    const isRangedBoss = this.id.includes('sotka') || this.id.includes('louhi') || this.id.includes('tuoni') || this.id.includes('sampo');
    const idealDistance = isRangedBoss ? 7.0 : 2.0;

    let moveAngle = this.angle;
    if (distToPlayer < idealDistance - 1.5 && isRangedBoss) {
      // Back away while shooting
      moveAngle = this.angle + Math.PI;
    } else if (Math.abs(distToPlayer - idealDistance) <= 3.0) {
      // Circular strafe maneuver around player to evade straight projectile lines
      if (Math.random() < 0.02) this.strafeDirection *= -1;
      moveAngle = this.angle + (Math.PI * 0.45 * this.strafeDirection);
    }

    const currentSpeed = this.speed * speedMod;
    const moveStep = currentSpeed * dt;
    const pad = Math.min(0.65, this.radius * 0.28);

    const checkClear = (cx: number, cy: number) => {
      return !isWall(cx - pad, cy) && !isWall(cx + pad, cy) && !isWall(cx, cy - pad) && !isWall(cx, cy + pad);
    };

    const nx = this.x + Math.cos(moveAngle) * moveStep;
    const ny = this.y + Math.sin(moveAngle) * moveStep;

    if (checkClear(nx, this.y)) this.x = nx;
    if (checkClear(this.x, ny)) this.y = ny;

    // Anti-Stuck Safety: If boss is ever clipped inside a solid wall, gently push back into arena
    if (isWall(this.x, this.y)) {
      const offsets = [
        [0, -0.6], [0, 0.6], [-0.6, 0], [0.6, 0],
        [-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6],
        [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0],
        [-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2],
        [0, -2.0], [0, 2.0], [-2.0, 0], [2.0, 0]
      ];
      for (const [ox, oy] of offsets) {
        if (!isWall(this.x + ox, this.y + oy)) {
          this.x += ox;
          this.y += oy;
          break;
        }
      }
    }

    // Regular Primary Weapon Attack
    if (this.attackCooldown <= 0 && distToPlayer <= 16) {
      this.lungeTimer = 0.3;
      this.performBossPrimaryWeapon(playerX, playerY, distToPlayer);
      this.attackCooldown = (1.4 + Math.random() * 0.6) * cooldownMod;
    }
  }

  // ==========================================================================
  // BOSS MOVEMENT TACTICS (DASH, LEAP SLAM, PHASE BLINK)
  // ==========================================================================

  // 1. Supersonic Boss Dash Across Arena
  private initiateBossDash(playerX: number, playerY: number) {
    soundEngine.playSpecialCharge();
    particleSystem.emitShockwave(this.x, this.y, 2.5, this.color);

    this.isDashing = true;
    this.dashTimer = 0.55;

    // Dash towards slightly lead player target
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));

    const dashSpeed = 15.0; // Rapid supersonic rush
    this.dashVx = (dx / dist) * dashSpeed;
    this.dashVy = (dy / dist) * dashSpeed;
  }

  // 2. Boss High-Altitude Leap Slam Attack
  private initiateBossLeap(playerX: number, playerY: number) {
    soundEngine.playDodge();
    particleSystem.emitShockwave(this.x, this.y, 3.0, '#38bdf8');

    this.isLeaping = true;
    this.leapTimer = 0;
    this.leapDuration = 0.75;
    this.leapStartX = this.x;
    this.leapStartY = this.y;
    this.leapTargetX = playerX;
    this.leapTargetY = playerY;
  }

  // Ground Slam Impact on Landing
  private executeLeapSlamImpact(playerX: number, playerY: number) {
    soundEngine.playExplosion();
    soundEngine.playSyntysanatAnvil();
    particleSystem.emitShockwave(this.x, this.y, 7.5, this.color);

    // Radial 12-Way Obsidian / Slag Shrapnel Shockwave
    const projCount = 12;
    for (let i = 0; i < projCount; i++) {
      const ang = (Math.PI * 2 / projCount) * i;
      const tx = this.x + Math.cos(ang) * 14;
      const ty = this.y + Math.sin(ang) * 14;
      projectileManager.spawn(
        this.x,
        this.y,
        tx,
        ty,
        this.damage * 1.1,
        this.damageType,
        false,
        6.5,
        this.color,
        this.id.includes('tuoni') ? 'void_skull' : this.id.includes('surma') ? 'scrap_buzzsaw' : 'magma_bomb',
        false,
        1,
        this.name
      );
    }
  }

  // 3. Phase Teleport / Blink to Strategic Range
  private executePhaseBlink(playerX: number, playerY: number) {
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 3.5, '#38bdf8');

    // Spawn decoy cluster at departure
    for (let i = 0; i < 4; i++) {
      const ang = (Math.PI / 2) * i;
      projectileManager.spawn(
        this.x,
        this.y,
        this.x + Math.cos(ang) * 6,
        this.y + Math.sin(ang) * 6,
        this.damage * 0.9,
        this.damageType,
        false,
        4.5,
        this.color,
        'plasma_bolt',
        false,
        1,
        this.name
      );
    }

    // Teleport 8-10 tiles away at an offset angle
    const escapeAngle = Math.atan2(this.y - playerY, this.x - playerX) + (Math.random() - 0.5) * 1.2;
    this.x = playerX + Math.cos(escapeAngle) * 9.0;
    this.y = playerY + Math.sin(escapeAngle) * 9.0;

    particleSystem.emitShockwave(this.x, this.y, 4.0, '#10b981');
  }

  // 4. Void Mist Random Hyper-Teleport across the Arena Plane
  private executeVoidMistRandomTeleport(playerX: number, playerY: number, isWall: (x: number, y: number) => boolean) {
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 5.5, '#c084fc');
    for (let i = 0; i < 14; i++) {
      particleSystem.emitPixelGlitch(this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 4, '#c084fc');
    }

    // Teleport to random coordinate in 5.5 to 11.5 radius from player
    for (let attempt = 0; attempt < 10; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 5.0 + Math.random() * 6.5;
      const tx = playerX + Math.cos(ang) * dist;
      const ty = playerY + Math.sin(ang) * dist;
      if (!isWall(tx, ty)) {
        this.x = tx;
        this.y = ty;
        break;
      }
    }

    soundEngine.playExplosion();
    particleSystem.emitShockwave(this.x, this.y, 6.5, '#ef4444');
    for (let i = 0; i < 14; i++) {
      particleSystem.emitPixelGlitch(this.x + (Math.random() - 0.5) * 4, this.y + (Math.random() - 0.5) * 4, '#ef4444');
    }
  }

  // ==========================================================================
  // COMPLEX & MULTI-STAGE WEAPONS ARSENAL FOR ALL 6 BOSSES
  // ==========================================================================

  // Primary Weapon Attacks (Fires regularly in combat)
  private performBossPrimaryWeapon(playerX: number, playerY: number, distToPlayer: number) {
    const baseAng = Math.atan2(playerY - this.y, playerX - this.x);

    if (this.id.includes('sotka')) {
      // Sotka: 3-Way Solar Ray Fan Spread with clear dodge corridors
      [-0.32, 0, 0.32].forEach(offset => {
        const tx = this.x + Math.cos(baseAng + offset) * 14;
        const ty = this.y + Math.sin(baseAng + offset) * 14;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 0.90,
          'shock',
          false,
          6.2,
          '#facc15',
          'plasma_bolt',
          false,
          1,
          this.name
        );
      });
      soundEngine.playRailgunShot();

    } else if (this.id.includes('surma')) {
      // Surma: Twin Electrified Buzzsaws + Melee Lunge
      [-0.2, 0.2].forEach(offset => {
        const tx = this.x + Math.cos(baseAng + offset) * 12;
        const ty = this.y + Math.sin(baseAng + offset) * 12;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.1,
          'shock',
          false,
          8.0,
          '#f59e0b',
          'scrap_buzzsaw',
          false,
          2,
          this.name
        );
      });
      soundEngine.playMeleeSwing();

    } else if (this.id.includes('louhi')) {
      // Louhi: Triple Frost Shard Burst + Cryo Trail
      [-0.25, 0, 0.25].forEach(offset => {
        const tx = this.x + Math.cos(baseAng + offset) * 14;
        const ty = this.y + Math.sin(baseAng + offset) * 14;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage,
          'frost',
          false,
          8.2,
          '#67e8f9',
          'frost_shard',
          false,
          1,
          this.name
        );
      });
      soundEngine.playRailgunShot();

    } else if (this.id.includes('tuoni')) {
      // Tuoni: Dual Homing Void Skulls
      for (let i = 0; i < 2; i++) {
        const offsetAng = (i === 0 ? -0.35 : 0.35);
        projectileManager.spawn(
          this.x + Math.cos(baseAng + offsetAng) * 0.8,
          this.y + Math.sin(baseAng + offsetAng) * 0.8,
          playerX,
          playerY,
          this.damage * 1.15,
          'void',
          false,
          5.2,
          '#c084fc',
          'void_skull',
          true,
          1,
          this.name
        );
      }
      soundEngine.playRunicCast();

    } else if (this.id.includes('turso')) {
      // Iku-Turso: Heavy Bouncing Magma Slag Shell
      projectileManager.spawn(
        this.x,
        this.y,
        playerX,
        playerY,
        this.damage * 1.3,
        'fire',
        false,
        6.5,
        '#f97316',
        'magma_bomb',
        false,
        1,
        this.name
      );
      soundEngine.playExplosion();

    } else if (this.id.includes('void_mist')) {
      // Void Mist: Triple Homing Void Skulls + 6-Way Radiating Shards
      for (let i = -1; i <= 1; i++) {
        const offset = i * 0.25;
        projectileManager.spawn(
          this.x + Math.cos(baseAng + offset) * 0.8,
          this.y + Math.sin(baseAng + offset) * 0.8,
          playerX,
          playerY,
          this.damage * 1.15,
          'void',
          false,
          6.8,
          '#c084fc',
          'void_skull',
          true,
          1,
          this.name
        );
      }
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI * 2 / 6) * k + this.spiralAngle;
        projectileManager.spawn(
          this.x,
          this.y,
          this.x + Math.cos(ang) * 12,
          this.y + Math.sin(ang) * 12,
          this.damage * 0.9,
          'void',
          false,
          7.5,
          '#ef4444',
          'golden_rune_shard',
          false,
          1,
          this.name
        );
      }
      soundEngine.playRunicCast();

    } else {
      // Cosmic Sampo / Ukko: Dual Celestial Plasma Orbs
      [-0.18, 0.18].forEach(offset => {
        const tx = this.x + Math.cos(baseAng + offset) * 15;
        const ty = this.y + Math.sin(baseAng + offset) * 15;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.1,
          'shock',
          false,
          9.0,
          '#f59e0b',
          'golden_rune_shard',
          false,
          1,
          this.name
        );
      });
      soundEngine.playRailgunShot();
    }
  }

  // Signature Boss Special Attacks (Triggered periodically)
  private performBossSpecial(playerX: number, playerY: number) {
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 5.0, this.color);

    // ==========================================
    // 1. SOTKA CYBER-HARBINGER: Goldeneye Supernova & Solar Ray Spiral
    // ==========================================
    if (this.id.includes('sotka')) {
      if (this.bossPhase >= 2) {
        // Rotating 16-Way Solar Spiral Barrage
        const count = 16;
        for (let i = 0; i < count; i++) {
          const ang = this.spiralAngle + (Math.PI * 2 / count) * i;
          const tx = this.x + Math.cos(ang) * 14;
          const ty = this.y + Math.sin(ang) * 14;
          projectileManager.spawn(
            this.x,
            this.y,
            tx,
            ty,
            this.damage * 1.05,
            'shock',
            false,
            7.5,
            '#fcd34d',
            'plasma_bolt',
            false,
            1,
            this.name
          );
        }
      } else {
        // 4 Goldeneye Cluster Shells
        const count = 4;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 / count) * i;
          const tx = this.x + Math.cos(ang) * 10;
          const ty = this.y + Math.sin(ang) * 10;
          projectileManager.spawn(
            this.x,
            this.y,
            tx,
            ty,
            this.damage * 1.25,
            'shock',
            false,
            5.8,
            '#f59e0b',
            'golden_rune_shard',
            false,
            1,
            this.name
          );
        }
      }

    // ==========================================
    // 2. SURMA CYBER-HOUND: Flesh-Metal Buzzsaw Cyclone
    // ==========================================
    } else if (this.id.includes('surma')) {
      const count = this.bossPhase >= 2 ? 8 : 6;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 / count) * i;
        const tx = this.x + Math.cos(ang) * 14;
        const ty = this.y + Math.sin(ang) * 14;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.2,
          'shock',
          false,
          8.5,
          '#f59e0b',
          'scrap_buzzsaw',
          false,
          2,
          this.name
        );
      }
      soundEngine.playSpecialRelease();

    // ==========================================
    // 3. LOUHI FROST GUARDIAN: Cryogenic Blizzard Helix (Double Spiral)
    // ==========================================
    } else if (this.id.includes('louhi')) {
      const count = 18;
      for (let i = 0; i < count; i++) {
        const ang = this.spiralAngle + (Math.PI * 2 / count) * i;
        const tx = this.x + Math.cos(ang) * 15;
        const ty = this.y + Math.sin(ang) * 15;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.1,
          'frost',
          false,
          6.8,
          '#67e8f9',
          'frost_shard',
          false,
          1,
          this.name
        );
      }

      // Homing Cryo-Missile on Phase 2+
      if (this.bossPhase >= 2) {
        for (let k = 0; k < 2; k++) {
          projectileManager.spawn(
            this.x,
            this.y,
            playerX,
            playerY,
            this.damage * 1.3,
            'frost',
            false,
            5.0,
            '#38bdf8',
            'homing_missile',
            true,
            1,
            this.name
          );
        }
      }

    // ==========================================
    // 4. TUONI SKELETON KING: Stygian Maelstrom & Soul Reaper Volley
    // ==========================================
    } else if (this.id.includes('tuoni')) {
      // 5 Homing Necrotic Skulls in Arc
      const count = 5;
      for (let i = 0; i < count; i++) {
        const offsetAng = (Math.PI * 2 / count) * i;
        projectileManager.spawn(
          this.x + Math.cos(offsetAng) * 1.8,
          this.y + Math.sin(offsetAng) * 1.8,
          playerX,
          playerY,
          this.damage * 1.2,
          'void',
          false,
          4.8,
          '#c084fc',
          'void_skull',
          true,
          1,
          this.name
        );
      }

      // Crescent Wave of Void Cleave on Phase 2+
      if (this.bossPhase >= 2) {
        soundEngine.playDeathRayBeam();
        particleSystem.emitShockwave(this.x, this.y, 6.0, '#22d3ee');
      }

    // ==========================================
    // 5. IKU-TURSO ABYSSAL CONSTRUCT: Magma Mortar Cannonade
    // ==========================================
    } else if (this.id.includes('turso')) {
      const count = 8;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 / count) * i;
        const tx = this.x + Math.cos(ang) * 12;
        const ty = this.y + Math.sin(ang) * 12;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.35,
          'fire',
          false,
          6.0,
          '#f97316',
          'magma_bomb',
          false,
          1,
          this.name
        );
      }
      soundEngine.playExplosion();

    // ==========================================
    // 6. SURMA-MUSTA // THE VOID MIST OVERLORD: 24-Way Spiral Skull Maelstrom & Antimatter Waves
    // ==========================================
    } else if (this.id.includes('void_mist')) {
      soundEngine.playDeathRayBeam();
      soundEngine.playExplosion();
      particleSystem.emitShockwave(this.x, this.y, 9.0, '#c084fc');
      particleSystem.emitShockwave(this.x, this.y, 14.0, '#ef4444');

      const count = 24;
      for (let i = 0; i < count; i++) {
        const ang = this.spiralAngle * 1.5 + (Math.PI * 2 / count) * i;
        const tx = this.x + Math.cos(ang) * 16;
        const ty = this.y + Math.sin(ang) * 16;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.2,
          'void',
          false,
          6.5,
          '#c084fc',
          'void_skull',
          i % 3 === 0,
          1,
          this.name
        );
      }

      // 4 Cross Mega Blast Waves
      for (let m = 0; m < 4; m++) {
        const ang = (Math.PI / 2) * m + this.spiralAngle * 0.5;
        projectileManager.spawn(
          this.x,
          this.y,
          this.x + Math.cos(ang) * 18,
          this.y + Math.sin(ang) * 18,
          this.damage * 1.4,
          'void',
          false,
          5.5,
          '#ef4444',
          'mega_plasma_orb',
          false,
          99,
          this.name
        );
      }

    // ==========================================
    // 7. COSMIC SAMPO & ILMARINEN: Kirjokansi Celestial Laser Starburst
    // ==========================================
    } else {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 / count) * i;
        const tx = this.x + Math.cos(ang) * 16;
        const ty = this.y + Math.sin(ang) * 16;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.25,
          'shock',
          false,
          7.2,
          '#fbbf24',
          'golden_rune_shard',
          false,
          1,
          this.name
        );
      }
      soundEngine.playSyntysanatAnvil();
    }
  }

  // ==========================================================================
  // STANDARD ENEMY COMBAT METHODS
  // ==========================================================================

  private performArchetypeAttack(playerX: number, playerY: number, distToPlayer: number) {
    // Rune Cipher Carriers: Swift melee cleave strike (balanced interval)
    if (this.hasRuneShard) {
      this.attackCooldown = 1.35;
      this.lungeTimer = 0.35;
      this.meleeHitDone = false;
      soundEngine.playMeleeSwing();
      particleSystem.emitShockwave(this.x, this.y, 1.8, '#f59e0b');
      particleSystem.emitSparks(this.x, this.y, 0.35, '#facc15', 3);
      return;
    }

    if (this.type.includes('hound') || this.type.includes('wolf')) {
      this.attackCooldown = 1.3;
      this.isPouncing = true;
      this.lungeTimer = 0.38;
      this.meleeHitDone = false;
      soundEngine.playMeleeSwing();
      particleSystem.emitSparks(this.x, this.y, 0.2, '#10b981', 3);
      setTimeout(() => { this.isPouncing = false; }, 350);
      return;
    }

    if (this.type.includes('marauder') || this.type.includes('trooper')) {
      this.attackCooldown = 1.5;
      this.lungeTimer = 0.35;
      this.meleeHitDone = false;
      if (this.isRanged && distToPlayer > 2.0 && Math.random() < 0.6) {
        projectileManager.spawn(
          this.x,
          this.y,
          playerX,
          playerY,
          this.damage * 1.1,
          'shock',
          false,
          8.5,
          '#f59e0b',
          'scrap_buzzsaw',
          false,
          1,
          this.name
        );
        soundEngine.playRailgunShot();
      } else {
        soundEngine.playMeleeSwing();
        particleSystem.emitShockwave(this.x, this.y, 1.6, '#facc15');
      }
      return;
    }

    // 0. Magma Broodmother Colossus (Omnidirectional Radial Magma Barrage — Giant Colossus only!)
    const isGiantBroodmother = !this.name.includes('Wisp') && !this.name.includes('Hatchling') && !this.type.includes('wisp') && (this.type.includes('broodmother') || this.type.includes('matriarch') || this.type.includes('tulipesä'));
    if (isGiantBroodmother) {
      this.attackCooldown = 2.8;
      const fireballCount = 6;
      const baseOffset = Math.random() * Math.PI;

      for (let f = 0; f < fireballCount; f++) {
        const ang = baseOffset + (f * (Math.PI * 2 / fireballCount));
        const tx = this.x + Math.cos(ang) * 10;
        const ty = this.y + Math.sin(ang) * 10;

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.1,
          'fire',
          false,
          5.6,
          '#f97316',
          'magma_bomb',
          false,
          1,
          this.name
        );
      }
      soundEngine.playExplosion();
      particleSystem.emitSparks(this.x, this.y, 0.45, '#f97316', 6);
      return;
    }

    // 1. Dedicated Homing Seeker & Tracking Artillery Enemies
    if (this.type.includes('seeker') || this.type.includes('tracker') || this.type.includes('torpedo') || this.type.includes('skullcaster') || this.type.includes('archon')) {
      this.attackCooldown = 1.9;
      const isBurst = this.isElite || this.type.includes('archon') || this.type.includes('seeker');
      const count = isBurst ? 2 : 1;

      for (let s = 0; s < count; s++) {
        const offsetAng = s === 0 ? (count > 1 ? -0.22 : 0) : 0.22;
        const baseAng = Math.atan2(playerY - this.y, playerX - this.x) + offsetAng;
        const tx = this.x + Math.cos(baseAng) * 10;
        const ty = this.y + Math.sin(baseAng) * 10;
        const pStyle = this.damageType === 'void' ? 'void_skull' : (this.damageType === 'fire' ? 'magma_bomb' : (this.damageType === 'frost' ? 'frost_shard' : 'homing_missile'));

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage * 1.15,
          this.damageType,
          false,
          5.6,
          this.color,
          pStyle,
          true, // HOMING BULLET!
          1,
          this.name
        );
      }
      soundEngine.playRunicCast();
      return;
    }

    if (this.type.includes('drone') || this.type.includes('frost')) {
      this.attackCooldown = 1.8;
      const baseAng = Math.atan2(playerY - this.y, playerX - this.x);
      const spreads = [-0.25, 0, 0.25];

      spreads.forEach(offset => {
        const tx = this.x + Math.cos(baseAng + offset) * 12;
        const ty = this.y + Math.sin(baseAng + offset) * 12;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          this.damage,
          'frost',
          false,
          7.5,
          '#67e8f9',
          'frost_shard',
          false,
          1,
          this.name
        );
      });
      soundEngine.playRailgunShot();
      return;
    }

    if (this.type.includes('necro') || this.type.includes('turret') || this.type.includes('harvester')) {
      this.attackCooldown = 2.2;
      projectileManager.spawn(
        this.x,
        this.y,
        playerX,
        playerY,
        this.damage * 1.25,
        'void',
        false,
        5.0,
        '#c084fc',
        'void_skull',
        true,
        1,
        this.name
      );
      soundEngine.playRunicCast();
      return;
    }

    if (this.type.includes('golem') || this.type.includes('automaton')) {
      this.attackCooldown = 2.0;
      projectileManager.spawn(
        this.x,
        this.y,
        playerX,
        playerY,
        this.damage * 1.3,
        'fire',
        false,
        6.0,
        '#f97316',
        'magma_bomb',
        false,
        1,
        this.name
      );
      soundEngine.playExplosion();
      return;
    }

    // Fallback Attack
    this.attackCooldown = 1.4;
    if (this.isRanged) {
      projectileManager.spawn(
        this.x,
        this.y,
        playerX,
        playerY,
        this.damage,
        this.damageType,
        false,
        7.0,
        this.color,
        'plasma_bolt',
        false,
        1,
        this.name
      );
      soundEngine.playRailgunShot();
    } else {
      this.lungeTimer = 0.35;
      this.meleeHitDone = false;
      soundEngine.playMeleeSwing();
      particleSystem.emitShockwave(this.x, this.y, 1.3, this.color);
    }
  }

  takeDamage(amount: number, type: DamageType = 'physical', shieldBonusMultiplier: number = 0): boolean {
    if (this.isDead) return false;

    let finalAmt = amount;

    // Shield barrier absorption & shield break logic
    if (this.shield > 0) {
      // Bonus shield damage from upgraded weapons (extra areal / shield damage!)
      const shieldShredMult = 1.0 + Math.max(0, shieldBonusMultiplier);
      const shieldDmg = Math.round(amount * shieldShredMult);
      this.shield -= shieldDmg;
      particleSystem.emitShockwave(this.x, this.y, 1.2, '#38bdf8');
      particleSystem.emitSparks(this.x, this.y, 0.3, '#38bdf8', 4);

      if (this.shield <= 0) {
        this.shield = 0;
        this.isShielded = false;
        soundEngine.playHitImpact(true);
        particleSystem.emitShockwave(this.x, this.y, 2.4, '#38bdf8');
        for (let i = 0; i < 8; i++) {
          particleSystem.emitSparks(this.x, this.y, 0.4, '#38bdf8', 2);
        }
      }
      // Residual damage to health if shield was broken
      finalAmt = this.shield === 0 ? Math.round(amount * 0.4) : 0;
    } else if (this.isShielded) {
      if (shieldBonusMultiplier >= 0.35) {
        // High shield shred shatters the barrier
        this.isShielded = false;
        soundEngine.playHitImpact(true);
        particleSystem.emitShockwave(this.x, this.y, 2.0, '#38bdf8');
      } else {
        finalAmt = Math.round(amount * 0.5);
      }
    }

    if (finalAmt > 0) {
      this.health = Math.max(0, this.health - finalAmt);
    }
    this.hurtFlashTimer = 0.12;

    soundEngine.playHitImpact(amount > 30);
    particleSystem.emitSplatter(this.x, this.y, this.color, this.isMech);

    if (this.health <= 0) {
      this.isDead = true;
      for (let i = 0; i < (this.isBoss ? 25 : 6); i++) {
        particleSystem.emitSparks(this.x, this.y, 0.45, this.color, 2);
      }
      return true;
    }
    return false;
  }

  generateDrop(itemLevel: number): Item[] {
    const drops: Item[] = [];
    // Tuned down drop rates: loot drops are rare and exciting
    const dropChance = this.isBoss ? 1.0 : this.isElite ? 0.25 : 0.07;

    if (Math.random() < dropChance) {
      const rarityRoll = Math.random();
      let rarity: ItemRarity = 'common';
      if (this.isBoss) {
        rarity = itemLevel >= 5 ? (rarityRoll > 0.6 ? 'relic' : 'masterwork') : (rarityRoll > 0.5 ? 'masterwork' : 'runic');
      } else if (this.isElite) {
        rarity = rarityRoll > 0.88 ? 'masterwork' : (rarityRoll > 0.50 ? 'runic' : (rarityRoll > 0.15 ? 'augmented' : 'common'));
      } else {
        // Normal enemy: mostly common, rare augmented
        rarity = rarityRoll > 0.96 ? 'runic' : (rarityRoll > 0.72 ? 'augmented' : 'common');
      }

      drops.push(ItemGenerator.generateRandomLoot(itemLevel, rarity));
    }
    return drops;
  }
}
