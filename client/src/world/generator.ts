// Deterministic Multi-Archetype Dungeon & Wilderness Generator for Project Sampo-Zero
// Features 6 Macro Layout Topologies, 11 Distinct Room Geometries, Randomized Spawn & Escape Points, and Guaranteed Connectivity.

import { TileType } from './tiles';
import { BiomeDefinition, BIOMES } from './biomes';

export type LayoutArchetype =
  | 'bsp_labyrinth'
  | 'radial_citadel'
  | 'branching_river'
  | 'multi_wing_fortress'
  | 'organic_caverns'
  | 'chasm_archipelago';

export type RoomShape =
  | 'rectangle'
  | 'rounded_box'
  | 'circle_ellipse'
  | 'octagon'
  | 'cross_plus'
  | 't_shape'
  | 'l_shape'
  | 'pillared_colonnade'
  | 'island_moat'
  | 'organic_cave'
  | 'antechamber_suite';

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
  type: 'spawn' | 'loot' | 'puzzle' | 'elite' | 'boss' | 'normal' | 'escape';
  shape: RoomShape;
  floorTiles?: { x: number; y: number }[];
}

export interface GeneratedWorld {
  seed: number;
  biome: BiomeDefinition;
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: Room[];
  spawnPoint: { x: number; y: number };
  bossPoint: { x: number; y: number };
  escapePoint: { x: number; y: number };
  chestPoints: { x: number; y: number; isLocked?: boolean }[];
  puzzlePoints: { x: number; y: number; verseTitle: string }[];
  gatewayPoints: { x: number; y: number }[];
  enemySpawns: { x: number; y: number; enemyTypeIndex: number; isElite?: boolean }[];
  shrinePoints: { x: number; y: number }[];
  layoutType: LayoutArchetype;
  layoutDisplayName: string;
}

export class DungeonGenerator {
  // Deterministic Mulberry32 PRNG
  public static mulberry32(a: number) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Biome-preferred layout archetype selection with weighted randomness
  private static pickLayoutArchetype(biomeId: string, rng: () => number): { type: LayoutArchetype; name: string } {
    const layoutPools: Record<string, LayoutArchetype[]> = {
      ilman_luominen: ['radial_citadel', 'chasm_archipelago', 'bsp_labyrinth', 'multi_wing_fortress'],
      vainola: ['branching_river', 'organic_caverns', 'bsp_labyrinth', 'chasm_archipelago'],
      pohjola: ['multi_wing_fortress', 'bsp_labyrinth', 'radial_citadel', 'organic_caverns'],
      tuonela: ['organic_caverns', 'chasm_archipelago', 'branching_river', 'bsp_labyrinth'],
      alinen: ['chasm_archipelago', 'branching_river', 'multi_wing_fortress', 'organic_caverns'],
      ylinen: ['radial_citadel', 'multi_wing_fortress', 'bsp_labyrinth', 'radial_citadel']
    };

    const allArchetypes: LayoutArchetype[] = [
      'bsp_labyrinth',
      'radial_citadel',
      'branching_river',
      'multi_wing_fortress',
      'organic_caverns',
      'chasm_archipelago'
    ];

    const preferred = layoutPools[biomeId] || allArchetypes;
    // 75% pick from preferred pool, 25% from any archetype for supreme variety
    const chosenType = rng() < 0.75 
      ? preferred[Math.floor(rng() * preferred.length)]
      : allArchetypes[Math.floor(rng() * allArchetypes.length)];

    const displayNames: Record<LayoutArchetype, string> = {
      bsp_labyrinth: 'Asymmetrical Partitioned Labyrinth',
      radial_citadel: 'Concentric Radial Wheel & Sanctum',
      branching_river: 'Serpentine River Artery & Tributaries',
      multi_wing_fortress: 'Four-Bastion Star Citadel',
      organic_caverns: 'Organic Cavern Network & Glades',
      chasm_archipelago: 'Chasm Archipelago & Stone Bridges'
    };

    return { type: chosenType, name: displayNames[chosenType] };
  }

  // Dedicated Void Dimension Generator: Wide-open cosmic void map with NO walls and NO normal enemies
  static generateVoidDimension(seed: number, biomeId: string = 'void_dimension', mapSize: number = 70): GeneratedWorld {
    const biome = BIOMES[biomeId] || BIOMES['void_dimension'];
    const width = mapSize;
    const height = mapSize;

    // 1. Fill entire arena with pure FLOOR, with only boundary walls at outer edge
    const tiles: TileType[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          return TileType.WALL;
        }
        return TileType.FLOOR;
      })
    );

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    const spawnPoint = { x: centerX, y: centerY };
    const bossPoint = { x: centerX, y: centerY - 8 };
    const escapePoint = { x: centerX, y: centerY + 12 };

    const singleRoom: Room = {
      id: 1,
      x: 1,
      y: 1,
      w: width - 2,
      h: height - 2,
      centerX: centerX,
      centerY: centerY,
      type: 'boss',
      shape: 'rectangle'
    };

    return {
      seed,
      biome,
      width,
      height,
      tiles,
      rooms: [singleRoom],
      spawnPoint,
      bossPoint,
      escapePoint,
      chestPoints: [],
      puzzlePoints: [],
      gatewayPoints: [],
      enemySpawns: [],
      shrinePoints: [],
      layoutType: 'radial_citadel',
      layoutDisplayName: 'The Boundless Primordial Void Arena'
    };
  }

  // Master Generator Function
  static generate(seed: number, biomeId: string = 'pohjola', mapSize: number = 84): GeneratedWorld {
    if (biomeId === 'void_dimension') {
      return this.generateVoidDimension(seed, biomeId, mapSize > 70 ? 70 : mapSize);
    }

    const rng = this.mulberry32(seed);
    const biome = BIOMES[biomeId] || BIOMES['pohjola'];
    const width = mapSize;
    const height = mapSize;

    // 1. Initialize all grid tiles as WALL
    const tiles: TileType[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => TileType.WALL)
    );

    // 2. Select Layout Archetype
    const layout = this.pickLayoutArchetype(biomeId, rng);

    // 3. Generate Rooms & Corridors based on selected Macro Topology
    let rooms: Room[] = [];
    switch (layout.type) {
      case 'radial_citadel':
        rooms = this.generateRadialCitadel(tiles, width, height, rng, biomeId);
        break;
      case 'branching_river':
        rooms = this.generateBranchingRiver(tiles, width, height, rng, biomeId);
        break;
      case 'multi_wing_fortress':
        rooms = this.generateMultiWingFortress(tiles, width, height, rng, biomeId);
        break;
      case 'organic_caverns':
        rooms = this.generateOrganicCaverns(tiles, width, height, rng, biomeId);
        break;
      case 'chasm_archipelago':
        rooms = this.generateChasmArchipelago(tiles, width, height, rng, biomeId);
        break;
      case 'bsp_labyrinth':
      default:
        rooms = this.generateBSPLabyrinth(tiles, width, height, rng, biomeId);
        break;
    }

    // Safety fallback: Ensure at least 8 rooms exist
    if (rooms.length < 8) {
      rooms = this.generateBSPLabyrinth(tiles, width, height, rng, biomeId);
    }

    // 4. Guarantee 100% Graph Connectivity via Flood Fill & Bridge Carver
    this.ensureCompleteConnectivity(tiles, width, height, rooms, rng);

    // 5. Select Dynamic Starting (Spawn) Point
    // Pick from perimeter/dead-end rooms with good exploration potential
    const spawnRoomIdx = this.selectSpawnRoom(rooms, rng);
    const spawnRoom = rooms[spawnRoomIdx];
    spawnRoom.type = 'spawn';

    // 6. Select Dynamic Boss Sanctum
    // Place boss in the most distant chamber from spawn
    const bossRoomIdx = this.selectBossRoom(rooms, spawnRoom);
    const bossRoom = rooms[bossRoomIdx];
    bossRoom.type = 'boss';

    // 7. Select Dynamic Extraction (Escape) Point
    // Place extraction portal in a high-distance non-boss room (often divergent wing)
    const escapeRoomIdx = this.selectEscapeRoom(rooms, spawnRoom, bossRoom, rng);
    const escapeRoom = rooms[escapeRoomIdx];
    if (escapeRoom.type !== 'spawn' && escapeRoom.type !== 'boss') {
      escapeRoom.type = 'escape';
    }

    // Assign Special Room Roles to Remaining Rooms
    const remainingRooms = rooms.filter(r => r.type === 'normal');
    // Shuffle remaining rooms deterministically
    this.shuffle(remainingRooms, rng);

    let puzzleCount = 0;
    let lootCount = 0;
    let eliteCount = 0;

    for (const r of remainingRooms) {
      if (puzzleCount < 3) {
        r.type = 'puzzle';
        puzzleCount++;
      } else if (lootCount < 3) {
        r.type = 'loot';
        lootCount++;
      } else if (eliteCount < 3) {
        r.type = 'elite';
        eliteCount++;
      }
    }

    // Find valid floor center for spawn, boss, and escape
    const spawnPoint = this.findSafeFloorTileInRoom(tiles, spawnRoom, width, height);
    const bossPoint = this.findSafeFloorTileInRoom(tiles, bossRoom, width, height);
    const escapePoint = this.findSafeFloorTileInRoom(tiles, escapeRoom, width, height);
    // Ensure spacious boss arena floor around bossPoint for colossal bosses
    const arenaRadius = 6;
    for (let ay = Math.max(2, bossPoint.y - arenaRadius); ay <= Math.min(height - 3, bossPoint.y + arenaRadius); ay++) {
      for (let ax = Math.max(2, bossPoint.x - arenaRadius); ax <= Math.min(width - 3, bossPoint.x + arenaRadius); ax++) {
        const d = Math.hypot(ax - bossPoint.x, ay - bossPoint.y);
        if (d <= arenaRadius) {
          tiles[ay][ax] = TileType.FLOOR;
        }
      }
    }

    // Mark Boss Room Core Gate
    tiles[bossPoint.y][bossPoint.x] = TileType.GATE;

    // Collect objective points & populate world entities
    const chestPoints: { x: number; y: number; isLocked?: boolean }[] = [];
    const puzzlePoints: { x: number; y: number; verseTitle: string }[] = [];
    const gatewayPoints: { x: number; y: number }[] = [];
    const enemySpawns: { x: number; y: number; enemyTypeIndex: number; isElite?: boolean }[] = [];
    const shrinePoints: { x: number; y: number }[] = [];

    // Starting Shrine at Spawn
    tiles[spawnPoint.y][spawnPoint.x] = TileType.SHRINE;
    shrinePoints.push({ x: spawnPoint.x, y: spawnPoint.y });

    // Clean safe zone around spawn point (no hazards or traps within 7 tiles)
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const sx = spawnPoint.x + dx;
        const sy = spawnPoint.y + dy;
        if (sx >= 1 && sx < width - 1 && sy >= 1 && sy < height - 1) {
          if (tiles[sy][sx] === TileType.HAZARD) {
            tiles[sy][sx] = TileType.FLOOR;
          }
        }
      }
    }

    const kalevalaVerses = [
      'Vaka vanha Väinämöinen (First Protocol)',
      'Seppä Ilmarinen (Forge Matrix)',
      'Louhi Pohjolan Emäntä (Frost Command)',
      'Tuonelan Joutsen (Black Current)',
      'Lemminkäisen Virsi (Resurrection Protocol)',
      'Kullervon Kirous (Rune of Vengeance)',
      'Sammon Taonta (Matter Synthesis Protocol)'
    ];

    let puzzleCounter = 0;

    rooms.forEach((r) => {
      if (r.type === 'spawn') return;

      const safeTile = this.findSafeFloorTileInRoom(tiles, r, width, height);

      if (r.type === 'puzzle') {
        puzzlePoints.push({
          x: safeTile.x,
          y: safeTile.y,
          verseTitle: kalevalaVerses[puzzleCounter % kalevalaVerses.length]
        });
        puzzleCounter++;
        tiles[safeTile.y][safeTile.x] = TileType.SHRINE;
      }

      // Chests are placed in dedicated loot chambers, or rarely in elite rooms (tuning down excessive loot)
      if (r.type === 'loot' || (r.type === 'elite' && rng() > 0.70)) {
        const chestTile = this.findSafeFloorTileInRoom(tiles, r, width, height, 2);
        chestPoints.push({
          x: chestTile.x,
          y: chestTile.y,
          isLocked: r.type === 'elite'
        });
      }

      // Add Void Gateways in elite outposts or prominent hubs (far from spawn)
      if ((r.type === 'elite' || r.type === 'escape') && gatewayPoints.length < 3 && Math.hypot(safeTile.x - spawnPoint.x, safeTile.y - spawnPoint.y) > 18.0) {
        gatewayPoints.push({
          x: safeTile.x,
          y: safeTile.y
        });
      }

      // Add environmental hazards in wild / chasm rooms (away from spawn and objectives)
      if ((r.type === 'normal' || r.type === 'elite') && rng() > 0.45) {
        const hCount = Math.floor(rng() * 4) + 1;
        for (let i = 0; i < hCount; i++) {
          const hx = r.x + 2 + Math.floor(rng() * Math.max(1, r.w - 4));
          const hy = r.y + 2 + Math.floor(rng() * Math.max(1, r.h - 4));
          if (
            hy >= 1 && hy < height - 1 && hx >= 1 && hx < width - 1 &&
            tiles[hy][hx] === TileType.FLOOR &&
            Math.hypot(hx - spawnPoint.x, hy - spawnPoint.y) > 14 &&
            Math.hypot(hx - safeTile.x, hy - safeTile.y) > 2
          ) {
            tiles[hy][hx] = TileType.HAZARD;
          }
        }
      }

      // Spawn Enemies only in non-boss rooms, far from player starting area
      if (r.type !== 'boss') {
        const isEliteRoom = r.type === 'elite';
        const baseEnemies = isEliteRoom ? 6 : 4;
        const enemyCount = baseEnemies + Math.floor(rng() * 4);

        for (let e = 0; e < enemyCount; e++) {
          const ex = r.x + 1 + Math.floor(rng() * Math.max(1, r.w - 2));
          const ey = r.y + 1 + Math.floor(rng() * Math.max(1, r.h - 2));
          if (
            ey >= 1 && ey < height - 1 && ex >= 1 && ex < width - 1 &&
            tiles[ey][ex] === TileType.FLOOR &&
            Math.hypot(ex - spawnPoint.x, ey - spawnPoint.y) > 16.0
          ) {
            const enemyTypeIndex = Math.floor(rng() * biome.enemyPool.length);
            enemySpawns.push({
              x: ex,
              y: ey,
              enemyTypeIndex,
              isElite: isEliteRoom && e < 2
            });
          }
        }
      }
    });

    return {
      seed,
      biome,
      width,
      height,
      tiles,
      rooms,
      spawnPoint,
      bossPoint,
      escapePoint,
      chestPoints,
      puzzlePoints,
      gatewayPoints,
      enemySpawns,
      shrinePoints,
      layoutType: layout.type,
      layoutDisplayName: layout.name
    };
  }

  // =========================================================================
  // ROOM SHAPE CARVER (11 Distinct Organic & Architectural Geometries)
  // =========================================================================
  private static carveRoomShape(
    tiles: TileType[][],
    room: Room,
    width: number,
    height: number,
    rng: () => number,
    _biomeId: string
  ) {
    const rx = room.x;
    const ry = room.y;
    const rw = room.w;
    const rh = room.h;
    const cx = room.centerX;
    const cy = room.centerY;
    const shape = room.shape;

    switch (shape) {
      case 'circle_ellipse': {
        const radX = (rw - 2) / 2;
        const radY = (rh - 2) / 2;
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              const normX = (x - cx) / radX;
              const normY = (y - cy) / radY;
              if (normX * normX + normY * normY <= 1.05) {
                tiles[y][x] = TileType.FLOOR;
              }
            }
          }
        }
        break;
      }

      case 'octagon': {
        const halfW = (rw - 1) / 2;
        const halfH = (rh - 1) / 2;
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              const dx = Math.abs(x - cx) / halfW;
              const dy = Math.abs(y - cy) / halfH;
              if (dx + dy <= 1.38 && dx <= 0.98 && dy <= 0.98) {
                tiles[y][x] = TileType.FLOOR;
              }
            }
          }
        }
        break;
      }

      case 'cross_plus': {
        const armW = Math.max(3, Math.floor(rw * 0.44));
        const armH = Math.max(3, Math.floor(rh * 0.44));
        // Horizontal bar
        for (let y = cy - Math.floor(armH / 2); y <= cy + Math.floor(armH / 2); y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Vertical bar
        for (let y = ry; y < ry + rh; y++) {
          for (let x = cx - Math.floor(armW / 2); x <= cx + Math.floor(armW / 2); x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        break;
      }

      case 't_shape': {
        const stemWidth = Math.max(3, Math.floor(rw * 0.45));
        const barHeight = Math.max(3, Math.floor(rh * 0.45));
        // Top crossbar
        for (let y = ry; y < ry + barHeight; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Vertical stem extending down
        for (let y = ry + barHeight; y < ry + rh; y++) {
          for (let x = cx - Math.floor(stemWidth / 2); x <= cx + Math.floor(stemWidth / 2); x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        break;
      }

      case 'l_shape': {
        const thickness = Math.max(3, Math.floor(Math.min(rw, rh) * 0.48));
        // Bottom bar
        for (let y = ry + rh - thickness; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Left column
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + thickness; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        break;
      }

      case 'pillared_colonnade': {
        // Full rectangular floor
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Symmetrical tactical pillars (1x1 or 2x2 internal columns)
        const pOffX = Math.max(2, Math.floor(rw * 0.28));
        const pOffY = Math.max(2, Math.floor(rh * 0.28));
        const pillarCoords = [
          { x: cx - pOffX, y: cy - pOffY },
          { x: cx + pOffX, y: cy - pOffY },
          { x: cx - pOffX, y: cy + pOffY },
          { x: cx + pOffX, y: cy + pOffY }
        ];
        pillarCoords.forEach(p => {
          if (p.x >= 2 && p.x < width - 2 && p.y >= 2 && p.y < height - 2) {
            tiles[p.y][p.x] = TileType.WALL;
            if (rw >= 12 && rh >= 12) {
              tiles[p.y + 1][p.x] = TileType.WALL;
              tiles[p.y][p.x + 1] = TileType.WALL;
              tiles[p.y + 1][p.x + 1] = TileType.WALL;
            }
          }
        });
        break;
      }

      case 'island_moat': {
        // Outer room floor
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Hazard moat around central platform
        const moatW = Math.max(2, Math.floor(rw * 0.3));
        const moatH = Math.max(2, Math.floor(rh * 0.3));
        for (let y = cy - moatH; y <= cy + moatH; y++) {
          for (let x = cx - moatW; x <= cx + moatW; x++) {
            if (x >= 2 && x < width - 2 && y >= 2 && y < height - 2) {
              tiles[y][x] = TileType.HAZARD;
            }
          }
        }
        // Center raised island floor
        const isW = Math.max(1, Math.floor(moatW * 0.5));
        const isH = Math.max(1, Math.floor(moatH * 0.5));
        for (let y = cy - isH; y <= cy + isH; y++) {
          for (let x = cx - isW; x <= cx + isW; x++) {
            if (x >= 2 && x < width - 2 && y >= 2 && y < height - 2) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // 4 Cross-Bridges connecting island to room edges
        for (let y = cy - moatH; y <= cy + moatH; y++) {
          tiles[y][cx] = TileType.FLOOR;
        }
        for (let x = cx - moatW; x <= cx + moatW; x++) {
          tiles[cy][x] = TileType.FLOOR;
        }
        break;
      }

      case 'organic_cave': {
        const radX = (rw - 2) / 2;
        const radY = (rh - 2) / 2;
        const phase = rng() * 10;
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              const angle = Math.atan2(y - cy, x - cx);
              const perturbation = 1.0 + Math.sin(angle * 3 + phase) * 0.22 + Math.cos(angle * 5 + phase * 0.5) * 0.12;
              const effRadX = radX * perturbation;
              const effRadY = radY * perturbation;
              const normX = (x - cx) / effRadX;
              const normY = (y - cy) / effRadY;
              if (normX * normX + normY * normY <= 1.0) {
                tiles[y][x] = TileType.FLOOR;
              }
            }
          }
        }
        break;
      }

      case 'antechamber_suite': {
        // Main room floor
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        // Attached small side vault / alcove
        const alcoveW = Math.max(3, Math.floor(rw * 0.4));
        const alcoveH = Math.max(3, Math.floor(rh * 0.4));
        const alcoveX = Math.min(width - alcoveW - 2, rx + rw);
        const alcoveY = cy - Math.floor(alcoveH / 2);
        for (let y = alcoveY; y < alcoveY + alcoveH; y++) {
          for (let x = alcoveX; x < alcoveX + alcoveW; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        break;
      }

      case 'rounded_box': {
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              const isCorner =
                (x === rx && (y === ry || y === ry + rh - 1)) ||
                (x === rx + rw - 1 && (y === ry || y === ry + rh - 1));
              if (!isCorner) {
                tiles[y][x] = TileType.FLOOR;
              }
            }
          }
        }
        break;
      }

      case 'rectangle':
      default: {
        for (let y = ry; y < ry + rh; y++) {
          for (let x = rx; x < rx + rw; x++) {
            if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1) {
              tiles[y][x] = TileType.FLOOR;
            }
          }
        }
        break;
      }
    }
  }

  // Pick random shape suitable for room dimensions and archetype
  private static pickRandomShape(rng: () => number, isBoss: boolean = false): RoomShape {
    if (isBoss) {
      const bossShapes: RoomShape[] = ['octagon', 'circle_ellipse', 'pillared_colonnade', 'island_moat'];
      return bossShapes[Math.floor(rng() * bossShapes.length)];
    }
    const allShapes: RoomShape[] = [
      'rectangle',
      'rounded_box',
      'circle_ellipse',
      'octagon',
      'cross_plus',
      't_shape',
      'l_shape',
      'pillared_colonnade',
      'island_moat',
      'organic_cave',
      'antechamber_suite'
    ];
    return allShapes[Math.floor(rng() * allShapes.length)];
  }

  // =========================================================================
  // CORRIDOR CARVER (Spacious 2-4 Wide Natural Winding Paths)
  // =========================================================================
  private static carveCorridor(
    tiles: TileType[][],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    height: number,
    corridorWidth: number = 3,
    rng?: () => number
  ) {
    let curX = x1;
    let curY = y1;
    const horizontalFirst = rng ? rng() > 0.5 : true;

    const carveTile = (cx: number, cy: number) => {
      for (let dy = 0; dy < corridorWidth; dy++) {
        for (let dx = 0; dx < corridorWidth; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx >= 1 && tx < width - 1 && ty >= 1 && ty < height - 1) {
            if (tiles[ty][tx] === TileType.WALL || tiles[ty][tx] === TileType.HAZARD) {
              tiles[ty][tx] = TileType.FLOOR;
            }
          }
        }
      }
    };

    if (horizontalFirst) {
      while (curX !== x2) {
        carveTile(curX, curY);
        curX += curX < x2 ? 1 : -1;
      }
      while (curY !== y2) {
        carveTile(curX, curY);
        curY += curY < y2 ? 1 : -1;
      }
    } else {
      while (curY !== y2) {
        carveTile(curX, curY);
        curY += curY < y2 ? 1 : -1;
      }
      while (curX !== x2) {
        carveTile(curX, curY);
        curX += curX < x2 ? 1 : -1;
      }
    }
    carveTile(x2, y2);
  }

  // =========================================================================
  // TOPOLOGY 1: BSP LABYRINTH (Asymmetrical Recursive Partitioning)
  // =========================================================================
  private static generateBSPLabyrinth(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    interface Partition {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    const partitions: Partition[] = [{ x: 3, y: 3, w: width - 6, h: height - 6 }];
    const maxSplits = 14;

    for (let i = 0; i < maxSplits && partitions.length < 18; i++) {
      // Find largest partition
      partitions.sort((a, b) => b.w * b.h - a.w * a.h);
      const target = partitions[0];
      if (target.w < 18 && target.h < 18) break;

      const splitHoriz = target.w < target.h || (target.w === target.h && rng() > 0.5);

      if (splitHoriz && target.h >= 20) {
        const splitPos = Math.floor(target.h * (0.35 + rng() * 0.3));
        const p1: Partition = { x: target.x, y: target.y, w: target.w, h: splitPos };
        const p2: Partition = { x: target.x, y: target.y + splitPos, w: target.w, h: target.h - splitPos };
        partitions.splice(0, 1, p1, p2);
      } else if (!splitHoriz && target.w >= 20) {
        const splitPos = Math.floor(target.w * (0.35 + rng() * 0.3));
        const p1: Partition = { x: target.x, y: target.y, w: splitPos, h: target.h };
        const p2: Partition = { x: target.x + splitPos, y: target.y, w: target.w - splitPos, h: target.h };
        partitions.splice(0, 1, p1, p2);
      }
    }

    const rooms: Room[] = [];
    partitions.forEach((p, idx) => {
      const rw = Math.max(7, Math.min(p.w - 4, Math.floor(p.w * (0.65 + rng() * 0.25))));
      const rh = Math.max(7, Math.min(p.h - 4, Math.floor(p.h * (0.65 + rng() * 0.25))));
      const rx = p.x + 2 + Math.floor(rng() * Math.max(1, p.w - rw - 3));
      const ry = p.y + 2 + Math.floor(rng() * Math.max(1, p.h - rh - 3));

      const shape = this.pickRandomShape(rng, false);
      const room: Room = {
        id: idx,
        x: rx,
        y: ry,
        w: rw,
        h: rh,
        centerX: Math.floor(rx + rw / 2),
        centerY: Math.floor(ry + rh / 2),
        type: 'normal',
        shape
      };
      this.carveRoomShape(tiles, room, width, height, rng, biomeId);
      rooms.push(room);
    });

    // Connect rooms using Delaunay / MST style neighbor connections + loops
    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // TOPOLOGY 2: RADIAL CITADEL (Concentric Ring & Spoke Hubs)
  // =========================================================================
  private static generateRadialCitadel(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    const rooms: Room[] = [];
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // 1. Central Core Sanctum (Grand Arena)
    const coreW = 16 + Math.floor(rng() * 4);
    const coreH = 16 + Math.floor(rng() * 4);
    const coreRoom: Room = {
      id: 0,
      x: cx - Math.floor(coreW / 2),
      y: cy - Math.floor(coreH / 2),
      w: coreW,
      h: coreH,
      centerX: cx,
      centerY: cy,
      type: 'normal',
      shape: 'octagon'
    };
    this.carveRoomShape(tiles, coreRoom, width, height, rng, biomeId);
    rooms.push(coreRoom);

    // 2. Inner Ring (5-6 Rooms at radius ~18-22)
    const innerCount = 5 + Math.floor(rng() * 2);
    const innerRadius = 19 + Math.floor(rng() * 4);
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const rw = 8 + Math.floor(rng() * 5);
      const rh = 8 + Math.floor(rng() * 5);
      const rx = Math.floor(cx + Math.cos(angle) * innerRadius - rw / 2);
      const ry = Math.floor(cy + Math.sin(angle) * innerRadius - rh / 2);

      const room: Room = {
        id: rooms.length,
        x: Math.max(2, Math.min(width - rw - 3, rx)),
        y: Math.max(2, Math.min(height - rh - 3, ry)),
        w: rw,
        h: rh,
        centerX: rx + Math.floor(rw / 2),
        centerY: ry + Math.floor(rh / 2),
        type: 'normal',
        shape: this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, room, width, height, rng, biomeId);
      rooms.push(room);

      // Carve spoke corridor to central core
      this.carveCorridor(tiles, coreRoom.centerX, coreRoom.centerY, room.centerX, room.centerY, width, height, 3, rng);
    }

    // 3. Outer Ring (8-10 Perimeter Bastions at radius ~32-36)
    const outerCount = 8 + Math.floor(rng() * 3);
    const outerRadius = 33 + Math.floor(rng() * 4);
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const rw = 9 + Math.floor(rng() * 6);
      const rh = 9 + Math.floor(rng() * 6);
      const rx = Math.floor(cx + Math.cos(angle) * outerRadius - rw / 2);
      const ry = Math.floor(cy + Math.sin(angle) * outerRadius - rh / 2);

      const room: Room = {
        id: rooms.length,
        x: Math.max(2, Math.min(width - rw - 3, rx)),
        y: Math.max(2, Math.min(height - rh - 3, ry)),
        w: rw,
        h: rh,
        centerX: rx + Math.floor(rw / 2),
        centerY: ry + Math.floor(rh / 2),
        type: 'normal',
        shape: this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, room, width, height, rng, biomeId);
      rooms.push(room);
    }

    // Connect outer rooms to nearest inner rooms + circumferential ring paths
    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // TOPOLOGY 3: BRANCHING RIVER (Serpentine Main Artery & Delta Branches)
  // =========================================================================
  private static generateBranchingRiver(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    const rooms: Room[] = [];
    const mainWaypoints: { x: number; y: number }[] = [];

    // Serpentine spine points across map (Diagonal or S-curve)
    const steps = 7;
    const startSide = rng() > 0.5;
    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);
      const baseX = startSide ? 10 + t * (width - 20) : width - 10 - t * (width - 20);
      const baseY = 10 + t * (height - 20);
      const jitterX = (rng() - 0.5) * 14;
      const jitterY = (rng() - 0.5) * 14;
      mainWaypoints.push({
        x: Math.max(6, Math.min(width - 7, Math.floor(baseX + jitterX))),
        y: Math.max(6, Math.min(height - 7, Math.floor(baseY + jitterY)))
      });
    }

    // 1. Carve wide river channel along the spine
    for (let i = 0; i < mainWaypoints.length - 1; i++) {
      const p1 = mainWaypoints[i];
      const p2 = mainWaypoints[i + 1];
      this.carveCorridor(tiles, p1.x, p1.y, p2.x, p2.y, width, height, 3, rng);
    }

    // 2. Place Main River Plazas at Waypoints
    mainWaypoints.forEach((wp) => {
      const rw = 10 + Math.floor(rng() * 5);
      const rh = 10 + Math.floor(rng() * 5);
      const rx = Math.max(2, Math.min(width - rw - 3, wp.x - Math.floor(rw / 2)));
      const ry = Math.max(2, Math.min(height - rh - 3, wp.y - Math.floor(rh / 2)));

      const room: Room = {
        id: rooms.length,
        x: rx,
        y: ry,
        w: rw,
        h: rh,
        centerX: rx + Math.floor(rw / 2),
        centerY: ry + Math.floor(rh / 2),
        type: 'normal',
        shape: this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, room, width, height, rng, biomeId);
      rooms.push(room);
    });

    // 3. Sprout 8-12 Branching Offshoot Grottos & Delta Islands
    const branchCount = 9 + Math.floor(rng() * 4);
    for (let b = 0; b < branchCount; b++) {
      const parent = rooms[Math.floor(rng() * mainWaypoints.length)];
      const branchAngle = rng() * Math.PI * 2;
      const branchDist = 14 + Math.floor(rng() * 16);
      const targetX = Math.floor(parent.centerX + Math.cos(branchAngle) * branchDist);
      const targetY = Math.floor(parent.centerY + Math.sin(branchAngle) * branchDist);

      const rw = 8 + Math.floor(rng() * 6);
      const rh = 8 + Math.floor(rng() * 6);
      const rx = Math.max(2, Math.min(width - rw - 3, targetX - Math.floor(rw / 2)));
      const ry = Math.max(2, Math.min(height - rh - 3, targetY - Math.floor(rh / 2)));

      const branchRoom: Room = {
        id: rooms.length,
        x: rx,
        y: ry,
        w: rw,
        h: rh,
        centerX: rx + Math.floor(rw / 2),
        centerY: ry + Math.floor(rh / 2),
        type: 'normal',
        shape: this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, branchRoom, width, height, rng, biomeId);
      rooms.push(branchRoom);

      // Carve tributary corridor
      this.carveCorridor(tiles, parent.centerX, parent.centerY, branchRoom.centerX, branchRoom.centerY, width, height, 3, rng);
    }

    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // TOPOLOGY 4: MULTI-WING CITADEL (Star Fortress with 4 Distinct Bastions)
  // =========================================================================
  private static generateMultiWingFortress(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    const rooms: Room[] = [];
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);

    // 1. Central Agora
    const agoraW = 15;
    const agoraH = 15;
    const agora: Room = {
      id: 0,
      x: cx - Math.floor(agoraW / 2),
      y: cy - Math.floor(agoraH / 2),
      w: agoraW,
      h: agoraH,
      centerX: cx,
      centerY: cy,
      type: 'normal',
      shape: 'cross_plus'
    };
    this.carveRoomShape(tiles, agora, width, height, rng, biomeId);
    rooms.push(agora);

    // 2. Four Cardinal Bastions (North, East, South, West)
    const wings = [
      { name: 'North', dx: 0, dy: -28 },
      { name: 'South', dx: 0, dy: 28 },
      { name: 'East', dx: 28, dy: 0 },
      { name: 'West', dx: -28, dy: 0 }
    ];

    wings.forEach(w => {
      // Bastion Main Hall
      const bw = 12 + Math.floor(rng() * 4);
      const bh = 12 + Math.floor(rng() * 4);
      const bx = Math.max(3, Math.min(width - bw - 4, cx + w.dx - Math.floor(bw / 2)));
      const by = Math.max(3, Math.min(height - bh - 4, cy + w.dy - Math.floor(bh / 2)));

      const bastion: Room = {
        id: rooms.length,
        x: bx,
        y: by,
        w: bw,
        h: bh,
        centerX: bx + Math.floor(bw / 2),
        centerY: by + Math.floor(bh / 2),
        type: 'normal',
        shape: this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, bastion, width, height, rng, biomeId);
      rooms.push(bastion);

      // Wide avenue connecting to Central Agora
      this.carveCorridor(tiles, agora.centerX, agora.centerY, bastion.centerX, bastion.centerY, width, height, 3, rng);

      // 2-3 Sub-chambers flanking each bastion
      for (let s = 0; s < 2; s++) {
        const perpX = w.dy !== 0 ? (s === 0 ? -12 : 12) : 0;
        const perpY = w.dx !== 0 ? (s === 0 ? -12 : 12) : 0;
        const sw = 8 + Math.floor(rng() * 4);
        const sh = 8 + Math.floor(rng() * 4);
        const sx = Math.max(2, Math.min(width - sw - 3, bastion.centerX + perpX - Math.floor(sw / 2)));
        const sy = Math.max(2, Math.min(height - sh - 3, bastion.centerY + perpY - Math.floor(sh / 2)));

        const subRoom: Room = {
          id: rooms.length,
          x: sx,
          y: sy,
          w: sw,
          h: sh,
          centerX: sx + Math.floor(sw / 2),
          centerY: sy + Math.floor(sh / 2),
          type: 'normal',
          shape: this.pickRandomShape(rng, false)
        };
        this.carveRoomShape(tiles, subRoom, width, height, rng, biomeId);
        rooms.push(subRoom);
        this.carveCorridor(tiles, bastion.centerX, bastion.centerY, subRoom.centerX, subRoom.centerY, width, height, 3, rng);
      }
    });

    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // TOPOLOGY 5: ORGANIC CAVERNS (Wilderness Clearings & Meandering Tunnels)
  // =========================================================================
  private static generateOrganicCaverns(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    const rooms: Room[] = [];
    const numCaverns = 14 + Math.floor(rng() * 5);

    // Distribute organic clearing centers across a jittered grid
    const gridDim = 4;
    const cellW = Math.floor((width - 8) / gridDim);
    const cellH = Math.floor((height - 8) / gridDim);

    for (let r = 0; r < gridDim; r++) {
      for (let c = 0; c < gridDim; c++) {
        if (rooms.length >= numCaverns) break;
        if (rng() > 0.92) continue; // Randomly skip some grid cells for organic asymmetry

        const rw = 8 + Math.floor(rng() * 7);
        const rh = 8 + Math.floor(rng() * 7);
        const rx = 4 + c * cellW + Math.floor(rng() * Math.max(1, cellW - rw - 2));
        const ry = 4 + r * cellH + Math.floor(rng() * Math.max(1, cellH - rh - 2));

        const room: Room = {
          id: rooms.length,
          x: Math.max(2, Math.min(width - rw - 3, rx)),
          y: Math.max(2, Math.min(height - rh - 3, ry)),
          w: rw,
          h: rh,
          centerX: rx + Math.floor(rw / 2),
          centerY: ry + Math.floor(rh / 2),
          type: 'normal',
          shape: rng() > 0.35 ? 'organic_cave' : 'circle_ellipse'
        };
        this.carveRoomShape(tiles, room, width, height, rng, biomeId);
        rooms.push(room);
      }
    }

    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // TOPOLOGY 6: CHASM ARCHIPELAGO (Island Vaults & Bridge Networks)
  // =========================================================================
  private static generateChasmArchipelago(
    tiles: TileType[][],
    width: number,
    height: number,
    rng: () => number,
    biomeId: string
  ): Room[] {
    const rooms: Room[] = [];
    const numIslands = 12 + Math.floor(rng() * 4);

    // Place distinct landmass islands
    for (let i = 0; i < numIslands; i++) {
      const rw = 10 + Math.floor(rng() * 8);
      const rh = 10 + Math.floor(rng() * 8);
      const rx = 5 + Math.floor(rng() * (width - rw - 10));
      const ry = 5 + Math.floor(rng() * (height - rh - 10));

      const room: Room = {
        id: rooms.length,
        x: rx,
        y: ry,
        w: rw,
        h: rh,
        centerX: rx + Math.floor(rw / 2),
        centerY: ry + Math.floor(rh / 2),
        type: 'normal',
        shape: rng() > 0.4 ? 'island_moat' : this.pickRandomShape(rng, false)
      };
      this.carveRoomShape(tiles, room, width, height, rng, biomeId);
      rooms.push(room);
    }

    this.connectNeighborRooms(tiles, rooms, width, height, rng);
    return rooms;
  }

  // =========================================================================
  // GRAPH NEIGHBOR CONNECTIVITY & LOOP CARVER
  // =========================================================================
  private static connectNeighborRooms(
    tiles: TileType[][],
    rooms: Room[],
    width: number,
    height: number,
    rng: () => number
  ) {
    if (rooms.length <= 1) return;

    // Minimum Spanning Tree (Prim's Algorithm) to guarantee base tree connectivity
    const connected: boolean[] = Array(rooms.length).fill(false);
    connected[0] = true;
    let connectedCount = 1;

    while (connectedCount < rooms.length) {
      let bestDist = Infinity;
      let bestA = 0;
      let bestB = 0;

      for (let i = 0; i < rooms.length; i++) {
        if (!connected[i]) continue;
        for (let j = 0; j < rooms.length; j++) {
          if (connected[j]) continue;
          const dx = rooms[i].centerX - rooms[j].centerX;
          const dy = rooms[i].centerY - rooms[j].centerY;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestA = i;
            bestB = j;
          }
        }
      }

      connected[bestB] = true;
      connectedCount++;
      const rA = rooms[bestA];
      const rB = rooms[bestB];
      this.carveCorridor(tiles, rA.centerX, rA.centerY, rB.centerX, rB.centerY, width, height, 3, rng);
    }

    // Add 40% Extra Loop Corridors to eliminate tedious dead-ends and allow tactical flanking
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const dx = rooms[i].centerX - rooms[j].centerX;
        const dy = rooms[i].centerY - rooms[j].centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // If close neighbors, chance to add tactical loop bridge
        if (dist > 12 && dist < 32 && rng() < 0.35) {
          this.carveCorridor(tiles, rooms[i].centerX, rooms[i].centerY, rooms[j].centerX, rooms[j].centerY, width, height, 3, rng);
        }
      }
    }
  }

  // =========================================================================
  // FLOOD FILL CONNECTIVITY VALIDATOR
  // =========================================================================
  private static ensureCompleteConnectivity(
    tiles: TileType[][],
    width: number,
    height: number,
    rooms: Room[],
    rng: () => number
  ) {
    if (rooms.length === 0) return;

    const visited: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    const start = { x: rooms[0].centerX, y: rooms[0].centerY };

    // Queue BFS
    const queue: { x: number; y: number }[] = [start];
    visited[start.y][start.x] = true;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx >= 1 && nx < width - 1 && ny >= 1 && ny < height - 1) {
          if (!visited[ny][nx] && tiles[ny][nx] !== TileType.WALL) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    // Check if any room center is unvisited; if so, carve direct bridge to room 0
    rooms.forEach((r, idx) => {
      if (idx === 0) return;
      if (!visited[r.centerY][r.centerX]) {
        this.carveCorridor(tiles, rooms[0].centerX, rooms[0].centerY, r.centerX, r.centerY, width, height, 3, rng);
      }
    });
  }

  // =========================================================================
  // DYNAMIC SELECTION HELPERS (Spawn, Boss & Escape Points)
  // =========================================================================
  private static selectSpawnRoom(rooms: Room[], rng: () => number): number {
    // Collect rooms in the perimeter/corners or distinct dead-end branches
    const candidates = rooms.map((r, idx) => ({ idx, room: r }));
    // Shuffle and pick a random candidate room
    const shuffled = this.shuffle([...candidates], rng);
    return shuffled[0].idx;
  }

  private static selectBossRoom(rooms: Room[], spawnRoom: Room): number {
    let maxDist = -1;
    let bestIdx = 0;

    rooms.forEach((r, idx) => {
      const dx = r.centerX - spawnRoom.centerX;
      const dy = r.centerY - spawnRoom.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        maxDist = dist;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  private static selectEscapeRoom(
    rooms: Room[],
    spawnRoom: Room,
    bossRoom: Room,
    rng: () => number
  ): number {
    // Pick a room with high distance from the boss room, prioritizing different branches from spawn
    const scoredRooms = rooms
      .map((r, idx) => {
        if (idx === spawnRoom.id || idx === bossRoom.id) return null;
        const dxBoss = r.centerX - bossRoom.centerX;
        const dyBoss = r.centerY - bossRoom.centerY;
        const distBoss = Math.sqrt(dxBoss * dxBoss + dyBoss * dyBoss);

        const dxSpawn = r.centerX - spawnRoom.centerX;
        const dySpawn = r.centerY - spawnRoom.centerY;
        const distSpawn = Math.sqrt(dxSpawn * dxSpawn + dySpawn * dySpawn);

        // Good escape rooms have high distance from boss, and moderate-to-high distance from spawn
        const score = distBoss * 1.2 + distSpawn * 0.8 + (rng() - 0.5) * 12;
        return { idx, score, distBoss };
      })
      .filter((entry): entry is { idx: number; score: number; distBoss: number } => entry !== null && entry.distBoss >= 24);

    if (scoredRooms.length === 0) {
      // Fallback to spawn room if no distinct far rooms available
      return spawnRoom.id;
    }

    scoredRooms.sort((a, b) => b.score - a.score);
    // Pick from top 3 candidates for great variety
    const topPick = scoredRooms[Math.floor(rng() * Math.min(3, scoredRooms.length))];
    return topPick.idx;
  }

  // Safe floor tile finder inside a room
  private static findSafeFloorTileInRoom(
    tiles: TileType[][],
    room: Room,
    width: number,
    height: number,
    offset: number = 0
  ): { x: number; y: number } {
    if (
      room.centerY >= 1 && room.centerY < height - 1 &&
      room.centerX >= 1 && room.centerX < width - 1 &&
      tiles[room.centerY][room.centerX] === TileType.FLOOR
    ) {
      return { x: room.centerX, y: room.centerY };
    }

    // Search room bounds for valid floor tile
    for (let y = room.y + 1 + offset; y < room.y + room.h - 1 - offset; y++) {
      for (let x = room.x + 1 + offset; x < room.x + room.w - 1 - offset; x++) {
        if (x >= 1 && x < width - 1 && y >= 1 && y < height - 1 && tiles[y][x] === TileType.FLOOR) {
          return { x, y };
        }
      }
    }

    // Fallback: Force center tile to FLOOR
    const safeX = Math.max(1, Math.min(width - 2, room.centerX));
    const safeY = Math.max(1, Math.min(height - 2, room.centerY));
    tiles[safeY][safeX] = TileType.FLOOR;
    return { x: safeX, y: safeY };
  }

  // Deterministic array shuffle
  private static shuffle<T>(array: T[], rng: () => number): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
