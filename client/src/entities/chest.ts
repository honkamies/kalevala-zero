// Loot Chests & Cyber-Vaults with Cryptographic WASD Directional Ciphers and Self-Destruction Safeguards

import { Item, ItemGenerator } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';

export type DecryptionKey = 'W' | 'A' | 'S' | 'D';
export type ChestHardness = 'easy' | 'medium' | 'hard' | 'deadly';
export type ChestColor = 'green' | 'blue' | 'yellow' | 'red';

export interface ChestHardnessInfo {
  hardness: ChestHardness;
  color: ChestColor;
  colorHex: string;
  badgeLabel: string;
  title: string;
  description: string;
}

export const CHEST_HARDNESS_CONFIG: Record<ChestHardness, ChestHardnessInfo> = {
  easy: {
    hardness: 'easy',
    color: 'green',
    colorHex: '#22c55e',
    badgeLabel: 'EASY',
    title: 'Green Cyber-Cache (Easy)',
    description: 'Low-security cipher. 3 directional keys with relaxed 2.6s reaction window.'
  },
  medium: {
    hardness: 'medium',
    color: 'blue',
    colorHex: '#38bdf8',
    badgeLabel: 'MEDIUM',
    title: 'Blue Cyber-Cache (Medium)',
    description: 'Standard security cipher. 4 directional keys with steady 2.2s reaction window.'
  },
  hard: {
    hardness: 'hard',
    color: 'yellow',
    colorHex: '#facc15',
    badgeLabel: 'HARD',
    title: 'Yellow Runic Vault (Hard)',
    description: 'High-security cipher. 5 directional keys with brisk 1.8s reaction window.'
  },
  deadly: {
    hardness: 'deadly',
    color: 'red',
    colorHex: '#ef4444',
    badgeLabel: 'DEADLY',
    title: 'Red Relic Vault (Deadly)',
    description: 'Overclocked master vault. 6-7 keys, razor-sharp 1.4s reaction window and severe overload blast!'
  }
};

export class LootChest {
  public id: string;
  public x: number;
  public y: number;
  public isOpened: boolean = false;
  public isLocked: boolean = false;
  public isDestroyed: boolean = false;
  public hardness: ChestHardness = 'easy';
  public chestColor: ChestColor = 'green';
  public colorHex: string = '#22c55e';
  public hardnessInfo: ChestHardnessInfo = CHEST_HARDNESS_CONFIG.easy;
  public rarity: 'common' | 'augmented' | 'runic' | 'masterwork' | 'relic' = 'common';
  public displayName: string = 'Green Cyber-Cache (Easy)';
  public keySequence: DecryptionKey[] = [];
  public timeLimitPerKey: number = 2.6; // in seconds
  public maxAttempts: number = 3;
  public attemptsLeft: number = 3;
  public explosionDamage: number = 25;
  public contents: Item[] = [];

  constructor(x: number, y: number, isLocked: boolean = false, itemLevel: number = 1) {
    this.id = 'chest_' + Math.random().toString(36).substring(2, 8);
    this.x = x;
    this.y = y;
    this.isLocked = isLocked;

    // Determine chest hardness level & color (scaled by sector/level):
    // Green (Easy) -> Blue (Medium) -> Yellow (Hard) -> Red (Deadly)
    const r = Math.random();
    let hardness: ChestHardness = 'easy';

    if (itemLevel <= 2) {
      if (r > 0.90) {
        hardness = 'hard';
      } else if (r > 0.50) {
        hardness = 'medium';
      } else {
        hardness = 'easy';
      }
    } else if (itemLevel <= 4) {
      if (r > 0.90) {
        hardness = 'deadly';
      } else if (r > 0.60) {
        hardness = 'hard';
      } else if (r > 0.25) {
        hardness = 'medium';
      } else {
        hardness = 'easy';
      }
    } else {
      if (r > 0.65) {
        hardness = 'deadly';
      } else if (r > 0.35) {
        hardness = 'hard';
      } else if (r > 0.15) {
        hardness = 'medium';
      } else {
        hardness = 'easy';
      }
    }

    this.hardness = hardness;
    const config = CHEST_HARDNESS_CONFIG[hardness];
    this.hardnessInfo = config;
    this.chestColor = config.color;
    this.colorHex = config.colorHex;

    let seqLen = 3;
    let timeLimit = 2.6;

    switch (hardness) {
      case 'easy':
        this.rarity = 'common';
        this.displayName = 'Green Cyber-Cache (Easy)';
        seqLen = 3;
        timeLimit = 2.6;
        this.maxAttempts = 3;
        this.explosionDamage = Math.round(15 + itemLevel * 4);
        break;
      case 'medium':
        this.rarity = 'augmented';
        this.displayName = 'Blue Cyber-Cache (Medium)';
        seqLen = 4;
        timeLimit = 2.2;
        this.maxAttempts = 3;
        this.explosionDamage = Math.round(25 + itemLevel * 6);
        break;
      case 'hard':
        this.rarity = 'masterwork';
        this.displayName = 'Yellow Runic Vault (Hard)';
        seqLen = 5;
        timeLimit = 1.8;
        this.maxAttempts = 2;
        this.explosionDamage = Math.round(45 + itemLevel * 8);
        break;
      case 'deadly':
        this.rarity = 'relic';
        this.displayName = 'Red Relic Vault (Deadly)';
        seqLen = (itemLevel >= 6 && Math.random() > 0.5) ? 7 : 6;
        timeLimit = 1.4;
        this.maxAttempts = 2;
        this.explosionDamage = Math.round(75 + itemLevel * 12);
        break;
    }

    this.attemptsLeft = this.maxAttempts;
    this.timeLimitPerKey = timeLimit;

    // Generate random WASD sequence
    const keys: DecryptionKey[] = ['W', 'A', 'S', 'D'];
    for (let i = 0; i < seqLen; i++) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      this.keySequence.push(k);
    }

    // Generate loot appropriate for the chest rarity/hardness
    const itemCount = (hardness === 'deadly' || (hardness === 'hard' && Math.random() < 0.25)) ? 2 : 1;
    for (let i = 0; i < itemCount; i++) {
      this.contents.push(ItemGenerator.generateRandomLoot(itemLevel, this.rarity));
    }
  }

  open(): Item[] {
    if (this.isOpened || this.isLocked || this.isDestroyed) return [];
    this.isOpened = true;

    soundEngine.playLootDrop(this.hardness === 'hard' || this.hardness === 'deadly');
    particleSystem.emitBeacon(this.x, this.y, this.colorHex);

    return this.contents;
  }

  selfDestruct(): number {
    this.isDestroyed = true;
    this.isOpened = true;
    this.contents = []; // Loot incinerated in explosion
    return this.explosionDamage;
  }

  unlock() {
    this.isLocked = false;
  }
}
