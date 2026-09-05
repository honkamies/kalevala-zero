import { Router } from 'express';
import { db } from '../db';
import { authenticate, AuthRequest } from '../auth';

const router = Router();

// All character routes require authentication
router.use(authenticate);

// List all characters for current user
router.get('/', async (req: AuthRequest, res) => {
  try {
    const characters = await db.getCharactersByUserId(req.user!.id);
    return res.json({ characters });
  } catch (err: any) {
    console.error('[Get Characters Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Create a new character
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, archetype, appearance, stats, inventory, equipment } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Character name is required' });
    }

    if (name.length > 32) {
      return res.status(400).json({ error: 'Character name must be under 32 characters' });
    }

    // Default base stats if not provided
    const baseStats = stats || {
      vaki: 10,
      sisu: 10,
      nokkela: 10,
      tieto: 10,
      statPoints: 0
    };

    // Default starting appearance
    const charAppearance = appearance || {
      phenotype: 'cyber_runic',
      hairStyle: 'cyber_braids',
      hairColor: '#38bdf8',
      skinTone: '#94a3b8',
      warPaint: 'ukko_spark',
      implant: 'neural_loom'
    };

    // Archetype-based starting gear & inventory
    let initialInventory = inventory || [];
    let initialEquipment = equipment || {};

    if (!equipment) {
      if (archetype === 'runoseppä') {
        initialEquipment = {
          mainHand: {
            id: 'wpn_forge_hammer_1',
            name: 'Overclocked Forge Mallet',
            slot: 'mainHand',
            rarity: 'augmented',
            damage: 22,
            damageType: 'shock',
            affixes: ['Conductive Coil (+4 Shock Dmg)', 'Reinforced Grip (+2 Sisu)'],
            sockets: [{ type: 'shock', filled: true, bonus: '+15% Shock Proc' }, { type: 'empty' }],
            icon: 'hammer'
          },
          chest: {
            id: 'arm_smith_cuirass_1',
            name: 'Slag-Hardened Carapace',
            slot: 'chest',
            rarity: 'common',
            armor: 14,
            affixes: ['Heat Shield (+5 Fire Res)'],
            sockets: [],
            icon: 'shield'
          }
        };
      } else if (archetype === 'tietäjä') {
        initialEquipment = {
          mainHand: {
            id: 'wpn_runic_staff_1',
            name: 'Kantele Frequency Focus',
            slot: 'mainHand',
            rarity: 'augmented',
            damage: 18,
            damageType: 'void',
            affixes: ['Resonance Matrix (+15% Spell Dmg)', 'Ancient Echo (+3 Tieto)'],
            sockets: [{ type: 'void', filled: true, bonus: '+10% Void Siphon' }],
            icon: 'wand'
          },
          offHand: {
            id: 'wpn_focus_codex_1',
            name: 'Corrupted Runolaulu Codex',
            slot: 'offHand',
            rarity: 'common',
            armor: 6,
            energyMax: 25,
            affixes: ['Memory Bank (+2 Tieto)'],
            sockets: [],
            icon: 'book'
          }
        };
      } else if (archetype === 'korvenraivaaja') {
        initialEquipment = {
          mainHand: {
            id: 'wpn_railgun_1',
            name: 'Scrap-Coil Rail Rifle',
            slot: 'mainHand',
            rarity: 'augmented',
            damage: 26,
            damageType: 'plasma',
            affixes: ['Accelerated Bore (+15% Attack Spd)', 'Deadeye Lens (+5% Crit)'],
            sockets: [{ type: 'fire', filled: true, bonus: '+12% Burn Proc' }],
            icon: 'crosshair'
          },
          legs: {
            id: 'arm_ranger_greaves_1',
            name: 'Wasteland Stalker Treads',
            slot: 'legs',
            rarity: 'common',
            moveSpeed: 10,
            armor: 6,
            affixes: ['Light Carbon Weave (+2 Nokkela)'],
            sockets: [],
            icon: 'footprints'
          }
        };
      } else {
        // Soturi / Default
        initialEquipment = {
          mainHand: {
            id: 'wpn_plasma_blade_1',
            name: 'Väki-Infused Plasma Blade',
            slot: 'mainHand',
            rarity: 'augmented',
            damage: 24,
            damageType: 'plasma',
            affixes: ['Thermal Slicer (+10% Attack Spd)', 'Blood-Circuit (+3 Sisu)'],
            sockets: [{ type: 'fire', filled: true, bonus: '+10% Burn Proc' }],
            icon: 'sword'
          },
          chest: {
            id: 'arm_nanoweave_1',
            name: 'Reinforced Ballistic Tunic',
            slot: 'chest',
            rarity: 'common',
            armor: 12,
            affixes: ['Impact Dampener (+2 Sisu)'],
            sockets: [],
            icon: 'shield'
          }
        };
      }
    }

    if (initialInventory.length === 0) {
      initialInventory = [
        {
          id: 'pot_nano_repair_1',
          name: 'Nano-Repair Injector',
          type: 'consumable',
          rarity: 'common',
          quantity: 3,
          healAmount: 50,
          description: 'Nanites rapidly stitch flesh and cyber-implants, restoring 50 HP.',
          icon: 'activity'
        },
        {
          id: 'shard_frost_1',
          name: 'Pohjola Cryo-Shard',
          type: 'socket_gem',
          element: 'frost',
          rarity: 'augmented',
          bonus: '+15 Frost Dmg & 20% Chill Chance',
          description: 'Fractured shard from Pohjola deep freeze. Can be socketed into weapons.',
          icon: 'snowflake'
        }
      ];
    }

    const newChar = await db.createCharacter(
      req.user!.id,
      name.trim(),
      baseStats,
      { ...charAppearance, archetype: archetype || 'soturi' },
      initialInventory,
      initialEquipment
    );

    return res.status(201).json({ character: newChar });
  } catch (err: any) {
    console.error('[Create Character Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get character by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const char = await db.getCharacterById(req.params.id, req.user!.id);
    if (!char) {
      return res.status(404).json({ error: 'Character not found' });
    }
    return res.json({ character: char });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update character state (level, XP, stats, inventory, equipment)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { level, xp, stats, inventory, equipment } = req.body;
    const updated = await db.updateCharacter(req.params.id, req.user!.id, {
      level,
      xp,
      stats,
      inventory,
      equipment
    });

    if (!updated) {
      return res.status(404).json({ error: 'Character not found' });
    }
    return res.json({ character: updated });
  } catch (err: any) {
    console.error('[Update Character Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete character
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const success = await db.deleteCharacter(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Character not found' });
    }
    return res.json({ message: 'Character deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
