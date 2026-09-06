// Loot Chests & Cyber-Vaults with Cryptographic WASD Directional Ciphers and Self-Destruction Safeguards

import { Item, ItemGenerator } from '../systems/items';
import { soundEngine } from '../engine/audio';
import { particleSystem } from '../engine/particles';

export type DecryptionKey = 'W' | 'A' | 'S' | 'D';

export class LootChest {
  public id: string;
  public x: number;
  public y: number;
  public isOpened: boolean = false;
  public isLocked: boolean = false;
  public isDestroyed: boolean = false;
  public rarity: 'common' | 'augmented' | 'runic' | 'masterwork' | 'relic' = 'augmented';
  public displayName: string;
  public keySequence: DecryptionKey[] = [];
  public timeLimitPerKey: number; // in seconds
  public maxAttempts: number = 3;
  public attemptsLeft: number = 3;
  public explosionDamage: number = 35;
  public contents: Item[] = [];

  constructor(x: number, y: number, isLocked: boolean = false, itemLevel: number = 1) {
    this.id = 'chest_' + Math.random().toString(36).substring(2, 8);
    this.x = x;
    this.y = y;
    this.isLocked = isLocked;

    // Determine chest rarity and sequence difficulty (scaled by sector/level)
    const r = Math.random();
    let seqLen = 4;
    let timeLimit = 2.4;

    if (itemLevel <= 2) {
      // First map / early levels: mostly common and augmented supply caches
      if (r > 0.95) {
        this.rarity = 'runic';
        this.displayName = 'Runic Cryptographic Vault';
        seqLen = 5;
        timeLimit = 1.8;
        this.maxAttempts = 3;
      } else if (r > 0.60) {
        this.rarity = 'augmented';
        this.displayName = 'Augmented Cyber-Cache';
        seqLen = 4;
        timeLimit = 2.2;
        this.maxAttempts = 3;
      } else {
        this.rarity = 'common';
        this.displayName = 'Standard Nanite Supply Crate';
        seqLen = 3;
        timeLimit = 2.5;
        this.maxAttempts = 3;
      }
    } else if (itemLevel <= 4) {
      if (r > 0.95) {
        this.rarity = 'masterwork';
        this.displayName = 'Masterwork Nanite Coffer';
        seqLen = 6;
        timeLimit = 1.6;
        this.maxAttempts = 2;
      } else if (r > 0.70) {
        this.rarity = 'runic';
        this.displayName = 'Runic Cryptographic Vault';
        seqLen = 5;
        timeLimit = 1.8;
        this.maxAttempts = 3;
      } else if (r > 0.35) {
        this.rarity = 'augmented';
        this.displayName = 'Augmented Cyber-Cache';
        seqLen = 4;
        timeLimit = 2.2;
        this.maxAttempts = 3;
      } else {
        this.rarity = 'common';
        this.displayName = 'Standard Nanite Supply Crate';
        seqLen = 3;
        timeLimit = 2.4;
        this.maxAttempts = 3;
      }
    } else {
      if (r > 0.90) {
        this.rarity = 'masterwork';
        this.displayName = 'Masterwork Nanite Coffer';
        seqLen = 7;
        timeLimit = 1.4;
        this.maxAttempts = 2;
      } else if (r > 0.55) {
        this.rarity = 'runic';
        this.displayName = 'Runic Cryptographic Vault';
        seqLen = 6;
        timeLimit = 1.8;
        this.maxAttempts = 2;
      } else {
        this.rarity = 'augmented';
        this.displayName = 'Augmented Cyber-Cache';
        seqLen = 4;
        timeLimit = 2.2;
        this.maxAttempts = 3;
      }
    }

    this.attemptsLeft = this.maxAttempts;
    this.timeLimitPerKey = timeLimit;
    this.explosionDamage = Math.round(20 + itemLevel * 8);

    // Generate random WASD sequence
    const keys: DecryptionKey[] = ['W', 'A', 'S', 'D'];
    for (let i = 0; i < seqLen; i++) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      this.keySequence.push(k);
    }

    // Tuned down loot: 1 item per chest (rare chance of 2 in masterwork)
    const itemCount = (this.rarity === 'masterwork' && Math.random() < 0.20) ? 2 : 1;
    for (let i = 0; i < itemCount; i++) {
      this.contents.push(ItemGenerator.generateRandomLoot(itemLevel, this.rarity));
    }
  }

  open(): Item[] {
    if (this.isOpened || this.isLocked || this.isDestroyed) return [];
    this.isOpened = true;

    soundEngine.playLootDrop(this.rarity === 'masterwork' || this.rarity === 'relic');
    particleSystem.emitBeacon(this.x, this.y, this.rarity === 'masterwork' ? '#a855f7' : '#f59e0b');

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
