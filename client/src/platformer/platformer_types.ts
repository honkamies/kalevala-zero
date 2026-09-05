// Platformer Types & Data Definitions for Side-Scroller Mode

export enum PlatformTileType {
  AIR = 0,                  // Open air / bottomless void pit (falling here causes death)
  SOLID_GROUND = 1,         // Solid ground & stepping stone platforms
  BOUNCE_PAD = 2,           // Runic launch pad that propels player high upward
  RUNE_PILLAR = 3,          // Background architectural stone / cyber pillar
  ENERGY_BARRIER = 4        // Destroyable / glowing rune barrier
}

export interface PlatformerChest {
  id: string;
  x: number;
  y: number;
  isOpen: boolean;
  isLocked: boolean;
  lootLevel: number;
}

export interface PlatformerShrine {
  id: string;
  x: number;
  y: number;
  isActivated: boolean;
  type: 'heal' | 'buff' | 'scrap';
  title: string;
}

export interface PlatformerPortal {
  x: number;
  y: number;
  isActive: boolean;
  label: string;
}

export interface PlatformerLevel {
  seed: number;
  name: string;
  themeId: 'tuonela_chasm' | 'vainola_canopy' | 'pohjola_vault' | 'alinen_trench';
  title: string;
  subtitle: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: PlatformTileType[][];
  spawnX: number;
  spawnY: number;
  exitPortal: PlatformerPortal;
  chests: PlatformerChest[];
  shrines: PlatformerShrine[];
  enemySpawns: {
    type: 'marauder' | 'hound' | 'wisp' | 'seeker' | 'broodmother' | 'boss';
    x: number;
    y: number;
    isElite?: boolean;
  }[];
}
