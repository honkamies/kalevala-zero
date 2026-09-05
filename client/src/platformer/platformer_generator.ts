// Procedural Side-Scroller Map Generator with Bottomless Chasms, Generous Head Clearance & Fluid Platforming

import { PlatformTileType, PlatformerLevel, PlatformerChest, PlatformerShrine, PlatformerPortal } from './platformer_types';

export class PlatformerGenerator {
  private static mulberry32(a: number) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  static generate(seed: number = 42, themeId: 'tuonela_chasm' | 'vainola_canopy' | 'pohjola_vault' | 'alinen_trench' = 'tuonela_chasm'): PlatformerLevel {
    const rng = this.mulberry32(seed);

    const width = 160;  // 160 tiles wide (~7700px)
    const height = 28;  // 28 tiles high (~1350px)
    const tileSize = 48;

    // Initialize blank grid with AIR
    const tiles: PlatformTileType[][] = [];
    for (let y = 0; y < height; y++) {
      tiles[y] = new Array(width).fill(PlatformTileType.AIR);
    }

    const chests: PlatformerChest[] = [];
    const shrines: PlatformerShrine[] = [];
    const enemySpawns: PlatformerLevel['enemySpawns'] = [];

    const groundFloorY = 22; // Main ground floor level

    // 1. Fill Default Ground Base (Leaving specific chasm sections completely open and empty)
    for (let x = 0; x < width; x++) {
      // Left & Right map boundary walls
      if (x < 3 || x >= width - 3) {
        for (let y = 0; y < height; y++) {
          tiles[y][x] = PlatformTileType.SOLID_GROUND;
        }
        continue;
      }

      // Check if x is in a Bottomless Pit / Void Chasm section
      const isChasm1 = x >= 30 && x <= 46;  // Section 2: Stygian Void Chasm
      const isChasm2 = x >= 88 && x <= 108; // Section 4: Iron Abyssal Ravine

      if (!isChasm1 && !isChasm2) {
        // Solid ground layer down to bottom
        for (let y = groundFloorY; y < height; y++) {
          tiles[y][x] = PlatformTileType.SOLID_GROUND;
        }
      }
      // If in chasm, it remains pure AIR all the way down to y: 28 so falling kills the player!
    }

    // 2. Zone 1: The Boreal Entry & Smooth Stepped Stairs (x: 4 to 28)
    // Low stepped platforms (each step is 1-2 tiles high with generous 5+ tiles overhead clearance)
    for (let x = 12; x <= 15; x++) tiles[20][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 16; x <= 19; x++) tiles[18][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 20; x <= 24; x++) tiles[16][x] = PlatformTileType.SOLID_GROUND;

    chests.push({
      id: 'chest_entry',
      x: 22,
      y: 15,
      isOpen: false,
      isLocked: false,
      lootLevel: 2
    });

    // Zone 1 Enemy Spawns (Smooth introductory pacing: clear landing at spawn x:4-16, light scout encounters)
    enemySpawns.push({ type: 'hound', x: 18, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'marauder', x: 22, y: 15 });
    enemySpawns.push({ type: 'wisp', x: 26, y: 13 });
    enemySpawns.push({ type: 'hound', x: 28, y: groundFloorY - 1 });

    // 3. Zone 2: Stygian Bottomless Chasm with Stepping Stone Slabs (x: 30 to 48)
    // Stepping stones over the bottomless void (2-3 tile jump gaps)
    for (let x = 31; x <= 34; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 36; x <= 39; x++) tiles[17][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 41; x <= 45; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;

    // Flying wisps & tracking seekers hovering above the abyss + platform guards
    enemySpawns.push({ type: 'wisp', x: 33, y: 11 });
    enemySpawns.push({ type: 'marauder', x: 38, y: 16 });
    enemySpawns.push({ type: 'seeker', x: 42, y: 10 });
    enemySpawns.push({ type: 'wisp', x: 45, y: 12 });
    enemySpawns.push({ type: 'hound', x: 47, y: 18 });
    enemySpawns.push({ type: 'seeker', x: 49, y: 11 });

    // 4. Zone 3: Runic Temple & High Sanctuary (x: 52 to 84)
    // Ascending stairs on left
    for (let x = 54; x <= 57; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 58; x <= 61; x++) tiles[16][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 62; x <= 66; x++) tiles[13][x] = PlatformTileType.SOLID_GROUND;

    // Temple roof center platform
    for (let x = 67; x <= 72; x++) tiles[10][x] = PlatformTileType.SOLID_GROUND;

    // Descending stairs on right
    for (let x = 73; x <= 76; x++) tiles[13][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 77; x <= 80; x++) tiles[16][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 81; x <= 84; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;

    // Golden bounce pad to launch directly to temple roof
    tiles[groundFloorY - 1][51] = PlatformTileType.BOUNCE_PAD;

    // Health & Repair Shrine on temple roof
    shrines.push({
      id: 'shrine_temple',
      x: 69,
      y: 9,
      isActivated: false,
      type: 'heal',
      title: 'Tuonela Runic Repair Core (+100% HP & Shield)'
    });

    enemySpawns.push({ type: 'hound', x: 54, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'seeker', x: 56, y: 13 });
    enemySpawns.push({ type: 'marauder', x: 60, y: 15 });
    enemySpawns.push({ type: 'wisp', x: 63, y: 10 });
    enemySpawns.push({ type: 'marauder', x: 67, y: 9, isElite: true });
    enemySpawns.push({ type: 'broodmother', x: 70, y: 9, isElite: true });
    enemySpawns.push({ type: 'seeker', x: 73, y: 8 });
    enemySpawns.push({ type: 'marauder', x: 76, y: 12 });
    enemySpawns.push({ type: 'wisp', x: 78, y: 11 });
    enemySpawns.push({ type: 'hound', x: 68, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 78, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'seeker', x: 82, y: 14 });

    // 5. Zone 4: The Abyssal Ravine & High Vantage Arch (x: 88 to 116)
    // Bottomless void chasm under the bridge (pure air below!)
    for (let x = 88; x <= 91; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 92; x <= 95; x++) tiles[16][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 96; x <= 100; x++) tiles[13][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 101; x <= 104; x++) tiles[16][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 105; x <= 108; x++) tiles[19][x] = PlatformTileType.SOLID_GROUND;

    // High secret treasure platform
    for (let x = 97; x <= 99; x++) tiles[8][x] = PlatformTileType.SOLID_GROUND;
    chests.push({
      id: 'chest_ravine_high',
      x: 98,
      y: 7,
      isOpen: false,
      isLocked: false,
      lootLevel: 4
    });

    enemySpawns.push({ type: 'seeker', x: 89, y: 11 });
    enemySpawns.push({ type: 'wisp', x: 90, y: 9 });
    enemySpawns.push({ type: 'marauder', x: 90, y: 18 });
    enemySpawns.push({ type: 'wisp', x: 93, y: 8 });
    enemySpawns.push({ type: 'marauder', x: 94, y: 15 });
    enemySpawns.push({ type: 'seeker', x: 95, y: 9 });
    enemySpawns.push({ type: 'broodmother', x: 98, y: 12 });
    enemySpawns.push({ type: 'seeker', x: 98, y: 5 });
    enemySpawns.push({ type: 'marauder', x: 97, y: 12, isElite: true });
    enemySpawns.push({ type: 'marauder', x: 99, y: 12, isElite: true });
    enemySpawns.push({ type: 'seeker', x: 101, y: 8 });
    enemySpawns.push({ type: 'wisp', x: 102, y: 9 });
    enemySpawns.push({ type: 'marauder', x: 103, y: 15 });
    enemySpawns.push({ type: 'wisp', x: 105, y: 10 });
    enemySpawns.push({ type: 'seeker', x: 106, y: 11 });
    enemySpawns.push({ type: 'marauder', x: 107, y: 18 });

    // Overclock Buff Shrine at x: 112
    shrines.push({
      id: 'shrine_overclock',
      x: 112,
      y: groundFloorY - 1,
      isActivated: false,
      type: 'buff',
      title: 'Väki Overclock Core (+50% Atk Spd)'
    });
    enemySpawns.push({ type: 'hound', x: 94, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 100, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 108, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 112, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 115, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'seeker', x: 116, y: 12 });

    // 6. Zone 5: Grand Boss Arena (x: 120 to 156)
    // High tactical combat ledges inside boss arena with wide vertical space
    for (let x = 126; x <= 131; x++) tiles[17][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 133; x <= 138; x++) tiles[13][x] = PlatformTileType.SOLID_GROUND;
    for (let x = 140; x <= 145; x++) tiles[17][x] = PlatformTileType.SOLID_GROUND;

    // Arena add minions (Massive climactic pile-up surrounding the Colossal Boss!)
    enemySpawns.push({ type: 'broodmother', x: 126, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'broodmother', x: 138, y: groundFloorY - 1, isElite: true });
    enemySpawns.push({ type: 'broodmother', x: 145, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'seeker', x: 123, y: 11 });
    enemySpawns.push({ type: 'wisp', x: 124, y: 7 });
    enemySpawns.push({ type: 'marauder', x: 127, y: 16 });
    enemySpawns.push({ type: 'seeker', x: 128, y: 10 });
    enemySpawns.push({ type: 'wisp', x: 130, y: 6 });
    enemySpawns.push({ type: 'marauder', x: 131, y: 16, isElite: true });
    enemySpawns.push({ type: 'seeker', x: 134, y: 8 });
    enemySpawns.push({ type: 'wisp', x: 135, y: 6 });
    enemySpawns.push({ type: 'seeker', x: 136, y: 7, isElite: true });
    enemySpawns.push({ type: 'marauder', x: 141, y: 16 });
    enemySpawns.push({ type: 'seeker', x: 142, y: 9 });
    enemySpawns.push({ type: 'wisp', x: 143, y: 7 });
    enemySpawns.push({ type: 'marauder', x: 144, y: 16, isElite: true });
    enemySpawns.push({ type: 'seeker', x: 146, y: 8 });
    enemySpawns.push({ type: 'hound', x: 124, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 128, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 132, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 136, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 140, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 144, y: groundFloorY - 1 });
    enemySpawns.push({ type: 'hound', x: 148, y: groundFloorY - 1 });

    // Corner bounce pads for rapid aerial evasion
    tiles[groundFloorY - 1][124] = PlatformTileType.BOUNCE_PAD;
    tiles[groundFloorY - 1][146] = PlatformTileType.BOUNCE_PAD;

    // Final Extraction Portal at the far right
    const exitPortal: PlatformerPortal = {
      x: 152,
      y: groundFloorY - 2,
      isActive: false,
      label: 'REALM EXTRACTION GATEWAY // TRANSCEND'
    };

    const titleMap: Record<string, { title: string; subtitle: string; name: string }> = {
      tuonela_chasm: {
        name: 'Tuonela Chasm Descent',
        title: 'TUONELAN MUSTA KUILU // THE DESCENT',
        subtitle: '2D Action Side-Scroller // Jump Obstacles & Gun Combat'
      },
      vainola_canopy: {
        name: 'Väinölä High Canopy',
        title: 'VÄINÖLÄN KORPI // THE HIGH BOUGHS',
        subtitle: '2D Action Side-Scroller // Spruce Platforms & Hiisi Marauders'
      },
      pohjola_vault: {
        name: 'Pohjola Frost Shaft',
        title: 'POHJOLAN PAKKASKUOLU // CRYOGENIC SHAFT',
        subtitle: '2D Action Side-Scroller // Sub-Zero Slabs & Louhi Mech'
      },
      alinen_trench: {
        name: 'Alinen Magma Trench',
        title: 'ALISEN TULIKUROT // MAGMA TRENCH',
        subtitle: '2D Action Side-Scroller // Obsidian Platforms & Iku-Turso'
      }
    };

    const info = titleMap[themeId] || titleMap.tuonela_chasm;

    return {
      seed,
      name: info.name,
      themeId,
      title: info.title,
      subtitle: info.subtitle,
      width,
      height,
      tileSize,
      tiles,
      spawnX: 6,
      spawnY: groundFloorY - 2,
      exitPortal,
      chests,
      shrines,
      enemySpawns
    };
  }
}
