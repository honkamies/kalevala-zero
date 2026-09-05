// Combat Calculations, Damage Types, Status Effects & Floating Text

import { DamageType } from './items';

export interface CombatResult {
  rawDamage: number;
  finalDamage: number;
  isCrit: boolean;
  isBlocked: boolean;
  isDodged: boolean;
  damageType: DamageType;
  statusProc?: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  type: 'physical' | 'plasma' | 'frost' | 'shock' | 'void' | 'fire' | 'crit' | 'heal' | 'status';
  life: number;
  maxLife: number;
}

export class CombatEngine {
  public floatingTexts: FloatingText[] = [];
  public static readonly MAX_FLOATING_TEXTS = 50;
  private pool: FloatingText[] = [];
  private nextId = 0;

  clear() {
    for (let i = 0; i < this.floatingTexts.length; i++) {
      if (this.pool.length < CombatEngine.MAX_FLOATING_TEXTS) {
        this.pool.push(this.floatingTexts[i]);
      }
    }
    this.floatingTexts.length = 0;
  }

  update(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 0.6 * dt; // Float up
      if (ft.life <= 0) {
        if (this.pool.length < CombatEngine.MAX_FLOATING_TEXTS) {
          this.pool.push(ft);
        }
        this.floatingTexts[i] = this.floatingTexts[this.floatingTexts.length - 1];
        this.floatingTexts.pop();
      }
    }
  }

  addFloatingText(x: number, y: number, text: string, type: FloatingText['type'] = 'physical') {
    let ft: FloatingText;
    if (this.floatingTexts.length >= CombatEngine.MAX_FLOATING_TEXTS) {
      // Recycle the oldest element
      ft = this.floatingTexts.shift()!;
    } else if (this.pool.length > 0) {
      ft = this.pool.pop()!;
    } else {
      ft = {
        id: '',
        x: 0,
        y: 0,
        text: '',
        type: 'physical',
        life: 0.8,
        maxLife: 0.8
      };
    }

    ft.id = String(++this.nextId);
    ft.x = x;
    ft.y = y - 0.4;
    ft.text = text;
    ft.type = type;
    ft.life = 0.8;
    ft.maxLife = 0.8;
    this.floatingTexts.push(ft);
  }

  calculateDamage(
    attacker: {
      damage: number;
      damageType: DamageType;
      critChance: number;
      vaki: number;
      nokkela: number;
      attackerArchetype?: string;
      isCloseQuarters?: boolean;
      distanceFromAttacker?: number;
    },
    target: {
      armor: number;
      shield: number;
      isInvulnerable?: boolean;
    }
  ): CombatResult {
    if (target.isInvulnerable) {
      return {
        rawDamage: 0,
        finalDamage: 0,
        isCrit: false,
        isBlocked: false,
        isDodged: true,
        damageType: attacker.damageType
      };
    }

    // Archetype specializations:
    let critBonus = 0;
    if (attacker.attackerArchetype === 'korvenraivaaja') {
      critBonus += 12; // Hyper-reflex Stalker +12% crit chance
    }

    // Critical Strike Roll (Base + Nokkela scaling + Archetype bonus)
    const totalCritChance = (attacker.critChance || 5) + (attacker.nokkela * 0.4) + critBonus;
    const isCrit = Math.random() * 100 < totalCritChance;
    const critMultiplier = isCrit ? 1.8 + (attacker.nokkela * 0.02) : 1.0;

    // Väki Elemental Scaling
    let vakiElementalBonus = 1.0 + (attacker.vaki * 0.03);
    if (attacker.attackerArchetype === 'tietäjä' && attacker.damageType !== 'physical') {
      vakiElementalBonus += 0.25; // Void Shaman +25% elemental amp
    }

    let raw = attacker.damage * critMultiplier;
    if (attacker.damageType !== 'physical') {
      raw *= vakiElementalBonus;
    }

    // Soturi (Tank) Close-Quarters Dominance:
    // When hitting up close (within 2.0 units or marked as close quarters / point blank), deal +35% damage!
    const isClose = attacker.isCloseQuarters || (attacker.distanceFromAttacker !== undefined && attacker.distanceFromAttacker <= 2.0);
    if (attacker.attackerArchetype === 'soturi' && isClose) {
      raw *= 1.35;
    }

    // Armor Mitigation: DR = Armor / (Armor + 60)
    const mitigation = target.armor / (target.armor + 60);
    let finalDamage = Math.max(1, Math.round(raw * (1 - mitigation)));

    // Elemental Status Proc Chance
    let statusProc: string | undefined;
    const procRoll = Math.random();
    if (procRoll < 0.25) {
      if (attacker.damageType === 'frost') statusProc = 'CHILLED';
      if (attacker.damageType === 'fire') statusProc = 'BURNED';
      if (attacker.damageType === 'shock') statusProc = 'OVERCHARGED';
      if (attacker.damageType === 'void') statusProc = 'VOID_SIPHON';
    }

    return {
      rawDamage: Math.round(raw),
      finalDamage,
      isCrit,
      isBlocked: mitigation > 0.4,
      isDodged: false,
      damageType: attacker.damageType,
      statusProc
    };
  }
}

export const combatEngine = new CombatEngine();
