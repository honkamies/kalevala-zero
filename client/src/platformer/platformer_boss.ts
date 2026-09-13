// Colossal Retro 16-Bit Cosmic Horror Boss: Massive Eldritch Abomination
// Features Gaping Vertical Maw, Weeping Eyes, Exposed Ribcage & Rooted Centipede Carapace

import { DamageType } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';
import { projectileManager } from '../entities/projectile';
import { combatEngine } from '../systems/combat';

export interface BossSubTarget {
  id: string;
  name: string;
  relX: number;
  relY: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  color: string;
  type: 'eyestalk_cluster' | 'vertical_maw' | 'exposed_heart' | 'weeping_eyes' | 'centipede_base';
  attackTimer: number;
  maxAttackTimer: number;
  hurtFlashTimer: number;
}

export class ColossalRTypeBoss {
  public id: string = 'boss_cosmic_horror_entity';
  public name: string = 'THE ELDRITCH ABOMINATION // COSMIC HORROR';
  public subtitle: string = 'Pale Twisted Flesh, Skeletal Ribcage, Weeping Eyes & Gaping Vertical Maw';
  public anchorX: number;
  public anchorY: number;

  public width: number = 13.5;  // 13.5 tiles wide (~650px)
  public height: number = 18.0; // 18.0 tiles high (~860px)

  public level: number = 30; // Boosted start level for final colossal horror
  public health: number = 24000;
  public maxHealth: number = 24000;
  public isDead: boolean = false;
  public isEnraged: boolean = false;
  public pulseTimer: number = 0;
  public hurtFlashTimer: number = 0;

  public playerLookX: number = 0;
  public playerLookY: number = 0;

  // 5 Anatomical Destructible Organs / Maws / Eyes on the Grand Being
  public targets: BossSubTarget[] = [];

  // 4 Orbiting Parasitic Eyeball Minions
  public drones: { angle: number; radius: number; health: number; maxHealth: number; isDestroyed: boolean; hurtFlashTimer: number }[] = [];

  // Heart Core State (Exposed periodically for massive critical damage)
  public heartOpen: boolean = true;
  public heartTimer: number = 4.5;

  constructor(anchorX: number, anchorY: number) {
    this.anchorX = anchorX;
    this.anchorY = anchorY;

    this.targets = [
      // 1. Top Eyestalks & Dead Tree Gnarls (y: -6.5)
      {
        id: 'tgt_eyestalks',
        name: 'Top Weeping Eyestalk Cluster',
        relX: -2.0,
        relY: -6.5,
        width: 3.5,
        height: 3.0,
        health: 3200,
        maxHealth: 3200,
        isDestroyed: false,
        color: '#a855f7',
        type: 'eyestalk_cluster',
        attackTimer: 2.6,
        maxAttackTimer: 3.4,
        hurtFlashTimer: 0
      },
      // 2. Gaping Vertical Maw with Mismatched Fangs (y: -2.0)
      {
        id: 'tgt_vertical_maw',
        name: 'Gaping Vertical Fanged Maw',
        relX: -2.6,
        relY: -2.0,
        width: 4.2,
        height: 4.0,
        health: 5400,
        maxHealth: 5400,
        isDestroyed: false,
        color: '#dc2626',
        type: 'vertical_maw',
        attackTimer: 2.8,
        maxAttackTimer: 3.6,
        hurtFlashTimer: 0
      },
      // 3. Exposed Skeletal Ribcage & Eldritch Heart (CRITICAL SPOT) (y: -2.5)
      {
        id: 'tgt_exposed_heart',
        name: 'Exposed Skeletal Heart Core (WEAKSPOT)',
        relX: 0.2,
        relY: -2.5,
        width: 3.5,
        height: 3.5,
        health: 7200,
        maxHealth: 7200,
        isDestroyed: false,
        color: '#facc15',
        type: 'exposed_heart',
        attackTimer: 4.5,
        maxAttackTimer: 5.5,
        hurtFlashTimer: 0
      },
      // 4. Mid-Body Weeping Eye Column (y: 2.2)
      {
        id: 'tgt_weeping_eyes',
        name: 'Weeping Cosmic Eye Column',
        relX: -1.0,
        relY: 2.2,
        width: 3.8,
        height: 3.5,
        health: 3800,
        maxHealth: 3800,
        isDestroyed: false,
        color: '#eab308',
        type: 'weeping_eyes',
        attackTimer: 3.0,
        maxAttackTimer: 3.8,
        hurtFlashTimer: 0
      },
      // 5. Rooted Centipede Carapace & Talons (y: 6.5)
      {
        id: 'tgt_centipede_base',
        name: 'Rooted Centipede Carapace & Talons',
        relX: -0.5,
        relY: 6.5,
        width: 5.2,
        height: 3.8,
        health: 4400,
        maxHealth: 4400,
        isDestroyed: false,
        color: '#16a34a',
        type: 'centipede_base',
        attackTimer: 2.4,
        maxAttackTimer: 3.2,
        hurtFlashTimer: 0
      }
    ];

    // 4 Orbiting Parasitic Eyeball Minions
    for (let i = 0; i < 4; i++) {
      this.drones.push({
        angle: (i * Math.PI) / 2,
        radius: 5.5,
        health: 800,
        maxHealth: 800,
        isDestroyed: false,
        hurtFlashTimer: 0
      });
    }

    this.recalculateMasterHealth();
  }

  recalculateMasterHealth() {
    let current = 0;
    let max = 0;
    this.targets.forEach(t => {
      current += t.health;
      max += t.maxHealth;
    });
    this.drones.forEach(d => {
      current += d.health;
      max += d.maxHealth;
    });
    this.health = current;
    this.maxHealth = max;
  }

  public isAwakened: boolean = false;

  update(dt: number, playerX: number, playerY: number) {
    if (this.isDead) return;

    // The Colossal Boss only awakens and attacks when player enters the Boss Arena (Zone 5, x >= 118)
    if (playerX < 118) {
      return;
    }

    if (!this.isAwakened) {
      this.isAwakened = true;
      soundEngine.playEnemyVoidSkull();
      combatEngine.addFloatingText(this.anchorX - 3.0, this.anchorY - 2.0, '👁️ COSMIC HORROR AWAKENED 👁️', 'crit');
    }

    this.playerLookX = playerX;
    this.playerLookY = playerY;
    this.pulseTimer += dt * 2.8;

    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;

    // 1. Orbiting Parasitic Eyeballs
    this.drones.forEach((d) => {
      if (d.isDestroyed) return;
      if (d.hurtFlashTimer > 0) d.hurtFlashTimer -= dt;

      d.angle += 0.95 * dt;

      if (Math.random() < 0.016) {
        const droneX = this.anchorX - 2.0 + Math.cos(d.angle) * d.radius;
        const droneY = this.anchorY + Math.sin(d.angle) * (d.radius * 0.75);
        soundEngine.playEnemyPlasmaFire();
        projectileManager.spawn(
          droneX,
          droneY,
          playerX,
          playerY,
          18,
          'void',
          false,
          7.2,
          '#ef4444',
          'plasma_bolt'
        );
      }
    });

    // 2. Destructible Organs
    this.targets.forEach(t => {
      if (t.isDestroyed) return;
      if (t.hurtFlashTimer > 0) t.hurtFlashTimer -= dt;

      t.attackTimer -= dt;
      if (t.attackTimer <= 0) {
        t.attackTimer = t.maxAttackTimer;
        this.executeTargetAttack(t, playerX, playerY);
      }
    });

    // 3. Heart Core Exposure Timing
    this.heartTimer -= dt;
    if (this.heartTimer <= 0) {
      this.heartOpen = !this.heartOpen;
      this.heartTimer = this.heartOpen ? 4.8 : 2.5;

      if (this.heartOpen) {
        soundEngine.playEnemyVoidSkull();
        particleSystem.emitBeacon(this.anchorX + 0.2, this.anchorY - 2.5, '#facc15');
        combatEngine.addFloatingText(this.anchorX - 1.5, this.anchorY - 2.5, '⚡ HEART EXPOSED // WEAKSPOT CRITICAL!', 'crit');
      }
    }

    // 4. Overdrive Meltdown Frenzy
    const destroyedCount = this.targets.filter(t => t.isDestroyed).length;
    if (destroyedCount >= 2 && !this.isEnraged) {
      this.isEnraged = true;
      soundEngine.playEnemyVoidSkull();
      this.targets.forEach(t => { t.maxAttackTimer *= 0.70; });
      combatEngine.addFloatingText(this.anchorX - 3.0, this.anchorY - 2.0, '🩸 ELDRITCH MELTDOWN: FRENZIED AGONY!', 'crit');
    }

    this.recalculateMasterHealth();
  }

  private executeTargetAttack(t: BossSubTarget, playerX: number, playerY: number) {
    const originX = this.anchorX + t.relX;
    const originY = this.anchorY + t.relY;

    if (t.type === 'eyestalk_cluster') {
      // 3-way cosmic void bolts from eyestalks
      soundEngine.playRailgunShot();
      particleSystem.emitSparks(originX, originY, 0.4, '#a855f7', 6);
      [-0.22, 0, 0.22].forEach(angleOffset => {
        const dx = playerX - originX;
        const dy = playerY - originY;
        const baseAngle = Math.atan2(dy, dx);
        const finalAngle = baseAngle + angleOffset;
        projectileManager.spawn(
          originX,
          originY,
          originX + Math.cos(finalAngle) * 15,
          originY + Math.sin(finalAngle) * 15,
          26,
          'void',
          false,
          8.8,
          '#a855f7',
          'plasma_bolt'
        );
      });
    } else if (t.type === 'vertical_maw') {
      // Spews dark mist void skulls from the vertical fanged maw
      soundEngine.playExplosion();
      particleSystem.emitBlood(originX, originY, 12, '#dc2626');
      [-0.18, 0.18].forEach(spread => {
        const dx = playerX - originX;
        const dy = playerY - originY;
        const baseAngle = Math.atan2(dy, dx) + spread;
        projectileManager.spawn(
          originX,
          originY,
          originX + Math.cos(baseAngle) * 14,
          originY + Math.sin(baseAngle) * 14,
          32,
          'void',
          false,
          7.5,
          '#ef4444',
          'void_skull'
        );
      });
    } else if (t.type === 'exposed_heart') {
      // Massive cosmic death ray from the exposed heart
      soundEngine.playRailgunShot();
      particleSystem.emitSparks(originX, originY, 0.5, '#facc15', 8);
      projectileManager.spawn(
        originX,
        originY,
        playerX,
        playerY,
        38,
        'void',
        false,
        14.0,
        '#facc15',
        'plasma_bolt'
      );
    } else if (t.type === 'weeping_eyes') {
      // Black slime homing missile barrage
      soundEngine.playEnemyVoidSkull();
      particleSystem.emitSplatter(originX, originY, '#eab308');
      [-1, 1].forEach(offset => {
        projectileManager.spawn(
          originX,
          originY + offset * 0.6,
          playerX,
          playerY,
          22,
          'void',
          false,
          5.8,
          '#eab308',
          'homing_missile',
          true
        );
      });
    } else if (t.type === 'centipede_base') {
      // Lobs creeping magma slag bombs along the bottom floor
      soundEngine.playExplosion();
      particleSystem.emitSplatter(originX, originY, '#16a34a');
      [-1, -2].forEach(spread => {
        projectileManager.spawn(
          originX,
          originY,
          originX - 14,
          originY + spread,
          32,
          'void',
          false,
          7.5,
          '#22c55e',
          'magma_bomb'
        );
      });
    }
  }

  public getRemainingOrgansCount(): number {
    return this.targets.filter(t => t.type !== 'exposed_heart' && !t.isDestroyed).length;
  }

  public isCoreVulnerable(): boolean {
    return this.getRemainingOrgansCount() === 0;
  }

  // Hit detection against all organs, eyes, and orbiting parasites
  hitTest(projX: number, projY: number, projRadius: number, damage: number, damageType: DamageType): { hit: boolean; isCrit: boolean; subTargetName: string } {
    if (this.isDead) return { hit: false, isCrit: false, subTargetName: '' };

    // 1. Check Orbiting Eyeballs
    for (const d of this.drones) {
      if (d.isDestroyed) continue;
      const droneX = this.anchorX - 2.0 + Math.cos(d.angle) * d.radius;
      const droneY = this.anchorY + Math.sin(d.angle) * (d.radius * 0.75);
      const dist = Math.sqrt((droneX - projX) ** 2 + (droneY - projY) ** 2);

      if (dist < 0.85 + projRadius) {
        d.health = Math.max(0, d.health - damage);
        d.hurtFlashTimer = 0.15;
        this.hurtFlashTimer = 0.12;
        soundEngine.playHitImpact(false);
        particleSystem.emitBlood(droneX, droneY, 16, '#dc2626');

        if (d.health <= 0) {
          d.isDestroyed = true;
          soundEngine.playExplosion();
          particleSystem.emitPlatformerGoreDeath(droneX, droneY, '#dc2626', false, true);
          combatEngine.addFloatingText(droneX, droneY, '💥 PARASITE EYE POPPED!', 'crit');
        }
        this.recalculateMasterHealth();
        return { hit: true, isCrit: false, subTargetName: 'Eyeball Parasite' };
      }
    }

    // 2. Check Flesh Organs & Eyes
    for (const t of this.targets) {
      if (t.isDestroyed) continue;
      const tx = this.anchorX + t.relX;
      const ty = this.anchorY + t.relY;

      const halfW = t.width * 0.5;
      const halfH = t.height * 0.5;

      if (
        projX >= tx - halfW - projRadius &&
        projX <= tx + halfW + projRadius &&
        projY >= ty - halfH - projRadius &&
        projY <= ty + halfH + projRadius
      ) {
        const isHeart = t.type === 'exposed_heart';

        // MAIN TARGET CORE PROTECTION: Heart core CANNOT be harmed until all other 4 sub-targets are destroyed!
        if (isHeart) {
          const remainingOrgans = this.getRemainingOrgansCount();
          if (remainingOrgans > 0) {
            soundEngine.playHitImpact(true);
            particleSystem.emitSparks(tx, ty, 0.45, '#38bdf8', 6);
            combatEngine.addFloatingText(tx, ty - 0.6, `🛡️ SHIELDED! (${remainingOrgans} Organs Remain)`, 'heal');
            return { hit: true, isCrit: false, subTargetName: 'Heart Core (Shielded)' };
          }
        }

        const isCrit = isHeart && this.heartOpen;
        const effectiveDamage = isCrit ? Math.round(damage * 2.5) : damage;

        t.health = Math.max(0, t.health - effectiveDamage);
        t.hurtFlashTimer = 0.18;
        this.hurtFlashTimer = 0.15;
        soundEngine.playHitImpact(isCrit);

        particleSystem.emitBlood(tx, ty, isCrit ? 28 : 18, t.color);

        if (t.health <= 0) {
          t.isDestroyed = true;
          soundEngine.playExplosion();
          particleSystem.emitPlatformerGoreDeath(tx, ty, '#dc2626', true, false);
          combatEngine.addFloatingText(tx, ty - 1.0, `💥 ${t.name.toUpperCase()} SEVERED!`, 'crit');

          const remaining = this.getRemainingOrgansCount();
          if (remaining === 0) {
            // ALL 4 PERIPHERAL ORGANS ARE DESTROYED! BONE BARRIER SHATTERS!
            soundEngine.playHeroExplosionCataclysm();
            soundEngine.playSpecialCharge();
            particleSystem.emitShockwave(this.anchorX + 0.2, this.anchorY - 2.5, 6.0, '#facc15');
            particleSystem.emitBeacon(this.anchorX + 0.2, this.anchorY - 2.5, '#ef4444');
            combatEngine.addFloatingText(this.anchorX - 1.5, this.anchorY - 2.5, '⚡ BONE BARRIER SHATTERED // HEART CORE VULNERABLE! ⚡', 'crit');
          } else {
            combatEngine.addFloatingText(this.anchorX - 1.5, this.anchorY - 2.5, `🛡️ BONE BARRIER WEAKENED: ${remaining} Organs Remain!`, 'heal');
          }
        }

        this.recalculateMasterHealth();

        const heartDestroyed = this.targets.find(tg => tg.type === 'exposed_heart')?.isDestroyed;
        if (heartDestroyed || this.health <= 0) {
          this.isDead = true;
          this.triggerCataclysmicDeath();
        }

        return { hit: true, isCrit, subTargetName: t.name };
      }
    }

    return { hit: false, isCrit: false, subTargetName: '' };
  }

  private triggerCataclysmicDeath() {
    this.isDead = true;
    soundEngine.playHeroExplosionCataclysm();

    // Multi-stage cascading gargantuan gore and arterial fountain detonations collapsing the flesh wall
    for (let i = 0; i < 40; i++) {
      const exX = this.anchorX - 5.5 + Math.random() * 9.0;
      const exY = this.anchorY - 9.0 + Math.random() * 18.0;
      setTimeout(() => {
        soundEngine.playExplosion();
        particleSystem.emitPlatformerGoreDeath(exX, exY, '#dc2626', true, true);
        particleSystem.emitSparks(exX, exY, 0.8, '#c084fc', 12);
      }, i * 60);
    }

    combatEngine.addFloatingText(this.anchorX - 2.0, this.anchorY, '★ ELDRITCH ABOMINATION OBLITERATED! ★', 'crit');
  }
}
