import { Item, ItemSlot, DamageType, WeaponCategory, getWeaponCategory, getStarterWeaponForArchetype, isBaseWeaponMatchingArchetype } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';
import { projectileManager } from './projectile';
import { combatEngine } from '../systems/combat';

export interface CharacterAppearance {
  phenotype: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  warPaint: string;
  implant: string;
  archetype: 'runoseppä' | 'tietäjä' | 'korvenraivaaja' | 'soturi';
}

export interface PlayerStats {
  vaki: number;     // Power / Runic Will
  sisu: number;     // Endurance / Resolve
  nokkela: number;  // Agility / Reflex
  tieto: number;    // Memory / Processing
  statPoints: number;
}

export const MAX_UNSPENT_STAT_POINTS = 5;

export function getDefaultStatsForArchetype(archetype: string): PlayerStats {
  switch (archetype) {
    case 'soturi':
      return { sisu: 12, nokkela: 6, vaki: 6, tieto: 6, statPoints: 0 };
    case 'korvenraivaaja':
      return { sisu: 6, nokkela: 12, vaki: 6, tieto: 6, statPoints: 0 };
    case 'tietäjä':
      return { sisu: 6, nokkela: 6, vaki: 12, tieto: 8, statPoints: 0 };
    case 'runoseppä':
    default:
      return { sisu: 7, nokkela: 6, vaki: 8, tieto: 11, statPoints: 0 };
  }
}

export const CUMULATIVE_WEAPON_SLOTS: ItemSlot[] = ['mainHand', 'weapon2', 'weapon3', 'weapon4', 'weapon5'];

export interface WeaponSlotUnlockConfig {
  slot: ItemSlot;
  label: string;
  reqLevel: number;
  reqClears: number;
}

export const WEAPON_SLOT_UNLOCK_CONFIGS: WeaponSlotUnlockConfig[] = [
  { slot: 'mainHand', label: 'WPN 1', reqLevel: 1, reqClears: 0 },
  { slot: 'weapon2', label: 'WPN 2', reqLevel: 3, reqClears: 1 },
  { slot: 'weapon3', label: 'WPN 3', reqLevel: 6, reqClears: 3 },
  { slot: 'weapon4', label: 'WPN 4', reqLevel: 10, reqClears: 5 },
  { slot: 'weapon5', label: 'WPN 5', reqLevel: 15, reqClears: 7 }
];

export interface AttackResult {
  performed: boolean;
  style:
    | 'lightning_cleave'
    | 'area_slag_slam'
    | 'death_ray'
    | 'triple_homing_salvo'
    | 'lyric_rune_chime'
    | 'heavy_hammer_slam'
    | 'vibro_blade_slash'
    | 'plasma_sword_cleave'
    | 'rail_rifle_shot'
    | 'scatter_shot_blast';
  damage: number;
  radius?: number;
  siphonPercent?: number;
  targetX?: number;
  targetY?: number;
  damageType?: DamageType;
  isCloseQuarters?: boolean;
  shieldDamageBonus?: number;
  areaRadius?: number;
  sourceWeaponName?: string;
}

export interface FatalDamageInfo {
  killerName: string;
  damageType: DamageType | string;
  amount: number;
  isCrit?: boolean;
}

export class Player {
  public id: string;
  public name: string;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public angle: number = 0;
  public radius: number = 0.45;

  // Visuals & Archetype
  public appearance: CharacterAppearance;
  public level: number = 1;
  public xp: number = 0;
  public stats: PlayerStats;

  // Inventory & Equipment & Cumulative Arsenal
  public baseWeapon!: Item;
  public inventory: Item[] = [];
  public equipment: Partial<Record<ItemSlot, Item>> = {};
  public naniteScrap: number = 0;

  // Dynamic Vitals
  public health: number = 100;
  public maxHealth: number = 100;
  public shield: number = 50;
  public maxShield: number = 50;
  public energy: number = 100;
  public maxEnergy: number = 100;
  public armor: number = 10;

  // Movement & Animation State
  public baseSpeed: number = 4.2;
  public speed: number = 4.2;
  public isMoving: boolean = false;
  public isInvulnerable: boolean = false;
  public isDodging: boolean = false;
  public dodgeTimer: number = 0;
  public dodgeDuration: number = 0.32;
  public dodgeCooldown: number = 0;
  public dodgeSpinAngle: number = 0;

  public walkTimer: number = 0;
  public idleTimer: number = 0;
  public stepCooldown: number = 0;
  public shieldRegenDelayTimer: number = 0;
  public isDead: boolean = false;
  public isDying: boolean = false;
  public deathTimer: number = 0;
  public lastFatalDamage: FatalDamageInfo | null = null;

  // Combat State & Animation
  public attackCooldown: number = 0;
  public meleeSwingTimer: number = 0;
  public meleeSwingDuration: number = 0.22;
  public hammerSlamTimer: number = 0;
  public hammerSlamDuration: number = 0.28;
  public deathRayActive: boolean = false;
  public deathRayDuration: number = 0.24;
  public deathRayTimer: number = 0;
  public deathRayTarget: { x: number; y: number } | null = null;
  public hurtFlashTimer: number = 0;

  // Archetype Special Attack State & Charge
  public specialCooldown: number = 0;
  public maxSpecialCooldown: number = 5.0;
  public isChargingSpecial: boolean = false;
  public specialChargeTime: number = 0;
  public maxSpecialChargeTime: number = 0.5;

  // Aegis Energy Shield Barrier (Right-Click Defense: 5s Duration + Recharge)
  public energyShieldActive: boolean = false;
  public energyShieldTimer: number = 0;
  public readonly energyShieldDuration: number = 5.0;
  public energyShieldCooldown: number = 0;
  public readonly energyShieldMaxCooldown: number = 6.0;
  public energyShieldRadius: number = 1.4;

  // Ability Cooldowns (in seconds)
  public cooldowns = {
    ability1: 0, // Ukonvasara
    ability2: 0, // Kipinä Dash
    ability3: 0, // Tuoni Siphon / Shield
    ability4: 0, // Sampo Overclock (Ultimate)
    potion: 0
  };

  public maxCooldowns = {
    ability1: 5.0,
    ability2: 4.0,
    ability3: 8.0,
    ability4: 18.0,
    potion: 6.0
  };

  // Overclock buff state
  public overclockTimer: number = 0;
  public postHitGraceTimer: number = 0;

  constructor(
    id: string,
    name: string,
    appearance?: Partial<CharacterAppearance>,
    stats?: Partial<PlayerStats>,
    inventory?: Item[],
    equipment?: Partial<Record<ItemSlot, Item>>,
    baseWeapon?: Item
  ) {
    this.id = id;
    this.name = name;
    this.appearance = {
      phenotype: appearance?.phenotype || 'cyber_runic',
      hairStyle: appearance?.hairStyle || 'cyber_braids',
      hairColor: appearance?.hairColor || '#38bdf8',
      skinTone: appearance?.skinTone || '#94a3b8',
      warPaint: appearance?.warPaint || 'ukko_spark',
      implant: appearance?.implant || 'neural_loom',
      archetype: appearance?.archetype || 'soturi'
    };

    const defaultStats = getDefaultStatsForArchetype(this.appearance.archetype);
    this.stats = {
      vaki: stats?.vaki !== undefined ? stats.vaki : defaultStats.vaki,
      sisu: stats?.sisu !== undefined ? stats.sisu : defaultStats.sisu,
      nokkela: stats?.nokkela !== undefined ? stats.nokkela : defaultStats.nokkela,
      tieto: stats?.tieto !== undefined ? stats.tieto : defaultStats.tieto,
      statPoints: stats?.statPoints || 0
    };

    this.inventory = inventory || [];
    this.equipment = equipment || {};

    const expectedStarterWeapon = getStarterWeaponForArchetype(this.appearance.archetype);
    if (!baseWeapon || !isBaseWeaponMatchingArchetype(baseWeapon, this.appearance.archetype)) {
      const prevUpgrade = baseWeapon?.upgradeLevel || 0;
      this.baseWeapon = { ...expectedStarterWeapon };
      if (prevUpgrade > 0) {
        this.baseWeapon.upgradeLevel = prevUpgrade;
      }
    } else {
      this.baseWeapon = baseWeapon;
    }

    // Weapon slots (equipment.mainHand, etc.) are for MIX & MATCH progressive weapons.
    // Clean up any legacy starter weapon or base weapon duplicate from mainHand.
    if (this.equipment.mainHand) {
      const m = this.equipment.mainHand;
      if (m.id === 'starter_blade' || m.id?.startsWith('starter_') || m.id === this.baseWeapon.id || m.name === this.baseWeapon.name) {
        delete this.equipment.mainHand;
      }
    }

    this.recalculateDerivedStats();
    this.health = this.maxHealth;
    this.shield = this.maxShield;
  }

  // Switch archetype blueprint cleanly with matching signature base weapon & base stats
  public setArchetype(newArchetype: 'soturi' | 'runoseppä' | 'tietäjä' | 'korvenraivaaja'): void {
    this.appearance.archetype = newArchetype;
    const defaultStats = getDefaultStatsForArchetype(newArchetype);
    this.stats = {
      sisu: defaultStats.sisu,
      nokkela: defaultStats.nokkela,
      vaki: defaultStats.vaki,
      tieto: defaultStats.tieto,
      statPoints: this.stats.statPoints || 0
    };
    this.baseWeapon = getStarterWeaponForArchetype(newArchetype);
    if (this.equipment.mainHand) {
      const m = this.equipment.mainHand;
      if (m.id === 'starter_blade' || m.id?.startsWith('starter_') || m.name === this.baseWeapon.name || m.id === this.baseWeapon.id) {
        delete this.equipment.mainHand;
      }
    }
    this.recalculateDerivedStats();
    this.health = this.maxHealth;
    this.shield = this.maxShield;
  }

  // Arsenal Slot Unlock and Multi-Weapon Progression Queries
  public isWeaponSlotUnlocked(slot: ItemSlot, sectorClearsCount: number = 0): boolean {
    const conf = WEAPON_SLOT_UNLOCK_CONFIGS.find(u => u.slot === slot);
    if (!conf) return true; // Non-weapon gear slots are always unlocked
    return this.level >= conf.reqLevel || sectorClearsCount >= conf.reqClears;
  }

  public getMaxWeaponSlots(sectorClearsCount: number = 0): number {
    return WEAPON_SLOT_UNLOCK_CONFIGS.filter(u => this.level >= u.reqLevel || sectorClearsCount >= u.reqClears).length;
  }

  public getAllEquippedWeapons(): Item[] {
    const list: Item[] = [];
    for (const slot of CUMULATIVE_WEAPON_SLOTS) {
      const item = this.equipment[slot];
      if (item && item.type === 'weapon') {
        list.push(item);
      }
    }
    return list;
  }

  public getActiveWeapons(): Item[] {
    const list: Item[] = [];
    if (this.baseWeapon) {
      list.push(this.baseWeapon);
    }
    list.push(...this.getAllEquippedWeapons());
    return list;
  }

  // Recalculate max health, shields, armor, speed based on stats & gear
  recalculateDerivedStats() {
    // Sisu increases HP by 7 and Armor by 0.7
    let hp = 60 + this.stats.sisu * 7 + this.level * 8;
    let armor = Math.floor(this.stats.sisu * 0.7);
    // Väki increases Energy and Shield
    let shield = 15 + this.stats.vaki * 4.5;
    let energy = 60 + this.stats.vaki * 4;

    // Archetype Base Speeds, Durability & Passives
    let baseSpeed = 4.2;
    if (this.appearance.archetype === 'soturi') {
      baseSpeed = 3.6; // Heavy Juggernaut Tank (Slower, heavier poise)
      armor += 15;      // Heavy Natural Titanium Plating
      hp = Math.round(hp * 1.35); // +35% Health Pool
    } else if (this.appearance.archetype === 'korvenraivaaja') {
      baseSpeed = 4.8; // Agile Scrap Stalker (Very fast & responsive)
      hp = Math.round(hp * 0.85); // High risk / agile glass skirmisher
    } else if (this.appearance.archetype === 'runoseppä') {
      baseSpeed = 4.0;
      shield = Math.round(shield * 1.30); // +30% Nanite Shield capacity
    } else if (this.appearance.archetype === 'tietäjä') {
      baseSpeed = 4.1;
      energy = Math.round(energy * 1.25);
    }
    this.baseSpeed = baseSpeed;
    let spd = this.baseSpeed + this.stats.nokkela * 0.06;

    // Apply base weapon bonuses
    if (this.baseWeapon) {
      if (this.baseWeapon.armor) armor += this.baseWeapon.armor;
      if (this.baseWeapon.healthMax) hp += this.baseWeapon.healthMax;
      if (this.baseWeapon.shieldMax) shield += this.baseWeapon.shieldMax;
      if (this.baseWeapon.energyMax) energy += this.baseWeapon.energyMax;
      if (this.baseWeapon.moveSpeed) spd += this.baseWeapon.moveSpeed * 0.05;
    }

    // Apply equipment bonuses
    Object.values(this.equipment).forEach(item => {
      if (!item) return;
      if (item.armor) armor += item.armor;
      if (item.healthMax) hp += item.healthMax;
      if (item.shieldMax) shield += item.shieldMax;
      if (item.energyMax) energy += item.energyMax;
      if (item.moveSpeed) spd += item.moveSpeed * 0.05;
    });

    this.maxHealth = hp;
    this.maxShield = shield;
    this.maxEnergy = energy;
    this.armor = armor;
    this.speed = spd;

    // Tieto reduces ability cooldowns (up to 45%)
    const baseCdr = this.appearance.archetype === 'runoseppä' ? 0.15 : 0;
    const cdr = Math.min(0.45, baseCdr + this.stats.tieto * 0.018);
    this.maxCooldowns.ability1 = 5.0 * (1 - cdr);
    this.maxCooldowns.ability2 = 4.0 * (1 - cdr);
    this.maxCooldowns.ability3 = 8.0 * (1 - cdr);
    this.maxCooldowns.ability4 = 18.0 * (1 - cdr);
  }

  // Fully reset combat, death, movement, and ability states
  public resetCombatAndDeathState() {
    this.isDead = false;
    this.isDying = false;
    this.deathTimer = 0;
    this.lastFatalDamage = null;
    this.recalculateDerivedStats();
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.energy = this.maxEnergy;
    this.isMoving = false;
    this.isInvulnerable = false;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.vx = 0;
    this.vy = 0;
    this.attackCooldown = 0;
    this.meleeSwingTimer = 0;
    this.hammerSlamTimer = 0;
    this.deathRayActive = false;
    this.deathRayTimer = 0;
    this.deathRayTarget = null;
    this.hurtFlashTimer = 0;
    this.postHitGraceTimer = 0;
    this.isChargingSpecial = false;
    this.specialChargeTime = 0;
    this.specialCooldown = 0;
    this.overclockTimer = 0;
    this.cooldowns.ability1 = 0;
    this.cooldowns.ability2 = 0;
    this.cooldowns.ability3 = 0;
    this.cooldowns.ability4 = 0;
    this.cooldowns.potion = 0;
  }

  // Gain XP & Level Up logic (tuned down SP progression)
  gainXP(amount: number): boolean {
    this.xp += amount;
    const needed = this.getXPToNextLevel();
    if (this.xp >= needed) {
      this.xp -= needed;
      this.level++;
      this.stats.statPoints = Math.min(MAX_UNSPENT_STAT_POINTS, (this.stats.statPoints || 0) + 1);
      this.recalculateDerivedStats();
      this.health = this.maxHealth;
      this.shield = this.maxShield;

      soundEngine.playLevelUp();
      particleSystem.emitBeacon(this.x, this.y, '#f59e0b');
      combatEngine.addFloatingText(this.x, this.y, `LEVEL UP! (${this.level})`, 'crit');
      return true;
    }
    return false;
  }

  getXPToNextLevel(): number {
    return 180 + this.level * 140;
  }

  setMovement(dx: number, dy: number) {
    if (!this.isDodging) {
      this.vx = dx * this.speed;
      this.vy = dy * this.speed;
    }
  }

  updateTimers(dt: number) {
    // Timers
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.specialCooldown > 0) this.specialCooldown -= dt;
    if (this.meleeSwingTimer > 0) this.meleeSwingTimer -= dt;
    if (this.hammerSlamTimer > 0) this.hammerSlamTimer -= dt;
    if (this.deathRayTimer > 0) {
      this.deathRayTimer -= dt;
      if (this.deathRayTimer <= 0) {
        this.deathRayActive = false;
        this.deathRayTarget = null;
      }
    }
    if (this.hurtFlashTimer > 0) this.hurtFlashTimer -= dt;
    if (this.postHitGraceTimer > 0) this.postHitGraceTimer -= dt;
    if (this.shieldRegenDelayTimer > 0) this.shieldRegenDelayTimer -= dt;

    // Special Attack Charging
    if (this.isChargingSpecial) {
      this.specialChargeTime = Math.min(this.maxSpecialChargeTime, this.specialChargeTime + dt);
      const sparkColor = this.appearance.archetype === 'soturi' ? '#facc15' : (this.appearance.archetype === 'tietäjä' ? '#38bdf8' : '#10b981');
      particleSystem.emitSparks(this.x, this.y, 0.25, sparkColor, 1);
    }

    if (this.cooldowns.ability1 > 0) this.cooldowns.ability1 -= dt;
    if (this.cooldowns.ability2 > 0) this.cooldowns.ability2 -= dt;
    if (this.cooldowns.ability3 > 0) this.cooldowns.ability3 -= dt;
    if (this.cooldowns.ability4 > 0) this.cooldowns.ability4 -= dt;
    if (this.cooldowns.potion > 0) this.cooldowns.potion -= dt;

    // Aegis Energy Shield Barrier Timer & Cooldown Update (5.0s active barrier -> 6.0s recharge)
    if (this.energyShieldActive) {
      this.energyShieldTimer -= dt;
      if (this.energyShieldTimer <= 0) {
        this.energyShieldActive = false;
        this.energyShieldTimer = 0;
        this.energyShieldCooldown = this.energyShieldMaxCooldown; // Start 6s recharge
        soundEngine.playHitImpact(true);
      }
    } else if (this.energyShieldCooldown > 0) {
      this.energyShieldCooldown -= dt;
      if (this.energyShieldCooldown <= 0) {
        this.energyShieldCooldown = 0;
        soundEngine.playLevelUp();
      }
    }

    // Overclock buff decay
    if (this.overclockTimer > 0) {
      this.overclockTimer -= dt;
      particleSystem.emitSparks(this.x, this.y, 0.4, '#f59e0b', 1);
    }

    // Shield passive recharge (only after 3.5s of no incoming damage)
    if (this.shield < this.maxShield && this.shieldRegenDelayTimer <= 0) {
      this.shield = Math.min(this.maxShield, this.shield + 6.0 * dt);
    }
  }

  update(dt: number, isWall?: (x: number, y: number) => boolean) {
    this.updateTimers(dt);

    if (!isWall) return;

    // Idle & Walk timers
    this.idleTimer += dt;
    if (this.isMoving && !this.isDodging) {
      this.walkTimer += dt * 10.0;
      this.stepCooldown -= dt;
      if (this.stepCooldown <= 0) {
        this.stepCooldown = 0.22;
        particleSystem.emitSparks(this.x, this.y, 0.05, '#94a3b8', 1);
      }
    } else {
      this.walkTimer = 0;
    }

    // Dodge State Update with 360 spin
    if (this.isDodging) {
      this.dodgeTimer -= dt;
      const progress = 1 - (this.dodgeTimer / this.dodgeDuration);
      this.dodgeSpinAngle = progress * Math.PI * 2;
      particleSystem.emitDodgeTrail(this.x, this.y, 0.25, '#38bdf8');
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.isInvulnerable = false;
        this.dodgeSpinAngle = 0;
      }
    } else {
      this.isInvulnerable = false;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }

    // Movement physics & collision with sub-stepped smooth wall sliding & corner deflection
    const totalMoveX = this.vx * dt;
    const totalMoveY = this.vy * dt;
    const pad = this.radius * 0.42; // Agile circular probe radius

    // Sub-step movement if velocity is high (dodge / speed boost) to prevent tunneling into corners
    const maxStep = 0.08;
    const speedDist = Math.hypot(totalMoveX, totalMoveY);
    const steps = Math.max(1, Math.min(6, Math.ceil(speedDist / maxStep)));
    const stepX = totalMoveX / steps;
    const stepY = totalMoveY / steps;

    for (let s = 0; s < steps; s++) {
      // 1. Move X with corner-sliding probe
      if (stepX !== 0) {
        const nextX = this.x + stepX;
        const signX = Math.sign(stepX);
        const checkX = nextX + signX * pad;
        // Test 3 vertical sensor points on the leading X edge
        const clearTop = !isWall(checkX, this.y - pad * 0.85);
        const clearMid = !isWall(checkX, this.y);
        const clearBot = !isWall(checkX, this.y + pad * 0.85);

        if (clearTop && clearMid && clearBot) {
          this.x = nextX;
        } else if (clearTop && !clearBot) {
          // Slide upwards away from bottom obstacle corner
          this.x += stepX * 0.6;
          this.y -= Math.abs(stepX) * 0.45;
        } else if (clearBot && !clearTop) {
          // Slide downwards away from top obstacle corner
          this.x += stepX * 0.6;
          this.y += Math.abs(stepX) * 0.45;
        }
      }

      // 2. Move Y with corner-sliding probe
      if (stepY !== 0) {
        const nextY = this.y + stepY;
        const signY = Math.sign(stepY);
        const checkY = nextY + signY * pad;
        // Test 3 horizontal sensor points on the leading Y edge
        const clearLeft = !isWall(this.x - pad * 0.85, checkY);
        const clearMid = !isWall(this.x, checkY);
        const clearRight = !isWall(this.x + pad * 0.85, checkY);

        if (clearLeft && clearMid && clearRight) {
          this.y = nextY;
        } else if (clearLeft && !clearRight) {
          // Slide leftwards away from right obstacle corner
          this.y += stepY * 0.6;
          this.x -= Math.abs(stepY) * 0.45;
        } else if (clearRight && !clearLeft) {
          // Slide rightwards away from left obstacle corner
          this.y += stepY * 0.6;
          this.x += Math.abs(stepY) * 0.45;
        }
      }
    }

    // 3. Proactive Anti-Stuck / Corner Depenetration: Push player out of intersecting walls/corners
    const probeR = this.radius * 0.40;
    const probeAngles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
    let pushX = 0;
    let pushY = 0;
    let pushCount = 0;

    for (const ang of probeAngles) {
      const px = this.x + Math.cos(ang) * probeR;
      const py = this.y + Math.sin(ang) * probeR;
      if (isWall(px, py)) {
        // Push in the opposite direction of the wall collision point
        pushX -= Math.cos(ang);
        pushY -= Math.sin(ang);
        pushCount++;
      }
    }

    if (pushCount > 0) {
      const pushLen = Math.hypot(pushX, pushY);
      if (pushLen > 0.001) {
        const nudge = Math.min(0.06, pushCount * 0.02);
        const targetX = this.x + (pushX / pushLen) * nudge;
        const targetY = this.y + (pushY / pushLen) * nudge;
        if (!isWall(targetX, targetY)) {
          this.x = targetX;
          this.y = targetY;
        }
      }
    }

    // 4. Ultimate Emergency Escape: If player's center is inside a wall tile
    if (isWall(this.x, this.y)) {
      const spiralOffsets: [number, number][] = [
        [0, -0.3], [0, 0.3], [-0.3, 0], [0.3, 0],
        [-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4],
        [0, -0.7], [0, 0.7], [-0.7, 0], [0.7, 0],
        [-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8],
        [0, -1.2], [0, 1.2], [-1.2, 0], [1.2, 0],
        [0, -2.0], [0, 2.0], [-2.0, 0], [2.0, 0]
      ];
      for (const [ox, oy] of spiralOffsets) {
        if (!isWall(this.x + ox, this.y + oy)) {
          this.x += ox;
          this.y += oy;
          break;
        }
      }
    }

    this.isMoving = Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1;
  }

  // Trigger Active Dodge Roll
  dodge(dx: number, dy: number): boolean {
    if (this.isDodging || this.dodgeCooldown > 0) return false;

    let dirX = dx;
    let dirY = dy;
    if (dirX === 0 && dirY === 0) {
      dirX = Math.cos(this.angle);
      dirY = Math.sin(this.angle);
    }

    const isStalker = this.appearance.archetype === 'korvenraivaaja';
    const dodgeSpeed = this.speed * (isStalker ? 3.2 : 2.8);
    this.vx = dirX * dodgeSpeed;
    this.vy = dirY * dodgeSpeed;
    this.isDodging = true;
    this.isInvulnerable = true;
    this.dodgeDuration = isStalker ? 0.28 : 0.32;
    this.dodgeTimer = this.dodgeDuration;
    this.dodgeCooldown = isStalker ? 0.40 : 0.75; // Korvenraivaaja has rapid dodge!
    this.dodgeSpinAngle = 0;

    soundEngine.playDodge();
    return true;
  }

  // Fire a single weapon in the player's arsenal (spawns projectiles, triggers visual states)
  private fireSingleWeapon(
    weapon: Item,
    targetX: number,
    targetY: number,
    speedMult: number,
    isBaseWeapon: boolean = false
  ): AttackResult {
    const arch = this.appearance.archetype;
    const weaponCat: WeaponCategory = getWeaponCategory(weapon);
    const damageType: DamageType = weapon.damageType || (arch === 'soturi' ? 'fire' : 'plasma');
    const weaponBaseDmg = weapon.damage || (22 + this.level * 3.5);
    const baseAngle = Math.atan2(targetY - this.y, targetX - this.x);

    // Dynamic Weapon Upgrade Metrics (Bullets, Spread, Range, Shield Shred & AoE)
    const upgradeLvl = weapon.upgradeLevel || 0;
    const bonusBullets = weapon.bonusProjectiles || Math.floor(upgradeLvl / 2);
    const spreadBonus = weapon.spreadAngleBonus || (upgradeLvl * 0.07);
    const rangeMult = weapon.rangeMultiplier || (1.0 + upgradeLvl * 0.12);
    const shieldDmgBonus = weapon.shieldDamageBonus || (upgradeLvl * 0.35);
    const areaRadius = weapon.areaRadiusBonus || (upgradeLvl > 0 ? 0.8 + upgradeLvl * 0.35 : 0);

    const elemColors: Record<DamageType, string> = {
      shock: '#facc15',
      fire: '#f97316',
      frost: '#38bdf8',
      void: '#c084fc',
      plasma: '#38bdf8',
      physical: '#94a3b8'
    };
    const mainColor = elemColors[damageType] || '#38bdf8';

    // 1. HEAVY HAMMERS & SLAG SLEDGES: Full 360° Seismic Ground Quake
    if (weaponCat === 'heavy_hammer') {
      this.hammerSlamDuration = 0.28 / speedMult;
      this.hammerSlamTimer = this.hammerSlamDuration;
      soundEngine.playMeleeSwing();
      soundEngine.playHitImpact(true);

      const slamDmg = Math.floor(weaponBaseDmg * 1.5 + this.stats.sisu * 1.8 + this.level * 4);
      const totalRadius = 3.6 + areaRadius;
      particleSystem.emitShockwave(this.x, this.y, 2.4, mainColor);
      particleSystem.emitSparks(this.x, this.y, 0.45, mainColor, 6);

      // Concentric aftershocks for upgraded sledge
      if (upgradeLvl >= 2) {
        setTimeout(() => {
          particleSystem.emitShockwave(this.x, this.y, totalRadius, mainColor);
        }, 120);
      }
      if (upgradeLvl >= 5) {
        setTimeout(() => {
          particleSystem.emitShockwave(this.x, this.y, totalRadius * 1.25, '#facc15');
        }, 220);
      }

      return {
        performed: true,
        style: 'heavy_hammer_slam',
        damage: slamDmg,
        radius: totalRadius,
        damageType,
        isCloseQuarters: true,
        shieldDamageBonus: shieldDmgBonus,
        areaRadius: totalRadius,
        sourceWeaponName: weapon.name
      };
    }

    // 2. VIBRO-BLADES & HIISI DAGGERS: Rapid Directional Flurry Slices
    if (weaponCat === 'vibro_blade') {
      this.meleeSwingDuration = 0.13 / speedMult;
      this.meleeSwingTimer = this.meleeSwingDuration;
      soundEngine.playMeleeSwing();

      const bladeDmg = Math.floor(weaponBaseDmg * 0.85 + this.stats.nokkela * 1.3 + this.level * 2);
      const waveCount = 1 + bonusBullets;
      const spreadStep = waveCount > 1 ? (0.24 + spreadBonus) / (waveCount - 1) : 0;
      const startAngle = baseAngle - ((waveCount - 1) * spreadStep) / 2;

      for (let i = 0; i < waveCount; i++) {
        const ang = startAngle + i * spreadStep;
        const tx = this.x + Math.cos(ang) * (8 * rangeMult);
        const ty = this.y + Math.sin(ang) * (8 * rangeMult);

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          bladeDmg,
          damageType,
          true,
          18.0 * rangeMult,
          mainColor,
          'aegis_shield_wave',
          false,
          2 + Math.floor(upgradeLvl / 3),
          'Vibro-Blade Slash',
          true,
          shieldDmgBonus,
          areaRadius,
          rangeMult
        );
      }

      particleSystem.emitSparks(this.x, this.y, 0.25, mainColor, 2);

      return {
        performed: true,
        style: 'vibro_blade_slash',
        damage: bladeDmg,
        damageType,
        isCloseQuarters: true,
        shieldDamageBonus: shieldDmgBonus,
        areaRadius,
        sourceWeaponName: weapon.name
      };
    }

    // 3. PLASMA SWORDS, KATANAS & HALBERDS: Sweeping Kinetic Arc Cleave
    if (weaponCat === 'plasma_sword') {
      this.meleeSwingDuration = 0.22 / speedMult;
      this.meleeSwingTimer = this.meleeSwingDuration;
      soundEngine.playLightningCleave();

      const swordDmg = Math.floor(weaponBaseDmg * 1.15 + this.stats.sisu * 1.2 + this.stats.nokkela * 0.8 + this.level * 3.5);
      const waveCount = 1 + bonusBullets;
      const spreadStep = waveCount > 1 ? (0.35 + spreadBonus) / (waveCount - 1) : 0;
      const startAngle = baseAngle - ((waveCount - 1) * spreadStep) / 2;

      for (let i = 0; i < waveCount; i++) {
        const ang = startAngle + i * spreadStep;
        const tx = this.x + Math.cos(ang) * (14 * rangeMult);
        const ty = this.y + Math.sin(ang) * (14 * rangeMult);

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          swordDmg,
          damageType,
          true,
          14.0 * rangeMult,
          mainColor,
          'aegis_shield_wave',
          false,
          99,
          'Plasma Sword Wave',
          true,
          shieldDmgBonus,
          areaRadius,
          rangeMult
        );
      }

      particleSystem.emitShockwave(this.x, this.y, 1.8 + areaRadius * 0.4, mainColor);
      particleSystem.emitSparks(this.x, this.y, 0.35, mainColor, 3);

      return {
        performed: true,
        style: 'plasma_sword_cleave',
        damage: swordDmg,
        damageType,
        isCloseQuarters: true,
        shieldDamageBonus: shieldDmgBonus,
        areaRadius,
        sourceWeaponName: weapon.name
      };
    }

    // 4. RAIL-RIFLES: Precision Hyper-Velocity Linear Slugs (Piercing Sniper)
    if (weaponCat === 'rail_rifle') {
      soundEngine.playRailgunShot();

      const railDmg = Math.floor(weaponBaseDmg * 1.25 + this.stats.nokkela * 1.4 + this.level * 4);
      const bulletCount = 1 + bonusBullets;
      const spreadStep = bulletCount > 1 ? (0.16 + spreadBonus) / (bulletCount - 1) : 0;
      const startAngle = baseAngle - ((bulletCount - 1) * spreadStep) / 2;

      for (let i = 0; i < bulletCount; i++) {
        const ang = startAngle + i * spreadStep;
        const tx = this.x + Math.cos(ang) * (18 * rangeMult);
        const ty = this.y + Math.sin(ang) * (18 * rangeMult);

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          railDmg,
          damageType,
          true,
          22.0 * rangeMult,
          mainColor,
          'rail_slug',
          false,
          3 + Math.floor(upgradeLvl / 2),
          'Rail-Rifle Slug',
          false,
          shieldDmgBonus,
          areaRadius,
          rangeMult
        );
      }

      particleSystem.emitSparks(this.x, this.y, 0.3, mainColor, 3);

      return {
        performed: true,
        style: 'rail_rifle_shot',
        damage: railDmg,
        damageType,
        shieldDamageBonus: shieldDmgBonus,
        areaRadius,
        sourceWeaponName: weapon.name
      };
    }

    // 5. SCATTER-CANNONS & VOID MORTARS: Wide Multi-Pellet Shotgun Blast
    if (weaponCat === 'scatter_shot') {
      soundEngine.playTripleShot();

      const pelletDmg = Math.floor(weaponBaseDmg * 0.42 + this.stats.nokkela * 0.5 + this.level * 1.2);
      const totalPellets = 5 + bonusBullets * 2;
      const totalSpreadArc = 0.56 + spreadBonus * 1.5;
      const halfArc = totalSpreadArc / 2;

      for (let i = 0; i < totalPellets; i++) {
        const t = totalPellets > 1 ? i / (totalPellets - 1) : 0.5;
        const offset = -halfArc + t * totalSpreadArc + (Math.random() - 0.5) * 0.05;
        const ang = baseAngle + offset;
        const tx = this.x + Math.cos(ang) * (12 * rangeMult);
        const ty = this.y + Math.sin(ang) * (12 * rangeMult);

        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          pelletDmg,
          damageType,
          true,
          (15.0 + Math.random() * 2.5) * rangeMult,
          mainColor,
          'scatter_pellet',
          false,
          1 + Math.floor(upgradeLvl / 4),
          'Scatter Pellet',
          true,
          shieldDmgBonus,
          Math.max(0.3, areaRadius * 0.4),
          rangeMult
        );
      }

      particleSystem.emitShockwave(this.x, this.y, 1.2 + areaRadius * 0.3, mainColor);
      particleSystem.emitSparks(this.x, this.y, 0.3, mainColor, 4);

      return {
        performed: true,
        style: 'scatter_shot_blast',
        damage: pelletDmg,
        damageType,
        isCloseQuarters: true,
        shieldDamageBonus: shieldDmgBonus,
        areaRadius,
        sourceWeaponName: weapon.name
      };
    }

    // 6. RUNIC STAVES, VOID SPIRES & LYRIC HARPS:
    // Void Spire or Void Element: Continuous Tuoni Death-Ray Beam & Life Siphon
    const isVoidDeathRay = damageType === 'void' || weapon.name.toLowerCase().includes('void') || weapon.name.toLowerCase().includes('death');
    if (isVoidDeathRay) {
      this.deathRayDuration = 0.24 / speedMult;
      this.deathRayTimer = this.deathRayDuration;
      this.deathRayActive = true;
      this.deathRayTarget = { x: targetX, y: targetY };
      soundEngine.playDeathRayBeam();

      return {
        performed: true,
        style: 'death_ray',
        damage: Math.floor(weaponBaseDmg * 1.1 + this.stats.vaki * 1.5 + this.level * 3.5),
        siphonPercent: 0.25 + shieldDmgBonus * 0.1,
        targetX,
        targetY,
        damageType: 'void',
        shieldDamageBonus: shieldDmgBonus,
        areaRadius,
        sourceWeaponName: weapon.name
      };
    }

    // Default Runic Harp (Runoseppä Virsikannel / Staves): Singing Lyric Rune Shards
    soundEngine.playRunicLyricChime();

    const runeDmg = Math.floor(weaponBaseDmg * 1.05 + this.stats.vaki * 1.5 + this.level * 3);
    const runeCount = 1 + bonusBullets;
    const spreadStep = runeCount > 1 ? (0.28 + spreadBonus) / (runeCount - 1) : 0;
    const startAngle = baseAngle - ((runeCount - 1) * spreadStep) / 2;

    for (let i = 0; i < runeCount; i++) {
      const ang = startAngle + i * spreadStep;
      const tx = this.x + Math.cos(ang) * (14 * rangeMult);
      const ty = this.y + Math.sin(ang) * (14 * rangeMult);

      projectileManager.spawn(
        this.x,
        this.y,
        tx,
        ty,
        runeDmg,
        damageType,
        true,
        14.5 * rangeMult,
        mainColor,
        'golden_rune_shard',
        false,
        2 + Math.floor(upgradeLvl / 3),
        'Lyric Rune Shard',
        false,
        shieldDmgBonus,
        areaRadius,
        rangeMult
      );
    }

    particleSystem.emitRunicGlyph(this.x, this.y, mainColor);

    return {
      performed: true,
      style: 'lyric_rune_chime',
      damage: runeDmg,
      damageType,
      shieldDamageBonus: shieldDmgBonus,
      areaRadius,
      sourceWeaponName: weapon.name
    };
  }

  // Primary Cumulative Arsenal Attack: Fires Base Weapon + All Active Weapon Slots Simultaneously!
  attack(targetX: number, targetY: number): AttackResult[] | null {
    if (this.attackCooldown > 0 || this.isDodging || this.isDead) return null;

    const speedMult = this.overclockTimer > 0 ? 1.8 : 1.0;
    const activeWeapons = this.getActiveWeapons();
    if (activeWeapons.length === 0) {
      if (!this.baseWeapon) {
        this.baseWeapon = getStarterWeaponForArchetype(this.appearance.archetype);
      }
      activeWeapons.push(this.baseWeapon);
    }

    const results: AttackResult[] = [];
    let totalCooldown = 0;

    for (let i = 0; i < activeWeapons.length; i++) {
      const wpn = activeWeapons[i];
      const cat = getWeaponCategory(wpn);
      const wpnCd = cat === 'heavy_hammer' ? 0.48 :
                    cat === 'scatter_shot' ? 0.42 :
                    cat === 'rail_rifle' ? 0.34 :
                    cat === 'plasma_sword' ? 0.28 :
                    cat === 'vibro_blade' ? 0.18 : 0.26;
      totalCooldown += wpnCd;

      const res = this.fireSingleWeapon(wpn, targetX, targetY, speedMult, i === 0);
      if (res && res.performed) {
        results.push(res);
      }
    }

    // Cooldown is balanced as the average cadence across active weapons
    const avgCd = totalCooldown / activeWeapons.length;
    this.attackCooldown = Math.max(0.20, Math.min(0.50, avgCd)) / speedMult;

    return results.length > 0 ? results : null;
  }

  // Begin Charging Archetype Special Attack (Hold Mouse LMB/RMB)
  startChargingSpecial(): boolean {
    if (this.specialCooldown > 0 || this.isDodging || this.isDead || this.isChargingSpecial) return false;
    this.isChargingSpecial = true;
    this.specialChargeTime = 0;
    soundEngine.playSpecialCharge();
    return true;
  }

  // Release Special Attack on Key/Mouse Up
  releaseSpecial(targetX: number, targetY: number): boolean {
    if (!this.isChargingSpecial) return false;
    const wasCharged = this.specialChargeTime >= (this.maxSpecialChargeTime * 0.7);
    this.isChargingSpecial = false;
    this.specialChargeTime = 0;

    if (wasCharged && this.specialCooldown <= 0) {
      return this.triggerSpecialAttack(targetX, targetY);
    }
    return false;
  }

  // Immediate Archetype Special Attack Execution (Space / RMB / Full Charge)
  triggerSpecialAttack(targetX: number, targetY: number): boolean {
    if (this.specialCooldown > 0 || this.isDodging || this.isDead) return false;

    this.specialCooldown = this.maxSpecialCooldown;
    this.isChargingSpecial = false;
    this.specialChargeTime = 0;
    this.attackCooldown = 0.35;

    const baseWeaponDmg = this.baseWeapon?.damage || 22;
    const extraArsenalDmg = this.getAllEquippedWeapons().reduce((sum, w) => sum + (w.damage || 0) * 0.4, 0);
    const baseDmg = baseWeaponDmg + extraArsenalDmg + this.level * 4;
    const archetype = this.appearance.archetype;

    soundEngine.playSpecialRelease();

    if (archetype === 'soturi') {
      // 1. SOTURI: UKKO'S THUNDER NOVA (8-Way Radial Lightning Discharge)
      const boltCount = 8;
      const dmg = Math.round(baseDmg * 2.2 + this.stats.sisu * 2.0);
      for (let i = 0; i < boltCount; i++) {
        const ang = (Math.PI * 2 / boltCount) * i;
        const tx = this.x + Math.cos(ang) * 12;
        const ty = this.y + Math.sin(ang) * 12;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          dmg,
          'shock',
          true,
          11.0,
          '#facc15',
          'lightning_arc',
          false,
          2
        );
      }
      particleSystem.emitShockwave(this.x, this.y, 4.8, '#facc15');
      for (let i = 0; i < 14; i++) {
        particleSystem.emitSparks(this.x, this.y, 0.45, '#facc15', 3);
      }

    } else if (archetype === 'tietäjä') {
      // 2. TIETÄJÄ: VÄKI HYPER-NOVA (Giant Piercing Mega Plasmasphere)
      const dmg = Math.round(baseDmg * 3.0 + this.stats.vaki * 2.5);
      projectileManager.spawn(
        this.x,
        this.y,
        targetX,
        targetY,
        dmg,
        'plasma',
        true,
        8.5,
        '#38bdf8',
        'mega_plasma_orb',
        false,
        99 // Penetrates all targets
      );
      particleSystem.emitShockwave(this.x, this.y, 3.8, '#38bdf8');
      for (let i = 0; i < 10; i++) {
        particleSystem.emitRunicGlyph(this.x, this.y, '#38bdf8');
      }

    } else if (archetype === 'runoseppä') {
      // 3. RUNOSEPPÄ: SYNTYSANAT: KIRJOKANNEN ALASIN (Celestial Sampo Anvil & Lyrical Aegis)
      const dmg = Math.round(baseDmg * 2.8 + this.stats.nokkela * 2.5 + this.stats.vaki * 1.5);
      soundEngine.playSyntysanatAnvil();

      // 8-Way harmonic verse runes radiating outwards from cursor position
      const runeCount = 8;
      for (let i = 0; i < runeCount; i++) {
        const ang = (Math.PI * 2 / runeCount) * i;
        const tx = targetX + Math.cos(ang) * 10;
        const ty = targetY + Math.sin(ang) * 10;
        projectileManager.spawn(
          targetX,
          targetY,
          tx,
          ty,
          dmg,
          'fire',
          true,
          9.5,
          '#f59e0b',
          'golden_rune_shard',
          false,
          3 // Piercing harmonic wave
        );
      }

      // Grant temporary Nanite Lyrical Aegis (+60 Shield)
      const shieldBonus = 60 + this.level * 10;
      this.shield = Math.min(this.maxShield * 1.5, this.shield + shieldBonus);
      this.shieldRegenDelayTimer = 0;

      // Colossal visual ripples at target anvil location
      particleSystem.emitBeacon(targetX, targetY, '#f59e0b');
      particleSystem.emitShockwave(targetX, targetY, 5.5, '#f59e0b');
      particleSystem.emitShockwave(targetX, targetY, 3.5, '#10b981');
      for (let i = 0; i < 16; i++) {
        particleSystem.emitRunicGlyph(targetX, targetY, i % 2 === 0 ? '#f59e0b' : '#38bdf8');
        particleSystem.emitSparks(targetX, targetY, 0.6, '#facc15', 3);
      }

    } else {
      // 4. KORVENRAIVAAJA: OTAVA SWARM SEEKERS (7-Missile Intelligent Homing Salvo)
      const dmg = Math.round(baseDmg * 1.5 + this.stats.nokkela * 1.8);
      const baseAng = Math.atan2(targetY - this.y, targetX - this.x);
      const spreads = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];

      spreads.forEach((offset, idx) => {
        const ang = baseAng + offset;
        const tx = this.x + Math.cos(ang) * 10;
        const ty = this.y + Math.sin(ang) * 10;
        projectileManager.spawn(
          this.x,
          this.y,
          tx,
          ty,
          dmg,
          'plasma',
          true,
          11.5 + (idx % 2) * 1.5, // Slight speed variance for natural swarm flight
          '#38bdf8',
          'homing_missile',
          true, // Homing enabled
          1
        );
      });

      particleSystem.emitShockwave(this.x, this.y, 3.5, '#38bdf8');
      for (let i = 0; i < 14; i++) {
        particleSystem.emitSparks(this.x, this.y, 0.4, '#f97316', 2);
      }
    }

    return true;
  }

  // Ability 1: Ukonvasara (Lightning Shockwave)
  castAbility1(): boolean {
    if (this.cooldowns.ability1 > 0) return false;
    this.cooldowns.ability1 = this.maxCooldowns.ability1;

    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 4.5, '#38bdf8');
    for (let i = 0; i < 12; i++) {
      particleSystem.emitSparks(this.x, this.y, 0.5, '#38bdf8', 2);
    }
    return true;
  }

  // Ability 2: Kipinä Dash (Fire Jet Dash)
  castAbility2(dx: number, dy: number): boolean {
    if (this.cooldowns.ability2 > 0) return false;
    this.cooldowns.ability2 = this.maxCooldowns.ability2;

    this.dodge(dx, dy);
    soundEngine.playDodge();
    for (let i = 0; i < 8; i++) {
      particleSystem.emitSparks(this.x, this.y, 0.3, '#f59e0b', 3);
    }
    return true;
  }

  // Ability 3: Tuoni Siphon / Shield Barrier
  castAbility3(): boolean {
    if (this.cooldowns.ability3 > 0) return false;
    this.cooldowns.ability3 = this.maxCooldowns.ability3;

    this.shield = this.maxShield; // Instantly replenish shields
    soundEngine.playRunicCast();
    particleSystem.emitShockwave(this.x, this.y, 3.0, '#a855f7');
    return true;
  }

  // Ability 4: Sampo Overclock (Ultimate)
  castAbility4(): boolean {
    if (this.cooldowns.ability4 > 0) return false;
    this.cooldowns.ability4 = this.maxCooldowns.ability4;

    this.overclockTimer = 6.0; // 6 seconds of frenzy
    soundEngine.playLevelUp();
    particleSystem.emitShockwave(this.x, this.y, 5.0, '#f59e0b');
    for (let i = 0; i < 10; i++) {
      particleSystem.emitRunicGlyph(this.x, this.y, '#f59e0b');
    }
    return true;
  }

  // Aegis Energy Shield Barrier (Right-Click: 5s Invulnerable Barrier Against Enemy Fire)
  activateEnergyShield(): boolean {
    if (this.energyShieldCooldown > 0 || this.energyShieldActive || this.isDead || this.isDying) {
      return false;
    }

    this.energyShieldActive = true;
    this.energyShieldTimer = this.energyShieldDuration; // 5.0 seconds
    soundEngine.playSpecialCharge();
    soundEngine.playRunicCast();
    particleSystem.emitBeacon(this.x, this.y, '#38bdf8');
    return true;
  }

  // Potion / Quick Repair Injector
  usePotion(): boolean {
    if (this.cooldowns.potion > 0) return false;
    const potionIndex = this.inventory.findIndex(i => i.type === 'consumable' && (i.quantity ?? 1) > 0);
    if (potionIndex === -1) return false;

    const pot = this.inventory[potionIndex];
    const heal = pot.healAmount || 50;
    this.health = Math.min(this.maxHealth, this.health + heal);
    this.cooldowns.potion = this.maxCooldowns.potion;

    pot.quantity = (pot.quantity ?? 1) - 1;
    if (pot.quantity <= 0) {
      this.inventory.splice(potionIndex, 1);
    }

    soundEngine.playRunicCast();
    combatEngine.addFloatingText(this.x, this.y, `+${heal} HP`, 'heal');
    particleSystem.emitBeacon(this.x, this.y, '#10b981');
    return true;
  }

  // Take Damage
  takeDamage(amount: number, type: DamageType = 'physical', sourceName: string = 'Hostile Threat'): boolean {
    if (this.isInvulnerable || this.isDead || this.isDying || this.postHitGraceTimer > 0) return false;

    // Soturi (Tank) Innate Passive: Ironclad Colossus (-20% damage taken)
    if (this.appearance.archetype === 'soturi') {
      amount = Math.max(1, Math.round(amount * 0.80));
    }

    this.postHitGraceTimer = 0.20; // 0.20s I-frame grace period prevents instant multi-projectile shotgun wipe
    this.hurtFlashTimer = 0.18;
    // Tietäjä gets faster shield regen recovery (2.0s instead of 3.5s)
    this.shieldRegenDelayTimer = this.appearance.archetype === 'tietäjä' ? 2.0 : 3.5;
    soundEngine.playHitImpact(false);
    particleSystem.emitSplatter(this.x, this.y, '#dc2626', false);

    // Shield absorbs first
    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        combatEngine.addFloatingText(this.x, this.y, `-${amount}`, 'plasma');
        return false;
      } else {
        const leftover = amount - this.shield;
        this.shield = 0;
        this.health = Math.max(0, this.health - leftover);
        combatEngine.addFloatingText(this.x, this.y, `-${amount}`, 'plasma');
      }
    } else {
      this.health = Math.max(0, this.health - amount);
      combatEngine.addFloatingText(this.x, this.y, `-${amount}`, 'crit');
    }

    if (this.health <= 0) {
      this.health = 0;
      this.isDying = true;
      this.lastFatalDamage = {
        killerName: sourceName,
        damageType: type,
        amount
      };
      return true;
    }

    return false;
  }
}
