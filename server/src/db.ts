import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Fallback in-memory/JSON store when PostgreSQL is not configured/connected
interface MemoryStore {
  users: any[];
  characters: any[];
  worldMaps: any[];
}

const MEMORY_DB_FILE = path.join(__dirname, '../../data_fallback.json');

let pool: Pool | null = null;
let useFallback = false;
let memoryStore: MemoryStore = {
  users: [],
  characters: [],
  worldMaps: []
};

// Load memory store if exists
function loadFallback() {
  try {
    if (fs.existsSync(MEMORY_DB_FILE)) {
      const data = fs.readFileSync(MEMORY_DB_FILE, 'utf-8');
      memoryStore = JSON.parse(data);
    }
  } catch (err) {
    console.warn('[DB] Could not load fallback JSON, using fresh memory state:', err);
  }
}

function saveFallback() {
  try {
    const dir = path.dirname(MEMORY_DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMORY_DB_FILE, JSON.stringify(memoryStore, null, 2));
  } catch (err) {
    console.error('[DB] Failed to save fallback DB:', err);
  }
}

export async function initDB() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
      // Test connection
      const client = await pool.connect();
      console.log('[DB] Connected to PostgreSQL successfully.');
      
      // Run migrations
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(32) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS characters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(32) NOT NULL,
            level INT DEFAULT 1,
            xp BIGINT DEFAULT 0,
            stats JSONB NOT NULL DEFAULT '{"vaki": 10, "sisu": 10, "nokkela": 10, "tieto": 10}',
            appearance JSONB NOT NULL,
            inventory JSONB NOT NULL DEFAULT '[]',
            equipment JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS world_maps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
            sector_name VARCHAR(64) NOT NULL,
            seed BIGINT NOT NULL,
            cleared BOOLEAN DEFAULT FALSE,
            discovered_chests JSONB DEFAULT '[]',
            state_payload JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(character_id, sector_name)
        );
      `);
      client.release();
      console.log('[DB] PostgreSQL tables verified and migrated.');
      return;
    } catch (err) {
      console.warn('[DB] PostgreSQL connection failed. Falling back to local persisted store.', (err as Error).message);
      useFallback = true;
      loadFallback();
    }
  } else {
    console.log('[DB] No DATABASE_URL provided. Using local persisted store.');
    useFallback = true;
    loadFallback();
  }
}

export const db = {
  isPostgres: () => !useFallback && pool !== null,

  async query(text: string, params: any[] = []) {
    if (!useFallback && pool) {
      return pool.query(text, params);
    }
    throw new Error('Direct SQL query not available in fallback mode. Use helper methods.');
  },

  // Fallback / Hybrid helper methods
  async createUser(username: string, passwordHash: string) {
    if (!useFallback && pool) {
      const res = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
        [username, passwordHash]
      );
      return res.rows[0];
    }
    const existing = memoryStore.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      throw new Error('Username already exists');
    }
    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(newUser);
    saveFallback();
    return { id: newUser.id, username: newUser.username, created_at: newUser.created_at };
  },

  async findUserByUsername(username: string) {
    if (!useFallback && pool) {
      const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return res.rows[0] || null;
    }
    return memoryStore.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async findUserById(id: string) {
    if (!useFallback && pool) {
      const res = await pool.query('SELECT id, username, created_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const u = memoryStore.users.find(x => x.id === id);
    if (!u) return null;
    return { id: u.id, username: u.username, created_at: u.created_at };
  },

  async getCharactersByUserId(userId: string) {
    if (!useFallback && pool) {
      const res = await pool.query('SELECT * FROM characters WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
      return res.rows;
    }
    return memoryStore.characters.filter(c => c.user_id === userId);
  },

  async getCharacterById(id: string, userId: string) {
    if (!useFallback && pool) {
      const res = await pool.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.rows[0] || null;
    }
    return memoryStore.characters.find(c => c.id === id && c.user_id === userId) || null;
  },

  async createCharacter(userId: string, name: string, stats: any, appearance: any, inventory: any[], equipment: any) {
    if (!useFallback && pool) {
      const res = await pool.query(
        `INSERT INTO characters (user_id, name, stats, appearance, inventory, equipment) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, name, JSON.stringify(stats), JSON.stringify(appearance), JSON.stringify(inventory), JSON.stringify(equipment)]
      );
      return res.rows[0];
    }
    const newChar = {
      id: 'chr_' + Math.random().toString(36).substring(2, 11),
      user_id: userId,
      name,
      level: 1,
      xp: 0,
      stats,
      appearance,
      inventory,
      equipment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStore.characters.push(newChar);
    saveFallback();
    return newChar;
  },

  async updateCharacter(id: string, userId: string, data: { level?: number; xp?: number; stats?: any; inventory?: any[]; equipment?: any }) {
    if (!useFallback && pool) {
      const char = await this.getCharacterById(id, userId);
      if (!char) return null;

      const level = data.level !== undefined ? data.level : char.level;
      const xp = data.xp !== undefined ? data.xp : char.xp;
      const stats = data.stats !== undefined ? JSON.stringify(data.stats) : JSON.stringify(char.stats);
      const inventory = data.inventory !== undefined ? JSON.stringify(data.inventory) : JSON.stringify(char.inventory);
      const equipment = data.equipment !== undefined ? JSON.stringify(data.equipment) : JSON.stringify(char.equipment);

      const res = await pool.query(
        `UPDATE characters SET level = $1, xp = $2, stats = $3, inventory = $4, equipment = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7 RETURNING *`,
        [level, xp, stats, inventory, equipment, id, userId]
      );
      return res.rows[0];
    }

    const idx = memoryStore.characters.findIndex(c => c.id === id && c.user_id === userId);
    if (idx === -1) return null;

    const char = memoryStore.characters[idx];
    if (data.level !== undefined) char.level = data.level;
    if (data.xp !== undefined) char.xp = data.xp;
    if (data.stats !== undefined) char.stats = data.stats;
    if (data.inventory !== undefined) char.inventory = data.inventory;
    if (data.equipment !== undefined) char.equipment = data.equipment;
    char.updated_at = new Date().toISOString();

    saveFallback();
    return char;
  },

  async deleteCharacter(id: string, userId: string) {
    if (!useFallback && pool) {
      const res = await pool.query('DELETE FROM characters WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const idx = memoryStore.characters.findIndex(c => c.id === id && c.user_id === userId);
    if (idx === -1) return false;
    memoryStore.characters.splice(idx, 1);
    saveFallback();
    return true;
  },

  async getWorldMap(characterId: string, sectorName: string) {
    if (!useFallback && pool) {
      const res = await pool.query('SELECT * FROM world_maps WHERE character_id = $1 AND sector_name = $2', [characterId, sectorName]);
      return res.rows[0] || null;
    }
    return memoryStore.worldMaps.find(w => w.character_id === characterId && w.sector_name === sectorName) || null;
  },

  async saveWorldMap(characterId: string, sectorName: string, seed: number, cleared: boolean, discoveredChests: any[], statePayload: any) {
    if (!useFallback && pool) {
      const res = await pool.query(
        `INSERT INTO world_maps (character_id, sector_name, seed, cleared, discovered_chests, state_payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (character_id, sector_name) 
         DO UPDATE SET seed = EXCLUDED.seed, cleared = EXCLUDED.cleared, 
                       discovered_chests = EXCLUDED.discovered_chests, 
                       state_payload = EXCLUDED.state_payload, 
                       updated_at = NOW()
         RETURNING *`,
        [characterId, sectorName, seed, cleared, JSON.stringify(discoveredChests), JSON.stringify(statePayload)]
      );
      return res.rows[0];
    }

    let wm = memoryStore.worldMaps.find(w => w.character_id === characterId && w.sector_name === sectorName);
    if (!wm) {
      wm = {
        id: 'wm_' + Math.random().toString(36).substring(2, 11),
        character_id: characterId,
        sector_name: sectorName,
        seed,
        cleared,
        discovered_chests: discoveredChests,
        state_payload: statePayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memoryStore.worldMaps.push(wm);
    } else {
      wm.seed = seed;
      wm.cleared = cleared;
      wm.discovered_chests = discoveredChests;
      wm.state_payload = statePayload;
      wm.updated_at = new Date().toISOString();
    }
    saveFallback();
    return wm;
  }
};
