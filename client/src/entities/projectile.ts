// Multi-Style Projectile Subsystem (Ice Shards, Electrified Buzzsaws, Void Skulls, Magma Bombs, Plasma Bolts)

import { DamageType } from '../systems/items';
import { particleSystem } from '../engine/particles';

export type ProjectileStyle =
  | 'plasma_bolt'
  | 'frost_shard'
  | 'scrap_buzzsaw'
  | 'void_skull'
  | 'magma_bomb'
  | 'lightning_arc'
  | 'mega_plasma_orb'
  | 'homing_missile'
  | 'golden_rune_shard'
  | 'aegis_shield_wave'
  | 'rail_slug'
  | 'scatter_pellet';

export interface Projectile {
  id: string;
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  damageType: DamageType;
  radius: number;
  color: string;
  glowColor: string;
  fromPlayer: boolean;
  life: number;
  maxLife: number;
  pierceCount: number;
  style: ProjectileStyle;
  spinAngle: number;
  spinSpeed: number;
  homing: boolean;
  damageFalloff?: boolean;
  sourceName?: string;
  trail: { x: number; y: number }[];
  hitEntityIds?: Set<string>;
  shieldDamageBonus?: number;
  areaRadius?: number;
}

export class ProjectileManager {
  public projectiles: Projectile[] = [];

  spawn(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    damageType: DamageType = 'plasma',
    fromPlayer: boolean = true,
    speed: number = 9.0,
    color: string = '#38bdf8',
    style: ProjectileStyle = 'plasma_bolt',
    homing: boolean = false,
    pierceCount: number = 1,
    sourceName: string = '',
    damageFalloff: boolean = false,
    shieldDamageBonus: number = 0,
    areaRadius: number = 0,
    lifeMultiplier: number = 1.0
  ) {
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0 || this.projectiles.length >= 150) return;

    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    const isShieldWave = style === 'aegis_shield_wave';
    const isMega = style === 'mega_plasma_orb';
    const isHeavy = style === 'magma_bomb' || style === 'scrap_buzzsaw';
    const isRail = style === 'rail_slug';
    const isScatter = style === 'scatter_pellet';

    const radius = isShieldWave ? 0.85 : (isMega ? 0.75 : (isHeavy ? 0.45 : (isRail ? 0.28 : (isScatter ? 0.25 : 0.35))));
    const baseLife = isShieldWave ? 0.55 : (isMega ? 3.2 : (style === 'void_skull' ? 3.5 : (style === 'homing_missile' ? 3.0 : (isRail ? 1.6 : (isScatter ? 0.55 : 2.5)))));
    const life = baseLife * Math.max(0.5, lifeMultiplier);
    const actualPierce = isShieldWave ? 99 : (isMega ? 99 : (isRail ? 3 : (style === 'scrap_buzzsaw' ? 2 : pierceCount)));

    this.projectiles.push({
      id: Math.random().toString(),
      x,
      y,
      startX: x,
      startY: y,
      vx,
      vy,
      speed,
      damage,
      damageType,
      radius,
      color,
      glowColor: color,
      fromPlayer,
      life,
      maxLife: life,
      pierceCount: actualPierce,
      style,
      spinAngle: Math.random() * Math.PI * 2,
      spinSpeed: style === 'scrap_buzzsaw' ? 18 : (isMega ? 6 : (style === 'frost_shard' ? 4 : 8)),
      homing,
      damageFalloff: isShieldWave || isScatter || damageFalloff,
      sourceName,
      trail: [],
      hitEntityIds: new Set<string>(),
      shieldDamageBonus,
      areaRadius
    });
  }

  update(
    dt: number,
    playerPos?: { x: number; y: number },
    isWall?: (x: number, y: number) => boolean,
    onHitWall?: (p: Projectile) => void,
    enemyTargets?: { x: number; y: number }[]
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Save trail point
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 8) p.trail.splice(0, p.trail.length - 8);

      // Spin rotation
      p.spinAngle += p.spinSpeed * dt;

      // Homing behavior for Enemy Projectiles towards Player
      if (p.homing && !p.fromPlayer && playerPos) {
        const hdx = playerPos.x - p.x;
        const hdy = playerPos.y - p.y;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hdist > 0.1) {
          const steerRate = 4.8 * dt;
          p.vx += (hdx / hdist) * p.speed * steerRate;
          p.vy += (hdy / hdist) * p.speed * steerRate;

          // Re-normalize velocity
          const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (currentSpeed > 0) {
            p.vx = (p.vx / currentSpeed) * p.speed;
            p.vy = (p.vy / currentSpeed) * p.speed;
          }
        }
      }

      // Homing behavior for Player Missiles/Darts towards Visible Enemies in Forward Sight
      if (p.homing && p.fromPlayer && enemyTargets && enemyTargets.length > 0) {
        let closest: { x: number; y: number } | null = null;
        let minDist = 10.5; // Max acquisition range for visible targets
        const projMoveAngle = Math.atan2(p.vy, p.vx);

        for (const target of enemyTargets) {
          const tdx = target.x - p.x;
          const tdy = target.y - p.y;
          const dist = Math.sqrt(tdx * tdx + tdy * tdy);

          if (dist < minDist) {
            // Only acquire targets in the forward flight cone (+/- 75 degrees of flight trajectory)
            const targetAngle = Math.atan2(tdy, tdx);
            let angleDiff = Math.abs(targetAngle - projMoveAngle);
            while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (angleDiff <= Math.PI * 0.42) {
              minDist = dist;
              closest = target;
            }
          }
        }

        // If a visible enemy was found in forward sight, smoothly steer towards it
        if (closest) {
          const hdx = closest.x - p.x;
          const hdy = closest.y - p.y;
          const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
          if (hdist > 0.05) {
            const steerRate = 5.5 * dt;
            p.vx += (hdx / hdist) * p.speed * steerRate;
            p.vy += (hdy / hdist) * p.speed * steerRate;

            // Re-normalize velocity to maintain exact speed
            const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (currentSpeed > 0) {
              p.vx = (p.vx / currentSpeed) * p.speed;
              p.vy = (p.vy / currentSpeed) * p.speed;
            }
          }
        }
      }

      // Movement
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Trail particle emission based on projectile style
      if (p.style === 'homing_missile') {
        particleSystem.emitSparks(p.x, p.y, 0.06, '#f97316', 1);
        if (Math.random() < 0.5) {
          particleSystem.emitSparks(p.x, p.y, 0.04, '#facc15', 1);
        }
      } else if (Math.random() < 0.35) {
        if (p.style === 'frost_shard') {
          particleSystem.emitSparks(p.x, p.y, 0.05, '#67e8f9', 1);
        } else if (p.style === 'scrap_buzzsaw') {
          particleSystem.emitSparks(p.x, p.y, 0.08, '#f59e0b', 1);
        } else if (p.style === 'void_skull') {
          particleSystem.emitSparks(p.x, p.y, 0.08, '#c084fc', 1);
        } else if (p.style === 'magma_bomb') {
          particleSystem.emitSparks(p.x, p.y, 0.1, '#f97316', 1);
        }
      }

      // Check wall collision
      if (isWall && isWall(p.x, p.y)) {
        if (p.style === 'homing_missile') {
          particleSystem.emitShockwave(p.x, p.y, 1.8, '#f97316');
          particleSystem.emitSparks(p.x, p.y, 0.3, '#facc15', 6);
        }
        if (onHitWall) onHitWall(p);
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
        continue;
      }

      if (p.life <= 0) {
        if (p.style === 'homing_missile') {
          particleSystem.emitShockwave(p.x, p.y, 1.8, '#f97316');
          particleSystem.emitSparks(p.x, p.y, 0.3, '#facc15', 6);
        } else if (p.style === 'magma_bomb') {
          particleSystem.emitShockwave(p.x, p.y, 1.2, '#f97316');
          particleSystem.emitSparks(p.x, p.y, 0.2, '#f97316', 6);
        }
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      }
    }
  }

  clear() {
    this.projectiles.length = 0;
  }

  remove(id: string) {
    const idx = this.projectiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.projectiles[idx] = this.projectiles[this.projectiles.length - 1];
      this.projectiles.pop();
    }
  }
}

export const projectileManager = new ProjectileManager();
