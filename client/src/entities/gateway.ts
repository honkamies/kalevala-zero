// Void Gateways / Destructible Spawner Rifts (Tuonen Railot & Syntyportaalit)

import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';

export class VoidGateway {
  public id: string;
  public x: number;
  public y: number;
  public name: string;
  public biomeId: string;
  public health: number;
  public maxHealth: number;
  public armor: number = 8;
  public isDestroyed: boolean = false;
  public isActive: boolean = false;
  public hasAlerted: boolean = false;
  public radius: number = 1.2;

  public spawnTimer: number = 0;
  public spawnInterval: number = 3.8; // Spawns minion every 3.8s
  public maxMinions: number = 5;
  public aliveMinionCount: number = 0;

  public pulseTimer: number = 0;
  public hurtFlashTimer: number = 0;

  constructor(x: number, y: number, biomeId: string = 'ilman_luominen', itemLevel: number = 1) {
    this.id = 'gateway_' + Math.random().toString(36).substring(2, 8);
    this.x = x;
    this.y = y;
    this.biomeId = biomeId;

    this.maxHealth = 220 + itemLevel * 30;
    this.health = this.maxHealth;

    const names: Record<string, string> = {
      ilman_luominen: 'Ilman Pyörre (Creation Vortex)',
      vainola: 'Kalevalan Kiroportti (Curse Gate)',
      pohjola: 'Pohjolan Huurre-Portti (Cryo-Rift)',
      tuonela: 'Tuonen Musta Railo (Nether Abyss Rift)',
      alinen: 'Alisen Tulikita (Magma Trench Rift)',
      ylinen: 'Ukon Yliskammio (Celestial Singularity)'
    };

    this.name = names[biomeId] || 'Syntyrailo (Cyber-Rift)';
  }

  // Check if player reveals the gateway in Fog of War
  checkVisionTrigger(isVisibleInFog: boolean, distToPlayer: number): boolean {
    if (this.isDestroyed || this.isActive) return false;

    // Trigger when revealed in Fog of War and within sensory range
    if (isVisibleInFog && distToPlayer <= 11) {
      this.isActive = true;
      this.hasAlerted = true;
      soundEngine.playExplosion();
      particleSystem.emitShockwave(this.x, this.y, 4.0, '#ef4444');
      particleSystem.emitBeacon(this.x, this.y, '#f59e0b');
      return true; // Just triggered
    }

    return false;
  }

  update(dt: number, onSpawnMinion: (x: number, y: number) => void) {
    if (this.isDestroyed) return;

    this.pulseTimer += dt * 3;
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;

    if (!this.isActive) return;

    // Spawning loop
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;

      if (this.aliveMinionCount < this.maxMinions) {
        // Spawn minion at small random offset around rift
        const angle = Math.random() * Math.PI * 2;
        const dist = 1.0 + Math.random() * 0.8;
        const sx = this.x + Math.cos(angle) * dist;
        const sy = this.y + Math.sin(angle) * dist;

        particleSystem.emitSparks(sx, sy, 0.5, '#ef4444', 12);
        soundEngine.playHitImpact(false);
        onSpawnMinion(sx, sy);
        this.aliveMinionCount++;
      }
    }
  }

  takeDamage(amount: number): boolean {
    if (this.isDestroyed) return false;

    this.health -= Math.max(1, amount);
    this.hurtFlashTimer = 0.12;

    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
      this.isActive = false;

      soundEngine.playLevelUp();
      particleSystem.emitShockwave(this.x, this.y, 6.0, '#38bdf8');
      particleSystem.emitSparks(this.x, this.y, 1.2, '#facc15', 30);
      return true; // Destroyed
    }

    return false;
  }
}
