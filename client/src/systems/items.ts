// Procedural Itemization, Affixes, Sockets & Runic Shards (*Riimukivet*)

export type ItemRarity = 'common' | 'augmented' | 'runic' | 'masterwork' | 'relic';
export type ItemSlot = 'mainHand' | 'offHand' | 'head' | 'chest' | 'legs' | 'relic';
export type DamageType = 'physical' | 'plasma' | 'frost' | 'shock' | 'void' | 'fire';
export type WeaponCategory = 'heavy_hammer' | 'vibro_blade' | 'plasma_sword' | 'rail_rifle' | 'scatter_shot' | 'runic_harp';

export interface Socket {
  type: 'fire' | 'frost' | 'shock' | 'void' | 'empty';
  filled: boolean;
  bonus?: string;
  element?: string;
}

export interface Item {
  id: string;
  name: string;
  slot?: ItemSlot;
  type: 'weapon' | 'armor' | 'socket_gem' | 'consumable' | 'material';
  weaponCategory?: WeaponCategory;
  rarity: ItemRarity;
  level: number;
  icon: string;
  damage?: number;
  damageType?: DamageType;
  attackSpeed?: number;
  armor?: number;
  healthMax?: number;
  shieldMax?: number;
  energyMax?: number;
  moveSpeed?: number;
  critChance?: number;
  affixes: string[];
  sockets: Socket[];
  description: string;
  naniteValue: number;
  quantity?: number;
  healAmount?: number;
  element?: string;
  bonus?: string;
  // WEAPON UPGRADE & OVERCLOCK SCALING PROPERTIES:
  upgradeLevel?: number;       // Current upgrade rank (0 to 10)
  bonusProjectiles?: number;   // Extra bullets/volleys per shot (+1 to +5)
  spreadAngleBonus?: number;   // Additional spread cone angle in radians (spreads further)
  rangeMultiplier?: number;    // Projectile flight distance and speed multiplier
  shieldDamageBonus?: number;  // Multiplier vs shields and barriers (+40% to +250%)
  areaRadiusBonus?: number;    // AoE splash shockwave radius on impact in meters
}

export class ItemGenerator {
  private static prefixes = [
    { name: 'Overclocked', damageMult: 1.25, type: 'plasma', affix: '+25% Overclocked Damage' },
    { name: 'Cryo-Infused', damageMult: 1.15, type: 'frost', affix: '+15 Frost Dmg & 15% Chill' },
    { name: 'Void-Etched', damageMult: 1.2, type: 'void', affix: '+20 Void Siphon' },
    { name: 'Tesla-Coiled', damageMult: 1.2, type: 'shock', affix: '+20 Shock Chain Dmg' },
    { name: 'Slag-Hardened', armorAdd: 8, affix: '+8 Armor & Fire Resist' },
    { name: 'Nanoweave', shieldAdd: 25, affix: '+25 Shield Capacity' },
    { name: 'Bionic', healthAdd: 30, affix: '+30 Max Vitality' },
    { name: 'Sonic-Harmonic', damageMult: 1.2, type: 'plasma', affix: '+20 Acoustic Resonator Burst' },
    { name: 'Hyper-Kinetic', critAdd: 10, affix: '+10% Critical Kinetic Velocity' },
    { name: 'Magma-Tempered', armorAdd: 12, affix: '+12 Armor & Lava Insulation' },
    { name: 'Astral-Polished', shieldAdd: 35, affix: '+35 Kirjokansi Shield Aegis' }
  ];

  private static suffixes = [
    { name: 'of Sisu', healthAdd: 25, affix: '+3 Sisu (Endurance & Vitality)' },
    { name: 'of Väki', damageMult: 1.18, affix: '+3 Väki (Runic Will & Plasma Amp)' },
    { name: 'of Nokkela', speedAdd: 12, affix: '+3 Nokkela (Agility & Cooldown)' },
    { name: 'of Tieto', cooldownAdd: 14, affix: '+3 Tieto (Processing Speed & CDR)' },
    { name: 'of the Forge', critAdd: 9, affix: '+9% Critical Strike Chance' },
    { name: 'of Tuonela', affix: '+12% Lifesteal vs Radiated Foes' },
    { name: 'of Pohjola', affix: '+15% Chill Duration & Frostbite' },
    { name: 'of Ilmarinen', affix: '+30% Nanite Scrap Gain from Salvage' },
    { name: 'of Ukko', affix: '+25% Tesla Chain Arc Range' }
  ];

  private static baseWeapons = [
    // Plasma Blades & Swords
    { baseName: 'Väki Plasma Slicer', slot: 'mainHand' as ItemSlot, baseDmg: 18, type: 'plasma' as DamageType, icon: 'plasma_sword', weaponCategory: 'plasma_sword' as WeaponCategory },
    { baseName: 'Ukko Thunder-Katana', slot: 'mainHand' as ItemSlot, baseDmg: 20, type: 'shock' as DamageType, icon: 'thunder_blade', weaponCategory: 'plasma_sword' as WeaponCategory },
    { baseName: 'Hiisi Vibro-Dagger', slot: 'mainHand' as ItemSlot, baseDmg: 15, type: 'physical' as DamageType, icon: 'vibro_dagger', weaponCategory: 'vibro_blade' as WeaponCategory },
    { baseName: 'Louhi Frost-Fang Saber', slot: 'mainHand' as ItemSlot, baseDmg: 19, type: 'frost' as DamageType, icon: 'frost_saber', weaponCategory: 'plasma_sword' as WeaponCategory },
    { baseName: 'Tuoni Soul-Cleaver Scythe', slot: 'mainHand' as ItemSlot, baseDmg: 23, type: 'void' as DamageType, icon: 'void_scythe', weaponCategory: 'plasma_sword' as WeaponCategory },

    // Hammers & Kinetic Breakers
    { baseName: 'Slag War-Hammer', slot: 'mainHand' as ItemSlot, baseDmg: 26, type: 'fire' as DamageType, icon: 'slag_hammer', weaponCategory: 'heavy_hammer' as WeaponCategory },
    { baseName: 'Ilmarinen Runic Sledge', slot: 'mainHand' as ItemSlot, baseDmg: 28, type: 'fire' as DamageType, icon: 'runic_sledge', weaponCategory: 'heavy_hammer' as WeaponCategory },
    { baseName: 'Meteorite Kinetic Breaker', slot: 'mainHand' as ItemSlot, baseDmg: 24, type: 'physical' as DamageType, icon: 'kinetic_breaker', weaponCategory: 'heavy_hammer' as WeaponCategory },

    // Firearms & Rail-Guns
    { baseName: 'Scrap Rail-Rifle', slot: 'mainHand' as ItemSlot, baseDmg: 22, type: 'plasma' as DamageType, icon: 'rail_rifle', weaponCategory: 'rail_rifle' as WeaponCategory },
    { baseName: 'Pohjola Cryo-Cannon', slot: 'mainHand' as ItemSlot, baseDmg: 21, type: 'frost' as DamageType, icon: 'cryo_cannon', weaponCategory: 'scatter_shot' as WeaponCategory },
    { baseName: 'Väinö Sonic Pulse-Blaster', slot: 'mainHand' as ItemSlot, baseDmg: 20, type: 'plasma' as DamageType, icon: 'sonic_blaster', weaponCategory: 'rail_rifle' as WeaponCategory },
    { baseName: 'Tuonela Void-Mortar', slot: 'mainHand' as ItemSlot, baseDmg: 27, type: 'void' as DamageType, icon: 'void_mortar', weaponCategory: 'scatter_shot' as WeaponCategory },

    // Staves & Lyric Resonators
    { baseName: 'Runic Arc Scepter', slot: 'mainHand' as ItemSlot, baseDmg: 17, type: 'shock' as DamageType, icon: 'arc_scepter', weaponCategory: 'runic_harp' as WeaponCategory },
    { baseName: 'Virsikannel Lyric Harp', slot: 'mainHand' as ItemSlot, baseDmg: 19, type: 'plasma' as DamageType, icon: 'kantele_resonator', weaponCategory: 'runic_harp' as WeaponCategory },
    { baseName: 'Alinen Magma Staff', slot: 'mainHand' as ItemSlot, baseDmg: 22, type: 'fire' as DamageType, icon: 'magma_staff', weaponCategory: 'runic_harp' as WeaponCategory },
    { baseName: 'Celestial Star-Spire', slot: 'mainHand' as ItemSlot, baseDmg: 24, type: 'void' as DamageType, icon: 'star_spire', weaponCategory: 'runic_harp' as WeaponCategory },

    // Axes & Halberds
    { baseName: 'Ukonkirves Plasma Axe', slot: 'mainHand' as ItemSlot, baseDmg: 25, type: 'shock' as DamageType, icon: 'plasma_axe', weaponCategory: 'heavy_hammer' as WeaponCategory },
    { baseName: 'Kanteletar Runic Halberd', slot: 'mainHand' as ItemSlot, baseDmg: 23, type: 'physical' as DamageType, icon: 'runic_halberd', weaponCategory: 'plasma_sword' as WeaponCategory }
  ];

  private static baseArmors = [
    // Headgear
    { baseName: 'Cyber-Kypärä Visor', slot: 'head' as ItemSlot, baseArmor: 6, icon: 'cyber_visor' },
    { baseName: "Ilmarinen's Smelt-Helm", slot: 'head' as ItemSlot, baseArmor: 9, icon: 'smelt_helm' },
    { baseName: 'Tietäjä Neural Crown', slot: 'head' as ItemSlot, baseArmor: 5, icon: 'neural_crown' },
    { baseName: 'Stalker Optical Hood', slot: 'head' as ItemSlot, baseArmor: 6, icon: 'stalker_hood' },
    { baseName: 'Tuonela Death-Mask', slot: 'head' as ItemSlot, baseArmor: 7, icon: 'death_mask' },
    { baseName: 'Sampo Sensor Array', slot: 'head' as ItemSlot, baseArmor: 8, icon: 'sensor_array' },

    // Chest Armors
    { baseName: 'Nanoweave Ballistic Carapace', slot: 'chest' as ItemSlot, baseArmor: 14, icon: 'ballistic_carapace' },
    { baseName: 'Väki Power Exoskeleton', slot: 'chest' as ItemSlot, baseArmor: 16, icon: 'power_exoskeleton' },
    { baseName: 'Kantele Resonator Trench-Coat', slot: 'chest' as ItemSlot, baseArmor: 11, icon: 'lyric_coat' },
    { baseName: 'Pohjola Frost Cuirass', slot: 'chest' as ItemSlot, baseArmor: 13, icon: 'frost_cuirass' },
    { baseName: 'Alinen Volcanic Plate', slot: 'chest' as ItemSlot, baseArmor: 15, icon: 'volcanic_plate' },
    { baseName: 'Astral Kirjokansi Mantle', slot: 'chest' as ItemSlot, baseArmor: 18, icon: 'kirjokansi_mantle' },

    // Boots & Greaves
    { baseName: 'Hydraulic Stalker Greaves', slot: 'legs' as ItemSlot, baseArmor: 8, icon: 'stalker_greaves' },
    { baseName: 'Mag-Lev Kinetic Treads', slot: 'legs' as ItemSlot, baseArmor: 7, icon: 'maglev_treads' },
    { baseName: 'Slag-Forged Iron Boots', slot: 'legs' as ItemSlot, baseArmor: 11, icon: 'iron_boots' },
    { baseName: 'Väki Warp Strats', slot: 'legs' as ItemSlot, baseArmor: 6, icon: 'warp_strats' },
    { baseName: 'Tuonela Ghost Walkers', slot: 'legs' as ItemSlot, baseArmor: 8, icon: 'ghost_walkers' },

    // Off-Hands & Shields
    { baseName: 'Frequency Deflector Aegis', slot: 'offHand' as ItemSlot, baseArmor: 10, icon: 'deflector_aegis' },
    { baseName: 'Runic Buckler of Ukko', slot: 'offHand' as ItemSlot, baseArmor: 12, icon: 'shock_buckler' },
    { baseName: 'Harmonic Nanite Dynamo', slot: 'offHand' as ItemSlot, baseArmor: 7, icon: 'nanite_dynamo' },
    { baseName: 'Tuonela Bone Totem', slot: 'offHand' as ItemSlot, baseArmor: 8, icon: 'bone_totem' },
    { baseName: 'Syntysanat Lyric Chime Module', slot: 'offHand' as ItemSlot, baseArmor: 9, icon: 'lyric_chime' },
    { baseName: 'Scrap Plasma Emitter', slot: 'offHand' as ItemSlot, baseArmor: 8, icon: 'plasma_emitter' },

    // Relics & Talismans
    { baseName: 'Sampo Shard Matrix', slot: 'relic' as ItemSlot, baseArmor: 5, icon: 'sampo_matrix' },
    { baseName: 'Heart of Louhi', slot: 'relic' as ItemSlot, baseArmor: 6, icon: 'heart_of_louhi' },
    { baseName: "Väinämöinen's Primordial Spark", slot: 'relic' as ItemSlot, baseArmor: 4, icon: 'primordial_spark' },
    { baseName: 'Kantele Singularity Core', slot: 'relic' as ItemSlot, baseArmor: 5, icon: 'kantele_core' },
    { baseName: 'Tuoni Eye of Void', slot: 'relic' as ItemSlot, baseArmor: 6, icon: 'eye_of_void' },
    { baseName: 'Cybernetic Karhu Totem', slot: 'relic' as ItemSlot, baseArmor: 7, icon: 'karhu_totem' },
    { baseName: 'Otava Celestial Compass', slot: 'relic' as ItemSlot, baseArmor: 4, icon: 'celestial_compass' },
    { baseName: 'Iku-Turso Abyssal Pearl', slot: 'relic' as ItemSlot, baseArmor: 6, icon: 'abyssal_pearl' }
  ];

  static generateRandomLoot(itemLevel: number = 1, forceRarity?: ItemRarity): Item {
    // Determine Rarity
    let rarity: ItemRarity = forceRarity || 'common';
    if (!forceRarity) {
      const roll = Math.random();
      if (roll > 0.95) rarity = 'relic';
      else if (roll > 0.85) rarity = 'masterwork';
      else if (roll > 0.65) rarity = 'runic';
      else if (roll > 0.35) rarity = 'augmented';
      else rarity = 'common';
    }

    // 60% gear, 20% socket gem, 20% consumable
    const categoryRoll = Math.random();

    if (categoryRoll < 0.2) {
      // Consumables
      const consumables = [
        {
          name: 'Hyper-Nanite Repair Injector',
          heal: 65 + itemLevel * 12,
          icon: 'potion_heal',
          desc: 'Advanced bio-nanites that rapidly regenerate operative vital HP.'
        },
        {
          name: 'Väki Overclock Stimulant',
          heal: 45 + itemLevel * 8,
          icon: 'potion_overclock',
          desc: 'Surges neuro-connectors to overcharge weapons and abilities.'
        },
        {
          name: 'Cryo-Coolant Flask',
          heal: 50 + itemLevel * 10,
          icon: 'potion_coolant',
          desc: 'Absorbs thermal friction to regenerate 80+ nanite shield capacity.'
        },
        {
          name: 'Sampo Scrap Flux Elixir',
          heal: 30 + itemLevel * 5,
          icon: 'potion_scrap',
          desc: 'Infuses operative magnetics, increasing Scrap drop harvest.'
        },
        {
          name: 'Syntysanat Lyric Tonic',
          heal: 55 + itemLevel * 9,
          icon: 'potion_lyric',
          desc: 'Harmonizes runic acoustic matrices to reduce ability cooldowns.'
        }
      ];
      const pot = consumables[Math.floor(Math.random() * consumables.length)];

      return {
        id: 'pot_' + Math.random().toString(36).substring(2, 9),
        name: pot.name,
        type: 'consumable',
        rarity: rarity === 'common' ? 'augmented' : rarity,
        level: itemLevel,
        quantity: 1,
        healAmount: pot.heal,
        affixes: [],
        sockets: [],
        icon: pot.icon,
        naniteValue: 20 * itemLevel,
        description: pot.desc
      };
    }

    if (categoryRoll < 0.35) {
      // Socket Gem (Riimukivi)
      const elements: ('frost' | 'fire' | 'shock' | 'void')[] = ['frost', 'fire', 'shock', 'void'];
      const elem = elements[Math.floor(Math.random() * elements.length)];
      const names = {
        frost: 'Pohjola Cryo-Shard',
        fire: "Ilmarinen's Slag-Core",
        shock: "Ukko's Spark Shard",
        void: 'Tuoni Void Resonance Gem'
      };
      const bonuses = {
        frost: '+18 Frost Damage & 20% Chill',
        fire: '+22 Corrupted Burn Proc',
        shock: '+20 Tesla Lightning Arc',
        void: '+15 Void Siphon on Hit'
      };

      return {
        id: 'gem_' + Math.random().toString(36).substring(2, 9),
        name: names[elem],
        type: 'socket_gem',
        rarity: rarity === 'common' ? 'augmented' : rarity,
        level: itemLevel,
        element: elem,
        bonus: bonuses[elem],
        affixes: [bonuses[elem]],
        sockets: [],
        icon: 'gem',
        naniteValue: 35 * itemLevel,
        description: 'A socketable Runic Shard (*Riimukivi*). Infuse into an open socket at the Forge.'
      };
    }

    // Generate Gear (Weapon or Armor)
    const isWeapon = Math.random() > 0.5;
    const affixes: string[] = [];
    let name = '';
    const sockets: Socket[] = [];

    // Socket generation based on rarity
    const maxSockets = rarity === 'relic' ? 3 : rarity === 'masterwork' ? 2 : rarity === 'runic' ? 1 : 0;
    for (let s = 0; s < maxSockets; s++) {
      sockets.push({ type: 'empty', filled: false });
    }

    if (isWeapon) {
      const base = this.baseWeapons[Math.floor(Math.random() * this.baseWeapons.length)];
      let damage = Math.round((base.baseDmg + itemLevel * 3.5) * (rarity === 'relic' ? 1.5 : rarity === 'masterwork' ? 1.3 : 1.0));
      let damageType = base.type;

      let prefixName = '';
      let suffixName = '';

      if (rarity !== 'common') {
        const p = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        prefixName = p.name + ' ';
        affixes.push(p.affix);
        if (p.type) damageType = p.type as DamageType;
      }

      if (rarity === 'masterwork' || rarity === 'relic' || rarity === 'runic') {
        const s = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
        suffixName = ' ' + s.name;
        affixes.push(s.affix);
      }

      name = `${prefixName}${base.baseName}${suffixName}`;

      return {
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        name,
        slot: base.slot,
        type: 'weapon',
        weaponCategory: base.weaponCategory,
        rarity,
        level: itemLevel,
        damage,
        damageType,
        critChance: 5 + (rarity === 'relic' ? 10 : 0),
        affixes,
        sockets,
        icon: base.icon,
        naniteValue: 50 * itemLevel * (rarity === 'relic' ? 4 : 2),
        description: `High-grade ${rarity} armament engineered for cosmic wasteland combat.`
      };
    } else {
      const base = this.baseArmors[Math.floor(Math.random() * this.baseArmors.length)];
      let armor = Math.round((base.baseArmor + itemLevel * 2) * (rarity === 'relic' ? 1.5 : rarity === 'masterwork' ? 1.3 : 1.0));
      let healthMax = rarity !== 'common' ? itemLevel * 15 : 0;
      let shieldMax = rarity !== 'common' ? itemLevel * 12 : 0;

      let prefixName = '';
      let suffixName = '';

      if (rarity !== 'common') {
        const p = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        prefixName = p.name + ' ';
        affixes.push(p.affix);
      }

      if (rarity === 'masterwork' || rarity === 'relic' || rarity === 'runic') {
        const s = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
        suffixName = ' ' + s.name;
        affixes.push(s.affix);
      }

      name = `${prefixName}${base.baseName}${suffixName}`;

      return {
        id: 'item_' + Math.random().toString(36).substring(2, 9),
        name,
        slot: base.slot,
        type: 'armor',
        rarity,
        level: itemLevel,
        armor,
        healthMax,
        shieldMax,
        affixes,
        sockets,
        icon: base.icon,
        naniteValue: 40 * itemLevel * (rarity === 'relic' ? 4 : 2),
        description: `Protective ${rarity} cybernetic apparel offering tactical mitigation.`
      };
    }
  }
}

export function getWeaponCategory(item?: Item | null): WeaponCategory {
  if (!item) return 'plasma_sword';
  if (item.weaponCategory) return item.weaponCategory;
  const n = ((item.name || '') + ' ' + (item.icon || '')).toLowerCase();
  if (n.includes('hammer') || n.includes('sledge') || n.includes('breaker') || n.includes('axe')) return 'heavy_hammer';
  if (n.includes('dagger') || n.includes('vibro')) return 'vibro_blade';
  if (n.includes('cannon') || n.includes('mortar') || n.includes('scatter') || n.includes('shotgun')) return 'scatter_shot';
  if (n.includes('rifle') || n.includes('blaster') || n.includes('rail')) return 'rail_rifle';
  if (n.includes('harp') || n.includes('scepter') || n.includes('staff') || n.includes('spire') || n.includes('kantele')) return 'runic_harp';
  return 'plasma_sword';
}

export function getWeaponCategoryMeta(category: WeaponCategory): {
  badge: string;
  name: string;
  description: string;
  isCloseQuarters: boolean;
} {
  switch (category) {
    case 'heavy_hammer':
      return {
        badge: '🔨 HEAVY HAMMER',
        name: 'Heavy Hammer & Breaker',
        description: 'Colossal 360° seismic ground quake. Devastating close-up impact (+proximity multiplier).',
        isCloseQuarters: true
      };
    case 'vibro_blade':
      return {
        badge: '🗡️ VIBRO-BLADE',
        name: 'Vibro-Blade & Dagger',
        description: 'Ultra-fast flurry slices with heightened critical strike velocity.',
        isCloseQuarters: true
      };
    case 'plasma_sword':
      return {
        badge: '⚡ PLASMA SWORD',
        name: 'Plasma Blade & Halberd',
        description: 'Sweeping energy blade arc launching piercing kinetic crescent waves.',
        isCloseQuarters: true
      };
    case 'rail_rifle':
      return {
        badge: '🎯 RAIL-RIFLE',
        name: 'Scrap Rail-Rifle',
        description: 'Hyper-velocity linear armor-piercing slug across extreme range.',
        isCloseQuarters: false
      };
    case 'scatter_shot':
      return {
        badge: '💥 SCATTER-CANNON',
        name: 'Scatter-Cannon / Shotgun',
        description: '5-pellet shotgun fan. Moderate range spread, lethal catastrophic point-blank burst.',
        isCloseQuarters: true
      };
    case 'runic_harp':
      return {
        badge: '🎵 LYRIC RESONATOR',
        name: 'Runic Harp & Staves',
        description: 'Harmonic singing verse runes radiating outward with homing/piercing frequencies.',
        isCloseQuarters: false
      };
    default:
      return {
        badge: '⚔️ WEAPON',
        name: 'Standard Armament',
        description: 'Standard combat gear.',
        isCloseQuarters: false
      };
  }
}

// ============================================================================
// ARCHETYPE SIGNATURE STARTER WEAPONS
// ============================================================================
export function getStarterWeaponForArchetype(archetype: string): Item {
  switch (archetype) {
    case 'soturi':
      return {
        id: 'starter_soturi_hammer',
        name: 'Slag War-Hammer',
        slot: 'mainHand',
        type: 'weapon',
        weaponCategory: 'heavy_hammer',
        rarity: 'common',
        level: 1,
        damage: 28,
        damageType: 'fire',
        critChance: 8,
        upgradeLevel: 0,
        bonusProjectiles: 0,
        spreadAngleBonus: 0,
        rangeMultiplier: 1.0,
        shieldDamageBonus: 0.40, // High barrier pulverization
        areaRadiusBonus: 1.2,
        affixes: ['+8 Armor & Fire Resist', '+40% Barrier Pulverization Impact'],
        sockets: [{ type: 'empty', filled: false }],
        icon: 'slag_hammer',
        naniteValue: 40,
        description: 'A heavy forged slag sledge. Unstoppable close-quarters seismic quake impact that pulverizes armor and barriers.'
      };
    case 'korvenraivaaja':
      return {
        id: 'starter_korpi_rifle',
        name: 'Scrap Rail-Rifle',
        slot: 'mainHand',
        type: 'weapon',
        weaponCategory: 'rail_rifle',
        rarity: 'common',
        level: 1,
        damage: 24,
        damageType: 'plasma',
        critChance: 14,
        upgradeLevel: 0,
        bonusProjectiles: 0,
        spreadAngleBonus: 0,
        rangeMultiplier: 1.20, // Naturally extreme range & velocity
        shieldDamageBonus: 0.20,
        areaRadiusBonus: 0.3,
        affixes: ['+14% Critical Kinetic Velocity', '+20% Extended Range & Piercing'],
        sockets: [{ type: 'empty', filled: false }],
        icon: 'rail_rifle',
        naniteValue: 40,
        description: 'Precision magnetic rail rifle capable of extreme-range sniping, high-velocity armor penetration, and rapid criticals.'
      };
    case 'tietäjä':
      return {
        id: 'starter_tietaja_staff',
        name: 'Alinen Magma Staff',
        slot: 'mainHand',
        type: 'weapon',
        weaponCategory: 'runic_harp',
        rarity: 'common',
        level: 1,
        damage: 23,
        damageType: 'fire',
        critChance: 10,
        upgradeLevel: 0,
        bonusProjectiles: 0,
        spreadAngleBonus: 0,
        rangeMultiplier: 1.05,
        shieldDamageBonus: 0.30,
        areaRadiusBonus: 1.0,
        affixes: ['+25 Void Siphon on Hit', '+30% Barrier Shredding & Area Burn'],
        sockets: [{ type: 'empty', filled: false }],
        icon: 'magma_staff',
        naniteValue: 40,
        description: 'Resonant runic focus that channels searing magma pulses, exploding into energy rings and siphoning life frequencies.'
      };
    case 'runoseppä':
    default:
      return {
        id: 'starter_runo_slicer',
        name: 'Virsikannel Lyric Resonator',
        slot: 'mainHand',
        type: 'weapon',
        weaponCategory: 'runic_harp',
        rarity: 'common',
        level: 1,
        damage: 21,
        damageType: 'plasma',
        critChance: 9,
        upgradeLevel: 0,
        bonusProjectiles: 0,
        spreadAngleBonus: 0.14,
        rangeMultiplier: 1.08,
        shieldDamageBonus: 0.35,
        areaRadiusBonus: 0.8,
        affixes: ['+30 Nanite Shield Matrix', 'Harmonic Acoustic Resonance (Area Shred)'],
        sockets: [{ type: 'empty', filled: false }],
        icon: 'kantele_resonator',
        naniteValue: 40,
        description: 'Poetry-forged acoustic kantele that projects singing harmonic lyric rune chords, rippling through enemy defenses.'
      };
  }
}

// ============================================================================
// WEAPON UPGRADE & OVERCLOCK PROGRESSION SYSTEM
// ============================================================================
export const MAX_WEAPON_UPGRADE_LEVEL = 10;

export function getWeaponUpgradeCost(currentUpgradeLevel: number = 0): number {
  const costs = [45, 75, 110, 155, 210, 280, 365, 465, 580, 720];
  const idx = Math.min(costs.length - 1, Math.max(0, currentUpgradeLevel));
  return costs[idx];
}

export interface WeaponUpgradePreview {
  currentLevel: number;
  nextLevel: number;
  isMaxLevel: boolean;
  cost: number;
  canAfford: boolean;
  damageCurrent: number;
  damageNext: number;
  bulletsCurrent: number;
  bulletsNext: number;
  spreadArcDegCurrent: number;
  spreadArcDegNext: number;
  rangeMultPctCurrent: number;
  rangeMultPctNext: number;
  shieldBonusPctCurrent: number;
  shieldBonusPctNext: number;
  areaRadiusMCurrent: number;
  areaRadiusMNext: number;
}

export function getWeaponUpgradePreview(item: Item, playerScrap: number): WeaponUpgradePreview {
  const currentLevel = item.upgradeLevel || 0;
  const isMaxLevel = currentLevel >= MAX_WEAPON_UPGRADE_LEVEL;
  const nextLevel = Math.min(MAX_WEAPON_UPGRADE_LEVEL, currentLevel + 1);
  const cost = isMaxLevel ? 0 : getWeaponUpgradeCost(currentLevel);
  const canAfford = playerScrap >= cost && !isMaxLevel;

  const damageCurrent = item.damage || 20;
  const damageNext = isMaxLevel ? damageCurrent : Math.round(damageCurrent * 1.22);

  const isScatter = item.weaponCategory === 'scatter_shot';
  const baseBullets = isScatter ? 5 : 1;
  const bulletsCurrent = baseBullets + (item.bonusProjectiles || Math.floor(currentLevel / 2) * (isScatter ? 2 : 1));
  const bulletsNext = isMaxLevel
    ? bulletsCurrent
    : baseBullets + (Math.floor(nextLevel / 2) * (isScatter ? 2 : 1));

  const spreadArcDegCurrent = Math.round(((item.spreadAngleBonus || (currentLevel * 0.06)) * 180) / Math.PI);
  const spreadArcDegNext = isMaxLevel
    ? spreadArcDegCurrent
    : Math.round(((item.spreadAngleBonus || 0) + 0.08) * 180 / Math.PI);

  const rangeMultPctCurrent = Math.round(((item.rangeMultiplier || (1.0 + currentLevel * 0.12)) - 1.0) * 100);
  const rangeMultPctNext = isMaxLevel
    ? rangeMultPctCurrent
    : Math.round(((item.rangeMultiplier || 1.0) + 0.14 - 1.0) * 100);

  const shieldBonusPctCurrent = Math.round((item.shieldDamageBonus || (currentLevel * 0.30)) * 100);
  const shieldBonusPctNext = isMaxLevel
    ? shieldBonusPctCurrent
    : Math.round(((item.shieldDamageBonus || 0) + 0.35) * 100);

  const areaRadiusMCurrent = Number(((item.areaRadiusBonus || (currentLevel > 0 ? 0.8 + currentLevel * 0.35 : 0))).toFixed(1));
  const areaRadiusMNext = isMaxLevel
    ? areaRadiusMCurrent
    : Number(((item.areaRadiusBonus || 0.6) + 0.35).toFixed(1));

  return {
    currentLevel,
    nextLevel,
    isMaxLevel,
    cost,
    canAfford,
    damageCurrent,
    damageNext,
    bulletsCurrent,
    bulletsNext,
    spreadArcDegCurrent,
    spreadArcDegNext,
    rangeMultPctCurrent,
    rangeMultPctNext,
    shieldBonusPctCurrent,
    shieldBonusPctNext,
    areaRadiusMCurrent,
    areaRadiusMNext
  };
}

export function upgradeWeapon(item: Item, playerScrap: number): { success: boolean; newScrap: number; error?: string } {
  if (item.type !== 'weapon') {
    return { success: false, newScrap: playerScrap, error: 'Only weapons can be enhanced in the Overclock Anvil.' };
  }

  const currentLevel = item.upgradeLevel || 0;
  if (currentLevel >= MAX_WEAPON_UPGRADE_LEVEL) {
    return { success: false, newScrap: playerScrap, error: 'Weapon is already at maximum overclock (+10).' };
  }

  const cost = getWeaponUpgradeCost(currentLevel);
  if (playerScrap < cost) {
    return { success: false, newScrap: playerScrap, error: `Insufficient Nanite Scrap. Requires ${cost} Scrap.` };
  }

  const nextLevel = currentLevel + 1;
  const isScatter = item.weaponCategory === 'scatter_shot';

  // 1. Upgrade Level
  item.upgradeLevel = nextLevel;
  item.level = (item.level || 1) + 1;

  // 2. Damage Scaling (+22% per rank)
  item.damage = Math.round((item.damage || 20) * 1.22);

  // 3. Bullets / Volleys (+1 projectile at milestones, +2 for scatter-cannons)
  const addBullet = nextLevel % 2 === 0 || nextLevel === 10;
  item.bonusProjectiles = (item.bonusProjectiles || 0) + (addBullet ? (isScatter ? 2 : 1) : 0);

  // 4. Spread Arc (Spreads further to blanket wide rooms)
  item.spreadAngleBonus = Number(((item.spreadAngleBonus || 0) + 0.08).toFixed(3));

  // 5. Range & Projectile Speed (Shoots further)
  item.rangeMultiplier = Number(((item.rangeMultiplier || 1.0) + 0.14).toFixed(3));

  // 6. Shield Shredding & Area Damage (Areal shield damage)
  item.shieldDamageBonus = Number(((item.shieldDamageBonus || 0) + 0.35).toFixed(2));
  item.areaRadiusBonus = Number(((item.areaRadiusBonus || 0.6) + 0.35).toFixed(2));

  // 7. Critical Strike Chance
  item.critChance = (item.critChance || 5) + 2;

  // 8. Nanite Salvage Value
  item.naniteValue = Math.round((item.naniteValue || 40) + cost * 0.55);

  // 9. Update Weapon Name (strip old +N and append new +N)
  const cleanName = item.name.replace(/\s*\+\d+$/, '').trim();
  item.name = `${cleanName} +${nextLevel}`;

  // 10. Update Affixes
  item.affixes = item.affixes.filter(a => !a.startsWith('[+'));
  const rangePct = Math.round((item.rangeMultiplier - 1.0) * 100);
  const shieldPct = Math.round(item.shieldDamageBonus * 100);
  item.affixes.unshift(`[+${nextLevel} Overclock: +${item.bonusProjectiles} Bullets, +${rangePct}% Range, +${shieldPct}% Shield Shred, ${item.areaRadiusBonus}m AoE]`);

  return {
    success: true,
    newScrap: playerScrap - cost
  };
}
