// Platformer Enemy AI (Ground Patrols, Flying Wisps, and Platformer Bosses)

import { DamageType } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';
import { projectileManager } from '../entities/projectile';
import { combatEngine } from '../systems/combat';
import { PlatformTileType, PlatformerLevel } from './platformer_types';

export class PlatformerEnemy {
  public id: string;
  public name: string;
  public type: 'marauder' | 'hound' | 'wisp' | 'seeker' | 'broodmother' | 'boss';
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;

  public width: number = 0.8;
  public height: number = 1.2;
  public facingDir: number = -1;

  public health: number;
  public maxHealth: number;
  public speed: number;
  public damage: number;
  public damageType: DamageType = 'physical';
  public color: string = '#ef4444';
  public isBoss: boolean = false;
  public isElite: boolean = false;
  public isDead: boolean = false;

  public isGrounded: boolean = false;
  public patrolTimer: number = 0;
  public attackCooldown: number = 0;
  public hurtFlashTimer: number = 0;
  public walkTimer: number = 0;

  // Boss specific state
  public bossPhase: number = 1;
  public specialTimer: number = 3.0;
  public isLeaping: boolean = false;

  constructor(
    id: string,
    name: string,
    type: 'marauder' | 'hound' | 'wisp' | 'seeker' | 'broodmother' | 'boss',
    x: number,
    y: number,
    health: number,
    speed: number,
    damage: number,
    color: string = '#ef4444',
    isBoss: boolean = false,
    isElite: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;
    this.color = color;
    this.isBoss = isBoss;
    this.isElite = isElite;

    if (isBoss) {
      this.width = 1.8;
      this.height = 2.2;
    } else if (type === 'broodmother') {
      this.width = 1.6;
      this.height = 1.9;
      this.damageType = 'fire';
    } else if (type === 'hound') {
      this.width = 1.1;
      this.height = 0.9;
    } else if (type === 'wisp' || type === 'seeker') {
      this.width = 0.8;
      this.height = 0.8;
    }
  }

  update(dt: number, playerX: number, playerY: number, level: PlatformerLevel) {
    if (this.isDead) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;
    if (this.specialTimer > 0) this.specialTimer -= dt;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.facingDir = dx > 0 ? 1 : -1;

    if (this.type === 'wisp') {
      // Flying Wisp AI
      this.updateWisp(dt, dx, dy, dist, playerX, playerY);
    } else if (this.type === 'seeker') {
      // Flying Homing Seeker AI
      this.updateSeeker(dt, dx, dy, dist, playerX, playerY);
    } else if (this.type === 'broodmother') {
      // Walking Heavy Broodmother Colossus AI
      this.updateBroodmother(dt, dx, dy, dist, level);
    } else if (this.isBoss) {
      // Platformer Boss AI
      this.updateBoss(dt, dx, dy, dist, level);
    } else {
      // Ground Patrol AI (Marauder / Hound)
      this.updateGroundEnemy(dt, dx, dy, dist, level);
    }

    this.walkTimer += Math.abs(this.vx) * dt * 5.0;
  }

  private updateBroodmother(dt: number, dx: number, dy: number, dist: number, level: PlatformerLevel) {
    const GRAVITY = 26.0;
    this.vy = Math.min(20.0, this.vy + GRAVITY * dt);

    // Walks towards player
    if (dist < 20.0) {
      const moveDir = dx > 0 ? 1 : -1;
      this.vx = moveDir * this.speed;

      // Omnidirectional 12-Way Radial Magma Barrage (Faster cooldown, heavier damage)
      if (this.attackCooldown <= 0 && dist < 16.0) {
        this.attackCooldown = 1.8;
        soundEngine.playExplosion();
        particleSystem.emitSparks(this.x, this.y, 0.7, '#f97316', 10);

        // Shoot fireballs to ALL 12 directions!
        for (let f = 0; f < 12; f++) {
          const ang = f * (Math.PI / 6) + (Math.random() - 0.5) * 0.1;
          const tx = this.x + Math.cos(ang) * 12;
          const ty = this.y - 0.5 + Math.sin(ang) * 12;

          projectileManager.spawn(
            this.x,
            this.y - 0.5,
            tx,
            ty,
            this.damage * 1.25,
            'fire',
            false,
            6.8,
            '#f97316',
            'magma_bomb',
            false,
            1,
            this.name
          );
        }
      }
    } else {
      this.vx = 0;
    }

    // Step physics & collision
    this.stepPhysics(dt, level);
  }

  private updateSeeker(dt: number, dx: number, dy: number, dist: number, playerX: number, playerY: number) {
    // Rapid hovering sinusoidal movement with aggressive strafe
    this.patrolTimer += dt * 3.2;
    const hoverY = Math.sin(this.patrolTimer) * 0.6;

    if (dist < 20.0) {
      let moveDirX = 0;
      let moveDirY = 0;
      if (dist > 8.0) {
        moveDirX = (dx / dist) * (this.speed * 1.2);
        moveDirY = (dy / dist) * (this.speed * 0.8);
      } else if (dist < 4.5) {
        moveDirX = -(dx / dist) * (this.speed * 1.2);
        moveDirY = -(dy / dist) * (this.speed * 0.8);
      }

      this.x += moveDirX * dt;
      this.y += (moveDirY + hoverY) * dt;

      // Shoot High-Speed Tracking Void Skull at Player
      if (this.attackCooldown <= 0 && dist < 16.0) {
        this.attackCooldown = 1.7;
        soundEngine.playEnemyVoidSkull();
        particleSystem.emitSparks(this.x, this.y, 0.45, '#c084fc', 6);
        projectileManager.spawn(
          this.x,
          this.y,
          playerX,
          playerY,
          this.damage * 1.25,
          'void',
          false,
          6.8,
          this.color,
          'void_skull',
          true, // High-Tracking Homing
          1,
          this.name
        );
      }
    }
  }

  private updateWisp(dt: number, dx: number, dy: number, dist: number, playerX: number, playerY: number) {
    // Fast hovering sinusoidal movement
    this.patrolTimer += dt * 3.8;
    const hoverY = Math.sin(this.patrolTimer) * 0.5;

    if (dist < 16.0) {
      // Rapid drift towards player
      const moveX = (dx / dist) * (this.speed * 1.15);
      const moveY = (dy / dist) * (this.speed * 0.65);
      this.x += moveX * dt;
      this.y += (moveY + hoverY) * dt;

      // Rapid Shock Plasma Fire (1.2s cooldown, fast 7.8 speed)
      if (this.attackCooldown <= 0 && dist < 12.0) {
        this.attackCooldown = 1.25;
        soundEngine.playEnemyPlasmaFire();
        particleSystem.emitSparks(this.x, this.y, 0.35, this.color, 4);
        projectileManager.spawn(
          this.x,
          this.y,
          playerX,
          playerY,
          this.damage,
          'shock',
          false,
          7.8,
          this.color,
          'plasma_bolt'
        );
      }
    }
  }

  private updateGroundEnemy(dt: number, dx: number, dy: number, dist: number, level: PlatformerLevel) {
    const GRAVITY = 26.0;
    this.vy = Math.min(20.0, this.vy + GRAVITY * dt);

    if (this.type === 'hound') {
      // Fast Aggressive Hound: High Aggro Range + Ledge Jump Pounce
      if (dist < 15.0) {
        this.vx = (dx > 0 ? 1 : -1) * (this.speed * 1.45);
        // Jump pounce if player is higher or jumping
        if (dy < -1.2 && this.isGrounded && dist < 7.0) {
          this.vy = -12.5;
          this.isGrounded = false;
          soundEngine.playDodge();
        }
      } else {
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.patrolTimer = 2.0 + Math.random() * 1.5;
          this.facingDir = Math.random() < 0.5 ? 1 : -1;
        }
        this.vx = this.facingDir * (this.speed * 0.7);
      }
    } else {
      // Armored Marauder: Ground Patrol + Rapid 2-Shot Plasma Rifle Fire
      if (dist < 16.0) {
        if (dist > 8.0) {
          this.vx = (dx > 0 ? 1 : -1) * this.speed;
        } else if (dist < 4.0) {
          this.vx = -(dx > 0 ? 1 : -1) * (this.speed * 0.8);
        } else {
          this.vx = 0;
        }

        // Shoot at player
        if (this.attackCooldown <= 0 && dist < 14.0) {
          this.attackCooldown = 1.6;
          soundEngine.playEnemyPlasmaFire();
          particleSystem.emitSparks(this.x, this.y - 0.2, 0.35, '#ef4444', 5);

          // Fast double plasma burst
          projectileManager.spawn(
            this.x,
            this.y - 0.2,
            this.x + (dx > 0 ? 12 : -12),
            this.y - 0.2 + (dy / dist) * 2,
            this.damage,
            'physical',
            false,
            8.2,
            '#ef4444',
            'plasma_bolt'
          );
        }
      } else {
        this.patrolTimer -= dt;
        if (this.patrolTimer <= 0) {
          this.patrolTimer = 2.5 + Math.random() * 2.0;
          this.facingDir = Math.random() < 0.5 ? 1 : -1;
        }
        this.vx = this.facingDir * (this.speed * 0.6);
      }
    }

    // Step physics & collision
    this.stepPhysics(dt, level);
  }

  private updateBoss(dt: number, dx: number, dy: number, dist: number, level: PlatformerLevel) {
    const GRAVITY = 28.0;
    this.vy = Math.min(22.0, this.vy + GRAVITY * dt);

    // Boss attack patterns
    if (this.specialTimer <= 0 && this.isGrounded) {
      this.specialTimer = 4.0 + Math.random() * 2.0;

      const choice = Math.random();
      if (choice < 0.5) {
        // High Leap Slam onto Player position
        this.vy = -14.0;
        this.vx = (dx > 0 ? 1 : -1) * 7.5;
        this.isGrounded = false;
        soundEngine.playDodge();
        particleSystem.emitSparks(this.x, this.y, 0.5, this.color, 8);
        combatEngine.addFloatingText(this.x, this.y - 1.0, '⚔️ LEAP SLAM!', 'crit');
      } else {
        // Dual Ground projectile blast
        soundEngine.playEnemyVoidSkull();
        particleSystem.emitSparks(this.x, this.y, 0.6, this.color, 12);
        combatEngine.addFloatingText(this.x, this.y - 1.0, '💥 STYGIAN ERUPTION!', 'void');

        // Spawn left & right rolling ground projectiles
        [-1, 1].forEach(dir => {
          projectileManager.spawn(
            this.x,
            this.y + 0.3,
            this.x + dir * 10,
            this.y + 0.3,
            this.damage * 1.2,
            'void',
            false,
            6.5,
            this.color,
            'void_skull'
          );
        });
      }
    } else if (!this.isLeaping) {
      // Approach player along ground
      this.vx = (dx > 0 ? 1 : -1) * this.speed;
    }

    this.stepPhysics(dt, level);
  }

  private stepPhysics(dt: number, level: PlatformerLevel) {
    const nextX = this.x + this.vx * dt;
    const nextY = this.y + this.vy * dt;
    const halfW = this.width * 0.5;
    const halfH = this.height * 0.5;

    // X Collision
    const tileMinX = Math.floor(nextX - halfW);
    const tileMaxX = Math.floor(nextX + halfW);
    const tileMinY = Math.floor(this.y - halfH + 0.1);
    const tileMaxY = Math.floor(this.y + halfH - 0.1);

    let hitWall = false;
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      const checkX = this.vx > 0 ? tileMaxX : tileMinX;
      if (this.isSolid(level, checkX, ty)) {
        hitWall = true;
        break;
      }
    }

    // Ledge detection (turn around before falling off if patrolling)
    if (!this.isBoss && this.isGrounded) {
      const footTileX = Math.floor(nextX + (this.vx > 0 ? halfW + 0.2 : -halfW - 0.2));
      const footTileY = Math.floor(this.y + halfH + 0.5);
      if (!this.isSolid(level, footTileX, footTileY)) {
        hitWall = true;
      }
    }

    if (!hitWall) {
      this.x = nextX;
    } else {
      this.facingDir = -this.facingDir;
      this.vx = -this.vx;
    }

    // Y Collision
    this.isGrounded = false;
    const yTileMinX = Math.floor(this.x - halfW + 0.1);
    const yTileMaxX = Math.floor(this.x + halfW - 0.1);
    const yTileMinY = Math.floor(nextY - halfH);
    const yTileMaxY = Math.floor(nextY + halfH);

    if (this.vy > 0) {
      let hitGround = false;
      for (let tx = yTileMinX; tx <= yTileMaxX; tx++) {
        if (this.isSolid(level, tx, yTileMaxY)) {
          hitGround = true;
          break;
        }
      }
      if (hitGround) {
        this.y = yTileMaxY - halfH - 0.001;
        this.vy = 0;
        this.isGrounded = true;
      } else {
        this.y = nextY;
      }
    } else if (this.vy < 0) {
      let hitCeil = false;
      for (let tx = yTileMinX; tx <= yTileMaxX; tx++) {
        if (this.isSolid(level, tx, yTileMinY)) {
          hitCeil = true;
          break;
        }
      }
      if (hitCeil) {
        this.y = yTileMinY + 1 + halfH + 0.001;
        this.vy = 0;
      } else {
        this.y = nextY;
      }
    }
  }

  takeDamage(amount: number, damageType: DamageType = 'physical'): boolean {
    this.health = Math.max(0, this.health - amount);
    this.hurtFlashTimer = 0.2;
    soundEngine.playHitImpact(false);
    particleSystem.emitDamageExplosion(this.x, this.y, this.color);

    if (this.health <= 0) {
      this.isDead = true;
      soundEngine.playEnemyDeath(this.isBoss, this.isElite);
      particleSystem.emitEnemyDeathExplosion(this.x, this.y, this.color, this.isBoss, this.isElite);
      return true;
    }
    return false;
  }

  private isSolid(level: PlatformerLevel, tx: number, ty: number): boolean {
    if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) return true;
    return level.tiles[ty][tx] === PlatformTileType.SOLID_GROUND;
  }
}
