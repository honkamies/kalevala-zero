// Platformer Player Controller: Auto-Step Smooth Movement, Generous Collision Box, and Fatal Abyss Pit Falls

import { Player } from '../entities/player';
import { PlatformTileType, PlatformerLevel } from './platformer_types';
import { ColossalRTypeBoss } from './platformer_boss';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';
import { combatEngine } from '../systems/combat';

export class PlatformerPlayerController {
  public player: Player;
  public x: number = 0; // In tile coordinates
  public y: number = 0; // In tile coordinates
  public vx: number = 0;
  public vy: number = 0;

  // Slim, agile collision box (prevents sticking to platforms or low ceilings)
  public width: number = 0.60;
  public height: number = 1.15;

  // Platformer Physics Constants
  public readonly GRAVITY: number = 28.0;
  public readonly MOVE_ACCEL: number = 42.0;
  public readonly MOVE_DECEL: number = 34.0;
  public readonly MAX_MOVE_SPEED: number = 6.2;      // Controlled, grounded run speed
  public readonly JUMP_FORCE: number = -11.6;        // Normal standard first jump (~2.5 tiles)
  public readonly DOUBLE_JUMP_FORCE: number = -15.6; // High rocket double-jump boost!
  public readonly BOUNCE_FORCE: number = -20.5;      // High launch on golden bounce pads
  public readonly MAX_FALL_SPEED: number = 22.0;

  // State flags
  public isGrounded: boolean = false;
  public wasGrounded: boolean = false;
  public facingDir: number = 1; // 1 = right, -1 = left
  public canDoubleJump: boolean = true;
  public hasDoubleJumped: boolean = false;

  // Variable Jump Height
  public isJumping: boolean = false;
  public jumpHoldTimer: number = 0;
  public readonly MAX_JUMP_HOLD_TIME: number = 0.12;

  // Coyote time & Jump Buffering
  public coyoteTimer: number = 0;
  public readonly COYOTE_TIME: number = 0.14;
  public jumpBufferTimer: number = 0;
  public readonly JUMP_BUFFER: number = 0.15;

  // Air / Ground Dash Roll
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public readonly DASH_DURATION: number = 0.20;
  public dashCooldown: number = 0;
  public readonly DASH_COOLDOWN: number = 0.65;

  // Invulnerability & Hazard Flash
  public hurtTimer: number = 0;
  public muzzleFlashTimer: number = 0;
  public aimAngle: number = 0;

  constructor(player: Player, spawnX: number, spawnY: number) {
    this.player = player;
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facingDir = 1;
  }

  // Update physics step
  update(
    dt: number,
    level: PlatformerLevel,
    input: {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      jump: boolean;
      justJump: boolean;
      dash: boolean;
    },
    boss?: ColossalRTypeBoss | null
  ) {
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer -= dt;

    this.player.x = this.x;
    this.player.y = this.y;

    if (this.player.isDead) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    // Check Bottomless Abyss Fall (Instant Death)
    if (this.y >= level.height - 2.0) {
      this.triggerAbyssDeath();
      return;
    }

    // Solid Boss Physical Barrier (Prevents player from walking through boss)
    if (boss && !boss.isDead) {
      const bossWallX = boss.anchorX - 5.2;
      if (this.x > bossWallX) {
        this.x = bossWallX;
        this.vx = -6.0;
        if (this.hurtTimer <= 0 && !this.isDashing) {
          this.takeHazardDamage(20, 'ELDRITCH CARAPACE SPIKES');
        }
      }
    }

    // Handle Dash Roll
    if (input.dash && this.dashCooldown <= 0 && !this.isDashing) {
      this.startDash();
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.facingDir * (this.MAX_MOVE_SPEED * 2.0);
      this.vy = 0; // Anti-gravity during dash
      particleSystem.emitDodgeTrail(this.x, this.y, 0.25, '#38bdf8');
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Horizontal movement & acceleration
      let moveDir = 0;
      if (input.left) {
        moveDir -= 1;
        this.facingDir = -1;
      }
      if (input.right) {
        moveDir += 1;
        this.facingDir = 1;
      }

      const targetVx = moveDir * (this.MAX_MOVE_SPEED + (this.player.stats.nokkela * 0.04));
      if (moveDir !== 0) {
        this.vx += (targetVx - this.vx) * Math.min(1.0, this.MOVE_ACCEL * dt);
      } else {
        this.vx += (0 - this.vx) * Math.min(1.0, this.MOVE_DECEL * dt);
      }

      // Variable Jump Height
      if (input.jump && this.isJumping && this.jumpHoldTimer > 0) {
        this.jumpHoldTimer -= dt;
        this.vy += -14.0 * dt;
      } else {
        this.isJumping = false;
      }

      // Gravity
      this.vy = Math.min(this.MAX_FALL_SPEED, this.vy + this.GRAVITY * dt);

      // Coyote time calculation
      if (this.isGrounded) {
        this.coyoteTimer = this.COYOTE_TIME;
        this.hasDoubleJumped = false;
        this.canDoubleJump = true;
      } else {
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
      }

      // Jump Buffer check
      if (input.justJump) {
        this.jumpBufferTimer = this.JUMP_BUFFER;
      } else if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= dt;
      }

      // Jump Execution: Normal First Jump, Big Rocket Double-Jump Boost!
      if (this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          // 1. Normal First Jump
          this.vy = this.JUMP_FORCE;
          this.isGrounded = false;
          this.isJumping = true;
          this.jumpHoldTimer = this.MAX_JUMP_HOLD_TIME;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          soundEngine.playDodge();
          particleSystem.emitSparks(this.x, this.y + this.height * 0.5, 0.2, '#94a3b8', 3);
        } else if (this.canDoubleJump && !this.hasDoubleJumped) {
          // 2. High Runic Rocket Double Jump
          this.vy = this.DOUBLE_JUMP_FORCE;
          this.hasDoubleJumped = true;
          this.canDoubleJump = false;
          this.isJumping = true;
          this.jumpHoldTimer = this.MAX_JUMP_HOLD_TIME * 1.5;
          this.jumpBufferTimer = 0;
          soundEngine.playRunicCast();
          particleSystem.emitDodgeTrail(this.x, this.y + this.height * 0.4, 0.2, '#38bdf8');
          particleSystem.emitSparks(this.x, this.y + this.height * 0.5, 0.4, '#38bdf8', 6);
          combatEngine.addFloatingText(this.x, this.y - 0.4, '⚡ RUNIC BOOST JUMP', 'frost');
        }
      }
    }

    // Step horizontal movement with auto-step up for smooth stair climbing
    this.moveAndCollideX(this.vx * dt, level);

    // Step vertical movement & solid collisions
    this.moveAndCollideY(this.vy * dt, level);

    // Check bounce pad interactions
    this.checkTileInteractions(level);

    // Update Player combat timers & stats
    this.player.x = this.x;
    this.player.y = this.y;
    this.player.isDodging = this.isDashing;
    this.player.isInvulnerable = this.isDashing || this.hurtTimer > 0;
    this.player.walkTimer += Math.abs(this.vx) * dt * 4.0;
    this.player.updateTimers(dt);
  }

  private triggerAbyssDeath() {
    this.player.health = 0;
    this.player.isDead = true;
    soundEngine.playHeroExplosionCataclysm();
    particleSystem.emitHeroExplosion(this.x, this.y, this.player.appearance.archetype);
    combatEngine.addFloatingText(this.x, this.y - 1.0, '💀 FELL INTO THE ABYSS', 'crit');
  }

  private startDash() {
    this.isDashing = true;
    this.dashTimer = this.DASH_DURATION;
    this.dashCooldown = this.DASH_COOLDOWN;
    soundEngine.playDodge();
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 1.5, '#38bdf8');
    combatEngine.addFloatingText(this.x, this.y - 0.4, '⚡ AIR DASH', 'shock');
  }

  private moveAndCollideX(dx: number, level: PlatformerLevel) {
    const nextX = this.x + dx;
    const halfW = this.width * 0.5;
    const halfH = this.height * 0.5;

    const minTileX = Math.floor(nextX - halfW);
    const maxTileX = Math.floor(nextX + halfW);
    const minTileY = Math.floor(this.y - halfH + 0.08);
    const maxTileY = Math.floor(this.y + halfH - 0.08);

    let collided = false;
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      const checkX = dx > 0 ? maxTileX : minTileX;
      if (this.isSolidTile(level, checkX, ty)) {
        collided = true;
        break;
      }
    }

    if (!collided) {
      this.x = nextX;
    } else {
      // Auto Step-Up: If grounded and hitting a low 1-tile step, smoothly step up!
      if (this.isGrounded && Math.abs(dx) > 0) {
        const stepCheckY = this.y - 0.5;
        const stepMinTileY = Math.floor(stepCheckY - halfH + 0.08);
        const stepMaxTileY = Math.floor(stepCheckY + halfH - 0.08);
        let stepBlocked = false;
        for (let ty = stepMinTileY; ty <= stepMaxTileY; ty++) {
          const checkX = dx > 0 ? maxTileX : minTileX;
          if (this.isSolidTile(level, checkX, ty)) {
            stepBlocked = true;
            break;
          }
        }
        if (!stepBlocked) {
          this.y -= 0.45; // Smoothly step up onto ledge
          this.x = nextX;
          return;
        }
      }

      if (dx > 0) {
        this.x = maxTileX - halfW - 0.001;
      } else {
        this.x = minTileX + 1 + halfW + 0.001;
      }
      this.vx = 0;
    }
  }

  private moveAndCollideY(dy: number, level: PlatformerLevel) {
    const nextY = this.y + dy;
    const halfW = this.width * 0.5;
    const halfH = this.height * 0.5;

    const minTileX = Math.floor(this.x - halfW + 0.05);
    const maxTileX = Math.floor(this.x + halfW - 0.05);
    const minTileY = Math.floor(nextY - halfH);
    const maxTileY = Math.floor(nextY + halfH);

    this.wasGrounded = this.isGrounded;
    this.isGrounded = false;

    if (dy > 0) {
      let collided = false;
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.isSolidTile(level, tx, maxTileY)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        this.y = maxTileY - halfH - 0.001;
        this.vy = 0;
        this.isGrounded = true;
        this.isJumping = false;
        if (!this.wasGrounded) {
          particleSystem.emitSparks(this.x, this.y + halfH, 0.15, '#64748b', 3);
        }
      } else {
        this.y = nextY;
      }
    } else if (dy < 0) {
      let collided = false;
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.isSolidTile(level, tx, minTileY)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        this.y = minTileY + 1 + halfH + 0.001;
        this.vy = 0;
        this.isJumping = false;
      } else {
        this.y = nextY;
      }
    }
  }

  private checkTileInteractions(level: PlatformerLevel) {
    const halfH = this.height * 0.5;
    const feetY = Math.floor(this.y + halfH);
    const centerTileX = Math.floor(this.x);

    if (centerTileX < 0 || centerTileX >= level.width || feetY < 0 || feetY >= level.height) return;
    const tile = level.tiles[feetY][centerTileX];

    // Bounce Pad: High Propulsion
    if (tile === PlatformTileType.BOUNCE_PAD && this.vy >= -2.0) {
      this.vy = this.BOUNCE_FORCE;
      this.isGrounded = false;
      this.canDoubleJump = true;
      this.hasDoubleJumped = false;
      this.isJumping = true;
      this.jumpHoldTimer = this.MAX_JUMP_HOLD_TIME;
      soundEngine.playRunicCast();
      particleSystem.emitShockwave(this.x, this.y + this.height * 0.5, 2.5, '#facc15');
      combatEngine.addFloatingText(this.x, this.y - 0.5, '⚡ RUNIC LAUNCH!', 'crit');
    }
  }

  public takeHazardDamage(amount: number, hazardName: string) {
    this.hurtTimer = 0.55;
    // Controlled grounded recoil flinch (NO orbital vertical jump!)
    this.vy = Math.min(this.vy, -1.8);
    this.vx = -this.facingDir * 1.8;
    soundEngine.playHitImpact(true);
    
    // Tiny crimson blood droplet spurt from player
    particleSystem.emitBlood(this.x, this.y, 22);

    const died = this.player.takeDamage(amount, 'void', hazardName);
    combatEngine.addFloatingText(this.x, this.y - 0.5, `-${amount} [${hazardName}]`, 'crit');

    if (died) {
      this.player.isDead = true;
      soundEngine.playHeroExplosionCataclysm();
      particleSystem.emitHeroExplosion(this.x, this.y, this.player.appearance.archetype);
      combatEngine.addFloatingText(this.x, this.y - 1.0, '💥 KILLED IN ACTION', 'crit');
    }
    return died;
  }

  private isSolidTile(level: PlatformerLevel, tx: number, ty: number): boolean {
    if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) return false;
    return level.tiles[ty][tx] === PlatformTileType.SOLID_GROUND;
  }
}
