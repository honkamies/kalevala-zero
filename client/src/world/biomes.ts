// Biome & Sector Definitions for Cyber-Kalevala Cosmological Adventure Path
// Spans all realms: Ilman Luominen (Creation/Bird's Egg), Väinölä (Living), Pohjola, Tuonela, Alinen (Abyss), Ylinen (Celestial)

export interface BiomeDefinition {
  id: string;
  order: number;
  name: string;
  finnishTitle: string;
  tier: 'genesis' | 'middle' | 'north' | 'underworld' | 'abyss' | 'celestial';
  subtitle: string;
  description: string;
  kanteletarVerse: string;
  hazardDescription: string;
  recommendedLevel: number;
  palette: {
    floorPrimary: string;
    floorSecondary: string;
    floorAccent: string;
    wallBase: string;
    wallTop: string;
    hazardColor: string;
    lightTint: string;
    uiTheme: string;
  };
  boss: {
    id: string;
    name: string;
    title: string;
    maxHealth: number;
    phases: number;
    specialAttack: string;
    quote: string;
  };
  enemyPool: {
    type: string;
    name: string;
    health: number;
    speed: number;
    damage: number;
    color: string;
    ranged: boolean;
    isMech: boolean;
  }[];
}

export const BIOMES: Record<string, BiomeDefinition> = {
  ilman_luominen: {
    id: 'ilman_luominen',
    order: 1,
    name: 'Ilman Luominen',
    finnishTitle: 'Ilmattaren Aallot & Sotkan Muna',
    tier: 'genesis',
    subtitle: 'The Primordial Genesis Void & The Goldeneye Egg',
    description: 'Before earth or sky took form, Ilmatar drifted on the infinite cosmic waters. The shattered goldenegg released the fundamental machine code of existence.',
    kanteletarVerse: '“Ei ollut maata, ei taivasta, ei merta eikä mannerta. Vain vesi vilisi aava, ilman impi ajelehti… Yksi muna rautainen, kuusi kultaista munaa.”',
    hazardDescription: 'Quantum Vacuum Turbulence: Spatial anomalies and unformed proto-plasma vortices.',
    recommendedLevel: 1,
    palette: {
      floorPrimary: '#0c1527',
      floorSecondary: '#070d1a',
      floorAccent: '#162947',
      wallBase: '#04070e',
      wallTop: '#1e3a8a',
      hazardColor: '#60a5fa',
      lightTint: '#93c5fd',
      uiTheme: '#3b82f6'
    },
    boss: {
      id: 'boss_sotka',
      name: 'Sotka Cyber-Harbinger',
      title: 'Genesis Drone of the Golden Shells',
      maxHealth: 1100,
      phases: 2,
      specialAttack: 'Cosmic Eggshell Fragmentation & Supernova Arc',
      quote: '“Muna muuttui kaunihiksi: alainen puoli maaksi, yläinen puoli taivahaksi!”'
    },
    enemyPool: [
      { type: 'proto_wisp', name: 'Ilman Kipinä (Genesis Spark)', health: 50, speed: 2.4, damage: 16, color: '#93c5fd', ranged: true, isMech: false },
      { type: 'aava_glider', name: 'Primordial Wave Glider', health: 75, speed: 2.2, damage: 20, color: '#60a5fa', ranged: false, isMech: true },
      { type: 'aegis_overclocker', name: 'Kilpi-Ylikuormittaja (Aegis Overclocker)', health: 110, speed: 2.3, damage: 22, color: '#38bdf8', ranged: true, isMech: true },
      { type: 'sotka_scout', name: 'Goldeneye Sentry Drone', health: 85, speed: 2.9, damage: 24, color: '#fcd34d', ranged: true, isMech: true },
      { type: 'sotka_seeker', name: 'Sotka Homing Seeker', health: 70, speed: 2.1, damage: 18, color: '#fef08a', ranged: true, isMech: true },
      { type: 'aava_skimmer', name: 'Wave Skimmer Skiff', health: 90, speed: 3.1, damage: 22, color: '#67e8f9', ranged: false, isMech: true },
      { type: 'void_cluster', name: 'Unformed Code-Cluster', health: 160, speed: 1.3, damage: 28, color: '#3b82f6', ranged: false, isMech: true }
    ]
  },

  vainola: {
    id: 'vainola',
    order: 2,
    name: 'Väinölä Wastes',
    finnishTitle: 'Elävien Maa & Kalevalan Tantereet',
    tier: 'middle',
    subtitle: 'Bioluminescent Neon Boreal Forest & The Great Oak',
    description: 'The ancestral middle-ground of mortal wanderers. Overgrown spruce forests engulf broadcast monoliths, guarded by predatory Hiisi beasts.',
    kanteletarVerse: '“Mieleni minun tekevi, aivoni ajattelevi, lähteäni laulamahan, saa\'ani sanelemahan, sukuvirttä suoltamahan, lajivirttä laulamahan.”',
    hazardDescription: 'Hallucinogenic Spores: Unstable visual distortion fields and bioluminescent poison puddles.',
    recommendedLevel: 3,
    palette: {
      floorPrimary: '#061a14',
      floorSecondary: '#04100c',
      floorAccent: '#0d2e24',
      wallBase: '#020806',
      wallTop: '#047857',
      hazardColor: '#10b981',
      lightTint: '#34d399',
      uiTheme: '#059669'
    },
    boss: {
      id: 'boss_surma',
      name: 'Surma Cyber-Hound Alpha',
      title: 'Apex Flesh-Metal Stalker of the Sacred Grove',
      maxHealth: 2200,
      phases: 3,
      specialAttack: 'Predator Camouflage & Toxic Quake Pounce',
      quote: '“Ei susi suota myöten kulje, Hiiden koira kuolematon korpimaan kätköissä!”'
    },
    enemyPool: [
      { type: 'hiisi_berserker', name: 'Hiisi Scrap Berserker', health: 110, speed: 2.4, damage: 26, color: '#f59e0b', ranged: false, isMech: false },
      { type: 'aegis_overclocker', name: 'Hiisi Aegis Overclocker', health: 140, speed: 2.3, damage: 26, color: '#38bdf8', ranged: true, isMech: true },
      { type: 'hiisi_tracker', name: 'Hiisi Dart Stalker (Homing Spores)', health: 130, speed: 2.5, damage: 28, color: '#a7f3d0', ranged: true, isMech: false },
      { type: 'tulipesä_broodmother', name: 'Hiisi Magma Broodmother Colossus', health: 320, speed: 1.7, damage: 38, color: '#ea580c', ranged: true, isMech: true },
      { type: 'spore_hound', name: 'Flesh-Metal Woodland Hound', health: 125, speed: 3.4, damage: 30, color: '#10b981', ranged: false, isMech: true },
      { type: 'spore_shaman', name: 'Flesh-Tree Shaman', health: 155, speed: 1.9, damage: 32, color: '#34d399', ranged: true, isMech: false },
      { type: 'bioprowler', name: 'Bioluminescent Prowler', health: 145, speed: 2.6, damage: 34, color: '#6ee7b7', ranged: false, isMech: false },
      { type: 'monolith_sniper', name: 'Radio Monolith Signal Turret', health: 180, speed: 0, damage: 40, color: '#059669', ranged: true, isMech: true }
    ]
  },

  pohjola: {
    id: 'pohjola',
    order: 3,
    name: 'Pohjola Expanse',
    finnishTitle: 'Pimentola & Sariolan Kivimäki',
    tier: 'north',
    subtitle: 'Cryogenic Megaliths & The Nine-Locked Copper Vault',
    description: 'The eternal frozen fortress of Louhi. Sub-zero blizzards shield the subterranean vault where the shattered fragments of the Sampo are held.',
    kanteletarVerse: '“Pois on Pohjolan pimeys, kylmä kylän hallitseva, portit vaskiset vavahti, lukot yhdeksän aukesi kivimäen kätköistä.”',
    hazardDescription: 'Cryogenic Storms: Drastically lowers movement speed and slowly chills energy shields.',
    recommendedLevel: 6,
    palette: {
      floorPrimary: '#0f172a',
      floorSecondary: '#090d16',
      floorAccent: '#1e293b',
      wallBase: '#05080e',
      wallTop: '#0284c7',
      hazardColor: '#38bdf8',
      lightTint: '#7dd3fc',
      uiTheme: '#0284c7'
    },
    boss: {
      id: 'boss_louhi',
      name: "Louhi's Frost Guardian Unit 0-Zero",
      title: 'Matriarch War Drone of the Copper Mountain',
      maxHealth: 3600,
      phases: 3,
      specialAttack: 'Cryogenic Blizzard Barrage & Sub-Zero EMP',
      quote: '“Et vie Sampoa salahan, et kirjokantta Pohjolasta!”'
    },
    enemyPool: [
      { type: 'frost_drone', name: 'Pohjola Recon Drone', health: 130, speed: 2.5, damage: 32, color: '#38bdf8', ranged: true, isMech: true },
      { type: 'aegis_overclocker', name: 'Pohjola Cryo-Aegis Overclocker', health: 165, speed: 2.4, damage: 30, color: '#0ea5e9', ranged: true, isMech: true },
      { type: 'cryo_seeker', name: 'Pohjola Homing Ice-Drone', health: 160, speed: 2.4, damage: 35, color: '#7dd3fc', ranged: true, isMech: true },
      { type: 'tulipesä_broodmother', name: 'Frostfire Broodmother Titan', health: 360, speed: 1.75, damage: 44, color: '#0ea5e9', ranged: true, isMech: true },
      { type: 'cryo_sentry', name: 'Cryo-Augmented Sentry', health: 165, speed: 2.0, damage: 36, color: '#0284c7', ranged: false, isMech: false },
      { type: 'frost_javelin', name: 'Sariola Cryo-Javelin Guard', health: 195, speed: 2.2, damage: 42, color: '#0ea5e9', ranged: true, isMech: false },
      { type: 'arctic_wolf', name: 'Arctic Scrap Wolf', health: 150, speed: 3.3, damage: 40, color: '#67e8f9', ranged: false, isMech: true },
      { type: 'subzero_mech', name: 'Sub-Zero Mech Titan', health: 360, speed: 1.3, damage: 52, color: '#0369a1', ranged: false, isMech: true }
    ]
  },

  tuonela: {
    id: 'tuonela',
    order: 4,
    name: 'Tuonela Underworld',
    finnishTitle: 'Tuonen Musta Joki & Manalan Kalmanmaat',
    tier: 'underworld',
    subtitle: 'The River of Death & The Desolate Realm of the Departed',
    description: 'The inescapable subterranean underworld of Tuoni and Tuonetar. A bleak expanse of eternal grief, bone cairns, skeletal kelo-trees, and the pitch-black River Tuoni laced with thousands of iron nets and razor scythes to ensnare wandering souls.',
    kanteletarVerse: '“Ei Tuonelta tulla vasta, Manalalta matkataan! Tuonen tytöt verkkoja kutoo, rautaisia rysänpohjia, tuhansia vaskilankoja — jottei sielu pääsisi pois, elävä ei palajaisi.”',
    hazardDescription: 'Tuonen Musta Virta: Freezing black stygian currents laced with iron scythes and drowning soul maelstroms.',
    recommendedLevel: 13,
    palette: {
      floorPrimary: '#0a080f',
      floorSecondary: '#040306',
      floorAccent: '#15111f',
      wallBase: '#020104',
      wallTop: '#334155',
      hazardColor: '#22d3ee',
      lightTint: '#67e8f9',
      uiTheme: '#06b6d4'
    },
    boss: {
      id: 'boss_tuoni',
      name: 'Tuoni Skeleton King // Kalman-Kuningas',
      title: 'Sovereign of the Underworld & High Lich of Tuonela',
      maxHealth: 9800,
      phases: 3,
      specialAttack: 'Black Stygian Maelstrom & Skeletal Battle-Axe Cleave',
      quote: '“Manalan mahti ei murru, kuoleman kynsi ei hellitä! Tänne jäät Tuonen mustaan mutaan!”'
    },
    enemyPool: [
      { type: 'necro_servitor', name: 'Tuonelan Kalmanpalvelija', health: 180, speed: 1.8, damage: 38, color: '#94a3b8', ranged: false, isMech: false },
      { type: 'tuoni_skullcaster', name: 'Kalmankallon Kylväjä (Homing Skull Caster)', health: 210, speed: 2.0, damage: 48, color: '#c084fc', ranged: true, isMech: false },
      { type: 'tulipesä_broodmother', name: 'Stygian Broodmother Colossus', health: 390, speed: 1.8, damage: 48, color: '#ea580c', ranged: true, isMech: true },
      { type: 'tuoni_wraith', name: 'Tuonen Suruaave (Wailing Wraith)', health: 170, speed: 2.3, damage: 44, color: '#67e8f9', ranged: true, isMech: false },
      { type: 'iron_net_trapper', name: 'Tuonen Rysänpyytäjä', health: 290, speed: 2.3, damage: 54, color: '#64748b', ranged: true, isMech: true },
      { type: 'coolant_reaver', name: 'Tuonelan Viikate-Reaver', health: 340, speed: 2.1, damage: 52, color: '#475569', ranged: false, isMech: true },
      { type: 'spectral_obelisk', name: 'Sururiimupaasi (Despair Obelisk)', health: 240, speed: 0, damage: 50, color: '#22d3ee', ranged: true, isMech: true }
    ]
  },

  alinen: {
    id: 'alinen',
    order: 5,
    name: 'Alinen Abyss',
    finnishTitle: 'Syvyyksien Pohja & Iku-Turson Kita',
    tier: 'abyss',
    subtitle: 'The Magma Trenches & Primordial Deep Ocean',
    description: 'The deepest subterranean and underwater abyss beneath creation. Molten magma trenches and ancient sea monsters guard the roots of the World Tree.',
    kanteletarVerse: '“Nousi Iku-Turso äijä, meren mustasta mudasta, parta vaahdossa vellova, silmät tulta tuijottavat, syvyyksien valtias.”',
    hazardDescription: 'Thermal Magma Overload: Volcanic slag vents and superheated steam geysers.',
    recommendedLevel: 18,
    palette: {
      floorPrimary: '#1a0905',
      floorSecondary: '#0f0402',
      floorAccent: '#2e120a',
      wallBase: '#080201',
      wallTop: '#b91c1c',
      hazardColor: '#ef4444',
      lightTint: '#f87171',
      uiTheme: '#dc2626'
    },
    boss: {
      id: 'boss_turso',
      name: 'Iku-Turso Abyssal Construct',
      title: 'Primordial Leviathan of the Deep Trenches',
      maxHealth: 18000,
      phases: 3,
      specialAttack: 'Magma Geyser Eruption & Abyssal Tentacle Crag',
      quote: '“Meren pohjasta minä nousen, syvyyksien mustasta mudasta!”'
    },
    enemyPool: [
      { type: 'turso_spawn', name: 'Abyssal Magma Leech', health: 220, speed: 2.8, damage: 46, color: '#ef4444', ranged: false, isMech: true },
      { type: 'tulipesä_broodmother', name: 'Tulipesä Magma Broodmother', health: 420, speed: 1.8, damage: 50, color: '#ea580c', ranged: true, isMech: true },
      { type: 'magma_torpedo', name: 'Iku-Turso Magma Torpedo Drone', health: 270, speed: 2.3, damage: 58, color: '#f97316', ranged: true, isMech: true },
      { type: 'slag_crawler', name: 'Slag Siphon Automaton', health: 280, speed: 2.0, damage: 52, color: '#ea580c', ranged: false, isMech: true },
      { type: 'plasma_welder', name: 'Thermal Magma Welder', health: 250, speed: 1.8, damage: 56, color: '#f59e0b', ranged: true, isMech: true },
      { type: 'pyro_cultist', name: 'Deep Abyss Slag Invoker', health: 310, speed: 1.9, damage: 62, color: '#b91c1c', ranged: true, isMech: false },
      { type: 'magma_colossus', name: 'Molten Obsidian Titan', health: 550, speed: 1.1, damage: 68, color: '#7f1d1d', ranged: false, isMech: true }
    ]
  },

  ylinen: {
    id: 'ylinen',
    order: 6,
    name: 'Ylinen Celestial Forge',
    finnishTitle: 'Ukon Taivas & Ilmarisen Kirjokansi',
    tier: 'celestial',
    subtitle: 'The Celestial Stratosphere & The Restored Cosmic Sampo',
    description: 'The highest celestial realm around the North Star (Pohjantähti). Here Ilmarinen\'s Sky-Forge and Ukko\'s lightning generators reconstruct the eternal Sampo.',
    kanteletarVerse: '“Tule Ukko, ota säde, iske tulta ilman päältä! Taohan seppo Sampo uusi, kirjokansi kalkuttele, tuomaan onnea ikuista!”',
    hazardDescription: 'High-Voltage Celestial Storms: Solar arc lightning discharges and gravity fluctuations.',
    recommendedLevel: 26,
    palette: {
      floorPrimary: '#161329',
      floorSecondary: '#0d0a1c',
      floorAccent: '#271f45',
      wallBase: '#070510',
      wallTop: '#d97706',
      hazardColor: '#fbbf24',
      lightTint: '#fde68a',
      uiTheme: '#f59e0b'
    },
    boss: {
      id: 'boss_sampo_core',
      name: 'The Restored Cosmic Sampo & Ilmarinen Construct',
      title: 'Supreme Autonomous Forge of Universal Abundance',
      maxHealth: 32000,
      phases: 4,
      specialAttack: 'Supercharged Kirjokansi Ray & Celestial Lightning Overdrive',
      quote: '“Jo takoi tulisen Sammon, kirjokannen kalkutteli: jauhaa viljaa, jauhaa suolaa, jauhaa rahaa rikkahaksi!”'
    },
    enemyPool: [
      { type: 'celestial_sentinel', name: 'Solar Arc Drone', health: 260, speed: 2.7, damage: 54, color: '#fde68a', ranged: true, isMech: true },
      { type: 'aegis_overclocker', name: 'Kirjokansi Aegis Vanguard', health: 290, speed: 2.5, damage: 58, color: '#fbbf24', ranged: true, isMech: true },
      { type: 'celestial_seeker', name: 'Kirjokansi Star-Missile Battery', health: 320, speed: 2.5, damage: 65, color: '#fde047', ranged: true, isMech: true },
      { type: 'ukko_herald', name: 'High-Voltage Runic Adept', health: 280, speed: 2.2, damage: 60, color: '#fbbf24', ranged: true, isMech: false },
      { type: 'solar_archon', name: 'Ukko Solar High Archon', health: 420, speed: 2.4, damage: 72, color: '#f59e0b', ranged: true, isMech: false },
      { type: 'forge_smith', name: 'Cyber-Anvil Blacksmith', health: 380, speed: 2.65, damage: 68, color: '#d97706', ranged: false, isMech: false },
      { type: 'star_colossus', name: 'Celestial Astral Mech', health: 700, speed: 1.95, damage: 84, color: '#b45309', ranged: false, isMech: true }
    ]
  },

  void_dimension: {
    id: 'void_dimension',
    order: 7,
    name: 'The Primordial Void Dimension',
    finnishTitle: 'Ajan ja Avaruuden Tuolla Puolen // Musta Tyhjyys',
    tier: 'celestial',
    subtitle: 'The Infinite Cosmic Void // Singularity Paradox Climax',
    description: 'A boundless anomaly beyond the cosmic matrix where all collapsed realities converge. No walls, no mortal minions, only the eternal shadows of fallen sovereigns and the Void Overlord.',
    kanteletarVerse: '“Tuolla puolen taivahan, tuolla puolen tuonelan, ei oo maata, ei oo vettä, pelkkä musta tyhjyys pauhaa — syntysanojen syvin lähde.”',
    hazardDescription: 'Singularity Gravitational Waves: Reality distortions and quantum spacetime flux.',
    recommendedLevel: 35,
    palette: {
      floorPrimary: '#05020c',
      floorSecondary: '#080314',
      floorAccent: '#160829',
      wallBase: '#020005',
      wallTop: '#9333ea',
      hazardColor: '#c084fc',
      lightTint: '#e9d5ff',
      uiTheme: '#a855f7'
    },
    boss: {
      id: 'boss_void_mist',
      name: 'SURMA-MUSTA // THE VOID MIST OVERLORD',
      title: 'Musta Sumu - The Primordial Entropy & Cosmic Singularity',
      maxHealth: 52000,
      phases: 4,
      specialAttack: 'Supernova Reality Tear & Dimensional Graviton Rift',
      quote: '“Minä olen alku ja loppu, tyhjyys josta kaikki syntyi ja johon kaikki palaa!”'
    },
    enemyPool: [
      { type: 'void_wisp', name: 'Void Singularity Echo', health: 300, speed: 2.5, damage: 60, color: '#c084fc', ranged: true, isMech: false },
      { type: 'void_seeker', name: 'Entropy Reality Seeker (Homing Rift)', health: 350, speed: 2.7, damage: 70, color: '#e879f9', ranged: true, isMech: false },
      { type: 'void_rift_stalker', name: 'Void Rift Stalker', health: 450, speed: 3.2, damage: 78, color: '#a855f7', ranged: false, isMech: true }
    ]
  }
};

// Array of standard 6 saga biomes ordered strictly by Saga progression
export const SAGA_PATH: BiomeDefinition[] = Object.values(BIOMES)
  .filter(b => b.order <= 6)
  .sort((a, b) => a.order - b.order);

