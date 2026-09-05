import { Router } from 'express';
import { db } from '../db';
import { authenticate, AuthRequest } from '../auth';
import { generateSeed, SECTOR_CONFIGS } from '../generator';

const router = Router();

router.use(authenticate);

// Get sector configurations
router.get('/sectors', (req, res) => {
  return res.json({ sectors: Object.values(SECTOR_CONFIGS) });
});

// Get sector map for a character (or initialize seed)
router.get('/:characterId/:sectorName', async (req: AuthRequest, res) => {
  try {
    const { characterId, sectorName } = req.params;
    
    // Verify character ownership
    const char = await db.getCharacterById(characterId, req.user!.id);
    if (!char) {
      return res.status(404).json({ error: 'Character not found' });
    }

    let worldMap = await db.getWorldMap(characterId, sectorName);
    if (!worldMap) {
      // Create initial world map record
      const seed = generateSeed(sectorName, characterId);
      worldMap = await db.saveWorldMap(characterId, sectorName, seed, false, [], {
        discoveredPuzzles: [],
        slainEnemiesCount: 0
      });
    }

    const config = SECTOR_CONFIGS[sectorName] || {
      name: sectorName,
      displayName: sectorName.toUpperCase(),
      theme: 'Unknown Sector',
      hazard: 'Unstable Atmospheric Interference',
      recommendedLevel: 1,
      bossName: 'Unknown Guardian',
      bossTitle: 'Corrupted Entity',
      ambientColor: '#ffffff'
    };

    return res.json({
      worldMap,
      sectorConfig: config
    });
  } catch (err: any) {
    console.error('[Get World Map Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Save or update sector map state
router.post('/:characterId/:sectorName', async (req: AuthRequest, res) => {
  try {
    const { characterId, sectorName } = req.params;
    const { seed, cleared, discoveredChests, statePayload } = req.body;

    const char = await db.getCharacterById(characterId, req.user!.id);
    if (!char) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const mapSeed = seed || generateSeed(sectorName, characterId);
    const updated = await db.saveWorldMap(
      characterId,
      sectorName,
      mapSeed,
      cleared ?? false,
      discoveredChests || [],
      statePayload || {}
    );

    return res.json({ worldMap: updated });
  } catch (err: any) {
    console.error('[Save World Map Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
